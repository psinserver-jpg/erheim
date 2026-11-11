"""직접 만든 리깅 코어: 관절 위치 찾기(실루엣 분석) → 뼈대 생성 → 가중치(열 확산) 계산 → 검사.

자동 리깅 서비스나 블렌더의 자동 가중치(ARMATURE_AUTO)를 쓰지 않고, 여기 있는 코드로 직접 계산한다.
좌표계: X = 캐릭터의 왼쪽(+), Y = 뒤(+) / 앞(-), Z = 위.
"""
import bpy, math, json, os
import numpy as np
from mathutils import Vector, Matrix, Quaternion
from mathutils.bvhtree import BVHTree
from common import *

# ----------------------------------------------------------------------------
# 1. 표면 샘플과 정면 실루엣 분석
# ----------------------------------------------------------------------------

def sample_surface(obj, n=400000, seed=7):
    co = mesh_world_verts(obj)
    tris = mesh_tris(obj)
    a, b, c = co[tris[:, 0]], co[tris[:, 1]], co[tris[:, 2]]
    area = 0.5 * np.linalg.norm(np.cross(b - a, c - a), axis=1)
    rng = np.random.default_rng(seed)
    idx = rng.choice(len(tris), size=n, p=area / area.sum())
    u = rng.random(n); v = rng.random(n)
    m = (u + v) > 1.0
    u[m] = 1 - u[m]; v[m] = 1 - v[m]
    return a[idx] + (b[idx] - a[idx]) * u[:, None] + (c[idx] - a[idx]) * v[:, None]


def _row_runs(row, max_gap=1):
    xs = np.flatnonzero(row)
    if len(xs) == 0:
        return []
    br = np.flatnonzero(np.diff(xs) > max_gap + 1)
    starts = np.r_[xs[0], xs[br + 1]]
    ends = np.r_[xs[br], xs[-1]]
    return list(zip(starts.tolist(), ends.tolist()))


class Silhouette:
    """정면(XZ) 실루엣을 아래에서 위로 훑으며 덩어리(다리·팔·몸통)가 합쳐지는 높이를 찾는다."""

    def __init__(self, pts, H, cell=None):
        self.H = H
        self.cell = cell or H / 360.0
        c = self.cell
        self.x0 = pts[:, 0].min() - 2 * c
        self.z0 = -c
        self.nx = int((pts[:, 0].max() - self.x0) / c) + 4
        self.nz = int((pts[:, 2].max() - self.z0) / c) + 4
        ix = ((pts[:, 0] - self.x0) / c).astype(int)
        iz = ((pts[:, 2] - self.z0) / c).astype(int)
        self.mask = np.zeros((self.nz, self.nx), dtype=bool)
        self.mask[iz, ix] = True
        self.pt_ix, self.pt_iz = ix, iz
        self._scan()
        self.pt_label = self.labels[iz, ix]

    def x_of(self, ix):
        return self.x0 + (ix + 0.5) * self.cell

    def z_of(self, iz):
        return self.z0 + (iz + 0.5) * self.cell

    def iz_of(self, z):
        return int(round((z - self.z0) / self.cell - 0.5))

    def _scan(self):
        nz, nx = self.mask.shape
        self.labels = -np.ones((nz, nx), dtype=np.int32)
        parent, cells, origin = [], [], []

        def find(a):
            while parent[a] != a:
                parent[a] = parent[parent[a]]
                a = parent[a]
            return a

        merges = []
        prev = []
        self.rows = []
        for z in range(nz):
            cur = []
            for (a, b) in _row_runs(self.mask[z]):
                ov = [(pa, pb, pc) for (pa, pb, pc) in prev if pa <= b + 1 and pb >= a - 1]
                roots = []
                for (pa, pb, pc) in ov:
                    r = find(pc)
                    if r not in roots:
                        roots.append(r)
                if not roots:
                    cid = len(parent)
                    parent.append(cid); cells.append(0); origin.append((z, 0.5 * (a + b)))
                else:
                    roots.sort(key=lambda r: -cells[r])
                    cid = roots[0]
                    for other in roots[1:]:
                        rc = [(pa, pb) for (pa, pb, pc) in ov if find(pc) == cid]
                        ro = [(pa, pb) for (pa, pb, pc) in ov if find(pc) == other]
                        best = None
                        for (ca, cb) in rc:
                            for (oa, ob) in ro:
                                if oa > cb:
                                    g = (cb, oa)
                                elif ca > ob:
                                    g = (ob, ca)
                                else:
                                    g = (max(ca, oa), min(cb, ob))
                                w = abs(g[1] - g[0])
                                if best is None or w < best[0]:
                                    best = (w, 0.5 * (g[0] + g[1]))
                        merges.append(dict(z=z, survivor=cid, absorbed=other, cells_survivor=cells[cid],
                                           cells_absorbed=cells[other], gap_x=best[1], gap_w=best[0]))
                        parent[other] = cid
                        cells[cid] += cells[other]
                cells[cid] += (b - a + 1)
                self.labels[z, a:b + 1] = cid
                cur.append((a, b, cid))
            prev = cur
            self.rows.append(cur)
        self.merges, self.cells, self.origin = merges, cells, origin
        self.total = int(self.mask.sum())

    def central_run(self, iz, ixc):
        best = None
        for (a, b, cid) in self.rows[iz]:
            if a <= ixc <= b:
                return (a, b, cid)
            d = min(abs(a - ixc), abs(b - ixc))
            if best is None or d < best[0]:
                best = (d, (a, b, cid))
        return best[1] if best else None


def find_landmarks(body, cfg=None):
    """A포즈 인간형 메시에서 관절 위치를 찾는다. cfg 로 비율·보정값을 덮어쓸 수 있다."""
    cfg = dict(cfg or {})
    pts = sample_surface(body, n=cfg.get("samples", 400000))
    H = float(pts[:, 2].max())
    sil = Silhouette(pts, H)
    c = sil.cell
    info = {}

    # --- 다리: 바닥에서 시작하는 큰 덩어리 두 개 ---
    absorbed_cells = {m["absorbed"]: m["cells_absorbed"] for m in sil.merges}
    ncomp = len(sil.origin)
    def comp_cells(k):
        return absorbed_cells.get(k, sil.cells[k])
    ground = [k for k in range(ncomp) if sil.origin[k][0] <= sil.iz_of(0.03 * H) and comp_cells(k) > 0.02 * sil.total]
    ground.sort(key=lambda k: -comp_cells(k))
    assert len(ground) >= 2, "발 덩어리를 두 개 찾지 못함: %s" % ground
    legs = ground[:2]
    legs.sort(key=lambda k: sil.origin[k][1])            # x 작은 쪽 = 오른다리(-X)
    legR, legL = legs
    crotch = None
    for m in sil.merges:
        if {m["survivor"], m["absorbed"]} == {legL, legR}:
            crotch = m; break
    assert crotch is not None, "가랑이(두 다리가 합쳐지는 곳)를 찾지 못함"
    z_c = sil.z_of(crotch["z"]); x_mid_c = sil.x_of(crotch["gap_x"])
    body_id = crotch["survivor"]
    info["crotch_z_silhouette"] = z_c

    # --- 팔: 몸통에 나중에 합쳐지는 큰 덩어리(손에서 시작) ---
    arm_events = []
    for m in sil.merges:
        if m["z"] <= crotch["z"]:
            continue
        if m["cells_absorbed"] > 0.012 * sil.total and sil.origin[m["absorbed"]][0] > sil.iz_of(0.12 * H):
            arm_events.append(m)
    left = [m for m in arm_events if sil.x_of(m["gap_x"]) > x_mid_c]
    right = [m for m in arm_events if sil.x_of(m["gap_x"]) <= x_mid_c]
    assert left and right, "팔 덩어리를 찾지 못함 (왼 %d, 오른 %d)" % (len(left), len(right))
    armL = max(left, key=lambda m: m["cells_absorbed"])
    armR = max(right, key=lambda m: m["cells_absorbed"])

    # --- 목: 겨드랑이 위에서 폭이 가장 좁아지는 곳 ---
    z_ap = max(sil.z_of(armL["z"]), sil.z_of(armR["z"]))
    ixc = int(round((x_mid_c - sil.x0) / c - 0.5))
    iz0 = sil.iz_of(z_ap + 0.045 * H)
    widths = []
    for iz in range(iz0, sil.nz):
        r = sil.central_run(iz, ixc) if sil.rows[iz] else None
        widths.append((iz, (r[1] - r[0] + 1) * c if r else 0.0, 0.5 * (r[0] + r[1]) if r else ixc))
    neck_iz = None; run_min = None; found_break = False
    for k, (iz, w, cx) in enumerate(widths):
        if w <= 0:
            break
        if run_min is None or w < run_min[1]:
            run_min = (iz, w, cx)
        elif w >= 1.3 * run_min[1] and (iz - run_min[0]) * c >= 0.012 * H:
            neck_iz = run_min; found_break = True; break
        if (iz - iz0) * c > 0.22 * H:
            break
    if neck_iz is None:
        neck_iz = run_min
    # 어깨 꼭대기(어깨 폭의 절반 이하로 좁아지는 높이). 목이 털·수염·갑옷에 가려 '잘록한 곳'이 없을 때의 기준.
    n_sh = max(1, int(0.07 * H / c))
    w_sh = max(w for (_, w, _) in widths[:n_sh]) if widths else 0.0
    z_sh_top = None
    for (iz, w, cx) in widths:
        if w > 0 and w <= 0.5 * w_sh:
            z_sh_top = sil.z_of(iz); x_sh_top = sil.x_of(cx); break
    z_neck = sil.z_of(neck_iz[0]); neck_w = neck_iz[1]; x_neck = sil.x_of(neck_iz[2])
    info["neck_method"] = "constriction"
    if z_sh_top is not None and (not found_break or z_neck > z_sh_top + 0.11 * H):
        z_neck = z_sh_top + 0.035 * H
        x_neck = x_sh_top
        info["neck_method"] = "shoulder_top"
    if "neck_z" in cfg:
        z_neck = cfg["neck_z"] * H
        info["neck_method"] = "config"
    info["neck_width"] = neck_w

    # 몸의 중심선 x (가랑이 틈과 목 중심의 평균)
    x_mid = 0.5 * (x_mid_c + x_neck)
    info["x_mid"] = x_mid

    z_nb_pre = max(z_neck - cfg.get("neck_len", 0.035) * H, z_ap + 0.04 * H)
    if "neck_base_z" in cfg:
        z_nb_pre = cfg["neck_base_z"] * H

    lab = sil.pt_label
    def ycen(mask, default=0.0):
        return float(pts[mask, 1].mean()) if mask.sum() > 10 else default

    J = {}
    # 메시 정점이 어느 덩어리에 속하는지(손바닥 기준 정점 집합을 만들 때 사용)
    vco = mesh_world_verts(body)
    vix = np.clip(((vco[:, 0] - sil.x0) / c).astype(int), 0, sil.nx - 1)
    viz = np.clip(((vco[:, 2] - sil.z0) / c).astype(int), 0, sil.nz - 1)
    vlab = sil.labels[viz, vix]
    palm_sets = {}
    # --- 팔 ---
    arm_dbg = {}
    for side, ev in (("L", armL), ("R", armR)):
        ap = pts[lab == ev["absorbed"]]
        cen = ap.mean(0)
        _, _, vt = np.linalg.svd(ap - cen, full_matrices=False)
        d = vt[0]
        if d[2] < 0:
            d = -d                                   # 손 → 어깨 방향
        t = (ap - cen) @ d
        t_tip, t_top = np.percentile(t, 0.3), np.percentile(t, 99.7)
        Lp = t_top - t_tip
        core = (t > t_tip + 0.15 * Lp) & (t < t_tip + 0.75 * Lp)
        cen = ap[core].mean(0)
        _, _, vt = np.linalg.svd(ap[core] - cen, full_matrices=False)
        d = vt[0]
        if d[2] < 0:
            d = -d
        t = (ap - cen) @ d
        radial = np.linalg.norm((ap - cen) - np.outer(t, d), axis=1)
        t_tip, t_top = np.percentile(t, 0.3), np.percentile(t, 99.7)
        Lp = t_top - t_tip
        up = (t > t_tip + 0.6 * Lp) & (t < t_tip + 0.85 * Lp)
        D = 2.0 * float(np.median(radial[up]))
        # 어깨 관절: 정면(XZ)에서 위팔 중심선을 구하고, 겨드랑이 꼭짓점에서 내린 수선의 발 Q 에서
        # 중심선을 따라 '목 밑동 - 0.045H' 높이까지 올라간 점. (갑옷 때문에 겨드랑이가 낮게 잡혀도 안정적)
        A2 = np.array([sil.x_of(ev["gap_x"]), sil.z_of(ev["z"])])
        t_lo = t_tip + 0.50 * Lp; t_hi = t_top - 0.6 * D
        cs = []
        for tb in np.linspace(t_lo, max(t_hi, t_lo + 0.02 * H), 7):
            mk = np.abs(t - tb) < 0.012 * H
            if mk.sum() > 30:
                cs.append(ap[mk].mean(0))
        cs = np.array(cs)
        c2 = cs[:, [0, 2]].mean(0)
        _, _, v2 = np.linalg.svd(cs[:, [0, 2]] - c2, full_matrices=False)
        d2 = v2[0]
        if d2[1] < 0:
            d2 = -d2
        Q2 = c2 + d2 * float((A2 - c2) @ d2)
        # 어깨 관절(정면): x = 겨드랑이 꼭짓점에서 바깥으로 0.18D, z = 목 밑동 - 0.045H (겨드랑이 기준 범위로 제한)
        sgn_side = 1.0 if side == "L" else -1.0
        z_sh = z_nb_pre - cfg.get("shoulder_below_neck", 0.045) * H
        z_sh = float(np.clip(z_sh, A2[1] + 0.3 * D, A2[1] + 1.4 * D))
        S2 = np.array([A2[0] + sgn_side * cfg.get("shoulder_out", 0.18) * D, z_sh])
        adv = float(np.linalg.norm(S2 - Q2))
        box = (np.abs(pts[:, 0] - S2[0]) < 0.45 * D) & (np.abs(pts[:, 2] - S2[1]) < 0.45 * D)
        yS = float(0.5 * (np.percentile(pts[box, 1], 3) + np.percentile(pts[box, 1], 97))) if box.sum() > 50 else float(cs[-1, 1])
        S = np.array([S2[0], yS, S2[1]])
        tS = float((S - cen) @ d)
        L = tS - t_tip
        tW_default = tS - cfg.get("wrist_frac", 0.847) * L
        # 손목: 손 근처에서 단면이 가장 가는 곳
        bins = np.arange(t_tip + 0.08 * L, t_tip + 0.30 * L, 0.006 * H)
        best = None
        for tb in bins:
            mk = np.abs(t - tb) < 0.006 * H
            if mk.sum() < 30:
                continue
            r = float(np.percentile(radial[mk], 90))
            if best is None or r < best[1]:
                best = (tb, r)
        fore = (t > t_tip + 0.30 * L) & (t < t_tip + 0.48 * L)
        r_fore = float(np.percentile(radial[fore], 90)) if fore.sum() > 30 else 1e9
        tW = tW_default
        if best is not None and best[1] < 0.88 * r_fore and not cfg.get("wrist_by_ratio", False):
            tW = best[0]
        def section(tc, hw=0.012 * H):
            mk = np.abs(t - tc) < hw
            return ap[mk].mean(0) if mk.sum() > 30 else cen + d * tc
        # 팔꿈치: 어깨~손목을 위팔 0.56 : 아래팔 0.44 로 나눈 곳(사람 비율 0.186H : 0.146H)
        tE = tS - cfg.get("elbow_ratio", 0.56) * (tS - tW)
        # 단면 반지름 프로파일(진단용): 갑옷의 팔꿈치 보호대처럼 불룩한 곳을 찾는 데 참고
        prof = []
        for tb in np.arange(tW, tS, 0.008 * H):
            mk = np.abs(t - tb) < 0.006 * H
            if mk.sum() > 30:
                prof.append((round(float((tS - tb) / (tS - tW)), 3), round(float(np.percentile(radial[mk], 90)), 4)))
        if "elbow_t" in cfg:      # 어깨(0)~손목(1) 사이 비율로 직접 지정
            tE = tS - cfg["elbow_t"] * (tS - tW)
        E = section(tE); W = section(tW)
        fist = ap[t < tW - 0.22 * (tW - t_tip)]
        # 손바닥(주먹 속) 기준점: 주먹 부분 메시 정점들의 중심. 검 손잡이 중심을 여기에 둔다.
        av = np.flatnonzero(vlab == ev["absorbed"])
        tv = (vco[av] - cen) @ d
        pidx = av[tv < tW - 0.30 * (tW - t_tip)]
        palm_sets[side] = pidx
        G = vco[pidx].mean(0) if len(pidx) > 20 else fist.mean(0)
        tip = cen + d * t_tip
        tip = tip + (G - (cen + d * float((G - cen) @ d)))      # 주먹 중심선에 맞춤
        # 주먹의 너클 줄 방향(= 손잡이 축): 팔 축에 수직인 평면에서 분산이 가장 큰 방향
        fp = fist - G
        fp = fp - np.outer(fp @ d, d)
        _, sv, vt2 = np.linalg.svd(fp, full_matrices=False)
        g = vt2[0]
        g = g - d * float(g @ d); g /= np.linalg.norm(g)
        if abs(g[0]) >= abs(g[1]):
            # 너클 줄이 좌우로 놓임(손등이 앞) → 엄지는 몸 안쪽
            if (g[0] > 0) != (G[0] < x_mid):
                g = -g
        else:
            # 너클 줄이 앞뒤로 놓임(손바닥이 허벅지 쪽) → 엄지는 앞(-Y)
            if g[1] > 0:
                g = -g
        J["shoulder_joint." + side] = S
        J["elbow." + side] = E
        J["wrist." + side] = W
        J["grip." + side] = G
        J["hand_tip." + side] = tip
        J["grip_axis." + side] = g
        arm_dbg[side] = dict(dir=d.round(3).tolist(), diameter=round(D, 4), length=round(L, 4),
                             armpit=A2.round(3).tolist(), adv_over_D=round(adv / D, 3), upper_dir2=d2.round(3).tolist(),
                             wrist_detect=(None if best is None else round(best[1] / r_fore, 3)), radial_profile=prof[::-1],
                             fist_sv=(sv[:3] / np.sqrt(len(fp))).round(4).tolist())
    info["arms"] = arm_dbg

    # --- 다리 ---
    leg_dbg = {}
    for side, lid in (("L", legL), ("R", legR)):
        lp = pts[lab == lid]
        # 발목 높이: 발의 앞뒤 길이가 발 길이의 절반 정도로 줄어드는 가장 낮은 곳
        zb = np.arange(0.008 * H, 0.17 * H, 0.006 * H)
        ext = []
        for z in zb:
            mk = np.abs(lp[:, 2] - z) < 0.004 * H
            if mk.sum() < 20:
                ext.append(0.0); continue
            ys = lp[mk, 1]
            ext.append(float(np.percentile(ys, 99) - np.percentile(ys, 1)))
        ext = np.array(ext)
        foot_len = float(ext[zb < 0.05 * H].max())
        cand = np.flatnonzero((ext <= 0.55 * foot_len) & (ext > 0))
        z_ank = float(zb[cand[0]]) if len(cand) else 0.055 * H
        z_ank = float(np.clip(z_ank, 0.03 * H, 0.085 * H))
        z_ank = cfg.get("ankle_z", z_ank / H) * H if "ankle_z" in cfg else z_ank
        shin = (lp[:, 2] > z_ank + 0.01 * H) & (lp[:, 2] < z_ank + 0.05 * H)
        A = np.array([lp[shin, 0].mean(), lp[shin, 1].mean(), z_ank])
        foot = lp[lp[:, 2] < z_ank]
        y_tip = float(np.percentile(foot[:, 1], 0.5)); y_heel = float(np.percentile(foot[:, 1], 99.5))
        fl = y_heel - y_tip
        toe_half = foot[foot[:, 1] < y_tip + 0.40 * fl]
        x_toe = float(toe_half[:, 0].mean())
        z_ball = float(np.clip(0.30 * z_ank, 0.010 * H, 0.03 * H))
        B = np.array([A[0] + (x_toe - A[0]) * 0.75, y_tip + 0.30 * fl, z_ball])
        T = np.array([x_toe, y_tip, z_ball])
        heel = np.array([A[0], y_heel, 0.0])
        # 다리 중심선 x(z): 가랑이 아래 구간에서 직선 맞춤
        up = (lp[:, 2] > max(z_c - 0.14 * H, z_ank + 0.08 * H)) & (lp[:, 2] < z_c - 0.008 * H)
        zz = lp[up, 2]
        if up.sum() > 200 and (zz.max() - zz.min()) > 0.03 * H:
            px = np.polyfit(zz, lp[up, 0], 1); py = np.polyfit(zz, lp[up, 1], 1)
        else:
            px = np.array([0.0, lp[:, 0].mean()]); py = np.array([0.0, lp[:, 1].mean()])
        leg_dbg[side] = dict(foot_len=round(fl, 4), ankle_z=round(z_ank, 4))
        J["ankle." + side] = A; J["ball." + side] = B; J["toe_tip." + side] = T; J["heel." + side] = heel
        J["_legfit." + side] = (px, py)
    info["legs"] = leg_dbg

    z_hip = z_c + cfg.get("hip_above_crotch", 0.05) * H
    z_hip = float(np.clip(z_hip, cfg.get("hip_min", 0.50) * H, cfg.get("hip_max", 0.58) * H))
    if "hip_z" in cfg:
        z_hip = cfg["hip_z"] * H
    for side in ("L", "R"):
        px, py = J.pop("_legfit." + side)
        A = J["ankle." + side]
        zt = z_c - 0.02 * H
        xh = float(np.polyval(px, zt))
        yh = float(np.polyval(py, zt))
        Hj = np.array([xh, yh, z_hip])
        zk = A[2] + cfg.get("knee_frac", 0.50) * (z_hip - A[2])
        lp = pts[lab == (legL if side == "L" else legR)]
        mk = np.abs(lp[:, 2] - zk) < 0.012 * H
        K = np.array([lp[mk, 0].mean(), lp[mk, 1].mean(), zk]) if mk.sum() > 30 else np.array([xh, yh, zk])
        J["hip_joint." + side] = Hj; J["knee." + side] = K

    # --- 척추 ---
    z_nb = z_neck - cfg.get("neck_len", 0.035) * H
    z_nb = max(z_nb, z_ap + 0.04 * H)
    z_hj = z_neck + cfg.get("head_above_neck", 0.012) * H
    if "neck_base_z" in cfg:
        z_nb = cfg["neck_base_z"] * H
    if "head_joint_z" in cfg:
        z_hj = cfg["head_joint_z"] * H
    z_p = z_hip + cfg.get("pelvis_above_hip", 0.03) * H
    torso_half = 0.045 * H
    def torso_y(z):
        mk = (np.abs(pts[:, 2] - z) < 0.012 * H) & (np.abs(pts[:, 0] - x_mid) < torso_half)
        if mk.sum() < 20:
            return 0.0, 0.1 * H
        ys = pts[mk, 1]
        lo, hi = np.percentile(ys, 2), np.percentile(ys, 98)
        return float(0.5 * (lo + hi)), float(hi - lo)
    back = cfg.get("spine_back", 0.12)
    def spine_pt(z):
        yc, dep = torso_y(z)
        return np.array([x_mid, yc + back * dep, z])
    J["pelvis"] = spine_pt(z_p)
    J["spine"] = spine_pt(z_p + 0.27 * (z_nb - z_p))
    J["chest"] = spine_pt(z_p + 0.58 * (z_nb - z_p))
    J["neck_base"] = spine_pt(z_nb)
    yc, dep = torso_y(z_hj)
    J["head_joint"] = np.array([x_mid, yc + 0.05 * dep, z_hj])
    hm = pts[:, 2] > z_hj + 0.02 * H
    hm &= np.abs(pts[:, 0] - x_mid) < 0.12 * H
    J["head_top"] = np.array([x_mid, float(pts[hm, 1].mean()) if hm.sum() > 10 else yc, cfg.get("head_top", 0.985) * H])
    J["crotch"] = np.array([x_mid, torso_y(z_c + 0.01 * H)[0], z_c])
    # 몸통 단면(가중치 계산에서 몸통 뼈의 '십자 선분'을 만드는 데 사용): [반폭, 앞 y, 뒤 y, z]
    x_arm_lim = 0.5 * (abs(sil.x_of(armL["gap_x"]) - x_mid) + abs(sil.x_of(armR["gap_x"]) - x_mid))
    def xsec(z):
        iz = min(max(sil.iz_of(z), 0), sil.nz - 1)
        r = sil.central_run(iz, ixc) if sil.rows[iz] else None
        hw = 0.5 * (r[1] - r[0] + 1) * c if r else 0.08 * H
        hw = min(hw, x_arm_lim)
        mk = (np.abs(pts[:, 2] - z) < 0.012 * H) & (np.abs(pts[:, 0] - x_mid) < 0.6 * hw)
        if mk.sum() < 20:
            return np.array([hw, -0.07 * H, 0.07 * H, z])
        ys = pts[mk, 1]
        return np.array([hw, float(np.percentile(ys, 2)), float(np.percentile(ys, 98)), z])
    J["xsec.hips_lo"] = xsec(z_hip)
    J["xsec.hips"] = xsec(0.5 * (z_p + J["spine"][2]))
    J["xsec.spine"] = xsec(0.5 * (J["spine"][2] + J["chest"][2]))
    J["xsec.chest"] = xsec(J["chest"][2] + 0.35 * (z_nb - J["chest"][2]))
    J["xsec.chest_hi"] = xsec(J["chest"][2] + 0.75 * (z_nb - J["chest"][2]))
    for side, sgn in (("L", 1.0), ("R", -1.0)):
        S = J["shoulder_joint." + side]
        J["clavicle." + side] = np.array([x_mid + sgn * 0.025 * H, S[1] - 0.02 * H, min(z_nb - 0.015 * H, S[2] + 0.012 * H)])

    # --- 좌우 대칭화 ---
    if cfg.get("symmetrize", True):
        names = sorted({k[:-2] for k in J if k.endswith(".L")})
        for nm in names:
            a = J[nm + ".L"].copy(); b = J[nm + ".R"].copy()
            if nm == "grip":
                continue                      # 손바닥 기준점은 각 손의 실제 정점 중심을 그대로 쓴다
            if nm == "grip_axis":
                m = np.array([0.5 * (a[0] - b[0]), 0.5 * (a[1] + b[1]), 0.5 * (a[2] + b[2])])
                m /= np.linalg.norm(m)
                J[nm + ".L"] = m; J[nm + ".R"] = np.array([-m[0], m[1], m[2]])
            else:
                dx = 0.5 * ((a[0] - x_mid) - (b[0] - x_mid))
                y = 0.5 * (a[1] + b[1]); z = 0.5 * (a[2] + b[2])
                J[nm + ".L"] = np.array([x_mid + dx, y, z]); J[nm + ".R"] = np.array([x_mid - dx, y, z])
    if cfg.get("grip_flip"):            # 무기가 새끼손가락 쪽으로 나올 때: 손잡이 축을 뒤집는다
        for sd in ("L", "R"):
            J["grip_axis." + sd] = -J["grip_axis." + sd]
    info["palm"] = {k: [int(i) for i in v] for k, v in palm_sets.items()}
    info["H"] = H
    info["z"] = dict(crotch=round(z_c / H, 4), hip=round(z_hip / H, 4), armpit=round(z_ap / H, 4),
                     neck=round(z_neck / H, 4), neck_base=round(z_nb / H, 4), head_joint=round(z_hj / H, 4))
    # 수동 보정: cfg["offsets"] = {"관절이름": [dx,dy,dz] (키 비율)},  cfg["joints"] = {"관절이름": [x,y,z] (m, 절대 좌표)}
    for k, off in (cfg.get("offsets") or {}).items():
        if k in J:
            J[k] = J[k] + np.array(off, dtype=float) * H
    for k, pos in (cfg.get("joints") or {}).items():
        J[k] = np.array(pos, dtype=float)
    return J, info, sil


# ----------------------------------------------------------------------------
# 2. 뼈대 생성
# ----------------------------------------------------------------------------

DEFORM_BONES = ["hips", "spine", "chest", "neck", "head",
                "shoulder.L", "upper_arm.L", "forearm.L", "forearm_roll.L", "hand.L",
                "shoulder.R", "upper_arm.R", "forearm.R", "forearm_roll.R", "hand.R",
                "thigh.L", "shin.L", "foot.L", "toe.L",
                "thigh.R", "shin.R", "foot.R", "toe.R"]


def bone_table(J):
    """(이름, 머리, 꼬리, 부모, 변형 여부, 롤 기준 벡터) 목록."""
    V = lambda k: np.array(J[k], dtype=float)
    fwd = np.array([0.0, -1.0, 0.0])
    T = []
    H = J["head_top"][2] / 0.985
    T.append(("root", np.array([J["pelvis"][0], 0.0, 0.0]), np.array([J["pelvis"][0], 0.0, 0.12 * H]), None, False, fwd))
    T.append(("hips", V("pelvis"), V("spine"), "root", True, fwd))
    T.append(("spine", V("spine"), V("chest"), "hips", True, fwd))
    T.append(("chest", V("chest"), V("neck_base"), "spine", True, fwd))
    T.append(("neck", V("neck_base"), V("head_joint"), "chest", True, fwd))
    T.append(("head", V("head_joint"), V("head_top"), "neck", True, fwd))
    for s in ("L", "R"):
        E, W = V("elbow." + s), V("wrist." + s)
        M = E + 0.5 * (W - E)
        T.append(("shoulder." + s, V("clavicle." + s), V("shoulder_joint." + s), "chest", True, fwd))
        T.append(("upper_arm." + s, V("shoulder_joint." + s), E, "shoulder." + s, True, fwd))
        T.append(("forearm." + s, E, M, "upper_arm." + s, True, fwd))
        T.append(("forearm_roll." + s, M, W, "forearm." + s, True, fwd))
        T.append(("hand." + s, W, V("hand_tip." + s), "forearm_roll." + s, True, fwd))
        T.append(("thigh." + s, V("hip_joint." + s), V("knee." + s), "hips", True, fwd))
        T.append(("shin." + s, V("knee." + s), V("ankle." + s), "thigh." + s, True, fwd))
        T.append(("foot." + s, V("ankle." + s), V("ball." + s), "shin." + s, True, np.array([0, 0, 1.0])))
        T.append(("toe." + s, V("ball." + s), V("toe_tip." + s), "foot." + s, True, np.array([0, 0, 1.0])))
    # 소켓(변형 없음): 검은 오른손, 방패는 왼팔뚝
    for s in ("R", "L"):
        G = V("grip." + s); g = V("grip_axis." + s)
        a = V("hand_tip." + s) - V("wrist." + s); a /= np.linalg.norm(a)
        T.append(("weapon." + s, G, G + g * 0.10 * H / 1.8, "hand." + s, False, a))
    # 방패 소켓(왼팔뚝 바깥쪽). 뼈의 Y축 = 방패 앞면 법선(손등 방향), Z축 = 방패 위쪽(엄지 방향)
    s = "L"
    g = V("grip_axis." + s)
    E, W = V("elbow." + s), V("wrist." + s)
    a = W - E; a /= np.linalg.norm(a)
    n = np.cross(g, a); n /= np.linalg.norm(n)          # 왼손의 손등 방향
    up = g - a * float(g @ a); up /= np.linalg.norm(up)
    k = H / 1.8
    C = E + 0.62 * (W - E) + n * 0.085 * k - up * 0.075 * k
    T.append(("shield." + s, C, C + n * 0.10 * k, "hand." + s, False, up))
    return T


def build_armature(J, name="Armature"):
    ad = bpy.data.armatures.new(name)
    ao = bpy.data.objects.new(name, ad)
    bpy.context.scene.collection.objects.link(ao)
    set_active(ao)
    bpy.ops.object.mode_set(mode='EDIT')
    eb = ad.edit_bones
    for (nm, head, tail, par, deform, rollref) in bone_table(J):
        b = eb.new(nm)
        b.head = Vector(head); b.tail = Vector(tail)
        if par:
            b.parent = eb[par]
            b.use_connect = False
        b.use_deform = deform
        b.align_roll(Vector(rollref))
    bpy.ops.object.mode_set(mode='OBJECT')
    ad.display_type = 'OCTAHEDRAL'
    ao.show_in_front = True
    return ao


def heat_segments(J):
    """가중치 계산에 쓰는 '뼈 선분'. 뼈 하나가 선분 여러 개를 가질 수 있다(골반·발뒤꿈치 등)."""
    V = lambda k: np.array(J[k], dtype=float)
    S = {}
    xm = float(J["pelvis"][0])
    def cross(key, kw=0.55, kd=0.27):
        if key not in J:
            return []
        hw, yf, yb, z = [float(t) for t in J[key]]
        yc = 0.5 * (yf + yb); dep = yb - yf
        return [(np.array([xm - kw * hw, yc, z]), np.array([xm + kw * hw, yc, z])),
                (np.array([xm, yc - kd * dep, z]), np.array([xm, yc + kd * dep, z]))]
    S["hips"] = [(V("pelvis"), V("spine")), (V("hip_joint.L"), V("hip_joint.R")), (V("crotch"), V("pelvis"))] + cross("xsec.hips_lo") + cross("xsec.hips")
    S["spine"] = [(V("spine"), V("chest"))] + cross("xsec.spine")
    S["chest"] = [(V("chest"), V("neck_base"))] + cross("xsec.chest") + cross("xsec.chest_hi", 0.45, 0.25)
    S["neck"] = [(V("neck_base"), V("head_joint"))]
    S["head"] = [(V("head_joint"), V("head_top"))]
    for s in ("L", "R"):
        E, W = V("elbow." + s), V("wrist." + s)
        M = E + 0.5 * (W - E)
        S["shoulder." + s] = [(V("clavicle." + s), V("shoulder_joint." + s))]
        S["upper_arm." + s] = [(V("shoulder_joint." + s), E)]
        S["forearm." + s] = [(E, M)]
        S["forearm_roll." + s] = [(M, W)]
        S["hand." + s] = [(W, V("hand_tip." + s))]
        S["thigh." + s] = [(V("hip_joint." + s), V("knee." + s))]
        S["shin." + s] = [(V("knee." + s), V("ankle." + s))]
        S["foot." + s] = [(V("ankle." + s), V("ball." + s)), (V("ankle." + s), V("heel." + s) + np.array([0, -0.01, 0.02]))]
        S["toe." + s] = [(V("ball." + s), V("toe_tip." + s))]
    return S


# ----------------------------------------------------------------------------
# 3. 가중치: 열 확산(bone heat) 방정식을 직접 푼다
#    (L + diag(A*H)) w_j = A*H*p_j ,  H_i = c / d_i^2 (가장 가까운 '보이는' 뼈까지의 거리)
# ----------------------------------------------------------------------------

def _weld(co, tol=1e-5):
    key = np.round(co / tol).astype(np.int64)
    _, first, inv = np.unique(key, axis=0, return_index=True, return_inverse=True)
    return first, inv.ravel()


def _seg_dist(P, a, b):
    ab = b - a
    L2 = float(ab @ ab)
    t = np.clip(((P - a) @ ab) / max(L2, 1e-12), 0.0, 1.0)
    cp = a + np.outer(t, ab)
    return np.linalg.norm(P - cp, axis=1), cp


def compute_heat_weights(body, J, c_heat=1.0, max_infl=4, log_fn=log):
    co = mesh_world_verts(body)
    first, inv = _weld(co)
    P = co[first]
    nw = len(P)
    tris = inv[mesh_tris(body)]
    ok = (tris[:, 0] != tris[:, 1]) & (tris[:, 1] != tris[:, 2]) & (tris[:, 0] != tris[:, 2])
    tris = tris[ok]

    # 코탄젠트 라플라시안과 정점 면적
    A = np.zeros(nw)
    ei, ej, ew = [], [], []
    p0, p1, p2 = P[tris[:, 0]], P[tris[:, 1]], P[tris[:, 2]]
    area = 0.5 * np.linalg.norm(np.cross(p1 - p0, p2 - p0), axis=1)
    for k in range(3):
        np.add.at(A, tris[:, k], area / 3.0)
    for k in range(3):
        i, j, o = tris[:, k], tris[:, (k + 1) % 3], tris[:, (k + 2) % 3]
        u = P[i] - P[o]; v = P[j] - P[o]
        cot = (u * v).sum(1) / np.maximum(np.linalg.norm(np.cross(u, v), axis=1), 1e-12)
        ei.append(i); ej.append(j); ew.append(0.5 * cot)
    ei = np.concatenate(ei); ej = np.concatenate(ej); ew = np.concatenate(ew)
    lo = np.minimum(ei, ej); hi = np.maximum(ei, ej)
    key = lo.astype(np.int64) * nw + hi
    uk, uinv = np.unique(key, return_inverse=True)
    W = np.bincount(uinv, weights=ew, minlength=len(uk))
    W = np.maximum(W, 1e-3 * np.median(np.abs(W)))          # 둔각 삼각형의 음수 가중치 방지
    ea = (uk // nw).astype(np.int64); eb = (uk % nw).astype(np.int64)
    A = np.maximum(A, 1e-12)

    # 정점 법선(가시성 검사 시작점을 표면 안쪽으로 살짝 옮기는 데 사용)
    fn = np.cross(p1 - p0, p2 - p0)
    N = np.zeros((nw, 3))
    for k in range(3):
        np.add.at(N, tris[:, k], fn)
    N /= np.maximum(np.linalg.norm(N, axis=1, keepdims=True), 1e-12)

    segs = heat_segments(J)
    names = list(DEFORM_BONES)
    nb = len(names)
    Dm = np.full((nw, nb), 1e9)
    CP = np.zeros((nw, nb, 3))
    for j, nm in enumerate(names):
        for (a, b) in segs[nm]:
            d, cp = _seg_dist(P, a, b)
            better = d < Dm[:, j]
            Dm[better, j] = d[better]
            CP[better, j] = cp[better]

    bvh = BVHTree.FromPolygons([tuple(p) for p in P], [tuple(int(x) for x in t) for t in tris], all_triangles=True)
    order = np.argsort(Dm, axis=1)
    Hh = np.zeros(nw)
    Pm = np.zeros((nw, nb))
    n_invisible = 0
    eps = 1e-4
    for i in range(nw):
        pi = P[i]
        src = Vector(pi - N[i] * 2e-4)
        found = None
        for j in order[i, :8]:
            cp = CP[i, j]
            v = Vector(cp) - src
            dist = v.length
            if dist < 1e-6:
                found = (j, max(Dm[i, j], 1e-4)); break
            hit = bvh.ray_cast(src, v / dist, dist - eps)
            if hit[0] is None:
                found = (j, Dm[i, j]); break
        if found is None:
            n_invisible += 1
            continue
        j0, dmin = found
        close = [j0]
        for j in order[i, :8]:
            if j != j0 and Dm[i, j] <= dmin * 1.0001:
                close.append(j)
        Hh[i] = c_heat * len(close) / max(dmin * dmin, 1e-8)
        for j in close:
            Pm[i, j] = 1.0 / len(close)
    log_fn("heat: welded verts %d, tris %d, edges %d, 뼈가 안 보이는 정점 %d (%.1f%%)" % (
        nw, len(tris), len(ea), n_invisible, 100.0 * n_invisible / nw))

    # 켤레기울기법(야코비 전처리)으로 모든 뼈를 한꺼번에 푼다
    diag = np.bincount(ea, weights=W, minlength=nw) + np.bincount(eb, weights=W, minlength=nw) + A * Hh
    Bm = (A * Hh)[:, None] * Pm

    def matvec(X):
        dif = W[:, None] * (X[ea] - X[eb])
        Y = np.zeros_like(X)
        for k in range(X.shape[1]):
            Y[:, k] = np.bincount(ea, weights=dif[:, k], minlength=nw) - np.bincount(eb, weights=dif[:, k], minlength=nw)
        return Y + (A * Hh)[:, None] * X

    X = Pm.copy()
    R = Bm - matvec(X)
    Z = R / diag[:, None]
    Pd = Z.copy()
    rz = (R * Z).sum(0)
    b_norm = np.sqrt((Bm * Bm).sum(0)) + 1e-30
    it_used = 0
    for it in range(2500):
        AP = matvec(Pd)
        alpha = rz / np.maximum((Pd * AP).sum(0), 1e-30)
        X += Pd * alpha
        R -= AP * alpha
        res = np.sqrt((R * R).sum(0)) / b_norm
        it_used = it + 1
        if res.max() < 1e-6:
            break
        Z = R / diag[:, None]
        rz_new = (R * Z).sum(0)
        Pd = Z + Pd * (rz_new / np.maximum(rz, 1e-30))
        rz = rz_new
    log_fn("heat: CG %d회 반복, 최대 상대 잔차 %.2e" % (it_used, float(res.max())))

    Wt = np.clip(X, 0.0, None)
    Wt /= np.maximum(Wt.sum(1, keepdims=True), 1e-12)
    # 영향 뼈를 max_infl 개로 제한: (max_infl+1)번째로 큰 값을 모두에서 빼는 '연속적인' 제한.
    # (단순히 상위 4개만 남기면 이웃 정점끼리 4번째 뼈가 달라져 가중치가 끊기고, 작은 모서리가 크게 늘어난다)
    if nb > max_infl:
        kth = -np.sort(-Wt, axis=1)[:, max_infl]
        Wt = np.clip(Wt - kth[:, None], 0.0, None)
    s = Wt.sum(1, keepdims=True)
    bad = (s[:, 0] < 1e-8)
    if bad.any():
        nearest = np.argmin(Dm[bad], axis=1)
        Wt[bad] = 0.0
        Wt[np.flatnonzero(bad), nearest] = 1.0
        s = Wt.sum(1, keepdims=True)
    Wt /= s
    return names, Wt[inv], dict(n_welded=nw, n_invisible=n_invisible, cg_iters=it_used)


def rigidify(names, Wt, bone, thresh, lo=None):
    """bone 의 가중치가 thresh 이상이면 100%, lo 이하면 그대로, 그 사이는 부드럽게 이어서 딱딱한 부분(주먹·머리)을 만든다.
    계단식으로 자르면 경계에서 가중치가 끊기므로 smoothstep 으로 연속성을 지킨다."""
    j = names.index(bone)
    lo = thresh * 0.45 if lo is None else lo
    w = Wt[:, j].copy()
    t = np.clip((w - lo) / max(thresh - lo, 1e-6), 0.0, 1.0)
    sm = t * t * (3 - 2 * t)
    w_new = w + (1.0 - w) * sm
    rest = 1.0 - w
    scale = np.where(rest > 1e-9, (1.0 - w_new) / np.maximum(rest, 1e-9), 0.0)
    Wt *= scale[:, None]
    Wt[:, j] = w_new
    return int((w_new > 0.999).sum())


def apply_weights(body, arm_obj, names, Wt):
    for vg in list(body.vertex_groups):
        body.vertex_groups.remove(vg)
    for j, nm in enumerate(names):
        vg = body.vertex_groups.new(name=nm)
        col = Wt[:, j]
        idx = np.flatnonzero(col > 1e-5)
        for i in idx:
            vg.add([int(i)], float(col[i]), 'REPLACE')
    for m in list(body.modifiers):
        if m.type == 'ARMATURE':
            body.modifiers.remove(m)
    mod = body.modifiers.new("Armature", 'ARMATURE')
    mod.object = arm_obj
    mod.use_vertex_groups = True
    M = body.matrix_world.copy()
    body.parent = arm_obj
    body.matrix_world = M


# ----------------------------------------------------------------------------
# 4. 검사 도구
# ----------------------------------------------------------------------------

def rest_edge_lengths(body):
    co = mesh_world_verts(body)
    e = mesh_edges(body)
    L = np.linalg.norm(co[e[:, 0]] - co[e[:, 1]], axis=1)
    return e, L


def stretch_now(body, e, L0, min_len=1e-4):
    """현재 포즈에서 모서리 늘어남 비율(변형 후 길이 / 원래 길이)의 최댓값과 분포."""
    dg = bpy.context.evaluated_depsgraph_get()
    co = mesh_world_verts(body, dg, deformed=True)
    L = np.linalg.norm(co[e[:, 0]] - co[e[:, 1]], axis=1)
    ok = L0 > min_len
    ratio = np.ones_like(L)
    ratio[ok] = L[ok] / L0[ok]
    return ratio, co


def palm_point(body, palm_idx, depsgraph=None):
    """손바닥(주먹 속) 기준점: 주먹 정점 집합의 '변형 후' 중심(월드 좌표)."""
    co = mesh_world_verts(body, depsgraph, deformed=True)
    return co[np.asarray(palm_idx, dtype=int)].mean(0)


def grip_point(sword):
    """검 손잡이 중심(검 오브젝트 원점)의 월드 좌표."""
    dg = bpy.context.evaluated_depsgraph_get()
    return np.array(sword.evaluated_get(dg).matrix_world.translation)
