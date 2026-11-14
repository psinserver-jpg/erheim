// 후처리: 장면(HDR, MSAA) → 주변광 차폐(깊이 기반, 절반 해상도) → 블룸(문턱값·상한) → 자동 노출 억제
//        → 톤 매핑·색 보정·선명화·비네트·그레인 → FXAA → 화면
// EffectComposer 를 쓰지 않고 패스를 직접 돌린다(깊이 텍스처 공유, 패스 수 최소화).
import * as THREE from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';

const VERT = /* glsl */`varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4( position.xy, 0.0, 1.0 ); }`;

// 깊이 → 뷰 공간 복원(공통). uProj = (1/P00, 1/P11, near, far)
const DEPTH_GLSL = /* glsl */`
uniform sampler2D tDepth; uniform vec4 uProj;
float viewZ( vec2 uv ) { float d = texture2D( tDepth, uv ).x; return uProj.z * uProj.w / ( ( uProj.w - uProj.z ) * d - uProj.w ); }
vec3 viewPos( vec2 uv, float z ) { return vec3( ( uv * 2.0 - 1.0 ) * uProj.xy * - z, z ); }
`;

// ── 주변광 차폐: 깊이에서 위치·법선을 되살려 반구 안의 가림을 센다. 출력 R=밝기(1=안 가림), G=선형 깊이(0~1)
const AO_FRAG = /* glsl */`
${DEPTH_GLSL}
uniform vec2 uTexel; uniform float uRadius, uBias, uProjScale, uMaxPx, uPower;
varying vec2 vUv;
float ign( vec2 p ) { return fract( 52.9829189 * fract( dot( p, vec2( 0.06711056, 0.00583715 ) ) ) ); }
vec2 snap( vec2 uv ) { return ( floor( uv / uTexel ) + 0.5 ) * uTexel; }   // 깊이 텍셀 한가운데로(절반 해상도 화소의 중심은 텍셀 네 개의 모서리라 어느 텍셀이 읽힐지 흔들린다)
void main() {
	vec2 uv0 = snap( vUv - uTexel * 0.5 );
	float z = viewZ( uv0 );
	float lin = - z / uProj.w;
	if ( lin > 0.97 ) { gl_FragColor = vec4( 1.0, 1.0, 0.0, 1.0 ); return; }
	vec3 P = viewPos( uv0, z );
	// 법선: 좌우·상하 가운데 깊이 차가 작은 쪽 이웃으로 구한다(물체 가장자리에서 튀지 않게)
	vec2 dx = vec2( uTexel.x, 0.0 ), dy = vec2( 0.0, uTexel.y );
	float zr = viewZ( uv0 + dx ), zl = viewZ( uv0 - dx ), zu = viewZ( uv0 + dy ), zd = viewZ( uv0 - dy );
	vec3 ddx = abs( zr - z ) < abs( z - zl ) ? viewPos( uv0 + dx, zr ) - P : P - viewPos( uv0 - dx, zl );
	vec3 ddy = abs( zu - z ) < abs( z - zd ) ? viewPos( uv0 + dy, zu ) - P : P - viewPos( uv0 - dy, zd );
	vec3 N = normalize( cross( ddx, ddy ) );
	float rPx = min( uRadius * uProjScale / - z, uMaxPx );
	float rot = ign( gl_FragCoord.xy ) * 6.2831853;
	float r2 = uRadius * uRadius, occ = 0.0;
	for ( int i = 0; i < NS; i ++ ) {
		float a = ( float( i ) + 0.5 ) / float( NS );
		float ang = a * 6.2831853 * TURNS + rot;
		vec2 suv = snap( uv0 + vec2( cos( ang ), sin( ang ) ) * ( a * rPx ) * uTexel );
		if ( suv.x < 0.0 || suv.x > 1.0 || suv.y < 0.0 || suv.y > 1.0 ) continue;   // 화면 밖은 모른다(가장자리 깊이를 늘려 쓰면 화면 위쪽에 띠가 생긴다)
		float sz = viewZ( suv );
		vec3 v = viewPos( suv, sz ) - P;
		float vv = dot( v, v );
		float f = max( 1.0 - vv / r2, 0.0 );
		occ += f * max( dot( v, N ) * inversesqrt( vv + 1e-5 ) - uBias, 0.0 );
	}
	float ao = clamp( 1.0 - occ / float( NS ) * uPower, 0.0, 1.0 );
	gl_FragColor = vec4( ao, lin, 0.0, 1.0 );
}
`;
// 깊이를 지키는 한 방향 흐림(가로·세로 한 번씩)
const AO_BLUR_FRAG = /* glsl */`
uniform sampler2D tAO; uniform vec2 uDir; varying vec2 vUv;
void main() {
	vec2 c = texture2D( tAO, vUv ).rg;
	float sum = c.r, ws = 1.0;
	for ( int i = 1; i <= 4; i ++ ) {
		float g = exp( - float( i * i ) / 9.0 );
		for ( int s = -1; s <= 1; s += 2 ) {
			vec2 t = texture2D( tAO, vUv + uDir * float( i * s ) ).rg;
			float w = g * max( 1.0 - abs( t.g - c.g ) / max( c.g, 1e-4 ) * 45.0, 0.0 );
			sum += t.r * w; ws += w;
		}
	}
	gl_FragColor = vec4( sum / ws, c.g, 0.0, 1.0 );
}
`;

// ── 블룸: 밝은 것만 걸러(부드러운 문턱) 절반씩 줄였다가 다시 키우며 더한다. 알파에는 화면 평균 밝기(로그)를 실어 자동 노출에 쓴다
const BLOOM_PRE_FRAG = /* glsl */`
uniform sampler2D tScene; uniform vec2 uTexel; uniform float uThreshold, uKnee, uClamp, uExposure; varying vec2 vUv;
float lum( vec3 c ) { return dot( c, vec3( 0.2126, 0.7152, 0.0722 ) ); }
vec3 tap( vec2 o ) { return min( max( texture2D( tScene, vUv + o * uTexel ).rgb, vec3( 0.0 ) ) * uExposure, vec3( uClamp ) ); }   // 노출을 곱한 밝기로 거른다(노출이 달라도 문턱의 뜻이 같게)
void main() {
	vec3 a = tap( vec2( -1.0, -1.0 ) ), b = tap( vec2( 1.0, -1.0 ) ), c = tap( vec2( -1.0, 1.0 ) ), d = tap( vec2( 1.0, 1.0 ) );
	float la = lum( a ), lb = lum( b ), lc = lum( c ), ld = lum( d );
	float wa = 1.0 / ( 1.0 + la ), wb = 1.0 / ( 1.0 + lb ), wc = 1.0 / ( 1.0 + lc ), wd = 1.0 / ( 1.0 + ld );   // 한두 화소짜리 반짝임이 번쩍이지 않게
	vec3 col = ( a * wa + b * wb + c * wc + d * wd ) / ( wa + wb + wc + wd );
	float br = max( col.r, max( col.g, col.b ) );
	float rq = clamp( br - uThreshold + uKnee, 0.0, 2.0 * uKnee ); rq = rq * rq / ( 4.0 * uKnee + 1e-4 );
	col *= max( rq, br - uThreshold ) / max( br, 1e-4 );
	gl_FragColor = vec4( col, log2( max( ( la + lb + lc + ld ) * 0.25, 0.002 ) ) );
}
`;
const BLOOM_DOWN_FRAG = /* glsl */`
uniform sampler2D tSrc; uniform vec2 uTexel; varying vec2 vUv;
void main() {
	vec4 s = texture2D( tSrc, vUv ) * 4.0;
	s += texture2D( tSrc, vUv + uTexel * vec2( -1.0, -1.0 ) ) + texture2D( tSrc, vUv + uTexel * vec2( 1.0, -1.0 ) ) + texture2D( tSrc, vUv + uTexel * vec2( -1.0, 1.0 ) ) + texture2D( tSrc, vUv + uTexel * vec2( 1.0, 1.0 ) );
	gl_FragColor = s * 0.125;
}
`;
const BLOOM_UP_FRAG = /* glsl */`
uniform sampler2D tLow, tHigh; uniform vec2 uTexel; uniform float uSpread; varying vec2 vUv;
void main() {
	vec2 o = uTexel * uSpread;
	vec3 s = texture2D( tLow, vUv ).rgb * 4.0;
	s += ( texture2D( tLow, vUv + vec2( -o.x, 0.0 ) ).rgb + texture2D( tLow, vUv + vec2( o.x, 0.0 ) ).rgb + texture2D( tLow, vUv + vec2( 0.0, -o.y ) ).rgb + texture2D( tLow, vUv + vec2( 0.0, o.y ) ).rgb ) * 2.0;
	s += texture2D( tLow, vUv + vec2( -o.x, -o.y ) ).rgb + texture2D( tLow, vUv + vec2( o.x, -o.y ) ).rgb + texture2D( tLow, vUv + vec2( -o.x, o.y ) ).rgb + texture2D( tLow, vUv + vec2( o.x, o.y ) ).rgb;
	gl_FragColor = vec4( texture2D( tHigh, vUv ).rgb + s / 16.0, 1.0 );
}
`;
// 자동 노출 억제: 화면이 지나치게 밝아지면(레이드의 불길) 노출을 낮춘다. 올리지는 않는다(어두운 구역은 어둡게 둔다)
const ADAPT_FRAG = /* glsl */`
uniform sampler2D tLum, tPrev; uniform float uKey, uMin, uPower, uDt, uReset; varying vec2 vUv;
void main() {
	float s = 0.0;
	for ( int j = 0; j < 3; j ++ ) for ( int i = 0; i < 5; i ++ ) s += texture2D( tLum, vec2( ( float( i ) + 0.5 ) / 5.0, ( float( j ) + 0.5 ) / 3.0 ) ).a;
	float L = exp2( s / 15.0 );
	float target = clamp( pow( uKey / max( L, 1e-4 ), uPower ), uMin, 1.0 );
	float prev = mix( texture2D( tPrev, vec2( 0.5 ) ).r, target, uReset );
	float e = mix( prev, target, 1.0 - exp( - uDt * ( target < prev ? 5.0 : 1.2 ) ) );
	gl_FragColor = vec4( e, L, 0.0, 1.0 );
}
`;

// ── 마무리: AO 적용 → 블룸 더하기 → 노출 → 톤 매핑 → 색 보정 → 비네트·그레인·번쩍임. 출력은 sRGB(8비트)
const FINAL_FRAG = /* glsl */`
${DEPTH_GLSL}
uniform sampler2D tScene, tAO, tBloom, tExpo;
uniform vec2 uTexel, uHalfRes;
uniform float uExposure, uBloom, uBloomCap, uAO, uAOOn, uBloomOn, uSharp, uVig, uSat, uContrast, uFlash, uGrain, uTime, uLook, uDebug, uToe;
uniform vec3 uTint, uFlashCol, uShadowTint, uHighTint;
varying vec2 vUv;
float lum( vec3 c ) { return dot( c, vec3( 0.2126, 0.7152, 0.0722 ) ); }
float hash12( vec2 p ) { vec3 p3 = fract( vec3( p.xyx ) * 0.1031 ); p3 += dot( p3, p3.yzx + 33.33 ); return fract( ( p3.x + p3.y ) * p3.z ); }

// AgX(Blender·Filament 계열). 밝은 불빛이 원색 덩어리로 떡지지 않고 자연스럽게 흰빛으로 넘어간다. 뒤에 '룩'으로 대비·채도를 되살린다
const mat3 REC2020_TO_SRGB = mat3( vec3( 1.6605, -0.1246, -0.0182 ), vec3( -0.5876, 1.1329, -0.1006 ), vec3( -0.0728, -0.0083, 1.1187 ) );
const mat3 SRGB_TO_REC2020 = mat3( vec3( 0.6274, 0.0691, 0.0164 ), vec3( 0.3293, 0.9195, 0.0880 ), vec3( 0.0433, 0.0113, 0.8956 ) );
const mat3 AGX_IN = mat3( vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ), vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ), vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 ) );
const mat3 AGX_OUT = mat3( vec3( 1.1271005818144368, -0.1413297634984383, -0.14132976349843826 ), vec3( -0.11060664309660323, 1.157823702216272, -0.11060664309660294 ), vec3( -0.016493938717834573, -0.016493938717834257, 1.2519364065950405 ) );
vec3 agxCurve( vec3 x ) { vec3 x2 = x * x, x4 = x2 * x2; return 15.5 * x4 * x2 - 40.14 * x4 * x + 31.96 * x4 - 6.868 * x2 * x + 0.4298 * x2 + 0.1191 * x - 0.00232; }
vec3 toneAgX( vec3 c ) {
	c = AGX_IN * ( SRGB_TO_REC2020 * c );
	c = clamp( ( log2( max( c, 1e-10 ) ) + 12.47393 ) / 16.5, 0.0, 1.0 );
	c = agxCurve( c );
	// 룩: 대비(거듭제곱)와 채도
	float l = lum( c );
	c = pow( max( c, 0.0 ), vec3( uLook ) );
	c = l + ( c - l ) * ( 1.0 + ( uLook - 1.0 ) * 1.1 );
	c = AGX_OUT * c;
	c = pow( max( c, 0.0 ), vec3( 2.2 ) );
	return clamp( REC2020_TO_SRGB * c, 0.0, 1.0 );
}
vec3 toSRGB( vec3 c ) { return mix( c * 12.92, 1.055 * pow( max( c, 1e-5 ), vec3( 1.0 / 2.4 ) ) - 0.055, step( 0.0031308, c ) ); }

void main() {
	vec3 c = texture2D( tScene, vUv ).rgb;
	// 약한 선명화(밝기 기준, 후광이 생기지 않게 제한)
	if ( uSharp > 0.0 ) {
		vec3 n = texture2D( tScene, vUv + vec2( 0.0, uTexel.y ) ).rgb + texture2D( tScene, vUv - vec2( 0.0, uTexel.y ) ).rgb + texture2D( tScene, vUv + vec2( uTexel.x, 0.0 ) ).rgb + texture2D( tScene, vUv - vec2( uTexel.x, 0.0 ) ).rgb;
		float lc = lum( c ), ln = lum( n ) * 0.25;
		float tc = lc / ( 1.0 + lc ), tn = ln / ( 1.0 + ln );
		float d = clamp( ( tc - tn ) * uSharp, -0.06, 0.06 );
		float t2 = clamp( tc + d, 0.0, 0.98 );
		c *= ( t2 / ( 1.0 - t2 ) ) / max( lc, 1e-4 );
	}
	// 주변광 차폐: 절반 해상도 결과를 깊이에 맞춰 키운다. 스스로 빛나는 것(불·마법)은 덜 어둡게
	float ao = 1.0;
	if ( uAOOn > 0.5 ) {
		float z0 = - viewZ( vUv ) / uProj.w;
		vec2 hp = vUv * uHalfRes - 0.5; vec2 f = fract( hp ); vec2 base = ( floor( hp ) + 0.5 ) / uHalfRes; vec2 st = 1.0 / uHalfRes;
		vec2 a00 = texture2D( tAO, base ).rg, a10 = texture2D( tAO, base + vec2( st.x, 0.0 ) ).rg, a01 = texture2D( tAO, base + vec2( 0.0, st.y ) ).rg, a11 = texture2D( tAO, base + st ).rg;
		vec4 w = vec4( ( 1.0 - f.x ) * ( 1.0 - f.y ), f.x * ( 1.0 - f.y ), ( 1.0 - f.x ) * f.y, f.x * f.y );
		w *= max( 1.0 - abs( vec4( a00.g, a10.g, a01.g, a11.g ) - z0 ) / max( z0, 1e-4 ) * 45.0, 0.02 );
		ao = dot( vec4( a00.r, a10.r, a01.r, a11.r ), w ) / ( w.x + w.y + w.z + w.w );
		ao = mix( 1.0, ao, uAO * ( 1.0 - smoothstep( 1.2, 3.2, max( c.r, max( c.g, c.b ) ) * uExposure ) ) );
		c *= ao;
	}
	c *= uExposure;
	if ( uBloomOn > 0.5 ) {
		vec3 b = texture2D( tBloom, vUv ).rgb * uBloom;
		c += b / ( 1.0 + max( b.r, max( b.g, b.b ) ) * uBloomCap );   // 상한: 불길이 겹쳐도 화면이 하얗게 날아가지 않게
	}
	c *= texture2D( tExpo, vec2( 0.5 ) ).r;
	c = toneAgX( c );
	// 색 보정(표시 공간): 어두운 곳은 차갑게, 밝은 곳은 따뜻하게 → 분위기 색조 → 채도·대비
	float l = lum( c );
	c *= mix( uShadowTint, uHighTint, smoothstep( 0.0, 0.65, l ) );
	c *= uTint;
	l = lum( c );
	c = l + ( c - l ) * uSat;
	c = mix( c, c * c * ( 3.0 - 2.0 * c ), uContrast );
	c = max( c - uToe, 0.0 ) / ( 1.0 - uToe );
	vec2 q = vUv - 0.5; float v = smoothstep( 0.92, 0.28, length( q * vec2( 1.0, 0.86 ) ) );
	c *= mix( 1.0 - uVig, 1.0, v );
	c = mix( c, uFlashCol, uFlash );
	c = toSRGB( clamp( c, 0.0, 1.0 ) );
	// 필름 그레인(어두운 그러데이션의 띠 현상도 함께 가린다)
	float g = hash12( gl_FragCoord.xy + fract( uTime * 7.31 ) * 311.7 ) + hash12( gl_FragCoord.yx * 1.37 + fract( uTime * 3.17 ) * 173.3 ) - 1.0;
	c += g * uGrain * ( 0.35 + 0.65 * ( 1.0 - c ) );
	if ( uDebug > 0.5 ) c = vec3( ao );
	gl_FragColor = vec4( clamp( c, 0.0, 1.0 ), 1.0 );
}
`;

const mk = (frag, uniforms, defines = {}) => new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: frag, defines, depthTest: false, depthWrite: false, blending: THREE.NoBlending, toneMapped: false, fog: false });
const tex = (v = null) => ({ value: v });

export function createPost(renderer, W, H) {
  const HW = W >> 1, HH = H >> 1;
  const fsq = new FullScreenQuad(null);
  const draw = (mat, target) => { fsq.material = mat; renderer.setRenderTarget(target); fsq.render(renderer); };

  // ---- 렌더 타깃
  const depthTex = new THREE.DepthTexture(W, H); depthTex.type = THREE.UnsignedIntType; depthTex.minFilter = depthTex.magFilter = THREE.NearestFilter;
  const scene = new THREE.WebGLRenderTarget(W, H, { samples: 4, type: THREE.HalfFloatType, depthTexture: depthTex, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false });
  scene.texture.name = 'ErhScene';
  const aoOpt = { type: THREE.HalfFloatType, format: THREE.RGFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false, generateMipmaps: false };
  const aoA = new THREE.WebGLRenderTarget(HW, HH, aoOpt), aoB = new THREE.WebGLRenderTarget(HW, HH, aoOpt);
  const hdrOpt = { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false, generateMipmaps: false };
  const LEVELS = 6; const down = [], up = [];
  for (let i = 0, w = HW, h = HH; i < LEVELS; i++, w = Math.max(2, w >> 1), h = Math.max(2, h >> 1)) { down.push(new THREE.WebGLRenderTarget(w, h, hdrOpt)); if (i < LEVELS - 1) up.push(new THREE.WebGLRenderTarget(w, h, hdrOpt)); }
  const expo = [new THREE.WebGLRenderTarget(1, 1, { ...hdrOpt, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter }), new THREE.WebGLRenderTarget(1, 1, { ...hdrOpt, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter })];
  const ldr = new THREE.WebGLRenderTarget(W, H, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false, generateMipmaps: false });

  // ---- 재질
  const proj = new THREE.Vector4();
  const aoMat = mk(AO_FRAG, { tDepth: tex(depthTex), uProj: { value: proj }, uTexel: { value: new THREE.Vector2(1 / W, 1 / H) }, uRadius: { value: 1.2 }, uBias: { value: 0.1 }, uProjScale: { value: 1 }, uMaxPx: { value: 170 }, uPower: { value: 6.5 } }, { NS: 10, TURNS: '3.0' });
  const aoBlur = mk(AO_BLUR_FRAG, { tAO: tex(), uDir: { value: new THREE.Vector2() } });
  const preMat = mk(BLOOM_PRE_FRAG, { tScene: tex(scene.texture), uTexel: { value: new THREE.Vector2(1 / W, 1 / H) }, uThreshold: { value: 1.9 }, uKnee: { value: 0.6 }, uClamp: { value: 14 }, uExposure: { value: 1 } });
  const downMat = mk(BLOOM_DOWN_FRAG, { tSrc: tex(), uTexel: { value: new THREE.Vector2() } });
  const upMat = mk(BLOOM_UP_FRAG, { tLow: tex(), tHigh: tex(), uTexel: { value: new THREE.Vector2() }, uSpread: { value: 1.0 } });
  const adaptMat = mk(ADAPT_FRAG, { tLum: tex(down[LEVELS - 1].texture), tPrev: tex(), uKey: { value: 0.85 }, uMin: { value: 0.55 }, uPower: { value: 0.75 }, uDt: { value: 0.016 }, uReset: { value: 1 } });
  const finalMat = mk(FINAL_FRAG, {
    tScene: tex(scene.texture), tDepth: tex(depthTex), tAO: tex(aoA.texture), tBloom: tex(up[0].texture), tExpo: tex(expo[0].texture), uProj: { value: proj },
    uTexel: { value: new THREE.Vector2(1 / W, 1 / H) }, uHalfRes: { value: new THREE.Vector2(HW, HH) },
    uExposure: { value: 1 }, uBloom: { value: 0.5 }, uBloomCap: { value: 0.35 }, uAO: { value: 0.9 }, uAOOn: { value: 1 }, uBloomOn: { value: 1 }, uSharp: { value: 0.5 },
    uVig: { value: 0.3 }, uSat: { value: 1 }, uContrast: { value: 0.1 }, uToe: { value: 0 }, uFlash: { value: 0 }, uGrain: { value: 0.018 }, uTime: { value: 0 }, uLook: { value: 1.4 }, uDebug: { value: 0 },
    uTint: { value: new THREE.Vector3(1, 1, 1) }, uFlashCol: { value: new THREE.Vector3(1, 1, 1) }, uShadowTint: { value: new THREE.Vector3(0.96, 0.99, 1.05) }, uHighTint: { value: new THREE.Vector3(1.03, 1.0, 0.96) },
  });
  const fxaaFrag = FXAAShader.fragmentShader.replace('float _ContrastThreshold = 0.0312;', 'float _ContrastThreshold = 0.05;').replace('float _RelativeThreshold = 0.063;', 'float _RelativeThreshold = 0.1;').replace('float _SubpixelBlending = 1.0;', 'float _SubpixelBlending = 0.55;');
  const fxaaMat = mk(fxaaFrag, { tDiffuse: tex(ldr.texture), resolution: { value: new THREE.Vector2(1 / W, 1 / H) } });

  const cfg = { ao: true, bloom: true, fxaa: true, autoExposure: true, samples: 4, aoSamples: 10 };
  let expoI = 0, first = true;

  const white = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1); white.needsUpdate = true;
  const api = {
    cfg, targets: { scene, aoA, aoB, down, up, ldr, expo }, depthTexture: depthTex,
    ao: aoMat.uniforms, bloomPre: preMat.uniforms, bloomUp: upMat.uniforms, adapt: adaptMat.uniforms, final: finalMat.uniforms,
    /** MSAA 표본 수(0·2·4)와 AO 표본 수를 바꾼다 */
    setSamples(n) { if (scene.samples !== n) { scene.samples = n; scene.dispose(); cfg.samples = n; } },
    setAoSamples(n) { if (aoMat.defines.NS !== n) { aoMat.defines.NS = n; aoMat.needsUpdate = true; cfg.aoSamples = n; } },
    render(sceneObj, camera, dt) {
      const prevAuto = renderer.autoClear; renderer.autoClear = true;
      renderer.setRenderTarget(scene); renderer.render(sceneObj, camera);
      renderer.autoClear = false;
      const pe = camera.projectionMatrix.elements; proj.set(1 / pe[0], 1 / pe[5], camera.near, camera.far);
      const F = finalMat.uniforms;
      if (cfg.ao) {
        aoMat.uniforms.uProjScale.value = 0.5 * H * pe[5];   // 깊이 1m 에서 1m 가 차지하는 화소 수(전체 해상도 기준, uTexel 과 짝)
        draw(aoMat, aoA);
        aoBlur.uniforms.tAO.value = aoA.texture; aoBlur.uniforms.uDir.value.set(1 / HW, 0); draw(aoBlur, aoB);
        aoBlur.uniforms.tAO.value = aoB.texture; aoBlur.uniforms.uDir.value.set(0, 1 / HH); draw(aoBlur, aoA);
      }
      F.uAOOn.value = cfg.ao ? 1 : 0;
      if (cfg.bloom || cfg.autoExposure) {
        draw(preMat, down[0]);
        for (let i = 1; i < LEVELS; i++) { downMat.uniforms.tSrc.value = down[i - 1].texture; downMat.uniforms.uTexel.value.set(1 / down[i - 1].width, 1 / down[i - 1].height); draw(downMat, down[i]); }
        if (cfg.bloom) for (let i = LEVELS - 2; i >= 0; i--) {
          const low = i === LEVELS - 2 ? down[LEVELS - 1] : up[i + 1];
          upMat.uniforms.tLow.value = low.texture; upMat.uniforms.tHigh.value = down[i].texture; upMat.uniforms.uTexel.value.set(1 / low.width, 1 / low.height); draw(upMat, up[i]);
        }
        if (cfg.autoExposure) {
          const src = expo[expoI], dst = expo[1 - expoI];
          adaptMat.uniforms.tPrev.value = src.texture; adaptMat.uniforms.uDt.value = dt; adaptMat.uniforms.uReset.value = first ? 1 : 0; draw(adaptMat, dst);
          expoI = 1 - expoI; F.tExpo.value = dst.texture; first = false;
        }
      }
      if (!cfg.autoExposure) { first = true; F.tExpo.value = white; }   // 꺼져 있으면 노출 배율 1. 다시 켜면 처음부터 맞춘다
      F.uBloomOn.value = cfg.bloom ? 1 : 0;
      if (cfg.fxaa) { draw(finalMat, ldr); draw(fxaaMat, null); } else { draw(finalMat, null); }
      renderer.autoClear = prevAuto;
    },
    dispose() { for (const t of [scene, aoA, aoB, ldr, ...down, ...up, ...expo]) t.dispose(); depthTex.dispose(); white.dispose(); fsq.dispose(); },
  };
  return api;
}
