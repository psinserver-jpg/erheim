"""오크 전사의 전투 도끼를 bmesh 로 직접 모델링한다(외부 모델 파일 없음).

로컬 좌표: +Y = 자루 위쪽(도끼 머리 쪽, 엄지 방향), +Z = 날 방향(너클 쪽), X = 두께. 원점 = 손잡이 중심.
자루 길이 약 0.9m(키 2.15m 기준), 크고 투박한 녹슨 쇠 날, 뒤쪽에 뭉툭한 쇠 가시, 가죽끈을 감은 자루.
"""
import bpy, bmesh, math
from mathutils import Vector
import gear

# 배율 전(키 1.8m 기준) 치수. 실제 크기는 k = 2.15/1.8 배.
Y_BOT = -0.215      # 자루 아래 끝
Y_TOP = 0.545       # 자루 위 끝
Y_HEAD = 0.425      # 도끼 머리 중심
EYE_HY = 0.060      # 머리가 자루를 감싸는 절반 높이


def _ell(y, rx, rz, n=10, ph=0.0):
    return [Vector((rx * math.cos(2 * math.pi * i / n + ph), y, rz * math.sin(2 * math.pi * i / n + ph))) for i in range(n)]


def _sec(z, tx, y_lo, y_hi, bevel=0.3):
    """Z 위치의 단면(X=두께, Y=높이). 위아래 모서리를 깎은 6각형."""
    b = tx * bevel
    return [Vector((-tx, y_lo + b * 2, z)), Vector((0, y_lo, z)), Vector((tx, y_lo + b * 2, z)),
            Vector((tx, y_hi - b * 2, z)), Vector((0, y_hi, z)), Vector((-tx, y_hi - b * 2, z))]


def make_axe(name="Weapon", s=1.0):
    bm = bmesh.new()
    mats = [gear._mat("OrcAxeWood", (0.20, 0.12, 0.06), 0.0, 0.75),
            gear._mat("OrcAxeLeather", (0.11, 0.06, 0.035), 0.0, 0.85),
            gear._mat("OrcAxeIron", (0.17, 0.15, 0.14), 0.9, 0.62),
            gear._mat("OrcAxeRustB", (0.150, 0.082, 0.050), 0.45, 0.88),
            gear._mat("OrcAxeEdge", (0.58, 0.56, 0.54), 1.0, 0.34),
            gear._mat("OrcAxeRustDark", (0.085, 0.060, 0.048), 0.55, 0.92)]
    WOOD, LEATHER, IRON, RUST, EDGE, RUST2 = range(6)
    S = lambda ring: [p * s for p in ring]

    # --- 자루: 살짝 울퉁불퉁한 굵은 나무. 아래 끝은 굵은 마개
    shaft = [(Y_BOT, 0.014, 0.016), (Y_BOT + 0.010, 0.023, 0.026), (Y_BOT + 0.034, 0.024, 0.027), (Y_BOT + 0.050, 0.0185, 0.0215),
             (-0.090, 0.0180, 0.0210), (0.000, 0.0185, 0.0215), (0.100, 0.0180, 0.0205), (0.200, 0.0190, 0.0215),
             (0.300, 0.0185, 0.0210), (Y_HEAD - EYE_HY, 0.0190, 0.0215), (Y_TOP - 0.012, 0.0185, 0.0210), (Y_TOP, 0.012, 0.014)]
    gear._ring_loft(bm, [S(_ell(y, rx, rz)) for y, rx, rz in shaft], lambda i, k: WOOD)
    # --- 손잡이 가죽끈: 감긴 끈처럼 굵기가 번갈아 달라지는 띠
    wrap = []
    y = -0.105
    i = 0
    while y <= 0.1051:
        r = 0.0018 if i % 2 == 0 else 0.0036
        wrap.append(S(_ell(y, 0.0190 + r, 0.0220 + r)))
        y += 0.015; i += 1
    gear._ring_loft(bm, wrap, lambda i, k: LEATHER)
    # 자루 중간의 가죽끈 한 묶음(머리 아래)
    wrap2 = []
    y = 0.235; i = 0
    while y <= 0.3001:
        r = 0.0018 if i % 2 == 0 else 0.0034
        wrap2.append(S(_ell(y, 0.0195 + r, 0.0220 + r)))
        y += 0.013; i += 1
    gear._ring_loft(bm, wrap2, lambda i, k: LEATHER)

    # --- 도끼 머리의 눈(자루를 감싸는 쇠 통)
    eye = [(Y_HEAD - EYE_HY - 0.006, 0.0215, 0.0245), (Y_HEAD - EYE_HY, 0.0290, 0.0330), (Y_HEAD + EYE_HY, 0.0290, 0.0330),
           (Y_HEAD + EYE_HY + 0.006, 0.0215, 0.0245)]
    gear._ring_loft(bm, [S(_ell(y, rx, rz, 12)) for y, rx, rz in eye], lambda i, k: IRON)

    # --- 날: +Z 로 넓게 퍼지는 초승달. 날 끝은 둥근 호(弧)이고 위아래 뿔이 뒤로 휘며, 아래쪽 수염(턱)이 길게 내려온다.
    #      u = 뿌리(0)→날 끝(1), v = 아래(0)→위(1) 격자를 양면으로 만들어 한 고리로 잇는다.
    NU, NV = 9, 9
    def blade_pt(u, v, side):
        s2 = 2.0 * v - 1.0                                   # -1(아래 뿔) ~ +1(위 뿔)
        flare = u ** 1.7
        y_lo = Y_HEAD - (0.050 + 0.165 * flare)
        y_hi = Y_HEAD + (0.050 + 0.105 * flare)
        # 위아래 가장자리도 안쪽으로 오목하게 파인다(초승달의 안쪽 곡선)
        vv = 0.5 - 0.5 * math.cos(math.pi * v)               # 가장자리 쪽에 점을 모은다
        y = y_lo + (y_hi - y_lo) * vv
        z_edge = 0.252 - 0.058 * abs(s2) ** 2.0 * u          # 날 끝 선이 둥글게 휜다
        z = 0.020 + (z_edge - 0.020) * u
        t = (0.0245 * (1.0 - u) ** 1.25 + 0.0006) * (1.0 - 0.55 * abs(s2) ** 3 * u)
        return Vector((side * t, y, z))
    rings = []
    for iu in range(NU):
        u = (iu / (NU - 1)) ** 0.85
        ring = [blade_pt(u, iv / (NV - 1), 1.0) for iv in range(NV)]
        ring += [blade_pt(u, iv / (NV - 1), -1.0) for iv in range(NV - 1, -1, -1)]
        rings.append(S(ring))
    def _noise(a, b, seed):
        n = math.sin(a * 12.9898 + b * 78.233 + seed * 37.719) * 43758.5453
        return n - math.floor(n)
    def blade_mat(i, kk):
        if i >= NU - 2:
            return EDGE                                       # 갈아 낸 날 끝만 밝은 쇠
        if kk == NV - 1 or kk == 2 * NV - 1:
            return RUST2 if _noise(i, kk, 5) < 0.6 else IRON  # 위아래 테두리
        side = 0 if kk < NV - 1 else 1
        v = kk if side == 0 else (2 * NV - 2 - kk)
        # 녹: 날 뿌리(자루 쪽)와 아래 턱에 짙고, 날 끝으로 갈수록 드문드문한 얼룩
        u = i / (NU - 2)
        blotch = 0.5 * _noise(i // 2, (v + side * 3) // 2, 11 + side) + 0.5 * _noise(i, v, 23 + side * 7)
        p_rust = 0.80 - 0.75 * u + 0.18 * (1.0 - v / (NV - 2)) * (1 - u)
        if blotch < p_rust * 0.55:
            return RUST2
        if blotch < p_rust:
            return RUST
        return IRON
    gear._ring_loft(bm, rings, blade_mat, close_start=True, close_end=False)

    # --- 뒤쪽(-Z): 뭉툭한 쇠 가시
    back = [(-0.020, 0.0240, Y_HEAD - 0.046, Y_HEAD + 0.046),
            (-0.050, 0.0180, Y_HEAD - 0.036, Y_HEAD + 0.036),
            (-0.085, 0.0120, Y_HEAD - 0.022, Y_HEAD + 0.020),
            (-0.118, 0.0030, Y_HEAD - 0.008, Y_HEAD + 0.004)]
    gear._ring_loft(bm, [S(_sec(*p)) for p in back], lambda i, kk: (RUST2, IRON, RUST, IRON, IRON, RUST2)[(i * 5 + kk * 2) % 6])

    # --- 머리를 자루에 묶은 쇠못 머리(양면)
    for sx in (-1, 1):
        for yy in (Y_HEAD - 0.030, Y_HEAD + 0.030):
            g = bmesh.ops.create_uvsphere(bm, u_segments=8, v_segments=5, radius=0.008 * s)
            for v in g["verts"]:
                v.co += Vector((sx * 0.0285, yy, 0.0)) * s
            for f in {f for v in g["verts"] for f in v.link_faces}:
                f.material_index = EDGE

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    me = bpy.data.meshes.new(name + "Mesh")
    bm.to_mesh(me); bm.free()
    for m in mats:
        me.materials.append(m)
    for p in me.polygons:
        p.use_smooth = me.materials[p.material_index].name in ("OrcAxeWood", "OrcAxeLeather")
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    ob["blade_tip_y"] = Y_TOP * s
    ob["blade_base_y"] = (Y_HEAD - EYE_HY) * s
    ob["grip_half_len"] = 0.105 * s
    ob["grip_radius"] = 0.024 * s
    return ob


def build(arm, body, k, gcfg):
    # 동작을 구운 뒤 이 단계를 다시 돌리면 활성 액션(idle)이 렌더 때 시험 포즈를 덮어써서
    # s04 진단 그림(가드/휘두르기/손 확대)이 전부 idle 자세로 찍힌다. 이 프로세스에서만 활성 액션을 떼어 둔다.
    # (액션 자체는 fake user 로 남아 있고, anims 단계가 다시 연결한다)
    if arm.animation_data is not None and arm.animation_data.action is not None:
        arm.animation_data.action = None
    ob = make_axe("Weapon", k * gcfg.get("scale", 1.0))
    ob.name = "Weapon"
    gear.parent_to_bone(ob, arm, "weapon.R")
