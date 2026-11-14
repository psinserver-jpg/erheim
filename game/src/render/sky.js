// 하늘: 절차적으로 그린 구름 낀 해질녘 하늘. 화면 배경(돔)과 환경맵(PMREM)에 같은 셰이더를 쓴다.
//  · 분위기(구역)마다 환경맵을 미리 한 벌씩 구워 두고, 분위기가 섞일 때는 구워 둔 것들을 가중 평균해 한 장으로 만든다(다시 굽지 않는다).
import * as THREE from 'three';

const SKY_VERT = /* glsl */`
varying vec3 vDir;
void main() {
	vDir = position;
	// 방향만 쓴다(카메라를 따라다닐 필요가 없다). 깊이는 가장 먼 곳에 붙인다
	vec4 p = projectionMatrix * vec4( mat3( viewMatrix ) * position, 1.0 );
	gl_Position = p.xyww;
}
`;
const SKY_FRAG = /* glsl */`
uniform vec3 uZenith, uHorizon, uGround, uSunCol, uCloudLit, uCloudDark, uHaze, uHazeSun, uSunDir;
uniform float uCloud, uTime, uGlow, uScreen, uDim;   // uScreen: 1=화면 배경, 0=환경맵 굽기. uDim: 화면 배경만 어둡게(반사용 하늘은 밝게 둔다)
varying vec3 vDir;
float hash( vec2 p ) { vec3 p3 = fract( vec3( p.xyx ) * 0.1031 ); p3 += dot( p3, p3.yzx + 33.33 ); return fract( ( p3.x + p3.y ) * p3.z ); }
float vnoise( vec2 p ) { vec2 i = floor( p ), f = fract( p ); f = f * f * ( 3.0 - 2.0 * f );
	return mix( mix( hash( i ), hash( i + vec2( 1.0, 0.0 ) ), f.x ), mix( hash( i + vec2( 0.0, 1.0 ) ), hash( i + vec2( 1.0, 1.0 ) ), f.x ), f.y ); }
float fbm( vec2 p ) { float a = 0.5, s = 0.0; for ( int i = 0; i < 5; i ++ ) { s += a * vnoise( p ); p = p * 2.03 + vec2( 17.1, 3.7 ); a *= 0.5; } return s; }
void main() {
	vec3 d = normalize( vDir ); float h = d.y;
	vec2 sunH = normalize( uSunDir.xz );
	float sd = max( dot( d, uSunDir ), 0.0 );
	float sdh = max( dot( normalize( d.xz + vec2( 1e-5 ) ), sunH ), 0.0 );
	// 바탕: 지평선 → 천정(차가운 청회색). 지평선은 해 쪽만 따뜻하고 반대편은 천정빛에 가깝다(그늘이 차갑게 남도록)
	vec3 hor = mix( uZenith * 1.25, uHorizon, 0.18 + 0.82 * pow( sdh, 1.6 ) );
	vec3 col = mix( hor, uZenith, pow( clamp( h, 0.0, 1.0 ), 0.42 ) );
	col += uSunCol * ( pow( sd, 5.0 ) * 1.1 + pow( sd, 40.0 ) * 2.6 ) * uGlow;
	// 구름층: 평면에 투영한 잡음. 해 쪽 가장자리는 빛을 받고 반대편은 어둡다
	vec2 cuv = d.xz / ( max( h, 0.0 ) + 0.16 ) * 0.85 + vec2( uTime * 0.006, uTime * 0.0035 );
	float n = fbm( cuv ), n2 = fbm( cuv + sunH * 0.22 );
	float cov = smoothstep( 0.82 - uCloud, 1.30 - uCloud, n );
	float lit = clamp( 0.55 + ( n - n2 ) * 2.6, 0.0, 1.0 );
	vec3 cc = mix( uCloudDark, uCloudLit, lit * ( 0.35 + 0.65 * pow( sdh, 1.5 ) ) );
	cc += uSunCol * pow( sd, 8.0 ) * 1.4 * uGlow * ( 1.0 - cov * 0.5 );
	col = mix( col, cc, cov * smoothstep( 0.0, 0.10, h ) * 0.92 );
	// 지평선 연무: 먼 안개와 같은 색으로 모인다
	vec3 haze = mix( uHaze, uHazeSun, sdh * sdh * sdh );
	if ( uScreen > 0.5 ) {
		col = mix( col * uDim, haze, exp( - max( h, 0.0 ) * 7.0 ) );
		if ( h < 0.0 ) col = haze;
	} else {
		// 환경맵: 지평선 아래는 땅의 반사색(금속 아랫면·그늘진 면이 받는 빛)
		col = mix( col, uGround, smoothstep( 0.04, - 0.10, h ) );
	}
	gl_FragColor = vec4( col, 1.0 );
}
`;
const BLEND_FRAG = /* glsl */`
uniform samplerCube env0, env1, env2, env3, env4;
uniform float w[ 5 ];
uniform float lod, gain;
varying vec3 vWorldDirection;
void main() {
	vec3 d = normalize( vWorldDirection );
	vec3 c = textureLod( env0, d, lod ).rgb * w[ 0 ];
	if ( w[ 1 ] > 0.0 ) c += textureLod( env1, d, lod ).rgb * w[ 1 ];
	if ( w[ 2 ] > 0.0 ) c += textureLod( env2, d, lod ).rgb * w[ 2 ];
	if ( w[ 3 ] > 0.0 ) c += textureLod( env3, d, lod ).rgb * w[ 3 ];
	if ( w[ 4 ] > 0.0 ) c += textureLod( env4, d, lod ).rgb * w[ 4 ];
	gl_FragColor = vec4( c * gain, 1.0 );
}
`;

const V3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);
const SKY_KEYS = ['zenith', 'horizon', 'ground', 'sunGlow', 'cloudLit', 'cloudDark', 'haze', 'hazeSun'];   // 분위기 값 → 유니폼
const SKY_UNI = ['uZenith', 'uHorizon', 'uGround', 'uSunCol', 'uCloudLit', 'uCloudDark', 'uHaze', 'uHazeSun'];

/**
 * @param renderer  WebGLRenderer
 * @param sunDir    해 쪽을 가리키는 단위 벡터
 * @returns { dome(장면에 넣을 하늘 돔), apply(v, time)(섞인 분위기 값 적용), bake(ids, presets)(분위기별 환경맵 굽기), blend(weights)(가중 평균), envTexture }
 */
export function createSky(renderer, sunDir) {
  const uniforms = { uSunDir: { value: sunDir.clone() }, uCloud: { value: 0.6 }, uTime: { value: 0 }, uGlow: { value: 1 }, uScreen: { value: 1 }, uDim: { value: 0.55 } };
  for (const k of SKY_UNI) uniforms[k] = { value: new THREE.Vector3(0.3, 0.3, 0.3) };
  const mat = new THREE.ShaderMaterial({ name: 'ErhSky', uniforms, vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: THREE.BackSide, depthWrite: false, fog: false, toneMapped: false });
  const geo = new THREE.SphereGeometry(1, 40, 20);
  const dome = new THREE.Mesh(geo, mat); dome.name = 'sky'; dome.frustumCulled = false; dome.renderOrder = 900; dome.matrixAutoUpdate = false;   // 불투명 중 맨 마지막에 그려 가려진 곳은 건너뛴다
  const setVals = (v, time) => {
    SKY_KEYS.forEach((k, i) => { const a = v[k]; uniforms[SKY_UNI[i]].value.set(a[0], a[1], a[2]); });
    uniforms.uCloud.value = v.cloud; uniforms.uGlow.value = v.glow; uniforms.uTime.value = time;
  };

  // ---- 환경맵 굽기
  const pm = new THREE.PMREMGenerator(renderer);
  const bakeScene = new THREE.Scene(); const bakeDome = new THREE.Mesh(geo, mat); bakeDome.frustumCulled = false; bakeScene.add(bakeDome);
  const baked = [];   // 분위기 순서대로 구운 PMREM(WebGLCubeRenderTarget)
  let out = null, blendMat = null, cubeCam = null, box = null, maxLod = 0;
  const lastW = [];
  const gains = { spec: 1.0, diff: 0.5 };   // 환경맵 세기: 또렷한 반사 / 퍼진 주변광
  function bake(presets) {
    for (const t of baked) t.dispose(); baked.length = 0;
    uniforms.uScreen.value = 0;
    for (const p of presets) { setVals(p, 0); baked.push(pm.fromScene(bakeScene, 0, 0.1, 50)); }
    uniforms.uScreen.value = 1;
    const first = baked[0];
    maxLod = first.texture.mipmaps.length - 1;
    if (!out) {
      // 섞은 결과를 담을 PMREM(구운 것과 같은 꼴: 밉 단계마다 거칠기별 반사가 들어 있다)
      out = new THREE.WebGLCubeRenderTarget(first.width, { minFilter: THREE.LinearMipmapLinearFilter, generateMipmaps: false, type: THREE.HalfFloatType, colorSpace: THREE.LinearSRGBColorSpace, depthBuffer: false });
      for (let lod = 0; lod <= maxLod; lod++) out.texture.mipmaps.push({ width: first.width >> lod, height: first.width >> lod });
      out.texture.name = 'ErhEnv'; out.texture.isPMREMTexture = true;
      const u = { w: { value: [1, 0, 0, 0, 0] }, lod: { value: 0 }, gain: { value: 1 } };
      for (let i = 0; i < 5; i++) u['env' + i] = { value: null };
      blendMat = new THREE.ShaderMaterial({ name: 'ErhEnvBlend', uniforms: u, vertexShader: THREE.ShaderChunk.cube_vert, fragmentShader: BLEND_FRAG, side: THREE.BackSide, blending: THREE.NoBlending, depthTest: false, depthWrite: false });
      cubeCam = new THREE.CubeCamera(1, 10, null);
      box = new THREE.Mesh(new THREE.BoxGeometry(5, 5, 5), blendMat);
    }
    for (let i = 0; i < 5; i++) blendMat.uniforms['env' + i].value = (baked[i] || baked[0]).texture;
    lastW.length = 0;
  }
  /** weights: 분위기 순서대로의 가중치(합 1). 지난번과 거의 같으면 건너뛴다. */
  function blend(weights, force = false) {
    if (!out) return false;
    let diff = 0; for (let i = 0; i < 5; i++) diff += Math.abs((weights[i] || 0) - (lastW[i] ?? -1));
    if (!force && diff < 0.012) return false;
    const w = blendMat.uniforms.w.value; for (let i = 0; i < 5; i++) { w[i] = i < baked.length ? (weights[i] || 0) : 0; lastW[i] = weights[i] || 0; }
    const prevRT = renderer.getRenderTarget(), prevFace = renderer.getActiveCubeFace(), prevMip = renderer.getActiveMipmapLevel();
    const autoClear = renderer.autoClear; renderer.autoClear = false;
    for (let lod = 0; lod <= maxLod; lod++) {
      blendMat.uniforms.lod.value = lod;
      // 또렷한 반사(낮은 밉 = 매끈한 금속)는 그대로, 퍼진 빛(높은 밉 = 주변광)은 약하게 → 금속은 하늘을 밝게 비추되 그늘은 떡지지 않는다
      const t = maxLod > 0 ? lod / maxLod : 0; blendMat.uniforms.gain.value = t < 0.6 ? gains.spec : gains.spec + (gains.diff - gains.spec) * (t - 0.6) / 0.4;
      cubeCam.renderTarget = out; cubeCam.activeMipmapLevel = lod;
      const size = out.width >> lod; out.viewport.set(0, 0, size, size);   // 렌더러는 밉 단계에 맞춰 뷰포트를 줄여 주지 않는다
      cubeCam.update(renderer, box);
    }
    out.viewport.set(0, 0, out.width, out.height);
    renderer.autoClear = autoClear;
    renderer.setRenderTarget(prevRT, prevFace, prevMip);
    return true;
  }
  return {
    dome, material: mat, uniforms, apply: setVals, bake, blend, gains,
    get envTexture() { return out ? out.texture : null; },
    dispose() { for (const t of baked) t.dispose(); if (out) out.dispose(); pm.dispose(); geo.dispose(); mat.dispose(); },
  };
}
