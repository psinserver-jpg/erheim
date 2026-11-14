// 장르 핵심 시스템(v2): 장비·능력치·방어구 강화·상점·설정·저장.
// game.js 는 여기의 훅만 부른다: derive / atkBonus / critChance / mitigate / onKill / onBossDead / onLevelUp / onDeath / update / save / load / refreshWindows
// 녹화용 자동 모드(G.demo)에서는 새 공식·드랍·알림이 전부 꺼진다(이전과 똑같이 동작).
//
// ── 확장 지점: D 사망 벌점 · E 습격 · F 정예 · G 도감/보급 귀환은 fieldsys.js 가 아래 이벤트로 붙는다 ──────────────────────
//   sys.on('kill', (m) => …)            주인공이 잡은(또는 8m 안에서 죽은) 몬스터마다. !G.demo 일 때만 온다
//   sys.on('bossDead', (B, loot) => …)  보스 처치(결과 창 직전). loot 배열에 { icon, name, rarity } 를 넣으면 결과 창에 보인다
//   sys.on('death', (src, view) => …)   주인공 사망(!G.demo). src = 마지막으로 때린 엔티티(없을 수 있다). view.by / view.note 를 채우면 사망 창에 나온다
//   sys.on('levelUp', () => …)          레벨업마다(!G.demo)
//   sys.on('update', (dt, rawDt) => …)  매 프레임
//   sys.on('load', (d) => …) / sys.on('save', (out) => …)   저장 내용 추가(P.fame / P.codex 는 이미 저장·복원된다)
//   sys.on('windows', () => …)          refreshWindows() 끝(여기서 win.codex.set 을 부르면 된다)
//   sys.setBonus('codex', { atk, hp, def })   영구 보너스 출처 등록 → derive() 가 합산한다
//   sys.dropGear(tier, pos, { up, force }) / sys.giveScroll('w'|'a', n, pos) / sys.buy / sys.sell / sys.sellAll  보상·보급용
import { SLOTS, SLOT_LABEL, RARITY_NAME, RARITY_COLOR, BAG_CAP, ICON, BASES, TRIAL_GEAR, DROP, ARMOR_SCROLL_RATE, ARMOR_SCROLL_RATE_STORY, SHOP,
  makeItem, effStat, sumStats, itemScore, statLines, itemDesc, sellPrice, rollDrop, rollBossDrop, fitsSlot, packItem, unpackItem, josa } from './items.js';
import { installField } from './fieldsys.js';

const nf = (n) => Math.round(n).toLocaleString('ko-KR');
const WEAPON_DESC = { '낡은 장검': '날이 무뎌진 훈련용 장검. 쥔 손만큼은 정직하다.', '여명의 장검': '브롬의 가문이 백 년 동안 날만 갈며 주인을 기다린 검.' };

export function installSystems(ctx) {
  const { G, P, ui, hud, win, vfx, S, engine, sound, RATES, GUILDS } = ctx;
  const hooks = {};
  const on = (ev, fn) => { (hooks[ev] = hooks[ev] || []).push(fn); };
  const fire = (ev, ...a) => { for (const f of hooks[ev] || []) { try { f(...a); } catch (e) { console.error('[sys:' + ev + ']', e); } } };
  const toast = (t) => hud.toast(t, 'info');
  const sysChat = (text) => hud.chat.add({ channel: 'system', text });

  // ═════════════ C. 설정 ═════════════
  const CFG = { master: 80, bgm: 60, sfx: 85, quality: '높음', damage: true, plates: true, shake: true, autoPotion: true, potionAt: '60%', autoEquip: true, autoSupply: true };
  let live = false;          // 직접 플레이가 시작됐는가(main.js 의 start 가 sys.start 를 부른다). 자동 모드에서는 끝까지 false
  let qNow = '높음';
  function applyVolume() { try { sound && sound.setVolume && sound.setVolume({ master: CFG.master / 100, bgm: CFG.bgm / 100, sfx: CFG.sfx / 100, amb: CFG.sfx / 100 * 0.7 }); } catch (e) { } }
  // 그래픽 품질: 엔진이 내놓은 것(bloom 패스, 태양 그림자)만 건드린다. 낮음 = 빛 번짐·그림자 끔, 보통 = 그림자 해상도 절반
  function applyQuality() {
    const q = ['낮음', '보통', '높음'].includes(CFG.quality) ? CFG.quality : '높음'; if (q === qNow) return; qNow = q;
    try {
      if (typeof engine.setQuality === 'function') { engine.setQuality(q); return; }   // 엔진이 품질표를 직접 관리하면 그쪽에 맡긴다(아래는 그런 엔진이 아닐 때의 예전 방식)
      if (engine.bloom) engine.bloom.enabled = q !== '낮음';
      const sun = engine.sun;
      if (sun && sun.shadow) { sun.castShadow = q !== '낮음'; const size = q === '높음' ? 2048 : 1024;
        if (sun.shadow.mapSize.x !== size) { sun.shadow.mapSize.set(size, size); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } } }
    } catch (e) { console.warn('[sys] quality', e); }
  }
  function setting(key, value) {
    if (!(key in CFG) || value === undefined) return; CFG[key] = value;
    if (key === 'master' || key === 'bgm' || key === 'sfx') applyVolume(); else if (key === 'quality') applyQuality();
  }
  function applySettings(d) { if (d) for (const k in CFG) if (d[k] !== undefined && d[k] !== null) CFG[k] = d[k]; applyVolume(); applyQuality(); }
  ui.on('setting', (d) => { if (d && d.key) setting(d.key, d.value); });
  // 화면 흔들림 끄기: 엔진의 shake 를 한 번 감싼다(자동 모드는 그대로 통과)
  const shake0 = engine.shake;
  engine.shake = (amp, dur) => { if (!G.demo && CFG.shake === false) return; return shake0(amp, dur); };
  const potOn = () => G.demo || CFG.autoPotion !== false;
  const potAlways = () => live && !G.demo;   // 직접 플레이: 자동 물약 설정은 자동사냥이 아닐 때도 듣는다(자동 모드는 자동사냥 중에만)
  const potAt = () => { if (G.demo) return 0.6; const v = parseInt(CFG.potionAt, 10); return v >= 10 && v <= 95 ? v / 100 : 0.6; };
  const showDamage = () => G.demo || CFG.damage !== false;
  const showPlates = () => G.demo || CFG.plates !== false;

  // ═════════════ A. 장비 · 능력치 ═════════════
  let uidN = 1; const newUid = () => 'e' + (uidN++);
  // 처음 상태 = 체험 캐릭터(Lv.14). 계정 모드는 loadProfile → load() 가 덮어쓴다
  P.inv = []; P.eq = {}; P.armorScrolls = 7; P.crystals = 34; P.pts = 3 * (P.level - 1); P.alloc = { str: 0, dex: 0, con: 0, wis: 0 }; P.fame = 0; P.codex = {};
  for (const g of TRIAL_GEAR) { const it = makeItem(g.base, g.rarity, g.plus, newUid()); if (!it) continue; P.inv.push(it); if (g.equip) P.eq[it.slot] = it.uid; }

  const findItem = (uid) => P.inv.find(it => it.uid === uid) || null;
  const slotOf = (uid) => SLOTS.find(s => P.eq[s] === uid) || null;
  const equippedItems = () => SLOTS.map(s => (P.eq[s] ? findItem(P.eq[s]) : null)).filter(Boolean);
  const fullName = (it) => (it.plus ? '+' + it.plus + ' ' : '') + it.name;
  const eqCopy = () => { const o = {}; for (const s of SLOTS) if (P.eq[s]) o[s] = P.eq[s]; return o; };   // 칸 순서를 고정해서 복사(저장 내용이 매번 같게)
  const bagCount = () => { let n = 0; for (const it of P.inv) if (!slotOf(it.uid)) n++; return n; };   // 가방 칸을 쓰는 것은 미착용 장비뿐(착용 장비·물약·주문서는 칸을 차지하지 않는다)

  // 영구 보너스 출처(2차: 도감). setBonus('codex', { atk: 2, hp: 40, def: 6 })
  const bonus = {};
  function setBonus(src, b) { bonus[src] = b || {}; derive(); ctx.refreshPlayerUI(); }
  function bonusSum() { const t = { atk: 0, hp: 0, def: 0, mp: 0, crit: 0 }; for (const k in bonus) for (const s in t) t[s] += +bonus[k][s] || 0; return t; }

  // 파생 능력치: 레벨 기본값(P.baseHp / P.baseMp / P.atk) + 스탯 + 장비 + 보너스 → P.hpMax / P.mpMax / P.def / P.crit / P.bonusAtk
  // 레벨업·장착·해제·분배·불러오기 때마다 부른다. 자동 모드는 이전 수치 그대로(기본값만).
  function derive() {
    if (G.demo) { P.hpMax = P.baseHp; P.mpMax = P.baseMp; P.def = 0; P.crit = 0.24; P.bonusAtk = 0; }
    else {
      const e = sumStats(equippedItems()), b = bonusSum(), a = P.alloc;
      P.hpMax = Math.round(P.baseHp + a.con * 18 + e.hp + b.hp);
      P.mpMax = Math.round(P.baseMp + a.wis * 10 + e.mp + b.mp);
      P.def = Math.round(P.level * 2 + e.def + b.def);
      P.crit = Math.min(0.6, 0.10 + a.dex * 0.006 + e.crit + b.crit);
      P.bonusAtk = a.str * 2 + e.atk + b.atk;
    }
    if (P.hp > P.hpMax) P.hp = P.hpMax; if (P.mp > P.mpMax) P.mp = P.mpMax;
    if (!G.demo && P.ch && P.ch.shield) P.ch.shield.visible = !!P.eq.shield;   // 방패 칸이 비면 손의 방패도 내려놓는다(자동 모드는 이전 그대로 든다)
  }
  const atkBonus = () => (G.demo ? 0 : P.bonusAtk || 0);
  const critChance = () => (G.demo ? 0.24 : P.crit);
  const mitigate = (d) => (G.demo ? d : d * 100 / (100 + Math.max(0, P.def || 0)));     // 받는 피해 × 100/(100+방어력)
  const powerBonus = () => (G.demo ? 0 : (P.def || 0) * 16);

  let dirty = false;
  function changed() { dirty = false; ctx.refreshPlayerUI(); refreshWindows(); }

  function equip(uid, { quiet } = {}) {
    const it = findItem(uid); if (!it || slotOf(uid)) return false;
    let slot = it.slot;
    if (slot === 'ring') {          // 반지: 빈 칸 먼저, 둘 다 찼으면 점수가 낮은 쪽과 바꾼다
      if (!P.eq.ring) slot = 'ring'; else if (!P.eq.ring2) slot = 'ring2';
      else { const a = findItem(P.eq.ring), b = findItem(P.eq.ring2); slot = a && b && itemScore(b) < itemScore(a) ? 'ring2' : 'ring'; }
    }
    P.eq[slot] = uid; derive(); fire('equip', uid, slot);
    if (!quiet) { S('ui_open', { volume: 0.8, rate: 1.2 }); toast(`[${fullName(it)}]${josa(it.name, '을', '를')} 착용했습니다.`); }
    changed(); return true;
  }
  /** key = 칸 이름(helmet …) 또는 아이템 uid */
  function unequip(key) {
    const slot = SLOTS.includes(key) ? key : slotOf(key); if (!slot || !P.eq[slot]) return false;
    if (bagCount() >= BAG_CAP) { toast('가방이 가득 차서 장비를 벗을 수 없습니다.'); return false; }
    delete P.eq[slot]; derive(); S('ui_open', { volume: 0.6, rate: 0.9 }); changed(); return true;
  }
  function removeItem(uid) {
    const i = P.inv.findIndex(it => it.uid === uid); if (i < 0) return false;
    const s = slotOf(uid); if (s) delete P.eq[s]; P.inv.splice(i, 1);
    if (ctx.enh.target === uid) { ctx.enh.target = 'none'; if (win.isOpen('enhance')) win.enhance.set(ctx.enh.state()); }   // 강화 대상이 사라지면 빈 상태로 둔다(말없이 무기로 바뀌어 [강화]가 무기 주문서를 쓰지 않게)
    return true;
  }
  // 자동 장착: 새로 얻은 장비가 그 칸의 착용 장비보다 점수가 높으면 갈아입는다
  function autoEquip(it) {
    if (G.demo || CFG.autoEquip === false || !it) return false;
    let cur = null;
    if (it.slot === 'ring') { if (P.eq.ring && P.eq.ring2) { const a = findItem(P.eq.ring), b = findItem(P.eq.ring2); cur = a && b ? (itemScore(b) < itemScore(a) ? b : a) : null; } }
    else cur = P.eq[it.slot] ? findItem(P.eq[it.slot]) : null;
    if (cur && itemScore(cur) >= itemScore(it)) return false;
    if (!equip(it.uid, { quiet: true })) return false;
    S('ui_open', { volume: 0.8, rate: 1.2 }); toast(`더 좋은 장비 [${fullName(it)}]${josa(it.name, '을', '를')} 자동으로 착용했습니다.`); return true;
  }
  /** 시험·보상용: 가방에 장비를 넣는다(칸 수 무시). opt.auto 면 자동 장착 규칙도 적용. → uid */
  function giveItem(baseId, rarity = 'common', opt = {}) {
    const it = makeItem(baseId, rarity, opt.plus | 0, newUid()); if (!it) return null;
    P.inv.push(it); if (opt.auto) autoEquip(it); changed(); return it.uid;
  }
  let fullWarnT = -999;
  function warnFull() { if (G.time - fullWarnT < 90) return; fullWarnT = G.time; toast('가방이 가득 찼습니다. 장비를 팔아 칸을 비우세요.'); }
  /** 장비 드랍: tier 1~3 사냥터, 4 = 보스 전설. o.up 등급 상향, o.force 가방이 가득 차도 넣는다, o.base/o.rarity 지정 드랍 → 아이템 또는 null */
  function dropGear(tier, pos, o = {}) {
    if (G.demo) return null;
    const full = bagCount() >= BAG_CAP;
    const d = o.base ? { base: o.base, rarity: o.rarity || 'common' } : tier >= 4 ? rollBossDrop() : rollDrop(tier, Math.random, o.up || 0);
    const it = makeItem(d.base, d.rarity, 0, null); if (!it) return null;
    if (full && !o.force && it.rarity !== 'epic' && it.rarity !== 'legend') { warnFull(); return null; }   // 가방이 가득 차면 일반·희귀는 줍지 못한다. 영웅·전설은 칸을 넘겨서라도 받는다(방치 사냥에서 좋은 장비가 말없이 사라지지 않게)
    it.uid = newUid(); P.inv.push(it); if (!full) fullWarnT = -999;
    hud.loot({ icon: it.icon, name: it.name, count: 1, rarity: it.rarity });
    if (pos) { try { vfx.lootBeam(pos, { color: RARITY_COLOR[it.rarity], duration: it.rarity === 'common' ? 2 : it.rarity === 'rare' ? 3 : 5 }); } catch (e) { } }
    if (it.rarity === 'epic' || it.rarity === 'legend') { const t = `${RARITY_NAME[it.rarity]} 등급 장비 [${it.name}]${josa(it.name, '을', '를')} 획득했습니다!`; hud.notice(t, 'drop'); sysChat(t); S('quest_done', { volume: 0.6 }); }
    autoEquip(it); changed(); return it;
  }
  /** 주문서 보상: kind 'w'(무기) | 'a'(방어구) */
  function giveScroll(kind, n = 1, pos) {
    if (kind === 'a') P.armorScrolls += n; else P.scrolls += n;
    hud.loot({ icon: kind === 'a' ? ICON.scrollA : ICON.scrollW, name: kind === 'a' ? '방어구 강화 주문서' : '무기 강화 주문서', count: n, rarity: 'rare' });
    if (pos) { try { vfx.lootBeam(pos, { color: 0x4aa3ff, duration: 2.5 }); } catch (e) { } }
    dirty = true;
  }

  // 능력치 포인트 분배
  function addStat(key) {
    if (G.demo || !P.alloc || !(key in P.alloc) || P.pts <= 0) return false;
    const hp0 = P.hpMax, mp0 = P.mpMax; P.pts--; P.alloc[key]++; derive();
    if (!P.dead) { if (P.hpMax > hp0) P.hp = Math.min(P.hpMax, P.hp + P.hpMax - hp0); if (P.mpMax > mp0) P.mp = Math.min(P.mpMax, P.mp + P.mpMax - mp0); }
    changed(); return true;
  }
  ui.on('statAdd', (k) => addStat(k));

  // 몬스터 처치(주인공 몫일 때만 game.js 의 kill 이 부른다)
  function onKill(m) {
    if (G.demo) return;
    if (m.kind === 'monster' && !m.noDrop) {
      if (Math.random() < (G.story ? ARMOR_SCROLL_RATE_STORY : ARMOR_SCROLL_RATE)) giveScroll('a', 1, m.pos);
      const d = DROP[m.tag]; if (d && Math.random() < d.rate) dropGear(d.tier, m.pos);
    }
    fire('kill', m);
    if (dirty) { dirty = false; refreshWindows(); }
  }
  // 레벨 차 경험치(계정 모드만): 내 레벨이 몬스터보다 6 이상 높으면 레벨마다 12%씩 줄고 10%에서 멈춘다. 이야기를 마친 뒤 낮은 사냥터에서 레벨이 끝없이 오르던 것을 늦춘다
  const gapMult = (diff) => (diff <= 5 ? 1 : Math.max(0.1, 1 - 0.12 * (diff - 5)));
  const gapSeen = {};
  function expFor(m, x) {
    if (G.demo || !G.story || !m || !(m.level > 0)) return x;
    const k = gapMult(P.level - m.level); if (k >= 1) return x;
    if (!gapSeen[m.tag] && live) { gapSeen[m.tag] = 1; const nm = m.elite ? m.elite.name : (m.mdef && m.mdef.name) || m.name; sysChat(`${nm}${josa(nm, '은', '는')} 이제 너무 약한 상대입니다. 레벨 차이가 커서 얻는 경험치가 줄어듭니다. (더 강한 사냥터로 옮겨 보세요)`); }
    return Math.max(1, Math.round(x * k));
  }
  /** 보스 처치: 전설 장비 1개 확정. 결과 창 맨 앞에 붙일 전리품 줄을 돌려준다 */
  function onBossDead(B) {
    if (G.demo) return [];
    const loot = []; const it = dropGear(4, B.pos, { force: true }); if (it) loot.push({ icon: it.icon, name: it.name, rarity: it.rarity });
    P.crystals += 12; fire('bossDead', B, loot); changed(); return loot;
  }
  /** 보스 처치 추가 보상(직접 플레이): 결과 창에 보이는 것은 실제로 들어온다 — 무기·방어구 강화 주문서 3장씩. 자동 모드는 game.js 의 연출용 목록을 그대로 쓴다 */
  function bossExtra() {
    if (G.demo) return [];
    P.scrolls += 3; P.armorScrolls += 3; dirty = true;
    return [{ icon: ICON.scrollW, name: '무기 강화 주문서 x3', rarity: 'rare' }, { icon: ICON.scrollA, name: '방어구 강화 주문서 x3', rarity: 'rare' }];
  }
  function onLevelUp() {
    if (G.demo) return;
    P.pts += 3; sysChat('능력치 포인트 3을 얻었습니다. 캐릭터 창에서 힘·민첩·체력·지혜에 나눠 주세요.'); fire('levelUp'); dirty = true;
  }
  /** 주인공 사망 → 사망 창에 넘길 내용({ by, note }). 자동 모드는 아무것도 돌려주지 않는다(이전 그대로) */
  function onDeath(src) { if (G.demo) return undefined; const view = {}; fire('death', src, view); return view; }

  // 무기 등급: 가방·장비 창·강화 창이 같은 규칙을 쓴다(직접 플레이). 낡은 장검은 일반, 그 밖에는 +7부터 전설·그 전에는 영웅
  const weaponRarity = () => (P.weaponName === '낡은 장검' ? 'common' : P.plus >= 7 ? 'legend' : 'epic');
  /** 강화 창의 위험 문구(실제 규칙과 같게 3단계). lose: 'gone'(장비가 사라진다) | 'reset'(계정 모드의 무기: 강화 수치만 사라진다) */
  function enhRisk(plus, lose) {
    const autoHint = '+6 전까지';   // 자동 강화 체크 칸 옆 안내: 잃을 위험이 없는 구간에서만 이어서 강화한다
    if (plus < 3) return { risk: 'safe', riskText: '안전 구간 — +3까지는 실패하지 않습니다.', autoHint };
    if (plus < 6) return { risk: 'warn', riskText: '주의 구간 — 실패할 수 있지만 장비는 사라지지 않습니다.', autoHint };
    return { risk: 'danger', riskText: lose === 'reset' ? '위험 구간 — 실패하면 강화 수치가 모두 사라질 수 있습니다!' : '위험 구간 — 실패하면 장비가 증발할 수 있습니다!', autoHint };
  }

  // ═════════════ 방어구 강화 ═════════════
  // 강화 창을 그대로 쓴다. enh.target 이 장비 uid 면 이쪽으로 온다(무기 경로는 game.js 에 그대로 있다)
  function enhState(enh) {
    const it = findItem(enh.target);
    if (!it) {   // 대상이 증발했거나 팔렸다: 빈 상태(단추 꺼짐). 가방·장비 창에서 다시 고르거나, 브롬·메뉴로 열면 무기로 돌아간다
      enh.target = 'none';
      return { item: null, scrolls: P.armorScrolls, blessed: 0, rate: 0, nextPlus: null, safe: true, log: enh.log.slice(-6), kind: 'armor', scrollName: '방어구 강화 주문서', slot: null,
        risk: 'safe', riskText: '가방이나 장비 창에서 강화할 장비를 고르세요.', autoHint: '+6 전까지' };
    }
    // item.slot: 강화 창이 칸 이름(투구·갑옷 …)을 여기서 읽는다
    return { item: { icon: it.icon, name: it.name, plus: it.plus, rarity: it.rarity, slot: slotOf(it.uid) || it.slot }, scrolls: P.armorScrolls, blessed: 0, rate: RATES[Math.min(it.plus, RATES.length - 1)], nextPlus: it.plus + 1, safe: it.plus < 3,
      log: enh.log.slice(-6), kind: 'armor', scrollName: '방어구 강화 주문서', slot: slotOf(it.uid) || it.slot, ...enhRisk(it.plus, 'gone') };
  }
  async function enhArmor(enh, forced) {
    const it = findItem(enh.target);
    if (!it) { win.enhance.set(enh.state()); return null; }   // 대상이 없다(빈 상태): 아무것도 하지 않는다
    if (enh.busy) return null;
    if (P.armorScrolls <= 0) { toast('방어구 강화 주문서가 없습니다.'); return null; }
    enh.busy = true; P.armorScrolls--;
    const from = it.plus, rate = RATES[Math.min(from, RATES.length - 1)], smith = ctx.smith;
    const ok = forced !== undefined ? forced === 'success' : Math.random() < rate;
    const destroy = forced !== undefined ? forced === 'destroy' : (!ok && from >= 6 && Math.random() < 0.5);
    const res = ok ? 'success' : destroy ? 'destroy' : 'fail';
    if (smith && smith.ch.has('work')) smith.ch.play('work', { restart: true }); S('anvil'); setTimeout(() => S('anvil'), 450); setTimeout(() => S('anvil'), 900);
    const pr = win.enhance.play(res, { from, to: from + 1, name: it.name });
    let applied = false;
    const apply = () => {
      if (applied) return; applied = true;
      if (ok) { S('enhance_success'); engine.flash(0xfff0b0, 0.45); it.plus++; try { vfx.buff(P.ch.root, { color: 0x8fd0ff, duration: 2 }); } catch (e) { } if (smith && smith.ch.has('cheer')) smith.ch.play('cheer', { loop: false, restart: true }); }
      else { S('enhance_fail'); engine.flash(0xff2010, 0.5); engine.shake(0.6, 0.6); if (smith && smith.ch.has('sad')) smith.ch.play('sad', { loop: false, restart: true }); if (destroy) { const i = P.inv.indexOf(it); if (i >= 0) P.inv.splice(i, 1); const s = slotOf(it.uid); if (s) delete P.eq[s]; } }
      derive();
    };
    setTimeout(apply, 1250);
    await pr; apply();
    enh.log.push(ok ? `+${from} → +${from + 1} 강화 성공!` : destroy ? `+${from} ${it.name} 증발…` : `+${from} 강화 실패`);
    if (ok) { sysChat(`${it.name} +${it.plus} 강화에 성공했습니다!`); if (it.plus >= 6) hud.notice(`[은사자] ${P.name} 님이 +${it.plus} ${it.name} 강화에 성공했습니다!`, 'enhance'); }
    else { sysChat(destroy ? `강화 실패! +${from} ${it.name}${josa(it.name, '이', '가')} 증발했습니다…` : `강화에 실패했습니다. (+${from} 유지)`); if (destroy) hud.notice(`[은사자] ${P.name} 님의 +${from} ${it.name}${josa(it.name, '이', '가')} 강화 중 증발했습니다…`, 'enhance'); }
    if (destroy) enh.target = 'none';   // 증발: 대상을 비운다(무기로 넘기지 않는다 — 같은 자리의 [강화]를 또 눌러 무기 주문서를 쓰는 일이 없게)
    enh.busy = false; win.enhance.set(enh.state()); changed(); G.events.push('enhance:' + res); return res;
  }
  /** 강화 대상을 바꾼다(창은 열지 않는다). 'weapon' 또는 장비 uid */
  function setEnhTarget(t) {
    const enh = ctx.enh; if (enh.busy) return false;
    enh.target = t !== 'weapon' && findItem(t) ? t : 'weapon'; if (win.isOpen('enhance')) win.enhance.set(enh.state()); return enh.target === (t || 'weapon');
  }

  // ═════════════ B. 상점(잡화상인 리나) ═════════════
  const shopOpen = () => !!win.isOpen('shop');
  const nearMerchant = () => { const m = ctx.NPCS.rina; return !!(m && m.ent && Math.hypot(P.pos.x - m.ent.pos.x, P.pos.z - m.ent.pos.z) < 10); };
  function refreshShop() { win.shop.set({ gold: P.gold, buy: SHOP.map(s => ({ ...s })), sell: P.inv.filter(it => !slotOf(it.uid)).map(viewItem) }); }
  function openShop() { if (G.demo) return false; refreshShop(); win.open('shop'); return true; }
  function buy(id, count = 1) {
    const s = SHOP.find(x => x.id === id); if (!s || G.demo) return false; count = Math.max(1, Math.min(999, count | 0));
    const cost = s.price * count;
    if (P.gold < cost) { toast(`금화가 부족합니다. (${nf(cost)} 금화 필요)`); return false; }
    P.gold -= cost;
    if (id === 'pot_hp') P.potions.hp += count; else if (id === 'pot_mp') P.potions.mp += count; else if (id === 'scr_w') P.scrolls += count; else P.armorScrolls += count;
    S('coin'); hud.loot({ icon: s.icon, name: s.name, count, rarity: s.rarity }); hud.setPotions(P.potions); fire('buy', id, count);   // sys.on('buy', (id, count) => …) — 이야기 엔진의 상점 목표
    if (win.isOpen('enhance') && !ctx.enh.busy) win.enhance.set(ctx.enh.state());
    changed(); return true;
  }
  /** 미착용 장비를 판다 → 받은 금화(못 팔면 0) */
  function sell(uid, { quiet } = {}) {
    const it = findItem(uid); if (!it || G.demo) return 0;
    if (slotOf(uid)) { if (!quiet) toast('착용 중인 장비는 팔 수 없습니다.'); return 0; }
    if (ctx.enh.busy && ctx.enh.target === uid) return 0;
    const price = sellPrice(it); removeItem(uid); P.gold += price;
    if (!quiet) { S('coin'); hud.loot({ icon: ICON.gold, name: '금화', count: price, rarity: 'common' }); changed(); }
    return price;
  }
  function sellAll(rarity = 'common', { quiet } = {}) {
    let n = 0, sum = 0;
    for (const it of P.inv.slice()) if (it.rarity === rarity && !slotOf(it.uid)) { const p = sell(it.uid, { quiet: true }); if (p) { n++; sum += p; } }
    if (n) { S('coin'); if (!quiet) toast(`${RARITY_NAME[rarity] || ''} 등급 장비 ${n}개를 ${nf(sum)} 금화에 팔았습니다.`); changed(); } else if (!quiet) toast('팔 수 있는 장비가 없습니다.');
    return sum;
  }
  ui.on('shopBuy', (d) => { if (d) buy(d.id, d.count || 1); });
  ui.on('shopSell', (id) => sell(id));
  ui.on('shopSellAll', (r) => sellAll(r || 'common'));

  // 가방·장비 창의 행동 버튼
  ui.on('itemAction', (d) => {
    if (!d || G.demo) return; const { id, action } = d, enh = ctx.enh;
    if (action === 'use') {
      if (id === 'pot_hp') { if (P.hp >= P.hpMax) return toast('체력이 가득 차 있습니다.'); ctx.usePotion('hp'); }
      else if (id === 'pot_mp') { if (P.mp >= P.mpMax) return toast('내력이 가득 차 있습니다.'); ctx.usePotion('mp'); }
      return changed();
    }
    if (action === 'enhance') {
      if (id === 'weapon' || id === 'scr_w') return enh.open();
      if (id === 'scr_a') { const it = equippedItems()[0] || P.inv[0]; if (!it) return toast('강화할 방어구가 없습니다.'); return enh.open(it.uid); }
      if (findItem(id)) return enh.open(id); return;
    }
    if (action === 'equip') return void equip(id);
    if (action === 'unequip') return void unequip(id);
    if (action === 'sell') { if (!shopOpen() && !nearMerchant()) return toast('장비는 성채의 잡화상인 리나에게 팔 수 있습니다.'); return void sell(id); }
  });

  // ═════════════ 창 데이터(UI 계약) ═════════════
  function viewItem(it) {
    const s = slotOf(it.uid);
    return { id: it.uid, kind: 'equip', slot: s || it.slot, icon: it.icon, name: it.name, count: 1, rarity: it.rarity, plus: it.plus, equipped: !!s,
      desc: itemDesc(it), stats: statLines(it), price: s ? 0 : sellPrice(it), actions: s ? ['unequip', 'enhance'] : ['equip', 'enhance', 'sell'] };
  }
  function viewWeapon() {
    const nm = P.weaponName;
    return { id: 'weapon', kind: 'equip', slot: 'weapon', icon: ICON.weapon, name: nm, count: 1, rarity: weaponRarity(), plus: P.plus, equipped: true,
      desc: WEAPON_DESC[nm] || '손에 익은 검.', stats: [['강화 공격력', '+' + P.plus * 14]], price: 0, actions: ['enhance'] };
  }
  const stack = (id, kind, icon, name, count, rarity, desc, actions) => ({ id, kind, slot: null, icon, name, count, rarity, plus: 0, equipped: false, desc, stats: [], price: 0, actions });
  function bagList() {
    const items = [viewWeapon()];
    for (const it of equippedItems()) items.push(viewItem(it));
    for (const it of P.inv) if (!slotOf(it.uid)) items.push(viewItem(it));
    if (P.potions.hp > 0) items.push(stack('pot_hp', 'use', ICON.potHp, '빨간 물약', P.potions.hp, 'common', '마시면 최대 체력의 35%를 회복한다. (단축키 Q · F1)', ['use']));
    if (P.potions.mp > 0) items.push(stack('pot_mp', 'use', ICON.potMp, '파란 물약', P.potions.mp, 'common', '마시면 내력을 120 회복한다. (단축키 F2)', ['use']));
    if (P.scrolls > 0) items.push(stack('scr_w', 'use', ICON.scrollW, '무기 강화 주문서', P.scrolls, 'rare', '대장장이 브롬이 무기를 한 단계 벼려 준다. +3까지는 실패하지 않는다.', ['enhance']));
    if (P.armorScrolls > 0) items.push(stack('scr_a', 'use', ICON.scrollA, '방어구 강화 주문서', P.armorScrolls, 'rare', '방어구·장신구를 한 단계 강화한다. +3까지는 실패하지 않는다.', ['enhance']));
    if (P.crystals > 0) items.push(stack('crystal', 'etc', ICON.crystal, '마력 결정', P.crystals, 'epic', '마력이 응축된 보랏빛 결정. 현자 오르벤이 쓰임새를 연구하고 있다.', []));
    return items;
  }
  function charData() {
    const equip = [{ slot: 'weapon', id: 'weapon', icon: ICON.weapon, name: P.weaponName, plus: P.plus, rarity: viewWeapon().rarity, stats: viewWeapon().stats, desc: viewWeapon().desc, actions: ['enhance'] }];
    for (const s of SLOTS) { const it = P.eq[s] ? findItem(P.eq[s]) : null; if (it) equip.push({ slot: s, id: it.uid, icon: it.icon, name: it.name, plus: it.plus, rarity: it.rarity, stats: statLines(it), desc: itemDesc(it), actions: ['unequip', 'enhance'] }); }
    const def = P.def || 0;
    if (G.demo) return { name: P.name, level: P.level, guild: GUILDS[0], title: P.title || null, power: Math.round(ctx.atkPower() * 31 + P.hpMax * 2.2),   // 자동 모드: v2 이전 화면과 같은 표시(방어력은 연출용 고정식), 눌러도 반응 없는 포인트·[+]는 보이지 않게 0
      stats: { '공격력': Math.round(ctx.atkPower()), '방어력': 212 + P.level * 6, '최대 체력': P.hpMax, '최대 내력': P.mpMax, '치명타 확률': '24%' }, equip, points: 0, alloc: { str: 0, dex: 0, con: 0, wis: 0 }, fame: 0 };
    return { name: P.name, level: P.level, guild: GUILDS[0], title: P.title || null, power: Math.round(ctx.atkPower() * 31 + P.hpMax * 2.2 + powerBonus()),
      stats: { '공격력': Math.round(ctx.atkPower()), '방어력': def, '최대 체력': P.hpMax, '최대 내력': P.mpMax, '치명타 확률': Math.round(critChance() * 1000) / 10 + '%', '받는 피해 감소': Math.round((1 - 100 / (100 + def)) * 100) + '%' },
      equip, points: P.pts, alloc: { ...P.alloc }, fame: P.fame };
  }
  // 스킬 창·문파 창: UI 의 기본 예시 목록 대신 실제 기술 4종과 주인공의 이름·레벨을 넘긴다(직접 플레이만. 자동 모드는 이전 화면 그대로)
  const SKILL_DESC = { spin: '몸을 돌려 주변의 모든 적을 두 번 벤다.', slam: '뛰어올라 내려찍어 주변을 강타한다.', roar: '15초 동안 공격력이 35% 오른다.', recall: '벨로스 성채 광장으로 순간이동한다.' };
  let staticSig = '';
  function refreshStatic() {
    if (!live || G.demo) return; const sig = [P.name, P.level, G.story, P.fame].join('|'); if (sig === staticSig) return; staticSig = sig;
    if (!(ctx.getSk && ctx.getSk() && ctx.getSk().on())) win.skills.set(ctx.SKILLS.map(sk => {   // 직접 플레이의 기술 창은 skills.js 가 채운다(sys.on('windows'))
       const lock = G.story && P.level < (sk.lv || 1); return { id: sk.id, icon: sk.icon, name: sk.name, level: 1, key: sk.key, mp: sk.mp, cd: sk.cd, desc: (lock ? `[Lv.${sk.lv}에 익힘] ` : '') + (SKILL_DESC[sk.id] || '') }; }));
    win.guild.set({ self: G.story ? { name: P.name, level: P.level, rank: P.level < 10 ? '수습' : '수호기사', contrib: P.kills * 12 + (P.fame | 0) * 150 } : { name: P.name, level: P.level } });   // 계정 모드: 기여도 = 처치 수·명성
  }
  function refreshWindows() {
    win.inventory.set({ gold: P.gold, cap: BAG_CAP, used: bagCount(), items: bagList() });
    win.character.set(charData());
    if (shopOpen()) refreshShop();
    refreshStatic();
    fire('windows');
  }

  // ═════════════ H. 저장 v2 ═════════════
  function save(out) {
    out.v = 2; out.inv = P.inv.map(packItem); out.eq = eqCopy(); out.armorScrolls = P.armorScrolls; out.crystals = P.crystals;
    out.pts = P.pts; out.alloc = { ...P.alloc }; out.fame = P.fame; out.codex = JSON.parse(JSON.stringify(P.codex || {}));
    fire('save', out); return out;
  }
  /** loadProfile 이 레벨을 정한 뒤, 능력치를 다시 계산하기 전에 부른다. v1 저장(장비·포인트 정보 없음)은 기본값으로 채운다 */
  function load(d) {
    d = d || {}; P.inv = []; P.eq = {}; uidN = 1; const seen = {};
    for (const o of Array.isArray(d.inv) ? d.inv : []) { const it = unpackItem(o); if (!it) continue; if (!it.uid || seen[it.uid]) it.uid = null; else seen[it.uid] = 1; P.inv.push(it); }
    for (const it of P.inv) { const n = it.uid && /^e(\d+)$/.exec(it.uid); if (n) uidN = Math.max(uidN, +n[1] + 1); }
    for (const it of P.inv) if (!it.uid) it.uid = newUid();
    const eq = d.eq && typeof d.eq === 'object' ? d.eq : {};
    for (const s of SLOTS) { const it = eq[s] ? findItem(eq[s]) : null; if (it && fitsSlot(it, s) && !slotOf(it.uid)) P.eq[s] = it.uid; }
    P.armorScrolls = Math.max(0, d.armorScrolls | 0); P.crystals = Math.max(0, d.crystals | 0);
    const a = d.alloc && typeof d.alloc === 'object' ? d.alloc : {};
    P.alloc = { str: Math.max(0, a.str | 0), dex: Math.max(0, a.dex | 0), con: Math.max(0, a.con | 0), wis: Math.max(0, a.wis | 0) };
    P.pts = d.pts === undefined || d.pts === null ? Math.max(0, 3 * (P.level - 1) - (P.alloc.str + P.alloc.dex + P.alloc.con + P.alloc.wis)) : Math.max(0, d.pts | 0);   // v1 저장: 3×(레벨−1) 지급
    P.fame = Math.max(0, d.fame | 0); P.codex = d.codex && typeof d.codex === 'object' ? JSON.parse(JSON.stringify(d.codex)) : {};
    ctx.enh.target = 'weapon'; fullWarnT = -999;
    fire('load', d); derive();
  }

  // ═════════════ 매 프레임 ═════════════
  let badge = -1, slowT = 0, winSig = '';
  let demoSeen = false;
  function update(dt, rawDt) {
    if (G.demo && !demoSeen) { demoSeen = true; derive(); }   // 자동 모드 시작: 체험용으로 계산해 둔 P.def(103)를 지운다(자동 모드의 피해·체력·공격력에는 영향 없음)
    const b = live && !G.demo ? P.pts : 0; if (b !== badge) { badge = b; hud.setMenuBadge('character', b); }   // 미분배 포인트 배지
    if ((slowT -= rawDt) <= 0) { slowT = 0.5;
      if (shopOpen() && !nearMerchant()) win.close('shop');                                                         // 상인에게서 멀어지면 상점을 닫는다
      if (win.isOpen('inventory') || win.isOpen('character') || shopOpen()) {                                       // 열려 있는 창은 금화·물약 수가 바뀌면 다시 그린다
        const sig = [P.gold, P.potions.hp, P.potions.mp, P.scrolls, P.armorScrolls, P.crystals, P.level, P.plus, P.weaponName, P.hpMax, P.buffT > 0].join('|');
        if (sig !== winSig) { winSig = sig; refreshWindows(); } } }
    fire('update', dt, rawDt);
  }
  /** 직접 플레이 시작(main.js). 설정 창의 기본값을 한 번 적용한다 */
  function start(settings) {
    live = true; applySettings(settings);
    for (const b of ctx.bots || []) if (b.guild === 1) b.guild = 2 + ((Math.random() * 4) | 0);   // 적대 문파 [붉은까마귀](1번)는 습격자만 쓴다: 일반 모험가는 새벽검·철권단·폭풍·가시장미로 옮긴다(자동 모드의 봇 구성은 그대로)
    derive(); changed();
  }

  derive();

  // ═════════════ 2차: 사망 벌점 · 습격 · 정예 · 도감 · 보급 귀환 ═════════════
  // 실제 로직은 fieldsys.js. 아래 sys 를 만든 뒤 installField 가 spawnRaiders / spawnElite / threat / userMove / field 를 채운다.
  const spawnRaiders = () => null, spawnElite = () => null, threat = () => null, userMove = () => { };

  const sys = {
    CFG, on, fire, setBonus, derive, atkBonus, critChance, mitigate, powerBonus, potOn, potAt, potAlways, showDamage, showPlates, expFor, gapMult, weaponRarity, enhRisk,
    onKill, onBossDead, bossExtra, onLevelUp, onDeath, update, save, load, start, applySettings, setting, refreshWindows, changed,
    findItem, slotOf, equippedItems, bagCount, viewItem, dropGear, giveScroll, removeItem, autoEquip,
    enhState, enhArmor, openShop, refreshShop, sellAll, nearMerchant,
    // 시험용 훅(계약): window.__GAME__.game.sys
    giveItem, equip, unequip, sell, buy, addStat, setEnhTarget,
    spawnRaiders, spawnElite, threat, userMove, isLive: () => live,
    state() {
      return { inv: P.inv.map(it => ({ ...it, equipped: !!slotOf(it.uid), score: Math.round(itemScore(it) * 10) / 10, price: sellPrice(it), eff: { def: effStat(it, 'def'), hp: effStat(it, 'hp'), mp: effStat(it, 'mp'), atk: effStat(it, 'atk'), crit: effStat(it, 'crit') } })),
        eq: eqCopy(), pts: P.pts, alloc: { ...P.alloc }, def: P.def, crit: P.crit, hpMax: P.hpMax, mpMax: P.mpMax, atk: ctx.atkPower(), fame: P.fame, codex: JSON.parse(JSON.stringify(P.codex || {})),
        armorScrolls: P.armorScrolls, scrolls: P.scrolls, potions: { ...P.potions }, crystals: P.crystals, gold: P.gold, bag: bagCount(), cap: BAG_CAP, enhTarget: ctx.enh.target, cfg: { ...CFG }, slots: SLOTS.slice(), slotLabel: { ...SLOT_LABEL }, bases: Object.keys(BASES) };
    },
  };
  installField(ctx, sys, { toast, sysChat });
  return sys;
}
