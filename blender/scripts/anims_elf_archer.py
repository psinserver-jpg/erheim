"""요정 궁수 동작 세트(왼손 장궁, 오른손 맨손). 전부 직접 만든 키 포즈/주기 함수다.

활(hand.L blade) = 윗활대가 가리키는 방향. 조준 자세에서는 몸통을 오른쪽으로 틀어(heading 약 -76도)
왼팔을 표적(월드 앞)으로 곧게 뻗고, 오른손으로 시위를 턱 옆까지 당긴다.
팔 방향은 몸통 heading 기준이므로 표적 방향은 az = -heading 이다.
"""
import math
from rigpose import D
from anims import Keyed, deep_merge, smooth01, PI


def elf_archer_set(rm):
    k = rm.H / 1.8
    ra = rm.rest_ankle

    def F(s, x, y, lift=0.0, **kw):
        d = dict(pos=(x * k, y * k, ra[s][2] + lift * k), yaw=0, pitch=0, roll=0)
        d.update(kw)
        return d

    # 기본 자세: 왼쪽 어깨를 살짝 앞으로, 활은 왼손에 내려 들고(윗활대가 앞·위), 오른손은 가볍게 늘어뜨린다
    BASE = {
        "hips": {"pos": (0.0, 0.0, -0.035 * k), "yaw": -24, "pitch": 2, "roll": 0},
        "spine": {"yaw": -2, "pitch": 1, "roll": 0}, "chest": {"yaw": -4, "pitch": 0, "roll": 0},
        "neck": {"yaw": 10, "pitch": -2, "roll": 0}, "head": {"yaw": 18, "pitch": -2, "roll": 0},
        "shoulder.L": {"raise": 0, "fwd": 3}, "shoulder.R": {"raise": 0, "fwd": 0},
        "arm.L": {"upper": D(72, -68), "fore": D(24, -46)}, "hand.L": {"blade": D(-6, 44)},
        "arm.R": {"upper": D(-58, -76), "fore": D(-24, -62)}, "hand.R": {"twist": 0},
        "foot.L": F("L", 0.11, -0.11, yaw=2), "foot.R": F("R", -0.13, 0.11, yaw=-34),
        "knee.L": {"up": 0.0, "out": 0}, "knee.R": {"up": 0.0, "out": 0},
        "root_yaw": 0.0, "settle": 0.0,
    }
    M = lambda over: deep_merge(BASE, over)
    clips = {}

    # ---- 대기 (2.6초 반복): 가벼운 호흡, 무게를 살짝 옮기고 활 끝이 흔들린다
    def idle(t):
        w = 2 * PI * t / 2.6
        b = math.sin(w); c = math.cos(w); b2 = math.sin(w + 0.9)
        return M({
            "hips": {"pos": (0.006 * k * c, 0.0, (-0.035 + 0.006 * b) * k), "yaw": -24 + 1.0 * c, "roll": 0.8 * c},
            "spine": {"pitch": 1 - 0.8 * b, "roll": -0.5 * c}, "chest": {"pitch": 1.8 * b, "yaw": -4 - 0.8 * c},
            "head": {"yaw": 18 - 1.5 * c, "pitch": -2 - 1.0 * b2},
            "shoulder.L": {"raise": 1.5 + 1.5 * b}, "shoulder.R": {"raise": 1.5 + 1.5 * b},
            "arm.L": {"upper": D(72, -68 + 1.0 * b), "fore": D(24 + 1.5 * c, -46 + 2.5 * b)},
            "hand.L": {"blade": D(-6 + 2.5 * c, 44 + 3.0 * b2)},
            "arm.R": {"upper": D(-58, -76 + 0.8 * b), "fore": D(-24 + 2.0 * c, -62 + 2.0 * b2)},
        })
    clips["idle"] = dict(fn=idle, duration=2.6, loop=True)

    # ---- 보행 주기(걷기/달리기 공용)
    def gait(t, T, stride, lift, lean, bob, heel, swing, run):
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
            return F(s, sgn * 0.085, y, lift=lz, pitch=pitch, yaw=sgn * 3)
        out["foot.R"] = foot("R", ph)
        out["foot.L"] = foot("L", ph + PI)
        cR = math.cos(ph); sR = math.sin(ph)
        out["hips"] = {"pos": (-0.010 * k * sR, 0.0, (-0.045 + bob * math.cos(2 * ph + 0.4 * PI)) * k),
                       "yaw": 8 * cR * (stride / 0.32), "pitch": lean, "roll": 3.0 * sR}
        out["spine"] = {"yaw": -5 * cR, "pitch": lean * 0.25, "roll": -2.0 * sR}
        out["chest"] = {"yaw": -8 * cR, "pitch": lean * 0.25, "roll": -1.5 * sR}
        out["neck"] = {"yaw": 4 * cR, "pitch": -lean * 0.45, "roll": 0}
        out["head"] = {"yaw": 5 * cR, "pitch": -lean * 0.55, "roll": 0}
        s = cR                                             # +1: 오른발이 앞 → 왼팔이 앞, 오른팔이 뒤
        a = -s * swing                                     # 오른팔 흔들림(+ = 앞)
        out["shoulder.R"] = {"raise": 2, "fwd": 5 * a}
        out["shoulder.L"] = {"raise": 2, "fwd": 4 + 4 * s * swing}
        if run:
            out["arm.R"] = {"upper": D(-90 + 72 * a, -76 + 24 * a * a), "fore": D(-90 + 86 * a, -22 + 36 * a)}
            aL = 0.45 + 0.30 * s
            out["arm.L"] = {"upper": D(90 - 62 * aL, -72 + 14 * aL), "fore": D(90 - 78 * aL, -30 + 26 * aL)}
            out["hand.L"] = {"blade": D(-24 - 6 * s, 36 + 8 * s)}
        else:
            out["arm.R"] = {"upper": D(-90 + 50 * a, -80 + 6 * a * a), "fore": D(-90 + 70 * a, -66 + 14 * a)}
            aL = 0.30 + 0.22 * s * swing / 0.6
            out["arm.L"] = {"upper": D(90 - 50 * aL, -76 + 6 * aL), "fore": D(90 - 78 * aL, -52 + 12 * aL)}
            out["hand.L"] = {"blade": D(-10 - 4 * s, 34 + 5 * s)}
        out["hand.R"] = {"twist": 0}
        out["knee.L"] = {"up": 0.0, "out": 0}; out["knee.R"] = {"up": 0.0, "out": 0}
        out["root_yaw"] = 0.0; out["settle"] = 0.0
        return out
    clips["run"] = dict(fn=lambda t: gait(t, 18 / 30, 0.36, 0.26, 13, 0.034, 42, 1.0, True), duration=18 / 30, loop=True)
    clips["walk"] = dict(fn=lambda t: gait(t, 30 / 30, 0.20, 0.08, 3, 0.012, 22, 0.6, False), duration=30 / 30, loop=True)

    # ---- 조준 자세 만들기
    def aim(el=0.0, draw=1.0, head=72.0, lean=0.0, crouch=0.0, cant=0.0, over=None):
        """el: 조준 올림각, draw: 0(시위에 손을 얹음)~1(턱 옆까지 당김), lean: 표적 반대쪽으로 몸을 젖힘, cant: 활을 기울임"""
        tz = 76.0                                           # 표적 방향(heading 기준 az)
        # 오른팔: draw=0 은 시위 쪽으로 뻗고, 1 은 팔꿈치를 뒤로 빼 손이 턱 옆에 온다
        u0, f0 = (38.0, -22.0 + el * 0.6), (70.0, 4.0 + el * 0.8)
        u1, f1 = (-30.0, 25.0 - el * 0.45), (115.0, 2.0 + el * 0.55)
        d = draw
        P = M({
            "hips": {"pos": (0.0, (-0.02 + 0.05 * lean / 20.0) * k, (-0.055 - crouch) * k), "yaw": -58, "pitch": 0, "roll": -lean * 0.55},
            "spine": {"yaw": -6, "pitch": 0, "roll": -lean * 0.25}, "chest": {"yaw": -12 - 6 * d, "pitch": 0, "roll": -lean * 0.3},
            "neck": {"yaw": 28, "pitch": -el * 0.12, "roll": 0}, "head": {"yaw": head - 28 + 6 * d, "pitch": -el * 0.30, "roll": -4 * d},
            "shoulder.L": {"raise": 5 + el * 0.25, "fwd": -2}, "shoulder.R": {"raise": 6 + 8 * d, "fwd": 10 - 2 * d},
            "arm.L": {"upper": D(tz + 2 + 6 * d, el + 1), "fore": D(tz + 6 * d, el)},
            "hand.L": {"blade": D(tz + 6 * d - 180 + cant, 90 - el - abs(cant) * 0.3)},
            "arm.R": {"upper": D(u0[0] + (u1[0] - u0[0]) * d, u0[1] + (u1[1] - u0[1]) * d),
                      "fore": D(f0[0] + (f1[0] - f0[0]) * d, f0[1] + (f1[1] - f0[1]) * d)},
            "hand.R": {"twist": -30 * d},
            "foot.L": F("L", 0.07, -0.21, yaw=-22), "foot.R": F("R", -0.09, 0.21, yaw=-76),
        })
        return deep_merge(P, over) if over else P

    def loose(el=0.0, lean=0.0, crouch=0.0, cant=0.0, big=1.0):
        """놓은 직후: 오른손이 뒤로 튕겨 나가고, 활은 앞으로 살짝 숙여진다."""
        return aim(el=el, draw=1.0, lean=lean, crouch=crouch, cant=cant, over={
            "chest": {"yaw": -22 - 4 * big}, "shoulder.R": {"raise": 10, "fwd": -12},
            "arm.R": {"upper": D(-86 - 8 * big, 12 - el * 0.3), "fore": D(-24 - 26 * big, 34 - el * 0.2)},
            "hand.R": {"twist": 10},
            "hand.L": {"blade": D(76 + 6 - 180 + cant, 90 - el - 14 * big - abs(cant) * 0.3)},
            "head": {"roll": 0},
        })

    # ---- 공격 1: 겨누고 → 턱 옆까지 당겼다 → 놓는다
    a1 = Keyed([
        (0.00, BASE),
        (0.13, aim(draw=0.0, over={"hips": {"yaw": -44}, "chest": {"yaw": -8}}), "out"),
        (0.30, aim(draw=1.0, lean=4, over={"foot.R": F("R", -0.09, 0.22, yaw=-76)}), "out"),
        (0.345, aim(draw=1.0, lean=5), "lin"),
        (0.385, loose(lean=1, big=0.7), "out3"),
        (0.46, loose(lean=0, big=1.0), "out"),
        (0.62, BASE, "io"),
    ])
    clips["attack1"] = dict(fn=a1, duration=0.62, loop=False, events={"shoot": 0.35})

    # ---- 공격 2: 빠른 연사 — 낮게 웅크려 활을 비스듬히 기울이고 짧게 당겨 쏜다
    a2 = Keyed([
        (0.00, BASE),
        (0.10, aim(draw=0.1, crouch=0.07, cant=-28, over={"hips": {"yaw": -46, "pitch": 6}, "chest": {"pitch": 6}}), "out"),
        (0.21, aim(draw=0.86, crouch=0.10, cant=-28, over={"hips": {"pitch": 8}, "chest": {"pitch": 8}, "head": {"pitch": -8}}), "out"),
        (0.245, aim(draw=0.9, crouch=0.10, cant=-28, over={"hips": {"pitch": 8}, "chest": {"pitch": 8}, "head": {"pitch": -8}}), "lin"),
        (0.285, loose(crouch=0.09, cant=-28, big=0.6), "out3"),
        (0.36, loose(crouch=0.06, cant=-28, big=0.9), "out"),
        (0.50, BASE, "io"),
    ])
    clips["attack2"] = dict(fn=a2, duration=0.50, loop=False, events={"shoot": 0.25})

    # ---- 스킬 1: 하늘을 향해 크게 당겨 쏜다
    sky = 52.0
    def s1(t):
        P = Keyed([
            (0.00, BASE),
            (0.18, aim(el=-12, draw=0.0, crouch=0.16, over={"hips": {"yaw": -46, "pitch": 12}, "chest": {"pitch": 10}, "head": {"pitch": 6},
                                                              "foot.R": F("R", -0.10, 0.24, yaw=-76, pitch=10)}), "out"),
            (0.36, aim(el=sky * 0.7, draw=0.35, crouch=0.04, lean=8), "io"),
            (0.52, aim(el=sky, draw=1.0, lean=20, crouch=0.05, over={"foot.L": F("L", 0.07, -0.25, yaw=-22),
                                                                       "foot.R": F("R", -0.10, 0.25, yaw=-76)}), "out"),
            (0.66, aim(el=sky + 3, draw=1.0, lean=23, crouch=0.06, over={"foot.L": F("L", 0.07, -0.25, yaw=-22),
                                                                           "foot.R": F("R", -0.10, 0.25, yaw=-76)}), "lin"),
            (0.71, loose(el=sky + 2, lean=14, crouch=0.02, big=0.8), "out3"),
            (0.82, loose(el=sky - 6, lean=8, crouch=0.0, big=1.3), "out"),
            (0.92, loose(el=sky - 14, lean=5, crouch=0.02, big=1.2), "io"),
            (1.12, BASE, "io"),
        ])(t)
        if 0.52 <= t <= 0.66:      # 힘껏 당긴 채 미세하게 떨린다
            w = (t - 0.52) * 2 * PI * 11
            P["chest"]["roll"] = P["chest"]["roll"] + 0.7 * math.sin(w)
            P["shoulder.R"]["raise"] = P["shoulder.R"]["raise"] + 1.2 * math.sin(w * 1.3)
        return P
    clips["skill1"] = dict(fn=s1, duration=1.12, loop=False, events={"shoot": 0.67})

    # ---- 맞기: 상체가 뒤로 젖혀졌다가 앞으로 움츠리며 돌아온다
    hit = Keyed([
        (0.00, BASE),
        (0.07, M({"hips": {"pos": (0, 0.08 * k, -0.05 * k), "yaw": -16, "pitch": -8}, "spine": {"pitch": -8}, "chest": {"yaw": 10, "pitch": -14},
                  "neck": {"pitch": 10}, "head": {"yaw": 8, "pitch": -14, "roll": 8}, "shoulder.L": {"raise": 12}, "shoulder.R": {"raise": 12},
                  "arm.L": {"upper": D(70, -52), "fore": D(40, -8)}, "hand.L": {"blade": D(-30, 62)},
                  "arm.R": {"upper": D(-70, -50), "fore": D(-50, -6)},
                  "foot.R": F("R", -0.14, 0.20, yaw=-34)}), "out3"),
        (0.20, M({"hips": {"pos": (0, 0.04 * k, -0.10 * k), "yaw": -22, "pitch": 7}, "spine": {"pitch": 4}, "chest": {"yaw": -2, "pitch": 9},
                  "head": {"yaw": 16, "pitch": 6}, "arm.L": {"upper": D(56, -68), "fore": D(10, -30)}, "hand.L": {"blade": D(-14, 52)},
                  "arm.R": {"upper": D(-40, -66), "fore": D(0, -30)},
                  "foot.R": F("R", -0.14, 0.18, yaw=-34)}), "io"),
        (0.40, BASE, "io"),
    ])
    clips["hit"] = dict(fn=hit, duration=0.40, loop=False)

    # ---- 쓰러짐: 뒤로 비틀거리다 무릎이 꺾이며 등으로 넘어진다. 활은 왼손에 쥔 채 땅에 눕는다(마지막 자세 유지)
    lie = M({"hips": {"pos": (0, 0.62 * k, -0.86 * k), "yaw": -4, "pitch": -88, "roll": 3}, "spine": {"yaw": 0, "pitch": -2, "roll": 0},
             "chest": {"yaw": 3, "pitch": -2, "roll": 0}, "neck": {"yaw": -6, "pitch": 4, "roll": 0}, "head": {"yaw": -16, "pitch": 6, "roll": -6},
             "shoulder.L": {"raise": 6, "fwd": 0}, "shoulder.R": {"raise": 6, "fwd": 0},
             "arm.L": {"upper": D(80, -5), "fore": D(112, -2)}, "hand.L": {"blade": D(196, 1)},
             "arm.R": {"upper": D(-66, -5), "fore": D(-20, -3)}, "hand.R": {"twist": 40},
             "foot.L": F("L", 0.18, -0.22, lift=-0.04, yaw=22, pitch=-60), "foot.R": F("R", -0.20, -0.06, lift=-0.04, yaw=-30, pitch=-52),
             "knee.L": {"up": 1.0}, "knee.R": {"up": 1.0}, "settle": 1.0})
    death = Keyed([
        (0.00, BASE),
        (0.16, M({"hips": {"pos": (0, 0.10 * k, -0.06 * k), "yaw": -14, "pitch": -10}, "spine": {"pitch": -8}, "chest": {"yaw": 6, "pitch": -16},
                  "head": {"yaw": 6, "pitch": -18}, "shoulder.L": {"raise": 12}, "shoulder.R": {"raise": 12},
                  "arm.L": {"upper": D(66, -40), "fore": D(48, -20)}, "hand.L": {"blade": D(-40, 60)},
                  "arm.R": {"upper": D(-60, -40), "fore": D(-44, -30)},
                  "foot.R": F("R", -0.15, 0.26, yaw=-34)}), "out"),
        (0.46, M({"hips": {"pos": (0, 0.32 * k, -0.46 * k), "yaw": -8, "pitch": -44, "roll": 2}, "spine": {"yaw": 0, "pitch": -6, "roll": 0},
                  "chest": {"yaw": 3, "pitch": -12, "roll": 0}, "neck": {"yaw": 0, "pitch": 6, "roll": 0}, "head": {"yaw": 0, "pitch": 14, "roll": 0},
                  "shoulder.L": {"raise": 16, "fwd": 0}, "shoulder.R": {"raise": 16, "fwd": 0},
                  "arm.L": {"upper": D(74, 30), "fore": D(70, 52)}, "hand.L": {"blade": D(150, 50)},
                  "arm.R": {"upper": D(-70, 34), "fore": D(-56, 58)}, "hand.R": {"twist": 20},
                  "foot.L": F("L", 0.15, -0.18, yaw=14, pitch=-14), "foot.R": F("R", -0.17, 0.08, yaw=-32, pitch=-10),
                  "knee.L": {"up": 0.5}, "knee.R": {"up": 0.5}, "settle": 0.0}), "in"),
        (0.70, lie, "in"),
        (0.82, deep_merge(lie, {"hips": {"pos": (0, 0.63 * k, -0.80 * k), "pitch": -84}, "chest": {"pitch": 4}, "head": {"pitch": 10},
                                 "arm.L": {"upper": D(82, 8), "fore": D(110, 14)}, "hand.L": {"blade": D(196, 10)},
                                 "arm.R": {"upper": D(-70, 6), "fore": D(-28, 12)}, "settle": 0.0}), "out"),
        (0.98, lie, "io"),
        (1.40, lie, "lin"),
    ])
    clips["death"] = dict(fn=death, duration=1.40, loop=False)
    _clearance_report(rm, clips)
    return clips


def _clearance_report(rm, clips):
    """활(활대+시위)이 몸통·머리·다리 캡슐과 얼마나 떨어져 있는지 동작별로 로그에 남긴다(눈검사 보조, 결과에는 영향 없음)."""
    try:
        import numpy as np
        from common import log
        k = rm.H / 1.8
        half, brace, rot = 0.68 * k, 0.165 * k, math.radians(22.0)
        def zc(y):
            u = min(1.0, abs(y) / half)
            return -brace * (u ** 1.7) + 0.075 * k * (max(0.0, u - 0.74) / 0.26) ** 2
        zt = zc(half * 0.975)
        loc = []
        for y in np.linspace(-half, half, 41):
            for z in (zc(y), zt if abs(y) <= half * 0.975 else zc(y)):
                loc.append((z * math.sin(rot), y, z * math.cos(rot)))
        loc = np.array(loc)
        caps = [("hips", "chest", 0.115), ("chest", "neck", 0.12), ("neck", "head", 0.07), ("head", None, 0.095),
                ("thigh.L", "shin.L", 0.07), ("thigh.R", "shin.R", 0.07), ("shin.L", "foot.L", 0.05), ("shin.R", "foot.R", 0.05),
                ("upper_arm.R", "forearm.R", 0.04), ("forearm.R", "hand.R", 0.04)]
        Rw = rm.B["weapon.L"]["R"]
        for name, cd in clips.items():
            worst = (9.0, 0.0, "")
            n = max(2, int(round(cd["duration"] * 30)))
            for i in range(n + 1):
                t = cd["duration"] * i / n
                C, pos = rm.solve(cd["fn"](t))
                pts = pos["weapon.L"] + (C["weapon.L"] @ Rw @ loc.T).T
                for a, b, r in caps:
                    A = pos[a]
                    Bp = pos[b] if b else pos[a] + C[a] @ (rm.B[a]["tail"] - rm.B[a]["head"])
                    ab = Bp - A
                    u = np.clip(((pts - A) @ ab) / max(float(ab @ ab), 1e-9), 0, 1)
                    d = np.linalg.norm(pts - (A + np.outer(u, ab)), axis=1).min() - r * k
                    if d < worst[0]:
                        worst = (float(d), t, a)
            log("bow clearance %-8s min %+.3f m at t=%.2f near %s" % (name, worst[0], worst[1], worst[2]))
    except Exception as ex:
        print("clearance report failed:", repr(ex))
