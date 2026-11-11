"""7단계: 광고용 주인공 렌더(전신, 검을 든 자세, 단색 배경) → blender/renders/hero_ad.png

작업 파일(blender/current.blend)을 열어 광고 자세를 잡고 조명·카메라를 만든 뒤 Cycles 로 렌더한다.
인자: <태그> [--w=1800] [--h=2400] [--samples=320] [--out=경로] [--preview]
"""
import bpy, sys, os, json, math
sys.path.insert(0, os.path.dirname(__file__))
from common import *
import rigpose
from rigpose import D

args = script_args()
tag = args[0] if args else "hero"
cfg = load_cfg(tag)
opt = flag_args()
W = int(opt.get("w", 1800)); Hpx = int(opt.get("h", 2400)); SAMPLES = int(opt.get("samples", 320))
out = opt.get("out", os.path.join(RENDERS, "hero_ad.png"))
if not os.path.isabs(out):
    out = os.path.join(ROOT, out)
BG = (0.014, 0.020, 0.045)          # 단색 배경(짙은 남색)

scn = bpy.context.scene
body = bpy.data.objects["Body"]; arm = bpy.data.objects["Armature"]
H = float(arm["rig_height"]); k = H / 1.8
for o in list(bpy.data.objects):
    if o.name.startswith(("Diag", "Ad")):
        bpy.data.objects.remove(o, do_unlink=True)

# ---- 광고 자세 (애니메이션은 잠시 떼고 포즈를 직접 계산)
if arm.animation_data:
    arm.animation_data.action = None
    for tr in arm.animation_data.nla_tracks:
        tr.mute = True
rigpose.reset_pose(arm)
rm = rigpose.RigMath(arm)
ra = rm.rest_ankle
P = {
    "hips": {"pos": (0.0, 0.0, -0.035 * k), "yaw": -16, "pitch": 1, "roll": -1.5},
    "spine": {"yaw": -4, "pitch": -2, "roll": 1}, "chest": {"yaw": -6, "pitch": -6, "roll": 1.5},
    "neck": {"yaw": 12, "pitch": -2, "roll": 0}, "head": {"yaw": 20, "pitch": -4, "roll": -2},
    "shoulder.L": {"raise": 2, "fwd": 6}, "shoulder.R": {"raise": 8, "fwd": -4},
    "arm.R": {"upper": D(-66, -34), "fore": D(-52, 26)}, "hand.R": {"blade": D(-36, 66)},
    "arm.L": {"upper": D(50, -58), "fore": D(-24, 14)}, "hand.L": {"face": D(8, 6)},
    "foot.L": {"pos": (0.17 * k, -0.13 * k, ra["L"][2]), "yaw": 14}, "foot.R": {"pos": (-0.23 * k, 0.15 * k, ra["R"][2]), "yaw": -32},
}
for it in range(12):                      # 발이 땅을 뚫지 않게 보정
    rm.solve(P); rm.apply(); bpy.context.view_layer.update()
    co = mesh_world_verts(body, None, deformed=True)
    mn = float(co[:, 2].min())
    if mn >= 0:
        break
    hp = P["hips"]["pos"]; P["hips"]["pos"] = (hp[0], hp[1], hp[2] - mn + 3e-4)
    for s in ("L", "R"):
        p = P["foot." + s]["pos"]; P["foot." + s]["pos"] = (p[0], p[1], p[2] - mn + 3e-4)
log("ad pose set; min z %.4f; blade dir %s" % (mn, np.round(rm.blade_dir("R"), 2).tolist()))

# 검 문양을 은은하게 빛나게
m = bpy.data.materials.get("SwordRune")
if m:
    b = m.node_tree.nodes.get("Principled BSDF")
    b.inputs["Emission Strength"].default_value = 3.0

# ---- 월드: 카메라에는 단색, 반사·간접광에는 부드러운 그러데이션
w = bpy.data.worlds.get("AdWorld") or bpy.data.worlds.new("AdWorld")
w.use_nodes = True
nt = w.node_tree; nt.nodes.clear()
outn = nt.nodes.new("ShaderNodeOutputWorld")
mix = nt.nodes.new("ShaderNodeMixShader")
lp = nt.nodes.new("ShaderNodeLightPath")
bg_cam = nt.nodes.new("ShaderNodeBackground"); bg_cam.inputs[0].default_value = (*BG, 1); bg_cam.inputs[1].default_value = 1.0
bg_env = nt.nodes.new("ShaderNodeBackground"); bg_env.inputs[1].default_value = 1.0
tc = nt.nodes.new("ShaderNodeTexCoord"); sep = nt.nodes.new("ShaderNodeSeparateXYZ")
ramp = nt.nodes.new("ShaderNodeValToRGB")
ramp.color_ramp.elements[0].position = 0.35; ramp.color_ramp.elements[0].color = (0.010, 0.014, 0.03, 1)
ramp.color_ramp.elements[1].position = 0.95; ramp.color_ramp.elements[1].color = (0.20, 0.26, 0.42, 1)
mapr = nt.nodes.new("ShaderNodeMapRange"); mapr.inputs[1].default_value = -1; mapr.inputs[2].default_value = 1
nt.links.new(tc.outputs["Generated"], sep.inputs[0]); nt.links.new(sep.outputs["Z"], mapr.inputs[0])
nt.links.new(mapr.outputs[0], ramp.inputs[0]); nt.links.new(ramp.outputs[0], bg_env.inputs[0])
nt.links.new(lp.outputs["Is Camera Ray"], mix.inputs[0])
nt.links.new(bg_env.outputs[0], mix.inputs[1]); nt.links.new(bg_cam.outputs[0], mix.inputs[2])
nt.links.new(mix.outputs[0], outn.inputs[0])
scn.world = w

# ---- 카메라 (캐릭터의 오른쪽 앞, 살짝 아래에서 올려다봄)
cam_d = bpy.data.cameras.new("AdCam"); cam = bpy.data.objects.new("AdCam", cam_d)
scn.collection.objects.link(cam)
cam_d.lens = 85; cam_d.sensor_width = 36; cam_d.clip_start = 0.1; cam_d.clip_end = 100
az = math.radians(-24); el = math.radians(-3); dist = 6.9 * k
target = Vector((-0.20 * k, 0.0, 1.27 * k))
cam.location = target + Vector((math.sin(az) * math.cos(el) * dist, -math.cos(az) * math.cos(el) * dist, math.sin(el) * dist))
look_at(cam, target)
scn.camera = cam

def area(name, loc, target, power, size, color=(1, 1, 1), spread=math.radians(120)):
    ld = bpy.data.lights.new(name, 'AREA'); ld.energy = power; ld.size = size; ld.color = color; ld.shape = 'DISK'
    try:
        ld.spread = spread
    except Exception:
        pass
    ob = bpy.data.objects.new(name, ld); scn.collection.objects.link(ob)
    ob.location = Vector(loc) * k
    look_at(ob, Vector(target) * k)
    return ob

# 카메라는 -Y, -X(캐릭터의 오른쪽) 쪽에 있다
area("AdKey", (-3.0, -4.4, 3.4), (0, 0, 1.25), 540, 2.8, (1.0, 0.95, 0.88))
area("AdFill", (3.6, -3.4, 1.4), (0, 0, 1.0), 95, 3.5, (0.72, 0.82, 1.0))
area("AdRimL", (3.0, 3.6, 2.6), (0, 0, 1.3), 420, 1.6, (0.55, 0.72, 1.0), math.radians(70))
area("AdRimR", (-3.6, 3.2, 2.2), (0, 0, 1.2), 340, 1.6, (1.0, 0.82, 0.62), math.radians(70))
area("AdTop", (0.0, 0.4, 5.0), (0, 0, 1.2), 110, 2.0, (0.9, 0.95, 1.0))
area("AdKick", (-0.6, -3.0, 0.25), (0, 0, 0.9), 32, 2.0, (0.6, 0.7, 1.0))

# 바닥: 그림자만 받는 평면(배경은 단색 그대로)
pm = bpy.data.meshes.new("AdFloorMesh")
s = 30.0
pm.from_pydata([(-s, -s, 0), (s, -s, 0), (s, s, 0), (-s, s, 0)], [], [(0, 1, 2, 3)])
floor = bpy.data.objects.new("AdFloor", pm); scn.collection.objects.link(floor)
floor.is_shadow_catcher = True

# ---- 렌더 설정
scn.render.engine = 'CYCLES'
scn.render.resolution_x = W; scn.render.resolution_y = Hpx; scn.render.resolution_percentage = 100
scn.render.film_transparent = True
scn.render.image_settings.file_format = 'PNG'; scn.render.image_settings.color_mode = 'RGBA'; scn.render.image_settings.color_depth = '16'
scn.cycles.samples = SAMPLES
scn.cycles.use_denoising = True
scn.cycles.use_adaptive_sampling = True
scn.cycles.max_bounces = 8
DEVICE = str(opt.get("device", "CPU")).upper()
if DEVICE == "GPU":
    try:
        prefs = bpy.context.preferences.addons["cycles"].preferences
        prefs.compute_device_type = 'METAL'
        prefs.get_devices()
        for d in prefs.devices:
            d.use = True
        scn.cycles.device = 'GPU'
    except Exception as ex:
        log("GPU 설정 실패, CPU 사용:", ex); scn.cycles.device = 'CPU'
else:
    scn.cycles.device = 'CPU'     # 창 없는 실행에서 Metal GPU 렌더가 비정상 종료해 CPU 를 기본으로 쓴다
log("cycles device:", scn.cycles.device)
try:
    scn.view_settings.view_transform = 'AgX'
except Exception as ex:
    log("view transform note:", ex)
for cand in ("AgX - Punchy", "Punchy", "AgX - Medium High Contrast", "Medium High Contrast"):
    try:
        scn.view_settings.look = cand
        break
    except Exception:
        continue
log("view transform %s, look %s" % (scn.view_settings.view_transform, scn.view_settings.look))
scn.view_settings.exposure = float(opt.get("exposure", 0.0))

tmp = os.path.join(ROOT, "_work", "ad_rgba.png")
scn.render.filepath = tmp
t0 = time.time()
bpy.ops.render.render(write_still=True)
# 투명 배경 렌더(그림자 포함)를 단색 배경 위에 합성한다 → 배경은 정확히 한 가지 색
img = bpy.data.images.load(tmp)
w_, h_ = img.size
px = np.empty(w_ * h_ * 4, dtype=np.float32); img.pixels.foreach_get(px); px = px.reshape(h_, w_, 4)
BG_DISPLAY = np.array([14, 19, 36], dtype=np.float32) / 255.0      # 화면 표시 기준 단색(짙은 남색)
a = px[:, :, 3:4]
comp = np.ones((h_, w_, 4), dtype=np.float32)
comp[:, :, :3] = BG_DISPLAY * (1.0 - a) + px[:, :, :3] * a
res = bpy.data.images.new("ad_comp", w_, h_, alpha=False)
res.pixels.foreach_set(comp.ravel())
res.filepath_raw = out; res.file_format = 'PNG'
scn.render.image_settings.color_mode = 'RGB'; scn.render.image_settings.color_depth = '8'
res.save_render(out, scene=None) if False else res.save()
log("rendered %s (%dx%d, %d samples) in %.1fs" % (os.path.relpath(out, ROOT), W, Hpx, SAMPLES, time.time() - t0))

# 광고 장면(조명·카메라·자세)을 작업 파일에 남긴다 — 녹화/재현용
if not opt.get("preview"):
    save_blend(cfg_blend(cfg))
