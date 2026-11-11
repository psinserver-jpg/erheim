// 월드: 지형(텍스처 섞기), 마을(성벽·건물·소품), 사냥터(숲·묘지), 보스 제단, 충돌, 지역, 미니맵 밑그림
import * as THREE from 'three';
import { Assets } from '../core/assets.js';

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

export async function createWorld(engine) {
  const scene = engine.scene;
  const world = { colliders: [], lights: [], torches: [], update: null };
  const addCol = (x, z, r) => world.colliders.push({ x, z, r });

  // ---------- 지형: 섞기 지도(R=흙길, G=돌바닥, B=그을음, 나머지=풀) ----------
  const SP = 1024;
  const cv = document.createElement('canvas'); cv.width = cv.height = SP;
  const g = cv.getContext('2d');
  const px = (x) => (x + HALF) / (2 * HALF) * SP, pz = (z) => (z + HALF) / (2 * HALF) * SP, ps = (r) => r / (2 * HALF) * SP;
  g.fillStyle = '#000'; g.fillRect(0, 0, SP, SP);
  g.globalCompositeOperation = 'lighter';
  const blob = (x, z, r, col, soft = 0.35) => {
    const gr = g.createRadialGradient(px(x), pz(z), ps(r) * (1 - soft), px(x), pz(z), ps(r));
    gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(px(x), pz(z), ps(r), 0, 7); g.fill();
  };
  const road = (pts, w, col) => {
    g.strokeStyle = col; g.lineWidth = ps(w); g.lineCap = 'round'; g.lineJoin = 'round'; g.filter = 'blur(2px)';
    g.beginPath(); pts.forEach(([x, z], i) => i ? g.lineTo(px(x), pz(z)) : g.moveTo(px(x), pz(z))); g.stroke(); g.filter = 'none';
  };
  road([[0, -40], [0, -70], [6, -100], [0, -128], [-4, -170], [0, -205], [0, -232]], 7, '#d00000');
  road([[0, -128], [-40, -138], [-80, -146], [-108, -150]], 5.5, '#c00000');
  road([[0, -128], [22, -140], [34, -150]], 4.5, '#b00000');
  road([[0, 40], [0, 90]], 6, '#c00000'); road([[-46, 0], [-100, 6]], 5, '#b00000'); road([[46, 0], [110, -6]], 5, '#b00000');
  for (let i = 0; i < 26; i++) blob(rr(-40, 40), rr(-180, -90), rr(3, 7), 'rgba(110,0,0,1)', 0.8);
  blob(-110, -150, 44, 'rgba(170,0,0,1)', 0.5); blob(34, -150, 13, 'rgba(200,0,0,1)', 0.6);
  g.globalCompositeOperation = 'source-over';
  blob(0, 0, 49, 'rgba(0,255,0,1)', 0.06);
  g.globalCompositeOperation = 'lighter';
  blob(0, -262, 58, 'rgba(0,0,255,1)', 0.5);
  g.globalCompositeOperation = 'source-over';
  world.splatCanvas = cv;
  const splat = new THREE.CanvasTexture(cv); splat.colorSpace = THREE.NoColorSpace; splat.flipY = false;

  const T = {};
  for (const n of ['grass', 'dirt', 'cobble', 'scorched', 'stonewall']) T[n] = await Assets.texture('tex/' + n + '.jpg', { repeat: true });
  const groundMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, metalness: 0, map: T.grass });
  groundMat.onBeforeCompile = (sh) => {
    sh.uniforms.tDirt = { value: T.dirt }; sh.uniforms.tCobble = { value: T.cobble }; sh.uniforms.tScorch = { value: T.scorched }; sh.uniforms.tSplat = { value: splat };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvWp=(modelMatrix*vec4(position,1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vWp; uniform sampler2D tDirt,tCobble,tScorch,tSplat;
      float hsh(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float vnoise(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(hsh(i),hsh(i+vec2(1,0)),f.x),mix(hsh(i+vec2(0,1)),hsh(i+vec2(1,1)),f.x),f.y); }`)
      .replace('#include <map_fragment>', `
      vec2 wuv=vWp.xz; vec4 sp=texture2D(tSplat,(wuv+${HALF.toFixed(1)})/${(2 * HALF).toFixed(1)});
      float n1=vnoise(wuv*0.07), n2=vnoise(wuv*0.9);
      vec3 cg=texture2D(map,wuv*0.3).rgb*mix(0.74,1.1,n1); cg=mix(cg,texture2D(map,wuv*0.083+3.7).rgb,0.35);
      vec3 cd=texture2D(tDirt,wuv*0.26).rgb; vec3 cc=texture2D(tCobble,wuv*0.42).rgb*1.05; vec3 cs=texture2D(tScorch,wuv*0.12).rgb;
      float wd=smoothstep(0.25,0.7,sp.r+(n2-0.5)*0.35), wc=smoothstep(0.35,0.6,sp.g+(n2-0.5)*0.2), wsc=smoothstep(0.2,0.75,sp.b+(n2-0.5)*0.3);
      vec3 col=mix(cg,cd,wd); col=mix(col,cc,wc); col=mix(col,cs,wsc);
      diffuseColor.rgb*=col; float glow=wsc*smoothstep(0.55,0.9,cs.r-cs.b*1.2);`)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance+=vec3(1.0,0.35,0.05)*glow*0.25;');
  };
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(2 * HALF, 2 * HALF, 1, 1), groundMat);
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  world.ground = ground;

  // ---------- 소품 불러오기 ----------
  const names = ['gatehouse', 'house', 'tavern', 'forge', 'market_stall', 'fountain', 'oak_tree', 'pine_tree', 'dead_tree', 'rocks', 'gravestones', 'crates', 'lamp_post', 'campfire'];
  const M = {};
  for (const n of names) {
    const key = 'env/' + n + '.glb';
    if (!Assets.has(key)) continue;
    const gl = await Assets.gltf(key); let mesh = null;
    gl.scene.traverse(o => { if (o.isMesh && !mesh) mesh = o; });
    mesh.material.envMapIntensity = 0.35; mesh.material.roughness = 0.9; mesh.material.metalness = 0;
    M[n] = mesh;
  }
  const place = (n, x, z, size, yaw = 0, { col = 0, cast = true, yoff = 0 } = {}) => {
    if (!M[n]) return null;
    const m = new THREE.Mesh(M[n].geometry, M[n].material);
    m.scale.setScalar(size); m.position.set(x, yoff, z); m.rotation.y = yaw; m.castShadow = cast; m.receiveShadow = true;
    scene.add(m); if (col) addCol(x, z, col); return m;
  };
  const instanced = (n, list) => {       // list: [x, z, size, yaw]
    if (!M[n] || !list.length) return;
    const im = new THREE.InstancedMesh(M[n].geometry, M[n].material, list.length);
    const d = new THREE.Object3D();
    list.forEach(([x, z, s, yaw], i) => { d.position.set(x, 0, z); d.scale.set(s, s * rr(0.9, 1.12), s); d.rotation.set(0, yaw, 0); d.updateMatrix(); im.setMatrixAt(i, d.matrix); });
    im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; scene.add(im);
  };

  // ---------- 마을 ----------
  place('fountain', 0, 0, 6.2, 0, { col: 3.3 });
  place('gatehouse', 0, -47, 30, 0);
  addCol(-8.5, -47, 5.2); addCol(8.5, -47, 5.2); addCol(-13, -47, 3); addCol(13, -47, 3);
  place('tavern', -25, 9, 15, Math.PI * 0.5, { col: 7.2 });
  place('forge', 24, -8, 11, -Math.PI * 0.5, { col: 5.0 });
  const houses = [[-27, -22, 11, 0.6], [26, 17, 11.5, -2.2], [-12, 30, 10.5, 3.3], [13, 31, 11, 2.9], [34, -24, 10.5, -1.0], [-36, -6, 10, 1.4], [37, 2, 10.5, -1.6], [-30, 27, 10.8, 2.3], [0, 38, 11.5, 3.14], [-17, -33, 10, 0.2], [17, -33, 10.2, -0.3]];
  for (const [x, z, s, yaw] of houses) place('house', x, z, s, yaw, { col: s * 0.36 });
  place('market_stall', -15, -13, 4.6, 0.5, { col: 2.2 }); place('market_stall', -9, -19, 4.4, 0.1, { col: 2.2 }); place('market_stall', 10, 14, 4.6, 2.6, { col: 2.2 }); place('market_stall', 15, 9, 4.4, 2.1, { col: 2.2 });
  for (const [x, z, yaw] of [[-18, -9, 0.4], [-5, -21, 1.2], [12, 18, 2], [19, -1, 0.3], [28, -3, 1.0], [-21, 2, 2.2], [6, 26, 0.7], [-6, 25, 1.5]]) place('crates', x, z, 2.3, yaw, { col: 1.2 });
  const lamps = [[-7, -7], [7, -7], [-7, 7], [7, 7], [0, -26], [-5, -38], [5, -38], [-20, 0], [20, 0], [0, 22], [16, -12], [-14, 16]];
  for (const [x, z] of lamps) {
    place('lamp_post', x, z, 3.4, rr(0, 6), { col: 0.3 });
    world.torches.push(new THREE.Vector3(x, 2.85, z));
  }
  // 성벽(원형) — 북쪽 문 자리만 비움
  const wallMat = new THREE.MeshStandardMaterial({ map: T.stonewall, roughness: 0.92, color: 0xb9b2a4 });
  T.stonewall.repeat.set(3, 1.2);
  const R = 49, SEG = 44; const wallGeo = new THREE.BoxGeometry(2 * Math.PI * R / SEG + 0.5, 7.5, 2.4);
  const crenGeo = new THREE.BoxGeometry(1.5, 1.2, 2.6);
  const walls = [], crens = [], towers = [];
  for (let i = 0; i < SEG; i++) {
    const a = (i + 0.5) / SEG * Math.PI * 2; const x = Math.sin(a) * R, z = -Math.cos(a) * R;
    if (Math.abs(x) < 16 && z < 0) continue;
    walls.push([x, z, -a]); addCol(x, z, 3.6);
    for (let k = -1; k <= 1; k++) crens.push([x + Math.cos(a) * k * 2.3, z + Math.sin(a) * k * 2.3, -a]);
    if (i % 6 === 2) towers.push([Math.sin(a) * (R + 0.6), -Math.cos(a) * (R + 0.6)]);
  }
  const wim = new THREE.InstancedMesh(wallGeo, wallMat, walls.length), cim = new THREE.InstancedMesh(crenGeo, wallMat, crens.length);
  const d = new THREE.Object3D();
  walls.forEach(([x, z, yaw], i) => { d.position.set(x, 3.75, z); d.rotation.set(0, yaw, 0); d.scale.set(1, 1, 1); d.updateMatrix(); wim.setMatrixAt(i, d.matrix); });
  crens.forEach(([x, z, yaw], i) => { d.position.set(x, 8.0, z); d.rotation.set(0, yaw, 0); d.updateMatrix(); cim.setMatrixAt(i, d.matrix); });
  for (const im of [wim, cim]) { im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; scene.add(im); }
  const towerMat = wallMat.clone(); const roofMat = new THREE.MeshStandardMaterial({ color: 0x33466e, roughness: 0.7 });
  for (const [x, z] of towers) {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(3.3, 3.7, 11, 14), towerMat); t.position.set(x, 5.5, z); t.castShadow = true; scene.add(t);
    const rf = new THREE.Mesh(new THREE.ConeGeometry(4.1, 5, 14), roofMat); rf.position.set(x, 13.5, z); rf.castShadow = true; scene.add(rf); addCol(x, z, 3.8);
  }
  // 문파 깃발(광장)
  const flagCols = [0x1f3f9a, 0x8e1620, 0xa89f84, 0x3c4048, 0x4a2190, 0x175028];
  world.flags = [];
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2 + 0.5; const x = Math.sin(a) * 12.5, z = Math.cos(a) * 12.5;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 7, 6), new THREE.MeshStandardMaterial({ color: 0x4a3a28 })); pole.position.set(x, 3.5, z); pole.castShadow = true; scene.add(pole);
    const fg = new THREE.PlaneGeometry(1.1, 2.4, 6, 10); fg.translate(0.6, 0.4, 0);
    const fl = new THREE.Mesh(fg, new THREE.MeshStandardMaterial({ color: flagCols[i], side: THREE.DoubleSide, roughness: 0.8 })); fl.position.set(x, 5.2, z); fl.rotation.y = a; fl.castShadow = true; scene.add(fl);
    world.flags.push(fl);
  }

  // ---------- 숲 ----------
  const inTown = (x, z) => Math.hypot(x, z) < 56;
  const nearRoad = (x, z) => (Math.abs(x) < 6 && z < -40 && z > -235) || (z > -156 && z < -122 && x < 0 && x > -112 && Math.abs(z + 128 + (x / -108) * 22) < 6);
  const oaks = [], pines = [], rocks = [], deads = [];
  for (let i = 0; i < 520; i++) {
    const x = rr(-250, 250), z = rr(-330, 150);
    if (inTown(x, z) || nearRoad(x, z)) continue;
    const dAltar = Math.hypot(x, z + 262), dGrave = Math.hypot(x + 112, z + 150), dForest = Math.hypot(x, z + 128), dCamp = Math.hypot(x - 34, z + 150);
    if (dAltar < 44 || dCamp < 11) continue;
    if (dGrave < 46) { if (rnd() < 0.2) { deads.push([x, z, rr(6, 9), rr(0, 6)]); addCol(x, z, 0.7); } continue; }
    const dens = dForest < 62 ? 0.3 : 0.75;      // 사냥터 안은 듬성듬성(전투 공간)
    if (rnd() > dens) continue;
    if (dAltar < 80) { if (rnd() < 0.5) { deads.push([x, z, rr(6, 10), rr(0, 6)]); addCol(x, z, 0.7); } continue; }
    if (rnd() < 0.55) { pines.push([x, z, rr(6, 9), rr(0, 6)]); addCol(x, z, 0.6); } else { oaks.push([x, z, rr(6.5, 9.5), rr(0, 6)]); addCol(x, z, 0.8); }
  }
  for (let i = 0; i < 90; i++) { const x = rr(-230, 230), z = rr(-320, 140); if (inTown(x, z) || nearRoad(x, z)) continue; const s = rr(1.4, 4.2); rocks.push([x, z, s, rr(0, 6)]); if (s > 2.4) addCol(x, z, s * 0.42); }
  instanced('oak_tree', oaks); instanced('pine_tree', pines); instanced('rocks', rocks); instanced('dead_tree', deads);
  // 풀 포기(인스턴스 십자 판)
  {
    const gcv = document.createElement('canvas'); gcv.width = 128; gcv.height = 128; const c = gcv.getContext('2d');
    for (let i = 0; i < 26; i++) { const x = 10 + Math.random() * 108; const h = 50 + Math.random() * 70; c.strokeStyle = `hsl(${88 + Math.random() * 30},${45 + Math.random() * 20}%,${24 + Math.random() * 22}%)`; c.lineWidth = 3 + Math.random() * 3; c.beginPath(); c.moveTo(x, 128); c.quadraticCurveTo(x + (Math.random() - 0.5) * 30, 128 - h * 0.6, x + (Math.random() - 0.5) * 40, 128 - h); c.stroke(); }
    const gt = new THREE.CanvasTexture(gcv); gt.colorSpace = THREE.SRGBColorSpace;
    const pg = new THREE.PlaneGeometry(1, 1); pg.translate(0, 0.5, 0);
    const gm = new THREE.MeshStandardMaterial({ map: gt, color: 0x8a9a62, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 1 });
    const N = 5200; const im = new THREE.InstancedMesh(pg, gm, N); let k = 0;
    for (let i = 0; i < N * 3 && k < N; i++) {
      const x = rr(-150, 150), z = rr(-215, 110);
      if (inTown(x, z) || nearRoad(x, z) || Math.hypot(x + 112, z + 150) < 44) continue;
      d.position.set(x, 0, z); d.rotation.set(0, rr(0, 3.14), 0); const s = rr(0.3, 0.6); d.scale.set(s * 1.4, s, s); d.updateMatrix(); im.setMatrixAt(k++, d.matrix);
    }
    im.count = k; im.receiveShadow = true; im.frustumCulled = false; scene.add(im);
  }
  // 오크 야영지
  place('campfire', 34, -150, 3.2, 0, { col: 1.3 }); world.torches.push(new THREE.Vector3(34, 1.2, -150));
  for (const [x, z, yaw] of [[30, -156, 0.4], [39, -146, 2.0], [28, -146, 1.1]]) place('crates', x, z, 2.4, yaw, { col: 1.2 });
  // 묘지
  for (let i = 0; i < 46; i++) { const a = rr(0, 6.28), r = rr(5, 40); const x = -112 + Math.sin(a) * r, z = -150 + Math.cos(a) * r; place('gravestones', x, z, rr(2.6, 3.6), rr(0, 6), { col: 1.0 }); }

  // ---------- 보스 제단(직접 만든 지오메트리) ----------
  {
    const A = POI.altar; const stone = new THREE.MeshStandardMaterial({ color: 0x1b1a1e, roughness: 0.85 });
    const lava = new THREE.MeshStandardMaterial({ color: 0x220800, emissive: 0xff5a10, emissiveIntensity: 1.3, roughness: 0.6 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(24, 26, 0.7, 48), stone); base.position.set(A.x, 0.2, A.z); base.receiveShadow = true; scene.add(base);
    const ring = new THREE.Mesh(new THREE.RingGeometry(20.2, 21, 64), lava); ring.rotation.x = -Math.PI / 2; ring.position.set(A.x, 0.57, A.z); scene.add(ring);
    const ring2 = new THREE.Mesh(new THREE.RingGeometry(9.6, 10.1, 48), lava); ring2.rotation.x = -Math.PI / 2; ring2.position.set(A.x, 0.57, A.z); scene.add(ring2);
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; const ln = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 20.4), lava); ln.rotation.x = -Math.PI / 2; ln.rotation.z = a; ln.position.set(A.x, 0.575, A.z); scene.add(ln); }
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * Math.PI * 2 + 0.3; const camSide = Math.sin(a) > -0.2 && Math.cos(a) > -0.2; const h = camSide ? rr(2.5, 4) : rr(10, 18); const x = A.x + Math.sin(a) * 27.5, z = A.z + Math.cos(a) * 27.5;
      if (Math.abs(Math.sin(a) * 27.5) < 7 && Math.cos(a) > 0) continue;        // 남쪽 입구
      const sp = new THREE.Mesh(new THREE.ConeGeometry(rr(1.6, 2.6), h, 5), stone); sp.position.set(x, h / 2 - 0.3, z); sp.rotation.set(rr(-0.18, 0.18), rr(0, 6), rr(-0.18, 0.18)); sp.castShadow = true; scene.add(sp); addCol(x, z, 2.2);
      const vein = new THREE.Mesh(new THREE.ConeGeometry(0.5, h * 0.7, 4), lava); vein.position.set(x + Math.sin(a) * -1.2, h * 0.3, z + Math.cos(a) * -1.2); scene.add(vein);
    }
    const pl = new THREE.PointLight(0xff5a1a, 320, 80, 1.6); pl.position.set(A.x, 9, A.z); scene.add(pl); world.altarLight = pl;
    world.altarLava = lava;
  }

  // ---------- 횃불·가로등 불빛(가까운 몇 개만 실제 조명) ----------
  const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,220,150,1)'); gr.addColorStop(0.3, 'rgba(255,150,60,.55)'); gr.addColorStop(1, 'rgba(255,90,20,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const sm = new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
  for (const p of world.torches) { const s = new THREE.Sprite(sm); s.position.copy(p); s.scale.setScalar(1.9); scene.add(s); }
  const pool = []; for (let i = 0; i < 4; i++) { const l = new THREE.PointLight(0xffa860, 0, 22, 1.8); scene.add(l); pool.push(l); }
  world.setNight = (k) => { world.night = k; };
  world.night = 0.25;
  world.update = (dt, time, focus) => {
    const near = world.torches.map(p => [p.distanceToSquared(focus), p]).sort((a, b) => a[0] - b[0]);
    pool.forEach((l, i) => { const p = near[i]; if (p && p[0] < 1600) { l.position.copy(p[1]); l.intensity = (60 + Math.sin(time * 11 + i * 3) * 8) * (0.35 + world.night); } else l.intensity = 0; });
    world.flags.forEach((f, i) => { const pos = f.geometry.attributes.position; for (let k = 0; k < pos.count; k++) { const x = pos.getX(k); pos.setZ(k, Math.sin(x * 3.2 - time * 4.2 + i) * 0.16 * x); } pos.needsUpdate = true; });
    if (world.altarLava) world.altarLava.emissiveIntensity = 1.3 + Math.sin(time * 2.1) * 0.4;
  };

  // ---------- 충돌·지역 ----------
  world.resolve = (pos, radius = 0.5) => {
    for (let it = 0; it < 2; it++) for (const c of world.colliders) {
      const dx = pos.x - c.x, dz = pos.z - c.z; const rr2 = c.r + radius; const d2 = dx * dx + dz * dz;
      if (d2 < rr2 * rr2 && d2 > 1e-6) { const dd = Math.sqrt(d2); pos.x = c.x + dx / dd * rr2; pos.z = c.z + dz / dd * rr2; }
    }
    pos.x = Math.max(-HALF + 20, Math.min(HALF - 20, pos.x)); pos.z = Math.max(-HALF + 20, Math.min(HALF - 20, pos.z));
    return pos;
  };
  world.zoneAt = (x, z) => { for (const zn of ZONES) if (Math.hypot(x - zn.x, z - zn.z) < zn.r) return zn; return { id: 'wild', name: '에르하임 평원', sub: '', x: 0, z: 0, r: 0 }; };

  // ---------- 미니맵 밑그림 ----------
  const mm = document.createElement('canvas'); mm.width = mm.height = 512; const m2 = mm.getContext('2d');
  m2.fillStyle = '#3d5a2c'; m2.fillRect(0, 0, 512, 512);
  const id = g.getImageData(0, 0, SP, SP).data; const im = m2.getImageData(0, 0, 512, 512);
  for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
    const o = ((y * 2) * SP + x * 2) * 4; const r = id[o] / 255, gg = id[o + 1] / 255, b = id[o + 2] / 255; const q = (y * 512 + x) * 4;
    let cr = 58, cg = 88, cb = 44; const n = ((x * 7 + y * 13) % 9) - 4; cr += n; cg += n;
    cr += (150 - cr) * r * 0.8; cg += (120 - cg) * r * 0.8; cb += (80 - cb) * r * 0.8;
    cr += (150 - cr) * gg; cg += (146 - cg) * gg; cb += (136 - cb) * gg;
    cr += (60 - cr) * b; cg += (26 - cg) * b; cb += (20 - cb) * b;
    im.data[q] = cr; im.data[q + 1] = cg; im.data[q + 2] = cb; im.data[q + 3] = 255;
  }
  m2.putImageData(im, 0, 0);
  const mp = (v) => (v + HALF) / (2 * HALF) * 512;
  m2.fillStyle = 'rgba(20,40,16,.55)'; for (const [x, z] of [...oaks, ...pines]) { m2.beginPath(); m2.arc(mp(x), mp(z), 1.6, 0, 7); m2.fill(); }
  m2.strokeStyle = '#8d8676'; m2.lineWidth = 3; m2.beginPath(); m2.arc(mp(0), mp(0), 49 / (2 * HALF) * 512, -Math.PI / 2 + 0.33, Math.PI * 1.5 - 0.33); m2.stroke();
  m2.fillStyle = '#6b4a34'; for (const [x, z, s] of houses) m2.fillRect(mp(x) - 3, mp(z) - 3, 6, 6);
  world.minimapBase = mm; world.mapScale = 512 / (2 * HALF); world.HALF = HALF;
  return world;
}
