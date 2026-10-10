---
order: 130
title: 正则表达式：从"读不懂的天书"到"顺手的小工具"
module: 'javascript'
category: 前端技术
difficulty: intermediate
description: 以「给文档站写死链检查脚本，要提取全部 Markdown 链接」为主线，一次讲透字符类、量词、贪婪与懒惰、锚点、分组捕获，配六个方法入口与 lastIndex 陷阱，并给出灾难性回溯（ReDoS）的成因与三条防身规则。
author: fanquanpp
updated: '2026-10-11'
related:
  - 'javascript/120-ES2018RegExpNamedCaptureGroups'
  - 'javascript/130-UnicodePropertyEscape'
  - 'javascript/640-RegexAssertions'
  - 'javascript/050-DataTypeOperator'
prerequisites:
  - 'javascript/040-VariableDataType'
---

## 前置知识

- 已完成 [变量与数据类型](/javascript/040-VariableDataType)：会写模板字符串、会调用字符串方法（indexOf、slice、includes）。

正则不需要任何理论课基础。它是一种"描述文本长什么样的小语言"，本文从一段真实需求出发把它读顺，顺带你就会写了。

## 学习目标

读完本文你将能够：

1. 逐字符读出一段常见正则（如 `/\[([^\]]+)\]\(([^)]+)\)/g`）在匹配什么；
2. 用字符类、量词、锚点、分组这四套零件，独立写出提取与校验两类需求；
3. 在贪婪与懒惰之间做正确选择，解释"为什么 `.*` 总是多吃了一段"；
4. 按场景选对方法：`test`、`match`、`matchAll`、`replace`、`split`，并避开 `/g` 加 `test` 的 lastIndex 陷阱；
5. 识别嵌套量词导致的灾难性回溯（ReDoS），用三条规则写出不卡死服务的正则。

预计 50 到 70 分钟，含 3 个动手实验与 4 道练习。

## 1. 你现在要解决什么问题

文档站要做质量巡检：几百篇 Markdown 文档里，外链失效是最高频的事故。你要写一个死链检查脚本，第一步是**从每篇文档里提取所有 Markdown 链接**，拿到标题和 URL 两部分：

```javascript
const sample = `
基础篇见 [JavaScript 是什么](/javascript/010-WhatIsJavaScript)，
进阶看 [事件循环](https://example.com/event-loop)，
还有一张 [截图](https://img.example.com/shot.png)。
`;

// 目标输出：
// [ { text: 'JavaScript 是什么', url: '/javascript/010-WhatIsJavaScript' },
//   { text: '事件循环', url: 'https://example.com/event-loop' },
//   { text: '截图', url: 'https://img.example.com/shot.png' } ]
```

用字符串方法做：找 `[`、找 `]`、再找 `(`、`)`，indexOf 与 slice 缠斗十几行，还得处理"一行多个链接"的嵌套定位。而描述"[任意文字]紧跟(任意文字)"这个**形状**，正则只要一行。这个形状描述语言，就是本文要教你的全部内容——先会读，再会写，最后会防它失控。

## 2. 先不要看解释，先试试看

直接上答案，然后逐字符拆解：

```javascript
const re = /\[([^\]]+)\]\(([^)]+)\)/g;

for (const match of sample.matchAll(re)) {
  console.log(match[1], '=>', match[2]);
}
// JavaScript 是什么 => /javascript/010-WhatIsJavaScript
// 事件循环 => https://example.com/event-loop
// 截图 => https://img.example.com/shot.png
```

五行就拿到了全部链接。现在把这条正则当句子读：

| 片段 | 含义 | 白话 |
| --- | --- | --- |
| `\[` | 转义的 `[` | 字面的左方括号（`[` 在正则里有特殊用途，要字面匹配就加 `\`） |
| `(` | 分组开始 | "从这里开始，这一段单独存起来" |
| `[^\]]+` | 字符类 + 量词 | "接下来一串字符，只要不是 `]`，来多少要多少（至少一个）" |
| `)` | 分组结束 | 第 1 组捕获完毕（标题） |
| `\]` | 转义的 `]` | 字面的右方括号 |
| `\(` | 转义的 `(` | 字面的左圆括号 |
| `(` | 分组开始 | 第 2 组 |
| `[^)]+` | 字符类 + 量词 | "一串不是 `)` 的字符，至少一个"（URL） |
| `)` | 分组结束 | 第 2 组捕获完毕 |
| `/g` | 全局标志 | "别找到一个就停，全篇都找" |

`match` 返回的数组里，`match[0]` 是整体匹配，`match[1]`、`match[2]` 依次是第 1、第 2 个括号捕获的内容。**会读这一条，本文就成了一半**——剩下的只是把零件一个个认全。

## 3. 四套零件：字符、量词、锚点、分组

**零件一：字符与字符类。** 普通字符匹配自己；几个元字符（`. * + ? ( ) [ ] { } | ^ $ \`）要匹配字面就得转义。字符类用 `[...]` 描述"任选其一"：

```javascript
const digits = /[0-9]/;            // 一个数字
const word = /\w/;                 // 等价 [A-Za-z0-9_]
const space = /\s/;                // 空白：空格、制表符、换行
const notDigit = /[^0-9]/;         // ^ 在字符类内 = "取反"
const dot = /[.]/;                 // 字符类内的 . 就是字面点号，不用转义
const any = /./;                   // 字符类外的 . = 除换行外任意字符
```

**零件二：量词。** 描述"前面那件东西重复几次"：

```javascript
/a*/    // 0 次或多次（可以没有）
/a+/    // 1 次或多次
/a?/    // 0 次或 1 次（可有可无）
/a{3}/  // 恰好 3 次
/a{2,4}/ // 2 到 4 次
/a{2,}/ // 至少 2 次
```

量词默认**贪婪**：能吃多少吃多少。加 `?` 变**懒惰**：够吃就停。这是新手第一大坑，必须亲手体感：

```javascript
const html = '<b>加粗</b> 和 <i>斜体</i>';

console.log(html.match(/<.+>/));       // ['<b>加粗</b> 和 <i>斜体</i>'] —— 一口吞到最后的 >
console.log(html.match(/<.+?>/));      // ['<b>'] —— 懒惰版，第一个 > 就收手
console.log(html.match(/<[^>]+>/g));   // ['<b>', '</b>', '<i>', '</i>'] —— 最稳写法
```

第三行的思路值得记住：与其纠结贪婪懒惰，**用"否定字符类 + 贪婪"表达'不吃某个边界'**，往往既准确又好读。

**零件三：锚点。** 不匹配字符，匹配"位置"：

```javascript
/^docs/.test('docs/index')    // true：以 docs 开头
/\.md$/.test('readme.md')     // true：以 .md 结尾
/\bword\b/.test('a word here') // true：单词边界，防止匹配到 password 里的 word
/^.$/.test('a')               // true：整串只有一个字符（^ 与 $ 把正则夹成"全文校验"）
```

表单校验几乎总是"锚点夹全串"的形状：`/^...$/`，不夹锚点就会"从中间抠出一段合格的"造成误放行。

**零件四：分组与或。** 括号把一串零件捆成整体，`|` 表示或：

```javascript
/(ab)+/          // 'ab' 重复多次：ab、abab
/(https?|ftp):\/\//   // http://、https:// 或 ftp://
/(?:ab)+/        // 只分组不捕获：(?: ) 不占用 match[1] 名额
```

只分组不需要捕获时用 `(?:...)`，省得捕获编号错位——深层命名捕获在 [ES2018 命名捕获组](/javascript/120-ES2018RegExpNamedCaptureGroups) 展开。

## 4. 六个方法入口：同一正则，六种用途

写出正则只是第一步，选对调用方法决定你拿到什么：

```javascript
const re = /\d+/;

// 1. test：只回答"有没有"，返回布尔——校验场景标配
re.test('第 42 条');                     // true

// 2. match（无 g）：找第一处，返回 [整体, 捕获1, ...] 或 null
'第 42 条'.match(/第 (\d+) 条/);         // ['第 42 条', '42']

// 3. match（有 g）：找全部，但只返回整体匹配字符串，捕获丢失
'a1b22c333'.match(/\d+/g);               // ['1', '22', '333']

// 4. matchAll（要 g）：找全部且保留捕获，迭代器——提取场景标配
for (const m of 'a1b22'.matchAll(/(\d+)/g)) console.log(m[1]);

// 5. replace：替换；$1 引用捕获组，回调函数可做任意加工
'2026-09-28'.replace(/(\d+)-(\d+)-(\d+)/, '$3/$2/$1');   // '28/09/2026'
'hello world'.replace(/(\w+)/g, (m) => m.toUpperCase()); // 'HELLO WORLD'

// 6. split：按正则切块；有捕获组时组内容也保留在结果里
'a1b22c'.split(/(\d+)/);                 // ['a', '1', 'b', '22', 'c']
```

**头号陷阱藏在第 1 条里**：带 `/g` 的正则对象是有状态的——每次 `test` 或 `exec` 后 `lastIndex` 会前移，再测就从上次的位置接着找：

```javascript
const g = /a/g;
g.test('a');   // true
g.test('a');   // false！lastIndex 已走到 1，从后面找不到第二个 a
g.test('a');   // true，绕了一圈从头再来
```

症状是"同一个校验函数时灵时不灵"。规则一句话：**test 用不带 g 的正则；要 g 的提取用 matchAll。** 两者混用是事故源。

## 5. 实战：把死链检查脚本写完整

回到开头的需求，现在零件都齐了：

```javascript
const LINK_RE = /\[([^\]]+)\]\(([^)\s]+)[^)]*\)/g;

function extractLinks(markdown) {
  const links = [];
  for (const m of markdown.matchAll(LINK_RE)) {
    links.push({ text: m[1], url: m[2] });
  }
  return links;
}

function findBroken(markdown, isReachable) {
  return extractLinks(markdown)
    .filter(({ url }) => url.startsWith('http'))
    .filter(({ url }) => !isReachable(url))
    .map(({ text, url }) => `死链：[${text}](${url})`);
}

console.log(
  findBroken(sample, (url) => !url.includes('img.example.com/missing'))
);
```

第二类高频实战是**表单校验**，注意"锚点夹全串"与"字符类白名单"的配合：

```javascript
const NICK_RE = /^[\w\u4e00-\u9fa5]{2,16}$/;   // 2 到 16 个字母数字下划线或中文

function validateNickname(input) {
  if (!NICK_RE.test(input)) return '昵称需为 2-16 位中文、字母、数字或下划线';
  return null;
}
```

`{2,16}` 限定长度在这里不只是规范要求——**给量词设上限是防失控的第一道闸**，下一节你会看到为什么。

## 6. 灾难性回溯：一行正则卡死一个服务

正则引擎是"走岔路就回头再试"的（回溯型引擎）。多数时候无感，但**量词嵌量词**会让回头路径指数爆炸：

```javascript
const evil = /^(\d+)*$/;      // 量词 * 里面还套着量词 +

// 测试字符串：三十个数字加一个结尾不匹配的字母
console.time('危险正则');
evil.test('111111111111111111111111111111x');
console.timeEnd('危险正则');   // 数秒到更久，随长度指数增长
```

原理一句话：`(\d+)*` 对"一串 1"有海量种切分方式，结尾的 `x` 让全部尝试失败，引擎把每种切分都试一遍——31 个字符就是几十亿条路径。攻击者构造这种字符串打你的校验接口，就是 **ReDoS（正则拒绝服务）**：CPU 被一个请求独占，服务对所有人卡死。

防身三条规则：

1. **禁止量词嵌量词**（`(.+)*`、`(\d+)*`、`(\s+a)*` 这类形状）；要用"重复整体"，给内层也配否定字符类：`(\d+)*` 改成 `\d*`（本例里语义等价且无嵌套）；
2. **给所有量词设上限**：`{2,16}` 而不是无界的 `+`、`*`，尤其处理用户输入的正则；
3. **上线前用长尾字符串自测**：拿 30 到 50 个字符的"不匹配样例"跑一次 `test`，毫秒内返回才安全——恶意输入往往就是"长得几乎合法但结尾差一点"的串。

## 7. 修改实验

以下每个先预测再运行。

实验一：把第 5 节的 `NICK_RE` 里的 `\w` 换成 `[A-Za-z0-9_]`，分别用 `'阿七_07'` 与 `'seven-7'` 测试，解释结果差异。（提示：`\w` 不含连字符；白名单写法的好处正是"减号要不要放行"一目了然。）

实验二：把第 2 节 `LINK_RE` 的 `+` 全部换成 `*`，用 `[空标题]()` 测试，观察放行了不该放行的空链接。（提示：`*` 允许零次，`+` 才是"至少一个"。）

实验三：把第 6 节危险正则的长度从 31 个字符逐次加到 40，记录耗时增长曲线。（提示：亲身见证指数爆炸；在 Node 里跑，随时 Ctrl+C。）

## 8. 常见错误与调试实录

**错误一：动态拼正则忘了双重转义。**

```javascript
const keyword = 'C++ (新)';
const re = new RegExp(keyword);      // SyntaxError！
```

症状：字符串字面量里的正则好好的，改成 `new RegExp(变量)` 就炸。原因：字符串层面和正则层面**各转义一次**——用户输入里的 `(`、`+` 是正则元字符，拼进去必须转成 `\(`、`\+`。修法：用工具函数把元字符统一转义：

```javascript
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
const re = new RegExp(escapeRegExp(keyword));
```

**错误二：贪婪匹配多吃了一段。** 从 `'[a](1) 和 [b](2)'` 提取链接时用了 `/\[(.+)\]\((.+)\)/g`，结果 matchAll 只返回一条、且捕获内容是 `a](1) 和 [b` 与 `2`。原因：`.+` 贪婪到全串最后一个括号才罢休。修法二选一：改懒惰 `.+?`，或按第 3 节的更稳思路用否定字符类 `[^\]]+` 与 `[^)]+`。调试这类问题的黄金动作：**把正则和样例丢进 regex101 这类可视化工具**，左侧高亮实时显示匹配范围，回溯过程也能看。

**错误三：replace 的第二个参数里 `$` 有特殊含义。**

```javascript
const price = '$100';
'总价 $100'.replace('$100', '$200');   // 得到 '总价 00'
```

症状：替换结果莫名其妙少了字符。原因：replace 的字符串参数把 `$&`、`$1`、`$'` 当特殊序列解析，`$2` 后接 `00` 被读成 `$(..)` 组引用。修法：字面替换用回调 `replace('$100', () => '$200')`，或换 `replaceAll` 配回调——回调的返回值不做任何解析，最安全。

## 9. 实际项目中的使用场景

- 文档工程：本文的死链检查、frontmatter 字段提取、代码块语言标注扫描，全是一个 matchAll 加一条正则；
- 表单与输入约束：昵称、手机号、密码强度——注意 JS 端校验只为体验，服务端必须再校验一遍；
- 日志分析：从几千行日志里 matchAll 出 ERROR 行的耗时与 traceId，做成巡检报表；
- 富文本净化：替换或剥离不允许的标签（配合第 8 节的回调式 replace）。

边界提醒：正则只适合"平的、无嵌套"的文本形状。配对括号、嵌套标签、HTML 整体解析这类**递归结构**，正则理论上写不出、实践上写出来必是灾难——那类需求交给专门的解析器。

## 10. 小练习

预测题（5 分钟，先写答案再运行验证）：

```javascript
console.log('a1b22c333'.match(/(\d+)/g));
console.log('a1b22c333'.match(/(\d+)/));
```

答案：第一行 `['1', '22', '333']`（g 模式丢弃捕获组）；第二行 `['1', '1']`（整体匹配加第 1 组捕获，值恰好相同）。

修改题（10 分钟）：写 `maskPhone(input)`：把 11 位手机号的中间四位换成星号。验收：`'13812345678'` 变 `'138****5678'`，其他输入原样返回。（提示：`/^(\d{3})\d{4}(\d{4})$/` 配 replace 的 `$1****$2`。）

修 Bug 题（15 分钟）：下面的提取器想从配置文本 `env=prod; region=cn-north; replicas=3` 里取出键值对，真实症状是取出的 value 带尾巴。定位并修复：

```javascript
const text = 'env=prod; region=cn-north; replicas=3';
const re = /(\w+)=(.+);?/g;
for (const m of text.matchAll(re)) {
  console.log(m[1], '=>', m[2]);
}
// 实际输出 region => cn-north; replicas=3 的错误切分
```

提示：`.+` 贪婪吞掉了分号与后面的键值对。改成 `[^\s;]+` 或懒惰 `.+?`（推荐前者），修复后应输出三对。

挑战题（40 分钟，脱离示例）：实现 `highlight(text, keywords)`：把 text 中命中的关键词包成 `【kw】`，要求：大小写不敏感、最长匹配优先（input 里优先命中 inputtype 而不是 input）、特殊字符关键词（如 `C++`）不报错。验收：

```javascript
console.log(highlight('学习 InputType 和 C++', ['c++', 'inputtype']));
// 学习 【InputType】 和 【C++】
```

提示（思路方向）：escapeRegExp + 关键词按长度倒序拼成 `(a|b|c)` + replace 回调。展开（关键 API）：`new RegExp(pattern, 'gi')`、回调式 replace、escapeRegExp。

## 11. 与之前和之后的知识的关系

- 往前：050 篇的字符串知识（模板字符串、includes）是正则的前置手感；160 篇的"回溯"概念在第 6 节换了马甲出现；
- 往后：[ES2018 命名捕获组](/javascript/120-ES2018RegExpNamedCaptureGroups) 给捕获组起名字，本文脚本里的 `m[1]`、`m[2]` 会变成 `groups.url`，可读性翻倍；[Unicode 属性转义](/javascript/130-UnicodePropertyEscape) 解决"匹配所有汉字/emoji"这类本文字符类写不全的问题；[断言深水区](/javascript/640-RegexAssertions) 展开零宽断言的完整用法。

## 12. 官方文档

- MDN 正则表达式指南：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Regular_expressions
- MDN RegExp：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/RegExp
- MDN String.prototype.matchAll：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/String/matchAll

## 自我检查

- 能逐字符读出 `/\[([^\]]+)\]\(([^)]+)\)/g` 并说出每段的白话含义；
- 能解释贪婪与懒惰的差异，并用否定字符类写出"不吃边界"的稳定版；
- 能说出 test 配 /g 的 lastIndex 陷阱，并给出"test 不带 g、提取用 matchAll"的使用纪律；
- 能识别嵌套量词的 ReDoS 形状，并复述三条防身规则；
- 能判断一个需求该用正则还是该用解析器（有没有嵌套配对结构）。

## 本章总结

正则是"描述文本形状的小语言"，四套零件：字符类管"哪些字符"、量词管"重复几次"、锚点管"什么位置"、分组管"存哪几段"。贪婪是默认，懒惰加问号，否定字符类是最稳的边界写法。方法按需选：校验 test、提取 matchAll、加工 replace 回调、切块 split；test 与 /g 混用会踩 lastIndex 状态坑。嵌套量词引发灾难性回溯，三条纪律防 ReDoS：不嵌量词、量词设上限、上线前长尾自测。配对嵌套结构不是正则的战场，交给解析器。

## 下一步

进入 [ES2018 命名捕获组](/javascript/120-ES2018RegExpNamedCaptureGroups)：本文脚本里的 `m[1]`、`m[2]` 既难读又怕编号错位——给捕获组起上名字（`(?<url>...)`），正则从"能用"升级到"三个月后还敢改"。
