// 이야기 엔진: 대본(saga.js)을 재생한다 — 컷신 · 대사(대화창/채팅/공지) · 선택지 · 목표 13종 · 보상 · [이야기] 의뢰 자동 진행.
// createSaga(ctx) 는 게임 본체와 ctx(주입받는 함수·객체)와 saga.event(type, payload)로만 이야기한다. three·DOM 을 쓰지 않으므로
// Node 에서 그대로 시험할 수 있다(_work/v3/st/saga_unit.mjs). 맨 아래 installSaga(g) 가 game.js 의 내부를 ctx 로 바꿔 주는 연결부다.
// 녹화용 자동 모드(G.demo)와 체험 모드(G.story 아님)에서는 이야기가 움직이지 않는다(인물에게 말을 걸었을 때의 한마디만 나온다).
//
// 사건(saga.event): 'kill' { tag, name, named, raider, elite, boss } · 'skill' { id, combat } · 'spec' { key } · 'buy' { id, count }
//                  'equip' { armor } · 'enh' { plus } · 'level' { level } · 'bossDead' {} · 'talk' { npc } · 'raidResultClose' {}
// 저장(story): { v: 3, id(장 id | 'end'), n(목표 진행), seen(서장), picks: { 장 id: 보기 번호 }, epi(종장), started(장 시작 대사를 봤는가) }
import * as DATA from './saga.js';

const BEAT = 0.75;      // 채팅·공지 한 줄 뒤에 숨을 고르는 시간(실제 초)
const CHECK = 0.4;      // 진행 확인 간격(실제 초)
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const smooth = (u) => u * u * (3 - 2 * u);
const mix = (a, u) => a[0] + (a[1] - a[0]) * u;

// 컷신 구도: 처음 → 끝 [r 거리, h 높이, a 방위 치우침, y 바라보는 높이], fov 시야각
export const SHOT = {
  wide: { r: [37, 32], h: [18, 15.5], a: [-0.07, 0.07], y: [2.2, 2.2], fov: 36 },
  rise: { r: [19, 25], h: [3.2, 16], a: [0, 0.12], y: [1.8, 4.6], fov: 34 },
  orbit: { r: [23, 23], h: [9.5, 9.5], a: [-0.45, 0.45], y: [2.4, 2.4], fov: 34 },
  close: { r: [10.5, 8.2], h: [4.8, 3.7], a: [0.06, -0.06], y: [1.5, 1.5], fov: 30 },
};
// 장소마다: az 카메라가 서는 쪽(라디안. 0 = 남쪽, π = 북쪽), k 거리 배율, y 바라보는 높이 더하기. 구도 이름(close 등)을 키로 그 구도만 따로 바꿀 수 있다(at = 비출 곳)
export const LOC = {
  gate: { az: 2.62, k: 1.1, y: 1.5 }, altar: { az: 0.42, k: 1.55, y: 3.5 }, smith: { az: -1.0, k: 0.85 }, shop: { az: 0.5, k: 0.8 },
  plaza: { az: 0.78, close: { at: 'orben', az: 2.2 } },   // 광장의 근접 장면은 기록관을 비춘다(깃발을 피해서)
  grave: { az: 0.95, k: 1.05 }, orcCamp: { az: -0.7 }, forest: { az: 0.6 }, player: { az: 0.78, k: 0.72 },
};
// 대본에는 큰 지명만 있으므로 장마다 쓰는 자리를 여기서 정한다
export const SPOT = {
  startAt: { a1c1: { npc: 'rina' }, a1c3: { npc: 'brom' }, a3c5: { place: 'raidSpot', r: 30 } },   // 장 시작 대사를 그 자리에 가서 듣는 장
  named: { a1c4: [-3, 5], a2c6: [-4, -34], a3c4: [26, -24] },                                       // 이름 있는 정예: obj.at 기준 [dx, dz]
  raiders: { a2c2: { x: 0, z: -78 }, a3c2: { x: -66, z: -118, r: 34 } },                           // 습격자를 만나는 곳(r 이 있으면 그 안에서만 나타난다)
  cine: { 'a2c3.start': [{ at: 'gateHost', az: 2.9, k: 1.0, y: 1 }, { at: 'gateHost', az: 0.32, k: 0.8, y: 0.2 }] },   // 컷신 장면의 구도 바꿈(북문 앞 대열: 등 뒤에서 성문 쪽으로 → 할렌의 앞모습)
};
export const DEFEND = { size: [3, 4, 4], gap: 5, radius: 18, group: 2 };   // 방어전 파마다 인원 · 파 사이 쉬는 시간(초) · 성문에서 이만큼 안에 있어야 한다 · 습격자 목표의 한 무리 인원
// 전문화 선택 창이 아직 없을 때 쓰는 임시 보기(ctx.openSpec 이 있으면 쓰지 않는다)
export const SPECS = [{ key: 'ward', name: '수호', hint: '그래도 문 앞에 선다 — 방패로 버틴다' }, { key: 'fury', name: '격노', hint: '속인 손부터 벤다 — 몰아친다' }, { key: 'oath', name: '서약', hint: '맹세를 고쳐 쓴다 — 빛으로 돌본다' }];
const POTION = ['pot_hp', 'potion_hp'], POTION_PRICE = 25;

export function createSaga(ctx) {
  const D = ctx.data || DATA, G = ctx.G, P = ctx.P, hud = ctx.hud, win = ctx.win;
  const CH = D.CHAPTERS, IDX = {}; CH.forEach((c, i) => { IDX[c.id] = i; });
  const WHO = D.WHO, PACING = D.PACING || {}, GATE = D.RAID_GATE || 'a3c5';
  const rng = ctx.rng || Math.random, sfx = ctx.sfx || (() => { });
  const F = (k) => (typeof ctx[k] === 'function' ? ctx[k] : () => undefined);   // 없는 연결은 조용히 건너뛴다
  const opt = { instant: !!ctx.instant, beat: BEAT };
  const fresh = () => ({ v: 3, id: CH[0].id, n: 0, seen: false, picks: {}, epi: false, started: false });
  const ST = fresh();
  const R = { auto: false, t: 0, acc: 0, o: null, hold: 0, focus: null, note: null, real: 0, fin: false };   // 저장하지 않는 실행 상태
  const LOG = []; const log = (k, v) => { LOG.push([k, v]); if (LOG.length > 800) LOG.splice(0, 300); };
  const on = () => !!G.story && !G.demo;
  const cur = () => (ST.id === 'end' ? null : CH[IDX[ST.id]]);
  const idx = () => (ST.id === 'end' ? CH.length : IDX[ST.id]);
  const fill = (s) => String(s == null ? '' : s).replace(/@/g, P.name);
  const toast = (t, k) => hud.toast(t, k || 'info');
  const sysChat = (text) => hud.chat.add({ channel: 'system', text });
  const place = (k) => F('place')(k) || { x: 0, z: 0 };
  const sync = () => { F('sync')({ id: ST.id, idx: idx(), n: ST.n, seen: ST.seen, epi: ST.epi, started: ST.started }); F('questRefresh')(); };

  // ═════════════ 순서 재생기: 컷신 → 대사 → 선택지 … 를 차례로 ═════════════
  // 단계: { k: 'cine', list } · { k: 'lines', list } · { k: 'choice', id, choice } · { k: 'ask', … } · { k: 'call', fn }
  let seq = null;
  const viaOf = (l) => (WHO[l[0]] || {}).via || 'dialog';
  function play(steps, onEnd) {
    steps = (steps || []).filter(s => s && (s.k === 'call' || s.k === 'ask' || s.k === 'choice' || (s.list && s.list.length)));
    if (!steps.length) { onEnd && onEnd(); return; }
    seq = { steps, i: 0, cur: null, wait: null, beat: 0, onEnd, cine: false };
    G.talk = true; F('halt')(); F('calm')();   // 조작을 막고(대화 중에는 피해도 받지 않는다) 몬스터의 시선을 푼다
    run();
  }
  function stop() { const s = seq; seq = null; G.talk = false; win.dialog.hide(); if (s && s.cine) cineOff(); return s; }
  function run() {
    for (let guard = 0; seq && guard < 2000; guard++) {
      const s = seq; if (s.wait || s.beat > 0) return;
      if (!s.cur) { if (s.i >= s.steps.length) { stop(); s.onEnd && s.onEnd(); return; } s.cur = { ...s.steps[s.i++], li: 0 }; }
      const c = s.cur;
      if (c.k === 'call') { s.cur = null; c.fn(); }
      else if (c.k === 'lines') {
        if (c.li >= c.list.length) { s.cur = null; continue; }
        const l = c.list[c.li++], via = viaOf(l);
        if (via !== 'dialog') { emitLine(l, via); if (!c.skip && !opt.instant && opt.beat > 0) s.beat = opt.beat; }   // 채팅·공지는 건너뛰어도 기록으로 남긴다
        else if (!c.skip) { showLine(l, !c.list.slice(c.li).some(x => viaOf(x) === 'dialog')); s.wait = 'line'; }
      } else if (c.k === 'choice') {
        const ch = c.choice, had = ST.picks[c.id];
        if (had !== undefined && ch.options[had]) { s.cur = { k: 'lines', list: ch.options[had].reply || [], li: 0 }; continue; }   // 이미 골랐다(다시 불러온 뒤): 반응만 다시 보여 준다
        showAsk(ch.prompt[0], ch.prompt[1], ch.options.map((o, i) => ({ id: 'c' + i, label: o.label }))); s.wait = 'choice';
      } else if (c.k === 'ask') { showAsk(c.who, c.text, c.options, c.escId, c.card); s.wait = 'ask'; }
      else if (c.k === 'cine') {
        if (c.li >= c.list.length) { s.cur = null; cineOff(); s.cine = false; continue; }
        shot(c, c.list[c.li++]); s.cine = true; if (!opt.instant) s.wait = 'cine';
      } else s.cur = null;
    }
  }
  function showLine(l, last) {
    const w = WHO[l[0]] || WHO.nar, me = w.name === '@';
    sfx('page', { volume: 0.7 }); log('say', [l[0], l[1]]);
    win.dialog.show({ name: me ? P.name : w.name, role: me && P.title ? P.title : w.role, portrait: w.portrait, text: fill(l[1]),
      options: last ? [{ label: '확인', id: 'next' }] : [{ label: '다음', id: 'next' }, { label: '건너뛰기', id: 'skip' }], escId: 'skip' });
  }
  function showAsk(who, text, options, escId, card) {
    const w = card || WHO[who] || WHO.nar, me = w.name === '@';
    sfx('page', { volume: 0.7 }); log('ask', [who, text, options.map(o => o.label)]);
    win.dialog.show({ name: me ? P.name : w.name, role: w.role, portrait: w.portrait, text: fill(text), options, ...(escId ? { escId } : {}) });
  }
  // 대화창이 아닌 줄: 공지 배너 / 채팅창. tobin → "[문파] 토빈: 대사", gchat → "[문파] 말한 이: 대사", wchat → "[전체] [문파] 말한 이: 대사"
  function emitLine(l, via) {
    const w = WHO[l[0]], text = fill(l[1]);
    if (via === 'notice') { hud.notice(text, text[0] === '[' ? 'war' : 'info'); log('notice', text); return; }
    let m = { channel: w.channel || 'guild', text }, x;
    if (l[0] === 'tobin') m = { channel: w.channel, name: w.name, guild: w.guild, text };
    else if ((x = /^\[([^\]]+)\]\s*([^:\s][^:]{0,11}):\s*(.+)$/.exec(text))) m = { channel: w.channel, guild: x[1], name: x[2], text: x[3] };
    else if ((x = /^([^:\s\[][^:\s]{0,9}):\s*(.+)$/.exec(text))) m = { channel: w.channel, guild: w.guild || null, name: x[1], text: x[2] };
    hud.chat.add(m); log('chat', [m.channel, (m.guild ? '[' + m.guild + '] ' : '') + (m.name ? m.name + ': ' : '') + m.text]);
  }
  function onDialog(id) {
    const s = seq; if (!s || !s.cur) return; const c = s.cur;
    if (s.wait === 'line') { if (id === 'skip') c.skip = true; else if (id !== 'next') return; s.wait = null; run(); }
    else if (s.wait === 'choice') {
      const m = /^c(\d+)$/.exec(String(id)), i = m ? +m[1] : -1, op = c.choice.options[i]; if (!op) return;
      ST.picks[c.id] = i; log('pick', [c.id, i]); effect(op.effect);
      s.wait = null; s.cur = { k: 'lines', list: op.reply || [], li: 0 }; run();
    } else if (s.wait === 'ask') { if (!c.options.some(o => o.id === id) && id !== c.escId) return; c.set && c.set(id); s.wait = null; s.cur = null; run(); }
  }
  function effect(e) {
    if (!e) return; const t = [];
    if (e.fame) { F('addFame')(e.fame); t.push('명성 +' + e.fame); }
    if (e.gold) { F('addGold')(e.gold); t.push('금화 +' + e.gold); }
    if (t.length) { toast(t.join(' · ')); sysChat('선택의 결과: ' + t.join(' · ')); }
  }
  // ── 컷신: 카메라를 잠시 빌려 정해진 곳을 비추고 자막을 띄운다(실제 시간으로 흐른다) ──
  function shot(c, sh) {
    const base = LOC[sh.at] || {}, ov = { ...(base[sh.shot] || {}), ...((SPOT.cine[c.tag] || [])[c.li - 1] || {}) }; c.loc = { ...base, ...ov };
    if (!seq.cine) F('cineBegin')();   // 컷신을 시작한다: 열려 있는 창을 닫는다
    c.sh = sh; c.t = 0; c.sec = Math.max(0.6, +sh.sec || 4); c.t0 = R.real; c.at = place(ov.at || sh.at); R.focus = sh.at === 'player' ? null : c.at;
    const o = { caption: fill(sh.caption || ''), fx: sh.fx || null, skippable: true };
    log('cine', [sh.at, sh.shot, o.caption, o.fx]);
    (ctx.cineShow || ((x) => hud.cine.show(x)))(o);
    if (sh.fx) F('fx')(sh.fx);
    frame(c);
  }
  function frame(c) {
    if (!ctx.cam) return; const S = SHOT[c.sh.shot] || SHOT.wide, L = c.loc || {}, k = L.k || 1, u = smooth(Math.min(1, c.t / c.sec));
    const a = (L.az === undefined ? 0.78 : L.az) + mix(S.a, c.sh.shot === 'orbit' ? Math.min(1, c.t / c.sec) : u), r = mix(S.r, u) * k, y = mix(S.y, u) + (L.y || 0);
    ctx.cam.frame({ x: c.at.x + Math.sin(a) * r, y: mix(S.h, u) * k, z: c.at.z + Math.cos(a) * r }, { x: c.at.x, y, z: c.at.z }, S.fov);
  }
  function cineOff() { log('cineEnd', 1); (ctx.cineHide || (() => hud.cine.hide()))(); if (ctx.cam) ctx.cam.release(opt.instant); R.focus = null; }
  /** 컷신의 지금 장면을 넘긴다(클릭·Esc·Space → ui 'cineSkip'). 연타는 0.3초에 한 번만 받는다 */
  function cineSkip() { const s = seq; if (!s || s.wait !== 'cine' || R.real - s.cur.t0 < 0.3) return false; s.wait = null; run(); return true; }
  function tickSeq(rawDt) {
    const s = seq;
    if (s.beat > 0) { s.beat -= rawDt; if (s.beat <= 0) run(); return; }
    if (s.wait === 'cine') { const c = s.cur; c.t += rawDt; frame(c); if (c.t >= c.sec) { s.wait = null; run(); } return; }
    if ((s.wait === 'line' || s.wait === 'choice' || s.wait === 'ask') && win.dialog.isOpen && win.dialog.isOpen() === false) {   // 다른 곳에서 대화창을 닫아 버렸다: 같은 줄을 다시 띄운다
      if (s.wait === 'line') s.cur.li--; s.wait = null; run(); }
  }
  if (ctx.on) { ctx.on('dialog', onDialog); ctx.on('cineSkip', () => cineSkip()); ctx.on('raidResultClose', () => event('raidResultClose')); }
  const cineStep = (list, tag) => (list && list.length ? { k: 'cine', list, tag } : null);
  const lineStep = (list) => (list && list.length ? { k: 'lines', list } : null);

  // ═════════════ 목표 ═════════════
  /** 지금 장의 진행도 [현재, 목표] */
  function prog(c) {
    const o = c.obj, max = o.type === 'defend' ? (o.waves || o.max || 1) : (o.max || 1);
    const n = o.type === 'enh' ? P.plus : o.type === 'level' ? P.level : o.type === 'equip' ? (F('armorCount')() | 0) : o.type === 'spec' ? (P.spec ? 1 : ST.n) : ST.n;
    return [Math.max(0, Math.min(max, n | 0)), max];
  }
  const startAt = (c) => SPOT.startAt[c.id] || null;
  function atStart(c) {   // 장 시작 대사를 들을 자리에 와 있는가
    const s = startAt(c); if (!s) return true;
    if (c.obj.type === 'raid' && F('raidActive')()) return true;
    return s.npc ? dist(P.pos, F('npcStand')(s.npc) || P.pos) < 4.2 : dist(P.pos, place(s.place)) < (s.r || 8);
  }
  // 습격자 목표: 시작 대사 가운데 습격자가 처음 입을 여는 줄부터는 '마주쳤을 때' 한다
  function splitStart(c) {
    const st = c.start || []; if (c.obj.type !== 'raiders') return [st, []];
    const i = st.findIndex(l => l[0] === 'raider'); return i < 0 ? [st, []] : [st.slice(0, i), st.slice(i)];
  }
  const namedPos = (c) => { const p = place(c.obj.at), d = SPOT.named[c.id] || [0, 0]; return { x: p.x + d[0], z: p.z + d[1] }; };
  const raidSpot = (c) => SPOT.raiders[c.id] || { x: place('forest').x, z: place('gate').z - 22 };
  function objSetup() {   // 장을 시작했거나 저장본을 불러왔을 때: 목표의 실행 상태를 새로 만든다
    const c = cur(); R.o = null; R.fin = false; if (!c) return; const o = c.obj, r = R.o = { type: o.type, id: c.id, cool: 0 };
    if (o.type === 'shop') { const need = (o.max - ST.n) * POTION_PRICE - (P.gold | 0);   // 금화가 모자란 캐릭터(예전 저장본)는 문파가 보태 준다
      if (need > 0 && ST.n < o.max) { F('addGold')(need); sysChat(`은사자 문파가 입단 지원금 ${need} 금화를 내주었습니다.`); } }
    if (o.type === 'raiders') { r.meet = splitStart(c)[1]; r.cool = 1.2; }
    if (o.type === 'defend') { r.wave = 0; r.left = 0; r.list = []; r.cool = 1.5; F('stage')('gateHost'); }   // 북문 앞에 붉은까마귀가 늘어선다(맨 앞이 할렌)
  }
  function objClear() { const r = R.o; R.o = null; if (r && r.ent && !r.ent.dead && !r.ent.gone) F('despawn')(r.ent); F('stage')(null); }
  function objTick(c, dt) {
    const o = c.obj, r = R.o; if (!r) return;
    if (o.type === 'raid') { if (ST.n < 1 && F('raidDone')() && (r.cool += dt) > 8) event('bossDead'); }   // 처치 사건을 놓쳤을 때의 안전망
    else if (o.type === 'enh') { if (R.farm && (P.scrolls | 0) > 0 && F('running')()) { R.farm = false; F('stopRun')(); F('autoOff')(); questClick(); } }   // 주문서를 주웠다: 사냥을 멈추고 대장간으로
    else if (o.type === 'named') {
      if (ST.n >= 1) return;
      let m = r.ent; if (m && m.gone && m.hp > 0) m = r.ent = null;                          // 밖에서 치워졌다: 다시 세운다
      if (!m) { m = r.ent = F('findNamed')(o.name) || F('spawnNamed')({ ...o, ...namedPos(c) }) || null; r.seen = false; if (!m) return; }
      const d = dist(P.pos, m.pos);
      if (m.dead) { if (d < 46 || m.hp <= 0) { ST.n = 1; sync(); } else r.ent = null; return; }   // 사건을 놓쳤어도(다른 모험가의 막타) 곁에 있었으면 인정한다
      if ((P.dead || d > 44) && (m.hp < m.hpMax || m.target)) { m.hp = m.hpMax; m.target = null; F('sendHome')(m); }   // 주인공이 쓰러지거나 멀어지면 체력을 되찾고 제자리에서 기다린다
      if (!r.seen && d < 30 && !P.dead) { r.seen = true; hud.notice(`「${o.name}」 — 이름 있는 정예가 앞을 막아섭니다!`, 'info'); if (o.desc) sysChat(`「${o.name}」 ${o.desc}`); sfx('boss_roar', { volume: 0.5, pos: m.pos }); }
      if (G.auto && F('running')() && d < 34 && !P.dead && P.target !== m && !(P.target && P.target.raider && !P.target.dead)) F('setTarget')(m);   // 자동 진행: 정예부터 노린다
    } else if (o.type === 'raiders') {
      if (ST.n >= o.max) return; const sp = SPOT.raiders[c.id];
      if (P.dead || !F('inField')() || F('raidActive')() || F('raidersBusy')()) { r.cool = Math.max(r.cool, 1.2); return; }
      if (sp && sp.r && dist(P.pos, sp) > sp.r) return;
      if ((r.cool -= dt) > 0) return;
      const list = F('spawnRaiders')(Math.min(o.max - ST.n, DEFEND.group), { story: true }); if (!list) { r.cool = 1; return; }
      r.cool = 4;
      if (r.meet && r.meet.length) { const lines = r.meet; r.meet = null; play([lineStep(lines)]); }   // 마주쳤을 때의 대사(한 번)
    } else if (o.type === 'defend') {
      const waves = o.waves || o.max || 1; if (ST.n >= waves) return;
      if (r.wave) {
        if (r.left <= 0) return waveDone(c);
        F('holdLine')(r.list, place('gateStand'), 13, dt);   // 자동사냥이 문을 비우고 마중 나가지 않게, 다가온 적만 상대한다
        if (!r.list.some(e => !e.gone && !e.dead)) { r.wave = 0; r.cool = 3; if (!P.dead) toast('공세에 밀렸습니다. 성문 앞에서 이번 파를 다시 막아야 합니다.', 'war'); }   // 물러갔다(주인공이 쓰러졌거나 문을 비웠다): 그 파를 다시
        return;
      }
      const g = place('gateStand');
      if (P.dead || !F('inField')() || dist(P.pos, g) > DEFEND.radius || F('raidActive')() || F('raidersBusy')()) return;
      if ((r.cool -= dt) > 0) return;
      const list = F('spawnRaiders')(DEFEND.size[Math.min(ST.n, DEFEND.size.length - 1)], { story: true, defend: true, quiet: true, at: place('gateFront') }); if (!list) { r.cool = 1; return; }
      r.wave = ST.n + 1; r.list = list; r.left = list.length;
      hud.notice(`[붉은까마귀] 문파의 공세 — 제 ${r.wave} 파! (${r.wave} / ${waves})`, 'war'); sysChat(`북문 방어 — 제 ${r.wave} 파 ${list.length}명이 성문으로 몰려옵니다.`); sfx('raid_horn', { volume: 0.6 });
      if (r.wave === 1) chatter(1);
    }
  }
  function waveDone(c) {
    const r = R.o, waves = c.obj.waves || c.obj.max || 1; r.wave = 0; r.list = []; r.cool = DEFEND.gap; ST.n++;
    sfx('quest_done', { volume: 0.7 });
    if (ST.n < waves) { hud.notice(`제 ${ST.n} 파를 막아 냈습니다! 다음 공세에 대비하십시오. (${ST.n} / ${waves})`, 'war'); chatter(ST.n === 1 ? 0 : 2); if (ST.n >= 2) chatter(3); }
    sync();
  }
  function chatter(i) { const t = (D.DEFEND_CHATTER || [])[i]; if (!t) return; const name = F('guildName')() || '은사자 문파원'; hud.chat.add({ channel: 'guild', name, guild: '은사자', text: t }); log('chat', ['guild', `[은사자] ${name}: ${t}`]); }

  /** 게임에서 일어난 일을 알린다 */
  function event(type, p) {
    p = p || {};
    if (type === 'raidResultClose') { if (R.hold > 0) R.hold = 0.01; return; }
    if (type === 'talk') return talk(p.npc);
    if (!on()) return; const c = cur(); if (!c || !ST.started) return; const o = c.obj; let ch = false;
    if (type === 'kill') {
      if (o.type === 'kill' && p.tag === o.tag && ST.n < o.max) { ST.n++; ch = true; }
      else if (o.type === 'collect' && p.tag === o.tag && ST.n < o.max) { if (rng() < (o.rate === undefined ? 1 : o.rate)) { ST.n++; ch = true; F('loot')({ name: o.item, count: 1, rarity: 'rare' }); toast(`${o.item} ${ST.n} / ${o.max}`); } }
      else if (o.type === 'named' && p.named && p.named === o.name) { ST.n = 1; ch = true; }
      else if (o.type === 'raiders' && p.raider && ST.n < o.max) { ST.n++; ch = true; toast(`붉은까마귀 습격자 격퇴 ${ST.n} / ${o.max}`, 'war'); }
      else if (o.type === 'defend' && p.raider && R.o && R.o.wave) { if (--R.o.left <= 0) waveDone(c); ch = true; }
    } else if (type === 'skill') { if (o.type === 'skill' && p.id === o.skill && p.combat !== false && ST.n < o.max) { ST.n++; ch = true; toast(`${o.text.replace(/^실전에서\s*/, '').replace(/\s*\d+회 사용$/, '')} ${ST.n} / ${o.max}`); } }
    else if (type === 'buy') { if (o.type === 'shop' && POTION.includes(p.id) && ST.n < o.max) { ST.n = Math.min(o.max, ST.n + Math.max(1, p.count | 0)); ch = true; } }
    else if (type === 'spec') { if (o.type === 'spec') { ST.n = 1; ch = true; } }
    else if (type === 'bossDead') { if (o.type === 'raid' && ST.n < 1) { ST.n = 1; R.hold = 12; ch = true; } }   // 결과 창을 닫거나 12초 뒤에 장을 맺는다
    else if (type === 'equip' || type === 'enh' || type === 'level') ch = true;
    if (ch) { sync(); R.t = Math.min(R.t, 0.05); }
  }

  // ═════════════ 장의 시작 · 끝 · 보상 ═════════════
  function begin(c) {
    const first = !IDX[c.id] || CH[IDX[c.id] - 1].act !== c.act;
    const go = () => { ST.started = true; objSetup(); log('begin', c.id); sync();
      if (R.auto) { R.auto = false; questClick(); }   // 자동 진행 중이었으면 이어 간다(직접 해야 하는 목표는 창을 여는 데까지만)
      else if (c.obj.type === 'shop' && F('shopNear')()) arrived({ what: 'shop' }); };
    if (first) hud.notice(`제 ${c.act}막 「${c.actName}」`, 'info');
    if (c.obj.type === 'defend') F('stage')('gateHost');
    play([cineStep(c.cineStart, c.id + '.start'), lineStep(splitStart(c)[0])], go);
  }
  function finish(c) {
    if (R.fin) return; R.fin = true;
    if (F('running')()) { R.auto = true; F('stopRun')(); }
    F('autoOff')(); F('closeWins')(c.obj.type); if (c.obj.type === 'defend') F('stage')('gateHallen');
    const ch = c.choice, done = c.done || [];
    const cs = cineStep(c.cineDone, c.id + '.done');
    const steps = ch ? [cs, lineStep(done.slice(0, ch.after + 1)), { k: 'choice', id: c.id, choice: ch }, lineStep(done.slice(ch.after + 1))] : [cs, lineStep(done)];
    play(steps, () => { reward(c); next(c); });
  }
  function reward(c) {
    const r = c.reward || {}, nx = CH[IDX[c.id] + 1], floor = PACING[nx ? nx.id : 'epilogue'] || 1;
    if (r.weapon) F('setWeapon')(r.weapon);
    if (r.gold) F('addGold')(r.gold);
    if (r.scrolls) F('addScrolls')(r.scrolls);
    if (r.armorScrolls) F('addArmorScrolls')(r.armorScrolls);
    if (r.potions && (r.potions.hp || r.potions.mp)) F('addPotions')(r.potions.hp | 0, r.potions.mp | 0);
    if (r.gear && r.gear.length) F('giveGear')(r.gear);
    if (r.title) F('setTitle')(r.title);
    if (r.exp) F('gainExp')(r.exp);
    let extra = 0;   // 다음 장의 최소 레벨에 못 미치면 보정 경험치를 얹는다(포효 Lv5 · 전문화 Lv10 은 반드시 맞는다)
    for (let i = 0; i < 60 && P.level < floor; i++) { const x = Math.max(1, Math.ceil((1 - (+P.exp || 0)) * (F('expReq')(P.level) || 100)) + 1); extra += x; F('gainExp')(x); }
    if (extra) sysChat(`문파의 가르침으로 경험치 ${extra}을 더 얻었습니다.`);
    log('reward', [c.id, extra]); F('refresh')();
  }
  function next(c, quiet) {
    const i = IDX[c.id]; ST.id = i + 1 < CH.length ? CH[i + 1].id : 'end'; ST.n = 0; ST.started = false; R.o = null; R.fin = false; R.hold = 0;
    if (!quiet) { sfx('quest_done'); F('fx')('done'); hud.notice(`이야기 ${c.no}장 「${c.title}」 완료!`, 'info'); sysChat(`이야기 ${c.no}장 「${c.title}」 완료.`); }
    F('stage')(null); F('mark')(String(i + 1)); sync();
  }
  // 0.4초마다: 서장 → 장 시작 → 목표 → 장 끝 → 종장
  function check(dt) {
    if (seq || F('busy')()) return;
    if (P.dead) { const c = cur(); if (c && ST.started && R.o && R.o.id === c.id) objTick(c, dt); return; }   // 쓰러져 있는 동안: 정예는 체력을 되찾고, 물러간 방어전 파는 무효로 한다(새로 부르지는 않는다)
    if (R.note) { hud.notice(R.note, 'info'); sysChat(R.note); R.note = null; }
    if (!ST.seen) return play([cineStep(D.PROLOGUE.cine, 'prologue'), lineStep(D.PROLOGUE.lines)], () => { ST.seen = true; log('prologue', 1); F('mark')('prologue'); sync(); });
    if (ST.id === 'end') {
      if (!ST.epi) play([cineStep(D.EPILOGUE.cine, 'epilogue'), lineStep(D.EPILOGUE.lines)], () => { ST.epi = true; R.auto = false; log('epilogue', 1); F('mark')('epilogue'); sfx('raid_victory', { volume: 0.6 });
        hud.notice('〈사자의 맹세〉 완결! 이제 일일 의뢰와 발카르 토벌전을 자유롭게 즐기세요.', 'info'); sysChat('〈사자의 맹세〉를 끝까지 읽었습니다. 휴전은 하룻밤뿐이라, 붉은까마귀의 습격은 계속됩니다.'); sync(); });
      return;
    }
    const c = cur();
    if (!ST.started) { if (atStart(c)) begin(c); else if (R.auto) { R.auto = false; questClick(); } return; }
    if (!R.o || R.o.id !== c.id) objSetup();
    objTick(c, dt); if (seq) return;
    const [n, max] = prog(c);
    if (n >= max && !(c.obj.type === 'raid' && R.hold > 0)) finish(c);
  }
  function update(dt, rawDt) {
    if (rawDt === undefined) rawDt = dt; R.real += rawDt;
    if (seq) tickSeq(rawDt);
    if (!on()) return;
    if (R.hold > 0) R.hold -= rawDt;
    R.acc += dt; if ((R.t -= rawDt) > 0) return; R.t = CHECK;
    const acc = R.acc; R.acc = 0; check(acc);
  }

  // ═════════════ 인물에게 말 걸기 ═════════════
  function idleLine(npc) {
    const list = (D.IDLE || {})[npc]; if (!list || !list.length) return null; const i = on() ? idx() : 0;
    for (const [until, text] of list) if (until !== 'end' && i <= IDX[until]) return text;
    return list[list.length - 1][1];
  }
  /** 인물에게 말을 걸었다 → true 면 이야기가 받았다(상점·강화 창을 열지 않는다) */
  function talk(npc) {
    if (G.demo || seq || P.dead) return true;
    const c = on() && ST.seen ? cur() : null;
    if (c && !ST.started) { const s = startAt(c); if (s && s.npc === npc) { begin(c); return true; } }                                    // 장 시작 대사를 들으러 왔다
    if (c && ST.started && c.obj.type === 'talk' && c.obj.npc === npc && ST.n < 1) { ST.n = 1; log('talk', npc); finish(c); return true; }   // 대화 목표
    const line = idleLine(npc); if (!line) return false;
    if (npc === 'brom' || npc === 'rina') { F('bubble')(npc, fill(line)); return false; }   // 대장간·잡화점은 말풍선 한마디 뒤에 창이 열린다
    play([lineStep([[npc, line]])]); return true;
  }

  // ═════════════ [이야기] 의뢰 자동 진행 ═════════════
  const huntTag = () => (P.level < 4 ? 'werewolf' : P.level < 9 ? 'orc_warrior' : 'skeleton_knight');
  const HUNT = { werewolf: 'forest', orc_warrior: 'orcCamp', skeleton_knight: 'grave' };
  const hunt = (tag, name) => F('run')({ kind: 'hunt', tag, dest: place(HUNT[tag] || 'forest'), name });
  /** 의뢰창의 [이야기]를 눌렀다: 목표에 맞게 움직인다. 직접 해야 하는 목표는 처음엔 창을 열고, 창이 열려 있을 때 다시 누르면 대신 해 준다 */
  function questClick() {
    if (!on() || P.dead || seq || F('busy')()) return;
    if (F('running')()) { F('stopRun')('의뢰 자동 진행을 멈췄습니다.'); F('autoOff')(); return; }
    const c = cur(); if (!c || !ST.seen) return; const o = c.obj, name = c.title;
    if (!ST.started) {   // 시작 대사를 들을 자리로 간다
      const s = startAt(c); if (!s) return;
      return F('run')({ kind: 'saga', what: 'start', dest: s.npc ? F('npcStand')(s.npc) : place(s.place), name });
    }
    const [n, max] = prog(c); if (n >= max) return;
    if (o.type === 'talk') return F('run')({ kind: 'talk', npc: o.npc, dest: F('npcStand')(o.npc), name });
    if (o.type === 'kill' || o.type === 'collect') return hunt(o.tag, name);
    if (o.type === 'level') return hunt(c.obj.tag || (P.level >= 9 ? 'skeleton_knight' : huntTag()), name);
    if (o.type === 'skill') return hunt(P.level < 9 ? 'werewolf' : huntTag(), name);   // "숲에 나가서 실전에서" — 숲의 늑대인간을 상대로
    if (o.type === 'named') { const m = R.o && R.o.ent, p = m && !m.dead ? m.pos : namedPos(c), g = place('gate'), dx = g.x - p.x, dz = g.z - p.z, d = Math.hypot(dx, dz) || 1;
      return F('run')({ kind: 'hunt', tag: o.tag, dest: { x: p.x + dx / d * 7, z: p.z + dz / d * 7 }, name }); }   // 정예 7m 앞(성문 쪽)에서 멈춰 싸움을 건다
    if (o.type === 'raiders') return F('run')({ kind: 'hunt', tag: 'raider', dest: raidSpot(c), name });
    if (o.type === 'defend') return F('run')({ kind: 'hunt', tag: 'raider', dest: place('gateStand'), name });
    if (o.type === 'raid') { if (F('raidDone')()) return;   // 이미 꺾었다(결과 창을 닫으면 장을 맺는다) — 보스를 다시 부르지 않는다
      return F('run')({ kind: 'raid', dest: place('raidSpot'), name }); }
    if (o.type === 'shop') {
      if (F('shopOpen')()) { const left = max - n; if (!F('buy')('pot_hp', left)) toast('금화가 모자랍니다. 사냥으로 금화를 모으세요.'); return; }
      return F('run')({ kind: 'saga', what: 'shop', dest: F('npcStand')('rina'), name });
    }
    if (o.type === 'enh') {
      if ((P.scrolls | 0) <= 0) { toast('무기 강화 주문서가 없습니다. 사냥으로 주문서를 모읍니다.'); R.farm = true; return hunt(huntTag(), name); }
      if (F('enhOpen')()) return F('run')({ kind: 'enh', target: max, dest: place('smithStand'), name });
      return F('run')({ kind: 'saga', what: 'enh', dest: place('smithStand'), name });
    }
    if (o.type === 'equip') {
      if (F('bagOpen')()) { F('autoWear')(max); event('equip'); return; }
      F('openBag')(); return toast('가방에서 방어구를 눌러 [착용]하세요. [이야기]를 한 번 더 누르면 대신 입혀 줍니다.');
    }
    if (o.type === 'spec') return specClick();
  }
  /** 자동 진행으로 목적지에 닿았다(kind 'saga' 인 계획만 여기로 온다) */
  function arrived(q) {
    const what = q && q.what; F('stopRun')(); const c = cur(); if (!c) return;
    if (what === 'start') { R.auto = true; R.t = 0; return; }
    const [n, max] = prog(c);
    if (what === 'shop') { F('openShop')(); toast(`빨간 물약 ${max - n}병을 사세요. [이야기]를 한 번 더 누르면 대신 삽니다.`); }
    else if (what === 'enh') { F('openEnh')(); toast(`무기 강화 주문서를 올려 +${max}까지 강화하세요. [이야기]를 한 번 더 누르면 대신 강화합니다.`); }
  }
  function specClick() {
    // ctx.pickSpec(key) 가 값을 돌려주면(true/false) 스킬 모듈이 처리한 것이고, undefined 면(모듈 없음) 여기서 P.spec 만 정하고 사건을 낸다
    const pick = (key) => { if (ctx.pickSpec && ctx.pickSpec(key) !== undefined) return; P.spec = key; const s = SPECS.find(x => x.key === key), nm = s ? s.name : key; toast(`전문화 「${nm}」의 길을 골랐습니다.`); sysChat(`전문화 「${nm}」의 길을 골랐습니다.`); event('spec', { key }); };
    if (F('specOpen')()) return pick('ward');                                  // 선택 창이 열려 있다: 대신 「수호」를 고른다
    if (ctx.openSpec && ctx.openSpec()) return toast('세 갈래 가운데 하나를 고르세요. [이야기]를 한 번 더 누르면 「수호」를 고릅니다.');   // 스킬 모듈의 선택 창
    let got = null;   // 임시 대체(스킬 모듈이 없을 때): 대화창 보기 3개
    play([{ k: 'ask', who: 'me', card: { name: '세 갈래', role: '전문화 선택', portrait: (WHO.me || {}).portrait }, text: SPECS.map(s => `「${s.name}」 ${s.hint}`).join(' / '), options: [...SPECS.map(s => ({ id: s.key, label: s.name })), { id: 'later', label: '조금 더 생각한다' }], escId: 'later', set: (id) => { got = id; } }],
      () => { if (got && got !== 'later') pick(got); });
  }

  // ═════════════ 저장 · 시험 ═════════════
  function save() { return { v: 3, id: ST.id, n: ST.n, seen: ST.seen, picks: { ...ST.picks }, epi: ST.epi, started: ST.started }; }
  /** 저장본의 story 를 불러온다. 예전 형식({ ch, n, seen }, v 없음)이면 새 이야기의 서장부터 다시 시작한다(레벨·장비·금화는 game.js 가 그대로 둔다) */
  function load(d) {
    if (seq) stop(); objClear(); Object.assign(ST, fresh()); ST.picks = {}; R.auto = false; R.o = null; R.hold = 0; R.fin = false; R.note = null; R.t = 0.2; R.farm = false;
    if (d && d.v === 3 && (d.id === 'end' || IDX[d.id] !== undefined)) {
      ST.id = d.id; ST.n = Math.max(0, d.n | 0); ST.seen = !!d.seen; ST.epi = !!d.epi && d.id === 'end'; ST.started = !!d.started && d.id !== 'end';
      if (d.picks && typeof d.picks === 'object') for (const k in d.picks) if (IDX[k] !== undefined && CH[IDX[k]].choice && CH[IDX[k]].choice.options[d.picks[k] | 0]) ST.picks[k] = d.picks[k] | 0;
    } else if (d && typeof d === 'object' && (d.seen || d.ch > 0 || d.n > 0 || d.started)) R.note = '이야기가 새로 쓰였습니다. 서장부터 다시 시작합니다. (레벨·장비·금화는 그대로입니다)';
    if (ST.started) objSetup();
    sync(); return save();
  }
  /** 시험·디버그: 지금 장을 대사 없이 마친다(보상·레벨 보정은 그대로) × n */
  function skip(n = 1) {
    for (let i = 0; i < n; i++) { if (seq) stop(); if (!ST.seen) { ST.seen = true; continue; } const c = cur(); if (!c) { ST.epi = true; break; } objClear(); reward(c); next(c, true); }
    R.auto = false; sync(); return ST.id;
  }
  /** 시험·디버그: 그 장의 처음으로 간다('end' 가능) */
  function goto(id) { if (id !== 'end' && IDX[id] === undefined) return false; if (seq) stop(); objClear(); ST.id = id; ST.n = 0; ST.started = false; ST.seen = true; ST.epi = false; R.auto = false; R.hold = 0; R.fin = false; R.t = 0; sync(); return true; }
  function state() {
    const c = cur(), o = R.o;
    return { ...save(), idx: idx(), on: on(), busy: !!seq, phase: seq ? (seq.wait || (seq.beat > 0 ? 'beat' : 'run')) : (c ? (ST.started ? 'obj' : 'wait') : 'end'), auto: R.auto, hold: Math.max(0, R.hold), focus: R.focus,
      prog: c ? prog(c) : null, obj: o ? { type: o.type, wave: o.wave || 0, left: o.left || 0, named: o.ent ? { hp: o.ent.hp, hpMax: o.ent.hpMax, dead: !!o.ent.dead, x: o.ent.pos.x, z: o.ent.pos.z } : null } : null, log: LOG.length };
  }

  return {
    opt, start: () => { R.t = 0; sync(); }, event, update, questInfo() { if (!on()) return null; const c = cur(); if (!c) return null; const [n, max] = prog(c); return { id: 'story', no: c.no, act: c.act, title: `[이야기 ${c.no}장] ${c.title}`, text: c.obj.text, cur: n, max, done: n >= max, started: ST.started }; },
    questClick, arrived, talk, save, load, state, skip, goto, cineSkip,
    playCine: (list, tag) => { if (!seq) play([cineStep(list, tag)]); },   // 시험·디버그: 컷신만 튼다
    cineData: () => [['prologue', D.PROLOGUE.cine], ['epilogue', D.EPILOGUE.cine]],
    canRaid: () => !on() || ST.id === 'end' || idx() >= IDX[GATE],
    busy: () => !!seq, cineOn: () => !!(seq && seq.wait === 'cine'), focus: () => R.focus, autoNext: () => { R.auto = true; },
    taunts: (k) => ((on() && ST.id === 'end' ? D.TAUNTS.afterEnd : D.TAUNTS.beforeEnd) || {})[k] || null,
    idleLine, log: () => LOG, chapters: CH,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 연결부: game.js 가 내부(G, P, spawn, questGo …)를 넘기면 ctx 를 만들어 엔진을 세운다. (브라우저 전용)
//   g = { G, P, ST, ui, hud, win, vfx, S, engine, world, POI, NPCS, SYS, enh, quest, bots, md, expReq, spawn, despawn, gainExp, refreshPlayerUI, refreshWindows,
//         setTarget, questGo, questStop, startRaid, getQrun, setQrun, getApi, halt, setWeapon }
// ═══════════════════════════════════════════════════════════════════════════════════════════
export function installSaga(g) {
  const { G, P, hud, win, POI, NPCS, SYS, engine, world, vfx } = g;
  const vec = (x, z) => POI.plaza.clone().set(x, 0, z), v3 = (o) => POI.plaza.clone().set(o.x, o.y, o.z), XZ = (v) => ({ x: v.x, z: v.z });
  const npcAt = (id) => XZ(NPCS[id] && NPCS[id].ent ? NPCS[id].ent.pos : (NPCS[id] || {}).stand || POI.plaza);
  const PLACE = { orben: npcAt('orben'), liena: npcAt('liena'), brom: npcAt('brom'), rina: npcAt('rina'), gate: XZ(POI.gateOut), altar: XZ(POI.altar), plaza: XZ(POI.plaza), smith: XZ(POI.smith), shop: XZ(POI.merchant), grave: XZ(POI.grave), orcCamp: XZ(POI.orcCamp), forest: XZ(POI.forest),
    smithStand: XZ(POI.smithStand), raidSpot: { x: POI.altar.x + 3, z: POI.altar.z + 24 }, gateStand: { x: POI.gateOut.x, z: POI.gateOut.z - 3 }, gateFront: { x: POI.gateOut.x, z: POI.gateOut.z - 22 }, gateHost: { x: POI.gateOut.x, z: POI.gateOut.z - 26 } };   // gateHost: 북문 앞 붉은까마귀 대열의 맨 앞(할렌)
  const ARMOR = ['helmet', 'armor', 'gloves', 'boots', 'shield', 'cloak'], RANK = { common: 0, rare: 1, epic: 2, legend: 3 };
  const BASIC = { gloves: 't1_gloves', helmet: 't1_helmet', armor: 't1_armor' };
  const armorCount = () => ARMOR.filter(s => P.eq && P.eq[s]).length;
  const hasCine = () => 'cine' in hud;   // UI 가 hud.cine 를 아직 안 만들었으면 예전 연출 띠(hud.cinema)와 자막(showDemoCaption)을 빌린다
  let saga = null, stage = [], stageName = null;
  const sk = () => { const a = g.getApi && g.getApi(), k = a && a.sk; return k && (!k.on || k.on()) ? k : null; };
  const ctx = {
    G, P, hud, win, on: g.ui.on, sfx: g.S, rng: Math.random, instant: false,
    place: (k) => (k === 'player' ? XZ(P.pos) : PLACE[k] || PLACE.plaza),
    npcStand: (id) => (NPCS[id] ? XZ(NPCS[id].stand) : XZ(POI.plaza)),
    inField: () => !world.zoneAt(P.pos.x, P.pos.z).safe, raidActive: () => !!(G.raid && G.raid.active), busy: () => !!g.enh.busy,
    halt: () => g.halt(), calm: () => { for (const m of G.ents) if (m.kind === 'monster' && m.target === P && !m.raider) m.target = null; },
    sync: (s) => { Object.assign(g.ST, { ch: s.idx, id: s.id, n: s.n, seen: s.seen, started: s.started, epi: s.epi }); }, questRefresh: () => g.quest.show(), refresh: () => { g.refreshPlayerUI(); g.refreshWindows(); },
    mark: (name) => G.events.push('story:' + name),
    // 보상
    expReq: (lv) => g.expReq(lv), gainExp: (x) => g.gainExp(x),
    addGold: (n) => { P.gold += n; hud.loot({ icon: 14, name: '금화', count: n, rarity: 'common' }); g.refreshPlayerUI(); },
    addFame: (n) => { P.fame = (P.fame | 0) + n; SYS.changed(); },
    addScrolls: (n) => SYS.giveScroll('w', n), addArmorScrolls: (n) => SYS.giveScroll('a', n),
    addPotions: (hp, mp) => { P.potions.hp += hp; P.potions.mp += mp; hud.setPotions(P.potions); if (hp) hud.loot({ icon: 9, name: '빨간 물약', count: hp, rarity: 'common' }); if (mp) hud.loot({ icon: 10, name: '파란 물약', count: mp, rarity: 'common' }); },
    setWeapon: (name) => { if (P.weaponName === name) return; g.setWeapon(name); hud.loot({ icon: 0, name, count: 1, rarity: 'epic' }); try { vfx.buff(P.ch.root, { color: 0x9fd0ff, duration: 2.5 }); } catch (e) { } },
    giveGear: (ids) => { for (const id of ids) { const it = SYS.findItem(SYS.giveItem(id, 'common')); if (it) hud.loot({ icon: it.icon, name: it.name, count: 1, rarity: it.rarity }); } },
    setTitle: (t) => { P.title = t; hud.notice(`칭호 [${t}]을 얻었습니다!`, 'info'); },
    loot: (o) => hud.loot({ icon: 12, ...o }),
    // 자동 진행(game.js 의 의뢰 실행기를 그대로 쓴다)
    run: (pl) => { if (g.getQrun()) g.questStop(); win.close('enhance'); const q = { id: 'story', t: 0, ...pl, dest: vec(pl.dest.x, pl.dest.z) }; g.setQrun(q); g.questGo(q, q.dest); hud.toast(`[${pl.name}] 자동 진행 — 목적지로 이동합니다.`, 'info'); g.quest.show(); },
    running: () => { const q = g.getQrun(); return !!(q && q.id === 'story'); },
    stopRun: (msg) => { const q = g.getQrun(); if (q && q.id === 'story') g.questStop(msg); },
    autoOff: () => { if (G.auto) g.getApi().setAuto(false); P.target = null; hud.setTarget(null); },
    setTarget: (m) => g.setTarget(m),
    // 창
    openShop: () => SYS.openShop(), shopOpen: () => !!win.isOpen('shop'), shopNear: () => SYS.nearMerchant(), buy: (id, n) => SYS.buy(id, n),
    openBag: () => { g.refreshWindows(); win.open('inventory'); }, bagOpen: () => !!win.isOpen('inventory'),
    closeWins: (type) => { const n = { shop: 'shop', equip: 'inventory', enh: 'enhance', spec: 'spec' }[type]; if (n && win.isOpen(n)) win.close(n); }, cineBegin: () => win.closeAll(),
    openEnh: () => g.enh.open(), enhOpen: () => !!win.isOpen('enhance'),
    // 전문화: 스킬 모듈(api.sk — skills.js)이 붙어 있으면 그쪽의 선택 창·선택 함수를 쓴다(없으면 엔진의 임시 보기)
    openSpec: () => { const k = sk(); return !!(k && k.openSpec && k.openSpec()); },
    specOpen: () => !!win.isOpen('spec') || !!(sk() && win.dialog.isOpen() && !saga.busy()),
    pickSpec: (key) => { const k = sk(); if (!k || !k.pickSpec) return undefined; if (win.dialog.isOpen() && !saga.busy()) win.dialog.hide(); return !!k.pickSpec(key); },
    armorCount,
    /** 빈 방어구 칸을 가방의 장비로 채운다(없으면 수습 장비를 내준다) → 착용 부위 수 */
    autoWear: (max) => {
      for (const s of ARMOR) { if (armorCount() >= max) break; if (P.eq[s]) continue;
        const c = P.inv.filter(it => it.slot === s && !SYS.slotOf(it.uid)).sort((a, b) => (RANK[b.rarity] - RANK[a.rarity]) || (b.plus - a.plus))[0];
        const uid = c ? c.uid : BASIC[s] ? SYS.giveItem(BASIC[s], 'common') : null; if (uid) SYS.equip(uid); }
      return armorCount();
    },
    bubble: (npc, text) => { const n = NPCS[npc]; if (n && n.ent) hud.bubble(n.ent.id, text, 3800); },
    guildName: () => { const b = (g.bots || []).filter(x => x.guild === 0); return b.length ? b[(Math.random() * b.length) | 0].name : null; },
    // 이름 있는 정예: 그 자리에 세운다. 죽으면 사라지고 다시 살아나지 않는다(temp)
    findNamed: (name) => G.ents.find(e => e.named === name && !e.gone && !e.dead) || null,
    spawnNamed: (o) => {
      const d = g.md(o.tag), sc = o.scale || 1.3;
      const e = g.spawn('monster', o.tag, vec(o.x, o.z), { scale: sc, tint: o.tint || undefined, name: o.name, level: d.level + 3, hp: Math.round(d.hp * (o.hpMul || 4)), atk: d.atk * (o.atkMul || 1.4), speed: d.speed, r: d.r * 1.2, range: d.range * 1.15, yaw: 0,
        extra: { named: o.name, temp: true, title: '이름 있는 정예', elite: { named: true }, wanderT: 1e9, mdef: { name: o.name, exp: d.exp * 5, gold: [d.gold[0] * 5, d.gold[1] * 5], sfx: d.sfx, portrait: d.portrait } } });
      if (!e) return null; world.resolve(e.pos, e.r); e.home.copy(e.pos);
      try { vfx.spawn(e.pos, { color: 0xffb040, scale: 1.5 }); } catch (er) { }
      return e;
    },
    sendHome: (m) => { m.moveTo = m.home.clone(); }, despawn: (e) => g.despawn(e),
    // 이야기 습격자·방어전: fieldsys 의 습격자를 쓴다(story: 시간 제한 없이 끝까지, at: 나타날 곳, defend: 처치 보상 없음)
    raidersBusy: () => SYS.field.state().raiders.length > 0, raidDone: () => !!(G.raid && G.raid.done && !G.raid.active),
    holdLine: (list, c, r, dt) => { for (const e of list) if (!e.dead && !e.gone && Math.hypot(e.pos.x - c.x, e.pos.z - c.z) > r) e.skipUntil = G.time + dt * 2 + 0.25; },
    spawnRaiders: (n, o = {}) => {
      const list = SYS.spawnRaiders(n, { story: true, quiet: !!o.quiet, at: o.at || null }); if (!list) return null;
      if (o.defend) for (const e of list) { e.noReward = true; e.hpMax = e.hp = Math.round(e.hpMax * 0.8); e.mdef = { ...e.mdef, exp: Math.max(1, Math.round(e.mdef.exp * 0.12)), gold: [3, 7] }; }
      return list;
    },
    // 컷신
    cam: {
      frame(p, l, fov) { const c = engine.cam; if (!c.cine || c.cine.release !== undefined || !c.cine.saga) { engine.cineTo(v3(p), v3(l), 0.001, { fov, hold: true }); c.cine.saga = true; }
        const k = c.cine; k.p1.set(p.x, p.y, p.z); k.l1.set(l.x, l.y, l.z); k.f1 = fov; k.t = k.dur; },
      release(instant) { const c = engine.cam; if (!c.cine || !c.cine.saga) return; if (instant) { c.cine = null; engine.snapCamera(); } else engine.cineOff(0.9); },
    },
    cineShow: (o) => { hud.cine.show(o); if (!hasCine()) { hud.cinema(true); hud.showDemoCaption(o.caption); } },
    cineHide: () => { hud.cine.hide(); if (!hasCine()) { hud.cinema(false); hud.showDemoCaption(null); } },
    fx: (k) => { if (k === 'flash') { engine.flash(0xfff2d0, 0.75); g.S('enhance_success', { volume: 0.5 }); } else if (k === 'shake') { engine.shake(1.0, 1.1); g.S('boss_slam', { volume: 0.8 }); } else if (k === 'done') engine.flash(0xfff2c0, 0.25); },
    // 무대 소품: 'gateHost' = 북문 앞에 늘어선 붉은까마귀(맨 앞의 1.1배가 할렌). null 이면 치운다
    stage: (name) => {
      if ((name || null) === stageName) return; stageName = name || null;
      if (name === 'gateHallen' && stage.length) { for (const e of stage.splice(1)) { try { vfx.teleport(e.pos.clone(), { out: true, color: 0xff5a4a }); } catch (er) { } g.despawn(e); } return; }   // 붉은 깃이 물러나고 할렌만 남는다
      for (const e of stage) g.despawn(e); stage = [];
      if (name !== 'gateHost' && name !== 'gateHallen') return;
      const z0 = PLACE.gateHost.z, mk = (x, z, o) => { const e = g.spawn('npc', 'hero', vec(x, z), { lod: true, yaw: 0, level: P.level, hp: 9999, guild: 1, ...o }); if (e) { e.plateKind = 'enemy'; if (e.ch.shield) e.ch.shield.visible = false; stage.push(e); } };
      mk(0, z0, { scale: 1.1, tint: 0x7a1f1f, name: '할렌', level: 60 }); if (stage[0]) stage[0].title = '붉은까마귀 문주';
      if (name === 'gateHost') for (let i = 0; i < 8; i++) mk((i % 4 - 1.5) * 3.2, z0 - 4 - ((i / 4) | 0) * 3.4, { tint: 0xff6e5c, name: '붉은까마귀' });
    },
  };
  saga = createSaga(ctx);
  // 사건 연결: systems.js 의 훅(kill · bossDead · levelUp · buy · equip)을 이야기 엔진으로 넘긴다
  SYS.on('kill', (m) => saga.event('kill', { tag: m.tag, name: m.name, named: m.named || null, raider: !!m.raider, elite: !!m.elite, boss: false }));
  SYS.on('bossDead', () => saga.event('bossDead', {}));
  SYS.on('levelUp', () => saga.event('level', { level: P.level }));
  SYS.on('buy', (id, count) => saga.event('buy', { id, count }));
  SYS.on('equip', () => saga.event('equip', { armor: armorCount() }));
  SYS.taunts = (k) => saga.taunts(k);   // 습격자 도발 대사(완결 전/후)
  // 컷신 넘기기: 클릭 · Esc · Space. 컷신 동안에는 다른 키 입력이 게임으로 가지 않게 막는다(UI 가 'cineSkip' 을 보내 와도 겹치지 않는다)
  if (typeof addEventListener === 'function') {
    addEventListener('keydown', (e) => { if (!saga.cineOn() || e.ctrlKey || e.metaKey || e.altKey || (e.target && e.target.tagName === 'INPUT')) return; if (e.code === 'Space' || e.code === 'Escape' || e.code === 'Enter') saga.cineSkip();
      if (/^(Key[A-EG-Z]|Digit|Arrow|Space|Escape|Enter)/.test(e.code)) { e.stopImmediatePropagation(); e.preventDefault(); } }, true);
    addEventListener('pointerdown', () => { if (saga.cineOn()) saga.cineSkip(); }, true);
  }
  return saga;
}
