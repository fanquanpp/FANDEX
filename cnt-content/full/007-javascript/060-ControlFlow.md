---
order: 60
title: 控制流：让程序会判断、会重复
module: 'javascript'
category: 前端技术
difficulty: intermediate
description: 用猜数字游戏讲透 if/else、switch 取舍、for/while/for-of 三种循环与 break/continue，附 if 条件里写 = 的事故现场与 ESLint 真实报错、const 循环变量报错、死循环急救，含预测题与修 Bug 练习。
author: fanquanpp
updated: '2026-09-27'
related:
  - 'javascript/050-DataTypeOperator'
  - 'javascript/070-ObjectArray'
  - 'javascript/090-ArrayHigherOrderMethod'
  - 'python/060-ControlFlow'
prerequisites:
  - 'javascript/050-DataTypeOperator'
---

## 前置知识

- 已完成 [数据类型与运算符](/javascript/050-DataTypeOperator)：会写算术与比较表达式，知道 `===` 与 `==` 的区别、短路求值返回的是操作数本身。

没学过也能跟：本文用到的运算符首次出现都会当场解释。但建议先补 050——判断语句的「条件」就是那些表达式，这里只是给它们安排了新岗位。

## 学习目标

读完本文你将能够：

1. 用 `if` / `else if` / `else` 让程序对同一份数据给出不同回应，并准确预测哪个分支被执行；
2. 在「等值分发」与「范围判断」之间正确选择 `switch` 或 `if`，并解释漏写 `break` 会发生什么；
3. 在次数已知、次数未知、逐项处理三种场景间正确选择 `for`、`while`、`for-of`，并用 `break`、`continue` 控制循环；
4. 独立写出一个能自动逼近答案的猜数字小游戏；
5. 排查两类高频事故：条件里写成 `=`（无报错但逻辑全错）与循环变量不更新（程序卡死）。

预计 45 到 60 分钟，含 3 组修改实验与 4 道练习。

## 1. 你现在要解决什么问题

程序到现在为止只会从上往下逐行执行。猜数字游戏为什么需要判断和重复？最小版本：电脑想好一个数（先写死成 7），你猜一个数。立刻会遇到两件「逐行执行」做不到的事：

- 回应必须分情况：猜小了、猜大了、猜对了是三种不同的话，不可能三行都打印；
- 猜错必须重来：玩家不会一次猜中，同一套「比较、回应」逻辑要反复执行。

这正是本篇的两个主题：**判断**（走哪条路）与**循环**（重复走路）。

（Python 模块的 [控制流](/python/060-ControlFlow) 用的就是同一个案例。语言不同，问题与解法完全同构——对比着读，你会对「语法是外壳、思路是内核」有实感：Python 用缩进分块，JS 用大括号；Python 的 `elif` 在这里写作 `else if`。）

## 2. 先不要看解释，先试试看

浏览器控制台（或 `node -e`）逐行输入，**每行先预测再回车**：

```javascript
if (3 > 5) {
  console.log('走了这里 A');
} else {
  console.log('走了这里 B');
}

if (0) {
  console.log('走了这里 C');
} else {
  console.log('走了这里 D');
}
```

两段代码结构一样，输出却分别是 B 和 D。第二段的条件是数字 `0`，根本不是比较表达式——JS 照样替你做了决定。这个「什么算真、什么算假」的规则马上讲。

## 3. 最小可运行示例：会自己逼近答案的猜数字

玩家要猜很多次，脚本里没有输入框，就先让程序替玩家猜：从 1 开始，每轮根据反馈调整。保存为 `guess.js`（`node guess.js` 运行，或整段贴进浏览器控制台）：

```javascript
const secret = 7;   // 电脑想好的数
let guess = 1;      // 玩家从 1 开始猜

while (guess !== secret) {          // 没猜中就再来一轮
  if (guess < secret) {
    console.log('猜了 ' + guess + '，小了');
  } else {
    console.log('猜了 ' + guess + '，大了');
  }
  guess = guess + 1;                // 向答案逼近一步
}

console.log('猜对了，答案是 ' + secret);
```

预期输出：

```text
猜了 1，小了
猜了 2，小了
猜了 3，小了
猜了 4，小了
猜了 5，小了
猜了 6，小了
猜对了，答案是 7
```

十几行代码，判断与循环各就各位。下面拆开讲。

## 4. 发生了什么：两块积木

### 4.1 判断：if / else if / else

`if (条件) { ... }` 的条件不必是布尔值——JS 会把它**转换**成真或假再决定走哪条路。只有这几个值算「假」：

```text
false、0、''（空字符串）、null、undefined、NaN
```

其余一切都是「真」，包括 `'0'`、`' '`（带空格的字符串）。第 2 节里 `if (0)` 走了 else，就是这个转换的功劳。

多分支用 `else if` 链，**从上往下**匹配第一个成立的条件，后面的全部跳过：

```javascript
const score = 85;
if (score >= 90) {
  console.log('段位：钻石');
} else if (score >= 80) {
  console.log('段位：黄金');     // 85 走这里，后面不再看
} else if (score >= 60) {
  console.log('段位：青铜');
} else {
  console.log('段位：见习');
}
```

预期输出：

```text
段位：黄金
```

### 4.2 循环：while 是本质，for 是它的快捷方式

`while (条件) { ... }`：条件为真就重复执行。它能正常停下来靠三件事——**初始值、条件、每轮的变化**。猜数字里就是 `guess = 1`、`guess !== secret`、`guess = guess + 1`。少了「每轮的变化」，条件永远为真，程序就卡死。

`for` 把三件事收进一行括号，专门服务「次数已知」的场景：

```javascript
for (let i = 1; i <= 3; i++) {   // 初始化; 条件; 每轮更新
  console.log('第 ' + i + ' 轮');
}
```

它和下面的 `while` 完全等价，你能看出三件事各对应哪一段吗：

```javascript
let i = 1;
while (i <= 3) {
  console.log('第 ' + i + ' 轮');
  i = i + 1;
}
```

第三种 `for-of` 负责「逐个拿出一串东西里的每一项」，比如数组：

```javascript
const guesses = [1, 9, 7];
for (const g of guesses) {
  console.log('本次猜测：' + g);
}
```

数组是下一篇的主角，这里先混个眼熟：`guesses` 是一串数，`for-of` 每轮把其中一项交给 `g`。

### 4.3 三种循环怎么选

| 场景 | 用哪个 | 例子 |
| --- | --- | --- |
| 次数已知（第 1 到第 10 轮） | `for` | 固定局数、固定行数 |
| 次数未知，由条件决定 | `while` | 猜中为止、血量扣完为止 |
| 拿到一串数据逐项处理 | `for-of` | 遍历数组、遍历字符串 |

## 5. 核心概念：switch 与 break/continue

`switch` 是「同一个变量对着一串固定值分发」的专用语法：

```javascript
const command = 'shop';
switch (command) {
  case 'shop':
    console.log('打开商店');
    break;                       // 不写 break 会穿透到下一个 case
  case 'map':
    console.log('打开地图');
    break;
  default:
    console.log('未知指令');
}
```

取舍规则：**等值分发（变量等于哪个固定值）且分支较多时用 `switch`，其余一律 `if`**。`if` 能做范围判断（`score >= 80`）、能组合条件（`&&`、`||`），`switch` 只能等值；反过来，五六个 `else if` 都在比较同一个变量时，`switch` 更清爽。`case` 末尾忘写 `break`，程序会「穿」进下一个 `case` 继续执行——这是 JS 历史包袱里最出名的一个，第 9 节的修 Bug 题会现场抓它。

循环里两个控制词：

```javascript
for (let i = 1; i <= 5; i++) {
  if (i % 2 === 0) continue;    // 跳过本轮，直接进入下一轮
  if (i === 4) break;           // 整个循环到此为止
  console.log(i);
}
```

预期输出：

```text
1
3
```

`continue` 跳过了 2，`break` 在打印 3 之后、轮到 4 时终止了循环。记忆口诀：`continue` 是「这轮不要了」，`break` 是「不玩了」。

## 6. 修改实验

实验一：把 `guess.js` 的 `while` 改写成等价的 `for`（初始化、条件、更新各归其位），输出必须一字不差。

实验二：给猜数字加「步数统计」：循环结束后输出 `一共猜了 N 次`。提示：需要一个新的计数变量，在循环外声明、循环内累加。

实验三：把游戏反转——`secret = 3`，玩家从 10 开始往小猜（每轮 `guess = guess - 1`）。先预测第一行和最后一行输出，运行验证。

## 7. 常见错误与调试实录

**事故一：条件里把 `=` 当 `==`。** 真实代码，来自一个「角色永不死亡」的 bug：

```javascript
let hp = 5;
if (hp = 0) {                    // 想写 hp === 0，少敲了一个 =
  console.log('你已死亡');
} else {
  console.log('你还活着，血量 ' + hp);
}
```

运行结果：

```text
你还活着，血量 0
```

没有任何报错。`hp = 0` 是赋值：先把 `hp` 改成 0，再把赋值表达式的值 `0` 当条件用——`0` 是假，于是 else 分支永远执行。更阴险的是 `if (hp = 10)`：赋完值是 `10`，为真，if 分支永远执行。**这类 bug 报不出错，只能靠结果反常倒查。** 定位三步：

1. 症状是「某个分支永远走 / 永远不走」→ 优先怀疑条件本身，而不是分支里的代码；
2. 在 if 的上一行打印条件里用到的变量，进 if 前后各一次，看值是否被意外改动；
3. 条件里一律写 `===`，让「少敲一个 =」直接变成语法错误，而不是安静地改数据。

这条坑 JS 工具链早就盯上了：ESLint 的 `no-cond-assign` 规则会报出真实警告文本 `Expected a conditional expression and instead saw an assignment.`，工程化章节会带你配它。

**事故二：const 循环变量。**

```javascript
for (const i = 0; i < 3; i++) {
  console.log(i);
}
```

真实报错：

```text
TypeError: Assignment to constant variable.
```

`for` 括号里的 `i++` 是赋值，而 `const` 不许重新赋值。规则：会变的用 `let`，`const` 留给不再变的值——040 篇的选择规则在循环里原样适用。

**事故三：死循环。** 忘了 `guess = guess + 1` 这一行，程序会打印无数行。Node 终端按 `Ctrl+C` 强制中断，浏览器控制台刷新页面。急救之后回头检查一件事：循环体里**谁负责让条件朝假的方向变化**？

## 8. 实际项目中的使用场景

- 表单校验：一组 `else if` 从「必填」查到「格式」，第一个不满足就提示并停止；
- 轮询重试、游戏主循环：`while` 配合次数上限（永远给循环留一道保险，防死循环）；
- 渲染列表：`for-of` 遍历数据逐条生成内容（090 篇的 map 是它的进阶封装）；
- 指令分发、状态分发：固定值多且只需等值比较的地方用 `switch`；
- 不该做的：能用一个 `if` 说清的事不要嵌套三层；多个 `case` 故意共享代码（不写 `break`）时，加一行注释说明「这是故意的」，否则读代码的人会当成事故。

## 9. 小练习

预测题（5 分钟，先写答案再运行验证）：

```javascript
const n = 0;
if (n) {
  console.log('甲');
} else if (n === 0) {
  console.log('乙');
} else {
  console.log('丙');
}
```

修改题（10 分钟）：把 `guess.js` 改成「电脑随机想数」：把 `const secret = 7` 换成 `const secret = Math.floor(Math.random() * 100) + 1`（`Math.random` 给 0 到 1 之间的小数，`Math.floor` 向下取整，两个都是标准库函数，先当公式用）。连跑 5 次，确认每次答案不同、游戏都能正常结束。

修 Bug 题（15 分钟）：下面的代码想打印 1 到 5，实际输出 `1 2 3 4 5 6 7 ...` 根本停不下来。指出问题、修复，并说出你按第 7 节事故几号思路定位的：

```javascript
let i = 1;
while (i <= 5) {
  console.log(i);
}
```

挑战题（半小时，不给代码）：遍历 1 到 15：是 3 的倍数打印 `Fizz`，是 5 的倍数打印 `Buzz`，同时是 3 和 5 的倍数打印 `FizzBuzz`，其余打印数字本身。验收断言（用 `console.assert(条件, '失败提示')` 自测，条件不成立才输出提示）：

```javascript
console.assert(那行输出 === 'FizzBuzz', '15 应为 FizzBuzz');
console.assert(那行输出 === 'Fizz', '9 应为 Fizz');
```

提示分两级：「提示」想清楚判断顺序——先判「既是 3 又是 5」再判单倍数，否则 15 会先被 3 拦下；「展开」关键写法是 `i % 3 === 0` 与 `i % 5 === 0` 的组合分支。

## 10. 与之前和之后的知识的关系

- 往前：[数据类型与运算符](/javascript/050-DataTypeOperator) 的比较与逻辑运算符在这里全部上岗——判断语句的「条件」就是那些表达式；`const` 与 `let` 的选择规则在循环里再次生效；
- 往后：[对象与数组](/javascript/070-ObjectArray) 会让你真正理解 `for-of` 在遍历什么；[数组高阶方法](/javascript/090-ArrayHigherOrderMethod) 的 map/filter 是「循环 + 判断」的封装，学完本篇你看得懂它们在替你做什么。

## 11. 官方文档

- MDN 控制流与错误处理指南：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Control_flow_and_error_handling
- `if...else` 语句：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Statements/if...else
- `switch` 语句：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Statements/switch
- `for...of` 语句：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Statements/for...of

## 12. 自我检查

- 能不看资料写出 if / else if / else 三分支，并说出 `0`、`''`、`'0'` 各算真还是假；
- 能说出三种循环各自的最佳场景，并把任意一种改写成另外两种；
- 能解释 `if (hp = 0)` 为什么不报错但逻辑全错，并说出 ESLint 会怎么拦它；
- 遇到程序卡死，知道先 `Ctrl+C` 再查「谁负责让条件变假」。

## 本章总结

判断让程序分情况，循环让程序重复。条件不限于布尔值，JS 会把它转换成真假，假值只有 `false、0、''、null、undefined、NaN`。`for` 管次数已知，`while` 管次数未知，`for-of` 管逐项处理；`switch` 只服务等值分发，`break` 不写会穿透。最危险的坑是条件里的 `=`——它不报错，只让你怀疑人生；条件里永远写 `===`。

## 下一步

进入 [对象与数组](/javascript/070-ObjectArray)：一个玩家三行变量，一百个玩家怎么办？你的判断和循环马上要开始处理成串的数据了。
