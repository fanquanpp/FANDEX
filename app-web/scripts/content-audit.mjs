
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFrontmatter } from './lib/frontmatter.mjs';

// 内容健康检查只做一件事：确认每篇文档能被管线解析（frontmatter 合法、title 存在）。
// 这两项是站点构建的硬依赖，其余写作层面的取舍完全交给作者。

const __dirname = dirname(fileURLToPath(import.meta.url));
const MONO_ROOT = join(__dirname, '..', '..');
const DOCS = join(MONO_ROOT, 'cnt-content', 'full');
const issues = [];

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
      const { present, data } = parsed;
      if (!present) {
        issues.push({ file: full, issue: 'NO_FRONTMATTER', severity: 'high' });
        continue;
      }

      const title = data.title == null ? '' : String(data.title).trim();
      if (!title || title === '#')
        issues.push({ file: full, issue: `BAD_TITLE: "${title}"`, severity: 'high' });
    }
  }
}

walk(DOCS);

console.log('\n=== FANDEX Content Validity Check ===\n');

if (issues.length === 0) {
  console.log('[PASS] 所有文档 frontmatter 与 title 均可被管线解析。');
  process.exit(0);
}

for (const i of issues) console.log(`  [${i.severity.toUpperCase()}] ${i.file}: ${i.issue}`);
console.log(`\n[FAIL] ${issues.length} 个解析性问题会阻断构建，请修复后重试。`);
process.exit(1);
