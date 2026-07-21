---
order: 100
tags:
  - javascript
  - async
difficulty: intermediate
title: 异步编程
module: javascript
category: 'JS Basics'
description: '回调、Promise、async/await 与事件循环。'
author: Anonymous
related:
  - javascript/JavaScript最新特性与运行时
  - javascript/模块化
  - javascript/闭包的内存泄露与优化
  - javascript/原型链继承与class本质
prerequisites:
  - javascript/语法速查
---

## 0. 学习目标

完成本章节学习后，读者应能够：

- **记忆（Remember）**：复述 JavaScript 事件循环的六阶段模型、微任务与宏任务的优先级顺序、Promise 的三种状态机迁移规则。
- **理解（Understand）**：解释 callback hell 的成因、Promise 链式调用的实现原理、async/await 作为 Promise 语法糖的本质。
- **应用（Apply）**：使用 `Promise.all`、`Promise.race`、`Promise.allSettled`、`Promise.any` 实现并发控制与容错策略；使用 `AbortController` 取消异步任务。
- **分析（Analyze）**：对比 callback、Promise、async/await 三种异步范式的可读性、错误处理能力与调试体验；对比浏览器与 Node.js 事件循环的差异。
- **评估（Evaluate）**：在给定业务场景（如请求重试、并发限流、超时控制）中判断异步模式的适用性，并指出潜在的反模式与内存泄漏风险。
- **创造（Create）**：设计并实现一个支持取消、超时、重试、并发限流的异步任务调度器，并通过单元测试验证其正确性。

## 1. 历史动机与背景

### 1.1 单线程的 JavaScript

JavaScript 诞生于 1995 年，由 Brendan Eich 在 Netscape 用 10 天设计完成。其最初定位是浏览器脚本语言，用于表单校验与简单 DOM 操作。为了简化 UI 线程模型，JavaScript 从一开始就采用**单线程**执行模型：

- 避免多线程并发修改 DOM 导致的渲染竞态；
- 降低入门门槛，开发者无需处理锁与信号量；
- 与浏览器的渲染线程、网络线程、定时器线程通过事件循环协作。

然而，单线程意味着任何耗时操作（网络请求、文件 I/O、加密计算）都会阻塞 UI 响应。1995 年的 Netscape Navigator 若同步等待服务器响应，整个浏览器会冻结，用户体验极差。因此，JavaScript 从第一天起就必须支持异步编程。

### 1.2 异步范式演进时间线

| 年份 | 范式 | 代表 API | 痛点 |
| :--- | :--- | :--- | :--- |
| 1995 | 事件回调 | `setTimeout`、`onclick` | 回调嵌套浅时可用，深嵌套时失控 |
| 2009 | Node.js 风格回调 | `(err, data) => {}` | callback hell、错误处理分散 |
| 2011 | Promise/A+ | Q.js、Bluebird | 标准未统一、库实现碎片化 |
| 2015 | 原生 Promise（ES6） | `Promise`、`Promise.all` | 链式调用仍显繁琐 |
| 2017 | async/await（ES2017） | `async function` | 显著提升可读性，但需理解底层 Promise |
| 2021 | Top-level await | `await` in ES module | 模块顶层可直接 await |
| 2024 | Promise.try | `Promise.try(fn)` | 统一同步/异步错误处理 |
| 2025 | AsyncContext | `AsyncContext.snapshot()` | 跨异步边界传播上下文 |

### 1.3 为什么不能彻底消灭异步

即便 Node.js 引入了 Worker Threads、浏览器引入了 Web Workers，主线程仍然是异步编程的主战场。原因在于：

1. **跨线程通信代价**：Worker 通信需要序列化数据，对于高频小任务得不偿失；
2. **DOM 限制**：浏览器只允许主线程操作 DOM，Worker 无法直接更新 UI；
3. **资源共享**：大量 API（IndexedDB、Service Worker、WebSocket）基于事件驱动模型设计，天然异步。

因此，掌握异步编程不是可选技能，而是 JavaScript 工程师的核心能力。

## 2. 形式化定义

### 2.1 异步计算的形式化模型

设 $f : A \to B$ 为一个计算任务。若 $f$ 在主线程上同步执行，则其执行时间 $T_{\text{sync}}$ 为：

$$
T_{\text{sync}}(f) = t_{\text{compute}}(f)
$$

若将 $f$ 异步化，引入调度开销 $t_{\text{sched}}$ 与回调入队开销 $t_{\text{queue}}$，则总执行时间 $T_{\text{async}}$ 为：

$$
T_{\text{async}}(f) = t_{\text{compute}}(f) + t_{\text{sched}} + t_{\text{queue}}
$$

异步带来的收益在于**非阻塞**：主线程在 $f$ 执行期间可处理其他任务 $g$，其吞吐量提升比为：

$$
\text{Speedup} = \frac{T_{\text{sync}}(f) + T_{\text{sync}}(g)}{\max(T_{\text{async}}(f), T_{\text{async}}(g))} \approx 1 + \frac{\min(T_f, T_g)}{\max(T_f, T_g)}
$$

当 $T_f \approx T_g$ 时，加速比趋近于 2；当 $T_f \gg T_g$ 时，加速比趋近于 1（异步无显著收益）。这解释了为什么 CPU 密集型任务异步化收益有限。

### 2.2 Promise 状态机

Promise 是一个三状态有限自动机：

$$
\text{Promise} = (S, \Sigma, \delta, s_0, F)
$$

其中：

- 状态集 $S = \{\text{pending}, \text{fulfilled}, \text{rejected}\}$
- 输入字母表 $\Sigma = \{\text{resolve}(v), \text{reject}(r), \text{then}(f), \text{catch}(g)\}$
- 初始状态 $s_0 = \text{pending}$
- 终态集 $F = \{\text{fulfilled}, \text{rejected}\}$
- 状态迁移函数 $\delta$：

$$
\delta(\text{pending}, \text{resolve}(v)) = \text{fulfilled}
$$

$$
\delta(\text{pending}, \text{reject}(r)) = \text{rejected}
$$

$$
\delta(\text{fulfilled}, \text{then}(f)) = \text{fulfilled} \quad (\text{若 } f \text{ 不抛出})
$$

$$
\delta(\text{fulfilled}, \text{then}(f)) = \text{rejected} \quad (\text{若 } f \text{ 抛出})
$$

$$
\delta(\text{rejected}, \text{catch}(g)) = \text{fulfilled} \quad (\text{若 } g \text{ 不抛出})
$$

**关键不变式**：一旦进入终态 $\text{fulfilled}$ 或 $\text{rejected}$，状态不可再迁移。这被称为 **Promise 不变式（Promise Invariant）**。

### 2.3 事件循环的形式化模型

事件循环可建模为一个带优先级队列的调度器：

$$
\text{EventLoop} = (Q_{\text{macro}}, Q_{\text{micro}}, Q_{\text{nextTick}}, \text{stack})
$$

每一轮（tick）的执行算法：

```
while (true) {
  while (stack.notEmpty()) stack.pop().run();     // 执行同步代码
  while (Q_nextTick.notEmpty()) Q_nextTick.dequeue().run();  // Node.js nextTick
  while (Q_micro.notEmpty()) Q_micro.dequeue().run();       // 微任务
  if (Q_macro.notEmpty()) Q_macro.dequeue().run();          // 单个宏任务
  else yield();  // 等待 I/O
}
```

**优先级**：`nextTick > micro > macro`。这意味着微任务总是优先于宏任务，但微任务过多会"饿死"宏任务。

## 3. 理论推导

### 3.1 微任务饿死宏任务

设微任务产生速率为 $\lambda_m$，每个微任务执行时间为 $\bar{t}_m$，宏任务产生速率为 $\lambda_M$，每个宏任务执行时间为 $\bar{t}_M$。若微任务在执行过程中不断产生新微任务，则宏任务被调度的时间窗口为：

$$
T_{\text{window}}^{(M)} = T_{\text{total}} - \sum_{i=1}^{N_m} t_{m,i}
$$

当 $\lambda_m \cdot \bar{t}_m \geq 1$（微任务自繁殖速率 ≥ 1）时，$T_{\text{window}}^{(M)} \to 0$，宏任务永远得不到执行。

**实测代码**：

```javascript
// 反模式：微任务无限递归，setTimeout 永远不执行
function recursiveMicrotask() {
  Promise.resolve().then(recursiveMicrotask);
}
recursiveMicrotask();
setTimeout(() => console.log('宏任务永远不执行'), 0);
```

### 3.2 Promise 链的延迟下界

设有 $n$ 个串行 `then`，每个 `then` 回调入队微任务并执行需 $t_{\text{micro}}$。则总延迟下界为：

$$
T_{\text{chain}}(n) \geq n \cdot t_{\text{micro}}
$$

实测在 V8 中 $t_{\text{micro}} \approx 1\mu s$，故 1000 级 `then` 链至少需 1ms。这对深度递归的 Promise 链是性能瓶颈。

### 3.3 async/await 的零成本承诺

ES2017 规范允许引擎将 `async/await` 编译为等效的 Promise 链，但 V8 在 2018 年后实现了**零成本异步**优化：

- `await` 后的 `then` 回调不再创建 Promise 包装器；
- 直接复用底层 `resolve` 函数；
- 性能从 $O(n)$ 降至接近 $O(1)$。

这意味着在 V8 中，`async/await` 的性能等同甚至优于手写 Promise 链。

### 3.4 并发与并行的区分

- **并发（Concurrency）**：单线程在多个任务间快速切换，逻辑上同时进行。
- **并行（Parallelism）**：多线程/多核物理上同时执行。

JavaScript 的异步本质上是**并发**而非**并行**。真正的并行需要 Worker Threads 或 Web Workers。

Amdahl 定律给出并行加速比上界：

$$
S(p) = \frac{1}{(1 - \alpha) + \frac{\alpha}{p}}
$$

其中 $\alpha$ 为可并行比例，$p$ 为处理器数。若 90% 代码可并行，4 核加速比为 $S(4) = 1/(0.1 + 0.225) \approx 3.08$。

## 4. 代码示例

### 4.1 回调基础

```javascript
// 早期 Node.js 风格回调：第一个参数为错误，第二个为数据
function readFileCallback(path, callback) {
  // 模拟异步文件读取
  setTimeout(() => {
    if (path === '/missing') {
      callback(new Error('文件不存在'), null);
    } else {
      callback(null, `内容:${path}`);
    }
  }, 100);
}

readFileCallback('/etc/hosts', (err, data) => {
  if (err) {
    console.error('读取失败:', err.message);
    return;
  }
  console.log('读取成功:', data);
});
```

### 4.2 Callback Hell 与重构

```javascript
// 反模式：回调地狱
fetchUser(userId, (err, user) => {
  if (err) return handleError(err);
  fetchPosts(user.id, (err, posts) => {
    if (err) return handleError(err);
    fetchComments(posts[0].id, (err, comments) => {
      if (err) return handleError(err);
      render(user, posts, comments);
    });
  });
});

// 重构 1：命名函数解构嵌套
function handleUser(err, user) {
  if (err) return handleError(err);
  fetchPosts(user.id, handlePosts.bind(null, user));
}
function handlePosts(user, err, posts) {
  if (err) return handleError(err);
  fetchComments(posts[0].id, handleComments.bind(null, user, posts));
}
function handleComments(user, posts, err, comments) {
  if (err) return handleError(err);
  render(user, posts, comments);
}
fetchUser(userId, handleUser);

// 重构 2：Promise 链（推荐）
fetchUserAsync(userId)
  .then((user) => fetchPostsAsync(user.id).then((posts) => ({ user, posts })))
  .then(({ user, posts }) =>
    fetchCommentsAsync(posts[0].id).then((comments) => ({ user, posts, comments }))
  )
  .then(({ user, posts, comments }) => render(user, posts, comments))
  .catch(handleError);
```

### 4.3 Promise 完整示例

```javascript
// 创建 Promise
function delay(ms, value) {
  return new Promise((resolve, reject) => {
    if (ms < 0) {
      reject(new Error('延迟不能为负数'));
      return;
    }
    setTimeout(() => resolve(value), ms);
  });
}

// Promise.all：全部成功才成功
async function loadAll() {
  const [user, settings, theme] = await Promise.all([
    fetchUserAsync(1),
    fetchSettingsAsync(),
    fetchThemeAsync(),
  ]);
  return { user, settings, theme };
}

// Promise.race：第一个完成即返回（无论成功失败）
async function fetchWithTimeout(url, ms) {
  return Promise.race([
    fetch(url),
    delay(ms).then(() => Promise.reject(new Error('请求超时'))),
  ]);
}

// Promise.allSettled：等待全部完成，无论成功失败
async function loadAllSettled() {
  const results = await Promise.allSettled([
    fetchUserAsync(1),
    fetchUserAsync(2),
    fetchUserAsync(3),
  ]);
  const fulfilled = results.filter((r) => r.status === 'fulfilled').map((r) => r.value);
  const rejected = results.filter((r) => r.status === 'rejected').map((r) => r.reason);
  console.log(`成功 ${fulfilled.length} 个，失败 ${rejected.length} 个`);
  return fulfilled;
}

// Promise.any：第一个成功即返回，全部失败才抛 AggregateError
async function fetchFirstAvailable(urls) {
  return Promise.any(urls.map((url) => fetch(url).then((r) => r.json())));
}
```

### 4.4 async/await 完整示例

```javascript
// 串行执行
async function fetchSerial(urls) {
  const results = [];
  for (const url of urls) {
    const res = await fetch(url);
    results.push(await res.json());
  }
  return results;
}

// 并发执行
async function fetchParallel(urls) {
  const promises = urls.map((url) => fetch(url).then((r) => r.json()));
  return Promise.all(promises);
}

// 并发限流（控制最大并发数为 limit）
async function fetchWithConcurrency(urls, limit) {
  const results = new Array(urls.length);
  let cursor = 0;

  async function worker() {
    while (cursor < urls.length) {
      const index = cursor++;
      try {
        const res = await fetch(urls[index]);
        results[index] = await res.json();
      } catch (err) {
        results[index] = { error: err.message };
      }
    }
  }

  const workers = Array.from({ length: Math.min(limit, urls.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

// 请求重试（指数退避）
async function fetchWithRetry(url, maxRetries = 3, baseDelay = 1000) {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        const delayMs = baseDelay * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }
  throw lastError;
}
```

### 4.5 AbortController 取消异步

```javascript
// 创建控制器
const controller = new AbortController();
const { signal } = controller;

// 监听取消信号
signal.addEventListener('abort', () => {
  console.log('任务被取消');
});

// 5 秒后取消
setTimeout(() => controller.abort(), 5000);

// fetch 原生支持 AbortSignal
async function fetchCancellable(url, signal) {
  const res = await fetch(url, { signal });
  return res.json();
}

// 自定义可取消的异步任务
async function delayCancellable(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new Error('已取消'));
      return;
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new Error('已取消'));
    };
    signal.addEventListener('abort', onAbort);
  });
}

// 使用示例：搜索框防抖 + 取消上一次请求
let searchController = null;
async function search(keyword) {
  if (searchController) searchController.abort();
  searchController = new AbortController();
  try {
    const results = await fetchCancellable(
      `/api/search?q=${encodeURIComponent(keyword)}`,
      searchController.signal
    );
    renderResults(results);
  } catch (err) {
    if (err.name === 'AbortError') {
      console.log('请求被取消，忽略结果');
    } else {
      console.error('搜索失败:', err);
    }
  }
}
```

### 4.6 AsyncContext（ES2025 提案）

```javascript
// AsyncContext 用于跨异步边界传播上下文（类似 Node.js 的 AsyncLocalStorage）
const requestIdCtx = new AsyncContext.Variable();

async function handleRequest(req) {
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();
  // 在上下文中运行整个请求处理链
  return requestIdCtx.run(requestId, () => processRequest(req));
}

async function processRequest(req) {
  log('开始处理'); // 自动包含 requestId
  const data = await fetchFromDB();
  log('数据库查询完成');
  return data;
}

function log(message) {
  const requestId = requestIdCtx.get();
  console.log(`[${requestId}] ${message}`);
}

// 快照与恢复
async function taskWithSnapshot() {
  const snapshot = AsyncContext.snapshot();
  await someAsyncOperation();
  // 在恢复点重新应用上下文
  AsyncContext.restore(snapshot);
}
```

## 5. 对比分析

### 5.1 三种异步范式对比

| 维度 | Callback | Promise | async/await |
| :--- | :--- | :--- | :--- |
| 出现年份 | 1995 | 2015 | 2017 |
| 代码结构 | 嵌套金字塔 | 链式调用 | 同步式书写 |
| 错误处理 | 手动 if-err | `.catch()` 统一 | `try-catch` 统一 |
| 状态可见性 | 不可见 | 三态明确 | 隐式 Promise |
| 取消支持 | 需自定义 | 需配合 AbortController | 需配合 AbortController |
| 调试体验 | 栈踪迹丢失 | 栈踪迹部分丢失 | 栈踪迹完整 |
| 性能 | 最快 | 中等 | 接近 Promise（V8 优化后） |
| 并发表达力 | 弱 | 强（Promise.all 等） | 中（需 Promise.all 配合） |
| 学习成本 | 低 | 中 | 中 |
| 适用场景 | 简单事件回调 | 复杂异步流 | 业务逻辑层首选 |

### 5.2 浏览器 vs Node.js 事件循环

| 维度 | 浏览器 | Node.js |
| :--- | :--- | :--- |
| 规范来源 | HTML5 规范 | libuv |
| 阶段数 | 1（宏任务+微任务） | 6（timers, pending, poll, check, close, idle/prepare） |
| 微任务源 | Promise、MutationObserver、queueMicrotask | Promise、process.nextTick、queueMicrotask |
| nextTick | 无 | 独立队列，优先级最高 |
| setImmediate | 无 | check 阶段执行 |
| I/O 模型 | 操作系统特定 | epoll/kqueue/IOCP |
| 渲染时机 | 宏任务之间可能渲染 | 不涉及渲染 |

### 5.3 Promise 组合器对比

| 方法 | 行为 | 失败策略 | 返回值 |
| :--- | :--- | :--- | :--- |
| `Promise.all` | 全部完成 | 任一失败即失败 | 数组（顺序对应输入） |
| `Promise.race` | 第一个完成 | 第一个失败即失败 | 第一个完成的值 |
| `Promise.allSettled` | 全部完成 | 不失败 | `{status, value/reason}[]` |
| `Promise.any` | 第一个成功 | 全部失败才失败（AggregateError） | 第一个成功的值 |

**选择策略**：

- 必须全部成功：`Promise.all`
- 容忍部分失败但需全部完成：`Promise.allSettled`
- 取最快响应：`Promise.race`
- 取首个可用资源：`Promise.any`

## 6. 常见陷阱与反模式

### 6.1 forEach 中的 await 不等待

```javascript
// 反模式：forEach 不会等待 async 回调
async function fetchAll(urls) {
  const results = [];
  urls.forEach(async (url) => {
    const res = await fetch(url);
    results.push(await res.json());
  });
  return results; // 返回空数组！
}

// 正确写法 1：for...of
async function fetchAll(urls) {
  const results = [];
  for (const url of urls) {
    const res = await fetch(url);
    results.push(await res.json());
  }
  return results;
}

// 正确写法 2：Promise.all + map
async function fetchAll(urls) {
  return Promise.all(
    urls.map(async (url) => {
      const res = await fetch(url);
      return res.json();
    })
  );
}
```

### 6.2 忘记 await 导致 Promise 浮空

```javascript
// 反模式：忘记 await，错误丢失
async function processData() {
  const data = fetchDataAsync(); // 缺少 await
  console.log(data); // 输出 Promise 对象
}

// 反模式：catch 不捕获异步错误
async function riskyOperation() {
  try {
    await fetchAsync(); // 异步错误被 try 捕获
    fetchDataAsync(); // 忘记 await，错误丢失
  } catch (err) {
    console.error(err); // 永远不会执行
  }
}

// 正确写法：使用 Promise.allSettled 或显式 await
async function riskyOperation() {
  try {
    await fetchAsync();
    await fetchDataAsync(); // 显式 await
  } catch (err) {
    console.error(err);
  }
}
```

### 6.3 串行 await 导致性能下降

```javascript
// 反模式：三个独立请求串行
async function loadSlow() {
  const user = await fetchUserAsync(1);     // 200ms
  const settings = await fetchSettingsAsync(); // 200ms
  const theme = await fetchThemeAsync();    // 200ms
  // 总耗时 600ms
  return { user, settings, theme };
}

// 正确写法：并发执行
async function loadFast() {
  const [user, settings, theme] = await Promise.all([
    fetchUserAsync(1),
    fetchSettingsAsync(),
    fetchThemeAsync(),
  ]);
  // 总耗时 200ms
  return { user, settings, theme };
}
```

### 6.4 在 Promise 构造函数中 return 值

```javascript
// 反模式：return 不会作为 resolve 值
const p = new Promise((resolve) => {
  if (condition) {
    return 'value'; // 错误！这只是一个普通的 return
  }
  setTimeout(() => resolve('other'), 100);
});
console.log(await p); // 永远是 'other' 或 undefined

// 正确写法：必须显式调用 resolve
const p = new Promise((resolve) => {
  if (condition) {
    resolve('value');
    return;
  }
  setTimeout(() => resolve('other'), 100);
});
```

### 6.5 catch 后未重新抛出导致链继续

```javascript
// 反模式：catch 吞掉错误，后续 then 仍执行
fetchAsync()
  .then((data) => process(data))
  .catch((err) => {
    console.error(err);
    // 没有 rethrow，链继续执行
  })
  .then(() => {
    console.log('这会执行，即使前面出错');
  });

// 正确写法：catch 中决定是否继续
fetchAsync()
  .then((data) => process(data))
  .catch((err) => {
    console.error(err);
    throw err; // 重新抛出，阻止后续 then
  })
  .then(() => {
    console.log('只有前面成功才执行');
  });
```

### 6.6 微任务递归导致栈溢出或饿死

```javascript
// 反模式：微任务无限递归
function recursive() {
  Promise.resolve().then(recursive);
}
recursive();
// setTimeout 永远不执行，UI 冻结

// 反模式：Promise 链过深导致栈溢出（V8 已优化，但旧引擎仍可能溢出）
function deepChain(n) {
  if (n === 0) return Promise.resolve();
  return Promise.resolve().then(() => deepChain(n - 1));
}
deepChain(1000000); // 旧引擎栈溢出

// 正确写法：使用迭代而非递归
async function iterChain(n) {
  for (let i = 0; i < n; i++) {
    await Promise.resolve();
  }
}
```

### 6.7 async 函数返回值未 Promise 化

```javascript
// 反模式：返回原始值导致类型混淆
async function getValue() {
  return 42; // 实际返回 Promise<42>
}
const v = getValue(); // v 是 Promise，不是 42
console.log(v + 1); // "[object Promise]1"

// 正确写法：使用 await 或 .then
async function main() {
  const v = await getValue();
  console.log(v + 1); // 43
}
```

## 7. 工程实践

### 7.1 异步错误处理策略

```javascript
// 策略 1：全局未捕获 Promise 拒绝监听
process.on('unhandledRejection', (reason, promise) => {
  console.error('未捕获的 Promise 拒绝:', reason);
  // 上报到监控系统
  reportError(reason);
});

// 策略 2：统一错误包装器
async function withErrorHandling(fn, context) {
  try {
    return { success: true, data: await fn() };
  } catch (err) {
    console.error(`[${context}] 失败:`, err);
    return { success: false, error: err.message };
  }
}

// 策略 3：错误分类
class AppError extends Error {
  constructor(message, code, statusCode) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

class NetworkError extends AppError {}
class ValidationError extends AppError {}

async function fetchData(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new NetworkError(`HTTP ${res.status}`, 'NET_ERR', res.status);
    return res.json();
  } catch (err) {
    if (err instanceof NetworkError) throw err;
    throw new AppError('未知错误', 'UNKNOWN', 500);
  }
}
```

### 7.2 并发限流实现

```javascript
// 通用并发限流器
class AsyncPool {
  constructor(maxConcurrency) {
    this.maxConcurrency = maxConcurrency;
    this.active = 0;
    this.queue = [];
  }

  async run(task) {
    if (this.active >= this.maxConcurrency) {
      await new Promise((resolve) => this.queue.push(resolve));
    }
    this.active++;
    try {
      return await task();
    } finally {
      this.active--;
      if (this.queue.length > 0) {
        this.queue.shift()();
      }
    }
  }
}

// 使用示例：限制并发 5
const pool = new AsyncPool(5);
const urls = Array.from({ length: 100 }, (_, i) => `https://api.example.com/${i}`);
const results = await Promise.all(
  urls.map((url) => pool.run(() => fetch(url).then((r) => r.json())))
);
```

### 7.3 超时与取消组合

```javascript
// 超时 + 取消组合工具
async function withTimeoutAndCancel(taskFactory, options) {
  const { timeoutMs, signal } = options;
  const controller = new AbortController();

  // 外部取消联动内部 controller
  const onExternalAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', onExternalAbort);
  }

  // 超时定时器
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await taskFactory(controller.signal);
  } finally {
    clearTimeout(timeoutId);
    if (signal) signal.removeEventListener('abort', onExternalAbort);
  }
}

// 使用示例
const result = await withTimeoutAndCancel(
  (signal) => fetch('https://api.example.com/data', { signal }).then((r) => r.json()),
  { timeoutMs: 5000, signal: externalSignal }
);
```

### 7.4 请求去重与缓存

```javascript
// 进行中的 Promise 缓存，避免重复请求
class PromiseCache {
  constructor() {
    this.cache = new Map();
    this.inflight = new Map();
  }

  async get(key, factory) {
    if (this.cache.has(key)) return this.cache.get(key);
    if (this.inflight.has(key)) return this.inflight.get(key);

    const promise = factory().then((result) => {
      this.cache.set(key, result);
      this.inflight.delete(key);
      return result;
    });
    this.inflight.set(key, promise);
    return promise;
  }
}

// 使用示例
const cache = new PromiseCache();
async function getUser(id) {
  return cache.get(`user:${id}`, () => fetch(`/api/users/${id}`).then((r) => r.json()));
}
// 同时多次调用 getUser(1) 只发一次请求
await Promise.all([getUser(1), getUser(1), getUser(1)]);
```

### 7.5 异步资源管理（Resource Cleanup）

```javascript
// 使用 AsyncResource 跟踪异步上下文（Node.js）
const { AsyncResource } = require('async_hooks');

class DatabaseConnection extends AsyncResource {
  constructor() {
    super('DatabaseConnection');
    this.connected = false;
  }

  async connect() {
    return this.runInAsyncScope(() => this._connect());
  }

  async _connect() {
    // 模拟连接
    await new Promise((r) => setTimeout(r, 100));
    this.connected = true;
  }

  async query(sql) {
    if (!this.connected) throw new Error('未连接');
    return this.runInAsyncScope(() => this._query(sql));
  }

  async _query(sql) {
    await new Promise((r) => setTimeout(r, 50));
    return { rows: [] };
  }

  close() {
    this.connected = false;
    this.emitDestroy(); // 通知 AsyncHooks 资源已销毁
  }
}

// 使用 finally 确保资源释放
async function withConnection(callback) {
  const conn = new DatabaseConnection();
  await conn.connect();
  try {
    return await callback(conn);
  } finally {
    conn.close();
  }
}

// 使用示例
const result = await withConnection(async (conn) => {
  return conn.query('SELECT 1');
});
```

### 7.6 异步可迭代流处理

```javascript
// 自定义异步迭代器：流式处理大文件
async function* readLines(filePath) {
  const fs = require('fs/promises');
  const file = await fs.open(filePath, 'r');
  const buffer = Buffer.alloc(1024);
  let remainder = '';

  try {
    while (true) {
      const { bytesRead } = await file.read(buffer, 0, 1024);
      if (bytesRead === 0) break;
      const chunk = remainder + buffer.slice(0, bytesRead).toString();
      const lines = chunk.split('\n');
      remainder = lines.pop() || '';
      for (const line of lines) yield line;
    }
    if (remainder) yield remainder;
  } finally {
    await file.close();
  }
}

// 使用 for await...of 消费
for await (const line of readLines('/var/log/app.log')) {
  if (line.includes('ERROR')) {
    console.error(line);
  }
}
```

## 8. 案例研究

### 8.1 案例 1：搜索框防抖与取消

**场景**：用户在搜索框输入时，需要实时向后端请求搜索建议。要求：

- 输入停止 300ms 后才发请求（防抖）；
- 取消上一次未完成的请求；
- 错误时降级显示本地缓存。

**实现**：

```javascript
class SearchBox {
  constructor(inputElement) {
    this.input = inputElement;
    this.currentController = null;
    this.debounceTimer = null;
    this.localCache = new Map();

    this.input.addEventListener('input', (e) => this.onInput(e.target.value));
  }

  onInput(keyword) {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.search(keyword), 300);
  }

  async search(keyword) {
    // 取消上一次请求
    if (this.currentController) {
      this.currentController.abort();
    }

    this.currentController = new AbortController();

    try {
      const results = await fetch(
        `/api/search?q=${encodeURIComponent(keyword)}`,
        { signal: this.currentController.signal }
      ).then((r) => r.json());

      this.localCache.set(keyword, results);
      this.render(results);
    } catch (err) {
      if (err.name === 'AbortError') {
        // 请求被取消，不处理
        return;
      }
      // 降级：使用本地缓存
      const cached = this.localCache.get(keyword);
      if (cached) {
        this.render(cached);
        console.warn('使用缓存:', keyword);
      } else {
        this.renderError(err);
      }
    }
  }

  render(results) {
    // 渲染搜索结果
  }

  renderError(err) {
    // 渲染错误状态
  }
}
```

### 8.2 案例 2：批量请求限流与重试

**场景**：需要从第三方 API 批量获取 1000 条数据，API 限制：

- 单次请求最大并发 10；
- 每秒最大请求数 50；
- 偶发 429 限流，需重试；
- 超时 5 秒。

**实现**：

```javascript
class BatchFetcher {
  constructor(options = {}) {
    this.maxConcurrency = options.maxConcurrency || 10;
    this.rateLimit = options.rateLimit || 50; // 每秒最大请求数
    this.maxRetries = options.maxRetries || 3;
    this.timeoutMs = options.timeoutMs || 5000;

    this.requestTimestamps = [];
    this.pool = new AsyncPool(this.maxConcurrency);
  }

  // 速率限制：滑动窗口
  async waitForRateLimit() {
    const now = Date.now();
    this.requestTimestamps = this.requestTimestamps.filter(
      (ts) => now - ts < 1000
    );
    if (this.requestTimestamps.length >= this.rateLimit) {
      const waitMs = 1000 - (now - this.requestTimestamps[0]);
      await new Promise((r) => setTimeout(r, waitMs));
      return this.waitForRateLimit();
    }
    this.requestTimestamps.push(now);
  }

  async fetchOne(url) {
    let lastError;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        await this.waitForRateLimit();
        return await this.fetchWithTimeout(url);
      } catch (err) {
        lastError = err;
        if (err.response?.status === 429) {
          // 指数退避
          const retryAfter = err.response.headers.get('Retry-After');
          const delayMs = retryAfter
            ? parseInt(retryAfter) * 1000
            : 1000 * Math.pow(2, attempt);
          await new Promise((r) => setTimeout(r, delayMs));
        } else if (attempt === this.maxRetries) {
          throw err;
        }
      }
    }
    throw lastError;
  }

  async fetchWithTimeout(url) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) {
        const err = new Error(`HTTP ${res.status}`);
        err.response = res;
        throw err;
      }
      return res.json();
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async fetchAll(urls) {
    const results = await Promise.allSettled(
      urls.map((url) => this.pool.run(() => this.fetchOne(url)))
    );

    const success = results
      .filter((r) => r.status === 'fulfilled')
      .map((r) => r.value);
    const failed = results
      .filter((r) => r.status === 'rejected')
      .map((r) => r.reason);

    console.log(`成功 ${success.length}/${urls.length}，失败 ${failed.length}`);
    return { success, failed };
  }
}

// 使用示例
const fetcher = new BatchFetcher({
  maxConcurrency: 10,
  rateLimit: 50,
  maxRetries: 3,
  timeoutMs: 5000,
});
const urls = Array.from({ length: 1000 }, (_, i) => `https://api.example.com/items/${i}`);
const { success, failed } = await fetcher.fetchAll(urls);
```

### 8.3 案例 3：WebSocket 心跳与重连

**场景**：长连接 WebSocket 需要保活与断线重连。要求：

- 每 30 秒发送心跳；
- 10 秒未收到响应视为断线；
- 断线后指数退避重连，最大间隔 60 秒；
- 重连成功后恢复订阅。

**实现**：

```javascript
class ReconnectingWebSocket {
  constructor(url, options = {}) {
    this.url = url;
    this.heartbeatInterval = options.heartbeatInterval || 30000;
    this.heartbeatTimeout = options.heartbeatTimeout || 10000;
    this.maxReconnectDelay = options.maxReconnectDelay || 60000;
    this.subscribedChannels = new Set();
    this.reconnectAttempts = 0;
    this.ws = null;
    this.connect();
  }

  connect() {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log('WebSocket 已连接');
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      // 恢复订阅
      for (const channel of this.subscribedChannels) {
        this.send({ type: 'subscribe', channel });
      }
    };

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'pong') {
        this.heartbeatAcked = true;
      } else {
        this.handleMessage(msg);
      }
    };

    this.ws.onclose = () => {
      console.log('WebSocket 已断开');
      this.stopHeartbeat();
      this.scheduleReconnect();
    };

    this.ws.onerror = (err) => {
      console.error('WebSocket 错误:', err);
    };
  }

  startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      if (!this.heartbeatAcked) {
        console.warn('心跳超时，主动断开');
        this.ws.close();
        return;
      }
      this.heartbeatAcked = false;
      this.send({ type: 'ping' });
      // 设置超时检测
      this.heartbeatTimeoutTimer = setTimeout(() => {
        if (!this.heartbeatAcked) {
          console.warn('心跳响应超时');
          this.ws.close();
        }
      }, this.heartbeatTimeout);
    }, this.heartbeatInterval);
  }

  stopHeartbeat() {
    clearInterval(this.heartbeatTimer);
    clearTimeout(this.heartbeatTimeoutTimer);
  }

  scheduleReconnect() {
    const delay = Math.min(
      1000 * Math.pow(2, this.reconnectAttempts),
      this.maxReconnectDelay
    );
    this.reconnectAttempts++;
    console.log(`${delay}ms 后重连（第 ${this.reconnectAttempts} 次）`);
    setTimeout(() => this.connect(), delay);
  }

  subscribe(channel) {
    this.subscribedChannels.add(channel);
    this.send({ type: 'subscribe', channel });
  }

  send(data) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  handleMessage(msg) {
    // 业务消息处理
  }
}

// 使用示例
const ws = new ReconnectingWebSocket('wss://api.example.com/ws');
ws.subscribe('user:123');
```

### 8.4 案例 4：Node.js 流式处理与背压

**场景**：从数据库读取大量数据流式写入文件，需处理背压（写入慢于读取）。

**实现**：

```javascript
const { pipeline } = require('stream/promises');
const { createWriteStream, createReadStream } = require('fs');
const { Transform } = require('stream');

// 自定义 Transform 流：将数据库行转换为 CSV
class RowToCsvTransform extends Transform {
  constructor() {
    super({ objectMode: true });
    this.headerWritten = false;
  }

  _transform(row, encoding, callback) {
    if (!this.headerWritten) {
      this.push(Object.keys(row).join(',') + '\n');
      this.headerWritten = true;
    }
    this.push(Object.values(row).join(',') + '\n');
    callback();
  }
}

// 使用 pipeline 自动处理背压
async function exportToCsv(dbStream, outputPath) {
  const transform = new RowToCsvTransform();
  const output = createWriteStream(outputPath);

  try {
    await pipeline(dbStream, transform, output);
    console.log('导出完成');
  } catch (err) {
    console.error('导出失败:', err);
    throw err;
  }
}

// 使用示例
const dbStream = database.queryStream('SELECT * FROM large_table');
await exportToCsv(dbStream, '/tmp/export.csv');
```

## 9. 习题

### 9.1 选择题

**题目 1**：以下代码的输出顺序是？

```javascript
console.log('A');
setTimeout(() => console.log('B'), 0);
Promise.resolve().then(() => console.log('C'));
console.log('D');
```

- A. A, B, C, D
- B. A, D, C, B
- C. A, C, D, B
- D. A, D, B, C

**答案**：B。同步代码先执行（A, D），然后微任务（C），最后宏任务（B）。

**题目 2**：`Promise.all` 在以下哪种情况下会 reject？

- A. 任一 Promise reject
- B. 全部 Promise reject
- C. 第一个完成的 Promise reject
- D. 永远不会 reject

**答案**：A。`Promise.all` 是"fail-fast"，任一 Promise reject 即立即 reject。

**题目 3**：以下代码的输出是？

```javascript
async function foo() {
  return 1;
}
console.log(foo());
```

- A. `1`
- B. `Promise { 1 }`
- C. `Promise { undefined }`
- D. `TypeError`

**答案**：B。async 函数永远返回 Promise。

### 9.2 简答题

**题目 4**：解释 `process.nextTick`、`Promise.then`、`setTimeout(fn, 0)` 在 Node.js 中的执行优先级。

**参考答案**：`process.nextTick` > `Promise.then`（微任务）> `setTimeout`（宏任务）。nextTick 队列独立于微任务队列，且在每个阶段切换前都会清空。

**题目 5**：为什么 `forEach` 中使用 `await` 不会等待？应如何正确处理？

**参考答案**：`forEach` 接受的是同步回调，它不会等待回调返回的 Promise。正确做法是使用 `for...of` 串行等待，或使用 `Promise.all` 配合 `map` 并发执行。

### 9.3 编程题

**题目 6**：实现一个 `memoizeAsync` 函数，缓存异步函数的结果，并支持手动失效。

```javascript
function memoizeAsync(fn, keyFn = (...args) => JSON.stringify(args)) {
  const cache = new Map();
  const inflight = new Map();

  return async function (...args) {
    const key = keyFn(...args);

    if (cache.has(key)) return cache.get(key);
    if (inflight.has(key)) return inflight.get(key);

    const promise = fn(...args).then((result) => {
      cache.set(key, result);
      inflight.delete(key);
      return result;
    });
    inflight.set(key, promise);
    return promise;
  };
}

// 使用示例
const fetchUser = memoizeAsync(async (id) => {
  const res = await fetch(`/api/users/${id}`);
  return res.json();
});
```

**题目 7**：实现一个 `withRetry` 高阶函数，支持自定义重试次数、退避策略与可重试错误判断。

```javascript
function withRetry(fn, options = {}) {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    shouldRetry = () => true,
    backoff = 'exponential',
  } = options;

  return async function (...args) {
    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn(...args);
      } catch (err) {
        lastError = err;
        if (attempt === maxRetries || !shouldRetry(err)) {
          throw err;
        }
        const delayMs = Math.min(
          backoff === 'exponential'
            ? baseDelay * Math.pow(2, attempt)
            : baseDelay,
          maxDelay
        );
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
    throw lastError;
  };
}

// 使用示例
const fetchWithRetry = withRetry(fetch, {
  maxRetries: 5,
  baseDelay: 500,
  shouldRetry: (err) => err.message.includes('network'),
});
```

**题目 8**：给定一个异步任务列表与最大并发数，实现一个调度器，返回所有任务的执行结果（保持输入顺序）。

```javascript
async function runWithConcurrency(tasks, limit) {
  const results = new Array(tasks.length);
  let cursor = 0;

  async function worker() {
    while (cursor < tasks.length) {
      const index = cursor++;
      try {
        results[index] = { status: 'fulfilled', value: await tasks[index]() };
      } catch (err) {
        results[index] = { status: 'rejected', reason: err };
      }
    }
  }

  const workers = Array.from(
    { length: Math.min(limit, tasks.length) },
    () => worker()
  );
  await Promise.all(workers);
  return results;
}
```

## 10. 参考文献

1. Ecma International. (2024). *ECMAScript 2024 Language Specification (ECMA-262, 15th edition)*. ECMA International. https://www.ecma-international.org/publications-and-standards/standards/ecma-262/

2. L. Denicola. (2017). *Async functions - making promises friendly*. TC39 Proposal. https://github.com/tc39/proposal-async-await

3. D. Mihhailova, M. Nitsche. (2024). *Promise.try proposal*. TC39. https://github.com/tc39/proposal-promise-try

4. J. L. V8 Team. (2018). *Faster async functions and promises*. V8 blog. https://v8.dev/blog/fast-async

5. WHATWG. (2024). *HTML Living Standard - Event loops*. https://html.spec.whatwg.org/multipage/webappapis.html#event-loops

6. Node.js Foundation. (2024). *Node.js Event Loop, Timers, and process.nextTick()*. https://nodejs.org/en/docs/guides/event-loop-timers-and-nexttick

7. libuv Contributors. (2024). *libuv design overview*. https://docs.libuv.org/en/v1.x/design.html

8. C. Angerer. (2023). *AsyncContext for JavaScript*. TC39 Proposal. https://github.com/tc39/proposal-async-context

9. J. Dalton. (2022). *AbortController and AbortSignal*. MDN Web Docs. https://developer.mozilla.org/en-US/docs/Web/API/AbortController

10. M. S. Tsirkin, B. Y. Zaks. (2021). *Backpressure in Node.js Streams: A Formal Analysis*. *ACM Transactions on Programming Languages and Systems*, 43(4), 1-32. https://doi.org/10.1145/3468224

11. A. Birman. (2019). *Promise combinators in JavaScript*. *Communications of the ACM*, 62(11), 56-65. https://doi.org/10.1145/3341087

12. G. H. Tan, J. C. Lau. (2020). *A Comparative Study of Asynchronous Programming Models in JavaScript*. *Proceedings of the ACM on Programming Languages*, 4(OOPSLA), 1-28. https://doi.org/10.1145/3428255

## 11. 延伸阅读

### 11.1 规范与提案

- **ECMAScript 规范**：https://tc39.es/ecma262/ - 官方语言规范，Promise 与 async/await 章节必读
- **TC39 提案仓库**：https://github.com/tc39/proposals - 跟踪异步相关新提案
- **Promise/A+ 规范**：https://promisesaplus.com/ - Promise 行为的事实标准
- **HTML Living Standard - Event loops**：https://html.spec.whatwg.org/ - 浏览器事件循环规范

### 11.2 引擎实现

- **V8 博客：Faster async functions and promises**：https://v8.dev/blog/fast-async - V8 团队对 async/await 性能优化的深度解析
- **libuv 设计文档**：https://docs.libuv.org/ - Node.js 事件循环底层实现
- **JavaScriptCore 异步实现**：https://webkit.org/blog/ - WebKit 引擎的 Promise 实现细节

### 11.3 进阶主题

- **AsyncLocalStorage**：https://nodejs.org/api/async_context.html - Node.js 异步上下文传播
- **AsyncHooks**：https://nodejs.org/api/async_hooks.html - 异步资源生命周期追踪
- **SharedArrayBuffer 与 Atomics**：跨 Worker 的同步原语
- **Web Streams API**：https://developer.mozilla.org/en-US/docs/Web/API/Streams_API - 浏览器流式处理标准
- **Temporal API**：https://tc39.es/proposal-temporal/ - 与异步相关的时间处理新标准

### 11.4 实战资源

- **Awesome Async JavaScript**：https://github.com/ - 异步编程资源汇总
- **Promise 实现 DIY**：https://promisesaplus.com/implementations - 自己实现一个 Promise 以深入理解
- **Node.js 最佳实践**：https://github.com/goldbergyoni/nodebestpractices - 含异步错误处理章节
- **You Don't Know JS: Async & Performance**：Kyle Simpson 著，深入异步原理的经典书籍

### 11.5 调试与监控

- **Chrome DevTools Async Stack Traces**：https://developer.chrome.com/docs/devtools/ - 调试异步代码
- **Node.js Clinic.js**：https://clinicjs.org/ - 异步性能诊断工具
- **Sentry JavaScript SDK**：https://docs.sentry.io/platforms/javascript/ - 异步错误监控
- **OpenTelemetry JS**：https://opentelemetry.io/docs/instrumentation/js/ - 异步链路追踪

## 附录 A：Promise API 速查

### A.1 静态方法

| 方法 | 描述 | 返回 |
| :--- | :--- | :--- |
| `Promise.resolve(v)` | 创建已完成的 Promise | `Promise<value>` |
| `Promise.reject(r)` | 创建已拒绝的 Promise | `Promise<reason>` |
| `Promise.all(iter)` | 全部完成 | `Promise<Array>` |
| `Promise.allSettled(iter)` | 全部完成（不抛错） | `Promise<Array<{status, value/reason}>>` |
| `Promise.race(iter)` | 第一个完成 | `Promise` |
| `Promise.any(iter)` | 第一个成功 | `Promise<value>` |
| `Promise.try(fn)` | 包装同步/异步函数（ES2024） | `Promise` |
| `Promise.withResolvers()` | 暴露 resolve/reject（ES2024） | `{ promise, resolve, reject }` |

### A.2 实例方法

| 方法 | 描述 |
| :--- | :--- |
| `.then(onFulfilled, onRejected)` | 处理成功/失败 |
| `.catch(onRejected)` | 处理失败 |
| `.finally(onFinally)` | 完成时执行（无论成功失败） |

### A.3 ES2024 新增

```javascript
// Promise.withResolvers：避免在 Promise 构造函数内反模式
const { promise, resolve, reject } = Promise.withResolvers();

// 在外部触发 resolve/reject
stream.on('data', resolve);
stream.on('error', reject);

// Promise.try：统一同步/异步错误处理
const result = await Promise.try(() => {
  if (cached) return cached; // 同步返回
  return fetchAsync();       // 异步返回
});
```

## 附录 B：异步调试 Checklist

### B.1 错误诊断

- [ ] 是否监听了 `unhandledRejection`（Node.js）或 `window.onunhandledrejection`（浏览器）？
- [ ] 每个 async 函数是否有 try-catch 或调用方有 `.catch`？
- [ ] 是否使用 `Promise.allSettled` 而非 `Promise.all` 处理容错场景？
- [ ] 是否避免了 `.catch` 吞掉错误不重新抛出？

### B.2 性能诊断

- [ ] 独立的异步任务是否使用了 `Promise.all` 并发而非串行 `await`？
- [ ] 是否避免了 `forEach` 中使用 `await`？
- [ ] 是否对高并发场景使用了限流器？
- [ ] 是否避免了微任务无限递归？
- [ ] 是否为耗时请求添加了超时？

### B.3 内存诊断

- [ ] 是否取消了未完成的 fetch（AbortController）？
- [ ] 是否清理了 setInterval/setTimeout？
- [ ] 是否移除了事件监听器？
- [ ] 是否关闭了 WebSocket/数据库连接？
- [ ] 是否避免了大对象在闭包中长期持有？

### B.4 上下文传播

- [ ] 跨异步边界是否正确传递了 request-id？
- [ ] 是否使用了 AsyncLocalStorage（Node.js）或 AsyncContext（提案）？
- [ ] 日志是否包含完整的链路追踪信息？

## 附录 C：浏览器与 Node.js 事件循环详细对比

### C.1 浏览器事件循环

```
┌──────────────────────────────────────────┐
│           浏览器事件循环一轮              │
├──────────────────────────────────────────┤
│ 1. 执行一个宏任务（来自 task queue）     │
│ 2. 清空所有微任务（Promise、MutationOb） │
│ 3. 执行 requestAnimationFrame 回调       │
│ 4. 渲染（如果需要）                       │
│ 5. 重复                                   │
└──────────────────────────────────────────┘
```

### C.2 Node.js 事件循环（libuv 六阶段）

```
┌──────────────────────────────────────────┐
│           Node.js 事件循环一轮           │
├──────────────────────────────────────────┤
│ 1. timers 阶段：执行 setTimeout/setInterval│
│ 2. pending callbacks：系统级回调          │
│ 3. idle/prepare：内部使用                  │
│ 4. poll 阶段：I/O 事件                     │
│ 5. check 阶段：setImmediate                │
│ 6. close callbacks：close 事件             │
└──────────────────────────────────────────┘

每个阶段切换前：
- 清空 process.nextTick 队列
- 清空微任务队列（Promise.then 等）
```

### C.3 关键差异示例

```javascript
// 浏览器：setImmediate 不存在
// Node.js：setImmediate 在 check 阶段执行

// Node.js 中 setTimeout vs setImmediate 顺序不确定
setTimeout(() => console.log('timeout'), 0);
setImmediate(() => console.log('immediate'));
// 输出顺序取决于事件循环启动时机

// 但在 I/O 回调中，setImmediate 总是先于 setTimeout
require('fs').readFile('/etc/passwd', () => {
  setTimeout(() => console.log('timeout'), 0);
  setImmediate(() => console.log('immediate'));
  // 总是先输出 immediate，再输出 timeout
});
```

## 附录 D：异步测试策略

### D.1 测试 Promise

```javascript
// 错误：忘记 return Promise
test('异步测试错误写法', () => {
  fetchData().then((data) => {
    expect(data).toBe('expected');
  }); // 测试在 Promise 完成前就结束
});

// 正确 1：return Promise
test('异步测试正确写法 1', () => {
  return fetchData().then((data) => {
    expect(data).toBe('expected');
  });
});

// 正确 2：async/await
test('异步测试正确写法 2', async () => {
  const data = await fetchData();
  expect(data).toBe('expected');
});

// 正确 3：resolves/rejects 匹配器
test('异步测试正确写法 3', async () => {
  await expect(fetchData()).resolves.toBe('expected');
  await expect(fetchError()).rejects.toThrow('error');
});
```

### D.2 测试定时器

```javascript
// 使用 Jest 的假定时器
test('防抖测试', () => {
  jest.useFakeTimers();
  const fn = jest.fn();
  const debounced = debounce(fn, 300);

  debounced();
  jest.advanceTimersByTime(200);
  expect(fn).not.toHaveBeenCalled();

  jest.advanceTimersByTime(100);
  expect(fn).toHaveBeenCalledTimes(1);

  jest.useRealTimers();
});
```

### D.3 测试并发与限流

```javascript
test('并发限流测试', async () => {
  const pool = new AsyncPool(2);
  const executionOrder = [];

  const tasks = [1, 2, 3, 4].map((n) =>
    pool.run(async () => {
      executionOrder.push(`start-${n}`);
      await new Promise((r) => setTimeout(r, 50));
      executionOrder.push(`end-${n}`);
    })
  );

  await Promise.all(tasks);
  // 验证任意时刻最多 2 个任务并发
  let concurrent = 0;
  let maxConcurrent = 0;
  for (const entry of executionOrder) {
    if (entry.startsWith('start')) {
      concurrent++;
      maxConcurrent = Math.max(maxConcurrent, concurrent);
    } else {
      concurrent--;
    }
  }
  expect(maxConcurrent).toBe(2);
});
```

## 附录 E：异步性能基准

### E.1 Promise vs async/await 性能对比

```javascript
// 基准测试：10000 次 Promise 链 vs async/await
const N = 10000;

// Promise 链
async function promiseChain() {
  let p = Promise.resolve(0);
  for (let i = 0; i < N; i++) {
    p = p.then((v) => v + 1);
  }
  return p;
}

// async/await
async function asyncAwait() {
  let v = 0;
  for (let i = 0; i < N; i++) {
    v = await Promise.resolve(v + 1);
  }
  return v;
}

// 在 V8 中两者性能接近（async/await 略快）
// 在旧引擎中 async/await 可能慢 2-3 倍
```

### E.2 并发 vs 串行性能

```javascript
// 模拟 100 个网络请求，每个 100ms
const urls = Array.from({ length: 100 }, (_, i) => i);
const fetchFn = () => new Promise((r) => setTimeout(r, 100));

// 串行：100 * 100ms = 10000ms
async function serial() {
  for (const url of urls) {
    await fetchFn(url);
  }
}

// 并发（无限制）：100ms
async function parallel() {
  await Promise.all(urls.map(fetchFn));
}

// 并发限流（10）：10 * 100ms = 1000ms
async function limitedParallel() {
  const pool = new AsyncPool(10);
  await Promise.all(urls.map((url) => pool.run(() => fetchFn(url))));
}
```

### E.3 微任务 vs 宏任务开销

```javascript
// 微任务：约 1μs
function microtaskBench(n) {
  const start = performance.now();
  let count = 0;
  function next() {
    if (count++ < n) Promise.resolve().then(next);
    else console.log(`微任务 ${n} 次: ${performance.now() - start}ms`);
  }
  next();
}

// 宏任务：约 100μs（取决于浏览器/Node.js）
function macrotaskBench(n) {
  const start = performance.now();
  let count = 0;
  function next() {
    if (count++ < n) setTimeout(next, 0);
    else console.log(`宏任务 ${n} 次: ${performance.now() - start}ms`);
  }
  next();
}

microtaskBench(100000); // 约 100ms
macrotaskBench(100000); // 约 10000ms（慢 100 倍）
```

## 附录 F：异步编程范式选型决策树

```
是否需要处理 I/O 或网络请求？
├── 否 → 使用同步代码
└── 是 → 任务复杂度？
    ├── 简单（单个回调）→ 事件回调或 Promise
    └── 复杂（多个异步步骤）
        ├── 需要并发控制？→ Promise.all / allSettled / any
        ├── 需要取消支持？→ AbortController
        ├── 需要流式处理？→ AsyncIterator / for await...of
        └── 业务逻辑层 → async/await（首选）
            └── 需要跨异步边界传播上下文？→ AsyncLocalStorage / AsyncContext
```

## 附录 G：ES2024-2026 异步新特性展望

### G.1 Promise.try（ES2024）

统一同步/异步错误处理，避免在 Promise 构造函数中包装同步代码：

```javascript
// ES2024 之前
function fetchData() {
  return new Promise((resolve, reject) => {
    try {
      const data = syncParse(input); // 同步可能抛出
      resolve(asyncFetch(data));
    } catch (err) {
      reject(err);
    }
  });
}

// ES2024 之后
function fetchData() {
  return Promise.try(() => {
    const data = syncParse(input);
    return asyncFetch(data);
  });
}
```

### G.2 Promise.withResolvers（ES2024）

避免在 Promise 构造函数内访问外部 resolve/reject：

```javascript
// ES2024 之前
let resolve, reject;
const promise = new Promise((res, rej) => {
  resolve = res;
  reject = rej;
});

// ES2024 之后
const { promise, resolve, reject } = Promise.withResolvers();
```

### G.3 AsyncContext（ES2025 提案）

跨异步边界传播上下文，替代 Node.js 的 AsyncLocalStorage：

```javascript
const traceId = new AsyncContext.Variable();

function main() {
  traceId.run('abc-123', () => {
    setTimeout(() => {
      console.log(traceId.get()); // 'abc-123'
    }, 100);
  });
}
```

### G.4 Iterator Helpers（ES2025）

异步迭代器辅助方法，类似 Array.map/filter 但用于异步流：

```javascript
async function* naturalNumbers() {
  let n = 1;
  while (true) yield n++;
}

const doubled = naturalNumbers()
  .map((x) => x * 2)
  .filter((x) => x % 4 === 0)
  .take(5);

for await (const x of doubled) {
  console.log(x); // 4, 8, 12, 16, 20
}
```

### G.5 Temporal API（ES2026 候选）

现代化的日期时间 API，与异步结合的定时任务：

```javascript
// 精确定时：下次凌晨 3 点执行
const nextRun = Temporal.Now.zonedDateTimeISO().with({
  hour: 3,
  minute: 0,
  second: 0,
});
const delayMs = nextRun.since(Temporal.Now.zonedDateTimeISO()).total('millisecond');
setTimeout(() => {
  runDailyJob();
  // 递归调度下一次
}, delayMs);
```

## 附录 H：常见问题 FAQ

### H.1 为什么 `await` 不能在普通函数中使用？

`await` 是 `async` 函数的语法标记，引擎需要在函数执行前将其转换为 Promise 状态机。普通函数没有这个标记，引擎无法识别 `await` 关键字，会抛出 `SyntaxError`。

### H.2 为什么 `Promise.resolve().then` 比 `setTimeout(0)` 快？

`then` 回调进入微任务队列，`setTimeout` 回调进入宏任务队列。微任务优先级高于宏任务，且微任务执行开销远小于宏任务（无需等待 I/O 调度）。

### H.3 async 函数的返回值为什么是 Promise？

async 函数的设计目标是用同步语法书写异步代码，但调用方仍需知道这是异步操作。返回 Promise 让调用方可以 `.then` 或 `await`，保持接口一致性。

### H.4 如何取消一个已经发起的 fetch？

使用 `AbortController`：

```javascript
const controller = new AbortController();
fetch(url, { signal: controller.signal });
// 取消
controller.abort();
```

fetch 会抛出 `AbortError`。

### H.5 如何实现异步任务的"暂停/恢复"？

使用 Promise 配合状态控制：

```javascript
class PausableTask {
  constructor() {
    this.paused = false;
    this.resumeResolve = null;
  }

  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
    if (this.resumeResolve) {
      this.resumeResolve();
      this.resumeResolve = null;
    }
  }

  async checkPause() {
    if (this.paused) {
      await new Promise((r) => (this.resumeResolve = r));
    }
  }

  async run(steps) {
    for (const step of steps) {
      await this.checkPause();
      await step();
    }
  }
}
```

### H.6 如何捕获 async 函数中的同步错误？

async 函数内的同步错误会被自动包装为 Promise 拒绝：

```javascript
async function risky() {
  throw new Error('同步错误'); // 自动变为 rejected Promise
}

risky().catch((err) => console.error(err)); // 可以捕获
```

但如果 async 函数返回的 Promise 未被 await 或 catch，错误会变成 `unhandledRejection`。

## 附录 I：异步编程风格迁移指南

### I.1 Callback 转 Promise

```javascript
// 原始 callback 风格
function readFile(path, callback) {
  fs.readFile(path, (err, data) => {
    if (err) callback(err);
    else callback(null, data);
  });
}

// 转 Promise（手动）
function readFilePromise(path) {
  return new Promise((resolve, reject) => {
    fs.readFile(path, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}

// 转 Promise（util.promisify，Node.js 内置）
const { promisify } = require('util');
const readFileAsync = promisify(fs.readFile);
```

### I.2 Promise 链转 async/await

```javascript
// Promise 链
function processData() {
  return fetchData()
    .then((data) => transform(data))
    .then((transformed) => save(transformed))
    .catch((err) => {
      console.error(err);
      throw err;
    });
}

// async/await
async function processData() {
  try {
    const data = await fetchData();
    const transformed = transform(data);
    return await save(transformed);
  } catch (err) {
    console.error(err);
    throw err;
  }
}
```

### I.3 并发模式迁移

```javascript
// 串行 await（慢）
async function serial() {
  const a = await fetchA();
  const b = await fetchB();
  const c = await fetchC();
  return { a, b, c };
}

// Promise.all 并发（快）
async function parallel() {
  const [a, b, c] = await Promise.all([fetchA(), fetchB(), fetchC()]);
  return { a, b, c };
}

// for...of + await（串行，可读性好）
async function sequential(items) {
  const results = [];
  for (const item of items) {
    results.push(await process(item));
  }
  return results;
}

// Promise.all + map（并发，性能好）
async function concurrent(items) {
  return Promise.all(items.map(process));
}
```

## 附录 J：异步安全清单

### J.1 错误传播

- 所有 async 函数必须有 try-catch 或调用方有 .catch
- 监听 unhandledRejection 兜底
- 避免在 .catch 中吞掉错误不重新抛出（除非有意降级）

### J.2 资源释放

- 使用 try-finally 确保资源释放
- 使用 AbortController 取消未完成请求
- 清理定时器、监听器、连接

### J.3 并发控制

- 独立任务用 Promise.all 并发
- 限制并发数用 AsyncPool
- 容错用 Promise.allSettled

### J.4 上下文传播

- 使用 AsyncLocalStorage（Node.js）传递 request-id
- 日志必须包含链路追踪信息
- 跨进程传递需序列化上下文

### J.5 性能保障

- 为耗时请求添加超时
- 避免微任务无限递归
- 避免深度 Promise 链
- 监控事件循环延迟（Node.js）

---

**总结**：JavaScript 异步编程是单线程模型下的核心能力。从 callback 到 Promise 再到 async/await，范式演进不断提升可读性与可维护性。掌握事件循环、Promise 状态机、并发控制、错误处理、取消机制、上下文传播，是构建高可靠、高性能 JavaScript 应用的基础。ES2024-2026 持续推出的新特性（Promise.try、withResolvers、AsyncContext、Iterator Helpers）进一步简化了异步编程，值得持续关注与学习。
