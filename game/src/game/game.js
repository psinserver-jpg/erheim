// 게임 본체: 주인공 조작·자동사냥, 몬스터/봇/NPC AI, 전투·스킬·레벨업·전리품, 강화, 보스 레이드
import * as THREE from 'three';
import { loadCharModel, Character } from '../entities/chars.js';
import { POI, ZONES } from '../world/world.js';

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
const SKILLS = [
  { id: 'spin', name: '회전 베기', icon: 2, key: '1', cd: 6, mp: 18, clip: 'skill1' },
  { id: 'slam', name: '도약 강타', icon: 3, key: '2', cd: 10, mp: 30, clip: 'skill2' },
  { id: 'roar', name: '사자후', icon: 6, key: '3', cd: 24, mp: 25, clip: 'skill3' },
  { id: 'recall', name: '귀환', icon: 7, key: '4', cd: 30, mp: 10, clip: null },
];

export async function createGame({ engine, world, ui, vfx, sound, names, chat }) {
  const scene = engine.scene;
  const hud = ui.hud, win = ui.win;
  const S = (n, o) => { try { sound && sound.sfx(n, o); } catch (e) { } };
  const models = {};
  for (const t of ['hero', 'werewolf', 'orc_warrior', 'skeleton_knight', 'blacksmith', 'mage', 'elf_archer', 'demon_lord']) {
    try { models[t] = await loadCharModel(t, { lod: false }); models[t + '_lod'] = await loadCharModel(t, { lod: true }); } catch (e) { console.warn('모델 없음', t); }
  }
  const G = { ents: [], time: 0, timeScale: 1, hitstop: 0, auto: false, demo: false, boss: null, raid: null, events: [], paused: false };
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
  function stepTo(e, p, dt, speed, stop = 0.15) {
    const dx = p.x - e.pos.x, dz = p.z - e.pos.z; const d = Math.hypot(dx, dz); if (d <= stop) return true;
    const s = Math.min(d - stop * 0.5, speed * dt); e.pos.x += dx / d * s; e.pos.z += dz / d * s; world.resolve(e.pos, e.r); face(e, p, dt); return false;
  }
  function screenOf(e, h) { sp.copy(e.pos); sp.y += h; return engine.project(sp, scr); }
  function dmgNum(e, val, kind) { const s = screenOf(e, e.height * 0.9); if (s.z < 1) hud.damage(s.x + rand(-26, 26), s.y + rand(-14, 10), val, { kind }); }

  // ---------------- 주인공 ----------------
  const P = spawn('player', 'hero', POI.plaza.clone(), { name: '카일', guild: 0, level: 14, hp: 1400, atk: 96, speed: 6.4, r: 0.55 });
  Object.assign(P, { mp: 300, mpMax: 300, exp: 0.42, gold: 12840, combo: 0, buffT: 0, cds: {}, potions: { hp: 99, mp: 40 }, plus: 4, scrolls: 12, kills: 0, weaponName: '여명의 장검', huntAnchor: POI.forest.clone(), invuln: false, busy: 0 });
  engine.setFollow(P.pos); engine.snapCamera();
  let trail = null, glow = null;
  try { if (P.ch.weapon && vfx) { trail = vfx.weaponTrail(P.ch.weapon, { base: [0, 0.2, 0], tip: [0, 1.15, 0], color: 0x9fd0ff, width: 1 }); trail.setActive(false); glow = vfx.enhanceGlow(P.ch.weapon, P.plus); } } catch (e) { console.warn(e); }
  const setTrail = (on) => { try { trail && trail.setActive(on); } catch (e) { } };
  function atkPower() { return (P.atk + P.plus * 14) * (P.buffT > 0 ? 1.35 : 1); }
  function refreshPlayerUI() { hud.setPlayer({ name: P.name, level: P.level, guild: GUILDS[0], crest: 0, hp: Math.ceil(P.hp), hpMax: P.hpMax, mp: Math.ceil(P.mp), mpMax: P.mpMax, exp: P.exp, gold: P.gold, power: Math.round(atkPower() * 31 + P.hpMax * 2.2) }); }
  function skillState() { return SKILLS.map(s => ({ id: s.id, name: s.name, icon: s.icon, key: s.key, cd: s.cd, cdLeft: Math.max(0, P.cds[s.id] || 0), mp: s.mp, enabled: P.mp >= s.mp })); }
  hud.setSkills(skillState()); hud.setPotions(P.potions); refreshPlayerUI();

  function gainExp(x) {
    P.exp += x / EXPREQ(P.level);
    const s = screenOf(P, 2.3); hud.damage(s.x + 40, s.y, '+' + x + ' EXP', { kind: 'exp' });
    while (P.exp >= 1) {
      P.exp -= 1; P.level++; P.hpMax += 90; P.mpMax += 20; P.atk += 7; P.hp = P.hpMax; P.mp = P.mpMax;
      hud.levelUp(P.level); try { vfx.levelUp(P.ch.root); } catch (e) { } S('levelup'); engine.flash(0xfff2c0, 0.35); engine.shake(0.25, 0.4);
      hud.chat.add({ channel: 'system', text: `레벨이 올랐습니다! (Lv.${P.level}) 체력·내력이 모두 회복되었습니다.` });
      chat && chat.event('levelUp', { name: P.name, level: P.level }); G.events.push('levelup');
    }
    refreshPlayerUI();
  }
  function hurtPlayer(d, src) {
    if (P.dead) return; if (G.demo) d = Math.min(d, Math.max(0, P.hp - P.hpMax * 0.22));
    if (!G.demo && src && src.kind === 'boss') d *= 0.5;   // 직접 플레이: AI 인원이 적어 보스 공격이 주인공에게 몰리므로 피해를 줄인다
    d = Math.round(d); if (d <= 0) return; P.hp -= d; dmgNum(P, d, 'take'); S('player_hurt', { volume: 0.6 }); P.ch.flash(0.5); P.flashT = 0.12; engine.shake(0.12, 0.15);
    if (P.state === 'idle' || P.state === 'move') { /* 가벼운 피격은 동작을 끊지 않는다 */ }
    if (P.hp <= 0) { P.hp = 0; P.dead = true; P.state = 'dead'; P.ch.play('death', { loop: false }); win.death.show({ sec: 5 }); G.auto = false; hud.setAuto(false); }
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
      const crit = Math.random() < 0.24; const d = Math.round(atkPower() * mult * rand(0.9, 1.12) * (crit ? 1.9 : 1));
      damage(m, d, P, crit);
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
      if (m.state !== 'attack' && m.hp > 0) { m.ch.play('hit', { loop: false, restart: true, fade: 0.05 }); m.state = 'hit'; m.t = 0.32; }
      if (src === P && Math.random() < 0.4) S('monster_hurt', { volume: 0.5, pos: m.pos });
    }
    if (m.hp <= 0) kill(m, src);
  }
  function kill(m, src) {
    m.hp = 0; m.dead = true; m.state = 'dead'; m.t = 0; m.ch.play('death', { loop: false, fade: 0.08 }); S('monster_die', { pos: m.pos, volume: 0.7 });
    if (m.kind === 'monster') {
      const d = MON[m.tag];
      if (src === P || dist2(m.pos, P.pos) < 8) {
        P.kills++; gainExp(d.exp); const gold = Math.round(rand(d.gold[0], d.gold[1])); P.gold += gold;
        hud.loot({ icon: 14, name: '금화', count: gold, rarity: 'common' }); S('coin', { volume: 0.5 });
        if (Math.random() < 0.16) { P.scrolls++; hud.loot({ icon: 11, name: '무기 강화 주문서', count: 1, rarity: 'rare' }); try { vfx.lootBeam(m.pos, { color: 0x4aa3ff, duration: 2.5 }); } catch (e) { } }
        if (Math.random() < 0.05) { hud.loot({ icon: 15, name: '마력 결정', count: 1, rarity: 'epic' }); try { vfx.lootBeam(m.pos, { color: 0xb36bff, duration: 3 }); } catch (e) { } }
        quest.kill(m.tag); refreshPlayerUI();
      }
      if (P.target === m) { P.target = null; hud.setTarget(null); }
    } else if (m.kind === 'boss') bossDead(m);
  }

  // ---------------- 의뢰 ----------------
  let qrun = null;   // 자동 진행 중인 의뢰
  const quest = { n: { werewolf: 0, orc_warrior: 0 }, kill(t) { if (this.n[t] !== undefined) { this.n[t]++; this.show(); } },
    show() { const act = (id) => !!(qrun && qrun.id === id); hud.setQuest([{ id: 'hunt', active: act('hunt'), title: '[일일] 숲의 위협', lines: [{ text: '늑대인간 처치', cur: Math.min(this.n.werewolf, 20), max: 20, done: this.n.werewolf >= 20 }, { text: '오크 전사 처치', cur: Math.min(this.n.orc_warrior, 10), max: 10, done: this.n.orc_warrior >= 10 }] }, { id: 'raid', active: act('raid'), title: '[문파] 발카르 토벌전', lines: [{ text: '잿불 제단의 레이드에 참가', cur: G.raid && G.raid.done ? 1 : 0, max: 1, done: !!(G.raid && G.raid.done) }] }, { id: 'enh', active: act('enh'), title: '[성장] 여명의 장검 +7 달성', lines: [{ text: '대장장이 브롬에게 강화', cur: Math.min(P.plus, 7), max: 7, done: P.plus >= 7 }] }]); } };
  quest.show();

  // ---------------- 몬스터 ----------------
  const spawnPts = [];
  function addMon(tag, x, z) { const d = MON[tag]; const e = spawn('monster', tag, V(x, z), { lod: true, name: d.name, level: d.level, hp: d.hp, atk: d.atk, speed: d.speed, r: d.r, range: d.range, yaw: rand(0, 6) }); if (e) { e.wanderT = rand(1, 5); spawnPts.push(e); } return e; }
  for (let i = 0; i < 16; i++) { const a = rand(0, 6.28), r = rand(8, 48); addMon('werewolf', Math.sin(a) * r * 0.9 - 6, -128 + Math.cos(a) * r * 0.8); }
  for (let i = 0; i < 9; i++) { const a = rand(0, 6.28), r = rand(5, 20); addMon('orc_warrior', 34 + Math.sin(a) * r, -150 + Math.cos(a) * r); }
  for (let i = 0; i < 12; i++) { const a = rand(0, 6.28), r = rand(6, 36); addMon('skeleton_knight', -112 + Math.sin(a) * r, -150 + Math.cos(a) * r); }
  function updMonster(m, dt) {
    const d = MON[m.tag];
    if (m.dead) { m.t += dt; if (m.t > 2.2) m.ch.setOpacity(Math.max(0, 1 - (m.t - 2.2) / 1.2)); if (m.t > 3.4 && m.ch.root.visible) { m.ch.root.visible = false; } if (m.t > 9) { m.dead = false; m.hp = m.hpMax; m.pos.copy(m.home); m.ch.setOpacity(1); m.ch.root.visible = true; m.state = 'idle'; m.target = null; m.ch.play('idle', { restart: true }); try { vfx.spawn(m.pos, { color: 0x8866ff }); } catch (e) { } } return; }
    if (m.state === 'hit') { m.t -= dt; if (m.t <= 0) m.state = 'idle'; return; }
    let tg = m.target; if (tg && (tg.dead || dist2(tg.pos, m.home) > 46)) tg = m.target = null;
    if (!tg && !P.dead && dist2(P.pos, m.pos) < 9 && !world.zoneAt(P.pos.x, P.pos.z).safe) tg = m.target = P;
    if (m.state === 'attack') {
      m.t += dt; if (tg) face(m, tg.pos, dt, 6);
      if (!m.hitDone && m.t >= m.hitAt) { m.hitDone = true; if (tg && !tg.dead && dist2(tg.pos, m.pos) < m.range + 1.4) { if (tg === P) hurtPlayer(m.atk * rand(0.85, 1.15), m); else { tg.hp -= m.atk * 0.25; } } }
      if (m.t >= m.atkDur) { m.state = 'idle'; m.cool = rand(0.5, 1.1); } return;
    }
    m.cool = (m.cool || 0) - dt;
    if (tg) {
      const dd = dist2(tg.pos, m.pos);
      if (dd > m.range) { stepTo(m, tg.pos, dt, m.speed, m.range * 0.8); m.ch.play('run'); }
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
  try { const gl = await (await import('../core/assets.js')).Assets.gltf('env/merchant.glb'); let mesh = null; gl.scene.traverse(o => { if (o.isMesh && !mesh) mesh = o; });
    const root = new THREE.Group(); const mm = new THREE.Mesh(mesh.geometry, mesh.material); mm.scale.setScalar(1.66); mm.castShadow = true; mm.rotation.y = Math.PI * 0.5 + 0.5; root.add(mm); root.position.copy(POI.merchant); scene.add(root);
    const shim = { root, update() { mm.scale.y = 1.66 * (1 + Math.sin(G.time * 1.7) * 0.006); }, flash() { }, play() { return 1; }, has() { return false; }, setOpacity() { } };
    G.ents.push({ id: nextId++, kind: 'npc', tag: 'merchant', ch: shim, pos: root.position, yaw: 0, name: '잡화상인 리나', guild: null, level: 30, hp: 1, hpMax: 1, r: 0.5, height: 1.66, title: '물약 · 주문서', dead: false, state: 'idle' });
  } catch (e) { console.warn('merchant', e); }
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
  function botAttack(b, tg, dt) {
    const dd = dist2(tg.pos, b.pos);
    if (b.state === 'attack') { b.t += dt; face(b, tg.pos, dt, 8); if (!b.hitDone && b.t >= b.hitAt) { b.hitDone = true; const dmg = Math.round(b.atk * rand(0.8, 1.3) * (tg.kind === 'boss' ? (G.demo ? 5 : 1.5) : 1)); if (b.cls !== 'melee') { sp.copy(b.pos); sp.y += 1.3; sp2.copy(tg.pos); sp2.y += tg.height * 0.5; try { vfx.projectile(sp.clone(), sp2.clone(), { kind: b.cls === 'magic' ? 'magic' : 'arrow', speed: 34, color: b.cls === 'magic' ? 0x7ab8ff : 0xfff0c0, onHit: () => damage(tg, dmg, b, false) }); } catch (e) { damage(tg, dmg, b, false); } if (dist2(b.pos, P.pos) < 22) S(b.cls === 'magic' ? 'magic_cast' : 'arrow_shot', { pos: b.pos, volume: 0.35 }); } else { damage(tg, dmg, b, false); if (dist2(b.pos, P.pos) < 16) S('sword_swing2', { pos: b.pos, volume: 0.3 }); } } if (b.t >= b.atkDur) { b.state = 'idle'; b.cool = rand(0.15, 0.6); } return; }
    b.cool = (b.cool || 0) - dt;
    if (dd > b.range) { stepTo(b, tg.pos, dt, b.speed, b.range * 0.85); b.ch.play('run'); }
    else if (b.cool <= 0) { const c = b.tag === 'hero' ? pick(['attack1', 'attack2', 'attack3']) : (Math.random() < 0.75 ? 'attack1' : (b.ch.has('skill1') && tg.kind === 'boss' ? 'skill1' : 'attack2')); b.atkDur = b.ch.play(c, { loop: false, restart: true, fade: 0.08 }); b.hitAt = b.ch.event(c, 'hit') ?? b.ch.event(c, 'cast') ?? b.ch.event(c, 'shoot') ?? b.atkDur * 0.5; b.hitDone = false; b.t = 0; b.state = 'attack'; }
    else { face(b, tg.pos, dt); b.ch.play('idle'); }
  }
  function updBot(b, dt) {
    if (b.dead) { b.t += dt; if (b.t > 6) { b.dead = false; b.hp = b.hpMax; b.ch.play('idle', { restart: true }); b.state = 'idle'; try { vfx.buff(b.ch.root, { color: 0xfff0a0, duration: 1.2 }); } catch (e) { } } return; }
    if (b.hp <= 0) { b.dead = true; b.t = 0; b.ch.play('death', { loop: false }); b.state = 'dead'; return; }
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
  function setTarget(m) { if (m && P.shownTarget !== m.id) { hud.setTarget(null); P.shownTarget = m.id; } P.target = m; if (m) hud.setTarget({ name: m.name, level: m.level, hp: Math.max(0, Math.round(m.hp)), hpMax: m.hpMax, kind: m.kind === 'boss' ? 'elite' : 'monster', portrait: m.kind === 'boss' ? 'ui/portrait_demon.jpg' : MON[m.tag].portrait }); else hud.setTarget(null); }
  function startAttack() {
    const c = ['attack1', 'attack2', 'attack3'][P.combo % 3]; P.combo++;
    P.atkDur = P.ch.play(c, { loop: false, restart: true, fade: 0.06, speed: 1.12 }); P.hitAt = (P.ch.event(c, 'hit') ?? 0.3) / 1.12; P.atkDur *= 0.86; P.hitDone = false; P.t = 0; P.state = 'attack'; P.atkClip = c;
    setTrail(true); S(Math.random() < 0.5 ? 'sword_swing1' : 'sword_swing2', { volume: 0.7 });
  }
  function castSkill(id) {
    const s = SKILLS.find(x => x.id === id); if (!s || P.dead || P.state === 'skill' || (P.cds[id] || 0) > 0 || P.mp < s.mp) return false;
    if (id === 'recall') { if (G.raid && G.raid.active) return false; P.cds[id] = s.cd; P.mp -= s.mp; teleport(POI.plaza); return true; }
    if (id === 'slam') { const tg = P.target && !P.target.dead ? P.target : nearestMonster(P.pos, 14); if (!tg) return false; P.slamTo = tg; face(P, tg.pos, 1, 100); }
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
    P.potT = (P.potT || 0) - dt; if (G.auto && P.hp < P.hpMax * 0.6 && P.potions.hp > 0 && P.potT <= 0) { usePotion('hp'); P.potT = 1.2; }   // 자동 물약: 공격 동작 중에도 마신다
    if (P.busy > 0) { P.busy -= dt; return; }
    if (P.state === 'attack') {
      P.t += dt; const tg = P.target; if (tg && !tg.dead) face(P, tg.pos, dt, 14);
      if (!P.hitDone && P.t >= P.hitAt) { P.hitDone = true; const fwd = sp.set(P.pos.x + Math.sin(P.yaw) * 1.6, 1.1, P.pos.z + Math.cos(P.yaw) * 1.6); try { vfx.slash(fwd, P.yaw, { kind: P.atkClip === 'attack1' ? 'arc1' : P.atkClip === 'attack2' ? 'arc2' : 'smash', color: P.plus >= 7 ? 0xb070ff : 0x6fb8ff, scale: 0.95 }); } catch (e) { }
        const hits = near(fwd, P.atkClip === 'attack3' ? 2.6 : 2.2); if (tg && !tg.dead && !hits.includes(tg) && dist2(tg.pos, P.pos) < 3.6 + (tg.kind === 'boss' ? 4 : 0)) hits.push(tg);
        strike(hits, P.atkClip === 'attack3' ? 1.5 : 1.0, { kind: 'arc1', shake: P.atkClip === 'attack3' ? 0.3 : 0.14, stop: P.atkClip === 'attack3' ? 0.09 : 0.05 }); if (P.atkClip === 'attack3') { try { vfx.shockwave(fwd.clone().setY(0.05), 2.4, { color: 0xffe0a0, duration: 0.4 }); } catch (e) { } } }
      if (P.t >= P.atkDur) { P.state = 'idle'; setTrail(false); } return;
    }
    if (P.state === 'skill') {
      P.t += dt; const id = P.skill;
      if (id === 'spin') { if (P.fx === 0 && P.t > 0.28) { P.fx = 1; try { vfx.slash(P.pos.clone().setY(1.1), P.yaw, { kind: 'spin', color: 0x9fd8ff, scale: 1.7 }); } catch (e) { } strike(near(P.pos, 4.6), 1.5, { shake: 0.3, stop: 0.06 }); } if (P.fx === 1 && P.t > 0.5) { P.fx = 2; strike(near(P.pos, 4.6), 1.7, { shake: 0.35, stop: 0.07 }); try { vfx.shockwave(P.pos.clone().setY(0.05), 5, { color: 0x9fd8ff, duration: 0.5 }); } catch (e) { } } }
      if (id === 'slam') { const tg = P.slamTo; if (P.t > 0.28 && P.t < 0.62 && tg) { const d = dist2(tg.pos, P.pos); if (d > 2.2 + (tg.kind === 'boss' ? 4 : 0)) { const s = Math.min(d, 26 * dt); P.pos.x += (tg.pos.x - P.pos.x) / d * s; P.pos.z += (tg.pos.z - P.pos.z) / d * s; } }
        if (P.fx === 0 && P.t > 0.64) { P.fx = 1; const c = sp.set(P.pos.x + Math.sin(P.yaw) * 1.8, 0.05, P.pos.z + Math.cos(P.yaw) * 1.8).clone(); try { vfx.slash(c.clone().setY(1), P.yaw, { kind: 'smash', color: 0xffd28a, scale: 1.8 }); vfx.shockwave(c, 6, { color: 0xffb060, duration: 0.6 }); vfx.groundDecal(c, { kind: 'crack', radius: 3.4, duration: 5, color: 0xff8030 }); } catch (e) { } strike(near(c, 5.2), 3.2, { shake: 0.7, stop: 0.12 }); S('skill_slam'); engine.flash(0xffe0b0, 0.25); } }
      if (id === 'roar' && P.fx === 0 && P.t > 0.3) { P.fx = 1; P.buffT = 15; try { vfx.buff(P.ch.root, { color: 0xffc040, duration: 15 }); vfx.shockwave(P.pos.clone().setY(0.05), 6, { color: 0xffd060, duration: 0.7 }); } catch (e) { } hud.setBuffs([{ id: 'roar', icon: 6, name: '사자후', remain: 15, total: 15 }]); engine.shake(0.3, 0.4); refreshPlayerUI(); }
      if (P.t >= P.atkDur) { P.state = 'idle'; setTrail(false); } return;
    }
    // 이동 입력
    let mx = 0, mz = 0; if (keys.KeyW || keys.ArrowUp) { mx -= 1; mz -= 1; } if (keys.KeyS || keys.ArrowDown) { mx += 1; mz += 1; } if (keys.KeyA || keys.ArrowLeft) { mx -= 1; mz += 1; } if (keys.KeyD || keys.ArrowRight) { mx += 1; mz -= 1; }
    if (mx || mz) { clickMove = null; P.moveTo = null; if (G.auto && !G.demo) { /* 수동 조작 시 자동 유지 */ } const l = Math.hypot(mx, mz); sp.set(P.pos.x + mx / l * 3, 0, P.pos.z + mz / l * 3); stepTo(P, sp, dt, P.speed, 0); P.ch.play('run'); P.state = 'move'; return; }
    const tg = P.target && !P.target.dead ? P.target : null;
    if (G.auto) autoHunt(dt);
    const t2 = P.target && !P.target.dead ? P.target : null;
    if (t2 && (G.auto || P.chase)) { const reach = 2.3 + (t2.kind === 'boss' ? 4.2 : 0); if (dist2(t2.pos, P.pos) > reach) { stepTo(P, t2.pos, dt, P.speed, reach * 0.85); P.ch.play('run'); P.state = 'move'; } else { startAttack(); } return; }
    const mv = P.moveTo || clickMove;
    if (mv) { if (stepTo(P, mv, dt, P.speed, 0.25)) { P.moveTo = null; clickMove = null; } P.ch.play('run'); P.state = 'move'; if ((P.stepT = (P.stepT || 0) - dt) <= 0) { P.stepT = 0.3; S('footstep', { volume: 0.25 }); } return; }
    P.ch.play('idle'); P.state = 'idle';
  }
  function autoHunt(dt) {
    if (P.mp < 60 && P.potions.mp > 0) usePotion('mp');
    let tg = P.target && !P.target.dead ? P.target : null;
    if (!tg) { tg = G.boss && !G.boss.dead && dist2(G.boss.pos, P.pos) < 60 ? G.boss : ((qrun && qrun.tag && nearestMonster(P.pos, 38, m => m.tag === qrun.tag && dist2(m.pos, P.huntAnchor) < 60)) || nearestMonster(P.pos, qrun && qrun.tag ? 7 : 38, m => dist2(m.pos, P.huntAnchor) < 60)); if (tg) setTarget(tg); else if (dist2(P.pos, P.huntAnchor) > 6) P.moveTo = P.huntAnchor; }
    if (!tg) return;
    const d = dist2(tg.pos, P.pos) - (tg.kind === 'boss' ? 4 : 0);
    if (P.buffT <= 0 && d < 12 && castSkill('roar')) return;
    if (d < 9 && d > 3 && castSkill('slam')) return;
    if (d < 3.4 && (near(P.pos, 4.6).length >= 2 || tg.kind === 'boss') && castSkill('spin')) return;
  }

  // ---------------- 강화 ----------------
  const enh = { busy: false, log: [],
    state() { return { item: { icon: 0, name: P.weaponName, plus: P.plus, rarity: P.plus >= 7 ? 'legend' : P.plus >= 5 ? 'epic' : 'rare' }, scrolls: P.scrolls, blessed: 0, rate: RATES[Math.min(P.plus, RATES.length - 1)], nextPlus: P.plus + 1, safe: P.plus < 3, log: this.log.slice(-6) }; },
    open() { win.open('enhance'); win.enhance.set(this.state()); if (smith) smith.ch.play(smith.ch.has('talk') ? 'talk' : 'idle'); },
    async run(forced) {
      if (this.busy || P.scrolls <= 0) return null; this.busy = true; P.scrolls--;
      const from = P.plus; const rate = RATES[Math.min(from, RATES.length - 1)];
      const ok = forced !== undefined ? forced === 'success' : Math.random() < rate;
      const destroy = forced !== undefined ? forced === 'destroy' : (!ok && from >= 6 && Math.random() < 0.5);
      const res = ok ? 'success' : destroy ? 'destroy' : 'fail';
      if (smith && smith.ch.has('work')) smith.ch.play('work', { restart: true }); S('anvil'); setTimeout(() => S('anvil'), 450); setTimeout(() => S('anvil'), 900);
      const pr = win.enhance.play(res, { from, to: from + 1, name: P.weaponName });
      setTimeout(() => {
        if (ok) { S('enhance_success'); engine.flash(0xfff0b0, 0.45); P.plus++; try { glow && glow.setLevel(P.plus); vfx.buff(P.ch.root, { color: 0xffd060, duration: 2 }); } catch (e) { } if (smith && smith.ch.has('cheer')) smith.ch.play('cheer', { loop: false, restart: true }); }
        else { S('enhance_fail'); engine.flash(0xff2010, 0.5); engine.shake(0.6, 0.6); if (smith && smith.ch.has('sad')) smith.ch.play('sad', { loop: false, restart: true }); if (destroy) { P.plus = 0; P.weaponName = '낡은 장검'; try { glow && glow.setLevel(0); } catch (e) { } } }
      }, 1250);
      await pr;
      this.log.push(ok ? `+${from} → +${from + 1} 강화 성공!` : destroy ? `+${from} ${'여명의 장검'} 증발…` : `+${from} 강화 실패`);
      if (ok) { hud.chat.add({ channel: 'system', text: `${P.weaponName} +${P.plus} 강화에 성공했습니다!` }); if (P.plus >= 6) { hud.notice(`[은사자] 카일 님이 +${P.plus} ${P.weaponName} 강화에 성공했습니다!`, 'enhance'); chat && chat.event('enhanceSuccess', { name: P.name, item: P.weaponName, plus: P.plus }); } }
      else { hud.chat.add({ channel: 'system', text: destroy ? `강화 실패! +${from} 여명의 장검이 증발했습니다…` : `강화에 실패했습니다. (+${from} 유지)` }); if (destroy) { hud.notice(`[은사자] 카일 님의 +${from} 여명의 장검이 강화 중 증발했습니다…`, 'enhance'); } chat && chat.event('enhanceFail', { name: P.name, item: '여명의 장검', plus: from }); }
      win.enhance.set(this.state()); refreshPlayerUI(); quest.show(); this.busy = false; G.events.push('enhance:' + res); return res;
    } };

  // ---------------- 보스 레이드 ----------------
  function startRaid() {
    if (G.raid && G.raid.active) return; const A = POI.altar;
    const B = spawn('boss', 'demon_lord', A.clone(), { scale: 2.6, name: '염옥의 군주 발카르', level: 60, hp: G.demo ? 260000 : 95000, atk: 150, speed: 3.2, r: 2.6, range: 7.5, yaw: 0 });
    if (!B) return; B.threat = new Map(); B.phase = 1; B.cool = 3; B.title = '레이드 보스'; G.boss = B; G.raid = { active: true, done: false, t: 0, tele: [] };
    try { vfx.flameBurst(A.clone().setY(1), { scale: 3 }); vfx.shockwave(A.clone().setY(0.6), 14, { color: 0xff5010, duration: 1.2 }); G.raid.amb = vfx.ambient('embers', { center: A.clone(), radius: 30, count: 70 }); } catch (e) { }
    S('boss_roar'); engine.shake(0.9, 1.2); engine.flash(0xff4010, 0.4); sound && sound.bgm && sound.bgm('bgm_boss', { fade: 1.5 });
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
    if (ph !== B.phase) { B.phase = ph; S('boss_roar'); engine.shake(0.8, 1); engine.flash(0xff3010, 0.35); hud.notice(ph === 2 ? '발카르가 분노합니다! 화염이 거세집니다!' : '발카르가 광폭해졌습니다! 모두 버텨라!', 'boss'); chat && chat.event('bossPhase', { boss: '발카르', phase: ph }); try { vfx.fireRing(B.pos.clone().setY(0.65), 8, { duration: 1.2 }); } catch (e) { } }
    // 대상: 위협 수치 1위
    let tg = null, best = -1; for (const [id, v] of B.threat) { const e = G.ents.find(x => x.id === id); if (e && !e.dead && v > best) { best = v; tg = e; } } if (!tg) tg = !P.dead && dist2(P.pos, B.pos) < 40 ? P : bots.find(b => b.role === 'raid' && !b.dead);
    if (B.state === 'cast') { B.t += dt; if (tg) face(B, tg.pos, dt, 2.5); if (!B.hitDone && B.t >= B.hitAt) { B.hitDone = true; B.onHit && B.onHit(); } if (B.t >= B.atkDur) { B.state = 'idle'; B.cool = rand(1.0, 2.0) / (ph === 3 ? 1.6 : 1); } return; }
    if (!tg) { B.ch.play('idle'); return; }
    B.cool -= dt; const d = dist2(tg.pos, B.pos);
    if (d > B.range) { stepTo(B, tg.pos, dt, B.speed, B.range * 0.8); B.ch.play('walk'); return; }
    face(B, tg.pos, dt, 3);
    if (B.cool > 0) { B.ch.play('idle'); return; }
    const roll = Math.random(); let c;
    if (roll < 0.22 && B.ch.has('skill2')) { c = 'skill2'; B.onHit = () => { S('boss_roar'); const n = ph === 1 ? 4 : ph === 2 ? 6 : 8; for (let i = 0; i < n; i++) { const q = i === 0 && !P.dead ? P.pos : pick(bots.filter(b => b.role === 'raid')).pos; const pos = V(q.x + rand(-4, 4), q.z + rand(-4, 4)); setTimeout(() => { if (!G.raid || !G.raid.active) return; try { vfx.meteor(pos.clone().setY(0.62), { delay: 1.3, radius: 2.6 }); } catch (e) { } bossTelegraph(B, pos, 2.8, 1.3, 240, 'meteor'); }, i * 160); } }; }
    else if (roll < 0.5 && B.ch.has('skill1')) { c = 'skill1'; const pos = V(B.pos.x + Math.sin(B.yaw) * 6, B.pos.z + Math.cos(B.yaw) * 6); const dur = B.ch.dur('skill1'); const at = B.ch.event('skill1', 'hit') ?? dur * 0.6; bossTelegraph(B, pos, ph === 3 ? 9.5 : 8, at, 420, 'slam'); B.onHit = () => { }; }
    else { c = Math.random() < 0.5 ? 'attack1' : 'attack2'; const pos = V(B.pos.x + Math.sin(B.yaw) * 5.5, B.pos.z + Math.cos(B.yaw) * 5.5); const at = B.ch.event(c, 'hit') ?? 0.5; bossTelegraph(B, pos, 4.8, at, 260, 'slam'); B.onHit = () => { try { vfx.slash(pos.clone().setY(3), B.yaw, { kind: c === 'attack1' ? 'smash' : 'arc2', color: 0xff6a20, scale: 2.6 }); } catch (e) { } }; }
    B.atkDur = B.ch.play(c, { loop: false, restart: true, fade: 0.15 }); B.hitAt = B.ch.event(c, 'hit') ?? B.ch.event(c, 'cast') ?? B.atkDur * 0.5; B.hitDone = false; B.t = 0; B.state = 'cast';
  }
  function bossDead(B) {
    const R = G.raid; R.active = false; R.done = true; hud.setBoss(null); G.timeScale = 0.25; setTimeout(() => { G.timeScale = 1; }, 1600);
    engine.flash(0xffffff, 0.7); engine.shake(1.2, 1.6); S('boss_roar'); S('levelup');
    for (let i = 0; i < 9; i++) setTimeout(() => { const p = V(B.pos.x + rand(-7, 7), B.pos.z + rand(-7, 7)); try { vfx.flameBurst(p.clone().setY(rand(1, 6)), { scale: rand(2, 4) }); vfx.lootBeam(p, { color: pick([0xffb23e, 0xb36bff, 0x4aa3ff]), duration: 7 }); } catch (e) { } }, i * 180);
    try { R.amb && R.amb.dispose(); } catch (e) { }
    hud.notice('염옥의 군주 발카르 토벌 성공! 은사자 문파가 에르하임을 지켜냈습니다!', 'boss'); chat && chat.event('bossDead', { boss: '발카르' });
    const rank = [...B.threat.entries()].map(([id, v]) => { const e = G.ents.find(x => x.id === id); return e ? { name: e.name, guild: e.guild !== null ? GUILDS[e.guild] : '-', dmg: Math.round(v), mvp: false } : null; }).filter(Boolean).sort((a, b) => b.dmg - a.dmg).slice(0, 8);
    const me = rank.find(r => r.name === P.name); if (me) { rank.splice(rank.indexOf(me), 1); } rank.unshift({ name: P.name, guild: GUILDS[0], dmg: Math.max(me ? me.dmg : 0, (rank[0] ? rank[0].dmg : 0) + 4321), mvp: true });
    setTimeout(() => { win.raidResult.show({ title: '발카르 토벌 성공', rank, loot: [{ icon: 0, name: '염옥의 대검 조각', rarity: 'legend' }, { icon: 13, name: '축복받은 강화 주문서 x3', rarity: 'epic' }, { icon: 15, name: '마력 결정 x12', rarity: 'epic' }, { icon: 14, name: '금화 x250,000', rarity: 'common' }] }); P.gold += 250000; gainExp(1800); G.events.push('raidDone'); sound && sound.bgm && sound.bgm('bgm_field', { fade: 2 }); }, 3200);
    setTimeout(() => { for (const b of bots) if (b.role === 'raid') { b.role = 'town2'; b.ch.play(b.ch.has('skill1') && b.tag !== 'hero' ? 'idle' : 'skill3', { loop: false, restart: true }); } quest.show(); }, 900);
  }

  // ---------------- 이름표·미니맵·지역 ----------------
  const plates = []; let zoneId = '';
  function syncPlates() {
    plates.length = 0;
    for (const e of G.ents) {
      if (!e.ch.root.visible) continue; const d = dist2(e.pos, P.pos); if (d > (e.kind === 'boss' ? 80 : 34)) continue;
      if (e.kind === 'monster' && e.dead) continue;
      const s = screenOf(e, e.height + 0.25); if (s.z > 1 || s.x < -60 || s.x > 1980 || s.y < -40 || s.y > 1100) continue;
      plates.push({ id: e.id, x: s.x, y: s.y, name: e.name, guild: e.guild !== null && e.guild !== undefined ? GUILDS[e.guild] : null, crest: e.guild, level: e.level,
        hp: (e.kind === 'monster' && (e.hp < e.hpMax || P.target === e)) || e === P ? e.hp / e.hpMax : null, kind: e === P ? 'me' : e.kind === 'bot' ? 'player' : e.kind, title: e.title || null, dim: d > 24 });
    }
    hud.plates.sync(plates);
  }
  function drawMinimap() {
    const mm = hud.minimap; if (!mm || !mm.ctx2d) return; const c = mm.ctx2d, sz = mm.size || mm.canvas.width; const sc = 1.15; const k = world.mapScale;
    c.save(); c.clearRect(0, 0, sz, sz); c.translate(sz / 2, sz / 2); c.scale(sc, sc);
    c.drawImage(world.minimapBase, -(P.pos.x + world.HALF) * k, -(P.pos.z + world.HALF) * k);
    for (const e of G.ents) { if (e === P || (e.dead && e.kind !== 'bot')) continue; const dx = (e.pos.x - P.pos.x) * k, dz = (e.pos.z - P.pos.z) * k; if (Math.abs(dx) > sz / 2 / sc || Math.abs(dz) > sz / 2 / sc) continue;
      c.fillStyle = e.kind === 'monster' ? '#ff4a3a' : e.kind === 'boss' ? '#ff9a1a' : e.kind === 'npc' ? '#ffe066' : (e.guild === 0 ? '#6dff8a' : '#7fc4ff'); const r = e.kind === 'boss' ? 5 : e.kind === 'npc' ? 2.6 : 1.9; c.beginPath(); c.arc(dx, dz, r, 0, 7); c.fill(); }
    c.restore(); c.save(); c.translate(sz / 2, sz / 2); c.rotate(-P.yaw + Math.PI); c.fillStyle = '#fff'; c.strokeStyle = '#000'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(0, -7); c.lineTo(5, 6); c.lineTo(0, 3); c.lineTo(-5, 6); c.closePath(); c.fill(); c.stroke(); c.restore();
    mm.setCoords && mm.setCoords(Math.round(P.pos.x + 380), Math.round(P.pos.z + 380));
  }
  var MOODS = { town: { sky: 0xa9c9e8, fogNear: 60, fogFar: 170, sun: 2.6, hemi: 0.85, tint: [1.03, 1.0, 0.95] }, forest: { sky: 0x8fb89a, fogNear: 42, fogFar: 135, sun: 2.5, hemi: 0.8, tint: [0.97, 1.03, 0.95] }, grave: { sky: 0x5c6a80, fogNear: 26, fogFar: 95, sun: 1.3, hemi: 0.6, tint: [0.9, 0.95, 1.08] }, altar: { sky: 0x2a1614, fogNear: 34, fogFar: 120, sun: 1.7, hemi: 0.65, tint: [1.04, 0.96, 0.92] }, wild: { sky: 0x9cc0e0, fogNear: 55, fogFar: 160, sun: 2.9, hemi: 0.9, tint: [1, 1, 1] } };
  function updZone(dt) {
    const z = world.zoneAt(P.pos.x, P.pos.z); engine.setMood(MOODS[z.id] || MOODS.wild, 1 - Math.exp(-dt * 1.4)); world.night = z.id === 'altar' || z.id === 'grave' ? 1 : 0.2;
    if (z.id !== zoneId) { zoneId = z.id; hud.setZone(z.name, z.sub); if (G.time > 1) hud.zoneBanner(z.name, z.sub); if (sound && sound.bgm && !(G.raid && G.raid.active)) { sound.bgm(z.id === 'town' ? 'bgm_town' : z.id === 'altar' ? 'bgm_boss' : 'bgm_field', { fade: 2 }); sound.ambient && sound.ambient(z.id === 'town' ? 'amb_town' : z.id === 'altar' ? null : 'amb_forest', { fade: 2, volume: 0.5 }); } }
  }


  // ---------------- 의뢰 자동 진행 ----------------
  // 의뢰창에서 의뢰를 누르면: 목적지까지 달려가서 사냥·레이드·강화를 알아서 진행한다. 다시 누르거나 직접 움직이면 멈춘다.
  const QN = { hunt: '숲의 위협', raid: '발카르 토벌전', enh: '여명의 장검 +7 달성' };
  const inTown = (p) => Math.hypot(p.x, p.z) < 46;
  function routeTo(dest) { const r = [], a = inTown(P.pos), b = inTown(dest), mid = new THREE.Vector3(0, 0, -30); if (a && !b) r.push(mid, POI.gateOut.clone()); else if (!a && b) r.push(POI.gateOut.clone(), mid); r.push(dest.clone()); return r; }
  function questGo(q, dest) { q.phase = 'go'; q.dest = dest.clone(); q.route = routeTo(dest); q.stuckT = 0; q.last = P.pos.clone(); G.auto = false; hud.setAuto(false); P.target = null; hud.setTarget(null); P.chase = false; P.wantSmith = false; clickMove = null; P.moveTo = q.route.shift(); P.speed = 9; }
  function questStop(msg) { if (!qrun) return; if (qrun.id === 'raid') engine.cam.zoomTarget = 14; qrun = null; P.speed = 6.4; if (msg) hud.toast(msg, 'info'); quest.show(); }
  function questStart(id) {
    if (G.demo || P.dead || !QN[id]) return;
    if (qrun && qrun.id === id) { questStop('의뢰 자동 진행을 멈췄습니다.'); if (G.auto) api.setAuto(false); P.moveTo = null; return; }
    let dest, tag = null;
    if (id === 'hunt') { if (quest.n.werewolf >= 20 && quest.n.orc_warrior >= 10) return hud.toast('이미 완료한 의뢰입니다.', 'info'); tag = quest.n.werewolf < 20 ? 'werewolf' : 'orc_warrior'; dest = tag === 'werewolf' ? POI.forest : POI.orcCamp; }
    else if (id === 'raid') { if (G.raid && G.raid.done) return hud.toast('이미 완료한 의뢰입니다.', 'info'); dest = new THREE.Vector3(POI.altar.x + 3, 0, POI.altar.z + 24); }
    else { if (P.plus >= 7) return hud.toast('이미 완료한 의뢰입니다.', 'info'); if (P.weaponName !== '여명의 장검') return hud.toast('여명의 장검이 없습니다.', 'info'); if (P.scrolls <= 0) return hud.toast('강화 주문서가 없습니다. 사냥으로 주문서를 모으세요.', 'info'); dest = POI.smithStand; }
    if (qrun) questStop(); win.close('enhance');
    qrun = { id, tag, t: 0 }; questGo(qrun, dest);
    hud.toast(`의뢰 [${QN[id]}] 자동 진행 — 목적지로 이동합니다.`, 'info'); quest.show();
  }
  function questArrive(q) {
    P.speed = 6.4; q.phase = 'do';
    if (q.id === 'hunt') { api.setAuto(true); P.huntAnchor = q.dest.clone(); }
    else if (q.id === 'raid') { if (!(G.raid && G.raid.active)) startRaid(); api.setAuto(true); P.huntAnchor = POI.altar.clone(); engine.cam.zoomTarget = 28; }
    else { face(P, smith.pos, 1, 100); enh.open(); q.t = 1.2; }
  }
  function updQuest(dt) {
    const q = qrun; if (!q) return; if (P.dead) return questStop();
    if (q.phase === 'go') {
      if (!P.moveTo) { if (q.route.length) P.moveTo = q.route.shift(); else questArrive(q); return; }
      q.stuckT += dt; if (q.stuckT > 2.5) { if (dist2(P.pos, q.last) < 2) { P.pos.copy(P.moveTo); world.resolve(P.pos, P.r); } q.last.copy(P.pos); q.stuckT = 0; }   // 지형에 걸리면 다음 지점으로 넘긴다
      return;
    }
    if (q.id === 'hunt') {
      if (!G.auto) return questStop('의뢰 자동 진행을 멈췄습니다.');
      const max = q.tag === 'werewolf' ? 20 : 10;
      if (quest.n[q.tag] >= max) {
        if (q.tag === 'werewolf' && quest.n.orc_warrior < 10) { q.tag = 'orc_warrior'; questGo(q, POI.orcCamp); hud.toast('늑대인간 처치 완료 — 오크 야영지로 이동합니다.', 'info'); }
        else questStop('의뢰 [숲의 위협] 완료! 자동사냥은 계속합니다.');
      }
    } else if (q.id === 'raid') {
      if (G.raid && G.raid.done) { questStop('의뢰 [발카르 토벌전] 완료!'); if (G.auto) api.setAuto(false); }
      else if (!G.auto) questStop('의뢰 자동 진행을 멈췄습니다.');
    } else {
      if (P.plus >= 7) return questStop('의뢰 [여명의 장검 +7 달성] 완료!');
      if (enh.busy) return; q.t -= dt; if (q.t > 0) return;
      if (P.weaponName !== '여명의 장검') return questStop('검이 증발해 강화 의뢰를 계속할 수 없습니다…');
      if (P.scrolls <= 0) return questStop('강화 주문서가 떨어졌습니다. 사냥으로 주문서를 모으세요.');
      enh.run(); q.t = 1.0;
    }
  }

  // ---------------- 입력 ----------------
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  function onDown(ev) {
    if (G.demo || ev.target !== engine.renderer.domElement) return; const rc = engine.renderer.domElement.getBoundingClientRect();
    ndc.set((ev.clientX - rc.left) / rc.width * 2 - 1, -((ev.clientY - rc.top) / rc.height * 2 - 1)); ray.setFromCamera(ndc, engine.camera); const hit = new THREE.Vector3(); if (!ray.ray.intersectPlane(plane, hit)) return;
    if (qrun && qrun.phase === 'go') questStop('의뢰 자동 진행을 멈췄습니다.');
    let best = null, bd = 1.6; for (const m of G.ents) { if (m.dead || m === P) continue; const d = dist2(m.pos, hit) - (m.kind === 'boss' ? 4 : 0); if (d < bd) { bd = d; best = m; } }
    if (best && (best.kind === 'monster' || best.kind === 'boss')) { setTarget(best); P.chase = true; clickMove = null; }
    else if (best && best === smith) { P.moveTo = POI.smithStand.clone(); P.wantSmith = true; }
    else { clickMove = hit; P.chase = false; P.target = null; hud.setTarget(null); try { vfx.groundDecal(hit.clone().setY(0.05), { kind: 'circle', radius: 0.7, duration: 0.5, color: 0xffe080 }); } catch (e) { } }
  }
  engine.renderer.domElement.addEventListener('pointerdown', onDown);
  addEventListener('keydown', (e) => { if (e.target && e.target.tagName === 'INPUT') return; keys[e.code] = true; if (G.demo) return; if (qrun && qrun.phase === 'go' && /^(Key[WASD]|Arrow)/.test(e.code)) questStop('의뢰 자동 진행을 멈췄습니다.'); const s = SKILLS.find(x => x.key === e.key); if (s) castSkill(s.id); if (e.code === 'Space') { const t = P.target && !P.target.dead ? P.target : nearestMonster(P.pos, 8); if (t) { setTarget(t); P.chase = true; } else if (P.state !== 'attack' && P.state !== 'skill') startAttack(); e.preventDefault(); }
    if (e.code === 'KeyR') api.setAuto(!G.auto); if (e.code === 'KeyQ') usePotion('hp'); if (e.code === 'KeyI') win.toggle('inventory'); if (e.code === 'KeyC') win.toggle('character'); if (e.code === 'KeyB') startRaid(); });
  addEventListener('keyup', (e) => { keys[e.code] = false; });
  ui.on('skill', castSkill); ui.on('attack', () => { const t = P.target && !P.target.dead ? P.target : nearestMonster(P.pos, 8); if (t) { setTarget(t); P.chase = true; } });
  ui.on('toggleAuto', () => api.setAuto(!G.auto)); ui.on('quest', questStart); ui.on('potion', usePotion); ui.on('enhance', () => enh.run());
  ui.on('chat', (t) => hud.chat.add({ channel: 'local', name: P.name, guild: GUILDS[0], text: t }));
  ui.on('revive', () => { win.death.hide(); P.dead = false; P.hp = P.hpMax; P.state = 'idle'; P.ch.play('idle', { restart: true }); teleport(POI.plaza); refreshPlayerUI(); });

  // ---------------- 창 데이터 ----------------
  function refreshWindows() {
    win.inventory.set({ gold: P.gold, items: [{ id: 'w', icon: 0, name: P.weaponName, count: 1, rarity: P.plus >= 7 ? 'legend' : 'epic', plus: P.plus, equipped: true }, { id: 's', icon: 1, name: '사자 문장 방패', count: 1, rarity: 'epic', plus: 5, equipped: true }, { id: 'h', icon: 2, name: '은빛 기사 투구', count: 1, rarity: 'rare', plus: 4, equipped: true }, { id: 'a', icon: 3, name: '은빛 기사 갑옷', count: 1, rarity: 'epic', plus: 5, equipped: true }, { id: 'g', icon: 4, name: '강철 건틀릿', count: 1, rarity: 'rare', plus: 3, equipped: true }, { id: 'b', icon: 5, name: '강철 장화', count: 1, rarity: 'rare', plus: 3, equipped: true }, { id: 'c', icon: 6, name: '왕국 기사단 망토', count: 1, rarity: 'rare', plus: 2, equipped: true }, { id: 'r', icon: 7, name: '푸른 서약의 반지', count: 1, rarity: 'epic', plus: 0 }, { id: 'n', icon: 8, name: '불꽃 심장 목걸이', count: 1, rarity: 'legend', plus: 0 }, { id: 'p1', icon: 9, name: '빨간 물약', count: P.potions.hp, rarity: 'common' }, { id: 'p2', icon: 10, name: '파란 물약', count: P.potions.mp, rarity: 'common' }, { id: 'e1', icon: 11, name: '무기 강화 주문서', count: P.scrolls, rarity: 'rare' }, { id: 'e2', icon: 12, name: '방어구 강화 주문서', count: 7, rarity: 'rare' }, { id: 'e3', icon: 13, name: '축복받은 강화 주문서', count: 1, rarity: 'legend' }, { id: 'm', icon: 15, name: '마력 결정', count: 34, rarity: 'epic' }] });
    win.character.set({ name: P.name, level: P.level, guild: GUILDS[0], stats: { '공격력': Math.round(atkPower()), '방어력': 212 + P.level * 6, '체력': P.hpMax, '내력': P.mpMax, '치명타': '24%', '명중': 188, '회피': 96, '이동 속도': '120%' }, equip: [{ slot: '무기', icon: 0, name: P.weaponName, plus: P.plus, rarity: 'epic' }, { slot: '방패', icon: 1, name: '사자 문장 방패', plus: 5, rarity: 'epic' }, { slot: '투구', icon: 2, name: '은빛 기사 투구', plus: 4, rarity: 'rare' }, { slot: '갑옷', icon: 3, name: '은빛 기사 갑옷', plus: 5, rarity: 'epic' }, { slot: '장갑', icon: 4, name: '강철 건틀릿', plus: 3, rarity: 'rare' }, { slot: '장화', icon: 5, name: '강철 장화', plus: 3, rarity: 'rare' }] });
  }
  refreshWindows();

  // ---------------- 메인 루프 ----------------
  let uiT = 0, mmT = 0;
  const api = {
    G, P, POI, bots, smith, enh, startRaid, castSkill, teleport, setTarget, usePotion, refreshWindows, nearestMonster,
    setAuto(on) { G.auto = on; hud.setAuto(on); if (on) { const z = world.zoneAt(P.pos.x, P.pos.z); P.huntAnchor = z.id === 'grave' ? POI.grave.clone() : z.id === 'altar' ? POI.altar.clone() : z.id === 'forest' ? P.pos.clone() : POI.forest.clone(); hud.toast('자동사냥을 시작합니다.', 'info'); } else { P.target = null; hud.setTarget(null); hud.toast('자동사냥을 종료합니다.', 'info'); } },
    update(rawDt) {
      if (G.paused) return;
      let dt = rawDt * G.timeScale; if (G.hitstop > 0) { G.hitstop -= rawDt; dt *= 0.06; }
      G.time += dt;
      updPlayer(dt); updQuest(dt);
      if (P.wantSmith && dist2(P.pos, POI.smithStand) < 1.2) { P.wantSmith = false; face(P, smith.pos, 1, 100); enh.open(); }
      for (const e of G.ents) {
        if (e.flashT > 0) { e.flashT -= rawDt; if (e.flashT <= 0) e.ch.flash(0); }
        if (e.kind === 'monster') { if (dist2(e.pos, P.pos) < 70 || e.target) updMonster(e, dt); }
        else if (e.kind === 'bot') updBot(e, dt);
        else if (e.kind === 'boss') updBoss(e, dt);
        const far = dist2(e.pos, P.pos) > 60; e.ch.root.visible = !far && !(e.kind === 'monster' && e.dead && e.t > 3.4); if (!far) e.ch.update(e === P || e.kind === 'boss' ? dt : dt);
      }
      if (G.raid && !G.raid.active && G.boss && G.boss.dead) updBoss(G.boss, dt);
      for (const b of bots) if (b.role === 'town2') { b.wait2 = (b.wait2 || 2.5) - dt; if (b.wait2 <= 0) { b.role = 'hunt'; b.ch.play('idle'); } }
      updZone(dt);
      if (P.target) { const m = P.target; if (m.dead) { P.target = null; hud.setTarget(null); } else if ((uiT -= rawDt) <= 0) { uiT = 0.1; setTarget(m); } }
      syncPlates(); if ((mmT -= rawDt) <= 0) { mmT = 0.12; drawMinimap(); for (const s of SKILLS) hud.updateSkill(s.id, { cdLeft: Math.max(0, P.cds[s.id] || 0), enabled: P.mp >= s.mp, active: P.state === 'skill' && P.skill === s.id }); if (P.buffT > 0) hud.setBuffs([{ id: 'roar', icon: 6, name: '사자후', remain: P.buffT, total: 15 }]); else if (P.hadBuff) hud.setBuffs([]); P.hadBuff = P.buffT > 0; refreshPlayerUI(); }
      sound && sound.setListener && sound.setListener(P.pos.x, P.pos.z);
      chat && chat.update(dt);
    },
  };
  return api;
}
