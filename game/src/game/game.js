// 게임 본체: 주인공 조작·자동사냥, 몬스터/봇/NPC AI, 전투·스킬·레벨업·전리품, 강화, 보스 레이드
import * as THREE from 'three';
import { loadCharModel, Character } from '../entities/chars.js';
import { POI, ZONES } from '../world/world.js';
import { CHAPTERS as CH, STORY_MON, ZONE_SUB } from './saga.js';   // CH · ST.ch(이야기 엔진이 장 차례를 맞춰 준다)는 레이드 재입장 제한(RAID_CH · raidWait) 같은 곳에서 그대로 쓴다
import { installSaga } from './sagaengine.js';
import { installSystems } from './systems.js';
import { createBrain, resolveBrain, PACE_MUL } from './brain.js';
import { installSkills } from './skills.js';

const V = (x, z) => new THREE.Vector3(x, 0, z);
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[(Math.random() * a.length) | 0];
const dist2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

export const MON = {
  werewolf: { name: '늑대인간', level: 14, hp: 620, atk: 34, exp: 46, gold: [18, 40], speed: 4.6, range: 2.0, r: 0.7, portrait: 'ui/portrait_werewolf.jpg', sfx: 'wolf_growl' },
  orc_warrior: { name: '오크 전사', level: 16, hp: 880, atk: 44, exp: 62, gold: [26, 55], speed: 3.6, range: 2.4, r: 0.85, portrait: 'ui/portrait_orc.jpg', sfx: 'orc_grunt' },
  skeleton_knight: { name: '해골 기사', level: 20, hp: 1150, atk: 58, exp: 88, gold: [40, 80], speed: 3.4, range: 2.4, r: 0.75, portrait: 'ui/portrait_skeleton.jpg', sfx: 'bones' },
};
const GUILDS = ['은사자', '붉은까마귀', '새벽검', '철권단', '폭풍', '가시장미'];
export const RATES = [1, 1, 1, 0.9, 0.8, 0.65, 0.5, 0.4, 0.3, 0.2, 0.12];
const EXPREQ = (lv) => Math.round(260 + (lv - 14) * 90);
// 계정 모드의 드랍 확률(체험·자동 모드는 이전 값 그대로: 물약 없음 · 무기 주문서 16%). 물약·주문서가 넘쳐 상점이 쓸모없던 것을 줄였다
export const STORY_RATE = { potion: 0.03, scrollW: 0.05 };
const RAID_COOL = 30 * 60 * 1000;   // 계정 모드: 이야기를 마친 뒤에는 발카르를 쓰러뜨리고 30분(실제 시간)이 지나야 다시 부를 수 있다
const SKILLS = [
  { id: 'spin', name: '회전 베기', icon: 2, key: '1', cd: 6, mp: 18, clip: 'skill1', lv: 1 },
  { id: 'slam', name: '도약 강타', icon: 3, key: '2', cd: 10, mp: 30, clip: 'skill2', lv: 3 },
  { id: 'roar', name: '사자의 포효', icon: 6, key: '3', cd: 24, mp: 25, clip: 'skill3', lv: 5 },
  { id: 'recall', name: '귀환', icon: 7, key: '4', cd: 30, mp: 10, clip: null, lv: 1 },
];

export async function createGame({ engine, world, ui, vfx, sound, names, chat }) {
  const scene = engine.scene;
  const hud = ui.hud, win = ui.win;
  const S = (n, o) => { try { sound && sound.sfx(n, o); } catch (e) { } };
  const models = {};
  for (const t of ['hero', 'werewolf', 'orc_warrior', 'skeleton_knight', 'blacksmith', 'mage', 'elf_archer', 'demon_lord']) {
    try { models[t] = await loadCharModel(t, { lod: false }); models[t + '_lod'] = await loadCharModel(t, { lod: true }); } catch (e) { console.warn('모델 없음', t); }
  }
  const G = { ents: [], time: 0, timeScale: 1, hitstop: 0, auto: false, demo: false, boss: null, raid: null, events: [], paused: false, story: false, talk: false };
  const ST = { ch: 0, n: 0, seen: false, started: false, raidOk: false, autoNext: false };   // 이야기 진행 상태(계정 모드)
  let SK = null; const skOn = () => !!SK && SK.on();   // 기술 체계(v3) — skills.js. 직접 플레이일 때만 true(자동 모드·타이틀에서는 아래 훅이 전부 예전 경로를 탄다)
  let SYS = null;   // 장르 핵심 시스템(장비·능력치·상점·설정·저장) — systems.js. 아래 '시스템 연결'에서 채운다
  let SAGA = null;  // 이야기 엔진(v3) — sagaengine.js. 아래 '이야기 엔진 연결'에서 채운다
  const md = (tag) => (G.story ? { ...MON[tag], ...STORY_MON[tag] } : MON[tag]);
  const expReq = (lv) => (G.story ? 90 + lv * 55 : EXPREQ(lv));
  const unlocked = (sk) => !G.story || P.level >= (sk.lv || 1);
  let nextId = 1;
  const sp = new THREE.Vector3(), sp2 = new THREE.Vector3(), scr = { x: 0, y: 0, z: 0 };

  // ---------------- 공통 엔티티 ----------------
  function spawn(kind, tag, pos, o = {}) {
    const m = models[tag + (o.lod ? '_lod' : '')] || models[tag]; if (!m) return null;
    const ch = new Character(m, { scale: o.scale || 1, tint: o.tint });
    const e = { id: nextId++, kind, tag, ch, pos: ch.root.position, yaw: o.yaw || 0, name: o.name || '', guild: o.guild ?? null, level: o.level || 1,
      hp: o.hp || 100, hpMax: o.hp || 100, atk: o.atk || 10, speed: o.speed || 4, r: o.r || 0.6, range: o.range || 2.2, state: 'idle', t: 0, target: null, dead: false,
      home: pos.clone(), moveTo: null, atkT: 0, hitDone: true, scale: o.scale || 1, height: (m.meta.height || 1.8) * (o.scale || 1), ...o.extra };
    e.pos.copy(pos); ch.root.rotation.y = e.yaw; scene.add(ch.root); ch.play('idle'); G.ents.push(e); return e;
  }
  function face(e, p, dt, k = 12) { const a = Math.atan2(p.x - e.pos.x, p.z - e.pos.z); let d = a - e.yaw; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; e.yaw += d * Math.min(1, dt * k); e.ch.root.rotation.y = e.yaw; }
  // detour: 상대를 쫓아갈 때(주인공의 추격·자동사냥, 몬스터·습격자, 사냥하는 봇)만 켠다. 길 따라 걷기(의뢰·보급·클릭 이동·배회)는 이전처럼 직선이다 — 목적지가 장애물 안일 수 있고, 걸리면 넘겨 주는 처리가 따로 있다
  function stepTo(e, p, dt, speed, stop = 0.15, detour = false) {
    const dx = p.x - e.pos.x, dz = p.z - e.pos.z; const d = Math.hypot(dx, dz); if (d <= stop) return true;
    const s = Math.min(d - stop * 0.5, speed * dt);
    if (G.demo || !detour) { e.pos.x += dx / d * s; e.pos.z += dz / d * s; world.resolve(e.pos, e.r); face(e, p, dt); return false; }   // 자동 모드·길 따라 걷기: 이전 그대로(직선 이동)
    // 직접 플레이의 추격: 묘비·기둥에 정면으로 막혀 제자리걸음을 하면(원형 충돌은 정면에서는 미끄러지지 않는다) 잠깐 옆으로 비켜 돌아간다
    const fx = dx / d, fz = dz / d; let ux = fx, uz = fz;
    if (e.sideT > 0 && Math.hypot(p.x - e.sideX, p.z - e.sideZ) > 4) e.sideT = 0;   // 목적지가 바뀌었으면 비켜 가기를 그만둔다
    if (e.sideT > 0) { e.sideT -= dt; const k = e.sideDir, f = e.sideF, vx = -fz * k + fx * f, vz = fx * k + fz * f, vl = Math.hypot(vx, vz); ux = vx / vl; uz = vz / vl; }   // 옆으로(k) + 앞으로 조금(f). 옆도 막힌 구석에서는 f 가 음수가 되어 뒤로 빠져나온다
    const ox = e.pos.x, oz = e.pos.z; e.pos.x += ux * s; e.pos.z += uz * s; world.resolve(e.pos, e.r); face(e, p, dt);
    if (s > 1e-4) {
      const mx = e.pos.x - ox, mz = e.pos.z - oz;
      if (e.sideT > 0) { if (Math.hypot(mx, mz) < s * 0.2) { e.sideDir = -e.sideDir; e.sideF = -0.7; } }   // 비켜 가는 쪽도 막혔으면(양옆이 막힌 구석) 반대쪽으로, 뒤로 물러나며 돈다
      else if (d - Math.hypot(p.x - e.pos.x, p.z - e.pos.z) < s * 0.25) {             // 목표에 거의 다가가지 못했다
        if ((e.blockT = (e.blockT || 0) + dt) > 0.3) {
          if (G.time - (e.sideEnd || -99) < 2) e.sideN = (e.sideN || 0) + 1;            // 방금 비켜 갔는데 또 막혔다(묘비 사이 틈·넓은 장애물): 같은 쪽으로 더 길게 돈다
          else { const lat = mx * -fz + mz * fx; e.sideN = 0; e.sideDir = Math.abs(lat) > s * 0.05 ? (lat > 0 ? 1 : -1) : Math.random() < 0.5 ? 1 : -1; }   // 처음 막혔다: 충돌이 밀어낸 쪽(왼쪽 +)으로, 정면이면 아무 쪽으로
          e.blockT = 0; e.sideF = 0.3; e.sideT = Math.min(3.2, Math.max(0.6, 4 / Math.max(1, speed)) * (1 + 0.7 * e.sideN)); e.sideEnd = G.time + e.sideT; e.sideX = p.x; e.sideZ = p.z;
        }
      } else e.blockT = 0;
    }
    return false;
  }
  function despawn(e) { const i = G.ents.indexOf(e); if (i >= 0) G.ents.splice(i, 1); try { scene.remove(e.ch.root); if (e.ch.dispose) e.ch.dispose(); } catch (er) { } e.dead = true; e.gone = true; if (P.target === e) { P.target = null; hud.setTarget(null); } }   // 장면·G.ents 에서 완전히 없앤다(습격자 같은 임시 엔티티)
  function screenOf(e, h) { sp.copy(e.pos); sp.y += h; return engine.project(sp, scr); }
  function dmgNum(e, val, kind) { if (SYS && !SYS.showDamage()) return; const s = screenOf(e, e.height * 0.9); if (s.z < 1) hud.damage(s.x + rand(-26, 26), s.y + rand(-14, 10), val, { kind }); }

  // ---------------- 주인공 ----------------
  const P = spawn('player', 'hero', POI.plaza.clone(), { name: '카일', guild: 0, level: 14, hp: 1400, atk: 96, speed: 6.4, r: 0.55 });
  Object.assign(P, { mp: 300, mpMax: 300, exp: 0.42, gold: 12840, combo: 0, buffT: 0, cds: {}, potions: { hp: 99, mp: 40 }, plus: 4, scrolls: 12, kills: 0, weaponName: '여명의 장검', huntAnchor: POI.forest.clone(), invuln: false, busy: 0, baseHp: 1400, baseMp: 300, def: 0, crit: 0.24 });   // baseHp/baseMp = 레벨 기본값. hpMax/mpMax/def/crit 은 SYS.derive() 가 다시 계산한다
  engine.setFollow(P.pos); engine.snapCamera();
  let trail = null, glow = null;
  try { if (P.ch.weapon && vfx) { trail = vfx.weaponTrail(P.ch.weapon, { base: [0, 0.2, 0], tip: [0, 1.15, 0], color: 0x9fd0ff, width: 1 }); trail.setActive(false); glow = vfx.enhanceGlow(P.ch.weapon, P.plus); } } catch (e) { console.warn(e); }
  const setTrail = (on) => { try { trail && trail.setActive(on); } catch (e) { } };
  function atkPower() { return (P.atk + P.plus * 14 + (SYS ? SYS.atkBonus() : 0)) * (P.buffT > 0 ? 1.35 : 1); }   // atkBonus = 힘×2 + 장비 + 도감(자동 모드는 0)
  function refreshPlayerUI() { hud.setPlayer({ name: P.name, level: P.level, guild: GUILDS[0], crest: 0, hp: Math.ceil(P.hp), hpMax: P.hpMax, mp: Math.ceil(P.mp), mpMax: P.mpMax, exp: P.exp, gold: P.gold, power: Math.round(atkPower() * 31 + P.hpMax * 2.2 + (SYS ? SYS.powerBonus() : 0)) }); }
  function skillState() { if (skOn()) return SK.hudList(); return SKILLS.map(s => ({ id: s.id, name: s.name, icon: s.icon, key: s.key, cd: s.cd, cdLeft: Math.max(0, P.cds[s.id] || 0), mp: s.mp, enabled: P.mp >= s.mp && unlocked(s) })); }
  function recalc() { const L = P.level - 1; P.baseHp = 380 + 80 * L; P.baseMp = 140 + 14 * L; P.atk = 34 + 6 * L; SYS.derive(); }   // 이야기 모드: 레벨로 능력치를 정한다
  hud.setSkills(skillState()); hud.setPotions(P.potions); refreshPlayerUI();

  function gainExp(x) {
    P.exp += x / expReq(P.level);
    const s = screenOf(P, 2.3); hud.damage(s.x + 40, s.y, x, { kind: 'exp' });
    while (P.exp >= 1) {
      P.exp -= 1; P.level++; SYS.onLevelUp(); if (G.story) recalc(); else { P.baseHp += 90; P.baseMp += 20; P.atk += 7; SYS.derive(); } P.hp = P.hpMax; P.mp = P.mpMax;
      if (G.story && !skOn()) for (const sk of SKILLS) if (sk.lv === P.level && sk.lv > 1) { hud.notice(`새 기술 [${sk.name}]을 익혔습니다! (단축키 ${sk.key})`, 'info'); hud.setSkills(skillState()); }
      hud.levelUp(P.level); try { vfx.levelUp(P.ch.root); } catch (e) { } S('levelup'); engine.flash(0xfff2c0, 0.35); engine.shake(0.25, 0.4);
      hud.chat.add({ channel: 'system', text: `레벨이 올랐습니다! (Lv.${P.level}) 체력·내력이 모두 회복되었습니다.` });
      chat && chat.event('levelUp', { name: P.name, level: P.level }); G.events.push('levelup'); brain.pushEvent({ type: 'player_levelup', level: P.level });
    }
    refreshPlayerUI();
  }
  function hurtPlayer(d, src) {
    if (P.dead || G.talk) return; if (G.demo) d = Math.min(d, Math.max(0, P.hp - P.hpMax * 0.22));
    if (!G.demo && src && src.kind === 'boss') d *= 0.5;   // 직접 플레이: AI 인원이 적어 보스 공격이 주인공에게 몰리므로 피해를 줄인다
    d = SYS.mitigate(d, src); if (skOn()) d = SK.incoming(d, src);   // 방어력: 받는 피해 × 100/(100+방어력) (자동 모드는 그대로)
    d = Math.round(d); if (d <= 0) return; P.hp -= d; if (!G.demo) P.lastHurt = G.time;   // 직접 플레이: 맞은 뒤 4초 동안은 자연 회복이 멈춘다(updPlayer). 자동 모드는 이전 그대로
    dmgNum(P, d, 'take'); if (skOn()) SK.onDamaged(d, src); S('player_hurt', { volume: 0.6 }); P.ch.flash(0.5); P.flashT = 0.12; engine.shake(0.12, 0.15);
    if (P.state === 'idle' || P.state === 'move') { /* 가벼운 피격은 동작을 끊지 않는다 */ }
    if (P.hp <= 0) { P.hp = 0; P.dead = true; P.state = 'dead'; brain.pushEvent({ type: 'player_dead' }); P.ch.play('death', { loop: false }); win.death.show({ sec: 5, ...SYS.onDeath(src) }); G.auto = false; hud.setAuto(false); }   // onDeath: 사망 벌점(계정 모드)과 사망 창 문구. 자동 모드는 빈 값
    refreshPlayerUI();
  }
  function usePotion(k) {
    if (P.potions[k] <= 0 || P.dead) return; if (k === 'hp' && P.hp >= P.hpMax) return;
    P.potions[k]--; if (k === 'hp') { const h = Math.round(P.hpMax * 0.35); P.hp = Math.min(P.hpMax, P.hp + h); dmgNum(P, '+' + h, 'heal'); try { vfx.heal(P.ch.root); } catch (e) { } } else P.mp = Math.min(P.mpMax, P.mp + 120);
    S('potion'); hud.setPotions(P.potions); refreshPlayerUI();
  }
  // 한 번의 타격 처리(주인공 → 대상들)
  function strike(targets, mult, { kind = 'arc1', shake = 0.14, stop = 0.05 } = {}) {
    let any = false;
    for (const m of targets) {
      if (m.dead) continue; any = true;
      const crit = Math.random() < SYS.critChance(); const d = Math.round(atkPower() * mult * rand(0.9, 1.12) * (crit ? 1.9 : 1));
      damage(m, skOn() ? SK.outgoing(d, m, 'basic', crit) : d, P, crit); if (skOn()) SK.onBasicHit(m, d, crit);
    }
    if (any) { engine.shake(shake, 0.16); G.hitstop = Math.max(G.hitstop, stop); S(Math.random() < 0.5 ? 'hit1' : 'hit2', { volume: 0.9 }); }
    return any;
  }
  function damage(m, d, src, crit) {
    if (m.dead) return; m.hp -= d; m.lastHit = G.time; if (m.kind !== 'boss') { m.ch.flash(0.3); m.flashT = 0.08; }
    if (src === P) { dmgNum(m, d, crit ? 'crit' : 'deal'); if (crit) S('crit', { volume: 0.8 }); if (m.kind === 'boss') m.threat.set(P.id, (m.threat.get(P.id) || 0) + d); }
    else if (m.kind === 'boss') { m.threat.set(src.id, (m.threat.get(src.id) || 0) + d); if (Math.random() < 0.35 && dist2(m.pos, P.pos) < 30) dmgNum(m, d, 'deal'); }
    if (src === P || Math.random() < 0.3) { sp.copy(m.pos); sp.y += m.kind === 'boss' ? rand(1.5, 4) : m.height * 0.55; sp.x += rand(-0.3, 0.3) * (m.kind === 'boss' ? 5 : 1); sp.z += m.kind === 'boss' ? rand(-1.5, 1.5) : 0; try { vfx.hit(sp, { color: crit ? 0xffd070 : 0xfff0d0, scale: (crit ? 1.0 : 0.65) * (m.kind === 'boss' ? 1.3 : 1), crit }); } catch (e) { } }
    if (m.kind === 'monster') {
      if (!m.target) m.target = src; const kb = 0.25; const dx = m.pos.x - src.pos.x, dz = m.pos.z - src.pos.z, dd = Math.hypot(dx, dz) || 1; m.pos.x += dx / dd * kb; m.pos.z += dz / dd * kb;
      if (m.state !== 'attack' && !m.cast && m.hp > 0) { m.ch.play('hit', { loop: false, restart: true, fade: 0.05 }); m.state = 'hit'; m.t = 0.32; }
      if (src === P && Math.random() < 0.4) S('monster_hurt', { volume: 0.5, pos: m.pos });
    }
    if (m.hp <= 0) kill(m, src);
  }
  function kill(m, src) {
    m.hp = 0; m.dead = true; m.state = 'dead'; m.t = 0; m.ch.play('death', { loop: false, fade: 0.08 }); S('monster_die', { pos: m.pos, volume: 0.7 });
    if (m.kind === 'monster') {
      const d = m.mdef || md(m.tag);   // mdef: 표(MON)에 없는 몬스터(습격자 등)가 직접 들고 다니는 수치
      if (src === P || dist2(m.pos, P.pos) < 8) {
        if (G.story && Math.random() < STORY_RATE.potion) { P.potions.hp += 1; hud.setPotions(P.potions); hud.loot({ icon: 9, name: '빨간 물약', count: 1, rarity: 'common' }); }
        P.kills++; gainExp(SYS.expFor(m, d.exp)); const gold = Math.round(rand(d.gold[0], d.gold[1])); P.gold += gold;
        hud.loot({ icon: 14, name: '금화', count: gold, rarity: 'common' }); S('coin', { volume: 0.5 });
        if (!m.raider && Math.random() < (G.story ? STORY_RATE.scrollW : 0.16)) { P.scrolls++; hud.loot({ icon: 11, name: '무기 강화 주문서', count: 1, rarity: 'rare' }); try { vfx.lootBeam(m.pos, { color: 0x4aa3ff, duration: 2.5 }); } catch (e) { } }
        if (Math.random() < 0.05) { P.crystals = (P.crystals || 0) + 1; hud.loot({ icon: 15, name: '마력 결정', count: 1, rarity: 'epic' }); try { vfx.lootBeam(m.pos, { color: 0xb36bff, duration: 3 }); } catch (e) { } }
        SYS.onKill(m, src);   // 장비·방어구 주문서 드랍, 도감 등(자동 모드에서는 아무 일도 하지 않는다)
        quest.kill(m.tag); refreshPlayerUI();
      }
      if (P.target === m) { P.target = null; hud.setTarget(null); }
    } else if (m.kind === 'boss') bossDead(m);
  }

  // ---------------- 의뢰 ----------------
  let qrun = null;   // 자동 진행 중인 의뢰
  const quest = { n: { werewolf: 0, orc_warrior: 0 },
    kill(t) {
      if (SAGA && SAGA.questInfo()) return;   // 이야기 진행 중: 처치는 이야기 엔진이 사건으로 센다(일일 의뢰는 완결 뒤부터)
      if (this.n[t] !== undefined) { this.n[t]++; this.show(); } },
    show() { const act = (id) => !!(qrun && qrun.id === id);
      const si = SAGA && SAGA.questInfo();   // 이야기 의뢰(계정 모드, 완결 전). 완결 뒤에는 아래 일일 의뢰가 나온다
      if (si) { hud.setQuest([{ id: 'story', active: act('story'), title: si.title, lines: [{ text: si.text, cur: si.cur, max: si.max, done: si.done }] }]); return; }
      hud.setQuest([{ id: 'hunt', active: act('hunt'), title: '[일일] 숲의 위협', lines: [{ text: '늑대인간 처치', cur: Math.min(this.n.werewolf, 20), max: 20, done: this.n.werewolf >= 20 }, { text: '오크 전사 처치', cur: Math.min(this.n.orc_warrior, 10), max: 10, done: this.n.orc_warrior >= 10 }] }, { id: 'raid', active: act('raid'), title: '[문파] 발카르 토벌전', lines: [{ text: '잿불 제단의 레이드에 참가', cur: G.raid && G.raid.done ? 1 : 0, max: 1, done: !!(G.raid && G.raid.done) }] }, { id: 'enh', active: act('enh'), title: '[성장] 여명의 장검 +7 달성', lines: [{ text: '대장장이 브롬에게 강화', cur: Math.min(P.plus, 7), max: 7, done: P.plus >= 7 }] }]); } };
  quest.show();

  // ---------------- 몬스터 ----------------
  const spawnPts = [];
  function addMon(tag, x, z) { const d = MON[tag]; const e = spawn('monster', tag, V(x, z), { lod: true, name: d.name, level: d.level, hp: d.hp, atk: d.atk, speed: d.speed, r: d.r, range: d.range, yaw: rand(0, 6) }); if (e) { e.wanderT = rand(1, 5); spawnPts.push(e); } return e; }
  for (let i = 0; i < 16; i++) { const a = rand(0, 6.28), r = rand(8, 48); addMon('werewolf', Math.sin(a) * r * 0.9 - 6, -128 + Math.cos(a) * r * 0.8); }
  for (let i = 0; i < 9; i++) { const a = rand(0, 6.28), r = rand(5, 20); addMon('orc_warrior', 34 + Math.sin(a) * r, -150 + Math.cos(a) * r); }
  for (let i = 0; i < 12; i++) { const a = rand(0, 6.28), r = rand(6, 36); addMon('skeleton_knight', -112 + Math.sin(a) * r, -150 + Math.cos(a) * r); }
  function updMonster(m, dt) {
    const d = m.mdef || MON[m.tag];
    if (m.dead && m.temp) { m.t += dt; if (m.t > 2.2) m.ch.setOpacity(Math.max(0, 1 - (m.t - 2.2) / 1.2)); if (m.t > 3.4) despawn(m); return; }   // 임시 몬스터는 다시 살아나지 않는다
    if (m.dead) { m.t += dt; if (m.t > 2.2) m.ch.setOpacity(Math.max(0, 1 - (m.t - 2.2) / 1.2)); if (m.t > 3.4 && m.ch.root.visible) { m.ch.root.visible = false; } if (m.t > 9) { m.dead = false; m.hp = m.hpMax; m.pos.copy(m.home); m.ch.setOpacity(1); m.ch.root.visible = true; m.state = 'idle'; m.target = null; m.ch.play('idle', { restart: true }); try { vfx.spawn(m.pos, { color: 0x8866ff }); } catch (e) { } } return; }
    if (skOn() && SK.monTick(m, dt)) return;   // 기절·시전 중(정예·이야기 정예·습격자) — skills.js
    if (m.state === 'hit') { m.t -= dt; if (m.t <= 0) m.state = 'idle'; return; }
    let tg = m.target; if (tg && (tg.dead || dist2(tg.pos, m.home) > 46)) tg = m.target = null;
    if (!tg && !P.dead && !G.talk && dist2(P.pos, m.pos) < 9 && !world.zoneAt(P.pos.x, P.pos.z).safe) tg = m.target = P;
    if (m.state === 'attack') {
      m.t += dt; if (tg) face(m, tg.pos, dt, 6);
      if (!m.hitDone && m.t >= m.hitAt) { m.hitDone = true; if (tg && !tg.dead && dist2(tg.pos, m.pos) < m.range + 1.4) { if (tg === P) hurtPlayer(m.atk * rand(0.85, 1.15), m); else { tg.hp -= m.atk * 0.25; } } }
      if (m.t >= m.atkDur) { m.state = 'idle'; m.cool = rand(0.5, 1.1); } return;
    }
    m.cool = (m.cool || 0) - dt;
    if (tg) {
      const dd = dist2(tg.pos, m.pos);
      if (dd > m.range) { stepTo(m, tg.pos, dt, m.speed, m.range * 0.8, true); m.ch.play('run'); }
      else if (m.cool <= 0) { const c = Math.random() < 0.6 ? 'attack1' : 'attack2'; m.atkDur = m.ch.play(c, { loop: false, restart: true, fade: 0.08 }); m.hitAt = m.ch.event(c, 'hit') ?? m.atkDur * 0.5; m.hitDone = false; m.t = 0; m.state = 'attack'; if (Math.random() < 0.3) S(d.sfx, { pos: m.pos, volume: 0.5 }); }
      else { face(m, tg.pos, dt); m.ch.play('idle'); }
    } else {
      m.wanderT -= dt;
      if (m.moveTo) { if (stepTo(m, m.moveTo, dt, 1.3, 0.3)) { m.moveTo = null; m.wanderT = rand(2, 7); } m.ch.play('walk'); }
      else { m.ch.play('idle'); if (m.wanderT <= 0) m.moveTo = V(m.home.x + rand(-6, 6), m.home.z + rand(-6, 6)); }
    }
  }

  // ---------------- NPC ----------------
  const smith = spawn('npc', 'blacksmith', POI.smith.clone(), { name: '대장장이 브롬', yaw: -2.2, level: 60, hp: 9999 });
  if (smith) { smith.title = '장비 강화'; smith.ch.play(smith.ch.has('work') ? 'work' : 'idle'); smith.workT = 0; }
  // 잡화상인(정지 모델): 숨 쉬듯 살짝 흔들리게만 한다
  let merchantEnt = null;
  try { const gl = await (await import('../core/assets.js')).Assets.gltf('env/merchant.glb'); let mesh = null; gl.scene.traverse(o => { if (o.isMesh && !mesh) mesh = o; });
    const root = new THREE.Group(); const mm = new THREE.Mesh(mesh.geometry, mesh.material); mm.scale.setScalar(1.66); mm.castShadow = true; mm.rotation.y = Math.PI * 0.5 + 0.5; root.add(mm); root.position.copy(POI.merchant); scene.add(root);
    const shim = { root, update() { mm.scale.y = 1.66 * (1 + Math.sin(G.time * 1.7) * 0.006); }, flash() { }, play() { return 1; }, has() { return false; }, setOpacity() { } };
    G.ents.push(merchantEnt = { id: nextId++, kind: 'npc', tag: 'merchant', ch: shim, pos: root.position, yaw: 0, name: '잡화상인 리나', guild: null, level: 30, hp: 1, hpMax: 1, r: 0.5, height: 1.66, title: '물약 · 주문서', dead: false, state: 'idle' });
  } catch (e) { console.warn('merchant', e); }
  // 이야기 인물
  const liena = spawn('npc', 'elf_archer', V(7.0, 10.0), { name: '리에나', yaw: -2.6, level: 58, hp: 9999 }); if (liena) liena.title = '은사자 부문주';
  const orben = spawn('npc', 'mage', V(-8.0, 10.5), { name: '현자 오르벤', yaw: 2.6, level: 60, hp: 9999 }); if (orben) orben.title = '성채 기록관';
  const NPCS = { brom: { ent: smith, stand: POI.smithStand }, liena: { ent: liena, stand: V(5.6, 8.2) }, orben: { ent: orben, stand: V(-6.5, 8.6) }, rina: { ent: merchantEnt, stand: V(-12.3, -10.9) } };   // rina: 좌판 충돌 반경 바로 바깥
  const guards = [];
  for (const [x, z, yaw] of [[-5.5, -41, 0], [5.5, -41, 0], [-4, -53, 3.14], [4, -53, 3.14]]) { const g2 = spawn('npc', 'hero', V(x, z), { lod: true, name: '성채 경비병', yaw, tint: 0xd8b0a0, level: 50, hp: 9999 }); if (g2) { g2.title = '벨로스 수비대'; guards.push(g2); } }

  // ---------------- 봇 유저 ----------------
  const bots = []; const CLASSES = [['hero', 0xffffff, 'melee'], ['hero', 0xffd6c8, 'melee'], ['hero', 0xc8d8ff, 'melee'], ['mage', 0xffffff, 'magic'], ['elf_archer', 0xffffff, 'arrow']];
  const nameList = (names && names.BOT_NAMES) ? names.BOT_NAMES.slice().sort(() => Math.random() - 0.5) : Array.from({ length: 80 }, (_, i) => '모험가' + (i + 1));
  function addBot(role, pos) {
    const c = pick(CLASSES); const guild = Math.random() < 0.82 ? (Math.random() < 0.35 ? 0 : (1 + Math.random() * 5 | 0)) : null;
    const b = spawn('bot', c[0], pos, { lod: true, tint: c[1], name: nameList[bots.length % nameList.length], guild, level: 10 + (Math.random() * 28 | 0), hp: 1200, atk: 50, speed: rand(5.2, 6.2), yaw: rand(0, 6) });
    if (!b) return null; b.role = role; b.cls = c[2]; b.range = c[2] === 'melee' ? 2.3 : rand(9, 13); b.wait = rand(0, 4); b.homeRole = role; bots.push(b); return b;
  }
  for (let i = 0; i < 16; i++) { const a = rand(0, 6.28), r = rand(5, 34); addBot('town', V(Math.sin(a) * r, Math.cos(a) * r)); }
  for (let i = 0; i < 4; i++) { const a = rand(0, 6.28), r = rand(6, 40); addBot('hunt', V(Math.sin(a) * r, -128 + Math.cos(a) * r)); }
  for (let i = 0; i < 2; i++) { const a = rand(0, 6.28), r = rand(6, 26); addBot('hunt', V(-112 + Math.sin(a) * r, -150 + Math.cos(a) * r)); }
  const townSpots = [[-13, -10], [-8, -17], [11, 12], [16, 7], [17, -4], [3, 5], [-4, 6], [0, -24], [-18, 4], [8, 22], [-9, 20], [22, 12], [-22, -14], [4, -12], [-3, -34], [14, -22]];
  // ---------------- 두뇌 서버(DGX Spark) 연결 ----------------
  // 봇의 판단(어디로 갈지·누구를 칠지·무슨 말을 할지)은 두뇌 서버가 내려 준다. 연결이 없거나 끊기면 updBot 의 내장 AI 가 그대로 돈다.
  const isMine = (m) => !G.demo && (m === P.target || m.target === P || dist2(m.pos, P.pos) < 16);   // 주인공의 사냥감(내장 AI 의 mine 과 같은 기준)
  const q2 = (v) => Math.round(v * 100) / 100;
  function brainSnapshot() {   // 규약 v1 요청 본문에서 v·sid·events 를 뺀 것(그 셋은 brain.js 가 채운다)
    const mons = [];
    for (const m of G.ents) { if (m.kind !== 'monster' || m.gone) continue; if (mons.length >= 80) break;
      mons.push({ id: m.id, tag: m.tag, x: q2(m.pos.x), z: q2(m.pos.z), hp: Math.max(0, Math.round(m.hp)), hpMax: m.hpMax, dead: !!m.dead, target: m.target ? m.target.id : null, mine: !m.dead && isMine(m), elite: !!m.elite }); }
    const B = G.boss && !G.boss.dead ? G.boss : null;
    return { t: G.time,
      player: { name: P.name, level: P.level, x: q2(P.pos.x), z: q2(P.pos.z), hp: Math.max(0, Math.round(P.hp)), hpMax: P.hpMax, dead: !!P.dead, zone: world.zoneAt(P.pos.x, P.pos.z).id, target: P.target ? P.target.id : null, guild: GUILDS[0] },
      bots: bots.map((b) => ({ id: b.id, name: b.name, guild: b.guild === null ? null : GUILDS[b.guild], cls: b.cls, level: b.level, x: q2(b.pos.x), z: q2(b.pos.z), hp: Math.max(0, Math.round(b.hp)), hpMax: b.hpMax, dead: !!b.dead, range: q2(b.range), speed: q2(b.speed) })),
      mons,
      boss: B ? { id: B.id, x: q2(B.pos.x), z: q2(B.pos.z), hp: Math.round(B.hp), hpMax: B.hpMax, phase: B.phase, tele: (G.raid ? G.raid.tele : []).map((t) => ({ x: q2(t.pos.x), z: q2(t.pos.z), r: t.radius, t: q2(Math.max(0, t.t)) })) } : null,
      raid: { active: !!(G.raid && G.raid.active), done: !!(G.raid && G.raid.done) } };
  }
  let brainShown = 'off';
  const brainSel = resolveBrain(typeof location !== 'undefined' ? location : null, (() => { try { return window.localStorage; } catch (e) { return null; } })());   // ?brain=주소 → 저장값 → 같은 출처
  const brain = createBrain({ url: brainSel.urls, maxProbes: brainSel.explicit ? 0 : 3, getSnapshot: brainSnapshot,
    onChat: (m) => { hud.chat.add({ channel: m.channel, name: m.name, guild: m.guild, text: m.text });
      const b = m.id === null ? null : bots.find((x) => x.id === m.id); if (b && m.channel === 'local' && dist2(b.pos, P.pos) < 45) hud.bubble(b.id, m.text, 3500); },
    onStatus: (s) => { if (s.state === brainShown) return; const was = brainShown; brainShown = s.state;   // LLM 정보만 바뀐 알림은 넘긴다
      if (s.state === 'on') hud.chat.add({ channel: 'system', text: '두뇌 서버에 연결했습니다. 모험가들의 판단을 DGX Spark 가 맡습니다.' });
      else if (s.state === 'lost' && was === 'on') hud.chat.add({ channel: 'system', text: '두뇌 서버와 연결이 끊겼습니다. 모험가들이 스스로 판단합니다.' }); } });
  brain.start();
  // 두뇌 서버의 명령을 그대로 수행한다(규약 v1 "클라이언트 수행 규칙"): attack+target → 접근해 사거리 안에서 공격 / 아니면 move 로 이동 / 없으면 제자리.
  function runBrainCmd(b, c, dt) {
    b.avoid = null; b.moveTo = null;   // 내장 AI 가 남긴 이동 목표는 버린다
    // 연결이 끊겨 내장 AI 로 돌아가도 어색하지 않게, 내장 역할(role)을 지금 있는 곳에 맞춰 둔다. 보스 곁의 봇은 'raid'(장판 피해·유성 대상 판정이 role 을 본다)
    if (G.raid && G.raid.active && G.boss && !G.boss.dead && b.role !== 'raid' && dist2(b.pos, G.boss.pos) < 60) { b.homeRole = inTown(b.pos) ? 'town' : 'hunt'; b.role = 'raid'; if (b.slot === undefined) b.slot = rand(0, 6.28); }
    else if (b.role === 'town' || b.role === 'hunt' || b.role === 'travel') b.role = inTown(b.pos) ? 'town' : 'hunt';
    if (c.act === 'attack' && c.target !== null) {
      const tg = b.target && b.target.id === c.target ? b.target : G.ents.find((e) => e.id === c.target);
      // 서버 정보가 0.2초 늦을 수 있으니 주인공 사냥감은 여기서도 한 번 더 거른다. 단, 돕기(assist_player)는 주인공의 대상을 같이 치는 것이 목적이므로 거르지 않는다(통합 시험에서 고침: 거르면 돕는 봇이 옆에 서 있기만 한다)
      if (tg && !tg.dead && !tg.gone && (tg.kind === 'boss' || (tg.kind === 'monster' && (c.goal === 'assist_player' || !isMine(tg))))) {
        b.target = tg; if (tg.kind === 'monster' && !tg.target) tg.target = b;
        const save = b.range; if (tg.kind === 'boss') b.range = save + 4.2; botAttack(b, tg, dt); b.range = save; return;   // 보스는 덩치만큼 더 닿는다(주인공과 같은 규칙)
      }
    }
    b.target = null; if (b.state === 'attack') b.state = 'idle';   // 공격 명령이 아니면 휘두르던 동작을 끊고 움직인다(장판 피하기가 늦지 않게)
    if (c.move) { sp2.set(c.move[0], 0, c.move[1]);
      if (stepTo(b, sp2, dt, b.speed * PACE_MUL[c.pace], c.stop)) b.ch.play('idle'); else b.ch.play(c.pace === 'walk' && b.ch.has('walk') ? 'walk' : 'run'); }
    else b.ch.play('idle');
    if (c.goal === 'rest' && b.hp < b.hpMax) b.hp = Math.min(b.hpMax, b.hp + b.hpMax * 0.03 * dt);   // 쉬는 봇은 전투 밖에서 초당 3% 회복(두뇌 서버의 rest 목표)
  }
  function botAttack(b, tg, dt) {
    const dd = dist2(tg.pos, b.pos);
    if (b.state === 'attack') { b.t += dt; face(b, tg.pos, dt, 8); if (!b.hitDone && b.t >= b.hitAt) { b.hitDone = true; const dmg = Math.round(b.atk * rand(0.8, 1.3) * (tg.kind === 'boss' ? (G.demo ? 5 : 1.5) : 1)); if (b.cls !== 'melee') { sp.copy(b.pos); sp.y += 1.3; sp2.copy(tg.pos); sp2.y += tg.height * 0.5; try { vfx.projectile(sp.clone(), sp2.clone(), { kind: b.cls === 'magic' ? 'magic' : 'arrow', speed: 34, color: b.cls === 'magic' ? 0x7ab8ff : 0xfff0c0, onHit: () => damage(tg, dmg, b, false) }); } catch (e) { damage(tg, dmg, b, false); } if (dist2(b.pos, P.pos) < 22) S(b.cls === 'magic' ? 'magic_cast' : 'arrow_shot', { pos: b.pos, volume: 0.35 }); } else { damage(tg, dmg, b, false); if (dist2(b.pos, P.pos) < 16) S('sword_swing2', { pos: b.pos, volume: 0.3 }); } } if (b.t >= b.atkDur) { b.state = 'idle'; b.cool = rand(0.15, 0.6); } return; }
    b.cool = (b.cool || 0) - dt;
    if (dd > b.range) { stepTo(b, tg.pos, dt, b.speed, b.range * 0.85, true); b.ch.play('run'); }
    else if (b.cool <= 0) { const c = b.tag === 'hero' ? pick(['attack1', 'attack2', 'attack3']) : (Math.random() < 0.75 ? 'attack1' : (b.ch.has('skill1') && tg.kind === 'boss' ? 'skill1' : 'attack2')); b.atkDur = b.ch.play(c, { loop: false, restart: true, fade: 0.08 }); b.hitAt = b.ch.event(c, 'hit') ?? b.ch.event(c, 'cast') ?? b.ch.event(c, 'shoot') ?? b.atkDur * 0.5; b.hitDone = false; b.t = 0; b.state = 'attack'; }
    else { face(b, tg.pos, dt); b.ch.play('idle'); }
  }
  function updBot(b, dt) {
    if (b.dead) { b.t += dt; if (b.t > 6) { b.dead = false; b.hp = b.hpMax; b.ch.play('idle', { restart: true }); b.state = 'idle'; try { vfx.buff(b.ch.root, { color: 0xfff0a0, duration: 1.2 }); } catch (e) { } } return; }
    if (b.hp <= 0) { b.dead = true; b.t = 0; b.ch.play('death', { loop: false }); b.state = 'dead'; brain.pushEvent({ type: 'bot_dead', id: b.id }); return; }
    const bc = G.demo ? null : brain.command(b.id);   // 녹화용 자동 모드는 각본대로(내장 AI) 둔다
    if (bc) { runBrainCmd(b, bc, dt); return; }
    if (b.role === 'raid' && G.boss && !G.boss.dead) {
      if (b.avoid) { if (stepTo(b, b.avoid, dt, b.speed * 1.25, 0.4)) b.avoid = null; b.ch.play('run'); b.state = 'idle'; return; }
      // 보스 주위에 둘러서도록 자리 잡기
      const bp = G.boss.pos; const ang = b.slot; const rad = b.cls === 'melee' ? 4.6 : b.range;
      const want = sp2.set(bp.x + Math.sin(ang) * rad, 0, bp.z + Math.cos(ang) * rad);
      if (b.state !== 'attack' && dist2(want, b.pos) > 2.2) { stepTo(b, want, dt, b.speed, 0.6); b.ch.play('run'); return; }
      const save = b.range; b.range = 99; botAttack(b, G.boss, dt); b.range = save; return;
    }
    if (b.role === 'travel') { if (stepTo(b, b.dest, dt, b.speed * 1.1, 1.2)) { b.role = b.nextRole; } b.ch.play('run'); return; }
    if (b.role === 'hunt') {
      let tg = b.target; const mine = (m) => !G.demo && (m === P.target || m.target === P || dist2(m.pos, P.pos) < 16);   // 내 사냥감·내 주변 몬스터는 봇이 건드리지 않는다
      if (tg && !tg.dead && mine(tg)) { if (tg.target === b) tg.target = null; tg = b.target = null; }
      if (!tg || tg.dead) { tg = b.target = null; let best = 1e9; for (const m of G.ents) if (m.kind === 'monster' && !m.dead && !mine(m)) { const d = dist2(m.pos, b.pos); if (d < best && d < 30) { best = d; tg = m; } } b.target = tg; }
      if (tg) { if (!tg.target) tg.target = b; botAttack(b, tg, dt); } else { b.ch.play('idle'); }
      return;
    }
    // 마을: 어슬렁
    b.wait -= dt;
    if (b.moveTo) { if (stepTo(b, b.moveTo, dt, b.walk ? 1.6 : b.speed * 0.8, 0.4)) { b.moveTo = null; b.wait = rand(3, 14); } b.ch.play(b.walk && b.ch.has('walk') ? 'walk' : 'run'); }
    else { b.ch.play('idle'); if (b.wait <= 0) { const s = pick(townSpots); b.moveTo = V(s[0] + rand(-2, 2), s[1] + rand(-2, 2)); b.walk = Math.random() < 0.6; } }
  }

  // ---------------- 주인공 입력·행동 ----------------
  const keys = {}; let clickMove = null;
  function nearestMonster(from, maxD, pred) { let best = null, bd = maxD; for (const m of G.ents) { if ((m.kind !== 'monster' && m.kind !== 'boss') || m.dead) continue; if (pred && !pred(m)) continue; const d = dist2(m.pos, from) - (m.kind === 'boss' ? 4 : 0); if (d < bd) { bd = d; best = m; } } return best; }
  function setTarget(m) { if (m && P.shownTarget !== m.id) { hud.setTarget(null); P.shownTarget = m.id; } P.target = m; if (m) hud.setTarget({ debuffs: skOn() ? SK.debuffs(m) : undefined, name: m.name, level: m.level, hp: Math.max(0, Math.round(m.hp)), hpMax: m.hpMax, kind: m.kind === 'boss' || m.elite ? 'elite' : m.plateKind || 'monster', portrait: m.kind === 'boss' ? 'ui/portrait_demon.jpg' : (m.mdef || MON[m.tag] || {}).portrait }); else hud.setTarget(null); }
  function startAttack() {
    const c = ['attack1', 'attack2', 'attack3'][P.combo % 3]; P.combo++;
    P.atkDur = P.ch.play(c, { loop: false, restart: true, fade: 0.06, speed: 1.12 }); P.hitAt = (P.ch.event(c, 'hit') ?? 0.3) / 1.12; P.atkDur *= 0.86; P.hitDone = false; P.t = 0; P.state = 'attack'; P.atkClip = c;
    setTrail(true); S(Math.random() < 0.5 ? 'sword_swing1' : 'sword_swing2', { volume: 0.7 });
  }
  function castSkill(id, quiet) {
    if (skOn()) return SK.cast(id, { quiet });   // 직접 플레이: 기술 12종 + 전문화(skills.js). 아래는 자동 모드의 예전 기술 4개
    const s = SKILLS.find(x => x.id === id); if (!s || P.dead || G.talk) return false; if (!unlocked(s)) { if (!quiet) hud.toast(`[${s.name}]은 Lv.${s.lv}에 익힙니다.`, 'info'); return false; }
    if (P.state === 'skill' || (P.cds[id] || 0) > 0 || P.mp < s.mp) return false;
    if (id === 'recall') { if (G.raid && G.raid.active) return false; P.cds[id] = s.cd; P.mp -= s.mp; teleport(POI.plaza); return true; }
    if (id === 'slam') { const tg = P.target && !P.target.dead ? P.target : nearestMonster(P.pos, 14); if (!tg) return false; P.slamTo = tg; face(P, tg.pos, 1, 100); }
    SAGA.event('skill', { id, combat: !!((P.target && !P.target.dead) || nearestMonster(P.pos, 12)) });   // 이야기 엔진에 알린다(스킬 모듈이 붙으면 그쪽이 api.saga.event 로 알린다)
    P.cds[id] = s.cd; P.mp -= s.mp; P.state = 'skill'; P.skill = id; P.t = 0; P.fx = 0; P.atkDur = P.ch.play(s.clip, { loop: false, restart: true, fade: 0.06 }); setTrail(id !== 'roar');
    S(id === 'spin' ? 'skill_spin' : id === 'roar' ? 'skill_buff' : 'sword_swing1'); refreshPlayerUI(); return true;
  }
  function teleport(to) { try { vfx.teleport(P.pos.clone(), { out: true }); } catch (e) { } S('teleport'); P.pos.copy(to); world.resolve(P.pos, P.r); P.target = null; hud.setTarget(null); P.moveTo = null; clickMove = null; engine.snapCamera(); try { vfx.teleport(P.pos.clone(), { out: false }); } catch (e) { } engine.flash(0xbfe0ff, 0.5); const zz = world.zoneAt(P.pos.x, P.pos.z); engine.setMood(MOODS[zz.id] || MOODS.wild, 1); }
  function near(pos, r) { const out = []; for (const m of G.ents) if ((m.kind === 'monster' || m.kind === 'boss') && !m.dead && dist2(m.pos, pos) < r + (m.kind === 'boss' ? 3.5 : 0)) out.push(m); return out; }
  function updPlayer(dt) {
    for (const k in P.cds) if (P.cds[k] > 0) P.cds[k] -= dt;
    P.mp = Math.min(P.mpMax, P.mp + dt * 4); if (!P.dead && G.time - (P.lastHurt || 0) > 4) P.hp = Math.min(P.hpMax, P.hp + dt * 6);
    if (P.buffT > 0) P.buffT -= dt;
    if (P.dead) return;
    P.potT = (P.potT || 0) - dt; if ((G.auto || SYS.potAlways()) && SYS.potOn() && P.hp < P.hpMax * SYS.potAt() && P.potions.hp > 0 && P.potT <= 0) { usePotion('hp'); P.potT = 1.2; }   // 자동 물약: 공격 동작 중에도 마신다. 직접 플레이는 설정이 켜져 있으면 손으로 조작할 때도 마신다(potAlways)
    if (P.busy > 0) { P.busy -= dt; return; }
    if (P.state === 'attack') {
      P.t += dt; const tg = P.target; if (tg && !tg.dead) face(P, tg.pos, dt, 14);
      if (!P.hitDone && P.t >= P.hitAt) { P.hitDone = true; const fwd = sp.set(P.pos.x + Math.sin(P.yaw) * 1.6, 1.1, P.pos.z + Math.cos(P.yaw) * 1.6); try { vfx.slash(fwd, P.yaw, { kind: P.atkClip === 'attack1' ? 'arc1' : P.atkClip === 'attack2' ? 'arc2' : 'smash', color: P.plus >= 7 ? 0xb070ff : 0x6fb8ff, scale: 0.95 }); } catch (e) { }
        const hits = near(fwd, P.atkClip === 'attack3' ? 2.6 : 2.2); if (tg && !tg.dead && !hits.includes(tg) && dist2(tg.pos, P.pos) < 3.6 + (tg.kind === 'boss' ? 4 : 0)) hits.push(tg);
        strike(hits, P.atkClip === 'attack3' ? 1.5 : 1.0, { kind: 'arc1', shake: P.atkClip === 'attack3' ? 0.3 : 0.14, stop: P.atkClip === 'attack3' ? 0.09 : 0.05 }); if (P.atkClip === 'attack3') { try { vfx.shockwave(fwd.clone().setY(0.05), 2.4, { color: 0xffe0a0, duration: 0.4 }); } catch (e) { } } }
      if (P.t >= P.atkDur) { P.state = 'idle'; setTrail(false); } return;
    }
    if (P.state === 'skill' && skOn()) { SK.tick(dt); return; }
    if (P.state === 'skill') {
      P.t += dt; const id = P.skill;
      if (id === 'spin') { if (P.fx === 0 && P.t > 0.28) { P.fx = 1; try { vfx.slash(P.pos.clone().setY(1.1), P.yaw, { kind: 'spin', color: 0x9fd8ff, scale: 1.7 }); } catch (e) { } strike(near(P.pos, 4.6), 1.5, { shake: 0.3, stop: 0.06 }); } if (P.fx === 1 && P.t > 0.5) { P.fx = 2; strike(near(P.pos, 4.6), 1.7, { shake: 0.35, stop: 0.07 }); try { vfx.shockwave(P.pos.clone().setY(0.05), 5, { color: 0x9fd8ff, duration: 0.5 }); } catch (e) { } } }
      if (id === 'slam') { const tg = P.slamTo; if (P.t > 0.28 && P.t < 0.62 && tg) { const d = dist2(tg.pos, P.pos); if (d > 2.2 + (tg.kind === 'boss' ? 4 : 0)) { const s = Math.min(d, 26 * dt); P.pos.x += (tg.pos.x - P.pos.x) / d * s; P.pos.z += (tg.pos.z - P.pos.z) / d * s; } }
        if (P.fx === 0 && P.t > 0.64) { P.fx = 1; const c = sp.set(P.pos.x + Math.sin(P.yaw) * 1.8, 0.05, P.pos.z + Math.cos(P.yaw) * 1.8).clone(); try { vfx.slash(c.clone().setY(1), P.yaw, { kind: 'smash', color: 0xffd28a, scale: 1.8 }); vfx.shockwave(c, 6, { color: 0xffb060, duration: 0.6 }); vfx.groundDecal(c, { kind: 'crack', radius: 3.4, duration: 5, color: 0xff8030 }); } catch (e) { } strike(near(c, 5.2), 3.2, { shake: 0.7, stop: 0.12 }); S('skill_slam'); engine.flash(0xffe0b0, 0.25); } }
      if (id === 'roar' && P.fx === 0 && P.t > 0.3) { P.fx = 1; P.buffT = 15; try { vfx.buff(P.ch.root, { color: 0xffc040, duration: 15 }); vfx.shockwave(P.pos.clone().setY(0.05), 6, { color: 0xffd060, duration: 0.7 }); } catch (e) { } hud.setBuffs([{ id: 'roar', icon: 6, name: '사자의 포효', remain: 15, total: 15 }]); engine.shake(0.3, 0.4); refreshPlayerUI(); }
      if (P.t >= P.atkDur) { P.state = 'idle'; setTrail(false); } return;
    }
    // 이동 입력
    let mx = 0, mz = 0; if (keys.KeyW || keys.ArrowUp) { mx -= 1; mz -= 1; } if (keys.KeyS || keys.ArrowDown) { mx += 1; mz += 1; } if (keys.KeyA || keys.ArrowLeft) { mx -= 1; mz += 1; } if (keys.KeyD || keys.ArrowRight) { mx += 1; mz -= 1; }
    if (mx || mz) { clickMove = null; P.moveTo = null; if (G.auto && !G.demo) { /* 수동 조작 시 자동 유지 */ } const l = Math.hypot(mx, mz); sp.set(P.pos.x + mx / l * 3, 0, P.pos.z + mz / l * 3); stepTo(P, sp, dt, P.speed, 0); P.ch.play('run'); P.state = 'move'; return; }
    const tg = P.target && !P.target.dead ? P.target : null;
    if (G.auto) autoHunt(dt);
    if (P.state === 'skill' && skOn()) return;   // 자동사냥이 방금 기술을 썼다 — 같은 프레임에 이동·기본 공격으로 덮어쓰지 않는다
    const t2 = P.target && !P.target.dead ? P.target : null;
    if (t2 && (G.auto || P.chase)) { const reach = 2.3 + (t2.kind === 'boss' ? 4.2 : 0); if (dist2(t2.pos, P.pos) > reach) { stepTo(P, t2.pos, dt, P.speed, reach * 0.85, true); P.ch.play('run'); P.state = 'move'; } else { startAttack(); } return; }
    const mv = P.moveTo || clickMove;
    if (mv) { if (stepTo(P, mv, dt, P.speed, 0.25)) { P.moveTo = null; clickMove = null; } P.ch.play('run'); P.state = 'move'; if ((P.stepT = (P.stepT || 0) - dt) <= 0) { P.stepT = 0.3; S('footstep', { volume: 0.25 }); } return; }
    P.ch.play('idle'); P.state = 'idle';
  }
  function autoHunt(dt) {
    if (P.mp < 60 && P.potions.mp > 0) usePotion('mp');
    let tg = P.target && !P.target.dead ? P.target : null;
    const foe = SYS.threat(); if (foe && !(tg && tg.raider)) { tg = foe; setTarget(foe); }   // 나를 공격 중인 습격자는 의뢰 대상보다 먼저 친다(자동 모드에서는 언제나 null)
    if (tg && tg.kind === 'monster') { if (P.huntTg !== tg || tg.hp !== P.huntHp) { P.huntTg = tg; P.huntHp = tg.hp; P.huntT = 0; } else if ((P.huntT += dt) > 6) { tg.skipUntil = G.time + 15; if (tg.target === P) tg.target = null; P.target = null; hud.setTarget(null); tg = null; P.huntTg = null; } }
    const okT = (m) => !(m.skipUntil > G.time);
    if (!tg) { tg = G.boss && !G.boss.dead && dist2(G.boss.pos, P.pos) < 60 ? G.boss : ((qrun && qrun.tag && nearestMonster(P.pos, 38, m => okT(m) && m.tag === qrun.tag && dist2(m.pos, P.huntAnchor) < 60)) || nearestMonster(P.pos, qrun && qrun.tag ? 7 : 38, m => okT(m) && dist2(m.pos, P.huntAnchor) < 60)); if (tg) setTarget(tg); else if (dist2(P.pos, P.huntAnchor) > 6) P.moveTo = (!G.demo && inTown(P.pos) && Math.abs(P.pos.x) < 5.5 && P.pos.z > -3 && P.pos.z < 30 && P.huntAnchor.z < -6) ? sp2.set(7, 0, P.pos.z - 2).clone() : P.huntAnchor; }
    if (!tg) return;
    const d = dist2(tg.pos, P.pos) - (tg.kind === 'boss' ? 4 : 0);
    if (skOn()) { SK.rotation(tg, d, near(P.pos, 4.6).length); return; }   // 직접 플레이: 우선순위 순환(skills.js 의 chooseSkill)
    if (P.buffT <= 0 && d < 12 && castSkill('roar', true)) return;
    if (d < 9 && d > 3 && castSkill('slam', true)) return;
    if (d < 3.4 && (near(P.pos, 4.6).length >= 2 || tg.kind === 'boss') && castSkill('spin', true)) return;
  }

  // ---------------- 강화 ----------------
  // target: 'weapon'(기본) 또는 장비 uid. 방어구 쪽 처리는 SYS.enhState / SYS.enhArmor (무기 경로는 아래 그대로)
  const enh = { busy: false, log: [], target: 'weapon',
    state() { if (this.target !== 'weapon') { const st = !G.demo && SYS.enhState(this); if (st) return st; this.target = 'weapon'; }
      const st = { item: { icon: 0, name: P.weaponName, plus: P.plus, rarity: P.plus >= 7 ? 'legend' : P.plus >= 5 ? 'epic' : 'rare' }, scrolls: P.scrolls, blessed: 0, rate: RATES[Math.min(P.plus, RATES.length - 1)], nextPlus: P.plus + 1, safe: P.plus < 3, log: this.log.slice(-6), kind: 'weapon', scrollName: '무기 강화 주문서' };
      if (!G.demo) { st.item.rarity = SYS.weaponRarity(); Object.assign(st, SYS.enhRisk(P.plus, G.story || P.weaponName === '낡은 장검' ? 'reset' : 'gone')); }   // 직접 플레이: 가방·장비 창과 같은 등급, 실제 규칙과 같은 위험 문구(자동 모드는 이전 화면 그대로)
      return st; },
    open(target) { if (!this.busy) this.target = !G.demo && target && target !== 'weapon' && SYS.findItem(target) ? target : 'weapon';   // 브롬·메뉴로 열면(인자 없음) 대상은 무기로 돌아간다
      win.open('enhance'); win.enhance.set(this.state()); if (smith) smith.ch.play(smith.ch.has('talk') ? 'talk' : 'idle'); },
    async run(forced) {
      if (!G.demo && this.target !== 'weapon') return SYS.enhArmor(this, forced);   // 방어구·장신구
      if (this.busy || P.scrolls <= 0) return null; this.busy = true; P.scrolls--;
      const from = P.plus; const rate = RATES[Math.min(from, RATES.length - 1)];
      const ok = forced !== undefined ? forced === 'success' : Math.random() < rate;
      const destroy = forced !== undefined ? forced === 'destroy' : (!ok && from >= 6 && Math.random() < 0.5);
      const res = ok ? 'success' : destroy ? 'destroy' : 'fail';
      if (smith && smith.ch.has('work')) smith.ch.play('work', { restart: true }); S('anvil'); setTimeout(() => S('anvil'), 450); setTimeout(() => S('anvil'), 900);
      const pr = win.enhance.play(res, { from, to: from + 1, name: P.weaponName });
      setTimeout(() => {
        if (ok) { S('enhance_success'); engine.flash(0xfff0b0, 0.45); P.plus++; try { glow && glow.setLevel(P.plus); vfx.buff(P.ch.root, { color: 0xffd060, duration: 2 }); } catch (e) { } if (smith && smith.ch.has('cheer')) smith.ch.play('cheer', { loop: false, restart: true }); }
        else { S('enhance_fail'); engine.flash(0xff2010, 0.5); engine.shake(0.6, 0.6); if (smith && smith.ch.has('sad')) smith.ch.play('sad', { loop: false, restart: true }); if (destroy) { P.plus = 0; if (!G.story) P.weaponName = '낡은 장검'; try { glow && glow.setLevel(0); } catch (e) { } } }
      }, 1250);
      await pr;
      this.log.push(ok ? `+${from} → +${from + 1} 강화 성공!` : destroy ? `+${from} ${'여명의 장검'} 증발…` : `+${from} 강화 실패`);
      if (ok) { hud.chat.add({ channel: 'system', text: `${P.weaponName} +${P.plus} 강화에 성공했습니다!` }); if (P.plus >= 6) { hud.notice(`[은사자] ${P.name} 님이 +${P.plus} ${P.weaponName} 강화에 성공했습니다!`, 'enhance'); chat && chat.event('enhanceSuccess', { name: P.name, item: P.weaponName, plus: P.plus }); } }
      else { hud.chat.add({ channel: 'system', text: destroy ? (G.story ? `강화 실패! +${from} ${P.weaponName}의 강화 수치가 모두 사라졌습니다…` : `강화 실패! +${from} 여명의 장검이 증발했습니다…`) : `강화에 실패했습니다. (+${from} 유지)` }); if (destroy) { hud.notice(`[은사자] ${P.name} 님의 +${from} 여명의 장검이 강화 중 증발했습니다…`, 'enhance'); } chat && chat.event('enhanceFail', { name: P.name, item: '여명의 장검', plus: from }); }
      win.enhance.set(this.state()); refreshPlayerUI(); quest.show(); this.busy = false; G.events.push('enhance:' + res); SAGA.event('enh', { plus: P.plus }); return res;
    } };

  // ---------------- 보스 레이드 ----------------
  /** 발카르를 다시 부를 수 있을 때까지 남은 시간(초). 계정 모드에서 이야기의 레이드 장을 마친 뒤에만 적용된다(체험·자동 모드는 언제나 0) */
  function raidWait() { if (G.demo || !G.story || ST.ch <= RAID_CH || !(P.raidAt > 0)) return 0; return Math.max(0, Math.ceil((P.raidAt + RAID_COOL - Date.now()) / 1000)); }
  const raidWaitText = (sec) => `발카르는 아직 잿더미 속에 잠들어 있습니다. 약 ${Math.max(1, Math.ceil(sec / 60))}분 뒤에 다시 강림합니다.`;
  function startRaid() {
    if (G.raid && G.raid.active) return; const A = POI.altar;
    if (!G.demo && !SAGA.canRaid()) { hud.toast('아직 그믐밤이 오지 않았습니다. 이야기를 먼저 진행하세요.', 'info'); return; }   // 이야기 「그믐밤」(a3c5) 전에는 제단을 열지 않는다
    const wait = raidWait(); if (wait > 0) { hud.toast(raidWaitText(wait), 'info'); return; }   // 계정 모드: 되풀이 토벌로 금화·전설 장비를 쓸어 담지 못하게 한다
    const B = spawn('boss', 'demon_lord', A.clone(), { scale: 2.6, name: '염옥의 군주 발카르', level: 60, hp: G.demo ? 260000 : 95000, atk: 150, speed: 3.2, r: 2.6, range: 7.5, yaw: 0 });
    if (!B) return; B.threat = new Map(); B.phase = 1; B.cool = 3; B.title = '레이드 보스'; G.boss = B; G.raid = { active: true, done: false, t: 0, tele: [] }; brain.pushEvent({ type: 'raid_start' });
    try { vfx.flameBurst(A.clone().setY(1), { scale: 3 }); vfx.shockwave(A.clone().setY(0.6), 14, { color: 0xff5010, duration: 1.2 }); G.raid.amb = vfx.ambient('embers', { center: A.clone(), radius: 30, count: 70 }); } catch (e) { }
    S('boss_roar'); S('raid_horn', { delay: 0.5 }); S('battle_cry', { delay: 1.8, volume: 0.7 }); engine.shake(0.9, 1.2); engine.flash(0xff4010, 0.4); sound && sound.bgm && sound.bgm('bgm_boss', { fade: 1.5 }); sound && sound.ambient && sound.ambient('amb_altar', { fade: 1.5, volume: 0.7 });
    hud.notice('잿불 제단에 염옥의 군주 발카르가 강림했습니다! 문파원들은 집결하십시오!', 'boss'); hud.setBoss({ name: B.name, title: '염옥의 군주', hp: B.hp, hpMax: B.hpMax, phase: 1, phases: 3 });
    chat && chat.event('bossSpawn', { boss: '발카르', zone: '잿불 제단' });
    // 봇 집결
    const RN = G.demo ? 22 : 10; let i = 0; for (const b of bots) { if (i >= RN) break; const a = (i / RN) * Math.PI * 2; b.homeRole = b.role; b.slot = a; b.role = 'raid'; b.target = null; b.state = 'idle'; b.dead = false; b.hp = b.hpMax; b.pos.set(A.x + Math.sin(a + 2.6) * rand(26, 34) * 0.4 + rand(-6, 6), 0, A.z + 30 + rand(0, 10)); b.ch.play('run', { restart: true }); try { if (i % 3 === 0) vfx.teleport(b.pos.clone(), { out: false }); } catch (e) { } i++; }
    quest.show();
  }
  function bossTelegraph(B, pos, radius, delay, dmg, kind) {
    let h = null; try { h = vfx.telegraph(pos.clone().setY(0.62), radius, delay, { color: 0xff3010 }); } catch (e) { }
    G.raid.tele.push({ pos: pos.clone(), radius, t: delay, dmg, kind });
    for (const b of bots) if (b.role === 'raid' && !b.dead && dist2(b.pos, pos) < radius + 1 && Math.random() < 0.78) { const dx = b.pos.x - pos.x, dz = b.pos.z - pos.z, d = Math.hypot(dx, dz) || 1; b.avoid = V(pos.x + dx / d * (radius + 2.5), pos.z + dz / d * (radius + 2.5)); }
  }
  function updBoss(B, dt) {
    const R = G.raid; R.t += dt;
    for (let i = R.tele.length - 1; i >= 0; i--) { const t = R.tele[i]; t.t -= dt; if (t.t <= 0) { R.tele.splice(i, 1);
        try { if (t.kind === 'meteor') { vfx.flameBurst(t.pos.clone().setY(0.8), { scale: t.radius * 0.4 }); } else { vfx.shockwave(t.pos.clone().setY(0.65), t.radius, { color: 0xff6020, duration: 0.5 }); vfx.flameBurst(t.pos.clone().setY(0.8), { scale: 1.2 }); } vfx.groundDecal(t.pos.clone().setY(0.62), { kind: 'scorch', radius: t.radius * 0.6, duration: 2.5 }); } catch (e) { }
        S(t.kind === 'meteor' ? 'fire' : 'boss_slam', { pos: t.pos }); engine.shake(dist2(t.pos, P.pos) < 25 ? 0.7 : 0.25, 0.5);
        if (dist2(P.pos, t.pos) < t.radius) hurtPlayer(t.dmg, B);
        for (const b of bots) if (b.role === 'raid' && !b.dead && dist2(b.pos, t.pos) < t.radius) { b.hp -= t.dmg * 2.2; } } }
    if (B.dead) return;
    hud.setBoss({ name: B.name, title: '염옥의 군주', hp: Math.max(0, Math.round(B.hp)), hpMax: B.hpMax, phase: B.phase, phases: 3 });
    const ph = B.hp < B.hpMax * 0.35 ? 3 : B.hp < B.hpMax * 0.7 ? 2 : 1;
    if (ph !== B.phase) { B.phase = ph; S('boss_roar'); S('raid_horn', { delay: 0.8, volume: 0.7, rate: 0.9 }); S('battle_cry', { delay: 1.6, volume: 0.5 }); engine.shake(0.8, 1); engine.flash(0xff3010, 0.35); hud.notice(ph === 2 ? '발카르가 분노합니다! 화염이 거세집니다!' : '발카르가 광폭해졌습니다! 모두 버텨라!', 'boss'); chat && chat.event('bossPhase', { boss: '발카르', phase: ph }); try { vfx.fireRing(B.pos.clone().setY(0.65), 8, { duration: 1.2 }); } catch (e) { } }
    // 대상: 위협 수치 1위
    let tg = null, best = -1; for (const [id, v] of B.threat) { const e = G.ents.find(x => x.id === id); if (e && !e.dead && v > best) { best = v; tg = e; } } if (!tg) tg = !P.dead && dist2(P.pos, B.pos) < 40 ? P : bots.find(b => b.role === 'raid' && !b.dead);
    if (skOn() && SK.bossTick(B, tg, dt)) return;   // 차단할 수 있는 시전 하나(직접 플레이만). 기존 패턴은 그대로
    if (B.state === 'cast') { B.t += dt; if (tg) face(B, tg.pos, dt, 2.5); if (!B.hitDone && B.t >= B.hitAt) { B.hitDone = true; B.onHit && B.onHit(); } if (B.t >= B.atkDur) { B.state = 'idle'; B.cool = rand(1.0, 2.0) / (ph === 3 ? 1.6 : 1); } return; }
    if (!tg) { B.ch.play('idle'); return; }
    B.cool -= dt; const d = dist2(tg.pos, B.pos);
    if (d > B.range) { stepTo(B, tg.pos, dt, B.speed, B.range * 0.8); B.ch.play('walk'); if ((B.stepT = (B.stepT || 0) - dt) <= 0) { B.stepT = 0.66; S('boss_step', { pos: B.pos, volume: 0.75 }); } return; }
    face(B, tg.pos, dt, 3);
    if (B.cool > 0) { B.ch.play('idle'); return; }
    const roll = Math.random(); let c;
    if (roll < 0.22 && B.ch.has('skill2')) { c = 'skill2'; B.onHit = () => { S('boss_roar'); const n = ph === 1 ? 4 : ph === 2 ? 6 : 8; for (let i = 0; i < n; i++) { const q = i === 0 && !P.dead ? P.pos : pick(bots.filter(b => b.role === 'raid')).pos; const pos = V(q.x + rand(-4, 4), q.z + rand(-4, 4)); setTimeout(() => { if (!G.raid || !G.raid.active) return; try { vfx.meteor(pos.clone().setY(0.62), { delay: 1.3, radius: 2.6 }); } catch (e) { } S('meteor_fall', { pos, volume: 0.8 }); bossTelegraph(B, pos, 2.8, 1.3, 240, 'meteor'); }, i * 160); } }; }
    else if (roll < 0.5 && B.ch.has('skill1')) { c = 'skill1'; const pos = V(B.pos.x + Math.sin(B.yaw) * 6, B.pos.z + Math.cos(B.yaw) * 6); const dur = B.ch.dur('skill1'); const at = B.ch.event('skill1', 'hit') ?? dur * 0.6; bossTelegraph(B, pos, ph === 3 ? 9.5 : 8, at, 420, 'slam'); B.onHit = () => { }; }
    else { c = Math.random() < 0.5 ? 'attack1' : 'attack2'; const pos = V(B.pos.x + Math.sin(B.yaw) * 5.5, B.pos.z + Math.cos(B.yaw) * 5.5); const at = B.ch.event(c, 'hit') ?? 0.5; bossTelegraph(B, pos, 4.8, at, 260, 'slam'); B.onHit = () => { try { vfx.slash(pos.clone().setY(3), B.yaw, { kind: c === 'attack1' ? 'smash' : 'arc2', color: 0xff6a20, scale: 2.6 }); } catch (e) { } }; }
    if (c !== 'skill2') S('boss_swing', { pos: B.pos, rate: c === 'skill1' ? 0.55 : 0.8, delay: c === 'skill1' ? 0.35 : 0.15 });
    B.atkDur = B.ch.play(c, { loop: false, restart: true, fade: 0.15 }); B.hitAt = B.ch.event(c, 'hit') ?? B.ch.event(c, 'cast') ?? B.atkDur * 0.5; B.hitDone = false; B.t = 0; B.state = 'cast';
  }
  function bossDead(B) {
    const R = G.raid; R.active = false; R.done = true; brain.pushEvent({ type: 'raid_done' }); if (!G.demo && G.story) P.raidAt = Date.now();   // 계정 모드: 재입장 제한의 기준 시각(저장된다)
    hud.setBoss(null); G.timeScale = 0.25; setTimeout(() => { G.timeScale = 1; }, 1600);
    engine.flash(0xffffff, 0.7); engine.shake(1.2, 1.6); S('boss_death'); S('boss_slam', { delay: 0.9 }); S('raid_victory', { delay: 1.6 }); S('cheer', { delay: 2.6, volume: 0.9 }); S('battle_cry', { delay: 3.0, volume: 0.45 });
    for (let i = 0; i < 9; i++) setTimeout(() => { const p = V(B.pos.x + rand(-7, 7), B.pos.z + rand(-7, 7)); try { vfx.flameBurst(p.clone().setY(rand(1, 6)), { scale: rand(2, 4) }); vfx.lootBeam(p, { color: pick([0xffb23e, 0xb36bff, 0x4aa3ff]), duration: 7 }); } catch (e) { } }, i * 180);
    try { R.amb && R.amb.dispose(); } catch (e) { }
    hud.notice('염옥의 군주 발카르 토벌 성공! 은사자 문파가 에르하임을 지켜냈습니다!', 'boss'); chat && chat.event('bossDead', { boss: '발카르' });
    const rank = [...B.threat.entries()].map(([id, v]) => { const e = G.ents.find(x => x.id === id); return e ? { name: e.name, guild: e.guild !== null ? GUILDS[e.guild] : '-', dmg: Math.round(v), mvp: false } : null; }).filter(Boolean).sort((a, b) => b.dmg - a.dmg).slice(0, 8);
    const me = rank.find(r => r.name === P.name); if (me) { rank.splice(rank.indexOf(me), 1); } rank.unshift({ name: P.name, guild: GUILDS[0], dmg: Math.max(me ? me.dmg : 0, (rank[0] ? rank[0].dmg : 0) + 4321), mvp: true });
    setTimeout(() => { const rg = G.story ? 8000 : 250000;   // 계정 모드는 금화 소비처에 맞춰 보상을 줄인다(체험·자동 모드는 그대로)
      // 전리품 줄: 자동 모드는 이전 그대로(연출용 목록). 직접 플레이는 SYS.bossExtra() 가 실제로 넣어 준 주문서를 보여 준다
      win.raidResult.show({ title: '발카르 토벌 성공', rank, loot: [...SYS.onBossDead(B), ...(G.demo ? [{ icon: 0, name: '염옥의 대검 조각', rarity: 'legend' }, { icon: 13, name: '축복받은 강화 주문서 x3', rarity: 'epic' }] : SYS.bossExtra()), { icon: 15, name: '마력 결정 x12', rarity: 'epic' }, { icon: 14, name: G.story ? '금화 x8,000' : '금화 x250,000', rarity: 'common' }] }); P.gold += rg; gainExp(1800); G.events.push('raidDone'); sound && sound.bgm && sound.bgm('bgm_field', { fade: 2 }); }, 3200);
    setTimeout(() => { for (const b of bots) if (b.role === 'raid') { b.role = 'town2'; b.ch.play(b.ch.has('skill1') && b.tag !== 'hero' ? 'idle' : 'skill3', { loop: false, restart: true }); } quest.show(); }, 900);
  }

  // ---------------- 이름표·미니맵·지역 ----------------
  const plates = []; let zoneId = '';
  function syncPlates() {
    plates.length = 0; if (SAGA.cineOn()) return hud.plates.sync(plates);   // 컷신 동안에는 이름표를 띄우지 않는다
    for (const e of G.ents) {
      if (!e.ch.root.visible) continue; const d = dist2(e.pos, P.pos); if (d > (e.kind === 'boss' ? 80 : 34)) continue;
      if (e.kind === 'monster' && e.dead) continue;
      if (e.kind === 'bot' && !SYS.showPlates()) continue;   // 설정: 다른 모험가 이름표 끄기
      const s = screenOf(e, e.height + 0.25); if (s.z > 1 || s.x < -60 || s.x > 1980 || s.y < -40 || s.y > 1100) continue;
      plates.push({ id: e.id, x: s.x, y: s.y, name: e.name, guild: e.guild !== null && e.guild !== undefined ? GUILDS[e.guild] : null, crest: e.guild, level: e.level,
        hp: (e.kind === 'monster' && (e.hp < e.hpMax || P.target === e)) || e === P ? e.hp / e.hpMax : null, kind: e === P ? 'me' : e.plateKind || (e.kind === 'bot' ? 'player' : e.kind), title: e.title || null, dim: d > 24 });   // plateKind: 'enemy'(적대 문파) 등 직접 지정
    }
    hud.plates.sync(plates);
  }
  function drawMinimap() {
    const mm = hud.minimap; if (!mm || !mm.ctx2d) return; const c = mm.ctx2d, sz = mm.size || mm.canvas.width; const sc = 1.15; const k = world.mapScale;
    c.save(); c.clearRect(0, 0, sz, sz); c.translate(sz / 2, sz / 2); c.scale(sc, sc);
    c.drawImage(world.minimapBase, -(P.pos.x + world.HALF) * k, -(P.pos.z + world.HALF) * k);
    for (const e of G.ents) { if (e === P || (e.dead && e.kind !== 'bot')) continue; const dx = (e.pos.x - P.pos.x) * k, dz = (e.pos.z - P.pos.z) * k; if (Math.abs(dx) > sz / 2 / sc || Math.abs(dz) > sz / 2 / sc) continue;
      c.fillStyle = e.kind === 'monster' ? (e.raider ? '#ff58c8' : e.elite ? '#ffb020' : '#ff4a3a') : e.kind === 'boss' ? '#ff9a1a' : e.kind === 'npc' ? '#ffe066' : (e.guild === 0 ? '#6dff8a' : '#7fc4ff'); const r = e.kind === 'boss' ? 5 : e.kind === 'npc' ? 2.6 : e.elite ? 3.4 : e.raider ? 2.6 : 1.9; c.beginPath(); c.arc(dx, dz, r, 0, 7); c.fill(); }
    c.restore(); c.save(); c.translate(sz / 2, sz / 2); c.rotate(-P.yaw + Math.PI); c.fillStyle = '#fff'; c.strokeStyle = '#000'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(0, -7); c.lineTo(5, 6); c.lineTo(0, 3); c.lineTo(-5, 6); c.closePath(); c.fill(); c.stroke(); c.restore();
    mm.setCoords && mm.setCoords(Math.round(P.pos.x + 380), Math.round(P.pos.z + 380));
  }
  var MOODS = { town: { sky: 0xa9c9e8, fogNear: 60, fogFar: 170, sun: 2.6, hemi: 0.85, tint: [1.03, 1.0, 0.95] }, forest: { sky: 0x8fb89a, fogNear: 42, fogFar: 135, sun: 2.5, hemi: 0.8, tint: [0.97, 1.03, 0.95] }, grave: { sky: 0x5c6a80, fogNear: 26, fogFar: 95, sun: 1.3, hemi: 0.6, tint: [0.9, 0.95, 1.08] }, altar: { sky: 0x2a1614, fogNear: 34, fogFar: 120, sun: 1.7, hemi: 0.65, tint: [1.04, 0.96, 0.92] }, wild: { sky: 0x9cc0e0, fogNear: 55, fogFar: 160, sun: 2.9, hemi: 0.9, tint: [1, 1, 1] } };
  function updZone(dt) {
    const z = world.zoneAt(P.pos.x, P.pos.z), cf = SAGA.focus(), zc = cf ? world.zoneAt(cf.x, cf.z) : z;   // cf: 컷신이 먼 곳을 비추는 동안에는 하늘·안개만 그곳에 맞춘다
    engine.setMood(MOODS[zc.id] || MOODS.wild, 1 - Math.exp(-dt * (cf ? 7 : 1.4))); world.night = zc.id === 'altar' || zc.id === 'grave' ? 1 : 0.2;
    if (z.id !== zoneId) { zoneId = z.id; hud.setZone(z.name, z.sub); if (G.time > 1) hud.zoneBanner(z.name, z.sub); if (sound && sound.bgm && !(G.raid && G.raid.active)) { sound.bgm(z.id === 'town' ? 'bgm_town' : z.id === 'altar' ? 'bgm_boss' : 'bgm_field', { fade: 2 }); sound.ambient && sound.ambient(z.id === 'town' ? 'amb_town' : z.id === 'altar' ? 'amb_altar' : z.id === 'grave' ? 'amb_grave' : 'amb_forest', { fade: 2, volume: z.id === 'altar' ? 0.45 : z.id === 'grave' ? 0.7 : 0.5 }); } }
  }


  // ---------------- 의뢰 자동 진행 ----------------
  // 의뢰창에서 의뢰를 누르면: 목적지까지 달려가서 사냥·레이드·강화를 알아서 진행한다. 다시 누르거나 직접 움직이면 멈춘다.
  const QN = { hunt: '숲의 위협', raid: '발카르 토벌전', enh: '여명의 장검 +7 달성' };
  const inTown = (p) => Math.hypot(p.x, p.z) < 46;
  function routeTo(dest) { const r = [], a = inTown(P.pos), b = inTown(dest), mid = new THREE.Vector3(0, 0, -30); if (a && Math.abs(P.pos.x) < 5.5 && P.pos.z > -3 && dest.z < -6) r.push(new THREE.Vector3(7, 0, P.pos.z), new THREE.Vector3(7, 0, -7));   // 분수 남쪽에서 북쪽으로 갈 때는 분수를 돌아간다
    if (a && !b) r.push(mid, POI.gateOut.clone()); else if (!a && b) r.push(POI.gateOut.clone(), mid); r.push(dest.clone()); return r; }
  function questGo(q, dest) { q.phase = 'go'; q.dest = dest.clone(); q.route = routeTo(dest); q.stuckT = 0; q.last = P.pos.clone(); G.auto = false; hud.setAuto(false); P.target = null; hud.setTarget(null); P.chase = false; P.wantNpc = null; clickMove = null; P.moveTo = q.route.shift(); P.speed = 9; }
  function questStop(msg) { if (!qrun) return; if (qrun.id === 'raid') engine.cam.zoomTarget = 14; qrun = null; P.speed = 6.4; if (msg) hud.toast(msg, 'info'); quest.show(); }
  const HUNT = { werewolf: POI.forest, orc_warrior: POI.orcCamp.clone().add(new THREE.Vector3(-3, 0, 3)), skeleton_knight: POI.grave };
  const RAID_CH = CH.findIndex(c => c.obj.type === 'raid');
  const raidSpot = () => new THREE.Vector3(POI.altar.x + 3, 0, POI.altar.z + 24);
  // 의뢰 하나를 "어디로 가서 무엇을 할지"로 바꾼다
  function questPlan(id) {
    if (id === 'story') return null;   // 이야기 의뢰는 questStart 가 이야기 엔진으로 넘긴다(SAGA.questClick)
    if (!QN[id]) return null; const name = QN[id];
    if (id === 'hunt') { if (quest.n.werewolf >= 20 && quest.n.orc_warrior >= 10) return { err: '이미 완료한 의뢰입니다.' }; const tag = quest.n.werewolf < 20 ? 'werewolf' : 'orc_warrior'; return { kind: 'hunt', daily: true, tag, dest: HUNT[tag], name }; }
    if (id === 'raid') { if (G.raid && G.raid.done) return { err: '이미 완료한 의뢰입니다.' }; const wait = raidWait(); if (wait > 0) return { err: raidWaitText(wait) }; return { kind: 'raid', dest: raidSpot(), name }; }
    if (P.plus >= 7) return { err: '이미 완료한 의뢰입니다.' }; if (P.weaponName !== '여명의 장검') return { err: '여명의 장검이 없습니다.' }; if (P.scrolls <= 0) return { err: '강화 주문서가 없습니다. 사냥으로 주문서를 모으세요.' };
    return { kind: 'enh', target: 7, needDawn: true, dest: POI.smithStand, name };
  }
  function questStart(id) {
    if (G.demo || P.dead || SAGA.busy()) return;
    if (id === 'story') return SAGA.questClick();   // [이야기]: 목표에 맞는 자동 진행은 이야기 엔진이 정한다(직접 해야 하는 목표는 창 열기 → 한 번 더 누르면 대신)
    if (qrun && qrun.id === id) { questStop('의뢰 자동 진행을 멈췄습니다.'); if (G.auto) api.setAuto(false); P.moveTo = null; return; }
    const pl = questPlan(id); if (!pl) return; if (pl.err) return hud.toast(pl.err, 'info');
    if (qrun) questStop(); win.close('enhance');
    qrun = { id, t: 0, ...pl }; questGo(qrun, pl.dest);
    hud.toast(`[${pl.name}] 자동 진행 — 목적지로 이동합니다.`, 'info'); quest.show();
  }
  function questArrive(q) {
    P.speed = 6.4; q.phase = 'do';
    if (q.kind === 'saga') return SAGA.arrived(q);   // 이야기 엔진의 계획(시작 대사를 들을 자리 · 상점/강화 창 열기)
    if (q.kind === 'hunt') { api.setAuto(true); P.huntAnchor = q.dest.clone(); }
    else if (q.kind === 'raid') { if (!(G.raid && G.raid.active)) startRaid(); api.setAuto(true); P.huntAnchor = POI.altar.clone(); engine.cam.zoomTarget = 28; }
    else if (q.kind === 'talk') { const id = q.npc; SAGA.autoNext(); questStop(); talkTo(id); }
    else { face(P, smith.pos, 1, 100); enh.open(); q.t = 1.2; }
  }
  function updQuest(dt) {
    const q = qrun; if (!q) return; if (P.dead) return questStop();
    if (q.phase === 'supply') return;   // 보급 귀환 중: 의뢰는 세워 둔다(fieldsys.js 가 돌아와서 'go' 로 되돌린다)
    if (q.phase === 'go') {
      if (!P.moveTo) { if (q.route.length) P.moveTo = q.route.shift(); else questArrive(q); return; }
      q.stuckT += dt; if (q.stuckT > 2.5) { if (dist2(P.pos, q.last) < 2) { P.pos.copy(P.moveTo); world.resolve(P.pos, P.r); } q.last.copy(P.pos); q.stuckT = 0; }   // 지형에 걸리면 다음 지점으로 넘긴다
      return;
    }
    if (q.kind === 'hunt') {
      if (!G.auto) return questStop('의뢰 자동 진행을 멈췄습니다.');
      if (!q.daily) return;   // 이야기 의뢰는 장이 끝날 때 이야기 엔진이 멈춘다
      const max = q.tag === 'werewolf' ? 20 : 10;
      if (quest.n[q.tag] >= max) {
        if (q.tag === 'werewolf' && quest.n.orc_warrior < 10) { q.tag = 'orc_warrior'; questGo(q, POI.orcCamp); hud.toast('늑대인간 처치 완료 — 오크 야영지로 이동합니다.', 'info'); }
        else { S('quest_done'); questStop('의뢰 [숲의 위협] 완료! 자동사냥은 계속합니다.'); }
      }
    } else if (q.kind === 'raid') {
      if (G.raid && G.raid.done) { const st = q.id === 'story'; questStop(st ? null : '의뢰 [발카르 토벌전] 완료!'); if (G.auto) api.setAuto(false); if (st) SAGA.autoNext(); }
      else if (!G.auto) questStop('의뢰 자동 진행을 멈췄습니다.');
    } else if (q.kind === 'enh') {
      if (P.plus >= q.target) { if (q.id === 'story') { SAGA.autoNext(); return questStop(); } S('quest_done'); return questStop(`의뢰 [${q.name}] 완료!`); }
      if (enh.busy) return; q.t -= dt; if (q.t > 0) return;
      if (q.needDawn && P.weaponName !== '여명의 장검') return questStop('검이 증발해 강화 의뢰를 계속할 수 없습니다…');
      if (P.scrolls <= 0) return questStop('강화 주문서가 떨어졌습니다. 사냥으로 주문서를 모으세요.');
      if (enh.target !== 'weapon') { enh.target = 'weapon'; win.enhance.set(enh.state()); }   // 의뢰 강화는 언제나 무기
      enh.run(); q.t = 1.0;
    }
  }

  // ---------------- 이야기(대화·장 진행) ----------------
  // 대본 재생은 이야기 엔진(SAGA, 아래 '이야기 엔진 연결')이 맡는다. 여기에는 인물에게 말 걸기만 남는다.
  function talkTo(id) {
    const n = NPCS[id]; if (!n || G.demo || SAGA.busy()) return; if (n.ent) face(P, n.ent.pos, 1, 100);
    if (SAGA.talk(id)) return;   // 이야기가 받았다(장 시작 대사 · 대화 목표 · 평상시 한마디)
    if (id === 'brom') return enh.open();
    if (id === 'rina') return SYS.openShop();
  }
  // 계정의 캐릭터 불러오기 / 저장할 내용 만들기
  function loadProfile(d) {
    const nn = (v) => Math.max(0, v | 0);   // 손상되거나 손으로 고친 저장의 음수·엉뚱한 값은 0으로
    G.story = true; P.name = d.name || P.name; P.level = Math.max(1, d.level | 0); P.exp = Math.min(0.999, Math.max(0, +d.exp || 0)); P.gold = nn(d.gold); P.plus = Math.min(30, nn(d.plus)); P.weaponName = d.weapon || '낡은 장검';
    P.scrolls = nn(d.scrolls); P.potions = { hp: nn(d.potions && d.potions.hp), mp: nn(d.potions && d.potions.mp) }; P.kills = nn(d.kills); P.title = d.title || null; P.played = Math.max(0, +d.played || 0);
    P.raidAt = Math.min(Date.now(), Math.max(0, +d.raidAt || 0));   // 마지막 발카르 토벌 시각(재입장 제한). 미래 시각은 지금으로 자른다
    SYS.load(d);   // v2: 장비·가방·능력치 포인트·명성·도감(v1 저장이면 기본값)
    recalc(); P.hp = P.hpMax; P.mp = P.mpMax; P.buffT = 0;
    SAGA.load(d.story);   // 이야기 진행(story.v 3). 예전 형식({ ch, n, seen })이면 새 이야기의 서장부터 다시 시작한다(레벨·장비·금화는 위에서 불러온 그대로)
    quest.n = { werewolf: (d.daily && d.daily.werewolf) | 0, orc_warrior: (d.daily && d.daily.orc_warrior) | 0 };
    for (const m of spawnPts) { const v = STORY_MON[m.tag]; if (v) { m.level = v.level; m.hpMax = m.hp = v.hp; m.atk = v.atk; } }
    for (const z of ZONES) if (ZONE_SUB[z.id]) z.sub = ZONE_SUB[z.id];
    try { glow && glow.setLevel(P.plus); } catch (e) { }
    hud.setSkills(skillState()); hud.setPotions(P.potions); refreshPlayerUI(); refreshWindows(); quest.show();
  }
  function snapshot() {
    return SYS.save({ v: 2, name: P.name, level: P.level, exp: P.exp, gold: P.gold, plus: P.plus, weapon: P.weaponName, scrolls: P.scrolls, potions: { hp: P.potions.hp, mp: P.potions.mp }, kills: P.kills,
      story: SAGA.save(), daily: { ...quest.n }, title: P.title || null, played: (P.played || 0) + G.time, raidAt: P.raidAt || 0 });
  }

  // ---------------- 입력 ----------------
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  function onDown(ev) {
    if (G.demo || G.talk || ev.target !== engine.renderer.domElement) return; const rc = engine.renderer.domElement.getBoundingClientRect();
    ndc.set((ev.clientX - rc.left) / rc.width * 2 - 1, -((ev.clientY - rc.top) / rc.height * 2 - 1)); ray.setFromCamera(ndc, engine.camera); const hit = new THREE.Vector3(); if (!ray.ray.intersectPlane(plane, hit)) return;
    if (qrun && qrun.phase === 'go') questStop('의뢰 자동 진행을 멈췄습니다.');
    SYS.userMove();   // 보급 귀환 중이면 멈춘다
    let best = null, bd = 1.6; for (const m of G.ents) { if (m.dead || m === P) continue; const d = dist2(m.pos, hit) - (m.kind === 'boss' ? 4 : 0); if (d < bd) { bd = d; best = m; } }
    if (best && (best.kind === 'monster' || best.kind === 'boss')) { setTarget(best); P.chase = true; clickMove = null; }
    else if (best && Object.values(NPCS).some(v => v.ent === best)) { const id = Object.keys(NPCS).find(k => NPCS[k].ent === best); P.moveTo = NPCS[id].stand.clone(); P.wantNpc = id; clickMove = null; }
    else { clickMove = hit; P.chase = false; P.target = null; hud.setTarget(null); try { vfx.groundDecal(hit.clone().setY(0.05), { kind: 'circle', radius: 0.7, duration: 0.5, color: 0xffe080 }); } catch (e) { } }
  }
  engine.renderer.domElement.addEventListener('pointerdown', onDown);
  addEventListener('keydown', (e) => { if (e.target && e.target.tagName === 'INPUT') return; keys[e.code] = true; if (G.demo) return; if (qrun && qrun.phase === 'go' && /^(Key[WASD]|Arrow)/.test(e.code)) questStop('의뢰 자동 진행을 멈췄습니다.'); if (/^(Key[WASD]|Arrow)/.test(e.code)) SYS.userMove(); if (skOn()) SK.key(e); else { const s = SKILLS.find(x => x.key === e.key); if (s) castSkill(s.id); } if (e.code === 'Space') { const t = P.target && !P.target.dead ? P.target : nearestMonster(P.pos, 8); if (t) { setTarget(t); P.chase = true; } else if (P.state !== 'attack' && P.state !== 'skill') startAttack(); e.preventDefault(); }
    if (e.code === 'KeyR') api.setAuto(!G.auto); if (e.code === 'KeyQ') usePotion('hp'); if (e.code === 'F1' || e.code === 'F2') { usePotion(e.code === 'F1' ? 'hp' : 'mp'); e.preventDefault(); }   // F1·F2: 물약 칸에 적힌 단축키
    if (e.code === 'KeyI') { refreshWindows(); win.toggle('inventory'); } if (e.code === 'KeyC') { refreshWindows(); win.toggle('character'); } if (e.code === 'KeyB') startRaid(); });
  addEventListener('keyup', (e) => { keys[e.code] = false; });
  ui.on('skill', (id) => castSkill(id)); ui.on('attack', () => { const t = P.target && !P.target.dead ? P.target : nearestMonster(P.pos, 8); if (t) { setTarget(t); P.chase = true; } });
  ui.on('toggleAuto', () => api.setAuto(!G.auto)); ui.on('quest', questStart); ui.on('potion', usePotion); ui.on('enhance', () => enhGo());
  // 자동 강화(강화 창의 체크 칸, 직접 플레이만): 증발 위험이 없는 구간(+6 미만)에서는 주문서가 떨어지거나 창을 닫을 때까지 이어서 강화한다. +6부터는 한 번씩 직접 눌러야 한다
  let enhAuto = false, enhChain = false;
  ui.on('enhanceAuto', (on) => { enhAuto = !!on; });
  async function enhGo() {
    if (enhChain) return; let res = await enh.run(), n = 0;
    if (G.demo || !enhAuto || !res) return;
    enhChain = true;
    try {
      while (enhAuto && res && res !== 'destroy' && win.isOpen('enhance') && !P.dead && !G.talk && !(qrun && qrun.kind === 'enh')) {
        const st = enh.state(); if (!st.item || st.scrolls <= 0) break;
        if (st.item.plus >= 6) { if (n > 0) hud.toast('자동 강화를 멈췄습니다. +6부터는 실패하면 잃을 수 있어 직접 눌러야 합니다.', 'info'); break; }
        await new Promise((r) => setTimeout(r, 420));
        if (!enhAuto || !win.isOpen('enhance') || enh.busy) break;
        res = await enh.run(); n++;
      }
    } finally { enhChain = false; }
  }
  ui.on('chat', (t) => hud.chat.add({ channel: 'local', name: P.name, guild: GUILDS[0], text: t }));
  ui.on('chat', (t) => brain.pushEvent({ type: 'chat', text: t }));
  ui.on('revive', () => { win.death.hide(); P.dead = false; P.hp = P.hpMax; P.state = 'idle'; P.ch.play('idle', { restart: true }); teleport(POI.plaza); refreshPlayerUI(); });

  // ---------------- 시스템 연결(장비·능력치·상점·설정·저장) ----------------
  // 실제 로직은 systems.js. 여기서는 필요한 것들을 넘겨 주기만 한다. api 는 아래에서 만들어지므로 함수로 넘긴다.
  SYS = installSystems({ G, P, ST, ui, hud, win, vfx, S, engine, world, sound, scene, POI, MON, RATES, GUILDS, SKILLS, names, chat, bots, spawnPts, enh, smith, NPCS, quest,
    md, expReq, spawn, despawn, damage, kill, hurtPlayer, gainExp, usePotion, atkPower, refreshPlayerUI, nearestMonster, setTarget, teleport, face, stepTo, inTown, routeTo, questStart, questStop,
    getApi: () => api, getQrun: () => qrun, getSk: () => SK });

  // ---------------- 이야기 엔진 연결(v3) ----------------
  // 대본은 saga.js, 재생(컷신·대사·선택지·목표 13종·보상·[이야기] 의뢰 자동 진행)은 sagaengine.js. 여기서는 필요한 내부만 넘긴다.
  // 스킬 모듈이 붙어 있으면(api.sk) 전문화 선택은 그쪽 창을 쓰고, 없으면 엔진의 임시 보기(대화창)를 쓴다.
  SAGA = installSaga({ G, P, ST, ui, hud, win, vfx, S, engine, world, POI, NPCS, SYS, enh, quest, bots, md, expReq, spawn, despawn, gainExp, refreshPlayerUI, setTarget, questGo, questStop, startRaid,
    refreshWindows: () => SYS.refreshWindows(), getQrun: () => qrun, setQrun: (q) => { qrun = q; }, getApi: () => api,
    halt: () => { P.moveTo = null; clickMove = null; P.chase = false; P.wantNpc = null; },
    setWeapon: (name) => { P.weaponName = name; P.plus = 0; try { glow && glow.setLevel(0); } catch (e) { } } });

  // ---------------- 기술 체계 연결(v3) ----------------
  // 실제 로직은 skills.js. emit 은 이야기 엔진으로 가는 사건('skill' { id, combat } · 'spec' { key })이다.
  SK = installSkills({ G, P, ST, ui, hud, win, vfx, S, engine, world, sound, POI, GUILDS, bots, sys: SYS, damage, kill, hurtPlayer, atkPower, refreshPlayerUI, nearestMonster, setTarget, teleport, face, setTrail, dmgNum,
    getApi: () => api, emit: (type, payload) => { const sg = api.saga; if (sg && sg.event) sg.event(type, payload); } });

  // ---------------- 창 데이터 ----------------
  function refreshWindows() { SYS.refreshWindows(); }   // 가방·장비 창에 실제 데이터를 넘긴다(계약: _work/v2/NOTES_logic1.md)
  refreshWindows();

  // ---------------- 메인 루프 ----------------
  let uiT = 0, mmT = 0;
  const api = {
    G, P, ST, POI, bots, smith, enh, loadProfile, snapshot, questStart, talkTo, finishChapter: () => SAGA.skip(1), saga: SAGA, startRaid, castSkill, teleport, setTarget, usePotion, refreshWindows, nearestMonster,
    sk: SK, sys: SYS, NPCS, spawn, despawn, brain, raidWait,   // sys: 장비·상점·능력치 시험 훅(giveItem, equip, unequip, sell, buy, addStat, setEnhTarget, state …)
    setAuto(on) { G.auto = on; hud.setAuto(on); if (on) { const z = world.zoneAt(P.pos.x, P.pos.z); P.huntAnchor = z.id === 'grave' ? POI.grave.clone() : z.id === 'altar' ? POI.altar.clone() : z.id === 'forest' ? P.pos.clone() : POI.forest.clone(); hud.toast('자동사냥을 시작합니다.', 'info'); } else { P.target = null; hud.setTarget(null); hud.toast('자동사냥을 종료합니다.', 'info'); } },
    update(rawDt) {
      if (G.paused) return;
      let dt = rawDt * G.timeScale; if (G.hitstop > 0) { G.hitstop -= rawDt; dt *= 0.06; }
      G.time += dt;
      updPlayer(dt); updQuest(dt);
      if (P.wantNpc && dist2(P.pos, NPCS[P.wantNpc].stand) < 1.3) { const id = P.wantNpc; P.wantNpc = null; talkTo(id); }
      SAGA.update(dt, rawDt); SYS.update(dt, rawDt); const cineF = SAGA.focus();   // cineF: 컷신이 비추는 곳(없으면 null)
      for (const e of G.ents) {
        if (e.flashT > 0) { e.flashT -= rawDt; if (e.flashT <= 0) e.ch.flash(0); }
        if (e.kind === 'monster') { if (dist2(e.pos, P.pos) < 70 || e.target) updMonster(e, dt); }
        else if (e.kind === 'bot') updBot(e, dt);
        else if (e.kind === 'boss') updBoss(e, dt);
        const far = dist2(e.pos, P.pos) > 60 && !(cineF && dist2(e.pos, cineF) < 70); e.ch.root.visible = !far && !(e.kind === 'monster' && e.dead && e.t > 3.4); if (!far) e.ch.update(e === P || e.kind === 'boss' ? dt : dt);
      }
      if (G.raid && !G.raid.active && G.boss && G.boss.dead) updBoss(G.boss, dt);
      for (const b of bots) if (b.role === 'town2') { b.wait2 = (b.wait2 || 2.5) - dt; if (b.wait2 <= 0) { b.role = 'hunt'; b.ch.play('idle'); } }
      updZone(dt);
      if (P.target) { const m = P.target; if (m.dead) { P.target = null; hud.setTarget(null); } else if ((uiT -= rawDt) <= 0) { uiT = 0.1; setTarget(m); } }
      syncPlates(); if ((mmT -= rawDt) <= 0) { mmT = 0.12; drawMinimap(); if (skOn()) SK.hudTick(); else for (const s of SKILLS) hud.updateSkill(s.id, { cdLeft: Math.max(0, P.cds[s.id] || 0), enabled: P.mp >= s.mp && unlocked(s), active: P.state === 'skill' && P.skill === s.id }); if (skOn()) { /* 버프 줄은 SK.hudTick 이 그린다 */ } else if (P.buffT > 0) hud.setBuffs([{ id: 'roar', icon: 6, name: '사자의 포효', remain: P.buffT, total: 15 }]); else if (P.hadBuff) hud.setBuffs([]); P.hadBuff = P.buffT > 0; refreshPlayerUI(); }
      sound && sound.setListener && sound.setListener(P.pos.x, P.pos.z);
      chat && chat.update(dt);
    },
  };
  return api;
}
