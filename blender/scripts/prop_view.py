"""소품/건물 GLB를 불러와 통계를 찍고 여러 방향에서 진단 렌더한다. (저장 안 함)
인자: <glb 경로> <태그>
"""
import bpy, sys, os, math
sys.path.insert(0, os.path.dirname(__file__))
from common import *

a = script_args()
src = a[0] if os.path.isabs(a[0]) else os.path.join(ROOT, a[0]); tag = a[1]
reset_scene()
bpy.ops.import_scene.gltf(filepath=src)
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
allco = []
for o in meshes:
    co = mesh_world_verts(o)
    allco.append(co)
    log("mesh", o.name, "verts", len(o.data.vertices), "tris", len(mesh_tris(o)), "mats", [m.name[:20] for m in o.data.materials])
    for m in o.data.materials:
        if m and m.use_nodes:
            for nd in m.node_tree.nodes:
                if nd.type == 'TEX_IMAGE' and nd.image:
                    log("   tex", nd.image.name[:28], tuple(nd.image.size))
co = np.concatenate(allco)
mn, mx = co.min(0), co.max(0)
log("bbox min", np.round(mn, 3), "max", np.round(mx, 3), "size", np.round(mx - mn, 3))
c = tuple(0.5 * (mn + mx)); R = float(np.linalg.norm(mx - mn))
setup_diag_lights()
for nm, az, el in (("a", 30, 25), ("b", 120, 25), ("c", 210, 25), ("d", 300, 25), ("top", 0, 89)):
    render_view(os.path.join(DIAG, f"prop_{tag}_{nm}.png"), c, R * 3, az, el, ortho_scale=R * 1.05, res=(640, 640), samples=16)
log("rendered prop views for", tag)
