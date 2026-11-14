// 두뇌 연결 모듈: DGX Spark 에서 도는 두뇌 서버(spark/brain_server.py)와 "통신 규약 v1" 로 대화한다.
// 게임은 초당 5번 세계 상태를 보내고(POST /tick), 서버가 돌려준 봇별 명령을 command(botId) 로 꺼내 그대로 수행한다.
// 순수 ES 모듈 — three.js·DOM 의존 없음(fetch / AbortController / setTimeout 만 쓴다). Node 24 에서도 그대로 import 된다.
// 어떤 경우에도 예외를 밖으로 던지지 않는다: 서버가 없거나 느리거나 이상한 답을 내면 command() 가 null 을 돌려주고,
// 게임은 브라우저 내장 AI(updBot 의 기존 분기)로 계속 돈다.

export const BRAIN_PROTOCOL = 1;
export const BRAIN_STORAGE_KEY = 'erheim_brain';
export const GOALS = ['town_idle', 'hunt_forest', 'hunt_orc', 'hunt_grave', 'rest', 'follow_player', 'assist_player', 'go_shop', 'go_smith', 'join_raid'];
export const PACE_MUL = { walk: 0.3, run: 1, sprint: 1.25 };   // 클라이언트 수행 규칙: 이동 속도 배율
export const EVENT_TYPES = ['chat', 'raid_start', 'raid_done', 'player_levelup', 'player_dead', 'bot_dead'];
const ACTS = ['none', 'attack'];
const CHANNELS = ['local', 'world', 'guild'];
const MAX_MONS = 80, MAX_CMDS = 64, MAX_CHAT = 8, MAX_EVENTS = 32, EVENT_TTL_MS = 10000, WORLD_LIMIT = 2000;

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const isId = (v) => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < 1e9;
const realNow = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());
const r3 = (v) => Math.round(v * 1000) / 1000;

// 화면에 나갈 글자 정리: 제어 문자·줄바꿈·꺾쇠를 없애고 길이를 자른다.
function cleanText(v, max) {
  if (typeof v !== 'string') return '';
  let out = '';
  for (const ch of v) { const c = ch.codePointAt(0); if (c < 32 || c === 127 || (c >= 0x80 && c <= 0x9f) || c === 0x2028 || c === 0x2029 || ch === '<' || ch === '>') { out += ' '; continue; } out += ch; }
  out = out.replace(/\s+/g, ' ').trim();
  const a = Array.from(out);
  return a.length > max ? a.slice(0, max).join('') : out;
}

function makeSid() {
  let s = '';
  try { const b = new Uint8Array(9); globalThis.crypto.getRandomValues(b); for (const x of b) s += x.toString(36).padStart(2, '0'); } catch (e) { s = ''; }
  if (!s) for (let i = 0; i < 3; i++) s += Math.random().toString(36).slice(2, 8);
  return 'e' + s.slice(0, 18);
}

// ── 응답 검증 ─────────────────────────────────────────────────
// 명령 하나: 틀린 곳이 있으면 null(그 봇은 이번 틱 명령 없음 → 직전 명령이 1초 안에 만료되면 내장 AI).
export function sanitizeCmd(c, at = 0) {
  if (!c || typeof c !== 'object' || !isId(c.id)) return null;
  if (!GOALS.includes(c.goal)) return null;
  let move = null;
  if (c.move !== null && c.move !== undefined) {
    if (!Array.isArray(c.move) || c.move.length < 2 || !isNum(c.move[0]) || !isNum(c.move[1])) return null;
    if (Math.abs(c.move[0]) > WORLD_LIMIT || Math.abs(c.move[1]) > WORLD_LIMIT) return null;
    move = [c.move[0], c.move[1]];
  }
  const pace = c.pace === undefined || c.pace === null ? 'run' : c.pace;
  if (!Object.prototype.hasOwnProperty.call(PACE_MUL, pace)) return null;
  let stop = 0.4;
  if (c.stop !== undefined && c.stop !== null) { if (!isNum(c.stop) || c.stop < 0) return null; stop = Math.min(c.stop, 50); }
  let act = c.act === undefined || c.act === null ? 'none' : c.act;
  if (!ACTS.includes(act)) return null;
  let target = null;
  if (c.target !== null && c.target !== undefined) { if (!isId(c.target)) return null; target = c.target; }
  if (act === 'attack' && target === null) act = 'none';
  return { id: c.id, goal: c.goal, move, pace, stop, act, target, at };
}
export function sanitizeChat(m) {
  if (!m || typeof m !== 'object') return null;
  const text = cleanText(m.text, 80); if (!text) return null;
  const name = cleanText(m.name, 24); if (!name) return null;
  const guild = cleanText(m.guild, 16) || null;
  return { id: isId(m.id) ? m.id : null, name, guild, channel: CHANNELS.includes(m.channel) ? m.channel : 'local', text };
}
// 응답 전체: 뼈대(v, cmds 배열)가 틀리면 예외 → 그 틱은 실패로 센다.
export function parseTickResponse(data, at = 0) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('응답이 객체가 아님');
  if (data.v !== BRAIN_PROTOCOL) throw new Error('규약 버전 불일치');
  if (!Array.isArray(data.cmds)) throw new Error('cmds 가 배열이 아님');
  const cmds = []; let bad = 0;
  for (let i = 0; i < data.cmds.length && i < MAX_CMDS; i++) { const c = sanitizeCmd(data.cmds[i], at); if (c) cmds.push(c); else bad++; }
  const chat = [];
  if (Array.isArray(data.chat)) for (let i = 0; i < data.chat.length && chat.length < MAX_CHAT; i++) { const m = sanitizeChat(data.chat[i]); if (m) chat.push(m); }
  const inf = data.info && typeof data.info === 'object' ? data.info : {};
  const info = { llm: typeof inf.llm === 'string' && inf.llm ? cleanText(inf.llm, 64) : null, llmOk: inf.llmOk === true, thinkMs: isNum(inf.thinkMs) ? inf.thinkMs : 0, queue: isNum(inf.queue) ? inf.queue : 0 };
  return { tick: isNum(data.tick) ? data.tick : 0, cmds, chat, info, bad };
}
function sanitizeEvent(ev) {
  if (!ev || typeof ev !== 'object' || !EVENT_TYPES.includes(ev.type)) return null;
  if (ev.type === 'chat') { const text = cleanText(ev.text, 200); return text ? { type: 'chat', text } : null; }
  if (ev.type === 'player_levelup') return isNum(ev.level) ? { type: ev.type, level: ev.level } : null;
  if (ev.type === 'bot_dead') return isId(ev.id) ? { type: ev.type, id: ev.id } : null;
  return { type: ev.type };
}

// ── 주소 정하기 ───────────────────────────────────────────────
// 'spark-1a2b.local:8787' 처럼 적어도 받아 준다. http/https 만, 계정 정보가 든 주소는 거부, 끝의 / 는 뗀다.
export function normalizeBrainUrl(raw) {
  if (typeof raw !== 'string') return null;
  let s = raw.trim(); if (!s || s.length > 200) return null;
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(s)) s = 'http://' + s;
  let u; try { u = new URL(s); } catch (e) { return null; }
  if ((u.protocol !== 'http:' && u.protocol !== 'https:') || !u.hostname || u.username || u.password) return null;
  return (u.origin + u.pathname).replace(/\/+$/, '');
}
const isOff = (v) => /^(off|0|no|none|false)$/i.test(String(v).trim());
// 이 기기 자신을 가리키는 주소인가(localhost, *.localhost, 127.x.x.x, [::1]). 브라우저는 이런 http 주소를 https 페이지에서도 막지 않는다(혼합 콘텐츠 예외).
function isLoopbackUrl(u) {
  let h = ''; try { h = new URL(u).hostname.toLowerCase(); } catch (e) { return false; }
  return h === 'localhost' || h.endsWith('.localhost') || /^127(\.\d{1,3}){3}$/.test(h) || h === '[::1]' || h === '::1';
}
// 후보를 정한다: ?brain=주소 → 저장된 값 → 같은 출처. explicit = 사용자가 직접 지정한 주소가 있는가(없으면 같은 출처 "추측"뿐).
// ?brain=off (또는 저장된 값 off) 이면 후보 없음. https 페이지에서 http 주소는 뺀다(혼합 콘텐츠라 브라우저가 막는다).
// 단, 이 기기 자신(127.0.0.1·localhost)의 http 주소는 남긴다 — DGX Spark 본체의 브라우저로 https 게임을 열고 ?brain=127.0.0.1:8787 로 붙는 경우.
export function resolveBrain(locationLike, storageLike) {
  const loc = locationLike || {}; const urls = []; let explicit = false;
  const proto = String(loc.protocol || '').toLowerCase(); const https = proto === 'https:';
  const add = (raw) => { const u = normalizeBrainUrl(raw); if (!u || (https && u.startsWith('http://') && !isLoopbackUrl(u))) return false; if (!urls.includes(u)) urls.push(u); return true; };
  let q = null; try { q = new URLSearchParams(String(loc.search || '')).get('brain'); } catch (e) { q = null; }
  if (q !== null && isOff(q)) return { urls: [], explicit: true, off: true };
  if (q && add(q)) explicit = true;
  let s = null; try { s = storageLike && storageLike.getItem ? storageLike.getItem(BRAIN_STORAGE_KEY) : null; } catch (e) { s = null; }
  if (typeof s === 'string' && s) { if (isOff(s)) { if (!explicit) return { urls: [], explicit: true, off: true }; } else if (add(s)) explicit = true; }
  if ((proto === 'http:' || https) && typeof loc.origin === 'string' && loc.origin && loc.origin !== 'null') add(loc.origin);
  return { urls, explicit, off: false };
}
export function resolveBrainUrl(locationLike, storageLike) { return resolveBrain(locationLike, storageLike).urls; }
// 주소를 기억해 둔다(null 이면 지움, 'off' 면 끔). 실패해도 조용히 넘어간다.
export function saveBrainUrl(storageLike, url) {
  try {
    if (url === null || url === undefined || url === '') { storageLike.removeItem(BRAIN_STORAGE_KEY); return true; }
    const v = isOff(url) ? 'off' : normalizeBrainUrl(url); if (!v) return false;
    storageLike.setItem(BRAIN_STORAGE_KEY, v); return true;
  } catch (e) { return false; }
}

// ── 두뇌 연결 ─────────────────────────────────────────────────
// url: 주소 하나 또는 후보 배열(앞에서부터 /health 를 찔러 처음 되는 곳에 붙는다).
// getSnapshot(): 규약의 요청 본문에서 v·sid·events 를 뺀 것({ player, bots, mons, boss, raid } + 있으면 게임 시간 t)을 돌려준다.
// 덧붙인 선택 인자(시험·배속용): timeoutMs 800, cmdTtlMs 1000, retryMs 5000, maxFails 5, healthTimeoutMs 1500,
//   maxProbes 0(=무제한. 한 번도 붙은 적 없이 이 횟수만큼 연속 실패하면 'off' 로 포기 — 같은 출처 "추측"일 때 3 정도를 준다)
export function createBrain(opts = {}) {
  const { getSnapshot, onChat, onStatus } = opts;
  const hz = isNum(opts.hz) && opts.hz > 0 ? Math.min(opts.hz, 60) : 5;
  const interval = 1000 / hz;
  const timeoutMs = isNum(opts.timeoutMs) && opts.timeoutMs > 0 ? opts.timeoutMs : 800;
  const cmdTtlMs = isNum(opts.cmdTtlMs) && opts.cmdTtlMs > 0 ? opts.cmdTtlMs : 1000;
  const retryMs = isNum(opts.retryMs) && opts.retryMs > 0 ? opts.retryMs : 5000;
  const healthTimeoutMs = isNum(opts.healthTimeoutMs) && opts.healthTimeoutMs > 0 ? opts.healthTimeoutMs : 1500;
  const maxFails = isNum(opts.maxFails) && opts.maxFails >= 1 ? Math.floor(opts.maxFails) : 5;
  const maxProbes = isNum(opts.maxProbes) && opts.maxProbes > 0 ? Math.floor(opts.maxProbes) : 0;
  const fetchImpl = typeof opts.fetchImpl === 'function' ? opts.fetchImpl : (typeof fetch === 'function' ? (u, i) => fetch(u, i) : null);
  const now = typeof opts.now === 'function' ? opts.now : realNow;
  const urls = []; for (const raw of Array.isArray(opts.url) ? opts.url : [opts.url]) { const u = normalizeBrainUrl(raw); if (u && !urls.includes(u)) urls.push(u); }
  const sid = makeSid();

  let state = 'off', url = urls[0] || null, urlIdx = 0;
  let llm = null, llmOk = false, thinkMs = 0, queue = 0, latencyMs = 0, lastOk = 0, fails = 0;
  let ticks = 0, sent = 0, skipped = 0, badCmds = 0, probes = 0, everOn = false;
  let gen = 0, timer = null, nextAt = 0, busy = false, curAc = null, lastT = null, t0 = 0, okSinceOn = false, flaps = 0;
  const cmds = new Map(); let events = [];

  function status() { return { state, url, llm, latencyMs, lastOk, fails, llmOk, thinkMs, queue, sid, ticks, sent, skipped, badCmds }; }
  function notify() { if (typeof onStatus === 'function') { try { onStatus(status()); } catch (e) { /* 화면 쪽 오류는 무시 */ } } }
  function setState(s) { if (s === state) return; state = s; notify(); }
  function clearTimer() { if (timer !== null) { clearTimeout(timer); timer = null; } }
  function schedule(fn, ms) { clearTimer(); const g = gen; timer = setTimeout(() => { timer = null; if (g !== gen) return; try { fn(); } catch (e) { /* 밖으로 던지지 않는다 */ } }, Math.max(0, ms)); }

  // 타임아웃이 있는 요청. fetch 가 abort 를 무시해도(가짜 fetch 등) 타임아웃은 반드시 걸린다.
  async function request(u, init, ms) {
    const ac = typeof AbortController === 'function' ? new AbortController() : null; curAc = ac;
    let tm = null;
    const timeout = new Promise((_, rej) => { tm = setTimeout(() => { try { ac && ac.abort(); } catch (e) { } rej(new Error('timeout')); }, ms); });
    timeout.catch(() => { });
    try {
      const res = await Promise.race([Promise.resolve().then(() => fetchImpl(u, ac ? { ...init, signal: ac.signal } : init)), timeout]);
      if (!res || !res.ok) throw new Error('http ' + (res ? res.status : '?'));
      return await Promise.race([Promise.resolve().then(() => res.json()), timeout]);
    } finally { clearTimeout(tm); if (curAc === ac) curAc = null; }
  }

  // /health 확인: 후보를 차례로 찔러 본다. 되면 'on', 다 안 되면 'lost' 로 두고 retryMs 뒤에 다시.
  async function probe() {
    const g = gen;
    for (let i = 0; i < urls.length; i++) {
      const k = (urlIdx + i) % urls.length; const u = urls[k];
      let h = null;
      try { h = await request(u + '/health', { method: 'GET', mode: 'cors', credentials: 'omit', cache: 'no-store' }, healthTimeoutMs); } catch (e) { h = null; }
      if (g !== gen) return;
      if (h && typeof h === 'object' && h.ok === true && h.name === 'erheim-brain' && h.v === BRAIN_PROTOCOL) {
        url = u; urlIdx = k; if (typeof h.llm === 'string' || h.llm === null) llm = h.llm ? cleanText(h.llm, 64) : null;
        fails = 0; probes = 0; everOn = true; lastT = null; busy = false; okSinceOn = false; nextAt = realNow();
        setState('on'); schedule(tick, 0); return;
      }
    }
    probes++; fails++;
    if (!everOn && maxProbes > 0 && probes >= maxProbes) { gen++; clearTimer(); cmds.clear(); setState('off'); return; }
    setState('lost');
    schedule(() => { probe(); }, retryMs);
  }

  function buildBody(snap) {
    const tn = now();
    const t = isNum(snap.t) ? snap.t : (tn - t0) / 1000;
    let dt = lastT === null ? 1 / hz : t - lastT; if (!(dt >= 0)) dt = 0; if (dt > 5) dt = 5;
    const evs = []; const keep = [];
    for (const e of events) { if (tn - e.at > EVENT_TTL_MS) continue; if (evs.length < MAX_EVENTS) evs.push(e); else keep.push(e); }
    events = keep;
    const body = { v: BRAIN_PROTOCOL, sid, t: r3(t), dt: r3(dt), player: snap.player, bots: Array.isArray(snap.bots) ? snap.bots : [],
      mons: Array.isArray(snap.mons) ? (snap.mons.length > MAX_MONS ? snap.mons.slice(0, MAX_MONS) : snap.mons) : [],
      boss: snap.boss || null, raid: snap.raid && typeof snap.raid === 'object' ? { active: !!snap.raid.active, done: !!snap.raid.done } : { active: false, done: false },
      events: evs.map((e) => e.ev) };
    return { body, t, evs };
  }

  function tick() {
    if (state !== 'on') return;
    const r = realNow(); nextAt += interval; if (nextAt < r) nextAt = r + interval * 0.5;   // 탭이 쉬다 깨어나도 몰아서 보내지 않는다
    schedule(tick, nextAt - r);
    if (busy) { skipped++; return; }                       // 앞 요청이 안 끝났으면 이번 틱은 건너뛴다(겹쳐 보내지 않는다)
    let snap = null; try { snap = typeof getSnapshot === 'function' ? getSnapshot() : null; } catch (e) { snap = null; }
    if (!snap || typeof snap !== 'object') { skipped++; return; }
    let built = null; let text = null;
    try { built = buildBody(snap); text = JSON.stringify(built.body); } catch (e) { skipped++; return; }
    send(built, text);
  }

  async function send(built, text) {
    const g = gen; busy = true; sent++;
    const s0 = now();
    try {
      const data = await request(url + '/tick', { method: 'POST', mode: 'cors', credentials: 'omit', cache: 'no-store', headers: { 'Content-Type': 'application/json' }, body: text }, timeoutMs);
      if (g !== gen) return;
      const at = now(); const res = parseTickResponse(data, at);
      latencyMs = Math.max(0, at - s0); lastOk = at; fails = 0; ticks++; lastT = built.t; badCmds += res.bad; okSinceOn = true; flaps = 0;
      for (const c of res.cmds) cmds.set(c.id, c);
      const changed = res.info.llm !== llm || res.info.llmOk !== llmOk;
      llm = res.info.llm; llmOk = res.info.llmOk; thinkMs = res.info.thinkMs; queue = res.info.queue;
      if (typeof onChat === 'function') for (const m of res.chat) { try { onChat(m); } catch (e) { /* 화면 쪽 오류는 무시 */ } }
      if (changed) notify();
    } catch (e) {
      if (g !== gen) return;
      if (built.evs.length) events = built.evs.concat(events).slice(0, MAX_EVENTS * 2);   // 못 보낸 사건은 다음 틱에 다시
      fails++;
      if (fails >= maxFails) {
        // /health 는 되는데 /tick 이 한 번도 안 되는 서버(규약 불일치 등)에는 점점 뜸하게 다시 붙는다(5초 → 10 → 20 → 40 → 80초). 상태가 깜빡이지 않게.
        if (okSinceOn) flaps = 0; else flaps = Math.min(flaps + 1, 4);
        clearTimer(); cmds.clear(); setState('lost'); schedule(() => { probe(); }, retryMs * (1 << flaps));
      }
    } finally { if (g === gen) busy = false; }
  }

  return {
    start() {
      if (state !== 'off') return true;
      if (!urls.length || !fetchImpl) return false;          // 붙을 곳이 없다 → 'off' 그대로(내장 AI)
      gen++; t0 = now(); fails = 0; probes = 0; everOn = false; busy = false; lastT = null; flaps = 0;
      setState('connecting'); probe(); return true;
    },
    stop() {
      gen++; clearTimer(); busy = false; cmds.clear(); events = [];
      try { curAc && curAc.abort(); } catch (e) { } curAc = null;
      setState('off');
    },
    status,
    // 사건을 쌓아 둔다(다음 틱에 실려 간다). 규약에 없는 사건·빈 채팅은 버리고 false.
    pushEvent(ev) {
      try { const e = sanitizeEvent(ev); if (!e) return false; events.push({ ev: e, at: now() }); if (events.length > MAX_EVENTS * 2) events.splice(0, events.length - MAX_EVENTS * 2); return true; } catch (e) { return false; }
    },
    // 봇 하나의 유효한 명령(받은 지 cmdTtlMs 이내). 없거나 만료면 null → 호출한 쪽이 내장 AI 로 처리.
    command(botId) {
      const c = cmds.get(botId); if (!c) return null;
      if (state !== 'on' || now() - c.at > cmdTtlMs) { cmds.delete(botId); return null; }
      return c;
    },
    get connected() { return state === 'on'; },
  };
}
