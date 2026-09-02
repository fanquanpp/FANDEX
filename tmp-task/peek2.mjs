// 临时脚本：查看待人工定案的围栏块
import { readFileSync } from 'node:fs';
const targets = [
  ['008-typescript/058-TypeGymnastics.md', 21],
  ['009-vue3/035-Vue3TheoryKnowledge.md', 20],
  ['014-csharp/013-CSharpGameDevUnity.md', 320],
  ['014-csharp/015-AsyncProgrammingDetailed.md', 145],
  ['015-go/044-GoRegex.md', 158],
  ['022-c/033-BuildSystem.md', 888],
  ['013-kotlin/049-SealedClassSealedInterface.md', 188],
  ['014-csharp/022-CSharpBlazor.md', 3019],
  ['015-go/021-GoroutineSchedule.md', 334],
  ['022-c/010-MultiFileCompilation.md', 826],
  ['022-c/043-MemoryAlignment.md', 1488],
  ['022-c/046-PointerArrayDifference.md', 1558],
  ['022-c/059-CValgrind.md', 239],
  ['032-python/011-Metaclass.md', 2236],
  ['032-python/044-PythonPackagingEvolution.md', 34],
];
let out = '';
for (const [file, n] of targets) {
  const raw = readFileSync('cnt-content/full/' + file, 'utf-8');
  const m = raw.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  const body = m ? raw.slice(m[0].length) : raw;
  const lines = body.split(/\r?\n/);
  out += `\n\n########## ${file} 正文行 ${n} 附近：\n`;
  out += lines.slice(Math.max(0, n - 4), n + 22).map((l, i) => `${n - 3 + i}\t${l}`).join('\n');
}
import { writeFileSync } from 'node:fs';
writeFileSync('./tmp-task/manual-cases.txt', out);
console.log('ok');
