---
order: 56
title: 事件循环
module: javascript
category: JavaScript
difficulty: advanced
description: JavaScript 事件循环模型——HTML 规范、Node.js 实现、微任务/宏任务、渲染调度
author: fanquanpp
updated: '2026-07-20'
related:
  - javascript/Proxy与Reflect
  - javascript/Object扩展
  - javascript/具名捕获组
  - javascript/断言
  - javascript/浏览器对象模型
prerequisites:
  - javascript/语法速查
tags:
  - EventLoop
  - Microtask
  - Macrotask
  - Node.js
  - libuv
  - HTML-Spec
  - requestAnimationFrame
  - Promise
learningObjectives:
  - '复述 HTML 规范定义的事件循环处理模型，列举任务源与任务队列'
  - '解释 JavaScript 单线程模型的设计动机与事件循环的协调机制'
  - '正确使用 setTimeout、setImmediate、queueMicrotask、requestAnimationFrame 调度任务'
  - '拆解复杂异步代码的执行顺序，预测输出（含 await、Promise、microtask）'
  - '评估浏览器与 Node.js 事件循环的差异，选择合适的调度策略'
  - '设计一个支持优先级与背压的任务调度器，集成微任务、宏任务与渲染时机'
exercises:
  - type: fill-blank
    bloom: remember
    question: "在浏览器事件循环中，每执行完一个宏任务后会清空 ______ 队列中的所有任务。"
    answer: "微任务（microtask）"
  - type: choice
    bloom: analyze
    question: "下列代码的输出顺序是？\n```javascript\nconsole.log('A');\nsetTimeout(() => console.log('B'), 0);\nPromise.resolve().then(() => console.log('C'));\nqueueMicrotask(() => console.log('D'));\nconsole.log('E');\n```"
    options:
      - "A. A B C D E"
      - "B. A E C D B"
      - "C. A E D C B"
      - "D. A E C B D"
    answer: "C"
    explanation: "同步代码先执行（A, E），然后清空微任务队列。queueMicrotask 与 Promise.then 都进入微任务队列，按入队顺序执行（D 先入队，但实际 C 是先入队，所以顺序为 C, D），然后执行宏任务 B。但题目中 queueMicrotask 在 Promise.then 之后入队，故微任务顺序为 C, D。"
  - type: code-fix
    bloom: analyze
    question: |
      以下代码预期每 100ms 输出一次心跳，但实际在长时间运行后出现严重漂移。请修复：
      ```javascript
      setInterval(() => {
        console.log('heartbeat', Date.now());
        doHeavyWork();  // 耗时 50-200ms
      }, 100);
      ```
    answer: |
      ```javascript
      // 使用递归 setTimeout 替代 setInterval，基于绝对时间补偿漂移
      let expected = performance.now() + 100;
      const tick = () => {
        const drift = performance.now() - expected;
        console.log('heartbeat', performance.now(), 'drift:', drift);
        doHeavyWork();
        expected += 100;
        // 延迟为下一周期目标时间与当前时间的差，最小为 0
        setTimeout(tick, Math.max(0, 100 - (performance.now() - expected + 100)));
      };
      setTimeout(tick, 100);
      ```
  - type: open-ended
    bloom: create
    question: "请设计一个支持任务优先级的调度器，要求：(1) 高优先级任务先于低优先级执行；(2) 同优先级按 FIFO；(3) 每帧预留 5ms 给渲染；(4) 不阻塞主线程。请描述数据结构与调度算法。"
    answer: "应包括：多优先级队列（小顶堆或链表数组）、时间预算控制（performance.now 检查）、requestAnimationFrame 钩子、可中断恢复（保存上下文）、降级到 setTimeout(0)。"
references:
  - author: [WHATWG]
    title: "HTML Living Standard - Event loops"
    journal: "Web Hypertext Application Technology Working Group"
    year: 2026
    url: "https://html.spec.whatwg.org/multipage/webappapis.html#event-loops"
  - author: [ECMA International]
    title: "ECMAScript 2026 Language Specification - Jobs and Job Queues"
    journal: "ECMA-262, 17th Edition"
    year: 2026
    url: "https://tc39.es/ecma262/#sec-jobs"
  - author: [Node.js Foundation]
    title: "Node.js Documentation - The Node.js Event Loop"
    journal: "Node.js Official Docs"
    year: 2026
    url: "https://nodejs.org/en/docs/guides/event-loop-timers-and-nexttick/"
  - author: [libuv Contributors]
    title: "libuv Design Documentation"
    journal: "libuv"
    year: 2026
    url: "http://docs.libuv.org/en/v1.x/design.html"
  - author: [Titzer, Ben L.]
    title: "Event-Loop Programming for High-Performance Network Applications"
    journal: "ACM Queue"
    year: 2019
    url: "https://queue.acm.org/detail.cfm?id=3337301"
etymology:
  term: "Event Loop"
  origin: "事件循环概念最早可追溯至 1980 年代的图形用户界面系统（如 Smalltalk-80、Mac OS Toolbox Event Manager）。在 JavaScript 中由 Brendan Eich 于 1995 年实现，借鉴了 Netscape 已有的 X Window 事件循环设计。"
lastReviewed: '2026-07-20'
reviewer: FANDEX Content Engineering Team
---

# 事件循环（Event Loop）

## 0. 导言

事件循环（Event Loop）是 JavaScript 异步编程的核心机制。它协调任务调度、I/O 处理、UI 渲染与用户交互，使单线程的 JavaScript 能够处理高并发场景而不阻塞主线程。

理解事件循环是掌握现代 JavaScript 的关键：

- Promise、async/await、Generator 的语义都建立在微任务之上
- 浏览器与 Node.js 的事件循环模型存在显著差异
- 性能优化（避免长任务、合理调度渲染）依赖对事件循环的精确理解
- 调试竞态条件、内存泄漏、死锁等问题需要还原事件循环执行轨迹

> **核心命题**：JavaScript 是单线程语言，但通过事件循环可以实现非阻塞 I/O 与高并发。这一设计源自 Brendan Eich 在 1995 年的选择——为了保证 DOM 操作的安全性，避免多线程带来的竞态问题。

---

## 1. 学习目标与认知地图

完成本章后，学习者应能够：

1. **复述**（remember）HTML 规范定义的事件循环处理模型，列举任务源与任务队列。
2. **解释**（understand）JavaScript 单线程模型的设计动机与事件循环的协调机制。
3. **应用**（apply）`setTimeout`、`setImmediate`、`queueMicrotask`、`requestAnimationFrame` 调度任务。
4. **分析**（analyze）复杂异步代码的执行顺序，预测输出（含 `await`、`Promise`、microtask）。
5. **评估**（evaluate）浏览器与 Node.js 事件循环的差异，选择合适的调度策略。
6. **设计**（create）一个支持优先级与背压的任务调度器，集成微任务、宏任务与渲染时机。

### 1.1 知识体系

```
事件循环
├── 浏览器实现
│   ├── HTML 规范处理模型
│   ├── 任务队列（task queue）
│   ├── 微任务队列（microtask queue）
│   ├── 渲染时机（rendering steps）
│   └── requestAnimationFrame / requestIdleCallback
├── Node.js 实现
│   ├── libuv 事件循环
│   ├── 六个阶段（timers/pending/idle/poll/check/close）
│   ├── process.nextTick vs Promise
│   └── setImmediate vs setTimeout(0)
├── ECMAScript 抽象
│   ├── Job Queue（NewPromiseReactionJob）
│   ├── Agent（执行代理）
│   └── Job vs Task
└── 工程实践
    ├── 长任务优化（Task Splitting）
    ├── 背压控制（Backpressure）
    ├── 调度器（Scheduler API）
    └── 调试技巧
```

---

## 2. 历史动机与技术演进

### 2.1 单线程设计的起源（1995）

Brendan Eich 在设计 JavaScript 时选择了单线程模型，主要动机包括：

| 动机 | 解释 |
| --- | --- |
| DOM 安全 | 多线程同时修改 DOM 会导致竞争条件，单线程避免锁 |
| 简化学习曲线 | 浏览器脚本作者多为非专业开发者，单线程更易理解 |
| 历史背景 | 当时 GUI 编程主流是事件驱动单线程（Mac Toolbox、Windows） |
| 性能限制 | 1995 年的 CPU 难以承担浏览器内的线程调度开销 |

### 2.2 事件循环的演化时间线

| 时间 | 事件 | 影响 |
| --- | --- | --- |
| 1983 | Smalltalk-80 引入事件循环 | 现代 GUI 事件循环鼻祖 |
| 1984 | Mac OS Toolbox Event Manager | `GetNextEvent()` 模型影响后续设计 |
| 1995-05 | Brendan Eich 实现 JavaScript | 借鉴 Netscape 已有的事件循环 |
| 1995-12 | Netscape Navigator 2.0 | `setTimeout` 作为首个异步 API |
| 2006 | jQuery 推广 Promise 模式 | 异步编程成为主流 |
| 2009 | Ryan Dahl 发布 Node.js | libuv 事件循环模型 |
| 2011 | ES6 Promise 提案进入 Stage 1 | 微任务概念成形 |
| 2015 | ES2015 标准化 Promise | 正式引入 Job Queue |
| 2017 | Node.js 11 改变微任务调度 | `nextTick` 与 `Promise` 顺序调整 |
| 2018 | requestIdleCallback 跨浏览器可用 | 空闲调度标准化 |
| 2024 | Scheduler API 进入 Stage 3 | 优先级调度即将标准化 |

### 2.3 关键人物与论文

- **Brendan Eich**：JavaScript 创始人，1995 年在 Netscape 用 10 天实现原型。
- **Ryan Dahl**：Node.js 创始人，2009 年基于 libuv 设计 Node.js 事件循环。
- **Jake Archibald**：Google Chrome 团队，2014 年 JSConf.Asia 演讲《In The Loop》成为事件循环经典讲解。
- **Anne van Kesteren**：WHATWG 编辑，主导 HTML 事件循环规范化。

> **学术溯源**：事件循环的并发模型在学术上属于"协作式多任务"（Cooperative Multitasking）与"反应器模式"（Reactor Pattern）的结合。相关经典论文：
>
> - Schmidt, D. C. (1995). *Reactor: An Object Behavioral Pattern for Concurrent Event Demultiplexing and Event Handler Dispatching*. Proceedings of the 2nd Conference on Pattern Languages of Programs (PLoP '95).
> - Pai, V. P., et al. (2007). *A Case for Event-Driven Servers in High-Performance Networking*. USENIX Annual Technical Conference.

---

## 3. 形式化定义

### 3.1 事件循环的数学模型

设 $\mathcal{T}$ 为任务集合，$\mathcal{M}$ 为微任务集合，$\mathcal{R}$ 为渲染步骤。事件循环可形式化为：

$$
\text{EventLoop} = \text{while true} \begin{cases}
1. \quad \text{task} \leftarrow \text{selectTask}(\mathcal{T}) \\
2. \quad \text{execute}(\text{task}) \\
3. \quad \textbf{while } \mathcal{M} \neq \emptyset: \\
\quad\quad \mu \leftarrow \text{dequeue}(\mathcal{M}) \\
\quad\quad \text{execute}(\mu) \\
4. \quad \textbf{if } \text{renderingOpportunity}(): \\
\quad\quad \text{render}(\mathcal{R}) \\
\end{cases}
$$

其中：

- $\text{selectTask}(\mathcal{T})$ 从任务队列按优先级选择任务（HTML 规范定义了选择算法）。
- 微任务队列在每轮宏任务后**完全清空**（drain），包括执行过程中新加入的微任务。
- $\text{renderingOpportunity}()$ 取决于屏幕刷新率、页面可见性、`display:none` 等因素。

### 3.2 ECMAScript Job 与 HTML Task 的关系

ECMAScript 规范定义了 **Job** 的抽象概念（不规定具体实现），HTML 规范将 Job 实现为 **Microtask**：

$$
\text{Job}_{\text{ECMA}} \equiv \text{Microtask}_{\text{HTML}}
$$

ECMAScript 中的 Job 主要包括：

- `NewPromiseReactionJob`：Promise 状态变化时的反应任务
- `NewPromiseResolveThenableJob`：解析 thenable 时的任务

### 3.3 任务源（Task Source）

HTML 规范定义任务按"任务源"分类，不同任务源进入不同的任务队列：

$$
\mathcal{T} = \{ Q_{\text{DOM manipulation}}, Q_{\text{user interaction}}, Q_{\text{networking}}, Q_{\text{navigation}}, Q_{\text{file timer}}, \ldots \}
$$

事件循环每轮从多个任务队列中选择一个任务（按规范定义的选择算法）。

### 3.4 Node.js 事件循环的阶段模型

Node.js 基于 libuv，事件循环分为 6 个阶段：

$$
\text{NodeLoop} = \text{while true} \begin{cases}
\text{timers}: \text{执行 setTimeout/setInterval 到期回调} \\
\text{pending callbacks}: \text{执行延迟到下一轮的 I/O 回调} \\
\text{idle, prepare}: \text{内部使用} \\
\text{poll}: \text{检索新 I/O 事件，执行 I/O 回调} \\
\text{check}: \text{执行 setImmediate 回调} \\
\text{close callbacks}: \text{执行 close 事件回调} \\
\end{cases}
$$

每个阶段之间会清空 `process.nextTick` 队列与微任务队列。

### 3.5 单线程的形式化证明

JavaScript 单线程意味着：

$$
\forall t \in \text{Time}: |\text{ActiveTask}(t)| \leq 1
$$

即任意时刻至多一个任务在执行。这一约束简化了并发模型，但要求所有 I/O 必须异步：

$$
\text{SyncIO} \Rightarrow \text{Block}(\text{EventLoop}) \Rightarrow \text{Starve}(\text{UI})
$$

---

## 4. 浏览器事件循环（HTML 规范）

### 4.1 处理模型（Processing Model）

HTML Living Standard 第 8.1.7 节定义了事件循环的完整处理模型。简化版步骤如下：

1. **选择任务**：从任务队列中选择最旧的可运行任务（按任务源优先级）。若无任务，跳到渲染步骤。
2. **执行任务**：将任务设为"当前运行中"，执行其回调。
3. **清空微任务**：循环取出微任务队列中的任务并执行，直到队列为空。
4. **更新渲染**：检查是否有渲染机会（rendering opportunity），若有则执行渲染步骤：
   - 遍历 `requestAnimationFrame` 回调队列
   - 执行布局（Layout/Reflow）
   - 执行绘制（Paint）
   - 合成（Composite）
5. **清空微任务**：rAF 回调中产生的微任务也需要清空。
6. **执行 requestIdleCallback**：如果还有空闲时间，执行 rIC 队列中的回调。
7. **回到步骤 1**。

```javascript
// 伪代码表示事件循环
while (true) {
  // 1. 选择并执行一个任务
  const task = taskQueue.shift();
  if (task) task.run();

  // 2. 清空微任务
  while (microtaskQueue.length > 0) {
    microtaskQueue.shift().run();
  }

  // 3. 检查渲染机会
  if (hasRenderingOpportunity()) {
    // 4. 执行 rAF 回调
    while (rafCallbacks.length > 0) {
      rafCallbacks.shift()(performance.now());
    }
    // 5. 渲染：布局 + 绘制 + 合成
    render();

    // 6. rAF 回调产生的微任务
    while (microtaskQueue.length > 0) {
      microtaskQueue.shift().run();
    }

    // 7. 空闲回调（如果还有时间）
    if (hasIdleTime()) {
      while (ricCallbacks.length > 0 && hasIdleTime()) {
        ricCallbacks.shift()({ didTimeout: false, timeRemaining: () => 5 });
      }
    }
  }
}
```

### 4.2 任务队列（Task Queue）

HTML 规范定义多个任务源（task source），每个任务源对应一个或多个任务队列：

| 任务源 | 示例 | 优先级 |
| --- | --- | --- |
| DOM manipulation | `MutationObserver` 回调、`Promise.then`（已废弃，移至微任务） | 中 |
| User interaction | `click`、`keydown`、`scroll` | 高 |
| Networking | `fetch` 完成、`XMLHttpRequest` 完成 | 中 |
| Navigation | `location` 变化、`history` 导航 | 高 |
| Timer | `setTimeout`、`setInterval` | 低 |
| File operations | `FileReader` 完成 | 中 |

> **关键**：HTML 规范允许浏览器在多个任务队列间自由选择，但同一队列内必须 FIFO。这意味着不同任务源的相对顺序在不同浏览器中可能不同。

### 4.3 微任务队列（Microtask Queue）

微任务（Microtask）在当前任务结束后、下一个任务前执行。微任务源包括：

- `Promise.then/catch/finally` 回调
- `queueMicrotask(fn)` 注册的回调
- `MutationObserver` 回调
- `IntersectionObserver` 回调（部分实现）
- `await` 后续代码（本质是 Promise.then）

```javascript
// 微任务演示
console.log('1: 同步');

setTimeout(() => console.log('5: 宏任务'), 0);

Promise.resolve().then(() => {
  console.log('3: 微任务');
  // 微任务中再产生微任务，仍在当前清空阶段执行
  Promise.resolve().then(() => console.log('4: 嵌套微任务'));
});

queueMicrotask(() => console.log('2: queueMicrotask'));

// 输出顺序：1 → 2 → 3 → 4 → 5
// 注意：Promise.then 与 queueMicrotask 同优先级，按 FIFO 顺序执行
```

### 4.4 微任务的优先级

HTML 规范定义微任务队列是单一 FIFO 队列，没有优先级区分。但 ECMAScript 规范允许实现有多个 Job 队列。在浏览器中：

- `Promise.then` 与 `queueMicrotask` 同优先级
- `MutationObserver` 与 `Promise` 同优先级
- 所有微任务都在当前任务后清空

在 Node.js 中情况不同（见 5.3 节）。

### 4.5 零延迟 setTimeout 的真相

```javascript
console.log('start');
setTimeout(() => console.log('timeout'), 0);
Promise.resolve().then(() => console.log('promise'));
console.log('end');

// 输出：start, end, promise, timeout
```

`setTimeout(fn, 0)` 实际并非 0ms 执行：

1. HTML 规范规定嵌套超过 5 层的 setTimeout 最小延迟为 4ms
2. 浏览器实现可能将最小延迟设为 1ms、4ms 或更高
3. 后台标签页会被节流到 1000ms
4. 即使到了时间，也需要等待当前任务与微任务完成

```javascript
// 测试 setTimeout 实际延迟
function measureTimeout() {
  const start = performance.now();
  setTimeout(() => {
    console.log(`实际延迟：${performance.now() - start}ms`);
  }, 0);
}
measureTimeout();  // 通常输出 1-4ms

// 嵌套超过 5 层后
function nested(depth) {
  if (depth >= 10) return;
  const start = performance.now();
  setTimeout(() => {
    const actual = performance.now() - start;
    console.log(`depth=${depth}, actual=${actual.toFixed(2)}ms`);
    nested(depth + 1);
  }, 0);
}
nested(0);
// 前 5 层约 0.1-1ms，第 6 层起约 4ms+
```

### 4.6 async/await 的微任务语义

`async/await` 是 Promise 的语法糖，`await` 后的代码等价于 `Promise.then`：

```javascript
async function async1() {
  console.log('async1 start');
  await async2();  // 等价于 Promise.resolve(async2()).then(() => { ... })
  console.log('async1 end');  // 微任务
}

async function async2() {
  console.log('async2');
}

console.log('script start');
setTimeout(() => console.log('setTimeout'), 0);
async1();
new Promise((resolve) => {
  console.log('promise');
  resolve();
}).then(() => console.log('promise.then'));
console.log('script end');

// 输出顺序：
// script start
// async1 start
// async2
// promise
// script end
// async1 end
// promise.then
// setTimeout
```

#### 详细执行轨迹

| 步骤 | 输出 | 任务/微任务 | 说明 |
| --- | --- | --- | --- |
| 1 | script start | 同步 | 主任务开始 |
| 2 | async1 start | 同步 | async1 函数体执行 |
| 3 | async2 | 同步 | await 调用 async2 |
| 4 | promise | 同步 | Promise 构造器执行 |
| 5 | script end | 同步 | 主任务结束 |
| 6 | async1 end | 微任务 | await 后续代码 |
| 7 | promise.then | 微任务 | then 回调 |
| 8 | setTimeout | 宏任务 | 下一轮任务 |

> **关键**：`await` 后的代码进入微任务队列，与 `Promise.then` 同优先级，按入队顺序执行。

### 4.7 await 的微任务入队时机

不同浏览器对 `await` 的实现存在细微差异：

```javascript
async function a() {
  console.log('a1');
  await Promise.resolve();
  console.log('a2');
}

async function b() {
  console.log('b1');
  await Promise.resolve();
  console.log('b2');
}

a();
b();

// V8（旧版本，<7.2）输出：a1, b1, a2, b2
// V8（新版本，>=7.2）输出：a1, b1, a2, b2
// 但中间过程不同：旧版需要 4 个微任务，新版优化为 2 个
```

V8 7.2+ 的优化（Fast Async Functions）减少了 `await` 产生的微任务数量，从 4 个降到 2 个，显著提升性能。

---

## 5. Node.js 事件循环

### 5.1 libuv 模型

Node.js 使用 libuv 作为事件循环实现，与浏览器事件循环差异显著。libuv 事件循环分为 6 个阶段：

```
┌───────────────────────────┐
│   timers (setTimeout)     │  执行到期的定时器回调
└─────────────┬─────────────┘
              ↓
┌───────────────────────────┐
│   pending callbacks       │  执行上一轮延迟的 I/O 回调
└─────────────┬─────────────┘
              ↓
┌───────────────────────────┐
│   idle, prepare           │  内部使用
└─────────────┬─────────────┘
              ↓
┌───────────────────────────┐
│   poll                    │  检索新 I/O 事件，执行回调
└─────────────┬─────────────┘
              ↓
┌───────────────────────────┐
│   check (setImmediate)    │  执行 setImmediate 回调
└─────────────┬─────────────┘
              ↓
┌───────────────────────────┐
│   close callbacks         │  执行 close 事件（如 socket.on('close'))
└───────────────────────────┘
```

### 5.2 各阶段详解

#### 5.2.1 timers 阶段

执行 `setTimeout` 与 `setInterval` 到期的回调。libuv 内部使用最小堆（min-heap）维护定时器，按到期时间排序。

```javascript
// Node.js 定时器
setTimeout(() => {
  console.log('timer');
}, 100);
```

注意：定时器的实际执行时间可能晚于设定值，因为 poll 阶段可能阻塞。

#### 5.2.2 pending callbacks 阶段

执行上一轮 poll 中因操作繁忙而被延迟的 I/O 回调，例如：

- TCP 错误回调（如 `ECONNREFUSED`）
- DNS 查询错误
- 文件系统操作的某些错误回调

#### 5.2.3 idle, prepare 阶段

libuv 内部使用，开发者通常不直接接触。

#### 5.2.4 poll 阶段

事件循环的核心阶段，执行 I/O 回调：

1. 计算阻塞超时：
   - 如果 timers 队列有任务，超时为最近的定时器到期时间
   - 否则，超时为无限（除非有 setImmediate 待执行，则超时为 0）
2. 阻塞等待 I/O 事件，直到超时或有事件到达
3. 执行所有就绪的 I/O 回调

#### 5.2.5 check 阶段

执行 `setImmediate` 回调。`setImmediate` 是 Node.js 特有 API，在当前事件循环结束后、下一个事件循环开始前执行。

```javascript
setImmediate(() => {
  console.log('immediate');
});
```

#### 5.2.6 close callbacks 阶段

执行关闭事件的回调，例如：

```javascript
const socket = new net.Socket();
socket.on('close', () => {
  console.log('socket closed');
});
socket.destroy();
```

### 5.3 process.nextTick 与微任务

`process.nextTick` 是 Node.js 特有的微任务，优先级高于 Promise：

```javascript
setImmediate(() => console.log('immediate'));
Promise.resolve().then(() => console.log('promise'));
process.nextTick(() => console.log('nextTick'));

// 输出顺序：nextTick → promise → immediate
```

#### nextTickQueue 与 microtaskQueue 的关系

Node.js 维护两个独立队列：

- `nextTickQueue`：存储 `process.nextTick` 回调
- `microtaskQueue`：存储 Promise 回调（包括 `queueMicrotask`）

在每个阶段切换时，Node.js 会清空两个队列，顺序为：

1. 清空 `nextTickQueue`
2. 清空 `microtaskQueue`

```javascript
process.nextTick(() => {
  console.log('nextTick 1');
  Promise.resolve().then(() => console.log('promise 1（在 nextTick 中）'));
});

Promise.resolve().then(() => {
  console.log('promise 2');
  process.nextTick(() => console.log('nextTick 2（在 promise 中）'));
});

// Node.js 输出：
// nextTick 1
// promise 1（在 nextTick 中）  ← 注意：这里 promise 进入微任务队列，与 promise 2 一起执行
// promise 2
// nextTick 2（在 promise 中）  ← nextTick 进入队列，下一轮清空
```

> **Node.js 11+ 的变化**：Node.js 11 起，每个宏任务执行后立即清空微任务队列（与浏览器一致）。之前是每个阶段切换时才清空。这导致一些代码行为变化：

```javascript
// Node.js 11+ 与浏览器行为一致
setTimeout(() => {
  console.log('timer1');
  Promise.resolve().then(() => console.log('promise1'));
}, 0);

setTimeout(() => {
  console.log('timer2');
  Promise.resolve().then(() => console.log('promise2'));
}, 0);

// Node.js 11+ 输出：timer1, promise1, timer2, promise2
// Node.js <11 输出：timer1, timer2, promise1, promise2
```

### 5.4 setImmediate vs setTimeout(0)

`setImmediate` 与 `setTimeout(fn, 0)` 的执行顺序取决于调用上下文：

```javascript
// 在主模块中调用，顺序不确定
setTimeout(() => console.log('timeout'), 0);
setImmediate(() => console.log('immediate'));
// 输出顺序可能为 timeout, immediate 或 immediate, timeout

// 在 I/O 回调中调用，setImmediate 总是先于 setTimeout
const fs = require('fs');
fs.readFile(__filename, () => {
  setTimeout(() => console.log('timeout'), 0);
  setImmediate(() => console.log('immediate'));
});
// 输出顺序总是：immediate, timeout
```

#### 原因分析

在 I/O 回调中，事件循环处于 poll 阶段。poll 阶段结束后，下一个阶段是 check（setImmediate），然后才是下一轮的 timers（setTimeout）。因此 setImmediate 总是先于 setTimeout 执行。

在主模块中，事件循环尚未完全启动，定时器的入队时机与事件循环的初始阶段关系不确定。

### 5.5 浏览器与 Node.js 差异对比

| 维度 | 浏览器 | Node.js |
| --- | --- | --- |
| 实现基础 | HTML 规范 | libuv |
| 任务队列数 | 多个（按任务源） | 6 个阶段 |
| 微任务队列 | 单一 | nextTick + microtask 双队列 |
| 微任务清空时机 | 每个任务后 | 每个阶段切换时（Node.js 11+ 同浏览器） |
| setImmediate | 部分支持 | 原生支持 |
| process.nextTick | 不支持 | 原生支持 |
| requestAnimationFrame | 支持 | 不支持 |
| requestIdleCallback | 支持 | 不支持 |
| I/O 模型 | OS 异步 I/O | libuv 线程池 + epoll/kqueue |
| 任务调度 | 任务源优先级 | 阶段顺序固定 |
| 渲染 | 有 | 无 |

### 5.6 微任务清空时机的演进

Node.js 微任务清空策略经历了多次调整：

| Node.js 版本 | 行为 |
| --- | --- |
| <8 | 每个阶段切换时清空 nextTick 与 microtask |
| 8-10 | 引入 `--experimental-modules`，行为基本不变 |
| 11+ | 每个宏任务后清空 microtask（与浏览器一致），但 nextTick 仍在阶段切换时清空 |
| 12+ | 完全对齐浏览器行为，nextTick 也改为每个任务后清空 |

```javascript
// 在 Node.js 11+ 中，行为与浏览器一致
async function test() {
  console.log('A');
  await Promise.resolve();
  console.log('B');
}

test();
console.log('C');

// 输出：A, C, B（与浏览器一致）
```

---

## 6. requestAnimationFrame 与 requestIdleCallback

### 6.1 渲染时机与帧率

浏览器渲染遵循屏幕刷新率，通常 60Hz（每帧约 16.67ms）。事件循环在每轮任务后检查是否有渲染机会：

```
[Task] → [Microtasks] → [rAF] → [Layout] → [Paint] → [Composite] → [rIC] → [Next Task]
```

如果任务执行时间过长，会跳过渲染机会，导致掉帧：

```
[Long Task 50ms] → [Microtasks] → [Skip Render] → [Next Task] → [Render]
                   ↑                                          ↑
                   跳过的帧                                   下一帧
```

### 6.2 requestAnimationFrame

`requestAnimationFrame`（rAF）在每次渲染前调用，常用于动画：

```javascript
let startTime = null;
function animate(timestamp) {
  if (!startTime) startTime = timestamp;
  const progress = (timestamp - startTime) / 1000;
  element.style.transform = `translateX(${progress * 300}px)`;
  if (progress < 2) {
    requestAnimationFrame(animate);
  }
}
requestAnimationFrame(animate);
```

#### rAF 的特点

- 与屏幕刷新率同步（60Hz 显示器约 16.67ms 一次）
- 后台标签页暂停（节省电量）
- 接收 `DOMHighResTimeStamp` 参数（页面加载后的毫秒数）
- 返回 ID，可通过 `cancelAnimationFrame` 取消

#### rAF 与 setTimeout 对比

```javascript
// 错误：用 setTimeout 做动画
function animateBad() {
  element.style.transform = `translateX(${x}px)`;
  x += 5;
  setTimeout(animateBad, 16);  // 不与渲染同步，可能掉帧
}

// 正确：用 rAF
function animateGood() {
  element.style.transform = `translateX(${x}px)`;
  x += 5;
  requestAnimationFrame(animateGood);  // 与渲染同步
}
```

| 维度 | setTimeout(fn, 16) | requestAnimationFrame |
| --- | --- | --- |
| 调用时机 | 定时器到期 | 渲染前 |
| 与刷新率同步 | 否 | 是 |
| 后台标签页 | 节流到 1Hz | 暂停 |
| 帧率自适应 | 否（固定 16ms） | 是（60/120/144Hz 自动） |
| 性能 | 较差 | 最优 |
| 推荐场景 | 非动画任务 | 动画、可视化 |

### 6.3 requestIdleCallback

`requestIdleCallback`（rIC）在浏览器空闲时调用，适合非紧急任务：

```javascript
// 在空闲时处理日志上报
requestIdleCallback((deadline) => {
  while (deadline.timeRemaining() > 0 && logs.length > 0) {
    const log = logs.shift();
    sendLog(log);
  }
  if (logs.length > 0) {
    requestIdleCallback(sendLogs);  // 继续下一轮
  }
});

// 设置超时（最迟 2000ms 后执行）
requestIdleCallback(processQueue, { timeout: 2000 });
```

#### deadline 对象

- `timeRemaining()`：返回当前帧剩余空闲时间（毫秒）
- `didTimeout`：是否已超时

```javascript
requestIdleCallback((deadline) => {
  // 优先处理超时任务
  if (deadline.didTimeout) {
    processUrgentTasks();
  } else {
    // 在剩余时间内处理普通任务
    while (deadline.timeRemaining() > 1 && tasks.length > 0) {
      processTask(tasks.shift());
    }
  }
});
```

#### rIC 的特点

- 不保证执行时间（依赖浏览器空闲）
- 后台标签页可能完全不执行
- 可能因超时而强制执行
- 不应在 rIC 中修改 DOM（可能触发额外布局）

### 6.4 rAF 与 rIC 的区别

| 维度 | requestAnimationFrame | requestIdleCallback |
| --- | --- | --- |
| 执行时机 | 渲染前 | 渲染后空闲时 |
| 是否保证执行 | 是（每帧一次） | 否（可能跳过） |
| 后台标签页 | 暂停 | 暂停 |
| 适用场景 | 动画、可视化 | 日志、数据预处理、低优先级任务 |
| 接收参数 | timestamp | deadline（timeRemaining, didTimeout） |
| 可设置超时 | 否 | 是 |
| 浏览器支持 | 全部 | Chrome、Firefox（Safari 不支持） |

### 6.5 帧时间预算

60Hz 显示器每帧 16.67ms，最佳实践：

- JavaScript 执行：6-8ms
- 样式计算与布局：4-5ms
- 绘制与合成：3-4ms

```javascript
// 长任务拆分
function processTasks(tasks) {
  const startTime = performance.now();
  while (tasks.length > 0) {
    const task = tasks.shift();
    task();
    // 检查是否接近帧时间预算
    if (performance.now() - startTime > 5) {
      // 让出主线程
      requestAnimationFrame(() => processTasks(tasks));
      break;
    }
  }
}
```

---

## 7. Promise 与微任务

### 7.1 Promise 的微任务语义

Promise 的 `then/catch/finally` 回调在微任务中执行：

```javascript
const promise = new Promise((resolve) => {
  console.log('executor');
  resolve();
});

promise.then(() => console.log('then'));

console.log('sync');

// 输出：executor, sync, then
```

### 7.2 Promise 链与微任务

每个 `then` 都产生一个微任务：

```javascript
Promise.resolve()
  .then(() => console.log('A'))
  .then(() => console.log('B'))
  .then(() => console.log('C'));

console.log('sync');

// 输出：sync, A, B, C
```

执行过程：

1. 第一个 `then` 注册回调 → 微任务队列：[A]
2. 同步代码执行 → 输出 `sync`
3. 清空微任务：
   - 执行 A → 输出 `A` → A 返回 Promise，触发下一个 then → 微任务队列：[B]
   - 执行 B → 输出 `B` → 微任务队列：[C]
   - 执行 C → 输出 `C`

### 7.3 Promise.resolve 的优化

```javascript
// 直接 resolve thenable
Promise.resolve().then(() => console.log('A'));

// resolve 一个 thenable
Promise.resolve(Promise.resolve()).then(() => console.log('B'));

// A 总是先于 B 执行
// 因为 resolve thenable 需要额外的微任务
```

V8 优化：当 Promise 已 resolved 时，`Promise.resolve(p)` 直接返回 `p`，避免额外微任务。

### 7.4 await 的内部机制

```javascript
async function foo() {
  console.log('foo start');
  const result = await bar();
  console.log('foo end', result);
  return result;
}

function bar() {
  console.log('bar');
  return Promise.resolve(42);
}

foo();
console.log('main end');

// 输出：foo start, bar, main end, foo end 42
```

#### V8 7.2+ 的优化

旧版 V8 中，`await` 会创建 4 个微任务：

1. 创建 Promise 包装 bar() 的返回值
2. 挂起 foo，恢复调用者
3. 解析 Promise
4. 恢复 foo

新版 V8 优化为 2 个微任务：

1. 挂起 foo，恢复调用者
2. 解析并恢复 foo

性能提升约 65%。

---

## 8. 常见陷阱与修复

### 8.1 微任务递归导致 starvation

```javascript
// 错误：微任务无限递归，宏任务永远无法执行
function recursiveMicrotask() {
  Promise.resolve().then(() => {
    console.log('microtask');
    recursiveMicrotask();  // 永不退出，UI 卡死
  });
}
recursiveMicrotask();
setTimeout(() => console.log('never'), 0);  // 永远不执行
```

修复：使用 `setTimeout` 让出控制权：

```javascript
function safeRecursive() {
  Promise.resolve().then(() => {
    console.log('microtask');
    setTimeout(safeRecursive, 0);  // 让出主线程
  });
}
```

### 8.2 setInterval 累积漂移

```javascript
// 错误：setInterval 在回调耗时长时漂移
setInterval(() => {
  doHeavyWork();  // 耗时 50-200ms
}, 100);
// 实际间隔可能变成 150-300ms

// 修复：使用递归 setTimeout + 绝对时间
let expected = Date.now() + 100;
function tick() {
  const drift = Date.now() - expected;
  doHeavyWork();
  expected += 100;
  setTimeout(tick, Math.max(0, 100 - drift));
}
setTimeout(tick, 100);
```

### 8.3 后台标签页节流

```javascript
// 错误：依赖 setInterval 在后台标签继续运行
setInterval(updateClock, 1000);
// 后台标签页节流到 1Hz，但实际可能更慢

// 修复：基于时间戳计算
let lastTime = Date.now();
setInterval(() => {
  const now = Date.now();
  const delta = now - lastTime;
  lastTime = now;
  updateClock(delta);  // 基于 delta 更新
}, 1000);

// 监听可见性变化，重新同步
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    resync();
  }
});
```

### 8.4 await 与 forEach 的陷阱

```javascript
// 错误：forEach 不等待 await
const urls = ['/a', '/b', '/c'];
urls.forEach(async (url) => {
  const data = await fetch(url);
  console.log(data);
});
console.log('done');
// 'done' 立即输出，fetch 并行执行但顺序不确定

// 修复：使用 for...of 顺序执行
for (const url of urls) {
  const data = await fetch(url);
  console.log(data);
}
console.log('done');

// 或使用 Promise.all 并行执行
await Promise.all(urls.map(async (url) => {
  const data = await fetch(url);
  console.log(data);
}));
console.log('done');
```

### 8.5 Promise 构造器中的异步操作

```javascript
// 错误：在 Promise 构造器中使用 await
const promise = new Promise(async (resolve) => {
  const data = await fetch('/api');  // 异步操作
  resolve(data);
});
// 如果 fetch 抛错，promise 不会 reject（错误被吞）

// 修复：使用 async 函数
async function fetchData() {
  const data = await fetch('/api');
  return data;
}
```

### 8.6 微任务中的异常处理

```javascript
// 错误：微任务中的异常不被 try/catch 捕获
try {
  Promise.resolve().then(() => {
    throw new Error('oops');
  });
} catch (e) {
  // 永远不会执行
  console.error(e);
}

// 修复：在 Promise 链中处理
Promise.resolve()
  .then(() => {
    throw new Error('oops');
  })
  .catch(e => console.error(e));

// 或使用全局 unhandledrejection 监听
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled rejection:', event.reason);
});
```

### 8.7 requestAnimationFrame 在 SSR 中不可用

```javascript
// 错误：SSR 中调用 rAF
function animate() {
  // ...
  requestAnimationFrame(animate);
}
animate();  // SSR 中 ReferenceError

// 修复：检查环境
const raf = typeof requestAnimationFrame !== 'undefined'
  ? requestAnimationFrame
  : (cb) => setTimeout(cb, 16);
```

### 8.8 nextTick 与 Promise 的混淆

```javascript
// Node.js 中 nextTick 优先于 Promise
process.nextTick(() => console.log('nextTick'));
Promise.resolve().then(() => console.log('promise'));
// 输出：nextTick, promise

// 浏览器中没有 nextTick
// 等价的优先级通过 Scheduler API 实现（提案中）
```

### 8.9 长任务阻塞主线程

```javascript
// 错误：同步处理 10000 条数据
function processAll(data) {
  data.forEach(item => processItem(item));  // 阻塞主线程
}

// 修复：分批处理
function processBatched(data, batchSize = 100) {
  let i = 0;
  function processChunk() {
    const end = Math.min(i + batchSize, data.length);
    for (; i < end; i++) {
      processItem(data[i]);
    }
    if (i < data.length) {
      // 让出主线程，使用 setTimeout 或 requestIdleCallback
      setTimeout(processChunk, 0);  // 或 requestIdleCallback
    }
  }
  processChunk();
}
```

### 8.10 setImmediate 在浏览器中行为不一致

```javascript
// 浏览器中 setImmediate 仅 IE/Edge 支持
// 不要在浏览器代码中使用 setImmediate
setImmediate(() => console.log('hi'));  // ReferenceError in Chrome/Firefox

// 修复：使用 MessageChannel 或 setTimeout
const channel = new MessageChannel();
channel.port1.onmessage = () => console.log('hi');
channel.port2.postMessage(null);  // 立即触发
```

---

## 9. 工程实践

### 9.1 长任务检测与拆分

```javascript
// 检测长任务（>50ms）
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.warn(`长任务：${entry.duration}ms`, entry.attribution);
  }
});
observer.observe({ entryTypes: ['longtask'] });

// 拆分长任务
async function processLargeArray(items) {
  const CHUNK_SIZE = 100;
  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const chunk = items.slice(i, i + CHUNK_SIZE);
    processChunk(chunk);
    // 每处理完一块，让出主线程
    if (i + CHUNK_SIZE < items.length) {
      await yieldToMain();
    }
  }
}

function yieldToMain() {
  return new Promise((resolve) => {
    // 优先使用 Scheduler API（如果支持）
    if ('scheduler' in window && 'postTask' in scheduler) {
      scheduler.postTask(resolve, { priority: 'user-visible' });
    } else {
      // 降级到 MessageChannel
      const channel = new MessageChannel();
      channel.port1.onmessage = resolve;
      channel.port2.postMessage(null);
    }
  });
}
```

### 9.2 优先级调度器

```javascript
class PriorityScheduler {
  constructor() {
    this.queues = {
      'user-blocking': [],   // 最高优先级
      'user-visible': [],    // 中优先级
      'background': [],      // 低优先级
    };
    this.isRunning = false;
  }

  postTask(callback, { priority = 'user-visible' } = {}) {
    return new Promise((resolve, reject) => {
      this.queues[priority].push({ callback, resolve, reject });
      this.scheduleRun();
    });
  }

  scheduleRun() {
    if (this.isRunning) return;
    this.isRunning = true;
    // 优先使用原生 Scheduler API
    if ('scheduler' in window) {
      scheduler.postTask(() => this.runNext(), { priority: 'user-blocking' });
    } else {
      // 降级：使用 MessageChannel
      const channel = new MessageChannel();
      channel.port1.onmessage = () => this.runNext();
      channel.port2.postMessage(null);
    }
  }

  runNext() {
    this.isRunning = false;
    // 按优先级顺序选择任务
    for (const priority of ['user-blocking', 'user-visible', 'background']) {
      const queue = this.queues[priority];
      if (queue.length > 0) {
        const { callback, resolve, reject } = queue.shift();
        try {
          const result = callback();
          resolve(result);
        } catch (err) {
          reject(err);
        }
        // 继续调度下一个任务
        if (this.hasTasks()) {
          this.scheduleRun();
        }
        return;
      }
    }
  }

  hasTasks() {
    return Object.values(this.queues).some(q => q.length > 0);
  }
}

// 使用
const scheduler = new PriorityScheduler();
scheduler.postTask(() => doCriticalWork(), { priority: 'user-blocking' });
scheduler.postTask(() => doNormalWork(), { priority: 'user-visible' });
scheduler.postTask(() => doBackgroundWork(), { priority: 'background' });
```

### 9.3 背压控制

```javascript
// 流式处理：基于消费者能力的背压
class BackpressureProcessor {
  constructor(concurrency = 4) {
    this.concurrency = concurrency;
    this.active = 0;
    this.queue = [];
  }

  async process(items, processor) {
    return new Promise((resolve) => {
      let index = 0;
      let completed = 0;
      const results = new Array(items.length);

      const next = () => {
        while (this.active < this.concurrency && index < items.length) {
          const currentIndex = index++;
          this.active++;

          Promise.resolve(processor(items[currentIndex]))
            .then((result) => {
              results[currentIndex] = result;
            })
            .catch((err) => {
              results[currentIndex] = { error: err };
            })
            .finally(() => {
              this.active--;
              completed++;
              if (completed === items.length) {
                resolve(results);
              } else {
                next();
              }
            });
        }
      };
      next();
    });
  }
}

// 使用
const processor = new BackpressureProcessor(4);
const results = await processor.process(urls, async (url) => {
  const response = await fetch(url);
  return response.json();
});
```

### 9.4 动画调度优化

```javascript
// 多个动画统一调度，避免多次 rAF
class AnimationScheduler {
  constructor() {
    this.callbacks = new Set();
    this.scheduled = false;
  }

  add(callback) {
    this.callbacks.add(callback);
    this.schedule();
    return () => this.callbacks.delete(callback);
  }

  schedule() {
    if (this.scheduled) return;
    this.scheduled = true;
    requestAnimationFrame((timestamp) => {
      this.scheduled = false;
      const callbacks = Array.from(this.callbacks);
      for (const cb of callbacks) {
        cb(timestamp);
      }
    });
  }
}

// 使用
const animScheduler = new AnimationScheduler();
element.addEventListener('input', () => {
  animScheduler.add((timestamp) => {
    updateProgress(timestamp);
  });
});
```

### 9.5 离线任务队列

```javascript
// Service Worker 中的后台同步
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-messages') {
    event.waitUntil(syncMessages());
  }
});

async function syncMessages() {
  const messages = await getAllPendingMessages();
  for (const message of messages) {
    try {
      await sendMessage(message);
      await markAsSent(message.id);
    } catch (err) {
      // 失败时重新注册同步
      await self.registration.sync.register('sync-messages');
      return;
    }
  }
}

// 主线程注册同步
async function registerSync() {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    const reg = await navigator.serviceWorker.ready;
    await reg.sync.register('sync-messages');
  } else {
    // 降级：在线时立即同步
    window.addEventListener('online', syncMessages);
  }
}
```

---

## 10. 案例研究

### 10.1 React Fiber 与时间切片

React 16+ 的 Fiber 架构基于事件循环实现时间切片：

```javascript
// React Fiber 简化模型
function workLoop(deadline) {
  let shouldYield = false;
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    // 检查是否需要让出主线程
    shouldYield = deadline.timeRemaining() < 1;
  }
  if (nextUnitOfWork) {
    requestIdleCallback(workLoop);
  }
}

requestIdleCallback(workLoop);
```

React 18 改用 `MessageChannel` 调度，提供更精确的时间控制：

```javascript
// React 18 Scheduler 简化
const channel = new MessageChannel();
const port = channel.port2;
channel.port1.onmessage = performWorkUntilDeadline;

function schedulePerformWork() {
  port.postMessage(null);
}

function performWorkUntilDeadline() {
  const startTime = performance.now();
  let hasMoreWork = true;
  try {
    while (hasMoreWork && !shouldYield(startTime)) {
      hasMoreWork = performWork();
    }
  } finally {
    if (hasMoreWork) {
      schedulePerformWork();
    }
  }
}

function shouldYield(startTime) {
  // 5ms 时间片
  return performance.now() - startTime > 5;
}
```

### 10.2 Vue 的 nextTick

Vue 的 `nextTick` 利用微任务实现 DOM 更新后的回调：

```javascript
// Vue 3 nextTick 实现
const resolvedPromise = Promise.resolve();
let currentFlushPromise = null;

export function nextTick(fn) {
  const p = currentFlushPromise || resolvedPromise;
  return fn ? p.then(fn) : p;
}

// 在组件更新流程中
function flushJobs() {
  // 执行所有 watcher
  // ...
  currentFlushPromise = null;
}

function queueFlush() {
  if (!currentFlushPromise) {
    currentFlushPromise = resolvedPromise.then(flushJobs);
  }
}
```

### 10.3 Node.js 的 cluster 模块

Node.js 通过 cluster 模块利用多核 CPU，每个 worker 是独立的事件循环：

```javascript
const cluster = require('cluster');
const os = require('os');

if (cluster.isPrimary) {
  const numCPUs = os.cpus().length;
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  cluster.on('exit', (worker) => {
    console.log(`Worker ${worker.process.pid} died`);
    cluster.fork();  // 重启
  });
} else {
  // 每个 worker 是独立的 Node.js 进程
  require('./server');
}
```

### 10.4 浏览器 tab 的事件循环独立性

每个浏览器标签页有独立的事件循环，但同一 origin 的多个标签可能共享 Service Worker。多标签页通信需使用 BroadcastChannel 或 postMessage。

---

## 11. 对比分析

### 11.1 不同宿主环境的事件循环对比

| 宿主 | 实现 | 微任务 | 任务队列 | 渲染 |
| --- | --- | --- | --- | --- |
| Chrome | Blink | 单队列 | 多队列 | 有 |
| Firefox | SpiderMonkey + Gecko | 单队列 | 多队列 | 有 |
| Safari | JavaScriptCore + WebKit | 单队列 | 多队列 | 有 |
| Node.js | V8 + libuv | nextTick + microtask | 6 阶段 | 无 |
| Deno | V8 + Tokio | 单队列 | 单队列 | 无 |
| Bun | JavaScriptCore | 单队列 | 单队列 | 无 |
| Web Worker | 同浏览器（无渲染） | 单队列 | 多队列 | 无 |
| Service Worker | 同浏览器（无 DOM） | 单队列 | 多队列 | 无 |

### 11.2 微任务 API 对比

| API | 浏览器 | Node.js | 优先级 |
| --- | --- | --- | --- |
| `Promise.then` | 支持 | 支持 | 微任务 |
| `queueMicrotask` | 支持 | 支持 | 微任务 |
| `MutationObserver` | 支持 | 不支持 | 微任务 |
| `process.nextTick` | 不支持 | 支持 | 高于微任务 |
| `Immediate` | 部分支持 | 支持（`setImmediate`） | 宏任务 |

### 11.3 任务调度策略对比

| 策略 | 优点 | 缺点 | 适用场景 |
| --- | --- | --- | --- |
| `setTimeout(0)` | 简单 | 4ms 延迟 | 通用 |
| `setImmediate`（Node.js） | 立即 | 仅 Node | Node.js I/O 后 |
| `MessageChannel` | 0 延迟 | 复杂 | 高性能调度 |
| `queueMicrotask` | 高优先级 | 可能 starvation | Promise 链 |
| `requestAnimationFrame` | 同步渲染 | 仅动画 | 视觉更新 |
| `requestIdleCallback` | 不阻塞 | 不保证时间 | 低优先级 |
| `postTask`（Scheduler API） | 优先级控制 | 兼容性 | 现代应用 |

### 11.4 MessageChannel vs setTimeout(0)

```javascript
// MessageChannel 延迟接近 0
function measureMessageChannel() {
  const channel = new MessageChannel();
  const start = performance.now();
  channel.port1.onmessage = () => {
    console.log(`MessageChannel: ${performance.now() - start}ms`);
  };
  channel.port2.postMessage(null);
}
measureMessageChannel();  // 通常 0.1-1ms

// setTimeout(0) 有最小延迟
function measureTimeout() {
  const start = performance.now();
  setTimeout(() => {
    console.log(`setTimeout: ${performance.now() - start}ms`);
  }, 0);
}
measureTimeout();  // 通常 1-4ms
```

| 维度 | MessageChannel | setTimeout(0) |
| --- | --- | --- |
| 最小延迟 | ~0ms | 1-4ms |
| 嵌套不受限 | 是 | 5 层后 4ms |
| 后台标签页 | 不节流 | 节流到 1Hz |
| 优先级 | 任务源：MessageChannel | 任务源：Timer |
| 复杂度 | 中 | 低 |

---

## 12. 习题

### 12.1 填空题

1. （remember）在浏览器事件循环中，每执行完一个宏任务后会清空 ______ 队列中的所有任务。
2. （understand）HTML 规范规定嵌套超过 ______ 层的 setTimeout 最小延迟为 4ms。
3. （remember）Node.js 事件循环的六个阶段依次是 timers、______、idle/prepare、______、check、close callbacks。
4. （understand）`async/await` 中 `await` 后的代码等价于 ______ 的回调，进入微任务队列。
5. （remember）`requestAnimationFrame` 在 ______ 前执行，`requestIdleCallback` 在 ______ 后执行。

### 12.2 选择题

1. （analyze）下列代码的输出顺序是？

```javascript
console.log('A');
setTimeout(() => console.log('B'), 0);
Promise.resolve().then(() => console.log('C'));
queueMicrotask(() => console.log('D'));
console.log('E');
```

- A. A B C D E
- B. A E C D B
- C. A E D C B
- D. A E C B D

答案：B

解析：同步代码先执行（A, E），然后清空微任务队列，按 FIFO 顺序执行 C（Promise.then 先入队）、D（queueMicrotask 后入队），最后执行宏任务 B。

2. （analyze）在 Node.js 中，下列代码的输出顺序是？

```javascript
setImmediate(() => console.log('immediate'));
setTimeout(() => console.log('timeout'), 0);
Promise.resolve().then(() => console.log('promise'));
process.nextTick(() => console.log('nextTick'));
```

- A. nextTick, promise, immediate, timeout
- B. nextTick, promise, timeout, immediate
- C. promise, nextTick, timeout, immediate
- D. timeout, immediate, nextTick, promise

答案：A（在大多数情况下，immediate 先于 timeout，但主模块中顺序不确定）

3. （understand）下列关于 `requestAnimationFrame` 的描述，错误的是？

- A. 与屏幕刷新率同步
- B. 后台标签页会暂停
- C. 接收时间戳参数
- D. 适合处理非紧急任务

答案：D（rAF 适合动画等视觉更新，非紧急任务应使用 rIC）

4. （evaluate）以下哪种方式最适合实现高优先级任务的立即执行？

- A. `setTimeout(fn, 0)`
- B. `Promise.resolve().then(fn)`
- C. `requestIdleCallback(fn)`
- D. `requestAnimationFrame(fn)`

答案：B（微任务优先级高于宏任务，会在当前任务后立即执行）

5. （remember）Node.js 中 `process.nextTick` 的优先级与 `Promise.then` 相比？

- A. nextTick 更高
- B. Promise.then 更高
- C. 相同
- D. 不确定

答案：A

### 12.3 代码修复题

1. （analyze）以下代码预期每 100ms 输出一次心跳，但实际在长时间运行后出现严重漂移。请修复：

```javascript
setInterval(() => {
  console.log('heartbeat', Date.now());
  doHeavyWork();  // 耗时 50-200ms
}, 100);
```

参考答案：

```javascript
// 使用递归 setTimeout 替代 setInterval，基于绝对时间补偿漂移
let expected = performance.now() + 100;
const tick = () => {
  const drift = performance.now() - expected;
  console.log('heartbeat', performance.now(), 'drift:', drift);
  doHeavyWork();
  expected += 100;
  // 延迟为下一周期目标时间与当前时间的差
  setTimeout(tick, Math.max(0, 100 - (performance.now() - expected + 100)));
};
setTimeout(tick, 100);
```

2. （evaluate）以下代码期望按顺序输出 1, 2, 3，但实际输出顺序不确定。请修复：

```javascript
const items = [1, 2, 3];
items.forEach(async (item) => {
  const result = await fetch(`/api/${item}`);
  console.log(result);
});
```

参考答案：

```javascript
// 使用 for...of 顺序执行
const items = [1, 2, 3];
for (const item of items) {
  const result = await fetch(`/api/${item}`);
  console.log(result);
}

// 或使用 Promise.all 并行执行（如果顺序不重要）
await Promise.all(items.map(async (item) => {
  const result = await fetch(`/api/${item}`);
  console.log(result);
}));
```

3. （create）实现一个支持时间切片的长任务处理器，要求：

- 每帧最多执行 5ms 任务
- 不阻塞主线程
- 支持取消

参考答案：

```javascript
class TimeSlicedProcessor {
  constructor() {
    this.cancelled = false;
  }

  async process(items, processor) {
    const CHUNK_TIME = 5;  // 每帧最多 5ms
    let i = 0;

    while (i < items.length && !this.cancelled) {
      const startTime = performance.now();
      while (i < items.length &&
             performance.now() - startTime < CHUNK_TIME &&
             !this.cancelled) {
        await processor(items[i]);
        i++;
      }
      if (i < items.length && !this.cancelled) {
        await this.yieldToMain();
      }
    }
  }

  yieldToMain() {
    return new Promise((resolve) => {
      if ('scheduler' in window) {
        scheduler.postTask(resolve, { priority: 'user-visible' });
      } else {
        const channel = new MessageChannel();
        channel.port1.onmessage = resolve;
        channel.port2.postMessage(null);
      }
    });
  }

  cancel() {
    this.cancelled = true;
  }
}

// 使用
const processor = new TimeSlicedProcessor();
processor.process(bigArray, async (item) => {
  await processItem(item);
});

// 取消
// processor.cancel();
```

### 12.4 开放式问题

1. （create）请设计一个支持任务优先级的调度器，要求：(1) 高优先级任务先于低优先级执行；(2) 同优先级按 FIFO；(3) 每帧预留 5ms 给渲染；(4) 不阻塞主线程。请描述数据结构与调度算法。

   参考要点：

   - 数据结构：多优先级队列（小顶堆或链表数组）
   - 时间预算：`performance.now()` 检查
   - 让出机制：`requestAnimationFrame` 钩子或 `MessageChannel`
   - 可中断恢复：保存任务上下文
   - 降级：`setTimeout(0)` 兜底
   - 背压：高优先级队列过长时丢弃低优先级任务

2. （evaluate）比较浏览器与 Node.js 事件循环的异同，分析为何 Node.js 需要独立的模型。

   参考要点：

   - 浏览器：面向 UI 交互，需要渲染时机
   - Node.js：面向服务器，重视 I/O 吞吐
   - 阶段模型：libuv 的 poll 阶段是核心
   - 微任务：nextTick 是 Node.js 特有需求
   - 渲染：Node.js 无需渲染
   - 多核：Node.js 通过 cluster/worker_threads 利用多核

3. （analyze）分析 `setTimeout(fn, 0)` 与 `queueMicrotask(fn)` 的本质区别，并说明何时选择哪个。

   参考要点：

   - 队列：宏任务 vs 微任务
   - 时机：下一轮 vs 当前任务后
   - 延迟：4ms（嵌套后） vs 0ms
   - starvation：微任务可能饿死宏任务
   - 选择：紧急且短小用微任务，需要让出主线程用宏任务

4. （create）设计一个支持取消与超时的 Promise 包装器。

   参考要点：

   - 使用 `AbortController` 实现取消
   - 使用 `Promise.race` 实现超时
   - 错误类型：`AbortError`、`TimeoutError`
   - 资源清理：取消后释放底层资源
   - 信号传播：嵌套调用时传递 signal

5. （evaluate）讨论事件循环模型对 JavaScript 性能调优的影响，列举至少 3 个优化策略。

   参考要点：

   - 长任务拆分：避免阻塞主线程
   - 微任务控制：避免无限递归
   - rAF 同步：动画与渲染对齐
   - rIC 利用：低优先级任务
   - 背压：避免内存溢出
   - 后台标签页：节流感知

---

## 13. 延伸阅读

### 13.1 规范文档

- WHATWG. *HTML Living Standard - Event loops*. https://html.spec.whatwg.org/multipage/webappapis.html#event-loops
- ECMA International. *ECMAScript 2026 - Jobs and Job Queues*. https://tc39.es/ecma262/#sec-jobs
- Node.js Foundation. *The Node.js Event Loop*. https://nodejs.org/en/docs/guides/event-loop-timers-and-nexttick/
- libuv. *Design Documentation*. http://docs.libuv.org/en/v1.x/design.html
- W3C. *Timing control for script-based animations*. https://www.w3.org/TR/animation-timing/

### 13.2 书籍

- Flanagan, D. (2020). *JavaScript: The Definitive Guide, 7th Edition*. O'Reilly Media. ISBN 978-1491952023.
- Richardson, L., & Ruby, S. (2007). *RESTful Web Services*. O'Reilly Media. ISBN 978-0596529260.
- Kleppmann, M. (2017). *Designing Data-Intensive Applications*. O'Reilly Media. ISBN 978-1449373320.
- Titzer, B. L. (2019). *Event-Loop Programming*. ACM Queue.

### 13.3 论文

- Schmidt, D. C. (1995). *Reactor: An Object Behavioral Pattern for Concurrent Event Demultiplexing and Event Handler Dispatching*. In *Proceedings of the 2nd Conference on Pattern Languages of Programs (PLoP '95)*. https://www.dre.vanderbilt.edu/~schmidt/PDF/Reactor.pdf

- Pai, V. P., et al. (2007). *A Case for Event-Driven Servers in High-Performance Networking*. In *USENIX Annual Technical Conference*. https://www.usenix.org/legacy/events/usenix07/tech/full_papers/pai/pai.pdf

- von Behren, R., Condit, J., & Brewer, E. (2003). *Why Events Are A Bad Idea (for high-concurrency servers)*. In *Proceedings of the 9th Workshop on Hot Topics in Operating Systems (HotOS IX)*. https://www.usenix.org/legacy/events/hotos03/tech/full_papers/vonbehren/vonbehren.pdf

- Adya, A., et al. (2002). *Cooperative Task Management Without Manual Stack Management*. In *USENIX Annual Technical Conference*. https://www.usenix.org/legacy/events/usenix02/full_papers/adya/adya.pdf

### 13.4 经典演讲

- Jake Archibald. *In The Loop*. JSConf.Asia 2014. https://www.youtube.com/watch?v=cCOL7MC4Pl0
- Philip Roberts. *What the heck is the event loop anyway?*. JSConf.EU 2014. https://www.youtube.com/watch?v=8aGhZQkoFbQ
- Erin Zimmer. *Further Adventures of the Event Loop*. JSConf.EU 2018. https://www.youtube.com/watch?v=u1kqx6Aenid

### 13.5 开源项目

- **libuv/libuv**: Node.js 事件循环底层库。https://github.com/libuv/libuv
- **nodejs/node**: Node.js 源码。https://github.com/nodejs/node
- **whatwg/html**: HTML 规范源码。https://github.com/whatwg/html
- **v8/v8**: V8 引擎源码。https://github.com/v8/v8
- **facebook/react**: React Scheduler 实现。https://github.com/facebook/react/tree/main/packages/scheduler

### 13.6 在线资源

- MDN: *Event Loop*. https://developer.mozilla.org/en-US/docs/Web/JavaScript/EventLoop
- Node.js Guides: *Don't Block the Event Loop*. https://nodejs.org/en/docs/guides/dont-block-the-event-loop/
- web.dev: *Optimize long tasks*. https://web.dev/optimize-long-tasks/
- Jake Archibald's blog: *Tasks, microtasks, queues and schedules*. https://jakearchibald.com/2015/tasks-microtasks-queues-and-schedules/

---

## 14. 附录

### 14.1 事件循环执行顺序速查

```
同步代码 → 微任务队列清空 → requestAnimationFrame → 渲染 → 微任务队列清空 → requestIdleCallback → 下一个宏任务
```

### 14.2 Node.js 阶段速查

```
timers → pending callbacks → idle/prepare → poll → check → close callbacks
                                                                  ↓
                              每个阶段切换时清空 nextTickQueue + microtaskQueue
```

### 14.3 常见 API 任务类型速查

| API | 类型 | 优先级 |
| --- | --- | --- |
| `Promise.then` | 微任务 | 中 |
| `queueMicrotask` | 微任务 | 中 |
| `MutationObserver` | 微任务 | 中 |
| `process.nextTick` | 微任务（仅 Node.js） | 高 |
| `setTimeout` | 宏任务 | 低 |
| `setInterval` | 宏任务 | 低 |
| `setImmediate`（Node.js） | 宏任务 | 中 |
| `MessageChannel` | 宏任务 | 中 |
| `requestAnimationFrame` | 渲染前 | 高 |
| `requestIdleCallback` | 空闲时 | 低 |
| `postMessage` | 宏任务 | 中 |
| `I/O` 回调 | 宏任务 | 中 |

### 14.4 性能清单

- [ ] 长任务（>50ms）已被拆分
- [ ] 动画使用 `requestAnimationFrame`
- [ ] 低优先级任务使用 `requestIdleCallback`
- [ ] 后台标签页暂停非关键定时器
- [ ] 微任务不递归调用
- [ ] `setInterval` 改为递归 `setTimeout`
- [ ] 大数据处理使用时间切片
- [ ] 监控 `unhandledrejection`
- [ ] 避免在 Promise 构造器中异步操作
- [ ] 使用 `MessageChannel` 替代 `setTimeout(0)` 实现零延迟

### 14.5 调试技巧

```javascript
// 1. 追踪任务执行顺序
const originalThen = Promise.prototype.then;
Promise.prototype.then = function (...args) {
  console.trace('Promise.then called');
  return originalThen.apply(this, args);
};

// 2. 测量微任务执行时间
const start = performance.now();
Promise.resolve().then(() => {
  console.log(`微任务延迟：${performance.now() - start}ms`);
});

// 3. 检测长任务
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.warn('长任务：', entry.duration, 'ms');
  }
});
observer.observe({ entryTypes: ['longtask'] });

// 4. 追踪 Node.js 事件循环延迟
const { performance } = require('perf_hooks');
setInterval(() => {
  const start = performance.now();
  setImmediate(() => {
    const delay = performance.now() - start;
    if (delay > 10) {
      console.warn(`事件循环延迟：${delay.toFixed(2)}ms`);
    }
  });
}, 1000);
```

### 14.6 术语表

| 术语 | 定义 |
| --- | --- |
| 事件循环（Event Loop） | 协调任务、微任务、渲染的执行机制 |
| 任务（Task） | 宏任务，由任务源调度 |
| 微任务（Microtask） | 在当前任务后立即执行的任务 |
| 任务源（Task Source） | 任务的分类，决定队列归属 |
| 渲染机会（Rendering Opportunity） | 浏览器决定是否渲染的时机 |
| 长任务（Long Task） | 执行时间超过 50ms 的任务 |
| 时间切片（Time Slicing） | 将长任务拆分为多个短任务 |
| 背压（Backpressure） | 消费者反馈给生产者的流速控制 |
| 协作式多任务（Cooperative Multitasking） | 任务主动让出 CPU 的并发模型 |
| 反应器模式（Reactor Pattern） | 事件驱动 I/O 的设计模式 |
| Job（ECMAScript） | 规范定义的抽象任务，由宿主实现为微任务 |
| Agent（ECMAScript） | 执行代理，可独立运行的逻辑单元 |
| libuv | Node.js 使用的跨平台异步 I/O 库 |
| nextTickQueue | Node.js 中存储 process.nextTick 回调的队列 |
| 帧时间预算（Frame Budget） | 单帧允许的最大执行时间（约 16.67ms） |

---

## 15. 修订日志

| 版本 | 日期 | 修订内容 | 修订人 |
| --- | --- | --- | --- |
| 1.0 | 2026-06-14 | 初始版本 | fanquanpp |
| 2.0 | 2026-07-20 | 金标准升级：新增 HTML 规范处理模型、Node.js libuv 阶段、rAF/rIC 调度、微任务优先级、案例研究（React Fiber/Vue nextTick）、习题、参考文献 | FANDEX Content Engineering Team |
