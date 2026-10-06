---
order: 170
title: 高阶函数：把"怎么做"当成参数传
module: 'javascript'
category: 前端技术
difficulty: intermediate
description: 以「命令面板的过滤逻辑越写越像复制粘贴」为问题主线，讲透"函数是值"：把函数当参数传、当返回值还，亲手写出 find 与 once，附 fn 与 fn() 混淆、map(parseInt) 三参陷阱等调试实录。
author: fanquanpp
updated: '2026-09-28'
related:
  - 'javascript/080-FunctionScopeClosure'
  - 'javascript/090-ArrayHigherOrderMethod'
  - 'javascript/160-RecursionTailCallOptimization'
  - 'javascript/170-CurryAndFunctionComposition'
prerequisites:
  - 'javascript/080-FunctionScopeClosure'
  - 'javascript/090-ArrayHigherOrderMethod'
---

## 前置知识

- 已完成 [函数、作用域与闭包](/javascript/080-FunctionScopeClosure)：知道函数内部能"记住"定义时的变量；
- 已完成 [数组高阶方法](/javascript/090-ArrayHigherOrderMethod)：用过 `map`、`filter`、`reduce`，往里面传过回调函数。

没读过 090 也能跟，但你得会写普通函数、知道 `const fn = () => {}` 是把函数存进变量。本文不再教你"怎么用 map"，而是回答一个更底层的问题：**map 凭什么接受一个函数当参数？我自己能不能也写出这样的函数？**

## 学习目标

读完本文你将能够：

1. 说出"一等公民"的含义，并把一个函数存进变量、放进数组、当参数传、当返回值还；
2. 解释"传函数"与"调函数"的区别，一眼识别 `fn` 和 `fn()` 写混导致的高频 bug；
3. 不借助任何内置方法，亲手写出 `find2`、`map2` 这类接受回调的工具函数；
4. 写出"返回函数的函数"（如 `once`、`makeLogger`），并解释它靠闭包记住了什么；
5. 独立排查 `arr.map(parseInt)` 输出 `[NaN, 1, 2]` 这类"回调被多塞了参数"的事故。

预计 45 到 60 分钟，含 3 个动手实验与 4 道练习。

## 1. 你现在要解决什么问题

FANDEX 这个文档站有个 Ctrl+K 命令面板：按下快捷键，输入关键词，从几百篇文档里找出匹配的几篇。第一版逻辑长这样：

```javascript
const docs = [
  { title: '事件循环', category: 'async', words: 2600, updated: '2026-09-01' },
  { title: '高阶函数', category: 'basic', words: 1900, updated: '2026-08-20' },
  { title: '正则表达式', category: 'basic', words: 3300, updated: '2026-09-15' },
  // 现实里是几百条
];

// 需求一：找出所有 basic 分类的文档
const basics = [];
for (const d of docs) {
  if (d.category === 'basic') basics.push(d);
}

// 需求二：找字数超过 2000 的
const longs = [];
for (const d of docs) {
  if (d.words > 2000) longs.push(d);
}

// 需求三：找最近两周更新过的
const fresh = [];
for (const d of docs) {
  if (d.updated >= '2026-09-14') fresh.push(d);
}
```

三个循环，骨架一模一样：建个数组、遍历、判断、塞进去。唯一的差别是**那一行判断条件**。现在产品说"再加五种筛选"，你就得再复制五遍循环。复制粘贴写代码的痛，你此刻应该已经体感到了：改一处忘一处。

真正该改的只有一件事：**把"判断"这块可以替换的零件，从循环里抽出来。** 循环是死的不用换，判断是活的要换——那就让调用的人把判断"递"进来。

## 2. 先不要看解释，先试试看

在 Node 22 或浏览器控制台里逐行敲，每行先预测结果：

```javascript
function isBasic(doc) {
  return doc.category === 'basic';
}

const result = [];
for (const d of docs) {
  if (isBasic(d)) result.push(d);
}
console.log(result.length);

// 关键一步：不加括号，把函数本身存起来
const checker = isBasic;
console.log(typeof checker);
console.log(checker === isBasic);
```

第三行如果打印 `function`，恭喜——你刚刚完成了一次"函数是值"的验证：`isBasic` 和数字 `42`、字符串 `'hi'` 一样，可以被赋值、被传递。它不是某种需要"调用后才存在"的东西。

再把循环里那行判断换成变量：

```javascript
function filter2(arr, predicate) {
  const result = [];
  for (const item of arr) {
    if (predicate(item)) result.push(item);
  }
  return result;
}

const basics = filter2(docs, isBasic);
const longs = filter2(docs, (d) => d.words > 2000);
const fresh = filter2(docs, (d) => d.updated >= '2026-09-14');
```

你刚才做的事，就是内置 `Array.prototype.filter` 的原理。三个需求回到同一个循环，"每种筛选"缩成一个箭头函数。**接受函数作参数的函数，就叫高阶函数（higher-order function）。** `filter2` 是高阶函数，`isBasic` 是它收到的普通函数（回调）。

## 3. 心智模型：函数是值，调用是取值后的动作

"一等公民（first-class function）"听起来吓人，说的只有一件事：**函数和普通值地位完全相同**。能对 `42` 做的事，都能对函数做：

```javascript
// 1. 存进变量
const double = (n) => n * 2;

// 2. 放进数组、放进对象
const ops = { double, triple: (n) => n * 3 };
const pipeline = [double, (n) => n + 1];
pipeline[0](5);          // 10

// 3. 当参数传给别人（你已经天天在用）
[1, 2, 3].map(double);   // [2, 4, 6]

// 4. 当返回值还回去（下一节展开）
function makeMultiplier(k) {
  return (n) => n * k;
}
```

日常代码里你早就在消费这个能力，只是没点名：`setTimeout(callback, 100)`、`btn.addEventListener('click', handler)`、`arr.map(fn)`、Promise 的 `.then(fn)`——它们的共同点是**收下一个"还没发生、稍后替你执行"的动作**。

理解了这个模型，最高频的一类 bug 有了统一的解释。`fn` 是"这个动作本身"，`fn()` 是"现在就执行这个动作并把结果给你"。该传动作的地方传了结果，时序立刻崩：

```javascript
// 错误：立即执行，把 undefined 传给了 setTimeout
setTimeout(sayHi(), 1000);   // sayHi 立刻跑了，1 秒后什么也不发生

// 正确：把动作递过去
setTimeout(sayHi, 1000);
```

一个记忆口诀：**看见括号就是"现在执行"，没括号就是"把动作递出去"。**

## 4. 动手：把 090 学过的方法亲手造一遍

090 教过怎么"用" `map` 和 `filter`，现在反过来"造"，造过一遍，高阶函数就再也不是黑盒。逐个敲进 `mylib.js` 并运行：

```javascript
// filter2：本文第 2 节已写，跳过

// map2：对每个元素做转换，收集结果
function map2(arr, transform) {
  const result = [];
  for (const item of arr) {
    result.push(transform(item));
  }
  return result;
}

console.log(map2([1, 2, 3], (n) => n * 10));   // [10, 20, 30]

// every2：是否全部满足
function every2(arr, predicate) {
  for (const item of arr) {
    if (!predicate(item)) return false;
  }
  return true;
}

console.log(every2(docs, (d) => d.words > 0));  // true
```

注意一个细节：`map2` 和 `filter2` 对"怎么转换、怎么判断"一无所知——**知识在回调里，机制在高阶函数里**。这就是高阶函数的全部意义：把"不变的部分"（循环、收集、短路）写一次，把"会变的部分"（那行判断）交给调用方注入。

顺着这个思路，再看一个真实需求：侧边栏"新文档"角标只在页面加载时该算一次，之后无论点多少次刷新都不该重复请求。写一个 `once`：

```javascript
function once(fn) {
  let done = false;
  let cache;
  return function (...args) {
    if (done) return cache;
    done = true;
    cache = fn(...args);
    return cache;
  };
}

const init = once(() => {
  console.log('加载配置（只会打印一次）');
  return { theme: 'dark' };
});

init();
init();
init();   // 后两次：无打印，直接拿缓存
```

`once` 就是"返回函数的函数"。它返回的那个新函数，靠 080 篇讲的**闭包**记住 `done` 和 `cache` 两个私有变量——外界拿不到，改不了，只有通过调用这个函数才能触达。**高阶函数 + 闭包 = 自己造带私有状态的工具**，这套组合你后面会在防抖、节流、缓存、中间件里反复见到。

## 5. 修改实验

以下都在第 4 节代码基础上改，每个先预测再运行。

实验一：给 `once` 的返回函数加计数——第一次调用返回 `'first'`，之后返回 `'cached'`，但不再执行 `fn`。（提示：闭包里再加一个变量。）

实验二：把 `map2(docs, (d) => d.title)` 的回调改成不写 return 的单行箭头函数 `map2(docs, (d) => { d.title; })`，预测结果。（提示：大括号箭头函数必须显式 return。）

实验三：写一个 `times(n, fn)`：执行 `fn` 恰好 n 次。用它打印 3 次 `'hi'`。（提示：for 循环搬进去。）

## 6. 常见错误与调试实录

**错误一：`fn` 与 `fn()` 混淆——"怎么我的回调立刻执行了，还报 undefined"。**

```javascript
function greet(name) {
  console.log(`你好，${name}`);
}

btn.addEventListener('click', greet('阿七'));   // 错
btn.addEventListener('click', () => greet('阿七'));   // 对
```

症状：页面一加载"你好，阿七"就打印（本该点击后才打印），且控制台报 `addEventListener` 参数类型错误。定位三步：读现象——回调在绑定瞬间就跑了，说明括号写在了绑定处；验证——把 `greet('阿七')` 单独拎出来，它立刻执行并返回 `undefined`，`addEventListener` 收到的是 `undefined` 不是函数；结论——要传的是"点击后要做的事"，就包一层箭头函数把"现在"和"将来"分开。

**错误二：`arr.map(parseInt)` 输出 `[NaN, 1, 2]`。**

```javascript
['1', '2', '3'].map(parseInt);
// 预期 [1, 2, 3]，实际 [NaN, 1, 2]
```

症状：转换字符串数组时一半是 NaN。定位三步：读现象——`map` 不只传一个参数，它给回调塞了三个：`(元素, 下标, 原数组)`；验证——`parseInt('2', 1)` 按 1 进制解析得 NaN，`parseInt('3', 2)` 按 2 进制解析不出 3 得 NaN……下标 0 时 `parseInt('1', 0)` 特殊处理成十进制所以侥幸对；结论——回调对"额外参数"不设防就会被误伤。修法：

```javascript
['1', '2', '3'].map((s) => parseInt(s, 10));   // [1, 2, 3]
// 或 Number，它只认第一个参数
['1', '2', '3'].map(Number);                    // [1, 2, 3]
```

这条规则反过来也是武器：写自己的高阶函数时，想清楚"我要给回调传几个参数"，文档里写明白，调用方才敢放心传箭头函数。

**错误三：回调里丢 this——"方法一挪走，数据就没了"。**

```javascript
const cart = {
  items: ['键盘', '鼠标'],
  print() {
    console.log(`购物车有：${this.items.join('、')}`);
  },
};

cart.print();                    // 购物车有：键盘、鼠标
const p = cart.print;
p();                             // TypeError: Cannot read properties of undefined
```

症状：方法赋给变量或当回调传出后一调用就崩。定位三步：读现象——同一个函数，挂在对象上能跑，摘下来就崩，嫌疑直指 this；验证——`console.log(this)` 在两种调用方式下分别是 `cart` 和 `undefined`；结论——`obj.fn()` 的点号决定了 this，摘下来调用没人决定它。修法：优先用不依赖 this 的写法（把数据当参数传），必须保留 this 时用 `p = cart.print.bind(cart)` 或包一层 `() => cart.print()`。this 的完整规则在 [this 关键字详解](/javascript/100-ThisKeywordDeepDive) 展开，这里先建立"回调会断开 this"的条件反射。

## 7. 实际项目中的使用场景

- React 组件的全部事件处理都是高阶函数的日常：`<button onClick={() => setOpen(true)}>` 传给框架的就是一个"点击后执行"的动作，包箭头函数正是第 6 节错误一的修法；
- 命令面板的搜索管道：`docs.filter(match).sort(byFreshness).slice(0, 8)`，每个环节一个可替换的小函数——本文开头的复制粘贴循环，最终都收敛成这样的链；
- Node 与框架的中间件：Express 的 `(req, res, next) => {}` 就是一个被框架反复调用的高阶函数，Redux 中间件、Koa 洋葱模型同源；
- 初始化守卫：PWA 注册 Service Worker、埋点 SDK 初始化这类"只能做一次"的动作，用 `once` 包住比到处加 if 标志干净得多。

## 8. 小练习

预测题（5 分钟，先写答案再运行验证）：

```javascript
const calls = [];
[10, 20, 30].map((n, i, arr) => calls.push([n, i, arr.length]));
console.log(calls);
```

答案：`[[10, 0, 3], [20, 1, 3], [30, 2, 3]]`——map 确实给回调塞三个参数。

修改题（10 分钟）：把 `every2` 改造出 `some2`（只要有一个满足就返回 true，否则 false）。验收：`some2(docs, (d) => d.words > 3000)` 为 `true`；空数组 `[]` 的结果为 `false`。

修 Bug 题（15 分钟）：下面的代码想"3 秒后打印三句问候"，真实症状是三句立刻全部打印，3 秒后无事发生。定位并修复：

```javascript
const names = ['阿七', '小满', '大白'];
for (const name of names) {
  setTimeout(console.log(`你好，${name}`), 3000);
}
```

提示：第 6 节错误一。修复后进阶：如果原意是"每句间隔 1 秒"，把 3000 改成 `1000 * (names.indexOf(name) + 1)` 或用 `forEach` 带下标。

挑战题（30 分钟，脱离示例）：实现 `retry(fn, times)`：调用 `retry(fn, 3)` 返回一个新函数，新函数被调用时执行 `fn`，失败（抛错）就自动重试，最多再试 `times - 1` 次，全部失败则把最后一次的错误抛给调用方。验收：

```javascript
let attempts = 0;
const flaky = () => {
  attempts += 1;
  if (attempts < 3) throw new Error('网络抖动');
  return '成功';
};

const safeFlaky = retry(flaky, 5);
console.log(safeFlaky());            // 成功
console.log(attempts);               // 3
```

提示（思路方向）：返回函数 + 闭包计数 + try/catch。展开（关键 API）：普通函数或箭头函数均可，`try { } catch (e) { }`，抛错用 `throw`。

## 9. 与之前和之后的知识的关系

- 往前：080 篇的闭包在 `once` 里第一次"有用武之地"——不是背概念，而是造工具；090 篇的 map/filter 是"消费"高阶函数，本文是"生产"高阶函数；
- 往后：[递归与尾调用优化](/javascript/160-RecursionTailCallOptimization) 继续打磨"自己写循环工具"的能力（遍历树形结构时 for 写不动，得靠递归）；[柯里化与偏函数](/javascript/170-CurryAndFunctionComposition) 把"返回函数的函数"推到系统化：参数一次收一个、慢慢凑齐再执行。

## 10. 官方文档

- MDN 一等函数：https://developer.mozilla.org/zh-CN/docs/Glossary/First-class_Function
- MDN Function 类型：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Function
- MDN Array.prototype.map（留意回调参数）：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Array/map

## 自我检查

- 能向同事解释"一等公民"是什么，并举出日常代码里四个"把函数当值传"的例子（setTimeout、addEventListener、map、then）；
- 能解释 `filter2` 为什么对"怎么判断"一无所知还能工作，并说出"知识在回调、机制在高阶函数"这句话的含义；
- 能写出 `once` 并指出它靠闭包记住哪些变量；
- 遇到"回调立刻执行了""map 出来一堆 NaN""方法摘下来就崩"三种症状，能各自说出定位三步与修法。

## 本章总结

函数是值：能存、能传、能还。接受函数作参数的函数是高阶函数，它把"不变的机制"（循环、收集、重试）写一次，把"会变的策略"（判断、转换）交给调用方注入。`fn` 是动作本身，`fn()` 是现在执行——该传动作的地方传了结果，是时序类 bug 的最大来源。返回函数的函数靠闭包携带私有状态，`once`、防抖、节流都是这个套路。写回调要设防：内置高阶方法会多塞参数（下标、原数组），摘下来的方法会丢 this。

## 下一步

进入 [递归与尾调用优化](/javascript/160-RecursionTailCallOptimization)：数组用 for 能遍历，文档目录这种"树"用 for 会写到怀疑人生——下一站解决"自己调用自己"这件事，并顺手搞清"调用栈为什么会爆"。
