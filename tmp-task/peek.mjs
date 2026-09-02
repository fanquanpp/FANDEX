// 临时脚本：抽样查看范围内 FENCE_PROSE 围栏块实际内容
import { readFileSync, writeFileSync } from 'node:fs';
const r = JSON.parse(readFileSync('./tmp-task/report.json', 'utf-8'));
const SCOPE = new RegExp('^\\d{3}-(java|kotlin|csharp|go|python|rust|c|cpp|javascript|typescript|vue3|react|nextjs|astro|nestjs|vite|deno|bun|svelte|angular|tailwind)/');
const samples = r.issues.filter((i) => i.type === 'FENCE_PROSE' && SCOPE.test(i.file));
console.log('in-scope FENCE_PROSE:', samples.length);
const byMod = {};
for (const s of samples) { const m = s.file.match(/^\d{3}-([a-z0-9-]+)\//); byMod[m[1]] = (byMod[m[1]] || 0) + 1; }
console.log(JSON.stringify(byMod));
let out = '';
for (const s of samples.slice(0, 14)) {
  const raw = readFileSync('cnt-content/full/' + s.file, 'utf-8');
  const lineNo = parseInt(s.detail.match(/行(\d+)/)[1], 10);
  const lines = raw.split(/\r?\n/);
  out += '\n\n===== ' + s.file + ' | ' + s.detail + '\n' + lines.slice(lineNo - 1, lineNo + 11).join('\n');
}
writeFileSync('./tmp-task/samples.txt', out);
console.log('samples written');
