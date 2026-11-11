"""오크 전사(사냥터 몬스터) 동작 세트. 전부 직접 만든 키 포즈/주기 함수다(외부 동작 파일 없음).

연기 방향: 덩치 큰 야만 전사. 무겁고 힘이 실린 동작, 어깨를 들썩이는 숨.
방향은 D(az, el): az 0=앞, +90=왼쪽, -90=오른쪽, 180=뒤 / el +90=위. 팔 방향은 몸통이 향한 수평 방향 기준.
"""
import math, os, sys, json
import numpy as np
from rigpose import D
from anims import Keyed, deep_merge, smooth01, PI, _slerp


def _install_debug(rm, clips):
    """ORC_WARRIOR_DBG=1 일 때만: 굽는 동안 프레임별 수치(발·머리 위치, 도끼 최저 높이, 도끼 머리↔몸 거리)를
    _work/orc_warrior_dbg.json 에 적는다. 공용 파일은 고치지 않고 이 프로세스 안에서만 감싼다(README 7절)."""
    import bpy
    main = sys.modules["__main__"]
    state = {"done": False}
    wp = bpy.data.objects.get("Weapon")
    wv = np.array([v.co[:] for v in wp.data.vertices]) if wp else None
    head_sel = wv[:, 1] > 0.30 * rm.H / 1.8 if wp is not None else None
    cur = {"clip": None, "t": 0.0}
    rec = {}
    for name, cd in clips.items():
        def mk(name=name, fn=cd["fn"]):
            def f(t):
                if not state["done"]:
                    install()                 # solve_clamped 는 동작 세트를 만든 뒤에 정의되므로 첫 호출 때 감싼다
                cur["clip"] = name; cur["t"] = t
                return fn(t)
            return f
        cd["fn"] = mk()
    def install():
        state["done"] = True
        if not hasattr(main, "solve_clamped"):
            return
        orig = main.solve_clamped
        out_path = os.path.join(main.ROOT, "_work", "orc_warrior_dbg.json")
        def wrapped(P):
            z0 = P.get("hips", {}).get("pos", (0, 0, 0))[2]
            co, it = orig(P)
            r = {"t": round(cur["t"], 4), "lift": round(P["hips"]["pos"][2] - z0, 4), "it": it}
            for b in ("hips", "head", "hand.L", "hand.R", "foot.L", "foot.R", "toe.L", "toe.R"):
                r[b] = [round(float(x), 4) for x in rm.pos[b]]
            if wp is not None:
                dg = bpy.context.evaluated_depsgraph_get()
                M = np.array(wp.evaluated_get(dg).matrix_world)
                W = wv @ M[:3, :3].T + M[:3, 3]
                r["wz"] = round(float(W[:, 2].min()), 4)
                hv = W[head_sel]
                d = np.linalg.norm(hv[:, None, :] - co[None, :, :].astype(np.float64), axis=2)
                j = np.unravel_index(int(d.argmin()), d.shape)
                r["wd"] = round(float(d[j]), 4)
                r["wd_at"] = [round(float(x), 3) for x in co[j[1]]]
            bs = main.body_set
            jb = int(co[bs, 2].argmin())
            r["bz_at"] = [round(float(x), 3) for x in co[bs[jb]]]
            rec.setdefault(cur["clip"], []).append(r)
            json.dump(rec, open(out_path, "w"))
            return co, it
        main.solve_clamped = wrapped
        if os.environ.get("ORC_WARRIOR_BIG"):
            orig_rv = main.render_view
            def rv(path, center, dist, az, el, **kw):
                if "_anim_" in path:
                    kw["res"] = (750, 950)
                return orig_rv(path, center, dist, az, el, **kw)
            main.render_view = rv


def orc_warrior_set(rm):
    k = rm.H / 1.8
    ra = rm.rest_ankle
    cx = 0.5 * (ra["L"][0] + ra["R"][0])        # 몸 중심선(이 모델은 원점에서 조금 벗어나 있다)

    def F(s, x, y, lift=0.0, **kw):
        d = dict(pos=(cx + x * k, y * k, ra[s][2] + lift * k))
        d.update(kw)
        return d

    # 기본 자세: 다리를 넓게 벌리고 구부정하게 선다. 도끼는 오른손에 늘어뜨린다.
    BASE = {
        "hips": {"pos": (0.0, 0.02 * k, -0.07 * k), "yaw": -10, "pitch": 6, "roll": 0},
        "spine": {"yaw": -2, "pitch": 7, "roll": 0}, "chest": {"yaw": -2, "pitch": 9, "roll": 0},
        "neck": {"yaw": 4, "pitch": -8, "roll": 0}, "head": {"yaw": 10, "pitch": -10, "roll": 0},
        "shoulder.L": {"raise": 4, "fwd": 8}, "shoulder.R": {"raise": 4, "fwd": 8},
        "arm.R": {"upper": D(-68, -70), "fore": D(-20, -75)}, "hand.R": {"blade": D(5, -22)},
        "arm.L": {"upper": D(72, -68), "fore": D(28, -62)}, "hand.L": {"twist": 0.0},
        "foot.L": F("L", 0.22, -0.11, yaw=12, pitch=0), "foot.R": F("R", -0.23, 0.11, yaw=-24, pitch=0),
        "knee.L": {"up": 0.0, "out": 8}, "knee.R": {"up": 0.0, "out": 8},
        "root_yaw": 0.0, "settle": 0.0,
    }
    M = lambda over: deep_merge(BASE, over)
    clips = {}

    # 발 옮기기: 미끄러지지 않게, 먼저 들고(lift) → 옮기고 → 내려놓는다. 옮기지 않는 동안은 목표가 한 점에 고정된다.
    def track(s, base, steps):
        """base=(x, y, lift), steps=[(t0, t1, (x, y, lift), 들어 올리는 높이)] → t 를 받아 발목 목표 위치를 돌려준다."""
        def pos(c, extra=0.0):
            return (cx + c[0] * k, c[1] * k, ra[s][2] + (c[2] + extra) * k)
        def f(t):
            c = base
            for (t0, t1, tgt, h) in steps:
                if t <= t0:
                    break
                if t >= t1:
                    c = tgt
                    continue
                u = (t - t0) / (t1 - t0)
                e = smooth01((u - 0.14) / 0.72)
                return pos(tuple(a + (b - a) * e for a, b in zip(c, tgt)), h * math.sin(PI * u) ** 0.7)
            return pos(c)
        return f

    def stepped(fn, tracks):
        def g(t):
            P = fn(t)
            for s, f in tracks.items():
                P["foot." + s]["pos"] = f(t)
            return P
        return g
    L0 = (0.22, -0.11, 0.0); R0 = (-0.23, 0.11, 0.0)

    # ---- 대기(2.8초 반복): 씩씩거리는 큰 숨. 들숨은 빠르게(주기의 36%), 날숨은 길게 내쉰다.
    #      어깨가 크게 들썩이고 가슴이 부풀며, 늘어뜨린 도끼 머리가 한 박자 늦게 흔들린다
    def idle(t):
        T = 2.8
        u = (t / T) % 1.0
        IN = 0.36
        ph = 0.5 * u / IN if u < IN else 0.5 + 0.5 * (u - IN) / (1 - IN)
        b = -math.cos(2 * PI * ph)            # -1(다 내쉼) → +1(다 들이쉼) → -1
        ul = (u - 0.09) % 1.0                 # 한 박자 늦게 따라오는 부분(머리·도끼)
        phl = 0.5 * ul / IN if ul < IN else 0.5 + 0.5 * (ul - IN) / (1 - IN)
        b2 = -math.cos(2 * PI * phl)
        w = 2 * PI * u
        c = math.cos(w); sn = math.sin(w)     # 느린 좌우 무게 이동
        return M({
            "hips": {"pos": (0.016 * k * sn, (0.02 + 0.008 * b) * k, (-0.075 + 0.014 * b) * k), "yaw": -10 + 1.5 * sn, "pitch": 6 - 1.5 * b, "roll": 1.0 * sn},
            "spine": {"pitch": 8 - 3.0 * b, "roll": -0.8 * sn}, "chest": {"pitch": 10 - 5.5 * b, "yaw": -2 - 1.5 * sn, "roll": 1.2 * c},
            "neck": {"pitch": -8 + 4.5 * b}, "head": {"yaw": 10 - 3.0 * sn, "pitch": -9 + 5.0 * b2, "roll": -1.5 * c},
            "shoulder.L": {"raise": 9 + 11 * b, "fwd": 7 - 6 * b}, "shoulder.R": {"raise": 9 + 11 * b, "fwd": 7 - 6 * b},
            "arm.R": {"upper": D(-68 - 6 * b, -68 + 5 * b), "fore": D(-20 + 3 * c, -73 + 5 * b2)},
            "hand.R": {"blade": D(5 + 8 * c, -22 + 9 * b2)},
            "arm.L": {"upper": D(72 + 7 * b, -66 + 5 * b), "fore": D(28 - 4 * c, -60 + 9 * b2)},
        })
    clips["idle"] = dict(fn=idle, duration=2.8, loop=True)

    # ---- 보행 주기(걷기/달리기 공용). 넓은 보폭 폭, 큰 좌우 흔들림, 쿵 하고 내려앉는 몸
    def gait(t, T, stride, lift, lean, bob, heel, sway, run):
        ph = 2 * PI * t / T
        out = {}
        def foot(s, phi):
            phi = phi % (2 * PI)
            sgn = 1.0 if s == "L" else -1.0
            if phi <= PI:                                   # 디딤: 등속으로 뒤로 밀린다(게임의 일정한 이동 속도와 맞물리게)
                u = phi / PI
                y = 0.03 + stride * (2 * u - 1)
                lz = 0.0
                if u < 0.22:
                    pitch = -heel * 0.30 * (1 - u / 0.22)
                elif u < 0.6:
                    pitch = 0.0
                else:
                    pitch = heel * smooth01((u - 0.6) / 0.4)
            else:                                           # 내딛는 발
                u = (phi - PI) / PI
                # 뗄 때와 디딜 때의 속도가 디딤 속도와 이어지는 3차 곡선(뒤에서 앞으로)
                y = 0.03 + stride * (8 * u ** 3 - 12 * u ** 2 + 2 * u + 1)
                lz = lift * math.sin(PI * u) * (1 - 0.30 * (2 * u - 1))
                if u < 0.3:
                    pitch = heel + (heel * 0.5) * smooth01(u / 0.3)
                else:
                    pitch = heel * 1.5 + (-heel * 0.30 - heel * 1.5) * smooth01((u - 0.3) / 0.7)
            return F(s, sgn * (0.19 if run else 0.21), y, lift=lz, pitch=pitch, yaw=sgn * (6 if run else 12))
        out["foot.R"] = foot("R", ph)
        out["foot.L"] = foot("L", ph + PI)
        cR = math.cos(ph); sR = math.sin(ph)                 # sR>0: 오른발이 디디는 중
        dip = math.cos(2 * ph - 0.30 * PI)                   # 발이 닿은 직후 가장 낮다
        base_z = -0.09 if run else -0.07
        out["hips"] = {"pos": (-sway * k * sR, (-0.03 if run else 0.0) * k, (base_z - bob * dip) * k),
                       "yaw": (9 if run else 7) * cR, "pitch": lean, "roll": (3.0 if run else 4.0) * sR}
        out["spine"] = {"yaw": -5 * cR, "pitch": lean * 0.35 + 5, "roll": -3.0 * sR}
        out["chest"] = {"yaw": -8 * cR, "pitch": lean * 0.35 + 7 + 2.0 * dip, "roll": -3.5 * sR}
        out["neck"] = {"yaw": 4 * cR, "pitch": -lean * 0.5 - 6, "roll": 1.5 * sR}
        out["head"] = {"yaw": 5 * cR, "pitch": -lean * 0.6 - 8 - 1.5 * dip, "roll": 1.5 * sR}
        s = cR                                              # +1: 오른발이 앞 → 왼팔이 앞
        out["knee.L"] = {"up": 0.0, "out": 10}; out["knee.R"] = {"up": 0.0, "out": 10}
        if run:
            # 왼팔은 크게 휘젓고, 오른팔은 도끼를 어깨 위로 치켜든 채 돌진한다
            out["shoulder.L"] = {"raise": 6 + 3 * dip, "fwd": 8 + 10 * s}
            out["shoulder.R"] = {"raise": 16 + 3 * dip, "fwd": 4 - 5 * s}
            out["arm.L"] = {"upper": D(62 - 52 * s, -56 + 8 * s), "fore": D(20 - 26 * s, -18 + 34 * s)}
            out["hand.L"] = {"twist": 0.0}
            out["arm.R"] = {"upper": D(-58 + 8 * s, -24 - 5 * dip), "fore": D(-24 + 6 * s, 58 - 4 * dip)}
            out["hand.R"] = {"blade": D(162 - 6 * s, 50 - 7 * dip)}
        else:
            out["shoulder.L"] = {"raise": 4 + 2.5 * dip, "fwd": 8 + 6 * s}
            out["shoulder.R"] = {"raise": 4 + 2.5 * dip, "fwd": 8 - 4 * s}
            out["arm.L"] = {"upper": D(72 - 44 * s, -68 + 4 * s), "fore": D(40 - 32 * s, -58 + 20 * s)}
            out["hand.L"] = {"twist": 0.0}
            out["arm.R"] = {"upper": D(-78 - 12 * s, -66), "fore": D(-30 - 8 * s, -72 - 5 * s)}
            out["hand.R"] = {"blade": D(-12 - 3 * s, -22 - 5 * s + 3 * dip)}   # 앞으로 나오는 오른 허벅지에 도끼 머리가 닿지 않게 바깥으로 든다
        out["root_yaw"] = 0.0; out["settle"] = 0.0
        return out
    clips["walk"] = dict(fn=lambda t: gait(t, 38 / 30, 0.20, 0.12, 5, 0.022, 20, 0.040, False), duration=38 / 30, loop=True)
    clips["run"] = dict(fn=lambda t: gait(t, 20 / 30, 0.40, 0.26, 17, 0.034, 38, 0.026, True), duration=20 / 30, loop=True)
    # 게임 이동 속도(= 디딤 구간 이동 거리 ÷ 디딤 시간): walk 2*0.20k/(19/30 s) ≈ 0.75 m/s, run 2*0.40k/(10/30 s) ≈ 2.87 m/s

    # ---- 공격 1: 도끼 내려찍기(0.83초). 크게 치켜들고(느리게) → 왼발을 내디디며 온몸으로 찍는다 → 찍은 자세로 버틴 뒤 천천히 일어선다
    a1_hit = M({"hips": {"pos": (0, -0.16 * k, -0.20 * k), "yaw": 2, "pitch": 18}, "spine": {"yaw": 2, "pitch": 12}, "chest": {"yaw": 6, "pitch": 20},
                "neck": {"pitch": -12}, "head": {"yaw": -6, "pitch": -18},
                "shoulder.R": {"raise": 0, "fwd": 20}, "shoulder.L": {"raise": 2, "fwd": -4},
                "arm.R": {"upper": D(-10, -40), "fore": D(-2, -66)}, "hand.R": {"blade": D(3, -32)},
                "arm.L": {"upper": D(96, -52), "fore": D(120, -40)},
                "foot.L": {"yaw": 10, "pitch": 0}, "foot.R": {"yaw": -24, "pitch": 26}})
    a1 = Keyed([
        (0.00, BASE),
        (0.14, M({"hips": {"pos": (0, 0.03 * k, -0.11 * k), "yaw": -14, "pitch": 9}, "chest": {"yaw": -8, "pitch": 6}, "head": {"yaw": 16, "pitch": -8},
                  "shoulder.R": {"raise": 12, "fwd": 4},
                  "arm.R": {"upper": D(-62, -30), "fore": D(-34, 24)}, "hand.R": {"blade": D(-24, 62)},
                  "arm.L": {"upper": D(60, -56), "fore": D(10, -30)}}), "io"),
        (0.30, M({"hips": {"pos": (0, 0.06 * k, 0.0), "yaw": -8, "pitch": -6}, "spine": {"yaw": -2, "pitch": -6}, "chest": {"yaw": -4, "pitch": -14},
                  "neck": {"pitch": 2}, "head": {"yaw": 8, "pitch": 4},
                  "shoulder.R": {"raise": 32, "fwd": 2}, "shoulder.L": {"raise": 12, "fwd": 10},
                  "arm.R": {"upper": D(-28, 68), "fore": D(170, 68)}, "hand.R": {"blade": D(178, 16)},
                  "arm.L": {"upper": D(34, -8), "fore": D(8, 34)},
                  "foot.L": {"pitch": 6}, "foot.R": {"pitch": 4}}), "out"),
        (0.38, M({"hips": {"pos": (0, -0.05 * k, -0.07 * k), "yaw": -3, "pitch": 7}, "spine": {"pitch": 5}, "chest": {"yaw": 2, "pitch": 7},
                  "head": {"yaw": 0, "pitch": -8},
                  "shoulder.R": {"raise": 18, "fwd": 12}, "shoulder.L": {"raise": 6, "fwd": 2},
                  "arm.R": {"upper": D(-14, 38), "fore": D(-5, 34)}, "hand.R": {"blade": D(0, 64)},
                  "arm.L": {"upper": D(70, -30), "fore": D(60, -10)},
                  "foot.L": {"yaw": 10, "pitch": -8}, "foot.R": {"pitch": 16}}), "in"),
        (0.46, a1_hit, "lin"),
        (0.58, deep_merge(a1_hit, {"hips": {"pos": (0, -0.17 * k, -0.22 * k), "pitch": 20}, "chest": {"pitch": 22},
                                    "arm.R": {"upper": D(-10, -43), "fore": D(-2, -69)}, "hand.R": {"blade": D(3, -37)}}), "out"),
        (0.71, M({"hips": {"pos": (0, -0.08 * k, -0.14 * k), "yaw": -4, "pitch": 13}, "spine": {"yaw": 0, "pitch": 10}, "chest": {"yaw": 1, "pitch": 15},
                  "neck": {"pitch": -10}, "head": {"yaw": 2, "pitch": -14},
                  "shoulder.R": {"raise": 2, "fwd": 14}, "shoulder.L": {"raise": 3, "fwd": 2},
                  "arm.R": {"upper": D(-40, -58), "fore": D(-10, -72)}, "hand.R": {"blade": D(4, -24)},
                  "arm.L": {"upper": D(84, -60), "fore": D(70, -52)},
                  "foot.L": {"yaw": 11, "pitch": 0}, "foot.R": {"pitch": 12}}), "in"),
        (0.83, BASE, "out"),
    ])
    a1 = stepped(a1, {"L": track("L", L0, [(0.27, 0.44, (0.22, -0.31, 0.0), 0.07), (0.60, 0.80, L0, 0.065)]),
                      "R": track("R", R0, [])})
    clips["attack1"] = dict(fn=a1, duration=0.8333, loop=False, events={"hit": 0.46})

    # ---- 공격 2: 크게 옆으로 휘두르기(0.93초). 오른쪽 뒤로 한껏 당겼다가 왼쪽 끝까지 쓸어 내고,
    #      왼쪽 끝에서 잠깐 버틴 뒤 도끼를 아래로 늘어뜨리며 돌아온다(되돌아 휘두르는 것처럼 보이지 않게). 두 발은 제자리
    a2 = Keyed([
        (0.00, BASE),
        (0.13, M({"hips": {"pos": (-0.02 * k, 0.03 * k, -0.10 * k), "yaw": -20, "pitch": 6}, "spine": {"yaw": -8}, "chest": {"yaw": -12, "pitch": 8},
                  "head": {"yaw": 30}, "shoulder.R": {"raise": 8, "fwd": -4},
                  "arm.R": {"upper": D(-84, -40), "fore": D(-80, -8)}, "hand.R": {"blade": D(-104, 40)},
                  "arm.L": {"upper": D(60, -56), "fore": D(0, -24)}}), "io"),
        (0.28, M({"hips": {"pos": (-0.05 * k, 0.05 * k, -0.13 * k), "yaw": -30, "pitch": 6}, "spine": {"yaw": -14, "pitch": 5}, "chest": {"yaw": -22, "pitch": 6},
                  "neck": {"yaw": 14}, "head": {"yaw": 44, "pitch": -8},
                  "shoulder.R": {"raise": 10, "fwd": -6}, "shoulder.L": {"raise": 4, "fwd": 16},
                  "arm.R": {"upper": D(-98, -8), "fore": D(-128, 12)}, "hand.R": {"blade": D(158, 26)},
                  "arm.L": {"upper": D(24, -34), "fore": D(-24, -6)}}), "out"),
        (0.36, M({"hips": {"pos": (0.0, -0.02 * k, -0.14 * k), "yaw": -8, "pitch": 8}, "spine": {"yaw": -3, "pitch": 6}, "chest": {"yaw": -4, "pitch": 8},
                  "neck": {"yaw": 4}, "head": {"yaw": 12, "pitch": -8},
                  "shoulder.R": {"raise": 6, "fwd": 4}, "shoulder.L": {"raise": 4, "fwd": 4},
                  "arm.R": {"upper": D(-64, -10), "fore": D(-48, -6)}, "hand.R": {"blade": D(-112, 4)},
                  "arm.L": {"upper": D(70, -40), "fore": D(40, -20)},
                  "foot.R": {"pitch": 8}}), "in"),
        (0.43, M({"hips": {"pos": (0.03 * k, -0.06 * k, -0.15 * k), "yaw": 10, "pitch": 9}, "spine": {"yaw": 6, "pitch": 6}, "chest": {"yaw": 12, "pitch": 9},
                  "neck": {"yaw": -6}, "head": {"yaw": -18, "pitch": -8},
                  "shoulder.R": {"raise": 2, "fwd": 18}, "shoulder.L": {"raise": 4, "fwd": -6},
                  "arm.R": {"upper": D(-22, -12), "fore": D(-2, -8)}, "hand.R": {"blade": D(-62, -2)},
                  "arm.L": {"upper": D(100, -42), "fore": D(110, -30)},
                  "foot.R": {"pitch": 18}}), "lin"),
        (0.51, M({"hips": {"pos": (0.05 * k, -0.08 * k, -0.15 * k), "yaw": 26, "pitch": 9}, "spine": {"yaw": 13, "pitch": 6}, "chest": {"yaw": 24, "pitch": 9},
                  "neck": {"yaw": -10}, "head": {"yaw": -34, "pitch": -8},
                  "shoulder.R": {"raise": 0, "fwd": 14}, "shoulder.L": {"raise": 4, "fwd": -10},
                  "arm.R": {"upper": D(4, -18), "fore": D(40, -12)}, "hand.R": {"blade": D(-18, -6)},
                  "arm.L": {"upper": D(112, -46), "fore": D(130, -36)},
                  "foot.R": {"pitch": 26}}), "lin"),
        (0.62, M({"hips": {"pos": (0.06 * k, -0.08 * k, -0.14 * k), "yaw": 30, "pitch": 8}, "spine": {"yaw": 15, "pitch": 6}, "chest": {"yaw": 28, "pitch": 8},
                  "neck": {"yaw": -10}, "head": {"yaw": -38, "pitch": -8},
                  "shoulder.R": {"raise": 0, "fwd": 14}, "shoulder.L": {"raise": 4, "fwd": -10},
                  "arm.R": {"upper": D(12, -24), "fore": D(52, -18)}, "hand.R": {"blade": D(18, -12)},
                  "arm.L": {"upper": D(114, -48), "fore": D(132, -38)},
                  "foot.R": {"pitch": 26}}), "out"),
        (0.73, M({"hips": {"pos": (0.06 * k, -0.08 * k, -0.16 * k), "yaw": 29, "pitch": 10}, "spine": {"yaw": 15, "pitch": 7}, "chest": {"yaw": 27, "pitch": 10},
                  "neck": {"yaw": -10}, "head": {"yaw": -36, "pitch": -9},
                  "shoulder.R": {"raise": -2, "fwd": 13}, "shoulder.L": {"raise": 4, "fwd": -9},
                  "arm.R": {"upper": D(13, -32), "fore": D(50, -28)}, "hand.R": {"blade": D(20, -22)},
                  "arm.L": {"upper": D(112, -50), "fore": D(128, -40)},
                  "foot.R": {"pitch": 24}}), "io"),
        (0.84, M({"hips": {"pos": (0.025 * k, -0.02 * k, -0.11 * k), "yaw": 6, "pitch": 8}, "spine": {"yaw": 3, "pitch": 7}, "chest": {"yaw": 6, "pitch": 10},
                  "neck": {"yaw": 0}, "head": {"yaw": -6, "pitch": -10},
                  "shoulder.R": {"raise": 1, "fwd": 10}, "shoulder.L": {"raise": 4, "fwd": 2},
                  "arm.R": {"upper": D(-34, -66), "fore": D(-4, -76)}, "hand.R": {"blade": D(8, -36)},
                  "arm.L": {"upper": D(90, -62), "fore": D(70, -56)},
                  "foot.R": {"pitch": 8}}), "in"),
        (0.9333, BASE, "out"),
    ])
    a2 = stepped(a2, {"L": track("L", L0, []), "R": track("R", R0, [])})
    clips["attack2"] = dict(fn=a2, duration=0.9333, loop=False, events={"hit": 0.46})   # 날이 정면을 지나는 순간

    # ---- 맞기(0.4초): 두 발은 버틴 채 상체가 뒤로 젖혀졌다가(3~4프레임) 으르렁대며 앞으로 웅크려 되돌아온다
    hit = Keyed([
        (0.00, BASE),
        (0.11, M({"hips": {"pos": (0.02 * k, 0.075 * k, -0.035 * k), "yaw": -3, "pitch": -7}, "spine": {"pitch": -8, "roll": -4}, "chest": {"yaw": 14, "pitch": -13, "roll": -5},
                  "neck": {"pitch": 4}, "head": {"yaw": -8, "pitch": -16, "roll": 10},
                  "shoulder.L": {"raise": 14, "fwd": -2}, "shoulder.R": {"raise": 12, "fwd": 0},
                  "arm.R": {"upper": D(-80, -56), "fore": D(-40, -50)}, "hand.R": {"blade": D(-20, 4)},
                  "arm.L": {"upper": D(74, -38), "fore": D(30, 2)},
                  "foot.L": {"pitch": -6}}), "io"),
        (0.25, M({"hips": {"pos": (0, 0.03 * k, -0.12 * k), "yaw": -12, "pitch": 10}, "spine": {"pitch": 9}, "chest": {"yaw": -2, "pitch": 14},
                  "head": {"yaw": 10, "pitch": -4},
                  "arm.R": {"upper": D(-70, -66), "fore": D(-24, -66)}, "hand.R": {"blade": D(5, -14)}}), "io"),
        (0.40, BASE, "io"),
    ])
    hit = stepped(hit, {"L": track("L", L0, []), "R": track("R", R0, [])})
    clips["hit"] = dict(fn=hit, duration=0.40, loop=False)

    # ---- 쓰러짐(1.5초): 오른발을 들어 한 걸음 물러서며 휘청 → 무릎이 꺾이며 등으로 쿵 → 한 번 들썩이고 멈춘다(마지막 자세 유지)
    #      마지막 자세: 왼무릎은 세우고 오른다리는 뻗음, 왼팔은 머리 쪽으로 꺾이고 오른팔은 옆구리 아래로, 도끼 머리는 바닥에 닿는다
    lie = M({"hips": {"pos": (0, 0.70 * k, -0.772 * k), "yaw": -6, "pitch": -86, "roll": 4}, "spine": {"yaw": 0, "pitch": 0, "roll": 0},
             "chest": {"yaw": 4, "pitch": 3, "roll": 0}, "neck": {"yaw": 8, "pitch": 4, "roll": 0}, "head": {"yaw": 20, "pitch": 6, "roll": 8},
             "shoulder.L": {"raise": 14, "fwd": 0}, "shoulder.R": {"raise": 2, "fwd": 0},
             "arm.R": {"upper": D(-50, -10), "fore": D(-34, -15)}, "hand.R": {"blade": D(-112, -8)},
             "arm.L": {"upper": D(104, -8), "fore": D(158, -10)}, "hand.L": {"twist": 0.0},
             "foot.L": {"yaw": 20, "pitch": -6}, "foot.R": {"yaw": -40, "pitch": -56},
             "knee.L": {"up": 1.0, "out": 14}, "knee.R": {"up": 1.0, "out": 10}, "settle": 1.0})
    death = Keyed([
        (0.00, BASE),
        (0.22, M({"hips": {"pos": (0, 0.12 * k, -0.06 * k), "yaw": -8, "pitch": -10}, "spine": {"pitch": -8}, "chest": {"yaw": 6, "pitch": -18},
                  "neck": {"pitch": 6}, "head": {"yaw": 6, "pitch": -20, "roll": 6},
                  "shoulder.L": {"raise": 14}, "shoulder.R": {"raise": 14},
                  "arm.R": {"upper": D(-66, -44), "fore": D(-50, -36)}, "hand.R": {"blade": D(-70, 14)},
                  "arm.L": {"upper": D(66, -40), "fore": D(50, -30)},
                  "foot.R": {"yaw": -28}}), "io"),
        (0.42, M({"hips": {"pos": (0, 0.20 * k, -0.20 * k), "yaw": -6, "pitch": -18}, "spine": {"pitch": -8}, "chest": {"yaw": 4, "pitch": -16},
                  "neck": {"pitch": 8}, "head": {"yaw": 8, "pitch": 4, "roll": 4},
                  "shoulder.L": {"raise": 16}, "shoulder.R": {"raise": 16},
                  "arm.R": {"upper": D(-70, -10), "fore": D(-56, 14)}, "hand.R": {"blade": D(-86, 34)},
                  "arm.L": {"upper": D(74, -4), "fore": D(64, 22)},
                  "foot.L": {"yaw": 14, "pitch": -8}, "foot.R": {"yaw": -30},
                  "knee.L": {"up": 0.2}, "knee.R": {"up": 0.2}}), "io"),
        (0.70, M({"hips": {"pos": (0, 0.40 * k, -0.50 * k), "yaw": -6, "pitch": -48, "roll": 2}, "spine": {"yaw": 0, "pitch": -6, "roll": 0},
                  "chest": {"yaw": 3, "pitch": -12, "roll": 0}, "neck": {"yaw": 6, "pitch": 6, "roll": 0}, "head": {"yaw": 10, "pitch": 14, "roll": 4},
                  "shoulder.L": {"raise": 18, "fwd": 0}, "shoulder.R": {"raise": 14, "fwd": 0},
                  "arm.R": {"upper": D(-64, 22), "fore": D(-52, 44)}, "hand.R": {"blade": D(-96, 36)},
                  "arm.L": {"upper": D(84, 34), "fore": D(96, 58)},
                  "foot.L": {"yaw": 18, "pitch": -14}, "foot.R": {"yaw": -34, "pitch": -20},
                  "knee.L": {"up": 0.55, "out": 12}, "knee.R": {"up": 0.55}, "settle": 0.0}), "in"),
        (0.92, lie, "in"),
        (1.04, deep_merge(lie, {"hips": {"pos": (0, 0.71 * k, -0.66 * k), "pitch": -82}, "chest": {"pitch": 9}, "head": {"pitch": 12},
                                 "arm.R": {"upper": D(-52, -3), "fore": D(-36, -2)}, "hand.R": {"blade": D(-112, -3)},
                                 "arm.L": {"upper": D(104, 0), "fore": D(154, 6)}}), "out"),
        (1.20, lie, "io"),
        (1.50, lie, "lin"),
    ])
    death = stepped(death, {"R": track("R", R0, [(0.02, 0.20, (-0.24, 0.27, 0.0), 0.07), (0.46, 0.90, (-0.31, -0.08, -0.04), 0.10)]),
                            "L": track("L", L0, [(0.50, 0.90, (0.30, 0.04, 0.0), 0.08)])})
    # 누운 뒤에는 도끼날 면이 바닥과 나란하도록 손목을 돌린다(날이 땅속으로 서지 않게). 쓰러지는 동안 서서히 섞는다
    death_k = death
    def death(t):
        P = death_k(t)
        w = smooth01((t - 0.70) / 0.22)
        if w > 0.0:
            P["hand.R"]["edge"] = _slerp(P["arm.R"]["fore"], D(-34, 0), w)
        return P
    clips["death"] = dict(fn=death, duration=1.50, loop=False)
    if os.environ.get("ORC_WARRIOR_DBG"):
        _install_debug(rm, clips)
    return clips
