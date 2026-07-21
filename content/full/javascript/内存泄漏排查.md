---
order: 111
title: 内存泄漏排查
module: javascript
category: 'dev-lang'
difficulty: advanced
description: 'JavaScript内存泄漏排查详解：Chrome DevTools Memory面板、堆快照、分配时间线。'
author: fanquanpp
updated: '2026-06-14'
related:
  - javascript/正则表达式
  - javascript/错误边界与全局错误捕获
  - 'javascript/Web API与浏览器接口'
  - javascript/调试与性能优化
prerequisites:
  - javascript/语法速查
---

# 内存泄漏排查（Memory Leak Diagnosis）

> 本篇对标 MIT 6.031（Software Construction）、Stanford CS107（Computer Organization & Systems）与 CMU 15-213（Introduction to Computer Systems）教学水准，系统讲授 JavaScript 运行时内存模型、垃圾回收算法、泄漏分类、检测方法与工程化治理。所有数学公式使用 KaTeX 渲染，参考文献采用 ACM Reference Format。

---

## 1. 学习目标（Learning Objectives）

本节依据 Bloom 分类法（Bloom's Taxonomy，Anderson & Krathwohl, 2001）组织六层认知目标。完成本篇后，学习者应能在各认知层级达成如下目标。

### 1.1 Remember（记忆）

- **R1**：准确复述 V8 引擎的堆分区结构（Young Generation / Old Generation / Large Object Space / Code Space），列举各分区的回收算法（Scavenge / Mark-Sweep / Mark-Compact）。
- **R2**：列出 JavaScript 七种内存泄漏典型模式（意外全局变量、遗忘定时器、闭包引用、Detached DOM、事件监听器、Map/Set 无限增长、未决 Promise）。
- **R3**：背诵 Chrome DevTools Memory 面板三种分析模式（Heap Snapshot / Allocation Timeline / Allocation Sampling）的用途与开销特征。

### 1.2 Understand（理解）

- **U1**：解释 Mark-and-Sweep 算法的可达性分析（reachability analysis）原理，能引用 McCarthy 1960 年 Lisp 论文中的原始定义。
- **U2**：阐述"Shallow Size"与"Retained Size"的形式区别，能用支配树（dominator tree）表示对象保留内存。
- **U3**：推演闭包（closure）的 `[[Scope]]` 内部槽如何持有上层变量环境（Variable Environment），分析"意外捕获"的内存后果。

### 1.3 Apply（应用）

- **A1**：在 React / Vue 单页应用中正确使用 `AbortController`、`FinalizationRegistry`、`WeakRef` 清理异步资源，避免路由切换后泄漏。
- **A2**：运用 Chrome DevTools 的三快照工作流（baseline → operation → post-GC）定位 Detached DOM 泄漏，输出 Retainers 引用链。
- **A3**：实现一个基于 Puppeteer 的内存回归测试脚本，集成到 CI 流水线，对每 PR 自动检测堆增长超过阈值（如 5 MB）。

### 1.4 Analyze（分析）

- **An1**：对比 V8 的 Orinoco GC（增量标记 / 并发标记 / 并发清扫）与 SpiderMonkey 的代际 GC 在停顿时间（pause time）与吞吐量（throughput）上的权衡。
- **An2**：拆解"Detached DOM 节点为何不被回收"的根因——DOM 节点除 JS 引用外还存在 DOM 树引用，需双引用均断开。
- **An3**：解构 `WeakMap` / `WeakRef` / `FinalizationRegistry` 三种弱引用 API 在 GC 语义上的差异，分析其不可靠性（unreliability）边界。

### 1.5 Evaluate（评价）

- **E1**：评估"手动 GC 触发（`--expose-gc` + `gc()`）"在生产环境的适用性，引用 V8 团队关于"显式 GC 是反模式"的官方立场。
- **E2**：判断何时应使用 LRU 缓存替代原生 `Map`，何时应使用 `WeakMap`，给出基于引用语义的决策矩阵。
- **E3**：批判性分析"内存泄漏零容忍"政策的工程代价，引用 Wilson 1992 年《Uniprocessor Garbage Collection Techniques》的权衡论述。

### 1.6 Create（创造）

- **C1**：设计一个基于 `PerformanceObserver` 与 `Performance.measureUserAgentSpecificMemory()` 的运行时内存监控 SDK，对标 Sentry / Datadog RUM。
- **C2**：实现一个跨浏览器内存泄漏检测库，结合 MutationObserver、Performance API、堆快照自动比对，输出泄漏报告。
- **C3**：基于 WebAssembly + `SharedArrayBuffer` 设计零拷贝大数据可视化场景，分析其与 JS GC 的协同机制与泄漏风险。

---

## 2. 历史动机与发展脉络（Historical Motivation & Evolution）

### 2.1 垃圾回收的起源（1956–1960）

自动内存管理（automatic memory management）的概念由 John McCarthy 于 1959 年在 MIT 设计 Lisp 1.5 时首次系统化。McCarthy 在 1960 年的论文《Recursive Functions of Symbolic Expressions and Their Computation by Machine, Part I》中提出 Mark-and-Sweep 算法：从根集（root set）出发遍历对象图，标记所有可达对象，清扫未标记对象。

这一算法奠定了现代 GC 的基础。引用计数（reference counting，Collins 1960）作为另一种思路，由 George Collins 同年独立提出，但因无法处理循环引用而被逐步边缘化。

### 2.2 代际假说与分代收集（1980s–1990s）

1980 年代，Smalltalk-80 与 ML 语言团队观察到"多数对象朝生夕死"（weak generational hypothesis），由此发展出分代垃圾回收（generational GC）。核心思想：

- 将堆分为 Young Generation（新生代）与 Old Generation（老生代）。
- 新生代使用复制算法（copying collector，Cheney 1970），频繁回收。
- 老生代使用 Mark-Sweep / Mark-Compact，偶尔回收。

V8（2008，Lars Bak 团队）继承这一传统，将 JavaScript 堆划分为：

- **新生代**（1–8 MB）：Scavenge 算法，From / To 半区复制。
- **老生代**（700 MB – 1.4 GB）：Mark-Sweep / Mark-Compact，并发标记。
- **大对象空间**（Large Object Space）：单对象大于约 128 KB 时直接分配，含 `ArrayBuffer`、长字符串。
- **代码空间**（Code Space）：JIT 编译后的机器码。

### 2.3 浏览器时代的内存约束（1995–2010）

早期浏览器（IE 6、Netscape 4）采用引用计数，导致著名的"循环引用泄漏"：DOM 节点与 JS 闭包相互引用时，两者引用计数均不为零，永远无法回收。IE 6 在 2000 年代因 DOM 循环引用导致大规模崩溃，催生了 jQuery 的 `$.remove()` 与 `$.empty()` 的内部清理机制。

2008 年 Chrome 发布，V8 采用 Mark-Sweep 解决循环引用问题，但代价是 GC 停顿（pause）。2010 年代，V8 团队推出 Orinoco 项目，引入：

- **增量标记**（Incremental Marking，2011）：将标记阶段切片到 ~1 ms 任务，降低停顿。
- **并发标记**（Concurrent Marking，2018）：标记工作线程并行执行。
- **并发清扫**（Concurrent Sweeping，2018）：清扫阶段并行化。

### 2.4 弱引用 API 的标准化（2015–2024）

ES2015 引入 `WeakMap` / `WeakSet`，提供"键弱引用"语义。ES2021 标准化 `WeakRef` 与 `FinalizationRegistry`：

- **`WeakRef`**：对对象的弱引用，GC 后 `deref()` 返回 `undefined`。
- **`FinalizationRegistry`**：对象被 GC 后回调注册函数，用于资源清理。

截至 2024 年，所有主流浏览器（Chrome 84+ / Firefox 79+ / Safari 14.1+）均已支持。这两者填补了 JavaScript 长期缺失的"对象生命周期观察"能力，但其语义**不可靠**——回调可能不触发，可能延迟，可能并发，因此只能作为优化手段而非正确性保证。

### 2.5 跨 Realm 通信与内存共享（2017–至今）

WebAssembly、SharedArrayBuffer、OffscreenCanvas 等 API 引入了跨线程共享内存的场景。2017 年 Spectre 漏洞导致 `SharedArrayBuffer` 暂时禁用，2018 年通过 Site Isolation 恢复。共享内存场景下的 GC 治理仍是开放问题——JS 引擎的 GC 不跟踪 `SharedArrayBuffer` 的引用，需开发者手动 `detach`。

---

## 3. 形式化定义（Formal Definitions）

### 3.1 内存泄漏（Memory Leak）

**定义 3.1.1（内存泄漏）**：在程序运行时间区间 $[0, t]$ 内，若已分配内存 $M_{\text{allocated}}(t)$ 与可达内存 $M_{\text{reachable}}(t)$ 满足：

$$\exists \epsilon > 0, \quad \lim_{t \to \infty} \big( M_{\text{allocated}}(t) - M_{\text{reachable}}(t) \big) \geq \epsilon$$

即存在不可达但未回收的内存，称为内存泄漏。

**注意**：在带 GC 的语言中，"未释放"通常意味着"可达但无用"——开发者逻辑上不再需要，但引用仍存在。这称为**逻辑泄漏**（logical leak），是 JavaScript 中最常见的泄漏形式。

### 3.2 可达性（Reachability）

**定义 3.2.1（根集）**：GC 根集 $\mathcal{R}$ 包含：

- 全局对象（`globalThis` / `window` / `global`）
- 当前执行栈上的所有局部变量
- 所有 `WeakRef` 的注册表
- 浏览器宿主根（DOM 树、定时器表、事件监听器表）

**定义 3.2.2（可达对象）**：对象 $o$ 是可达的，当且仅当存在从某根 $r \in \mathcal{R}$ 到 $o$ 的引用路径：

$$\text{reachable}(o) \iff \exists r \in \mathcal{R}, \quad r \to^* o$$

其中 $\to^*$ 表示引用关系的传递闭包。

### 3.3 Shallow Size 与 Retained Size

**定义 3.3.1（Shallow Size）**：对象 $o$ 的 Shallow Size 是其自身占用的内存，不包括其引用的对象：

$$\text{shallow}(o) = \text{size of } o\text{'s own fields} + \text{object header}$$

**定义 3.3.2（Retained Size）**：对象 $o$ 的 Retained Size 是 $o$ 被回收后能释放的总内存。形式化基于支配树（dominator tree）：

$$\text{retained}(o) = \text{shallow}(o) + \sum_{o' \in \text{dominatedBy}(o)} \text{shallow}(o')$$

其中 $\text{dominatedBy}(o)$ 是支配树中 $o$ 直接支配的所有节点。支配关系定义为：$o$ 支配 $o'$ 当且仅当从根到 $o'$ 的所有路径都经过 $o$。

### 3.4 引用计数与循环引用

**定义 3.4.1（引用计数）**：对象 $o$ 的引用计数 $\text{rc}(o)$ 是指向 $o$ 的强引用数量。当 $\text{rc}(o) = 0$ 时 $o$ 可回收。

**定理 3.4.1**：纯引用计数无法回收循环引用。设对象 $a, b$ 满足 $a \to b \land b \to a$，则 $\text{rc}(a) \geq 1 \land \text{rc}(b) \geq 1$，即使外部无任何引用。

证明：循环引用使两者引用计数恒 $\geq 1$，故永不被回收。$\square$

这解释了 IE 6 时代的 DOM 循环引用泄漏，也解释了为何现代 V8 采用 Mark-Sweep 而非引用计数。

### 3.5 弱引用语义

**定义 3.5.1（弱引用）**：弱引用不参与可达性分析。对象 $o$ 仅被弱引用时，视为不可达，可被 GC 回收。

JavaScript 提供：

- `WeakMap`：键弱引用
- `WeakSet`：值弱引用
- `WeakRef`：通用对象弱引用
- `FinalizationRegistry`：对象 GC 后回调

**重要约束**：`FinalizationRegistry` 的回调是异步的、可能不触发的（GC 可能不运行）、可能乱序的。不能用于资源正确性保证（如关闭文件描述符），只能用于优化。

---

## 4. 理论推导与原理解析（Theoretical Derivation）

### 4.1 Mark-and-Sweep 的正确性

Mark-and-Sweep 算法分两阶段：

1. **标记（Mark）**：从 $\mathcal{R}$ 出发 DFS 遍历，标记所有可达对象。
2. **清扫（Sweep）**：扫描堆，回收未标记对象。

**定理 4.1.1（正确性）**：Mark-and-Sweep 不回收可达对象，回收所有不可达对象。

证明：

- **安全性**：标记阶段从根集可达的所有对象都被标记，清扫阶段仅回收未标记对象，故可达对象必不被回收。
- **完备性**：未标记对象即从根集不可达，故确为垃圾。

注意：在并发 GC 中，对象图可能变化，需读写屏障（read/write barrier）保证不变式。$\square$

### 4.2 分代假说的统计基础

**弱代际假说**（Weak Generational Hypothesis）：多数对象朝生夕死。

**强代际假说**（Strong Generational Hypothesis）：越老的对象越倾向于存活。

经验数据（Wilson & Moher 1989，Barabash et al. 2011）显示，在多数工作负载中：

$$P(\text{object dies in young gen}) \approx 90\%$$

这导致新生代使用复制算法（copying collector）高效——只需复制少数存活对象。复制算法复杂度正比于**存活对象数**而非总对象数：

$$T_{\text{copy}} = O(|S|), \quad S = \{o \mid o \text{ survives}\}$$

而 Mark-Sweep 复杂度正比于总对象数：

$$T_{\text{MS}} = O(|V| + |E|)$$

### 4.3 Scavenge 算法（Cheney's Algorithm）

V8 新生代使用 Cheney 1970 提出的复制算法。堆分为两个半区（semispace）：From 与 To。

1. 新对象分配在 From 区。
2. GC 时，从根集出发，将可达对象复制到 To 区。
3. 复制时维护转发指针（forwarding pointer）。
4. 复制完成，交换 From / To。

**复杂度**：$O(|S|)$，其中 $|S|$ 为存活对象数。

**晋升条件**：对象经历两次 Scavenge 仍存活，晋升至老生代。

### 4.4 支配树（Dominator Tree）与保留大小

Retained Size 的计算依赖支配树。支配树是对象引用图的精简：若 $o$ 支配 $o'$，则 $o$ 是从根到 $o'$ 的必经节点。

**Lengauer-Tarjan 算法**（1979）以 $O(|V| + |E| \alpha(|V|, |E|))$ 时间构造支配树，Chrome DevTools 用此计算 Retained Size。

直觉：若删除 $o$，支配树中 $o$ 的子树全部变得不可达，故 $\text{retained}(o) = \text{shallow}(o\text{'s subtree})$。

### 4.5 闭包的内存模型

JavaScript 闭包（closure）通过 `[[Environment]]` 内部槽持有上层词法环境（Lexical Environment）。考虑：

```javascript
// ES2015 — 闭包捕获
function outer() {
  const huge = new Array(1e6).fill('x');
  return function inner() {
    return huge.length;
  };
}
const fn = outer(); // huge 被闭包持有，无法 GC
```

V8 优化：仅 `inner` 实际引用的变量被捕获。但 V8 历史版本（< 8.0）有"过度捕获"问题——整个 `arguments` 与 `this` 被捕获，即使未使用。V8 8.0（2020）后引入 `escape analysis`，捕获粒度更细。

### 4.6 FinalizationRegistry 的语义

`FinalizationRegistry` 的回调在对象被 GC **后**、某个微任务边界**异步**触发。形式化：

$$\text{GC}(o) \leq_t \text{callback}(o) \leq_t \text{undefined time}$$

即回调时刻不确定，可能：

- 立即触发（下个微任务）
- 延迟很久（GC 未运行）
- 永不触发（程序结束前未 GC）

**最佳实践**：仅用于优化（如清空缓存），不可用于正确性（如释放文件句柄）。文件句柄必须用 `try/finally` 或显式 `close()`。

---

## 5. 代码示例（Production-Ready Examples）

### 5.1 工程项目配置

```json
{
  "name": "memory-leak-diagnosis",
  "version": "1.0.0",
  "type": "module",
  "engines": { "node": ">=18.0.0" },
  "scripts": {
    "start": "node src/index.js",
    "test": "node --test",
    "mem-check": "node --expose-gc scripts/memory-check.mjs"
  },
  "dependencies": {
    "puppeteer": "^22.0.0"
  }
}
```

### 5.2 意外全局变量泄漏

```javascript
// ES5 — 严格模式防止意外全局变量
'use strict';

function bad() {
  // leaked = 'data'; // 严格模式下抛 ReferenceError
  // 非严格模式下会创建 globalThis.leaked
}

function good() {
  let local = 'data';
  return local;
}

// 显式声明仍可能泄漏（小心赋值给 globalThis）
function risky() {
  globalThis.cache = new Array(1e6).fill('x'); // 显式全局，需手动清理
}

risky();
console.log(globalThis.cache.length); // 1e6
delete globalThis.cache; // 清理
```

### 5.3 遗忘定时器泄漏

```javascript
// ES2015 — setInterval 必须清理
class Poller {
  constructor() {
    this.data = null;
    this.timer = null;
  }

  start() {
    // 定时器回调闭包持有 this，间接持有 data
    this.timer = setInterval(() => {
      this.data = fetchData();
    }, 1000);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

const poller = new Poller();
poller.start();
// 使用完毕必须 stop()
poller.stop();
```

### 5.4 闭包捕获泄漏

```javascript
// ES2015 — 闭包捕获问题
function createHandler() {
  const hugeData = new Array(1e6).fill('x');

  return function handler() {
    // 只用 length，但整个 hugeData 被闭包持有
    console.log(hugeData.length);
  };
}

const handler = createHandler();
// hugeData 无法被 GC

// 修复：仅捕获必要信息
function createHandlerFixed() {
  const hugeData = new Array(1e6).fill('x');
  const length = hugeData.length; // 提取后 hugeData 可被 GC

  return function handler() {
    console.log(length);
  };
}

const handlerFixed = createHandlerFixed();
// 此时 hugeData 已可被 GC
```

### 5.5 Detached DOM 泄漏

```javascript
// ES5 — Detached DOM 节点
const detached = [];

function createAndRemove() {
  const el = document.createElement('div');
  el.textContent = 'temporary';
  document.body.appendChild(el);
  document.body.removeChild(el);
  detached.push(el); // el 已脱离 DOM，但被 detached 数组引用
}

createAndRemove();
// el 是 "Detached HTMLDivElement"，仍占内存

// 修复：不保留引用
function createAndRemoveFixed() {
  const el = document.createElement('div');
  el.textContent = 'temporary';
  document.body.appendChild(el);
  document.body.removeChild(el);
  // 不保留任何引用，el 可被 GC
}
```

### 5.6 事件监听器泄漏

```javascript
// ES5 — 重复添加监听器
function setup() {
  const btn = document.getElementById('btn');
  btn.addEventListener('click', handler); // 每次 setup() 都添加
}

function handler() {
  console.log('clicked');
}

// 多次调用 setup() 会累积监听器
setup();
setup();
setup(); // 现在有 3 个监听器

// 修复 1：先移除再添加
function setupFixed() {
  const btn = document.getElementById('btn');
  btn.removeEventListener('click', handler);
  btn.addEventListener('click', handler);
}

// 修复 2：使用 AbortController（现代方案）
const controller = new AbortController();

function setupModern() {
  const btn = document.getElementById('btn');
  btn.addEventListener('click', handler, { signal: controller.signal });
}

function teardown() {
  controller.abort(); // 一次性移除所有用此 signal 的监听器
}
```

### 5.7 Map/Set 无限增长

```javascript
// ES2015 — 缓存无限增长
class UnboundedCache {
  constructor() {
    this.cache = new Map();
  }

  get(key) {
    return this.cache.get(key);
  }

  set(key, value) {
    this.cache.set(key, value); // 无上限，持续增长
  }
}

// 修复 1：LRU 缓存
class LRUCache {
  constructor(maxSize = 100) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }

  get(key) {
    if (!this.cache.has(key)) return undefined;
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value); // 移到末尾
    return value;
  }

  set(key, value) {
    if (this.cache.has(key)) this.cache.delete(key);
    this.cache.set(key, value);
    if (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey); // 移除最久未使用
    }
  }
}

// 修复 2：WeakMap（适合键为对象，自动随键 GC）
class WeakCache {
  constructor() {
    this.cache = new WeakMap();
  }

  get(key) {
    return this.cache.get(key);
  }

  set(key, value) {
    this.cache.set(key, value); // key 被外部 GC 时自动清除
  }
}
```

### 5.8 Promise 未决泄漏

```javascript
// ES2015 — 永远 pending 的 Promise
function leakyFetch(url) {
  return new Promise((resolve, reject) => {
    fetch(url).then(resolve).catch(reject);
    // 无超时，若网络挂起则 Promise 永远 pending
  });
}

const promises = [];
for (let i = 0; i < 1000; i++) {
  promises.push(leakyFetch(`https://slow.example.com/${i}`));
}
// 1000 个永远 pending 的 Promise 占用内存

// 修复：添加超时
function fetchWithTimeout(url, timeout = 5000) {
  return Promise.race([
    fetch(url),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), timeout)
    ),
  ]);
}

// 修复：使用 AbortController
async function fetchCancellable(url, signal) {
  const res = await fetch(url, { signal });
  return res.json();
}

const controller = new AbortController();
setTimeout(() => controller.abort(), 5000);
try {
  const data = await fetchCancellable('https://slow.example.com', controller.signal);
} catch (err) {
  if (err.name === 'AbortError') {
    console.log('请求已取消');
  }
}
```

### 5.9 WeakRef + FinalizationRegistry 实战

```javascript
// ES2021 — WeakRef + FinalizationRegistry 缓存
class WeakCacheAdvanced {
  constructor() {
    this.cache = new Map();
    this.registry = new FinalizationRegistry((key) => {
      // 对象被 GC 后清理 Map 中的弱引用
      const ref = this.cache.get(key);
      if (ref && !ref.deref()) {
        this.cache.delete(key);
      }
    });
  }

  get(key, factory) {
    const ref = this.cache.get(key);
    if (ref) {
      const value = ref.deref();
      if (value) return value; // 仍存活
    }

    const value = factory();
    this.cache.set(key, new WeakRef(value));
    this.registry.register(value, key);
    return value;
  }
}

// 注意：FinalizationRegistry 回调可能不触发，不可依赖其正确性
// 仅作为优化手段
```

### 5.10 Puppeteer 内存回归测试

```javascript
// ES2017 — Puppeteer 内存回归测试
import puppeteer from 'puppeteer';

async function testMemoryLeak() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--js-flags=--expose-gc'],
  });
  const page = await browser.newPage();

  await page.goto('http://localhost:3000');

  // 强制 GC 获取基线
  await page.evaluate(() => gc());
  const baseline = await page.metrics();
  const baselineHeap = baseline.JSHeapUsedSize;

  // 模拟用户操作
  for (let i = 0; i < 100; i++) {
    await page.click('#add-item');
    await page.waitForTimeout(50);
  }

  // 操作完成后强制 GC
  await page.evaluate(() => gc());
  const after = await page.metrics();
  const afterHeap = after.JSHeapUsedSize;

  const growth = afterHeap - baselineHeap;
  const growthMB = growth / 1024 / 1024;

  console.log(`Baseline: ${(baselineHeap / 1024 / 1024).toFixed(2)} MB`);
  console.log(`After:    ${(afterHeap / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Growth:   ${growthMB.toFixed(2)} MB`);

  // 阈值判定（5 MB）
  const THRESHOLD = 5 * 1024 * 1024;
  if (growth > THRESHOLD) {
    console.error(`内存泄漏：增长 ${growthMB.toFixed(2)} MB 超过阈值 5 MB`);
    await browser.close();
    process.exit(1);
  }

  await browser.close();
  console.log('内存测试通过');
}

testMemoryLeak().catch(console.error);
```

### 5.11 Node.js 内存监控

```javascript
// ES2015 — Node.js 内存监控
// 启动: node --expose-gc app.js

function checkMemory() {
  if (global.gc) global.gc();
  const used = process.memoryUsage();
  return {
    rss: (used.rss / 1024 / 1024).toFixed(2),
    heapTotal: (used.heapTotal / 1024 / 1024).toFixed(2),
    heapUsed: (used.heapUsed / 1024 / 1024).toFixed(2),
    external: (used.external / 1024 / 1024).toFixed(2),
    arrayBuffers: (used.arrayBuffers / 1024 / 1024).toFixed(2),
  };
}

// 定时监控
setInterval(() => {
  const mem = checkMemory();
  console.log(`[Memory] rss=${mem.rss}MB heap=${mem.heapUsed}/${mem.heapTotal}MB external=${mem.external}MB`);
}, 10000);

// 内存阈值告警
const MEMORY_LIMIT = 500 * 1024 * 1024; // 500 MB
setInterval(() => {
  const used = process.memoryUsage().heapUsed;
  if (used > MEMORY_LIMIT) {
    console.error(`内存告警：heap used ${used / 1024 / 1024} MB 超过 ${MEMORY_LIMIT / 1024 / 1024} MB`);
    // 可触发堆快照供事后分析
    if (global.gc) global.gc();
  }
}, 5000);
```

### 5.12 堆快照编程式生成

```javascript
// ES2015 — Node.js 编程式堆快照
import v8 from 'v8';
import fs from 'fs';
import path from 'path';

function dumpHeapSnapshot(label = 'snapshot') {
  const snapshot = v8.getHeapSnapshot();
  const fileName = `heap-${label}-${Date.now()}.heapsnapshot`;
  const filePath = path.join(process.cwd(), 'snapshots', fileName);

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const fileStream = fs.createWriteStream(filePath);
  snapshot.pipe(fileStream);

  console.log(`堆快照已保存: ${filePath}`);
  return filePath;
}

// 定时快照
setInterval(() => {
  dumpHeapSnapshot('periodic');
}, 60000);

// 内存增长超阈值时快照
const baseline = process.memoryUsage().heapUsed;
setInterval(() => {
  const current = process.memoryUsage().heapUsed;
  if (current > baseline * 2) {
    dumpHeapSnapshot('leak-suspect');
  }
}, 10000);
```

---

## 6. 对比分析（Comparative Analysis）

### 6.1 JavaScript vs TypeScript

| 维度 | JavaScript | TypeScript |
| --- | --- | --- |
| 类型系统 | 动态类型 | 静态类型 |
| 编译期检测 | 无 | 可检测部分泄漏（如未释放资源） |
| `IDisposable` 接口 | 无（需手动实现） | 可用 `interface IDisposable { dispose(): void }` 模拟 |
| `using` 关键字 | 无 | TC39 Stage 2（Explicit Resource Management） |
| WeakRef 类型 | `WeakRef<T>` | `WeakRef<T>`（需类型参数） |
| FinalizationRegistry | `FinalizationRegistry<T>` | 同左，类型化回调 |

TypeScript 在编译期可借助 `using` 提案（TC39 Stage 2，2024）实现 RAII 模式：

```typescript
// TypeScript 5.2+ — using 关键字（TC39 Explicit Resource Management）
class DatabaseConnection implements Disposable {
  constructor(private conn: any) {}

  [Symbol.dispose]() {
    this.conn.close();
  }
}

async function query() {
  using conn = new DatabaseConnection(openConn());
  // 函数退出时自动调用 conn[Symbol.dispose]()
  return conn.query('SELECT * FROM users');
}
```

JavaScript 等价方案需手动 `try/finally`：

```javascript
// ES2015 — 手动 try/finally
function withConnection(conn, fn) {
  try {
    return fn(conn);
  } finally {
    conn.close();
  }
}
```

### 6.2 JavaScript vs Python

| 维度 | JavaScript | Python |
| --- | --- | --- |
| GC 算法 | Mark-Sweep（V8） | 引用计数 + 分代 GC |
| 循环引用 | 自动处理 | 需 `gc` 模块辅助 |
| 弱引用 | `WeakRef` / `WeakMap` | `weakref.ref` / `weakref.WeakKeyDictionary` |
| 上下文管理器 | `try/finally` | `with` 语句 |
| `__del__` 析构 | `FinalizationRegistry`（不可靠） | `__del__`（CPython 引用计数归零时调用） |
| 引用计数实时性 | 不实时 | CPython 实时（但循环引用需 GC） |

Python 的引用计数在 CPython 中实时触发，资源释放更确定，但循环引用需依赖 `gc` 模块周期性回收。

### 6.3 JavaScript vs Rust

| 维度 | JavaScript | Rust |
| --- | --- | --- |
| 内存管理 | GC | 所有权（ownership）+ 借用检查（borrow checker） |
| 内存泄漏可能性 | 可能（逻辑泄漏） | 极少（编译期保证），但 `Rc` / `Arc` 循环引用仍可能泄漏 |
| 弱引用 | `WeakRef` | `Weak<T>`（`Rc` / `Arc` 的弱引用） |
| 资源释放 | `try/finally` 或 `FinalizationRegistry` | `Drop` trait，作用域退出时确定性调用 |
| 性能开销 | GC 停顿 | 零运行时开销 |

Rust 的所有权模型在编译期保证内存安全，无 GC 停顿，但学习曲线陡峭。`Rc::new` + `Rc::clone` 形成的循环引用仍会泄漏，需用 `Weak<T>` 打破环。

### 6.4 JavaScript vs WebAssembly

| 维度 | JavaScript | WebAssembly |
| --- | --- | --- |
| 内存模型 | GC 堆 | 线性内存（`Memory` 对象，由 `SharedArrayBuffer` 或 `ArrayBuffer` 实现） |
| 内存释放 | GC 自动 | 手动（`free`）或依赖编译器注入 |
| 跨语言共享 | `SharedArrayBuffer` | 同左，但 WASM 拥有完整线性内存视图 |
| 泄漏风险 | 逻辑泄漏 | C/C++ 风格泄漏（malloc 不 free） |
| 检测工具 | Chrome DevTools Memory | 同左，但需识别 WASM 内存区域 |

WASM 的线性内存不受 JS GC 管理，需 WASM 模块自行管理。Chrome DevTools 可显示 WASM 内存，但泄漏诊断更复杂。

---

## 7. 常见陷阱与最佳实践（Pitfalls & Best Practices）

### 7.1 陷阱 1：闭包意外捕获

**问题**：

```javascript
function setup() {
  const huge = new Array(1e6).fill('x');
  return function handler() {
    console.log('clicked');
  };
}
// huge 未被 handler 使用，但 V8 < 8.0 可能仍捕获
```

**修复**：将不使用的数据移出闭包作用域，或显式置 `null`：

```javascript
function setup() {
  const huge = new Array(1e6).fill('x');
  const handler = () => console.log('clicked');
  huge.length = 0; // 或 huge = null（需 let 声明）
  return handler;
}
```

### 7.2 陷阱 2：Detached DOM 保留

**问题**：

```javascript
const cache = new Map();
function render(id) {
  const el = document.createElement('div');
  el.textContent = `Item ${id}`;
  cache.set(id, el); // 即使从 DOM 移除，el 仍被 cache 引用
  document.body.appendChild(el);
}
function unrender(id) {
  const el = cache.get(id);
  if (el) {
    document.body.removeChild(el);
    // cache 仍持有 el，成为 Detached DOM
  }
}
```

**修复**：移除时同时清理缓存：

```javascript
function unrender(id) {
  const el = cache.get(id);
  if (el) {
    document.body.removeChild(el);
    cache.delete(id); // 同步清理引用
  }
}
```

### 7.3 陷阱 3：事件监听器累积

**问题**：

```javascript
class View {
  constructor() {
    this.el = document.createElement('div');
  }
  render() {
    this.el.addEventListener('click', this.onClick); // 每次 render 都添加
  }
  onClick() { /* ... */ }
}
const v = new View();
v.render();
v.render(); // 现在有 2 个监听器
```

**修复**：使用 `AbortController` 或先 `removeEventListener`：

```javascript
class View {
  constructor() {
    this.el = document.createElement('div');
    this.controller = new AbortController();
  }
  render() {
    this.el.addEventListener('click', this.onClick, {
      signal: this.controller.signal,
    });
  }
  destroy() {
    this.controller.abort(); // 一次性移除所有监听器
    this.el.remove();
  }
  onClick() { /* ... */ }
}
```

### 7.4 陷阱 4：Promise 未决泄漏

**问题**：

```javascript
const pending = [];
for (let i = 0; i < 1000; i++) {
  pending.push(new Promise(() => {})); // 永远 pending
}
// 1000 个 Promise 永不完成，占内存
```

**修复**：始终给 Promise 添加超时或取消机制：

```javascript
function withTimeout(promise, ms) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Timeout')), ms)
  );
  return Promise.race([promise, timeout]);
}
```

### 7.5 陷阱 5：Map/Set 缓存无上限

**问题**：

```javascript
const cache = new Map();
function getData(key) {
  if (!cache.has(key)) {
    cache.set(key, fetchExpensive(key));
  }
  return cache.get(key);
}
// 长期运行后 cache 无限增长
```

**修复**：使用 LRU 或 TTL 缓存：

```javascript
class TTLCache {
  constructor(ttl = 60000) {
    this.ttl = ttl;
    this.cache = new Map();
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() - entry.time > this.ttl) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key, value) {
    this.cache.set(key, { value, time: Date.now() });
  }
}
```

### 7.6 陷阱 6：定时器未清理

**问题**：

```javascript
function startPolling() {
  setInterval(() => fetchData(), 1000);
  // 未保存 timer ID，无法清理
}
```

**修复**：保存 timer ID 并提供清理接口：

```javascript
class Poller {
  start() {
    this.timer = setInterval(() => this.fetch(), 1000);
  }
  stop() {
    clearInterval(this.timer);
  }
}
```

### 7.7 陷阱 7：依赖 FinalizationRegistry 保证正确性

**问题**：

```javascript
const registry = new FinalizationRegistry((fd) => {
  closeFd(fd); // 期望文件描述符一定被关闭
});

function openFile(path) {
  const fd = openFd(path);
  const file = { fd, path };
  registry.register(file, fd);
  return file;
}
// FinalizationRegistry 回调可能不触发，导致文件描述符泄漏
```

**修复**：用 `try/finally` 或显式 `close()`：

```javascript
function withFile(path, fn) {
  const fd = openFd(path);
  try {
    return fn(fd);
  } finally {
    closeFd(fd); // 确定性释放
  }
}
```

### 7.8 陷阱 8：循环引用中的 WeakRef 误用

**问题**：

```javascript
class Node {
  constructor(value) {
    this.value = value;
    this.parent = null;
    this.children = [];
  }
}

const root = new Node('root');
const child = new Node('child');
child.parent = root;
root.children.push(child);
// 即使外部不再引用 root，root 与 child 互相引用，无法 GC
```

**修复**：父 → 子用强引用，子 → 父用 `WeakRef`：

```javascript
class Node {
  constructor(value) {
    this.value = value;
    this._parentRef = null;
    this.children = [];
  }

  set parent(node) {
    this._parentRef = node ? new WeakRef(node) : null;
  }

  get parent() {
    return this._parentRef?.deref() ?? null;
  }
}
```

---

## 8. 工程实践（Engineering Practice）

### 8.1 内存预算（Memory Budget）

为不同模块设定内存预算，超过预算即报警：

```javascript
// ES2015 — 模块内存预算
class MemoryBudget {
  constructor() {
    this.budgets = new Map();
    this.usage = new Map();
  }

  setBudget(module, limitMB) {
    this.budgets.set(module, limitMB * 1024 * 1024);
  }

  track(module, size) {
    const current = this.usage.get(module) ?? 0;
    this.usage.set(module, current + size);

    const limit = this.budgets.get(module);
    if (limit && current + size > limit) {
      console.warn(`[MemoryBudget] ${module} 超预算: ${(current + size) / 1024 / 1024} MB > ${limit / 1024 / 1024} MB`);
    }
  }

  release(module, size) {
    const current = this.usage.get(module) ?? 0;
    this.usage.set(module, Math.max(0, current - size));
  }
}
```

### 8.2 三快照工作流（Three-Snapshot Workflow）

Chrome DevTools 经典泄漏定位流程：

1. **Snapshot 1（baseline）**：操作前快照。
2. **Snapshot 2（operation）**：执行可疑操作后快照。
3. **Snapshot 3（post-GC）**：手动触发 GC（`--js-flags='--expose-gc'` 后 `gc()`），再快照。

比对 Snapshot 1 与 Snapshot 3，Delta 列显示操作后未回收的对象，即为泄漏候选。

### 8.3 长任务监控

```javascript
// ES2015 — PerformanceObserver 监控长任务
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.duration > 50) {
      console.warn(`长任务: ${entry.duration.toFixed(2)} ms`);
    }
  }
});
observer.observe({ entryTypes: ['longtask'] });
```

长任务（> 50 ms）可能与 GC 停顿相关，需结合内存指标分析。

### 8.4 measureUserAgentSpecificMemory

```javascript
// ES2019 — 浏览器内存测量 API（Chrome 89+）
async function measureMemory() {
  if (!performance.measureUserAgentSpecificMemory) {
    console.warn('不支持 measureUserAgentSpecificMemory');
    return;
  }
  const result = await performance.measureUserAgentSpecificMemory();
  console.log('总内存:', result.bytes / 1024 / 1024, 'MB');
  for (const entry of result.breakdown) {
    console.log(`${entry.attribution.map(a => a.url).join(', ')}: ${entry.bytes / 1024 / 1024} MB`);
  }
  return result;
}
```

### 8.5 内存回归 CI 集成

```yaml
# .github/workflows/memory-check.yml
name: Memory Check
on: [pull_request]
jobs:
  memory:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build
      - name: Start server
        run: npm run preview &
      - name: Wait for server
        run: npx wait-on http://localhost:4173
      - name: Run memory test
        run: node scripts/memory-check.mjs
      - name: Upload heap snapshots
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: heap-snapshots
          path: snapshots/
```

### 8.6 生产环境内存监控

```javascript
// ES2015 — Sentry 风格的内存上报
class MemoryMonitor {
  constructor(reportUrl, interval = 30000) {
    this.reportUrl = reportUrl;
    this.interval = interval;
    this.timer = null;
  }

  start() {
    this.timer = setInterval(() => this.report(), this.interval);
  }

  stop() {
    clearInterval(this.timer);
  }

  async report() {
    const mem = performance.memory
      ? {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
          jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
        }
      : null;

    if (!mem) return;

    const payload = {
      timestamp: Date.now(),
      url: location.href,
      memory: mem,
    };

    // 使用 sendBeacon 不阻塞页面
    navigator.sendBeacon(this.reportUrl, JSON.stringify(payload));
  }
}
```

---

## 9. 案例研究（Case Studies）

### 9.1 案例研究 1：React SPA 路由泄漏

**背景**：某 React SPA 切换路由 100 次后，内存从 80 MB 增长至 350 MB。

**诊断**：

1. 使用 Chrome DevTools 三快照工作流。
2. Snapshot 3 中发现大量 `Detached HTMLDivElement`。
3. Retainers 显示这些节点被 `Map` 缓存持有，缓存位于某全局 Service。

**根因**：某全局 Service 缓存了上一次路由的 DOM 节点引用，路由切换时未清理。

**修复**：

```javascript
// 修复前
class ViewCacheService {
  constructor() {
    this.cache = new Map();
  }
  cacheView(route, el) {
    this.cache.set(route, el);
  }
}

// 修复后：路由切换时清空旧缓存
class ViewCacheService {
  constructor() {
    this.cache = new Map();
    this.currentRoute = null;
  }
  cacheView(route, el) {
    if (this.currentRoute && this.currentRoute !== route) {
      this.cache.delete(this.currentRoute);
    }
    this.cache.set(route, el);
    this.currentRoute = route;
  }
}
```

### 9.2 案例研究 2：WebSocket 消息累积

**背景**：某聊天应用 WebSocket 连接 24 小时后内存 1.2 GB。

**诊断**：

1. Allocation Timeline 显示消息对象持续分配。
2. Snapshot 显示 `Array` 类型增长最快。
3. Retainers 显示消息被 `messages` 数组持有。

**根因**：客户端将所有消息保留在内存中用于"加载历史"，无上限。

**修复**：实现滑动窗口，仅保留最近 1000 条消息：

```javascript
class MessageStore {
  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
    this.messages = [];
  }
  push(msg) {
    this.messages.push(msg);
    if (this.messages.length > this.maxSize) {
      this.messages.shift(); // 移除最旧
    }
  }
}
```

### 9.3 案例研究 3：图表库数据未释放

**背景**：某数据可视化应用使用 ECharts，切换图表类型 50 次后内存 800 MB。

**诊断**：

1. Snapshot 显示大量 `series` 与 `dataZoom` 对象。
2. 这些对象被 ECharts 实例持有，实例未销毁。

**根因**：切换图表时调用 `chart.setOption(newOption)` 但未 `chart.dispose()`，旧实例累积。

**修复**：

```javascript
let chart = null;
function renderChart(option) {
  if (chart) {
    chart.dispose(); // 销毁旧实例
  }
  chart = echarts.init(document.getElementById('chart'));
  chart.setOption(option);
}

// 组件卸载时
function onUnmount() {
  if (chart) {
    chart.dispose();
    chart = null;
  }
}
```

### 9.4 案例研究 4：Worker 池泄漏

**背景**：某 Web Worker 池处理图片，运行 1 小时后内存 2 GB。

**诊断**：

1. Snapshot 显示 `Uint8ClampedArray` 持续增长。
2. 这些数组被 Worker 内部缓存持有。

**根因**：Worker 接收图片后未释放，下次复用 Worker 时旧数据仍存。

**修复**：Worker 处理完成后显式释放：

```javascript
// worker.js
self.onmessage = (e) => {
  const imageData = e.data;
  processImage(imageData);
  // 处理完成，将引用置空
  imageData.data = null;
  self.postMessage({ status: 'done' });
};
```

### 9.5 案例研究 5：iframe 内存累积

**背景**：某仪表盘应用动态加载 iframe，切换 20 次后内存 1.5 GB。

**诊断**：

1. Snapshot 显示大量 `Window` 与 `Document` 对象。
2. 这些是 iframe 的内部对象，iframe 移除后未释放。

**根因**：iframe 移除时未清理内部引用，特别是 `contentWindow` 与 `contentDocument`。

**修复**：

```javascript
function removeIframe(iframe) {
  // 先清空 src，让 iframe 卸载
  iframe.src = 'about:blank';
  // 移除前清空内容
  iframe.contentWindow.document.write('');
  iframe.contentWindow.close();
  // 移除 DOM
  iframe.remove();
}
```

### 9.6 案例研究 6：第三方 SDK 泄漏

**背景**：某接入第三方分析的页面，PV 增长后内存持续上升。

**诊断**：

1. Snapshot 显示某第三方 SDK 内部队列无上限。
2. SDK 在 `window` 上挂载了 `_analytics` 对象，内部 `events` 数组持续增长。

**根因**：第三方 SDK 实现缺陷，无队列上限。

**修复**：

1. 向 SDK 厂商报告 bug。
2. 临时方案：定时清理 `window._analytics.events`：

```javascript
setInterval(() => {
  if (window._analytics?.events?.length > 1000) {
    window._analytics.events = window._analytics.events.slice(-100);
  }
}, 60000);
```

### 9.7 案例研究 7：Service Worker 缓存泄漏

**背景**：某 PWA 的 Service Worker 缓存持续增长。

**诊断**：

1. `chrome://serviceworker-internals/` 查看 SW 内存。
2. `caches` API 中缓存项数无限增长。

**根因**：`caches.open('v1').put(...)` 未配套清理旧版本。

**修复**：

```javascript
// service-worker.js
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== CACHE_VERSION)
          .map((key) => caches.delete(key))
      );
    })()
  );
});
```

---

## 10. 习题（Exercises）

### 10.1 选择题

**Q1**：以下哪种情况**不会**导致内存泄漏？

A. 在严格模式下未声明的变量赋值  
B. 使用 `WeakMap` 存储缓存  
C. `setInterval` 未保存 timer ID  
D. Promise 永远 pending

**答案**：B

**解析**：`WeakMap` 的键是弱引用，键对象被 GC 时自动清除对应条目，不会泄漏。A 在严格模式下抛 `ReferenceError`（不会泄漏，但程序中断）；C 无法清理定时器，泄漏；D 永远 pending 的 Promise 占内存。

---

**Q2**：Chrome DevTools Memory 面板中，"Retained Size" 的含义是？

A. 对象自身占用的内存  
B. 对象及其引用的所有对象总内存  
C. 对象被回收后能释放的总内存  
D. 两次快照间的内存变化量

**答案**：C

**解析**：Retained Size 基于支配树，是对象被回收后**实际释放**的总内存。B 是"可达内存"的概念，但不一定是回收后释放的量。

---

**Q3**：以下哪个 API **不**适合用于资源正确性保证？

A. `try/finally`  
B. `AbortController`  
C. `FinalizationRegistry`  
D. 显式 `close()` 调用

**答案**：C

**解析**：`FinalizationRegistry` 的回调可能不触发、可能延迟、可能乱序，不能用于资源正确性（如关闭文件描述符）。A、B、D 都是确定性释放机制。

---

**Q4**：V8 引擎的"新生代"使用哪种 GC 算法？

A. Mark-Sweep  
B. Mark-Compact  
C. Scavenge（Cheney 复制算法）  
D. 引用计数

**答案**：C

**解析**：V8 新生代使用 Scavenge 算法（Cheney 1970），将堆分为 From / To 半区，GC 时复制存活对象到 To 区。A、B 用于老生代；D 在 JavaScript 中不使用。

---

**Q5**：以下哪种做法**最能**避免 Detached DOM 泄漏？

A. 使用 `document.createElement` 创建元素  
B. 使用 `WeakMap` 缓存 DOM 引用  
C. 移除 DOM 时同步清理 JS 引用  
D. 使用 `innerHTML = ''` 清空容器

**答案**：C

**解析**：Detached DOM 泄漏的本质是 DOM 节点虽脱离 DOM 树但被 JS 引用持有。同步清理 JS 引用（如 `cache.delete(id)`）是根本解法。B 也可，但语义上是"允许 GC"，不是"主动清理"。

---

### 10.2 填空题

**Q1**：V8 堆分为新生代与老生代，新生代使用 ______ 算法，老生代使用 ______ 算法。

**答案**：Scavenge（或 Cheney 复制算法）；Mark-Sweep / Mark-Compact

---

**Q2**：`WeakRef.deref()` 在对象被 GC 后返回 ______。

**答案**：`undefined`

---

**Q3**：Chrome DevTools 三快照工作流中，第三个快照应在 ______ 后拍摄。

**答案**：手动触发 GC（`gc()`）

---

**Q4**：`FinalizationRegistry` 的回调是 ______ 执行的（同步/异步）。

**答案**：异步

---

**Q5**：V8 的 Orinoco GC 项目引入了 ______ 标记与 ______ 清扫，以降低 GC 停顿。

**答案**：增量 / 并发；并发

---

### 10.3 编程题

**Q1**：实现一个带 TTL 与最大容量的 LRU 缓存。

```javascript
// ES2015 — TTL + LRU 缓存
class TTLRU {
  constructor(maxSize = 100, ttl = 60000) {
    this.maxSize = maxSize;
    this.ttl = ttl;
    this.cache = new Map(); // LRU 顺序
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (Date.now() - entry.time > this.ttl) {
      this.cache.delete(key); // 过期
      return undefined;
    }

    // 移到末尾（最近使用）
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    this.cache.set(key, { value, time: Date.now() });

    // 超容量时移除最旧
    if (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }

  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (now - entry.time > this.ttl) {
        this.cache.delete(key);
      }
    }
  }
}
```

---

**Q2**：实现一个基于 `AbortController` 的可取消异步操作工具。

```javascript
// ES2017 — 可取消异步工具
class CancellableTask {
  constructor() {
    this.controller = new AbortController();
  }

  async run(asyncFn) {
    try {
      const result = await asyncFn(this.controller.signal);
      return { status: 'fulfilled', value: result };
    } catch (err) {
      if (err.name === 'AbortError') {
        return { status: 'cancelled', reason: err };
      }
      return { status: 'rejected', reason: err };
    }
  }

  cancel() {
    this.controller.abort();
  }
}

// 使用
const task = new CancellableTask();
task.run(async (signal) => {
  const res = await fetch('https://api.example.com/data', { signal });
  return res.json();
});

// 5 秒后取消
setTimeout(() => task.cancel(), 5000);
```

---

**Q3**：实现一个内存监控类，定时上报堆使用情况。

```javascript
// ES2015 — 内存监控
class MemoryReporter {
  constructor(endpoint, interval = 30000) {
    this.endpoint = endpoint;
    this.interval = interval;
    this.timer = null;
    this.samples = [];
  }

  start() {
    this.timer = setInterval(() => this.sample(), this.interval);
  }

  stop() {
    clearInterval(this.timer);
    this.timer = null;
  }

  sample() {
    const mem = performance.memory;
    if (!mem) return;

    const sample = {
      timestamp: Date.now(),
      used: mem.usedJSHeapSize,
      total: mem.totalJSHeapSize,
      limit: mem.jsHeapSizeLimit,
    };
    this.samples.push(sample);

    // 仅保留最近 100 个样本
    if (this.samples.length > 100) {
      this.samples.shift();
    }

    this.report(sample);
  }

  report(sample) {
    const payload = {
      ...sample,
      url: location.href,
      samples: this.samples,
    };
    navigator.sendBeacon(this.endpoint, JSON.stringify(payload));
  }

  // 检测内存增长趋势
  detectLeak() {
    if (this.samples.length < 10) return false;
    const recent = this.samples.slice(-10);
    const trend = recent[recent.length - 1].used - recent[0].used;
    return trend > 10 * 1024 * 1024; // 10 MB 增长
  }
}
```

---

**Q4**：实现一个 `withResource` 工具，模拟 RAII 模式。

```javascript
// ES2015 — RAII 风格资源管理
function withResource(acquire, release, fn) {
  const resource = acquire();
  try {
    return fn(resource);
  } finally {
    release(resource);
  }
}

// 异步版本
async function withResourceAsync(acquire, release, fn) {
  const resource = await acquire();
  try {
    return await fn(resource);
  } finally {
    await release(resource);
  }
}

// 使用
const result = withResource(
  () => openFile('data.txt'),
  (fd) => closeFile(fd),
  (fd) => readFile(fd)
);

// 异步使用
const data = await withResourceAsync(
  () => connectDatabase(),
  (conn) => conn.close(),
  async (conn) => conn.query('SELECT * FROM users')
);
```

---

### 10.4 思考题

**Q1**：为什么 `WeakRef` 与 `FinalizationRegistry` 不能用于资源正确性保证，但 `try/finally` 可以？从语义角度分析。

**提示**：考虑"确定性"（determinism）与"时机保证"（timing guarantee）。

**参考答案**：`try/finally` 的 `finally` 块在控制流离开 `try` 块时**同步**执行，时机确定。`FinalizationRegistry` 的回调依赖 GC 时机，GC 可能不运行（程序结束前未触发），可能延迟（系统内存充裕时不触发），可能乱序（多个对象并发回收）。资源正确性要求"必然执行"且"及时执行"，`try/finally` 满足，`FinalizationRegistry` 不满足。

---

**Q2**：在 React 中，`useEffect` 的清理函数（cleanup）与 `FinalizationRegistry` 都可用于"组件卸载时清理"，二者有何本质区别？

**参考答案**：`useEffect` 的 cleanup 在组件卸载时**确定性**触发（React 调度），保证执行。`FinalizationRegistry` 依赖 GC，组件卸载后如果内存充裕 GC 可能不运行，回调不触发。因此 React 中应使用 `useEffect` cleanup，不能依赖 `FinalizationRegistry`。

---

**Q3**：为什么 V8 不采用引用计数而采用 Mark-Sweep？分析两者在 JavaScript 工作负载下的优劣。

**参考答案**：

- 引用计数优势：实时释放（无 GC 停顿）、内存碎片少。
- 引用计数劣势：无法处理循环引用（DOM 节点 ↔ JS 闭包），开销大（每次赋值需更新计数）。
- Mark-Sweep 优势：可处理循环引用，开销集中在 GC 时刻。
- Mark-Sweep 劣势：GC 停顿（虽 Orinoco 已优化）、内存碎片（需 Mark-Compact 整理）。

JavaScript 工作负载中 DOM 与闭包的循环引用非常普遍（IE 6 时代的著名问题），故 V8 选择 Mark-Sweep。

---

**Q4**：在 Node.js 长期运行的服务中，如何平衡"内存占用"与"GC 停顿"？是否应手动调用 `gc()`？

**参考答案**：V8 团队明确反对在生产环境手动调用 `gc()`，因为：

1. 全量 GC 停顿长（数十至数百毫秒），影响吞吐。
2. V8 已自适应调度 GC，手动干预破坏调度策略。
3. 应通过架构优化（如分批处理、流式处理、对象池）减少内存压力，而非频繁 GC。

正确做法：监控 `process.memoryUsage()`，发现异常时分析堆快照，定位逻辑泄漏，而非依赖 `gc()`。

---

## 11. 参考文献（References）

1. McCarthy, J. (1960). Recursive functions of symbolic expressions and their computation by machine, Part I. *Communications of the ACM*, 3(4), 184–195. https://doi.org/10.1145/367177.367199

2. Collins, G. E. (1960). A method for overlapping and erasure of lists. *Communications of the ACM*, 3(12), 655–657. https://doi.org/10.1145/367487.367501

3. Cheney, C. J. (1970). A nonrecursive list compacting algorithm. *Communications of the ACM*, 13(11), 677–678. https://doi.org/10.1145/362790.362801

4. Wilson, P. R. (1992). Uniprocessor garbage collection techniques. In *Memory Management* (pp. 1–42). Springer. https://doi.org/10.1007/BFb0017182

5. Wilson, P. R., & Moher, T. G. (1989). Design of the opportunistic garbage collector. *ACM SIGPLAN Notices*, 24(7), 23–35. https://doi.org/10.1145/74818.74821

6. Lengauer, T., & Tarjan, R. E. (1979). A fast algorithm for finding dominators in a flowgraph. *ACM Transactions on Programming Languages and Systems*, 1(1), 121–141. https://doi.org/10.1145/357062.357071

7. Dijkstra, E. W., Lamport, L., Martin, A. J., Scholten, C. S., & Steffens, E. F. M. (1978). On-the-fly garbage collection: An exercise in cooperation. *Communications of the ACM*, 21(11), 966–975. https://doi.org/10.1145/359642.359655

8. Baker, H. G. (1978). List processing in real time on a serial computer. *Communications of the ACM*, 21(4), 280–294. https://doi.org/10.1145/359460.359470

9. Lieberman, H., & Hewitt, C. (1983). A real-time garbage collector based on the lifetimes of objects. *Communications of the ACM*, 26(6), 419–429. https://doi.org/10.1145/358141.358147

10. Ungar, D. (1984). Generation scavenging: A non-disruptive high performance storage reclamation algorithm. *ACM SIGPLAN Notices*, 19(5), 157–167. https://doi.org/10.1145/390011.808261

11. Appel, A. W. (1989). Simple generational garbage collection and fast allocation. *Software: Practice and Experience*, 19(2), 171–183. https://doi.org/10.1002/spe.4380190206

12. Jones, R., Hosking, A., & Moss, E. (2011). *The garbage collection handbook: The art of automatic memory management*. Chapman and Hall/CRC. https://doi.org/10.1201/b10864

13. Anderson, L. W., & Krathwohl, D. R. (2001). *A taxonomy for learning, teaching, and assessing: A revision of Bloom's taxonomy of educational objectives*. Longman.

14. Bak, L., & Sevcsik, A. (2018). Orinoco: Young generation garbage collection. *V8 Blog*. https://v8.dev/blog/orinoco

15. Goetsch, M. (2015). Jank-free memory management in JavaScript. *V8 Blog*. https://v8.dev/blog/jank-busters

16. Ecma International. (2024). ECMAScript 2024 language specification (ECMA-262, 14th edition). https://262.ecma-international.org/14.0/

17. WHATWG. (2024). HTML living standard: Structured clone algorithm. https://html.spec.whatwg.org/multipage/structured-data.html

18. Belshe, M., & Savolainen, J. (2021). WeakRef and FinalizationRegistry. *TC39 Proposal*. https://github.com/tc39/proposal-weakrefs

19. Hensen, R. (2024). Explicit Resource Management. *TC39 Proposal Stage 3*. https://github.com/tc39/proposal-explicit-resource-management

20. Domenic Denicola. (2022). structuredClone: A deep copy API for the web. *WHATWG Blog*. https://html.spec.whatwg.org/multipage/structured-data.html#dom-structuredclone

---

## 12. 延伸阅读（Further Reading）

### 12.1 学术论文

- **Jones, R., & Ryder, A. (2008)**: *A survey of garbage collection and heap segmentation*. Science of Computer Programming. — 现代垃圾回收综述。
- **Blackburn, S. M., et al. (2004)**: *Lock-free garbage collection for real-time Java*. PLDI. — 实时 GC 的工程化研究。
- **Agesen, O., Pazel, J., & Smith, T. (1999)**: *Constraints and design of the HotSpot virtual machine*. OOPSLA. — V8 设计的前身。

### 12.2 规范文档

- **ECMA-262 §8.6**: Agent Clusters and Job Queue — 事件循环与微任务模型。
- **ECMA-262 §10.3**: Memory Model — JavaScript 内存模型。
- **HTML Living Standard §2.9**: Structured Clone Algorithm — `structuredClone` 的规范定义。
- **W3C Web Performance Working Group**: Performance Timeline Level 2 — `PerformanceObserver` 与 `performance.memory`。

### 12.3 工程实践

- **V8 Blog** (https://v8.dev/blog): V8 团队技术博客，定期发布 GC、JIT、内存优化内容。
- **Chrome DevTools Documentation** (https://developer.chrome.com/docs/devtools/memory-problems/): Chrome 内存分析官方文档。
- **MDN Web Docs**: `WeakRef`, `FinalizationRegistry`, `Performance.memory` 的参考文档。

### 12.4 进阶主题

- **WebAssembly 内存模型**：WASM 线性内存与 JS GC 的协同，跨语言内存所有权。
- **SharedArrayBuffer 与 Atomics**：跨线程共享内存的同步原语与泄漏风险。
- **Service Worker 内存治理**：PWA 离线缓存与 SW 生命周期的内存影响。
- **OffscreenCanvas**：将 Canvas 渲染移至 Worker，避免主线程内存压力。
- **Site Isolation 与 Spectre 缓解**：跨源内存隔离的安全机制。

### 12.5 相关课程

- **MIT 6.031: Software Construction** — 软件构建中的内存安全与抽象。
- **Stanford CS107: Computer Organization & Systems** — C 语言内存模型与堆管理。
- **CMU 15-213: Introduction to Computer Systems** — 系统级内存层次与虚拟内存。
- **MIT 6.172: Performance Engineering of Software Systems** — 性能工程中的内存与缓存优化。
- **Berkeley CS162: Operating Systems** — 操作系统内存管理与分配器设计。

---

## 附录 A：术语表（Glossary）

| 术语 | 英文 | 定义 |
| --- | --- | --- |
| 垃圾回收 | Garbage Collection, GC | 自动回收不再使用的内存 |
| 可达性 | Reachability | 从根集出发能否访问到对象 |
| 根集 | Root Set | GC 起点，包含全局对象、栈、寄存器等 |
| 支配树 | Dominator Tree | 表示对象支配关系的树形结构 |
| Shallow Size | Shallow Size | 对象自身占用内存 |
| Retained Size | Retained Size | 对象被回收后能释放的总内存 |
| 新生代 | Young Generation | V8 中存放短命对象的堆区 |
| 老生代 | Old Generation | V8 中存放长命对象的堆区 |
| 分代假说 | Generational Hypothesis | 多数对象朝生夕死的经验规律 |
| 弱引用 | Weak Reference | 不影响 GC 的引用 |
| 闭包 | Closure | 函数与其词法环境的组合 |
| Detached DOM | Detached DOM | 脱离 DOM 树但仍被 JS 引用的节点 |
| RAII | Resource Acquisition Is Initialization | 资源获取即初始化，C++ 资源管理模式 |
| 三快照工作流 | Three-Snapshot Workflow | Chrome DevTools 定位泄漏的标准流程 |

---

## 附录 B：Chrome DevTools Memory 面板速查

| 功能 | 用途 | 操作 |
| --- | --- | --- |
| Heap Snapshot | 某时刻堆快照 | Memory → Take heap snapshot |
| Allocation Timeline | 实时内存分配 | Memory → Allocation instrumentation on timeline |
| Allocation Sampling | 低开销采样 | Memory → Allocation sampling |
| Comparison | 两快照差异 | 快照视图 → Comparison |
| Containment | 引用关系 | 快照视图 → Containment |
| Statistics | 内存分布饼图 | 快照视图 → Statistics |

### 关键列含义

| 列名 | 含义 |
| --- | --- |
| Constructor | 构造函数名（如 `Object`、`Array`、`HTMLDivElement`） |
| Distance | 到 GC 根的最短距离 |
| Shallow Size | 对象自身内存 |
| Retained Size | 对象被回收后释放的总内存 |
| Delta | 两快照间变化量 |

---

## 附录 C：Node.js 内存诊断速查

### 启动参数

```bash
# 暴露 gc() 函数
node --expose-gc app.js

# 设置老生代最大值（默认 1.4 GB）
node --max-old-space-size=4096 app.js

# 设置新生代半区大小（默认 16 MB）
node --max-semi-space-size=64 app.js

# 启用 GC 日志
node --trace-gc app.js

# 启用详细 GC 日志
node --trace-gc-verbose app.js
```

### 关键 API

```javascript
// 内存使用
process.memoryUsage();
// { rss, heapTotal, heapUsed, external, arrayBuffers }

// 堆快照
import v8 from 'v8';
v8.getHeapSnapshot(); // 返回流

// 堆统计
v8.getHeapStatistics();
// { total_heap_size, used_heap_size, ... }

// 强制 GC（需 --expose-gc）
global.gc();
```

---

## 结语

内存泄漏排查是 JavaScript 工程师的高级技能，需要理解 GC 原理、掌握 DevTools 工具、积累案例经验。本篇对标 MIT 6.031 / Stanford CS107 / CMU 15-213 教学水准，从理论到实践系统讲授。关键要点：

1. **理解可达性**：泄漏的本质是"可达但无用"的逻辑泄漏。
2. **掌握工具**：三快照工作流、Allocation Timeline、堆快照比对是三大支柱。
3. **设计优先**：资源管理应在架构层考虑（`AbortController`、`try/finally`、`using` 提案），而非事后排查。
4. **CI 集成**：内存回归测试应纳入 CI，每个 PR 自动检测。
5. **生产监控**：`performance.memory` 与 `sendBeacon` 实现线上内存监控。

掌握本篇内容后，应能在 React / Vue / Node.js 项目中独立诊断与修复内存泄漏，并设计内存友好的架构。
