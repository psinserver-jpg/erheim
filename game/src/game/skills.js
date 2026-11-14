// 기술 체계(v3): 주인공 기술 12종 + 전문화 3종, 자원(내력·투지), 공용 재사용 대기, 발동 효과, 적의 시전과 차단.
// game.js 는 여기의 훅만 부른다(연결 지점은 _work/v3/sk/apply_patch.py 참고):
//   on · cast · tick · rotation · key · hudList · hudTick · debuffs · onBasicHit · outgoing · incoming · onDamaged · monTick · bossTick
// 직접 플레이(sys.isLive() && !G.demo)일 때만 움직인다. 녹화용 자동 모드와 타이틀 화면에서는 on() 이 false 라
// game.js 의 예전 경로(기술 4개·예전 공식)가 그대로 돈다.
import { josa } from './items.js';

const rand = (a, b) => a + Math.random() * (b - a);
const dist2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);

// ── 수치(여기만 고치면 된다. _work/v3/sk/dps_sim.mjs 가 같은 표를 읽어 균형을 계산한다) ─────────────────────
export const SK_TUNE = {
  gcd: 1.0,                                    // 공용 재사용 대기(초). bolt·guard·bulwark·recall·물약은 제외
  rageMax: 100, rageBasic: 1, rageBasic3: 2, rageCrit: 1, rageHurt: 2, rageHurtCast: 8, rageInterrupt: 10, rageExecKill: 10,
  rageDecay: 3, combatSec: 5,                  // 전투를 벗어난 지 5초가 지나면 초당 3씩 줄어든다
  roarMult: 1.35,                              // 사자의 포효(공격력 배율은 game.js 의 atkPower 가 P.buffT 로 적용한다)
  spinProc: 0.25, spinProcSec: 8,              // 발동 효과 '칼바람': 십자 베기가 맞으면 25% 확률로 회전 베기 대기 초기화 + 한 번 무료
  execProcSec: 6, execProcIcd: 18,             // 발동 효과 '단죄의 각인': 치명타가 나면 6초 동안 단죄의 일격을 체력 조건 없이(내부 대기 18초)
  critMult: 1.9,
  specLevel: 10, respecBase: 300, respecPerLevel: 50,
  castLock: 6, castGap: 2.5, bossCastLock: 8,  // 차단당한 적은 6초(보스 8초) 동안 다시 시전하지 못한다. 시전과 시전 사이 최소 2.5초
  stunElite: 0.5,                              // 정예·이야기 정예·습격자는 기절 시간이 절반
};
// 기본 공격(game.js 의 startAttack 과 같은 값 — 계산 스크립트용)
export const BASIC = { dur: [0.384, 0.384, 0.5375], hitAt: [0.259, 0.241, 0.295], mult: [1, 1, 1.5] };

// hits: [동작 시작 뒤 초, 공격력 배율]. anim: 동작 때문에 다른 행동이 막히는 시간(초)
export const SKILL_DEFS = [
  { id: 'cross', name: '십자 베기', lv: 1, key: '1', code: 'Digit1', icon: 1, sheet: 0, kind: 'builder', cd: 3, mp: 0, rage: 0, gain: 12, gcd: true, anim: 0.42, hits: [[0.21, 0.8], [0.30, 1.0]],
    desc: '가로와 세로로 잇달아 베어 앞의 적에게 공격력의 80% + 100% 피해를 주고 투지 12를 얻는다. 25% 확률로 [회전 베기]를 바로, 내력 없이 쓸 수 있게 된다.' },
  { id: 'spin', name: '회전 베기', lv: 2, key: '2', code: 'Digit2', icon: 2, sheet: 0, kind: 'area', cd: 6, mp: 18, rage: 0, gain: 0, gcd: true, anim: 0.9, hits: [[0.28, 1.5], [0.5, 1.7]], radius: 4.6,
    desc: '몸을 돌려 주변 4.6m 안의 모든 적을 두 번 벤다(150% + 170%).' },
  { id: 'slam', name: '도약 강타', lv: 3, key: '3', code: 'Digit3', icon: 3, sheet: 0, kind: 'area', cd: 10, mp: 30, rage: 0, gain: 0, gcd: true, anim: 1.1, hits: [[0.64, 3.2]], radius: 5.2, range: 14, stun: 1.0,
    desc: '14m 안의 적에게 뛰어올라 내려찍는다. 주변 적에게 320% 피해를 주고 1초 동안 기절시킨다.' },
  { id: 'charge', name: '선봉 돌파', lv: 4, key: '4', code: 'Digit4', icon: 0, sheet: 1, kind: 'move', cd: 12, mp: 0, rage: 0, gain: 15, gcd: true, anim: 0.45, hits: [[0.2, 1.4]], min: 4.5, range: 18, speed: 30, stun: 0.6,
    desc: '4.5~18m 떨어진 적에게 방패를 앞세워 돌진한다. 140% 피해를 주고 0.6초 동안 기절시키며 투지 15를 얻는다.' },
  { id: 'roar', name: '사자의 포효', lv: 5, key: '5', code: 'Digit5', icon: 6, sheet: 0, kind: 'buff', cd: 24, mp: 25, rage: 0, gain: 0, gcd: true, anim: 1.2, dur: 15,
    desc: '사자처럼 포효해 15초 동안 공격력이 35% 오른다.' },
  { id: 'guard', name: '수호의 방패', lv: 7, key: '6', code: 'Digit6', icon: 4, sheet: 0, kind: 'defense', cd: 14, mp: 0, rage: 25, gain: 0, gcd: false, dur: 6, cut: 0.4,
    desc: '방패를 세워 6초 동안 받는 피해를 40% 줄인다. 공용 대기 없이 어떤 동작 중에도 바로 쓴다.' },
  { id: 'bolt', name: '뇌전검', lv: 9, key: '7', code: 'Digit7', icon: 5, sheet: 0, kind: 'interrupt', cd: 12, mp: 14, rage: 0, gain: 0, gcd: false, hits: [[0, 0.9]], range: 14,
    desc: '검에서 번개를 뿜어 14m 안의 적에게 90% 피해를 주고 시전을 끊는다. 끊긴 적은 6초 동안 다시 시전하지 못한다. 공용 대기와 무관하다.' },
  { id: 'execute', name: '단죄의 일격', lv: 11, key: '8', code: 'Digit8', icon: 1, sheet: 1, kind: 'spender', cd: 6, mp: 0, rage: 30, gain: 0, gcd: true, anim: 0.6, hits: [[0.33, 3.6]], hp: 0.25,
    desc: '체력이 25% 이하인 적을 내려쳐 360% 피해를 준다. 쓰러뜨리면 투지 10을 돌려받는다. 치명타가 나면 잠시 체력 조건 없이 쓸 수 있다.' },
  { id: 'rend', name: '출혈 베기', lv: 13, key: '9', code: 'Digit9', icon: 2, sheet: 1, kind: 'spender', cd: 9, mp: 0, rage: 20, gain: 0, gcd: true, anim: 0.45, hits: [[0.29, 0.8]], dot: 0.3, dotSec: 9,
    desc: '깊게 베어 80% 피해를 주고 9초 동안 매초 공격력의 30%만큼 출혈 피해를 입힌다.' },
  { id: 'dawn', name: '여명의 손길', lv: 15, key: '0', code: 'Digit0', icon: 3, sheet: 1, kind: 'heal', cd: 20, mp: 40, rage: 0, gain: 0, gcd: true, anim: 0.6, heal: 0.26,
    desc: '여명의 빛을 불러 최대 체력의 26%를 회복한다.' },
  { id: 'bulwark', name: '불굴의 방벽', spec: 'ward', lv: 10, key: 'E', code: 'KeyE', icon: 4, sheet: 1, kind: 'spec', cd: 60, mp: 0, rage: 0, gain: 0, gcd: false, dur: 8, cut: 0.65,
    desc: '[수호] 8초 동안 받는 피해를 65% 줄인다. 공용 대기 없이 바로 쓴다.' },
  { id: 'frenzy', name: '격노의 쌍격', spec: 'fury', lv: 10, key: 'E', code: 'KeyE', icon: 5, sheet: 1, kind: 'spec', cd: 10, mp: 0, rage: 40, gain: 0, gcd: true, anim: 0.68, hits: [[0.19, 1.9], [0.48, 1.9]],
    desc: '[격노] 불붙은 검으로 두 번 몰아쳐 190% + 190% 피해를 준다.' },
  { id: 'vow', name: '서약의 빛', spec: 'oath', lv: 10, key: 'E', code: 'KeyE', icon: 6, sheet: 1, kind: 'spec', cd: 16, mp: 40, rage: 0, gain: 0, gcd: true, anim: 0.8, hits: [[0.2, 2.0]], radius: 5.5, heal: 0.10,
    desc: '[서약] 맹세의 빛을 터뜨려 주변 5.5m 의 적에게 200% 피해를 주고 최대 체력의 10%를 회복한다.' },
  { id: 'recall', name: '귀환', lv: 1, key: 'T', code: 'KeyT', icon: 7, sheet: 0, kind: 'utility', cd: 30, mp: 10, rage: 0, gain: 0, gcd: false,
    desc: '벨로스 성채 광장으로 순간이동한다. 레이드 중에는 쓸 수 없다.' },
];
const DEF = {}; for (const d of SKILL_DEFS) DEF[d.id] = d;

// 전문화: Lv.10 에 하나를 고른다. 지속 효과는 sys.setBonus('spec', …) 로 능력치 계산(derive)에 합쳐진다.
export const SPECS = [
  { key: 'ward', name: '수호', skill: 'bulwark', icon: 4, sheet: 1, color: 0x8fc8ff, hp: 0.12, def: [8, 2], hurtRage: 1.5, guardPlus: 2,
    desc: '방패와 갑옷으로 버티는 길. 쓰러지지 않는 선봉이 된다.',
    perks: ['최대 체력 +12%', '방어력 +8, 레벨마다 +2', '피격으로 얻는 투지 +50%', '[수호의 방패] 지속 +2초', '전용 기술 [불굴의 방벽] (E)'] },
  { key: 'fury', name: '격노', skill: 'frenzy', icon: 5, sheet: 1, color: 0xff6a30, atk: 0.03, crit: 0.03, rage: 1.2, bleed: 0.03,
    desc: '분노를 검에 싣는 길. 투지를 빠르게 쌓아 몰아친다.',
    perks: ['공격력 +3%', '치명타 확률 +3%', '얻는 투지 +20%', '출혈 중인 적에게 주는 피해 +3%', '전용 기술 [격노의 쌍격] (E)'] },
  { key: 'oath', name: '서약', skill: 'vow', icon: 6, sheet: 1, color: 0xffe9a0, mp: 0.15, regen: 2, heal: 1.25, atk: 0.02,
    desc: '사자의 맹세를 빛으로 삼는 길. 스스로 상처를 돌보며 오래 싸운다.',
    perks: ['최대 내력 +15%', '내력 회복 초당 +2', '자기 치유량 +25%', '공격력 +2%', '전용 기술 [서약의 빛] (E)'] },
];
const SPEC = {}; for (const s of SPECS) SPEC[s.key] = s;

// 적의 시전(정예·이야기 정예·습격자·보스). total = 시전 시간, mult = 끝났을 때 들어오는 한 방(공격력 배율), first/every = 첫 시전·다음 시전까지(초)
export const CAST_DEFS = {
  elite: { total: [2.0, 2.4], mult: [2.2, 2.5], first: [3, 5], every: [9, 13] },
  named: { total: [1.8, 2.4], mult: [2.2, 2.5], first: [3, 5], every: [9, 12], name: '맹렬한 일격' },
  raider: { total: [1.6, 2.0], mult: [2.0, 2.2], first: [4, 7], every: [10, 14], name: '까마귀의 급습' },
  boss: { total: [2.4, 2.4], mult: [2.2, 2.2], first: [10, 14], every: [18, 24], name: '염옥의 선고' },
};
const CAST_NAME = { werewolf: '광란의 물어뜯기', orc_warrior: '분쇄의 일격', skeleton_knight: '무덤의 내려치기' };

/** 자동사냥 순환: 지금 쓸 기술 하나를 고른다(없으면 null). v.ready(id) = 해금·대기·자원·조건을 모두 통과하는가.
 *  순서: 차단 → 생존 → (즉시 기술만 볼 때는 여기까지) → 포효 → 접근 → 마무리 → 출혈 → 전문화 → 광역 → 기본기. 게임과 계산 스크립트가 같은 함수를 쓴다. */
export function chooseSkill(v) {
  const ok = v.ready;
  if (v.casting && ok('bolt')) return 'bolt';
  if (v.casting && !v.guarded && v.castLeft < 1.0) { if (ok('guard')) return 'guard'; if (ok('bulwark')) return 'bulwark'; }
  if (v.hpPct < 0.35 && !v.guarded) { if (ok('bulwark')) return 'bulwark'; if (ok('guard')) return 'guard'; }
  if (v.instantOnly) return null;
  if (v.hpPct < 0.55 && ok('dawn')) return 'dawn';
  if (v.hpPct < 0.6 && v.dist < 4.5 && ok('vow')) return 'vow';
  if (!v.roar && v.dist < 12 && ok('roar')) return 'roar';
  if (v.dist > 6 && v.dist < 18 && ok('charge')) return 'charge';
  if (v.dist > 3 && v.dist < 9 && ok('slam')) return 'slam';
  if (v.dist > 3.4) return null;                                                      // 아직 닿지 않는다 — 걸어서 붙는다
  if ((v.tgHpPct <= DEF.execute.hp || v.procExec) && ok('execute')) return 'execute';
  if (!v.bleed && v.tgTough && ok('rend')) return 'rend';
  if (ok('frenzy')) return 'frenzy';
  if ((v.near >= 2 || v.boss) && ok('vow')) return 'vow';
  if ((v.near >= 2 || v.boss || v.procSpin || v.mpPct > 0.5) && ok('spin')) return 'spin';
  if (ok('cross')) return 'cross';
  return null;
}

export function installSkills(ctx) {
  const { G, P, ui, hud, win, vfx, S, engine, world, POI, sys } = ctx;
  const T = SK_TUNE;
  const st = { init: false, gcd: 0, guardT: 0, guardTotal: 0, bulwarkT: 0, spinProc: 0, execProc: 0, execIcd: 0, combatT: -99, swing: -1, tg: null, t0: 0, dustT: 0,
    caster: null, castNext: 0, castShown: false, castHit: null, bleeds: [], sig: '', dirty: false, wantSpec: false, dlg: false, badge: false, hadBuffs: false, sayT: -9, fx: {},
    used: {}, ev: [], casts: 0, castHits: 0, interrupts: 0, lastIn: null, lastCastHit: null };
  if (P.spec === undefined) P.spec = null;
  const on = () => sys.isLive() && !G.demo;
  const toast = (t) => { if (G.time - st.sayT < 0.9) return; st.sayT = G.time; hud.toast(t, 'info'); };
  const sysChat = (text) => hud.chat.add({ channel: 'system', text });
  const fx = (fn) => { try { return fn(); } catch (e) { return null; } };
  const fxOff = (h) => { try { h && (h.cancel ? h.cancel() : h.dispose && h.dispose()); } catch (e) { } };
  const emitEv = (type, payload) => { st.ev.push({ type, t: Math.round(G.time * 10) / 10, ...payload }); if (st.ev.length > 60) st.ev.shift(); try { ctx.emit && ctx.emit(type, payload); } catch (e) { console.error('[sk:emit]', e); } };

  // ───────────── 도우미 ─────────────
  const alive = (m) => !!m && !m.dead && !m.gone;
  const isFoe = (m) => m.kind === 'monster' || m.kind === 'boss';
  const reachOf = (m) => 3.6 + (m.kind === 'boss' ? 4 : 0);
  const edge = (m) => dist2(m.pos, P.pos) - (m.kind === 'boss' ? 4 : 0);
  const near = (pos, r) => { const out = []; for (const m of G.ents) if (isFoe(m) && !m.dead && dist2(m.pos, pos) < r + (m.kind === 'boss' ? 3.5 : 0)) out.push(m); return out; };
  const fwd = (d, y) => P.pos.clone().set(P.pos.x + Math.sin(P.yaw) * d, y, P.pos.z + Math.cos(P.yaw) * d);
  const at = (e, y) => e.pos.clone().setY(y);
  const front = (r, tg) => { const hits = near(fwd(1.6, 1.1), r); if (alive(tg) && !hits.includes(tg) && dist2(tg.pos, P.pos) < reachOf(tg)) hits.push(tg); return hits; };
  const spec = () => SPEC[P.spec] || null;
  const unlocked = (d) => (d.spec ? P.spec === d.spec && P.level >= T.specLevel : P.level >= d.lv);
  const inCombat = () => G.time - st.combatT < T.combatSec;
  const respecCost = () => (P.spec ? T.respecBase + T.respecPerLevel * P.level : 0);
  const stunned = (m) => m.stunUntil > G.time;
  const bleeding = (m) => m.bleedUntil > G.time;
  const hpText = (v) => '+' + Math.round(v);

  function addRage(n, why) {
    if (!n) return; const s = spec();
    if (n > 0) n *= (s && s.rage ? s.rage : 1) * (why === 'hurt' && s && s.hurtRage ? s.hurtRage : 1);
    P.rage = clamp((P.rage || 0) + n, 0, T.rageMax);
  }
  function heal(frac) { const s = spec(), h = Math.round(P.hpMax * frac * (s && s.heal ? s.heal : 1)); P.hp = Math.min(P.hpMax, P.hp + h); ctx.dmgNum(P, hpText(h), 'heal'); return h; }
  function stun(m, sec) {
    if (m.kind !== 'monster' || m.dead || m.cast) return;                                // 보스와 시전 중인 적은 기절하지 않는다
    if (m.elite || m.named || m.raider) sec *= T.stunElite;
    m.stunUntil = Math.max(m.stunUntil || 0, G.time + sec); if (m.state === 'attack') m.hitDone = true; m.state = 'hit'; m.t = 0.1;
    m.ch.play('hit', { loop: false, restart: true, fade: 0.05 }); fx(() => vfx.hit(at(m, m.height * 0.95), { color: 0xfff2a0, scale: 0.5 }));
  }

  // ───────────── 전문화 지속 효과 ─────────────
  function specBonus() {
    const s = spec(), b = { atk: 0, hp: 0, def: 0, mp: 0, crit: 0 }; if (!s) return b;
    if (s.hp) b.hp = Math.round(P.baseHp * s.hp); if (s.def) b.def = s.def[0] + s.def[1] * P.level; if (s.mp) b.mp = Math.round(P.baseMp * s.mp);
    if (s.atk) b.atk = Math.round((P.atk + P.plus * 14) * s.atk); if (s.crit) b.crit = s.crit;
    return b;
  }
  // 레벨·강화·전문화가 바뀌면 다시 계산한다. 가득 차 있던 체력·내력은 가득 찬 채로 둔다.
  function applyBonus() {
    const sig = [P.spec, P.level, P.baseHp, P.baseMp, P.atk, P.plus].join('|'); if (sig === st.sig) return; st.sig = sig;
    const fullHp = P.hp >= P.hpMax - 0.5, fullMp = P.mp >= P.mpMax - 0.5;
    sys.setBonus('spec', specBonus()); if (fullHp && !P.dead) P.hp = P.hpMax; if (fullMp) P.mp = P.mpMax;
  }
  const specView = () => SPECS.map(s => ({ key: s.key, name: s.name, icon: s.icon, sheet: s.sheet, desc: s.desc, perks: s.perks.slice(), skill: s.skill, skillName: DEF[s.skill].name }));
  /** 전문화 선택 창을 연다(UI 가 win.spec 을 구현하기 전에는 대화창으로 대신한다) */
  function openSpec() {
    if (!on()) return false;
    if (P.level < T.specLevel) { toast(`전문화는 Lv.${T.specLevel}에 고를 수 있습니다.`); return false; }
    const cost = respecCost();
    if ('spec' in win) { win.spec.open({ specs: specView(), current: P.spec, cost }); return true; }
    if (G.talk) return false;
    st.dlg = true;
    win.dialog.show({ name: '전문화', role: P.spec ? `현재 [${spec().name}] · 바꾸는 값 ${cost.toLocaleString('ko-KR')} 금화` : `Lv.${T.specLevel} — 하나를 고르면 전용 기술(E)이 생깁니다`, portrait: 'ui/portrait_hero.jpg', instant: true,
      text: SPECS.map(s => `[${s.name}] ${s.desc} ${s.perks.slice(0, 4).join(', ')}.`).join('  '),
      options: [...SPECS.filter(s => s.key !== P.spec).map(s => ({ id: 'spec:' + s.key, label: `${s.name} — ${DEF[s.skill].name}` })), { id: 'spec:', label: '나중에 고르기' }], escId: 'spec:' });
    return true;
  }
  /** 전문화를 고르거나 바꾼다. 처음은 무료, 바꿀 때는 금화(opt.free 면 무료). → 성공 여부 */
  function pickSpec(key, opt = {}) {
    const s = SPEC[key]; if (!on() || !s || P.dead) return false; if (!st.init) init();
    if (P.level < T.specLevel) { toast(`전문화는 Lv.${T.specLevel}에 고를 수 있습니다.`); return false; }
    if (P.spec === key) { toast(`이미 [${s.name}]의 길을 걷고 있습니다.`); return false; }
    const cost = opt.free ? 0 : respecCost();
    if (P.gold < cost) { toast(`금화가 부족합니다. (${cost.toLocaleString('ko-KR')} 금화 필요)`); return false; }
    const old = spec(); if (old) { delete P.cds[old.skill]; if (old.skill === 'bulwark') endBuff('bulwark'); }
    P.gold -= cost; P.spec = key; applyBonus(); st.dirty = true; st.wantSpec = false;
    const sk = DEF[s.skill], t = `전문화 [${s.name}]${josa(s.name, '을', '를')} ${old ? '새로 ' : ''}골랐습니다! 전용 기술 [${sk.name}] (단축키 ${sk.key})`;
    hud.notice(t, 'info'); sysChat(t + (cost ? ` — ${cost.toLocaleString('ko-KR')} 금화를 냈습니다.` : '')); S('quest_done', { volume: 0.8 }); engine.flash(s.color, 0.3);
    fx(() => { vfx.buff(P.ch.root, { color: s.color, duration: 2.6 }); vfx.shockwave(at(P, 0.05), 5, { color: s.color, duration: 0.7 }); });
    if ('spec' in win) win.spec.close(); emitEv('spec', { key }); sys.changed(); return true;
  }
  ui.on('specPick', (key) => pickSpec(key));
  ui.on('specOpen', () => openSpec());
  ui.on('dialog', (id) => { if (!st.dlg || typeof id !== 'string' || id.indexOf('spec:') !== 0) return; st.dlg = false; win.dialog.hide(); if (id.length > 5) pickSpec(id.slice(5)); });
  ui.on('windowOpen', (name) => { if (name === 'skills' && on() && !P.spec && P.level >= T.specLevel && !('spec' in win) && !G.talk) openSpec(); });   // 선택 창이 생기기 전의 임시 진입로

  // ───────────── 시전 가능 여부 ─────────────
  // 못 쓰는 까닭을 돌려준다(쓸 수 있으면 null). o.target = 대상 지정(자동사냥). 고른 대상은 st.pick 에 둔다.
  function why(d, o = {}) {
    st.pick = null;
    if (P.dead || G.talk) return 'busy';
    if (!unlocked(d)) return d.spec ? 'spec' : 'lock';
    if ((P.cds[d.id] || 0) > 0) return 'cd';
    if (d.gcd && st.gcd > 0) return 'gcd';
    if ((d.anim || d.id === 'recall') && P.state === 'skill') return 'busy';
    if (d.mp && P.mp < d.mp && !(d.id === 'spin' && st.spinProc > 0)) return 'mp';
    if (d.rage && (P.rage || 0) < d.rage) return 'rage';
    const id = d.id, cur = alive(o.target) ? o.target : alive(P.target) ? P.target : null;
    if (id === 'recall') return G.raid && G.raid.active ? 'raid' : null;
    if (id === 'slam') { const tg = cur || ctx.nearestMonster(P.pos, d.range); if (!tg) return 'target'; if (edge(tg) > d.range) return 'range'; st.pick = tg; return null; }
    if (id === 'charge') { const tg = cur || ctx.nearestMonster(P.pos, d.range); if (!tg) return 'target'; const e = edge(tg); if (e > d.range) return 'range'; if (e < d.min) return 'close'; st.pick = tg; return null; }
    if (id === 'bolt') { const c = st.caster, tg = alive(c) && edge(c) <= d.range ? c : cur || ctx.nearestMonster(P.pos, d.range); if (!tg) return 'target'; if (edge(tg) > d.range) return 'range'; st.pick = tg; return null; }
    if (id === 'execute' || id === 'rend' || id === 'frenzy') {
      const tg = cur || ctx.nearestMonster(P.pos, 8); if (!tg) return 'target'; if (dist2(tg.pos, P.pos) > reachOf(tg)) return 'range';
      if (id === 'execute' && !(tg.hp <= tg.hpMax * d.hp || st.execProc > 0)) return 'cond';
      st.pick = tg; return null;
    }
    st.pick = cur; return null;
  }
  function say(d, r) {
    const nm = `[${d.name}]`;
    if (r === 'lock') toast(`${nm}${josa(d.name, '은', '는')} Lv.${d.lv}에 익힙니다.`);
    else if (r === 'spec') toast(P.level < T.specLevel ? `${nm}${josa(d.name, '은', '는')} Lv.${T.specLevel}에 전문화 [${SPEC[d.spec].name}]${josa(SPEC[d.spec].name, '을', '를')} 고르면 익힙니다.` : `${nm}${josa(d.name, '은', '는')} 전문화 [${SPEC[d.spec].name}]의 기술입니다.`);
    else if (r === 'mp') toast('내력이 부족합니다.'); else if (r === 'rage') toast(`투지가 부족합니다. (${d.rage} 필요)`);
    else if (r === 'target') toast('대상이 없습니다.'); else if (r === 'range') toast('대상이 너무 멉니다.'); else if (r === 'close') toast('너무 가까워 돌진할 수 없습니다.');
    else if (r === 'cond') toast(`${nm}${josa(d.name, '은', '는')} 체력이 ${Math.round(d.hp * 100)}% 이하인 적에게만 쓸 수 있습니다.`);
    else if (r === 'raid') toast('레이드 중에는 귀환할 수 없습니다.');
  }

  // ───────────── 타격 ─────────────
  // game.js 의 strike 와 같은 공식(공격력 × 배율 × 0.9~1.12, 치명타 ×1.9). 기술 id 를 달고 다닌다.
  function hit(targets, mult, { id, shake = 0.14, stop = 0.05 } = {}) {
    let n = 0;
    for (const m of targets) {
      if (m.dead) continue; n++;
      const crit = Math.random() < sys.critChance(); let d = Math.round(ctx.atkPower() * mult * rand(0.9, 1.12) * (crit ? T.critMult : 1));
      d = outgoing(d, m, id, crit); ctx.damage(m, d, P, crit); onHit(m, d, crit, id);
    }
    if (n) { engine.shake(shake, 0.16); G.hitstop = Math.max(G.hitstop, stop); S(Math.random() < 0.5 ? 'hit1' : 'hit2', { volume: 0.9 }); }
    return n;
  }
  /** 주는 피해 보정(기본 공격·기술 공통) */
  function outgoing(d, m, id, crit) { const s = spec(); if (s && s.bleed && m && bleeding(m)) d = Math.round(d * (1 + s.bleed)); return d; }
  function onHit(m, d, crit, id) {
    st.combatT = G.time;
    if (crit && st.execIcd <= 0 && unlocked(DEF.execute)) { st.execProc = T.execProcSec; st.execIcd = T.execProcIcd; ctx.dmgNum(P, '단죄의 각인!', 'miss'); S('skill_buff', { volume: 0.35, rate: 1.8 }); }
  }
  /** 기본 공격이 맞을 때마다(game.js 의 strike). 한 번 휘두를 때 투지는 한 번만 쌓인다 */
  function onBasicHit(m, d, crit) {
    if (st.swing !== P.combo) { st.swing = P.combo; addRage((P.atkClip === 'attack3' ? T.rageBasic3 : T.rageBasic) + (crit ? T.rageCrit : 0)); }
    onHit(m, d, crit, 'basic');
  }
  /** 받는 피해 보정(game.js 의 hurtPlayer, 방어력 계산 뒤) */
  function incoming(d, src) {
    const cut = st.bulwarkT > 0 ? DEF.bulwark.cut : st.guardT > 0 ? DEF.guard.cut : 0, out = d * (1 - cut);
    st.lastIn = { raw: d, cut, out, cast: !!st.castHit, by: src ? src.name : null, t: G.time };
    if (cut > 0 && d > 0) fx(() => vfx.hit(fwd(0.6, 1.2), { color: st.bulwarkT > 0 ? 0x9fd0ff : 0xffe9a8, scale: 0.55 }));
    return out;
  }
  function onDamaged(d, src) { st.combatT = G.time; if (st.castHit) st.lastCastHit = { dmg: d, name: st.castHit.name, mult: st.castHit.mult, cut: st.lastIn ? st.lastIn.cut : 0, t: G.time }; addRage(st.castHit ? T.rageHurtCast : T.rageHurt, 'hurt'); }
  // 출혈: 치명타·경직 없이 매초 피해만 준다
  function bleedTick(dt) {
    for (let i = st.bleeds.length - 1; i >= 0; i--) {
      const m = st.bleeds[i]; if (!alive(m) || !bleeding(m)) { m.bleedUntil = 0; st.bleeds.splice(i, 1); continue; }
      if ((m.bleedAcc -= dt) > 0) continue; m.bleedAcc += 1;
      const d = outgoing(Math.max(1, Math.round(m.bleedDmg)), m, 'rend', false); m.hp -= d; m.lastHit = G.time; st.combatT = G.time; ctx.dmgNum(m, d, 'deal');
      if (m.kind === 'boss') m.threat.set(P.id, (m.threat.get(P.id) || 0) + d); else if (!m.target) m.target = P;
      fx(() => vfx.hit(at(m, m.height * 0.5), { color: 0xff2a2a, scale: 0.4 }));
      if (m.hp <= 0) { st.bleeds.splice(i, 1); ctx.kill(m, P); }
    }
  }

  // ───────────── 시전(주인공) ─────────────
  const begin = (id, clip, speed, dur, trail = true) => { P.state = 'skill'; P.skill = id; P.t = 0; P.fx = 0; const n = P.ch.play(clip, { loop: false, restart: true, fade: 0.06, speed }); P.atkDur = dur || n; ctx.setTrail(trail); return n; };
  const faceNow = (tg) => { if (alive(tg)) ctx.face(P, tg.pos, 1, 100); };
  function endBuff(k) { if (k === 'guard') st.guardT = 0; else st.bulwarkT = 0; fxOff(st.fx[k]); st.fx[k] = null; }
  /** 기술을 쓴다 → 성공 여부. o.quiet = 실패 안내 없음(자동사냥), o.target = 대상 지정 */
  function cast(id, o = {}) {
    const d = DEF[id]; if (!d || !on()) return false; if (!st.init) init();
    const r = why(d, o); if (r) { if (!o.quiet) say(d, r); return false; }
    const tg = st.pick, combat = inCombat() || alive(P.target);
    if (d.mp) { if (id === 'spin' && st.spinProc > 0) st.spinProc = 0; else P.mp -= d.mp; }
    if (d.rage) addRage(-d.rage);
    P.cds[id] = d.cd; if (d.gcd) st.gcd = T.gcd; st.used[id] = (st.used[id] || 0) + 1; st.tg = tg;
    if (id === 'recall') { ctx.teleport(POI.plaza); }
    else if (id === 'cross') { faceNow(tg); begin(id, 'attack2', 1.3, d.anim); S('sword_swing2', { volume: 0.75, rate: 1.25 }); }
    else if (id === 'spin') { begin(id, 'skill1', 1); S('skill_spin'); }
    else if (id === 'slam') { faceNow(tg); begin(id, 'skill2', 1); S('sword_swing1'); }
    else if (id === 'charge') { faceNow(tg); begin(id, 'run', 1.9, 9); st.dustT = 0; S('sword_swing1', { volume: 0.8, rate: 0.6 }); S('footstep', { volume: 0.5, rate: 1.6 }); fx(() => vfx.dust(at(P, 0.05), { scale: 1.4 })); }
    else if (id === 'roar') { begin(id, 'skill3', 1, 0, false); S('skill_buff'); }
    else if (id === 'guard') {
      st.guardTotal = d.dur + ((spec() && spec().guardPlus) || 0); st.guardT = st.guardTotal; fxOff(st.fx.guard); S('anvil', { volume: 0.55, rate: 1.35 }); S('skill_buff', { volume: 0.45, rate: 1.5 }); engine.flash(0xfff0c0, 0.12);
      st.fx.guard = fx(() => vfx.buff(P.ch.root, { color: 0xffe08a, duration: st.guardTotal })); fx(() => vfx.shockwave(at(P, 0.05), 2.6, { color: 0xfff0b0, duration: 0.35 }));
    }
    else if (id === 'bulwark') {
      st.bulwarkT = d.dur; fxOff(st.fx.bulwark); S('anvil', { volume: 0.7, rate: 0.7 }); S('skill_buff', { volume: 0.6, rate: 0.75 }); engine.flash(0xbfdcff, 0.25); engine.shake(0.3, 0.3);
      st.fx.bulwark = fx(() => vfx.buff(P.ch.root, { color: 0x8fc8ff, duration: d.dur }));
      fx(() => { vfx.shockwave(at(P, 0.05), 3.2, { color: 0xbfe0ff, duration: 0.5 }); vfx.shockwave(at(P, 0.05), 5, { color: 0x8fc8ff, duration: 0.9 }); vfx.groundDecal(at(P, 0.05), { kind: 'circle', radius: 3, duration: d.dur, color: 0x8fc8ff }); });
    }
    else if (id === 'bolt') {
      S('magic_cast', { volume: 0.7, rate: 1.5 }); engine.flash(0xd8ecff, 0.18);
      fx(() => { vfx.teleport(at(tg, 0.05), { out: true, color: 0xa8d8ff }); vfx.hit(at(tg, tg.height * (tg.kind === 'boss' ? 0.35 : 0.6)), { color: 0xbfe6ff, scale: 1.3, crit: true }); vfx.shockwave(at(tg, 0.05), 2.2, { color: 0x9fd0ff, duration: 0.3 }); });
      hit([tg], d.hits[0][1], { id, shake: 0.28, stop: 0.06 }); interrupt(tg);   // 피해를 먼저 준다(시전 중에는 경직이 없으므로) → 그다음 시전을 끊고 비틀거리게 한다
    }
    else if (id === 'execute') { faceNow(tg); if (!(tg.hp <= tg.hpMax * d.hp)) st.execProc = 0; begin(id, 'attack3', 1.0, d.anim); S('sword_swing1', { volume: 0.9, rate: 0.75 }); }
    else if (id === 'rend') { faceNow(tg); begin(id, 'attack1', 1.0, d.anim); S('sword_swing1', { volume: 0.8, rate: 0.85 }); }
    else if (id === 'dawn') { begin(id, 'skill3', 1.7, d.anim, false); S('skill_buff', { volume: 0.8, rate: 1.3 }); }
    else if (id === 'frenzy') { faceNow(tg); begin(id, 'attack1', 1.5, d.anim); S('sword_swing1', { volume: 0.85, rate: 1.3 }); }
    else if (id === 'vow') { begin(id, 'skill3', 1.5, d.anim, false); S('skill_buff', { volume: 0.8, rate: 1.1 }); S('magic_cast', { volume: 0.5, rate: 0.8 }); }
    emitEv('skill', { id, combat }); ctx.refreshPlayerUI(); return true;
  }
  /** P.state === 'skill' 인 동안 매 프레임(game.js 의 updPlayer). 동작 시점에 맞춰 이펙트·피해를 낸다 */
  function tick(dt) {
    P.t += dt; const id = P.skill, t = P.t, tg = st.tg, d = DEF[id] || {};
    if (id === 'cross') {
      if (alive(tg)) ctx.face(P, tg.pos, dt, 14);
      if (P.fx === 0 && t >= d.hits[0][0]) { P.fx = 1; fx(() => vfx.slash(fwd(1.6, 1.15), P.yaw, { kind: 'arc2', color: 0xffe9a8, scale: 1.05 })); st.crossHit = hit(front(2.4, tg), d.hits[0][1], { id, shake: 0.16, stop: 0.04 }); }
      if (P.fx === 1 && t >= d.hits[1][0]) { P.fx = 2; fx(() => vfx.slash(fwd(1.6, 1.1), P.yaw, { kind: 'smash', color: 0xfff4d0, scale: 1.15 })); S('sword_swing1', { volume: 0.5, rate: 1.4 });
        const n = hit(front(2.4, tg), d.hits[1][1], { id, shake: 0.24, stop: 0.07 }) + (st.crossHit || 0);
        if (n) { addRage(d.gain); if (unlocked(DEF.spin) && Math.random() < T.spinProc) { st.spinProc = T.spinProcSec; P.cds.spin = 0; ctx.dmgNum(P, '칼바람!', 'miss'); S('skill_spin', { volume: 0.3, rate: 1.6 }); } } }
    }
    else if (id === 'spin') {   // 예전 회전 베기와 같은 흐름
      if (P.fx === 0 && t > d.hits[0][0]) { P.fx = 1; fx(() => vfx.slash(at(P, 1.1), P.yaw, { kind: 'spin', color: 0x9fd8ff, scale: 1.7 })); hit(near(P.pos, d.radius), d.hits[0][1], { id, shake: 0.3, stop: 0.06 }); }
      if (P.fx === 1 && t > d.hits[1][0]) { P.fx = 2; hit(near(P.pos, d.radius), d.hits[1][1], { id, shake: 0.35, stop: 0.07 }); fx(() => vfx.shockwave(at(P, 0.05), 5, { color: 0x9fd8ff, duration: 0.5 })); }
    }
    else if (id === 'slam') {   // 예전 도약 강타 + 짧은 기절
      if (t > 0.28 && t < 0.62 && alive(tg)) { const dd = dist2(tg.pos, P.pos); if (dd > 2.2 + (tg.kind === 'boss' ? 4 : 0)) { const s = Math.min(dd, 26 * dt); P.pos.x += (tg.pos.x - P.pos.x) / dd * s; P.pos.z += (tg.pos.z - P.pos.z) / dd * s; } }
      if (P.fx === 0 && t > d.hits[0][0]) { P.fx = 1; world.resolve(P.pos, P.r); const c = fwd(1.8, 0.05);
        fx(() => { vfx.slash(c.clone().setY(1), P.yaw, { kind: 'smash', color: 0xffd28a, scale: 1.8 }); vfx.shockwave(c, 6, { color: 0xffb060, duration: 0.6 }); vfx.groundDecal(c, { kind: 'crack', radius: 3.4, duration: 5, color: 0xff8030 }); });
        const list = near(c, d.radius); hit(list, d.hits[0][1], { id, shake: 0.7, stop: 0.12 }); for (const m of list) stun(m, d.stun); S('skill_slam'); engine.flash(0xffe0b0, 0.25); }
    }
    else if (id === 'charge') {
      if (P.fx === 0) {   // 돌진: 대상 앞까지 미끄러지듯 달린다
        const dd = alive(tg) ? dist2(tg.pos, P.pos) : 0, stop = 2.0 + (tg && tg.kind === 'boss' ? 4 : 0);
        if (alive(tg) && dd > stop && t < 0.9) {
          const s = Math.min(dd - stop * 0.9, d.speed * dt); P.pos.x += (tg.pos.x - P.pos.x) / dd * s; P.pos.z += (tg.pos.z - P.pos.z) / dd * s; world.resolve(P.pos, P.r); ctx.face(P, tg.pos, 1, 100);
          if ((st.dustT -= dt) <= 0) { st.dustT = 0.05; fx(() => vfx.footDust(at(P, 0.05))); }
        } else { P.fx = 1; st.t0 = t; P.atkDur = t + d.anim; P.ch.play('attack3', { loop: false, restart: true, fade: 0.05, speed: 1.5 }); S('sword_swing2', { volume: 0.8, rate: 0.9 }); }
      } else if (P.fx === 1 && t - st.t0 >= d.hits[0][0]) { P.fx = 2; const c = fwd(1.5, 0.05);
        fx(() => { vfx.slash(c.clone().setY(1.1), P.yaw, { kind: 'arc1', color: 0xffa040, scale: 1.35 }); vfx.shockwave(c, 3.2, { color: 0xffb060, duration: 0.4 }); });
        const list = front(2.6, tg); if (hit(list, d.hits[0][1], { id, shake: 0.45, stop: 0.1 })) { addRage(d.gain); S('boss_slam', { volume: 0.4, rate: 1.6 }); } for (const m of list) stun(m, d.stun); }
    }
    else if (id === 'roar') {   // 예전 포효(옛 이름 사자후)와 같은 흐름
      if (P.fx === 0 && t > 0.3) { P.fx = 1; P.buffT = d.dur; fx(() => { vfx.buff(P.ch.root, { color: 0xffc040, duration: d.dur }); vfx.shockwave(at(P, 0.05), 6, { color: 0xffd060, duration: 0.7 }); }); engine.shake(0.3, 0.4); ctx.refreshPlayerUI(); }
    }
    else if (id === 'execute') {
      if (alive(tg)) ctx.face(P, tg.pos, dt, 14);
      if (P.fx === 0 && t >= d.hits[0][0]) { P.fx = 1; const c = fwd(1.7, 0.05);
        fx(() => { vfx.slash(c.clone().setY(1.05), P.yaw, { kind: 'smash', color: 0xff3a2a, scale: 1.7 }); vfx.shockwave(c, 3.4, { color: 0xff5030, duration: 0.45 }); vfx.groundDecal(c, { kind: 'crack', radius: 2.2, duration: 3, color: 0xff3020 }); });
        if (alive(tg)) { hit([tg], d.hits[0][1], { id, shake: 0.65, stop: 0.15 }); if (tg.dead) addRage(T.rageExecKill); } S('skill_slam', { volume: 0.9, rate: 1.25 }); engine.flash(0xff5030, 0.2); }
    }
    else if (id === 'rend') {
      if (alive(tg)) ctx.face(P, tg.pos, dt, 14);
      if (P.fx === 0 && t >= d.hits[0][0]) { P.fx = 1; fx(() => vfx.slash(fwd(1.6, 1.15), P.yaw, { kind: 'arc1', color: 0xff2a3a, scale: 1.15 }));
        if (alive(tg) && hit([tg], d.hits[0][1], { id, shake: 0.2, stop: 0.06 }) && !tg.dead) { tg.bleedUntil = G.time + d.dotSec + 0.05; tg.bleedTotal = d.dotSec; tg.bleedAcc = 1; tg.bleedDmg = ctx.atkPower() * d.dot; if (!st.bleeds.includes(tg)) st.bleeds.push(tg); S('monster_hurt', { volume: 0.5, pos: tg.pos }); } }
    }
    else if (id === 'dawn') {
      if (P.fx === 0 && t >= 0.18) { P.fx = 1; heal(d.heal); fx(() => { vfx.heal(P.ch.root); vfx.buff(P.ch.root, { color: 0xfff0b0, duration: 1.2 }); vfx.shockwave(at(P, 0.05), 3, { color: 0xfff0c0, duration: 0.5 }); }); S('potion', { volume: 0.45, rate: 0.8 }); engine.flash(0xfff4d0, 0.15); ctx.refreshPlayerUI(); }
    }
    else if (id === 'frenzy') {
      if (alive(tg)) ctx.face(P, tg.pos, dt, 14);
      if (P.fx === 0 && t >= d.hits[0][0]) { P.fx = 1; fx(() => vfx.slash(fwd(1.6, 1.2), P.yaw, { kind: 'arc1', color: 0xff6a20, scale: 1.25 })); hit(front(2.4, tg), d.hits[0][1], { id, shake: 0.3, stop: 0.06 }); }
      if (P.fx === 1 && t >= 0.3) { P.fx = 2; P.ch.play('attack2', { loop: false, restart: true, fade: 0.04, speed: 1.5 }); S('sword_swing2', { volume: 0.85, rate: 1.3 }); }
      if (P.fx === 2 && t >= d.hits[1][0]) { P.fx = 3; fx(() => { vfx.slash(fwd(1.6, 1.05), P.yaw, { kind: 'arc2', color: 0xff4a18, scale: 1.3 }); if (alive(tg)) vfx.flameBurst(at(tg, 0.4), { scale: 0.55 }); }); hit(front(2.4, tg), d.hits[1][1], { id, shake: 0.45, stop: 0.1 }); S('fire', { volume: 0.4, rate: 1.3 }); }
    }
    else if (id === 'vow') {
      if (P.fx === 0 && t >= d.hits[0][0]) { P.fx = 1;
        fx(() => { vfx.lootBeam(at(P, 0), { color: 0xffe9a0, duration: 1.4 }); vfx.shockwave(at(P, 0.05), d.radius, { color: 0xffe9a0, duration: 0.6 }); vfx.groundDecal(at(P, 0.05), { kind: 'circle', radius: d.radius * 0.9, duration: 1.5, color: 0xffe9a0 }); vfx.heal(P.ch.root); });
        hit(near(P.pos, d.radius), d.hits[0][1], { id, shake: 0.4, stop: 0.08 }); heal(d.heal); engine.flash(0xfff0c0, 0.2); ctx.refreshPlayerUI(); }
    }
    if (P.t >= P.atkDur) { P.state = 'idle'; ctx.setTrail(false); }
  }
  /** 단축키(1~0, E, T). game.js 의 keydown 이 부른다 → 기술 키였는가 */
  function key(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return false;
    let d = SKILL_DEFS.find(x => x.code === e.code && (!x.spec || x.spec === P.spec)); if (!d && e.code === 'KeyE') d = { spec: true };
    if (!d) return false;
    if (!d.id) { if (!e.repeat) toast(P.level < T.specLevel ? `전문화 기술은 Lv.${T.specLevel}에 전문화를 고르면 생깁니다.` : '기술 창에서 전문화를 먼저 고르세요.'); return true; }
    cast(d.id, { quiet: !!e.repeat }); return true;
  }

  // ───────────── 적의 시전과 차단 ─────────────
  const castKind = (m) => (m.kind === 'boss' ? 'boss' : m.raider ? 'raider' : m.named ? 'named' : m.elite ? 'elite' : null);
  /** 시전을 시작시킨다(def 로 name·total·mult·canInterrupt 를 정할 수 있다. 몬스터의 m.castDef 도 같은 뜻) → 성공 여부 */
  function startCast(m, def = {}) {
    if (!on() || !alive(m) || m.cast || !isFoe(m)) return false;
    const c = CAST_DEFS[castKind(m) || 'elite'], own = m.castDef || {}, boss = m.kind === 'boss';
    const total = def.total || own.total || rand(c.total[0], c.total[1]), mult = def.mult || own.mult || rand(c.mult[0], c.mult[1]);
    const name = def.name || own.name || c.name || CAST_NAME[m.tag] || '맹렬한 일격';
    m.cast = { name, t: 0, total, mult, canInterrupt: def.canInterrupt !== false && own.canInterrupt !== false, pulse: 0, fx: [] }; st.caster = m; st.casts++;
    // 동작: 공격 동작을 느리게 돌려 힘을 모으는 모습으로(타격 시점이 시전 끝과 맞는다)
    const clip = boss ? (m.ch.has('skill2') ? 'skill2' : 'attack1') : (m.ch.has('attack2') ? 'attack2' : 'attack1');
    const hitAt = m.ch.event(clip, 'hit') ?? m.ch.event(clip, 'cast') ?? m.ch.dur(clip) * 0.5;
    m.ch.play(clip, { loop: false, restart: true, fade: 0.12, speed: clamp(hitAt / total, 0.08, 1) });
    if (!boss) { m.state = 'idle'; m.moveTo = null; }
    m.cast.fx.push(fx(() => vfx.telegraph(at(m, boss ? 0.62 : 0.05), boss ? 7 : m.range + 2.0, total, { color: 0xff5a2a })), fx(() => vfx.buff(m.ch.root, { color: 0xff7a30, duration: total + 0.3 })));
    hud.bubble(m.id, `${name}!`, total * 1000); S(boss ? 'boss_roar' : 'magic_cast', { pos: m.pos, volume: boss ? 0.6 : 0.5, rate: boss ? 1.3 : 0.7 });
    return true;
  }
  function endCast(m, lockSec) {
    const c = m.cast; if (!c) return; for (const h of c.fx) fxOff(h); hud.bubble(m.id, null); m.cast = null;
    const k = CAST_DEFS[castKind(m) || 'elite']; m.castCd = Math.max(rand(k.every[0], k.every[1]), lockSec || 0); if (lockSec) m.castLock = G.time + lockSec;
    if (st.caster === m) st.caster = null; st.castNext = G.time + T.castGap;
  }
  /** 시전을 끊는다(뇌전검) → 끊었는가 */
  function interrupt(m) {
    const c = m && m.cast; if (!c || !c.canInterrupt) return false;
    const boss = m.kind === 'boss'; endCast(m, boss ? T.bossCastLock : T.castLock); st.interrupts++;
    ctx.dmgNum(m, '차단!', 'deal'); hud.toast(`[${c.name}] 차단!`, 'info'); S('crit', { volume: 0.9, rate: 0.8 }); addRage(T.rageInterrupt);
    fx(() => vfx.hit(at(m, m.height * (boss ? 0.5 : 1.0)), { color: 0xe8f4ff, scale: boss ? 2.2 : 1.1, crit: true }));
    if (m.dead) return true;                                                                // 뇌전검에 쓰러졌다
    if (boss) { m.state = 'idle'; m.cool = 1.5; m.ch.play('idle'); } else { m.state = 'hit'; m.t = 0.9; m.ch.play('hit', { loop: false, restart: true, fade: 0.05 }); }
    return true;
  }
  function castTick(m, dt) {
    const c = m.cast, boss = m.kind === 'boss'; c.t += dt; if (!P.dead) ctx.face(m, P.pos, dt, boss ? 2.5 : 5);
    if ((c.pulse -= dt) <= 0) { c.pulse = 0.4; fx(() => vfx.hit(at(m, m.height * (boss ? 0.8 : 1.05)), { color: 0xff7030, scale: (0.35 + 0.35 * c.t / c.total) * (boss ? 2.4 : 1) })); }   // 머리 위에서 점점 커지는 불티
    if (P.dead || (!boss && m.target !== P)) { endCast(m); if (!boss) m.cool = 0.6; return; }
    if (c.t < c.total) return;
    const R = boss ? 22 : m.range + 2.2; endCast(m);
    if (edge(m) < R) {
      fx(() => { vfx.slash(at(P, 1.2), m.yaw, { kind: 'smash', color: boss ? 0xff6a20 : 0xff5a2a, scale: boss ? 2.4 : 1.5 }); vfx.shockwave(at(P, 0.05), boss ? 5 : 3, { color: 0xff5a2a, duration: 0.45 }); if (boss) vfx.flameBurst(at(P, 0.6), { scale: 1.4 }); });
      S(boss ? 'boss_slam' : 'skill_slam', { pos: P.pos, volume: 0.8, rate: boss ? 1 : 1.4 }); engine.shake(0.5, 0.35);
      st.castHit = c; st.castHits++; try { ctx.hurtPlayer(m.atk * c.mult * rand(0.95, 1.05), m); } finally { st.castHit = null; }
    } else ctx.dmgNum(P, '빗나감', 'miss');
    m.state = 'idle'; m.cool = boss ? rand(1.0, 2.0) : rand(0.8, 1.4); if (boss) m.ch.play('idle');
  }
  /** 살아 있는 몬스터마다 매 프레임(game.js 의 updMonster 앞머리) → true 면 이번 프레임의 몬스터 AI 를 건너뛴다 */
  function monTick(m, dt) {
    if (stunned(m)) return true;
    if (m.cast) { castTick(m, dt); return true; }
    if (!(m.elite || m.named || m.raider) || m.target !== P || P.dead || G.talk) return false;
    const d = dist2(m.pos, P.pos); if (d > 9) return false;
    if (m.castCd === undefined || m.castFor !== (m.elite || m.named || m.raider)) { const k = CAST_DEFS[castKind(m)]; m.castCd = rand(k.first[0], k.first[1]); m.castFor = m.elite || m.named || m.raider; }   // 정예가 된 뒤 처음 붙었을 때
    m.castCd -= dt;
    if (m.castCd > 0 || m.state !== 'idle' || d > m.range + 1.2 || st.caster || G.time < st.castNext || G.time < (m.castLock || 0)) return false;
    return startCast(m);
  }
  /** 보스 매 프레임(game.js 의 updBoss, 기존 공격을 고르기 직전) → true 면 기존 패턴을 건너뛴다. 기존 장판·유성은 그대로다 */
  function bossTick(B, tg, dt) {
    if (B.cast) { castTick(B, dt); return true; }
    if (B.state === 'cast' || P.dead || B.dead) return false;                               // 기존 공격 동작 중에는 끼어들지 않는다
    if (B.castCd === undefined) B.castCd = rand(CAST_DEFS.boss.first[0], CAST_DEFS.boss.first[1]);
    B.castCd -= dt;
    if (B.castCd > 0 || edge(B) > 26 || G.time < (B.castLock || 0) || st.caster) return false;
    return startCast(B);
  }

  // ───────────── 자동사냥 순환 ─────────────
  function view(tg, d, nearCount, instantOnly) {
    const c = st.caster, cc = alive(c) && c.cast && c.cast.canInterrupt && c.cast.t > 0.3 ? c.cast : null;
    return { ready: (id) => !why(DEF[id], { target: tg }), instantOnly: !!instantOnly, casting: !!cc, castLeft: cc ? cc.total - cc.t : 9, guarded: st.guardT > 0 || st.bulwarkT > 0,
      hpPct: P.hp / P.hpMax, mpPct: P.mp / P.mpMax, dist: d, near: nearCount, boss: !!tg && tg.kind === 'boss', tgHpPct: tg ? tg.hp / tg.hpMax : 1, tgTough: !!tg && tg.hp > ctx.atkPower() * 5,
      bleed: !!tg && tg.bleedUntil > G.time + 1, roar: P.buffT > 0, procSpin: st.spinProc > 0, procExec: st.execProc > 0 };
  }
  /** game.js 의 autoHunt 가 부른다: 우선순위대로 기술 하나를 쓴다 → 썼는가 */
  function rotation(tg, d, nearCount) {
    if (!on() || P.dead || !alive(tg)) return false;
    const id = chooseSkill(view(tg, d, nearCount)); return id ? cast(id, { quiet: true, target: tg }) : false;
  }
  // 자동사냥 중에는 동작 한가운데서도 차단·방어(즉시 기술)를 쓴다
  function react() {
    const c = st.caster; if (!c && P.hp > P.hpMax * 0.35) return;
    const tg = alive(c) ? c : alive(P.target) ? P.target : null, id = chooseSkill(view(tg, tg ? edge(tg) : 99, 0, true));
    if (id) cast(id, { quiet: true, target: tg });
  }

  // ───────────── HUD · 창 ─────────────
  const order = () => SKILL_DEFS.filter(d => !d.spec || d.spec === P.spec);
  const costText = (d) => [d.mp ? `내력 ${d.mp}` : '', d.rage ? `투지 ${d.rage}` : '', d.gain ? `투지 +${d.gain}` : ''].filter(Boolean).join(' · ') || '없음';
  const usable = (d) => { if (!unlocked(d) || (d.mp && P.mp < d.mp && !(d.id === 'spin' && st.spinProc > 0)) || (d.rage && (P.rage || 0) < d.rage)) return false;
    if (d.id === 'execute') { const tg = alive(P.target) ? P.target : null; return st.execProc > 0 || (!!tg && tg.hp <= tg.hpMax * d.hp); } return true; };
  /** HUD 기술 단추 목록(계약: id name icon key cd cdLeft mp enabled + sheet rage gain lv locked desc kind) */
  function hudList() {
    return order().map(d => ({ id: d.id, name: d.name, icon: d.icon, sheet: d.sheet, key: d.key, cd: d.cd, cdLeft: Math.max(0, P.cds[d.id] || 0), mp: d.mp, rage: d.rage, gain: d.gain, lv: d.lv, locked: !unlocked(d), enabled: usable(d), desc: d.desc, kind: d.kind }));
  }
  function buffList() {
    const out = [];
    if (P.buffT > 0) out.push({ id: 'roar', icon: 6, sheet: 0, name: DEF.roar.name, remain: P.buffT, total: DEF.roar.dur });
    if (st.guardT > 0) out.push({ id: 'guard', icon: 4, sheet: 0, name: DEF.guard.name, remain: st.guardT, total: st.guardTotal });
    if (st.bulwarkT > 0) out.push({ id: 'bulwark', icon: 4, sheet: 1, name: DEF.bulwark.name, remain: st.bulwarkT, total: DEF.bulwark.dur });
    if (st.spinProc > 0) out.push({ id: 'p_spin', icon: 2, sheet: 0, name: '칼바람 — 회전 베기 무료', remain: st.spinProc, total: T.spinProcSec });
    if (st.execProc > 0) out.push({ id: 'p_exec', icon: 1, sheet: 1, name: '단죄의 각인 — 단죄의 일격 사용 가능', remain: st.execProc, total: T.execProcSec });
    return out;
  }
  /** 대상에게 걸린 약화 효과(hud.setTarget 의 debuffs) */
  function debuffs(m) {
    if (!m) return undefined; const out = [];
    if (bleeding(m)) out.push({ icon: 2, sheet: 1, name: '출혈', remain: m.bleedUntil - G.time, total: m.bleedTotal || DEF.rend.dotSec });
    if (stunned(m)) out.push({ icon: 3, sheet: 0, name: '기절', remain: m.stunUntil - G.time, total: 1 });
    return out;
  }
  /** 0.12초마다(game.js 의 메인 루프): 기술 단추·투지 막대·버프 줄 */
  function hudTick() {
    if (!st.init) return;
    if (st.dirty) { st.dirty = false; hud.setSkills(hudList()); }
    const g = st.gcd > 0 ? st.gcd / T.gcd : 0;
    for (const d of order()) hud.updateSkill(d.id, { cdLeft: Math.max(0, P.cds[d.id] || 0), enabled: usable(d), active: (P.state === 'skill' && P.skill === d.id) || (d.id === 'guard' && st.guardT > 0) || (d.id === 'bulwark' && st.bulwarkT > 0),
      proc: (d.id === 'spin' && st.spinProc > 0) || (d.id === 'execute' && st.execProc > 0), gcd: d.gcd ? g : 0 });
    hud.setResource({ rage: Math.round(P.rage || 0), rageMax: T.rageMax });
    const b = buffList(); if (b.length || st.hadBuffs) hud.setBuffs(b); st.hadBuffs = b.length > 0;
  }
  function skillsWin() {
    const data = { spec: P.spec, specName: spec() ? spec().name : null, specLevel: T.specLevel, canSpec: P.level >= T.specLevel, respecCost: respecCost(),
      rage: { name: '투지', cur: Math.round(P.rage || 0), max: T.rageMax, desc: '기본 공격·피격·[십자 베기]·[선봉 돌파]로 쌓이고, 전투를 벗어나면 서서히 줄어든다.' },
      list: SKILL_DEFS.filter(d => !d.spec || d.spec === P.spec || !P.spec).map(d => ({ id: d.id, name: d.name, icon: d.icon, sheet: d.sheet, key: d.key, lv: d.lv, learned: unlocked(d), desc: d.desc, cost: costText(d), cd: d.cd, mp: d.mp, rage: d.rage, gain: d.gain, kind: d.kind, spec: d.spec || null })) };
    // 기술 창이 새 계약(객체)을 받기 전까지: 예전 창(배열을 돈다)에서도 목록이 보이도록 반복할 수 있게 해 둔다. 새 창은 data.list 를 읽으면 된다
    Object.defineProperty(data, Symbol.iterator, { enumerable: false, value: function* () { for (const r of data.list) yield { ...r, level: r.lv, desc: (r.learned ? '' : r.spec ? `[전문화 ${SPEC[r.spec].name}] ` : `[Lv.${r.lv}에 익힘] `) + r.desc + ` (${r.cost})` }; } });
    win.skills.set(data);
  }
  sys.on('windows', () => { if (on()) skillsWin(); });

  // ───────────── 저장 · 레벨업 ─────────────
  sys.on('save', (out) => { out.spec = P.spec || null; });
  sys.on('load', (d) => { const k = d && d.spec; P.spec = SPEC[k] ? k : null; P.rage = 0; st.sig = ''; st.dirty = true; st.wantSpec = false; if (!G.demo) applyBonus(); });   // 예전 저장본에는 spec 이 없다 → 전문화 없음
  sys.on('levelUp', () => {
    if (!on()) return; if (!st.init) init();
    const got = SKILL_DEFS.filter(d => !d.spec && d.lv === P.level && d.lv > 1);
    for (const d of got) { const t = `새 기술 [${d.name}]${josa(d.name, '을', '를')} 익혔습니다! (단축키 ${d.key})`; hud.notice(t, 'info'); sysChat(t + ' ' + d.desc); }
    if (got.length) S('quest_done', { volume: 0.6, delay: 0.6 });
    if (P.level === T.specLevel && !P.spec) { const t = `Lv.${T.specLevel} 달성! 전문화(수호·격노·서약) 가운데 하나를 고를 수 있습니다.`; hud.notice(t, 'info'); sysChat(t + ' 기술 창에서 고릅니다.'); st.wantSpec = true; st.wantAt = G.time; }
    st.dirty = true;
  });

  // ───────────── 시작 · 매 프레임 ─────────────
  function init() {
    st.init = true; P.rage = 0; st.sig = ''; applyBonus(); hud.setSkills(hudList()); hud.setResource({ rage: 0, rageMax: T.rageMax });
    if (P.level >= T.specLevel && !P.spec) sysChat(`전문화(수호·격노·서약)를 고를 수 있습니다. 기술 창을 여세요. (Lv.${T.specLevel} 이상)`);
  }
  function update(dt, rawDt) {
    if (!on()) return; if (!st.init) init();
    if (st.gcd > 0) st.gcd = Math.max(0, st.gcd - dt);
    if (st.guardT > 0 && (st.guardT -= dt) <= 0) endBuff('guard');
    if (st.bulwarkT > 0 && (st.bulwarkT -= dt) <= 0) endBuff('bulwark');
    if (st.spinProc > 0) st.spinProc -= dt; if (st.execProc > 0) st.execProc -= dt; if (st.execIcd > 0) st.execIcd -= dt;
    if (P.dead) { if (P.rage || st.guardT > 0 || st.bulwarkT > 0) { P.rage = 0; endBuff('guard'); endBuff('bulwark'); st.spinProc = st.execProc = 0; } }
    else {
      if (!inCombat() && P.rage > 0) P.rage = Math.max(0, P.rage - T.rageDecay * dt);
      const s = spec(); if (s && s.regen) P.mp = Math.min(P.mpMax, P.mp + s.regen * dt);
      if (G.auto) react();
    }
    applyBonus(); bleedTick(dt);
    const c = st.caster; if (c && (!alive(c) || !c.cast)) { if (c.cast) endCast(c); st.caster = null; }
    // 대상(또는 나를 노리는 적)의 시전 막대
    const show = alive(P.target) && P.target.cast ? P.target : st.caster;
    if (show && show.cast) { hud.setCast({ name: show.cast.name, t: show.cast.t, total: show.cast.total, canInterrupt: show.cast.canInterrupt, id: show.id, by: show.name }); st.castShown = true; }
    else if (st.castShown) { st.castShown = false; hud.setCast(null); }
    // 전문화 안내: Lv.10 이 된 뒤 전투가 잠잠해지면 선택 창을 연다(한 번). 자동사냥 중이면 전투가 끊기지 않으므로 12초 뒤에 그냥 띄운다
    const want = P.level >= T.specLevel && !P.spec; if (want !== st.badge) { st.badge = want; hud.setMenuBadge('skills', want ? true : 0); }
    if (G.talk) { st.talkT = G.time; if (st.dlg) { st.dlg = false; st.wantSpec = true; st.wantAt = G.time; } }   // 임시 대화창이 이야기 대사에 밀려났다 → 대사가 끝난 뒤 다시 묻는다
    if (st.wantSpec && want && (!inCombat() || (G.auto && G.time - (st.wantAt || 0) > 12)) && !G.talk && G.time - (st.talkT || -9) > 1.5 && !P.dead && !(G.raid && G.raid.active)) { st.wantSpec = false; openSpec(); }
  }
  sys.on('update', update);

  return {
    DEFS: SKILL_DEFS, SPECS, TUNE: T, CASTS: CAST_DEFS,
    on, cast, tick, key, rotation, pickSpec, openSpec, startCast, interrupt, monTick, bossTick,
    onBasicHit, onDamaged, incoming, outgoing, hudList, hudTick, debuffs, buffs: buffList, specView,
    list: () => hudList(),
    canCast: (id, o) => (DEF[id] ? why(DEF[id], o) : 'none'),            // 못 쓰는 까닭(쓸 수 있으면 null)
    /** 시험용: 현재 상태 */
    state() {
      return { on: on(), init: st.init, rage: P.rage, rageMax: T.rageMax, gcd: st.gcd, cds: { ...P.cds }, spec: P.spec, bonus: specBonus(), respecCost: respecCost(), guard: st.guardT, bulwark: st.bulwarkT, roar: P.buffT,
        procSpin: st.spinProc, procExec: st.execProc, execIcd: st.execIcd, combat: inCombat(), unlocked: SKILL_DEFS.filter(unlocked).map(d => d.id), used: { ...st.used }, casts: st.casts, castHits: st.castHits, interrupts: st.interrupts,
        lastIn: st.lastIn, lastCastHit: st.lastCastHit, caster: st.caster && st.caster.cast ? { id: st.caster.id, name: st.caster.name, cast: st.caster.cast.name, t: st.caster.cast.t, total: st.caster.cast.total, mult: st.caster.cast.mult } : null,
        bleeds: st.bleeds.length, events: st.ev.slice(-30) };
    },
    /** 시험용: 투지·대기·발동 효과를 직접 만진다 */
    test: { setRage: (n) => { if (!st.init) init(); P.rage = clamp(+n || 0, 0, T.rageMax); }, resetCds: () => { for (const k in P.cds) P.cds[k] = 0; st.gcd = 0; st.execIcd = 0; }, proc: (k) => { if (k === 'spin') { st.spinProc = T.spinProcSec; P.cds.spin = 0; } else { st.execProc = T.execProcSec; } },
      clearProcs: () => { st.spinProc = st.execProc = st.execIcd = 0; }, clearCastTimers: () => { st.castNext = 0; }, quietCombat: () => { st.combatT = -99; } },
  };
}
