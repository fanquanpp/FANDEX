/**
 * 机械修复脚本（任务临时产物）
 * 1. author: Anonymous -> fanquanpp（全库，符合 AGENTS.md 默认作者规范）
 * 2. 正文内 module/文件名 相对链接加前导斜杠（站点路由为 /module/slug，相对形式 404）
 * 3. 删除 46 个 000-*-MERGED.md 总览式文档
 * 4. 删除 app-Android-new/scripts/regen_merged.py（MERGED 生成脚本，随产物一并废弃）
 * 输出修复记录到 tmp-task/mech-fixes.md
 */
import { readdirSync, readFileSync, writeFileSync, rmSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

const DOCS = 'cnt-content/full';
const authorFixed = [], linkFixed = [], deleted = [];

for (const entry of readdirSync(DOCS, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const dir = join(DOCS, entry.name);
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (!f.endsWith('.md')) continue;
    if (f.startsWith('000-') && f.includes('MERGED')) { rmSync(p); deleted.push(`${entry.name}/${f}`); continue; }
    let raw = readFileSync(p, 'utf-8');
    let changed = false;
    // 1. author 统一
    const before = raw;
    raw = raw.replace(/^(author:\s*)Anonymous\s*$/m, '$1fanquanpp');
    if (raw !== before) { changed = true; authorFixed.push(`${entry.name}/${f}`); }
    // 2. 正文站内链接加前导斜杠（不动 frontmatter、不动代码块内内容）
    const m = raw.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
    if (m) {
      const head = m[0];
      const lines = raw.slice(head.length).split(/\r?\n/);
      let inFence = false;
      for (let i = 0; i < lines.length; i++) {
        const fm = lines[i].match(/^\s{0,3}(`{3,}|~{3,})/);
        if (fm) { inFence = !inFence; continue; }
        if (inFence) continue;
        const nf = lines[i].replace(/\]\((getting-started|markdown|git|github|html5|css|javascript|typescript|vue3|react|svg|java|kotlin|csharp|go|sql|mysql|postgresql|redis|algorithm|cs-fundamentals|c|cpp|devops|networking|cybersecurity|cloud-computing|software-testing|software-engineering|software-architecture|engineering-practices|python|rust|shell|astro|vite|pnpm-monorepo|tailwind|mongodb|nextjs|nestjs|deno|bun|svelte|angular|message-queue)\/[A-Za-z0-9_-]+\)/g, '](/$1$2');
        if (nf !== lines[i]) { lines[i] = nf; changed = true; linkFixed.push(`${entry.name}/${f}`); }
      }
      if (changed) raw = head + lines.join('\n');
    }
    if (changed) writeFileSync(p, raw);
  }
}

// 4. 删除 MERGED 生成脚本
try { unlinkSync('app-Android-new/scripts/regen_merged.py'); console.log('deleted regen_merged.py'); } catch {}

writeFileSync('tmp-task/mech-fixes.md',
  `# 机械修复记录\n\n## author 统一（Anonymous -> fanquanpp，共 ${authorFixed.length} 篇）\n` +
  authorFixed.map((x) => '- ' + x).join('\n') +
  `\n\n## 正文站内链接改为根绝对路径（共 ${linkFixed.length} 篇）\n` +
  [...new Set(linkFixed)].map((x) => '- ' + x).join('\n') +
  `\n\n## 删除总览式 MERGED 文档（共 ${deleted.length} 个）\n` +
  deleted.map((x) => '- ' + x).join('\n') + '\n');
console.log(`author=${authorFixed.length} linkDocs=${new Set(linkFixed).size} mergedDeleted=${deleted.length}`);
