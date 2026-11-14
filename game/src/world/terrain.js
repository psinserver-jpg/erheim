// 지형: 섞기 지도(재질별 마스크 12장 → RGBA 텍스처 3장) + 지면 PBR 셰이더.
//  · 재질 9종(풀·숲 바닥·묘지 흙·흙길·진흙·재·화산암·돌바닥·판석)을 텍스처 배열 3장(색·노멀·ORM)에 담아
//    화소마다 마스크가 있는 재질만 읽는다(보통 1~2종). 위에 얹히는 재질은 높이(ORM.b)로 섞어 돌 틈부터 흙·풀이 차오른다.
//  · 반복 티를 줄이려고 재질마다 방향을 돌리고, 유기 재질은 큰 축척 밝기를 한 번 더 곱하고, 큰 얼룩(밝기·마른 풀빛)을 덧씌운다.
//  · 젖음(마스크 C.r): 어둡고 매끈하게, 낮은 곳에는 웅덩이. 화산암은 균열 일부가 달아오른다.
import * as THREE from 'three';
import { Assets } from '../core/assets.js';

// 재질 순서 = 아래에서 위로 쌓이는 순서(뒤의 것이 앞의 것을 덮는다)
export const LAYERS = ['grass_meadow', 'forest_floor', 'grave_soil', 'dirt_path', 'mud_camp', 'ash_ground', 'volcanic_rock', 'town_cobble', 'town_flagstone'];
// 마스크 이름 → (텍스처, 채널). grass 는 바탕이라 마스크가 없다
export const MASKS = {
  dirt: ['A', 0], cobble: ['A', 1], volcanic: ['A', 2], flag: ['A', 3],
  forest: ['B', 0], grave: ['B', 1], mud: ['B', 2], ash: ['B', 3],
  wet: ['C', 0], dry: ['C', 1], bare: ['C', 2], lush: ['C', 3],   // wet 젖음·웅덩이, dry 마른 풀빛, bare 풀 금지, lush 꽃·잡초가 많은 곳
};

// ───────────────────────── 조정 손잡이(재질별) ─────────────────────────
// tile: 타일 한 장의 실제 크기(m) / rot: 무늬 방향(도) / tint: 알베도 배율(저녁 조명에서 너무 어둡지 않게)
// lum: 알베도 평균 밝기(선형) — 큰 축척 변이를 곱할 때 기준 / anti: 큰 축척 밝기 변이 세기(0=끔) / nrm: 노멀 세기
// hMid·hc: 경계에서 높이가 섞임에 주는 영향(기준 높이·세기) / soft: 경계 부드러움 / brk: 경계를 잡음으로 흐트러뜨리는 양
// wet: 젖음에 반응하는 정도(0=늘 마름) / rough: 거칠기 배율
export const LAYER_TUNE = {
  grass_meadow:   { tile: 2.2, rot: 0,   tint: [1.26, 1.18, 1.10], lum: 0.066, anti: 0.9, nrm: 0.9, hMid: 0.5,  hc: 0.8, soft: 0.10, brk: 0.5, wet: 0.5, rough: 1.0 },
  forest_floor:   { tile: 3.0, rot: 23,  tint: [1.10, 1.12, 1.10], lum: 0.045, anti: 0.8, nrm: 1.0, hMid: 0.5,  hc: 0.9, soft: 0.12, brk: 0.7, wet: 0.6, rough: 1.0 },
  grave_soil:     { tile: 3.0, rot: -17, tint: [0.95, 0.98, 1.02], lum: 0.090, anti: 0.8, nrm: 1.0, hMid: 0.5,  hc: 0.9, soft: 0.12, brk: 0.7, wet: 0.5, rough: 1.0 },
  dirt_path:      { tile: 3.0, rot: 37,  tint: [0.86, 0.84, 0.82], lum: 0.105, anti: 0.7, nrm: 1.0, hMid: 0.5,  hc: 0.9, soft: 0.09, brk: 0.6, wet: 0.9, rough: 1.0 },
  mud_camp:       { tile: 3.0, rot: 11,  tint: [1.05, 1.02, 1.00], lum: 0.050, anti: 0.6, nrm: 1.1, hMid: 0.5,  hc: 0.9, soft: 0.10, brk: 0.6, wet: 1.0, rough: 1.0 },
  ash_ground:     { tile: 3.0, rot: -29, tint: [0.60, 0.57, 0.56], lum: 0.110, anti: 0.6, nrm: 1.0, hMid: 0.5,  hc: 0.9, soft: 0.14, brk: 0.8, wet: 0.2, rough: 1.0 },
  volcanic_rock:  { tile: 3.0, rot: 9,   tint: [1.50, 1.42, 1.44], lum: 0.040, anti: 0.0, nrm: 1.0, hMid: 0.30, hc: 1.1, soft: 0.10, brk: 0.5, wet: 0.2, rough: 0.92 },
  town_cobble:    { tile: 3.0, rot: 0,   tint: [1.62, 1.56, 1.50], lum: 0.083, anti: 0.0, nrm: 1.0, hMid: 0.30, hc: 1.3, soft: 0.07, brk: 0.4, wet: 1.0, rough: 1.0 },
  town_flagstone: { tile: 3.1, rot: 45,  tint: [0.96, 0.94, 0.90], lum: 0.145, anti: 0.0, nrm: 1.0, hMid: 0.30, hc: 1.5, soft: 0.09, brk: 1.1, wet: 1.0, rough: 1.0 },
};
// 전체 손잡이: wet(젖음 배율) · normal(노멀 세기 배율) · lava(균열 발광 세기) · macro(큰 얼룩 세기) · cavity(틈새 그늘을 직사광에도 곱하는 양)
export const GROUND_TUNE = { wet: 1.0, normal: 1.0, lava: 1.7, macro: 1.0, cavity: 0.45 };

// ───────────────────────── 마스크 그리기 ─────────────────────────
export function createMaskPainter(HALF, SP = 1024) {
  const cv = document.createElement('canvas'); cv.width = cv.height = SP;
  const g = cv.getContext('2d', { willReadFrequently: true });
  const px = (x) => (x + HALF) / (2 * HALF) * SP, ps = (r) => r / (2 * HALF) * SP;
  const gray = (v, a = 1) => { const c = Math.round(Math.max(0, Math.min(1, v)) * 255); return `rgba(${c},${c},${c},${a})`; };
  const data = {};
  const P = {
    SP, HALF, canvas: cv, data,
    /** 새 마스크를 검게 지우고 그리기 시작한다(더하기 합성) */
    begin() { g.globalCompositeOperation = 'source-over'; g.filter = 'none'; g.fillStyle = '#000'; g.fillRect(0, 0, SP, SP); g.globalCompositeOperation = 'lighter'; return P; },
    /** 둥근 얼룩: 가운데 v, 가장자리로 soft 비율만큼 흐려진다 */
    blob(x, z, r, v = 1, soft = 0.35) {
      const R = Math.max(ps(r), 0.75); const gr = g.createRadialGradient(px(x), px(z), R * (1 - soft), px(x), px(z), R);
      gr.addColorStop(0, gray(v)); gr.addColorStop(1, gray(v, 0)); g.fillStyle = gr; g.beginPath(); g.arc(px(x), px(z), R, 0, 7); g.fill(); return P;
    },
    /** 지우기(빼기): amount 만큼 어둡게 */
    cut(x, z, r, amount = 1, soft = 0.35) {
      g.globalCompositeOperation = 'source-over'; const R = Math.max(ps(r), 0.75);
      const gr = g.createRadialGradient(px(x), px(z), R * (1 - soft), px(x), px(z), R);
      gr.addColorStop(0, `rgba(0,0,0,${amount})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.beginPath(); g.arc(px(x), px(z), R, 0, 7); g.fill();
      g.globalCompositeOperation = 'lighter'; return P;
    },
    /** 길: pts=[[x,z]…], 폭 w(m), blur(m) 만큼 가장자리를 흐린다 */
    road(pts, w, v = 1, blur = 1.2) {
      g.strokeStyle = gray(v); g.lineWidth = ps(w); g.lineCap = 'round'; g.lineJoin = 'round'; g.filter = blur > 0 ? `blur(${Math.max(0.5, ps(blur)).toFixed(2)}px)` : 'none';
      g.beginPath(); pts.forEach(([x, z], i) => (i ? g.lineTo(px(x), px(z)) : g.moveTo(px(x), px(z)))); g.stroke(); g.filter = 'none'; return P;
    },
    /** 길 모양으로 지우기 */
    cutRoad(pts, w, amount = 1, blur = 1.2) {
      g.globalCompositeOperation = 'source-over'; g.strokeStyle = `rgba(0,0,0,${amount})`; g.lineWidth = ps(w); g.lineCap = 'round'; g.lineJoin = 'round'; g.filter = blur > 0 ? `blur(${Math.max(0.5, ps(blur)).toFixed(2)}px)` : 'none';
      g.beginPath(); pts.forEach(([x, z], i) => (i ? g.lineTo(px(x), px(z)) : g.moveTo(px(x), px(z)))); g.stroke(); g.filter = 'none'; g.globalCompositeOperation = 'lighter'; return P;
    },
    /** 고리(r0~r1) */
    ring(x, z, r0, r1, v = 1, blur = 1.0) {
      g.strokeStyle = gray(v); g.lineWidth = ps(r1 - r0); g.filter = blur > 0 ? `blur(${Math.max(0.5, ps(blur)).toFixed(2)}px)` : 'none';
      g.beginPath(); g.arc(px(x), px(z), ps((r0 + r1) / 2), 0, 7); g.stroke(); g.filter = 'none'; return P;
    },
    /** 꽉 찬 원(가장자리 blur m) */
    disc(x, z, r, v = 1, blur = 1.0) {
      g.fillStyle = gray(v); g.filter = blur > 0 ? `blur(${Math.max(0.5, ps(blur)).toFixed(2)}px)` : 'none'; g.beginPath(); g.arc(px(x), px(z), ps(r), 0, 7); g.fill(); g.filter = 'none'; return P;
    },
    /** 다 그린 마스크를 이름으로 저장한다 */
    end(name) {
      const id = g.getImageData(0, 0, SP, SP).data, out = new Uint8Array(SP * SP);
      for (let i = 0, k = 0; k < out.length; i += 4, k++) out[k] = id[i];
      data[name] = out; return out;
    },
    /** 마스크 값(0~1) 읽기 — 배치할 때 쓴다 */
    at(name, x, z) {
      const d = data[name]; if (!d) return 0;
      const u = Math.min(SP - 1, Math.max(0, Math.floor(px(x)))), v = Math.min(SP - 1, Math.max(0, Math.floor(px(z)))); return d[v * SP + u] / 255;
    },
  };
  return P;
}

function packMasks(P, which) {
  const { SP, data } = P; const out = new Uint8Array(SP * SP * 4);
  for (const name in MASKS) {
    const [tex, ch] = MASKS[name]; if (tex !== which) continue;
    const d = data[name]; if (!d) continue;
    for (let k = 0, i = ch; k < d.length; k++, i += 4) out[i] = d[k];
  }
  const t = new THREE.DataTexture(out, SP, SP, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.colorSpace = THREE.NoColorSpace; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.needsUpdate = true;
  return t;
}

async function texArray(keys, size, srgb) {
  const n = keys.length, data = new Uint8Array(size * size * 4 * n);
  const cv = document.createElement('canvas'); cv.width = cv.height = size; const g = cv.getContext('2d', { willReadFrequently: true });
  for (let i = 0; i < n; i++) {
    const img = await Assets.image(keys[i]); g.drawImage(img, 0, 0, size, size);
    data.set(g.getImageData(0, 0, size, size).data, i * size * size * 4);
  }
  const t = new THREE.DataArrayTexture(data, size, size, n);
  t.format = THREE.RGBAFormat; t.type = THREE.UnsignedByteType; t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.generateMipmaps = true; t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

const f = (v) => { const s = Number(v).toFixed(4); return s.includes('.') ? s : s + '.0'; };

/**
 * 지면을 만든다. painter 에 MASKS 의 마스크가 모두 그려져 있어야 한다.
 * 돌려주는 것: { mesh, material, maskTex{A,B,C}, uniforms, tune }
 */
export async function createGround(engine, painter) {
  const HALF = painter.HALF;
  const [alb, nrm, orm, lava] = await Promise.all([
    texArray(LAYERS.map(n => `tex/${n}_c.jpg`), 1024, true),
    texArray(LAYERS.map(n => `tex/${n}_n.jpg`), 1024, false),
    texArray(LAYERS.map(n => `tex/${n}_orm.jpg`), 512, false),
    Assets.texture('tex/volcanic_rock_e.jpg', { srgb: false, repeat: true }),
  ]);
  const maskTex = { A: packMasks(painter, 'A'), B: packMasks(painter, 'B'), C: packMasks(painter, 'C') };
  const uniforms = {
    tGAlb: { value: alb }, tGNrm: { value: nrm }, tGOrm: { value: orm }, tGLava: { value: lava },
    tGMaskA: { value: maskTex.A }, tGMaskB: { value: maskTex.B }, tGMaskC: { value: maskTex.C },
    uGTime: { value: 0 }, uGTune: { value: new THREE.Vector4(GROUND_TUNE.wet, GROUND_TUNE.normal, GROUND_TUNE.lava, GROUND_TUNE.macro) }, uGCavity: { value: GROUND_TUNE.cavity },
  };
  const L = LAYERS.map(n => LAYER_TUNE[n]);
  const arr = (type, fn) => `${type}[9](${L.map(fn).join(', ')})`;
  const consts = `
    const vec3 G_UV[9] = ${arr('vec3', t => `vec3(${f(Math.cos(t.rot * Math.PI / 180))}, ${f(Math.sin(t.rot * Math.PI / 180))}, ${f(1 / t.tile)})`)};
    const vec4 G_BL[9] = ${arr('vec4', t => `vec4(${f(t.hMid)}, ${f(t.hc)}, ${f(t.soft)}, ${f(t.brk)})`)};
    const vec3 G_TINT[9] = ${arr('vec3', t => `vec3(${t.tint.map(f).join(', ')})`)};
    const vec4 G_MAT[9] = ${arr('vec4', t => `vec4(${f(t.anti)}, ${f(t.lum)}, ${f(t.nrm)}, ${f(t.wet)})`)};
    const float G_RGH[9] = ${arr('float', t => f(t.rough))};`;

  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0 });
  mat.customProgramCacheKey = () => 'erh-ground-v4';
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWp;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWp = ( modelMatrix * vec4( position, 1.0 ) ).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
      varying vec3 vWp;
      uniform sampler2DArray tGAlb, tGNrm, tGOrm;
      uniform sampler2D tGMaskA, tGMaskB, tGMaskC, tGLava;
      uniform float uGTime, uGCavity; uniform vec4 uGTune;
      ${consts}
      float gHash( vec2 p ) { vec3 p3 = fract( vec3( p.xyx ) * 0.1031 ); p3 += dot( p3, p3.yzx + 33.33 ); return fract( ( p3.x + p3.y ) * p3.z ); }
      float gNoise( vec2 p ) { vec2 i = floor( p ), f = fract( p ); f = f * f * ( 3.0 - 2.0 * f );
        return mix( mix( gHash( i ), gHash( i + vec2( 1.0, 0.0 ) ), f.x ), mix( gHash( i + vec2( 0.0, 1.0 ) ), gHash( i + vec2( 1.0, 1.0 ) ), f.x ), f.y ); }`)
      .replace('#include <map_fragment>', `
      vec2 wuv = vWp.xz; vec2 gDx = dFdx( wuv ), gDy = dFdy( wuv );
      vec2 gSuv = ( wuv + ${f(HALF)} ) / ${f(2 * HALF)};
      vec4 gMA = texture2D( tGMaskA, gSuv ), gMB = texture2D( tGMaskB, gSuv ), gMC = texture2D( tGMaskC, gSuv );
      float gNLow = gNoise( wuv * 0.035 ), gNMid = gNoise( wuv * 0.19 + 3.1 ), gNHi = gNoise( wuv * 1.3 + 7.7 );
      float gBrk = ( gNMid - 0.5 ) * 0.7 + ( gNHi - 0.5 ) * 0.5;
      float gM[9]; gM[0] = 1.0; gM[1] = gMB.r; gM[2] = gMB.g; gM[3] = gMA.r; gM[4] = gMB.b; gM[5] = gMB.a; gM[6] = gMA.b; gM[7] = gMA.g; gM[8] = gMA.a;
      vec3 gCol = vec3( 0.0 ), gNrm = vec3( 0.0 ), gOrm = vec3( 0.0 ); float gRem = 1.0, gWetK = 0.0, gRghK = 0.0, gWGrass = 0.0, gWVolc = 0.0, gWStone = 0.0;
      for ( int i = 8; i >= 0; i -- ) {
        float mi = gM[ i ];
        if ( gRem > 0.004 && mi > 0.004 ) {
          vec3 U = G_UV[ i ];
          vec2 uv = vec2( wuv.x * U.x - wuv.y * U.y, wuv.x * U.y + wuv.y * U.x ) * U.z;
          vec2 ux = vec2( gDx.x * U.x - gDx.y * U.y, gDx.x * U.y + gDx.y * U.x ) * U.z, uy = vec2( gDy.x * U.x - gDy.y * U.y, gDy.x * U.y + gDy.y * U.x ) * U.z;
          vec3 lyr = vec3( uv, float( i ) );
          vec3 o = textureGrad( tGOrm, lyr, ux, uy ).rgb;
          float a = 1.0;
          if ( i > 0 ) { vec4 B = G_BL[ i ]; float e = 4.0 * mi * ( 1.0 - mi ); a = smoothstep( 0.5 - B.z, 0.5 + B.z, mi + ( ( o.b - B.x ) * B.y + gBrk * B.w ) * e ); }
          float w = a * gRem; gRem *= 1.0 - a;
          if ( w > 0.004 ) {
            vec4 M = G_MAT[ i ];
            vec3 c = textureGrad( tGAlb, lyr, ux, uy ).rgb;
            vec3 n = textureGrad( tGNrm, lyr, ux, uy ).xyz * 2.0 - 1.0;
            if ( M.x > 0.0 ) {   // 큰 축척의 밝기 변이를 곱해 반복 무늬를 깬다
              vec3 c2 = textureGrad( tGAlb, vec3( uv.yx * 0.283 + vec2( 0.37, 0.11 ), float( i ) ), ux.yx * 0.283, uy.yx * 0.283 ).rgb;
              c *= mix( 1.0, clamp( dot( c2, vec3( 0.2126, 0.7152, 0.0722 ) ) / M.y, 0.55, 1.7 ), M.x * 0.75 );
            }
            vec2 p = vec2( n.x, - n.y ) * M.z;   // 노멀맵의 초록(+Y)은 그림 위쪽 = 월드 -Z
            gNrm += vec3( U.x * p.x + U.y * p.y, n.z, - U.y * p.x + U.x * p.y ) * w;
            gCol += c * G_TINT[ i ] * w; gOrm += o * w; gWetK += M.w * w; gRghK += G_RGH[ i ] * w;
            if ( i == 0 ) gWGrass = w; if ( i == 6 ) gWVolc = w; if ( i >= 7 ) gWStone += w;
          }
        }
      }
      // 큰 얼룩: 밝기, 마른 풀빛
      float gMac = uGTune.w;
      gCol *= 1.0 + ( ( gNLow * 0.62 + gNMid * 0.38 ) - 0.5 ) * 0.42 * gMac;
      float gDry = clamp( gMC.g * 1.2 + ( gNLow - 0.45 ) * 0.9 * gMac, 0.0, 1.0 );
      gCol = mix( gCol, gCol * vec3( 1.32, 1.10, 0.70 ), gWGrass * gDry * 0.8 );
      // 젖음: 낮은 곳부터 물이 고인다
      float gWet = clamp( gMC.r * uGTune.x, 0.0, 1.0 ) * gWetK;
      float gPud = smoothstep( 0.68, 0.86, gWet + ( 0.42 - gOrm.b ) * 0.55 + ( gNMid - 0.5 ) * 0.25 ) * step( 0.45, gWet );
      float gDamp = max( gWet * 0.85, gPud );
      gCol *= mix( 1.0, 0.50, gDamp );
      gCol *= mix( 1.0, gOrm.r, uGCavity * ( 1.0 - gPud ) );
      float gRough = clamp( gOrm.g * gRghK * mix( 1.0, 0.52, gWet ), 0.05, 1.0 ); gRough = mix( gRough, 0.13, gPud );
      float gAo = mix( gOrm.r, 1.0, gPud );
      vec3 gNw = normalize( vec3( gNrm.x * uGTune.y, gNrm.y, gNrm.z * uGTune.y ) );
      gNw = normalize( mix( gNw, vec3( 0.0, 1.0, 0.0 ), gPud * 0.94 ) );
      // 화산암 균열의 용암빛: 넓은 잡음으로 일부만 달아오르고 천천히 숨 쉰다
      vec3 gU6 = G_UV[ 6 ]; vec2 gUvL = vec2( wuv.x * gU6.x - wuv.y * gU6.y, wuv.x * gU6.y + wuv.y * gU6.x ) * gU6.z;
      float gLava = texture2D( tGLava, gUvL ).r * gWVolc;
      gLava *= smoothstep( 0.30, 0.62, gNoise( wuv * 0.11 + vec2( uGTime * 0.013, - uGTime * 0.009 ) ) ) * ( 0.72 + 0.28 * sin( uGTime * 1.3 + gNLow * 17.0 ) );
      diffuseColor.rgb *= gCol;`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n roughnessFactor = gRough;')
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n normal = normalize( mat3( viewMatrix ) * gNw );')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += vec3( 1.0, 0.30, 0.055 ) * gLava * uGTune.z;')
      .replace('#include <aomap_fragment>', '#include <aomap_fragment>\n reflectedLight.indirectDiffuse *= gAo; reflectedLight.indirectSpecular *= mix( gAo, 1.0, 0.3 );');
  };
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute([-HALF, 0, -HALF, -HALF, 0, HALF, HALF, 0, HALF, HALF, 0, -HALF], 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 0, 1, 1, 1, 1, 0], 2));
  geo.setIndex([0, 1, 2, 0, 2, 3]);
  const mesh = new THREE.Mesh(geo, mat); mesh.receiveShadow = true; mesh.frustumCulled = false; mesh.name = 'ground';
  engine.scene.add(mesh);
  return {
    mesh, material: mat, maskTex, uniforms, tune: GROUND_TUNE,
    update(time) { uniforms.uGTime.value = time; uniforms.uGTune.value.set(GROUND_TUNE.wet, GROUND_TUNE.normal, GROUND_TUNE.lava, GROUND_TUNE.macro); uniforms.uGCavity.value = GROUND_TUNE.cavity; },
  };
}

/** 미니맵 밑그림(512²): 마스크를 재질 색으로 칠한다 */
export function paintMinimap(painter, size = 512) {
  const { SP, data } = painter; const mm = document.createElement('canvas'); mm.width = mm.height = size; const m2 = mm.getContext('2d');
  const im = m2.createImageData(size, size); const step = SP / size;
  const COL = { forest: [50, 62, 36], grave: [92, 92, 84], dirt: [146, 122, 88], mud: [98, 80, 60], ash: [84, 78, 76], volcanic: [52, 34, 32], cobble: [132, 130, 124], flag: [158, 154, 144] };
  const order = ['forest', 'grave', 'dirt', 'mud', 'ash', 'volcanic', 'cobble', 'flag'];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const o = Math.floor(y * step) * SP + Math.floor(x * step); const q = (y * size + x) * 4;
    const n = ((x * 7 + y * 13) % 9) - 4; let r = 62 + n, g = 86 + n, b = 46;
    for (const k of order) { const d = data[k]; if (!d) continue; const a = Math.min(1, d[o] / 255 * 1.15), c = COL[k]; r += (c[0] - r) * a; g += (c[1] - g) * a; b += (c[2] - b) * a; }
    im.data[q] = r; im.data[q + 1] = g; im.data[q + 2] = b; im.data[q + 3] = 255;
  }
  m2.putImageData(im, 0, 0);
  return mm;
}

/** 예전 방식의 섞기 지도(R=흙, G=돌바닥, B=그을음) — 다른 모듈이 world.splatCanvas 를 볼 때를 위한 호환용 */
export function legacySplat(painter) {
  const { SP, data } = painter; const cv = document.createElement('canvas'); cv.width = cv.height = SP; const g = cv.getContext('2d');
  const im = g.createImageData(SP, SP); const z = new Uint8Array(SP * SP);
  const D = (n) => data[n] || z;
  const dirt = D('dirt'), mud = D('mud'), grave = D('grave'), cob = D('cobble'), flag = D('flag'), vol = D('volcanic'), ash = D('ash');
  for (let k = 0, i = 0; k < SP * SP; k++, i += 4) {
    im.data[i] = Math.min(255, dirt[k] * 0.82 + mud[k] * 0.78 + grave[k] * 0.66);
    im.data[i + 1] = Math.min(255, cob[k] + flag[k]);
    im.data[i + 2] = Math.min(255, vol[k] + ash[k] * 0.6);
    im.data[i + 3] = 255;
  }
  g.putImageData(im, 0, 0);
  return cv;
}
