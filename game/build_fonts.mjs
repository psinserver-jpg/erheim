// 한글 폰트(Noto Sans KR / Noto Serif KR, OFL 라이선스, npm @fontsource)를 base64 로 넣은 CSS 를 만든다 → dist/fonts.css
// (file:// 에서는 폰트 파일을 url() 로 못 읽으므로 data: URL 로 내장한다)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const FONTS = [
  ['GameSans', 'noto-sans-kr', [400, 500, 700]],
  ['GameSerif', 'noto-serif-kr', [700, 900]],
];
let css = '/* 자동 생성: node game/build_fonts.mjs */\n';
let total = 0;
for (const [family, pkg, weights] of FONTS) {
  for (const w of weights) {
    for (const [subset, range] of [['latin', 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2190-2193,U+2212,U+2215,U+FEFF,U+FFFD'], ['korean', '']]) {
      const f = path.join(here, 'node_modules', '@fontsource', pkg, 'files', `${pkg}-${subset}-${w}-normal.woff2`);
      if (!fs.existsSync(f)) { console.warn('없음', f); continue; }
      const b = fs.readFileSync(f); total += b.length;
      css += `@font-face{font-family:'${family}';font-style:normal;font-weight:${w};font-display:block;src:url(data:font/woff2;base64,${b.toString('base64')}) format('woff2');${range ? 'unicode-range:' + range + ';' : ''}}\n`;
    }
  }
}
fs.mkdirSync(path.join(here, '..', 'dist'), { recursive: true });
fs.writeFileSync(path.join(here, '..', 'dist', 'fonts.css'), css);
console.log(`[fonts] dist/fonts.css ${(css.length / 1e6).toFixed(2)} MB (원본 woff2 ${(total / 1e6).toFixed(2)} MB)`);
