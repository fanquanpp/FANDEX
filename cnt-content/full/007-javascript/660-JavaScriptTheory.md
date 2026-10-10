---
order: 740
title: JavaScript 运行模型总览
module: 'javascript'
category: 前端技术
difficulty: advanced
description: 从一段输出顺序诡异的代码出发，把引擎流水线、作用域闭包、原型查找、事件循环与类型转换串成一张地图。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'javascript/080-FunctionScopeClosure'
  - 'javascript/180-JavaScriptPrototypeInheritance'
  - 'javascript/290-EventLoop'
  - 'javascript/300-EventLoopDetailed'
  - 'javascript/350-MemoryManagementAndGarbageCollection'
prerequisites:
  - 'javascript/080-FunctionScopeClosure'
  - 'javascript/250-AsyncProgramming'
---

# JavaScript 运行模型总览

## 场景：一段"不讲道理"的代码

先别翻文档，凭直觉猜输出：

```javascript
console.log('script start');

setTimeout(() => console.log('timeout'), 0);

Promise.resolve().then(() => console.log('promise'));

(async () => {
  console.log('async start');
  await null;
  console.log('async end');
})();

console.log('script end');
```

正确答案是：

```text
script start
async start
script end
promise
async end
timeout
```

猜错了很正常——猜错的原因恰恰说明：多数人写 JS 时对"代码在机器上按什么顺序执行"只有一个模糊印象。本篇的任务就是把这张地图画完整：从源码进引擎，到作用域与闭包，到原型查找，到事件循环，再到类型转换。每一段都只讲主线，深水区指向模块里的专篇。

## 第一层：源码如何变成运行中的程序

你写的 `.js` 文件并不是"解释一行跑一行"。以 V8（Chrome 与 Node 的引擎）为例，流水线大致是：

```text
源码 → 解析成 AST → Ignition 字节码 → 运行
                      ↑ 热点代码逐级升级：
          Sparkplug（基线编译）→ Maglev（中层）→ TurboFan（深度优化）
```

日常开发需要记住的只有三件事：

1. **函数声明会提升**（解析阶段就登记），`var` 声明会提升但赋值不会，`let`/`const` 有暂时性死区——这些都是解析阶段行为的副作用，不是玄学。
2. **优化是投机性的**。TurboFan 会基于"这个函数一直这么被调用"的假设深度优化，假设破产就逆优化回字节码。所以"给对象始终用相同形状"这类建议（见[调试与性能优化](/javascript/500-DebugPerformanceOptimization)）真的有影响。
3. **别猜性能，去测**。流水线每一年都在变，本篇给的是 2026 年的快照，结论的保质期有限。

严格模式（`'use strict'` 或模块代码默认开启）在这个阶段就生效：它把一批"静默失败"改成显式报错（未声明变量赋值、给不可写属性赋值、`this` 为 `undefined` 时不指向全局等）。新代码几乎总是模块或转译产物，等于默认严格模式，老代码里遇到非严格怪癖时要心里有数。

## 第二层：作用域、闭包与执行上下文

函数每次被调用都会创建一个执行上下文，里面装着局部变量与对**词法环境**的引用。关键规则只有一条：**函数能访问哪些变量，由它定义时的位置决定，与谁调用它无关**（词法作用域）。

闭包不是特殊语法，只是这条规则的必然结果：内层函数把外层的词法环境"带走"了。

```javascript
function makeCounter() {
  let n = 0;
  return () => ++n; // 返回的函数持有 makeCounter 的词法环境
}
const next = makeCounter();
next(); // 1
next(); // 2 —— n 活在闭包里
```

由此派生的经典现象：

- **循环变量**：`var i` 只有一个共享绑定，回调全部看到循环结束后的值；`let i` 每轮迭代产生新绑定，回调各拿各的。
- **this 与作用域是两套系统**：`this` 由调用方式决定（谁调用、`call`/`bind`、箭头函数捕获外层），作用域由代码位置决定。`const g = obj.greet; g()` 打印不出 `name`，不是作用域丢了，是 `this` 换了人。详见[this 关键字](/javascript/100-ThisKeywordDeepDive)与[闭包专篇](/javascript/080-FunctionScopeClosure)。

自检：能解释"闭包为什么可能造成内存泄漏"吗？（被闭包引用的大对象不会被判回收——见[内存管理](/javascript/350-MemoryManagementAndGarbageCollection)。）

## 第三层：属性访问其实是原型链查找

`obj.x` 从对象自身找，找不到就顺着 `[[Prototype]]` 往上找，直到 `null`。`class` 语法只是把"函数 + prototype 对象"这套机制包装得像类：

```javascript
class Animal {
  speak() { return '...'; }
}
const dog = new Animal();
Object.getPrototypeOf(dog) === Animal.prototype; // true
dog.speak(); // 自身没有 speak，沿原型链在 Animal.prototype 找到
```

日常开发真正要记的三条：

1. **`for...in` 会遍历原型链上的可枚举属性**；想只要自身的，用 `Object.keys` 或加 `Object.hasOwn(obj, k)` 过滤。
2. **数组也是对象**，`arr.length = 5` 会制造空洞（empty），`map` 等方法会跳过空洞——不稀奇，只是原型链上那套机制的投影。
3. **原型可被污染**：`obj.__proto__.x = ...` 会波及所有同源对象。别让用户输入变成键名后直接挂到内置对象上。深水区见[原型与继承](/javascript/180-JavaScriptPrototypeInheritance)两篇。

## 第四层：事件循环——开头那段谜题的答案

现在回填开头的输出顺序。规则主干：

1. 同步代码一口气跑完（脚本整体是一个宏任务）。
2. 跑完后清空**微任务队列**（Promise 回调、`await` 之后的续体、`queueMicrotask`）。
3. 再取下一个宏任务（`setTimeout`、I/O、渲染相关），如此往复。

对照谜题：同步部分先输出 `script start`、`async start`、`script end`（async 函数体在第一个 `await` 之前是同步执行的）；然后清微任务，`promise` 与 `async end` 依注册顺序输出；最后才是宏任务 `timeout`。`await null` 的本质就是把后续代码挂成微任务。

两张容易踩的时序细节：

- **微任务处理期间产生的微任务也在本轮清空**，可能饿死宏任务——递归 `Promise.resolve().then(...)` 是真实存在的页面卡死原因。
- **浏览器在宏任务之间可能插入渲染**，`requestAnimationFrame` 挂在渲染前而非宏任务队列；Node 则有独立的阶段划分。展开见[事件循环](/javascript/290-EventLoop)与[事件循环进阶](/javascript/300-EventLoopDetailed)。

## 第五层：类型转换——WAT 的来源

`[] + []` 为什么是空串？因为 `+` 对对象先走 `ToPrimitive`：依次尝试 `Symbol.toPrimitive`、`valueOf`、`toString`。数组没有 `valueOf` 值，落到 `toString` 得到 `''`，两个空串相加还是空串。理解了这条流程，WAT 清单就不再是背诵题：

```javascript
[] + [];          // ''        （两边都 toString 成空串）
[] + {};          // '[object Object]'
'' == 0;          // true      （== 会做数字转换）
'0' == false;     // true      （两边转数字：0 == 0）
null == 0;        // false     （null 只与 undefined 宽松相等）
NaN === NaN;      // false     （NaN 不等于任何值，包括自己）
Object.is(NaN, NaN); // true   （要判断 NaN 用它或 Number.isNaN）
typeof null;      // 'object'  （1995 年的实现 bug，改不动了）
0.1 + 0.2;        // 0.30000000000000004（IEEE 754 二进制浮点，与语言无关）
```

工程结论不是"背表"，而是三条纪律：比较一律 `===`（唯一例外 `x == null` 同时筛 null 与 undefined）；金额计算别用浮点直算（用整数分或 Decimal 类库）；判断 NaN 用 `Number.isNaN`。转换规则全文见[数据类型与运算符](/javascript/050-DataTypeOperator)。

## 把地图用起来：读诡异代码的排查顺序

遇到"输出和我想的不一样"，按本篇的层次自上而下排查，命中率很高：

1. 是不是执行顺序问题？先分同步、微任务、宏任务三栏（第四层）。
2. 是不是 `this` 或作用域问题？问"这个函数在哪定义、被谁调用"（第二层）。
3. 是不是值不对？打印类型，检查是不是隐式转换（第五层）。
4. 是不是找不到属性？打印对象与 `Object.getPrototypeOf`（第三层）。
5. 都不是，才考虑引擎层：优化逆优化、GC 时机（罕见，但真实存在，比如 TurboFan 相关的旧版 bug）。

## 坑点与自检

- `typeof NaN` 是 `'number'`；`typeof null` 是 `'object'`。两个都是历史包袱，记住即可。
- 块级作用域里的函数声明在严格与非严格模式行为不同（是否泄漏到块外），新代码避免在块里声明函数。
- `Promise` 链中任何一环抛错，都会跳到最近的 `catch`，中间的 `then` 全部跳过——错误传播是"跳站"而不是"中断进程"。
- `[] + {}` 与 `{} + []` 在控制台里结果不同（后者被当成语句块 + 一元 `+`），把表达式包进括号再试，避免控制台假象误导。

自检清单：能不看答案复述开头谜题的输出顺序吗？能说出 `==` 与 `===` 的唯一合理混用场景吗？能解释 `let i` 为什么修复了循环回调问题吗？

## 练习

1. 预测并验证：`Promise.resolve().then(() => { console.log(1); Promise.resolve().then(() => console.log(2)); }); console.log(3);` 的输出顺序，并用微任务队列解释。
2. 写一个 `sum(a)(b)(c)` 柯里化函数，要求能解释其中闭包保存了什么、`this` 是什么。
3. 用 `Object.create(null)` 创建一个"干净对象"，验证它为什么连 `toString` 都没有，并说明这对做字典用途的好处。
4. 找出你自己项目里一处 `==`，改成 `===` 并确认行为不变；再找一处 `for...in`，换成 `Object.keys`。

## 下一步

- [事件循环进阶](/javascript/300-EventLoopDetailed)：本篇第四层的完整展开，含 Node 阶段模型。
- [内存管理与垃圾回收](/javascript/350-MemoryManagementAndGarbageCollection)：闭包为什么泄漏、V8 怎么回收。
- [Proxy 与 Reflect](/javascript/330-ProxyAndReflect)：本篇只点到为止的元编程层。
- [原型链与类的本质](/javascript/190-PrototypeChainClassEssence)：第三层的深水区。
