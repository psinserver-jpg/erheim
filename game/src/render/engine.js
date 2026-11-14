// 렌더 엔진: 렌더러·조명(해·하늘빛·보조광)·맞춤 그림자·절차적 하늘과 환경맵·안개(거리+높이)·후처리(AO·블룸·톤 매핑·색 보정·FXAA)
//           ·구역 분위기 섞기·품질 단계·쿼터뷰 카메라(따라가기/연출/흔들림)
// 화면 방향: 구름 낀 늦은 오후~해질녘. 낮게 깔린 따뜻한 햇빛과 차가운 청회색 그늘.
import * as THREE from 'three';
import { installFog } from './fog.js';
import { createSky } from './sky.js';
import { createPost } from './post.js';

// ───────────────────────── 분위기(구역별 빛·하늘·안개·색 보정). 색은 모두 선형 RGB ─────────────────────────
// legacy: game.js 의 MOODS 표가 넘기는 예전 값. setMood 가 받은 값이 어느 분위기인지 고르고, 예전 값 대비 비율만 반영한다.
export const MOOD_IDS = ['town', 'forest', 'grave', 'altar', 'wild'];
export const MOODS = {
  // 벨로스 성채: 젖은 회색 돌바닥 위로 비스듬히 드는 석양, 그늘은 푸르스름하게
  town: {
    legacy: { sky: 0xa9c9e8, far: 170, sun: 2.6, hemi: 0.85, tint: [1.03, 1.0, 0.95] },
    sunColor: [1.0, 0.82, 0.62], sun: 5.0, hemiSky: [0.36, 0.53, 0.90], hemiGround: [0.22, 0.21, 0.21], hemi: 0.32, fillColor: [0.50, 0.62, 0.88], fill: 0.20, exposure: 2.0,
    zenith: [0.38, 0.55, 0.92], horizon: [1.5, 1.12, 0.78], ground: [0.30, 0.28, 0.27], sunGlow: [1.0, 0.62, 0.32], cloudLit: [2.0, 1.45, 0.98], cloudDark: [0.36, 0.40, 0.52], cloud: 0.62, glow: 1.0,
    haze: [0.20, 0.23, 0.28], hazeSun: [0.42, 0.32, 0.23],
    fogDist: 0.0048, fogStart: 22, fogH: 0.012, fogFall: 0.42, fogBase: 0, fogNoise: 0.4, fogScale: 0.12, fogMax: 0.96,
    tint: [1.02, 1.0, 0.97], sat: 1.0, shadowTint: [0.92, 0.985, 1.08], highTint: [1.04, 1.0, 0.94], vig: 0.30, night: 0.3,
    gobo: 0.24, goboScale: 0.035, goboCover: 0.48, goboDrift: 1.2, goboSoft: 0.2,   // 햇빛 얼룩: 세기·크기(1/m)·가림 정도·흐르는 속도(m/s)·가장자리 부드러움. 성채는 느리게 지나가는 구름 그림자
  },
  // 속삭이는 숲: 짙은 녹음, 바닥에 깔린 옅은 안개, 나뭇잎 사이로 드는 빛
  forest: {
    legacy: { sky: 0x8fb89a, far: 135, sun: 2.5, hemi: 0.8, tint: [0.97, 1.03, 0.95] },
    sunColor: [1.0, 0.84, 0.58], sun: 4.6, hemiSky: [0.32, 0.50, 0.60], hemiGround: [0.16, 0.21, 0.11], hemi: 0.32, fillColor: [0.40, 0.58, 0.68], fill: 0.18, exposure: 2.0,
    zenith: [0.36, 0.52, 0.70], horizon: [1.25, 1.1, 0.74], ground: [0.14, 0.18, 0.09], sunGlow: [1.0, 0.68, 0.34], cloudLit: [1.8, 1.45, 1.0], cloudDark: [0.30, 0.38, 0.44], cloud: 0.66, glow: 0.9,
    haze: [0.16, 0.22, 0.21], hazeSun: [0.36, 0.33, 0.22],
    fogDist: 0.0085, fogStart: 16, fogH: 0.035, fogFall: 0.55, fogBase: 0, fogNoise: 0.6, fogScale: 0.13, fogMax: 0.96,
    tint: [0.98, 1.02, 0.96], sat: 0.97, shadowTint: [0.92, 1.0, 1.04], highTint: [1.04, 1.01, 0.93], vig: 0.34, night: 0.35,
    gobo: 0.55, goboScale: 0.55, goboCover: 0.46, goboDrift: 0.10, goboSoft: 0.075,   // 숲은 나뭇잎 사이로 드는 얼룩진 빛
  },
  // 잊혀진 묘지: 차갑고 푸른 안개, 빛바랜 색
  grave: {
    legacy: { sky: 0x5c6a80, far: 95, sun: 1.3, hemi: 0.6, tint: [0.9, 0.95, 1.08] },
    sunColor: [0.62, 0.76, 1.0], sun: 2.2, hemiSky: [0.28, 0.42, 0.72], hemiGround: [0.12, 0.16, 0.22], hemi: 0.30, fillColor: [0.34, 0.50, 0.82], fill: 0.18, exposure: 2.1,
    zenith: [0.14, 0.20, 0.36], horizon: [0.42, 0.56, 0.80], ground: [0.08, 0.10, 0.14], sunGlow: [0.5, 0.66, 1.0], cloudLit: [0.75, 0.95, 1.3], cloudDark: [0.12, 0.16, 0.26], cloud: 0.72, glow: 0.55,
    haze: [0.12, 0.17, 0.26], hazeSun: [0.15, 0.21, 0.31],
    fogDist: 0.0135, fogStart: 10, fogH: 0.12, fogFall: 0.60, fogBase: 0, fogNoise: 0.6, fogScale: 0.15, fogMax: 0.97,
    tint: [0.94, 0.99, 1.07], sat: 0.84, shadowTint: [0.90, 0.98, 1.10], highTint: [0.98, 1.0, 1.03], vig: 0.40, night: 1,
    gobo: 0.0, goboScale: 0.05, goboCover: 0.5, goboDrift: 0.4, goboSoft: 0.2,
  },
  // 잿불 제단: 검은 화산암, 붉은 용암빛, 매캐한 연기. 연기 사이로 드는 차가운 빛이 용암의 붉은빛과 맞선다(온통 붉어지지 않게)
  altar: {
    legacy: { sky: 0x2a1614, far: 120, sun: 1.7, hemi: 0.65, tint: [1.04, 0.96, 0.92] },
    sunColor: [0.62, 0.72, 0.98], sun: 4.8, hemiSky: [0.30, 0.34, 0.50], hemiGround: [0.45, 0.18, 0.08], hemi: 0.5, fillColor: [0.44, 0.42, 0.62], fill: 0.30, exposure: 1.3,
    zenith: [0.07, 0.07, 0.10], horizon: [0.7, 0.22, 0.08], ground: [0.20, 0.07, 0.03], sunGlow: [0.55, 0.65, 0.9], cloudLit: [0.9, 0.30, 0.12], cloudDark: [0.07, 0.06, 0.08], cloud: 0.78, glow: 0.4,
    haze: [0.075, 0.05, 0.05], hazeSun: [0.14, 0.08, 0.06],
    fogDist: 0.0105, fogStart: 16, fogH: 0.035, fogFall: 0.34, fogBase: 0.5, fogNoise: 0.6, fogScale: 0.11, fogMax: 0.95,
    tint: [1.0, 0.99, 0.98], sat: 0.93, shadowTint: [0.97, 0.97, 1.05], highTint: [1.05, 0.99, 0.93], vig: 0.42, night: 1,
    gobo: 0.30, goboScale: 0.05, goboCover: 0.5, goboDrift: 0.8, goboSoft: 0.2,   // 흘러가는 연기의 그늘
  },
  // 에르하임 평원(구역 밖): 성채와 같은 하늘, 조금 더 트인 느낌
  wild: {
    legacy: { sky: 0x9cc0e0, far: 160, sun: 2.9, hemi: 0.9, tint: [1, 1, 1] },
    sunColor: [1.0, 0.83, 0.63], sun: 5.0, hemiSky: [0.38, 0.54, 0.82], hemiGround: [0.17, 0.20, 0.14], hemi: 0.32, fillColor: [0.48, 0.62, 0.84], fill: 0.20, exposure: 2.0,
    zenith: [0.38, 0.56, 0.90], horizon: [1.5, 1.14, 0.78], ground: [0.22, 0.25, 0.14], sunGlow: [1.0, 0.62, 0.30], cloudLit: [2.0, 1.48, 0.98], cloudDark: [0.36, 0.41, 0.52], cloud: 0.58, glow: 1.0,
    haze: [0.20, 0.24, 0.27], hazeSun: [0.42, 0.33, 0.23],
    fogDist: 0.0052, fogStart: 20, fogH: 0.018, fogFall: 0.50, fogBase: 0, fogNoise: 0.45, fogScale: 0.12, fogMax: 0.96,
    tint: [1.01, 1.0, 0.97], sat: 1.0, shadowTint: [0.92, 0.985, 1.08], highTint: [1.04, 1.0, 0.94], vig: 0.30, night: 0.3,
    gobo: 0.26, goboScale: 0.03, goboCover: 0.48, goboDrift: 1.2, goboSoft: 0.2,
  },
};
const MOOD_KEYS = Object.keys(MOODS.town).filter(k => k !== 'legacy');

// ───────────────────────── 조정 손잡이 ─────────────────────────
// 해의 방향: 화면 왼쪽·카메라 쪽 앞에서 낮게(고도 약 37°). 그림자는 화면 오른쪽 위로 길게 떨어진다. 구역이 바뀌어도 방향은 같다(그림자가 돌지 않게).
const SUN_DIR = new THREE.Vector3(-0.34, 0.78, 0.94).normalize();
const FILL_DIR = new THREE.Vector3(0.92, 0.55, -0.21).normalize();   // 보조광: 해 반대편(화면 오른쪽)에서 오는 약한 하늘빛. 그림자 없음
const SHADOW = { soft: 0.055, maxDist: 110, recvH: 7, castH: 24, minSize: 18, maxSize: 150, step: 2 };   // soft = 반그림자 반지름(m)
// msaa 는 HDR 타깃+깊이 리졸브라 비싸다: 번갈아 재기에서 4→2 가 프레임당 2~3ms. 뒤에 FXAA 가 있어 높음도 2× 로 둔다(4× 를 쓰려면 post.setSamples(4))
// 품질 단계: msaa = 장면 표본 수, shadow = 그림자 지도 한 변, taps = 그림자 필터 표본 수, ao = AO 표본 수(0 = 끔)
const QUALITY = {
  '높음': { msaa: 2, shadow: 2048, taps: 12, ao: 10, bloom: true, auto: true, fogNoise: true, grain: 1, sharp: 1 },
  '보통': { msaa: 0, shadow: 1024, taps: 8, ao: 6, bloom: true, auto: true, fogNoise: true, grain: 1, sharp: 0 },
  '낮음': { msaa: 0, shadow: 0, taps: 5, ao: 0, bloom: false, auto: false, fogNoise: false, grain: 0, sharp: 0 },
};

export function createEngine(container) {
  const W = 1920, H = 1080;
  const fog = installFog();   // 재질이 하나라도 만들어지기 전에 안개·그림자 셰이더를 바꿔 끼운다
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1); renderer.setSize(W, H);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;   // 톤 매핑은 후처리 마지막 단계에서 한다
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x20262e);
  scene.fog = new THREE.Fog(0x20262e, 40, 260);   // 실제 안개는 fog.js 의 셰이더가 그린다. 이 값은 그 셰이더를 못 쓰는 재질용 근사값

  // ---- 조명
  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 2.5);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  scene.add(sun); scene.add(sun.target);
  const fill = new THREE.DirectionalLight(0xffffff, 0.4); fill.position.copy(FILL_DIR).multiplyScalar(50); scene.add(fill);
  const sunDir = SUN_DIR.clone();
  // 그림자 지도의 고정 기준축(three 의 lookAt 과 같은 방식: z=해 쪽, x=위×z, y=z×x)
  const lRight = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), sunDir).normalize();
  const lUp = new THREE.Vector3().crossVectors(sunDir, lRight);

  // ---- 하늘·환경맵(분위기마다 한 벌씩 미리 굽는다)
  const sky = createSky(renderer, sunDir);
  scene.add(sky.dome);
  sky.bake(MOOD_IDS.map(id => MOODS[id]));
  sky.blend([1, 0, 0, 0, 0], true);
  scene.environment = sky.envTexture;
  scene.environmentIntensity = 1.0;

  const camera = new THREE.PerspectiveCamera(30, W / H, 0.5, 600);
  const post = createPost(renderer, W, H);

  // 예전 인터페이스 호환: bloom.enabled(설정 창이 직접 끈다)·strength·threshold, grade.uniforms(uTint·uSat·uVig·uFlash·uFlashCol)
  const bloom = { enabled: true, strength: 0.45, radius: 1.0, threshold: 1.5, knee: 0.5, cap: 0.3, clamp: 14 };   // threshold·clamp 은 노출을 곱한 뒤의 밝기 기준(햇빛 받은 흰 돌 ≈ 1.5, 횃불 ≈ 2.2, 용암·마법 3 이상)
  const grade = { uniforms: post.final };

  // ---- 분위기 상태
  const weights = [1, 0, 0, 0, 0];   // MOOD_IDS 순서
  const ext = { sun: 1, hemi: 1, fog: 1, tint: [1, 1, 1], sunColor: [1, 1, 1] };   // 예전 값 대비 비율(game.js 가 수치를 바꾸면 따라간다)
  const cur = {}; for (const k of MOOD_KEYS) cur[k] = typeof MOODS.town[k] === 'number' ? 0 : [0, 0, 0];
  const legacyCol = MOOD_IDS.map(id => new THREE.Color(MOODS[id].legacy.sky));
  const LEGACY_SUN = new THREE.Color(0xfff1d6);
  const tc = new THREE.Color();
  const moodFns = [], toldW = [1, 0, 0, 0, 0];
  const mood = { id: 'town', weights: {}, night: 0.3, values: cur, dirty: true };
  let target = 0;
  function mixMood() {
    for (const k of MOOD_KEYS) {
      if (typeof cur[k] === 'number') { let s = 0; for (let i = 0; i < 5; i++) s += weights[i] * MOODS[MOOD_IDS[i]][k]; cur[k] = s; }
      else { const o = cur[k]; o[0] = o[1] = o[2] = 0; for (let i = 0; i < 5; i++) { const a = MOODS[MOOD_IDS[i]][k], w = weights[i]; o[0] += a[0] * w; o[1] += a[1] * w; o[2] += a[2] * w; } }
    }
    let best = 0; for (let i = 1; i < 5; i++) if (weights[i] > weights[best]) best = i;
    mood.id = MOOD_IDS[best]; mood.night = cur.night; MOOD_IDS.forEach((id, i) => { mood.weights[id] = weights[i]; });
  }
  const fd = fog.data;
  function applyMood() {
    mixMood();
    const q = QUALITY[api.quality];
    sun.color.setRGB(cur.sunColor[0] * ext.sunColor[0], cur.sunColor[1] * ext.sunColor[1], cur.sunColor[2] * ext.sunColor[2]);
    sun.intensity = cur.sun * ext.sun * api.sunScale;
    hemi.color.setRGB(cur.hemiSky[0], cur.hemiSky[1], cur.hemiSky[2]); hemi.groundColor.setRGB(cur.hemiGround[0], cur.hemiGround[1], cur.hemiGround[2]);
    hemi.intensity = cur.hemi * ext.hemi * api.ambientScale;
    fill.color.setRGB(cur.fillColor[0], cur.fillColor[1], cur.fillColor[2]); fill.intensity = cur.fill * ext.hemi * api.ambientScale;
    scene.environmentIntensity = api.envIntensity;
    // 안개(셰이더가 읽는 배열)
    fd[0] = cur.haze[0]; fd[1] = cur.haze[1]; fd[2] = cur.haze[2]; fd[3] = 1;
    fd[4] = cur.hazeSun[0]; fd[5] = cur.hazeSun[1]; fd[6] = cur.hazeSun[2]; fd[7] = cur.fogDist * ext.fog * api.fogScale;
    fd[8] = cur.fogH * api.fogScale; fd[9] = cur.fogFall; fd[10] = cur.fogBase; fd[11] = api.time;
    const sl = Math.hypot(sunDir.x, sunDir.z) || 1; fd[12] = sunDir.x / sl; fd[13] = sunDir.z / sl; fd[14] = q.fogNoise ? cur.fogNoise : 0; fd[15] = cur.fogMax;
    fd[16] = cur.fogScale; fd[17] = cur.fogStart; fd[18] = cur.goboSoft; fd[19] = api.shadowTaps || q.taps;
    // 햇빛 얼룩(그림자 셰이더가 읽는다)
    goboOff += lastDt * cur.goboDrift;
    fd[20] = sh.cx; fd[21] = sh.cy; fd[22] = sh.size; fd[23] = q.fogNoise ? cur.gobo * api.goboScale : 0;
    fd[24] = cur.goboScale; fd[25] = goboOff * wind.uWindDir.value.x; fd[26] = goboOff * wind.uWindDir.value.y; fd[27] = cur.goboCover;
    scene.fog.color.setRGB(cur.haze[0], cur.haze[1], cur.haze[2]); scene.fog.near = cur.fogStart + 10; scene.fog.far = 1.9 / Math.max(fd[7], 1e-4) + cur.fogStart;
    scene.background.setRGB(cur.haze[0], cur.haze[1], cur.haze[2]);
    sky.apply(cur, api.time);
    // 색 보정
    const F = post.final;
    F.uExposure.value = cur.exposure * api.exposure;
    F.uTint.value.set(cur.tint[0] * ext.tint[0], cur.tint[1] * ext.tint[1], cur.tint[2] * ext.tint[2]);
    F.uSat.value = cur.sat * api.saturation; F.uVig.value = cur.vig;
    F.uShadowTint.value.set(cur.shadowTint[0], cur.shadowTint[1], cur.shadowTint[2]); F.uHighTint.value.set(cur.highTint[0], cur.highTint[1], cur.highTint[2]);
  }

  // ---- 그림자: 카메라가 실제로 보는 범위(지면에 닿는 사다리꼴 + 그 위 물체)에 꼭 맞춘 정사각 직교 상자. 텍셀 단위로 끊어 움직여 떨림을 없앤다
  const cv = new THREE.Vector3(), pv = new THREE.Vector3();
  const CORNERS = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  const sh = { size: 0, texel: 0, near: 0.5, far: 100, cx: 0, cy: 0 };
  let goboOff = 0;
  function fitShadow() {
    if (!sun.castShadow) return;
    const S = sun.shadow, cp = camera.position;
    const maxD = Math.min(SHADOW.maxDist, cp.distanceTo(cam.look) * 2.2 + 12);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    const add = (t) => { pv.copy(cp).addScaledVector(cv, t); const x = pv.dot(lRight), y = pv.dot(lUp), z = pv.dot(sunDir); if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; if (z < z0) z0 = z; if (z > z1) z1 = z; };
    for (const [nx, ny] of CORNERS) {
      cv.set(nx, ny, 0.5).unproject(camera).sub(cp).normalize();
      let tFar = maxD; if (cv.y < -1e-4) tFar = Math.min(tFar, (cp.y + 0.3) / -cv.y);          // 지면(y=-0.3)에 닿는 곳까지
      let tNear = 1.5; if (cv.y < -1e-4 && cp.y > SHADOW.recvH) tNear = Math.min(tFar, (cp.y - SHADOW.recvH) / -cv.y);   // 그림자를 받는 물체의 높이 한계
      add(tFar); add(tNear);
    }
    const mapSize = S.mapSize.x;
    let need = Math.max(x1 - x0, y1 - y0) + SHADOW.soft * 4 + 1.0;
    need = Math.min(SHADOW.maxSize, Math.max(SHADOW.minSize, Math.ceil(need / SHADOW.step) * SHADOW.step));
    if (need > sh.size || need < sh.size - SHADOW.step * 1.5) sh.size = need;      // 조금씩 흔들리는 크기 변화는 무시(크기가 바뀌면 그림자가 한 번 일렁인다)
    const size = sh.size, texel = size / mapSize; sh.texel = texel;
    const cx = Math.round((x0 + x1) * 0.5 / texel) * texel, cy = Math.round((y0 + y1) * 0.5 / texel) * texel;
    sh.cx = cx; sh.cy = cy;
    const zTop = z1 + SHADOW.castH / sunDir.y + 1, zBot = z0 - 3;      // 화면 밖 높은 물체(성탑·나무)도 그림자를 드리우게 해 쪽으로 넉넉히
    sun.position.set(0, 0, 0).addScaledVector(lRight, cx).addScaledVector(lUp, cy).addScaledVector(sunDir, zTop);
    sun.target.position.copy(sun.position).addScaledVector(sunDir, -10);
    const c = S.camera, half = size * 0.5, far = zTop - zBot;
    if (c.right !== half || Math.abs(c.far - far) > 0.01) { c.left = -half; c.right = half; c.top = half; c.bottom = -half; c.near = 0.5; c.far = far; c.updateProjectionMatrix(); }
    sh.far = far;
    S.radius = Math.min(14, Math.max(1.2, SHADOW.soft / texel));      // 반그림자 폭을 텍셀이 아니라 미터로 유지
    S.normalBias = texel * 1.5 + 0.006; S.bias = -0.010 / far;
  }

  // ---- 품질
  let sig = -1;
  const qsig = () => (bloom.enabled ? 1 : 0) | (sun.castShadow ? 2 : 0) | (sun.shadow.mapSize.x >= 2048 ? 4 : 0);
  function applyQuality(name) {
    const q = QUALITY[name]; if (!q) return;
    api.quality = name;
    post.setSamples(q.msaa); post.cfg.ao = q.ao > 0; if (q.ao > 0) post.setAoSamples(q.ao);
    post.cfg.autoExposure = q.auto;
    bloom.enabled = q.bloom;
    sun.castShadow = q.shadow > 0;
    const size = q.shadow || 1024;
    if (sun.shadow.mapSize.x !== size) { sun.shadow.mapSize.set(size, size); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
    sh.size = 0;
    sig = qsig();
  }

  // ---- 카메라 리그
  const cam = {
    yaw: Math.PI * 0.25, pitch: 0.76, dist: 14, target: new THREE.Vector3(), follow: null, lookH: 1.2,
    shakeAmp: 0, shakeT: 0, cine: null, zoomTarget: 14,
    pos: new THREE.Vector3(), look: new THREE.Vector3(),
  };
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
  function desired(out, outLook) {
    const t = cam.target;
    const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
    out.set(t.x + Math.sin(cam.yaw) * cp * cam.dist, t.y + cam.lookH + sp * cam.dist, t.z + Math.cos(cam.yaw) * cp * cam.dist);
    outLook.set(t.x, t.y + cam.lookH, t.z);
  }
  function ease(u) { return u * u * (3 - 2 * u); }
  const wind = { uWindTime: { value: 0 }, uWindDir: { value: new THREE.Vector2(0.86, 0.5) }, uWindStrength: { value: 1 } };
  let lastDt = 0.016;
  const api = {
    renderer, scene, camera, bloom, grade, sun, hemi, fill, cam, W, H, time: 0,
    composer: { render() { api.render(); } },   // 예전 코드 호환용
    // ── 새로 내보내는 것(world·캐릭터 담당용). 자세한 설명은 _work/v4/NOTES_render.md
    post, sky, sunDir, mood, quality: '높음', MOODS, SHADOW,
    fogUniforms: { erhFog: fog.uniform },            // 직접 만든 ShaderMaterial 에 넣으면(<fog_*> 청크 + fog:true) 같은 안개가 걸린다
    windUniforms: wind, windTime: 0,                 // 풀·깃발 흔들림용 공용 시간(돌풍에 따라 빨라졌다 느려진다)
    envIntensity: 1.0, exposure: 1.0, sunScale: 1.0, ambientScale: 1.0, fogScale: 1.0, saturation: 1.0, goboScale: 1.0, shadowTaps: 0,   // shadowTaps: 0 이면 품질 단계 값, 4~12 를 주면 그 값   // 전체 배율 손잡이
    get envMap() { return sky.envTexture; },
    shadowInfo: sh,
    setFollow(o) { cam.follow = o; },
    snapCamera() { if (cam.follow) cam.target.copy(cam.follow); desired(cam.pos, cam.look); },
    shake(amp, dur = 0.25) { cam.shakeAmp = Math.max(cam.shakeAmp, amp); cam.shakeT = Math.max(cam.shakeT, dur); },
    flash(color = 0xffffff, amount = 0.5) { const c = new THREE.Color(color); post.final.uFlashCol.value.set(c.r, c.g, c.b); post.final.uFlash.value = amount; },
    /** 연출 카메라: from(현재) → {pos, look, fov} 로 dur 초 동안. hold=true 면 끝난 뒤에도 유지 */
    cineTo(pos, look, dur = 2, { fov = 30, hold = true } = {}) {
      cam.cine = { p0: camera.position.clone(), l0: cam.look.clone(), f0: camera.fov, p1: pos.clone(), l1: look.clone(), f1: fov, t: 0, dur: Math.max(dur, 0.001), hold };
    },
    cineOff(blend = 1.2) { if (cam.cine) { cam.cine = { ...cam.cine, release: blend, rt: 0, p0: camera.position.clone(), l0: cam.look.clone(), f0: camera.fov }; } },
    /**
     * 구역 분위기. 예전과 같은 값({ sky, fogNear, fogFar, sun, hemi, tint, sunColor })을 받아 k 만큼 그쪽으로 다가간다.
     * sky 색으로 어느 분위기(town·forest·grave·altar·wild)인지 고르고, 나머지 수치는 예전 표 대비 비율로만 반영한다.
     * { id: 'grave' } 처럼 이름으로 바로 고를 수도 있다.
     */
    setMood({ id, sky: skyHex, fogFar, sun: sunI, hemi: hemiI, tint, sunColor } = {}, k = 1) {
      if (id !== undefined && MOOD_IDS.includes(id)) target = MOOD_IDS.indexOf(id);
      else if (skyHex !== undefined) { tc.set(skyHex); let bd = Infinity; legacyCol.forEach((c, i) => { const d = (c.r - tc.r) ** 2 + (c.g - tc.g) ** 2 + (c.b - tc.b) ** 2; if (d < bd) { bd = d; target = i; } }); }
      const L = MOODS[MOOD_IDS[target]].legacy, cl = (v, a, b) => Math.min(b, Math.max(a, v));
      for (let i = 0; i < 5; i++) weights[i] += ((i === target ? 1 : 0) - weights[i]) * k;
      ext.sun += ((sunI !== undefined ? cl(sunI / L.sun, 0.25, 2) : 1) - ext.sun) * k;
      ext.hemi += ((hemiI !== undefined ? cl(hemiI / L.hemi, 0.25, 2) : 1) - ext.hemi) * k;
      ext.fog += ((fogFar !== undefined ? cl(L.far / fogFar, 0.3, 3) : 1) - ext.fog) * k;
      for (let i = 0; i < 3; i++) ext.tint[i] += ((tint ? cl(tint[i] / L.tint[i], 0.6, 1.5) : 1) - ext.tint[i]) * k;
      if (sunColor !== undefined) { tc.set(sunColor); const r = [tc.r / LEGACY_SUN.r, tc.g / LEGACY_SUN.g, tc.b / LEGACY_SUN.b]; for (let i = 0; i < 3; i++) ext.sunColor[i] += (cl(r[i], 0.2, 2) - ext.sunColor[i]) * k; }
      else for (let i = 0; i < 3; i++) ext.sunColor[i] += (1 - ext.sunColor[i]) * k;
      mood.dirty = true;
    },
    /** 분위기가 바뀔 때마다(섞이는 동안 매 프레임) fn(mood) 를 부른다. mood = { id, weights{...}, night(0~1), values(섞인 수치) } */
    onMood(fn) { moodFns.push(fn); try { fn(mood); } catch (e) { console.warn('[engine] onMood', e); } return () => { const i = moodFns.indexOf(fn); if (i >= 0) moodFns.splice(i, 1); }; },
    /** 그래픽 품질: '높음' | '보통' | '낮음' */
    setQuality(name) { if (QUALITY[name]) applyQuality(name); },
    project(v, out) { tmp.copy(v).project(camera); out.x = (tmp.x * 0.5 + 0.5) * W; out.y = (-tmp.y * 0.5 + 0.5) * H; out.z = tmp.z; return out; },
    update(dt) {
      api.time += dt; lastDt = dt;
      const gust = 0.8 + 0.22 * Math.sin(api.time * 0.31) + 0.14 * Math.sin(api.time * 0.73 + 1.3);
      api.windTime += dt * gust; wind.uWindTime.value = api.windTime; wind.uWindStrength.value = gust;
      if (cam.follow) cam.target.lerp(cam.follow, 1 - Math.exp(-dt * 7));
      cam.dist += (cam.zoomTarget - cam.dist) * (1 - Math.exp(-dt * 5));
      desired(tmp, tmp2);
      let fov = 30;
      const c = cam.cine;
      if (c && c.release === undefined) {
        c.t += dt; const u = ease(Math.min(1, c.t / c.dur));
        cam.pos.lerpVectors(c.p0, c.p1, u); cam.look.lerpVectors(c.l0, c.l1, u); fov = c.f0 + (c.f1 - c.f0) * u;
        if (c.t >= c.dur && !c.hold) cam.cine = null;
      } else if (c) {
        c.rt += dt; const u = ease(Math.min(1, c.rt / c.release));
        cam.pos.lerpVectors(c.p0, tmp, u); cam.look.lerpVectors(c.l0, tmp2, u); fov = c.f0 + (30 - c.f0) * u;
        if (c.rt >= c.release) cam.cine = null;
      } else { cam.pos.copy(tmp); cam.look.copy(tmp2); }
      camera.position.copy(cam.pos);
      if (cam.shakeT > 0) {
        cam.shakeT -= dt; const a = cam.shakeAmp * Math.min(1, cam.shakeT * 6);
        camera.position.x += (Math.random() - 0.5) * a; camera.position.y += (Math.random() - 0.5) * a; camera.position.z += (Math.random() - 0.5) * a;
        if (cam.shakeT <= 0) cam.shakeAmp = 0;
      }
      if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }
      camera.lookAt(cam.look);
      camera.updateMatrixWorld();
      // 설정 창이 예전 방식(bloom.enabled·sun.castShadow·그림자 크기를 직접 만짐)으로 품질을 바꾸면 무거운 패스도 함께 맞춘다
      if (qsig() !== sig) applyQuality(!bloom.enabled || !sun.castShadow ? '낮음' : sun.shadow.mapSize.x < 2048 ? '보통' : '높음');
      fitShadow();
      applyMood();
      if (mood.dirty) {
        mood.dirty = false; sky.blend(weights);
        let diff = 0; for (let i = 0; i < 5; i++) diff += Math.abs(weights[i] - toldW[i]);
        if (diff > 0.004) { for (let i = 0; i < 5; i++) toldW[i] = weights[i]; for (const fn of moodFns) { try { fn(mood); } catch (e) { console.warn('[engine] onMood', e); } } }
      }
      const f = post.final.uFlash; if (f.value > 0) f.value = Math.max(0, f.value - dt * 3.2);
    },
    render() {
      const q = QUALITY[api.quality], F = post.final;
      post.cfg.bloom = bloom.enabled;
      post.bloomPre.uExposure.value = F.uExposure.value; post.bloomPre.uThreshold.value = bloom.threshold; post.bloomPre.uKnee.value = bloom.knee; post.bloomPre.uClamp.value = bloom.clamp; post.bloomUp.uSpread.value = bloom.radius;
      F.uBloom.value = bloom.strength / 6; F.uBloomCap.value = bloom.cap;
      F.uTime.value = api.time; F.uGrain.value = api.grain * q.grain; F.uSharp.value = api.sharpen * q.sharp;
      post.render(scene, camera, lastDt);
    },
    grain: 0.016, sharpen: 0.55,
  };
  applyQuality('높음');
  applyMood();
  return api;
}
