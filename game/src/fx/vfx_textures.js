// 이펙트용 텍스처를 전부 캔버스로 그린다(외부 그림 없음).
// 모든 텍스처는 "검은 바탕 + 흰 그림" 마스크이고, 셰이더는 R 채널만 읽는다.
import * as THREE from 'three';

function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

function canvas(w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
  return [c, g];
}
function radial(g, x, y, r, stops) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  for (const [o, a] of stops) gr.addColorStop(o, `rgba(255,255,255,${a})`);
  g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
}
const GLOW_STOPS = [[0, 1], [0.12, 0.8], [0.3, 0.38], [0.55, 0.12], [0.8, 0.03], [1, 0]];

function drawGlow(g, s) { radial(g, s / 2, s / 2, s * 0.48, GLOW_STOPS); }
function drawSpark(g, s) {
  g.save(); g.translate(s / 2, s / 2); g.scale(0.36, 1);
  radial(g, 0, 0, s * 0.47, [[0, 1], [0.25, 0.9], [0.55, 0.4], [1, 0]]); g.restore();
}
function drawBlobs(g, s, r, n, spread, rmin, rmax, amin, amax, shape) {
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    let a = r() * Math.PI * 2, d = Math.sqrt(r()) * spread * s;
    let x = s / 2 + Math.cos(a) * d, y = s / 2 + Math.sin(a) * d;
    let rad = (rmin + r() * (rmax - rmin)) * s;
    if (shape === 'flame') { const k = r(); y = s * (0.86 - k * 0.66); x = s / 2 + (r() - 0.5) * s * 0.5 * (1 - k * 0.8); rad *= (1 - k * 0.6); }
    radial(g, x, y, rad, [[0, amin + r() * (amax - amin)], [0.5, amin * 0.5], [1, 0]]);
  }
  // 가장자리를 부드럽게 죽인다
  g.globalCompositeOperation = 'multiply';
  const gr = g.createRadialGradient(s / 2, s / 2, s * 0.12, s / 2, s / 2, s * 0.5);
  gr.addColorStop(0, '#fff'); gr.addColorStop(0.6, '#999'); gr.addColorStop(1, '#000');
  g.fillStyle = gr; g.fillRect(0, 0, s, s);
  g.globalCompositeOperation = 'source-over';
}
function drawSmoke(g, s) { drawBlobs(g, s, rng(11), 34, 0.3, 0.1, 0.24, 0.1, 0.24); }
// 값 잡음(반복 없음, 캔버스 한 칸을 그리는 데만 쓴다)
function makeNoise(seed) {
  const r = rng(seed), N = 64, t = new Float32Array(N * N); for (let i = 0; i < N * N; i++) t[i] = r();
  const at = (x, y) => t[((y % N + N) % N) * N + ((x % N + N) % N)];
  const n = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y); let fx = x - xi, fy = y - yi; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1); return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy; };
  return (x, y) => (n(x, y) * 0.5 + n(x * 2.03 + 17, y * 2.03 + 5) * 0.27 + n(x * 4.1 + 31, y * 4.1 + 11) * 0.15 + n(x * 8.2 + 3, y * 8.2 + 41) * 0.08);
}
const sstep = (a, b, x) => { x = (x - a) / (b - a); x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); };
// 불꽃 혀: 아래가 둥글고 위로 갈수록 여러 갈래로 갈라지며 뾰족해진다(침식 셰이더와 짝)
function flameCell(seed) {
  return (g, s) => {
    const nz = makeNoise(seed), img = g.getImageData(0, 0, s, s), d = img.data, o = seed * 3.7;
    for (let py = 0; py < s; py++) for (let px = 0; px < s; px++) {
      const u = (px + 0.5) / s - 0.5, h = 1 - (py + 0.5) / s;
      const x = u + (nz(u * 3 + o, h * 2.4 + o) - 0.5) * 0.55 * h;                 // 위로 갈수록 옆으로 일렁임
      const w = 0.36 * Math.pow(Math.sin(Math.PI * Math.pow(h, 0.6)), 0.9) + 1e-4; // 몸통 반폭(아래 1/4 지점이 가장 넓다)
      const body = Math.max(0, 1 - Math.abs(x) / w);
      const lick = sstep(0.36, 0.62, nz(x * 7.5 + o * 2, h * 1.5 - o));             // 세로 갈래
      const curl = 0.55 + 0.9 * nz(u * 5 - o, h * 5 + o * 2);
      let v = Math.pow(body, 0.8) * (1 - sstep(0.12, 0.85, h) * (1 - lick * 1.15)) * curl * (1.15 - 0.55 * h);
      v *= sstep(0, 0.16, h) * (1 - sstep(0.86, 1, h));
      const e = Math.min(1, Math.min(px, s - 1 - px, py, s - 1 - py) / 5);          // 칸 가장자리는 반드시 0
      v *= 0.45 + 0.75 * Math.pow(Math.max(0, 1 - Math.abs(x) / (w * 0.75)), 1.2) * (1 - 0.5 * h);     // 가운데 아래가 가장 짙다(침식될 때 가는 혀만 남도록)
      const c = Math.max(0, Math.min(255, v * e * 215)), i = (py * s + px) * 4; d[i] = d[i + 1] = d[i + 2] = c; d[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  };
}
// 뭉게 연기: 잡음으로 가장자리를 뜯어 솜뭉치처럼 보이지 않게 한다
function smokeCell(seed) {
  return (g, s) => {
    const nz = makeNoise(seed), img = g.getImageData(0, 0, s, s), d = img.data;
    for (let py = 0; py < s; py++) for (let px = 0; px < s; px++) {
      const u = (px + 0.5) / s - 0.5, w = (py + 0.5) / s - 0.5, r = Math.hypot(u, w) * 2;
      const n1 = nz(u * 5 + seed, w * 5 - seed), n2 = nz(u * 11 - seed * 2, w * 11 + seed);
      let v = (1 - sstep(0.25 + n1 * 0.5, 0.95, r)) * (0.35 + 0.65 * n1) * (0.7 + 0.5 * n2);
      const c = Math.max(0, Math.min(255, v * 235)), i = (py * s + px) * 4; d[i] = d[i + 1] = d[i + 2] = c; d[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  };
}
function drawStar(g, s) {
  g.globalCompositeOperation = 'lighter';
  radial(g, s / 2, s / 2, s * 0.2, GLOW_STOPS);
  const spike = (rot, len, thin) => { g.save(); g.translate(s / 2, s / 2); g.rotate(rot); g.scale(1, thin); radial(g, 0, 0, s * len, [[0, 1], [0.15, 0.9], [0.5, 0.4], [1, 0]]); g.restore(); };
  spike(0, 0.49, 0.06); spike(Math.PI / 2, 0.49, 0.06); spike(Math.PI / 4, 0.28, 0.07); spike(-Math.PI / 4, 0.28, 0.07);
  g.globalCompositeOperation = 'source-over';
}
function drawRing(g, s, lw = 0.04, rad = 0.38) {
  g.strokeStyle = '#fff'; g.shadowColor = '#fff';
  for (const [b, w, a] of [[s * 0.09, lw * s, 0.8], [s * 0.03, lw * s * 0.5, 1]]) {
    g.shadowBlur = b; g.lineWidth = w; g.globalAlpha = a; g.beginPath(); g.arc(s / 2, s / 2, s * rad, 0, Math.PI * 2); g.stroke();
  }
  g.shadowBlur = 0; g.globalAlpha = 1;
}
function drawDot(g, s) { radial(g, s / 2, s / 2, s * 0.44, [[0, 1], [0.7, 1], [0.86, 0.5], [1, 0]]); }
function drawLeaf(g, s) {
  g.save(); g.translate(s / 2, s / 2); g.rotate(0.5);
  g.fillStyle = '#fff'; g.beginPath(); g.moveTo(0, -s * 0.42);
  g.quadraticCurveTo(s * 0.3, -s * 0.1, 0, s * 0.42); g.quadraticCurveTo(-s * 0.3, -s * 0.1, 0, -s * 0.42); g.fill();
  g.strokeStyle = '#777'; g.lineWidth = s * 0.025; g.beginPath(); g.moveTo(0, -s * 0.38); g.lineTo(0, s * 0.4); g.stroke();
  g.restore();
}

function tex(c, repeat) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.needsUpdate = true; return t;
}

// 입자용 아틀라스: 4열 × 4행
export const CELL = { GLOW: 0, SPARK: 1, SMOKE: 2, STAR: 3, FLAME: 4, RING: 5, DOT: 6, LEAF: 7, FLAME2: 8, FLAME3: 9, SMOKE2: 10, SMOKE3: 11 };
const CELL_DRAW = [drawGlow, drawSpark, drawSmoke, drawStar, flameCell(29), drawRing, drawDot, drawLeaf, flameCell(53), flameCell(87), smokeCell(7), smokeCell(19)];

function single(draw, s) { const [c, g] = canvas(s, s); draw(g, s); return c; }

function drawSlash() {
  const W = 256, H = 64, [c, g] = canvas(W, H), r = rng(5);
  g.fillStyle = '#3a3a3a'; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; g.shadowColor = '#fff'; g.shadowBlur = 2;
  for (let i = 0; i < 110; i++) {
    const y = r() * H, x = r() * W, len = 30 + r() * 190;
    g.strokeStyle = `rgba(255,255,255,${0.12 + r() * 0.5})`; g.lineWidth = 0.6 + r() * 2.4;
    for (const ox of [0, -W]) { g.beginPath(); g.moveTo(x + ox, y); g.lineTo(x + ox + len, y + (r() - 0.5) * 1.5); g.stroke(); }
  }
  return c;
}
function drawBeam() {
  const W = 64, H = 256, [c, g] = canvas(W, H), r = rng(8);
  g.fillStyle = '#555'; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
  for (let i = 0; i < 46; i++) {
    const x = r() * W, y = r() * H, len = 40 + r() * 150;
    g.strokeStyle = `rgba(255,255,255,${0.1 + r() * 0.45})`; g.lineWidth = 0.8 + r() * 3.5;
    for (const o of [0, -H]) for (const ox of [0, -W, W]) { g.beginPath(); g.moveTo(x + ox, y + o); g.lineTo(x + ox, y + o + len); g.stroke(); }
  }
  return c;
}
function drawRune() {
  const S = 512, [c, g] = canvas(S, S), r = rng(77), C = S / 2;
  g.strokeStyle = '#fff'; g.shadowColor = '#fff'; g.lineCap = 'round'; g.lineJoin = 'round';
  const circ = (rad, lw) => { g.lineWidth = lw; g.beginPath(); g.arc(C, C, rad, 0, Math.PI * 2); g.stroke(); };
  const poly = (rad, n, rot, lw, skip = 1) => { g.lineWidth = lw; g.beginPath(); for (let i = 0; i <= n; i++) { const a = rot + (i * skip) * Math.PI * 2 / n; const x = C + Math.cos(a) * rad, y = C + Math.sin(a) * rad; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); };
  for (let pass = 0; pass < 2; pass++) {
    g.shadowBlur = pass ? 3 : 14; g.globalAlpha = pass ? 1 : 0.7;
    circ(238, 6); circ(222, 2); circ(176, 3.5); circ(168, 1.5); circ(104, 2.5); circ(52, 2);
    poly(168, 3, -Math.PI / 2, 3); poly(168, 3, Math.PI / 2, 3);          // 육망성
    poly(104, 8, 0, 2, 3);                                                  // 팔각 별
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; g.lineWidth = 2; g.beginPath(); g.arc(C + Math.cos(a) * 168, C + Math.sin(a) * 168, 15, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(C + Math.cos(a) * 168, C + Math.sin(a) * 168, 5, 0, Math.PI * 2); g.stroke(); }
    for (let i = 0; i < 72; i++) { const a = i * Math.PI / 36, l = i % 6 === 0 ? 12 : 6; g.lineWidth = 1.5; g.beginPath(); g.moveTo(C + Math.cos(a) * 222, C + Math.sin(a) * 222); g.lineTo(C + Math.cos(a) * (222 + l), C + Math.sin(a) * (222 + l)); g.stroke(); }
  }
  // 바깥 띠의 문양 글자(임의의 획 — 어떤 실제 문자도 아님)
  g.shadowBlur = 4; g.globalAlpha = 1; g.lineWidth = 2.6;
  for (let i = 0; i < 20; i++) {
    const a = i * Math.PI * 2 / 20 + 0.08; g.save(); g.translate(C + Math.cos(a) * 199, C + Math.sin(a) * 199); g.rotate(a + Math.PI / 2);
    const n = 2 + (r() * 3 | 0); let x = (r() - 0.5) * 12, y = (r() - 0.5) * 14;
    g.beginPath(); g.moveTo(x, y);
    for (let k = 0; k < n; k++) { x = (r() - 0.5) * 16; y = (r() - 0.5) * 18; g.lineTo(x, y); }
    g.stroke(); if (r() > 0.5) { g.beginPath(); g.arc((r() - 0.5) * 10, (r() - 0.5) * 12, 2.5, 0, 7); g.stroke(); }
    g.restore();
  }
  g.shadowBlur = 0;
  return c;
}
function drawCrack() {
  const S = 512, [c, g] = canvas(S, S), r = rng(123), C = S / 2;
  g.strokeStyle = '#fff'; g.shadowColor = '#fff'; g.shadowBlur = 3; g.lineCap = 'round'; g.lineJoin = 'round';
  const walk = (x, y, a, len, w, depth) => {
    const steps = Math.max(2, len / 16 | 0);
    for (let i = 0; i < steps; i++) {
      a += (r() - 0.5) * 0.9; const nx = x + Math.cos(a) * 16, ny = y + Math.sin(a) * 16;
      if (Math.hypot(nx - C, ny - C) > 238) return;
      g.lineWidth = Math.max(0.8, w * (1 - i / steps)); g.beginPath(); g.moveTo(x, y); g.lineTo(nx, ny); g.stroke();
      x = nx; y = ny;
      if (depth < 3 && r() < 0.28) walk(x, y, a + (r() > 0.5 ? 1 : -1) * (0.5 + r() * 0.7), len * 0.5, w * 0.6, depth + 1);
    }
  };
  for (let i = 0; i < 9; i++) walk(C, C, i * Math.PI * 2 / 9 + (r() - 0.5) * 0.5, 170 + r() * 70, 7, 0);
  g.shadowBlur = 0; g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 14; i++) { const a = r() * 7, d = r() * 40; radial(g, C + Math.cos(a) * d, C + Math.sin(a) * d, 10 + r() * 20, [[0, 0.3], [1, 0]]); }
  return c;
}
function drawScorch() {
  const S = 256, [c, g] = canvas(S, S), r = rng(321);
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 90; i++) { const a = r() * 7, d = Math.pow(r(), 0.7) * S * 0.36; radial(g, S / 2 + Math.cos(a) * d, S / 2 + Math.sin(a) * d, S * (0.06 + r() * 0.16), [[0, 0.16 + r() * 0.2], [0.6, 0.1], [1, 0]]); }
  g.globalCompositeOperation = 'multiply';
  const gr = g.createRadialGradient(S / 2, S / 2, S * 0.2, S / 2, S / 2, S * 0.5);
  gr.addColorStop(0, '#fff'); gr.addColorStop(0.7, '#aaa'); gr.addColorStop(1, '#000'); g.fillStyle = gr; g.fillRect(0, 0, S, S);
  return c;
}
function drawAura(soft) {
  const W = 64, H = 256, [c, g] = canvas(W, H), img = g.getImageData(0, 0, W, H), d = img.data;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const py = Math.min(Math.max(y, 34), H - 34), dist = Math.hypot(x - W / 2 + 0.5, y - py);
    const q = dist / 31, rim = Math.exp(-Math.pow((q - 0.56) / 0.15, 2));
    const v = Math.min(1, soft ? Math.pow(Math.max(0, 1 - q), 2.4) : rim * (1 - sstep(0.85, 1, q)) + 0.05 * Math.max(0, 1 - q)) * 255, i = (y * W + x) * 4;
    d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0); return c;
}

// 화살: 위가 촉. 촉(삼각형)·살대·깃
function drawArrow() {
  const W = 64, H = 256, [c, g] = canvas(W, H), X = W / 2;
  g.shadowColor = '#fff'; g.shadowBlur = 5; g.fillStyle = '#fff';
  g.beginPath(); g.moveTo(X, 6); g.lineTo(X + 13, 50); g.lineTo(X, 40); g.lineTo(X - 13, 50); g.closePath(); g.fill();            // 촉
  g.shadowBlur = 3; g.fillStyle = '#9a9a9a'; g.fillRect(X - 2.2, 38, 4.4, 204);                                                    // 살대
  g.fillStyle = '#e4e4e4';
  for (const sg of [-1, 1]) { g.beginPath(); g.moveTo(X + sg * 2, 180); g.lineTo(X + sg * 15, 200); g.lineTo(X + sg * 15, 244); g.lineTo(X + sg * 2, 228); g.closePath(); g.fill(); }  // 깃
  g.shadowBlur = 0; g.strokeStyle = '#000'; g.lineWidth = 1.2; for (const sg of [-1, 1]) for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(X + sg * 3, 194 + i * 12); g.lineTo(X + sg * 15, 212 + i * 12); g.stroke(); }
  return c;
}

export function buildTextures() {
  const cs = 128, [ac, ag] = canvas(cs * 4, cs * 4);
  CELL_DRAW.forEach((draw, i) => ag.drawImage(single(draw, cs), (i % 4) * cs, (i / 4 | 0) * cs));
  const atlas = tex(ac); atlas.generateMipmaps = false; atlas.minFilter = THREE.LinearFilter;
  return {
    atlas,
    glow: tex(single(drawGlow, 128)), spark: tex(single(drawSpark, 128)), smoke: tex(single(drawSmoke, 128)),
    star: tex(single(drawStar, 128)), flame: tex(single(flameCell(29), 128)),
    ring: tex(single((g, s) => drawRing(g, s, 0.03, 0.44), 256)),
    slash: tex(drawSlash(), true), beam: tex(drawBeam(), true),
    rune: tex(drawRune()), crack: tex(drawCrack()), scorch: tex(drawScorch()), aura: tex(drawAura(false)), auraSoft: tex(drawAura(true)), arrow: tex(drawArrow()),
  };
}
