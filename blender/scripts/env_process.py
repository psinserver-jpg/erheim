"""건물·소품 GLB 가공: 삼각형 수 줄이기, 바닥 중심을 원점으로, 가장 긴 변=1 로 정규화, 텍스처 줄여 GLB 로 내보낸다.
인자: <입력 glb> <출력 glb> <목표 삼각형 수> [텍스처 px]
"""
import bpy, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from common import *
a = script_args()
src = a[0] if os.path.isabs(a[0]) else os.path.join(ROOT, a[0])
dst = a[1] if os.path.isabs(a[1]) else os.path.join(ROOT, a[1])
target = int(a[2]); tex = int(a[3]) if len(a) > 3 else 1024
reset_scene()
bpy.ops.import_scene.gltf(filepath=src)
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
for o in meshes:
    M = o.matrix_world.copy(); o.parent = None; o.matrix_world = M
set_active(meshes[0])
for o in meshes: o.select_set(True)
if len(meshes) > 1: bpy.ops.object.join()
ob = bpy.context.view_layer.objects.active
for o in list(bpy.context.scene.objects):
    if o is not ob: bpy.data.objects.remove(o, do_unlink=True)
set_active(ob)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
n0 = len(mesh_tris(ob))
if n0 > target:
    m = ob.modifiers.new("Dec", 'DECIMATE'); m.ratio = target / n0
    bpy.ops.object.modifier_apply(modifier="Dec")
me = ob.data
n = len(me.vertices); v = np.empty(n * 3, dtype=np.float32); me.vertices.foreach_get("co", v); v = v.reshape(n, 3)
mn, mx = v.min(0), v.max(0)
v[:, 0] -= 0.5 * (mn[0] + mx[0]); v[:, 1] -= 0.5 * (mn[1] + mx[1]); v[:, 2] -= mn[2]
v /= float((mx - mn).max())
me.vertices.foreach_set("co", v.ravel()); me.update()
for mat in me.materials:
    if mat and mat.use_nodes:
        for nd in mat.node_tree.nodes:
            if nd.type == 'TEX_IMAGE' and nd.image and max(nd.image.size) > tex:
                nd.image.scale(tex, tex)
        b = mat.node_tree.nodes.get("Principled BSDF")
        if b:
            b.inputs["Metallic"].default_value = 0.0; b.inputs["Roughness"].default_value = 0.85
os.makedirs(os.path.dirname(dst), exist_ok=True)
bpy.ops.export_scene.gltf(filepath=dst, export_format='GLB', use_selection=True, export_image_format='WEBP', export_image_quality=85, export_animations=False, export_yup=True)
log("env", os.path.basename(dst), "tris %d -> %d" % (n0, len(mesh_tris(ob))), "size %.2f MB" % (os.path.getsize(dst) / 1e6), "dims", np.round((mx - mn) / (mx - mn).max(), 3))
