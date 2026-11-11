// 렌더 엔진: 렌더러·조명·그림자·환경맵·후처리(블룸·색보정)·쿼터뷰 카메라(따라가기/연출/흔들림)
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const GradeShader = {
  uniforms: { tDiffuse: { value: null }, uVig: { value: 0.42 }, uSat: { value: 1.12 }, uTint: { value: new THREE.Vector3(1, 1, 1) }, uFlash: { value: 0 }, uFlashCol: { value: new THREE.Vector3(1, 1, 1) } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uVig,uSat,uFlash; uniform vec3 uTint,uFlashCol; varying vec2 vUv;
    void main(){ vec4 c=texture2D(tDiffuse,vUv); float l=dot(c.rgb,vec3(.299,.587,.114)); c.rgb=mix(vec3(l),c.rgb,uSat)*uTint;
      c.rgb=mix(c.rgb, c.rgb*c.rgb*(3.0-2.0*c.rgb), 0.25);
      vec2 d=vUv-.5; float v=smoothstep(.85,.25,length(d*vec2(1.,.9))); c.rgb*=mix(1.0-uVig,1.0,v);
      c.rgb=mix(c.rgb,uFlashCol,uFlash); gl_FragColor=c; }`,
};

export function createEngine(container) {
  const W = 1920, H = 1080;
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1); renderer.setSize(W, H);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.82;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9cc0e0);
  scene.fog = new THREE.Fog(0x9cc0e0, 55, 160);
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;

  const hemi = new THREE.HemisphereLight(0xcfe2ff, 0x4a4030, 0.9); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff1d6, 3.1);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera; sc.left = -26; sc.right = 26; sc.top = 26; sc.bottom = -26; sc.near = 1; sc.far = 160;
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
  scene.add(sun); scene.add(sun.target);
  const sunDir = new THREE.Vector3(-0.55, 1.0, 0.35).normalize();

  const camera = new THREE.PerspectiveCamera(30, W / H, 0.5, 600);
  const rt = new THREE.WebGLRenderTarget(W, H, { samples: 4, type: THREE.HalfFloatType });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.3, 0.5, 1.0);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const grade = new ShaderPass(GradeShader); composer.addPass(grade);

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
  const api = {
    renderer, scene, camera, composer, bloom, grade, sun, hemi, cam, W, H, time: 0,
    setFollow(o) { cam.follow = o; },
    snapCamera() { if (cam.follow) cam.target.copy(cam.follow); desired(cam.pos, cam.look); },
    shake(amp, dur = 0.25) { cam.shakeAmp = Math.max(cam.shakeAmp, amp); cam.shakeT = Math.max(cam.shakeT, dur); },
    flash(color = 0xffffff, amount = 0.5) { const c = new THREE.Color(color); grade.uniforms.uFlashCol.value.set(c.r, c.g, c.b); grade.uniforms.uFlash.value = amount; },
    /** 연출 카메라: from(현재) → {pos, look, fov} 로 dur 초 동안. hold=true 면 끝난 뒤에도 유지 */
    cineTo(pos, look, dur = 2, { fov = 30, hold = true } = {}) {
      cam.cine = { p0: camera.position.clone(), l0: cam.look.clone(), f0: camera.fov, p1: pos.clone(), l1: look.clone(), f1: fov, t: 0, dur: Math.max(dur, 0.001), hold };
    },
    cineOff(blend = 1.2) { if (cam.cine) { cam.cine = { ...cam.cine, release: blend, rt: 0, p0: camera.position.clone(), l0: cam.look.clone(), f0: camera.fov }; } },
    setMood({ sky, fogNear, fogFar, sun: sunI, hemi: hemiI, tint, sunColor } = {}, k = 1) {
      if (sky !== undefined) { const c = new THREE.Color(sky); scene.background.lerp(c, k); scene.fog.color.lerp(c, k); }
      if (fogNear !== undefined) scene.fog.near += (fogNear - scene.fog.near) * k;
      if (fogFar !== undefined) scene.fog.far += (fogFar - scene.fog.far) * k;
      if (sunI !== undefined) sun.intensity += (sunI - sun.intensity) * k;
      if (hemiI !== undefined) hemi.intensity += (hemiI - hemi.intensity) * k;
      if (sunColor !== undefined) sun.color.lerp(new THREE.Color(sunColor), k);
      if (tint) grade.uniforms.uTint.value.lerp(new THREE.Vector3(...tint), k);
    },
    project(v, out) { tmp.copy(v).project(camera); out.x = (tmp.x * 0.5 + 0.5) * W; out.y = (-tmp.y * 0.5 + 0.5) * H; out.z = tmp.z; return out; },
    update(dt) {
      api.time += dt;
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
      sun.target.position.copy(cam.look);
      sun.position.copy(cam.look).addScaledVector(sunDir, 70);
      const f = grade.uniforms.uFlash; if (f.value > 0) f.value = Math.max(0, f.value - dt * 3.2);
    },
    render() { composer.render(); },
  };
  return api;
}
