# 리깅 파이프라인 안내 (직접 만든 뼈대·가중치·동작)

리깅 안 된 A포즈 인간형 GLB → 뼈대 → 가중치 → 장비 → 동작 → 숫자 검사 → 게임용 GLB.
자동 리깅 서비스, 블렌더 자동 가중치, 인터넷 동작 파일은 **쓰지 않는다**. 전부 `blender/scripts/` 의 코드로 계산한다.
블렌더는 창 없이(`-b --factory-startup`) 실행된다. 좌표계: **X = 캐릭터의 왼쪽, -Y = 앞, Z = 위**, 단위 m.

## 1. 실행

```bash
blender/rig_char.sh <태그> <단계>     # 단계: import | skeleton | weights | gear | anims | export | all
blender/rig_char.sh orc anims --sheets            # 동작을 굽고 프레임 시트용 그림도 렌더
blender/rig_char.sh orc anims --sheets --only=attack1,run   # 일부 동작만 다시 굽기
```

- 설정: `blender/chars/<태그>.json` / 작업 파일: `blender/work/<태그>.blend` (주인공만 `blender/current.blend`)
- 화면에는 `[RIG]` 로 시작하는 요약 줄만 나온다. 전체 로그: `logs/stage_<태그>_<단계>.out`
- 진단 그림: `blender/diag/<태그>_*.png` (Read 로 직접 보고 판단할 것)
  - `<태그>_s01_{front,left,back,q34}.png` 원본 모델
  - `<태그>_s02_{front,left,back}.png` 뼈대를 겹친 그림 (노랑=몸통, 빨강=왼쪽, 초록=오른쪽, 파랑=소켓)
  - `<태그>_s03_<포즈>_{f,s}.png` 극단 시험 포즈, `<태그>_s04_*.png` 장비 확인
  - `<태그>_anim_<동작>_{q,s}_<0..7>.png` 동작 프레임(q=사선 앞, s=옆). 한 장으로 합치기:
    `tools/anim_sheet.sh <태그> _work/<태그>_sheet1.jpg idle_q run_s attack1_q` (동작_시점 을 원하는 만큼)
- 단계는 앞 단계 결과에 의존한다. `skeleton` 을 다시 돌리면 그 뒤(weights→gear→anims→export)도 다시 돌려야 한다.

## 2. 설정 파일 (`blender/chars/<태그>.json`)

```json
{
  "source": "assets/raw/orc_warrior.glb",      // 리깅 안 된 원본
  "target_height": 2.15,                        // 정규화할 키(m)
  "landmarks": {                                // 관절 자동 탐지 보정(전부 선택 사항, 값은 키 H 대비 비율)
    "elbow_t": 0.60,          // 팔꿈치 위치: 어깨(0)~손목(1) 사이 비율. 기본 0.56
    "hip_z": 0.53,            // 고관절 높이를 직접 지정
    "neck_z": 0.87,           // 목(가장 잘록한 곳) 높이를 직접 지정 → 목 밑동 = neck_z-0.035, 머리 관절 = neck_z+0.012
    "ankle_z": 0.05, "knee_frac": 0.50, "shoulder_out": 0.18, "shoulder_below_neck": 0.045,
    "grip_flip": true,        // 무기가 엄지 쪽이 아니라 새끼손가락 쪽으로 나오면 손잡이 축을 뒤집는다(gear 단계 그림으로 확인)
    "offsets": {"elbow.L": [0.0, 0.01, 0.0]},        // 관절을 키 비율만큼 이동 (L/R 은 각각 지정)
    "joints": {"shoulder_joint.L": [0.19, 0.04, 1.43]} // 관절 절대 좌표(m) 직접 지정
  },
  "weights": {"heat_c": 1.0, "rigid": {"hand.L": 0.7, "hand.R": 0.7, "head": 0.9}},
  "gear": {"module": "gear_orc"},               // 장비 모듈(아래 4절). 장비가 없으면 {}
  "anim": {"module": "anims_orc", "set": "orc_set", "big_clips": ["skill1"]},   // big_clips: 시트를 넓게 찍을 동작
  "export": {"tex": 1024, "lod": 0.35}          // 텍스처 크기, LOD 메시 비율(1.0 이면 LOD 안 만듦)
}
```
관절 이름: `pelvis spine chest neck_base head_joint head_top crotch` 과 좌우 쌍
`clavicle shoulder_joint elbow wrist hand_tip grip grip_axis hip_joint knee ankle ball toe_tip heel` (예: `elbow.L`).
`skeleton` 단계 로그에 탐지된 좌표가 전부 찍힌다. 겹친 그림에서 관절이 어긋나 보일 때만 보정한다.

뼈 27개: `root, hips, spine, chest, neck, head`, 좌우 `shoulder, upper_arm, forearm, forearm_roll, hand, thigh, shin, foot, toe`,
소켓(변형 없음) `weapon.R, weapon.L, shield.L`.

## 3. 동작 만들기 (`blender/scripts/anims_<태그>.py`)

예시: `blender/scripts/anims.py` 의 `knight_set(rm)` (주인공). 같은 형식의 함수를 새 파일에 만든다.

```python
import math
from rigpose import D
from anims import Keyed, deep_merge, smooth01, PI

def orc_set(rm):                      # rm: rigpose.RigMath (rm.H = 키, rm.rest_ankle["L"/"R"] = 기본 발목 좌표)
    k = rm.H / 1.8; ra = rm.rest_ankle
    def F(s, x, y, lift=0.0, **kw):   # 발목 목표(루트 기준 m). x: 왼쪽+, y: 뒤+ (앞은 음수), lift: 들어 올린 높이
        d = dict(pos=(x * k, y * k, ra[s][2] + lift * k)); d.update(kw); return d
    BASE = {...}                      # 기본 자세(모든 키를 다 넣는다)
    M = lambda over: deep_merge(BASE, over)
    clips = {}
    clips["idle"] = dict(fn=lambda t: M({...}), duration=2.4, loop=True)
    clips["attack1"] = dict(fn=Keyed([(0.0, BASE), (0.15, M({...}), "out"), (0.28, M({...}), "in"), (0.6, BASE)]),
                            duration=0.6, loop=False, events={"hit": 0.28})
    return clips
```

포즈 사전 P 의 키 (각도는 도 단위, 생략하면 0/기본 자세):

| 키 | 값 | 뜻 |
|---|---|---|
| `root_yaw` | float | 몸 전체를 수직축으로 회전(회전 베기 등). 끝에서 360 이면 원위치 |
| `hips` | `{pos:(dx,dy,dz), yaw, pitch, roll}` | 골반 이동(m)·회전. yaw+ = 왼쪽으로 돎, pitch+ = 앞으로 숙임, roll+ = 왼쪽으로 기울임 |
| `spine` `chest` `neck` `head` | `{yaw, pitch, roll}` | 부모 대비 추가 회전 |
| `shoulder.L/R` | `{raise, fwd}` | 어깨를 으쓱/앞으로 |
| `arm.L/R` | `{upper: D(az,el), fore: D(az,el)}` | 위팔·아래팔이 가리키는 방향. **기준은 몸통이 향한 수평 방향**(hips+spine+chest 의 yaw 합). 숙임/젖힘은 반영 안 됨 |
| `hand.R` (무기 손) | `{blade: D(az,el)}` | 무기 축(+Y)이 가리킬 방향. 손목·팔뚝 비틀림은 자동 계산. 아래팔과 무기의 각도는 55°~120° 범위가 자연스럽다 |
| `hand.L/R` (맨손) | `{twist: 도}` 또는 `{face: D(az,el)}` | 팔뚝 축 비틀림 직접 지정 / 손등(방패 앞면)이 볼 방향 |
| `foot.L/R` | `{pos:(x,y,z), yaw, pitch, roll}` | 발목 목표 위치(IK). pitch+ = 발끝 내림(뒤꿈치 듦). 발가락은 자동으로 땅에 붙는다 |
| `knee.L/R` | `{out: 도, up: 0~1}` | 무릎을 바깥으로 / 누운 자세에서 무릎이 하늘을 향하게 |
| `settle` | 0~1 | 누운 몸통을 땅에 내려놓는 정도(쓰러짐 마지막 자세 = 1) |

`D(az, el)`: az 0 = 앞, +90 = 왼쪽, -90 = 오른쪽, 180 = 뒤 / el +90 = 위, -90 = 아래.
`Keyed([(시간, 포즈, 가감속), ...])`: 가감속 = `"io"`(기본) `"in"` `"out"` `"lin"` `"in3"` `"out3"` `"back"`.

규칙
- 모든 동작은 **제자리**(게임이 위치를 옮긴다). 반복 동작(`loop=True`)은 t=0 과 t=duration 의 자세가 같아야 한다(주기 함수 사용).
- 키 포즈는 반드시 `M({...})` 로 BASE 위에 얹어 **모든 키가 다 있게** 한다(한쪽에만 있는 키는 보간되지 않고 튄다).
- 방향 벡터끼리는 구면 보간된다. 한 구간에서 150° 넘게 돌리려면 중간 키를 넣는다.
- 굽는 동안 발·몸이 땅(z=0) 아래로 내려가면 자동으로 올려 준다(뚫림 방지). 발이 뜨는 건 직접 조절한다.
- 타격 순간 등은 `events={"hit": 초}` 로 적는다(게임이 그 시각에 피해를 준다).
- 30fps 로 구워진다. 공격은 0.4~0.8초, 준비(느리게) → 타격(빠르게) → 여운(감속) 리듬으로 타격감을 만든다.

## 4. 장비 만들기 (`blender/scripts/gear_<태그>.py`)

```python
import bpy, bmesh, math
from mathutils import Vector, Matrix
import gear                                   # gear._mat(이름, 색, metallic, roughness, emission, 세기), gear._ring_loft(bm, 단면고리들, 재질함수)

def build(arm, body, k, gcfg):                # k = 키/1.8 (크기 배율)
    ob = make_axe(k)                          # bmesh 로 직접 모델링 (외부 모델 파일 금지)
    ob.name = "Weapon"
    gear.parent_to_bone(ob, arm, "weapon.R")  # 오브젝트 원점 = 뼈 머리(손잡이를 쥔 주먹 중심), 축 = 뼈 축
```
- 오른손 무기: 이름 `Weapon`, 뼈 `weapon.R`. 로컬 **+Y = 엄지 쪽으로 뻗는 방향(칼끝·자루 위쪽)**, Z = 날 방향(주먹 너클이 향하는 쪽), X = 두께. **원점 = 손잡이 중심**(주먹이 쥐는 곳).
  손잡이 축 방향을 통째로 바꾸려면 설정 `landmarks.joints` 에 `"grip_axis.R": [x,y,z]`(단위 벡터)를 직접 줄 수도 있다(skeleton 부터 다시 실행).
- 왼손에 드는 것(활 등): 이름 `WeaponL`, 뼈 `weapon.L` (같은 규칙). 방패: 이름 `Shield`, 뼈 `shield.L` (+Y = 앞면 법선, +Z = 위).
- `gear.py` 의 `make_sword`, `make_shield` 가 예시다. 재질은 Principled BSDF 만 쓴다(glTF 로 내보내진다).

## 5. 합격 기준 (export 단계 출력의 `TOTAL` 줄 + `blender/validation_<태그>.json`)

1. 모든 동작·모든 프레임에서 **모서리 늘어남 최대 < 3배**
2. **발 최저 높이 >= 0** (땅을 뚫지 않음)
3. 무기가 있으면 **손잡이 중심 ↔ 손바닥(주먹 속 정점 중심) < 10 mm**
4. 눈검사(프레임 시트): 팔다리가 갑자기 튀거나 꼬이지 않음, 무기가 몸을 관통하지 않음(주요 자세), 쿼터뷰에서 동작이 읽힘, T자 인형처럼 뻣뻣하지 않음
5. 결과물: `assets/models/<태그>.glb`(동작 포함), `assets/models/<태그>_lod.glb`(lod<1 일 때), `assets/models/<태그>_meta.json`

## 6. 하면 안 되는 것

- 공용 파일 수정 금지: `common.py rigcore.py rigpose.py gear.py anims.py s0*.py rig_char.sh run_stage.sh`, `chars/hero.json`, `blender/current.blend`.
  공용 코드의 버그를 발견하면 고치지 말고 결과 보고에 적는다. 내 캐릭터의 동작은 설정·전용 모듈로만 바꾼다.
- 다른 캐릭터의 파일(`chars/<다른 태그>.json`, `anims_<다른 태그>.py`, `work/<다른 태그>.blend`)을 건드리지 않는다.

## 7. 참고

- 각 `rig_char.sh` 실행은 별도 블렌더 프로세스다. 공용 모듈의 동작을 내 캐릭터에서만 바꿔야 하면, 파일을 고치지 말고
  내 모듈(`anims_<태그>.py`, `gear_<태그>.py`) 안에서 런타임에 함수를 감싸서 쓴다(그 프로세스에만 적용된다).
- 블렌더 한 번 실행은 5~20초, 시트 렌더는 동작·시점당 1~2초다. 한 번에 블렌더 하나만 실행한다.
- 게임 카메라는 쿼터뷰(위에서 약 50도로 내려다봄, 캐릭터는 화면에서 작다). 동작은 크게, 실루엣이 분명하게 만든다.
