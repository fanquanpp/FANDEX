---
order: 110
tags:
  - javascript
  - regex
difficulty: intermediate
title: 正则表达式
module: javascript
category: 'JS Basics'
description: JavaScript正则表达式语法、常用模式、RegExp对象、字符串方法与实战技巧详解。
author: fanquanpp
updated: '2026-06-13'
related:
  - javascript/模块动态导入与代码分割
  - javascript/原型与继承
  - javascript/错误边界与全局错误捕获
  - javascript/内存泄漏排查
prerequisites:
  - javascript/语法速查
---

# 正则表达式

## 1. 学习目标（Bloom 分类）

读完本文后，读者应能够达到以下认知层次：

| 层次 | 行为目标 | 具体能力描述 |
| --- | --- | --- |
| 记忆（Remember） | 列出正则表达式核心语法元素 | 能在 1 分钟内说出字符类、量词、锚点、分组、修饰符的符号与含义 |
| 理解（Understand） | 解释正则引擎的工作原理 | 能说明 NFA 与 DFA 的差异，以及回溯机制如何影响性能 |
| 应用（Apply） | 在 JavaScript 中编写与使用正则 | 能使用 `RegExp`、`String.match`、`String.replace`、`String.split` 解决实际字符串处理问题 |
| 分析（Analyze） | 区分贪婪、非贪婪、占有量词的行为 | 能预测复杂正则在不同输入下的匹配结果与回溯次数 |
| 评价（Evaluate） | 评估正则的性能与可读性 | 能识别灾难性回溯风险，重构正则以避免 ReDoS 漏洞 |
| 创造（Create） | 设计完整的文本处理 DSL | 能实现模板引擎、配置解析器、Markdown 解析器等基于正则的工具 |

学习本课前，建议先掌握：JavaScript 字符串方法、字面量、模板字符串、ES6 解构、Symbol、迭代器。

---

## 2. 历史动机：正则表达式的起源

### 2.1 从神经学到数学：1956 年的奠基

正则表达式的起源可以追溯到 1943 年 Warren McCulloch 与 Walter Pitts 的神经元数学模型研究。两位研究者将神经元抽象为"被激活或未被激活"的二值单元，并提出用形式语言描述其行为。

1956 年，Stephen Kleene 在论文 *Representation of Events in Nerve Nets and Finite Automata* 中正式定义了**正则集合（regular sets）**，并发明了描述这类集合的代数符号，即正则表达式的雏形。Kleene 提出的核心运算包括：

- **并集（union）**：$A \cup B$，写作 `A|B`。
- **连接（concatenation）**：$AB$。
- **克林闭包（Kleene star）**：$A^*$，即 $A$ 重复 0 次或多次。

这三类运算构成正则语言的完整描述能力，与有限状态自动机（Finite State Automaton, FSA）等价。

### 2.2 Unix 之父 Ken Thompson 的工程实现

1968 年，Ken Thompson（Unix 与 C 语言的共同创造者）在 *Regular Expression Search Algorithm* 论文中实现了首个正则引擎，将其集成到 Unix 的 `ed` 编辑器中。命令 `g/re/p`（global regex print）后来演变为独立的 `grep` 工具，至今仍是开发者最常用的命令之一。

Thompson 的实现采用**NFA（非确定有限自动机）**算法，通过构造状态转移图，回溯式搜索匹配。这一选择深远影响了后续几乎所有正则引擎，包括 JavaScript 的 V8 实现。

### 2.3 POSIX 标准与 Perl 革命

1986 年 POSIX 标准化正则表达式，定义了 BRE（Basic Regular Expression）与 ERE（Extended Regular Expression）两种方言。

1994 年 Perl 5 发布，引入大量扩展特性：

- 非捕获分组 `(?:...)`。
- 前瞻 `(?=...)` / 负前瞻 `(?!...)`。
- 命名捕获 `(?P<name>...)`。
- 内联修饰符 `(?i)`。

这些扩展被统称为 PCRE（Perl Compatible Regular Expressions），JavaScript 的正则语法基本是 PCRE 的子集。

### 2.4 ECMAScript 正则的演进

| 版本 | 年份 | 关键特性 |
| --- | --- | --- |
| ES3 | 1999 | 基础正则：字符类、量词、分组、`i/g/m` 修饰符 |
| ES5 | 2009 | 严格模式、`RegExp.prototype.toString` 规范化 |
| ES6 / ES2015 | 2015 | `u` 修饰符、`y` 修饰符、`flags` 属性、`RegExp` 子类化 |
| ES2018 | 2018 | 后瞻 `(?<=...)` / `(?<!...)`、命名捕获组、Unicode 属性转义 `\p{...}`、`s`（dotAll）修饰符 |
| ES2020 | 2020 | `String.prototype.matchAll` |
| ES2022 | 2022 | `d` 修饰符（indices 属性） |
| ES2024 | 2024 | Unicode 15.1 属性支持、`v` 修饰符（集合操作） |

### 2.5 为什么 JavaScript 正则值得深入学习

正则表达式是 JavaScript 工程师的"瑞士军刀"：

- **表单验证**：邮箱、手机号、身份证、密码强度等。
- **字符串处理**：模板引擎、Markdown 解析、CSV 解析、URL 解析。
- **代码转换**：Babel、ESLint、Prettier 等工具大量使用正则。
- **爬虫与数据清洗**：从 HTML/JSON 文本中提取信息。
- **路由匹配**：Vue Router、React Router 的路径匹配底层基于正则。
- **安全过滤**：XSS 防御、SQL 注入防御（部分场景）。

掌握正则不仅是语法问题，更是性能、可维护性、安全性的综合考量。

---

## 3. 形式化定义

### 3.1 正则语言的形式化

**定义（正则语言）**：设 $\Sigma$ 为有限字母表，正则语言 $R$ 递归定义如下：

1. $\emptyset$（空集）是正则语言。
2. $\{\epsilon\}$（仅含空串的集合）是正则语言。
3. $\forall a \in \Sigma$，$\{a\}$ 是正则语言。
4. 若 $R_1, R_2$ 是正则语言，则 $R_1 \cup R_2$（并）、$R_1 \circ R_2$（连接）、$R_1^*$（克林闭包）都是正则语言。
5. 只有有限次应用上述规则得到的语言才是正则语言。

**Kleene 定理**：正则语言与有限状态自动机（FSA）等价。

### 3.2 正则表达式的代数性质

正则表达式构成代数系统 $(RE, \cup, \circ, *)$，满足：

**交换律（仅对并集）**：

$$
A \cup B = B \cup A
$$

**结合律**：

$$
(A \cup B) \cup C = A \cup (B \cup C)
$$

$$
(A \circ B) \circ C = A \circ (B \circ C)
$$

**分配律**：

$$
A \circ (B \cup C) = (A \circ B) \cup (A \circ C)
$$

$$
(B \cup C) \circ A = (B \circ A) \cup (C \circ A)
$$

**幂等律（仅对并集）**：

$$
A \cup A = A
$$

**空串单位元**：

$$
A \circ \{\epsilon\} = A
$$

注意：连接运算**不满足交换律**，即 $A \circ B \neq B \circ A$。这与正则表达式中的字符顺序一致。

### 3.3 NFA 与 DFA 的等价性

正则引擎有两种实现模型：

| 维度 | NFA（非确定有限自动机） | DFA（确定有限自动机） |
| --- | --- | --- |
| 状态转移 | 同一状态可有多条出边 | 同一状态对同一输入只有一条出边 |
| 回溯 | 需要回溯 | 无回溯 |
| 时间复杂度 | $O(n \times m)$（最坏指数级） | $O(n)$ |
| 空间复杂度 | $O(m)$ | $O(2^m)$ |
| 表达能力 | 等价于 DFA | 等价于 NFA |
| 反向引用 | 支持（扩展 NFA） | 不支持 |
| JavaScript 实现 | 回溯式 NFA | 不使用 |

**JavaScript 正则引擎是回溯式 NFA**，因此：

- 支持反向引用、前瞻、后瞻等扩展特性。
- 在最坏情况下性能退化为指数级。
- 需要警惕灾难性回溯。

### 3.4 正则表达式的语义函数

定义匹配函数 $M : RE \times \Sigma^* \to \mathcal{P}(\Sigma^*)$：

$$
M(R, s) = \{ t \in \Sigma^* \mid \exists u, v: s = t \cdot u \land t \in L(R) \}
$$

其中 $L(R)$ 是正则 $R$ 描述的语言。`exec` 返回的 `match[0]` 即 $M(R, s)$ 中的某个元素。

JavaScript 的 `test` 方法返回布尔值，等价于：

$$
\text{test}(R, s) = M(R, s) \neq \emptyset
$$

### 3.5 匹配模式的形式化

不同修饰符改变匹配语义：

- `g`（global）：返回所有匹配，而非首个。
- `i`（ignoreCase）：将 $\Sigma$ 视为不分大小写。
- `m`（multiline）：`^` 与 `$` 匹配每行边界。
- `s`（dotAll）：`.` 匹配换行符。
- `u`（unicode）：以码点（而非 UTF-16 码元）为单位匹配。
- `y`（sticky）：从 `lastIndex` 起严格匹配。
- `d`（hasIndices）：返回捕获组起止索引。

---

## 4. 理论推导

### 4.1 字符类的代数化简

字符类 `[abc]` 等价于并集：

$$
[abc] = a \cup b \cup c
$$

范围类 `[a-z]` 等价于：

$$
[a\text{-}z] = a \cup b \cup c \cup \cdots \cup z
$$

否定类 `[^abc]` 等价于：

$$
[\text{\^{a}bc}] = \Sigma - \{a, b, c\}
$$

预定义字符类的展开：

| 预定义 | 等价 | 含义 |
| --- | --- | --- |
| `\d` | `[0-9]` | 数字 |
| `\D` | `[^\d]` | 非数字 |
| `\w` | `[A-Za-z0-9_]` | 单词字符 |
| `\W` | `[^\w]` | 非单词字符 |
| `\s` | `[ \t\n\r\f\v]` | 空白字符 |
| `\S` | `[^\s]` | 非空白字符 |
| `.` | `[^\n]`（默认） | 任意字符（除换行） |
| `.` + `s` | `[\s\S]` | 任意字符 |

### 4.2 量词的递归展开

量词的语义是递归定义的：

**克林闭包 `*`**：

$$
A^* = \bigcup_{i=0}^{\infty} A^i = \{\epsilon\} \cup A \cup A^2 \cup A^3 \cup \cdots
$$

**正闭包 `+`**：

$$
A^+ = A \circ A^* = \bigcup_{i=1}^{\infty} A^i
$$

**可选 `?`**：

$$
A? = \{\epsilon\} \cup A = A^0 \cup A^1
$$

**精确量词 `{n}`**：

$$
A^n = \underbrace{A \circ A \circ \cdots \circ A}_{n}
$$

**范围量词 `{n,m}`**：

$$
A^{n,m} = \bigcup_{i=n}^{m} A^i
$$

### 4.3 贪婪与懒惰的回溯差异

**贪婪量词** `.*` 优先匹配最长串，失败后回溯：

```
模式: .*foo
输入: xfooyfoo
```

1. `.*` 匹配整个 `xfooyfoo`。
2. 尝试匹配 `foo`，但已到字符串末尾，失败。
3. 回溯：`.*` 匹配 `xfooyfo`。
4. 尝试匹配 `foo`，剩余 `o` 不匹配，失败。
5. 继续回溯：`.*` 匹配 `xfooyf`。
6. 剩余 `oo` 不匹配 `foo`。
7. 回溯：`.*` 匹配 `xfooy`。
8. 剩余 `foo` 匹配成功。

**懒惰量词** `.*?` 优先匹配最短串：

1. `.*?` 匹配空串。
2. 尝试匹配 `foo`，剩余 `xfoo...` 不匹配。
3. 扩展：`.*?` 匹配 `x`。
4. 剩余 `foo...` 匹配 `foo` 成功。

**回溯次数对比**：

| 量词 | 模式 | 输入长度 $n$ | 回溯次数 |
| --- | --- | --- | --- |
| 贪婪 | `.*foo` | $n$ | $O(n)$ |
| 懒惰 | `.*?foo` | $n$ | $O(1)$（首次匹配即成功） |

### 4.4 灾难性回溯的形式化

**定义**：正则 $R$ 在输入 $s$ 上发生灾难性回溯，当且仅当其 NFA 模拟步数关于 $|s|$ 指数增长。

**经典案例**：`(a+)+b` 在输入 `aaaa...a!`（$n$ 个 `a` 后接非 `a` 字符）上的回溯步数为 $O(2^n)$。

**原理**：嵌套量词 `+` 与 `+` 之间存在多种分解方式。对于 $n$ 个 `a`，可分解为：

- 1 个 `(a+)` 含 $n$ 个 `a`。
- 2 个 `(a+)` 分别含 $1, n-1$；$2, n-2$；... 共 $n-1$ 种。
- 3 个 `(a+)` 共 $\binom{n-1}{2}$ 种。
- ...

总分解数为 $2^{n-1}$，每种都可能被尝试一次。

**防御**：

- 使用占有量词 `++`（部分引擎支持，JavaScript 不支持）。
- 使用原子组 `(?>...)`（JavaScript 不支持）。
- 重构正则：用 `a+b` 替代 `(a+)+b`。

### 4.5 反向引用与捕获组的状态

捕获组 `(...)` 在 NFA 中保存最近匹配的子串，反向引用 `\1` 在后续位置匹配相同子串：

```
模式: (\w+)\s+\1
输入: hello hello
```

1. `(\w+)` 匹配 `hello`，捕获组 1 = "hello"。
2. `\s+` 匹配空格。
3. `\1` 匹配捕获组 1 的值 "hello"。

**注意**：反向引用使正则超出正则语言范围（成为上下文相关语言），导致：

- DFA 无法实现（DFA 无状态）。
- 部分引擎在含反向引用时退化为慢速回溯。

### 4.6 零宽断言的语义

**前瞻** `(?=...)` 与 **负前瞻** `(?!...)` 是零宽断言：匹配位置而非字符，不消耗输入。

```
模式: \d+(?=元)
输入: 100元
匹配: "100"（"元"不消耗）
```

**后瞻** `(?<=...)` 与 **负后瞻** `(?<!...)` 类似，但要求前面匹配。

```
模式: (?<=\$)\d+
输入: $100
匹配: "100"（"$"不消耗）
```

后瞻在 JavaScript 中是 ES2018 引入，性能不如前瞻（需回溯）。

### 4.7 Unicode 处理与 UTF-16

JavaScript 字符串以 UTF-16 编码存储。BMP 之外的字符（如 emoji）占用 2 个码元：

```javascript
const emoji = '';
console.log(emoji.length); // 2
console.log(emoji.charCodeAt(0)); // 55357 (0xD83E)
console.log(emoji.charCodeAt(1)); // 56877 (0xDDD7)
```

不加 `u` 修饰符时，正则按码元匹配，导致：

```javascript
/^.$/.test(emoji); // false（. 只匹配 1 个码元）
/^[\u{1F9D7}]$/.test(emoji); // SyntaxError（无 u 时不支持 \u{...}）
```

加 `u` 修饰符后按码点匹配：

```javascript
/^.$/u.test(emoji); // true
/^[\u{1F9D7}]$/u.test(emoji); // true
```

---

## 5. 代码示例

### 5.1 创建正则表达式

```javascript
// 方式一：字面量（推荐用于静态模式）
const pattern1 = /hello/i;
const pattern2 = /\d+/g;
const pattern3 = /\bword\b/gim;

// 方式二：构造函数（用于动态模式）
const keyword = 'hello';
const pattern4 = new RegExp(keyword, 'i');

// 动态拼接需转义特殊字符
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const userInput = 'price: $50';
const escaped = escapeRegExp(userInput);
const pattern5 = new RegExp(escaped, 'g');

// 修饰符
const flags = 'gimsuyd';
// g: 全局匹配
// i: 忽略大小写
// m: 多行模式
// s: dotAll 模式（. 匹配换行符）
// u: Unicode 模式
// y: 粘连模式
// d: 返回 indices

// flags 属性
console.log(/abc/gi.flags); // "gi"
console.log(/abc/gi.source); // "abc"
```

### 5.2 基础语法：字符类与量词

```javascript
// 字符类
console.log(/[abc]/.test('a')); // true
console.log(/[^abc]/.test('a')); // false
console.log(/[a-z]/.test('m')); // true
console.log(/[A-Z]/.test('M')); // true
console.log(/[0-9]/.test('5')); // true
console.log(/[a-zA-Z0-9]/.test('A')); // true

// 预定义字符类
console.log(/./.test('a')); // true（除 \n）
console.log(/\d/.test('5')); // true
console.log(/\D/.test('5')); // false
console.log(/\w/.test('_')); // true
console.log(/\W/.test('_')); // false
console.log(/\s/.test(' ')); // true
console.log(/\S/.test(' ')); // false

// 量词
console.log(/a*/.test('')); // true（0 次）
console.log(/a+/.test('')); // false（至少 1 次）
console.log(/a?/.test('b')); // true（0 或 1 次）
console.log(/a{3}/.test('aaa')); // true
console.log(/a{2,}/.test('aa')); // true（至少 2 次）
console.log(/a{2,4}/.test('aaa')); // true（2-4 次）

// 贪婪 vs 非贪婪
const str = '<div>hello</div>';
console.log(str.match(/<.+>/)[0]); // "<div>hello</div>"（贪婪）
console.log(str.match(/<.+?>/)[0]); // "<div>"（非贪婪）
```

### 5.3 边界与锚点

```javascript
// ^ 与 $（行/字符串边界）
console.log(/^hello/.test('hello world')); // true
console.log(/world$/.test('hello world')); // true
console.log(/^hello$/.test('hello')); // true

// 多行模式
const multiline = `line1
line2
line3`;
console.log(multiline.match(/^line\d/gm)); // ['line1', 'line2', 'line3']

// \b 单词边界
console.log(/\bword\b/.test('a word here')); // true
console.log(/\bword\b/.test('password')); // false

// \B 非单词边界
console.log(/\Bword\B/.test('password')); // true
```

### 5.4 分组与反向引用

```javascript
// 捕获分组
const match = /(\d{4})-(\d{2})-(\d{2})/.exec('2026-07-21');
console.log(match[0]); // "2026-07-21"
console.log(match[1]); // "2026"
console.log(match[2]); // "07"
console.log(match[3]); // "21"
console.log(match.index); // 0
console.log(match.input); // "2026-07-21"

// 命名捕获组（ES2018）
const named = /(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/.exec('2026-07-21');
console.log(named.groups.year); // "2026"
console.log(named.groups.month); // "07"
console.log(named.groups.day); // "21"

// 非捕获分组
const nonCapturing = /(?:abc)+/.exec('abcabc');
console.log(nonCapturing[0]); // "abcabc"
console.log(nonCapturing.length); // 1（无捕获组）

// 反向引用
console.log(/(\w+)\s\1/.test('hello hello')); // true
console.log(/(\w+)\s\1/.test('hello world')); // false
console.log(/(?<word>\w+)\s\k<word>/.test('hello hello')); // true

// 多重反向引用
const htmlTag = /<(\w+)>.*<\/\1>/.exec('<div>content</div>');
console.log(htmlTag[1]); // "div"
```

### 5.5 前瞻与后瞻

```javascript
// 正向前瞻
console.log(/\d+(?=元)/.exec('100元')[0]); // "100"
console.log(/\d+(?=元)/.test('100')); // false

// 负向前瞻
console.log(/\d+(?!元)/.exec('100美元')[0]); // "100"（不在"元"前）
console.log(/\d+(?!元)/.test('100元')); // false

// 正向后瞻（ES2018）
console.log(/(?<=\$)\d+/.exec('$100')[0]); // "100"
console.log(/(?<=\$)\d+/.test('100')); // false

// 负向后瞻
console.log(/(?<!\$)\d+/.exec('100')[0]); // "100"
console.log(/(?<!\$)\d+/.test('$100')); // false（"$100" 中 "100" 前是 "$"）

// 实用：货币符号后提取金额
const text = '价格 $100，原价 ¥200，现价 €50';
const prices = text.match(/(?<=[$¥€])\d+/g);
console.log(prices); // ['100', '200', '50']
```

### 5.6 Unicode 处理

```javascript
// u 修饰符：正确处理 Unicode
const emoji = '';

// 不加 u：错误
console.log(/^.$/.test(emoji)); // false
console.log(/[\u{1F9D7}]/.test(emoji)); // SyntaxError

// 加 u：正确
console.log(/^.$/u.test(emoji)); // true
console.log(/[\u{1F9D7}]/u.test(emoji)); // true

// Unicode 属性转义（ES2018）
console.log(/\p{Script=Greek}/u.test('α')); // true
console.log(/\p{Script=Han}/u.test('汉字')); // true
console.log(/\p{Emoji}/u.test('')); // true
console.log(/\p{Letter}/u.test('a')); // true

// 处理代理对
const strWithEmoji = 'hello world  nice';
const words = strWithEmoji.match(/[\p{L}\p{N}\p{Emoji}]+/gu);
console.log(words); // ['hello', 'world', '', 'nice']

// 字符串长度（按码点）
function codePointLength(str) {
  return [...str].length;
}
console.log(codePointLength(emoji)); // 1
console.log(emoji.length); // 2（按码元）
```

### 5.7 修饰符组合与 lastIndex

```javascript
// g 修饰符与 lastIndex
const pattern = /\d+/g;
const str = 'a1b22c333';

console.log(pattern.lastIndex); // 0
let match;

while ((match = pattern.exec(str)) !== null) {
  console.log(`Found ${match[0]} at ${match.index}`);
  // Found 1 at 1
  // Found 22 at 3
  // Found 333 at 6
}

console.log(pattern.lastIndex); // 0（循环结束后重置）

// 陷阱：test 与 lastIndex 的关系
const p = /\d+/g;
console.log(p.test('123')); // true, lastIndex = 3
console.log(p.test('123')); // false（从 lastIndex=3 开始，无匹配）
console.log(p.lastIndex); // 0（重置）

// y 修饰符（粘性）
const sticky = /\d+/y;
sticky.lastIndex = 1;
console.log(sticky.exec('a123')[0]); // "123"

sticky.lastIndex = 0;
console.log(sticky.exec('a123')); // null（位置 0 不是数字）

// d 修饰符（indices）
const withIndices = /(\d+)-(\d+)/d;
const result = withIndices.exec('2026-07');
console.log(result.indices); // [[0, 7], [0, 4], [5, 7]]
console.log(result.indices.groups); // undefined（无命名组）
```

### 5.8 String 方法与正则

```javascript
const text = 'Hello World, hello JavaScript';

// match
console.log(text.match(/hello/i)); // ["Hello", index: 0, ...]
console.log(text.match(/hello/gi)); // ["Hello", "hello"]
console.log(text.match(/xyz/)); // null

// matchAll（ES2020）
const matches = [...text.matchAll(/he(l)(l)o/gi)];
for (const match of matches) {
  console.log(match[0], match[1], match[2], match.index);
}

// search
console.log(text.search(/World/)); // 6
console.log(text.search(/xyz/)); // -1

// replace
console.log(text.replace(/hello/i, 'Hi')); // "Hi World, hello JavaScript"
console.log(text.replace(/hello/gi, 'Hi')); // "Hi World, Hi JavaScript"

// 使用回调函数
const replaced = text.replace(/hello/gi, (match, offset) => {
  return match.toUpperCase() + `@${offset}`;
});
console.log(replaced); // "HELLO@0 World, HELLO@13 JavaScript"

// 使用命名捕获组
const date = '2026-07-21';
const formatted = date.replace(
  /(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/,
  '$<day>/$<month>/$<year>'
);
console.log(formatted); // "21/07/2026"

// split
console.log('one,two;three|four'.split(/[,;|]/)); // ['one', 'two', 'three', 'four']

// 保留分隔符
console.log('a1b2c3'.split(/(\d)/)); // ['a', '1', 'b', '2', 'c', '3', '']
```

### 5.9 实用模式：表单验证

```javascript
// 邮箱
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
console.log(emailRegex.test('user@example.com')); // true

// 中国大陆手机号
const phoneRegex = /^1[3-9]\d{9}$/;
console.log(phoneRegex.test('13812345678')); // true

// 身份证号（18 位）
const idCardRegex = /^\d{17}[\dXx]$/;
console.log(idCardRegex.test('11010119900307231X')); // true

// 强密码：至少 8 位，含大小写字母、数字、特殊字符
const strongPwd = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
console.log(strongPwd.test('Abc123!@#')); // true

// URL
const urlRegex = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;
console.log(urlRegex.test('https://example.com/path')); // true

// IPv4
const ipv4Regex = /^((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(25[0-5]|2[0-4]\d|[01]?\d\d?)$/;
console.log(ipv4Regex.test('192.168.1.1')); // true

// IPv6（简化）
const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
console.log(ipv6Regex.test('2001:0db8:85a3:0000:0000:8a2e:0370:7334')); // true

// 中文
const chineseRegex = /^[\u4e00-\u9fa5]+$/;
console.log(chineseRegex.test('你好世界')); // true

// 邮编
const postalRegex = /^\d{6}$/;
console.log(postalRegex.test('100000')); // true

// 通用校验函数
function validate(value, pattern, message) {
  if (!pattern.test(value)) {
    return { valid: false, message };
  }
  return { valid: true };
}

console.log(validate('user@example.com', emailRegex, '邮箱格式错误'));
console.log(validate('13800138000', phoneRegex, '手机号格式错误'));
```

### 5.10 实用模式：文本处理

```javascript
// 提取所有 URL
const text = 'Visit https://example.com and http://test.org for more info.';
const urls = text.match(/https?:\/\/[^\s]+/g);
console.log(urls); // ['https://example.com', 'http://test.org']

// 提取 HTML 标签
const html = '<div class="main"><h1>Title</h1><p>Content</p></div>';
const tags = [...html.matchAll(/<(\w+)[^>]*>(.*?)<\/\1>/gs)];
for (const tag of tags) {
  console.log(`Tag: ${tag[1]}, Content: ${tag[2]}`);
}

// 去除 HTML 标签
const cleanText = html.replace(/<[^>]+>/g, '');
console.log(cleanText); // "TitleContent"

// 千分位格式化
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
console.log(formatNumber(1234567890)); // "1,234,567,890"

// 驼峰转下划线
function camelToSnake(str) {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}
console.log(camelToSnake('myVariableName')); // "my_variable_name"

// 下划线转驼峰
function snakeToCamel(str) {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}
console.log(snakeToCamel('my_variable_name')); // "myVariableName"

// 模板引擎
function render(template, data) {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] !== undefined ? data[key] : match;
  });
}
console.log(render('Hello, {{name}}! Age: {{age}}', { name: 'Alice', age: 25 }));
// "Hello, Alice! Age: 25"

// Markdown 简单转换
function markdownToHtml(md) {
  return md
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');
}
console.log(markdownToHtml('# Title\n**bold** and *italic*'));
// "<h1>Title</h1>\n<strong>bold</strong> and <em>italic</em>"

// 简单 CSV 解析
function parseCSV(csv) {
  const lines = csv.trim().split('\n');
  const headers = lines[0].split(',');
  return lines.slice(1).map(line => {
    const values = line.split(',');
    return headers.reduce((obj, h, i) => {
      obj[h.trim()] = values[i]?.trim();
      return obj;
    }, {});
  });
}
console.log(parseCSV('name,age,city\nAlice,30,Beijing\nBob,25,Shanghai'));

// 检测密码强度
function checkPasswordStrength(password) {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z\d]/.test(password)) score++;

  const levels = ['very weak', 'weak', 'fair', 'good', 'strong', 'very strong'];
  return { score, level: levels[Math.min(score, 5)] };
}

console.log(checkPasswordStrength('password'));
// { score: 2, level: 'fair' }
console.log(checkPasswordStrength('Pass123!@#xyz'));
// { score: 6, level: 'very strong' }
```

### 5.11 性能优化：预编译

```javascript
// 反模式：每次循环创建新正则
function badPractice(items) {
  return items.filter(item => /^[a-z]+$/.test(item));
}

// 优化：预编译
const pattern = /^[a-z]+$/;
function goodPractice(items) {
  return items.filter(item => pattern.test(item));
}

// 性能对比
const items = Array.from({ length: 100000 }, (_, i) => `item${i}`);

console.time('bad');
badPractice(items);
console.timeEnd('bad'); // ~30ms

console.time('good');
goodPractice(items);
console.timeEnd('good'); // ~10ms
```

### 5.12 性能优化：避免灾难性回溯

```javascript
// 危险：嵌套量词导致指数回溯
const dangerous = /(a+)+b/;
const evil = 'a'.repeat(25) + 'c'; // 25 个 a + 1 个非 a/b 字符

console.time('dangerous');
dangerous.test(evil);
console.timeEnd('dangerous'); // 可能数秒

// 安全：扁平化正则
const safe = /a+b/;
console.time('safe');
safe.test(evil);
console.timeEnd('safe'); // <1ms

// 通用防御：使用更具体的模式
// 危险：(.+)+@.+  可能 ReDoS
// 安全：[\w.+-]+@[\w-]+\.[\w.-]+
```

### 5.13 测试与调试

```javascript
// 详细匹配信息
function debugMatch(pattern, str) {
  const regex = new RegExp(pattern, 'g');
  const matches = [...str.matchAll(regex)];

  console.log(`Pattern: ${pattern}`);
  console.log(`String: ${str}`);
  console.log(`Matches: ${matches.length}`);

  for (const match of matches) {
    console.log(`  Match: "${match[0]}" at ${match.index}`);
    if (match.groups) {
      console.log('  Groups:', match.groups);
    }
  }
}

debugMatch(/(\w+)@(\w+)\.(\w+)/g, 'user@example.com and admin@test.org');
// Pattern: (\w+)@(\w+)\.(\w+)
// String: user@example.com and admin@test.org
// Matches: 2
//   Match: "user@example.com" at 0
//   Groups: undefined
//   Match: "admin@test.org" at 23

// 使用命名组让调试更清晰
function debugNamed(pattern, str) {
  const regex = new RegExp(pattern.source, pattern.flags + (pattern.flags.includes('d') ? '' : 'd'));
  for (const match of str.matchAll(regex)) {
    console.log({
      match: match[0],
      index: match.index,
      indices: match.indices,
      groups: match.groups,
    });
  }
}

debugNamed(
  /(?<user>\w+)@(?<domain>\w+)\.(?<tld>\w+)/gd,
  'user@example.com'
);
```

### 5.14 正则的子类化（ES6）

```javascript
class ExtendedRegExp extends RegExp {
  constructor(pattern, flags) {
    super(pattern, flags);
  }

  // 添加 execAll 方法
  execAll(str) {
    const results = [];
    let match;
    this.lastIndex = 0;
    while ((match = this.exec(str)) !== null) {
      results.push(match);
    }
    return results;
  }

  // 替换并保留原值
  replaceSafe(str, replacement) {
    const original = this.source;
    const result = str.replace(this, replacement);
    console.log(`Replaced using /${original}/${this.flags}`);
    return result;
  }
}

const ext = new ExtendedRegExp('\\d+', 'g');
console.log(ext.execAll('a1b22c333').map(m => m[0])); // ['1', '22', '333']
```

---

## 6. 对比分析

### 6.1 字符串方法对比

| 方法 | 返回类型 | 全局支持 | 用途 |
| --- | --- | --- | --- |
| `String.match(regex)` | Array \| null | g 时返回所有 | 获取匹配 |
| `String.matchAll(regex)` | Iterator | 必须 g | 获取所有匹配（含分组） |
| `String.search(regex)` | Number | - | 查找首个位置 |
| `String.replace(regex, str)` | String | g 时替换所有 | 替换 |
| `String.replaceAll(str, str)` | String | - | 字符串替换（ES2021） |
| `String.split(regex)` | Array | - | 分割 |
| `RegExp.exec(str)` | Array \| null | g 时推进 lastIndex | 详细匹配 |
| `RegExp.test(str)` | Boolean | g 时推进 lastIndex | 检测匹配 |

### 6.2 量词行为对比

| 量词 | 含义 | 贪婪 | 回溯行为 |
| --- | --- | --- | --- |
| `*` | 0 或多次 | 是 | 优先匹配最多 |
| `+` | 1 或多次 | 是 | 优先匹配最多 |
| `?` | 0 或 1 次 | 是 | 优先匹配 1 次 |
| `{n}` | 精确 n 次 | - | 无选择 |
| `{n,}` | 至少 n 次 | 是 | 优先匹配最多 |
| `{n,m}` | n 到 m 次 | 是 | 优先匹配最多 |
| `*?` | 0 或多次 | 否 | 优先匹配最少 |
| `+?` | 1 或多次 | 否 | 优先匹配最少 |
| `??` | 0 或 1 次 | 否 | 优先匹配 0 次 |
| `*+` | 占有 | - | 不回溯（JS 不支持） |

### 6.3 修饰符对比

| 修饰符 | 引入版本 | 作用 | 性能影响 |
| --- | --- | --- | --- |
| `g` | ES3 | 全局匹配 | 维护 lastIndex |
| `i` | ES3 | 忽略大小写 | 微小 |
| `m` | ES3 | 多行模式 | 微小 |
| `s` | ES2018 | dotAll | 微小 |
| `u` | ES6 | Unicode 模式 | 显著（需重解析） |
| `y` | ES6 | 粘性 | 微小 |
| `d` | ES2022 | indices | 微小 |

### 6.4 NFA vs DFA 引擎对比

| 维度 | NFA（JavaScript） | DFA（如 RE2） |
| --- | --- | --- |
| 算法 | 回溯式搜索 | 状态机并行 |
| 时间复杂度 | $O(n \times m)$，最坏指数 | $O(n)$ |
| 空间复杂度 | $O(m)$ | $O(2^m)$ |
| 反向引用 | 支持 | 不支持 |
| 前瞻/后瞻 | 支持 | 不支持 |
| 灾难性回溯 | 可能 | 不可能 |
| 典型库 | JavaScript RegExp、PCRE | RE2、Rust regex |

### 6.5 与其他语言正则对比

| 特性 | JavaScript | Python | Java | Go | Rust |
| --- | --- | --- | --- | --- | --- |
| 引擎类型 | 回溯 NFA | 回溯 NFA | 回溯 NFA | RE2（DFA） | 回溯 NFA |
| 命名捕获 | ES2018 | 支持 | 支持 | 不支持 | 支持 |
| 后瞻 | ES2018 | 支持 | 支持 | 不支持 | 支持 |
| Unicode 属性 | ES2018 | 支持 | 支持 | 有限 | 支持 |
| 占有量词 | 不支持 | 支持 | 支持 | 不支持 | 不支持 |
| 原子组 | 不支持 | 支持 | 支持 | 不适用 | 不支持 |

### 6.6 字符串处理方案对比

| 方案 | 适用场景 | 优势 | 劣势 |
| --- | --- | --- | --- |
| 正则表达式 | 模式匹配 | 简洁、声明式 | 可读性差、易 ReDoS |
| 字符串方法 | 简单查找 | 可读性好 | 复杂模式难表达 |
| 手写解析器 | 复杂语法 | 完全可控 | 代码量大 |
| 解析器生成器 | 完整 DSL | 健壮、可维护 | 学习成本高 |

---

## 7. 常见陷阱

### 7.1 陷阱：`test` 与 `lastIndex` 副作用

```javascript
// 错误：g 修饰符让 test 改变状态
const pattern = /\d+/g;
console.log(pattern.test('123')); // true
console.log(pattern.test('123')); // false（lastIndex 已变为 3）

// 修复：每次重置 lastIndex
pattern.lastIndex = 0;
console.log(pattern.test('123')); // true

// 或使用 match
console.log('123'.match(/\d+/g)); // ['123']
```

### 7.2 陷阱：特殊字符未转义

```javascript
// 错误：用户输入直接拼接正则
const userInput = 'price: $50';
const regex = new RegExp(userInput); // $ 是特殊字符
console.log(regex.test('price 50')); // false（$ 被解释为行尾）

// 修复：转义
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
const safeRegex = new RegExp(escapeRegExp(userInput));
console.log(safeRegex.test('price: $50')); // true
```

### 7.3 陷阱：贪婪匹配导致过度消费

```javascript
// 错误：贪婪匹配吞掉多个标签
const html = '<a>1</a><a>2</a>';
const wrong = html.match(/<a>.+<\/a>/)[0];
// wrong = "<a>1</a><a>2</a>"（整个）

// 修复：非贪婪
const right = html.match(/<a>.+?<\/a>/g);
// right = ["<a>1</a>", "<a>2</a>"]
```

### 7.4 陷阱：Unicode 字符被拆分

```javascript
// 错误：未加 u，emoji 被拆为两个码元
const emoji = '';
console.log(/^.$/.test(emoji)); // false
console.log(emoji.length); // 2

// 修复：加 u
console.log(/^.$/u.test(emoji)); // true
console.log([...emoji].length); // 1
```

### 7.5 陷阱：`String.replace` 的 `$` 特殊含义

```javascript
// 错误：替换字符串含 $ 时被特殊解释
const result = 'price'.replace(/price/, '$100');
console.log(result); // "100"（$1 被解释为捕获组 1）

// 修复：使用函数返回字符串
const safe = 'price'.replace(/price/, () => '$100');
console.log(safe); // "$100"
```

### 7.6 陷阱：捕获组与 `(?:...)` 混淆

```javascript
// 错误：以为 (?:...) 会捕获
const match = /(?:abc)(\d+)/.exec('abc123');
console.log(match[1]); // "123"
console.log(match[2]); // undefined（只有 1 个捕获组）
```

### 7.7 陷阱：`^` 与 `$` 的多行模式

```javascript
const multiline = `line1
line2`;

// 错误：以为 $ 匹配字符串结尾
console.log(/^line\d$/.test(multiline)); // false（不匹配多行）

// 修复：加 m 修饰符
console.log(/^line\d$/m.test(multiline)); // true
```

### 7.8 陷阱：反向引用的空匹配

```javascript
// 错误：反向引用在空捕获时行为不一致
const match = /(a)?\1/.exec('b');
// 不同引擎行为不同，Chrome 返回 ["", undefined]
console.log(match[0]); // ""

// 修复：明确可选性
const safe = /(a)?(?:\1)?/.exec('b');
```

### 7.9 陷阱：`split` 与捕获组的交互

```javascript
// 捕获组会被包含在结果中
console.log('a1b2c'.split(/(\d)/));
// ['a', '1', 'b', '2', 'c', '']

// 不需要时用非捕获组
console.log('a1b2c'.split(/(?:\d)/));
// ['a', 'b', 'c']
```

### 7.10 陷阱：ReDoS 攻击

```javascript
// 漏洞代码：用户输入可触发灾难性回溯
function isValidEmail(email) {
  // 危险模式：嵌套量词
  return /^([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+)\.([a-zA-Z]{2,})$/.test(email);
}

// 攻击输入
const attack = 'a'.repeat(30) + '!';
console.time('test');
isValidEmail(attack);
console.timeEnd('test'); // 可能数秒

// 防御：使用更具体、无嵌套量词的模式
const safeEmailRegex = /^[a-zA-Z0-9._%+-]{1,64}@[a-zA-Z0-9.-]{1,253}\.[a-zA-Z]{2,}$/;
```

---

## 8. 工程实践

### 8.1 类型安全的正则封装

```javascript
/**
 * 类型安全的正则匹配工具
 */
class SafeRegex {
  constructor(pattern, flags = '') {
    this.regex = new RegExp(pattern, flags);
  }

  /**
   * 安全测试，重置 lastIndex
   */
  test(str) {
    this.regex.lastIndex = 0;
    return this.regex.test(str);
  }

  /**
   * 执行一次匹配
   */
  exec(str) {
    this.regex.lastIndex = 0;
    return this.regex.exec(str);
  }

  /**
   * 获取所有匹配
   */
  execAll(str) {
    if (!this.regex.global) {
      throw new Error('正则需要 g 修饰符');
    }
    this.regex.lastIndex = 0;
    const results = [];
    let match;
    while ((match = this.regex.exec(str)) !== null) {
      results.push(match);
    }
    return results;
  }

  /**
   * 替换（不修改原字符串）
   */
  replace(str, replacement) {
    this.regex.lastIndex = 0;
    return str.replace(this.regex, replacement);
  }

  /**
   * 超时保护（防止 ReDoS）
   */
  testWithTimeout(str, timeout = 1000) {
    const start = Date.now();
    this.regex.lastIndex = 0;
    const result = this.regex.test(str);
    const elapsed = Date.now() - start;
    if (elapsed > timeout) {
      console.warn(`正则执行超时：${elapsed}ms`);
    }
    return { result, elapsed };
  }
}

// 使用
const emailRegex = new SafeRegex(/^[a-z]+@[a-z]+\.[a-z]+$/i);
console.log(emailRegex.test('user@example.com')); // true
```

### 8.2 正则表达式生成器

```javascript
/**
 * 动态生成常见正则
 */
class RegexBuilder {
  static email() {
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  }

  static phone(region = 'CN') {
    const patterns = {
      CN: /^1[3-9]\d{9}$/,
      US: /^\+?1?\d{10}$/,
      UK: /^\+?44\d{10}$/,
    };
    return patterns[region] || patterns.CN;
  }

  static url() {
    return /^https?:\/\/[^\s]+$/;
  }

  static ipv4() {
    return /^((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(25[0-5]|2[0-4]\d|[01]?\d\d?)$/;
  }

  static date(format = 'YYYY-MM-DD') {
    const patterns = {
      'YYYY-MM-DD': /^\d{4}-\d{2}-\d{2}$/,
      'DD/MM/YYYY': /^\d{2}\/\d{2}\/\d{4}$/,
      'MM-DD-YYYY': /^\d{2}-\d{2}-\d{4}$/,
    };
    return patterns[format];
  }

  static color() {
    return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
  }

  static uuid() {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  }

  /**
   * 任意单词
   */
  static word(min = 1, max = 50) {
    return new RegExp(`\\b\\w{${min},${max}}\\b`);
  }

  /**
   * 数字范围
   */
  static numberRange(min, max) {
    const digits = Math.max(min.toString().length, max.toString().length);
    return new RegExp(`^\\d{1,${digits}}$`);
  }
}

// 使用
console.log(RegexBuilder.email().test('user@example.com'));
console.log(RegexBuilder.phone('CN').test('13812345678'));
```

### 8.3 模板引擎实现

```javascript
/**
 * 简单模板引擎
 * 支持：{{ var }}、{% if cond %}、{% for item in list %}
 */
class TemplateEngine {
  constructor(template) {
    this.template = template;
  }

  render(data) {
    let output = this.template;

    // 替换变量
    output = output.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) => {
      return data[key] !== undefined ? data[key] : '';
    });

    // 处理条件
    output = output.replace(
      /\{%\s*if\s+(\w+)\s*%\}([\s\S]*?)\{%\s*endif\s*%\}/g,
      (match, key, content) => {
        return data[key] ? content : '';
      }
    );

    // 处理循环
    output = output.replace(
      /\{%\s*for\s+(\w+)\s+in\s+(\w+)\s*%\}([\s\S]*?)\{%\s*endfor\s*%\}/g,
      (match, item, list, content) => {
        const arr = data[list] || [];
        return arr
          .map((val) => content.replace(new RegExp(`\\$\\{${item}\\}`, 'g'), val))
          .join('');
      }
    );

    return output;
  }
}

const template = `
Hello, {{ name }}!
{% if isAdmin %}Welcome admin!{% endif %}
{% for item in items %}- ${item}
{% endfor %}
`;

const engine = new TemplateEngine(template);
console.log(
  engine.render({
    name: 'Alice',
    isAdmin: true,
    items: ['apple', 'banana', 'cherry'],
  })
);
```

### 8.4 Markdown 解析器（简化）

```javascript
class MarkdownParser {
  constructor() {
    this.rules = [
      { pattern: /^### (.+)$/gm, replace: '<h3>$1</h3>' },
      { pattern: /^## (.+)$/gm, replace: '<h2>$1</h2>' },
      { pattern: /^# (.+)$/gm, replace: '<h1>$1</h1>' },
      { pattern: /\*\*(.+?)\*\*/g, replace: '<strong>$1</strong>' },
      { pattern: /\*(.+?)\*/g, replace: '<em>$1</em>' },
      { pattern: /`(.+?)`/g, replace: '<code>$1</code>' },
      { pattern: /\[(.+?)\]\((.+?)\)/g, replace: '<a href="$2">$1</a>' },
      { pattern: /^- (.+)$/gm, replace: '<li>$1</li>' },
      { pattern: /^> (.+)$/gm, replace: '<blockquote>$1</blockquote>' },
      { pattern: /!\[(.+?)\]\((.+?)\)/g, replace: '<img alt="$1" src="$2">' },
    ];
  }

  parse(md) {
    let html = md;

    // 处理代码块
    html = html.replace(/```(\w+)?\n([\s\S]+?)\n```/g, (match, lang, code) => {
      return `<pre><code class="${lang || ''}">${this.escapeHtml(code)}</code></pre>`;
    });

    // 应用规则
    for (const rule of this.rules) {
      html = html.replace(rule.pattern, rule.replace);
    }

    // 处理列表
    html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`);

    // 处理段落
    html = html
      .split('\n\n')
      .map((para) => {
        if (/^<(h\d|ul|ol|pre|blockquote)/.test(para)) return para;
        return `<p>${para}</p>`;
      })
      .join('\n');

    return html;
  }

  escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}

const parser = new MarkdownParser();
console.log(parser.parse('# Title\n\nSome **bold** text.'));
// "<h1>Title</h1>\n<p>Some <strong>bold</strong> text.</p>"
```

### 8.5 路由匹配

```javascript
/**
 * 简单路由器：将路径模式转为正则
 */
class Router {
  constructor() {
    this.routes = [];
  }

  add(pattern, handler) {
    const keys = [];
    const regex = new RegExp(
      pattern.replace(/:([^/]+)/g, (_, key) => {
        keys.push(key);
        return '([^/]+)';
      })
    );
    this.routes.push({ regex, keys, handler });
  }

  match(path) {
    for (const route of this.routes) {
      const match = route.regex.exec(path);
      if (match) {
        const params = {};
        route.keys.forEach((key, i) => {
          params[key] = match[i + 1];
        });
        return { handler: route.handler, params };
      }
    }
    return null;
  }
}

const router = new Router();
router.add('/users/:id', (params) => console.log('User:', params.id));
router.add('/posts/:year/:month', (params) => console.log('Posts:', params));

router.match('/users/123'); // User: 123
router.match('/posts/2026/07'); // Posts: { year: '2026', month: '07' }
```

### 8.6 词法分析器

```javascript
/**
 * 简单词法分析器
 */
class Lexer {
  constructor(rules) {
    this.rules = rules;
  }

  tokenize(input) {
    const tokens = [];
    let pos = 0;

    while (pos < input.length) {
      let matched = false;

      for (const { type, pattern } of this.rules) {
        const regex = new RegExp(pattern, 'y');
        regex.lastIndex = pos;
        const match = regex.exec(input);

        if (match) {
          if (type !== 'whitespace') {
            tokens.push({ type, value: match[0], pos });
          }
          pos += match[0].length;
          matched = true;
          break;
        }
      }

      if (!matched) {
        throw new Error(`Unexpected character at ${pos}: ${input[pos]}`);
      }
    }

    return tokens;
  }
}

const lexer = new Lexer([
  { type: 'number', pattern: '\\d+(\\.\\d+)?' },
  { type: 'operator', pattern: '[+\\-*/]' },
  { type: 'paren', pattern: '[()]' },
  { type: 'whitespace', pattern: '\\s+' },
]);

console.log(lexer.tokenize('(1 + 2) * 3'));
// [
//   { type: 'paren', value: '(', pos: 0 },
//   { type: 'number', value: '1', pos: 1 },
//   { type: 'operator', value: '+', pos: 3 },
//   { type: 'number', value: '2', pos: 5 },
//   { type: 'paren', value: ')', pos: 6 },
//   { type: 'operator', value: '*', pos: 8 },
//   { type: 'number', value: '3', pos: 10 }
// ]
```

### 8.7 XSS 防御过滤器

```javascript
/**
 * XSS 过滤器
 */
class XSSFilter {
  static escape(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  static sanitize(html) {
    // 移除 script 标签
    html = html.replace(/<script[\s\S]*?<\/script>/gi, '');
    // 移除事件处理属性
    html = html.replace(/\son\w+="[^"]*"/gi, '');
    html = html.replace(/\son\w+='[^']*'/gi, '');
    // 移除 javascript: 协议
    html = html.replace(/javascript:/gi, '');
    // 移除 data: 协议（可选，按需启用）
    // html = html.replace(/data:text\/html[^"']*/gi, '');
    return html;
  }
}

console.log(XSSFilter.escape('<script>alert("xss")</script>'));
// "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;"

console.log(XSSFilter.sanitize('<img src="x" onerror="alert(1)">'));
// "<img src="x" >"
```

### 8.8 配置文件解析

```javascript
/**
 * INI 配置文件解析
 */
class INIParser {
  parse(content) {
    const result = {};
    let currentSection = null;

    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();

      // 空行
      if (!trimmed || trimmed.startsWith(';') || trimmed.startsWith('#')) continue;

      // section
      const sectionMatch = trimmed.match(/^\[(.+)\]$/);
      if (sectionMatch) {
        currentSection = sectionMatch[1];
        result[currentSection] = {};
        continue;
      }

      // key=value
      const kvMatch = trimmed.match(/^([^=]+)=(.*)$/);
      if (kvMatch && currentSection) {
        const key = kvMatch[1].trim();
        const value = kvMatch[2].trim();
        result[currentSection][key] = this.parseValue(value);
      }
    }

    return result;
  }

  parseValue(value) {
    // 数字
    if (/^-?\d+$/.test(value)) return parseInt(value, 10);
    if (/^-?\d+\.\d+$/.test(value)) return parseFloat(value);
    // 布尔
    if (/^(true|false)$/i.test(value)) return value.toLowerCase() === 'true';
    // 字符串
    return value.replace(/^["']|["']$/g, '');
  }
}

const ini = `
[database]
host = localhost
port = 5432
debug = true
name = "myapp"
`;

const parser = new INIParser();
console.log(parser.parse(ini));
// { database: { host: 'localhost', port: 5432, debug: true, name: 'myapp' } }
```

---

## 9. 案例研究

### 9.1 案例一：完整表单验证库

```javascript
class FormValidator {
  constructor() {
    this.rules = new Map();
  }

  addRule(name, pattern, message) {
    this.rules.set(name, { pattern, message });
  }

  validate(data, schema) {
    const errors = {};
    for (const [field, rule] of Object.entries(schema)) {
      const value = data[field];
      if (!rule) continue;

      // 必填
      if (rule.required && (!value || value.trim() === '')) {
        errors[field] = `${field} is required`;
        continue;
      }

      // 模式
      if (rule.pattern) {
        const patternRule = this.rules.get(rule.pattern);
        if (patternRule && !patternRule.pattern.test(value)) {
          errors[field] = patternRule.message;
          continue;
        }
      }

      // 自定义
      if (rule.custom && !rule.custom(value)) {
        errors[field] = rule.message || `${field} is invalid`;
      }
    }
    return errors;
  }
}

const validator = new FormValidator();
validator.addRule('email', /^[a-z]+@[a-z]+\.[a-z]+$/i, 'Invalid email');
validator.addRule('phone', /^1[3-9]\d{9}$/, 'Invalid phone');
validator.addRule('url', /^https?:\/\/[^\s]+$/, 'Invalid URL');

const schema = {
  email: { required: true, pattern: 'email' },
  phone: { required: true, pattern: 'phone' },
  website: { pattern: 'url' },
  age: {
    custom: (v) => v >= 18 && v <= 120,
    message: 'Age must be 18-120',
  },
};

const errors = validator.validate(
  { email: 'invalid', phone: '123', website: 'not-url', age: 15 },
  schema
);
console.log(errors);
// { email: 'Invalid email', phone: 'Invalid phone', website: 'Invalid URL', age: 'Age must be 18-120' }
```

### 9.2 案例二：日志解析器

```javascript
/**
 * 解析 Apache/Nginx 日志
 * 格式: 127.0.0.1 - - [10/Oct/2026:13:55:36 +0800] "GET /api HTTP/1.1" 200 1234
 */
class LogParser {
  constructor() {
    // Apache Common Log Format
    this.clfPattern = /^(\S+) \S+ \S+ \[([^\]]+)\] "(\S+) (\S+) (\S+)" (\d+) (\S+)$/;

    // JSON 日志格式
    this.jsonPattern = /^\{.*\}$/;
  }

  parse(line) {
    if (this.jsonPattern.test(line)) {
      return JSON.parse(line);
    }

    const match = line.match(this.clfPattern);
    if (!match) return null;

    return {
      ip: match[1],
      timestamp: match[2],
      method: match[3],
      path: match[4],
      protocol: match[5],
      status: parseInt(match[6], 10),
      size: match[7] === '-' ? 0 : parseInt(match[7], 10),
    };
  }

  parseAll(content) {
    return content
      .split('\n')
      .map((line) => this.parse(line))
      .filter(Boolean);
  }

  // 统计
  summarize(entries) {
    const stats = {
      total: entries.length,
      byStatus: {},
      byPath: {},
      byIp: {},
    };

    for (const entry of entries) {
      stats.byStatus[entry.status] = (stats.byStatus[entry.status] || 0) + 1;
      stats.byPath[entry.path] = (stats.byPath[entry.path] || 0) + 1;
      stats.byIp[entry.ip] = (stats.byIp[entry.ip] || 0) + 1;
    }

    return stats;
  }
}

const parser = new LogParser();
const log = `127.0.0.1 - - [21/Jul/2026:10:00:00 +0800] "GET /api HTTP/1.1" 200 1234
192.168.1.1 - - [21/Jul/2026:10:00:01 +0800] "POST /users HTTP/1.1" 201 567`;

const entries = parser.parseAll(log);
console.log(parser.summarize(entries));
```

### 9.3 案例三：SQL 防注入

```javascript
/**
 * SQL 注入检测器
 */
class SQLInjectionDetector {
  constructor() {
    // 常见注入模式
    this.patterns = [
      /(\b(union)\b.*\b(select)\b)/i, // UNION SELECT
      /;\s*(drop|delete|insert|update)\s+/i, // 多语句
      /--\s*$/m, // SQL 注释
      /\/\*[\s\S]*?\*\//, // 块注释
      /\b(or|and)\b\s+\d+\s*=\s*\d+/i, // OR 1=1
      /\bexec(ute)?\s*\(/i, // EXEC()
      /xp_cmdshell/i, // SQL Server 扩展
      /\binto\s+(outfile|dumpfile)\b/i, // 文件操作
    ];
  }

  detect(input) {
    for (const pattern of this.patterns) {
      if (pattern.test(input)) {
        return { safe: false, pattern: pattern.source };
      }
    }
    return { safe: true };
  }

  sanitize(input) {
    return input
      .replace(/'/g, "''") // 转义单引号
      .replace(/;/g, '') // 移除分号
      .replace(/--/g, ''); // 移除注释
  }
}

const detector = new SQLInjectionDetector();
console.log(detector.detect("' OR 1=1 --")); // { safe: false, ... }
console.log(detector.detect('normal input')); // { safe: true }
```

### 9.4 案例四：代码高亮器

```javascript
/**
 * 简单 JavaScript 代码高亮
 */
class CodeHighlighter {
  constructor() {
    this.rules = [
      { type: 'comment', pattern: /\/\/[^\n]*|\/\*[\s\S]*?\*\//g },
      { type: 'string', pattern: /'[^']*'|"[^"]*"|`[^`]*`/g },
      { type: 'keyword', pattern: /\b(const|let|var|function|return|if|else|for|while|class|extends|new|this|super|import|export|from|default|async|await|try|catch|finally|throw)\b/g },
      { type: 'number', pattern: /\b\d+(\.\d+)?\b/g },
      { type: 'boolean', pattern: /\b(true|false|null|undefined)\b/g },
      { type: 'function', pattern: /\b([a-zA-Z_$][\w$]*)\s*(?=\()/g },
    ];
  }

  highlight(code) {
    let html = code;

    // 转义 HTML
    html = html
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // 应用规则（注意顺序）
    for (const rule of this.rules) {
      html = html.replace(rule.pattern, (match) => {
        return `<span class="${rule.type}">${match}</span>`;
      });
    }

    return html;
  }
}

const highlighter = new CodeHighlighter();
const code = `
function greet(name) {
  // 返回问候
  return \`Hello, \${name}!\`;
}
`;
console.log(highlighter.highlight(code));
```

---

## 10. 习题

### 10.1 基础题

**题目 1**：写出匹配以下内容的正则：

- 邮箱地址
- 中国大陆手机号
- 18 位身份证号
- URL（含 http/https）
- IPv4 地址
- 6 位邮政编码
- 中文字符

**题目 2**：解释贪婪与懒惰的差异，并各举一个使用场景。

**题目 3**：给定字符串 `"Hello, World! 123"`，写出能提取 `"Hello"`、`"World"`、`"123"` 的正则。

### 10.2 进阶题

**题目 4**：实现一个函数 `camelToKebab(str)`，将驼峰命名转为短横线命名（如 `myVariableName` → `my-variable-name`）。

**题目 5**：实现一个简易模板引擎，支持 `{{ var }}` 语法和 `{% if cond %}...{% endif %}` 条件。

**题目 6**：写一个正则，匹配合法的 JSON 字符串（仅字符串值，不含对象/数组）。

### 10.3 思考题

**题目 7**：为什么 `(a+)+b` 在输入 `aaaa...a!` 上会发生灾难性回溯？请从 NFA 角度分析。

**题目 8**：JavaScript 的正则引擎是 NFA 还是 DFA？这对开发者意味着什么？

### 10.4 设计题

**题目 9**：设计一个完整的路由匹配系统，支持：

- 静态路径：`/users`
- 参数路径：`/users/:id`
- 通配符：`/posts/*`
- 可选参数：`/posts/:year/:month?`
- 正则约束：`/users/:id(\\d+)`

**题目 10**：分析 [validator.js](https://github.com/validatorjs/validator.js) 的源码，回答：

- 它如何组织各种校验规则？
- 它的 `isEmail` 实现考虑了哪些边界情况？
- 为什么它使用大量正则而不是手写解析器？

### 10.5 参考答案

**题目 3 答案**：

```javascript
const str = 'Hello, World! 123';
const words = str.match(/[A-Za-z]+|\d+/g);
console.log(words); // ['Hello', 'World', '123']
```

**题目 4 答案**：

```javascript
function camelToKebab(str) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}
console.log(camelToKebab('myVariableName')); // "my-variable-name"
console.log(camelToKebab('HTMLElement')); // "html-element"
```

**题目 7 答案**：

`(a+)+` 的 NFA 中，外层 `+` 与内层 `+` 都允许任意次数重复。对于 $n$ 个 `a`，可分解为：

- 1 个内层组（$n$ 个 a）
- 2 个内层组（$k$ 个 a + $(n-k)$ 个 a，共 $n-1$ 种）
- 3 个内层组（$\binom{n-1}{2}$ 种）
- ...

总组合数为 $2^{n-1}$，每种都需 NFA 尝试匹配 `b` 失败后回溯，因此时间复杂度为 $O(2^n)$。

---

## 11. 参考文献（ACM 格式）

[1] S. C. Kleene, "Representation of events in nerve nets and finite automata," in *Automata Studies*, C. E. Shannon and J. McCarthy, Eds. Princeton, NJ: Princeton University Press, 1956, pp. 3-42.

[2] K. Thompson, "Regular expression search algorithm," *Communications of the ACM*, vol. 11, no. 6, pp. 419-422, 1968.

[3] J. E. Hopcroft, R. Motwani, and J. D. Ullman, *Introduction to Automata Theory, Languages, and Computation*, 3rd ed. Boston, MA: Addison-Wesley, 2006.

[4] M. E. Lesk, "Lex—A lexical analyzer generator," *Computing Science Technical Report* 39, Bell Laboratories, 1975.

[5] ECMA International, *ECMAScript 2023 Language Specification (ECMA-262, 14th edition)*, Standard ECMA-262, 2023.

[6] J. Friedl, *Mastering Regular Expressions*, 3rd ed. Sebastopol, CA: O'Reilly Media, 2006.

[7] R. Cox, "Regular expression matching can be simple and fast," 2007. [Online]. Available: https://swtch.com/~rsc/regexp/regexp1.html

[8] P. Hazel, "PCRE - Perl Compatible Regular Expressions," *Manual*, University of Cambridge, 1997.

[9] B. Spolsky, "The Law of Leaky Abstractions," *Joel on Software*, 2002. [Online]. Available: https://www.joelonsoftware.com/2002/11/11/the-law-of-leaky-abstractions/

[10] M. Davis and A. Scherer, "Unicode Technical Standard #18: Unicode Regular Expressions," *Unicode Consortium*, 2023.

[11] A. V. Aho, M. S. Lam, R. Sethi, and J. D. Ullman, *Compilers: Principles, Techniques, and Tools*, 2nd ed. Boston, MA: Addison-Wesley, 2006.

[12] N. Wirth, *Compiler Construction*, 2005. [Online]. Available: https://www.ethoberon.ethz.ch/WirthPubl/CompilerConstruction.pdf

---

## 12. 延伸阅读

- [MDN - Regular Expressions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions)
- [MDN - RegExp](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp)
- [ECMAScript 规范 - RegExp](https://tc39.es/ecma262/#sec-regexp-regular-expression-objects)
- [Regular-Expressions.info](https://www.regular-expressions.info/)
- [RegexOne - Interactive Tutorial](https://regexone.com/)
- [regex101 - Online Tester](https://regex101.com/)
- [RegExr - Learn, Build, & Test RegEx](https://regexr.com/)
- [Russ Cox - Implementing Regular Expressions](https://swtch.com/~rsc/regexp/)
- [RE2 - Google's fast regex engine](https://github.com/google/re2)
- [PCRE - Perl Compatible Regular Expressions](https://www.pcre.org/)
- [XRegExp - Extended JavaScript regex](https://xregexp.com/)
- [Unicode Regular Expressions (UTS#18)](https://unicode.org/reports/tr18/)

---

## 附录 A：完整语法速查表

### A.1 字符类

| 语法 | 含义 |
| --- | --- |
| `[abc]` | a 或 b 或 c |
| `[^abc]` | 非 a、b、c |
| `[a-z]` | 范围 a 到 z |
| `.` | 任意字符（除 \n，加 s 后包含 \n） |
| `\d` `\D` | 数字 / 非数字 |
| `\w` `\W` | 单词字符 / 非单词字符 |
| `\s` `\S` | 空白 / 非空白 |
| `\b` `\B` | 单词边界 / 非单词边界 |

### A.2 量词

| 语法 | 含义 |
| --- | --- |
| `*` | 0 或多次 |
| `+` | 1 或多次 |
| `?` | 0 或 1 次 |
| `{n}` | 精确 n 次 |
| `{n,}` | 至少 n 次 |
| `{n,m}` | n 到 m 次 |
| `*?` `+?` `??` | 非贪婪版本 |

### A.3 锚点

| 语法 | 含义 |
| --- | --- |
| `^` | 字符串开头（m 模式下行首） |
| `$` | 字符串结尾（m 模式下行尾） |
| `\b` | 单词边界 |
| `\B` | 非单词边界 |
| `(?=...)` | 正向前瞻 |
| `(?!...)` | 负向前瞻 |
| `(?<=...)` | 正向后瞻 |
| `(?<!...)` | 负向后瞻 |

### A.4 分组

| 语法 | 含义 |
| --- | --- |
| `(...)` | 捕获分组 |
| `(?:...)` | 非捕获分组 |
| `(?<name>...)` | 命名捕获组（ES2018） |
| `(?P<name>...)` | 命名捕获组（PCRE） |
| `\1` `\2` ... | 反向引用 |
| `\k<name>` | 命名反向引用 |

### A.5 修饰符

| 修饰符 | 含义 |
| --- | --- |
| `g` | 全局匹配 |
| `i` | 忽略大小写 |
| `m` | 多行模式 |
| `s` | dotAll（. 匹配换行） |
| `u` | Unicode 模式 |
| `y` | 粘性模式 |
| `d` | 返回 indices |

### A.6 转义

| 语法 | 含义 |
| --- | --- |
| `\n` `\r` `\t` | 换行、回车、制表 |
| `\\` | 反斜杠 |
| `\.` `\*` `\+` `\?` | 转义元字符 |
| `\(` `\)` `\[` `\]` | 转义括号 |
| `\{` `\}` `\|` `\^` `\$` | 转义其他元字符 |
| `\uXXXX` | Unicode 字符（4 位） |
| `\u{XXXXX}` | Unicode 字符（任意位，需 u 修饰符） |
| `\xHH` | 十六进制字符 |
| `\p{...}` | Unicode 属性转义（需 u） |

---

## 附录 B：常见模式速查

### B.1 验证类

| 用途 | 正则 |
| --- | --- |
| 邮箱 | `/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/` |
| 中国手机号 | `/^1[3-9]\d{9}$/` |
| 18 位身份证 | `/^\d{17}[\dXx]$/` |
| URL | `/^https?:\/\/[^\s]+$/` |
| IPv4 | `/^((25[0-5]\|2[0-4]\d\|[01]?\d\d?)\.){3}(25[0-5]\|2[0-4]\d\|[01]?\d\d?)$/` |
| IPv6 | `/^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/` |
| 6 位邮编 | `/^\d{6}$/` |
| 中文 | `/^[\u4e00-\u9fa5]+$/` |
| UUID | `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i` |
| 颜色 | `/^#([0-9a-fA-F]{3}\|[0-9a-fA-F]{6})$/` |
| 日期 YYYY-MM-DD | `/^\d{4}-\d{2}-\d{2}$/` |
| 时间 HH:MM:SS | `/^([01]\d\|2[0-3]):[0-5]\d:[0-5]\d$/` |

### B.2 提取类

| 用途 | 正则 |
| --- | --- |
| URL | `/https?:\/\/[^\s]+/g` |
| 邮箱 | `/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g` |
| 数字 | `/\d+(\.\d+)?/g` |
| HTML 标签 | `/<(\w+)[^>]*>(.*?)<\/\1>/gs` |
| 单词 | `/\b\w+\b/g` |

### B.3 替换类

| 用途 | 正则 |
| --- | --- |
| 千分位 | `/\B(?=(\d{3})+(?!\d))/g` |
| 驼峰转下划线 | `/([A-Z])/g` |
| 下划线转驼峰 | `/_([a-z])/g` |
| 去除空格 | `/^\s+\|\s+$/g` |
| 去除 HTML | `/<[^>]+>/g` |

---

## 附录 C：性能优化清单

### C.1 编译优化

- [ ] 预编译正则：避免在循环中创建
- [ ] 使用字面量而非构造函数（除非动态生成）
- [ ] 复用 RegExp 对象（注意 lastIndex 副作用）

### C.2 匹配优化

- [ ] 使用具体字符类而非 `.*`
- [ ] 使用非贪婪 `*?` 避免过度匹配
- [ ] 使用锚点 `^` `$` 限制范围
- [ ] 使用非捕获组 `(?:)` 减少开销

### C.3 避免 ReDoS

- [ ] 避免嵌套量词 `(a+)+`
- [ ] 避免重叠分支 `(a|a)*`
- [ ] 限制输入长度
- [ ] 使用超时机制

### C.4 Unicode 优化

- [ ] 使用 `u` 修饰符正确处理 emoji
- [ ] 使用 `\p{}` 而非手写范围
- [ ] 使用 `[...str]` 计算码点长度

---

## 附录 D：常用调试工具

### D.1 在线工具

| 工具 | 网址 | 特点 |
| --- | --- | --- |
| regex101 | https://regex101.com | 详细解释、调试、社区 |
| RegExr | https://regexr.com | 实时高亮、速查表 |
| Regex Crossword | https://regexcrossword.com | 游戏化学习 |
| Debuggex | https://www.debuggex.com | 可视化 NFA |

### D.2 命令行工具

```bash
# grep
echo "hello world" | grep -oE '\w+'

# sed
echo "hello" | sed 's/h/H/'

# awk
echo "a,b,c" | awk -F',' '{print $2}'

# perl
echo "hello 123" | perl -pe 's/\d+/NUM/'
```

### D.3 JavaScript 调试技巧

```javascript
// 详细匹配信息
function debug(pattern, str) {
  const re = new RegExp(pattern.source, pattern.flags + (pattern.flags.includes('d') ? '' : 'd'));
  const matches = [...str.matchAll(re)];
  console.table(
    matches.map(m => ({
      match: m[0],
      index: m.index,
      groups: JSON.stringify(m.groups),
      indices: JSON.stringify(m.indices),
    }))
  );
}

debug(/(?<word>\w+)@(?<domain>\w+\.\w+)/gd, 'user@example.com admin@test.org');
```

---

## 附录 E：术语表

| 术语 | 英文 | 含义 |
| --- | --- | --- |
| 正则表达式 | regular expression | 描述字符串模式的形式语言 |
| 有限自动机 | finite automaton | 识别正则语言的抽象机器 |
| NFA | Nondeterministic Finite Automaton | 非确定有限自动机 |
| DFA | Deterministic Finite Automaton | 确定有限自动机 |
| 回溯 | backtracking | NFA 失败后尝试其他路径 |
| 灾难性回溯 | catastrophic backtracking | 指数级回溯导致性能崩溃 |
| 量词 | quantifier | 指定重复次数 |
| 贪婪 | greedy | 优先匹配最多 |
| 非贪婪 | non-greedy / lazy | 优先匹配最少 |
| 占有 | possessive | 不回溯 |
| 锚点 | anchor | 匹配位置而非字符 |
| 边界 | boundary | 单词/字符串边界 |
| 分组 | group | 用括号捕获子匹配 |
| 捕获组 | capturing group | 保存子匹配的分组 |
| 反向引用 | backreference | 引用之前的捕获 |
| 前瞻 | lookahead | 零宽向前断言 |
| 后瞻 | lookbehind | 零宽向后断言 |
| 修饰符 | flag | 改变匹配模式 |
| 码元 | code unit | UTF-16 编码单元 |
| 码点 | code point | Unicode 字符编号 |
| 代理对 | surrogate pair | BMP 外字符的 UTF-16 编码 |

---

## 附录 F：版本兼容性表

| 特性 | ES3 | ES5 | ES6 | ES2018 | ES2020 | ES2022 |
| --- | --- | --- | --- | --- | --- | --- |
| 基础正则 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `u` 修饰符 | - | - | ✓ | ✓ | ✓ | ✓ |
| `y` 修饰符 | - | - | ✓ | ✓ | ✓ | ✓ |
| `flags` 属性 | - | - | ✓ | ✓ | ✓ | ✓ |
| 命名捕获组 | - | - | - | ✓ | ✓ | ✓ |
| 后瞻 | - | - | - | ✓ | ✓ | ✓ |
| Unicode 属性 | - | - | - | ✓ | ✓ | ✓ |
| `s` 修饰符 | - | - | - | ✓ | ✓ | ✓ |
| `matchAll` | - | - | - | - | ✓ | ✓ |
| `d` 修饰符 | - | - | - | - | - | ✓ |
| `v` 修饰符 | - | - | - | - | - | -（ES2024） |

---

## 附录 G：常见错误

### G.1 SyntaxError

```javascript
// 未闭合的字符类
/[/; // SyntaxError: Invalid regular expression

// 未转义的元字符
/a+/; // OK
/a+/; // OK
/a(+)/; // SyntaxError: 重复量词

// 无效的 Unicode 转义
/\u/; // SyntaxError: Invalid unicode escape

// 无效的反向引用
/(a)\2/; // SyntaxError: Invalid regular expression
```

### G.2 TypeError

```javascript
// 重复的修饰符
new RegExp('a', 'gg'); // TypeError: Cannot supply flags when constructing one RegExp from another

// 无效的修饰符
/a/x; // SyntaxError: Invalid regular expression flags

// 字符串调用非正则
'test'.match({}); // TypeError: String.prototype.match requires a regexp or string
```

---

## 附录 H：测试用例模板

```javascript
// 单元测试模板
function testRegex(name, regex, cases) {
  console.log(`Testing ${name}:`);
  for (const [input, expected] of cases) {
    const actual = regex.test(input);
    const status = actual === expected ? 'PASS' : 'FAIL';
    console.log(`  ${status}: "${input}" -> ${actual}`);
  }
}

testRegex('email', /^[a-z]+@[a-z]+\.[a-z]+$/i, [
  ['user@example.com', true],
  ['invalid', false],
  ['user@.com', false],
  ['', false],
]);

testRegex('phone', /^1[3-9]\d{9}$/, [
  ['13812345678', true],
  ['12345678901', false], // 以 12 开头
  ['1381234567', false],  // 少 1 位
  ['', false],
]);
```

---

## 更新日志

- 2026-06-13：初版，包含基础语法与实用模式
- 2026-07-21：金标准升级，新增 12 项完整结构，扩展至 1500+ 行，对标海外名校教学水准
