"""직접 만든 동작 정의(키 포즈 + 보간 / 주기 함수). 인터넷 동작 파일이나 모션 라이브러리는 쓰지 않는다.

모든 동작은 '시간 t(초) → 포즈 사전 P' 함수다. P 의 형식은 rigpose.RigMath.solve 참고.
방향은 D(az, el): az 0=앞, +90=왼쪽, -90=오른쪽, 180=뒤 / el +90=위. 팔 방향은 가슴 기준.
"""
import math, copy
import numpy as np
from rigpose import D, unit

DIR_KEYS = {"upper", "fore", "blade", "edge", "face", "pole"}
PI = math.pi


def deep_merge(base, over):
    out = copy.deepcopy(base)
    for k, v in (over or {}).items():
        if isinstance(v, dict) and isinstance(out.get(k), dict):
            out[k] = deep_merge(out[k], v)
        else:
            out[k] = copy.deepcopy(v)
    return out


def _slerp(a, b, u):
    a = unit(a); b = unit(b)
    c = float(np.clip(a @ b, -1, 1))
    th = math.acos(c)
    if th < 1e-4:
        return tuple(a + (b - a) * u)
    if th > PI - 1e-3:
        # 정반대: 중간에 임의의 수직 방향을 거친다
        p = np.cross(a, (0, 0, 1))
        if np.linalg.norm(p) < 1e-3:
            p = np.cross(a, (1, 0, 0))
        p = unit(p)
        return tuple(a * math.cos(th * u) + p * math.sin(th * u))
    s = math.sin(th)
    return tuple(a * (math.sin((1 - u) * th) / s) + b * (math.sin(u * th) / s))


def _interp(a, b, u, key=None):
    if isinstance(a, dict) or isinstance(b, dict):
        a = a if isinstance(a, dict) else {}
        b = b if isinstance(b, dict) else {}
        out = {}
        for k in set(a) | set(b):
            if k in a and k in b:
                out[k] = _interp(a[k], b[k], u, k)
            else:
                out[k] = copy.deepcopy(a[k] if k in a else b[k])
        return out
    if isinstance(a, (int, float)) and not isinstance(a, bool) and isinstance(b, (int, float)) and not isinstance(b, bool):
        return a + (b - a) * u
    if isinstance(a, (tuple, list)) and isinstance(b, (tuple, list)) and len(a) == len(b):
        if key in DIR_KEYS:
            return _slerp(a, b, u)
        return tuple(x + (y - x) * u for x, y in zip(a, b))
    return copy.deepcopy(b if u >= 0.5 else a)


def ease(u, kind):
    u = max(0.0, min(1.0, u))
    if kind == "lin":
        return u
    if kind == "in":
        return u * u
    if kind == "in3":
        return u * u * u
    if kind == "out":
        return 1 - (1 - u) * (1 - u)
    if kind == "out3":
        return 1 - (1 - u) ** 3
    if kind == "back":            # 살짝 지나쳤다 돌아오는 느낌
        s = 1.4
        u1 = u - 1
        return u1 * u1 * ((s + 1) * u1 + s) + 1
    return u * u * (3 - 2 * u)     # "io"


class Keyed:
    """[(시간, 포즈, 이 키로 들어올 때의 가감속)] 목록을 보간하는 동작."""

    def __init__(self, keys):
        self.keys = [(float(t), P, (e if e else "io")) for (t, P, *rest) in keys for e in [rest[0] if rest else None]]
        self.duration = self.keys[-1][0]

    def __call__(self, t):
        ks = self.keys
        if t <= ks[0][0]:
            return copy.deepcopy(ks[0][1])
        for i in range(len(ks) - 1):
            t0, P0, _ = ks[i]
            t1, P1, e1 = ks[i + 1]
            if t <= t1:
                u = ease((t - t0) / max(t1 - t0, 1e-9), e1)
                return _interp(P0, P1, u)
        return copy.deepcopy(ks[-1][1])


def smooth01(u):
    u = max(0.0, min(1.0, u))
    return u * u * (3 - 2 * u)


# ----------------------------------------------------------------------------
# 기사(검 + 방패) 동작 세트
# ----------------------------------------------------------------------------

def knight_set(rm):
    k = rm.H / 1.8
    ra = rm.rest_ankle

    def F(s, x, y, lift=0.0, **kw):
        d = dict(pos=(x * k, y * k, ra[s][2] + lift * k))
        d.update(kw)
        return d

    # 전투 대기 자세: 왼발·방패를 앞에, 검은 오른쪽 앞에 세워 든다
    BASE = {
        "hips": {"pos": (0.0, 0.01 * k, -0.05 * k), "yaw": -22, "pitch": 3, "roll": 0},
        "spine": {"yaw": -3, "pitch": 3, "roll": 0}, "chest": {"yaw": -4, "pitch": 3, "roll": 0},
        "neck": {"yaw": 10, "pitch": -2, "roll": 0}, "head": {"yaw": 18, "pitch": -3, "roll": 0},
        "shoulder.L": {"raise": 0, "fwd": 4}, "shoulder.R": {"raise": 0, "fwd": 0},
        "arm.R": {"upper": D(-32, -66), "fore": D(6, 14)}, "hand.R": {"blade": D(16, 58)},
        "arm.L": {"upper": D(48, -60), "fore": D(-36, 10)}, "hand.L": {"face": D(24, 4)},
        "foot.L": F("L", 0.15, -0.17, yaw=8, pitch=0), "foot.R": F("R", -0.19, 0.19, yaw=-38, pitch=0),
        "knee.L": {"up": 0.0}, "knee.R": {"up": 0.0},
        "root_yaw": 0.0, "settle": 0.0,
    }
    M = lambda over: deep_merge(BASE, over)
    clips = {}

    # ---- 대기 (2.4초 반복): 호흡, 검 끝의 미세한 흔들림
    def idle(t):
        w = 2 * PI * t / 2.4
        b = math.sin(w); c = math.cos(w); b2 = math.sin(w + 0.9)
        return M({
            "hips": {"pos": (0.004 * k * c, 0.01 * k, (-0.05 + 0.007 * b) * k), "yaw": -22 + 0.8 * c},
            "spine": {"pitch": 3 - 0.8 * b}, "chest": {"pitch": 3 + 1.6 * b, "yaw": -4 - 0.6 * c},
            "head": {"yaw": 18 - 0.8 * c, "pitch": -3 - 0.8 * b2},
            "shoulder.L": {"raise": 1.5 * b + 1.5}, "shoulder.R": {"raise": 1.5 * b + 1.5},
            "arm.R": {"upper": D(-32, -66 + 0.8 * b), "fore": D(6 + 1.0 * c, 14 + 2.0 * b)},
            "hand.R": {"blade": D(16 + 2.5 * c, 58 + 2.5 * b2)},
            "arm.L": {"upper": D(48, -60 + 0.8 * b), "fore": D(-36, 10 + 1.5 * b2)},
        })
    clips["idle"] = dict(fn=idle, duration=2.4, loop=True)

    # ---- 보행 주기(달리기/걷기 공용)
    def gait(t, T, stride, lift, lean, bob, heel, arm_swing, trail):
        ph = 2 * PI * t / T
        out = {}
        def foot(s, phi):
            phi = phi % (2 * PI)
            sgn = 1.0 if s == "L" else -1.0
            y = (0.03 - stride * math.cos(phi))
            if phi <= PI:                                   # 디딤
                u = phi / PI
                lz = 0.0
                if u < 0.3:
                    pitch = -heel * 0.25 * (1 - u / 0.3)
                elif u < 0.55:
                    pitch = 0.0
                else:
                    pitch = heel * smooth01((u - 0.55) / 0.45)
            else:                                           # 내딛는 발
                u = (phi - PI) / PI
                lz = lift * math.sin(PI * u) * (1 - 0.35 * (2 * u - 1))
                if u < 0.3:
                    pitch = heel + (heel * 0.55) * smooth01(u / 0.3)
                else:
                    pitch = heel * 1.55 + (-heel * 0.25 - heel * 1.55) * smooth01((u - 0.3) / 0.7)
            return F(s, sgn * 0.105, y, lift=lz, pitch=pitch, yaw=sgn * 4)
        out["foot.R"] = foot("R", ph)
        out["foot.L"] = foot("L", ph + PI)
        cR = math.cos(ph); sR = math.sin(ph)
        out["hips"] = {"pos": (-0.012 * k * sR, 0.0, (-0.05 + bob * math.cos(2 * ph + 0.4 * PI)) * k),
                       "yaw": 7 * cR * (stride / 0.32), "pitch": lean, "roll": 2.5 * sR}
        out["spine"] = {"yaw": -5 * cR, "pitch": lean * 0.25, "roll": -1.5 * sR}
        out["chest"] = {"yaw": -7 * cR, "pitch": lean * 0.25, "roll": -1.5 * sR}
        out["neck"] = {"yaw": 4 * cR, "pitch": -lean * 0.45, "roll": 0}
        out["head"] = {"yaw": 5 * cR, "pitch": -lean * 0.55, "roll": 0}
        s = cR                                             # +1: 오른발이 앞 → 왼팔이 앞
        out["shoulder.L"] = {"raise": 2, "fwd": 5 + 5 * s}
        out["shoulder.R"] = {"raise": 2, "fwd": -4 * s}
        out["arm.L"] = {"upper": D(42 - 24 * s * arm_swing, -62 + 5 * s * arm_swing), "fore": D(-28 - 12 * s * arm_swing, 6 + 12 * s * arm_swing)}
        out["hand.L"] = {"face": D(22, 0)}
        if trail:        # 검을 뒤로 끌며 달린다
            out["arm.R"] = {"upper": D(-150 - 12 * s * arm_swing, -66), "fore": D(176, -46 - 9 * s * arm_swing)}
            out["hand.R"] = {"blade": D(174, 10 - 6 * s * arm_swing)}
        else:            # 검을 내려 들고 걷는다
            out["arm.R"] = {"upper": D(-60 - 30 * s * arm_swing, -78), "fore": D(-20 - 10 * s * arm_swing, -62 + 8 * s * arm_swing)}
            out["hand.R"] = {"blade": D(-8, -22 + 4 * s * arm_swing)}
        out["root_yaw"] = 0.0
        return out
    clips["run"] = dict(fn=lambda t: gait(t, 20 / 30, 0.33, 0.27, 15, 0.030, 40, 1.0, True), duration=20 / 30, loop=True)
    clips["walk"] = dict(fn=lambda t: gait(t, 32 / 30, 0.20, 0.09, 4, 0.012, 22, 0.6, False), duration=32 / 30, loop=True)

    # ---- 연속 공격 1: 오른쪽 위 → 왼쪽 아래 사선 베기
    a1 = Keyed([
        (0.00, BASE),
        (0.13, M({"hips": {"pos": (0, 0.03 * k, -0.05 * k), "yaw": -36}, "chest": {"yaw": -22, "pitch": -5}, "head": {"yaw": 46},
                  "shoulder.R": {"raise": 14}, "arm.R": {"upper": D(-105, 22), "fore": D(-172, 60)}, "hand.R": {"blade": D(150, 36)},
                  "arm.L": {"upper": D(34, -52), "fore": D(-30, 12)}, "foot.R": F("R", -0.19, 0.20, yaw=-38, pitch=6)}), "out"),
        (0.22, M({"hips": {"pos": (0, -0.06 * k, -0.08 * k), "yaw": -6, "pitch": 6}, "chest": {"yaw": 6, "pitch": 9}, "head": {"yaw": 4},
                  "shoulder.R": {"raise": 10, "fwd": 10}, "arm.R": {"upper": D(-38, 22), "fore": D(-16, 18)}, "hand.R": {"blade": D(-6, 64)},
                  "foot.L": F("L", 0.15, -0.22, yaw=8), "foot.R": F("R", -0.19, 0.20, yaw=-38, pitch=18)}), "in"),
        (0.29, M({"hips": {"pos": (0, -0.13 * k, -0.11 * k), "yaw": 15, "pitch": 9}, "chest": {"yaw": 25, "pitch": 16}, "head": {"yaw": -28, "pitch": 4},
                  "shoulder.R": {"raise": 0, "fwd": 16}, "arm.R": {"upper": D(18, -26), "fore": D(36, -36)}, "hand.R": {"blade": D(50, -20)},
                  "arm.L": {"upper": D(78, -56), "fore": D(22, -14)}, "hand.L": {"face": D(62, 0)},
                  "foot.L": F("L", 0.15, -0.25, yaw=8), "foot.R": F("R", -0.19, 0.20, yaw=-38, pitch=26)}), "lin"),
        (0.37, M({"hips": {"pos": (0, -0.14 * k, -0.12 * k), "yaw": 19, "pitch": 10}, "chest": {"yaw": 31, "pitch": 18}, "head": {"yaw": -34, "pitch": 4},
                  "shoulder.R": {"fwd": 18}, "arm.R": {"upper": D(40, -44), "fore": D(66, -44)}, "hand.R": {"blade": D(96, -40)},
                  "arm.L": {"upper": D(80, -56), "fore": D(24, -14)}, "hand.L": {"face": D(64, 0)},
                  "foot.L": F("L", 0.15, -0.25, yaw=8), "foot.R": F("R", -0.19, 0.20, yaw=-38, pitch=26)}), "out"),
        (0.50, M({"hips": {"pos": (0, -0.05 * k, -0.07 * k), "yaw": 4, "pitch": 5}, "chest": {"yaw": 14, "pitch": 8}, "head": {"yaw": -6},
                  "arm.R": {"upper": D(22, -52), "fore": D(48, -30)}, "hand.R": {"blade": D(80, -8)},
                  "arm.L": {"upper": D(62, -58), "fore": D(-6, 0)}, "hand.L": {"face": D(44, 0)},
                  "foot.L": F("L", 0.15, -0.20, yaw=8)}), "io"),
    ])
    clips["attack1"] = dict(fn=a1, duration=0.50, loop=False, events={"hit": 0.29})

    # ---- 연속 공격 2: 왼쪽 → 오른쪽 수평 베기
    a2 = Keyed([
        (0.00, a1.keys[-1][1]),
        (0.12, M({"hips": {"pos": (0, 0.0, -0.07 * k), "yaw": 12}, "chest": {"yaw": 38, "pitch": 6}, "head": {"yaw": -44},
                  "shoulder.R": {"fwd": 20}, "arm.R": {"upper": D(56, -14), "fore": D(112, 4)}, "hand.R": {"blade": D(162, 12)},
                  "arm.L": {"upper": D(74, -62), "fore": D(40, -30)}, "hand.L": {"face": D(70, 0)}}), "out"),
        (0.21, M({"hips": {"pos": (0, -0.08 * k, -0.09 * k), "yaw": -8, "pitch": 6}, "chest": {"yaw": -4, "pitch": 8}, "head": {"yaw": 10},
                  "shoulder.R": {"fwd": 10}, "arm.R": {"upper": D(8, -8), "fore": D(-2, -2)}, "hand.R": {"blade": D(42, 6)},
                  "arm.L": {"upper": D(70, -60), "fore": D(30, -24)}, "hand.L": {"face": D(60, 0)},
                  "foot.L": F("L", 0.15, -0.23, yaw=8), "foot.R": F("R", -0.19, 0.20, yaw=-38, pitch=16)}), "in"),
        (0.28, M({"hips": {"pos": (0, -0.11 * k, -0.10 * k), "yaw": -30, "pitch": 6}, "chest": {"yaw": -34, "pitch": 8}, "head": {"yaw": 58},
                  "shoulder.R": {"fwd": -6}, "arm.R": {"upper": D(-62, -8), "fore": D(-76, -2)}, "hand.R": {"blade": D(-96, 4)},
                  "arm.L": {"upper": D(56, -58), "fore": D(0, -6)}, "hand.L": {"face": D(40, 0)},
                  "foot.L": F("L", 0.15, -0.25, yaw=8), "foot.R": F("R", -0.19, 0.20, yaw=-38, pitch=20)}), "lin"),
        (0.36, M({"hips": {"pos": (0, -0.11 * k, -0.10 * k), "yaw": -36, "pitch": 6}, "chest": {"yaw": -44, "pitch": 7}, "head": {"yaw": 70},
                  "shoulder.R": {"fwd": -10}, "arm.R": {"upper": D(-88, -12), "fore": D(-112, -5)}, "hand.R": {"blade": D(-152, 0)},
                  "arm.L": {"upper": D(52, -58), "fore": D(-10, 0)}, "hand.L": {"face": D(36, 0)},
                  "foot.L": F("L", 0.15, -0.25, yaw=8), "foot.R": F("R", -0.19, 0.20, yaw=-38, pitch=20)}), "out"),
        (0.50, M({"hips": {"pos": (0, -0.03 * k, -0.06 * k), "yaw": -26}, "chest": {"yaw": -14, "pitch": 4}, "head": {"yaw": 34},
                  "arm.R": {"upper": D(-58, -46), "fore": D(-50, -2)}, "hand.R": {"blade": D(-60, 40)}}), "io"),
    ])
    clips["attack2"] = dict(fn=a2, duration=0.50, loop=False, events={"hit": 0.27})

    # ---- 연속 공격 3: 크게 들어 올려 내려찍기
    a3 = Keyed([
        (0.00, a2.keys[-1][1]),
        (0.17, M({"hips": {"pos": (0, 0.03 * k, 0.02 * k), "yaw": -10, "pitch": -5}, "spine": {"pitch": -6}, "chest": {"yaw": -4, "pitch": -12},
                  "head": {"yaw": 14, "pitch": 6}, "shoulder.R": {"raise": 30, "fwd": 4},
                  "arm.R": {"upper": D(-28, 68), "fore": D(170, 70)}, "hand.R": {"blade": D(178, 26)},
                  "arm.L": {"upper": D(36, -46), "fore": D(-22, -4)}, "hand.L": {"face": D(20, 0)},
                  "foot.L": F("L", 0.15, -0.14, yaw=8, pitch=10), "foot.R": F("R", -0.19, 0.19, yaw=-38, pitch=14)}), "out"),
        (0.27, M({"hips": {"pos": (0, -0.10 * k, -0.08 * k), "yaw": -4, "pitch": 10}, "spine": {"pitch": 6}, "chest": {"yaw": 2, "pitch": 14},
                  "head": {"yaw": 2, "pitch": -6}, "shoulder.R": {"raise": 16, "fwd": 12},
                  "arm.R": {"upper": D(-14, 34), "fore": D(-5, 30)}, "hand.R": {"blade": D(0, 58)},
                  "foot.L": F("L", 0.15, -0.34, lift=0.05, yaw=6, pitch=-6), "foot.R": F("R", -0.19, 0.22, yaw=-38, pitch=24)}), "in"),
        (0.33, M({"hips": {"pos": (0, -0.20 * k, -0.25 * k), "yaw": 4, "pitch": 20}, "spine": {"pitch": 10}, "chest": {"yaw": 8, "pitch": 24},
                  "head": {"yaw": -8, "pitch": -22}, "shoulder.R": {"raise": 0, "fwd": 18},
                  "arm.R": {"upper": D(-8, -30), "fore": D(0, -40)}, "hand.R": {"blade": D(2, -30)},
                  "arm.L": {"upper": D(64, -52), "fore": D(20, -30)}, "hand.L": {"face": D(50, -10)},
                  "foot.L": F("L", 0.16, -0.42, yaw=6), "foot.R": F("R", -0.20, 0.30, yaw=-38, pitch=36)}), "lin"),
        (0.44, M({"hips": {"pos": (0, -0.21 * k, -0.28 * k), "yaw": 5, "pitch": 22}, "spine": {"pitch": 11}, "chest": {"yaw": 9, "pitch": 26},
                  "head": {"yaw": -8, "pitch": -24}, "shoulder.R": {"fwd": 18},
                  "arm.R": {"upper": D(-8, -34), "fore": D(0, -44)}, "hand.R": {"blade": D(3, -34)},
                  "arm.L": {"upper": D(64, -52), "fore": D(20, -30)}, "hand.L": {"face": D(50, -10)},
                  "foot.L": F("L", 0.16, -0.42, yaw=6), "foot.R": F("R", -0.20, 0.30, yaw=-38, pitch=36)}), "out"),
        (0.70, BASE, "io"),
    ])
    clips["attack3"] = dict(fn=a3, duration=0.70, loop=False, events={"hit": 0.33})

    # ---- 스킬 1: 회전 베기(뛰어올라 한 바퀴 돌며 벤다)
    tuckL = F("L", 0.12, -0.10, lift=0.24, pitch=28)
    tuckR = F("R", -0.14, 0.12, lift=0.18, pitch=38)
    spin_arm = {"shoulder.R": {"raise": 6, "fwd": -8}, "arm.R": {"upper": D(-84, 4), "fore": D(-74, 2)}, "hand.R": {"blade": D(-14, 3)},
                "arm.L": {"upper": D(70, -40), "fore": D(20, -30)}, "hand.L": {"face": D(70, 0)}}
    s1 = Keyed([
        (0.00, BASE),
        (0.15, M({"hips": {"pos": (0, 0.0, -0.22 * k), "yaw": -42, "pitch": 12}, "chest": {"yaw": -30, "pitch": 6}, "head": {"yaw": 60},
                  "arm.R": {"upper": D(-112, -6), "fore": D(-152, 0)}, "hand.R": {"blade": D(172, 4)},
                  "arm.L": {"upper": D(62, -56), "fore": D(-8, -20)}, "hand.L": {"face": D(40, 0)},
                  "foot.L": F("L", 0.17, -0.15, yaw=8), "foot.R": F("R", -0.20, 0.17, yaw=-38, pitch=8), "root_yaw": 0.0}), "out"),
        (0.26, M(deep_merge(spin_arm, {"hips": {"pos": (0, 0, 0.06 * k), "yaw": -20, "pitch": 4}, "chest": {"yaw": -8, "pitch": 2}, "head": {"yaw": 30},
                  "foot.L": F("L", 0.14, -0.12, lift=0.10, pitch=30), "foot.R": F("R", -0.16, 0.14, lift=0.06, pitch=40), "root_yaw": 70.0})), "in"),
        (0.42, M(deep_merge(spin_arm, {"hips": {"pos": (0, 0, 0.22 * k), "yaw": 6, "pitch": 2}, "chest": {"yaw": 14, "pitch": 0}, "head": {"yaw": 10},
                  "foot.L": tuckL, "foot.R": tuckR, "root_yaw": 200.0})), "lin"),
        (0.58, M(deep_merge(spin_arm, {"hips": {"pos": (0, 0, 0.10 * k), "yaw": 16, "pitch": 4}, "chest": {"yaw": 22, "pitch": 4}, "head": {"yaw": -10},
                  "foot.L": F("L", 0.16, -0.12, lift=0.10, pitch=20), "foot.R": F("R", -0.18, 0.14, lift=0.08, pitch=30), "root_yaw": 325.0})), "lin"),
        (0.68, M({"hips": {"pos": (0, -0.02 * k, -0.24 * k), "yaw": 24, "pitch": 12}, "chest": {"yaw": 30, "pitch": 14}, "head": {"yaw": -40},
                  "shoulder.R": {"fwd": 16}, "arm.R": {"upper": D(40, -30), "fore": D(62, -36)}, "hand.R": {"blade": D(100, -24)},
                  "arm.L": {"upper": D(76, -56), "fore": D(24, -20)}, "hand.L": {"face": D(60, 0)},
                  "foot.L": F("L", 0.20, -0.14, yaw=8), "foot.R": F("R", -0.22, 0.17, yaw=-38), "root_yaw": 360.0}), "out"),
        (0.90, M({"root_yaw": 360.0}), "io"),
    ])
    clips["skill1"] = dict(fn=s1, duration=0.90, loop=False, events={"hit": 0.30, "hit2": 0.50})

    # ---- 스킬 2: 도약 강타(높이 뛰어 내려찍기)
    s2 = Keyed([
        (0.00, BASE),
        (0.16, M({"hips": {"pos": (0, 0.02 * k, -0.27 * k), "yaw": -14, "pitch": 16}, "chest": {"pitch": 10}, "head": {"pitch": -14},
                  "arm.R": {"upper": D(-140, -50), "fore": D(-172, -30)}, "hand.R": {"blade": D(176, 10)},
                  "arm.L": {"upper": D(50, -50), "fore": D(-20, -10)},
                  "foot.L": F("L", 0.16, -0.15, yaw=8), "foot.R": F("R", -0.19, 0.17, yaw=-30)}), "out"),
        (0.30, M({"hips": {"pos": (0, 0, 0.20 * k), "yaw": -8, "pitch": -2}, "chest": {"pitch": -8}, "head": {"pitch": 0}, "shoulder.R": {"raise": 22},
                  "arm.R": {"upper": D(-60, 30), "fore": D(-150, 60)}, "hand.R": {"blade": D(170, 30)},
                  "foot.L": F("L", 0.14, -0.10, lift=0.16, pitch=40), "foot.R": F("R", -0.16, 0.14, lift=0.12, pitch=48)}), "in"),
        (0.48, M({"hips": {"pos": (0, 0, 0.56 * k), "yaw": -4, "pitch": -10}, "spine": {"pitch": -8}, "chest": {"pitch": -16}, "head": {"pitch": 10},
                  "shoulder.R": {"raise": 32}, "arm.R": {"upper": D(-22, 76), "fore": D(176, 68)}, "hand.R": {"blade": D(180, 18)},
                  "arm.L": {"upper": D(40, -30), "fore": D(-10, 10)},
                  "foot.L": F("L", 0.12, -0.20, lift=0.36, pitch=22), "foot.R": F("R", -0.13, 0.24, lift=0.46, pitch=52)}), "out"),
        (0.58, M({"hips": {"pos": (0, -0.06 * k, 0.26 * k), "yaw": 0, "pitch": 12}, "chest": {"pitch": 12}, "head": {"pitch": -10}, "shoulder.R": {"raise": 14, "fwd": 12},
                  "arm.R": {"upper": D(-12, 32), "fore": D(-4, 26)}, "hand.R": {"blade": D(0, 52)},
                  "foot.L": F("L", 0.15, -0.34, lift=0.14, pitch=-4), "foot.R": F("R", -0.18, 0.30, lift=0.22, pitch=40)}), "in"),
        (0.64, M({"hips": {"pos": (0, -0.16 * k, -0.34 * k), "yaw": 4, "pitch": 26}, "spine": {"pitch": 10}, "chest": {"yaw": 6, "pitch": 26}, "head": {"pitch": -26},
                  "shoulder.R": {"fwd": 18}, "arm.R": {"upper": D(-6, -36), "fore": D(0, -46)}, "hand.R": {"blade": D(0, -34)},
                  "arm.L": {"upper": D(66, -50), "fore": D(24, -30)}, "hand.L": {"face": D(50, -10)},
                  "foot.L": F("L", 0.17, -0.42, yaw=6), "foot.R": F("R", -0.21, 0.34, yaw=-38, pitch=38)}), "lin"),
        (0.82, M({"hips": {"pos": (0, -0.16 * k, -0.37 * k), "yaw": 4, "pitch": 27}, "spine": {"pitch": 10}, "chest": {"yaw": 6, "pitch": 27}, "head": {"pitch": -27},
                  "shoulder.R": {"fwd": 18}, "arm.R": {"upper": D(-6, -38), "fore": D(0, -48)}, "hand.R": {"blade": D(0, -36)},
                  "arm.L": {"upper": D(66, -50), "fore": D(24, -30)}, "hand.L": {"face": D(50, -10)},
                  "foot.L": F("L", 0.17, -0.42, yaw=6), "foot.R": F("R", -0.21, 0.34, yaw=-38, pitch=38)}), "out"),
        (1.10, BASE, "io"),
    ])
    clips["skill2"] = dict(fn=s2, duration=1.10, loop=False, events={"hit": 0.64})

    # ---- 스킬 3: 기합(검을 하늘로 치켜든다) — 버프·레벨업 연출에도 사용
    up_pose = M({"hips": {"pos": (0, 0.0, 0.0), "yaw": -8, "pitch": -3}, "spine": {"pitch": -4}, "chest": {"yaw": 0, "pitch": -10},
                 "neck": {"yaw": 4, "pitch": -8}, "head": {"yaw": 4, "pitch": -16}, "shoulder.R": {"raise": 34, "fwd": 0},
                 "arm.R": {"upper": D(-30, 78), "fore": D(-20, 86)}, "hand.R": {"blade": D(0, 87)},
                 "arm.L": {"upper": D(66, -52), "fore": D(52, -34)}, "hand.L": {"face": D(60, 10)},
                 "foot.L": F("L", 0.16, -0.10, yaw=10), "foot.R": F("R", -0.18, 0.10, yaw=-24)})
    def s3(t):
        base = Keyed([(0.0, BASE), (0.12, M({"hips": {"pos": (0, 0, -0.10 * k), "pitch": 8}, "chest": {"pitch": 8},
                                            "arm.R": {"upper": D(-40, -60), "fore": D(-10, -20)}, "hand.R": {"blade": D(0, 30)}}), "out"),
                      (0.30, up_pose, "back"), (0.92, up_pose, "lin"), (1.20, BASE, "io")])(t)
        if 0.30 <= t <= 0.92:      # 치켜든 채 미세하게 떨린다
            w = (t - 0.30) * 2 * PI * 9
            base["hand.R"]["blade"] = D(0 + 3 * math.sin(w), 87 - 1.5 * abs(math.cos(w * 0.7)))
            base["chest"]["pitch"] = -10 - 1.0 * math.sin(w * 0.5)
        return base
    clips["skill3"] = dict(fn=s3, duration=1.20, loop=False, events={"cast": 0.30})

    # ---- 맞기
    hit = Keyed([
        (0.00, BASE),
        (0.07, M({"hips": {"pos": (0, 0.08 * k, -0.04 * k), "yaw": -16, "pitch": -7}, "spine": {"pitch": -8}, "chest": {"yaw": 10, "pitch": -14},
                  "neck": {"pitch": 10}, "head": {"yaw": 10, "pitch": -14, "roll": 8}, "shoulder.L": {"raise": 12}, "shoulder.R": {"raise": 10},
                  "arm.R": {"upper": D(-48, -56), "fore": D(-12, -4)}, "hand.R": {"blade": D(-36, 44)},
                  "arm.L": {"upper": D(40, -44), "fore": D(-30, 28)}, "hand.L": {"face": D(10, 20)},
                  "foot.R": F("R", -0.20, 0.25, yaw=-38)}), "out3"),
        (0.20, M({"hips": {"pos": (0, 0.04 * k, -0.09 * k), "yaw": -20, "pitch": 6}, "spine": {"pitch": 4}, "chest": {"yaw": 0, "pitch": 8},
                  "head": {"yaw": 16, "pitch": 6}, "foot.R": F("R", -0.20, 0.23, yaw=-38)}), "io"),
        (0.40, BASE, "io"),
    ])
    clips["hit"] = dict(fn=hit, duration=0.40, loop=False)

    # ---- 쓰러짐: 뒤로 비틀거리다 무릎이 꺾이며 등으로 넘어진다(마지막 자세 유지)
    lie = M({"hips": {"pos": (0, 0.66 * k, -0.86 * k), "yaw": -4, "pitch": -88, "roll": 3}, "spine": {"yaw": 0, "pitch": -2, "roll": 0},
             "chest": {"yaw": 3, "pitch": -2, "roll": 0}, "neck": {"yaw": 6, "pitch": 4, "roll": 0}, "head": {"yaw": 14, "pitch": 6, "roll": 6},
             "shoulder.L": {"raise": 6, "fwd": 0}, "shoulder.R": {"raise": 6, "fwd": 0},
             "arm.R": {"upper": D(-72, -5), "fore": D(-48, -3)}, "hand.R": {"blade": D(-112, -1)},
             "arm.L": {"upper": D(84, -5), "fore": D(118, -2)}, "hand.L": {"face": D(0, 86)},
             "foot.L": F("L", 0.20, -0.24, lift=-0.04, yaw=24, pitch=-62), "foot.R": F("R", -0.24, -0.16, lift=-0.04, yaw=-30, pitch=-58),
             "knee.L": {"up": 1.0}, "knee.R": {"up": 1.0}, "settle": 1.0})
    death = Keyed([
        (0.00, BASE),
        (0.18, M({"hips": {"pos": (0, 0.10 * k, -0.07 * k), "yaw": -14, "pitch": -10}, "spine": {"pitch": -8}, "chest": {"yaw": 4, "pitch": -16},
                  "head": {"yaw": 8, "pitch": -18}, "arm.R": {"upper": D(-52, -44), "fore": D(-40, -40)}, "hand.R": {"blade": D(-60, 10)},
                  "arm.L": {"upper": D(62, -44), "fore": D(50, -40)}, "hand.L": {"face": D(40, 10)},
                  "foot.R": F("R", -0.20, 0.30, yaw=-38)}), "out"),
        (0.48, M({"hips": {"pos": (0, 0.34 * k, -0.46 * k), "yaw": -8, "pitch": -44, "roll": 2}, "spine": {"yaw": 0, "pitch": -6, "roll": 0},
                  "chest": {"yaw": 3, "pitch": -12, "roll": 0}, "neck": {"yaw": 6, "pitch": 6, "roll": 0}, "head": {"yaw": 10, "pitch": 14, "roll": 4},
                  "shoulder.L": {"raise": 16, "fwd": 0}, "shoulder.R": {"raise": 16, "fwd": 0},
                  "arm.R": {"upper": D(-70, 34), "fore": D(-58, 58)}, "hand.R": {"blade": D(-90, 44)},
                  "arm.L": {"upper": D(72, 34), "fore": D(62, 58)}, "hand.L": {"face": D(30, 50)},
                  "foot.L": F("L", 0.17, -0.19, yaw=14, pitch=-14), "foot.R": F("R", -0.21, 0.10, yaw=-34, pitch=-10),
                  "knee.L": {"up": 0.5}, "knee.R": {"up": 0.5}, "settle": 0.0}), "in"),
        (0.72, lie, "in"),
        (0.84, deep_merge(lie, {"hips": {"pos": (0, 0.67 * k, -0.80 * k), "pitch": -84}, "chest": {"pitch": 4}, "head": {"pitch": 10},
                                 "arm.R": {"upper": D(-76, 6), "fore": D(-56, 12)}, "hand.R": {"blade": D(-112, 8)},
                                 "arm.L": {"upper": D(86, 6), "fore": D(116, 12)}, "settle": 0.0}), "out"),
        (1.00, lie, "io"),
        (1.50, lie, "lin"),
    ])
    clips["death"] = dict(fn=death, duration=1.50, loop=False)
    return clips
