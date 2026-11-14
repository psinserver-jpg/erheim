// 구역 꾸미기 도구: 소품 원형 불러오기, 구역별로 쪼갠 인스턴싱(화면·그림자 밖은 그리지 않는다), 성벽·성탑, 덤불·말뚝·뼈 같은 절차적 소품, 바닥 데칼.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Assets } from '../core/assets.js';

// 시드 고정 난수(배치가 매번 같게)
export function makeRng(seed) { let s = seed >>> 0; const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; rnd.range = (a, b) => a + (b - a) * rnd(); rnd.pick = (arr) => arr[Math.floor(rnd() * arr.length) % arr.length]; return rnd; }

// ───────────────────────── 나뭇잎 재질: 바람 + 주인공을 가릴 때 성기게 ─────────────────────────
// uFade: xy = 주인공의 화면 좌표(픽셀), z = 주인공까지의 시선 깊이(m), w = 반지름(픽셀, 0 이면 끔)
export const leafUniforms = { uLeafFade: { value: new THREE.Vector4(960, 540, 20, 0) } };
export function patchLeaf(mat, engine, { sway = 1, fade = true, twoSidedNormal = false } = {}) {
  if (mat.userData.erhLeaf) return mat;
  mat.userData.erhLeaf = true;
  const W = engine.windUniforms;
  mat.customProgramCacheKey = () => `erh-leaf-${sway}-${fade ? 1 : 0}-${twoSidedNormal ? 1 : 0}`;
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uWindTime = W.uWindTime; sh.uniforms.uWindDir = W.uWindDir; sh.uniforms.uWindStrength = W.uWindStrength; sh.uniforms.uLeafFade = leafUniforms.uLeafFade;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uWindTime, uWindStrength; uniform vec2 uWindDir;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
      {
        #ifdef USE_INSTANCING
          vec3 erhO = instanceMatrix[ 3 ].xyz;
        #else
          vec3 erhO = modelMatrix[ 3 ].xyz;
        #endif
        float erhH = max( transformed.y, 0.0 );
        float erhPh = dot( erhO.xz, vec2( 0.31, 0.27 ) ) + uWindTime * 1.25;
        float erhSw = ( sin( erhPh ) * 0.6 + sin( erhPh * 2.17 + 1.3 ) * 0.4 ) * uWindStrength;
        float erhFl = sin( uWindTime * 5.3 + transformed.x * 2.9 + transformed.z * 3.7 + erhO.x ) * 0.5 + sin( uWindTime * 7.1 + transformed.y * 4.3 + erhO.z ) * 0.5;
        transformed.xz += uWindDir * ( erhSw * 0.016 * erhH + erhFl * 0.022 ) * ${sway.toFixed(2)};
        transformed.y += erhFl * 0.012 * ${sway.toFixed(2)};
      }`);
    let fs = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec4 uLeafFade;');
    if (fade) fs = fs.replace('#include <alphatest_fragment>', `#include <alphatest_fragment>
      if ( uLeafFade.w > 0.0 && vViewPosition.z < uLeafFade.z - 0.6 ) {
        // 주인공 앞을 가리는 잎은 화면 격자 무늬로 솎아 낸다(반투명 대신)
        float erhD = length( ( gl_FragCoord.xy - uLeafFade.xy ) * vec2( 1.0, 1.25 ) ) / uLeafFade.w;
        float erhK = smoothstep( 0.55, 1.0, erhD );
        float erhT = fract( 52.9829189 * fract( dot( gl_FragCoord.xy, vec2( 0.06711056, 0.00583715 ) ) ) );
        if ( erhK < 0.999 && erhT > erhK * 0.92 + 0.08 ) discard;
      }`);
    if (twoSidedNormal) fs = fs.replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\n normal = normalize( vNormal );');   // 양면 잎 카드: 뒷면도 같은 법선으로(뒤집히면 검게 나온다)
    sh.fragmentShader = fs;
  };
  mat.needsUpdate = true;
  return mat;
}

// ───────────────────────── 소품 원형 ─────────────────────────
/** env/<이름>.glb 를 { parts: [{ geometry, material }] } 로 불러온다(나무는 껍질·잎 2개) */
export async function loadProtos(names, engine) {
  const M = {};
  for (const n of names) {
    const key = 'env/' + n + '.glb';
    if (!Assets.has(key)) { console.warn('[world] 모델 없음:', key); continue; }
    const gl = await Assets.gltf(key); const parts = [];
    gl.scene.traverse(o => { if (o.isMesh) parts.push({ geometry: o.geometry, material: o.material, leaf: o.material.alphaTest > 0 }); });
    for (const p of parts) { if (p.leaf) patchLeaf(p.material, engine); if (!p.geometry.boundingSphere) p.geometry.computeBoundingSphere(); }
    M[n] = { name: n, parts };
  }
  return M;
}

/** 하나씩 놓는 소품(건물 등). opts: { yoff, cast, scaleY, tilt:[x,z] } */
export function placeProto(scene, proto, x, z, size = 1, yaw = 0, { yoff = 0, cast = true, receive = true } = {}) {
  if (!proto) return null;
  const g = new THREE.Group();
  for (const p of proto.parts) { const m = new THREE.Mesh(p.geometry, p.material); m.castShadow = cast; m.receiveShadow = receive; g.add(m); }
  g.scale.setScalar(size); g.position.set(x, yoff, z); g.rotation.y = yaw; scene.add(g);
  return g;
}

// ───────────────────────── 구역별 인스턴싱 ─────────────────────────
/**
 * add(name, x, z, { s, sy, yaw, y, tilt, tiltDir, lay, color, cast }) 로 모은 뒤 build() 하면
 * (원형 × 구역 칸)마다 InstancedMesh 를 만든다. 칸마다 경계 구가 따로라 화면 밖·그림자 상자 밖 칸은 그려지지 않는다.
 */
export function createScatter(scene, protos, { cell = 36 } = {}) {
  const buckets = new Map(); const made = [];
  const d = new THREE.Object3D(), q1 = new THREE.Quaternion(), q2 = new THREE.Quaternion(), ax = new THREE.Vector3(), col = new THREE.Color();
  const Y = new THREE.Vector3(0, 1, 0);
  return {
    count: 0,
    add(name, x, z, o = {}) {
      if (!protos[name]) return false;
      const key = name + '|' + Math.floor(x / cell) + '|' + Math.floor(z / cell) + '|' + (o.cast === false ? 0 : 1);
      let b = buckets.get(key); if (!b) { b = { name, cast: o.cast !== false, list: [] }; buckets.set(key, b); }
      b.list.push([x, z, o]); this.count++; return true;
    },
    build() {
      for (const b of buckets.values()) {
        const proto = protos[b.name], n = b.list.length; const hasCol = b.list.some(e => e[2].color);
        for (const part of proto.parts) {
          const im = new THREE.InstancedMesh(part.geometry, part.material, n);
          b.list.forEach(([x, z, o], i) => {
            const s = o.s ?? 1; d.position.set(x, o.y ?? 0, z); d.scale.set(s * (o.sx ?? 1), s * (o.sy ?? 1), s * (o.sz ?? 1));
            q1.setFromAxisAngle(Y, o.yaw ?? 0);
            if (o.lay) { ax.set(1, 0, 0); q2.setFromAxisAngle(ax, o.lay); q1.multiply(q2); }                              // 눕히기(쓰러진 나무)
            else if (o.tilt) { const a = o.tiltDir ?? 0; ax.set(Math.cos(a), 0, Math.sin(a)); q2.setFromAxisAngle(ax, o.tilt); q1.premultiply(q2); }   // 살짝 기울이기
            d.quaternion.copy(q1); d.updateMatrix(); im.setMatrixAt(i, d.matrix);
            if (hasCol) { const c = o.color || [1, 1, 1]; im.setColorAt(i, col.setRGB(c[0], c[1], c[2])); }
          });
          im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
          im.castShadow = b.cast && part.cast !== false; im.receiveShadow = true; im.computeBoundingSphere(); im.name = 'sc:' + b.name;
          scene.add(im); made.push(im);
        }
      }
      buckets.clear();
      return made;
    },
    meshes: made,
  };
}

// ───────────────────────── 성벽·성탑 ─────────────────────────
function pbr(T, name, extra = {}) {
  return new THREE.MeshStandardMaterial({ map: T[name + '_c'], normalMap: T[name + '_n'], roughnessMap: T[name + '_orm'], aoMap: T[name + '_orm'], roughness: 1, metalness: 0, ...extra });
}
export async function loadTex(names) {
  const T = {};
  for (const n of names) {
    T[n + '_c'] = await Assets.texture(`tex/${n}_c.jpg`, { repeat: true });
    T[n + '_n'] = await Assets.texture(`tex/${n}_n.jpg`, { srgb: false, repeat: true });
    T[n + '_orm'] = await Assets.texture(`tex/${n}_orm.jpg`, { srgb: false, repeat: true });
  }
  return T;
}

/**
 * 원형 성벽: 각도 a0~a1(북쪽 문 자리만 비움) 구간을 한 덩어리 메시로 만든다. UV 가 벽을 따라 이어져 돌 줄눈이 끊기지 않는다.
 * 단면: 안쪽·바깥쪽 밑동이 비스듬히 넓어지고(기단), 위에 순찰로와 흉벽, 그 위에 총안(톱니) 블록.
 */
export function buildCurtainWall(scene, T, { R = 49, a0 = 0.2856, a1 = Math.PI * 2 - 0.2856, tile = 3.0 } = {}) {
  const rng = makeRng(771);
  // 단면(중심선에서의 반지름 차, 높이). 안쪽(-) → 바깥쪽(+)
  const prof = [[-1.62, -0.3], [-1.22, 1.4], [-1.22, 6.3], [-1.42, 6.55], [-1.42, 6.8], [0.62, 6.8], [0.62, 7.7], [1.22, 7.7], [1.22, 6.5], [1.36, 6.25], [1.22, 6.0], [1.22, 1.4], [1.66, -0.3]];
  const steps = Math.ceil((a1 - a0) * R / 1.75);
  const pos = [], uv = [], colr = [], idx = [];
  const tint = []; for (let s = 0; s <= steps; s++) tint.push(0.86 + rng() * 0.2);
  let vlen = 0;
  for (let k = 0; k < prof.length - 1; k++) {
    const [r0, y0] = prof[k], [r1, y1] = prof[k + 1]; const len = Math.hypot(r1 - r0, y1 - y0); const base = pos.length / 3;
    for (let s = 0; s <= steps; s++) {
      const a = a0 + (a1 - a0) * s / steps, sn = Math.sin(a), cs = -Math.cos(a), u = a * R / tile;
      for (const [r, y, v] of [[r0, y0, vlen], [r1, y1, vlen + len]]) {
        pos.push(sn * (R + r), y, cs * (R + r)); uv.push(u, v / tile);
        // 밑동은 눅눅하고 어둡게(이끼빛), 위로 갈수록 밝게
        const h = Math.min(1, Math.max(0, y / 2.2)), t = tint[s] * (0.68 + 0.32 * h), top = y > 6.7 ? 1.05 : 1;
        colr.push(t * (0.92 + 0.08 * h) * top, t * top, t * (0.90 + 0.10 * h) * top);
      }
    }
    for (let s = 0; s < steps; s++) { const i = base + s * 2; idx.push(i, i + 1, i + 2, i + 1, i + 3, i + 2); }
    vlen += len;
  }
  // 양 끝 막음
  for (const [a, flip] of [[a0, false], [a1, true]]) {
    const sn = Math.sin(a), cs = -Math.cos(a), base = pos.length / 3; const cap = [[-1.62, -0.3], [-1.22, 1.4], [-1.22, 6.8], [1.22, 6.8], [1.22, 1.4], [1.66, -0.3]];
    for (const [r, y] of cap) { pos.push(sn * (R + r), y, cs * (R + r)); uv.push(r / tile, y / tile); colr.push(0.8, 0.8, 0.8); }
    for (let i = 1; i < cap.length - 1; i++) flip ? idx.push(base, base + i + 1, base + i) : idx.push(base, base + i, base + i + 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setAttribute('color', new THREE.Float32BufferAttribute(colr, 3));
  geo.setIndex(idx); geo.computeVertexNormals();
  // 면 방향 확인: 안쪽 면의 법선이 마을 쪽(중심)을 보지 않으면 뒤집는다
  { const p = geo.attributes.position, n = geo.attributes.normal; const dot = p.getX(1) * n.getX(1) + p.getZ(1) * n.getZ(1); if (dot > 0) { const ix = geo.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; } geo.computeVertexNormals(); } }
  const mat = pbr(T, 'castle_wall', { vertexColors: true, color: 0xd8d2c6 });
  const wall = new THREE.Mesh(geo, mat); wall.castShadow = true; wall.receiveShadow = true; wall.name = 'curtainWall'; scene.add(wall);

  // 총안 블록(톱니)과 버팀벽: 같은 모양을 여러 번 — 인스턴싱. 구역별로 나눠 화면 밖은 그리지 않는다
  const merlon = boxUV(1.5, 1.0, 0.6, tile), butt = buttressGeo(tile);
  const mer = [], but = []; const d = new THREE.Object3D();
  const nM = Math.floor((a1 - a0) * R / 2.9);
  for (let i = 0; i < nM; i++) { const a = a0 + (a1 - a0) * (i + 0.5) / nM; mer.push([Math.sin(a) * (R + 0.92), 8.2, -Math.cos(a) * (R + 0.92), -a]); }
  const nB = Math.floor((a1 - a0) * R / 13.5);
  for (let i = 0; i < nB; i++) { const a = a0 + (a1 - a0) * (i + 0.5) / nB; but.push([Math.sin(a) * (R - 1.2), 0, -Math.cos(a) * (R - 1.2), -a + Math.PI, 1]); but.push([Math.sin(a) * (R + 1.2), 0, -Math.cos(a) * (R + 1.2), -a, 1]); }
  const groups = (list, geo2, sectors = 8) => {
    const by = new Map();
    for (const e of list) { const k = Math.floor((Math.atan2(e[0], -e[2]) + Math.PI) / (Math.PI * 2) * sectors) % sectors; (by.get(k) || by.set(k, []).get(k)).push(e); }
    for (const l of by.values()) {
      const im = new THREE.InstancedMesh(geo2, mat, l.length);
      l.forEach(([x, y, z, yaw], i) => { d.position.set(x, y, z); d.rotation.set(0, yaw, 0); d.scale.set(1, 1, 1); d.updateMatrix(); im.setMatrixAt(i, d.matrix); });
      im.castShadow = true; im.receiveShadow = true; im.computeBoundingSphere(); scene.add(im);
    }
  };
  groups(mer, merlon); groups(but, butt);
  return { wall, material: mat };
}

/** 면 크기에 맞춰 UV 를 실제 축척으로 편 상자 */
export function boxUV(w, h, dd, tile = 3.0, colorTop = 1, colorBot = 1) {
  const g = new THREE.BoxGeometry(w, h, dd); const uv = g.attributes.uv; const dims = [[dd, h], [dd, h], [w, dd], [w, dd], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.setXY(k, uv.getX(k) * dims[f][0] / tile + f * 0.173, uv.getY(k) * dims[f][1] / tile + f * 0.119); }
  const c = new Float32Array(uv.count * 3); const p = g.attributes.position;
  for (let i = 0; i < uv.count; i++) { const t = p.getY(i) > 0 ? colorTop : colorBot; c[i * 3] = c[i * 3 + 1] = c[i * 3 + 2] = t; }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return g;
}
// 버팀벽: 아래가 넓고 위로 갈수록 벽에 붙는 쐐기(원점 = 벽면 바닥, +Z 가 벽에서 튀어나오는 쪽 반대 → yaw 로 돌려 쓴다)
function buttressGeo(tile) {
  const w = 1.5, h = 5.6, d0 = 1.5, d1 = 0.35, hw = w / 2;
  // 벽면은 z=0, 튀어나오는 쪽은 -z (안쪽 면에 놓을 때 yaw=-a 면 -z 가 마을 쪽)
  const P = [[-hw, -0.3, 0], [hw, -0.3, 0], [hw, -0.3, -d0], [-hw, -0.3, -d0], [-hw, h, 0], [hw, h, 0], [hw, h - 1.6, -d1], [-hw, h - 1.6, -d1], [hw, 1.2, -d0], [-hw, 1.2, -d0]];
  const pos = [], uv = [], col = []; const quad = (a, b, c, d2, su, sv) => { for (const i of [a, b, c, a, c, d2]) { pos.push(...P[i]); } uv.push(0, 0, su, 0, su, sv, 0, 0, su, sv, 0, sv); };
  quad(3, 2, 8, 9, w / tile, 1.5 / tile);            // 앞면 아래
  quad(9, 8, 6, 7, w / tile, 3.2 / tile);            // 앞면 비탈
  quad(7, 6, 5, 4, w / tile, 1.7 / tile);            // 윗비탈
  // 옆면(삼각 부채)
  const side = (ids, flip) => { for (let i = 1; i < ids.length - 1; i++) { const t = flip ? [ids[0], ids[i + 1], ids[i]] : [ids[0], ids[i], ids[i + 1]]; for (const k of t) { pos.push(...P[k]); uv.push(-P[k][2] / tile, P[k][1] / tile); } } };
  side([1, 5, 6, 8, 2], false); side([0, 3, 9, 7, 4], false);
  for (let i = 0; i < pos.length / 3; i++) { const y = pos[i * 3 + 1], t = 0.7 + 0.3 * Math.min(1, Math.max(0, y / 2.2)); col.push(t * 0.95, t, t * 0.93); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  // 면이 바깥(-z·옆)을 보게: 앞면 법선의 z 가 양수면 전부 뒤집는다
  if (g.attributes.normal.getZ(0) > 0) { const p = g.attributes.position.array, u = g.attributes.uv.array, c = g.attributes.color.array; for (let i = 0; i < p.length / 9; i++) { for (let k = 0; k < 3; k++) { const a = i * 9 + 3 + k, b = i * 9 + 6 + k; const t = p[a]; p[a] = p[b]; p[b] = t; const ca = c[a], cb = c[b]; c[a] = cb; c[b] = ca; } for (let k = 0; k < 2; k++) { const a = i * 6 + 2 + k, b = i * 6 + 4 + k; const t = u[a]; u[a] = u[b]; u[b] = t; } } g.computeVertexNormals(); }
  return g;
}

/** 성탑: 돌 몸통(밑동이 넓다) + 내쌓기 머리 + 점판암 고깔지붕 + 불 켜진 창 */
export function buildTowers(scene, T, list, wallMat) {
  const tile = 3.0;
  const prof = [[4.05, -0.3], [3.72, 1.6], [3.5, 9.4], [3.95, 10.1], [3.95, 11.6], [3.5, 11.6]].map(([r, y]) => new THREE.Vector2(r, y));
  const body = new THREE.LatheGeometry(prof, 20);
  { const uv = body.attributes.uv, p = body.attributes.position; const c = new Float32Array(uv.count * 3);
    for (let i = 0; i < uv.count; i++) { const y = p.getY(i); uv.setXY(i, uv.getX(i) * (2 * Math.PI * 3.6 / tile), y / tile); const t = 0.66 + 0.34 * Math.min(1, Math.max(0, y / 2.4)); c[i * 3] = t * 0.95; c[i * 3 + 1] = t; c[i * 3 + 2] = t * 0.93; }
    body.setAttribute('color', new THREE.BufferAttribute(c, 3)); }
  const roofG = new THREE.ConeGeometry(4.55, 5.6, 20, 1, true);
  { const uv = roofG.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 9, uv.getY(i) * 2.2); }
  const roofMat = pbr(T, 'roof_tile', { color: 0x9aa4b8, side: THREE.DoubleSide });
  const finG = new THREE.ConeGeometry(0.16, 1.5, 6); const finMat = new THREE.MeshStandardMaterial({ color: 0x3a3630, roughness: 0.5, metalness: 0.8 });
  const winG = new THREE.PlaneGeometry(0.42, 1.0); const winMat = new THREE.MeshStandardMaterial({ color: 0x1a120a, emissive: 0xffa550, emissiveIntensity: 1.6, roughness: 0.6 });
  const slitMat = new THREE.MeshStandardMaterial({ color: 0x0a0908, roughness: 1 });
  const out = [];
  for (const [x, z] of list) {
    const g = new THREE.Group(); g.position.set(x, 0, z);
    const b = new THREE.Mesh(body, wallMat); b.castShadow = true; b.receiveShadow = true; g.add(b);
    const rf = new THREE.Mesh(roofG, roofMat); rf.position.y = 14.3; rf.castShadow = true; g.add(rf);
    const fn = new THREE.Mesh(finG, finMat); fn.position.y = 17.6; g.add(fn);
    // 마을 쪽을 보는 창 하나, 옆으로 화살 구멍 둘
    const inward = Math.atan2(-x, -z);
    for (const [da, y, m, s] of [[0, 7.6, winMat, 1], [0.9, 5.2, slitMat, 0.6], [-0.9, 5.2, slitMat, 0.6]]) {
      const a = inward + da, rr = 3.72 - 0.22 * (y - 1.6) / 7.8 + 0.035; const w = new THREE.Mesh(winG, m); w.position.set(Math.sin(a) * rr, y, Math.cos(a) * rr); w.rotation.y = a; w.scale.set(s, 1, 1); g.add(w);
    }
    scene.add(g); out.push(g);
  }
  return { towers: out, windowMat: winMat };
}

/** 담쟁이·이끼 카드(성벽 안쪽 면에 붙인다). list: [각도 a, 높이 y, 크기, 칸(0 오르는 담쟁이 1 늘어진 덩굴)] */
export async function buildIvy(scene, engine, list, { R = 49, inner = -1.24 } = {}) {
  const tex = await Assets.texture('tex/ivy_moss.png');
  const pos = [], uv = [], nrm = [], idx = [];
  for (const [a, y, s, cell] of list) {
    const sn = Math.sin(a), cs = -Math.cos(a), r = R + inner - 0.06, tx = Math.cos(a), tz = Math.sin(a);   // 접선
    const cx = sn * r, cz = cs * r, w = s * 0.8, h = s, y0 = cell === 1 ? y - h : y, base = pos.length / 3;
    const u0 = (cell % 2) * 0.5, v1 = 1 - Math.floor(cell / 2) * 0.5, u1 = u0 + 0.5, v0 = v1 - 0.5;
    pos.push(cx - tx * w / 2, y0, cz - tz * w / 2, cx + tx * w / 2, y0, cz + tz * w / 2, cx + tx * w / 2, y0 + h, cz + tz * w / 2, cx - tx * w / 2, y0 + h, cz - tz * w / 2);
    uv.push(u0, v0, u1, v0, u1, v1, u0, v1); for (let i = 0; i < 4; i++) nrm.push(-sn, 0.15, -cs); idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3)); g.setIndex(idx);
  const mat = new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.42, side: THREE.DoubleSide, roughness: 0.85, color: 0xb8c0a8 });
  patchLeaf(mat, engine, { sway: 0.35, fade: false, twoSidedNormal: true });
  const m = new THREE.Mesh(g, mat); m.receiveShadow = true; m.name = 'ivy'; scene.add(m);
  return m;
}

// ───────────────────────── 절차적 소품 원형(덤불·마른 덤불·말뚝·뼈) ─────────────────────────
function cardQuad(out, c, right, up, w, h, cell, cols, rows, nrmFn, shade = [1, 1]) {
  const base = out.pos.length / 3; const u0 = (cell % cols) / cols, v1 = 1 - Math.floor(cell / cols) / rows, u1 = u0 + 1 / cols, v0 = v1 - 1 / rows;
  const P = [[-0.5, 0], [0.5, 0], [0.5, 1], [-0.5, 1]].map(([a, b]) => [c[0] + right[0] * a * w + up[0] * b * h, c[1] + right[1] * a * w + up[1] * b * h, c[2] + right[2] * a * w + up[2] * b * h]);
  const UV = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
  P.forEach((p, i) => { out.pos.push(...p); out.uv.push(...UV[i]); const n = nrmFn(p); out.nrm.push(...n); const s = i < 2 ? shade[0] : shade[1]; out.col.push(s, s, s); });
  out.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
}
function cardsGeo(out) {
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(out.pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(out.uv, 2));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(out.nrm, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(out.col, 3)); g.setIndex(out.idx); g.computeBoundingSphere(); return g;
}
const norm3 = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };

/** 덤불 원형 3종(bush_a·bush_b: 잎 뭉치 카드 돔, shrub_dead: 마른 가지 십자 카드, twigs: 바닥의 나뭇가지 더미) */
export async function makeFoliageProtos(engine) {
  const leafTex = await Assets.texture('tex/leaf_cluster_oak.png'), deadTex = await Assets.texture('tex/dead_branch.png');
  const leafMat = new THREE.MeshStandardMaterial({ map: leafTex, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.8, vertexColors: true, color: 0xb9c2a6 });
  patchLeaf(leafMat, engine, { sway: 0.9, fade: false, twoSidedNormal: true });
  const deadMat = new THREE.MeshStandardMaterial({ map: deadTex, alphaTest: 0.38, side: THREE.DoubleSide, roughness: 0.9, vertexColors: true, color: 0xb4aa9a });
  patchLeaf(deadMat, engine, { sway: 0.25, fade: false, twoSidedNormal: true });
  const P = {};
  for (const [name, seed, n, rad] of [['bush_a', 11, 11, 0.62], ['bush_b', 29, 8, 0.48]]) {
    const rng = makeRng(seed), out = { pos: [], uv: [], nrm: [], col: [], idx: [] };
    for (let i = 0; i < n; i++) {
      // 돔 위의 점에 바깥·위를 보는 카드
      const th = rng() * Math.PI * 2, ph = 0.25 + rng() * 1.15; const dir = [Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th)];
      const c = [dir[0] * rad * 0.8, 0.28 + dir[1] * rad * 0.75, dir[2] * rad * 0.8]; const s = rng.range(0.85, 1.25) * rad * 1.9;
      const right = norm3([dir[2], 0, -dir[0] + 1e-4]), up = norm3([-dir[0] * dir[1] + rng.range(-0.2, 0.2), dir[0] * dir[0] + dir[2] * dir[2], -dir[2] * dir[1] + rng.range(-0.2, 0.2)]);
      const cc = [c[0] - up[0] * s * 0.5, c[1] - up[1] * s * 0.5, c[2] - up[2] * s * 0.5];
      cardQuad(out, cc, right, up, s, s, Math.floor(rng() * 4), 2, 2, (p) => norm3([p[0], (p[1] - 0.05) * 1.4 + 0.35, p[2]]), [0.62, 1.0]);
    }
    P[name] = { name, parts: [{ geometry: cardsGeo(out), material: leafMat, leaf: true }] };
  }
  {
    const out = { pos: [], uv: [], nrm: [], col: [], idx: [] };
    for (let k = 0; k < 3; k++) { const a = k * Math.PI / 3 + 0.3; cardQuad(out, [0, -0.04, 0], [Math.cos(a), 0, Math.sin(a)], [0, 1, 0], 1.0, 1.0, k, 2, 2, () => [0, 1, 0], [0.7, 1.0]); }
    P.shrub_dead = { name: 'shrub_dead', parts: [{ geometry: cardsGeo(out), material: deadMat, leaf: true, cast: false }] };
  }
  {
    const out = { pos: [], uv: [], nrm: [], col: [], idx: [] };
    // 바닥에 누운 나뭇가지 더미(칸 3: 가운데 기준, 가로로 긴 그림)
    cardQuad(out, [0, 0.05, 0.5], [1, 0, 0], [0, 0.08, -1], 1.0, 1.0, 3, 2, 2, () => [0, 1, 0], [1, 1]);
    P.twigs = { name: 'twigs', parts: [{ geometry: cardsGeo(out), material: deadMat, leaf: true, cast: false }] };
  }
  return P;
}

/** 오크 야영지용: 뾰족하게 깎은 말뚝 묶음(목책 조각)과 큰 짐승의 갈비뼈 */
export function makeCampProtos(T) {
  const P = {};
  const wood = new THREE.MeshStandardMaterial({ map: T.wood_planks_c, normalMap: T.wood_planks_n, roughnessMap: T.wood_planks_orm, roughness: 1, metalness: 0, color: 0x9a8670 });
  {
    const rng = makeRng(404), parts = [];
    for (let i = 0; i < 6; i++) {
      const h = rng.range(1.7, 2.5), r = rng.range(0.085, 0.12), x = -1.1 + i * 0.44 + rng.range(-0.05, 0.05), lean = rng.range(-0.09, 0.09), lz = rng.range(0.06, 0.22);
      const c = new THREE.CylinderGeometry(r * 0.92, r * 1.1, h, 6); c.translate(0, h / 2 - 0.25, 0);
      const tip = new THREE.ConeGeometry(r * 0.92, 0.42, 6); tip.translate(0, h - 0.25 + 0.21, 0);
      for (const g of [c, tip]) { g.rotateZ(lean); g.rotateX(lz); g.translate(x, 0, 0); const uv = g.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) * 0.35 + i * 0.13, uv.getY(k) * h * 0.5); parts.push(g); }
    }
    // 가로대(묶음 줄)
    const bar = new THREE.CylinderGeometry(0.05, 0.05, 2.5, 5); bar.rotateZ(Math.PI / 2); bar.translate(0, 1.05, 0.02); parts.push(bar);
    P.stakes = { name: 'stakes', parts: [{ geometry: mergeGeometries(parts), material: wood }] };
  }
  {
    const bone = new THREE.MeshStandardMaterial({ color: 0xb9ae94, roughness: 0.72, metalness: 0 });
    const parts = [];
    for (let i = 0; i < 6; i++) {
      const R = 0.95 - Math.abs(i - 2) * 0.1, t = new THREE.TorusGeometry(R, 0.055, 5, 12, Math.PI * 0.86);
      t.rotateZ(Math.PI * 0.07); t.rotateY(Math.PI / 2 + (i - 2.5) * 0.05); t.translate(-1.25 + i * 0.5, -0.12, 0); parts.push(t);
    }
    const spine = new THREE.CylinderGeometry(0.075, 0.06, 3.3, 6); spine.rotateZ(Math.PI / 2); spine.translate(0, 0.78, 0); parts.push(spine);
    const skull = new THREE.SphereGeometry(0.34, 8, 6); skull.scale(1.5, 0.8, 0.95); skull.translate(2.15, 0.22, 0.1); parts.push(skull);
    for (const s of [-1, 1]) { const horn = new THREE.ConeGeometry(0.09, 0.8, 5); horn.rotateX(s * 1.0); horn.rotateZ(-0.5); horn.translate(1.95, 0.42, s * 0.42); parts.push(horn); }
    P.ribcage = { name: 'ribcage', parts: [{ geometry: mergeGeometries(parts.map(g => g.index ? g.toNonIndexed() : g)), material: bone }] };
    // 낮은 돌담 조각(묘지 둘레)
    const wallMat = new THREE.MeshStandardMaterial({ map: T.castle_wall_c, normalMap: T.castle_wall_n, roughnessMap: T.castle_wall_orm, roughness: 1, metalness: 0, vertexColors: true, color: 0xa9aba6 });
    const seg = boxUV(3.2, 1.25, 0.62, 2.2, 1.0, 0.62); seg.translate(0, 0.5, 0);
    P.lowwall = { name: 'lowwall', parts: [{ geometry: seg, material: wallMat }] };
    const brok = boxUV(1.7, 0.7, 0.62, 2.2, 0.95, 0.6); brok.translate(0, 0.22, 0); brok.rotateZ(0.12);
    P.lowwall_b = { name: 'lowwall_b', parts: [{ geometry: brok, material: wallMat }] };
  }
  return P;
}

// ───────────────────────── 바닥 데칼(인스턴스) ─────────────────────────
/**
 * 아틀라스(2×2) 한 장으로 바닥에 눕힌 그림을 여러 개 찍는다. list: [x, z, 크기, yaw, 칸, 불투명도]
 * 조명·그림자·안개를 받는다(MeshStandardMaterial). 깊이는 쓰지 않는다.
 */
export async function buildDecals(scene, key, list, { y = 0.022, color = 0xffffff, roughness = 0.95, opacity = 1, order = 1 } = {}) {
  if (!list.length || !Assets.has(key)) return null;
  const tex = await Assets.texture(key);
  const g = new THREE.PlaneGeometry(1, 1); g.rotateX(-Math.PI / 2);
  const n = list.length, cell = new Float32Array(n * 3);
  const mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, depthWrite: false, roughness, metalness: 0, color, opacity, polygonOffset: true, polygonOffsetFactor: -2 * order, polygonOffsetUnits: -2 * order });
  mat.customProgramCacheKey = () => 'erh-decal';
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aCell; varying float vDecalA;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\n#ifdef USE_MAP\n vMapUv = ( vMapUv + aCell.xy ) * 0.5;\n#endif\n vDecalA = aCell.z;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vDecalA;')
      .replace('#include <map_fragment>', '#include <map_fragment>\n diffuseColor.a *= vDecalA;');
  };
  const im = new THREE.InstancedMesh(g, mat, n); const d = new THREE.Object3D();
  list.forEach(([x, z, s, yaw, c, a = 1], i) => { d.position.set(x, y + (i % 7) * 0.0012, z); d.rotation.set(0, yaw, 0); d.scale.set(s, 1, s); d.updateMatrix(); im.setMatrixAt(i, d.matrix); cell[i * 3] = c % 2; cell[i * 3 + 1] = 1 - Math.floor(c / 2); cell[i * 3 + 2] = a; });
  g.setAttribute('aCell', new THREE.InstancedBufferAttribute(cell, 3));
  im.receiveShadow = true; im.frustumCulled = false; im.renderOrder = order; im.name = 'decals:' + key; scene.add(im);
  return im;
}
