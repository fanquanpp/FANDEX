import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';

// KaTeX 字体三格式裁剪：katex.min.css 的 @font-face 每族同时声明 woff2/woff/ttf 三个
// src，构建后 dist/assets 里 woff 与 ttf 各约 290KB 原始体积。现代浏览器
//（Chrome 36+/Firefox 39+/Safari 10+，2020 基线）全部优先消费 woff2，
// woff/ttf 永远不会被下载（除非用户禁用 woff2）。裁掉这两类备选后：
// - dist 少约 580KB 文件体积（不影响首屏，浏览器本就不请求它们，纯部署瘦身）
// - @font-face src 只留 woff2，避免个别老爬虫误取低效格式
// 若将来需要兼容极老浏览器，去掉 build 链中这一步重跑构建即可恢复。

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST_DIR = join(__dirname, '..', 'dist');
const ASSETS_DIR = join(DIST_DIR, 'assets');

if (!existsSync(ASSETS_DIR)) {
  console.log('[prune-katex-fonts] dist/assets 不存在，跳过');
  process.exit(0);
}

// 1. CSS 内移除 woff/ttf 备选 src，只保留 woff2
const cssFiles = readdirSync(ASSETS_DIR).filter((f) => f.endsWith('.css'));
let cssTouched = 0;
for (const file of cssFiles) {
  const p = join(ASSETS_DIR, file);
  const src = readFileSync(p, 'utf8');
  // 匹配 url(....woff)format("woff") 与 url(....ttf)format("truetype")，含前导逗号
  const next = src
    .replace(/,url\([^)]*\.woff\)format\("woff"\)/g, '')
    .replace(/,url\([^)]*\.ttf\)format\("truetype"\)/g, '');
  if (next !== src) {
    writeFileSync(p, next, 'utf8');
    cssTouched++;
  }
}

// 2. 删除不再被引用的 woff/ttf 文件（KaTeX 族前缀，避免误伤站点自有字体）
let removed = 0;
let removedBytes = 0;
for (const file of readdirSync(ASSETS_DIR)) {
  if (!/^KaTeX_.*\.(woff|ttf)$/.test(file)) continue;
  const p = join(ASSETS_DIR, file);
  removed++;
  try {
    removedBytes += statSync(p).size;
  } catch {
    removedBytes += 0;
  }
  rmSync(p, { force: true });
}

console.log(
  `[prune-katex-fonts] css 修正 ${cssTouched} 个，删除 KaTeX woff/ttf ${removed} 个（约 ${Math.round(removedBytes / 1024)}KB）`,
);
