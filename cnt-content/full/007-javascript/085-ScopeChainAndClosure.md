---
order: 100
title: 作用域链与闭包：函数记住了出生地
module: 'javascript'
category: 前端技术
difficulty: intermediate
description: 从「循环里绑五个按钮，点谁都是同一个数」讲起：作用域链由内向外查找、同名遮蔽、三层嵌套实验、var 挂载 window 而 let 不挂载、隐式全局陷阱、闭包计数器与私有变量、IIFE 固定循环计数器，附 ReferenceError 与误改全局变量两则调试实录。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'javascript/080-FunctionScopeClosure'
  - 'javascript/100-ThisKeywordDeepDive'
  - 'javascript/350-MemoryManagementAndGarbageCollection'
  - 'javascript/360-ClosureMemoryLeakOptimization'
prerequisites:
  - 'javascript/080-FunctionScopeClosure'
---

## 知识点地图

- **知识类别**：语言核心——作用域（scope）与闭包（closure）。它是 [函数基础](/javascript/080-FunctionScopeClosure) 的直接续篇：080 篇学会「封装一段逻辑」，本篇回答「封装好的函数看得见谁、记住了谁」。
- **解决什么问题**：变量到底存在哪、函数为什么能访问「已经执行完」的函数里的变量；以及由它派生的一整类工程问题——循环里绑事件为什么全指向同一个值、模块怎么藏私有状态、回调为什么拿得到外层数据。
- **什么时候用到**：读任何超过一层的嵌套代码；给列表批量绑事件；写防抖节流这类「回调要记住上一次状态」的工具函数；把数据藏进模块不让外部直接改。

## 前置知识

- 已完成 [函数基础](/javascript/080-FunctionScopeClosure)：会声明与调用函数、知道形参实参、写过 rest 参数；
- 已完成 [变量与数据类型](/javascript/040-VariableDataType)：会 `let`/`const` 声明，知道「变量是名字绑定对象」。

没学过 080 也能跟：示例只用最普通的函数与变量，用到 080 的概念时现场补一句。

## 学习目标

读完本文你将能够：

1. 拿到一段嵌套代码，逐层说出变量的查找路径，解释同名遮蔽与「到全局还没找到才报错」；
2. 预测三层嵌套实验中每层能读到哪些变量、哪一层读取会报错；
3. 说出 `var` 与 `let` 在全局挂载上的差异，识别「不写声明关键字」造成的隐式全局变量；
4. 用「函数记住了出生地」解释计数器为什么能一直计数，并写出最小闭包示例；
5. 用 IIFE 解决「循环绑五个按钮，点谁都打印同一个数」的经典问题。

预计 50 到 70 分钟，含 3 组修改实验与 4 道练习。

## 1. 你现在要解决什么问题

课程作业里有一道经典题：页面上五个按钮，点击后各自弹出「我是第几个按钮」。最直觉的写法：

```javascript
const btns = document.querySelectorAll('button');
for (var i = 0; i < btns.length; i++) {
  btns[i].onclick = function () {
    console.log('我是第 ' + i + ' 个按钮');
  };
}
```

跑起来一试：点哪个按钮都打印 `我是第 5 个按钮`。五个回调全在引用同一个 `i`，而循环结束后 `i` 已经变成 5。这不是浏览器抽风，是「作用域」与「闭包」两个机制在按规则工作——**你只是还不知道规则**。学完本文，你不仅能解释这个现象，还能用一行改动修好它（第 6 节揭晓）。

## 2. 最小可运行示例：三层嵌套，谁能看见谁

先建立「作用域」的直觉。保存为 `scope.js`（本节纯 Node 即可运行）：

```javascript
const x = '全局的x';            // 全局作用域

function outer() {
  const y = 'outer的y';         // outer 函数作用域

  function inner() {
    const z = 'inner的z';       // inner 函数作用域
    console.log(z);             // 自己这层就有
    console.log(y);             // 本层没有，向外一层找到
    console.log(x);             // 再向外，到全局找到
  }

  inner();
}

outer();
console.log(y);                 // 会怎样？
```

预期输出：

```text
inner的z
outer的y
全局的x
ReferenceError: y is not defined
```

最后一行报错是本篇的第一块基石：`y` 出生在 `outer` 里，`outer` 外面的代码看不见它。**作用域就是「名字的可见范围」，它由代码的书写位置决定，而不是由调用位置决定。**

## 3. 作用域链：变量从出生地向外找

把第 2 节的规则总结成一句话：**查变量时从当前层出发，一层层往外找，找到就用，到全局还没找到才报 `ReferenceError`。** 这条「由内向外的查找路线」叫作用域链，它在函数**定义时**就定下来了——写在代码里的嵌套结构就是查找路线图。

逐行拆解第 2 节的 `inner`：

- `console.log(z)`：`z` 在 inner 自己的作用域里，第一层就命中。如果这里没有 `z` 的声明，查找会继续向外——这就是「找到即停止」；
- `console.log(y)`：inner 层没有 `y`，向外进入 outer 层，命中。查找路径是 `inner → outer`；
- `console.log(x)`：inner、outer 都没有，最后在全局命中，路径是 `inner → outer → 全局`。

**易错点一：同名遮蔽。** 内层声明的名字会遮住外层同名变量——外层的还在，只是这一层看不见它：

```javascript
const price = 100;              // 全局价

function checkout() {
  const price = 80;             // 局部价：遮住全局价
  console.log(price);           // 80：本层有，不再向外找
}

checkout();
console.log(price);             // 100：全局的 price 从未被改动
```

想在内层读写**外层**的同名变量，唯一的办法是不在内层重新声明。遮蔽本身不是 bug，框架与工具库大量靠它隔离内部状态；危险的是「以为改的是全局、其实改的是局部」（或反过来），排查手段是把两层都打出来对比。

**易错点二：var 挂载 window，let 不挂载。** 在浏览器全局写 `var` 声明，变量会挂到 `window` 上；`let` 声明的不会——但函数内部照样能访问它：

```javascript
var b = 20;
console.log(window.b);          // 20：var 全局变量就是 window 的属性

let b2 = 100;
console.log(window.b2);         // undefined：let 不挂载 window
console.log(b2);                // 100：但作用域链照常找得到
```

这是 080 篇「函数声明有提升、表达式没有」之外的另一组 var/let 差异：`var` 没有块级作用域、可重复声明、会挂 window；`let`/`const` 有块级作用域、不可重复声明、不挂 window。写新代码默认 `const`，需要重新赋值用 `let`，`var` 只在读老代码时认得。

**易错点三：隐式全局。** 函数内给一个从未声明的名字赋值，会悄悄创建全局变量：

```javascript
function makeOrder() {
  total = 999;                  // 忘写 let/const：total 变成全局变量
}

makeOrder();
console.log(total);             // 999：函数执行完了还在
```

函数执行完局部变量应当销毁（第 4 节闭包的例外也建立在这条规则上），`total` 却泄漏到了全局——多个函数共享一个意外全局名，谁改了它都查不出凶手。修法只有一条：**变量永远带声明关键字**。开启严格模式（`'use strict'`）后，隐式全局会直接报错，等于把这条纪律交给引擎强制执行。

## 4. 闭包：函数记住了出生地

作用域链规则到这就讲完了。但有一件事按直觉说不通：**函数被返回出去、外层函数早已执行完，内层函数还能访问外层的变量吗？**

现场感受一下，080 篇的结算函数 `addShipping` 出生在 `checkout` 里，把它返回出去再调用——它还记得出生地吗？最小示例，计数器：

```javascript
function createCounter() {
  let count = 0;                    // count 出生在 createCounter 里

  return function () {
    count = count + 1;              // 用的正是出生地的 count
    return count;
  };
}

const nextRound = createCounter();  // 拿到这个内层函数
console.log(nextRound());           // 1
console.log(nextRound());           // 2
console.log(nextRound());           // 3

const otherMatch = createCounter(); // 另开一局，互不干扰
console.log(otherMatch());          // 1
console.log(nextRound());           // 4（第一局接着数）
```

直觉说 `createCounter` 早就执行完了，`count` 应该被回收。实际它活着：**返回的内层函数带着对出生地的记挂活下去，`count` 也跟着活下去。** 这就是**闭包**——函数连同它出生时的那片作用域，打包成一体。

用 040 篇「变量是名字绑定对象」的视角想：`createCounter` 每调用一次，就造出一个新的 `count` 和一个新的内层函数；`nextRound` 与 `otherMatch` 各自记着各自的 `count`，所以互不干扰。这也是「局部变量函数执行完即销毁」的唯一例外：**销毁的前提是「没人再引用它」——闭包引用着，它就活下来。**

闭包同时是「私有变量」的来路：`count` 藏在函数背后，外面摸不到，只能通过返回的函数操作——比全局变量安全得多。对比两种写法：

```javascript
// 全局版：任何代码都能 total = -1 直接改坏
let total = 0;
function addToCart() { total = total + 1; }

// 闭包版：total 只能通过暴露的三个函数操作
function createCart() {
  let count = 0;
  return {
    add() { count += 1; },
    size() { return count; },
  };
}
const cart = createCart();
cart.add();
console.log(cart.size());     // 1
// console.log(cart.count);   // undefined：外部根本看不见 count
```

逐行看闭包版：`createCart` 调用一次，`count` 与返回的对象绑定成一个闭包；对象上的 `add`、`size` 两个方法共享同一个 `count`；外部除了调用这两个方法，没有任何途径读写 `count`。想给购物车加「上限 99 件」的规则，只需写进 `add` 里——所有修改都过这一道门。这就是模块化封装在没有 `private` 关键字的 JS 里的实现方式。

两个后话先记现象：闭包为什么可能拖累内存、怎么排查——[内存管理与垃圾回收](/javascript/350-MemoryManagementAndGarbageCollection) 与 [闭包内存泄漏](/javascript/360-ClosureMemoryLeakOptimization) 讲透；本篇只要求**能预测计数器行为**。

## 5. 三个真实场景里的闭包

闭包不是面试专用题，下面三个场景都来自真实工程形态。

**场景一：图片轮播记住当前页。** 轮播组件的核心状态「当前第几屏」绝不能是全局变量——页面可能有多个轮播。用工厂函数造轮播，每实例一份私有状态：

```javascript
function createCarousel(slides) {
  let index = 0;                              // 私有：每个轮播各自一份

  return {
    next() {
      index = (index + 1) % slides.length;    // 循环前进，取模绕回
      return slides[index];
    },
    current() {
      return slides[index];
    },
  };
}

const homeBanner = createCarousel(['新品', '活动', '公告']);
const detailGallery = createCarousel(['正面图', '背面图']);

console.log(homeBanner.next());        // 活动
console.log(homeBanner.next());        // 公告
console.log(detailGallery.current());  // 正面图：换实例从头数
```

两个实例的 `index` 互不影响——正是第 4 节计数器「两局互不干扰」的翻版。

**场景二：防抖函数记住定时器。** 搜索框输入时不想每个字符都发请求，要「停顿 300 毫秒才发」。防抖函数必须在两次调用之间**记住上一次的定时器**——这个记忆就是闭包：

```javascript
function debounce(fn, delay) {
  let timer = null;                 // 闭包变量：上一次的定时器
  return function (...args) {
    clearTimeout(timer);            // 还没到点又来了：撤掉上一次
    timer = setTimeout(() => fn(...args), delay);
  };
}

const search = debounce((kw) => fetch('/api/search?q=' + kw), 300);
input.addEventListener('input', (e) => search(e.target.value));
```

逐行看：`timer` 出生在 `debounce` 里；返回的函数每次被触发都能摸到**同一个** `timer`——先 `clearTimeout` 作废上一次，再登记新的。若没有闭包，`timer` 只能挂在全局上，页面上第二个搜索框就会互相撤掉对方的定时器。这套 `debounce` 的完整版（含立即执行与取消）在 [防抖与节流](/javascript/490-DebounceThrottle) 展开。

**场景三：考试倒计时记住剩余时间。** 每开一场考试造一个倒计时器，剩余时间必须是实例私有的，否则两个考场的计时会串：

```javascript
function createExamTimer(seconds, onTick, onTimeout) {
  let remaining = seconds;                    // 私有剩余时间
  const timer = setInterval(() => {
    remaining -= 1;
    onTick(remaining);
    if (remaining <= 0) {
      clearInterval(timer);                   // 归零即停
      onTimeout();
    }
  }, 1000);

  return {
    getRemaining() { return remaining; },     // 只读接口
    forceEnd() {                              // 提前交卷：手动终止
      clearInterval(timer);
      onTimeout();
    },
  };
}
```

`remaining` 与 `timer` 都锁在闭包里：外部能读剩余时间、能强制结束，但**改不了** `remaining`——把 59 改成 59 万这种作弊路径被语言本身堵死。定时器的调度细节（为什么每秒一次的回调其实不准时）留到 [定时器与时间调度](/javascript/485-TimersAndScheduling) 展开。

## 6. IIFE：立即执行函数固定循环计数器

回到第 1 节的五按钮问题。用闭包的视角重看它：回调函数引用的 `i` 是 `var` 声明的**全局唯一**变量，五个闭包共享同一个 `i`；循环结束时 `i === btns.length`，所以点谁都打印 5。修法是给每个按钮**单独造一层作用域**，把当时那一刻的 `i` 复制进去——工具是立即执行函数（IIFE，Immediately Invoked Function Expression）：

```javascript
const btns = document.querySelectorAll('button');
for (var i = 0; i < btns.length; i++) {
  (function (m) {                     // 匿名函数包一层，立刻执行
    btns[i].onclick = function () {
      console.log('我是第 ' + (m + 1) + ' 个按钮');   // m 是这一轮定格的 i
    };
  })(i);                              // 把当前的 i 传进去变成参数 m
}
```

逐段拆解：

- `(function (m) { ... })(i)`：外层括号把「函数表达式」变成可调用的值，尾部的 `(i)` 表示**定义完立刻调用**，实参是当前的 `i`；
- 每轮循环都执行一次这个 IIFE，于是每轮都创建一个**新的函数作用域**，`m` 是按值复制进来的当前序号；
- 内层的 `onclick` 回调闭包引用的是这个 IIFE 作用域里的 `m`——五个按钮各记各的 `m`，互不干扰。

IIFE 是「用函数圈住一块作用域」的通用技巧，在 ES 的模块普及之前，几乎所有库（jQuery 时代）都靠它防止内部变量泄漏到全局。今天它的两个高频残留场景：一是这类循环绑定问题（ES2026 年更常见的等价写法是 `for (let i = ...)`——let 在每轮迭代都创建新的块级作用域，效果与 IIFE 相同）；二是初始化代码不想暴露任何中间变量时包一层。

概念串联一句话：**一等公民是地基**（函数是值，080 篇）、**回调是用途**（把函数传出去等着被调）、**匿名函数是写法**（传一次就不取名）、**IIFE 是技巧**（用匿名函数马上执行、圈住作用域）——四者是同一条概念线上的四站。

## 7. 修改实验

实验一：把第 2 节三层嵌套实验里的 `const y = 'outer的y'` 挪到 `inner` 内部声明，预测三行 console 各输出什么、`outer` 之外还能不能读到 `y`。（提示：遮蔽方向反过来了。）

实验二：`createCounter` 改成接收起始值，`createCounter(100)` 后第一脚踩出 `101`，并验证两局依旧互不干扰。

实验三：把五按钮的 IIFE 写法改成 `for (let i = ...)` 版本，验证行为一致；再故意改回 `var` 但不套 IIFE，观察报的数。（提示：两版等价的机理不同——IIFE 靠参数复制，let 靠每轮新建块级作用域。）

## 8. 常见错误与调试实录

**错误一：引用了根本不存在的名字。** 想在第 2 节的实验里直接打印 `y`：

```javascript
console.log(y);   // outer 之外
```

真实报错（Node 原文）：

```text
ReferenceError: y is not defined
```

注意报错说的是 `y is not defined` 而不是「找不到」——作用域链到全局还没有这个名字。定位三步：读报错，`ReferenceError` 说明名字在当前作用域链上不存在；验真身，检查拼写（`outter`/`outer` 一字之差就是两种命运）；看位置，这个名字声明在哪一层？调用处是不是在它外面？修法要么把声明提到外层，要么把使用挪进声明所在的层。与 080 篇 `Cannot access 'checkout' before initialization` 区分：后者名字存在但还没初始化（let/const 的暂时性死区），前者名字压根不存在。

**错误二：以为改的是局部，实际泄漏成全局。** 一段「看起来没问题」的统计代码：

```javascript
function summarize(scores) {
  for (var i = 0, sum = 0; i < scores.length; i++) {
    sum += scores[i];
  }
  return sum;
}
summarize([80, 90]);
console.log(window.sum);   // undefined（Node 下报错），但 sum 确实被创建成了全局
```

`var` 在 for 头部声明的变量提升到函数顶部，这里还算「函数局部」；真正的坑是**忘了写 var**：`for (i = 0, sum = 0; ...)` 会把 `i` 与 `sum` 都造成全局变量——两次调用之间残留上一次的值，出现「第二次统计结果莫名变大」的灵异现象。定位手段：可疑变量上 `console.log(window.变量名)`，能取到值就是隐式全局；根治手段是全程 `let`/`const` 加严格模式。

## 9. 实际项目中的使用场景

- 批量绑定事件（第 1 节与 IIFE 一节）：列表、按钮组、图例，只要在循环里绑回调就会遇到；
- 工具函数与模块封装（第 5 节场景二）：防抖、节流、一次性初始化、带缓存的取数函数，凡「回调要记住状态」处必有闭包；
- 面向对象前的私有状态（第 5 节场景一、三）：没有 class 私有字段的年代和今天的轻量脚本里，闭包仍然是最便宜的封装；
- 不该做的：为闭包而闭包——只调用一次、不记任何状态的函数套一层工厂纯属绕路；以及闭包意外拖住大对象不放的内存问题（360 篇专治）。

## 10. 小练习

预测题（5 分钟，先写答案再运行）：

```javascript
const name = '全局';
function outer() {
  const name = '外层';
  function inner() {
    console.log(name);
  }
  return inner;
}
const speak = outer();
speak();
```

这题同时考作用域链与闭包：`inner` 的 `name` 找到的是哪一个？为什么 `outer` 执行完了还找得到？（答案：`外层`——查找路径 `inner → outer` 第一层就命中；`inner` 记着出生地 outer 的作用域，所以 `name` 活着。）

修改题（10 分钟）：给第 5 节场景一的轮播加 `prev()`（后退一格），验证 `next` 与 `prev` 共享同一个 `index`：`next(); next(); prev()` 后 `current()` 应回到第二个。

修 Bug 题（15 分钟）：下面代码想实现「双击轮播图回第一屏」，真实症状是无论双击哪张图，都跳回第三屏。定位并修复：

```javascript
const slides = document.querySelectorAll('.slide');
for (var i = 0; i < slides.length; i++) {
  slides[i].addEventListener('dblclick', function () {
    slides[i].scrollIntoView();     // 想回到点中的那张
  });
}
```

真实症状：双击任意一张都定位到**最后一张**（`i` 已是 `slides.length`，`slides[3]` 为 undefined 时甚至直接报错）。提示与修法：同第 6 节——套 IIFE 或改用 `let`，让每张图记住自己的序号；更进一步，事件委托（[DOM 事件流与事件委托](/javascript/415-DOMEventFlowAndDelegation)）能从根上避免循环绑定。

挑战题（半小时，不给代码）：写 `createIdGenerator()`：返回 `next()` 函数，每次调用返回递增编号；再返回 `reset()` 把计数归零。验收断言：

```javascript
const gen = createIdGenerator();
console.assert(gen.next() === 1, '第一次应为 1');
console.assert(gen.next() === 2, '第二次应为 2');
gen.reset();
console.assert(gen.next() === 1, '重置后应为 1');

const gen2 = createIdGenerator();
console.assert(gen2.next() === 1, '新实例应独立计数');
```

提示分两级：「提示」两个函数要共享同一个闭包变量——在工厂函数里先声明 `let count`，再一起返回；「展开」返回对象而不是单个函数：`return { next() {...}, reset() {...} }`，两个方法闭包引用同一个 `count`。

## 11. 与之前和之后的知识的关系

- 往前：[函数基础](/javascript/080-FunctionScopeClosure) 的「函数是值」让函数能被返回出去，闭包由此成为可能；[变量与数据类型](/javascript/040-VariableDataType) 的「名字绑定」在本篇兑现为查找规则；
- 往后：[this 深潜](/javascript/100-ThisKeywordDeepDive) 的箭头函数「不绑定自己的 this、沿作用域链往外找」，正是本篇作用域链在 this 上的延伸；[防抖与节流](/javascript/490-DebounceThrottle) 是场景二的完整工程版；[DOM 事件流与事件委托](/javascript/415-DOMEventFlowAndDelegation) 给循环绑定问题提供了第三种解法；内存代价与排查见 [闭包内存泄漏](/javascript/360-ClosureMemoryLeakOptimization)。

## 12. 官方文档

- MDN 闭包：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Closures
- MDN 作用域：https://developer.mozilla.org/zh-CN/docs/Glossary/Scope
- MDN let 声明（含暂时性死区）：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Statements/let
- MDN 立即执行函数（IIFE）：https://developer.mozilla.org/zh-CN/docs/Glossary/IIFE

## 13. 自我检查

- 拿到一段嵌套代码，能逐层说出变量查找路径，并解释同名遮蔽；
- 能预测三层嵌套实验中每层的输出，说出 `y is not defined` 与 `before initialization` 两种报错的区别；
- 能说出 var 与 let 在 window 挂载、块级作用域、重复声明上的三点差异，并识别隐式全局变量；
- 能现场写出 `createCounter` 并预测它与第二次调用实例的计数行为；
- 能解释五按钮问题「点谁都打印同一个数」的成因，并用 IIFE 或 let 两种方式修复。

## 本章总结

变量查找从出生地一层层向外，找到即停，到全局还没有才报 `ReferenceError`；内层同名遮蔽外层。var 挂载 window 而 let 不挂载，函数内忘写声明会造出隐式全局。函数被返回出去时连同出生时的作用域打包活下去，这就是闭包：计数器因此能一直数，私有状态因此藏得住，防抖的定时器因此记得住上一次。IIFE 用「定义即执行」的匿名函数圈住作用域，把循环里每一轮的值定格成各自的闭包变量——五按钮问题由此得解。

## 下一步

进入 [this 深潜](/javascript/100-ThisKeywordDeepDive)：作用域链管「变量去哪找」，this 管「函数被谁调用」——两条规则长得像，行为完全不同。
