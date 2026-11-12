// 로그인·회원가입 창. 타이틀 화면 위에 뜬다. 계정은 core/db.js(IndexedDB)에 저장된다.
import { DB, RULES } from '../core/db.js';
import { newCharacter } from '../game/story.js';

const CSS = `
#ui .a-layer { position: absolute; inset: 0; z-index: 120; pointer-events: auto; background: radial-gradient(900px 700px at 1420px 520px, rgba(0,0,0,.72), rgba(0,0,0,.28) 70%, transparent); animation: a-in .3s both; }
@keyframes a-in { from { opacity: 0; } to { opacity: 1; } }
#ui .a-box { position: absolute; left: 1090px; top: 170px; width: 660px; padding: 34px 44px 30px; box-sizing: border-box; background: linear-gradient(180deg, rgba(24,28,40,.97), rgba(10,12,18,.97)); border: 1px solid var(--gold-line); border-radius: 6px; box-shadow: 0 20px 70px rgba(0,0,0,.8), inset 0 0 0 1px rgba(255,255,255,.04); color: var(--ink); animation: a-up .35s cubic-bezier(.2,.9,.3,1.1) both; }
@keyframes a-up { from { opacity: 0; transform: translateY(26px); } to { opacity: 1; transform: none; } }
#ui .a-box::before { content: ''; position: absolute; inset: 6px; border: 1px solid rgba(216,181,106,.18); border-radius: 4px; pointer-events: none; }
#ui .a-tabs { display: flex; gap: 0; margin-bottom: 22px; border-bottom: 1px solid rgba(216,181,106,.3); }
#ui .a-tab { flex: 1; height: 58px; display: flex; align-items: center; justify-content: center; font-family: 'GameSerif', serif; font-size: 26px; letter-spacing: .2em; color: var(--ink-faint); cursor: pointer; border-bottom: 3px solid transparent; margin-bottom: -2px; transition: color .15s; }
#ui .a-tab:hover { color: var(--ink); }
#ui .a-tab.on { color: var(--gold-hi); border-bottom-color: var(--gold); text-shadow: 0 0 14px rgba(255,210,120,.45); }
#ui .a-f { display: block; margin-top: 16px; }
#ui .a-f span { display: flex; justify-content: space-between; font-size: 17px; color: var(--ink-dim); margin-bottom: 7px; letter-spacing: .05em; }
#ui .a-f span i { font-style: normal; font-size: 14px; color: var(--ink-faint); }
#ui .a-f input { width: 100%; height: 56px; box-sizing: border-box; padding: 0 18px; font: inherit; font-size: 22px; color: #fff6dc; background: rgba(0,0,0,.5); border: 1px solid rgba(255,255,255,.14); border-radius: 4px; outline: none; transition: border-color .15s, box-shadow .15s; }
#ui .a-f input:focus { border-color: var(--gold); box-shadow: 0 0 0 3px rgba(216,181,106,.18); }
#ui .a-f.hide { display: none; }
#ui .a-msg { min-height: 28px; margin-top: 16px; font-size: 17px; line-height: 28px; color: #ff8a70; text-align: center; }
#ui .a-msg.ok { color: #8fe0a0; }
#ui .a-go { width: 100%; height: 68px; margin-top: 8px; font-size: 26px !important; letter-spacing: .3em !important; }
#ui .a-go[disabled] { filter: grayscale(.7) brightness(.7); pointer-events: none; }
#ui .a-row { display: flex; justify-content: space-between; margin-top: 16px; font-size: 16px; color: var(--ink-faint); }
#ui .a-row a { color: var(--ink-dim); cursor: pointer; text-decoration: underline; text-underline-offset: 4px; }
#ui .a-row a:hover { color: var(--gold-hi); }
#ui .a-note { margin-top: 18px; padding-top: 14px; border-top: 1px solid rgba(255,255,255,.07); font-size: 14px; line-height: 22px; color: var(--ink-faint); }
`;
let styled = false;

/** show({ root, onDone({account,data}), onCancel(), onGuest(), sfx(name) }) → { hide() } */
export function showAuth(o) {
  if (!styled) { styled = true; const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st); }
  const lay = document.createElement('div'); lay.className = 'a-layer';
  lay.innerHTML = `<form class="a-box" autocomplete="off" novalidate>
    <div class="a-tabs"><div class="a-tab on" data-m="login">로그인</div><div class="a-tab" data-m="signup">회원가입</div></div>
    <label class="a-f"><span>아이디<i>영문·숫자 4~16자</i></span><input name="id" type="text" maxlength="16" spellcheck="false" autocapitalize="off"></label>
    <label class="a-f"><span>비밀번호<i>6자 이상</i></span><input name="pw" type="password" maxlength="64"></label>
    <label class="a-f s hide"><span>비밀번호 확인</span><input name="pw2" type="password" maxlength="64"></label>
    <label class="a-f s hide"><span>캐릭터 이름<i>한글·영문·숫자 2~8자</i></span><input name="nm" type="text" maxlength="8" spellcheck="false"></label>
    <div class="a-msg"></div>
    <button type="submit" class="btn primary a-go">로그인</button>
    <div class="a-row"><a data-a="back">← 처음 화면</a><a data-a="guest">계정 없이 체험하기</a></div>
    <div class="a-note">계정과 캐릭터는 이 기기, 이 브라우저의 데이터베이스(IndexedDB)에 저장됩니다. 다른 기기나 다른 브라우저에서는 보이지 않으며, 브라우저의 사이트 데이터를 지우면 함께 지워집니다.</div>
  </form>`;
  const $ = (s) => lay.querySelector(s), f = $('form'), msg = $('.a-msg'), go = $('.a-go');
  const inp = { id: f.elements.id, pw: f.elements.pw, pw2: f.elements.pw2, nm: f.elements.nm };
  let mode = 'login', busy = false;
  const say = (t, ok) => { msg.textContent = t || ''; msg.classList.toggle('ok', !!ok); };
  const setMode = (m) => {
    mode = m; lay.querySelectorAll('.a-tab').forEach((t) => t.classList.toggle('on', t.dataset.m === m));
    lay.querySelectorAll('.a-f.s').forEach((e) => e.classList.toggle('hide', m !== 'signup'));
    go.textContent = m === 'login' ? '로그인' : '가입하고 시작'; say('');
    (inp.id.value ? inp.pw : inp.id).focus();
  };
  lay.querySelectorAll('.a-tab').forEach((t) => t.addEventListener('click', () => { o.sfx && o.sfx('ui_click'); setMode(t.dataset.m); }));
  $('[data-a=back]').addEventListener('click', () => { api.hide(); o.onCancel && o.onCancel(); });
  $('[data-a=guest]').addEventListener('click', () => { api.hide(); o.onGuest && o.onGuest(); });
  // 게임 단축키(이동·스킬·전체화면)가 입력 중에 먹지 않도록 키 입력을 여기서 멈춘다
  for (const ev of ['keydown', 'keyup', 'keypress']) lay.addEventListener(ev, (e) => e.stopPropagation());
  f.addEventListener('submit', async (e) => {
    e.preventDefault(); if (busy) return;
    const id = inp.id.value.trim(), pw = inp.pw.value;
    let err = RULES.id(id) || RULES.password(pw);
    if (!err && mode === 'signup') err = (pw !== inp.pw2.value ? '비밀번호 확인이 맞지 않습니다.' : null) || RULES.name(inp.nm.value.trim());
    if (err) { say(err); return; }
    busy = true; go.disabled = true; say(mode === 'login' ? '확인하는 중…' : '계정을 만드는 중…', true);
    try {
      const res = mode === 'login' ? await DB.login(id, pw) : await DB.signup(id, pw, newCharacter(inp.nm.value.trim()));
      if (!res.data) res.data = newCharacter(id.slice(0, 8));
      try { localStorage.setItem('erheim_last_id', id); } catch (e2) { /* 무시 */ }
      inp.pw.value = ''; inp.pw2.value = '';
      api.hide(); o.onDone && o.onDone(res);
    } catch (e2) { say((e2 && e2.message) || '문제가 생겼습니다. 다시 시도해 주세요.'); busy = false; go.disabled = false; }
  });
  const api = { hide() { lay.remove(); } };
  o.root.appendChild(lay);
  let last = ''; try { last = localStorage.getItem('erheim_last_id') || ''; } catch (e) { /* 무시 */ }
  if (!DB.available()) say('이 브라우저는 데이터베이스를 쓸 수 없습니다. "계정 없이 체험하기"를 이용해 주세요.');
  inp.id.value = last;
  DB.available() && DB.count().then((n) => { if (!n && !last) setMode('signup'); else setMode('login'); }).catch(() => setMode('login'));
  return api;
}
