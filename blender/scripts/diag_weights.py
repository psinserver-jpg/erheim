"""진단: 가중치를 뼈별 색으로 칠해 렌더하고, 시험 포즈에서 가장 많이 늘어난 모서리의 정체를 출력한다. (저장 안 함)
인자: <태그>
"""
import bpy, sys, os, json, colorsys
sys.path.insert(0, os.path.dirname(__file__))
from common import *
import rigcore, rigpose

tag = script_args()[0] if script_args() else "hero"
body = bpy.data.objects["Body"]; arm = bpy.data.objects["Armature"]
H = float(arm["rig_height"])
names = rigcore.DEFORM_BONES
me = body.data
n = len(me.vertices)
Wt = np.zeros((n, len(names)))
gi = {vg.index: names.index(vg.name) for vg in body.vertex_groups if vg.name in names}
for v in me.vertices:
    for g in v.groups:
        if g.group in gi:
            Wt[v.index, gi[g.group]] = g.weight
co = mesh_world_verts(body)

# 뼈별 색
cols = np.array([colorsys.hsv_to_rgb((j * 0.381966) % 1.0, 0.85 if j % 2 else 0.6, 1.0 if j % 3 else 0.7) for j in range(len(names))])
vc = Wt @ cols
attr = me.color_attributes.get("wcol") or me.color_attributes.new("wcol", 'FLOAT_COLOR', 'POINT')
buf = np.ones((n, 4), dtype=np.float32); buf[:, :3] = vc
attr.data.foreach_set("color", buf.ravel())
mat = bpy.data.materials.new("WeightViz"); mat.use_nodes = True
nt = mat.node_tree; nt.nodes.clear()
a = nt.nodes.new("ShaderNodeVertexColor"); a.layer_name = "wcol"
em = nt.nodes.new("ShaderNodeEmission"); out = nt.nodes.new("ShaderNodeOutputMaterial")
nt.links.new(a.outputs[0], em.inputs[0]); nt.links.new(em.outputs[0], out.inputs[0])
orig = [m for m in me.materials]
me.materials.clear(); me.materials.append(mat)
setup_diag_lights()
c = (0, 0, H * 0.5)
for nm, az in (("front", 0), ("left", 90), ("back", 180)):
    render_view(os.path.join(DIAG, f"{tag}_wviz_{nm}.png"), c, 6.0, az, 0, ortho_scale=H * 1.12, res=(720, 960), samples=8)

# T 포즈에서 최악 모서리 분석
rm = rigpose.RigMath(arm)
P = {"arm.L": {"upper": (1, 0, 0), "fore": (1, 0, 0)}, "arm.R": {"upper": (-1, 0, 0), "fore": (-1, 0, 0)}}
rm.solve(P); rm.apply(); bpy.context.view_layer.update()
e, L0 = rigcore.rest_edge_lengths(body)
rigpose.reset_pose(arm); bpy.context.view_layer.update()
e, L0 = rigcore.rest_edge_lengths(body)
rm.solve(P); rm.apply(); bpy.context.view_layer.update()
ratio, cd = rigcore.stretch_now(body, e, L0)
order = np.argsort(-ratio)[:14]
for k in order:
    i, j = e[k]
    def top(v):
        idx = np.argsort(-Wt[v])[:4]
        return " ".join("%s:%.2f" % (names[t], Wt[v, t]) for t in idx if Wt[v, t] > 0.01)
    log("edge ratio %.1f  L0 %.4f | v%d %s [%s] | v%d %s [%s]" % (ratio[k], L0[k], i, np.round(co[i], 3).tolist(), top(i), j, np.round(co[j], 3).tolist(), top(j)))
bad = ratio > 3
vb = np.unique(e[bad].ravel())
log("verts on >3x edges: %d ; bbox %s .. %s" % (len(vb), np.round(co[vb].min(0), 3).tolist(), np.round(co[vb].max(0), 3).tolist()))
# 손/팔 뼈 가중치를 가진 정점이 몸통 근처에 얼마나 있나
armb = [names.index(b) for b in names if b.startswith(("upper_arm", "forearm", "hand"))]
aw = Wt[:, armb].sum(1)
near_torso = (np.abs(co[:, 0]) < 0.30) & (co[:, 2] < 1.05)
log("arm-weighted (>0.05) verts with |x|<0.30 and z<1.05: %d" % int(((aw > 0.05) & near_torso).sum()))
