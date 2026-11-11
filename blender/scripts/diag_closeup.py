"""진단용 클로즈업 렌더. (작업 파일은 저장하지 않는다)
인자: <출력 접두어> <cx> <cy> <cz> <ortho_scale> <azim,elev> [<azim,elev> ...]
"""
import bpy, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from common import *

a = script_args()
prefix = a[0]
c = (float(a[1]), float(a[2]), float(a[3]))
scale = float(a[4])
setup_diag_lights()
for i, spec in enumerate(a[5:]):
    parts = [float(t) for t in spec.split(",")]
    az, el = parts[0], parts[1]
    dist = parts[2] if len(parts) > 2 else 5.0
    p = os.path.join(DIAG, f"{prefix}_{i}.png")
    render_view(p, c, dist, az, el, ortho_scale=scale, res=(640, 640))
    log("wrote", os.path.relpath(p, ROOT))
