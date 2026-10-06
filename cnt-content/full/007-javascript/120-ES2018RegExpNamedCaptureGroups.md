---
order: 140
title: 具名捕获组
module: 'javascript'
category: 前端技术
difficulty: intermediate
description: 用具名捕获组把正则结果从"第 3 个括号"变成"year"，覆盖三处语法、未参与匹配、替换与常见坑。
author: fanquanpp
updated: '2026-09-29'
related:
  - 'javascript/110-Regex'
  - 'javascript/130-UnicodePropertyEscape'
  - 'javascript/640-RegexAssertions'
  - 'javascript/610-TemporalJavaScriptAPI'
prerequisites:
  - 'javascript/110-Regex'
---

> 前置：需先有正则基础，见[正则表达式](/javascript/110-Regex)。

# 具名捕获组

## 从一段祖传代码说起

接手一个老项目，你在工具函数里看到这样的代码：

```javascript
const dateRegex = /(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/;
const m = '2026-07-20 14:30:00'.match(dateRegex);
console.log(m[3], m[4]); // 这俩到底是月、日还是时、分？
```

不数括号根本不知道 `m[3]` 是什么。更糟的是：哪天有人在正则前面加一个分组（比如给年份加个世纪前缀），后面所有 `m[1]`、`m[2]` 的下标全部错位，而编译器不会报任何错——数据悄悄变错。

ES2018 的具名捕获组就是解这个问题的：给每个括号起名字，用 `m.groups.名字` 取值。名字不随分组增删而错位，正则本身也变成了自解释的文档。

## 动手：三处语法一次写全

具名捕获组一共涉及三个语法点，分别在"定义、反查、替换"三个位置：

```javascript
const logLine = '2026-07-20 14:30:00 [WARN] disk 91%';

const re = /(?<date>\d{4}-\d{2}-\d{2}) (?<time>\d{2}:\d{2}:\d{2}) \[(?<level>[A-Z]+)\]/;

const m = logLine.match(re);
console.log(m.groups.date);  // '2026-07-20'
console.log(m.groups.time);  // '14:30:00'
console.log(m.groups.level); // 'WARN'
```

1. 定义：`(?<名字>模式)`，注意是 `?<` 开头（联想"名字贴在组左边"）。
2. 反向引用 `\k<名字>`：在正则内部引用前面同名组已匹配的内容。
3. 替换引用 `$<名字>`：在 `replace` 的替换字符串里引用。

```javascript
// \k<name>：找连续重复的单词
const dup = /\b(?<word>\w+)\s+\k<word>\b/i;
dup.test('bet ON on the table'); // true：'on' 出现了两次

// $<name>：交换年月日顺序
'2026-07-20'.replace(
  /(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/,
  '$<day>/$<month>/$<year>'
); // '20/07/2026'
// 对比旧写法 '$3/$2/$1'：改成不用数编号
```

具名组同时保留数字索引：`m[1]` 依旧是 `'2026-07-20'`。这让旧代码可以渐进迁移，不必一次改完。

## 为什么这样设计：groups 的取值语义

`match` 返回的 `groups` 就是一个普通对象，但有三条取值规则要记牢：

**1. 未参与匹配的组是 `undefined`，不是空字符串。**

```javascript
const re = /^(?<protocol>\w+):\/\/(?<host>[^:/]+)(?::(?<port>\d+))?/;

'wss://live.example.com'.match(re).groups.port; // undefined
'wss://live.example.com:443'.match(re).groups.port; // '443'
```

可选组 `(?::(?<port>\d+))?` 没匹配到时，`groups.port` 是 `undefined`。实际代码用空值合并处理：`m.groups.port ?? 443`。注意区分"没参与匹配"（组在未被选择的分支里）与"匹配了空串"（组参与了，值为 `''`）。

**2. 组在量词里重复时，保留最后一次迭代的值。**

```javascript
// 提取命令行风格的连续 key=value
const re = /(?:|(?<prev>\S+)\s+)*(?<last>\S+)/; // 简化示例
// 更典型的场景：
const pair = /(?<key>\w+)=(?<value>\w+)/g;
```

单个组被 `*` 或 `+` 反复执行时，捕获到的是最后一次迭代的内容，而不是所有迭代。要拿全部结果，应该给组加 `g` 标志配合 `matchAll`，见下一节。

**3. 同一正则里组名不能重复（ES2025 起放开了分支场景）。**

```javascript
// ES2018 至 ES2024：重名直接 SyntaxError
new RegExp('(?<year>\\d{4})-(?<year>\\d{2})');
// SyntaxError: Duplicate capture group name

// ES2025 起允许在 | 的不同分支里复用组名：
const date = /(?<year>\d{4})-(?<month>\d{2})|(?<month>\d{2})\/(?<year>\d{4})/;
console.log('2026-03'.match(date).groups); // { year: '2026', month: '03' }
console.log('03/2026'.match(date).groups); // { year: '2026', month: '03' }
```

分支复用的价值在于：两种书写顺序进同一个正则，`groups` 的形状保持一致，下游代码不用写两套。同一顺序位置上紧跟两个同名组在任何版本都非法。写兼容旧运行时的代码时，把这个特性当增强而非依赖。

## 进场干活：matchAll 与 replace 回调

**提取全部匹配：`g` 标志 + `matchAll`**。`matchAll` 返回迭代器，每一项都带 `groups`，且不像 `exec` 循环那样怕 `lastIndex` 状态残留：

```javascript
const text = '订单 A20260720，订单 B20261108';
const re = /订单 (?<id>[A-Z])(?<date>\d{8})/g;

for (const m of text.matchAll(re)) {
  console.log(m.groups.id, m.groups.date);
  // A 20260720
  // B 20261108
}
```

**替换回调里取 groups**。`replace` 的回调参数依次是：完整匹配、各捕获组、offset、原串、groups。最后一个参数就是 groups，用 `...args` 加 `at(-1)` 可以少写一串占位参数：

```javascript
const iso = '2026-07-20'.replace(
  /(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/,
  (...args) => {
    const { year, month, day } = args.at(-1);
    return `${year}年${Number(month)}月${Number(day)}日`;
  }
);
console.log(iso); // '2026年7月20日'
```

**解构加默认值**，处理可选组的惯用法：

```javascript
const urlRe = /^(?<protocol>\w+):\/\/(?<host>[^:/]+)(?::(?<port>\d+))?/;
const { groups: { protocol, host, port = '443' } } =
  'wss://live.example.com'.match(urlRe);
console.log(protocol, host, port); // 'wss' 'live.example.com' '443'
```

**TypeScript 用户**：`match.groups` 默认类型宽松，声明一个带 `groups` 字段的返回类型能让字段名获得补全：

```typescript
interface LogMatch extends RegExpMatchArray {
  groups: { date: string; time: string; level: string };
}

function parseLogLine(line: string): LogMatch | null {
  return line.match(/(?<date>\d{4}-\d{2}-\d{2}) (?<time>\d{2}:\d{2}:\d{2}) \[(?<level>[A-Z]+)\]/) as LogMatch | null;
}
```

## 一个完整小工具：Nginx 访问日志解析

把上面的知识拼起来。目标：把一行访问日志拆成结构化对象，非法行返回 null 而不是抛错。

```javascript
const LOG_RE = /^(?<ip>\S+) \S+ (?<user>\S+) \[(?<time>[^\]]+)\] "(?<method>\S+) (?<path>\S+) (?<protocol>[^"]+)" (?<status>\d{3}) (?<size>\S+) "(?<referer>[^"]*)" "(?<agent>[^"]*)"/;

function parseAccessLog(line) {
  const m = line.match(LOG_RE);
  if (!m) return null;
  const g = m.groups;
  return {
    ip: g.ip,
    user: g.user === '-' ? null : g.user,
    time: g.time,
    method: g.method,
    path: g.path,
    status: Number(g.status),
    size: g.size === '-' ? 0 : Number(g.size),
    referer: g.referer === '-' ? null : g.referer,
  };
}

console.log(parseAccessLog(
  '10.0.0.7 - alice [20/Jul/2026:14:30:00 +0800] "GET /api/tickets HTTP/2.0" 200 1234 "-" "Mozilla/5.0"'
));
// { ip: '10.0.0.7', user: 'alice', time: '20/Jul/2026:14:30:00 +0800', method: 'GET', path: '/api/tickets', status: 200, size: 1234, referer: null }
```

写这类解析正则的经验：字段之间用字面空格分隔、字段内部用 `\S+` 或否定字符类，可缺省字段（user、referer、size）先捕获后归一。具名组让半年后回看的人不用重新数括号。

## 坑点与自检

**坑 1：替换字符串里的 `$` 字面量**。`$$` 才表示一个 `$`，`$<name>` 才是具名引用，混着写容易翻车：

```javascript
// 想把 price:100 变成 '$100'
'price:100'.replace(/price:(?<amount>\d+)/, '$$$<amount>'); // '$100'
// '$$' 产生字面 $，'$<amount>' 替换为 100
```

**坑 2：忘了 `g` 标志导致 matchAll 抛错**。`matchAll` 要求正则带 `g`（或 `y`），否则直接 `TypeError`。这是故意设计的：没有全局标志时"所有匹配"语义不成立。

**坑 3：把动态字符串拼进正则忘了转义**。用户输入里的 `.` `(` `?` 会被当元字符。用 `String.raw` 或先 `replace(/[.*+?^${}()|[\]\\]/g, '\\$&')` 转义再 `new RegExp`。

**坑 4：给组名用中文能跑，但别用**。`(?<年份>\d{4})` 合法（组名是合法标识符即可），但团队协作与日志检索里 ASCII 命名更稳妥。保留字如 `if` 也能当组名，同样不推荐。

自检清单：

- 能不数括号说出一个旧正则里 `m[2]` 是什么？把它改成具名组试试。
- 可选组没匹配到时 `groups.x` 是什么？`''` 还是 `undefined`？
- `matchAll` 需要什么标志？
- 分支里两种日期顺序怎么共用一套 `groups` 字段名？

## 练习

1. 把 `/(\d{2}):(\d{2}):(\d{2})/` 改写成具名版本，并写一个 `formatDuration` 函数输出 `1h 2m 3s`（小时为 0 时省略）。
2. 用 `\k<name>` 写正则，找出形如 `key=value key=value` 中 value 重复出现的行（如 `env=prod env=prod`）。
3. 写 `parseIni(text)`：解析 `[section]` 与 `key = value` 行，返回嵌套对象；`key = value` 的正则用两个具名组，注释行（`#` 开头）跳过。
4. 把上一题的 section 与 key 都允许中文，验证组名允许 Unicode 标识符；再想想为什么生产代码里仍不建议这么做。

## 下一步

- [Unicode 属性转义](/javascript/130-UnicodePropertyEscape)：`\p{L}` 等属性与具名组配合做国际化文本处理。
- [正则断言](/javascript/640-RegexAssertions)：先行/后行断言解决"只要上下文不要内容"的匹配。
- [Temporal 现代日期时间 API](/javascript/610-TemporalJavaScriptAPI)：解析出日期字符串后，正确的下一步是交给结构化类型而不是手工运算。
