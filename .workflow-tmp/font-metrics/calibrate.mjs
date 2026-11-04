// 字体 metric fallback 校准脚本（S4）：实测 IBM Plex Sans 与系统栈（Arial/Arial Bold）
// 的宽度与行框度量，推导 size-adjust / ascent-override / descent-override，
// 并注入候选 @font-face 回读验证。输出 JSON 供转录进 public/fonts/fonts.css。
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '..', '..');
const FONTS_DIR = resolve(ROOT, 'app-web', 'public', 'fonts');
const PORT = 4193;

const MIME = { '.woff2': 'font/woff2', '.html': 'text/html; charset=utf-8', '.css': 'text/css' };

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  try {
    if (url.pathname.startsWith('/fonts/')) {
      const file = resolve(FONTS_DIR, url.pathname.slice('/fonts/'.length));
      if (!file.startsWith(FONTS_DIR)) throw new Error('forbidden');
      const data = await readFile(file);
      res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
      res.end(data);
      return;
    }
    res.writeHead(200, { 'content-type': MIME['.html'] });
    res.end(PAGE_HTML);
  } catch {
    res.writeHead(404);
    res.end('not found');
  }
});

const PAGE_HTML = `<!doctype html>
<html><head><meta charset="utf-8"><style>
@font-face { font-family: 'IBM Plex Sans'; font-weight: 400; src: url('/fonts/ibm-plex-sans-400.woff2') format('woff2'); }
@font-face { font-family: 'IBM Plex Sans'; font-weight: 500; src: url('/fonts/ibm-plex-sans-500.woff2') format('woff2'); }
@font-face { font-family: 'IBM Plex Sans'; font-weight: 600; src: url('/fonts/ibm-plex-sans-600.woff2') format('woff2'); }
@font-face { font-family: 'IBM Plex Sans'; font-weight: 700; src: url('/fonts/ibm-plex-sans-700.woff2') format('woff2'); }
</style></head><body>
<script>
const SAMPLE = 'The quick brown fox jumps over the lazy dog 0123456789';
window.measure = async (spec) => {
  try { await document.fonts.load(spec, SAMPLE); } catch (e) { /* load 失败继续，靠 check 判定 */ }
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = spec;
  const m = ctx.measureText(SAMPLE);
  return {
    spec,
    width: m.width,
    ascent: m.fontBoundingBoxAscent,
    descent: m.fontBoundingBoxDescent,
    check: document.fonts.check(spec, SAMPLE),
  };
};
window.lineBox = (family, weight) => {
  const div = document.createElement('div');
  div.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;font-size:100px;line-height:normal;font-family:' + family + ';font-weight:' + weight;
  div.textContent = SAMPLE;
  document.body.appendChild(div);
  const h = div.getBoundingClientRect().height;
  div.remove();
  return h;
};
</script>
</body></html>`;

function round1(n) {
  return Math.round(n * 10) / 10;
}

const serverReady = new Promise((done) => server.listen(PORT, done));
await serverReady;

const { pathToFileURL } = await import('node:url');
const { chromium } = await import(pathToFileURL(resolve(ROOT, 'app-web', 'node_modules', 'playwright', 'index.mjs')).href);
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto(`http://localhost:${PORT}/`);

// 1) 直接度量：真实 IBM Plex Sans 与系统栈候选
const specs = {
  plex400: '400 100px "IBM Plex Sans"',
  plex500: '500 100px "IBM Plex Sans"',
  plex600: '600 100px "IBM Plex Sans"',
  plex700: '700 100px "IBM Plex Sans"',
  arial400: '400 100px Arial',
  arial700: '700 100px Arial',
  helv400: '400 100px "Helvetica Neue"',
  helv700: '700 100px "Helvetica Neue"',
};
const M = {};
for (const [key, spec] of Object.entries(specs)) {
  M[key] = await page.evaluate((s) => window.measure(s), spec);
}
console.log('=== 直接度量（sample: "The quick brown fox..." @100px）===');
for (const [key, r] of Object.entries(M)) {
  console.log(key.padEnd(9), `check=${r.check}`, `width=${round1(r.width)}`, `asc=${round1(r.ascent)}`, `desc=${round1(r.descent)}`);
}

// 2) 推导 override（公式：A = asc_ratio * 10000 / S；S = width_plex / width_sys * 100）
function derive(plex, sys) {
  const S = (plex.width / sys.width) * 100;
  const A = (plex.ascent / 100) * (10000 / S);
  const D = (plex.descent / 100) * (10000 / S);
  return { S: round1(S), A: round1(A), D: round1(D) };
}
const r400 = derive(M.plex400, M.arial400);
const r700 = derive(M.plex700, M.arial700);
console.log('\n=== 推导 ===');
console.log('400 vs Arial     :', JSON.stringify(r400));
console.log('700 vs Arial Bold:', JSON.stringify(r700));

// 3) 注入候选 face 回读验证
const css = `
@font-face { font-family: 'FB400'; font-style: normal; font-weight: 400 500;
  src: local('Arial');
  size-adjust: ${r400.S}%; ascent-override: ${r400.A}%; descent-override: ${r400.D}%; line-gap-override: 0%; }
@font-face { font-family: 'FB700'; font-style: normal; font-weight: 600 900;
  src: local('Arial Bold'), local('Arial-BoldMT'), local('Arial Bold MT'), local('Liberation Sans Bold');
  size-adjust: ${r700.S}%; ascent-override: ${r700.A}%; descent-override: ${r700.D}%; line-gap-override: 0%; }
`;
await page.addStyleTag({ content: css });
const v400 = await page.evaluate(() => window.measure('400 100px "FB400"'));
const v700 = await page.evaluate(() => window.measure('700 100px "FB700"'));
console.log('\n=== 回读验证 ===');
console.log('FB400:', JSON.stringify(v400), 'target plex400:', JSON.stringify({ width: round1(M.plex400.width), ascent: round1(M.plex400.ascent), descent: round1(M.plex400.descent) }));
console.log('FB700:', JSON.stringify(v700), 'target plex700:', JSON.stringify({ width: round1(M.plex700.width), ascent: round1(M.plex700.ascent), descent: round1(M.plex700.descent) }));

const lb = {
  plex400: await page.evaluate(() => window.lineBox("'IBM Plex Sans'", 400)),
  fb400: await page.evaluate(() => window.lineBox("'FB400'", 400)),
  arial400: await page.evaluate(() => window.lineBox('Arial', 400)),
  plex700: await page.evaluate(() => window.lineBox("'IBM Plex Sans'", 700)),
  fb700: await page.evaluate(() => window.lineBox("'FB700'", 700)),
  arial700: await page.evaluate(() => window.lineBox('Arial', 700)),
};
console.log('\n=== line-height:normal 行框（100px）===');
for (const [k, v] of Object.entries(lb)) console.log(k.padEnd(9), round1(v));

await browser.close();
server.close();
