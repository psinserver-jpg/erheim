"""해골 기사 장비: 이 빠진 녹슨 장검 + 깨진 작은 원형 방패. 전부 bmesh 로 직접 모델링한다.

검 로컬 좌표: +Y = 칼끝, Z = 날 폭, X = 두께, 원점 = 손잡이 중심.
방패 로컬 좌표: +Y = 앞면 법선, +Z = 위, 원점 = 뒷면 중심.
"""
import bpy, bmesh, math
from mathutils import Vector, Matrix
import gear


def make_rusty_sword(name, s, blade_len=0.95):
    bm = bmesh.new()
    mats = [gear._mat("SkRustBlade", (0.30, 0.22, 0.17), 0.85, 0.62),
            gear._mat("SkRustDeep", (0.30, 0.16, 0.10), 0.5, 0.86),
            gear._mat("SkEdge", (0.40, 0.37, 0.34), 1.0, 0.48),
            gear._mat("SkGuard", (0.13, 0.11, 0.10), 0.9, 0.6),
            gear._mat("SkGrip", (0.10, 0.065, 0.04), 0.0, 0.9)]
    BLADE, RUST, EDGE, GUARD, GRIP = range(5)
    grip_len = 0.20 * s
    hg = grip_len / 2

    def ell(y, rx, rz, n=10):
        return [Vector((rx * s * math.cos(2 * math.pi * i / n), y, rz * s * math.sin(2 * math.pi * i / n))) for i in range(n)]

    # 손잡이(해진 가죽 끈: 마디마다 굵기가 다르다)
    ys = [-hg + grip_len * i / 8 for i in range(9)]
    rings = [ell(y, 0.0135 + (0.002 if i % 2 else 0.0), 0.0165 + (0.0025 if i % 2 else 0.0)) for i, y in enumerate(ys)]
    gear._ring_loft(bm, rings, lambda i, j: GRIP)
    # 폼멜(찌그러진 쇠뭉치)
    yp = -hg
    gear._ring_loft(bm, [ell(yp - 0.050 * s, 0.006, 0.008), ell(yp - 0.040 * s, 0.021, 0.027), ell(yp - 0.020 * s, 0.025, 0.031),
                         ell(yp - 0.004 * s, 0.019, 0.023), ell(yp + 0.004 * s, 0.014, 0.017)], lambda i, j: GUARD)
    # 가드: 곧은 쇠막대, 한쪽 끝이 부러져 짧다
    yg = hg + 0.014 * s
    def gsec(z, hy, hx):
        return [Vector((-hx * s, yg - hy * s, z * s)), Vector((hx * s, yg - hy * s, z * s)),
                Vector((hx * s, yg + hy * s, z * s)), Vector((-hx * s, yg + hy * s, z * s))]
    zs = [-0.095, -0.085, -0.05, -0.02, 0.02, 0.05, 0.10, 0.135, 0.145]
    rings = []
    for z in zs:
        u = abs(z) / 0.145
        rings.append(gsec(z, 0.015 * (1 - 0.35 * u), 0.016 * (1 - 0.3 * u)))
    gear._ring_loft(bm, rings, lambda i, j: GUARD)

    # 칼날: 육각 단면. 날 양쪽에 이 빠진 자국(폭이 갑자기 줄어드는 곳), 끝은 비스듬히 부러졌다
    y0 = yg + 0.014 * s
    w0 = 0.074
    notch_p = {0.21: 0.016, 0.47: 0.022, 0.72: 0.013, 0.86: 0.010}      # +Z 날
    notch_n = {0.33: 0.019, 0.60: 0.012, 0.79: 0.017}                   # -Z 날
    st = sorted(set([0.0, 0.03, 0.10, 0.40, 0.54, 0.66, 0.93] +
                    [u + d for u in list(notch_p) + list(notch_n) for d in (-0.022, 0.0, 0.022)]))
    def sec(u, dy_p=0.0, dy_n=0.0):
        y = y0 + u * blade_len
        w = w0 * (1.0 - 0.20 * u)
        t = 0.012 * (1 - 0.45 * u)
        fw = 0.020 * (1 - 0.5 * u)
        wp = w / 2 - notch_p.get(round(u, 3), 0.0)
        wn = w / 2 - notch_n.get(round(u, 3), 0.0)
        return [Vector((0, y + dy_p, wp * s)), Vector((t / 2 * s, y + dy_p * 0.6, fw / 2 * s)), Vector((t / 2 * s, y + dy_n * 0.6, -fw / 2 * s)),
                Vector((0, y + dy_n, -wn * s)), Vector((-t / 2 * s, y + dy_n * 0.6, -fw / 2 * s)), Vector((-t / 2 * s, y + dy_p * 0.6, fw / 2 * s))]
    st = [round(u, 3) for u in st]
    rings = [sec(u) for u in st]
    rings.append(sec(0.955, dy_p=0.045 * blade_len, dy_n=-0.02 * blade_len))     # 부러진 끝(비스듬)
    nst = len(rings)
    def blade_mat(i, j):
        if j in (1, 4):                       # 넓은 면 가운데 띠: 녹이 깊다
            return RUST if (i * 7 + j) % 3 else BLADE
        if (i + j) % 5 == 0:
            return RUST
        return EDGE if (i % 4 == 1) else BLADE
    gear._ring_loft(bm, rings, blade_mat, close_start=True, close_end=True)

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    me = bpy.data.meshes.new(name + "Mesh")
    bm.to_mesh(me); bm.free()
    for m in mats:
        me.materials.append(m)
    for p in me.polygons:
        p.use_smooth = p.material_index in (GRIP, GUARD)
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    ob["blade_tip_y"] = float(y0 + blade_len)
    ob["blade_base_y"] = float(y0)
    ob["grip_half_len"] = float(hg)
    ob["grip_radius"] = 0.019 * s
    return ob


def make_round_shield(name, s, radius=0.215):
    bm = bmesh.new()
    mats = [gear._mat("SkShWood", (0.16, 0.10, 0.065), 0.0, 0.85),
            gear._mat("SkShWoodDark", (0.09, 0.06, 0.045), 0.0, 0.9),
            gear._mat("SkShIron", (0.20, 0.15, 0.12), 0.85, 0.62),
            gear._mat("SkShRust", (0.36, 0.15, 0.07), 0.45, 0.88)]
    WOOD, WOOD2, IRON, RUSTM = range(4)
    n = 24
    R = radius * s
    # 가장자리 반지름: 한쪽이 깨져 나갔다
    def edge_r(j):
        a = 2 * math.pi * j / n
        bite = {3: 0.80, 4: 0.68, 5: 0.84, 15: 0.90, 16: 0.86}
        return R * bite.get(j, 1.0), a
    def front_y(r):
        return (0.040 - 0.55 * (r / s) ** 2) * s
    def pt(j, f, back=False):
        r, a = edge_r(j)
        r *= f
        y = front_y(r) - (0.016 * s if back else 0.0)
        return Vector((r * math.cos(a), y, r * math.sin(a)))
    facs = [1.0, 0.90, 0.60, 0.30, 0.22]
    fv = [[bm.verts.new(pt(j, f)) for j in range(n)] for f in facs]
    for i in range(len(facs) - 1):
        for j in range(n):
            j2 = (j + 1) % n
            f = bm.faces.new((fv[i][j], fv[i][j2], fv[i + 1][j2], fv[i + 1][j]))
            if i == 0:
                f.material_index = RUSTM if j % 4 == 1 else IRON
            elif i == 3:
                f.material_index = IRON
            else:
                f.material_index = WOOD2 if (j // 3) % 2 else WOOD        # 널빤지 느낌의 띠
    # 가운데 쇠 돌기(움보)
    boss_r = [0.22, 0.17, 0.10, 0.04]
    boss_y = [0.0, 0.022, 0.040, 0.048]
    prev = fv[-1]
    for br, by in zip(boss_r[1:], boss_y[1:]):
        ring = [bm.verts.new(Vector((R * br * math.cos(2 * math.pi * j / n), front_y(R * 0.22) + by * s, R * br * math.sin(2 * math.pi * j / n)))) for j in range(n)]
        for j in range(n):
            j2 = (j + 1) % n
            f = bm.faces.new((prev[j], prev[j2], ring[j2], ring[j])); f.material_index = IRON
        prev = ring
    f = bm.faces.new(prev); f.material_index = RUSTM
    # 뒷면·옆 테
    bv = [bm.verts.new(pt(j, 1.0, True)) for j in range(n)]
    bc = bm.verts.new(Vector((0, front_y(0) - 0.016 * s, 0)))
    for j in range(n):
        j2 = (j + 1) % n
        f = bm.faces.new((bv[j2], bv[j], bc)); f.material_index = WOOD2
        f = bm.faces.new((fv[0][j2], fv[0][j], bv[j], bv[j2])); f.material_index = IRON
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    me = bpy.data.meshes.new(name + "Mesh")
    bm.to_mesh(me); bm.free()
    for m in mats:
        me.materials.append(m)
    for p in me.polygons:
        p.use_smooth = p.material_index in (IRON, RUSTM)
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    return ob


def build(arm, body, k, gcfg):
    sword = make_rusty_sword("Weapon", k, blade_len=gcfg.get("blade_len", 0.95))
    gear.parent_to_bone(sword, arm, "weapon.R")
    if gcfg.get("shield", True):
        sh = make_round_shield("Shield", k, radius=gcfg.get("shield_radius", 0.215))
        gear.parent_to_bone(sh, arm, "shield.L")
