// 소리 모듈 (SPEC 5절). WebAudio 기반. 소리 파일은 Assets("audio/<이름>.mp3")로만 읽는다.
// 어떤 실패(오디오 장치 없음, 파일 없음, 디코드 실패)에도 예외를 던지지 않고 소리 없이 진행한다.
import manifest from '../../../assets/audio/manifest.json';

const KEY = (name) => 'audio/' + name + '.mp3';

// 소리별 기본값: v = 기본 음량, max = 같은 소리 동시 재생 수, gap = 같은 소리 최소 간격(초), jit = 음높이 무작위 폭(±)
const DEF = { v: 0.9, max: 4, gap: 0.04, jit: 0.05 };
const TUNE = {
  sword_swing1: { v: 0.55, max: 4, gap: 0.05, jit: 0.08 },
  sword_swing2: { v: 0.55, max: 4, gap: 0.05, jit: 0.08 },
  hit1: { v: 0.8, max: 5, gap: 0.035, jit: 0.08 },
  hit2: { v: 0.75, max: 5, gap: 0.035, jit: 0.08 },
  crit: { v: 1.0, max: 3, gap: 0.06, jit: 0.04 },
  skill_spin: { v: 0.85, max: 2, gap: 0.15, jit: 0.03 },
  skill_slam: { v: 1.0, max: 2, gap: 0.15, jit: 0.03 },
  skill_buff: { v: 0.8, max: 2, gap: 0.2, jit: 0.0 },
  player_hurt: { v: 0.7, max: 2, gap: 0.25, jit: 0.05 },
  monster_hurt: { v: 0.55, max: 3, gap: 0.12, jit: 0.1 },
  monster_die: { v: 0.7, max: 3, gap: 0.1, jit: 0.1 },
  wolf_growl: { v: 0.65, max: 2, gap: 0.3, jit: 0.08 },
  orc_grunt: { v: 0.65, max: 2, gap: 0.3, jit: 0.08 },
  bones: { v: 0.6, max: 2, gap: 0.3, jit: 0.08 },
  boss_roar: { v: 1.0, max: 1, gap: 0.8, jit: 0.02 },
  boss_slam: { v: 1.0, max: 2, gap: 0.2, jit: 0.03 },
  fire: { v: 0.8, max: 3, gap: 0.1, jit: 0.06 },
  levelup: { v: 0.9, max: 1, gap: 0.5, jit: 0.0 },
  anvil: { v: 0.75, max: 3, gap: 0.08, jit: 0.04 },
  enhance_success: { v: 0.9, max: 1, gap: 0.3, jit: 0.0 },
  enhance_fail: { v: 0.9, max: 1, gap: 0.3, jit: 0.02 },
  ui_click: { v: 0.5, max: 3, gap: 0.03, jit: 0.0 },
  coin: { v: 0.6, max: 3, gap: 0.06, jit: 0.06 },
  potion: { v: 0.7, max: 2, gap: 0.15, jit: 0.03 },
  footstep: { v: 0.3, max: 3, gap: 0.08, jit: 0.12 },
  magic_cast: { v: 0.75, max: 3, gap: 0.08, jit: 0.05 },
  arrow_shot: { v: 0.7, max: 4, gap: 0.05, jit: 0.06 },
  teleport: { v: 0.8, max: 2, gap: 0.2, jit: 0.02 },
};
const MAX_VOICES = 28;          // 효과음 전체 동시 재생 한도
const REF_DIST = 7;             // 이 거리까지는 원래 음량
const MAX_DIST = 48;            // 이 거리 밖은 들리지 않음(재생 생략)
const PAN_WIDTH = 26;           // 좌우로 이만큼 떨어지면 최대 팬
const RAMP = 0.03;

let ctx = null;
let assets = null;
let ok = false;
let muted = false;
let nMaster = null, nBgm = null, nSfx = null, nAmb = null;
const vol = { master: 0.9, bgm: 0.55, sfx: 0.9, amb: 0.6 };
const listener = { x: 0, z: 0 };
const buffers = new Map();      // 이름 → AudioBuffer
const loading = new Map();      // 이름 → Promise
const missing = new Set();      // 한 번만 경고
const voices = [];              // 재생 중 효과음 {name, src, gain, t}
const lastAt = new Map();       // 이름 → 마지막 재생 시각
const variants = new Map();     // 'hit' → ['hit1','hit2']
let bgmCur = null, bgmWant = null;   // {name, src, gain}
let ambCur = null, ambWant = null;
let unlockBound = false;
let analyser = null, meterBuf = null, compNode = null;

for (const name of Object.keys(manifest)) {
  const m = /^(.*?)(\d+)$/.exec(name);
  if (m) { if (!variants.has(m[1])) variants.set(m[1], []); variants.get(m[1]).push(name); }
}

function warnOnce(name, why) {
  if (missing.has(name)) return;
  missing.add(name);
  console.warn('[sound] ' + why + ': ' + name);
}

function resolveName(name) {
  if (typeof name !== 'string') return null;
  if (name.startsWith('audio/')) name = name.slice(6).replace(/\.mp3$/, '');
  if (manifest[name]) return name;
  const v = variants.get(name);
  if (v && v.length) return v[(Math.random() * v.length) | 0];
  return null;
}

function tryResume() {
  if (ctx && ctx.state !== 'running' && ctx.state !== 'closed') { try { const p = ctx.resume(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* 무시 */ } }
}

function bindUnlock() {
  if (unlockBound || typeof window === 'undefined') return;
  unlockBound = true;
  const on = () => {
    tryResume();
    if (ctx && ctx.state === 'running') { for (const ev of ['pointerdown', 'keydown', 'touchstart', 'mousedown']) window.removeEventListener(ev, on, true); }
  };
  for (const ev of ['pointerdown', 'keydown', 'touchstart', 'mousedown']) window.addEventListener(ev, on, true);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tryResume(); });
}

function setGain(node, value, t = RAMP) {
  if (!node) return;
  const now = ctx.currentTime;
  try {
    node.gain.cancelScheduledValues(now);
    node.gain.setValueAtTime(node.gain.value, now);
    node.gain.linearRampToValueAtTime(value, now + Math.max(0.005, t));
  } catch (e) { node.gain.value = value; }
}

function applyVolumes(t) {
  if (!ok) return;
  setGain(nMaster, muted ? 0 : vol.master, t);
  setGain(nBgm, vol.bgm, t);
  setGain(nSfx, vol.sfx, t);
  setGain(nAmb, vol.amb, t);
}

function load(name) {
  if (buffers.has(name)) return Promise.resolve(buffers.get(name));
  if (loading.has(name)) return loading.get(name);
  if (!ok || !assets) return Promise.resolve(null);
  const key = KEY(name);
  let p;
  try {
    if (assets.has && !assets.has(key)) { warnOnce(name, '에셋 목록에 없음'); return Promise.resolve(null); }
    p = Promise.resolve(assets.audio(key, ctx)).then((buf) => { buffers.set(name, buf); loading.delete(name); return buf; })
      .catch((e) => { loading.delete(name); warnOnce(name, '불러오기 실패(' + (e && e.message || e) + ')'); return null; });
  } catch (e) { warnOnce(name, '불러오기 실패'); return Promise.resolve(null); }
  loading.set(name, p);
  return p;
}

function dropVoice(v) {
  const i = voices.indexOf(v);
  if (i >= 0) voices.splice(i, 1);
}

function killVoice(v) {
  dropVoice(v);
  try {
    const now = ctx.currentTime;
    v.gain.gain.cancelScheduledValues(now);
    v.gain.gain.setValueAtTime(v.gain.gain.value, now);
    v.gain.gain.linearRampToValueAtTime(0, now + 0.03);
    v.src.stop(now + 0.04);
  } catch (e) { /* 이미 끝남 */ }
}

function startLoop(buf, bus, volume, fade) {
  const src = ctx.createBufferSource();
  src.buffer = buf; src.loop = true;
  const gain = ctx.createGain();
  const now = ctx.currentTime;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(volume, now + Math.max(0.01, fade));
  src.connect(gain); gain.connect(bus);
  src.start(now);
  return { src, gain };
}

function stopLoop(h, fade) {
  if (!h || !h.src) return;
  try {
    const now = ctx.currentTime, f = Math.max(0.01, fade);
    h.gain.gain.cancelScheduledValues(now);
    h.gain.gain.setValueAtTime(h.gain.gain.value, now);
    h.gain.gain.linearRampToValueAtTime(0, now + f);
    h.src.stop(now + f + 0.05);
    const g = h.gain; h.src.onended = () => { try { g.disconnect(); } catch (e) { /* 무시 */ } };
  } catch (e) { /* 무시 */ }
}

export const Sound = {
  /** AudioContext 준비. 실패해도 예외 없이 false 를 돌려준다. 여러 번 불러도 안전. */
  init(Assets) {
    if (Assets) assets = Assets;
    if (ok) return true;
    try {
      const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
      if (!AC) return false;
      ctx = new AC({ latencyHint: 'interactive' });
      nMaster = ctx.createGain();
      const comp = ctx.createDynamicsCompressor();   // 여러 소리가 겹칠 때 깨지지 않게
      comp.threshold.value = -10; comp.knee.value = 12; comp.ratio.value = 6; comp.attack.value = 0.004; comp.release.value = 0.18;
      nMaster.connect(comp); comp.connect(ctx.destination); compNode = comp;
      nBgm = ctx.createGain(); nSfx = ctx.createGain(); nAmb = ctx.createGain();
      nBgm.connect(nMaster); nSfx.connect(nMaster); nAmb.connect(nMaster);
      nMaster.gain.value = muted ? 0 : vol.master; nBgm.gain.value = vol.bgm; nSfx.gain.value = vol.sfx; nAmb.gain.value = vol.amb;
      ok = true;
      bindUnlock();
      tryResume();
    } catch (e) {
      console.warn('[sound] 오디오를 쓸 수 없습니다. 소리 없이 진행합니다.', e && e.message);
      ok = false; ctx = null;
    }
    return ok;
  },

  /** 준비 여부 / 내부 상태(디버그용) */
  get ready() { return ok; },
  get context() { return ctx; },
  get manifest() { return manifest; },
  /** 종류별 이름 목록: names('sfx'|'bgm'|'amb') — 종류를 빼면 전부 */
  names(kind) { return Object.keys(manifest).filter((n) => !kind || manifest[n].kind === kind); },
  /** 패킹 키 목록("audio/<이름>.mp3") — Assets.preload 에 그대로 넘길 수 있다 */
  keys(kind) { return this.names(kind).map(KEY); },
  has(name) { return !!resolveName(name); },
  isLoaded(name) { return buffers.has(name); },
  state() {
    return { ready: ok, ctx: ctx ? ctx.state : 'none', loaded: buffers.size, voices: voices.length, muted,
      bgm: bgmWant, ambient: ambWant, volume: { ...vol } };
  },

  /** 디코드해 둔다. keys: 이름('hit1') 또는 패킹 키('audio/hit1.mp3') 배열. 생략하면 manifest 전체. 절대 reject 하지 않는다. */
  preload(keys, onProgress) {
    if (!ok) return Promise.resolve(0);
    const list = [];
    for (const k of (keys && keys.length ? keys : Object.keys(manifest))) {
      const base = typeof k === 'string' && k.startsWith('audio/') ? k.slice(6).replace(/\.mp3$/, '') : k;
      if (manifest[base]) { if (!list.includes(base)) list.push(base); }
      else if (variants.has(base)) { for (const v of variants.get(base)) if (!list.includes(v)) list.push(v); }
      else warnOnce(String(k), 'manifest 에 없는 소리');
    }
    let done = 0, loaded = 0;
    return Promise.all(list.map((n) => load(n).then((b) => {
      done++; if (b) loaded++;
      if (onProgress) { try { onProgress(done, list.length, n); } catch (e) { /* 무시 */ } }
    }))).then(() => loaded);
  },

  /** 효과음. opts: {volume=1, rate=1, pan(-1~1), pos:{x,z}, jitter(음높이 무작위 폭), delay(초)} → {stop()} 또는 null */
  sfx(name, opts) {
    if (!ok) return null;
    const n = resolveName(name);
    if (!n) { warnOnce(String(name), 'manifest 에 없는 소리'); return null; }
    const buf = buffers.get(n);
    if (!buf) { load(n); return null; }          // 아직 디코드 전이면 이번 한 번은 건너뛴다(늦게 울리면 어색하므로)
    const o = opts || {};
    const tune = TUNE[n] || DEF;
    const now = ctx.currentTime;
    if (ctx.state !== 'running') { tryResume(); return null; }

    let g = (o.volume == null ? 1 : o.volume) * tune.v;
    let pan = o.pan == null ? 0 : o.pan;
    if (o.pos) {
      const dx = o.pos.x - listener.x, dz = o.pos.z - listener.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d >= MAX_DIST) return null;
      if (d > REF_DIST) { const k = 1 - (d - REF_DIST) / (MAX_DIST - REF_DIST); g *= k * k; }
      if (o.pan == null) pan = Math.max(-0.85, Math.min(0.85, dx / PAN_WIDTH));
    }
    if (g <= 0.002) return null;

    const last = lastAt.get(n);
    if (last != null && now - last < tune.gap) return null;   // 같은 프레임에 겹쳐 울리는 것 방지
    let same = 0, oldestSame = null, oldest = null;
    for (let i = 0; i < voices.length; i++) {
      const v = voices[i];
      if (!oldest || v.t < oldest.t) oldest = v;
      if (v.name === n) { same++; if (!oldestSame || v.t < oldestSame.t) oldestSame = v; }
    }
    if (same >= tune.max && oldestSame) killVoice(oldestSame);
    else if (voices.length >= MAX_VOICES && oldest) killVoice(oldest);
    lastAt.set(n, now);

    try {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const jit = o.jitter == null ? tune.jit : o.jitter;
      src.playbackRate.value = Math.max(0.25, (o.rate || 1) * (1 + (Math.random() * 2 - 1) * jit));
      const gain = ctx.createGain();
      gain.gain.value = g;
      src.connect(gain);
      let tail = gain;
      if (pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); gain.connect(p); tail = p; }
      tail.connect(nSfx);
      const voice = { name: n, src, gain, t: now };
      voices.push(voice);
      src.onended = () => { dropVoice(voice); try { tail.disconnect(); if (tail !== gain) gain.disconnect(); } catch (e) { /* 무시 */ } };
      src.start(now + (o.delay > 0 ? o.delay : 0));
      return { name: n, stop() { killVoice(voice); } };
    } catch (e) { return null; }
  },

  /** 청자(주인공) 위치 */
  setListener(x, z) { listener.x = x || 0; listener.z = z || 0; },

  /** 배경음 교체(교차 페이드, 반복). name 이 null 이면 끈다. opts: {fade=1.5초, volume=1} */
  bgm(name, opts) {
    const o = opts || {};
    const fade = o.fade == null ? 1.5 : o.fade;
    const n = name ? resolveName(name) : null;
    if (name && !n) warnOnce(String(name), 'manifest 에 없는 소리');
    if (n === bgmWant && (n === null || (bgmCur && bgmCur.name === n) || loading.has(n))) {
      if (bgmCur && o.volume != null && ok) setGain(bgmCur.gain, o.volume, 0.3);
      return;
    }
    bgmWant = n;
    if (!ok) return;
    if (!n) { stopLoop(bgmCur, fade); bgmCur = null; return; }
    load(n).then((buf) => {
      if (bgmWant !== n) return;                 // 기다리는 동안 다른 곡으로 바뀜
      if (!buf) { stopLoop(bgmCur, fade); bgmCur = null; return; }
      stopLoop(bgmCur, fade);
      const h = startLoop(buf, nBgm, o.volume == null ? 1 : o.volume, fade);
      bgmCur = { name: n, src: h.src, gain: h.gain };
    });
  },

  /** 환경음 반복. name 이 null 이면 끈다. opts: {fade=1.2초, volume=1} */
  ambient(name, opts) {
    const o = opts || {};
    const fade = o.fade == null ? 1.2 : o.fade;
    const volume = o.volume == null ? 1 : o.volume;
    const n = name ? resolveName(name) : null;
    if (name && !n) warnOnce(String(name), 'manifest 에 없는 소리');
    if (n === ambWant && (n === null || (ambCur && ambCur.name === n) || loading.has(n))) {
      if (ambCur && ok) setGain(ambCur.gain, volume, Math.max(0.05, fade));
      return;
    }
    ambWant = n;
    if (!ok) return;
    if (!n) { stopLoop(ambCur, fade); ambCur = null; return; }
    load(n).then((buf) => {
      if (ambWant !== n) return;
      if (!buf) { stopLoop(ambCur, fade); ambCur = null; return; }
      stopLoop(ambCur, fade);
      const h = startLoop(buf, nAmb, volume, fade);
      ambCur = { name: n, src: h.src, gain: h.gain };
    });
  },

  /** 음량(0~1). 준 항목만 바뀐다. amb 는 추가 항목(환경음) */
  setVolume(v) {
    if (!v) return;
    for (const k of ['master', 'bgm', 'sfx', 'amb']) {
      if (typeof v[k] === 'number' && isFinite(v[k])) vol[k] = Math.max(0, Math.min(1, v[k]));
    }
    applyVolumes(0.08);
  },
  getVolume() { return { ...vol, muted }; },

  /** 전체 음소거 */
  mute(on) { muted = on === undefined ? !muted : !!on; applyVolumes(0.12); return muted; },

  /** 지금 나가는 소리의 최대 진폭(0~1). 설정 창의 음량 표시·시험용. 처음 부를 때 분석 노드를 붙인다. */
  meter() {
    if (!ok) return 0;
    try {
      if (!analyser) { analyser = ctx.createAnalyser(); analyser.fftSize = 1024; meterBuf = new Float32Array(analyser.fftSize); compNode.connect(analyser); }
      analyser.getFloatTimeDomainData(meterBuf);
      let m = 0;
      for (let i = 0; i < meterBuf.length; i++) { const a = meterBuf[i] < 0 ? -meterBuf[i] : meterBuf[i]; if (a > m) m = a; }
      return m;
    } catch (e) { return 0; }
  },

  /** 울리고 있는 효과음을 모두 끊는다(장면 전환용) */
  stopAllSfx() { if (!ok) return; for (let i = voices.length - 1; i >= 0; i--) killVoice(voices[i]); },
};
