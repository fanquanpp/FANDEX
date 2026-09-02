// 临时脚本：查看嵌套断裂案例的完整区域
import { readFileSync, writeFileSync } from 'node:fs';
const regions = [
  ['009-vue3/035-Vue3TheoryKnowledge.md', 1, 45],
  ['009-vue3/035-Vue3TheoryKnowledge.md', 270, 295],
  ['014-csharp/013-CSharpGameDevUnity.md', 318, 365],
  ['015-go/044-GoRegex.md', 130, 185],
  ['022-c/005-VariableConstant.md', 2212, 2245],
];
let out = '';
for (const [file, a, b] of regions) {
  const raw = readFileSync('cnt-content/full/' + file, 'utf-8');
  const m = raw.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  const body = m ? raw.slice(m[0].length) : raw;
  const lines = body.split(/\r?\n/);
  out += `\n\n########## ${file} 正文行 ${a}-${b}：\n`;
  out += lines.slice(a - 1, b).map((l, i) => `${a + i}\t${JSON.stringify(l).slice(0, 110)}`).join('\n');
}
writeFileSync('./tmp-task/manual-cases2.txt', out);
console.log('ok');
