// 캐릭터 룩: GLB 재질(MeshStandardMaterial)에 보강 텍스처와 셰이더 조각을 끼운다.
//  - 보강 텍스처(assets/tex/char_<이름>_n.jpg · _orm.jpg, _work/v4/chars/build_charmaps.py 가 만든다):
//      노멀 = 원래 노멀 + 색에서 유도한 잔 요철 / ORM 의 R = 색조 마스크(0~0.45) 또는 발광(0.6~1), G = 거칠기, B = 금속
//  - 셰이더: 하늘빛 테두리광(프레넬), 주인공 보조광, 피격 번쩍임, 색조를 재질에 맞게 입히기(살갗·머리카락은 그대로, 천은 물들이고 금속은 칠한 갑옷처럼),
//            눈·용암 발광, 무기 금속의 결(거칠기 무늬)과 환경 반사 배율
//  - 발밑 접지 그림자(인스턴싱 한 번에 그림), 화면 밖 캐릭터 가려내기(그리기·뼈 계산 생략)
// 엔진은 window.__GAME__.engine 으로 찾는다(없으면 기본값으로 돈다).
import * as THREE from 'three';
import { Assets } from '../core/assets.js';

// ───────────────────────── 조정 손잡이 ─────────────────────────
export const LOOK = {
  rim: 0.55,            // 테두리광 세기(하늘빛 × 이 값)
  rimNight: 0.7,        // 어두운 구역(mood.night = 1)에서 더 주는 비율
  rimPow: 3.2,          // 클수록 가장자리에만 얇게
  heroRim: 1.3,         // 주인공 테두리광 배율
  heroFill: 0.085,      // 주인공 보조광(카메라 쪽에서 오는 약한 확산광)
  normal: 1.0,          // 보강 노멀 세기
  envBody: 1.15,        // 몸통 금속의 환경 반사 배율
  envGear: 1.3,         // 무기·방패의 환경 반사 배율
  flash: 0.8,           // 피격 번쩍임 배율
  dye: [2.1, 0.62, 0.0, 0.45],   // 색조: 천 밝기 보정 / 천을 물들이는 정도 / 살갗·머리카락에 묻는 정도 / 금속을 '칠한 갑옷'으로 바꾸는 정도
  emis: { demon_lord: 6.0, werewolf: 3.0, skeleton_knight: 4.5 },   // 발광 마스크(용암·눈) 밝기
  blob: 0.5,            // 접지 그림자 짙기(0 이면 끔)
  blobSize: 0.3,        // 접지 그림자 반지름 = 키 × 이 값
  blobWide: { werewolf: 1.25, orc_warrior: 1.2, demon_lord: 1.25, blacksmith: 1.1 },
  cull: true,           // 화면 밖 캐릭터는 그리지도, 뼈를 움직이지도 않는다
  receiveShadow: true,  // 캐릭터도 그림자를 받는다(건물·나무 그늘, 자기 그림자)
};

// ───────────────────────── 보강 텍스처 ─────────────────────────
const lookCache = {};
async function tex(key) {
  if (!Assets.has(key)) return null;
  const t = (await Assets.texture(key, { srgb: false, anisotropy: 4 })).clone();   // GLB 안의 텍스처와 같은 방향(뒤집지 않음)
  t.flipY = false; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.NoColorSpace; t.needsUpdate = true;
  return t;
}
/** 모델 이름(hero …)의 보강 텍스처 한 벌. 없으면 { n: null, orm: null } */
export async function loadLook(tag) {
  if (!lookCache[tag]) lookCache[tag] = (async () => ({ n: await tex('tex/char_' + tag + '_n.jpg'), orm: await tex('tex/char_' + tag + '_orm.jpg') }))();
  return lookCache[tag];
}

// ───────────────────────── 셰이더 조각 ─────────────────────────
const SH = {       // 모든 캐릭터가 함께 쓰는 값
  uChRim: { value: new THREE.Vector3(0.2, 0.3, 0.5) }, uChRimPow: { value: LOOK.rimPow }, uChDye: { value: new THREE.Vector4(2, 0.6, 0, 0.45) },
};
const F_PARS = /* glsl */`
uniform vec3 uChRim; uniform float uChRimPow; uniform vec4 uChDye;
uniform vec3 uChFlash; uniform float uChFill, uChRimK, uChEmis, uChEnv;
#ifdef CH_BLADE
	uniform vec4 uChBlade, uChBladeL; varying vec3 vChBev;
#endif
#ifdef CH_GEAR
	varying vec3 vChPos;
	float chHash( vec2 p ) { return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453 ); }
	float chNoise( vec2 p ) { vec2 i = floor( p ), f = fract( p ); f = f * f * ( 3.0 - 2.0 * f );
		return mix( mix( chHash( i ), chHash( i + vec2( 1.0, 0.0 ) ), f.x ), mix( chHash( i + vec2( 0.0, 1.0 ) ), chHash( i + vec2( 1.0, 1.0 ) ), f.x ), f.y ); }
#endif
`;
// 색조: material.color(diffuse)를 재질에 맞게 입힌다. 흰색이면 아무 일도 하지 않는다
const F_TINT = /* glsl */`
#ifdef CH_ORM
	{
		vec3 chBase = diffuseColor.rgb;
		float chR = texture2D( roughnessMap, vRoughnessMapUv ).r;
		float chTint = clamp( chR / 0.45, 0.0, 1.0 );
		chEmis = clamp( ( chR - 0.6 ) / 0.4, 0.0, 1.0 );
		float chMx = max( diffuse.r, max( diffuse.g, diffuse.b ) ), chMn = min( diffuse.r, min( diffuse.g, diffuse.b ) );
		float chSat = clamp( ( chMx - chMn ) / max( chMx, 1e-4 ), 0.0, 1.0 );
		float chL = dot( chBase, vec3( 0.2126, 0.7152, 0.0722 ) );
		vec3 chDyed = mix( chBase * diffuse, vec3( chL ) * diffuse * uChDye.x, uChDye.y * chSat );     // 천·가죽은 밝기를 살려 물들인다
		diffuseColor.rgb = mix( chBase * mix( vec3( 1.0 ), diffuse, uChDye.z ), chDyed, chTint * ( 1.0 - chEmis ) );
		chMetalK = 1.0 - uChDye.w * chSat * chTint;                                                   // 색을 입힌 금속은 칠한 갑옷처럼
	}
#else
	diffuseColor.rgb *= diffuse;
#endif
`;
const F_METAL = /* glsl */`
metalnessFactor *= chMetalK;
#ifdef CH_GEAR
	{
		// 금속의 결: 길이 방향으로 길게 늘어난 잔무늬가 거칠기를 흔든다(날이 한 가지 색으로 밋밋하게 보이지 않게)
		float n1 = chNoise( vec2( vChPos.x * 110.0 + vChPos.z * 83.0, vChPos.y * 4.0 ) );
		float n2 = chNoise( vChPos.xy * 13.0 + vChPos.z * 7.0 );
		roughnessFactor = clamp( roughnessFactor * mix( 1.0, 0.72 + 0.6 * n1, metalnessFactor ) + ( n2 - 0.5 ) * 0.14 * metalnessFactor, 0.07, 1.0 );
	}
#endif
#ifdef CH_BLADE
	{
		// 검날: 가운데의 가는 홈은 조금 어둡게, 날 쪽 연마면은 밝고 매끈하게(면이 나뉘어 보여야 날이 또렷하다)
		float bx = abs( dot( vChPos, uChBlade.xyz ) ) / uChBlade.w;
		float bl = dot( vChPos, uChBladeL.xyz ) + uChBladeL.w;                                  // 0 = 손잡이 쪽, 1 = 칼끝
		chEdge = smoothstep( 0.6, 0.9, bx );
		float fuller = ( 1.0 - smoothstep( 0.1, 0.24, bx ) ) * ( 1.0 - smoothstep( 0.66, 0.8, bl ) );
		roughnessFactor = clamp( mix( roughnessFactor, 0.1, chEdge * 0.85 ) + fuller * 0.1, 0.07, 1.0 );
		diffuseColor.rgb *= mix( 0.84, 1.12, chEdge ) * ( 1.0 - 0.22 * fuller );
	}
#endif
`;
const F_NORMAL = /* glsl */`
#ifdef CH_BLADE
	normal = normalize( normal + vChBev * ( chEdge * 0.55 ) );      // 연마면은 바깥으로 기울어 다른 하늘을 비춘다
#endif
`;
const F_OUT = /* glsl */`
{
	vec3 chV = normalize( vViewPosition );
	float chF = pow( 1.0 - clamp( dot( normal, chV ), 0.0, 1.0 ), uChRimPow );
	vec3 chUp = normalize( ( viewMatrix * vec4( 0.0, 1.0, 0.0, 0.0 ) ).xyz );
	float chTop = 0.3 + 0.7 * clamp( dot( normal, chUp ) * 0.6 + 0.5, 0.0, 1.0 );                   // 하늘을 보는 면에 더 든다
	float chGloss = 0.55 + 0.45 * max( metalnessFactor, 1.0 - roughnessFactor );
	float chFuzz = smoothstep( 0.8, 0.95, roughnessFactor ) * ( 1.0 - metalnessFactor );                 // 털·천은 가장자리가 보송하게 빛을 머금는다
	outgoingLight += uChRim * ( chF * chTop * chGloss * uChRimK ) * mix( vec3( 1.0 ), 0.5 + diffuseColor.rgb * 2.2, chFuzz * 0.7 ) * ( 1.0 + chFuzz * 0.6 );
	outgoingLight += diffuseColor.rgb * ( uChFill * ( 0.4 + 0.6 * clamp( dot( normal, normalize( vec3( 0.2, 0.45, 1.0 ) ) ), 0.0, 1.0 ) ) );
	outgoingLight += uChFlash * ( 0.5 + 0.5 * chF );
}
`;
let PATCHED = null;
function patch(shader) {
  if (!PATCHED) {
    let v = shader.vertexShader, f = shader.fragmentShader;
    const rep = (s, a, b) => { if (!s.includes(a)) console.warn('[charlook] 셰이더 조각을 찾지 못함:', a); return s.replace(a, b); };
    v = rep(v, '#include <common>', '#include <common>\n#ifdef CH_GEAR\n\tvarying vec3 vChPos;\n#endif\n#ifdef CH_BLADE\n\tuniform vec4 uChBlade; varying vec3 vChBev;\n#endif');
    v = rep(v, '#include <begin_vertex>', '#include <begin_vertex>\n#ifdef CH_GEAR\n\tvChPos = position;\n#endif\n#ifdef CH_BLADE\n\tvChBev = normalize( normalMatrix * ( uChBlade.xyz * sign( dot( position, uChBlade.xyz ) ) ) );\n#endif');
    f = rep(f, '#include <common>', '#include <common>\n' + F_PARS);
    f = rep(f, 'vec4 diffuseColor = vec4( diffuse, opacity );', 'vec4 diffuseColor = vec4( vec3( 1.0 ), opacity );\n\tfloat chMetalK = 1.0, chEmis = 0.0, chEdge = 0.0;');
    f = rep(f, '#include <color_fragment>', '#include <color_fragment>\n' + F_TINT);
    f = rep(f, '#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\n' + F_METAL);
    f = rep(f, '#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n' + F_NORMAL);
    f = rep(f, '#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n\ttotalEmissiveRadiance += diffuseColor.rgb * ( chEmis * uChEmis );');
    f = rep(f, '#include <lights_fragment_maps>', '#include <lights_fragment_maps>\n#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )\n\tradiance *= uChEnv;\n#endif');
    f = rep(f, '#include <opaque_fragment>', F_OUT + '\n\t#include <opaque_fragment>');
    PATCHED = { v, f };
  }
  shader.vertexShader = PATCHED.v; shader.fragmentShader = PATCHED.f;
  const u = this.userData.chU;
  Object.assign(shader.uniforms, SH, { uChFlash: u.flash, uChFill: u.fill, uChRimK: u.rimK, uChEmis: u.emis, uChEnv: u.env, uChBlade: u.blade, uChBladeL: u.bladeL });
}
const cacheKey = () => 'charlook1';

/**
 * 캐릭터 재질 하나를 손본다(복제된 재질에만 부른다). kind: 'body'(뼈대가 있는 몸통) | 'gear'(무기·방패)
 * 돌려주는 값 = 이 재질만의 유니폼 { flash, fill, rimK, emis, env }
 */
export function dressMaterial(m, { kind, tag, look, lod, mesh }) {
  const u = { flash: { value: new THREE.Vector3() }, fill: { value: 0 }, rimK: { value: 1 }, emis: { value: 0 }, env: { value: kind === 'gear' ? LOOK.envGear : LOOK.envBody }, blade: { value: new THREE.Vector4(1, 0, 0, 1) }, bladeL: { value: new THREE.Vector4(0, 0, 1, 0) } };
  m.userData.chU = u;
  m.defines = { ...(m.defines || {}) };
  if (kind === 'body' && look && look.orm && m.map) {
    m.roughnessMap = m.metalnessMap = look.orm; m.roughness = 1; m.metalness = 1; m.aoMap = null;
    if (look.n && !lod) { m.normalMap = look.n; }       // 멀리 있는 다른 플레이어(LOD)는 GLB 의 작은 노멀을 그대로 쓴다
    if (m.normalScale) m.normalScale.multiplyScalar(LOOK.normal);
    m.defines.CH_ORM = '';
    u.emis.value = LOOK.emis[tag] || 0;
  } else if (kind === 'gear' && !m.map && !m.normalMap) {
    m.defines.CH_GEAR = '';
    if (/SwordBlade/.test(m.name) && mesh && mesh.geometry) {       // 주인공 검날: 폭 방향(둘째로 긴 축)과 반폭을 재서 넘긴다
      const g = mesh.geometry; if (!g.boundingBox) g.computeBoundingBox();
      const bb = g.boundingBox, sz = bb.getSize(new THREE.Vector3()), [al, ax] = ['x', 'y', 'z'].sort((a, b) => sz[b] - sz[a]);
      u.blade.value.set(ax === 'x' ? 1 : 0, ax === 'y' ? 1 : 0, ax === 'z' ? 1 : 0, Math.max(1e-4, sz[ax] * 0.5));
      const tipMax = Math.abs(bb.max[al]) >= Math.abs(bb.min[al]), k = (tipMax ? 1 : -1) / Math.max(1e-4, sz[al]), o = -(tipMax ? bb.min[al] : bb.max[al]) * k;      // 원점(쥐는 곳)에서 먼 끝이 칼끝
      u.bladeL.value.set(al === 'x' ? k : 0, al === 'y' ? k : 0, al === 'z' ? k : 0, o);
      m.defines.CH_BLADE = ''; m.roughness = Math.min(m.roughness, 0.2);
    }
  } else if (kind === 'gear' && /ShieldField/.test(m.name)) { m.metalness = 0.3; m.roughness = 0.46; }       // 문장이 그려진 방패 면은 칠한 철판
  m.onBeforeCompile = patch; m.customProgramCacheKey = cacheKey;
  m.needsUpdate = true;
  return u;
}

// ───────────────────────── 프레임마다 한 번: 엔진 값 따라가기·가려내기 준비·접지 그림자 ─────────────────────────
const REG = new Set();          // 살아 있는 캐릭터
const frustum = new THREE.Frustum(), pv = new THREE.Matrix4(), sph = new THREE.Sphere();
const state = { frame: -1, t: 0, engine: null, ready: false, hero: null };
const engineOf = () => { const g = typeof window !== 'undefined' ? window.__GAME__ : null; return (g && g.engine) || null; };
export function register(ch) { REG.add(ch); }
export function unregister(ch) { REG.delete(ch); if (state.hero === ch) state.hero = null; }

function frameSync() {
  const e = state.engine || (state.engine = engineOf());
  if (e) { const f = e.renderer.info.render.frame; if (f === state.frame) return; state.frame = f; }
  else { const now = performance.now(); if (now - state.t < 4) return; state.t = now; }
  SH.uChRimPow.value = LOOK.rimPow; SH.uChDye.value.fromArray(LOOK.dye);
  if (e) {
    const night = (e.mood && e.mood.night) || 0, k = LOOK.rim * (1 + night * LOOK.rimNight), c = e.hemi.color;
    SH.uChRim.value.set(c.r * k, c.g * k, c.b * k);
    pv.multiplyMatrices(e.camera.projectionMatrix, e.camera.matrixWorldInverse); frustum.setFromProjectionMatrix(pv); state.ready = true;
    // 주인공: 보조광과 조금 센 테두리광
    const g = window.__GAME__.game, hero = (g && g.P && g.P.ch) || null;
    if (hero !== state.hero) {
      if (state.hero && state.hero.look) state.hero.look.setHero(false);
      state.hero = hero; if (hero && hero.look) hero.look.setHero(true);
    }
    if (hero && hero.look) hero.look.fill(LOOK.heroFill * (1 + night * 0.6), LOOK.heroRim);
  }
  updateBlobs();
}
/** 이 캐릭터가 화면(그림자가 닿는 여유 포함) 안에 있는가 */
function inView(ch) {
  if (!LOOK.cull || !state.ready || ch === state.hero) return true;
  const h = ch.height; sph.center.copy(ch.root.position); sph.center.y += h * 0.5; sph.radius = h * 1.9 + 0.8;
  return frustum.intersectsSphere(sph);
}

// ── 접지 그림자: 발밑의 부드러운 어두운 타원. 인스턴싱으로 한 번에 그린다.
// 불투명 목록(지면 뒤·캐릭터 앞 순서)에서 곱하기 혼합으로 그려 캐릭터 몸에는 묻지 않는다.
const BLOB_MAX = 192;
let blob = null;
function makeBlob() {
  const g = new THREE.InstancedBufferGeometry(); const q = new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2);
  g.index = q.index; g.attributes.position = q.attributes.position; g.attributes.uv = q.attributes.uv;
  const a = new THREE.InstancedBufferAttribute(new Float32Array(BLOB_MAX * 4), 4), b = new THREE.InstancedBufferAttribute(new Float32Array(BLOB_MAX * 4), 4);
  a.setUsage(THREE.DynamicDrawUsage); b.setUsage(THREE.DynamicDrawUsage); g.setAttribute('iPosR', a); g.setAttribute('iAux', b); g.instanceCount = 0;
  const mat = new THREE.ShaderMaterial({
    uniforms: { uK: { value: LOOK.blob } },
    vertexShader: /* glsl */`attribute vec4 iPosR, iAux; varying vec2 vUv; varying float vA;
      void main() { vUv = uv * 2.0 - 1.0; float c = cos( iAux.y ), s = sin( iAux.y ); vec2 p = vec2( position.x * iAux.z, position.z ) * iPosR.w;
        vec3 w = vec3( iPosR.x + p.x * c + p.y * s, iPosR.y, iPosR.z - p.x * s + p.y * c );
        vec4 mv = viewMatrix * vec4( w, 1.0 ); gl_Position = projectionMatrix * mv;
        // 낮은 단(제단 바닥판 따위) 위에서도 보이게 깊이만 카메라 쪽으로 조금 당긴다
        vec4 near = projectionMatrix * vec4( mv.xy, mv.z + 0.9, 1.0 ); gl_Position.z = near.z / near.w * gl_Position.w;
        vA = iAux.x * ( 1.0 - smoothstep( 70.0, 120.0, - mv.z ) ); }`,
    fragmentShader: /* glsl */`uniform float uK; varying vec2 vUv; varying float vA;
      void main() { float d = length( vUv ); float a = 1.0 - smoothstep( 0.0, 1.0, d ); a = a * a * ( 3.0 - 2.0 * a ) * vA * uK; if ( a < 0.004 ) discard;
        gl_FragColor = vec4( vec3( 1.0 - a ), 1.0 ); }`,
    transparent: false, depthWrite: false, depthTest: true, fog: false, toneMapped: false,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.DstColorFactor, blendDst: THREE.ZeroFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,   // 바탕색 × (1 - 짙기)
  });
  const m = new THREE.Mesh(g, mat); m.frustumCulled = false; m.renderOrder = 0.5; m.name = 'CharBlobs'; m.castShadow = false; m.receiveShadow = false;
  m.userData.a = a; m.userData.b = b;
  return m;
}
function updateBlobs() {
  if (LOOK.blob <= 0) { if (blob) blob.visible = false; return; }
  let scene = blob && blob.parent, n = 0;
  if (!blob) blob = makeBlob();
  const A = blob.userData.a.array, B = blob.userData.b.array;
  for (const ch of REG) {
    const r = ch.root; if (!r.parent || !r.visible || !ch.model.visible || ch.opacity <= 0.02 || n >= BLOB_MAX) continue;
    if (!scene) { let p = r.parent; while (p.parent) p = p.parent; scene = p; scene.add(blob); }
    const i = n * 4, rad = ch.height * LOOK.blobSize * (LOOK.blobWide[ch.tag] || 1);
    A[i] = r.position.x; A[i + 1] = r.position.y + 0.035; A[i + 2] = r.position.z; A[i + 3] = rad;
    B[i] = ch.opacity; B[i + 1] = r.rotation.y; B[i + 2] = 1.18; B[i + 3] = 0; n++;
  }
  blob.geometry.instanceCount = n; blob.visible = n > 0; blob.material.uniforms.uK.value = LOOK.blob;
  if (n > 0) { blob.userData.a.needsUpdate = true; blob.userData.b.needsUpdate = true; }
}

/** 캐릭터 하나의 룩 상태(재질 유니폼 묶음). chars.js 의 Character 가 하나씩 가진다 */
export class CharLook {
  constructor() { this.us = []; this.hero = false; }
  add(u) { this.us.push(u); }
  flash(k) { const v = k * LOOK.flash; for (const u of this.us) u.flash.value.set(v, v * 0.9, v * 0.8); }
  setHero(on) { this.hero = on; if (!on) for (const u of this.us) { u.fill.value = 0; u.rimK.value = 1; } }
  fill(f, rim) { for (const u of this.us) { u.fill.value = f; u.rimK.value = rim; } }
}
export const CharFrame = { sync: frameSync, inView };
