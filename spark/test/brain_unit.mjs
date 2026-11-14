// brain.js 단위 시험 — 가짜 fetch 를 넣어 정상/타임아웃/500/깨진 JSON/명령 만료/상태 전이/주소 결정을 확인한다.
// 실행: node spark/test/brain_unit.mjs   (Node 24 내장 기능만 사용, 서버 불필요)
import assert from 'node:assert/strict';
import { createBrain, resolveBrainUrl, resolveBrain, normalizeBrainUrl, saveBrainUrl, sanitizeCmd, sanitizeChat, parseTickResponse, GOALS, BRAIN_STORAGE_KEY } from '../../game/src/game/brain.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(cond, ms = 2000, what = '조건') { const t0 = Date.now(); while (!cond()) { if (Date.now() - t0 > ms) throw new Error(`시간 초과: ${what}`); await sleep(4); } }
const FAST = { hz: 50, timeoutMs: 60, retryMs: 80, healthTimeoutMs: 60 };   // 시험은 빠르게(실제 기본값: 5Hz·800ms·5000ms)

// 가짜 서버(fetch). health/tick 동작을 시험 도중에 바꿀 수 있다.
function fakeServer(over = {}) {
  const S = { health: 'ok', tick: 'ok', delay: 0, calls: [], ticks: [], inflight: 0, maxInflight: 0, tickNo: 0, chat: [], llm: 'stub-llm', healthBody: null,
    reply: (req) => ({ v: 1, tick: ++S.tickNo, cmds: (req.bots || []).map((b) => ({ id: b.id, goal: 'town_idle', move: [b.x + 1, b.z], pace: 'walk', stop: 0.4, act: 'none', target: null })), chat: S.chat.splice(0), info: { llm: S.llm, llmOk: true, thinkMs: 12, queue: 0 } }), ...over };
  const hang = (init) => new Promise((_, rej) => { if (S.honorAbort !== false && init && init.signal) init.signal.addEventListener('abort', () => rej(new Error('aborted'))); });
  S.fetch = async (url, init = {}) => {
    const path = new URL(url).pathname; S.calls.push({ url, path, method: init.method || 'GET' });
    if (path.endsWith('/health')) {
      if (S.health === 'down') throw new TypeError('fetch failed');
      if (S.health === 'hang') return hang(init);
      if (S.health === '500') return { ok: false, status: 500, json: async () => ({}) };
      return { ok: true, status: 200, json: async () => S.healthBody || { ok: true, name: 'erheim-brain', v: 1, llm: S.llm, sessions: 0 } };
    }
    if (path.endsWith('/tick')) {
      const req = JSON.parse(init.body); S.ticks.push(req);
      S.inflight++; S.maxInflight = Math.max(S.maxInflight, S.inflight);
      try {
        if (S.tick === 'down') throw new TypeError('fetch failed');
        if (S.tick === 'throw') throw new Error('동기 오류 흉내');
        if (S.tick === 'hang') return await hang(init);
        if (S.delay) await sleep(S.delay);
        if (S.tick === '500') return { ok: false, status: 500, json: async () => ({ error: 'x' }) };
        if (S.tick === 'badjson') return { ok: true, status: 200, json: async () => { throw new SyntaxError('Unexpected token'); } };
        if (S.tick === 'garbage') return { ok: true, status: 200, json: async () => ({ v: 1, cmds: 'nope' }) };
        if (S.tick === 'v2') return { ok: true, status: 200, json: async () => ({ v: 2, cmds: [] }) };
        const body = S.reply(req);
        return { ok: true, status: 200, json: async () => body };
      } finally { S.inflight--; }
    }
    return { ok: false, status: 404, json: async () => ({}) };
  };
  return S;
}
const snap = (n = 3, extra = {}) => ({ player: { name: '카일', level: 14, x: 0, z: 4, hp: 1400, hpMax: 1400, dead: false, zone: 'town', target: null, guild: '은사자' },
  bots: Array.from({ length: n }, (_, i) => ({ id: 100 + i, name: '봇' + i, guild: null, cls: 'melee', level: 12, x: i, z: 0, hp: 1200, hpMax: 1200, dead: false, range: 2.3, speed: 5.5 })),
  mons: [], boss: null, raid: { active: false, done: false }, ...extra });

const tests = [];
const test = (name, fn) => tests.push([name, fn]);

test('정상: connecting → on, 틱 본문(v·sid·t·dt·events), 명령·대사·LLM 정보 수신', async () => {
  const S = fakeServer(); const seen = []; const lines = []; const raw = [];
  S.chat.push({ id: 100, name: '봇0', guild: '은사자', channel: 'local', text: 'ㅎㅇ 같이 가요' });
  const brain = createBrain({ url: 'http://spark.test:8787/', ...FAST, getSnapshot: () => snap(3), onChat: (m) => lines.push(m), onStatus: (s) => { raw.push(s); if (seen[seen.length - 1] !== s.state) seen.push(s.state); }, fetchImpl: S.fetch });
  assert.equal(brain.status().state, 'off'); assert.equal(brain.connected, false);
  assert.equal(brain.start(), true);
  assert.equal(brain.status().state, 'connecting');
  await until(() => brain.status().ticks >= 3, 2000, '틱 3번');
  const st = brain.status();
  assert.equal(st.state, 'on'); assert.equal(brain.connected, true); assert.equal(st.url, 'http://spark.test:8787'); assert.equal(st.llm, 'stub-llm'); assert.equal(st.fails, 0);
  assert.ok(st.latencyMs >= 0 && st.lastOk > 0);
  assert.deepEqual(seen.slice(0, 2), ['connecting', 'on']);
  assert.deepEqual(raw.map((s) => [s.state, s.llmOk]), [['connecting', false], ['on', false], ['on', true]], 'onStatus 는 state 가 바뀔 때 + LLM 모델/가용 여부가 바뀔 때만 불린다');
  assert.equal(S.calls[0].path, '/health'); assert.equal(S.calls[0].method, 'GET'); assert.equal(S.calls[1].path, '/tick'); assert.equal(S.calls[1].method, 'POST');
  const q = S.ticks[0];
  assert.equal(q.v, 1); assert.ok(typeof q.sid === 'string' && q.sid.length >= 8); assert.ok(typeof q.t === 'number' && typeof q.dt === 'number' && q.dt > 0);
  assert.ok(Array.isArray(q.events) && Array.isArray(q.bots) && q.bots.length === 3 && q.player.name === '카일');
  assert.ok(S.ticks.every((x) => x.sid === q.sid), 'sid 는 세션 내내 같다');
  const c = brain.command(101);
  assert.ok(c && c.goal === 'town_idle' && c.pace === 'walk' && c.act === 'none' && c.target === null && Array.isArray(c.move) && c.move[0] === 2);
  assert.equal(brain.command(999), null);
  assert.equal(lines.length, 1); assert.equal(lines[0].text, 'ㅎㅇ 같이 가요'); assert.equal(lines[0].guild, '은사자');
  brain.stop();
  assert.equal(brain.status().state, 'off'); assert.equal(brain.command(101), null);
  const n = S.calls.length; await sleep(80); assert.equal(S.calls.length, n, 'stop 뒤에는 요청이 없다');
});

test('게임 시간 t 를 넘기면 dt 는 직전 성공 틱과의 차이, 몬스터는 80마리까지만', async () => {
  const S = fakeServer(); let gt = 10;
  const mons = Array.from({ length: 95 }, (_, i) => ({ id: 500 + i, tag: 'werewolf', x: i, z: -120, hp: 620, hpMax: 620, dead: false, target: null, mine: false, elite: false }));
  const brain = createBrain({ url: 'http://a.test', ...FAST, getSnapshot: () => { gt += 0.25; return snap(2, { t: gt, mons }); }, fetchImpl: S.fetch });
  brain.start(); await until(() => S.ticks.length >= 4); brain.stop();
  assert.equal(S.ticks[0].t, 10.25); assert.equal(S.ticks[1].dt, 0.25); assert.equal(S.ticks[2].t - S.ticks[1].t, 0.25);
  assert.equal(S.ticks[0].mons.length, 80);
});

test('사건: pushEvent 는 다음 틱에 한 번만 실리고, 규약에 없는 사건은 거부', async () => {
  const S = fakeServer();
  const brain = createBrain({ url: 'http://a.test', ...FAST, getSnapshot: () => snap(1), fetchImpl: S.fetch });
  assert.equal(brain.pushEvent({ type: 'chat', text: '  같이 사냥하실 분?\n<b>  ' }), true);
  assert.equal(brain.pushEvent({ type: 'raid_start' }), true);
  assert.equal(brain.pushEvent({ type: 'player_levelup', level: 15 }), true);
  assert.equal(brain.pushEvent({ type: 'bot_dead', id: 100 }), true);
  assert.equal(brain.pushEvent({ type: 'hack', text: 'x' }), false);
  assert.equal(brain.pushEvent({ type: 'chat', text: '   ' }), false);
  assert.equal(brain.pushEvent({ type: 'bot_dead', id: 'abc' }), false);
  assert.equal(brain.pushEvent(null), false);
  brain.start(); await until(() => S.ticks.length >= 3); brain.stop();
  const all = S.ticks.flatMap((t) => t.events);
  assert.deepEqual(all, [{ type: 'chat', text: '같이 사냥하실 분? b' }, { type: 'raid_start' }, { type: 'player_levelup', level: 15 }, { type: 'bot_dead', id: 100 }]);
  assert.equal(S.ticks[0].events.length, 4); assert.equal(S.ticks[1].events.length, 0);
});

test('겹쳐 보내지 않음: 응답이 느리면 그 사이 틱은 건너뛴다', async () => {
  const S = fakeServer({ delay: 50 });   // 틱 간격 20ms 보다 느린 서버
  const brain = createBrain({ url: 'http://a.test', ...FAST, timeoutMs: 400, getSnapshot: () => snap(2), fetchImpl: S.fetch });
  brain.start(); await until(() => brain.status().ticks >= 4, 3000); const st = brain.status(); brain.stop();
  assert.equal(S.maxInflight, 1, '동시에 떠 있는 /tick 은 하나'); assert.ok(st.skipped >= 3, '건너뛴 틱이 있어야 한다: ' + st.skipped); assert.equal(st.state, 'on');
});

test('타임아웃: 연속 5회 실패 → lost → /health 재시도 → 되살아나면 on', async () => {
  const S = fakeServer(); const seen = [];
  const brain = createBrain({ url: 'http://a.test', ...FAST, getSnapshot: () => snap(2), onStatus: (s) => { if (seen[seen.length - 1] !== s.state) seen.push(s.state); }, fetchImpl: S.fetch });
  brain.start(); await until(() => brain.status().ticks >= 2);
  assert.ok(brain.command(100));
  S.tick = 'hang'; S.health = 'down'; const t0 = Date.now();
  await until(() => brain.status().state === 'lost', 3000, 'lost');
  const el = Date.now() - t0;
  assert.ok(el >= 5 * 60 - 30, `타임아웃 5번(약 300ms)은 지나야 lost: ${el}ms`);
  assert.equal(brain.connected, false); assert.equal(brain.command(100), null, 'lost 면 명령 없음(내장 AI)'); assert.ok(brain.status().fails >= 5);
  const h0 = S.calls.filter((c) => c.path === '/health').length; const k0 = S.ticks.length;
  await sleep(260);
  const h1 = S.calls.filter((c) => c.path === '/health').length;
  assert.ok(h1 - h0 >= 2, 'lost 동안 /health 를 주기적으로 다시 찌른다'); assert.equal(S.ticks.length, k0, 'lost 동안에는 /tick 을 보내지 않는다');
  S.tick = 'ok'; S.health = 'ok';
  await until(() => brain.status().state === 'on' && brain.status().fails === 0 && brain.command(100), 3000, '복구');
  brain.stop();
  assert.deepEqual(seen, ['connecting', 'on', 'lost', 'on', 'off']);
});

test('abort 를 무시하는 fetch 라도 타임아웃은 걸린다', async () => {
  const S = fakeServer(); S.honorAbort = false;
  const brain = createBrain({ url: 'http://a.test', ...FAST, getSnapshot: () => snap(1), fetchImpl: S.fetch });
  brain.start(); await until(() => brain.status().ticks >= 1); S.tick = 'hang'; S.health = 'hang';
  await until(() => brain.status().state === 'lost', 3000, 'lost'); brain.stop();
});

for (const [mode, label] of [['500', 'HTTP 500'], ['badjson', '깨진 JSON'], ['garbage', 'cmds 가 배열이 아님'], ['v2', '규약 버전 불일치'], ['down', '연결 거부'], ['throw', 'fetch 가 예외']]) {
  test(`실패 처리(${label}): 예외 없이 실패로 세고 5회면 lost, 그 전까지는 직전 명령 유지`, async () => {
    const S = fakeServer(); let T = 1000; const errs = [];
    const brain = createBrain({ url: 'http://a.test', ...FAST, retryMs: 5000, now: () => T, getSnapshot: () => snap(2), fetchImpl: S.fetch });
    process.once('unhandledRejection', (e) => errs.push(e));
    brain.start(); await until(() => brain.status().ticks >= 1);
    S.tick = mode;
    await until(() => brain.status().fails >= 1, 1000, '첫 실패');
    if (brain.status().state === 'on') assert.ok(brain.command(100), '실패가 5번 쌓이기 전에는 직전 명령이 살아 있다(가짜 시계라 만료 안 됨)');
    await until(() => brain.status().state === 'lost', 2000, 'lost');
    assert.equal(brain.command(100), null); brain.stop(); await sleep(10);
    assert.equal(errs.length, 0, '밖으로 새는 예외가 없어야 한다');
  });
}

test('일부만 이상한 응답: 틀린 명령·대사만 버리고 나머지는 쓴다', async () => {
  const S = fakeServer({ reply: () => ({ v: 1, tick: 1, cmds: [
    { id: 100, goal: 'hunt_forest', move: null, pace: 'run', stop: 2, act: 'attack', target: 7 },
    { id: 101, goal: 'dance', move: [0, 0], pace: 'run', stop: 1, act: 'none', target: null },
    { id: 102, goal: 'rest', move: [1, 'x'], pace: 'run', stop: 1, act: 'none', target: null },
    { id: 103, goal: 'rest', move: [1, 2], pace: 'teleport', stop: 1, act: 'none', target: null },
    { id: 104, goal: 'rest', move: [1e9, 2], pace: 'walk', stop: 1, act: 'none', target: null },
    { id: 105, goal: 'rest', move: [1, 2], pace: 'walk', stop: 1, act: 'explode', target: null },
    { id: '106', goal: 'rest', move: [1, 2] }, null, 'x',
    { id: 107, goal: 'join_raid', move: [3, -250], act: 'attack', target: null },
    { id: 108, goal: 'rest', move: [1, 2], pace: 'walk', stop: -1 },
    { id: 109, goal: 'rest', move: [1, 2], target: 'boss' },
  ], chat: [{ id: 100, name: '봇0', guild: null, channel: 'trade', text: '안녕\u0000하세요\n<script>' }, { id: 100, name: '봇0', text: '' }, { name: '', text: 'x' }, 'x', { id: 100, name: '봇0', channel: 'guild', text: 'ㅋ'.repeat(200) }], info: { llm: 7, llmOk: 'yes' } }) });
  const lines = [];
  const brain = createBrain({ url: 'http://a.test', ...FAST, getSnapshot: () => snap(1), onChat: (m) => lines.push(m), fetchImpl: S.fetch });
  brain.start(); await until(() => brain.status().ticks >= 1); const st = brain.status();
  const a = brain.command(100), g = brain.command(107);
  assert.deepEqual({ ...a, at: 0 }, { id: 100, goal: 'hunt_forest', move: null, pace: 'run', stop: 2, act: 'attack', target: 7, at: 0 });
  assert.deepEqual({ ...g, at: 0 }, { id: 107, goal: 'join_raid', move: [3, -250], pace: 'run', stop: 0.4, act: 'none', target: null, at: 0 }, '대상 없는 attack 은 none 으로');
  for (const id of [101, 102, 103, 104, 105, 106, 108, 109]) assert.equal(brain.command(id), null, '버려져야 하는 명령 ' + id);
  assert.ok(st.badCmds >= 10); assert.equal(st.llm, null); assert.equal(st.llmOk, false); assert.equal(st.state, 'on');
  brain.stop();
  assert.equal(lines[0].text, '안녕 하세요 script'); assert.equal(lines[0].channel, 'local'); assert.equal(lines[0].guild, null);
  assert.equal(Array.from(lines[1].text).length, 80); assert.equal(lines[1].channel, 'guild'); assert.equal(lines.filter((l) => !l.text || !l.name).length, 0);
});

test('명령 만료: 받은 지 1초가 지나면 null', async () => {
  const S = fakeServer(); let T = 5000;
  const brain = createBrain({ url: 'http://a.test', ...FAST, now: () => T, getSnapshot: () => snap(2), fetchImpl: S.fetch });
  brain.start(); await until(() => brain.status().ticks >= 1);
  S.tick = 'hang';                                   // 더는 새 명령이 오지 않게
  await sleep(30); const c = brain.command(100); assert.ok(c); assert.equal(c.at, 5000);
  T = 5999; assert.ok(brain.command(100), '999ms: 아직 유효');
  T = 6001; assert.equal(brain.command(100), null, '1001ms: 만료'); assert.equal(brain.command(101), null);
  T = 5500; assert.equal(brain.command(100), null, '만료된 명령은 지워진다'); assert.equal(brain.command(101), null);
  brain.stop();
});

test('처음부터 서버가 없으면 lost 로 두고 재시도, 서버가 뜨면 on', async () => {
  const S = fakeServer({ health: 'down' }); const seen = [];
  const brain = createBrain({ url: 'http://a.test', ...FAST, getSnapshot: () => snap(1), onStatus: (s) => { if (seen[seen.length - 1] !== s.state) seen.push(s.state); }, fetchImpl: S.fetch });
  brain.start(); await until(() => brain.status().state === 'lost'); assert.equal(S.ticks.length, 0);
  await sleep(200); assert.ok(S.calls.length >= 3, '재시도'); S.health = 'ok';
  await until(() => brain.status().ticks >= 1); brain.stop();
  assert.deepEqual(seen, ['connecting', 'lost', 'on', 'off']);
});

test('maxProbes: 한 번도 못 붙고 정해진 횟수만큼 실패하면 off 로 포기(같은 출처 추측용)', async () => {
  const S = fakeServer({ health: '500' }); const seen = [];
  const brain = createBrain({ url: 'http://a.test', ...FAST, maxProbes: 2, getSnapshot: () => snap(1), onStatus: (s) => { if (seen[seen.length - 1] !== s.state) seen.push(s.state); }, fetchImpl: S.fetch });
  brain.start(); await until(() => brain.status().state === 'off', 2000, 'off');
  const n = S.calls.length; await sleep(250); assert.equal(S.calls.length, n, '포기한 뒤에는 요청이 없다'); assert.equal(n, 2);
  assert.deepEqual(seen, ['connecting', 'lost', 'off']);
});

test('/health 는 되는데 /tick 이 계속 실패하는 서버: 다시 붙는 간격이 점점 벌어진다(상태 깜빡임 방지)', async () => {
  const S = fakeServer({ tick: '500' }); const at = []; const inner = S.fetch;
  S.fetch = async (url, init) => { if (url.endsWith('/health')) at.push(Date.now()); return inner(url, init); };
  const brain = createBrain({ url: 'http://a.test', ...FAST, retryMs: 40, getSnapshot: () => snap(1), fetchImpl: S.fetch });
  brain.start(); await until(() => at.length >= 4, 4000, '/health 4번'); brain.stop();
  const gaps = at.slice(1).map((t, i) => t - at[i]);
  assert.ok(gaps[1] > gaps[0] * 1.2 && gaps[2] > gaps[1] * 1.2, '간격이 늘어야 한다: ' + gaps.join(', '));
  assert.equal(brain.status().ticks, 0);
});

test('/health 가 다른 서버의 것이면(이름·버전 불일치) 붙지 않는다', async () => {
  for (const body of [{ ok: true }, { ok: true, name: 'other', v: 1 }, { ok: true, name: 'erheim-brain', v: 2 }, { ok: false, name: 'erheim-brain', v: 1 }, 'ok', null]) {
    const S = fakeServer({ healthBody: body }); if (body === null) S.healthBody = { nope: 1 };
    const brain = createBrain({ url: 'http://a.test', ...FAST, maxProbes: 1, getSnapshot: () => snap(1), fetchImpl: S.fetch });
    brain.start(); await until(() => brain.status().state === 'off', 1000); assert.equal(S.ticks.length, 0);
  }
});

test('후보 여러 개: 앞 후보가 죽어 있으면 다음 후보에 붙는다', async () => {
  const S = fakeServer(); const inner = S.fetch;
  S.fetch = async (url, init) => { if (url.startsWith('http://dead.test')) throw new TypeError('fetch failed'); return inner(url, init); };
  const brain = createBrain({ url: ['http://dead.test:8787', 'http://alive.test:8787', 'http://alive.test:8787/'], ...FAST, getSnapshot: () => snap(1), fetchImpl: S.fetch });
  brain.start(); await until(() => brain.status().ticks >= 1); assert.equal(brain.status().url, 'http://alive.test:8787'); brain.stop();
});

test('주소가 없거나 틀리면 start 는 false, 상태는 off 그대로', async () => {
  for (const url of [undefined, null, '', [], 'javascript:alert(1)', ['ftp://x.test']]) {
    const brain = createBrain({ url, getSnapshot: () => snap(1), fetchImpl: async () => { throw new Error('부르면 안 됨'); } });
    assert.equal(brain.start(), false); assert.equal(brain.status().state, 'off'); assert.equal(brain.command(1), null); brain.stop();
  }
});

test('콜백이 예외를 던져도 모듈은 계속 돈다(getSnapshot·onChat·onStatus)', async () => {
  const S = fakeServer(); let n = 0; S.chat.push({ id: 100, name: '봇0', text: '하이' });
  const brain = createBrain({ url: 'http://a.test', ...FAST, getSnapshot: () => { if (++n % 2) throw new Error('스냅샷 오류'); return snap(1); }, onChat: () => { throw new Error('화면 오류'); }, onStatus: () => { throw new Error('상태 오류'); }, fetchImpl: S.fetch });
  brain.start(); await until(() => brain.status().ticks >= 3); const st = brain.status(); brain.stop();
  assert.equal(st.state, 'on'); assert.ok(st.skipped >= 2);
});

test('실패한 틱에 실렸던 사건은 다음 성공 틱에 다시 실린다', async () => {
  const S = fakeServer(); let fail = 2; const inner = S.fetch;
  S.fetch = async (url, init) => { if (url.endsWith('/tick') && JSON.parse(init.body).events.length && fail-- > 0) { S.dropped = (S.dropped || 0) + 1; return { ok: false, status: 500, json: async () => ({}) }; } return inner(url, init); };
  const brain = createBrain({ url: 'http://a.test', ...FAST, getSnapshot: () => snap(1), fetchImpl: S.fetch });
  brain.start(); await until(() => brain.status().ticks >= 1);
  brain.pushEvent({ type: 'chat', text: '도와주세요' });
  await until(() => S.ticks.some((t) => t.events.length), 2000); await sleep(60); brain.stop();
  assert.equal(S.dropped, 2); assert.equal(S.ticks.filter((t) => t.events.length).length, 1); assert.equal(brain.status().state, 'off');
});

test('resolveBrainUrl: 쿼리 → 저장값 → 같은 출처 순, 혼합 콘텐츠·이상한 주소 제외', () => {
  const store = (v) => ({ getItem: (k) => (k === BRAIN_STORAGE_KEY ? v : null) });
  const file = (search = '') => ({ protocol: 'file:', origin: 'null', search });
  const http = (search = '') => ({ protocol: 'http:', origin: 'http://spark-1a2b.local:8787', search });
  const https = (search = '') => ({ protocol: 'https:', origin: 'https://user.github.io', search });
  assert.deepEqual(resolveBrainUrl(file(), null), []);
  assert.deepEqual(resolveBrainUrl(file('?brain=spark-1a2b.local:8787'), null), ['http://spark-1a2b.local:8787']);
  assert.deepEqual(resolveBrainUrl(file('?play=1&brain=http%3A%2F%2F192.168.0.7%3A8787%2F'), null), ['http://192.168.0.7:8787']);
  assert.deepEqual(resolveBrainUrl(file(), store('http://spark.local:8787')), ['http://spark.local:8787']);
  assert.deepEqual(resolveBrainUrl(http(), null), ['http://spark-1a2b.local:8787']);
  assert.deepEqual(resolveBrainUrl(http('?brain=http://10.0.0.5:8787'), store('http://old.local:8787')), ['http://10.0.0.5:8787', 'http://old.local:8787', 'http://spark-1a2b.local:8787']);
  assert.deepEqual(resolveBrainUrl(http('?brain=http://spark-1a2b.local:8787/'), store('spark-1a2b.local:8787')), ['http://spark-1a2b.local:8787'], '같은 주소는 한 번만');
  assert.deepEqual(resolveBrainUrl(https(), null), ['https://user.github.io']);
  assert.deepEqual(resolveBrainUrl(https('?brain=http://spark.local:8787'), store('http://10.0.0.5:8787')), ['https://user.github.io'], 'https 페이지에서 http 두뇌는 뺀다');
  assert.deepEqual(resolveBrainUrl(https('?brain=https://brain.example.test/erheim/'), null), ['https://brain.example.test/erheim', 'https://user.github.io']);
  // 이 기기 자신(127.0.0.1·localhost)의 http 두뇌는 https 페이지에서도 남긴다(브라우저의 혼합 콘텐츠 예외) — Spark 본체의 브라우저로 https 게임을 여는 경우
  assert.deepEqual(resolveBrainUrl(https('?brain=127.0.0.1:8787'), null), ['http://127.0.0.1:8787', 'https://user.github.io']);
  assert.deepEqual(resolveBrainUrl(https('?brain=http://localhost:8787/'), store('http://[::1]:8787')), ['http://localhost:8787', 'http://[::1]:8787', 'https://user.github.io']);
  assert.deepEqual(resolveBrainUrl(https('?brain=http://127.0.0.1.evil.test:8787'), store('http://localhost.evil.test')), ['https://user.github.io'], '이름만 비슷한 남의 주소는 뺀다');
  assert.deepEqual(resolveBrain(https('?brain=127.0.0.1:8787'), null), { urls: ['http://127.0.0.1:8787', 'https://user.github.io'], explicit: true, off: false });
  assert.deepEqual(resolveBrainUrl(http('?brain=off'), store('http://old.local:8787')), []);
  assert.deepEqual(resolveBrainUrl(http('?brain=0'), null), []);
  assert.deepEqual(resolveBrainUrl(http(), store('off')), []);
  assert.deepEqual(resolveBrainUrl(http('?brain=http://10.0.0.5:8787'), store('off')), ['http://10.0.0.5:8787', 'http://spark-1a2b.local:8787'], '쿼리가 저장된 off 보다 우선');
  for (const bad of ['javascript:alert(1)', 'ftp://x.test', 'http://user:pw@x.test', 'http://', '%%%', 'x'.repeat(300)]) assert.deepEqual(resolveBrainUrl(file('?brain=' + encodeURIComponent(bad)), null), [], bad);
  assert.deepEqual(resolveBrainUrl(http(), { getItem() { throw new Error('저장소 막힘'); } }), ['http://spark-1a2b.local:8787']);
  assert.deepEqual(resolveBrainUrl(null, null), []); assert.deepEqual(resolveBrainUrl({}, {}), []);
  assert.deepEqual(resolveBrain(http(), null), { urls: ['http://spark-1a2b.local:8787'], explicit: false, off: false });
  assert.equal(resolveBrain(http('?brain=10.0.0.5:8787'), null).explicit, true); assert.equal(resolveBrain(file(), store('a.test')).explicit, true);
  assert.equal(resolveBrain(http('?brain=off'), null).off, true);
  assert.equal(normalizeBrainUrl(' HTTP://Spark.Local:8787/// '), 'http://spark.local:8787'); assert.equal(normalizeBrainUrl('https://a.test/x?y=1#z'), 'https://a.test/x'); assert.equal(normalizeBrainUrl(5), null);
  const mem = new Map(); const st = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, v), removeItem: (k) => mem.delete(k) };
  assert.equal(saveBrainUrl(st, 'spark.local:8787/'), true); assert.deepEqual(resolveBrainUrl(file(), st), ['http://spark.local:8787']);
  assert.equal(saveBrainUrl(st, 'ftp://x.test'), false); assert.equal(saveBrainUrl(st, 'off'), true); assert.deepEqual(resolveBrainUrl(http(), st), []);
  assert.equal(saveBrainUrl(st, null), true); assert.equal(mem.size, 0); assert.equal(saveBrainUrl(null, 'a.test'), false);
});

test('검증 함수: sanitizeCmd / sanitizeChat / parseTickResponse', () => {
  for (const g of GOALS) assert.ok(sanitizeCmd({ id: 1, goal: g }), g);
  assert.deepEqual(sanitizeCmd({ id: 3, goal: 'rest' }, 42), { id: 3, goal: 'rest', move: null, pace: 'run', stop: 0.4, act: 'none', target: null, at: 42 });
  assert.equal(sanitizeCmd({ id: 3, goal: 'rest', stop: 999 }).stop, 50);
  for (const bad of [null, 1, 'x', [], {}, { id: 1 }, { id: 1.5, goal: 'rest' }, { id: -1, goal: 'rest' }, { id: NaN, goal: 'rest' }, { id: 1, goal: 'rest', move: [1] }, { id: 1, goal: 'rest', move: [NaN, 1] }, { id: 1, goal: 'rest', move: 'x' }, { id: 1, goal: 'rest', pace: 'toString' }, { id: 1, goal: 'constructor' }, { id: 1, goal: 'rest', stop: Infinity }, { id: 1, goal: 'rest', target: 1.5 }]) assert.equal(sanitizeCmd(bad), null, JSON.stringify(bad));
  assert.equal(sanitizeChat({ id: 1, name: '<b>봇</b>', guild: '은사자\n', text: ' ㅎㅇ\t\r\n ㅋㅋ ' }).text, 'ㅎㅇ ㅋㅋ'); assert.equal(sanitizeChat({ id: 1, name: '<b>봇</b>', text: 'x' }).name, 'b 봇 /b');
  assert.equal(sanitizeChat({ id: 'x', name: '봇', text: 'x' }).id, null); assert.equal(sanitizeChat({ name: '봇', text: 5 }), null);
  for (const bad of [null, [], 'x', 5, { v: 1 }, { v: 1, cmds: {} }, { v: '1', cmds: [] }, { cmds: [] }]) assert.throws(() => parseTickResponse(bad), JSON.stringify(bad));
  const r = parseTickResponse({ v: 1, cmds: Array.from({ length: 100 }, (_, i) => ({ id: i, goal: 'rest' })), chat: Array.from({ length: 20 }, () => ({ name: '봇', text: 'ㅎㅇ' })), info: null });
  assert.equal(r.cmds.length, 64); assert.equal(r.chat.length, 8); assert.deepEqual(r.info, { llm: null, llmOk: false, thinkMs: 0, queue: 0 });
});

test('fetch 가 아예 없으면 start 는 false(예외 없음)', () => {
  const saved = globalThis.fetch; globalThis.fetch = undefined;
  try { const brain = createBrain({ url: 'http://a.test', getSnapshot: () => snap(1) }); assert.equal(brain.start(), false); assert.equal(brain.status().state, 'off'); } finally { globalThis.fetch = saved; }
});

let pass = 0, fail = 0;
for (const [name, fn] of tests) {
  try { await fn(); pass++; console.log('PASS  ' + name); } catch (e) { fail++; console.log('FAIL  ' + name + '\n      ' + String(e && e.stack || e).split('\n').slice(0, 14).join('\n      ')); }
}
console.log(`\n단위 시험 ${pass + fail}개 중 ${pass}개 통과, ${fail}개 실패`);
process.exit(fail ? 1 : 0);
