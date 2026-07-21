/**
 * FANDEX 内容质量审计脚本
 *
 * 功能概述：
 * 扫描 src/content/docs 下所有 .md 文件，检查 frontmatter 完整性、
 * 正文质量、过时关键词、内部链接格式、Wiki 链接使用等问题。
 * 按严重程度（high/medium/low）分类输出审计报告，
 * 存在 high 级别问题时以非零退出码退出。
 *
 * 检查项：
 * - frontmatter 缺失
 * - 标题、模块、排序号、难度缺失
 * - 正文过短（< 30 字符）
 * - 过时关键词检测
 * - 长文档缺少前置知识/学习目标
 * - 内部链接格式（非 http/#/mailto 开头）
 * - Wiki 链接格式（[[...]]）
 * - [Phase 1.5] schema 完整性：检测新增字段缺失并统计覆盖率
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** 文档根目录 */
const DOCS = 'src/content/docs';
/** 问题收集数组 */
const issues = [];

// ============================================================
// Phase 1.5：schema 完整性审计
// ============================================================

/**
 * Phase 1.5 新增字段列表
 * 用于检测每篇文档是否已补全这些字段
 */
const SCHEMA_FIELDS = ['learningObjectives', 'references', 'lastReviewed', 'reviewer'];

/**
 * schema 缺失问题收集数组
 * 每条结构：{ file, slug, missing: string[] }
 */
const schemaIssues = [];

/**
 * schema 字段覆盖率统计
 * key 为字段名，value 为已包含该字段的文档数
 */
const schemaCoverage = Object.fromEntries(SCHEMA_FIELDS.map((f) => [f, 0]));

/** schema 审计维度扫描的文档总数 */
let schemaTotalDocs = 0;

/**
 * 检测 frontmatter 文本块中是否存在指定字段
 * 仅做行首存在性检测，不解析值
 * @param {string} fm - frontmatter 文本块
 * @param {string} key - 字段名
 * @returns {boolean} 是否存在
 */
function hasSchemaField(fm, key) {
  const re = new RegExp(`^${key}:`, 'm');
  return re.test(fm);
}

/**
 * 从文件路径推断文档 slug（相对 docs 目录且去扩展名）
 * @param {string} full - 文件完整路径
 * @returns {string} 文档 slug
 */
function pathToSlug(full) {
  const norm = full.replace(/\\/g, '/');
  const idx = norm.indexOf('/docs/');
  if (idx === -1) return norm;
  return norm.slice(idx + '/docs/'.length).replace(/\.md$/, '');
}

/**
 * 过时关键词配置
 * 每项包含：关键词、建议修复方式、严重程度
 */
const OUTDATED_KEYWORDS = [
  { keyword: 'actions-gh-pages@v3', fix: 'actions-gh-pages@v4', severity: 'high' },
  { keyword: 'matplotlib.pyplot.show()', fix: '保存为图片文件', severity: 'medium' },
  { keyword: 'Thread.sleep()', fix: '使用虚拟线程/Project Loom', severity: 'low' },
];

/**
 * 递归遍历目录，对所有 .md 文件执行内容审计
 * @param {string} dir - 要扫描的目录路径
 */
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory())
      walk(full); // 递归子目录
    else if (entry.name.endsWith('.md')) {
      const raw = readFileSync(full, 'utf-8');

      // 解析 frontmatter
      const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      if (!match) {
        issues.push({ file: full, issue: 'NO_FRONTMATTER', severity: 'high' });
        continue;
      }

      const fm = match[1];
      const body = raw.slice(match[0].length).trim(); // frontmatter 之后的正文

      // ============================================================
      // Phase 1.5：schema 完整性检测
      // ============================================================
      schemaTotalDocs++;
      const missingFields = SCHEMA_FIELDS.filter((f) => !hasSchemaField(fm, f));
      // 更新覆盖率（已包含该字段的文档计数 +1）
      SCHEMA_FIELDS.forEach((f) => {
        if (!missingFields.includes(f)) schemaCoverage[f]++;
      });
      // 记录缺失字段清单（仅当有缺失时）
      if (missingFields.length > 0) {
        schemaIssues.push({
          file: full,
          slug: pathToSlug(full),
          missing: missingFields,
        });
      }

      // 提取 frontmatter 各字段
      const titleLine = fm.match(/title:\s*["']?(.*?)["']?\s*$/m);
      const title = titleLine ? titleLine[1] : '';
      const modLine = fm.match(/module:\s*["']?(.*?)["']?\s*$/m);
      const mod = modLine ? modLine[1] : '';
      const orderLine = fm.match(/order:\s*(\d+)/m);
      const order = orderLine ? orderLine[1] : '';
      const diffLine = fm.match(/difficulty:\s*["']?(.*?)["']?\s*$/m);
      const diff = diffLine ? diffLine[1] : '';

      // 检查 frontmatter 必填字段
      if (!title || title === '#')
        issues.push({ file: full, issue: `BAD_TITLE: "${title}"`, severity: 'high' });
      if (!mod) issues.push({ file: full, issue: 'MISSING_MODULE', severity: 'high' });
      if (!order && order !== '0')
        issues.push({ file: full, issue: 'MISSING_ORDER', severity: 'medium' });
      if (!diff) issues.push({ file: full, issue: 'MISSING_DIFFICULTY', severity: 'medium' });

      // 检查正文长度
      if (body.length < 30)
        issues.push({ file: full, issue: `THIN_BODY: ${body.length} chars`, severity: 'medium' });

      // 检查过时关键词
      OUTDATED_KEYWORDS.forEach(({ keyword, fix, severity }) => {
        if (body.includes(keyword)) {
          issues.push({
            file: full,
            issue: `OUTDATED: "${keyword}" → "${fix}"`,
            severity,
          });
        }
      });

      // 检查长文档是否缺少前置知识/学习目标章节
      if (body.length > 10000 && !body.includes('## 前置知识') && !body.includes('## 学习目标')) {
        issues.push({
          file: full,
          issue: `MISSING_PREAMBLE: 长文档(${body.length}字符)缺少前置知识/学习目标`,
          severity: 'low',
        });
      }

      // 检查内部链接格式（非外部链接、锚点、邮件的相对路径链接）
      const linkPattern = /\[([^\]]*)\]\(([^)]+)\)/g;
      let m;
      while ((m = linkPattern.exec(body)) !== null) {
        const href = m[2];
        if (href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto')) continue;
        issues.push({ file: full, issue: `INTERNAL_LINK: ${href}`, severity: 'low' });
      }

      // 检查 Wiki 链接格式（Obsidian 风格，应转换为标准 Markdown）
      const wikiPattern = /\[\[([^\]]+)\]\]/g;
      while ((m = wikiPattern.exec(body)) !== null) {
        issues.push({ file: full, issue: `WIKILINK: [[${m[1]}]]`, severity: 'medium' });
      }
    }
  }
}

// 执行审计
walk(DOCS);

// 按严重程度排序（high → medium → low）
const severityOrder = { high: 0, medium: 1, low: 2 };
issues.sort((a, b) => (severityOrder[a.severity] || 1) - (severityOrder[b.severity] || 1));

// 按问题类型分组
const byType = {};
for (const i of issues) {
  const type = i.issue.split(':')[0]; // 提取问题类型前缀
  if (!byType[type]) byType[type] = [];
  byType[type].push(i);
}

// 输出审计报告
console.log('\n=== FANDEX Content Quality Audit ===\n');

const highCount = issues.filter((i) => i.severity === 'high').length;
const medCount = issues.filter((i) => i.severity === 'medium').length;
const lowCount = issues.filter((i) => i.severity === 'low').length;

console.log(
  `Summary: ${issues.length} issues (HIGH: ${highCount}, MEDIUM: ${medCount}, LOW: ${lowCount})\n`
);

// 按类型输出详情（每种最多显示 10 条）
for (const [type, items] of Object.entries(byType)) {
  console.log(`\n[${type}] (${items.length} issues)`);
  items.slice(0, 10).forEach((i) => {
    const tag = i.severity ? `[${i.severity.toUpperCase()}]` : '';
    console.log(`  ${tag} ${i.file}: ${i.issue}`);
  });
  if (items.length > 10) console.log(`  ... and ${items.length - 10} more`);
}

console.log(`\nTotal issues: ${issues.length}`);

// ============================================================
// Phase 1.5：schema 完整性审计报告
// ============================================================
console.log('\n=== Schema Integrity Audit (Phase 1.5) ===\n');
console.log(`Scanned docs: ${schemaTotalDocs}`);
console.log(`Docs missing schema fields: ${schemaIssues.length}`);

// 各字段覆盖率
console.log('\nField coverage:');
SCHEMA_FIELDS.forEach((f) => {
  const covered = schemaCoverage[f];
  const total = schemaTotalDocs || 1;
  const pct = ((covered / total) * 100).toFixed(2);
  console.log(`  ${f.padEnd(22)} : ${covered}/${schemaTotalDocs} (${pct}%)`);
});

// 输出缺失字段清单（最多展示 20 条，避免日志过长）
if (schemaIssues.length > 0) {
  console.log('\nMissing field details (first 20):');
  schemaIssues.slice(0, 20).forEach((s) => {
    console.log(`  [SCHEMA] ${s.slug} missing: ${s.missing.join(', ')}`);
  });
  if (schemaIssues.length > 20) {
    console.log(`  ... and ${schemaIssues.length - 20} more`);
  }
}

// 存在 high 级别问题时以非零退出码退出，用于 CI/CD 流水线拦截
if (highCount > 0) {
  console.log(`\n❌ ${highCount} HIGH severity issues found!`);
  process.exit(1);
} else {
  console.log('\n✅ No HIGH severity issues found.');
  process.exit(0);
}
