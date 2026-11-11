# 에르하임: 사자의 맹세

리니지류 쿼터뷰 3D MMORPG(오리지널). `index.html` 을 크롬에서 더블클릭해 열면 된다(서버 불필요, 1920×1080 기준, 창 크기에 맞춰 축소).

- 타이틀에서 **게임 시작** 또는 **녹화용 자동 모드**(마을 → 자동사냥 → 레벨업 → 강화 → 레이드, 약 3분)
- 주소 뒤에 `?demo=1` 을 붙이면 바로 자동 모드, `?play=1` 이면 바로 플레이
- 조작: 땅 클릭/WASD 이동, 몬스터 클릭·Space 공격, 1~4 스킬, R 자동사냥, Q 물약, I 가방, C 장비, B 레이드 소환, 대장장이 클릭 = 강화

## 다시 만들기
```bash
blender/rig_char.sh hero all            # 주인공: 가져오기→뼈대→가중치→장비→동작→검사·내보내기 (blender/current.blend)
blender/run_stage.sh s07_ad_render blender/scripts/s07_ad_render.py --open blender/current.blend -- hero   # 광고 렌더
python3 tools/verify_glb.py             # 블렌더 없이 GLB 만으로 숫자 검사(독립 구현)
cd game && node make_manifest.mjs && node pack_assets.mjs && node build.mjs   # 게임 빌드
node tools/shot.mjs "index.html?demo=1" _work/shots/demo.jpg --ready=__READY__ --shots=40 --every=5000   # 자동 모드 캡처
```
폴더: `input/`(주인공 원본) `blender/`(리깅 스크립트·작업 파일·렌더·검사 결과) `assets/`(모델·그림·소리·생성 기록) `game/`(소스) `dist/`(빌드 결과) `tools/`
