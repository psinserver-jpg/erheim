"""3단계: 가중치(열 확산 방정식)를 직접 계산해 스킨을 입히고, 극단적인 시험 포즈로 늘어남을 잰다.

인자: <태그> [설정 json] [blend]
"""
import bpy, sys, os, json, math
sys.path.insert(0, os.path.dirname(__file__))
from common import *
import rigcore, rigpose

args = script_args()
tag = args[0] if args else "hero"
cfg = load_cfg(tag)
blend = cfg_blend(cfg)
wcfg = cfg.get("weights", {})

body = bpy.data.objects["Body"]
arm = bpy.data.objects["Armature"]
rigpose.reset_pose(arm)
bpy.context.view_layer.update()
J = {k: np.array(v) for k, v in json.loads(arm["rig_joints"]).items()}
H = float(arm["rig_height"])

t0 = time.time()
names, Wt, st = rigcore.compute_heat_weights(body, J, c_heat=wcfg.get("heat_c", 1.0), max_infl=4)
log("weights solved in %.1fs" % (time.time() - t0), json.dumps(st))
for bone, th in (wcfg.get("rigid") or {"hand.L": 0.7, "hand.R": 0.7, "head": 0.9}).items():
    n = rigcore.rigidify(names, Wt, bone, th)
    log("  rigid %-8s : %d verts snapped to 100%%" % (bone, n))
rigcore.apply_weights(body, arm, names, Wt)
dom = np.argmax(Wt, axis=1)
log("dominant-bone vertex counts:", ", ".join("%s=%d" % (names[j], int((dom == j).sum())) for j in range(len(names))))
infl = (Wt > 1e-5).sum(1)
log("influences per vertex: max %d, mean %.2f" % (infl.max(), infl.mean()))

rm = rigpose.RigMath(arm)
RA = rigpose.unit
rest_ank = rm.rest_ankle
def foot(s, dx=0.0, dy=0.0, dz=0.0, **kw):
    a = rest_ank[s]
    d = dict(pos=(a[0] + dx, a[1] + dy, a[2] + dz)); d.update(kw); return d

TESTS = {
    "T_arms": {"arm.L": {"upper": (1, 0, 0), "fore": (1, 0, 0)}, "arm.R": {"upper": (-1, 0, 0), "fore": (-1, 0, 0)}},
    "Y_arms": {"arm.L": {"upper": (0.5, 0, 0.87), "fore": (0.5, 0, 0.87)}, "arm.R": {"upper": (-0.5, 0, 0.87), "fore": (-0.5, 0, 0.87)},
               "shoulder.L": {"raise": 25}, "shoulder.R": {"raise": 25}},
    "fwd_bent": {"arm.L": {"upper": (0.2, -1, -0.1), "fore": (0.1, -0.3, 1)}, "arm.R": {"upper": (-0.2, -1, -0.1), "fore": (-0.1, -0.3, 1)}},
    "guard": {"arm.R": {"upper": (-0.3, -0.6, -0.7), "fore": (0.2, -0.9, 0.3)}, "hand.R": {"blade": (0.1, -0.3, 1)},
              "arm.L": {"upper": (0.25, 0.1, -1), "fore": (0.1, -0.5, -0.8)}},
    "overhead": {"arm.R": {"upper": (-0.3, 0.2, 1), "fore": (0.0, 0.6, 0.8)}, "hand.R": {"blade": (0, 0.9, 0.4)},
                 "shoulder.R": {"raise": 30}, "chest": {"pitch": -10}, "arm.L": {"upper": (0.4, -0.5, -0.6), "fore": (0, -1, 0.2)}},
    "lunge": {"hips": {"pos": (0, -0.25, -0.22), "pitch": 8}, "chest": {"pitch": 12},
              "foot.L": foot("L", dy=-0.55), "foot.R": foot("R", dy=0.45, dz=0.06, pitch=40, toe="flat")},
    "squat": {"hips": {"pos": (0, 0.06, -0.42), "pitch": 22}, "spine": {"pitch": 8}},
    "high_knee": {"foot.L": foot("L", dy=-0.28, dz=0.45, pitch=25), "hips": {"pitch": 6},
                  "arm.R": {"upper": (-0.2, -0.7, -0.6), "fore": (0, -0.8, 0.6)}, "arm.L": {"upper": (0.2, 0.6, -0.7), "fore": (0.2, 0.3, -0.9)}},
    "twist_bow": {"hips": {"pitch": 10}, "spine": {"yaw": 25, "pitch": 15}, "chest": {"yaw": 25, "pitch": 15}, "neck": {"yaw": -20}, "head": {"yaw": -30, "pitch": -10}},
    "kick": {"foot.R": foot("R", dy=-0.62, dz=0.52, pitch=30), "hips": {"pos": (0, 0.05, 0), "pitch": -8}, "foot.L": foot("L", yaw=15)},
    "side_bend": {"hips": {"roll": 8}, "spine": {"roll": 15}, "chest": {"roll": 15}, "head": {"roll": -15},
                  "arm.L": {"upper": (0.6, 0, 0.8), "fore": (-0.3, 0, 1)}, "foot.L": foot("L", dx=0.18)},
}

e, L0 = rigcore.rest_edge_lengths(body)
setup_diag_lights()
worst_all = 0.0
report = {}
for name, P in TESTS.items():
    rm.solve(P); rm.apply()
    bpy.context.view_layer.update()
    # 포즈 계산기 자체 검증: 블렌더가 계산한 뼈 머리 위치와 비교
    err = 0.0
    for bn in rm.order:
        hb = np.array(arm.pose.bones[bn].head)
        err = max(err, float(np.linalg.norm(hb - rm.pos[bn])))
    ratio, co = rigcore.stretch_now(body, e, L0)
    mx = float(ratio.max()); p999 = float(np.percentile(ratio, 99.9))
    worst_all = max(worst_all, mx)
    iw = int(np.argmax(ratio)); vw = e[iw, 0]
    wb = names[int(np.argmax(Wt[vw]))]
    report[name] = dict(max=round(mx, 3), p999=round(p999, 3), over2=int((ratio > 2).sum()), over3=int((ratio > 3).sum()),
                        worst_bone=wb, minz=round(float(co[:, 2].min()), 4), fk_err=round(err, 6), unreached=round(rm.unreached, 4))
    log("test %-10s stretch max %.3f  p99.9 %.3f  >2: %d  >3: %d  (worst near %s)  min z %.3f  fk_err %.1e  unreached %.3f" % (
        name, mx, p999, report[name]["over2"], report[name]["over3"], wb, co[:, 2].min(), err, rm.unreached))
    c = (0, 0, H * 0.5)
    for vn, az in (("f", 0), ("s", 70)):
        render_view(os.path.join(DIAG, f"{tag}_s03_{name}_{vn}.png"), c, 6.0, az, 8, ortho_scale=H * 1.35, res=(420, 520), samples=8)
log("WORST stretch over all test poses: %.3f (기준: 3.0 미만)" % worst_all)
json.dump(report, open(os.path.join(DIAG, f"{tag}_s03_report.json"), "w"), indent=1)

rigpose.reset_pose(arm)
bpy.context.view_layer.update()
save_blend(blend)
