
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFrontmatter } from './lib/frontmatter.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MONO_ROOT = join(__dirname, '..', '..');
const DOCS = join(MONO_ROOT, 'cnt-content', 'full');
const issues = [];

const OUTDATED_KEYWORDS = [
  { keyword: 'actions-gh-pages@v3', fix: 'actions-gh-pages@v4', severity: 'high' },
  { keyword: 'matplotlib.pyplot.show()', fix: '保存为图片文件', severity: 'medium' },
  { keyword: 'Thread.sleep()', fix: '使用虚拟线程/Project Loom', severity: 'low' },
];

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory())
      walk(full);
    else if (entry.name.endsWith('.md') || entry.name.endsWith('.mdx')) {
      const raw = readFileSync(full, 'utf-8');

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

      const body = matterBody.trim();

      const asText = (v) =>
        v == null ? '' : typeof v === 'string' ? v.trim() : String(v).trim();
      const title = asText(data.title);

      if (!title || title === '#')
        issues.push({ file: full, issue: `BAD_TITLE: "${title}"`, severity: 'high' });

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

      if (body.length < 30)
        issues.push({ file: full, issue: `THIN_BODY: ${body.length} chars`, severity: 'medium' });

      OUTDATED_KEYWORDS.forEach(({ keyword, fix, severity }) => {
        if (body.includes(keyword)) {
          issues.push({
            file: full,
            issue: `OUTDATED: "${keyword}" → "${fix}"`,
            severity,
          });
        }
      });

      if (body.length > 10000 && !body.includes('## 前置知识') && !body.includes('## 学习目标')) {
        issues.push({
          file: full,
          issue: `MISSING_PREAMBLE: 长文档(${body.length}字符)缺少前置知识/学习目标`,
          severity: 'low',
        });
      }

      const bodyWithoutCode = body.replace(/```[\s\S]*?```/g, '');
      const linkPattern = /\[([^\]]*)\]\(([^)]+)\)/g;
      let m;
      while ((m = linkPattern.exec(bodyWithoutCode)) !== null) {
        const href = m[2];
        if (href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto')) continue;
        issues.push({ file: full, issue: `INTERNAL_LINK: ${href}`, severity: 'low' });
      }

      const wikiPattern = /\[\[([^\]]+)\]\]/g;
      while ((m = wikiPattern.exec(bodyWithoutCode)) !== null) {
        issues.push({ file: full, issue: `WIKILINK: [[${m[1]}]]`, severity: 'medium' });
      }
    }
  }
}

walk(DOCS);

const severityOrder = { high: 0, medium: 1, low: 2 };
issues.sort((a, b) => (severityOrder[a.severity] || 1) - (severityOrder[b.severity] || 1));

const byType = {};
for (const i of issues) {
  const type = i.issue.split(':')[0];
  if (!byType[type]) byType[type] = [];
  byType[type].push(i);
}

console.log('\n=== FANDEX Content Quality Audit ===\n');

const highCount = issues.filter((i) => i.severity === 'high').length;
const medCount = issues.filter((i) => i.severity === 'medium').length;
const lowCount = issues.filter((i) => i.severity === 'low').length;

console.log(
  `Summary: ${issues.length} issues (HIGH: ${highCount}, MEDIUM: ${medCount}, LOW: ${lowCount})\n`
);

for (const [type, items] of Object.entries(byType)) {
  console.log(`\n[${type}] (${items.length} issues)`);
  items.slice(0, 10).forEach((i) => {
    const tag = i.severity ? `[${i.severity.toUpperCase()}]` : '';
    console.log(`  ${tag} ${i.file}: ${i.issue}`);
  });
  if (items.length > 10) console.log(`  ... and ${items.length - 10} more`);
}

console.log(`\nTotal issues: ${issues.length}`);

if (highCount > 0) {
  console.log(`\n[FAIL] ${highCount} HIGH severity issues found!`);
  process.exit(1);
} else {
  console.log('\n[PASS] No HIGH severity issues found.');
  process.exit(0);
}
