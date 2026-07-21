/**
 * FANDEX 标签索引构建脚本（Phase 11）
 *
 * 功能概述：
 * 扫描 content 目录下所有 .md 与 .mdx 文档，提取 frontmatter 的 tags 字段，
 * 聚合所有标签，统计每个标签的文档数与文档列表，按标签字母序排序。
 *
 * 数据源：content 目录下所有 .md/.mdx 文档 frontmatter tags 字段
 * 输出：./public/data/tag-index.json
 *
 * 输出格式：
 * {
 *   "generatedAt": "...",
 *   "totalTags": 100,
 *   "tags": [
 *     { "tag": "async", "count": 15,
 *       "docs": [{ "slug": "...", "title": "...", "module": "..." }] }
 *   ]
 * }
 */

import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** 当前脚本所在目录 */
const __dirname = dirname(fileURLToPath(import.meta.url));
/** 项目根目录 */
const PROJECT_ROOT = resolve(__dirname, '..');
/** 文档源目录 */
const DOCS_DIR = join(PROJECT_ROOT, '..', 'content', 'full');
/** 索引输出目录 */
const OUTPUT_DIR = join(PROJECT_ROOT, 'public', 'data');
/** 索引输出文件 */
const OUTPUT_FILE = join(OUTPUT_DIR, 'tag-index.json');

/**
 * 递归遍历目录
 * @param {string} dir - 目录路径
 * @param {string[]} exts - 扩展名数组
 * @param {Function} fn - 异步回调
 */
async function walkDir(dir, exts, fn) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkDir(full, exts, fn);
    } else if (exts.some((ext) => entry.name.endsWith(ext))) {
      await fn(full);
    }
  }
}

/**
 * 解析 Markdown frontmatter（支持键值对与数组）
 * @param {string} content - 文件内容
 * @returns {Object} frontmatter 对象
 */
function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const raw = match[1];
  const data = {};
  let key = null;
  let inArray = false;
  let arrayVals = [];

  for (const line of raw.split(/\r?\n/)) {
    if (inArray) {
      const itemMatch = line.match(/^\s+-\s+['"]?(.+?)['"]?\s*$/);
      if (itemMatch) {
        arrayVals.push(itemMatch[1]);
        continue;
      }
      if (key) data[key] = arrayVals;
      inArray = false;
      key = null;
      arrayVals = [];
    }
    const kvMatch = line.match(/^(\w[\w-]*):\s*(.*)$/);
    if (kvMatch) {
      const k = kvMatch[1];
      const v = kvMatch[2].trim();
      if (v === '' || v === '[]') {
        key = k;
        inArray = true;
        arrayVals = [];
      } else {
        data[k] = v.replace(/^['"]|['"]$/g, '');
      }
    }
  }
  if (inArray && key) data[key] = arrayVals;
  return data;
}

/**
 * 从文件路径提取文档 slug
 * @param {string} filePath - 文件绝对路径
 * @param {string} docsDir - 文档根目录
 * @returns {string} slug
 */
function slugFromPath(filePath, docsDir) {
  const relative = filePath.replace(docsDir, '').replace(/[/\\]/g, '/');
  return relative
    .replace(/^\//, '')
    .replace(/\.mdx?$/, '')
    .replace(/#/g, '-');
}

/**
 * 主函数：构建标签索引
 */
async function main() {
  console.log('[build-tag-index] 开始构建标签索引...');

  /** @type {Map<string, Array<{slug: string, title: string, module: string}>>} */
  const tagMap = new Map();

  // 1. 扫描所有 .md 与 .mdx 文件
  console.log(`[build-tag-index] 扫描文档目录: ${DOCS_DIR}`);
  let docCount = 0;

  await walkDir(DOCS_DIR, ['.md', '.mdx'], async (filePath) => {
    const content = await readFile(filePath, 'utf-8');
    const fm = parseFrontmatter(content);
    if (!fm.title) return; // 跳过无标题文件

    const tags = Array.isArray(fm.tags) ? fm.tags : [];
    if (tags.length === 0) return;

    const slug = slugFromPath(filePath, DOCS_DIR);
    const docInfo = {
      slug,
      title: fm.title,
      module: fm.module || '',
    };

    for (const tag of tags) {
      if (!tagMap.has(tag)) {
        tagMap.set(tag, []);
      }
      tagMap.get(tag).push(docInfo);
    }
    docCount += 1;
  });

  // 2. 按标签字母序排序（中文标签按 Unicode 序）
  const sortedTags = Array.from(tagMap.keys()).sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));

  // 3. 构建 tags 数组（每个标签包含 count 与 docs 列表）
  const tagsOutput = sortedTags.map((tag) => ({
    tag,
    count: tagMap.get(tag).length,
    docs: tagMap.get(tag),
  }));

  // 4. 构建输出对象
  const output = {
    generatedAt: new Date().toISOString(),
    totalTags: tagsOutput.length,
    tags: tagsOutput,
  };

  // 5. 写入文件
  await mkdir(OUTPUT_DIR, { recursive: true });
  const json = JSON.stringify(output, null, 2);
  await writeFile(OUTPUT_FILE, json, 'utf-8');

  const sizeKB = (Buffer.byteLength(json, 'utf-8') / 1024).toFixed(1);
  console.log('[build-tag-index] 索引构建完成。');
  console.log(`[build-tag-index]   标签总数: ${tagsOutput.length}`);
  console.log(`[build-tag-index]   含标签文档数: ${docCount}`);
  console.log(`[build-tag-index]   文件大小: ${sizeKB} KB`);
  console.log(`[build-tag-index]   输出路径: ${OUTPUT_FILE}`);
}

main().catch((err) => {
  console.error('[build-tag-index] 构建失败:', err);
  process.exit(1);
});
