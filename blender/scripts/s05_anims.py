"""5단계: 동작을 프레임마다 계산해 블렌더 액션으로 굽는다(30fps). 땅 뚫림은 굽는 동안 자동 보정한다.

인자: <태그> [blend] [--sheets]
"""
import bpy, sys, os, json, math
sys.path.insert(0, os.path.dirname(__file__))
from common import *
import rigcore, rigpose, anims

args = script_args()
tag = args[0] if args else "hero"
cfg = load_cfg(tag)
blend = cfg_blend(cfg)
make_sheets = "--sheets" in args
only = [a.split("=", 1)[1].split(",") for a in args if a.startswith("--only=")]
only = only[0] if only else None
FPS = 30

body = bpy.data.objects["Body"]; arm = bpy.data.objects["Armature"]
sword = next((o for o in bpy.data.objects if o.parent is arm and o.parent_type == 'BONE' and o.parent_bone == "weapon.R"), None)
H = float(arm["rig_height"])
scn = bpy.context.scene
scn.render.fps = FPS
bpy.context.preferences.edit.keyframe_new_interpolation_type = 'LINEAR'
rigpose.reset_pose(arm); bpy.context.view_layer.update()

names = rigcore.DEFORM_BONES
me = body.data
nv = len(me.vertices)
Wt = np.zeros((nv, len(names)))
gi = {vg.index: names.index(vg.name) for vg in body.vertex_groups if vg.name in names}
for v in me.vertices:
    for g in v.groups:
        if g.group in gi:
            Wt[v.index, gi[g.group]] = g.weight
foot_sets = {}
for s in ("L", "R"):
    w = Wt[:, names.index("foot." + s)] + Wt[:, names.index("toe." + s)]
    foot_sets[s] = np.flatnonzero(w > 0.5)
allfeet = np.zeros(nv, dtype=bool)
for s in ("L", "R"):
    allfeet[foot_sets[s]] = True
body_set = np.flatnonzero(~allfeet)
palm = json.loads(body["palm_sets"])
e, L0 = rigcore.rest_edge_lengths(body)

rm = rigpose.RigMath(arm)
import importlib
acfg = cfg.get("anim", {})
clips = getattr(importlib.import_module(acfg.get("module", "anims")), acfg.get("set", "knight_set"))(rm)
KEY_BONES = ["root"] + names


def new_action(name):
    old = bpy.data.actions.get(name)
    if old:
        bpy.data.actions.remove(old)
    act = bpy.data.actions.new(name)
    ad = arm.animation_data or arm.animation_data_create()
    ad.action = act
    try:
        slot = act.slots[0] if len(act.slots) else act.slots.new(id_type='OBJECT', name=arm.name)
        ad.action_slot = slot
    except Exception as ex:
        log("slot api note:", ex)
    act.use_fake_user = True
    return act


def raise_foot(P, s, dz):
    f = P.setdefault("foot." + s, {})
    if "ball" in f:
        b = f["ball"]; f["ball"] = (b[0], b[1], b[2] + dz)
    else:
        p = f.get("pos", tuple(rm.rest_ankle[s]))
        f["pos"] = (p[0], p[1], p[2] + dz)


def solve_clamped(P):
    """포즈를 풀고, 발/몸이 땅(z=0) 아래로 내려가면 올려서 다시 푼다. settle>0 이면 누운 몸을 땅에 내려놓는다."""
    EPS = 3e-4
    def ev():
        rm.solve(P); rm.apply()
        bpy.context.view_layer.update()
        return mesh_world_verts(body, None, deformed=True)
    def shift_all(dz):
        hp = P.setdefault("hips", {})
        p = hp.get("pos", (0, 0, 0)); hp["pos"] = (p[0], p[1], p[2] + dz)
        raise_foot(P, "L", dz); raise_foot(P, "R", dz)
    co = ev()
    settle = float(P.get("settle", 0.0))
    if settle > 1e-3:
        # 누운 몸통(발 제외)이 땅에 닿도록 골반만 내린다. 발은 아래의 보정이 따로 맞춘다.
        mb = float(co[body_set, 2].min())
        if mb > EPS:
            hp = P.setdefault("hips", {})
            p = hp.get("pos", (0, 0, 0)); hp["pos"] = (p[0], p[1], p[2] - (mb - EPS) * settle)
            co = ev()
    it = 0
    for it in range(24):
        changed = False
        for s in ("L", "R"):
            mz = float(co[foot_sets[s], 2].min())
            if mz < 0.0:
                raise_foot(P, s, -mz * 1.1 + EPS); changed = True
        mb = float(co[body_set, 2].min())
        if mb < 0.0:
            shift_all(-mb + EPS); changed = True
        if not changed:
            return co, it
        co = ev()
    mn = float(co[:, 2].min())
    if mn < 0.0:                       # 마지막 안전장치: 전체를 통째로 올린다
        shift_all(-mn + EPS)
        co = ev()
    return co, it + 1


meta = json.loads(arm["anim_meta"]) if (only and "anim_meta" in arm) else {}
t_all = time.time()
for cname, cd in clips.items():
    if only and cname not in only:
        continue
    N = int(round(cd["duration"] * FPS))
    act = new_action(cname)
    prev = None
    st = dict(max_stretch=0.0, min_foot_z=1e9, min_body_z=1e9, max_grip=0.0, clamp_iters=0, unreached=0.0)
    for f in range(N + 1):
        t = f / FPS
        if cd.get("loop") and f == N:
            t = 0.0
        P = cd["fn"](t)
        co, iters = solve_clamped(P)
        prev = rm.apply(frame_no=None, prev_q=prev)
        pbs = arm.pose.bones
        for bn in KEY_BONES:
            pb = pbs[bn]
            pb.keyframe_insert("rotation_quaternion", frame=f)
            if bn == "hips":
                pb.keyframe_insert("location", frame=f)
        L = np.linalg.norm(co[e[:, 0]] - co[e[:, 1]], axis=1)
        ok = L0 > 1e-4
        st["max_stretch"] = max(st["max_stretch"], float((L[ok] / L0[ok]).max()))
        st["min_foot_z"] = min(st["min_foot_z"], float(min(co[foot_sets["L"], 2].min(), co[foot_sets["R"], 2].min())))
        st["min_body_z"] = min(st["min_body_z"], float(co[body_set, 2].min()))
        st["clamp_iters"] = max(st["clamp_iters"], iters)
        st["unreached"] = max(st["unreached"], rm.unreached)
        if sword is not None:
            pp = co[np.asarray(palm["R"], dtype=int)].mean(0)
            gp = rigcore.grip_point(sword)
            st["max_grip"] = max(st["max_grip"], float(np.linalg.norm(pp - gp)))
    try:
        act.use_frame_range = True
        act.frame_start = 0; act.frame_end = N
    except Exception:
        pass
    meta[cname] = dict(frames=N, duration=round(N / FPS, 4), loop=bool(cd.get("loop")), events=cd.get("events", {}))
    log("clip %-8s %2d frames (%.2fs)%s | stretch max %.3f | foot min z %+.4f | body min z %+.4f | grip-palm %.2f mm | clamp it %d | unreached %.3f" % (
        cname, N, N / FPS, " loop" if cd.get("loop") else "     ", st["max_stretch"], st["min_foot_z"], st["min_body_z"], st["max_grip"] * 1000,
        st["clamp_iters"], st["unreached"]))
log("baked %d clips in %.1fs" % (len(meta), time.time() - t_all))
arm["anim_meta"] = json.dumps(meta)

# 기본 액션은 idle 로 두고 0프레임 자세로 저장
if "idle" in bpy.data.actions:
    arm.animation_data.action = bpy.data.actions["idle"]
    try:
        arm.animation_data.action_slot = bpy.data.actions["idle"].slots[0]
    except Exception:
        pass
scn.frame_start = 0; scn.frame_end = 72
scn.frame_set(0)
save_blend(blend)

if make_sheets:
    setup_diag_lights()
    for cname, m in meta.items():
        act = bpy.data.actions[cname]
        arm.animation_data.action = act
        try:
            arm.animation_data.action_slot = act.slots[0]
        except Exception:
            pass
        N = m["frames"]
        big = cname in acfg.get("big_clips", ["skill1", "skill2", "skill3"])
        if only and cname not in only:
            continue
        views = [("q", 32, 12), ("s", 90, 4)]
        nfr = 8
        for vn, az, el in views:
            for i in range(nfr):
                f = int(round(i * N / (nfr - (0 if m["loop"] else 1)))) if nfr > 1 else 0
                f = min(f, N)
                scn.frame_set(f)
                cz = H * (0.72 if big else 0.52)
                render_view(os.path.join(DIAG, f"{tag}_anim_{cname}_{vn}_{i}.png"), (0, -0.05, cz), 7.0, az, el,
                            ortho_scale=H * (2.25 if big else 1.6), res=(300, 380), samples=8)
    scn.frame_set(0)
    log("sheets rendered")
