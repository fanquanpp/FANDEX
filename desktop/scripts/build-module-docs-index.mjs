/**
 * FANDEX 模块-文档映射索引构建脚本（Phase 11）
 *
 * 功能概述：
 * 读取 metadata/modules.json 获取 51 个模块定义，扫描 content 目录下所有 .md 文档，
 * 解析 frontmatter 获取 title、module、order、tags、difficulty、readingTime，
 * 按模块分组并按 order 排序，输出模块-文档映射索引。
 *
 * 数据源：
 *   - metadata/modules.json（模块定义）
 *   - content 目录下所有 .md/.mdx 文档 frontmatter
 *
 * 输出：./public/data/module-docs-index.json
 *
 * 输出格式：
 * {
 *   "generatedAt": "...",
 *   "modules": {
 *     "frontend/javascript": {
 *       "name": "JavaScript",
 *       "docs": [{ "slug": "...", "title": "...", "order": 1, "tags": [...],
 *                  "difficulty": "beginner", "readingTime": 10 }],
 *       "totalCount": 50
 *     }
 *   }
 * }
 *
 * 模块 ID 规范：
 *   modules.json 中模块 id 为 "javascript"，categories 为 ["frontend"]
 *   输出键采用 "category/id" 形式（如 "frontend/javascript"），
 *   与任务规格一致。文档 frontmatter 的 module 字段保持原值（bare id）。
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
/** 模块定义文件 */
const MODULES_FILE = join(PROJECT_ROOT, 'metadata', 'modules.json');
/** 索引输出目录 */
const OUTPUT_DIR = join(PROJECT_ROOT, 'public', 'data');
/** 索引输出文件 */
const OUTPUT_FILE = join(OUTPUT_DIR, 'module-docs-index.json');

/**
 * 递归遍历目录，对匹配扩展名的文件执行回调
 * @param {string} dir - 目录路径
 * @param {string[]} exts - 扩展名数组（如 ['.md', '.mdx']）
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
 * 解析 Markdown 文件的 frontmatter（简易 YAML 解析器）
 * 支持键值对与数组（tags、prerequisites、related 等）
 *
 * @param {string} content - 文件完整内容
 * @returns {Object} frontmatter 键值对
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
 * 从文件路径提取文档 slug（module/filename 格式）
 * @param {string} filePath - 文件绝对路径
 * @param {string} docsDir - 文档根目录
 * @returns {string} slug 字符串
 */
function slugFromPath(filePath, docsDir) {
  const relative = filePath.replace(docsDir, '').replace(/[/\\]/g, '/');
  return relative
    .replace(/^\//, '')
    .replace(/\.mdx?$/, '')
    .replace(/#/g, '-'); // 与 content.config.ts 的 generateId 一致
}

/**
 * 构建模块键（category/id 格式）
 * @param {Object} mod - 模块定义对象
 * @returns {string} 形如 "frontend/javascript"
 */
function moduleKey(mod) {
  const category =
    Array.isArray(mod.categories) && mod.categories.length > 0
      ? mod.categories[0]
      : 'uncategorized';
  return `${category}/${mod.id}`;
}

/**
 * 主函数：构建模块-文档映射索引
 */
async function main() {
  console.log('[build-module-docs-index] 开始构建模块文档索引...');

  // 1. 读取 modules.json
  console.log(`[build-module-docs-index] 读取模块定义: ${MODULES_FILE}`);
  const modulesRaw = await readFile(MODULES_FILE, 'utf-8');
  const modulesData = JSON.parse(modulesRaw);
  const modules = modulesData.modules || [];
  console.log(`[build-module-docs-index] 共 ${modules.length} 个模块定义`);

  // 2. 初始化 modules 输出对象（保证即使无文档的模块也出现在索引中）
  /** @type {Object<string, {name: string, docs: Array, totalCount: number}>} */
  const modulesOutput = {};
  for (const mod of modules) {
    const key = moduleKey(mod);
    modulesOutput[key] = {
      name: mod.title || mod.id,
      docs: [],
      totalCount: 0,
    };
  }

  // 3. 遍历 content 目录下所有 .md 与 .mdx 文件，解析 frontmatter
  console.log(`[build-module-docs-index] 扫描文档目录: ${DOCS_DIR}`);
  let totalDocs = 0;
  let unmatchedModules = 0;

  await walkDir(DOCS_DIR, ['.md', '.mdx'], async (filePath) => {
    const content = await readFile(filePath, 'utf-8');
    const fm = parseFrontmatter(content);
    if (!fm.title || !fm.module) return; // 跳过无标题或无模块的文件

    const moduleId = fm.module;
    const slug = slugFromPath(filePath, DOCS_DIR);

    // 查找对应模块定义，构建 category/id 键
    const mod = modules.find((m) => m.id === moduleId);
    if (!mod) {
      unmatchedModules += 1;
      return;
    }
    const key = moduleKey(mod);

    if (!modulesOutput[key]) {
      // 容错：modules.json 中未定义但 frontmatter 引用的模块
      modulesOutput[key] = {
        name: moduleId,
        docs: [],
        totalCount: 0,
      };
    }

    const order = typeof fm.order === 'string' ? Number(fm.order) || 0 : 0;
    const tags = Array.isArray(fm.tags) ? fm.tags : [];
    const readingTime =
      typeof fm.readingTime === 'string' ? Number(fm.readingTime) || undefined : fm.readingTime;

    modulesOutput[key].docs.push({
      slug,
      title: fm.title,
      order,
      tags,
      difficulty: fm.difficulty || undefined,
      readingTime,
    });
    modulesOutput[key].totalCount += 1;
    totalDocs += 1;
  });

  // 4. 每模块内按 order 升序排序
  for (const key of Object.keys(modulesOutput)) {
    modulesOutput[key].docs.sort((a, b) => a.order - b.order);
  }

  if (unmatchedModules > 0) {
    console.warn(
      `[build-module-docs-index] 警告: ${unmatchedModules} 篇文档的 module 字段未在 modules.json 中找到匹配，已跳过。`,
    );
  }

  // 5. 构建输出对象
  const output = {
    generatedAt: new Date().toISOString(),
    modules: modulesOutput,
  };

  // 6. 写入文件
  await mkdir(OUTPUT_DIR, { recursive: true });
  const json = JSON.stringify(output, null, 2);
  await writeFile(OUTPUT_FILE, json, 'utf-8');

  const sizeKB = (Buffer.byteLength(json, 'utf-8') / 1024).toFixed(1);
  console.log('[build-module-docs-index] 索引构建完成。');
  console.log(`[build-module-docs-index]   模块数: ${Object.keys(modulesOutput).length}`);
  console.log(`[build-module-docs-index]   文档总数: ${totalDocs}`);
  console.log(`[build-module-docs-index]   文件大小: ${sizeKB} KB`);
  console.log(`[build-module-docs-index]   输出路径: ${OUTPUT_FILE}`);
}

main().catch((err) => {
  console.error('[build-module-docs-index] 构建失败:', err);
  process.exit(1);
});
