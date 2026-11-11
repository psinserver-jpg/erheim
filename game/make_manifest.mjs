// assets/ 아래 게임용 파일을 훑어 game/assets.json(패킹 목록)을 만든다.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = [];
const add = (dir, prefix, filter) => { const d = path.join(ROOT, dir); if (!fs.existsSync(d)) return; for (const f of fs.readdirSync(d).sort()) { if (filter(f)) out.push({ key: prefix + f, file: dir + '/' + f }); } };
add('assets/models', 'models/', f => f.endsWith('.glb'));
add('assets/models/env', 'env/', f => f.endsWith('.glb'));
add('assets/tex', 'tex/', f => /\.(jpg|png|webp)$/.test(f));
add('assets/ui', 'ui/', f => /\.(jpg|png|webp)$/.test(f));
add('assets/audio', 'audio/', f => /\.(mp3|ogg|m4a)$/.test(f));
if (fs.existsSync(path.join(ROOT, 'assets/audio/manifest.json'))) out.push({ key: 'audio/manifest.json', file: 'assets/audio/manifest.json' });
for (const f of fs.existsSync(path.join(ROOT, 'assets/models')) ? fs.readdirSync(path.join(ROOT, 'assets/models')) : []) if (f.endsWith('_meta.json')) out.push({ key: 'models/' + f, file: 'assets/models/' + f });
fs.writeFileSync(path.join(ROOT, 'game', 'assets.json'), JSON.stringify(out, null, 1));
console.log('[manifest]', out.length, 'assets');
