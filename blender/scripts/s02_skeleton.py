"""2단계: 관절 위치를 찾아 뼈대(Armature)를 만든다. 뼈대를 메시 위에 겹친 진단 렌더를 남긴다.

인자: <태그> [설정 json 경로]
"""
import bpy, sys, os, json, math
sys.path.insert(0, os.path.dirname(__file__))
from common import *
import rigcore

args = script_args()
tag = args[0] if args else "hero"
cfg = load_cfg(tag)
blend = cfg_blend(cfg)

body = bpy.data.objects["Body"]
# 이전 뼈대와 거기 붙어 있던 장비, 진단·광고용 보조 오브젝트를 모두 지우고 새로 만든다(Body 만 남김)
for o in list(bpy.data.objects):
    if o is not body:
        bpy.data.objects.remove(o, do_unlink=True)
for vg in list(body.vertex_groups):
    body.vertex_groups.remove(vg)
for m in list(body.modifiers):
    body.modifiers.remove(m)
body.parent = None
for ad in list(bpy.data.armatures):
    if ad.users == 0:
        bpy.data.armatures.remove(ad)
for me_ in list(bpy.data.meshes):
    if me_.users == 0:
        bpy.data.meshes.remove(me_)
bpy.context.view_layer.update()

J, info, sil = rigcore.find_landmarks(body, cfg.get("landmarks"))
H = info["H"]
# 몸 중심선을 x=0 으로 옮긴다
xm = info["x_mid"]
if abs(xm) > 1e-4 and not body.get("recentered"):
    me = body.data
    n = len(me.vertices)
    v = np.empty(n * 3, dtype=np.float32); me.vertices.foreach_get("co", v)
    v = v.reshape(n, 3); v[:, 0] -= xm
    me.vertices.foreach_set("co", v.ravel()); me.update()
    for k in J:
        if not k.startswith(("grip_axis", "xsec")):
            J[k] = J[k] - np.array([xm, 0, 0])
    body["recentered"] = True
    log("mesh recentered by x_mid = %.4f" % xm)

log("heights (fraction of H):", json.dumps(info["z"]), "neck method:", info.get("neck_method"))
log("arms:", json.dumps(info["arms"]))
log("legs:", json.dumps(info["legs"]), "neck_width %.3f" % info["neck_width"])
for k in sorted(J):
    log("  J %-18s %s" % (k, np.round(J[k], 3).tolist()))

arm = rigcore.build_armature(J)
nb = len(arm.data.bones)
nd = sum(1 for b in arm.data.bones if b.use_deform)
log("armature built: bones %d (deform %d, helper %d)" % (nb, nd, nb - nd))

# 관절 좌표를 다음 단계에서 쓰도록 저장
jdump = {k: [float(x) for x in v] for k, v in J.items()}
arm["rig_joints"] = json.dumps(jdump)
body["palm_sets"] = json.dumps(info["palm"])
log("palm vertex sets: L %d verts, R %d verts" % (len(info["palm"]["L"]), len(info["palm"]["R"])))
arm["rig_height"] = H
body["rig_height"] = H
save_blend(blend)

# ---------------- 겹쳐 보기 진단 렌더 ----------------
def stick_material(name, color):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    em = nt.nodes.new("ShaderNodeEmission"); em.inputs[0].default_value = (*color, 1); em.inputs[1].default_value = 1.0
    out = nt.nodes.new("ShaderNodeOutputMaterial"); nt.links.new(em.outputs[0], out.inputs[0])
    return m

import bmesh
bm = bmesh.new()
mats = [stick_material("StickC", (1, 0.9, 0.1)), stick_material("StickL", (1, 0.15, 0.1)), stick_material("StickR", (0.1, 0.9, 0.2)),
        stick_material("StickS", (0.2, 0.6, 1.0))]
def mat_index(nm):
    if nm.startswith("weapon"):
        return 3
    return 1 if nm.endswith(".L") else (2 if nm.endswith(".R") else 0)
for b in arm.data.bones:
    h = arm.matrix_world @ b.head_local; t = arm.matrix_world @ b.tail_local
    d = t - h
    L = d.length
    q = Vector((0, 0, 1)).rotation_difference(d.normalized())
    M = Matrix.Translation((h + t) / 2) @ q.to_matrix().to_4x4()
    r = 0.0045 * H / 1.8
    geom = bmesh.ops.create_cone(bm, cap_ends=True, segments=8, radius1=r * 1.8, radius2=r * 0.5, depth=L, matrix=M)
    for f in {f for v in geom["verts"] for f in v.link_faces}:
        f.material_index = mat_index(b.name)
    g2 = bmesh.ops.create_icosphere(bm, subdivisions=1, radius=r * 2.6, matrix=Matrix.Translation(h))
    for f in {f for v in g2["verts"] for f in v.link_faces}:
        f.material_index = mat_index(b.name)
sm = bpy.data.meshes.new("StickMesh"); bm.to_mesh(sm); bm.free()
for m in mats:
    sm.materials.append(m)
stick = bpy.data.objects.new("StickSkeleton", sm)
bpy.context.scene.collection.objects.link(stick)

def composite(base, over, out, dim=0.55):
    a = bpy.data.images.load(base); b = bpy.data.images.load(over)
    w, h = a.size
    pa = np.empty(w * h * 4, dtype=np.float32); a.pixels.foreach_get(pa); pa = pa.reshape(h, w, 4)
    pb = np.empty(w * h * 4, dtype=np.float32); b.pixels.foreach_get(pb); pb = pb.reshape(h, w, 4)
    al = pb[:, :, 3:4]
    res = pa.copy()
    res[:, :, :3] = pa[:, :, :3] * dim * (1 - al) + pb[:, :, :3] * al
    res[:, :, 3] = 1.0
    img = bpy.data.images.new("comp", w, h, alpha=False)
    img.pixels.foreach_set(res.ravel())
    img.filepath_raw = out; img.file_format = 'PNG'; img.save()
    bpy.data.images.remove(a); bpy.data.images.remove(b); bpy.data.images.remove(img)

setup_diag_lights()
c = (0, 0, H * 0.5)
arm.hide_render = True
outs = []
for nm, az, el in [("front", 0, 0), ("left", 90, 0), ("back", 180, 0)]:
    pb_ = os.path.join(DIAG, f"{tag}_s02_{nm}_body.png")
    ps_ = os.path.join(DIAG, f"{tag}_s02_{nm}_stick.png")
    po_ = os.path.join(DIAG, f"{tag}_s02_{nm}.png")
    stick.hide_render = True; body.hide_render = False
    render_view(pb_, c, 6.0, az, el, ortho_scale=H * 1.12, res=(900, 1200))
    stick.hide_render = False; body.hide_render = True
    render_view(ps_, c, 6.0, az, el, ortho_scale=H * 1.12, res=(900, 1200), transparent=True)
    composite(pb_, ps_, po_)
    os.remove(pb_); os.remove(ps_)
    outs.append(po_)
body.hide_render = False
bpy.data.objects.remove(stick, do_unlink=True)
log("overlay renders:", " ".join(os.path.relpath(p, ROOT) for p in outs))
