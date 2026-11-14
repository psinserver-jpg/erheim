// 장비 아이템: 데이터와 순수 함수만 둔다(게임 상태를 모른다).
// 무기는 여기서 다루지 않는다(기존 방식 그대로 P.weaponName / P.plus).
//   아이템 인스턴스: { uid, base, slot, name, icon, rarity, plus, def, hp, mp, atk, crit }
//   실제 수치 = 기본값 × (1 + 0.10 × plus)  → effStat(it, key)

export const SLOTS = ['helmet', 'armor', 'gloves', 'boots', 'shield', 'cloak', 'necklace', 'ring', 'ring2'];
export const SLOT_LABEL = { weapon: '무기', helmet: '투구', armor: '갑옷', gloves: '장갑', boots: '장화', shield: '방패', cloak: '망토', necklace: '목걸이', ring: '반지', ring2: '반지' };
const SLOT_ICON = { shield: 1, helmet: 2, armor: 3, gloves: 4, boots: 5, cloak: 6, ring: 7, necklace: 8 };
export const RARITIES = ['common', 'rare', 'epic', 'legend'];
export const RARITY_NAME = { common: '일반', rare: '희귀', epic: '영웅', legend: '전설' };
export const RARITY_MULT = { common: 1, rare: 1.3, epic: 1.65, legend: 2.2 };
export const RARITY_COLOR = { common: 0xd8d2c0, rare: 0x4aa3ff, epic: 0xb36bff, legend: 0xffb23e };
export const BAG_CAP = 40;           // 가방 칸 수
export const STAT_KEYS = ['def', 'hp', 'mp', 'atk', 'crit'];
export const STAT_LABEL = { def: '방어력', hp: '체력', mp: '내력', atk: '공격력', crit: '치명타' };
export const ICON = { weapon: 0, potHp: 9, potMp: 10, scrollW: 11, scrollA: 12, blessed: 13, gold: 14, crystal: 15 };

// ── 기본 장비 표 ──────────────────────────────────────────────
// 수치는 '일반' 등급 기준. 등급이 오르면 RARITY_MULT 를 곱한다(fixed 는 곱하지 않는다).
// tier: 1 속삭이는 숲(늑대인간) · 2 오크 야영지(오크 전사) · 3 잊혀진 묘지(해골 기사) · 4 잿불 제단(발카르, 전설 전용)
const B = (id, slot, tier, name, st, desc, extra) => ({ id, slot, tier, name, icon: SLOT_ICON[slot], def: 0, hp: 0, mp: 0, atk: 0, crit: 0, ...st, desc, ...extra });
const LIST = [
  // 1단계: 수습 기사 — 성채가 신참에게 내어 주는 장비
  B('t1_helmet', 'helmet', 1, '수습 기사의 투구', { def: 4, hp: 15 }, '찌그러진 자국마다 앞선 주인의 이름이 긁혀 있다.'),
  B('t1_armor', 'armor', 1, '수습 기사의 사슬 갑옷', { def: 7, hp: 30 }, '고리가 성긴 사슬 갑옷. 늑대 이빨 정도는 막아 준다.'),
  B('t1_gloves', 'gloves', 1, '수습 기사의 가죽 장갑', { def: 3, hp: 10 }, '손바닥이 닳아 반들거리는 가죽 장갑.'),
  B('t1_boots', 'boots', 1, '수습 기사의 장화', { def: 3, hp: 10 }, '숲길의 진흙이 아직 말라붙어 있다.'),
  B('t1_shield', 'shield', 1, '수습 기사의 나무 방패', { def: 6 }, '참나무 판에 쇠테를 두른 훈련용 방패.'),
  B('t1_cloak', 'cloak', 1, '수습 기사의 여행 망토', { def: 2, hp: 20 }, '비와 밤이슬을 막아 주는 두꺼운 모직 망토.'),
  B('t1_necklace', 'necklace', 1, '늑대 송곳니 목걸이', { atk: 3, mp: 20 }, '숲의 사냥꾼들이 첫 사냥감의 송곳니를 꿰어 만든다.'),
  B('t1_ring', 'ring', 1, '구리 서약 반지', { atk: 2, crit: 0.01 }, '견습 기사가 서약식에서 받는 구리 반지.'),
  // 2단계: 숲 순찰대 — 오크 야영지에서 되찾은 장비
  B('t2_helmet', 'helmet', 2, '숲 순찰대의 철투구', { def: 8, hp: 30 }, '오크에게 빼앗겼던 순찰대의 투구. 안쪽에 부대 표식이 남아 있다.'),
  B('t2_armor', 'armor', 2, '숲 순찰대의 비늘 갑옷', { def: 13, hp: 60 }, '쇠비늘을 겹쳐 엮어 도끼날을 흘려보낸다.'),
  B('t2_gloves', 'gloves', 2, '숲 순찰대의 건틀릿', { def: 6, hp: 20 }, '손등에 덧댄 철판이 묵직하다.'),
  B('t2_boots', 'boots', 2, '숲 순찰대의 장화', { def: 6, hp: 20 }, '먼 순찰길에도 발이 편한 징 박힌 장화.'),
  B('t2_shield', 'shield', 2, '숲 순찰대의 철테 방패', { def: 11 }, '오크의 도끼 자국이 여러 줄 패여 있다.'),
  B('t2_cloak', 'cloak', 2, '숲 순찰대의 녹색 망토', { def: 4, hp: 40 }, '숲 그늘에 몸을 숨기기 좋은 이끼색 망토.'),
  B('t2_necklace', 'necklace', 2, '북소리 전리품 목걸이', { atk: 6, mp: 40 }, '오크 북잡이가 걸고 다니던 뼈 장식을 다시 꿴 것.'),
  B('t2_ring', 'ring', 2, '은빛 맹세 반지', { atk: 4, crit: 0.015 }, '정식 기사의 맹세를 새긴 은반지.'),
  // 3단계: 잊힌 기사단 — 묘지의 해골 기사가 지키던 장비
  B('t3_helmet', 'helmet', 3, '잊힌 기사단의 면갑 투구', { def: 12, hp: 50 }, '면갑 안쪽에서 아직도 찬 숨결이 새어 나오는 듯하다.'),
  B('t3_armor', 'armor', 3, '잊힌 기사단의 판금 갑옷', { def: 20, hp: 95 }, '녹슨 가슴받이에 사자 문장이 희미하게 남아 있다.'),
  B('t3_gloves', 'gloves', 3, '잊힌 기사단의 건틀릿', { def: 9, hp: 32 }, '백 년 동안 검을 놓지 않았던 손의 형태 그대로 굳어 있다.'),
  B('t3_boots', 'boots', 3, '잊힌 기사단의 철장화', { def: 9, hp: 32 }, '묘지의 흙을 밟아도 소리가 나지 않는다.'),
  B('t3_shield', 'shield', 3, '잊힌 기사단의 문장 방패', { def: 17 }, '잿불 당번으로 제단에 오른 기사가 들었던 방패.'),
  B('t3_cloak', 'cloak', 3, '잊힌 기사단의 잿빛 망토', { def: 7, hp: 60 }, '빛바랜 군청색 위로 세월의 재가 내려앉았다.'),
  B('t3_necklace', 'necklace', 3, '묘지기의 은목걸이', { atk: 9, mp: 60, crit: 0.01 }, '죽은 자의 이름을 대신 기억해 주던 묘지기의 유품.'),
  B('t3_ring', 'ring', 3, '잠들지 못한 자의 반지', { atk: 6, crit: 0.02 }, '끼고 있으면 누군가의 맹세가 희미하게 들린다.'),
  // 4단계: 잿불 군주 — 발카르 토벌 보상(전설 전용)
  B('boss_helmet', 'helmet', 4, '잿불 군주의 뿔투구', { def: 15, hp: 60 }, '식지 않는 뿔에서 잿불이 흩날린다.', { boss: true }),
  B('boss_armor', 'armor', 4, '잿불 군주의 흉갑', { def: 25, hp: 115 }, '용암이 굳어 만들어진 검붉은 흉갑.', { boss: true }),
  B('boss_gloves', 'gloves', 4, '잿불 군주의 손아귀', { def: 11, hp: 40, crit: 0.01 }, '쥐는 것마다 그을음이 남는다.', { boss: true }),
  B('boss_boots', 'boots', 4, '잿불 군주의 군화', { def: 11, hp: 40 }, '제단의 열기 위를 걸어도 타지 않는다.', { boss: true }),
  B('boss_shield', 'shield', 4, '잿불 군주의 방벽', { def: 21, hp: 30 }, '제단의 검은 돌을 통째로 깎아 만든 방패.', { boss: true }),
  B('boss_cloak', 'cloak', 4, '잿불 군주의 망토', { def: 9, hp: 75 }, '끝자락이 언제나 불씨처럼 붉게 타오른다.', { boss: true }),
  B('boss_necklace', 'necklace', 4, '염옥의 심장 목걸이', { atk: 11, mp: 75, crit: 0.015 }, '발카르의 가슴에서 떨어져 나온 불의 조각. 아직 맥이 뛴다.', { boss: true }),
  B('boss_ring', 'ring', 4, '잿불 군주의 인장 반지', { atk: 8, crit: 0.025 }, '사자가 거꾸로 새겨진 반지. 끼고 있으면 눈꺼풀이 조금 무거워진다.', { boss: true }),
  // 체험 캐릭터의 시작 장비: 방어력·치명타만 준다(최대 체력·공격력은 이전 체험판과 같게 유지)
  B('st_shield', 'shield', 2, '사자 문장 방패', { def: 12 }, '은사자 문파의 정식 기사에게 내리는 방패.', { fixed: true }),
  B('st_helmet', 'helmet', 2, '은빛 기사 투구', { def: 8, crit: 0.02 }, '푸른 깃 장식이 달린 은빛 투구.', { fixed: true }),
  B('st_armor', 'armor', 2, '은빛 기사 갑옷', { def: 16 }, '벨로스 대장간에서 맞춘 은빛 판금 갑옷.', { fixed: true }),
  B('st_gloves', 'gloves', 2, '강철 건틀릿', { def: 6, crit: 0.04 }, '검을 단단히 쥐게 해 주는 강철 건틀릿.', { fixed: true }),
  B('st_boots', 'boots', 2, '강철 장화', { def: 6 }, '금테를 두른 강철 장화.', { fixed: true }),
  B('st_cloak', 'cloak', 2, '왕국 기사단 망토', { def: 5, crit: 0.05 }, '에르하임 왕국 기사단의 푸른 망토.', { fixed: true }),
  // 가방에 든 두 장신구(미착용이라 시작 능력치에는 영향이 없다)는 등급값을 하게 둔다: 일반 3단계 드랍(반지 26점 · 목걸이 37점)에 밀리지 않는다
  B('st_ring', 'ring', 3, '푸른 서약의 반지', { def: 5, crit: 0.06 }, '푸른 보석 안에서 서약의 문장이 일렁인다.', { fixed: true }),
  B('st_necklace', 'necklace', 3, '불꽃 심장 목걸이', { def: 12, crit: 0.10 }, '붉은 보석이 심장 박동처럼 따뜻하게 뛴다.', { fixed: true }),
];
export const BASES = Object.fromEntries(LIST.map(b => [b.id, b]));
const DROP_SLOTS = ['helmet', 'armor', 'gloves', 'boots', 'shield', 'cloak', 'necklace', 'ring'];

// 체험 모드(Lv.14) 시작 장비
export const TRIAL_GEAR = [
  { base: 'st_shield', rarity: 'epic', plus: 5, equip: true }, { base: 'st_helmet', rarity: 'rare', plus: 4, equip: true }, { base: 'st_armor', rarity: 'epic', plus: 5, equip: true },
  { base: 'st_gloves', rarity: 'rare', plus: 3, equip: true }, { base: 'st_boots', rarity: 'rare', plus: 3, equip: true }, { base: 'st_cloak', rarity: 'rare', plus: 2, equip: true },
  { base: 'st_ring', rarity: 'epic', plus: 0, equip: false }, { base: 'st_necklace', rarity: 'legend', plus: 0, equip: false },
];

// 몬스터별 드랍(단계·확률)
export const DROP = { werewolf: { tier: 1, rate: 0.07 }, orc_warrior: { tier: 2, rate: 0.08 }, skeleton_knight: { tier: 3, rate: 0.09 } };
export const ARMOR_SCROLL_RATE = 0.10;
export const ARMOR_SCROLL_RATE_STORY = 0.03;   // 계정 모드: 주문서가 넘쳐 상점에서 살 까닭이 없던 것을 줄였다(체험 모드는 위의 10%)

// 잡화상인 리나의 판매 목록
export const SHOP = [
  { id: 'pot_hp', icon: ICON.potHp, name: '빨간 물약', price: 25, rarity: 'common', desc: '최대 체력의 35%를 회복한다.' },
  { id: 'pot_mp', icon: ICON.potMp, name: '파란 물약', price: 35, rarity: 'common', desc: '내력을 120 회복한다.' },
  { id: 'scr_w', icon: ICON.scrollW, name: '무기 강화 주문서', price: 600, rarity: 'rare', desc: '대장장이 브롬에게 가져가면 무기를 한 단계 벼려 준다.' },
  { id: 'scr_a', icon: ICON.scrollA, name: '방어구 강화 주문서', price: 400, rarity: 'rare', desc: '방어구·장신구를 한 단계 강화한다. +3까지는 실패하지 않는다.' },
];

const r1 = (v) => Math.round(v * 10) / 10;
const r3 = (v) => Math.round(v * 1000) / 1000;

export const MAX_PLUS = 30;         // 강화 수치 상한(손상된 저장의 터무니없는 값을 막는다. 실제 강화로는 닿지 않는다)
/** 아이템 인스턴스를 만든다. 모르는 기본 아이템이면 null */
export function makeItem(baseId, rarity = 'common', plus = 0, uid = null) {
  const b = BASES[baseId]; if (!b) return null;
  if (!RARITY_MULT[rarity]) rarity = 'common';
  if (b.boss) rarity = 'legend';
  const k = b.fixed ? 1 : RARITY_MULT[rarity];
  return { uid, base: b.id, slot: b.slot, name: b.name, icon: b.icon, rarity, plus: Math.min(MAX_PLUS, Math.max(0, plus | 0)),
    def: r1(b.def * k), hp: r1(b.hp * k), mp: r1(b.mp * k), atk: r1(b.atk * k), crit: r3(b.crit * k) };
}
/** 강화를 반영한 실제 수치(치명타는 0~1 비율, 나머지는 정수) */
export function effStat(it, key) { const v = (it[key] || 0) * (1 + 0.10 * (it.plus || 0)); return key === 'crit' ? r3(v) : Math.round(v); }
/** 장비 여러 개의 합계 */
export function sumStats(items) { const t = { def: 0, hp: 0, mp: 0, atk: 0, crit: 0 }; for (const it of items) if (it) for (const k of STAT_KEYS) t[k] += effStat(it, k); t.crit = r3(t.crit); return t; }
/** 자동 장착 비교용 점수 */
export function itemScore(it) { return effStat(it, 'def') + effStat(it, 'hp') / 8 + effStat(it, 'atk') * 3 + effStat(it, 'crit') * 400 + effStat(it, 'mp') / 10; }
/** 창에 보여 줄 능력치 줄: [['방어력', '+12'], ['체력', '+40']] */
export function statLines(it) {
  const out = [];
  for (const k of STAT_KEYS) { const v = effStat(it, k); if (v > 0) out.push([STAT_LABEL[k], k === 'crit' ? '+' + r1(v * 100) + '%' : '+' + v]); }
  return out;
}
export const itemTier = (it) => (BASES[it.base] ? BASES[it.base].tier : 1);
export const itemDesc = (it) => (BASES[it.base] ? BASES[it.base].desc : '');
/** 되팔기 값: 등급·단계·강화. 강화 한 단계가 주문서 값(400)보다 싸야 되팔이 이득이 안 생긴다 */
const PRICE = { common: [20, 40, 60, 60], rare: [120, 200, 300, 300], epic: [500, 800, 1200, 1200], legend: [3000, 4000, 5000, 6000] };
export function sellPrice(it) { const p = (PRICE[it.rarity] || PRICE.common)[Math.max(1, Math.min(4, itemTier(it))) - 1]; return Math.round(p + Math.min(p * 0.1, 200) * (it.plus || 0)); }

/** 등급 추첨: 일반 70 / 희귀 24 / 영웅 5.5 / 전설 0.5. up 만큼 등급을 올린다(정예 몬스터용) */
export function rollRarity(rng = Math.random, up = 0) {
  const r = rng(); const i = r < 0.005 ? 3 : r < 0.06 ? 2 : r < 0.30 ? 1 : 0;
  return RARITIES[Math.min(3, i + (up | 0))];
}
/** 사냥터 단계(1~3)의 장비 하나를 뽑는다 → { base, rarity } */
export function rollDrop(tier, rng = Math.random, up = 0) {
  const slot = DROP_SLOTS[Math.min(DROP_SLOTS.length - 1, (rng() * DROP_SLOTS.length) | 0)];
  return { base: `t${Math.max(1, Math.min(3, tier | 0))}_${slot}`, rarity: rollRarity(rng, up) };
}
/** 보스 전용 전설 하나 */
export function rollBossDrop(rng = Math.random) {
  const slot = DROP_SLOTS[Math.min(DROP_SLOTS.length - 1, (rng() * DROP_SLOTS.length) | 0)];
  return { base: 'boss_' + slot, rarity: 'legend' };
}
/** 이 아이템이 그 칸에 들어가는가(반지는 ring / ring2 둘 다) */
export const fitsSlot = (it, slot) => !!it && (it.slot === slot || (it.slot === 'ring' && slot === 'ring2'));

// 저장: 기본 아이템 번호·등급·강화만 남기고, 불러올 때 표에서 다시 만든다
export const packItem = (it) => ({ u: it.uid, b: it.base, r: it.rarity, p: it.plus });
export function unpackItem(o) { if (!o || typeof o !== 'object') return null; return makeItem(o.b, o.r, o.p, typeof o.u === 'string' ? o.u : null); }

/** 받침에 따라 조사를 고른다: josa('투구', '을', '를') → '를' */
export function josa(word, a, b) { const c = String(word).charCodeAt(String(word).length - 1); if (c < 0xac00 || c > 0xd7a3) return a; return (c - 0xac00) % 28 ? a : b; }
