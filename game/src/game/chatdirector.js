// 채팅 연출기 (SPEC 6). 순수 로직 — DOM·three 없음, node 로 시험 가능.
//
//   const chat = createChatDirector({ rng, getBots, emitChat });
//   chat.update(dt);                       // 매 프레임(초 단위)
//   chat.setContext({ mode: 'field', zone: '속삭이는 숲' });   // 주인공이 있는 곳이 바뀔 때마다
//   chat.event('enhanceSuccess', {name:'카일', item:'여명의 장검', plus:7});
//
// emitChat 으로 나가는 객체: { channel, name, guild, text, id, kind, event, t }
//   channel: 'world'|'local'|'guild'|'party'|'trade'|'system'  (hud.chat.add 에 그대로 넘길 수 있다)
//   kind: 'ambient'|'event'|'system', event: 이벤트 이름 또는 null, id: 말한 봇의 id(말풍선용, 없으면 null)
//
// 만들 때 옵션: rng, getBots, emitChat, playerName('카일'), playerGuild('은사자'), rate(1), systemLines(true)
//   getBots() 가 돌려주는 봇: { id, name, guild } (+ 선택: role 'tank'|'heal'|'deal', ajae true, party true, raid true)
//     role 이 없으면 이름으로 역할을 고정한다(같은 봇은 늘 같은 역할). party/raid 표시가 하나도 없으면 연출기가 파티원·공대원을 정해 둔다.
//
// 이벤트 payload (전부 선택, name 생략 시 주인공):
//   enhanceSuccess {name, item, plus}        enhanceFail {name, item, plus, destroyed}
//   levelUp {name, level}                    rareDrop {name, item, zone}
//   playerDeath {name, zone, mob 또는 killer}  — mob 을 주면 그 이름으로만 "…에게 쓰러졌습니다" 를 쓴다.
//                                              안 주면 레이드 중엔 보스, 몬스터가 한 종류뿐인 지역은 그 몬스터, 그 밖엔 몬스터 이름을 쓰지 않는다.
//   bossSpawn {boss, short, zone, gather, remote} — boss 는 채팅에서 부를 이름(정식 이름 '염옥의 군주 발카르' 는 '발카르' 로 줄인다),
//                                              short 는 따로 줄임 이름을 줄 때, gather 는 레이드 콜이 시작되기까지의 초(기본 8),
//                                              remote:true 는 주인공이 가지 않는 보스(레이드 상태로 바꾸지 않음). 이미 싸우는 보스의 bossSpawn 은 무시한다.
//   bossPhase {phase}    bossDead {name}    raidFail {}
//   공통: system:false(이 이벤트의 시스템 줄 생략), quiet:true(반응 줄이기)
//
// 상태(scene): town 마을 / field 사냥터 / prep 레이드 대기(보스 없음) / raid 보스전 / after 레이드 직후 / late 직후 잡담이 끝난 뒤
//   레이드 콜은 보스가 살아 있을 때(bossSpawn~bossDead·raidFail)만 흐른다. 보스가 끝나면 mode 는 레이드 이전으로 돌아가고
//   지역은 보스 지역에 둔 채 'after' 가 된다 — 통합 쪽이 setContext 로 다른 지역(또는 마을)을 알려 줄 때까지 사냥터 잡담은 흐르지 않는다.

import { GUILDS, guildName, pickNames, isAjaeName, RESERVE_GUILD_NAMES } from '../data/names.js';
import { LINES, REACT, SELF, SYSTEM, EXCHANGES, FILL, ZONE_POOL } from '../data/chatlines.js';

// 채널별 평균 간격(초, rate 1 기준). 0 = 그 상황에서는 흐르지 않음. 전체로 분당 30줄 안팎이 되게 맞췄다.
const RATES = {
  town: { world: 18, local: 10, trade: 13, guild: 28, party: 22, system: 80 },    // party 는 setContext({party:true}) 일 때만
  field: { world: 20, local: 12, trade: 26, guild: 28, party: 18, system: 85 },   // party 는 setContext({party:false}) 면 멈춤
  prep: { world: 17, local: 0, trade: 40, guild: 30, party: 7, system: 0 },
  raid: { world: 18, local: 0, trade: 50, guild: 36, party: 3.8, system: 0 },
  after: { world: 15, local: 0, trade: 40, guild: 22, party: 7.5, system: 0 },
  late: { world: 13, local: 0, trade: 24, guild: 20, party: 0, system: 75 },
};
const MODES = { town: 1, field: 1, raid: 1 };
const CHANNELS = ['world', 'local', 'trade', 'guild', 'party', 'system'];

// 채널에서 어떤 묶음을 얼마나 자주 쓸지 [묶음, 가중치]. '@zone' 지역 전용 묶음, '@phase' 페이즈별 레이드 콜, '@after' 레이드 결과별 뒷이야기.
const WORLD_FULL = [['world', 5], ['enhanceTalk', 2], ['partyLfg', 2.4], ['guildRecruit', 1.5], ['x:world', 1.3]];
const TRADE_FULL = [['tradeSell', 5], ['tradeBuy', 4], ['x:trade', 0.8]];
const GUILD_FULL = [['guild', 5], ['x:guild', 1.2]];
const MIX = {
  town: {
    world: WORLD_FULL,
    local: [['town', 5], ['ajae', 2], ['x:local:town', 1.6]],
    trade: TRADE_FULL,
    guild: GUILD_FULL,
    party: [['partyTown', 4], ['x:party:town', 1]],
    system: [['tips', 1]],
  },
  field: {
    world: WORLD_FULL,
    local: [['field', 5], ['@zone', 2.4], ['turf', 2], ['ajae', 1], ['x:local:field', 1.8]],
    trade: [['tradeSell', 5], ['tradeBuy', 4]],
    guild: GUILD_FULL,
    party: [['party', 5], ['x:party:field', 1]],
    system: [['tips', 1]],
  },
  prep: {
    world: [['world', 3], ['partyLfg', 1.5], ['enhanceTalk', 1]],
    trade: [['tradeSell', 1], ['tradeBuy', 1]],
    guild: [['guild', 1]],
    party: [['raidPrep', 1]],
  },
  raid: {
    world: [['world', 3], ['partyLfg', 1], ['enhanceTalk', 1]],
    trade: [['tradeSell', 1], ['tradeBuy', 1]],
    guild: [['guild', 1]],
    party: [['raidCall', 2.2], ['@phase', 3.6], ['raidDeal', 3], ['raidTank', 2.1], ['raidHeal', 2.1]],
  },
  after: {
    world: [['world', 3], ['enhanceTalk', 1], ['x:world', 1]],
    trade: [['tradeSell', 1], ['tradeBuy', 1]],
    guild: GUILD_FULL,
    party: [['@after', 1]],
  },
  late: { world: WORLD_FULL, trade: TRADE_FULL, guild: GUILD_FULL, system: [['tips', 1]] },
};
const LAP_W = [1, 0.5, 0.3, 0.2];   // 묶음이 n 바퀴 돌았을 때의 가중치 배율 — 다 돈 묶음은 덜 쓰고, 그만큼 채널 간격이 늘어난다
const SLOW_MAX = 2.6;

// 이벤트 반응 설정. n: 반응 수 [최소, 최대], span: 퍼지는 시간(초) [첫 반응, 마지막 반응], ch: 채널 가중치, mute: 당사자 봇이 평소 잡담에서 빠지는 시간(초)
const EVENT_DEF = {
  enhanceSuccess: { react: 'enhanceSuccess', n: [3, 5], span: [0.9, 7], ch: { world: 3, local: 3, guild: 2 }, mute: 25 },
  enhanceFail: { react: 'enhanceFail', n: [2, 4], span: [1, 6], ch: { local: 4, guild: 2, world: 1 }, mute: 30 },
  enhanceDestroy: { react: 'enhanceDestroy', n: [5, 7], span: [0.7, 8], ch: { world: 4, local: 3, guild: 2 }, mute: 150 },
  levelUp: { react: 'levelUp', n: [3, 5], span: [0.7, 5.5], ch: { local: 3, guild: 3, party: 1 }, mute: 20 },
  bossSpawn: { react: 'bossSpawn', n: [6, 8], span: [0.6, 11], ch: { world: 6, guild: 2, local: 1 } },
  bossPhase: { react: 'bossPhase', n: [3, 5], span: [0.5, 5], ch: { party: 1 } },
  bossDead: { react: 'bossDead', n: [7, 10], span: [0.4, 11], ch: { party: 4, world: 4, guild: 2 }, hold: 7 },
  raidFail: { react: 'raidFail', n: [5, 7], span: [1, 10], ch: { party: 5, world: 2, guild: 1 }, hold: 7 },
  playerDeath: { react: 'playerDeath', n: [2, 4], span: [0.8, 5], ch: { local: 4, guild: 2 }, mute: 25 },
  playerDeathRaid: { react: 'playerDeathRaid', n: [2, 3], span: [0.5, 3.5], ch: { party: 1 }, mute: 25 },
  rareDrop: { react: 'rareDrop', n: [4, 6], span: [0.8, 8], ch: { world: 4, local: 3, guild: 1 }, mute: 25 },
};
export const EVENT_TYPES = ['enhanceSuccess', 'enhanceFail', 'levelUp', 'bossSpawn', 'bossPhase', 'bossDead', 'playerDeath', 'rareDrop', 'raidFail'];

// HUD 탭 → 그 탭에서 보이는 채널
const TAB_CHANNELS = { all: null, local: ['local', 'world'], world: ['world'], guild: ['guild'], party: ['party'], trade: ['trade'], system: ['system'] };

const RECENT_MAX = 160;     // 최근 문구 기억 개수(이 안에서는 같은 글이 다시 나오지 않는다)
const QUEUE_MAX = 80;       // 예약 대기 상한
const MIN_GAP = 0.6;        // 평소 채팅 사이 최소 간격(초)
const SOFT_GAP = 0.5;       // 예약된 반응·답글이 앞 줄과 띄우는 최소 간격(초)
const SILENCE_MAX = 7;      // 이보다 오래 조용하면 한마디 끼워 넣는다(초)
const SPEAKER_REST = 9;     // 같은 봇이 다시 말하기까지 쉬는 시간(초)
const SYS_REPEAT = 4;       // 같은 종류 이벤트가 이 안에 다시 오면 시스템 줄을 생략(강화는 한 줄로 합침)
const AFTER_TALK = 100;     // 레이드 직후 뒷이야기가 이어지는 시간(초)
const RAID_TIMEOUT = 420;   // 끝 신호를 못 받았을 때 레이드 상태를 푸는 시간(초)
const PARTY_SIZE = 4;
const RAID_SIZE = 16;
const RAID_LEADS = 3;
const F_SPOKE = 1, F_MEMBER = 2, F_NEWBIE = 4;
const NEWBIE_RE = /^(신입|신규 유저|뉴비)/;          // 이렇게 시작하는 말은 '처음 보는' 봇만 한다
const WAITING_BOSS_RE = /언제 뜨/;                  // 보스가 이미 나와 있을 때는 하지 않는 말
const FALLBACK_BOT = { id: null, name: '지나가던기사', guild: '' };

// ---- 한국어 조사 ---------------------------------------------------------
const DIGIT_BATCHIM = [1, 8, 0, 1, 0, 0, 1, 8, 8, 0]; // 영 일 이 삼 사 오 육 칠 팔 구 (8 = ㄹ 받침)
function batchim(ch) {
  const c = ch.charCodeAt(0);
  if (c >= 0xac00 && c <= 0xd7a3) return (c - 0xac00) % 28;
  if (c >= 48 && c <= 57) return DIGIT_BATCHIM[c - 48];
  if ('lL'.indexOf(ch) >= 0) return 8;
  if ('mnMN'.indexOf(ch) >= 0) return 1;
  return 0;
}
const JOSA_RE = /\[([가-힣]*)\/([가-힣]*)\]/g;
/** "[이/가]" 같은 표시를 앞 글자 받침에 맞춰 바꾼다. */
export function applyJosa(text) {
  return text.replace(JOSA_RE, (m, a, b, idx, whole) => {
    let i = idx - 1;
    while (i >= 0 && /[\s)\]"'!?.,~…]/.test(whole[i])) i--;
    if (i < 0) return b;
    const bt = batchim(whole[i]);
    if (a === '으로') return bt !== 0 && bt !== 8 ? a : b;
    return bt !== 0 ? a : b;
  });
}

// ---- 묶음 준비: '↳' 답글을 앞 줄과 한 단위로 묶는다 -------------------------
function buildUnits(list) {
  const units = [];
  for (let i = 0; i < list.length; i++) {
    const s = list[i];
    const m = /^↳(\d?)\s*/.exec(s);
    if (m && units.length) {
      const u = units[units.length - 1];
      const prev = u[u.length - 1][0];
      const who = m[1] !== '' ? +m[1] : (prev === 0 ? 1 : 0);
      u.push([who, s.slice(m[0].length)]);
    } else {
      units.push([[0, m ? s.slice(m[0].length) : s]]);
    }
  }
  return units;
}

function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
const ROLE_ALIAS = { tank: 'tank', tanker: 'tank', heal: 'heal', healer: 'heal', deal: 'deal', dealer: 'deal', dps: 'deal' };

export function createChatDirector(opts = {}) {
  const rng = typeof opts.rng === 'function' ? opts.rng : Math.random;
  const getBots = typeof opts.getBots === 'function' ? opts.getBots : null;
  const emitChat = typeof opts.emitChat === 'function' ? opts.emitChat : () => {};
  const playerName = opts.playerName || '카일';
  const playerGuild = guildName(opts.playerGuild != null ? opts.playerGuild : '은사자');
  const systemLines = opts.systemLines !== false;
  let rate = opts.rate > 0 ? opts.rate : 1;

  // mode: 통합 쪽이 알려 준 상태, party: null(자동 — 마을에선 없음, 사냥터에선 있음) | true | false
  const ctx = { mode: 'town', zone: '벨로스 성채', boss: FILL.boss, phase: 1, party: null };
  let scene = 'town';           // 실제로 문구를 고르는 상태(town|field|prep|raid|after|late)
  let bossAlive = false;        // bossSpawn ~ bossDead/raidFail
  let bossZone = FILL.bossZone;
  let autoRaid = false;         // bossSpawn 으로 레이드에 들어갔거나 곧 들어갈 상태
  let raidAt = Infinity;        // 자동으로 레이드 상태가 되는 시각
  let zoneTold = false;         // 보스 등장 뒤 통합 쪽이 지역을 알려 주었는지
  let modeBeforeRaid = 'field';
  let raidSince = 0;
  let after = null;             // 레이드 직후: 'win' | 'fail' | null
  let afterSince = 0;

  let t = 0;
  let lastEmit = -1;
  const next = {};
  const queue = [];             // {t, fn, soft} 시간순
  const recent = [];            // 최근 문구
  const recentSet = new Map();  // 문구 → 횟수
  const lastSpoke = new Map();  // 이름 → 시각
  const known = new Map();      // 이름 → 표시(F_SPOKE 말한 적 있음, F_MEMBER 기존 문파원으로 보임, F_NEWBIE 신입·뉴비로 인사함)
  const muted = new Map();      // 이름 → 이 시각까지 평소 잡담·반응에서 빠진다(이벤트 당사자)
  const lastEvent = {};         // 이벤트 이름 → 시각
  const sysState = {};          // 시스템 줄 종류 → {t, n, p, due}
  let streakDue = Infinity;
  const busy = {};              // 채널 → 주고받기가 끝나는 시각
  const bags = {};              // 묶음 이름 → {units, order, pos, last, laps}
  let visible = null;           // 보이는 채널 표시({world:1,...}) 또는 null(전부)
  let visBoost = 1;
  const stampT = new Float64Array(128).fill(-1e9); // 최근 내보낸 시각(통계용)
  const stampV = new Uint8Array(128);
  let stampN = 0;

  // ---- 난수 도우미 ----
  const rand = (a, b) => a + (b - a) * rng();
  const irand = (a, b) => a + Math.floor(rng() * (b - a + 1));
  const pickOf = (arr) => arr[Math.min(arr.length - 1, Math.floor(rng() * arr.length))];
  function weighted(pairs) {
    let sum = 0;
    for (let i = 0; i < pairs.length; i++) sum += pairs[i][1];
    let r = rng() * sum;
    for (let i = 0; i < pairs.length; i++) { r -= pairs[i][1]; if (r < 0) return pairs[i][0]; }
    return pairs[pairs.length - 1][0];
  }

  // ---- 봇 명단 ----
  let fallback = null;
  function makeFallback() {
    const names = pickNames(48, rng);
    return names.map((name, i) => ({ id: 'bot' + i, name, guild: i % 5 === 4 ? '' : GUILDS[i % GUILDS.length].name }));
  }
  function roster() {
    const list = getBots ? getBots() : null;
    if (!list || !list.length) {
      if (!fallback) fallback = makeFallback();
      return fallback;
    }
    return list;
  }
  const botName = (b) => (typeof b === 'string' ? b : (b && b.name) || '');
  const botGuild = (b) => (b && typeof b === 'object' ? guildName(b.guild) : '');
  const botId = (b) => (b && typeof b === 'object' && b.id != null ? b.id : null);
  const flagsOf = (name) => known.get(name) | 0;
  const isAjae = (b) => (b && b.ajae === true) || isAjaeName(botName(b));
  /** 봇의 레이드 역할. role 을 받았으면 그대로, 아니면 이름으로 고정(탱 20%·힐 30%·딜 50%). */
  function roleOf(b) {
    const given = b && typeof b === 'object' && typeof b.role === 'string' ? ROLE_ALIAS[b.role] : null;
    if (given) return given;
    const h = hashStr(botName(b)) % 10;
    return h < 2 ? 'tank' : h < 5 ? 'heal' : 'deal';
  }
  const isTank = (b) => roleOf(b) === 'tank';
  const isHeal = (b) => roleOf(b) === 'heal';
  const isDeal = (b) => roleOf(b) === 'deal';
  /** 공대 지휘 콜(장판·산개·페이즈 콜)은 공대 앞자리 몇 명(공대장·부공대장 격)만 한다. 게임이 공대원을 직접 표시해 주면 누구나. */
  const isLead = (b) => { const i = raidNames.indexOf(botName(b)); return raidNames.length === 0 || (i >= 0 && i < RAID_LEADS); };
  const inPlayerGuild = (b) => playerGuild !== '' && botGuild(b) === playerGuild;
  const canRecruit = (b) => botGuild(b) !== '' && !(flagsOf(botName(b)) & F_NEWBIE);
  /** '신입입니다' 같은 말을 해도 어색하지 않은 봇: 아직 말한 적이 없거나, 한참 조용했고 기존 문파원으로 보인 적이 없는 봇 */
  function isFresh(b) {
    const n = botName(b);
    const f = flagsOf(n);
    if (f & F_MEMBER) return false;
    if (!(f & F_SPOKE)) return true;
    return t - lastSpoke.get(n) > 150;
  }

  /** 말할 봇 고르기. filter: 조건, exclude: 이름 배열. 최근에 말한 봇과 잠시 빠져 있는 봇(이벤트 당사자)은 피한다. */
  const cand = [];
  function collect(list, filter, exclude, rested) {
    cand.length = 0;
    for (let i = 0; i < list.length; i++) {
      const b = list[i];
      const n = botName(b);
      if (!n || n === playerName) continue;
      if (exclude && exclude.indexOf(n) >= 0) continue;
      if (muted.size && muted.get(n) > t) continue;
      if (filter && !filter(b)) continue;
      if (rested && lastSpoke.has(n) && t - lastSpoke.get(n) < SPEAKER_REST) continue;
      cand.push(b);
    }
    return cand.length;
  }
  /** strict 면 조건에 맞는 봇이 없을 때 null(그 문구를 건너뛴다). 아니면 아무나, 그래도 없으면 '지나가던기사'. */
  function pickSpeaker(list, filter, exclude, strict) {
    if (collect(list, filter, exclude, true) || collect(list, filter, exclude, false)) return pickOf(cand);
    if (strict) return null;
    if (collect(list, null, exclude, true) || collect(list, null, exclude, false) || collect(list, null, null, false)) return pickOf(cand);
    return FALLBACK_BOT;
  }

  // 문파 채팅에 나오는 사람: 봇 명단의 주인공 문파 봇. 모자라면 예비 문파원(이름표에 나오지 않는 이름)을 보탠다.
  // 봇의 문파를 바꿔 내보내는 일은 없다 — 어느 채널에서든 봇은 자기 문파로만 보인다.
  const reserve = RESERVE_GUILD_NAMES.map((name) => ({ id: null, name, guild: playerGuild, reserve: true }));
  const guildCache = [];
  function guildList() {
    const list = roster();
    guildCache.length = 0;
    for (let i = 0; i < list.length; i++) if (inPlayerGuild(list[i]) && botName(list[i]) !== playerName) guildCache.push(list[i]);
    if (guildCache.length < 5) {
      for (let i = 0; i < reserve.length; i++) {
        let clash = reserve[i].name === playerName;
        for (let k = 0; k < list.length && !clash; k++) clash = botName(list[k]) === reserve[i].name;
        if (!clash) guildCache.push(reserve[i]);
      }
    }
    return guildCache;
  }

  // 파티원·공대원: 한 번 정하면 그 사람들만 파티 채널에서 말한다.
  const partyNames = [];
  const raidNames = [];
  const memberCache = [];
  function shuffled(list) {
    const a = [];
    for (let i = 0; i < list.length; i++) if (botName(list[i]) && botName(list[i]) !== playerName) a.push(list[i]);
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const x = a[i]; a[i] = a[j]; a[j] = x; }
    return a;
  }
  function pickParty(list) {
    const a = shuffled(list);
    partyNames.length = 0;
    for (let i = 0; i < a.length && partyNames.length < PARTY_SIZE; i++) partyNames.push(botName(a[i]));
  }
  function pickRaid(list) {
    const a = shuffled(list);
    const quota = { tank: 3, heal: 4, deal: RAID_SIZE - 7 };
    raidNames.length = 0;
    for (let i = 0; i < partyNames.length; i++) raidNames.push(partyNames[i]); // 같이 사냥하던 파티원은 공대에도 있다
    for (let i = 0; i < a.length && raidNames.length < RAID_SIZE; i++) {
      const n = botName(a[i]);
      const r = roleOf(a[i]);
      if (raidNames.indexOf(n) >= 0 || quota[r] <= 0) continue;
      quota[r]--;
      raidNames.push(n);
    }
    for (let i = 0; i < a.length && raidNames.length < Math.min(RAID_SIZE, a.length); i++) if (raidNames.indexOf(botName(a[i])) < 0) raidNames.push(botName(a[i]));
  }
  function members(names, flag, pick, want) {
    const list = roster();
    memberCache.length = 0;
    for (let i = 0; i < list.length; i++) if (list[i] && list[i][flag] === true && botName(list[i]) !== playerName) memberCache.push(list[i]);
    if (memberCache.length) return memberCache;   // 게임이 직접 표시해 준 파티원·공대원
    for (let i = 0; i < list.length; i++) if (names.indexOf(botName(list[i])) >= 0) memberCache.push(list[i]);
    if (memberCache.length < Math.min(want, 2) || memberCache.length < names.length - 1) {
      pick(list);
      memberCache.length = 0;
      for (let i = 0; i < list.length; i++) if (names.indexOf(botName(list[i])) >= 0) memberCache.push(list[i]);
    }
    return memberCache;
  }
  const inRaidScene = () => scene === 'raid' || scene === 'prep' || scene === 'after';
  const partyList = () => (inRaidScene() ? members(raidNames, 'raid', pickRaid, RAID_SIZE) : members(partyNames, 'party', pickParty, PARTY_SIZE));
  function listFor(channel) {
    return channel === 'guild' ? guildList() : channel === 'party' ? partyList() : roster();
  }
  /** 채널·묶음에 맞는 봇. 맞는 봇이 없으면 null. */
  function speakerFor(channel, exclude, poolName, newbie) {
    if (channel === 'guild') return pickSpeaker(guildList(), newbie ? isFresh : null, exclude, true);
    if (channel === 'party') {
      const list = partyList();
      const f = poolName === 'raidTank' ? isTank : poolName === 'raidHeal' ? isHeal : poolName === 'raidDeal' ? isDeal
        : poolName && poolName.indexOf('raidCall') === 0 ? isLead : null;
      return pickSpeaker(list, f, exclude, true);
    }
    if (poolName === 'guildRecruit') return pickSpeaker(roster(), canRecruit, exclude, true);
    if (poolName === 'ajae') return pickSpeaker(roster(), isAjae, exclude, true);
    if (newbie) return pickSpeaker(roster(), isFresh, exclude, true);
    return pickSpeaker(roster(), null, exclude, false);
  }

  // ---- 상태 ----
  function partyOn() {
    if (scene === 'raid' || scene === 'prep' || scene === 'after') return true;
    if (scene === 'town') return ctx.party === true;
    if (scene === 'field') return ctx.party !== false;
    return false;
  }
  function rateOf(channel) {
    if (channel === 'party' && !partyOn()) return 0;
    if (channel === 'guild' && playerGuild === '') return 0;
    return RATES[scene][channel] || 0;
  }
  function computeScene() {
    const aft = after ? (t - afterSince > AFTER_TALK ? 'late' : 'after') : null;
    if (ctx.mode === 'raid') return bossAlive ? 'raid' : aft || 'prep';
    if (aft) return aft;
    if (ctx.mode === 'town') return 'town';
    if (!FILL.mobs[ctx.zone] && ctx.zone === bossZone) return 'prep';
    return 'field';
  }

  // ---- 치환 ----
  // 가격은 물건에 어울리게: 소모품은 싸게, 강화 수치가 높을수록 비싸게
  function price(kind, plusVal) {
    if (kind === 'mat') return irand(1, 19) * 5 + '만';
    if (kind === 'item') {
      if (plusVal >= 8) return irand(1, 12) + '억';
      if (plusVal >= 6) return (irand(5, 38) * 100).toLocaleString('en-US') + '만';
      if (plusVal >= 1) return irand(3, 45) * 10 + '만';
      return irand(2, 30) * 5 + '만';
    }
    const r = rng();
    if (r < 0.5) return irand(1, 19) * 5 + '만';
    if (r < 0.8) return irand(1, 9) * 100 + '만';
    if (r < 0.93) return (irand(11, 48) * 100).toLocaleString('en-US') + '만';
    return irand(1, 12) + '억';
  }
  function plus() { const r = rng(); return r < 0.3 ? irand(3, 5) : r < 0.75 ? irand(6, 7) : irand(8, 9); }
  const nearby = (channel) => channel === 'local' || channel === 'party';
  /** 치환값. 그 상황에서 채울 수 없으면 null — 그 문구는 쓰지 않는다. */
  function gen(key, vars, speaker, env) {
    switch (key) {
      case 'name': {
        const other = pickSpeaker(listFor(env.channel), null, speaker ? [speaker] : null, false);
        return botName(other) || playerName;
      }
      case 'item': return pickOf(FILL.items);
      case 'mat': return pickOf(FILL.mats);
      case 'plus': return plus();
      case 'boss': return ctx.boss || FILL.boss;
      case 'zone':
        // 주변 사람(일반·파티)이 말하는 "여기"는 지금 있는 곳, 마을에서는 가려는 사냥터. 전체·문파·거래는 서버 어디든.
        if (nearby(env.channel)) return scene === 'town' ? pickOf(FILL.huntZones) : ctx.zone;
        return rng() < 0.8 ? pickOf(FILL.huntZones) : FILL.bossZone;
      case 'otherZone': {
        for (let k = 0; k < 8; k++) { const z = rng() < 0.75 ? pickOf(FILL.huntZones) : FILL.bossZone; if (z !== ctx.zone) return z; }
        return null;
      }
      case 'nextZone': {
        const i = FILL.zones.indexOf(ctx.zone);
        return i >= 0 && i < FILL.zones.length - 1 ? FILL.zones[i + 1] : null;
      }
      case 'price': return price(env.priceKind, env.plus);
      case 'mob':
        // 이벤트 문구의 몬스터는 payload 로 받은 것만 쓴다(사실과 다른 이름 금지).
        if (env.isEvent) return null;
        if (nearby(env.channel)) return scene === 'field' && FILL.mobs[ctx.zone] ? pickOf(FILL.mobs[ctx.zone]) : null;
        return pickOf(FILL.mobs[pickOf(FILL.huntZones)]);
      case 'level': return irand(12, 68);
      case 'guild': {
        if (env.ownGuild) return env.ownGuild;
        for (let k = 0; k < 6; k++) { const g = pickOf(GUILDS).name; if (g !== env.speakerGuild) return g; }
        return GUILDS[0].name;
      }
      case 'phase': return ctx.phase > 1 ? ctx.phase : 2;
      default: return null;
    }
  }
  const PH_RE = /\{(\w+)\}/g;
  const env = { channel: '', priceKind: '', plus: 0, ownGuild: '', speakerGuild: '', isEvent: false };
  /** 문구의 치환자를 채운다. 채울 수 없는 치환자가 있으면 null. */
  function fill(tpl, vars, speaker, cache, channel, ownGuild, speakerGuild, isEvent) {
    const c = cache || {};
    env.channel = channel || '';
    env.ownGuild = ownGuild || '';
    env.speakerGuild = speakerGuild || '';
    env.isEvent = !!isEvent;
    // 가격이 물건·강화 수치와 어울리도록 강화 수치를 먼저 정해 둔다
    const hasPlus = tpl.indexOf('{plus}') >= 0;
    if (hasPlus && c.plus == null && !(vars && vars.plus != null)) c.plus = String(gen('plus', vars, speaker, env));
    env.plus = hasPlus ? +(vars && vars.plus != null ? vars.plus : c.plus) : (c.plus != null ? +c.plus : 0);
    env.priceKind = tpl.indexOf('{item}') >= 0 || c.item != null ? 'item' : (tpl.indexOf('{mat}') >= 0 || c.mat != null ? 'mat' : '');
    let bad = false;
    const out = tpl.replace(PH_RE, (m, key) => {
      if (vars && vars[key] != null && vars[key] !== '') return String(vars[key]);
      if (c[key] == null) {
        const v = gen(key, vars, speaker, env);
        if (v == null) { bad = true; return ''; }
        c[key] = String(v);
      }
      return c[key];
    });
    return bad ? null : applyJosa(out);
  }

  // ---- 반복 방지 ----
  function remember(text) {
    recent.push(text);
    recentSet.set(text, (recentSet.get(text) || 0) + 1);
    if (recent.length > RECENT_MAX) {
      const old = recent.shift();
      const n = recentSet.get(old) - 1;
      if (n <= 0) recentSet.delete(old); else recentSet.set(old, n);
    }
  }
  function drawUnit(name, list) {
    let b = bags[name];
    if (!b) b = bags[name] = { units: buildUnits(list), order: [], pos: 0, last: -1, laps: -1 };
    if (b.pos >= b.order.length) {
      const n = b.units.length;
      b.laps++;                 // 한 바퀴 다 돌았다 → 이 묶음은 덜 쓰고 채널 간격을 늘린다
      b.order.length = 0;
      for (let i = 0; i < n; i++) b.order.push(i);
      for (let i = n - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        const x = b.order[i]; b.order[i] = b.order[j]; b.order[j] = x;
      }
      if (n > 1 && b.order[0] === b.last) { const x = b.order[0]; b.order[0] = b.order[n - 1]; b.order[n - 1] = x; }
      b.pos = 0;
    }
    b.last = b.order[b.pos++];
    return b.units[b.last];
  }
  /** 묶음에서 최근에 안 쓴 한 줄짜리 문구를 뽑아 치환까지 마친다. 전부 최근에 쓴 글이면 가장 오래전에 쓴 쪽(먼저 뽑힌 것)을, 채울 수 있는 글이 없으면 ''. */
  function drawText(name, list, vars, speaker, channel, isEvent) {
    let first = '';
    const tries = Math.min(10, list.length);
    for (let k = 0; k < tries; k++) {
      const u = drawUnit(name, list);
      const text = fill(u[0][1], vars, speaker, null, channel, '', '', isEvent);
      if (text == null) continue;
      if (!recentSet.has(text)) return text;
      if (!first) first = text;
    }
    return first;
  }

  // ---- 내보내기·예약 ----
  function stamp(channel) {
    const i = stampN++ & 127;
    stampT[i] = t;
    stampV[i] = !visible || visible[channel] ? 1 : 0;
  }
  /** 봇이 at 시각에 channel 에서 말한다고 적어 둔다(예약한 순간부터 '말한 봇'으로 친다). 문파 채널에서 말하면 문파원으로 보인다. */
  function book(bot, at, channel) {
    const name = botName(bot);
    lastSpoke.set(name, at);
    known.set(name, flagsOf(name) | F_SPOKE | (channel === 'guild' ? F_MEMBER : 0));
  }
  function say(channel, bot, text, kind, event, known_) {
    if (!text) return;
    const name = botName(bot);
    book(bot, t, channel);
    lastEmit = t;
    if (!known_) remember(text);
    stamp(channel);
    emitChat({ channel, name, guild: botGuild(bot), text, id: botId(bot), kind: kind || 'ambient', event: event || null, t });
  }
  function system(text, event) {
    if (!text) return;
    lastEmit = t;
    remember(text);
    stamp('system');
    emitChat({ channel: 'system', name: '', guild: '', text, id: null, kind: 'system', event: event || null, t });
  }
  function enqueue(item) {
    let i = queue.length;
    while (i > 0 && queue[i - 1].t > item.t) i--;
    queue.splice(i, 0, item);
  }
  function schedule(at, fn, soft) {
    if (queue.length >= QUEUE_MAX) return false;
    enqueue({ t: at, fn, soft: !!soft });
    return true;
  }

  /** 여러 줄 주고받기(답글 묶음·EXCHANGES)를 몇 초 간격으로 흘린다. 쓸 수 없으면 false. */
  function playUnit(channel, unit, poolName, vars) {
    const first = unit[0][1];
    if (bossAlive && WAITING_BOSS_RE.test(first)) return false;
    const newbie = NEWBIE_RE.test(first);
    const speakers = [];
    const names = [];
    const texts = [];
    const cache = {};
    for (let i = 0; i < unit.length; i++) {
      const who = unit[i][0];
      if (!speakers[who]) {
        const b = speakerFor(channel, names, i === 0 ? poolName : null, i === 0 && newbie);
        if (!b) return false; // 이 말을 할 만한 봇이 없다
        speakers[who] = b;
        names.push(botName(b));
      }
      const text = fill(unit[i][1], vars, botName(speakers[who]), cache, channel, poolName === 'guildRecruit' ? botGuild(speakers[0]) : '', botGuild(speakers[who]), false);
      if (text == null) return false;                                    // 지금 상황에서 채울 수 없는 문구
      if (recentSet.has(text) || texts.indexOf(text) >= 0) return false; // 한 줄이라도 최근에 나온 말이면 통째로 건너뛴다
      texts.push(text);
    }
    const n0 = names[0];
    if (newbie) known.set(n0, flagsOf(n0) | F_NEWBIE);            // 뉴비로 인사한 봇은 문파 모집 글을 올리지 않는다
    else if (poolName === 'guildRecruit') known.set(n0, flagsOf(n0) | F_MEMBER);
    let at = t;
    for (let i = 0; i < unit.length; i++) {
      const bot = speakers[unit[i][0]];
      const text = texts[i];
      if (i === 0) {
        say(channel, bot, text, 'ambient', null);
      } else {
        at += rand(1.8, 3.8) + Math.min(2, text.length * 0.03);
        remember(text);
        book(bot, at, channel);
        // 그 사이에 이 봇에게 큰일(증발·득템 등)이 생겼으면 하던 잡담은 잇지 않는다
        schedule(at, () => { if (!(muted.get(botName(bot)) > t)) say(channel, bot, text, 'ambient', null, true); }, true);
      }
    }
    if (unit.length > 1) busy[channel] = at;
    return true;
  }

  function exchangeUnit(key) {
    let b = bags[key];
    if (!b) {
      const p = key.split(':'); // x:채널[:장소]
      const units = [];
      for (let i = 0; i < EXCHANGES.length; i++) {
        const e = EXCHANGES[i];
        if (e.ch === p[1] && (e.where === 'any' || !p[2] || e.where === p[2])) units.push(e.lines);
      }
      b = bags[key] = { units, order: [], pos: 0, last: -1, laps: -1 };
    }
    return b.units.length ? drawUnit(key, null) : null;
  }

  // '@zone' 같은 표시를 실제 묶음 이름으로. 지금 쓸 수 없으면 ''.
  function resolve(pool) {
    if (pool[0] !== '@') return pool;
    if (pool === '@zone') return ZONE_POOL[ctx.zone] || '';
    if (pool === '@phase') return 'raidCallP' + Math.max(1, Math.min(3, ctx.phase | 0));
    if (pool === '@after') return after === 'fail' ? 'afterFail' : 'afterWin';
    return '';
  }
  function mixWeight(entry) {
    const name = resolve(entry[0]);
    if (!name) return 0;
    const b = bags[name];
    return entry[1] * LAP_W[b ? Math.max(0, Math.min(LAP_W.length - 1, b.laps)) : 0];
  }
  function pickPool(mix) {
    let sum = 0;
    for (let i = 0; i < mix.length; i++) sum += mixWeight(mix[i]);
    if (!(sum > 0)) return '';
    let r = rng() * sum;
    for (let i = 0; i < mix.length; i++) { r -= mixWeight(mix[i]); if (r < 0) return resolve(mix[i][0]); }
    return resolve(mix[mix.length - 1][0]);
  }
  /** 묶음들이 한 바퀴씩 돌수록 그 채널이 느려진다(같은 농담이 되풀이되는 것을 늦춘다). 1 ~ SLOW_MAX */
  function slowFactor(channel) {
    const mix = MIX[scene][channel];
    if (!mix || !mix.length) return 1;
    let base = 0, eff = 0;
    for (let i = 0; i < mix.length; i++) { if (resolve(mix[i][0])) base += mix[i][1]; eff += mixWeight(mix[i]); }
    return eff > 0 ? Math.min(SLOW_MAX, base / eff) : SLOW_MAX;
  }

  function ambient(channel) {
    const mix = MIX[scene][channel];
    if (!mix || !mix.length) return false;
    for (let attempt = 0; attempt < 7; attempt++) {
      const poolName = pickPool(mix);
      if (!poolName) continue;
      if (poolName === 'tips') {
        const text = drawText('tips', SYSTEM.tips, null, null, 'system', false);
        if (text && !recentSet.has(text)) { system(text, null); return true; }
        continue;
      }
      const unit = poolName[0] === 'x' && poolName[1] === ':' ? exchangeUnit(poolName) : drawUnit(poolName, LINES[poolName]);
      if (unit && playUnit(channel, unit, poolName, null)) return true;
    }
    return false;
  }

  function interval(channel) {
    const mean = rateOf(channel);
    if (!(mean > 0)) return Infinity;
    return (mean * slowFactor(channel)) / (rate * (visible && visible[channel] ? visBoost : 1)) * rand(0.45, 1.55);
  }
  function resetTimers(soon) {
    for (let i = 0; i < CHANNELS.length; i++) {
      const ch = CHANNELS[i];
      const mean = rateOf(ch);
      next[ch] = mean > 0 ? t + (soon ? (mean / rate) * rand(0.1, 0.9) : interval(ch)) : Infinity;
    }
  }
  /** 보이는 채널만 셌을 때도 채팅창이 비지 않게, 보이는 채널의 속도를 올리는 배율(최대 2.5배) */
  function updateBoost() {
    visBoost = 1;
    if (!visible) return;
    let all = 0, vis = 0;
    for (let i = 0; i < CHANNELS.length; i++) {
      const m = rateOf(CHANNELS[i]);
      if (m > 0) { all += 1 / m; if (visible[CHANNELS[i]]) vis += 1 / m; }
    }
    if (vis > 0) visBoost = Math.max(1, Math.min(2.5, all / vis));
  }
  function syncScene() {
    const s = computeScene();
    if (s === scene) return;
    const wasRaid = inRaidScene();
    scene = s;
    if ((s === 'raid' || s === 'prep') && !wasRaid) raidNames.length = 0; // 새 공대를 짠다
    updateBoost();
    resetTimers(true);
  }
  resetTimers(true);

  // ---- 이벤트 ----
  function findBot(name) {
    const list = roster();
    for (let i = 0; i < list.length; i++) if (botName(list[i]) === name) return list[i];
    return null;
  }

  function flushStreaks() {
    streakDue = Infinity;
    for (const key in sysState) {
      const st = sysState[key];
      if (st.due <= t) {
        st.due = Infinity;
        const tpl = SYSTEM[key + 'Streak'];
        if (tpl && st.n >= 2 && systemLines) {
          const text = drawText('sys:' + key + 'Streak', tpl, Object.assign({}, st.p, { count: st.n }), null, 'system', true);
          system(text, st.type);
        }
      } else if (st.due < streakDue) streakDue = st.due;
    }
  }

  function react(type, defKey, payload) {
    const def = EVENT_DEF[defKey];
    const subject = payload.name;
    const subjectBot = subject !== playerName ? findBot(subject) : null;
    const subjectGuild = payload.guild != null ? guildName(payload.guild) : (subject === playerName ? playerGuild : botGuild(subjectBot));

    // 같은 이벤트가 잇달아 오면 반응을 줄인다(강화 연타 등)
    const since = t - (lastEvent[type] != null ? lastEvent[type] : -1e9);
    lastEvent[type] = t;
    let n = irand(def.n[0], def.n[1]);
    if (payload.plus >= 9 && defKey !== 'enhanceFail') n += 4; else if (payload.plus >= 7 && defKey !== 'enhanceFail') n += 2;
    if (since < 4) n = 1; else if (since < 10) n = Math.max(1, Math.round(n * 0.5));
    if (payload.quiet) n = Math.min(n, 2);

    // 시스템 줄: 같은 종류가 SYS_REPEAT 초 안에 또 오면 생략하고, 연타가 끝난 뒤 한 줄로 합친다('…Streak' 틀이 있는 종류만)
    if (systemLines && payload.system !== false) {
      const sysKey = SYSTEM[defKey] ? defKey : type;
      if (SYSTEM[sysKey]) {
        const st = sysState[sysKey] || (sysState[sysKey] = { t: -1e9, n: 0, p: null, due: Infinity, type });
        if (t - st.t < SYS_REPEAT) {
          st.n++;
          st.p = payload;
          st.due = t + SYS_REPEAT;
          if (st.due < streakDue) streakDue = st.due;
        } else {
          st.n = 1;
          system(drawText('sys:' + sysKey, SYSTEM[sysKey], payload, null, 'system', true), type);
        }
        st.t = t;
        st.type = type;
      }
    }

    // 채널 후보(문파 채팅은 같은 문파 일일 때만, 파티 채팅은 파티·공대가 있을 때만, 레이드 중에는 일반 채팅 없음)
    const chans = [];
    for (const ch in def.ch) {
      if (ch === 'guild' && (subjectGuild !== playerGuild || playerGuild === '')) continue;
      if (ch === 'local' && (scene === 'raid' || scene === 'prep')) continue;
      if (ch === 'party' && !partyOn()) continue;
      chans.push([ch, def.ch[ch]]);
    }
    if (!chans.length) chans.push(['world', 1]);

    const used = [subject];
    let at = t + rand(def.span[0], def.span[0] + 0.8);
    const step = (def.span[1] - def.span[0]) / Math.max(1, n);

    // 당사자가 봇이면 본인이 먼저 한마디 하고, 한동안 평소 잡담에서 빠진다(증발 뒤에는 더 오래)
    if (subjectBot) {
      if (SELF[defKey] && rng() < 0.75) {
        let ch = subjectGuild === playerGuild && playerGuild !== '' && rng() < 0.4 ? 'guild' : weighted(chans);
        if (ch === 'party') ch = chans.length > 1 ? (chans[0][0] === 'party' ? chans[1][0] : chans[0][0]) : '';
        const text = ch ? drawText('self:' + defKey, SELF[defKey], payload, subject, ch, true) : '';
        if (text && !recentSet.has(text)) {
          remember(text);
          schedule(t + rand(0.3, 0.9), () => say(ch, subjectBot, text, 'event', type, true));
          book(subjectBot, t + 1, ch);
        }
      }
      if (def.mute) muted.set(subject, Math.max(muted.get(subject) || 0, t + def.mute));
    }

    let made = 0;
    for (let i = 0; i < n + 4 && made < n; i++) {
      const ch = weighted(chans);
      const bot = speakerFor(ch, used, null, false);
      if (!bot) continue;
      const text = drawText('react:' + def.react, REACT[def.react], payload, botName(bot), ch, true);
      // 예약 사이에 같은 글이 겹치지 않게 미리 기억해 둔다
      if (!text || recentSet.has(text)) continue;
      used.push(botName(bot));
      remember(text);
      const when = at;
      book(bot, when, ch);
      schedule(when, () => say(ch, bot, text, 'event', type, true), true);
      at += step * rand(0.5, 1.5) + 0.25;
      made++;
    }

    // 반응이 흐르는 동안 평소 잡담은 살짝 물러난다
    const hold = def.hold != null ? def.hold : Math.min(3, def.span[1] * 0.3);
    for (let i = 0; i < CHANNELS.length; i++) {
      const ch = CHANNELS[i];
      if (next[ch] !== Infinity && next[ch] < t + hold) next[ch] = t + hold + rng() * 2;
    }
  }

  /** 레이드를 끝낸다. result: 'win'|'fail'|null(끝 신호 없이 풀림). 주인공이 그 레이드에 있었을 때만 상태를 바꾼다. */
  function endRaid(result, zone) {
    const joined = autoRaid || ctx.mode === 'raid';
    bossAlive = false;
    raidAt = Infinity;
    autoRaid = false;
    ctx.phase = 1;
    if (!joined) return;
    if (ctx.mode === 'raid') ctx.mode = MODES[modeBeforeRaid] && modeBeforeRaid !== 'raid' ? modeBeforeRaid : 'field';
    if (result) { after = result; afterSince = t; ctx.zone = zone || bossZone; }
  }

  function event(type, payload) {
    const p = Object.assign({}, payload || {});
    if (p.name == null || p.name === '') p.name = playerName;
    const bossy = type === 'bossSpawn' || type === 'bossPhase' || type === 'bossDead' || type === 'raidFail';
    if (p.boss == null && bossy) p.boss = ctx.boss || FILL.boss;
    if (p.zone == null) p.zone = type === 'bossSpawn' ? FILL.bossZone : bossy ? bossZone : ctx.zone;

    switch (type) {
      case 'enhanceSuccess':
        if (p.item == null) p.item = FILL.items[0];
        if (p.plus == null) p.plus = 7;
        react(type, 'enhanceSuccess', p);
        break;
      case 'enhanceFail':
        if (p.item == null) p.item = FILL.items[0];
        if (p.plus == null) p.plus = 7;
        react(type, p.destroyed || p.destroy ? 'enhanceDestroy' : 'enhanceFail', p);
        break;
      case 'levelUp':
        if (p.level == null) p.level = irand(20, 60);
        react(type, 'levelUp', p);
        break;
      case 'bossSpawn': {
        // 채팅에서는 짧은 이름으로 부른다: short > boss(정식 이름이면 줄임) > 기본값
        const short = p.short || (p.boss === FILL.bossFull ? FILL.boss : p.boss) || FILL.boss;
        if (bossAlive && short === ctx.boss) return true; // 이미 싸우고 있는 보스 — 공지·반응을 되풀이하지 않는다
        ctx.boss = short;
        ctx.phase = 1;
        bossAlive = true;
        bossZone = p.zone;
        after = null;
        raidSince = t;
        p.boss = short;
        react(type, 'bossSpawn', p);
        if (p.remote !== true && ctx.mode !== 'raid') {
          autoRaid = true;
          zoneTold = false;
          raidAt = t + (p.gather != null ? p.gather : 8); // 공대가 모이는 시간을 두고 레이드 콜 시작
        }
        syncScene();
        break;
      }
      case 'bossPhase':
        ctx.phase = p.phase != null ? p.phase : ctx.phase + 1;
        p.phase = ctx.phase;
        p.boss = ctx.boss;
        bossAlive = true;
        raidSince = t;
        react(type, 'bossPhase', p);
        break;
      case 'bossDead':
      case 'raidFail':
        p.boss = ctx.boss;
        endRaid(type === 'bossDead' ? 'win' : 'fail', p.zone);
        syncScene();
        react(type, type, p);
        break;
      case 'playerDeath': {
        const inRaid = scene === 'raid';
        // 쓰러뜨린 상대는 한 번만 정해 시스템 줄과 반응이 같이 쓴다. 모르면 {mob} 이 든 문구는 쓰지 않는다.
        if ((p.mob == null || p.mob === '') && p.killer != null) p.mob = p.killer;
        if (p.mob == null || p.mob === '') {
          const mobs = FILL.mobs[p.zone];
          if (inRaid || (bossAlive && p.zone === bossZone)) p.mob = ctx.boss;
          else if (mobs && mobs.length === 1) p.mob = mobs[0];
          else delete p.mob;
        }
        react(type, inRaid ? 'playerDeathRaid' : 'playerDeath', p);
        break;
      }
      case 'rareDrop':
        if (p.item == null) p.item = pickOf(FILL.items);
        react(type, 'rareDrop', p);
        break;
      default:
        return false; // 모르는 이벤트는 조용히 무시
    }
    return true;
  }

  // ---- 갱신 ----
  function update(dt) {
    if (!(dt > 0)) return;
    if (dt > 1) dt = 1; // 탭이 잠들었다 깨어나도 한꺼번에 쏟아내지 않는다
    t += dt;
    if (t >= raidAt) {
      raidAt = Infinity;
      if (autoRaid && bossAlive && ctx.mode !== 'raid') {
        modeBeforeRaid = ctx.mode;
        ctx.mode = 'raid';
        if (!zoneTold) ctx.zone = bossZone;
      }
    }
    if (bossAlive && t - raidSince > RAID_TIMEOUT) endRaid(null); // 끝 신호를 못 받았을 때의 안전장치
    syncScene();
    while (queue.length && queue[0].t <= t) {
      const q = queue.shift();
      // 반응·답글이 한순간에 몰리지 않게 앞 줄과 조금 띄운다
      if (q.soft && t - lastEmit < SOFT_GAP) { q.t = Math.max(lastEmit + SOFT_GAP, t + 0.01); enqueue(q); continue; } // 반드시 지금보다 뒤로(같은 시각이면 끝없이 돈다)
      q.fn();
    }
    if (t >= streakDue) flushStreaks();
    for (let i = 0; i < CHANNELS.length; i++) {
      const ch = CHANNELS[i];
      if (next[ch] <= t) {
        if (t - lastEmit < MIN_GAP) { next[ch] = t + MIN_GAP; continue; }
        // 그 채널에서 주고받는 말이 끝날 때까지는 끼어들지 않는다
        if (busy[ch] > t) { next[ch] = busy[ch] + 0.8 + rng() * 2; continue; }
        ambient(ch);
        next[ch] = t + interval(ch);
      }
    }
    // 침묵 방지: 예약된 말도 없이 너무 오래 조용하면 가장 먼저 차례가 올 채널을 당겨 쓴다
    if (t - lastEmit > SILENCE_MAX && !queue.length) {
      let soon = null;
      for (let i = 0; i < CHANNELS.length; i++) {
        const ch = CHANNELS[i];
        if (ch !== 'system' && next[ch] !== Infinity && !(busy[ch] > t) && (soon === null || next[ch] < next[soon])) soon = ch;
      }
      if (soon) { ambient(soon); next[soon] = t + interval(soon); }
      lastEmit = Math.max(lastEmit, t - SILENCE_MAX + 1); // 못 내보냈어도 매 프레임 되풀이하지 않는다
    }
  }

  function setVisible(channels) {
    if (!channels || !channels.length) visible = null;
    else { visible = {}; for (let i = 0; i < channels.length; i++) visible[channels[i]] = 1; }
    updateBoost();
    resetTimers(false);
  }

  return {
    update,
    event,
    /**
     * 상황 알리기(바뀐 것만 줘도 된다. 매 프레임 불러도 된다).
     *   mode: 'town' 마을 | 'field' 사냥터 | 'raid' 레이드 장소에 있음(보스가 없으면 대기 잡담, bossSpawn 뒤에만 레이드 콜)
     *   zone: 지역명,  boss: 보스 짧은 이름
     *   party: true 주인공이 파티에 있음 | false 없음 | null 자동(마을에선 파티 채팅 없음, 사냥터에선 있음). 레이드 중에는 늘 공대 채팅이 흐른다.
     */
    setContext(c) {
      if (!c) return;
      if (c.party !== undefined) {
        const v = c.party == null ? null : !!c.party;
        if (v !== ctx.party) {
          ctx.party = v;
          if (v === false) partyNames.length = 0;
          const m = rateOf('party');
          next.party = m > 0 ? t + (m / rate) * rand(0.1, 0.9) : Infinity;
          updateBoost();
        }
      }
      if (c.boss) ctx.boss = c.boss;
      if (c.zone) {
        zoneTold = true;
        if (c.zone !== ctx.zone) { ctx.zone = c.zone; after = null; } // 다른 곳으로 갔다 → 레이드 직후 상태 끝
      }
      if (c.mode && MODES[c.mode]) {
        if (c.mode === 'raid') {
          if (ctx.mode !== 'raid') { modeBeforeRaid = ctx.mode; ctx.mode = 'raid'; }
          autoRaid = false;
          raidAt = Infinity;
        } else if (autoRaid && c.mode !== 'town') {
          // 자동 레이드 중: 레이드가 끝난 뒤 돌아갈 상태만 바꿔 둔다
          modeBeforeRaid = c.mode;
          if (ctx.mode !== 'raid') ctx.mode = c.mode;
        } else {
          autoRaid = false;
          raidAt = Infinity;
          ctx.mode = c.mode;
          if (c.mode === 'town') after = null;
        }
      }
      syncScene();
    },
    /** mode·zone·boss·phase 와, 실제 연출 상태 scene(town|field|prep|raid|after|late), bossAlive, party, after('win'|'fail'|null) */
    getContext() { return { mode: ctx.mode, zone: ctx.zone, boss: ctx.boss, phase: ctx.phase, scene, bossAlive, party: ctx.party, after }; },
    /** 전체 채팅 속도 배율(1 = 기본, 분당 30줄 안팎. 2 = 두 배로 수다스럽게, 0.7 = 차분하게) */
    setRate(r) { if (r > 0) { rate = r; resetTimers(false); } },
    getRate() { return rate; },
    /** 채팅창에서 지금 보이는 채널 목록(없으면 전부). 보이는 채널만으로도 창이 비지 않게 그 채널들의 속도를 올린다(최대 2.5배). */
    setVisibleChannels: setVisible,
    /** HUD 탭 이름으로 같은 일을 한다: 'all'|'local'|'world'|'guild'|'party'|'trade'|'system' */
    setTab(tab) { setVisible(TAB_CHANNELS[tab] || null); },
    /** 최근 60초 동안 내보낸 줄 수: {lpm 전체, visibleLpm 보이는 채널만, scene} — 속도 조절·시험용 */
    getStats() {
      let all = 0, vis = 0;
      for (let i = 0; i < 128; i++) if (t - stampT[i] < 60) { all++; vis += stampV[i]; }
      const span = Math.min(60, Math.max(1, t));
      return { lpm: all * 60 / span, visibleLpm: vis * 60 / span, scene };
    },
    /** 봇의 레이드 역할('tank'|'heal'|'deal') — 이름표·말풍선과 맞출 때 */
    roleOf(bot) { return roleOf(bot); },
    /** 예약된 반응 수(시험·디버그용) */
    pending() { return queue.length; },
    time() { return t; },
  };
}
