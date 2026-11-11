"""진단: 손잡이 중심과 여러 정의의 '손바닥 기준점' 사이 거리를 출력한다(저장 안 함)."""
import bpy, sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
from common import *
import rigpose
body = bpy.data.objects["Body"]; arm = bpy.data.objects["Armature"]
if arm.animation_data: arm.animation_data.action = None
rigpose.reset_pose(arm); bpy.context.view_layer.update()
co = mesh_world_verts(body)
G = np.array(arm.matrix_world @ arm.data.bones["weapon.R"].head_local)
palm = np.array(json.loads(body["palm_sets"])["R"], dtype=int)
c1 = co[palm].mean(0)
for r in (0.035, 0.045, 0.06):
    m = np.linalg.norm(co - G, axis=1) < r
    c = co[m].mean(0); log("nbr r=%.3f n=%d mean-G = %s  |d|=%.2f mm" % (r, m.sum(), np.round((c - G) * 1000, 2).tolist(), np.linalg.norm(c - G) * 1000))
bb = 0.5 * (co[palm].min(0) + co[palm].max(0))
log("G =", np.round(G, 5).tolist(), "palm centroid-G mm", np.round((c1 - G) * 1000, 2).tolist(), "bbox center-G mm", np.round((bb - G) * 1000, 2).tolist(), "|bbox|=%.2f" % (np.linalg.norm(bb - G) * 1000))
best = None
rng = np.arange(-0.012, 0.0121, 0.002)
for sx in rng:
    for sy in rng:
        for sz in rng:
            g = c1 + np.array([sx, sy, sz])
            d1 = np.linalg.norm(c1 - g)
            worst = d1
            for r in (0.04, 0.045, 0.05):
                m = np.linalg.norm(co - g, axis=1) < r
                if m.sum() < 10: worst = 9; break
                worst = max(worst, np.linalg.norm(co[m].mean(0) - g))
            if best is None or worst < best[0]: best = (worst, g.copy(), d1)
log("BEST worst=%.2f mm at G=%s (centroid dist %.2f mm)" % (best[0] * 1000, np.round(best[1], 5).tolist(), best[2] * 1000))
