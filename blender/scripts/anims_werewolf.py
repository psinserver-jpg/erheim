"""늑대인간(사냥터 몬스터) 동작 세트. 무기 없음 — 발톱과 이빨로 싸운다.

기본은 등을 굽히고 팔을 앞으로 늘어뜨린 야수 자세. 전부 키 포즈/주기 함수로 직접 만든다.
"""
import math
from rigpose import D
from anims import Keyed, deep_merge, smooth01, PI


def V(x, y, z):
    n = math.sqrt(x * x + y * y + z * z) or 1.0
    return (x / n, y / n, z / n)


def werewolf_set(rm):
    k = rm.H / 1.8
    ra = rm.rest_ankle

    def F(s, x, y, lift=0.0, **kw):
        d = dict(pos=(x * k, y * k, ra[s][2] + lift * k))
        d.update(kw)
        return d

    # 야수 대기 자세: 무릎을 굽혀 낮추고, 등을 둥글게 말고, 머리는 앞으로 내밀고, 팔은 앞으로 늘어뜨린다
    BASE = {
        "hips": {"pos": (0.0, 0.05 * k, -0.13 * k), "yaw": -8, "pitch": 14, "roll": 0},
        "spine": {"yaw": 0, "pitch": 13, "roll": 0}, "chest": {"yaw": 0, "pitch": 15, "roll": 0},
        "neck": {"yaw": 4, "pitch": -14, "roll": 0}, "head": {"yaw": 4, "pitch": -18, "roll": 0},
        "shoulder.L": {"raise": 6, "fwd": 12}, "shoulder.R": {"raise": 6, "fwd": 12},
        "arm.L": {"upper": D(52, -70), "fore": D(8, -68)}, "hand.L": {"twist": 0, "flex": 10, "dev": 0},
        "arm.R": {"upper": D(-52, -70), "fore": D(-8, -68)}, "hand.R": {"twist": 0, "flex": 10, "dev": 0},
        "foot.L": F("L", 0.21, -0.11, yaw=12, pitch=0), "foot.R": F("R", -0.22, 0.12, yaw=-20, pitch=0),
        "knee.L": {"up": 0.0, "out": 6}, "knee.R": {"up": 0.0, "out": 6},
        "root_yaw": 0.0, "settle": 0.0,
    }
    M = lambda over: deep_merge(BASE, over)
    clips = {}

    def stepped(fn, steps):
        """steps: [(side, t0, t1, height)] — 그 구간에서 발을 들어 옮긴다(미끄러짐 방지)."""
        def g(t):
            P = dict(fn(t))
            for s_, t0, t1, h in steps:
                if t0 < t < t1:
                    u = (t - t0) / (t1 - t0)
                    f = dict(P["foot." + s_]); x, y, z = f["pos"]
                    f["pos"] = (x, y, z + h * k * math.sin(PI * u))
                    f["pitch"] = f.get("pitch", 0) + 10 * math.sin(PI * u)
                    P["foot." + s_] = f
            return P
        return g

    # ---- 대기 (2.4초 반복): 거친 숨, 좌우로 무게를 옮기며 발톱을 까딱인다
    def idle(t):
        w = 2 * PI * t / 2.4
        b = math.sin(w); c = math.cos(w); b2 = math.sin(w - 0.8)
        pant = math.sin(2 * w)                      # 숨은 한 주기에 두 번
        tw_r = max(0.0, math.sin(3 * w)) ** 2       # 발톱 까딱임(오른손)
        tw_l = max(0.0, math.sin(3 * w + 2.1)) ** 2
        return M({
            "hips": {"pos": (0.018 * k * b, 0.05 * k, (-0.13 + 0.012 * pant) * k), "yaw": -8 + 2.0 * b, "pitch": 14 + 1.2 * pant, "roll": 1.5 * b},
            "spine": {"pitch": 13 - 1.5 * pant, "roll": -1.0 * b}, "chest": {"pitch": 15 + 6.5 * pant, "yaw": -2.0 * b},
            "neck": {"yaw": 4 + 5 * b2, "pitch": -14 - 1.5 * pant}, "head": {"yaw": 4 + 9 * b2, "pitch": -18 + 2.5 * c, "roll": 3 * b2},
            "shoulder.L": {"raise": 7 + 7.5 * pant, "fwd": 12}, "shoulder.R": {"raise": 7 + 7.5 * pant, "fwd": 12},
            "arm.L": {"upper": D(52 + 2 * c, -70 + 2.0 * pant), "fore": D(8 + 4 * b - 10 * tw_l, -68 + 5 * pant + 26 * tw_l)},
            "hand.L": {"twist": 8 * tw_l, "flex": 10 - 34 * tw_l, "dev": 0},
            "arm.R": {"upper": D(-52 + 2 * c, -70 + 2.0 * pant), "fore": D(-8 + 4 * b + 10 * tw_r, -68 + 5 * pant + 26 * tw_r)},
            "hand.R": {"twist": -8 * tw_r, "flex": 10 - 34 * tw_r, "dev": 0},
        })
    clips["idle"] = dict(fn=idle, duration=2.4, loop=True)

    # ---- 보행 주기: 걷기(어슬렁) / 달리기(숙이고 성큼성큼) 공용
    def gait(t, T, stride, lift, lean, bob, heel, swing, width, drop, yoff, reach, armx=0.34, shamp=8):
        ph = 2 * PI * t / T
        out = {}
        def foot(s, phi):
            phi = phi % (2 * PI)
            sgn = 1.0 if s == "L" else -1.0
            y = (yoff - stride * math.cos(phi))
            if phi <= PI:                                   # 디딤
                u = phi / PI
                lz = 0.0
                if u < 0.3:
                    pitch = -heel * 0.2 * (1 - u / 0.3)
                elif u < 0.5:
                    pitch = 0.0
                else:
                    pitch = heel * smooth01((u - 0.5) / 0.5)
            else:                                           # 내딛는 발
                u = (phi - PI) / PI
                lz = lift * math.sin(PI * u) * (1 - 0.35 * (2 * u - 1))
                if u < 0.3:
                    pitch = heel + (heel * 0.5) * smooth01(u / 0.3)
                else:
                    pitch = heel * 1.5 + (-heel * 0.2 - heel * 1.5) * smooth01((u - 0.3) / 0.7)
            return F(s, sgn * width, y, lift=lz, pitch=pitch, yaw=sgn * 9)
        out["foot.R"] = foot("R", ph)
        out["foot.L"] = foot("L", ph + PI)
        cR = math.cos(ph); sR = math.sin(ph)
        bobz = bob * math.cos(2 * ph + 0.4 * PI)
        out["hips"] = {"pos": (-0.022 * k * sR, 0.05 * k, (-drop + bobz) * k),
                       "yaw": 9 * cR * (stride / 0.3), "pitch": lean * 0.36 + 2.0 * math.cos(2 * ph), "roll": 3.5 * sR}
        out["spine"] = {"yaw": -6 * cR, "pitch": lean * 0.32, "roll": -2.0 * sR}
        out["chest"] = {"yaw": -9 * cR, "pitch": lean * 0.32 - 2.5 * math.cos(2 * ph), "roll": -2.0 * sR}
        out["neck"] = {"yaw": 5 * cR, "pitch": -lean * 0.36, "roll": 0}
        out["head"] = {"yaw": 6 * cR, "pitch": -lean * 0.42 + 2.5 * math.cos(2 * ph + 0.8), "roll": 2.0 * sR}
        s = cR                                             # +1: 오른발이 앞 → 왼팔이 앞
        sl = s * swing; sr = -s * swing                    # 팔 앞뒤 흔들림(+ 앞)
        out["shoulder.L"] = {"raise": 6, "fwd": 10 + shamp * s}
        out["shoulder.R"] = {"raise": 6, "fwd": 10 - shamp * s}
        # 팔: 늘어뜨린 채 앞뒤로 크게 젓는다. 팔꿈치는 항상 앞으로 접힌다.
        out["arm.L"] = {"upper": V(armx, -(0.10 + 0.75 * sl), -1.0), "fore": V(0.06, -(0.55 + reach * max(sl, -0.45)), -1.0 + 0.35 * max(sl, 0))}
        out["arm.R"] = {"upper": V(-armx, -(0.10 + 0.75 * sr), -1.0), "fore": V(-0.06, -(0.55 + reach * max(sr, -0.45)), -1.0 + 0.35 * max(sr, 0))}
        out["hand.L"] = {"twist": 0, "flex": 14 + 10 * sl, "dev": 0}
        out["hand.R"] = {"twist": 0, "flex": 14 + 10 * sr, "dev": 0}
        out["knee.L"] = {"up": 0.0, "out": 8}; out["knee.R"] = {"up": 0.0, "out": 8}
        out["root_yaw"] = 0.0; out["settle"] = 0.0
        return out
    #                                   T        stride lift  lean bob    heel swing width drop  yoff  reach
    clips["walk"] = dict(fn=lambda t: gait(t, 36 / 30, 0.21, 0.10, 44, 0.016, 26, 0.62, 0.17, 0.15, 0.02, 0.5, 0.36, 12), duration=36 / 30, loop=True)
    clips["run"] = dict(fn=lambda t: gait(t, 18 / 30, 0.36, 0.26, 66, 0.040, 44, 1.0, 0.16, 0.17, 0.00, 1.1, 0.47, 10), duration=18 / 30, loop=True)

    # ---- 공격 1: 오른 발톱을 뒤로 크게 젖혔다가 사선으로 할퀸다
    a1 = Keyed([
        (0.00, BASE),
        (0.17, M({"hips": {"pos": (0.02 * k, 0.10 * k, -0.22 * k), "yaw": -20, "pitch": 18}, "spine": {"yaw": -8, "pitch": 13},
                  "chest": {"yaw": -20, "pitch": 16, "roll": -6}, "neck": {"yaw": 18, "pitch": -12}, "head": {"yaw": 24, "pitch": -16},
                  "shoulder.R": {"raise": 12, "fwd": -10}, "arm.R": {"upper": D(-112, -20), "fore": D(-66, 12)}, "hand.R": {"twist": -25, "flex": -28, "dev": 0},
                  "shoulder.L": {"raise": 6, "fwd": 18}, "arm.L": {"upper": D(40, -56), "fore": D(12, -40)},
                  "foot.L": F("L", 0.21, -0.11, yaw=12), "foot.R": F("R", -0.22, 0.14, yaw=-24, pitch=6)}), "out"),
        (0.24, M({"hips": {"pos": (0, -0.05 * k, -0.16 * k), "yaw": -4, "pitch": 14}, "spine": {"yaw": 0, "pitch": 12},
                  "chest": {"yaw": 2, "pitch": 14, "roll": 0}, "neck": {"yaw": 4, "pitch": -12}, "head": {"yaw": 4, "pitch": -14},
                  "shoulder.R": {"raise": 14, "fwd": 14}, "arm.R": {"upper": D(-60, -6), "fore": D(-26, 12)}, "hand.R": {"twist": -15, "flex": -22, "dev": 0},
                  "arm.L": {"upper": D(60, -52), "fore": D(30, -24)},
                  "foot.L": F("L", 0.21, -0.24, lift=0.05, yaw=10, pitch=-6), "foot.R": F("R", -0.22, 0.16, yaw=-24, pitch=18)}), "in"),
        (0.29, M({"hips": {"pos": (-0.02 * k, -0.17 * k, -0.23 * k), "yaw": 14, "pitch": 20}, "spine": {"yaw": 8, "pitch": 14},
                  "chest": {"yaw": 24, "pitch": 20, "roll": 8}, "neck": {"yaw": -18, "pitch": -14}, "head": {"yaw": -24, "pitch": -14},
                  "shoulder.R": {"raise": 4, "fwd": 16}, "arm.R": {"upper": D(-44, -14), "fore": D(-22, -30)}, "hand.R": {"twist": 0, "flex": 28, "dev": 0},
                  "shoulder.L": {"raise": 6, "fwd": -4}, "arm.L": {"upper": D(100, -60), "fore": D(108, -50)},
                  "foot.L": F("L", 0.21, -0.32, yaw=10), "foot.R": F("R", -0.22, 0.20, yaw=-24, pitch=30)}), "lin"),
        (0.38, M({"hips": {"pos": (-0.03 * k, -0.19 * k, -0.26 * k), "yaw": 19, "pitch": 22}, "spine": {"yaw": 10, "pitch": 15},
                  "chest": {"yaw": 32, "pitch": 23, "roll": 10}, "neck": {"yaw": -22, "pitch": -14}, "head": {"yaw": -30, "pitch": -12},
                  "shoulder.R": {"raise": 0, "fwd": 16}, "arm.R": {"upper": D(-14, -42), "fore": D(28, -46)}, "hand.R": {"twist": 0, "flex": 34, "dev": 0},
                  "shoulder.L": {"raise": 6, "fwd": -6}, "arm.L": {"upper": D(104, -60), "fore": D(114, -48)},
                  "foot.L": F("L", 0.21, -0.32, yaw=10), "foot.R": F("R", -0.22, 0.20, yaw=-24, pitch=32)}), "out"),
        (0.60, BASE, "io"),
    ])
    clips["attack1"] = dict(fn=stepped(a1, [("L", 0.40, 0.57, 0.055)]), duration=0.60, loop=False, events={"hit": 0.29})

    # ---- 공격 2: 웅크렸다 몸을 일으켜 양 발톱을 치켜들고, 덤벼들며 내려찍고 문다
    def both(az_u, el_u, az_f, el_f, flex=10):
        return {"arm.L": {"upper": D(az_u, el_u), "fore": D(az_f, el_f)}, "arm.R": {"upper": D(-az_u, el_u), "fore": D(-az_f, el_f)},
                "hand.L": {"twist": 0, "flex": flex, "dev": 0}, "hand.R": {"twist": 0, "flex": flex, "dev": 0}}
    a2 = Keyed([
        (0.00, BASE),
        (0.13, M(deep_merge(both(120, -58, 60, -40, 0), {
                  "hips": {"pos": (0, 0.09 * k, -0.27 * k), "yaw": -4, "pitch": 24}, "spine": {"pitch": 16}, "chest": {"pitch": 16},
                  "neck": {"pitch": -20}, "head": {"yaw": 0, "pitch": -24},
                  "shoulder.L": {"raise": 10, "fwd": 0}, "shoulder.R": {"raise": 10, "fwd": 0}})), "out"),
        (0.21, M(deep_merge(both(84, -48, 18, 26, -15), {
                  "hips": {"pos": (0, 0.09 * k, -0.23 * k), "yaw": -3, "pitch": 22}, "spine": {"pitch": 14}, "chest": {"pitch": 14},
                  "neck": {"yaw": 0, "pitch": -8}, "head": {"yaw": 0, "pitch": -26},
                  "shoulder.L": {"raise": 12, "fwd": 0}, "shoulder.R": {"raise": 12, "fwd": 0}})), "lin"),
        (0.30, M(deep_merge(both(66, -24, 14, 42, -28), {
                  "hips": {"pos": (0, 0.09 * k, -0.17 * k), "yaw": -2, "pitch": 19}, "spine": {"pitch": 12}, "chest": {"pitch": 13},
                  "neck": {"yaw": 0, "pitch": 0}, "head": {"yaw": 0, "pitch": -28},
                  "shoulder.L": {"raise": 14, "fwd": 2}, "shoulder.R": {"raise": 14, "fwd": 2},
                  "foot.L": F("L", 0.21, -0.11, yaw=12, pitch=12), "foot.R": F("R", -0.22, 0.12, yaw=-20, pitch=18)})), "out"),
        (0.37, M(deep_merge(both(34, -8, 6, 20, -10), {
                  "hips": {"pos": (0, -0.08 * k, -0.14 * k), "yaw": 0, "pitch": 17}, "spine": {"pitch": 11}, "chest": {"pitch": 14},
                  "neck": {"yaw": 0, "pitch": 2}, "head": {"yaw": 0, "pitch": -24},
                  "shoulder.L": {"raise": 14, "fwd": 12}, "shoulder.R": {"raise": 14, "fwd": 12},
                  "foot.L": F("L", 0.21, -0.26, lift=0.06, yaw=10, pitch=-6), "foot.R": F("R", -0.22, 0.16, yaw=-20, pitch=26)})), "in"),
        (0.42, M(deep_merge(both(16, -34, -6, -50, 30), {
                  "hips": {"pos": (0, -0.22 * k, -0.26 * k), "yaw": 2, "pitch": 28}, "spine": {"pitch": 16}, "chest": {"pitch": 26},
                  "neck": {"yaw": 0, "pitch": -14}, "head": {"yaw": 0, "pitch": -20},
                  "shoulder.L": {"raise": 0, "fwd": 15}, "shoulder.R": {"raise": 0, "fwd": 15},
                  "foot.L": F("L", 0.22, -0.38, yaw=10), "foot.R": F("R", -0.23, 0.18, yaw=-20, pitch=34)})), "lin"),
        (0.52, M(deep_merge(both(16, -42, -8, -58, 36), {
                  "hips": {"pos": (0, -0.23 * k, -0.28 * k), "yaw": 2, "pitch": 30}, "spine": {"pitch": 17}, "chest": {"pitch": 28},
                  "neck": {"yaw": 0, "pitch": -8}, "head": {"yaw": 0, "pitch": -6},
                  "shoulder.L": {"raise": 0, "fwd": 15}, "shoulder.R": {"raise": 0, "fwd": 15},
                  "foot.L": F("L", 0.22, -0.38, yaw=10), "foot.R": F("R", -0.23, 0.18, yaw=-20, pitch=34)})), "out"),
        (0.72, BASE, "io"),
    ])
    clips["attack2"] = dict(fn=stepped(a2, [("L", 0.54, 0.70, 0.055)]), duration=0.72, loop=False, events={"hit": 0.42})

    # ---- 맞기: 머리와 어깨가 뒤로 젖혀지며 움찔, 으르렁거리며 되돌아온다
    hit = Keyed([
        (0.00, BASE),
        (0.07, M({"hips": {"pos": (0.02 * k, 0.15 * k, -0.17 * k), "yaw": -11, "pitch": 8}, "spine": {"yaw": -2, "pitch": 6},
                  "chest": {"yaw": -6, "pitch": 4, "roll": -5}, "neck": {"yaw": -4, "pitch": -10}, "head": {"yaw": -10, "pitch": -12, "roll": -9},
                  "shoulder.L": {"raise": 16, "fwd": 2}, "shoulder.R": {"raise": 14, "fwd": -4},
                  "arm.L": {"upper": D(70, -62), "fore": D(34, -58)}, "hand.L": {"twist": 0, "flex": -10, "dev": 0},
                  "arm.R": {"upper": D(-82, -58), "fore": D(-46, -56)}, "hand.R": {"twist": 0, "flex": -10, "dev": 0},
                  "foot.R": F("R", -0.23, 0.22, yaw=-24)}), "out3"),
        (0.20, M({"hips": {"pos": (0, 0.08 * k, -0.19 * k), "yaw": -10, "pitch": 18}, "spine": {"pitch": 15}, "chest": {"yaw": 0, "pitch": 18},
                  "neck": {"yaw": 6, "pitch": -16}, "head": {"yaw": 8, "pitch": -22},
                  "foot.R": F("R", -0.23, 0.19, yaw=-22)}), "io"),
        (0.40, BASE, "io"),
    ])
    clips["hit"] = dict(fn=hit, duration=0.40, loop=False)

    # ---- 쓰러짐: 울부짖듯 몸이 젖혀지고, 무릎이 꺾이며 뒤로 넘어가 큰대자로 눕는다(마지막 자세 유지)
    lie = M({"hips": {"pos": (0, 0.62 * k, -0.84 * k), "yaw": -6, "pitch": -88, "roll": 4}, "spine": {"yaw": 0, "pitch": -2, "roll": 0},
             "chest": {"yaw": 4, "pitch": -2, "roll": 0}, "neck": {"yaw": 8, "pitch": -6, "roll": 0}, "head": {"yaw": 20, "pitch": -12, "roll": 8},
             "shoulder.L": {"raise": 8, "fwd": 0}, "shoulder.R": {"raise": 8, "fwd": 0},
             "arm.R": {"upper": D(-68, -4), "fore": D(-36, -2)}, "hand.R": {"twist": 0, "flex": 20, "dev": 0},
             "arm.L": {"upper": D(96, -4), "fore": D(136, -2)}, "hand.L": {"twist": 0, "flex": 20, "dev": 0},
             "foot.L": F("L", 0.24, -0.10, lift=-0.04, yaw=26, pitch=-50), "foot.R": F("R", -0.27, -0.20, lift=-0.04, yaw=-34, pitch=-60),
             "knee.L": {"up": 0.6, "out": 0}, "knee.R": {"up": 0.55, "out": 0}, "settle": 1.0})
    death = Keyed([
        (0.00, BASE),
        (0.20, M({"hips": {"pos": (0, 0.12 * k, -0.10 * k), "yaw": -14, "pitch": -4, "roll": 3}, "spine": {"pitch": -6}, "chest": {"yaw": 8, "pitch": -16},
                  "neck": {"yaw": 0, "pitch": -6}, "head": {"yaw": 6, "pitch": -26, "roll": 6},
                  "shoulder.L": {"raise": 22, "fwd": -6}, "shoulder.R": {"raise": 22, "fwd": -6},
                  "arm.R": {"upper": D(-58, -34), "fore": D(-24, 20)}, "hand.R": {"twist": 0, "flex": -20, "dev": 0},
                  "arm.L": {"upper": D(70, -44), "fore": D(40, -6)}, "hand.L": {"twist": 0, "flex": -20, "dev": 0},
                  "foot.R": F("R", -0.23, 0.26, yaw=-26)}), "out"),
        (0.50, M({"hips": {"pos": (0.02 * k, 0.26 * k, -0.30 * k), "yaw": -14, "pitch": -24, "roll": 8}, "spine": {"pitch": -6}, "chest": {"yaw": 4, "pitch": -12},
                  "neck": {"yaw": 4, "pitch": 4}, "head": {"yaw": 10, "pitch": 4, "roll": 6},
                  "shoulder.L": {"raise": 14, "fwd": 0}, "shoulder.R": {"raise": 14, "fwd": 0},
                  "arm.R": {"upper": D(-70, -30), "fore": D(-56, -10)}, "hand.R": {"twist": 0, "flex": 0, "dev": 0},
                  "arm.L": {"upper": D(76, -30), "fore": D(64, -10)}, "hand.L": {"twist": 0, "flex": 0, "dev": 0},
                  "foot.L": F("L", 0.22, -0.12, yaw=16, pitch=-6), "foot.R": F("R", -0.27, 0.40, yaw=-32, pitch=6),
                  "knee.L": {"up": 0.2, "out": 6}, "knee.R": {"up": 0.2, "out": 6}}), "io"),
        (0.72, M({"hips": {"pos": (0, 0.42 * k, -0.56 * k), "yaw": -8, "pitch": -54, "roll": 4}, "spine": {"pitch": -6}, "chest": {"yaw": 4, "pitch": -10},
                  "neck": {"yaw": 6, "pitch": 8}, "head": {"yaw": 14, "pitch": 14, "roll": 6},
                  "shoulder.L": {"raise": 16, "fwd": 0}, "shoulder.R": {"raise": 16, "fwd": 0},
                  "arm.R": {"upper": D(-70, 30), "fore": D(-56, 54)}, "hand.R": {"twist": 0, "flex": 0, "dev": 0},
                  "arm.L": {"upper": D(78, 30), "fore": D(70, 54)}, "hand.L": {"twist": 0, "flex": 0, "dev": 0},
                  "foot.L": F("L", 0.23, -0.12, yaw=20, pitch=-20), "foot.R": F("R", -0.26, 0.22, yaw=-32, pitch=-16),
                  "knee.L": {"up": 0.6, "out": 0}, "knee.R": {"up": 0.6, "out": 0}}), "in"),
        (0.90, lie, "in"),
        (1.02, deep_merge(lie, {"hips": {"pos": (0, 0.63 * k, -0.78 * k), "pitch": -84}, "chest": {"pitch": 5}, "head": {"pitch": 12},
                                 "arm.R": {"upper": D(-72, 8), "fore": D(-44, 14)}, "arm.L": {"upper": D(98, 8), "fore": D(134, 14)},
                                 "settle": 0.0}), "out"),
        (1.18, lie, "io"),
        (1.40, lie, "lin"),
    ])
    clips["death"] = dict(fn=stepped(death, [("R", 0.22, 0.48, 0.06)]), duration=1.40, loop=False)
    return clips
