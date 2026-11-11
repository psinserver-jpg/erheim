// 헤드리스 크롬으로 페이지를 열어 1920x1080 스크린샷을 찍는다.
// 사용법: node tools/shot.mjs <페이지(파일 경로 또는 URL, ?쿼리 가능)> <출력.png> [--wait=ms] [--ready=전역변수] [--eval="js"] [--w=1920 --h=1080] [--shots=n --every=ms]
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
import { createRequire } from 'node:module';
const require_ = createRequire(path.join(ROOT, 'game', 'package.json'));
process.env.PUPPETEER_CACHE_DIR = process.env.PUPPETEER_CACHE_DIR || path.join(ROOT, '_work', 'puppeteer_cache');
const puppeteer = require_('puppeteer');
const args = process.argv.slice(2);
const opt = Object.fromEntries(args.filter(a => a.startsWith('--')).map(a => { const [k, ...v] = a.slice(2).split('='); return [k, v.length ? v.join('=') : true]; }));
const pos = args.filter(a => !a.startsWith('--'));
let page_ = pos[0], out = pos[1];
let url = page_;
if (!/^https?:|^file:/.test(page_)) {
  const [p, q] = page_.split('?');
  url = pathToFileURL(path.resolve(ROOT, p)).href + (q ? '?' + q : '');
}
const W = +(opt.w || 1920), H = +(opt.h || 1080);
const browser = await puppeteer.launch({ headless: 'new', userDataDir: path.join(ROOT, '_work', 'chrome_profile_' + process.pid),
  args: ['--no-first-run', '--no-default-browser-check', '--enable-webgl', '--ignore-gpu-blocklist', '--use-angle=metal', '--enable-gpu-rasterization',
    '--autoplay-policy=no-user-gesture-required', '--allow-file-access-from-files', '--mute-audio', `--window-size=${W},${H}`, '--hide-scrollbars'] });
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
const logs = [];
page.on('console', m => { const t = m.text(); if (m.type() === 'error' || m.type() === 'warning' || opt.verbose) logs.push(`[${m.type()}] ${t}`); });
page.on('pageerror', e => logs.push('[pageerror] ' + (e.stack || e.message || e)));
await page.goto(url, { waitUntil: 'load', timeout: 120000 });
if (opt.ready) {
  try { await page.waitForFunction(v => !!window[v], { timeout: +(opt.readyTimeout || 90000) }, opt.ready); }
  catch (e) { logs.push('[shot] ready 변수 대기 시간 초과: ' + opt.ready); }
}
if (opt.eval) { try { const r = await page.evaluate(opt.eval); if (r !== undefined) console.log('[eval]', JSON.stringify(r)); } catch (e) { logs.push('[eval error] ' + e.message); } }
await new Promise(r => setTimeout(r, +(opt.wait || 500)));
const n = +(opt.shots || 1), every = +(opt.every || 1000);
for (let i = 0; i < n; i++) {
  const f = n === 1 ? out : out.replace(/(\.\w+)$/, `_${String(i).padStart(2, '0')}$1`);
  await page.screenshot({ path: path.resolve(ROOT, f), type: f.endsWith('.jpg') ? 'jpeg' : 'png' });
  if (i < n - 1) await new Promise(r => setTimeout(r, every));
}
if (opt.dump) { const r = await page.evaluate(opt.dump); console.log('[dump]', typeof r === 'string' ? r : JSON.stringify(r)); }
await browser.close();
try { fs.rmSync(path.join(ROOT, '_work', 'chrome_profile_' + process.pid), { recursive: true, force: true }); } catch {}
for (const l of logs.slice(0, 40)) console.log(l);
console.log('[shot] saved', out, logs.length ? `(${logs.length} console issues)` : '(no console errors)');
