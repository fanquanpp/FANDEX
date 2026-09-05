/**
 * OG 社交分享图生成脚本
 * =============================================================================
 * 将 src/assets/og-image.svg（1200x630 品牌设计源）渲染为
 * public/og-image.png，供 Open Graph / Twitter Card / JSON-LD 引用。
 *
 * 为什么需要 PNG：社交平台爬虫（微信/Twitter/Telegram 等）对 SVG 支持有限，
 * OG 协议事实标准为 PNG/JPEG 位图；源文件保留 SVG 以符合仓库"图形优先 SVG"规范。
 *
 * 运行时机：仅在品牌视觉变更后手动执行 `pnpm --filter @fandex/web og`，
 * 生成产物提交入库（构建期不重复渲染，不增加 CI 耗时）。
 * =============================================================================
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const svgPath = join(__dirname, '..', 'src', 'assets', 'og-image.svg');
const outPath = join(__dirname, '..', 'public', 'og-image.png');

const svg = readFileSync(svgPath);

await sharp(svg, { density: 96 })
  .resize(1200, 630)
  .png({ compressionLevel: 9 })
  .toFile(outPath);

console.log('[generate-og] Written', outPath);
