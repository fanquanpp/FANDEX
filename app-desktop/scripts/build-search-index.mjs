/**
 * FANDEX 搜索索引构建脚本（Phase 11）
 *
 * 功能概述：
 * 封装 Pagefind 命令行工具，对 Expo 构建产物（./dist-web/）生成搜索索引。
 * 该脚本设计为可在构建链中重复调用：
 *   - 若 ./dist-web/ 不存在（expo:build:web 尚未执行）：输出警告并以 0 退出，不阻断后续步骤
 *   - 若 ./dist-web/ 存在：执行 `npx pagefind --site dist-web` 生成索引，统计页面数与索引大小
 *
 * 调用上下文：
 *   package.json 的 expo:build:web 命令导出静态站点后，
 *   本脚本提供 Node.js 封装，便于独立运行、CI/CD 流水线与统计输出。
 *
 * 输出：
 *   - ./dist-web/pagefind/ 目录（由 Pagefind 自动生成）
 *   - 控制台统计信息（页面数、索引大小、耗时）
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** 当前脚本所在目录 */
const __dirname = dirname(fileURLToPath(import.meta.url));
/** 项目根目录 */
const PROJECT_ROOT = resolve(__dirname, '..');
/** Expo 构建产物目录 */
const DIST_DIR = join(PROJECT_ROOT, 'dist-web');
/** Pagefind 索引输出目录 */
const PAGEFIND_DIR = join(DIST_DIR, 'pagefind');

/**
 * 递归统计目录下指定扩展名的文件数量
 * @param {string} dir - 目标目录
 * @param {string} ext - 文件扩展名（如 '.html'）
 * @returns {number} 匹配文件数
 */
function countFilesByExt(dir, ext) {
  if (!existsSync(dir)) return 0;
  let count = 0;
  const stack = [dir];
  while (stack.length > 0) {
    const current = stack.pop();
    const entries = readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.name.endsWith(ext)) {
        count += 1;
      }
    }
  }
  return count;
}

/**
 * 计算目录总大小（字节）
 * @param {string} dir - 目标目录
 * @returns {number} 总字节数
 */
function calcDirSize(dir) {
  if (!existsSync(dir)) return 0;
  let total = 0;
  const stack = [dir];
  while (stack.length > 0) {
    const current = stack.pop();
    const entries = readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else {
        try {
          total += statSync(full).size;
        } catch {
          /* 跳过无法访问的文件 */
        }
      }
    }
  }
  return total;
}

/**
 * 主函数：执行 Pagefind 搜索索引生成
 */
function main() {
  const startTime = Date.now();
  console.log('[build-search-index] 开始生成 Pagefind 搜索索引...');

  // 1. 检查 ./dist-web/ 是否存在（expo:build:web 是否已完成）
  if (!existsSync(DIST_DIR)) {
    console.warn(`[build-search-index] 警告: ${DIST_DIR} 不存在，expo:build:web 可能尚未执行。`);
    console.warn('[build-search-index] 跳过 Pagefind 索引生成（以 0 退出，不阻断构建链）。');
    process.exit(0);
  }

  const htmlCount = countFilesByExt(DIST_DIR, '.html');
  console.log(`[build-search-index] 检测到 dist-web/ 包含 ${htmlCount} 个 HTML 页面。`);

  // 2. 若 dist-web/ 中无 HTML 页面，说明 expo:build:web 尚未执行或产物为空，跳过 pagefind 执行
  if (htmlCount === 0) {
    console.warn('[build-search-index] 警告: dist-web/ 中未发现 HTML 页面，跳过 pagefind 索引生成。');
    console.warn(
      '[build-search-index] 请确认 expo:build:web 已成功执行；本脚本以 0 退出，不阻断构建链。',
    );
    process.exit(0);
  }

  // 3. 执行 `npx pagefind --site dist-web` 生成索引
  console.log('[build-search-index] 执行: npx pagefind --site dist-web');
  const result = spawnSync('npx', ['pagefind', '--site', DIST_DIR], {
    cwd: PROJECT_ROOT,
    stdio: 'inherit',
    shell: true,
  });

  if (result.error) {
    console.error('[build-search-index] 启动 pagefind 失败:', result.error.message);
    console.error('[build-search-index] 请确认 pagefind 已安装: npm install -D pagefind');
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(`[build-search-index] pagefind 退出码非零: ${result.status}`);
    process.exit(result.status ?? 1);
  }

  // 3. 输出索引统计信息
  const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(2);

  if (!existsSync(PAGEFIND_DIR)) {
    console.warn(`[build-search-index] 警告: pagefind 执行完成但未找到 ${PAGEFIND_DIR}。`);
    return;
  }

  const indexSizeBytes = calcDirSize(PAGEFIND_DIR);
  const indexSizeKB = (indexSizeBytes / 1024).toFixed(1);
  const indexFiles = countFilesByExt(PAGEFIND_DIR, '');

  console.log('[build-search-index] 索引生成完成。');
  console.log(`[build-search-index]   源 HTML 页面数: ${htmlCount}`);
  console.log(`[build-search-index]   索引文件数量: ${indexFiles}`);
  console.log(`[build-search-index]   索引总大小: ${indexSizeKB} KB`);
  console.log(`[build-search-index]   耗时: ${elapsedSec} 秒`);
  console.log(`[build-search-index]   输出目录: ${PAGEFIND_DIR}`);
}

try {
  main();
} catch (err) {
  console.error('[build-search-index] 未捕获异常:', err);
  process.exit(1);
}
