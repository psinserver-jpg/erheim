// 필드 시스템(v2 · 로직 2차): D 사망 벌점 · F 정예 몬스터 · E 적대 문파 습격 · G 도감 · 보급 귀환.
// systems.js 의 installSystems 가 맨 끝에서 installField(ctx, sys, tools) 를 부른다.
// 전부 직접 플레이(sys.isLive()) + !G.demo 일 때만 움직인다. 녹화용 자동 모드에서는 타이머·알림·보상이 하나도 돌지 않는다.
//   game.js 쪽 훅: hurtPlayer(SYS.onDeath 가 사망 창 문구를 돌려준다) · autoHunt(SYS.threat) · setTarget/미니맵(m.elite, m.raider) · updQuest(phase 'supply')
import * as THREE from 'three';
import { TAUNTS } from './saga.js';
import { DROP, ICON, STAT_LABEL, SHOP, BAG_CAP, josa } from './items.js';

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[(Math.random() * a.length) | 0];
const dist2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const nf = (n) => Math.round(n).toLocaleString('ko-KR');

// ── 수치(여기만 고치면 된다) ─────────────────────────────────────
export const DEATH_LOSS = 0.04;      // 사망 벌점: 현재 레벨 필요 경험치의 4%(계정 모드만)
export const ELITE = { every: [120, 200], range: 40, scale: 1.35, hp: 4, atk: 1.5, exp: 5, gold: 6, life: 300 };
export const RAID = { every: [150, 240], first: [45, 75], minLevel: 5, dist: [14, 18], limit: 75, speed: 5.4, expMult: 2.5, scrollW: 0.30, scrollA: 0.30, gear: 0.25,   // first: 계정 모드에서 아직 습격자를 물리친 적이 없을 때의 첫 습격(이야기 안에서 한 번은 겪게)
  hp: (L) => 260 + 70 * L, atk: (L) => 10 + 3.2 * L, gold: (L) => 40 + 12 * L, count: (L) => (L >= 10 ? 3 : 2) };
export const SUPPLY = { minGold: 250, spend: 0.6, max: 30, cool: 40, bagAt: BAG_CAP - 2, bagMin: 6, potKeep: 10 };   // bagAt: 가방이 이만큼 차고 팔 일반 장비가 bagMin 개 이상이면 팔러 간다. potKeep: 그때 물약이 이보다 적으면 함께 산다
// 도감: 처치 수가 need 에 닿을 때마다 bonus 를 영구히 얻는다(종류마다 조금씩 다르다)
export const CODEX = [
  { id: 'werewolf', name: '늑대인간', portrait: 'ui/portrait_werewolf.jpg', unit: '마리', need: [10, 50, 150], bonus: [{ atk: 2 }, { hp: 40 }, { atk: 4 }] },
  { id: 'orc_warrior', name: '오크 전사', portrait: 'ui/portrait_orc.jpg', unit: '마리', need: [10, 50, 150], bonus: [{ hp: 40 }, { def: 6 }, { hp: 90 }] },
  { id: 'skeleton_knight', name: '해골 기사', portrait: 'ui/portrait_skeleton.jpg', unit: '마리', need: [10, 50, 150], bonus: [{ def: 6 }, { atk: 3 }, { def: 12 }] },
  { id: 'raider', name: '붉은까마귀 습격자', icon: 'crest:1', unit: '명', need: [10, 50, 150], bonus: [{ atk: 3 }, { def: 8 }, { crit: 0.02 }] },
  { id: 'valkar', name: '염옥의 군주 발카르', portrait: 'ui/portrait_demon.jpg', unit: '회', need: [1, 3, 10], bonus: [{ hp: 120 }, { atk: 8 }, { def: 20 }] },
];
const TAUNT_IN = TAUNTS.beforeEnd.in;      // 완결 전의 도발(대본 extras.raiderTaunts). 완결 뒤 것은 sys.taunts 가 돌려준다
const TAUNT_KILL = TAUNTS.beforeEnd.kill;
const TAUNT_OUT = ['쳇, 오늘은 여기까지다.', '운이 좋았군. 다음엔 안 놓친다.', '물러난다! 다음 달밤에 보자.'];

export function installField(ctx, sys, tools) {
  const { G, P, hud, win, vfx, S, engine, world, names, GUILDS } = ctx;
  const { toast, sysChat } = tools;
  const RED = GUILDS[1];                                             // 붉은까마귀
  const live = () => sys.isLive() && !G.demo;
  const taunt = (k, d) => { const t = sys.taunts && sys.taunts(k); return t && t.length ? t : d; };   // 이야기 진행도에 맞는 도발(sagaengine.js 가 sys.taunts 를 건다)
  const inField = () => !world.zoneAt(P.pos.x, P.pos.z).safe;
  const raidOn = () => !!(G.raid && G.raid.active);
  const goldLoot = (n) => { if (n > 0) { P.gold += n; hud.loot({ icon: ICON.gold, name: '금화', count: n, rarity: 'common' }); } };
  const fxOff = (h) => { try { h && h.cancel && h.cancel(); } catch (e) { } };
  const SUP = { on: false, phase: '', route: [], cur: null, q: null, back: null, anchor: null, stuckT: 0, last: null, cool: 0, t: 0, runs: 0 };   // 보급 귀환 상태(아래 '보급 귀환')

  // ═════════════ D. 사망 벌점 ═════════════
  // 계정 모드에서만 현재 레벨 필요 경험치의 4%를 잃는다(0 아래로는 안 내려가고 레벨은 그대로). 체험 모드는 벌점 없음.
  sys.on('death', (src, view) => {
    if (src && src.name) view.by = src.raider ? `[${RED}] ${src.name}` : src.name;
    if (!G.story) { view.note = '문파원들이 당신을 기다립니다.'; return; }
    const lost = Math.round(ctx.expReq(P.level) * Math.min(Math.max(0, P.exp), DEATH_LOSS));
    P.exp = Math.max(0, P.exp - DEATH_LOSS);
    const t = lost > 0 ? `쓰러져서 경험치를 ${nf(lost)} 잃었습니다. (현재 레벨 필요 경험치의 4%)` : '쓰러졌지만 잃을 경험치가 없습니다.';
    view.note = lost > 0 ? `경험치를 ${nf(lost)} 잃었습니다. 레벨은 내려가지 않습니다.` : '잃을 경험치가 없습니다. 문파원들이 당신을 기다립니다.';
    sysChat(t); toast(t); ctx.refreshPlayerUI();
  });

  // ═════════════ F. 정예 몬스터 ═════════════
  // 주인공 주변의 보통 몬스터 하나가 "광폭한 ○○"이 된다. 동시에 하나만. 죽으면(시체가 사라진 뒤) 원래 수치로 되돌려 보통 몬스터로 다시 살아나게 한다.
  const EL = { next: rand(ELITE.every[0], ELITE.every[1]), cur: null, bornT: 0, deadT: -1, fx: null };
  const TINT_ELITE = new THREE.Color(1, 0.58, 0.48);
  const eliteOk = (m) => !!m && m.kind === 'monster' && !m.dead && !m.gone && !m.temp && !m.elite && !!DROP[m.tag];
  /** 정예를 만든다(시험용으로 대상을 직접 줄 수 있다) → 그 몬스터 또는 null */
  function spawnElite(target) {
    if (G.demo || EL.cur) return null;
    let m = eliteOk(target) ? target : null;
    if (!m) {
      const c = G.ents.filter(x => eliteOk(x) && dist2(x.pos, P.pos) < ELITE.range && (!x.target || x.target === P)); if (!c.length) return null;
      const fresh = c.filter(x => x.hp >= x.hpMax && !x.target); m = pick(fresh.length ? fresh : c);
    }
    const base = m.name;
    m.elite = { name: base, hpMax: m.hpMax, atk: m.atk, title: m.title || null, height: m.height, r: m.r, colors: m.ch.mats.map(x => x.color.clone()) };
    m.name = '광폭한 ' + base; m.hpMax = Math.round(m.hpMax * ELITE.hp); m.hp = m.hpMax; m.atk *= ELITE.atk; m.title = '정예';
    m.ch.model.scale.setScalar((m.scale || 1) * ELITE.scale); m.height *= ELITE.scale; m.r *= 1.2;
    for (const mat of m.ch.mats) mat.color.multiply(TINT_ELITE);
    EL.cur = m; EL.bornT = G.time; EL.deadT = -1;
    const t = `${world.zoneAt(m.pos.x, m.pos.z).name}에 ${m.name}${josa(m.name, '이', '가')} 나타났습니다!`;
    hud.notice(t, 'info'); sysChat(t);
    try { vfx.spawn(m.pos, { color: 0xff5030, scale: 1.4 }); } catch (e) { }
    S((ctx.md(m.tag) || {}).sfx, { pos: m.pos, volume: 0.9, rate: 0.8 });
    return m;
  }
  function endElite() {
    const m = EL.cur, o = m && m.elite; EL.cur = null; EL.deadT = -1; fxOff(EL.fx); EL.fx = null; if (!o) return;
    const k = m.hpMax > 0 ? m.hp / m.hpMax : 1;
    m.name = o.name; m.hpMax = o.hpMax; m.atk = o.atk; m.title = o.title; m.height = o.height; m.r = o.r; m.hp = m.dead ? 0 : Math.max(1, Math.round(o.hpMax * k));
    m.ch.model.scale.setScalar(m.scale || 1); m.ch.mats.forEach((mat, i) => { if (o.colors[i]) mat.color.copy(o.colors[i]); });
    delete m.elite;
  }
  sys.on('kill', (m) => {
    if (!m.elite || EL.cur !== m) return;
    const d = ctx.md(m.tag), base = m.elite.name;
    ctx.gainExp(sys.expFor(m, Math.round(d.exp * (ELITE.exp - 1))));                    // 기본 처치 보상과 합쳐 경험치 ×5(계정 모드는 레벨 차 보정)
    goldLoot(Math.round(rand(d.gold[0], d.gold[1]) * (ELITE.gold - 1)));                // 금화 ×6
    sys.dropGear(DROP[m.tag].tier, m.pos, { up: 1 });                                   // 장비 1개 확정(등급 한 단계 상향)
    const n = Math.random() < 0.5 ? 1 : 2; for (let i = 0; i < n; i++) sys.giveScroll(Math.random() < 0.5 ? 'w' : 'a', 1);
    try { vfx.lootBeam(m.pos, { color: 0xffb23e, duration: 5 }); } catch (e) { }
    S('quest_done', { volume: 0.7 });
    const t = `광폭한 ${base}${josa(base, '을', '를')} 쓰러뜨렸습니다!`; toast(t); sysChat(t);
    EL.deadT = G.time; fxOff(EL.fx); EL.fx = null;
  });
  function updElite(dt) {
    const m = EL.cur;
    if (m) {
      if (m.dead || m.gone) { fxOff(EL.fx); EL.fx = null; if (EL.deadT < 0) EL.deadT = G.time; if (G.time - EL.deadT > 3.6) endElite(); }   // 다른 모험가가 잡았을 때도 여기서 되돌린다
      else if (G.time - EL.bornT > ELITE.life || dist2(m.pos, P.pos) > 110) endElite();                                                // 오래 버려두면 진정한다
      else { const near = dist2(m.pos, P.pos) < 46;                                                                                      // 붉은 기운은 가까이 있을 때만
        if (near && !EL.fx) EL.fx = vfx.buff(m.ch.root, { color: 0xff4a28, duration: ELITE.life }) || null; else if (!near && EL.fx) { fxOff(EL.fx); EL.fx = null; } }
    }
    if (!live() || P.dead || G.talk || raidOn() || !inField()) return;
    if ((EL.next -= dt) > 0) return;
    EL.next = EL.cur ? 20 : spawnElite() ? rand(ELITE.every[0], ELITE.every[1]) : 12;
  }

  // ═════════════ E. 적대 문파 습격 ═════════════
  // 몬스터 파이프라인을 그대로 쓴다: kind 'monster', tag 'raider', 모델 hero(붉은 색조), temp(죽으면 사라짐), mdef(보상 수치), plateKind 'enemy'.
  const RD = { next: rand(RAID.every[0], RAID.every[1]), list: [], t: 0, deadT: -1, n: 0, kills: 0 };
  // 주인공 레벨대의 몬스터(경험치·장비 단계의 기준)
  function band() { let b = null; for (const tag of ['werewolf', 'orc_warrior', 'skeleton_knight']) { const d = ctx.md(tag); if (!b || d.level <= P.level) b = { tag, d }; } return b; }
  /** 습격자들을 부른다(시험용으로 인원을 줄 수 있다) → 엔티티 배열 또는 null */
  function spawnRaiders(count, opt = {}) {   // opt(이야기용): story 시간 제한 없이 끝까지 쫓는다 · at { x, z } 나타날 곳 · quiet 습격 공지를 띄우지 않는다
    if (G.demo || RD.list.length) return null;
    const L = P.level, n = count > 0 ? Math.min(5, count | 0) : RAID.count(L), b = band(), gold = Math.round(RAID.gold(L));
    const taken = new Set(G.ents.map(e => e.name)); const pool = ((names && names.BOT_NAMES) || []).filter(x => !taken.has(x));
    let a0 = rand(0, 6.283);   // 마을 안쪽에는 나타나지 않게 방향을 고른다
    for (let i = 0; i < 12; i++) { if (!world.zoneAt(P.pos.x + Math.sin(a0) * 16, P.pos.z + Math.cos(a0) * 16).safe) break; a0 = rand(0, 6.283); }
    const out = [];
    for (let i = 0; i < n; i++) {
      const a = a0 + (i - (n - 1) / 2) * 0.32, r = rand(RAID.dist[0], RAID.dist[1]);
      const pos = opt.at ? new THREE.Vector3(opt.at.x + (i - (n - 1) / 2) * 2.6, 0, opt.at.z + rand(-2.5, 2.5)) : new THREE.Vector3(P.pos.x + Math.sin(a) * r, 0, P.pos.z + Math.cos(a) * r);
      const name = pool.length ? pool.splice((Math.random() * pool.length) | 0, 1)[0] : '이름 없는 습격자';
      const e = ctx.spawn('monster', 'hero', pos, { lod: true, tint: 0xff6e5c, name, guild: 1, level: L, hp: Math.round(RAID.hp(L)), atk: RAID.atk(L), speed: RAID.speed, r: 0.55, range: 2.2, yaw: Math.atan2(P.pos.x - pos.x, P.pos.z - pos.z),
        extra: { raider: true, temp: true, plateKind: 'enemy', noDrop: true, title: '습격자', gearTier: DROP[b.tag].tier, mdef: { name: `${RED} 습격자`, exp: Math.round(b.d.exp * RAID.expMult), gold: [gold, gold], sfx: 'sword_swing2', portrait: null } } });
      if (!e) continue;
      e.tag = 'raider'; world.resolve(e.pos, e.r); e.home.copy(P.pos); e.target = P; e.wanderT = 2; e.cool = rand(0.2, 0.8);
      if (e.ch.shield) e.ch.shield.visible = false;   // 은사자 문장이 그려진 방패는 들지 않는다
      try { vfx.teleport(e.pos.clone(), { out: false, color: 0xff5a4a }); } catch (er) { }
      out.push(e);
    }
    if (!out.length) return null;
    RD.list = out.slice(); RD.t = 0; RD.deadT = -1; RD.n = out.length; RD.kills = 0; RD.story = !!opt.story;
    if (!opt.quiet) hud.notice(`[${RED}] 문파가 습격해 왔습니다!`, 'war'); if (!opt.quiet) sysChat(`[${RED}] 문파의 습격자 ${out.length}명이 나타났습니다. 물리치거나 성채로 피하세요.`);
    S('battle_cry', { volume: 0.7 }); engine.shake(0.25, 0.4);
    const t = pick(taunt('in', TAUNT_IN)); hud.chat.add({ channel: 'local', name: out[0].name, guild: RED, text: t }); hud.bubble(out[0].id, t, 3200);
    return out;
  }
  function retreat() {
    let who = null;
    for (const e of RD.list) if (!e.gone && !e.dead) { who = who || e; try { vfx.teleport(e.pos.clone(), { out: true, color: 0xff5a4a }); } catch (er) { } ctx.despawn(e); }
    RD.list = RD.list.filter(e => !e.gone); RD.n = 0;
    if (!who) return;
    hud.chat.add({ channel: 'local', name: who.name, guild: RED, text: pick(TAUNT_OUT) });
    hud.toast('습격자들이 물러갔습니다.', 'war'); sysChat('습격자들이 물러갔습니다.'); S('teleport', { volume: 0.5 });
  }
  sys.on('kill', (m) => {
    if (!m.raider || m.noReward) return;   // noReward: 북문 방어전의 적(보상은 장 보상으로 준다)
    P.fame = (P.fame | 0) + 1; RD.kills++;
    if (Math.random() < RAID.scrollW) sys.giveScroll('w', 1, m.pos);
    if (Math.random() < RAID.scrollA) sys.giveScroll('a', 1, m.pos);
    if (Math.random() < RAID.gear) sys.dropGear(m.gearTier || 1, m.pos);
    sysChat(`[${RED}] ${m.name}${josa(m.name, '을', '를')} 물리쳤습니다. 명성 +1 (현재 ${nf(P.fame)})`);
    if (RD.list.every(e => e.dead || e.gone)) { hud.notice(`[${RED}] 문파의 습격을 물리쳤습니다! (명성 +${RD.kills})`, 'war'); S('quest_done', { volume: 0.7 }); RD.n = 0; }
    sys.changed();
  });
  // 계정 모드에서 아직 습격자를 물리친 적이 없으면 첫 습격을 앞당긴다: 통주 중 레벨 5 이후의 필드 시간이 최소 주기(150초)에 못 미쳐 이야기 안에서 습격을 한 번도 못 보던 것을 고친다
  sys.on('load', () => { RD.next = G.story && !(P.fame > 0) && !(P.codex && P.codex.raider > 0) ? rand(RAID.first[0], RAID.first[1]) : rand(RAID.every[0], RAID.every[1]); });
  sys.on('death', (src) => {
    if (!src || !src.raider) return; RD.deadT = G.time;
    hud.notice(`[${RED}] ${src.name}에게 쓰러졌습니다…`, 'war');
    const t = pick(taunt('kill', TAUNT_KILL)); hud.chat.add({ channel: 'local', name: src.name, guild: RED, text: t }); hud.bubble(src.id, t, 3500);
  });
  /** 자동사냥이 먼저 쳐야 할 상대: 나를 노리는 가장 가까운 습격자(없으면 null) */
  function threat() {
    if (!RD.list.length) return null; let best = null, bd = 26;
    for (const e of RD.list) { if (e.dead || e.gone || e.target !== P || e.skipUntil > G.time) continue; const d = dist2(e.pos, P.pos); if (d < bd) { bd = d; best = e; } }
    return best;
  }
  function updRaid(dt) {
    if (RD.list.length) {
      RD.t += dt; let alive = 0;
      for (let i = RD.list.length - 1; i >= 0; i--) { const e = RD.list[i];
        if (e.gone) { RD.list.splice(i, 1); continue; }
        if (e.dead) { e.goneT = (e.goneT || 0) + dt; if (e.goneT > 4.5) { ctx.despawn(e); RD.list.splice(i, 1); } continue; }   // 멀리서 죽어 갱신이 끊긴 시체도 치운다
        alive++; e.home.copy(P.pos); if (!P.dead && !e.target) e.target = P; }                                                 // 끝까지 주인공만 쫓는다
      if (alive && (RD.t > (RD.story ? 1e9 : RAID.limit) || !inField() || raidOn() || (RD.deadT >= 0 && G.time - RD.deadT > 3))) retreat();       // 75초 · 마을 진입 · 레이드 시작 · 주인공 사망 → 철수
      return;
    }
    if (!live() || P.dead || G.talk || raidOn() || !inField() || P.level < RAID.minLevel || SUP.on) return;
    if ((RD.next -= dt) > 0) return;
    const q = ctx.getQrun(); if (q && q.phase === 'go') { RD.next = 2; return; }   // 의뢰 목적지로 달려가는 중에는 미룬다: 달리는 주인공을 습격자가 따라잡지 못해 싸움 없이 물러가 버린다(사냥터에 자리 잡으면 온다)
    RD.next = rand(RAID.every[0], RAID.every[1]); spawnRaiders();
  }

  // ═════════════ G. 도감 ═════════════
  const CX = { fresh: false };
  const tierOf = (c, n) => c.need.filter(x => n >= x).length;
  const bonusLabel = (b) => Object.keys(b).map(s => `${STAT_LABEL[s]} +${s === 'crit' ? Math.round(b[s] * 1000) / 10 + '%' : b[s]}`).join(' · ');
  function codexBonus() {
    const t = { atk: 0, hp: 0, def: 0, mp: 0, crit: 0 };
    for (const c of CODEX) { const k = tierOf(c, P.codex[c.id] | 0); for (let i = 0; i < k; i++) for (const s in c.bonus[i]) t[s] += c.bonus[i][s]; }
    t.crit = Math.round(t.crit * 1000) / 1000; return t;
  }
  function codexView() {
    const b = codexBonus(), total = [];
    for (const s of ['atk', 'hp', 'def', 'mp', 'crit']) if (b[s] > 0) total.push([STAT_LABEL[s], '+' + (s === 'crit' ? Math.round(b[s] * 1000) / 10 + '%' : b[s])]);
    return { entries: CODEX.map(c => { const kills = P.codex[c.id] | 0; return { id: c.id, name: c.name, portrait: c.portrait || null, icon: c.icon, unit: c.unit, kills, tiers: c.need.map((need, i) => ({ need, bonus: bonusLabel(c.bonus[i]), done: kills >= need })) }; }), total };
  }
  function codexAdd(id, n = 1) {
    const c = CODEX.find(x => x.id === id); if (!c || G.demo) return;
    const k0 = tierOf(c, P.codex[id] | 0); P.codex[id] = (P.codex[id] | 0) + n; const k1 = tierOf(c, P.codex[id]);
    if (k1 > k0) {
      sys.setBonus('codex', codexBonus());
      for (let i = k0; i < k1; i++) { const t = `도감 [${c.name}] ${i + 1}단계 달성! ${bonusLabel(c.bonus[i])}`; hud.notice(t, 'info'); sysChat(t + ' (영구 보너스)'); }
      S('quest_done'); CX.fresh = true; hud.setMenuBadge('codex', true); sys.changed();
    }
    if (win.isOpen('codex')) win.codex.set(codexView());
  }
  function codexLoad() {   // 저장에서 온 값 정리: 모르는 항목은 버리고 음수·소수는 고친다
    const src = P.codex && typeof P.codex === 'object' ? P.codex : {}, out = {};
    for (const c of CODEX) { const v = Math.floor(+src[c.id]); if (v > 0) out[c.id] = v; }
    P.codex = out; CX.fresh = false; sys.setBonus('codex', codexBonus());
  }
  sys.on('kill', (m) => codexAdd(m.raider ? 'raider' : m.tag));
  sys.on('bossDead', () => codexAdd('valkar'));
  sys.on('load', codexLoad);
  sys.on('windows', () => win.codex.set(codexView()));
  codexLoad();

  // ═════════════ G. 보급 귀환(설정 autoSupply) ═════════════
  // 자동사냥 중 빨간 물약이 떨어지고 금화가 넉넉하면: 성채의 잡화상인에게 달려가 물약을 사고(금화의 60%까지, 최대 30개)
  // 일반 등급 미착용 장비를 판 뒤, 원래 사냥터로 돌아와 자동사냥·의뢰를 이어 간다. 레이드 중에는 하지 않는다.
  // 진행 중인 사냥 의뢰는 멈추지 않고 phase 를 'supply' 로 세워 둔다(game.js 의 updQuest 가 그동안 건너뛴다).
  const POT_PRICE = (SHOP.find(x => x.id === 'pot_hp') || { price: 25 }).price;
  const commonSpare = () => { let n = 0; for (const it of P.inv) if (it.rarity === 'common' && !sys.slotOf(it.uid)) n++; return n; };
  /** 보급하러 갈 까닭: 'potion'(빨간 물약이 떨어짐) | 'bag'(가방이 거의 찼고 팔 일반 장비가 있음) | null */
  function supplyWanted() {
    if (!live() || sys.CFG.autoSupply === false || !G.auto || P.dead || G.talk || raidOn() || !inField()) return null;
    const q = ctx.getQrun(); if (q && !(q.kind === 'hunt' && q.phase === 'do')) return null;
    if (P.potions.hp <= 0 && P.gold >= SUPPLY.minGold) return 'potion';
    if (!RD.list.length && sys.bagCount() >= SUPPLY.bagAt && commonSpare() >= SUPPLY.bagMin) return 'bag';   // 팔러 가는 것은 습격이 끝난 뒤에
    return null;
  }
  function supplyGo(dest) { SUP.route = ctx.routeTo(dest); SUP.cur = SUP.route.shift(); SUP.stuckT = 0; SUP.last = P.pos.clone(); P.moveTo = SUP.cur.clone(); P.speed = 9; }
  function supplyStart(why) {
    const q = ctx.getQrun() || null;
    SUP.on = true; SUP.phase = 'go'; SUP.why = why; SUP.q = q; SUP.back = P.pos.clone(); SUP.anchor = P.huntAnchor.clone(); SUP.runs++;
    if (q) q.phase = 'supply';
    G.auto = false; hud.setAuto(false); P.target = null; hud.setTarget(null); P.chase = false; P.wantNpc = null;
    supplyGo(ctx.NPCS.rina.stand);
    const t = why === 'bag' ? '가방이 가득 찼습니다. 성채의 잡화상인에게 일반 등급 장비를 팔러 갑니다.' : '빨간 물약이 떨어졌습니다. 성채의 잡화상인에게 보급하러 갑니다.'; toast(t); sysChat(t);
  }
  /** 보급을 그만둔다. 세워 둔 의뢰가 있으면 함께 멈춘다 */
  function supplyEnd(msg) {
    const q = SUP.q; SUP.on = false; SUP.phase = ''; SUP.q = null; SUP.route = []; SUP.cur = null; SUP.cool = SUPPLY.cool; P.speed = 6.4;
    if (q && ctx.getQrun() === q && q.phase === 'supply') ctx.questStop();
    if (msg) toast(msg);
  }
  function supplyShop() {
    const sold = sys.sellAll('common', { quiet: true });                                     // 먼저 판다(판 돈으로 물약을 산다)
    const need = SUP.why === 'bag' ? (P.potions.hp < SUPPLY.potKeep ? SUPPLY.max - P.potions.hp : 0) : SUPPLY.max;   // 가방 때문에 왔으면 물약은 모자랄 때만
    const n = Math.max(0, Math.min(need, Math.floor(P.gold * SUPPLY.spend / POT_PRICE))), g0 = P.gold;
    if (n > 0) sys.buy('pot_hp', n);
    const spent = g0 - P.gold, parts = [];
    if (n > 0) parts.push(`빨간 물약 ${n}개(${nf(spent)} 금화)`); if (sold > 0) parts.push(`일반 장비 판매 +${nf(sold)} 금화`);
    const t = '보급 완료' + (parts.length ? ' — ' + parts.join(', ') : '') + '. 사냥터로 돌아갑니다.'; toast(t); sysChat(t);
    const q = SUP.q;
    if (q && ctx.getQrun() === q) {   // 의뢰를 이어 간다: 목적지로 다시 달리고, 도착하면 game.js 의 questArrive 가 자동사냥을 켠다
      SUP.on = false; SUP.phase = ''; SUP.q = null; SUP.cur = null; SUP.cool = SUPPLY.cool;
      q.phase = 'go'; q.route = ctx.routeTo(q.dest); q.stuckT = 0; q.last = P.pos.clone(); P.moveTo = q.route.shift(); P.speed = 9;
    } else { SUP.phase = 'back'; supplyGo(SUP.back); }
  }
  function updSupply(dt) {
    if (!SUP.on) { if ((SUP.cool -= dt) <= 0) { const why = supplyWanted(); if (why) supplyStart(why); } return; }
    const q = SUP.q;
    if (P.dead || raidOn() || G.auto) return supplyEnd();                                   // 쓰러졌거나, 레이드가 시작됐거나, 직접 자동사냥을 켰다
    if (q && (ctx.getQrun() !== q || q.phase !== 'supply')) return supplyEnd();             // 세워 둔 의뢰를 직접 멈췄거나 다른 의뢰를 시작했다
    if (!q && ctx.getQrun()) return supplyEnd();
    if (G.talk) return;
    if (SUP.phase === 'shop') { if ((SUP.t -= dt) <= 0) supplyShop(); return; }
    if (!P.moveTo) {
      if (SUP.cur && dist2(P.pos, SUP.cur) > 1.2) P.moveTo = SUP.cur.clone();               // 대화 등으로 끊긴 이동을 잇는다
      else if (SUP.route.length) { SUP.cur = SUP.route.shift(); P.moveTo = SUP.cur.clone(); }
      else if (SUP.phase === 'go') { SUP.phase = 'shop'; SUP.t = 0.9; SUP.cur = null; P.speed = 6.4; const m = ctx.NPCS.rina.ent; if (m) ctx.face(P, m.pos, 1, 100); S('ui_open', { volume: 0.7 }); }
      else { const anchor = SUP.anchor; supplyEnd(); ctx.getApi().setAuto(true); if (anchor) P.huntAnchor = anchor.clone(); }   // 사냥터 도착: 자동사냥 재개
      return;
    }
    SUP.stuckT += dt; if (SUP.stuckT > 2.5) { if (dist2(P.pos, SUP.last) < 2) { P.pos.copy(P.moveTo); world.resolve(P.pos, P.r); } SUP.last.copy(P.pos); SUP.stuckT = 0; }   // 지형에 걸리면 다음 지점으로 넘긴다
  }
  /** 직접 조작(땅 클릭·이동 키)이 들어오면 보급 귀환을 멈춘다 — game.js 의 입력 처리에서 부른다 */
  function userMove() { if (SUP.on) { P.moveTo = null; supplyEnd('보급 귀환을 멈췄습니다.'); } }

  // ═════════════ 매 프레임 ═════════════
  sys.on('update', (dt) => {
    if (G.demo) return;
    updElite(dt); updRaid(dt); updSupply(dt);
    if (CX.fresh && win.isOpen('codex')) { CX.fresh = false; hud.setMenuBadge('codex', 0); }
  });

  // ═════════════ 공개 ═════════════
  sys.spawnElite = spawnElite; sys.spawnRaiders = spawnRaiders; sys.threat = threat; sys.userMove = userMove;
  sys.field = { ELITE, RAID, SUPPLY, CODEX, DEATH_LOSS, endElite, retreat, codexAdd, codexView, codexBonus,
    // 시험용: 주인공의 타격·피격을 실제 경로(damage → kill → 보상 / hurtPlayer → 사망)로 일으키고, 다음 발생까지 남은 시간을 바꾼다
    hit: (m, d) => { if (m && !m.dead) ctx.damage(m, d === undefined ? m.hp : d, P, false); }, hurt: (d, src) => ctx.hurtPlayer(d, src),
    setTimers: (o = {}) => { if (o.elite !== undefined) EL.next = +o.elite; if (o.raid !== undefined) RD.next = +o.raid; if (o.supply !== undefined) SUP.cool = +o.supply; },
    state: () => ({ elite: EL.cur ? { id: EL.cur.id, name: EL.cur.name, tag: EL.cur.tag, hp: EL.cur.hp, hpMax: EL.cur.hpMax, atk: EL.cur.atk, dead: !!EL.cur.dead } : null, eliteNext: EL.next,
      raiders: RD.list.map(e => ({ id: e.id, name: e.name, hp: e.hp, hpMax: e.hpMax, atk: e.atk, dead: !!e.dead })), raidT: RD.t, raidNext: RD.next, supply: SUP.on ? SUP.phase : null, supplyRuns: SUP.runs, quest: (q => (q ? { id: q.id, kind: q.kind, phase: q.phase } : null))(ctx.getQrun()), bonus: codexBonus() }) };
  const state0 = sys.state; sys.state = () => ({ ...state0(), field: sys.field.state() });
}
