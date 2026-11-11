"""해골 기사(묘지 언데드) 동작 세트. 전부 직접 만든 키 포즈/주기 함수다.

연기: 관절이 뚝뚝 끊기듯(ratchet) 움직이고, 타격 순간만 날카롭다. 고개는 늘 왼쪽으로 기울어 있다.
"""
import math
from rigpose import D
from anims import Keyed, deep_merge, smooth01, PI


def ratchet(u, n, sharp=0.4):
    """위상 u(0~1 주기)를 n 번 '탁, 멈춤' 하는 계단형으로 바꾼다(주기성 유지)."""
    x = u * n
    i = math.floor(x)
    f = x - i
    return (i + smooth01(min(1.0, f / sharp))) / n


def bump(x):
    """x=0 에서 1, |x|>=1 에서 0 인 짧은 튐."""
    if abs(x) >= 1:
        return 0.0
    return (1 - x * x) ** 2


def skeleton_knight_set(rm):
    k = rm.H / 1.8
    ra = rm.rest_ankle

    def F(s, x, y, lift=0.0, **kw):
        d = dict(pos=(x * k, y * k, ra[s][2] + lift * k), yaw=0.0, pitch=0.0, roll=0.0)
        d.update(kw)
        return d

    # 기본 자세: 구부정하게 서서 검을 앞으로 늘어뜨린다. 방패 든 왼팔은 축 처져 있다. 고개는 왼쪽으로 기울었다.
    BASE = {
        "hips": {"pos": (0.0, 0.0, -0.05 * k), "yaw": -10, "pitch": 4, "roll": -2},
        "spine": {"yaw": 0, "pitch": 7, "roll": -2}, "chest": {"yaw": -2, "pitch": 9, "roll": -3},
        "neck": {"yaw": 4, "pitch": 8, "roll": 4}, "head": {"yaw": 10, "pitch": -8, "roll": 13},
        "shoulder.L": {"raise": -3, "fwd": 4}, "shoulder.R": {"raise": 3, "fwd": 6},
        "arm.R": {"upper": D(-40, -78), "fore": D(-12, -80)}, "hand.R": {"blade": D(-4, -43)},
        "arm.L": {"upper": D(62, -76), "fore": D(30, -64)}, "hand.L": {"face": D(48, -6)},
        "foot.L": F("L", 0.165, -0.07, yaw=8), "foot.R": F("R", -0.185, 0.09, yaw=-24),
        "knee.L": {"up": 0.0, "out": 0.0}, "knee.R": {"up": 0.0, "out": 0.0},
        "root_yaw": 0.0, "settle": 0.0,
    }
    M = lambda over: deep_merge(BASE, over)
    clips = {}

    # ---- 대기(3.2초 반복): 삐걱거리며 좌우로 흔들리고, 가끔 고개가 탁 꺾인다
    TI = 3.2
    def idle(t):
        u = (t / TI) % 1.0
        w = 2 * PI * ratchet(u, 6, 0.38)          # 뚝뚝 끊기는 흔들림
        ws = 2 * PI * u                           # 부드러운 바탕
        b = math.sin(w); c = math.cos(w)
        bs = math.sin(ws)
        tw = bump((t - 2.05) / 0.11) - 0.5 * bump((t - 2.26) / 0.10)      # 고개 경련
        tw2 = bump((t - 0.85) / 0.12)                                     # 검 든 팔이 움찔
        return M({
            "hips": {"pos": (0.022 * k * b, 0.008 * k * c, (-0.05 - 0.008 * c) * k), "yaw": -10 + 2.0 * c, "roll": -2 + 2.2 * b},
            "spine": {"pitch": 7 + 1.5 * c, "roll": -2 - 2.0 * b}, "chest": {"pitch": 9 + 2.0 * bs, "roll": -3 - 2.5 * b, "yaw": -2 + 2.5 * c},
            "neck": {"roll": 4 + 2 * b + 5 * tw}, "head": {"yaw": 10 - 3 * c - 10 * tw, "pitch": -8 + 2 * b + 4 * tw, "roll": 13 + 3 * b + 11 * tw},
            "shoulder.L": {"raise": -3 + 2 * c}, "shoulder.R": {"raise": 3 + 2 * b + 7 * tw2},
            "arm.R": {"upper": D(-40 + 3 * c, -78 + 2 * b + 4 * tw2), "fore": D(-12 + 5 * b, -80 + 3 * c + 10 * tw2)},
            "hand.R": {"blade": D(-4 + 9 * b, -43 + 4 * c + 9 * tw2)},
            "arm.L": {"upper": D(62 - 3 * b, -76 + 2 * c), "fore": D(30 - 8 * b, -64 + 4 * c)},
            "hand.L": {"face": D(48 - 6 * b, -6)},
        })
    clips["idle"] = dict(fn=idle, duration=TI, loop=True)

    # ---- 발 한 짝의 보행 궤적: 디딤(등속으로 뒤로) + 내딛기
    def step(s, p, duty, S, lift, x, yc, yaw, heel, toe_drag=0.0):
        p = p % 1.0
        if p < duty:
            u = p / duty
            y = yc - S + 2 * S * u
            lz = 0.0
            if u < 0.2:
                pitch = -heel * 0.3 * (1 - u / 0.2)
            elif u < 0.6:
                pitch = 0.0
            else:
                pitch = heel * smooth01((u - 0.6) / 0.4)
        else:
            u = (p - duty) / (1 - duty)
            y = yc + S - 2 * S * smooth01(u)
            lz = lift * math.sin(PI * u) * (1 - 0.3 * (2 * u - 1))
            pitch = heel + (-heel * 0.3 - heel) * smooth01(u) + (heel * 0.6 + toe_drag) * math.sin(PI * u)
        return F(s, x, y, lift=lz, pitch=pitch, yaw=yaw)

    # ---- 걷기(1.6초 반복): 오른 다리를 끌며 절뚝인다. 성한 왼발은 빨리 딛고, 오른발은 땅을 긁으며 따라온다
    TW = 1.6
    def walk(t):
        p = (t / TW) % 1.0
        out = {}
        out["foot.L"] = step("L", p, 0.56, 0.170, 0.085, 0.150, -0.03, 6, 18)
        out["foot.R"] = step("R", p + 0.5, 0.62, 0.188, 0.018, -0.175, 0.07, -26, 8, toe_drag=14)
        pu = ratchet(p, 4, 0.55)                      # 윗몸은 끊기듯 따라온다
        a = 2 * PI * (pu - 0.80)                      # p=0.80: 아픈 오른 다리에 체중이 실린 순간
        ca = math.cos(a); sa = math.sin(a)
        cs = math.cos(2 * PI * (p - 0.80))
        out["hips"] = {"pos": (-0.030 * k * cs, 0.0, (-0.065 - 0.040 * cs) * k), "yaw": -6 + 7 * math.sin(2 * PI * p), "pitch": 6 + 3 * cs, "roll": -2 - 5 * cs}
        out["spine"] = {"yaw": -3 * sa, "pitch": 8 + 3 * ca, "roll": -2 + 2 * ca}
        out["chest"] = {"yaw": -2 - 5 * sa, "pitch": 10 + 6 * ca, "roll": -3 - 4 * ca}
        out["neck"] = {"yaw": 4, "pitch": 8 - 3 * ca, "roll": 4 + 3 * ca}
        out["head"] = {"yaw": 10 + 4 * sa, "pitch": -10 - 4 * ca, "roll": 13 + 6 * ca}
        out["shoulder.L"] = {"raise": -3 - 3 * ca, "fwd": 4}
        out["shoulder.R"] = {"raise": 3 + 4 * ca, "fwd": 6}
        out["arm.R"] = {"upper": D(-40 - 8 * sa, -78 + 2 * ca), "fore": D(-12 - 10 * sa, -80 + 4 * ca)}
        out["hand.R"] = {"blade": D(-4 + 6 * sa, -44 + 4 * ca)}
        out["arm.L"] = {"upper": D(64 + 14 * sa, -78), "fore": D(30 + 22 * sa, -66 - 6 * ca)}
        out["hand.L"] = {"face": D(50, -6)}
        out["knee.L"] = {"up": 0.0, "out": 4.0}; out["knee.R"] = {"up": 0.0, "out": 10.0}
        out["root_yaw"] = 0.0; out["settle"] = 0.0
        return out
    clips["walk"] = dict(fn=walk, duration=TW, loop=True)

    # ---- 달리기(0.64초 반복): 앞으로 쏟아질 듯 숙이고, 검은 오른쪽 뒤로 끌며 달린다
    TR = 0.64
    def run(t):
        p = (t / TR) % 1.0
        out = {}
        out["foot.R"] = step("R", p, 0.42, 0.33, 0.20, -0.135, 0.05, -10, 34)
        out["foot.L"] = step("L", p + 0.5, 0.42, 0.33, 0.24, 0.125, 0.05, 5, 38)
        ph = 2 * PI * p
        cR = math.cos(ph + 0.6); sR = math.sin(ph + 0.6)        # +1 근처: 오른발이 앞
        jr = 2 * PI * ratchet(p, 2, 0.6)
        jc = math.cos(jr + 0.6)
        out["hips"] = {"pos": (-0.014 * k * sR, -0.02 * k, (-0.10 + 0.032 * math.cos(2 * ph + 1.5)) * k), "yaw": 8 * cR, "pitch": 15, "roll": 3.5 * sR}
        out["spine"] = {"yaw": -5 * cR, "pitch": 9, "roll": -2 * sR}
        out["chest"] = {"yaw": -8 * cR - 6, "pitch": 12, "roll": -4 - 2 * sR}
        out["neck"] = {"yaw": 4 * cR, "pitch": -8, "roll": 4}
        out["head"] = {"yaw": 6 + 4 * cR, "pitch": -16 + 3 * jc, "roll": 13 + 4 * jc}
        out["shoulder.L"] = {"raise": 0, "fwd": 4 + 6 * cR}
        out["shoulder.R"] = {"raise": 2, "fwd": -6}
        out["arm.L"] = {"upper": D(48 - 30 * cR, -66 + 6 * cR), "fore": D(-10 - 26 * cR, -30 + 22 * cR)}
        out["hand.L"] = {"face": D(40, 0)}
        out["arm.R"] = {"upper": D(-112 - 8 * cR, -66), "fore": D(-150, -78 - 4 * cR)}
        out["hand.R"] = {"blade": D(-164 - 4 * sR, -33 - 4 * cR)}
        out["knee.L"] = {"up": 0.0, "out": 0.0}; out["knee.R"] = {"up": 0.0, "out": 0.0}
        out["root_yaw"] = 0.0; out["settle"] = 0.0
        return out
    clips["run"] = dict(fn=run, duration=TR, loop=True)

    # ---- 공격 1: 위에서 아래로 내려베기(0.6초). 삐걱 들어 올림 → 순간 정지 → 번개처럼 내리침 → 덜컥 멈춤
    up1 = M({"hips": {"pos": (0, 0.04 * k, -0.02 * k), "yaw": -16, "pitch": -4, "roll": 0}, "spine": {"pitch": -3}, "chest": {"yaw": -8, "pitch": -8, "roll": 0},
             "neck": {"pitch": 2}, "head": {"yaw": 22, "pitch": 4, "roll": 16},
             "shoulder.R": {"raise": 20, "fwd": 0},
             "arm.R": {"upper": D(-48, 48), "fore": D(170, 62)}, "hand.R": {"blade": D(176, 28)},
             "arm.L": {"upper": D(50, -58), "fore": D(-6, -24)}, "hand.L": {"face": D(20, 0)},
             "foot.L": F("L", 0.165, -0.10, yaw=8, pitch=8), "foot.R": F("R", -0.185, 0.10, yaw=-24)})
    mid1 = M({"hips": {"pos": (0, -0.08 * k, -0.07 * k), "yaw": -8, "pitch": 8}, "spine": {"pitch": 6}, "chest": {"yaw": -2, "pitch": 12, "roll": -2},
              "head": {"yaw": 8, "pitch": -8, "roll": 13}, "shoulder.R": {"raise": 12, "fwd": 10},
              "arm.R": {"upper": D(-22, 26), "fore": D(-8, 34)}, "hand.R": {"blade": D(-2, 62)},
              "arm.L": {"upper": D(70, -62), "fore": D(40, -50)},
              "foot.L": F("L", 0.165, -0.26, lift=0.05, yaw=6, pitch=-6), "foot.R": F("R", -0.185, 0.14, yaw=-24, pitch=18)})
    cut1 = M({"hips": {"pos": (0, -0.17 * k, -0.20 * k), "yaw": 2, "pitch": 18}, "spine": {"pitch": 10}, "chest": {"yaw": 8, "pitch": 22, "roll": -4},
              "neck": {"pitch": 0}, "head": {"yaw": -4, "pitch": -24, "roll": 14}, "shoulder.R": {"raise": 0, "fwd": 18},
              "arm.R": {"upper": D(-10, -28), "fore": D(-2, -36)}, "hand.R": {"blade": D(2, -26)},
              "arm.L": {"upper": D(86, -50), "fore": D(110, -40)}, "hand.L": {"face": D(80, -10)},
              "foot.L": F("L", 0.17, -0.36, yaw=6), "foot.R": F("R", -0.19, 0.20, yaw=-24, pitch=34)})
    stop1 = deep_merge(cut1, {"hips": {"pos": (0, -0.18 * k, -0.23 * k), "pitch": 20}, "chest": {"pitch": 24},
                              "arm.R": {"upper": D(-10, -34), "fore": D(-2, -44)}, "hand.R": {"blade": D(3, -33)},
                              "head": {"pitch": -27, "roll": 20}})
    a1 = Keyed([
        (0.00, BASE),
        (0.20, up1, "out"),
        (0.25, deep_merge(up1, {"chest": {"pitch": -10}, "head": {"roll": 19}, "hand.R": {"blade": D(178, 24)}}), "lin"),
        (0.29, mid1, "in"),
        (0.33, cut1, "lin"),
        (0.43, stop1, "out3"),
        (0.60, BASE, "io"),
    ])
    clips["attack1"] = dict(fn=a1, duration=0.60, loop=False, events={"hit": 0.33})

    # ---- 공격 2: 옆으로 크게 휘두르기(0.7초). 오른쪽 뒤로 한껏 비틀었다가 왼쪽 끝까지 후려친다
    wind2 = M({"hips": {"pos": (0, 0.05 * k, -0.09 * k), "yaw": -30, "pitch": 5, "roll": -3}, "spine": {"yaw": -8, "pitch": 5}, "chest": {"yaw": -26, "pitch": 6, "roll": -4},
               "neck": {"yaw": 14}, "head": {"yaw": 44, "pitch": -6, "roll": 15},
               "shoulder.R": {"raise": 8, "fwd": -12},
               "arm.R": {"upper": D(-55, -10), "fore": D(-95, 8)}, "hand.R": {"blade": D(-130, 12)},
               "arm.L": {"upper": D(30, -52), "fore": D(-30, -6)}, "hand.L": {"face": D(10, 0)},
               "foot.L": F("L", 0.165, -0.10, yaw=8), "foot.R": F("R", -0.20, 0.13, yaw=-34, pitch=6)})
    mid2 = M({"hips": {"pos": (0, -0.08 * k, -0.12 * k), "yaw": -6, "pitch": 7}, "spine": {"yaw": 0, "pitch": 6}, "chest": {"yaw": -2, "pitch": 9, "roll": 0},
              "head": {"yaw": 8, "pitch": -8, "roll": 13}, "shoulder.R": {"raise": 4, "fwd": 8},
              "arm.R": {"upper": D(-52, -10), "fore": D(-34, -4)}, "hand.R": {"blade": D(-58, 2)},
              "arm.L": {"upper": D(70, -58), "fore": D(40, -40)}, "hand.L": {"face": D(60, 0)},
              "foot.L": F("L", 0.17, -0.24, lift=0.03, yaw=10), "foot.R": F("R", -0.20, 0.15, yaw=-34, pitch=18)})
    cut2 = M({"hips": {"pos": (0.02 * k, -0.14 * k, -0.15 * k), "yaw": 16, "pitch": 8, "roll": 2}, "spine": {"yaw": 6, "pitch": 6}, "chest": {"yaw": 22, "pitch": 10, "roll": 3},
              "neck": {"yaw": -6}, "head": {"yaw": -22, "pitch": -8, "roll": 12}, "shoulder.R": {"raise": 2, "fwd": 18},
              "arm.R": {"upper": D(-48, -12), "fore": D(-38, -6)}, "hand.R": {"blade": D(22, -2)},
              "arm.L": {"upper": D(96, -44), "fore": D(130, -30)}, "hand.L": {"face": D(100, 0)},
              "foot.L": F("L", 0.17, -0.30, yaw=12), "foot.R": F("R", -0.20, 0.17, yaw=-34, pitch=28)})
    thru2 = deep_merge(cut2, {"hips": {"yaw": 20}, "chest": {"yaw": 28, "pitch": 12}, "head": {"yaw": -30, "roll": 18},
                              "arm.R": {"upper": D(6, -22), "fore": D(36, -16)}, "hand.R": {"blade": D(88, -10)},
                              "arm.L": {"upper": D(104, -44), "fore": D(140, -30)}})
    rec2 = M({"hips": {"pos": (0, -0.06 * k, -0.09 * k), "yaw": 6, "pitch": 6}, "chest": {"yaw": 12, "pitch": 10}, "head": {"yaw": -4, "roll": 15},
              "arm.R": {"upper": D(-6, -56), "fore": D(30, -50)}, "hand.R": {"blade": D(60, -30)},
              "arm.L": {"upper": D(76, -66), "fore": D(60, -56)}, "hand.L": {"face": D(60, -6)},
              "foot.L": F("L", 0.165, -0.18, yaw=8), "foot.R": F("R", -0.19, 0.12, yaw=-26, pitch=8)})
    a2 = Keyed([
        (0.00, BASE),
        (0.24, wind2, "out"),
        (0.29, deep_merge(wind2, {"chest": {"yaw": -30}, "head": {"roll": 19}, "hand.R": {"blade": D(-134, 15)}}), "lin"),
        (0.33, mid2, "in"),
        (0.37, cut2, "lin"),
        (0.45, thru2, "out3"),
        (0.56, rec2, "io"),
        (0.70, BASE, "io"),
    ])
    clips["attack2"] = dict(fn=a2, duration=0.70, loop=False, events={"hit": 0.35})

    # ---- 맞기(0.4초): 윗몸이 뒤로 탁 꺾이고 고개가 돌아간 뒤, 덜컥덜컥 제자리로
    hit = Keyed([
        (0.00, BASE),
        (0.06, M({"hips": {"pos": (0, 0.09 * k, -0.06 * k), "yaw": -20, "pitch": -8, "roll": -4}, "spine": {"pitch": -8, "roll": -4}, "chest": {"yaw": 12, "pitch": -14, "roll": -6},
                  "neck": {"pitch": -6, "roll": 10}, "head": {"yaw": 34, "pitch": 10, "roll": 26},
                  "shoulder.L": {"raise": 12}, "shoulder.R": {"raise": 12},
                  "arm.R": {"upper": D(-60, -58), "fore": D(-50, -30)}, "hand.R": {"blade": D(-40, 20)},
                  "arm.L": {"upper": D(70, -50), "fore": D(60, -20)}, "hand.L": {"face": D(50, 20)},
                  "foot.R": F("R", -0.20, 0.20, yaw=-28)}), "out3"),
        (0.15, M({"hips": {"pos": (0, 0.10 * k, -0.08 * k), "yaw": -18, "pitch": -5, "roll": -3}, "spine": {"pitch": -5}, "chest": {"yaw": 8, "pitch": -9, "roll": -5},
                  "neck": {"roll": 8}, "head": {"yaw": 28, "pitch": 6, "roll": 24},
                  "arm.R": {"upper": D(-56, -64), "fore": D(-40, -50)}, "hand.R": {"blade": D(-30, 0)},
                  "arm.L": {"upper": D(68, -60), "fore": D(50, -40)},
                  "foot.R": F("R", -0.20, 0.22, yaw=-28)}), "io"),
        (0.24, M({"hips": {"pos": (0, 0.03 * k, -0.10 * k), "yaw": -12, "pitch": 9}, "spine": {"pitch": 9}, "chest": {"pitch": 14},
                  "head": {"yaw": 4, "pitch": -14, "roll": 8},
                  "foot.R": F("R", -0.19, 0.16, yaw=-26)}), "out3"),
        (0.40, BASE, "io"),
    ])
    clips["hit"] = dict(fn=hit, duration=0.40, loop=False)

    # ---- 쓰러짐(1.4초): 고개가 꺾이고 → 무릎이 풀려 주저앉고 → 뒤로 무너져 눕는다(마지막 자세 유지)
    lie = M({"hips": {"pos": (0, 0.66 * k, -0.86 * k), "yaw": -6, "pitch": -88, "roll": 4}, "spine": {"yaw": 0, "pitch": -2, "roll": 0},
             "chest": {"yaw": 4, "pitch": -2, "roll": 0}, "neck": {"yaw": 8, "pitch": 4, "roll": 0}, "head": {"yaw": 24, "pitch": 6, "roll": 14},
             "shoulder.L": {"raise": 6, "fwd": 0}, "shoulder.R": {"raise": 6, "fwd": 0},
             "arm.R": {"upper": D(-78, -5), "fore": D(-56, -3)}, "hand.R": {"blade": D(-118, -1)},
             "arm.L": {"upper": D(70, -5), "fore": D(100, -2)}, "hand.L": {"face": D(0, 86)},
             "foot.L": F("L", 0.22, -0.15, lift=-0.04, yaw=26, pitch=-62), "foot.R": F("R", -0.25, -0.03, lift=-0.04, yaw=-34, pitch=-58),
             "knee.L": {"up": 1.0}, "knee.R": {"up": 1.0}, "settle": 1.0})
    death = Keyed([
        (0.00, BASE),
        # 맞고 뻣뻣하게 젖혀진다
        (0.12, M({"hips": {"pos": (0, 0.05 * k, -0.03 * k), "yaw": -12, "pitch": -6}, "spine": {"pitch": -6}, "chest": {"yaw": 4, "pitch": -12},
                  "neck": {"pitch": -8, "roll": 8}, "head": {"yaw": 20, "pitch": 14, "roll": 24},
                  "shoulder.L": {"raise": 10}, "shoulder.R": {"raise": 10},
                  "arm.R": {"upper": D(-60, -60), "fore": D(-50, -44)}, "hand.R": {"blade": D(-40, -4)},
                  "arm.L": {"upper": D(70, -56), "fore": D(60, -36)}}), "out3"),
        (0.30, M({"hips": {"pos": (0, 0.05 * k, -0.05 * k), "yaw": -12, "pitch": -4}, "spine": {"pitch": -4}, "chest": {"yaw": 4, "pitch": -8},
                  "neck": {"pitch": -6, "roll": 8}, "head": {"yaw": 22, "pitch": 12, "roll": 26},
                  "arm.R": {"upper": D(-56, -70), "fore": D(-40, -66)}, "hand.R": {"blade": D(-30, -30)},
                  "arm.L": {"upper": D(68, -68), "fore": D(50, -56)}}), "io"),
        # 무릎이 탁 꺾인다: 골반이 수직으로 떨어지고 윗몸이 앞으로 고꾸라진다
        (0.52, M({"hips": {"pos": (0, 0.06 * k, -0.47 * k), "yaw": -8, "pitch": 8, "roll": -3}, "spine": {"pitch": 14}, "chest": {"yaw": 0, "pitch": 20, "roll": -4},
                  "neck": {"pitch": 14, "roll": 6}, "head": {"yaw": 6, "pitch": -26, "roll": 18},
                  "shoulder.L": {"raise": -4}, "shoulder.R": {"raise": -2},
                  "arm.R": {"upper": D(-40, -74), "fore": D(-10, -60)}, "hand.R": {"blade": D(-20, -12)},
                  "arm.L": {"upper": D(60, -78), "fore": D(40, -70)}, "hand.L": {"face": D(50, -10)},
                  "foot.L": F("L", 0.18, -0.10, yaw=14, pitch=10), "foot.R": F("R", -0.20, 0.10, yaw=-30, pitch=26),
                  "knee.L": {"up": 0.0, "out": 14}, "knee.R": {"up": 0.0, "out": 18}}), "in"),
        # 주저앉은 채 뒤로 넘어가기 시작
        (0.74, M({"hips": {"pos": (0, 0.30 * k, -0.66 * k), "yaw": -8, "pitch": -34, "roll": 3}, "spine": {"yaw": 0, "pitch": 4, "roll": 0},
                  "chest": {"yaw": 3, "pitch": 4, "roll": 0}, "neck": {"yaw": 6, "pitch": 12, "roll": 4}, "head": {"yaw": 14, "pitch": -10, "roll": 16},
                  "shoulder.L": {"raise": 12, "fwd": 0}, "shoulder.R": {"raise": 12, "fwd": 0},
                  "arm.R": {"upper": D(-66, 10), "fore": D(-50, 30)}, "hand.R": {"blade": D(-90, 34)},
                  "arm.L": {"upper": D(66, 6), "fore": D(60, 28)}, "hand.L": {"face": D(30, 50)},
                  "foot.L": F("L", 0.20, -0.20, yaw=18, pitch=-16), "foot.R": F("R", -0.23, 0.02, yaw=-34, pitch=-10),
                  "knee.L": {"up": 0.6, "out": 6}, "knee.R": {"up": 0.6, "out": 6}, "settle": 0.0}), "lin"),
        (0.94, lie, "in"),
        # 갑옷이 덜컹 튀었다 가라앉는다
        (1.04, deep_merge(lie, {"hips": {"pos": (0, 0.67 * k, -0.80 * k), "pitch": -84}, "chest": {"pitch": 5}, "head": {"pitch": 12, "roll": 6},
                                 "arm.R": {"upper": D(-80, 8), "fore": D(-62, 14)}, "hand.R": {"blade": D(-118, 9)},
                                 "arm.L": {"upper": D(72, 8), "fore": D(100, 14)}, "settle": 0.0}), "out"),
        (1.18, lie, "in"),
        (1.40, lie, "lin"),
    ])
    clips["death"] = dict(fn=death, duration=1.40, loop=False)
    return clips
