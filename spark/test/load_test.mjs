#!/usr/bin/env node
// 두뇌 서버 부하 시험 — 봇 22명 · 몬스터 80마리의 세계 상태를 초당 5번, 30초 동안 보내고 틱 시간을 잰다.
// Node 24 내장 기능만 쓴다(fetch). 받은 명령대로 봇을 움직여 주므로(클라이언트 수행 규칙) 서버가 보는 세계도 실제처럼 변한다.
//
//   node spark/test/load_test.mjs [--url http://127.0.0.1:8787] [--secs 30] [--hz 5] [--bots 22] [--mons 80] [--fast] [--raid]
//
//   --fast   기다리지 않고 연달아 보낸다(게임 시간만 1/hz 초씩 흐른다) — 오래 돌리는 행동 점검용
//   --raid   중간에 레이드를 열고 장판을 깐다
// 끝나면 왕복 시간(이 시험기가 잰 것)과 서버가 잰 틱 계산 시간(/stats)을 찍는다. 실패한 틱이 있으면 종료 코드 1.

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); if (i < 0) return d; const v = process.argv[i + 1]; return v === undefined || v.startsWith('--') ? true : v; };
const URL_ = String(arg('url', 'http://127.0.0.1:8787')).replace(/\/+$/, '');
const SECS = +arg('secs', 30), HZ = +arg('hz', 5), NB = +arg('bots', 22), NM = +arg('mons', 80);
const FAST = !!arg('fast', false), RAID = !!arg('raid', false);
const DT = 1 / HZ, PACE = { walk: 0.3, run: 1, sprint: 1.25 };

let seed = 20408;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const rr = (a, b) => a + (b - a) * rnd();
const NAMES = ['칼바람', '새벽검성', '은빛기사', '철벽방패', '물약중독자', '강화는도박', '퇴근하고접속', '김대리', '별빛궁수', '고독한늑대', '금화가없어', '주말용사',
  '브롬의단골', '운빨전사', '야근전사', '딸바보기사', '번개검', '서리칼날', '장사꾼', '확률의신', '무과금전사', '월요병환자', '낭만검객', '돌격대장'];
const GUILDS = ['은사자', '붉은까마귀', '새벽검', '철권단', '폭풍', '가시장미', null];
const CLS = ['melee', 'melee', 'melee', 'magic', 'arrow'];

const player = { name: '부하시험', level: 14, x: 0, z: 4, hp: 900, hpMax: 900, dead: false, zone: 'town', target: null, guild: '은사자' };
const bots = [], mons = [];
for (let i = 0; i < NB; i++) {
  const a = rr(0, 6.28); let x, z;
  if (i < NB * 16 / 22) { const r = rr(5, 34); x = Math.sin(a) * r; z = Math.cos(a) * r; }
  else if (i < NB * 20 / 22) { const r = rr(6, 40); x = Math.sin(a) * r; z = -128 + Math.cos(a) * r; }
  else { const r = rr(6, 26); x = -112 + Math.sin(a) * r; z = -150 + Math.cos(a) * r; }
  const cls = CLS[(rnd() * CLS.length) | 0];
  bots.push({ id: 100 + i, name: NAMES[i % NAMES.length] + (i >= NAMES.length ? i : ''), guild: GUILDS[(rnd() * GUILDS.length) | 0], cls, level: 10 + ((rnd() * 28) | 0), x, z, hp: 1200, hpMax: 1200, dead: false,
    range: cls === 'melee' ? 2.3 : rr(9, 13), speed: rr(5.2, 6.2), deadT: 0 });
}
for (let i = 0; i < NM; i++) {
  const a = rr(0, 6.28), k = i % 37; let tag, x, z, hp;
  if (k < 16) { const r = rr(8, 48); tag = 'werewolf'; x = Math.sin(a) * r * 0.9 - 6; z = -128 + Math.cos(a) * r * 0.8; hp = 620; }
  else if (k < 25) { const r = rr(5, 20); tag = 'orc_warrior'; x = 34 + Math.sin(a) * r; z = -150 + Math.cos(a) * r; hp = 880; }
  else { const r = rr(6, 36); tag = 'skeleton_knight'; x = -112 + Math.sin(a) * r; z = -150 + Math.cos(a) * r; hp = 1150; }
  mons.push({ id: 500 + i, tag, x, z, hp, hpMax: hp, dead: false, target: null, mine: false, elite: false, deadT: 0, hx: x, hz: z });
}
let boss = null; const raid = { active: false, done: false }; let events = [];
const sid = 'load' + Date.now().toString(36);
let t = 0, cmds = new Map();
const lat = []; let fails = 0, badCmd = 0, wallBad = 0, mineHit = 0, chatLines = 0; const goals = {};
const ent = (id) => mons.find((m) => m.id === id) || (boss && boss.id === id ? boss : null);
const pub = (o, drop) => { const c = { ...o }; for (const k of drop) delete c[k]; return c; };

function moveTo(b, x, z, speed, stop) {
  const dx = x - b.x, dz = z - b.z, d = Math.hypot(dx, dz); if (d <= stop) return;
  const s = Math.min(d - stop * 0.5, speed * DT); b.x += dx / d * s; b.z += dz / d * s;
  const r = Math.hypot(b.x, b.z); if (r > 45.9 && r < 52.1 && !(Math.abs(b.x) <= 3.6 && b.z < 0)) wallBad++;
}
function advance() {
  for (const b of bots) {
    if (b.dead) { b.deadT += DT; if (b.deadT > 6) { b.dead = false; b.hp = b.hpMax; } continue; }   // 죽으면 6초 뒤 그 자리에서 부활
    const c = cmds.get(b.id); if (!c) continue;
    if (c.act === 'attack' && c.target !== null) {
      const tg = ent(c.target); if (!tg || tg.dead) continue;
      if (tg.mine) mineHit++;
      const d = Math.hypot(tg.x - b.x, tg.z - b.z);
      if (d > b.range) moveTo(b, tg.x, tg.z, b.speed, b.range * 0.85);
      else { tg.hp -= 55 * DT * 1.6; if (tg !== boss) { tg.target = tg.target ?? b.id; b.hp -= 12 * DT; if (b.hp <= 0) { b.dead = true; b.deadT = 0; } } if (tg.hp <= 0 && tg !== boss) { tg.dead = true; tg.deadT = 0; } }
    } else if (c.move) moveTo(b, c.move[0], c.move[1], b.speed * PACE[c.pace], c.stop);
  }
  for (const m of mons) {
    if (m.dead) { m.deadT += DT; if (m.deadT > 9) { m.dead = false; m.hp = m.hpMax; m.x = m.hx; m.z = m.hz; m.target = null; } continue; }
    m.mine = Math.hypot(m.x - player.x, m.z - player.z) < 16;
  }
  // 주인공: 마을 → 성문 → 숲을 천천히 오간다
  const ph = (t % 120) / 120, pz = ph < 0.5 ? 4 - ph * 2 * 126 : -122 + (ph - 0.5) * 2 * 126; player.z = pz; player.x = Math.sin(t * 0.05) * 1.5;
  if (boss) { boss.tele = boss.tele.map((q) => ({ ...q, t: q.t - DT })).filter((q) => q.t > 0);
    if (rnd() < 0.08) { const b = bots[(rnd() * bots.length) | 0]; if (Math.hypot(b.x - boss.x, b.z - boss.z) < 20) boss.tele.push({ x: b.x + rr(-1, 1), z: b.z + rr(-1, 1), r: 2.8, t: 1.3 }); } }
}

async function tick() {
  const body = JSON.stringify({ v: 1, sid, t: Math.round(t * 1000) / 1000, dt: DT, player, bots: bots.map((b) => pub(b, ['deadT'])), mons: mons.map((m) => pub(m, ['deadT', 'hx', 'hz'])), boss, raid, events });
  events = [];
  const s0 = performance.now();
  try {
    const res = await fetch(URL_ + '/tick', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, signal: AbortSignal.timeout(800) });
    if (!res.ok) throw new Error('http ' + res.status);
    const d = await res.json();
    lat.push(performance.now() - s0);
    if (d.v !== 1 || !Array.isArray(d.cmds) || d.cmds.length !== bots.length) badCmd++;
    cmds = new Map(d.cmds.map((c) => [c.id, c]));
    for (const c of d.cmds) goals[c.goal] = (goals[c.goal] || 0) + 1;
    chatLines += d.chat.length;
    return d;
  } catch (e) { fails++; if (fails <= 3) console.error('틱 실패:', e.message); return null; }
}

const health = await fetch(URL_ + '/health').then((r) => r.json()).catch(() => null);
if (!health || health.name !== 'erheim-brain') { console.error('두뇌 서버가 없습니다: ' + URL_); process.exit(2); }
console.log(`부하 시험: ${URL_}  봇 ${NB} · 몬스터 ${NM} · ${HZ}Hz · ${SECS}초${FAST ? ' (연달아)' : ''}  LLM=${health.llm ?? '없음'}`);
const before = await fetch(URL_ + '/stats').then((r) => r.json());
const N = Math.round(SECS * HZ), w0 = performance.now(); let last = null, bytes = 0;
for (let i = 0; i < N; i++) {
  if (RAID && i === Math.floor(N * 0.4)) { raid.active = true; boss = { id: 900, x: 0, z: -262, hp: 400000, hpMax: 400000, phase: 1, tele: [] }; events.push({ type: 'raid_start' }); }
  if (i === 25) events.push({ type: 'chat', text: '숲에 같이 사냥 가실 분 계신가요?' });
  const d = await tick(); if (d) { last = d; advance(); }
  t += DT;
  if (!FAST) { const wait = w0 + (i + 1) * 1000 * DT - performance.now(); if (wait > 0) await new Promise((r) => setTimeout(r, wait)); }
}
const wall = (performance.now() - w0) / 1000;
const st = await fetch(URL_ + '/stats').then((r) => r.json());
lat.sort((a, b) => a - b);
const avg = lat.reduce((a, b) => a + b, 0) / Math.max(1, lat.length), pct = (p) => lat[Math.min(lat.length - 1, Math.floor(lat.length * p))] || 0;
const mine = st.sessions.find((s) => s.sid === sid) || {};
const tot = Object.values(goals).reduce((a, b) => a + b, 0) || 1;
console.log(`보낸 틱 ${N} (성공 ${lat.length}, 실패 ${fails}) · 걸린 시간 ${wall.toFixed(1)}초 · 게임 시간 ${t.toFixed(0)}초`);
console.log(`왕복 시간(ms)     평균 ${avg.toFixed(2)}  p50 ${pct(0.5).toFixed(2)}  p95 ${pct(0.95).toFixed(2)}  최대 ${(lat[lat.length - 1] || 0).toFixed(2)}`);
console.log(`서버 틱 계산(ms)  평균 ${st.tickMs.avg}  p50 ${st.tickMs.p50}  p95 ${st.tickMs.p95}  최대 ${st.tickMs.max}   (서버 누적 ${st.ticks}틱, 이번 시험 전 ${before.ticks}틱)`);
console.log(`서버 요청 처리(ms) 평균 ${st.reqMs.avg}  최대 ${st.reqMs.max}   (JSON 읽기 + 검증 + 틱 계산 + JSON 쓰기)`);
console.log(`목표 비율  ${Object.entries(goals).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${(v / tot * 100).toFixed(0)}%`).join(' · ')}`);
console.log(`대사 ${chatLines}줄 · 끼임 해결 ${mine.stuckFixes ?? '?'}회 · 성벽 뚫음 ${wallBad}회 · 주인공 사냥감 공격 ${mineHit}회 · 틀린 응답 ${badCmd}회`);
console.log(`LLM  ${st.llm.model ?? '없음'}  호출 ${st.llm.calls} (성공 ${st.llm.success}, 실패 ${st.llm.fail})  평균 ${st.llm.avgMs ?? '-'}ms  대기 ${st.llm.queue}`);
const ok = fails === 0 && badCmd === 0 && wallBad === 0 && mineHit === 0;
console.log(ok ? '판정: 통과' : '판정: 실패');
process.exit(ok ? 0 : 1);
