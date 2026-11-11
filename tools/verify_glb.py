#!/usr/bin/env python3
"""Independent GLB verifier (no Blender, no third-party glTF library).

Parses a GLB per the glTF 2.0 spec, samples every animation at 30 fps,
performs linear blend skinning of the skinned mesh and measures:
  1) max edge stretch ratio (deformed length / rest length)
  2) lowest deformed vertex height (Y, ground = 0)
  3) distance between the "Weapon" node world origin and a palm reference
     point (mean of body vertices within 4.5 cm of the weapon origin at rest)

usage: python3 tools/verify_glb.py [glb] [out.json]
"""
import json
import struct
import sys

import numpy as np

FPS = 30.0
STRETCH_LIMIT = 3.0
FOOT_LIMIT_MM = -0.5
GRIP_LIMIT_MM = 10.0
PALM_RADIUS = 0.045
MIN_EDGE = 1e-4

CT = {5120: ('b', 1), 5121: ('B', 1), 5122: ('h', 2), 5123: ('H', 2), 5125: ('I', 4), 5126: ('f', 4)}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT2': 4, 'MAT3': 9, 'MAT4': 16}
NORM = {5120: 127.0, 5121: 255.0, 5122: 32767.0, 5123: 65535.0}


def load_glb(path):
    d = open(path, 'rb').read()
    magic, ver, total = struct.unpack_from('<4sII', d, 0)
    assert magic == b'glTF' and ver == 2 and total == len(d), 'bad GLB header'
    off, js, bins = 12, None, None
    while off < total:
        ln, typ = struct.unpack_from('<I4s', d, off)
        chunk = d[off + 8: off + 8 + ln]
        if typ == b'JSON':
            js = json.loads(chunk.decode('utf-8'))
        elif typ == b'BIN\x00' and bins is None:
            bins = chunk
        off += 8 + ln
    return js, bins


def accessor(g, bins, idx):
    a = g['accessors'][idx]
    assert 'sparse' not in a, 'sparse accessors not supported'
    bv = g['bufferViews'][a['bufferView']]
    assert bv.get('buffer', 0) == 0
    fmt, size = CT[a['componentType']]
    n = NC[a['type']]
    start = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    stride = bv.get('byteStride') or size * n
    cnt = a['count']
    if stride == size * n:
        arr = np.frombuffer(bins, dtype='<' + fmt if size > 1 else fmt, count=cnt * n, offset=start).reshape(cnt, n)
    else:
        raw = np.frombuffer(bins, dtype=np.uint8, count=stride * (cnt - 1) + size * n, offset=start)
        rows = np.lib.stride_tricks.as_strided(raw, shape=(cnt, size * n), strides=(stride, 1))
        arr = np.ascontiguousarray(rows).view('<' + fmt if size > 1 else fmt).reshape(cnt, n)
    if a.get('normalized') and a['componentType'] in NORM:
        arr = np.maximum(arr.astype(np.float64) / NORM[a['componentType']], -1.0)
    elif a['componentType'] == 5126:
        arr = arr.astype(np.float64)
    return arr


def trs_matrix(t, q, s):
    x, y, z, w = q
    R = np.array([
        [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
        [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
        [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]])
    M = np.eye(4)
    M[:3, :3] = R * np.asarray(s)[None, :]
    M[:3, 3] = t
    return M


def qnorm(q):
    q = np.asarray(q, dtype=np.float64)
    n = np.linalg.norm(q)
    return q / n if n > 0 else np.array([0, 0, 0, 1.0])


def slerp(a, b, u):
    a, b = qnorm(a), qnorm(b)
    d = float(np.dot(a, b))
    if d < 0:
        b, d = -b, -d
    if d > 0.9995:
        return qnorm(a + u * (b - a))
    th = np.arccos(min(d, 1.0))
    return qnorm((np.sin((1 - u) * th) * a + np.sin(u * th) * b) / np.sin(th))


class Model:
    def __init__(self, path):
        self.g, self.bin = load_glb(path)
        g = self.g
        self.nodes = g['nodes']
        n = len(self.nodes)
        self.parent = [-1] * n
        for i, nd in enumerate(self.nodes):
            for c in nd.get('children', []):
                self.parent[c] = i
        # topological order (parents first), starting at scene roots
        scene = g['scenes'][g.get('scene', 0)]
        self.order = []
        stack = list(scene['nodes'])
        while stack:
            i = stack.pop()
            self.order.append(i)
            stack.extend(self.nodes[i].get('children', []))
        self.rest = []
        for nd in self.nodes:
            if 'matrix' in nd:
                self.rest.append(('M', np.array(nd['matrix'], dtype=np.float64).reshape(4, 4).T))
            else:
                self.rest.append(('TRS', [np.array(nd.get('translation', [0, 0, 0]), dtype=np.float64),
                                          qnorm(nd.get('rotation', [0, 0, 0, 1])),
                                          np.array(nd.get('scale', [1, 1, 1]), dtype=np.float64)]))

    def world(self, overrides=None):
        """overrides: {node: {'translation'|'rotation'|'scale': value}}"""
        W = [None] * len(self.nodes)
        for i in self.order:
            kind, v = self.rest[i]
            if kind == 'M':
                L = v
            else:
                t, q, s = v
                if overrides and i in overrides:
                    o = overrides[i]
                    t = o.get('translation', t)
                    q = o.get('rotation', q)
                    s = o.get('scale', s)
                L = trs_matrix(t, q, s)
            p = self.parent[i]
            W[i] = L if p < 0 else W[p] @ L
        return W

    def load_animation(self, anim):
        chans = []
        tmax = 0.0
        for ch in anim['channels']:
            tgt = ch['target']
            if 'node' not in tgt or tgt['path'] == 'weights':
                continue
            s = anim['samplers'][ch['sampler']]
            interp = s.get('interpolation', 'LINEAR')
            times = accessor(self.g, self.bin, s['input'])[:, 0]
            vals = accessor(self.g, self.bin, s['output'])
            if interp == 'CUBICSPLINE':
                raise NotImplementedError('CUBICSPLINE')
            chans.append((tgt['node'], tgt['path'], interp, times, vals))
            tmax = max(tmax, float(times[-1]))
        return chans, tmax

    @staticmethod
    def sample(chans, t):
        ov = {}
        for node, path, interp, times, vals in chans:
            if t <= times[0]:
                v = vals[0]
                if path == 'rotation':
                    v = qnorm(v)
            elif t >= times[-1]:
                v = vals[-1]
                if path == 'rotation':
                    v = qnorm(v)
            else:
                k = int(np.searchsorted(times, t, side='right')) - 1
                t0, t1 = times[k], times[k + 1]
                u = 0.0 if interp == 'STEP' or t1 == t0 else (t - t0) / (t1 - t0)
                if path == 'rotation':
                    v = slerp(vals[k], vals[k + 1], u)
                else:
                    v = vals[k] + u * (vals[k + 1] - vals[k])
            ov.setdefault(node, {})[path] = v
        return ov


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else 'assets/models/hero.glb'
    out = sys.argv[2] if len(sys.argv) > 2 else 'blender/verify_independent_hero.json'
    m = Model(path)
    g = m.g

    skinned = [i for i, nd in enumerate(m.nodes) if 'skin' in nd and 'mesh' in nd]
    assert len(skinned) == 1, 'expected exactly one skinned mesh node'
    sn = m.nodes[skinned[0]]
    mesh = g['meshes'][sn['mesh']]
    skin = g['skins'][sn['skin']]
    joints = skin['joints']
    ibm = accessor(g, m.bin, skin['inverseBindMatrices']).reshape(-1, 4, 4).transpose(0, 2, 1)  # column-major
    assert len(ibm) == len(joints)

    # gather all primitives of the skinned mesh
    P, J, Wt, edges_l = [], [], [], []
    base = 0
    for prim in mesh['primitives']:
        assert prim.get('mode', 4) == 4, 'only TRIANGLES supported'
        at = prim['attributes']
        assert 'JOINTS_1' not in at, 'only 4 influences supported'
        p = accessor(g, m.bin, at['POSITION'])
        j = accessor(g, m.bin, at['JOINTS_0']).astype(np.int64)
        w = accessor(g, m.bin, at['WEIGHTS_0']).astype(np.float64)
        if 'indices' in prim:
            idx = accessor(g, m.bin, prim['indices'])[:, 0].astype(np.int64)
        else:
            idx = np.arange(len(p), dtype=np.int64)
        tri = idx.reshape(-1, 3) + base
        edges_l.append(np.concatenate([tri[:, [0, 1]], tri[:, [1, 2]], tri[:, [2, 0]]]))
        P.append(p); J.append(j); Wt.append(w)
        base += len(p)
    P = np.concatenate(P); J = np.concatenate(J); Wt = np.concatenate(Wt)
    wsum = Wt.sum(1)
    weight_sum_dev = float(np.abs(wsum - 1).max())
    e = np.sort(np.concatenate(edges_l), axis=1)
    e = np.unique(e[e[:, 0] != e[:, 1]], axis=0)
    rest_len = np.linalg.norm(P[e[:, 0]] - P[e[:, 1]], axis=1)
    keep = rest_len >= MIN_EDGE
    n_skipped = int((~keep).sum())
    e, rest_len = e[keep], rest_len[keep]
    Ph = np.concatenate([P, np.ones((len(P), 1))], axis=1)

    def skin_verts(W):
        # glTF: skinned mesh node's own transform is ignored; vertex_world = sum_i w_i * (jointWorld_i * IBM_i) * v
        JM = np.stack([W[jn] @ ibm[k] for k, jn in enumerate(joints)])  # (nj,4,4)
        out_v = np.zeros((len(P), 3))
        for k in range(4):
            Mk = JM[J[:, k]]  # (nv,4,4)
            out_v += Wt[:, k:k + 1] * np.einsum('nij,nj->ni', Mk[:, :3, :], Ph)
        return out_v

    weapon = [i for i, nd in enumerate(m.nodes) if nd.get('name') == 'Weapon']
    assert len(weapon) == 1
    weapon = weapon[0]

    # ---- rest pose / self-checks
    W0 = m.world()
    V0 = skin_verts(W0)
    bind_err = float(np.abs(V0 - P).max())
    w0 = W0[weapon][:3, 3].copy()
    dist0 = np.linalg.norm(P - w0, axis=1)
    palm_idx = np.where(dist0 <= PALM_RADIUS)[0]
    assert len(palm_idx) > 0, 'no palm vertices within radius'
    palm0 = V0[palm_idx].mean(0)
    grip_offset0 = float(np.linalg.norm(palm0 - w0))
    # palm point expressed in the Weapon node's local frame (to measure slip independent of the constant offset)
    local0 = (np.linalg.inv(W0[weapon]) @ np.append(palm0, 1.0))[:3]

    rows = []
    idle_height = None
    for anim in g.get('animations', []):
        chans, dur = m.load_animation(anim)
        nfr = int(np.floor(dur * FPS + 1e-6)) + 1
        times = [k / FPS for k in range(nfr)]
        if dur - times[-1] > 1e-6:
            times.append(dur)
        r = dict(name=anim.get('name', '?'), duration=dur, frames=len(times),
                 stretch=0.0, stretch_frame=0, min_y=1e9, min_y_frame=0,
                 grip=0.0, grip_frame=0, grip_min=1e9, grip_slip=0.0)
        for fi, t in enumerate(times):
            W = m.world(m.sample(chans, t))
            V = skin_verts(W)
            ln = np.linalg.norm(V[e[:, 0]] - V[e[:, 1]], axis=1)
            st = float((ln / rest_len).max())
            if st > r['stretch']:
                r['stretch'], r['stretch_frame'] = st, fi
            my = float(V[:, 1].min())
            if my < r['min_y']:
                r['min_y'], r['min_y_frame'] = my, fi
            wo = W[weapon][:3, 3]
            palm = V[palm_idx].mean(0)
            gd = float(np.linalg.norm(palm - wo))
            if gd > r['grip']:
                r['grip'], r['grip_frame'] = gd, fi
            r['grip_min'] = min(r['grip_min'], gd)
            loc = (np.linalg.inv(W[weapon]) @ np.append(palm, 1.0))[:3]
            r['grip_slip'] = max(r['grip_slip'], float(np.linalg.norm(loc - local0)))
            if r['name'] == 'idle' and fi == 0:
                idle_height = float(V[:, 1].max() - V[:, 1].min())
        r['pass'] = bool(r['stretch'] < STRETCH_LIMIT and r['min_y'] * 1000 >= FOOT_LIMIT_MM
                         and r['grip'] * 1000 < GRIP_LIMIT_MM)
        rows.append(r)

    summary = dict(
        max_stretch=max(r['stretch'] for r in rows),
        max_stretch_anim=max(rows, key=lambda r: r['stretch'])['name'],
        min_y_mm=min(r['min_y'] for r in rows) * 1000,
        min_y_anim=min(rows, key=lambda r: r['min_y'])['name'],
        max_grip_mm=max(r['grip'] for r in rows) * 1000,
        max_grip_anim=max(rows, key=lambda r: r['grip'])['name'],
        max_grip_slip_mm=max(r['grip_slip'] for r in rows) * 1000,
        rest_grip_offset_mm=grip_offset0 * 1000,
    )
    summary['pass_stretch'] = bool(summary['max_stretch'] < STRETCH_LIMIT)
    summary['pass_foot'] = bool(summary['min_y_mm'] >= FOOT_LIMIT_MM)
    summary['pass_grip'] = bool(summary['max_grip_mm'] < GRIP_LIMIT_MM)
    summary['pass_all'] = bool(summary['pass_stretch'] and summary['pass_foot'] and summary['pass_grip'])
    checks = dict(
        bind_pose_max_abs_error_m=bind_err, bind_pose_ok=bool(bind_err < 1e-4),
        idle_frame0_height_m=idle_height,
        idle_height_ok=bool(idle_height is not None and abs(idle_height - 1.8) < 0.1),
        rest_min_y_mm=float(P[:, 1].min() * 1000), rest_height_m=float(P[:, 1].max() - P[:, 1].min()),
        weight_sum_max_dev=weight_sum_dev,
        vertices=int(len(P)), joints=len(joints), unique_edges=int(len(e)), edges_skipped_short=n_skipped,
        palm_vertices=int(len(palm_idx)), animations=len(rows),
    )

    print(f'file: {path}')
    print(f"verts={checks['vertices']} joints={checks['joints']} edges={checks['unique_edges']} "
          f"(skipped<0.1mm: {n_skipped}) palm_verts={checks['palm_vertices']}")
    print(f"self-check: bind-pose skin error={bind_err:.2e} m ({'OK' if checks['bind_pose_ok'] else 'FAIL'}), "
          f"idle f0 height={idle_height:.4f} m ({'OK' if checks['idle_height_ok'] else 'FAIL'}), "
          f"weight-sum dev={weight_sum_dev:.1e}")
    print(f'rest grip offset = {grip_offset0 * 1000:.3f} mm')
    hdr = f"{'anim':<9}{'dur(s)':>7}{'frames':>7}{'stretch':>9}{'@f':>4}{'minY(mm)':>10}{'@f':>4}{'grip(mm)':>10}{'@f':>4}{'slip(mm)':>10}  result"
    print(hdr); print('-' * len(hdr))
    for r in rows:
        print(f"{r['name']:<9}{r['duration']:>7.3f}{r['frames']:>7}{r['stretch']:>9.3f}{r['stretch_frame']:>4}"
              f"{r['min_y'] * 1000:>10.3f}{r['min_y_frame']:>4}{r['grip'] * 1000:>10.3f}{r['grip_frame']:>4}"
              f"{r['grip_slip'] * 1000:>10.4f}  {'PASS' if r['pass'] else 'FAIL'}")
    print('-' * len(hdr))
    print(f"ALL: stretch max={summary['max_stretch']:.3f} ({summary['max_stretch_anim']}) <{STRETCH_LIMIT} "
          f"{'PASS' if summary['pass_stretch'] else 'FAIL'} | minY={summary['min_y_mm']:.3f} mm ({summary['min_y_anim']}) "
          f">={FOOT_LIMIT_MM} {'PASS' if summary['pass_foot'] else 'FAIL'} | grip max={summary['max_grip_mm']:.3f} mm "
          f"({summary['max_grip_anim']}) <{GRIP_LIMIT_MM} {'PASS' if summary['pass_grip'] else 'FAIL'} "
          f"=> {'PASS' if summary['pass_all'] else 'FAIL'}")

    result = dict(
        file=path, method='independent glTF 2.0 parser + LBS (python/numpy), no Blender',
        fps=FPS, limits=dict(stretch_lt=STRETCH_LIMIT, foot_min_y_mm_ge=FOOT_LIMIT_MM, grip_mm_lt=GRIP_LIMIT_MM,
                             palm_radius_m=PALM_RADIUS, min_edge_m=MIN_EDGE),
        self_checks=checks, summary=summary,
        animations=[dict(name=r['name'], duration_s=r['duration'], frames=r['frames'],
                         max_stretch=r['stretch'], max_stretch_frame=r['stretch_frame'],
                         min_y_mm=r['min_y'] * 1000, min_y_frame=r['min_y_frame'],
                         max_grip_mm=r['grip'] * 1000, max_grip_frame=r['grip_frame'],
                         min_grip_mm=r['grip_min'] * 1000, max_grip_slip_mm=r['grip_slip'] * 1000,
                         **{'pass': r['pass']}) for r in rows],
    )
    with open(out, 'w') as f:
        json.dump(result, f, indent=2)
    print(f'saved: {out}')
    return 0 if summary['pass_all'] else 1


if __name__ == '__main__':
    sys.exit(main())
