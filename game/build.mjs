// src/main.js 를 하나의 스크립트(dist/game.js)로 묶는다. (file:// 에서도 동작하도록 ES 모듈이 아닌 IIFE)
import esbuild from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const entries = process.argv.slice(2).filter(a => !a.startsWith('--'));
const minify = process.argv.includes('--minify');
const targets = entries.length ? entries : ['src/main.js:../dist/game.js'];
for (const t of targets) {
  const [src, out] = t.split(':');
  const r = await esbuild.build({ entryPoints: [path.join(here, src)], outfile: path.join(here, out), bundle: true, format: 'iife',
    target: ['chrome110', 'safari16'], minify, sourcemap: false, logLevel: 'warning', loader: { '.glsl': 'text', '.css': 'text' },
    define: { 'process.env.NODE_ENV': '"production"' } });
  console.log(`[build] ${src} -> ${out}` + (r.errors.length ? ' (errors)' : ''));
}
