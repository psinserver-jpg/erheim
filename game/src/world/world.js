// 월드: 구역 배치(마을·숲·야영지·묘지·제단), 섞기 지도 그리기, 충돌, 지역, 미니맵 밑그림.
//  지형 셰이더는 terrain.js, 풀·부스러기는 foliage.js, 소품·성벽 도구는 dressing.js, 불·입자·물·깃발은 ambience.js 가 맡는다.
//  지면은 y=0 평면 그대로다(캐릭터 발 위치·클릭 이동이 평면을 가정한다). 제단도 바닥과 같은 높이에 그린다.
import * as THREE from 'three';
import { createMaskPainter, createGround, paintMinimap, legacySplat, GROUND_TUNE, LAYER_TUNE } from './terrain.js';
import { createFoliage, FOLIAGE_TUNE } from './foliage.js';
import { loadProtos, placeProto, createScatter, loadTex, buildCurtainWall, buildTowers, buildIvy, makeFoliageProtos, makeCampProtos, buildDecals, leafUniforms } from './dressing.js';
import { createAmbience, AMBIENCE_TUNE } from './ambience.js';

export const ZONES = [
  { id: 'town', name: '벨로스 성채', sub: '안전 지역', x: 0, z: 0, r: 50, safe: true },
  { id: 'forest', name: '속삭이는 숲', sub: '권장 레벨 12~18', x: 0, z: -128, r: 62 },
  { id: 'grave', name: '잊혀진 묘지', sub: '권장 레벨 18~24', x: -112, z: -150, r: 46 },
  { id: 'altar', name: '잿불 제단', sub: '레이드 구역', x: 0, z: -262, r: 46 },
];
export const POI = {
  plaza: new THREE.Vector3(0, 0, 4), gateIn: new THREE.Vector3(0, 0, -40), gateOut: new THREE.Vector3(0, 0, -58),
  smith: new THREE.Vector3(17.0, 0, -7.6), smithStand: new THREE.Vector3(14.3, 0, -5.6), merchant: new THREE.Vector3(-13.5, 0, -12),
  forest: new THREE.Vector3(0, 0, -118), orcCamp: new THREE.Vector3(34, 0, -150), grave: new THREE.Vector3(-108, 0, -150),
  altar: new THREE.Vector3(0, 0, -262), altarEdge: new THREE.Vector3(0, 0, -232),
};
const HALF = 380;
let rngSeed = 1234567;
const rnd = () => { rngSeed = (rngSeed * 1664525 + 1013904223) >>> 0; return rngSeed / 4294967296; };
const rr = (a, b) => a + (b - a) * rnd();
const pick = (arr) => arr[Math.floor(rnd() * arr.length) % arr.length];

// ───────────────────────── 조정 손잡이(배치) ─────────────────────────
export const WORLD_TUNE = {
  treeSamples: 2000,      // 나무 후보 수(많을수록 숲이 빽빽하다)
  treeHunt: 0.42,         // 사냥터(속삭이는 숲) 안의 나무 비율 — 전투 공간이라 듬성하게
  treeWild: 0.75,         // 사냥터 밖 평원·숲의 나무 비율
  rocks: 190, pebbles: 260, bushes: 620, logs: 26,
  leafFade: 0.16,         // 주인공을 가리는 나뭇잎을 솎아 내는 반지름(화면 높이 비율, 0=끔)
  altarLight: 300,        // 제단 용암빛 점광원 세기
  lava: 1.0,              // 제단 바닥 용암 홈의 밝기 배율
};

// 길(중심선·폭). 섞기 지도와 나무·바위를 비우는 데 함께 쓴다
const ROADS = [
  { pts: [[0, -40], [0, -70], [6, -100], [0, -128], [-4, -170], [0, -205], [0, -232]], w: 7, clear: 6 },
  { pts: [[0, -128], [-40, -138], [-80, -146], [-108, -150]], w: 5.5, clear: 5.2 },
  { pts: [[0, -128], [22, -140], [34, -150]], w: 4.5, clear: 4.6 },
];
function segDist(x, z, ax, az, bx, bz) { const dx = bx - ax, dz = bz - az; const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1))); return Math.hypot(x - ax - dx * t, z - az - dz * t); }
/** 길까지의 여유(m): 0 보다 작으면 길을 비워 둬야 하는 범위 안 */
function roadClear(x, z) { let best = 1e9; for (const r of ROADS) for (let i = 0; i < r.pts.length - 1; i++) { const d = segDist(x, z, r.pts[i][0], r.pts[i][1], r.pts[i + 1][0], r.pts[i + 1][1]) - r.clear; if (d < best) best = d; } return best; }
/** 꺾은선 위의 점(t: 0~1, 길이 기준) */
function along(pts, t) { const L = []; let tot = 0; for (let i = 0; i < pts.length - 1; i++) { const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); L.push(l); tot += l; } let d = t * tot;
  for (let i = 0; i < L.length; i++) { if (d <= L[i] || i === L.length - 1) { const u = Math.min(1, d / L[i]); return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * u, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * u]; } d -= L[i]; } return pts[0]; }
const vhash = (x, z) => { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); };
function vnoise(x, z) { const xi = Math.floor(x), zi = Math.floor(z); let fx = x - xi, fz = z - zi; fx = fx * fx * (3 - 2 * fx); fz = fz * fz * (3 - 2 * fz);
  return (vhash(xi, zi) * (1 - fx) + vhash(xi + 1, zi) * fx) * (1 - fz) + (vhash(xi, zi + 1) * (1 - fx) + vhash(xi + 1, zi + 1) * fx) * fz; }

export async function createWorld(engine) {
  const scene = engine.scene;
  const world = { colliders: [], lights: [], torches: [], update: null };
  const addCol = (x, z, r) => world.colliders.push({ x, z, r });
  const amb = createAmbience(engine);
  /** 불을 놓는다: 점광원 후보 + 불꽃·연기. world.torches 에도 남긴다(예전 호환) */
  const fire = (x, y, z, kind, scale = 1) => { amb.addFire(x, y, z, kind, scale); world.torches.push(new THREE.Vector3(x, y, z)); };

  // ───────────────────────── 원형·텍스처 ─────────────────────────
  const names = ['gatehouse2', 'house2', 'tavern2', 'forge2', 'fountain2', 'market_stall2', 'market_stall2b', 'crates2', 'barrels2', 'sacks2', 'cart2', 'fence2', 'woodpile2', 'haystack2', 'lamp_post2', 'brazier2',
    'oak_tree2', 'oak_tree2b', 'pine_tree2', 'pine_tree2b', 'dead_tree2', 'dead_tree2b', 'rock2_a', 'rock2_b', 'rock2_c', 'rock2_a_moss', 'rock2_b_moss', 'rock2_c_moss',
    'gravestones2', 'gravestones2b', 'gravestones2c', 'campfire2', 'orc_tent2'];
  const M = await loadProtos(names, engine);
  const T = await loadTex(['castle_wall', 'roof_tile', 'wood_planks']);
  Object.assign(M, await makeFoliageProtos(engine), makeCampProtos(T));
  const sc = createScatter(scene, M, { cell: 36 });
  const place = (n, x, z, size, yaw = 0, { col = 0, cast = true, yoff = 0 } = {}) => { const g = placeProto(scene, M[n], x, z, size, yaw, { cast, yoff }); if (g && col) addCol(x, z, col); return g; };
  /** 인스턴스 소품 하나: 충돌 원(col)도 함께 */
  const prop = (n, x, z, yaw = 0, { s = 1, col = 0, ...o } = {}) => { if (sc.add(n, x, z, { s, yaw, ...o }) && col) addCol(x, z, col); };

  // 섞기 지도에 그릴 것을 마스크별로 모아 둔다(배치를 정하면서 함께 적는다)
  const P = createMaskPainter(HALF, 1024);
  const ops = {}; const on = (name, fn) => (ops[name] = ops[name] || []).push(fn);
  const decals = { cracks: [], stains: [], debris: [] };

  // ───────────────────────── 마을: 벨로스 성채 ─────────────────────────
  const R = 49, SEG = 44;
  place('fountain2', 0, 0, 6.2, 0, { col: 3.3 });
  amb.addWater(0, 0.74, 0, 2.52, { inner: 0.85 });
  place('gatehouse2', 0, -47, 30, 0);
  addCol(-8.5, -47, 5.2); addCol(8.5, -47, 5.2); addCol(-13, -47, 3); addCol(13, -47, 3);
  place('tavern2', -25, 9, 15, Math.PI * 0.5, { col: 7.2 });
  place('forge2', 24, -8, 11, -Math.PI * 0.5, { col: 5.0 });
  const houses = [[-27, -22, 11, 0.6], [26, 17, 11.5, -2.2], [-12, 30, 10.5, 3.3], [13, 31, 11, 2.9], [34, -24, 10.5, -1.0], [-36, -6, 10, 1.4], [37, 2, 10.5, -1.6], [-30, 27, 10.8, 2.3], [0, 38, 11.5, 3.14], [-17, -33, 10, 0.2], [17, -33, 10.2, -0.3]];
  for (const [x, z, s, yaw] of houses) place('house2', x, z, s, yaw, { col: s * 0.36 });
  // 좌판: 진열대 앞면(+Z)이 광장을 보게
  [[-15, -13, 'market_stall2'], [-9, -19, 'market_stall2b'], [10, 14, 'market_stall2b'], [15, 9, 'market_stall2']].forEach(([x, z, n], i) => prop(n, x, z, Math.atan2(-x, -z) + (i % 2 ? 0.18 : -0.15), { col: 2.2 }));
  // 잡동사니(예전 자리 그대로, 모델만 섞는다)
  [[-18, -9, 0.4, 'crates2'], [-5, -21, 1.2, 'barrels2'], [12, 18, 2, 'crates2'], [19, -1, 0.3, 'barrels2'], [28, -3, 1.0, 'sacks2'], [-21, 2, 2.2, 'barrels2'], [6, 26, 0.7, 'sacks2'], [-6, 25, 1.5, 'crates2']].forEach(([x, z, yaw, n]) => prop(n, x, z, yaw, { col: 1.2 }));
  // 새로 놓는 것: 건물 옆·성벽 밑의 장작더미·수레·건초·통(사람이 다니는 길과 NPC 자리는 비운다)
  const townProps = [
    ['woodpile2', 24.5, -16.4, 0.1, 1.1], ['brazier2', 18.6, -11.6, 0, 0.45], ['barrels2', -18.6, 13.6, 0.3, 1.0], ['cart2', -19.5, 19.8, 2.4, 1.0], ['sacks2', -12.2, -16.2, 0.9, 0.9], ['barrels2', 13.8, 13.4, 2.1, 1.0],
    ['haystack2', 39.6, 12.6, 0.6, 1.3], ['cart2', 33.2, 9.8, 0.5, 1.0], ['sacks2', 41.2, 8.2, 2.0, 0.9], ['woodpile2', -40.5, 4.5, 1.5, 1.1], ['barrels2', -41.6, -13.2, 0.4, 1.0], ['haystack2', -38.2, 17.2, 2.0, 1.3],
    ['crates2', 9.6, 41.6, 0.3, 1.2], ['cart2', -9.6, 42.2, 1.25, 1.0], ['sacks2', -21, 38.2, 2.6, 0.9], ['barrels2', 23, 37.2, 1.0, 1.0], ['crates2', -11.6, -41.6, 2.9, 1.2], ['barrels2', 11.6, -41.6, 0.5, 1.0],
    ['crates2', 43.2, -8.4, 1.4, 1.2], ['woodpile2', -32.6, -32.8, 0.75, 1.1], ['sacks2', 30.5, -31.6, -0.8, 0.9], ['barrels2', -43.4, -4.2, 1.3, 1.0],
  ];
  for (const [n, x, z, yaw, col] of townProps) prop(n, x, z, yaw, { col });
  fire(18.6, 1.22, -11.6, 'brazier'); fire(20.7, 1.25, -8.2, 'hearth');   // 대장간 화로와 화덕
  // 동쪽 울타리 친 마당(건초·수레)
  const fenceRun = (x0, z0, x1, z1) => { const n = Math.max(1, Math.round(Math.hypot(x1 - x0, z1 - z0) / 3)), yaw = Math.atan2(-(z1 - z0), x1 - x0);
    for (let i = 0; i < n; i++) { const t = (i + 0.5) / n, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t; sc.add('fence2', x, z, { yaw, s: 1, sy: rr(0.92, 1.05) }); for (const u of [-1.5, 0, 1.5]) addCol(x + Math.cos(yaw) * u, z - Math.sin(yaw) * u, 0.35); } };
  fenceRun(34, 17.2, 43, 17.2); fenceRun(34, 17.2, 34, 11.2);
  // 가로등
  const lamps = [[-7, -7], [7, -7], [-7, 7], [7, 7], [0, -26], [-5, -38], [5, -38], [-20, 0], [20, 0], [0, 22], [16, -12], [-14, 16]];
  for (const [x, z] of lamps) { prop('lamp_post2', x, z, rr(0, 6), { col: 0.3 }); fire(x, 2.85, z, 'lamp'); }
  // 성벽(원형, 북쪽 문 자리만 비움) — 충돌 원은 예전과 같다
  const towers = [];
  for (let i = 0; i < SEG; i++) {
    const a = (i + 0.5) / SEG * Math.PI * 2; const x = Math.sin(a) * R, z = -Math.cos(a) * R;
    if (Math.abs(x) < 16 && z < 0) continue;
    addCol(x, z, 3.6);
    if (i % 6 === 2) towers.push([Math.sin(a) * (R + 0.6), -Math.cos(a) * (R + 0.6)]);
  }
  const wall = buildCurtainWall(scene, T, { R });
  const tw = buildTowers(scene, T, towers, wall.material);
  for (const [x, z] of towers) addCol(x, z, 3.8);
  { // 성벽 안쪽의 담쟁이와 늘어진 덩굴
    const ivy = []; for (let i = 0; i < 34; i++) { const a = rr(0.42, Math.PI * 2 - 0.42); if (rnd() < 0.6) ivy.push([a, 1.15, rr(3.0, 4.6), 0]); else ivy.push([a, 6.4, rr(2.4, 3.6), 1]); }
    await buildIvy(scene, engine, ivy, { R });
  }
  // 문파 깃발(광장 둘레) + 성문 현수막
  const guildStyle = [['#1d3470', '#b9b29c', '#c9c6ba', 0], ['#6e1a1c', '#1c1512', '#191513', 1], ['#958a70', '#4a1a16', '#5c1c18', 2], ['#33373e', '#8f8a7c', '#a7a294', 3], ['#3e2468', '#a8904a', '#b89c50', 4], ['#1c4428', '#b5ae96', '#c4bea8', 5]]
    .map(([field, trim, device, kind]) => ({ field, trim, device, kind }));
  world.flags = [];
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + 0.5; world.flags.push(amb.addFlag(Math.sin(a) * 12.5, Math.cos(a) * 12.5, a + Math.PI * 0.5, guildStyle[i])); }
  for (const sx of [-1, 1]) amb.addFlag(sx * 10.4, -42.72, 0, guildStyle[0], { hang: true, y: 12.2, w: 1.7, len: 5.2 });

  // 마을 바닥: 성벽 안은 돌바닥, 광장과 북문 큰길은 판석, 성벽 밑·집 뒤는 흙과 풀이 올라온 닳은 돌바닥
  on('cobble', () => { P.disc(0, 0, 47.3, 1, 0.9); P.road([[0, -40], [0, -57]], 10, 1, 1.2); });
  on('flag', () => { P.disc(0, 0, 15.2, 1, 1.8); P.road([[0, -14], [0, -45]], 7.6, 1, 1.5); P.road([[-14, 0], [-21.5, 0]], 5.6, 1, 1.5); P.road([[14, 0], [21.5, 0]], 5.6, 1, 1.5); P.road([[0, 14], [0, 23]], 5.6, 1, 1.5); });
  on('wet', () => { P.disc(0, 0, 47, 0.36, 2.5); });
  const worn = (x, z, r, k = 0.5) => { on('cobble', () => P.cut(x, z, r, k, 0.7)); on('dirt', () => P.blob(x, z, r * 1.15, 0.85, 0.6)); };
  for (let i = 0; i < 46; i++) { const a = rr(0, 6.283), rad = rr(42.5, 47); const x = Math.sin(a) * rad, z = -Math.cos(a) * rad; if (Math.abs(x) < 9 && z < 0) continue; const r = rr(2.2, 4.4), k = rr(0.45, 0.95); on('cobble', () => P.cut(x, z, r, k, 0.75)); if (rnd() < 0.5) on('dirt', () => P.blob(x, z, r, 0.6, 0.7)); on('lush', () => P.blob(x, z, r, 0.7, 0.6)); }
  for (const [x, z, s] of houses) { const l = Math.hypot(x, z), bx = x + x / l * s * 0.5, bz = z + z / l * s * 0.5; on('cobble', () => P.cut(bx, bz, 4.2, 0.9, 0.6)); on('lush', () => P.blob(bx, bz, 4, 0.8, 0.5)); }
  for (let i = 0; i < 60; i++) { const a = rr(0, 6.283), rad = Math.sqrt(rnd()) * 45; const x = Math.sin(a) * rad, z = Math.cos(a) * rad; if (Math.hypot(x, z) < 16) continue; worn(x, z, rr(0.8, 2.2), rr(0.25, 0.5)); }
  for (let i = 0; i < 90; i++) { const a = rr(0, 6.283), rad = Math.sqrt(rnd()) * 46; const x = Math.sin(a) * rad, z = Math.cos(a) * rad, r = rr(0.5, 1.5), v = rr(0.4, 0.85); on('wet', () => P.blob(x, z, r, v, 0.55)); }
  on('cobble', () => P.cut(38.5, 13.8, 5.2, 0.85, 0.5)); on('dirt', () => P.blob(38.5, 13.8, 5.5, 0.8, 0.5)); on('bare', () => P.blob(39.6, 12.6, 2.2, 1, 0.4));   // 울타리 마당
  for (let i = 0; i < 7; i++) decals.cracks.push([rr(-11, 11), rr(-11, 11), rr(1.6, 2.6), rr(0, 6.3), Math.floor(rr(0, 4)), rr(0.35, 0.6)]);
  for (let i = 0; i < 26; i++) { const a = rr(0.4, Math.PI * 2 - 0.4), rad = rr(45.6, 47.0); decals.debris.push([Math.sin(a) * rad, -Math.cos(a) * rad, rr(0.9, 1.6), rr(0, 6.3), rnd() < 0.7 ? 2 + Math.floor(rr(0, 2)) : Math.floor(rr(0, 2)), 0.95]); }
  decals.stains.push([18.6, -11.6, 2.0, 0.4, 2, 0.75], [20.4, -8.2, 2.6, 1.1, 3, 0.7]);

  // ───────────────────────── 성문 밖 ─────────────────────────
  fire(-7.0, 1.22, -55.6, 'brazier'); fire(7.0, 1.22, -55.6, 'brazier'); prop('brazier2', -7.0, -55.6, 0, { col: 0.45 }); prop('brazier2', 7.0, -55.6, 1, { col: 0.45 });
  prop('cart2', 10.6, -62.2, -0.35, { col: 1.0 }); prop('haystack2', -19.2, -70.4, 0.4, { col: 1.3 }); prop('haystack2', -25, -76, 1.7, { col: 1.3, s: 0.85 }); prop('haystack2', 18.4, -81, 2.6, { col: 1.3, s: 0.92 });
  prop('sacks2', 12.8, -64.6, 1.3, { col: 0.9 }); prop('woodpile2', -11.2, -63.4, 1.2, { col: 1.1 });
  for (const [x, z0, z1] of [[-7.4, -62.5, -68.5], [-7.4, -71.5, -74.5], [7.4, -68.5, -74.5], [7.6, -77.5, -80.5], [-7.4, -80.5, -86.5]]) fenceRun(x, z0, x + rr(-0.3, 0.3), z1);
  for (const [x, z] of [[-5.2, -64.5], [5.4, -79], [-5.6, -97], [5.6, -113.5], [-5.4, -141], [5.2, -186]]) { prop('lamp_post2', x, z, rr(0, 6), { col: 0.3 }); fire(x, 2.85, z, 'lamp'); }
  on('dirt', () => { for (const r of ROADS) P.road(r.pts, r.w, 0.96, 1.5); P.blob(0, -60, 10, 0.9, 0.6); P.ring(0, 0, 50.2, 52.6, 0.55, 1.2); });
  on('bare', () => P.ring(0, 0, 49.6, 51.4, 1, 0.5));
  on('lush', () => { P.blob(-20, -72, 14, 0.8, 0.6); P.blob(22, -76, 12, 0.7, 0.6); });
  for (let i = 0; i < 26; i++) { const x = rr(-40, 40), z = rr(-180, -90), r = rr(3, 7); if (roadClear(x, z) < 2) continue; on('dirt', () => P.blob(x, z, r, 0.42, 0.8)); }
  for (let i = 0; i < 34; i++) { const [px, pz] = along(ROADS[i % 5 === 4 ? 1 + (i % 2) : 0].pts, rr(0.04, 0.96)), x = px + rr(-2.6, 2.6), z = pz + rr(-1, 1), r = rr(0.8, 1.9); on('mud', () => P.blob(x, z, r, 0.75, 0.6)); on('wet', () => P.blob(x, z, r * 1.2, 0.85, 0.5)); }   // 길 위의 진창과 바퀴 자국

  // ───────────────────────── 숲과 평원: 나무·바위·덤불 ─────────────────────────
  const inTown = (x, z) => Math.hypot(x, z) < 55.5;
  const trees = [], treeGrid = new Map(); const tkey = (x, z) => Math.floor(x / 4) + '|' + Math.floor(z / 4);
  const treeNear = (x, z, d) => { const cx = Math.floor(x / 4), cz = Math.floor(z / 4); for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const l = treeGrid.get((cx + i) + '|' + (cz + j)); if (l) for (const t of l) if (Math.hypot(t[0] - x, t[1] - z) < d) return true; } return false; };
  const leafTint = () => { const b = rr(0.8, 1.08); return [b * rr(0.9, 1.06), b, b * rr(0.82, 1.0)]; };
  const reserved = (x, z) => Math.hypot(x - 34, z + 150) < 25 || Math.hypot(x, z + 262) < 44 || (Math.abs(x) < 30 && z < -52 && z > -90 && Math.abs(x) > 5);   // 야영지·제단·성문 앞 들판
  for (let i = 0; i < WORLD_TUNE.treeSamples; i++) {
    const x = rr(-215, 215), z = rr(-328, 125);
    if (inTown(x, z) || roadClear(x, z) < 4.5 || Math.hypot(x, z + 262) < 44 || Math.hypot(x - 34, z + 150) < 24) continue;
    const dAltar = Math.hypot(x, z + 262), dGrave = Math.hypot(x + 112, z + 150), dForest = Math.hypot(x, z + 128);
    if (treeNear(x, z, 3.4)) continue;
    let kind = null;
    if (dGrave < 47) { if (rnd() < 0.16) kind = 'dead'; }
    else if (dAltar < 82) { if (rnd() < 0.42) kind = 'dead'; }
    else if (Math.abs(x) < 30 && z < -55 && z > -88) { if (rnd() < 0.12) kind = 'oak'; }   // 성문 앞 들판은 트여 있다
    else if (rnd() < (dForest < 62 ? WORLD_TUNE.treeHunt : WORLD_TUNE.treeWild)) kind = vnoise(x * 0.021 + 7, z * 0.021) + rr(-0.22, 0.22) > 0.5 ? 'pine' : 'oak';
    if (!kind) continue;
    const t = [x, z, kind]; trees.push(t); (treeGrid.get(tkey(x, z)) || treeGrid.set(tkey(x, z), []).get(tkey(x, z))).push(t);
    if (kind === 'dead') { const s = rr(1.0, 1.5); sc.add(rnd() < 0.6 ? 'dead_tree2' : 'dead_tree2b', x, z, { s, yaw: rr(0, 6.3), tilt: rr(0, 0.07), tiltDir: rr(0, 6.3), color: [rr(0.8, 1), rr(0.8, 1), rr(0.8, 1)] }); addCol(x, z, 0.7); on('dirt', () => P.blob(x, z, 2.2, 0.5, 0.8)); }
    else if (kind === 'pine') { const s = rr(0.75, 1.05); sc.add(rnd() < 0.55 ? 'pine_tree2' : 'pine_tree2b', x, z, { s, sy: rr(0.94, 1.12), yaw: rr(0, 6.3), tilt: rr(0, 0.045), tiltDir: rr(0, 6.3), color: leafTint() }); addCol(x, z, 0.6); on('forest', () => P.blob(x, z, rr(3.0, 4.2), 0.9, 0.75)); }
    else { const s = rr(0.88, 1.2); sc.add(rnd() < 0.55 ? 'oak_tree2' : 'oak_tree2b', x, z, { s, sy: rr(0.94, 1.1), yaw: rr(0, 6.3), tilt: rr(0, 0.04), tiltDir: rr(0, 6.3), color: leafTint() }); addCol(x, z, 0.8); on('forest', () => P.blob(x, z, rr(3.4, 4.8), 0.88, 0.75)); }
  }
  // 숲 바닥: 사냥터 전체에 옅게 깔고 큰 얼룩으로 풀밭과 섞는다
  on('forest', () => { P.blob(0, -128, 74, 0.34, 0.5); for (let i = 0; i < 70; i++) P.blob(rr(-60, 60), rr(-190, -70), rr(5, 12), rr(0.25, 0.5), 0.8); for (let i = 0; i < 120; i++) P.blob(rr(-210, 210), rr(-320, 120), rr(8, 20), rr(0.2, 0.45), 0.8); P.cut(0, 0, 53, 1, 0.08); });
  on('lush', () => { for (let i = 0; i < 60; i++) P.blob(rr(-200, 200), rr(-320, 120), rr(4, 11), rr(0.5, 0.9), 0.6); });
  on('wet', () => { for (let i = 0; i < 40; i++) P.blob(rr(-70, 70), rr(-200, -60), rr(2, 6), rr(0.3, 0.55), 0.7); });
  // 바위(숲은 이끼 낀 것, 제단 근처는 검게)
  const rockList = [];
  for (let i = 0; i < WORLD_TUNE.rocks; i++) {
    const x = rr(-205, 205), z = rr(-322, 118); if (inTown(x, z) || roadClear(x, z) < 1.2 || Math.hypot(x, z + 262) < 31 || Math.hypot(x - 34, z + 150) < 21 || (Math.abs(x) < 9 && z < -40 && z > -64)) continue;
    const dAltar = Math.hypot(x, z + 262), dGrave = Math.hypot(x + 112, z + 150); const dark = dAltar < 75, moss = !dark && dGrave > 46 && rnd() < 0.62;
    const t = rnd(), base = t < 0.3 ? 'rock2_a' : t < 0.65 ? 'rock2_b' : 'rock2_c', s = base === 'rock2_a' ? rr(0.6, 1.2) : base === 'rock2_b' ? rr(0.7, 1.35) : rr(0.8, 1.5);
    const c = dark ? [0.42, 0.38, 0.39] : [rr(0.82, 1), rr(0.84, 1), rr(0.84, 1)];
    sc.add(base + (moss ? '_moss' : ''), x, z, { s, yaw: rr(0, 6.3), sy: rr(0.85, 1.2), color: c });
    const cr = base === 'rock2_a' ? 1.2 * s : base === 'rock2_b' ? 0.9 * s : s > 1.15 ? 0.6 * s : 0; if (cr) addCol(x, z, cr);
    rockList.push([x, z, s]); on('bare', () => P.blob(x, z, cr * 0.9 + 0.3, 1, 0.5)); on('dirt', () => P.blob(x, z, cr + 1.2, 0.5, 0.8));
  }
  for (let i = 0; i < WORLD_TUNE.pebbles; i++) {   // 잔돌(충돌 없음)
    const big = rnd() < 0.5 && rockList.length ? pick(rockList) : null; const x = big ? big[0] + rr(-3, 3) : rr(-180, 180), z = big ? big[1] + rr(-3, 3) : rr(-310, 100);
    if (inTown(x, z) || roadClear(x, z) < -1.5) continue; const dark = Math.hypot(x, z + 262) < 75;
    sc.add(rnd() < 0.5 ? 'rock2_c' : 'rock2_c_moss', x, z, { s: rr(0.16, 0.42), yaw: rr(0, 6.3), cast: false, color: dark ? [0.4, 0.37, 0.38] : [0.9, 0.9, 0.9] });
  }
  // 덤불: 나무 밑동·바위 곁·숲 가장자리에 무리 지어(사냥터 한가운데와 길은 비운다)
  for (let i = 0; i < WORLD_TUNE.bushes; i++) {
    const t = trees.length ? pick(trees) : null; if (!t) break; const a = rr(0, 6.3), d = rr(1.3, 4.6), x = t[0] + Math.sin(a) * d, z = t[1] + Math.cos(a) * d;
    if (inTown(x, z) || roadClear(x, z) < 0.8 || Math.hypot(x, z + 262) < 46 || Math.hypot(x - 34, z + 150) < 22) continue;
    if (t[2] === 'dead') { sc.add('shrub_dead', x, z, { s: rr(1.2, 2.0), yaw: rr(0, 6.3), cast: false, color: [rr(0.7, 0.95), rr(0.7, 0.95), rr(0.7, 0.95)] }); continue; }
    const hunt = Math.hypot(x, z + 128) < 62; if (hunt && rnd() < 0.45) continue;
    sc.add(rnd() < 0.55 ? 'bush_a' : 'bush_b', x, z, { s: rr(0.8, 1.35) * (hunt ? 0.85 : 1.1), sy: rr(0.8, 1.05), yaw: rr(0, 6.3), color: leafTint() });
  }
  // 쓰러진 고목과 나뭇가지 더미
  for (let i = 0; i < WORLD_TUNE.logs; i++) {
    const x = rr(-150, 150), z = rr(-235, -62); if (inTown(x, z) || roadClear(x, z) < 4 || reserved(x, z) || Math.hypot(x + 112, z + 150) < 46 || treeNear(x, z, 2.5)) continue;
    const yaw = rr(0, 6.3), s = rr(0.9, 1.25), dx = Math.sin(yaw), dz = Math.cos(yaw);
    sc.add('dead_tree2', x, z, { s, yaw, lay: Math.PI / 2 - rr(0.02, 0.08), y: 0.28 * s, color: [0.82, 0.86, 0.8] });
    for (const u of [0.9, 2.3, 3.7]) addCol(x + dx * u * s, z + dz * u * s, 0.55);
    on('forest', () => P.blob(x + dx * 2.5, z + dz * 2.5, 4, 0.9, 0.7));
    for (let k = 0; k < 2; k++) sc.add('bush_b', x + dx * rr(0.5, 4) + rr(-1, 1), z + dz * rr(0.5, 4) + rr(-1, 1), { s: rr(0.7, 1.0), yaw: rr(0, 6.3), color: leafTint() });
  }
  for (let i = 0; i < 90; i++) { const x = rr(-150, 150), z = rr(-300, -62); if (inTown(x, z) || roadClear(x, z) < 0.5 || Math.hypot(x, z + 262) < 30) continue; sc.add('twigs', x, z, { s: rr(0.9, 1.6), yaw: rr(0, 6.3), cast: false }); }

  // ───────────────────────── 오크 야영지 ─────────────────────────
  {
    const C = POI.orcCamp, cx = C.x, cz = C.z;
    prop('campfire2', cx, cz, 0.4, { s: 1.15, col: 1.3 }); fire(cx, 0.32, cz, 'campfire');
    for (const [x, z] of [[44.6, -155.6], [27.2, -160.8], [43.4, -140.6]]) { prop('orc_tent2', x, z, Math.atan2(cx - x, cz - z) + rr(-0.2, 0.2), { col: 2.5, s: rr(0.92, 1.05) }); on('bare', () => P.blob(x, z, 3.4, 1, 0.3)); }
    prop('crates2', 30, -156, 0.4, { col: 1.2 }); prop('barrels2', 39, -146, 2.0, { col: 1.2 }); prop('sacks2', 28, -146, 1.1, { col: 1.2 }); prop('woodpile2', 37.6, -142.4, 0.5, { col: 1.1 });
    prop('ribcage', 24.6, -151.4, 0.9, { col: 1.1, s: 1.15 }); prop('brazier2', 39.6, -158.6, 0, { col: 0.45 }); fire(39.6, 1.22, -158.6, 'brazier'); prop('brazier2', 29.6, -142.6, 0, { col: 0.45 }); fire(29.6, 1.22, -142.6, 'brazier');
    // 목책: 몬스터가 나오는 범위 바깥에 세 토막(길 쪽은 터 둔다)
    for (const [a0, a1] of [[0.25, 1.3], [1.9, 2.85], [-2.65, -1.7]]) { const n = Math.round((a1 - a0) * 22.6 / 2.45); for (let i = 0; i < n; i++) { const a = a0 + (a1 - a0) * (i + 0.5) / n, x = cx + Math.sin(a) * 22.6, z = cz + Math.cos(a) * 22.6; if (roadClear(x, z) < 1) continue; prop('stakes', x, z, a + rr(-0.12, 0.12), { col: 0.95, s: rr(0.92, 1.12) }); } }
    amb.addFlag(31.2, -141.2, 2.2, { field: '#4e1a14', trim: '#17110e', device: '#b7ab8c', kind: 1 }, { h: 5.2, w: 1.0, len: 2.2 }); amb.addFlag(46.8, -148.2, 4.6, { field: '#3a2d22', trim: '#17110e', device: '#7a1c16', kind: 4 }, { h: 5.0, w: 1.0, len: 2.2 });
    on('mud', () => { P.blob(cx, cz, 16.5, 1, 0.45); for (let i = 0; i < 14; i++) P.blob(cx + rr(-20, 20), cz + rr(-20, 20), rr(2, 5), 0.8, 0.7); });
    on('ash', () => P.blob(cx, cz, 3.0, 1, 0.5)); on('wet', () => { P.blob(cx, cz, 15, 0.5, 0.6); for (let i = 0; i < 22; i++) P.blob(cx + rr(-13, 13), cz + rr(-13, 13), rr(0.8, 2.2), 0.9, 0.5); P.cut(cx, cz, 3.2, 1, 0.4); });
    on('bare', () => P.blob(cx, cz, 9, 0.8, 0.6));
    decals.stains.push([cx, cz, 4.6, 0.3, 2, 0.85], [cx + 3.4, cz - 2.2, 1.5, 1.0, 0, 0.8], [cx - 4.8, cz + 3.6, 1.8, 2.2, 1, 0.8], [26.2, -150.2, 1.6, 0.4, 0, 0.7], [41.5, -151.5, 1.7, 4.0, 1, 0.75], [39.6, -158.6, 1.8, 0, 2, 0.7], [29.6, -142.6, 1.8, 2, 2, 0.7]);
    for (let i = 0; i < 10; i++) decals.debris.push([cx + rr(-14, 14), cz + rr(-14, 14), rr(0.8, 1.4), rr(0, 6.3), 3, 0.9]);
  }

  // ───────────────────────── 잊혀진 묘지 ─────────────────────────
  {
    const gx = -112, gz = -150, graves = [];
    const okGrave = (x, z) => Math.hypot(x - gx, z - gz) < 39 && Math.hypot(x - POI.grave.x, z - POI.grave.z) > 4 && roadClear(x, z) > 0.8 && !graves.some(g => Math.hypot(g[0] - x, g[1] - z) < 2.5);
    const putGrave = (x, z, yaw) => { const t = rnd(), n = t < 0.5 ? 'gravestones2' : t < 0.76 ? 'gravestones2b' : 'gravestones2c'; graves.push([x, z]); prop(n, x, z, yaw, { col: 0.9, s: rr(1.0, 1.28), tilt: rr(0, 0.05), tiltDir: rr(0, 6.3) }); };
    for (let c = 0; c < 9; c++) {   // 줄지어 선 무덤 무리
      const a = rr(0, 6.283), rad = rr(8, 31), ox = gx + Math.sin(a) * rad, oz = gz + Math.cos(a) * rad, th = 0.35 + rr(-0.3, 0.3), rows = 2 + Math.floor(rr(0, 2)), cols = 3 + Math.floor(rr(0, 3));
      for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) { if (rnd() < 0.18) continue; const u = (j - (cols - 1) / 2) * 2.9 + rr(-0.3, 0.3), v = (i - (rows - 1) / 2) * 4.2 + rr(-0.3, 0.3); const x = ox + Math.cos(th) * u + Math.sin(th) * v, z = oz - Math.sin(th) * u + Math.cos(th) * v; if (okGrave(x, z)) putGrave(x, z, th + rr(-0.12, 0.12)); }
    }
    for (let i = 0; i < 40 && graves.length < 62; i++) { const a = rr(0, 6.283), rad = rr(5, 38), x = gx + Math.sin(a) * rad, z = gz + Math.cos(a) * rad; if (okGrave(x, z)) putGrave(x, z, rr(0, 6.3)); }
    graves.forEach(([x, z], i) => { if (i % 7 === 3) fire(x + 0.5, 0.22, z + 0.4, 'candle'); if (i % 5 === 0) decals.debris.push([x + rr(-1, 1), z + rr(-1, 1), rr(0.8, 1.3), rr(0, 6.3), Math.floor(rr(0, 4)), 0.9]); });
    // 둘레의 무너진 돌담(동쪽 길목은 터 둔다)
    const NW = 86; let run = 0, gap = 0;
    for (let i = 0; i < NW; i++) {
      const a = i / NW * Math.PI * 2, x = gx + Math.sin(a) * 44.2, z = gz + Math.cos(a) * 44.2;
      if (run <= 0 && gap <= 0) { run = 2 + Math.floor(rr(0, 5)); gap = 1 + Math.floor(rr(0, 4)); }
      if (run > 0) { run--; if (roadClear(x, z) < 3.5) continue; const broken = run === 0 || rnd() < 0.15; prop(broken ? 'lowwall_b' : 'lowwall', x, z, a + rr(-0.05, 0.05), { sy: rr(0.85, 1.1) }); for (const u of [-0.8, 0.8]) addCol(x + Math.cos(a) * u, z - Math.sin(a) * u, 0.78); if (rnd() < 0.3) decals.debris.push([x + rr(-1, 1), z + rr(-1, 1), rr(0.9, 1.5), rr(0, 6.3), 2, 0.95]); }
      else gap--;
    }
    for (const [x, z] of [[-87.5, -143.4], [-99.4, -152.8]]) { prop('lamp_post2', x, z, rr(0, 6), { col: 0.3 }); fire(x, 2.85, z, 'lamp'); }
    for (let i = 0; i < 46; i++) { const a = rr(0, 6.283), rad = rr(4, 43), x = gx + Math.sin(a) * rad, z = gz + Math.cos(a) * rad; if (roadClear(x, z) < 0.5) continue; sc.add('shrub_dead', x, z, { s: rr(1.0, 1.9), yaw: rr(0, 6.3), cast: false, color: [rr(0.62, 0.85), rr(0.66, 0.88), rr(0.7, 0.92)] }); }
    on('grave', () => { P.blob(gx, gz, 50, 1, 0.22); for (let i = 0; i < 26; i++) { const a = rr(0, 6.283); P.blob(gx + Math.sin(a) * 47, gz + Math.cos(a) * 47, rr(3, 7), 0.8, 0.7); } });
    on('forest', () => P.cut(gx, gz, 47, 0.75, 0.2));
    on('dry', () => P.blob(gx, gz, 54, 0.85, 0.3)); on('wet', () => { for (let i = 0; i < 14; i++) P.blob(gx + rr(-34, 34), gz + rr(-34, 34), rr(1, 2.6), 0.9, 0.5); });
    amb.addMist(gx, gz, 50);
  }

  // ───────────────────────── 잿불 제단 ─────────────────────────
  {
    const A = POI.altar;
    // 바닥의 용암 홈(고리 둘 + 바큇살 다섯): 바닥과 같은 높이에 그린다. 흐르는 잡음으로 식은 껍질과 달아오른 속이 섞인다
    const lavaU = { uTime: amb.uTime, uGlow: { value: 1.3 } };
    const lavaMat = new THREE.ShaderMaterial({
      uniforms: lavaU, transparent: true, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3,
      vertexShader: 'varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4( position, 1.0 ); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: /* glsl */`
        uniform float uTime, uGlow; varying vec2 vUv; varying vec3 vW;
        float h( vec2 p ) { vec3 p3 = fract( vec3( p.xyx ) * 0.1031 ); p3 += dot( p3, p3.yzx + 33.33 ); return fract( ( p3.x + p3.y ) * p3.z ); }
        float n( vec2 p ) { vec2 i = floor( p ), f = fract( p ); f = f * f * ( 3.0 - 2.0 * f ); return mix( mix( h( i ), h( i + vec2( 1.0, 0.0 ) ), f.x ), mix( h( i + vec2( 0.0, 1.0 ) ), h( i + vec2( 1.0, 1.0 ) ), f.x ), f.y ); }
        void main() {
          float e = 1.0 - abs( vUv.y - 0.5 ) * 2.0;                                   // 홈 가운데 1, 가장자리 0
          float flow = n( vec2( vUv.x * 1.6 - uTime * 0.22, vUv.y * 2.4 ) ) * 0.6 + n( vW.xz * 1.9 + vec2( uTime * 0.07, 0.0 ) ) * 0.4;
          float crust = smoothstep( 0.42, 0.70, flow );                                  // 식어서 검게 굳은 껍질
          float core = smoothstep( 0.0, 0.55, e );
          vec3 col = mix( vec3( 1.0, 0.14, 0.02 ) * 1.0, vec3( 1.0, 0.40, 0.07 ) * 2.1, core * core * ( 1.0 - crust * 0.85 ) );
          col *= mix( 1.0, 0.16, crust ) * uGlow;
          float a = smoothstep( 0.0, 0.22, e );
          gl_FragColor = vec4( mix( vec3( 0.012, 0.008, 0.008 ), col, smoothstep( 0.1, 0.5, e ) ), a );
        }`,
    });
    const ringStrip = (r0, r1, seg = 96) => { const pos = [], uv = [], idx = []; for (let i = 0; i <= seg; i++) { const a = i / seg * Math.PI * 2, s = Math.sin(a), c = Math.cos(a), u = a * (r0 + r1) * 0.5; pos.push(s * r0, 0, c * r0, s * r1, 0, c * r1); uv.push(u, 0, u, 1); if (i < seg) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); } }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); return g; };
    const lavaGroup = new THREE.Group(); lavaGroup.position.set(A.x, 0.03, A.z); lavaGroup.name = 'altarLava';
    for (const [r0, r1] of [[19.9, 21.1], [9.45, 10.25]]) { const m = new THREE.Mesh(ringStrip(r0, r1), lavaMat); m.renderOrder = 1; lavaGroup.add(m); }
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2, g = new THREE.PlaneGeometry(9.9, 0.5, 1, 1); g.rotateX(-Math.PI / 2); const uvA = g.attributes.uv; for (let k = 0; k < uvA.count; k++) uvA.setX(k, uvA.getX(k) * 9.9);
      const m = new THREE.Mesh(g, lavaMat); m.rotation.y = a; m.position.set(Math.cos(a) * 15.15, 0, -Math.sin(a) * 15.15); m.renderOrder = 1; lavaGroup.add(m);
      const g2 = new THREE.PlaneGeometry(9.5, 0.36, 1, 1); g2.rotateX(-Math.PI / 2); const uvB = g2.attributes.uv; for (let k = 0; k < uvB.count; k++) uvB.setX(k, uvB.getX(k) * 9.5);
      const m2 = new THREE.Mesh(g2, lavaMat); m2.rotation.y = a; m2.position.set(Math.cos(a) * 4.75, 0, -Math.sin(a) * 4.75); m2.renderOrder = 1; lavaGroup.add(m2); }
    scene.add(lavaGroup);
    // 둘레의 검은 바위 기둥(충돌 원은 예전 가시와 같은 자리). 카메라 쪽(남·동)은 낮게, 뒤쪽은 높게
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * Math.PI * 2 + 0.3; const camSide = Math.sin(a) > -0.2 && Math.cos(a) > -0.2; const x = A.x + Math.sin(a) * 27.5, z = A.z + Math.cos(a) * 27.5; const h = camSide ? rr(2.5, 4) : rr(10, 18);
      if (Math.abs(Math.sin(a) * 27.5) < 7 && Math.cos(a) > 0) continue;        // 남쪽 입구
      const big = rnd() < 0.6; sc.add(big ? 'rock2_a' : 'rock2_b', x, z, { s: big ? rr(1.5, 2.0) : rr(1.8, 2.3), sy: camSide ? rr(1.0, 1.5) : h / (big ? 3.4 : 2.2), yaw: rr(0, 6.3), tilt: rr(0, 0.12), tiltDir: rr(0, 6.3), color: [0.36, 0.32, 0.33] }); addCol(x, z, 2.2);
      for (let k = 0; k < 2; k++) sc.add('rock2_b', x + rr(-3, 3), z + rr(-3, 3), { s: rr(0.6, 1.1), yaw: rr(0, 6.3), color: [0.36, 0.32, 0.33] });
    }
    prop('brazier2', -8.6, -233.6, 0, { col: 0.45, s: 1.15 }); fire(-8.6, 1.4, -233.6, 'brazier', 1.2); prop('brazier2', 8.6, -233.6, 2, { col: 0.45, s: 1.15 }); fire(8.6, 1.4, -233.6, 'brazier', 1.2);
    prop('ribcage', -14.5, -229.5, 2.4, { col: 1.1, s: 1.3 });
    const pl = new THREE.PointLight(0xff5a1a, WORLD_TUNE.altarLight, 80, 1.6); pl.position.set(A.x, 9, A.z); scene.add(pl); world.altarLight = pl;
    world.altarLava = { emissiveIntensity: 1.3, uniforms: lavaU, group: lavaGroup };
    on('volcanic', () => { P.disc(A.x, A.z, 30.5, 1, 2.6); for (let i = 0; i < 30; i++) { const a = rr(0, 6.283), r = rr(28, 44); P.blob(A.x + Math.sin(a) * r, A.z + Math.cos(a) * r, rr(3, 8), 0.9, 0.7); } P.road([[0, -232], [0, -205]], 6, 0.5, 2.5); });
    on('ash', () => { P.blob(A.x, A.z, 66, 1, 0.4); for (let i = 0; i < 40; i++) { const a = rr(0, 6.283), r = rr(50, 78); P.blob(A.x + Math.sin(a) * r, A.z + Math.cos(a) * r, rr(4, 10), 0.6, 0.8); } });
    on('dry', () => P.blob(A.x, A.z, 96, 1, 0.3)); on('forest', () => P.cut(A.x, A.z, 70, 0.9, 0.3)); on('dirt', () => P.cut(A.x, A.z, 36, 0.8, 0.3));
    for (let i = 0; i < 12; i++) { const a = rr(0, 6.283), r = rr(3, 25); decals.cracks.push([A.x + Math.sin(a) * r, A.z + Math.cos(a) * r, rr(2.2, 4.2), rr(0, 6.3), Math.floor(rr(0, 4)), rr(0.5, 0.85)]); }
    for (let i = 0; i < 9; i++) { const a = rr(0, 6.283), r = rr(4, 24); decals.stains.push([A.x + Math.sin(a) * r, A.z + Math.cos(a) * r, rr(1.6, 3.4), rr(0, 6.3), 2 + Math.floor(rr(0, 2)), rr(0.5, 0.8)]); }
  }

  // ───────────────────────── 섞기 지도 굽기 → 지면·풀 ─────────────────────────
  for (const name of ['dirt', 'cobble', 'volcanic', 'flag', 'forest', 'grave', 'mud', 'ash', 'wet', 'dry', 'bare', 'lush']) { P.begin(); for (const fn of ops[name] || []) fn(); P.end(name); }
  world.masks = P;
  world.splatCanvas = legacySplat(P);
  const ground = await createGround(engine, P);
  world.ground = ground.mesh;
  const foliage = await createFoliage(engine, ground, HALF);
  sc.build();
  await buildDecals(scene, 'tex/decal_cracks.png', decals.cracks, { color: 0x101010, order: 1, y: 0.02 });
  await buildDecals(scene, 'tex/decal_stains.png', decals.stains, { order: 2, y: 0.024 });
  await buildDecals(scene, 'tex/decal_debris.png', decals.debris, { order: 3, y: 0.028, color: 0xcfcac2 });
  amb.build();

  // ───────────────────────── 매 프레임 ─────────────────────────
  world.setNight = (k) => { world.night = k; };
  world.night = 0.25;
  const tmpV = new THREE.Vector3(), scr = { x: 0, y: 0, z: 0 }; let lastQ = '';
  world.update = (dt, time, focus) => {
    const q = engine.quality || '높음';
    if (q !== lastQ) { lastQ = q; foliage.setQuality(q); amb.setQuality(q); }
    ground.update(time); foliage.update(focus); amb.update(dt, time, focus, world.night);
    // 주인공을 가리는 나뭇잎 솎기: 주인공의 화면 위치와 시선 깊이를 잎 셰이더에 알려 준다
    tmpV.set(focus.x, focus.y + 1.0, focus.z); engine.project(tmpV, scr);
    tmpV.applyMatrix4(engine.camera.matrixWorldInverse);
    leafUniforms.uLeafFade.value.set(scr.x, engine.H - scr.y, -tmpV.z, engine.H * WORLD_TUNE.leafFade);
    // 제단: 용암이 숨 쉬듯 밝아졌다 어두워진다
    const pulse = 1.3 + Math.sin(time * 2.1) * 0.35 + Math.sin(time * 5.3) * 0.08;
    world.altarLava.emissiveIntensity = pulse; world.altarLava.uniforms.uGlow.value = pulse * WORLD_TUNE.lava;
    world.altarLight.intensity = WORLD_TUNE.altarLight * (0.86 + 0.14 * Math.sin(time * 2.1 + 0.6));
    tw.windowMat.emissiveIntensity = 0.9 + 1.2 * Math.max(world.night, engine.mood ? engine.mood.night : 0);
  };

  // ───────────────────────── 충돌·지역 ─────────────────────────
  // 충돌 원이 천 개를 넘으므로 격자에 담아 가까운 것만 본다(결과는 전부 훑는 것과 같다)
  const CELL = 8, MAXR = 8; let grid = null, gridN = -1;
  const buildGrid = () => { grid = new Map(); gridN = world.colliders.length; world.colliders.forEach((c) => { const k = Math.floor(c.x / CELL) + ',' + Math.floor(c.z / CELL); (grid.get(k) || grid.set(k, []).get(k)).push(c); }); };
  world.resolve = (pos, radius = 0.5) => {
    if (gridN !== world.colliders.length) buildGrid();
    const reach = Math.ceil((MAXR + radius) / CELL);
    for (let it = 0; it < 2; it++) {
      const gx = Math.floor(pos.x / CELL), gz = Math.floor(pos.z / CELL);
      for (let i = -reach; i <= reach; i++) for (let j = -reach; j <= reach; j++) {
        const l = grid.get((gx + i) + ',' + (gz + j)); if (!l) continue;
        for (const c of l) { const dx = pos.x - c.x, dz = pos.z - c.z; const rr2 = c.r + radius; const d2 = dx * dx + dz * dz;
          if (d2 < rr2 * rr2 && d2 > 1e-6) { const dd = Math.sqrt(d2); pos.x = c.x + dx / dd * rr2; pos.z = c.z + dz / dd * rr2; } }
      }
    }
    pos.x = Math.max(-HALF + 20, Math.min(HALF - 20, pos.x)); pos.z = Math.max(-HALF + 20, Math.min(HALF - 20, pos.z));
    return pos;
  };
  world.zoneAt = (x, z) => { for (const zn of ZONES) if (Math.hypot(x - zn.x, z - zn.z) < zn.r) return zn; return { id: 'wild', name: '에르하임 평원', sub: '', x: 0, z: 0, r: 0 }; };

  // ───────────────────────── 미니맵 밑그림 ─────────────────────────
  const mm = paintMinimap(P, 512), m2 = mm.getContext('2d');
  const mp = (v) => (v + HALF) / (2 * HALF) * 512;
  for (const [x, z, k] of trees) { m2.fillStyle = k === 'dead' ? 'rgba(52,44,36,.55)' : k === 'pine' ? 'rgba(18,36,22,.6)' : 'rgba(24,44,18,.58)'; m2.beginPath(); m2.arc(mp(x), mp(z), 1.5, 0, 7); m2.fill(); }
  m2.strokeStyle = '#8d8676'; m2.lineWidth = 3; m2.beginPath(); m2.arc(mp(0), mp(0), 49 / (2 * HALF) * 512, -Math.PI / 2 + 0.33, Math.PI * 1.5 - 0.33); m2.stroke();
  m2.fillStyle = '#6b4a34'; for (const [x, z] of houses) m2.fillRect(mp(x) - 3, mp(z) - 3, 6, 6);
  m2.fillStyle = '#7a8a94'; for (const [x, z] of towers) { m2.beginPath(); m2.arc(mp(x), mp(z), 2.6, 0, 7); m2.fill(); }
  world.minimapBase = mm; world.mapScale = 512 / (2 * HALF); world.HALF = HALF;
  // 조정 손잡이 모음(콘솔·시험용): __GAME__.game 쪽에서 world 를 내보내지 않아도 engine.scene 과 함께 볼 수 있게 world 에 달아 둔다
  world.tune = { world: WORLD_TUNE, ground: GROUND_TUNE, layers: LAYER_TUNE, foliage: FOLIAGE_TUNE, ambience: AMBIENCE_TUNE };
  world.parts = { ground, foliage, ambience: amb, scatter: sc };
  return world;
}
