#!/usr/bin/env node
/**
 * FANDEX Frontmatter 字段批量补全脚本（Phase 1.5）
 *
 * 功能概述：
 * 扫描 cnt-content/full 下所有 .md 文件，针对 Phase 1.5 新增字段
 * 进行批量补全。所有补全操作均向后兼容，保留现有字段不变。
 *
 * 补全规则：
 * - learningObjectives：缺失时根据标题生成 3 条默认目标（Bloom: remember/understand/apply）
 * - references：缺失时根据 module 字段推断 1 条权威来源（预设映射表）
 * - lastReviewed：缺失时优先使用 updated 字段，否则使用当前日期
 * - reviewer：缺失时默认填 'fanquanpp'
 *
 * CLI 用法：
 *   node scripts/backfill-frontmatter.mjs [--dry-run] [--module <module-id>]
 *
 * 参数说明：
 *   --dry-run           只输出预览，不写入文件
 *   --module <id>       只处理指定模块（如 --module cpp）
 *
 * 设计约束：
 * - 不安装新依赖，仅使用 Node.js 内置 fs/path 模块
 * - 使用简单正则解析 frontmatter，不依赖 gray-matter
 * - 保留所有现有字段不变，仅在末尾追加缺失字段
 *
 * 偏差报备（仓库整理后路径变更）：
 * - 原：app-web/src/content/docs（已删除）
 * - 新：cnt-content/full（单仓库根目录下的统一内容源）
 */

import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/** 当前脚本所在目录 */
const __dirname = dirname(fileURLToPath(import.meta.url));
/** 单仓库根目录（app-web 的上一级） */
const MONO_ROOT = join(__dirname, '..', '..');

// ============================================================
// 常量定义
// ============================================================

/** 文档根目录（单仓库统一内容源） */
const DOCS_DIR = join(MONO_ROOT, 'cnt-content', 'full');
/** 默认审阅人 */
const DEFAULT_REVIEWER = 'fanquanpp';
/** Frontmatter 边界正则 */
const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---(\r?\n)?/;

// ============================================================
// 模块 → 默认参考文献映射表
// 每个模块预设 1 条 ACM Reference Format 风格的权威来源
// ============================================================

/**
 * @typedef {Object} DefaultReference
 * @property {string} type - 参考文献类型（与 schema 枚举一致）
 * @property {string[]} authors - 作者列表
 * @property {number} year - 出版年份
 * @property {string} title - 文献标题
 * @property {string} venue - 出版场所
 * @property {string} [url] - 在线访问 URL
 * @property {string} [version] - 版本号（适用于标准/文档）
 */

/** @type {Record<string, DefaultReference>} */
const MODULE_REFERENCES = {
  cpp: {
    type: 'standard',
    authors: ['ISO/IEC'],
    year: 2023,
    title: 'ISO/IEC 14882:2023 — Programming languages — C++',
    venue: 'International Organization for Standardization',
    url: 'https://www.iso.org/standard/83626.html',
  },
  c: {
    type: 'standard',
    authors: ['ISO/IEC'],
    year: 2023,
    title: 'ISO/IEC 9899:2023 — Programming languages — C',
    venue: 'International Organization for Standardization',
  },
  algorithm: {
    type: 'book',
    authors: ['Cormen, T. H.', 'Leiserson, C. E.', 'Rivest, R. L.', 'Stein, C.'],
    year: 2022,
    title: 'Introduction to Algorithms',
    venue: 'MIT Press',
    version: '4th',
  },
  calculus: {
    type: 'book',
    authors: ['Spivak, M.'],
    year: 2008,
    title: 'Calculus',
    venue: 'Publish or Perish',
    version: '4th',
  },
  go: {
    type: 'documentation',
    authors: ['The Go Authors'],
    year: 2024,
    title: 'The Go Programming Language Specification',
    venue: 'Google LLC',
    url: 'https://go.dev/ref/spec',
    version: '1.22',
  },
  python: {
    type: 'documentation',
    authors: ['Python Software Foundation'],
    year: 2024,
    title: 'The Python Tutorial',
    venue: 'python.org',
    url: 'https://docs.python.org/3/tutorial/',
    version: '3.12',
  },
  javascript: {
    type: 'standard',
    authors: ['Ecma International'],
    year: 2024,
    title: 'ECMAScript 2024 Language Specification',
    venue: 'ECMA-262',
    url: 'https://tc39.es/ecma262/',
    version: '15th',
  },
  typescript: {
    type: 'documentation',
    authors: ['Microsoft'],
    year: 2024,
    title: 'The TypeScript Handbook',
    venue: 'Microsoft',
    url: 'https://www.typescriptlang.org/docs/handbook/',
    version: '5.x',
  },
  rust: {
    type: 'documentation',
    authors: ['The Rust Team'],
    year: 2024,
    title: 'The Rust Reference',
    venue: 'rust-lang.org',
    url: 'https://doc.rust-lang.org/reference/',
    version: '1.75',
  },
  java: {
    type: 'standard',
    authors: ['Oracle'],
    year: 2024,
    title: 'The Java Language Specification',
    venue: 'Oracle',
    url: 'https://docs.oracle.com/javase/specs/',
    version: '21',
  },
  csharp: {
    type: 'standard',
    authors: ['ECMA International'],
    year: 2022,
    title: 'C# Language Specification',
    venue: 'ECMA-334',
    url: 'https://ecma-international.org/publications-and-standards/standards/ecma-334/',
    version: '6th',
  },
  git: {
    type: 'book',
    authors: ['Chacon, S.', 'Straub, B.'],
    year: 2023,
    title: 'Pro Git',
    venue: 'Apress',
    url: 'https://git-scm.com/book/en/v2',
    version: '2nd',
  },
  github: {
    type: 'documentation',
    authors: ['GitHub, Inc.'],
    year: 2024,
    title: 'GitHub Docs',
    venue: 'GitHub',
    url: 'https://docs.github.com/',
  },
  html5: {
    type: 'standard',
    authors: ['WHATWG'],
    year: 2024,
    title: 'HTML Living Standard',
    venue: 'Web Hypertext Application Technology Working Group',
    url: 'https://html.spec.whatwg.org/',
  },
  css: {
    type: 'documentation',
    authors: ['W3C'],
    year: 2024,
    title: 'CSS Snapshot',
    venue: 'World Wide Web Consortium',
    url: 'https://www.w3.org/TR/CSS/',
  },
  devops: {
    type: 'book',
    authors: ['Beyer, B.', 'Jones, C.', 'Petoff, J.', 'Murphy, N. R.'],
    year: 2016,
    title: 'Site Reliability Engineering',
    venue: "O'Reilly",
    url: 'https://sre.google/sre-book/table-of-contents/',
  },
  agent: {
    type: 'book',
    authors: ['Russell, S.', 'Norvig, P.'],
    year: 2021,
    title: 'Artificial Intelligence: A Modern Approach',
    venue: 'Pearson',
    version: '4th',
  },
  'ai-ethics': {
    type: 'technical-report',
    authors: ['Jobin, A.', 'Ienca, M.', 'Vayena, E.'],
    year: 2019,
    title: 'The Global Landscape of AI Ethics Guidelines',
    venue: 'Nature Machine Intelligence',
  },
  'big-data': {
    type: 'book',
    authors: ['Kleppmann, M.'],
    year: 2017,
    title: 'Designing Data-Intensive Applications',
    venue: "O'Reilly",
  },
  english: {
    type: 'book',
    authors: ['Swales, J. M.', 'Feak, C. B.'],
    year: 2012,
    title: 'Academic Writing for Graduate Students',
    venue: 'University of Michigan Press',
    version: '3rd',
  },
  harmonyos: {
    type: 'documentation',
    authors: ['Huawei'],
    year: 2024,
    title: 'HarmonyOS Developer Documentation',
    venue: 'Huawei',
    url: 'https://developer.harmonyos.com/',
  },
  iot: {
    type: 'book',
    authors: ['Bhattacharyya, S. S.'],
    year: 2022,
    title: 'Internet of Things: A Hands-On Approach',
    venue: 'River Publishers',
  },
  // 兜底默认（用于未在映射表中的模块）
  _default: {
    type: 'documentation',
    authors: ['FANDEX Project'],
    year: 2026,
    title: 'FANDEX 自学知识体系',
    venue: 'FANDEX-Web',
    url: 'https://github.com/fanquanpp/FANDEX-Web',
  },
};

// ============================================================
// 工具函数
// ============================================================

/**
 * 根据模块 ID 获取默认参考文献
 * @param {string} moduleId - 模块标识符
 * @returns {DefaultReference} 默认参考文献条目
 */
function getDefaultReference(moduleId) {
  return MODULE_REFERENCES[moduleId] || MODULE_REFERENCES._default;
}

/**
 * 根据文档标题生成 3 条默认学习目标
 * 覆盖 Bloom 分类法的 remember/understand/apply 三个基础层次
 * @param {string} title - 文档标题
 * @returns {string[]} 学习目标列表（3 条）
 */
function generateLearningObjectives(title) {
  // 移除标题中可能的英文括注与多余空白，保留中文核心
  const cleanTitle = title.replace(/[（(].*?[)）]/g, '').trim();
  return [
    `理解 ${cleanTitle}的基本概念与术语`,
    `掌握 ${cleanTitle}的核心原理与机制`,
    `能够应用 ${cleanTitle}解决实际问题`,
  ];
}

/**
 * 获取当前日期（YYYY-MM-DD 格式）
 * @returns {string} 当前日期字符串
 */
function getCurrentDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 从 frontmatter 文本中提取指定字段的值
 * 支持简单 key: value 形式与带引号形式
 * @param {string} fm - frontmatter 文本块
 * @param {string} key - 字段名
 * @returns {string|null} 字段值（字符串原样），未找到返回 null
 */
function extractField(fm, key) {
  // 匹配 `key: value` 形式，value 可带引号
  const re = new RegExp(`^${key}:\\s*(.+?)\\s*$`, 'm');
  const m = fm.match(re);
  if (!m) return null;
  let v = m[1];
  // 去除单/双引号
  if ((v.startsWith("'") && v.endsWith("'")) || (v.startsWith('"') && v.endsWith('"'))) {
    v = v.slice(1, -1);
  }
  return v;
}

/**
 * 检测 frontmatter 中是否存在某个字段（无论其值是否为空）
 * 仅做行首存在性检测，不解析值
 * @param {string} fm - frontmatter 文本块
 * @param {string} key - 字段名
 * @returns {boolean} 是否存在
 */
function hasField(fm, key) {
  const re = new RegExp(`^${key}:`, 'm');
  return re.test(fm);
}

/**
 * 将参考文献对象格式化为 YAML 块
 * @param {DefaultReference} ref - 参考文献对象
 * @param {string} indent - 缩进前缀（通常为 '  '）
 * @returns {string} YAML 格式的参考文献块
 */
function formatReferenceYaml(ref, indent) {
  const lines = [];
  lines.push(`${indent}- type: ${ref.type}`);
  lines.push(`${indent}  authors:`);
  if (ref.authors.length === 0) {
    lines.push(`${indent}  []`);
  } else {
    ref.authors.forEach((a) => {
      lines.push(`${indent}  - ${JSON.stringify(a)}`);
    });
  }
  lines.push(`${indent}  year: ${ref.year}`);
  lines.push(`${indent}  title: ${JSON.stringify(ref.title)}`);
  lines.push(`${indent}  venue: ${JSON.stringify(ref.venue)}`);
  if (ref.volume) lines.push(`${indent}  volume: ${ref.volume}`);
  if (ref.issue) lines.push(`${indent}  issue: ${ref.issue}`);
  if (ref.pages) lines.push(`${indent}  pages: ${JSON.stringify(ref.pages)}`);
  if (ref.doi) lines.push(`${indent}  doi: ${JSON.stringify(ref.doi)}`);
  if (ref.url) lines.push(`${indent}  url: ${JSON.stringify(ref.url)}`);
  if (ref.version) lines.push(`${indent}  version: ${JSON.stringify(ref.version)}`);
  return lines.join('\n');
}

/**
 * 构造要追加的 frontmatter 字段文本块
 * @param {Object} params - 待补全字段集合
 * @param {string[]} params.learningObjectives - 学习目标列表
 * @param {DefaultReference} params.reference - 参考文献条目
 * @param {string} params.lastReviewed - 最后审阅日期（YYYY-MM-DD）
 * @param {string} params.reviewer - 审阅人
 * @returns {string} YAML 文本块（不含尾随换行）
 */
function buildAppendBlock(params) {
  const lines = [];

  // learningObjectives（数组）
  if (params.learningObjectives) {
    lines.push('learningObjectives:');
    params.learningObjectives.forEach((o) => {
      lines.push(`  - ${JSON.stringify(o)}`);
    });
  }

  // references（对象数组）
  if (params.reference) {
    lines.push('references:');
    lines.push(formatReferenceYaml(params.reference, '  '));
  }

  // lastReviewed（日期字符串，用单引号包裹以保持与现有 updated 字段一致）
  if (params.lastReviewed) {
    lines.push(`lastReviewed: '${params.lastReviewed}'`);
  }

  // reviewer（字符串）
  if (params.reviewer) {
    lines.push(`reviewer: ${JSON.stringify(params.reviewer)}`);
  }

  return lines.join('\n');
}

// ============================================================
// 核心补全逻辑
// ============================================================

/**
 * 处理单个 Markdown 文件
 * @param {string} filePath - 文件绝对/相对路径
 * @param {boolean} dryRun - 是否仅预览不写入
 * @param {Object} stats - 统计计数对象（引用传递，累计字段计数）
 * @returns {{filled: string[], skipped: boolean}} 补全的字段列表与是否跳过
 */
function processFile(filePath, dryRun, stats) {
  const raw = readFileSync(filePath, 'utf-8');
  const match = raw.match(FRONTMATTER_RE);
  if (!match) {
    stats.skippedNoFm++;
    return { filled: [], skipped: true };
  }

  const fmText = match[1];
  const fmClosing = match[0]; // 完整的 `---\n...\n---\n` 块
  const tail = raw.slice(fmClosing.length); // frontmatter 之后的正文

  // 提取标题与模块（用于生成默认值）
  const titleRaw = extractField(fmText, 'title');
  const title = titleRaw || '';
  const moduleRaw = extractField(fmText, 'module');
  const moduleId = moduleRaw || '';

  /** @type {string[]} 待补全字段名 */
  const toFill = [];

  // 1) learningObjectives
  if (!hasField(fmText, 'learningObjectives')) {
    toFill.push('learningObjectives');
  }

  // 2) references
  if (!hasField(fmText, 'references')) {
    toFill.push('references');
  }

  // 3) lastReviewed
  if (!hasField(fmText, 'lastReviewed')) {
    toFill.push('lastReviewed');
  }

  // 4) reviewer
  if (!hasField(fmText, 'reviewer')) {
    toFill.push('reviewer');
  }

  // 没有需要补全的字段
  if (toFill.length === 0) {
    stats.skippedComplete++;
    return { filled: [], skipped: true };
  }

  // 构造补全参数
  const params = {};
  if (toFill.includes('learningObjectives')) {
    params.learningObjectives = generateLearningObjectives(title);
    stats.learningObjectives++;
  }
  if (toFill.includes('references')) {
    params.reference = getDefaultReference(moduleId);
    stats.references++;
  }
  if (toFill.includes('lastReviewed')) {
    // 优先使用 updated 字段，否则当前日期
    const updated = extractField(fmText, 'updated');
    params.lastReviewed = updated || getCurrentDate();
    stats.lastReviewed++;
  }
  if (toFill.includes('reviewer')) {
    params.reviewer = DEFAULT_REVIEWER;
    stats.reviewer++;
  }

  const appendBlock = buildAppendBlock(params);

  // 重新拼装 frontmatter：在原 fmText 末尾追加新字段，
  // 然后用 `---\n` 闭合
  // 注意：原 fmText 末尾可能没有换行，统一追加换行确保 YAML 格式正确
  const newFmText = fmText.replace(/\s+$/, '') + '\n' + appendBlock + '\n';
  const newFmBlock = `---\n${newFmText}---\n`;
  const newRaw = newFmBlock + tail;

  if (!dryRun) {
    writeFileSync(filePath, newRaw, 'utf-8');
  }

  stats.filled++;
  toFill.forEach((f) => {
    if (!stats.byField[f]) stats.byField[f] = 0;
    stats.byField[f]++;
  });

  return { filled: toFill, skipped: false };
}

/**
 * 递归遍历目录，收集所有 .md 文件路径
 * @param {string} dir - 起始目录
 * @returns {string[]} 所有 .md 文件路径
 */
function collectMarkdownFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectMarkdownFiles(full));
    } else if (entry.name.endsWith('.md')) {
      results.push(full);
    }
  }
  return results;
}

// ============================================================
// CLI 入口
// ============================================================

/**
 * 解析命令行参数
 * @param {string[]} argv - process.argv.slice(2)
 * @returns {{dryRun: boolean, module: string|null}}
 */
function parseArgs(argv) {
  const opts = { dryRun: false, module: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') {
      opts.dryRun = true;
    } else if (a === '--module') {
      const v = argv[i + 1];
      if (!v || v.startsWith('--')) {
        console.error('错误：--module 需要一个参数值');
        process.exit(2);
      }
      opts.module = v;
      i++;
    } else {
      console.error(`未知参数：${a}`);
      console.error('用法：node scripts/backfill-frontmatter.mjs [--dry-run] [--module <id>]');
      process.exit(2);
    }
  }
  return opts;
}

/**
 * 主函数
 */
function main() {
  const opts = parseArgs(process.argv.slice(2));
  // DOCS_DIR 已为绝对路径（基于脚本位置计算的单仓库统一内容源）
  const docsRoot = DOCS_DIR;

  if (!existsSync(docsRoot)) {
    console.error(`错误：文档目录不存在：${docsRoot}`);
    process.exit(1);
  }

  console.log('=== FANDEX Frontmatter 字段补全脚本 ===');
  console.log(`文档根目录：${docsRoot}`);
  console.log(`模式：${opts.dryRun ? 'DRY-RUN（预览）' : '写入'}`);
  if (opts.module) console.log(`模块过滤：${opts.module}`);
  console.log('');

  // 收集目标文件
  let files = collectMarkdownFiles(docsRoot);
  if (opts.module) {
    // 过滤逻辑匹配 cnt-content/full/<module>/ 路径结构
    files = files.filter((f) => f.replace(/\\/g, '/').includes(`/full/${opts.module}/`));
  }

  console.log(`待扫描文件数：${files.length}\n`);

  // 初始化统计对象
  const stats = {
    filled: 0, // 成功补全的文件数
    skippedComplete: 0, // 已完整无需补全的文件数
    skippedNoFm: 0, // 缺少 frontmatter 的文件数
    learningObjectives: 0,
    references: 0,
    lastReviewed: 0,
    reviewer: 0,
    byField: {},
  };

  // 预览模式下的前 N 条样本输出
  const PREVIEW_LIMIT = 5;
  const previews = [];

  for (const f of files) {
    const result = processFile(f, opts.dryRun, stats);
    if (!result.skipped && opts.dryRun && previews.length < PREVIEW_LIMIT) {
      previews.push({ file: f, filled: result.filled });
    }
  }

  // 输出统计报告
  console.log('--- 补全统计 ---');
  console.log(`扫描文件总数：${files.length}`);
  console.log(`成功补全文件数：${stats.filled}`);
  console.log(`已完整跳过文件数：${stats.skippedComplete}`);
  console.log(`缺少 frontmatter 跳过：${stats.skippedNoFm}`);
  console.log('');
  console.log('各字段补全次数：');
  console.log(`  learningObjectives : ${stats.learningObjectives}`);
  console.log(`  references         : ${stats.references}`);
  console.log(`  lastReviewed       : ${stats.lastReviewed}`);
  console.log(`  reviewer           : ${stats.reviewer}`);

  if (opts.dryRun && previews.length > 0) {
    console.log('\n--- 预览样本（前 ' + PREVIEW_LIMIT + ' 条）---');
    previews.forEach((p, idx) => {
      console.log(`[${idx + 1}] ${p.file}`);
      console.log(`     将补全字段：${p.filled.join(', ')}`);
    });
    if (stats.filled > PREVIEW_LIMIT) {
      console.log(`  ... 还有 ${stats.filled - PREVIEW_LIMIT} 个文件未展示`);
    }
  }

  console.log('\n完成。');
}

main();
