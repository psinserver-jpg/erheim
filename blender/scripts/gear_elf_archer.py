"""요정 궁수 장비: 왼손 장궁(WeaponL, 뼈 weapon.L). 전부 bmesh 로 직접 모델링한다.

활 로컬 좌표: +Y = 엄지 쪽(윗활대), -Y = 아랫활대, +Z = 주먹 너클 방향(표적 쪽), 시위는 -Z 쪽(궁수 쪽).
원점 = 손잡이(줌통) 중심. 시위가 팔뚝을 관통하지 않도록 활 평면을 Y축 둘레로 조금 돌려 둔다.
"""
import bpy, bmesh, math, json
import numpy as np
from mathutils import Vector, Matrix
import gear, rigcore
from common import log


def make_bow(name="WeaponL", scale=1.0, length=1.36, brace=0.165, plane_rot=22.0):
    bm = bmesh.new()
    mats = [gear._mat("BowWood", (0.20, 0.30, 0.12), 0.0, 0.45),
            gear._mat("BowGold", (1.0, 0.78, 0.36), 1.0, 0.30),
            gear._mat("BowGrip", (0.30, 0.17, 0.08), 0.0, 0.75),
            gear._mat("BowString", (0.92, 0.90, 0.80), 0.0, 0.5),
            gear._mat("BowGem", (0.2, 0.9, 0.5), 0.2, 0.15, (0.2, 1.0, 0.5), 2.0)]
    WOOD, GOLD, GRIP, STRING, GEM = range(5)
    s = scale
    half = length / 2
    N = 10

    def zc(y):                       # 활대 중심선: 끝으로 갈수록 궁수 쪽(-Z)으로 휘고, 끝은 다시 앞으로 말린다(리커브)
        u = min(1.0, abs(y) / half)
        return -brace * (u ** 1.7) + 0.075 * (max(0.0, u - 0.74) / 0.26) ** 2

    def sec(y, rx, rz):
        c = zc(y)
        return [Vector((rx * math.cos(2 * math.pi * i / N), y, c + rz * math.sin(2 * math.pi * i / N))) * s for i in range(N)]

    # 손잡이(줌통): 주먹이 쥐는 굵기
    gh = 0.075
    ys = np.linspace(-gh, gh, 7)
    gear._ring_loft(bm, [sec(y, 0.0150 + 0.002 * math.cos(y / gh * math.pi / 2), 0.0185 + 0.002 * math.cos(y / gh * math.pi / 2)) for y in ys],
                    lambda i, k_: GRIP)
    # 활대 두 개
    for sg in (1, -1):
        us = [0.0, 0.03, 0.08, 0.16, 0.26, 0.38, 0.50, 0.62, 0.72, 0.80, 0.87, 0.93, 0.97, 1.0]
        rings = []
        for u in us:
            y = sg * (gh + (half - gh) * u)
            sw = 1.0 + 0.55 * math.exp(-((u - 0.05) / 0.06) ** 2)          # 손잡이 위아래의 장식 볼록
            rx = (0.0200 - 0.0125 * u) * sw
            rz = (0.0150 - 0.0090 * u) * sw
            if u >= 0.97:
                rx *= 1.5; rz *= 1.5                                       # 고자(시위 거는 끝)
            rings.append(sec(y, rx, rz))
        if sg < 0:
            rings = [list(reversed(r)) for r in rings]
        def mfn(i, k_):
            return GOLD if (i <= 1 or i >= len(us) - 3 or i == 6) else WOOD
        gear._ring_loft(bm, rings, mfn)
        # 보석(손잡이 바로 위·아래, 표적 쪽 면)
        yg = sg * (gh + 0.035)
        g = bmesh.ops.create_uvsphere(bm, u_segments=8, v_segments=5, radius=0.011 * s,
                                      matrix=Matrix.Translation(Vector((0, yg, zc(yg) + 0.022)) * s))
        for f in {f for v in g["verts"] for f in v.link_faces}:
            f.material_index = GEM
    # 시위: 가는 원통(양 끝 고자를 잇는다)
    ytip = half * 0.975
    zt = zc(ytip)
    r = 0.0028
    ring_a = [Vector((r * math.cos(2 * math.pi * i / 6), -ytip, zt + r * math.sin(2 * math.pi * i / 6))) * s for i in range(6)]
    ring_b = [Vector((r * math.cos(2 * math.pi * i / 6), ytip, zt + r * math.sin(2 * math.pi * i / 6))) * s for i in range(6)]
    gear._ring_loft(bm, [ring_a, ring_b], lambda i, k_: STRING)
    # 활 평면을 Y축 둘레로 돌려 시위가 팔뚝 옆(몸 안쪽)을 지나가게 한다
    bmesh.ops.rotate(bm, verts=bm.verts[:], cent=(0, 0, 0), matrix=Matrix.Rotation(math.radians(plane_rot), 3, 'Y'))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    me = bpy.data.meshes.new(name + "Mesh")
    bm.to_mesh(me); bm.free()
    for m in mats:
        me.materials.append(m)
    for p in me.polygons:
        p.use_smooth = True
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    ob["bow_length"] = length * s
    ob["string_z"] = zt * s
    return ob


def build(arm, body, k, gcfg):
    ob = make_bow("WeaponL", scale=k, length=gcfg.get("bow_length", 1.36), plane_rot=gcfg.get("plane_rot", 22.0))
    ob.name = "WeaponL"
    gear.parent_to_bone(ob, arm, "weapon.L")
    bpy.context.view_layer.update()
    # 공용 검사는 오른손 무기만 재므로, 왼손 손잡이-손바닥 거리를 여기서 직접 재서 로그에 남긴다
    try:
        palm = json.loads(body["palm_sets"])
        pp = rigcore.palm_point(body, palm["L"])
        gp = rigcore.grip_point(ob)
        log("gear_elf_archer: bow length %.3f m, LEFT grip-palm distance [rest]: %.2f mm" % (ob["bow_length"], float(np.linalg.norm(pp - gp)) * 1000))
    except Exception as ex:
        log("gear_elf_archer: left grip measure failed: %r" % (ex,))
