#!/usr/bin/env node
// 가짜 세계 시험기 — 게임(브라우저) 없이 두뇌 서버를 검증한다.
// 〈에르하임〉의 세계를 숫자로만 흉내 내고(주인공 1, 봇 22, 몬스터 37, 필요하면 레이드 보스와 장판),
// 실제 brain.js(createBrain)로 서버와 5Hz 로 통신하면서 통신 규약 v1 의 "클라이언트 수행 규칙"대로 명령을 수행한다.
//   · act=="attack" + target → 대상에게 접근해 사거리 안에서 공격(피해·사망·부활은 여기서 처리)
//   · 아니면 move 지점으로 pace 속도(walk 0.3배, run 1배, sprint 1.25배)로 이동, 없으면 제자리
//   · 받은 지 1초 넘은 명령은 무효 — 이 시험기에는 내장 AI 가 없으므로 그 봇은 가만히 선다(서버의 효과만 본다)
// 사용: node spark/test/fake_world.mjs --url http://127.0.0.1:8787 --seconds 120 [--raid] [--chat "같이 사냥하실 분?"] [--speed 4]
//   그 밖: --seed 7  --raid-at 초  --raid-walk(레이드 때 봇을 제단 근처로 옮기지 않는다)  --boss-hp 95000  --chat-at 5
//          --no-outage(끊김 복구 시험 생략)  --spawn "서버 실행 명령"(시험기가 서버를 띄우고, 복구 시험 때 진짜로 죽였다 살린다)
//          --regen 3(전투 밖 봇 체력 회복 %/초, 기본 0 = 지금 게임과 같음)  --out 파일(JSON 저장)  --quiet
//          --chat-field(주인공이 마을이 아니라 사냥터에서 사냥하다가 말을 건다 — "도와주세요" 같은 말을 시험할 때)
//          --no-colliders(마을의 건물·좌판·상자·가로등·성벽 충돌 원을 뺀다. 기본은 게임과 같이 넣는다 — 봇은 걸리면 밀려난다)
// 판정 12가지: 명령 수신율 · 마을 배회 · 사냥 · mine 보호 · 돕기(assist_player) · 성문 · 멈춰 선 봇 없음 · 레이드 둘러서기 · 장판 회피 · 채팅 응답 · 대사 빈도 · 끊김 복구
// 끝나면 측정값(JSON)을 표준 출력으로, 판정(PASS/FAIL/SKIP)을 표준 오류로 낸다. FAIL 이 있으면 종료 코드 1.
import { spawn as spawnProc } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { createBrain, parseTickResponse, PACE_MUL, GOALS } from '../../game/src/game/brain.js';

// ── 인자 ──────────────────────────────────────────────────────
const O = { url: 'http://127.0.0.1:8787', seconds: 120, speed: 1, seed: 7, raid: false, raidAt: null, raidWalk: false, bossHp: 95000, chat: null, chatAt: 5, chatField: false, colliders: true, outage: true, spawn: null, regen: 0, out: null, quiet: false };
{
  const a = process.argv.slice(2);
  for (let i = 0; i < a.length; i++) {
    const k = a[i], v = () => { if (i + 1 >= a.length) { console.error('값이 빠졌습니다: ' + k); process.exit(2); } return a[++i]; };
    if (k === '--url') O.url = v().replace(/\/+$/, ''); else if (k === '--seconds') O.seconds = +v(); else if (k === '--speed') O.speed = +v(); else if (k === '--seed') O.seed = +v();
    else if (k === '--raid') O.raid = true; else if (k === '--raid-at') O.raidAt = +v(); else if (k === '--raid-walk') O.raidWalk = true; else if (k === '--boss-hp') O.bossHp = +v();
    else if (k === '--chat') O.chat = v(); else if (k === '--chat-at') O.chatAt = +v(); else if (k === '--chat-field') O.chatField = true; else if (k === '--no-colliders') O.colliders = false; else if (k === '--no-outage') O.outage = false; else if (k === '--spawn') O.spawn = v();
    else if (k === '--regen') O.regen = +v(); else if (k === '--out') O.out = v(); else if (k === '--quiet') O.quiet = true;
    else { console.error('모르는 인자: ' + k + '\n사용: node spark/test/fake_world.mjs --url http://127.0.0.1:8787 --seconds 120 [--raid] [--chat "…"] [--speed 4] [--spawn "명령"] [--no-outage]'); process.exit(2); }
  }
  if (!(O.seconds > 0) || !(O.speed > 0) || O.speed > 10) { console.error('--seconds 는 양수, --speed 는 0 초과 10 이하(게임 시간 기준 5Hz 를 지키려고 실제로는 5×배속 Hz 로 보낸다)'); process.exit(2); }
  if (O.raidAt === null) O.raidAt = Math.max(O.chat ? O.chatAt + 36 : 0, O.seconds * 0.35);
}
const log = (...s) => { if (!O.quiet) console.error(...s); };

// ── 세계 상수(게임과 같다) ─────────────────────────────────────
const ZONES = [{ id: 'town', x: 0, z: 0, r: 50 }, { id: 'forest', x: 0, z: -128, r: 62 }, { id: 'grave', x: -112, z: -150, r: 46 }, { id: 'altar', x: 0, z: -262, r: 46 }];
const zoneAt = (x, z) => { for (const q of ZONES) if (Math.hypot(x - q.x, z - q.z) < q.r) return q.id; return 'wild'; };
const POI = { plaza: [0, 4], gateMid: [0, -30], gateOut: [0, -58], forest: [0, -118], orcCamp: [34, -150], grave: [-108, -150], altar: [0, -262], raidSpot: [3, -238] };
const WALL_R = 49, GATE_HALF = 4.5, TOWN_R = 46;       // 성벽 반지름 49, 성문은 북쪽(z<0) x=0 부근(실제 틈 ±3.3m + 미끄러짐 여유)
const MON = { werewolf: { hp: 620, atk: 34, speed: 4.6, range: 2.0, dur: [0.6, 0.73], hit: [0.29, 0.42] }, orc_warrior: { hp: 880, atk: 44, speed: 3.6, range: 2.4, dur: [0.7, 0.8], hit: [0.35, 0.4] }, skeleton_knight: { hp: 1150, atk: 58, speed: 3.4, range: 2.4, dur: [0.7, 0.8], hit: [0.35, 0.4] } };
const GUILDS = ['은사자', '붉은까마귀', '새벽검', '철권단', '폭풍', '가시장미'];
const CLASSES = ['melee', 'melee', 'melee', 'magic', 'arrow'];
const STEP = 1 / 30;
// 마을의 충돌 원(게임 world.js 의 addCol 과 같은 자리·크기): 분수 · 성문 기둥 · 선술집 · 대장간 · 집 11채 · 좌판 4 · 상자 8 · 가로등 12 · 성벽 조각과 탑.
// 숲의 나무·바위는 게임의 난수로 뿌려지므로 옮기지 않았다. 봇(반지름 0.6)만 밀려난다 — 서버는 이 원들이 어디 있는지 모른다.
const BOT_R = 0.6; const COLLIDERS = [];
if (O.colliders) {
  const C = (x, z, r) => COLLIDERS.push({ x, z, r });
  C(0, 0, 3.3); C(-8.5, -47, 5.2); C(8.5, -47, 5.2); C(-13, -47, 3); C(13, -47, 3); C(-25, 9, 7.2); C(24, -8, 5.0);
  for (const [x, z, sz] of [[-27, -22, 11], [26, 17, 11.5], [-12, 30, 10.5], [13, 31, 11], [34, -24, 10.5], [-36, -6, 10], [37, 2, 10.5], [-30, 27, 10.8], [0, 38, 11.5], [-17, -33, 10], [17, -33, 10.2]]) C(x, z, sz * 0.36);
  for (const [x, z] of [[-15, -13], [-9, -19], [10, 14], [15, 9]]) C(x, z, 2.2);
  for (const [x, z] of [[-18, -9], [-5, -21], [12, 18], [19, -1], [28, -3], [-21, 2], [6, 26], [-6, 25]]) C(x, z, 1.2);
  for (const [x, z] of [[-7, -7], [7, -7], [-7, 7], [7, 7], [0, -26], [-5, -38], [5, -38], [-20, 0], [20, 0], [0, 22], [16, -12], [-14, 16]]) C(x, z, 0.3);
  for (let i = 0; i < 44; i++) { const a = (i + 0.5) / 44 * Math.PI * 2, x = Math.sin(a) * 49, z = -Math.cos(a) * 49; if (Math.abs(x) < 16 && z < 0) continue; C(x, z, 3.6); if (i % 6 === 2) C(Math.sin(a) * 49.6, -Math.cos(a) * 49.6, 3.8); }
}
function resolve(e) {       // 게임의 world.resolve 와 같다(두 번 훑으며 원 밖으로 밀어낸다)
  for (let it = 0; it < 2; it++) for (const c of COLLIDERS) { const dx = e.x - c.x, dz = e.z - c.z, rr = c.r + BOT_R, d2 = dx * dx + dz * dz; if (d2 < rr * rr && d2 > 1e-6) { const dd = Math.sqrt(d2); e.x = c.x + dx / dd * rr; e.z = c.z + dz / dd * rr; } }
}
const STALL_LIMIT = { rest: 95, follow_player: Infinity, assist_player: Infinity };   // 멈춰 서 있어도 되는 시간(초). 그 밖의 목표는 30초(마을 쉼 3~14초·상점 5~10초·부활 6초보다 넉넉히)
const stallLimit = (g) => (g in STALL_LIMIT ? STALL_LIMIT[g] : 30);

// ── 난수(시드 고정 → 같은 세계) ────────────────────────────────
let seed = (O.seed >>> 0) || 1;
const rng = () => { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const rand = (a, b) => a + rng() * (b - a);
const pick = (a) => a[(rng() * a.length) | 0];
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const r2 = (v) => Math.round(v * 100) / 100;

// ── 엔티티 ────────────────────────────────────────────────────
let nextId = 1; const ents = new Map();
const add = (e) => { e.id = nextId++; ents.set(e.id, e); return e; };
const P = add({ kind: 'player', name: '카일', level: 14, x: O.chat && !O.chatField ? POI.plaza[0] : POI.forest[0], z: O.chat && !O.chatField ? POI.plaza[1] : POI.forest[1], hp: 1400, hpMax: 1400, dead: false, speed: 6.4, yaw: 0, target: null, cool: 0, route: [], mode: O.chat && !O.chatField ? 'town' : 'hunt', anchor: { x: POI.forest[0], z: POI.forest[1] } });
const mons = [];
function addMon(tag, x, z) { const d = MON[tag]; mons.push(add({ kind: 'monster', tag, x, z, hx: x, hz: z, hp: d.hp, hpMax: d.hp, atk: d.atk, speed: d.speed, range: d.range, yaw: rand(0, 6), dead: false, t: 0, state: 'idle', target: null, cool: 0, wanderT: rand(1, 5), moveTo: null, mine: false, mineSince: -1, mineAcks: 0, elite: false })); }
for (let i = 0; i < 16; i++) { const a = rand(0, 6.28), r = rand(8, 48); addMon('werewolf', Math.sin(a) * r * 0.9 - 6, -128 + Math.cos(a) * r * 0.8); }
for (let i = 0; i < 9; i++) { const a = rand(0, 6.28), r = rand(5, 20); addMon('orc_warrior', 34 + Math.sin(a) * r, -150 + Math.cos(a) * r); }
for (let i = 0; i < 12; i++) { const a = rand(0, 6.28), r = rand(6, 36); addMon('skeleton_knight', -112 + Math.sin(a) * r, -150 + Math.cos(a) * r); }
let NAMES = null;
try { NAMES = (await import('../../game/src/data/names.js')).BOT_NAMES.slice(); } catch (e) { NAMES = null; }
if (!NAMES || NAMES.length < 22) NAMES = Array.from({ length: 40 }, (_, i) => '모험가' + (i + 1));
for (let i = NAMES.length - 1; i > 0; i--) { const j = (rng() * (i + 1)) | 0; [NAMES[i], NAMES[j]] = [NAMES[j], NAMES[i]]; }
const bots = [];
function addBot(home, x, z) {
  const cls = CLASSES[bots.length % CLASSES.length];
  const guild = rng() < 0.82 ? (rng() < 0.35 ? GUILDS[0] : GUILDS[1 + ((rng() * 5) | 0)]) : null;
  bots.push(add({ kind: 'bot', name: NAMES[bots.length], guild, cls, level: 10 + ((rng() * 28) | 0), x, z, hp: 1200, hpMax: 1200, atk: 50, speed: r2(rand(5.2, 6.2)), range: cls === 'melee' ? 2.3 : r2(rand(9, 13)), yaw: rand(0, 6),
    dead: false, t: 0, state: 'idle', cool: 0, home, goal: null, goalChanges: 0, moved: 0, movedTown: 0, townTime: 0, deaths: 0, lastHurt: -99, skipCross: false, raidMember: false, kills: 0, ax: x, az: z, aT: 0, lastSay: -99 }));
}
for (let i = 0; i < 16; i++) { const a = rand(0, 6.28), r = rand(5, 34); addBot('town', Math.sin(a) * r, Math.cos(a) * r); resolve(bots[bots.length - 1]); }
for (let i = 0; i < 4; i++) { const a = rand(0, 6.28), r = rand(6, 40); addBot('forest', Math.sin(a) * r, -128 + Math.cos(a) * r); }
for (let i = 0; i < 2; i++) { const a = rand(0, 6.28), r = rand(6, 26); addBot('grave', -112 + Math.sin(a) * r, -150 + Math.cos(a) * r); }
let boss = null, raid = { active: false, done: false, t: 0, tele: [], startedAt: -1 };
let gameT = 0, measuring = true; const timers = [];

// ── 측정값 ────────────────────────────────────────────────────
const M = { ticksSent: 0, ticksOk: 0, expected: 0, received: 0, badCmds: 0, badResponses: 0, httpErrors: 0, httpErrorSample: null, netErrors: 0, attackCmds: 0, mineCmds: 0, mineCmdSample: [], reqBytesMax: 0, respBytesMax: 0,
  botSteps: 0, coveredSteps: 0, staleTargetSteps: 0, goalSec: {}, botHits: 0, mineHits: 0, mineHitSample: [], mineMonSeconds: 0,
  assistCmds: 0, assistHits: 0, assistSec: 0, assistBots: new Set(), stall: {}, stallWorst: null, stallOver: [], kills: { bot: {}, player: {} }, botDeaths: 0,
  gate: 0, wall: 0, wallSample: [], states: [], chatLines: [], chatSentAt: null, chatNear: [],
  tele: { count: 0, exposed: 0, avoidable: 0, hits: 0, hitsAvoidable: 0, hitsUnavoidable: 0, walkIn: 0 }, ring: { samples: 0, participants: 0, inRing: 0, sectors: 0, minParticipants: 99, summoned: 0, summonedIn: 0, othersIn: 0 }, raidStartedAt: null, raidDoneAt: null, teleported: 0 };
const lat = [];

// ── 움직임·전투(게임의 stepTo / botAttack / damage 를 그대로 옮김) ──
function face(e, p, dt, k = 12) { const a = Math.atan2(p.x - e.x, p.z - e.z); let d = a - e.yaw; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; e.yaw += d * Math.min(1, dt * k); }
function stepTo(e, p, dt, speed, stop = 0.15) {
  const dx = p.x - e.x, dz = p.z - e.z, d = Math.hypot(dx, dz); if (d <= stop) return true;
  const s = Math.min(d - stop * 0.5, speed * dt); e.x += dx / d * s; e.z += dz / d * s; if (e.kind === 'bot' && COLLIDERS.length) resolve(e); face(e, p, dt); return false;
}
function hurtPlayer(d) { P.hp -= d; if (P.hp < P.hpMax * 0.4) P.hp = P.hpMax; }       // 주인공은 물약으로 버틴다(시험 대상이 아님)
function damage(m, d, src) {
  if (m.dead) return; m.hp -= d;
  if (src.kind === 'bot') src.aT = gameT;                              // 때렸다 → 멈춰 선 것이 아니다
  if (src.kind === 'bot' && measuring) { M.botHits++;
    if (src.goal === 'assist_player' && (m.kind === 'boss' || m.mine || P.target === m)) M.assistHits++;       // 돕기: 주인공의 대상을 같이 치는 것이 목적 → mine 위반이 아니다
    else if (m.kind === 'monster' && m.mine && src.swingMine && src.atkTarget === m) { M.mineHits++; if (M.mineHitSample.length < 5) M.mineHitSample.push({ t: r2(gameT), bot: src.name, goal: src.goal, mon: m.id, tag: m.tag }); } }
  if (m.kind === 'boss') m.threat.set(src.id, (m.threat.get(src.id) || 0) + d);
  if (m.kind === 'monster') {
    if (!m.target) m.target = src;
    const dx = m.x - src.x, dz = m.z - src.z, dd = Math.hypot(dx, dz) || 1; m.x += dx / dd * 0.25; m.z += dz / dd * 0.25;
    if (m.state !== 'attack' && m.hp > 0) { m.state = 'hit'; m.t = 0.32; }
  }
  if (m.hp <= 0) kill(m, src);
}
function kill(m, src) {
  m.hp = 0; m.dead = true; m.state = 'dead'; m.t = 0;
  if (m.kind === 'monster') { if (measuring) { const k = M.kills[src.kind === 'bot' ? 'bot' : 'player']; k[m.tag] = (k[m.tag] || 0) + 1; } if (src.kind === 'bot') src.kills++; if (P.target === m) P.target = null; }
  else if (m.kind === 'boss') { raid.active = false; raid.done = true; if (measuring) M.raidDoneAt = r2(gameT); brain.pushEvent({ type: 'raid_done' }); log(`[세계] t=${gameT.toFixed(1)} 보스 처치 — 레이드 끝`); }
}
function botAttack(b, tg, dt) {
  const reach = b.range + (tg.kind === 'boss' ? 4.2 : 0);          // 보스는 덩치만큼 더 닿는다(게임의 주인공 규칙과 같다)
  if (b.state === 'attack') {
    b.t += dt; const at = b.atkTarget;
    if (!b.hitDone && b.t >= b.hitAt) { b.hitDone = true; if (at && !at.dead && dist(at, b) < reach + 3) damage(at, Math.round(b.atk * rand(0.8, 1.3) * (at.kind === 'boss' ? 1.5 : 1)), b); }
    if (b.t >= b.atkDur) { b.state = 'idle'; b.cool = rand(0.15, 0.6); }
    return;
  }
  b.cool -= dt;
  if (dist(tg, b) > reach) stepTo(b, tg, dt, b.speed, reach * 0.85);
  else if (b.cool <= 0) { b.state = 'attack'; b.t = 0; b.hitDone = false; b.atkTarget = tg; b.swingMine = tg.kind === 'monster' && tg.mine && tg.mineAcks >= 2; if (b.cls === 'melee') { b.atkDur = pick([0.5, 0.5, 0.7]); b.hitAt = 0.3; } else { b.atkDur = 0.63; b.hitAt = 0.32 + dist(tg, b) / 34; if (b.hitAt > b.atkDur) b.atkDur = b.hitAt + 0.05; } }
  else face(b, tg, dt);
}
// 봇 한 명: 서버 명령을 규약대로 수행한다.
function updBot(b, dt) {
  if (b.dead) { b.t += dt; if (b.t > 6) { b.dead = false; b.hp = b.hpMax; b.state = 'idle'; b.cool = 0; } return; }             // 6초 뒤 그 자리에서 부활
  if (b.hp <= 0) { b.dead = true; b.t = 0; b.state = 'dead'; b.deaths++; if (measuring) M.botDeaths++; brain.pushEvent({ type: 'bot_dead', id: b.id }); return; }
  if (O.regen > 0 && gameT - b.lastHurt > 5 && b.state !== 'attack' && b.hp < b.hpMax) b.hp = Math.min(b.hpMax, b.hp + b.hpMax * O.regen / 100 * dt);
  const c = brain.command(b.id);
  if (measuring) { M.botSteps++; if (c) { M.coveredSteps++; M.goalSec[c.goal] = (M.goalSec[c.goal] || 0) + dt; } }
  b.cmd = c;
  if (!c) { b.state = 'idle'; return; }                                // 명령 없음(만료) → 가만히
  if (c.goal !== b.goal) { if (b.goal !== null) b.goalChanges++; b.goal = c.goal; }
  if (c.act === 'attack' && c.target !== null) {
    const tg = ents.get(c.target);
    if (tg && (tg.kind === 'monster' || tg.kind === 'boss') && !tg.dead) { botAttack(b, tg, dt); return; }
    if (measuring) M.staleTargetSteps++;                                       // 없는 대상·죽은 대상 → 이동 명령으로 넘어간다
  }
  b.state = 'idle';                                                     // 공격 명령이 아니면 휘두르던 동작은 끊는다
  if (c.move) stepTo(b, { x: c.move[0], z: c.move[1] }, dt, b.speed * PACE_MUL[c.pace], c.stop);
}
function updMonster(m, dt) {
  const d = MON[m.tag];
  if (m.dead) { m.t += dt; if (m.t > 9) { m.dead = false; m.hp = m.hpMax; m.x = m.hx; m.z = m.hz; m.state = 'idle'; m.target = null; } return; }   // 9초 뒤 제자리 부활
  if (m.state === 'hit') { m.t -= dt; if (m.t <= 0) m.state = 'idle'; return; }
  let tg = m.target; if (tg && (tg.dead || Math.hypot(tg.x - m.hx, tg.z - m.hz) > 46)) tg = m.target = null;
  if (!tg && !P.dead && dist(P, m) < 9 && zoneAt(P.x, P.z) !== 'town') tg = m.target = P;
  if (m.state === 'attack') {
    m.t += dt; if (tg) face(m, tg, dt, 6);
    if (!m.hitDone && m.t >= m.hitAt) { m.hitDone = true; if (tg && !tg.dead && dist(tg, m) < m.range + 1.4) { if (tg === P) hurtPlayer(m.atk * rand(0.85, 1.15)); else { tg.hp -= m.atk * 0.25; tg.lastHurt = gameT; } } }
    if (m.t >= m.atkDur) { m.state = 'idle'; m.cool = rand(0.5, 1.1); }
    return;
  }
  m.cool -= dt;
  if (tg) {
    if (dist(tg, m) > m.range) stepTo(m, tg, dt, m.speed, m.range * 0.8);
    else if (m.cool <= 0) { const k = rng() < 0.6 ? 0 : 1; m.atkDur = d.dur[k]; m.hitAt = d.hit[k]; m.hitDone = false; m.t = 0; m.state = 'attack'; }
    else face(m, tg, dt);
  } else {
    m.wanderT -= dt;
    if (m.moveTo) { if (stepTo(m, m.moveTo, dt, 1.3, 0.3)) { m.moveTo = null; m.wanderT = rand(2, 7); } }
    else if (m.wanderT <= 0) m.moveTo = { x: m.hx + rand(-6, 6), z: m.hz + rand(-6, 6) };
  }
}
// 주인공(각본): [채팅이 있으면 마을에서 말을 걸고] → 숲에서 사냥(주변 몬스터가 mine 이 된다) → [--raid 면 제단으로 가서 레이드 시작]
const routeTo = (from, dest) => { const a = Math.hypot(from.x, from.z) < TOWN_R, b = Math.hypot(dest[0], dest[1]) < TOWN_R; const r = []; if (a && !b) r.push(POI.gateMid, POI.gateOut); else if (!a && b) r.push(POI.gateOut, POI.gateMid); r.push(dest); return r.map((p) => ({ x: p[0], z: p[1] })); };
function updPlayer(dt) {
  P.cool -= dt;
  if (O.chat && M.chatSentAt === null && gameT >= O.chatAt) {
    M.chatSentAt = r2(gameT); M.chatSentReal = performance.now(); M.chatNear = bots.filter((b) => !b.dead && dist(b, P) < 40).map((b) => b.id);
    brain.pushEvent({ type: 'chat', text: O.chat }); log(`[세계] t=${gameT.toFixed(1)} 주인공 채팅: "${O.chat}" (40m 안의 봇 ${M.chatNear.length}명)`);
  }
  if (P.mode === 'town' && gameT >= O.chatAt + 18) { P.mode = 'hunt'; P.route = routeTo(P, POI.forest); }
  if (O.raid && P.mode !== 'raid' && gameT >= O.raidAt) { P.mode = 'raid'; P.target = null; P.route = routeTo(P, POI.raidSpot); }
  if (P.route.length) { P.target = null; if (stepTo(P, P.route[0], dt, 9, 0.6)) { P.route.shift(); if (!P.route.length && P.mode === 'raid' && !boss) startRaid(); } return; }
  if (P.mode === 'town') return;
  let tg = P.target; if (tg && tg.dead) tg = P.target = null;
  if (!tg) {
    if (boss && !boss.dead && dist(boss, P) < 60) tg = boss;
    else if (P.mode === 'hunt') { let best = 38; for (const m of mons) { if (m.dead || Math.hypot(m.x - P.anchor.x, m.z - P.anchor.z) > 60) continue; const d = dist(m, P); if (d < best) { best = d; tg = m; } } }
    P.target = tg;
  }
  if (!tg) return;
  const reach = 2.3 + (tg.kind === 'boss' ? 4.2 : 0);
  if (dist(tg, P) > reach) stepTo(P, tg, dt, P.speed, reach * 0.85);
  else if (P.cool <= 0) { P.cool = 0.55; damage(tg, Math.round(150 * rand(0.9, 1.12)), P); }
}
// ── 레이드(게임의 startRaid / bossTelegraph / updBoss 를 옮김) ──
function startRaid() {
  const A = { x: POI.altar[0], z: POI.altar[1] };
  boss = add({ kind: 'boss', name: '염옥의 군주 발카르', x: A.x, z: A.z, hp: O.bossHp, hpMax: O.bossHp, atk: 150, speed: 3.2, range: 7.5, yaw: 0, phase: 1, cool: 3, state: 'idle', t: 0, dead: false, threat: new Map(), onHit: null });
  raid = { active: true, done: false, t: 0, tele: [], startedAt: gameT }; M.raidStartedAt = r2(gameT);
  if (!O.raidWalk) {          // 지금 게임처럼 봇 10명을 제단 남쪽에 불러 모은다(누가 싸울지는 그 뒤 서버가 정한다)
    const RN = 10; for (let i = 0; i < RN && i < bots.length; i++) { const b = bots[i], a = (i / RN) * Math.PI * 2; b.dead = false; b.hp = b.hpMax; b.state = 'idle'; b.x = A.x + Math.sin(a + 2.6) * rand(26, 34) * 0.4 + rand(-6, 6); b.z = A.z + 30 + rand(0, 10); b.skipCross = true; b.raidMember = true; M.teleported++; }
  }
  brain.pushEvent({ type: 'raid_start' }); log(`[세계] t=${gameT.toFixed(1)} 레이드 시작 — 발카르 강림${O.raidWalk ? '' : ' (봇 10명 제단 앞 집결)'}`);
}
function bossTelegraph(x, z, r, delay, dmg, kind) {
  const q = { x, z, r, t: delay, dmg, kind, exposed: new Map() };
  for (const b of bots) { if (b.dead) continue; const d = Math.hypot(b.x - x, b.z - z); if (d < r) q.exposed.set(b.id, r - d + 0.3 <= b.speed * 1.25 * (delay - 0.35)); }   // true = 전력으로 뛰면 피할 수 있었다(반응 0.35초 가정)
  if (measuring) { M.tele.count++; M.tele.exposed += q.exposed.size; for (const v of q.exposed.values()) if (v) M.tele.avoidable++; }
  raid.tele.push(q);
}
function fireTele(q) {
  if (Math.hypot(P.x - q.x, P.z - q.z) < q.r) hurtPlayer(q.dmg);
  for (const b of bots) {
    if (b.dead || Math.hypot(b.x - q.x, b.z - q.z) >= q.r) continue;
    b.hp -= q.dmg * 2.2; b.lastHurt = gameT;
    if (measuring) { M.tele.hits++; if (!q.exposed.has(b.id)) M.tele.walkIn++; else if (q.exposed.get(b.id)) M.tele.hitsAvoidable++; else M.tele.hitsUnavoidable++; }
  }
}
function updBoss(B, dt) {
  raid.t += dt;
  for (let i = raid.tele.length - 1; i >= 0; i--) { const q = raid.tele[i]; q.t -= dt; if (q.t <= 0) { raid.tele.splice(i, 1); fireTele(q); } }
  if (B.dead) return;
  const ph = B.hp < B.hpMax * 0.35 ? 3 : B.hp < B.hpMax * 0.7 ? 2 : 1; B.phase = ph;
  let tg = null, best = -1; for (const [id, v] of B.threat) { const e = ents.get(id); if (e && !e.dead && v > best) { best = v; tg = e; } }
  if (!tg) tg = !P.dead && dist(P, B) < 40 ? P : (bots.find((b) => !b.dead && dist(b, B) < 60) || null);
  if (B.state === 'cast') { B.t += dt; if (tg) face(B, tg, dt, 2.5); if (!B.hitDone && B.t >= B.hitAt) { B.hitDone = true; if (B.onHit) B.onHit(); } if (B.t >= B.atkDur) { B.state = 'idle'; B.cool = rand(1.0, 2.0) / (ph === 3 ? 1.6 : 1); } return; }
  if (!tg) return;
  B.cool -= dt;
  if (dist(tg, B) > B.range) { stepTo(B, tg, dt, B.speed, B.range * 0.8); return; }
  face(B, tg, dt, 3);
  if (B.cool > 0) return;
  const roll = rng();
  if (roll < 0.22) {            // 유성: 주인공·봇 근처에 작은 장판 여러 개(1.3초 뒤 폭발)
    B.atkDur = 2.0; B.hitAt = 0.8;
    B.onHit = () => { const n = ph === 1 ? 4 : ph === 2 ? 6 : 8; const near = bots.filter((b) => !b.dead && dist(b, B) < 60);
      for (let i = 0; i < n; i++) { const q = i === 0 || !near.length ? P : pick(near); const x = q.x + rand(-4, 4), z = q.z + rand(-4, 4); timers.push({ at: gameT + i * 0.16, fn: () => { if (raid.active) bossTelegraph(x, z, 2.8, 1.3, 240, 'meteor'); } }); } };
  } else if (roll < 0.5) {      // 대지 강타: 앞 6m 에 큰 장판(1.08초 뒤)
    B.atkDur = 1.9; B.hitAt = 1.08; B.onHit = null; bossTelegraph(B.x + Math.sin(B.yaw) * 6, B.z + Math.cos(B.yaw) * 6, ph === 3 ? 9.5 : 8, 1.08, 420, 'slam');
  } else {                      // 평타: 앞 5.5m 에 장판(약 0.5초 뒤)
    const k = rng() < 0.5; B.atkDur = k ? 1.0 : 1.1; B.hitAt = k ? 0.52 : 0.55; B.onHit = null; bossTelegraph(B.x + Math.sin(B.yaw) * 5.5, B.z + Math.cos(B.yaw) * 5.5, 4.8, B.hitAt, 260, 'slam');
  }
  B.hitDone = false; B.t = 0; B.state = 'cast';
}
let ringT = 0;
function sampleRing(dt) {       // 1초마다: 보스 30m 안의 살아 있는 봇이 제 거리(근접 4.6m, 원거리 자기 사거리)에 둘러서 있는가
  if (!measuring || !raid.active || !boss || boss.dead || gameT - raid.startedAt < 12) return;
  ringT -= dt; if (ringT > 0) return; ringT = 1;
  const part = bots.filter((b) => !b.dead && dist(b, boss) < 30); const sec = new Set(); let ok = 0;
  for (const b of part) { const d = dist(b, boss), want = b.cls === 'melee' ? 4.6 : b.range; if (Math.abs(d - want) <= 3) ok++; sec.add(Math.floor(((Math.atan2(b.x - boss.x, b.z - boss.z) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 4))); }
  for (const b of bots) { if (b.dead) continue; if (b.raidMember) { M.ring.summoned++; if (b.goal === 'join_raid') M.ring.summonedIn++; } else if (b.goal === 'join_raid') M.ring.othersIn++; }
  M.ring.samples++; M.ring.participants += part.length; M.ring.inRing += ok; M.ring.sectors += sec.size; M.ring.minParticipants = Math.min(M.ring.minParticipants, part.length);
}

// ── 한 걸음(1/30초) ───────────────────────────────────────────
function step(dt) {
  for (let i = timers.length - 1; i >= 0; i--) if (timers[i].at <= gameT) { const f = timers[i].fn; timers.splice(i, 1); f(); }
  updPlayer(dt);
  for (const m of mons) {
    updMonster(m, dt);
    const mine = !m.dead && (P.target === m || m.target === P || dist(m, P) < 16);       // 게임의 mine() 과 같은 기준
    if (mine) { if (!m.mine) m.mineSince = gameT; if (measuring) M.mineMonSeconds += dt; } else { m.mineSince = -1; m.mineAcks = 0; }
    m.mine = mine;
  }
  for (const b of bots) {
    const px = b.x, pz = b.z;
    updBot(b, dt);
    if (b.skipCross) { b.skipCross = false; b.ax = b.x; b.az = b.z; b.aT = gameT; b.aLim = 0; continue; }
    if (!measuring) continue;
    // 멈춰 선 시간: 살아 있는데 1m 도 움직이지 않고 아무도 때리지 않은 채 흐른 시간(목표별 최댓값, 한도를 넘긴 일은 따로 적는다)
    if (b.dead || Math.hypot(b.x - b.ax, b.z - b.az) >= 1) { b.ax = b.x; b.az = b.z; b.aT = gameT; }       // (때리면 damage() 가 b.aT 를 지금으로 돌린다)
    const idle = gameT - b.aT;
    if (idle < STEP * 1.5) { b.aLim = 0; b.aFlag = false; }
    else { const g = b.goal || '(없음)'; b.aLim = Math.max(b.aLim || 0, stallLimit(g)); if (idle > (M.stall[g] || 0)) M.stall[g] = idle;
      if (idle > b.aLim && !b.aFlag) { b.aFlag = true; M.stallOver.push({ t: r2(gameT), bot: b.name, goal: g, x: r2(b.x), z: r2(b.z), zone: zoneAt(b.x, b.z), hp: Math.round(b.hp), cmd: b.cmd ? { act: b.cmd.act, move: b.cmd.move, stop: b.cmd.stop, pace: b.cmd.pace, left: b.cmd.move ? r2(Math.hypot(b.cmd.move[0] - b.x, b.cmd.move[1] - b.z)) : null } : null }); } }
    if (!b.dead && b.goal === 'assist_player') { M.assistBots.add(b.id); if (P.target && !P.target.dead) M.assistSec += dt; }
    const d = Math.hypot(b.x - px, b.z - pz), rn = Math.hypot(b.x, b.z);
    if (b.home === 'town' && !b.raidMember && rn < TOWN_R) { b.townTime += dt; b.movedTown += d; }
    if (d === 0) continue;
    b.moved += d;
    const rp = Math.hypot(px, pz);
    if ((rp - WALL_R) * (rn - WALL_R) < 0) {                                              // 성벽 원을 넘었다 → 성문 자리였나?
      const f = (WALL_R - rp) / (rn - rp), cx = px + (b.x - px) * f, cz = pz + (b.z - pz) * f;
      if (cz < 0 && Math.abs(cx) <= GATE_HALF) M.gate++; else { M.wall++; if (M.wallSample.length < 5) M.wallSample.push({ t: r2(gameT), bot: b.name, x: r2(cx), z: r2(cz), dir: rn > rp ? '밖으로' : '안으로' }); }
    }
  }
  if (boss) updBoss(boss, dt);
  sampleRing(dt);
}

// ── 세계 상태(규약의 요청 본문에서 v·sid·events 를 뺀 것) ────────
function snapshot() {
  return { t: gameT,
    player: { name: P.name, level: P.level, x: r2(P.x), z: r2(P.z), hp: Math.round(P.hp), hpMax: P.hpMax, dead: P.dead, zone: zoneAt(P.x, P.z), target: P.target ? P.target.id : null, guild: GUILDS[0] },
    bots: bots.map((b) => ({ id: b.id, name: b.name, guild: b.guild, cls: b.cls, level: b.level, x: r2(b.x), z: r2(b.z), hp: Math.max(0, Math.round(b.hp)), hpMax: b.hpMax, dead: b.dead, range: b.range, speed: b.speed })),
    mons: mons.map((m) => ({ id: m.id, tag: m.tag, x: r2(m.x), z: r2(m.z), hp: Math.max(0, Math.round(m.hp)), hpMax: m.hpMax, dead: m.dead, target: m.target ? m.target.id : null, mine: m.mine, elite: m.elite })),
    boss: boss && !boss.dead ? { id: boss.id, x: r2(boss.x), z: r2(boss.z), hp: Math.round(boss.hp), hpMax: boss.hpMax, phase: boss.phase, tele: raid.tele.map((q) => ({ x: r2(q.x), z: r2(q.z), r: q.r, t: r2(Math.max(0, q.t)) })) } : null,
    raid: { active: raid.active, done: raid.done } };
}

// ── 통신(측정용 fetch 감싸기) ──────────────────────────────────
let blackout = false;
async function fetchWrap(url, init) {
  if (blackout) throw new TypeError('fetch failed (시험: 서버 끊김 흉내)');
  if (!url.endsWith('/tick')) return fetch(url, init);
  const s0 = performance.now(); const req = JSON.parse(init.body); const meas = measuring;
  const alive = new Set(req.bots.filter((b) => !b.dead).map((b) => b.id)); const mine = new Set(req.mons.filter((m) => m.mine && !m.dead).map((m) => m.id));
  if (meas) { M.ticksSent++; M.expected += alive.size; M.reqBytesMax = Math.max(M.reqBytesMax, init.body.length); }
  let res; try { res = await fetch(url, init); } catch (e) { if (meas) M.netErrors++; throw e; }
  let text = ''; try { text = await res.text(); } catch (e) { if (meas) M.netErrors++; throw e; }
  let data; try { data = JSON.parse(text); } catch (e) { data = undefined; }
  if (meas) {
    if (!res.ok) { M.httpErrors++; if (!M.httpErrorSample) M.httpErrorSample = { status: res.status, body: text.slice(0, 300) }; }
    else { try { const r = parseTickResponse(data, 0); M.ticksOk++; lat.push(performance.now() - s0); M.respBytesMax = Math.max(M.respBytesMax, text.length); M.badCmds += r.bad;
      const seen = new Set(); for (const c of r.cmds) { if (alive.has(c.id)) seen.add(c.id); if (c.act === 'attack') { M.attackCmds++; if (c.goal === 'assist_player' && c.target === req.player.target) M.assistCmds++; else if (mine.has(c.target)) { M.mineCmds++; if (M.mineCmdSample.length < 5) M.mineCmdSample.push({ t: req.t, bot: c.id, goal: c.goal, mon: c.target }); } } }
      M.received += seen.size; } catch (e) { M.badResponses++; if (!M.httpErrorSample) M.httpErrorSample = { status: res.status, body: text.slice(0, 300), why: String(e.message) }; } }
  }
  if (res.ok && data !== undefined) M.curTickT = req.t;
  if (res.ok && data !== undefined) for (const id of mine) { const e = ents.get(id); if (e && e.mine) e.mineAcks = (e.mineAcks || 0) + 1; }   // 서버가 이 몬스터가 mine 임을 들은 횟수(응답까지 받은 것만)
  return { ok: res.ok, status: res.status, json: async () => { if (data === undefined) throw new SyntaxError('JSON 아님'); return data; } };
}
const brain = createBrain({ url: O.url, hz: 5 * O.speed, cmdTtlMs: 1000 / O.speed, retryMs: 5000 / O.speed, getSnapshot: snapshot, fetchImpl: fetchWrap,
  onChat: (m) => { const b = m.id !== null ? ents.get(m.id) : null; const d = b && b.kind === 'bot' ? r2(dist(b, P)) : null; M.chatLines.push({ t: r2(gameT), tickT: typeof M.curTickT === 'number' ? M.curTickT : r2(gameT), real: performance.now(), id: m.id, name: m.name, guild: m.guild, channel: m.channel, text: m.text, dist: d, knownBot: !!(b && b.kind === 'bot') }); log(`[채팅] t=${gameT.toFixed(1)} [${m.channel}] ${m.guild ? '[' + m.guild + '] ' : ''}${m.name}: ${m.text}`); },
  onStatus: (s) => { const last = M.states[M.states.length - 1]; if (!last || last.state !== s.state) { M.states.push({ state: s.state, t: r2(gameT), real: Math.round(performance.now()) }); log(`[두뇌] t=${gameT.toFixed(1)} 상태 ${s.state}${s.llm ? ' · LLM ' + s.llm : ''}`); } } });

// ── 서버 띄우기/죽이기(--spawn) ────────────────────────────────
let child = null, childLog = '';
function launch() {
  child = spawnProc(O.spawn, { shell: true, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
  const cap = (d) => { childLog = (childLog + d.toString()).slice(-2000); };
  child.stdout.on('data', cap); child.stderr.on('data', cap); const me = child; child.on('exit', () => { if (child === me) child = null; });
}
async function killServer() {
  const c = child; if (!c) return; child = null;
  const gone = new Promise((r) => c.on('exit', r));
  try { process.kill(-c.pid, 'SIGTERM'); } catch (e) { try { c.kill('SIGTERM'); } catch (e2) { } }
  const t = setTimeout(() => { try { process.kill(-c.pid, 'SIGKILL'); } catch (e) { } }, 3000);
  await gone; clearTimeout(t);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(cond, ms) { const t0 = performance.now(); while (performance.now() - t0 < ms) { if (cond()) return performance.now() - t0; await sleep(10); } return -1; }
async function healthUp(ms) {
  const t0 = performance.now();
  while (performance.now() - t0 < ms) {
    try { const ac = new AbortController(); const tm = setTimeout(() => ac.abort(), 700); const r = await fetch(O.url + '/health', { signal: ac.signal }); clearTimeout(tm); if (r.ok) { const j = await r.json(); if (j && j.ok === true) return performance.now() - t0; } } catch (e) { /* 아직 안 떴다 */ }
    await sleep(120);
  }
  return -1;
}
let cleaned = false;
async function cleanup() { if (cleaned) return; cleaned = true; try { brain.stop(); } catch (e) { } await killServer(); }
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { cleanup().then(() => process.exit(130)); });

// ── 끊김 복구 시험(본 측정이 끝난 뒤에 한다 — 다른 측정값을 흐리지 않게) ──
async function outagePhase() {
  const R = { mode: O.spawn ? '서버 프로세스를 죽였다 다시 띄움' : '통신 끊김 흉내(fetch 차단)', lostAfterMs: -1, cmdsWhileLost: null, restoreMs: null, backAfterMs: -1, cmdsBack: null };
  const n0 = M.states.length;
  if (O.spawn) await killServer(); else blackout = true;
  R.lostAfterMs = Math.round(await waitFor(() => brain.status().state === 'lost', 6000 + 6000 / O.speed));
  R.cmdsWhileLost = bots.filter((b) => brain.command(b.id)).length;
  await sleep(600 / O.speed);
  if (O.spawn) { launch(); R.restoreMs = Math.round(await healthUp(20000)); } else { blackout = false; R.restoreMs = 0; }
  const need = () => { const al = bots.filter((b) => !b.dead); return brain.status().state === 'on' && al.filter((b) => brain.command(b.id)).length >= al.length * 0.95; };
  R.backAfterMs = Math.round(await waitFor(need, 5000 / O.speed + 1500 + 5000));
  R.cmdsBack = bots.filter((b) => brain.command(b.id)).length;
  R.states = M.states.slice(Math.max(0, n0 - 1)).map((s) => s.state);
  return R;
}

// ── 판정 ──────────────────────────────────────────────────────
function judge(out) {
  const C = []; const pct = (a, b) => (b ? Math.round(a / b * 1000) / 10 : 0);
  const put = (id, name, result, detail) => C.push({ id, name, result, detail });
  { const rate = M.expected ? M.received / M.expected : 0; put('cmd_rate', '명령 수신율(봇·틱 대비 95% 이상)', rate >= 0.95 ? 'PASS' : 'FAIL', `${M.received}/${M.expected} = ${pct(M.received, M.expected)}% · 성공 틱 ${M.ticksOk}/${M.ticksSent} · 봇이 유효한 명령을 쥐고 있던 시간 ${pct(M.coveredSteps, M.botSteps)}%`); }
  { const tb = bots.filter((b) => b.home === 'town' && b.townTime >= Math.min(20, O.seconds * 0.3)); const dsum = tb.reduce((s, b) => s + b.movedTown, 0), tsum = tb.reduce((s, b) => s + b.townTime, 0); const mv = tb.filter((b) => b.movedTown >= 3).length; const sp = tsum ? dsum / tsum : 0;
    out.town = { bots: tb.length, moved3m: mv, metersTotal: r2(dsum), metersPerBot: tb.length ? r2(dsum / tb.length) : 0, avgSpeed: r2(sp) };
    put('town_roam', '마을 봇이 실제로 돌아다님(누적 이동 거리)', !tb.length ? 'SKIP' : (sp >= 0.08 && mv >= tb.length * 0.5 ? 'PASS' : 'FAIL'), tb.length ? `마을 봇 ${tb.length}명 중 ${mv}명이 3m 이상 이동 · 1인당 평균 ${out.town.metersPerBot}m (평균 ${out.town.avgSpeed}m/s, 기준 0.08m/s·절반 이상)` : '마을에 머문 봇이 없음'); }
  { const k = Object.values(M.kills.bot).reduce((s, v) => s + v, 0); put('hunt_kills', '사냥 봇이 몬스터를 잡음(처치 수 > 0)', k > 0 ? 'PASS' : 'FAIL', `봇 처치 ${k}마리 ${JSON.stringify(M.kills.bot)} · 봇 타격 ${M.botHits}회 · 봇 사망 ${M.botDeaths}회 (주인공 처치 ${Object.values(M.kills.player).reduce((s, v) => s + v, 0)})`); }
  { const none = M.mineMonSeconds < 1; put('mine', 'mine 몬스터(주인공 사냥감)를 건드리지 않음(돕기 목표로 주인공의 대상을 치는 것은 제외)', none ? 'SKIP' : (M.mineCmds === 0 && M.mineHits === 0 ? 'PASS' : 'FAIL'), none ? '주인공 사냥감이 없었음' : `mine 대상 공격 명령 ${M.mineCmds}건(전체 공격 명령 ${M.attackCmds}) · mine 몬스터 실제 타격 ${M.mineHits}회(서버가 mine 임을 두 틱 넘게 들은 뒤에 시작한 휘두름만 셈) · mine 몬스터·초 ${Math.round(M.mineMonSeconds)}` + (M.assistCmds ? ` · (돕기 명령 ${M.assistCmds}건은 따로 셈)` : '') + (M.mineCmdSample.length ? ' · 예: ' + JSON.stringify(M.mineCmdSample[0]) : '')); }
  { const sec = Math.round(M.assistSec); out.assist = { bots: M.assistBots.size, botSecondsWithTarget: sec, attackCmds: M.assistCmds, hits: M.assistHits };
    put('assist', '돕기(assist_player): 주인공이 치는 대상을 같이 침', sec < 10 ? 'SKIP' : (M.assistHits > 0 ? 'PASS' : 'FAIL'), sec < 10 ? (M.assistBots.size ? `돕는 봇 ${M.assistBots.size}명이 있었지만 주인공에게 대상이 있던 시간이 ${sec}봇·초뿐` : '돕기 목표를 받은 봇이 없음') : `돕는 봇 ${M.assistBots.size}명 · 주인공에게 대상이 있던 ${sec}봇·초 동안 주인공 대상 공격 명령 ${M.assistCmds}건 · 실제 타격 ${M.assistHits}회`); }
  put('gate', '마을↔사냥터 이동이 성문을 지남(성벽 관통 없음)', M.gate + M.wall === 0 ? 'SKIP' : (M.wall === 0 ? 'PASS' : 'FAIL'), M.gate + M.wall === 0 ? '이번 시험에서는 마을을 드나든 봇이 없음' : `성문 통과 ${M.gate}회 · 성벽 관통 ${M.wall}회` + (M.wallSample.length ? ' · 예: ' + JSON.stringify(M.wallSample[0]) : ''));
  { const st = {}; for (const k of Object.keys(M.stall)) st[k] = Math.round(M.stall[k] * 10) / 10; out.stall = { maxIdleSecByGoal: st, over: M.stallOver.slice(0, 8), overCount: M.stallOver.length };
    const worst = Object.entries(st).filter(([g]) => stallLimit(g) !== Infinity).sort((a, b) => b[1] - a[1])[0];
    put('stall', '멈춰 선 채 있는 봇이 없음(1m 도 안 움직이고 아무도 안 때린 시간)', M.stallOver.length === 0 ? 'PASS' : 'FAIL', (worst ? `가장 오래 멈춰 선 시간 ${worst[1]}초(${worst[0]})` : '멈춰 선 봇 없음') + ` · 한도(쉼 95초·그 밖 30초, 따라가기·돕기는 주인공 따라 제외)를 넘긴 일 ${M.stallOver.length}건` + (M.stallOver.length ? ' · 예: ' + JSON.stringify(M.stallOver[0]) : '')); }
  if (!O.raid) { put('raid_ring', '레이드: 봇들이 보스를 둘러섬', 'SKIP', '--raid 없음'); put('raid_tele', '레이드: 장판 피격 비율이 낮음', 'SKIP', '--raid 없음'); }
  else if (M.raidStartedAt === null || !M.ring.samples) { put('raid_ring', '레이드: 봇들이 보스를 둘러섬', 'FAIL', M.raidStartedAt === null ? '시험 시간 안에 레이드가 시작되지 않음(--seconds 를 늘리거나 --raid-at 을 앞당길 것)' : '레이드가 12초를 넘기지 못해 표본 없음'); put('raid_tele', '레이드: 장판 피격 비율이 낮음', 'SKIP', '표본 없음'); }
  else {
    const g = M.ring, ap = g.participants / g.samples, fr = g.participants ? g.inRing / g.participants : 0, sc = g.sectors / g.samples; const needP = O.raidWalk ? 4 : 6;
    out.raid.ring = { samples: g.samples, avgParticipants: r2(ap), minParticipants: g.minParticipants, inRingRate: r2(fr), avgSectors: r2(sc), summonedStayRate: g.summoned ? r2(g.summonedIn / g.summoned) : null, othersJoinedAvg: r2(g.othersIn / g.samples) };
    put('raid_ring', '레이드: 봇들이 보스를 둘러섬', ap >= needP && fr >= 0.6 && sc >= 4 ? 'PASS' : 'FAIL', `보스 30m 안의 봇 평균 ${r2(ap)}명(기준 ${needP}) · 제 거리(근접 4.6m/원거리 사거리 ±3m)에 선 비율 ${pct(g.inRing, g.participants)}%(기준 60%) · 8방향 중 평균 ${r2(sc)}방향 차지(기준 4)` + (g.summoned ? ` · 게임이 불러 모은 봇이 레이드에 남은 비율 ${pct(g.summonedIn, g.summoned)}% · 스스로 온 봇 평균 ${r2(g.othersIn / g.samples)}명` : ` · 스스로 레이드에 든 봇 평균 ${r2(g.othersIn / g.samples)}명`));
    const t = M.tele, bad = t.hitsAvoidable + t.walkIn, den = t.avoidable + t.walkIn;
    put('raid_tele', '레이드: 장판 피격 비율이 낮음', den < 5 ? 'SKIP' : (bad / den <= 0.3 ? 'PASS' : 'FAIL'), `장판 ${t.count}개 · 생길 때 안에 있던 봇 ${t.exposed}(그중 피할 수 있었던 경우 ${t.avoidable}) · 피할 수 있었는데 맞음 ${t.hitsAvoidable} + 걸어 들어가 맞음 ${t.walkIn} = ${bad}/${den} (${pct(bad, den)}%, 기준 30% 이하) · 물리적으로 못 피함 ${t.hitsUnavoidable}`);
  }
  if (!O.chat) put('chat_reply', '주인공 채팅에 근처 봇이 응답', 'SKIP', '--chat 없음');
  else if (M.chatSentAt === null) put('chat_reply', '주인공 채팅에 근처 봇이 응답', 'FAIL', '채팅을 보내기 전에 시험이 끝남');
  else { const after = M.chatLines.filter((l) => l.real >= M.chatSentReal); const near = after.filter((l) => l.knownBot && (M.chatNear.includes(l.id) || (l.dist !== null && l.dist < 40)));
    out.chat.replyDelayMs = near.length ? Math.round(near[0].real - M.chatSentReal) : null; out.chat.firstReply = near.length ? near[0].text : null;
    put('chat_reply', '주인공 채팅에 근처 봇이 응답', near.length ? 'PASS' : 'FAIL', near.length ? `${near.length}줄 · 첫 응답 ${out.chat.replyDelayMs}ms 뒤: ${near[0].name}: "${near[0].text}"` : `채팅 뒤 받은 대사 ${after.length}줄 중 근처(40m) 봇의 것이 없음`); }
  { const L = M.chatLines.filter((l) => l.t <= O.seconds); let gap = Infinity, botGap = Infinity, win = 0; const lastBy = new Map();
    for (let i = 0; i < L.length; i++) { if (i) gap = Math.min(gap, L[i].tickT - L[i - 1].tickT); const k = L[i].id !== null ? L[i].id : L[i].name; if (lastBy.has(k)) botGap = Math.min(botGap, L[i].tickT - lastBy.get(k)); lastBy.set(k, L[i].tickT); let n = 0; for (let j = i; j < L.length && L[j].tickT < L[i].tickT + 60; j++) n++; win = Math.max(win, n); }   // 간격은 대사가 실려 온 틱의 게임 시간으로 잰다
    const perMin = Math.round(L.length / (O.seconds / 60) * 10) / 10; const long = L.filter((l) => Array.from(l.text).length > 60).length, bad = L.filter((l) => /[<>\u0000-\u001f]/.test(l.text)).length, unknown = L.filter((l) => !l.knownBot).length;
    out.chat.rate = { lines: L.length, perMinute: perMin, maxIn60s: win, minGapSec: gap === Infinity ? null : r2(gap), minSameBotGapSec: botGap === Infinity ? null : r2(botGap), speakers: lastBy.size, over60chars: long, withMarkup: bad, fromUnknownBot: unknown };
    const ok = (gap === Infinity || gap >= 0.99) && (botGap === Infinity || botGap >= 19.99) && long === 0 && bad === 0 && unknown === 0;
    put('chat_rate', '대사 빈도·형식(전체 초당 1줄 이하 · 봇당 20초 간격 · 60자 이내 · 꺾쇠 없음)', !L.length ? 'SKIP' : (ok ? 'PASS' : 'FAIL'), !L.length ? '대사가 없었음' : `대사 ${L.length}줄(분당 ${perMin}줄, 가장 붐빈 60초에 ${win}줄, 말한 봇 ${lastBy.size}명) · 줄 사이 최소 ${gap === Infinity ? '-' : r2(gap)}초 · 같은 봇 최소 ${botGap === Infinity ? '-' : r2(botGap)}초 · 60자 초과 ${long} · 꺾쇠·제어 문자 ${bad} · 모르는 봇 ${unknown}`); }
  if (!out.outage) put('recovery', '서버가 끊겼다 살아나면 lost → on 으로 복구', 'SKIP', '--no-outage');
  else { const o = out.outage; const ok = o.lostAfterMs >= 0 && o.cmdsWhileLost === 0 && o.backAfterMs >= 0 && (o.restoreMs === null || o.restoreMs >= 0);
    put('recovery', '서버가 끊겼다 살아나면 lost → on 으로 복구', ok ? 'PASS' : 'FAIL', `${o.mode} · 끊긴 뒤 ${o.lostAfterMs}ms 에 lost(그동안 유효 명령 ${o.cmdsWhileLost}개)` + (O.spawn ? ` · 서버 재기동 ${o.restoreMs}ms` : '') + ` · 되살아난 뒤 ${o.backAfterMs}ms 에 on + 명령 재개(${o.cmdsBack}/${bots.length}) · 상태 ${o.states.join('→')}`); }
  return C;
}

// ── 실행 ──────────────────────────────────────────────────────
async function main() {
  if (O.spawn) { log(`[시험기] 서버 실행: ${O.spawn}`); launch(); const up = await healthUp(20000); if (up < 0) { console.error('[시험기] 서버가 20초 안에 뜨지 않았습니다.\n' + childLog); await cleanup(); process.exit(2); } }
  brain.start();
  if (await waitFor(() => brain.connected, 8000) < 0) { console.log(JSON.stringify({ run: O, verdict: 'FAIL', error: `두뇌 서버에 붙지 못함: ${O.url}/health`, states: M.states }, null, 2)); console.error(`FAIL  두뇌 서버에 붙지 못함: ${O.url}`); await cleanup(); process.exit(1); }
  log(`[시험기] 세계: 주인공 1 · 봇 ${bots.length}(마을 16·숲 4·묘지 2) · 몬스터 ${mons.length} · 마을 충돌 원 ${COLLIDERS.length} · ${O.seconds}초 × ${O.speed}배속${O.raid ? ' · 레이드(주인공 출발 t=' + Math.round(O.raidAt) + ')' : ''}${O.chat ? ' · 채팅' : ''}`);
  const realStart = performance.now(); let simBase = performance.now(), tBase = 0;
  await new Promise((done) => { const iv = setInterval(() => { const target = tBase + (performance.now() - simBase) / 1000 * O.speed; let n = 0; while (gameT + STEP <= target && gameT < O.seconds && n < 400) { step(STEP); gameT += STEP; n++; } if (n >= 400) { simBase = performance.now(); tBase = gameT; } if (gameT >= O.seconds) { clearInterval(iv); done(); } }, 4); });
  measuring = false; const realSeconds = (performance.now() - realStart) / 1000; const st = brain.status();
  const bg = setInterval(() => { for (let i = 0; i < Math.max(1, Math.round(O.speed / 2)); i++) { step(STEP); gameT += STEP; } }, 16);   // 복구 시험 동안에도 세계는 흐른다(측정은 멈춤)
  let stats = null; try { const r = await fetch(O.url + '/stats'); if (r.ok) stats = await r.json(); } catch (e) { stats = null; }   // 본 측정이 끝난 시점의 서버 통계
  let outage = null; if (O.outage) { log('[시험기] 끊김 복구 시험…'); outage = await outagePhase(); }
  clearInterval(bg);
  await cleanup();
  lat.sort((a, b) => a - b); const q = (p) => (lat.length ? Math.round(lat[Math.min(lat.length - 1, Math.floor(lat.length * p))] * 10) / 10 : null);
  const goalsNow = {}; for (const b of bots) goalsNow[b.goal || '(없음)'] = (goalsNow[b.goal || '(없음)'] || 0) + 1;
  const goalSec = {}; for (const k of Object.keys(M.goalSec)) goalSec[k] = Math.round(M.goalSec[k]);
  const out = {
    run: { url: O.url, seconds: O.seconds, speed: O.speed, seed: O.seed, colliders: COLLIDERS.length, raid: O.raid, raidWalk: O.raidWalk, chat: O.chat, spawn: O.spawn, regen: O.regen, realSeconds: r2(realSeconds) },
    brain: { stateAtEnd: st.state, llm: st.llm, llmOk: st.llmOk, thinkMs: st.thinkMs, sid: st.sid, ticksSent: M.ticksSent, ticksOk: M.ticksOk, skippedByModule: st.skipped, httpErrors: M.httpErrors, netErrors: M.netErrors, badResponses: M.badResponses, badCmds: M.badCmds, errorSample: M.httpErrorSample,
      latencyMs: { avg: lat.length ? Math.round(lat.reduce((s, v) => s + v, 0) / lat.length * 10) / 10 : null, p50: q(0.5), p95: q(0.95), max: q(1) }, reqBytesMax: M.reqBytesMax, respBytesMax: M.respBytesMax, states: M.states.map((s) => `${s.state}@${s.t}`) },
    commands: { expected: M.expected, received: M.received, rate: M.expected ? r2(M.received / M.expected) : 0, coverage: M.botSteps ? r2(M.coveredSteps / M.botSteps) : 0, attackCmds: M.attackCmds, staleTargetSteps: M.staleTargetSteps, unknownGoals: Object.keys(goalSec).filter((g) => !GOALS.includes(g)), goalBotSeconds: goalSec, goalsAtEnd: goalsNow, goalChanges: bots.reduce((s, b) => s + b.goalChanges, 0) },
    hunt: { botKills: M.kills.bot, playerKills: M.kills.player, botHits: M.botHits, botDeaths: M.botDeaths, killsByBot: bots.filter((b) => b.kills).map((b) => `${b.name}(${b.home}):${b.kills}`) },
    mine: { mineMonSeconds: Math.round(M.mineMonSeconds), attackCmdsOnMine: M.mineCmds, hitsOnMine: M.mineHits, samples: M.mineCmdSample.concat(M.mineHitSample) },
    gate: { gateCrossings: M.gate, wallCrossings: M.wall, samples: M.wallSample },
    raid: O.raid ? { startedAt: M.raidStartedAt, doneAt: M.raidDoneAt, teleported: M.teleported, bossHpPct: boss ? Math.round(boss.hp / boss.hpMax * 100) : null, tele: M.tele } : null,
    chat: { sentAt: M.chatSentAt, nearBots: M.chatNear.length, lines: M.chatLines.length, byChannel: M.chatLines.reduce((o, l) => { o[l.channel] = (o[l.channel] || 0) + 1; return o; }, {}), sample: M.chatLines.slice(0, 12).map((l) => `t=${l.t} [${l.channel}] ${l.name}: ${l.text}`) },
    outage, serverStats: stats };
  out.checks = judge(out);
  out.verdict = out.checks.some((c) => c.result === 'FAIL') ? 'FAIL' : 'PASS';
  const text = JSON.stringify(out, null, 2);
  console.log(text);
  if (O.out) { try { writeFileSync(O.out, text + '\n'); } catch (e) { console.error('[시험기] 저장 실패: ' + e.message); } }
  console.error('');
  for (const c of out.checks) console.error(`${c.result.padEnd(4)}  ${c.name} — ${c.detail}`);
  console.error(`\n종합: ${out.verdict}  (PASS ${out.checks.filter((c) => c.result === 'PASS').length} · FAIL ${out.checks.filter((c) => c.result === 'FAIL').length} · SKIP ${out.checks.filter((c) => c.result === 'SKIP').length})  틱 지연 평균 ${out.brain.latencyMs.avg}ms / p95 ${out.brain.latencyMs.p95}ms · LLM ${st.llm || '없음'}${st.llm ? (st.llmOk ? '(정상)' : '(응답 없음)') : ''}`);
  process.exit(out.verdict === 'PASS' ? 0 : 1);
}
main().catch(async (e) => { console.error('[시험기] 오류: ' + (e && e.stack || e)); await cleanup(); process.exit(2); });
