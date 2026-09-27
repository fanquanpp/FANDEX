---
order: 30
title: 程序结构基本语法：写出第一个多行程序
module: 'javascript'
category: 前端技术
difficulty: beginner
description: 以「在浏览器控制台把单行命令攒成多行程序」为主线，讲透语句与分号、代码块与缩进、注释、console.log 调试习惯，用播放列表打印程序贯穿全篇，附 SyntaxError 调试实录与四类练习。
author: fanquanpp
updated: '2026-09-27'
related:
  - 'javascript/020-JavaScriptOverviewRuntimeEnv'
  - 'javascript/040-VariableDataType'
  - 'javascript/060-ControlFlow'
prerequisites:
  - 'javascript/020-JavaScriptOverviewRuntimeEnv'
---

## 前置知识

- 已完成 [JavaScript 概述与运行环境](/javascript/020-JavaScriptOverviewRuntimeEnv)：会在浏览器控制台运行 `console.log`，知道代码跑在浏览器与 Node 两类环境里。

没读过也不用慌：只要你会按 `F12` 打开控制台、能敲一行 `console.log('hi')` 并看到输出，本文就能跟。所有示例都可以直接在浏览器控制台运行。

## 学习目标

读完本文你将能够：

1. 说出「语句」和「表达式」的差别，解释分号与自动分号插入（ASI）的关系；
2. 用大括号代码块组织多行代码，预测块内声明的变量在块外是否可见；
3. 按用途选择单行注释、多行注释与文档注释，坚持「注释解释为什么」；
4. 养成两条 console.log 调试习惯：给输出贴标签、用进出场日志缩小问题范围；
5. 读懂并修复 `Uncaught SyntaxError: Unexpected end of input` 与 `Invalid or unexpected token`。

预计 40 到 55 分钟，包含 3 个修改实验与 4 道练习。

## 1. 你现在要解决什么问题

上一篇你一直在控制台里单行单行地敲代码。单行够用，直到你想写一个稍微像样的东西——比如给音乐播放器写一个「打印播放列表」的小程序：

```javascript
console.log('===== 我的播放列表 =====');
console.log('1. 起风了');
console.log('2. 晴天');
console.log('3. 平凡之路');
console.log('========================');
```

5 行，不算复杂，但麻烦马上来了：

- 把多行一起粘进控制台，回车——是只执行最后一行，还是全部执行？
- 想暂时不打印中间几行，怎么「关掉」它们而不删掉？
- 三个月后回看这段代码，分隔线下面那几行是干嘛的，你还记得吗？

这三个问题分别指向：多行代码怎么执行、注释怎么用、代码怎么组织。再加上最后一块拼图——多行程序跑起来后怎么观察它，就是本文的全部内容。

## 2. 先不要看解释，先试试看

把第 1 节的 5 行代码整体复制粘贴进浏览器控制台，回车。控制台把它当作一整段执行，5 行输出全部出现。如果你习惯逐行敲，记住关键操作：用 `Shift + Enter` 换行——单独回车会立刻执行当前行，半截程序就跑飞了。

再做一次预测：把第 3 行改成 `console.log('2. 晴天 ')`（结尾多个空格），输出和原来一样吗？跑一下，确认「改一行、影响一行」的直觉，带着这个手感往下走。

## 3. 最小可运行示例

第 1 节那 5 行就是本文的第一个完整程序，预期输出：

```text
===== 我的播放列表 =====
1. 起风了
2. 晴天
3. 平凡之路
========================
```

每一行是一条独立的指令，引擎从上到下逐条执行——这个「从上到下」就是程序结构的地基。接下来把地基里的四块砖逐块讲清：语句与分号、代码块与缩进、注释、console.log 调试习惯。

## 4. 语句、分号与自动分号插入

先分清两个词：

- **表达式**：产生一个值的式子，如 `'晴天'.length` 的值是 2；
- **语句**：一条完整指令，如 `console.log('晴天')`。语句由表达式组成，程序由语句组成。

语句通常以分号结尾。有意思的是，JS 引擎可以在换行处自动补分号（这套机制叫 ASI，Automatic Semicolon Insertion），所以很多教程的代码不写分号也能跑。但「能跑」和「永远按你想的跑」是两回事——第 11 节有一道著名的 ASI 事故题，先埋个伏笔。建议只有一条：全篇统一，要么都写分号，要么都不写并交给格式化工具（Prettier）把关。

```javascript
const song = '晴天';        // 声明语句（const 是下一篇的主角，先混个眼熟）
console.log(song.length);   // 表达式 song.length 的值是 2
3 + 4;                      // 合法但没意义：值产生了，没人接
```

预期输出：

```text
2
```

## 5. 代码块与缩进

大括号 `{}` 把一组语句圈成一块。块内用 `let` 声明的东西，出块就够不着了：

```javascript
{
  let song = '晴天';
  console.log(song);
}
console.log(song);
```

预期输出（第二处访问直接报错，引擎就此停住）：

```text
晴天
Uncaught ReferenceError: song is not defined
```

`let` 的完整规则下一篇讲透，这里只需要记住一句：**大括号圈出的地盘里声明的东西，出圈就失效**。将来 if、for、函数的花括号都遵守这条规则，这是变量「不串味」的根源。

缩进则是写给——不是引擎。JS 完全不在乎缩进，缩进是给人的路标：一眼看出哪些行属于哪一块。看一个带函数的例子：

```javascript
function playNext() {       // 「函数」是什么，080 讲透，先混个眼熟
  console.log('切到下一首');
  console.log('进度归零');
}
playNext();
```

预期输出：

```text
切到下一首
进度归零
```

函数体两行缩进 2 空格，嵌套一层就多缩一层。社区主流是 2 或 4 空格，选一种保持全库一致（并避开 tab 与空格混用）；具体交给格式化工具强制执行，人只负责别手写歪。

## 6. 注释

三种写法，三种用途：

```javascript
// 单行注释：解释紧邻代码的意图，最常用

/*
 * 多行注释：说明一整段逻辑，或临时禁用一段代码（「注释掉」）
 * 注意多行注释不能嵌套
 */

/**
 * 文档注释：写给工具看，编辑器会把它变成函数的悬浮提示
 * JSDoc 语法在函数详解（080）与工程化篇章展开
 */
function addScore(base, bonus) {
  return base + bonus;
}
```

注释的第一原则：**解释为什么，不复述是什么**。`// 打印歌名` 挂在 `console.log(song)` 上面是废话；`// 榜单只展示前 5 首，第 6 首起折叠` 才是三个月后的你会感谢的信息。

「注释掉」还有个调试妙用：怀疑某行惹祸时，先把它注释掉运行一次，行为变了就锁定了嫌疑人。这是二分排查的雏形。

## 7. console.log 调试习惯

多行程序一长，光靠脑子追输出就不够了。两条从今天开始养成的习惯：

习惯一：给输出贴标签。`console.log` 支持多个参数，自动以空格分隔：

```javascript
let nowPlaying = '晴天';                  // let 与 const：下一篇正式讲，先照着用
console.log('nowPlaying =', nowPlaying);  // 有标签的日志，回头翻不用猜
```

预期输出：

```text
nowPlaying = 晴天
```

习惯二：进出场日志。在关键段落的入口和出口各打一行：

```javascript
console.log('--- 开始播放 ---');
console.log(nowPlaying);
console.log('--- 播放结束 ---');
```

预期输出：

```text
--- 开始播放 ---
晴天
--- 播放结束 ---
```

将来你会在函数里大量使用这招：看到「开始」没看到「结束」，问题就锁在两者之间。另外记住三个兄弟的分工——`console.log` 常规信息、`console.warn` 黄色警告、`console.error` 红色错误，控制台里可以按级别过滤；还有个 `console.table` 能把列表打成表格，到 [对象与数组](/javascript/070-ObjectArray) 篇会大量用到。

## 8. 修改实验

以下实验都在浏览器控制台完成，每个都先预测再运行。

实验一：给播放列表加两首歌（第 4、5 行），结尾分隔线改成 `===== 播放结束 =====`。先在纸上写出完整预期输出，再运行逐行对比。

实验二：把 `console.log('2. 晴天');` 整行用多行注释包住再运行。确认程序正常执行、输出少了一行——「注释掉」这个动作你已经会用了。

实验三：故意制造一次报错：在控制台输入 `console.log('未闭合`（少了右引号）并回车，观察报错；再补全引号重跑。亲手造一次错，比读十次报错更能消除恐惧。

## 9. 常见错误与调试实录

错误一：少写右大括号。把函数例子改成：

```javascript
function playNext() {
  console.log('切到下一首');
```

运行报错（真实文本，浏览器控制台）：

```text
Uncaught SyntaxError: Unexpected end of input
```

读报错三步：一看类型，`SyntaxError` 意味着语法不合法，引擎根本没开始执行；二读内容，「Unexpected end of input」直译是「读到了结尾还有没闭合的东西」；三定位，从最后一行往前数大括号（现代编辑器会把配对的括号高亮），补上右括号即可。Node 环境下同一错误的措辞是 `SyntaxError: Unexpected end of input`，含义相同。

错误二：引号没闭合，也就是实验三你亲手造的那个：

```text
Uncaught SyntaxError: Invalid or unexpected token
```

`SyntaxError` 有个重要特点：**程序一行都不会跑**。这与下一篇会遇到的 `ReferenceError`（程序跑了一半才炸）是两类故障，处理姿势不同——前者查书写，后者查逻辑。控制台报错旁会标注来源行号（形如 `VM123:2`），点它可以直接跳到出错的位置。

## 10. 实际项目中的使用场景

- 真实项目里 JS 放在 `.js` 文件或网页的 `<script>` 标签中，浏览器加载页面时执行；控制台是做实验的操场，不是代码的家。把 JS 接上网页是 [DOM 操作与事件](/javascript/410-DOMOperationEvent) 的主题；
- 分号、缩进、注释密度这些风格问题，团队交给 Prettier、ESLint 强制统一——工具的存在让「怎么写」的争论消失；
- 读优秀开源项目的源码注释是最好的范文训练：留意它们注释什么（坑位、约束、原因），不注释什么。

## 11. 小练习

预测题一（5 分钟）：不运行，先写出下面代码的完整输出（包括可能的报错）：

```javascript
{
  let song = '晴天';
  console.log(song);
}
console.log(song);
```

（先写答案再往下看。答案：先输出 `晴天`；随后抛 `Uncaught ReferenceError: song is not defined`——`song` 只活在大括号圈出的块里，第 5 节讲过。）

预测题二（5 分钟）：还是先写答案再验证：

```javascript
function addScore(base, bonus) {   // 函数结构：080 讲透，先看外形
  return
    base + bonus;
}
console.log(addScore(10, 5));
```

（答案：输出 `undefined`，而不是 15。`return` 换行后，ASI 在行尾自动补了分号，函数什么都没返回就结束了。这是 ASI 最著名的事故现场——也是「要么都写分号」最硬的理由。）

修改题（10 分钟）：把播放列表程序改造成「游戏邮件收件箱」：三封邮件（标题自取）、首尾各一条分隔线，分隔线之间至少一条单行注释说明某封邮件的用途。写代码前先手写预期输出，运行后逐字对比。

修 Bug 题（10 分钟）：下面的程序运行报错。按「读报错三步」定位并修复：

```javascript
console.log('===== 结算面板 =====');
console.log('胜利奖励：+120 金币);
console.log('===== 结束 =====');
```

报错（真实文本）：`Uncaught SyntaxError: Invalid or unexpected token`

（提示：对比第二行与第三行的引号数量，少了一个闭合引号。答案：在 `金币` 后补上 `'`，程序即可完整输出三行。）

挑战题（15 分钟）：脱离示例写一个「本周打卡记录」程序：输出第 1 到第 5 天的打卡记录（状态自定）加首尾分隔线。验收清单：开头有一段多行注释说明程序用途；至少一处单行注释解释「为什么」而非「是什么」；实际输出与你预先写下的预期逐字一致。

## 12. 与之前和之后的知识的关系

- 往前：[JavaScript 概述与运行环境](/javascript/020-JavaScriptOverviewRuntimeEnv) 解决「代码跑在哪」，本文开始解决「代码怎么写」——本文全部语法属于 ECMAScript 语言核心，浏览器与 Node 完全通用；
- 往后：下一篇 [变量与数据类型](/javascript/040-VariableDataType) 会把你今天照抄的 `const`、`let` 彻底讲透，播放列表里写死的歌名也将拥有名字；[控制流](/javascript/060-ControlFlow) 的 for 循环会把重复的 `console.log` 行收编成循环体；[函数、作用域与闭包](/javascript/080-FunctionScopeClosure) 把 `playNext` 的内部机制讲透。

## 13. 官方文档

- 语法与类型（语句、注释、声明的权威讲解）：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Grammar_and_types
- 词法文法（分号与 ASI 的规则原文）：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Lexical_grammar
- console API 全家福：https://developer.mozilla.org/zh-CN/docs/Web/API/console

## 14. 自我检查

- 能说出语句与表达式的差别，并解释为什么 `3 + 4;` 合法但没意义；
- 能预测块内 `let` 变量在块外的行为，说得出「缩进是写给谁看的」；
- 注释遵循「解释为什么」原则，会用「注释掉」做二分排查；
- 拿到 `SyntaxError` 能说出它与「跑到一半才炸」的报错的本质区别：前者程序一行都没跑；
- 控制台里多行输入时知道用 `Shift + Enter`。

## 本章总结

程序由语句组成，从上到下逐条执行；分号标记语句边界，风格二选一并交给工具；大括号圈出代码块，块内 `let` 声明出块失效，缩进是给人看的路标；注释解释为什么，console.log 贴标签、打进出场日志；`SyntaxError` 意味着语法不合法、程序一行未跑。这五件事撑起了你写下的每一个多行程序，下一篇开始给数据起名字。

## 下一步

进入 [变量与数据类型](/javascript/040-VariableDataType)：本文里你照抄了 `const` 和 `let`，现在轮到把它们讲透。
