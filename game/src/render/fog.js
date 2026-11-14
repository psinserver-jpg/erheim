// 안개·그림자 셰이더 주입.
//  · 안개: 거리 안개(지수 제곱) + 높이 안개(바닥 가까이 짙고 천천히 흐른다). three 의 안개 청크를 바꿔 끼우므로
//    fog 를 쓰는 모든 재질(기본 재질, onBeforeCompile 로 고친 재질, <fog_*> 청크를 넣은 ShaderMaterial)에 그대로 적용된다.
//    값은 Float32Array 하나(erhFog)를 모든 재질이 함께 본다. 이 유니폼이 없는 직접 만든 재질은 예전 선형 안개(fogNear/fogFar)로 돌아간다.
//  · 그림자: 기본 5탭 PCF 를 12탭(보겔 원판 + 화소마다 회전) + 받는 면 기울기 보정으로 바꿔 넓은 반그림자에서도 얼룩·여드름이 없게 한다.
//    같은 자리에서 '햇빛 얼룩'(구름·나뭇잎 사이로 드는 빛)도 곱한다: 해 방향으로 투영한 잡음이라 지면·물체에 똑같이 걸리고 천천히 흐른다.
import * as THREE from 'three';

// erhFog[5] (vec4 ×5) 배치
//  [0] rgb 안개 색, a 사용(1)·끔(0)
//  [1] rgb 해 쪽 안개 색, a 거리 안개 밀도(1/m)
//  [2] x 높이 안개 밀도, y 높이 감쇠(1/m), z 기준 높이(m), w 흐름 시간(초)
//  [3] xy 해 방향(수평, 정규화), z 얼룩 세기(0~1), w 안개 상한(0~1)
//  [4] x 얼룩 크기(1/m), y 거리 안개 시작(m), z 햇빛 얼룩 가장자리 부드러움, w 그림자 표본 수(4~12)
//  [5] xy 그림자 지도 중심(빛 공간, m), z 그림자 상자 한 변(m), w 햇빛 얼룩 세기(0=끔)
//  [6] x 햇빛 얼룩 크기(1/m), yz 흐름 이동(m), w 가림 정도(0~1)
export const FOG_VEC4S = 7;

const PARS_VERT = /* glsl */`
#ifdef USE_FOG
	varying float vFogDepth;
	varying vec3 vFogWorld;
#endif
`;
// mvPosition 에서 월드 좌표를 되돌린다(뷰 행렬은 회전+이동이므로 전치가 곧 역회전)
const VERT = /* glsl */`
#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
	vFogWorld = cameraPosition + mvPosition.xyz * mat3( viewMatrix );
#endif
`;
const PARS_FRAG = /* glsl */`
#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	varying vec3 vFogWorld;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
	uniform vec4 erhFog[ ${FOG_VEC4S} ];
	float erhFogHash( vec2 p ) { vec3 p3 = fract( vec3( p.xyx ) * 0.1031 ); p3 += dot( p3, p3.yzx + 33.33 ); return fract( ( p3.x + p3.y ) * p3.z ); }
	float erhFogNoise( vec2 p ) {
		vec2 i = floor( p ), f = fract( p ); f = f * f * ( 3.0 - 2.0 * f );
		return mix( mix( erhFogHash( i ), erhFogHash( i + vec2( 1.0, 0.0 ) ), f.x ), mix( erhFogHash( i + vec2( 0.0, 1.0 ) ), erhFogHash( i + vec2( 1.0, 1.0 ) ), f.x ), f.y );
	}
	// 안개 양(0~1)과 색을 돌려준다. wp = 월드 좌표
	vec4 erhFogEval( vec3 wp ) {
		vec3 v = wp - cameraPosition; float d = length( v );
		// 거리 안개: 가까운 곳은 맑고 멀수록 빠르게 짙어진다
		float dd = max( d - erhFog[ 4 ].y, 0.0 ) * erhFog[ 1 ].a;
		float tau = dd * dd;
		// 높이 안개: 밀도 = a·exp(-b·(y-y0)) 를 시선 따라 적분(해석적)
		float b = erhFog[ 2 ].y;
		float t = clamp( b * v.y, -30.0, 30.0 );
		float g = abs( t ) > 0.001 ? ( 1.0 - exp( - t ) ) / t : 1.0;
		float hd = erhFog[ 2 ].x;
		if ( erhFog[ 3 ].z > 0.0 ) {
			// 천천히 흐르는 얼룩: 바닥 가까이에서만 눈에 띈다
			vec2 q = wp.xz * erhFog[ 4 ].x; float tm = erhFog[ 2 ].w;
			float n = erhFogNoise( q + vec2( tm * 0.045, tm * 0.020 ) ) * 0.62 + erhFogNoise( q * 2.3 - vec2( tm * 0.030, - tm * 0.055 ) ) * 0.38;
			hd *= 1.0 + ( smoothstep( 0.15, 0.85, n ) - 0.5 ) * 2.0 * erhFog[ 3 ].z;
		}
		tau += hd * exp( - clamp( b * ( cameraPosition.y - erhFog[ 2 ].z ), -30.0, 30.0 ) ) * g * d;
		float f = min( 1.0 - exp( - tau ), erhFog[ 3 ].w );
		float s = max( dot( normalize( v.xz + vec2( 1e-5 ) ), erhFog[ 3 ].xy ), 0.0 );
		return vec4( mix( erhFog[ 0 ].rgb, erhFog[ 1 ].rgb, s * s * s ), f );
	}
#endif
`;
const FRAG = /* glsl */`
#ifdef USE_FOG
	if ( erhFog[ 0 ].a > 0.5 ) {
		vec4 erhF = erhFogEval( vFogWorld );
		gl_FragColor.rgb = mix( gl_FragColor.rgb, erhF.rgb, erhF.a );
	} else {
		#ifdef FOG_EXP2
			float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
		#else
			float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
		#endif
		gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
	}
#endif
`;

// 그림자 필터: 원래 청크의 PCF getShadow 안에서 5탭 구간만 바꿔 끼운다(구간을 못 찾으면 그대로 둔다). 빌드된 three 에는 주석이 없으므로 코드로 찾는다
const PCF_RE = /(float getShadow\( sampler2DShadow shadowMap,[^{]*\{[\s\S]*?)(bool inFrustum = shadowCoord\.x >= 0\.0[\s\S]*?if \( frustumTest \) \{)[\s\S]*?\) \* 0\.2;/;
const PCF_NEW = /* glsl */`
				// 보겔 원판 최대 12탭(탭마다 하드웨어 2×2 PCF) + 받는 면 기울기 보정
				vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
				vec2 radius = shadowRadius * texelSize;
				float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
				float erhSum = 0.0;
				#ifdef USE_FOG
					int erhTaps = erhFog[ 4 ].w >= 1.0 ? int( erhFog[ 4 ].w ) : 12;   // 품질 단계에 따라 표본 수를 줄인다
				#else
					int erhTaps = 12;
				#endif
				for ( int erhI = 0; erhI < 12; erhI ++ ) {
					if ( erhI >= erhTaps ) break;
					vec2 erhO = vogelDiskSample( erhI, erhTaps, phi ) * radius;
					float erhZ = shadowCoord.z + clamp( dot( erhO, erhSlope ), - erhMaxSlope, erhMaxSlope );
					erhSum += texture( shadowMap, vec3( shadowCoord.xy + erhO, erhZ ) );
				}
				shadow = erhSum / float( erhTaps );
				#ifdef USE_FOG
				if ( erhFog[ 5 ].w > 0.0 ) {
					// 햇빛 얼룩: 그림자 지도 좌표를 월드에 고정된 빛 공간 좌표(m)로 바꿔 잡음을 읽는다
					vec2 erhG = ( ( shadowCoord.xy - 0.5 ) * erhFog[ 5 ].z + erhFog[ 5 ].xy + erhFog[ 6 ].yz ) * erhFog[ 6 ].x;
					float erhN = erhFogNoise( erhG ) * 0.55 + erhFogNoise( erhG * 2.7 + 11.3 ) * 0.30 + erhFogNoise( erhG * 6.3 + 5.7 ) * 0.15;
					shadow *= mix( 1.0 - erhFog[ 5 ].w, 1.0, smoothstep( erhFog[ 6 ].w - erhFog[ 4 ].z, erhFog[ 6 ].w + erhFog[ 4 ].z, erhN ) );
				}
				#endif
`;
// 기울기(깊이의 그림자 지도 좌표 미분)는 분기 밖에서 구한다
const PCF_SLOPE = /* glsl */`
			vec3 erhDx = dFdx( shadowCoord.xyz ), erhDy = dFdy( shadowCoord.xyz );
			float erhDet = erhDx.x * erhDy.y - erhDx.y * erhDy.x;
			vec2 erhSlope = abs( erhDet ) > 1e-12 ? vec2( erhDy.y * erhDx.z - erhDx.y * erhDy.z, erhDx.x * erhDy.z - erhDy.x * erhDx.z ) / erhDet : vec2( 0.0 );
			float erhMaxSlope = 0.004;
`;

let installed = null;
export function installFog() {
  if (installed) return installed;
  const data = new Float32Array(FOG_VEC4S * 4);
  const uniform = { value: data };
  // 기본 재질: 재질마다 ShaderLib 의 유니폼을 복제해 쓰는데, Float32Array 는 참조로 넘어가므로 모든 재질이 같은 배열을 본다
  THREE.UniformsLib.fog.erhFog = uniform;
  for (const k in THREE.ShaderLib) { const s = THREE.ShaderLib[k]; if (s && s.uniforms && s.uniforms.fogColor) s.uniforms.erhFog = uniform; }
  THREE.ShaderChunk.fog_pars_vertex = PARS_VERT;
  THREE.ShaderChunk.fog_vertex = VERT;
  THREE.ShaderChunk.fog_pars_fragment = PARS_FRAG;
  THREE.ShaderChunk.fog_fragment = FRAG;

  let shadowPatched = false;
  const src = THREE.ShaderChunk.shadowmap_pars_fragment;
  if (PCF_RE.test(src)) {
    THREE.ShaderChunk.shadowmap_pars_fragment = src.replace(PCF_RE, (m, head, test) => head + PCF_SLOPE + '\n\t\t\t' + test + PCF_NEW);
    shadowPatched = true;
  } else console.warn('[fog] 그림자 필터를 바꿔 끼우지 못했습니다(three 판이 다릅니다). 기본 필터를 씁니다.');
  installed = { data, uniform, shadowPatched };
  return installed;
}
