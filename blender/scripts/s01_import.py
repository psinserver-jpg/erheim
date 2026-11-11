"""1단계: 리깅 안 된 원본 GLB를 불러와 정규화하고 통계·진단 렌더를 남긴다.

정규화: 메시 하나로 합침 → 좌우(팔 벌린 방향)를 X축으로, 얼굴이 -Y를 보게 회전 → 키를 목표 높이로 → 발바닥 z=0.
인자: <태그>   (원본 경로·목표 키·작업 파일은 blender/chars/<태그>.json 에서 읽는다)
"""
import bpy, sys, os, math
sys.path.insert(0, os.path.dirname(__file__))
from common import *

args = script_args()
tag = args[0] if len(args) > 0 else "hero"
cfg = load_cfg(tag)
src = cfg.get("source", os.path.join("input", "hero_raw.glb"))
src = src if os.path.isabs(src) else os.path.join(ROOT, src)
target_h = float(cfg.get("target_height", 1.80))
out_blend = cfg_blend(cfg)

reset_scene()
bpy.ops.import_scene.gltf(filepath=src)
log("imported", os.path.relpath(src, ROOT), "size %.1f MB" % (os.path.getsize(src) / 1e6))

meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
assert meshes, "no mesh in glb"
for o in meshes:
    M = o.matrix_world.copy()
    o.parent = None
    o.matrix_world = M
set_active(meshes[0])
for o in meshes:
    o.select_set(True)
if len(meshes) > 1:
    bpy.ops.object.join()
body = bpy.context.view_layer.objects.active
body.name = "Body"
body.data.name = "BodyMesh"
for o in list(bpy.context.scene.objects):
    if o is not body:
        bpy.data.objects.remove(o, do_unlink=True)
set_active(body)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

me = body.data
n = len(me.vertices)
v = np.empty(n * 3, dtype=np.float32)
me.vertices.foreach_get("co", v)
v = v.reshape(n, 3).astype(np.float64)
mn, mx = v.min(0), v.max(0)
log("raw bbox size", np.round(mx - mn, 4))

# 1) 좌우축 찾기: A포즈에서 팔을 벌린 쪽이 더 넓다
yaw = 0.0
if (mx[1] - mn[1]) > (mx[0] - mn[0]):
    v = np.stack([v[:, 1], -v[:, 0], v[:, 2]], axis=1)   # z축 -90도 회전: (x,y)->(y,-x)
    yaw -= 90.0
mn, mx = v.min(0), v.max(0)
H0 = mx[2] - mn[2]
# 2) 앞뒤 찾기: 발끝은 정강이보다 앞으로 나와 있다. 앞이 -Y가 되게 한다.
zrel = (v[:, 2] - mn[2]) / H0
feet = v[zrel < 0.04]
shin = v[(zrel > 0.09) & (zrel < 0.22)]
front_sign = np.sign(feet[:, 1].mean() - shin[:, 1].mean())
if front_sign > 0:   # 발끝이 +Y 쪽 → 180도 돌린다
    v[:, 0] *= -1.0; v[:, 1] *= -1.0
    yaw += 180.0
log("orientation fix yaw(deg) =", yaw, "(feet-shin dy before fix = %.4f)" % (feet[:, 1].mean() - shin[:, 1].mean()))

# 3) 크기·위치 정규화
mn, mx = v.min(0), v.max(0)
s = target_h / (mx[2] - mn[2])
v[:, 0] -= 0.5 * (mn[0] + mx[0]); v[:, 1] -= 0.5 * (mn[1] + mx[1]); v[:, 2] -= mn[2]
v *= s
me.vertices.foreach_set("co", v.astype(np.float32).ravel())
me.update()
co = mesh_world_verts(body)
mn, mx = bbox_of(co)
H = mx[2]
log("normalized: scale x%.4f height %.3f m, bbox min %s max %s" % (s, H, np.round(mn, 3), np.round(mx, 3)))

tris = mesh_tris(body)
log("verts", n, "tris", len(tris), "materials", [m.name for m in me.materials])
for m in me.materials:
    if m and m.use_nodes:
        for nd in m.node_tree.nodes:
            if nd.type == 'TEX_IMAGE' and nd.image:
                log("  tex", nd.image.name[:24], tuple(nd.image.size), nd.image.colorspace_settings.name)

# 연결 성분(위치로 용접)
key = np.round(co / 1e-5).astype(np.int64)
_, inv = np.unique(key, axis=0, return_inverse=True)
inv = inv.ravel(); nw = int(inv.max()) + 1
ew = inv[mesh_edges(body)]
parent = np.arange(nw)
def find(a):
    while parent[a] != a:
        parent[a] = parent[parent[a]]; a = parent[a]
    return a
for a, b in ew:
    ra, rb = find(a), find(b)
    if ra != rb:
        parent[ra] = rb
roots = np.array([find(i) for i in range(nw)])
uniq, counts = np.unique(roots, return_counts=True)
log("welded verts", nw, "connected components", len(uniq), "largest", np.sort(counts)[::-1][:6].tolist())

body["rig_tag"] = tag
body["target_height"] = target_h
body["src_yaw_fix"] = yaw
save_blend(out_blend)

setup_diag_lights()
c = (0, 0, H * 0.5)
for nm, az, el in [("front", 0, 0), ("left", 90, 0), ("back", 180, 0), ("q34", 35, 15)]:
    render_view(os.path.join(DIAG, f"{tag}_s01_{nm}.png"), c, 6.0, az, el, ortho_scale=H * 1.12, res=(720, 960))
log("diag renders written")
