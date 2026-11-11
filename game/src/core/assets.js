// 에셋 로더: base64 로 묶인 JS(dist/assets/*.js)를 <script> 로 불러와 해석한다. fetch 를 쓰지 않으므로 file:// 에서도 동작한다.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const index = () => window.__ASSET_INDEX__ || {};
const cache = new Map();
const pending = new Map();
const gltfLoader = new GLTFLoader();

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src; s.async = true;
    s.onload = () => { s.remove(); resolve(); };
    s.onerror = () => reject(new Error('에셋 스크립트 로드 실패: ' + src));
    document.head.appendChild(s);
  });
}

function b64ToBytes(b64) {
  if (Uint8Array.fromBase64) return Uint8Array.fromBase64(b64);
  const bin = atob(b64); const n = bin.length; const out = new Uint8Array(n);
  for (let i = 0; i < n; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export const Assets = {
  has(key) { return !!index()[key]; },
  keys(prefix = '') { return Object.keys(index()).filter(k => k.startsWith(prefix)); },
  info(key) { return index()[key]; },

  /** 원시 바이트(Uint8Array) */
  async bytes(key) {
    const info = index()[key];
    if (!info) throw new Error('에셋 없음: ' + key);
    if (!(window.__A && window.__A[key])) {
      if (!pending.has(key)) pending.set(key, loadScript(info.src));
      await pending.get(key);
    }
    const b64 = window.__A[key];
    const bytes = b64ToBytes(b64);
    delete window.__A[key];           // 큰 문자열은 바로 버린다
    pending.delete(key);
    return bytes;
  },

  async _once(key, kind, make) {
    const ck = kind + ':' + key;
    if (!cache.has(ck)) cache.set(ck, make());
    return cache.get(ck);
  },

  /** GLTF({scene, animations}) — 한 번만 해석하고 캐시한다. 복제는 SkeletonUtils.clone 으로. */
  gltf(key) {
    return this._once(key, 'gltf', async () => {
      const bytes = await this.bytes(key);
      return await gltfLoader.parseAsync(bytes.buffer, '');
    });
  },

  blobUrl(key) {
    return this._once(key, 'blob', async () => {
      const bytes = await this.bytes(key);
      return URL.createObjectURL(new Blob([bytes], { type: index()[key].mime }));
    });
  },

  /** HTMLImageElement */
  image(key) {
    return this._once(key, 'img', async () => {
      const url = await this.blobUrl(key);
      const img = new Image();
      img.src = url;
      await img.decode();
      return img;
    });
  },

  /** THREE.Texture (sRGB 색 텍스처 기본) */
  texture(key, { srgb = true, repeat = false, anisotropy = 8 } = {}) {
    return this._once(key, 'tex' + (srgb ? 's' : 'l') + (repeat ? 'r' : ''), async () => {
      const img = await this.image(key);
      const t = new THREE.Texture(img);
      t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
      t.anisotropy = anisotropy;
      t.needsUpdate = true;
      return t;
    });
  },

  /** AudioBuffer */
  audio(key, ctx) {
    return this._once(key, 'audio', async () => {
      const bytes = await this.bytes(key);
      return await ctx.decodeAudioData(bytes.buffer.slice(0));
    });
  },

  async json(key) {
    return this._once(key, 'json', async () => JSON.parse(new TextDecoder().decode(await this.bytes(key))));
  },

  /** 여러 에셋을 미리 받는다. onProgress(받은 바이트, 전체 바이트, 키) */
  async preload(keys, onProgress, concurrency = 4) {
    const idx = index();
    const list = keys.filter(k => idx[k]);
    const total = list.reduce((s, k) => s + idx[k].bytes, 0) || 1;
    let done = 0;
    const queue = list.slice();
    const kindOf = (k) => (k.endsWith('.glb') ? 'gltf' : /\.(png|jpg|jpeg|webp)$/.test(k) ? 'image' : null);
    const worker = async () => {
      while (queue.length) {
        const k = queue.shift();
        try {
          const kind = kindOf(k);
          if (kind === 'gltf') await this.gltf(k); else if (kind === 'image') await this.image(k); else await this.blobUrl(k);
        } catch (e) { console.error('[assets] 로드 실패', k, e); }
        done += idx[k].bytes;
        if (onProgress) onProgress(done, total, k);
      }
    };
    await Promise.all(Array.from({ length: concurrency }, worker));
  },
};
