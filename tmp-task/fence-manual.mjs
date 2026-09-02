/**
 * 嵌套断裂围栏的精准修复（任务临时产物）
 *
 * 处理 4 个文档中"围栏未闭合/嵌套断裂/内容重复"的结构性错误：
 * 1. 009-vue3/035-Vue3TheoryKnowledge.md —— 文档正文开头丢失 ````javascript 开门栏，
 *    导致从首行起全部内容被吞入代码块；另有一处 ```html 双开门重复。
 * 2. 014-csharp/013-CSharpGameDevUnity.md —— 明文围栏未在 mermaid 前闭合，
 *    且 mermaid 图整体重复了一次。
 * 3. 014-csharp/015-AsyncProgrammingDetailed.md —— mermaid 状态图被吞入 csharp 代码块，
 *    后续接口代码块也被吞入。
 * 4. 015-go/044-GoRegex.md —— Thompson 构造明文块未闭合，mermaid 重复，
 *    "3. 连接" 条目整行丢失（按 Thompson 构造规则补全）。
 */
import { readFileSync, writeFileSync } from 'node:fs';

function load(file) {
  const raw = readFileSync('cnt-content/full/' + file, 'utf-8');
  const m = raw.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  return { raw, head: m ? m[0] : '', lines: (m ? raw.slice(m[0].length) : raw).split(/\r?\n/) };
}
function save(file, head, lines) {
  writeFileSync('cnt-content/full/' + file, head + lines.join('\n'));
}

// 1. vue3/035：正文最前补回丢失的 ````javascript 开门栏；删除重复的 ```html 行
{
  const file = '009-vue3/035-Vue3TheoryKnowledge.md';
  const { head, lines } = load(file);
  if (lines[0].trim() === '' && lines[2]?.includes('Object.defineProperty')) {
    lines.splice(0, 1, '````javascript', '');
    // 删除后文重复的 ```html 双开门（查找相邻两行相同 fence 开门）
    for (let i = 0; i < lines.length - 1; i++) {
      if (lines[i].trim() === '```html' && lines[i + 1].trim() === '```html') {
        lines.splice(i, 1);
        break;
      }
    }
    save(file, head, lines);
    console.log('fixed:', file);
  } else console.log('SKIP(结构不符):', file);
}

// 2. csharp/013：明文块在 mermaid 前闭合，删除重复 mermaid（基于内容定位）
// 布局：anchor(优势行) / anchor+1 ```mermaid 首图 / 9 行图内容(J --- C 在 anchor+10) /
//       anchor+11 ```mermaid 重复图 / 9 行重复内容 / anchor+21 ``` 收尾
//       明文块开门在其上方 10 行处，需在 anchor+1 前闭合
{
  const file = '014-csharp/013-CSharpGameDevUnity.md';
  const { head, lines } = load(file);
  const anchor = lines.findIndex((l) => l.includes('优势：数据局部性、批量处理、无 GC、并行友好'));
  const ok =
    anchor > 0 &&
    lines[anchor + 1]?.trim() === '```mermaid' &&
    lines[anchor + 10]?.includes('J --- C') &&
    lines[anchor + 11]?.trim() === '```mermaid' &&
    lines[anchor + 21]?.trim() === '```';
  if (ok) {
    // 在 anchor+1 处：闭合上方明文块 + 空行 + 重开 mermaid（净增 2 行）
    lines.splice(anchor + 1, 1, '```', '', '```mermaid');
    // 首图内容现位于 anchor+4..anchor+12；重复段（原 anchor+11..anchor+21）现位于 anchor+13..anchor+23
    lines.splice(anchor + 13, 11);
    // 为首图补收尾 + 空行
    lines.splice(anchor + 13, 0, '```', '');
    save(file, head, lines);
    console.log('fixed:', file);
    console.log(lines.slice(anchor - 12, anchor + 18).map((l, i) => (anchor - 11 + i) + '\t' + l).join('\n'));
  } else console.log('SKIP(结构不符):', file, JSON.stringify([lines[anchor + 1], lines[anchor + 10], lines[anchor + 11], lines[anchor + 21]]));
}

// 3. csharp/015：在 mermaid 前与 mermaid 结束后各补一个闭合围栏（锚定 stateDiagram-v2）
{
  const file = '014-csharp/015-AsyncProgrammingDetailed.md';
  const { head, lines } = load(file);
  const mi = lines.findIndex((l, i) => l.trim() === '```mermaid' && lines[i + 1]?.trim() === 'stateDiagram-v2');
  if (mi > 0) {
    // mermaid 块内容直到下一个裸 ``` 行（即被吞的 ```csharp 前的收尾缺失）
    let closeIdx = -1, csharpIdx = -1;
    for (let i = mi + 1; i < lines.length; i++) {
      const t = lines[i].trim();
      if (t === '```csharp') { csharpIdx = i; break; }
      if (t === '```' && closeIdx === -1) closeIdx = i;
    }
    if (csharpIdx > 0) {
      // 在 mermaid 开门前补闭合（结束前一个 csharp 代码块），在 ```csharp 前补 mermaid 闭合
      lines.splice(csharpIdx, 0, '```');
      lines.splice(mi, 0, '```');
      save(file, head, lines);
      console.log('fixed:', file);
    } else console.log('SKIP(未找到 ```csharp):', file);
  } else console.log('SKIP(结构不符):', file);
}

// 4. go/044：闭合明文块，恢复"3. 连接"条目与拼接 mermaid，删除重复 mermaid
{
  const file = '015-go/044-GoRegex.md';
  const { head, lines } = load(file);
  const i2 = lines.findIndex((l) => l.includes('新状态 i ──a──> 新状态 f'));
  if (i2 > 0 && lines[i2 + 1]?.trim() === '```mermaid') {
    const insert = [
      '```',
      '',
      '3. **连接 $r_1 r_2$**：新建初态 $s$ 与终态 $t$，$s$ 经 $\\epsilon$ 进入 $N(r_1)$，$N(r_1)$ 的接受状态经 $\\epsilon$ 进入 $N(r_2)$，$N(r_2)$ 的接受状态经 $\\epsilon$ 到达 $t$。',
      '',
      '```mermaid',
      'flowchart LR',
      '    S[新 s] -->|ε| N1[N(r1)]',
      '    N1 -->|ε| N2[N(r2)]',
      '    N2 -->|ε| T[新 t]',
      '```',
      '',
    ];
    // 删除被吞的重复段（从 i2+1 的 ```mermaid 到下一个裸 ``` 行）
    let end = i2 + 1;
    while (end < lines.length && lines[end].trim() !== '```') end++;
    lines.splice(i2 + 1, end - (i2 + 1) + 1, ...insert);
    save(file, head, lines);
    console.log('fixed:', file);
  } else console.log('SKIP(结构不符):', file);
}
