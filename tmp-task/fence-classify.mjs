/**
 * 围栏问题分类器（任务临时产物）
 * 对范围内 FENCE_PROSE 候选块做三级分类：
 *   unwrap  — 高置信正文被包裹（无代码签名 + 散文特征强）
 *   review  — 中置信，需人工复核
 *   keep    — 疑似合法代码/教学示例
 * 另收集范围内 FENCE_NESTED 与语言标注缺失（plain 围栏内是命令行）情况。
 * 输出 tmp-task/fence-review.md 供人工复核，tmp-task/fence-class.json 供修复脚本消费。
 */
import { readFileSync, writeFileSync } from 'node:fs';

const r = JSON.parse(readFileSync('./tmp-task/report.json', 'utf-8'));
const SCOPE = new RegExp('^\\d{3}-(java|kotlin|csharp|go|python|rust|c|cpp|javascript|typescript|vue3|react|nextjs|astro|nestjs|vite|deno|bun|svelte|angular|tailwind)/');

// 代码签名特征（出现即认为块内是代码或伪代码）
const CODE_SIGNS = [
  /\b(function|const|let|var|return|class|import|export|from|new|await|async|if|for|while|switch|case|break|continue)\b/,
  /\b(def|elif|lambda|self|print|None|True|False)\b/,
  /\b(fn|pub|impl|struct|enum|match|use|mut|trait|where)\b/,
  /\b(public|private|protected|static|void|int|long|double|float|final|throws|extends|implements|package|interface|new)\b/,
  /#include|std::|printf|scanf|malloc|free\(/,
  /cout|endl|namespace|template|nullptr/,
  /\$[a-zA-Z{]|->|\{\s*$|;\s*$/,
  /^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|WHERE|JOIN|FROM)\b/i,
  /^\s*(?:\d+\s+)?(?:interface|type)\s+\w+\s*[={]/,
  /^\s*\w+\s*:\s*\w+[\s;,]?$/,
  /^\s*[.#][\w-]+\s*\{/, // CSS
  /^\s*<\w+[\s>]/, // HTML
  /^\s*[\w$.-]+\s*(?:=|:=)\s*\S+/,
  /^\s*(?:npm|pnpm|yarn|node|npx|git|cargo|go|java|javac|python|pip|dotnet|gradle|mvn|docker|kubectl)\s+\S/,
  /^\s*(?:#|\/\/)\s*\w/, // 注释行
];

function classifyBlock(lines, lang) {
  const n = lines.length || 1;
  let headings = 0, tableRows = 0, listItems = 0, cjkLines = 0, codeSignLines = 0, mathLines = 0, blank = 0;
  for (const l of lines) {
    const t = l.trim();
    if (!t) { blank++; continue; }
    if (/^#{1,6}\s/.test(l)) { headings++; continue; }
    if (/^\|.+\|/.test(t)) { tableRows++; continue; }
    if (/^([-*+]|\d+[.)])\s+/.test(t)) listItems++;
    if (/[\u4e00-\u9fff]/.test(t)) cjkLines++;
    if (/\$[^$]+\$/i.test(t) && !/\\\(|\\\[/.test(t)) mathLines++;
    if (CODE_SIGNS.some((re) => re.test(l))) codeSignLines++;
  }
  const codeRatio = codeSignLines / n;
  const proseSigns = headings + (tableRows >= 2 ? 2 : 0) + listItems * 0.5 + mathLines * 1.5 + (cjkLines / n) * 2;
  let verdict, reason;
  if (codeRatio >= 0.4) { verdict = 'keep'; reason = `代码签名行占比 ${codeRatio.toFixed(2)}`; }
  else if (codeRatio >= 0.15 && proseSigns < 4) { verdict = 'keep'; reason = `混合但偏代码 ${codeRatio.toFixed(2)}`; }
  else if (proseSigns >= 4 && codeRatio < 0.15) { verdict = 'unwrap'; reason = `散文特征 ${proseSigns.toFixed(1)} codeRatio ${codeRatio.toFixed(2)}`; }
  else { verdict = 'review'; reason = `prose ${proseSigns.toFixed(1)} code ${codeRatio.toFixed(2)}`; }
  return { verdict, reason, headings, tableRows, listItems, cjkLines, codeRatio, mathLines };
}

// 提取指定文档的所有围栏块
function extractBlocks(raw) {
  const lines = raw.split(/\r?\n/);
  const blocks = [];
  let open = null;
  for (let i = 0; i < lines.length; i++) {
    const fm = lines[i].match(/^\s{0,3}(`{3,}|~{3,})\s*([^`\s].*)?$/);
    if (!open) {
      if (fm) open = { lang: (fm[2] || '').trim() || '', start: i, fence: fm[1][0], len: fm[1].length, lines: [] };
    } else {
      const isClose = fm && fm[1][0] === open.fence && fm[1].length >= open.len && !(fm[2] || '').trim();
      if (isClose) { blocks.push({ ...open, end: i }); open = null; }
      else open.lines.push(lines[i]);
    }
  }
  return blocks;
}

const result = { unwrap: [], review: [], keep: [] };
let reviewMd = '# 范围内 FENCE_PROSE 人工复核清单\n\n';
let count = 0;
for (const issue of r.issues) {
  if (issue.type !== 'FENCE_PROSE' || !SCOPE.test(issue.file)) continue;
  count++;
  const rawFull = readFileSync('cnt-content/full/' + issue.file, 'utf-8');
  const fmMatch = rawFull.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  const raw = fmMatch ? rawFull.slice(fmMatch[0].length) : rawFull;
  const offset = fmMatch ? fmMatch[0].split(/\r?\n/).length : 0;
  const lineNo = parseInt(issue.detail.match(/行(\d+)/)[1], 10) - 1;
  const blocks = extractBlocks(raw);
  const block = blocks.find((b) => b.start === lineNo);
  if (!block) { console.log('SKIP 未定位:', issue.file, lineNo); continue; }
  const c = classifyBlock(block.lines, block.lang);
  const ctxBefore = raw.split(/\r?\n/).slice(Math.max(0, lineNo - 3), lineNo).join('\n');
  result[c.verdict].push({ file: issue.file, line: lineNo + 1, lang: block.lang, ...c });
  if (c.verdict !== 'keep') {
    reviewMd += `\n## [${c.verdict.toUpperCase()}] ${issue.file}:${lineNo + 1} lang=${block.lang}\n原因: ${c.reason}\n上下文前文:\n${ctxBefore}\n块内容(${block.lines.length}行):\n\`\`\`\n${block.lines.slice(0, 30).join('\n')}${block.lines.length > 30 ? '\n...截断' : ''}\n\`\`\`\n`;
  }
}

// FENCE_NESTED 与 UNCLOSED
for (const issue of r.issues) {
  if ((issue.type === 'FENCE_NESTED') && SCOPE.test(issue.file)) {
    reviewMd += `\n## [NESTED] ${issue.file} | ${issue.detail}\n`;
    result.review.push({ file: issue.file, line: 0, lang: '(nested)', verdict: 'review', reason: issue.detail });
  }
}

writeFileSync('./tmp-task/fence-class.json', JSON.stringify(result, null, 1));
writeFileSync('./tmp-task/fence-review.md', reviewMd);
console.log(`共 ${count} 处；unwrap=${result.unwrap.length} review=${result.review.length} keep=${result.keep.length}`);
