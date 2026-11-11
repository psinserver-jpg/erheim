"""대장장이 망치를 bmesh 로 직접 모델링한다(외부 모델 파일 없음).

로컬 좌표: +Y = 자루 위쪽(쇠 머리 쪽, 엄지 방향), Z = 타격면 방향(너클 쪽), X = 두께. 원점 = 손잡이 중심.
자루 길이 약 0.36m, 묵직한 쇠 머리(타격면 + 반대쪽은 살짝 좁아지는 뒷머리).
"""
import bpy, bmesh, math
from mathutils import Vector
import gear

Y_BOT = -0.105     # 자루 아래 끝(배율 전)
Y_HEAD = 0.215     # 쇠 머리 중심
HEAD_HY = 0.036    # 쇠 머리 절반 높이(자루 방향)
Y_TOP = Y_HEAD + HEAD_HY + 0.008


def _ell(y, rx, rz, n=10):
    return [Vector((rx * math.cos(2 * math.pi * i / n), y, rz * math.sin(2 * math.pi * i / n))) for i in range(n)]


def _oct(z, hx, hy, ch, yc):
    """Z 위치의 모서리를 깎은 사각 단면(8점)."""
    cx = min(ch, hx * 0.9); cy = min(ch, hy * 0.9)
    pts = [(-hx + cx, -hy), (hx - cx, -hy), (hx, -hy + cy), (hx, hy - cy), (hx - cx, hy), (-hx + cx, hy), (-hx, hy - cy), (-hx, -hy + cy)]
    return [Vector((x, yc + y, z)) for x, y in pts]


def make_hammer(name="Weapon", s=1.0):
    bm = bmesh.new()
    mats = [gear._mat("HammerWood", (0.30, 0.17, 0.08), 0.0, 0.60),
            gear._mat("HammerWrap", (0.10, 0.06, 0.04), 0.0, 0.80),
            gear._mat("HammerIron", (0.20, 0.21, 0.23), 1.0, 0.42),
            gear._mat("HammerFace", (0.62, 0.64, 0.68), 1.0, 0.24),
            gear._mat("HammerBrass", (0.80, 0.56, 0.26), 1.0, 0.35)]
    WOOD, WRAP, IRON, FACE, BRASS = range(5)
    S = lambda ring: [p * s for p in ring]

    # --- 자루: 타원 단면, 아래 끝이 살짝 굵어 손에서 빠지지 않는 모양
    shaft = [(Y_BOT, 0.0150, 0.0185), (Y_BOT + 0.012, 0.0185, 0.0225), (Y_BOT + 0.030, 0.0165, 0.0200), (-0.055, 0.0150, 0.0180),
             (0.060, 0.0150, 0.0180), (0.120, 0.0140, 0.0170), (Y_HEAD - HEAD_HY, 0.0135, 0.0165), (Y_TOP, 0.0130, 0.0160)]
    gear._ring_loft(bm, [S(_ell(y, rx, rz)) for y, rx, rz in shaft], lambda i, k: WOOD)
    # --- 손잡이 가죽 감개 + 위아래 놋쇠 테
    gear._ring_loft(bm, [S(_ell(-0.062, 0.0155, 0.0185)), S(_ell(-0.052, 0.0175, 0.0205)), S(_ell(0.0, 0.0180, 0.0210)),
                         S(_ell(0.052, 0.0175, 0.0205)), S(_ell(0.062, 0.0155, 0.0185))], lambda i, k: WRAP)
    for yy in (-0.066, 0.066):
        gear._ring_loft(bm, [S(_ell(yy - 0.005, 0.0185, 0.0215)), S(_ell(yy + 0.005, 0.0185, 0.0215))], lambda i, k: BRASS)
    # --- 자루 꼭대기 쐐기 마개
    gear._ring_loft(bm, [S(_ell(Y_TOP - 0.004, 0.0150, 0.0180)), S(_ell(Y_TOP + 0.004, 0.0120, 0.0150))], lambda i, k: BRASS)

    # --- 쇠 머리: Z 방향으로 긴 덩어리. +Z = 넓은 타격면, -Z = 살짝 좁아지는 뒷머리
    prof = [(-0.082, 0.020, 0.024, 0.006), (-0.076, 0.024, 0.028, 0.005), (-0.050, 0.027, 0.031, 0.005), (-0.030, 0.031, HEAD_HY, 0.006),
            (0.030, 0.031, HEAD_HY, 0.006), (0.046, 0.029, 0.033, 0.006), (0.052, 0.033, 0.038, 0.007), (0.078, 0.033, 0.038, 0.007),
            (0.084, 0.028, 0.033, 0.008)]
    def head_mat(i, k):
        return FACE if i >= len(prof) - 2 or i == 0 else IRON
    gear._ring_loft(bm, [S(_oct(z, hx, hy, ch, Y_HEAD)) for z, hx, hy, ch in prof], head_mat)
    # 머리 가운데 띠(자루 구멍 보강)
    gear._ring_loft(bm, [S(_oct(z, 0.0335, HEAD_HY + 0.0025, 0.006, Y_HEAD)) for z in (-0.022, 0.022)], lambda i, k: IRON)

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    me = bpy.data.meshes.new(name + "Mesh")
    bm.to_mesh(me); bm.free()
    for m in mats:
        me.materials.append(m)
    for p in me.polygons:
        p.use_smooth = me.materials[p.material_index].name in ("HammerWood", "HammerWrap", "HammerBrass")
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    ob["blade_tip_y"] = Y_TOP * s
    ob["blade_base_y"] = (Y_HEAD - HEAD_HY) * s
    ob["grip_half_len"] = 0.062 * s
    ob["grip_radius"] = 0.021 * s
    return ob


def build(arm, body, k, gcfg):
    ob = make_hammer("Weapon", k * gcfg.get("scale", 1.0))
    ob.name = "Weapon"
    gear.parent_to_bone(ob, arm, "weapon.R")
