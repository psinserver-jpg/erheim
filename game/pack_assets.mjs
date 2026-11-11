// 에셋을 base64 로 감싼 JS 파일로 묶는다 → index.html 을 더블클릭(file://)으로 열어도 fetch 없이 로드된다.
// 입력: game/assets.json  [{ "key": "models/hero.glb", "file": "assets/models/hero.glb" }, ...]
// 출력: dist/assets/<키>.js  +  dist/assets_index.js (window.__ASSET_INDEX__)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const list = JSON.parse(fs.readFileSync(path.join(ROOT, 'game', 'assets.json'), 'utf8'));
const outDir = path.join(ROOT, 'dist', 'assets');
fs.mkdirSync(outDir, { recursive: true });
const MIME = { '.glb': 'model/gltf-binary', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.m4a': 'audio/mp4', '.json': 'application/json', '.woff2': 'font/woff2' };
const index = {};
let total = 0, changed = 0;
const only = process.argv.slice(2);
for (const it of list) {
  const src = path.join(ROOT, it.file);
  if (!fs.existsSync(src)) { console.warn('[pack] 없음(건너뜀):', it.file); continue; }
  const st = fs.statSync(src);
  const safe = it.key.replace(/[^a-zA-Z0-9_.-]/g, '_') + '.js';
  const out = path.join(outDir, safe);
  const ext = path.extname(src).toLowerCase();
  index[it.key] = { src: 'dist/assets/' + safe, mime: MIME[ext] || 'application/octet-stream', bytes: st.size, group: it.group || 'main' };
  total += st.size;
  const fresh = fs.existsSync(out) && fs.statSync(out).mtimeMs >= st.mtimeMs;
  if (fresh && !only.includes('--force')) continue;
  const b64 = fs.readFileSync(src).toString('base64');
  fs.writeFileSync(out, `(window.__A=window.__A||{})[${JSON.stringify(it.key)}]="${b64}";`);
  changed++;
}
fs.writeFileSync(path.join(ROOT, 'dist', 'assets_index.js'), 'window.__ASSET_INDEX__=' + JSON.stringify(index) + ';');
console.log(`[pack] ${Object.keys(index).length} assets, ${(total / 1e6).toFixed(1)} MB raw, ${changed} repacked`);
