"""마법사 지팡이를 bmesh 로 직접 모델링한다(외부 모델 파일 없음).

로컬 좌표: +Y = 지팡이 위쪽(수정), 원점 = 손잡이 중심(주먹이 쥐는 곳).
전체 길이 약 1.5m(키 1.68 기준), 손잡이는 중간보다 조금 아래.
"""
import bpy, bmesh, math
from mathutils import Vector, Matrix
import gear

Y_BOT = -0.70      # 아래 끝(배율 전)
Y_TOP = 0.90       # 수정 꼭대기(배율 전)


def _circ(y, r, n=10, rz=None, ph=0.0):
    rz = r if rz is None else rz
    return [Vector((r * math.cos(2 * math.pi * i / n + ph), y, rz * math.sin(2 * math.pi * i / n + ph))) for i in range(n)]


def make_staff(name="Weapon", s=1.0):
    bm = bmesh.new()
    mats = [gear._mat("StaffWood", (0.16, 0.085, 0.05), 0.0, 0.62),
            gear._mat("StaffGold", (1.0, 0.74, 0.32), 1.0, 0.30),
            gear._mat("StaffWrap", (0.13, 0.08, 0.26), 0.0, 0.75),
            gear._mat("StaffGem", (0.12, 0.38, 1.0), 0.1, 0.12, (0.2, 0.55, 1.0), 4.0)]
    WOOD, GOLD, WRAP, GEM = range(4)
    S = lambda ring: [p * s for p in ring]

    # --- 자루: 아래로 갈수록 가늘고, 위쪽은 살짝 굵어진다
    shaft = [(-0.665, 0.0105), (-0.50, 0.0125), (-0.30, 0.014), (-0.10, 0.015), (0.10, 0.015), (0.30, 0.0155),
             (0.50, 0.0165), (0.62, 0.018), (0.685, 0.020)]
    gear._ring_loft(bm, [S(_circ(y, r)) for y, r in shaft], lambda i, k: WOOD)
    # --- 아래 끝 물미(금속 뾰족 캡)
    gear._ring_loft(bm, [S(_circ(Y_BOT, 0.003)), S(_circ(-0.685, 0.011)), S(_circ(-0.665, 0.0145)), S(_circ(-0.635, 0.014)),
                         S(_circ(-0.625, 0.0115))], lambda i, k: GOLD)
    # --- 손잡이 감개(가죽) + 금테
    gear._ring_loft(bm, [S(_circ(-0.095, 0.0155)), S(_circ(-0.085, 0.0175)), S(_circ(0.0, 0.018)), S(_circ(0.085, 0.0175)),
                         S(_circ(0.095, 0.0155))], lambda i, k: WRAP)
    for yy in (-0.10, 0.10, 0.36):
        gear._ring_loft(bm, [S(_circ(yy - 0.009, 0.0165)), S(_circ(yy - 0.005, 0.021)), S(_circ(yy + 0.005, 0.021)),
                             S(_circ(yy + 0.009, 0.0165))], lambda i, k: GOLD)
    # --- 머리 받침(금 장식 목)
    gear._ring_loft(bm, [S(_circ(0.655, 0.019)), S(_circ(0.67, 0.027)), S(_circ(0.69, 0.031)), S(_circ(0.705, 0.024)),
                         S(_circ(0.725, 0.019)), S(_circ(0.74, 0.026)), S(_circ(0.752, 0.014))], lambda i, k: GOLD)
    # --- 수정을 감싸는 초승달 갈퀴 4개(실루엣이 크게 보이도록 바깥으로 벌어졌다가 위에서 모인다)
    gy, gr = 0.815, 0.046           # 수정 중심 높이, 반지름
    for j in range(4):
        a = math.pi / 4 + j * math.pi / 2
        ca, sa = math.cos(a), math.sin(a)
        rings = []
        N = 9
        for i in range(N):
            u = i / (N - 1)
            ang = -0.62 * math.pi + u * 1.22 * math.pi          # 아래(-112도) → 위(+108도) 로 도는 호
            rad = gr + 0.030 - 0.006 * u
            out = max(0.012, rad * math.cos(ang))
            y = gy + rad * math.sin(ang) * 1.12
            th = 0.0085 * (1.0 - 0.72 * u) + 0.0015
            c = Vector((out * ca, y, out * sa))
            # 단면: 반경 방향/접선 방향의 마름모
            rd = Vector((ca, 0, sa)); tg = Vector((-sa, 0, ca)); up = Vector((0, 1, 0))
            nrm = (rd * math.cos(ang) + up * math.sin(ang))
            rings.append([(c + nrm * th * 1.5) * s, (c + tg * th) * s, (c - nrm * th * 1.1) * s, (c - tg * th) * s])
        gear._ring_loft(bm, rings, lambda i, k: GOLD)
    # --- 수정: 위아래가 뾰족한 팔각 결정
    gem = [(gy - 0.074, 0.002), (gy - 0.040, 0.030), (gy - 0.004, gr), (gy + 0.030, 0.034), (gy + 0.085, 0.002)]
    gear._ring_loft(bm, [S(_circ(y, r, n=8, ph=math.pi / 8)) for y, r in gem], lambda i, k: GEM)

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    me = bpy.data.meshes.new(name + "Mesh")
    bm.to_mesh(me); bm.free()
    for m in mats:
        me.materials.append(m)
    for p in me.polygons:
        p.use_smooth = me.materials[p.material_index].name in ("StaffWood", "StaffWrap")
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    ob["blade_tip_y"] = Y_TOP * s
    ob["blade_base_y"] = 0.655 * s
    ob["grip_half_len"] = 0.095 * s
    ob["grip_radius"] = 0.018 * s
    ob["gem_y"] = gy * s
    return ob


def build(arm, body, k, gcfg):
    ob = make_staff("Weapon", k * gcfg.get("scale", 1.0))
    ob.name = "Weapon"
    gear.parent_to_bone(ob, arm, "weapon.R")
