// 이펙트 공통 기반: 인스턴싱 입자 묶음, 셰이더 재질, 메시 풀.
import * as THREE from 'three';

export const GAIN = { value: 1 };
const TAIL = `
  gl_FragColor.rgb *= uGain;
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
`;
const VERT = `
  varying vec2 vUv; varying vec3 vN; varying vec3 vV;
  void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }
`;

// ───────────────────────── 입자(인스턴싱 빌보드) ─────────────────────────
const P_VERT = `
  attribute vec3 iPos; attribute vec4 iA; attribute vec4 iColor; attribute vec3 iDir;
  varying vec2 vUv; varying vec4 vColor;
  #include <fog_pars_vertex>
  void main(){
    vec4 mv = viewMatrix * vec4(iPos, 1.0);
    vec4 mvPosition = mv;
    #include <fog_vertex>
    vec2 c = position.xy, off;
    if (iA.z > 0.0) {                       // 속도 방향으로 늘어나는 불티
      vec3 dv = (viewMatrix * vec4(iDir, 0.0)).xyz;
      float l = length(dv.xy); vec2 ax = l > 1e-5 ? dv.xy / l : vec2(0.0, 1.0);
      float len = iA.x + iA.z * l;
      off = ax * c.y * len + vec2(-ax.y, ax.x) * c.x * iA.x;
    } else {
      float s = sin(iA.y), k = cos(iA.y);
      off = vec2(c.x * k - c.y * s, c.x * s + c.y * k) * iA.x;
    }
    mv.xy += off;
    gl_Position = projectionMatrix * mv;
    // 빌보드가 바닥에 잘리지 않도록 깊이만 카메라 쪽으로 당긴다
    vec4 near = projectionMatrix * vec4(mv.xy, mv.z + min(iA.x, 3.0) * 0.55, 1.0);
    gl_Position.z = near.z / near.w * gl_Position.w;
    float col = mod(iA.w, 4.0), row = floor(iA.w / 4.0);
    vUv = vec2((col + 0.02 + uv.x * 0.96) / 4.0, 1.0 - (row + 0.02 + (1.0 - uv.y) * 0.96) / 4.0);
    vColor = iColor;
  }
`;
const P_FRAG = `
  uniform sampler2D uMap; uniform float uHot, uGain, uErode;
  varying vec2 vUv; varying vec4 vColor;
  #include <fog_pars_fragment>
  void main(){
    float m = texture2D(uMap, vUv).r; float a; vec3 col;
    if (uErode > 0.5) {
      // 불길: 수명이 다할수록 옅은 부분부터 깎여 나가 혀 모양만 남는다. 안쪽은 밝은 노랑, 가장자리는 붉게.
      // 색은 "열" 하나로 정한다: 암적색 → 주황 → 노랑 → 흰노랑. 열 = 무늬의 짙기 × 남은 수명.
      float life = vColor.a, th = (1.0 - life) * 0.66;
      a = smoothstep(th, th + 0.2, m) * min(1.0, life * 5.0);
      float heat = clamp((m - th) / 0.62, 0.0, 1.0) * (0.3 + 0.7 * life);
      col = mix(vec3(0.42, 0.03, 0.0), vec3(1.0, 0.27, 0.02), smoothstep(0.0, 0.3, heat));
      col = mix(col, vec3(1.3, 0.7, 0.12), smoothstep(0.26, 0.62, heat));
      col = mix(col, vec3(1.5, 1.12, 0.45), smoothstep(0.72, 1.0, heat));
      col *= vColor.rgb;
      // 미리 곱한 알파로 내보낸다: 불꽃 몸통(덮어 그림) + 둘레로 번지는 붉은 빛(더해 그림)
      vec3 glow = vec3(1.0, 0.36, 0.06) * vColor.rgb * m * life * 0.3;
      if (a + m * life < 0.004) discard;
      gl_FragColor = vec4(col * a + glow, a);
      ${TAIL}
      return;
    } else {
      a = m * vColor.a;
      col = vColor.rgb + vec3(m * m * m) * uHot * max(vColor.r, max(vColor.g, vColor.b)) * 0.4;
    }
    if (a < 0.004) discard;
    gl_FragColor = vec4(col, a);
    ${TAIL}
    #include <fog_fragment>
  }
`;

const FIELDS = ['x', 'y', 'z', 'vx', 'vy', 'vz', 'age', 'life', 's0', 's1', 'r', 'g', 'b', 'r1', 'g1', 'b1', 'a',
  'grav', 'drag', 'rot', 'rotV', 'tex', 'stretch', 'fadeIn', 'pow', 'turb', 'flick', 'phase'];

// 입자 하나를 채워 넣는 공용 틀(할당 없이 재사용)
export const P = {};
export function np() {
  P.x = P.y = P.z = P.vx = P.vy = P.vz = 0; P.age = 0; P.life = 0.5; P.s0 = 0.3; P.s1 = 0.3;
  P.r = P.g = P.b = 1; P.r1 = -1; P.g1 = P.b1 = 0; P.a = 1; P.grav = 0; P.drag = 0; P.rot = 0; P.rotV = 0; P.tex = 0;
  P.stretch = 0; P.fadeIn = 0; P.pow = 1.5; P.turb = 0; P.flick = 0; P.phase = Math.random() * 6.283;
  return P;
}
const _c = new THREE.Color();
export function pcol(hex, mul = 1) { _c.setHex(hex); P.r = _c.r * mul; P.g = _c.g * mul; P.b = _c.b * mul; }
export function pcol1(hex, mul = 1) { _c.setHex(hex); P.r1 = _c.r * mul; P.g1 = _c.g * mul; P.b1 = _c.b * mul; }

export class ParticleBatch {
  // mode: 'add'(가산 — 섬광·불티) | 'nrm'(일반 — 연기·먼지, 안개 받음) | 'fire'(일반 + 침식 — 불길)
  constructor(cap, atlas, mode) {
    const additive = mode === 'add', fire = mode === 'fire';
    this.cap = cap; this.n = 0; this.d = {};
    for (const f of FIELDS) this.d[f] = new Float32Array(cap);
    const quad = new THREE.PlaneGeometry(1, 1);
    const g = new THREE.InstancedBufferGeometry(); g.index = quad.index; g.attributes.position = quad.attributes.position; g.attributes.uv = quad.attributes.uv;
    const mk = (n) => { const a = new THREE.InstancedBufferAttribute(new Float32Array(cap * n), n); a.setUsage(THREE.DynamicDrawUsage); return a; };
    this.aPos = mk(3); this.aA = mk(4); this.aCol = mk(4); this.aDir = mk(3);
    g.setAttribute('iPos', this.aPos); g.setAttribute('iA', this.aA); g.setAttribute('iColor', this.aCol); g.setAttribute('iDir', this.aDir);
    g.instanceCount = 0; this.geo = g;
    const uniforms = { uMap: { value: atlas }, uHot: { value: additive ? 1 : 0 }, uErode: { value: fire ? 1 : 0 }, uGain: additive || fire ? GAIN : { value: 1 },
      fogColor: { value: new THREE.Color(0, 0, 0) }, fogNear: { value: 1 }, fogFar: { value: 2000 }, fogDensity: { value: 0.00025 } };
    this.mat = new THREE.ShaderMaterial({ uniforms, vertexShader: P_VERT, fragmentShader: P_FRAG, fog: mode === 'nrm',
      transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, side: THREE.DoubleSide });
    if (fire) { this.mat.blending = THREE.CustomBlending; this.mat.blendSrc = THREE.OneFactor; this.mat.blendDst = THREE.OneMinusSrcAlphaFactor; this.mat.blendSrcAlpha = THREE.OneFactor; this.mat.blendDstAlpha = THREE.OneMinusSrcAlphaFactor; }
    this.mesh = new THREE.Mesh(g, this.mat); this.mesh.frustumCulled = false; this.mesh.renderOrder = additive ? 30 : fire ? 26 : 20; this.mesh.name = 'vfx_' + mode;
    this.attrs = [this.aPos, this.aA, this.aCol, this.aDir]; this.sizes = [3, 4, 4, 3];
  }
  push() {
    if (this.n >= this.cap) return -1;
    const i = this.n++, d = this.d;
    for (let k = 0; k < FIELDS.length; k++) { const f = FIELDS[k]; d[f][i] = P[f]; }
    return i;
  }
  update(dt) {
    const d = this.d, pos = this.aPos.array, A = this.aA.array, col = this.aCol.array, dir = this.aDir.array;
    let n = this.n;
    for (let i = 0; i < n; i++) {
      let age = d.age[i] + dt;
      if (age >= d.life[i]) {             // 죽은 입자는 끝의 것과 자리를 바꾼다
        n--; if (i < n) { for (let k = 0; k < FIELDS.length; k++) { const a = d[FIELDS[k]]; a[i] = a[n]; } i--; }
        continue;
      }
      d.age[i] = age;
      const i3 = i * 3, i4 = i * 4;
      if (age < 0) { A[i4] = 0; col[i4 + 3] = 0; pos[i3] = d.x[i]; pos[i3 + 1] = d.y[i]; pos[i3 + 2] = d.z[i]; continue; }   // 지연 대기
      let vx = d.vx[i], vy = d.vy[i], vz = d.vz[i];
      const dr = d.drag[i]; if (dr > 0) { const k = Math.max(0, 1 - dr * dt); vx *= k; vy *= k; vz *= k; }
      vy -= d.grav[i] * dt;
      const tb = d.turb[i]; if (tb > 0) { const ph = d.phase[i]; vx += Math.sin(ph + age * 3.1) * tb * dt; vz += Math.cos(ph * 1.7 + age * 2.3) * tb * dt; vy += Math.sin(ph * 2.3 + age * 1.9) * tb * dt * 0.3; }
      d.vx[i] = vx; d.vy[i] = vy; d.vz[i] = vz;
      const x = d.x[i] += vx * dt, y = d.y[i] += vy * dt, z = d.z[i] += vz * dt;
      const rot = d.rot[i] += d.rotV[i] * dt;
      const t = age / d.life[i], e = 1 - (1 - t) * (1 - t);
      pos[i3] = x; pos[i3 + 1] = y; pos[i3 + 2] = z;
      const st = d.stretch[i];
      let sEff = 0;
      if (st > 0) { const sp = Math.sqrt(vx * vx + vy * vy + vz * vz); sEff = st * sp + 0.001; const inv = sp > 1e-5 ? 1 / sp : 0; dir[i3] = vx * inv * (sp > 1e-5 ? 1 : 0); dir[i3 + 1] = sp > 1e-5 ? vy * inv : 1; dir[i3 + 2] = vz * inv; }
      A[i4] = d.s0[i] + (d.s1[i] - d.s0[i]) * e; A[i4 + 1] = rot; A[i4 + 2] = sEff; A[i4 + 3] = d.tex[i];
      let al = d.a[i] * Math.pow(1 - t, d.pow[i]);
      const fi = d.fadeIn[i]; if (fi > 0 && t < fi) al *= t / fi;
      const fl = d.flick[i]; if (fl > 0) al *= 0.55 + 0.45 * Math.sin(d.phase[i] + age * fl);
      if (d.r1[i] >= 0) { col[i4] = d.r[i] + (d.r1[i] - d.r[i]) * t; col[i4 + 1] = d.g[i] + (d.g1[i] - d.g[i]) * t; col[i4 + 2] = d.b[i] + (d.b1[i] - d.b[i]) * t; }
      else { col[i4] = d.r[i]; col[i4 + 1] = d.g[i]; col[i4 + 2] = d.b[i]; }
      col[i4 + 3] = al;
    }
    this.n = n; this.geo.instanceCount = n;
    if (n > 0) {
      for (let j = 0; j < 4; j++) { const a = this.attrs[j]; a.clearUpdateRanges(); a.addUpdateRange(0, n * this.sizes[j]); a.needsUpdate = true; }
    }
    this.mesh.visible = n > 0;
  }
  reset() { this.n = 0; this.geo.instanceCount = 0; this.mesh.visible = false; }
  dispose() { this.geo.dispose(); this.mat.dispose(); }
}

// ───────────────────────── 메시용 셰이더 재질 ─────────────────────────
const FRAG = {
  // 텍스처 마스크 한 장(마법진·자국·빛 원반)
  tex: `uniform float uGain; uniform sampler2D uMap; uniform vec3 uColor; uniform float uOpacity, uIntensity, uRot; varying vec2 vUv;
    void main(){ vec2 p = vUv - 0.5; float s = sin(uRot), c = cos(uRot); p = vec2(p.x * c - p.y * s, p.x * s + p.y * c) + 0.5;
      float m = texture2D(uMap, p).r; float a = m * uOpacity; if (a < 0.003) discard;
      gl_FragColor = vec4(uColor * uIntensity * (1.0 + m * 0.6), a); ${TAIL} }`,
  // 바닥 충격파 고리(절차식)
  ring: `uniform float uGain; uniform vec3 uColor; uniform float uOpacity, uIntensity, uRadius, uWidth, uFill; varying vec2 vUv;
    void main(){ vec2 p = vUv - 0.5; float r = length(p) * 2.0; float ang = atan(p.y, p.x);
      float n = 0.5 + 0.5 * sin(ang * 17.0 + sin(ang * 5.0) * 2.5) * sin(ang * 9.0 - 1.3);
      float wv = uWidth * (0.55 + 0.9 * n);
      float ring = smoothstep(uRadius - wv, uRadius - wv * 0.12, r) * (1.0 - smoothstep(uRadius, uRadius + 0.02, r)) * (0.65 + 0.35 * n);
      float trail = smoothstep(uRadius - uWidth * 3.5, uRadius, r) * step(r, uRadius) * 0.3 * n * n;
      float fill = (1.0 - smoothstep(0.0, uRadius, r)) * uFill;
      float a = (ring + trail + fill) * uOpacity; if (a < 0.003) discard;
      gl_FragColor = vec4(uColor * uIntensity * (1.0 + ring * 1.2), a); ${TAIL} }`,
  // 보스 장판 예고
  tele: `uniform float uGain; uniform vec3 uColor; uniform float uOpacity, uProgress, uTime, uFlash; varying vec2 vUv;
    void main(){ vec2 p = vUv - 0.5; float r = length(p) * 2.0; float ang = atan(p.y, p.x);
      float inside = 1.0 - smoothstep(0.985, 1.0, r);
      float border = smoothstep(0.93, 0.955, r) * inside;
      float border2 = smoothstep(0.86, 0.87, r) * (1.0 - smoothstep(0.875, 0.885, r)) * 0.5;
      float fill = 1.0 - smoothstep(uProgress - 0.015, uProgress, r);
      float edge = smoothstep(uProgress - 0.10, uProgress, r) * fill;
      float rays = 0.5 + 0.5 * sin(ang * 28.0 + r * 9.0 - uTime * 5.0);
      float pulse = 0.75 + 0.25 * sin(uTime * 10.0);
      float a = inside * 0.14 + border * 0.95 + border2 + fill * (0.26 + rays * 0.12) * pulse + edge * 0.85 + uFlash * inside;
      a *= uOpacity; if (a < 0.003) discard;
      vec3 col = uColor * (1.2 + border * 1.4 + edge * 2.2 + uFlash * 2.5) + vec3(1.0, 0.8, 0.5) * (edge * edge * 0.8 + uFlash * 0.6);
      gl_FragColor = vec4(col, a); ${TAIL} }`,
  // 검기(초승달)
  slash: `uniform float uGain; uniform sampler2D uMap; uniform vec3 uColor; uniform float uOpacity, uIntensity, uHead, uTail, uTime; varying vec2 vUv;
    void main(){ float d = uHead - vUv.x;
      float sweep = smoothstep(0.0, 0.035, d) * pow(1.0 - clamp(d / uTail, 0.0, 1.0), 1.4);
      float v = vUv.y;
      float streak = texture2D(uMap, vec2(vUv.x * 1.6 - uTime * 1.5, v * 0.9)).r;
      float edge = pow(v, 9.0);
      float body = pow(v, 0.9) * (0.38 + streak * 1.1);
      float aa = smoothstep(1.0, 0.965, v) * smoothstep(0.0, 0.18, v);
      float headGlow = smoothstep(0.22, 0.0, d) * step(0.0, d);
      float m = (edge * 1.2 + body) * aa * sweep * (1.0 + headGlow * 1.2);
      float a = clamp(m, 0.0, 1.0) * uOpacity; if (a < 0.003) discard;
      vec3 col = mix(uColor, vec3(1.0), clamp(edge * 0.9 + headGlow * 0.3, 0.0, 0.85)) * uIntensity * (0.75 + edge * 1.3 + streak * 0.5);
      gl_FragColor = vec4(col, a); ${TAIL} }`,
  // 빛기둥(원통)
  beam: `uniform float uGain; uniform sampler2D uMap; uniform vec3 uColor; uniform float uOpacity, uIntensity, uTime, uTopFade, uSpeed; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
    void main(){ float rim = pow(abs(dot(normalize(vN), normalize(vV))), 1.6);
      float s = texture2D(uMap, vec2(vUv.x * 3.0, vUv.y * 1.5 - uTime * uSpeed)).r;
      float s2 = texture2D(uMap, vec2(vUv.x * 2.0 + 0.37, vUv.y * 0.8 - uTime * uSpeed * 0.6)).r;
      float m = rim * (0.35 + s * 0.9 + s2 * 0.5) * pow(1.0 - vUv.y, uTopFade) * smoothstep(0.0, 0.03, vUv.y);
      float a = clamp(m, 0.0, 1.0) * uOpacity; if (a < 0.003) discard;
      gl_FragColor = vec4(mix(uColor, vec3(1.0), rim * rim * 0.35) * uIntensity, a); ${TAIL} }`,
  // 무기 궤적 띠
  trail: `uniform float uGain; uniform sampler2D uMap; uniform vec3 uColor; uniform float uOpacity, uIntensity; varying vec2 vUv;
    void main(){ float u = vUv.x, v = vUv.y;
      float streak = texture2D(uMap, vec2(u * 1.2, v)).r;
      float fade = pow(clamp(1.0 - u, 0.0, 1.0), 2.0);
      float edge = pow(v, 6.0);
      float m = (edge * 0.9 + pow(v, 1.6) * (0.10 + streak * 0.42)) * fade * smoothstep(1.0, 0.96, v) * smoothstep(0.0, 0.25, v);
      float a = clamp(m, 0.0, 1.0) * uOpacity; if (a < 0.003) discard;
      gl_FragColor = vec4(mix(uColor, vec3(1.0), edge * fade * 0.45) * uIntensity * (0.8 + edge * 0.6), a); ${TAIL} }`,
};
const UNI = {
  tex: () => ({ uMap: { value: null }, uColor: { value: new THREE.Color(1, 1, 1) }, uOpacity: { value: 1 }, uIntensity: { value: 1 }, uRot: { value: 0 } }),
  ring: () => ({ uColor: { value: new THREE.Color(1, 1, 1) }, uOpacity: { value: 1 }, uIntensity: { value: 1 }, uRadius: { value: 0.5 }, uWidth: { value: 0.1 }, uFill: { value: 0 } }),
  tele: () => ({ uColor: { value: new THREE.Color(1, 0, 0) }, uOpacity: { value: 1 }, uProgress: { value: 0 }, uTime: { value: 0 }, uFlash: { value: 0 } }),
  slash: () => ({ uMap: { value: null }, uColor: { value: new THREE.Color(1, 1, 1) }, uOpacity: { value: 1 }, uIntensity: { value: 2 }, uHead: { value: 0 }, uTail: { value: 1 }, uTime: { value: 0 } }),
  beam: () => ({ uMap: { value: null }, uColor: { value: new THREE.Color(1, 1, 1) }, uOpacity: { value: 1 }, uIntensity: { value: 1.5 }, uTime: { value: 0 }, uTopFade: { value: 1.5 }, uSpeed: { value: 1 } }),
  trail: () => ({ uMap: { value: null }, uColor: { value: new THREE.Color(1, 1, 1) }, uOpacity: { value: 1 }, uIntensity: { value: 1.6 } }),
};
export function makeMat(kind) {
  const uniforms = UNI[kind](); uniforms.uGain = GAIN;
  return new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: FRAG[kind], transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
}

// ───────────────────────── 도형 ─────────────────────────
// 초승달 띠: XZ 평면, 앞(+Z)을 기준으로 각도 a0 → a1 (양수 = 캐릭터 오른쪽(-X))
export function arcGeometry(a0, a1, wmax, taper = true, segs = 56) {
  const pos = new Float32Array((segs + 1) * 6), uv = new Float32Array((segs + 1) * 4), idx = [];
  for (let i = 0; i <= segs; i++) {
    const u = i / segs, th = a0 + (a1 - a0) * u;
    const w = wmax * (taper ? Math.pow(Math.sin(Math.PI * u), 0.75) * (0.55 + 0.45 * u) : 1) + 0.002;
    const sx = -Math.sin(th), cz = Math.cos(th), ri = 1 - w;
    pos.set([sx, 0, cz, sx * ri, 0, cz * ri], i * 6); uv.set([u, 1, u, 0], i * 4);
    if (i < segs) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array((segs + 1) * 6).fill(0).map((_, i) => i % 3 === 1 ? 1 : 0), 3));
  g.setIndex(idx); return g;
}
export function buildGeometries() {
  const D = Math.PI / 180;
  return {
    plane: new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2),          // 바닥용(반지름 1)
    quad: new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0),            // 세로 판(밑변이 원점)
    cyl: new THREE.CylinderGeometry(1, 1, 1, 32, 1, true).translate(0, 0.5, 0),
    cone: new THREE.CylinderGeometry(1.6, 1, 1, 32, 1, true).translate(0, 0.5, 0),
    arc: arcGeometry(85 * D, -85 * D, 0.62),
    arcSmash: arcGeometry(115 * D, -38 * D, 0.62),
    arcSpin: arcGeometry(120 * D, (120 - 400) * D, 0.42, true, 96),
  };
}

// ───────────────────────── 메시 풀 ─────────────────────────
export class MeshPool {
  constructor(geos) { this.geos = geos; this.free = new Map(); this.all = []; }
  take(geo, kind, parent) {
    const key = geo + '|' + kind; let list = this.free.get(key); let m = list && list.pop();
    if (!m) { m = new THREE.Mesh(this.geos[geo], makeMat(kind)); m.userData.poolKey = key; m.frustumCulled = false; this.all.push(m); }
    m.position.set(0, 0, 0); m.rotation.set(0, 0, 0); m.scale.set(1, 1, 1); m.visible = true; m.renderOrder = 10;
    m.material.blending = THREE.AdditiveBlending; m.material.depthTest = true;
    parent.add(m); return m;
  }
  release(m) {
    if (!m || !m.userData.poolKey) return;
    if (m.parent) m.parent.remove(m);
    let list = this.free.get(m.userData.poolKey); if (!list) this.free.set(m.userData.poolKey, list = []);
    if (list.indexOf(m) < 0) list.push(m);
  }
  dispose() { for (const m of this.all) { if (m.parent) m.parent.remove(m); m.material.dispose(); } for (const k in this.geos) this.geos[k].dispose(); this.all.length = 0; this.free.clear(); }
}
