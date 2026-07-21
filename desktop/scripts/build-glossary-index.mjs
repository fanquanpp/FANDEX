/**
 * FANDEX 术语表索引构建脚本（Phase 11）
 *
 * 功能概述：
 * 遍历 ./src/content/glossary/<module>/glossary.md 文件（27 个模块），
 * 解析 YAML frontmatter 获取 title 与 module，解析 Markdown 表格行
 * （术语、英文、释义三列），构建术语映射表并输出为 JSON 索引文件。
 *
 * 数据源：./src/content/glossary/<module>/glossary.md
 * 输出：./public/data/glossary-index.json
 *
 * 输出格式：
 * {
 *   "generatedAt": "2026-07-19T...",
 *   "totalTerms": 500,
 *   "terms": [
 *     { "term": "DOM", "english": "Document Object Model",
 *       "definition": "...", "module": "javascript", "slug": "dom" }
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
/** 术语表源目录（每个子目录包含一个 glossary.md） */
const GLOSSARY_DIR = join(PROJECT_ROOT, 'src', 'content', 'glossary');
/** 索引输出目录 */
const OUTPUT_DIR = join(PROJECT_ROOT, 'public', 'data');
/** 索引输出文件 */
const OUTPUT_FILE = join(OUTPUT_DIR, 'glossary-index.json');

/**
 * 解析 Markdown 文件的 frontmatter（简易 YAML 解析器）
 * 仅支持键值对，足够处理 glossary.md 的 title 与 module 字段
 *
 * @param {string} content - Markdown 文件完整内容
 * @returns {Object} frontmatter 键值对
 */
function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const raw = match[1];
  const data = {};
  for (const line of raw.split(/\r?\n/)) {
    const kvMatch = line.match(/^(\w[\w-]*):\s*(.*)$/);
    if (kvMatch) {
      const k = kvMatch[1];
      const v = kvMatch[2].trim().replace(/^['"]|['"]$/g, '');
      if (v) data[k] = v;
    }
  }
  return data;
}

/**
 * 将术语文本转换为 URL 友好的 slug
 * 优先使用英文术语（如包含 ASCII 字符），否则使用原术语名编码
 *
 * @param {string} term - 中文或英文术语
 * @param {string} english - 英文术语
 * @returns {string} URL 友好的 slug
 */
function termToSlug(term, english) {
  // 优先使用英文术语生成 slug
  const source = english && /^[a-zA-Z0-9\s\-_./]+$/.test(english) ? english : term;
  return source
    .toLowerCase()
    .replace(/[/\\]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * 从 Markdown 正文解析术语表格行
 *
 * 表格格式示例：
 * | 术语     | 英文       | 释义           |
 * | -------- | ---------- | -------------- |
 * | 抽象语法树 | AST        | 树形代码表示   |
 *
 * 解析逻辑：
 * 1. 跳过表头行（含 "术语" 列名）
 * 2. 跳过分隔行（仅含 - 与 |）
 * 3. 拆分每行为三列：术语、英文、释义
 *
 * @param {string} body - frontmatter 之后的 Markdown 正文
 * @returns {Array<{term: string, english: string, definition: string}>} 术语数组
 */
function parseGlossaryTables(body) {
  const terms = [];
  const lines = body.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    // 仅处理表格行（以 | 开头和结尾）
    if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) continue;
    // 跳过分隔行（如 | --- | --- |）
    if (/^\|[\s\-:|]+\|$/i.test(trimmed)) continue;
    // 跳过表头行（包含 "术语" 或 "term" 字样）
    if (/术语|term/i.test(trimmed) && /英文|english/i.test(trimmed)) continue;

    // 拆分列
    const cells = trimmed
      .slice(1, -1) // 去除首尾 |
      .split('|')
      .map((c) => c.trim().replace(/^['"]|['"]$/g, ''));

    if (cells.length < 3) continue;

    const term = cells[0];
    const english = cells[1];
    const definition = cells[2];

    // 跳过空术语
    if (!term) continue;
    // 跳过明显的表头残留（"---" 之类）
    if (/^-+$/.test(term)) continue;

    terms.push({ term, english, definition });
  }

  return terms;
}

/**
 * 从 Markdown 正文解析多段标题格式术语条目
 *
 * 标题格式示例（git/markdown 术语表使用）：
 * ### 1.1 Markdown
 *
 * **名称**：Markdown 标记语言（Markdown）
 *
 * **首次出现位置**：C09_101-Markdown概述.md 第1章
 *
 * **定义**：
 * Markdown 是 John Gruber 于 2004 年创建的轻量级标记语言...
 *
 * **详解**：
 * 设计哲学：可读性优先...
 *
 * 解析逻辑：
 * 1. 识别 ### N.N [标题] 行作为术语条目起点
 * 2. 提取 **名称**：字段（可能包含 中文（English） 或 English（中文） 格式）
 * 3. 提取 **定义**：字段（可能跨多行直到下一个 ** 字段或 ---）
 *
 * @param {string} body - frontmatter 之后的 Markdown 正文
 * @returns {Array<{term: string, english: string, definition: string}>} 术语数组
 */
function parseGlossaryHeadings(body) {
  const terms = [];
  const lines = body.split('\n');
  /** 术语条目起点正则：### 数字.数字 [可选标题] */
  const HEADING_RE = /^###\s+\d+(?:\.\d+)+\s*(.*?)\s*$/;
  /** 字段标记正则：**字段名**：值 */
  const FIELD_RE = /^\*\*([^*]+?)\*\*[：:]\s*(.*)$/;

  /** 当前正在构建的术语条目 */
  let current = null;
  /** 当前正在收集的字段名 */
  let currentField = null;

  /**
   * 从名称字段中分离中文术语与英文术语
   * 支持格式：
   * - "中文（English）" 或 "中文（English / 别名）"
   * - "English（中文）" 或 "English (中文)"
   * - 纯中英文混合
   */
  const splitName = (raw) => {
    if (!raw) return { term: '', english: '' };
    const trimmed = raw.trim();
    // 匹配 "中文（English）" 或 "中文（English / 别名）"
    const cnEn = trimmed.match(/^([^(（]+)[(（]([^)）]+)[)）]/);
    if (cnEn) {
      const cn = cnEn[1].trim();
      const en = cnEn[2].split(/[/／]/)[0].trim();
      // 判断括号内是否为英文（含 ASCII 字母）
      const isEn = /[A-Za-z]/.test(en);
      // 判断括号外是否为英文
      const cnIsEn = /^[A-Za-z0-9\s\-_.]+$/.test(cn);
      if (isEn && !cnIsEn) return { term: cn, english: en };
      if (!isEn && cnIsEn) return { term: en, english: cn };
      // 默认：括号外为 term，括号内为 english
      return { term: cn, english: en };
    }
    // 无括号：整体作为 term，若纯英文则同时作为 english
    const isPureEn = /^[A-Za-z0-9\s\-_.]+$/.test(trimmed);
    return isPureEn ? { term: trimmed, english: trimmed } : { term: trimmed, english: '' };
  };

  /** 将当前条目（若已收集到名称）推入结果数组 */
  const flush = () => {
    if (current?.term) {
      terms.push({
        term: current.term,
        english: current.english || '',
        definition: current.definition || '',
      });
    }
    current = null;
    currentField = null;
  };

  for (const line of lines) {
    const trimmed = line.trim();
    const headingMatch = trimmed.match(HEADING_RE);
    if (headingMatch) {
      // 遇到新术语条目标题，先保存上一个
      flush();
      current = { term: '', english: '', definition: '' };
      // 标题中的文本作为 fallback term（若名称字段缺失）
      const headingText = headingMatch[1] || '';
      if (headingText) {
        const split = splitName(headingText);
        current.term = split.term;
        current.english = split.english;
      }
      currentField = null;
      continue;
    }

    if (!current) continue;

    // 遇到分隔线 --- 时结束当前条目
    if (/^-{3,}$/.test(trimmed)) {
      flush();
      continue;
    }

    // 二级分类标题（## N. 分类名）也作为条目结束标志
    if (/^##\s+\d/.test(trimmed)) {
      flush();
      continue;
    }

    // 检测字段标记 **字段名**：值
    const fieldMatch = trimmed.match(FIELD_RE);
    if (fieldMatch) {
      const fieldName = fieldMatch[1].trim();
      const fieldValue = fieldMatch[2].trim();
      if (fieldName === '名称') {
        const split = splitName(fieldValue);
        if (split.term) current.term = split.term;
        if (split.english) current.english = split.english;
        currentField = 'name';
      } else if (fieldName === '英文' || fieldName === 'English') {
        current.english = fieldValue;
        currentField = 'english';
      } else if (fieldName === '定义') {
        // 定义字段可能为空，后续行才是实际定义内容
        current.definition = fieldValue;
        currentField = 'definition';
      } else {
        // 其他字段（详解、首次出现位置等）不收集，但标记切换
        currentField = fieldName;
      }
      continue;
    }

    // 普通文本行：若当前处于 definition 字段，则追加到定义
    if (currentField === 'definition' && trimmed) {
      current.definition = current.definition ? `${current.definition} ${trimmed}` : trimmed;
    }
  }

  // 文件结束时保存最后一个条目
  flush();

  return terms;
}

/**
 * 综合解析术语表：优先尝试表格格式，再尝试多段标题格式
 * 两种格式不会在同一文件中混用，因此按优先级回退即可
 *
 * @param {string} body - frontmatter 之后的 Markdown 正文
 * @returns {Array<{term: string, english: string, definition: string}>} 术语数组
 */
function parseGlossary(body) {
  const tableTerms = parseGlossaryTables(body);
  if (tableTerms.length > 0) return tableTerms;
  return parseGlossaryHeadings(body);
}

/**
 * 主函数：构建术语表索引
 */
async function main() {
  console.log('[build-glossary-index] 开始构建术语表索引...');
  console.log(`[build-glossary-index] 源目录: ${GLOSSARY_DIR}`);

  // 1. 遍历 glossary 目录下的所有子目录
  const moduleDirs = await readdir(GLOSSARY_DIR, { withFileTypes: true });
  const glossaryFiles = moduleDirs
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({
      module: entry.name,
      filePath: join(GLOSSARY_DIR, entry.name, 'glossary.md'),
    }));

  console.log(`[build-glossary-index] 发现 ${glossaryFiles.length} 个模块的 glossary.md`);

  // 2. 并行读取并解析每个 glossary.md
  const allTerms = [];
  const results = await Promise.all(
    glossaryFiles.map(async ({ module, filePath }) => {
      try {
        const content = await readFile(filePath, 'utf-8');
        const fm = parseFrontmatter(content);
        // 去除 frontmatter 之后的正文
        const body = content.replace(/^---\r?\n[\s\S]*?\r?\n---/, '').trim();
        const terms = parseGlossary(body);

        console.log(
          `[build-glossary-index]   ${module}: ${terms.length} 个术语（标题: ${fm.title || '未命名'}）`,
        );

        return terms.map((t) => ({
          term: t.term,
          english: t.english,
          definition: t.definition,
          module,
          slug: termToSlug(t.term, t.english),
        }));
      } catch (err) {
        console.warn(`[build-glossary-index]   ${module}: 读取失败 - ${err.message}`);
        return [];
      }
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
