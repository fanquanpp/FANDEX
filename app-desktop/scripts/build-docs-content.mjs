/**
 * FANDEX 文档内容构建脚本
 *
 * 功能概述：
 * 将 cnt-content/full/ 下的 Markdown 文档同步到 app-desktop/public/content/，
 * 供 Expo 端通过 fetch() 在运行时加载文档内容。
 *
 * 同步策略：
 * - 源目录：cnt-content/full/<module>/<doc>.md（含 YAML frontmatter）
 * - 目标目录：app-desktop/public/content/<module>/<doc>.md（原样复制）
 * - 仅新增/变更的文件会被复制（基于 mtime 比较）
 * - 目标目录中不存在于源的文件将被清理（保持镜像同步）
 *
 * 运行时机：
 * - 开发前：pnpm run build:docs-content
 * - CI 构建：在 expo:build:web 之前执行
 */

import { copyFile, mkdir, readdir, rm, stat } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** 当前脚本所在目录 */
const __dirname = dirname(fileURLToPath(import.meta.url));
/** Desktop 项目根目录 */
const PROJECT_ROOT = resolve(__dirname, '..');
/** 单仓库根目录 */
const MONO_ROOT = resolve(PROJECT_ROOT, '..');
/** 文档源目录（cnt-content/full/） */
const SRC_DIR = join(MONO_ROOT, 'cnt-content', 'full');
/** 输出目录（app-desktop/public/content/） */
const OUT_DIR = join(PROJECT_ROOT, 'public', 'content');

/**
 * 递归收集目录下所有文件
 * @param {string} dir - 目录路径
 * @returns {Promise<string[]>} 文件绝对路径数组
 */
async function collectFiles(dir) {
  const results = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await collectFiles(full)));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      results.push(full);
    }
  }
  return results;
}

/**
 * 判断文件是否需要复制（目标不存在或源文件更新）
 * @param {string} src - 源文件路径
 * @param {string} dest - 目标文件路径
 * @returns {Promise<boolean>} 是否需要复制
 */
async function needsCopy(src, dest) {
  try {
    const [srcStat, destStat] = await Promise.all([stat(src), stat(dest)]);
    return srcStat.mtimeMs > destStat.mtimeMs;
  } catch {
    return true; // 目标不存在，需要复制
  }
}

/**
 * 主函数：同步 Markdown 文档到 public/content/
 */
async function main() {
  const startTime = Date.now();
  console.log('[build-docs-content] 开始同步文档内容...');
  console.log(`[build-docs-content]   源目录: ${SRC_DIR}`);
  console.log(`[build-docs-content]   输出目录: ${OUT_DIR}`);

  // 1. 检查源目录
  try {
    const stats = await stat(SRC_DIR);
    if (!stats.isDirectory()) {
      throw new Error(`${SRC_DIR} 不是目录`);
    }
  } catch (err) {
    console.error(`[build-docs-content] 源目录不存在: ${SRC_DIR}`);
    console.error(`[build-docs-content] 请确认 cnt-content/full/ 已初始化`);
    process.exit(1);
  }

  // 2. 收集源文件
  const srcFiles = await collectFiles(SRC_DIR);
  console.log(`[build-docs-content]   源文件数: ${srcFiles.length}`);

  // 3. 清理输出目录（确保镜像同步）
  try {
    await rm(OUT_DIR, { recursive: true, force: true });
  } catch {
    /* 目录不存在时忽略 */
  }
  await mkdir(OUT_DIR, { recursive: true });

  // 4. 逐文件复制
  let copied = 0;
  let skipped = 0;
  for (const srcFile of srcFiles) {
    const relPath = relative(SRC_DIR, srcFile);
    const destFile = join(OUT_DIR, relPath);

    if (await needsCopy(srcFile, destFile)) {
      await mkdir(dirname(destFile), { recursive: true });
      await copyFile(srcFile, destFile);
      copied += 1;
    } else {
      skipped += 1;
    }
  }

  // 5. 输出统计
  const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('[build-docs-content] 同步完成。');
  console.log(`[build-docs-content]   复制: ${copied} 个文件`);
  console.log(`[build-docs-content]   跳过: ${skipped} 个文件（未变更）`);
  console.log(`[build-docs-content]   耗时: ${elapsedSec} 秒`);
}

main().catch((err) => {
  console.error('[build-docs-content] 同步失败:', err);
  process.exit(1);
});
