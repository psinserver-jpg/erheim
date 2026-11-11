"""검·방패 등 장비를 코드로 직접 모델링한다(외부 모델 파일 없음).

검 로컬 좌표: +Y = 칼끝 방향, Z = 칼날 폭(날 방향), X = 두께. 원점 = 손잡이 중심.
방패 로컬 좌표: +Y = 앞면 법선, +Z = 위, X = 가로. 원점 = 뒷면 중심 부근.
"""
import bpy, bmesh, math
import numpy as np
from mathutils import Vector, Matrix


def _mat(name, base, metallic=0.0, rough=0.5, emission=None, estr=0.0):
    m = bpy.data.materials.get(name)
    if m:
        return m
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get("Principled BSDF")
    b.inputs["Base Color"].default_value = (*base, 1.0)
    b.inputs["Metallic"].default_value = metallic
    b.inputs["Roughness"].default_value = rough
    if emission is not None:
        b.inputs["Emission Color"].default_value = (*emission, 1.0)
        b.inputs["Emission Strength"].default_value = estr
    return m


def _ring_loft(bm, rings, mat_fn=None, close_start=True, close_end=True):
    """같은 개수의 점을 가진 단면 고리들을 이어 붙인다. rings: [ [Vector...], ... ]"""
    vr = [[bm.verts.new(p) for p in ring] for ring in rings]
    n = len(vr[0])
    faces = []
    for i in range(len(vr) - 1):
        for k in range(n):
            a, b = vr[i][k], vr[i][(k + 1) % n]
            c, d = vr[i + 1][(k + 1) % n], vr[i + 1][k]
            f = bm.faces.new((a, b, c, d))
            if mat_fn:
                f.material_index = mat_fn(i, k)
            faces.append(f)
    if close_start:
        f = bm.faces.new(list(reversed(vr[0])))
        if mat_fn:
            f.material_index = mat_fn(0, 0)
    if close_end:
        f = bm.faces.new(vr[-1])
        if mat_fn:
            f.material_index = mat_fn(len(vr) - 2, 0)
    return vr


def make_sword(name="Sword", scale=1.0, blade_len=0.97, blade_w=0.064, guard_w=0.27, grip_len=0.17, style="knight"):
    bm = bmesh.new()
    mats = [_mat("SwordBlade", (0.83, 0.86, 0.92), 1.0, 0.2),
            _mat("SwordGold", (1.0, 0.74, 0.32), 1.0, 0.32),
            _mat("SwordGrip", (0.035, 0.05, 0.16), 0.0, 0.72),
            _mat("SwordRune", (0.25, 0.5, 0.95), 0.6, 0.3, (0.2, 0.55, 1.0), 1.5),
            _mat("SwordGem", (0.1, 0.3, 0.9), 0.2, 0.15, (0.15, 0.45, 1.0), 2.5)]
    BLADE, GOLD, GRIP, RUNE, GEM = range(5)
    s = scale
    hg = grip_len / 2

    # --- 손잡이 (타원 단면, 가운데가 살짝 볼록)
    def ell(y, rx, rz, n=12):
        return [Vector((rx * math.cos(2 * math.pi * k / n), y, rz * math.sin(2 * math.pi * k / n))) * s for k in range(n)]
    rings = [ell(-hg, 0.0135, 0.0165), ell(-hg * 0.5, 0.015, 0.0185), ell(0, 0.0155, 0.019), ell(hg * 0.5, 0.015, 0.0185), ell(hg, 0.0135, 0.0165)]
    _ring_loft(bm, rings, lambda i, k: GRIP)
    # 손잡이 금테 3개
    for yy in (-hg + 0.004, 0.0, hg - 0.004):
        _ring_loft(bm, [ell(yy - 0.004, 0.0175, 0.0215), ell(yy + 0.004, 0.0175, 0.0215)], lambda i, k: GOLD)

    # --- 폼멜(끝 장식)
    yp = -hg - 0.022
    rr = [ell(yp - 0.03, 0.004, 0.005), ell(yp - 0.022, 0.02, 0.024), ell(yp - 0.006, 0.026, 0.031), ell(yp + 0.012, 0.021, 0.025), ell(yp + 0.024, 0.014, 0.017)]
    _ring_loft(bm, rr, lambda i, k: GOLD)

    # --- 가드(십자 코등이): Z 방향으로 길고 끝이 칼끝 쪽으로 살짝 휘어 올라감
    yg = hg + 0.014
    def gsec(z, hy, hx, lift):
        return [Vector((-hx, yg - hy + lift, z)) * s, Vector((hx, yg - hy + lift, z)) * s,
                Vector((hx, yg + hy + lift, z)) * s, Vector((-hx, yg + hy + lift, z)) * s]
    zs = np.linspace(-guard_w / 2, guard_w / 2, 13)
    rings = []
    for z in zs:
        u = abs(z) / (guard_w / 2)
        hy = 0.016 * (1 - 0.45 * u) + (0.008 if u > 0.9 else 0)
        hx = 0.017 * (1 - 0.35 * u) + (0.004 if u > 0.9 else 0)
        rings.append(gsec(z, hy, hx, 0.03 * u * u))
    _ring_loft(bm, rings, lambda i, k: GOLD)
    # 가드 가운데 보석(양면)
    for sx in (-1, 1):
        g = bmesh.ops.create_uvsphere(bm, u_segments=10, v_segments=6, radius=0.013 * s,
                                      matrix=Matrix.Translation(Vector((sx * 0.016, yg, 0)) * s) @ Matrix.Diagonal((0.6, 1, 1, 1)))
        for f in {f for v in g["verts"] for f in v.link_faces}:
            f.material_index = GEM

    # --- 칼날: 육각 단면(가운데 평평한 띠 = 룬 문양 자리)
    y0 = yg + 0.014
    stations = [0.0, 0.03, 0.12, 0.30, 0.50, 0.70, 0.85, 0.93, 0.975]
    def bsec(u):
        y = y0 + u * blade_len
        w = blade_w * (1.0 - 0.14 * u - 0.10 * max(0.0, u - 0.7) / 0.3) * (1.06 if u < 0.02 else 1.0)
        t = 0.0115 * (1 - 0.5 * u)
        fw = 0.018 * (1 - 0.55 * u)
        return [Vector((0, y, w / 2)) * s, Vector((t / 2, y, fw / 2)) * s, Vector((t / 2, y, -fw / 2)) * s,
                Vector((0, y, -w / 2)) * s, Vector((-t / 2, y, -fw / 2)) * s, Vector((-t / 2, y, fw / 2)) * s]
    rings = [bsec(u) for u in stations]
    def blade_mat(i, k):
        # k=1: +X 평면 띠, k=4: -X 평면 띠
        return RUNE if (k in (1, 4) and 1 <= i <= 4) else BLADE
    vr = _ring_loft(bm, rings, blade_mat, close_start=True, close_end=False)
    tip = bm.verts.new(Vector((0, y0 + blade_len, 0)) * s)
    last = vr[-1]
    for k in range(6):
        f = bm.faces.new((last[k], last[(k + 1) % 6], tip))
        f.material_index = BLADE
    # 칼날 뿌리 장식(금)
    _ring_loft(bm, [[Vector((x, y0 - 0.002, z)) * s for x, z in ((-0.011, 0.04), (0.011, 0.04), (0.011, -0.04), (-0.011, -0.04))],
                    [Vector((x, y0 + 0.03, z)) * s for x, z in ((-0.009, 0.036), (0.009, 0.036), (0.009, -0.036), (-0.009, -0.036))]],
               lambda i, k: GOLD)

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    me = bpy.data.meshes.new(name + "Mesh")
    bm.to_mesh(me); bm.free()
    for m in mats:
        me.materials.append(m)
    for p in me.polygons:
        p.use_smooth = me.materials[p.material_index].name in ("SwordGold", "SwordGrip", "SwordGem")
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    ob["blade_tip_y"] = (y0 + blade_len) * s
    ob["blade_base_y"] = y0 * s
    ob["grip_half_len"] = hg * s
    ob["grip_radius"] = 0.019 * s
    return ob


SHIELD_OUTLINE = [(-0.215, 0.27), (-0.11, 0.288), (0.0, 0.272), (0.11, 0.288), (0.215, 0.27), (0.222, 0.10), (0.205, -0.06),
                  (0.155, -0.19), (0.085, -0.30), (0.0, -0.375), (-0.085, -0.30), (-0.155, -0.19), (-0.205, -0.06), (-0.222, 0.10)]


def make_shield(name="Shield", scale=1.0, emblem_image=None):
    bm = bmesh.new()
    field = _mat("ShieldField", (0.05, 0.11, 0.42), 0.55, 0.38)
    mats = [field, _mat("ShieldRim", (0.82, 0.84, 0.88), 1.0, 0.25), _mat("ShieldGold", (1.0, 0.74, 0.32), 1.0, 0.32),
            _mat("ShieldBack", (0.16, 0.10, 0.06), 0.0, 0.8)]
    FIELD, RIM, GOLD, BACK = range(4)
    s = scale
    uvl = bm.loops.layers.uv.new("UVMap")
    cx, cz = 0.0, -0.03
    def front_y(x, z):
        return 0.045 - 0.72 * x * x - 0.05 * (z - cz) * (z - cz)
    def pt(x, z, back=False):
        y = front_y(x, z) - (0.014 if back else 0.0)
        return Vector((x, y, z)) * s
    # 동심 고리: 1.0(가장자리) → 0.88(테 안쪽) → 0.6 → 0.3 → 중심
    facs = [1.0, 0.955, 0.875, 0.6, 0.3]
    rings = []
    for fct in facs:
        rings.append([(cx + (x - cx) * fct, cz + (z - cz) * fct) for (x, z) in SHIELD_OUTLINE])
    n = len(SHIELD_OUTLINE)
    def uv_of(x, z):
        # 문장이 방패 가운데에 오도록 평면 투영
        return ((x + 0.26) / 0.52, (z + 0.40) / 0.70)
    fv = [[bm.verts.new(pt(x, z)) for (x, z) in ring] for ring in rings]
    cen = bm.verts.new(pt(cx, cz))
    def set_uv(face, coords):
        for loop, (x, z) in zip(face.loops, coords):
            loop[uvl].uv = uv_of(x, z)
    for i in range(len(rings) - 1):
        for k in range(n):
            k2 = (k + 1) % n
            f = bm.faces.new((fv[i][k], fv[i][k2], fv[i + 1][k2], fv[i + 1][k]))
            f.material_index = GOLD if i == 1 else (RIM if i == 0 else FIELD)
            set_uv(f, (rings[i][k], rings[i][k2], rings[i + 1][k2], rings[i + 1][k]))
    for k in range(n):
        k2 = (k + 1) % n
        f = bm.faces.new((fv[-1][k], fv[-1][k2], cen))
        f.material_index = FIELD
        set_uv(f, (rings[-1][k], rings[-1][k2], (cx, cz)))
    # 뒷면과 옆 테두리
    bv = [bm.verts.new(pt(x, z, True)) for (x, z) in rings[0]]
    bc = bm.verts.new(pt(cx, cz, True))
    for k in range(n):
        k2 = (k + 1) % n
        f = bm.faces.new((bv[k2], bv[k], bc)); f.material_index = BACK
        f = bm.faces.new((fv[0][k2], fv[0][k], bv[k], bv[k2])); f.material_index = RIM
    # 가장자리 리벳
    for (x, z) in rings[1][::2]:
        g = bmesh.ops.create_uvsphere(bm, u_segments=8, v_segments=5, radius=0.008 * s,
                                      matrix=Matrix.Translation(pt(x * 0.985, z * 0.985) + Vector((0, 0.002, 0)) * s))
        for f in {f for v in g["verts"] for f in v.link_faces}:
            f.material_index = GOLD
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    me = bpy.data.meshes.new(name + "Mesh")
    bm.to_mesh(me); bm.free()
    for m in mats:
        me.materials.append(m)
    for p in me.polygons:
        p.use_smooth = True
    if emblem_image is not None:
        nt = field.node_tree
        if not any(nd.type == 'TEX_IMAGE' for nd in nt.nodes):
            tex = nt.nodes.new("ShaderNodeTexImage"); tex.image = emblem_image
            b = nt.nodes.get("Principled BSDF")
            nt.links.new(tex.outputs["Color"], b.inputs["Base Color"])
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    return ob


def parent_to_bone(obj, arm, bone_name):
    """오브젝트 원점이 뼈 머리에 오고, 축이 뼈 축과 일치하도록 붙인다."""
    b = arm.data.bones[bone_name]
    obj.parent = arm
    obj.parent_type = 'BONE'
    obj.parent_bone = bone_name
    obj.matrix_parent_inverse = Matrix.Identity(4)
    obj.location = (0, -b.length, 0)
    obj.rotation_euler = (0, 0, 0)
    obj.scale = (1, 1, 1)
