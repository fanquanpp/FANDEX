/**
 * FANDEX 内容质量审计脚本
 *
 * 功能概述：
 * 扫描 cnt-content/full 下所有 .md / .mdx 文件，只检查「内容质量」类问题；
 * 结构完整性（module/order/category/updated 等字段缺失、字段白名单、
 * 关联引用格式与死链）由 content-sync.mjs 在审计之前自动补全与修复，
 * 因此不再属于本脚本的职责范围。
 *
 * 检查项：
 * - frontmatter 语法损坏（sync 无法安全修复时兜底拦截）
 * - 标题无效（空 / "#"）
 * - 白名单之外的未知字段（防御新字段未经评审引入；历史禁用字段由 sync 删除）
 * - 正文过短（< 30 字符）
 * - 过时关键词检测
 * - 长文档缺少前置知识/学习目标
 * - 内部链接格式（非 http/#/mailto 开头）
 * - Wiki 链接格式（[[...]]）
 *
 * 按严重程度（high/medium/low）分类输出审计报告，
 * 存在 high 级别问题时以非零退出码退出。
 *
 * 偏差报备（仓库整理后路径变更）：
 * - 原：app-web/src/content/docs（已删除）
 * - 新：cnt-content/full（单仓库根目录下的统一内容源）
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
// frontmatter 解析统一走共享助手（gray-matter，完整 YAML 语义），不再逐行正则拼装
import { parseFrontmatter } from './lib/frontmatter.mjs';

/** 当前脚本所在目录 */
const __dirname = dirname(fileURLToPath(import.meta.url));
/** 单仓库根目录 */
const MONO_ROOT = join(__dirname, '..', '..');
/** 文档根目录 */
const DOCS = join(MONO_ROOT, 'cnt-content', 'full');
/** 问题收集数组 */
const issues = [];

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
    else if (entry.name.endsWith('.md') || entry.name.endsWith('.mdx')) {
      // .mdx 与 .md 同标准审计：content collection、content-sync、build-stats
      // 均处理 .mdx，审计范围必须一致，否则 mdx 文件逃过质量门禁
      const raw = readFileSync(full, 'utf-8');

      // 解析 frontmatter（gray-matter 完整 YAML 语义；语法错误按 high 级问题报告而非中断审计）
      let parsed;
      try {
        parsed = parseFrontmatter(raw);
      } catch (e) {
        issues.push({ file: full, issue: `BAD_FRONTMATTER: ${e.message}`, severity: 'high' });
        continue;
      }
      const { present, data, content: matterBody } = parsed;
      if (!present) {
        issues.push({ file: full, issue: 'NO_FRONTMATTER', severity: 'high' });
        continue;
      }

      const body = matterBody.trim(); // frontmatter 之后的正文

      // 提取 frontmatter 标题（其余托管字段由 content-sync 补全，不再审计）
      const asText = (v) =>
        v == null ? '' : typeof v === 'string' ? v.trim() : String(v).trim();
      const title = asText(data.title);

      // 检查标题有效性
      if (!title || title === '#')
        issues.push({ file: full, issue: `BAD_TITLE: "${title}"`, severity: 'high' });

      // 统一规范：frontmatter 只允许 10 个标准字段（直接基于解析后的键名判断）
      const STANDARD_FIELDS = [
        'order', 'title', 'module', 'category', 'difficulty',
        'description', 'author', 'updated', 'related', 'prerequisites',
      ];
      for (const key of Object.keys(data)) {
        if (!STANDARD_FIELDS.includes(key)) {
          issues.push({
            file: full,
            issue: `EXTRA_FIELD: ${key}`,
            severity: 'low',
          });
        }
      }

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
      // 剔除代码块：代码示例中的相对路径属于教学内容，不应视为站内链接
      const bodyWithoutCode = body.replace(/```[\s\S]*?```/g, '');
      const linkPattern = /\[([^\]]*)\]\(([^)]+)\)/g;
      let m;
      while ((m = linkPattern.exec(bodyWithoutCode)) !== null) {
        const href = m[2];
        if (href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto')) continue;
        issues.push({ file: full, issue: `INTERNAL_LINK: ${href}`, severity: 'low' });
      }

      // 检查 Wiki 链接格式（Obsidian 风格，应转换为标准 Markdown）
      const wikiPattern = /\[\[([^\]]+)\]\]/g;
      while ((m = wikiPattern.exec(bodyWithoutCode)) !== null) {
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

// 存在 high 级别问题时以非零退出码退出，用于 CI/CD 流水线拦截
if (highCount > 0) {
  console.log(`\n[FAIL] ${highCount} HIGH severity issues found!`);
  process.exit(1);
} else {
  console.log('\n[PASS] No HIGH severity issues found.');
  process.exit(0);
}
