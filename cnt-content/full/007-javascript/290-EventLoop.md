---
order: 340
title: 事件循环：setTimeout(fn, 0) 为什么不是立刻执行
module: 'javascript'
category: 前端技术
difficulty: advanced
description: 以「setTimeout(fn, 0) 为什么不是立刻执行」引入事件循环心智模型：单线程与调用栈、宏任务队列与微任务队列、一次打印顺序实验讲透执行规则、微任务清到枯竭、0 毫秒的真实含义、rAF 所在一环只做预告，附微任务饿死宏任务与忙等心跳两则调试实录。
author: fanquanpp
updated: '2026-10-11'
related:
  - 'javascript/300-EventLoopDetailed'
  - 'javascript/280-AsyncConcurrencyControl'
  - 'javascript/490-DebounceThrottle'
  - 'javascript/670-WebWorkersMultithreading'
prerequisites:
  - 'javascript/250-AsyncProgramming'
---

## 前置知识

- 已完成 [异步编程入门](/javascript/250-AsyncProgramming)：会写 `setTimeout` 回调、写过 `await`。250 篇留了一个伏笔——「把延迟改成 0 毫秒，输出顺序变了吗」，本文揭晓；
- 读过 [JavaScript 概述与运行环境](/javascript/020-JavaScriptOverviewRuntimeEnv) 更好：那里说过「JS 一次只做一件事」，本文把这句话变成能推演的机制。

没学过 250 也能跟：只需要认识 `setTimeout` 与 `console.log`，Promise 出现处现场补一句。示例在 Node 21+ 与现代浏览器可原样运行。

## 学习目标

读完本文你将能够：

1. 解释 `setTimeout(fn, 0)` 为什么不是立刻执行，说出「当前任务没跑完」与「排队」两层原因；
2. 用「同步代码 → 清空微任务 → 取下一个宏任务」三步口算一段代码的打印顺序；
3. 判断一个回调属于宏任务还是微任务（setTimeout、事件回调、Promise.then、queueMicrotask、await 后续代码）；
4. 预测「微任务里再产生微任务」的执行顺序，并解释微任务为什么会把宏任务饿死；
5. 说出 requestAnimationFrame 与渲染夹在循环的哪一环，判断一段卡顿是不是长任务阻塞导致的。

预计 45 到 60 分钟。

## 1. 你现在要解决什么问题

给排行榜加个「加载完成」提示，你写了这样的代码：

```javascript
console.log('开始加载');
setTimeout(() => {
  console.log('加载完成');
}, 0);              // 0 毫秒：直觉上应该"立刻"
console.log('先渲染个骨架屏');
```

直觉说「0 毫秒就是马上」，那输出应该是：开始加载 → 加载完成 → 先渲染个骨架屏。真跑一遍：

```text
开始加载
先渲染个骨架屏
加载完成
```

延迟明明是 0，「加载完成」却排在最后。这不是 bug，也不是 setTimeout「不准时」——而是你对 JS 执行顺序的心智模型缺了一块。补上这块，就是本文的全部内容。

## 2. 心智模型：一个厨师，两张队列

先把 020 篇那句话接过来：**JS 引擎一次只执行一件事**。正在执行的东西摞在**调用栈**上（可以理解为「当前正在做的这件事的现场」，函数套函数就往上摞，做完逐层撤掉）。那么「稍后做的事」放哪？排队。而且排的是**两张不同的队**：

| 队列 | 谁会进来 | 怎么处理 |
| --- | --- | --- |
| 宏任务队列 | setTimeout/setInterval 回调、点击等事件回调、I/O 回调 | 每轮取**一个**执行 |
| 微任务队列 | Promise.then/catch/finally、queueMicrotask、await 后面的代码 | 当前任务结束后**全部清空**，清到枯竭 |

由此得出事件循环的三步口诀（渲染的事第 5 节预告）：

1. 跑完当前任务（最初是整段同步代码）；
2. 清空微任务队列：取一个、执行一个，**执行中新增的微任务也照清**，直到队列空；
3. 取下一个宏任务执行，回到第 1 步。

用食堂打比方：厨师（调用栈）一次只炒一个菜；微任务是「炒完这锅立刻要洗的锅」，锅不洗完不动下一单；宏任务是新订单，老老实实在取餐口排队。

## 3. 一次实验讲透：setTimeout 对阵 Promise.then

0 毫秒之谜说「宏任务要排队」，微任务则插在更前面。一次实验同时验证两条规则，保存为 `order.js` 运行：

```javascript
console.log('1: 同步代码');

setTimeout(() => {
  console.log('4: 宏任务，0 毫秒定时器');
}, 0);

Promise.resolve().then(() => {
  console.log('3: 微任务，then 回调');
});

console.log('2: 同步代码结束');
```

预期输出：

```text
1: 同步代码
2: 同步代码结束
3: 微任务，then 回调
4: 宏任务，0 毫秒定时器
```

按三步口诀推一遍：同步代码是「当前任务」，先跑完——所以 1、2 先出；`setTimeout(fn, 0)` 此刻只是把回调**登记**进宏任务队列队尾，并不执行；同步跑完后清微任务——3 出；最后才取下一个宏任务——4 出。**`setTimeout(fn, 0)` 的真实含义是「尽快，但至少要等当前任务跑完、微任务清空」，绝不是「现在」。**

再验证「微任务清到枯竭」这条规则——微任务执行中还能再产生微任务：

```javascript
Promise.resolve().then(() => {
  console.log('A: 第一层微任务');
  Promise.resolve().then(() => console.log('B: 第二层微任务'));
});
setTimeout(() => console.log('C: 宏任务'), 0);
console.log('同步代码');
```

预期输出：

```text
同步代码
A: 第一层微任务
B: 第二层微任务
C: 宏任务
```

A 执行时新挂的 B，**没有**等到下一轮宏任务之后，而是在同一次清空中紧跟着执行——清空是「清到枯竭」，不是「清一层」。C 是宏任务，只能等微任务彻底枯竭后才轮到。

两个真相补齐「0 毫秒」的直觉：第一，0 毫秒指**登记后最快多快可执行**，仍受三步口诀约束；第二，HTML 规范对嵌套的 setTimeout 有最小延迟钳制——同层嵌套超过 5 层后每次至少 4 毫秒，后台标签页更会被压到 1 秒以上，所以连「时间上」它也不是 0。

## 4. 判断归属：手上的回调排哪条队

口诀要能落地，得先会分类。常见来源：

```text
宏任务：setTimeout / setInterval 回调、click 等事件回调、I/O 完成回调、
        MessageChannel 消息
微任务：Promise.then / catch / finally、queueMicrotask、
        await 后面的代码（等价于 then 回调）、MutationObserver
```

最容易错的是 `await`：它**不是**暂停整个程序，`await` 之后的代码被改写成 then 回调，排进微任务队列。250 篇练习里 `await delay(0)` 后代码照样排在同步代码之后，机制就是本文这两张队。

## 5. 修改实验

以下都在第 3 节代码基础上改，每个先预测再运行。

实验一：把 `setTimeout(fn, 0)` 那行换成 `queueMicrotask(() => console.log('M: queueMicrotask'))`，预测新输出相对 3、4 的位置。（提示：来源从宏任务队列换到了微任务队列。）

实验二：在微任务回调里再挂一个 `setTimeout(() => console.log('D'), 0)`，预测 D 相对于 C 的位置。（提示：宏任务里产生的东西进不了正在进行的清空。）

实验三：把第 3 节的 `Promise.resolve().then(...)` 改写成 `async` 函数 + `await Promise.resolve()`，验证打印顺序不变——await 续体就是微任务。

## 6. 常见错误与调试实录

**错误一：以为 await 后面的代码是同步的。**

```javascript
async function main() {
  console.log('A');
  await Promise.resolve();
  console.log('B');     // 直觉：紧跟 A 执行
}

main();
console.log('C');
```

预期输出：

```text
A
C
B
```

很多人预测 A B C，因为把 await 当成「暂停函数、立即继续」。实际是：A 打印后，main 在 await 处让出，`console.log('C')` 作为当前任务的一部分先跑；B 是 await 的续体，排微任务，等当前任务结束才轮到。和 250 篇练习对照着看：那里 `delay(0)` 内部用 setTimeout，续体要等宏任务到点才入队，所以是 A B C；这里 await 的是立刻兑现的 Promise，续体当场入队，所以 C 插进来了。**await 之后的代码永远走微任务队列，但它入队的时刻取决于被等的 Promise 何时兑现。**

**错误二：微任务递归把宏任务饿死。**

```javascript
// 危险：可运行，代价是页面或进程假死，Node 下用 Ctrl+C 结束
function spin() {
  Promise.resolve().then(spin);
}

spin();
setTimeout(() => console.log('这行永远轮不到'), 0);
```

这段代码没有报错，症状是**没有任何输出、进程不退出**。定位三步：读现象——不是崩溃而是「卡住」，说明主线程在不停干活；验证——把 `Promise.resolve().then(spin)` 换成 `setTimeout(spin, 0)` 再跑，'这行永远轮不到' 能打出来，其他代码恢复呼吸；结论——then 递归让微任务队列永远清不空，三步口诀的第 2 步永不结束，第 3 步（下一个宏任务）永远轮不到。修法：需要「反复做的事」时，把递归点从微任务换成宏任务，给队列之间留出缝隙。这条规则在 300 篇会以 Node 的形式再出现一次。

## 7. 实际项目中的使用场景

- 「点了没反应」类卡顿：某个同步计算（大数组排序、几千条数据的过滤）跑了几百毫秒，期间点击回调只能排队。三步口诀告诉你出路只有两条：把长任务切成小块（每块之间让出主线程），或挪去真并行的线程——前者见 [防抖与节流](/javascript/490-DebounceThrottle) 与 300 篇的调度选型，后者见 [Web Workers 多线程](/javascript/670-WebWorkersMultithreading)；
- 框架的 nextTick：改完状态立刻读 DOM 却读到旧值，因为框架把 DOM 更新排进了微任务，你的读取要排同一轮清空——Vue/React 的更新时序都建立在这套模型上；
- Node 服务：一条同步 CPU 计算会让**所有**用户的请求排队（单线程对服务器同样成立），重计算要交给 worker 或拆片。

## 8. 小练习

预测题（5 分钟，先写答案再运行验证）：

```javascript
console.log('V');
setTimeout(() => console.log('Y'), 0);
Promise.resolve()
  .then(() => console.log('W'))
  .then(() => console.log('X'));
console.log('U');
```

答案自下而上看：`U V W X Y`。对不上就回到三步口诀，逐步写出两张队列的内容。

修改题（15 分钟）：把第 6 节错误二的 `spin` 改成「微任务做一小步工作、宏任务让出」的版本。验收：运行 3 秒后 Ctrl+C，期间 setTimeout 注册的 '这行永远轮不到' 已打印，且 process 仍在持续运转（Node 下加一句 `setInterval(() => console.log('心跳'), 500)` 验证心跳不中断）。

修 Bug 题（10 分钟）：下面的代码想每 100 毫秒打一次心跳，同时统计一批数据。真实症状：两条心跳挤在 1 秒后才一起打印，「统计完成」反而先出。按「读现象 → 用时间戳验证 → 找霸占主线程的元凶」三步定位并修复：

```javascript
const t0 = Date.now();
setInterval(() => console.log('心跳', Date.now() - t0), 100);

const start = Date.now();
while (Date.now() - start < 1000) {}   // 同步忙等 1 秒
console.log('统计完成');
```

提示：setInterval 的回调也是宏任务；忙等不是「等」，是让调用栈一直被占着。修法：去掉忙等，把统计分片或挪到 setTimeout 里。

挑战题（半小时，脱离示例）：实现两个调度函数——`nextTickForBrowser(fn)` 用微任务执行 fn，`yieldToMain(fn)` 用宏任务执行 fn。验收断言：

```javascript
const order = [];
nextTickForBrowser(() => order.push('micro'));
yieldToMain(() => order.push('macro'));
setTimeout(() => {
  console.assert(order.join() === 'micro,macro', '微任务应先于宏任务执行');
  console.log('验收通过：', order.join());
}, 0);
```

提示（思路方向）：一个用「立刻兑现的 Promise」，一个用「0 毫秒定时器」。展开（关键 API）：`Promise.resolve().then`、`setTimeout`。

## 9. 与之前和之后的知识的关系

- 往前：250 篇的「0 毫秒实验」与 `await delay(0)` 之谜在本文揭晓；020 篇的「单线程」在本文变成了调用栈加两张队列的机制；
- 往后：[事件循环深水区](/javascript/300-EventLoopDetailed) 分工明确——**290 建立心智模型，300 展开调度细节**：微任务清空时机的实证、Node 的六阶段、setImmediate 与 process.nextTick、rAF 与 requestIdleCallback 的选型、两道完整推演。还读不下去 300 也能正常写代码，但面试题和 Node 调优场景会频繁踩到它。

## 10. 官方文档

- MDN 并发模型与事件循环：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Event_loop
- MDN 微任务指南：https://developer.mozilla.org/zh-CN/docs/Web/API/HTML_DOM_API/Microtask_guide
- Node.js 官方事件循环指南：https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick

## 自我检查

- 能不看资料向同事解释 `setTimeout(fn, 0)` 为什么最后执行，并举出嵌套 5 层后至少 4 毫秒这条钳制；
- 能用三步口诀现场口算「同步 + setTimeout + Promise.then + await」混合代码的输出顺序；
- 能说出哪些 API 进宏任务队列、哪些进微任务队列，并解释 await 续体的归属；
- 能描述微任务递归饿死宏任务的症状（无报错、无输出、不退出）并给出修复方向。

## 本章总结

JS 单线程，正在执行的事占着调用栈，稍后的事排两张队：宏任务一锅一个，微任务在当前任务后清到枯竭。`setTimeout(fn, 0)` 是「尽快」，不是「立刻」——它要等当前任务跑完、微任务清空，还受嵌套钳制与后台节流；`await` 后面的代码是微任务，但入队时刻由被等的 Promise 决定。微任务递归会饿死宏任务，反复做的事要靠宏任务让出缝隙。渲染夹在微任务清空与下一个宏任务之间，rAF 排在渲染前——这一环 300 篇展开。

## 下一步

进入 [事件循环深水区](/javascript/300-EventLoopDetailed)：带着三步口诀，去看清空时机的实证、Node 的六个阶段，以及 setImmediate、nextTick、rAF、rIC 各自的排班表。
