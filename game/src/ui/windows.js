// 창·연출 (SPEC 3.2). three.js 를 쓰지 않는 DOM 오버레이.
//   const win = Windows.create({ root, img, emit })
//   창: inventory(가방) character(장비) enhance(강화) skills guild(문파) settings shop(잡화점) codex(도감) spec(전문화 선택)
//   v5 이벤트: specOpen(기술 창의 전문화 단추) · specPick key(전문화 선택 창의 카드)
//   v2 이벤트: itemAction {id, action} · statAdd 'str'|'dex'|'con'|'wis' · shopBuy {id, count} · shopSell id · shopSellAll 'common'
import css from './windows.css';
import themeCss from './theme.css';

const SHEETS = {
  item: { key: 'ui/item_icons.png', cols: 4, rows: 4, inset: 0.085 },
  skill: { key: 'ui/skill_icons.png', cols: 3, rows: 3, inset: 0.035 },
  skill2: { key: 'ui/skill_icons2.png', cols: 3, rows: 3, inset: 0.03 },   // 기술 아이콘 시트 1
  crest: { key: 'ui/guild_crests.png', cols: 3, rows: 2, inset: 0.03 },
};
const RARITY = { common: '일반', rare: '희귀', epic: '영웅', legend: '전설' };
const TIPS = [
  '강화는 +6까지는 실패해도 장비가 남습니다. 그 다음부터는… 대장장이 브롬도 눈을 감습니다.',
  '자동사냥 중에도 물약은 줄어듭니다. 잡화상인 리나에게 들렀다 가세요.',
  '속삭이는 숲의 늑대인간은 밤이 되면 더 사나워집니다.',
  '염옥의 군주 발카르의 붉은 장판은 무조건 피하세요. 무조건입니다.',
  '문파원과 함께 사냥하면 경험치를 더 많이 얻습니다.',
  '축복받은 주문서는 강화 성공 확률을 올려 줍니다.',
  '잊혀진 묘지의 해골 기사는 뒤를 잡으면 방어가 약해집니다.',
];
const SERVERS = [
  { name: '아스테르 01', state: '혼잡', color: '#ff9a4a' },
  { name: '아스테르 02', state: '원활', color: '#5cf08a' },
  { name: '벨로스 01', state: '보통', color: '#ffe08a' },
  { name: '루멘 01', state: '신규', color: '#7ecbff' },
];
const EQUIP_SLOTS = [
  { id: 'helmet', label: '투구', col: 'l' }, { id: 'armor', label: '갑옷', col: 'l' }, { id: 'gloves', label: '장갑', col: 'l' }, { id: 'boots', label: '장화', col: 'l' },
  { id: 'weapon', label: '무기', col: 'r' }, { id: 'shield', label: '방패', col: 'r' }, { id: 'cloak', label: '망토', col: 'r' }, { id: 'necklace', label: '목걸이', col: 'r' },
  { id: 'ring', label: '반지', col: 'm' }, { id: 'ring2', label: '반지', col: 'm' },
];
const DEFAULT_SKILLS = [
  { id: 'slash', icon: 0, name: '베기', level: 5, key: '1', mp: 0, cd: 0, desc: '검을 휘둘러 앞의 적 하나를 벤다.' },
  { id: 'combo', icon: 1, name: '연속 베기', level: 4, key: '2', mp: 12, cd: 4, desc: '빠르게 두 번 베어 큰 피해를 준다.' },
  { id: 'spin', icon: 2, name: '회전 베기', level: 3, key: '3', mp: 20, cd: 8, desc: '몸을 돌려 주변의 모든 적을 벤다.' },
  { id: 'leap', icon: 3, name: '도약 강타', level: 3, key: '4', mp: 28, cd: 12, desc: '뛰어올라 내려찍고 주변을 기절시킨다.' },
  { id: 'guard', icon: 4, name: '수호의 방패', level: 2, key: '5', mp: 30, cd: 30, desc: '10초 동안 받는 피해가 크게 줄어든다.' },
  { id: 'thunder', icon: 5, name: '뇌전검', level: 2, key: 'Q', mp: 45, cd: 20, desc: '검에 번개를 실어 일직선을 꿰뚫는다.' },
  { id: 'roar', icon: 6, name: '사자의 포효', level: 1, key: 'E', mp: 40, cd: 60, desc: '투지를 불태워 공격력이 오른다.' },
  { id: 'recall', icon: 7, name: '귀환', level: 1, key: 'R', mp: 0, cd: 300, desc: '벨로스 성채로 순간이동한다.' },
];
const DEFAULT_GUILD = {
  name: '은사자', crest: 0, level: 7, notice: '오늘 밤 9시 잿불 제단 발카르 토벌. 물약 넉넉히 챙겨 오세요.', me: '카일',
  members: [
    { name: '백야의검', level: 58, cls: '기사', rank: '문주', contrib: 128400, online: true },
    { name: '카일', level: 52, cls: '기사', rank: '수호기사', contrib: 96200, online: true },
    { name: '달빛화살', level: 55, cls: '요정 궁수', rank: '부문주', contrib: 88750, online: true },
    { name: '서리마녀', level: 54, cls: '마법사', rank: '수호기사', contrib: 71300, online: true },
    { name: '무쇠주먹', level: 49, cls: '기사', rank: '문파원', contrib: 40120, online: true },
    { name: '새벽바람', level: 47, cls: '요정 궁수', rank: '문파원', contrib: 33980, online: false },
    { name: '밤까치', level: 45, cls: '마법사', rank: '문파원', contrib: 21040, online: true },
    { name: '은빛갈기', level: 44, cls: '기사', rank: '문파원', contrib: 18800, online: false },
    { name: '도토리장수', level: 38, cls: '요정 궁수', rank: '문파원', contrib: 9050, online: false },
    { name: '초보기사한', level: 21, cls: '기사', rank: '수습', contrib: 1200, online: true },
  ],
};
const DEFAULT_SETTINGS = { master: 80, bgm: 60, sfx: 85, quality: '높음', damage: true, plates: true, shake: true, autoPotion: true, potionAt: '60%', autoEquip: true, autoSupply: true };
const INV_COLS = 8, INV_CAP = 40; // 가방: 8칸 × 5줄
const ACT_LABEL = { equip: '착용', unequip: '해제', enhance: '강화', sell: '판매', use: '사용' };
const KIND_LABEL = { equip: '장비', use: '소모품', etc: '기타' };
// 능력 분배 칸(포인트 하나의 효과는 v2 명세의 능력치 공식과 같은 값을 적는다)
const ALLOC = [
  { key: 'str', label: '힘', hint: '공격력 +2' }, { key: 'dex', label: '민첩', hint: '치명타 +0.6%' },
  { key: 'con', label: '체력', hint: '최대 체력 +18' }, { key: 'wis', label: '지혜', hint: '최대 내력 +10' },
];
const DEFAULT_SHOP = { name: '잡화상인 리나', portrait: 'ui/portrait_merchant.jpg', quote: '물약은 넉넉히, 후회는 적게. 장사꾼이 해 줄 수 있는 말은 그게 전부야.' };

const nf = n => (typeof n === 'number' ? Math.round(n).toLocaleString('ko-KR') : String(n == null ? '' : n));
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
function h(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

export function create(ctx) {
  const root = ctx.root;
  const emit = (name, data) => { try { ctx.emit && ctx.emit(name, data); } catch (e) { console.error(e); } };
  const doc = root.ownerDocument;

  // ── 스타일 주입(한 번만). 테마가 아직 없으면 테마도 넣는다.
  if (!getComputedStyle(root).getPropertyValue('--gold').trim() && !doc.querySelector('style[data-ui-theme]')) {
    const t = h('style'); t.setAttribute('data-ui-theme', ''); t.textContent = themeCss; doc.head.appendChild(t);
  }
  if (!doc.querySelector('style[data-ui-windows]')) {
    const s = h('style'); s.setAttribute('data-ui-windows', ''); s.textContent = css; doc.head.appendChild(s);
  }

  // ── 그림 주소 / 시트 아이콘
  function resolveImg(v) {
    if (!v) return '';
    if (/^(data:|blob:|https?:|file:|\.{1,2}\/|\/)/.test(v)) return v;
    if (v.indexOf('/') < 0 && v.indexOf('.') < 0) v = 'ui/portrait_' + v + '.jpg';
    return ctx.img(v);
  }
  function iconSpec(icon, def) {
    if (icon == null || icon === '') return null;
    if (typeof icon === 'number') return { sheet: def, index: icon };
    if (typeof icon === 'object') return { sheet: icon.sheet || def, index: icon.index | 0 };
    const m = /^(item|skill2?|crest):(\d+)$/.exec(icon);
    if (m) return { sheet: m[1], index: +m[2] };
    if (/^\d+$/.test(icon)) return { sheet: def, index: +icon };
    return { url: resolveImg(icon) };
  }
  function paintIcon(el, icon, def = 'item') {
    const sp = iconSpec(icon, def);
    const k = sp ? (sp.url || sp.sheet + sp.index) : '';
    if (el._k === k) return; el._k = k;
    const st = el.style;
    if (!sp) { st.backgroundImage = 'none'; return; }
    if (sp.url) { st.backgroundImage = `url("${sp.url}")`; st.backgroundSize = 'cover'; st.backgroundPosition = 'center'; return; }
    const S = SHEETS[sp.sheet] || SHEETS.item, i = S.inset;
    const c = sp.index % S.cols, r = Math.floor(sp.index / S.cols) % S.rows;
    const bx = S.cols / (1 - 2 * i), by = S.rows / (1 - 2 * i);
    st.backgroundImage = `url("${ctx.img(S.key)}")`;
    st.backgroundSize = `${bx * 100}% ${by * 100}%`;
    st.backgroundPosition = `${((c + i) / S.cols * bx) / (bx - 1) * 100}% ${((r + i) / S.rows * by) / (by - 1) * 100}%`;
  }
  function slot(cls) { const s = h('div', 'w-slot ' + (cls || '')); s._ico = h('div', 'w-ico'); s.appendChild(s._ico); return s; }
  function setRarity(el, rarity) { if (el._r === rarity) return; if (el._r) el.classList.remove('r-' + el._r); if (rarity) el.classList.add('r-' + rarity); el._r = rarity; }
  const scaleOf = () => (root.getBoundingClientRect().width / 1920) || 1;

  // ── 층
  const L = {};
  for (const n of ['wins', 'dlg-layer', 'over', 'enh', 'full']) { L[n] = h('div', 'w-layer w-' + n); root.appendChild(L[n]); }
  const tip = h('div', 'w-tip w-hide'); root.appendChild(tip);
  function tipOn(el, getHtml, place) {   // place 'top': 요소 위쪽에 띄운다(옆에 붙은 단추를 가리지 않게). 기본은 오른쪽(자리가 없으면 왼쪽)
    el.addEventListener('mouseenter', () => {
      const html = getHtml(); if (!html) return;
      tip.innerHTML = html; tip.classList.remove('w-hide');
      const s = scaleOf(), rr = root.getBoundingClientRect(), r = el.getBoundingClientRect();
      const tw = tip.offsetWidth, th = tip.offsetHeight, x0 = (r.left - rr.left) / s, x1 = (r.right - rr.left) / s, y0 = (r.top - rr.top) / s;
      if (place === 'top' && y0 - 8 - th >= 4) { tip.style.left = clamp((x0 + x1) / 2 - tw / 2, 4, 1912 - tw) + 'px'; tip.style.top = (y0 - 8 - th) + 'px'; return; }
      tip.style.left = (x1 + 10 + tw <= 1912 ? x1 + 10 : Math.max(4, x0 - 10 - tw)) + 'px';
      tip.style.top = clamp(y0, 4, 1076 - th) + 'px';
    });
    el.addEventListener('mouseleave', () => tip.classList.add('w-hide'));
  }

  // ═════════════ 창 공통 ═════════════
  const wins = {}; let zTop = 1; const openOrder = []; const HEAD_H = 46;
  function makeWin(name, cls, title, x, y) {
    const el = h('div', 'w-win w-hide ' + cls); el.dataset.win = name;
    el.style.left = x + 'px'; el.style.top = y + 'px';
    el.innerHTML = '<i class="w-cn tl"><i></i></i><i class="w-cn tr"><i></i></i><i class="w-cn bl"><i></i></i><i class="w-cn br"><i></i></i>';
    const head = h('div', 'w-head', `<div class="w-ttl">${title}</div>`);
    const x_ = h('button', 'w-x'); x_.setAttribute('aria-label', '닫기'); head.appendChild(x_);
    const body = h('div', 'w-body');
    el.appendChild(head); el.appendChild(body); L.wins.appendChild(el);
    x_.addEventListener('click', e => { e.stopPropagation(); close(name); });
    el.addEventListener('pointerdown', () => { el.style.zIndex = ++zTop; });
    let drag = null;
    head.addEventListener('pointerdown', e => {
      if (e.target === x_) return;
      drag = { px: e.clientX, py: e.clientY, x: el.offsetLeft, y: el.offsetTop, s: scaleOf() };
      try { head.setPointerCapture(e.pointerId); } catch (_) { /* 무시 */ }
    });
    head.addEventListener('pointermove', e => {
      if (!drag) return;
      el.style.left = clamp(drag.x + (e.clientX - drag.px) / drag.s, 0, Math.max(0, 1920 - el.offsetWidth)) + 'px';
      el.style.top = clamp(drag.y + (e.clientY - drag.py) / drag.s, 0, 1080 - HEAD_H) + 'px';
    });
    const end = () => { drag = null; liftWins(); };
    head.addEventListener('pointerup', end); head.addEventListener('pointercancel', end);
    return (wins[name] = { el, body, open: false, timer: 0, x, y });
  }
  // 대화창(y 742~, 초상은 686~)이 떠 있는 동안에는 그 아래로 내려오는 창을 위로 들어 올려 가려지지 않게 한다
  function liftWins() {
    for (const k in wins) {
      const w = wins[k], el = w.el;
      const lift = dlgEl && w.open ? clamp(el.offsetTop + el.offsetHeight - 672, 0, Math.max(0, el.offsetTop - 8)) : 0;
      if (w.lift !== lift) { w.lift = lift; el.style.translate = lift ? `0 ${-lift}px` : ''; }
    }
  }
  function open(name) {
    const w = wins[name]; if (!w) return false;
    clearTimeout(w.timer); w.el.classList.remove('w-hide', 'closing'); w.el.style.zIndex = ++zTop;
    const wx = w.el.offsetLeft, wy = w.el.offsetTop; // 화면 밖으로 나가 있으면 기본 자리로 되돌린다
    if (wx < 0 || wy < 0 || wx + w.el.offsetWidth > 1920 || wy + HEAD_H > 1080) { w.el.style.left = w.x + 'px'; w.el.style.top = w.y + 'px'; }
    const i = openOrder.indexOf(name); if (i >= 0) openOrder.splice(i, 1); openOrder.push(name);
    if (!w.open) { w.open = true; emit('windowOpen', name); }
    liftWins(); return true;
  }
  function close(name) {
    const w = wins[name]; if (!w || !w.open) return false;
    w.open = false; w.el.classList.add('closing'); tip.classList.add('w-hide');
    clearTimeout(w.timer); w.timer = setTimeout(() => { w.el.classList.add('w-hide'); w.el.classList.remove('closing'); }, 130);
    const i = openOrder.indexOf(name); if (i >= 0) openOrder.splice(i, 1);
    emit('windowClose', name); return true;
  }
  const isOpen = name => !!(wins[name] && wins[name].open);
  const toggle = name => (isOpen(name) ? close(name) : open(name));
  function closeAll() { for (const n of openOrder.slice()) close(n); }
  const eat = e => { e.preventDefault(); e.stopPropagation(); if (e.stopImmediatePropagation) e.stopImmediatePropagation(); };
  function onKey(e) {
    const ae = doc.activeElement, tg = ae && ae.tagName;
    if (tg === 'INPUT' || tg === 'TEXTAREA' || (ae && ae.isContentEditable)) return; // 채팅 입력 중에는 건드리지 않는다
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    if (e.key === 'Escape') {
      if (raidEl) { eat(e); emit('raidResultClose'); raidResult.hide(); return; }
      if (dlgEl && dlgEsc != null) { eat(e); emit('dialog', dlgEsc); return; }
      if (openOrder.length) { eat(e); close(openOrder[openOrder.length - 1]); }
      return;
    }
    if (dlgEl && !raidEl && !deathEl && /^[1-9]$/.test(e.key)) { // 대화 중 숫자 키는 스킬 단축키로 넘어가지 않게 삼킨다
      eat(e); const o = dlgOpts[+e.key - 1]; if (o) emit('dialog', o.id);
    }
  }
  const keyTarget = doc.defaultView || doc;
  keyTarget.addEventListener('keydown', onKey, true); // 캡처 단계: HUD 단축키보다 먼저 받는다

  // ═════════════ 아이템 공통(풍선·상세 패널) ═════════════
  const SLOT_LABEL = {}; for (const s of EQUIP_SLOTS) SLOT_LABEL[s.id] = s.label;
  const slotLabel = v => (v == null ? '' : SLOT_LABEL[v] || SLOT_LABEL[String(v).replace(/\d+$/, '')] || (EQUIP_SLOTS.some(s => s.label === v) ? v : ''));
  const KIND = { equip: 'equip', use: 'use', etc: 'etc', 장비: 'equip', 소모품: 'use', 기타: 'etc' };
  const kindOf = it => KIND[it.kind] || (typeof it.icon === 'number' ? (it.icon <= 8 ? 'equip' : it.icon <= 13 ? 'use' : 'etc') : 'etc');
  // stats 는 [['방어력','+12'],…] 가 약속이지만 { 방어력: '+12' } 나 [{ name, value }] 도 받는다
  const pairs = s => (Array.isArray(s) ? s.map(p => (Array.isArray(p) ? p : p && typeof p === 'object' ? [p.name != null ? p.name : p.label, p.value] : [p, '']))
    : s && typeof s === 'object' ? Object.keys(s).map(k => [k, s[k]]) : []).filter(p => p[0] != null && p[0] !== '');
  const itemTitle = it => (it.plus ? '+' + it.plus + ' ' : '') + (it.name || '');
  function itemSub(it, label) { // "희귀 등급 · 갑옷 · 착용 중"
    const a = [(RARITY[it.rarity] || '일반') + ' 등급'], k = kindOf(it), sl = label || slotLabel(it.slot);
    if (sl) a.push(sl); else if (k !== 'equip') a.push(KIND_LABEL[k]);
    if (it.count > 1) a.push(nf(it.count) + '개');
    if (it.equipped) a.push('착용 중');
    return a.join(' · ');
  }
  function itemTip(it, label) {
    if (!it) return '';
    const st = pairs(it.stats);
    return `<b class="rar-${it.rarity || 'common'}">${esc(itemTitle(it))}</b><span>${esc(itemSub(it, label))}</span>`
      + (st.length ? '<div class="w-tip-st">' + st.map(p => `<div><i>${esc(p[0])}</i><u>${esc(nf(p[1]))}</u></div>`).join('') + '</div>' : '')
      + (it.desc ? `<em>${esc(it.desc)}</em>` : '');
  }
  // 능력치 칸. ref(같은 칸에 착용 중인 장비)가 있으면 수치 차이를 ▲▼ 로 붙이고, ref 에만 있는 능력치는 '잃는 값'으로 보여 준다
  const statNum = v => { const m = /-?\d+(?:\.\d+)?/.exec(String(v == null ? '' : v).replace(/,/g, '')); return m ? +m[0] : NaN; };
  const statFmt = (d, v) => (Math.round(Math.abs(d) * 10) / 10) + (/%\s*$/.test(String(v)) ? '%' : '');
  function statChips(it, ref) {
    const a = pairs(it.stats), b = ref ? pairs(ref.stats) : [], seen = {};
    let html = a.map(p => {
      seen[p[0]] = 1; let dl = '';
      if (ref) { const o = b.find(x => x[0] === p[0]), d = statNum(p[1]) - (o ? statNum(o[1]) : 0); if (isFinite(d) && Math.abs(d) >= 0.05) dl = `<i class="${d > 0 ? 'up' : 'dn'}">${statFmt(d, p[1])}</i>`; }
      return `<span>${esc(p[0])}<b>${esc(nf(p[1]))}</b>${dl}</span>`;
    }).join('');
    for (const o of b) { const d = statNum(o[1]); if (!seen[o[0]] && isFinite(d) && d > 0) html += `<span class="lost">${esc(o[0])}<i class="dn">${statFmt(d, o[1])}</i></span>`; }
    return html;
  }
  // 판매는 되돌릴 수 없다: 희귀 이상이거나 강화된 장비는 단추를 한 번 더 눌러야 팔린다
  const needConfirm = it => !!it && ((it.rarity && it.rarity !== 'common') || it.plus > 0);
  function armed(b, label) {
    const off = () => { clearTimeout(b._t); if (b.classList.contains('arm')) { b.classList.remove('arm'); b.textContent = b._txt; } };
    if (b.classList.contains('arm')) { off(); return true; }
    b._txt = b.textContent; b.textContent = label || '정말 판매?'; b.classList.add('arm');
    clearTimeout(b._t); b._t = setTimeout(off, 2600);
    return false;
  }
  // 상세 패널: 큰 아이콘 · 이름 · 등급 · 능력치 · 설명 · 되팔기 값 · 행동 단추
  function makeDetail(cls, hint, onAct) {
    const el = h('div', 'w-det w-inset empty ' + (cls || ''));
    const sl = slot('det'); sl._pls = h('span', 'w-pls'); sl.appendChild(sl._pls);
    const main = h('div', 'w-det-main', '<div class="w-det-nm"></div><div class="w-det-sub"></div><div class="w-det-st"></div><div class="w-det-desc"></div>');
    const side = h('div', 'w-det-side', '<div class="w-det-price"><span>되팔기</span><i class="w-coin"><i class="w-ico"></i></i><b></b></div><div class="w-det-btns"></div>');
    el.append(sl, main, side, h('div', 'w-det-none', hint));
    paintIcon(side.querySelector('.w-ico'), 14);
    const q = s => el.querySelector(s), btns = q('.w-det-btns'); let cur = null, sig = '';
    btns.addEventListener('click', e => {
      const b = e.target && e.target.closest ? e.target.closest('button') : null; if (!b || !cur) return;
      if (b.dataset.a === 'sell' && needConfirm(cur) && !armed(b)) return;
      onAct(cur, b.dataset.a);
    });
    return {
      el,
      set(it, label, ref) { // ref: 견줄 장비(가방에서 미착용 장비를 골랐을 때 같은 칸의 착용 장비)
        const s = it ? JSON.stringify([it.id, it.icon, it.name, it.plus, it.rarity, it.count, it.equipped, it.stats, it.desc, it.price, it.actions, label, ref ? [ref.id, ref.name, ref.plus, ref.stats] : 0]) : '';
        cur = it || null; if (s === sig) return; sig = s; // 같은 내용이면 다시 그리지 않는다(확인 대기 중인 단추가 풀리지 않게)
        el.classList.toggle('empty', !it); if (!it) return;
        paintIcon(sl._ico, it.icon); setRarity(sl, it.rarity || 'common'); sl._pls.textContent = it.plus ? '+' + it.plus : '';
        const nm = q('.w-det-nm'); nm.textContent = nm.title = itemTitle(it); nm.className = 'w-det-nm rar-' + (it.rarity || 'common');
        q('.w-det-sub').textContent = itemSub(it, label) + (ref ? ' · 비교: ' + itemTitle(ref) : '');
        q('.w-det-st').innerHTML = statChips(it, ref || null);
        q('.w-det-desc').textContent = it.desc || '';
        const pr = q('.w-det-price'); pr.classList.toggle('w-hide', !(it.price > 0)); pr.querySelector('b').textContent = nf(it.price || 0);
        const acts = (Array.isArray(it.actions) ? it.actions : []).filter(a => ACT_LABEL[a]);
        btns.className = 'w-det-btns' + (acts.length > 3 ? ' many' : '');
        btns.innerHTML = acts.map((a, i) => `<button type="button" class="btn w-sbtn${a === 'sell' ? ' sell' : i === 0 ? ' primary' : ''}" data-a="${a}">${ACT_LABEL[a]}</button>`).join('');
      },
    };
  }

  // ═════════════ 가방 ═════════════
  const invW = makeWin('inventory', 'w-inv', '가방', 1290, 150);
  invW.body.innerHTML = '<div class="w-tabs"><div class="w-tab on">전체</div><div class="w-tab">장비</div><div class="w-tab">소모품</div><div class="w-tab">기타</div></div>'
    + '<div class="w-inv-grid w-inset w-scroll"></div>';
  const invDet = makeDetail('', '아이템을 누르면 상세 정보가 여기에 표시됩니다.', (it, action) => emit('itemAction', { id: it.id, action }));
  invW.body.appendChild(invDet.el);
  invW.body.insertAdjacentHTML('beforeend', '<div class="w-inv-foot"><div class="w-gold w-inset"><div class="w-coin"><div class="w-ico"></div></div><span>금화</span><b>0</b></div>'
    + '<div class="w-wt"><div class="w-wt-t"><span>가방 칸</span><span class="w-num">0 / ' + INV_CAP + '</span></div><div class="w-bar"><i></i></div></div></div>');
  const invGrid = invW.body.querySelector('.w-inv-grid'), invGold = invW.body.querySelector('.w-gold b');
  const invCapBox = invW.body.querySelector('.w-wt'), invCap = invCapBox.querySelector('.w-num'), invCapBar = invCapBox.querySelector('.w-bar i');
  paintIcon(invW.body.querySelector('.w-gold .w-ico'), 14);
  const invSlots = []; let invItems = [], invTab = 0, invCapN = INV_CAP, invUsed = null, invSel = null;
  const invTabs = [...invW.body.querySelectorAll('.w-tab')];
  invTabs.forEach((t, i) => t.addEventListener('click', () => { invTab = i; invTabs.forEach((x, j) => x.classList.toggle('on', i === j)); renderInv(); }));
  function invSlot(i) {
    while (invSlots.length <= i) {
      const s = slot(); s._cnt = h('span', 'w-cnt'); s._pls = h('span', 'w-pls'); s._eq = h('span', 'w-eq', '착용');
      s.append(s._pls, s._eq, s._cnt); invGrid.appendChild(s);
      s.addEventListener('click', () => { if (!s._item) return; invSel = s._item.id; paintInvSel(); emit('itemClick', s._item.id); });
      // 두 번 누르면 바로 착용·사용(판매·강화처럼 되돌리기 어려운 행동은 단추로만)
      s.addEventListener('dblclick', () => { const it = s._item, a = it && Array.isArray(it.actions) ? it.actions[0] : null; if (a === 'equip' || a === 'use') emit('itemAction', { id: it.id, action: a }); });
      tipOn(s, () => itemTip(s._item));
      invSlots.push(s);
    }
    return invSlots[i];
  }
  function paintInvSel() { // 고른 아이템이 목록에서 사라지면(판매·증발) 선택을 푼다
    const it = invSel != null ? invItems.find(x => x.id === invSel) : null;
    if (!it) invSel = null;
    for (const s of invSlots) s.classList.toggle('sel', !!it && s._item === it);
    let ref = null; // 미착용 장비는 같은 칸(반지는 두 칸 중 하나)에 착용 중인 장비와 견준다
    if (it && !it.equipped && it.slot != null && kindOf(it) === 'equip') {
      const base = String(it.slot).replace(/\d+$/, ''), worn = invItems.filter(x => x !== it && x.equipped && x.slot != null && String(x.slot).replace(/\d+$/, '') === base);
      ref = worn.find(x => String(x.slot) === String(it.slot)) || worn[0] || null;
    }
    invDet.set(it || null, '', ref);
  }
  function renderInv() {
    const list = invTab === 0 ? invItems : invItems.filter(it => kindOf(it) === ['', 'equip', 'use', 'etc'][invTab]);
    const n = Math.max(invCapN, Math.ceil(list.length / INV_COLS) * INV_COLS);
    for (let i = 0; i < n; i++) {
      const s = invSlot(i), it = list[i] || null; s._item = it;
      s.classList.remove('w-hide'); s.classList.toggle('has', !!it);
      paintIcon(s._ico, it ? it.icon : null); setRarity(s, it ? it.rarity || 'common' : null);
      s._cnt.textContent = it && it.count > 1 ? nf(it.count) : '';
      s._pls.textContent = it && it.plus ? '+' + it.plus : '';
      s._eq.style.display = it && it.equipped ? '' : 'none';
    }
    for (let i = n; i < invSlots.length; i++) invSlots[i].classList.add('w-hide');
    paintInvSel();
  }
  const inventory = {
    // { gold, cap(칸 수, 기본 40), used(쓴 칸 수. 생략하면 미착용 장비 개수), items:[아이템 표시 객체…] } — 일부만 와도 된다
    set(d = {}) {
      if (d.gold != null) invGold.textContent = nf(d.gold);
      if (d.cap > 0) invCapN = Math.round(d.cap);
      if (d.used !== undefined) invUsed = d.used;
      if (Array.isArray(d.items)) invItems = d.items.filter(Boolean);
      renderInv();
      const used = invUsed != null ? +invUsed || 0 : invItems.filter(it => kindOf(it) === 'equip' && !it.equipped).length;
      invCap.textContent = `${nf(used)} / ${nf(invCapN)}`; invCapBar.style.width = clamp(used / invCapN, 0, 1) * 100 + '%';
      invCapBox.classList.toggle('full', used >= invCapN); invCapBox.classList.toggle('near', used >= invCapN * 0.85 && used < invCapN);
    },
    select(id) { // 밖에서 고를 때는 그 칸이 보이도록 목록도 굴린다
      invSel = id; paintInvSel();
      const s = invSlots.find(x => x._item && x._item.id === invSel && !x.classList.contains('w-hide'));
      if (s) { const t = s.offsetTop - invGrid.offsetTop; if (t < invGrid.scrollTop || t + s.offsetHeight > invGrid.scrollTop + invGrid.clientHeight) invGrid.scrollTop = Math.max(0, t - 10); }
    },
    get selected() { return invSel; },
  };
  renderInv();

  // ═════════════ 장비·능력치 ═════════════
  const chrW = makeWin('character', 'w-chr', '캐릭터', 14, 150);   // 메뉴 단추 [캐릭터]·안내 문구 '캐릭터 창'과 같은 이름
  chrW.body.innerHTML = '<div class="w-doll w-inset"><div class="w-doll-col l"></div><div class="w-doll-col r"></div><div class="w-port"></div>'
    + '<div class="w-doll-name"><span></span><b></b><em></em><u></u></div><div class="w-doll-mid"></div>'
    + '<div class="w-pow"><div class="p"><span>전투력</span><b>0</b></div><div class="f"><span>명성</span><b>0</b></div></div></div>'
    + '<div class="w-chr-r"><div class="w-sec">능력치</div><div class="w-stats w-inset w-scroll"></div>'
    + '<div class="w-sec">능력 분배<em class="w-pts">남은 포인트<b>0</b></em></div><div class="w-alloc w-inset"></div>'
    + '<div class="w-sec">장비 상세</div></div>';
  const chrQ = s => chrW.body.querySelector(s);
  chrQ('.w-port').style.backgroundImage = `url("${ctx.img('ui/portrait_hero.jpg')}")`;
  let chrSel = null, chrPts = 0;
  const chrDet = makeDetail('narrow', '착용한 장비가 없습니다. 가방에서 장비를 골라 착용해 보세요.', (it, action) => emit('itemAction', { id: it.id != null ? it.id : chrSel, action }));
  chrQ('.w-chr-r').appendChild(chrDet.el);
  // 능력 분배: 힘·민첩·체력·지혜. [+] 는 남은 포인트가 있을 때만 켜진다(Shift 를 누른 채 누르면 5번 보낸다)
  const alCells = {};
  for (const a of ALLOC) {
    const c = h('div', 'w-al', `<div class="t"><b>${a.label}</b><span>${a.hint}</span></div><i>0</i>`), b = h('button', 'w-plus off'); b.type = 'button'; b.setAttribute('aria-label', a.label + ' 올리기');
    c.appendChild(b); chrQ('.w-alloc').appendChild(c); alCells[a.key] = { v: c.querySelector('i'), b };
    b.addEventListener('click', e => { if (chrPts <= 0) return; const n = e.shiftKey ? Math.min(5, chrPts) : 1; for (let i = 0; i < n; i++) emit('statAdd', a.key); });
    tipOn(c, () => `<b>${a.label}</b><span>포인트 1마다 ${a.hint}</span><em>Shift 를 누른 채 [+] 를 누르면 5씩 오릅니다.</em>`);
  }
  const eqSlots = {};
  for (const d of EQUIP_SLOTS) {
    const wrap = h('div', 'w-eslot'), s = slot(); s._lbl = h('span', 'w-lbl', d.label); s._pls = h('span', 'w-pls'); s.append(s._lbl, s._pls); wrap.appendChild(s);
    chrQ(d.col === 'm' ? '.w-doll-mid' : '.w-doll-col.' + d.col).appendChild(wrap);
    s.addEventListener('click', () => { if (!s._item) return; chrSel = d.id; paintChrSel(); emit('equipClick', s._item.slot || d.id); });
    tipOn(s, () => itemTip(s._item, d.label));
    eqSlots[d.id] = s; s._def = d;
  }
  const CHR_ORDER = ['weapon'].concat(EQUIP_SLOTS.map(s => s.id).filter(id => id !== 'weapon'));
  function paintChrSel() { // 고른 칸이 비면 무기부터 차례로 찾아 첫 착용 장비를 보여 준다
    if (!chrSel || !eqSlots[chrSel]._item) chrSel = CHR_ORDER.find(id => eqSlots[id]._item) || null;
    for (const id in eqSlots) eqSlots[id].classList.toggle('sel', id === chrSel);
    const s = chrSel ? eqSlots[chrSel] : null;
    chrDet.set(s ? s._item : null, s ? s._def.label : '');
  }
  const character = {
    // { name, level, guild, title, power, fame, stats:{표시이름: 값}, points(미분배), alloc:{str,dex,con,wis}, equip:[{slot, id, icon, name, plus, rarity, stats, desc, actions}] } — 일부만 와도 된다
    set(d = {}) {
      if (d.name != null) { const nb = chrQ('.w-doll-name b'), wide = [...String(d.name)].reduce((a, c) => a + (c.charCodeAt(0) > 0x2e7f ? 1 : 0.56), 0);   // 한글 7~8자 이름도 한 줄에 들어가게 글자를 줄인다(칸 너비 150px)
        nb.textContent = nb.title = d.name; nb.style.fontSize = wide > 7.2 ? '18px' : wide > 6.2 ? '20px' : ''; }
      if (d.guild != null) chrQ('.w-doll-name span').textContent = d.guild ? `[${d.guild}]` : '';
      if (d.level != null) chrQ('.w-doll-name em').textContent = `Lv.${d.level} ${d.job || '기사'}`;
      if (d.title !== undefined) chrQ('.w-doll-name u').textContent = d.title ? `<${d.title}>` : '';
      if (d.fame != null) chrQ('.w-pow .f b').textContent = nf(d.fame);
      if (d.portrait) chrQ('.w-port').style.backgroundImage = `url("${resolveImg(d.portrait)}")`;
      if (d.stats) {
        let html = ''; let pow = d.power;
        for (const k of Object.keys(d.stats)) {
          if (k === '전투력') { pow = d.stats[k]; continue; }
          html += `<div class="w-stat${/공격력|방어력/.test(k) ? ' hi' : ''}"><span>${esc(k)}</span><b>${esc(nf(d.stats[k]))}</b></div>`;
        }
        chrQ('.w-stats').innerHTML = html;
        if (pow != null) chrQ('.w-pow .p b').textContent = nf(pow);
      } else if (d.power != null) chrQ('.w-pow .p b').textContent = nf(d.power);
      if (d.points != null) {
        chrPts = Math.max(0, Math.floor(+d.points || 0));
        const p = chrQ('.w-pts'); p.querySelector('b').textContent = nf(chrPts); p.classList.toggle('has', chrPts > 0);
        for (const k in alCells) alCells[k].b.classList.toggle('off', chrPts <= 0);
      }
      if (d.alloc) for (const k in alCells) if (d.alloc[k] != null) alCells[k].v.textContent = nf(d.alloc[k]);
      if (d.equip) {
        const used = {};
        for (const id in eqSlots) eqSlots[id]._item = null;
        for (const it of d.equip) {
          if (!it) continue;
          // 같은 칸이 겹치면(반지는 2개까지) 뒤의 것은 무시한다. slot 을 안 준 장비만 빈 칸에 차례로 넣는다.
          const def = it.slot != null ? (EQUIP_SLOTS.find(s => s.id === it.slot && !used[s.id]) || EQUIP_SLOTS.find(s => (s.id.replace(/\d+$/, '') === it.slot || s.label === it.slot) && !used[s.id])) : EQUIP_SLOTS.find(s => !used[s.id]);
          if (!def) continue; used[def.id] = 1; eqSlots[def.id]._item = it;
        }
        for (const def of EQUIP_SLOTS) {
          const s = eqSlots[def.id], it = s._item;
          s.classList.toggle('has', !!it); paintIcon(s._ico, it ? it.icon : null); setRarity(s, it ? it.rarity || 'common' : null);
          s._lbl.style.display = it ? 'none' : ''; s._pls.textContent = it && it.plus ? '+' + it.plus : '';
        }
        paintChrSel();
      }
    },
    select(slotId) { if (eqSlots[slotId]) { chrSel = slotId; paintChrSel(); } },
  };

  // ═════════════ 강화 창 ═════════════
  const enW = makeWin('enhance', 'w-enw', '장비 강화', 690, 150);
  enW.body.innerHTML = '<div class="w-enw-npc w-inset"><i></i><span><b>대장장이 브롬</b>「망치는 거짓말을 안 하지. 운이 거짓말을 할 뿐.」</span></div>'
    + '<div class="w-altar w-inset"><div class="w-rune"></div><div class="w-rune b"></div><div class="w-enw-kind w-hide"></div>'
    + '<div class="w-pl cur"><span>현재</span><b>+0</b></div><div class="w-arr a"></div><div class="w-arr b"></div><div class="w-pl nxt"><span>강화 후</span><b>+1</b></div>'
    + '<div class="w-enw-name"><span></span><small></small></div></div>'
    + '<div class="w-rate"><span>성공 확률</span><div class="w-bar"><i></i></div><b>0%</b></div><div class="w-risk safe"></div>'
    + '<div class="w-enw-mid"><div class="w-mats"><div class="w-mat w-inset m1"><span>무기 강화 주문서</span><b>0</b></div><div class="w-mat w-inset m2"><span>축복받은 주문서</span><b>0</b></div></div><div class="w-log w-inset"></div></div>'
    + '<div class="w-enw-foot"><div class="w-chk"><i></i>자동 강화</div><button class="btn primary w-go">강화</button></div>';
  const enQ = s => enW.body.querySelector(s);
  enQ('.w-enw-npc i').style.backgroundImage = `url("${ctx.img('ui/portrait_blacksmith.jpg')}")`;
  const enSlot = slot('big'); enQ('.w-altar').insertBefore(enSlot, enQ('.w-pl'));
  const m1s = slot(), m2s = slot(); paintIcon(m1s._ico, 11); paintIcon(m2s._ico, 13);
  enQ('.m1').prepend(m1s); enQ('.m2').prepend(m2s);
  let enData = { item: null, scrolls: 0, blessed: 0, rate: 0, nextPlus: null, safe: true, log: [], kind: null, scrollName: null }, enAuto = false;
  const enChk = enQ('.w-chk'), enGo = enQ('.w-go'), enChkHint = h('small'); enChk.appendChild(enChkHint);   // 자동 강화가 어디까지 이어지는지(로직이 autoHint 로 알려 줄 때만 보인다)
  enChk.addEventListener('click', () => { enAuto = !enAuto; enChk.classList.toggle('on', enAuto); emit('enhanceAuto', enAuto); });
  enGo.addEventListener('click', () => { if (!playing) emit('enhance'); });
  const enhance = {
    set(d = {}) {
      Object.assign(enData, d);
      if (d.item !== undefined && d.nextPlus === undefined) enData.nextPlus = null; // 장비만 갱신하면 '강화 후'는 다시 plus+1
      const it = enData.item;
      paintIcon(enSlot._ico, it ? it.icon : null); setRarity(enSlot, it ? it.rarity || 'common' : null);
      const plus = it ? it.plus | 0 : 0, nx = enData.nextPlus != null ? enData.nextPlus : plus + 1;
      enQ('.w-pl.cur b').textContent = it ? '+' + plus : '—'; enQ('.w-pl.nxt b').textContent = it ? '+' + nx : '—';
      const nm = enQ('.w-enw-name span'); nm.textContent = it ? it.name : '강화할 장비를 올려 주세요'; nm.className = it ? 'rar-' + (it.rarity || 'common') : '';
      // kind('weapon'|'armor')·scrollName 이 오면 대상 종류와 주문서 종류를 보여 준다(없으면 예전처럼 무기)
      const armor = enData.kind === 'armor', kindTxt = armor ? (it && slotLabel(it.slot)) || '방어구' : '무기';
      enQ('.w-enw-name small').textContent = it ? `${RARITY[it.rarity] || '일반'} 등급 · ${kindTxt}` : '';
      const kb = enQ('.w-enw-kind'); kb.classList.toggle('w-hide', !enData.kind); kb.classList.toggle('armor', armor); kb.textContent = armor ? '방어구 강화' : '무기 강화';
      enQ('.m1 span').textContent = enData.scrollName || (armor ? '방어구 강화 주문서' : '무기 강화 주문서'); paintIcon(m1s._ico, armor ? 12 : 11);
      const r = clamp(+enData.rate || 0, 0, 1), rate = enQ('.w-rate');
      rate.className = 'w-rate' + (r < 0.3 ? ' low' : r < 0.6 ? ' mid' : '');
      rate.querySelector('i').style.width = r * 100 + '%'; rate.querySelector('b').textContent = (r * 100 >= 10 || r === 0 ? Math.round(r * 100) : (r * 100).toFixed(1)) + '%';
      const risk = enQ('.w-risk');
      // risk('safe'|'warn'|'danger')·riskText 가 오면 그대로 보여 준다(실제 규칙에 맞춘 3단계 문구, 빈 상태 안내). 없으면 예전처럼 safe 로만 가른다
      const rk = d.riskText ? (d.risk === 'warn' || d.risk === 'danger' ? d.risk : 'safe') : (enData.safe ? 'safe' : 'danger');
      risk.className = 'w-risk ' + rk;
      risk.textContent = d.riskText || (enData.safe ? '안전 강화 구간 — 실패해도 장비는 사라지지 않습니다.' : '위험 구간 — 실패하면 장비가 증발할 수 있습니다!');
      if (d.autoHint !== undefined) enChkHint.textContent = d.autoHint ? `(${d.autoHint})` : '';
      const sc = +enData.scrolls || 0, bl = enData.blessed === true ? 1 : +enData.blessed || 0;
      enQ('.m1 b').textContent = nf(sc); enQ('.m1').classList.toggle('zero', sc <= 0);
      enQ('.m2 b').textContent = enData.blessed === true ? '사용' : nf(bl); enQ('.m2').classList.toggle('use', bl > 0);
      enGo.disabled = !it || sc <= 0;
      if (d.auto != null) { enAuto = !!d.auto; enChk.classList.toggle('on', enAuto); }
      const log = (enData.log || []).slice(-4);
      enQ('.w-log').innerHTML = log.length ? log.map(s => `<div class="${/증발|파괴|소멸/.test(s) ? 'gone' : /성공/.test(s) ? 'ok' : /실패/.test(s) ? 'bad' : ''}">${esc(s)}</div>`).join('') : '<div>강화 기록이 여기에 남습니다.</div>';
    },
    play: (kind, o) => playEnhance(kind, o),
    get auto() { return enAuto; },
  };

  // ═════════════ 스킬 · 전문화 ═════════════
  // skills.set({ spec, specName, specLevel, canSpec, respecCost, rage:{ name, cur, max, desc } | 숫자, list:[{ id, name, icon, sheet, key, lv, learned, desc, cost, cd, mp, rage, gain, spec }] })
  //   예전 형태(배열 [{ id, icon, name, level, key, mp, cd, desc }])와 Symbol.iterator 만 단 객체도 받는다.
  const skSheet = s => (s && (s.sheet === 1 || s.sheet === '1' || s.sheet === 'skill2') ? 'skill2' : 'skill');
  const specNames = {};   // 전문화 key → 이름(선택 창이 열릴 때 채워진다. 기술 창의 "전문화 전용" 표시에 쓴다)
  const skW = makeWin('skills', 'w-skw', '스킬', 660, 110);
  skW.body.innerHTML = '<div class="w-sk-top w-inset"><div class="w-slot w-sk-sico"><div class="w-ico"></div></div><div class="w-sk-spec"><u>전문화</u><b></b><span></span></div>'
    + '<button type="button" class="btn w-sbtn w-sk-specbtn"></button></div><div class="w-sk-rage"><u></u><i><i></i></i><b></b><span></span></div><div class="w-skl w-inset w-scroll"></div>';
  const skQ = s => skW.body.querySelector(s);
  skQ('.w-sk-specbtn').addEventListener('click', () => emit('specOpen'));
  const skCost = s => (s.cost != null ? String(s.cost) : [s.mp ? '내력 ' + s.mp : '', s.rage ? '투지 ' + s.rage : '', s.gain ? '투지 +' + s.gain : ''].filter(Boolean).join(' · ') || '없음');
  const skCostHtml = s => esc(skCost(s)).replace(/(내력 \d+)/g, '<i class="mp">$1</i>').replace(/(투지 \+\d+)/g, '<i class="gn">$1</i>').replace(/(투지 \d+)/g, '<i class="rg">$1</i>');
  let skData = { list: [] };
  function renderSkills() {
    const d = skData, modern = !!d.modern, top = skQ('.w-sk-top'), rg = skQ('.w-sk-rage');
    top.classList.toggle('w-hide', !modern);
    if (modern) {
      const has = !!d.spec, can = d.canSpec !== false, lv = d.specLevel || 10;
      top.classList.toggle('has', has);
      const ic = skQ('.w-sk-sico .w-ico'), cur = has && d.list.find(s => s.spec === d.spec);
      if (cur) paintIcon(ic, cur.icon, skSheet(cur)); else paintIcon(ic, null);
      skQ('.w-sk-spec b').textContent = has ? (d.specName || specNames[d.spec] || d.spec) : '아직 고르지 않음';
      skQ('.w-sk-spec span').textContent = has ? `전용 기술${cur ? ` [${cur.name}]` : ''} · 변경 ${nf(d.respecCost || 0)} 금화` : can ? '세 갈래 가운데 하나를 고르면 전용 기술(E)이 생깁니다. 첫 선택은 무료.' : `Lv.${lv}에 수호·격노·서약 가운데 하나를 고를 수 있습니다.`;
      const b = skQ('.w-sk-specbtn'); b.textContent = has ? '전문화 변경' : '전문화 선택'; b.classList.toggle('primary', !has && can); b.classList.toggle('off', !can);
    }
    const r = d.rage, ro = r && typeof r === 'object' ? r : r != null ? { cur: +r || 0 } : null;
    rg.classList.toggle('w-hide', !ro);
    if (ro) {
      const max = ro.max > 0 ? ro.max : 100, cur = clamp(+ro.cur || 0, 0, max);
      rg.querySelector('u').textContent = ro.name || '투지'; rg.querySelector('i i').style.width = (cur / max * 100) + '%';
      rg.querySelector('b').textContent = `${Math.round(cur)} / ${max}`; rg.querySelector('span').textContent = ro.desc || ''; rg.title = ro.desc || '';
    }
    const box = skQ('.w-skl'), keep = box.scrollTop; box.innerHTML = '';
    const rows = d.list.map((s, i) => ({ s, i, on: s.learned !== false }));
    if (modern) rows.sort((a, c) => (c.on - a.on) || ((a.s.lv || 0) - (c.s.lv || 0)) || (a.i - c.i));   // 배운 것 먼저, 그 안에서는 레벨순
    let sec = null;
    for (const { s, on } of rows) {
      if (modern && sec !== on) { sec = on; box.appendChild(h('div', 'w-sk-sec' + (on ? '' : ' no'), on ? `익힌 기술<em>${rows.filter(x => x.on).length}</em>` : `아직 익히지 못한 기술<em>${rows.filter(x => !x.on).length}</em>`)); }
      const row = h('div', 'w-skr' + (on ? '' : ' no')), ic = slot(); paintIcon(ic._ico, s.icon, skSheet(s)); row.appendChild(ic);
      const lv = s.lv != null ? s.lv : null, isSpec = !!s.spec || s.kind === 'spec';
      const tag = isSpec ? `<em class="sp">${esc(s.spec && (specNames[s.spec] || (s.spec === d.spec && d.specName)) || '전문화')} 전용</em>` : lv != null ? `<em${on ? '' : ' class="need"'}>Lv.${lv}${on ? '' : '에 익힘'}</em>` : s.level ? `<em>Lv.${s.level}</em>` : '';
      row.insertAdjacentHTML('beforeend', `<div class="n"><b>${esc(s.name)}</b>${s.key ? `<kbd>${esc(s.key)}</kbd>` : ''}${tag}<span>${esc(s.desc || '')}</span></div>`
        + `<div class="m"><div><u>소모</u>${skCostHtml(s)}</div><div><u>대기</u><b>${s.cd ? s.cd + '초' : '없음'}</b></div></div>`);
      tipOn(row, () => `<b>${esc(s.name)}</b><span>소모 ${esc(skCost(s))} · 대기 ${s.cd ? s.cd + '초' : '없음'}${s.key ? ' · 단축키 ' + esc(s.key) : ''}</span>${s.desc ? `<em>${esc(s.desc)}</em>` : ''}`
        + (on ? '' : `<em class="w-tip-warn">${isSpec ? '전문화를 고르면 익힙니다.' : lv != null ? `Lv.${lv}에 익힙니다.` : '아직 익히지 못했습니다.'}</em>`));   // 줄이 잘려도 설명 전체를 볼 수 있다(누르는 동작은 없다)
      box.appendChild(row);
    }
    box.scrollTop = keep;
  }
  const skills = {
    set(d = []) {
      const arr = Array.isArray(d), list = arr ? d : d && Array.isArray(d.list) ? d.list : d && typeof d[Symbol.iterator] === 'function' ? [...d] : [];
      skData = arr || !d ? { list } : { ...d, list, modern: Array.isArray(d.list) };
      skW.el.classList.toggle('modern', !!skData.modern);
      renderSkills();
    },
  };
  skills.set(DEFAULT_SKILLS);

  // 전문화 선택: spec.open({ specs:[{ key, name, icon, sheet, desc, perks:[글], skillName }], current, cost }) / spec.close() → emit('specPick', key)
  const spW = makeWin('spec', 'w-spw', '전문화', 438, 150);
  spW.body.innerHTML = '<div class="w-sp-lead"></div><div class="w-sp-cards"></div><div class="w-sp-foot"></div>';
  const spBox = spW.body.querySelector('.w-sp-cards');
  spBox.addEventListener('click', e => { const b = e.target && e.target.closest ? e.target.closest('button[data-key]') : null; if (b) emit('specPick', b.dataset.key); });
  const spec = {
    open(d = {}) {
      const list = d.specs || [], cur = d.current || null, cost = +d.cost || 0;
      for (const s of list) if (s && s.key) specNames[s.key] = s.name;
      spW.body.querySelector('.w-sp-lead').textContent = cur ? '다른 길로 바꿀 수 있습니다. 바꾸면 전용 기술(E)과 지속 효과가 새 전문화의 것으로 바뀝니다.' : '세 갈래 가운데 하나를 고르십시오. 고른 길의 지속 효과와 전용 기술(E)을 얻습니다.';
      spBox.innerHTML = '';
      for (const s of list) {
        const on = s.key === cur, card = h('div', 'w-sp-card k-' + esc(s.key) + (on ? ' on' : ''));
        const ic = h('div', 'w-sp-ico'); ic.appendChild(h('div', 'w-ico')); paintIcon(ic.firstChild, s.icon, skSheet(s)); card.appendChild(ic);
        const perks = (s.perks || []).map(t => { const m = /^전용 기술\s*(.+)$/.exec(t); return m ? `<li class="sk"><u>전용 기술</u>${esc(m[1])}</li>` : `<li>${esc(t)}</li>`; }).join('');
        card.insertAdjacentHTML('beforeend', `${on ? '<i class="w-sp-cur">현재 전문화</i>' : ''}<div class="w-sp-name">${esc(s.name)}</div><div class="w-sp-desc">${esc(s.desc || '')}</div><ul class="w-sp-perks">${perks}</ul>`
          + (on ? '<div class="w-sp-done">이 길을 걷는 중</div>' : `<button type="button" class="btn${cur ? '' : ' primary'}" data-key="${esc(s.key)}">${cur ? '이 길로 변경' : '이 길을 선택'}</button>`));
        spBox.appendChild(card);
      }
      spW.body.querySelector('.w-sp-foot').innerHTML = cur ? `변경 비용 <b>${nf(cost)}</b> 금화` : cost > 0 ? `선택 비용 <b>${nf(cost)}</b> 금화` : '첫 선택은 <b>무료</b>입니다. 나중에 금화를 내고 바꿀 수 있습니다.';
      open('spec');
    },
    close() { close('spec'); },
    isOpen: () => isOpen('spec'),
  };

  // ═════════════ 문파 ═════════════
  const glW = makeWin('guild', 'w-glw', '문파', 640, 170);
  glW.body.innerHTML = '<div class="w-gl-top w-inset"><div class="w-crest"><div class="w-ico"></div></div><div class="t"><b></b><em></em><span></span></div><div class="c">접속 중<b></b></div></div>'
    + '<div class="w-tr h"><span></span><span>이름</span><span>레벨</span><span>직업</span><span>직위</span><span class="r">기여도</span></div><div class="w-tbl w-scroll"></div>';
  const glData = Object.assign({}, DEFAULT_GUILD, { members: DEFAULT_GUILD.members.map(m => Object.assign({}, m)) });
  const guild = {
    // 일부만 와도 된다(이전 값이 남는다). self:{ name, level, rank, contrib } 을 주면 목록의 내 줄(me)을 실제 주인공으로 바꾼다
    set(d0 = {}) {
      for (const k in d0) if (k !== 'self' && d0[k] !== undefined) glData[k] = k === 'members' ? (d0.members || []).filter(Boolean).map(m => Object.assign({}, m)) : d0[k];
      if (d0.self) { const row = glData.members.find(m => m.name === glData.me); if (row) { if (d0.self.name) row.name = glData.me = d0.self.name; if (d0.self.level != null) row.level = d0.self.level; if (d0.self.rank) row.rank = d0.self.rank; if (d0.self.contrib != null) { row.contrib = d0.self.contrib; glData.members.sort((x, y) => (y.contrib || 0) - (x.contrib || 0)); } } }
      const d = glData, q = s => glW.body.querySelector(s), ms = d.members || [];
      paintIcon(q('.w-crest .w-ico'), d.crest || 0, 'crest');
      q('.t b').textContent = d.name || ''; q('.t em').textContent = d.level ? `문파 Lv.${d.level}` : ''; q('.t span').textContent = d.notice ? '공지 · ' + d.notice : '';
      q('.c b').textContent = `${ms.filter(m => m.online).length} / ${ms.length}`;
      q('.w-tbl').innerHTML = ms.map(m => `<div class="w-tr${m.online ? ' on' : ''}${m.name === d.me ? ' me' : ''}"><span><i class="dot" style="display:block"></i></span><span>${esc(m.name)}</span><span class="w-num">${m.level || ''}</span><span>${esc(m.cls || '')}</span><span class="${/^문주/.test(m.rank || '') ? 'lord' : ''}">${esc(m.rank || '문파원')}</span><span class="r">${nf(m.contrib || 0)}</span></div>`).join('');
    },
  };
  guild.set(DEFAULT_GUILD);

  // ═════════════ 설정 ═════════════
  const stW = makeWin('settings', 'w-stw', '환경 설정', 725, 150);
  const stVal = Object.assign({}, DEFAULT_SETTINGS); const stUpd = {};
  (function buildSettings() {
    const b = stW.body;
    const sec = t => b.appendChild(h('div', 'w-sec', t));
    const slider = (key, label) => {
      const row = h('div', 'w-set', `<span>${label}</span><div class="w-sld"><i></i><u></u></div><b></b>`); b.appendChild(row);
      const sld = row.querySelector('.w-sld'), fill = sld.firstChild, knob = sld.lastChild, out = row.lastChild;
      stUpd[key] = () => { fill.style.width = knob.style.left = stVal[key] + '%'; out.textContent = stVal[key]; };
      const at = e => { const r = sld.getBoundingClientRect(); stVal[key] = Math.round(clamp((e.clientX - r.left) / r.width, 0, 1) * 100); stUpd[key](); emit('setting', { key, value: stVal[key] }); };
      let on = false;
      sld.addEventListener('pointerdown', e => { on = true; try { sld.setPointerCapture(e.pointerId); } catch (_) { /* 무시 */ } at(e); });
      sld.addEventListener('pointermove', e => { if (on) at(e); });
      sld.addEventListener('pointerup', () => { on = false; }); sld.addEventListener('pointercancel', () => { on = false; });
    };
    const toggleRow = (key, label) => {
      const row = h('div', 'w-set', `<span style="width:auto">${label}</span><div class="w-tgl"></div>`); b.appendChild(row);
      const t = row.lastChild; stUpd[key] = () => t.classList.toggle('on', !!stVal[key]);
      t.addEventListener('click', () => { stVal[key] = !stVal[key]; stUpd[key](); emit('setting', { key, value: stVal[key] }); });
    };
    const seg = (key, label, opts) => {
      const row = h('div', 'w-set', `<span>${label}</span><div class="w-seg">${opts.map(o => `<div>${o}</div>`).join('')}</div>`); b.appendChild(row);
      const ds = [...row.querySelectorAll('.w-seg div')]; stUpd[key] = () => ds.forEach(d => d.classList.toggle('on', d.textContent === stVal[key]));
      ds.forEach(d => d.addEventListener('click', () => { stVal[key] = d.textContent; stUpd[key](); emit('setting', { key, value: stVal[key] }); }));
    };
    sec('소리'); slider('master', '전체 음량'); slider('bgm', '배경 음악'); slider('sfx', '효과음');
    sec('화면').style.marginTop = '14px'; seg('quality', '그래픽 품질', ['낮음', '보통', '높음']);
    toggleRow('damage', '피해 숫자 표시'); toggleRow('plates', '다른 모험가 이름표 표시'); toggleRow('shake', '화면 흔들림');
    sec('편의').style.marginTop = '14px'; toggleRow('autoPotion', '체력이 낮으면 물약 자동 사용'); seg('potionAt', '자동 물약 기준', ['40%', '60%', '80%']);
    toggleRow('autoEquip', '더 좋은 장비 자동 착용'); toggleRow('autoSupply', '물약이 떨어지면 마을에서 보급');
    for (const k in stUpd) stUpd[k]();
  })();
  // 그래픽 품질 '낮음' 이면 전체 화면 backdrop-filter 를 불투명 덮개로 바꾼다(setLowFx 로 직접 지정도 가능)
  let lowFxForced = null;
  const applyLowFx = () => root.classList.toggle('w-lowfx', lowFxForced != null ? lowFxForced : stVal.quality === '낮음');
  for (const k of ['quality']) { const u = stUpd[k]; stUpd[k] = () => { u(); applyLowFx(); }; }
  applyLowFx();
  const settings = { set(d = {}) { for (const k in d) if (k in stUpd) { stVal[k] = d[k]; stUpd[k](); } }, get: () => Object.assign({}, stVal) };

  // ═════════════ 상점(잡화점) ═════════════
  const shW = makeWin('shop', 'w-shw', '잡화점', 24, 150); // 왼쪽: 가운데의 주인공과 오른쪽 가방(1290~)을 가리지 않는다
  shW.body.innerHTML = '<div class="w-shw-npc w-inset"><i class="pic"><i class="w-ico"></i></i><span><b></b><u></u></span>'
    + '<div class="w-gold"><div class="w-coin"><div class="w-ico"></div></div><span>보유 금화</span><b>0</b></div></div>'
    + '<div class="w-shw-cols"><div class="w-shw-col"><div class="w-sec">물품 구매</div><div class="w-shw-buy w-inset"></div>'
    + '<div class="w-shw-note w-inset"><b>되팔기 안내</b>착용 중인 장비는 목록에 나오지 않습니다. 희귀 등급 이상이거나 강화된 장비는 단추를 한 번 더 눌러야 팔립니다.</div></div>'
    + '<div class="w-shw-col"><div class="w-sec">되팔기<em class="w-shw-cnt"></em></div><div class="w-shw-sell w-inset w-scroll"></div>'
    + '<div class="w-shw-foot"><span></span><button type="button" class="btn w-sbtn w-sellall">일반 등급 모두 판매</button></div></div></div>';
  const shQ = s => shW.body.querySelector(s);
  paintIcon(shQ('.w-gold .w-ico'), 14);
  const shBuyBox = shQ('.w-shw-buy'), shSellBox = shQ('.w-shw-sell'), shAll = shQ('.w-sellall');
  const shData = { gold: 0, buy: [], sell: [], name: DEFAULT_SHOP.name, quote: DEFAULT_SHOP.quote, portrait: DEFAULT_SHOP.portrait }; let shBuySig = null, shSellSig = null, shNpcSig = null;
  const coinHtml = '<i class="w-coin"><i class="w-ico"></i></i>';
  const paintCoins = box => { for (const c of box.querySelectorAll('.w-coin .w-ico')) paintIcon(c, 14); };
  shBuyBox.addEventListener('click', e => {
    const b = e.target && e.target.closest ? e.target.closest('button') : null, row = b && b.closest('.w-buy'); if (!row) return;
    emit('shopBuy', { id: row.dataset.id, count: +b.dataset.n || 1 });
  });
  shSellBox.addEventListener('click', e => {
    const b = e.target && e.target.closest ? e.target.closest('button') : null, row = b && b.closest('.w-sell'); if (!row || !row._item) return;
    if (needConfirm(row._item) && !armed(b)) return;
    emit('shopSell', row._item.id);
  });
  shAll.addEventListener('click', () => {
    const cm = shData.sell.filter(it => (it.rarity || 'common') === 'common'); if (!cm.length) return;
    if (cm.some(it => it.plus > 0) && !armed(shAll, '강화 장비 포함, 판매?')) return;
    emit('shopSellAll', 'common');
  });
  function paintShopGold() { // 금화가 모자란 물품은 흐리게
    const g = +shData.gold || 0;
    shQ('.w-gold b').textContent = nf(g);
    for (const row of shBuyBox.children) {
      const p = +row.dataset.p || 0; row.classList.toggle('poor', g < p);
      for (const b of row.querySelectorAll('button')) b.classList.toggle('off', g < p * (+b.dataset.n || 1));
    }
  }
  function renderShop() {
    const npc = JSON.stringify([shData.name, shData.quote, shData.portrait]);
    if (npc !== shNpcSig) {
      shNpcSig = npc; shQ('.w-shw-npc b').textContent = shData.name || ''; shQ('.w-shw-npc u').textContent = shData.quote ? `「${shData.quote}」` : '';
      const pic = shQ('.w-shw-npc .pic .w-ico'); pic._k = null;
      if (shData.portrait) { pic.style.backgroundImage = `url("${resolveImg(shData.portrait)}")`; pic.style.backgroundSize = 'cover'; pic.style.backgroundPosition = 'center'; } else paintIcon(pic, 14);
    }
    const bs = JSON.stringify(shData.buy);
    if (bs !== shBuySig) {
      shBuySig = bs; shBuyBox.innerHTML = '';
      for (const it of shData.buy) {
        if (!it) continue;
        const row = h('div', 'w-buy'), s = slot(); row.dataset.id = it.id; row.dataset.p = +it.price || 0;
        paintIcon(s._ico, it.icon); setRarity(s, it.rarity || 'common'); row.appendChild(s);
        row.insertAdjacentHTML('beforeend', `<div class="n"><b class="rar-${it.rarity || 'common'}">${esc(it.name)}</b><span>${esc(it.desc || '')}</span></div>`
          + `<div class="r"><div class="p">${coinHtml}<b>${nf(+it.price || 0)}</b></div><div class="b"><button type="button" class="btn w-sbtn" data-n="1">1개</button><button type="button" class="btn w-sbtn" data-n="10">10개</button></div></div>`);
        for (const b of row.querySelectorAll('button')) tipOn(b, () => `<b>${esc(it.name)} ${b.dataset.n}개</b><span>금화 ${nf((+it.price || 0) * +b.dataset.n)}</span>`, 'top');   // 위쪽: 바로 옆 [10개] 단추와 아랫줄 가격을 가리지 않는다
        shBuyBox.appendChild(row);
      }
      if (!shBuyBox.children.length) shBuyBox.innerHTML = '<div class="w-shw-none">지금은 파는 물건이 없습니다</div>';
      paintCoins(shBuyBox);
    }
    const ss = JSON.stringify(shData.sell);
    if (ss !== shSellSig) {
      shSellSig = ss; const top = shSellBox.scrollTop; shSellBox.innerHTML = ''; tip.classList.add('w-hide');
      for (const it of shData.sell) {
        if (!it) continue;
        const row = h('div', 'w-sell'), s = slot(); row._item = it; s._pls = h('span', 'w-pls', it.plus ? '+' + it.plus : ''); s.appendChild(s._pls);
        paintIcon(s._ico, it.icon); setRarity(s, it.rarity || 'common'); row.appendChild(s);
        const st = pairs(it.stats).map(p => p[0] + ' ' + nf(p[1])).join(' · ');
        row.insertAdjacentHTML('beforeend', `<div class="n"><b class="rar-${it.rarity || 'common'}">${esc(itemTitle(it))}</b><span>${esc((RARITY[it.rarity] || '일반') + (slotLabel(it.slot) ? ' · ' + slotLabel(it.slot) : '') + (st ? ' · ' + st : ''))}</span></div>`
          + `<div class="p">${coinHtml}<b>${nf(+it.price || 0)}</b></div><button type="button" class="btn w-sbtn sell">판매</button>`);
        tipOn(row.querySelector('.n'), () => itemTip(it));
        shSellBox.appendChild(row);
      }
      if (!shSellBox.children.length) shSellBox.innerHTML = '<div class="w-shw-none">되팔 수 있는 장비가 없습니다<span>사냥터에서 얻은 미착용 장비가 여기에 나옵니다.</span></div>';
      paintCoins(shSellBox); shSellBox.scrollTop = top;
      const cm = shData.sell.filter(it => it && (it.rarity || 'common') === 'common'), sum = cm.reduce((a, it) => a + (+it.price || 0), 0);
      shQ('.w-shw-cnt').textContent = shData.sell.length ? `미착용 장비 ${shData.sell.length}개` : '';
      shQ('.w-shw-foot span').innerHTML = cm.length ? `일반 등급 <b>${cm.length}</b>개 · 금화 <b>${nf(sum)}</b>` : '일반 등급 장비 없음';
      shAll.classList.toggle('off', !cm.length);
    }
    paintShopGold();
  }
  const shop = {
    // { gold, buy:[{ id, icon, name, price, desc, rarity }], sell:[아이템 표시 객체…], name, quote, portrait } — 일부만 와도 된다
    set(d = {}) {
      if (d.gold != null) shData.gold = +d.gold || 0;
      if (Array.isArray(d.buy)) shData.buy = d.buy.filter(Boolean);
      if (Array.isArray(d.sell)) shData.sell = d.sell.filter(Boolean);
      for (const k of ['name', 'quote']) if (d[k] !== undefined) shData[k] = d[k];
      if (d.portrait !== undefined) shData.portrait = d.portrait || DEFAULT_SHOP.portrait;   // 초상을 비워 보내면 리나 초상으로 돌아간다
      renderShop();
    },
  };
  renderShop();

  // ═════════════ 도감 ═════════════
  const cxW = makeWin('codex', 'w-cxw', '도감', 660, 130);
  cxW.body.innerHTML = '<div class="w-cx-hint">쓰러뜨린 수가 쌓일 때마다 영구 보너스를 얻습니다.</div><div class="w-cx-list w-scroll"></div>'
    + '<div class="w-sec">누적 보너스</div><div class="w-cx-total w-inset"></div>';
  const cxList = cxW.body.querySelector('.w-cx-list'), cxTotal = cxW.body.querySelector('.w-cx-total');
  const cxData = { entries: [], total: [] }; let cxSig = null;
  function renderCodex() {
    const sig = JSON.stringify(cxData); if (sig === cxSig) return; cxSig = sig;
    const top = cxList.scrollTop; cxList.innerHTML = '';
    for (const e of cxData.entries) {
      if (!e) continue;
      const kills = Math.max(0, Math.floor(+e.kills || 0)), tiers = (Array.isArray(e.tiers) ? e.tiers : []).filter(Boolean).map(t => ({ need: +t.need || 0, bonus: t.bonus || '', done: t.done != null ? !!t.done : kills >= (+t.need || 0) }));
      const nx = tiers.find(t => !t.done), i = nx ? tiers.indexOf(nx) : tiers.length, prev = i > 0 ? tiers[i - 1].need : 0, nDone = tiers.filter(t => t.done).length;
      const f = !tiers.length ? 0 : nx ? clamp((kills - prev) / Math.max(1, nx.need - prev), 0, 1) : 1, unit = e.unit || '';
      const row = h('div', 'w-cx' + (tiers.length && !nx ? ' full' : '') + (kills <= 0 ? ' none' : ''));
      const pic = h('div', 'w-cx-pic'); const im = h('i');
      if (e.portrait) im.style.backgroundImage = `url("${resolveImg(e.portrait)}")`;
      else if (e.icon != null) { im.className = 'ic'; paintIcon(im, e.icon, 'crest'); }
      else { im.className = 'mono'; im.textContent = String(e.name || '?').charAt(0); }
      pic.appendChild(im); row.appendChild(pic);
      row.insertAdjacentHTML('beforeend', `<div class="w-cx-m"><div class="hd"><b title="${esc(e.name || '')}">${esc(e.name || '')}</b>${tiers.length ? `<em>${nDone} / ${tiers.length} 단계</em>` : ''}<span>처치 <u>${nf(kills)}</u>${esc(unit)}</span></div>`
        + `<div class="pg"><div class="w-bar"><i style="width:${(f * 100).toFixed(1)}%"></i></div><span>${!tiers.length ? '' : nx ? `다음 단계까지 ${nf(Math.max(0, nx.need - kills))}${esc(unit)}` : '모든 단계 달성'}</span></div>`
        + `<div class="w-cx-tiers">${tiers.map(t => `<div class="t${t.done ? ' done' : t === nx ? ' next' : ''}" title="${esc(t.bonus)}"><i>${nf(t.need)}</i><span>${esc(t.bonus)}</span></div>`).join('')}</div></div>`);
      cxList.appendChild(row);
    }
    if (!cxList.children.length) cxList.innerHTML = '<div class="w-cx-none">아직 기록된 상대가 없습니다</div>';
    cxList.scrollTop = top;
    const tot = pairs(cxData.total);
    cxTotal.innerHTML = tot.length ? tot.map(p => `<div><span>${esc(p[0])}</span><b>${esc(nf(p[1]))}</b></div>`).join('') : '<em>아직 얻은 보너스가 없습니다. 첫 단계를 달성해 보세요.</em>';
  }
  const codex = {
    // { entries:[{ id, name, portrait|icon, kills, unit, tiers:[{ need, bonus, done }] }], total:[['공격력','+4'],…] } — 일부만 와도 된다
    set(d = {}) {
      if (Array.isArray(d.entries)) cxData.entries = d.entries.filter(Boolean);
      if (d.total !== undefined) cxData.total = d.total || [];
      renderCodex();
    },
  };
  renderCodex();

  // ═════════════ NPC 대화 ═════════════
  let dlgEl = null, dlgOpts = [], dlgTimer = 0, dlgEsc = null;
  const dialog = {
    show(d = {}) {
      dialog.hide();
      dlgOpts = d.options || []; dlgEsc = d.escId != null ? d.escId : null;
      dlgEl = h('div', 'w-dlg' + (dlgOpts.length > 4 ? ' many' : ''), '<i class="w-cn tl"><i></i></i><i class="w-cn tr"><i></i></i><i class="w-cn bl"><i></i></i><i class="w-cn br"><i></i></i>'
        + `<div class="w-dlg-port"></div><div class="w-dlg-name">${esc(d.name || '')}</div><div class="w-dlg-role">${esc(d.role || '')}</div><div class="w-dlg-text w-scroll interactive"></div><div class="w-dlg-opts w-scroll"></div>`);
      if (d.portrait) dlgEl.querySelector('.w-dlg-port').style.backgroundImage = `url("${resolveImg(d.portrait)}")`;
      const box = dlgEl.querySelector('.w-dlg-opts');
      dlgOpts.forEach((o, i) => { const b = h('div', 'w-opt' + (i === 0 ? ' first' : ''), `<span>${esc(o.label)}</span>${i < 9 ? `<kbd>${i + 1}</kbd>` : ''}`); b.title = o.label; b.addEventListener('click', () => emit('dialog', o.id)); box.appendChild(b); });
      const tx = dlgEl.querySelector('.w-dlg-text'), full = String(d.text || ''); let n = 0;
      const done = () => { clearInterval(dlgTimer); tx.textContent = full; };
      if (d.instant) tx.textContent = full; else dlgTimer = setInterval(() => { n += 2; if (n >= full.length) done(); else { tx.textContent = full.slice(0, n); tx.scrollTop = tx.scrollHeight; } }, 24);
      tx.addEventListener('click', done);
      L['dlg-layer'].appendChild(dlgEl); liftWins();
      const more = el => el.classList.toggle('more', el.scrollHeight > el.clientHeight + 2 && el.scrollTop + el.clientHeight < el.scrollHeight - 2); // 더 있으면 아래를 흐리게
      for (const el of [tx, box]) { more(el); el.addEventListener('scroll', () => more(el)); }
      if (!d.instant) { const t0 = dlgTimer, iv = setInterval(() => { if (!dlgEl || dlgTimer !== t0 || tx.textContent.length >= full.length) { clearInterval(iv); if (dlgEl && dlgTimer === t0) more(tx); } }, 200); }
    },
    hide() { clearInterval(dlgTimer); if (dlgEl) { dlgEl.remove(); dlgEl = null; dlgOpts = []; dlgEsc = null; liftWins(); } },
    isOpen: () => !!dlgEl,
  };

  // ═════════════ 레이드 결과 ═════════════
  let raidEl = null;
  const raidResult = {
    show(d = {}) {
      raidResult.hide();
      const rank = d.rank || [], total = rank.reduce((a, r) => a + (+r.dmg || 0), 0) || 1, top = Math.max(1, ...rank.map(r => +r.dmg || 0));
      const fail = d.fail != null ? !!d.fail : /실패|패배|전멸|후퇴/.test(d.title || '');
      const TOPN = 8, meI = rank.findIndex(r => r.me); // 9위 밖의 내 줄은 목록 아래에 따로 붙여 둔다
      const row = (r, i, pin) => `<div class="w-rr t${i + 1}${r.me ? ' me' : ''}${pin ? ' pin' : ''}" style="animation-delay:${0.25 + Math.min(pin ? TOPN : i, TOPN) * 0.07}s"><span class="k">${i + 1}</span><span class="nm">${r.guild ? `<span>[${esc(r.guild)}]</span>` : ''}<b>${esc(r.name)}</b></span>`
        + `<span class="bar"><i style="width:${(+r.dmg || 0) / top * 100}%;animation-delay:${0.45 + Math.min(pin ? TOPN : i, TOPN) * 0.07}s"></i></span><span class="d">${nf(+r.dmg || 0)}<small>${((+r.dmg || 0) / total * 100).toFixed(1)}%</small></span>${r.mvp ? '<span class="w-mvp">MVP</span>' : '<span></span>'}</div>`;
      raidEl = h('div', 'w-layer' + (fail ? ' w-raid-fail' : ''));
      raidEl.innerHTML = '<div class="w-raid-dim"></div><div class="w-raid"><div class="w-raid-ban"><div class="w-raid-rays"></div>'
        + `<small>${esc(d.kicker || '레이드 결과')}</small><b class="${fail ? 'w-raid-ft' : 'gold-text'}">${esc(d.title || '토벌 성공')}</b><span>${esc(d.sub || '')}</span></div>`
        + '<div class="w-raid-pan"><i class="w-cn tl"><i></i></i><i class="w-cn tr"><i></i></i><i class="w-cn bl"><i></i></i><i class="w-cn br"><i></i></i>'
        + `<div class="w-sec">기여도 순위${rank.length > TOPN ? `<em>참가 ${rank.length}명</em>` : ''}</div><div class="w-inset"><div class="w-raid-rank w-scroll">`
        + (rank.length ? rank.map((r, i) => row(r, i)).join('') : '<div class="w-raid-none">기여 기록이 없습니다</div>')
        + '</div>' + (meI >= TOPN ? row(rank[meI], meI, true) : '')
        + '</div><div class="w-sec" style="margin-top:14px">획득 전리품</div><div class="w-raid-loot w-inset w-scroll"></div>'
        + '<div class="w-raid-foot"><button class="btn primary">확인</button></div></div></div>';
      const lootBox = raidEl.querySelector('.w-raid-loot');
      if (!(d.loot || []).length) lootBox.innerHTML = '<div class="w-raid-none">획득한 전리품이 없습니다</div>';
      (d.loot || []).forEach((l, i) => {
        const el = h('div', 'w-lt'), s = slot(); paintIcon(s._ico, l.icon); setRarity(s, l.rarity || 'common'); el.appendChild(s);
        el.insertAdjacentHTML('beforeend', `<div><b class="rar-${l.rarity || 'common'}">${esc(l.name)}${l.count > 1 ? ' ×' + nf(l.count) : ''}</b><span>${RARITY[l.rarity] || '일반'} 등급</span></div>`);
        el.style.animationDelay = 0.8 + Math.min(i, 8) * 0.12 + 's'; lootBox.appendChild(el);
      });
      raidEl.querySelector('.w-raid-foot .btn').addEventListener('click', () => { emit('raidResultClose'); raidResult.hide(); });
      L.over.appendChild(raidEl);
    },
    hide() { if (raidEl) { raidEl.remove(); raidEl = null; } },
    isOpen: () => !!raidEl,
  };

  // ═════════════ 사망 ═════════════
  let deathEl = null, deathTimer = 0;
  const death = {
    show(d = {}) {
      death.hide();
      let sec = Math.max(0, Math.ceil(+d.sec || 0));
      deathEl = h('div', 'w-death', '<div class="w-death-c"><div class="w-death-line"></div><div class="w-death-t">쓰러졌습니다</div><div class="w-death-line"></div>'
        + `<div class="w-death-s">${esc(d.by ? d.by + '에게 쓰러졌습니다.' : '눈앞이 흐려집니다…')}</div><div class="w-death-p">${esc(d.note != null ? d.note : '경험치를 일부 잃었습니다. 문파원들이 당신을 기다립니다.')}</div>` // note: 사망 벌점 안내 문구를 바꿀 때
        + '<div class="w-death-cd"></div><button class="btn primary w-death-b">마을에서 부활</button></div>');
      const cd = deathEl.querySelector('.w-death-cd');
      const paint = () => { cd.innerHTML = sec > 0 ? `<b>${sec}</b>초 뒤 벨로스 성채에서 깨어납니다` : '지금 부활할 수 있습니다'; };
      paint(); deathTimer = setInterval(() => { if (sec > 0) { sec--; paint(); } }, 1000);
      deathEl.querySelector('.w-death-b').addEventListener('click', () => emit('revive'));
      L.over.appendChild(deathEl);
    },
    hide() { clearInterval(deathTimer); if (deathEl) { deathEl.remove(); deathEl = null; } },
    isOpen: () => !!deathEl,
  };

  // ═════════════ 전체 화면: 로딩·타이틀·엔딩 ═════════════
  const logoHtml = cls => `<div class="w-logo ${cls || ''}"><div class="w-logo-crest"></div><div class="w-logo-main" data-t="에르하임">에르하임</div><div class="w-logo-sub">사자의 맹세</div><div class="w-logo-en">서약과 강철의 연대기</div></div>`;
  function embers(n) {
    let s = '<div class="w-embers">';
    for (let i = 0; i < n; i++) { const r = (i * 0.618034) % 1, q = (i * 0.381966 + 0.13) % 1, sz = 2 + (i % 4); s += `<i style="left:${(r * 100).toFixed(1)}%;width:${sz}px;height:${sz}px;--dx:${Math.round(q * 420 - 120)}px;animation-duration:${(7 + q * 9).toFixed(1)}s;animation-delay:-${(r * 16).toFixed(1)}s"></i>`; }
    return s + '</div>';
  }
  function screen(cls, inner) {
    const el = h('div', 'w-scr ' + cls, `<div class="w-bg" style="background-image:url('${ctx.img('ui/key_art.jpg')}')"></div><div class="w-shade"></div>` + inner);
    return el;
  }
  function removeScreen(el) { if (!el) return; el.classList.add('out'); setTimeout(() => el.remove(), 520); }

  let loadEl = null, loadTip = 0, loadTimer = 0;
  const loading = {
    show() {
      if (loadEl) return;
      loadEl = screen('w-load', embers(26) + logoHtml()
        + '<div class="w-load-b"><div class="w-load-tip"><b>도움말</b><span></span></div><div class="w-load-row"><span class="m">에르하임으로 가는 길을 여는 중…</span><b>0%</b></div><div class="w-load-bar"><i></i></div></div>');
      const tipEl = loadEl.querySelector('.w-load-tip span'); tipEl.textContent = TIPS[loadTip % TIPS.length];
      loadTimer = setInterval(() => { loadTip++; tipEl.textContent = TIPS[loadTip % TIPS.length]; }, 3800);
      L.full.appendChild(loadEl);
    },
    set(p, text) {
      if (!loadEl) loading.show();
      p = clamp(+p || 0, 0, 1);
      loadEl.querySelector('.w-load-bar i').style.width = `calc(${p * 100}% - 2px)`;
      loadEl.querySelector('.w-load-row b').textContent = Math.round(p * 100) + '%';
      if (text != null) loadEl.querySelector('.w-load-row .m').textContent = text;
    },
    hide() { clearInterval(loadTimer); removeScreen(loadEl); loadEl = null; },
  };

  let titleEl = null;
  const title = {
    show(o = {}) {
      if (titleEl) title.hide();
      let si = 0;
      titleEl = screen('w-title', embers(34) + '<div class="w-title-col">' + logoHtml()
        + '<div class="w-srv"><span class="l">서버<br>선택</span><i class="dot"></i><span class="n"></span><span class="s"></span><span class="ch">변경</span></div>'
        + '<div class="w-srv-last">최근 접속 · <b>[은사자]</b> 카일 · 기사</div>'
        + '<button class="btn primary w-tbtn">게임 시작</button><button class="btn w-tbtn sub">녹화용 자동 모드</button></div>'
        + '<div class="w-title-foot"><div class="w-rating"><b>맹세</b><span>모험가용</span></div>'
        + '<div>이 게임은 가상의 왕국 에르하임을 배경으로 한 창작물이며, 등장하는 인물·문파·지명은 실제와 관련이 없습니다.<br>지나친 강화는 장비와 마음의 평화를 해칠 수 있습니다. 강화 결과는 대장장이 브롬도 책임지지 않습니다.</div>'
        + '<div class="v">판 1.0.0 · 에르하임 제작단<br>모든 모험가에게 사자의 가호가 함께하기를</div></div>');
      const srv = titleEl.querySelector('.w-srv');
      const paint = () => { const s = SERVERS[si]; srv.querySelector('.n').textContent = s.name; const st = srv.querySelector('.s'); st.textContent = s.state; st.style.color = s.color; const d = srv.querySelector('.dot'); d.style.background = s.color; d.style.boxShadow = '0 0 8px ' + s.color; };
      paint(); srv.addEventListener('click', () => { si = (si + 1) % SERVERS.length; paint(); emit('server', SERVERS[si].name); });
      const [bs, bd] = titleEl.querySelectorAll('.w-tbtn');
      bs.addEventListener('click', () => { emit('titleStart'); o.onStart && o.onStart(); });
      bd.addEventListener('click', () => { emit('titleDemo'); o.onDemo && o.onDemo(); });
      L.full.appendChild(titleEl);
    },
    hide() { removeScreen(titleEl); titleEl = null; },
  };

  let endEl = null;
  const ending = {
    show(d = {}) {
      ending.hide();
      const lines = d.lines || [];
      endEl = screen('w-end', embers(22) + '<div class="w-end-c">' + logoHtml('sm') + '<div class="w-end-lines">'
        + lines.map((l, i) => `<div class="w-end-line" style="animation-delay:${1 + i * 0.45}s">${esc(l).replace(/(\+\d+|\d[\d,]*)/g, '<b>$1</b>')}</div>`).join('')
        + `</div><div class="w-end-thx" style="animation-delay:${1.4 + lines.length * 0.45}s">${esc(d.thanks || '함께해 주셔서 감사합니다')}</div>`
        + `<div class="w-end-foot" style="animation-delay:${1.8 + lines.length * 0.45}s">${esc(d.foot || '에르하임의 모험은 계속됩니다')}</div></div>`);
      L.full.appendChild(endEl);
    },
    hide() { if (endEl) { endEl.remove(); endEl = null; } },
  };

  // ═════════════ 강화 연출 ═════════════
  let playing = null;
  const sprites = {}, colS = {}, colH = {};
  const solid = rgb => colS[rgb] || (colS[rgb] = `rgb(${rgb})`), half = rgb => colH[rgb] || (colH[rgb] = `rgba(${rgb},.5)`);
  function sprite(rgb) {
    if (sprites[rgb]) return sprites[rgb];
    const c = doc.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.18, `rgba(${rgb},.95)`); gr.addColorStop(0.5, `rgba(${rgb},.3)`); gr.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return (sprites[rgb] = c);
  }
  const GOLD = '255,196,84', WHITE = '255,244,214', RED = '255,64,36', EMBER = '255,128,48', ICE = '170,205,255';
  const CX = 960, CY = 440;

  function playEnhance(kind, o = {}) {
    if (kind !== 'success' && kind !== 'fail' && kind !== 'destroy') kind = 'fail';
    if (playing) playing.finish();
    return new Promise(resolve => {
      const item = Object.assign({ icon: 0, name: '여명의 장검', rarity: 'rare', plus: 0 }, enData.item || {}, o.icon != null ? { icon: o.icon } : null, o.rarity ? { rarity: o.rarity } : null);
      const from = o.from != null ? o.from : item.plus | 0, to = o.to != null ? o.to : (kind === 'success' ? from + 1 : kind === 'fail' ? from : 0);
      const name = o.name || item.name;
      const TOTAL = kind === 'success' ? 2400 : kind === 'fail' ? 2200 : 2400, HITS = [250, 550, 850], RES = 1000;
      const lay = L.enh; lay.className = 'w-layer w-enh k-' + kind;
      lay.innerHTML = '<div class="w-enh-dim"></div><div class="w-enh-grey"></div><div class="w-enh-vig"></div><div class="w-enh-stage">'
        + '<div class="w-enh-rays"></div><div class="w-enh-aura"></div><div class="w-enh-circle"></div><div class="w-enh-circle b"></div>'
        + '<div class="w-enh-flare"></div><div class="w-enh-flare v"></div><div class="w-enh-ring"></div><div class="w-enh-ring"></div><div class="w-enh-ring"></div>'
        + '<div class="w-enh-itemwrap"><div class="w-enh-item"><div class="w-ico"></div><div class="w-enh-heat"></div></div></div><div class="w-enh-shards"></div>'
        + '<svg class="w-enh-cracks" viewBox="-320 -320 640 640"></svg>'
        + '<div class="w-enh-hammer"><i class="hl"></i><i class="hd"></i></div>'
        + `<div class="w-enh-head"><small>강화 시도</small><b class="rar-${item.rarity || 'common'}">+${from} ${esc(name)}</b></div>`
        + `<div class="w-enh-plus"><b class="from">+${from}</b><b class="to">+${to}</b></div><div class="w-enh-gauge"><i></i><u class="a"></u><u class="b"></u></div></div>`
        + '<canvas width="1920" height="1080"></canvas><div class="w-enh-flash"></div><div class="w-enh-result"><div class="w-enh-big"></div><div class="w-enh-sub"></div></div>';
      const q = s => lay.querySelector(s), qa = s => [...lay.querySelectorAll(s)];
      const stage = q('.w-enh-stage'), wrap = q('.w-enh-itemwrap'), ico = q('.w-enh-item .w-ico'), heat = q('.w-enh-heat'), hammer = q('.w-enh-hammer');
      const gauge = q('.w-enh-gauge i'), flash = q('.w-enh-flash'), big = q('.w-enh-big'), sub = q('.w-enh-sub'), rings = qa('.w-enh-ring');
      const cv = q('canvas'), g = cv.getContext('2d');
      paintIcon(ico, item.icon);
      void lay.offsetWidth; lay.classList.add('on');
      enW.el.classList.add('busy'); L.wins.classList.add('fx-dim'); L['dlg-layer'].classList.add('fx-dim'); // 연출 중에는 뒤의 창을 가라앉힌다
      const A = (el, kf, opt) => el.animate(kf, Object.assign({ fill: 'forwards', easing: 'ease-out' }, opt));

      // ── 입자
      const P = [];
      const add = p => { p.age = 0; P.push(p); };
      const rnd = (a, b) => a + Math.random() * (b - a);
      function burst(n, x, y, rgb, v0, v1, o2 = {}) {
        for (let i = 0; i < n; i++) {
          const a = o2.a0 != null ? rnd(o2.a0, o2.a1) : Math.random() * 6.283, v = rnd(v0, v1);
          add({ t: o2.t || 1, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: o2.g != null ? o2.g : 600, drag: o2.drag || 1.6, life: rnd(o2.l0 || 0.45, o2.l1 || 1.1), size: rnd(o2.s0 || 1.5, o2.s1 || 3.5), rgb: Array.isArray(rgb) ? rgb[i % rgb.length] : rgb });
        }
      }
      function stepParticles(dt) {
        g.clearRect(0, 0, 1920, 1080);
        for (let i = P.length - 1; i >= 0; i--) {
          const p = P[i]; p.age += dt;
          if (p.age >= p.life) { P[i] = P[P.length - 1]; P.pop(); continue; }
          const k = p.age / p.life;
          if (p.t === 0) { // 빨려 들어오는 빛
            const e = k * k, r = p.r0 * (1 - e), a = p.a + p.sw * e;
            const x = CX + Math.cos(a) * r, y = CY + Math.sin(a) * r * 0.82, s = p.size * (0.6 + k);
            g.globalCompositeOperation = 'lighter'; g.globalAlpha = Math.min(1, k * 3);
            g.drawImage(sprite(p.rgb), x - s, y - s, s * 2, s * 2);
            if (k > 0.25) { const e2 = (k - 0.06) * (k - 0.06), r2 = p.r0 * (1 - e2), a2 = p.a + p.sw * e2; g.strokeStyle = half(p.rgb); g.lineWidth = p.size * 0.5; g.beginPath(); g.moveTo(x, y); g.lineTo(CX + Math.cos(a2) * r2, CY + Math.sin(a2) * r2 * 0.82); g.stroke(); }
            continue;
          }
          const d = Math.exp(-p.drag * dt); p.vx *= d; p.vy = p.vy * d + p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
          if (p.t === 1) { // 불티(줄기)
            g.globalCompositeOperation = 'lighter'; g.globalAlpha = 1 - k * k;
            g.strokeStyle = solid(p.rgb); g.lineWidth = p.size; g.lineCap = 'round';
            g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - p.vx * 0.045, p.y - p.vy * 0.045); g.stroke();
            const s = p.size * 3; g.drawImage(sprite(p.rgb), p.x - s, p.y - s, s * 2, s * 2);
          } else if (p.t === 2) { // 빛 알갱이
            g.globalCompositeOperation = 'lighter'; g.globalAlpha = Math.sin(Math.PI * Math.min(1, k * 1.15)) * (0.6 + 0.4 * Math.sin(p.age * 30 + p.x));
            const s = p.size * 5; g.drawImage(sprite(p.rgb), p.x - s, p.y - s, s * 2, s * 2);
          } else { // 재
            g.globalCompositeOperation = 'source-over'; g.globalAlpha = (1 - k) * 0.85;
            p.x += Math.sin(p.age * 3 + p.size * 9) * 22 * dt;
            g.fillStyle = solid(p.rgb); g.save(); g.translate(p.x, p.y); g.rotate(p.age * p.vr); g.fillRect(-p.size, -p.size * 0.6, p.size * 2, p.size * 1.2); g.restore();
          }
        }
        g.globalAlpha = 1;
      }

      // ── 금 간 자국(SVG)
      function cracks(n, len0, len1) {
        let d = '';
        for (let i = 0; i < n; i++) {
          let a = (i / n) * 6.283 + rnd(-0.25, 0.25), x = rnd(-8, 8), y = rnd(-8, 8); const L2 = rnd(len0, len1), seg = 6;
          let s = `M${x.toFixed(1)} ${y.toFixed(1)}`;
          for (let j = 0; j < seg; j++) {
            a += rnd(-0.55, 0.55); x += Math.cos(a) * L2 / seg; y += Math.sin(a) * L2 / seg; s += `L${x.toFixed(1)} ${y.toFixed(1)}`;
            if (j === 2 || j === 4) { const b = a + (Math.random() < 0.5 ? 1 : -1) * rnd(0.6, 1.1), bl = L2 * rnd(0.12, 0.28); s += `M${x.toFixed(1)} ${y.toFixed(1)}L${(x + Math.cos(b) * bl).toFixed(1)} ${(y + Math.sin(b) * bl).toFixed(1)}M${x.toFixed(1)} ${y.toFixed(1)}`; }
          }
          d += `<path class="g" pathLength="1" d="${s}"/><path class="c" pathLength="1" d="${s}"/>`;
        }
        const svg = q('.w-enh-cracks'); svg.innerHTML = d;
        for (const p of svg.querySelectorAll('path')) A(p, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 240, easing: 'cubic-bezier(.1,.8,.2,1)' });
      }

      // ── 산산조각
      function shatter() {
        const box = q('.w-enh-shards'), N = 5, S = 192, c = S / N, pts = []; // 파편 50개, transform·opacity 만 움직인다
        box.style.cssText = 'left:-96px;top:-96px;width:192px;height:192px';
        for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) pts.push([i * c + (i > 0 && i < N ? rnd(-c * 0.36, c * 0.36) : 0), j * c + (j > 0 && j < N ? rnd(-c * 0.36, c * 0.36) : 0)]);
        const bg = ico.style.backgroundImage, bs = ico.style.backgroundSize, bp = ico.style.backgroundPosition;
        const tri = (a, b, d2) => {
          const mx = (a[0] + b[0] + d2[0]) / 3, my = (a[1] + b[1] + d2[1]) / 3, el = doc.createElement('i');
          el.style.cssText = `background-image:${bg.replace(/"/g, "'")};background-size:${bs};background-position:${bp};clip-path:polygon(${a[0].toFixed(1)}px ${a[1].toFixed(1)}px,${b[0].toFixed(1)}px ${b[1].toFixed(1)}px,${d2[0].toFixed(1)}px ${d2[1].toFixed(1)}px);transform-origin:${mx.toFixed(1)}px ${my.toFixed(1)}px`;
          box.appendChild(el);
          const dx = mx - S / 2, dy = my - S / 2, dl = Math.hypot(dx, dy) || 1, sp = rnd(90, 330) * (0.7 + dl / 96 * 0.6), ang = Math.atan2(dy, dx) + rnd(-0.35, 0.35);
          const tx = Math.cos(ang) * sp, ty = Math.sin(ang) * sp, rot = rnd(-720, 720), ax = `${rnd(-1, 1).toFixed(2)},${rnd(-1, 1).toFixed(2)},${rnd(0.2, 1).toFixed(2)}`;
          A(el, [
            { transform: 'translate(0,0) rotate3d(0,0,1,0deg) scale(1)', opacity: 1, easing: 'cubic-bezier(.05,.75,.3,1)' },
            { transform: `translate(${(tx * 0.82).toFixed(0)}px,${(ty * 0.82 - 16).toFixed(0)}px) rotate3d(${ax},${(rot * 0.7).toFixed(0)}deg) scale(1.05)`, opacity: 1, offset: 0.5, easing: 'ease-in' },
            { transform: `translate(${tx.toFixed(0)}px,${(ty + rnd(160, 380)).toFixed(0)}px) rotate3d(${ax},${rot.toFixed(0)}deg) scale(.7)`, opacity: 0 },
          ], { duration: rnd(1000, 1500), easing: 'linear' });
        };
        for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
          const a = pts[j * (N + 1) + i], b = pts[j * (N + 1) + i + 1], c2 = pts[(j + 1) * (N + 1) + i + 1], d2 = pts[(j + 1) * (N + 1) + i];
          if (Math.random() < 0.5) { tri(a, b, c2); tri(a, c2, d2); } else { tri(a, b, d2); tri(b, c2, d2); }
        }
      }
      const shake = (el, cls = 'w-shake') => { if (stVal.shake === false) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }; // 설정의 '화면 흔들림' 을 따른다
      const ringPop = (el, s0, s1, dur, delay = 0) => A(el, [{ transform: `scale(${s0})`, opacity: 1, borderWidth: '8px' }, { transform: `scale(${s1})`, opacity: 0, borderWidth: '1px' }], { duration: dur, delay, easing: 'cubic-bezier(.1,.7,.3,1)' });

      // ── 시간표
      const ev = [];
      const at = (ms, fn) => ev.push([ms, fn]);
      at(0, () => {
        emit('enhanceFx', { kind, phase: 'start' });
        A(stage, [{ transform: 'scale(.8)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 200 });
        A(q('.w-enh-aura'), [{ transform: 'scale(.4)', opacity: 0 }, { transform: 'scale(1.25)', opacity: 1 }], { duration: RES, easing: 'ease-in' });
        A(heat, [{ opacity: 0 }, { opacity: 0.12, offset: 0.6 }, { opacity: 0.85 }], { duration: RES, easing: 'ease-in' });
        A(hammer, [{ opacity: 0 }, { opacity: 1 }], { duration: 120, delay: 40 });
      });
      HITS.forEach((t, n) => {
        at(t - 150, () => A(hammer, [{ transform: 'rotate(38deg)' }, { transform: 'rotate(-44deg)', offset: 0.44, easing: 'ease-out' }, { transform: 'rotate(38deg)' }], { duration: 340, easing: 'cubic-bezier(.6,0,.9,.4)', fill: 'none' }));
        at(t, () => {
          emit('enhanceFx', { kind, phase: 'hit', n });
          gauge.style.width = `calc(${[33.3, 66.6, 100][n]}% - 2px)`;
          A(wrap, [{ transform: 'translate(-9px,12px) scale(.93) rotate(-2deg)', filter: 'brightness(2.4)' }, { transform: 'none', filter: 'brightness(1)' }], { duration: 190, fill: 'none' });
          A(stage, [{ transform: 'translate(-5px,7px)' }, { transform: 'translate(3px,-3px)' }, { transform: 'none' }], { duration: 150, fill: 'none' });
          ringPop(rings[0], 0.7, 2.2 + n * 0.5, 320);
          burst(34 + n * 14, CX + 58, CY - 62, [GOLD, WHITE, EMBER], 300, 1100 + n * 200, { a0: 2.2, a1: 5.4, g: 1500, l0: 0.3, l1: 0.75, s0: 1.5, s1: 3.2 });
          burst(8, CX + 58, CY - 62, WHITE, 40, 160, { t: 2, g: -30, l0: 0.2, l1: 0.4, s0: 6, s1: 12 });
        });
      });
      at(HITS[2] + 40, () => { A(hammer, [{ opacity: 1 }, { opacity: 0 }], { duration: 110 }); for (const c of qa('.w-enh-circle')) try { c.getAnimations()[0].playbackRate = 5; } catch (_) { /* 무시 */ } });
      at(RES, () => {
        lay.classList.add('res'); emit('enhanceFx', { kind, phase: 'result' });
        for (const c of qa('.w-enh-circle')) try { c.getAnimations()[0].playbackRate = 1; } catch (_) { /* 무시 */ }
      });

      if (kind === 'success') {
        at(RES, () => {
          flash.style.background = 'radial-gradient(60% 70% at 50% 41%, #ffffff 0%, #fff0b8 35%, rgba(255,190,70,.85) 70%, rgba(255,150,30,.6) 100%)';
          A(flash, [{ opacity: 0.96 }, { opacity: 0.5, offset: 0.25 }, { opacity: 0 }], { duration: 620 });
          A(heat, [{ opacity: 0.9 }, { opacity: 0 }], { duration: 520 });
          A(q('.w-enh-rays'), [{ opacity: 0, transform: 'scale(.3)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 300, composite: 'add' });
          const fl = qa('.w-enh-flare');
          A(fl[0], [{ opacity: 1, transform: 'scale(.1,3)' }, { opacity: 0.9, transform: 'scale(1,1.6)', offset: 0.3 }, { opacity: 0.35, transform: 'scale(.8,.6)' }], { duration: 1100 });
          A(fl[1], [{ opacity: 1, transform: 'rotate(90deg) scale(.1,3)' }, { opacity: 0.8, transform: 'rotate(90deg) scale(.5,1.4)', offset: 0.3 }, { opacity: 0.2, transform: 'rotate(90deg) scale(.4,.5)' }], { duration: 1100 });
          ringPop(rings[0], 0.5, 8, 750); ringPop(rings[1], 0.5, 6.5, 850, 110); ringPop(rings[2], 0.5, 5, 950, 240);
          A(wrap, [{ transform: 'scale(1)' }, { transform: 'scale(1.62)', offset: 0.3 }, { transform: 'scale(1.18)', offset: 0.62 }, { transform: 'scale(1.28)' }], { duration: 560, easing: 'ease-out' });
          A(q('.w-enh-plus .from'), [{ transform: 'none', opacity: 1 }, { transform: 'translateY(-46px) scale(.7)', opacity: 0 }], { duration: 240, delay: 60 });
          A(q('.w-enh-plus .to'), [{ transform: 'translateY(26px) scale(3.4)', opacity: 0 }, { transform: 'translateY(26px) scale(.9)', opacity: 1, offset: 0.6 }, { transform: 'translateY(26px) scale(1.12)', opacity: 1 }], { duration: 340, delay: 170, easing: 'cubic-bezier(.2,.8,.3,1)' });
          q('.w-enh-head small').textContent = '강화 완료'; q('.w-enh-head b').textContent = `+${to} ${name}`;
          burst(170, CX, CY, [GOLD, WHITE, GOLD, EMBER], 350, 1900, { g: 520, drag: 1.9, l0: 0.6, l1: 1.5, s0: 1.6, s1: 4 });
          burst(60, CX, CY, [WHITE, GOLD], 60, 520, { t: 2, g: -60, drag: 1.2, l0: 0.7, l1: 1.4, s0: 3, s1: 9 });
          const es = enW.el.querySelector('.w-slot.big'); if (es) A(es, [{ filter: 'brightness(4)' }, { filter: 'brightness(1)' }], { duration: 900, fill: 'none' });
        });
        at(RES + 130, () => {
          big.textContent = '강화 성공!';
          A(big, [{ transform: 'scale(3.6)', opacity: 0, filter: 'blur(10px) brightness(3)' }, { transform: 'scale(.9)', opacity: 1, filter: 'blur(0) brightness(1.6)', offset: 0.55 }, { transform: 'scale(1.06)', opacity: 1, offset: 0.78 }, { transform: 'scale(1)', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.3,0,.4,1)', composite: 'add' });
        });
        at(RES + 360, () => { shake(lay.querySelector('.w-enh-result'), 'w-shake'); burst(70, CX, 800, [GOLD, WHITE], 200, 1300, { a0: 3.3, a1: 6.1, g: 900, l0: 0.5, l1: 1.1 }); });
        at(RES + 430, () => {
          sub.innerHTML = `<b>+${from}</b><i>▶</i><b class="t">+${to}</b> <span class="rar-${item.rarity || 'common'}">${esc(name)}</span>`;
          A(sub, [{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], { duration: 260 });
        });
      } else if (kind === 'fail') {
        at(RES, () => {
          P.length = 0; flash.style.background = 'radial-gradient(70% 80% at 50% 41%, #ffd0c0 0%, #ff3a1e 40%, rgba(160,0,0,.9) 100%)';
          A(flash, [{ opacity: 0.92 }, { opacity: 0.35, offset: 0.3 }, { opacity: 0 }], { duration: 520 });
          A(q('.w-enh-vig'), [{ opacity: 0 }, { opacity: 1, offset: 0.15 }, { opacity: 0.55 }], { duration: 900 });
          A(heat, [{ opacity: 0.9 }, { opacity: 0 }], { duration: 140 });
          A(q('.w-enh-aura'), [{ opacity: 1 }, { opacity: 0 }], { duration: 200 });
          cracks(9, 150, 310);
          ringPop(rings[0], 0.6, 5, 600);
          shake(stage); shake(L.wins);
          A(wrap, [{ transform: 'scale(1.12) rotate(3deg)' }, { transform: 'translateY(16px) rotate(-5deg) scale(.96)' }], { duration: 380, easing: 'cubic-bezier(.3,1.6,.5,1)' });
          A(q('.w-enh-plus .from'), [{ transform: 'translateX(-14px)' }, { transform: 'translateX(12px)' }, { transform: 'translateX(-8px)' }, { transform: 'translateX(5px)' }, { transform: 'none' }], { duration: 360, fill: 'none' });
          q('.w-enh-head small').textContent = '강화 실패';
          burst(120, CX, CY, [RED, EMBER, RED], 250, 1300, { g: 1500, drag: 1.4, l0: 0.5, l1: 1.2, s0: 1.5, s1: 3.6 });
          for (let i = 0; i < 46; i++) add({ t: 3, x: CX + rnd(-110, 110), y: CY + rnd(-110, 90), vx: rnd(-160, 160), vy: rnd(-260, 60), g: 420, drag: 0.8, life: rnd(0.8, 1.3), size: rnd(2, 5), rgb: i % 3 ? '40,16,12' : '120,30,20', vr: rnd(-8, 8) });
        });
        if (to !== from) at(RES + 380, () => { // 수치 하락: 숫자와 머리글을 함께 바꾼다(시간표에 넣어 연출이 끝나면 같이 취소된다)
          q('.w-enh-plus .from').textContent = '+' + to; q('.w-enh-head b').textContent = `+${to} ${name}`;
        });
        at(RES + 130, () => {
          big.textContent = '강화 실패';
          A(big, [{ transform: 'scale(3) rotate(-5deg)', opacity: 0, filter: 'blur(8px)' }, { transform: 'scale(.94) rotate(-2deg)', opacity: 1, filter: 'blur(0)', offset: 0.6 }, { transform: 'scale(1) rotate(-2deg)', opacity: 1 }], { duration: 300, easing: 'cubic-bezier(.4,0,.6,1)', composite: 'add' });
        });
        at(RES + 320, () => { shake(lay.querySelector('.w-enh-result')); });
        at(RES + 440, () => {
          sub.innerHTML = to < from ? `강화 수치가 <b>+${from}</b>에서 <b>+${to}</b>${/[036]$/.test(String(to)) ? '으로' : '로'} 떨어졌습니다` : `<b>+${from}</b> 그대로… 주문서만 재가 되어 흩어집니다`;
          A(sub, [{ opacity: 0 }, { opacity: 1 }], { duration: 300 });
          A(big, [{ transform: 'translateY(0)' }, { transform: 'translateY(8px)' }], { duration: 900, composite: 'add', easing: 'ease-in' });
        });
      } else {
        at(RES, () => {
          P.length = 0; flash.style.background = '#ffffff';
          A(flash, [{ opacity: 0.9 }, { opacity: 0 }], { duration: 240 });
          cracks(11, 90, 170);
          A(wrap, [{ transform: 'translate(-7px,4px)' }, { transform: 'translate(8px,-5px)' }, { transform: 'translate(-9px,-3px)' }, { transform: 'translate(7px,6px)' }, { transform: 'translate(-5px,2px) scale(1.08)' }, { transform: 'translate(4px,-2px) scale(1.14)' }], { duration: 200, easing: 'linear' });
          q('.w-enh-head small').textContent = '강화 실패';
        });
        at(RES + 200, () => {
          lay.classList.add('gone'); emit('enhanceFx', { kind, phase: 'shatter' });
          flash.style.background = 'radial-gradient(50% 60% at 50% 41%, #ffffff 0%, rgba(210,225,255,.9) 40%, rgba(120,130,150,.5) 100%)';
          A(flash, [{ opacity: 1 }, { opacity: 0.3, offset: 0.3 }, { opacity: 0 }], { duration: 560 });
          A(heat, [{ opacity: 0.9 }, { opacity: 0 }], { duration: 100 });
          A(q('.w-enh-aura'), [{ opacity: 1 }, { opacity: 0 }], { duration: 300 });
          A(q('.w-enh-cracks'), [{ opacity: 1 }, { opacity: 0 }], { duration: 260 });
          A(wrap, [{ transform: 'scale(1.14)' }, { transform: 'scale(1)' }], { duration: 300 });
          shatter(); shake(stage); shake(L.wins);
          ringPop(rings[0], 0.5, 9, 800); ringPop(rings[1], 0.5, 6, 1000, 120);
          burst(90, CX, CY, [ICE, '255,255,255', '200,205,215'], 300, 1700, { g: 700, drag: 2, l0: 0.3, l1: 0.7, s0: 1.4, s1: 3.2 });
          for (let i = 0; i < 150; i++) add({ t: 3, x: CX + rnd(-150, 150), y: CY + rnd(-130, 130), vx: rnd(-240, 240), vy: rnd(-330, 40), g: -40, drag: 1.5, life: rnd(0.9, 1.25), size: rnd(1.5, 5), rgb: ['150,154,164', '92,96,106', '200,204,212'][i % 3], vr: rnd(-6, 6) });
          q('.w-enh-head b').className = ''; q('.w-enh-head b').style.color = '#7d818b'; q('.w-enh-head small').textContent = '장비 소멸';
        });
        at(RES + 430, () => {
          big.textContent = '장비가 증발했습니다…';
          A(big, [{ opacity: 0, letterSpacing: '.7em', filter: 'blur(12px)' }, { opacity: 1, letterSpacing: '.2em', filter: 'blur(0)' }], { duration: 650, easing: 'cubic-bezier(.2,.7,.2,1)' });
        });
        at(RES + 600, () => {
          sub.innerHTML = `+${from} ${esc(name)} — 다시는 돌아오지 않습니다`;
          A(sub, [{ opacity: 0 }, { opacity: 1 }], { duration: 180 });
        });
      }
      at(TOTAL - 230, () => { lay.classList.remove('on'); });
      ev.sort((a, b) => a[0] - b[0]);

      // ── 진행
      let ei = 0, raf = 0, done = false, last = performance.now(), spawnAcc = 0; const T0 = last;
      function frame(now) {
        if (done) return;
        const t = now - T0, dt = Math.min(0.05, (now - last) / 1000); last = now;
        while (ei < ev.length && ev[ei][0] <= t) ev[ei++][1]();
        if (t < RES) { // 빛이 모여든다
          spawnAcc += dt * (70 + 260 * (t / RES));
          while (spawnAcc >= 1) { spawnAcc--; add({ t: 0, a: Math.random() * 6.283, r0: rnd(320, 640), sw: rnd(1.2, 2.6), life: rnd(0.35, 0.6), size: rnd(3, 8), rgb: Math.random() < 0.3 ? WHITE : GOLD }); }
        } else if (kind === 'success' && t < TOTAL - 350) { // 솟구치는 금빛
          spawnAcc += dt * 150;
          while (spawnAcc >= 1) { spawnAcc--; const a = Math.random() * 6.283, r = rnd(40, 300); add({ t: 2, x: CX + Math.cos(a) * r, y: CY + Math.sin(a) * r * 0.7 + 40, vx: rnd(-40, 40), vy: rnd(-380, -120), g: -80, drag: 0.6, life: rnd(0.5, 1), size: rnd(1.5, 5), rgb: Math.random() < 0.3 ? WHITE : GOLD }); }
        } else if (kind === 'destroy' && t > RES + 250 && t < TOTAL - 350) { // 떠오르는 재
          spawnAcc += dt * 50;
          while (spawnAcc >= 1) { spawnAcc--; add({ t: 3, x: CX + rnd(-260, 260), y: CY + rnd(-60, 160), vx: rnd(-30, 30), vy: rnd(-130, -40), g: -20, drag: 0.4, life: rnd(0.6, 1), size: rnd(1.2, 3.5), rgb: '128,132,142', vr: rnd(-4, 4) }); }
        }
        stepParticles(dt);
        if (t >= TOTAL) return finish();
        raf = requestAnimationFrame(frame);
      }
      function finish() {
        if (done) return; done = true; cancelAnimationFrame(raf); clearTimeout(guard);
        lay.className = 'w-layer w-enh'; lay.innerHTML = ''; L.wins.classList.remove('w-shake', 'fx-dim'); L['dlg-layer'].classList.remove('fx-dim');
        enW.el.classList.remove('busy'); if (playing === handle) playing = null;
        emit('enhanceFx', { kind, phase: 'end' }); resolve(kind);
      }
      const handle = { finish };
      const guard = setTimeout(finish, TOTAL + 1500); // 탭이 숨겨져 rAF 가 멈춰도 반드시 끝난다
      playing = handle; raf = requestAnimationFrame(frame);
    });
  }

  enhance.set({});
  character.set({ name: '카일', level: 1, guild: '은사자', stats: {}, equip: [] });

  return {
    loading, title, open, close, toggle, isOpen, closeAll,
    inventory, character, enhance, skills, spec, guild, settings, shop, codex,
    dialog, raidResult, death, ending,
    // 게임 쪽 단축키·이동 입력을 막아야 하는 상태인지(대화·결과판·사망·전체 화면·강화 연출)
    isBlocking: () => !!(dlgEl || raidEl || deathEl || loadEl || titleEl || endEl || playing),
    setLowFx(on) { lowFxForced = on == null ? null : !!on; applyLowFx(); },
    destroy() { keyTarget.removeEventListener('keydown', onKey, true); if (playing) playing.finish(); dialog.hide(); death.hide(); clearInterval(loadTimer); for (const k in L) L[k].remove(); tip.remove(); },
  };
}
