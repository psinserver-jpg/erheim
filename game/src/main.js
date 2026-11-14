// 진입점: 로딩 → 타이틀 → 게임. 모듈(HUD·창·이펙트·소리·채팅)을 묶는다.
import * as THREE from 'three';
import { Assets } from './core/assets.js';
import { createEngine } from './render/engine.js';
import { createWorld } from './world/world.js';
import { createGame } from './game/game.js';
import { createDemo } from './game/demo.js';
import * as Hud from './ui/hud.js';
import * as Windows from './ui/windows.js';
import themeCss from './ui/theme.css';
import { VFX } from './fx/vfx.js';
import * as Names from './data/names.js';
import { createChatDirector } from './game/chatdirector.js';
import * as SoundMod from './audio/audio.js';
import { DB } from './core/db.js';
import { showAuth } from './ui/auth.js';
import { newCharacter } from './game/saga.js';

// 없는 메서드를 불러도 죽지 않게 감싼다(모듈 사이 계약이 조금 어긋나도 게임은 계속 돈다)
function safe(obj, path = '') {
  const noop = () => undefined;
  const target = obj || {};
  return new Proxy(target, { get(t, k) {
    if (k in t) { const v = t[k]; if (typeof v === 'function') return (...a) => { try { return v.apply(t, a); } catch (e) { if (!safe.warned[path + k]) { safe.warned[path + k] = 1; console.warn('[ui] ' + path + String(k), e); } } }; if (v && typeof v === 'object' && !(v instanceof Node) && !(v instanceof CanvasRenderingContext2D)) return safe(v, path + String(k) + '.'); return v; }
    if (typeof k === 'symbol' || k === 'then') return undefined;
    return new Proxy(noop, { get: (_, kk) => (kk === 'then' ? undefined : noop), apply: () => undefined });
  } });
}
safe.warned = {};

async function boot() {
  const q = new URLSearchParams(location.search);
  const stage = document.getElementById('stage');
  const fit = () => { const s = Math.min(innerWidth / 1920, innerHeight / 1080); stage.style.transform = `scale(${s})`; stage.style.left = (innerWidth - 1920 * s) / 2 + 'px'; stage.style.top = (innerHeight - 1080 * s) / 2 + 'px'; };
  addEventListener('resize', fit); fit();
  const st = document.createElement('style'); st.textContent = themeCss + '\n#ui .h-chat .body{pointer-events:none}'; document.head.appendChild(st);
  const uiRoot = document.getElementById('ui');
  const urls = {};
  for (const k of Assets.keys('ui/')) urls[k] = await Assets.blobUrl(k);
  const handlers = {};
  const ctx = { root: uiRoot, img: (k) => urls[k] || '', emit: (ev, d) => (handlers[ev] || []).forEach(f => { try { f(d); } catch (e) { console.error(e); } }) };
  const win = safe(Windows.create(ctx), 'win.');
  win.loading.show(); win.loading.set(0.02, '에르하임 왕국으로 향하는 중…');
  document.title = '에르하임: 사자의 맹세';
  const TIPS = ['강화는 +3까지 실패하지 않습니다. +6부터는 실패하면 증발할 수 있으니… 운명에 맡기세요.', '자동사냥 중에도 물약은 알아서 마십니다.', '문파에 가입하면 레이드 보상이 늘어납니다.', '대장장이 브롬은 실패해도 환불해 주지 않습니다.', '발카르의 붉은 장판은 반드시 피하세요.'];
  const keys = Assets.keys('').filter(k => !k.startsWith('ui/'));
  await Assets.preload(keys, (d, t) => win.loading.set(0.05 + 0.8 * d / t, TIPS[(d / t * TIPS.length) | 0] || TIPS[0]));
  const engine = createEngine(stage); stage.insertBefore(engine.renderer.domElement, uiRoot);
  const world = await createWorld(engine);
  win.loading.set(0.9, '문파원들이 모이는 중…');
  const hud = safe(Hud.create(ctx), 'hud.');
  hud.setVisible(false);
  let vfx = null; try { VFX.init({ scene: engine.scene, camera: engine.camera, renderer: engine.renderer }); vfx = VFX; } catch (e) { console.warn('VFX init', e); }
  const sound = safe(SoundMod.Sound, 'sound.'); try { await sound.init(Assets); sound.preload(); } catch (e) { }   // 효과음은 미리 풀어 둔다(처음 한 번이 빠지지 않게)
  let game = null;
  const chat = safe(createChatDirector({ rng: Math.random, getBots: () => (game ? game.bots.map(b => ({ id: b.id, name: b.name, guild: b.guild === null ? null : ['은사자', '붉은까마귀', '새벽검', '철권단', '폭풍', '가시장미'][b.guild], zone: b.role })) : []),
    emitChat: (m) => { hud.chat.add(m); if (game && m.name && (m.channel === 'local' || m.channel === 'party') && Math.random() < 0.6) { const b = game.bots.find(x => x.name === m.name); if (b) hud.bubble(b.id, m.text, 3500); } } }), 'chat.');
  const ui = { hud, win, on: (ev, f) => (handlers[ev] = handlers[ev] || []).push(f) };
  game = await createGame({ engine, world, ui, vfx: safe(vfx, 'vfx.'), sound, names: Names, chat });

  // ── 전체화면 · 실수로 탭이 닫히는 것 막기 ──────────────────────
  // 브라우저의 Ctrl+W(탭 닫기)는 웹페이지가 직접 막을 수 없다. 그래서 ① 전체화면에서는 키보드 잠금으로 Ctrl+W 를 게임이 가져가고(크롬·엣지),
  // ② 창 모드에서는 닫기 전에 "나가시겠습니까?" 확인창을 띄운다.
  const LOCK = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyR', 'KeyT', 'KeyN', 'KeyQ'];
  const isFs = () => !!document.fullscreenElement;
  const toggleFs = async () => {
    try {
      if (isFs()) { await document.exitFullscreen(); return; }
      await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
      if (navigator.keyboard && navigator.keyboard.lock) { try { await navigator.keyboard.lock(LOCK); } catch (e) { } }
      hud.toast('전체화면 — F 키 또는 Esc 로 해제', 'info');
    } catch (e) { hud.toast('이 브라우저에서는 전체화면을 쓸 수 없습니다.', 'info'); }
  };
  document.addEventListener('fullscreenchange', () => { if (!isFs() && navigator.keyboard && navigator.keyboard.unlock) navigator.keyboard.unlock(); });
  addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && LOCK.includes(e.code)) { e.preventDefault(); return; }
    if (e.code === 'KeyF' && !e.repeat && !(e.target && e.target.tagName === 'INPUT')) toggleFs();
  }, true);
  let started = false, leaving = false, logoutAt = -1e9, live = false;
  // ── 계정: 로그인한 계정의 캐릭터를 데이터베이스에 자동 저장한다 ──
  let account = null, saving = false;
  const saveNow = () => { if (!account || saving) return Promise.resolve(); saving = true;   // snapshot() 이 예외를 던져도 saving 이 true 로 남지 않게 약속 안에서 부른다(남으면 그 뒤 저장이 영영 멈춘다)
    return Promise.resolve().then(() => DB.save(account, game.snapshot())).catch((e) => console.warn('[save]', e)).then(() => { saving = false; }); };
  setInterval(saveNow, 5000);
  addEventListener('pagehide', saveNow); document.addEventListener('visibilitychange', () => { if (document.hidden) saveNow(); });
  addEventListener('beforeunload', (e) => { saveNow(); if (started && !leaving && !q.get('demo') && !q.get('play')) { e.preventDefault(); e.returnValue = ''; } });
  ui.on('menu', (n) => {
    if (n === 'fullscreen') toggleFs(); else if (n === 'enhance') game.enh.open();
    else if (n === 'logout') {   // 실수로 눌러 진행을 잃지 않게, 4초 안에 한 번 더 눌러야 나간다
      if (leaving) return; const now = performance.now();
      if (!(now - logoutAt < 4000)) { logoutAt = now; hud.toast(account ? '[나가기]를 한 번 더 누르면 저장하고 처음 화면으로 돌아갑니다.' : '[나가기]를 한 번 더 누르면 처음 화면으로 돌아갑니다. 체험 모드의 진행은 저장되지 않습니다.', 'info'); return; }
      leaving = true; hud.toast(account ? '저장하고 처음 화면으로 돌아갑니다…' : '처음 화면으로 돌아갑니다…', 'info'); saveNow().then(() => location.reload()); }
    else { game.refreshWindows(); win.toggle(n); } });
  // 설정 보관(기기 단위): 직접 플레이에서 바꾼 설정을 남겨 두었다가 다음 직접 플레이 때 되살린다. 녹화용 자동 모드는 읽지도 쓰지도 않는다(언제나 기본값)
  const CFG_KEY = 'erheim_settings_v1', CFG_OPTS = { quality: ['낮음', '보통', '높음'], potionAt: ['40%', '60%', '80%'] };
  const savedSettings = () => {
    try { const o = JSON.parse(localStorage.getItem(CFG_KEY) || 'null'), def = win.settings.get(), out = {}; if (!o || typeof o !== 'object') return null;
      for (const k in def) { const v = o[k]; if (typeof v !== typeof def[k]) continue; if (typeof v === 'number') { if (v >= 0 && v <= 100) out[k] = Math.round(v); } else if (typeof v === 'string') { if ((CFG_OPTS[k] || []).includes(v)) out[k] = v; } else out[k] = v; }
      return out; } catch (e) { return null; } };
  ui.on('setting', () => { if (!live) return; try { localStorage.setItem(CFG_KEY, JSON.stringify(win.settings.get())); } catch (e) { } });
  // 화면 조작 소리
  ui.on('windowOpen', () => sound.sfx('ui_open', { volume: 0.7 }));
  document.addEventListener('click', (e) => { if (e.target && e.target.closest && e.target.closest('#ui button, #ui .btn, #ui .interactive, #ui .w-opt, #ui .a-tab')) sound.sfx('ui_click'); }, true);
  const demo = createDemo({ engine, world, game, ui, vfx: safe(vfx, 'vfx.'), sound, chat });
  window.__GAME__ = { game, engine, demo, hud, win, vfx, sound, DB, emit: ctx.emit };   // emit: 시험 스크립트가 UI 이벤트(itemAction, shopBuy …)를 흉내 낼 때 쓴다
  win.loading.set(1, '입장 준비 완료'); 
  const clock = new THREE.Clock(); let acc = 0;
  engine.renderer.setAnimationLoop(() => {
    const dt = Math.min(0.05, clock.getDelta()); acc += dt;
    game.update(dt); demo.update(dt); world.update(dt, acc, game.P.pos); if (vfx) { try { vfx.update(dt * (game.G.hitstop > 0 ? 0.2 : game.G.timeScale)); } catch (e) { if (!boot.w) { boot.w = 1; console.warn(e); } } }
    engine.update(dt); engine.render();
    if (acc > 0.5) window.__READY__ = true;
  });
  const start = (isDemo, profile) => { started = true; if (profile) game.loadProfile(profile); if (!isDemo) { live = true; const sv = savedSettings(); if (sv) win.settings.set(sv); game.sys.start(win.settings.get()); }   // 직접 플레이: 보관해 둔 설정(없으면 기본값)을 한 번 적용한다. 자동 모드는 이전 그대로
    win.title.hide(); hud.setVisible(true); try { sound.bgm('bgm_town', { fade: 1 }); } catch (e) { } if (isDemo) demo.start(+(q.get('t') || 0)); else hud.zoneBanner('벨로스 성채', '안전 지역'); };
  setTimeout(() => { win.loading.hide(); if (q.get('demo') || q.get('auto')) start(true); else if (q.get('play')) start(false, q.get('story') ? newCharacter('시험기사') : null);
    else win.title.show({ onStart: () => showAuth({ root: uiRoot, sfx: (n) => sound.sfx(n), onDone: (res) => { account = res.account; start(false, res.data); }, onGuest: () => start(false) }), onDemo: () => start(true) }); }, 300);
}
boot().catch(e => { console.error(e); document.body.insertAdjacentHTML('beforeend', '<pre style="color:#f88;position:absolute;top:0;z-index:99">' + (e.stack || e) + '</pre>'); });
