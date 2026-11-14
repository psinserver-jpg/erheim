# 에셋 생성 기록 (Higgsfield)

- 세션 시작: 2026-11-11 17:21 KST
- 시작 잔액: 127.12 크레딧 (plan: plus) — 사용 한도는 지시상 1,000크레딧이지만 실제 잔액이 127.12라 그 안에서만 사용
- `higgsfield` CLI는 이 컴퓨터에 설치돼 있지 않아(`command not found`) 연결된 Higgsfield 커넥터(MCP)로 생성함
- `input/hero_raw.glb`가 폴더에 없어서, 주인공 원본(리깅 안 된 3D 모델)도 Higgsfield로 직접 생성함. 자동 리깅/애니메이션 옵션은 전부 끔.

## 생성 전 비용 조회 (get_cost, 제출 없음)

| 모델 | 옵션 | 크레딧 |
|---|---|---|
| gpt_image_2_6 (이미지) | 1k low | 0.25 |
| gpt_image_2_6 (이미지) | 1k medium | 0.5 |
| gpt_image_2_6 (이미지) | 1k high | 1.5 |
| gpt_image_2_6 (이미지) | 2k high | 2.75 |
| tripo_h3_1_image_to_3d | standard | 9 |
| tripo_h3_1_image_to_3d | texture detailed | 12 |
| tripo_h3_1_image_to_3d | geometry+texture detailed | 18 |
| tripo_h3_1_multiview_to_3d | standard | 9 |
| tripo_3d (텍스트→3D) | standard / texture detailed | 5 / 7.5 |
| hunyuan3d_v3_image_to_3d | 기본 | 11 |
| hunyuan3d_v3_1_text_to_3d | std / pro | 7 / 12 |
| meshy_v6_text_to_3d | full | 25 |
| tripo_p2_image_to_3d | 기본 | 34 |
| meshy_v7_image_to_3d | textured | 38 |

## 생성 내역

| # | 시각 | 종류 | 모델/옵션 | 용도 | 크레딧 | job id | 결과 |
|---|---|---|---|---|---|---|---|
| 1 | 17:26 | 이미지 | gpt_image_2_6 1k high 2:3 | (폐기) 무협풍 주인공 컨셉 — 이후 "중국풍 금지·리니지풍" 지시로 미사용 | 1.5 | df858342-82fc-456a-8919-9ed545a19878 | assets/concept/hero_front.png |
| 2 | 17:28 | 3D | tripo_h3_1_image_to_3d (texture detailed, 60k faces, PBR) | (폐기) 무협풍 주인공 3D — 리깅 파이프라인 시험 입력으로만 보관, 게임 미사용 | 12 | ae1522d3-7dc8-432e-be6e-7a285fee6b5d | assets/raw/test_v0_wuxia.glb |
| 3–8 | 17:29 | 이미지×6 | gpt_image_2_6 1k medium 2:3 | (폐기) 무협풍 몬스터·보스·NPC 컨셉 6장 — 미사용 | 3.0 (0.5×6) | 327493bb…, 3827410d…, e4e383ca…, b9d3f580…, abf01073…, 8d64499c… | assets/concept/*.png |
| — | 17:35 | — | — | **사용자 지시 변경**: 캐릭터 이미지는 codex CLI로 생성, 힉스필드 이미지 생성 금지, 리니지풍(중세 판타지). 이후 힉스필드는 3D 변환에만 사용. 이미지는 전부 `tools/codex_image.sh`(codex CLI 내장 이미지 생성, 크레딧 0)로 생성 → `assets/concept_codex/` | 0 | — | — |
| 9 | 17:39 | 3D | tripo_h3_1_image_to_3d (texture detailed, 60k faces, PBR, auto_size) | **주인공 기사 원본(리깅 없음)** — 입력: codex 생성 hero_knight.png | 12 | bd1db3b7-e351-441e-9943-2bb30ef09860 | input/hero_raw.glb |
| 10 | 18:50 | 3D | tripo_h3_1_image_to_3d (standard, 30k faces, PBR) | 늑대인간(몬스터) | 9 | 080a1035-4793-4325-a9e7-ed34e0cb417b | assets/raw/werewolf.glb |
| 11 | 18:50 | 3D | 〃 | 해골 기사(몬스터) | 9 | 01911040-1ea2-4119-974f-3e99c09d2de1 | assets/raw/skeleton_knight.glb |
| 12 | 18:50 | 3D | 〃 | 대장장이(NPC) | 9 | 836a0d7c-bfd2-4f12-8180-3505001e4411 | assets/raw/blacksmith.glb |
| 13 | 18:50 | 3D | 〃 | 마법사(봇 유저 직업) | 9 | 50d4b80d-5ded-484f-9119-184e0b17ee68 | assets/raw/mage.glb |
| 14 | 18:50 | 3D | 〃 | 요정 궁수(봇 유저 직업) | 9 | 03f6556d-50d8-4aab-92c1-71350afb1c36 | assets/raw/elf_archer.glb |
| 15 | 19:05 | 3D | tripo_h3_1_image_to_3d (standard, 30k faces, PBR) | 오크 전사(몬스터) | 9 | e59f3f3c-d877-418c-9c6e-c78bd7ab41b0 | assets/raw/orc_warrior.glb |
| 16 | 19:05 | 3D | tripo_h3_1_image_to_3d (texture detailed, 50k faces, PBR) | 염옥의 군주(레이드 보스) | 12 | e60e9512-ea68-4a97-a301-787313554b1e | assets/raw/demon_lord.glb |
| 17 | 19:05 | 3D | sam_3_3d (textured) | 민가(건물) — SAM 3D 품질 시험 | 1 | d8c0920e-178b-4784-944b-35a46a2b0fe3 | assets/raw/env/house.glb |
| 18 | 19:05 | 3D | sam_3_3d (textured) | 참나무(소품) — SAM 3D 품질 시험 | 1 | 2472864c-0a9f-4343-9ec7-4c3dc18f6f79 | assets/raw/env/oak_tree.glb |
| 17,18 | 19:05 | — | sam_3_3d | (실패·자동 환불) 프롬프트 없이 요청한 민가·참나무 2건 → 즉시 실패, 1크레딧씩 환불 | 0 | d8c0920e…, 2472864c… | — |
| 19 | 19:07 | 3D | sam_3_3d (prompt "house") | 민가(건물) | 1 | e9923dc5-87f2-489f-890d-5ca1e57bfca5 | assets/raw/env/house_sam.glb |
| 20–28 | 19:12 | 3D×9 | sam_3_3d (prompt 지정) | 성문, 대장간, 선술집, 보스 제단, 참나무, 소나무, 바위, 시장 좌판, 분수 | 9 (1×9) | cfc6bd14…, 3b005f8d…, 9edf3b09…, 2de5ead3…, 0fa78a44…, 578544e5…, 039e2c01…, 4b2b7ecb…, 66d864df… | assets/raw/env/*.glb |
| 29 | 19:12 | 3D | tripo_h3_1_image_to_3d (standard, 30k faces, PBR) | 잡화 상인(NPC) | 9 | (아래 기록) | assets/raw/merchant.glb |
| 29 | 19:12 | 3D | tripo_h3_1_image_to_3d (standard) | 잡화 상인(NPC) | 9 | 83f03577-9a69-4f7c-9b06-ed76776ee186 | assets/raw/merchant.glb |
| — | 19:14 | — | sam_3_3d | (실패·환불) 대장간, 보스 제단 1차 | 0 | 3b005f8d…, 2de5ead3… | — |
| 30 | 19:22 | 3D | sam_3_3d (prompt "building") | 대장간(재시도 성공) | 1 | c9c36d36-771d-43d9-9dde-27abf0406e41 | assets/raw/env/forge.glb |
| — | 19:22 | — | sam_3_3d | (실패·환불) 보스 제단 2차 → 코드로 직접 제작 | 0 | 7639033c… | — |
| 31–35 | 19:24 | 3D×5 | sam_3_3d | 묘비, 고목, 상자·통, 가로등, 모닥불 | 5 (1×5) | 5d951608…, 5acb0d73…, 16eda1ee…, dbc6bd8a…, e0838b7f… | assets/raw/env/*.glb |
| — | 19:24 | — | sam_3_3d | (실패·환불) 오크 천막 | 0 | 298366b8… | — |

## 합계

- 시작 잔액 127.12 → 최종 잔액 9.62 크레딧 (**사용 117.50 크레딧**, 한도 1,000 이내)
- 내역: 이미지 4.5(지시 변경 전 7장, 이후 0) + Tripo 이미지→3D 99(폐기된 무협풍 주인공 12, 주인공 12, 보스 12, 캐릭터 5종 45, 오크 9, 상인 9) + SAM 3D 14(성공 14건×1, 실패 6건은 자동 환불) = 117.5
- 힉스필드의 자동 리깅·애니메이션 옵션은 한 번도 켜지 않음(전부 리깅 없는 메시만 받음).
- 지시 변경(17:35) 이후 모든 그림(캐릭터·건물·소품 컨셉, UI 아이콘, 키 아트, 바닥 텍스처, 방패 문장)은 codex CLI 로 생성 → `assets/concept_codex/`, 프롬프트는 `_work/prompts/`.
- 소리는 전부 Artlist 카탈로그(생성 아님): `assets/audio/CREDITS.md` 참고.
- 외부 에셋: 한글 폰트 Noto Sans KR / Noto Serif KR (OFL, npm @fontsource), three.js(MIT).

## 2026-11-13 추가 (스킬 확장·새 이야기)
- `assets/ui/skill_icons2.png` — codex CLI 내장 이미지 생성(`tools/codex_image.sh skill_icons2 _work/prompts/skill_icons2.txt`). 3×3: 0 선봉 돌파, 1 단죄의 일격, 2 출혈 베기, 3 여명의 손길, 4 수호, 5 격노, 6 서약, 7 방패 가격, 8 사자 문장 갑옷.
- `assets/ui/portrait_hallen.jpg` — codex CLI(`tools/codex_image.sh portrait_hallen _work/prompts/portrait_hallen.txt assets/concept_codex/hero_knight.png`) 결과의 머리 부분을 256×256 으로 자름. 붉은까마귀 문주 할렌.
- `assets/ui/portrait_merchant.jpg` — 기존 `assets/concept_codex/merchant.png`(codex 생성)의 머리 부분을 256×256 으로 자름. 잡화상인 리나.

## 2026-11-13 추가 (v4 사실적 PBR 지면·벽·식생 텍스처)
공통: 알베도·식생 원본은 전부 codex CLI 내장 이미지 생성(`tools/codex_image.sh <이름> _work/prompts/<이름>.txt` → `assets/concept_codex/<이름>.png`, 프롬프트는 `_work/v4/tex/write_prompts.py` 가 씀). 노멀·AO/거칠기/높이는 파이썬(numpy·OpenCV)으로 알베도에서 유도(`_work/v4/tex/build_ground.py`), 알파 아틀라스는 색 키 분리(`_work/v4/tex/build_veg.py`). 외부 에셋·다른 생성 서비스 없음.
- `assets/tex/town_cobble_{c,n,orm}.jpg` — codex `pbr_town_cobble`(젖은 회색 잔돌 포장, 돌 15~22cm) → 이음매 제거·평탄화, 워터셰드로 돌 분리해 노멀/ORM 유도.
- `assets/tex/town_flagstone_{c,n,orm}.jpg` — codex `pbr_town_flagstone2`(광장 판석 40~80cm, 약 50장). 1차 `pbr_town_flagstone` 은 판석이 3장뿐이라 폐기.
- `assets/tex/grass_meadow_{c,n,orm}.jpg` — codex `pbr_grass_meadow`(짧은 풀·토끼풀·마른 잎이 섞인 풀밭 바닥).
- `assets/tex/forest_floor_{c,n,orm}.jpg` — codex `pbr_forest_floor`(낙엽·잔가지·이끼·뿌리).
- `assets/tex/dirt_path_{c,n,orm}.jpg` — codex `pbr_dirt_path`(다져진 흙길·자갈).
- `assets/tex/mud_camp_{c,n,orm}.jpg` — codex `pbr_mud_camp`(오크 야영지 진흙·재·발자국, 낮은 곳은 젖은 거칠기).
- `assets/tex/grave_soil_{c,n,orm}.jpg` — codex `pbr_grave_soil`(마른 풀·잿빛 흙·자갈).
- `assets/tex/volcanic_rock_{c,n,orm}.jpg`, `volcanic_rock_e.jpg` — codex `pbr_volcanic_rock`(검은 현무암 판·균열). `_e` 는 균열 마스크×잡음으로 만든 용암 발광 마스크(`_work/v4/tex/build_extra.py`).
- `assets/tex/ash_ground_{c,n,orm}.jpg` — codex `pbr_ash_ground`(재·그을음·탄 조각). 눈에 띄는 숯 조각 하나는 복제 덮기로 지움.
- `assets/tex/castle_wall_{c,n,orm}.jpg` — codex `pbr_castle_wall`(크기가 고르지 않은 회색 마름돌, 이끼·빗물 자국).
- `assets/tex/roof_tile_{c,n,orm}.jpg` — codex `pbr_roof_slate`(겹쳐 인 점판암 지붕널).
- `assets/tex/wood_planks_{c,n,orm}.jpg` — codex `pbr_wood_planks`(풍화된 세로 참나무 널).
- `assets/tex/plaster_wall_{c,n,orm}.jpg` — codex `pbr_plaster_wall`(낡은 회반죽 벽).
- `assets/tex/grass_blades.png` — codex `veg_grass_blades`(마젠타 배경 풀 포기 8종) → 알파 분리·4×2 재배치.
- `assets/tex/fern_weeds.png` — codex `veg_fern_weeds`(고사리·소리쟁이·쐐기풀·민들레·데이지·마른 잡초·토끼풀) → 4×2.
- `assets/tex/leaf_cluster_oak.png` — codex `veg_leaf_oak`(참나무 잎 뭉치 4종) → 2×2.
- `assets/tex/needle_branch_pine.png` — codex `veg_needle_pine`(가문비·소나무 가지 4종) → 2×2.
- `assets/tex/dead_branch.png` — codex `veg_dead_branch`(마른 가지 3종 + 나뭇가지 더미) → 2×2.
- `assets/tex/ivy_moss.png` — codex `veg_ivy_moss`(담쟁이 2종 + 이끼 2종) → 2×2.
- `assets/tex/decal_debris.png` — codex `decal_debris`(낙엽 더미 2종 + 돌 부스러기 2종) → 2×2.
- `assets/tex/decal_cracks.png` — codex `decal_cracks`(흰 배경 검은 균열 4종) → 어두운 정도를 알파로, 2×2.
- `assets/tex/decal_stains.png` — codex `decal_stains`(마른 핏자국 2종 + 그을음 2종, 흰 배경) → 알파 분리, 2×2.
- `assets/tex/decal_puddle.png` — 그림 없이 절차적 생성(`_work/v4/tex/build_puddle.py`, 잡음 기반 웅덩이 마스크 4종).

## 2026-11-13~14 v4 소품 재제작(블렌더 절차적 모델링 + codex 텍스처, 외부 에셋·생성 서비스 없음)
- 텍스처 원본(codex CLI 내장 이미지 생성, `tools/codex_image.sh <이름> _work/prompts/<이름>.txt` → `assets/concept_codex/<이름>.png`), 가공은 `_work/v4/blender/texprep.py`(타일링·색 보정·노멀 유도·알파 추출):
  - `assets/concept_codex/prop_leaf_oak.png` — 참나무 잎다발 4종 아틀라스(자홍 배경 → 알파 추출). 프롬프트 `_work/prompts/prop_leaf_oak.txt`
  - `assets/concept_codex/prop_leaf_pine.png` — 침엽수 가지 4종 아틀라스(자홍 배경 → 알파 추출). 프롬프트 `_work/prompts/prop_leaf_pine.txt`
  - `assets/concept_codex/prop_bark_oak.png` — 참나무 껍질(타일) — 고목용 회색판(bark_dead)도 여기서 파생. 프롬프트 `_work/prompts/prop_bark_oak.txt`
  - `assets/concept_codex/prop_bark_pine.png` — 소나무 껍질(타일). 프롬프트 `_work/prompts/prop_bark_pine.txt`
  - `assets/concept_codex/prop_rock.png` — 화강편마암 바위 표면(타일). 프롬프트 `_work/prompts/prop_rock.txt`
  - `assets/concept_codex/prop_moss.png` — 이끼(타일). 프롬프트 `_work/prompts/prop_moss.txt`
  - `assets/concept_codex/prop_wood.png` — 풍화된 참나무 판재 결(타일). 프롬프트 `_work/prompts/prop_wood.txt`
  - `assets/concept_codex/prop_iron.png` — 단조 쇠(타일). 프롬프트 `_work/prompts/prop_iron.txt`
  - `assets/concept_codex/prop_burlap.png` — 삼베 자루천(타일). 프롬프트 `_work/prompts/prop_burlap.txt`
  - `assets/concept_codex/prop_canvas.png` — 아마 천막천(타일). 프롬프트 `_work/prompts/prop_canvas.txt`
  - `assets/concept_codex/prop_hay.png` — 건초(타일). 프롬프트 `_work/prompts/prop_hay.txt`
  - `assets/concept_codex/prop_hide.png` — 무두질한 가죽(타일). 프롬프트 `_work/prompts/prop_hide.txt`
  - `assets/concept_codex/prop_limestone.png` — 풍화 석회암(묘비용, 타일). 프롬프트 `_work/prompts/prop_limestone.txt`
  - 나이테(통나무 단면) 텍스처는 그림 생성 없이 numpy 로 절차 생성(`_work/v4/blender/tex/woodend_*.jpg`).
- 모델(블렌더 5.1 `-b` 파이썬 스크립트 `_work/v4/blender/{trees,rocks,props}.py` → 형상 GLB → `finalize.py` 가 JPG/PNG 텍스처 내장):
  - `assets/models/env/oak_tree2.glb` — 참나무 A(관 메시 줄기·가지 + 잎 카드, 껍질 prop_bark_oak·잎 prop_leaf_oak). 5492 삼각형, 640 KB
  - `assets/models/env/oak_tree2b.glb` — 참나무 B(작은 변형). 4499 삼각형, 601 KB
  - `assets/models/env/pine_tree2.glb` — 가문비/소나무 A(껍질 prop_bark_pine·잎 prop_leaf_pine). 4056 삼각형, 633 KB
  - `assets/models/env/pine_tree2b.glb` — 가문비/소나무 B(작은 변형). 3228 삼각형, 605 KB
  - `assets/models/env/dead_tree2.glb` — 고목 A(잎 없음, bark_dead). 1804 삼각형, 269 KB
  - `assets/models/env/dead_tree2b.glb` — 고목 B(부러진 그루터기형). 1758 삼각형, 268 KB
  - `assets/models/env/rock2_a.glb` — 바위 대(평면 절삭+잡음 변위 고해상 → 저해상에 노멀·색·AO 굽기, prop_rock+prop_moss). 1313 삼각형, 595 KB
  - `assets/models/env/rock2_b.glb` — 바위 중(3개 묶음). 1378 삼각형, 600 KB
  - `assets/models/env/rock2_c.glb` — 바위 소(납작). 719 삼각형, 203 KB
  - `assets/models/env/rock2_a_moss.glb` — 이끼 바위 대. 1285 삼각형, 587 KB
  - `assets/models/env/rock2_b_moss.glb` — 이끼 바위 중. 1217 삼각형, 604 KB
  - `assets/models/env/rock2_c_moss.glb` — 이끼 바위 소. 723 삼각형, 242 KB
  - `assets/models/env/crates2.glb` — 잡동사니 1: 판재 상자 3·참나무 통·자루 2(prop_wood·prop_iron·prop_burlap 을 아틀라스로 굽기). 4994 삼각형, 607 KB
  - `assets/models/env/barrels2.glb` — 잡동사니 2: 통 3·상자·양동이. 3784 삼각형, 498 KB
  - `assets/models/env/sacks2.glb` — 잡동사니 3: 자루 더미·사과 상자. 2370 삼각형, 327 KB
  - `assets/models/env/cart2.glb` — 손수레(바퀴·난간·짐). 2876 삼각형, 502 KB
  - `assets/models/env/fence2.glb` — 통나무 울타리 한 칸(3m). 536 삼각형, 143 KB
  - `assets/models/env/woodpile2.glb` — 장작더미·모탕·도끼. 1556 삼각형, 294 KB
  - `assets/models/env/haystack2.glb` — 건초 더미·건초 단·쇠스랑(prop_hay). 1492 삼각형, 333 KB
  - `assets/models/env/lamp_post2.glb` — 가로등(돌 받침·기둥·쇠 등롱, 발광 텍스처). 884 삼각형, 163 KB
  - `assets/models/env/brazier2.glb` — 화톳불대(쇠 삼발이·숯, 발광 텍스처). 612 삼각형, 118 KB
  - `assets/models/env/market_stall2.glb` — 시장 좌판(붉은 줄무늬 천막, prop_canvas). 5664 삼각형, 570 KB
  - `assets/models/env/market_stall2b.glb` — 시장 좌판(청록 줄무늬). 5664 삼각형, 567 KB
  - `assets/models/env/gravestones2.glb` — 묘비 묶음 A(둥근 머리 2기+봉분, prop_limestone+prop_moss). 898 삼각형, 210 KB
  - `assets/models/env/gravestones2b.glb` — 묘비 묶음 B(돌 십자가). 594 삼각형, 205 KB
  - `assets/models/env/gravestones2c.glb` — 묘비 묶음 C(부러진 묘비). 736 삼각형, 210 KB
  - `assets/models/env/campfire2.glb` — 모닥불 자리(돌 테두리·재·숯 장작·불씨 발광). 1608 삼각형, 275 KB
  - `assets/models/env/orc_tent2.glb` — 오크 가죽 천막(prop_hide, 뼈·해골 장식). 2198 삼각형, 284 KB
- 건물 보수(기존 GLB 를 블렌더로 불러 법선 정리·자동 스무딩 → AO 굽기, 원본 색 텍스처에서 노멀맵 유도·채도 낮춤. `_work/v4/blender/buildings.py` + `buildings_tex.py`, 새 그림 생성 없음):
  - `assets/models/env/house2.glb` — 민가(원본 `house.glb` 과 같은 크기·원점). 6000 삼각형, 529 KB
  - `assets/models/env/tavern2.glb` — 선술집(원본 `tavern.glb` 과 같은 크기·원점). 9000 삼각형, 708 KB
  - `assets/models/env/forge2.glb` — 대장간(원본 `forge.glb` 과 같은 크기·원점). 9999 삼각형, 738 KB
  - `assets/models/env/gatehouse2.glb` — 성문(원본 `gatehouse.glb` 과 같은 크기·원점). 12000 삼각형, 802 KB
  - `assets/models/env/fountain2.glb` — 분수(원본 `fountain.glb` 과 같은 크기·원점). 5999 삼각형, 491 KB
