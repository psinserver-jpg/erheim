"""블렌더 단계 스크립트들이 같이 쓰는 도우미.

모든 단계는 창 없이(-b) 실행되고, 끝날 때 blender/current.blend 를 덮어 저장한다.
"""
import bpy, os, sys, math, json, time
import numpy as np
from mathutils import Vector, Matrix, Quaternion, Euler

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
BLEND = os.path.join(ROOT, "blender", "current.blend")
RENDERS = os.path.join(ROOT, "blender", "renders")
DIAG = os.path.join(ROOT, "blender", "diag")
os.makedirs(RENDERS, exist_ok=True)
os.makedirs(DIAG, exist_ok=True)


def log(*a):
    print("[RIG]", *a, flush=True)


def script_args():
    argv = sys.argv
    return argv[argv.index("--") + 1:] if "--" in argv else []


def save_blend(path=BLEND):
    bpy.ops.wm.save_as_mainfile(filepath=path, compress=True, copy=False)
    log("saved", os.path.relpath(path, ROOT), "%.1f MB" % (os.path.getsize(path) / 1e6))


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def deselect_all():
    bpy.context.view_layer.update()
    for o in list(bpy.context.view_layer.objects):
        if o is not None:
            try:
                o.select_set(False)
            except Exception:
                pass


def set_active(obj):
    deselect_all()
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj


def mesh_world_verts(obj, depsgraph=None, deformed=False):
    """메시 정점의 월드 좌표 (N,3). deformed=True면 모디파이어(스킨) 적용 결과."""
    if deformed:
        dg = depsgraph or bpy.context.evaluated_depsgraph_get()
        ev = obj.evaluated_get(dg)
        me = ev.to_mesh()
        n = len(me.vertices)
        co = np.empty(n * 3, dtype=np.float32)
        me.vertices.foreach_get("co", co)
        co = co.reshape(n, 3)
        M = np.array(ev.matrix_world, dtype=np.float64)
        ev.to_mesh_clear()
    else:
        me = obj.data
        n = len(me.vertices)
        co = np.empty(n * 3, dtype=np.float32)
        me.vertices.foreach_get("co", co)
        co = co.reshape(n, 3)
        M = np.array(obj.matrix_world, dtype=np.float64)
    co = co.astype(np.float64)
    return co @ M[:3, :3].T + M[:3, 3]


def mesh_edges(obj):
    me = obj.data
    e = np.empty(len(me.edges) * 2, dtype=np.int32)
    me.edges.foreach_get("vertices", e)
    return e.reshape(-1, 2)


def mesh_tris(obj):
    me = obj.data
    me.calc_loop_triangles()
    t = np.empty(len(me.loop_triangles) * 3, dtype=np.int32)
    me.loop_triangles.foreach_get("vertices", t)
    return t.reshape(-1, 3)


# ----------------------------------------------------------------------------
# 렌더 도우미 (진단용 + 최종용)
# ----------------------------------------------------------------------------

def ensure_world(color=(0.05, 0.05, 0.06), strength=1.0):
    w = bpy.data.worlds.get("RigWorld") or bpy.data.worlds.new("RigWorld")
    w.use_nodes = True
    nt = w.node_tree
    bg = nt.nodes.get("Background")
    if bg is None:
        nt.nodes.clear()
        bg = nt.nodes.new("ShaderNodeBackground")
        out = nt.nodes.new("ShaderNodeOutputWorld")
        nt.links.new(bg.outputs[0], out.inputs[0])
    bg.inputs[0].default_value = (*color, 1.0)
    bg.inputs[1].default_value = strength
    bpy.context.scene.world = w
    return w


def make_cam(name="DiagCam"):
    cam = bpy.data.objects.get(name)
    if cam is None:
        cd = bpy.data.cameras.new(name)
        cam = bpy.data.objects.new(name, cd)
        bpy.context.scene.collection.objects.link(cam)
    return cam


def look_at(obj, target, up=Vector((0, 0, 1))):
    d = (Vector(target) - obj.location).normalized()
    q = d.to_track_quat('-Z', 'Y')
    obj.rotation_euler = q.to_euler()


def setup_diag_lights():
    names = []
    specs = [("DiagSunKey", (math.radians(55), 0, math.radians(35)), 3.0),
             ("DiagSunFill", (math.radians(60), 0, math.radians(-120)), 1.2),
             ("DiagSunBack", (math.radians(-50), 0, math.radians(180)), 1.0)]
    for nm, rot, e in specs:
        ob = bpy.data.objects.get(nm)
        if ob is None:
            ld = bpy.data.lights.new(nm, 'SUN')
            ob = bpy.data.objects.new(nm, ld)
            bpy.context.scene.collection.objects.link(ob)
        ob.data.energy = e
        ob.rotation_euler = rot
        names.append(nm)
    return names


def render_view(path, center, dist, azim_deg, elev_deg=0.0, ortho_scale=None, res=(900, 1200),
                engine='BLENDER_EEVEE', samples=16, transparent=False, lens=50, bg=(0.32, 0.33, 0.36)):
    """center 를 바라보는 카메라로 한 장 렌더. azim 0 = 정면(-Y 쪽에서 봄), 90 = 캐릭터 왼쪽(+X)에서 봄."""
    scn = bpy.context.scene
    cam = make_cam()
    az = math.radians(azim_deg); el = math.radians(elev_deg)
    c = Vector(center)
    off = Vector((math.sin(az) * math.cos(el) * dist, -math.cos(az) * math.cos(el) * dist, math.sin(el) * dist))
    cam.location = c + off
    look_at(cam, c)
    if ortho_scale:
        cam.data.type = 'ORTHO'; cam.data.ortho_scale = ortho_scale
    else:
        cam.data.type = 'PERSP'; cam.data.lens = lens
    cam.data.clip_start = 0.01; cam.data.clip_end = 500
    scn.camera = cam
    scn.render.engine = engine
    scn.render.resolution_x, scn.render.resolution_y = res
    scn.render.resolution_percentage = 100
    scn.render.film_transparent = transparent
    scn.render.image_settings.file_format = 'PNG'
    scn.render.image_settings.color_mode = 'RGBA' if transparent else 'RGB'
    if engine == 'CYCLES':
        scn.cycles.samples = samples
    else:
        try:
            scn.eevee.taa_render_samples = samples
        except Exception:
            pass
    ensure_world(bg, 1.0)
    scn.render.filepath = path
    bpy.ops.render.render(write_still=True)
    return path


def bbox_of(co):
    return co.min(axis=0), co.max(axis=0)


def load_cfg(tag):
    """캐릭터별 설정(blender/chars/<tag>.json)을 읽는다. 없으면 빈 설정."""
    p = os.path.join(ROOT, "blender", "chars", tag + ".json")
    cfg = json.load(open(p, encoding="utf-8")) if os.path.exists(p) else {}
    cfg.setdefault("tag", tag)
    return cfg


def cfg_blend(cfg):
    """이 캐릭터의 작업 파일 경로. 주인공은 blender/current.blend, 나머지는 blender/work/<tag>.blend."""
    rel = cfg.get("blend") or os.path.join("blender", "work", cfg["tag"] + ".blend")
    path = rel if os.path.isabs(rel) else os.path.join(ROOT, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    return path


def flag_args():
    """'--키=값' / '--키' 형태의 인자를 사전으로."""
    out = {}
    for a in script_args()[1:]:
        if a.startswith("--"):
            k, _, v = a[2:].partition("=")
            out[k] = v if v != "" else True
    return out
