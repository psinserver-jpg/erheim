"""마법사(지팡이) 동작 세트. 직접 만든 키 포즈/주기 함수만 쓴다.

팔·지팡이 방향은 전부 "world": True (루트 기준 고정 방향)로 적는다 → 몸통을 비틀어도 지팡이 궤적이 그대로 읽힌다.
D(az, el): az 0=앞, +90=왼쪽, -90=오른쪽, 180=뒤 / el +90=위.
"""
import math, copy, os, json, atexit
import numpy as np
from rigpose import D
from anims import Keyed, deep_merge, smooth01, PI, _interp

STAFF_BUTT = 0.70      # 손잡이 중심 → 아래 끝 (배율 전, gear_mage.Y_BOT)
STAFF_TOP = 0.90
_PROBE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "_work", "mage_probe.json")


def _segd(p1, q1, p2, q2):
    best = 1e9
    for u in np.linspace(0, 1, 41):
        a = p1 + (q1 - p1) * u
        d = q2 - p2
        t = float(np.clip(np.dot(a - p2, d) / max(float(np.dot(d, d)), 1e-12), 0, 1))
        best = min(best, float(np.linalg.norm(a - (p2 + d * t))))
    return best


def _install_probe(rm, clips, k):
    """진단용: 굽는 동안 매 프레임의 지팡이 끝·관절 위치를 _work/mage_probe.json 에 적는다(이 프로세스에만 적용, 동작에는 영향 없음)."""
    cur = [None]
    rec = {}
    orig = rm.solve

    def dump():
        try:
            with open(_PROBE_PATH, "w") as f:
                json.dump(rec, f)
        except Exception:
            pass

    def solve(P):
        out = orig(P)
        if cur[0] is not None:
            g = rm.grip_world("R"); d = rm.blade_dir("R")
            butt = g - d * STAFF_BUTT * k; gem = g + d * STAFF_TOP * k
            pos = rm.pos
            segs = {"thighR": ("thigh.R", "shin.R"), "shinR": ("shin.R", "foot.R"), "thighL": ("thigh.L", "shin.L"),
                    "shinL": ("shin.L", "foot.L"), "torso": ("hips", "neck"), "head": ("neck", "head")}
            e = {"butt": butt.tolist(), "gem": gem.tolist(), "grip": g.tolist()}
            for n, (a, b) in segs.items():
                e["d_" + n] = _segd(butt, gem, pos[a], pos[b])
            for n in ("hips", "head", "hand.L", "hand.R", "foot.L", "foot.R", "shin.R", "shin.L"):
                e[n] = pos[n].tolist()
            rec.setdefault(cur[0][0], {})[str(cur[0][1])] = e
        return out
    rm.solve = solve

    def wrap(name, fn):
        def w(t):
            dump()
            cur[0] = (name, int(round(t * 30)))
            return fn(t)
        return w
    for name, cd in clips.items():
        cd["fn"] = wrap(name, cd["fn"])
    atexit.register(dump)


def _ae(v):
    v = np.asarray(v, dtype=float); v = v / np.linalg.norm(v)
    return math.degrees(math.atan2(v[0], -v[1])), math.degrees(math.asin(max(-1.0, min(1.0, v[2]))))


def fit_grip(rm, P, target, iters=40):
    """오른팔 방향(위팔·아래팔)을 조금씩 고쳐 손잡이 중심이 target(루트 기준 m)에 오게 한다. 키 포즈를 만들 때만 쓴다."""
    P = copy.deepcopy(P)
    a = P["arm.R"]
    x = np.array(list(_ae(a["upper"])) + list(_ae(a["fore"])))
    target = np.asarray(target, dtype=float)

    def f(x):
        a["upper"] = D(x[0], x[1]); a["fore"] = D(x[2], x[3])
        rm.solve(P)
        return rm.grip_world("R") - target
    for _ in range(iters):
        r = f(x)
        if np.linalg.norm(r) < 3e-4:
            break
        J = np.zeros((3, 4))
        for j in range(4):
            xx = x.copy(); xx[j] += 0.5
            J[:, j] = (f(xx) - r) / 0.5
        dx = -J.T @ np.linalg.solve(J @ J.T + 1e-5 * np.eye(3), r)
        m = np.abs(dx).max()
        if m > 8.0:
            dx *= 8.0 / m
        x = x + dx
        if os.environ.get("MAGE_DBG"):
            print("[RIG] it", _, np.round(x, 1), np.round(r, 3), "sh", np.round(rm.pos["upper_arm.R"], 3), "wr", np.round(rm.pos["hand.R"], 3), "tgt", np.round(target, 3))
    r = f(x)
    return P, float(np.linalg.norm(r))


def mage_set(rm):
    k = rm.H / 1.8
    ra = rm.rest_ankle

    def F(s, x, y, lift=0.0, **kw):
        d = dict(pos=(x * k, y * k, ra[s][2] + lift * k), yaw=0, pitch=0, roll=0)
        d.update(kw)
        return d

    # 기본 자세: 몸을 살짝 오른쪽으로 틀고, 지팡이를 오른쪽 앞에 세워 든다. 왼손은 가볍게 내려 둔다.
    BASE = {
        "hips": {"pos": (0.0, -0.006 * k, -0.010 * k), "yaw": -14, "pitch": 0, "roll": 0},
        "spine": {"yaw": -2, "pitch": 0, "roll": 0}, "chest": {"yaw": -4, "pitch": -1, "roll": 0},
        "neck": {"yaw": 8, "pitch": -1, "roll": 0}, "head": {"yaw": 12, "pitch": -2, "roll": 0},
        "shoulder.L": {"raise": 0, "fwd": 2}, "shoulder.R": {"raise": 2, "fwd": 2},
        "arm.R": {"upper": D(-58, -68), "fore": D(-14, -26), "world": True}, "hand.R": {"blade": D(25, 80)},
        "arm.L": {"upper": D(72, -72), "fore": D(34, -52), "world": True}, "hand.L": {"face": D(90, 0)},
        "foot.L": F("L", 0.105, -0.10, yaw=6), "foot.R": F("R", -0.12, 0.09, yaw=-24),
        "knee.L": {"up": 0.0, "out": 0.0}, "knee.R": {"up": 0.0, "out": 0.0},
        "root_yaw": 0.0, "settle": 0.0,
    }
    M = lambda over: deep_merge(BASE, over)
    clips = {}

    # ---- 대기 (3.0초 반복): 곧게 서서 깊게 호흡한다(가슴·어깨가 오르내림), 체중이 천천히 좌우로 옮겨 가고 지팡이 끝이 원을 그린다
    def idle(t):
        w = 2 * PI * t / 3.0
        b = math.sin(w); c = math.cos(w); b2 = math.sin(w + 1.0); b3 = math.sin(w - 0.7)
        return M({
            "hips": {"pos": (0.016 * k * c, -0.006 * k, (-0.010 - 0.009 + 0.009 * b) * k), "yaw": -14 + 2.0 * c, "roll": 1.6 * c},
            "spine": {"pitch": -1.6 * b, "roll": -0.8 * c}, "chest": {"pitch": -1 - 3.2 * b, "yaw": -4 - 1.5 * c, "roll": -0.8 * c},
            "neck": {"pitch": -1 + 1.5 * b}, "head": {"yaw": 12 - 3.0 * c, "pitch": -2 + 2.0 * b2},
            "shoulder.L": {"raise": 2.5 + 3.5 * b}, "shoulder.R": {"raise": 4.0 + 3.5 * b},
            "arm.R": {"upper": D(-58, -68 + 2.0 * b), "fore": D(-14 + 2.5 * c, -26 + 5.0 * b3)},
            "hand.R": {"blade": D(25 + 35 * c, 80 + 3.0 * b2)},
            "arm.L": {"upper": D(72, -72 + 3.0 * b), "fore": D(34 - 8 * c, -52 + 10 * b3)},
        })
    clips["idle"] = dict(fn=idle, duration=3.0, loop=True)

    # ---- 보행 주기
    def gait(t, T, stride, lift, lean, bob, heel, swing, run):
        ph = 2 * PI * t / T
        out = {}

        def foot(s, phi):
            phi = phi % (2 * PI)
            sgn = 1.0 if s == "L" else -1.0
            y = -0.02 - stride * math.cos(phi)
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
            return F(s, sgn * 0.085, y, lift=lz, pitch=pitch, yaw=sgn * 5)
        out["foot.R"] = foot("R", ph)
        out["foot.L"] = foot("L", ph + PI)
        cR = math.cos(ph); sR = math.sin(ph)
        c2 = math.cos(2 * ph + 0.4 * PI)
        sway = 0.016 if run else 0.026
        out["hips"] = {"pos": (-sway * k * sR, 0.0, (-0.035 + bob * c2) * k),
                       "yaw": 8 * cR * min(1.0, stride / 0.30), "pitch": lean, "roll": (3.5 if run else 5.0) * sR}
        out["spine"] = {"yaw": -5 * cR, "pitch": lean * 0.25, "roll": (-2.0 if run else -2.6) * sR}
        out["chest"] = {"yaw": (-8 if run else -11) * cR, "pitch": lean * 0.25, "roll": (-2.0 if run else -2.6) * sR}
        out["neck"] = {"yaw": 3 * cR, "pitch": -lean * 0.4, "roll": 0}
        out["head"] = {"yaw": 2 * cR, "pitch": -lean * 0.5, "roll": 0.8 * sR}
        s = cR                                             # +1: 오른발이 앞 → 왼팔이 앞
        out["shoulder.L"] = {"raise": 1, "fwd": 3 + 5 * s}
        out["shoulder.R"] = {"raise": 3, "fwd": 2 - 3 * s}
        if run:
            # 왼팔은 크게 흔들고, 지팡이는 앞으로 비스듬히 세워 들고 리듬에 맞춰 살짝 출렁인다
            out["arm.L"] = {"upper": D(60 - 50 * s * swing, -62 + 8 * s), "fore": D(20 - 30 * s, -22 + 30 * s * swing), "world": True}
            out["hand.L"] = {"face": D(90, 10)}
            # 지팡이 든 팔도 다리와 엇박으로 앞뒤로 흔든다(왼팔보다 작게)
            out["arm.R"] = {"upper": D(-74 + 26 * s, -60 - 5 * s), "fore": D(-18 + 14 * s, -6 - 8 * s - 5 * c2), "world": True}
            out["hand.R"] = {"blade": D(8 + 8 * s, 58 + 5 * c2 - 4 * s)}
        else:
            out["arm.L"] = {"upper": D(70 - 34 * s * swing, -74 + 4 * s), "fore": D(30 - 30 * s * swing, -56 + 14 * s * swing), "world": True}
            out["hand.L"] = {"face": D(90, 0)}
            out["arm.R"] = {"upper": D(-60 + 10 * s, -66), "fore": D(-14 + 6 * s, -14 - 3 * c2), "world": True}
            out["hand.R"] = {"blade": D(20 + 20 * s, 78 + 3 * c2)}
        out["knee.L"] = {"up": 0.0, "out": 0.0}; out["knee.R"] = {"up": 0.0, "out": 0.0}
        out["root_yaw"] = 0.0; out["settle"] = 0.0
        return out
    clips["walk"] = dict(fn=lambda t: gait(t, 32 / 30, 0.235, 0.085, 3, 0.017, 22, 0.8, False), duration=32 / 30, loop=True)
    clips["run"] = dict(fn=lambda t: gait(t, 20 / 30, 0.36, 0.25, 12, 0.034, 40, 1.0, True), duration=20 / 30, loop=True)

    # ---- 공격 1: 지팡이를 뒤로 당겼다가 앞으로 내밀어 마법 발사
    a1_thrust = {"hips": {"pos": (0, -0.09 * k, -0.07 * k), "yaw": 8, "pitch": 7}, "spine": {"yaw": 2, "pitch": 3},
                 "chest": {"yaw": 14, "pitch": 6}, "neck": {"yaw": -6}, "head": {"yaw": -12, "pitch": -6},
                 "shoulder.R": {"raise": 6, "fwd": 18}, "shoulder.L": {"fwd": -6},
                 "arm.R": {"upper": D(-10, -6), "fore": D(0, 2)}, "hand.R": {"blade": D(14, 38)},
                 "arm.L": {"upper": D(112, -62), "fore": D(14, 22)}, "hand.L": {"face": D(100, 30)},
                 "foot.L": F("L", 0.105, -0.24, yaw=4), "foot.R": F("R", -0.12, 0.14, yaw=-24, pitch=22)}
    a1 = Keyed([
        (0.00, BASE),
        (0.15, M({"hips": {"pos": (0, 0.04 * k, -0.05 * k), "yaw": -30, "pitch": -2}, "spine": {"yaw": -6}, "chest": {"yaw": -16, "pitch": -5},
                  "neck": {"yaw": 16}, "head": {"yaw": 30, "pitch": -2}, "shoulder.R": {"raise": 8, "fwd": -8},
                  "arm.R": {"upper": D(-118, -44), "fore": D(-70, 6)}, "hand.R": {"blade": D(170, 62)},
                  "arm.L": {"upper": D(30, -42), "fore": D(0, -4)}, "hand.L": {"face": D(60, 40)},
                  "foot.R": F("R", -0.12, 0.10, yaw=-24, pitch=4)}), "out"),
        (0.22, M({"hips": {"pos": (0, -0.03 * k, -0.06 * k), "yaw": -10, "pitch": 3}, "chest": {"yaw": 0, "pitch": 2},
                  "neck": {"yaw": 4}, "head": {"yaw": 6, "pitch": -4}, "shoulder.R": {"raise": 10, "fwd": 8},
                  "arm.R": {"upper": D(-60, -30), "fore": D(-14, 8)}, "hand.R": {"blade": D(60, 78)},
                  "arm.L": {"upper": D(86, -58), "fore": D(40, -6)}, "hand.L": {"face": D(100, 20)},
                  "foot.L": F("L", 0.105, -0.18, lift=0.03, yaw=4), "foot.R": F("R", -0.12, 0.12, yaw=-24, pitch=14)}), "lin"),
        (0.30, M(a1_thrust), "lin"),
        (0.41, M(deep_merge(a1_thrust, {"hips": {"pos": (0, -0.10 * k, -0.08 * k)}, "chest": {"yaw": 16, "pitch": 7},
                                         "arm.R": {"upper": D(-10, -3), "fore": D(0, 5)}, "hand.R": {"blade": D(14, 45)}})), "out"),
        (0.62, BASE, "io"),
    ])
    clips["attack1"] = dict(fn=a1, duration=0.62, loop=False, events={"cast": 0.30})

    # ---- 공격 2: 왼손을 가슴으로 모았다가 앞으로 뻗어 발사(지팡이는 뒤로 빼서 균형)
    a2_push = {"hips": {"pos": (0, -0.08 * k, -0.06 * k), "yaw": -34, "pitch": 6}, "spine": {"yaw": -6, "pitch": 2},
               "chest": {"yaw": -20, "pitch": 5}, "neck": {"yaw": 22}, "head": {"yaw": 36, "pitch": -5},
               "shoulder.L": {"raise": 6, "fwd": 20}, "shoulder.R": {"raise": 4, "fwd": -8},
               "arm.L": {"upper": D(6, -4), "fore": D(0, 6)}, "hand.L": {"face": D(90, 50)},
               "arm.R": {"upper": D(-102, -42), "fore": D(-118, -6)}, "hand.R": {"blade": D(-120, 72)},
               "foot.L": F("L", 0.105, -0.25, yaw=2), "foot.R": F("R", -0.12, 0.15, yaw=-30, pitch=20)}
    a2 = Keyed([
        (0.00, BASE),
        (0.14, M({"hips": {"pos": (0, 0.03 * k, -0.05 * k), "yaw": 6, "pitch": -2}, "chest": {"yaw": 12, "pitch": -4},
                  "neck": {"yaw": -2}, "head": {"yaw": -6, "pitch": -2}, "shoulder.L": {"raise": 8, "fwd": -8},
                  "arm.L": {"upper": D(112, -48), "fore": D(52, 34)}, "hand.L": {"face": D(110, 10)},
                  "arm.R": {"upper": D(-48, -56), "fore": D(-4, -6)}, "hand.R": {"blade": D(40, 70)}}), "out"),
        (0.29, M(a2_push), "io"),
        (0.41, M(deep_merge(a2_push, {"hips": {"pos": (0, -0.09 * k, -0.07 * k), "yaw": -36}, "chest": {"yaw": -22},
                                       "arm.L": {"upper": D(6, -2), "fore": D(0, 9)},
                                       "arm.R": {"upper": D(-104, -40), "fore": D(-120, -4)}, "hand.R": {"blade": D(-122, 69)}})), "out"),
        (0.60, BASE, "io"),
    ])
    clips["attack2"] = dict(fn=a2, duration=0.60, loop=False, events={"cast": 0.28})

    # ---- 스킬 1: 지팡이를 하늘로 치켜들어 뒤로 젖혔다가, 앞 땅에 내리찍는 큰 마법
    s1_up = {"hips": {"pos": (0, 0.02 * k, 0.03 * k), "yaw": -8, "pitch": -4}, "spine": {"yaw": 0, "pitch": -4},
             "chest": {"yaw": -2, "pitch": -9}, "neck": {"yaw": 4, "pitch": -6}, "head": {"yaw": 6, "pitch": -14},
             "shoulder.R": {"raise": 16, "fwd": 0}, "shoulder.L": {"raise": 6, "fwd": -4},
             "arm.R": {"upper": D(-50, 58), "fore": D(-30, 78)}, "hand.R": {"blade": D(180, 80)},
             "arm.L": {"upper": D(86, -18), "fore": D(92, 4)}, "hand.L": {"face": D(0, 90)},
             "foot.L": F("L", 0.11, -0.09, yaw=8, pitch=22), "foot.R": F("R", -0.12, 0.08, yaw=-22, pitch=26)}
    s1_down = {"hips": {"pos": (0, -0.08 * k, -0.29 * k), "yaw": -4, "pitch": 15}, "spine": {"yaw": 0, "pitch": 7},
               "chest": {"yaw": 4, "pitch": 14}, "neck": {"yaw": 2, "pitch": -6}, "head": {"yaw": 2, "pitch": -12},
               "shoulder.R": {"raise": 0, "fwd": 14}, "shoulder.L": {"raise": 2, "fwd": 6},
               "arm.R": {"upper": D(-24, -44), "fore": D(-4, -38)}, "hand.R": {"blade": D(-165, 80)},
               "arm.L": {"upper": D(78, -40), "fore": D(60, -62)}, "hand.L": {"face": D(90, 30)},
               "foot.L": F("L", 0.12, -0.26, yaw=6), "foot.R": F("R", -0.14, 0.20, yaw=-28, pitch=30)}
    s1_down2 = deep_merge(s1_down, {"hips": {"pos": (0, -0.08 * k, -0.31 * k), "pitch": 16}, "chest": {"pitch": 15},
                                    "arm.L": {"upper": D(80, -36), "fore": D(64, -58)}})

    # 내리찍은 자세: 지팡이 아래 끝이 오른발 앞 땅의 한 점(S1_BUTT)에 정확히 닿도록 오른팔을 맞춘다
    S1_BUTT = np.array([-0.36 * k, -0.56 * k, 0.012])

    def planted(pose):
        P = M(pose)
        d = np.array(P["hand.R"]["blade"], dtype=float)
        P2, err = fit_grip(rm, P, S1_BUTT + d * STAFF_BUTT * k)
        print("[RIG] mage skill1 planted staff: grip fit error %.1f mm, upper %s fore %s" % (
            err * 1000, np.round(_ae(P2["arm.R"]["upper"]), 1), np.round(_ae(P2["arm.R"]["fore"]), 1)))
        return P2
    P_down = planted(s1_down)
    P_down2 = planted(s1_down2)
    P_up2 = M(deep_merge(s1_up, {"hips": {"pos": (0, 0.035 * k, 0.04 * k), "pitch": -7}, "chest": {"pitch": -13},
                                 "arm.R": {"upper": D(-70, 62), "fore": D(-110, 80)}, "hand.R": {"blade": D(180, 64)},
                                 "arm.L": {"upper": D(90, -8), "fore": D(98, 14)}}))
    s1k = Keyed([
        (0.00, BASE),
        (0.18, M({"hips": {"pos": (0, 0.0, -0.11 * k), "yaw": -18, "pitch": 9}, "chest": {"yaw": -8, "pitch": 7}, "head": {"yaw": 16, "pitch": -6},
                  "arm.R": {"upper": D(-62, -58), "fore": D(-16, -30)}, "hand.R": {"blade": D(14, 66)},
                  "arm.L": {"upper": D(60, -64), "fore": D(10, -40)}, "hand.L": {"face": D(70, 20)}}), "out"),
        (0.40, M(s1_up), "back"),
        (0.60, P_up2, "io"),
        (0.84, P_down, "in"),
        (0.98, P_down2, "out"),
        (1.25, BASE, "io"),
    ])
    # 내리찍는 도중(팔): 손이 옆으로 돌지 않고 머리 위 → 오른쪽 앞 → 땅으로 곧게 내려오도록 중간 자세를 거친다
    P_mid = deep_merge(P_down, {"shoulder.R": {"raise": 8, "fwd": 10},
                                "arm.R": {"upper": D(-42, 4), "fore": D(-24, 42)}, "hand.R": {"blade": D(180, 76)}})
    T0, T1 = 0.60, 0.84

    def s1(t):
        P = s1k(t)
        if T0 < t < T1:
            # 팔·지팡이는 점점 빨라지며 내려와 T1 에 땅을 찍고, 몸통은 한두 프레임 늦게 출발해 부드럽게 따라 내려앉는다
            ua = ((t - T0) / (T1 - T0)) ** 2
            ub = smooth01((t - T0 - 0.04) / (T1 - T0 - 0.04))
            P = _interp(P_up2, P_down, ub)
            Pa = _interp(P_up2, P_mid, ua / 0.5) if ua < 0.5 else _interp(P_mid, P_down, (ua - 0.5) / 0.5)
            for key in ("arm.R", "hand.R", "shoulder.R"):
                P[key] = Pa[key]
        if 0.40 <= t <= 0.60:      # 치켜든 채 기를 모으며 지팡이 끝이 작게 떨린다
            w = (t - 0.40) * 2 * PI * 10
            P["shoulder.R"]["raise"] += 1.0 * math.sin(w)
            P["chest"]["pitch"] += 0.8 * math.sin(w * 0.5)
        return P
    clips["skill1"] = dict(fn=s1, duration=1.25, loop=False, events={"cast": 0.84})

    # ---- 맞기: 상체가 뒤로 젖혀지고 지팡이로 버틴다
    hit = Keyed([
        (0.00, BASE),
        (0.0667, M({"hips": {"pos": (0, 0.11 * k, -0.06 * k), "yaw": -4, "pitch": -10}, "spine": {"pitch": -9}, "chest": {"yaw": 12, "pitch": -17},
                  "neck": {"pitch": 8}, "head": {"yaw": 4, "pitch": -12, "roll": 8}, "shoulder.L": {"raise": 12}, "shoulder.R": {"raise": 10},
                  "arm.R": {"upper": D(-70, -52), "fore": D(-30, 4)}, "hand.R": {"blade": D(-150, 66)},
                  "arm.L": {"upper": D(84, -30), "fore": D(50, 30)}, "hand.L": {"face": D(60, 40)},
                  "foot.R": F("R", -0.13, 0.24, yaw=-26), "foot.L": F("L", 0.105, -0.10, yaw=6, pitch=-14)}), "lin"),
        (0.22, M({"hips": {"pos": (0, 0.04 * k, -0.09 * k), "yaw": -16, "pitch": 6}, "spine": {"pitch": 4}, "chest": {"yaw": -4, "pitch": 8},
                  "head": {"yaw": 14, "pitch": 5}, "arm.R": {"upper": D(-56, -62), "fore": D(-10, -10)}, "hand.R": {"blade": D(10, 72)},
                  "foot.R": F("R", -0.13, 0.17, yaw=-26)}), "io"),
        (0.40, BASE, "io"),
    ])
    clips["hit"] = dict(fn=hit, duration=0.40, loop=False)

    # ---- 쓰러짐: 뒤로 휘청이며 지팡이 든 팔이 바깥으로 벌어지고, 무릎이 꺾이며 등으로 눕는다(마지막 자세 유지).
    #      넘어지는 동안 지팡이는 몸 오른쪽 바깥에 세워진 채 따라가다가, 눕는 순간 몸 옆에 길게 눕는다(다리와 겹치지 않게).
    lie = M({"hips": {"pos": (0, 0.64 * k, -0.86 * k), "yaw": -4, "pitch": -88, "roll": 3}, "spine": {"yaw": 0, "pitch": -2, "roll": 0},
             "chest": {"yaw": 3, "pitch": -2, "roll": 0}, "neck": {"yaw": 6, "pitch": 4, "roll": 0}, "head": {"yaw": 16, "pitch": 6, "roll": 6},
             "shoulder.L": {"raise": 6, "fwd": 0}, "shoulder.R": {"raise": 6, "fwd": 0},
             "arm.R": {"upper": D(-76, -5), "fore": D(-52, -3)}, "hand.R": {"blade": D(-160, 1)},
             "arm.L": {"upper": D(88, -5), "fore": D(124, -2)}, "hand.L": {"face": D(0, 86)},
             "foot.L": F("L", 0.27, 0.02, lift=-0.04, yaw=42, pitch=-34), "foot.R": F("R", -0.19, -0.20, lift=-0.04, yaw=-34, pitch=-46),
             "knee.L": {"up": 0.45, "out": 40.0}, "knee.R": {"up": 0.8, "out": 10.0}, "settle": 1.0})
    death = Keyed([
        (0.00, BASE),
        (0.18, M({"hips": {"pos": (0, 0.10 * k, -0.06 * k), "yaw": -10, "pitch": -10}, "spine": {"pitch": -8}, "chest": {"yaw": 4, "pitch": -16},
                  "head": {"yaw": 8, "pitch": -18}, "shoulder.R": {"raise": 10, "fwd": -4},
                  "arm.R": {"upper": D(-82, -36), "fore": D(-70, -6)}, "hand.R": {"blade": D(170, 78)},
                  "arm.L": {"upper": D(74, -40), "fore": D(60, -30)}, "hand.L": {"face": D(60, 30)},
                  "foot.R": F("R", -0.13, 0.24, yaw=-28)}), "out"),
        (0.46, M({"hips": {"pos": (0, 0.33 * k, -0.46 * k), "yaw": -8, "pitch": -44, "roll": 2}, "spine": {"yaw": 0, "pitch": -6, "roll": 0},
                  "chest": {"yaw": 3, "pitch": -12, "roll": 0}, "neck": {"yaw": 6, "pitch": 6, "roll": 0}, "head": {"yaw": 10, "pitch": 14, "roll": 4},
                  "shoulder.L": {"raise": 16, "fwd": 0}, "shoulder.R": {"raise": 14, "fwd": 0},
                  "arm.R": {"upper": D(-84, 14), "fore": D(-78, 34)}, "hand.R": {"blade": D(178, 66)},
                  "arm.L": {"upper": D(76, 32), "fore": D(66, 56)}, "hand.L": {"face": D(30, 50)},
                  "foot.L": F("L", 0.16, -0.17, yaw=18, pitch=-14), "foot.R": F("R", -0.17, 0.04, yaw=-30, pitch=-10),
                  "knee.L": {"up": 0.4, "out": 14.0}, "knee.R": {"up": 0.5, "out": 4.0}, "settle": 0.0}), "in"),
        (0.70, lie, "in"),
        (0.82, deep_merge(lie, {"hips": {"pos": (0, 0.645 * k, -0.83 * k), "pitch": -86}, "chest": {"pitch": 2}, "head": {"pitch": 9},
                                 "arm.R": {"upper": D(-78, 0), "fore": D(-55, 4)}, "hand.R": {"blade": D(-160, 4)},
                                 "arm.L": {"upper": D(89, 1), "fore": D(122, 5)}, "settle": 0.5}), "out"),
        (0.98, lie, "io"),
        (1.40, lie, "lin"),
    ])
    clips["death"] = dict(fn=death, duration=1.40, loop=False)
    _install_probe(rm, clips, k)
    return clips
