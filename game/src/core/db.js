// 계정·캐릭터 데이터베이스. 브라우저의 IndexedDB 를 쓴다(서버 없이 동작).
//   accounts   : { id(소문자 아이디), name(표시용 아이디), salt, hash, iter, algo, created, lastLogin }
//   characters : { account, data(캐릭터 저장 내용), updated }
// 비밀번호는 원문을 저장하지 않고 소금값을 넣어 PBKDF2-SHA256 으로 늘린 값만 저장한다.
const DB_NAME = 'erheim_db', DB_VER = 1;
let dbp = null;

function open() {
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    let rq;
    try { rq = indexedDB.open(DB_NAME, DB_VER); } catch (e) { reject(e); return; }
    rq.onupgradeneeded = () => {
      const db = rq.result;
      if (!db.objectStoreNames.contains('accounts')) db.createObjectStore('accounts', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('characters')) db.createObjectStore('characters', { keyPath: 'account' });
    };
    rq.onsuccess = () => resolve(rq.result);
    rq.onerror = () => reject(rq.error || new Error('데이터베이스를 열 수 없습니다.'));
    rq.onblocked = () => reject(new Error('데이터베이스가 다른 탭에서 사용 중입니다.'));
  });
  dbp.catch(() => { dbp = null; });
  return dbp;
}
function tx(store, mode, fn) {
  return open().then((db) => new Promise((resolve, reject) => {
    const t = db.transaction(store, mode); let out;
    const rq = fn(t.objectStore(store));
    if (rq) rq.onsuccess = () => { out = rq.result; };
    t.oncomplete = () => resolve(out);
    t.onerror = t.onabort = () => reject(t.error || new Error('저장에 실패했습니다.'));
  }));
}

const hex = (buf) => Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
function randomSalt() { const a = new Uint8Array(16); (globalThis.crypto || {}).getRandomValues ? crypto.getRandomValues(a) : a.forEach((_, i) => { a[i] = (Math.random() * 256) | 0; }); return hex(a); }

// crypto.subtle 을 못 쓰는 환경용 순수 JS SHA-256
function sha256(bytes) {
  const K = []; let n = 0;
  for (let c = 2; n < 64; c++) { let p = true; for (let i = 2; i * i <= c; i++) if (c % i === 0) { p = false; break; } if (p) K[n++] = (Math.pow(c, 1 / 3) * 4294967296) | 0; }
  const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const l = bytes.length, total = ((l + 9 + 63) >> 6) << 6, m = new Uint8Array(total); m.set(bytes); m[l] = 0x80;
  const dv = new DataView(m.buffer); dv.setUint32(total - 4, l * 8); dv.setUint32(total - 8, Math.floor(l / 536870912));
  const w = new Int32Array(64), r = (x, k) => (x >>> k) | (x << (32 - k));
  for (let o = 0; o < total; o += 64) {
    for (let i = 0; i < 16; i++) w[i] = dv.getInt32(o + i * 4);
    for (let i = 16; i < 64; i++) { const a = w[i - 15], b = w[i - 2]; w[i] = (w[i - 16] + (r(a, 7) ^ r(a, 18) ^ (a >>> 3)) + w[i - 7] + (r(b, 17) ^ r(b, 19) ^ (b >>> 10))) | 0; }
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const t1 = (h + (r(e, 6) ^ r(e, 11) ^ r(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0;
      const t2 = ((r(a, 2) ^ r(a, 13) ^ r(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0; H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
  }
  const out = new Uint8Array(32), ov = new DataView(out.buffer); H.forEach((v, i) => ov.setInt32(i * 4, v)); return out;
}

async function derive(password, salt, algo, iter) {
  const enc = new TextEncoder();
  if (algo === 'pbkdf2') {
    const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
    return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations: iter }, key, 256));
  }
  let h = sha256(enc.encode(salt + ':' + password));
  for (let i = 0; i < iter; i++) { const b = new Uint8Array(h.length + 4); b.set(h); b[h.length] = i & 255; b[h.length + 1] = (i >> 8) & 255; h = sha256(b); }
  return hex(h);
}
const canSubtle = () => !!(globalThis.crypto && crypto.subtle && crypto.subtle.deriveBits);

export const RULES = {
  id: (s) => (/^[A-Za-z0-9_]{4,16}$/.test(s) ? null : '아이디는 영문·숫자·밑줄 4~16자입니다.'),
  password: (s) => (typeof s === 'string' && s.length >= 6 && s.length <= 64 ? null : '비밀번호는 6자 이상입니다.'),
  name: (s) => (/^[가-힣A-Za-z0-9]{2,8}$/.test(s) ? null : '캐릭터 이름은 한글·영문·숫자 2~8자입니다.'),
};

export const DB = {
  available() { return typeof indexedDB !== 'undefined'; },
  /** 계정 만들기. character 는 처음 저장할 캐릭터 내용. 성공하면 { account, data } */
  async signup(id, password, character) {
    const err = RULES.id(id) || RULES.password(password); if (err) throw new Error(err);
    const key = id.toLowerCase();
    if (await tx('accounts', 'readonly', (s) => s.get(key))) throw new Error('이미 있는 아이디입니다.');
    const algo = canSubtle() ? 'pbkdf2' : 'sha256x', iter = algo === 'pbkdf2' ? 120000 : 3000, salt = randomSalt();
    const hash = await derive(password, salt, algo, iter), now = Date.now();
    await tx('accounts', 'readwrite', (s) => { s.add({ id: key, name: id, salt, hash, iter, algo, created: now, lastLogin: now }); });
    await tx('characters', 'readwrite', (s) => { s.put({ account: key, data: character, updated: now }); });
    return { account: key, data: character };
  },
  /** 로그인. 성공하면 { account, data } */
  async login(id, password) {
    const key = String(id || '').toLowerCase();
    const acc = key ? await tx('accounts', 'readonly', (s) => s.get(key)) : null;
    if (!acc) throw new Error('없는 아이디입니다. 회원가입을 먼저 해 주세요.');
    if (acc.algo === 'pbkdf2' && !canSubtle()) throw new Error('이 브라우저에서는 이 계정의 비밀번호를 확인할 수 없습니다.');
    const hash = await derive(String(password || ''), acc.salt, acc.algo, acc.iter);
    if (hash !== acc.hash) throw new Error('비밀번호가 맞지 않습니다.');
    acc.lastLogin = Date.now(); await tx('accounts', 'readwrite', (s) => { s.put(acc); });
    const row = await tx('characters', 'readonly', (s) => s.get(key));
    return { account: key, data: row ? row.data : null };
  },
  /** 캐릭터 저장 */
  save(account, data) { return tx('characters', 'readwrite', (s) => { s.put({ account, data, updated: Date.now() }); }); },
  load(account) { return tx('characters', 'readonly', (s) => s.get(account)).then((r) => (r ? r.data : null)); },
  /** 이 브라우저에 있는 계정 수 */
  count() { return tx('accounts', 'readonly', (s) => s.count()); },
};
