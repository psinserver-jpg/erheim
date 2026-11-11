"""염옥의 군주 발카르 장비: 거대한 화염 대검. 전부 bmesh 로 직접 모델링한다(외부 모델 없음).

검 로컬 좌표: +Y = 칼끝, Z = 날 폭, X = 두께, 원점 = 주먹이 쥐는 곳.

[중심선 보정] 이 모델은 어깨 갑옷과 가슴 사이의 틈 때문에 공용 뼈대 단계(s02)가 몸 중심선 x_mid 를
약 -0.16 m 로 잘못 잡고, 메시를 그만큼 옆으로 옮겨 버린다(뼈대는 x=0 대칭인데 메시는 +0.16 m 어긋남).
공용 코드를 고칠 수 없으므로, 장비 단계가 실행될 때 메시의 x 중심(경계 상자 중심 = import 단계가 맞춘 값)을
다시 0 으로 되돌리고 `recentered` 표시를 지운다. 그래서 이 캐릭터는
  skeleton → gear(메시 되돌림) → weights → gear → anims → export
순서로 돌린다. 무기 소켓 뼈도 같은 이유로 어긋나므로 주먹 속 정점 중심으로 다시 맞춘다. 설정의 landmarks.joints 에 적는 x 값은 s02 가 다시 -x_mid 만큼 옮기므로 (원하는 x + x_mid) 로 적는다.
"""
import bpy, bmesh, math, json
import numpy as np
from mathutils import Vector, Matrix
import gear


def _fix_center(body):
    me = body.data
    n = len(me.vertices)
    v = np.empty(n * 3, dtype=np.float32)
    me.vertices.foreach_get("co", v)
    v = v.reshape(n, 3)
    c = 0.5 * float(v[:, 0].min() + v[:, 0].max())
    if abs(c) > 1e-3:
        v[:, 0] -= c
        me.vertices.foreach_set("co", v.ravel())
        me.update()
        print("[RIG] demon_lord: mesh x-center restored by %.4f (shared x_mid detection is off for this model)" % (-c), flush=True)
    if "recentered" in body.keys():
        del body["recentered"]


def _snap_sockets(arm, body):
    """무기 소켓 뼈(weapon.L/R)의 머리를 실제 주먹 속 정점 중심으로 옮긴다(중심선 보정 뒤의 좌표 기준)."""
    palm = json.loads(body["palm_sets"])
    me = body.data
    n = len(me.vertices)
    v = np.empty(n * 3, dtype=np.float32)
    me.vertices.foreach_get("co", v)
    v = v.reshape(n, 3).astype(np.float64)
    tg = {sd: v[np.asarray(palm[sd], dtype=int)].mean(0) for sd in ("L", "R")}
    for o in bpy.context.view_layer.objects:
        o.select_set(False)
    arm.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode='EDIT')
    moved = {}
    for sd in ("L", "R"):
        eb = arm.data.edit_bones["weapon." + sd]
        d = Vector(tg[sd].tolist()) - eb.head
        moved[sd] = d.length
        if d.length > 1e-5:
            eb.head = eb.head + d
            eb.tail = eb.tail + d
    bpy.ops.object.mode_set(mode='OBJECT')
    try:
        J = json.loads(arm["rig_joints"])
        for sd in ("L", "R"):
            J["grip." + sd] = [float(x) for x in tg[sd]]
        arm["rig_joints"] = json.dumps(J)
    except Exception:
        pass
    print("[RIG] demon_lord: weapon sockets snapped to palm centers (moved L %.4f m, R %.4f m)" % (moved["L"], moved["R"]), flush=True)


def _cone(bm, base, dirv, length, radius, mat, n=6, bend=None):
    d = Vector(dirv).normalized()
    a = d.cross(Vector((1, 0, 0)))
    if a.length < 0.2:
        a = d.cross(Vector((0, 1, 0)))
    a.normalize(); b = d.cross(a)
    rings = []
    for t, rr in ((0.0, 1.0), (0.45, 0.62), (0.8, 0.28), (1.0, 0.03)):
        c = Vector(base) + d * (length * t)
        if bend is not None:
            c = c + Vector(bend) * (length * t * t)
        rings.append([c + (a * math.cos(2 * math.pi * i / n) + b * math.sin(2 * math.pi * i / n)) * (radius * rr) for i in range(n)])
    gear._ring_loft(bm, rings, lambda i, j: mat)


def make_flame_greatsword(name, s, blade_len=1.9):
    bm = bmesh.new()
    mats = [gear._mat("BossBlade", (0.030, 0.026, 0.026), 0.85, 0.58),
            gear._mat("BossBladeGlow", (1.0, 0.33, 0.04), 0.0, 0.45, (1.0, 0.36, 0.03), 7.0),
            gear._mat("BossBladeEdge", (0.20, 0.13, 0.10), 1.0, 0.36),
            gear._mat("BossGuard", (0.085, 0.060, 0.050), 0.9, 0.52),
            gear._mat("BossGuardTrim", (0.46, 0.30, 0.14), 1.0, 0.42),
            gear._mat("BossGrip", (0.045, 0.018, 0.016), 0.0, 0.86)]
    BLADE, GLOW, EDGE, GUARD, TRIM, GRIP = range(6)
    y_lo, y_hi = -0.23 * s, 0.21 * s            # 손잡이(원점 = 주먹 중심)
    R = 0.040 * s

    def ell(y, rx, rz, n=12):
        return [Vector((rx * math.cos(2 * math.pi * i / n), y, rz * math.sin(2 * math.pi * i / n))) for i in range(n)]

    # 손잡이: 가죽 끈을 감은 마디
    nseg = 12
    rings = []
    for i in range(nseg + 1):
        y = y_lo + (y_hi - y_lo) * i / nseg
        rr = R * (1.0 + (0.07 if i % 2 else 0.0))
        rings.append(ell(y, rr * 0.92, rr * 1.08))
    gear._ring_loft(bm, rings, lambda i, j: GRIP)
    for yy in (y_lo + 0.012 * s, y_hi - 0.012 * s):
        gear._ring_loft(bm, [ell(yy - 0.014 * s, R * 1.22, R * 1.36), ell(yy + 0.014 * s, R * 1.22, R * 1.36)], lambda i, j: TRIM)
    # 폼멜: 가시 달린 쇠뭉치
    yp = y_lo
    gear._ring_loft(bm, [ell(yp + 0.005 * s, R * 0.9, R * 1.0), ell(yp - 0.025 * s, R * 1.7, R * 1.9), ell(yp - 0.065 * s, R * 1.9, R * 2.1),
                         ell(yp - 0.10 * s, R * 1.3, R * 1.45), ell(yp - 0.155 * s, R * 0.08, R * 0.08)], lambda i, j: GUARD)
    for az in range(4):
        a = math.pi / 4 + az * math.pi / 2
        dv = Vector((math.cos(a), -0.25, math.sin(a)))
        _cone(bm, Vector((0, yp - 0.06 * s, 0)) + Vector((math.cos(a), 0, math.sin(a))) * R * 1.5, dv, 0.07 * s, 0.022 * s, TRIM, n=5)

    # 코등이: Z 방향으로 긴 쇠막대, 끝이 칼끝 쪽으로 휘어 올라가 뿔이 된다 + 가시
    yg = y_hi + 0.045 * s
    gw = 0.40 * s                                # 반폭
    def gsec(z, hy, hx, lift):
        return [Vector((-hx, yg - hy + lift, z)), Vector((hx, yg - hy + lift, z)),
                Vector((hx * 0.7, yg + hy + lift, z)), Vector((-hx * 0.7, yg + hy + lift, z))]
    rings = []
    for z in np.linspace(-gw, gw, 17):
        u = abs(z) / gw
        hy = (0.050 * (1 - 0.72 * u) + 0.004) * s
        hx = (0.058 * (1 - 0.70 * u) + 0.004) * s
        rings.append(gsec(float(z), hy, hx, 0.20 * s * u ** 2.2))
    gear._ring_loft(bm, rings, lambda i, j: GUARD)
    # 가운데 장식(용암 보석 자리)과 테
    gear._ring_loft(bm, [ell(yg - 0.055 * s, 0.070 * s, 0.105 * s, 8), ell(yg - 0.02 * s, 0.082 * s, 0.14 * s, 8),
                         ell(yg + 0.03 * s, 0.078 * s, 0.15 * s, 8), ell(yg + 0.075 * s, 0.050 * s, 0.13 * s, 8)], lambda i, j: TRIM if i == 1 else GUARD)
    for sx in (-1, 1):
        g = bmesh.ops.create_uvsphere(bm, u_segments=8, v_segments=5, radius=0.042 * s,
                                      matrix=Matrix.Translation(Vector((sx * 0.066 * s, yg + 0.005 * s, 0))) @ Matrix.Diagonal((0.55, 1, 1, 1)))
        for f in {f for v in g["verts"] for f in v.link_faces}:
            f.material_index = GLOW
    # 가시: 코등이 등(손잡이 쪽)과 옆으로 돋친 송곳
    for sz in (-1, 1):
        for (u, ln, rad) in ((0.30, 0.13, 0.030), (0.55, 0.16, 0.030), (0.80, 0.12, 0.024)):
            z = sz * gw * u
            lift = 0.20 * s * u ** 2.2
            _cone(bm, Vector((0, yg + lift - 0.02 * s, z)), Vector((0, -0.75, sz * 0.66)), ln * s, rad * s, TRIM, n=5, bend=(0, -0.25, 0))
        for sx in (-1, 1):
            z = sz * gw * 0.42
            _cone(bm, Vector((sx * 0.03 * s, yg + 0.20 * s * 0.42 ** 2.2, z)), Vector((sx, 0.25, sz * 0.2)), 0.10 * s, 0.024 * s, TRIM, n=5)

    # 칼날: 검게 그을린 넓은 날. 양쪽 넓은 면 가운데를 따라 용암빛 균열(발광)이 구불구불 내려간다.
    y0 = yg + 0.06 * s
    NST = 30
    def prof(u):
        if u < 0.8:
            w = 0.25 + 0.11 * math.sin(0.5 * math.pi * u / 0.8)
        else:
            w = 0.36 * (1.0 - 0.74 * ((u - 0.8) / 0.2) ** 1.5)
        ser = 1.0 if 0.03 < u < 0.97 else 0.0
        zp = 0.5 * w + ser * 0.016 * math.sin(u * 2 * math.pi * 6.0)           # 불꽃처럼 물결치는 앞날
        zn = -0.5 * w - ser * (0.012 * math.sin(u * 2 * math.pi * 4.5 + 1.3) + (0.020 if (int(u * 14) % 3 == 0 and u < 0.7) else 0.0))
        t = 0.052 * (1 - 0.55 * u)
        bev = min(0.050, 0.30 * w)
        h = min(0.011 + 0.012 * abs(math.sin(u * 23.0)) ** 3 + 0.006 * abs(math.sin(u * 57.0)), 0.11 * w)
        span = max(0.0, 0.5 * w - bev - h - 0.012)
        c = span * max(-0.95, min(0.95, 0.62 * math.sin(u * 15.0 + 0.4) + 0.38 * math.sin(u * 37.0 + 1.0)))
        return [v * s for v in (zp, zn, t, bev, h, c)]
    rings = []
    us = [i / NST for i in range(NST)]
    for u in us:
        zp, zn, t, bev, h, c = prof(u)
        y = y0 + u * blade_len * s
        rings.append([Vector((0, y, zp)), Vector((t / 2, y, zp - bev)), Vector((t / 2, y, c + h)), Vector((t / 2, y, c - h)),
                      Vector((t / 2, y, zn + bev)), Vector((0, y, zn)), Vector((-t / 2, y, zn + bev)), Vector((-t / 2, y, c - h)),
                      Vector((-t / 2, y, c + h)), Vector((-t / 2, y, zp - bev))])
    def blade_mat(i, j):
        if j in (2, 7):
            return GLOW if 1 <= i <= NST - 3 else BLADE
        if j in (0, 4, 5, 9):
            return EDGE
        return BLADE
    vr = gear._ring_loft(bm, rings, blade_mat, close_start=True, close_end=False)
    tip = bm.verts.new(Vector((0, y0 + blade_len * s, 0.02 * s)))
    last = vr[-1]
    for j in range(10):
        f = bm.faces.new((last[j], last[(j + 1) % 10], tip))
        f.material_index = EDGE if j in (0, 4, 5, 9) else BLADE
    # 날 뿌리 물림쇠
    gear._ring_loft(bm, [[Vector((x * s, y0 - 0.02 * s, z * s)) for x, z in ((-0.045, 0.16), (0.045, 0.16), (0.045, -0.16), (-0.045, -0.16))],
                         [Vector((x * s, y0 + 0.07 * s, z * s)) for x, z in ((-0.036, 0.145), (0.036, 0.145), (0.036, -0.145), (-0.036, -0.145))],
                         [Vector((x * s, y0 + 0.16 * s, z * s)) for x, z in ((-0.030, 0.04), (0.030, 0.04), (0.030, -0.04), (-0.030, -0.04))]],
                    lambda i, j: GUARD)

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    me = bpy.data.meshes.new(name + "Mesh")
    bm.to_mesh(me); bm.free()
    for m in mats:
        me.materials.append(m)
    for p in me.polygons:
        p.use_smooth = p.material_index in (GRIP, GUARD, TRIM)
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    ob["blade_tip_y"] = float(y0 + blade_len * s)
    ob["blade_base_y"] = float(y0)
    ob["grip_half_len"] = float(0.5 * (y_hi - y_lo))
    ob["grip_radius"] = float(R * 1.08)
    return ob


def _smooth_armpits(body, arm, gcfg):
    """겨드랑이(팔과 몸통이 붙은 살)의 가중치를 직접 라플라시안 평활한다(자동 가중치 아님, 이 캐릭터 전용 후처리).
    이 모델은 팔과 옆구리 사이가 좁은 살로 이어져 있어, 팔을 높이 들면 그 부분의 짧은 모서리가 4배 넘게 늘어난다.
    weights 단계가 다시 돌면 가중치가 새로 만들어지므로, 체크섬으로 '이미 평활했는지'를 구분한다."""
    import rigcore
    names = [n for n in rigcore.DEFORM_BONES if n in body.vertex_groups]
    if not names:
        return
    iters = int(gcfg.get("armpit_smooth_iters", 60))
    if iters <= 0:
        return
    me = body.data
    nv = len(me.vertices)
    gi = {body.vertex_groups[n].index: j for j, n in enumerate(names)}
    W = np.zeros((nv, len(names)))
    for v in me.vertices:
        for g in v.groups:
            j = gi.get(g.group)
            if j is not None:
                W[v.index, j] = g.weight
    sig = "%d:%.6f" % (iters, float((W * W).sum()))
    if body.get("dl_smooth_sig") == sig:
        print("[RIG] demon_lord: armpit weights already smoothed", flush=True)
        return
    co = np.empty(nv * 3, dtype=np.float32); me.vertices.foreach_get("co", co)
    co = co.reshape(nv, 3).astype(np.float64)
    key = np.round(co / 1e-5).astype(np.int64)
    _, first, inv = np.unique(key, axis=0, return_index=True, return_inverse=True)
    inv = inv.ravel(); nw = len(first)
    e = np.empty(len(me.edges) * 2, dtype=np.int32); me.edges.foreach_get("vertices", e)
    e = inv[e.reshape(-1, 2)]
    e = e[e[:, 0] != e[:, 1]]
    e = np.unique(np.sort(e, axis=1), axis=0)
    P = co[first]
    Ww = W[first]
    def sstep(a, b, x):
        t = np.clip((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)
    ax = np.abs(P[:, 0])
    x0, x1, z0, z1 = gcfg.get("armpit_box", [0.24, 0.70, 1.58, 2.02])
    m = sstep(x0, x0 + 0.06, ax) * (1 - sstep(x1 - 0.08, x1, ax)) * sstep(z0, z0 + 0.08, P[:, 2]) * (1 - sstep(z1 - 0.08, z1, P[:, 2]))
    lam = 0.5 * m
    # 이웃 가중치는 모서리 길이에 반비례: 짧은 모서리일수록 양 끝 가중치가 더 비슷해져 늘어남 비율이 고르게 된다
    Le = np.linalg.norm(P[e[:, 0]] - P[e[:, 1]], axis=1)
    ce = 1.0 / (Le + 1e-3) ** float(gcfg.get("armpit_smooth_pow", 1.0))
    deg = np.bincount(e[:, 0], weights=ce, minlength=nw) + np.bincount(e[:, 1], weights=ce, minlength=nw)
    deg = np.maximum(deg, 1e-9)
    for _ in range(iters):
        S = np.zeros_like(Ww)
        np.add.at(S, e[:, 0], Ww[e[:, 1]] * ce[:, None])
        np.add.at(S, e[:, 1], Ww[e[:, 0]] * ce[:, None])
        Ww = Ww + lam[:, None] * (S / deg[:, None] - Ww)
    # 영향 뼈 4개 제한(공용 코드와 같은 '연속적인' 방식)
    def limit4(Wx):
        kth = -np.sort(-Wx, axis=1)[:, 4]
        Wx = np.clip(Wx - kth[:, None], 0.0, None)
        return Wx / np.maximum(Wx.sum(1, keepdims=True), 1e-12)
    Ww = limit4(Ww)
    Ww, touched = _relax_stretch(arm, names, P, Ww, e, Le, gcfg, limit4)
    Wn = Ww[inv]
    mm = (m > 1e-4) | touched
    ch = np.flatnonzero(mm[inv])
    vgs = [body.vertex_groups[n] for n in names]
    for i in ch:
        ii = int(i)
        for j, vg in enumerate(vgs):
            w = float(Wn[ii, j])
            if w > 1e-5:
                vg.add([ii], w, 'REPLACE')
            elif W[ii, j] > 0:
                vg.remove([ii])
    W[ch] = np.where(Wn[ch] > 1e-5, Wn[ch], 0.0)
    # 저장되는 가중치는 float32 이므로 다시 읽어 체크섬을 만든다
    W2 = np.zeros((nv, len(names)))
    for v in me.vertices:
        for g in v.groups:
            j = gi.get(g.group)
            if j is not None:
                W2[v.index, j] = g.weight
    body["dl_smooth_sig"] = "%d:%.6f" % (iters, float((W2 * W2).sum()))
    print("[RIG] demon_lord: armpit weights smoothed (%d verts, %d iters)" % (len(ch), iters), flush=True)


def _relax_stretch(arm, names, P, Ww, e, Le, gcfg, limit4):
    """어깨 둘레에서, 팔을 여러 방향으로 움직인 시험 자세들로 스킨을 직접 계산(numpy LBS)해 보고
    기준보다 많이 늘어나는 모서리의 양 끝 가중치를 서로 가깝게 당기는 것을 반복한다(늘어남 완화)."""
    import rigpose
    from rigpose import D
    thr = float(gcfg.get("relax_thr", 2.1))
    rounds = int(gcfg.get("relax_rounds", 400))
    touched = np.zeros(len(P), dtype=bool)
    if rounds <= 0:
        return Ww, touched
    rm = rigpose.RigMath(arm)
    poses = []
    for (az, el, rs, fw, faz, fel) in [(90, 0, 0, 0, 90, 0), (60, 60, 25, 0, 60, 60), (100, 8, 16, -14, 96, 46), (72, 28, 24, 0, 160, 72),
                                        (48, 28, 20, 8, 18, 52), (40, -28, 2, 16, 10, -38), (42, -22, 4, 20, 0, -14), (92, -14, 8, -12, 74, 6),
                                        (20, -10, 0, 20, 0, 0), (150, -40, 0, -15, 150, -40), (90, -80, 0, 0, 60, -30), (0, 0, 10, 10, 0, 60),
                                        (30, 70, 30, 0, 180, 60), (84, -30, 8, 0, 26, 16), (66, 4, 12, 0, 24, 6), (110, 20, 20, -20, 110, 60)]:
        Pp = {"shoulder.L": {"raise": rs, "fwd": fw}, "shoulder.R": {"raise": rs, "fwd": fw},
              "arm.L": {"upper": D(az, el), "fore": D(faz, fel)}, "arm.R": {"upper": D(-az, el), "fore": D(-faz, fel)}}
        poses.append(Pp)
        poses.append(deep_pose(Pp, {"chest": {"pitch": -15, "yaw": 20}, "spine": {"pitch": -8, "yaw": 10}}))
        poses.append(deep_pose(Pp, {"chest": {"pitch": 20, "yaw": -20, "roll": 6}, "spine": {"pitch": 10, "yaw": -8}}))
    reg = (np.abs(P[:, 0]) < 1.05) & (P[:, 2] > 1.40) & (P[:, 2] < 2.40)
    idx = np.flatnonzero(reg)
    loc = -np.ones(len(P), dtype=np.int64); loc[idx] = np.arange(len(idx))
    ek = reg[e[:, 0]] & reg[e[:, 1]] & (Le > 1e-4)
    ea = loc[e[ek, 0]]; eb = loc[e[ek, 1]]; L0 = Le[ek]
    Pr = P[idx]
    X = []
    for Pp in poses:
        rm.solve(Pp)
        R = np.stack([rm.C[n] for n in names]); t = np.stack([rm.pos[n] - rm.C[n] @ rm.B[n]["head"] for n in names])
        X.append((np.einsum('bij,vj->vbi', R, Pr) + t[None]).astype(np.float32))
    Wr = Ww[idx].copy()
    def worst(Wx):
        rmax = np.zeros(len(ea))
        for Xp in X:
            pos = np.einsum('vb,vbi->vi', Wx, Xp)
            rmax = np.maximum(rmax, np.linalg.norm(pos[ea] - pos[eb], axis=1) / L0)
        return rmax
    r0 = worst(Wr)
    moved = np.zeros(len(idx), dtype=bool)
    rr = r0
    for it in range(rounds):
        bad = np.flatnonzero(rr > thr)
        if len(bad) == 0:
            break
        sft = np.clip((rr[bad] - thr) / rr[bad], 0.0, 1.0) * 0.5 + 0.05
        dlt = (Wr[eb[bad]] - Wr[ea[bad]]) * sft[:, None]
        dW = np.zeros_like(Wr); cnt = np.zeros(len(Wr))
        np.add.at(dW, ea[bad], dlt); np.add.at(dW, eb[bad], -dlt)
        np.add.at(cnt, ea[bad], 1.0); np.add.at(cnt, eb[bad], 1.0)
        nz = cnt > 0
        Wr[nz] += dW[nz] / cnt[nz, None]
        moved |= nz
        if it % 10 == 9:
            Wr[moved] = limit4(Wr[moved])
        rr = worst(Wr)
    Wr[moved] = limit4(Wr[moved])
    rr = worst(Wr)
    Ww = Ww.copy(); Ww[idx] = Wr
    touched[idx[moved]] = True
    print("[RIG] demon_lord: shoulder stretch relax: probe max %.2f -> %.2f (edges > %.1f: %d -> %d, %d verts adjusted, %d rounds)" % (
        float(r0.max()), float(rr.max()), thr, int((r0 > thr).sum()), int((rr > thr).sum()), int(moved.sum()), it + 1), flush=True)
    return Ww, touched


def deep_pose(a, b):
    out = {k: dict(v) for k, v in a.items()}
    for k, v in b.items():
        out.setdefault(k, {}).update(v)
    return out


def _debug_stretch(body):
    """진단용(설정 gear.debug_stretch): 이 프로세스에서만 rigcore.stretch_now 를 감싸 가장 늘어난 모서리의 기본 자세 위치를 찍는다."""
    import rigcore
    from common import mesh_world_verts
    rest = mesh_world_verts(body)
    orig = rigcore.stretch_now
    def wrapped(b, e, L0, min_len=1e-4):
        ratio, co = orig(b, e, L0, min_len)
        idx = np.argsort(-ratio)[:400]
        bad = idx[ratio[idx] > 2.6]
        if len(bad):
            mid = 0.5 * (rest[e[bad, 0]] + rest[e[bad, 1]])
            print("[RIG] dbg stretch>2.6: n=%d  rest bbox min %s max %s  L0 median %.4f" % (
                len(bad), np.round(mid.min(0), 2).tolist(), np.round(mid.max(0), 2).tolist(), float(np.median(L0[bad]))), flush=True)
            for i in bad[:10]:
                m = 0.5 * (rest[e[i, 0]] + rest[e[i, 1]])
                print("[RIG]   dbg r=%.2f L0=%.4f rest %s" % (ratio[i], L0[i], np.round(m, 3).tolist()), flush=True)
        return ratio, co
    rigcore.stretch_now = wrapped


def _widen_grip_shots(gcfg):
    """손잡이 확인용 그림(blender/diag/demon_lord_s04_grip_*.png)은 공용 단계가 보통 체격 기준(약 0.5 m 폭)으로 찍어
    이 거구의 주먹이 화면을 꽉 채운다. 이 프로세스에서만 render_view 를 감싸 손 전체와 코등이·손잡이 끝이 보이는 거리로 넓힌다."""
    import sys, os
    mul = float(gcfg.get("grip_shot_scale", 2.6))
    g = None
    f = sys._getframe(1)
    while f is not None:
        if "render_view" in f.f_globals and f.f_globals.get("__name__") == "__main__":
            g = f.f_globals
            break
        f = f.f_back
    if g is None or g.get("_dl_grip_rv") or mul == 1.0:
        return
    orig = g["render_view"]
    def rv(path, center, dist, az, el=0.0, ortho_scale=None, **kw):
        if "_s04_grip_" in os.path.basename(path) and ortho_scale:
            ortho_scale = ortho_scale * mul
            dist = max(dist, 3.0)
        return orig(path, center, dist, az, el, ortho_scale=ortho_scale, **kw)
    g["render_view"] = rv
    g["_dl_grip_rv"] = True


def build(arm, body, k, gcfg):
    if gcfg.get("debug_stretch"):
        _debug_stretch(body)
    _widen_grip_shots(gcfg)
    _fix_center(body)
    _snap_sockets(arm, body)
    _smooth_armpits(body, arm, gcfg)
    s = k / (2.6 / 1.8)                      # 치수는 키 2.6 m 기준으로 적었다
    sword = make_flame_greatsword("Weapon", s, blade_len=gcfg.get("blade_len", 1.9))
    gear.parent_to_bone(sword, arm, "weapon.R")
