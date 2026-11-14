// HUD — 화면 위 DOM 오버레이(SPEC 3.1). three.js 를 쓰지 않는다.
// const hud = create({ root, img, emit })
import css from './hud.css';

const SHEETS = {
  skill: { key: 'ui/skill_icons.png', cols: 3, rows: 3, full: 0.292, circ: 0.268 },
  skill2: { key: 'ui/skill_icons2.png', cols: 3, rows: 3, full: 0.3, circ: 0.278 },   // 기술 아이콘 시트 1(선봉 돌파·단죄·출혈·여명·전문화 3종 …)
  item: { key: 'ui/item_icons.png', cols: 4, rows: 4, full: 0.214, circ: 0.2 },
};
const CREST = { key: 'ui/guild_crests.png', cols: 3, cell: 512, sw: 1536, sh: 1024, bw: 397, bh: 485, cx: 256, cy: 247 };
const CH_LABEL = { world: '월드', local: '일반', guild: '문파', party: '파티', trade: '거래', system: '시스템' };
const TABS = [['all', '전체'], ['local', '일반'], ['guild', '문파'], ['party', '파티'], ['trade', '거래'], ['system', '시스템']];
const TAB_ALIAS = { all: 'all', '전체': 'all', world: 'local', '월드': 'local', local: 'local', '일반': 'local', guild: 'guild', '문파': 'guild',
  party: 'party', '파티': 'party', trade: 'trade', '거래': 'trade', system: 'system', '시스템': 'system' };
const KIND_LABEL = { monster: '일반', elite: '정예', boss: '보스', player: '플레이어', npc: 'NPC', enemy: '적대' };
const SKILL_KIND = { builder: '투지 쌓기', spender: '투지 소모', area: '광역', buff: '강화', defense: '방어', heal: '회복', interrupt: '차단', move: '돌진', utility: '이동', spec: '전문화' };
const BAR_ROW = 12;   // 행동 단축 바 한 줄에 놓는 기술 수(넘으면 두 줄로 나눈다)
const NOTICE_TAG = { enhance: '강화', boss: '레이드', drop: '획득', info: '안내', war: '분쟁' };
// [이름, 표시 글, 24×24 선 그림, 작은 단추 여부] — 창 단추 6개는 윗줄, 작은 단추(전체화면·나가기·설정)는 금화 옆 아랫줄에 놓인다
const MENU = [
  ['character', '캐릭터', '<circle cx="12" cy="8" r="3.6"/><path d="M4.8 20.5c.7-4.2 3.5-6.3 7.2-6.3s6.5 2.1 7.2 6.3"/>'],
  ['inventory', '가방', '<path d="M5.5 9h13l1.3 9.6a2 2 0 0 1-2 2.4H6.2a2 2 0 0 1-2-2.4z"/><path d="M9 9V7.2a3 3 0 0 1 6 0V9"/><path d="M9.5 13.5h5"/>'],
  ['enhance', '강화', '<path d="M12 2.8l2.2 3.4v8.3H9.8V6.2z"/><path d="M7.5 14.5h9"/><path d="M12 14.5v6.2"/><path d="M18.6 3.4v4M16.6 5.4h4"/>'],
  ['skills', '스킬', '<path d="M12 3l2.6 5.7 6.1.7-4.5 4.2 1.2 6.1-5.4-3.1-5.4 3.1 1.2-6.1L3.3 9.4l6.1-.7z"/>'],
  ['guild', '문파', '<path d="M6 21V3.5"/><path d="M6 4.5h12l-2.8 3.8L18 12H6"/>'],
  ['codex', '도감', '<path d="M12 6.3C10.1 4.9 7.4 4.4 3.8 4.6v13.7c3.6-.2 6.3.3 8.2 1.7 1.9-1.4 4.6-1.9 8.2-1.7V4.6c-3.6-.2-6.3.3-8.2 1.7z"/><path d="M12 6.3V20"/><path d="M6.6 8.6c1.2 0 2.2.2 3.1.6M6.6 12c1.2 0 2.2.2 3.1.6"/>'],
  ['fullscreen', '전체화면', '<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>', true],
  ['logout', '나가기', '<path d="M10 4H5v16h5"/><path d="M14 8l4 4-4 4"/><path d="M18 12H9"/>', true],
  ['settings', '설정', '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v3M12 18.2v3M2.8 12h3M18.2 12h3M5.5 5.5l2.1 2.1M16.4 16.4l2.1 2.1M5.5 18.5l2.1-2.1M16.4 7.6l2.1-2.1"/>', true],
];
const BOSS_COL = [
  'linear-gradient(180deg,#ff8a6a 0%,#e8341e 34%,#a3140c 66%,#5e0808 100%)',
  'linear-gradient(180deg,#ffc27a 0%,#ee7a1a 34%,#a84a06 66%,#5a2602 100%)',
  'linear-gradient(180deg,#ecaaff 0%,#a448dc 34%,#6a1ea0 66%,#360a5a 100%)',
  'linear-gradient(180deg,#9ad6ff 0%,#3a8cec 34%,#1a52b0 66%,#0a2a66 100%)',
];
const T0 = 'translate(-50%,-50%) ';
const DMG_KF = {
  deal: [{ opacity: 0, transform: T0 + 'translateY(8px) scale(.5)' }, { opacity: 1, transform: T0 + 'translateY(-20px) scale(1.3)', offset: 0.14 },
    { opacity: 1, transform: T0 + 'translateY(-32px) scale(1)', offset: 0.3 }, { opacity: 1, transform: T0 + 'translateY(-52px) scale(1)', offset: 0.72 }, { opacity: 0, transform: T0 + 'translateY(-76px) scale(.9)' }],
  crit: [{ opacity: 0, transform: T0 + 'translateY(0) scale(2.6) rotate(-6deg)' }, { opacity: 1, transform: T0 + 'translateY(-26px) scale(.92) rotate(-6deg)', offset: 0.14 },
    { opacity: 1, transform: T0 + 'translateY(-32px) scale(1.12) rotate(-6deg)', offset: 0.24 }, { opacity: 1, transform: T0 + 'translateY(-48px) scale(1) rotate(-6deg)', offset: 0.74 }, { opacity: 0, transform: T0 + 'translateY(-84px) scale(1.1) rotate(-6deg)' }],
  take: [{ opacity: 0, transform: T0 + 'translate(0,0) scale(1.6)' }, { opacity: 1, transform: T0 + 'translate(-14px,-22px) scale(1)', offset: 0.16 },
    { opacity: 1, transform: T0 + 'translate(-30px,-26px) scale(1)', offset: 0.5 }, { opacity: 0, transform: T0 + 'translate(-46px,6px) scale(.85)' }],
  rise: [{ opacity: 0, transform: T0 + 'translateY(6px) scale(.8)' }, { opacity: 1, transform: T0 + 'translateY(-14px) scale(1)', offset: 0.15 },
    { opacity: 1, transform: T0 + 'translateY(-44px) scale(1)', offset: 0.75 }, { opacity: 0, transform: T0 + 'translateY(-64px) scale(1)' }],
};
const DMG_OPT = { deal: { duration: 950, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'both' }, crit: { duration: 1200, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'both' },
  take: { duration: 900, easing: 'ease-out', fill: 'both' }, rise: { duration: 1300, easing: 'ease-out', fill: 'both' } };
const BOSS_HIT_KF = [{ filter: 'brightness(1)', transform: 'translateX(0)' }, { filter: 'brightness(1.4)', transform: 'translateX(-2px)' }, { filter: 'brightness(1.15)', transform: 'translateX(2px)' }, { filter: 'brightness(1)', transform: 'translateX(0)' }];

const num = (v) => Math.round(v).toLocaleString('ko-KR');
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
function h(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
function restart(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }

export function create(ctx) {
  const root = ctx.root;
  const img = ctx.img || ((k) => k);
  const emit = ctx.emit || (() => {});
  const doc = root.ownerDocument;
  if (!doc.getElementById('hud-css')) { const st = doc.createElement('style'); st.id = 'hud-css'; st.textContent = css; doc.head.appendChild(st); }

  // ── 아이콘 도우미 ─────────────────────────────────────────────
  // icon: 숫자(기본 시트의 칸 번호) | 'skill:3' | 'item:9' | {sheet, i} | 그림 키('ui/...jpg') 또는 URL
  function resolveUrl(v) { return /^(blob:|data:|https?:|file:|\.{1,2}\/)/.test(v) ? v : img(v); }
  function setIcon(el, icon, defSheet, size, round) {
    let sheet = defSheet, i = 0, url = null;
    if (typeof icon === 'number') i = icon;
    else if (typeof icon === 'string') { const m = /^(skill2?|item):(\d+)$/.exec(icon); if (m) { sheet = m[1]; i = +m[2]; } else if (/^\d+$/.test(icon)) i = +icon; else url = resolveUrl(icon); }
    else if (icon && typeof icon === 'object') { sheet = icon.sheet || defSheet; i = icon.i | 0; }
    const s = el.style;
    if (url) { s.backgroundImage = 'url("' + url + '")'; s.backgroundSize = 'cover'; s.backgroundPosition = 'center'; return; }
    const sh = SHEETS[sheet] || SHEETS[defSheet];
    const bs = size / (round ? sh.circ : sh.full);
    const col = i % sh.cols, row = (i / sh.cols) | 0;
    s.backgroundImage = 'url("' + img(sh.key) + '")';
    s.backgroundSize = bs + 'px ' + bs + 'px';
    s.backgroundPosition = (size / 2 - (col + 0.5) / sh.cols * bs) + 'px ' + (size / 2 - (row + 0.5) / sh.rows * bs) + 'px';
  }
  // 기술 아이콘 시트: 0(기본) → 'skill', 1 → 'skill2'
  const skSheet = (d) => (d && (d.sheet === 1 || d.sheet === '1' || d.sheet === 'skill2') ? 'skill2' : 'skill');
  function setCrest(el, idx, w) {
    const s = el.style;
    if (idx == null || idx < 0) { s.display = 'none'; return; }
    const hgt = w * CREST.bh / CREST.bw, k = w / CREST.bw, col = idx % CREST.cols, row = (idx / CREST.cols) | 0;
    s.display = ''; s.width = w + 'px'; s.height = hgt + 'px';
    s.backgroundImage = 'url("' + img(CREST.key) + '")';
    s.backgroundSize = (CREST.sw * k) + 'px ' + (CREST.sh * k) + 'px';
    s.backgroundPosition = (w / 2 - (col * CREST.cell + CREST.cx) * k) + 'px ' + (hgt / 2 - (row * CREST.cell + CREST.cy) * k) + 'px';
  }
  function setBar(fill, lag, v, snap) {
    const t = 'scaleX(' + clamp01(v).toFixed(4) + ')';
    if (snap) { fill.style.transition = 'none'; if (lag) lag.style.transition = 'none'; }
    fill.style.transform = t; if (lag) lag.style.transform = t;
    if (snap) { void fill.offsetWidth; fill.style.transition = ''; if (lag) lag.style.transition = ''; }
  }

  // ── 뼈대 ─────────────────────────────────────────────────────
  const el = h('div', 'h-hud');
  el.innerHTML = `
<div class="h-layer h-plates"></div>
<div class="h-layer h-dmgs"></div>
<div class="h-vig"></div>
<div class="h-layer h-main">
  <div class="h-player">
    <div class="plate"></div>
    <div class="h-pbody">
      <div class="h-nameline"><i class="h-crest"></i><span class="guild"></span><span class="name h-serif"></span><span class="power">전투력<b>0</b></span></div>
      <div class="h-bar hp"><i class="lag"></i><i class="fill"></i><i class="ticks"></i><i class="gloss"></i><span class="h-bartag">HP</span><span class="txt"></span></div>
      <div class="h-bar mp"><i class="lag"></i><i class="fill"></i><i class="gloss"></i><span class="h-bartag">MP</span><span class="txt"></span></div>
    </div>
    <div class="h-portrait"><div class="face"></div><div class="ring2"></div><div class="ring"></div><div class="lv">Lv<b>1</b></div></div>
    <div class="h-buffs"></div>
  </div>
  <div class="h-topc">
    <div class="h-boss">
      <div class="head"><span class="title h-serif"></span><span class="name h-serif"></span><span class="phase"></span></div>
      <div class="row"><i class="cap l"></i><i class="cap r"></i>
        <div class="h-bar"><i class="under"></i><i class="lag"></i><i class="fill"></i><i class="ticks"></i><i class="gloss"></i><span class="txt"></span></div>
        <span class="mult"><small>x</small><b>1</b></span></div>
    </div>
    <div class="h-target">
      <div class="bg"></div><div class="pic"></div>
      <div class="info"><div class="line"><span class="lv"></span><span class="name"></span><span class="kind"></span><span class="pct"></span></div>
        <div class="h-bar hp"><i class="lag"></i><i class="fill"></i><i class="ticks"></i><i class="gloss"></i><span class="txt"></span></div></div>
      <div class="dbs"></div>
    </div>
    <div class="h-cast"><span class="tag"></span><div class="h-bar"><i class="fill"></i><i class="gloss"></i><span class="txt"></span><span class="rt"></span></div></div>
    <div class="h-notice"><div class="bg"></div><div class="rowx"><span class="tag"></span><div class="clip"><div class="msg h-serif"><span class="tx"></span></div></div></div></div>
  </div>
  <div class="h-zoneb"><div class="t gold-text"></div><div class="orn"></div><div class="s h-serif"></div></div>
  <div class="h-menu"></div>
  <div class="h-gold"><div class="h-sys"></div><div class="h-chip"><i class="h-ico"></i><span class="gv">0</span></div></div>
  <div class="h-mini">
    <div class="frame"><canvas width="220" height="220"></canvas><div class="shade"></div><div class="ring"></div><div class="n">N</div></div>
    <div class="zone"><div class="zname h-serif"></div><div class="zsub"><span class="sub"></span><span class="xy"></span></div></div>
  </div>
  <div class="h-quest"><div class="hd h-serif">의뢰</div><div class="list"></div></div>
  <div class="h-chat" data-tab="all"><div class="tabs"></div><div class="body"></div>
    <div class="in"><span class="chn">일반</span><input type="text" maxlength="80" placeholder="Enter 키를 눌러 대화를 입력하세요" spellcheck="false" autocomplete="off"></div></div>
  <div class="h-loot"></div>
  <div class="h-toasts"></div>
  <div class="h-dock">
    <div class="h-autopill">자동사냥 중</div>
    <div class="h-rage"><span class="lb h-serif">투지</span><div class="h-bar"><i class="fill"></i><i class="ticks"></i><i class="gloss"></i><span class="txt"></span></div></div>
    <div class="h-abar">
      <div class="h-abtns"></div><i class="sep"></i>
      <div class="h-quick">
        <button class="h-slot" data-p="hp"><i class="h-ico"></i><span class="k">F1</span><span class="n">0</span></button>
        <button class="h-slot" data-p="mp"><i class="h-ico"></i><span class="k">F2</span><span class="n">0</span></button>
      </div>
    </div>
  </div>
  <div class="h-tip"></div>
  <div class="h-skills"><button class="h-auto"><i class="spin"></i><span class="a">AUTO</span><span class="s">자동사냥</span></button></div>
  <div class="h-exp"><i class="fill"></i><i class="ticks"></i><span class="txt h-out"></span></div>
  <div class="h-lvup"><div class="rays"></div><div class="glow"></div><div class="big gold-text">LEVEL UP</div><div class="line"></div>
    <div class="sub h-serif">레벨<b>1</b>달성</div><div class="sub2">모든 능력치가 상승했습니다</div></div>
</div>
<div class="h-cine t"></div><div class="h-cine b"></div>
<div class="h-caption h-serif"></div>
<div class="h-cinehit"></div>
<div class="h-cinecap h-serif"><span class="tx"></span></div>
<div class="h-cinehint"><kbd>Space</kbd><i>·</i><kbd>클릭</kbd><span>넘기기</span></div>
<div class="h-fade"></div>`;
  root.appendChild(el);
  const q = (s, r) => (r || el).querySelector(s);

  // ── 내 정보 ───────────────────────────────────────────────────
  const P = { name: '', level: 1, guild: '', crest: null, hp: 1, hpMax: 1, mp: 1, mpMax: 1, exp: 0, gold: 0, power: 0, portrait: 'ui/portrait_hero.jpg' };
  const pEl = q('.h-player');
  const pr = { face: q('.face', pEl), lv: q('.lv b', pEl), crest: q('.h-crest', pEl), guild: q('.guild', pEl), name: q('.name', pEl), power: q('.power b', pEl),
    hpF: q('.h-bar.hp .fill', pEl), hpL: q('.h-bar.hp .lag', pEl), hpT: q('.h-bar.hp .txt', pEl),
    mpF: q('.h-bar.mp .fill', pEl), mpL: q('.h-bar.mp .lag', pEl), mpT: q('.h-bar.mp .txt', pEl),
    expF: q('.h-exp .fill'), expT: q('.h-exp .txt'), gold: q('.h-gold .gv'), vig: q('.h-vig') };
  setIcon(q('.h-gold .h-ico'), 14, 'item', 20, true);
  let pInit = false;
  function setPlayer(d) {
    if (!d) return;
    const has = (k) => d[k] !== undefined && (!pInit || d[k] !== P[k]);
    const cName = has('name'), cLv = has('level'), cGuild = has('guild'), cCrest = has('crest'), cHp = has('hp') || has('hpMax'), cMp = has('mp') || has('mpMax'),
      cExp = has('exp'), cGold = has('gold'), cPow = has('power'), cPor = has('portrait');
    for (const k in d) if (d[k] !== undefined) P[k] = d[k];
    const first = !pInit; pInit = true;
    if (cName || first) pr.name.textContent = P.name;
    if (cLv || first) pr.lv.textContent = P.level;
    if (cGuild || first) pr.guild.textContent = P.guild ? '[' + P.guild + ']' : '';
    if (cCrest || first) setCrest(pr.crest, P.guild || P.crest != null ? P.crest : null, 20);
    if (cPor || first) pr.face.style.backgroundImage = P.portrait ? 'url("' + resolveUrl(P.portrait) + '")' : '';
    if (cHp || first) {
      const v = P.hpMax > 0 ? P.hp / P.hpMax : 0;
      setBar(pr.hpF, pr.hpL, v, first);
      pr.hpT.textContent = num(Math.max(0, P.hp)) + ' / ' + num(P.hpMax);
      pr.vig.classList.toggle('on', v > 0 && v < 0.25);
    }
    if (cMp || first) { setBar(pr.mpF, pr.mpL, P.mpMax > 0 ? P.mp / P.mpMax : 0, first); pr.mpT.textContent = num(Math.max(0, P.mp)) + ' / ' + num(P.mpMax); }
    if (cExp || cLv || first) { const e = clamp01(P.exp); pr.expF.style.transform = 'scaleX(' + e.toFixed(4) + ')'; pr.expT.textContent = 'Lv.' + P.level + '   경험치 ' + (e * 100).toFixed(2) + '%'; }
    if (cGold || first) pr.gold.textContent = num(P.gold);
    if (cPow || first) pr.power.textContent = num(P.power);
  }

  // ── 버프 ─────────────────────────────────────────────────────
  const buffBox = q('.h-buffs'); const buffs = new Map();
  function fmtRemain(s) { return s >= 3600 ? Math.ceil(s / 3600) + '시간' : s >= 60 ? Math.ceil(s / 60) + '분' : Math.max(0, Math.ceil(s)) + '초'; }
  function setBuffs(list) {
    list = list || [];
    for (const b of buffs.values()) b.seen = false;
    for (let i = 0; i < list.length; i++) {
      const d = list[i]; let b = buffs.get(d.id);
      if (!b) {
        const e = h('div', 'h-buff'); const ic = h('div', 'ic'); const pic = h('i', 'h-ico'); const cd = h('i', 'cd'); const t = h('div', 't h-out');
        ic.append(pic, cd); e.append(ic, t); buffBox.appendChild(e);
        b = { e, pic, cd, t, icon: undefined, txt: '', p: -1, warn: false, name: '', debuff: false }; buffs.set(d.id, b);
      }
      b.seen = true;
      const ik = d.icon + '/' + skSheet(d);
      if (b.icon !== ik) { b.icon = ik; setIcon(b.pic, d.icon, skSheet(d), 38, false); }
      const deb = !!d.debuff; if (deb !== b.debuff) { b.debuff = deb; b.e.classList.toggle('debuff', deb); }
      if (b.name !== d.name) { b.name = d.name; b.e.title = d.name || ''; }
      const inf = d.remain == null || d.remain === Infinity;
      const txt = inf ? '' : fmtRemain(d.remain); if (txt !== b.txt) { b.txt = txt; b.t.textContent = txt; }
      const p = inf || !d.total ? 0 : Math.round(clamp01(1 - d.remain / d.total) * 100) / 100;
      if (p !== b.p) { b.p = p; b.cd.style.setProperty('--p', p); }
      const warn = !inf && d.remain <= 5; if (warn !== b.warn) { b.warn = warn; b.e.classList.toggle('warn', warn); }
      if (buffBox.children[i] !== b.e) buffBox.insertBefore(b.e, buffBox.children[i] || null);
    }
    for (const [id, b] of buffs) if (!b.seen) { b.e.remove(); buffs.delete(id); }
  }

  // ── 대상 ─────────────────────────────────────────────────────
  const tEl = q('.h-target');
  const tr = { pic: q('.pic', tEl), lv: q('.lv', tEl), name: q('.name', tEl), kind: q('.kind', tEl), pct: q('.pct', tEl), f: q('.fill', tEl), l: q('.lag', tEl), t: q('.txt', tEl) };
  const T = { on: false, name: null, level: null, kind: null, portrait: null, hp: -1, hpMax: -1 };
  // 대상에게 걸린 약화 효과: 대상 창 오른쪽의 작은 아이콘 줄 [{ icon, sheet, name, remain, total }]
  const dbBox = q('.dbs', tEl), dbs = [];
  function setDebuffs(list) {
    list = list || [];
    while (dbs.length > list.length) dbs.pop().e.remove();
    for (let i = 0; i < list.length; i++) {
      const d = list[i]; let b = dbs[i];
      if (!b) { const e = h('div', 'db'), pic = h('i', 'h-ico'), cd = h('i', 'cd'), t = h('span', 't h-out'); e.append(pic, cd, t); dbBox.appendChild(e); b = dbs[i] = { e, pic, cd, t, icon: null, txt: null, p: -1, name: null }; }
      const ik = d.icon + '/' + skSheet(d); if (ik !== b.icon) { b.icon = ik; setIcon(b.pic, d.icon, skSheet(d), 28, false); }
      if (d.name !== b.name) { b.name = d.name; b.e.title = d.name || ''; }
      const inf = d.remain == null || d.remain === Infinity, txt = inf ? '' : '' + Math.max(0, Math.ceil(d.remain)); if (txt !== b.txt) { b.txt = txt; b.t.textContent = txt; }
      const p = inf || !d.total ? 0 : Math.round(clamp01(1 - d.remain / d.total) * 50) / 50; if (p !== b.p) { b.p = p; b.cd.style.setProperty('--p', p); }
    }
  }
  function setTarget(d) {
    if (!d) { if (T.on) { T.on = false; T.name = null; tEl.classList.remove('on'); setDebuffs(null); syncCastBy(); } return; }
    const kind = d.kind || 'monster';
    const fresh = !T.on || T.name !== d.name || T.kind !== kind;
    if (fresh) {
      T.on = true; T.name = d.name; T.kind = kind; T.level = null; T.portrait = 0; T.hp = -1; // 0: 초상이 없는 대상으로 바뀌어도 앞 대상의 그림이 남지 않게 반드시 다시 그린다
      tEl.className = 'h-target k-' + kind; void tEl.offsetWidth; tEl.classList.add('on');
      tr.name.textContent = d.name || ''; tr.kind.textContent = KIND_LABEL[kind] || kind; syncCastBy();
    }
    if (d.debuffs !== undefined || dbs.length) setDebuffs(d.debuffs);
    if (T.level !== d.level) { T.level = d.level; tr.lv.textContent = d.level != null ? 'Lv.' + d.level : ''; }
    if (T.portrait !== d.portrait) { T.portrait = d.portrait; tr.pic.style.backgroundImage = d.portrait ? 'url("' + resolveUrl(d.portrait) + '")' : ''; tr.pic.style.display = d.portrait ? '' : 'none'; }
    if (T.hp !== d.hp || T.hpMax !== d.hpMax) {
      T.hp = d.hp; T.hpMax = d.hpMax; const v = d.hpMax > 0 ? d.hp / d.hpMax : 0;
      setBar(tr.f, tr.l, v, fresh);
      tr.t.textContent = num(Math.max(0, d.hp)) + ' / ' + num(d.hpMax); tr.pct.textContent = (clamp01(v) * 100).toFixed(1) + '%';
    }
  }

  // ── 시전 막대(대상 창 아래) ───────────────────────────────────
  // setCast({ name, t, total, canInterrupt, by } | null) — 시전 중 매 프레임. 차단할 수 있으면 금색 테 + "차단 가능", 아니면 회색
  const cEl_ = q('.h-cast'), cr = { tag: q('.tag', cEl_), f: q('.fill', cEl_), t: q('.txt', cEl_), rt: q('.rt', cEl_) };
  const C = { on: false, name: null, by: null, can: null, rt: '', label: '' };
  function syncCastBy() {   // 시전자가 지금 대상이 아니면 누구의 시전인지 이름을 앞에 붙인다
    if (!C.on) return; const label = C.by && !(T.on && T.name === C.by) ? C.by + ' — ' + C.name : C.name;
    if (label !== C.label) { C.label = label; cr.t.textContent = label; }
  }
  function setCast(d) {
    if (!d) { if (C.on) { C.on = false; C.name = null; C.can = null; cEl_.classList.remove('on'); } return; }
    const can = d.canInterrupt !== false, name = d.name || '', by = d.by || null;
    if (!C.on) { C.on = true; C.label = null; restart(cEl_, 'on'); }
    if (can !== C.can) { C.can = can; cEl_.classList.toggle('can', can); cEl_.classList.toggle('no', !can); cr.tag.textContent = can ? '차단 가능' : '차단 불가'; }
    if (name !== C.name || by !== C.by) { C.name = name; C.by = by; syncCastBy(); }
    const total = d.total > 0 ? d.total : 1, t = Math.max(0, Math.min(total, d.t || 0));
    cr.f.style.transform = 'scaleX(' + (t / total).toFixed(4) + ')';
    const rt = (total - t).toFixed(1) + '초'; if (rt !== C.rt) { C.rt = rt; cr.rt.textContent = rt; }
  }

  // ── 보스 ─────────────────────────────────────────────────────
  const bEl = q('.h-boss'); const bBar = q('.h-bar', bEl);
  const br = { title: q('.title', bEl), name: q('.name', bEl), phase: q('.phase', bEl), under: q('.under', bEl), f: q('.fill', bEl), l: q('.lag', bEl), t: q('.txt', bEl), mult: q('.mult b', bEl), multBox: q('.mult', bEl) };
  let bHitAt = 0;
  const B = { on: false, name: null, title: null, hp: -1, hpMax: -1, phase: -1, phases: -1, line: -1 };
  function setBoss(d) {
    if (!d) { if (B.on) { B.on = false; B.name = null; bEl.classList.remove('on'); } return; }
    const fresh = !B.on || B.name !== d.name;
    if (fresh) { B.on = true; B.name = d.name; B.title = null; B.hp = -1; B.phase = -1; B.line = -1; br.name.textContent = d.name || ''; restart(bEl, 'on'); }
    if (B.title !== d.title) { B.title = d.title; br.title.textContent = d.title || ''; }
    const phases = d.phases || 0, phase = d.phase || 0;
    if (B.phase !== phase || B.phases !== phases) {
      B.phase = phase; B.phases = phases;
      while (br.phase.children.length < phases) br.phase.appendChild(h('i'));
      while (br.phase.children.length > phases) br.phase.lastChild.remove();
      for (let i = 0; i < phases; i++) br.phase.children[i].className = i < phase ? 'on' : '';
    }
    if (B.hp !== d.hp || B.hpMax !== d.hpMax) {
      const lines = Math.max(1, d.lines || 10);
      const v = d.hpMax > 0 ? clamp01(d.hp / d.hpMax) : 0, lv = v * lines;
      const cur = Math.max(1, Math.ceil(lv - 1e-9)), part = v <= 0 ? 0 : lv - (cur - 1);
      const lineChanged = cur !== B.line;
      if (lineChanged) {
        B.line = cur; br.f.style.background = BOSS_COL[(cur - 1) % BOSS_COL.length];
        br.under.style.background = cur > 1 ? BOSS_COL[(cur - 2) % BOSS_COL.length] : 'none'; 
        br.mult.textContent = cur; br.multBox.style.display = lines > 1 ? '' : 'none';
      }
      setBar(br.f, br.l, part, fresh || lineChanged);
      br.t.textContent = num(Math.max(0, d.hp)) + ' / ' + num(d.hpMax) + '  (' + (v * 100).toFixed(1) + '%)';
      if (!fresh && d.hp < B.hp && bBar.animate) { const now = performance.now(); if (now - bHitAt > 450) { bHitAt = now; bBar.animate(BOSS_HIT_KF, 160); } }
      B.hp = d.hp; B.hpMax = d.hpMax;
    }
  }

  // ── 스킬(행동 단축 바) · 기본 공격 · 자동사냥 ──────────────────
  // 기술 단추는 화면 아래 가운데의 단축 바에 한 줄(BAR_ROW 개를 넘으면 두 줄)로 놓고, 기본 공격·AUTO 만 오른쪽 아래에 둔다.
  const skBox = q('.h-skills'); const autoBtn = q('.h-auto'); const barBox = q('.h-abtns'); const tipEl = q('.h-tip');
  const SLOT = 54, ATK = { x: 236, y: 96, size: 124 };
  const skills = new Map(); let atk = null, tipFor = null;
  function place(b, cx, cy, size) { const s = b.style; s.width = s.height = size + 'px'; s.left = (cx - size / 2) + 'px'; s.top = (cy - size / 2) + 'px'; }
  place(autoBtn, ATK.x - 132, ATK.y + 30, 84);
  // 풍선 도움말: 이름·단축키·분류 / 대기·소모(내력·투지)·얻는 투지 / 설명 / 잠김 안내
  function tipShow(s) {
    const d = s.d; tipFor = s; tipEl.textContent = '';
    const hd = h('div', 'tn'); hd.appendChild(h('b', 'h-serif', d.name || '')); if (d.key) hd.appendChild(h('kbd', null, d.key)); if (SKILL_KIND[d.kind]) hd.appendChild(h('em', null, SKILL_KIND[d.kind])); tipEl.appendChild(hd);
    const m = h('div', 'tm');
    m.appendChild(h('span', null, '대기 ' + (s.cdMax > 0 ? s.cdMax + '초' : '없음')));
    if (d.mp) m.appendChild(h('span', 'mp', '내력 ' + d.mp)); if (d.rage) m.appendChild(h('span', 'rg', '투지 ' + d.rage));
    if (!d.mp && !d.rage) m.appendChild(h('span', null, '소모 없음'));
    if (d.gain) m.appendChild(h('span', 'gn', '투지 +' + d.gain));
    tipEl.appendChild(m);
    if (d.desc) tipEl.appendChild(h('div', 'td', d.desc));
    if (d.locked) tipEl.appendChild(h('div', 'tl', d.lv ? 'Lv.' + d.lv + '에 익힙니다' : '아직 익히지 못했습니다'));
    tipEl.classList.add('on');
    const k = (el.getBoundingClientRect().width / 1920) || 1, r0 = el.getBoundingClientRect(), r = s.b.getBoundingClientRect();
    const w = tipEl.offsetWidth, hh = tipEl.offsetHeight, cx = ((r.left + r.right) / 2 - r0.left) / k, top = (r.top - r0.top) / k;
    tipEl.style.left = Math.max(8, Math.min(1912 - w, cx - w / 2)) + 'px'; tipEl.style.top = Math.max(8, top - hh - 12) + 'px';
  }
  function tipHide(s) { if (s && tipFor !== s) return; tipFor = null; tipEl.classList.remove('on'); }
  function makeSkill(d, size, isAtk) {
    const b = h('button', 'h-skill ' + (isAtk ? 'atk' : 'sl')); b.type = 'button'; b.dataset.skill = d.id;
    const pic = h('i', 'h-ico'), sh = h('i', 'sh'), cd = h('i', 'cd'), gc = h('i', 'gc'), sec = h('span', 'sec'), k = h('span', 'k'), nm = h('span', 'nm');
    b.append(pic, cd, gc, sh, sec, k);
    if (isAtk) { b.append(nm, h('span', 'lbl', '공격')); nm.textContent = d.name || ''; }
    else {
      if (d.mp || d.rage) b.appendChild(h('span', 'cost ' + (d.rage ? 'rg' : 'mp'), d.rage || d.mp));
      if (d.locked) { b.classList.add('lock'); b.appendChild(h('span', 'lk', d.lv ? 'Lv.' + d.lv : '잠김')); }
      b.appendChild(h('i', 'pr'));
    }
    setIcon(pic, d.icon != null ? d.icon : 0, skSheet(d), size, isAtk);
    k.textContent = d.key || ''; if (!d.key) k.style.display = 'none';
    const s = { id: d.id, d, b, cd, gc, sec, cdMax: d.cd || 0, cdLeft: 0, p: -1, g: 0, secTxt: '', cool: false, enabled: true, active: false, proc: false, locked: !!d.locked, isAtk };
    b.addEventListener('click', () => { if (!s.enabled || s.locked) return; if (isAtk) emit('attack'); else emit('skill', s.id); });
    if (!isAtk) { b.addEventListener('mouseenter', () => tipShow(s)); b.addEventListener('mouseleave', () => tipHide(s)); }
    (isAtk ? skBox : barBox).appendChild(b);
    return s;
  }
  function applySkill(s, d) {
    if (d.cd !== undefined) s.cdMax = d.cd || 0;
    if (d.cdLeft !== undefined) {
      const left = Math.max(0, d.cdLeft || 0), cool = left > 0.0001;
      if (cool !== s.cool) { s.cool = cool; s.b.classList.toggle('cool', cool); if (!cool && s.cdLeft > 0) restart(s.b, 'ready'); }
      s.cdLeft = left;
      if (cool) {
        const p = s.cdMax > 0 ? Math.round(clamp01(1 - left / s.cdMax) * 250) / 250 : 0;
        if (p !== s.p) { s.p = p; s.cd.style.setProperty('--p', p); }
        const txt = left >= 3 ? '' + Math.ceil(left) : left.toFixed(1);
        if (txt !== s.secTxt) { s.secTxt = txt; s.sec.textContent = txt; }
      }
    }
    if (d.enabled !== undefined) { const en = d.enabled !== false; if (en !== s.enabled) { s.enabled = en; s.b.classList.toggle('off', !en); } }
    if (d.active !== undefined) { const a = !!d.active; if (a !== s.active) { s.active = a; s.b.classList.toggle('act', a); } }
    if (d.proc !== undefined) { const v = !!d.proc; if (v !== s.proc) { s.proc = v; s.b.classList.toggle('proc', v); } }   // 발동 효과: 금빛 테가 빛난다
    if (d.gcd !== undefined || (s.g && s.cool)) {   // 공용 대기(0~1): 위에서 아래로 걷히는 어두운 막. 제 대기가 도는 동안에는 그쪽만 보인다
      const g = s.cool || s.locked ? 0 : Math.round(clamp01(d.gcd || 0) * 100) / 100;
      if (g !== s.g) { s.b.classList.toggle('gcd', g > 0); s.gc.style.transition = g > s.g ? 'none' : ''; s.g = g; s.gc.style.transform = 'scaleY(' + g + ')'; }
    }
  }
  function setSkills(list) {
    for (const s of skills.values()) s.b.remove(); skills.clear(); tipHide();
    if (atk) { atk.b.remove(); atk = null; }
    list = list || [];
    let basic = null; const rest = [];
    for (const d of list) { if (!basic && (d.basic || d.id === 'attack' || d.id === 'basic')) basic = d; else rest.push(d); }
    atk = makeSkill(basic || { id: 'attack', name: '기본 공격', icon: 0 }, ATK.size, true);
    place(atk.b, ATK.x, ATK.y, ATK.size);
    if (basic) { skills.set(basic.id, atk); applySkill(atk, basic); }
    barBox.style.setProperty('--cols', rest.length > BAR_ROW ? Math.ceil(rest.length / 2) : Math.max(1, rest.length));
    barBox.parentNode.classList.toggle('none', !rest.length);
    for (const d of rest) { const s = makeSkill(d, SLOT, false); skills.set(d.id, s); applySkill(s, d); }
  }
  function updateSkill(id, d) { const s = skills.get(id); if (s && d) applySkill(s, d); }
  setSkills([]);

  // ── 투지 막대(단축 바 위). setResource 가 한 번도 불리지 않으면(자동 모드) 보이지 않는다 ──
  const rgEl = q('.h-rage'), rgF = q('.fill', rgEl), rgT = q('.txt', rgEl); const R = { on: false, rage: -1, max: -1 };
  function setResource(d) {
    if (!d || d.rage === undefined) return;
    if (!R.on) { R.on = true; rgEl.classList.add('on'); }
    const max = d.rageMax > 0 ? d.rageMax : R.max > 0 ? R.max : 100, v = Math.max(0, Math.min(max, +d.rage || 0));
    if (v === R.rage && max === R.max) return;
    const up = v > R.rage; R.rage = v; R.max = max;
    rgF.style.transform = 'scaleX(' + (v / max).toFixed(4) + ')'; rgT.textContent = Math.round(v) + ' / ' + max;
    rgEl.classList.toggle('full', v >= max); rgEl.classList.toggle('zero', v <= 0);
    if (up) restart(rgEl, 'gain');
  }
  let autoOn = false; const autoPill = q('.h-autopill'); const autoSub = q('.s', autoBtn);
  function setAuto(on) { on = !!on; if (on === autoOn) return; autoOn = on; autoBtn.classList.toggle('on', on); autoPill.classList.toggle('on', on); autoSub.textContent = on ? '사냥 중' : '자동사냥'; }
  autoBtn.addEventListener('click', () => emit('toggleAuto'));

  // ── 물약 ─────────────────────────────────────────────────────
  const pot = {};
  for (const b of el.querySelectorAll('.h-slot[data-p]')) {
    const kind = b.dataset.p; pot[kind] = { b, n: q('.n', b), k: q('.k', b), v: -1 };
    setIcon(q('.h-ico', b), kind === 'hp' ? 9 : 10, 'item', SLOT, false);
    b.addEventListener('click', () => { emit('potion', kind); restart(b, 'use'); });
  }
  function setPotions(d) {
    if (!d) return;
    for (const k of ['hp', 'mp']) {
      if (d[k] !== undefined && d[k] !== pot[k].v) { pot[k].v = d[k]; pot[k].n.textContent = num(d[k]); pot[k].b.classList.toggle('empty', !(d[k] > 0)); }
      if (d.keys && d.keys[k]) pot[k].k.textContent = d.keys[k];
    }
  }

  // ── 의뢰 ─────────────────────────────────────────────────────
  const qEl = q('.h-quest'), qList = q('.list', qEl);
  function setQuest(list) {
    list = list || []; qEl.classList.toggle('on', list.length > 0);
    qList.textContent = '';
    for (const d of list) {
      const e = h('div', 'h-q interactive' + (d.active ? ' run' : '')); const t = h('div', 'qt h-serif');
      if (d.id) e.addEventListener('click', () => emit('quest', d.id));
      const allDone = d.lines && d.lines.length && d.lines.every((l) => l.done || (l.max != null && l.cur >= l.max));
      if (d.tag || allDone || d.active) t.appendChild(h('em', d.active && !allDone ? 'go' : null, allDone ? '완료' : d.active ? '자동 진행 중' : d.tag));
      t.appendChild(doc.createTextNode(d.title || '')); e.appendChild(t);
      for (const l of d.lines || []) {
        const done = l.done || (l.max != null && l.cur >= l.max);
        const r = h('div', 'ql' + (done ? ' done' : '')); r.appendChild(h('span', null, l.text || ''));
        if (l.max != null) r.appendChild(h('span', 'c', (l.cur || 0) + ' / ' + l.max)); else if (done) r.appendChild(h('span', 'c', '완료'));
        e.appendChild(r);
      }
      qList.appendChild(e);
    }
  }

  // ── 지역 · 미니맵 ─────────────────────────────────────────────
  const zName = q('.zname'), zSub = q('.zsub .sub'), zXY = q('.zsub .xy'), zb = q('.h-zoneb');
  let zbTimer = 0;
  function setZone(name, sub) { zName.textContent = name || ''; zSub.textContent = sub || ''; zSub.classList.toggle('danger', /위험|분쟁|보스|전투|레이드|PK/.test(sub || '')); }
  function zoneBanner(title, subtitle) {
    q('.t', zb).textContent = title || ''; q('.s', zb).textContent = subtitle || ''; q('.s', zb).style.display = subtitle ? '' : 'none';
    restart(zb, 'play'); clearTimeout(zbTimer); zbTimer = setTimeout(() => zb.classList.remove('play'), 3700);
  }
  const canvas = q('.h-mini canvas');
  let cx_ = null, cy_ = null;
  function setCoords(x, y) { x = Math.round(x); y = Math.round(y); if (x === cx_ && y === cy_) return; cx_ = x; cy_ = y; zXY.textContent = x + ', ' + y; }
  const minimap = { canvas, ctx2d: canvas.getContext('2d'), size: 220, setCoords };

  // ── 메뉴 ─────────────────────────────────────────────────────
  const menuBox = q('.h-menu'), sysBox = q('.h-sys'), menuBtns = {};
  for (const [name, label, path, small] of MENU) {
    const b = h('button', 'h-mbtn' + (small ? ' sm' : '')); b.type = 'button'; b.dataset.menu = name;
    b.innerHTML = '<span class="c"><svg viewBox="0 0 24 24">' + path + '</svg></span><span class="l">' + label + '</span><span class="bd"></span>';
    b.addEventListener('click', () => emit('menu', name)); (small ? sysBox : menuBox).appendChild(b);
    menuBtns[name] = { b, bd: b.lastChild, n: 0 }; b.lastChild.style.display = 'none';
  }
  // 메뉴 단추 위의 숫자 배지(예: 미분배 능력 포인트). 0 이하면 숨긴다. 숫자 대신 true 를 주면 점만 찍는다.
  function setMenuBadge(name, count) {
    const m = menuBtns[name]; if (!m) return;
    const n = count === true ? -1 : Math.max(0, Math.floor(+count || 0));
    if (n === m.n) return; m.n = n;
    m.bd.textContent = n < 0 ? '' : n > 99 ? '99+' : n; m.bd.classList.toggle('dot', n < 0); m.bd.style.display = n ? '' : 'none';
    if (n) restart(m.bd, 'pop');
  }

  // ── 채팅 ─────────────────────────────────────────────────────
  const cEl = q('.h-chat'), cBody = q('.body', cEl), cTabs = q('.tabs', cEl), cIn = q('input', cEl), cChn = q('.chn', cEl);
  const CHAT_MAX = 120; let chatN = 0, curTab = 'all';
  const tabBtns = {};
  for (const [id, label] of TABS) { const b = h('button', 'tab' + (id === 'all' ? ' on' : ''), label); b.type = 'button'; b.addEventListener('click', () => setTab(id)); cTabs.appendChild(b); tabBtns[id] = b; }
  function setTab(name) {
    const id = TAB_ALIAS[name] || 'all'; curTab = id; cEl.dataset.tab = id;
    for (const k in tabBtns) tabBtns[k].classList.toggle('on', k === id);
    cChn.textContent = id === 'all' || id === 'system' ? '일반' : CH_LABEL[id]; cChn.style.color = 'var(--ch-' + (id === 'all' || id === 'system' ? 'local' : id) + ')';
    cStick = true; cBody.scrollTop = cBody.scrollHeight;
  }
  let cStick = true;   // 사용자가 휠로 위로 올려 보면 자동 스크롤을 멈춘다
  cBody.addEventListener('wheel', () => requestAnimationFrame(() => { cStick = cBody.scrollHeight - cBody.scrollTop - cBody.clientHeight < 30; }), { passive: true });
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(() => { if (cStick) cBody.scrollTop = cBody.scrollHeight; });
  function chatAdd(m) {
    if (!m) return;
    const ch = CH_LABEL[m.channel] ? m.channel : 'local';
    let ln;
    if (chatN >= CHAT_MAX) { ln = cBody.firstChild; ln.textContent = ''; } else { ln = h('div'); chatN++; }
    ln.className = 'h-ln ch-' + ch;
    ln.appendChild(h('span', 'tg', '[' + CH_LABEL[ch] + ']'));
    if (ch !== 'system') {
      if (m.guild) ln.appendChild(h('span', 'g', '[' + m.guild + ']'));
      if (m.name) ln.appendChild(h('span', 'nm', m.name + ':'));
    }
    ln.appendChild(doc.createTextNode(m.text == null ? '' : String(m.text)));
    cBody.appendChild(ln);
    if (cStick) cBody.scrollTop = cBody.scrollHeight;
  }
  cIn.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') { const v = cIn.value.trim(); cIn.value = ''; if (v) emit('chat', v); cIn.blur(); }
    else if (e.key === 'Escape') { cIn.value = ''; cIn.blur(); }
  });
  cIn.addEventListener('keyup', (e) => e.stopPropagation());
  const chat = { add: chatAdd, setTab, getTab: () => curTab, focus: () => cIn.focus(), clear: () => { cBody.textContent = ''; chatN = 0; } };

  // ── 공지 띠 ───────────────────────────────────────────────────
  const nEl = q('.h-notice'), nMsg = q('.msg', nEl), nTag = q('.tag', nEl), nTx = q('.tx', nEl), nClip = q('.clip', nEl);
  const nQueue = []; let nBusy = false, nAnim = null;
  function nextNotice() {
    if (nBusy) return;
    if (!nQueue.length) { nEl.classList.remove('on'); return; }
    nBusy = true; const it = nQueue.shift();
    nEl.className = 'h-notice on n-' + it.kind; nTag.textContent = NOTICE_TAG[it.kind] || NOTICE_TAG.info; nTx.textContent = it.text;
    if (nAnim) { nAnim.cancel(); nAnim = null; }
    void nEl.offsetWidth;
    let hold = 3400; const over = nMsg.scrollWidth - nClip.clientWidth;
    if (over > 0) {   // 길면 흘려 보낸다
      hold = 2200 + over * 9;
      if (nMsg.animate) nAnim = nMsg.animate([{ marginLeft: '0px' }, { marginLeft: -over + 'px' }], { duration: hold - 1600, delay: 900, fill: 'both', easing: 'linear' });
    }
    nEl.classList.add('show');
    setTimeout(() => nEl.classList.remove('show'), hold);
    setTimeout(() => { nBusy = false; nextNotice(); }, hold + 380);
  }
  function notice(text, kind) { nQueue.push({ text: String(text), kind: NOTICE_TAG[kind] ? kind : 'info' }); if (nQueue.length > 12) nQueue.splice(0, nQueue.length - 12); nextNotice(); }

  // ── 알림 · 획득 · 레벨 업 ─────────────────────────────────────
  const toastBox = q('.h-toasts'), lootBox = q('.h-loot');
  function toast(text, kind) {
    const t = h('div', 'h-toast' + (kind ? ' t-' + kind : ''), text);
    t.addEventListener('animationend', () => t.remove());
    toastBox.insertBefore(t, toastBox.firstChild);
    while (toastBox.children.length > 4) toastBox.lastChild.remove();
  }
  function loot(d) {
    if (!d) return;
    const rar = d.rarity || 'common';
    const e = h('div', 'h-lt r-' + rar); const pic = h('i', 'h-ico'); setIcon(pic, d.icon != null ? d.icon : 14, 'item', 32, false);
    e.append(pic, h('span', 'nm', d.name || ''));
    e.appendChild(h('span', 'ct', d.count != null && d.count !== 1 ? 'x' + num(d.count) : '획득'));
    e.addEventListener('animationend', () => e.remove());
    lootBox.appendChild(e);
    while (lootBox.children.length > 6) lootBox.firstChild.remove();
  }
  const lvEl = q('.h-lvup'), lvNum = q('.sub b', lvEl); let lvTimer = 0;
  function levelUp(level) {
    lvNum.textContent = level != null ? level : P.level;
    restart(lvEl, 'play'); clearTimeout(lvTimer); lvTimer = setTimeout(() => lvEl.classList.remove('play'), 2550);
  }

  // ── 피해 숫자(풀) ─────────────────────────────────────────────
  const dmgBox = q('.h-dmgs'); const DMG_N = 96; const dmgPool = []; let dmgI = 0;
  for (let i = 0; i < DMG_N; i++) { const w = h('div', 'h-dmg'); const b = h('b'); w.appendChild(b); dmgBox.appendChild(w); dmgPool.push({ w, b, anim: null, cls: '', txt: '' }); }
  function damage(x, y, value, opt) {
    const kind = (opt && opt.kind) || 'deal', big = !!(opt && opt.big);
    const o = dmgPool[dmgI]; dmgI = (dmgI + 1) % DMG_N;
    let txt, kf = 'deal';
    if (kind === 'miss') { txt = typeof value === 'string' ? value : '빗나감'; kf = 'rise'; }
    else if (kind === 'heal') { txt = '+' + num(value); kf = 'rise'; }
    else if (kind === 'exp') { txt = '경험치 +' + num(value); kf = 'rise'; }
    else if (kind === 'gold') { txt = '+' + num(value) + ' 금화'; kf = 'rise'; }
    else if (kind === 'take') { txt = '-' + num(value); kf = 'take'; }
    else if (kind === 'crit') { txt = num(value) + '!'; kf = 'crit'; }
    else txt = typeof value === 'number' ? num(value) : String(value);
    const cls = 'h-dmg k-' + kind + (big ? ' big' : '');
    if (cls !== o.cls) { o.cls = cls; o.w.className = cls; }
    if (txt !== o.txt) { o.txt = txt; o.b.textContent = txt; }
    const jx = kf === 'rise' ? 0 : (Math.random() - 0.5) * 44, jy = kf === 'rise' ? 0 : (Math.random() - 0.5) * 22;
    o.w.style.transform = 'translate3d(' + Math.round(x + jx) + 'px,' + Math.round(y + jy) + 'px,0)';
    if (o.anim) o.anim.cancel();
    o.anim = o.b.animate ? o.b.animate(DMG_KF[kf], DMG_OPT[kf]) : null;
  }

  // ── 이름표 ───────────────────────────────────────────────────
  const plBox = q('.h-plates'); const plMap = new Map(); let plStamp = 0;
  function makePlate(id) {
    const e = h('div', 'h-plate'); const inn = h('div', 'in');
    const bub = h('div', 'bub'), tt = h('div', 'tt'), nl = h('div', 'nl'), lv = h('span', 'lv'), cr = h('i', 'h-crest'), g = h('span', 'g'), n = h('span', 'n'), hpb = h('div', 'hpb'), hpi = h('i');
    tt.style.display = 'none'; lv.style.display = 'none'; cr.style.display = 'none'; g.style.display = 'none'; hpb.style.display = 'none';
    hpb.appendChild(hpi); nl.append(lv, cr, g, n); inn.append(bub, tt, nl, hpb); e.appendChild(inn); plBox.appendChild(e);
    const p = { id, e, bub, tt, lv, cr, g, n, hpb, hpi, stamp: 0, shown: false, x: NaN, y: NaN, kind: null, name: null, guild: undefined, crest: undefined, level: undefined, title: undefined, hp: undefined, dim: false, bubT: 0 };
    plMap.set(id, p); return p;
  }
  function plSweep(p, id) {
    if (p.stamp === plStamp) return;
    if (p.shown) { p.shown = false; p.e.style.display = 'none'; }
    else if (plStamp - p.stamp > 900 && !p.bubT) { p.e.remove(); plMap.delete(id); }
  }
  function platesSync(list) {
    plStamp++;
    for (let i = 0, n = list ? list.length : 0; i < n; i++) {
      const d = list[i]; let p = plMap.get(d.id); if (!p) p = makePlate(d.id);
      p.stamp = plStamp;
      const kind = d.kind || 'monster', dim = !!d.dim;
      if (kind !== p.kind || dim !== p.dim) { p.kind = kind; p.dim = dim; p.e.className = 'h-plate k-' + kind + (dim ? ' dim' : ''); }
      if (d.name !== p.name) { p.name = d.name; p.n.textContent = d.name || ''; }
      if (d.guild !== p.guild) { p.guild = d.guild; p.g.textContent = d.guild ? '[' + d.guild + ']' : ''; p.g.style.display = d.guild ? '' : 'none'; }
      if (d.crest !== p.crest) { p.crest = d.crest; setCrest(p.cr, d.crest, 15); }
      if (d.level !== p.level) { p.level = d.level; p.lv.textContent = d.level != null ? 'Lv.' + d.level : ''; p.lv.style.display = d.level != null ? '' : 'none'; }
      if (d.title !== p.title) { p.title = d.title; p.tt.textContent = d.title ? (kind === 'boss' ? d.title : '<' + d.title + '>') : ''; p.tt.style.display = d.title ? '' : 'none'; }
      const hp = d.hp == null ? null : Math.round(clamp01(d.hp) * 200) / 200;
      if (hp !== p.hp) { if ((hp == null) !== (p.hp == null)) p.hpb.style.display = hp == null ? 'none' : ''; p.hp = hp; if (hp != null) p.hpi.style.transform = 'scaleX(' + hp + ')'; }
      const x = Math.round(d.x * 2) / 2, y = Math.round(d.y * 2) / 2;
      if (x !== p.x || y !== p.y) { p.x = x; p.y = y; p.e.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)'; }
      if (!p.shown) { p.shown = true; p.e.style.display = 'block'; }
    }
    plMap.forEach(plSweep);
  }
  function bubble(id, text, ms) {
    const p = plMap.get(id) || makePlate(id);
    clearTimeout(p.bubT);
    if (!text) { p.bubT = 0; p.bub.classList.remove('on'); return; }
    p.bub.textContent = text; restart(p.bub, 'on');
    p.bubT = setTimeout(() => { p.bubT = 0; p.bub.classList.remove('on'); }, ms || 3500);
  }

  // ── 연출 ─────────────────────────────────────────────────────
  const fadeEl = q('.h-fade'), capEl = q('.h-caption');
  let demoCine = false, cineOn = false, cineSkip = true, cineCap = '', cineT = 0;
  const syncCine = () => { el.classList.toggle('h-cinema', demoCine || cineOn); el.classList.toggle('h-cineon', cineOn); el.classList.toggle('h-cineskip', cineOn && cineSkip); };
  function cinema(on) { demoCine = !!on; syncCine(); }
  // 이야기 컷신: 위아래 검은 띠 + 아래 띠 위의 자막 + "Space · 클릭: 넘기기". 클릭·Space·Esc → emit('cineSkip'). 컷신 동안 다른 HUD 는 숨는다
  const ccEl = q('.h-cinecap'), ccTx = q('.tx', ccEl), ccHit = q('.h-cinehit');
  const cine = {
    show(o) {
      o = o || {}; const text = o.caption == null ? '' : String(o.caption), was = cineOn;
      cineOn = true; cineSkip = o.skippable !== false; tipHide(); syncCine();
      clearTimeout(cineT);
      const put = () => { cineCap = text; ccTx.textContent = text; ccEl.classList.toggle('long', text.length > 44); if (text) restart(ccEl, 'on'); else ccEl.classList.remove('on'); };
      if (was && cineCap && text !== cineCap) { ccEl.classList.remove('on'); cineT = setTimeout(put, 240); }   // 앞 자막이 사라진 뒤 새 자막이 떠오른다
      else if (!was || text !== cineCap) put();
      if (o.fx) restart(ccEl, 'fx'); else ccEl.classList.remove('fx');
    },
    hide() { if (!cineOn) return; cineOn = false; clearTimeout(cineT); cineCap = ''; ccEl.classList.remove('on', 'fx'); syncCine(); },
    isOn: () => cineOn,
  };
  ccHit.addEventListener('pointerdown', (e) => { if (cineOn && cineSkip && e.button === 0) emit('cineSkip'); });
  (doc.defaultView || doc).addEventListener('keydown', (e) => {
    if (!cineOn || !cineSkip || e.repeat || e.ctrlKey || e.metaKey || e.altKey || (e.target && e.target.tagName === 'INPUT')) return;
    if (e.code === 'Space' || e.code === 'Escape') { e.preventDefault(); emit('cineSkip'); }
  });
  function fade(to, ms, color) {
    ms = ms || 0; fadeEl.style.background = color || '#000';
    fadeEl.style.transition = ms > 0 ? 'opacity ' + ms + 'ms linear' : 'none'; void fadeEl.offsetWidth;
    fadeEl.style.opacity = clamp01(to == null ? 0 : to);
    return new Promise((res) => setTimeout(res, ms));
  }
  function showDemoCaption(text) { if (!text) { capEl.classList.remove('on'); return; } capEl.textContent = text; restart(capEl, 'on'); }
  function setVisible(on) { el.classList.toggle('h-hidden', on === false); }

  setPlayer({}); setZone('', ''); setPotions({ hp: 0, mp: 0 });

  return { el, setPlayer, setBuffs, setTarget, setCast, setBoss, setSkills, updateSkill, setResource, cine, setAuto, setPotions, setQuest, setZone, zoneBanner, minimap, setCoords, chat,
    notice, toast, loot, levelUp, damage, plates: { sync: platesSync }, bubble, cinema, fade, showDemoCaption, setVisible, setMenuBadge };
}
