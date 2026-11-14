// 빛과 분위기: 불(불꽃·불티·연기·빛무리), 카메라 근처 몇 개만 켜는 점광원, 떠다니는 꽃가루·반딧불·재·불티, 묘지의 낮은 안개, 분수 물, 깃발.
//  · 입자는 모두 GPU 에서 시간만으로 움직인다(상태 없음): CPU 는 프레임마다 유니폼 몇 개만 고친다.
//  · 점광원은 개수 예산(LIGHTS.pool)을 정해 초점에서 가까운 불부터 켜고, 바뀔 때는 서서히 넘긴다. 밝기는 밤(engine.mood.night·world.night)에 맞춘다.
import * as THREE from 'three';

// ───────────────────────── 조정 손잡이 ─────────────────────────
export const AMBIENCE_TUNE = {
  lights: { pool: 5, range: 44, day: 0.62, flame: 1.0 },   // pool 점광원 개수(예산) · range 이 거리 안의 불만 켠다(m) · day 낮의 밝기 비율(밤=1) · flame 불꽃 밝기 배율
  quality: { '높음': { lights: 5, smoke: true, motes: 1.0, mist: true }, '보통': { lights: 4, smoke: true, motes: 0.6, mist: true }, '낮음': { lights: 2, smoke: false, motes: 0, mist: false } },
  motes: 1.0,           // 떠다니는 입자 밝기 배율
  mist: 1.0,            // 묘지 안개 짙기 배율
};

// 불의 종류별 수치: 점광원(색·세기 cd·거리 m·깜빡임), 불꽃(크기 m·개수), 불티·연기 개수
const FIRE = {
  lamp:     { color: 0xffb46a, power: 26, dist: 15, flick: 0.05, flame: 0,    n: 0,  embers: 0,  smoke: 0, glow: 1.7 },   // 등롱(가로등): 유리 안의 불 → 빛무리만
  brazier:  { color: 0xff9a4a, power: 42, dist: 17, flick: 0.16, flame: 0.62, n: 9,  embers: 7,  smoke: 4, glow: 1.9 },
  campfire: { color: 0xff8a3a, power: 78, dist: 22, flick: 0.20, flame: 1.15, n: 16, embers: 14, smoke: 8, glow: 3.2 },
  hearth:   { color: 0xff7a30, power: 55, dist: 16, flick: 0.14, flame: 0.7,  n: 8,  embers: 10, smoke: 5, glow: 2.2 },    // 대장간 화덕
  candle:   { color: 0xffc27a, power: 5,  dist: 6,  flick: 0.10, flame: 0.10, n: 2,  embers: 0,  smoke: 0, glow: 0.5 },
  window:   { color: 0xffb060, power: 16, dist: 11, flick: 0.03, flame: 0,    n: 0,  embers: 0,  smoke: 0, glow: 0 },      // 창에서 새는 빛(빛무리 없음)
};

const GLSL_NOISE = /* glsl */`
  float aHash( vec2 p ) { vec3 p3 = fract( vec3( p.xyx ) * 0.1031 ); p3 += dot( p3, p3.yzx + 33.33 ); return fract( ( p3.x + p3.y ) * p3.z ); }
  float aNoise( vec2 p ) { vec2 i = floor( p ), f = fract( p ); f = f * f * ( 3.0 - 2.0 * f );
    return mix( mix( aHash( i ), aHash( i + vec2( 1.0, 0.0 ) ), f.x ), mix( aHash( i + vec2( 0.0, 1.0 ) ), aHash( i + vec2( 1.0, 1.0 ) ), f.x ), f.y ); }
`;

function fogUniforms(engine) {
  return { fogColor: { value: new THREE.Color() }, fogNear: { value: 1 }, fogFar: { value: 1000 }, erhFog: engine.fogUniforms.erhFog };
}

export function createAmbience(engine) {
  const scene = engine.scene, W = engine.windUniforms, T = AMBIENCE_TUNE;
  const fires = [];           // { pos, kind, def }
  const uTime = { value: 0 }, uNight = { value: 0.3 };
  let quality = '높음', built = false;
  const parts = {};

  /** 불 하나를 등록한다. kind: lamp | brazier | campfire | hearth | candle | window. scale 로 크기를 조절 */
  function addFire(x, y, z, kind = 'brazier', scale = 1) { const def = FIRE[kind] || FIRE.brazier; fires.push({ pos: new THREE.Vector3(x, y, z), kind, def, scale, seed: fires.length * 0.6180339 % 1 }); }

  // ── 불꽃·불티·빛무리(가산 혼합)와 연기(알파 혼합): 인스턴스 사각형 한 묶음씩
  function buildSprites() {
    const add = { o: [], v: [], a: [], b: [] }, smk = { o: [], v: [], a: [], b: [] };
    const R = (s) => { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
    let k = 0;
    for (const f of fires) {
      const d = f.def, s = f.scale, p = f.pos;
      for (let i = 0; i < d.n; i++) {   // 불꽃: 아래에서 올라가며 작아진다
        const r1 = R(++k), r2 = R(++k), r3 = R(++k);
        add.o.push(p.x + (r1 - 0.5) * 0.34 * d.flame * s, p.y, p.z + (r2 - 0.5) * 0.34 * d.flame * s); add.v.push((r2 - 0.5) * 0.3, (0.75 + r3 * 0.75) * d.flame * s, (r1 - 0.5) * 0.3);
        add.a.push(i / d.n + r3 * 0.13, 0.55 + r1 * 0.35, d.flame * s * (1.0 + r2 * 0.45), d.flame * s * 0.3); add.b.push(0, 0.06 * s, 1.0, 0);
      }
      for (let i = 0; i < d.embers; i++) {   // 불티
        const r1 = R(++k), r2 = R(++k), r3 = R(++k);
        add.o.push(p.x + (r1 - 0.5) * 0.3 * s, p.y + 0.1, p.z + (r2 - 0.5) * 0.3 * s); add.v.push((r2 - 0.5) * 0.7, 1.3 + r3 * 1.6, (r1 - 0.5) * 0.7);
        add.a.push(r3, 1.1 + r1 * 1.4, 0.045 + r2 * 0.03, 0.02); add.b.push(1, 0.28, 1.0, 0);
      }
      if (d.glow > 0) { add.o.push(p.x, p.y + 0.1 * d.flame, p.z); add.v.push(0, 0, 0); add.a.push(f.seed, 1, d.glow * s, d.glow * s); add.b.push(2, 0, d.flame > 0 ? 0.5 : 0.36, d.flick); }
      for (let i = 0; i < d.smoke; i++) {   // 연기
        const r1 = R(++k), r2 = R(++k), r3 = R(++k);
        smk.o.push(p.x + (r1 - 0.5) * 0.2, p.y + 0.5 * d.flame * s, p.z + (r2 - 0.5) * 0.2); smk.v.push(0.25 + r1 * 0.2, 0.85 + r3 * 0.5, 0.1 + r2 * 0.2);
        smk.a.push(i / d.smoke + r3 * 0.1, 3.6 + r1 * 1.6, 0.35 * s + 0.1, (1.5 + r2 * 0.9) * (0.6 + 0.4 * s)); smk.b.push(3, 0.35, 1.0, 0);
      }
    }
    const make = (L, additive) => {
      const n = L.o.length / 3; if (!n) return null;
      const g = new THREE.InstancedBufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0], 3)); g.setIndex([0, 1, 2, 0, 2, 3]);
      g.setAttribute('aOrigin', new THREE.InstancedBufferAttribute(new Float32Array(L.o), 3)); g.setAttribute('aVel', new THREE.InstancedBufferAttribute(new Float32Array(L.v), 3));
      g.setAttribute('aA', new THREE.InstancedBufferAttribute(new Float32Array(L.a), 4)); g.setAttribute('aB', new THREE.InstancedBufferAttribute(new Float32Array(L.b), 4));
      g.instanceCount = n; g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
      const m = new THREE.ShaderMaterial({
        uniforms: { uTime, uNight, uWindDir: W.uWindDir, uWindStrength: W.uWindStrength, uGain: { value: 1 }, uSmokeCol: { value: new THREE.Color(0.1, 0.1, 0.1) }, ...fogUniforms(engine) },
        transparent: true, depthWrite: false, fog: !additive, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
        vertexShader: /* glsl */`
          attribute vec3 aOrigin, aVel; attribute vec4 aA, aB;   // aA: 씨앗·수명·처음 크기·끝 크기 / aB: 종류·흔들림·밝기·깜빡임
          uniform float uTime, uWindStrength; uniform vec2 uWindDir;
          varying vec2 vUv; varying vec4 vP;   // vP: 종류·나이(0~1)·씨앗·밝기
          #include <fog_pars_vertex>
          void main() {
            float kind = aB.x, life = aA.y, t = fract( uTime / life + aA.x ), age = t * life;
            vec3 p = aOrigin + aVel * age;
            float wob = aB.y;
            p.x += sin( age * 3.1 + aA.x * 40.0 ) * wob * t; p.z += cos( age * 2.7 + aA.x * 23.0 ) * wob * t;
            float size = mix( aA.z, aA.w, t ), bright = aB.z;
            if ( kind > 2.5 ) { p.xz += uWindDir * uWindStrength * age * age * 0.22; }                       // 연기: 바람에 쓸린다
            else if ( kind > 1.5 ) { t = 0.0; bright *= 1.0 + aB.w * ( sin( uTime * 11.0 + aA.x * 50.0 ) * 0.6 + sin( uTime * 23.7 + aA.x * 31.0 ) * 0.4 ); size *= 1.0 + aB.w * 0.35 * sin( uTime * 9.0 + aA.x * 17.0 ); }   // 빛무리
            else if ( kind > 0.5 ) { p.xz += uWindDir * uWindStrength * age * 0.35; }                        // 불티
            else { p.xz += uWindDir * uWindStrength * age * age * 0.5; }                                    // 불꽃: 끝이 바람에 눕는다
            vec4 mvPosition = modelViewMatrix * vec4( p, 1.0 );
            vec2 q = position.xy; if ( kind < 0.5 ) q.y = q.y * 1.5 + 0.35;                                // 불꽃은 세로로 길게
            mvPosition.xy += q * size;
            gl_Position = projectionMatrix * mvPosition;
            vUv = position.xy + 0.5; vP = vec4( kind, t, aA.x, bright );
            #include <fog_vertex>
          }`,
        fragmentShader: /* glsl */`
          uniform float uTime, uNight, uGain; uniform vec3 uSmokeCol;
          varying vec2 vUv; varying vec4 vP;
          #include <fog_pars_fragment>
          ${GLSL_NOISE}
          void main() {
            float kind = vP.x, t = vP.y; vec2 c = vUv - 0.5; float d = length( c ) * 2.0;
            vec3 col; float a;
            if ( kind > 2.5 ) {            // 연기: 흐트러지는 뭉게 덩이
              float n = aNoise( vUv * 3.0 + vP.z * 31.0 + vec2( 0.0, - uTime * 0.12 ) ) * 0.6 + aNoise( vUv * 7.0 + vP.z * 17.0 ) * 0.4;
              a = smoothstep( 1.0, 0.25, d + ( n - 0.5 ) * 0.7 ) * smoothstep( 0.0, 0.14, t ) * ( 1.0 - smoothstep( 0.35, 1.0, t ) ) * 0.34;
              col = uSmokeCol * ( 0.75 + 0.5 * n ) + vec3( 1.0, 0.42, 0.12 ) * 0.10 * ( 1.0 - smoothstep( 0.0, 0.3, t ) ) * uNight;
            } else if ( kind > 1.5 ) {     // 빛무리
              a = pow( max( 1.0 - d, 0.0 ), 2.4 ); col = vec3( 1.0, 0.58, 0.24 ) * vP.w * mix( 0.45, 1.0, uNight ) * a; a = 1.0;
            } else if ( kind > 0.5 ) {     // 불티
              a = smoothstep( 1.0, 0.2, d ) * ( 1.0 - t ) * ( 0.55 + 0.45 * sin( uTime * 17.0 + vP.z * 90.0 ) );
              col = mix( vec3( 1.0, 0.72, 0.30 ), vec3( 1.0, 0.30, 0.06 ), t ) * 2.4 * a; a = 1.0;
            } else {                        // 불꽃: 위로 좁아지는 혀 + 흐르는 잡음
              vec2 q = c; q.x *= 1.0 + ( q.y + 0.5 ) * 1.3;
              float n = aNoise( vec2( vUv.x * 3.2 + vP.z * 19.0, vUv.y * 2.4 - uTime * 2.6 - vP.z * 7.0 ) );
              float sh = smoothstep( 0.52, 0.08, length( q * vec2( 1.0, 0.72 ) ) + ( n - 0.5 ) * 0.34 );
              a = sh * smoothstep( 0.0, 0.10, t ) * ( 1.0 - smoothstep( 0.45, 1.0, t ) );
              col = mix( vec3( 1.0, 0.50, 0.13 ) * 1.3, vec3( 1.0, 0.17, 0.02 ) * 0.75, smoothstep( 0.0, 0.7, t + ( 1.0 - sh ) * 0.5 ) ) * a * 0.30; a = 1.0;
            }
            gl_FragColor = vec4( col * uGain, a );
            #include <fog_fragment>
          }`,
      });
      const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.renderOrder = additive ? 6 : 5; mesh.name = additive ? 'fireAdd' : 'fireSmoke'; scene.add(mesh);
      return mesh;
    };
    parts.fireAdd = make(add, true); parts.smoke = make(smk, false);
  }

  // ── 점광원 예산: 가까운 불부터 켠다
  const pool = [];
  function buildLights() {
    for (let i = 0; i < T.lights.pool; i++) { const l = new THREE.PointLight(0xffa860, 0, 18, 1.7); l.userData = { fire: null, k: 0 }; scene.add(l); pool.push(l); }
  }
  const order = [];
  function updateLights(dt, time, focus, nightK) {
    const want = Math.min(pool.length, T.quality[quality].lights), r2 = T.lights.range * T.lights.range;
    order.length = 0;
    for (const f of fires) { const d2 = f.pos.distanceToSquared(focus) / (f.def.power > 40 ? 1.6 : 1); if (d2 < r2) order.push([d2, f]); }
    order.sort((a, b) => a[0] - b[0]); if (order.length > want) order.length = want;
    const dayK = T.lights.day + (1 - T.lights.day) * nightK;
    for (let i = 0; i < pool.length; i++) {
      const l = pool[i], u = l.userData; if (i >= want) { u.fire = null; u.k = 0; l.intensity = 0; continue; }
      const keep = u.fire && order.some(o => o[1] === u.fire);
      if (!keep) {   // 맡은 불이 순위에서 밀렸다: 꺼뜨린 뒤 아직 주인 없는 불을 맡는다
        u.k = Math.max(0, u.k - dt * 2.5);
        if (u.k <= 0) { const o = order.find(o2 => !pool.some(p => p.userData.fire === o2[1])); u.fire = o ? o[1] : null; if (u.fire) { l.position.copy(u.fire.pos); l.position.y += 0.25; l.color.setHex(u.fire.def.color); l.distance = u.fire.def.dist; } }
      } else u.k = Math.min(1, u.k + dt * 2.0);
      if (u.fire && i < want) { const d = u.fire.def, s = u.fire.seed * 40; l.intensity = d.power * u.fire.scale * u.k * dayK * (1 + d.flick * (Math.sin(time * 11 + s) * 0.6 + Math.sin(time * 23.7 + s * 1.7) * 0.4)); } else l.intensity = 0;
    }
  }

  // ── 떠다니는 입자: 꽃가루(숲·평원) · 반딧불(숲·묘지) · 불티(제단) · 재(제단)
  const moteK = { value: new THREE.Vector4(0, 0, 0, 0) }, moteFocus = { value: new THREE.Vector3() };
  function buildMotes() {
    const counts = [240, 60, 170, 230], n = counts.reduce((a, b) => a + b, 0); const seed = new Float32Array(n * 4); let k = 0;
    counts.forEach((c, kind) => { for (let i = 0; i < c; i++) { seed[k++] = Math.random(); seed[k++] = Math.random(); seed[k++] = Math.random(); seed[k++] = kind + Math.random() * 0.999; } });
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0], 3)); g.setIndex([0, 1, 2, 0, 2, 3]);
    g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 4)); g.instanceCount = n; g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
    const m = new THREE.ShaderMaterial({
      uniforms: { uTime, uK: moteK, uFocus: moteFocus, uWindDir: W.uWindDir, uGain: { value: 1 } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */`
        attribute vec4 aSeed; uniform float uTime; uniform vec4 uK; uniform vec3 uFocus; uniform vec2 uWindDir;
        varying vec2 vUv; varying vec4 vC;
        const vec3 BOX = vec3( 46.0, 9.0, 46.0 );
        void main() {
          float kind = floor( aSeed.w ), ph = fract( aSeed.w ) * 6.2832, t = uTime;
          float k = kind < 0.5 ? uK.x : kind < 1.5 ? uK.y : kind < 2.5 ? uK.z : uK.w;
          vec3 p = aSeed.xyz * BOX; float size; vec3 col; float a = 1.0;
          if ( kind < 0.5 ) {          // 꽃가루·먼지: 바람 따라 천천히
            p.xz += uWindDir * t * 0.35; p += vec3( sin( t * 0.31 + ph ), sin( t * 0.23 + ph * 1.7 ) * 0.6, cos( t * 0.27 + ph ) ) * 0.7;
            size = 0.022 + fract( ph * 3.7 ) * 0.022; col = vec3( 1.0, 0.93, 0.70 ) * 0.55; a = 0.5 + 0.5 * sin( t * 1.3 + ph * 5.0 );
          } else if ( kind < 1.5 ) {   // 반딧불: 느리게 맴돌며 깜빡인다
            p += vec3( sin( t * 0.43 + ph ) * 1.6 + sin( t * 0.17 + ph * 2.0 ) * 2.2, sin( t * 0.37 + ph * 3.0 ) * 0.5, cos( t * 0.39 + ph * 1.3 ) * 1.6 + cos( t * 0.13 + ph ) * 2.2 );
            p.y = p.y * 0.28 + 0.3; size = 0.085; col = vec3( 0.72, 1.0, 0.42 ) * 2.2; a = smoothstep( 0.15, 0.8, sin( t * 0.9 + ph * 4.0 ) );
          } else if ( kind < 2.5 ) {   // 불티: 솟으며 흔들린다
            p.y += t * ( 1.1 + fract( ph * 2.3 ) * 1.5 ); p.xz += uWindDir * t * 0.8 + vec2( sin( t * 1.7 + ph ), cos( t * 1.3 + ph * 2.0 ) ) * 0.5;
            size = 0.035 + fract( ph * 5.1 ) * 0.035; col = mix( vec3( 1.0, 0.55, 0.16 ), vec3( 1.0, 0.25, 0.05 ), fract( ph * 7.3 ) ) * 2.6; a = 0.55 + 0.45 * sin( t * 9.0 + ph * 11.0 );
          } else {                      // 재: 천천히 내려앉으며 나부낀다
            p.y -= t * ( 0.35 + fract( ph * 1.9 ) * 0.4 ); p.xz += uWindDir * t * 1.1 + vec2( sin( t * 0.9 + ph ), cos( t * 0.7 + ph * 1.5 ) ) * 0.8;
            size = 0.03 + fract( ph * 4.3 ) * 0.04; col = vec3( 0.50, 0.46, 0.44 ) * 0.5; a = 0.6;
          }
          vec2 rel = mod( p.xz - uFocus.xz + BOX.xz * 0.5, BOX.xz ) - BOX.xz * 0.5; float yy = mod( p.y, BOX.y );
          vec2 e = abs( rel ) / ( BOX.xz * 0.5 ); float ey = yy / BOX.y;
          a *= ( 1.0 - smoothstep( 0.8, 1.0, e.x ) ) * ( 1.0 - smoothstep( 0.8, 1.0, e.y ) ) * smoothstep( 0.0, 0.05, ey ) * ( 1.0 - smoothstep( 0.82, 1.0, ey ) );
          vec3 wp = vec3( uFocus.x + rel.x, yy + 0.1, uFocus.z + rel.y );
          vec4 mv = modelViewMatrix * vec4( wp, 1.0 ); mv.xy += position.xy * size * 2.0;
          gl_Position = k * a > 0.004 ? projectionMatrix * mv : vec4( 2.0, 2.0, 2.0, 1.0 );
          vUv = position.xy * 2.0; vC = vec4( col * k * a, 1.0 );
        }`,
      fragmentShader: /* glsl */`
        uniform float uGain; varying vec2 vUv; varying vec4 vC;
        void main() { float d = length( vUv ); float a = pow( max( 1.0 - d, 0.0 ), 2.0 ); gl_FragColor = vec4( vC.rgb * a * uGain, 1.0 ); }`,
    });
    const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.renderOrder = 7; mesh.name = 'motes'; scene.add(mesh); parts.motes = mesh;
  }

  // ── 묘지의 낮게 깔린 안개: 흐르는 잡음을 칠한 큰 수평 판 두 겹
  const mistU = { uTime, uCol: { value: new THREE.Color(0.3, 0.38, 0.5) }, uK: { value: 0 }, uCenter: { value: new THREE.Vector3(0, 0, 60) } };
  function addMist(x, z, radius) {
    mistU.uCenter.value.set(x, z, radius);
    const g = new THREE.PlaneGeometry(radius * 2.2, radius * 2.2); g.rotateX(-Math.PI / 2);
    const group = new THREE.Group(); group.name = 'mist';
    for (const [y, sc, sp, al] of [[0.30, 0.055, 0.5, 0.26], [0.75, 0.034, -0.32, 0.15]]) {
      const m = new THREE.ShaderMaterial({
        uniforms: { ...mistU, uLayer: { value: new THREE.Vector4(sc, sp, al, y) }, ...fogUniforms(engine) }, transparent: true, depthWrite: false, fog: true,
        vertexShader: /* glsl */`
          varying vec3 vW;
          #include <fog_pars_vertex>
          void main() { vec4 w = modelMatrix * vec4( position, 1.0 ); vW = w.xyz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
            #include <fog_vertex>
          }`,
        fragmentShader: /* glsl */`
          uniform float uTime, uK; uniform vec3 uCol, uCenter; uniform vec4 uLayer; varying vec3 vW;
          #include <fog_pars_fragment>
          ${GLSL_NOISE}
          void main() {
            vec2 p = vW.xz * uLayer.x + vec2( uTime * 0.021, uTime * 0.013 ) * uLayer.y * 10.0;
            float n = aNoise( p ) * 0.5 + aNoise( p * 2.1 + 3.7 ) * 0.3 + aNoise( p * 4.7 - uTime * 0.03 ) * 0.2;
            float a = smoothstep( 0.46, 0.86, n );
            a *= 1.0 - smoothstep( uCenter.z * 0.72, uCenter.z, length( vW.xz - uCenter.xy ) );
            vec3 v = normalize( cameraPosition - vW ); a *= smoothstep( 0.05, 0.45, abs( v.y ) );   // 낮은 각도에서 판처럼 보이지 않게
            gl_FragColor = vec4( uCol * ( 0.8 + 0.4 * n ), a * uLayer.z * uK );
            #include <fog_fragment>
          }`,
      });
      const mesh = new THREE.Mesh(g, m); mesh.position.set(x, y, z); mesh.renderOrder = 4; group.add(mesh);
    }
    scene.add(group); parts.mist = group;
  }

  // ── 분수 물: 잔물결 노멀(파동 합 + 가운데서 퍼지는 물결)로 하늘을 비춘다
  function addWater(x, y, z, radius, { inner = 0 } = {}) {
    const g = inner > 0 ? new THREE.RingGeometry(inner, radius, 40, 1) : new THREE.CircleGeometry(radius, 40); g.rotateX(-Math.PI / 2);
    const m = new THREE.MeshStandardMaterial({ color: 0x1c2c2e, roughness: 0.07, metalness: 0.0 });
    m.customProgramCacheKey = () => 'erh-water';
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = uTime; sh.uniforms.uWC = { value: new THREE.Vector4(x, z, inner, radius) };
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvWp = ( modelMatrix * vec4( position, 1.0 ) ).xyz;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>\nvarying vec3 vWp; uniform float uTime; uniform vec4 uWC;\n${GLSL_NOISE}`)
        .replace('#include <map_fragment>', `
          vec2 wq = vWp.xz - uWC.xy; float wr = length( wq ); vec2 wd = wq / max( wr, 1e-3 );
          // 물줄기가 떨어지는 가운데 둘레의 거품
          float wFoam = smoothstep( uWC.z + 0.55, uWC.z + 0.05, wr ) * ( 0.45 + 0.55 * aNoise( wq * 7.0 + vec2( uTime * 1.1, - uTime * 0.8 ) ) );
          wFoam = max( wFoam, smoothstep( 0.62, 0.9, aNoise( wq * 3.1 - wd * uTime * 0.6 ) ) * smoothstep( uWC.z + 1.3, uWC.z + 0.2, wr ) * 0.5 );
          diffuseColor.rgb = mix( diffuseColor.rgb, vec3( 0.50, 0.56, 0.56 ), clamp( wFoam, 0.0, 1.0 ) * 0.8 );`)
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n roughnessFactor = mix( roughnessFactor, 0.6, clamp( wFoam, 0.0, 1.0 ) );')
        .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
          {
            vec2 gsum = vec2( 0.0 ); float tt = uTime;
            gsum += vec2( 0.80, 0.60 ) * cos( dot( vWp.xz, vec2( 0.80, 0.60 ) ) * 5.3 + tt * 2.1 ) * 0.060;
            gsum += vec2( -0.5, 0.86 ) * cos( dot( vWp.xz, vec2( -0.5, 0.86 ) ) * 8.7 - tt * 2.9 ) * 0.045;
            gsum += vec2( 0.26, -0.96 ) * cos( dot( vWp.xz, vec2( 0.26, -0.96 ) ) * 13.1 + tt * 3.7 ) * 0.035;
            gsum += wd * cos( wr * 11.0 - tt * 6.0 ) * 0.11 * smoothstep( uWC.w, uWC.z, wr );          // 가운데서 퍼지는 물결
            gsum += ( vec2( aNoise( vWp.xz * 9.0 + tt * 0.7 ), aNoise( vWp.xz * 9.0 - tt * 0.6 + 4.1 ) ) - 0.5 ) * 0.10;
            normal = normalize( mat3( viewMatrix ) * normalize( vec3( - gsum.x, 1.0, - gsum.y ) ) );
          }`);
    };
    const mesh = new THREE.Mesh(g, m); mesh.position.set(x, y, z); mesh.receiveShadow = true; mesh.name = 'water'; scene.add(mesh);
    return mesh;
  }

  // ── 깃발: 정점 셰이더로 펄럭인다(깃대 쪽은 고정). 문양은 캔버스로 그린다
  function bannerTexture(field, trim, device, kind) {
    const c = document.createElement('canvas'); c.width = 128; c.height = 256; const g = c.getContext('2d');
    g.fillStyle = field; g.fillRect(0, 0, 128, 256);
    // 천의 결
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${i % 2 ? 255 : 0},${i % 2 ? 255 : 0},${i % 2 ? 255 : 0},0.035)`; g.fillRect(Math.random() * 128, Math.random() * 256, 1 + Math.random() * 2, 6 + Math.random() * 18); }
    g.strokeStyle = trim; g.lineWidth = 7; g.strokeRect(6, 6, 116, 244);
    g.fillStyle = device; g.strokeStyle = device; g.lineWidth = 12;
    if (kind === 0) { g.beginPath(); g.moveTo(20, 150); g.lineTo(64, 96); g.lineTo(108, 150); g.stroke(); g.beginPath(); g.arc(64, 62, 17, 0, 7); g.fill(); g.beginPath(); g.moveTo(20, 196); g.lineTo(64, 142); g.lineTo(108, 196); g.stroke(); }   // 겹 갈매기 + 원
    else if (kind === 1) { g.beginPath(); g.moveTo(20, 30); g.lineTo(108, 226); g.stroke(); g.beginPath(); g.moveTo(108, 30); g.lineTo(20, 226); g.stroke(); }   // 빗십자
    else if (kind === 2) { g.fillRect(52, 20, 24, 216); g.fillRect(20, 84, 88, 24); }                         // 십자
    else if (kind === 3) { g.fillRect(14, 104, 100, 40); g.beginPath(); g.arc(64, 60, 14, 0, 7); g.fill(); g.beginPath(); g.arc(64, 190, 14, 0, 7); g.fill(); }   // 띠 + 원 둘
    else if (kind === 4) { g.beginPath(); g.moveTo(64, 40); g.lineTo(104, 128); g.lineTo(64, 216); g.lineTo(24, 128); g.closePath(); g.fill(); }   // 마름모
    else { for (let i = 0; i < 3; i++) g.fillRect(14, 50 + i * 56, 100, 22); }                                 // 가로 줄
    // 아래 끝 제비꼬리
    g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.moveTo(0, 256); g.lineTo(64, 216); g.lineTo(128, 256); g.closePath(); g.fill(); g.globalCompositeOperation = 'source-over';
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
  }
  const flagMats = [];
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x3a2e22, roughness: 0.8 }), capMat = new THREE.MeshStandardMaterial({ color: 0x8a7440, roughness: 0.4, metalness: 0.9 });
  /** 깃발(깃대 포함). style: { field, trim, device, kind }, 깃대 높이 h, 천 크기 w×len. hang=true 면 벽에 드리운 현수막(깃대 없음) */
  function addFlag(x, z, yaw, style, { h = 6.6, w = 1.15, len = 2.5, hang = false, y = 0 } = {}) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = yaw;
    if (!hang) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.085, h, 6), poleMat); pole.position.y = h / 2; pole.castShadow = true; g.add(pole);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.34, 6), capMat); cap.position.y = h + 0.15; g.add(cap);
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, w + 0.1, 5), poleMat); arm.rotation.z = Math.PI / 2; arm.position.set(w / 2, h - 0.25, 0); g.add(arm);
    }
    const fg = new THREE.PlaneGeometry(w, len, 8, 14); fg.translate(w / 2 + (hang ? -w / 2 : 0.02), -len / 2, 0);
    const mat = new THREE.MeshStandardMaterial({ map: bannerTexture(style.field, style.trim, style.device, style.kind), side: THREE.DoubleSide, roughness: 0.88, alphaTest: 0.5 });
    const phase = flagMats.length * 1.7;
    mat.customProgramCacheKey = () => 'erh-flag-' + (hang ? 1 : 0);
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uWindTime = W.uWindTime; sh.uniforms.uWindStrength = W.uWindStrength; sh.uniforms.uFlag = { value: new THREE.Vector4(phase, len, hang ? 0.35 : 1, w) };
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uWindTime, uWindStrength; uniform vec4 uFlag;')
        .replace('#include <beginnormal_vertex>', `
          // 위쪽 가로대에 매달린 천: 아래로 갈수록 크게 물결친다
          float fd = clamp( - position.y / uFlag.y, 0.0, 1.0 ); float fa = uFlag.z * ( 0.25 + 0.75 * uWindStrength );
          float fph = position.y * 2.6 + position.x * 1.9 + uWindTime * 3.4 + uFlag.x;
          float fz = ( sin( fph ) * 0.20 + sin( fph * 1.9 + 1.3 ) * 0.08 ) * fd * fa + fd * fd * 0.5 * fa * 0.5;
          float fdz = ( cos( fph ) * 0.20 * 2.6 + cos( fph * 1.9 + 1.3 ) * 0.08 * 4.9 ) * fd * fa;
          vec3 objectNormal = normalize( vec3( - ( cos( fph ) * 0.20 * 1.9 ) * fd * fa, - fdz * 0.6, 1.0 ) );`)
        .replace('#include <begin_vertex>', 'vec3 transformed = vec3( position.x + fd * fd * 0.12 * fa, position.y + abs( fz ) * 0.12, position.z + fz );');
    };
    const fl = new THREE.Mesh(fg, mat); fl.position.set(0, hang ? 0 : h - 0.28, 0); fl.castShadow = true; fl.receiveShadow = true; g.add(fl);
    scene.add(g); flagMats.push(mat);
    return fl;
  }

  // ── 분위기 맞추기
  let moodW = { town: 1, forest: 0, grave: 0, altar: 0, wild: 0 }, moodNight = 0.3, haze = [0.2, 0.23, 0.28];
  engine.onMood((m) => { moodW = { ...m.weights }; moodNight = m.night; haze = m.values.haze.slice(); });

  return {
    fires, parts, tune: T, pool, addFire, addMist, addWater, addFlag, uTime,
    /** 불·입자·점광원을 실제로 만든다(등록이 끝난 뒤 한 번) */
    build() { if (built) return; built = true; buildSprites(); buildLights(); buildMotes(); },
    setQuality(q) {
      if (!T.quality[q]) return; quality = q; const Q = T.quality[q];
      if (parts.smoke) parts.smoke.visible = Q.smoke; if (parts.motes) parts.motes.visible = Q.motes > 0; if (parts.mist) parts.mist.visible = Q.mist;
    },
    /** night: world.night(0~1). 엔진의 구역 분위기와 큰 쪽을 쓴다 */
    update(dt, time, focus, night = 0) {
      uTime.value = time; const nk = Math.min(1, Math.max(night, moodNight)); uNight.value = nk;
      updateLights(dt, time, focus, nk);
      const Q = T.quality[quality] || T.quality['높음'], mk = T.motes * Q.motes;
      // 입자 밝기: 숲=꽃가루+반딧불, 평원=꽃가루 조금, 마을=먼지 아주 조금, 묘지=반딧불(창백), 제단=불티+재
      moteK.value.set((moodW.forest * 1.0 + moodW.wild * 0.5 + moodW.town * 0.22 + moodW.grave * 0.3) * mk, (moodW.forest * 0.7 + moodW.grave * 0.5) * mk, moodW.altar * mk, (moodW.altar * 1.0 + moodW.grave * 0.25) * mk);
      moteFocus.value.set(engine.cam.look.x, 0, engine.cam.look.z);
      if (parts.smoke) parts.smoke.material.uniforms.uSmokeCol.value.setRGB(0.05 + haze[0] * 0.55, 0.05 + haze[1] * 0.55, 0.05 + haze[2] * 0.55);
      if (parts.fireAdd) parts.fireAdd.material.uniforms.uGain.value = T.lights.flame;
      mistU.uK.value = T.mist * Math.min(1, moodW.grave * 1.4); mistU.uCol.value.setRGB(haze[0] * 1.5 + 0.02, haze[1] * 1.5 + 0.03, haze[2] * 1.5 + 0.045);
    },
  };
}
