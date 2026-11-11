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
