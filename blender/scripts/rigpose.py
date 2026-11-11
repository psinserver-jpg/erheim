"""직접 만든 포즈 계산기(FK + 다리 2관절 IK + 검 방향 맞춤).

포즈는 '캐릭터 기준 축'으로 적는다: X = 왼쪽, -Y = 앞, Z = 위.
각 뼈의 누적 회전 C_b (기본 자세 대비, 3x3)를 위에서 아래로 계산한 뒤,
블렌더 포즈 뼈의 로컬 회전  Q_b = R_b^T · C_parent^T · C_b · R_b  로 바꿔 넣는다.
"""
import math
import numpy as np
import bpy
from mathutils import Matrix, Quaternion, Vector

RAD = math.pi / 180.0


def unit(v):
    v = np.asarray(v, dtype=float)
    n = np.linalg.norm(v)
    return v / n if n > 1e-12 else v


def rot_axis(axis, ang):
    a = unit(axis)
    c, s = math.cos(ang), math.sin(ang)
    K = np.array([[0, -a[2], a[1]], [a[2], 0, -a[0]], [-a[1], a[0], 0]])
    return np.eye(3) * c + s * K + (1 - c) * np.outer(a, a)


def rx(d): return rot_axis((1, 0, 0), d * RAD)      # +: 앞으로 숙임 / 발끝 내림
def ry(d): return rot_axis((0, 1, 0), d * RAD)      # +: 왼쪽으로 기울임
def rz(d): return rot_axis((0, 0, 1), d * RAD)      # +: 왼쪽으로 돌아봄


def shortest_arc(a, b):
    a = unit(a); b = unit(b)
    c = float(a @ b)
    if c > 1 - 1e-10:
        return np.eye(3)
    if c < -1 + 1e-10:
        p = unit(np.cross(a, (1, 0, 0)) if abs(a[0]) < 0.9 else np.cross(a, (0, 1, 0)))
        return rot_axis(p, math.pi)
    ax = np.cross(a, b)
    return rot_axis(ax, math.atan2(np.linalg.norm(ax), c))


def frame(primary, secondary):
    """primary 를 첫 축으로, secondary 를 최대한 살린 둘째 축으로 하는 정규직교 틀(열 벡터 3개)."""
    a = unit(primary)
    b = np.asarray(secondary, dtype=float) - a * float(np.dot(secondary, a))
    if np.linalg.norm(b) < 1e-6:
        b = np.cross(a, (1, 0, 0)) if abs(a[0]) < 0.9 else np.cross(a, (0, 1, 0))
    b = unit(b)
    return np.stack([a, b, np.cross(a, b)], axis=1)


def twist_angle(Rm, axis):
    """회전 Rm 을 axis 둘레의 비틀림 각(rad)으로 분해(swing-twist)."""
    q = Matrix(Rm.tolist()).to_quaternion()
    a = unit(axis)
    proj = a * float(np.dot((q.x, q.y, q.z), a))
    n = math.sqrt(q.w * q.w + float(proj @ proj))
    if n < 1e-9:
        return 0.0
    w = q.w / n
    s = float(np.dot(proj, a)) / n
    ang = 2.0 * math.atan2(s, w)
    if ang > math.pi:
        ang -= 2 * math.pi
    if ang < -math.pi:
        ang += 2 * math.pi
    return ang


def signed_angle(a, b, axis):
    a = unit(a); b = unit(b)
    return math.atan2(float(np.dot(np.cross(a, b), unit(axis))), float(a @ b))


class RigMath:
    def __init__(self, arm_obj):
        self.arm = arm_obj
        self.B = {}
        self.order = []
        for b in arm_obj.data.bones:
            R = np.array(b.matrix_local.to_3x3())
            self.B[b.name] = dict(parent=b.parent.name if b.parent else None, R=R,
                                  head=np.array(b.head_local), tail=np.array(b.tail_local),
                                  y=unit(np.array(b.tail_local) - np.array(b.head_local)), len=b.length)
            self.order.append(b.name)
        B = self.B
        self.H = float(arm_obj.get("rig_height", 1.8))
        self.sides = ("L", "R")
        self.leg = {}
        for s in self.sides:
            l1 = np.linalg.norm(B["shin." + s]["head"] - B["thigh." + s]["head"])
            l2 = np.linalg.norm(B["foot." + s]["head"] - B["shin." + s]["head"])
            self.leg[s] = (l1, l2)
        self.rest_ankle = {s: B["foot." + s]["head"].copy() for s in self.sides}
        self.rest_ball = {s: B["toe." + s]["head"].copy() for s in self.sides}
        self.rest_hips = B["hips"]["head"].copy()
        self.fwd = np.array([0.0, -1.0, 0.0])
        # 검 방향(손 기준)과 손 방향
        self.grip_axis = {s: B["weapon." + s]["y"].copy() for s in self.sides}
        self.grip_pos = {s: B["weapon." + s]["head"].copy() for s in self.sides}

    # ---- 기본 자세에서의 팔 방향(가슴 기준) : 포즈를 적을 때 기준값으로 쓴다
    def rest_dir(self, bone):
        return self.B[bone]["y"].copy()

    def solve(self, P):
        B = self.B
        C, pos = {}, {}
        g = lambda d, k, default=0.0: (d or {}).get(k, default)
        C["root"] = rz(P.get("root_yaw", 0.0))
        pos["root"] = B["root"]["head"].copy()
        hp = P.get("hips", {})
        C["hips"] = C["root"] @ rz(g(hp, "yaw")) @ rx(g(hp, "pitch")) @ ry(g(hp, "roll"))
        delta = np.array(hp.get("pos", (0, 0, 0)), dtype=float)
        p0 = pos["root"] + C["root"] @ (B["hips"]["head"] - B["root"]["head"])

        # ---- 다리 목표(루트 공간) 먼저 계산해서, 닿지 않으면 골반을 내린다
        foot_C, ankle_t = {}, {}
        for s in self.sides:
            f = P.get("foot." + s, {})
            Cf = C["root"] @ rz(g(f, "yaw")) @ rx(g(f, "pitch")) @ ry(g(f, "roll"))
            foot_C[s] = Cf
            if "ball" in f:
                ball = pos["root"] + C["root"] @ (np.array(f["ball"], dtype=float) - B["root"]["head"])
                ank = ball - Cf @ (self.rest_ball[s] - self.rest_ankle[s])
            else:
                a_rest = self.rest_ankle[s]
                tgt = np.array(f["pos"], dtype=float) if "pos" in f else a_rest
                ank = pos["root"] + C["root"] @ (tgt - B["root"]["head"])
            ankle_t[s] = ank
        hips_pos = p0 + C["root"] @ delta
        if P.get("auto_hips", True):
            for _ in range(2):
                drop = 0.0
                for s in self.sides:
                    l1, l2 = self.leg[s]
                    ph = hips_pos + C["hips"] @ (B["thigh." + s]["head"] - B["hips"]["head"])
                    v = ankle_t[s] - ph
                    reach = 0.997 * (l1 + l2)
                    if np.linalg.norm(v) > reach:
                        # ph 를 dz 만큼 내려 |v + dz*z| = reach 가 되게
                        hx = math.hypot(v[0], v[1])
                        if hx < reach and v[2] < 0:
                            # 고관절을 dz 만큼 내리면 v_z 가 dz 만큼 커진다. |v'| = reach 가 되는 dz
                            dz = (-math.sqrt(reach * reach - hx * hx)) - v[2]
                            drop = max(drop, dz)
                if drop > 1e-6:
                    hips_pos = hips_pos - np.array([0, 0, drop])
        pos["hips"] = hips_pos
        self.last_hips_delta = C["root"].T @ (hips_pos - p0)

        def child_pos(name):
            p = B[name]["parent"]
            return pos[p] + C[p] @ (B[name]["head"] - B[p]["head"])

        for name in ("spine", "chest", "neck", "head"):
            d = P.get(name, {})
            p = B[name]["parent"]
            C[name] = C[p] @ rz(g(d, "yaw")) @ rx(g(d, "pitch")) @ ry(g(d, "roll"))
            pos[name] = child_pos(name)

        # ---- 팔: 방향 기준 틀은 '몸통이 향한 수평 방향'(골반+척추+가슴 yaw 합). 숙임/젖힘은 반영하지 않는다.
        yaw_sum = g(hp, "yaw") + g(P.get("spine"), "yaw") + g(P.get("chest"), "yaw")
        C_heading = C["root"] @ rz(yaw_sum)
        self.C_heading = C_heading
        for s in self.sides:
            sgn = 1.0 if s == "L" else -1.0
            sh, up, fo, ro, ha, we = ("shoulder." + s, "upper_arm." + s, "forearm." + s, "forearm_roll." + s, "hand." + s, "weapon." + s)
            d = P.get(sh, {})
            C[sh] = C["chest"] @ ry(-sgn * g(d, "raise")) @ rz(-sgn * g(d, "fwd"))
            pos[sh] = child_pos(sh)
            a = P.get("arm." + s, {})
            ref = np.eye(3) if a.get("world") else C_heading
            yu, yf = B[up]["y"], B[fo]["y"]
            Cu = C[sh]
            if "upper" in a:
                v = ref @ unit(a["upper"])
                Cu = shortest_arc(C[sh] @ yu, v) @ C[sh]
            if "upper_twist" in a:
                Cu = rot_axis(Cu @ yu, a["upper_twist"] * RAD) @ Cu
            Cf = Cu
            if "fore" in a:
                vf = ref @ unit(a["fore"])
                u = Cu @ yu
                # 팔꿈치가 자연스러운 쪽으로 접히도록 위팔을 조금 비튼다
                k = a.get("elbow_twist", 0.5)
                b_rest = yf - yu * float(yf @ yu)
                if np.linalg.norm(b_rest) < 0.05:
                    b_rest = self.fwd - yu * float(self.fwd @ yu)
                b_des = vf - u * float(vf @ u)
                if k > 0 and np.linalg.norm(b_des) > 0.15:
                    phi = signed_angle(Cu @ unit(b_rest), b_des, u)
                    phi = max(-100 * RAD, min(100 * RAD, phi)) * k * min(1.0, np.linalg.norm(b_des) / 0.5)
                    Cu = rot_axis(u, phi) @ Cu
                Cf = shortest_arc(Cu @ yf, vf) @ Cu
            C[up] = Cu; pos[up] = child_pos(up)
            C[fo] = Cf; pos[fo] = child_pos(fo)
            # 손: (a) 검 방향 맞춤  (b) 비틀림/꺾임 직접 지정  (c) 아무것도 없으면 팔뚝을 따라감
            h = P.get("hand." + s, {})
            n_roll = B[ro]["y"]                      # 비틀림 축(기본 자세 방향)
            if "blade" in h:
                href = np.eye(3) if (h.get("world") or a.get("world")) else C_heading
                bdir = href @ unit(h["blade"])
                fore_dir = Cf @ B[ha]["y"]
                sec = href @ unit(h["edge"]) if "edge" in h else fore_dir
                F0 = frame(self.grip_axis[s], B[ha]["y"])
                F1 = frame(bdir, sec)
                Ch = F1 @ F0.T
                rel = Cf.T @ Ch
                tw = twist_angle(rel, n_roll)
                Cr = Cf @ rot_axis(n_roll, tw * h.get("roll_share", 0.75))
            else:
                tw = h.get("twist", 0.0) * RAD
                if "face" in h:
                    # 손등(방패 앞면)이 주어진 방향을 보도록 팔뚝 축 둘레 비틀림을 자동 계산
                    href = np.eye(3) if (h.get("world") or a.get("world")) else C_heading
                    gax = self.grip_axis[s]
                    n_rest = unit(np.cross(gax, B[ha]["y"])) if s == "L" else unit(np.cross(B[ha]["y"], gax))
                    ax = Cf @ n_roll
                    n0 = Cf @ n_rest
                    tgt = href @ unit(h["face"])
                    n0p = n0 - ax * float(n0 @ ax); tp = tgt - ax * float(tgt @ ax)
                    if np.linalg.norm(n0p) > 1e-4 and np.linalg.norm(tp) > 1e-4:
                        tw = signed_angle(n0p, tp, ax)
                Cr = Cf @ rot_axis(n_roll, tw * h.get("roll_share", 0.75))
                Ch = Cf @ rot_axis(n_roll, tw)
                if "flex" in h or "dev" in h:
                    # 손목 꺾기: flex = 손바닥 쪽으로 굽힘, dev = 엄지 쪽으로 꺾음 (손 기준 축)
                    gax = self.grip_axis[s]
                    palm = unit(np.cross(B[ha]["y"], gax))
                    Ch = Ch @ rot_axis(gax, h.get("flex", 0.0) * RAD) @ rot_axis(palm, h.get("dev", 0.0) * RAD)
            C[ro] = Cr; pos[ro] = child_pos(ro)
            C[ha] = Ch; pos[ha] = child_pos(ha)
            C[we] = Ch; pos[we] = child_pos(we)

        # ---- 다리 IK
        self.unreached = 0.0
        for s in self.sides:
            th, shn, ft, toe = "thigh." + s, "shin." + s, "foot." + s, "toe." + s
            l1, l2 = self.leg[s]
            ph = pos["hips"] + C["hips"] @ (B[th]["head"] - B["hips"]["head"])
            pos[th] = ph
            f = P.get("foot." + s, {})
            v = ankle_t[s] - ph
            dist = np.linalg.norm(v)
            reach = 0.9995 * (l1 + l2)
            if dist > reach:
                self.unreached = max(self.unreached, dist - reach)
                dist = reach
            n = unit(v)
            sg = 1.0 if s == "L" else -1.0
            kn = P.get("knee." + s, {})
            pole = C["root"] @ rz(g(f, "yaw") + kn.get("out", 0.0) * sg) @ self.fwd
            upw = float(kn.get("up", 0.0))          # 누운 자세용: 무릎이 위(하늘)를 향하게
            if upw > 0:
                pole = unit((1 - upw) * pole + upw * (C["root"] @ unit((0.25 * sg, 0.0, 1.0))))
            m = pole - n * float(pole @ n)
            if np.linalg.norm(m) < 1e-4:
                m = C["hips"] @ self.fwd - n * float((C["hips"] @ self.fwd) @ n)
            m = unit(m)
            ca = (l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist)
            ca = max(-1.0, min(1.0, ca))
            sa = math.sqrt(max(0.0, 1 - ca * ca))
            knee = ph + l1 * (ca * n + sa * m)
            ank = ph + n * dist
            vt = unit(knee - ph); vs = unit(ank - knee)
            yt, ys = B[th]["y"], B[shn]["y"]
            C[th] = frame(vt, pole) @ frame(yt, self.fwd).T
            C[shn] = frame(vs, pole) @ frame(ys, self.fwd).T
            pos[shn] = knee
            pos[ft] = ank
            C[ft] = foot_C[s]
            tv = f.get("toe", "auto")
            if isinstance(tv, str):
                # 자동: 뒤꿈치를 든 발(pitch>0)의 앞꿈치가 땅 근처면 발가락을 땅에 평평하게 둔다
                pitch = g(f, "pitch")
                ball_h = (ank + C[ft] @ (self.rest_ball[s] - self.rest_ankle[s]))[2] - self.rest_ball[s][2]
                w = 1.0 - ball_h / (0.05 * self.H / 1.8)
                w = max(0.0, min(1.0, w)); w = w * w * (3 - 2 * w)
                C[toe] = C[ft] @ rx(-max(pitch, 0.0) * w)
            else:
                C[toe] = C[ft] @ rx(-float(tv))
            pos[toe] = ank + C[ft] @ (B[toe]["head"] - B[ft]["head"])
        # 소켓 등 따로 계산하지 않은 뼈는 부모를 그대로 따라간다
        for name in self.order:
            if name not in C:
                p = B[name]["parent"]
                C[name] = C[p]
                pos[name] = pos[p] + C[p] @ (B[name]["head"] - B[p]["head"])
        self.C, self.pos = C, pos
        return C, pos

    # ---- 계산 결과를 블렌더 포즈 뼈에 넣는다
    def apply(self, frame_no=None, prev_q=None):
        B, C = self.B, self.C
        pbs = self.arm.pose.bones
        out = {}
        for name in self.order:
            b = B[name]
            Cp = C[b["parent"]] if b["parent"] else np.eye(3)
            Q = b["R"].T @ Cp.T @ C[name] @ b["R"]
            q = Matrix(Q.tolist()).to_quaternion()
            if prev_q is not None and name in prev_q and q.dot(prev_q[name]) < 0:
                q = -q
            pb = pbs[name]
            pb.rotation_mode = 'QUATERNION'
            pb.rotation_quaternion = q
            out[name] = q.copy()
            if name == "hips":
                pb.location = Vector((b["R"].T @ self.last_hips_delta).tolist())
            if frame_no is not None:
                pb.keyframe_insert("rotation_quaternion", frame=frame_no)
                if name == "hips":
                    pb.keyframe_insert("location", frame=frame_no)
        return out

    def blade_dir(self, s="R"):
        return self.C["hand." + s] @ self.grip_axis[s]

    def grip_world(self, s="R"):
        return self.pos["hand." + s] + self.C["hand." + s] @ (self.grip_pos[s] - self.B["hand." + s]["head"])


def D(az, el=0.0):
    """방향 벡터. az: 0=앞, +90=왼쪽, -90=오른쪽, 180=뒤. el: +90=위."""
    a, e = az * RAD, el * RAD
    return (math.sin(a) * math.cos(e), -math.cos(a) * math.cos(e), math.sin(e))


def reset_pose(arm_obj):
    for pb in arm_obj.pose.bones:
        pb.rotation_mode = 'QUATERNION'
        pb.rotation_quaternion = (1, 0, 0, 0)
        pb.location = (0, 0, 0)
        pb.scale = (1, 1, 1)
