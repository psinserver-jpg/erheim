"""4단계: 검과 방패를 직접 모델링해 손·팔뚝 소켓 뼈에 붙이고, 손잡이-손바닥 거리를 잰다.

인자: <태그> [blend]
"""
import bpy, sys, os, json, math
sys.path.insert(0, os.path.dirname(__file__))
from common import *
import rigcore, rigpose, gear
from rigpose import D

args = script_args()
tag = args[0] if args else "hero"
cfg = load_cfg(tag)
blend = cfg_blend(cfg)
gcfg = cfg.get("gear", {})

body = bpy.data.objects["Body"]; arm = bpy.data.objects["Armature"]
H = float(arm["rig_height"])
# 이전에 붙인 장비(뼈에 붙은 자식 오브젝트)는 지우고 다시 만든다
for o in list(bpy.data.objects):
    if o is body or o is arm:
        continue
    if (o.parent is arm and o.parent_type == 'BONE') or o.type == 'MESH':
        bpy.data.objects.remove(o, do_unlink=True)
for me_ in list(bpy.data.meshes):
    if me_.users == 0:
        bpy.data.meshes.remove(me_)
rigpose.reset_pose(arm); bpy.context.view_layer.update()

k = H / 1.8
sword = None; shield = None
if gcfg.get("module"):
    # 캐릭터 전용 장비 모듈: build(arm, body, k, gcfg) 가 오브젝트를 만들어 gear.parent_to_bone 으로 붙인다.
    # 오른손 무기 오브젝트 이름은 반드시 "Weapon" (원점 = 손잡이 중심, weapon.R 뼈에 부착)
    import importlib
    importlib.import_module(gcfg["module"]).build(arm, body, k, gcfg)
else:
    w = gcfg.get("weapon")
    if w and w.get("type", "sword") == "sword":
        sword = gear.make_sword("Weapon", scale=k * w.get("scale", 1.0), blade_len=w.get("blade_len", 1.02),
                                blade_w=w.get("blade_w", 0.082), guard_w=w.get("guard_w", 0.30))
        gear.parent_to_bone(sword, arm, "weapon.R")
    if gcfg.get("shield"):
        emblem = None
        ep = os.path.join(ROOT, "assets", "concept_codex", "shield_emblem.png")
        if os.path.exists(ep):
            emblem = bpy.data.images.load(ep); emblem.pack()
        shield = gear.make_shield("Shield", scale=k * gcfg.get("shield_scale", 1.0), emblem_image=emblem)
        gear.parent_to_bone(shield, arm, "shield.L")
bpy.context.view_layer.update()
sword = next((o for o in bpy.data.objects if o.parent is arm and o.parent_type == 'BONE' and o.parent_bone == "weapon.R"), None)
if sword is not None and sword.name != "Weapon":
    sword.name = "Weapon"
for o in bpy.data.objects:
    if o.parent is arm and o.parent_type == 'BONE':
        log("gear: %-8s on bone %-10s verts %d" % (o.name, o.parent_bone, len(o.data.vertices) if o.type == 'MESH' else 0))

palm = json.loads(body["palm_sets"])
rm = rigpose.RigMath(arm)
def measure(label):
    bpy.context.view_layer.update()
    if sword is None:
        return 0.0
    pp = rigcore.palm_point(body, palm["R"])
    gp = rigcore.grip_point(sword)
    d = float(np.linalg.norm(pp - gp))
    log("grip-palm distance [%s]: %.2f mm" % (label, d * 1000))
    return d
measure("rest")

POSES = {
    "guard": {"hips": {"yaw": -18}, "head": {"yaw": 18},
              "arm.R": {"upper": D(-25, -70), "fore": D(5, 10)}, "hand.R": {"blade": D(10, 62)},
              "arm.L": {"upper": D(40, -60), "fore": D(-40, 5)}, "hand.L": {"face": D(15, 0)}},
    "swing": {"chest": {"yaw": 30}, "arm.R": {"upper": D(30, -30), "fore": D(50, -40)}, "hand.R": {"blade": D(70, -45)},
              "arm.L": {"upper": D(60, -50), "fore": D(0, -10)}, "hand.L": {"face": D(40, 0)}},
    "raise": {"arm.R": {"upper": D(-20, 75), "fore": D(180, 70)}, "hand.R": {"blade": D(180, 25)}, "shoulder.R": {"raise": 25},
              "arm.L": {"upper": D(40, -60), "fore": D(-40, 5)}, "hand.L": {"face": D(15, 0)}},
}
setup_diag_lights()
e, L0 = rigcore.rest_edge_lengths(body)
for name, P in POSES.items():
    rm.solve(P); rm.apply()
    measure(name)
    ratio, co = rigcore.stretch_now(body, e, L0)
    bd = rm.blade_dir("R")
    log("  pose %-6s stretch max %.3f, blade dir %s" % (name, ratio.max(), np.round(bd, 2).tolist()))
    for vn, az, el in (("f", 0, 5), ("s", -70, 10), ("b", 150, 15)):
        render_view(os.path.join(DIAG, f"{tag}_s04_{name}_{vn}.png"), (0, 0, H * 0.55), 6.0, az, el, ortho_scale=H * 1.5, res=(560, 640), samples=16)
# 손 클로즈업(가드 자세)
rm.solve(POSES["guard"]); rm.apply(); bpy.context.view_layer.update()
gp = rigcore.grip_point(sword) if sword is not None else np.array(arm.pose.bones["hand.R"].head)
for i, (az, el) in enumerate(((0, 0), (-90, 0), (180, 10), (-40, 40))):
    render_view(os.path.join(DIAG, f"{tag}_s04_grip_{i}.png"), tuple(gp), 1.2, az, el, ortho_scale=0.34 * k, res=(520, 520), samples=16)
rigpose.reset_pose(arm); bpy.context.view_layer.update()
save_blend(blend)
