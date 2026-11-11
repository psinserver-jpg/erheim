// 캐릭터: 리깅된 GLB 를 복제해 동작을 재생한다. (모델은 +Z 가 앞)
import * as THREE from 'three';
import { clone as skClone } from 'three/addons/utils/SkeletonUtils.js';
import { Assets } from '../core/assets.js';

const metaCache = {};
export async function loadCharModel(tag, { lod = false } = {}) {
  const key = 'models/' + tag + (lod && Assets.has('models/' + tag + '_lod.glb') ? '_lod' : '') + '.glb';
  const gltf = await Assets.gltf(key);
  const anim = await Assets.gltf('models/' + tag + '.glb');        // 동작은 본 모델 것을 쓴다(뼈 이름 동일)
  if (!metaCache[tag]) metaCache[tag] = Assets.has('models/' + tag + '_meta.json') ? await Assets.json('models/' + tag + '_meta.json') : { clips: {} };
  return { gltf, clips: anim.animations, meta: metaCache[tag], tag };
}

export class Character {
  constructor(model, { scale = 1, tint = null, castShadow = true } = {}) {
    this.tag = model.tag; this.meta = model.meta;
    this.root = new THREE.Group();
    this.model = skClone(model.gltf.scene);
    this.model.scale.setScalar(scale);
    this.root.add(this.model);
    this.mats = [];
    this.model.traverse(o => {
      if (o.isMesh || o.isSkinnedMesh) {
        o.castShadow = castShadow; o.receiveShadow = false; o.frustumCulled = false;
        if (tint || true) { o.material = o.material.clone(); this.mats.push(o.material); }
        o.material.envMapIntensity = 0.9;
        if (tint && o.isSkinnedMesh) o.material.color.multiply(new THREE.Color(tint));
      }
      if (o.name === 'Weapon') this.weapon = o;
      if (o.name === 'Shield') this.shield = o;
    });
    this.mixer = new THREE.AnimationMixer(this.model);
    this.actions = {};
    for (const c of model.clips) this.actions[c.name] = this.mixer.clipAction(c);
    this.current = null; this.currentName = '';
    this.scale = scale;
  }
  has(name) { return !!this.actions[name]; }
  dur(name) { const a = this.actions[name]; return a ? a.getClip().duration : 0.5; }
  event(name, ev) { const c = this.meta.clips && this.meta.clips[name]; return c && c.events && c.events[ev] !== undefined ? c.events[ev] : null; }
  /** 동작 재생. loop=false 면 끝 자세로 멈춘다. */
  play(name, { loop = true, fade = 0.14, speed = 1, restart = false } = {}) {
    const a = this.actions[name];
    if (!a) return 0;
    if (this.currentName === name && !restart) { a.timeScale = speed; return a.getClip().duration / speed; }
    a.reset(); a.enabled = true; a.timeScale = speed; a.setEffectiveWeight(1);
    a.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1); a.clampWhenFinished = !loop;
    if (this.current && this.current !== a) { a.crossFadeFrom(this.current, fade, false); }
    a.play();
    this.current = a; this.currentName = name;
    return a.getClip().duration / speed;
  }
  update(dt) { this.mixer.update(dt); }
  setOpacity(o) { for (const m of this.mats) { m.transparent = o < 1; m.opacity = o; m.depthWrite = o > 0.5; } }
  flash(k) { for (const m of this.mats) { if (m.emissive) { m.emissive.setRGB(k, k * 0.9, k * 0.8); if (!m.emissiveMap) m.emissiveIntensity = 1; } } }
  dispose() { this.mixer.stopAllAction(); this.root.removeFromParent(); for (const m of this.mats) m.dispose(); }
}
