---
order: 40
title: 变量与数据类型：给数据起名字
module: 'javascript'
category: 前端技术
difficulty: beginner
description: 用「给数据起名字」讲透 let/const/var 取舍与 var 事故现场，盘点七种原始类型、typeof 的历史 bug、模板字符串与 == 的坑，附 ReferenceError/TypeError 调试实录。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'javascript/030-ProgramStructureBasicSyntax'
  - 'javascript/050-DataTypeOperator'
  - 'javascript/070-ObjectArray'
  - 'javascript/220-ES6NewFeatures'
prerequisites:
  - 'javascript/030-ProgramStructureBasicSyntax'
---

## 前置知识

- 已完成 [程序结构基本语法](/javascript/030-ProgramStructureBasicSyntax)：会写多行程序、知道代码块与注释，并照抄过几次 `const` 和 `let`。那两次「照抄」就是伏笔；没读过也能跟，语法都会当场解释，但建议先补。

## 学习目标

读完本文你将能够：

1. 用 `let` 与 `const` 声明变量，说出「默认 const、会重新赋值才 let」的选择规则；
2. 预测 `var` 在提升与函数作用域场景下的行为，读旧代码不慌；
3. 报出七种原始类型，用 `typeof` 检查值的类型，并解释 `typeof null` 的历史 bug；
4. 用模板字符串拼带变量的句子，替代 `+` 拼接；
5. 解释 `==` 与 `===` 的差别，独立修复 `Cannot access 'x' before initialization` 与 `Assignment to constant variable`。

预计 45 到 60 分钟，包含 3 个修改实验与 4 道练习。

## 1. 你现在要解决什么问题

上一篇的播放列表程序是这样的：

```javascript
console.log('===== 我的播放列表 =====');
console.log('正在播放：起风了');
console.log('下一首：晴天');
console.log('共 3 首歌曲');
```

现在提三个需求：歌名能换、列表支持任意长度、文案改成「精选歌单」。打开代码你会发现：`'起风了'` 写死了，换歌要找到那一行；「共 3 首歌曲」的 3 是裸数字，加歌后忘了改，程序就撒谎；文案散落各处，没有一样东西叫「歌单标题」。

缺的是同一件东西：**给数据起名字**。起名字之后，值能复用、含义自解释、改一处全局生效——这就是变量。

## 2. 先不要看解释，先试试看

在浏览器控制台逐行输入，每行先预测再回车：

```javascript
const singer = '买辣椒也用券';
singer = '周杰伦';
```

第二行的实际结果是 `Uncaught TypeError: Assignment to constant variable.`——`const` 的名字不许换值；换成 `let` 就正常。带着「何时用 const、何时用 let」往下读。

## 3. 最小可运行示例

给播放列表的数据起上名字：

```javascript
const playlistTitle = '我的播放列表';   // 不会变的：用 const
let nowPlaying = '起风了';              // 会变的：用 let
const songCount = 3;

console.log('===== ' + playlistTitle + ' =====');
console.log('正在播放：' + nowPlaying);

nowPlaying = '晴天';                    // 换歌了：重新赋值
console.log('正在播放：' + nowPlaying);
console.log('共 ' + songCount + ' 首歌曲');
```

预期输出：

```text
===== 我的播放列表 =====
正在播放：起风了
正在播放：晴天
共 3 首歌曲
```

三个名字各司其职：不再换值的用 const，会重新赋值的用 let。那串 `+` 看着啰嗦——记住这个不满，第 6 节的模板字符串就是来消灭它的。

## 4. 核心概念：let、const 与 var 三兄弟

取舍标准一句话：**默认 const，会重新赋值才 let，var 只为读懂旧代码存在。**

`let` 与 `const` 都遵守上一篇的块级作用域（大括号里声明，出圈失效），都禁止重复声明，差别只有一条：`let` 允许重新赋值，`const` 不允许——所以第 2 节的赋值在 const 下爆炸、在 let 下正常。`const` 还有个反直觉的真面目：它锁的是「名字不能再指别处」，不是「内容不可变」——`const player` 仍可改 `player.name`，给 player 整个换对象才报 `Assignment to constant variable`（对象细节 070 篇展开）。

### var 的事故现场

`var` 是 2015 年前的唯一选择，三个特性制造过无数事故。你得认识它怎么坑人。

事故一：块内声明泄漏到块外。`var` 无视花括号，变量属于整个函数：

```javascript
function checkBattle(active) {      // 函数的写法先混个眼熟，080 讲透
  if (active) {
    var message = '战斗开始';
  }
  console.log(message);             // active 为 false 时，你猜打印什么？
}
checkBattle(false);
```

预期输出：

```text
undefined
```

不报错，静默给个 undefined。同一函数把 var 换成 let，false 这一路直接抛 `Uncaught ReferenceError: message is not defined`——错得更早、更响，而这正是我们要的：错误在离根因最近的地方爆炸，而不是三行后莫名其妙。

事故二：提升（hoisting）。声明被引擎悄悄挪到作用域开头，赋值留在原地：

```javascript
console.log(playerName);            // undefined，而不是报错
var playerName = '小明';
```

你「用了还没赋值的变量」，引擎不拦，还发个 undefined 让程序继续跑。let/const 在声明前访问则直接报错（第 9 节实录），把问题按死在第一现场。

事故三：重复声明静默通过。`var total = 200; var total = 0;` 合法，谁覆盖了谁没人知道；换成 let 立刻 `Uncaught SyntaxError: Identifier 'total' has already been declared`。

**一行规则：新代码用 let/const；var 只用来读懂 2015 年前的旧代码。**

## 5. 数据类型盘点：七种原始类型加对象

名字起好了，名字上挂的值也分种类。JS 的值分两大类：七种原始类型（primitive）与对象（object，包括数组、函数，070 起展开）。用 `typeof` 逐个点名：

```javascript
console.log(typeof 42);             // "number"
console.log(typeof '起风了');        // "string"
console.log(typeof true);           // "boolean"
console.log(typeof undefined);      // "undefined"
console.log(typeof null);           // "object" —— 注意，这是历史 bug
console.log(typeof Symbol('id'));   // "symbol"
console.log(typeof 10n);            // "bigint"
```

- **number**：整数小数同一个类型（`42` 与 `3.14` 都是 number），有精度坑 `0.1 + 0.2 !== 0.3`，下一篇展开；
- **string**：三种引号包起来的文本，反引号是下一节的模板字符串；**boolean**：只有 `true` 与 `false`，比较运算的产物；
- **undefined**：系统说「还没赋值」，声明了 `let hp;` 就去读，得到 undefined；**null**：你说「故意空着」。分工：undefined 是引擎的默认，null 是程序员的表态；
- **symbol** 与 **bigint**：唯一标识符、超大整数（数字后加 n），入门期极少用，见到认识即可。

然后是那个著名的坑：`typeof null` 返回 `"object"` 而不是 `"null"`。1995 年 JS 第一版十天赶工，null 的底层类型标签与对象撞号；发现时浏览器已装遍世界，修复会破坏无数网站，bug 被永久冻结。结论：**判断 null 用 `value === null`，别用 typeof。** 另外 `typeof []` 也是 `"object"`，区分工具在 070 篇。

## 6. 模板字符串：消灭 + 号拼接

第 3 节那串 `'共 ' + songCount + ' 首歌曲'` 能用，但引号和加号交错，读着费劲。反引号（`` ` ``）包起来的模板字符串专门解决这个问题：

```javascript
const song = '起风了';
let likes = 120000;

console.log(`正在播放：${song}`);      // 正在播放：起风了
console.log(`点赞数：${likes}`);       // 点赞数：120000
likes = likes + 1;
console.log(`点赞数：${likes}`);      // 点赞数：120001 —— ${} 里可以先运算
```

`${}` 里先求值再嵌入，放变量、放表达式都行。模板字符串还能直接跨行——不用 `\n`，拼多行卡片、HTML 片段体验极佳。规则朴素：**需要嵌入变量的拼接，一律用模板字符串**。

## 7. 类型转换坑：== 与 ===

一道真实面试题：「`1 == '1'`、`1 === '1'`、`0 == ''` 分别输出什么？为什么几乎所有团队规范都禁用 ==？」

```javascript
console.log(1 == '1');    // true  —— == 把 '1' 转成数字再比
console.log(1 === '1');   // false —— === 类型不同，直接判否
console.log(0 == '');     // true  —— '' 被转成 0
console.log(0 === '');    // false
console.log(null == undefined);   // true —— 规范特批的一对
```

`==`（宽松相等）比较前先做隐式类型转换，规则繁琐到能单独写一章，产出是一堆「看似相等」的值：`0 == ''`、`'' == false`、`'0' == false` 全是 true。`===`（严格相等）先比类型再比值，行为可以全部预测——规范禁用 == 的理由就在这：**不让代码的正确性依赖一张背不下来的转换表**。结论：业务代码一律 `===` / `!==`；== 唯一还值得写的场景是 `x == null`（同时判掉 null 和 undefined）。类型转换的更多坑（字符串参与算术、NaN）下一篇集中处理。

## 8. 修改实验

实验一：把第 3 节程序里所有 `+` 拼接改成模板字符串，输出必须与原文逐字一致。

实验二：在第 3 节末尾加 `nowPlaying = '平凡之路';` 并再打印一次，预测输出；然后把 `let nowPlaying` 改成 `const` 再跑，读出报错原文。

实验三：把第 4 节事故一的 `var message` 换成 `let message`，分别用 `checkBattle(true)` 和 `checkBattle(false)` 调用，预测两次结果（一次正常打印、一次报错）再验证。

## 9. 常见错误与调试实录

错误一：声明前就使用。运行：

```javascript
console.log(total);      // 我想先看看它现在是多少
let total = 0;
```

报错（真实文本，浏览器控制台）：

```text
Uncaught ReferenceError: Cannot access 'total' before initialization
```

读报错三步：一看类型，`ReferenceError` 是「名字够不着」类问题；二读原因，「before initialization」说明 total 存在但还没轮到初始化——这是 let/const 的「暂时性死区」，声明前的区域不许碰；三定位，把声明挪到使用前面即可。对照第 4 节：同样的错用 var 写只会得到静默 undefined——let 用报错换来早炸，这是进步。

错误二：给 const 重新赋值。

```javascript
const maxLevel = 60;
maxLevel = 99;
```

报错（真实文本）：

```text
Uncaught TypeError: Assignment to constant variable.
```

读报错三步：文案指名道姓；定位到对 const 赋值的那行；三问语义——这个值在业务上真的会变吗？会就改成 let。别无脑把 const 全改 let：只有「真的会重新赋值」的名字才配 let。

## 10. 实际项目中的使用场景

- 配置常量集中在文件顶部：`const API_BASE_URL = 'https://api.example.com';`、`const MAX_RETRY = 3;`。全大写命名是给读代码的人的信号：这值不该被改；
- 运行中变化的状态用 let：`let hp = 100;`、`let currentPage = 1;`，页面动态行为建立在这些「会变的值」上；渲染文本用模板字符串：聊天消息、商品卡片、通知模板，本质都是「固定骨架 + ${} 插槽」；
- 读旧代码看到 var，脑内翻译成 let，同时想起三事故：块泄漏、提升、重复声明。

## 11. 小练习

预测题（5 分钟）：不运行，写出下面代码的完整输出：

```javascript
console.log(playerLevel);
var playerLevel = 10;
console.log(playerLevel);
```

（先写答案再往下看。答案：`undefined` 和 `10`。var 只提升声明不提升赋值，第一行打印的是「已声明、未赋值」。）

修改题（10 分钟）：把第 3 节程序改成模板字符串版本，再追加 `let nextSong = '平凡之路';` 与一行 `下一首：${nextSong}` 输出。全篇不允许出现 `+` 拼接。

修 Bug 题（10 分钟）：下面的程序想扣血，运行报错。按「读报错三步」定位并修复：

```javascript
const hp = 100;
hp = hp - 30;
console.log(`当前血量：${hp}`);
```

报错（真实文本）：`Uncaught TypeError: Assignment to constant variable.`

（提示：hp 在业务上会变。答案：`const hp` 改为 `let hp`，输出 `当前血量：70`。）

挑战题（15 分钟）：写一个「玩家名片」程序：用 const 声明昵称与金币数、用 let 声明等级，输出三行名片（昵称 / 等级 / 金币）。验收清单：不变的名字全部 const、会变的全部 let；全篇零 `+` 拼接；把等级从 10 改成 99 时只改一处声明。

## 12. 与之前和之后的知识的关系

- 往前：[程序结构基本语法](/javascript/030-ProgramStructureBasicSyntax) 里你照抄了 `const`/`let`，本文兑现承诺把它们讲透；
- 往后：[数据类型与运算符](/javascript/050-DataTypeOperator) 盘点运算符家族——`typeof` 就是其中一员；[对象与数组](/javascript/070-ObjectArray) 展开 `const` 锁引用的完整规则；[ES6 新特性](/javascript/220-ES6NewFeatures) 讲清这些现代写法的来龙去脉。

## 13. 官方文档

- let 声明：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Statements/let
- const 声明：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Statements/const
- JavaScript 数据类型与数据结构：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Data_structures
- 相等比较（== 与 === 的规范差异）：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Equality_comparisons_and_sameness

## 14. 自我检查

- 能不看资料说出「默认 const、会变才 let、var 只读旧代码」并给出理由；
- 能预测 var 提升与块泄漏场景的行为，说清「undefined 是静默的坏，报错是响亮的好」；
- 能报出七种原始类型，解释 typeof null 的来历，知道判 null 用 `=== null`；
- 能用模板字符串替代 + 拼接；
- 拿到 `Cannot access ... before initialization` 与 `Assignment to constant variable`，能三步内定位修复。

## 本章总结

变量是给值起的名字：默认 const，会重新赋值才 let，var 因块泄漏、提升、重复声明三宗罪退居「只读旧代码」；值的家族是七种原始类型加对象，typeof 能点名但有 null 这个永久的坑；拼接文本用模板字符串；比较一律 ===，不把正确性押在隐式转换上。数据有了名字，下一篇让它们算起来。

## 下一步

进入 [数据类型与运算符](/javascript/050-DataTypeOperator)：排行榜要算平均分、购物车要算总价，运算符登场。
