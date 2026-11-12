(() => {
  // game/src/ui/theme.css
  var theme_default = "/* \uACF5\uD1B5 \uD14C\uB9C8 (\uC218\uC815 \uAE08\uC9C0: HUD\xB7\uCC3D \uBAA8\uB4C8\uC774 \uD568\uAED8 \uC4F4\uB2E4) */\n#ui {\n  --gold: #d8b56a; --gold-hi: #ffe7a8; --gold-lo: #8a6a2e; --gold-line: rgba(200,164,90,.55);\n  --panel: rgba(13,16,24,.86); --panel-2: rgba(22,27,40,.92); --panel-line: rgba(255,255,255,.07);\n  --ink: #e9e4d6; --ink-dim: #a9a595; --ink-faint: #6f6c62;\n  --hp-a: #ff5a4a; --hp-b: #8e1010; --mp-a: #4fb2ff; --mp-b: #123a9a; --exp-a: #ffe08a; --exp-b: #c98a1e;\n  --common: #cfd3da; --rare: #4aa3ff; --epic: #b36bff; --legend: #ffb23e;\n  --ch-world: #ffd27a; --ch-local: #ececec; --ch-guild: #7dff9a; --ch-party: #7ecbff; --ch-trade: #ffa0d8; --ch-system: #ff8a5c;\n  --shadow: 0 6px 24px rgba(0,0,0,.55);\n  position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; overflow: hidden;\n  pointer-events: none; user-select: none; color: var(--ink);\n  font-family: 'GameSans', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; font-size: 15px; line-height: 1.35;\n  -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility;\n}\n#ui * { box-sizing: border-box; }\n#ui .interactive, #ui button, #ui input { pointer-events: auto; }\n#ui .serif { font-family: 'GameSerif', 'AppleMyungjo', 'Batang', serif; }\n/* \uAE08\uD14C \uD328\uB110 */\n#ui .panel {\n  background: linear-gradient(180deg, var(--panel-2), var(--panel));\n  border: 1px solid var(--gold-line); border-radius: 4px;\n  box-shadow: var(--shadow), inset 0 0 0 1px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.06);\n}\n/* \uAE08\uC18D \uAE08\uBE5B \uAE00\uC790 */\n#ui .gold-text {\n  font-family: 'GameSerif', serif; font-weight: 900;\n  background: linear-gradient(180deg, #fff6d0 0%, #ffd97a 32%, #c98f2c 58%, #7a4f12 78%, #e9c069 100%);\n  -webkit-background-clip: text; background-clip: text; color: transparent;\n  filter: drop-shadow(0 2px 0 rgba(0,0,0,.85)) drop-shadow(0 0 14px rgba(255,190,80,.35));\n}\n#ui .outline { text-shadow: 0 0 2px #000, 0 1px 2px #000, 1px 0 2px #000, -1px 0 2px #000, 0 -1px 2px #000; }\n/* \uAE30\uBCF8 \uBC84\uD2BC */\n#ui .btn {\n  font-family: 'GameSerif', serif; font-weight: 700; font-size: 17px; color: #f6e7bd; letter-spacing: .04em;\n  padding: 9px 26px; border-radius: 3px; cursor: pointer; border: 1px solid #b08a3e;\n  background: linear-gradient(180deg, #5a4420 0%, #2e210d 55%, #1c1407 100%);\n  box-shadow: inset 0 1px 0 rgba(255,236,170,.35), inset 0 -8px 14px rgba(0,0,0,.35), 0 3px 10px rgba(0,0,0,.5);\n  text-shadow: 0 1px 2px #000; transition: filter .12s, transform .08s;\n}\n#ui .btn:hover { filter: brightness(1.25); }\n#ui .btn:active { transform: translateY(1px); filter: brightness(.9); }\n#ui .btn.primary { background: linear-gradient(180deg, #b8862a 0%, #6d4a10 55%, #3d2906 100%); border-color: #f0cf7e; color: #fff8dc; }\n#ui .rar-common { color: var(--common); } #ui .rar-rare { color: var(--rare); } #ui .rar-epic { color: var(--epic); } #ui .rar-legend { color: var(--legend); }\n";

  // game/src/ui/windows.css
  var windows_default = "/* \uCC3D\xB7\uC5F0\uCD9C (windows.js). \uBAA8\uB4E0 \uD074\uB798\uC2A4\uB294 w- \uB85C \uC2DC\uC791\uD55C\uB2E4. */\n#ui .w-layer { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; pointer-events: none; }\n#ui .w-wins { z-index: 60; transition: opacity .18s; }\n#ui .w-dlg-layer { z-index: 64; transition: opacity .18s; }\n#ui .w-wins.fx-dim, #ui .w-dlg-layer.fx-dim { opacity: .1; }\n#ui .w-over { z-index: 70; }\n#ui .w-enh { z-index: 80; }\n#ui .w-full { z-index: 100; }\n#ui .w-hide { display: none !important; }\n#ui .w-num { font-weight: 700; font-variant-numeric: tabular-nums; }\n\n/* \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 \uC544\uC774\uCF58 \uCE78 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n#ui .w-ico { position: absolute; inset: 0; background-repeat: no-repeat; background-size: cover; background-position: center; }\n#ui .w-slot {\n  position: relative; width: 64px; height: 64px; border-radius: 4px; flex: none;\n  background: radial-gradient(circle at 50% 35%, #232a3b 0%, #121622 62%, #0a0d15 100%);\n  border: 1px solid #343a4c;\n  box-shadow: inset 0 0 0 1px rgba(0,0,0,.75), inset 0 8px 12px rgba(255,255,255,.03), inset 0 -10px 14px rgba(0,0,0,.5);\n  overflow: hidden;\n}\n#ui .w-slot .w-ico { inset: 2px; border-radius: 2px; }\n#ui .w-slot::after { content: ''; position: absolute; inset: 2px; border-radius: 2px; pointer-events: none;\n  background: linear-gradient(160deg, rgba(255,255,255,.16) 0%, rgba(255,255,255,0) 34%); }\n#ui .w-slot.has { cursor: pointer; pointer-events: auto; }\n#ui .w-slot.has:hover { filter: brightness(1.3); border-color: var(--gold-hi); }\n#ui .w-slot.r-common { border-color: #6d7382; }\n#ui .w-slot.r-rare { border-color: var(--rare); box-shadow: inset 0 0 0 1px #000, inset 0 0 14px rgba(74,163,255,.55), 0 0 6px rgba(74,163,255,.35); }\n#ui .w-slot.r-epic { border-color: var(--epic); box-shadow: inset 0 0 0 1px #000, inset 0 0 14px rgba(179,107,255,.6), 0 0 7px rgba(179,107,255,.4); }\n#ui .w-slot.r-legend { border-color: var(--legend); box-shadow: inset 0 0 0 1px #000, inset 0 0 16px rgba(255,178,62,.65), 0 0 9px rgba(255,178,62,.5); }\n#ui .w-slot .w-cnt { position: absolute; right: 4px; bottom: 1px; font-size: 13px; font-weight: 700; color: #fff; z-index: 2;\n  text-shadow: 0 0 2px #000, 0 1px 2px #000, 1px 0 2px #000, -1px 0 2px #000; }\n#ui .w-slot .w-pls { position: absolute; left: 4px; top: 1px; font-size: 14px; font-weight: 700; color: #ffe27a; z-index: 2;\n  text-shadow: 0 0 2px #000, 0 1px 2px #000, 1px 0 2px #000, -1px 0 2px #000, 0 0 8px rgba(255,170,40,.9); }\n#ui .w-slot .w-eq { position: absolute; left: 2px; bottom: 2px; z-index: 2; font-size: 10px; font-weight: 700; line-height: 1; padding: 2px 3px 2px;\n  color: #1a1205; background: linear-gradient(180deg, #ffe7a8, #c9912e); border-radius: 2px; box-shadow: 0 1px 2px #000; }\n#ui .w-slot .w-lbl { position: absolute; left: 0; right: 0; top: 50%; transform: translateY(-50%); text-align: center; font-size: 12px; color: #4b5164; letter-spacing: .05em; }\n\n/* \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 \uCC3D \uD2C0 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n#ui .w-win { position: absolute; pointer-events: auto; display: flex; flex-direction: column; transition: translate .2s ease-out;\n  background:\n    radial-gradient(120% 60% at 50% 0%, rgba(96,78,40,.22), rgba(0,0,0,0) 70%),\n    linear-gradient(180deg, rgba(24,29,43,.985), rgba(11,14,21,.985));\n  border: 1px solid #9c7d3f; border-radius: 5px;\n  box-shadow: 0 18px 50px rgba(0,0,0,.7), 0 0 0 1px #000, inset 0 0 0 1px rgba(0,0,0,.7), inset 0 0 0 2px rgba(216,181,106,.13), inset 0 1px 0 rgba(255,236,170,.2);\n  animation: w-win-in .2s cubic-bezier(.2,.9,.3,1.15) both;\n}\n@keyframes w-win-in { from { opacity: 0; transform: translateY(14px) scale(.965); } to { opacity: 1; transform: none; } }\n#ui .w-win.closing { animation: w-win-out .13s ease-in both; }\n@keyframes w-win-out { to { opacity: 0; transform: translateY(8px) scale(.975); } }\n#ui .w-cn { position: absolute; width: 22px; height: 22px; pointer-events: none; z-index: 3; }\n#ui .w-cn::before, #ui .w-cn::after { content: ''; position: absolute; background: linear-gradient(90deg, #ffe7a8, #b98b38); box-shadow: 0 0 5px rgba(255,200,100,.5); }\n#ui .w-cn::before { left: 0; top: 0; width: 22px; height: 2px; } #ui .w-cn::after { left: 0; top: 0; width: 2px; height: 22px; }\n#ui .w-cn i { position: absolute; left: 5px; top: 5px; width: 6px; height: 6px; background: #ffe7a8; transform: rotate(45deg); box-shadow: 0 0 6px #ffbf55; }\n#ui .w-cn.tl { left: -3px; top: -3px; } #ui .w-cn.tr { right: -3px; top: -3px; transform: scaleX(-1); }\n#ui .w-cn.bl { left: -3px; bottom: -3px; transform: scaleY(-1); } #ui .w-cn.br { right: -3px; bottom: -3px; transform: scale(-1); }\n#ui .w-head { position: relative; height: 46px; flex: none; cursor: move; display: flex; align-items: center; justify-content: center;\n  background: linear-gradient(180deg, rgba(92,70,30,.55) 0%, rgba(40,31,16,.5) 55%, rgba(14,13,14,.2) 100%);\n  border-bottom: 1px solid rgba(216,181,106,.5); box-shadow: inset 0 1px 0 rgba(255,236,170,.22), 0 1px 0 #000; border-radius: 4px 4px 0 0; }\n#ui .w-head::after { content: ''; position: absolute; left: 12%; right: 12%; bottom: -1px; height: 1px; background: linear-gradient(90deg, transparent, #ffe7a8, transparent); }\n#ui .w-ttl { font-family: 'GameSerif', serif; font-weight: 900; font-size: 21px; letter-spacing: .28em; padding-left: .28em;\n  background: linear-gradient(180deg, #fff6d0 0%, #ffd97a 40%, #b47c22 100%); -webkit-background-clip: text; background-clip: text; color: transparent;\n  filter: drop-shadow(0 1px 0 #000) drop-shadow(0 0 8px rgba(255,190,80,.3)); display: flex; align-items: center; gap: 14px; }\n#ui .w-ttl::before, #ui .w-ttl::after { content: ''; width: 46px; height: 9px; flex: none;\n  background: linear-gradient(90deg, transparent, #d8b56a 80%) left center / calc(100% - 12px) 1px no-repeat,\n    conic-gradient(from 45deg at 50% 50%, #ffe7a8 0 25%, #a87a2c 0 50%, #ffe7a8 0 75%, #a87a2c 0) right center / 8px 8px no-repeat; }\n#ui .w-ttl::after { transform: scaleX(-1); }\n#ui .w-x { position: absolute; right: 10px; top: 9px; width: 28px; height: 28px; padding: 0; cursor: pointer; border-radius: 3px;\n  border: 1px solid #8a6a2e; background: linear-gradient(180deg, #4a2a22, #20100c); box-shadow: inset 0 1px 0 rgba(255,200,170,.25), 0 2px 4px rgba(0,0,0,.6); }\n#ui .w-x::before, #ui .w-x::after { content: ''; position: absolute; left: 6px; right: 6px; top: 12px; height: 2px; background: #f3d9a2; border-radius: 1px; }\n#ui .w-x::before { transform: rotate(45deg); } #ui .w-x::after { transform: rotate(-45deg); }\n#ui .w-x:hover { filter: brightness(1.5); }\n#ui .w-body { position: relative; flex: 1; padding: 14px 16px 16px; min-height: 0; }\n#ui .w-sec { font-family: 'GameSerif', serif; font-weight: 700; font-size: 14px; color: var(--gold); letter-spacing: .12em; display: flex; align-items: center; gap: 8px; margin: 0 0 8px; }\n#ui .w-sec::before { content: ''; width: 6px; height: 6px; background: var(--gold); transform: rotate(45deg); flex: none; }\n#ui .w-sec::after { content: ''; flex: 1; height: 1px; background: linear-gradient(90deg, rgba(216,181,106,.55), transparent); }\n#ui .w-inset { background: rgba(4,6,11,.55); border: 1px solid rgba(255,255,255,.06); border-radius: 3px; box-shadow: inset 0 2px 8px rgba(0,0,0,.6); }\n#ui .w-tabs { display: flex; gap: 4px; margin-bottom: 10px; }\n#ui .w-tab { flex: 1; text-align: center; font-size: 14px; padding: 6px 0 5px; color: var(--ink-dim); cursor: pointer; pointer-events: auto;\n  border: 1px solid rgba(255,255,255,.08); border-bottom-color: rgba(216,181,106,.35); border-radius: 3px 3px 0 0; background: linear-gradient(180deg, rgba(255,255,255,.05), rgba(0,0,0,.25)); }\n#ui .w-tab.on { color: #fff3cf; font-weight: 700; border-color: #b08a3e; background: linear-gradient(180deg, rgba(184,134,42,.55), rgba(61,41,6,.5)); box-shadow: inset 0 1px 0 rgba(255,236,170,.4); }\n#ui .w-scroll { overflow-y: auto; pointer-events: auto; }\n#ui .w-scroll::-webkit-scrollbar { width: 6px; } #ui .w-scroll::-webkit-scrollbar-thumb { background: #6b5527; border-radius: 3px; } #ui .w-scroll::-webkit-scrollbar-track { background: rgba(0,0,0,.4); }\n\n/* \uB3C4\uC6C0\uB9D0 \uD48D\uC120 */\n#ui .w-tip { position: absolute; z-index: 90; min-width: 150px; max-width: 280px; padding: 8px 12px; pointer-events: none;\n  background: rgba(8,10,16,.96); border: 1px solid var(--gold-line); border-radius: 3px; box-shadow: 0 6px 18px rgba(0,0,0,.7); font-size: 14px; }\n#ui .w-tip b { display: block; font-size: 15px; } #ui .w-tip span { color: var(--ink-dim); font-size: 13px; }\n\n/* \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 \uAC00\uBC29 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n#ui .w-inv { width: 482px; }\n#ui .w-inv-grid { display: grid; grid-template-columns: repeat(6, 64px); gap: 6px; padding: 10px; justify-content: center; max-height: 506px; }\n#ui .w-inv-foot { display: flex; align-items: center; gap: 10px; margin-top: 12px; }\n#ui .w-gold { display: flex; align-items: center; gap: 8px; height: 36px; padding: 0 14px 0 6px; flex: 1; }\n#ui .w-gold .w-coin { position: relative; width: 28px; height: 28px; border-radius: 50%; overflow: hidden; flex: none; }\n#ui .w-gold b { margin-left: auto; font-size: 18px; color: #ffe08a; text-shadow: 0 1px 2px #000; font-variant-numeric: tabular-nums; }\n#ui .w-gold span { color: var(--ink-dim); font-size: 13px; }\n#ui .w-wt { width: 150px; }\n#ui .w-wt .w-wt-t { display: flex; justify-content: space-between; font-size: 12px; color: var(--ink-dim); margin-bottom: 3px; }\n#ui .w-bar { height: 8px; border-radius: 4px; background: #05070c; border: 1px solid rgba(255,255,255,.1); overflow: hidden; box-shadow: inset 0 1px 3px #000; }\n#ui .w-bar i { display: block; height: 100%; width: 40%; border-radius: 3px; background: linear-gradient(180deg, #ffe08a, #c98a1e); box-shadow: inset 0 1px 0 rgba(255,255,255,.5); transition: width .25s; }\n#ui .w-inv-cap { font-size: 12px; color: var(--ink-faint); text-align: right; margin-top: 6px; }\n\n/* \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 \uC7A5\uBE44\xB7\uB2A5\uB825\uCE58 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n#ui .w-chr { width: 668px; }\n#ui .w-chr .w-body { display: flex; gap: 16px; }\n#ui .w-doll { position: relative; width: 322px; height: 452px; flex: none; overflow: hidden;\n  background: radial-gradient(70% 55% at 50% 42%, rgba(70,90,150,.28), rgba(0,0,0,0) 70%), rgba(4,6,11,.55); }\n#ui .w-doll::before { content: ''; position: absolute; left: 50%; top: 46%; width: 250px; height: 250px; margin: -125px; border-radius: 50%;\n  border: 1px solid rgba(216,181,106,.22); box-shadow: 0 0 0 14px rgba(216,181,106,.04), inset 0 0 40px rgba(216,181,106,.08); }\n#ui .w-doll-col { position: absolute; top: 14px; display: flex; flex-direction: column; gap: 19px; }\n#ui .w-doll-col.l { left: 12px; } #ui .w-doll-col.r { right: 12px; }\n#ui .w-eslot { position: relative; }\n#ui .w-eslot .w-slot { width: 68px; height: 68px; }\n#ui .w-port { position: absolute; left: 50%; top: 16px; width: 154px; height: 178px; margin-left: -77px; border-radius: 4px; overflow: hidden;\n  border: 1px solid #b08a3e; box-shadow: 0 0 0 1px #000, 0 0 0 3px rgba(216,181,106,.2), 0 8px 22px rgba(0,0,0,.7); background: #111 center/cover no-repeat; }\n#ui .w-port::after { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(255,255,255,.12), transparent 30%, rgba(0,0,0,.45)); }\n#ui .w-doll-name { position: absolute; left: 86px; right: 86px; top: 204px; text-align: center; }\n#ui .w-doll-name b { display: block; font-family: 'GameSerif', serif; font-weight: 900; font-size: 22px; color: #fff3cf; text-shadow: 0 2px 3px #000; }\n#ui .w-doll-name span { font-size: 13px; color: #9fd0ff; }\n#ui .w-doll-name em { display: block; font-style: normal; font-size: 13px; color: var(--ink-dim); margin-top: 2px; }\n#ui .w-doll-mid { position: absolute; left: 50%; top: 288px; transform: translateX(-50%); display: flex; gap: 10px; }\n#ui .w-pow { position: absolute; left: 12px; right: 12px; bottom: 12px; height: 62px; display: flex; align-items: center; justify-content: center; gap: 12px;\n  border: 1px solid rgba(216,181,106,.4); border-radius: 3px; background: linear-gradient(90deg, rgba(120,84,20,.1), rgba(160,116,34,.38), rgba(120,84,20,.1)); }\n#ui .w-pow span { font-family: 'GameSerif', serif; font-weight: 700; color: var(--gold); letter-spacing: .2em; font-size: 15px; }\n#ui .w-pow b { font-family: 'GameSerif', serif; font-weight: 900; font-size: 32px; font-variant-numeric: tabular-nums;\n  background: linear-gradient(180deg, #fff6d0, #ffd97a 45%, #b47c22); -webkit-background-clip: text; background-clip: text; color: transparent; filter: drop-shadow(0 2px 0 #000); }\n#ui .w-chr-r { flex: 1; min-width: 0; display: flex; flex-direction: column; }\n#ui .w-stats { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 0 14px; padding: 8px 12px; margin-bottom: 12px; overflow: hidden; }\n#ui .w-stat { display: flex; align-items: baseline; gap: 8px; height: 29px; line-height: 29px; border-bottom: 1px dashed rgba(255,255,255,.07); font-size: 14px; min-width: 0; overflow: hidden; }\n#ui .w-stat span { color: var(--ink-dim); flex: 0 1 auto; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }\n#ui .w-stat b { margin-left: auto; color: #fff; font-variant-numeric: tabular-nums; flex: none; white-space: nowrap; max-width: 60%; overflow: hidden; text-overflow: ellipsis; }\n#ui .w-stat.hi b { color: #ffe08a; }\n#ui .w-eqlist { flex: 1; padding: 6px 10px; min-height: 0; overflow: hidden; }\n#ui .w-eqrow { display: flex; align-items: center; height: 25px; font-size: 13.5px; gap: 8px; }\n#ui .w-eqrow span { width: 44px; color: var(--ink-faint); flex: none; } #ui .w-eqrow b { font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }\n#ui .w-eqrow em { font-style: normal; font-weight: 700; color: #ffe27a; margin-left: auto; }\n\n/* \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 \uAC15\uD654 \uCC3D \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n#ui .w-enw { width: 540px; }\n#ui .w-enw-npc { display: flex; align-items: center; gap: 10px; height: 44px; padding: 0 12px 0 6px; margin-bottom: 10px; font-size: 13.5px; color: var(--ink-dim); }\n#ui .w-enw-npc i { width: 32px; height: 32px; border-radius: 50%; border: 1px solid #b08a3e; background: #111 center/cover; flex: none; box-shadow: 0 0 0 1px #000; }\n#ui .w-enw-npc b { color: #ffd98a; font-weight: 700; margin-right: 10px; }\n#ui .w-altar { position: relative; height: 236px; overflow: hidden;\n  background: radial-gradient(60% 70% at 50% 46%, rgba(255,170,60,.2), rgba(120,40,10,.08) 55%, rgba(0,0,0,0) 75%), linear-gradient(180deg, rgba(6,8,14,.7), rgba(10,8,8,.8)); }\n#ui .w-altar .w-rune { position: absolute; left: 50%; top: 104px; width: 210px; height: 210px; margin: -105px; border-radius: 50%; animation: w-spin 26s linear infinite;\n  background:\n    repeating-conic-gradient(from 0deg, rgba(255,214,130,.55) 0 1.2deg, transparent 0 15deg);\n  -webkit-mask: radial-gradient(circle, transparent 0 88px, #000 89px 96px, transparent 97px 100px, #000 101px 103px, transparent 104px); mask: radial-gradient(circle, transparent 0 88px, #000 89px 96px, transparent 97px 100px, #000 101px 103px, transparent 104px); }\n#ui .w-altar .w-rune.b { width: 164px; height: 164px; margin: -82px; animation: w-spin 18s linear infinite reverse; opacity: .8;\n  background: repeating-conic-gradient(from 0deg, rgba(255,214,130,.7) 0 3deg, transparent 0 30deg);\n  -webkit-mask: radial-gradient(circle, transparent 0 70px, #000 71px 74px, transparent 75px 78px, #000 79px 80px, transparent 81px); mask: radial-gradient(circle, transparent 0 70px, #000 71px 74px, transparent 75px 78px, #000 79px 80px, transparent 81px); }\n@keyframes w-spin { to { transform: rotate(360deg); } }\n#ui .w-altar .w-slot.big { position: absolute; left: 50%; top: 104px; width: 104px; height: 104px; margin: -52px; border-width: 2px; }\n#ui .w-altar .w-slot.big::before { content: ''; position: absolute; inset: 0; z-index: 2; background: linear-gradient(115deg, transparent 40%, rgba(255,255,255,.35) 50%, transparent 60%); background-size: 300% 100%; animation: w-sheen 3.2s ease-in-out infinite; }\n@keyframes w-sheen { 0%, 55% { background-position: 120% 0; } 100% { background-position: -60% 0; } }\n#ui .w-pl { position: absolute; top: 62px; width: 130px; text-align: center; }\n#ui .w-pl.cur { left: 22px; } #ui .w-pl.nxt { right: 22px; }\n#ui .w-pl span { display: block; font-size: 12.5px; color: var(--ink-dim); letter-spacing: .1em; }\n#ui .w-pl b { display: block; font-family: 'GameSerif', serif; font-weight: 900; font-size: 54px; line-height: 1.1; color: #e9e4d6; text-shadow: 0 3px 0 #000, 0 0 14px rgba(255,255,255,.2); font-variant-numeric: tabular-nums; }\n#ui .w-pl.nxt b { background: linear-gradient(180deg, #fff6d0, #ffd97a 45%, #c27f1e); -webkit-background-clip: text; background-clip: text; color: transparent; text-shadow: none;\n  filter: drop-shadow(0 3px 0 #000) drop-shadow(0 0 14px rgba(255,180,60,.7)); animation: w-pulse 1.4s ease-in-out infinite; }\n@keyframes w-pulse { 50% { filter: drop-shadow(0 3px 0 #000) drop-shadow(0 0 22px rgba(255,200,90,1)) brightness(1.15); } }\n#ui .w-arr { position: absolute; top: 100px; width: 34px; height: 12px; opacity: .9; background: linear-gradient(90deg, transparent, #ffd97a); clip-path: polygon(0 35%, 70% 35%, 70% 0, 100% 50%, 70% 100%, 70% 65%, 0 65%); animation: w-arr 1.1s ease-in-out infinite; }\n#ui .w-arr.a { left: 152px; } #ui .w-arr.b { right: 152px; }\n@keyframes w-arr { 50% { transform: translateX(6px); opacity: .5; } }\n#ui .w-enw-name { position: absolute; left: 0; right: 0; top: 174px; z-index: 3; padding: 5px 40px 6px; text-align: center; font-family: 'GameSerif', serif; font-weight: 700; font-size: 19px; text-shadow: 0 2px 3px #000;\n  background: linear-gradient(90deg, rgba(7,8,12,0) 0%, rgba(7,8,12,.94) 22%, rgba(7,8,12,.94) 78%, rgba(7,8,12,0) 100%); }\n#ui .w-enw-name::before { content: ''; position: absolute; left: 18%; right: 18%; top: 0; height: 1px; background: linear-gradient(90deg, transparent, rgba(216,181,106,.55), transparent); }\n#ui .w-enw-name span { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }\n#ui .w-enw-name small { display: block; font-family: 'GameSans', sans-serif; font-weight: 400; font-size: 12.5px; color: var(--ink-dim); margin-top: 1px; }\n#ui .w-rate { display: flex; align-items: center; gap: 12px; margin: 12px 0 8px; font-size: 14px; }\n#ui .w-rate span { color: var(--ink-dim); flex: none; }\n#ui .w-rate .w-bar { flex: 1; height: 12px; border-radius: 6px; }\n#ui .w-rate .w-bar i { border-radius: 5px; }\n#ui .w-rate b { width: 62px; text-align: right; font-size: 20px; color: #ffe08a; font-variant-numeric: tabular-nums; }\n#ui .w-rate.mid .w-bar i { background: linear-gradient(180deg, #ffb46a, #c9521e); } #ui .w-rate.mid b { color: #ffb46a; }\n#ui .w-rate.low .w-bar i { background: linear-gradient(180deg, #ff6a5a, #9e1414); } #ui .w-rate.low b { color: #ff7a6a; }\n#ui .w-risk { font-size: 13.5px; padding: 7px 12px 7px 34px; border-radius: 3px; position: relative; margin-bottom: 10px; }\n#ui .w-risk::before { content: ''; position: absolute; left: 12px; top: 50%; width: 10px; height: 10px; margin-top: -5px; transform: rotate(45deg); }\n#ui .w-risk.safe { color: #a8f0b8; background: rgba(40,120,60,.18); border: 1px solid rgba(110,220,140,.35); } #ui .w-risk.safe::before { background: #6fe08a; box-shadow: 0 0 8px #6fe08a; }\n#ui .w-risk.danger { color: #ffb0a4; background: rgba(140,30,20,.22); border: 1px solid rgba(255,110,90,.45); animation: w-danger 1.2s ease-in-out infinite; } #ui .w-risk.danger::before { background: #ff5a4a; box-shadow: 0 0 8px #ff5a4a; }\n@keyframes w-danger { 50% { background: rgba(170,30,20,.38); } }\n#ui .w-enw-mid { display: flex; gap: 10px; height: 96px; }\n#ui .w-mats { display: flex; flex-direction: column; gap: 6px; width: 214px; flex: none; }\n#ui .w-mat { display: flex; align-items: center; gap: 8px; height: 45px; padding: 0 10px 0 4px; font-size: 13px; }\n#ui .w-mat .w-slot { width: 36px; height: 36px; } #ui .w-mat b { margin-left: auto; font-size: 16px; color: #fff; font-variant-numeric: tabular-nums; }\n#ui .w-mat.zero b { color: #ff7a6a; } #ui .w-mat.use { border-color: rgba(255,214,130,.6); box-shadow: inset 0 0 12px rgba(255,190,80,.25); }\n#ui .w-log { flex: 1; padding: 5px 10px; font-size: 12.5px; color: var(--ink-dim); min-width: 0; }\n#ui .w-log div { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.52; }\n#ui .w-log div.ok { color: #ffe08a; } #ui .w-log div.bad { color: #ff8a7a; } #ui .w-log div.gone { color: #9aa0ad; }\n#ui .w-enw-foot { display: flex; align-items: center; gap: 14px; margin-top: 12px; }\n#ui .w-chk { display: flex; align-items: center; gap: 8px; font-size: 14px; cursor: pointer; pointer-events: auto; color: var(--ink); }\n#ui .w-chk i { width: 20px; height: 20px; border: 1px solid #b08a3e; border-radius: 3px; background: #07090e; box-shadow: inset 0 2px 4px #000; position: relative; flex: none; }\n#ui .w-chk.on i::after { content: ''; position: absolute; left: 6px; top: 1px; width: 6px; height: 12px; border: solid #ffe08a; border-width: 0 3px 3px 0; transform: rotate(42deg); filter: drop-shadow(0 0 4px #ffb23e); }\n#ui .w-go { margin-left: auto; width: 250px; height: 54px; font-size: 24px !important; letter-spacing: .4em !important; padding: 0 0 0 .4em !important; position: relative; overflow: hidden; }\n#ui .w-go::after { content: ''; position: absolute; inset: 0; background: linear-gradient(110deg, transparent 35%, rgba(255,255,255,.4) 50%, transparent 65%); background-size: 250% 100%; animation: w-sheen 2.4s ease-in-out infinite; }\n#ui .w-go:disabled { filter: grayscale(.9) brightness(.6); cursor: default; }\n#ui .w-enw.busy .w-go { pointer-events: none; filter: brightness(.6); }\n\n/* \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 \uC2A4\uD0AC / \uBB38\uD30C / \uC124\uC815 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n#ui .w-skw { width: 520px; } #ui .w-skl { max-height: 570px; padding: 4px; }\n#ui .w-skr { display: flex; align-items: center; gap: 12px; height: 70px; padding: 0 12px 0 8px; border-bottom: 1px solid rgba(255,255,255,.05); }\n#ui .w-skr:nth-child(odd) { background: rgba(255,255,255,.025); }\n#ui .w-skr .w-slot { width: 54px; height: 54px; border-radius: 50%; border-color: #8a6a2e; } #ui .w-skr .w-slot .w-ico { border-radius: 50%; inset: 0; } #ui .w-skr .w-slot::after { border-radius: 50%; }\n#ui .w-skr .n { flex: 1; min-width: 0; } #ui .w-skr .n b { font-size: 16px; color: #fff3cf; } #ui .w-skr .n em { font-style: normal; font-size: 12px; color: #9fd0ff; margin-left: 6px; }\n#ui .w-skr .n span { display: block; font-size: 12.5px; color: var(--ink-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }\n#ui .w-skr .m { text-align: right; font-size: 12.5px; color: var(--ink-dim); flex: none; } #ui .w-skr .m b { color: #7ecbff; } #ui .w-skr .m i { font-style: normal; color: #ffe08a; font-weight: 700; }\n#ui .w-key { display: inline-block; min-width: 26px; height: 24px; line-height: 22px; text-align: center; padding: 0 5px; border: 1px solid #6b5527; border-radius: 3px; background: #0a0c12; color: #ffe7a8; font-weight: 700; font-size: 13px; flex: none; }\n#ui .w-glw { width: 640px; }\n#ui .w-gl-top { display: flex; gap: 14px; align-items: center; padding: 10px 14px; margin-bottom: 10px; }\n#ui .w-crest { position: relative; width: 74px; height: 74px; flex: none; mix-blend-mode: screen; }\n#ui .w-gl-top .t b { font-family: 'GameSerif', serif; font-weight: 900; font-size: 26px; color: #fff3cf; text-shadow: 0 2px 3px #000; }\n#ui .w-gl-top .t em { font-style: normal; color: #9fd0ff; margin-left: 10px; font-size: 14px; } #ui .w-gl-top .t span { display: block; font-size: 13px; color: var(--ink-dim); margin-top: 3px; }\n#ui .w-gl-top .c { margin-left: auto; text-align: right; font-size: 13px; color: var(--ink-dim); } #ui .w-gl-top .c b { display: block; font-size: 22px; color: #7dff9a; }\n#ui .w-tbl { max-height: 380px; }\n#ui .w-tr { display: grid; grid-template-columns: 26px 1fr 60px 90px 96px 100px; align-items: center; height: 34px; padding: 0 12px; font-size: 14px; border-bottom: 1px solid rgba(255,255,255,.045); }\n#ui .w-tr.h { height: 30px; font-size: 12.5px; color: var(--gold); background: rgba(216,181,106,.09); border-bottom: 1px solid rgba(216,181,106,.3); letter-spacing: .08em; }\n#ui .w-tr .dot { width: 8px; height: 8px; border-radius: 50%; background: #50545f; } #ui .w-tr.on .dot { background: #5cf08a; box-shadow: 0 0 6px #5cf08a; }\n#ui .w-tr:not(.on):not(.h) { color: var(--ink-faint); } #ui .w-tr .r { text-align: right; font-variant-numeric: tabular-nums; } #ui .w-tr.me { background: rgba(255,214,130,.09); } #ui .w-tr .lord { color: #ffd27a; font-weight: 700; }\n#ui .w-stw { width: 470px; }\n#ui .w-set { display: flex; align-items: center; height: 44px; gap: 12px; font-size: 14.5px; border-bottom: 1px solid rgba(255,255,255,.05); }\n#ui .w-set > span { width: 130px; flex: none; color: var(--ink); } #ui .w-set > b { width: 44px; text-align: right; color: #ffe08a; font-variant-numeric: tabular-nums; }\n#ui .w-sld { position: relative; flex: 1; height: 22px; cursor: pointer; pointer-events: auto; }\n#ui .w-sld::before { content: ''; position: absolute; left: 0; right: 0; top: 8px; height: 6px; border-radius: 3px; background: #05070c; border: 1px solid rgba(255,255,255,.12); }\n#ui .w-sld i { position: absolute; left: 0; top: 8px; height: 6px; border-radius: 3px; background: linear-gradient(180deg, #ffe08a, #c98a1e); }\n#ui .w-sld u { position: absolute; top: 2px; width: 14px; height: 18px; margin-left: -7px; border-radius: 3px; border: 1px solid #f0cf7e; background: linear-gradient(180deg, #b8862a, #3d2906); box-shadow: 0 2px 4px #000; }\n#ui .w-seg { display: flex; flex: 1; border: 1px solid #6b5527; border-radius: 3px; overflow: hidden; }\n#ui .w-seg div { flex: 1; text-align: center; padding: 5px 0; font-size: 13.5px; color: var(--ink-dim); cursor: pointer; pointer-events: auto; background: rgba(0,0,0,.35); }\n#ui .w-seg div.on { background: linear-gradient(180deg, #b8862a, #4d340a); color: #fff8dc; font-weight: 700; }\n#ui .w-tgl { margin-left: auto; width: 50px; height: 24px; border-radius: 12px; border: 1px solid #6b5527; background: #07090e; position: relative; cursor: pointer; pointer-events: auto; box-shadow: inset 0 2px 4px #000; }\n#ui .w-tgl::after { content: ''; position: absolute; left: 2px; top: 2px; width: 18px; height: 18px; border-radius: 50%; background: #6b6f7c; transition: left .15s, background .15s; }\n#ui .w-tgl.on { background: linear-gradient(180deg, #5a4420, #2e210d); border-color: #f0cf7e; } #ui .w-tgl.on::after { left: 28px; background: #ffe08a; box-shadow: 0 0 8px #ffb23e; }\n\n/* \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 NPC \uB300\uD654 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n#ui .w-dlg { position: absolute; left: 310px; top: 742px; width: 1300px; height: 282px; pointer-events: auto; animation: w-dlg-in .28s cubic-bezier(.2,.9,.3,1.1) both;\n  background: linear-gradient(180deg, rgba(20,24,36,.95), rgba(8,10,16,.96)); border: 1px solid #9c7d3f; border-radius: 5px;\n  box-shadow: 0 18px 50px rgba(0,0,0,.75), 0 0 0 1px #000, inset 0 0 0 2px rgba(216,181,106,.13), inset 0 1px 0 rgba(255,236,170,.2); }\n@keyframes w-dlg-in { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: none; } }\n#ui .w-dlg-port { position: absolute; left: 26px; top: -56px; width: 236px; height: 236px; border-radius: 5px; background: #111 center/cover no-repeat;\n  border: 2px solid #c8a45a; box-shadow: 0 0 0 1px #000, 0 0 0 5px rgba(13,16,24,.9), 0 0 0 6px rgba(216,181,106,.5), 0 14px 30px rgba(0,0,0,.8); }\n#ui .w-dlg-port::after { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(255,255,255,.1), transparent 30%, rgba(0,0,0,.5)); border-radius: 3px; }\n#ui .w-dlg-name { position: absolute; left: 20px; top: 190px; width: 248px; height: 46px; display: flex; align-items: center; justify-content: center;\n  font-family: 'GameSerif', serif; font-weight: 900; font-size: 22px; color: #fff3cf; letter-spacing: .08em; text-shadow: 0 2px 3px #000;\n  background: linear-gradient(90deg, rgba(60,44,16,0), rgba(110,80,28,.95) 18%, rgba(110,80,28,.95) 82%, rgba(60,44,16,0)); border-top: 1px solid #f0cf7e; border-bottom: 1px solid #7a5a22; }\n#ui .w-dlg-role { position: absolute; left: 20px; top: 242px; width: 248px; text-align: center; font-size: 13px; color: var(--ink-dim); }\n#ui .w-dlg-text { position: absolute; left: 304px; top: 30px; width: 596px; max-height: 216px; padding-right: 10px; font-size: 21px; line-height: 36px; color: #f1ecdd; text-shadow: 0 1px 2px #000; white-space: pre-wrap; word-break: keep-all; overflow-wrap: anywhere; }\n#ui .w-dlg::before { content: '\u201C'; position: absolute; left: 270px; top: 6px; line-height: 1; font-family: 'GameSerif', serif; font-size: 54px; color: rgba(216,181,106,.5); pointer-events: none; }\n#ui .w-dlg-opts { position: absolute; right: 18px; top: 24px; width: 358px; max-height: 236px; padding: 0 6px 0 6px; overflow-x: hidden; display: flex; flex-direction: column; gap: 8px; }\n#ui .w-dlg-opts .w-opt { flex: none; }\n#ui .w-dlg.many .w-dlg-opts { gap: 5px; top: 18px; max-height: 246px; } #ui .w-dlg.many .w-opt { height: 36px; font-size: 16px; }\n#ui .w-dlg-text.more, #ui .w-dlg-opts.more { -webkit-mask: linear-gradient(180deg, #000 calc(100% - 34px), transparent); mask: linear-gradient(180deg, #000 calc(100% - 34px), transparent); }\n#ui .w-opt > span { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }\n#ui .w-opt { position: relative; height: 46px; padding: 0 16px 0 44px; display: flex; align-items: center; font-size: 17px; color: #f6e7bd; cursor: pointer; pointer-events: auto;\n  border: 1px solid #7a6030; border-radius: 3px; background: linear-gradient(90deg, rgba(90,68,32,.75), rgba(30,22,10,.6)); box-shadow: inset 0 1px 0 rgba(255,236,170,.2); text-shadow: 0 1px 2px #000; transition: transform .1s, filter .1s; }\n#ui .w-opt::before { content: ''; position: absolute; left: 18px; top: 50%; width: 9px; height: 9px; margin-top: -5px; background: #ffe08a; transform: rotate(45deg); box-shadow: 0 0 8px #ffb23e; }\n#ui .w-opt:hover { filter: brightness(1.35); transform: translateX(-4px); border-color: #f0cf7e; }\n#ui .w-opt.first { border-color: #f0cf7e; background: linear-gradient(90deg, rgba(184,134,42,.85), rgba(61,41,6,.7)); }\n#ui .w-opt kbd { margin-left: 10px; flex: none; font-family: inherit; font-size: 12px; color: var(--ink-dim); border: 1px solid rgba(255,255,255,.2); border-radius: 2px; padding: 0 5px; }\n\n/* \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 \uB808\uC774\uB4DC \uACB0\uACFC \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n#ui .w-raid-dim { position: absolute; inset: 0; background: radial-gradient(60% 60% at 50% 45%, rgba(40,26,6,.55), rgba(0,0,0,.8)); animation: w-fade .4s both; }\n@keyframes w-fade { from { opacity: 0; } }\n#ui .w-raid { position: absolute; left: 480px; top: 96px; width: 960px; pointer-events: auto; animation: w-raid-in .5s cubic-bezier(.2,.9,.3,1.1) both; }\n@keyframes w-raid-in { from { opacity: 0; transform: scale(1.12); filter: brightness(3); } }\n#ui .w-raid-ban { position: relative; height: 150px; text-align: center; }\n#ui .w-raid-ban::before { content: ''; position: absolute; left: 50%; top: -30px; width: 900px; height: 240px; margin-left: -450px; background: radial-gradient(50% 50% at 50% 50%, rgba(255,190,80,.5), rgba(255,140,30,.15) 45%, transparent 70%); }\n#ui .w-raid-rays { position: absolute; left: 50%; top: 70px; width: 760px; height: 760px; margin: -380px; border-radius: 50%; opacity: .5; animation: w-spin 40s linear infinite;\n  background: repeating-conic-gradient(from 0deg, rgba(255,214,130,.5) 0 4deg, transparent 0 14deg); -webkit-mask: radial-gradient(circle, transparent 0, rgba(0,0,0,.25) 20%, #000 40%, transparent 66%); mask: radial-gradient(circle, transparent 0, rgba(0,0,0,.25) 20%, #000 40%, transparent 66%); }\n#ui .w-raid-ban small { position: relative; display: block; font-family: 'GameSerif', serif; font-weight: 700; font-size: 20px; letter-spacing: .5em; padding-left: .5em; color: #ffe7a8; text-shadow: 0 2px 4px #000; padding-top: 4px; }\n#ui .w-raid-ban b { position: relative; display: block; font-size: 84px; line-height: 1.12; letter-spacing: .1em; }\n#ui .w-raid-ban span { position: relative; display: block; font-size: 17px; color: #f1ecdd; text-shadow: 0 1px 3px #000; margin-top: -2px; }\n#ui .w-raid-pan { position: relative; padding: 16px 20px 18px; margin-top: 18px;\n  background: linear-gradient(180deg, rgba(24,29,43,.96), rgba(11,14,21,.96)); border: 1px solid #9c7d3f; border-radius: 5px;\n  box-shadow: 0 18px 50px rgba(0,0,0,.7), 0 0 0 1px #000, inset 0 0 0 2px rgba(216,181,106,.13), inset 0 1px 0 rgba(255,236,170,.2); }\n#ui .w-rr { display: grid; grid-template-columns: 52px 250px 1fr 150px 70px; align-items: center; height: 44px; padding: 0 14px; font-size: 16px; border-bottom: 1px solid rgba(255,255,255,.05);\n  animation: w-rr-in .35s both; }\n@keyframes w-rr-in { from { opacity: 0; transform: translateX(-30px); } }\n#ui .w-rr .k { font-family: 'GameSerif', serif; font-weight: 900; font-size: 22px; color: var(--ink-dim); }\n#ui .w-rr.t1 .k { color: #ffd76a; text-shadow: 0 0 10px rgba(255,190,60,.8); font-size: 28px; } #ui .w-rr.t2 .k { color: #dfe6f2; } #ui .w-rr.t3 .k { color: #e09a5c; }\n#ui .w-rr .nm b { color: #fff; } #ui .w-rr .nm span { color: #7dff9a; font-size: 13.5px; margin-right: 6px; }\n#ui .w-rr .bar { height: 12px; border-radius: 6px; background: #05070c; border: 1px solid rgba(255,255,255,.1); overflow: hidden; margin-right: 16px; }\n#ui .w-rr .bar i { display: block; height: 100%; border-radius: 5px; background: linear-gradient(180deg, #ff9a5a, #b8321a); box-shadow: inset 0 1px 0 rgba(255,255,255,.4); transform-origin: left; animation: w-grow .8s .3s cubic-bezier(.2,.8,.2,1) both; }\n@keyframes w-grow { from { transform: scaleX(0); } }\n#ui .w-rr.t1 .bar i { background: linear-gradient(180deg, #ffe08a, #d0801e); }\n#ui .w-rr .d { text-align: right; font-weight: 700; font-variant-numeric: tabular-nums; color: #fff; } #ui .w-rr .d small { color: var(--ink-dim); font-weight: 400; font-size: 12.5px; margin-left: 6px; }\n#ui .w-rr.me { background: linear-gradient(90deg, rgba(255,214,130,.16), rgba(255,214,130,.03)); box-shadow: inset 3px 0 0 #ffd76a; }\n#ui .w-mvp { justify-self: end; font-family: 'GameSerif', serif; font-weight: 900; font-size: 15px; letter-spacing: .08em; color: #2a1802; padding: 2px 9px; border-radius: 3px;\n  background: linear-gradient(180deg, #fff3b8, #ffb72e 55%, #c97a10); box-shadow: 0 0 12px rgba(255,180,50,.9), inset 0 1px 0 #fff; animation: w-mvp 1.2s ease-in-out infinite; }\n@keyframes w-mvp { 50% { box-shadow: 0 0 22px rgba(255,200,80,1), inset 0 1px 0 #fff; } }\n#ui .w-raid-rank { max-height: 352px; } /* 8\uC904. \uB118\uC73C\uBA74 \uC2A4\uD06C\uB864, \uB0B4 \uC904\uC740 \uC544\uB798\uC5D0 \uB530\uB85C */\n#ui .w-rr.pin { border-top: 1px solid rgba(216,181,106,.45); border-bottom: 0; }\n#ui .w-raid-pan .w-sec em { order: 3; font-family: 'GameSans', sans-serif; font-style: normal; font-weight: 400; font-size: 12.5px; letter-spacing: 0; color: var(--ink-dim); }\n#ui .w-raid-none { padding: 14px; text-align: center; font-size: 14px; color: var(--ink-faint); width: 100%; }\n#ui .w-raid-loot { display: flex; gap: 12px; flex-wrap: wrap; padding: 12px 14px; max-height: 158px; }\n/* \uC2E4\uD328 \uBCC0\uD615: \uAE08\uBE5B \uAD11\uC120 \uB300\uC2E0 \uC2DD\uC740 \uC7AC\uBE5B\xB7\uBD89\uC740 \uD1A4 */\n#ui .w-raid-fail .w-raid-dim { background: radial-gradient(60% 60% at 50% 45%, rgba(34,8,8,.6), rgba(0,0,0,.86)); }\n#ui .w-raid-fail .w-raid-rays { display: none; }\n#ui .w-raid-fail .w-raid-ban::before { background: radial-gradient(50% 50% at 50% 50%, rgba(150,24,18,.42), rgba(70,10,10,.14) 45%, transparent 70%); }\n#ui .w-raid-fail .w-raid-ban small { color: #b9aea6; }\n#ui .w-raid-ft { font-family: 'GameSerif', serif; font-weight: 900; background: linear-gradient(180deg, #e9e2dc 0%, #b3423a 42%, #5a0d0d 80%, #2a0404 100%); -webkit-background-clip: text; background-clip: text; color: transparent;\n  filter: drop-shadow(0 3px 0 #000) drop-shadow(0 0 26px rgba(200,30,20,.45)); }\n#ui .w-raid-fail .w-raid { animation-name: w-raid-in-f; }\n@keyframes w-raid-in-f { from { opacity: 0; transform: translateY(-18px); filter: brightness(.3); } }\n#ui .w-raid-fail .w-raid-pan { border-color: #6d5a52; filter: saturate(.55); }\n#ui .w-raid-fail .w-mvp { animation: none; box-shadow: none; }\n#ui .w-lt { display: flex; align-items: center; gap: 10px; height: 60px; padding: 0 16px 0 6px; min-width: 200px; border: 1px solid rgba(255,255,255,.08); border-radius: 3px; background: rgba(255,255,255,.03); animation: w-lt-in .4s both; }\n@keyframes w-lt-in { from { opacity: 0; transform: translateY(16px) scale(.9); } }\n#ui .w-lt .w-slot { width: 48px; height: 48px; } #ui .w-lt b { font-size: 15.5px; } #ui .w-lt span { display: block; font-size: 12px; color: var(--ink-dim); }\n#ui .w-raid-foot { display: flex; justify-content: center; margin-top: 16px; } #ui .w-raid-foot .btn { width: 240px; height: 48px; font-size: 20px; }\n\n/* \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 \uC0AC\uB9DD \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n#ui .w-death { position: absolute; inset: 0; pointer-events: auto; animation: w-fade 1s both;\n  background: radial-gradient(70% 60% at 50% 48%, rgba(40,0,0,.35), rgba(10,0,0,.82) 70%, rgba(0,0,0,.95)); backdrop-filter: grayscale(.85) brightness(.75) blur(1.5px); }\n#ui .w-death::before { content: ''; position: absolute; inset: 0; box-shadow: inset 0 0 260px 60px rgba(120,0,0,.55); animation: w-dpulse 2.6s ease-in-out infinite; }\n@keyframes w-dpulse { 50% { opacity: .55; } }\n#ui .w-death-c { position: absolute; left: 0; right: 0; top: 330px; text-align: center; }\n#ui .w-death-line { width: 620px; height: 1px; margin: 0 auto; background: linear-gradient(90deg, transparent, #b33, transparent); }\n#ui .w-death-t { font-family: 'GameSerif', serif; font-weight: 900; font-size: 110px; letter-spacing: .22em; padding-left: .22em; line-height: 1.4;\n  background: linear-gradient(180deg, #ffe2d8 0%, #e8564a 38%, #7c0d0d 78%, #3a0404 100%); -webkit-background-clip: text; background-clip: text; color: transparent;\n  filter: drop-shadow(0 4px 0 #000) drop-shadow(0 0 30px rgba(255,40,30,.55)); animation: w-death-t 1.6s cubic-bezier(.2,.8,.2,1) both; }\n@keyframes w-death-t { from { opacity: 0; letter-spacing: .6em; filter: blur(12px); } }\n#ui .w-death-s { font-size: 20px; color: #d8cfc4; text-shadow: 0 1px 3px #000; margin-top: 22px; animation: w-fade 1s .8s both; }\n#ui .w-death-p { font-size: 15px; color: #a59a90; margin-top: 8px; animation: w-fade 1s 1s both; }\n#ui .w-death-cd { margin: 34px auto 0; font-size: 16px; color: #ffcfc4; animation: w-fade 1s 1.2s both; } #ui .w-death-cd b { font-size: 30px; color: #fff; margin: 0 2px 0 0; font-variant-numeric: tabular-nums; }\n#ui .w-death-b { margin-top: 18px; width: 320px; height: 62px; font-size: 24px !important; animation: w-fade 1s 1.3s both; }\n\n/* \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 \uC804\uCCB4 \uD654\uBA74: \uB85C\uB529\xB7\uD0C0\uC774\uD2C0\xB7\uC5D4\uB529 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n#ui .w-scr { position: absolute; inset: 0; pointer-events: auto; background: #05060a; overflow: hidden; transition: opacity .5s; }\n#ui .w-scr.out { opacity: 0; pointer-events: none; }\n#ui .w-bg { position: absolute; inset: -40px; background: #0a0c12 center 38%/cover no-repeat; animation: w-ken 28s ease-in-out infinite alternate; }\n@keyframes w-ken { from { transform: scale(1.0) translate(0, 0); } to { transform: scale(1.07) translate(-18px, -8px); } }\n#ui .w-shade { position: absolute; inset: 0; }\n#ui .w-embers { position: absolute; inset: 0; overflow: hidden; }\n#ui .w-embers i { position: absolute; bottom: -20px; width: 4px; height: 4px; border-radius: 50%; background: #ffd27a; box-shadow: 0 0 8px 2px rgba(255,150,40,.9); animation: w-ember linear infinite; opacity: 0; }\n@keyframes w-ember { 0% { transform: translate(0, 0) scale(1); opacity: 0; } 10% { opacity: 1; } 80% { opacity: .8; } 100% { transform: translate(var(--dx), -1150px) scale(.3); opacity: 0; } }\n/* \uB85C\uACE0 */\n#ui .w-logo { position: relative; text-align: center; }\n#ui .w-logo-crest { width: 120px; height: 34px; margin: 0 auto -6px; background:\n  linear-gradient(90deg, transparent, #d8b56a 45%, transparent 45% 55%, #d8b56a 55%, transparent) center/100% 1px no-repeat,\n  conic-gradient(from 45deg at 50% 50%, #fff3cf 0 25%, #a87a2c 0 50%, #ffe7a8 0 75%, #8a6a2e 0) center/14px 14px no-repeat; }\n#ui .w-logo-main { font-family: 'GameSerif', serif; font-weight: 900; font-size: 176px; line-height: 1.16; letter-spacing: .06em; padding-left: .06em; white-space: nowrap; position: relative;\n  background: linear-gradient(180deg, #fffbe6 0%, #ffe9a6 18%, #f2bf52 38%, #a8701c 52%, #6b430e 60%, #d9a544 74%, #fff0b4 88%, #b8802a 100%);\n  -webkit-background-clip: text; background-clip: text; color: transparent;\n  filter: drop-shadow(0 2px 0 #3a2305) drop-shadow(0 5px 0 rgba(0,0,0,.9)) drop-shadow(0 0 34px rgba(255,170,50,.45)); }\n#ui .w-logo-main::after { content: attr(data-t); position: absolute; left: 0; top: 0; right: 0; padding-left: .06em; -webkit-background-clip: text; background-clip: text; color: transparent;\n  background-image: linear-gradient(112deg, transparent 42%, rgba(255,255,255,.95) 50%, transparent 58%); background-size: 260% 100%; background-repeat: no-repeat; animation: w-logo-sheen 5s ease-in-out infinite; }\n@keyframes w-logo-sheen { 0%, 60% { background-position: 130% 0; } 100% { background-position: -70% 0; } }\n#ui .w-logo-sub { display: flex; align-items: center; justify-content: center; gap: 20px; margin-top: -8px; font-family: 'GameSerif', serif; font-weight: 700; font-size: 40px; letter-spacing: .62em; padding-left: .62em; color: #f6ecd0; text-shadow: 0 2px 0 #000, 0 0 18px rgba(255,200,110,.65); white-space: nowrap; }\n#ui .w-logo-sub::before, #ui .w-logo-sub::after { content: ''; width: 130px; height: 11px; margin-left: -.62em; flex: none;\n  background: linear-gradient(90deg, transparent, #e8c77a) left center / calc(100% - 16px) 2px no-repeat, conic-gradient(from 45deg at 50% 50%, #fff3cf 0 25%, #a87a2c 0 50%, #ffe7a8 0 75%, #8a6a2e 0) right center / 10px 10px no-repeat; }\n#ui .w-logo-sub::after { transform: scaleX(-1); margin-left: 0; }\n#ui .w-logo-en { margin-top: 10px; font-family: 'GameSerif', serif; font-size: 15px; letter-spacing: .5em; padding-left: .5em; color: rgba(240,220,170,.7); text-shadow: 0 1px 2px #000; }\n#ui .w-logo.sm .w-logo-main { font-size: 120px; } #ui .w-logo.sm .w-logo-sub { font-size: 28px; }\n/* \uB85C\uB529 */\n#ui .w-load .w-shade { background: radial-gradient(90% 70% at 50% 42%, rgba(0,0,0,.0), rgba(0,0,0,.55) 75%), linear-gradient(180deg, rgba(4,5,10,.55) 0%, rgba(4,5,10,.05) 30%, rgba(4,5,10,.25) 58%, rgba(4,5,10,.97) 100%); }\n#ui .w-load .w-logo { position: absolute; left: 80px; top: 64px; text-align: left; transform-origin: left top; }\n#ui .w-load .w-logo .w-logo-crest { display: none; } #ui .w-load .w-logo .w-logo-main { font-size: 104px; } #ui .w-load .w-logo .w-logo-sub { justify-content: flex-start; font-size: 24px; margin-top: -4px; } #ui .w-load .w-logo .w-logo-sub::before { display: none; } #ui .w-load .w-logo .w-logo-en { display: none; }\n#ui .w-load-b { position: absolute; left: 160px; right: 160px; bottom: 74px; }\n#ui .w-load-tip { text-align: center; font-size: 19px; color: #f1ecdd; text-shadow: 0 1px 3px #000, 0 0 12px #000; margin-bottom: 26px; }\n#ui .w-load-tip b { font-family: 'GameSerif', serif; color: #ffd98a; margin-right: 12px; letter-spacing: .1em; padding: 2px 10px; border: 1px solid rgba(216,181,106,.6); border-radius: 2px; background: rgba(40,28,8,.6); font-size: 15px; vertical-align: 2px; }\n#ui .w-load-row { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 8px; font-size: 16px; color: #d9d3c2; text-shadow: 0 1px 2px #000; }\n#ui .w-load-row b { font-family: 'GameSerif', serif; font-weight: 900; font-size: 30px; color: #ffe08a; font-variant-numeric: tabular-nums; }\n#ui .w-load-bar { position: relative; height: 14px; border-radius: 7px; background: rgba(2,3,6,.85); border: 1px solid #8a6a2e; box-shadow: 0 0 0 1px #000, inset 0 2px 5px #000, 0 0 20px rgba(0,0,0,.6); }\n#ui .w-load-bar i { position: absolute; left: 1px; top: 1px; bottom: 1px; width: 0; border-radius: 6px; transition: width .25s ease-out;\n  background: linear-gradient(180deg, #fff3b8 0%, #ffc94e 40%, #c47a12 100%); box-shadow: 0 0 14px rgba(255,180,50,.9), inset 0 1px 0 rgba(255,255,255,.7); overflow: visible; }\n#ui .w-load-bar i::after { content: ''; position: absolute; right: -9px; top: 50%; width: 18px; height: 18px; margin-top: -9px; border-radius: 50%; background: radial-gradient(circle, #fff 0, #ffe08a 35%, rgba(255,170,40,0) 70%); }\n#ui .w-load-bar::before, #ui .w-load-bar::after { content: ''; position: absolute; top: 50%; width: 12px; height: 12px; margin-top: -6px; background: linear-gradient(135deg, #ffe7a8, #8a6a2e); transform: rotate(45deg); box-shadow: 0 0 0 1px #000; z-index: 2; }\n#ui .w-load-bar::before { left: -7px; } #ui .w-load-bar::after { right: -7px; }\n/* \uD0C0\uC774\uD2C0 */\n#ui .w-title .w-shade { background:\n  linear-gradient(90deg, rgba(4,5,12,.82) 0%, rgba(4,5,12,.6) 30%, rgba(4,5,12,.1) 56%, rgba(4,5,12,0) 100%),\n  linear-gradient(180deg, rgba(4,5,10,.45) 0%, rgba(4,5,10,0) 22%, rgba(4,5,10,0) 70%, rgba(4,5,10,.92) 100%); }\n#ui .w-title-col { position: absolute; left: 70px; top: 150px; width: 860px; display: flex; flex-direction: column; align-items: center; }\n#ui .w-title .w-logo { animation: w-logo-in 1.2s cubic-bezier(.2,.8,.2,1) both; }\n@keyframes w-logo-in { from { opacity: 0; transform: scale(1.12); filter: blur(8px) brightness(2.5); } }\n#ui .w-srv { margin-top: 56px; width: 460px; height: 62px; display: flex; align-items: center; gap: 12px; padding: 0 18px; cursor: pointer; pointer-events: auto;\n  background: linear-gradient(180deg, rgba(22,27,40,.9), rgba(10,12,19,.9)); border: 1px solid var(--gold-line); border-radius: 4px; box-shadow: 0 8px 22px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.07); animation: w-up .6s .5s both; }\n@keyframes w-up { from { opacity: 0; transform: translateY(18px); } }\n#ui .w-srv:hover { border-color: #f0cf7e; }\n#ui .w-srv .l { font-size: 12.5px; color: var(--ink-dim); line-height: 1.2; border-right: 1px solid rgba(255,255,255,.12); padding-right: 12px; }\n#ui .w-srv .dot { width: 10px; height: 10px; border-radius: 50%; flex: none; }\n#ui .w-srv .n { font-family: 'GameSerif', serif; font-weight: 700; font-size: 22px; color: #fff3cf; }\n#ui .w-srv .s { font-size: 14px; font-weight: 700; padding: 1px 9px; border-radius: 10px; border: 1px solid currentColor; }\n#ui .w-srv .ch { margin-left: auto; font-size: 13px; color: var(--ink-dim); } #ui .w-srv .ch::after { content: ''; display: inline-block; width: 7px; height: 7px; border: solid var(--gold); border-width: 0 2px 2px 0; transform: rotate(-45deg); margin-left: 8px; }\n#ui .w-srv-last { margin-top: 10px; font-size: 14px; color: #cfc8b6; text-shadow: 0 1px 2px #000; animation: w-up .6s .6s both; } #ui .w-srv-last b { color: #7dff9a; font-weight: 500; }\n#ui .w-tbtn { position: relative; margin-top: 24px; width: 460px; height: 78px; font-size: 32px !important; letter-spacing: .34em !important; padding: 0 0 0 .34em !important; border-width: 1px; overflow: hidden; animation: w-up .6s .7s both; }\n#ui .w-tbtn::before { content: ''; position: absolute; inset: 3px; border: 1px solid rgba(255,236,170,.35); border-radius: 2px; }\n#ui .w-tbtn::after { content: ''; position: absolute; inset: 0; background: linear-gradient(110deg, transparent 38%, rgba(255,255,255,.45) 50%, transparent 62%); background-size: 250% 100%; animation: w-sheen 2.8s ease-in-out infinite; }\n#ui .w-tbtn.sub { margin-top: 12px; height: 54px; font-size: 19px !important; letter-spacing: .2em !important; animation-delay: .8s; }\n#ui .w-tbtn.sub::after { display: none; }\n#ui .w-title-foot { position: absolute; left: 60px; right: 60px; bottom: 34px; display: flex; align-items: center; gap: 18px; font-size: 13px; color: #b9b3a3; text-shadow: 0 1px 2px #000; line-height: 1.6; }\n#ui .w-rating { width: 64px; height: 74px; flex: none; border: 2px solid #d8b56a; border-radius: 4px; background: rgba(10,12,18,.8); display: flex; flex-direction: column; align-items: center; justify-content: center; line-height: 1.1; }\n#ui .w-rating b { font-family: 'GameSerif', serif; font-weight: 900; font-size: 26px; color: #ffe08a; } #ui .w-rating span { font-size: 10.5px; color: #d8b56a; letter-spacing: .05em; margin-top: 2px; }\n#ui .w-title-foot .v { margin-left: auto; text-align: right; }\n/* \uC5D4\uB529 */\n#ui .w-end .w-bg { filter: saturate(.7) brightness(.5); }\n#ui .w-end .w-shade { background: radial-gradient(70% 70% at 50% 45%, rgba(4,5,10,.35), rgba(4,5,10,.96) 85%); }\n#ui .w-end-c { position: absolute; left: 0; right: 0; top: 110px; display: flex; flex-direction: column; align-items: center; }\n#ui .w-end .w-logo { animation: w-logo-in 1.6s cubic-bezier(.2,.8,.2,1) both; }\n#ui .w-end-lines { margin-top: 40px; min-width: 760px; padding: 22px 46px; border-top: 1px solid rgba(216,181,106,.5); border-bottom: 1px solid rgba(216,181,106,.5);\n  background: linear-gradient(90deg, transparent, rgba(10,12,18,.72) 20%, rgba(10,12,18,.72) 80%, transparent); }\n#ui .w-end-line { text-align: center; font-size: 22px; line-height: 2; color: #efe9d8; text-shadow: 0 1px 3px #000; animation: w-up .8s both; }\n#ui .w-end-line b { color: #ffe08a; }\n#ui .w-end-thx { margin-top: 36px; font-family: 'GameSerif', serif; font-weight: 700; font-size: 26px; letter-spacing: .4em; padding-left: .4em; color: #ffe7a8; text-shadow: 0 2px 4px #000, 0 0 18px rgba(255,190,90,.6); animation: w-up 1s both; }\n#ui .w-end-foot { margin-top: 12px; font-size: 14px; color: #9c968a; animation: w-up 1s both; }\n\n/* \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 \uAC15\uD654 \uC5F0\uCD9C \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n#ui .w-enh { opacity: 0; transition: opacity .22s; }\n#ui .w-enh.on { opacity: 1; }\n#ui .w-enh-dim { position: absolute; inset: 0; background: radial-gradient(55% 60% at 50% 42%, rgba(22,14,4,.95), rgba(0,0,0,.96) 75%); }\n#ui .w-enh-grey { position: absolute; inset: 0; opacity: 0; background: rgba(30,32,37,.5); transition: opacity .9s; } /* \uB4A4\uB294 \uC774\uBBF8 \uAC70\uC758 \uAC00\uB824\uC838 \uC788\uC5B4 backdrop-filter \uC5C6\uC774 \uC7AC\uBE5B \uB36E\uAC1C\uB9CC \uC4F4\uB2E4 */\n#ui .w-enh.k-destroy.res .w-enh-grey { opacity: 1; }\n#ui .w-enh.k-fail.res .w-enh-dim { background: radial-gradient(55% 60% at 50% 42%, rgba(62,5,3,.93), rgba(0,0,0,.96) 75%); }\n#ui .w-enh-stage { position: absolute; left: 960px; top: 440px; width: 0; height: 0; }\n#ui .w-enh-stage > * { position: absolute; }\n#ui .w-enh-circle { left: -260px; top: -260px; width: 520px; height: 520px; border-radius: 50%; animation: w-spin 9s linear infinite; opacity: .9;\n  background: repeating-conic-gradient(from 0deg, rgba(255,214,130,.75) 0 1deg, transparent 0 10deg);\n  -webkit-mask: radial-gradient(circle, transparent 0 196px, #000 197px 212px, transparent 213px 222px, #000 223px 226px, transparent 227px 252px, #000 253px 255px, transparent 256px);\n  mask: radial-gradient(circle, transparent 0 196px, #000 197px 212px, transparent 213px 222px, #000 223px 226px, transparent 227px 252px, #000 253px 255px, transparent 256px); }\n#ui .w-enh-circle.b { left: -170px; top: -170px; width: 340px; height: 340px; animation: w-spin 5s linear infinite reverse;\n  background: repeating-conic-gradient(from 0deg, rgba(255,235,180,.9) 0 4deg, transparent 0 45deg), repeating-conic-gradient(from 22.5deg, rgba(255,190,90,.5) 0 1deg, transparent 0 9deg);\n  -webkit-mask: radial-gradient(circle, transparent 0 140px, #000 141px 150px, transparent 151px 160px, #000 161px 164px, transparent 165px);\n  mask: radial-gradient(circle, transparent 0 140px, #000 141px 150px, transparent 151px 160px, #000 161px 164px, transparent 165px); }\n#ui .w-enh.res .w-enh-circle { transition: opacity .4s, filter .4s; }\n#ui .w-enh.k-fail.res .w-enh-circle { filter: hue-rotate(-40deg) saturate(2.4) brightness(.7); opacity: .45; animation-play-state: paused; }\n#ui .w-enh.k-destroy.res .w-enh-circle { filter: grayscale(1) brightness(.6); opacity: .25; animation-play-state: paused; }\n#ui .w-enh-aura { left: -230px; top: -230px; width: 460px; height: 460px; border-radius: 50%; background: radial-gradient(circle, rgba(255,214,130,.55) 0, rgba(255,150,40,.2) 40%, transparent 68%); transform: scale(.4); opacity: 0; }\n#ui .w-enh-rays { left: -700px; top: -700px; width: 1400px; height: 1400px; border-radius: 50%; opacity: 0; animation: w-spin 14s linear infinite;\n  background: repeating-conic-gradient(from 0deg, rgba(255,236,170,.85) 0 3deg, transparent 0 9deg, rgba(255,200,90,.5) 0 10.5deg, transparent 0 20deg);\n  -webkit-mask: radial-gradient(circle, #000 0, rgba(0,0,0,.6) 30%, transparent 66%); mask: radial-gradient(circle, #000 0, rgba(0,0,0,.6) 30%, transparent 66%); }\n#ui .w-enh-flare { left: -900px; top: -5px; width: 1800px; height: 10px; opacity: 0; border-radius: 50%; background: radial-gradient(50% 50% at 50% 50%, #fff 0, rgba(255,226,140,.9) 20%, rgba(255,170,50,0) 70%); filter: blur(1px); }\n#ui .w-enh-flare.v { transform: rotate(90deg); }\n#ui .w-enh-ring { left: -100px; top: -100px; width: 200px; height: 200px; border-radius: 50%; border: 6px solid #ffe7a8; box-shadow: 0 0 30px 6px rgba(255,190,70,.9), inset 0 0 30px 6px rgba(255,190,70,.7); opacity: 0; }\n#ui .w-enh.k-fail .w-enh-ring { border-color: #ff6a5a; box-shadow: 0 0 30px 6px rgba(255,50,30,.9), inset 0 0 30px 6px rgba(255,50,30,.7); }\n#ui .w-enh.k-destroy .w-enh-ring { border-color: #e8eef8; box-shadow: 0 0 30px 6px rgba(200,215,240,.8), inset 0 0 30px 6px rgba(200,215,240,.6); }\n#ui .w-enh-itemwrap { left: -100px; top: -100px; width: 200px; height: 200px; }\n#ui .w-enh-item { position: absolute; inset: 0; border-radius: 8px; border: 2px solid #e8c77a; overflow: hidden;\n  background: radial-gradient(circle at 50% 35%, #2a3246 0%, #131826 62%, #090c14 100%);\n  box-shadow: 0 0 0 1px #000, 0 0 0 5px rgba(13,16,24,.85), 0 0 0 6px rgba(216,181,106,.6), 0 0 50px rgba(255,180,60,.55), inset 0 0 30px rgba(255,190,80,.3); }\n#ui .w-enh-item .w-ico { inset: 4px; }\n#ui .w-enh-item .w-enh-heat { position: absolute; inset: 0; background: radial-gradient(circle, rgba(255,255,255,.95), rgba(255,220,130,.8) 45%, rgba(255,150,40,.2) 80%); opacity: 0; mix-blend-mode: screen; }\n#ui .w-enh.k-success.res .w-enh-item { border-color: #fff3cf; box-shadow: 0 0 0 1px #000, 0 0 0 5px rgba(60,40,8,.85), 0 0 0 7px #ffe08a, 0 0 90px 20px rgba(255,190,70,.95), inset 0 0 40px rgba(255,220,130,.7); }\n#ui .w-enh.k-fail.res .w-enh-item { border-color: #a23328; box-shadow: 0 0 0 1px #000, 0 0 0 5px rgba(30,6,4,.9), 0 0 0 6px rgba(190,50,40,.7), 0 0 60px rgba(255,30,20,.5), inset 0 0 50px rgba(120,0,0,.8); }\n#ui .w-enh.k-fail.res .w-enh-item .w-ico { filter: saturate(.35) brightness(.55) sepia(.5) hue-rotate(-30deg); transition: filter .25s; }\n#ui .w-enh.k-destroy.gone .w-enh-item { border-color: #4a4e58; box-shadow: 0 0 0 1px #000, 0 0 0 5px rgba(10,11,14,.9), 0 0 0 6px rgba(90,94,104,.5), inset 0 0 60px #000; background: radial-gradient(circle, #050608, #0c0d10); transition: all .4s; }\n#ui .w-enh.k-destroy.gone .w-enh-item .w-ico { opacity: 0; }\n#ui .w-enh-cracks { left: -320px; top: -320px; width: 640px; height: 640px; overflow: visible; pointer-events: none; }\n#ui .w-enh-cracks path { fill: none; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 1; stroke-dashoffset: 1; }\n#ui .w-enh-cracks path.g { stroke: #ff3a22; stroke-width: 7; opacity: .75; filter: blur(3px); }\n#ui .w-enh-cracks path.c { stroke: #ffe9df; stroke-width: 2.2; }\n#ui .w-enh.k-destroy .w-enh-cracks path.g { stroke: #9fc4ff; } #ui .w-enh.k-destroy .w-enh-cracks path.c { stroke: #fff; }\n#ui .w-enh-shards { left: -100px; top: -100px; width: 200px; height: 200px; }\n#ui .w-enh-shards i { position: absolute; inset: 0; background-repeat: no-repeat; will-change: transform, opacity; }\n#ui .w-enh-hammer { left: 60px; top: -250px; width: 200px; height: 200px; transform-origin: 190px 190px; transform: rotate(38deg); opacity: 0; }\n#ui .w-enh-hammer .hl { position: absolute; left: 52px; top: 62px; width: 150px; height: 16px; border-radius: 8px; transform-origin: 0 50%; transform: rotate(45deg);\n  background: linear-gradient(180deg, #a7733c, #5a3514 60%, #2c1806); box-shadow: 0 0 0 1px #000, inset 0 2px 0 rgba(255,220,170,.35); }\n#ui .w-enh-hammer .hd { position: absolute; left: 6px; top: 22px; width: 104px; height: 62px; border-radius: 6px; transform: rotate(-45deg);\n  background: linear-gradient(180deg, #eef2f8 0%, #9aa3b4 30%, #4a5262 62%, #1f2430 100%); box-shadow: 0 0 0 1px #000, inset 0 3px 0 rgba(255,255,255,.6), inset 0 -8px 12px rgba(0,0,0,.5), 0 0 24px rgba(255,190,80,.6); }\n#ui .w-enh-hammer .hd::before { content: ''; position: absolute; left: 40px; top: -3px; width: 24px; height: 68px; background: linear-gradient(180deg, #ffe7a8, #a87a2c 50%, #5a3d10); box-shadow: 0 0 0 1px #000; }\n#ui .w-enh-head { left: -400px; top: -330px; width: 800px; text-align: center; }\n#ui .w-enh-head small { display: block; font-family: 'GameSerif', serif; font-weight: 700; font-size: 18px; letter-spacing: .6em; padding-left: .6em; color: #ffd98a; text-shadow: 0 2px 3px #000; }\n#ui .w-enh-head b { display: block; font-family: 'GameSerif', serif; font-weight: 900; font-size: 30px; text-shadow: 0 2px 4px #000, 0 0 16px rgba(0,0,0,.8); margin-top: 2px; }\n#ui .w-enh-plus { left: -200px; top: 122px; width: 400px; height: 86px; text-align: center; }\n#ui .w-enh-plus b { position: absolute; left: 0; right: 0; top: 0; font-family: 'GameSerif', serif; font-weight: 900; font-size: 68px; line-height: 86px; color: #f1ecdd; text-shadow: 0 4px 0 #000, 0 0 20px rgba(255,255,255,.3); font-variant-numeric: tabular-nums; }\n#ui .w-enh-plus b.to { opacity: 0; background: linear-gradient(180deg, #fffbe6, #ffd76a 45%, #c27f1e); -webkit-background-clip: text; background-clip: text; color: transparent; text-shadow: none; filter: drop-shadow(0 4px 0 #000) drop-shadow(0 0 26px rgba(255,190,70,1)); }\n#ui .w-enh.k-fail.res .w-enh-plus b.from { color: #b9655a; text-shadow: 0 4px 0 #000, 0 0 20px rgba(255,40,20,.6); transition: color .3s; }\n#ui .w-enh.k-destroy.gone .w-enh-plus b.from { color: #5a5d66; text-shadow: 0 4px 0 #000; text-decoration: line-through; text-decoration-thickness: 4px; transition: color .5s; }\n#ui .w-enh-gauge { left: -190px; top: 222px; width: 380px; height: 16px; border-radius: 8px; background: rgba(2,3,6,.9); border: 1px solid #8a6a2e; box-shadow: 0 0 0 1px #000, inset 0 2px 5px #000; }\n#ui .w-enh-gauge i { position: absolute; left: 1px; top: 1px; bottom: 1px; width: 0; border-radius: 7px; transition: width .14s cubic-bezier(.2,.9,.3,1);\n  background: linear-gradient(180deg, #fff3b8, #ffc94e 40%, #c47a12); box-shadow: 0 0 16px rgba(255,180,50,1), inset 0 1px 0 rgba(255,255,255,.7); }\n#ui .w-enh-gauge u { position: absolute; top: -3px; bottom: -3px; width: 2px; background: #8a6a2e; } #ui .w-enh-gauge u.a { left: 33.3%; } #ui .w-enh-gauge u.b { left: 66.6%; }\n#ui .w-enh.res .w-enh-gauge { transition: opacity .3s; opacity: 0; }\n#ui .w-enh.k-fail.res .w-enh-gauge i, #ui .w-enh.k-destroy.res .w-enh-gauge i { background: linear-gradient(180deg, #ff8a7a, #9e1414); box-shadow: 0 0 16px rgba(255,40,20,1); }\n#ui .w-enh canvas { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; }\n#ui .w-enh-flash { position: absolute; inset: 0; opacity: 0; }\n#ui .w-enh-vig { position: absolute; inset: 0; opacity: 0; box-shadow: inset 0 0 300px 80px rgba(200,0,0,.75); }\n#ui .w-enh-result { position: absolute; left: 0; right: 0; top: 716px; text-align: center; }\n#ui .w-enh-big { display: inline-block; font-family: 'GameSerif', serif; font-weight: 900; font-size: 136px; line-height: 1.15; letter-spacing: .12em; padding-left: .12em; opacity: 0; white-space: nowrap; }\n#ui .w-enh.k-success .w-enh-big { background: linear-gradient(180deg, #ffffff 0%, #fff0b0 22%, #ffc94e 45%, #b06a12 62%, #ffd76a 80%, #fff6d0 100%); -webkit-background-clip: text; background-clip: text; color: transparent;\n  filter: drop-shadow(0 3px 0 #5a3505) drop-shadow(0 7px 0 rgba(0,0,0,.9)) drop-shadow(0 0 40px rgba(255,180,50,.95)); }\n#ui .w-enh.k-fail .w-enh-big { background: linear-gradient(180deg, #ffd9d0 0%, #ff5a46 35%, #9a1010 68%, #3d0303 100%); -webkit-background-clip: text; background-clip: text; color: transparent;\n  filter: drop-shadow(0 3px 0 #2a0000) drop-shadow(0 7px 0 rgba(0,0,0,.95)) drop-shadow(0 0 34px rgba(255,30,20,.8)); }\n#ui .w-enh.k-destroy .w-enh-big { font-size: 84px; letter-spacing: .2em; padding-left: .2em; color: #c4c8d0; text-shadow: 0 3px 0 #000, 0 0 30px rgba(180,190,210,.35); font-weight: 700; }\n#ui .w-enh-sub { margin-top: 4px; font-size: 26px; color: #f6ecd0; text-shadow: 0 2px 3px #000, 0 0 14px #000; opacity: 0; }\n#ui .w-enh-sub b { font-family: 'GameSerif', serif; font-weight: 900; font-size: 34px; margin: 0 6px; }\n#ui .w-enh.k-success .w-enh-sub b.t { color: #ffd76a; text-shadow: 0 2px 0 #000, 0 0 18px rgba(255,180,50,1); font-size: 44px; }\n#ui .w-enh.k-success .w-enh-sub i { font-style: normal; color: #ffd76a; margin: 0 6px; }\n#ui .w-enh.k-fail .w-enh-sub { color: #ffb8ac; } #ui .w-enh.k-destroy .w-enh-sub { color: #d3d7df; font-size: 23px; letter-spacing: .08em; text-shadow: 0 2px 3px #000, 0 0 12px #000; }\n#ui .w-shake { animation: w-shake .55s linear both; }\n@keyframes w-shake { 0% { transform: translate(0,0) rotate(0); } 8% { transform: translate(-22px, 10px) rotate(-.8deg); } 16% { transform: translate(20px, -12px) rotate(.9deg); } 24% { transform: translate(-18px, -8px) rotate(-.6deg); }\n  34% { transform: translate(15px, 9px) rotate(.5deg); } 46% { transform: translate(-11px, 5px) rotate(-.35deg); } 58% { transform: translate(8px, -5px) rotate(.25deg); } 72% { transform: translate(-5px, 3px); } 86% { transform: translate(3px, -2px); } 100% { transform: none; } }\n\n/* \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 \uC800\uC0AC\uC591(\uADF8\uB798\uD53D \uD488\uC9C8 \uB0AE\uC74C): backdrop-filter \uB300\uC2E0 \uBD88\uD22C\uBA85 \uB36E\uAC1C \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n#ui.w-lowfx .w-death { backdrop-filter: none; background: radial-gradient(70% 60% at 50% 48%, rgba(46,18,18,.8), rgba(14,4,4,.93) 70%, rgba(0,0,0,.97)); }\n";

  // game/src/ui/windows.js
  var SHEETS = {
    item: { key: "ui/item_icons.png", cols: 4, rows: 4, inset: 0.085 },
    skill: { key: "ui/skill_icons.png", cols: 3, rows: 3, inset: 0.035 },
    crest: { key: "ui/guild_crests.png", cols: 3, rows: 2, inset: 0.03 }
  };
  var RARITY = { common: "\uC77C\uBC18", rare: "\uD76C\uADC0", epic: "\uC601\uC6C5", legend: "\uC804\uC124" };
  var TIPS = [
    "\uAC15\uD654\uB294 +6\uAE4C\uC9C0 \uC548\uC804\uD569\uB2C8\uB2E4. \uADF8 \uB2E4\uC74C\uBD80\uD130\uB294\u2026 \uB300\uC7A5\uC7A5\uC774 \uBE0C\uB86C\uB3C4 \uB208\uC744 \uAC10\uC2B5\uB2C8\uB2E4.",
    "\uC790\uB3D9\uC0AC\uB0E5 \uC911\uC5D0\uB3C4 \uBB3C\uC57D\uC740 \uC904\uC5B4\uB4ED\uB2C8\uB2E4. \uC7A1\uD654\uC0C1\uC778 \uB9AC\uB098\uC5D0\uAC8C \uB4E4\uB800\uB2E4 \uAC00\uC138\uC694.",
    "\uC18D\uC0AD\uC774\uB294 \uC232\uC758 \uB291\uB300\uC778\uAC04\uC740 \uBC24\uC774 \uB418\uBA74 \uB354 \uC0AC\uB098\uC6CC\uC9D1\uB2C8\uB2E4.",
    "\uC5FC\uC625\uC758 \uAD70\uC8FC \uBC1C\uCE74\uB974\uC758 \uBD89\uC740 \uC7A5\uD310\uC740 \uBB34\uC870\uAC74 \uD53C\uD558\uC138\uC694. \uBB34\uC870\uAC74\uC785\uB2C8\uB2E4.",
    "\uBB38\uD30C\uC6D0\uACFC \uD568\uAED8 \uC0AC\uB0E5\uD558\uBA74 \uACBD\uD5D8\uCE58\uB97C \uB354 \uB9CE\uC774 \uC5BB\uC2B5\uB2C8\uB2E4.",
    "\uCD95\uBCF5\uBC1B\uC740 \uC8FC\uBB38\uC11C\uB294 \uAC15\uD654 \uC131\uACF5 \uD655\uB960\uC744 \uC62C\uB824 \uC90D\uB2C8\uB2E4.",
    "\uC78A\uD600\uC9C4 \uBB18\uC9C0\uC758 \uD574\uACE8 \uAE30\uC0AC\uB294 \uB4A4\uB97C \uC7A1\uC73C\uBA74 \uBC29\uC5B4\uAC00 \uC57D\uD574\uC9D1\uB2C8\uB2E4."
  ];
  var SERVERS = [
    { name: "\uC544\uC2A4\uD14C\uB974 01", state: "\uD63C\uC7A1", color: "#ff9a4a" },
    { name: "\uC544\uC2A4\uD14C\uB974 02", state: "\uC6D0\uD65C", color: "#5cf08a" },
    { name: "\uBCA8\uB85C\uC2A4 01", state: "\uBCF4\uD1B5", color: "#ffe08a" },
    { name: "\uB8E8\uBA58 01", state: "\uC2E0\uADDC", color: "#7ecbff" }
  ];
  var EQUIP_SLOTS = [
    { id: "helmet", label: "\uD22C\uAD6C", col: "l" },
    { id: "armor", label: "\uAC11\uC637", col: "l" },
    { id: "gloves", label: "\uC7A5\uAC11", col: "l" },
    { id: "boots", label: "\uC7A5\uD654", col: "l" },
    { id: "weapon", label: "\uBB34\uAE30", col: "r" },
    { id: "shield", label: "\uBC29\uD328", col: "r" },
    { id: "cloak", label: "\uB9DD\uD1A0", col: "r" },
    { id: "necklace", label: "\uBAA9\uAC78\uC774", col: "r" },
    { id: "ring", label: "\uBC18\uC9C0", col: "m" },
    { id: "ring2", label: "\uBC18\uC9C0", col: "m" }
  ];
  var DEFAULT_SKILLS = [
    { id: "slash", icon: 0, name: "\uBCA0\uAE30", level: 5, key: "1", mp: 0, cd: 0, desc: "\uAC80\uC744 \uD718\uB458\uB7EC \uC55E\uC758 \uC801 \uD558\uB098\uB97C \uBCA4\uB2E4." },
    { id: "combo", icon: 1, name: "\uC5F0\uC18D \uBCA0\uAE30", level: 4, key: "2", mp: 12, cd: 4, desc: "\uBE60\uB974\uAC8C \uB450 \uBC88 \uBCA0\uC5B4 \uD070 \uD53C\uD574\uB97C \uC900\uB2E4." },
    { id: "spin", icon: 2, name: "\uD68C\uC804 \uBCA0\uAE30", level: 3, key: "3", mp: 20, cd: 8, desc: "\uBAB8\uC744 \uB3CC\uB824 \uC8FC\uBCC0\uC758 \uBAA8\uB4E0 \uC801\uC744 \uBCA4\uB2E4." },
    { id: "leap", icon: 3, name: "\uB3C4\uC57D \uAC15\uD0C0", level: 3, key: "4", mp: 28, cd: 12, desc: "\uB6F0\uC5B4\uC62C\uB77C \uB0B4\uB824\uCC0D\uACE0 \uC8FC\uBCC0\uC744 \uAE30\uC808\uC2DC\uD0A8\uB2E4." },
    { id: "guard", icon: 4, name: "\uC218\uD638\uC758 \uBC29\uD328", level: 2, key: "5", mp: 30, cd: 30, desc: "10\uCD08 \uB3D9\uC548 \uBC1B\uB294 \uD53C\uD574\uAC00 \uD06C\uAC8C \uC904\uC5B4\uB4E0\uB2E4." },
    { id: "thunder", icon: 5, name: "\uB1CC\uC804\uAC80", level: 2, key: "Q", mp: 45, cd: 20, desc: "\uAC80\uC5D0 \uBC88\uAC1C\uB97C \uC2E4\uC5B4 \uC77C\uC9C1\uC120\uC744 \uAFF0\uB6AB\uB294\uB2E4." },
    { id: "roar", icon: 6, name: "\uC0AC\uC790\uD6C4", level: 1, key: "E", mp: 40, cd: 60, desc: "\uD22C\uC9C0\uB97C \uBD88\uD0DC\uC6CC \uACF5\uACA9\uB825\uC774 \uC624\uB978\uB2E4." },
    { id: "recall", icon: 7, name: "\uADC0\uD658", level: 1, key: "R", mp: 0, cd: 300, desc: "\uBCA8\uB85C\uC2A4 \uC131\uCC44\uB85C \uC21C\uAC04\uC774\uB3D9\uD55C\uB2E4." }
  ];
  var DEFAULT_GUILD = {
    name: "\uC740\uC0AC\uC790",
    crest: 0,
    level: 7,
    notice: "\uC624\uB298 \uBC24 9\uC2DC \uC7BF\uBD88 \uC81C\uB2E8 \uBC1C\uCE74\uB974 \uD1A0\uBC8C. \uBB3C\uC57D \uB109\uB109\uD788 \uCC59\uACA8 \uC624\uC138\uC694.",
    me: "\uCE74\uC77C",
    members: [
      { name: "\uBC31\uC57C\uC758\uAC80", level: 58, cls: "\uAE30\uC0AC", rank: "\uAD70\uC8FC", contrib: 128400, online: true },
      { name: "\uCE74\uC77C", level: 52, cls: "\uAE30\uC0AC", rank: "\uC218\uD638\uAE30\uC0AC", contrib: 96200, online: true },
      { name: "\uB2EC\uBE5B\uD654\uC0B4", level: 55, cls: "\uC694\uC815 \uAD81\uC218", rank: "\uBD80\uAD70\uC8FC", contrib: 88750, online: true },
      { name: "\uC11C\uB9AC\uB9C8\uB140", level: 54, cls: "\uB9C8\uBC95\uC0AC", rank: "\uC218\uD638\uAE30\uC0AC", contrib: 71300, online: true },
      { name: "\uBB34\uC1E0\uC8FC\uBA39", level: 49, cls: "\uAE30\uC0AC", rank: "\uBB38\uD30C\uC6D0", contrib: 40120, online: true },
      { name: "\uC0C8\uBCBD\uBC14\uB78C", level: 47, cls: "\uC694\uC815 \uAD81\uC218", rank: "\uBB38\uD30C\uC6D0", contrib: 33980, online: false },
      { name: "\uBC24\uAE4C\uCE58", level: 45, cls: "\uB9C8\uBC95\uC0AC", rank: "\uBB38\uD30C\uC6D0", contrib: 21040, online: true },
      { name: "\uC740\uBE5B\uAC08\uAE30", level: 44, cls: "\uAE30\uC0AC", rank: "\uBB38\uD30C\uC6D0", contrib: 18800, online: false },
      { name: "\uB3C4\uD1A0\uB9AC\uC7A5\uC218", level: 38, cls: "\uC694\uC815 \uAD81\uC218", rank: "\uBB38\uD30C\uC6D0", contrib: 9050, online: false },
      { name: "\uCD08\uBCF4\uAE30\uC0AC\uD55C", level: 21, cls: "\uAE30\uC0AC", rank: "\uC218\uC2B5", contrib: 1200, online: true }
    ]
  };
  var DEFAULT_SETTINGS = { master: 80, bgm: 60, sfx: 85, quality: "\uB192\uC74C", damage: true, plates: true, shake: true, autoPotion: true };
  var nf = (n) => typeof n === "number" ? Math.round(n).toLocaleString("ko-KR") : String(n == null ? "" : n);
  var esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  var clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  function h(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function create(ctx) {
    const root2 = ctx.root;
    const emit = (name, data) => {
      try {
        ctx.emit && ctx.emit(name, data);
      } catch (e) {
        console.error(e);
      }
    };
    const doc = root2.ownerDocument;
    if (!getComputedStyle(root2).getPropertyValue("--gold").trim() && !doc.querySelector("style[data-ui-theme]")) {
      const t = h("style");
      t.setAttribute("data-ui-theme", "");
      t.textContent = theme_default;
      doc.head.appendChild(t);
    }
    if (!doc.querySelector("style[data-ui-windows]")) {
      const s = h("style");
      s.setAttribute("data-ui-windows", "");
      s.textContent = windows_default;
      doc.head.appendChild(s);
    }
    function resolveImg(v) {
      if (!v) return "";
      if (/^(data:|blob:|https?:|file:|\.{1,2}\/|\/)/.test(v)) return v;
      if (v.indexOf("/") < 0 && v.indexOf(".") < 0) v = "ui/portrait_" + v + ".jpg";
      return ctx.img(v);
    }
    function iconSpec(icon, def) {
      if (icon == null || icon === "") return null;
      if (typeof icon === "number") return { sheet: def, index: icon };
      if (typeof icon === "object") return { sheet: icon.sheet || def, index: icon.index | 0 };
      const m = /^(item|skill|crest):(\d+)$/.exec(icon);
      if (m) return { sheet: m[1], index: +m[2] };
      if (/^\d+$/.test(icon)) return { sheet: def, index: +icon };
      return { url: resolveImg(icon) };
    }
    function paintIcon(el, icon, def = "item") {
      const sp = iconSpec(icon, def);
      const k = sp ? sp.url || sp.sheet + sp.index : "";
      if (el._k === k) return;
      el._k = k;
      const st2 = el.style;
      if (!sp) {
        st2.backgroundImage = "none";
        return;
      }
      if (sp.url) {
        st2.backgroundImage = `url("${sp.url}")`;
        st2.backgroundSize = "cover";
        st2.backgroundPosition = "center";
        return;
      }
      const S = SHEETS[sp.sheet] || SHEETS.item, i = S.inset;
      const c = sp.index % S.cols, r = Math.floor(sp.index / S.cols) % S.rows;
      const bx = S.cols / (1 - 2 * i), by = S.rows / (1 - 2 * i);
      st2.backgroundImage = `url("${ctx.img(S.key)}")`;
      st2.backgroundSize = `${bx * 100}% ${by * 100}%`;
      st2.backgroundPosition = `${(c + i) / S.cols * bx / (bx - 1) * 100}% ${(r + i) / S.rows * by / (by - 1) * 100}%`;
    }
    function slot(cls) {
      const s = h("div", "w-slot " + (cls || ""));
      s._ico = h("div", "w-ico");
      s.appendChild(s._ico);
      return s;
    }
    function setRarity(el, rarity) {
      if (el._r === rarity) return;
      if (el._r) el.classList.remove("r-" + el._r);
      if (rarity) el.classList.add("r-" + rarity);
      el._r = rarity;
    }
    const scaleOf = () => root2.getBoundingClientRect().width / 1920 || 1;
    const L = {};
    for (const n of ["wins", "dlg-layer", "over", "enh", "full"]) {
      L[n] = h("div", "w-layer w-" + n);
      root2.appendChild(L[n]);
    }
    const tip = h("div", "w-tip w-hide");
    root2.appendChild(tip);
    function tipOn(el, getHtml) {
      el.addEventListener("mouseenter", () => {
        const html = getHtml();
        if (!html) return;
        tip.innerHTML = html;
        tip.classList.remove("w-hide");
        const s = scaleOf(), rr = root2.getBoundingClientRect(), r = el.getBoundingClientRect();
        const tw = tip.offsetWidth, th = tip.offsetHeight, x0 = (r.left - rr.left) / s, x1 = (r.right - rr.left) / s;
        tip.style.left = (x1 + 10 + tw <= 1912 ? x1 + 10 : Math.max(4, x0 - 10 - tw)) + "px";
        tip.style.top = clamp((r.top - rr.top) / s, 4, 1076 - th) + "px";
      });
      el.addEventListener("mouseleave", () => tip.classList.add("w-hide"));
    }
    const wins = {};
    let zTop = 1;
    const openOrder = [];
    const HEAD_H = 46;
    function makeWin(name, cls, title2, x, y) {
      const el = h("div", "w-win w-hide " + cls);
      el.style.left = x + "px";
      el.style.top = y + "px";
      el.innerHTML = '<i class="w-cn tl"><i></i></i><i class="w-cn tr"><i></i></i><i class="w-cn bl"><i></i></i><i class="w-cn br"><i></i></i>';
      const head = h("div", "w-head", `<div class="w-ttl">${title2}</div>`);
      const x_ = h("button", "w-x");
      x_.setAttribute("aria-label", "\uB2EB\uAE30");
      head.appendChild(x_);
      const body = h("div", "w-body");
      el.appendChild(head);
      el.appendChild(body);
      L.wins.appendChild(el);
      x_.addEventListener("click", (e) => {
        e.stopPropagation();
        close(name);
      });
      el.addEventListener("pointerdown", () => {
        el.style.zIndex = ++zTop;
      });
      let drag = null;
      head.addEventListener("pointerdown", (e) => {
        if (e.target === x_) return;
        drag = { px: e.clientX, py: e.clientY, x: el.offsetLeft, y: el.offsetTop, s: scaleOf() };
        try {
          head.setPointerCapture(e.pointerId);
        } catch (_) {
        }
      });
      head.addEventListener("pointermove", (e) => {
        if (!drag) return;
        el.style.left = clamp(drag.x + (e.clientX - drag.px) / drag.s, 0, Math.max(0, 1920 - el.offsetWidth)) + "px";
        el.style.top = clamp(drag.y + (e.clientY - drag.py) / drag.s, 0, 1080 - HEAD_H) + "px";
      });
      const end = () => {
        drag = null;
        liftWins();
      };
      head.addEventListener("pointerup", end);
      head.addEventListener("pointercancel", end);
      return wins[name] = { el, body, open: false, timer: 0, x, y };
    }
    function liftWins() {
      for (const k in wins) {
        const w = wins[k], el = w.el;
        const lift = dlgEl && w.open ? clamp(el.offsetTop + el.offsetHeight - 672, 0, Math.max(0, el.offsetTop - 8)) : 0;
        if (w.lift !== lift) {
          w.lift = lift;
          el.style.translate = lift ? `0 ${-lift}px` : "";
        }
      }
    }
    function open(name) {
      const w = wins[name];
      if (!w) return false;
      clearTimeout(w.timer);
      w.el.classList.remove("w-hide", "closing");
      w.el.style.zIndex = ++zTop;
      const wx = w.el.offsetLeft, wy = w.el.offsetTop;
      if (wx < 0 || wy < 0 || wx + w.el.offsetWidth > 1920 || wy + HEAD_H > 1080) {
        w.el.style.left = w.x + "px";
        w.el.style.top = w.y + "px";
      }
      const i = openOrder.indexOf(name);
      if (i >= 0) openOrder.splice(i, 1);
      openOrder.push(name);
      if (!w.open) {
        w.open = true;
        emit("windowOpen", name);
      }
      liftWins();
      return true;
    }
    function close(name) {
      const w = wins[name];
      if (!w || !w.open) return false;
      w.open = false;
      w.el.classList.add("closing");
      tip.classList.add("w-hide");
      clearTimeout(w.timer);
      w.timer = setTimeout(() => {
        w.el.classList.add("w-hide");
        w.el.classList.remove("closing");
      }, 130);
      const i = openOrder.indexOf(name);
      if (i >= 0) openOrder.splice(i, 1);
      emit("windowClose", name);
      return true;
    }
    const isOpen = (name) => !!(wins[name] && wins[name].open);
    const toggle = (name) => isOpen(name) ? close(name) : open(name);
    function closeAll() {
      for (const n of openOrder.slice()) close(n);
    }
    const eat = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    };
    function onKey(e) {
      const ae = doc.activeElement, tg = ae && ae.tagName;
      if (tg === "INPUT" || tg === "TEXTAREA" || ae && ae.isContentEditable) return;
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (e.key === "Escape") {
        if (raidEl) {
          eat(e);
          emit("raidResultClose");
          raidResult.hide();
          return;
        }
        if (dlgEl && dlgEsc != null) {
          eat(e);
          emit("dialog", dlgEsc);
          return;
        }
        if (openOrder.length) {
          eat(e);
          close(openOrder[openOrder.length - 1]);
        }
        return;
      }
      if (dlgEl && !raidEl && !deathEl && /^[1-9]$/.test(e.key)) {
        eat(e);
        const o = dlgOpts[+e.key - 1];
        if (o) emit("dialog", o.id);
      }
    }
    const keyTarget = doc.defaultView || doc;
    keyTarget.addEventListener("keydown", onKey, true);
    const invW = makeWin("inventory", "w-inv", "\uAC00\uBC29", 1404, 150);
    invW.body.innerHTML = '<div class="w-tabs"><div class="w-tab on">\uC804\uCCB4</div><div class="w-tab">\uC7A5\uBE44</div><div class="w-tab">\uC18C\uBAA8\uD488</div><div class="w-tab">\uAE30\uD0C0</div></div><div class="w-inv-grid w-inset w-scroll"></div><div class="w-inv-foot"><div class="w-gold w-inset"><div class="w-coin"><div class="w-ico"></div></div><span>\uAE08\uD654</span><b>0</b></div><div class="w-wt"><div class="w-wt-t"><span>\uBB34\uAC8C</span><span class="w-num">0%</span></div><div class="w-bar"><i></i></div></div></div><div class="w-inv-cap">\uCE78 <span class="w-num">0 / 42</span></div>';
    const invGrid = invW.body.querySelector(".w-inv-grid"), invGold = invW.body.querySelector(".w-gold b");
    const invWt = invW.body.querySelector(".w-wt .w-num"), invWtBar = invW.body.querySelector(".w-bar i"), invCap = invW.body.querySelector(".w-inv-cap span");
    paintIcon(invW.body.querySelector(".w-coin .w-ico"), 14);
    const invSlots = [];
    let invItems = [], invTab = 0;
    const invTabs = [...invW.body.querySelectorAll(".w-tab")];
    invTabs.forEach((t, i) => t.addEventListener("click", () => {
      invTab = i;
      invTabs.forEach((x, j) => x.classList.toggle("on", i === j));
      renderInv();
    }));
    function invSlot(i) {
      while (invSlots.length <= i) {
        const s = slot();
        s._cnt = h("span", "w-cnt");
        s._pls = h("span", "w-pls");
        s._eq = h("span", "w-eq", "\uCC29\uC6A9");
        s.append(s._pls, s._eq, s._cnt);
        invGrid.appendChild(s);
        s.addEventListener("click", () => {
          if (s._item) emit("itemClick", s._item.id);
        });
        tipOn(s, () => s._item && `<b class="rar-${s._item.rarity || "common"}">${s._item.plus ? "+" + s._item.plus + " " : ""}${esc(s._item.name)}</b><span>${RARITY[s._item.rarity] || "\uC77C\uBC18"} \uB4F1\uAE09${s._item.count > 1 ? " \xB7 " + nf(s._item.count) + "\uAC1C" : ""}${s._item.equipped ? " \xB7 \uCC29\uC6A9 \uC911" : ""}</span>`);
        invSlots.push(s);
      }
      return invSlots[i];
    }
    const KIND = { equip: "equip", use: "use", etc: "etc", \uC7A5\uBE44: "equip", \uC18C\uBAA8\uD488: "use", \uAE30\uD0C0: "etc" };
    const kindOf = (it) => KIND[it.kind] || (typeof it.icon === "number" ? it.icon <= 8 ? "equip" : it.icon <= 13 ? "use" : "etc" : "etc");
    function renderInv() {
      const list = invTab === 0 ? invItems : invItems.filter((it) => kindOf(it) === ["", "equip", "use", "etc"][invTab]);
      const n = Math.max(42, Math.ceil(list.length / 6) * 6);
      for (let i = 0; i < n; i++) {
        const s = invSlot(i), it = list[i] || null;
        s._item = it;
        s.classList.remove("w-hide");
        s.classList.toggle("has", !!it);
        paintIcon(s._ico, it ? it.icon : null);
        setRarity(s, it ? it.rarity || "common" : null);
        s._cnt.textContent = it && it.count > 1 ? nf(it.count) : "";
        s._pls.textContent = it && it.plus ? "+" + it.plus : "";
        s._eq.style.display = it && it.equipped ? "" : "none";
      }
      for (let i = n; i < invSlots.length; i++) invSlots[i].classList.add("w-hide");
    }
    const inventory = {
      set(d = {}) {
        if (d.gold != null) invGold.textContent = nf(d.gold);
        if (d.items) {
          invItems = d.items;
          renderInv();
          invCap.textContent = `${invItems.length} / ${Math.max(42, Math.ceil(invItems.length / 6) * 6)}`;
        }
        const wt = d.weight != null ? d.weight : Math.min(0.95, invItems.length * 0.031);
        invWt.textContent = Math.round(wt * 100) + "%";
        invWtBar.style.width = wt * 100 + "%";
      }
    };
    renderInv();
    const chrW = makeWin("character", "w-chr", "\uC7A5\uBE44", 14, 150);
    chrW.body.innerHTML = '<div class="w-doll w-inset"><div class="w-doll-col l"></div><div class="w-doll-col r"></div><div class="w-port"></div><div class="w-doll-name"><span></span><b></b><em></em></div><div class="w-doll-mid"></div><div class="w-pow"><span>\uC804\uD22C\uB825</span><b>0</b></div></div><div class="w-chr-r"><div class="w-sec">\uB2A5\uB825\uCE58</div><div class="w-stats w-inset"></div><div class="w-sec">\uCC29\uC6A9 \uC7A5\uBE44</div><div class="w-eqlist w-inset"></div></div>';
    const chrQ = (s) => chrW.body.querySelector(s);
    chrQ(".w-port").style.backgroundImage = `url("${ctx.img("ui/portrait_hero.jpg")}")`;
    const eqSlots = {};
    for (const d of EQUIP_SLOTS) {
      const wrap = h("div", "w-eslot"), s = slot();
      s._lbl = h("span", "w-lbl", d.label);
      s._pls = h("span", "w-pls");
      s.append(s._lbl, s._pls);
      wrap.appendChild(s);
      chrQ(d.col === "m" ? ".w-doll-mid" : ".w-doll-col." + d.col).appendChild(wrap);
      s.addEventListener("click", () => {
        if (s._item) emit("equipClick", s._item.slot || d.id);
      });
      tipOn(s, () => s._item && `<b class="rar-${s._item.rarity || "common"}">${s._item.plus ? "+" + s._item.plus + " " : ""}${esc(s._item.name)}</b><span>${d.label} \xB7 ${RARITY[s._item.rarity] || "\uC77C\uBC18"} \uB4F1\uAE09</span>`);
      eqSlots[d.id] = s;
      s._def = d;
    }
    const character = {
      set(d = {}) {
        if (d.name != null) chrQ(".w-doll-name b").textContent = d.name;
        if (d.guild != null) chrQ(".w-doll-name span").textContent = d.guild ? `[${d.guild}]` : "";
        if (d.level != null) chrQ(".w-doll-name em").textContent = `Lv.${d.level} ${d.job || "\uAE30\uC0AC"}`;
        if (d.portrait) chrQ(".w-port").style.backgroundImage = `url("${resolveImg(d.portrait)}")`;
        if (d.stats) {
          let html = "";
          let pow = d.power;
          for (const k of Object.keys(d.stats)) {
            if (k === "\uC804\uD22C\uB825") {
              pow = d.stats[k];
              continue;
            }
            html += `<div class="w-stat${/공격력|방어력/.test(k) ? " hi" : ""}"><span>${esc(k)}</span><b>${esc(nf(d.stats[k]))}</b></div>`;
          }
          chrQ(".w-stats").innerHTML = html;
          if (pow != null) chrQ(".w-pow b").textContent = nf(pow);
        } else if (d.power != null) chrQ(".w-pow b").textContent = nf(d.power);
        if (d.equip) {
          const used = {};
          let rows = "";
          for (const id in eqSlots) eqSlots[id]._item = null;
          for (const it of d.equip) {
            const def = it.slot != null ? EQUIP_SLOTS.find((s) => (s.id === it.slot || s.id.replace(/\d+$/, "") === it.slot || s.label === it.slot) && !used[s.id]) : EQUIP_SLOTS.find((s) => !used[s.id]);
            if (!def) continue;
            used[def.id] = 1;
            eqSlots[def.id]._item = it;
          }
          for (const def of EQUIP_SLOTS) {
            const s = eqSlots[def.id], it = s._item;
            s.classList.toggle("has", !!it);
            paintIcon(s._ico, it ? it.icon : null);
            setRarity(s, it ? it.rarity || "common" : null);
            s._lbl.style.display = it ? "none" : "";
            s._pls.textContent = it && it.plus ? "+" + it.plus : "";
            if (it) rows += `<div class="w-eqrow"><span>${def.label}</span><b class="rar-${it.rarity || "common"}">${esc(it.name)}</b>${it.plus ? `<em>+${it.plus}</em>` : ""}</div>`;
          }
          chrQ(".w-eqlist").innerHTML = rows || '<div class="w-eqrow"><span></span><b style="color:var(--ink-faint)">\uCC29\uC6A9\uD55C \uC7A5\uBE44\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4</b></div>';
        }
      }
    };
    const enW = makeWin("enhance", "w-enw", "\uC7A5\uBE44 \uAC15\uD654", 690, 150);
    enW.body.innerHTML = '<div class="w-enw-npc w-inset"><i></i><span><b>\uB300\uC7A5\uC7A5\uC774 \uBE0C\uB86C</b>\u300C\uB9DD\uCE58\uB294 \uAC70\uC9D3\uB9D0\uC744 \uC548 \uD558\uC9C0. \uC6B4\uC774 \uAC70\uC9D3\uB9D0\uC744 \uD560 \uBFD0.\u300D</span></div><div class="w-altar w-inset"><div class="w-rune"></div><div class="w-rune b"></div><div class="w-pl cur"><span>\uD604\uC7AC</span><b>+0</b></div><div class="w-arr a"></div><div class="w-arr b"></div><div class="w-pl nxt"><span>\uAC15\uD654 \uD6C4</span><b>+1</b></div><div class="w-enw-name"><span></span><small></small></div></div><div class="w-rate"><span>\uC131\uACF5 \uD655\uB960</span><div class="w-bar"><i></i></div><b>0%</b></div><div class="w-risk safe"></div><div class="w-enw-mid"><div class="w-mats"><div class="w-mat w-inset m1"><span>\uBB34\uAE30 \uAC15\uD654 \uC8FC\uBB38\uC11C</span><b>0</b></div><div class="w-mat w-inset m2"><span>\uCD95\uBCF5\uBC1B\uC740 \uC8FC\uBB38\uC11C</span><b>0</b></div></div><div class="w-log w-inset"></div></div><div class="w-enw-foot"><div class="w-chk"><i></i>\uC790\uB3D9 \uAC15\uD654</div><button class="btn primary w-go">\uAC15\uD654</button></div>';
    const enQ = (s) => enW.body.querySelector(s);
    enQ(".w-enw-npc i").style.backgroundImage = `url("${ctx.img("ui/portrait_blacksmith.jpg")}")`;
    const enSlot = slot("big");
    enQ(".w-altar").insertBefore(enSlot, enQ(".w-pl"));
    const m1s = slot(), m2s = slot();
    paintIcon(m1s._ico, 11);
    paintIcon(m2s._ico, 13);
    enQ(".m1").prepend(m1s);
    enQ(".m2").prepend(m2s);
    let enData = { item: null, scrolls: 0, blessed: 0, rate: 0, nextPlus: null, safe: true, log: [] }, enAuto = false;
    const enChk = enQ(".w-chk"), enGo = enQ(".w-go");
    enChk.addEventListener("click", () => {
      enAuto = !enAuto;
      enChk.classList.toggle("on", enAuto);
      emit("enhanceAuto", enAuto);
    });
    enGo.addEventListener("click", () => {
      if (!playing) emit("enhance");
    });
    const enhance = {
      set(d = {}) {
        Object.assign(enData, d);
        if (d.item !== void 0 && d.nextPlus === void 0) enData.nextPlus = null;
        const it = enData.item;
        paintIcon(enSlot._ico, it ? it.icon : null);
        setRarity(enSlot, it ? it.rarity || "common" : null);
        const plus = it ? it.plus | 0 : 0, nx = enData.nextPlus != null ? enData.nextPlus : plus + 1;
        enQ(".w-pl.cur b").textContent = it ? "+" + plus : "\u2014";
        enQ(".w-pl.nxt b").textContent = it ? "+" + nx : "\u2014";
        const nm = enQ(".w-enw-name span");
        nm.textContent = it ? it.name : "\uAC15\uD654\uD560 \uC7A5\uBE44\uB97C \uC62C\uB824 \uC8FC\uC138\uC694";
        nm.className = it ? "rar-" + (it.rarity || "common") : "";
        enQ(".w-enw-name small").textContent = it ? `${RARITY[it.rarity] || "\uC77C\uBC18"} \uB4F1\uAE09 \xB7 \uBB34\uAE30` : "";
        const r = clamp(+enData.rate || 0, 0, 1), rate = enQ(".w-rate");
        rate.className = "w-rate" + (r < 0.3 ? " low" : r < 0.6 ? " mid" : "");
        rate.querySelector("i").style.width = r * 100 + "%";
        rate.querySelector("b").textContent = (r * 100 >= 10 || r === 0 ? Math.round(r * 100) : (r * 100).toFixed(1)) + "%";
        const risk = enQ(".w-risk");
        risk.className = "w-risk " + (enData.safe ? "safe" : "danger");
        risk.textContent = enData.safe ? "\uC548\uC804 \uAC15\uD654 \uAD6C\uAC04 \u2014 \uC2E4\uD328\uD574\uB3C4 \uC7A5\uBE44\uB294 \uC0AC\uB77C\uC9C0\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4." : "\uC704\uD5D8 \uAD6C\uAC04 \u2014 \uC2E4\uD328\uD558\uBA74 \uC7A5\uBE44\uAC00 \uC99D\uBC1C\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4!";
        const sc = +enData.scrolls || 0, bl = enData.blessed === true ? 1 : +enData.blessed || 0;
        enQ(".m1 b").textContent = nf(sc);
        enQ(".m1").classList.toggle("zero", sc <= 0);
        enQ(".m2 b").textContent = enData.blessed === true ? "\uC0AC\uC6A9" : nf(bl);
        enQ(".m2").classList.toggle("use", bl > 0);
        enGo.disabled = !it || sc <= 0;
        if (d.auto != null) {
          enAuto = !!d.auto;
          enChk.classList.toggle("on", enAuto);
        }
        const log = (enData.log || []).slice(-4);
        enQ(".w-log").innerHTML = log.length ? log.map((s) => `<div class="${/증발|파괴|소멸/.test(s) ? "gone" : /성공/.test(s) ? "ok" : /실패/.test(s) ? "bad" : ""}">${esc(s)}</div>`).join("") : "<div>\uAC15\uD654 \uAE30\uB85D\uC774 \uC5EC\uAE30\uC5D0 \uB0A8\uC2B5\uB2C8\uB2E4.</div>";
      },
      play: (kind, o) => playEnhance(kind, o),
      get auto() {
        return enAuto;
      }
    };
    const skW = makeWin("skills", "w-skw", "\uC2A4\uD0AC", 700, 140);
    skW.body.innerHTML = '<div class="w-skl w-inset w-scroll"></div>';
    const skills = {
      set(list = []) {
        const box = skW.body.firstChild;
        box.innerHTML = "";
        for (const s of list) {
          const row = h("div", "w-skr"), ic = slot();
          paintIcon(ic._ico, s.icon, "skill");
          row.appendChild(ic);
          row.insertAdjacentHTML("beforeend", `<div class="n"><b>${esc(s.name)}</b><em>Lv.${s.level || 1}</em><span>${esc(s.desc || "")}</span></div><div class="m">\uB0B4\uB825 <b>${s.mp || 0}</b><br>\uC7AC\uC0AC\uC6A9 <i>${s.cd ? s.cd + "\uCD08" : "\uC5C6\uC74C"}</i></div>${s.key ? `<span class="w-key">${esc(s.key)}</span>` : ""}`);
          row.classList.add("interactive");
          row.addEventListener("click", () => emit("skillInfo", s.id));
          box.appendChild(row);
        }
      }
    };
    skills.set(DEFAULT_SKILLS);
    const glW = makeWin("guild", "w-glw", "\uBB38\uD30C", 640, 170);
    glW.body.innerHTML = '<div class="w-gl-top w-inset"><div class="w-crest"><div class="w-ico"></div></div><div class="t"><b></b><em></em><span></span></div><div class="c">\uC811\uC18D \uC911<b></b></div></div><div class="w-tr h"><span></span><span>\uC774\uB984</span><span>\uB808\uBCA8</span><span>\uC9C1\uC5C5</span><span>\uC9C1\uC704</span><span class="r">\uAE30\uC5EC\uB3C4</span></div><div class="w-tbl w-scroll"></div>';
    const guild = {
      set(d = {}) {
        const q = (s) => glW.body.querySelector(s), ms = d.members || [];
        paintIcon(q(".w-crest .w-ico"), d.crest || 0, "crest");
        q(".t b").textContent = d.name || "";
        q(".t em").textContent = d.level ? `\uBB38\uD30C Lv.${d.level}` : "";
        q(".t span").textContent = d.notice ? "\uACF5\uC9C0 \xB7 " + d.notice : "";
        q(".c b").textContent = `${ms.filter((m) => m.online).length} / ${ms.length}`;
        q(".w-tbl").innerHTML = ms.map((m) => `<div class="w-tr${m.online ? " on" : ""}${m.name === d.me ? " me" : ""}"><span><i class="dot" style="display:block"></i></span><span>${esc(m.name)}</span><span class="w-num">${m.level || ""}</span><span>${esc(m.cls || "")}</span><span class="${/^군주/.test(m.rank || "") ? "lord" : ""}">${esc(m.rank || "\uBB38\uD30C\uC6D0")}</span><span class="r">${nf(m.contrib || 0)}</span></div>`).join("");
      }
    };
    guild.set(DEFAULT_GUILD);
    const stW = makeWin("settings", "w-stw", "\uD658\uACBD \uC124\uC815", 725, 240);
    const stVal = Object.assign({}, DEFAULT_SETTINGS);
    const stUpd = {};
    (function buildSettings() {
      const b = stW.body;
      const sec = (t) => b.appendChild(h("div", "w-sec", t));
      const slider = (key, label) => {
        const row = h("div", "w-set", `<span>${label}</span><div class="w-sld"><i></i><u></u></div><b></b>`);
        b.appendChild(row);
        const sld = row.querySelector(".w-sld"), fill2 = sld.firstChild, knob = sld.lastChild, out = row.lastChild;
        stUpd[key] = () => {
          fill2.style.width = knob.style.left = stVal[key] + "%";
          out.textContent = stVal[key];
        };
        const at = (e) => {
          const r = sld.getBoundingClientRect();
          stVal[key] = Math.round(clamp((e.clientX - r.left) / r.width, 0, 1) * 100);
          stUpd[key]();
          emit("setting", { key, value: stVal[key] });
        };
        let on = false;
        sld.addEventListener("pointerdown", (e) => {
          on = true;
          try {
            sld.setPointerCapture(e.pointerId);
          } catch (_) {
          }
          at(e);
        });
        sld.addEventListener("pointermove", (e) => {
          if (on) at(e);
        });
        sld.addEventListener("pointerup", () => {
          on = false;
        });
        sld.addEventListener("pointercancel", () => {
          on = false;
        });
      };
      const toggleRow = (key, label) => {
        const row = h("div", "w-set", `<span style="width:auto">${label}</span><div class="w-tgl"></div>`);
        b.appendChild(row);
        const t = row.lastChild;
        stUpd[key] = () => t.classList.toggle("on", !!stVal[key]);
        t.addEventListener("click", () => {
          stVal[key] = !stVal[key];
          stUpd[key]();
          emit("setting", { key, value: stVal[key] });
        });
      };
      const seg = (key, label, opts) => {
        const row = h("div", "w-set", `<span>${label}</span><div class="w-seg">${opts.map((o) => `<div>${o}</div>`).join("")}</div>`);
        b.appendChild(row);
        const ds = [...row.querySelectorAll(".w-seg div")];
        stUpd[key] = () => ds.forEach((d) => d.classList.toggle("on", d.textContent === stVal[key]));
        ds.forEach((d) => d.addEventListener("click", () => {
          stVal[key] = d.textContent;
          stUpd[key]();
          emit("setting", { key, value: stVal[key] });
        }));
      };
      sec("\uC18C\uB9AC");
      slider("master", "\uC804\uCCB4 \uC74C\uB7C9");
      slider("bgm", "\uBC30\uACBD \uC74C\uC545");
      slider("sfx", "\uD6A8\uACFC\uC74C");
      sec("\uD654\uBA74").style.marginTop = "14px";
      seg("quality", "\uADF8\uB798\uD53D \uD488\uC9C8", ["\uB0AE\uC74C", "\uBCF4\uD1B5", "\uB192\uC74C"]);
      toggleRow("damage", "\uD53C\uD574 \uC22B\uC790 \uD45C\uC2DC");
      toggleRow("plates", "\uB2E4\uB978 \uBAA8\uD5D8\uAC00 \uC774\uB984\uD45C \uD45C\uC2DC");
      toggleRow("shake", "\uD654\uBA74 \uD754\uB4E4\uB9BC");
      sec("\uD3B8\uC758").style.marginTop = "14px";
      toggleRow("autoPotion", "\uCCB4\uB825\uC774 \uB0AE\uC73C\uBA74 \uBB3C\uC57D \uC790\uB3D9 \uC0AC\uC6A9");
      for (const k in stUpd) stUpd[k]();
    })();
    let lowFxForced = null;
    const applyLowFx = () => root2.classList.toggle("w-lowfx", lowFxForced != null ? lowFxForced : stVal.quality === "\uB0AE\uC74C");
    for (const k of ["quality"]) {
      const u = stUpd[k];
      stUpd[k] = () => {
        u();
        applyLowFx();
      };
    }
    applyLowFx();
    const settings = { set(d = {}) {
      for (const k in d) if (k in stUpd) {
        stVal[k] = d[k];
        stUpd[k]();
      }
    }, get: () => Object.assign({}, stVal) };
    let dlgEl = null, dlgOpts = [], dlgTimer = 0, dlgEsc = null;
    const dialog = {
      show(d = {}) {
        dialog.hide();
        dlgOpts = d.options || [];
        dlgEsc = d.escId != null ? d.escId : null;
        dlgEl = h("div", "w-dlg" + (dlgOpts.length > 4 ? " many" : ""), `<i class="w-cn tl"><i></i></i><i class="w-cn tr"><i></i></i><i class="w-cn bl"><i></i></i><i class="w-cn br"><i></i></i><div class="w-dlg-port"></div><div class="w-dlg-name">${esc(d.name || "")}</div><div class="w-dlg-role">${esc(d.role || "")}</div><div class="w-dlg-text w-scroll interactive"></div><div class="w-dlg-opts w-scroll"></div>`);
        if (d.portrait) dlgEl.querySelector(".w-dlg-port").style.backgroundImage = `url("${resolveImg(d.portrait)}")`;
        const box = dlgEl.querySelector(".w-dlg-opts");
        dlgOpts.forEach((o, i) => {
          const b = h("div", "w-opt" + (i === 0 ? " first" : ""), `<span>${esc(o.label)}</span>${i < 9 ? `<kbd>${i + 1}</kbd>` : ""}`);
          b.title = o.label;
          b.addEventListener("click", () => emit("dialog", o.id));
          box.appendChild(b);
        });
        const tx = dlgEl.querySelector(".w-dlg-text"), full = String(d.text || "");
        let n = 0;
        const done = () => {
          clearInterval(dlgTimer);
          tx.textContent = full;
        };
        if (d.instant) tx.textContent = full;
        else dlgTimer = setInterval(() => {
          n += 2;
          if (n >= full.length) done();
          else {
            tx.textContent = full.slice(0, n);
            tx.scrollTop = tx.scrollHeight;
          }
        }, 24);
        tx.addEventListener("click", done);
        L["dlg-layer"].appendChild(dlgEl);
        liftWins();
        const more = (el) => el.classList.toggle("more", el.scrollHeight > el.clientHeight + 2 && el.scrollTop + el.clientHeight < el.scrollHeight - 2);
        for (const el of [tx, box]) {
          more(el);
          el.addEventListener("scroll", () => more(el));
        }
        if (!d.instant) {
          const t0 = dlgTimer, iv = setInterval(() => {
            if (!dlgEl || dlgTimer !== t0 || tx.textContent.length >= full.length) {
              clearInterval(iv);
              if (dlgEl && dlgTimer === t0) more(tx);
            }
          }, 200);
        }
      },
      hide() {
        clearInterval(dlgTimer);
        if (dlgEl) {
          dlgEl.remove();
          dlgEl = null;
          dlgOpts = [];
          dlgEsc = null;
          liftWins();
        }
      },
      isOpen: () => !!dlgEl
    };
    let raidEl = null;
    const raidResult = {
      show(d = {}) {
        raidResult.hide();
        const rank = d.rank || [], total = rank.reduce((a, r) => a + (+r.dmg || 0), 0) || 1, top = Math.max(1, ...rank.map((r) => +r.dmg || 0));
        const fail = d.fail != null ? !!d.fail : /실패|패배|전멸|후퇴/.test(d.title || "");
        const TOPN = 8, meI = rank.findIndex((r) => r.me);
        const row = (r, i, pin) => `<div class="w-rr t${i + 1}${r.me ? " me" : ""}${pin ? " pin" : ""}" style="animation-delay:${0.25 + Math.min(pin ? TOPN : i, TOPN) * 0.07}s"><span class="k">${i + 1}</span><span class="nm">${r.guild ? `<span>[${esc(r.guild)}]</span>` : ""}<b>${esc(r.name)}</b></span><span class="bar"><i style="width:${(+r.dmg || 0) / top * 100}%;animation-delay:${0.45 + Math.min(pin ? TOPN : i, TOPN) * 0.07}s"></i></span><span class="d">${nf(+r.dmg || 0)}<small>${((+r.dmg || 0) / total * 100).toFixed(1)}%</small></span>${r.mvp ? '<span class="w-mvp">MVP</span>' : "<span></span>"}</div>`;
        raidEl = h("div", "w-layer" + (fail ? " w-raid-fail" : ""));
        raidEl.innerHTML = `<div class="w-raid-dim"></div><div class="w-raid"><div class="w-raid-ban"><div class="w-raid-rays"></div><small>${esc(d.kicker || "\uB808\uC774\uB4DC \uACB0\uACFC")}</small><b class="${fail ? "w-raid-ft" : "gold-text"}">${esc(d.title || "\uD1A0\uBC8C \uC131\uACF5")}</b><span>${esc(d.sub || "")}</span></div><div class="w-raid-pan"><i class="w-cn tl"><i></i></i><i class="w-cn tr"><i></i></i><i class="w-cn bl"><i></i></i><i class="w-cn br"><i></i></i><div class="w-sec">\uAE30\uC5EC\uB3C4 \uC21C\uC704${rank.length > TOPN ? `<em>\uCC38\uAC00 ${rank.length}\uBA85</em>` : ""}</div><div class="w-inset"><div class="w-raid-rank w-scroll">` + (rank.length ? rank.map((r, i) => row(r, i)).join("") : '<div class="w-raid-none">\uAE30\uC5EC \uAE30\uB85D\uC774 \uC5C6\uC2B5\uB2C8\uB2E4</div>') + "</div>" + (meI >= TOPN ? row(rank[meI], meI, true) : "") + '</div><div class="w-sec" style="margin-top:14px">\uD68D\uB4DD \uC804\uB9AC\uD488</div><div class="w-raid-loot w-inset w-scroll"></div><div class="w-raid-foot"><button class="btn primary">\uD655\uC778</button></div></div></div>';
        const lootBox = raidEl.querySelector(".w-raid-loot");
        if (!(d.loot || []).length) lootBox.innerHTML = '<div class="w-raid-none">\uD68D\uB4DD\uD55C \uC804\uB9AC\uD488\uC774 \uC5C6\uC2B5\uB2C8\uB2E4</div>';
        (d.loot || []).forEach((l, i) => {
          const el = h("div", "w-lt"), s = slot();
          paintIcon(s._ico, l.icon);
          setRarity(s, l.rarity || "common");
          el.appendChild(s);
          el.insertAdjacentHTML("beforeend", `<div><b class="rar-${l.rarity || "common"}">${esc(l.name)}${l.count > 1 ? " \xD7" + nf(l.count) : ""}</b><span>${RARITY[l.rarity] || "\uC77C\uBC18"} \uB4F1\uAE09</span></div>`);
          el.style.animationDelay = 0.8 + Math.min(i, 8) * 0.12 + "s";
          lootBox.appendChild(el);
        });
        raidEl.querySelector(".w-raid-foot .btn").addEventListener("click", () => {
          emit("raidResultClose");
          raidResult.hide();
        });
        L.over.appendChild(raidEl);
      },
      hide() {
        if (raidEl) {
          raidEl.remove();
          raidEl = null;
        }
      },
      isOpen: () => !!raidEl
    };
    let deathEl = null, deathTimer = 0;
    const death = {
      show(d = {}) {
        death.hide();
        let sec = Math.max(0, Math.ceil(+d.sec || 0));
        deathEl = h("div", "w-death", `<div class="w-death-c"><div class="w-death-line"></div><div class="w-death-t">\uC4F0\uB7EC\uC84C\uC2B5\uB2C8\uB2E4</div><div class="w-death-line"></div><div class="w-death-s">${esc(d.by ? d.by + "\uC5D0\uAC8C \uC4F0\uB7EC\uC84C\uC2B5\uB2C8\uB2E4." : "\uB208\uC55E\uC774 \uD750\uB824\uC9D1\uB2C8\uB2E4\u2026")}</div><div class="w-death-p">\uACBD\uD5D8\uCE58\uB97C \uC77C\uBD80 \uC783\uC5C8\uC2B5\uB2C8\uB2E4. \uBB38\uD30C\uC6D0\uB4E4\uC774 \uB2F9\uC2E0\uC744 \uAE30\uB2E4\uB9BD\uB2C8\uB2E4.</div><div class="w-death-cd"></div><button class="btn primary w-death-b">\uB9C8\uC744\uC5D0\uC11C \uBD80\uD65C</button></div>`);
        const cd = deathEl.querySelector(".w-death-cd");
        const paint = () => {
          cd.innerHTML = sec > 0 ? `<b>${sec}</b>\uCD08 \uB4A4 \uBCA8\uB85C\uC2A4 \uC131\uCC44\uC5D0\uC11C \uAE68\uC5B4\uB0A9\uB2C8\uB2E4` : "\uC9C0\uAE08 \uBD80\uD65C\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4";
        };
        paint();
        deathTimer = setInterval(() => {
          if (sec > 0) {
            sec--;
            paint();
          }
        }, 1e3);
        deathEl.querySelector(".w-death-b").addEventListener("click", () => emit("revive"));
        L.over.appendChild(deathEl);
      },
      hide() {
        clearInterval(deathTimer);
        if (deathEl) {
          deathEl.remove();
          deathEl = null;
        }
      },
      isOpen: () => !!deathEl
    };
    const logoHtml = (cls) => `<div class="w-logo ${cls || ""}"><div class="w-logo-crest"></div><div class="w-logo-main" data-t="\uC5D0\uB974\uD558\uC784">\uC5D0\uB974\uD558\uC784</div><div class="w-logo-sub">\uC0AC\uC790\uC758 \uB9F9\uC138</div><div class="w-logo-en">\uC11C\uC57D\uACFC \uAC15\uCCA0\uC758 \uC5F0\uB300\uAE30</div></div>`;
    function embers(n) {
      let s = '<div class="w-embers">';
      for (let i = 0; i < n; i++) {
        const r = i * 0.618034 % 1, q = (i * 0.381966 + 0.13) % 1, sz = 2 + i % 4;
        s += `<i style="left:${(r * 100).toFixed(1)}%;width:${sz}px;height:${sz}px;--dx:${Math.round(q * 420 - 120)}px;animation-duration:${(7 + q * 9).toFixed(1)}s;animation-delay:-${(r * 16).toFixed(1)}s"></i>`;
      }
      return s + "</div>";
    }
    function screen(cls, inner) {
      const el = h("div", "w-scr " + cls, `<div class="w-bg" style="background-image:url('${ctx.img("ui/key_art.jpg")}')"></div><div class="w-shade"></div>` + inner);
      return el;
    }
    function removeScreen(el) {
      if (!el) return;
      el.classList.add("out");
      setTimeout(() => el.remove(), 520);
    }
    let loadEl = null, loadTip = 0, loadTimer = 0;
    const loading = {
      show() {
        if (loadEl) return;
        loadEl = screen("w-load", embers(26) + logoHtml() + '<div class="w-load-b"><div class="w-load-tip"><b>\uB3C4\uC6C0\uB9D0</b><span></span></div><div class="w-load-row"><span class="m">\uC5D0\uB974\uD558\uC784\uC73C\uB85C \uAC00\uB294 \uAE38\uC744 \uC5EC\uB294 \uC911\u2026</span><b>0%</b></div><div class="w-load-bar"><i></i></div></div>');
        const tipEl = loadEl.querySelector(".w-load-tip span");
        tipEl.textContent = TIPS[loadTip % TIPS.length];
        loadTimer = setInterval(() => {
          loadTip++;
          tipEl.textContent = TIPS[loadTip % TIPS.length];
        }, 3800);
        L.full.appendChild(loadEl);
      },
      set(p, text) {
        if (!loadEl) loading.show();
        p = clamp(+p || 0, 0, 1);
        loadEl.querySelector(".w-load-bar i").style.width = `calc(${p * 100}% - 2px)`;
        loadEl.querySelector(".w-load-row b").textContent = Math.round(p * 100) + "%";
        if (text != null) loadEl.querySelector(".w-load-row .m").textContent = text;
      },
      hide() {
        clearInterval(loadTimer);
        removeScreen(loadEl);
        loadEl = null;
      }
    };
    let titleEl = null;
    const title = {
      show(o = {}) {
        if (titleEl) title.hide();
        let si = 0;
        titleEl = screen("w-title", embers(34) + '<div class="w-title-col">' + logoHtml() + '<div class="w-srv"><span class="l">\uC11C\uBC84<br>\uC120\uD0DD</span><i class="dot"></i><span class="n"></span><span class="s"></span><span class="ch">\uBCC0\uACBD</span></div><div class="w-srv-last">\uCD5C\uADFC \uC811\uC18D \xB7 <b>[\uC740\uC0AC\uC790]</b> \uCE74\uC77C \xB7 \uAE30\uC0AC</div><button class="btn primary w-tbtn">\uAC8C\uC784 \uC2DC\uC791</button><button class="btn w-tbtn sub">\uB179\uD654\uC6A9 \uC790\uB3D9 \uBAA8\uB4DC</button></div><div class="w-title-foot"><div class="w-rating"><b>\uB9F9\uC138</b><span>\uBAA8\uD5D8\uAC00\uC6A9</span></div><div>\uC774 \uAC8C\uC784\uC740 \uAC00\uC0C1\uC758 \uC655\uAD6D \uC5D0\uB974\uD558\uC784\uC744 \uBC30\uACBD\uC73C\uB85C \uD55C \uCC3D\uC791\uBB3C\uC774\uBA70, \uB4F1\uC7A5\uD558\uB294 \uC778\uBB3C\xB7\uBB38\uD30C\xB7\uC9C0\uBA85\uC740 \uC2E4\uC81C\uC640 \uAD00\uB828\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.<br>\uC9C0\uB098\uCE5C \uAC15\uD654\uB294 \uC7A5\uBE44\uC640 \uB9C8\uC74C\uC758 \uD3C9\uD654\uB97C \uD574\uCE60 \uC218 \uC788\uC2B5\uB2C8\uB2E4. \uAC15\uD654 \uACB0\uACFC\uB294 \uB300\uC7A5\uC7A5\uC774 \uBE0C\uB86C\uB3C4 \uCC45\uC784\uC9C0\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.</div><div class="v">\uD310 1.0.0 \xB7 \uC5D0\uB974\uD558\uC784 \uC81C\uC791\uB2E8<br>\uBAA8\uB4E0 \uBAA8\uD5D8\uAC00\uC5D0\uAC8C \uC0AC\uC790\uC758 \uAC00\uD638\uAC00 \uD568\uAED8\uD558\uAE30\uB97C</div></div>');
        const srv = titleEl.querySelector(".w-srv");
        const paint = () => {
          const s = SERVERS[si];
          srv.querySelector(".n").textContent = s.name;
          const st2 = srv.querySelector(".s");
          st2.textContent = s.state;
          st2.style.color = s.color;
          const d = srv.querySelector(".dot");
          d.style.background = s.color;
          d.style.boxShadow = "0 0 8px " + s.color;
        };
        paint();
        srv.addEventListener("click", () => {
          si = (si + 1) % SERVERS.length;
          paint();
          emit("server", SERVERS[si].name);
        });
        const [bs, bd] = titleEl.querySelectorAll(".w-tbtn");
        bs.addEventListener("click", () => {
          emit("titleStart");
          o.onStart && o.onStart();
        });
        bd.addEventListener("click", () => {
          emit("titleDemo");
          o.onDemo && o.onDemo();
        });
        L.full.appendChild(titleEl);
      },
      hide() {
        removeScreen(titleEl);
        titleEl = null;
      }
    };
    let endEl = null;
    const ending = {
      show(d = {}) {
        ending.hide();
        const lines = d.lines || [];
        endEl = screen("w-end", embers(22) + '<div class="w-end-c">' + logoHtml("sm") + '<div class="w-end-lines">' + lines.map((l, i) => `<div class="w-end-line" style="animation-delay:${1 + i * 0.45}s">${esc(l).replace(/(\+\d+|\d[\d,]*)/g, "<b>$1</b>")}</div>`).join("") + `</div><div class="w-end-thx" style="animation-delay:${1.4 + lines.length * 0.45}s">${esc(d.thanks || "\uD568\uAED8\uD574 \uC8FC\uC154\uC11C \uAC10\uC0AC\uD569\uB2C8\uB2E4")}</div><div class="w-end-foot" style="animation-delay:${1.8 + lines.length * 0.45}s">${esc(d.foot || "\uC5D0\uB974\uD558\uC784\uC758 \uBAA8\uD5D8\uC740 \uACC4\uC18D\uB429\uB2C8\uB2E4")}</div></div>`);
        L.full.appendChild(endEl);
      },
      hide() {
        if (endEl) {
          endEl.remove();
          endEl = null;
        }
      }
    };
    let playing = null;
    const sprites = {}, colS = {}, colH = {};
    const solid = (rgb) => colS[rgb] || (colS[rgb] = `rgb(${rgb})`), half = (rgb) => colH[rgb] || (colH[rgb] = `rgba(${rgb},.5)`);
    function sprite(rgb) {
      if (sprites[rgb]) return sprites[rgb];
      const c = doc.createElement("canvas");
      c.width = c.height = 64;
      const g = c.getContext("2d");
      const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, "rgba(255,255,255,1)");
      gr.addColorStop(0.18, `rgba(${rgb},.95)`);
      gr.addColorStop(0.5, `rgba(${rgb},.3)`);
      gr.addColorStop(1, `rgba(${rgb},0)`);
      g.fillStyle = gr;
      g.fillRect(0, 0, 64, 64);
      return sprites[rgb] = c;
    }
    const GOLD = "255,196,84", WHITE = "255,244,214", RED = "255,64,36", EMBER = "255,128,48", ICE = "170,205,255";
    const CX = 960, CY = 440;
    function playEnhance(kind, o = {}) {
      if (kind !== "success" && kind !== "fail" && kind !== "destroy") kind = "fail";
      if (playing) playing.finish();
      return new Promise((resolve) => {
        const item = Object.assign({ icon: 0, name: "\uC5EC\uBA85\uC758 \uC7A5\uAC80", rarity: "rare", plus: 0 }, enData.item || {}, o.icon != null ? { icon: o.icon } : null, o.rarity ? { rarity: o.rarity } : null);
        const from = o.from != null ? o.from : item.plus | 0, to = o.to != null ? o.to : kind === "success" ? from + 1 : kind === "fail" ? from : 0;
        const name = o.name || item.name;
        const TOTAL = kind === "success" ? 2400 : kind === "fail" ? 2200 : 2400, HITS = [250, 550, 850], RES = 1e3;
        const lay = L.enh;
        lay.className = "w-layer w-enh k-" + kind;
        lay.innerHTML = `<div class="w-enh-dim"></div><div class="w-enh-grey"></div><div class="w-enh-vig"></div><div class="w-enh-stage"><div class="w-enh-rays"></div><div class="w-enh-aura"></div><div class="w-enh-circle"></div><div class="w-enh-circle b"></div><div class="w-enh-flare"></div><div class="w-enh-flare v"></div><div class="w-enh-ring"></div><div class="w-enh-ring"></div><div class="w-enh-ring"></div><div class="w-enh-itemwrap"><div class="w-enh-item"><div class="w-ico"></div><div class="w-enh-heat"></div></div></div><div class="w-enh-shards"></div><svg class="w-enh-cracks" viewBox="-320 -320 640 640"></svg><div class="w-enh-hammer"><i class="hl"></i><i class="hd"></i></div><div class="w-enh-head"><small>\uAC15\uD654 \uC2DC\uB3C4</small><b class="rar-${item.rarity || "common"}">+${from} ${esc(name)}</b></div><div class="w-enh-plus"><b class="from">+${from}</b><b class="to">+${to}</b></div><div class="w-enh-gauge"><i></i><u class="a"></u><u class="b"></u></div></div><canvas width="1920" height="1080"></canvas><div class="w-enh-flash"></div><div class="w-enh-result"><div class="w-enh-big"></div><div class="w-enh-sub"></div></div>`;
        const q = (s) => lay.querySelector(s), qa = (s) => [...lay.querySelectorAll(s)];
        const stage = q(".w-enh-stage"), wrap = q(".w-enh-itemwrap"), ico = q(".w-enh-item .w-ico"), heat = q(".w-enh-heat"), hammer = q(".w-enh-hammer");
        const gauge = q(".w-enh-gauge i"), flash = q(".w-enh-flash"), big = q(".w-enh-big"), sub = q(".w-enh-sub"), rings = qa(".w-enh-ring");
        const cv = q("canvas"), g = cv.getContext("2d");
        paintIcon(ico, item.icon);
        void lay.offsetWidth;
        lay.classList.add("on");
        enW.el.classList.add("busy");
        L.wins.classList.add("fx-dim");
        L["dlg-layer"].classList.add("fx-dim");
        const A = (el, kf, opt) => el.animate(kf, Object.assign({ fill: "forwards", easing: "ease-out" }, opt));
        const P = [];
        const add = (p) => {
          p.age = 0;
          P.push(p);
        };
        const rnd = (a, b) => a + Math.random() * (b - a);
        function burst(n, x, y, rgb, v0, v1, o2 = {}) {
          for (let i = 0; i < n; i++) {
            const a = o2.a0 != null ? rnd(o2.a0, o2.a1) : Math.random() * 6.283, v = rnd(v0, v1);
            add({ t: o2.t || 1, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: o2.g != null ? o2.g : 600, drag: o2.drag || 1.6, life: rnd(o2.l0 || 0.45, o2.l1 || 1.1), size: rnd(o2.s0 || 1.5, o2.s1 || 3.5), rgb: Array.isArray(rgb) ? rgb[i % rgb.length] : rgb });
          }
        }
        function stepParticles(dt) {
          g.clearRect(0, 0, 1920, 1080);
          for (let i = P.length - 1; i >= 0; i--) {
            const p = P[i];
            p.age += dt;
            if (p.age >= p.life) {
              P[i] = P[P.length - 1];
              P.pop();
              continue;
            }
            const k = p.age / p.life;
            if (p.t === 0) {
              const e = k * k, r = p.r0 * (1 - e), a = p.a + p.sw * e;
              const x = CX + Math.cos(a) * r, y = CY + Math.sin(a) * r * 0.82, s = p.size * (0.6 + k);
              g.globalCompositeOperation = "lighter";
              g.globalAlpha = Math.min(1, k * 3);
              g.drawImage(sprite(p.rgb), x - s, y - s, s * 2, s * 2);
              if (k > 0.25) {
                const e2 = (k - 0.06) * (k - 0.06), r2 = p.r0 * (1 - e2), a2 = p.a + p.sw * e2;
                g.strokeStyle = half(p.rgb);
                g.lineWidth = p.size * 0.5;
                g.beginPath();
                g.moveTo(x, y);
                g.lineTo(CX + Math.cos(a2) * r2, CY + Math.sin(a2) * r2 * 0.82);
                g.stroke();
              }
              continue;
            }
            const d = Math.exp(-p.drag * dt);
            p.vx *= d;
            p.vy = p.vy * d + p.g * dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            if (p.t === 1) {
              g.globalCompositeOperation = "lighter";
              g.globalAlpha = 1 - k * k;
              g.strokeStyle = solid(p.rgb);
              g.lineWidth = p.size;
              g.lineCap = "round";
              g.beginPath();
              g.moveTo(p.x, p.y);
              g.lineTo(p.x - p.vx * 0.045, p.y - p.vy * 0.045);
              g.stroke();
              const s = p.size * 3;
              g.drawImage(sprite(p.rgb), p.x - s, p.y - s, s * 2, s * 2);
            } else if (p.t === 2) {
              g.globalCompositeOperation = "lighter";
              g.globalAlpha = Math.sin(Math.PI * Math.min(1, k * 1.15)) * (0.6 + 0.4 * Math.sin(p.age * 30 + p.x));
              const s = p.size * 5;
              g.drawImage(sprite(p.rgb), p.x - s, p.y - s, s * 2, s * 2);
            } else {
              g.globalCompositeOperation = "source-over";
              g.globalAlpha = (1 - k) * 0.85;
              p.x += Math.sin(p.age * 3 + p.size * 9) * 22 * dt;
              g.fillStyle = solid(p.rgb);
              g.save();
              g.translate(p.x, p.y);
              g.rotate(p.age * p.vr);
              g.fillRect(-p.size, -p.size * 0.6, p.size * 2, p.size * 1.2);
              g.restore();
            }
          }
          g.globalAlpha = 1;
        }
        function cracks(n, len0, len1) {
          let d = "";
          for (let i = 0; i < n; i++) {
            let a = i / n * 6.283 + rnd(-0.25, 0.25), x = rnd(-8, 8), y = rnd(-8, 8);
            const L2 = rnd(len0, len1), seg = 6;
            let s = `M${x.toFixed(1)} ${y.toFixed(1)}`;
            for (let j = 0; j < seg; j++) {
              a += rnd(-0.55, 0.55);
              x += Math.cos(a) * L2 / seg;
              y += Math.sin(a) * L2 / seg;
              s += `L${x.toFixed(1)} ${y.toFixed(1)}`;
              if (j === 2 || j === 4) {
                const b = a + (Math.random() < 0.5 ? 1 : -1) * rnd(0.6, 1.1), bl = L2 * rnd(0.12, 0.28);
                s += `M${x.toFixed(1)} ${y.toFixed(1)}L${(x + Math.cos(b) * bl).toFixed(1)} ${(y + Math.sin(b) * bl).toFixed(1)}M${x.toFixed(1)} ${y.toFixed(1)}`;
              }
            }
            d += `<path class="g" pathLength="1" d="${s}"/><path class="c" pathLength="1" d="${s}"/>`;
          }
          const svg = q(".w-enh-cracks");
          svg.innerHTML = d;
          for (const p of svg.querySelectorAll("path")) A(p, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 240, easing: "cubic-bezier(.1,.8,.2,1)" });
        }
        function shatter() {
          const box = q(".w-enh-shards"), N = 5, S = 192, c = S / N, pts = [];
          box.style.cssText = "left:-96px;top:-96px;width:192px;height:192px";
          for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) pts.push([i * c + (i > 0 && i < N ? rnd(-c * 0.36, c * 0.36) : 0), j * c + (j > 0 && j < N ? rnd(-c * 0.36, c * 0.36) : 0)]);
          const bg = ico.style.backgroundImage, bs = ico.style.backgroundSize, bp = ico.style.backgroundPosition;
          const tri = (a, b, d2) => {
            const mx = (a[0] + b[0] + d2[0]) / 3, my = (a[1] + b[1] + d2[1]) / 3, el = doc.createElement("i");
            el.style.cssText = `background-image:${bg.replace(/"/g, "'")};background-size:${bs};background-position:${bp};clip-path:polygon(${a[0].toFixed(1)}px ${a[1].toFixed(1)}px,${b[0].toFixed(1)}px ${b[1].toFixed(1)}px,${d2[0].toFixed(1)}px ${d2[1].toFixed(1)}px);transform-origin:${mx.toFixed(1)}px ${my.toFixed(1)}px`;
            box.appendChild(el);
            const dx = mx - S / 2, dy = my - S / 2, dl = Math.hypot(dx, dy) || 1, sp = rnd(90, 330) * (0.7 + dl / 96 * 0.6), ang = Math.atan2(dy, dx) + rnd(-0.35, 0.35);
            const tx = Math.cos(ang) * sp, ty = Math.sin(ang) * sp, rot = rnd(-720, 720), ax = `${rnd(-1, 1).toFixed(2)},${rnd(-1, 1).toFixed(2)},${rnd(0.2, 1).toFixed(2)}`;
            A(el, [
              { transform: "translate(0,0) rotate3d(0,0,1,0deg) scale(1)", opacity: 1, easing: "cubic-bezier(.05,.75,.3,1)" },
              { transform: `translate(${(tx * 0.82).toFixed(0)}px,${(ty * 0.82 - 16).toFixed(0)}px) rotate3d(${ax},${(rot * 0.7).toFixed(0)}deg) scale(1.05)`, opacity: 1, offset: 0.5, easing: "ease-in" },
              { transform: `translate(${tx.toFixed(0)}px,${(ty + rnd(160, 380)).toFixed(0)}px) rotate3d(${ax},${rot.toFixed(0)}deg) scale(.7)`, opacity: 0 }
            ], { duration: rnd(1e3, 1500), easing: "linear" });
          };
          for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
            const a = pts[j * (N + 1) + i], b = pts[j * (N + 1) + i + 1], c2 = pts[(j + 1) * (N + 1) + i + 1], d2 = pts[(j + 1) * (N + 1) + i];
            if (Math.random() < 0.5) {
              tri(a, b, c2);
              tri(a, c2, d2);
            } else {
              tri(a, b, d2);
              tri(b, c2, d2);
            }
          }
        }
        const shake = (el, cls = "w-shake") => {
          if (stVal.shake === false) return;
          el.classList.remove(cls);
          void el.offsetWidth;
          el.classList.add(cls);
        };
        const ringPop = (el, s0, s1, dur, delay = 0) => A(el, [{ transform: `scale(${s0})`, opacity: 1, borderWidth: "8px" }, { transform: `scale(${s1})`, opacity: 0, borderWidth: "1px" }], { duration: dur, delay, easing: "cubic-bezier(.1,.7,.3,1)" });
        const ev = [];
        const at = (ms, fn) => ev.push([ms, fn]);
        at(0, () => {
          emit("enhanceFx", { kind, phase: "start" });
          A(stage, [{ transform: "scale(.8)", opacity: 0 }, { transform: "scale(1)", opacity: 1 }], { duration: 200 });
          A(q(".w-enh-aura"), [{ transform: "scale(.4)", opacity: 0 }, { transform: "scale(1.25)", opacity: 1 }], { duration: RES, easing: "ease-in" });
          A(heat, [{ opacity: 0 }, { opacity: 0.12, offset: 0.6 }, { opacity: 0.85 }], { duration: RES, easing: "ease-in" });
          A(hammer, [{ opacity: 0 }, { opacity: 1 }], { duration: 120, delay: 40 });
        });
        HITS.forEach((t, n) => {
          at(t - 150, () => A(hammer, [{ transform: "rotate(38deg)" }, { transform: "rotate(-44deg)", offset: 0.44, easing: "ease-out" }, { transform: "rotate(38deg)" }], { duration: 340, easing: "cubic-bezier(.6,0,.9,.4)", fill: "none" }));
          at(t, () => {
            emit("enhanceFx", { kind, phase: "hit", n });
            gauge.style.width = `calc(${[33.3, 66.6, 100][n]}% - 2px)`;
            A(wrap, [{ transform: "translate(-9px,12px) scale(.93) rotate(-2deg)", filter: "brightness(2.4)" }, { transform: "none", filter: "brightness(1)" }], { duration: 190, fill: "none" });
            A(stage, [{ transform: "translate(-5px,7px)" }, { transform: "translate(3px,-3px)" }, { transform: "none" }], { duration: 150, fill: "none" });
            ringPop(rings[0], 0.7, 2.2 + n * 0.5, 320);
            burst(34 + n * 14, CX + 58, CY - 62, [GOLD, WHITE, EMBER], 300, 1100 + n * 200, { a0: 2.2, a1: 5.4, g: 1500, l0: 0.3, l1: 0.75, s0: 1.5, s1: 3.2 });
            burst(8, CX + 58, CY - 62, WHITE, 40, 160, { t: 2, g: -30, l0: 0.2, l1: 0.4, s0: 6, s1: 12 });
          });
        });
        at(HITS[2] + 40, () => {
          A(hammer, [{ opacity: 1 }, { opacity: 0 }], { duration: 110 });
          for (const c of qa(".w-enh-circle")) try {
            c.getAnimations()[0].playbackRate = 5;
          } catch (_) {
          }
        });
        at(RES, () => {
          lay.classList.add("res");
          emit("enhanceFx", { kind, phase: "result" });
          for (const c of qa(".w-enh-circle")) try {
            c.getAnimations()[0].playbackRate = 1;
          } catch (_) {
          }
        });
        if (kind === "success") {
          at(RES, () => {
            flash.style.background = "radial-gradient(60% 70% at 50% 41%, #ffffff 0%, #fff0b8 35%, rgba(255,190,70,.85) 70%, rgba(255,150,30,.6) 100%)";
            A(flash, [{ opacity: 0.96 }, { opacity: 0.5, offset: 0.25 }, { opacity: 0 }], { duration: 620 });
            A(heat, [{ opacity: 0.9 }, { opacity: 0 }], { duration: 520 });
            A(q(".w-enh-rays"), [{ opacity: 0, transform: "scale(.3)" }, { opacity: 1, transform: "scale(1)" }], { duration: 300, composite: "add" });
            const fl = qa(".w-enh-flare");
            A(fl[0], [{ opacity: 1, transform: "scale(.1,3)" }, { opacity: 0.9, transform: "scale(1,1.6)", offset: 0.3 }, { opacity: 0.35, transform: "scale(.8,.6)" }], { duration: 1100 });
            A(fl[1], [{ opacity: 1, transform: "rotate(90deg) scale(.1,3)" }, { opacity: 0.8, transform: "rotate(90deg) scale(.5,1.4)", offset: 0.3 }, { opacity: 0.2, transform: "rotate(90deg) scale(.4,.5)" }], { duration: 1100 });
            ringPop(rings[0], 0.5, 8, 750);
            ringPop(rings[1], 0.5, 6.5, 850, 110);
            ringPop(rings[2], 0.5, 5, 950, 240);
            A(wrap, [{ transform: "scale(1)" }, { transform: "scale(1.62)", offset: 0.3 }, { transform: "scale(1.18)", offset: 0.62 }, { transform: "scale(1.28)" }], { duration: 560, easing: "ease-out" });
            A(q(".w-enh-plus .from"), [{ transform: "none", opacity: 1 }, { transform: "translateY(-46px) scale(.7)", opacity: 0 }], { duration: 240, delay: 60 });
            A(q(".w-enh-plus .to"), [{ transform: "translateY(26px) scale(3.4)", opacity: 0 }, { transform: "translateY(26px) scale(.9)", opacity: 1, offset: 0.6 }, { transform: "translateY(26px) scale(1.12)", opacity: 1 }], { duration: 340, delay: 170, easing: "cubic-bezier(.2,.8,.3,1)" });
            q(".w-enh-head small").textContent = "\uAC15\uD654 \uC644\uB8CC";
            q(".w-enh-head b").textContent = `+${to} ${name}`;
            burst(170, CX, CY, [GOLD, WHITE, GOLD, EMBER], 350, 1900, { g: 520, drag: 1.9, l0: 0.6, l1: 1.5, s0: 1.6, s1: 4 });
            burst(60, CX, CY, [WHITE, GOLD], 60, 520, { t: 2, g: -60, drag: 1.2, l0: 0.7, l1: 1.4, s0: 3, s1: 9 });
            const es = enW.el.querySelector(".w-slot.big");
            if (es) A(es, [{ filter: "brightness(4)" }, { filter: "brightness(1)" }], { duration: 900, fill: "none" });
          });
          at(RES + 130, () => {
            big.textContent = "\uAC15\uD654 \uC131\uACF5!";
            A(big, [{ transform: "scale(3.6)", opacity: 0, filter: "blur(10px) brightness(3)" }, { transform: "scale(.9)", opacity: 1, filter: "blur(0) brightness(1.6)", offset: 0.55 }, { transform: "scale(1.06)", opacity: 1, offset: 0.78 }, { transform: "scale(1)", opacity: 1 }], { duration: 420, easing: "cubic-bezier(.3,0,.4,1)", composite: "add" });
          });
          at(RES + 360, () => {
            shake(lay.querySelector(".w-enh-result"), "w-shake");
            burst(70, CX, 800, [GOLD, WHITE], 200, 1300, { a0: 3.3, a1: 6.1, g: 900, l0: 0.5, l1: 1.1 });
          });
          at(RES + 430, () => {
            sub.innerHTML = `<b>+${from}</b><i>\u25B6</i><b class="t">+${to}</b> <span class="rar-${item.rarity || "common"}">${esc(name)}</span>`;
            A(sub, [{ opacity: 0, transform: "translateY(16px)" }, { opacity: 1, transform: "none" }], { duration: 260 });
          });
        } else if (kind === "fail") {
          at(RES, () => {
            P.length = 0;
            flash.style.background = "radial-gradient(70% 80% at 50% 41%, #ffd0c0 0%, #ff3a1e 40%, rgba(160,0,0,.9) 100%)";
            A(flash, [{ opacity: 0.92 }, { opacity: 0.35, offset: 0.3 }, { opacity: 0 }], { duration: 520 });
            A(q(".w-enh-vig"), [{ opacity: 0 }, { opacity: 1, offset: 0.15 }, { opacity: 0.55 }], { duration: 900 });
            A(heat, [{ opacity: 0.9 }, { opacity: 0 }], { duration: 140 });
            A(q(".w-enh-aura"), [{ opacity: 1 }, { opacity: 0 }], { duration: 200 });
            cracks(9, 150, 310);
            ringPop(rings[0], 0.6, 5, 600);
            shake(stage);
            shake(L.wins);
            A(wrap, [{ transform: "scale(1.12) rotate(3deg)" }, { transform: "translateY(16px) rotate(-5deg) scale(.96)" }], { duration: 380, easing: "cubic-bezier(.3,1.6,.5,1)" });
            A(q(".w-enh-plus .from"), [{ transform: "translateX(-14px)" }, { transform: "translateX(12px)" }, { transform: "translateX(-8px)" }, { transform: "translateX(5px)" }, { transform: "none" }], { duration: 360, fill: "none" });
            q(".w-enh-head small").textContent = "\uAC15\uD654 \uC2E4\uD328";
            burst(120, CX, CY, [RED, EMBER, RED], 250, 1300, { g: 1500, drag: 1.4, l0: 0.5, l1: 1.2, s0: 1.5, s1: 3.6 });
            for (let i = 0; i < 46; i++) add({ t: 3, x: CX + rnd(-110, 110), y: CY + rnd(-110, 90), vx: rnd(-160, 160), vy: rnd(-260, 60), g: 420, drag: 0.8, life: rnd(0.8, 1.3), size: rnd(2, 5), rgb: i % 3 ? "40,16,12" : "120,30,20", vr: rnd(-8, 8) });
          });
          if (to !== from) at(RES + 380, () => {
            q(".w-enh-plus .from").textContent = "+" + to;
            q(".w-enh-head b").textContent = `+${to} ${name}`;
          });
          at(RES + 130, () => {
            big.textContent = "\uAC15\uD654 \uC2E4\uD328";
            A(big, [{ transform: "scale(3) rotate(-5deg)", opacity: 0, filter: "blur(8px)" }, { transform: "scale(.94) rotate(-2deg)", opacity: 1, filter: "blur(0)", offset: 0.6 }, { transform: "scale(1) rotate(-2deg)", opacity: 1 }], { duration: 300, easing: "cubic-bezier(.4,0,.6,1)", composite: "add" });
          });
          at(RES + 320, () => {
            shake(lay.querySelector(".w-enh-result"));
          });
          at(RES + 440, () => {
            sub.innerHTML = to < from ? `\uAC15\uD654 \uC218\uCE58\uAC00 <b>+${from}</b>\uC5D0\uC11C <b>+${to}</b>${/[036]$/.test(String(to)) ? "\uC73C\uB85C" : "\uB85C"} \uB5A8\uC5B4\uC84C\uC2B5\uB2C8\uB2E4` : `<b>+${from}</b> \uADF8\uB300\uB85C\u2026 \uC8FC\uBB38\uC11C\uB9CC \uC7AC\uAC00 \uB418\uC5B4 \uD769\uC5B4\uC9D1\uB2C8\uB2E4`;
            A(sub, [{ opacity: 0 }, { opacity: 1 }], { duration: 300 });
            A(big, [{ transform: "translateY(0)" }, { transform: "translateY(8px)" }], { duration: 900, composite: "add", easing: "ease-in" });
          });
        } else {
          at(RES, () => {
            P.length = 0;
            flash.style.background = "#ffffff";
            A(flash, [{ opacity: 0.9 }, { opacity: 0 }], { duration: 240 });
            cracks(11, 90, 170);
            A(wrap, [{ transform: "translate(-7px,4px)" }, { transform: "translate(8px,-5px)" }, { transform: "translate(-9px,-3px)" }, { transform: "translate(7px,6px)" }, { transform: "translate(-5px,2px) scale(1.08)" }, { transform: "translate(4px,-2px) scale(1.14)" }], { duration: 200, easing: "linear" });
            q(".w-enh-head small").textContent = "\uAC15\uD654 \uC2E4\uD328";
          });
          at(RES + 200, () => {
            lay.classList.add("gone");
            emit("enhanceFx", { kind, phase: "shatter" });
            flash.style.background = "radial-gradient(50% 60% at 50% 41%, #ffffff 0%, rgba(210,225,255,.9) 40%, rgba(120,130,150,.5) 100%)";
            A(flash, [{ opacity: 1 }, { opacity: 0.3, offset: 0.3 }, { opacity: 0 }], { duration: 560 });
            A(heat, [{ opacity: 0.9 }, { opacity: 0 }], { duration: 100 });
            A(q(".w-enh-aura"), [{ opacity: 1 }, { opacity: 0 }], { duration: 300 });
            A(q(".w-enh-cracks"), [{ opacity: 1 }, { opacity: 0 }], { duration: 260 });
            A(wrap, [{ transform: "scale(1.14)" }, { transform: "scale(1)" }], { duration: 300 });
            shatter();
            shake(stage);
            shake(L.wins);
            ringPop(rings[0], 0.5, 9, 800);
            ringPop(rings[1], 0.5, 6, 1e3, 120);
            burst(90, CX, CY, [ICE, "255,255,255", "200,205,215"], 300, 1700, { g: 700, drag: 2, l0: 0.3, l1: 0.7, s0: 1.4, s1: 3.2 });
            for (let i = 0; i < 150; i++) add({ t: 3, x: CX + rnd(-150, 150), y: CY + rnd(-130, 130), vx: rnd(-240, 240), vy: rnd(-330, 40), g: -40, drag: 1.5, life: rnd(0.9, 1.25), size: rnd(1.5, 5), rgb: ["150,154,164", "92,96,106", "200,204,212"][i % 3], vr: rnd(-6, 6) });
            q(".w-enh-head b").className = "";
            q(".w-enh-head b").style.color = "#7d818b";
            q(".w-enh-head small").textContent = "\uC7A5\uBE44 \uC18C\uBA78";
          });
          at(RES + 430, () => {
            big.textContent = "\uC7A5\uBE44\uAC00 \uC99D\uBC1C\uD588\uC2B5\uB2C8\uB2E4\u2026";
            A(big, [{ opacity: 0, letterSpacing: ".7em", filter: "blur(12px)" }, { opacity: 1, letterSpacing: ".2em", filter: "blur(0)" }], { duration: 650, easing: "cubic-bezier(.2,.7,.2,1)" });
          });
          at(RES + 600, () => {
            sub.innerHTML = `+${from} ${esc(name)} \u2014 \uB2E4\uC2DC\uB294 \uB3CC\uC544\uC624\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4`;
            A(sub, [{ opacity: 0 }, { opacity: 1 }], { duration: 180 });
          });
        }
        at(TOTAL - 230, () => {
          lay.classList.remove("on");
        });
        ev.sort((a, b) => a[0] - b[0]);
        let ei = 0, raf = 0, done = false, last = performance.now(), spawnAcc = 0;
        const T0 = last;
        function frame(now) {
          if (done) return;
          const t = now - T0, dt = Math.min(0.05, (now - last) / 1e3);
          last = now;
          while (ei < ev.length && ev[ei][0] <= t) ev[ei++][1]();
          if (t < RES) {
            spawnAcc += dt * (70 + 260 * (t / RES));
            while (spawnAcc >= 1) {
              spawnAcc--;
              add({ t: 0, a: Math.random() * 6.283, r0: rnd(320, 640), sw: rnd(1.2, 2.6), life: rnd(0.35, 0.6), size: rnd(3, 8), rgb: Math.random() < 0.3 ? WHITE : GOLD });
            }
          } else if (kind === "success" && t < TOTAL - 350) {
            spawnAcc += dt * 150;
            while (spawnAcc >= 1) {
              spawnAcc--;
              const a = Math.random() * 6.283, r = rnd(40, 300);
              add({ t: 2, x: CX + Math.cos(a) * r, y: CY + Math.sin(a) * r * 0.7 + 40, vx: rnd(-40, 40), vy: rnd(-380, -120), g: -80, drag: 0.6, life: rnd(0.5, 1), size: rnd(1.5, 5), rgb: Math.random() < 0.3 ? WHITE : GOLD });
            }
          } else if (kind === "destroy" && t > RES + 250 && t < TOTAL - 350) {
            spawnAcc += dt * 50;
            while (spawnAcc >= 1) {
              spawnAcc--;
              add({ t: 3, x: CX + rnd(-260, 260), y: CY + rnd(-60, 160), vx: rnd(-30, 30), vy: rnd(-130, -40), g: -20, drag: 0.4, life: rnd(0.6, 1), size: rnd(1.2, 3.5), rgb: "128,132,142", vr: rnd(-4, 4) });
            }
          }
          stepParticles(dt);
          if (t >= TOTAL) return finish();
          raf = requestAnimationFrame(frame);
        }
        function finish() {
          if (done) return;
          done = true;
          cancelAnimationFrame(raf);
          clearTimeout(guard);
          lay.className = "w-layer w-enh";
          lay.innerHTML = "";
          L.wins.classList.remove("w-shake", "fx-dim");
          L["dlg-layer"].classList.remove("fx-dim");
          enW.el.classList.remove("busy");
          if (playing === handle) playing = null;
          emit("enhanceFx", { kind, phase: "end" });
          resolve(kind);
        }
        const handle = { finish };
        const guard = setTimeout(finish, TOTAL + 1500);
        playing = handle;
        raf = requestAnimationFrame(frame);
      });
    }
    enhance.set({});
    character.set({ name: "\uCE74\uC77C", level: 1, guild: "\uC740\uC0AC\uC790", stats: {}, equip: [] });
    return {
      loading,
      title,
      open,
      close,
      toggle,
      isOpen,
      closeAll,
      inventory,
      character,
      enhance,
      skills,
      guild,
      settings,
      dialog,
      raidResult,
      death,
      ending,
      // 게임 쪽 단축키·이동 입력을 막아야 하는 상태인지(대화·결과판·사망·전체 화면·강화 연출)
      isBlocking: () => !!(dlgEl || raidEl || deathEl || loadEl || titleEl || endEl || playing),
      setLowFx(on) {
        lowFxForced = on == null ? null : !!on;
        applyLowFx();
      },
      destroy() {
        keyTarget.removeEventListener("keydown", onKey, true);
        if (playing) playing.finish();
        dialog.hide();
        death.hide();
        clearInterval(loadTimer);
        for (const k in L) L[k].remove();
        tip.remove();
      }
    };
  }

  // game/dev/ui_win_test.js
  var st = document.createElement("style");
  st.textContent = theme_default;
  document.head.appendChild(st);
  var root = document.getElementById("ui");
  var events = [];
  var win = create({
    root,
    img: (key) => "../../assets/" + key,
    emit: (name, data) => {
      events.push([name, data]);
      if (events.length > 200) events.shift();
      if (name !== "enhanceFx") console.log("[emit]", name, JSON.stringify(data));
      onEmit(name, data);
    }
  });
  var ITEM = { icon: 0, name: "\uC5EC\uBA85\uC758 \uC7A5\uAC80", plus: 7, rarity: "epic" };
  var INV = {
    gold: 1284500,
    items: [
      { id: "sword", icon: 0, name: "\uC5EC\uBA85\uC758 \uC7A5\uAC80", count: 1, rarity: "epic", plus: 7, equipped: true },
      { id: "shield", icon: 1, name: "\uC740\uC0AC\uC790 \uBC29\uD328", count: 1, rarity: "rare", plus: 5, equipped: true },
      { id: "helm", icon: 2, name: "\uC131\uCC44 \uC218\uBE44\uB300 \uD22C\uAD6C", count: 1, rarity: "rare", plus: 4, equipped: true },
      { id: "armor", icon: 3, name: "\uB9F9\uC138\uC758 \uD310\uAE08 \uAC11\uC637", count: 1, rarity: "epic", plus: 6, equipped: true },
      { id: "glove", icon: 4, name: "\uAC15\uCCA0 \uAC74\uD2C0\uB9BF", count: 1, rarity: "common", plus: 3, equipped: true },
      { id: "boots", icon: 5, name: "\uC21C\uCC30\uB300 \uC7A5\uD654", count: 1, rarity: "common", plus: 3, equipped: true },
      { id: "cloak", icon: 6, name: "\uD478\uB978 \uC11C\uC57D\uC758 \uB9DD\uD1A0", count: 1, rarity: "rare", plus: 2, equipped: true },
      { id: "ring", icon: 7, name: "\uCC3D\uACF5\uC758 \uBC18\uC9C0", count: 1, rarity: "legend", plus: 0, equipped: true },
      { id: "neck", icon: 8, name: "\uD54F\uBE5B \uB9F9\uC138 \uBAA9\uAC78\uC774", count: 1, rarity: "epic", plus: 0, equipped: true },
      { id: "hp", icon: 9, kind: "use", name: "\uBE68\uAC04 \uBB3C\uC57D", count: 284, rarity: "common" },
      { id: "mp", icon: 10, kind: "use", name: "\uD30C\uB780 \uBB3C\uC57D", count: 97, rarity: "common" },
      { id: "scrW", icon: 11, kind: "use", name: "\uBB34\uAE30 \uAC15\uD654 \uC8FC\uBB38\uC11C", count: 12, rarity: "rare" },
      { id: "scrA", icon: 12, kind: "use", name: "\uBC29\uC5B4\uAD6C \uAC15\uD654 \uC8FC\uBB38\uC11C", count: 8, rarity: "rare" },
      { id: "scrB", icon: 13, kind: "use", name: "\uCD95\uBCF5\uBC1B\uC740 \uC8FC\uBB38\uC11C", count: 2, rarity: "legend" },
      { id: "gem", icon: 15, kind: "etc", name: "\uB9C8\uB825 \uACB0\uC815", count: 36, rarity: "epic" },
      { id: "sword2", icon: 0, name: "\uB0A1\uC740 \uC7A5\uAC80", count: 1, rarity: "common", plus: 0 },
      { id: "gold", icon: 14, kind: "etc", name: "\uAE08\uD654 \uC8FC\uBA38\uB2C8", count: 3, rarity: "common" },
      { id: "fang", icon: 15, kind: "etc", name: "\uB291\uB300\uC778\uAC04\uC758 \uC1A1\uACF3\uB2C8 \uC870\uAC01", count: 14, rarity: "common" },
      { id: "seal", icon: 14, kind: "etc", name: "\uC740\uC0AC\uC790 \uBB38\uD30C \uC778\uC7A5", count: 1, rarity: "rare" }
    ]
  };
  var CHAR = {
    name: "\uCE74\uC77C",
    level: 52,
    guild: "\uC740\uC0AC\uC790",
    stats: { \uC804\uD22C\uB825: 48210, \uACF5\uACA9\uB825: 1284, \uBC29\uC5B4\uB825: 962, \uCCB4\uB825: 18400, \uB0B4\uB825: 3250, \uBA85\uC911: 318, \uD68C\uD53C: 142, "\uCE58\uBA85\uD0C0 \uD655\uB960": "18.5%", "\uCE58\uBA85\uD0C0 \uD53C\uD574": "165%", "\uACF5\uACA9 \uC18D\uB3C4": "1.24", "\uC774\uB3D9 \uC18D\uB3C4": "112%", "\uBB3C\uC57D \uD68C\uBCF5\uB7C9": "+12%", "\uACBD\uD5D8\uCE58 \uD68D\uB4DD": "+8%" },
    equip: [
      { slot: "weapon", icon: 0, name: "\uC5EC\uBA85\uC758 \uC7A5\uAC80", plus: 7, rarity: "epic" },
      { slot: "shield", icon: 1, name: "\uC740\uC0AC\uC790 \uBC29\uD328", plus: 5, rarity: "rare" },
      { slot: "helmet", icon: 2, name: "\uC131\uCC44 \uC218\uBE44\uB300 \uD22C\uAD6C", plus: 4, rarity: "rare" },
      { slot: "armor", icon: 3, name: "\uB9F9\uC138\uC758 \uD310\uAE08 \uAC11\uC637", plus: 6, rarity: "epic" },
      { slot: "gloves", icon: 4, name: "\uAC15\uCCA0 \uAC74\uD2C0\uB9BF", plus: 3, rarity: "common" },
      { slot: "boots", icon: 5, name: "\uC21C\uCC30\uB300 \uC7A5\uD654", plus: 3, rarity: "common" },
      { slot: "cloak", icon: 6, name: "\uD478\uB978 \uC11C\uC57D\uC758 \uB9DD\uD1A0", plus: 2, rarity: "rare" },
      { slot: "ring", icon: 7, name: "\uCC3D\uACF5\uC758 \uBC18\uC9C0", plus: 0, rarity: "legend" },
      { slot: "necklace", icon: 8, name: "\uD54F\uBE5B \uB9F9\uC138 \uBAA9\uAC78\uC774", plus: 0, rarity: "epic" }
    ]
  };
  var ENH = {
    item: ITEM,
    scrolls: 12,
    blessed: 2,
    rate: 0.33,
    nextPlus: 8,
    safe: false,
    log: ["+4 \uC5EC\uBA85\uC758 \uC7A5\uAC80 \uAC15\uD654 \uC131\uACF5", "+5 \uC5EC\uBA85\uC758 \uC7A5\uAC80 \uAC15\uD654 \uC131\uACF5", "+6 \uC5EC\uBA85\uC758 \uC7A5\uAC80 \uAC15\uD654 \uC2E4\uD328", "+6 \uC5EC\uBA85\uC758 \uC7A5\uAC80 \uAC15\uD654 \uC131\uACF5", "+7 \uC5EC\uBA85\uC758 \uC7A5\uAC80 \uAC15\uD654 \uC131\uACF5"]
  };
  function fill() {
    win.inventory.set(INV);
    win.character.set(CHAR);
    win.enhance.set(ENH);
  }
  function reset() {
    win.loading.hide();
    win.title.hide();
    win.ending.hide();
    win.dialog.hide();
    win.raidResult.hide();
    win.death.hide();
    win.closeAll();
  }
  function onEmit(name, data) {
    if (name === "enhance") {
      const r = Math.random(), kind = r < 0.4 ? "success" : r < 0.75 ? "fail" : "destroy";
      win.enhance.play(kind, { from: ENH.item.plus, to: kind === "success" ? ENH.item.plus + 1 : kind === "fail" ? ENH.item.plus : 0, name: ENH.item.name }).then(() => {
        if (kind === "success") {
          ENH.item.plus++;
          ENH.nextPlus++;
        }
        ENH.scrolls = Math.max(0, ENH.scrolls - 1);
        ENH.log.push(`+${ENH.item.plus} ${ENH.item.name} \uAC15\uD654 ${kind === "success" ? "\uC131\uACF5" : kind === "fail" ? "\uC2E4\uD328" : "\uC2E4\uD328 \u2014 \uC7A5\uBE44 \uC99D\uBC1C"}`);
        win.enhance.set(ENH);
      });
    }
    if (name === "dialog") win.dialog.hide();
    if (name === "revive") win.death.hide();
  }
  var STEPS = [
    ["\uB85C\uB529", () => {
      win.loading.show();
      win.loading.set(0.62, "\uC18D\uC0AD\uC774\uB294 \uC232\uC758 \uB098\uBB34\uB97C \uC2EC\uB294 \uC911\u2026");
    }],
    ["\uD0C0\uC774\uD2C0", () => win.title.show({ onStart: () => window.demoStep(15), onDemo: () => window.demoStep(11) })],
    ["\uAC00\uBC29", () => win.open("inventory")],
    ["\uC7A5\uBE44", () => win.open("character")],
    ["\uAC15\uD654 \uCC3D", () => win.open("enhance")],
    ["\uAC15\uD654 \uC131\uACF5", () => {
      win.open("enhance");
      win.enhance.play("success", { from: 7, to: 8, name: "\uC5EC\uBA85\uC758 \uC7A5\uAC80" }).then((k) => {
        window.__PLAYED__ = k;
      });
    }],
    ["\uAC15\uD654 \uC2E4\uD328", () => {
      win.open("enhance");
      win.enhance.play("fail", { from: 7, to: 7, name: "\uC5EC\uBA85\uC758 \uC7A5\uAC80" }).then((k) => {
        window.__PLAYED__ = k;
      });
    }],
    ["\uAC15\uD654 \uC99D\uBC1C", () => {
      win.open("enhance");
      win.enhance.play("destroy", { from: 7, to: 0, name: "\uC5EC\uBA85\uC758 \uC7A5\uAC80" }).then((k) => {
        window.__PLAYED__ = k;
      });
    }],
    ["NPC \uB300\uD654", () => win.dialog.show({
      name: "\uBE0C\uB86C",
      role: "\uBCA8\uB85C\uC2A4 \uC131\uCC44\uC758 \uB300\uC7A5\uC7A5\uC774",
      portrait: "ui/portrait_blacksmith.jpg",
      instant: /instant/.test(location.search),
      text: "\uC5B4\uC774, \uC740\uC0AC\uC790\uC758 \uAE30\uC0AC \uC591\uBC18. \uADF8 \uAC80\u2026 \uC5EC\uBA85\uC758 \uC7A5\uAC80\uC774\uB85C\uAD70.\n+7 \uAE4C\uC9C0 \uC62C\uB838\uC73C\uBA74 \uC774\uC81C\uBD80\uD134 \uC6B4\uC5D0 \uB9E1\uACA8\uC57C \uD574. \uC2E4\uD328\uD558\uBA74 \uAC80\uC774 \uC7AC\uAC00 \uB420 \uC218\uB3C4 \uC788\uC5B4.\n\uADF8\uB798\uB3C4 \uB450\uB4DC\uB824 \uBCF4\uACA0\uB098?",
      options: [{ label: "\uAC15\uD654\uB97C \uBD80\uD0C1\uD55C\uB2E4", id: "enhance" }, { label: "\uC8FC\uBB38\uC11C\uB97C \uC0AC\uACE0 \uC2F6\uB2E4", id: "shop" }, { label: "\uBC1C\uCE74\uB974\uC5D0 \uB300\uD574 \uBB3B\uB294\uB2E4", id: "lore" }, { label: "\uB2E4\uC74C\uC5D0 \uC624\uACA0\uB2E4", id: "bye" }]
    })],
    ["\uB808\uC774\uB4DC \uACB0\uACFC", () => win.raidResult.show({
      title: "\uD1A0\uBC8C \uC131\uACF5",
      sub: "\uC5FC\uC625\uC758 \uAD70\uC8FC \uBC1C\uCE74\uB974 \xB7 \uC7BF\uBD88 \uC81C\uB2E8 \xB7 \uC18C\uC694 \uC2DC\uAC04 04\uBD84 37\uCD08",
      rank: [
        { name: "\uCE74\uC77C", guild: "\uC740\uC0AC\uC790", dmg: 1284300, mvp: true, me: true },
        { name: "\uB2EC\uBE5B\uD654\uC0B4", guild: "\uC740\uC0AC\uC790", dmg: 1102950 },
        { name: "\uC11C\uB9AC\uB9C8\uB140", guild: "\uC740\uC0AC\uC790", dmg: 968400 },
        { name: "\uBD89\uC740\uAE43", guild: "\uBD89\uC740\uAE4C\uB9C8\uADC0", dmg: 742100 },
        { name: "\uBB34\uC1E0\uC8FC\uBA39", guild: "\uC740\uC0AC\uC790", dmg: 655800 },
        { name: "\uD3ED\uD48D\uC804\uC57C", guild: "\uD3ED\uD48D", dmg: 498230 },
        { name: "\uAC00\uC2DC\uB364\uBD88", guild: "\uAC00\uC2DC\uC7A5\uBBF8", dmg: 301770 }
      ],
      loot: [{ icon: 13, name: "\uCD95\uBCF5\uBC1B\uC740 \uC8FC\uBB38\uC11C", rarity: "legend" }, { icon: 15, name: "\uC5FC\uC625\uC758 \uB9C8\uB825 \uACB0\uC815", rarity: "epic", count: 3 }, { icon: 7, name: "\uC7BF\uBD88\uC758 \uBC18\uC9C0", rarity: "epic" }, { icon: 14, name: "\uAE08\uD654", rarity: "common", count: 25e4 }]
    })],
    ["\uC0AC\uB9DD", () => win.death.show({ sec: 12, by: "\uC5FC\uC625\uC758 \uAD70\uC8FC \uBC1C\uCE74\uB974" })],
    ["\uC5D4\uB529", () => win.ending.show({ lines: ["\uAE30\uC0AC \uCE74\uC77C \u2014 \uB808\uBCA8 52 \uB2EC\uC131", "\uC5EC\uBA85\uC758 \uC7A5\uAC80 +9 \uAC15\uD654 \uC131\uACF5", "\uC5FC\uC625\uC758 \uAD70\uC8FC \uBC1C\uCE74\uB974 \uD1A0\uBC8C \xB7 \uAE30\uC5EC\uB3C4 1\uC704", "\uC740\uC0AC\uC790 \uBB38\uD30C\uC640 \uD568\uAED8\uD55C \uBAA8\uD5D8 12\uBD84 40\uCD08"] })],
    ["\uC2A4\uD0AC", () => win.open("skills")],
    ["\uBB38\uD30C", () => win.open("guild")],
    ["\uC124\uC815", () => win.open("settings")],
    ["\uCC3D \uC5EC\uB7EC \uAC1C", () => {
      win.open("character");
      win.open("inventory");
      win.open("enhance");
    }],
    ["\uB808\uC774\uB4DC \uACB0\uACFC(12\uBA85\xB7\uC804\uB9AC\uD488 7)", () => win.raidResult.show({
      title: "\uD1A0\uBC8C \uC131\uACF5",
      sub: "\uC5FC\uC625\uC758 \uAD70\uC8FC \uBC1C\uCE74\uB974 \xB7 \uC7BF\uBD88 \uC81C\uB2E8 \xB7 \uC18C\uC694 \uC2DC\uAC04 06\uBD84 12\uCD08",
      rank: ["\uBC31\uC57C\uC758\uAC80", "\uB2EC\uBE5B\uD654\uC0B4", "\uC11C\uB9AC\uB9C8\uB140", "\uBD89\uC740\uAE43", "\uBB34\uC1E0\uC8FC\uBA39", "\uD3ED\uD48D\uC804\uC57C", "\uAC00\uC2DC\uB364\uBD88", "\uC0C8\uBCBD\uBC14\uB78C", "\uBC24\uAE4C\uCE58", "\uC740\uBE5B\uAC08\uAE30", "\uCE74\uC77C", "\uB3C4\uD1A0\uB9AC\uC7A5\uC218"].map((name, i) => ({ name, guild: ["\uC740\uC0AC\uC790", "\uC740\uC0AC\uC790", "\uC740\uC0AC\uC790", "\uBD89\uC740\uAE4C\uB9C8\uADC0", "\uC740\uC0AC\uC790", "\uD3ED\uD48D", "\uAC00\uC2DC\uC7A5\uBBF8", "\uC740\uC0AC\uC790", "\uC740\uC0AC\uC790", "\uC0C8\uBCBD\uAC80", "\uC740\uC0AC\uC790", "\uCCA0\uAD8C\uB2E8"][i], dmg: Math.round(15e5 * Math.pow(0.82, i)), mvp: i === 0, me: name === "\uCE74\uC77C" })),
      loot: [
        { icon: 13, name: "\uCD95\uBCF5\uBC1B\uC740 \uC8FC\uBB38\uC11C", rarity: "legend" },
        { icon: 15, name: "\uC5FC\uC625\uC758 \uB9C8\uB825 \uACB0\uC815", rarity: "epic", count: 3 },
        { icon: 7, name: "\uC7BF\uBD88\uC758 \uBC18\uC9C0", rarity: "epic" },
        { icon: 14, name: "\uAE08\uD654", rarity: "common", count: 25e4 },
        { icon: 11, name: "\uBB34\uAE30 \uAC15\uD654 \uC8FC\uBB38\uC11C", rarity: "rare", count: 5 },
        { icon: 6, name: "\uC7BF\uBE5B \uBD88\uAF43 \uB9DD\uD1A0", rarity: "rare" },
        { icon: 9, name: "\uBE68\uAC04 \uBB3C\uC57D", rarity: "common", count: 50 }
      ]
    })],
    ["\uB808\uC774\uB4DC \uC2E4\uD328", () => win.raidResult.show({
      title: "\uD1A0\uBC8C \uC2E4\uD328",
      sub: "\uC5FC\uC625\uC758 \uAD70\uC8FC \uBC1C\uCE74\uB974 \xB7 \uC7BF\uBD88 \uC81C\uB2E8 \xB7 \uB0A8\uC740 \uCCB4\uB825 38%",
      rank: [{ name: "\uB2EC\uBE5B\uD654\uC0B4", guild: "\uC740\uC0AC\uC790", dmg: 702950, mvp: true }, { name: "\uCE74\uC77C", guild: "\uC740\uC0AC\uC790", dmg: 684300, me: true }, { name: "\uC11C\uB9AC\uB9C8\uB140", guild: "\uC740\uC0AC\uC790", dmg: 468400 }],
      loot: []
    })],
    ["NPC \uB300\uD654(\uAE34 \uAE00\xB7\uC120\uD0DD\uC9C0 7)", () => win.dialog.show({
      name: "\uBE0C\uB86C",
      role: "\uBCA8\uB85C\uC2A4 \uC131\uCC44\uC758 \uB300\uC7A5\uC7A5\uC774",
      portrait: "ui/portrait_blacksmith.jpg",
      instant: true,
      escId: "bye",
      text: "\uC5B4\uC774, \uC740\uC0AC\uC790\uC758 \uAE30\uC0AC \uC591\uBC18. \uADF8 \uAC80\u2026 \uC5EC\uBA85\uC758 \uC7A5\uAC80\uC774\uB85C\uAD70.\n+7 \uAE4C\uC9C0 \uC62C\uB838\uC73C\uBA74 \uC774\uC81C\uBD80\uD134 \uC6B4\uC5D0 \uB9E1\uACA8\uC57C \uD574. \uC2E4\uD328\uD558\uBA74 \uAC80\uC774 \uC7AC\uAC00 \uB420 \uC218\uB3C4 \uC788\uC5B4.\n\uB0B4\uAC00 \uC80A\uC5C8\uC744 \uC801\uC5D4 \uB9D0\uC774\uC9C0, \uC7BF\uBD88 \uC81C\uB2E8\uC5D0\uC11C \uCE90 \uC628 \uC1F3\uB369\uC774\uB85C \uD558\uB8E8\uC5D0 \uAC80 \uC5F4 \uC790\uB8E8\uB97C \uB450\uB4DC\uB838\uC5B4.\n\uADF8\uC911\uC5D0 \uC544\uD649\uC740 \uBD80\uB7EC\uC84C\uACE0, \uD558\uB098\uB294 \uC9C0\uAE08 \uC131\uC8FC\uB2D8 \uD5C8\uB9AC\uC5D0 \uAC78\uB824 \uC788\uC9C0.\n\uADF8\uB7EC\uB2C8 \uB0B4 \uB9D0 \uC0C8\uACA8\uB4E3\uAC8C. \uB9DD\uCE58\uB294 \uAC70\uC9D3\uB9D0\uC744 \uC548 \uD574. \uC6B4\uC774 \uAC70\uC9D3\uB9D0\uC744 \uD560 \uBFD0\uC774\uC57C.\n\uC8FC\uBB38\uC11C\uB294 \uB109\uB109\uD55C\uAC00? \uCD95\uBCF5\uBC1B\uC740 \uC8FC\uBB38\uC11C\uAC00 \uC788\uB2E4\uBA74 \uC870\uAE08\uC740 \uB0AB\uACA0\uC9C0.\n\uC790, \uC5B4\uCA4C\uACA0\uB098. \uB450\uB4DC\uB824 \uBCF4\uACA0\uB098, \uC544\uB2C8\uBA74 \uC624\uB298\uC740 \uBB3C\uB7EC\uAC00\uACA0\uB098?\n(\uBE0C\uB86C\uC774 \uBAA8\uB8E8 \uC704\uC758 \uB9DD\uCE58\uB97C \uC9D1\uC5B4 \uB4E0\uB2E4.)",
      options: [{ label: "\uAC15\uD654\uB97C \uBD80\uD0C1\uD55C\uB2E4", id: "enhance" }, { label: "\uC8FC\uBB38\uC11C\uB97C \uC0AC\uACE0 \uC2F6\uB2E4", id: "shop" }, { label: "\uBC1C\uCE74\uB974\uC5D0 \uB300\uD574 \uBB3B\uB294\uB2E4", id: "lore" }, { label: "\uC131\uC8FC\uB2D8\uC758 \uAC80\uC5D0 \uC5BD\uD78C \uC774\uC57C\uAE30\uB97C \uCC98\uC74C\uBD80\uD130 \uB05D\uAE4C\uC9C0 \uC804\uBD80 \uB4E4\uB824 \uB2EC\uB77C\uACE0 \uD55C\uB2E4", id: "tale" }, { label: "\uC7A5\uBE44\uB97C \uC218\uB9AC\uD55C\uB2E4", id: "repair" }, { label: "\uBB38\uD30C \uCC3D\uACE0\uB97C \uC5F0\uB2E4", id: "store" }, { label: "\uB2E4\uC74C\uC5D0 \uC624\uACA0\uB2E4", id: "bye" }]
    })],
    ["\uAE34 \uC785\uB825(\uC7A5\uBE44\xB7\uAC15\uD654 \uBD80\uBD84 \uAC31\uC2E0)", () => {
      win.character.set({ stats: Object.assign({ "\uC544\uC8FC \uAE34 \uB2A5\uB825\uCE58 \uC774\uB984 \uC2DC\uD5D8 \uD56D\uBAA9\uC785\uB2C8\uB2E4": "1,234,567" }, CHAR.stats), equip: CHAR.equip.concat([{ slot: "ring", icon: 7, name: "\uBC18\uC9C02 \u2014 \uC7BF\uBD88\uC758 \uBC18\uC9C0", plus: 1, rarity: "epic" }, { slot: "ring", icon: 7, name: "\uBC18\uC9C03(\uBB34\uC2DC\uB418\uC5B4\uC57C \uD568)", rarity: "common" }]) });
      win.enhance.set({ nextPlus: 9 });
      win.enhance.set({ item: { icon: 0, name: "\uC544\uC8FC \uAE34 \uC774\uB984\uC744 \uAC00\uC9C4 \uACE0\uB300 \uC655\uAD6D\uC758 \uC5EC\uBA85\uC744 \uBD80\uB974\uB294 \uC7A5\uAC80", plus: 15, rarity: "legend" } });
      win.open("character");
      win.open("enhance");
      win.open("inventory");
    }],
    ["\uAC15\uD654 \uC2E4\uD328(\uC218\uCE58 \uD558\uB77D)", () => {
      win.open("enhance");
      win.enhance.play("fail", { from: 7, to: 6, name: "\uC5EC\uBA85\uC758 \uC7A5\uAC80" }).then((k) => {
        window.__PLAYED__ = k;
      });
    }],
    ["\uAC15\uD654 \uCC3D + \uB300\uD654", () => {
      win.open("enhance");
      STEPS[8][1]();
    }]
  ];
  window.demoStep = (n) => {
    reset();
    fill();
    const s = STEPS[n];
    if (s) s[1]();
    return s ? s[0] : "\uC5C6\uC74C";
  };
  window.__WIN__ = win;
  window.__EVENTS__ = events;
  document.getElementById("keys").textContent = STEPS.map((s, i) => `${i}:${s[0]}`).join("  ") + "  (\uC22B\uC790 \uD0A4 0~9, [ ] \uB85C \uC774\uB3D9)";
  var cur = +(new URLSearchParams(location.search).get("step") || 15);
  addEventListener("keydown", (e) => {
    if (e.key === "]") cur = (cur + 1) % STEPS.length;
    else if (e.key === "[") cur = (cur + STEPS.length - 1) % STEPS.length;
    else return;
    window.demoStep(cur);
  });
  fill();
  window.demoStep(cur);
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => {
    window.__READY__ = true;
  });
})();
