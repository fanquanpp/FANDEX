---
order: 310
title: 事件循环深水区：清空时机、Node 六阶段与调度选型
module: 'javascript'
category: 前端技术
difficulty: advanced
description: 事件循环深水区专题：微任务每个宏任务后清空的实证、Node 事件循环六阶段（timers/pending/poll/check/close）、setImmediate 与 process.nextTick 的排班、rAF 与 rIC 调度时机对比、两道完整推演逐行给出预期输出与推导依据。
author: fanquanpp
updated: '2026-10-05'
related:
  - 'javascript/290-EventLoop'
  - 'javascript/570-NodeJsPerformanceOptimization'
  - 'javascript/510-CoreWebVitalsAndPerformanceMetrics'
  - 'javascript/670-WebWorkersMultithreading'
prerequisites:
  - 'javascript/290-EventLoop'
---

> 一句话分工：[290 篇](/javascript/290-EventLoop)建立「同步代码 → 清空微任务 → 取下一个宏任务」的心智模型；本篇展开调度细节——清空时机的实证、Node 六阶段、nextTick 与 setImmediate 的排班、rAF 与 rIC 的选型，最后用两道完整推演验收。读者画像：**已读完 290**。

## 前置知识

- 已完成 [事件循环](/javascript/290-EventLoop)：会背三步口诀，知道宏任务与微任务各收编哪些 API；本文不重复口诀本身；
- 已安装 Node.js（见 [Node.js 安装](/javascript/520-NodeJsInstall)）：一半实验要在 Node 里跑。

## 学习目标

读完本文你将能够：

1. 用「定时器里挂微任务」的实验证明微任务在每个宏任务后清空一次；
2. 默写 Node 事件循环六个阶段，说出每站执行哪类回调；
3. 解释 setImmediate 与 setTimeout(fn, 0) 在主模块顺序不定、在 I/O 回调内恒定的原因；
4. 说出 nextTick 与微任务的清空顺序，解释 nextTick 递归为什么饿死 I/O；
5. 对比 rAF 与 rIC 的调度时机，为低优先级任务选对 API，并独立推演复杂输出顺序题。

预计 60 到 75 分钟。

## 1. 清空时机的实证：微任务在每两个宏任务之间都清一次

290 篇说「当前任务跑完后清空微任务」。还有半句没验证：**每一个**宏任务之后都清，还是全部跑完统一清一次？两个定时器互证，保存为 `drain.js` 运行：

```javascript
setTimeout(() => {
  console.log('timer1');
  Promise.resolve().then(() => console.log('micro1'));
}, 0);

setTimeout(() => {
  console.log('timer2');
  Promise.resolve().then(() => console.log('micro2'));
}, 0);
```

预期输出：

```text
timer1
micro1
timer2
micro2
```

micro1 夹在两个定时器中间——清空发生在**每个宏任务之后**：timer1 跑完立刻清掉 micro1，才轮到 timer2。若是「全部宏任务跑完再清」，输出会是 timer1 timer2 micro1 micro2。（版本备注：Node 11 之前确实是后一种，11 起与浏览器对齐。）

推论：**微任务永远不会被打断**，清空途中新来的照单全收；宏任务之间留着缝隙，渲染与输入响应都靠这道缝。

## 2. Node 的事件循环：六个阶段

Node 的循环有六站，每轮按 timers → pending callbacks → idle/prepare → poll → check → close callbacks 流转，再绕回 timers：

| 阶段 | 执行什么 |
| --- | --- |
| timers | 到期的 setTimeout/setInterval 回调（最小堆维护，只会晚不会早） |
| pending callbacks | 上一轮延迟下来的系统级回调（如 TCP 连接错误） |
| idle, prepare | libuv 内部使用，开发者不接触 |
| poll | 主站：文件、网络等 I/O 回调；没事做时阻塞等新事件 |
| check | setImmediate 回调 |
| close callbacks | 连接关闭的收尾 |

每两站之间、以及每个宏任务之后，Node 都先清 nextTick 队列、再清微任务队列（第 3 节验证）。用一段代码钉死 poll 与 check 的先后，保存为 `loop.cjs` 运行（`.cjs` 保证 CommonJS，`__filename` 才存在）：

```javascript
const fs = require('node:fs');

fs.readFile(__filename, () => {
  console.log('1: I/O 回调（poll 阶段执行）');
  setTimeout(() => console.log('3: setTimeout（下一轮 timers）'), 0);
  setImmediate(() => console.log('2: setImmediate（check 阶段）'));
});
```

预期输出：

```text
1: I/O 回调（poll 阶段执行）
2: setImmediate（check 阶段）
3: setTimeout（下一轮 timers）
```

依据：I/O 回调在 poll 站执行；poll 跑完顺路进 check，setImmediate 当场执行；timers 在下一轮循环开头。**这个顺序在 I/O 回调内恒定。**对照实验：把两行挪到主模块顶层，多跑几次顺序就变——主模块执行时循环尚未进入稳定轮次，规范未定义这个顺序，不该依赖。

## 3. process.nextTick：排在微任务前面的插队者

Node 有两张高优先级队列：nextTick 队列与微任务队列，每个宏任务后**先清前者、再清后者**：

```javascript
process.nextTick(() => console.log('2: nextTick'));
Promise.resolve().then(() => console.log('3: 微任务'));
console.log('1: 同步');
```

预期输出：

```text
1: 同步
2: nextTick
3: 微任务
```

nextTick 的官方定位是「在继续 I/O 之前做完清理」，比如出错时先释放资源。但它能递归自挂——队列永远清不空，和 290 篇的微任务递归同理且更凶：这次连 poll 站的 I/O 都被饿死。官方建议改用 queueMicrotask 或拆成宏任务。

## 4. rAF 与 requestIdleCallback：渲染前后各一个排班

浏览器把渲染也编进了循环。页面可见时，一帧的排班：

```text
宏任务 → 清空微任务 → rAF 回调 → 样式 / 布局 / 绘制 → （有空闲才轮到）rIC 回调 → 下一个宏任务
```

`requestAnimationFrame`（rAF）固定在渲染前，与刷新率同步（60Hz 约 16.7ms 一帧），后台标签页自动暂停；`requestIdleCallback`（rIC）在渲染完成后**有空闲才执行**，回调拿到 deadline 对象：`timeRemaining()` 报告剩余空闲毫秒，`didTimeout` 报告是否因 timeout 选项被强制触发。在 DevTools 控制台运行：

```javascript
console.log('1: 同步');
setTimeout(() => console.log('4: 宏任务'), 0);
Promise.resolve().then(() => console.log('2: 微任务'));
requestAnimationFrame(() => console.log('3: rAF，渲染前'));
requestIdleCallback(() => console.log('5: rIC，空闲才轮到'));
```

典型输出（页面保持可见）：

```text
1: 同步
2: 微任务
3: rAF，渲染前
4: 宏任务
5: rIC，空闲才轮到
```

依据：rAF 夹在微任务清空与渲染之间，先于下一个宏任务；rIC 的位置不保证——浏览器评估完「这一帧还有没有空闲」才决定调不调，繁忙时可能推迟很久，典型落在最后但不能当承诺。选型对照：

| 维度 | requestAnimationFrame | requestIdleCallback |
| --- | --- | --- |
| 执行时机 | 每帧渲染前，与刷新率同步 | 渲染后的空闲时段 |
| 是否保证执行 | 保证（每帧一次） | 不保证，可能长期不执行 |
| 后台标签页 | 暂停 | 可能完全不执行 |
| 兜底手段 | 无 | timeout 选项到点强制触发 |
| 典型用途 | 动画、视觉更新 | 日志上报、低优先级预处理 |
| 支持范围 | 全部现代浏览器 | Chrome/Firefox（Safari 未支持） |

## 5. 两道完整推演

口诀、站牌、插队规则都齐了。两道验收题，先自己推再看表。

**题一：微任务与宏任务交错。**

```javascript
console.log('1');
setTimeout(() => {
  console.log('2');
  Promise.resolve().then(() => console.log('3'));
}, 0);
Promise.resolve().then(() => {
  console.log('4');
  setTimeout(() => console.log('5'), 0);
});
console.log('6');
```

预期输出：`1 6 4 2 3 5`。逐行依据：

| 步骤 | 发生什么 | 输出 |
| --- | --- | --- |
| 当前任务 | 同步代码跑完，then 与 timer 各自入队 | 1、6 |
| 清空微任务 | 执行 then：打印 4，timer(5) 挂进宏任务队列 | 4 |
| 取宏任务 | timer(2) 到期：打印 2，then(3) 进微任务队列 | 2 |
| 清空微任务 | 打印 3 | 3 |
| 取宏任务 | timer(5) 到期：打印 5 | 5 |

**题二：Node 全家桶。** 保存为 `trace.cjs` 运行：

```javascript
const fs = require('node:fs');

console.log('A: 同步');
process.nextTick(() => console.log('B: nextTick'));
Promise.resolve().then(() => console.log('C: 微任务'));
fs.readFile(__filename, () => {
  console.log('D: I/O 回调');
  process.nextTick(() => console.log('E: nextTick'));
  Promise.resolve().then(() => console.log('F: 微任务'));
  setImmediate(() => console.log('G: setImmediate'));
});
console.log('H: 同步结束');
```

预期输出：`A H B C D E F G`。逐行依据：

| 步骤 | 发生什么 | 输出 |
| --- | --- | --- |
| 当前任务 | 同步代码跑完；B、C 分别进 nextTick 与微任务队列 | A、H |
| 宏任务后清队列 | 先清 nextTick，再清微任务 | B、C |
| poll 阶段 | 等待期间文件读完，执行 I/O 回调：打印 D；E、F 入队，G 进 check 站 | D |
| 再次清队列 | 仍按 nextTick 优先 | E、F |
| poll 推进到 check | check 站执行 setImmediate | G |

## 6. 修改实验

以下都在本文实验基础上改，先预测再运行。

实验一：把题二的 setImmediate 挪到 fs.readFile 之前，预测 G 相对 D 的位置是否稳定，多跑几次验证。（答案：不稳定，第 2 节的结论。）

实验二：把题二里 nextTick 注册行挪到 Promise.then 之后，分别用 process.nextTick 与 queueMicrotask 跑一次，预测 E 与 F 的顺序差异。（答案：nextTick 版 E 恒在 F 前——队列优先级高于入队顺序；queueMicrotask 版 E 在 F 后——同队列按 FIFO。）

实验三：在第 4 节 rAF 注册之后插入 `const t = performance.now(); while (performance.now() - t < 300) {}`，预测 rAF 输出位置的变化。（答案：推迟到忙等结束之后——长任务挤掉了本帧的渲染机会。）

## 7. 常见错误与调试实录

**错误一：在浏览器里调 setImmediate。** 控制台真实报错：

```text
Uncaught ReferenceError: setImmediate is not defined
```

定位三步：读报错——ReferenceError 说明标识符在当前环境不存在；确认环境——setImmediate 是 Node check 站专属 API；替代——微任务用 queueMicrotask，宏任务用 setTimeout，要零延迟宏任务用 MessageChannel。

**错误二：nextTick 递归饿死 I/O。** 症状：Node 服务进程活着、CPU 有占用，但所有请求超时。定位：用 setImmediate 探针（第 9 节挑战题会写）测出事件循环延迟数百毫秒；排查发现 nextTick 自递归——队列清不空，Node 连 poll 站都进不去。修复：改 queueMicrotask 或拆成 setTimeout。

**错误三：把「顺序不定」当成环境 bug。** 现象：第 2 节的对照实验，同一份代码两次运行输出不同。验证：挪进 I/O 回调后顺序立刻恒定；结论：主模块阶段的顺序规范未定义，不稳定不是 bug，**依赖未定义顺序才是 bug**。

## 8. 实际项目中的使用场景

- Node 服务 P99 延迟抖动排查：monitorEventLoopDelay 采样事件循环延迟，高分位延迟大说明主线程被同步代码或 GC 霸占，调优路径见 [Node.js 高级特性与性能优化](/javascript/570-NodeJsPerformanceOptimization)；
- 日志与埋点上报：rIC 分批处理，配 `timeout: 2000` 兜底——空闲时才上报，不跟用户操作抢主线程；处理函数按 `deadline.timeRemaining()` 见缝插针，没处理完就再挂一轮；
- 动画与一切高频视觉更新一律 rAF，不用 `setInterval(fn, 16)`——前者与刷新率对齐且后台自动暂停，后者既不同步也照样空转。

## 9. 小练习

预测题（10 分钟，Node 运行，先写答案再验证）：

```javascript
setImmediate(() => {
  console.log('immediate');
  process.nextTick(() => console.log('nextTick-in-immediate'));
});
Promise.resolve().then(() => console.log('then'));
process.nextTick(() => console.log('nextTick'));
console.log('sync');
```

答案（自下而上看）：`sync`、`nextTick`、`then`、`immediate`、`nextTick-in-immediate`。依据：setImmediate 回调结束后同样先清 nextTick 队列、再清微任务。

挑战题（半小时，脱离示例）：写一个事件循环延迟探测器 `loopLagProbe(intervalMs)`——每个周期记下 performance.now()，下一轮 setImmediate 里算「计划时间点」与「实际执行时间点」的差值，超过 50ms 打印警告。验收清单：

1. 空载运行 3 秒，探针数值通常小于 5ms，无警告；
2. 在第 500ms 用 while 忙等 100ms，随后一次采样打印出超过 50ms 的警告；
3. 能说清差值大的原因：忙等霸占主线程，setImmediate 的回调在排队等待。

提示（思路方向）：差值 = 实际执行时刻 - 本应执行时刻；探测器是 setInterval 与 setImmediate 的接力。展开（关键 API）：setImmediate、performance.now。

## 10. 与之前和之后的知识的关系

- 往前：[290 篇](/javascript/290-EventLoop)的三步口诀是本文推演的钥匙。分工固定：290 管心智模型与口算，300 管队列细节、Node 实现与调度选型；250 篇解释了微任务从哪来；
- 往后：[前端性能指标与 Core Web Vitals](/javascript/510-CoreWebVitalsAndPerformanceMetrics) 把「长任务挤掉渲染」变成可量化指标；[Node.js 高级特性与性能优化](/javascript/570-NodeJsPerformanceOptimization) 把 monitorEventLoopDelay 用进真实服务；[Web Workers 多线程](/javascript/670-WebWorkersMultithreading) 是「挪走重计算」的完整答案。

## 11. 官方文档

- Node.js 事件循环、定时器与 process.nextTick 指南：https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick
- libuv 设计文档（六阶段的源头）：http://docs.libuv.org/en/v1.x/design.html
- MDN requestAnimationFrame：https://developer.mozilla.org/zh-CN/docs/Web/API/Window/requestAnimationFrame
- MDN requestIdleCallback：https://developer.mozilla.org/zh-CN/docs/Web/API/Window/requestIdleCallback

## 自我检查

- 能复述「微任务在每个宏任务后清空」的实证方法与结论；
- 能默写 Node 六个阶段，并解释 setImmediate 在 I/O 回调内恒先于 setTimeout(0) 的原因；
- 能推导 nextTick 与微任务的清空顺序，说出 nextTick 递归的后果与替代方案；
- 能为「动画」「日志上报」「错误清理」各选对 API，并给出调度时机依据；
- 两道推演题能不看表格逐行写出输出与依据。

## 本章总结

微任务在每个宏任务后被完整清空一次——定时器夹微任务的实验是实证，Node 11 起与浏览器一致。Node 的循环有六站：timers、pending、idle/prepare、poll、check、close；I/O 回调跑在 poll，setImmediate 跑在 check，所以 I/O 回调内 setImmediate 恒先于 setTimeout(0)，而主模块里这个顺序规范未定义、不可依赖。nextTick 先于微任务清空，能做 I/O 前的清理，递归却会连 I/O 一起饿死。浏览器侧，rAF 固定在渲染前，rIC 在渲染后的空闲时段、不保证执行、靠 timeout 兜底。口诀加站牌，两道推演题就是全部规则的验收。

## 下一步

事件循环主线到此完整。回到语言主线，进入 [迭代器辅助方法](/javascript/310-IteratorHelper)。
