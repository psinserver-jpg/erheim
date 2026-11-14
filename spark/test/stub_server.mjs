#!/usr/bin/env node
// 통신 규약 v1 대로 답하는 아주 작은 시험용 두뇌 서버(스텁). 진짜 서버는 spark/brain_server.py 다.
// 목적: brain.js 와 fake_world.mjs(시험기)를 서버 없이 먼저 검증하는 것. LLM 없음, 규칙 몇 줄뿐.
// 실행: node spark/test/stub_server.mjs --port 8799 [--mode policy|circle] [--bad wall,mine,half,frozen,nohunt,nododge,mute] [--delay 밀리초]
//   --mode circle : 모든 봇이 제자리 근처에서 원을 그리며 걷는다(규약 확인용 최소 동작)
//   --bad ...     : 일부러 틀리게 행동한다 — 시험기가 FAIL 을 제대로 잡는지 보는 용도
import http from 'node:http';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i >= 0 ? (process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : true) : d; };
const PORT = +arg('port', 8799), HOST = String(arg('host', '127.0.0.1')), MODE = String(arg('mode', 'policy')), DELAY = +arg('delay', 0);
const BAD = new Set(String(arg('bad', '')).split(',').filter(Boolean));
const MAX_BODY = 512 * 1024;
const GOALS = ['town_idle', 'hunt_forest', 'hunt_orc', 'hunt_grave', 'rest', 'follow_player', 'assist_player', 'go_shop', 'go_smith', 'join_raid'];
const TOWN_SPOTS = [[-13, -10], [-8, -17], [11, 12], [16, 7], [17, -4], [3, 5], [-4, 6], [0, -24], [-18, 4], [8, 22], [-9, 20], [22, 12], [-22, -14], [4, -12], [-3, -34], [14, -22]];
const GATE_MID = [0, -30], GATE_OUT = [0, -58];
const ANCHOR = { hunt_forest: [0, -118], hunt_orc: [34, -150], hunt_grave: [-108, -150] };
const dist = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
const inTown = (x, z) => Math.hypot(x, z) < 46;
const r2 = (v) => Math.round(v * 100) / 100;
const sessions = new Map();
const stats = { ticks: 0, sumMs: 0, maxMs: 0, bad: 0, started: Date.now() };

function session(sid) {
  let S = sessions.get(sid);
  if (!S) { S = { sid, tick: 0, minds: new Map(), seen: Date.now(), sayQ: [], lastSay: -99, n: 0, seed: 12345 }; sessions.set(sid, S); }
  S.seen = Date.now(); return S;
}
const rnd = (S) => { S.seed = (S.seed * 1664525 + 1013904223) >>> 0; return S.seed / 4294967296; };

function mindOf(S, b) {
  let m = S.minds.get(b.id);
  if (!m) {
    const k = S.n++; const town = inTown(b.x, b.z);
    const goal = town ? 'town_idle' : (dist(b.x, b.z, -112, -150) < 50 ? 'hunt_grave' : dist(b.x, b.z, 34, -150) < 22 ? 'hunt_orc' : 'hunt_forest');
    // 마을 봇 넷 중 하나는 "나들이꾼": 잠시 뒤 숲으로 사냥을 나갔다가 돌아온다(성문 통과 시험용)
    m = { k, goal, wait: rnd(S) * 4, spot: null, walk: true, route: [], target: null, travelAt: town && k % 4 === 1 ? 4 + (k % 7) : Infinity, backAt: Infinity, followUntil: -1 };
    S.minds.set(b.id, m);
  }
  return m;
}
function setRoute(m, b, dest) {
  const a = inTown(b.x, b.z), d = inTown(dest[0], dest[1]);
  if (BAD.has('wall')) m.route = [dest];                                    // 일부러 성벽을 뚫고 가게 한다
  else if (a && !d) m.route = [GATE_MID, GATE_OUT, dest]; else if (!a && d) m.route = [GATE_OUT, GATE_MID, dest]; else m.route = [dest];
}
const cmd = (b, m, o = {}) => ({ id: b.id, goal: m.goal, move: o.move ? [r2(o.move[0]), r2(o.move[1])] : null, pace: o.pace || 'run', stop: o.stop === undefined ? 0.4 : o.stop, act: o.act || 'none', target: o.target === undefined ? null : o.target });

function decide(S, req, b, m, ring) {
  const t = req.t, dt = req.dt;
  if (b.dead) return cmd(b, m);
  if (MODE === 'circle') { const a = t * 0.5 + m.k; m.cx = m.cx === undefined ? b.x : m.cx; m.cz = m.cz === undefined ? b.z : m.cz; return cmd(b, m, { move: [m.cx + Math.sin(a) * 4, m.cz + Math.cos(a) * 4], pace: 'walk', stop: 0.2 }); }
  // ── 레이드: 보스 근처에 있는 봇은 둘러서서 치고, 장판은 피한다
  const boss = req.boss;
  if (req.raid && req.raid.active && boss && dist(b.x, b.z, boss.x, boss.z) < 90) {
    m.goal = 'join_raid'; m.route = []; m.target = null;
    const teles = Array.isArray(boss.tele) ? boss.tele : [];
    if (!BAD.has('nododge')) for (const q of teles) {
      const d = dist(b.x, b.z, q.x, q.z);
      if (d < q.r + 0.8) { let dx = b.x - q.x, dz = b.z - q.z; if (d < 0.05) { dx = b.x - boss.x; dz = b.z - boss.z; } const l = Math.hypot(dx, dz) || 1; return cmd(b, m, { move: [q.x + dx / l * (q.r + 2.5), q.z + dz / l * (q.r + 2.5)], pace: 'sprint', stop: 0.3 }); }
    }
    const i = ring.indexOf(b.id), ang = (i / Math.max(1, ring.length)) * Math.PI * 2, rad = b.cls === 'melee' ? 4.6 : b.range;
    const want = [boss.x + Math.sin(ang) * rad, boss.z + Math.cos(ang) * rad];
    const hot = !BAD.has('nododge') && teles.some((q) => dist(want[0], want[1], q.x, q.z) < q.r + 1.2);
    if (hot) return dist(b.x, b.z, boss.x, boss.z) <= b.range + 4 ? cmd(b, m, { act: 'attack', target: boss.id }) : cmd(b, m);   // 자리가 장판 안이면 들어가지 않는다
    if (dist(b.x, b.z, want[0], want[1]) > 2.2) return cmd(b, m, { move: want, pace: 'run', stop: 0.6 });
    return cmd(b, m, { move: want, act: 'attack', target: boss.id });
  }
  if (m.goal === 'join_raid') m.goal = inTown(b.x, b.z) ? 'town_idle' : 'hunt_forest';
  // ── 주인공이 불렀으면 잠깐 따라다닌다
  if (m.followUntil > t && req.player && !req.player.dead && inTown(b.x, b.z) === inTown(req.player.x, req.player.z)) {
    const g = m.goal; m.goal = 'follow_player'; const c = cmd(b, m, { move: [req.player.x, req.player.z], pace: 'run', stop: 3 }); m.goal = g; return c;
  }
  // ── 나들이 계획
  if (t >= m.travelAt) { m.travelAt = Infinity; m.backAt = t + 45; m.goal = 'hunt_forest'; m.spot = null; setRoute(m, b, ANCHOR.hunt_forest); }
  if (t >= m.backAt) { m.backAt = Infinity; m.goal = 'town_idle'; m.target = null; setRoute(m, b, [0, 4]); }
  if (m.route.length) {
    const p = m.route[0];
    if (dist(b.x, b.z, p[0], p[1]) < (m.route.length > 1 ? 1.6 : 5)) m.route.shift();
    if (m.route.length) return cmd(b, m, { move: m.route[0], pace: 'run', stop: 0.8 });
  }
  // ── 사냥: 남의(주인공) 사냥감이 아닌 가장 가까운 몬스터
  if (m.goal.startsWith('hunt')) {
    const an = ANCHOR[m.goal];
    if (inTown(b.x, b.z)) { setRoute(m, b, an); return cmd(b, m, { move: m.route[0], pace: 'run', stop: 0.8 }); }
    if (BAD.has('nohunt')) return cmd(b, m);
    const ok = (x) => !x.dead && (BAD.has('mine') ? true : !x.mine);
    let tg = (req.mons || []).find((x) => x.id === m.target && ok(x)) || null;
    if (BAD.has('mine')) { const mine = (req.mons || []).filter((x) => !x.dead && x.mine).sort((p, q) => dist(b.x, b.z, p.x, p.z) - dist(b.x, b.z, q.x, q.z))[0]; if (mine) tg = mine; }
    if (!tg) { let best = 30; for (const x of req.mons || []) { if (!ok(x)) continue; const d = dist(b.x, b.z, x.x, x.z); if (d < best) { best = d; tg = x; } } }
    m.target = tg ? tg.id : null;
    if (tg) return cmd(b, m, { move: [tg.x, tg.z], pace: 'run', stop: b.range * 0.85, act: 'attack', target: tg.id });
    return dist(b.x, b.z, an[0], an[1]) > 12 ? cmd(b, m, { move: an, pace: 'run', stop: 6 }) : cmd(b, m);
  }
  // ── 마을: 어슬렁
  if (BAD.has('frozen')) return cmd(b, m);
  m.wait -= dt;
  if (m.spot) { if (dist(b.x, b.z, m.spot[0], m.spot[1]) < 0.9) { m.spot = null; m.wait = 3 + rnd(S) * 9; return cmd(b, m); } return cmd(b, m, { move: m.spot, pace: m.walk ? 'walk' : 'run', stop: 0.4 }); }
  if (m.wait <= 0) { const s = TOWN_SPOTS[(rnd(S) * TOWN_SPOTS.length) | 0]; m.spot = [s[0] + rnd(S) * 4 - 2, s[1] + rnd(S) * 4 - 2]; m.walk = rnd(S) < 0.6; }
  return cmd(b, m);
}

function handleTick(req) {
  const S = session(req.sid); S.tick++;
  const bots = req.bots; const t = req.t;
  for (const b of bots) mindOf(S, b);
  // 사건: 주인공 채팅 → 가까운 봇 한두 명이 대답(채팅 내용은 "데이터"로만 본다 — 낱말 몇 개만 확인)
  for (const ev of req.events || []) {
    if (ev.type === 'chat' && req.player && !BAD.has('mute')) {
      const near = bots.filter((b) => !b.dead).map((b) => [dist(b.x, b.z, req.player.x, req.player.z), b]).filter((x) => x[0] < 40).sort((p, q) => p[0] - q[0]).slice(0, 2);
      const party = /같이|도와|파티|사냥/.test(String(ev.text));
      const lines = party ? ['저요! 같이 가요 ㅋㅋ', 'ㅎㅇ 저도 껴도 될까요?'] : ['ㅎㅇ요', '오늘 성채에 사람 많네요 ㅋㅋ'];
      near.forEach(([, b], i) => { S.sayQ.push({ at: t + 0.6 + i * 1.3, id: b.id, name: b.name, guild: b.guild || null, channel: 'local', text: lines[i] }); if (party) S.minds.get(b.id).followUntil = t + 20; });
    }
    if (ev.type === 'raid_start' && !BAD.has('mute')) { const g = bots.find((b) => !b.dead && b.guild); if (g) S.sayQ.push({ at: t + 1, id: g.id, name: g.name, guild: g.guild, channel: 'guild', text: '제단이 열렸대요! 문파원 집합~' }); }
  }
  const ring = req.boss ? bots.filter((b) => dist(b.x, b.z, req.boss.x, req.boss.z) < 90).map((b) => b.id) : [];
  let cmds = bots.map((b) => decide(S, req, b, S.minds.get(b.id), ring));
  if (BAD.has('half')) cmds = cmds.filter((_, i) => i % 2 === 0);
  const chat = [];
  if (S.sayQ.length && S.sayQ[0].at <= t && t - S.lastSay >= 1) { const q = S.sayQ.shift(); S.lastSay = t; chat.push({ id: q.id, name: q.name, guild: q.guild, channel: q.channel, text: q.text }); }
  return { v: 1, tick: S.tick, cmds, chat, info: { llm: null, llmOk: false, thinkMs: 0, queue: S.sayQ.length } };
}

function validate(req) {
  const num = (v) => typeof v === 'number' && Number.isFinite(v);
  if (!req || typeof req !== 'object' || Array.isArray(req)) return '본문이 객체가 아님';
  if (req.v !== 1) return 'v 는 1'; if (typeof req.sid !== 'string' || !req.sid || req.sid.length > 64) return 'sid';
  if (!num(req.t) || !num(req.dt)) return 't/dt'; if (!Array.isArray(req.bots) || req.bots.length > 64) return 'bots';
  if (!Array.isArray(req.mons) || req.mons.length > 80) return 'mons';
  for (const b of req.bots) if (!b || !Number.isInteger(b.id) || !num(b.x) || !num(b.z) || !num(b.range)) return 'bots[]';
  for (const m of req.mons) if (!m || !Number.isInteger(m.id) || !num(m.x) || !num(m.z)) return 'mons[]';
  if (req.boss !== null && req.boss !== undefined && (typeof req.boss !== 'object' || !num(req.boss.x) || !num(req.boss.z))) return 'boss';
  if (req.player && (!num(req.player.x) || !num(req.player.z))) return 'player';
  return null;
}

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '600' };
const send = (res, code, obj) => { const s = JSON.stringify(obj); res.writeHead(code, { ...CORS, 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(s), 'Cache-Control': 'no-store' }); res.end(s); };

const server = http.createServer((req, res) => {
  const path = (req.url || '/').split('?')[0];
  if (req.method === 'OPTIONS') { res.writeHead(204, CORS); res.end(); return; }
  if (req.method === 'GET' && path === '/health') return send(res, 200, { ok: true, name: 'erheim-brain', v: 1, llm: null, sessions: sessions.size, stub: true });
  if (req.method === 'GET' && path === '/stats') return send(res, 200, { ticks: stats.ticks, avgMs: stats.ticks ? stats.sumMs / stats.ticks : 0, maxMs: stats.maxMs, bad: stats.bad, llm: { calls: 0, ok: 0, avgMs: 0 }, sessions: [...sessions.values()].map((s) => ({ sid: s.sid, bots: s.minds.size, tick: s.tick })) });
  if (req.method === 'POST' && path === '/tick') {
    const chunks = []; let size = 0, over = false;
    req.on('data', (c) => { size += c.length; if (size > MAX_BODY) { over = true; } else chunks.push(c); });
    req.on('end', () => {
      if (over) { stats.bad++; return send(res, 413, { error: '본문이 너무 큽니다(최대 512KB)' }); }
      let body = null; try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch (e) { stats.bad++; return send(res, 400, { error: 'JSON 이 아닙니다' }); }
      const err = validate(body); if (err) { stats.bad++; return send(res, 400, { error: '잘못된 필드: ' + err }); }
      const t0 = performance.now(); let out;
      try { out = handleTick(body); } catch (e) { stats.bad++; return send(res, 500, { error: String(e && e.message || e) }); }
      const ms = performance.now() - t0; stats.ticks++; stats.sumMs += ms; stats.maxMs = Math.max(stats.maxMs, ms);
      if (DELAY > 0) setTimeout(() => send(res, 200, out), DELAY); else send(res, 200, out);
    });
    req.on('error', () => { });
    return;
  }
  send(res, 404, { error: 'not found' });
});
setInterval(() => { const now = Date.now(); for (const [k, s] of sessions) if (now - s.seen > 60000) sessions.delete(k); }, 5000).unref();
server.listen(PORT, HOST, () => console.log(`[stub] 시험용 두뇌 서버 http://${HOST}:${PORT}  mode=${MODE}${BAD.size ? ' bad=' + [...BAD].join(',') : ''}  (goal ${GOALS.length}종, LLM 없음)`));
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { server.close(); process.exit(0); });
