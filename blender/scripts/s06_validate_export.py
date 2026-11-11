"""6단계: 구운 동작 전체를 블렌더 애니메이션 시스템으로 다시 재생하며 숫자 검사를 하고, 게임용 GLB를 내보낸다.

숫자 검사(모든 동작의 모든 프레임):
  1) 검 손잡이 중심 ↔ 손바닥(주먹 속 정점들의 변형 후 중심) 거리 < 1 cm
  2) 모든 모서리의 늘어남(변형 후 길이 / 원래 길이) < 3 배
  3) 발(발·발가락 뼈에 붙은 정점)의 최저 높이 >= 0 (땅을 뚫지 않음)
인자: <태그> [--tex=2048] [--lod=0.25] [--noexport]
"""
import bpy, sys, os, json, math
sys.path.insert(0, os.path.dirname(__file__))
from common import *
import rigcore, rigpose

args = script_args()
tag = args[0] if args else "hero"
cfg = load_cfg(tag)
BLEND_PATH = cfg_blend(cfg)
opt = flag_args()
ecfg = cfg.get("export", {})
TEX = int(opt.get("tex", ecfg.get("tex", 1024)))
LOD_RATIO = float(opt.get("lod", ecfg.get("lod", 1.0)))
out_dir = os.path.join(ROOT, "assets", "models")
os.makedirs(out_dir, exist_ok=True)

body = bpy.data.objects["Body"]; arm = bpy.data.objects["Armature"]
sword = next((o for o in bpy.data.objects if o.parent is arm and o.parent_type == 'BONE' and o.parent_bone == "weapon.R"), None); shield = bpy.data.objects.get("Shield")
scn = bpy.context.scene
H = float(arm["rig_height"])
meta = json.loads(arm["anim_meta"])
names = rigcore.DEFORM_BONES

def set_action(act):
    ad = arm.animation_data or arm.animation_data_create()
    ad.action = act
    try:
        if act is not None and len(act.slots):
            ad.action_slot = act.slots[0]
    except Exception:
        pass

# 뮤트된 NLA 가 검사에 섞이지 않게 먼저 비운다
if arm.animation_data:
    for tr in list(arm.animation_data.nla_tracks):
        arm.animation_data.nla_tracks.remove(tr)
set_action(None)
rigpose.reset_pose(arm); bpy.context.view_layer.update()

me = body.data
nv = len(me.vertices)
Wt = np.zeros((nv, len(names)))
gi = {vg.index: names.index(vg.name) for vg in body.vertex_groups if vg.name in names}
for v in me.vertices:
    for g in v.groups:
        if g.group in gi:
            Wt[v.index, gi[g.group]] = g.weight
foot_idx = np.flatnonzero((Wt[:, names.index("foot.L")] + Wt[:, names.index("toe.L")] +
                           Wt[:, names.index("foot.R")] + Wt[:, names.index("toe.R")]) > 0.5)
palm = json.loads(body["palm_sets"]) if "palm_sets" in body else None
e, L0 = rigcore.rest_edge_lengths(body)
okE = L0 > 1e-4
log("mesh: %d verts, %d edges (검사 대상 %d), foot verts %d, palm verts %s" % (
    nv, len(e), int(okE.sum()), len(foot_idx), len(palm["R"]) if palm else "-"))

report = {"tag": tag, "bones_total": len(arm.data.bones), "bones_deform": sum(1 for b in arm.data.bones if b.use_deform),
          "bone_names": [b.name for b in arm.data.bones], "clips": {}, "criteria": {"grip_palm_max_m": 0.01, "stretch_max": 3.0, "foot_min_z_m": 0.0}}
tot = dict(grip=0.0, stretch=0.0, foot=1e9, body=1e9, frames=0)
for cname, m in meta.items():
    act = bpy.data.actions[cname]
    set_action(act)
    st = dict(grip=0.0, stretch=0.0, stretch_p999=0.0, foot=1e9, body=1e9, grip_frame=0, stretch_frame=0, foot_frame=0)
    for f in range(m["frames"] + 1):
        scn.frame_set(f)
        co = mesh_world_verts(body, None, deformed=True)
        L = np.linalg.norm(co[e[:, 0]] - co[e[:, 1]], axis=1)
        r = L[okE] / L0[okE]
        mx = float(r.max())
        if mx > st["stretch"]:
            st["stretch"] = mx; st["stretch_frame"] = f
        st["stretch_p999"] = max(st["stretch_p999"], float(np.percentile(r, 99.9)))
        fz = float(co[foot_idx, 2].min())
        if fz < st["foot"]:
            st["foot"] = fz; st["foot_frame"] = f
        st["body"] = min(st["body"], float(co[:, 2].min()))
        if sword is not None and palm:
            d = float(np.linalg.norm(co[np.asarray(palm["R"], dtype=int)].mean(0) - rigcore.grip_point(sword)))
            if d > st["grip"]:
                st["grip"] = d; st["grip_frame"] = f
    report["clips"][cname] = dict(frames=m["frames"] + 1, duration=m["duration"], loop=m["loop"], events=m.get("events", {}),
                                  grip_palm_max_mm=round(st["grip"] * 1000, 3), stretch_max=round(st["stretch"], 3),
                                  stretch_p999=round(st["stretch_p999"], 3), foot_min_z_mm=round(st["foot"] * 1000, 3),
                                  body_min_z_mm=round(st["body"] * 1000, 3))
    tot["grip"] = max(tot["grip"], st["grip"]); tot["stretch"] = max(tot["stretch"], st["stretch"])
    tot["foot"] = min(tot["foot"], st["foot"]); tot["body"] = min(tot["body"], st["body"]); tot["frames"] += m["frames"] + 1
    log("check %-8s %3d frames | grip-palm max %.3f mm | stretch max %.3f (p99.9 %.3f) | foot min z %+.3f mm | body min z %+.3f mm" % (
        cname, m["frames"] + 1, st["grip"] * 1000, st["stretch"], st["stretch_p999"], st["foot"] * 1000, st["body"] * 1000))
passed = dict(grip=(tot["grip"] < 0.01) if sword is not None else None, stretch=tot["stretch"] < 3.0, foot=tot["foot"] >= -1e-6)
report["total"] = dict(frames=tot["frames"], grip_palm_max_mm=round(tot["grip"] * 1000, 3), stretch_max=round(tot["stretch"], 3),
                       foot_min_z_mm=round(tot["foot"] * 1000, 3), body_min_z_mm=round(tot["body"] * 1000, 3), passed=passed)
log("TOTAL %d frames | 검 손잡이-손바닥 최대 %.3f mm (기준 <10mm) %s | 최대 늘어남 %.3f배 (기준 <3) %s | 발 최저 %+.3f mm (기준 >=0) %s" % (
    tot["frames"], tot["grip"] * 1000, ("PASS" if passed["grip"] else "FAIL") if sword is not None else "(무기 없음)", tot["stretch"], "PASS" if passed["stretch"] else "FAIL",
    tot["foot"] * 1000, "PASS" if passed["foot"] else "FAIL"))
json.dump(report, open(os.path.join(ROOT, "blender", f"validation_{tag}.json"), "w"), indent=1, ensure_ascii=False)

# ---- NLA 트랙으로 정리(동작마다 트랙 하나) 후 작업 파일 저장
set_action(None)
ad = arm.animation_data
for cname in meta:
    act = bpy.data.actions[cname]
    tr = ad.nla_tracks.new(); tr.name = cname
    st = tr.strips.new(cname, 0, act)
    try:
        if len(act.slots):
            st.action_slot = act.slots[0]
    except Exception:
        pass
    tr.mute = True
rigpose.reset_pose(arm)
scn.frame_set(0)
if "idle" in bpy.data.actions:
    set_action(bpy.data.actions["idle"])
save_blend(BLEND_PATH)
if opt.get("noexport"):
    sys.exit(0)

# ---- 내보내기 (여기부터는 메모리에서만 바꾸고 저장하지 않는다)
set_action(None)
for tr in ad.nla_tracks:
    tr.mute = False
rigpose.reset_pose(arm); scn.frame_set(0)

def shrink_textures(obj, color_px, other_px):
    done = {}
    for mat in obj.data.materials:
        if not mat or not mat.use_nodes:
            continue
        for nd in mat.node_tree.nodes:
            if nd.type == 'TEX_IMAGE' and nd.image:
                img = nd.image
                px = color_px if img.colorspace_settings.name == 'sRGB' else other_px
                key = (img.name, px)
                if key not in done:
                    if max(img.size) > px:
                        c = img.copy(); c.scale(px, px); done[key] = c
                    else:
                        done[key] = img
                nd.image = done[key]

rna = bpy.ops.export_scene.gltf.get_rna_type().properties
def gltf_export(path, objs, animations, **extra):
    deselect_all()
    for o in objs:
        o.hide_set(False); o.select_set(True)
    bpy.context.view_layer.objects.active = arm
    kw = dict(filepath=path, export_format='GLB', use_selection=True, export_apply=False, export_yup=True,
              export_animations=animations, export_animation_mode='NLA_TRACKS', export_force_sampling=True,
              export_optimize_animation_size=False, export_anim_single_armature=True, export_reset_pose_bones=True,
              export_skins=True, export_all_influences=False, export_def_bones=False, export_morph=False,
              export_image_format='WEBP', export_image_quality=88, export_materials='EXPORT', export_cameras=False, export_lights=False,
              export_extras=False, export_texcoords=True, export_normals=True, export_tangents=False)
    kw.update(extra)
    kw = {k: v for k, v in kw.items() if k in rna or k == "filepath"}
    bpy.ops.export_scene.gltf(**kw)
    log("exported %s  %.2f MB" % (os.path.relpath(path, ROOT), os.path.getsize(path) / 1e6))

objs = [arm, body] + [o for o in bpy.data.objects if o.parent is arm and o.parent_type == 'BONE']
shrink_textures(body, TEX, TEX // 2)
if shield is not None:
    shrink_textures(shield, 512, 512)
gltf_export(os.path.join(out_dir, f"{tag}.glb"), objs, True)

# LOD(봇·원경용): 메시를 줄이고 텍스처도 줄인다. 동작은 본 모델의 것을 같은 뼈 이름으로 재사용한다.
if LOD_RATIO < 0.999:
    set_active(body)
    dec = body.modifiers.new("Decimate", 'DECIMATE')
    dec.ratio = LOD_RATIO
    dec.use_collapse_triangulate = True
    while body.modifiers[0].name != "Decimate":
        bpy.ops.object.modifier_move_up(modifier="Decimate")
    bpy.ops.object.modifier_apply(modifier="Decimate")
    shrink_textures(body, max(512, TEX // 2), max(256, TEX // 4))
    log("LOD mesh: %d verts, %d tris" % (len(body.data.vertices), len(mesh_tris(body))))
    gltf_export(os.path.join(out_dir, f"{tag}_lod.glb"), objs, False)

info = dict(tag=tag, height=H, clips={k: dict(duration=v["duration"], loop=v["loop"], events=v.get("events", {})) for k, v in meta.items()},
            bones=[b.name for b in arm.data.bones], sockets=dict(weapon="weapon.R", shield="shield.L"),
            sword_tip_y=float(sword["blade_tip_y"]) if sword is not None else None,
            sword_base_y=float(sword["blade_base_y"]) if sword is not None else None)
json.dump(info, open(os.path.join(out_dir, f"{tag}_meta.json"), "w"), indent=1, ensure_ascii=False)
log("meta written")
