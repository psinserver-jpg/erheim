// 〈에르하임〉 이펙트 모음 (SPEC 4절).
// - 텍스처는 전부 캔버스로 그린다(vfx_textures.js). 입자는 인스턴싱 묶음 3개(가산 섬광 / 불길 / 연기), 메시·그룹은 풀에서 꺼내 쓴다(vfx_core.js).
// - 좌표: Y 위. yaw 는 object.rotation.y 와 같은 뜻(0 이면 +Z 를 바라봄, 앞 = (sin yaw, 0, cos yaw)).
// - 블룸 전제로 색을 1 보다 세게 낸다(가산 혼합).
import * as THREE from 'three';
import { buildTextures, CELL } from './vfx_textures.js';
import { ParticleBatch, MeshPool, buildGeometries, makeMat, P, np, pcol, pcol1, GAIN } from './vfx_core.js';

const S = { ok: false, scene: null, camera: null, renderer: null, root: null, add: null, nrm: null, fire: null, pool: null, tex: null, effects: [], time: 0, gen: 0 };
const PI = Math.PI, TAU = PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp01 = (x) => x < 0 ? 0 : x > 1 ? 1 : x;
const easeOut = (x) => 1 - (1 - x) * (1 - x);
const easeOut3 = (x) => 1 - Math.pow(1 - x, 3);
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3(), _v4 = new THREE.Vector3(), _q = new THREE.Quaternion(), _m = new THREE.Matrix4();
const UP = new THREE.Vector3(0, 1, 0), _c1 = new THREE.Color(), _c2 = new THREE.Color();
const DUST = 0xb8a88a;

// ───────────── 이펙트 수명 관리 ─────────────
// cleanup = 정리(메시 반환·그룹 제거만 — 새 이펙트를 만들거나 콜백을 부르지 않는다). 수명이 끝나든, 취소(dead)되든, clear() 되든 한 번 불린다.
// done    = 완료(후속 이펙트·onHit 등). 수명을 다 채워 자연스럽게 끝났을 때만 불린다.
function run(dur, tick, cleanup, done) { const e = { t: 0, dur, tick, cleanup, done, dead: false }; S.effects.push(e); return e; }
function after(sec, fn) { return run(sec, null, null, fn); }
function mesh(geo, kind, parent) { return S.pool.take(geo, kind, parent || S.root); }
function free(a, b, c, d, e) { const p = S.pool; if (a) p.release(a); if (b) p.release(b); if (c) p.release(c); if (d) p.release(d); if (e) p.release(e); }
// 그룹·벡터 풀(호출마다 새로 만들지 않는다)
const GP = [], VP = [];
function grp(parent) { const g = GP.pop() || new THREE.Group(); g.position.set(0, 0, 0); g.rotation.set(0, 0, 0); g.scale.set(1, 1, 1); g.visible = true; (parent || S.root).add(g); return g; }
function ungrp(g) { if (!g) return; if (g.parent) g.parent.remove(g); if (GP.length < 96 && GP.indexOf(g) < 0) GP.push(g); }
function vtake() { return VP.pop() || new THREE.Vector3(); }
function vfree(a, b, c, d) { VP.push(a, b, c, d); }
function setU(m, color, opacity, intensity) { const u = m.material.uniforms; if (color != null) u.uColor.value.setHex(color); if (opacity != null) u.uOpacity.value = opacity; if (intensity != null && u.uIntensity) u.uIntensity.value = intensity; return u; }
function worldPos(o, out) { return o.isObject3D ? o.getWorldPosition(out) : out.set(o.x, o.y || 0, o.z); }

// ───────────── 입자 뿌리기 도우미 ─────────────
function dirRand(ymin, ymax) { const y = rnd(ymin, ymax), r = Math.sqrt(Math.max(0, 1 - y * y)), a = Math.random() * TAU; return _v4.set(Math.cos(a) * r, y, Math.sin(a) * r); }
function glowAt(x, y, z, color, s0, s1, life, a = 1, mul = 1.2, tex = CELL.GLOW) {
  mul *= 0.62;
  np(); P.x = x; P.y = y; P.z = z; P.s0 = s0; P.s1 = s1; P.life = life; P.a = a; P.tex = tex; P.pow = 2; pcol(color, mul); return S.add.push();
}
function sparks(x, y, z, n, color, v0, v1, o = {}) {
  const ymin = o.ymin ?? -0.3, ymax = o.ymax ?? 1, grav = o.grav ?? 14, life0 = o.life0 ?? 0.25, life1 = o.life1 ?? 0.55, size = o.size ?? 0.13, delay = o.delay ?? 0;
  for (let i = 0; i < n; i++) {
    const d = dirRand(ymin, ymax), sp = rnd(v0, v1); np();
    P.x = x + d.x * 0.1; P.y = y + d.y * 0.1; P.z = z + d.z * 0.1; P.vx = d.x * sp; P.vy = d.y * sp; P.vz = d.z * sp;
    P.life = rnd(life0, life1); P.s0 = size * rnd(0.7, 1.3); P.s1 = size * 0.25; P.grav = grav; P.drag = o.drag ?? 2.2; P.stretch = o.stretch ?? 0.06; P.tex = CELL.SPARK; P.pow = 1.2; P.age = -delay;
    pcol(color, rnd(1.2, 2.0)); if (Math.random() < 0.35) { P.r = Math.max(P.r, 1.6); P.g = Math.max(P.g, 1.6); P.b = Math.max(P.b, 1.4); }
    S.add.push();
  }
}
const SMK = [CELL.SMOKE, CELL.SMOKE2, CELL.SMOKE3];
function smokeTex() { return SMK[Math.random() * 3 | 0]; }
function smokePuffs(x, y, z, n, color, o = {}) {
  const sp = o.speed ?? 1.5, size = o.size ?? 1, rise = o.rise ?? 0.6, alpha = o.alpha ?? 0.32, life = o.life ?? 1, spread = o.spread ?? 0.2, delay = o.delay ?? 0;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * TAU, v = sp * rnd(0.4, 1); np();
    P.x = x + Math.cos(a) * spread * Math.random(); P.y = y + rnd(0.05, 0.25) * size; P.z = z + Math.sin(a) * spread * Math.random();
    P.vx = Math.cos(a) * v; P.vz = Math.sin(a) * v; P.vy = rise * rnd(0.4, 1.2);
    P.life = life * rnd(0.7, 1.3); P.s0 = size * rnd(0.5, 0.8); P.s1 = size * rnd(1.6, 2.4); P.drag = o.drag ?? 2.2; P.rot = Math.random() * TAU; P.rotV = rnd(-1, 1);
    P.a = alpha * rnd(0.7, 1.1); P.tex = smokeTex(); P.fadeIn = 0.08; P.pow = 1.4; P.age = -delay; pcol(color, rnd(0.8, 1.1));
    S.nrm.push();
  }
}
function debris(x, y, z, n, v0, v1, size = 0.1) {
  for (let i = 0; i < n; i++) {
    const d = dirRand(0.4, 1), sp = rnd(v0, v1); np();
    P.x = x; P.y = y + 0.1; P.z = z; P.vx = d.x * sp; P.vy = d.y * sp; P.vz = d.z * sp; P.grav = 22; P.life = rnd(0.5, 0.9); P.s0 = size * rnd(0.6, 1.5); P.s1 = P.s0 * 0.8;
    P.tex = CELL.DOT; P.a = 0.95; P.pow = 0.5; pcol(0x2a241c, rnd(0.6, 1.3)); S.nrm.push();
  }
}

// ───────────── 초기화 / 갱신 ─────────────
function init({ scene, camera, renderer }) {
  if (S.ok) dispose();
  S.scene = scene; S.camera = camera; S.renderer = renderer;
  S.tex = buildTextures();
  if (renderer && renderer.capabilities) { const an = Math.min(4, renderer.capabilities.getMaxAnisotropy()); for (const k of ['rune', 'crack', 'scorch']) S.tex[k].anisotropy = an; }
  S.root = new THREE.Group(); S.root.name = 'VFX'; scene.add(S.root);
  S.add = new ParticleBatch(7000, S.tex.atlas, 'add'); S.nrm = new ParticleBatch(2500, S.tex.atlas, 'nrm'); S.fire = new ParticleBatch(2500, S.tex.atlas, 'fire');
  S.root.add(S.nrm.mesh, S.fire.mesh, S.add.mesh);
  S.pool = new MeshPool(buildGeometries());
  S.effects.length = 0; S.time = 0; S.ok = true;
}
function update(dt) {
  if (!S.ok) return;
  if (!(dt > 0)) dt = 0; if (dt > 0.1) dt = 0.1;
  S.time += dt;
  const fx = S.effects, gen = S.gen;
  for (let i = 0; i < fx.length; i++) {
    const e = fx[i];
    // dt 가 0(일시정지)이면 tick 을 건너뛴다 — 시간도 입자 방출도 멈춘다. 취소된 것의 정리만 한다.
    if (!e.dead && dt > 0) { e.t += dt; if (e.tick) { e.tick(e.dur === Infinity ? 0 : clamp01(e.t / e.dur), dt, e); if (S.gen !== gen) return; } }
    if (e.dead || e.t >= e.dur) {
      const natural = !e.dead; e.dead = true; fx[i] = fx[fx.length - 1]; fx.pop(); i--;
      if (e.cleanup) e.cleanup(e);
      if (natural && e.done) { e.done(e); if (S.gen !== gen) return; }
    }
  }
  S.nrm.update(dt); S.fire.update(dt); S.add.update(dt);
}
function count() { return S.effects.length; }
function setIntensity(g) { GAIN.value = g; }
// 전부 즉시 제거: 정리 콜백만 부른다(후속 폭발·충격파·onHit 은 일어나지 않는다). 핸들은 그 뒤로 아무 일도 하지 않는다.
function clear() {
  if (!S.ok) return;
  S.gen++; const fx = S.effects;
  for (let i = 0; i < fx.length; i++) { const e = fx[i]; e.dead = true; if (e.cleanup) { try { e.cleanup(e); } catch (err) { /* 정리 중 오류는 무시 */ } } }
  fx.length = 0; S.add.reset(); S.nrm.reset(); S.fire.reset();
}
function dispose() {
  if (!S.ok) return; clear();
  S.pool.dispose(); S.add.dispose(); S.nrm.dispose(); S.fire.dispose(); for (const k in S.tex) S.tex[k].dispose();
  GP.length = 0; if (S.root.parent) S.root.parent.remove(S.root); S.ok = false;
}
function textureFor(name) { return S.tex ? (S.tex[name] || null) : null; }

// ───────────── 바닥 고리 공용 ─────────────
function groundRing(x, y, z, radius, color, dur, o = {}) {
  const m = mesh('plane', 'ring', o.parent); m.position.set(x, y + (o.lift ?? 0.05), z); m.scale.setScalar(radius); m.renderOrder = 12;   // o.parent 를 주면 그 그룹 기준 좌표(대상을 따라감)
  const u = setU(m, color, 1, o.intensity ?? 1.8); u.uFill.value = o.fill ?? 0;
  const w0 = o.w0 ?? 0.2, w1 = o.w1 ?? 0.04, r0 = o.r0 ?? 0.08;
  run(dur, (k) => { const e = easeOut3(k); u.uRadius.value = r0 + (0.97 - r0) * e; u.uWidth.value = w0 + (w1 - w0) * e; u.uOpacity.value = Math.pow(1 - k, 1.3) * (o.opacity ?? 1); }, () => free(m));
}
function groundGlow(x, y, z, radius, color, dur, intensity = 1.5, opacity = 0.9) {
  const m = mesh('plane', 'tex'); m.position.set(x, y + 0.04, z); m.scale.setScalar(radius); m.renderOrder = 11;
  const u = setU(m, color, opacity, intensity); u.uMap.value = S.tex.glow; u.uRot.value = 0;
  run(dur, (k) => { u.uOpacity.value = opacity * Math.pow(1 - k, 1.6); }, () => free(m));
}

// ───────────── 검기 ─────────────
const SLASH = {
  arc1: { geo: 'arc', rz: -42, rx: -8, h: 1.2, R: 1.8, dur: 0.34, sweep: 0.1, a0: 85, a1: -85 },
  arc2: { geo: 'arc', rz: 7, rx: 0, h: 1.05, R: 1.85, dur: 0.34, sweep: 0.1, a0: 85, a1: -85 },
  smash: { geo: 'arcSmash', rz: -90, rx: 0, h: 1.0, R: 1.9, dur: 0.38, sweep: 0.11, a0: 115, a1: -38 },
  spin: { geo: 'arcSpin', rz: 0, rx: 0, h: 0.95, R: 2.3, dur: 0.52, sweep: 0.22, a0: 120, a1: -280 },
};
function slash(pos, yaw = 0, o = {}) {
  if (!S.ok) return;
  const kind = SLASH[o.kind] ? o.kind : 'arc1', c = SLASH[kind], color = o.color ?? 0x9fd0ff, sc = o.scale ?? 1, D = PI / 180;
  const g = grp(); g.position.set(pos.x, (pos.y || 0) + c.h * sc, pos.z); g.rotation.y = yaw;
  const m1 = mesh(c.geo, 'slash', g), m2 = mesh(c.geo, 'slash', g);
  m1.rotation.set(c.rx * D, 0, c.rz * D); m1.renderOrder = 25; m1.material.uniforms.uMap.value = S.tex.slash;
  const u1 = setU(m1, color, 1, 1.7), u2 = setU(m2, color, 0.5, 1.0);
  if (kind === 'arc1' && S.camera) {
    // 사선(오른위→왼아래)은 그대로 두고, 띠가 카메라에 모로 서서 실처럼 보일 때만 사선 축(띠의 양 끝을 잇는 선)을 중심으로
    // 띠 면을 카메라 쪽으로 눕힌다(최대 40°). 방향은 뒤집히지 않는다.
    g.updateMatrixWorld(true); const e = m1.matrixWorld.elements; _v.set(e[4], e[5], e[6]).normalize(); _v2.set(e[8], e[9], e[10]).normalize();
    _v3.setFromMatrixPosition(S.camera.matrixWorld).sub(g.position).normalize();
    const vn = _v3.dot(_v), vb = _v3.dot(_v2);
    if (Math.abs(vn) < 0.6) { const lim = 40 * D, d = Math.atan2(vb * (vn < 0 ? -1 : 1), Math.abs(vn)); m1.rotateX(d < -lim ? -lim : d > lim ? lim : d); }
  }
  m2.quaternion.copy(m1.quaternion); m2.renderOrder = 25; m2.material.uniforms.uMap.value = S.tex.slash;
  u1.uHead.value = u2.uHead.value = 0;
  const R = c.R * sc;
  // 띠에서 떨어져 나가는 불티
  m1.scale.setScalar(R); g.updateMatrixWorld(true);
  const n = kind === 'spin' ? 22 : 12;
  for (let i = 0; i < n; i++) {
    const uu = rnd(0.1, 0.95), th = (c.a0 + (c.a1 - c.a0) * uu) * D, sg = Math.sign(c.a1 - c.a0);
    m1.localToWorld(_v.set(-Math.sin(th), 0, Math.cos(th)));
    _v2.set(-Math.cos(th) * sg, 0, -Math.sin(th) * sg).transformDirection(m1.matrixWorld);
    _v3.set(-Math.sin(th), 0, Math.cos(th)).transformDirection(m1.matrixWorld);
    np(); const sp = rnd(3, 9) * sc;
    P.x = _v.x; P.y = _v.y; P.z = _v.z; P.vx = _v2.x * sp + _v3.x * sp * 0.5; P.vy = _v2.y * sp + _v3.y * sp * 0.5 + 1; P.vz = _v2.z * sp + _v3.z * sp * 0.5;
    P.life = rnd(0.2, 0.42); P.s0 = 0.11 * sc; P.s1 = 0.03; P.stretch = 0.05; P.tex = CELL.SPARK; P.drag = 3; P.grav = 5; P.age = -uu * c.sweep; pcol(color, rnd(1.5, 2.6));
    S.add.push();
  }
  run(c.dur, (k, dt, e) => {
    const hs = (t) => easeOut(clamp01(t / c.sweep)) * 1.08;
    const fade = e.t < c.sweep ? 1 : Math.pow(1 - (e.t - c.sweep) / (c.dur - c.sweep), 1.7);
    u1.uHead.value = hs(e.t); u2.uHead.value = hs(e.t - 0.025);
    u1.uTail.value = u2.uTail.value = 1.15 - 0.55 * k; u1.uTime.value = u2.uTime.value = e.t;
    u1.uOpacity.value = fade; u2.uOpacity.value = fade * 0.55;
    m1.scale.setScalar(R * (0.94 + 0.14 * k)); m2.scale.setScalar(R * (1.04 + 0.22 * k));
  }, () => { free(m1, m2); ungrp(g); });
  const fx = Math.sin(yaw), fz = Math.cos(yaw), py = pos.y || 0;
  if (kind === 'smash') {
    const ix = pos.x + fx * 1.55 * sc, iz = pos.z + fz * 1.55 * sc;
    after(c.sweep * 0.9, () => {
      shockwave({ x: ix, y: py, z: iz }, 2.6 * sc, { color });
      groundDecal({ x: ix, y: py, z: iz }, { kind: 'crack', radius: 1.7 * sc, duration: 3.5, color });
      glowAt(ix, py + 0.3, iz, 0xffffff, 1.2 * sc, 3.6 * sc, 0.14, 1, 1.6);
      sparks(ix, py + 0.15, iz, 22, color, 4 * sc, 12 * sc, { ymin: 0.35, grav: 16 });
      debris(ix, py, iz, 10, 3, 8, 0.1 * sc);
      for (let i = 0; i < 7; i++) {   // 솟는 빛줄기
        np(); const a = Math.random() * TAU, r = rnd(0, 0.7) * sc; P.x = ix + Math.cos(a) * r; P.y = py; P.z = iz + Math.sin(a) * r; P.vy = rnd(7, 14) * sc; P.life = rnd(0.18, 0.32);
        P.s0 = 0.16 * sc; P.s1 = 0.03; P.stretch = 0.09; P.tex = CELL.SPARK; P.drag = 3; pcol(color, 2.2); S.add.push();
      }
    });
  } else if (kind === 'spin') {
    const px = pos.x, pz = pos.z;
    after(0.05, () => { groundRing(px, py, pz, 3.0 * sc, color, 0.45, { w0: 0.16, w1: 0.03, r0: 0.3, intensity: 1.4, opacity: 0.8 }); dust(_v.set(px, py, pz), { scale: 1.3 * sc }); });
  }
}

// ───────────── 타격 ─────────────
function hit(pos, o = {}) {
  if (!S.ok) return;
  const crit = !!o.crit, color = o.color ?? (crit ? 0xffb347 : 0xffd9a0), k = (o.scale ?? 1) * (crit ? 1.45 : 1), x = pos.x, y = pos.y || 0, z = pos.z;
  glowAt(x, y, z, 0xffffff, 0.9 * k, 2.4 * k, 0.11, 1, 2.6);
  glowAt(x, y, z, color, 2.2 * k, 4.4 * k, crit ? 0.3 : 0.22, 0.75, 1.6);
  const i1 = glowAt(x, y, z, 0xfff2d0, 1.6 * k, (crit ? 5.2 : 3.4) * k, crit ? 0.26 : 0.16, 1, 2.4, CELL.STAR);
  if (i1 >= 0) S.add.d.rot[i1] = rnd(-0.4, 0.4);
  if (crit) {
    const i2 = glowAt(x, y, z, color, 1.2 * k, 3.8 * k, 0.3, 0.9, 2.2, CELL.STAR); if (i2 >= 0) { S.add.d.rot[i2] = PI / 4 + rnd(-0.2, 0.2); S.add.d.rotV[i2] = 2; }
    glowAt(x, y, z, color, 0.5 * k, 5.0 * k, 0.26, 0.45, 1.4, CELL.RING);
  }
  sparks(x, y, z, crit ? 34 : 18, color, 5 * k, (crit ? 17 : 12) * k, { ymin: -0.5 });
  if (crit) sparks(x, y, z, 10, 0xffffff, 1.5, 5, { life0: 0.5, life1: 0.9, grav: 6, stretch: 0.04, size: 0.07 });
}

// ───────────── 충격파 / 먼지 ─────────────
function shockwave(pos, radius = 3, o = {}) {
  if (!S.ok) return;
  const color = o.color ?? 0xffe2b0, dur = o.duration ?? 0.55, x = pos.x, y = pos.y || 0, z = pos.z;
  groundRing(x, y, z, radius * 1.12, color, dur, { w0: 0.24, w1: 0.05, intensity: 1.5 });
  groundRing(x, y, z, radius * 0.8, color, dur * 0.8, { w0: 0.12, w1: 0.03, intensity: 1.2, opacity: 0.6, lift: 0.06 });
  groundGlow(x, y, z, radius * 0.9, color, dur * 0.5, 0.6, 0.4);
  // 먼지: 각도·출발 반경·속도·크기를 흩뜨려 도넛처럼 고르게 보이지 않게 한다(크고 느린 덩이 + 작고 빠른 줄기)
  const n = Math.min(44, Math.round(12 + radius * 5)), sp = radius / dur * 1.1;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * TAU, big = Math.random() < 0.4, q = big ? rnd(0.35, 0.8) : rnd(0.7, 1.25), r0 = radius * rnd(0.05, 0.5), sz = big ? rnd(0.5, 0.85) : rnd(0.16, 0.42); np();
    P.x = x + Math.cos(a) * r0; P.y = y + rnd(0.1, 0.35); P.z = z + Math.sin(a) * r0; P.vx = Math.cos(a) * sp * q; P.vz = Math.sin(a) * sp * q; P.vy = rnd(0.2, big ? 1.0 : 2.4);
    P.life = dur * rnd(1.4, 3.0); P.s0 = radius * sz * 0.4; P.s1 = radius * sz; P.drag = rnd(2.0, 3.4); P.rot = Math.random() * TAU; P.rotV = rnd(-1.2, 1.2); P.a = rnd(0.3, 0.6); P.tex = smokeTex(); P.fadeIn = 0.06; P.age = -Math.random() * dur * 0.18;
    pcol(DUST, rnd(0.65, 1.15)); S.nrm.push();
  }
  debris(x, y, z, Math.min(14, 4 + radius * 2 | 0), 2, 3 + radius * 1.5, 0.09);
}
function dust(pos, o = {}) {
  if (!S.ok) return; const sc = o.scale ?? 1;
  smokePuffs(pos.x, pos.y || 0, pos.z, Math.round(9 * Math.min(2, sc)), o.color ?? DUST, { speed: 2.4 * sc, size: 0.75 * sc, rise: 0.7, alpha: 0.5, life: 1.0, spread: 0.3 * sc });
}
function footDust(pos) {
  if (!S.ok) return;
  smokePuffs(pos.x, pos.y || 0, pos.z, 4, DUST, { speed: 1.0, size: 0.5, rise: 0.5, alpha: 0.5, life: 0.7, spread: 0.16 });
}

// ───────────── 빛기둥 공용 ─────────────
function beamMesh(parent, color, radius, height, o = {}) {
  const m = mesh(o.cone ? 'cone' : 'cyl', 'beam', parent); m.scale.set(radius, height, radius); m.renderOrder = 22;
  const u = setU(m, color, o.opacity ?? 1, o.intensity ?? 1.6); u.uMap.value = S.tex.beam; u.uTopFade.value = o.topFade ?? 1.6; u.uSpeed.value = o.speed ?? 1.2; u.uTime.value = Math.random() * 10;
  return m;
}
function runeMesh(parent, color, radius, intensity = 1.6) {
  const m = mesh('plane', 'tex', parent); m.position.y = 0.05; m.scale.setScalar(radius); m.renderOrder = 13;
  const u = setU(m, color, 1, intensity); u.uMap.value = S.tex.rune; u.uRot.value = 0; return m;
}
function riseSpark(x, y, z, color, o = {}) {
  np(); P.x = x; P.y = y; P.z = z; P.vy = rnd(o.v0 ?? 2.5, o.v1 ?? 6); P.life = rnd(o.life0 ?? 0.5, o.life1 ?? 1.1); P.s0 = (o.size ?? 0.11) * rnd(0.7, 1.4); P.s1 = P.s0 * 0.2;
  P.stretch = o.stretch ?? 0.07; P.tex = CELL.SPARK; P.turb = o.turb ?? 1.5; P.fadeIn = 0.1; P.pow = 1.2; pcol(color, rnd(1.4, 2.4)); S.add.push();
}

// ───────────── 레벨업 ─────────────
function levelUp(obj) {
  if (!S.ok || !obj) return;
  const GOLD = 0xffc84a, PALE = 0xfff0b0, g = grp(); worldPos(obj, g.position);
  const c1 = runeMesh(g, GOLD, 2.6, 2.0), c2 = runeMesh(g, 0xffa53a, 3.5, 1.1); c2.position.y = 0.04;
  const b1 = beamMesh(g, GOLD, 1.1, 10, { topFade: 1.3, speed: 1.6, intensity: 1.0 }), b2 = beamMesh(g, PALE, 0.4, 12, { topFade: 1.0, speed: 2.4, intensity: 1.3 });
  const b3 = beamMesh(g, 0xffa030, 2.0, 3.2, { topFade: 2.4, speed: 0.8, intensity: 1.0, cone: true });
  const u1 = c1.material.uniforms, u2 = c2.material.uniforms;
  let acc = 0, hacc = 0, burst = false; const ang0 = Math.random() * TAU;
  const p = g.position;
  glowAt(p.x, p.y + 1, p.z, 0xffffff, 2, 7, 0.22, 1, 2.4);
  glowAt(p.x, p.y + 1.1, p.z, PALE, 2, 8, 0.35, 0.9, 2.2, CELL.STAR);
  groundRing(0, 0, 0, 4.2, GOLD, 0.6, { intensity: 2.2, parent: g });     // 고리도 대상을 따라간다
  run(2.5, (k, dt, e) => {
    worldPos(obj, p); const t = e.t;
    const fin = clamp01(t / 0.18), fout = clamp01((2.5 - t) / 0.6), env = fin * fout;
    c1.scale.setScalar(2.6 * (0.3 + 0.7 * easeOut3(fin))); c2.scale.setScalar(3.5 * (0.2 + 0.8 * easeOut3(clamp01(t / 0.3))));
    u1.uRot.value = t * 1.3; u2.uRot.value = -t * 0.8; u1.uOpacity.value = env; u2.uOpacity.value = env * 0.7;
    const pulse = 0.85 + 0.15 * Math.sin(t * 18), open = easeOut3(clamp01(t / 0.25)), bo = clamp01((2.3 - t) / 0.9);
    b1.scale.set(1.25 * open * (0.75 + 0.25 * bo), 10, 1.25 * open * (0.75 + 0.25 * bo)); b1.material.uniforms.uOpacity.value = bo * pulse * 0.6; b1.material.uniforms.uTime.value += dt;
    b2.scale.set(0.45 * open * bo + 0.02, 12, 0.45 * open * bo + 0.02); b2.material.uniforms.uOpacity.value = bo * 0.8; b2.material.uniforms.uTime.value += dt;
    b3.material.uniforms.uOpacity.value = env * 0.7; b3.material.uniforms.uTime.value += dt;
    if (!burst && t > 0.12) { burst = true; sparks(p.x, p.y + 0.3, p.z, 46, GOLD, 5, 12, { ymin: 0.0, ymax: 0.5, grav: 3, life0: 0.5, life1: 1.0, drag: 2.5 }); }
    if (t < 2.0) {
      acc += dt * 150;
      while (acc >= 1) {
        acc--; const a = Math.random() * TAU, r = Math.sqrt(Math.random()) * 1.8;
        riseSpark(p.x + Math.cos(a) * r, p.y + rnd(0, 0.6), p.z + Math.sin(a) * r, Math.random() < 0.3 ? PALE : GOLD, { v0: 3, v1: 9, life0: 0.6, life1: 1.3 });
        if (Math.random() < 0.22) { const i = glowAt(p.x + Math.cos(a) * r, p.y + rnd(0.2, 2.5), p.z + Math.sin(a) * r, PALE, 0.1, 0.5, rnd(0.3, 0.6), 1, 2, CELL.STAR); if (i >= 0) { S.add.d.vy[i] = rnd(1, 3); S.add.d.rotV[i] = rnd(-4, 4); } }
      }
      // 몸을 감아 오르는 두 줄 나선 — 초당 개수로 뿌리고, 한 프레임 안에서도 지나온 자리를 메운다(주사율과 무관)
      hacc += dt * 70; const nh = hacc | 0; hacc -= nh;
      for (let j = 0; j < nh; j++) {
        const tj = t - dt * (j / nh), hy = (tj * 1.6) % 3.2, rr = 1.25 - hy * 0.12;
        for (let s = 0; s < 2; s++) { const a = ang0 + tj * 9 + s * PI; const i = glowAt(p.x + Math.cos(a) * rr, p.y + 0.1 + hy, p.z + Math.sin(a) * rr, s ? PALE : GOLD, 0.42, 0.04, 0.55, 1, 1.7); if (i >= 0) S.add.d.vy[i] = 0.6; }
      }
    }
  }, () => { free(c1, c2, b1, b2, b3); ungrp(g); });
}

// ───────────── 버프 / 치유 ─────────────
function swoosh(g, color, radius, y0, y1, dur, delay = 0) {   // 몸을 훑고 올라가는 고리
  const m = mesh('plane', 'ring', g); m.scale.setScalar(radius); const u = setU(m, color, 0, 1.8); u.uRadius.value = 0.8; u.uWidth.value = 0.14; u.uFill.value = 0; m.renderOrder = 23; m.visible = false;
  run(dur + delay, (k, dt, e) => { const t = clamp01((e.t - delay) / dur); m.visible = e.t >= delay; m.position.y = y0 + (y1 - y0) * easeOut(t); u.uOpacity.value = Math.sin(t * PI) * 0.9; u.uRadius.value = 0.85 - 0.25 * t; }, () => free(m));
}
function buff(obj, o = {}) {
  if (!S.ok || !obj) return;
  const color = o.color ?? 0x5ab4ff, dur = o.duration ?? 3, g = grp(), p = worldPos(obj, g.position);
  const ring = mesh('plane', 'ring', g); ring.position.y = 0.05; ring.scale.setScalar(1.25); const ur = setU(ring, color, 0, 1.6); ur.uRadius.value = 0.9; ur.uWidth.value = 0.1; ur.uFill.value = 0.25;
  const rune = runeMesh(g, color, 1.5, 1.2);
  const aura = beamMesh(g, color, 0.8, 2.6, { topFade: 1.8, speed: 0.9, intensity: 1.0, cone: true });
  swoosh(g, color, 1.3, 0.1, 2.2, 0.45); swoosh(g, color, 1.1, 0.1, 2.2, 0.45, 0.14);
  glowAt(p.x, p.y + 1, p.z, color, 1.5, 4.5, 0.3, 0.8, 1.8);
  let acc = 0, oacc = 0, on = 0; const ang0 = Math.random() * TAU;
  const e = run(dur, (k, dt, e) => {
    worldPos(obj, p); const t = e.t, env = clamp01(t / 0.2) * clamp01((e.dur - t) / 0.5);
    ur.uOpacity.value = env * (0.7 + 0.3 * Math.sin(t * 6)); rune.material.uniforms.uOpacity.value = env * 0.8; rune.material.uniforms.uRot.value = t * 1.5;
    aura.material.uniforms.uOpacity.value = env * 0.45; aura.material.uniforms.uTime.value += dt;
    // 몸을 감아 도는 세 줄 나선(구슬 + 긴 꼬리). 초당 개수로 뿌리고 프레임 사이를 메워 주사율과 무관하게 같은 밝기.
    oacc += dt * 64; const no = oacc | 0; oacc -= no;
    for (let j = 0; j < no; j++) {
      const tj = t - dt * (j / no);
      for (let s = 0; s < 3; s++) {
        const a = ang0 + tj * 4.6 + s * TAU / 3, y = 1.1 + 0.8 * Math.sin(tj * 1.9 + s * TAU / 3), ox = Math.cos(a) * 0.95, oz = Math.sin(a) * 0.95;
        np(); P.x = p.x + ox; P.y = p.y + y; P.z = p.z + oz; P.s0 = 0.56; P.s1 = 0.1; P.life = 0.62; P.a = env; P.pow = 1.1; P.tex = CELL.GLOW; pcol(color, 1.0); S.add.push();
        if (s === 0) on++;
        if ((on & 1) === 0) { np(); P.x = p.x + ox; P.y = p.y + y; P.z = p.z + oz; P.s0 = 0.26; P.s1 = 0.05; P.life = 0.26; P.a = env; P.pow = 1; P.tex = CELL.GLOW; pcol(0xffffff, 1.1); S.add.push(); }
      }
    }
    acc += dt * 22 * env; while (acc >= 1) { acc--; const a = Math.random() * TAU; riseSpark(p.x + Math.cos(a) * rnd(0.4, 1), p.y + rnd(0, 0.5), p.z + Math.sin(a) * rnd(0.4, 1), color, { v0: 1.2, v1: 3, life0: 0.5, life1: 0.9, size: 0.07 }); }
  }, () => { free(ring, rune, aura); ungrp(g); });
  return { cancel() { if (e.dur - e.t > 0.5) e.dur = e.t + 0.5; } };    // 0.5초에 걸쳐 걷힌다
}
function heal(obj) {
  if (!S.ok || !obj) return;
  const color = 0x4dff8a, PALE = 0xc8ffd8, dur = 1.5, g = grp(), p = worldPos(obj, g.position);
  const rune = runeMesh(g, color, 1.5, 1.4), col = beamMesh(g, color, 0.85, 4, { topFade: 1.8, speed: 1.2, intensity: 1.2 });
  swoosh(g, color, 1.25, 0.1, 2.4, 0.6); swoosh(g, PALE, 1.0, 0.1, 2.4, 0.6, 0.2); swoosh(g, color, 1.25, 0.1, 2.4, 0.6, 0.45);
  glowAt(p.x, p.y + 1, p.z, PALE, 1.5, 4.5, 0.35, 0.8, 1.6);
  groundRing(0, 0, 0, 2.0, color, 0.5, { intensity: 1.6, parent: g });
  let acc = 0;
  run(dur, (k, dt, e) => {
    worldPos(obj, p); const t = e.t, env = clamp01(t / 0.15) * clamp01((dur - t) / 0.5);
    rune.material.uniforms.uOpacity.value = env; rune.material.uniforms.uRot.value = -t * 1.2;
    col.material.uniforms.uOpacity.value = env * 0.6; col.material.uniforms.uTime.value += dt;
    acc += dt * 70 * env;
    while (acc >= 1) {
      acc--; const a = Math.random() * TAU, r = rnd(0.2, 1.0), x = p.x + Math.cos(a) * r, z = p.z + Math.sin(a) * r;
      if (Math.random() < 0.45) { const i = glowAt(x, p.y + rnd(0.1, 1.2), z, Math.random() < 0.4 ? PALE : color, 0.12, 0.45, rnd(0.5, 0.9), 1, 2, CELL.STAR); if (i >= 0) { S.add.d.vy[i] = rnd(1.2, 2.6); S.add.d.fadeIn[i] = 0.2; } }
      else riseSpark(x, p.y + rnd(0, 0.4), z, color, { v0: 1.5, v1: 4, size: 0.08 });
    }
  }, () => { free(rune, col); ungrp(g); });
}

// ───────────── 순간이동 ─────────────
function teleport(pos, o = {}) {
  if (!S.ok) return;
  const out = !!o.out, color = o.color ?? 0x7fc8ff, PALE = 0xe0f4ff, dur = 0.95, x = pos.x, y = pos.y || 0, z = pos.z;
  const g = grp(); g.position.set(x, y, z);
  const rune = runeMesh(g, color, 1.7, 1.8), b1 = beamMesh(g, color, 1, 11, { topFade: 1.2, speed: 3, intensity: 1.0 }), b2 = beamMesh(g, PALE, 0.3, 13, { topFade: 0.9, speed: 4, intensity: 1.3 });
  const flashAt = out ? 0.0 : 0.3; let flashed = false, acc = 0;
  run(dur, (k, dt, e) => {
    const t = e.t, env = clamp01(t / 0.1) * clamp01((dur - t) / 0.3);
    rune.material.uniforms.uOpacity.value = env; rune.material.uniforms.uRot.value = t * (out ? 5 : -5); rune.scale.setScalar(out ? 1.7 * (1 - 0.5 * k) : 1.7 * (0.5 + 0.5 * easeOut(k)));
    // 사라질 때는 굵은 기둥이 가늘게 말려 올라가고, 나타날 때는 가는 선이 번쩍 굵어졌다 걷힌다
    const r = out ? 1.0 * Math.pow(1 - k, 1.5) + 0.03 : (k < 0.3 ? 0.06 + easeOut(k / 0.3) * 1.1 : 1.16 * Math.pow(1 - (k - 0.3) / 0.7, 1.5) + 0.02);
    b1.scale.set(r, 11, r); b2.scale.set(r * 0.35 + 0.03, 13, r * 0.35 + 0.03);
    b1.material.uniforms.uOpacity.value = env * 0.6; b2.material.uniforms.uOpacity.value = env * 0.8; b1.material.uniforms.uTime.value += dt; b2.material.uniforms.uTime.value += dt;
    if (!flashed && k >= flashAt) {
      flashed = true; glowAt(x, y + 1, z, 0xffffff, 1.5, 6, 0.2, 1, 2.4); glowAt(x, y + 1, z, PALE, 2, 7, 0.3, 0.9, 2, CELL.STAR);
      groundRing(x, y, z, 3.2, color, 0.45, { intensity: 2 }); sparks(x, y + 0.8, z, 26, color, 3, 9, { ymin: -0.2, grav: 2, life0: 0.4, life1: 0.8 });
    }
    acc += dt * 110 * env;
    while (acc >= 1) {
      acc--; const a = Math.random() * TAU, rr = rnd(0.1, 1.0);
      if (out) riseSpark(x + Math.cos(a) * rr, y + rnd(0, 1.5), z + Math.sin(a) * rr, Math.random() < 0.3 ? PALE : color, { v0: 6, v1: 15, life0: 0.3, life1: 0.6, stretch: 0.12 });
      else { np(); P.x = x + Math.cos(a) * rr; P.y = y + rnd(3, 7); P.z = z + Math.sin(a) * rr; P.vy = -rnd(8, 16); P.life = rnd(0.25, 0.45); P.s0 = 0.1; P.s1 = 0.03; P.stretch = 0.12; P.tex = CELL.SPARK; P.fadeIn = 0.2; pcol(color, 2); S.add.push(); }
    }
  }, () => { free(rune, b1, b2); ungrp(g); });
}

// ───────────── 전리품 빛줄기 ─────────────
function lootBeam(pos, o = {}) {
  if (!S.ok) return { dispose() {} };
  const color = o.color ?? 0xffb23e, dur = o.duration ?? 8, x = pos.x, y = pos.y || 0, z = pos.z;
  const g = grp(); g.position.set(x, y, z);
  const b1 = beamMesh(g, color, 0.16, 8, { topFade: 1.4, speed: 1.2, intensity: 2.4 }), b2 = beamMesh(g, color, 0.55, 4.5, { topFade: 2.2, speed: 0.6, intensity: 1.0 });
  const gl = mesh('plane', 'tex', g); gl.position.y = 0.04; gl.scale.setScalar(1.3); const ug = setU(gl, color, 0, 1.8); ug.uMap.value = S.tex.glow; ug.uRot.value = 0;
  const rn = mesh('plane', 'ring', g); rn.position.y = 0.05; rn.scale.setScalar(0.75); const ur = setU(rn, color, 0, 2); ur.uWidth.value = 0.09; ur.uFill.value = 0;
  glowAt(x, y + 0.3, z, color, 0.8, 3.5, 0.3, 1, 2); groundRing(x, y, z, 1.8, color, 0.4);
  let acc = 0;
  const e = run(dur, (k, dt, e) => {
    const t = e.t, env = clamp01(t / 0.25) * clamp01((e.dur - t) / 0.6), pulse = 0.8 + 0.2 * Math.sin(t * 5);   // e.dur: dispose() 로 줄어든 수명을 따라 페이드
    const open = easeOut3(clamp01(t / 0.3)); b1.scale.set(0.16 * open, 8, 0.16 * open);
    b1.material.uniforms.uOpacity.value = env * pulse; b2.material.uniforms.uOpacity.value = env * 0.4; b1.material.uniforms.uTime.value += dt; b2.material.uniforms.uTime.value += dt;
    ug.uOpacity.value = env * pulse * 0.9; ur.uOpacity.value = env * 0.9; ur.uRadius.value = 0.55 + 0.4 * ((t * 0.9) % 1); ur.uOpacity.value *= 1 - ((t * 0.9) % 1);
    acc += dt * 14 * env; while (acc >= 1) { acc--; const a = Math.random() * TAU, r = rnd(0, 0.5); riseSpark(x + Math.cos(a) * r, y + rnd(0, 0.4), z + Math.sin(a) * r, color, { v0: 1, v1: 3, life0: 0.7, life1: 1.3, size: 0.07, stretch: 0.05 }); }
  }, () => { free(b1, b2, gl, rn); ungrp(g); });
  return { dispose() { if (e.dur - e.t > 0.6) { e.dur = e.t + 0.6; } } };
}

// ───────────── 장판 예고 ─────────────
function telegraph(pos, radius = 3, duration = 1.5, o = {}) {
  if (!S.ok) return { cancel() {} };
  const color = o.color ?? 0xff2a14, m = mesh('plane', 'tele'); m.position.set(pos.x, (pos.y || 0) + 0.06, pos.z); m.scale.setScalar(radius); m.renderOrder = 14;
  const u = setU(m, color, 0); u.uProgress.value = 0; u.uFlash.value = 0; u.uTime.value = 0;
  const tail = 0.14; let cancelled = false;
  const e = run(duration + tail, (k, dt, e) => {
    u.uTime.value = e.t;
    if (cancelled) { u.uOpacity.value = Math.max(0, u.uOpacity.value - dt * 6); if (u.uOpacity.value <= 0) e.dead = true; return; }
    const t = e.t / duration;
    if (t < 1) { u.uProgress.value = t; u.uOpacity.value = clamp01(e.t / 0.12); u.uFlash.value = 0; }
    else { const f = (e.t - duration) / tail; u.uProgress.value = 1; u.uFlash.value = (1 - f) * 0.8; u.uOpacity.value = 1 - f; }   // 터지는 순간 번쩍
  }, () => free(m));
  return { cancel() { cancelled = true; } };
}

// ───────────── 화염 ─────────────
// 불길은 세 층으로 쌓는다: ① 밝은 심지(가산, 아주 짧게) ② 불덩이·불꽃 혀(S.fire — 일반 혼합 + 침식, 흰노랑→주황→암적색) ③ 검은 연기(S.nrm).
// 불덩이를 가산으로 겹치지 않으므로 여러 장이 포개져도 하얗게 날아가지 않는다.
const FLM = [CELL.FLAME, CELL.FLAME2, CELL.FLAME3];
function flame(x, y, z, vx, vy, vz, s0, s1, life, heat = 1) {
  np(); P.x = x; P.y = y; P.z = z; P.vx = vx; P.vy = vy; P.vz = vz; P.s0 = s0; P.s1 = s1; P.life = life; P.tex = FLM[Math.random() * 3 | 0];
  P.rot = rnd(-0.4, 0.4); P.rotV = rnd(-0.7, 0.7); P.drag = 2.5; P.grav = -3; P.a = 1; P.fadeIn = 0.07; P.pow = 0.9; P.r = P.g = P.b = heat; return S.fire.push();     // 색은 셰이더의 열 곡선이 정한다(heat = 밝기 배율)
}
function blackSmoke(x, y, z, vx, vy, vz, s0, s1, life, alpha, delay) {
  np(); P.x = x; P.y = y; P.z = z; P.vx = vx; P.vy = vy; P.vz = vz; P.grav = -1.2; P.drag = 1.6; P.life = life; P.s0 = s0; P.s1 = s1; P.rot = Math.random() * TAU; P.rotV = rnd(-0.8, 0.8);
  P.a = alpha; P.tex = smokeTex(); P.fadeIn = 0.18; P.pow = 1.2; P.age = -delay; pcol(0x17110e, rnd(0.8, 1.3)); return S.nrm.push();
}
function flameBurst(pos, o = {}) {
  if (!S.ok) return;
  const k = o.scale ?? 1, x = pos.x, y = pos.y || 0, z = pos.z;
  // ① 심지: 2~3프레임만 번쩍
  glowAt(x, y + 0.5 * k, z, 0xffe8b0, 0.9 * k, 2.4 * k, 0.09, 1, 1.2);
  glowAt(x, y + 0.5 * k, z, 0xffc060, 1.4 * k, 4.6 * k, 0.16, 0.7, 1.2, CELL.STAR);
  glowAt(x, y + 0.6 * k, z, 0xff4a0c, 3.0 * k, 6.0 * k, 0.45, 0.22, 0.9);
  groundGlow(x, y, z, 3.4 * k, 0xff4a10, 0.6, 0.6, 0.32);
  // ② 사방으로 터지는 불덩이 + 위로 솟는 불꽃 혀
  // 불꽃 혀의 끝이 터져 나가는 방향을 향하도록 화면 기준 회전을 준다
  let rx = 1, ry = 0, rz = 0, ux = 0, uy = 1, uz = 0;
  if (S.camera) { const e = S.camera.matrixWorld.elements; rx = e[0]; ry = e[1]; rz = e[2]; ux = e[4]; uy = e[5]; uz = e[6]; }
  for (let i = 0; i < 26; i++) {
    const d = dirRand(-0.05, 1), sp = rnd(3, 9.5) * k, vx = d.x * sp, vy = d.y * sp * 0.8 + 1.2 * k, vz = d.z * sp;
    const j = flame(x + d.x * 0.3 * k, y + (0.35 + d.y * 0.3) * k, z + d.z * 0.3 * k, vx, vy, vz, rnd(1.7, 2.5) * k, rnd(3.0, 4.4) * k, rnd(0.5, 0.95), rnd(0.9, 1.15));
    if (j >= 0) { S.fire.d.rot[j] = Math.atan2(-(vx * rx + vy * ry + vz * rz), vx * ux + vy * uy + vz * uz) + rnd(-0.25, 0.25); S.fire.d.rotV[j] = rnd(-0.3, 0.3); }
  }
  for (let i = 0; i < 9; i++) flame(x + rnd(-0.4, 0.4) * k, y + 0.2 * k, z + rnd(-0.4, 0.4) * k, rnd(-1, 1) * k, rnd(4, 10) * k, rnd(-1, 1) * k, 1.9 * k, 3.2 * k, rnd(0.55, 1.0), 1.2);
  for (let i = 0; i < 5; i++) glowAt(x + rnd(-0.5, 0.5) * k, y + rnd(0.3, 1.1) * k, z + rnd(-0.5, 0.5) * k, 0xffc860, 0.8 * k, 1.9 * k, rnd(0.12, 0.22), 0.6, 1.2);
  sparks(x, y + 0.4 * k, z, 36, 0xff9a30, 5 * k, 15 * k, { ymin: 0.1, grav: 10, life0: 0.5, life1: 1.2, drag: 1.5, size: 0.1 });
  for (let i = 0; i < 12; i++) { const a = Math.random() * TAU, r = rnd(0.2, 1.6) * k; riseSpark(x + Math.cos(a) * r, y + rnd(0.2, 1.4) * k, z + Math.sin(a) * r, 0xff7a20, { v0: 1, v1: 4, life0: 0.9, life1: 1.8, size: 0.08, turb: 4 }); }
  // ③ 불이 걷히며 피어오르는 검은 연기
  for (let i = 0; i < 14; i++) { const d = dirRand(0.3, 1), sp = rnd(1, 3.5) * k; blackSmoke(x + d.x * 0.6 * k, y + 0.7 * k, z + d.z * 0.6 * k, d.x * sp, d.y * sp + 1.5, d.z * sp, 1.3 * k, rnd(3, 4.4) * k, rnd(1.1, 2.1), 0.62, rnd(0.18, 0.42)); }
}
function fireRing(pos, radius = 3, o = {}) {
  if (!S.ok) return { cancel() {} };
  const dur = o.duration ?? 2.5, color = o.color ?? 0xff6a1a, x = pos.x, y = pos.y || 0, z = pos.z;
  const m = mesh('plane', 'ring'); m.position.set(x, y + 0.05, z); m.renderOrder = 12; const u = setU(m, color, 0, 1.5); u.uWidth.value = 0.12; u.uFill.value = 0.06; u.uRadius.value = 0.86;
  const m2 = mesh('plane', 'tex'); m2.position.set(x, y + 0.03, z); m2.renderOrder = 11; const u2 = setU(m2, 0x0a0705, 0, 1); u2.uMap.value = S.tex.ring; m2.material.blending = THREE.NormalBlending; u2.uRot.value = 0;
  let acc = 0;
  const e = run(dur, (k, dt, e) => {
    const t = e.t, grow = easeOut3(clamp01(t / 0.3)), env = clamp01(t / 0.1) * clamp01((e.dur - t) / 0.45), R = radius * (0.25 + 0.75 * grow);
    m.scale.setScalar(R * 1.16); u.uOpacity.value = env * (0.8 + 0.2 * Math.sin(t * 14));
    m2.scale.setScalar(R * 1.13); u2.uOpacity.value = env * 0.6;
    acc += dt * (34 * radius + 24) * env;
    while (acc >= 1) {
      acc--; const a = Math.random() * TAU, rr = R + rnd(-0.12, 0.12), px = x + Math.cos(a) * rr, pz = z + Math.sin(a) * rr, q = Math.random();
      if (q < 0.8) { const fs = rnd(1.5, 2.6); flame(px, y + rnd(0.1, 0.4), pz, rnd(-0.4, 0.4), rnd(2.2, 5.5), rnd(-0.4, 0.4), fs, fs * 0.7, rnd(0.55, 1.0), 0.85); }
      else if (q < 0.93) riseSpark(px, y + 0.3, pz, 0xffa040, { v0: 2, v1: 6, turb: 4, life0: 0.5, life1: 1.1, size: 0.07 });
      else blackSmoke(px, y + 1, pz, 0, rnd(1, 2), 0, 0.6, 1.7, rnd(0.9, 1.5), 0.34, 0);
    }
  }, () => free(m, m2));
  return { cancel() { if (e.dur - e.t > 0.45) e.dur = e.t + 0.45; } };
}

// ───────────── 운석 ─────────────
function meteor(pos, o = {}) {
  if (!S.ok) return;
  const delay = o.delay ?? 0.9, radius = o.radius ?? 3, x = pos.x, y = pos.y || 0, z = pos.z;
  const sx = x + rnd(5, 8), sy = y + 24, sz = z - rnd(3, 6), hs = Math.max(0.8, radius * 0.38);
  let lx = sx, ly = sy, lz = sz, dacc = 0, hacc = 0, n = 0;
  run(delay, (k, dt) => {
    const kk = k * k * 0.35 + k * 0.65, cx = sx + (x - sx) * kk, cy = sy + (y - sy) * kk, cz = sz + (z - sz) * kk;
    const dx = cx - lx, dy = cy - ly, dz = cz - lz;
    dacc += Math.hypot(dx, dy, dz); let steps = dacc / 0.4 | 0; if (steps > 14) { steps = 14; dacc = 0; } else dacc -= steps * 0.4;     // 꼬리는 지나온 거리만큼(주사율과 무관)
    for (let i = 1; i <= steps; i++) {
      const f = i / steps, px = lx + dx * f, py = ly + dy * f, pz = lz + dz * f; n++;
      flame(px + rnd(-0.15, 0.15) * hs, py + rnd(-0.15, 0.15) * hs, pz + rnd(-0.15, 0.15) * hs, rnd(-0.5, 0.5), rnd(0, 1), rnd(-0.5, 0.5), hs * 1.5, hs * 0.35, rnd(0.3, 0.6), 1.3);
      if (n % 2 === 0) blackSmoke(px, py, pz, 0, 0, 0, hs * 0.8, hs * 2, rnd(0.7, 1.2), 0.4, 0.05);
      if (Math.random() < 0.5) sparks(px, py, pz, 1, 0xffa040, 1, 4, { grav: 6, life0: 0.3, life1: 0.7 });
    }
    hacc += dt * 50;                                                                                                                  // 머리 섬광은 초당 개수로
    while (hacc >= 1) { hacc--; glowAt(cx, cy, cz, 0xffe0a0, hs * 1.5, hs * 0.9, 0.08, 0.9, 1.5); glowAt(cx, cy, cz, 0xff5a14, hs * 4, hs * 2.6, 0.1, 0.4, 1.0); }
    lx = cx; ly = cy; lz = cz;
  }, null, () => {            // 완료(자연 종료)일 때만 — clear()/dispose() 로 지워지면 폭발도 onHit 도 없다
    HITP.x = x; HITP.y = y; HITP.z = z;
    flameBurst(HITP, { scale: radius / 2.4 }); shockwave(HITP, radius * 1.35, { color: 0xffa050, duration: 0.6 });
    groundDecal(HITP, { kind: 'scorch', radius: radius * 1.1, duration: 6 }); groundDecal(HITP, { kind: 'crack', radius: radius * 0.9, duration: 5, color: 0xff6a1a });
    debris(x, y, z, 16, 4, 11, 0.14);
    if (o.onHit) o.onHit();
  });
}
const HITP = { x: 0, y: 0, z: 0 };

// ───────────── 투사체 ─────────────
function projectile(from, to, o = {}) {
  if (!S.ok) return;
  const kind = o.kind || 'magic', speed = o.speed ?? (kind === 'arrow' ? 34 : 20), color = o.color ?? (kind === 'fire' ? 0xff7a20 : kind === 'arrow' ? 0xfff0c8 : 0x6aa8ff);
  const th = o.targetHeight ?? 1.0, a = vtake().set(from.x, from.y || 0, from.z), b = vtake(), c = vtake().copy(a), last = vtake().copy(a);
  const aim = (out) => { if (to.isObject3D) { to.getWorldPosition(out); out.y += th; } else out.set(to.x, to.y || 0, to.z); return out; };
  aim(b);
  const dist0 = Math.max(0.01, a.distanceTo(b)), dur = dist0 / speed, arc = (o.arc ?? (kind === 'arrow' ? 0.07 : 0)) * dist0;
  let shaft = null, s1 = null, s2 = null, spin = Math.random() * TAU, dacc = 0, hacc = 0, n = 0;
  if (kind === 'arrow') {       // 촉·살대·깃이 그려진 판 두 장을 십자로 세운다(촉 끝이 현재 위치)
    shaft = grp(); s1 = mesh('quad', 'tex', shaft); s2 = mesh('quad', 'tex', shaft); s2.rotation.y = PI / 2;
    s1.scale.set(0.5, 2.0, 1); s2.scale.set(0.5, 2.0, 1); s1.position.y = s2.position.y = -2.0; s1.renderOrder = s2.renderOrder = 24;
    let u = setU(s1, color, 1, 1.5); u.uMap.value = S.tex.arrow; u.uRot.value = 0; u = setU(s2, color, 1, 1.5); u.uMap.value = S.tex.arrow; u.uRot.value = 0;
    shaft.position.copy(a); shaft.quaternion.setFromUnitVectors(UP, _v.subVectors(b, a).normalize());
  }
  const SP = kind === 'arrow' ? 0.3 : 0.22;
  run(dur, (k, dt) => {
    aim(b); c.lerpVectors(a, b, k); c.y += Math.sin(k * PI) * arc;
    const dx = c.x - last.x, dy = c.y - last.y, dz = c.z - last.z, d = Math.hypot(dx, dy, dz), inv = d > 1e-5 ? 1 / d : 0;
    dacc += d; let steps = dacc / SP | 0; if (steps > 12) { steps = 12; dacc = 0; } else dacc -= steps * SP;      // 꼬리: 지나온 거리 기준
    hacc += dt * 55; let heads = hacc | 0; hacc -= heads; if (heads > 4) heads = 4;                              // 머리 섬광: 초당 개수 기준
    if (kind === 'arrow') {
      if (d > 1e-5) shaft.quaternion.setFromUnitVectors(UP, _v.set(dx * inv, dy * inv, dz * inv)); shaft.position.copy(c);
      for (let i = 1; i <= steps; i++) { const f = i / steps; glowAt(last.x + dx * f - dx * inv * 1.2, last.y + dy * f - dy * inv * 1.2, last.z + dz * f - dz * inv * 1.2, color, 0.2, 0.02, 0.22, 0.4, 1.3); }
      for (let i = 0; i < heads; i++) glowAt(c.x, c.y, c.z, 0xffffff, 0.34, 0.2, 0.05, 0.8, 1.6);
    } else if (kind === 'fire') {
      for (let i = 1; i <= steps; i++) {
        const f = i / steps, px = last.x + dx * f, py = last.y + dy * f, pz = last.z + dz * f; n++;
        flame(px + rnd(-0.1, 0.1), py + rnd(-0.1, 0.1), pz + rnd(-0.1, 0.1), -dx * inv * 1.5, rnd(0.3, 1.3), -dz * inv * 1.5, rnd(0.8, 1.15), 0.22, rnd(0.45, 0.8), 1.15);
        if (n % 3 === 0) blackSmoke(px, py, pz, 0, 0.6, 0, 0.4, 1.2, 0.8, 0.3, 0.12);
        if (Math.random() < 0.5) sparks(px, py, pz, 1, 0xffb050, 1, 3.5, { grav: 5, life0: 0.3, life1: 0.6 });
      }
      for (let i = 0; i < heads; i++) {      // 머리 불덩이
        flame(c.x + rnd(-0.08, 0.08), c.y + rnd(-0.08, 0.08), c.z + rnd(-0.08, 0.08), dx * inv * 3, 0.4, dz * inv * 3, 1.5, 0.7, rnd(0.16, 0.26), 1.5);
        glowAt(c.x, c.y, c.z, 0xffe0a0, 0.9, 0.5, 0.07, 0.9, 1.5); glowAt(c.x, c.y, c.z, color, 3.2, 2.0, 0.09, 0.35, 1.1);
      }
    } else {
      spin += dt * 22;
      for (let i = 1; i <= steps; i++) {
        const f = i / steps, px = last.x + dx * f, py = last.y + dy * f, pz = last.z + dz * f;
        glowAt(px, py, pz, color, 0.85, 0.06, 0.4, 0.8, 1.8);
        const sa = spin + f, ox = Math.cos(sa) * 0.28, oy = Math.sin(sa) * 0.28;   // 꼬리를 감는 나선
        const j = glowAt(px + ox * -dz * inv, py + oy, pz + ox * dx * inv, 0xffffff, 0.2, 0.02, 0.28, 0.9, 1.6); if (j >= 0) S.add.d.r[j] *= 0.8;
        if (Math.random() < 0.35) { const s = glowAt(px + rnd(-0.2, 0.2), py + rnd(-0.2, 0.2), pz + rnd(-0.2, 0.2), color, 0.1, 0.4, rnd(0.3, 0.5), 1, 2, CELL.STAR); if (s >= 0) S.add.d.rotV[s] = rnd(-5, 5); }
      }
      for (let i = 0; i < heads; i++) {
        glowAt(c.x, c.y, c.z, 0xffffff, 1.0, 0.6, 0.06, 1, 2.4); glowAt(c.x, c.y, c.z, color, 3.0, 1.8, 0.08, 0.8, 1.9);
        const st = glowAt(c.x, c.y, c.z, color, 2.6, 1.8, 0.05, 0.9, 2.0, CELL.STAR); if (st >= 0) S.add.d.rot[st] = spin * 0.3;
      }
    }
    last.copy(c);
  }, () => {                    // 정리: 메시·벡터 반환만
    if (shaft) { free(s1, s2); ungrp(shaft); }
    vfree(a, b, c, last);
  }, () => {                    // 완료: 도착했을 때만 타격 이펙트와 onHit
    aim(_v); HITP.x = _v.x; HITP.y = _v.y; HITP.z = _v.z;
    if (kind === 'fire') { flameBurst(HITP, { scale: 0.5 }); hit(HITP, { color, scale: 1.0 }); }
    else if (kind === 'magic') { hit(HITP, { color, scale: 1.25 }); glowAt(HITP.x, HITP.y, HITP.z, color, 0.4, 4.5, 0.3, 0.9, 2, CELL.RING); }
    else hit(HITP, { color, scale: 0.75 });
    if (o.onHit) o.onHit();
  });
}

// ───────────── 무기 궤적 ─────────────
const TR_M = 64, TR_SUB = 3;
function cr(p0, p1, p2, p3, t) { const t2 = t * t, t3 = t2 * t; return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3); }
function weaponTrail(obj, o = {}) {
  if (!S.ok || !obj) return { setActive() {}, setColor() {}, dispose() {} };
  const base = new THREE.Vector3().fromArray(o.base || [0, 0, 0]), tip = new THREE.Vector3().fromArray(o.tip || [0, 1, 0]);
  const life = o.life ?? 0.24, color = o.color ?? 0xa8d8ff, full = base.distanceTo(tip);
  // width: 띠의 굵기(무기 로컬 단위, 날 끝에서 안쪽으로). 생략하거나 날 길이보다 크면 base~tip 전체.
  if (o.width > 0 && o.width < full) base.lerpVectors(tip, base, o.width / full);
  const maxPts = (TR_M - 1) * TR_SUB + 1, pos = new Float32Array(maxPts * 6), uv = new Float32Array(maxPts * 4), idx = [];
  for (let i = 0; i < maxPts - 1; i++) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  const geo = new THREE.BufferGeometry(); const aP = new THREE.BufferAttribute(pos, 3), aU = new THREE.BufferAttribute(uv, 2); aP.setUsage(THREE.DynamicDrawUsage); aU.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('position', aP); geo.setAttribute('uv', aU); geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(maxPts * 6), 3)); geo.setIndex(idx); geo.setDrawRange(0, 0);
  const mat = makeMat('trail'); mat.uniforms.uMap.value = S.tex.slash; mat.uniforms.uColor.value.setHex(color); mat.uniforms.uIntensity.value = o.intensity ?? 0.95;
  const m = new THREE.Mesh(geo, mat); m.frustumCulled = false; m.renderOrder = 26; S.root.add(m);
  const sb = new Float32Array(TR_M * 3), st = new Float32Array(TR_M * 3), sa = new Float32Array(TR_M); let n = 0, active = o.active !== false;     // 만들자마자 켜진 상태(끄려면 setActive(false))
  const e = run(Infinity, (k, dt) => {
    for (let i = 0; i < n; i++) sa[i] += dt;
    while (n > 1 && sa[n - 2] >= life) n--;       // 수명을 넘긴 표본 하나는 남겨 꼬리 끝(u=1)이 0 으로 사라지게 한다
    if (n === 1 && sa[0] >= life) n = 0;
    if (active) {
      obj.updateWorldMatrix(true, false);
      if (n >= TR_M) n = TR_M - 1;
      sb.copyWithin(3, 0, n * 3); st.copyWithin(3, 0, n * 3); sa.copyWithin(1, 0, n); n++;
      _v.copy(base).applyMatrix4(obj.matrixWorld); sb[0] = _v.x; sb[1] = _v.y; sb[2] = _v.z;
      _v.copy(tip).applyMatrix4(obj.matrixWorld); st[0] = _v.x; st[1] = _v.y; st[2] = _v.z; sa[0] = 0;
    }
    if (n < 2) { geo.setDrawRange(0, 0); m.visible = false; return; }
    let pc = 0;
    for (let i = 0; i < n - 1; i++) {
      const i0 = Math.max(0, i - 1) * 3, i1 = i * 3, i2 = (i + 1) * 3, i3 = Math.min(n - 1, i + 2) * 3, last = i === n - 2;
      for (let j = 0; j < TR_SUB + (last ? 1 : 0); j++) {
        const t = j / TR_SUB, o6 = pc * 6, o4 = pc * 4, u = Math.min(1, (sa[i] + (sa[i + 1] - sa[i]) * t) / life);
        for (let c = 0; c < 3; c++) { pos[o6 + c] = cr(st[i0 + c], st[i1 + c], st[i2 + c], st[i3 + c], t); pos[o6 + 3 + c] = cr(sb[i0 + c], sb[i1 + c], sb[i2 + c], sb[i3 + c], t); }
        uv[o4] = u; uv[o4 + 1] = 1; uv[o4 + 2] = u; uv[o4 + 3] = 0; pc++;
      }
    }
    aP.needsUpdate = true; aU.needsUpdate = true; geo.setDrawRange(0, (pc - 1) * 6); m.visible = true;
  }, () => { S.root.remove(m); geo.dispose(); mat.dispose(); });
  return { setActive(on) { active = !!on; }, setColor(hex) { mat.uniforms.uColor.value.setHex(hex); }, dispose() { e.dead = true; } };
}

// ───────────── 강화 발광 ─────────────
// 오라는 날 둘레(림)만 빛나는 캡슐 한 장 + 옅은 후광 한 장. 둘 다 날 축을 중심으로 카메라를 향해 돌아(축 빌보드) 금속 날이 그대로 보인다.
const TIERS = [null,
  { color: 0x3a78ff, op: 0.34, halo: 0.08, int: 1.0, rate: 2.5, star: 0.1 },             // +3~4 은은한 파랑
  { color: 0x30b8ff, op: 0.78, halo: 0.2, int: 1.15, rate: 13, star: 0.32 },             // +5~6 파랑(밝은 하늘빛 + 반짝임)
  { color: 0xa23cff, op: 0.9, halo: 0.26, int: 1.2, rate: 20, star: 0.4 },               // +7~8 보라(+ 전기 불티)
  { color: 0xff8a1e, op: 0.5, halo: 0.16, int: 1.0, rate: 9, star: 0.3, fire: 40 }];     // +9 이상 주황 — 금빛 불꽃이 주인공
const tierOf = (lv) => lv >= 9 ? 4 : lv >= 7 ? 3 : lv >= 5 ? 2 : lv >= 3 ? 1 : 0;
function localSpan(obj, base, tip) {     // base/tip 을 안 주면 무기의 가장 긴 축을 날로 보고, 원점(쥐는 곳)에 가까운 쪽 1/5 을 손잡이로 보아 뺀다
  const box = new THREE.Box3(), b = new THREE.Box3(), inv = new THREE.Matrix4();
  obj.updateWorldMatrix(true, true); inv.copy(obj.matrixWorld).invert();
  obj.traverse((c) => { if (c.isMesh && c.geometry && !c.userData.vfx) { if (!c.geometry.boundingBox) c.geometry.computeBoundingBox(); b.copy(c.geometry.boundingBox).applyMatrix4(_m.multiplyMatrices(inv, c.matrixWorld)); box.union(b); } });
  if (box.isEmpty()) { base.set(0, 0, 0); tip.set(0, 1, 0); return; }
  const s = box.getSize(_v), c = box.getCenter(_v2), ax = s.x >= s.y && s.x >= s.z ? 'x' : s.y >= s.z ? 'y' : 'z';
  base.copy(c); tip.copy(c);
  if (Math.abs(box.min[ax]) <= Math.abs(box.max[ax])) { base[ax] = box.min[ax]; tip[ax] = box.max[ax]; } else { base[ax] = box.max[ax]; tip[ax] = box.min[ax]; }
  base.lerp(tip, 0.2);
}
function enhanceGlow(obj, level = 0, o = {}) {
  if (!S.ok || !obj) return { setLevel() {}, dispose() {} };
  const base = new THREE.Vector3(), tip = new THREE.Vector3();
  if (o.base && o.tip) { base.fromArray(o.base); tip.fromArray(o.tip); } else localSpan(obj, base, tip);
  const len = base.distanceTo(tip) || 1, g = grp(obj); g.userData.vfx = true; g.position.copy(base); g.quaternion.setFromUnitVectors(UP, _v.subVectors(tip, base).normalize());
  const rim = mesh('quad', 'tex', g), halo = mesh('quad', 'tex', g);
  rim.userData.vfx = halo.userData.vfx = true; rim.renderOrder = 24; halo.renderOrder = 23;
  rim.material.uniforms.uMap.value = S.tex.aura; halo.material.uniforms.uMap.value = S.tex.auraSoft; rim.material.uniforms.uRot.value = halo.material.uniforms.uRot.value = 0;
  let tier = 0, T = null, acc = 0, accF = 0; const bw = new THREE.Vector3(), tw = new THREE.Vector3();
  const ur = rim.material.uniforms, uh = halo.material.uniforms;
  const apply = (lv) => {
    tier = tierOf(lv); T = TIERS[tier]; g.visible = !!T; if (!T) return;
    const w = (o.width ?? len * 0.2) * (1 + tier * 0.06);       // 림이 날 가장자리 바로 바깥에 오도록(판 폭의 약 1/4 지점이 가장 밝다)
    rim.scale.set(w, len * 1.14, 1); rim.position.y = -0.07 * len; halo.scale.set(w * 2.1, len * 1.3, 1); halo.position.y = -0.15 * len;
    setU(rim, T.color, T.op, T.int); setU(halo, T.color, T.halo, 1.0);
  };
  apply(level);
  const e = run(Infinity, (k, dt, e) => {
    if (!T) return;
    let vis = true; for (let p = obj; p; p = p.parent) if (!p.visible) { vis = false; break; }
    if (!vis) return;
    obj.updateWorldMatrix(true, false); g.updateWorldMatrix(false, false);
    if (S.camera) { g.worldToLocal(_v.setFromMatrixPosition(S.camera.matrixWorld)); rim.rotation.y = halo.rotation.y = Math.atan2(_v.x, _v.z); }
    const pulse = 0.8 + 0.2 * Math.sin(e.t * (3 + tier)); ur.uOpacity.value = T.op * pulse; uh.uOpacity.value = T.halo * pulse;
    bw.copy(base).applyMatrix4(obj.matrixWorld); tw.copy(tip).applyMatrix4(obj.matrixWorld);
    const wl = bw.distanceTo(tw), dx = tw.x - bw.x, dy = tw.y - bw.y, dz = tw.z - bw.z;
    acc += dt * T.rate;
    while (acc >= 1) {
      acc--; const f = Math.random(), x = bw.x + dx * f, y = bw.y + dy * f, z = bw.z + dz * f, j = wl * 0.07;
      if (Math.random() < T.star) { const i = glowAt(x + rnd(-j, j), y + rnd(-j, j), z + rnd(-j, j), 0xffffff, wl * 0.05, wl * 0.3, rnd(0.25, 0.5), 1, 1.8, CELL.STAR); if (i >= 0) { S.add.d.rotV[i] = rnd(-3, 3); S.add.d.fadeIn[i] = 0.3; } }
      else { np(); P.x = x + rnd(-j, j); P.y = y + rnd(-j, j); P.z = z + rnd(-j, j); P.vy = rnd(0.2, 0.9); P.vx = rnd(-0.2, 0.2); P.vz = rnd(-0.2, 0.2); P.life = rnd(0.4, 0.9); P.s0 = wl * 0.07; P.s1 = wl * 0.015; P.tex = CELL.GLOW; P.turb = 1.2; P.fadeIn = 0.2; pcol(T.color, 2.0); S.add.push(); }
      if (tier === 3 && Math.random() < 0.25) { const f2 = Math.random(); np(); P.x = bw.x + dx * f2; P.y = bw.y + dy * f2; P.z = bw.z + dz * f2; const d = dirRand(-1, 1); P.vx = d.x * 2.5; P.vy = d.y * 2.5; P.vz = d.z * 2.5; P.life = 0.14; P.s0 = wl * 0.03; P.s1 = wl * 0.01; P.stretch = 0.25; P.tex = CELL.SPARK; pcol(0xe0b0ff, 2.6); S.add.push(); }
    }
    if (T.fire) {          // 날을 타고 오르는 금빛 불꽃(크고 오래 남는다) + 불티
      accF += dt * T.fire;
      while (accF >= 1) {
        accF--; const f = Math.pow(Math.random(), 0.8), x = bw.x + dx * f, y = bw.y + dy * f, z = bw.z + dz * f, j = wl * 0.04;
        if (Math.random() < 0.72) { const i = flame(x + rnd(-j, j), y + rnd(-j, j) - wl * 0.06, z + rnd(-j, j), rnd(-0.25, 0.25), rnd(0.9, 2.4), rnd(-0.25, 0.25), wl * rnd(0.3, 0.42), wl * 0.12, rnd(0.5, 0.95), 1.2); if (i >= 0) S.fire.d.drag[i] = 1.2; }
        else riseSpark(x, y, z, 0xffc040, { v0: 1, v1: 4, life0: 0.5, life1: 1.1, size: wl * 0.045, turb: 3, stretch: 0.06 });
      }
    }
  }, () => { free(rim, halo); g.userData.vfx = false; ungrp(g); });
  return { setLevel(n) { if (!e.dead) apply(n); }, dispose() { e.dead = true; } };
}

// ───────────── 등장 / 죽음 ─────────────
function spawn(pos, o = {}) {
  if (!S.ok) return;
  const color = o.color ?? 0x9a5cff, k = o.scale ?? 1, x = pos.x, y = pos.y || 0, z = pos.z;
  const g = grp(); g.position.set(x, y, z);
  const rune = runeMesh(g, color, 1.5 * k, 1.4), col = beamMesh(g, color, 0.9 * k, 4.0 * k, { topFade: 2.2, speed: 2, intensity: 1.0, cone: true });
  run(0.9, (t, dt) => { const env = clamp01(t / 0.12) * Math.pow(1 - t, 1.2); rune.material.uniforms.uOpacity.value = env; rune.material.uniforms.uRot.value = t * 4; rune.scale.setScalar(1.5 * k * (0.4 + 0.6 * easeOut3(t))); col.material.uniforms.uOpacity.value = env * 0.5; col.material.uniforms.uTime.value += dt; }, () => { free(rune, col); ungrp(g); });
  glowAt(x, y + 0.8 * k, z, color, 1.2 * k, 4.5 * k, 0.28, 0.8, 1.6);
  groundRing(x, y, z, 2.4 * k, color, 0.5, { intensity: 1.5 });
  // 연기가 주인공: 밝은 회보라색. ① 바닥을 타고 고리 모양으로 퍼지는 연기 ② 몸통을 가리며 피어오르는 연기 기둥
  const pale = _c1.setHex(color).lerp(_c2.setHex(0xc4bcd6), 0.68).getHex(), mid = _c1.setHex(color).lerp(_c2.setHex(0x8a8298), 0.6).getHex();
  const n1 = 18;
  for (let i = 0; i < n1; i++) {
    const a = (i + rnd(-0.4, 0.4)) / n1 * TAU, v = rnd(3.2, 5.2) * k; np();
    P.x = x + Math.cos(a) * 0.5 * k; P.y = y + rnd(0.15, 0.4) * k; P.z = z + Math.sin(a) * 0.5 * k; P.vx = Math.cos(a) * v; P.vz = Math.sin(a) * v; P.vy = rnd(0.1, 0.6);
    P.life = rnd(0.9, 1.5); P.s0 = rnd(0.7, 1.0) * k; P.s1 = rnd(1.7, 2.5) * k; P.drag = 2.6; P.rot = Math.random() * TAU; P.rotV = rnd(-1, 1); P.a = rnd(0.6, 0.85); P.tex = smokeTex(); P.fadeIn = 0.07; P.pow = 1.3; pcol(pale, rnd(0.85, 1.1)); S.nrm.push();
  }
  for (let i = 0; i < 14; i++) {
    np(); P.x = x + rnd(-0.45, 0.45) * k; P.y = y + rnd(0.2, 1.9) * k; P.z = z + rnd(-0.45, 0.45) * k; P.vx = rnd(-0.5, 0.5); P.vz = rnd(-0.5, 0.5); P.vy = rnd(0.7, 2.2);
    P.life = rnd(0.9, 1.6); P.s0 = rnd(0.9, 1.2) * k; P.s1 = rnd(2.0, 2.7) * k; P.a = rnd(0.6, 0.85); P.tex = smokeTex(); P.fadeIn = 0.1; P.pow = 1.3; P.rot = Math.random() * TAU; P.rotV = rnd(-1, 1); P.drag = 1; P.age = -rnd(0, 0.12);
    pcol(i % 3 ? pale : mid, rnd(0.8, 1.1)); S.nrm.push();
  }
  for (let i = 0; i < 22; i++) { const a = Math.random() * TAU, r = rnd(0.1, 1.1) * k; riseSpark(x + Math.cos(a) * r, y + rnd(0, 0.3), z + Math.sin(a) * r, color, { v0: 3, v1: 9, life0: 0.3, life1: 0.7 }); }
}
// 같은 오브젝트에 겹쳐 부르면(이미 사라지는 중) 두 번째 호출은 무시한다.
// 끝나면 원래 재질·높이로 되돌리고 visible=false 로 둔다(풀 재사용 시 visible 만 켜면 된다). clear() 로 중단되면 원래대로 되돌리기만 한다.
const FADING = new WeakMap();
function deathFade(obj, o = {}) {
  if (!obj || FADING.has(obj)) return;
  if (!S.ok) { obj.visible = false; if (o.onDone) o.onDone(); return; }
  const dur = o.duration ?? 1.6, sink = o.sink ?? 0.55, y0 = obj.position.y, saved = [];
  obj.traverse((c) => {
    if (!c.isMesh || !c.material || c.userData.vfx) return;
    const arr = Array.isArray(c.material), src = arr ? c.material : [c.material], cl = src.map((mt) => { const k = mt.clone(); k.transparent = true; k.userData.op0 = mt.opacity ?? 1; return k; });
    saved.push([c, c.material, cl]); c.material = arr ? cl : cl[0];
  });
  const restore = () => { for (const [c, orig, cl] of saved) { c.material = orig; for (const k of cl) k.dispose(); } obj.position.y = y0; FADING.delete(obj); };
  FADING.set(obj, true);
  let acc = 0;
  run(dur, (k, dt) => {
    const f = 1 - Math.pow(k, 1.6);
    for (const [, , cl] of saved) for (const mt of cl) mt.opacity = mt.userData.op0 * f;
    obj.position.y = y0 - sink * k * k;
    if (o.smoke !== false && k < 0.85) {
      acc += dt * 16; worldPos(obj, _v);
      while (acc >= 1) {
        acc--; const a = Math.random() * TAU, r = rnd(0, 0.6);
        np(); P.x = _v.x + Math.cos(a) * r; P.y = _v.y + rnd(0.1, 1.2); P.z = _v.z + Math.sin(a) * r; P.vy = rnd(0.6, 1.6); P.life = rnd(0.7, 1.3); P.turb = 1.5;
        if (Math.random() < 0.5) { P.s0 = 0.5; P.s1 = 1.3; P.a = 0.28; P.tex = smokeTex(); P.fadeIn = 0.2; P.rot = Math.random() * TAU; pcol(0x16141a); S.nrm.push(); }
        else { P.s0 = 0.14; P.s1 = 0.03; P.tex = CELL.GLOW; P.fadeIn = 0.2; pcol(o.color ?? 0x8fb0ff, 1.8); S.add.push(); }
      }
    }
  }, restore, () => { obj.visible = false; if (o.onDone) o.onDone(); });
}

// ───────────── 분위기 입자 ─────────────
const AMB = {
  embers: { life: [2, 4.2], emit(x, y, z) { P.x = x; P.y = y + rnd(0, 2.5); P.z = z; P.vy = rnd(0.5, 1.8); P.vx = rnd(-0.4, 0.4); P.turb = 3; P.s0 = rnd(0.12, 0.26); P.s1 = 0.05; P.tex = CELL.GLOW; P.flick = 14; P.fadeIn = 0.1; P.pow = 0.8; pcol(0xff8a28, rnd(1.6, 2.6)); pcol1(0xd02a08, 1.5); return S.add; } },
  fireflies: { life: [3, 6], emit(x, y, z) { P.x = x; P.y = y + rnd(0.4, 2.4); P.z = z; P.vx = rnd(-0.3, 0.3); P.vz = rnd(-0.3, 0.3); P.turb = 1.6; P.s0 = P.s1 = rnd(0.16, 0.28); P.tex = CELL.GLOW; P.flick = rnd(2, 4.5); P.fadeIn = 0.25; P.pow = 0.7; pcol(0xcfff5a, rnd(1.8, 2.8)); return S.add; } },
  leaves: { life: [4, 6.5], emit(x, y, z) { P.x = x; P.y = y + rnd(3, 7); P.z = z; P.vy = -rnd(0.6, 1.1); P.vx = rnd(0.2, 0.9); P.turb = 2.2; P.rot = Math.random() * TAU; P.rotV = rnd(-3.5, 3.5); P.s0 = P.s1 = rnd(0.2, 0.34); P.tex = CELL.LEAF; P.fadeIn = 0.1; P.pow = 0.4; P.a = 0.95; pcol([0x5c8a2c, 0x86a23a, 0xb89238, 0x4a7526][Math.random() * 4 | 0], rnd(0.8, 1.1)); return S.nrm; } },
  ash: { life: [4, 7], emit(x, y, z) { P.x = x; P.y = y + rnd(2, 7); P.z = z; P.vy = -rnd(0.3, 0.7); P.vx = rnd(-0.3, 0.5); P.turb = 1.4; P.s0 = P.s1 = rnd(0.05, 0.11); P.tex = CELL.DOT; P.fadeIn = 0.15; P.pow = 0.5; P.a = 0.7; P.rotV = rnd(-2, 2); pcol(Math.random() < 0.2 ? 0xff7a30 : 0xb4aca4, rnd(0.7, 1.1)); return S.nrm; } },
};
function ambient(kind, o = {}) {
  const def = AMB[kind];
  if (!S.ok || !def) return { dispose() {}, setCenter() {} };
  let center = o.center || { x: 0, y: 0, z: 0 }; const radius = o.radius ?? 12, cnt = o.count ?? 40, avg = (def.life[0] + def.life[1]) / 2;
  const emit = (pre) => {
    worldPos(center, _v2); const a = Math.random() * TAU, r = Math.sqrt(Math.random()) * radius;
    np(); P.life = rnd(def.life[0], def.life[1]); const batch = def.emit(_v2.x + Math.cos(a) * r, _v2.y, _v2.z + Math.sin(a) * r);
    if (pre) { const f = Math.random() * 0.9; P.x += P.vx * P.life * f; P.y += P.vy * P.life * f; P.z += P.vz * P.life * f; P.age = P.life * f; }
    batch.push();
  };
  for (let i = 0; i < cnt; i++) emit(true);
  let acc = 0;
  const e = run(Infinity, (k, dt) => { acc += dt * cnt / avg; while (acc >= 1) { acc--; emit(false); } });
  return { dispose() { e.dead = true; }, setCenter(c) { center = c; } };
}

// ───────────── 바닥 자국 ─────────────
function groundDecal(pos, o = {}) {
  if (!S.ok) return;
  const kind = o.kind || 'crack', radius = o.radius ?? 1.5, dur = o.duration ?? 4, x = pos.x, y = pos.y || 0, z = pos.z, rot = Math.random() * TAU;
  const env = (k, e) => clamp01(e.t / 0.06) * (k < 0.65 ? 1 : 1 - (k - 0.65) / 0.35);
  if (kind === 'circle') {
    const m = mesh('plane', 'tex'); m.position.set(x, y + 0.045, z); m.scale.setScalar(radius); m.renderOrder = 13; const u = setU(m, o.color ?? 0x8fd0ff, 0, 1.1); u.uMap.value = S.tex.rune;
    run(dur, (k, dt, e) => { u.uOpacity.value = env(k, e); u.uRot.value = rot + e.t * 0.5; }, () => free(m)); return;
  }
  const m = mesh('plane', 'tex'); m.position.set(x, y + (kind === 'crack' ? 0.03 : 0.02), z); m.scale.setScalar(radius); m.renderOrder = kind === 'crack' ? 9 : 8; m.material.blending = THREE.NormalBlending;
  const u = setU(m, kind === 'crack' ? 0x050403 : 0x070504, 0, 1); u.uMap.value = kind === 'crack' ? S.tex.crack : S.tex.scorch; u.uRot.value = rot;
  let hot = null, uh = null;
  if (kind === 'crack' || o.color != null) {   // 갓 생긴 자국은 달아올라 있다가 식는다
    hot = mesh('plane', 'tex'); hot.position.set(x, y + 0.04, z); hot.scale.setScalar(radius); hot.renderOrder = 10; uh = setU(hot, o.color ?? 0xff7a2a, 1, 1.0); uh.uMap.value = u.uMap.value; uh.uRot.value = rot;
  }
  const cool = Math.min(dur * 0.5, 1.1);
  run(dur, (k, dt, e) => { u.uOpacity.value = env(k, e) * 0.92; if (hot) { const h = 1 - clamp01(e.t / cool); uh.uOpacity.value = h * h * 0.75; hot.visible = h > 0; } }, () => free(m, hot));
}

export const VFX = {
  init, update, count, clear, dispose, textureFor, setIntensity,
  slash, hit, shockwave, dust, footDust, levelUp, buff, heal, teleport, lootBeam, telegraph, meteor, fireRing, flameBurst,
  projectile, weaponTrail, enhanceGlow, spawn, deathFade, ambient, groundDecal,
  particleCount() { return S.ok ? S.add.n + S.nrm.n + S.fire.n : 0; },
};
export default VFX;
