(() => {
  // game/src/ui/theme.css
  var theme_default = "/* \uACF5\uD1B5 \uD14C\uB9C8 (\uC218\uC815 \uAE08\uC9C0: HUD\xB7\uCC3D \uBAA8\uB4C8\uC774 \uD568\uAED8 \uC4F4\uB2E4) */\n#ui {\n  --gold: #d8b56a; --gold-hi: #ffe7a8; --gold-lo: #8a6a2e; --gold-line: rgba(200,164,90,.55);\n  --panel: rgba(13,16,24,.86); --panel-2: rgba(22,27,40,.92); --panel-line: rgba(255,255,255,.07);\n  --ink: #e9e4d6; --ink-dim: #a9a595; --ink-faint: #6f6c62;\n  --hp-a: #ff5a4a; --hp-b: #8e1010; --mp-a: #4fb2ff; --mp-b: #123a9a; --exp-a: #ffe08a; --exp-b: #c98a1e;\n  --common: #cfd3da; --rare: #4aa3ff; --epic: #b36bff; --legend: #ffb23e;\n  --ch-world: #ffd27a; --ch-local: #ececec; --ch-guild: #7dff9a; --ch-party: #7ecbff; --ch-trade: #ffa0d8; --ch-system: #ff8a5c;\n  --shadow: 0 6px 24px rgba(0,0,0,.55);\n  position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; overflow: hidden;\n  pointer-events: none; user-select: none; color: var(--ink);\n  font-family: 'GameSans', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; font-size: 15px; line-height: 1.35;\n  -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility;\n}\n#ui * { box-sizing: border-box; }\n#ui .interactive, #ui button, #ui input { pointer-events: auto; }\n#ui .serif { font-family: 'GameSerif', 'AppleMyungjo', 'Batang', serif; }\n/* \uAE08\uD14C \uD328\uB110 */\n#ui .panel {\n  background: linear-gradient(180deg, var(--panel-2), var(--panel));\n  border: 1px solid var(--gold-line); border-radius: 4px;\n  box-shadow: var(--shadow), inset 0 0 0 1px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.06);\n}\n/* \uAE08\uC18D \uAE08\uBE5B \uAE00\uC790 */\n#ui .gold-text {\n  font-family: 'GameSerif', serif; font-weight: 900;\n  background: linear-gradient(180deg, #fff6d0 0%, #ffd97a 32%, #c98f2c 58%, #7a4f12 78%, #e9c069 100%);\n  -webkit-background-clip: text; background-clip: text; color: transparent;\n  filter: drop-shadow(0 2px 0 rgba(0,0,0,.85)) drop-shadow(0 0 14px rgba(255,190,80,.35));\n}\n#ui .outline { text-shadow: 0 0 2px #000, 0 1px 2px #000, 1px 0 2px #000, -1px 0 2px #000, 0 -1px 2px #000; }\n/* \uAE30\uBCF8 \uBC84\uD2BC */\n#ui .btn {\n  font-family: 'GameSerif', serif; font-weight: 700; font-size: 17px; color: #f6e7bd; letter-spacing: .04em;\n  padding: 9px 26px; border-radius: 3px; cursor: pointer; border: 1px solid #b08a3e;\n  background: linear-gradient(180deg, #5a4420 0%, #2e210d 55%, #1c1407 100%);\n  box-shadow: inset 0 1px 0 rgba(255,236,170,.35), inset 0 -8px 14px rgba(0,0,0,.35), 0 3px 10px rgba(0,0,0,.5);\n  text-shadow: 0 1px 2px #000; transition: filter .12s, transform .08s;\n}\n#ui .btn:hover { filter: brightness(1.25); }\n#ui .btn:active { transform: translateY(1px); filter: brightness(.9); }\n#ui .btn.primary { background: linear-gradient(180deg, #b8862a 0%, #6d4a10 55%, #3d2906 100%); border-color: #f0cf7e; color: #fff8dc; }\n#ui .rar-common { color: var(--common); } #ui .rar-rare { color: var(--rare); } #ui .rar-epic { color: var(--epic); } #ui .rar-legend { color: var(--legend); }\n";

  // game/src/ui/hud.css
  var hud_default = `/* HUD (hud.js \uAC00 <style> \uB85C \uC8FC\uC785\uD55C\uB2E4). \uBAA8\uB4E0 \uD074\uB798\uC2A4\uB294 h- \uC811\uB450\uC0AC. \uD14C\uB9C8 \uBCC0\uC218\uB294 theme.css(#ui) \uAC83\uC744 \uC4F4\uB2E4. */
.h-hud { position: absolute; inset: 0; pointer-events: none; }
.h-hud.h-hidden { display: none; }
.h-layer { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
.h-main { transition: opacity .45s; }
.h-hud.h-cinema .h-main { opacity: 0; }
.h-hud.h-cinema .h-main * { pointer-events: none !important; }
.h-out { text-shadow: 0 0 2px #000, 0 1px 2px #000, 1px 0 2px #000, -1px 0 2px #000, 0 -1px 2px #000; }
.h-serif { font-family: 'GameSerif', 'AppleMyungjo', 'Batang', serif; }
.h-ico { display: block; background-repeat: no-repeat; }
.h-crest { display: inline-block; flex: none; background-repeat: no-repeat; vertical-align: middle;
  clip-path: polygon(0 9%, 22% 4%, 50% 0, 78% 4%, 100% 9%, 98% 52%, 90% 72%, 74% 88%, 50% 100%, 26% 88%, 10% 72%, 2% 52%);
  filter: drop-shadow(0 1px 1px #000); }

/* \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 \uB9C9\uB300 \uACF5\uD1B5 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.h-bar { position: relative; border-radius: 2px; overflow: hidden;
  background: linear-gradient(180deg, #050608, #171a22 70%, #0b0d12);
  box-shadow: 0 0 0 1px #000, 0 0 0 2px rgba(200,164,90,.5), 0 3px 8px rgba(0,0,0,.6); }
.h-bar > i { position: absolute; left: 0; top: 0; width: 100%; height: 100%; transform-origin: 0 50%; will-change: transform; }
.h-bar > .lag { background: linear-gradient(180deg, #fff1c9, #f0b765); opacity: .9; transition: transform .75s cubic-bezier(.3,.1,.2,1) .28s; }
.h-bar > .fill { transition: transform .2s cubic-bezier(.2,.8,.2,1); }
.h-bar > .gloss { transform: none; pointer-events: none;
  background: linear-gradient(180deg, rgba(255,255,255,.36) 0, rgba(255,255,255,.1) 38%, rgba(255,255,255,0) 44%, rgba(0,0,0,.28) 100%); }
.h-bar > .ticks { transform: none; background: repeating-linear-gradient(90deg, transparent 0 calc(10% - 1px), rgba(0,0,0,.5) calc(10% - 1px) 10%); }
.h-bar > .txt { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-weight: 700;
  font-variant-numeric: tabular-nums; letter-spacing: .02em; color: #fff; text-shadow: 0 0 2px #000, 0 1px 2px #000, 1px 0 2px #000, -1px 0 2px #000; }
.h-bar.hp > .fill { background: linear-gradient(180deg, #ff7a62 0%, var(--hp-a) 30%, #c2201a 62%, var(--hp-b) 100%); }
.h-bar.mp > .fill { background: linear-gradient(180deg, #86d0ff 0%, var(--mp-a) 30%, #1f63d6 62%, var(--mp-b) 100%); }
.h-bar.mp > .lag { background: linear-gradient(180deg, #e6f4ff, #8cc4ff); }

/* \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 \uC67C\uCABD \uC704: \uB0B4 \uC815\uBCF4 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.h-player { position: absolute; left: 14px; top: 12px; width: 500px; height: 112px; }
.h-player .plate { position: absolute; left: 50px; top: 6px; width: 432px; height: 88px;
  background: linear-gradient(90deg, rgba(10,12,19,.94) 0%, rgba(14,18,28,.86) 70%, rgba(14,18,28,.5) 100%);
  border-top: 1px solid var(--gold-line); border-bottom: 1px solid rgba(200,164,90,.22);
  -webkit-mask-image: linear-gradient(90deg, #000 84%, transparent); mask-image: linear-gradient(90deg, #000 84%, transparent); }
.h-player .plate::after { content: ''; position: absolute; left: 0; right: 0; top: 0; height: 30px; background: linear-gradient(180deg, rgba(255,231,168,.09), transparent); }
.h-portrait { position: absolute; left: 0; top: 0; width: 100px; height: 100px; }
.h-portrait .face { position: absolute; inset: 6px; border-radius: 50%; background: #111 center/cover no-repeat;
  box-shadow: inset 0 0 0 2px #000, inset 0 -14px 22px rgba(0,0,0,.55); }
.h-portrait .ring { position: absolute; inset: 0; border-radius: 50%;
  background: conic-gradient(from 210deg, #7a5a22, #ffe7a8 12%, #b88a3a 26%, #5b4116 44%, #f3d58c 60%, #8a6a2e 76%, #ffe7a8 90%, #7a5a22);
  -webkit-mask: radial-gradient(circle, transparent 0 43.5px, #000 44.5px 49.5px, transparent 50px); mask: radial-gradient(circle, transparent 0 43.5px, #000 44.5px 49.5px, transparent 50px);
  filter: drop-shadow(0 2px 4px rgba(0,0,0,.8)); }
.h-portrait .ring2 { position: absolute; inset: 5px; border-radius: 50%; box-shadow: inset 0 0 0 1px rgba(0,0,0,.9), 0 0 0 1px rgba(0,0,0,.8); }
.h-portrait .lv { position: absolute; left: 50%; bottom: -9px; transform: translateX(-50%); min-width: 46px; height: 24px; padding: 0 8px;
  display: flex; align-items: center; justify-content: center; gap: 2px; font-size: 11px; color: #d9c08a; font-weight: 700;
  background: linear-gradient(180deg, #3a2c12, #15100a); border: 1px solid #c9a55c; border-radius: 12px;
  box-shadow: 0 2px 6px rgba(0,0,0,.8), inset 0 1px 0 rgba(255,236,170,.35); }
.h-portrait .lv b { font-size: 16px; color: #fff3cf; font-family: 'GameSerif', serif; font-weight: 900; line-height: 1; }
.h-pbody { position: absolute; left: 110px; top: 9px; width: 370px; }
.h-nameline { display: flex; align-items: center; gap: 6px; height: 24px; white-space: nowrap; }
.h-nameline .guild { color: var(--ch-guild); font-size: 14px; font-weight: 500; }
.h-nameline .name { font-size: 19px; font-weight: 900; color: #fff3cf; letter-spacing: .03em; text-shadow: 0 1px 2px #000, 0 0 10px rgba(255,200,100,.25); }
.h-nameline .power { margin-left: auto; font-size: 12px; color: var(--ink-dim); padding: 1px 8px 1px 7px; border-radius: 10px;
  background: rgba(0,0,0,.45); border: 1px solid rgba(200,164,90,.3); }
.h-nameline .power b { color: var(--gold-hi); font-size: 14px; margin-left: 3px; font-variant-numeric: tabular-nums; }
.h-player .h-bar.hp { width: 340px; height: 22px; margin-top: 5px; }
.h-player .h-bar.hp .txt { font-size: 14px; }
.h-player .h-bar.mp { width: 306px; height: 15px; margin-top: 5px; }
.h-player .h-bar.mp .txt { font-size: 11.5px; }
.h-bartag { position: absolute; left: 6px; top: 0; height: 100%; display: flex; align-items: center; font-size: 10px; font-weight: 700; color: rgba(255,255,255,.75);
  letter-spacing: .08em; text-shadow: 0 1px 1px #000; }
.h-buffs { position: absolute; left: 110px; top: 100px; display: flex; gap: 6px; }
.h-buff { position: relative; width: 38px; }
.h-buff .ic { position: relative; width: 38px; height: 38px; border-radius: 4px; overflow: hidden; box-shadow: 0 0 0 1px #000, 0 2px 6px rgba(0,0,0,.7); }
.h-buff .ic .h-ico { width: 38px; height: 38px; }
.h-buff .ic .cd { position: absolute; inset: 0; background: conic-gradient(rgba(4,6,10,.72) calc(var(--p, 0) * 1turn), transparent 0); }
.h-buff .ic::after { content: ''; position: absolute; inset: 0; border-radius: 4px; box-shadow: inset 0 0 0 1px rgba(255,231,168,.55); }
.h-buff .t { margin-top: 2px; text-align: center; font-size: 11px; font-weight: 700; color: #fff; font-variant-numeric: tabular-nums; }
.h-buff.warn .t { color: #ff8a70; }
.h-buff.warn .ic { animation: h-blink 0.8s steps(2) infinite; }
@keyframes h-blink { 50% { opacity: .55; } }

/* \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 \uC704 \uAC00\uC6B4\uB370: \uBCF4\uC2A4 \xB7 \uB300\uC0C1 \xB7 \uACF5\uC9C0 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.h-topc { position: absolute; left: 50%; top: 10px; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; gap: 10px; width: 1000px; }
.h-boss { position: relative; width: 740px; padding: 0 0 2px; display: none; }
.h-boss.on { display: block; animation: h-drop .5s cubic-bezier(.2,.9,.2,1); }
@keyframes h-drop { from { opacity: 0; transform: translateY(-24px); } }
.h-boss .head { display: flex; align-items: flex-end; justify-content: center; gap: 12px; height: 38px; }
.h-boss .title { font-size: 15px; color: #e7b07a; letter-spacing: .28em; padding-bottom: 6px; }
.h-boss .name { font-size: 30px; font-weight: 900; letter-spacing: .12em; line-height: 1.1;
  background: linear-gradient(180deg, #fff0d2 0%, #ffb37a 35%, #e0452a 62%, #7a120a 100%); -webkit-background-clip: text; background-clip: text; color: transparent;
  filter: drop-shadow(0 2px 0 #000) drop-shadow(0 0 12px rgba(255,80,40,.55)); }
.h-boss .phase { display: flex; gap: 5px; padding-bottom: 9px; }
.h-boss .phase i { width: 11px; height: 11px; transform: rotate(45deg); background: #241a16; box-shadow: 0 0 0 1px #8a6a2e, 0 0 0 2px #000; }
.h-boss .phase i.on { background: linear-gradient(135deg, #ffd27a, #ff5a2a); box-shadow: 0 0 0 1px #ffe7a8, 0 0 0 2px #000, 0 0 8px #ff6a2a; }
.h-boss .row { position: relative; height: 34px; margin-top: 3px; }
.h-boss .h-bar { position: absolute; left: 42px; right: 42px; top: 4px; height: 26px; border-radius: 1px;
  box-shadow: 0 0 0 1px #000, 0 0 0 2px #c8a45a, 0 0 0 3px #000, 0 4px 14px rgba(0,0,0,.7), 0 0 26px rgba(255,60,30,.25); }
.h-boss .h-bar > .under { transform: none; opacity: .5; }
.h-boss .h-bar > .txt { font-size: 15px; letter-spacing: .04em; }
.h-boss .h-bar > .ticks { background: repeating-linear-gradient(90deg, transparent 0 calc(10% - 1px), rgba(0,0,0,.4) calc(10% - 1px) 10%); }
.h-boss .cap { position: absolute; top: 0; width: 34px; height: 34px; transform: rotate(45deg); z-index: 2;
  background: linear-gradient(135deg, #5b4116, #17110a 60%); box-shadow: 0 0 0 1px #000, 0 0 0 2px #c8a45a, 0 0 0 3px #000, 0 3px 10px rgba(0,0,0,.7); }
.h-boss .cap::after { content: ''; position: absolute; inset: 8px; background: linear-gradient(135deg, #ffb37a, #c2201a); box-shadow: 0 0 0 1px #000, 0 0 10px #ff5a2a; }
.h-boss .cap.l { left: 22px; } .h-boss .cap.r { right: 22px; }
.h-boss .mult { position: absolute; right: 68px; top: 4px; height: 26px; display: flex; align-items: center; z-index: 3; font-size: 19px; font-weight: 900; color: #ffe08a;
  text-shadow: 0 0 2px #000, 0 1px 2px #000, 1px 0 2px #000, -1px 0 2px #000; font-style: italic; }
.h-boss .mult small { font-size: 12px; margin-right: 1px; opacity: .85; }

.h-target { position: relative; width: 440px; height: 64px; display: none; }
.h-target.on { display: block; animation: h-pop .22s cubic-bezier(.2,.9,.2,1); }
@keyframes h-pop { from { opacity: 0; transform: scale(.94); } }
.h-target .bg { position: absolute; left: 30px; right: 0; top: 5px; bottom: 5px; border-radius: 3px;
  background: linear-gradient(90deg, rgba(10,12,19,.94), rgba(18,22,34,.88) 70%, rgba(18,22,34,.5));
  border: 1px solid var(--gold-line); border-left: 0; box-shadow: 0 6px 18px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.05); }
.h-target .pic { position: absolute; left: 0; top: 0; width: 64px; height: 64px; border-radius: 50%; background: #111 center/cover no-repeat;
  box-shadow: 0 0 0 1px #000, 0 0 0 3px #a8843c, 0 0 0 4px #000, 0 3px 10px rgba(0,0,0,.8), inset 0 -10px 16px rgba(0,0,0,.5); }
.h-target .info { position: absolute; left: 78px; right: 12px; top: 9px; }
.h-target .line { display: flex; align-items: baseline; gap: 7px; height: 22px; white-space: nowrap; }
.h-target .lv { font-size: 12px; font-weight: 700; color: var(--gold); }
.h-target .name { font-size: 16px; font-weight: 700; color: #ffd0c4; }
.h-target .kind { font-size: 11px; padding: 0 6px; height: 17px; line-height: 16px; border-radius: 2px; border: 1px solid rgba(255,255,255,.22); color: var(--ink-dim); align-self: center; }
.h-target .pct { margin-left: auto; font-size: 13px; font-weight: 700; color: #fff; font-variant-numeric: tabular-nums; }
.h-target .h-bar { height: 15px; margin-top: 4px; }
.h-target .h-bar .txt { font-size: 11px; }
.h-target.k-elite .name { color: #ffb85c; } .h-target.k-elite .kind { color: #ffb85c; border-color: #b9782c; background: rgba(120,60,0,.35); }
.h-target.k-elite .pic { box-shadow: 0 0 0 1px #000, 0 0 0 3px #ff9a3a, 0 0 0 4px #000, 0 0 14px rgba(255,140,40,.6); }
.h-target.k-boss .name { color: #ff7a5c; } .h-target.k-boss .kind { color: #ff7a5c; border-color: #a8321e; background: rgba(120,10,0,.4); }
.h-target.k-boss .pic { box-shadow: 0 0 0 1px #000, 0 0 0 3px #ff4a2a, 0 0 0 4px #000, 0 0 16px rgba(255,60,30,.7); }
.h-target.k-player .name { color: #fff; } .h-target.k-player .h-bar > .fill { background: linear-gradient(180deg, #ffb37a, #ff6a2a 35%, #b53a08 100%); }
.h-target.k-npc .name { color: #a8ffb4; } .h-target.k-npc .kind { color: #a8ffb4; border-color: #3f8a4e; }
.h-target.k-npc .h-bar > .fill { background: linear-gradient(180deg, #a9ffb0, #3fc45a 35%, #136a2a 100%); }

.h-notice { position: relative; width: 790px; height: 44px; display: none; overflow: hidden; }
.h-notice.on { display: block; }
.h-notice .bg { position: absolute; inset: 0; opacity: 0; transition: opacity .35s;
  background: linear-gradient(90deg, transparent, rgba(8,9,14,.82) 16%, rgba(20,14,6,.9) 50%, rgba(8,9,14,.82) 84%, transparent); }
.h-notice .bg::before, .h-notice .bg::after { content: ''; position: absolute; left: 0; right: 0; height: 1px;
  background: linear-gradient(90deg, transparent, var(--nc, #c8a45a) 20%, #fff3cf 50%, var(--nc, #c8a45a) 80%, transparent); }
.h-notice .bg::before { top: 0; } .h-notice .bg::after { bottom: 0; }
.h-notice.show .bg { opacity: 1; }
.h-notice .rowx { position: absolute; left: 56px; right: 56px; top: 0; bottom: 0; display: flex; align-items: center; justify-content: center; gap: 10px; opacity: 0; transform: translateY(10px); transition: opacity .3s, transform .3s; }
.h-notice.show .rowx { opacity: 1; transform: none; }
.h-notice .clip { flex: 0 1 auto; min-width: 0; overflow: hidden; }
.h-notice .msg { display: flex; align-items: center; gap: 10px; white-space: nowrap; font-size: 19px; font-weight: 700; letter-spacing: .03em; color: var(--nt, #ffe7a8);
  text-shadow: 0 0 2px #000, 0 1px 2px #000, 0 0 12px var(--ng, rgba(255,190,80,.5)); width: max-content; line-height: 44px; }
.h-notice .tag { flex: none; font-family: 'GameSans', sans-serif; font-size: 12px; font-weight: 700; padding: 1px 8px; border-radius: 2px; color: #1a1206; text-shadow: none;
  background: linear-gradient(180deg, #ffe7a8, #c9953a); box-shadow: 0 0 0 1px #000; letter-spacing: .08em; }
.h-notice.n-boss { --nc: #d9482c; --nt: #ffb9a0; --ng: rgba(255,70,40,.6); } .h-notice.n-boss .tag { background: linear-gradient(180deg, #ff9a7a, #b3260e); color: #fff; text-shadow: 0 1px 1px #000; }
.h-notice.n-drop { --nc: #9a6be0; --nt: #e6cfff; --ng: rgba(170,100,255,.6); } .h-notice.n-drop .tag { background: linear-gradient(180deg, #d9b8ff, #7a3fd0); color: #fff; text-shadow: 0 1px 1px #000; }
.h-notice.n-info { --nc: #7f95b8; --nt: #e3ecff; --ng: rgba(120,160,255,.4); } .h-notice.n-info .tag { background: linear-gradient(180deg, #dfe8ff, #7f95b8); }

/* \uC9C0\uC5ED \uBC30\uB108 */
.h-zoneb { position: absolute; left: 50%; top: 236px; transform: translateX(-50%); text-align: center; opacity: 0; pointer-events: none; width: 1100px; }
.h-zoneb.play { animation: h-zoneb 3.6s cubic-bezier(.2,.7,.2,1) both; }
@keyframes h-zoneb { 0% { opacity: 0; letter-spacing: .5em; filter: blur(6px); } 14% { opacity: 1; filter: none; letter-spacing: .22em; } 78% { opacity: 1; letter-spacing: .26em; } 100% { opacity: 0; letter-spacing: .3em; } }
.h-zoneb .t { font-size: 68px; line-height: 1.15; letter-spacing: inherit; padding-left: .22em; }
.h-zoneb .orn { position: relative; height: 16px; margin: 6px auto 8px; width: 620px;
  background: linear-gradient(90deg, transparent, #c8a45a 30%, #fff3cf 50%, #c8a45a 70%, transparent) center/100% 1px no-repeat; }
.h-zoneb .orn::after { content: ''; position: absolute; left: 50%; top: 50%; width: 10px; height: 10px; margin: -5px; transform: rotate(45deg); background: #ffe7a8; box-shadow: 0 0 0 2px #0b0d12, 0 0 0 3px #c8a45a, 0 0 12px #ffbe50; }
.h-zoneb .s { font-size: 20px; color: #e9e0c4; letter-spacing: .3em; font-weight: 500; }

/* \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 \uC624\uB978\uCABD \uC704: \uBBF8\uB2C8\uB9F5 \xB7 \uBA54\uB274 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.h-mini { position: absolute; right: 16px; top: 12px; width: 236px; }
.h-mini .frame { position: relative; width: 236px; height: 236px; }
.h-mini canvas { position: absolute; left: 8px; top: 8px; width: 220px; height: 220px; border-radius: 50%; background: #10151c; }
.h-mini .shade { position: absolute; left: 8px; top: 8px; width: 220px; height: 220px; border-radius: 50%; box-shadow: inset 0 0 26px rgba(0,0,0,.8), inset 0 0 0 1px #000; }
.h-mini .ring { position: absolute; inset: 0; border-radius: 50%;
  background: conic-gradient(from 200deg, #6b4f1e, #ffe7a8 10%, #a8843c 24%, #4a3512 42%, #f3d58c 58%, #8a6a2e 74%, #ffe7a8 88%, #6b4f1e);
  -webkit-mask: radial-gradient(circle, transparent 0 109.5px, #000 110.5px 117.5px, transparent 118px); mask: radial-gradient(circle, transparent 0 109.5px, #000 110.5px 117.5px, transparent 118px);
  filter: drop-shadow(0 3px 6px rgba(0,0,0,.8)); }
.h-mini .n { position: absolute; left: 50%; top: -5px; margin-left: -12px; width: 24px; height: 24px; border-radius: 50%; font-size: 12px; font-weight: 700; color: #1a1206;
  display: flex; align-items: center; justify-content: center; background: linear-gradient(180deg, #ffe7a8, #b88a3a); box-shadow: 0 0 0 1px #000, 0 2px 4px rgba(0,0,0,.7); }
.h-mini .zone { margin-top: 6px; text-align: center; padding: 5px 8px 6px; border-radius: 3px;
  background: linear-gradient(90deg, transparent, rgba(10,12,19,.88) 18%, rgba(10,12,19,.88) 82%, transparent); position: relative; }
.h-mini .zone::before { content: ''; position: absolute; left: 10%; right: 10%; top: 0; height: 1px; background: linear-gradient(90deg, transparent, var(--gold-line), transparent); }
.h-mini .zname { font-size: 17px; font-weight: 700; color: var(--gold-hi); letter-spacing: .08em; text-shadow: 0 1px 2px #000; }
.h-mini .zsub { font-size: 12px; color: var(--ink-dim); margin-top: 1px; display: flex; justify-content: center; gap: 8px; font-variant-numeric: tabular-nums; }
.h-mini .zsub .sub { color: #9fe0a8; }
.h-mini .zsub .sub.danger { color: #ff8a70; }
.h-menu { position: absolute; right: 266px; top: 14px; display: flex; gap: 3px; }
.h-mbtn { position: relative; width: 46px; height: 60px; padding: 0; border: 0; background: none; cursor: pointer; color: var(--ink-dim); font: inherit; pointer-events: auto; }
.h-mbtn .c { display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; margin: 3px 3px 0; border-radius: 50%;
  background: radial-gradient(circle at 50% 30%, #2c3144, #0c0e15 70%); box-shadow: 0 0 0 1px #000, 0 0 0 2px rgba(200,164,90,.7), 0 0 0 3px #000, 0 3px 8px rgba(0,0,0,.7), inset 0 1px 0 rgba(255,255,255,.14); transition: filter .12s, transform .08s; }
.h-mbtn svg { width: 23px; height: 23px; fill: none; stroke: #f0d594; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; filter: drop-shadow(0 1px 1px #000); }
.h-mbtn .l { display: block; margin-top: 3px; font-size: 11px; text-align: center; color: #d8ceb0; text-shadow: 0 0 2px #000, 0 1px 2px #000; white-space: nowrap; }
.h-mbtn:hover .c { filter: brightness(1.4); } .h-mbtn:active .c { transform: scale(.94); }
.h-gold { position: absolute; right: 269px; top: 82px; display: flex; gap: 8px; }
.h-chip { display: flex; align-items: center; gap: 6px; height: 26px; padding: 0 12px 0 4px; border-radius: 13px; font-size: 13px; font-weight: 700; color: #fff3cf; font-variant-numeric: tabular-nums;
  background: rgba(8,10,16,.78); border: 1px solid rgba(200,164,90,.4); box-shadow: 0 2px 6px rgba(0,0,0,.5); }
.h-chip .h-ico { width: 20px; height: 20px; border-radius: 50%; }

/* \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 \uC67C\uCABD \uAC00\uC6B4\uB370: \uC758\uB8B0 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.h-quest { position: absolute; left: 14px; top: 262px; width: 318px; display: none; }
.h-quest.on { display: block; }
.h-quest .hd { display: flex; align-items: center; gap: 8px; height: 26px; font-size: 14px; font-weight: 700; color: var(--gold-hi); letter-spacing: .2em;
  background: linear-gradient(90deg, rgba(10,12,19,.9), rgba(10,12,19,.0)); border-top: 1px solid var(--gold-line); padding-left: 8px; }
.h-quest .hd::before { content: ''; width: 8px; height: 8px; transform: rotate(45deg); background: var(--gold-hi); box-shadow: 0 0 0 1px #000, 0 0 6px #ffbe50; }
.h-quest .list { padding: 6px 8px 8px 10px; background: linear-gradient(90deg, rgba(8,10,16,.66), rgba(8,10,16,.0)); }
.h-q { margin-bottom: 9px; } .h-q:last-child { margin-bottom: 0; }
.h-q .qt { font-size: 15px; font-weight: 700; color: #ffd97a; text-shadow: 0 0 2px #000, 0 1px 2px #000; display: flex; align-items: center; gap: 6px; }
.h-q .qt em { font-style: normal; font-size: 10.5px; font-weight: 700; padding: 0 5px; border-radius: 2px; color: #1a1206; background: linear-gradient(180deg, #ffe7a8, #c9953a); text-shadow: none; }
.h-q .ql { display: flex; align-items: baseline; gap: 6px; margin-top: 2px; padding-left: 4px; font-size: 13.5px; color: #e6e1d2; text-shadow: 0 0 2px #000, 0 1px 2px #000; }
.h-q .ql::before { content: ''; flex: none; width: 5px; height: 5px; border-radius: 50%; background: #bfb9a6; transform: translateY(-2px); }
.h-q .ql .c { margin-left: auto; font-weight: 700; color: #fff; font-variant-numeric: tabular-nums; padding-right: 26px; }
.h-q .ql.done { color: #8fe89c; } .h-q .ql.done .c { color: #8fe89c; } .h-q .ql.done::before { background: #6fe07f; box-shadow: 0 0 6px #6fe07f; }

/* \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 \uC67C\uCABD \uC544\uB798: \uCC44\uD305 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.h-chat { position: absolute; left: 14px; bottom: 30px; width: 500px; height: 268px; display: flex; flex-direction: column; }
.h-chat .tabs { display: flex; gap: 2px; height: 28px; align-items: flex-end; padding-left: 2px; }
.h-chat .tab { height: 24px; padding: 0 13px; border: 1px solid rgba(200,164,90,.25); border-bottom: 0; border-radius: 3px 3px 0 0; cursor: pointer; pointer-events: auto;
  background: rgba(8,10,16,.6); color: var(--ink-dim); font: inherit; font-size: 13px; }
.h-chat .tab.on { height: 28px; color: var(--gold-hi); font-weight: 700; background: linear-gradient(180deg, rgba(70,52,22,.95), rgba(14,16,24,.9)); border-color: var(--gold-line); }
.h-chat .body { flex: 1; min-height: 0; overflow-y: auto; overflow-x: hidden; padding: 6px 10px; pointer-events: auto; scrollbar-width: none;
  background: linear-gradient(90deg, rgba(8,10,16,.72), rgba(8,10,16,.5) 70%, rgba(8,10,16,.12)); border-top: 1px solid var(--gold-line);
  -webkit-mask-image: linear-gradient(180deg, transparent 0, #000 22px); mask-image: linear-gradient(180deg, transparent 0, #000 22px); }
.h-chat .body::-webkit-scrollbar { display: none; }
.h-ln { font-size: 14px; line-height: 1.5; text-shadow: 0 0 2px #000, 0 1px 2px #000; word-break: break-all; }
.h-ln .tg { margin-right: 4px; opacity: .92; } .h-ln .g { margin-right: 3px; opacity: .85; font-size: 13px; } .h-ln .nm { font-weight: 700; margin-right: 5px; }
.h-ln.ch-world { color: var(--ch-world); } .h-ln.ch-local { color: var(--ch-local); } .h-ln.ch-guild { color: var(--ch-guild); }
.h-ln.ch-party { color: var(--ch-party); } .h-ln.ch-trade { color: var(--ch-trade); } .h-ln.ch-system { color: var(--ch-system); }
.h-chat[data-tab="local"] .h-ln:not(.ch-local):not(.ch-world), .h-chat[data-tab="guild"] .h-ln:not(.ch-guild), .h-chat[data-tab="party"] .h-ln:not(.ch-party),
.h-chat[data-tab="trade"] .h-ln:not(.ch-trade), .h-chat[data-tab="system"] .h-ln:not(.ch-system) { display: none; }
.h-chat .in { display: flex; align-items: center; height: 30px; background: rgba(6,8,12,.82); border: 1px solid rgba(200,164,90,.3); border-top-color: rgba(255,255,255,.06); }
.h-chat .in .chn { flex: none; padding: 0 10px; font-size: 13px; font-weight: 700; color: var(--ch-local); border-right: 1px solid rgba(255,255,255,.08); }
.h-chat .in input { flex: 1; min-width: 0; height: 100%; padding: 0 10px; border: 0; outline: 0; background: none; color: var(--ink); font: inherit; font-size: 14px; user-select: text; }
.h-chat .in input::placeholder { color: var(--ink-faint); }

/* \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 \uC544\uB798: \uACBD\uD5D8\uCE58 \xB7 \uBB3C\uC57D \xB7 \uC790\uB3D9 \uD45C\uC2DC \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.h-exp { position: absolute; left: 0; right: 0; bottom: 0; height: 16px; background: linear-gradient(180deg, #05060a, #12141b); border-top: 1px solid var(--gold-line); overflow: hidden; }
.h-exp > i { position: absolute; left: 0; top: 0; width: 100%; height: 100%; }
.h-exp .fill { transform-origin: 0 50%; transition: transform .5s cubic-bezier(.2,.8,.2,1); background: linear-gradient(180deg, #fff1b8 0, var(--exp-a) 30%, var(--exp-b) 80%, #8a5a10 100%); box-shadow: 0 0 12px rgba(255,200,80,.6); }
.h-exp .ticks { background: repeating-linear-gradient(90deg, transparent 0 calc(10% - 2px), rgba(0,0,0,.7) calc(10% - 2px) calc(10% - 1px), rgba(255,231,168,.35) calc(10% - 1px) 10%); }
.h-exp .txt { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: #fff; letter-spacing: .06em; font-variant-numeric: tabular-nums; }
.h-quick { position: absolute; left: 50%; bottom: 28px; transform: translateX(-50%); display: flex; gap: 10px; padding: 8px 12px; border-radius: 4px;
  background: linear-gradient(180deg, rgba(22,27,40,.9), rgba(10,12,19,.9)); border: 1px solid var(--gold-line); box-shadow: 0 6px 20px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.06); }
.h-quick::before, .h-quick::after { content: ''; position: absolute; top: 50%; width: 9px; height: 9px; margin-top: -5px; transform: rotate(45deg); background: #c8a45a; box-shadow: 0 0 0 1px #000; }
.h-quick::before { left: -5px; } .h-quick::after { right: -5px; }
.h-slot { position: relative; width: 60px; height: 60px; padding: 0; border: 0; border-radius: 4px; cursor: pointer; pointer-events: auto; background: #0a0c12; overflow: visible;
  box-shadow: 0 0 0 1px #000, 0 0 0 2px rgba(200,164,90,.55), inset 0 0 10px rgba(0,0,0,.8); transition: filter .1s, transform .08s; font: inherit; color: inherit; }
.h-slot .h-ico { width: 60px; height: 60px; border-radius: 3px; }
.h-slot:hover { filter: brightness(1.25); } .h-slot:active { transform: scale(.95); }
.h-slot .k { position: absolute; left: 3px; top: 2px; font-size: 11px; font-weight: 700; color: var(--gold-hi); text-shadow: 0 0 2px #000, 0 1px 2px #000, 1px 0 2px #000, -1px 0 2px #000; }
.h-slot .n { position: absolute; right: 4px; bottom: 1px; font-size: 14px; font-weight: 700; color: #fff; font-variant-numeric: tabular-nums; text-shadow: 0 0 2px #000, 0 1px 2px #000, 1px 0 2px #000, -1px 0 2px #000; }
.h-slot.empty .h-ico { filter: grayscale(1) brightness(.6); } .h-slot.empty .n { color: #ff6a5a; }
.h-slot.use { animation: h-use .3s; } @keyframes h-use { 30% { filter: brightness(2.2); transform: scale(.92); } }
.h-slot.ghost { cursor: default; pointer-events: none; opacity: .75; box-shadow: 0 0 0 1px #000, 0 0 0 2px rgba(200,164,90,.28), inset 0 0 14px rgba(0,0,0,.9); background: linear-gradient(135deg, #10131c, #07080c); }
.h-autopill { position: absolute; left: 50%; bottom: 116px; transform: translateX(-50%); height: 30px; padding: 0 20px; display: none; align-items: center; gap: 9px; border-radius: 15px;
  font-size: 15px; font-weight: 700; letter-spacing: .14em; color: #bff5c8; background: linear-gradient(90deg, rgba(6,26,14,.0), rgba(6,26,14,.86) 18%, rgba(6,26,14,.86) 82%, rgba(6,26,14,0)); }
.h-autopill.on { display: flex; }
.h-autopill::before { content: ''; width: 9px; height: 9px; border-radius: 50%; background: #5cff7f; box-shadow: 0 0 10px #5cff7f; animation: h-pulse 1s ease-in-out infinite; }
.h-autopill i { font-style: normal; display: inline-block; width: 1.3em; text-align: left; letter-spacing: .1em; }
@keyframes h-pulse { 50% { opacity: .3; transform: scale(.7); } }

/* \uC54C\uB9BC(\uD1A0\uC2A4\uD2B8) \xB7 \uC790\uB9C9 */
.h-toasts { position: absolute; left: 50%; bottom: 236px; transform: translateX(-50%); display: flex; flex-direction: column-reverse; align-items: center; gap: 6px; width: 800px; }
.h-toast { padding: 6px 30px; font-size: 16px; font-weight: 500; color: #f3ecd8; white-space: nowrap; text-shadow: 0 1px 2px #000;
  background: linear-gradient(90deg, transparent, rgba(8,10,16,.85) 14%, rgba(8,10,16,.85) 86%, transparent); animation: h-toast 2.6s both; }
.h-toast.t-warn, .h-toast.t-error, .h-toast.t-boss { color: #ff9a84; } .h-toast.t-good, .h-toast.t-enhance { color: #ffe08a; } .h-toast.t-drop { color: #d9b8ff; }
@keyframes h-toast { 0% { opacity: 0; transform: translateY(12px); } 10% { opacity: 1; transform: none; } 82% { opacity: 1; } 100% { opacity: 0; transform: translateY(-8px); } }
.h-caption { position: absolute; left: 50%; bottom: 150px; transform: translateX(-50%); display: none; align-items: center; height: 52px; padding: 0 64px; white-space: nowrap;
  font-size: 26px; font-weight: 700; letter-spacing: .08em; color: #fff6dc; text-shadow: 0 2px 3px #000, 0 0 14px rgba(255,190,80,.45);
  background: linear-gradient(90deg, transparent, rgba(6,7,11,.9) 14%, rgba(6,7,11,.9) 86%, transparent); }
.h-caption::before, .h-caption::after { content: ''; position: absolute; left: 8%; right: 8%; height: 1px; background: linear-gradient(90deg, transparent, #c8a45a 25%, #fff3cf 50%, #c8a45a 75%, transparent); }
.h-caption::before { top: 0; } .h-caption::after { bottom: 0; }
.h-caption.on { display: flex; animation: h-capin .4s both; }
@keyframes h-capin { from { opacity: 0; transform: translateX(-50%) translateY(10px); } }

/* \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 \uC624\uB978\uCABD \uC544\uB798: \uC2A4\uD0AC \xB7 \uC790\uB3D9\uC0AC\uB0E5 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.h-skills { position: absolute; right: 0; bottom: 16px; width: 560px; height: 430px; }
.h-skill { position: absolute; padding: 0; border: 0; border-radius: 50%; cursor: pointer; pointer-events: auto; background: #07080c; font: inherit; color: inherit;
  box-shadow: 0 0 0 1px #000, 0 0 0 3px #a8843c, 0 0 0 4px #000, 0 4px 12px rgba(0,0,0,.7); transition: filter .1s, transform .08s; }
.h-skill::before { content: ''; position: absolute; inset: -3px; border-radius: 50%; pointer-events: none; z-index: 3;
  background: conic-gradient(from 220deg, #6b4f1e, #ffe7a8 12%, #a8843c 28%, #4a3512 46%, #f3d58c 62%, #8a6a2e 78%, #ffe7a8 92%, #6b4f1e);
  -webkit-mask: radial-gradient(circle closest-side, transparent calc(100% - 3.5px), #000 calc(100% - 2.5px)); mask: radial-gradient(circle closest-side, transparent calc(100% - 3.5px), #000 calc(100% - 2.5px)); }
.h-skill .h-ico { position: absolute; inset: 0; border-radius: 50%; }
.h-skill .sh { position: absolute; inset: 0; border-radius: 50%; box-shadow: inset 0 0 0 1px rgba(0,0,0,.8), inset 0 -10px 16px rgba(0,0,0,.45), inset 0 8px 10px rgba(255,255,255,.08); }
.h-skill .cd { position: absolute; inset: 0; border-radius: 50%; display: none; background: conic-gradient(transparent calc(var(--p, 0) * 1turn), rgba(5,7,12,.8) 0); }
.h-skill .sec { position: absolute; inset: 0; display: none; align-items: center; justify-content: center; font-size: 24px; font-weight: 700; color: #fff; font-variant-numeric: tabular-nums;
  text-shadow: 0 0 3px #000, 0 1px 2px #000, 1px 0 2px #000, -1px 0 2px #000; z-index: 2; }
.h-skill.cool .cd { display: block; } .h-skill.cool .sec { display: flex; } .h-skill.cool .h-ico { filter: saturate(.5) brightness(.8); }
.h-skill .k { position: absolute; left: 50%; bottom: -9px; transform: translateX(-50%); min-width: 22px; height: 18px; padding: 0 5px; border-radius: 9px; z-index: 4;
  font-size: 11px; font-weight: 700; line-height: 17px; text-align: center; color: #ffe7a8; background: #0b0d12; border: 1px solid #8a6a2e; }
.h-skill .mp { position: absolute; right: -4px; top: -4px; min-width: 22px; height: 16px; padding: 0 4px; border-radius: 8px; z-index: 4; font-size: 10px; font-weight: 700; line-height: 15px;
  color: #cfe8ff; background: #0d2350; border: 1px solid #3f7fd8; text-align: center; }
.h-skill .nm { position: absolute; left: 50%; top: -19px; transform: translateX(-50%); white-space: nowrap; font-size: 11px; color: #e9e0c4; opacity: 0; transition: opacity .12s; pointer-events: none;
  text-shadow: 0 0 2px #000, 0 1px 2px #000; }
.h-skill:hover .nm { opacity: 1; }
.h-skill:hover { filter: brightness(1.2); } .h-skill:active { transform: scale(.93); }
.h-skill.off { cursor: default; } .h-skill.off .h-ico { filter: grayscale(1) brightness(.45); }
.h-skill.act { box-shadow: 0 0 0 1px #000, 0 0 0 3px #ffe7a8, 0 0 0 4px #000, 0 0 22px 4px rgba(255,200,90,.85); }
.h-skill.act::after { content: ''; position: absolute; inset: -8px; border-radius: 50%; border: 2px solid rgba(255,231,168,.8); animation: h-ring .8s ease-out infinite; pointer-events: none; }
@keyframes h-ring { from { transform: scale(.9); opacity: 1; } to { transform: scale(1.25); opacity: 0; } }
.h-skill.ready .sh { animation: h-ready .5s ease-out; }
@keyframes h-ready { 0% { background: rgba(255,255,255,.85); box-shadow: 0 0 26px 8px rgba(255,231,168,.9); } 100% { background: rgba(255,255,255,0); } }
.h-skill.atk .k { display: none; }
.h-skill.atk .lbl { position: absolute; left: 0; right: 0; bottom: 12px; text-align: center; font-size: 13px; font-weight: 700; letter-spacing: .2em; color: #fff3cf; z-index: 2;
  text-shadow: 0 0 3px #000, 0 1px 2px #000, 1px 0 2px #000, -1px 0 2px #000; }
.h-skill.atk { box-shadow: 0 0 0 1px #000, 0 0 0 4px #a8843c, 0 0 0 5px #000, 0 0 0 9px rgba(10,12,19,.7), 0 0 0 10px rgba(200,164,90,.45), 0 6px 18px rgba(0,0,0,.8); }
.h-auto { position: absolute; width: 92px; height: 92px; padding: 0; border: 0; border-radius: 50%; cursor: pointer; pointer-events: auto; font: inherit; color: #b9b29c;
  background: radial-gradient(circle at 50% 28%, #30364a, #0b0d14 72%); box-shadow: 0 0 0 1px #000, 0 0 0 3px #6f5a2e, 0 0 0 4px #000, 0 4px 12px rgba(0,0,0,.7); transition: filter .1s, transform .08s; }
.h-auto:hover { filter: brightness(1.2); } .h-auto:active { transform: scale(.94); }
.h-auto .a { display: block; font-family: 'GameSerif', serif; font-weight: 900; font-size: 22px; letter-spacing: .06em; line-height: 1; margin-top: 4px; }
.h-auto .s { display: block; font-size: 11px; margin-top: 4px; letter-spacing: .06em; }
.h-auto .spin { position: absolute; inset: -7px; border-radius: 50%; display: none; pointer-events: none;
  background: conic-gradient(from 0deg, transparent 0 8%, #5cff7f 22%, #eaffef 27%, transparent 30% 58%, #5cff7f 72%, #eaffef 77%, transparent 80%);
  -webkit-mask: radial-gradient(circle closest-side, transparent calc(100% - 5px), #000 calc(100% - 4px)); mask: radial-gradient(circle closest-side, transparent calc(100% - 5px), #000 calc(100% - 4px));
  animation: h-spin 1.6s linear infinite; filter: drop-shadow(0 0 5px #5cff7f); }
@keyframes h-spin { to { transform: rotate(360deg); } }
.h-auto.on { color: #eaffef; background: radial-gradient(circle at 50% 30%, #2f8a4a, #0a2a16 74%); box-shadow: 0 0 0 1px #000, 0 0 0 3px #3fae5c, 0 0 0 4px #000, 0 0 24px rgba(80,255,130,.5); }
.h-auto.on .a { color: #fff; text-shadow: 0 0 10px #5cff7f, 0 1px 2px #000; }
.h-auto.on .spin { display: block; }

/* \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 \uC624\uB978\uCABD \uAC00\uC6B4\uB370: \uD68D\uB4DD \uBAA9\uB85D \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.h-loot { position: absolute; right: 16px; top: 326px; width: 310px; display: flex; flex-direction: column; gap: 5px; align-items: flex-end; }
.h-lt { display: flex; align-items: center; gap: 9px; height: 40px; padding: 0 14px 0 4px; min-width: 230px; border-radius: 3px 0 0 3px; animation: h-loot 4.2s both;
  background: linear-gradient(270deg, rgba(8,10,16,.0), rgba(8,10,16,.84) 22%, rgba(8,10,16,.84)); border-left: 2px solid var(--rc, var(--common)); }
.h-lt .h-ico { width: 32px; height: 32px; border-radius: 3px; box-shadow: 0 0 0 1px #000, 0 0 0 2px var(--rc, #777), 0 0 10px var(--rg, transparent); flex: none; }
.h-lt .nm { font-size: 15px; font-weight: 700; color: var(--rc, var(--common)); text-shadow: 0 1px 2px #000; white-space: nowrap; }
.h-lt .ct { font-size: 14px; font-weight: 700; color: #fff; margin-left: auto; padding-left: 10px; font-variant-numeric: tabular-nums; }
.h-lt .get { font-size: 11px; color: var(--ink-dim); margin-right: -2px; }
.h-lt.r-rare { --rc: var(--rare); --rg: rgba(74,163,255,.5); } .h-lt.r-epic { --rc: var(--epic); --rg: rgba(179,107,255,.6); } .h-lt.r-legend { --rc: var(--legend); --rg: rgba(255,178,62,.8); }
.h-lt.r-legend { background: linear-gradient(270deg, rgba(60,34,0,0), rgba(60,34,0,.86) 22%, rgba(20,12,4,.9)); }
@keyframes h-loot { 0% { opacity: 0; transform: translateX(60px); } 7% { opacity: 1; transform: none; } 86% { opacity: 1; } 100% { opacity: 0; } }

/* \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 \uB808\uBCA8 \uC5C5 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.h-lvup { position: absolute; left: 50%; top: 250px; width: 1200px; margin-left: -600px; text-align: center; display: none; pointer-events: none; }
.h-lvup.play { display: block; animation: h-lvup 2.5s both; }
@keyframes h-lvup { 0% { opacity: 0; } 8% { opacity: 1; } 82% { opacity: 1; } 100% { opacity: 0; } }
.h-lvup .rays { position: absolute; left: 50%; top: 74px; width: 900px; height: 900px; margin: -450px; border-radius: 50%;
  background: repeating-conic-gradient(rgba(255,214,120,.26) 0 5deg, transparent 5deg 15deg); -webkit-mask: radial-gradient(circle, #000 0, transparent 62%); mask: radial-gradient(circle, #000 0, transparent 62%);
  animation: h-spin 14s linear infinite; }
.h-lvup .glow { position: absolute; left: 50%; top: 74px; width: 1100px; height: 220px; margin: -110px -550px; background: radial-gradient(ellipse, rgba(255,200,90,.5), transparent 66%); }
.h-lvup .big { position: relative; font-size: 128px; line-height: 1; letter-spacing: .08em; animation: h-lvbig 2.5s cubic-bezier(.2,.9,.2,1) both; }
@keyframes h-lvbig { 0% { transform: scale(2.4); filter: brightness(3) blur(6px); } 12% { transform: scale(.96); filter: brightness(1.6); } 18% { transform: scale(1); filter: none; } 100% { transform: scale(1.04); } }
.h-lvup .line { position: relative; width: 760px; height: 14px; margin: 10px auto 10px; background: linear-gradient(90deg, transparent, #c8a45a 25%, #fff3cf 50%, #c8a45a 75%, transparent) center/100% 2px no-repeat; animation: h-lvline 2.5s both; }
.h-lvup .line::after { content: ''; position: absolute; left: 50%; top: 50%; width: 12px; height: 12px; margin: -6px; transform: rotate(45deg); background: #fff3cf; box-shadow: 0 0 0 2px #0b0d12, 0 0 0 3px #c8a45a, 0 0 16px #ffbe50; }
@keyframes h-lvline { 0% { transform: scaleX(0); } 22% { transform: scaleX(1); } }
.h-lvup .sub { position: relative; font-size: 26px; font-weight: 700; color: #fff6dc; letter-spacing: .14em; text-shadow: 0 2px 3px #000, 0 0 14px rgba(255,190,80,.6); }
.h-lvup .sub b { font-family: 'GameSerif', serif; font-size: 34px; color: #ffe08a; margin: 0 4px; }
.h-lvup .sub2 { position: relative; margin-top: 4px; font-size: 16px; color: #e9e0c4; letter-spacing: .1em; text-shadow: 0 1px 2px #000; }

/* \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 \uD53C\uD574 \uC22B\uC790 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.h-dmg { position: absolute; left: 0; top: 0; width: 0; height: 0; will-change: transform; }
.h-dmg > b { position: absolute; left: 0; top: 0; white-space: nowrap; opacity: 0; font-weight: 700; font-size: 28px; line-height: 1; letter-spacing: -.01em; will-change: transform, opacity;
  font-variant-numeric: tabular-nums; -webkit-text-stroke: 4px #1a0d04; paint-order: stroke fill; color: #fff; transform: translate(-50%, -50%); }
.h-dmg.k-deal > b { color: #fff8e6; }
.h-dmg.k-crit > b { font-size: 46px; font-style: italic; -webkit-text-stroke: 5px #3a1200; color: #ffc832; text-shadow: 0 0 18px rgba(255,110,20,.95), 0 0 4px rgba(255,220,120,.6); }
.h-dmg.k-take > b { color: #ff4a3a; -webkit-text-stroke: 4px #2a0200; font-size: 30px; }
.h-dmg.k-heal > b { color: #7dff9a; -webkit-text-stroke: 4px #022a0c; }
.h-dmg.k-miss > b { color: #c9ced8; font-size: 22px; font-style: italic; -webkit-text-stroke: 3px #14161c; }
.h-dmg.k-exp > b { color: #d9b8ff; font-size: 20px; -webkit-text-stroke: 3px #1c0a36; }
.h-dmg.k-gold > b { color: #ffd97a; font-size: 20px; -webkit-text-stroke: 3px #2e1c00; }
.h-dmg.big > b { font-size: 60px; } .h-dmg.big.k-crit > b { font-size: 76px; -webkit-text-stroke: 6px #3a1200; }

/* \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 \uC774\uB984\uD45C \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.h-plate { position: absolute; left: 0; top: 0; width: 0; height: 0; will-change: transform; display: none; }
.h-plate .in { position: absolute; left: 0; bottom: 0; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; white-space: nowrap; }
.h-plate.dim .in { opacity: .45; }
.h-plate .tt { font-size: 12px; color: #cfc6a8; text-shadow: 0 0 2px #000, 0 1px 2px #000, 1px 0 2px #000, -1px 0 2px #000; }
.h-plate .nl { display: flex; align-items: center; gap: 4px; font-size: 14px; font-weight: 700; text-shadow: 0 0 2px #000, 0 1px 2px #000, 1px 0 2px #000, -1px 0 2px #000; }
.h-plate .nl .lv { font-size: 11px; color: #d8b56a; font-weight: 700; }
.h-plate .nl .g { font-weight: 500; font-size: 13px; }
.h-plate .hpb { width: 62px; height: 6px; margin-top: 3px; background: #07080c; box-shadow: 0 0 0 1px #000, 0 0 0 2px rgba(255,255,255,.14); border-radius: 1px; overflow: hidden; }
.h-plate .hpb i { display: block; width: 100%; height: 100%; transform-origin: 0 50%; background: linear-gradient(180deg, #ff8a70, #d62a1e 50%, #8e1010); transition: transform .15s; }
.h-plate.k-player .n { color: #f1f1f1; } .h-plate.k-player .g { color: #9ad0ff; } .h-plate.k-player .hpb i { background: linear-gradient(180deg, #b6f7a8, #3fc45a 50%, #136a2a); }
.h-plate.k-me .n { color: #ffe9a8; font-size: 15px; } .h-plate.k-me .g { color: var(--ch-guild); } .h-plate.k-me .hpb { width: 72px; } .h-plate.k-me .hpb i { background: linear-gradient(180deg, #b6f7a8, #3fc45a 50%, #136a2a); }
.h-plate.k-monster .n { color: #ffb9a8; font-weight: 500; }
.h-plate.k-elite .n { color: #ffb24a; } .h-plate.k-elite .hpb { width: 84px; height: 7px; box-shadow: 0 0 0 1px #000, 0 0 0 2px #b9782c; }
.h-plate.k-elite .n::before { content: '\u25C6 '; font-size: 10px; } .h-plate.k-elite .n::after { content: ' \u25C6'; font-size: 10px; }
.h-plate.k-boss .n { font-family: 'GameSerif', serif; font-weight: 900; font-size: 22px; color: #ff6a4a; letter-spacing: .1em; text-shadow: 0 0 2px #000, 0 1px 2px #000, 1px 0 2px #000, -1px 0 2px #000, 0 0 14px rgba(255,60,30,.8); }
.h-plate.k-boss .tt { font-size: 14px; color: #ffcf9a; letter-spacing: .2em; } .h-plate.k-boss .hpb { width: 150px; height: 8px; box-shadow: 0 0 0 1px #000, 0 0 0 2px #c8a45a; }
.h-plate.k-npc .n { color: #a8ffb4; } .h-plate.k-npc .tt { color: #ffe08a; }
.h-plate .bub { position: relative; max-width: 300px; white-space: normal; margin-bottom: 9px; padding: 6px 12px; border-radius: 8px; font-size: 14px; font-weight: 500; line-height: 1.35; color: #1b1608; display: none; text-align: center;
  background: linear-gradient(180deg, #fffaf0, #eadfc6); box-shadow: 0 0 0 1px #6f5a2e, 0 4px 12px rgba(0,0,0,.6); width: max-content; word-break: keep-all; }
.h-plate .bub::after { content: ''; position: absolute; left: 50%; bottom: -6px; width: 10px; height: 10px; margin-left: -5px; transform: rotate(45deg); background: #eadfc6; box-shadow: 1px 1px 0 #6f5a2e; }
.h-plate .bub.on { display: block; animation: h-pop .18s; }

/* \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 \uC5F0\uCD9C \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.h-vig { position: absolute; inset: 0; pointer-events: none; opacity: 0; transition: opacity .4s; background: radial-gradient(ellipse at center, transparent 52%, rgba(190,0,0,.5) 100%); }
.h-vig.on { opacity: 1; animation: h-vig 1s ease-in-out infinite; }
@keyframes h-vig { 50% { opacity: .45; } }
.h-cine { position: absolute; left: 0; right: 0; height: 118px; background: #000; transition: transform .6s cubic-bezier(.3,.7,.2,1); pointer-events: none; }
.h-cine.t { top: 0; transform: translateY(-100%); } .h-cine.b { bottom: 0; transform: translateY(100%); }
.h-hud.h-cinema .h-cine { transform: none; }
.h-hud.h-cinema .h-caption { bottom: 136px; }
.h-fade { position: absolute; inset: 0; background: #000; opacity: 0; pointer-events: none; }
`;

  // game/src/ui/hud.js
  var SHEETS = {
    skill: { key: "ui/skill_icons.png", cols: 3, rows: 3, full: 0.292, circ: 0.268 },
    item: { key: "ui/item_icons.png", cols: 4, rows: 4, full: 0.214, circ: 0.2 }
  };
  var CREST = { key: "ui/guild_crests.png", cols: 3, cell: 512, sw: 1536, sh: 1024, bw: 397, bh: 485, cx: 256, cy: 247 };
  var CH_LABEL = { world: "\uC6D4\uB4DC", local: "\uC77C\uBC18", guild: "\uBB38\uD30C", party: "\uD30C\uD2F0", trade: "\uAC70\uB798", system: "\uC2DC\uC2A4\uD15C" };
  var TABS = [["all", "\uC804\uCCB4"], ["local", "\uC77C\uBC18"], ["guild", "\uBB38\uD30C"], ["party", "\uD30C\uD2F0"], ["trade", "\uAC70\uB798"], ["system", "\uC2DC\uC2A4\uD15C"]];
  var TAB_ALIAS = {
    all: "all",
    "\uC804\uCCB4": "all",
    world: "local",
    "\uC6D4\uB4DC": "local",
    local: "local",
    "\uC77C\uBC18": "local",
    guild: "guild",
    "\uBB38\uD30C": "guild",
    party: "party",
    "\uD30C\uD2F0": "party",
    trade: "trade",
    "\uAC70\uB798": "trade",
    system: "system",
    "\uC2DC\uC2A4\uD15C": "system"
  };
  var KIND_LABEL = { monster: "\uC77C\uBC18", elite: "\uC815\uC608", boss: "\uBCF4\uC2A4", player: "\uD50C\uB808\uC774\uC5B4", npc: "NPC" };
  var NOTICE_TAG = { enhance: "\uAC15\uD654", boss: "\uB808\uC774\uB4DC", drop: "\uD68D\uB4DD", info: "\uC548\uB0B4" };
  var MENU = [
    ["character", "\uCE90\uB9AD\uD130", '<circle cx="12" cy="8" r="3.6"/><path d="M4.8 20.5c.7-4.2 3.5-6.3 7.2-6.3s6.5 2.1 7.2 6.3"/>'],
    ["inventory", "\uAC00\uBC29", '<path d="M5.5 9h13l1.3 9.6a2 2 0 0 1-2 2.4H6.2a2 2 0 0 1-2-2.4z"/><path d="M9 9V7.2a3 3 0 0 1 6 0V9"/><path d="M9.5 13.5h5"/>'],
    ["enhance", "\uAC15\uD654", '<path d="M12 2.8l2.2 3.4v8.3H9.8V6.2z"/><path d="M7.5 14.5h9"/><path d="M12 14.5v6.2"/><path d="M18.6 3.4v4M16.6 5.4h4"/>'],
    ["skills", "\uC2A4\uD0AC", '<path d="M12 3l2.6 5.7 6.1.7-4.5 4.2 1.2 6.1-5.4-3.1-5.4 3.1 1.2-6.1L3.3 9.4l6.1-.7z"/>'],
    ["guild", "\uBB38\uD30C", '<path d="M6 21V3.5"/><path d="M6 4.5h12l-2.8 3.8L18 12H6"/>'],
    ["settings", "\uC124\uC815", '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v3M12 18.2v3M2.8 12h3M18.2 12h3M5.5 5.5l2.1 2.1M16.4 16.4l2.1 2.1M5.5 18.5l2.1-2.1M16.4 7.6l2.1-2.1"/>']
  ];
  var BOSS_COL = [
    "linear-gradient(180deg,#ff8a6a 0%,#e8341e 34%,#a3140c 66%,#5e0808 100%)",
    "linear-gradient(180deg,#ffc27a 0%,#ee7a1a 34%,#a84a06 66%,#5a2602 100%)",
    "linear-gradient(180deg,#ecaaff 0%,#a448dc 34%,#6a1ea0 66%,#360a5a 100%)",
    "linear-gradient(180deg,#9ad6ff 0%,#3a8cec 34%,#1a52b0 66%,#0a2a66 100%)"
  ];
  var T0 = "translate(-50%,-50%) ";
  var DMG_KF = {
    deal: [
      { opacity: 0, transform: T0 + "translateY(8px) scale(.5)" },
      { opacity: 1, transform: T0 + "translateY(-20px) scale(1.3)", offset: 0.14 },
      { opacity: 1, transform: T0 + "translateY(-32px) scale(1)", offset: 0.3 },
      { opacity: 1, transform: T0 + "translateY(-52px) scale(1)", offset: 0.72 },
      { opacity: 0, transform: T0 + "translateY(-76px) scale(.9)" }
    ],
    crit: [
      { opacity: 0, transform: T0 + "translateY(0) scale(2.6) rotate(-6deg)" },
      { opacity: 1, transform: T0 + "translateY(-26px) scale(.92) rotate(-6deg)", offset: 0.14 },
      { opacity: 1, transform: T0 + "translateY(-32px) scale(1.12) rotate(-6deg)", offset: 0.24 },
      { opacity: 1, transform: T0 + "translateY(-48px) scale(1) rotate(-6deg)", offset: 0.74 },
      { opacity: 0, transform: T0 + "translateY(-84px) scale(1.1) rotate(-6deg)" }
    ],
    take: [
      { opacity: 0, transform: T0 + "translate(0,0) scale(1.6)" },
      { opacity: 1, transform: T0 + "translate(-14px,-22px) scale(1)", offset: 0.16 },
      { opacity: 1, transform: T0 + "translate(-30px,-26px) scale(1)", offset: 0.5 },
      { opacity: 0, transform: T0 + "translate(-46px,6px) scale(.85)" }
    ],
    rise: [
      { opacity: 0, transform: T0 + "translateY(6px) scale(.8)" },
      { opacity: 1, transform: T0 + "translateY(-14px) scale(1)", offset: 0.15 },
      { opacity: 1, transform: T0 + "translateY(-44px) scale(1)", offset: 0.75 },
      { opacity: 0, transform: T0 + "translateY(-64px) scale(1)" }
    ]
  };
  var DMG_OPT = {
    deal: { duration: 950, easing: "cubic-bezier(.2,.8,.3,1)", fill: "both" },
    crit: { duration: 1200, easing: "cubic-bezier(.2,.8,.3,1)", fill: "both" },
    take: { duration: 900, easing: "ease-out", fill: "both" },
    rise: { duration: 1300, easing: "ease-out", fill: "both" }
  };
  var BOSS_HIT_KF = [{ filter: "brightness(1)", transform: "translateX(0)" }, { filter: "brightness(1.4)", transform: "translateX(-2px)" }, { filter: "brightness(1.15)", transform: "translateX(2px)" }, { filter: "brightness(1)", transform: "translateX(0)" }];
  var num = (v) => Math.round(v).toLocaleString("ko-KR");
  var clamp01 = (v) => v < 0 ? 0 : v > 1 ? 1 : v;
  function h(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function restart(el, cls) {
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
  }
  function create(ctx) {
    const root = ctx.root;
    const img = ctx.img || ((k) => k);
    const emit = ctx.emit || (() => {
    });
    const doc = root.ownerDocument;
    if (!doc.getElementById("hud-css")) {
      const st2 = doc.createElement("style");
      st2.id = "hud-css";
      st2.textContent = hud_default;
      doc.head.appendChild(st2);
    }
    function resolveUrl(v) {
      return /^(blob:|data:|https?:|file:|\.{1,2}\/)/.test(v) ? v : img(v);
    }
    function setIcon(el2, icon, defSheet, size, round) {
      let sheet = defSheet, i = 0, url = null;
      if (typeof icon === "number") i = icon;
      else if (typeof icon === "string") {
        const m = /^(skill|item):(\d+)$/.exec(icon);
        if (m) {
          sheet = m[1];
          i = +m[2];
        } else if (/^\d+$/.test(icon)) i = +icon;
        else url = resolveUrl(icon);
      } else if (icon && typeof icon === "object") {
        sheet = icon.sheet || defSheet;
        i = icon.i | 0;
      }
      const s = el2.style;
      if (url) {
        s.backgroundImage = 'url("' + url + '")';
        s.backgroundSize = "cover";
        s.backgroundPosition = "center";
        return;
      }
      const sh = SHEETS[sheet] || SHEETS[defSheet];
      const bs = size / (round ? sh.circ : sh.full);
      const col = i % sh.cols, row = i / sh.cols | 0;
      s.backgroundImage = 'url("' + img(sh.key) + '")';
      s.backgroundSize = bs + "px " + bs + "px";
      s.backgroundPosition = size / 2 - (col + 0.5) / sh.cols * bs + "px " + (size / 2 - (row + 0.5) / sh.rows * bs) + "px";
    }
    function setCrest(el2, idx, w) {
      const s = el2.style;
      if (idx == null || idx < 0) {
        s.display = "none";
        return;
      }
      const hgt = w * CREST.bh / CREST.bw, k = w / CREST.bw, col = idx % CREST.cols, row = idx / CREST.cols | 0;
      s.display = "";
      s.width = w + "px";
      s.height = hgt + "px";
      s.backgroundImage = 'url("' + img(CREST.key) + '")';
      s.backgroundSize = CREST.sw * k + "px " + CREST.sh * k + "px";
      s.backgroundPosition = w / 2 - (col * CREST.cell + CREST.cx) * k + "px " + (hgt / 2 - (row * CREST.cell + CREST.cy) * k) + "px";
    }
    function setBar(fill, lag, v, snap) {
      const t = "scaleX(" + clamp01(v).toFixed(4) + ")";
      if (snap) {
        fill.style.transition = "none";
        if (lag) lag.style.transition = "none";
      }
      fill.style.transform = t;
      if (lag) lag.style.transform = t;
      if (snap) {
        void fill.offsetWidth;
        fill.style.transition = "";
        if (lag) lag.style.transition = "";
      }
    }
    const el = h("div", "h-hud");
    el.innerHTML = `
<div class="h-layer h-plates"></div>
<div class="h-layer h-dmgs"></div>
<div class="h-vig"></div>
<div class="h-layer h-main">
  <div class="h-player">
    <div class="plate"></div>
    <div class="h-pbody">
      <div class="h-nameline"><i class="h-crest"></i><span class="guild"></span><span class="name h-serif"></span><span class="power">\uC804\uD22C\uB825<b>0</b></span></div>
      <div class="h-bar hp"><i class="lag"></i><i class="fill"></i><i class="ticks"></i><i class="gloss"></i><span class="h-bartag">HP</span><span class="txt"></span></div>
      <div class="h-bar mp"><i class="lag"></i><i class="fill"></i><i class="gloss"></i><span class="h-bartag">MP</span><span class="txt"></span></div>
    </div>
    <div class="h-portrait"><div class="face"></div><div class="ring2"></div><div class="ring"></div><div class="lv">Lv<b>1</b></div></div>
    <div class="h-buffs"></div>
  </div>
  <div class="h-topc">
    <div class="h-boss">
      <div class="head"><span class="title h-serif"></span><span class="name h-serif"></span><span class="phase"></span></div>
      <div class="row"><i class="cap l"></i><i class="cap r"></i>
        <div class="h-bar"><i class="under"></i><i class="lag"></i><i class="fill"></i><i class="ticks"></i><i class="gloss"></i><span class="txt"></span></div>
        <span class="mult"><small>x</small><b>1</b></span></div>
    </div>
    <div class="h-target">
      <div class="bg"></div><div class="pic"></div>
      <div class="info"><div class="line"><span class="lv"></span><span class="name"></span><span class="kind"></span><span class="pct"></span></div>
        <div class="h-bar hp"><i class="lag"></i><i class="fill"></i><i class="ticks"></i><i class="gloss"></i><span class="txt"></span></div></div>
    </div>
    <div class="h-notice"><div class="bg"></div><div class="rowx"><span class="tag"></span><div class="clip"><div class="msg h-serif"><span class="tx"></span></div></div></div></div>
  </div>
  <div class="h-zoneb"><div class="t gold-text"></div><div class="orn"></div><div class="s h-serif"></div></div>
  <div class="h-menu"></div>
  <div class="h-gold"><div class="h-chip"><i class="h-ico"></i><span class="gv">0</span></div></div>
  <div class="h-mini">
    <div class="frame"><canvas width="220" height="220"></canvas><div class="shade"></div><div class="ring"></div><div class="n">N</div></div>
    <div class="zone"><div class="zname h-serif"></div><div class="zsub"><span class="sub"></span><span class="xy"></span></div></div>
  </div>
  <div class="h-quest"><div class="hd h-serif">\uC758\uB8B0</div><div class="list"></div></div>
  <div class="h-chat" data-tab="all"><div class="tabs"></div><div class="body"></div>
    <div class="in"><span class="chn">\uC77C\uBC18</span><input type="text" maxlength="80" placeholder="Enter \uD0A4\uB97C \uB20C\uB7EC \uB300\uD654\uB97C \uC785\uB825\uD558\uC138\uC694" spellcheck="false" autocomplete="off"></div></div>
  <div class="h-loot"></div>
  <div class="h-autopill">\uC790\uB3D9\uC0AC\uB0E5 \uC911</div>
  <div class="h-quick">
    <button class="h-slot" data-p="hp"><i class="h-ico"></i><span class="k">F1</span><span class="n">0</span></button>
    <button class="h-slot" data-p="mp"><i class="h-ico"></i><span class="k">F2</span><span class="n">0</span></button>
  </div>
  <div class="h-toasts"></div>
  <div class="h-skills"><button class="h-auto"><i class="spin"></i><span class="a">AUTO</span><span class="s">\uC790\uB3D9\uC0AC\uB0E5</span></button></div>
  <div class="h-exp"><i class="fill"></i><i class="ticks"></i><span class="txt h-out"></span></div>
  <div class="h-lvup"><div class="rays"></div><div class="glow"></div><div class="big gold-text">LEVEL UP</div><div class="line"></div>
    <div class="sub h-serif">\uB808\uBCA8<b>1</b>\uB2EC\uC131</div><div class="sub2">\uBAA8\uB4E0 \uB2A5\uB825\uCE58\uAC00 \uC0C1\uC2B9\uD588\uC2B5\uB2C8\uB2E4</div></div>
</div>
<div class="h-cine t"></div><div class="h-cine b"></div>
<div class="h-caption h-serif"></div>
<div class="h-fade"></div>`;
    root.appendChild(el);
    const q = (s, r) => (r || el).querySelector(s);
    const P = { name: "", level: 1, guild: "", crest: null, hp: 1, hpMax: 1, mp: 1, mpMax: 1, exp: 0, gold: 0, power: 0, portrait: "ui/portrait_hero.jpg" };
    const pEl = q(".h-player");
    const pr = {
      face: q(".face", pEl),
      lv: q(".lv b", pEl),
      crest: q(".h-crest", pEl),
      guild: q(".guild", pEl),
      name: q(".name", pEl),
      power: q(".power b", pEl),
      hpF: q(".h-bar.hp .fill", pEl),
      hpL: q(".h-bar.hp .lag", pEl),
      hpT: q(".h-bar.hp .txt", pEl),
      mpF: q(".h-bar.mp .fill", pEl),
      mpL: q(".h-bar.mp .lag", pEl),
      mpT: q(".h-bar.mp .txt", pEl),
      expF: q(".h-exp .fill"),
      expT: q(".h-exp .txt"),
      gold: q(".h-gold .gv"),
      vig: q(".h-vig")
    };
    setIcon(q(".h-gold .h-ico"), 14, "item", 20, true);
    let pInit = false;
    function setPlayer(d) {
      if (!d) return;
      const has = (k) => d[k] !== void 0 && (!pInit || d[k] !== P[k]);
      const cName = has("name"), cLv = has("level"), cGuild = has("guild"), cCrest = has("crest"), cHp = has("hp") || has("hpMax"), cMp = has("mp") || has("mpMax"), cExp = has("exp"), cGold = has("gold"), cPow = has("power"), cPor = has("portrait");
      for (const k in d) if (d[k] !== void 0) P[k] = d[k];
      const first = !pInit;
      pInit = true;
      if (cName || first) pr.name.textContent = P.name;
      if (cLv || first) pr.lv.textContent = P.level;
      if (cGuild || first) pr.guild.textContent = P.guild ? "[" + P.guild + "]" : "";
      if (cCrest || first) setCrest(pr.crest, P.guild || P.crest != null ? P.crest : null, 20);
      if (cPor || first) pr.face.style.backgroundImage = P.portrait ? 'url("' + resolveUrl(P.portrait) + '")' : "";
      if (cHp || first) {
        const v = P.hpMax > 0 ? P.hp / P.hpMax : 0;
        setBar(pr.hpF, pr.hpL, v, first);
        pr.hpT.textContent = num(Math.max(0, P.hp)) + " / " + num(P.hpMax);
        pr.vig.classList.toggle("on", v > 0 && v < 0.25);
      }
      if (cMp || first) {
        setBar(pr.mpF, pr.mpL, P.mpMax > 0 ? P.mp / P.mpMax : 0, first);
        pr.mpT.textContent = num(Math.max(0, P.mp)) + " / " + num(P.mpMax);
      }
      if (cExp || cLv || first) {
        const e = clamp01(P.exp);
        pr.expF.style.transform = "scaleX(" + e.toFixed(4) + ")";
        pr.expT.textContent = "Lv." + P.level + "   \uACBD\uD5D8\uCE58 " + (e * 100).toFixed(2) + "%";
      }
      if (cGold || first) pr.gold.textContent = num(P.gold);
      if (cPow || first) pr.power.textContent = num(P.power);
    }
    const buffBox = q(".h-buffs");
    const buffs = /* @__PURE__ */ new Map();
    function fmtRemain(s) {
      return s >= 3600 ? Math.ceil(s / 3600) + "\uC2DC\uAC04" : s >= 60 ? Math.ceil(s / 60) + "\uBD84" : Math.max(0, Math.ceil(s)) + "\uCD08";
    }
    function setBuffs(list) {
      list = list || [];
      for (const b of buffs.values()) b.seen = false;
      for (let i = 0; i < list.length; i++) {
        const d = list[i];
        let b = buffs.get(d.id);
        if (!b) {
          const e = h("div", "h-buff");
          const ic = h("div", "ic");
          const pic = h("i", "h-ico");
          const cd = h("i", "cd");
          const t = h("div", "t h-out");
          ic.append(pic, cd);
          e.append(ic, t);
          buffBox.appendChild(e);
          b = { e, pic, cd, t, icon: void 0, txt: "", p: -1, warn: false, name: "" };
          buffs.set(d.id, b);
        }
        b.seen = true;
        if (b.icon !== d.icon) {
          b.icon = d.icon;
          setIcon(b.pic, d.icon, "skill", 38, false);
        }
        if (b.name !== d.name) {
          b.name = d.name;
          b.e.title = d.name || "";
        }
        const inf = d.remain == null || d.remain === Infinity;
        const txt = inf ? "" : fmtRemain(d.remain);
        if (txt !== b.txt) {
          b.txt = txt;
          b.t.textContent = txt;
        }
        const p = inf || !d.total ? 0 : Math.round(clamp01(1 - d.remain / d.total) * 100) / 100;
        if (p !== b.p) {
          b.p = p;
          b.cd.style.setProperty("--p", p);
        }
        const warn = !inf && d.remain <= 5;
        if (warn !== b.warn) {
          b.warn = warn;
          b.e.classList.toggle("warn", warn);
        }
        if (buffBox.children[i] !== b.e) buffBox.insertBefore(b.e, buffBox.children[i] || null);
      }
      for (const [id, b] of buffs) if (!b.seen) {
        b.e.remove();
        buffs.delete(id);
      }
    }
    const tEl = q(".h-target");
    const tr = { pic: q(".pic", tEl), lv: q(".lv", tEl), name: q(".name", tEl), kind: q(".kind", tEl), pct: q(".pct", tEl), f: q(".fill", tEl), l: q(".lag", tEl), t: q(".txt", tEl) };
    const T = { on: false, name: null, level: null, kind: null, portrait: null, hp: -1, hpMax: -1 };
    function setTarget(d) {
      if (!d) {
        if (T.on) {
          T.on = false;
          T.name = null;
          tEl.classList.remove("on");
        }
        return;
      }
      const kind = d.kind || "monster";
      const fresh = !T.on || T.name !== d.name || T.kind !== kind;
      if (fresh) {
        T.on = true;
        T.name = d.name;
        T.kind = kind;
        T.level = null;
        T.portrait = void 0;
        T.hp = -1;
        tEl.className = "h-target k-" + kind;
        void tEl.offsetWidth;
        tEl.classList.add("on");
        tr.name.textContent = d.name || "";
        tr.kind.textContent = KIND_LABEL[kind] || kind;
      }
      if (T.level !== d.level) {
        T.level = d.level;
        tr.lv.textContent = d.level != null ? "Lv." + d.level : "";
      }
      if (T.portrait !== d.portrait) {
        T.portrait = d.portrait;
        tr.pic.style.backgroundImage = d.portrait ? 'url("' + resolveUrl(d.portrait) + '")' : "";
        tr.pic.style.display = d.portrait ? "" : "none";
      }
      if (T.hp !== d.hp || T.hpMax !== d.hpMax) {
        T.hp = d.hp;
        T.hpMax = d.hpMax;
        const v = d.hpMax > 0 ? d.hp / d.hpMax : 0;
        setBar(tr.f, tr.l, v, fresh);
        tr.t.textContent = num(Math.max(0, d.hp)) + " / " + num(d.hpMax);
        tr.pct.textContent = (clamp01(v) * 100).toFixed(1) + "%";
      }
    }
    const bEl = q(".h-boss");
    const bBar = q(".h-bar", bEl);
    const br = { title: q(".title", bEl), name: q(".name", bEl), phase: q(".phase", bEl), under: q(".under", bEl), f: q(".fill", bEl), l: q(".lag", bEl), t: q(".txt", bEl), mult: q(".mult b", bEl), multBox: q(".mult", bEl) };
    let bHitAt = 0;
    const B = { on: false, name: null, title: null, hp: -1, hpMax: -1, phase: -1, phases: -1, line: -1 };
    function setBoss(d) {
      if (!d) {
        if (B.on) {
          B.on = false;
          B.name = null;
          bEl.classList.remove("on");
        }
        return;
      }
      const fresh = !B.on || B.name !== d.name;
      if (fresh) {
        B.on = true;
        B.name = d.name;
        B.title = null;
        B.hp = -1;
        B.phase = -1;
        B.line = -1;
        br.name.textContent = d.name || "";
        restart(bEl, "on");
      }
      if (B.title !== d.title) {
        B.title = d.title;
        br.title.textContent = d.title || "";
      }
      const phases = d.phases || 0, phase = d.phase || 0;
      if (B.phase !== phase || B.phases !== phases) {
        B.phase = phase;
        B.phases = phases;
        while (br.phase.children.length < phases) br.phase.appendChild(h("i"));
        while (br.phase.children.length > phases) br.phase.lastChild.remove();
        for (let i = 0; i < phases; i++) br.phase.children[i].className = i < phase ? "on" : "";
      }
      if (B.hp !== d.hp || B.hpMax !== d.hpMax) {
        const lines = Math.max(1, d.lines || 10);
        const v = d.hpMax > 0 ? clamp01(d.hp / d.hpMax) : 0, lv = v * lines;
        const cur = Math.max(1, Math.ceil(lv - 1e-9)), part = v <= 0 ? 0 : lv - (cur - 1);
        const lineChanged = cur !== B.line;
        if (lineChanged) {
          B.line = cur;
          br.f.style.background = BOSS_COL[(cur - 1) % BOSS_COL.length];
          br.under.style.background = cur > 1 ? BOSS_COL[(cur - 2) % BOSS_COL.length] : "none";
          br.mult.textContent = cur;
          br.multBox.style.display = lines > 1 ? "" : "none";
        }
        setBar(br.f, br.l, part, fresh || lineChanged);
        br.t.textContent = num(Math.max(0, d.hp)) + " / " + num(d.hpMax) + "  (" + (v * 100).toFixed(1) + "%)";
        if (!fresh && d.hp < B.hp && bBar.animate) {
          const now = performance.now();
          if (now - bHitAt > 450) {
            bHitAt = now;
            bBar.animate(BOSS_HIT_KF, 160);
          }
        }
        B.hp = d.hp;
        B.hpMax = d.hpMax;
      }
    }
    const skBox = q(".h-skills");
    const autoBtn = q(".h-auto");
    const ATK = { x: 442, y: 300, size: 132 };
    const skills = /* @__PURE__ */ new Map();
    let atk = null;
    function place(b, cx, cy, size) {
      const s = b.style;
      s.width = s.height = size + "px";
      s.left = cx - size / 2 + "px";
      s.top = cy - size / 2 + "px";
    }
    place(autoBtn, ATK.x - 312, ATK.y + 70, 92);
    function makeSkill(d, size, isAtk) {
      const b = h("button", "h-skill" + (isAtk ? " atk" : ""));
      b.type = "button";
      const pic = h("i", "h-ico"), sh = h("i", "sh"), cd = h("i", "cd"), sec = h("span", "sec"), k = h("span", "k"), nm = h("span", "nm");
      b.append(pic, cd, sh, sec, k, nm);
      let mp = null;
      if (!isAtk && d.mp) {
        mp = h("span", "mp", d.mp);
        b.appendChild(mp);
      }
      if (isAtk) b.appendChild(h("span", "lbl", "\uACF5\uACA9"));
      setIcon(pic, d.icon != null ? d.icon : 0, "skill", size, true);
      k.textContent = d.key || "";
      if (!d.key) k.style.display = "none";
      nm.textContent = d.name || "";
      const s = { id: d.id, b, cd, sec, cdMax: d.cd || 0, cdLeft: 0, p: -1, secTxt: "", cool: false, enabled: true, active: false, isAtk };
      b.addEventListener("click", () => {
        if (!s.enabled) return;
        if (isAtk) emit("attack");
        else emit("skill", s.id);
      });
      skBox.appendChild(b);
      return s;
    }
    function applySkill(s, d) {
      if (d.cd !== void 0) s.cdMax = d.cd || 0;
      if (d.cdLeft !== void 0) {
        const left = Math.max(0, d.cdLeft || 0), cool = left > 1e-4;
        if (cool !== s.cool) {
          s.cool = cool;
          s.b.classList.toggle("cool", cool);
          if (!cool && s.cdLeft > 0) restart(s.b, "ready");
        }
        s.cdLeft = left;
        if (cool) {
          const p = s.cdMax > 0 ? Math.round(clamp01(1 - left / s.cdMax) * 250) / 250 : 0;
          if (p !== s.p) {
            s.p = p;
            s.cd.style.setProperty("--p", p);
          }
          const txt = left >= 3 ? "" + Math.ceil(left) : left.toFixed(1);
          if (txt !== s.secTxt) {
            s.secTxt = txt;
            s.sec.textContent = txt;
          }
        }
      }
      if (d.enabled !== void 0) {
        const en = d.enabled !== false;
        if (en !== s.enabled) {
          s.enabled = en;
          s.b.classList.toggle("off", !en);
        }
      }
      if (d.active !== void 0) {
        const a = !!d.active;
        if (a !== s.active) {
          s.active = a;
          s.b.classList.toggle("act", a);
        }
      }
    }
    function setSkills(list) {
      for (const s of skills.values()) s.b.remove();
      skills.clear();
      if (atk) {
        atk.b.remove();
        atk = null;
      }
      list = list || [];
      let basic = null;
      const rest = [];
      for (const d of list) {
        if (!basic && (d.basic || d.id === "attack" || d.id === "basic")) basic = d;
        else rest.push(d);
      }
      atk = makeSkill(basic || { id: "attack", name: "\uAE30\uBCF8 \uACF5\uACA9", icon: 0 }, ATK.size, true);
      place(atk.b, ATK.x, ATK.y, ATK.size);
      if (basic) {
        skills.set(basic.id, atk);
        applySkill(atk, basic);
      }
      const nIn = Math.min(5, rest.length);
      for (let i = 0; i < rest.length; i++) {
        const d = rest[i];
        let a, r, size;
        if (i < 5) {
          r = 192;
          size = 76;
          a = nIn === 1 ? 225 : 169 + 112 / (nIn - 1) * i;
        } else {
          const j = i - 5, n = rest.length - 5;
          r = 292;
          size = 62;
          a = n === 1 ? 225 : 207 + 46 / (n - 1) * j;
        }
        const rad = a * Math.PI / 180;
        const s = makeSkill(d, size, false);
        place(s.b, ATK.x + Math.cos(rad) * r, ATK.y + Math.sin(rad) * r, size);
        skills.set(d.id, s);
        applySkill(s, d);
      }
    }
    function updateSkill(id, d) {
      const s = skills.get(id);
      if (s && d) applySkill(s, d);
    }
    setSkills([]);
    let autoOn = false;
    const autoPill = q(".h-autopill");
    const autoSub = q(".s", autoBtn);
    function setAuto(on) {
      on = !!on;
      if (on === autoOn) return;
      autoOn = on;
      autoBtn.classList.toggle("on", on);
      autoPill.classList.toggle("on", on);
      autoSub.textContent = on ? "\uC0AC\uB0E5 \uC911" : "\uC790\uB3D9\uC0AC\uB0E5";
    }
    autoBtn.addEventListener("click", () => emit("toggleAuto"));
    const pot = {};
    for (const b of el.querySelectorAll(".h-slot[data-p]")) {
      const kind = b.dataset.p;
      pot[kind] = { b, n: q(".n", b), k: q(".k", b), v: -1 };
      setIcon(q(".h-ico", b), kind === "hp" ? 9 : 10, "item", 60, false);
      b.addEventListener("click", () => {
        emit("potion", kind);
        restart(b, "use");
      });
    }
    function setPotions(d) {
      if (!d) return;
      for (const k of ["hp", "mp"]) {
        if (d[k] !== void 0 && d[k] !== pot[k].v) {
          pot[k].v = d[k];
          pot[k].n.textContent = num(d[k]);
          pot[k].b.classList.toggle("empty", !(d[k] > 0));
        }
        if (d.keys && d.keys[k]) pot[k].k.textContent = d.keys[k];
      }
    }
    const qEl = q(".h-quest"), qList = q(".list", qEl);
    function setQuest(list) {
      list = list || [];
      qEl.classList.toggle("on", list.length > 0);
      qList.textContent = "";
      for (const d of list) {
        const e = h("div", "h-q");
        const t = h("div", "qt h-serif");
        const allDone = d.lines && d.lines.length && d.lines.every((l) => l.done || l.max != null && l.cur >= l.max);
        if (d.tag || allDone) t.appendChild(h("em", null, allDone ? "\uC644\uB8CC" : d.tag));
        t.appendChild(doc.createTextNode(d.title || ""));
        e.appendChild(t);
        for (const l of d.lines || []) {
          const done = l.done || l.max != null && l.cur >= l.max;
          const r = h("div", "ql" + (done ? " done" : ""));
          r.appendChild(h("span", null, l.text || ""));
          if (l.max != null) r.appendChild(h("span", "c", (l.cur || 0) + " / " + l.max));
          else if (done) r.appendChild(h("span", "c", "\uC644\uB8CC"));
          e.appendChild(r);
        }
        qList.appendChild(e);
      }
    }
    const zName = q(".zname"), zSub = q(".zsub .sub"), zXY = q(".zsub .xy"), zb = q(".h-zoneb");
    let zbTimer = 0;
    function setZone(name, sub) {
      zName.textContent = name || "";
      zSub.textContent = sub || "";
      zSub.classList.toggle("danger", /위험|분쟁|보스|전투|레이드|PK/.test(sub || ""));
    }
    function zoneBanner(title, subtitle) {
      q(".t", zb).textContent = title || "";
      q(".s", zb).textContent = subtitle || "";
      q(".s", zb).style.display = subtitle ? "" : "none";
      restart(zb, "play");
      clearTimeout(zbTimer);
      zbTimer = setTimeout(() => zb.classList.remove("play"), 3700);
    }
    const canvas = q(".h-mini canvas");
    let cx_ = null, cy_ = null;
    function setCoords(x, y) {
      x = Math.round(x);
      y = Math.round(y);
      if (x === cx_ && y === cy_) return;
      cx_ = x;
      cy_ = y;
      zXY.textContent = x + ", " + y;
    }
    const minimap = { canvas, ctx2d: canvas.getContext("2d"), size: 220, setCoords };
    const menuBox = q(".h-menu");
    for (const [name, label, path] of MENU) {
      const b = h("button", "h-mbtn");
      b.type = "button";
      b.innerHTML = '<span class="c"><svg viewBox="0 0 24 24">' + path + '</svg></span><span class="l">' + label + "</span>";
      b.addEventListener("click", () => emit("menu", name));
      menuBox.appendChild(b);
    }
    const cEl = q(".h-chat"), cBody = q(".body", cEl), cTabs = q(".tabs", cEl), cIn = q("input", cEl), cChn = q(".chn", cEl);
    const CHAT_MAX = 120;
    let chatN = 0, curTab = "all";
    const tabBtns = {};
    for (const [id, label] of TABS) {
      const b = h("button", "tab" + (id === "all" ? " on" : ""), label);
      b.type = "button";
      b.addEventListener("click", () => setTab(id));
      cTabs.appendChild(b);
      tabBtns[id] = b;
    }
    function setTab(name) {
      const id = TAB_ALIAS[name] || "all";
      curTab = id;
      cEl.dataset.tab = id;
      for (const k in tabBtns) tabBtns[k].classList.toggle("on", k === id);
      cChn.textContent = id === "all" || id === "system" ? "\uC77C\uBC18" : CH_LABEL[id];
      cChn.style.color = "var(--ch-" + (id === "all" || id === "system" ? "local" : id) + ")";
      cStick = true;
      cBody.scrollTop = cBody.scrollHeight;
    }
    let cStick = true;
    cBody.addEventListener("wheel", () => requestAnimationFrame(() => {
      cStick = cBody.scrollHeight - cBody.scrollTop - cBody.clientHeight < 30;
    }), { passive: true });
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(() => {
      if (cStick) cBody.scrollTop = cBody.scrollHeight;
    });
    function chatAdd(m) {
      if (!m) return;
      const ch = CH_LABEL[m.channel] ? m.channel : "local";
      let ln;
      if (chatN >= CHAT_MAX) {
        ln = cBody.firstChild;
        ln.textContent = "";
      } else {
        ln = h("div");
        chatN++;
      }
      ln.className = "h-ln ch-" + ch;
      ln.appendChild(h("span", "tg", "[" + CH_LABEL[ch] + "]"));
      if (ch !== "system") {
        if (m.guild) ln.appendChild(h("span", "g", "[" + m.guild + "]"));
        if (m.name) ln.appendChild(h("span", "nm", m.name + ":"));
      }
      ln.appendChild(doc.createTextNode(m.text == null ? "" : String(m.text)));
      cBody.appendChild(ln);
      if (cStick) cBody.scrollTop = cBody.scrollHeight;
    }
    cIn.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Enter") {
        const v = cIn.value.trim();
        cIn.value = "";
        if (v) emit("chat", v);
        cIn.blur();
      } else if (e.key === "Escape") {
        cIn.value = "";
        cIn.blur();
      }
    });
    cIn.addEventListener("keyup", (e) => e.stopPropagation());
    const chat = { add: chatAdd, setTab, getTab: () => curTab, focus: () => cIn.focus(), clear: () => {
      cBody.textContent = "";
      chatN = 0;
    } };
    const nEl = q(".h-notice"), nMsg = q(".msg", nEl), nTag = q(".tag", nEl), nTx = q(".tx", nEl), nClip = q(".clip", nEl);
    const nQueue = [];
    let nBusy = false, nAnim = null;
    function nextNotice() {
      if (nBusy) return;
      if (!nQueue.length) {
        nEl.classList.remove("on");
        return;
      }
      nBusy = true;
      const it = nQueue.shift();
      nEl.className = "h-notice on n-" + it.kind;
      nTag.textContent = NOTICE_TAG[it.kind] || NOTICE_TAG.info;
      nTx.textContent = it.text;
      if (nAnim) {
        nAnim.cancel();
        nAnim = null;
      }
      void nEl.offsetWidth;
      let hold = 3400;
      const over = nMsg.scrollWidth - nClip.clientWidth;
      if (over > 0) {
        hold = 2200 + over * 9;
        if (nMsg.animate) nAnim = nMsg.animate([{ marginLeft: "0px" }, { marginLeft: -over + "px" }], { duration: hold - 1600, delay: 900, fill: "both", easing: "linear" });
      }
      nEl.classList.add("show");
      setTimeout(() => nEl.classList.remove("show"), hold);
      setTimeout(() => {
        nBusy = false;
        nextNotice();
      }, hold + 380);
    }
    function notice(text, kind) {
      nQueue.push({ text: String(text), kind: NOTICE_TAG[kind] ? kind : "info" });
      if (nQueue.length > 12) nQueue.splice(0, nQueue.length - 12);
      nextNotice();
    }
    const toastBox = q(".h-toasts"), lootBox = q(".h-loot");
    function toast(text, kind) {
      const t = h("div", "h-toast" + (kind ? " t-" + kind : ""), text);
      t.addEventListener("animationend", () => t.remove());
      toastBox.insertBefore(t, toastBox.firstChild);
      while (toastBox.children.length > 4) toastBox.lastChild.remove();
    }
    function loot(d) {
      if (!d) return;
      const rar = d.rarity || "common";
      const e = h("div", "h-lt r-" + rar);
      const pic = h("i", "h-ico");
      setIcon(pic, d.icon != null ? d.icon : 14, "item", 32, false);
      e.append(pic, h("span", "nm", d.name || ""));
      e.appendChild(h("span", "ct", d.count != null && d.count !== 1 ? "x" + num(d.count) : "\uD68D\uB4DD"));
      e.addEventListener("animationend", () => e.remove());
      lootBox.appendChild(e);
      while (lootBox.children.length > 6) lootBox.firstChild.remove();
    }
    const lvEl = q(".h-lvup"), lvNum = q(".sub b", lvEl);
    let lvTimer = 0;
    function levelUp(level) {
      lvNum.textContent = level != null ? level : P.level;
      restart(lvEl, "play");
      clearTimeout(lvTimer);
      lvTimer = setTimeout(() => lvEl.classList.remove("play"), 2550);
    }
    const dmgBox = q(".h-dmgs");
    const DMG_N = 96;
    const dmgPool = [];
    let dmgI = 0;
    for (let i = 0; i < DMG_N; i++) {
      const w = h("div", "h-dmg");
      const b = h("b");
      w.appendChild(b);
      dmgBox.appendChild(w);
      dmgPool.push({ w, b, anim: null, cls: "", txt: "" });
    }
    function damage(x, y, value, opt) {
      const kind = opt && opt.kind || "deal", big = !!(opt && opt.big);
      const o = dmgPool[dmgI];
      dmgI = (dmgI + 1) % DMG_N;
      let txt, kf = "deal";
      if (kind === "miss") {
        txt = typeof value === "string" ? value : "\uBE57\uB098\uAC10";
        kf = "rise";
      } else if (kind === "heal") {
        txt = "+" + num(value);
        kf = "rise";
      } else if (kind === "exp") {
        txt = "\uACBD\uD5D8\uCE58 +" + num(value);
        kf = "rise";
      } else if (kind === "gold") {
        txt = "+" + num(value) + " \uAE08\uD654";
        kf = "rise";
      } else if (kind === "take") {
        txt = "-" + num(value);
        kf = "take";
      } else if (kind === "crit") {
        txt = num(value) + "!";
        kf = "crit";
      } else txt = typeof value === "number" ? num(value) : String(value);
      const cls = "h-dmg k-" + kind + (big ? " big" : "");
      if (cls !== o.cls) {
        o.cls = cls;
        o.w.className = cls;
      }
      if (txt !== o.txt) {
        o.txt = txt;
        o.b.textContent = txt;
      }
      const jx = kf === "rise" ? 0 : (Math.random() - 0.5) * 44, jy = kf === "rise" ? 0 : (Math.random() - 0.5) * 22;
      o.w.style.transform = "translate3d(" + Math.round(x + jx) + "px," + Math.round(y + jy) + "px,0)";
      if (o.anim) o.anim.cancel();
      o.anim = o.b.animate ? o.b.animate(DMG_KF[kf], DMG_OPT[kf]) : null;
    }
    const plBox = q(".h-plates");
    const plMap = /* @__PURE__ */ new Map();
    let plStamp = 0;
    function makePlate(id) {
      const e = h("div", "h-plate");
      const inn = h("div", "in");
      const bub = h("div", "bub"), tt = h("div", "tt"), nl = h("div", "nl"), lv = h("span", "lv"), cr = h("i", "h-crest"), g2 = h("span", "g"), n = h("span", "n"), hpb = h("div", "hpb"), hpi = h("i");
      tt.style.display = "none";
      lv.style.display = "none";
      cr.style.display = "none";
      g2.style.display = "none";
      hpb.style.display = "none";
      hpb.appendChild(hpi);
      nl.append(lv, cr, g2, n);
      inn.append(bub, tt, nl, hpb);
      e.appendChild(inn);
      plBox.appendChild(e);
      const p = { id, e, bub, tt, lv, cr, g: g2, n, hpb, hpi, stamp: 0, shown: false, x: NaN, y: NaN, kind: null, name: null, guild: void 0, crest: void 0, level: void 0, title: void 0, hp: void 0, dim: false, bubT: 0 };
      plMap.set(id, p);
      return p;
    }
    function plSweep(p, id) {
      if (p.stamp === plStamp) return;
      if (p.shown) {
        p.shown = false;
        p.e.style.display = "none";
      } else if (plStamp - p.stamp > 900 && !p.bubT) {
        p.e.remove();
        plMap.delete(id);
      }
    }
    function platesSync(list) {
      plStamp++;
      for (let i = 0, n = list ? list.length : 0; i < n; i++) {
        const d = list[i];
        let p = plMap.get(d.id);
        if (!p) p = makePlate(d.id);
        p.stamp = plStamp;
        const kind = d.kind || "monster", dim = !!d.dim;
        if (kind !== p.kind || dim !== p.dim) {
          p.kind = kind;
          p.dim = dim;
          p.e.className = "h-plate k-" + kind + (dim ? " dim" : "");
        }
        if (d.name !== p.name) {
          p.name = d.name;
          p.n.textContent = d.name || "";
        }
        if (d.guild !== p.guild) {
          p.guild = d.guild;
          p.g.textContent = d.guild ? "[" + d.guild + "]" : "";
          p.g.style.display = d.guild ? "" : "none";
        }
        if (d.crest !== p.crest) {
          p.crest = d.crest;
          setCrest(p.cr, d.crest, 15);
        }
        if (d.level !== p.level) {
          p.level = d.level;
          p.lv.textContent = d.level != null ? "Lv." + d.level : "";
          p.lv.style.display = d.level != null ? "" : "none";
        }
        if (d.title !== p.title) {
          p.title = d.title;
          p.tt.textContent = d.title ? kind === "boss" ? d.title : "<" + d.title + ">" : "";
          p.tt.style.display = d.title ? "" : "none";
        }
        const hp = d.hp == null ? null : Math.round(clamp01(d.hp) * 200) / 200;
        if (hp !== p.hp) {
          if (hp == null !== (p.hp == null)) p.hpb.style.display = hp == null ? "none" : "";
          p.hp = hp;
          if (hp != null) p.hpi.style.transform = "scaleX(" + hp + ")";
        }
        const x = Math.round(d.x * 2) / 2, y = Math.round(d.y * 2) / 2;
        if (x !== p.x || y !== p.y) {
          p.x = x;
          p.y = y;
          p.e.style.transform = "translate3d(" + x + "px," + y + "px,0)";
        }
        if (!p.shown) {
          p.shown = true;
          p.e.style.display = "block";
        }
      }
      plMap.forEach(plSweep);
    }
    function bubble(id, text, ms) {
      const p = plMap.get(id) || makePlate(id);
      clearTimeout(p.bubT);
      if (!text) {
        p.bubT = 0;
        p.bub.classList.remove("on");
        return;
      }
      p.bub.textContent = text;
      restart(p.bub, "on");
      p.bubT = setTimeout(() => {
        p.bubT = 0;
        p.bub.classList.remove("on");
      }, ms || 3500);
    }
    const fadeEl = q(".h-fade"), capEl = q(".h-caption");
    function cinema(on) {
      el.classList.toggle("h-cinema", !!on);
    }
    function fade(to, ms, color) {
      ms = ms || 0;
      fadeEl.style.background = color || "#000";
      fadeEl.style.transition = ms > 0 ? "opacity " + ms + "ms linear" : "none";
      void fadeEl.offsetWidth;
      fadeEl.style.opacity = clamp01(to == null ? 0 : to);
      return new Promise((res) => setTimeout(res, ms));
    }
    function showDemoCaption(text) {
      if (!text) {
        capEl.classList.remove("on");
        return;
      }
      capEl.textContent = text;
      restart(capEl, "on");
    }
    function setVisible(on) {
      el.classList.toggle("h-hidden", on === false);
    }
    setPlayer({});
    setZone("", "");
    setPotions({ hp: 0, mp: 0 });
    return {
      el,
      setPlayer,
      setBuffs,
      setTarget,
      setBoss,
      setSkills,
      updateSkill,
      setAuto,
      setPotions,
      setQuest,
      setZone,
      zoneBanner,
      minimap,
      setCoords,
      chat,
      notice,
      toast,
      loot,
      levelUp,
      damage,
      plates: { sync: platesSync },
      bubble,
      cinema,
      fade,
      showDemoCaption,
      setVisible
    };
  }

  // game/dev/ui_hud_test.js
  var st = document.createElement("style");
  st.textContent = theme_default;
  document.head.appendChild(st);
  var events = [];
  var hud = create({
    root: document.getElementById("ui"),
    img: (k) => "../../assets/" + k,
    emit: (name, data) => {
      events.push([name, data]);
      hud.chat.add({ channel: "system", text: "\uC774\uBCA4\uD2B8: " + name + (data !== void 0 ? " \u2192 " + JSON.stringify(data) : "") });
      if (name === "toggleAuto") {
        auto = !auto;
        hud.setAuto(auto);
      }
    }
  });
  var auto = false;
  var wc = document.getElementById("world");
  var g = wc.getContext("2d");
  var seed = 7;
  var rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
  function drawWorld(tone) {
    seed = 7;
    const pal = tone === "fire" ? ["#3a1c14", "#1c0e0c", "#5a2a16", "#120807"] : tone === "town" ? ["#4a4a3c", "#2c2d26", "#5c5a48", "#1b1c18"] : ["#3d5a2a", "#22361c", "#4f7034", "#152212"];
    const gr = g.createLinearGradient(0, 0, 0, 1080);
    gr.addColorStop(0, pal[1]);
    gr.addColorStop(0.45, pal[0]);
    gr.addColorStop(1, pal[1]);
    g.fillStyle = gr;
    g.fillRect(0, 0, 1920, 1080);
    for (let i = 0; i < 900; i++) {
      const x = rnd() * 1920, y = rnd() * 1080, r = 10 + rnd() * 60;
      g.fillStyle = rnd() > 0.5 ? pal[2] : pal[3];
      g.globalAlpha = 0.05 + rnd() * 0.1;
      g.beginPath();
      g.ellipse(x, y, r * 1.6, r * 0.7, 0, 0, 7);
      g.fill();
    }
    g.globalAlpha = 0.35;
    g.strokeStyle = tone === "fire" ? "#7a3a1a" : "#6a5a3a";
    g.lineWidth = 120;
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(-50, 900);
    g.bezierCurveTo(500, 700, 900, 760, 1300, 520);
    g.bezierCurveTo(1500, 400, 1700, 380, 2e3, 300);
    g.stroke();
    g.globalAlpha = 1;
    const v = g.createRadialGradient(960, 560, 300, 960, 560, 1150);
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(1, "rgba(0,0,0,.55)");
    g.fillStyle = v;
    g.fillRect(0, 0, 1920, 1080);
  }
  function figure(x, y, s, col) {
    g.fillStyle = "rgba(0,0,0,.45)";
    g.beginPath();
    g.ellipse(x, y + 100 * s, 44 * s, 14 * s, 0, 0, 7);
    g.fill();
    const gr = g.createLinearGradient(x - 30 * s, 0, x + 30 * s, 0);
    gr.addColorStop(0, col);
    gr.addColorStop(1, "#0c0c10");
    g.fillStyle = gr;
    g.beginPath();
    g.ellipse(x, y + 26 * s, 13 * s, 14 * s, 0, 0, 7);
    g.fill();
    g.beginPath();
    g.moveTo(x - 24 * s, y + 46 * s);
    g.quadraticCurveTo(x, y + 30 * s, x + 24 * s, y + 46 * s);
    g.lineTo(x + 18 * s, y + 100 * s);
    g.lineTo(x - 18 * s, y + 100 * s);
    g.closePath();
    g.fill();
  }
  function drawMini(tone) {
    const c = hud.minimap.ctx2d, S = hud.minimap.size;
    seed = 99;
    c.fillStyle = tone === "fire" ? "#2a1410" : tone === "town" ? "#2c2e2a" : "#1f3320";
    c.fillRect(0, 0, S, S);
    for (let i = 0; i < 26; i++) {
      c.fillStyle = tone === "fire" ? "rgba(120,40,20,.35)" : tone === "town" ? "rgba(90,90,80,.4)" : "rgba(60,110,50,.4)";
      c.beginPath();
      c.ellipse(rnd() * S, rnd() * S, 10 + rnd() * 26, 8 + rnd() * 18, rnd() * 3, 0, 7);
      c.fill();
    }
    c.strokeStyle = "rgba(214,190,140,.75)";
    c.lineWidth = 7;
    c.lineCap = "round";
    c.beginPath();
    c.moveTo(-5, 170);
    c.bezierCurveTo(60, 150, 90, 120, 110, 110);
    c.bezierCurveTo(140, 96, 170, 60, 226, 40);
    c.stroke();
    c.strokeStyle = "rgba(70,130,190,.8)";
    c.lineWidth = 10;
    c.beginPath();
    c.moveTo(30, -5);
    c.bezierCurveTo(50, 50, 20, 90, 44, 230);
    c.stroke();
    if (tone === "town") {
      c.fillStyle = "rgba(160,150,130,.85)";
      for (const [x, y, w, hh] of [[70, 60, 26, 20], [124, 64, 30, 22], [140, 130, 24, 28], [76, 134, 28, 18]]) {
        c.fillRect(x, y, w, hh);
        c.strokeStyle = "#000";
        c.lineWidth = 1;
        c.strokeRect(x + 0.5, y + 0.5, w, hh);
      }
    }
    const dot = (x, y, col, r) => {
      c.fillStyle = "#000";
      c.beginPath();
      c.arc(x, y, (r || 3) + 1.2, 0, 7);
      c.fill();
      c.fillStyle = col;
      c.beginPath();
      c.arc(x, y, r || 3, 0, 7);
      c.fill();
    };
    if (tone !== "town") for (let i = 0; i < 14; i++) dot(20 + rnd() * 180, 20 + rnd() * 180, "#ff4a3a");
    for (let i = 0; i < 6; i++) dot(70 + rnd() * 90, 70 + rnd() * 90, "#6ad0ff");
    dot(150, 84, "#7dff9a", 3.5);
    dot(92, 150, "#ffd24a", 3.5);
    if (tone === "fire") {
      c.strokeStyle = "#ff5a2a";
      c.lineWidth = 2;
      c.beginPath();
      c.arc(138, 78, 13, 0, 7);
      c.stroke();
      dot(138, 78, "#ff2a1a", 6);
    }
    c.fillStyle = "rgba(255,240,190,.16)";
    c.beginPath();
    c.moveTo(110, 110);
    c.arc(110, 110, 62, -2.2, -0.9);
    c.closePath();
    c.fill();
    c.save();
    c.translate(110, 110);
    c.rotate(0.5);
    c.fillStyle = "#fff3cf";
    c.strokeStyle = "#000";
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(0, -11);
    c.lineTo(7, 8);
    c.lineTo(0, 4);
    c.lineTo(-7, 8);
    c.closePath();
    c.fill();
    c.stroke();
    c.restore();
  }
  var SK = [
    { id: "attack", name: "\uBCA0\uAE30", icon: 0, basic: true },
    { id: "combo", name: "\uC5F0\uC18D \uBCA0\uAE30", icon: 1, key: "1", cd: 4, cdLeft: 0, mp: 12 },
    { id: "spin", name: "\uD68C\uC804 \uBCA0\uAE30", icon: 2, key: "2", cd: 8, cdLeft: 0, mp: 24 },
    { id: "leap", name: "\uB3C4\uC57D \uAC15\uD0C0", icon: 3, key: "3", cd: 12, cdLeft: 0, mp: 36 },
    { id: "guard", name: "\uC218\uD638\uC758 \uBC29\uD328", icon: 4, key: "4", cd: 30, cdLeft: 0, mp: 40 },
    { id: "bolt", name: "\uB1CC\uC804\uAC80", icon: 5, key: "5", cd: 20, cdLeft: 0, mp: 55 },
    { id: "roar", name: "\uC0AC\uC790\uD6C4", icon: 6, key: "Q", cd: 60, cdLeft: 0, mp: 30 },
    { id: "recall", name: "\uADC0\uD658", icon: 7, key: "R", cd: 300, cdLeft: 0 }
  ];
  var CHAT0 = [
    ["world", "\uB2EC\uBE5B\uAC80\uAC1D", "\uC0C8\uBCBD\uAC80", "\uBCA8\uB85C\uC2A4 \uC131\uCC44 \uB300\uC7A5\uAC04 \uC55E\uC5D0\uC11C +7 \uC5EC\uBA85\uC758 \uC7A5\uAC80 \uB744\uC6E0\uC2B5\uB2C8\uB2E4 \u314B\u314B\u314B"],
    ["trade", "\uBB3C\uC57D\uB3C4\uB9E4\uC0C1", null, "\uBE68\uAC04 \uBB3C\uC57D 1000\uAC1C \uBB36\uC74C \uD31D\uB2C8\uB2E4 \uADD3 \uC8FC\uC138\uC694"],
    ["local", "\uCD08\uBCF4\uAE30\uC0AC\uC784", null, "\uC18D\uC0AD\uC774\uB294 \uC232 \uAC00\uB294 \uAE38\uC774 \uC5B4\uB514\uC5D0\uC694?"],
    ["guild", "\uC740\uC0AC\uC790\uB300\uC7A5", "\uC740\uC0AC\uC790", "\uC624\uB298 \uBC24 9\uC2DC \uC7BF\uBD88 \uC81C\uB2E8 \uB808\uC774\uB4DC \uAC11\uB2C8\uB2E4. \uBB3C\uC57D \uB109\uB109\uD788 \uCC59\uAE30\uC138\uC694"],
    ["guild", "\uBC29\uD328\uB294\uB0B4\uAC00", "\uC740\uC0AC\uC790", "\uD0F1 \uC81C\uAC00 \uBCFC\uAC8C\uC694 \uD790\uB9CC \uBD99\uC5EC \uC8FC\uC138\uC694"],
    ["party", "\uC232\uC9C0\uAE30", "\uC740\uC0AC\uC790", "\uC624\uD06C \uC8FC\uC220\uC0AC \uBA3C\uC800 \uC810\uC0AC\uC694"],
    ["world", "\uAC15\uD654\uC5D0\uC9C4\uC2EC", "\uCCA0\uAD8C\uB2E8", "\uC8FC\uBB38\uC11C \uC5F4 \uC7A5 \uB2E4 \uB0A0\uB838\uB124\uC694... \uC811\uC2B5\uB2C8\uB2E4 \u3160\u3160"],
    ["system", null, null, "\uACBD\uD5D8\uCE58 1,250 \uACFC \uAE08\uD654 320 \uC744 \uD68D\uB4DD\uD588\uC2B5\uB2C8\uB2E4."],
    ["trade", "\uBC18\uC9C0\uC0BD\uB2C8\uB2E4", "\uD3ED\uD48D", "\uC218\uD638\uC758 \uBC18\uC9C0 +3 \uC774\uC0C1 \uC0BD\uB2C8\uB2E4 \uAE08\uD654 \uB109\uB109\uD788 \uB4DC\uB9BC"],
    ["local", "\uCE74\uC77C", "\uC740\uC0AC\uC790", "\uAC19\uC774 \uC0AC\uB0E5\uD558\uC2E4 \uBD84 \uACC4\uC2E0\uAC00\uC694"],
    ["world", "\uAC00\uC2DC\uC7A5\uBBF8\uC5EC\uC655", "\uAC00\uC2DC\uC7A5\uBBF8", "\uC7BF\uBD88 \uC81C\uB2E8 \uC785\uAD6C \uD1B5\uC81C \uC911\uC785\uB2C8\uB2E4. \uC740\uC0AC\uC790 \uBB38\uD30C\uB294 \uB3CC\uC544\uAC00\uC138\uC694"],
    ["guild", "\uC740\uBE5B\uAC08\uAE30", "\uC740\uC0AC\uC790", "\u314B\u314B\u314B \uB610 \uC800\uB7EC\uB124 \uB2E4\uB4E4 \uBAA8\uC5EC\uC694"]
  ];
  function fillChat(extra) {
    hud.chat.clear();
    for (const [channel, name, guild, text] of CHAT0.concat(extra || [])) hud.chat.add({ channel, name, guild, text });
  }
  function basePlayer() {
    hud.setPlayer({ name: "\uCE74\uC77C", level: 42, guild: "\uC740\uC0AC\uC790", crest: 0, hp: 8420, hpMax: 9600, mp: 1830, mpMax: 2400, exp: 0.4732, gold: 1254300, power: 12480 });
    hud.setSkills(SK);
    hud.setPotions({ hp: 187, mp: 64 });
  }
  var plateList = [];
  var timer = 0;
  var raf = 0;
  var dmgSpots = [];
  var tick = 0;
  function setScene(tone, list) {
    drawWorld(tone);
    drawMini(tone);
    plateList = list;
    for (const p of list) if (p.fig) figure(p.x, p.y + 6, p.fig, p.col || "#555");
    hud.plates.sync(list);
  }
  function reset() {
    clearInterval(timer);
    cancelAnimationFrame(raf);
    document.getElementById("art").style.opacity = 0;
    hud.setVisible(true);
    hud.cinema(false);
    hud.fade(0, 0);
    hud.showDemoCaption(null);
    hud.setTarget(null);
    hud.setBoss(null);
    hud.setBuffs([]);
    hud.setAuto(false);
    auto = false;
    hud.chat.setTab("all");
    for (const p of plateList) hud.bubble(p.id, null);
  }
  function spray() {
    tick++;
    for (const s of dmgSpots) {
      if (tick % s.every) continue;
      const r = Math.random();
      if (s.kind) hud.damage(s.x, s.y, s.v(), { kind: s.kind, big: s.big });
      else if (r < 0.22) hud.damage(s.x, s.y, 2400 + Math.random() * 2600, { kind: "crit", big: s.big });
      else if (r < 0.28) hud.damage(s.x, s.y, 0, { kind: "miss" });
      else hud.damage(s.x, s.y, 700 + Math.random() * 900, { kind: "deal" });
    }
  }
  var STEPS = [
    // 0 ── 마을
    () => {
      basePlayer();
      fillChat();
      hud.setZone("\uBCA8\uB85C\uC2A4 \uC131\uCC44", "\uC548\uC804 \uC9C0\uC5ED");
      hud.setCoords(1204, 388);
      hud.setQuest([{ title: "\uC232\uC758 \uADF8\uB9BC\uC790", tag: "\uC8FC\uC694", lines: [{ text: "\uB300\uC7A5\uC7A5\uC774 \uBE0C\uB86C\uACFC \uB300\uD654", done: true }, { text: "\uB291\uB300\uC778\uAC04 \uCC98\uCE58", cur: 0, max: 20 }] }, { title: "\uAC15\uCCA0\uC740 \uB450\uB4DC\uB824\uC57C \uD55C\uB2E4", tag: "\uC77C\uC77C", lines: [{ text: "\uC5EC\uBA85\uC758 \uC7A5\uAC80 \uAC15\uD654 \uC2DC\uB3C4", cur: 1, max: 3 }] }]);
      hud.setBuffs([{ id: "town", icon: 7, name: "\uC131\uCC44\uC758 \uAC00\uD638", remain: 1500, total: 1800 }]);
      setScene("town", [
        { id: "me", x: 960, y: 500, name: "\uCE74\uC77C", guild: "\uC740\uC0AC\uC790", crest: 0, kind: "me", hp: 0.88, fig: 1, col: "#5a6a9a" },
        { id: "n1", x: 1250, y: 380, name: "\uBE0C\uB86C", title: "\uB300\uC7A5\uC7A5\uC774", kind: "npc", hp: null, fig: 1, col: "#6a5a3a" },
        { id: "n2", x: 640, y: 400, name: "\uB9AC\uB098", title: "\uC7A1\uD654\uC0C1\uC778", kind: "npc", hp: null, fig: 0.95, col: "#7a5a6a" },
        { id: "p1", x: 800, y: 640, name: "\uB2EC\uBE5B\uAC80\uAC1D", guild: "\uC0C8\uBCBD\uAC80", crest: 2, kind: "player", hp: 1, fig: 1.05, col: "#8a8a8a" },
        { id: "p2", x: 1120, y: 660, name: "\uAC15\uD654\uC5D0\uC9C4\uC2EC", guild: "\uCCA0\uAD8C\uB2E8", crest: 3, kind: "player", hp: 1, fig: 1.05, col: "#555" },
        { id: "p3", x: 1420, y: 560, name: "\uBB3C\uC57D\uB3C4\uB9E4\uC0C1", kind: "player", hp: 1, fig: 1, col: "#6a4a3a" },
        { id: "p4", x: 520, y: 600, name: "\uC740\uBE5B\uAC08\uAE30", guild: "\uC740\uC0AC\uC790", crest: 0, kind: "player", hp: 1, fig: 1, col: "#4a5a8a" },
        { id: "p5", x: 1010, y: 300, name: "\uCD08\uBCF4\uAE30\uC0AC\uC784", kind: "player", hp: 1, dim: true, fig: 0.9, col: "#555" }
      ]);
      hud.bubble("n1", "\uC5B4\uC774 \uCE74\uC77C, \uADF8 \uAC80 \uC880 \uB354 \uB450\uB4DC\uB824 \uBCFC \uD150\uAC00?", 6e5);
      hud.toast("\uBCA8\uB85C\uC2A4 \uC131\uCC44\uC5D0 \uC785\uC7A5\uD588\uC2B5\uB2C8\uB2E4.");
    },
    // 1 ── 사냥
    () => {
      basePlayer();
      fillChat([["system", null, null, "\uB291\uB300\uC778\uAC04\uC744 \uCC98\uCE58\uD588\uC2B5\uB2C8\uB2E4. (7 / 20)"], ["party", "\uC232\uC9C0\uAE30", "\uC740\uC0AC\uC790", "\uC815\uC608 \uB5B4\uC5B4\uC694 \uC870\uC2EC"]]);
      hud.setPlayer({ hp: 6120, mp: 1240, exp: 0.6218 });
      hud.setZone("\uC18D\uC0AD\uC774\uB294 \uC232", "\uC0AC\uB0E5\uD130 \xB7 \uC704\uD5D8");
      hud.setCoords(2317, 1045);
      hud.setQuest([{ title: "\uC232\uC758 \uADF8\uB9BC\uC790", tag: "\uC8FC\uC694", lines: [{ text: "\uB300\uC7A5\uC7A5\uC774 \uBE0C\uB86C\uACFC \uB300\uD654", done: true }, { text: "\uB291\uB300\uC778\uAC04 \uCC98\uCE58", cur: 7, max: 20 }, { text: "\uC624\uD06C \uC8FC\uC220\uC0AC \uCC98\uCE58", cur: 2, max: 5 }] }, { title: "\uAC15\uCCA0\uC740 \uB450\uB4DC\uB824\uC57C \uD55C\uB2E4", tag: "\uC77C\uC77C", lines: [{ text: "\uC5EC\uBA85\uC758 \uC7A5\uAC80 \uAC15\uD654 \uC2DC\uB3C4", cur: 1, max: 3 }] }]);
      hud.setBuffs([{ id: "roar", icon: 6, name: "\uC0AC\uC790\uD6C4", remain: 42, total: 60 }, { id: "guard", icon: 4, name: "\uC218\uD638\uC758 \uBC29\uD328", remain: 4, total: 30 }, { id: "bolt", icon: 5, name: "\uB1CC\uC804\uAC80", remain: 14, total: 20 }, { id: "pot", icon: 8, name: "\uC7AC\uC0DD\uC758 \uBB3C\uC57D", remain: 780, total: 900 }]);
      hud.setTarget({ name: "\uD53C\uC5D0 \uAD76\uC8FC\uB9B0 \uB291\uB300\uC778\uAC04", level: 44, hp: 18400, hpMax: 42e3, kind: "elite", portrait: "ui/portrait_werewolf.jpg" });
      hud.updateSkill("combo", { cdLeft: 2.4 });
      hud.updateSkill("leap", { cdLeft: 9 });
      hud.updateSkill("bolt", { active: true });
      hud.updateSkill("roar", { cdLeft: 47 });
      hud.setAuto(true);
      auto = true;
      setScene("forest", [
        { id: "me", x: 900, y: 520, name: "\uCE74\uC77C", guild: "\uC740\uC0AC\uC790", crest: 0, kind: "me", hp: 0.64, fig: 1, col: "#5a6a9a" },
        { id: "m1", x: 1090, y: 440, name: "\uD53C\uC5D0 \uAD76\uC8FC\uB9B0 \uB291\uB300\uC778\uAC04", level: 44, kind: "elite", hp: 0.44, fig: 1.25, col: "#6a4a3a" },
        { id: "m2", x: 1340, y: 600, name: "\uB291\uB300\uC778\uAC04", level: 41, kind: "monster", hp: 0.8, fig: 1.1, col: "#5a4a40" },
        { id: "m3", x: 700, y: 330, name: "\uC624\uD06C \uC8FC\uC220\uC0AC", level: 40, kind: "monster", hp: 1, fig: 1.05, col: "#4a6a3a" },
        { id: "m4", x: 1500, y: 360, name: "\uC624\uD06C \uC804\uC0AC", level: 39, kind: "monster", hp: 1, dim: true, fig: 1.05, col: "#4a6a3a" },
        { id: "p1", x: 740, y: 640, name: "\uC232\uC9C0\uAE30", guild: "\uC740\uC0AC\uC790", crest: 0, kind: "player", hp: 0.9, fig: 1, col: "#4a7a5a" },
        { id: "p2", x: 1180, y: 700, name: "\uBC29\uD328\uB294\uB0B4\uAC00", guild: "\uC740\uC0AC\uC790", crest: 0, kind: "player", hp: 0.55, fig: 1.05, col: "#4a5a8a" },
        { id: "p3", x: 500, y: 470, name: "\uAC00\uC2DC\uB3CB\uCE5C\uB9D0", guild: "\uAC00\uC2DC\uC7A5\uBBF8", crest: 5, kind: "player", hp: 1, fig: 1, col: "#7a3a4a" }
      ]);
      hud.bubble("p1", "\uC815\uC608 \uB5B4\uC5B4\uC694 \uC870\uC2EC!", 6e5);
      for (const l of [{ icon: 14, name: "\uAE08\uD654", count: 320 }, { icon: 9, name: "\uBE68\uAC04 \uBB3C\uC57D", count: 3 }, { icon: 15, name: "\uB9C8\uB825 \uACB0\uC815", count: 2, rarity: "rare" }, { icon: 12, name: "\uBC29\uC5B4\uAD6C \uAC15\uD654 \uC8FC\uBB38\uC11C", count: 1, rarity: "epic" }, { icon: 13, name: "\uCD95\uBCF5\uBC1B\uC740 \uC8FC\uBB38\uC11C", count: 1, rarity: "legend" }]) hud.loot(l);
      hud.toast("\uB0B4\uB825\uC774 \uBD80\uC871\uD569\uB2C8\uB2E4.", "warn");
      hud.toast("\uB291\uB300\uC778\uAC04\uC744 \uCC98\uCE58\uD588\uC2B5\uB2C8\uB2E4.");
      dmgSpots = [
        { x: 1090, y: 470, every: 2, big: false },
        { x: 1340, y: 630, every: 5 },
        { x: 900, y: 540, every: 6, kind: "take", v: () => 240 + Math.random() * 300 },
        { x: 740, y: 650, every: 11, kind: "heal", v: () => 620 },
        { x: 900, y: 470, every: 9, kind: "exp", v: () => 1250 },
        { x: 960, y: 600, every: 13, kind: "gold", v: () => 320 }
      ];
      timer = setInterval(() => {
        spray();
        hud.loot({ icon: 14, name: "\uAE08\uD654", count: 100 + (Math.random() * 400 | 0) });
      }, 140);
      clearInterval(timer);
      timer = setInterval(spray, 140);
      for (let i = 0; i < 12; i++) spray();
    },
    // 2 ── 레이드
    () => {
      basePlayer();
      fillChat([["world", "\uCCA0\uAD8C\uB2E8\uC8FC", "\uCCA0\uAD8C\uB2E8", "\uBC1C\uCE74\uB974 \uB5B4\uB2E4!! \uC7BF\uBD88 \uC81C\uB2E8\uC73C\uB85C!!"], ["party", "\uBC29\uD328\uB294\uB0B4\uAC00", "\uC740\uC0AC\uC790", "\uC5B4\uADF8\uB85C \uC7A1\uC558\uC2B5\uB2C8\uB2E4 \uB51C \uB123\uC73C\uC138\uC694"], ["party", "\uB2EC\uBE5B\uC0AC\uC81C", "\uC740\uC0AC\uC790", "\uC7A5\uD310 \uD53C\uD558\uC138\uC694!! \uBE68\uAC04 \uC6D0!!"], ["guild", "\uC740\uC0AC\uC790\uB300\uC7A5", "\uC740\uC0AC\uC790", "2\uD398 \uB118\uC5B4\uAC11\uB2C8\uB2E4 \uBB3C\uC57D \uC544\uB07C\uC9C0 \uB9C8\uC138\uC694"], ["system", null, null, "\uC5FC\uC625\uC758 \uAD70\uC8FC \uBC1C\uCE74\uB974\uAC00 \uBD84\uB178\uD569\uB2C8\uB2E4. (2 \uB2E8\uACC4)"]]);
      hud.setPlayer({ hp: 4310, mp: 760, exp: 0.8841 });
      hud.setZone("\uC7BF\uBD88 \uC81C\uB2E8", "\uB808\uC774\uB4DC \xB7 \uC704\uD5D8");
      hud.setCoords(3880, 212);
      hud.setQuest([{ title: "\uC5FC\uC625\uC758 \uAD70\uC8FC", tag: "\uB808\uC774\uB4DC", lines: [{ text: "\uBC1C\uCE74\uB974 \uD1A0\uBC8C", cur: 0, max: 1 }, { text: "\uAE30\uC5EC\uB3C4 10\uC704 \uC774\uB0B4 \uB2EC\uC131", cur: 3, max: 10 }] }]);
      hud.setBuffs([{ id: "roar", icon: 6, name: "\uC0AC\uC790\uD6C4", remain: 31, total: 60 }, { id: "guard", icon: 4, name: "\uC218\uD638\uC758 \uBC29\uD328", remain: 18, total: 30 }, { id: "bolt", icon: 5, name: "\uB1CC\uC804\uAC80", remain: 9, total: 20 }]);
      hud.setBoss({ name: "\uBC1C\uCE74\uB974", title: "\uC5FC\uC625\uC758 \uAD70\uC8FC", hp: 684e4, hpMax: 12e6, phase: 2, phases: 3 });
      hud.setTarget({ name: "\uC5FC\uC625\uC758 \uAD70\uC8FC \uBC1C\uCE74\uB974", level: 60, hp: 684e4, hpMax: 12e6, kind: "boss", portrait: "ui/portrait_demon.jpg" });
      hud.updateSkill("spin", { cdLeft: 5.2 });
      hud.updateSkill("guard", { cdLeft: 21 });
      hud.updateSkill("leap", { active: true });
      hud.updateSkill("recall", { enabled: false });
      hud.setAuto(true);
      auto = true;
      const list = [
        { id: "boss", x: 1e3, y: 330, name: "\uBC1C\uCE74\uB974", title: "\uC5FC\uC625\uC758 \uAD70\uC8FC", kind: "boss", hp: 0.57, fig: 2.3, col: "#8a2a1a" },
        { id: "me", x: 860, y: 620, name: "\uCE74\uC77C", guild: "\uC740\uC0AC\uC790", crest: 0, kind: "me", hp: 0.45, fig: 1, col: "#5a6a9a" }
      ];
      const names = [["\uBC29\uD328\uB294\uB0B4\uAC00", "\uC740\uC0AC\uC790", 0], ["\uB2EC\uBE5B\uC0AC\uC81C", "\uC740\uC0AC\uC790", 0], ["\uC232\uC9C0\uAE30", "\uC740\uC0AC\uC790", 0], ["\uC740\uBE5B\uAC08\uAE30", "\uC740\uC0AC\uC790", 0], ["\uCCA0\uAD8C\uB2E8\uC8FC", "\uCCA0\uAD8C\uB2E8", 3], ["\uD55C\uBC29\uC5D0\uAC04\uB2E4", "\uCCA0\uAD8C\uB2E8", 3], ["\uD3ED\uD48D\uC804\uC57C", "\uD3ED\uD48D", 4], ["\uBC88\uAC1C\uB3C4\uB451", "\uD3ED\uD48D", 4], ["\uB2EC\uBE5B\uAC80\uAC1D", "\uC0C8\uBCBD\uAC80", 2], ["\uAC00\uC2DC\uC7A5\uBBF8\uC5EC\uC655", "\uAC00\uC2DC\uC7A5\uBBF8", 5], ["\uBD89\uC740\uAE43\uD138", "\uBD89\uC740\uAE4C\uB9C8\uADC0", 1]];
      names.forEach(([n, gd, c], i) => {
        const a = 0.35 + i * 0.52, r = 250 + i % 3 * 70;
        list.push({ id: "r" + i, x: 1e3 + Math.cos(a) * r * 1.5, y: 560 + Math.sin(a) * r * 0.42 + i % 2 * 30, name: n, guild: gd, crest: c, kind: "player", hp: 0.3 + i * 37 % 70 / 100, fig: 1, col: ["#4a5a8a", "#666", "#5a3a7a", "#888", "#7a3a4a"][i % 5] });
      });
      setScene("fire", list);
      hud.bubble("r1", "\uC7A5\uD310 \uD53C\uD558\uC138\uC694!!", 6e5);
      hud.notice("\uC5FC\uC625\uC758 \uAD70\uC8FC \uBC1C\uCE74\uB974\uAC00 \uC7BF\uBD88 \uC81C\uB2E8\uC5D0 \uAC15\uB9BC\uD588\uC2B5\uB2C8\uB2E4. \uBAA8\uB4E0 \uAE30\uC0AC\uB294 \uD1A0\uBC8C\uC5D0 \uCC38\uC5EC\uD558\uC2ED\uC2DC\uC624.", "boss");
      hud.notice("[\uC740\uC0AC\uC790] \uCE74\uC77C \uB2D8\uC774 +9 \uC5EC\uBA85\uC758 \uC7A5\uAC80 \uAC15\uD654\uC5D0 \uC131\uACF5\uD588\uC2B5\uB2C8\uB2E4!", "enhance");
      hud.notice("[\uD3ED\uD48D] \uBC88\uAC1C\uB3C4\uB451 \uB2D8\uC774 \uBC1C\uCE74\uB974\uC758 \uBD88\uAF43 \uC2EC\uC7A5\uC744 \uD68D\uB4DD\uD588\uC2B5\uB2C8\uB2E4.", "drop");
      for (const l of [{ icon: 14, name: "\uAE08\uD654", count: 4800 }, { icon: 15, name: "\uB9C8\uB825 \uACB0\uC815", count: 12, rarity: "rare" }, { icon: 7, name: "\uC5FC\uC625\uC758 \uBC18\uC9C0", count: 1, rarity: "legend" }]) hud.loot(l);
      dmgSpots = [{ x: 1e3, y: 470, every: 1, big: false }, { x: 930, y: 430, every: 3 }, { x: 1090, y: 510, every: 4, big: true }, { x: 860, y: 640, every: 5, kind: "take", v: () => 900 + Math.random() * 900 }, { x: 860, y: 600, every: 12, kind: "heal", v: () => 1480 }];
      let hp = 684e4;
      timer = setInterval(() => {
        spray();
        hp -= 3e3 + Math.random() * 6e3;
        hud.setBoss({ name: "\uBC1C\uCE74\uB974", title: "\uC5FC\uC625\uC758 \uAD70\uC8FC", hp, hpMax: 12e6, phase: 2, phases: 3 });
        hud.setTarget({ name: "\uC5FC\uC625\uC758 \uAD70\uC8FC \uBC1C\uCE74\uB974", level: 60, hp, hpMax: 12e6, kind: "boss", portrait: "ui/portrait_demon.jpg" });
      }, 140);
      for (let i = 0; i < 12; i++) spray();
    },
    // 3 ── 레벨 업
    () => {
      STEPS[1]();
      clearInterval(timer);
      hud.setPlayer({ level: 43, exp: 0.0214, hp: 9900, hpMax: 9900, mp: 2480, mpMax: 2480, power: 12960 });
      hud.levelUp(43);
      hud.chat.add({ channel: "system", text: "\uCD95\uD558\uD569\uB2C8\uB2E4! \uB808\uBCA8 43 \uC744 \uB2EC\uC131\uD588\uC2B5\uB2C8\uB2E4." });
      hud.chat.add({ channel: "guild", name: "\uC740\uBE5B\uAC08\uAE30", guild: "\uC740\uC0AC\uC790", text: "\uCE74\uC77C\uB2D8 \u314A\u314A\u314A" });
    },
    // 4 ── 지역 배너
    () => {
      STEPS[1]();
      clearInterval(timer);
      hud.setTarget(null);
      hud.setZone("\uC78A\uD600\uC9C4 \uBB18\uC9C0", "\uC0AC\uB0E5\uD130 \xB7 \uC704\uD5D8");
      hud.zoneBanner("\uC78A\uD600\uC9C4 \uBB18\uC9C0", "\uC8FD\uC740 \uAE30\uC0AC\uB4E4\uC774 \uC7A0\uB4E4\uC9C0 \uBABB\uD558\uB294 \uB545");
      hud.notice("\uC7A0\uC2DC \uD6C4 21\uC2DC\uC5D0 \uC7BF\uBD88 \uC81C\uB2E8 \uB808\uC774\uB4DC\uAC00 \uC2DC\uC791\uB429\uB2C8\uB2E4.", "info");
    },
    // 5 ── 연출
    () => {
      STEPS[0]();
      hud.cinema(true);
      hud.showDemoCaption("\u2460 \uB9C8\uC744 \u2014 \uBCA8\uB85C\uC2A4 \uC131\uCC44");
      hud.bubble("me", "\uC624\uB298\uC774\uC57C\uB9D0\uB85C +9 \uAC04\uB2E4.", 6e5);
    },
    // 6 ── 위급
    () => {
      STEPS[1]();
      hud.setPlayer({ hp: 1420, mp: 96 });
      hud.setPotions({ hp: 0, mp: 3 });
      hud.setAuto(false);
      hud.setTarget({ name: "\uAC00\uC2DC\uC7A5\uBBF8\uC5EC\uC655", level: 45, hp: 5200, hpMax: 9100, kind: "player", portrait: "ui/portrait_elf.jpg" });
      for (const s of SK) if (s.id !== "attack") hud.updateSkill(s.id, { cdLeft: s.cd * (0.2 + Math.random() * 0.7), active: false });
      hud.toast("\uBE68\uAC04 \uBB3C\uC57D\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.", "warn");
      hud.chat.setTab("guild");
    },
    // 7 ── 전체 메서드 자가 시험
    () => selfTest()
  ];
  function selfTest() {
    const bad = [];
    const ok = (c, m) => {
      if (!c) bad.push(m);
    };
    const ui = document.getElementById("ui");
    const $ = (s) => ui.querySelector(s);
    const vis = (s) => {
      const e = $(s);
      return !!e && getComputedStyle(e).display !== "none";
    };
    try {
      reset();
      basePlayer();
      events.length = 0;
      const need = ["setPlayer", "setBuffs", "setTarget", "setBoss", "setSkills", "updateSkill", "setAuto", "setPotions", "setQuest", "setZone", "zoneBanner", "setCoords", "notice", "toast", "loot", "levelUp", "damage", "bubble", "cinema", "fade", "showDemoCaption", "setVisible"];
      for (const n of need) ok(typeof hud[n] === "function", "\uBA54\uC11C\uB4DC \uC5C6\uC74C: " + n);
      ok(hud.minimap && hud.minimap.canvas && hud.minimap.ctx2d && hud.minimap.size === 220, "minimap");
      ok(typeof hud.chat.add === "function" && typeof hud.chat.setTab === "function", "chat");
      ok(typeof hud.plates.sync === "function", "plates");
      hud.setPlayer({ hp: 4800 });
      ok($(".h-player .hp .txt").textContent === "4,800 / 9,600", "\uBD80\uBD84 \uAC31\uC2E0 hp: " + $(".h-player .hp .txt").textContent);
      ok($(".h-player .name").textContent === "\uCE74\uC77C", "\uBD80\uBD84 \uAC31\uC2E0 \uB4A4 \uC774\uB984 \uC720\uC9C0");
      ok(/scaleX\(0\.5/.test($(".h-player .hp .fill").style.transform), "hp \uB9C9\uB300 \uBE44\uC728");
      hud.setPlayer({ exp: 0.5, level: 50 });
      ok(/50\.00%/.test($(".h-exp .txt").textContent) && $(".h-portrait .lv b").textContent === "50", "exp/level");
      hud.setBuffs([{ id: "a", icon: 6, name: "A", remain: 30, total: 60 }, { id: "b", icon: 4, name: "B", remain: 90, total: 120 }]);
      ok(ui.querySelectorAll(".h-buff").length === 2, "\uBC84\uD504 2\uAC1C");
      hud.setBuffs([{ id: "b", icon: 4, name: "B", remain: 3, total: 120 }]);
      ok(ui.querySelectorAll(".h-buff").length === 1 && $(".h-buff .t").textContent === "3\uCD08" && $(".h-buff").classList.contains("warn"), "\uBC84\uD504 \uAC31\uC2E0/\uC0AD\uC81C");
      hud.setTarget({ name: "\uB291\uB300\uC778\uAC04", level: 41, hp: 50, hpMax: 100, kind: "monster", portrait: "ui/portrait_werewolf.jpg" });
      ok(vis(".h-target") && $(".h-target .pct").textContent === "50.0%", "\uB300\uC0C1 \uD45C\uC2DC");
      hud.setTarget(null);
      ok(!vis(".h-target"), "\uB300\uC0C1 \uC228\uAE40");
      hud.setBoss({ name: "\uBC1C\uCE74\uB974", title: "\uC5FC\uC625\uC758 \uAD70\uC8FC", hp: 55, hpMax: 100, phase: 1, phases: 3 });
      ok(vis(".h-boss") && $(".h-boss .mult b").textContent === "6" && ui.querySelectorAll(".h-boss .phase i").length === 3, "\uBCF4\uC2A4 \uB9C9\uB300 \uC904 \uC218");
      hud.setBoss(null);
      ok(!vis(".h-boss"), "\uBCF4\uC2A4 \uC228\uAE40");
      ok(ui.querySelectorAll(".h-skill").length === SK.length, "\uC2A4\uD0AC \uBC84\uD2BC \uC218");
      hud.updateSkill("combo", { cdLeft: 2 });
      const sb = [...ui.querySelectorAll(".h-skill")].find((b) => b.querySelector(".nm").textContent === "\uC5F0\uC18D \uBCA0\uAE30");
      ok(sb.classList.contains("cool") && sb.querySelector(".sec").textContent === "2.0", "\uC7AC\uC0AC\uC6A9 \uB300\uAE30 \uD45C\uC2DC");
      hud.updateSkill("combo", { cdLeft: 0 });
      ok(!sb.classList.contains("cool"), "\uC7AC\uC0AC\uC6A9 \uB300\uAE30 \uB05D");
      hud.updateSkill("combo", { enabled: false });
      sb.click();
      ok(!events.some((e) => e[0] === "skill"), "\uBE44\uD65C\uC131 \uC2A4\uD0AC\uC740 \uC774\uBCA4\uD2B8 \uC5C6\uC74C");
      hud.updateSkill("combo", { enabled: true, active: true });
      ok(sb.classList.contains("act"), "active");
      sb.click();
      ok(events.some((e) => e[0] === "skill" && e[1] === "combo"), "emit('skill')");
      $(".h-skill.atk").click();
      ok(events.some((e) => e[0] === "attack"), "emit('attack')");
      $(".h-auto").click();
      ok(events.some((e) => e[0] === "toggleAuto") && $(".h-auto").classList.contains("on") && vis(".h-autopill"), "\uC790\uB3D9\uC0AC\uB0E5 \uCF1C\uC9D0");
      hud.setAuto(false);
      auto = false;
      ok(!vis(".h-autopill"), "\uC790\uB3D9\uC0AC\uB0E5 \uAEBC\uC9D0");
      hud.setPotions({ hp: 5 });
      ok($(".h-slot[data-p=hp] .n").textContent === "5" && $(".h-slot[data-p=mp] .n").textContent === "64", "\uBB3C\uC57D \uBD80\uBD84 \uAC31\uC2E0");
      $(".h-slot[data-p=mp]").click();
      ok(events.some((e) => e[0] === "potion" && e[1] === "mp"), "emit('potion')");
      hud.setQuest([{ title: "T", lines: [{ text: "a", cur: 1, max: 2 }, { text: "b", done: true }] }]);
      ok(ui.querySelectorAll(".h-q .ql").length === 2 && ui.querySelectorAll(".h-q .ql.done").length === 1, "\uC758\uB8B0");
      hud.setQuest([]);
      ok(!vis(".h-quest"), "\uC758\uB8B0 \uBE44\uC6C0");
      hud.setZone("\uAC00", "\uB098");
      hud.minimap.setCoords(12.4, 99.6);
      ok($(".zname").textContent === "\uAC00" && $(".xy").textContent === "12, 100", "\uC9C0\uC5ED/\uC88C\uD45C");
      hud.zoneBanner("\uC78A\uD600\uC9C4 \uBB18\uC9C0", "\uBD80\uC81C");
      ok($(".h-zoneb").classList.contains("play"), "\uC9C0\uC5ED \uBC30\uB108");
      hud.chat.clear();
      for (let i = 0; i < 150; i++) hud.chat.add({ channel: ["world", "local", "guild", "party", "trade", "system"][i % 6], name: "\uBD07" + i, guild: i % 2 ? "\uC740\uC0AC\uC790" : null, text: "\uC904 " + i });
      ok(ui.querySelectorAll(".h-ln").length === 120, "\uCC44\uD305 120\uC904 \uC720\uC9C0: " + ui.querySelectorAll(".h-ln").length);
      ok(/줄 149$/.test($(".h-chat .body").lastChild.textContent), "\uB9C8\uC9C0\uB9C9 \uC904");
      const body = $(".h-chat .body");
      ok(body.scrollHeight - body.scrollTop - body.clientHeight < 3, "\uC790\uB3D9 \uC2A4\uD06C\uB864");
      hud.chat.setTab("guild");
      ok([...ui.querySelectorAll(".h-ln")].filter((e) => getComputedStyle(e).display !== "none").every((e) => e.classList.contains("ch-guild")), "\uBB38\uD30C \uD0ED \uAC70\uB974\uAE30");
      hud.chat.setTab("all");
      const inp = $(".h-chat input");
      inp.value = "\uC548\uB155\uD558\uC138\uC694";
      inp.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
      ok(events.some((e) => e[0] === "chat" && e[1] === "\uC548\uB155\uD558\uC138\uC694") && inp.value === "", "emit('chat')");
      hud.notice("\uCCAB \uACF5\uC9C0", "enhance");
      hud.notice("\uB458\uC9F8 \uACF5\uC9C0", "boss");
      ok(vis(".h-notice") && $(".h-notice .tx").textContent === "\uCCAB \uACF5\uC9C0", "\uACF5\uC9C0 \uCC28\uB840");
      hud.toast("\uC54C\uB9BC");
      ok(ui.querySelectorAll(".h-toast").length >= 1, "\uC54C\uB9BC");
      hud.loot({ icon: 9, name: "\uBE68\uAC04 \uBB3C\uC57D", count: 3, rarity: "rare" });
      ok($(".h-loot").lastChild.classList.contains("r-rare"), "\uD68D\uB4DD \uBAA9\uB85D");
      hud.levelUp(51);
      ok($(".h-lvup").classList.contains("play") && $(".h-lvup .sub b").textContent === "51", "\uB808\uBCA8 \uC5C5");
      const t0 = performance.now();
      for (let i = 0; i < 600; i++) hud.damage(300 + i % 40 * 30, 300 + i % 7 * 40, 1e3 + i, { kind: ["deal", "crit", "take", "heal", "miss", "exp", "gold"][i % 7], big: i % 9 === 0 });
      const dt = performance.now() - t0;
      ok(ui.querySelectorAll(".h-dmg").length === 96, "\uD53C\uD574 \uC22B\uC790 \uD480 \uD06C\uAE30 \uACE0\uC815");
      ok(dt < 250, "\uD53C\uD574 \uC22B\uC790 600\uAC1C " + dt.toFixed(1) + "ms");
      const L = [];
      for (let i = 0; i < 60; i++) L.push({ id: "x" + i, x: 100 + i * 20, y: 300, name: "\uC774\uB984" + i, guild: i % 2 ? "\uC740\uC0AC\uC790" : null, crest: i % 6, level: 10, hp: i % 3 ? 0.5 : null, kind: ["player", "me", "monster", "elite", "boss", "npc"][i % 6], title: i % 6 === 5 ? "\uC0C1\uC778" : null });
      hud.plates.sync(L);
      const n1 = ui.querySelectorAll(".h-plate").length;
      const t1 = performance.now();
      for (let f = 0; f < 300; f++) {
        for (const p of L) p.x += 1;
        hud.plates.sync(L);
      }
      const dt2 = performance.now() - t1;
      ok(ui.querySelectorAll(".h-plate").length === n1, "\uC774\uB984\uD45C DOM \uC7AC\uC0AC\uC6A9");
      ok(dt2 < 600, "\uC774\uB984\uD45C 60\uAC1C x 300\uD504\uB808\uC784 " + dt2.toFixed(1) + "ms");
      hud.plates.sync(L.slice(0, 5));
      ok([...ui.querySelectorAll(".h-plate")].filter((e) => e.style.display !== "none").length === 5, "\uBAA9\uB85D\uC5D0 \uC5C6\uB294 \uC774\uB984\uD45C \uC228\uAE40");
      hud.bubble("x1", "\uB9D0\uD48D\uC120", 1e3);
      ok(ui.querySelector(".h-plate .bub.on") && ui.querySelector(".h-plate .bub.on").textContent === "\uB9D0\uD48D\uC120", "\uB9D0\uD48D\uC120");
      hud.cinema(true);
      ok($(".h-hud").classList.contains("h-cinema"), "cinema");
      hud.cinema(false);
      const pr = hud.fade(0.5, 30, "#fff");
      ok(pr && typeof pr.then === "function", "fade \uB294 Promise");
      hud.fade(0, 0);
      hud.showDemoCaption("\u2460 \uC790\uB9C9");
      ok(vis(".h-caption"));
      hud.showDemoCaption(null);
      ok(!vis(".h-caption"), "\uC790\uB9C9 \uC228\uAE40");
      hud.setVisible(false);
      ok(getComputedStyle($(".h-hud")).display === "none", "setVisible(false)");
      hud.setVisible(true);
      ok(getComputedStyle($(".h-hud")).display !== "none", "setVisible(true)");
      $(".h-mbtn").click();
      ok(events.some((e) => e[0] === "menu"), "emit('menu')");
      hud.plates.sync([]);
      hud.setSkills(SK);
    } catch (e) {
      bad.push("\uC608\uC678: " + (e.stack || e.message));
    }
    return bad.length ? bad : "OK";
  }
  window.demoStep = (n) => {
    reset();
    dmgSpots = [];
    const r = STEPS[n | 0] ? STEPS[n | 0]() : void 0;
    return r;
  };
  window.demoStep(+(new URLSearchParams(location.search).get("step") || 0));
  window.__READY__ = true;
})();
