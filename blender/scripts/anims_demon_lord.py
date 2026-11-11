"""염옥의 군주 발카르(레이드 보스) 동작 세트. 전부 직접 만든 키 포즈/주기 함수다.

연기 방향: 거대한 마왕. 느리고 무겁게 움직이다 타격 순간만 폭발적으로. 어깨·가슴이 크게 오르내리는 숨.
갑옷 가시 때문에 팔은 항상 몸에서 벌린다. 겨드랑이 살이 팔과 붙어 있는 모델이라 위팔은 수평보다 조금 위(약 30도)까지만
들고, 높이는 어깨 으쓱 + 아래팔 + 몸통 젖힘으로 만든다(모서리 늘어남 3배 미만 유지).
대검 끝을 땅에 짚는 자세는 aim() 이 매 프레임 손 위치에서 칼끝 높이를 역산해 맞춘다.
"""
import math
import numpy as np
import bpy
from rigpose import D
from anims import Keyed, deep_merge, smooth01, PI


def demon_lord_set(rm):
    k = rm.H / 1.8
    ra = rm.rest_ankle
    wp = bpy.data.objects.get("Weapon")
    TIP = float(wp["blade_tip_y"]) if (wp is not None and "blade_tip_y" in wp.keys()) else 2.215 * rm.H / 2.6

    def F(s, x, y, lift=0.0, **kw):
        d = dict(pos=(x * k, y * k, ra[s][2] + lift * k))
        d.update(kw)
        return d

    def aim(P, az, tipz=0.05):
        """칼끝이 높이 tipz(m)에 오도록 무기 방향을 정한다. az = 칼이 뻗는 수평 방향(캐릭터 기준, 0=앞)."""
        for _ in range(3):
            rm.solve(P)
            g = rm.grip_world("R")
            sn = max(-1.0, min(1.0, (g[2] - tipz) / TIP))
            d = np.array(D(az, -math.degrees(math.asin(sn))))
            v = rm.C_heading.T @ d
            P["hand.R"] = {"blade": (float(v[0]), float(v[1]), float(v[2]))}
        return P

    # 기본 자세: 넓게 버티고 서서 오른손의 대검을 앞쪽 땅에 짚는다. 왼주먹은 옆으로 벌려 쥔다.
    BASE0 = {
        "hips": {"pos": (0.0, 0.0, -0.07 * k), "yaw": -10, "pitch": 4, "roll": 0},
        "spine": {"yaw": 0, "pitch": 3, "roll": 0}, "chest": {"yaw": 0, "pitch": 5, "roll": 0},
        "neck": {"yaw": 4, "pitch": 0, "roll": 0}, "head": {"yaw": 8, "pitch": 4, "roll": 0},
        "shoulder.L": {"raise": 3, "fwd": 0}, "shoulder.R": {"raise": 3, "fwd": 0},
        "arm.R": {"upper": D(-84, -30), "fore": D(-26, 16)}, "hand.R": {"blade": D(18, -60)},
        "arm.L": {"upper": D(80, -54), "fore": D(34, -52)}, "hand.L": {"twist": 0},
        "foot.L": F("L", 0.34, -0.15, yaw=12, pitch=0), "foot.R": F("R", -0.35, 0.13, yaw=-26, pitch=0),
        "knee.L": {"up": 0.0, "out": 0}, "knee.R": {"up": 0.0, "out": 0},
        "root_yaw": 0.0, "settle": 0.0,
    }
    PLANT_AZ = 14
    BASE = aim(deep_merge(BASE0, {}), PLANT_AZ)
    M = lambda over: deep_merge(BASE, over)
    clips = {}
    _install_review_views(rm.H)
    # 쓰러짐 조절값
    DF_Y, DF_Z = -0.24, -0.60
    NECK_YAW, HEAD_YAW = 16, 34
    LIE_BAZ, LIE_BEL = -160, 2
    LKX, LKY, LK_YAW, LK_OUT = 0.60, 0.00, 55, 55

    # ---- 대기 (3.2초 반복): 대검을 짚고 선 채 어깨·가슴이 크게 오르내리는 숨. 머리는 가슴보다 늦게 따라온다.
    T_IDLE = 3.2
    def idle(t):
        w = 2 * PI * t / T_IDLE
        b = math.sin(w); c = math.cos(w); b2 = math.sin(w - 1.0)
        sh = 3 + 6.5 * (b + 1) + 2.0 * b
        P = M({
            "hips": {"pos": (0.006 * k * c, 0.008 * k * b, (-0.07 + 0.022 * b) * k), "yaw": -10 + 0.8 * c, "pitch": 4 - 1.4 * b},
            "spine": {"pitch": 3 - 3.6 * b}, "chest": {"pitch": 5 - 8.5 * b, "yaw": 0.8 * c},
            "neck": {"pitch": 3.0 * b2}, "head": {"yaw": 8 - 1.5 * c, "pitch": 4 + 5.0 * b2},
            "shoulder.L": {"raise": sh}, "shoulder.R": {"raise": sh},
            "arm.R": {"upper": D(-84, -30 + 2.5 * b), "fore": D(-26, 16 + 2.0 * b2)},
            "arm.L": {"upper": D(80 + 4.0 * b, -54 + 5.0 * b), "fore": D(34, -52 + 6.0 * b2)},
        })
        return aim(P, PLANT_AZ)
    clips["idle"] = dict(fn=idle, duration=T_IDLE, loop=True)

    # ---- 걷기 (1.6초 반복): 느리고 묵직한 걸음. 대검은 오른쪽 뒤로 끌고 간다.
    T_WALK = 1.6
    WALK_UAZ, WALK_UEL, WALK_FAZ, WALK_FEL, WALK_BAZ = -124, -44, -120, -78, -142
    def walk(t):
        ph = 2 * PI * t / T_WALK
        stride, lift, heel = 0.21, 0.11, 20
        P = {}
        def foot(s, phi):
            phi = phi % (2 * PI)
            sgn = 1.0 if s == "L" else -1.0
            y = 0.0 - stride * math.cos(phi)
            if phi <= PI:
                u = phi / PI
                lz = 0.0
                if u < 0.25:
                    pitch = -heel * 0.3 * (1 - u / 0.25)
                elif u < 0.6:
                    pitch = 0.0
                else:
                    pitch = heel * smooth01((u - 0.6) / 0.4)
            else:
                u = (phi - PI) / PI
                lz = lift * math.sin(PI * u) * (1 - 0.3 * (2 * u - 1))
                if u < 0.3:
                    pitch = heel + heel * 0.5 * smooth01(u / 0.3)
                else:
                    pitch = heel * 1.5 + (-heel * 0.3 - heel * 1.5) * smooth01((u - 0.3) / 0.7)
            return F(s, sgn * 0.33, y, lift=lz, pitch=pitch, yaw=sgn * 12)
        P["foot.R"] = foot("R", ph)
        P["foot.L"] = foot("L", ph + PI)
        cR = math.cos(ph); sR = math.sin(ph)
        # 발을 디딜 때마다 무게가 실려 푹 꺼진다
        bob = 0.022 * math.cos(2 * ph + 0.35 * PI) - 0.012 * max(0.0, math.cos(2 * ph + 0.9 * PI)) ** 2
        P["hips"] = {"pos": (-0.040 * k * sR, 0.0, (-0.08 + bob) * k), "yaw": 6 * cR, "pitch": 6, "roll": 3.5 * sR}
        P["spine"] = {"yaw": -4 * cR, "pitch": 3, "roll": -2.5 * sR}
        P["chest"] = {"yaw": -6 * cR, "pitch": 5 + 1.5 * math.cos(2 * ph), "roll": -2.5 * sR}
        P["neck"] = {"yaw": 2 * cR, "pitch": -2, "roll": 1.0 * sR}
        P["head"] = {"yaw": 3 * cR, "pitch": -2 + 1.5 * math.cos(2 * ph + 0.6), "roll": 1.0 * sR}
        s = cR
        P["shoulder.L"] = {"raise": 3 + 2 * math.cos(2 * ph), "fwd": 4 * s}
        P["shoulder.R"] = {"raise": 3 + 2 * math.cos(2 * ph), "fwd": -3 * s}
        P["arm.L"] = {"upper": D(80 - 16 * s, -56 + 3 * s), "fore": D(34 - 18 * s, -52 + 12 * s)}
        P["hand.L"] = {"twist": 0}
        # 오른손은 몸 바깥·뒤로 빼서, 날이 다리가 흔들리는 범위 밖(오른쪽 뒤 바깥)에 놓이게 한다
        P["arm.R"] = {"upper": D(WALK_UAZ - 4 * s, WALK_UEL), "fore": D(WALK_FAZ - 5 * s, WALK_FEL - 2 * s)}
        P["hand.R"] = {"blade": D(-172, -38)}
        P["knee.L"] = {"up": 0.0, "out": 4}; P["knee.R"] = {"up": 0.0, "out": 4}
        P["root_yaw"] = 0.0; P["settle"] = 0.0
        return aim(P, WALK_BAZ - 3 * s, tipz=0.02)   # 칼끝은 오른쪽 뒤 바깥 땅에 닿은 채 끌려온다
    clips["walk"] = dict(fn=walk, duration=T_WALK, loop=True)

    # ---- 공격 1: 대검 내려찍기 (1.0초, 타격 0.52초) — 선 자세에 가까운 짧은 찍기. 칼끝이 앞쪽 땅을 찍는다.
    a1_wind = M({"hips": {"pos": (0, 0.07 * k, -0.03 * k), "yaw": -20, "pitch": -5}, "spine": {"pitch": -6}, "chest": {"yaw": -10, "pitch": -12},
                 "neck": {"pitch": 4}, "head": {"yaw": 22, "pitch": 8},
                 "shoulder.R": {"raise": 22, "fwd": -4}, "shoulder.L": {"raise": 6, "fwd": 6},
                 "arm.R": {"upper": D(-72, 26), "fore": D(-160, 72)}, "hand.R": {"blade": D(172, 34)},
                 "arm.L": {"upper": D(62, -34), "fore": D(8, -8)},
                 "foot.L": F("L", 0.34, -0.15, yaw=12, pitch=8), "foot.R": F("R", -0.35, 0.15, yaw=-26)})
    a1_mid = M({"hips": {"pos": (0, -0.03 * k, -0.05 * k), "yaw": -8, "pitch": 5}, "spine": {"pitch": 2}, "chest": {"yaw": 0, "pitch": 5},
                "head": {"yaw": 6, "pitch": 0}, "shoulder.R": {"raise": 20, "fwd": 8}, "shoulder.L": {"raise": 4},
                "arm.R": {"upper": D(-48, 28), "fore": D(-18, 52)}, "hand.R": {"blade": D(2, 66)},
                "arm.L": {"upper": D(74, -44), "fore": D(40, -30)},
                "foot.L": F("L", 0.34, -0.24, lift=0.06, yaw=10, pitch=-6), "foot.R": F("R", -0.35, 0.16, yaw=-26, pitch=6)})
    a1_hit = aim(M({"hips": {"pos": (0, -0.10 * k, -0.12 * k), "yaw": 6, "pitch": 11}, "spine": {"pitch": 6}, "chest": {"yaw": 10, "pitch": 13},
                    "neck": {"pitch": -5}, "head": {"yaw": -8, "pitch": -8}, "shoulder.R": {"raise": 4, "fwd": 16}, "shoulder.L": {"raise": 8, "fwd": -6},
                    "arm.R": {"upper": D(-38, -14), "fore": D(-10, -22)},
                    "arm.L": {"upper": D(94, -36), "fore": D(104, -46)},
                    "foot.L": F("L", 0.35, -0.29, yaw=10), "foot.R": F("R", -0.36, 0.18, yaw=-26, pitch=5)}), 4, tipz=0.0)
    a1_hold = aim(deep_merge(a1_hit, {"hips": {"pos": (0, -0.11 * k, -0.15 * k), "pitch": 13}, "chest": {"pitch": 16}, "head": {"pitch": -10},
                                      "arm.R": {"upper": D(-38, -18), "fore": D(-10, -27)}}), 4, tipz=-0.05)
    a1 = Keyed([(0.00, BASE), (0.36, a1_wind, "out"), (0.45, a1_mid, "in"), (0.52, a1_hit, "lin"), (0.68, a1_hold, "out"), (1.00, BASE, "io")])
    clips["attack1"] = dict(fn=a1, duration=1.00, loop=False, events={"hit": 0.52})

    # ---- 공격 2: 오른쪽 뒤에서 왼쪽으로 넓게 휩쓸기 (1.1초, 타격 0.55초). 날은 허리~가슴 높이에서 거의 수평으로 돈다.
    # 준비: 몸통을 오른쪽으로 틀고, 팔꿈치를 들어 손을 어깨 갑옷 바깥·뒤로 뺀다(날은 오른쪽 뒤로 뻗음)
    a2_wind = M({"hips": {"pos": (0.03 * k, 0.05 * k, -0.10 * k), "yaw": -24, "pitch": 4}, "spine": {"yaw": -10, "pitch": 2}, "chest": {"yaw": -22, "pitch": 2},
                 "neck": {"yaw": 16}, "head": {"yaw": 34, "pitch": 2}, "shoulder.R": {"raise": 10, "fwd": -14}, "shoulder.L": {"raise": 4, "fwd": 10},
                 "arm.R": {"upper": D(-112, -8), "fore": D(-84, -14)}, "hand.R": {"blade": D(-146, 6)},
                 "arm.L": {"upper": D(66, -40), "fore": D(10, -16)},
                 "foot.L": F("L", 0.34, -0.15, yaw=12), "foot.R": F("R", -0.36, 0.16, yaw=-34)})
    a2_mid = M({"hips": {"pos": (0.0, -0.02 * k, -0.13 * k), "yaw": -10, "pitch": 6}, "spine": {"yaw": -3, "pitch": 3}, "chest": {"yaw": -6, "pitch": 5},
                "neck": {"yaw": 6}, "head": {"yaw": 12, "pitch": 0}, "shoulder.R": {"raise": 6, "fwd": 2}, "shoulder.L": {"raise": 4, "fwd": 2},
                "arm.R": {"upper": D(-88, -16), "fore": D(-66, -18)}, "hand.R": {"blade": D(-92, -3)},
                "arm.L": {"upper": D(78, -46), "fore": D(40, -34)},
                "foot.L": F("L", 0.34, -0.20, yaw=12), "foot.R": F("R", -0.36, 0.17, yaw=-34, pitch=8)})
    a2_hit = M({"hips": {"pos": (-0.02 * k, -0.08 * k, -0.15 * k), "yaw": 10, "pitch": 7}, "spine": {"yaw": 6, "pitch": 3}, "chest": {"yaw": 18, "pitch": 6},
                "neck": {"yaw": -8}, "head": {"yaw": -18, "pitch": 0}, "shoulder.R": {"raise": 4, "fwd": 14}, "shoulder.L": {"raise": 6, "fwd": -8},
                "arm.R": {"upper": D(-56, -18), "fore": D(-40, -18)}, "hand.R": {"blade": D(-48, -5)},
                "arm.L": {"upper": D(96, -36), "fore": D(110, -30)},
                "foot.L": F("L", 0.34, -0.22, yaw=14), "foot.R": F("R", -0.36, 0.18, yaw=-30, pitch=12)})
    a2_fol = M({"hips": {"pos": (-0.03 * k, -0.09 * k, -0.15 * k), "yaw": 20, "pitch": 7}, "spine": {"yaw": 10, "pitch": 3}, "chest": {"yaw": 30, "pitch": 6},
                "neck": {"yaw": -14}, "head": {"yaw": -30, "pitch": 0}, "shoulder.R": {"raise": 4, "fwd": 20}, "shoulder.L": {"raise": 6, "fwd": -12},
                "arm.R": {"upper": D(-42, -22), "fore": D(-4, -18)}, "hand.R": {"blade": D(30, -8)},
                "arm.L": {"upper": D(104, -34), "fore": D(130, -28)},
                "foot.L": F("L", 0.34, -0.22, yaw=18), "foot.R": F("R", -0.36, 0.18, yaw=-26, pitch=14)})
    a2_rec = M({"hips": {"pos": (0, -0.03 * k, -0.10 * k), "yaw": 4, "pitch": 5}, "chest": {"yaw": 10, "pitch": 6}, "head": {"yaw": -6},
                "arm.R": {"upper": D(-66, -28), "fore": D(-20, -4)}, "hand.R": {"blade": D(30, -34)},
                "arm.L": {"upper": D(88, -48), "fore": D(60, -44)}})
    a2 = Keyed([(0.00, BASE), (0.40, a2_wind, "out"), (0.48, a2_mid, "in"), (0.55, a2_hit, "lin"), (0.66, a2_fol, "out"), (0.86, a2_rec, "io"), (1.10, BASE, "io")])
    clips["attack2"] = dict(fn=a2, duration=1.10, loop=False, events={"hit": 0.55})

    # ---- 스킬 1: 대검을 높이 치켜들었다 땅을 내리쳐 충격파 (1.9초, 타격 1.08초) — 긴 준비, 깊이 웅크린 타격, 칼을 박은 채 버티는 여운
    s1_gather = M({"hips": {"pos": (0, 0.03 * k, -0.20 * k), "yaw": -16, "pitch": 12}, "spine": {"pitch": 6}, "chest": {"yaw": -8, "pitch": 12},
                   "head": {"yaw": 16, "pitch": -8}, "shoulder.R": {"raise": 6, "fwd": 6}, "shoulder.L": {"raise": 6, "fwd": 6},
                   "arm.R": {"upper": D(-70, -40), "fore": D(-30, 0)}, "hand.R": {"blade": D(10, 30)},
                   "arm.L": {"upper": D(72, -50), "fore": D(20, -30)}})
    s1_up = M({"hips": {"pos": (0, 0.08 * k, 0.00 * k), "yaw": -12, "pitch": -8}, "spine": {"pitch": -8}, "chest": {"yaw": -4, "pitch": -15},
               "neck": {"pitch": -4}, "head": {"yaw": 12, "pitch": -12}, "shoulder.R": {"raise": 26, "fwd": 0}, "shoulder.L": {"raise": 12, "fwd": -6},
               "arm.R": {"upper": D(-66, 30), "fore": D(-120, 80)}, "hand.R": {"blade": D(150, 78)},
               "arm.L": {"upper": D(86, -30), "fore": D(70, -6)},
               "foot.L": F("L", 0.34, -0.15, yaw=12, pitch=10), "foot.R": F("R", -0.35, 0.15, yaw=-26, pitch=6)})
    s1_peak = deep_merge(s1_up, {"hips": {"pos": (0, 0.11 * k, 0.02 * k), "pitch": -11}, "chest": {"pitch": -19}, "head": {"pitch": -16},
                                 "shoulder.R": {"raise": 30}, "arm.R": {"upper": D(-70, 32), "fore": D(-150, 76)}, "hand.R": {"blade": D(172, 56)},
                                 "arm.L": {"upper": D(90, -26), "fore": D(80, 0)},
                                 "foot.L": F("L", 0.34, -0.20, lift=0.16, yaw=10, pitch=14)})
    s1_mid = M({"hips": {"pos": (0, -0.04 * k, -0.08 * k), "yaw": -4, "pitch": 8}, "spine": {"pitch": 3}, "chest": {"yaw": 2, "pitch": 8},
                "head": {"yaw": 2, "pitch": -4}, "shoulder.R": {"raise": 20, "fwd": 10},
                "arm.R": {"upper": D(-46, 28), "fore": D(-16, 50)}, "hand.R": {"blade": D(2, 62)},
                "arm.L": {"upper": D(96, -20), "fore": D(110, 0)},
                "foot.L": F("L", 0.35, -0.34, lift=0.10, yaw=10, pitch=-8), "foot.R": F("R", -0.36, 0.18, yaw=-26, pitch=18)})
    # 타격: 깊이 주저앉으며 내리친다. 왼팔은 반동으로 뒤·위로 크게 젖힌다(attack1 과 다른 실루엣)
    s1_hit = aim(M({"hips": {"pos": (0, -0.20 * k, -0.34 * k), "yaw": 6, "pitch": 24}, "spine": {"pitch": 11}, "chest": {"yaw": 10, "pitch": 24},
                    "neck": {"pitch": -10}, "head": {"yaw": -8, "pitch": -18}, "shoulder.R": {"raise": 0, "fwd": 18}, "shoulder.L": {"raise": 14, "fwd": -14},
                    "arm.R": {"upper": D(-38, -34), "fore": D(-8, -44)},
                    "arm.L": {"upper": D(112, 2), "fore": D(150, 24)},
                    "foot.L": F("L", 0.36, -0.44, yaw=10), "foot.R": F("R", -0.37, 0.28, yaw=-26, pitch=34)}), 5, tipz=-0.10)
    # 여운: 칼을 땅에 박은 채 상체를 더 숙이고 버틴다. 왼팔은 천천히 내려온다.
    s1_hold = aim(deep_merge(s1_hit, {"hips": {"pos": (0, -0.21 * k, -0.39 * k), "pitch": 28}, "spine": {"pitch": 13}, "chest": {"pitch": 29}, "head": {"pitch": -6},
                                      "shoulder.L": {"raise": 10, "fwd": -8},
                                      "arm.R": {"upper": D(-38, -37), "fore": D(-8, -47)},
                                      "arm.L": {"upper": D(104, -18), "fore": D(128, -14)}}), 5, tipz=-0.16)
    s1_hold2 = aim(deep_merge(s1_hold, {"hips": {"pos": (0, -0.20 * k, -0.37 * k), "pitch": 26}, "chest": {"pitch": 26}, "head": {"yaw": 0, "pitch": -20},
                                        "arm.L": {"upper": D(96, -34), "fore": D(100, -36)}}), 5, tipz=-0.16)
    s1_key = Keyed([(0.00, BASE), (0.28, s1_gather, "io"), (0.78, s1_up, "io"), (0.98, s1_peak, "out"), (1.04, s1_mid, "in"), (1.08, s1_hit, "lin"),
                    (1.30, s1_hold, "out"), (1.52, s1_hold2, "io"), (1.90, BASE, "io")])
    def s1(t):
        P = s1_key(t)
        if 0.55 <= t <= 0.99:      # 치켜든 대검이 힘을 모으며 떨린다
            a = smooth01((t - 0.55) / 0.2)
            w = (t - 0.55) * 2 * PI * 11
            P["chest"]["roll"] = 0.8 * a * math.sin(w)
            P["shoulder.R"]["raise"] = P["shoulder.R"]["raise"] + 1.0 * a * math.sin(w * 1.3)
        elif 1.09 <= t <= 1.62:    # 충격의 반동으로 온몸이 떨린다(칼끝은 박힌 자리에 고정)
            a = smooth01((t - 1.09) / 0.04) * (1 - smooth01((t - 1.40) / 0.22))
            w = (t - 1.09) * 2 * PI * 10
            P["chest"]["roll"] = 1.4 * a * math.sin(w)
            P["chest"]["pitch"] = P["chest"]["pitch"] + 1.2 * a * math.sin(w * 1.4)
            P["shoulder.L"]["raise"] = P["shoulder.L"]["raise"] + 2.0 * a * math.sin(w * 1.2 + 1)
            hp = P["hips"]["pos"]
            P["hips"]["pos"] = (hp[0], hp[1], hp[2] + 0.006 * k * a * math.sin(w))
            if t <= 1.52:
                P = aim(P, 5, tipz=-0.16 if t >= 1.30 else -0.10 - 0.06 * (t - 1.08) / 0.22)
        return P
    clips["skill1"] = dict(fn=s1, duration=1.90, loop=False, events={"hit": 1.08})

    # ---- 스킬 2: 양팔을 옆으로 넓게 벌리고 포효·소환 (2.0초, 시전 0.80초). 포효하는 동안 팔이 천천히 더 벌어지고 가슴·머리가 떨린다.
    s2_gather = M({"hips": {"pos": (0, 0.0, -0.24 * k), "yaw": -4, "pitch": 16}, "spine": {"pitch": 10}, "chest": {"yaw": 0, "pitch": 16},
                   "neck": {"pitch": 8}, "head": {"yaw": 2, "pitch": 14}, "shoulder.R": {"raise": 10, "fwd": 14}, "shoulder.L": {"raise": 10, "fwd": 14},
                   "arm.R": {"upper": D(-58, -44), "fore": D(-4, -6)}, "hand.R": {"blade": D(-30, -20)},
                   "arm.L": {"upper": D(58, -44), "fore": D(4, -6)},
                   "foot.L": F("L", 0.36, -0.08, yaw=16), "foot.R": F("R", -0.36, 0.08, yaw=-20)})
    s2_open = M({"hips": {"pos": (0, 0.03 * k, -0.02 * k), "yaw": 0, "pitch": -4}, "spine": {"pitch": -5}, "chest": {"yaw": 0, "pitch": -9},
                 "neck": {"yaw": 0, "pitch": -8}, "head": {"yaw": 0, "pitch": -16}, "shoulder.R": {"raise": 10, "fwd": -10}, "shoulder.L": {"raise": 10, "fwd": -10},
                 "arm.R": {"upper": D(-90, -6), "fore": D(-84, 6)}, "hand.R": {"blade": D(-100, -46)},
                 "arm.L": {"upper": D(90, -6), "fore": D(84, 8)},
                 "foot.L": F("L", 0.38, -0.06, yaw=20), "foot.R": F("R", -0.38, 0.06, yaw=-22)})
    s2_open2 = deep_merge(s2_open, {"hips": {"pos": (0, 0.05 * k, 0.0), "pitch": -7}, "spine": {"pitch": -8}, "chest": {"pitch": -14},
                                    "neck": {"pitch": -10}, "head": {"pitch": -22}, "shoulder.R": {"raise": 18, "fwd": -18}, "shoulder.L": {"raise": 18, "fwd": -18},
                                    "arm.R": {"upper": D(-106, 8), "fore": D(-104, 22)}, "hand.R": {"blade": D(-116, -30)},
                                    "arm.L": {"upper": D(106, 8), "fore": D(104, 24)}})
    s2_key = Keyed([(0.00, BASE), (0.42, s2_gather, "io"), (0.74, s2_open, "back"), (1.50, s2_open2, "lin"), (2.00, BASE, "io")])
    def s2(t):
        P = s2_key(t)
        if 0.70 <= t <= 1.60:      # 포효: 가슴이 들썩이고 머리를 좌우로 흔들며 온몸이 떨린다
            a = smooth01((t - 0.70) / 0.1) * (1 - smooth01((t - 1.42) / 0.16))
            w = (t - 0.70) * 2 * PI
            P["head"]["yaw"] = P["head"]["yaw"] + 11 * a * math.sin(w * 1.5)
            P["head"]["roll"] = 5 * a * math.sin(w * 2.2)
            P["neck"]["yaw"] = P["neck"]["yaw"] + 4 * a * math.sin(w * 1.5 - 0.5)
            P["chest"]["pitch"] = P["chest"]["pitch"] + 2.6 * a * math.sin(w * 8) + 2.0 * a * math.sin(w * 2.6)
            P["chest"]["roll"] = 2.0 * a * math.sin(w * 1.5 + 0.8)
            P["spine"]["roll"] = 1.5 * a * math.sin(w * 1.5 + 0.4)
            hp = P["hips"]["pos"]
            P["hips"]["pos"] = (hp[0], hp[1], hp[2] + 0.008 * k * a * math.sin(w * 8) - 0.02 * k * a * (0.5 - 0.5 * math.cos(w * 2.6)))
            P["shoulder.L"]["raise"] = P["shoulder.L"]["raise"] + 3 * a * math.sin(w * 8 + 1)
            P["shoulder.R"]["raise"] = P["shoulder.R"]["raise"] + 3 * a * math.sin(w * 8 + 2)
        return P
    clips["skill2"] = dict(fn=s2, duration=2.00, loop=False, events={"cast": 0.80})

    # ---- 맞기 (0.5초): 거구가 살짝 비틀, 대검은 짚은 채
    hit_key = Keyed([
        (0.00, BASE),
        (0.09, M({"hips": {"pos": (0.02 * k, 0.07 * k, -0.05 * k), "yaw": -4, "pitch": -4, "roll": -2}, "spine": {"pitch": -5, "roll": -2},
                  "chest": {"yaw": 10, "pitch": -9, "roll": -3}, "neck": {"pitch": 6}, "head": {"yaw": -6, "pitch": 10, "roll": 6},
                  "shoulder.L": {"raise": 12, "fwd": -8}, "shoulder.R": {"raise": 8},
                  "arm.L": {"upper": D(92, -42), "fore": D(70, -20)}, "arm.R": {"upper": D(-86, -26), "fore": D(-30, 14)},
                  "foot.R": F("R", -0.36, 0.20, yaw=-26)}), "out3"),
        (0.26, M({"hips": {"pos": (0, 0.03 * k, -0.11 * k), "yaw": -12, "pitch": 8}, "spine": {"pitch": 5}, "chest": {"yaw": -3, "pitch": 10},
                  "head": {"yaw": 12, "pitch": -4}, "arm.L": {"upper": D(76, -52), "fore": D(26, -44)},
                  "foot.R": F("R", -0.36, 0.17, yaw=-26)}), "io"),
        (0.50, BASE, "io"),
    ])
    clips["hit"] = dict(fn=lambda t: aim(hit_key(t), PLANT_AZ), duration=0.50, loop=False)

    # ---- 쓰러짐 (2.6초): 비틀 → 대검에 기대며 무릎을 꿇음 → 무릎을 접은 채 앞으로 무너져 엎어진다(마지막 자세 유지)
    d_stag = M({"hips": {"pos": (0.03 * k, 0.08 * k, -0.10 * k), "yaw": -6, "pitch": -4, "roll": -3}, "spine": {"pitch": -4}, "chest": {"yaw": 8, "pitch": -8, "roll": -3},
                "neck": {"pitch": 8}, "head": {"yaw": -8, "pitch": 14, "roll": 8}, "shoulder.L": {"raise": 10}, "shoulder.R": {"raise": 8},
                "arm.L": {"upper": D(88, -40), "fore": D(60, -30)}, "arm.R": {"upper": D(-84, -32), "fore": D(-26, 10)},
                "foot.R": F("R", -0.37, 0.22, yaw=-26)})
    kneeL = F("L", 0.33, 0.30, lift=-0.02, yaw=8, pitch=62)
    kneeR = F("R", -0.34, 0.34, lift=-0.02, yaw=-12, pitch=62)
    d_kneel = M({"hips": {"pos": (0, -0.04 * k, -0.50 * k), "yaw": -4, "pitch": 10, "roll": 0}, "spine": {"pitch": 10}, "chest": {"yaw": 0, "pitch": 16},
                 "neck": {"pitch": 10}, "head": {"yaw": 4, "pitch": 18, "roll": 3}, "shoulder.L": {"raise": 2, "fwd": 8}, "shoulder.R": {"raise": 12, "fwd": 6},
                 "arm.L": {"upper": D(76, -62), "fore": D(40, -66)}, "arm.R": {"upper": D(-70, -8), "fore": D(-22, 34)},
                 "foot.L": kneeL, "foot.R": kneeR})
    d_sag = deep_merge(d_kneel, {"hips": {"pos": (0.02 * k, -0.07 * k, -0.53 * k), "pitch": 16, "roll": 2}, "spine": {"pitch": 13}, "chest": {"pitch": 22, "roll": 3},
                                 "head": {"pitch": 26, "roll": 6}, "arm.R": {"upper": D(-72, -2), "fore": D(-24, 38)},
                                 "arm.L": {"upper": D(78, -66), "fore": D(50, -72)}})
    # 무너짐: 무릎은 땅에 접힌 채 골반이 낮게 앞으로 미끄러지고 상체가 엎어진다. 손이 풀려 칼이 바깥으로 돈다.
    d_fall = M({"hips": {"pos": (0.02 * k, DF_Y * k, DF_Z * k), "yaw": 0, "pitch": 54, "roll": 3}, "spine": {"pitch": 8}, "chest": {"yaw": 6, "pitch": 10, "roll": 3},
                "neck": {"yaw": 8, "pitch": -6}, "head": {"yaw": 16, "pitch": -8, "roll": 4}, "shoulder.L": {"raise": 10, "fwd": 6}, "shoulder.R": {"raise": 10, "fwd": 6},
                "arm.L": {"upper": D(82, -30), "fore": D(26, -40)}, "arm.R": {"upper": D(-80, -20), "fore": D(-56, -30)}, "hand.R": {"blade": D(-84, -4)},
                "foot.L": F("L", 0.40, 0.26, lift=-0.02, yaw=24, pitch=64), "foot.R": kneeR,
                "knee.L": {"up": 0.0, "out": 24}})
    # 마지막 자세: 왼무릎을 옆으로 접고 왼팔꿈치를 굽혀 엎드린다. 머리는 옆으로 돌리고, 칼은 손에서 풀린 각도로 몸 오른쪽 땅에 눕는다.
    lie = M({"hips": {"pos": (0, -0.50 * k, -0.62 * k), "yaw": 0, "pitch": 86, "roll": 4}, "spine": {"yaw": 0, "pitch": 2, "roll": 0},
             "chest": {"yaw": 6, "pitch": 2, "roll": 3}, "neck": {"yaw": NECK_YAW, "pitch": -4, "roll": 0}, "head": {"yaw": HEAD_YAW, "pitch": -6, "roll": 4},
             "shoulder.L": {"raise": 14, "fwd": 0}, "shoulder.R": {"raise": 10, "fwd": 0},
             "arm.L": {"upper": D(104, -4), "fore": D(12, -4)}, "hand.L": {"twist": 0},
             "arm.R": {"upper": D(-70, -4), "fore": D(-44, -4)}, "hand.R": {"blade": D(LIE_BAZ, LIE_BEL)},
             "foot.L": F("L", LKX, LKY, lift=-0.06, yaw=LK_YAW, pitch=70), "foot.R": F("R", -0.36, 0.34, lift=-0.06, yaw=-20, pitch=78),
             "knee.L": {"up": 0.0, "out": LK_OUT}, "knee.R": {"up": 0.0, "out": 6}, "settle": 1.0})
    lie_b = deep_merge(lie, {"hips": {"pos": (0, -0.50 * k, -0.57 * k), "pitch": 83}, "chest": {"pitch": -3}, "head": {"pitch": -12},
                             "arm.L": {"upper": D(104, 4), "fore": D(12, 6)}, "arm.R": {"upper": D(-70, 4), "fore": D(-44, 6)},
                             "hand.R": {"blade": D(LIE_BAZ + 8, LIE_BEL + 5)}, "settle": 0.0})
    d_key = Keyed([(0.00, BASE), (0.34, d_stag, "out"), (0.95, d_kneel, "in"), (1.45, d_sag, "io"), (1.78, d_fall, "in"), (1.98, lie, "in"),
                   (2.12, lie_b, "out"), (2.28, lie, "io"), (2.60, lie, "lin")])
    def death(t):
        P = d_key(t)
        if t <= 1.45:              # 무릎 꿇을 때까지는 대검을 지팡이처럼 짚고 버틴다
            P = aim(P, PLANT_AZ)
        elif t < 1.78:             # 손이 풀리며 칼끝이 미끄러진다
            u = smooth01((t - 1.45) / 0.33)
            Q = aim(deep_merge(P, {}), PLANT_AZ + 0.0)
            from anims import _slerp
            P["hand.R"] = {"blade": _slerp(Q["hand.R"]["blade"], d_fall["hand.R"]["blade"], u)}
        return P
    clips["death"] = dict(fn=death, duration=2.60, loop=False)
    import os
    if os.environ.get("DL_DEBUG"):
        _debug_stretch(rm, clips)
    return clips


def _install_review_views(H):
    """시트 렌더 보조(이 프로세스에만 적용, 공용 파일은 건드리지 않는다).
    - death 는 앞으로 길게 쓰러지고 칼이 땅에 눕기 때문에, 몸과 날 전체가 들어오도록 카메라 중심·범위를 넓힌다.
    - 환경변수 DL_VIEWS=b,t,f 를 주면 q 시점을 찍을 때 추가 시점도 함께 찍는다
      (b = 오른쪽 뒤, t = 위에서 내려다봄, f = 정면, g = 게임 카메라와 비슷한 쿼터뷰, r = 오른쪽 옆).  파일: blender/diag/demon_lord_anim_<동작>_<시점>_<n>.png"""
    import sys, os
    g = None
    f = sys._getframe(1)
    while f is not None:
        if "render_view" in f.f_globals and "make_sheets" in f.f_globals:
            g = f.f_globals
            break
        f = f.f_back
    if g is None or g.get("_dl_rv_installed"):
        return
    orig = g["render_view"]
    extra = [v for v in os.environ.get("DL_VIEWS", "").split(",") if v]
    VW = {"b": (-150, 14, 1.0), "t": (0, 68, 1.35), "f": (0, 6, 1.0), "g": (32, 50, 1.0), "r": (-90, 8, 1.0)}
    def rv(path, center, dist, az, el=0.0, ortho_scale=None, **kw):
        d, base = os.path.split(path)
        if "_anim_" not in base:
            return orig(path, center, dist, az, el, ortho_scale=ortho_scale, **kw)
        if "_anim_death_" in base:
            center = (0.0, -1.0, H * 0.36); ortho_scale = H * 1.95
        r = orig(path, center, dist, az, el, ortho_scale=ortho_scale, **kw)
        if "_q_" in base:
            for v in extra:
                a, e2, sc = VW[v]
                orig(os.path.join(d, base.replace("_q_", "_%s_" % v)), center, dist, a, e2, ortho_scale=(ortho_scale or H * 2) * sc, **kw)
        return r
    g["render_view"] = rv
    g["_dl_rv_installed"] = True


def _debug_stretch(rm, clips):
    """진단용(환경변수 DL_DEBUG=1): 동작별로 가장 늘어나는 모서리가 기본 자세에서 어디인지 찍는다."""
    import rigcore, rigpose
    from common import mesh_world_verts
    body = bpy.data.objects["Body"]
    rigpose.reset_pose(rm.arm); bpy.context.view_layer.update()
    rest = mesh_world_verts(body)
    e, L0 = rigcore.rest_edge_lengths(body)
    ok = L0 > 1e-4
    for name, cd in clips.items():
        n = int(round(cd["duration"] * 30))
        best = None
        cnt = np.zeros(len(e), dtype=int)
        for f in range(0, n + 1):
            P = cd["fn"](f / 30.0)
            rm.solve(P); rm.apply(); bpy.context.view_layer.update()
            co = mesh_world_verts(body, None, deformed=True)
            r = np.linalg.norm(co[e[:, 0]] - co[e[:, 1]], axis=1) / np.maximum(L0, 1e-9)
            r[~ok] = 1.0
            cnt = np.maximum(cnt, (r > 2.7).astype(int))
            i = int(np.argmax(r))
            if best is None or r[i] > best[0]:
                best = (float(r[i]), f, i)
        idx = np.flatnonzero(cnt)
        mid = 0.5 * (rest[e[idx, 0]] + rest[e[idx, 1]]) if len(idx) else np.zeros((1, 3))
        i = best[2]
        print("[RIG] dbg %-8s max %.2f at frame %d rest %s L0 %.4f | edges>2.7: %d bbox %s .. %s" % (
            name, best[0], best[1], np.round(0.5 * (rest[e[i, 0]] + rest[e[i, 1]]), 3).tolist(), L0[i], len(idx),
            np.round(mid.min(0), 2).tolist(), np.round(mid.max(0), 2).tolist()), flush=True)
    rigpose.reset_pose(rm.arm); bpy.context.view_layer.update()
