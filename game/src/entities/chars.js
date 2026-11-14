// 캐릭터: 리깅된 GLB 를 복제해 동작을 재생한다. (모델은 +Z 가 앞)
// 재질 손질(보강 텍스처·테두리광·색조·접지 그림자·화면 밖 가려내기)은 charlook.js 에 있다.
import * as THREE from 'three';
import { clone as skClone } from 'three/addons/utils/SkeletonUtils.js';
import { Assets } from '../core/assets.js';
import { LOOK, loadLook, dressMaterial, CharLook, CharFrame, register, unregister } from './charlook.js';

export { LOOK as CHAR_LOOK };

const metaCache = {};
export async function loadCharModel(tag, { lod = false } = {}) {
  const isLod = lod && Assets.has('models/' + tag + '_lod.glb');
  const key = 'models/' + tag + (isLod ? '_lod' : '') + '.glb';
  const gltf = await Assets.gltf(key);
  const anim = await Assets.gltf('models/' + tag + '.glb');        // 동작은 본 모델 것을 쓴다(뼈 이름 동일)
  if (!metaCache[tag]) metaCache[tag] = Assets.has('models/' + tag + '_meta.json') ? await Assets.json('models/' + tag + '_meta.json') : { clips: {} };
  let look = null; try { look = await loadLook(tag); } catch (e) { console.warn('[chars] 보강 텍스처 없음', tag, e); }
  return { gltf, clips: anim.animations, meta: metaCache[tag], tag, look, lod: isLod };
}

export class Character {
  constructor(model, { scale = 1, tint = null, castShadow = true } = {}) {
    this.tag = model.tag; this.meta = model.meta;
    this.root = new THREE.Group();
    this.model = skClone(model.gltf.scene);
    this.model.scale.setScalar(scale);
    this.root.add(this.model);
    this.mats = [];
    this.look = new CharLook();
    this.opacity = 1; this.height = ((model.meta && model.meta.height) || 1.8) * scale; this.skipped = 0;
    this.model.traverse(o => {
      if (o.isMesh || o.isSkinnedMesh) {
        o.castShadow = castShadow; o.receiveShadow = LOOK.receiveShadow; o.frustumCulled = false; o.renderOrder = 1;      // 접지 그림자(0.5)보다 뒤에 그린다
        o.material = o.material.clone(); this.mats.push(o.material);
        this.look.add(dressMaterial(o.material, { kind: o.isSkinnedMesh ? 'body' : 'gear', tag: model.tag, look: model.look, lod: model.lod, mesh: o }));
        if (tint && o.isSkinnedMesh) o.material.color.multiply(new THREE.Color(tint));      // 색조는 셰이더가 재질에 맞게 입힌다(살갗·머리카락 제외)
      }
      if (o.name === 'Weapon') this.weapon = o;
      if (o.name === 'Shield') this.shield = o;
    });
    this.mixer = new THREE.AnimationMixer(this.model);
    this.actions = {};
    for (const c of model.clips) this.actions[c.name] = this.mixer.clipAction(c);
    this.current = null; this.currentName = '';
    this.scale = scale;
    register(this);
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
  update(dt) {
    CharFrame.sync();
    // 화면 밖이면 그리지도, 뼈를 움직이지도 않는다. 다시 보일 때 밀린 시간을 한꺼번에 준다(끝 자세로 멈추는 동작이 제자리에 오게)
    const vis = CharFrame.inView(this);
    if (vis !== this.model.visible) this.model.visible = vis;
    if (!vis) { this.skipped = Math.min(6, this.skipped + dt); return; }
    this.mixer.update(dt + this.skipped); this.skipped = 0;
  }
  setOpacity(o) { this.opacity = o; for (const m of this.mats) { m.transparent = o < 1; m.opacity = o; m.depthWrite = o > 0.5; } }
  /** 피격 번쩍임(0 이면 끔). 재질의 발광색은 건드리지 않는다(검의 룬·보석 빛이 꺼지지 않게) */
  flash(k) { this.look.flash(k); }
  /** 이 인스턴스만의 자원을 해제한다: 복제한 재질과 뼈 텍스처(스켈레톤). 형상·그림은 모델과 함께 쓰므로 건드리지 않는다 */
  dispose() {
    unregister(this);
    this.mixer.stopAllAction(); try { this.mixer.uncacheRoot(this.model); } catch (e) { }
    this.root.removeFromParent(); for (const m of this.mats) m.dispose();
    this.model.traverse(o => { if (o.isSkinnedMesh && o.skeleton) o.skeleton.dispose(); });
  }
}
