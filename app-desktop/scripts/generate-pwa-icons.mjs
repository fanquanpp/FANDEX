/**
 * FANDEX PWA 图标生成脚本（Phase 11）
 *
 * 功能概述：
 * 从 SVG 源文件（./public/favicon.svg）生成多尺寸 PNG 图标，
 * 用于 PWA 安装、Apple Touch Icon 等场景。使用 sharp 库进行 SVG → PNG 转换。
 *
 * 输入：./public/favicon.svg
 * 输出：
 *   - ./public/icons/icon-192.png
 *   - ./public/icons/icon-512.png
 *   - ./public/icons/maskable-192.png
 *   - ./public/icons/maskable-512.png
 *   - ./public/icons/apple-touch-icon.png（180x180）
 *
 * maskable 图标说明：
 *   maskable 图标需更大的安全区域（内容仅占 80%），
 *   在 SVG 外围添加白色边距，确保裁剪后内容完整。
 *
 * 降级策略：
 *   若 sharp 不可用，输出警告并跳过 PNG 生成（PWA 仅使用 SVG，现代浏览器支持）。
 */

import { access, mkdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** 当前脚本所在目录 */
const __dirname = dirname(fileURLToPath(import.meta.url));
/** 项目根目录 */
const PROJECT_ROOT = resolve(__dirname, '..');
/** SVG 源文件路径（优先 favicon.svg） */
const SVG_PATH = join(PROJECT_ROOT, 'public', 'favicon.svg');
/** 备用 SVG 源文件路径 */
const ALT_SVG_PATH = join(PROJECT_ROOT, 'public', 'icons', 'icon.svg');
/** 图标输出目录 */
const OUTPUT_DIR = join(PROJECT_ROOT, 'public', 'icons');

/** 需要生成的常规图标尺寸 */
const SIZES = [192, 512];
/** Apple Touch Icon 尺寸 */
const APPLE_TOUCH_SIZE = 180;
/** maskable 图标内容占比（80%） */
const MASKABLE_CONTENT_RATIO = 0.8;

/**
 * 检查文件是否存在
 * @param {string} path - 文件路径
 * @returns {Promise<boolean>}
 */
async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * 生成普通 PNG 图标
 * @param {Buffer} svgBuffer - SVG 内容
 */
async function generateNormalIcons(svgBuffer) {
  const sharp = (await import('sharp')).default;
  for (const size of SIZES) {
    const outputPath = join(OUTPUT_DIR, `icon-${size}.png`);
    await sharp(svgBuffer).resize(size, size).png().toFile(outputPath);
    console.log(`[generate-pwa-icons]   生成: icon-${size}.png`);
  }
}

/**
 * 生成 maskable PNG 图标
 * maskable 图标需内容仅占 80% 区域，外围留白
 *
 * @param {Buffer} svgBuffer - SVG 内容
 */
async function generateMaskableIcons(svgBuffer) {
  const sharp = (await import('sharp')).default;
  for (const size of SIZES) {
    const outputPath = join(OUTPUT_DIR, `icon-maskable-${size}.png`);
    const innerSize = Math.round(size * MASKABLE_CONTENT_RATIO);
    const padding = Math.round((size - innerSize) / 2);

    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 250, g: 250, b: 250, alpha: 1 },
      },
    })
      .composite([
        {
          input: await sharp(svgBuffer).resize(innerSize, innerSize).png().toBuffer(),
          top: padding,
          left: padding,
        },
      ])
      .png()
      .toFile(outputPath);
    console.log(`[generate-pwa-icons]   生成: icon-maskable-${size}.png`);
  }
}

/**
 * 生成 Apple Touch Icon（180x180，无透明背景）
 * Apple 设备要求图标不透明，背景填充白色
 *
 * @param {Buffer} svgBuffer - SVG 内容
 */
async function generateAppleTouchIcon(svgBuffer) {
  const sharp = (await import('sharp')).default;
  const outputPath = join(OUTPUT_DIR, 'apple-touch-icon.png');
  const size = APPLE_TOUCH_SIZE;

  // 使用白色背景 + 居中放置图标（避免透明区域被 Apple 系统填充为黑色）
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([
      {
        input: await sharp(svgBuffer).resize(size, size).png().toBuffer(),
        top: 0,
        left: 0,
      },
    ])
    .png()
    .toFile(outputPath);
  console.log(`[generate-pwa-icons]   生成: apple-touch-icon.png (${size}x${size})`);
}

/**
 * 主函数：生成全部 PWA 图标
 */
async function main() {
  console.log('[generate-pwa-icons] 开始生成 PWA 图标...');

  // 1. 选择 SVG 源文件（优先 favicon.svg，备用 icons/icon.svg）
  let svgPath = SVG_PATH;
  if (!(await fileExists(svgPath))) {
    console.warn(`[generate-pwa-icons] 警告: 主 SVG 源不存在: ${svgPath}`);
    if (await fileExists(ALT_SVG_PATH)) {
      svgPath = ALT_SVG_PATH;
      console.log(`[generate-pwa-icons] 使用备用 SVG 源: ${svgPath}`);
    } else {
      console.error(`[generate-pwa-icons] 错误: 备用 SVG 源也不存在: ${ALT_SVG_PATH}`);
      process.exit(1);
    }
  }

  // 2. 读取 SVG 内容
  const svgBuffer = await readFile(svgPath);
  await mkdir(OUTPUT_DIR, { recursive: true });

  // 3. 动态加载 sharp（若不可用则降级）
  try {
    await import('sharp');
  } catch (err) {
    console.warn(`[generate-pwa-icons] 警告: sharp 未安装或无法加载 (${err.message})。`);
    console.warn('[generate-pwa-icons] 跳过 PNG 图标生成，PWA 将仅使用 SVG 图标。');
    console.warn('[generate-pwa-icons] 如需 PNG 图标，请运行: npm install -D sharp');
    return;
  }

  // 4. 生成全部图标
  try {
    await generateNormalIcons(svgBuffer);
    await generateMaskableIcons(svgBuffer);
    await generateAppleTouchIcon(svgBuffer);
    console.log('[generate-pwa-icons] PWA 图标生成完成。');
  } catch (err) {
    console.error('[generate-pwa-icons] 图标生成失败:', err);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[generate-pwa-icons] 未捕获异常:', err);
  process.exit(1);
});
