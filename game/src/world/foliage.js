// 풀·잡초·바닥 부스러기: 카메라 둘레의 격자에 인스턴스를 깔고, 정점 셰이더가 섞기 지도를 읽어 자리마다 밀도·종류·크기·색을 정한다.
//  · CPU 는 매 프레임 격자 중심(유니폼)만 옮긴다. 인스턴스는 격자를 벗어나면 반대편으로 돌아 들어오지만, 자리마다 난수가 고정이라 풀이 "따라오지" 않는다.
//  · 길·돌바닥·진흙·화산암에는 나지 않고, 숲은 고사리·쐐기풀, 묘지는 마른 풀, 초원에는 꽃과 토끼풀이 섞인다.
//  · 바람(engine.windUniforms)에 흔들리고 주인공 발밑에서는 눕는다. 품질 단계에 따라 포기 수를 줄인다.
import * as THREE from 'three';
import { Assets } from '../core/assets.js';

// ───────────────────────── 조정 손잡이 ─────────────────────────
export const FOLIAGE_TUNE = {
  spacing: 0.31,        // 풀 격자 간격(m). 작을수록 촘촘하다(포기 수는 N²)
  N: 208,               // 격자 한 변의 칸 수 → 덮는 범위 = spacing × N (약 68m)
  height: 1.0,          // 풀 키 배율(기본 0.3~0.5m, 무릎 아래)
  density: 1.0,         // 밀도 배율
  quality: { '높음': 1.0, '보통': 0.6, '낮음': 0.3 },   // 품질 단계별 포기 수 비율
  debrisSpacing: 1.15, debrisN: 60,                     // 바닥 부스러기(낙엽·잔돌) 격자
  tint: [1.0, 1.0, 1.0],                                // 풀 색 배율
};

const GLSL_HASH = /* glsl */`
  float fHash( vec2 p ) { vec3 p3 = fract( vec3( p.xyx ) * 0.1031 ); p3 += dot( p3, p3.yzx + 33.33 ); return fract( ( p3.x + p3.y ) * p3.z ); }
  vec2 fHash2( vec2 p ) { vec3 p3 = fract( vec3( p.xyx ) * vec3( 0.1031, 0.1030, 0.0973 ) ); p3 += dot( p3, p3.yzx + 33.33 ); return fract( ( p3.xx + p3.yz ) * p3.zy ); }
  float fNoise( vec2 p ) { vec2 i = floor( p ), f = fract( p ); f = f * f * ( 3.0 - 2.0 * f );
    return mix( mix( fHash( i ), fHash( i + vec2( 1.0, 0.0 ) ), f.x ), mix( fHash( i + vec2( 0.0, 1.0 ) ), fHash( i + vec2( 1.0, 1.0 ) ), f.x ), f.y ); }
`;

function shuffledGrid(N, seed) {
  const n = N * N, a = new Float32Array(n * 2); const order = new Uint32Array(n); for (let i = 0; i < n; i++) order[i] = i;
  let s = seed >>> 0; const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = order[i]; order[i] = order[j]; order[j] = t; }   // 섞어 두면 앞에서부터 일부만 그려도 고르게 솎인다
  for (let i = 0; i < n; i++) { a[i * 2] = order[i] % N; a[i * 2 + 1] = Math.floor(order[i] / N); }
  return a;
}

export async function createFoliage(engine, ground, HALF) {
  const scene = engine.scene, W = engine.windUniforms, T = FOLIAGE_TUNE;
  const [tGrass, tFern, tDebris] = await Promise.all([Assets.texture('tex/grass_blades.png'), Assets.texture('tex/fern_weeds.png'), Assets.texture('tex/decal_debris.png')]);
  const U = {
    uFGrid: { value: new THREE.Vector4(T.spacing, T.N, 0, 0) },          // 간격, 칸 수, 중심 xz
    uFParam: { value: new THREE.Vector4(T.density, T.spacing * T.N * 0.5, T.height, 0) },   // 밀도, 반지름, 키, (빈칸)
    uFPlayer: { value: new THREE.Vector3(0, 0, 0) }, uFTint: { value: new THREE.Vector3(1, 1, 1) },
    tFernMap: { value: tFern },
    tGMaskA: ground.uniforms.tGMaskA, tGMaskB: ground.uniforms.tGMaskB, tGMaskC: ground.uniforms.tGMaskC,
    uWindTime: W.uWindTime, uWindDir: W.uWindDir, uWindStrength: W.uWindStrength,
  };
  const HF = HALF.toFixed(1), H2 = (2 * HALF).toFixed(1);

  // ── 풀 포기: 서로 엇갈려 뒤로 누운 판 2장
  const geo = new THREE.InstancedBufferGeometry();
  {
    const pos = [], uv = [], idx = [];
    for (let k = 0; k < 2; k++) {
      const a = k * Math.PI / 2, ca = Math.cos(a), sa = Math.sin(a), lean = 0.34, base = pos.length / 3;
      // 판의 법선 방향(-sin, cos)으로 위쪽이 눕는다: 위에서 내려다봐도 판이 넓게 보인다
      for (const [x, y] of [[-0.5, 0], [0.5, 0], [0.5, 1], [-0.5, 1]]) { pos.push(x * ca - sa * lean * y + sa * lean * 0.5, y, x * sa + ca * lean * y - ca * lean * 0.5); uv.push(x + 0.5, y); }
      idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(pos.length / 3).fill(0).flatMap(() => [0, 1, 0]), 3)); geo.setIndex(idx);
    geo.setAttribute('aGrid', new THREE.InstancedBufferAttribute(shuffledGrid(T.N, 9001), 2));
    geo.instanceCount = T.N * T.N; geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
  }
  const mat = new THREE.MeshStandardMaterial({ map: tGrass, alphaTest: 0.36, alphaToCoverage: true, side: THREE.DoubleSide, roughness: 1, metalness: 0, color: 0xffffff });
  mat.customProgramCacheKey = () => 'erh-grass-v4';
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
      attribute vec2 aGrid;
      uniform vec4 uFGrid, uFParam; uniform vec3 uFPlayer, uFTint; uniform sampler2D tGMaskA, tGMaskB, tGMaskC;
      uniform float uWindTime, uWindStrength; uniform vec2 uWindDir;
      varying vec3 vFTint; varying float vFSel;
      ${GLSL_HASH}`)
      .replace('#include <beginnormal_vertex>', `
      // 이 인스턴스가 맡은 월드 칸: 격자 중심에 가장 가까운, 나머지가 같은 칸
      vec2 fC = uFGrid.zw / uFGrid.x;
      vec2 fCell = aGrid + uFGrid.y * floor( ( fC - aGrid ) / uFGrid.y + 0.5 );
      vec2 fH2 = fHash2( fCell ); float fH1 = fHash( fCell + 17.3 ), fH3 = fHash( fCell * 1.7 + 5.1 ), fH4 = fHash( fCell * 0.61 + 91.7 );
      vec2 fWp = ( fCell + 0.5 + ( fH2 - 0.5 ) * 0.96 ) * uFGrid.x;
      vec2 fSuv = ( fWp + ${HF} ) / ${H2};
      vec4 fMA = texture2D( tGMaskA, fSuv ), fMB = texture2D( tGMaskB, fSuv ), fMC = texture2D( tGMaskC, fSuv );
      float fStone = max( fMA.g, fMA.a ), fForest = fMB.r, fGrave = fMB.g;
      float fPatch = fNoise( fWp * 0.13 ) * 0.65 + fNoise( fWp * 0.47 + 9.1 ) * 0.35;   // 무더기로 나고 듬성한 곳도 있게
      float fDens = uFParam.x * ( 0.70 + 0.75 * fPatch );
      fDens *= 1.0 - smoothstep( 0.22, 0.60, fStone );
      fDens *= 1.0 - smoothstep( 0.28, 0.66, fMA.r );
      fDens *= 1.0 - smoothstep( 0.25, 0.65, fMB.b ) * 0.94;
      fDens *= 1.0 - smoothstep( 0.15, 0.55, fMA.b );
      fDens *= 1.0 - smoothstep( 0.20, 0.70, fMB.a ) * 0.93;
      fDens *= mix( 1.0, 0.78, fForest ) * mix( 1.0, 0.46, fGrave ) * ( 1.0 - fMC.b );
      float fEdge = 1.0 - smoothstep( uFParam.y * 0.80, uFParam.y * 0.98, length( fWp - uFGrid.zw ) );
      float fKeep = step( fH1, fDens ) * step( 0.02, fEdge );
      // 종류: 아틀라스(0 풀, 1 고사리·잡초)와 칸(4×2), 키(m), 폭 비율
      float fSel = 0.0, fCi = 0.0, fHgt = 0.34, fWid = 1.25; float r = fH3;
      float fDry = clamp( fMC.g + ( fNoise( fWp * 0.035 ) - 0.45 ) * 0.9, 0.0, 1.0 );
      if ( fForest > 0.42 && r < 0.30 ) {
        if ( r < 0.11 ) { fSel = 1.0; fCi = 0.0; fHgt = 0.46; fWid = 1.5; } else if ( r < 0.18 ) { fSel = 1.0; fCi = 1.0; fHgt = 0.44; fWid = 1.4; }
        else if ( r < 0.23 ) { fSel = 1.0; fCi = 2.0; fHgt = 0.40; fWid = 1.0; } else if ( r < 0.26 ) { fSel = 1.0; fCi = 3.0; fHgt = 0.46; fWid = 1.0; } else { fCi = 4.0; fHgt = 0.38; fWid = 1.1; }
      } else if ( fGrave > 0.40 ) {
        if ( r < 0.45 ) { fCi = 6.0; fHgt = 0.36; fWid = 1.2; } else if ( r < 0.80 ) { fCi = 7.0; fHgt = 0.34; fWid = 1.0; } else if ( r < 0.90 ) { fSel = 1.0; fCi = 6.0; fHgt = 0.44; fWid = 0.9; } else { fCi = 5.0; fHgt = 0.34; fWid = 1.2; }
      } else if ( fDry > 0.62 ) {
        if ( r < 0.5 ) { fCi = 5.0; fHgt = 0.36; fWid = 1.2; } else if ( r < 0.85 ) { fCi = 6.0; fHgt = 0.36; fWid = 1.2; } else { fCi = 7.0; fHgt = 0.32; fWid = 1.0; }
      } else {
        float fl = 0.035 + fMC.a * 0.16;   // 꽃·토끼풀 비율
        if ( r < fl ) { fSel = 1.0; fCi = 4.0; fHgt = 0.24; fWid = 1.2; } else if ( r < fl * 2.0 ) { fSel = 1.0; fCi = 5.0; fHgt = 0.30; fWid = 1.0; } else if ( r < fl * 3.4 ) { fSel = 1.0; fCi = 7.0; fHgt = 0.20; fWid = 1.6; }
        else if ( r < 0.60 ) { fCi = 0.0; fHgt = 0.30; fWid = 1.45; } else if ( r < 0.74 ) { fCi = 2.0; fHgt = 0.36; fWid = 1.35; } else if ( r < 0.88 ) { fCi = 4.0; fHgt = 0.38; fWid = 1.1; }
        else if ( r < 0.95 ) { fCi = 1.0; fHgt = 0.44; fWid = 0.8; } else { fCi = 3.0; fHgt = 0.48; fWid = 0.8; }
      }
      // 돌바닥 가장자리·틈새의 잡초는 작게
      fHgt *= mix( 1.0, 0.62, smoothstep( 0.05, 0.3, fStone ) ) * mix( 0.72, 1.32, fH4 ) * uFParam.z * ( 0.55 + 0.45 * fEdge );
      fWid *= fHgt;
      float fAng = fH2.x * 6.2832, fCa = cos( fAng ), fSa = sin( fAng );
      vec3 fLp = vec3( position.x * fWid, position.y * fHgt, position.z * fWid );
      vec3 fW3 = vec3( fWp.x + fLp.x * fCa - fLp.z * fSa, fLp.y, fWp.y + fLp.x * fSa + fLp.z * fCa );
      // 바람: 잔 흔들림 + 지나가는 돌풍의 물결
      float fTop = position.y * position.y;
      float fPh = dot( fWp, uWindDir ) * 0.55 + uWindTime * 2.1 + fH1 * 6.2832;
      float fGust = fNoise( fWp * 0.085 - uWindDir * uWindTime * 0.85 );
      vec2 fBend = uWindDir * ( ( sin( fPh ) * 0.55 + sin( fPh * 2.3 + 1.1 ) * 0.3 ) * 0.10 + ( fGust - 0.35 ) * 0.42 ) * uWindStrength;
      fW3.xz += fBend * fTop * fHgt;
      // 주인공 발밑: 바깥으로 밀리고 눕는다
      vec2 fDp = fWp - uFPlayer.xz; float fPk = 1.0 - smoothstep( 0.2, 1.1, length( fDp ) );
      fW3.xz += normalize( fDp + vec2( 1e-4 ) ) * fPk * 0.30 * position.y; fW3.y *= 1.0 - fPk * 0.5;
      if ( fKeep < 0.5 ) fW3 = vec3( fWp.x, -4.0, fWp.y );
      #ifdef USE_MAP
        vMapUv = vec2( ( mod( fCi, 4.0 ) + 0.01 + uv.x * 0.98 ) * 0.25, 1.0 - ( floor( fCi / 4.0 ) + 1.0 - ( uv.y * 0.975 + 0.02 ) ) * 0.5 );
      #endif
      vFSel = fSel;
      // 색: 밑동은 어둡게(접지), 자리마다 조금씩 다르게, 마른 곳은 누렇게, 숲은 짙게, 묘지는 바래게
      float fShade = mix( 0.42, 1.06, smoothstep( 0.0, 0.85, position.y ) );
      vec3 fT = vec3( 0.86 + fH4 * 0.26, 0.90 + fH2.y * 0.2, 0.84 + fH1 * 0.2 ) * ( 0.86 + 0.28 * fPatch );
      fT = mix( fT, fT * vec3( 1.20, 1.04, 0.74 ), fDry * ( 1.0 - fSel ) * 0.7 );
      fT = mix( fT, fT * vec3( 0.80, 0.90, 0.80 ), fForest * 0.7 );
      fT = mix( fT, fT * vec3( 1.0, 1.04, 1.1 ) * 1.35, fGrave );
      vFTint = fT * fShade * uFTint * mix( 1.0, 0.78, fSel );
      vec3 objectNormal = normalize( vec3( ( fH2.x - 0.5 ) * 0.3 + fBend.x * 0.8, 1.0, ( fH2.y - 0.5 ) * 0.3 + fBend.y * 0.8 ) );
      `)
      .replace('#include <begin_vertex>', 'vec3 transformed = fW3;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D tFernMap; varying vec3 vFTint; varying float vFSel;')
      .replace('#include <map_fragment>', `
      vec4 fTex = vFSel < 0.5 ? texture2D( map, vMapUv ) : texture2D( tFernMap, vMapUv );
      // 멀어져 밉맵이 내려가면 가는 풀잎이 사라지므로 알파를 조금 키운다
      vec2 fTx = vMapUv * vec2( 1024.0, 512.0 ); float fLod = max( 0.0, 0.5 * log2( max( dot( dFdx( fTx ), dFdx( fTx ) ), dot( dFdy( fTx ), dFdy( fTx ) ) ) ) );
      fTex.a *= 1.0 + fLod * 0.45;
      diffuseColor *= fTex; diffuseColor.rgb *= vFTint;`)
      .replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\n normal = normalize( vNormal );');   // 양면 판: 뒷면도 위를 보는 법선 그대로
  };
  const grass = new THREE.Mesh(geo, mat); grass.frustumCulled = false; grass.receiveShadow = true; grass.castShadow = false; grass.name = 'grass'; scene.add(grass);

  // ── 바닥 부스러기(낙엽·잔가지·잔돌): 땅에 누운 판
  const U2 = {
    uFGrid: { value: new THREE.Vector4(T.debrisSpacing, T.debrisN, 0, 0) }, uFParam: { value: new THREE.Vector4(1, T.debrisSpacing * T.debrisN * 0.5, 1, 0) },
    tGMaskA: U.tGMaskA, tGMaskB: U.tGMaskB, tGMaskC: U.tGMaskC,
  };
  const dgeo = new THREE.InstancedBufferGeometry();
  {
    dgeo.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, 0, 0.5, 0.5, 0, 0.5, 0.5, 0, -0.5, -0.5, 0, -0.5], 3));
    dgeo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
    dgeo.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3)); dgeo.setIndex([0, 1, 2, 0, 2, 3]);
    dgeo.setAttribute('aGrid', new THREE.InstancedBufferAttribute(shuffledGrid(T.debrisN, 4242), 2));
    dgeo.instanceCount = T.debrisN * T.debrisN; dgeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
  }
  const dmat = new THREE.MeshStandardMaterial({ map: tDebris, transparent: true, depthWrite: false, roughness: 0.95, metalness: 0, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  dmat.customProgramCacheKey = () => 'erh-debris-v4';
  dmat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U2);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
      attribute vec2 aGrid; uniform vec4 uFGrid, uFParam; uniform sampler2D tGMaskA, tGMaskB, tGMaskC; varying vec4 vFTint;
      ${GLSL_HASH}`)
      .replace('#include <begin_vertex>', `
      vec2 fC = uFGrid.zw / uFGrid.x;
      vec2 fCell = aGrid + uFGrid.y * floor( ( fC - aGrid ) / uFGrid.y + 0.5 );
      vec2 fH2 = fHash2( fCell + 3.3 ); float fH1 = fHash( fCell + 41.3 ), fH3 = fHash( fCell * 1.3 + 15.1 );
      vec2 fWp = ( fCell + 0.5 + ( fH2 - 0.5 ) * 0.9 ) * uFGrid.x;
      vec2 fSuv = ( fWp + ${HF} ) / ${H2};
      vec4 fMA = texture2D( tGMaskA, fSuv ), fMB = texture2D( tGMaskB, fSuv ), fMC = texture2D( tGMaskC, fSuv );
      float fStone = max( fMA.g, fMA.a );
      // 숲 바닥엔 낙엽·잔가지, 묘지·흙길 가장자리·성벽 밑엔 잔돌, 야영지엔 나무 조각
      float fLeaf = fMB.r * 0.50 + fMB.g * 0.16, fRock = fMB.g * 0.16 + fMA.b * 0.34 + fMB.a * 0.22 + fMA.r * ( 1.0 - fMA.r ) * 1.1 + fStone * ( 1.0 - fStone ) * 1.4 + fMB.b * 0.3 + 0.035;
      float fCi, fSize; vec3 fT;
      if ( fH3 * ( fLeaf + fRock ) < fLeaf ) { fCi = fH2.y < 0.55 ? 0.0 : 1.0; fSize = mix( 0.55, 1.35, fH2.x ); fT = vec3( 0.50, 0.47, 0.40 ) * mix( 1.0, 0.8, fMB.g ); }
      else { fCi = fH2.y < 0.6 ? 2.0 : 3.0; fSize = mix( 0.45, 1.0, fH2.x ); fT = mix( vec3( 0.9 ), vec3( 0.36, 0.33, 0.33 ), max( fMA.b, fMB.a * 0.6 ) ); }
      float fEdge = 1.0 - smoothstep( uFParam.y * 0.8, uFParam.y * 0.98, length( fWp - uFGrid.zw ) );
      float fKeep = step( fH1, ( fLeaf + fRock ) * uFParam.x ) * step( 0.02, fEdge ) * ( 1.0 - step( 0.7, fStone ) ) * ( 1.0 - fMC.b * 0.7 );
      float fAng = fH1 * 61.0, fCa = cos( fAng ), fSa = sin( fAng );
      vec3 transformed = vec3( fWp.x + ( position.x * fCa - position.z * fSa ) * fSize, 0.012 + fH3 * 0.01, fWp.y + ( position.x * fSa + position.z * fCa ) * fSize );
      if ( fKeep < 0.5 ) transformed = vec3( fWp.x, -4.0, fWp.y );
      #ifdef USE_MAP
        vMapUv = vec2( ( mod( fCi, 2.0 ) + uv.x ) * 0.5, 1.0 - ( floor( fCi / 2.0 ) + 1.0 - uv.y ) * 0.5 );
      #endif
      vFTint = vec4( fT * ( 0.85 + fH3 * 0.3 ), fEdge * mix( 0.75, 1.0, fH2.x ) );`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec4 vFTint;')
      .replace('#include <map_fragment>', '#include <map_fragment>\n diffuseColor.rgb *= vFTint.rgb; diffuseColor.a *= vFTint.a;');
  };
  const debris = new THREE.Mesh(dgeo, dmat); debris.frustumCulled = false; debris.receiveShadow = true; debris.renderOrder = 2; debris.name = 'debris'; scene.add(debris);

  const fwd = new THREE.Vector3();
  let quality = '';
  return {
    grass, debris, tune: T, uniforms: U,
    /** 품질 단계: 포기 수를 줄인다(낮음은 부스러기도 끔) */
    setQuality(q) {
      if (q === quality) return; quality = q;
      const k = T.quality[q] ?? 1; geo.instanceCount = Math.max(1, Math.floor(T.N * T.N * k)); debris.visible = q !== '낮음'; dgeo.instanceCount = Math.floor(T.debrisN * T.debrisN * (q === '높음' ? 1 : 0.6));
    },
    update(focus) {
      // 격자 중심: 카메라가 보는 지면 한가운데(주인공보다 조금 앞)
      const cam = engine.camera; cam.getWorldDirection(fwd); const l = Math.hypot(fwd.x, fwd.z) || 1; const ahead = Math.min(14, engine.cam.dist * 0.24);
      const cx = engine.cam.look.x + fwd.x / l * ahead, cz = engine.cam.look.z + fwd.z / l * ahead;
      U.uFGrid.value.set(T.spacing, T.N, cx, cz); U.uFParam.value.set(T.density, T.spacing * T.N * 0.5, T.height, 0);
      U2.uFGrid.value.set(T.debrisSpacing, T.debrisN, cx, cz);
      U.uFPlayer.value.copy(focus); U.uFTint.value.set(T.tint[0], T.tint[1], T.tint[2]);
    },
  };
}
