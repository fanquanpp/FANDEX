/**
 * FANDEX 术语表索引构建脚本（Phase 11）
 *
 * 功能概述：
 * 遍历 shd-shared/metadata/glossary/<module>.json 文件（27 个模块），
 * 解析 JSON 中的 terms 数组（每条含 name、definition、slug 字段），
 * 构建术语映射表并输出为 JSON 索引文件。
 *
 * 数据源：shd-shared/metadata/glossary/<module>.json
 * 输出：./public/data/glossary-index.json
 *
 * 输出格式：
 * {
 *   "generatedAt": "2026-07-19T...",
 *   "totalTerms": 500,
 *   "terms": [
 *     { "term": "DOM", "english": "",
 *       "definition": "...", "module": "javascript", "slug": "dom" }
 *   ]
 *
 * 偏差报备（仓库整理后路径与格式变更）：
 * - 原：src/content/glossary/<module>/glossary.md（Markdown 表格格式）
 * - 新：shd-shared/metadata/glossary/<module>.json（JSON 格式，字段 name/definition/slug）
 * - 原术语表中的 english 列在 JSON 数据源中已合并到 name 字段，故 english 输出为空字符串
 * - 原 slug 字段（页面级 javascript/glossary）不足以定位单个术语，
 *   改为根据 name 字段动态生成术语级 slug（与 remark-term-link.ts 保持一致）
 */

import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** 当前脚本所在目录 */
const __dirname = dirname(fileURLToPath(import.meta.url));
/** 项目根目录（app-desktop） */
const PROJECT_ROOT = resolve(__dirname, '..');
/** 单仓库根目录（用于定位 shd-shared 等共享资源） */
const MONO_ROOT = resolve(PROJECT_ROOT, '..');
/** 术语表源目录（仓库整理后已从 src/content/glossary 迁移至 shd-shared/metadata/glossary，格式由 Markdown 改为 JSON） */
const GLOSSARY_DIR = join(MONO_ROOT, 'shd-shared', 'metadata', 'glossary');
/** 索引输出目录 */
const OUTPUT_DIR = join(PROJECT_ROOT, 'public', 'data');
/** 索引输出文件 */
const OUTPUT_FILE = join(OUTPUT_DIR, 'glossary-index.json');

/**
 * 将术语文本转换为 URL 友好的 slug
 * 保留中文字符，转小写，空格与特殊字符替换为连字符
 *
 * @param {string} term - 中文或英文术语
 * @returns {string} URL 友好的 slug
 */
function termToSlug(term) {
  return term
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\u4e00-\u9fa5-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * 解析单个 glossary JSON 文件，提取术语条目
 *
 * 输入：文件路径、模块 ID
 * 输出：术语条目数组（每条含 term、english、definition、module、slug 字段）
 * 流程：
 * 1. 读取 JSON 文件内容
 * 2. 解析 JSON 获取 moduleId 与 terms 数组
 * 3. 遍历 terms 数组，将每条转换为统一输出格式
 *
 * @param {string} filePath - JSON 文件绝对路径
 * @param {string} module - 模块 ID（fallback，优先使用 JSON 内 moduleId）
 * @returns {Promise<Array<{term: string, english: string, definition: string, module: string, slug: string}>>} 术语条目数组
 */
async function parseGlossaryJsonFile(filePath, module) {
  let raw;
  try {
    raw = await readFile(filePath, 'utf-8');
  } catch (err) {
    console.warn(`[build-glossary-index]   ${module}: 读取失败 - ${err.message}`);
    return [];
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    console.warn(`[build-glossary-index]   ${module}: JSON 解析失败 - ${err.message}`);
    return [];
  }

  /** 优先使用 JSON 内的 moduleId，fallback 到文件名 */
  const resolvedModule = data.moduleId || module;
  /** terms 数组（缺失时视为空数组） */
  const terms = Array.isArray(data.terms) ? data.terms : [];

  return terms.map((term) => ({
    term: term.name || '',
    /** JSON 数据源未分离 english 字段，统一输出空字符串保持输出 schema 一致 */
    english: '',
    definition: term.definition || '',
    module: resolvedModule,
    /** 根据术语 name 动态生成术语级 slug（与 remark-term-link.ts 保持一致） */
    slug: termToSlug(term.name || ''),
  })).filter((entry) => entry.term);
}

/**
 * 主函数：构建术语表索引
 */
async function main() {
  console.log('[build-glossary-index] 开始构建术语表索引...');
  console.log(`[build-glossary-index] 源目录: ${GLOSSARY_DIR}`);

  // 1. 遍历 glossary 目录下的所有 JSON 文件
  const entries = await readdir(GLOSSARY_DIR, { withFileTypes: true });
  const glossaryFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => ({
      module: entry.name.replace(/\.json$/, ''),
      filePath: join(GLOSSARY_DIR, entry.name),
    }));

  console.log(`[build-glossary-index] 发现 ${glossaryFiles.length} 个模块的术语表 JSON`);

  // 2. 并行读取并解析每个 JSON 文件
  const allTerms = [];
  const results = await Promise.all(
    glossaryFiles.map(async ({ module, filePath }) => {
      const terms = await parseGlossaryJsonFile(filePath, module);
      console.log(`[build-glossary-index]   ${module}: ${terms.length} 个术语`);
      return terms;
    }),
  );

  for (const terms of results) {
    allTerms.push(...terms);
  }

  // 3. 构建输出对象
  const output = {
    generatedAt: new Date().toISOString(),
    totalTerms: allTerms.length,
    terms: allTerms,
  };

  // 4. 确保输出目录存在并写入文件
  await mkdir(OUTPUT_DIR, { recursive: true });
  const json = JSON.stringify(output, null, 2);
  await writeFile(OUTPUT_FILE, json, 'utf-8');

  const sizeKB = (Buffer.byteLength(json, 'utf-8') / 1024).toFixed(1);
  console.log('[build-glossary-index] 索引构建完成。');
  console.log(`[build-glossary-index]   术语总数: ${allTerms.length}`);
  console.log(`[build-glossary-index]   文件大小: ${sizeKB} KB`);
  console.log(`[build-glossary-index]   输出路径: ${OUTPUT_FILE}`);
}

main().catch((err) => {
  console.error('[build-glossary-index] 构建失败:', err);
  process.exit(1);
});
