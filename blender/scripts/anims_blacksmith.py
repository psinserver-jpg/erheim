"""대장장이(마을 NPC, 장비 강화 담당) 동작 세트. 전부 직접 만든 키 포즈/주기 함수다.

성격: 듬직하고 푸근한 장인. 동작은 느긋하고 무게감 있게.
work 는 모루(앞 0.45m, 높이 0.75m)에 손이 정확히 닿아야 해서, 프레임마다 간단한 2뼈 IK 로 팔 방향을 계산한다.
"""
import math
import numpy as np
from rigpose import D, unit
from anims import Keyed, deep_merge, smooth01, PI


def blacksmith_set(rm):
    k = rm.H / 1.8
    ra = rm.rest_ankle
    B = rm.B

    def F(s, x, y, lift=0.0, **kw):
        d = dict(pos=(x * k, y * k, ra[s][2] + lift * k))
        d.update(kw)
        return d

    def hang(s, a_up, a_fore, out=0.22, out_f=0.10):
        """늘어뜨린 팔. a_up/a_fore: 수직 아래에서 앞으로 든 각도(도), out: 옆으로 벌어진 정도."""
        sg = 1.0 if s == "L" else -1.0
        u = (sg * out, -math.sin(math.radians(a_up)), -math.cos(math.radians(a_up)))
        f = (sg * out_f, -math.sin(math.radians(a_fore)), -math.cos(math.radians(a_fore)))
        return {"upper": u, "fore": f}

    # ---- 2뼈 IK: 손잡이(오른손)·손목(왼손)을 목표 위치에 놓도록 팔 방향을 계산해 P 에 써 넣는다
    L1 = {s: float(np.linalg.norm(B["forearm." + s]["head"] - B["upper_arm." + s]["head"])) for s in ("L", "R")}
    L2 = {s: float(np.linalg.norm(B["hand." + s]["head"] - B["forearm." + s]["head"])) for s in ("L", "R")}

    AO = 0.17          # 편히 늘어뜨린 팔이 옆으로 벌어진 정도

    def _debug_work(fn):
        """타격 순간 망치 타격면 중심과 왼손목 위치를 로그에 남긴다(모루 정합 확인용)."""
        try:
            for tt in (0.40, 0.60, 0.70):
                P = fn(tt); rm.solve(P)
                g = rm.grip_world("R"); bd = rm.blade_dir("R")
                C = rm.C["hand.R"]; zax = C @ B["weapon.R"]["R"][:, 2]
                face = g + bd * (0.215 * k) + zax * (0.084 * k)
                print("[RIG] bs_work t=%.2f grip=%s head=%s face=%s wristL=%s" % (tt, np.round(g, 3), np.round(g + bd * 0.215 * k, 3), np.round(face, 3), np.round(rm.pos["hand.L"], 3)))
            print("[RIG] bs arm len L1=%.3f L2=%.3f" % (L1["R"], L2["R"]))
        except Exception as ex:
            print("[RIG] bs_work debug failed: %r" % (ex,))

    def _anvil_proxy(ax, ay, az):
        """검수용 모루 대용 상자. 환경변수 BS_ANVIL=1 일 때만 만들고, 아니면 남아 있는 것을 지운다(내보내기에 섞이지 않게)."""
        try:
            import bpy, os
            old = bpy.data.objects.get("_AnvilProxy")
            if old is not None:
                bpy.data.objects.remove(old, do_unlink=True)
            if os.environ.get("BS_ANVIL") != "1":
                return
            hx, hy = 0.17 * k, 0.11 * k
            vs = [(ax + sx * hx + 0.04 * k, ay + sy * hy, z) for z in (0.0, az) for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
            fs = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
            me = bpy.data.meshes.new("_AnvilProxyMesh"); me.from_pydata(vs, [], fs)
            ob = bpy.data.objects.new("_AnvilProxy", me)
            bpy.context.scene.collection.objects.link(ob)
        except Exception as ex:
            print("[RIG] anvil proxy failed: %r" % (ex,))

    def reach(P, s, target, pole, grip=False, iters=4):
        target = np.array(target, dtype=float); pole = np.array(pole, dtype=float)
        for _ in range(iters if grip else 1):
            C, pos = rm.solve(P)
            S = pos["upper_arm." + s]
            off = (rm.grip_world(s) - pos["hand." + s]) if grip else 0.0
            W = target - off
            v = W - S
            d = min(float(np.linalg.norm(v)), 0.995 * (L1[s] + L2[s]))
            n = unit(v)
            ca = max(-1.0, min(1.0, (L1[s] ** 2 + d * d - L2[s] ** 2) / (2 * L1[s] * d)))
            sa = math.sqrt(max(0.0, 1 - ca * ca))
            m = pole - n * float(pole @ n)
            m = unit(m) if np.linalg.norm(m) > 1e-4 else np.array([0.0, 1.0, 0.0])
            E = S + L1[s] * (ca * n + sa * m)
            Ch = rm.C_heading
            P["arm." + s] = {"upper": tuple(Ch.T @ unit(E - S)), "fore": tuple(Ch.T @ unit(S + n * d - E))}
        return P

    # ---- 기본 자세: 발을 어깨너비로 편히 딛고, 두 팔은 힘을 빼고 늘어뜨린다(망치는 오른손에 느슨하게)
    BASE = {
        "hips": {"pos": (0.0, 0.0, -0.008 * k), "yaw": -6, "pitch": 1, "roll": 0},
        "spine": {"yaw": 0, "pitch": 2, "roll": 0}, "chest": {"yaw": 2, "pitch": 2, "roll": 0},
        "neck": {"yaw": 2, "pitch": 0, "roll": 0}, "head": {"yaw": 4, "pitch": 0, "roll": 0},
        "shoulder.L": {"raise": 0, "fwd": 0}, "shoulder.R": {"raise": 0, "fwd": 0},
        "arm.R": hang("R", 3, 15, AO, 0.07), "hand.R": {"blade": D(-6, 2)},
        "arm.L": hang("L", -1, 9, AO, 0.03), "hand.L": {"twist": 0},
        "foot.L": F("L", 0.175, -0.03, yaw=10, pitch=0), "foot.R": F("R", -0.180, 0.035, yaw=-14, pitch=0),
        "knee.L": {"up": 0.0}, "knee.R": {"up": 0.0},
        "root_yaw": 0.0, "settle": 0.0,
    }
    M = lambda over: deep_merge(BASE, over)
    clips = {}

    # ---- 대기(3.2초 반복): 깊은 호흡(가슴·어깨가 오르내림) + 체중을 좌우로 천천히 옮긴다. 망치가 느슨하게 흔들린다
    def idle(t):
        w = 2 * PI * t / 3.2
        b = math.sin(w); c = math.cos(w); b2 = math.sin(w - 0.8); s2 = math.sin(2 * w); c2 = math.cos(2 * w)
        return M({
            "hips": {"pos": (0.030 * k * c, 0.004 * k * s2, (-0.012 - 0.008 * c2) * k), "yaw": -6 + 3.0 * c, "roll": 2.5 * c},
            "spine": {"pitch": 2 - 1.5 * s2, "roll": -1.4 * c}, "chest": {"pitch": 2 - 4.5 * s2, "yaw": 2 - 1.5 * c, "roll": -1.2 * c},
            "neck": {"pitch": 1.5 * s2}, "head": {"yaw": 4 - 5.0 * c, "pitch": 1.0 + 2.0 * b2, "roll": 1.0 * c},
            "shoulder.L": {"raise": 4.0 * s2 + 3.0}, "shoulder.R": {"raise": 4.0 * s2 + 3.0},
            "arm.R": hang("R", 3 + 3.0 * b2, 15 + 7.0 * b2, AO + 0.03 * s2, 0.07), "hand.R": {"blade": D(-6 + 4.0 * c, 2 + 9.0 * b2 + 2.0 * s2)},
            "arm.L": hang("L", -1 - 3.0 * b2, 9 + 5.0 * b, AO + 0.03 * s2, 0.03),
        })
    clips["idle"] = dict(fn=idle, duration=3.2, loop=True)

    # ---- 걷기(1.2초 반복): 넓은 보폭으로 발을 분명히 들고, 디딜 때 골반이 내려앉는 묵직한 걸음
    #      디딤 구간의 발은 등속으로 뒤로 간다(게임 이동 속도 = 4*stride*k/T 와 맞추면 미끄러지지 않는다)
    WALK_T = 1.2; WALK_STRIDE = 0.25
    def walk(t):
        T = WALK_T; stride = WALK_STRIDE; lift = 0.14; heel = 22
        ph = 2 * PI * t / T
        out = {}
        def foot(s, phi):
            phi = phi % (2 * PI)
            sgn = 1.0 if s == "L" else -1.0
            if phi <= PI:
                u = phi / PI; lz = 0.0
                y = 0.02 + stride * (2 * u - 1)
                if u < 0.25:
                    pitch = -heel * 0.45 * (1 - u / 0.25)
                elif u < 0.6:
                    pitch = 0.0
                else:
                    pitch = heel * smooth01((u - 0.6) / 0.4)
            else:
                u = (phi - PI) / PI
                y = 0.02 + stride * (1 - 2 * smooth01(u))
                lz = lift * max(0.0, math.sin(PI * u)) ** 0.9 * (1 - 0.35 * (2 * u - 1))
                if u < 0.35:
                    pitch = heel + heel * 0.8 * smooth01(u / 0.35)
                else:
                    pitch = heel * 1.8 + (-heel * 0.45 - heel * 1.8) * smooth01((u - 0.35) / 0.65)
            return F(s, sgn * 0.125, y, lift=lz, pitch=pitch, yaw=sgn * 9)
        out["foot.R"] = foot("R", ph)
        out["foot.L"] = foot("L", ph + PI)
        cR = math.cos(ph); sR = math.sin(ph)
        # 디딤발 쪽으로 몸이 실리고(좌우 흔들림), 발이 닿은 직후 쿵 하고 내려앉았다가 디딤 중간에 올라온다
        out["hips"] = {"pos": (-0.034 * k * sR, 0.0, (-0.050 - 0.026 * math.cos(2 * ph - 0.25 * PI)) * k),
                       "yaw": 7 * cR, "pitch": 5, "roll": 4.0 * sR}
        out["spine"] = {"yaw": -4 * cR, "pitch": 2 + 1.0 * math.cos(2 * ph - 0.25 * PI), "roll": -3.2 * sR}
        out["chest"] = {"yaw": -8 * cR, "pitch": 2 + 1.5 * math.cos(2 * ph - 0.25 * PI), "roll": -2.6 * sR}
        out["neck"] = {"yaw": 3 * cR, "pitch": -2, "roll": 1.0 * sR}
        out["head"] = {"yaw": 4 * cR, "pitch": -2 + 2.0 * math.cos(2 * ph - 0.4 * PI), "roll": 1.0 * sR}
        s = cR                                             # +1: 오른발이 앞 → 왼팔이 앞
        out["shoulder.L"] = {"raise": 1 + 1.5 * math.cos(2 * ph), "fwd": 5 * s}
        out["shoulder.R"] = {"raise": 1 + 1.5 * math.cos(2 * ph), "fwd": -5 * s}
        out["arm.L"] = hang("L", 20 * s, 24 + 22 * s, AO, 0.02)
        out["hand.L"] = {"twist": 0}
        out["arm.R"] = hang("R", -14 * s + 2, 22 - 14 * s, AO, 0.06)
        out["hand.R"] = {"blade": D(-6, 2 - 9 * s)}
        return M(out)
    clips["walk"] = dict(fn=walk, duration=WALK_T, loop=True)

    # ---- 작업(1.6초 반복): 모루(앞 0.45m, 높이 0.75m)를 내려친다. 왼손은 모루 위 물건을 문 집게 자루를 잡고 있다.
    #      리듬: 들어 올림 0.9s(몸 앞 시상면, 팔꿈치가 앞·위로) → 정점 0.06s → 내려침 0.14s → clang(0.60) → 튐 0.1s → 여운
    AX, AY, AZ = -0.11 * k, -0.45 * k, 0.75 * k        # 망치가 닿을 지점
    HEAD = 0.215 * k; FACE = 0.084 * k                  # 손잡이 중심→머리 거리, 자루 축→타격면 거리
    def grip_at(blade, face_gap=0.0):
        """타격면이 모루 위 face_gap 높이에 오도록 손잡이 중심 위치를 구한다(blade = 자루 방향)."""
        b = np.array(blade)
        head = np.array([AX, AY, AZ + FACE + face_gap])
        return tuple(head - HEAD * b)
    WL = (0.215 * k, -0.33 * k, 0.875 * k)             # 왼손목: 타격점에서 왼쪽·몸 쪽으로 떨어진 집게 자루
    def stance(p):
        return {"foot.L": F("L", 0.20, -0.11, yaw=6), "foot.R": F("R", -0.215, 0.11, yaw=-28, pitch=p)}
    def W(over, p=0):
        return M(deep_merge(stance(p), over))
    PR_LOW = (-0.25, 0.80, 0.10)                        # 팔꿈치가 손목 뒤쪽(몸 쪽)에 온다 → 타격면이 아래를 본다
    hit_b = D(4, -3)
    w_hit = W({"hips": {"pos": (0.0, -0.065 * k, -0.065 * k), "yaw": -4, "pitch": 8}, "spine": {"yaw": 1, "pitch": 6}, "chest": {"yaw": 5, "pitch": 8},
               "neck": {"pitch": 4}, "head": {"yaw": -3, "pitch": 10}, "shoulder.R": {"raise": -2, "fwd": 12},
               "hand.R": {"blade": hit_b}, "_g": grip_at(hit_b, 0.0), "_pr": PR_LOW, "_wl": WL}, p=12)
    reb_b = D(3, 20)
    w_reb = deep_merge(w_hit, {"hips": {"pos": (0.0, -0.06 * k, -0.055 * k), "pitch": 7}, "chest": {"yaw": 4, "pitch": 6}, "head": {"pitch": 11},
                               "shoulder.R": {"raise": 2, "fwd": 9},
                               "hand.R": {"blade": reb_b}, "_g": grip_at(reb_b, 0.085)})
    set_b = D(3, 8)
    w_set = deep_merge(w_hit, {"hips": {"pos": (0.0, -0.055 * k, -0.05 * k), "yaw": -5, "pitch": 7}, "spine": {"pitch": 5}, "chest": {"yaw": 3, "pitch": 6},
                               "head": {"yaw": 0, "pitch": 13}, "shoulder.R": {"raise": 0, "fwd": 8},
                               "hand.R": {"blade": set_b}, "_g": grip_at(set_b, 0.03), "foot.R": F("R", -0.215, 0.11, yaw=-28, pitch=6)})
    # 들어 올림 ①: 망치가 모루에서 떠서 배 앞으로(몸이 펴지기 시작)
    w_l1 = W({"hips": {"pos": (0.0, -0.045 * k, -0.04 * k), "yaw": -7, "pitch": 6}, "spine": {"yaw": 0, "pitch": 4}, "chest": {"yaw": 1, "pitch": 4},
              "neck": {"pitch": 5}, "head": {"yaw": 1, "pitch": 12}, "shoulder.R": {"raise": 3, "fwd": 6},
              "hand.R": {"blade": D(2, 32)}, "_g": (-0.15 * k, -0.33 * k, 1.03 * k), "_pr": PR_LOW, "_wl": WL}, p=3)
    # 들어 올림 ②(t=0): 가슴 앞, 팔꿈치가 앞으로 나오며 망치가 선다
    w_l2 = W({"hips": {"pos": (0.0, -0.03 * k, -0.03 * k), "yaw": -8, "pitch": 4}, "spine": {"yaw": -1, "pitch": 2}, "chest": {"yaw": -1, "pitch": 2},
              "neck": {"pitch": 5}, "head": {"yaw": 2, "pitch": 11}, "shoulder.R": {"raise": 7, "fwd": 6},
              "hand.R": {"blade": D(0, 62)}, "_g": (-0.21 * k, -0.33 * k, 1.30 * k), "_pr": (-0.50, 0.10, -0.85), "_wl": WL}, p=0)
    # 정점: 주먹이 어깨 위·귀 옆, 팔꿈치는 앞·위, 망치 머리는 어깨 뒤로 넘어간다(옆으로 벌리지 않는다)
    w_cock = W({"hips": {"pos": (0.0, -0.015 * k, -0.02 * k), "yaw": -9, "pitch": 1}, "spine": {"yaw": -2, "pitch": 0}, "chest": {"yaw": -4, "pitch": -3},
                "neck": {"pitch": 6}, "head": {"yaw": 5, "pitch": 12}, "shoulder.R": {"raise": 12, "fwd": 2},
                "hand.R": {"blade": D(178, 30)}, "_g": (-0.285 * k, -0.07 * k, 1.66 * k), "_pr": (-0.30, -1.0, 0.15), "_wl": WL}, p=0)
    # 내려치는 중간: 팔꿈치가 먼저 내려오고 망치 머리가 위를 지나 앞으로 넘어온다
    w_mid = W({"hips": {"pos": (0.0, -0.04 * k, -0.035 * k), "yaw": -7, "pitch": 4}, "spine": {"yaw": -1, "pitch": 3}, "chest": {"yaw": 0, "pitch": 3},
               "neck": {"pitch": 5}, "head": {"yaw": 1, "pitch": 11}, "shoulder.R": {"raise": 8, "fwd": 8},
               "hand.R": {"blade": D(0, 68)}, "_g": (-0.20 * k, -0.33 * k, 1.36 * k), "_pr": (-0.45, -0.25, -0.85), "_wl": WL}, p=6)
    wk = Keyed([
        (0.00, w_l2),
        (0.40, w_cock, "out"),
        (0.46, w_cock, "lin"),
        (0.535, w_mid, "in"),
        (0.60, w_hit, "lin"),
        (0.70, w_reb, "out"),
        (0.82, w_set, "io"),
        (0.88, w_set, "lin"),
        (1.18, w_l1, "in"),
        (1.60, w_l2, "lin"),
    ])
    def work(t):
        P = wk(t)
        g = P.pop("_g"); pr = P.pop("_pr"); wl = np.array(P.pop("_wl"))
        # 치고 난 뒤 왼손이 집게를 살짝 돌려 물건을 고쳐 놓는다(평소에는 손등이 위)
        u = smooth01((t - 0.84) / 0.16) * (1 - smooth01((t - 1.12) / 0.22)) if 0.84 < t < 1.4 else 0.0
        P["hand.L"] = {"face": tuple(unit(np.array([0.75 * u, -0.10, 1.0 - 0.45 * u])))}
        wl = wl + np.array([0.015, 0.0, 0.020]) * k * u
        # 타격 순간 왼손에도 충격이 전해진다
        j = math.exp(-((t - 0.62) / 0.035) ** 2) if 0.55 < t < 0.8 else 0.0
        wl = wl + np.array([0.0, 0.0, -0.010]) * k * j
        reach(P, "L", wl, (0.75, 0.45, -0.35))
        reach(P, "R", g, pr, grip=True)
        # 타격 전후에는 타격면(너클 쪽)이 정확히 아래를 보도록 손목을 돌린다. 그 밖에는 팔뚝을 따라간다.
        wd = smooth01((t - 0.46) / 0.12) * (1 - smooth01((t - 0.95) / 0.30))
        if wd > 0.0:
            fo = np.array(P["arm.R"]["fore"])
            P["hand.R"]["edge"] = tuple(unit((1 - wd) * fo + wd * np.array([0.0, 0.0, -1.0])))
            reach(P, "R", g, pr, grip=True)
        return P
    clips["work"] = dict(fn=work, duration=1.60, loop=True, events={"clang": 0.60})
    _debug_work(work)
    _anvil_proxy(AX, AY, AZ)

    # ---- 대화(2.0초): 손짓은 왼손으로만 하고, 망치 든 손은 허리 아래에서 작게 까딱인다. 말끝마다 고개를 끄덕인다
    talk = Keyed([
        (0.00, BASE),
        (0.30, M({"hips": {"pos": (0.008 * k, 0.0, -0.016 * k), "yaw": -3}, "chest": {"yaw": 5, "pitch": 4}, "neck": {"pitch": 3}, "head": {"yaw": -1, "pitch": 9, "roll": -3},
                  "shoulder.L": {"raise": 6, "fwd": 4},
                  "arm.L": {"upper": D(30, -60), "fore": D(-12, 24)}, "hand.L": {"twist": 35},
                  "arm.R": hang("R", 3, 18, AO, 0.07), "hand.R": {"blade": D(-6, 6)}}), "io"),
        (0.62, M({"hips": {"pos": (0.016 * k, 0.0, -0.008 * k), "yaw": 0, "roll": 1.5}, "chest": {"yaw": 9, "pitch": -1}, "head": {"yaw": -7, "pitch": -4, "roll": 3},
                  "shoulder.L": {"raise": 9, "fwd": 0},
                  "arm.L": {"upper": D(60, -46), "fore": D(56, 12)}, "hand.L": {"twist": 75},
                  "arm.R": hang("R", 5, 24, AO, 0.07), "hand.R": {"blade": D(-6, 16)}}), "io"),
        (0.92, M({"hips": {"pos": (0.008 * k, 0.0, -0.018 * k), "yaw": -3}, "chest": {"yaw": 4, "pitch": 4}, "neck": {"pitch": 3}, "head": {"yaw": 0, "pitch": 10, "roll": 0},
                  "shoulder.L": {"raise": 5, "fwd": 4},
                  "arm.L": {"upper": D(36, -58), "fore": D(4, 6)}, "hand.L": {"twist": 45},
                  "arm.R": hang("R", 3, 16, AO, 0.07), "hand.R": {"blade": D(-6, 4)}}), "io"),
        (1.22, M({"hips": {"pos": (0.012 * k, 0.0, -0.008 * k), "yaw": -1, "roll": 1.0}, "chest": {"yaw": 7, "pitch": 0}, "head": {"yaw": -5, "pitch": -3, "roll": 2},
                  "shoulder.L": {"raise": 9, "fwd": 3},
                  "arm.L": {"upper": D(44, -48), "fore": D(22, 40)}, "hand.L": {"twist": 65},
                  "arm.R": hang("R", 6, 26, AO, 0.07), "hand.R": {"blade": D(-6, 18)}}), "io"),
        (1.50, M({"hips": {"pos": (0.004 * k, 0.0, -0.02 * k), "yaw": -5}, "chest": {"yaw": 3, "pitch": 4}, "neck": {"pitch": 3}, "head": {"yaw": 2, "pitch": 10, "roll": 0},
                  "shoulder.L": {"raise": 3, "fwd": 3},
                  "arm.L": hang("L", 8, 44, AO, 0.0), "hand.L": {"twist": 20},
                  "arm.R": hang("R", 3, 16, AO, 0.07), "hand.R": {"blade": D(-6, 4)}}), "io"),
        (2.00, BASE, "io"),
    ])
    clips["talk"] = dict(fn=talk, duration=2.00, loop=False)

    # ---- 환호(1.2초): 강화 성공! 움츠렸다가 망치를 번쩍 치켜들고 왼 주먹을 불끈 쥔 채 두 번 힘차게 흔든다
    def up_pose(p):
        """p: -1(팔꿈치를 당겨 내림) ~ +1(끝까지 뻗음). 유지 구간에서 이 값으로 펌핑한다."""
        return M({"hips": {"pos": (0.0, 0.0, (-0.008 + 0.022 * p) * k), "yaw": -4, "pitch": -3}, "spine": {"pitch": -3 - 1.0 * p},
                  "chest": {"yaw": 4, "pitch": -7 - 3.0 * p, "roll": -3},
                  "neck": {"pitch": -5}, "head": {"yaw": -4, "pitch": -11 - 2.0 * p},
                  "shoulder.R": {"raise": 12 + 3 * p, "fwd": 3}, "shoulder.L": {"raise": 9 + 3 * p, "fwd": 6},
                  "arm.R": {"upper": D(-46, 28 + 8 * p), "fore": D(-30 + 8 * p, 70 + 12 * p)}, "hand.R": {"blade": D(60, 42 - 14 * p)},
                  "arm.L": {"upper": D(46, -36 + 7 * p), "fore": D(8, 62 + 10 * p)}, "hand.L": {"twist": 60},
                  "foot.L": F("L", 0.185, -0.03, yaw=12, pitch=7 + 5 * p), "foot.R": F("R", -0.19, 0.035, yaw=-16, pitch=7 + 5 * p)})
    UP = up_pose(1.0)
    cheer_k = Keyed([
        (0.00, BASE),
        (0.16, M({"hips": {"pos": (0.0, -0.01 * k, -0.12 * k), "pitch": 9}, "spine": {"pitch": 5}, "chest": {"pitch": 8}, "head": {"pitch": 8},
                  "shoulder.L": {"raise": 6, "fwd": 8}, "shoulder.R": {"raise": 6, "fwd": 8},
                  "arm.R": {"upper": D(-34, -60), "fore": D(0, 0)}, "hand.R": {"blade": D(8, 54)},
                  "arm.L": {"upper": D(38, -62), "fore": D(-6, 8)}, "hand.L": {"twist": 30}}), "out"),
        (0.36, UP, "back"),
        (0.88, UP, "lin"),
        # 내려올 때는 팔꿈치를 먼저 접어 몸 앞으로 가져온다(옆으로 벌리지 않는다)
        (1.02, M({"hips": {"pos": (0.0, 0.0, -0.045 * k), "pitch": 4}, "chest": {"pitch": 3}, "head": {"pitch": 3}, "shoulder.R": {"raise": 6, "fwd": 8},
                  "arm.R": {"upper": D(-24, -56), "fore": D(8, 34)}, "hand.R": {"blade": D(4, 78)},
                  "arm.L": {"upper": D(40, -60), "fore": D(2, 16)}, "hand.L": {"twist": 25}}), "io"),
        (1.20, BASE, "io"),
    ])
    def cheer(t):
        if 0.36 <= t <= 0.88:      # 치켜든 채 두 번 펌핑(팔꿈치를 당겼다가 다시 쭉 뻗고, 몸도 같이 들썩인다)
            u = (t - 0.36) / 0.52
            p = math.cos(2 * PI * 2 * u)
            return up_pose(1.0 - (1.0 - p) * (1.0 - 0.25 * u))
        return cheer_k(t)
    clips["cheer"] = dict(fn=cheer, duration=1.20, loop=False, events={"cheer": 0.36})

    # ---- 낙담(1.4초): 강화 실패… 어깨가 처지고 고개를 떨군 채 가로젓는다
    slump = M({"hips": {"pos": (0.0, 0.015 * k, -0.07 * k), "yaw": -5, "pitch": 5}, "spine": {"pitch": 8}, "chest": {"yaw": 1, "pitch": 12},
               "neck": {"pitch": 14}, "head": {"yaw": 0, "pitch": 22},
               "shoulder.L": {"raise": -7, "fwd": 12}, "shoulder.R": {"raise": -7, "fwd": 12},
               "arm.R": hang("R", 10, 16, 0.12, 0.06), "hand.R": {"blade": D(-4, -30)},
               "arm.L": hang("L", 10, 14, 0.12, 0.04), "hand.L": {"twist": 0}})
    sad = Keyed([
        (0.00, BASE),
        (0.10, M({"hips": {"pos": (0.0, 0.0, -0.01 * k)}, "chest": {"pitch": -2}, "head": {"pitch": -4},
                  "shoulder.L": {"raise": 6}, "shoulder.R": {"raise": 6}}), "out"),
        (0.45, slump, "io"),
        (0.68, deep_merge(slump, {"head": {"yaw": 13, "pitch": 24, "roll": 2}, "neck": {"yaw": 5}, "chest": {"yaw": 3},
                                   "hips": {"pos": (0.0, 0.015 * k, -0.075 * k)}}), "io"),
        (0.92, deep_merge(slump, {"head": {"yaw": -12, "pitch": 24, "roll": -2}, "neck": {"yaw": -4}, "chest": {"yaw": -1},
                                   "hips": {"pos": (0.0, 0.015 * k, -0.08 * k)}}), "io"),
        (1.10, deep_merge(slump, {"head": {"yaw": 2, "pitch": 20}, "chest": {"pitch": 10}}), "io"),
        (1.40, BASE, "io"),
    ])
    clips["sad"] = dict(fn=sad, duration=1.40, loop=False)
    return clips
