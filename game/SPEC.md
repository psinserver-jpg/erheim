# 게임 명세 (모듈 계약서)

## 0. 게임 한 줄 소개

**〈에르하임: 사자의 맹세〉** — 리니지류 쿼터뷰 3D MMORPG(오리지널). 중세 판타지 왕국 에르하임의 기사가 되어 자동사냥으로 레벨을 올리고,
장비를 강화하고(성공/실패/증발), 문파원들과 레이드 보스를 잡는다. 한국 사람이 보자마자 "아, 그 게임 느낌" 하고 웃어야 한다.
화면 글자는 전부 **한국어**. 해상도 **1920×1080** 고정 설계. 기존 게임의 이름·캐릭터·로고·고유 아이템명은 쓰지 않는다(전부 오리지널).

- 주인공: 기사 **카일** (문파 [은사자]). 체력(HP)·내력(MP)·경험치.
- 장소: **벨로스 성채**(마을) → **속삭이는 숲**(늑대인간·오크) → **잊혀진 묘지**(해골 기사) → **잿불 제단**(레이드 보스 **염옥의 군주 발카르**)
- NPC: 대장장이 **브롬**(강화), 잡화상인 **리나**
- 문파 6개(문장 시트 순서): 0 은사자, 1 붉은까마귀, 2 새벽검, 3 철권단, 4 폭풍, 5 가시장미
- 대표 장비: **여명의 장검**(강화 대상), 강화 주문서, 빨간 물약(체력), 파란 물약(내력)

## 1. 기술 규칙

- 순수 자바스크립트 ES 모듈(`game/src/**`), three.js r187(`import * as THREE from 'three'`, 부가 모듈은 `three/addons/...`). TypeScript·프레임워크 금지.
- `node game/build.mjs` 가 `game/src/main.js` 를 `dist/game.js`(IIFE 하나)로 묶는다. `index.html` 은 더블클릭(file://)으로 열려야 하므로
  **런타임에 fetch/XHR/ES module import/외부 URL(CDN·웹폰트)을 쓰지 않는다.** 그림·모델·소리는 `Assets`(game/src/core/assets.js)로만 읽는다.
- CSS 는 `import css from './x.css'` (문자열로 들어온다) 후 `<style>` 로 주입한다. 폰트는 `dist/fonts.css` 가 이미 제공한다:
  `font-family: 'GameSans'`(본문, 400/500/700), `'GameSerif'`(제목·배너, 700/900). 다른 폰트 파일을 추가하지 않는다.
- 개발용 시험 페이지는 `game/dev/<이름>.html` + `game/dev/<이름>.js` 로 만들고, 다음처럼 따로 묶어 헤드리스로 찍어 본다:
  ```bash
  cd "<작업 폴더>" && node game/build.mjs dev/ui_hud_test.js:../dist/dev/ui_hud_test.js
  node tools/shot.mjs "game/dev/ui_hud_test.html" _work/shots/ui_hud_1.png --wait=800 [--eval="window.demoStep(2)"] [--ready=__READY__]
  ```
  (시험 페이지의 html 은 `../../dist/fonts.css` 와 `../../dist/dev/<이름>.js` 를 `<script src>`/`<link>` 로 읽는다. 시험 페이지에서는 그림을
  `<img src="../../assets/ui/...">` 처럼 상대 경로로 직접 읽어도 된다.) 찍은 그림은 Read 로 직접 보고 고친다.
- 전역 오염 금지: 모듈은 export 만 한다. 시험용 전역은 `window.__READY__`, `window.demoStep` 정도만.
- 성능: 60fps 목표. DOM 을 매 프레임 새로 만들지 말고 재사용(풀)한다. 매 프레임 호출되는 함수는 할당을 피한다.

## 2. 공용 그림(이미 준비됨, `assets/ui/`)

| 키(=파일) | 내용 |
|---|---|
| `ui/skill_icons.png` | 1024², **3×3** 스킬 아이콘. 번호(행 우선 0~8): 0 베기, 1 연속 베기, 2 회전 베기, 3 도약 강타, 4 수호의 방패, 5 뇌전검, 6 사자후(투지), 7 귀환(순간이동), 8 빨간 물약 |
| `ui/item_icons.png` | 1024², **4×4** 아이템. 0 장검, 1 방패, 2 투구, 3 갑옷, 4 장갑, 5 장화, 6 망토, 7 반지, 8 목걸이, 9 빨간 물약, 10 파란 물약, 11 무기 강화 주문서, 12 방어구 강화 주문서, 13 축복받은 주문서, 14 금화, 15 마력 결정 |
| `ui/guild_crests.png` | 1536×1024, **3열×2행** 문파 문장. 0 은사자, 1 붉은까마귀, 2 새벽검, 3 철권단, 4 폭풍, 5 가시장미 |
| `ui/key_art.jpg` | 1536×1024 키 아트(타이틀·로딩 배경) |
| `ui/portrait_hero.jpg` | 주인공 얼굴(정사각) |
| `ui/portrait_werewolf.jpg` `ui/portrait_orc.jpg` `ui/portrait_skeleton.jpg` `ui/portrait_demon.jpg` `ui/portrait_blacksmith.jpg` | 대상 초상(정사각) |

시트는 `background-image` + `background-size`/`background-position` 으로 칸을 잘라 쓴다(칸 사이에 얇은 검은 틈이 있으니 2~3% 안쪽으로 잘라낸다).

## 3. UI 계약 (`game/src/ui/`)

화면 위에 얹는 DOM 오버레이. three.js 를 import 하지 않는다. 루트는 `#ui`(1920×1080, `pointer-events:none`, 조작 가능한 요소만 `auto`).
공통 테마는 `game/src/ui/theme.css`(이미 있음, **수정 금지** — 변수와 기본 클래스를 가져다 쓴다).

분담: **HUD**(`hud.js`, `hud.css`) / **창·연출**(`windows.js`, `windows.css`). 둘 다 `export function create(ctx)` 를 내보내고, 반환한 객체의 메서드가 아래 계약이다.
`ctx = { root: HTMLElement, img: (키) => URL문자열, emit: (이벤트이름, 데이터) => void }`.

### 3.1 HUD (`hud.js`) — `const hud = Hud.create(ctx)`

리니지류 모바일/PC MMORPG HUD 배치: 왼쪽 위 = 초상+이름+레벨+문파+체력/내력 막대+버프, 위 가운데 = 대상(몬스터) 정보·보스 체력 막대·지역 배너·서버 공지 띠,
오른쪽 위 = 미니맵(원형/사각)+지역명+좌표+메뉴 아이콘 줄, 왼쪽 가운데 = 의뢰(퀘스트) 추적, 왼쪽 아래 = 채팅창(탭), 아래 가운데 = 경험치 막대(화면 폭)·물약 단축칸,
오른쪽 아래 = 스킬 버튼 호(가운데 큰 기본 공격 버튼 + 주변 스킬 5개) + **자동사냥(AUTO) 버튼**.

| 메서드 | 설명 |
|---|---|
| `setPlayer({name, level, guild, crest, hp, hpMax, mp, mpMax, exp, gold, power})` | 일부 필드만 줘도 된다(부분 갱신). exp 는 0~1. 체력/내력은 숫자와 막대(부드럽게 줄고 늘기, 잔상 막대)로 |
| `setBuffs([{id, icon, name, remain, total}])` | 버프 아이콘(남은 시간 가리개) |
| `setTarget(null \| {name, level, hp, hpMax, kind:'monster'\|'elite'\|'player'\|'npc', portrait})` | 대상 정보 틀 |
| `setBoss(null \| {name, title, hp, hpMax, phase, phases})` | 화면 위 큰 보스 체력 막대(여러 줄 체력 느낌) |
| `setSkills([{id, name, icon, key, cd, cdLeft, mp, enabled}])` / `updateSkill(id, {cdLeft, enabled, active})` | 스킬 버튼. 재사용 대기 가리개(원형 sweep)와 남은 초. 버튼 클릭 → `emit('skill', id)`. 기본 공격 버튼 → `emit('attack')` |
| `setAuto(on)` | 자동사냥 버튼 상태(켜지면 회전하는 테두리·"자동사냥 중" 표시). 클릭 → `emit('toggleAuto')` |
| `setPotions({hp, mp})` | 물약 개수. 클릭 → `emit('potion', 'hp'\|'mp')` |
| `setQuest([{title, lines:[{text, cur, max, done}]}])` | 의뢰 추적 |
| `setZone(name, sub)` / `zoneBanner(title, subtitle)` | 미니맵 아래 지역명 / 지역에 들어설 때 가운데 크게 떴다 사라지는 배너 |
| `minimap` | `{canvas, ctx2d, size}` — 게임이 직접 그리는 캔버스(예: 220×220). `setCoords(x, y)` |
| `chat.add({channel:'world'\|'local'\|'guild'\|'party'\|'trade'\|'system', name, guild, text})` | 채팅 줄 추가(채널별 색, [문파] 표시, 최대 120줄 유지, 자동 스크롤). `chat.setTab(name)`, 입력창 Enter → `emit('chat', 문자열)` |
| `notice(text, kind:'enhance'\|'boss'\|'drop'\|'info')` | 서버 전체 공지 띠(위쪽 가운데, 금빛 글자가 흘러가거나 떴다 사라짐). 연속 호출 시 줄 세워 차례로 |
| `toast(text, kind)` | 작은 알림(아래 가운데 위쪽) |
| `loot({icon, name, count, rarity:'common'\|'rare'\|'epic'\|'legend'})` | 오른쪽 가운데에 획득 목록이 쌓였다 사라짐 |
| `levelUp(level)` | 화면 가운데 큰 "LEVEL UP" 금빛 연출 배너(2.5초). 한국어 보조 문구 포함 |
| `damage(x, y, value, {kind:'deal'\|'crit'\|'take'\|'heal'\|'miss'\|'exp'\|'gold', big})` | 화면 좌표(px)에 피해 숫자를 띄운다(튀어 오르며 사라짐, 치명타는 크고 노랑/주황, 받는 피해는 빨강). **풀 재사용**, 초당 60개도 버틸 것 |
| `plates.sync(list)` | 이름표. `list = [{id, x, y, name, guild, crest, level, hp(0~1\|null), kind:'player'\|'me'\|'monster'\|'elite'\|'boss'\|'npc', title, dim}]` 를 매 프레임 받는다. id 로 DOM 재사용, 목록에 없는 id 는 숨김. 문파는 `[문파명]` + 작은 문장 |
| `bubble(id, text, ms)` | 이름표 위 말풍선(채팅 말하기) |
| `cinema(on)` / `fade(toOpacity, ms, color)` | 위아래 검은 띠(연출) / 화면 페이드. `fade` 는 Promise 반환 |
| `showDemoCaption(text \| null)` | 녹화용 자동 모드 자막(아래 가운데, 예: "① 마을 — 벨로스 성채") |
| `setVisible(on)` | HUD 전체 숨김/표시 |

### 3.2 창·연출 (`windows.js`) — `const win = Windows.create(ctx)`

| 메서드 | 설명 |
|---|---|
| `loading.show()` / `loading.set(0~1, 문구)` / `loading.hide()` | 로딩 화면(키 아트 배경, 로고, 진행 막대, 한 줄 팁) |
| `title.show({onStart, onDemo})` / `title.hide()` | 타이틀 화면: 키 아트 + 로고 "에르하임" + 부제 "사자의 맹세" + 서버 선택 느낌(예: `아스테르 01 · 혼잡`) + 버튼 **게임 시작**, **녹화용 자동 모드** + 하단 고지(등급 표시 느낌의 오리지널 문구). 로고는 CSS 글자(GameSerif 900, 금속 금빛 그라데이션)로 만든다 |
| `open(name)` / `close(name)` / `toggle(name)` / `isOpen(name)` | 창: `'inventory'`(가방), `'character'`(장비·능력치), `'enhance'`(강화), `'skills'`, `'guild'`(문파원 목록), `'settings'`. 창은 드래그 이동, 닫기 버튼, Esc 로 닫힘 |
| `inventory.set({gold, items:[{id, icon, name, count, rarity, plus, equipped}]})` | 가방(격자 칸). 칸 클릭 → `emit('itemClick', id)` |
| `character.set({name, level, guild, stats:{공격력, 방어력, ...}, equip:[{slot, icon, name, plus, rarity}]})` | 장비 창 |
| `enhance.set({item:{icon, name, plus, rarity}, scrolls, blessed, rate(0~1), nextPlus, safe(안전 강화 여부), log:[문자열]})` | 강화 창: 가운데 장비 칸, 현재 +수치 → 다음 +수치, 성공 확률, 주문서 수, **강화** 버튼 → `emit('enhance')`, 자동 강화 체크 |
| `enhance.play('success'\|'fail'\|'destroy', {from, to, name})` → Promise | **강화 연출**(1.6~2.4초): 두드리는 준비(게이지·빛 모임) → 성공: 금빛 폭발·"강화 성공!"·+수치 상승 / 실패: 붉은 번쩍·금 가는 효과·화면 흔들림 느낌(창 흔들기)·"강화 실패" / 증발(destroy): 장비가 산산조각·"장비가 증발했습니다…" 회색 여운. 확실하고 과장되게 |
| `dialog.show({name, portrait, text, options:[{label, id}]})` / `dialog.hide()` | NPC 대화창. 선택 → `emit('dialog', id)` |
| `raidResult.show({title, rank:[{name, guild, dmg, mvp}], loot:[{icon,name,rarity}]})` / `.hide()` | 레이드 결과판(기여도 순위·획득) |
| `death.show({sec})` / `.hide()` | 사망 화면("쓰러졌습니다" + 마을에서 부활 버튼 → `emit('revive')`) |
| `ending.show({lines:[...]})` | 자동 모드 끝 화면(로고 + 요약 몇 줄) |

### 3.3 공통 디자인 방향

- 어두운 반투명 패널(#0d1018 ~ 85%), 얇은 금테(#c8a45a 계열)와 모서리 장식, 금빛 제목(GameSerif), 본문(GameSans), 숫자는 굵게.
- 체력 = 붉은 그라데이션, 내력 = 푸른 그라데이션, 경험치 = 금빛 가는 막대. 희귀도 색: common #cfd3da, rare #4aa3ff, epic #b36bff, legend #ffb23e.
- 스크린샷만 봐도 출시된 한국 MMORPG 같아야 한다: 정보 밀도가 높되 정돈되어 있고, 아이콘·테두리·그림자·광택 등 마감이 꼼꼼해야 한다. 기본 브라우저 버튼·기본 폰트·밋밋한 사각형이 보이면 실패.
- 글자는 전부 한국어(단, LEVEL UP·AUTO·MVP 같은 장르 관용 표기는 허용). 문구는 실제 한국 MMORPG 말투.

## 4. 이펙트 계약 (`game/src/fx/vfx.js`)

`import { VFX } from './fx/vfx.js'` — three.js 로 만든 이펙트 모음. 텍스처는 **코드로(Canvas) 생성**한다(외부 그림 금지). 풀·인스턴싱으로 가볍게.
좌표계: three.js 기준 **Y 위**, 땅은 y≈0 (지형 높이는 호출자가 넣어 줌). 색은 0xRRGGBB.

| 함수 | 설명 |
|---|---|
| `VFX.init({scene, camera, renderer})` / `VFX.update(dt)` / `VFX.count()` | 초기화 / 매 프레임 갱신 / 살아 있는 이펙트 수 |
| `VFX.slash(pos, yaw, {kind:'arc1'\|'arc2'\|'smash'\|'spin', color, scale})` | 검기(초승달 모양 띠가 빠르게 그려졌다 사라짐). arc1 = 오른위→왼아래 사선, arc2 = 수평, smash = 수직 내려찍기+바닥 충격, spin = 캐릭터 둘레 360° |
| `VFX.hit(pos, {color, scale, crit})` | 타격 불꽃(짧은 섬광 + 방사 스파크). crit 면 더 크고 별 모양 섬광 |
| `VFX.shockwave(pos, radius, {color, duration})` | 바닥 충격파 고리 + 먼지 |
| `VFX.dust(pos, {scale})` / `VFX.footDust(pos)` | 먼지 |
| `VFX.levelUp(object3D)` | 레벨업: 발밑 마법진 + 솟구치는 금빛 기둥 + 위로 흩어지는 빛 알갱이(2.5초). 대상 오브젝트를 따라다님 |
| `VFX.buff(object3D, {color, duration})` / `VFX.heal(object3D)` | 몸 주위를 도는 오라 / 초록 빛 상승 |
| `VFX.teleport(pos, {out})` | 순간이동 빛기둥(사라질 때/나타날 때) |
| `VFX.lootBeam(pos, {color, duration})` | 떨어진 전리품 위 빛줄기(희귀도 색) |
| `VFX.telegraph(pos, radius, duration, {color})` → handle | 보스 장판 예고: 바닥 붉은 원이 안에서 밖으로 차오름. 끝나면 자동 소멸. `handle.cancel()` |
| `VFX.meteor(pos, {delay, radius})` | 하늘에서 불덩이가 떨어져 폭발(예고 원과 함께 쓰임) |
| `VFX.fireRing(pos, radius, {duration})` / `VFX.flameBurst(pos, {scale})` | 화염 고리 / 화염 폭발 |
| `VFX.projectile(from, to, {kind:'magic'\|'arrow'\|'fire', speed, color, onHit})` | 투사체(꼬리 달린 빛/화살). 도착 시 onHit() |
| `VFX.weaponTrail(object3D, {base:[x,y,z], tip:[x,y,z], color, width})` → `{setActive(on), dispose()}` | 무기 궤적 띠(무기 로컬 좌표 두 점을 매 프레임 따라가며 리본을 그림) |
| `VFX.enhanceGlow(object3D, level)` → `{setLevel(n), dispose()}` | 강화 수치에 따른 무기 발광(+0 없음, +3 은은한 파랑, +5 파랑, +7 보라, +9 주황·금빛 불꽃 입자). 무기에 붙어 따라다님 |
| `VFX.spawn(pos, {color})` / `VFX.deathFade(object3D, {duration})` | 몬스터 등장 연기 / 죽은 뒤 서서히 가라앉으며 사라짐(재질 투명도 조절) |
| `VFX.ambient(kind:'embers'\|'fireflies'\|'leaves'\|'ash', {center, radius, count})` → handle | 지역 분위기 입자(보스 구역 불티, 숲 반딧불이 등). `handle.dispose()` |
| `VFX.groundDecal(pos, {kind:'crack'\|'scorch'\|'circle', radius, duration, color})` | 바닥 자국 |
| `VFX.textureFor(name)` | 내부 캔버스 텍스처(`'glow'`,`'spark'`,`'smoke'`,`'ring'`,`'slash'`) 공유용 |

타격감이 핵심: 섬광은 가산 혼합(AdditiveBlending), 처음 2~3프레임이 가장 밝고 빠르게 감쇠. 블룸 후처리(게임 쪽 UnrealBloomPass)가 걸린다는 전제로 색을 진하게.

## 5. 소리 계약 (`game/src/audio/audio.js`)

`import { Sound } from './audio/audio.js'` — WebAudio. 소리 파일은 `assets/audio/*.mp3`(패킹 키 `audio/<이름>.mp3`), 목록은 `assets/audio/manifest.json`.

| 함수 | 설명 |
|---|---|
| `Sound.init(Assets)` | AudioContext 준비(첫 사용자 입력 때 resume). 실패해도 예외를 던지지 않는다(소리 없이 진행) |
| `Sound.preload(keys)` → Promise | 디코드 |
| `Sound.sfx(name, {volume, rate, pan, pos:{x,z}})` | 효과음(같은 소리 동시 재생 수 제한, 약간의 음높이 무작위). pos 를 주면 청자와의 거리로 감쇠 |
| `Sound.setListener(x, z)` | 청자 위치(주인공) |
| `Sound.bgm(name, {fade})` | 배경음 교체(교차 페이드, 반복) |
| `Sound.ambient(name \| null, {fade, volume})` | 환경음 반복 |
| `Sound.setVolume({master, bgm, sfx})` / `Sound.mute(on)` | 음량 |

## 6. 데이터·채팅 계약 (`game/src/data/`, `game/src/game/chatdirector.js`)

- `data/names.js`: `BOT_NAMES`(한국 MMORPG 닉네임 150개 이상, 오리지널·무해), `GUILDS`(6개: `{id, name, crest, color, motto}`), `randomName(rng)`.
- `data/chatlines.js`: 상황별 한국어 채팅 문구 묶음 — 마을 잡담, 거래 외침(삽니다/팝니다), 파티 구함, 사냥터 대화, 강화 성공/실패 반응, 레벨업 축하, 보스 등장 반응, 레이드 중 외침(탱·힐·딜 콜), 레이드 성공/실패 반응, 문파 채팅, 시스템 공지 틀. `{문자열}` 치환자 사용(`{name}`, `{item}`, `{plus}`, `{boss}`, `{zone}`, `{price}`).
- `game/chatdirector.js`: `createChatDirector({rng, getBots, emitChat})` → `{update(dt), event(type, payload)}`. 평소에는 채널별 빈도로 자연스럽게 흘리고, 이벤트(`'enhanceSuccess'`,`'enhanceFail'`,`'levelUp'`,`'bossSpawn'`,`'bossPhase'`,`'bossDead'`,`'playerDeath'`,`'rareDrop'`)에 몇 초에 걸쳐 여러 봇이 반응한다. 같은 문구 반복 금지(최근 사용 기억). 순수 로직(DOM·three 없음), `node` 로 단위 시험 가능해야 한다.
