---
order: 60
title: 第一门语言体验：JavaScript 与浏览器控制台
description: 不装任何软件，直接在浏览器开发者工具里写出前 20 行 JavaScript：变量、条件、循环、函数，并用 Node 运行第一个脚本文件，完成猜数字小游戏。
module: 'start'
category: 工具链
difficulty: beginner
prerequisites:
  - 'start/040-TerminalAndShellBasics'
  - 'start/050-LearnHowToLearnProgramming'
author: fanquanpp
updated: '2026-09-18'
related:
  - 'javascript/010-WhatIsJavaScript'
  - 'start/070-FirstProgramPython'
---

## 学习目标

JavaScript 是唯一一个"浏览器免费送运行环境"的主流语言——你不需要装任何东西（Node 已在环境搭建篇装好，但本篇正文只用浏览器）。读完本篇你将：

1. 写出人生第一行代码并看到它的输出；
2. 掌握四个最核心的编程构件：变量、条件、循环、函数（所有语言通用）；
3. 独立完成第一个可玩的小程序：猜数字；
4. 学会把代码存成文件、用 Node 运行，理解"浏览器里跑"和"文件里跑"的关系。

预计 60 到 90 分钟。**全程跟着敲，不许复制粘贴**——方法论篇讲过的第一级练习，从这里开始执行。

## 前置知识

- 会打开浏览器开发者工具（[零基础计算机常识](/start/020-ComputerBasicsForBeginners) 末节）；
- 知道按 `F12`，找到 Console（控制台）标签。

## 第一行代码

打开 Chrome 或 Edge，按 `F12`，切到 Console 标签，点击闪烁的光标处，输入：

```javascript
console.log("你好，世界");
```

回车。下方出现输出 `你好，世界`。

恭喜，这行代码你已经超过人类大多数：你**指挥了一台计算机**。逐词拆解这行代码：

- `console`：控制台对象，代表"输出面板"这个东西；
- `.`：取用它的某个功能，读作"的"；
- `log`：记录/打印功能；
- `("你好，世界")`：传给这个功能的数据，双引号包住的文字叫**字符串（string）**；
- `;`：语句结束符（JS 中可省，但建议写，养成习惯）。

顺手体验一下数学：输入 `2 + 3 * 4` 回车，输出 `14`——乘法先算，和数学一致。输入 `10 % 3` 输出 `1`——`%` 是取余数，未来判断奇偶、轮询取模全靠它。

## 变量：给数据起名字

程序要记住东西，就要用**变量（variable）**——一个有名字的盒子：

```javascript
let age = 25;
let name = "小明";
console.log(name + " 今年 " + age + " 岁");
```

输出 `小明 今年 25 岁`。三个要点：

- `let` 是"声明一个新变量"的关键字（JS 里还有 `const` 表示不可重新赋值的盒子，能用 const 就用 const，这是社区共识的默认选择）；
- `=` 不是"等于"，是"把右边的值装进左边的盒子"，读作"赋值"；
- 变量名用英文、见名知意，`age` 优于 `a`。命名是免费的文档。

修改与读取：

```javascript
age = age + 1;        // 盒子里的值加 1 再装回去，现在 26
age++;                // 等价简写：自增 1
console.log(age);     // 27
```

## 条件：让程序会做选择

只有顺序执行的程序是流水账，**条件分支（if）**让它有判断力：

```javascript
let score = 85;

if (score >= 90) {
  console.log("优秀");
} else if (score >= 60) {
  console.log("及格");
} else {
  console.log("不及格");
}
```

输出 `及格`。逐点解释：

- `score >= 90` 是**条件表达式**，结果只有真（true）或假（false）两种，叫**布尔值（boolean）**；
- `if` 后的括号里放条件，大括号 `{}` 里放"条件为真时执行的代码"；
- `else if` 与 `else` 覆盖其余情况，从上往下第一个命中的分支执行，其余全部跳过。

动手：把 `score` 改成 `95`、`59` 各运行一次，观察输出变化——**改参数观察行为**是从今天开始的基本功。

常见的比较与逻辑符号：`>` `<` `>=` `<=` `===`（完全相等，JS 中三个等号是默认推荐）`!==`（不等），以及"并且" `&&`、"或者" `||`。试试 `score >= 60 && score < 90`。

## 循环：让机器做重复劳动

打印 1 到 5 可以写五行 `console.log`，打印 1 到 1000 呢？**循环（loop）**出场：

```javascript
for (let i = 1; i <= 5; i++) {
  console.log("第 " + i + " 次循环");
}
```

`for` 括号里三段含义：

1. `let i = 1`：循环开始前执行一次，建一个计数器；
2. `i <= 5`：每轮开始前检查，为真才继续本轮；
3. `i++`：每轮结束后计数器加 1。

把 5 改成 1000 回车，1000 行瞬间刷出——这就是"机器擅长重复"的直观感受。练习变体（方法论第三级）：

- 只打印偶数（提示：`i % 2 === 0`）；
- 打印 5 的乘法表前 3 行（提示：循环里再拼字符串）。

## 函数：把代码打包成可复用的积木

同样的逻辑要反复用，就包进**函数（function）**：

```javascript
function greet(name) {
  return "你好，" + name + "！欢迎来到编程世界。";
}

console.log(greet("小明"));
console.log(greet("张三"));
```

- `function greet(name)` 定义名叫 `greet` 的函数，`name` 是**参数**（使用时才填的空）；
- `return` 把结果交还给调用者；
- `greet("小明")` 是**调用**，"小明"是这次填进去的**实参**。

函数是编程史上最重要的发明之一：它让你"先搭骨架，再填血肉"。以后你写的每个程序都是一堆函数的协作。

## 实战项目：猜数字游戏

把四个构件组装起来（第四级练习）。目标：程序随机选一个 1 到 100 的数，玩家反复猜，程序提示大了/小了，猜中显示次数。

在控制台逐段输入：

```javascript
const answer = Math.floor(Math.random() * 100) + 1;  // 1 到 100 的随机整数
let count = 0;                                        // 猜的次数

function checkGuess(guess) {
  count++;
  if (guess === answer) {
    console.log("猜中了！一共猜了 " + count + " 次");
    return true;
  } else if (guess > answer) {
    console.log("大了");
  } else {
    console.log("小了");
  }
  return false;
}
```

然后开始玩，反复调用：

```javascript
checkGuess(50);   // 看提示
checkGuess(75);   // 根据提示继续
checkGuess(62);   // 直到输出"猜中了"
```

玩一局，然后思考两个问题（费曼式自问）：

1. `Math.random()` 产生 0 到 1 的小数，`* 100` 后范围是什么？`Math.floor` 是干嘛的？为什么最后 `+ 1`？
2. 如果把 `===` 写成 `=`，会发生什么？

想不清楚就把代码改一下跑一遍，用实验回答——这就是程序员做研究的方式。

## 存进文件：从控制台到真正的程序

控制台代码刷新页面就没了。真正的程序是文件。三步：

1. 用 VS Code 在 `my-code/week1` 新建 `guess.js`，把上面两段代码完整粘贴进去，并在文件末尾补一段让程序"自己玩"的循环（先照抄，细节后续模块会讲）：

```javascript
let guess = 50;
while (!checkGuess(guess)) {
  guess = guess + 1;    // 演示用笨办法：从 50 开始逐个加一
}
```

2. 终端里 `cd` 到 `week1` 目录，运行：

```bash
node guess.js
```

3. 看到"猜中了！一共猜了 N 次"的输出，你已经完成了从"玩代码"到"运行程序文件"的跨越。

同一个 `guess.js` 也可以放进网页里跑（`<script src="guess.js"></script>`），这正是 [HTML5 模块](/html5/010-WhatIsWebpage) 之后会展开的世界：浏览器里的 JS 负责界面，Node 里的 JS 负责服务器与工具。

## 常见困惑

**"手滑输错了怎么办？"**——Console 里 `Ctrl+C`（macOS `Cmd+C`）复制，用上/下方向键调出历史命令修改重跑。想清空重来：`Ctrl+L` 或点击禁止图标。

**"红色报错刷屏了！"**——先读最后一行。JS 高频报错三兄弟：`xxx is not defined`（名字拼错或未声明）、`Uncaught SyntaxError`（标点/括号不配对）、`Cannot read properties of undefined`（在"空值"上取东西，后续模块细讲）。用方法论篇的四步流程处理。

**"为什么我明明写了 if 却没执行？"**——九成是条件写错（`=` 赋值与 `===` 比较）或大括号包错了范围。在 if 前后各加一行 `console.log` 打印条件值，立刻现形——**打印调试法**是零基础阶段最有效的工具。

## 检验清单

- 不看教程能默写出：打印一行字、声明变量、if/else、for 循环、定义并调用函数；
- 猜数字游戏能独立重玩一遍（合上教程）；
- 能解释 `let` 与 `const` 的区别、`=` 与 `===` 的区别；
- 已用 node 成功运行自己保存的 `guess.js`。

## 下一步

体验了"机器擅长重复计算"，下一篇用 [Python 写一个真正实用的小工具](/start/070-FirstProgramPython)——记账程序，感受脚本语言解决日常问题的爽感；然后对比两门语言，选择你的主线方向。
