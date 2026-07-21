/**
 * FANDEX 内容质量审计脚本（Phase 11）
 *
 * 功能概述：
 * 扫描 content 目录下所有 .md/.mdx 文档，解析 frontmatter 与正文，
 * 完成 8 项审计维度，输出审计 JSON 到 public/data/content-audit.json，
 * 同时在控制台输出人类可读的审计摘要。
 *
 * 审计维度：
 *   1. 每模块文档数统计（按 frontmatter.module 分组）
 *   2. 缺失 frontmatter 字段统计（title/module 必填）
 *   3. 文档长度分布（<1k / 1k-5k / 5k-10k / >10k 字符）
 *   4. 难度分布（beginner / intermediate / advanced）
 *   5. 标签使用频率 Top 20（按 localeCompare 排序）
 *   6. 含 quiz 的文档数（正文包含 ## 测验 或 ## quiz 章节）
 *   7. 含 prerequisites 的文档数（frontmatter.prerequisites 非空数组）
 *   8. 最近更新时间分布（按 frontmatter.updated 字段，YYYY-MM 分组）
 *
 * 数据源：
 *   - content 目录下所有 .md/.mdx 文档源
 *
 * 输出：
 *   - ./public/data/content-audit.json（结构化审计结果）
 *   - 控制台摘要（8 项关键指标）
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
/** 输出目录 */
const OUTPUT_DIR = join(PROJECT_ROOT, 'public', 'data');
/** 输出文件 */
const OUTPUT_FILE = join(OUTPUT_DIR, 'content-audit.json');

/**
 * 递归遍历目录，对匹配扩展名的文件执行回调
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
 * 提取 frontmatter 之后的正文部分
 * @param {string} content - 文件完整内容
 * @returns {string} 正文（去除 frontmatter）
 */
function extractBody(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return content;
  return content.slice(match[0].length).trim();
}

/**
 * 判断文档长度区间
 * @param {number} length - 文档字符数
 * @returns {string} 区间标签
 */
function lengthBucket(length) {
  if (length < 1000) return '<1k';
  if (length < 5000) return '1k-5k';
  if (length < 10000) return '5k-10k';
  return '>10k';
}

/**
 * 判断正文是否包含 quiz 章节
 * 检测模式：## 测验 / ## quiz / ## Quiz / ## 练习（不区分大小写）
 * @param {string} body - 正文
 * @returns {boolean}
 */
function hasQuiz(body) {
  return /^##\s+(测验|quiz|练习|习题)/im.test(body);
}

/**
 * 从 frontmatter.updated 提取 YYYY-MM 月份
 * 兼容 "2026-06-14" / "2026/06/14" / "2026-06" 等格式
 * @param {string} updated - 更新时间字符串
 * @returns {string|null} 形如 "2026-06"，无法解析时返回 null
 */
function parseMonth(updated) {
  if (!updated || typeof updated !== 'string') return null;
  const m = updated.match(/^(\d{4})[-/](\d{1,2})/);
  if (!m) return null;
  const month = m[2].padStart(2, '0');
  return `${m[1]}-${month}`;
}

/**
 * 主函数：执行 8 项审计并输出结果
 */
async function main() {
  console.log('[content-audit] 开始内容质量审计...');

  // 1. 初始化各维度统计容器
  /** @type {Record<string, number>} 模块 -> 文档数 */
  const moduleDocCount = {};
  /** @type {Array<{file: string, missing: string[]}>} */
  const missingFields = [];
  /** @type {Record<string, number>} 长度区间 -> 计数 */
  const lengthDistribution = { '<1k': 0, '1k-5k': 0, '5k-10k': 0, '>10k': 0 };
  /** @type {Record<string, number>} 难度 -> 计数 */
  const difficultyDistribution = { beginner: 0, intermediate: 0, advanced: 0 };
  /** @type {Record<string, number>} 标签 -> 计数 */
  const tagCount = {};
  let quizCount = 0;
  let prerequisitesCount = 0;
  /** @type {Record<string, number>} 月份 -> 计数 */
  const updatedTimeDistribution = {};
  let totalDocs = 0;

  // 2. 遍历 content 目录下所有 .md/.mdx 文件
  console.log(`[content-audit] 扫描文档目录: ${DOCS_DIR}`);

  await walkDir(DOCS_DIR, ['.md', '.mdx'], async (filePath) => {
    totalDocs += 1;
    const content = await readFile(filePath, 'utf-8');
    const fm = parseFrontmatter(content);
    const body = extractBody(content);

    // 维度 1：每模块文档数（frontmatter.module）
    const moduleId = typeof fm.module === 'string' ? fm.module : '';
    if (moduleId) {
      moduleDocCount[moduleId] = (moduleDocCount[moduleId] || 0) + 1;
    }

    // 维度 2：缺失 frontmatter 字段（title/module 必填）
    const missing = [];
    if (!fm.title) missing.push('title');
    if (!moduleId) missing.push('module');
    if (missing.length > 0) {
      missingFields.push({ file: filePath, missing });
    }

    // 维度 3：文档长度分布（按正文长度，含 frontmatter 后的全部内容）
    const length = body.length;
    const bucket = lengthBucket(length);
    lengthDistribution[bucket] += 1;

    // 维度 4：难度分布
    const diff = typeof fm.difficulty === 'string' ? fm.difficulty : '';
    if (diff && difficultyDistribution[diff] !== undefined) {
      difficultyDistribution[diff] += 1;
    }

    // 维度 5：标签使用频率（tags 数组）
    if (Array.isArray(fm.tags)) {
      for (const tag of fm.tags) {
        if (typeof tag === 'string' && tag.trim()) {
          tagCount[tag.trim()] = (tagCount[tag.trim()] || 0) + 1;
        }
      }
    }

    // 维度 6：含 quiz 的文档数
    if (hasQuiz(body)) {
      quizCount += 1;
    }

    // 维度 7：含 prerequisites 的文档数（frontmatter.prerequisites 非空数组）
    if (Array.isArray(fm.prerequisites) && fm.prerequisites.length > 0) {
      prerequisitesCount += 1;
    }

    // 维度 8：最近更新时间分布
    const month = parseMonth(fm.updated);
    if (month) {
      updatedTimeDistribution[month] = (updatedTimeDistribution[month] || 0) + 1;
    }
  });

  // 3. 整理输出数据结构
  // 维度 1：转为数组并按 docCount 降序
  const modules = Object.entries(moduleDocCount)
    .map(([module, docCount]) => ({ module, docCount }))
    .sort((a, b) => b.docCount - a.docCount);

  // 维度 5：Top 20 标签（先按 count 降序，再按 tag 名称 zh-Hans-CN localeCompare 升序）
  const topTags = Object.entries(tagCount)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.tag.localeCompare(b.tag, 'zh-Hans-CN');
    })
    .slice(0, 20);

  // 维度 8：月份分布转为数组并按月份升序
  const updatedTime = Object.entries(updatedTimeDistribution)
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => a.month.localeCompare(b.month));

  // 4. 组装审计报告
  const report = {
    generatedAt: new Date().toISOString(),
    totalDocs,
    modules,
    missingFields,
    lengthDistribution,
    difficultyDistribution,
    topTags,
    quizCount,
    prerequisitesCount,
    updatedTimeDistribution: updatedTime,
  };

  // 5. 写入 JSON 文件
  await mkdir(OUTPUT_DIR, { recursive: true });
  const json = JSON.stringify(report, null, 2);
  await writeFile(OUTPUT_FILE, json, 'utf-8');
  const sizeKB = (Buffer.byteLength(json, 'utf-8') / 1024).toFixed(1);

  // 6. 控制台摘要输出
  console.log('\n+----------------------------------------------+');
  console.log('|       FANDEX Content Audit Summary           |');
  console.log('+----------------------------------------------+');
  console.log(`  文档总数: ${totalDocs}`);
  console.log(`  覆盖模块数: ${modules.length}`);
  console.log(`  缺失 frontmatter 文档数: ${missingFields.length}`);
  console.log('  文档长度分布:');
  console.log(`    <1k      : ${lengthDistribution['<1k']}`);
  console.log(`    1k-5k    : ${lengthDistribution['1k-5k']}`);
  console.log(`    5k-10k   : ${lengthDistribution['5k-10k']}`);
  console.log(`    >10k     : ${lengthDistribution['>10k']}`);
  console.log('  难度分布:');
  console.log(`    beginner     : ${difficultyDistribution.beginner}`);
  console.log(`    intermediate : ${difficultyDistribution.intermediate}`);
  console.log(`    advanced     : ${difficultyDistribution.advanced}`);
  console.log(`  含 quiz 文档数: ${quizCount}`);
  console.log(`  含 prerequisites 文档数: ${prerequisitesCount}`);
  console.log(`  Top 5 标签:`);
  topTags.slice(0, 5).forEach((t) => {
    console.log(`    ${t.tag}: ${t.count}`);
  });
  console.log(
    `  更新时间范围: ${
      updatedTime.length > 0
        ? `${updatedTime[0].month} ~ ${updatedTime[updatedTime.length - 1].month}（共 ${updatedTime.length} 个月份）`
        : '无数据'
    }`,
  );
  console.log('+----------------------------------------------+');
  console.log(`[content-audit] 审计完成。`);
  console.log(`[content-audit]   输出路径: ${OUTPUT_FILE}`);
  console.log(`[content-audit]   文件大小: ${sizeKB} KB`);
}

main().catch((err) => {
  console.error('[content-audit] 审计失败:', err);
  process.exit(1);
});
