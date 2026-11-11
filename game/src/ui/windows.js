// 창·연출 (SPEC 3.2). three.js 를 쓰지 않는 DOM 오버레이.
//   const win = Windows.create({ root, img, emit })
import css from './windows.css';
import themeCss from './theme.css';

const SHEETS = {
  item: { key: 'ui/item_icons.png', cols: 4, rows: 4, inset: 0.085 },
  skill: { key: 'ui/skill_icons.png', cols: 3, rows: 3, inset: 0.035 },
  crest: { key: 'ui/guild_crests.png', cols: 3, rows: 2, inset: 0.03 },
};
const RARITY = { common: '일반', rare: '희귀', epic: '영웅', legend: '전설' };
const TIPS = [
  '강화는 +6까지 안전합니다. 그 다음부터는… 대장장이 브롬도 눈을 감습니다.',
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
  { id: 'roar', icon: 6, name: '사자후', level: 1, key: 'E', mp: 40, cd: 60, desc: '투지를 불태워 공격력이 오른다.' },
  { id: 'recall', icon: 7, name: '귀환', level: 1, key: 'R', mp: 0, cd: 300, desc: '벨로스 성채로 순간이동한다.' },
];
const DEFAULT_GUILD = {
  name: '은사자', crest: 0, level: 7, notice: '오늘 밤 9시 잿불 제단 발카르 토벌. 물약 넉넉히 챙겨 오세요.', me: '카일',
  members: [
    { name: '백야의검', level: 58, cls: '기사', rank: '군주', contrib: 128400, online: true },
    { name: '카일', level: 52, cls: '기사', rank: '수호기사', contrib: 96200, online: true },
    { name: '달빛화살', level: 55, cls: '요정 궁수', rank: '부군주', contrib: 88750, online: true },
    { name: '서리마녀', level: 54, cls: '마법사', rank: '수호기사', contrib: 71300, online: true },
    { name: '무쇠주먹', level: 49, cls: '기사', rank: '문파원', contrib: 40120, online: true },
    { name: '새벽바람', level: 47, cls: '요정 궁수', rank: '문파원', contrib: 33980, online: false },
    { name: '밤까치', level: 45, cls: '마법사', rank: '문파원', contrib: 21040, online: true },
    { name: '은빛갈기', level: 44, cls: '기사', rank: '문파원', contrib: 18800, online: false },
    { name: '도토리장수', level: 38, cls: '요정 궁수', rank: '문파원', contrib: 9050, online: false },
    { name: '초보기사한', level: 21, cls: '기사', rank: '수습', contrib: 1200, online: true },
  ],
};
const DEFAULT_SETTINGS = { master: 80, bgm: 60, sfx: 85, quality: '높음', damage: true, plates: true, shake: true, autoPotion: true };

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
    const m = /^(item|skill|crest):(\d+)$/.exec(icon);
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
  function tipOn(el, getHtml) {
    el.addEventListener('mouseenter', () => {
      const html = getHtml(); if (!html) return;
      tip.innerHTML = html; tip.classList.remove('w-hide');
      const s = scaleOf(), rr = root.getBoundingClientRect(), r = el.getBoundingClientRect();
      const tw = tip.offsetWidth, th = tip.offsetHeight, x0 = (r.left - rr.left) / s, x1 = (r.right - rr.left) / s;
      tip.style.left = (x1 + 10 + tw <= 1912 ? x1 + 10 : Math.max(4, x0 - 10 - tw)) + 'px';
      tip.style.top = clamp((r.top - rr.top) / s, 4, 1076 - th) + 'px';
    });
    el.addEventListener('mouseleave', () => tip.classList.add('w-hide'));
  }

  // ═════════════ 창 공통 ═════════════
  const wins = {}; let zTop = 1; const openOrder = []; const HEAD_H = 46;
  function makeWin(name, cls, title, x, y) {
    const el = h('div', 'w-win w-hide ' + cls);
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

  // ═════════════ 가방 ═════════════
  const invW = makeWin('inventory', 'w-inv', '가방', 1404, 150);
  invW.body.innerHTML = '<div class="w-tabs"><div class="w-tab on">전체</div><div class="w-tab">장비</div><div class="w-tab">소모품</div><div class="w-tab">기타</div></div>'
    + '<div class="w-inv-grid w-inset w-scroll"></div>'
    + '<div class="w-inv-foot"><div class="w-gold w-inset"><div class="w-coin"><div class="w-ico"></div></div><span>금화</span><b>0</b></div>'
    + '<div class="w-wt"><div class="w-wt-t"><span>무게</span><span class="w-num">0%</span></div><div class="w-bar"><i></i></div></div></div>'
    + '<div class="w-inv-cap">칸 <span class="w-num">0 / 42</span></div>';
  const invGrid = invW.body.querySelector('.w-inv-grid'), invGold = invW.body.querySelector('.w-gold b');
  const invWt = invW.body.querySelector('.w-wt .w-num'), invWtBar = invW.body.querySelector('.w-bar i'), invCap = invW.body.querySelector('.w-inv-cap span');
  paintIcon(invW.body.querySelector('.w-coin .w-ico'), 14);
  const invSlots = []; let invItems = [], invTab = 0;
  const invTabs = [...invW.body.querySelectorAll('.w-tab')];
  invTabs.forEach((t, i) => t.addEventListener('click', () => { invTab = i; invTabs.forEach((x, j) => x.classList.toggle('on', i === j)); renderInv(); }));
  function invSlot(i) {
    while (invSlots.length <= i) {
      const s = slot(); s._cnt = h('span', 'w-cnt'); s._pls = h('span', 'w-pls'); s._eq = h('span', 'w-eq', '착용');
      s.append(s._pls, s._eq, s._cnt); invGrid.appendChild(s);
      s.addEventListener('click', () => { if (s._item) emit('itemClick', s._item.id); });
      tipOn(s, () => s._item && `<b class="rar-${s._item.rarity || 'common'}">${s._item.plus ? '+' + s._item.plus + ' ' : ''}${esc(s._item.name)}</b><span>${RARITY[s._item.rarity] || '일반'} 등급${s._item.count > 1 ? ' · ' + nf(s._item.count) + '개' : ''}${s._item.equipped ? ' · 착용 중' : ''}</span>`);
      invSlots.push(s);
    }
    return invSlots[i];
  }
  const KIND = { equip: 'equip', use: 'use', etc: 'etc', 장비: 'equip', 소모품: 'use', 기타: 'etc' };
  const kindOf = it => KIND[it.kind] || (typeof it.icon === 'number' ? (it.icon <= 8 ? 'equip' : it.icon <= 13 ? 'use' : 'etc') : 'etc');
  function renderInv() {
    const list = invTab === 0 ? invItems : invItems.filter(it => kindOf(it) === ['', 'equip', 'use', 'etc'][invTab]);
    const n = Math.max(42, Math.ceil(list.length / 6) * 6);
    for (let i = 0; i < n; i++) {
      const s = invSlot(i), it = list[i] || null; s._item = it;
      s.classList.remove('w-hide'); s.classList.toggle('has', !!it);
      paintIcon(s._ico, it ? it.icon : null); setRarity(s, it ? it.rarity || 'common' : null);
      s._cnt.textContent = it && it.count > 1 ? nf(it.count) : '';
      s._pls.textContent = it && it.plus ? '+' + it.plus : '';
      s._eq.style.display = it && it.equipped ? '' : 'none';
    }
    for (let i = n; i < invSlots.length; i++) invSlots[i].classList.add('w-hide');
  }
  const inventory = {
    set(d = {}) {
      if (d.gold != null) invGold.textContent = nf(d.gold);
      if (d.items) { invItems = d.items; renderInv(); invCap.textContent = `${invItems.length} / ${Math.max(42, Math.ceil(invItems.length / 6) * 6)}`; }
      const wt = d.weight != null ? d.weight : Math.min(0.95, invItems.length * 0.031);
      invWt.textContent = Math.round(wt * 100) + '%'; invWtBar.style.width = wt * 100 + '%';
    },
  };
  renderInv();

  // ═════════════ 장비·능력치 ═════════════
  const chrW = makeWin('character', 'w-chr', '장비', 14, 150);
  chrW.body.innerHTML = '<div class="w-doll w-inset"><div class="w-doll-col l"></div><div class="w-doll-col r"></div><div class="w-port"></div>'
    + '<div class="w-doll-name"><span></span><b></b><em></em></div><div class="w-doll-mid"></div><div class="w-pow"><span>전투력</span><b>0</b></div></div>'
    + '<div class="w-chr-r"><div class="w-sec">능력치</div><div class="w-stats w-inset"></div><div class="w-sec">착용 장비</div><div class="w-eqlist w-inset"></div></div>';
  const chrQ = s => chrW.body.querySelector(s);
  chrQ('.w-port').style.backgroundImage = `url("${ctx.img('ui/portrait_hero.jpg')}")`;
  const eqSlots = {};
  for (const d of EQUIP_SLOTS) {
    const wrap = h('div', 'w-eslot'), s = slot(); s._lbl = h('span', 'w-lbl', d.label); s._pls = h('span', 'w-pls'); s.append(s._lbl, s._pls); wrap.appendChild(s);
    chrQ(d.col === 'm' ? '.w-doll-mid' : '.w-doll-col.' + d.col).appendChild(wrap);
    s.addEventListener('click', () => { if (s._item) emit('equipClick', s._item.slot || d.id); });
    tipOn(s, () => s._item && `<b class="rar-${s._item.rarity || 'common'}">${s._item.plus ? '+' + s._item.plus + ' ' : ''}${esc(s._item.name)}</b><span>${d.label} · ${RARITY[s._item.rarity] || '일반'} 등급</span>`);
    eqSlots[d.id] = s; s._def = d;
  }
  const character = {
    set(d = {}) {
      if (d.name != null) chrQ('.w-doll-name b').textContent = d.name;
      if (d.guild != null) chrQ('.w-doll-name span').textContent = d.guild ? `[${d.guild}]` : '';
      if (d.level != null) chrQ('.w-doll-name em').textContent = `Lv.${d.level} ${d.job || '기사'}`;
      if (d.portrait) chrQ('.w-port').style.backgroundImage = `url("${resolveImg(d.portrait)}")`;
      if (d.stats) {
        let html = ''; let pow = d.power;
        for (const k of Object.keys(d.stats)) {
          if (k === '전투력') { pow = d.stats[k]; continue; }
          html += `<div class="w-stat${/공격력|방어력/.test(k) ? ' hi' : ''}"><span>${esc(k)}</span><b>${esc(nf(d.stats[k]))}</b></div>`;
        }
        chrQ('.w-stats').innerHTML = html;
        if (pow != null) chrQ('.w-pow b').textContent = nf(pow);
      } else if (d.power != null) chrQ('.w-pow b').textContent = nf(d.power);
      if (d.equip) {
        const used = {}; let rows = '';
        for (const id in eqSlots) eqSlots[id]._item = null;
        for (const it of d.equip) {
          // 같은 칸이 겹치면(반지는 2개까지) 뒤의 것은 무시한다. slot 을 안 준 장비만 빈 칸에 차례로 넣는다.
          const def = it.slot != null ? EQUIP_SLOTS.find(s => (s.id === it.slot || s.id.replace(/\d+$/, '') === it.slot || s.label === it.slot) && !used[s.id]) : EQUIP_SLOTS.find(s => !used[s.id]);
          if (!def) continue; used[def.id] = 1; eqSlots[def.id]._item = it;
        }
        for (const def of EQUIP_SLOTS) {
          const s = eqSlots[def.id], it = s._item;
          s.classList.toggle('has', !!it); paintIcon(s._ico, it ? it.icon : null); setRarity(s, it ? it.rarity || 'common' : null);
          s._lbl.style.display = it ? 'none' : ''; s._pls.textContent = it && it.plus ? '+' + it.plus : '';
          if (it) rows += `<div class="w-eqrow"><span>${def.label}</span><b class="rar-${it.rarity || 'common'}">${esc(it.name)}</b>${it.plus ? `<em>+${it.plus}</em>` : ''}</div>`;
        }
        chrQ('.w-eqlist').innerHTML = rows || '<div class="w-eqrow"><span></span><b style="color:var(--ink-faint)">착용한 장비가 없습니다</b></div>';
      }
    },
  };

  // ═════════════ 강화 창 ═════════════
  const enW = makeWin('enhance', 'w-enw', '장비 강화', 690, 150);
  enW.body.innerHTML = '<div class="w-enw-npc w-inset"><i></i><span><b>대장장이 브롬</b>「망치는 거짓말을 안 하지. 운이 거짓말을 할 뿐.」</span></div>'
    + '<div class="w-altar w-inset"><div class="w-rune"></div><div class="w-rune b"></div>'
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
  let enData = { item: null, scrolls: 0, blessed: 0, rate: 0, nextPlus: null, safe: true, log: [] }, enAuto = false;
  const enChk = enQ('.w-chk'), enGo = enQ('.w-go');
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
      enQ('.w-enw-name small').textContent = it ? `${RARITY[it.rarity] || '일반'} 등급 · 무기` : '';
      const r = clamp(+enData.rate || 0, 0, 1), rate = enQ('.w-rate');
      rate.className = 'w-rate' + (r < 0.3 ? ' low' : r < 0.6 ? ' mid' : '');
      rate.querySelector('i').style.width = r * 100 + '%'; rate.querySelector('b').textContent = (r * 100 >= 10 || r === 0 ? Math.round(r * 100) : (r * 100).toFixed(1)) + '%';
      const risk = enQ('.w-risk');
      risk.className = 'w-risk ' + (enData.safe ? 'safe' : 'danger');
      risk.textContent = enData.safe ? '안전 강화 구간 — 실패해도 장비는 사라지지 않습니다.' : '위험 구간 — 실패하면 장비가 증발할 수 있습니다!';
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

  // ═════════════ 스킬 ═════════════
  const skW = makeWin('skills', 'w-skw', '스킬', 700, 140);
  skW.body.innerHTML = '<div class="w-skl w-inset w-scroll"></div>';
  const skills = {
    set(list = []) {
      const box = skW.body.firstChild; box.innerHTML = '';
      for (const s of list) {
        const row = h('div', 'w-skr'), ic = slot(); paintIcon(ic._ico, s.icon, 'skill'); row.appendChild(ic);
        row.insertAdjacentHTML('beforeend', `<div class="n"><b>${esc(s.name)}</b><em>Lv.${s.level || 1}</em><span>${esc(s.desc || '')}</span></div>`
          + `<div class="m">내력 <b>${s.mp || 0}</b><br>재사용 <i>${s.cd ? s.cd + '초' : '없음'}</i></div>${s.key ? `<span class="w-key">${esc(s.key)}</span>` : ''}`);
        row.classList.add('interactive'); row.addEventListener('click', () => emit('skillInfo', s.id));
        box.appendChild(row);
      }
    },
  };
  skills.set(DEFAULT_SKILLS);

  // ═════════════ 문파 ═════════════
  const glW = makeWin('guild', 'w-glw', '문파', 640, 170);
  glW.body.innerHTML = '<div class="w-gl-top w-inset"><div class="w-crest"><div class="w-ico"></div></div><div class="t"><b></b><em></em><span></span></div><div class="c">접속 중<b></b></div></div>'
    + '<div class="w-tr h"><span></span><span>이름</span><span>레벨</span><span>직업</span><span>직위</span><span class="r">기여도</span></div><div class="w-tbl w-scroll"></div>';
  const guild = {
    set(d = {}) {
      const q = s => glW.body.querySelector(s), ms = d.members || [];
      paintIcon(q('.w-crest .w-ico'), d.crest || 0, 'crest');
      q('.t b').textContent = d.name || ''; q('.t em').textContent = d.level ? `문파 Lv.${d.level}` : ''; q('.t span').textContent = d.notice ? '공지 · ' + d.notice : '';
      q('.c b').textContent = `${ms.filter(m => m.online).length} / ${ms.length}`;
      q('.w-tbl').innerHTML = ms.map(m => `<div class="w-tr${m.online ? ' on' : ''}${m.name === d.me ? ' me' : ''}"><span><i class="dot" style="display:block"></i></span><span>${esc(m.name)}</span><span class="w-num">${m.level || ''}</span><span>${esc(m.cls || '')}</span><span class="${/^군주/.test(m.rank || '') ? 'lord' : ''}">${esc(m.rank || '문파원')}</span><span class="r">${nf(m.contrib || 0)}</span></div>`).join('');
    },
  };
  guild.set(DEFAULT_GUILD);

  // ═════════════ 설정 ═════════════
  const stW = makeWin('settings', 'w-stw', '환경 설정', 725, 240);
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
    sec('편의').style.marginTop = '14px'; toggleRow('autoPotion', '체력이 낮으면 물약 자동 사용');
    for (const k in stUpd) stUpd[k]();
  })();
  // 그래픽 품질 '낮음' 이면 전체 화면 backdrop-filter 를 불투명 덮개로 바꾼다(setLowFx 로 직접 지정도 가능)
  let lowFxForced = null;
  const applyLowFx = () => root.classList.toggle('w-lowfx', lowFxForced != null ? lowFxForced : stVal.quality === '낮음');
  for (const k of ['quality']) { const u = stUpd[k]; stUpd[k] = () => { u(); applyLowFx(); }; }
  applyLowFx();
  const settings = { set(d = {}) { for (const k in d) if (k in stUpd) { stVal[k] = d[k]; stUpd[k](); } }, get: () => Object.assign({}, stVal) };

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
        + `<div class="w-death-s">${esc(d.by ? d.by + '에게 쓰러졌습니다.' : '눈앞이 흐려집니다…')}</div><div class="w-death-p">경험치를 일부 잃었습니다. 문파원들이 당신을 기다립니다.</div>`
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
    inventory, character, enhance, skills, guild, settings,
    dialog, raidResult, death, ending,
    // 게임 쪽 단축키·이동 입력을 막아야 하는 상태인지(대화·결과판·사망·전체 화면·강화 연출)
    isBlocking: () => !!(dlgEl || raidEl || deathEl || loadEl || titleEl || endEl || playing),
    setLowFx(on) { lowFxForced = on == null ? null : !!on; applyLowFx(); },
    destroy() { keyTarget.removeEventListener('keydown', onKey, true); if (playing) playing.finish(); dialog.hide(); death.hide(); clearInterval(loadTimer); for (const k in L) L[k].remove(); tip.remove(); },
  };
}
