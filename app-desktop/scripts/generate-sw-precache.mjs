/**
 * FANDEX Service Worker 预缓存清单生成脚本（Phase 11）
 *
 * 功能概述：
 * 在 Expo 构建完成后，扫描 ./dist-web/ 目录下全部静态资源，
 * 生成独立的预缓存清单 JSON 文件，供 Service Worker 运行时 fetch 加载。
 * 不再直接修改 sw.js，实现数据与代码解耦。
 *
 * 数据源：./dist-web/ 目录下全部静态文件
 * 输出：./dist-web/sw-precache-manifest.json
 *
 * 输出格式：
 * {
 *   "generatedAt": "2026-07-20T12:00:00.000Z",
 *   "version": "v{timestamp}",
 *   "precacheList": [
 *     { "url": "/FANDEX-exe/index.html", "revision": "{md5前8位}" },
 *     ...
 *   ],
 *   "totalFiles": N,
 *   "totalSize": N  // bytes
 * }
 *
 * 跳过规则：
 *   - pagefind 索引文件（体积大，按需加载即可）
 *   - 超大文件（> 2MB，避免预缓存超时）
 *   - sw.js、sw-precache-manifest.json 自身（避免递归缓存）
 *
 * 路径处理：
 *   - GitHub Pages 模式：从 manifest.webmanifest 的 start_url 检测 base path，
 *     URL 形如 "/FANDEX-exe/search/index.html"
 *   - 离线包模式：start_url 为 "./"，URL 形如 "./search/index.html"
 *
 * revision 计算：
 *   使用文件内容的 MD5 哈希前 8 位作为版本号，
 *   文件变更时 revision 自动更新，触发 SW 重新缓存。
 */

import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

/** 当前脚本所在目录 */
const __dirname = dirname(fileURLToPath(import.meta.url));
/** 项目根目录 */
const PROJECT_ROOT = resolve(__dirname, '..');
/** Expo 构建输出目录 */
const DIST_DIR = join(PROJECT_ROOT, 'dist-web');
/** 输出文件路径（与 sw.js 同目录） */
const OUTPUT_FILE = join(DIST_DIR, 'sw-precache-manifest.json');

/** GitHub Pages 默认基础路径 */
const DEFAULT_BASE_PATH = '/FANDEX-exe/';
/** 离线包基础路径（相对路径） */
const OFFLINE_BASE_PATH = './';

/** 预缓存文件大小上限（2MB），超过则跳过 */
const MAX_FILE_SIZE = 2 * 1024 * 1024;

/** 跳过预缓存的文件名/路径模式 */
const SKIP_PATTERNS = [
  /[/\\]pagefind[/\\]/, // pagefind 索引目录（体积大，按需加载）
  /^sw\.js$/, // Service Worker 自身（不应被预缓存）
  /^sw-precache-manifest\.json$/, // 预缓存清单自身（避免递归）
  /^workbox-.*\.js$/, // Workbox 运行时
];

/**
 * 递归遍历目录，收集全部文件路径
 * @param {string} dir - 目录路径
 * @returns {Promise<string[]>} 文件绝对路径数组
 */
async function walkDir(dir) {
  const files = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkDir(fullPath)));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}

/**
 * 从构建产物中检测 base path
 * 读取 manifest.webmanifest 的 start_url 字段提取路径前缀
 * @returns {Promise<string>}
 */
async function detectBasePath() {
  try {
    const manifestPath = join(DIST_DIR, 'manifest.webmanifest');
    const manifestContent = await readFile(manifestPath, 'utf-8');
    const manifest = JSON.parse(manifestContent);
    const startUrl = manifest.start_url || '';
    /** start_url 为 "./" 时是离线包，否则提取路径前缀 */
    if (startUrl === './' || startUrl === '.') {
      return OFFLINE_BASE_PATH;
    }
    /** 从 start_url 提取 base path，如 "/FANDEX-exe/" */
    const match = startUrl.match(/^(\/[^/]+\/)/);
    return match ? match[1] : DEFAULT_BASE_PATH;
  } catch {
    return DEFAULT_BASE_PATH;
  }
}

/**
 * 判断文件是否应跳过预缓存
 * @param {string} relativePath - 文件相对路径（POSIX 分隔符）
 * @param {number} size - 文件字节数
 * @returns {boolean}
 */
function shouldSkip(relativePath, size) {
  // 检查路径模式
  for (const pattern of SKIP_PATTERNS) {
    if (pattern.test(relativePath)) return true;
  }
  // 检查文件大小
  if (size > MAX_FILE_SIZE) return true;
  return false;
}

/**
 * 计算文件内容的 MD5 哈希前 8 位作为 revision
 * @param {Buffer} content - 文件内容
 * @returns {string} 8 位十六进制字符串
 */
function computeRevision(content) {
  return createHash('md5').update(content).digest('hex').slice(0, 8);
}

/**
 * 将文件相对路径转换为 SW 预缓存 URL
 * @param {string} relativePath - 文件相对路径（POSIX 分隔符）
 * @param {string} basePath - base path
 * @returns {string} 完整 URL
 */
function toUrl(relativePath, basePath) {
  if (basePath === OFFLINE_BASE_PATH) {
    return `./${relativePath}`;
  }
  return basePath + relativePath;
}

/**
 * 主函数：生成预缓存清单 JSON
 */
async function main() {
  console.log('[generate-sw-precache] 开始生成 Service Worker 预缓存清单...');

  // 1. 检查 dist 目录是否存在
  try {
    const stats = await stat(DIST_DIR);
    if (!stats.isDirectory()) {
      throw new Error(`${DIST_DIR} 不是目录`);
    }
  } catch (err) {
    console.error(`[generate-sw-precache] 错误: dist 目录不存在或不可访问: ${DIST_DIR}`);
    console.error('[generate-sw-precache] 请先运行 expo:build:web 后再执行本脚本。');
    console.error(`[generate-sw-precache] 详细错误: ${err.message}`);
    process.exit(1);
  }

  // 2. 检测 base path
  const basePath = await detectBasePath();
  console.log(`[generate-sw-precache]   检测到 base path: ${basePath}`);

  // 3. 递归扫描 dist 全部文件
  const allFiles = await walkDir(DIST_DIR);
  console.log(`[generate-sw-precache]   扫描到 ${allFiles.length} 个文件`);

  // 4. 并行读取文件内容、计算大小与 revision
  /** @type {Array<{url: string, revision: string}>} */
  const precacheList = [];
  let totalSize = 0;
  let skippedCount = 0;

  // 并行读取所有文件
  const fileData = await Promise.all(
    allFiles.map(async (filePath) => {
      const relativePath = relative(DIST_DIR, filePath).split(sep).join('/');
      const stats = await stat(filePath);
      return { relativePath, size: stats.size, filePath };
    }),
  );

  // 串行处理大文件读取（避免内存峰值过高）
  for (const { relativePath, size, filePath } of fileData) {
    if (shouldSkip(relativePath, size)) {
      skippedCount += 1;
      if (size > MAX_FILE_SIZE) {
        console.warn(
          `[generate-sw-precache]   跳过（体积超限）: ${relativePath} (${(size / 1024 / 1024).toFixed(1)}MB)`,
        );
      }
      continue;
    }

    let content;
    try {
      content = await readFile(filePath);
    } catch (err) {
      console.warn(`[generate-sw-precache]   跳过（读取失败）: ${relativePath} (${err.message})`);
      continue;
    }

    const revision = computeRevision(content);
    const url = toUrl(relativePath, basePath);
    precacheList.push({ url, revision });
    totalSize += size;
  }

  // 5. 构建输出对象
  const timestamp = Date.now();
  const output = {
    generatedAt: new Date().toISOString(),
    version: `v${timestamp}`,
    precacheList,
    totalFiles: precacheList.length,
    totalSize,
  };

  // 6. 写入 JSON 文件（位于 dist/ 根目录，与 sw.js 同级）
  // dist 目录已存在，但为确保安全仍以 recursive: true 创建
  await mkdir(DIST_DIR, { recursive: true });
  const json = JSON.stringify(output, null, 2);
  await writeFile(OUTPUT_FILE, json, 'utf-8');
  const sizeKB = (Buffer.byteLength(json, 'utf-8') / 1024).toFixed(1);

  // 7. 控制台摘要
  console.log('[generate-sw-precache] 预缓存清单生成完成。');
  console.log(`[generate-sw-precache]   预缓存文件数: ${precacheList.length}`);
  console.log(`[generate-sw-precache]   跳过文件数: ${skippedCount}`);
  console.log(`[generate-sw-precache]   总大小: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`[generate-sw-precache]   版本号: v${timestamp}`);
  console.log(`[generate-sw-precache]   输出路径: ${OUTPUT_FILE}`);
  console.log(`[generate-sw-precache]   清单大小: ${sizeKB} KB`);
}

main().catch((err) => {
  console.error('[generate-sw-precache] 生成失败:', err);
  process.exit(1);
});
