---
order: 62
title: 网络请求API
module: javascript
category: JavaScript
tags:
  - JavaScript
  - Fetch
  - AbortController
  - Streams
  - ServiceWorker
  - GraphQL
  - HTTP
  - 异步编程
difficulty: advanced
description: 深入解析 WHATWG Fetch 标准、AbortController 取消语义、Web Streams API、Service Worker 缓存策略、GraphQL 客户端实现等高级主题,涵盖 MIT 6.S081 / Stanford CS107 级别的工程实践
author: fanquanpp
updated: '2026-07-20'
lastReviewed: '2026-07-20'
reviewer: FANDEX Content Engineering Team
related:
  - javascript/自定义Error
  - javascript/浏览器对象模型
  - javascript/Web存储API
  - javascript/索引数据库
  - javascript/Promise构造器
  - javascript/生成器函数
prerequisites:
  - javascript/语法速查
  - javascript/Promise构造器
  - javascript/事件循环
learningObjectives:
  - '{''cognitiveLevel'': ''remember'', ''description'': ''记住 Fetch API 的核心抽象(Request/Response/Headers)、WHATWG Fetch 标准的定位与生命周期''}'
  - '{''cognitiveLevel'': ''understand'', ''description'': ''理解 AbortController/AbortSignal 的取消语义模型,阐释 Promise 与取消信号的组合原理''}'
  - '{''cognitiveLevel'': ''understand'', ''description'': ''阐释 Web Streams API 的三种流(Readable/Writable/Transform)形式化定义与背压(backpressure)机制''}'
  - '{''cognitiveLevel'': ''apply'', ''description'': ''使用 Fetch + AbortController + Streams 实现带超时、取消、下载进度的生产级 HTTP 客户端''}'
  - '{''cognitiveLevel'': ''analyze'', ''description'': ''分析 Service Worker 缓存策略(Cache First/Network First/Stale-While-Revalidate)的适用场景与权衡''}'
  - '{''cognitiveLevel'': ''evaluate'', ''description'': ''评估 Fetch 与 XMLHttpRequest、axios、GraphQL 客户端在不同场景下的优劣,选择合适的网络栈''}'
  - '{''cognitiveLevel'': ''create'', ''description'': ''设计并实现一个支持重试、熔断、限流、并发控制的分布式 HTTP 客户端框架''}'
exercises:
  - id: fetch-ex-001
    type: fill-blank
    cognitiveLevel: remember
    question: Fetch API 由 ______ 标准化,其核心抽象包括 Request、______ 与 Headers 三类对象。
    hint: 该标准与 HTML Living Standard 同属一个组织维护,Response 对象封装了响应数据。
    answer: WHATWG; Response
    explanation: WHATWG(Web Hypertext Application Technology Working Group)维护 Fetch Living Standard,定义了 Request、Response、Headers 三大核心抽象,以及 fetch() 函数的行为。
    difficulty: easy
  - id: fetch-ex-002
    type: choice
    cognitiveLevel: understand
    question: |
      下列关于 fetch() 返回的 Promise 的描述,哪一项是正确的?
      A. 收到 HTTP 4xx/5xx 状态码时,Promise 会自动 reject
      B. 网络错误(如 DNS 解析失败)会导致 Promise reject
      C. fetch() 的 Promise 一旦 resolve 就无法取消
      D. fetch() 不支持跨域请求,需要后端配合 CORS
    hint: Fetch 的核心设计原则之一是"HTTP 错误不是网络错误",取消通过 AbortSignal 实现。
    answer: B
    explanation: |
      fetch() 只在网络层错误(DNS、连接拒绝、CORS 失败)时 reject Promise。
      HTTP 4xx/5xx 不会 reject,需要通过 response.ok 或 response.status 判断。
      通过 signal: controller.signal 可在 resolve 之前取消请求。
      fetch 支持跨域,但需要服务端响应 CORS 头。
    difficulty: medium
  - id: fetch-ex-003
    type: code-fix
    cognitiveLevel: apply
    question: |
      以下代码意图实现"5 秒超时自动取消请求",但超时后请求并未被取消。请修复。
      ```javascript
      async function fetchWithTimeout(url, ms = 5000) {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), ms);
        try {
          const response = await fetch(url);
          return await response.json();
        } catch (err) {
          console.log('请求失败:', err.name);
        }
      }
      ```
    hint: 检查 fetch 调用是否将 controller.signal 作为参数传入。
    answer: |
      ```javascript
      async function fetchWithTimeout(url, ms = 5000) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), ms);
        try {
          const response = await fetch(url, { signal: controller.signal });
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          return await response.json();
        } catch (err) {
          if (err.name === 'AbortError') {
            console.log('请求超时被取消');
          } else {
            console.log('请求失败:', err.message);
          }
          throw err;
        } finally {
          clearTimeout(timer);
        }
      }
      ```
    explanation: |
      修复要点:
      (1) 必须将 controller.signal 作为 fetch 第二参数的 signal 属性传入,否则 abort() 不会影响 fetch;
      (2) 应在 finally 中 clearTimeout,避免已完成的请求仍触发 abort;
      (3) 应区分 AbortError 与其他错误,提供精确的错误处理;
      (4) 应检查 response.ok,因为 HTTP 4xx/5xx 不会 reject。
    difficulty: medium
  - id: fetch-ex-004
    type: open-ended
    cognitiveLevel: create
    question: |
      设计一个"智能重试"HTTP 客户端,要求:
      1. 对网络错误与 5xx 状态码自动重试,4xx 不重试
      2. 采用指数退避策略(base * 2^n),最多 3 次
      3. 支持自定义重试谓词
      4. 支持取消(传入 AbortSignal)
      5. 记录每次重试的延迟与状态
      请写出完整实现并讨论权衡。
    hint: 使用递归或 while 循环实现重试,在每次重试前 await sleep(delay),检查 signal.aborted。
    answer: |
      ```javascript
      async function fetchRetry(url, options = {}, {
        retries = 3,
        baseDelay = 1000,
        maxDelay = 30000,
        retryOn = (err, resp) => err !== null || (resp && resp.status >= 500),
        signal,
        onRetry,
      } = {}) {
        let lastError = null;
        for (let attempt = 0; attempt <= retries; attempt++) {
          if (signal?.aborted) {
            throw new DOMException('Aborted', 'AbortError');
          }
          try {
            const response = await fetch(url, { ...options, signal });
            if (!retryOn(null, response)) {
              return response;
            }
            lastError = new Error(`HTTP ${response.status}`);
          } catch (err) {
            lastError = err;
            if (!retryOn(err, null)) {
              throw err;
            }
          }
          if (attempt < retries) {
            const delay = Math.min(
              baseDelay * Math.pow(2, attempt) + Math.random() * 100,
              maxDelay
            );
            onRetry?.({ attempt: attempt + 1, delay, error: lastError });
            await new Promise((resolve) => {
              const t = setTimeout(resolve, delay);
              signal?.addEventListener('abort', () => {
                clearTimeout(t);
                resolve();
              }, { once: true });
            });
          }
        }
        throw lastError;
      }
      ```
    explanation: |
      权衡:
      (1) 默认 retryOn 对 5xx 重试,避免 4xx 重试浪费资源;
      (2) 指数退避+抖动(jitter)避免惊群效应;
      (3) onRetry 回调让调用方观察重试过程,便于日志/监控;
      (4) 在 sleep 中监听 signal.aborted,实现取消优先于重试;
      (5) attempt <= retries 确保最后一次失败后抛出错误;
      (6) 生产级实现还需考虑幂等性(GET/PUT 可重试,POST 需谨慎)。
    difficulty: hard
references:
  - type: standard
    authors:
      - WHATWG
    year: 2025
    title: 'Fetch Standard'
    venue: WHATWG Living Standard
    url: https://fetch.spec.whatwg.org/
  - type: standard
    authors:
      - WHATWG
    year: 2025
    title: 'Streams Standard'
    venue: WHATWG Living Standard
    url: https://streams.spec.whatwg.org/
  - type: standard
    authors:
      - W3C
    year: 2024
    title: 'Service Worker 1'
    venue: W3C Candidate Recommendation
    url: https://www.w3.org/TR/service-workers-1/
  - type: standard
    authors:
      - ECMA International
    year: 2025
    title: 'ECMAScript 2025 Language Specification (ECMA-262, 16th Edition)'
    venue: ECMA Standard
    doi: 10.17445/ECMA-262
    url: https://tc39.es/ecma262/
  - type: journal
    authors:
      - Anne van Kesteren
    year: 2015
    title: 'Fetch: a modern replacement for XMLHttpRequest'
    venue: 'WHATWG Blog'
    url: https://blog.whatwg.org/fetching-resources
  - type: journal
    authors:
      - Domenic Denicola
    year: 2016
    title: 'Streams API: The Web Stream API Explained'
    venue: 'GitHub WICG/streams'
    url: https://github.com/whatwg/streams/blob/main/FAQ.md
  - type: journal
    authors:
      - Jake Archibald
    year: 2015
    title: 'Service Worker gotchas'
    venue: 'Smashing Magazine'
    url: https://www.smashingmagazine.com/2016/02/service-worker-going-beyond-offline/
  - type: book
    authors:
      - Thomas Parisot
    year: 2021
    title: 'HTTP/2 in Action'
    venue: Manning Publications
    url: https://www.manning.com/books/http2-in-action
  - type: book
    authors:
      - Addy Osmani
    year: 2019
    title: 'Image Optimization'
    venue: O'Reilly Media
    url: https://www.oreilly.com/library/view/image-optimization/9781492050278/
etymology:
  - term: Fetch
    english: Fetch
    origin: 源自古英语 "feccan"(取来、获取),计算机网络语境下指"从远程资源获取数据",WHATWG 选用此名替代冗长的 XMLHttpRequest。
  - term: AbortController
    english: AbortController
    origin: '"abort" 源自拉丁语 "aboriri"(流产、中途失败),Controller 即控制器。该 API 提供一种通用的取消机制,可中断 fetch、IndexedDB、Stream 等异步操作。'
  - term: Stream
    english: Stream
    origin: 源自古英语 "strēam"(水流、河流),计算机科学中指"按顺序到达的数据序列",Web Streams API 模仿 Unix 管道,让数据分块流动。
  - term: Service Worker
    english: Service Worker
    origin: '"Service" 指后台服务,"Worker" 指 Web Worker(独立线程的脚本)。Service Worker 是一种在浏览器后台运行的脚本,充当网页与网络之间的可编程代理。'
  - term: Backpressure
    english: Backpressure
    origin: '"back"(反向)+ "pressure"(压力),源自流体力学,指管道中下游阻塞导致上游压力反向传导。在 Stream 中指消费者速度慢于生产者时,反向通知生产者减速的机制。'
---

# 网络请求 API

> 本文是 FANDEX JavaScript 模块的核心工程文档之一,定位为 MIT 6.S081 / Stanford CS107 / CMU 15-410 级别的工程教学材料,涵盖 WHATWG Fetch 标准、AbortController 取消语义、Web Streams API、Service Worker 缓存策略、GraphQL 客户端实现等。

## 0. 学习导览

### 0.1 学习路径

```
HTTP 基础 → XMLHttpRequest 演进 → Fetch 标准 → Request/Response/Headers
   → AbortController 取消 → Web Streams API → Service Worker → Cache API
   → 缓存策略 → CORS 与认证 → GraphQL → 重试/熔断/限流 → 生产级框架
```

### 0.2 前置知识

- 熟悉 HTTP/1.1 协议(方法、状态码、头部、报文)
- 理解 Promise 与 async/await
- 了解浏览器同源策略与 CORS
- 掌握基本的事件循环与微任务调度

### 0.3 阅读建议

- 第一遍:Fetch 基础、Request/Response/Headers 三大对象
- 第二遍:AbortController 与 Streams,理解取消与背压
- 第三遍:Service Worker 缓存策略与生产级框架
- 实战:按习题顺序实现超时、重试、并发控制

---

## 1. 历史动机与技术演进

### 1.1 网络请求 API 的三代演进

| 时代          | 代表 API                       | 优势                            | 劣势                                |
| ------------- | ------------------------------ | ------------------------------- | ----------------------------------- |
| 2000-2010     | XMLHttpRequest (XHR)           | 浏览器原生支持                  | 回调地狱、API 繁琐、无流式处理      |
| 2010-2015     | jQuery.ajax / axios / SuperAgent | Promise 支持、拦截器、转换器  | 仍是 XHR 的封装、未利用新特性       |
| 2015-至今     | Fetch API                      | Promise 原生、Streams、AbortSignal | 缺少拦截器、超时需自行实现         |

### 1.2 XMLHttpRequest 的设计缺陷

XMLHttpRequest 诞生于 1999 年 IE 5.0,最初由微软设计为 Outlook Web Access 的底层支撑,后被其他浏览器采纳并标准化。它的设计缺陷包括:

1. **回调地狱**:基于事件回调(onreadystatechange),难以组合
2. **API 不一致**:同步/异步切换、responseType 设置时机等陷阱
3. **无流式处理**:必须等整个响应体到达才能处理
4. **无取消机制**:abort() 强制中止,无法精细控制
5. **无 Promise**:无法使用 async/await
6. **状态机复杂**:readyState 0/1/2/3/4 五种状态,语义模糊

```javascript
// XHR 的典型写法
const xhr = new XMLHttpRequest();
xhr.open('GET', '/api/users', true);
xhr.onreadystatechange = function () {
  if (xhr.readyState === 4 && xhr.status === 200) {
    console.log(JSON.parse(xhr.responseText));
  }
};
xhr.onerror = function () {
  console.error('请求失败');
};
xhr.send();
```

### 1.3 Fetch API 的设计目标

WHATWG 在 2015 年发布 Fetch Standard,设计目标包括:

1. **Promise 优先**:所有操作返回 Promise,原生支持 async/await
2. **流式处理**:Response.body 是 ReadableStream,支持分块读取
3. **可取消**:通过 AbortSignal 实现统一的取消语义
4. **抽象一致**:Request/Response/Headers 三类对象,可独立构造
5. **Service Worker 友好**:作为 Service Worker 拦截的网络原语
6. **CORS 透明**:模式(mode)显式声明,行为可预测

### 1.4 关键人物与里程碑

- **Anne van Kesteren**(WHATWG):Fetch 标准主编,Opera/Chrome 工程师
- **Domenic Denicola**(Google):Streams API 主要贡献者,Promise/A+ 作者之一
- **Jake Archibald**(Google):Service Worker 布道者,PWA 离线方案推动者
- **Alex Russell**(Google):PWA 概念提出者,Service Worker 设计参与者

| 年份    | 事件                                                            |
| ------- | --------------------------------------------------------------- |
| 1999    | 微软在 IE 5.0 中引入 XMLHTTP ActiveX                            |
| 2005    | Jesse James Garrett 提出 "Ajax" 概念                            |
| 2006    | jQuery 1.0 内置 $.ajax,封装 XHR                                |
| 2010    | axios 项目启动,基于 Promise 的 XHR 封装                        |
| 2015    | WHATWG 发布 Fetch Living Standard,Chrome 42 实现首版           |
| 2015    | Web Streams API 草案发布                                        |
| 2015    | Service Worker 在 Chrome 40 进入稳定版                          |
| 2017    | Fetch 在所有主流浏览器稳定支持                                  |
| 2018    | AbortController 在所有主流浏览器稳定支持                        |
| 2019    | Web Streams API 在所有主流浏览器稳定支持                        |
| 2023    | Service Worker 在 iOS Safari 完整支持                           |
| 2024    | Fetch 标准持续演进,加入 Priority Hints、Background Sync 等     |

### 1.5 Fetch 解决的核心问题

1. **回调地狱 → Promise 链**:天然支持 async/await
2. **一次性响应 → 流式响应**:支持下载进度、大文件分块处理
3. **不可取消 → 可取消**:AbortSignal 统一取消抽象
4. **紧耦合 → 解耦**:Request/Response/Headers 可独立构造与传递
5. **手动 CORS → 模式声明**:mode: 'cors' / 'no-cors' / 'same-origin' 显式控制

---

## 2. 形式化定义

### 2.1 HTTP 请求的代数模型

定义 HTTP 请求 $R$ 为六元组:

$$
R = \langle M, U, H, B, C, S \rangle
$$

- $M$:HTTP 方法(GET/POST/PUT/DELETE/PATCH/HEAD/OPTIONS)
- $U$:URL,符合 RFC 3986
- $H$:头部集合,$H \subseteq \text{HeaderName} \times \text{HeaderValue}$
- $B$:请求体,$B \in \text{Bytes} \cup \{\bot\}$
- $C$:连接模式(keep-alive、HTTP/2 多路复用)
- $S$:取消信号,$S \in \text{AbortSignal} \cup \{\bot\}$

### 2.2 HTTP 响应的代数模型

定义 HTTP 响应 $R'$ 为五元组:

$$
R' = \langle S, H, B, T, U \rangle
$$

- $S$:状态码,$S \in [100, 599] \cap \mathbb{Z}$
- $H$:响应头部
- $B$:响应体,作为 ReadableStream
- $T$: trailers(HTTP/2 尾部头部)
- $U$:最终 URL(重定向后)

### 2.3 fetch 函数的语义

fetch 函数的形式语义:

$$
\text{fetch}(R) : \text{Promise}[\text{Response}] \cup \{\text{reject}\}
$$

求值规则:

$$
\text{fetch}(R) = \begin{cases}
\text{resolve}(\text{Response}) & \text{若 TCP/TLS 握手成功且收到完整状态行} \\
\text{reject}(\text{TypeError}) & \text{若 DNS、连接、CORS 失败} \\
\text{reject}(\text{AbortError}) & \text{若 } S \text{ 在响应完成前触发}
\end{cases}
$$

注意:HTTP 4xx/5xx 状态码不会导致 reject,这与 XMLHttpRequest 的语义不同。

### 2.4 Promise 状态机

```
pending ──resolve──> fulfilled
   │
   └──reject──> rejected
```

fetch 返回的 Promise 在响应头部到达时 resolve,响应体仍可流式读取。

### 2.5 取消语义形式化

AbortSignal 是一个有限状态机:

$$
\text{AbortSignal} = \langle \{\text{unsignaled}, \text{aborted}\}, \{\text{abort}\}, \delta \rangle
$$

转换函数 $\delta$:

$$
\delta(\text{unsignaled}, \text{abort}) = \text{aborted}
$$

一旦进入 aborted 状态,所有观察者(通过 signal.addEventListener('abort', ...))被异步通知,且所有依赖该 signal 的异步操作(包括 fetch)以 AbortError reject。

### 2.6 背压(Backpressure)的形式化

定义流的生产者-消费者模型:

- 生产者速率 $P(t)$:每秒产生的字节数
- 消费者速率 $C(t)$:每秒处理的字节数
- 缓冲区大小 $B$
- 当前缓冲区水位 $W(t)$

当 $W(t) > B_{\text{high}}$ 时,触发背压,生产者暂停:

$$
P(t+1) = \begin{cases}
0 & \text{if } W(t) > B_{\text{high}} \\
P_{\max} & \text{if } W(t) < B_{\text{low}}
\end{cases}
$$

Web Streams 通过 ReadableStream 的 pull 机制实现背压:消费者调用 reader.read() 才会拉取下一块,自然限制生产速率。

---

## 3. Fetch API 基础

### 3.1 最简调用

```javascript
// GET 请求
const response = await fetch('/api/users');
const data = await response.json();
console.log(data);
```

### 3.2 POST 请求

```javascript
const response = await fetch('/api/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Alice', age: 25 }),
});
const data = await response.json();
```

### 3.3 完整选项

```javascript
const response = await fetch(url, {
  method: 'POST',                  // HTTP 方法
  headers: {                       // 请求头
    'Content-Type': 'application/json',
    'Authorization': 'Bearer token',
  },
  body: JSON.stringify(data),      // 请求体(string/FormData/Blob/ArrayBuffer/Uint8Array/ReadableStream)
  mode: 'cors',                    // 'cors' | 'no-cors' | 'same-origin' | 'navigate' | 'websocket'
  credentials: 'same-origin',      // 'omit' | 'same-origin' | 'include'
  cache: 'default',                // 'default' | 'no-store' | 'reload' | 'no-cache' | 'force-cache' | 'only-if-cached'
  redirect: 'follow',              // 'follow' | 'error' | 'manual'
  referrer: 'client',              // 来源 URL
  referrerPolicy: 'no-referrer-when-downgrade', // 来源策略
  integrity: 'sha256-abc...',      // 子资源完整性校验
  keepalive: false,                // 页面卸载后是否保持请求
  signal: controller.signal,       // AbortSignal,用于取消
  priority: 'auto',                // 'high' | 'low' | 'auto'
});
```

### 3.4 检查响应状态

```javascript
// Fetch 不会对 HTTP 错误状态码抛出异常!
const response = await fetch('/api/users/999');
if (!response.ok) {
  // response.ok === (response.status >= 200 && response.status < 300)
  throw new Error(`HTTP ${response.status}: ${response.statusText}`);
}
const data = await response.json();
```

### 3.5 读取响应体的多种方式

```javascript
const response = await fetch('/api/data');

// 1. JSON
const json = await response.json();

// 2. 文本
const text = await response.text();

// 3. Blob(二进制大对象)
const blob = await response.blob();
const url = URL.createObjectURL(blob);

// 4. ArrayBuffer(原始字节)
const buffer = await response.arrayBuffer();

// 5. FormData(用于 multipart/form-data 解析)
const formData = await response.formData();

// 6. ReadableStream(流式读取)
const reader = response.body.getReader();

// 注意:响应体只能读取一次!
// 如需多次读取,先 clone()
const cloned = response.clone();
const json1 = await response.json();
const json2 = await cloned.json();
```

### 3.6 常见陷阱:响应体一次性消费

```javascript
const response = await fetch('/api/data');

// 错误:第二次读取会抛出 TypeError
const text = await response.text();
const json = await response.json(); // TypeError: Body has already been consumed

// 正确:使用 clone
const cloned = response.clone();
const text = await response.text();
const json = await cloned.json();
```

---

## 4. Request 对象详解

### 4.1 构造 Request

```javascript
const req = new Request('https://api.example.com/users', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer abc123',
  },
  body: JSON.stringify({ name: 'Alice' }),
  mode: 'cors',
  credentials: 'include',
});

// 传递给 fetch
const response = await fetch(req);
```

### 4.2 Request 属性

```javascript
const req = new Request('https://api.example.com/users?page=1', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Alice' }),
});

req.method;         // 'POST'
req.url;            // 'https://api.example.com/users?page=1'
req.headers;        // Headers 对象
req.body;           // ReadableStream
req.mode;           // 'cors'
req.credentials;    // 'same-origin'
req.cache;          // 'default'
req.redirect;       // 'follow'
req.referrer;       // 'about:client'
req.referrerPolicy; // ''
req.signal;         // AbortSignal
req.keepalive;      // false
req.integrity;      // ''
```

### 4.3 Request 克隆

```javascript
const req1 = new Request('/api/data', { method: 'POST', body: 'hello' });
const req2 = req1.clone(); // 深拷贝,可独立使用

// 注意:body 是 ReadableStream,克隆后两者都可用于 fetch
await fetch(req1);
await fetch(req2);
```

### 4.4 从 Request 派生新 Request

```javascript
const baseReq = new Request('/api/users', {
  headers: { 'Authorization': 'Bearer token' },
});

// 派生新 Request,继承并覆盖部分字段
const newReq = new Request(baseReq, {
  method: 'POST',
  body: JSON.stringify({ name: 'Alice' }),
});

// newReq 继承了 baseReq 的 headers,同时添加新字段
console.log(newReq.headers.get('Authorization')); // 'Bearer token'
```

### 4.5 Request body 读取

```javascript
const req = new Request('/api/data', {
  method: 'POST',
  body: JSON.stringify({ name: 'Alice' }),
});

const text = await req.text();
const json = await req.json();
const blob = await req.blob();
const buffer = await req.arrayBuffer();
```

---

## 5. Response 对象详解

### 5.1 构造 Response

```javascript
// 手动构造 Response(Service Worker 中常用)
const response = new Response(JSON.stringify({ name: 'Alice' }), {
  status: 200,
  statusText: 'OK',
  headers: { 'Content-Type': 'application/json' },
});

const data = await response.json();
```

### 5.2 Response 属性

```javascript
const response = await fetch('/api/data');

response.status;      // 200
response.statusText;  // 'OK'
response.ok;          // true (status 在 200-299 之间)
response.headers;     // Headers 对象
response.url;         // 最终 URL(重定向后)
response.redirected;  // 是否经历过重定向
response.type;        // 'basic' | 'cors' | 'opaque' | 'error'
response.body;        // ReadableStream | null
response.bodyUsed;    // boolean,响应体是否已被消费
```

### 5.3 Response 类型

```javascript
// 1. basic:同源响应
const r1 = await fetch('/api/data');
console.log(r1.type); // 'basic'

// 2. cors:跨域响应(可读大部分头部)
const r2 = await fetch('https://api.example.com/data', { mode: 'cors' });
console.log(r2.type); // 'cors'

// 3. opaque:no-cors 模式的跨域响应(几乎不可读)
const r3 = await fetch('https://third-party.com/data', { mode: 'no-cors' });
console.log(r3.type); // 'opaque'
console.log(r3.status); // 0
console.log(r3.body);   // null

// 4. error:网络错误
const r4 = new Response(null, { status: 0, statusText: '' });
console.log(r4.type); // 'error'
```

### 5.4 Response 静态工厂

```javascript
// 1. Response.error()
const errResp = Response.error();

// 2. Response.redirect(url, status)
const redirectResp = Response.redirect('https://example.com', 302);

// 3. Response.json()(ES2024+)
const jsonResp = Response.json({ name: 'Alice' }, { status: 200 });
```

### 5.5 Response 克隆

```javascript
const response = await fetch('/api/data');

// clone 后两个 Response 可独立消费 body
const r1 = response.clone();
const r2 = response.clone();

const json1 = await r1.json();
const json2 = await r2.json();
console.log(json1 === json2); // false(不同对象,但内容相同)
```

---

## 6. Headers 对象详解

### 6.1 创建 Headers

```javascript
const headers = new Headers({
  'Content-Type': 'application/json',
  'Authorization': 'Bearer token',
});

// 或通过数组
const headers2 = new Headers([
  ['Content-Type', 'application/json'],
  ['Authorization', 'Bearer token'],
]);
```

### 6.2 Headers 操作

```javascript
const headers = new Headers();

// 添加
headers.append('Set-Cookie', 'a=1');
headers.append('Set-Cookie', 'b=2'); // 多值

// 设置(覆盖)
headers.set('Content-Type', 'application/json');

// 读取
headers.get('Content-Type'); // 'application/json'
headers.get('Set-Cookie');   // 'a=1, b=2'(多值合并)

// 检查
headers.has('Content-Type'); // true

// 删除
headers.delete('Authorization');

// 遍历
for (const [key, value] of headers.entries()) {
  console.log(`${key}: ${value}`);
}
for (const key of headers.keys()) {
  console.log(key);
}
for (const value of headers.values()) {
  console.log(value);
}

// forEach
headers.forEach((value, key) => {
  console.log(`${key}: ${value}`);
});
```

### 6.3 不可变头部

出于安全考虑,部分头部无法通过脚本设置(在客户端):

```javascript
const headers = new Headers({
  'Cookie': 'session=abc',          // 被忽略
  'Host': 'evil.com',               // 被忽略
  'Referer': 'https://evil.com',    // 被忽略
  'Origin': 'https://evil.com',     // 被忽略
  'Content-Length': '999999',       // 被忽略(由浏览器计算)
});

// 这些头部由浏览器自动管理
```

### 6.4 CORS 安全头部

跨域响应中,只有以下"安全"头部可直接读取:

- Cache-Control
- Content-Language
- Content-Length
- Content-Type(仅限 application/x-www-form-urlencoded、multipart/form-data、text/plain)
- Expires
- Last-Modified
- Pragma

要读取其他头部(如 X-Total-Count、Authorization),服务端必须通过 Access-Control-Expose-Headers 显式暴露:

```http
Access-Control-Expose-Headers: X-Total-Count, X-Page-Count
```

---

## 7. AbortController 与取消语义

### 7.1 基础用法

```javascript
const controller = new AbortController();
const signal = controller.signal;

// 监听取消事件
signal.addEventListener('abort', () => {
  console.log('操作被取消');
});

// 触发取消
controller.abort();

console.log(signal.aborted); // true
```

### 7.2 取消 Fetch

```javascript
const controller = new AbortController();

fetch('/api/large-data', { signal: controller.signal })
  .then((response) => response.json())
  .then((data) => console.log(data))
  .catch((err) => {
    if (err.name === 'AbortError') {
      console.log('请求被取消');
    } else {
      console.error('其他错误:', err);
    }
  });

// 1 秒后取消
setTimeout(() => controller.abort(), 1000);
```

### 7.3 超时控制

```javascript
function fetchWithTimeout(url, options = {}, timeout = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timer));
}

try {
  const response = await fetchWithTimeout('/api/data', {}, 3000);
  const data = await response.json();
} catch (err) {
  if (err.name === 'AbortError') {
    console.log('请求超时');
  }
}
```

### 7.4 AbortSignal.timeout()(ES2022+)

```javascript
// 内置超时信号,无需手动管理 timer
const signal = AbortSignal.timeout(5000);

try {
  const response = await fetch('/api/data', { signal });
} catch (err) {
  if (err.name === 'TimeoutError') {
    console.log('超时');
  } else if (err.name === 'AbortError') {
    console.log('手动取消');
  }
}
```

### 7.5 信号组合

```javascript
// AbortSignal.any([signal1, signal2])(ES2024+)
const timeoutSignal = AbortSignal.timeout(5000);
const userCancelController = new AbortController();

// 任一信号触发都会取消
const combinedSignal = AbortSignal.any([
  timeoutSignal,
  userCancelController.signal,
]);

fetch('/api/data', { signal: combinedSignal });
```

### 7.6 取消多个请求

```javascript
const controller = new AbortController();

// 多个请求共享一个 controller
Promise.all([
  fetch('/api/users', { signal: controller.signal }).then((r) => r.json()),
  fetch('/api/posts', { signal: controller.signal }).then((r) => r.json()),
  fetch('/api/comments', { signal: controller.signal }).then((r) => r.json()),
])
  .then(([users, posts, comments]) => {
    console.log({ users, posts, comments });
  })
  .catch((err) => {
    if (err.name === 'AbortError') {
      console.log('一个或多个请求被取消');
    }
  });

// 用户切换页面时取消所有
button.addEventListener('click', () => controller.abort());
```

### 7.7 在 async 函数中正确处理取消

```javascript
async function fetchData(url, signal) {
  // 在每个 await 前检查取消状态
  if (signal.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  const response = await fetch(url, { signal });

  // fetch 之后的操作也可能被取消
  if (signal.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  const data = await response.json();
  return data;
}

// 调用方
const controller = new AbortController();
fetchData('/api/data', controller.signal).catch((err) => {
  if (err.name === 'AbortError') {
    console.log('取消');
  }
});

setTimeout(() => controller.abort(), 2000);
```

### 7.8 取消信号传播给 Stream

```javascript
async function streamDownload(url, signal) {
  const response = await fetch(url, { signal });
  const reader = response.body.getReader();

  try {
    while (true) {
      // read() 也会响应 signal.aborted,抛出 AbortError
      const { done, value } = await reader.read();
      if (done) break;
      console.log(`收到 ${value.length} 字节`);
    }
  } finally {
    reader.releaseLock();
  }
}
```

---

## 8. Web Streams API 概述

### 8.1 三种流类型

| 流类型           | 含义                       | 典型场景                       |
| ---------------- | -------------------------- | ------------------------------ |
| ReadableStream   | 可读流,数据源             | Fetch 响应体、文件读取、传感器 |
| WritableStream   | 可写流,数据汇             | 文件写入、网络发送、日志       |
| TransformStream | 转换流,既可读又可写       | 压缩、解压、加密、解码         |

### 8.2 流的优势

1. **内存高效**:数据分块处理,无需全部载入内存
2. **背压**:消费者控制生产速率,避免内存爆炸
3. **管道**:类似 Unix 管道,可串联多个转换
4. **可取消**:随时中止,释放资源
5. **异步友好**:基于 Promise,与 async/await 协同

### 8.3 流与数组的对比

```javascript
// 数组:一次性加载,内存压力大
const allData = await response.json(); // 全部解析到内存

// 流:分块处理,内存稳定
const reader = response.body.getReader();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  processChunk(value); // 每次处理一小块
}
```

### 8.4 流与异步迭代

```javascript
// ReadableStream 实现了 async iterable
const response = await fetch('/api/data');

for await (const chunk of response.body) {
  console.log(`收到 ${chunk.length} 字节`);
}
```

---

## 9. ReadableStream 深入

### 9.1 读取 Fetch 响应流

```javascript
const response = await fetch('/api/large-file');
const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const text = decoder.decode(value, { stream: true });
  console.log(text);
}

// 释放锁,允许其他 reader 读取
reader.releaseLock();
```

### 9.2 自定义 ReadableStream

```javascript
// 创建一个生成自然数的 ReadableStream
function naturals() {
  let i = 1;
  return new ReadableStream({
    start(controller) {
      // 启动时执行,通常用于初始化
    },
    pull(controller) {
      // 消费者请求数据时调用
      if (i > 100) {
        controller.close();
        return;
      }
      controller.enqueue(i++);
    },
    cancel(reason) {
      // 消费者取消时执行清理
      console.log('流被取消:', reason);
    },
  });
}

const stream = naturals();
const reader = stream.getReader();

console.log(await reader.read()); // { done: false, value: 1 }
console.log(await reader.read()); // { done: false, value: 2 }
```

### 9.3 背压与 pull 模式

```javascript
// pull 只在消费者调用 read() 后被调用,天然实现背压
const stream = new ReadableStream({
  pull(controller) {
    console.log('pull called');
    controller.enqueue(Math.random());
  },
});

const reader = stream.getReader();
// 第一次 read 触发 pull
await reader.read(); // 控制台:pull called
// 第二次 read 再次触发 pull
await reader.read(); // 控制台:pull called
// 没有 read,pull 不会被调用,生产者不会堆积数据
```

### 9.4 队列策略(QueuingStrategy)

```javascript
// 高水位(highWaterMark):队列中允许的最大数据量
const stream = new ReadableStream(
  {
    pull(controller) {
      // 当队列低于高水位时,pull 被调用
      controller.enqueue(new Uint8Array(1024));
    },
  },
  new CountQueuingStrategy({ highWaterMark: 10 }) // 最多缓存 10 个块
);

// ByteLengthQueuingStrategy:按字节计数
const byteStream = new ReadableStream(
  {
    pull(controller) {
      controller.enqueue(new Uint8Array(1024));
    },
  },
  new ByteLengthQueuingStrategy({ highWaterMark: 1024 * 1024 }) // 最多 1MB
);
```

### 9.5 下载进度

```javascript
async function downloadWithProgress(url, onProgress) {
  const response = await fetch(url);
  const contentLength = parseInt(
    response.headers.get('Content-Length') || '0',
    10
  );
  const reader = response.body.getReader();

  let received = 0;
  const chunks = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    chunks.push(value);
    received += value.length;
    onProgress(received, contentLength);
  }

  return new Blob(chunks);
}

// 使用
const blob = await downloadWithProgress('/api/large-file', (received, total) => {
  const percent = total ? (received / total * 100).toFixed(2) : '?';
  console.log(`下载进度: ${received}/${total} (${percent}%)`);
});
```

### 9.6 Tee 流(分叉)

```javascript
const response = await fetch('/api/data');
const [stream1, stream2] = response.body.tee();

// 两个流可独立消费,内容相同
const reader1 = stream1.getReader();
const reader2 = stream2.getReader();

// stream1 用于实时显示
(async () => {
  for await (const chunk of stream1) {
    displayChunk(chunk);
  }
})();

// stream2 用于缓存
(async () => {
  const cache = [];
  for await (const chunk of stream2) {
    cache.push(chunk);
  }
  saveToCache(cache);
})();
```

### 9.7 管道与 pipeTo

```javascript
// 将 ReadableStream 通过管道传给 WritableStream
const response = await fetch('/api/data');
await response.body.pipeTo(new WritableStream({
  write(chunk) {
    console.log('写入:', chunk);
  },
}));

// pipeThrough 通过 TransformStream
const response = await fetch('/api/data');
const decodedStream = response.body
  .pipeThrough(new TextDecoderStream())
  .pipeThrough(new TransformStream({
    transform(chunk, controller) {
      // 处理文本块
      controller.enqueue(chunk.toUpperCase());
    },
  }));

for await (const chunk of decodedStream) {
  console.log(chunk);
}
```

### 9.8 错误处理

```javascript
const stream = new ReadableStream({
  pull(controller) {
    try {
      const data = fetchData();
      controller.enqueue(data);
    } catch (err) {
      controller.error(err); // 报告错误给消费者
    }
  },
});

const reader = stream.getReader();
try {
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    console.log(value);
  }
} catch (err) {
  console.error('流错误:', err);
}
```

---

## 10. WritableStream 与 TransformStream

### 10.1 WritableStream 基础

```javascript
const writable = new WritableStream({
  start(controller) {
    // 初始化底层资源
  },
  write(chunk, controller) {
    // 写入一块数据
    console.log('写入:', chunk);
    // 返回 Promise 表示写入完成(实现背压)
    return new Promise((resolve) => setTimeout(resolve, 10));
  },
  close(controller) {
    // 关闭底层资源
    console.log('流已关闭');
  },
  abort(reason) {
    // 异常终止
    console.log('流被中止:', reason);
  },
});

const writer = writable.getWriter();
await writer.write('hello');
await writer.write('world');
await writer.close();
```

### 10.2 WritableStream 默认 writer

```javascript
const writable = new WritableStream({
  write(chunk) {
    console.log(chunk);
  },
});

// getWriter 锁定流,只能有一个 writer
const writer = writable.getWriter();
writer.write('a');
writer.write('b');
await writer.close();

// 释放后可再次获取
const writer2 = writable.getWriter();
```

### 10.3 TransformStream

```javascript
// 创建一个将字符串转大写的 TransformStream
const upperCaseStream = new TransformStream({
  transform(chunk, controller) {
    controller.enqueue(chunk.toUpperCase());
  },
});

// 使用
const response = await fetch('/api/text');
const transformed = response.body
  .pipeThrough(new TextDecoderStream())
  .pipeThrough(upperCaseStream);

for await (const chunk of transformed) {
  console.log(chunk);
}
```

### 10.4 实战:JSON 流式解析

```javascript
// 服务器返回 newline-delimited JSON(NDJSON)
// 每行一个 JSON 对象
class NDJSONParser extends TransformStream {
  constructor() {
    let buffer = '';
    super({
      transform(chunk, controller) {
        buffer += chunk;
        const lines = buffer.split('\n');
        buffer = lines.pop(); // 最后一段可能不完整,保留
        for (const line of lines) {
          if (line.trim()) {
            try {
              controller.enqueue(JSON.parse(line));
            } catch (e) {
              controller.error(e);
            }
          }
        }
      },
      flush(controller) {
        if (buffer.trim()) {
          try {
            controller.enqueue(JSON.parse(buffer));
          } catch (e) {
            controller.error(e);
          }
        }
      },
    });
  }
}

// 使用
const response = await fetch('/api/stream');
const jsonStream = response.body
  .pipeThrough(new TextDecoderStream())
  .pipeThrough(new NDJSONParser());

for await (const obj of jsonStream) {
  console.log('收到对象:', obj);
}
```

### 10.5 TextEncoderStream / TextDecoderStream

```javascript
// 字符串 → 字节
const encoderStream = new TextEncoderStream();

// 字节 → 字符串
const decoderStream = new TextDecoderStream();

// 链式处理
const response = await fetch('/api/text');
const textStream = response.body.pipeThrough(new TextDecoderStream());
```

### 10.6 CompressionStream / DecompressionStream

```javascript
// gzip 压缩(Chrome 80+)
const compressed = originalStream.pipeThrough(new CompressionStream('gzip'));

// gzip 解压
const decompressed = compressedStream.pipeThrough(new DecompressionStream('gzip'));
```

---

## 11. Service Worker 概述

### 11.1 Service Worker 是什么

Service Worker 是浏览器在后台运行的脚本,充当网页与网络之间的可编程代理。它具有以下特征:

- **独立线程**:不阻塞主线程,无 DOM 访问权限
- **事件驱动**:通过 install/activate/fetch/push/sync 等事件驱动
- **可拦截请求**:可拦截页面的所有网络请求,返回自定义响应
- **离线优先**:可缓存资源,实现离线访问
- **HTTPS 要求**:出于安全考虑,仅 HTTPS(或 localhost)下可用

### 11.2 生命周期

```
installing → installed → activating → activated → redundant
                                            │
                                            └──→ (被新版本替换时)
```

```javascript
// sw.js
self.addEventListener('install', (event) => {
  console.log('Service Worker 安装中');
  event.waitUntil(
    caches.open('v1').then((cache) => cache.addAll([
      '/',
      '/index.html',
      '/styles.css',
      '/app.js',
    ]))
  );
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker 已激活');
  // 清理旧缓存
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== 'v1')
            .map((key) => caches.delete(key))
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request);
    })
  );
});
```

### 11.3 注册 Service Worker

```javascript
// 在主页面注册
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      console.log('注册成功,作用域:', reg.scope);
    } catch (err) {
      console.error('注册失败:', err);
    }
  });
}
```

### 11.4 与主线程通信

```javascript
// 主线程 → Service Worker
navigator.serviceWorker.controller.postMessage({
  type: 'CACHE_URL',
  url: '/api/data',
});

// Service Worker 接收
self.addEventListener('message', (event) => {
  if (event.data.type === 'CACHE_URL') {
    caches.open('v1').then((cache) => cache.add(event.data.url));
  }
});

// Service Worker → 主线程(通过 Client)
self.addEventListener('message', (event) => {
  event.source.postMessage({ type: 'REPLY', data: 'ok' });
});

// 主线程接收
navigator.serviceWorker.addEventListener('message', (event) => {
  console.log('收到 SW 消息:', event.data);
});
```

---

## 12. Cache API

### 12.1 Cache 存储

```javascript
// 打开一个缓存
const cache = await caches.open('my-cache');

// 添加(Request 或 URL)
await cache.add('/api/data');
await cache.addAll(['/api/users', '/api/posts']);

// 手动 put
const response = await fetch('/api/data');
await cache.put('/api/data', response.clone());

// 读取
const cached = await cache.match('/api/data');
if (cached) {
  const data = await cached.json();
}

// 删除
await cache.delete('/api/data');

// 查询所有键
const keys = await cache.keys();
```

### 12.2 缓存策略详解

#### 12.2.1 Cache First(缓存优先)

适用场景:静态资源(CSS、JS、图片、字体)

```javascript
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open('static-v1');
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    return caches.match('/offline.html');
  }
}

self.addEventListener('fetch', (event) => {
  if (event.request.destination === 'style' ||
      event.request.destination === 'script' ||
      event.request.destination === 'font') {
    event.respondWith(cacheFirst(event.request));
  }
});
```

#### 12.2.2 Network First(网络优先)

适用场景:API 响应、动态内容

```javascript
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open('api-v1');
    cache.put(request, response.clone());
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    throw err;
  }
}
```

#### 12.2.3 Stale-While-Revalidate(过期时重新验证)

适用场景:非关键资源,优先速度

```javascript
async function staleWhileRevalidate(request) {
  const cache = await caches.open('runtime-v1');
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => cached);

  return cached || fetchPromise;
}
```

#### 12.2.4 Network Only / Cache Only

```javascript
// Network Only:强制网络
async function networkOnly(request) {
  return fetch(request);
}

// Cache Only:仅缓存(离线场景)
async function cacheOnly(request) {
  const cached = await caches.match(request);
  return cached || Response.error();
}
```

### 12.3 路由策略

```javascript
// 按请求类型路由
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. 仅 GET 请求缓存
  if (request.method !== 'GET') {
    return;
  }

  // 2. 静态资源 → Cache First
  if (request.destination === 'style' ||
      request.destination === 'script' ||
      request.destination === 'font' ||
      request.destination === 'image') {
    event.respondWith(cacheFirst(request));
    return;
  }

  // 3. API 请求 → Network First
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // 4. 导航请求 → Network First,离线时返回缓存 HTML
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request).catch(() => caches.match('/offline.html')));
    return;
  }

  // 5. 其他 → Stale-While-Revalidate
  event.respondWith(staleWhileRevalidate(request));
});
```

### 12.4 缓存版本管理

```javascript
const CACHE_VERSION = 'v3';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const API_CACHE = `api-${CACHE_VERSION}`;
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => !key.endsWith(CACHE_VERSION))
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});
```

### 12.5 Workbox 简化

```javascript
// 使用 Google Workbox 简化 Service Worker
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

// 静态资源
registerRoute(
  ({ request }) => ['style', 'script', 'font'].includes(request.destination),
  new CacheFirst({
    cacheName: 'static-v1',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 }),
    ],
  })
);

// API
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-v1',
    networkTimeoutSeconds: 3,
  })
);

// 图片
registerRoute(
  ({ request }) => request.destination === 'image',
  new StaleWhileRevalidate({
    cacheName: 'images-v1',
    plugins: [new ExpirationPlugin({ maxEntries: 50 })],
  })
);
```

---

## 13. CORS 跨域与认证

### 13.1 同源策略

浏览器的同源策略要求:协议、域名、端口三者完全相同,才为同源。跨域请求需要服务端配合 CORS。

### 13.2 简单请求 vs 预检请求

#### 简单请求

满足以下条件的请求为"简单请求",不触发预检:

- 方法:GET、HEAD、POST
- 头部:Accept、Accept-Language、Content-Language、Content-Type(仅 text/plain、multipart/form-data、application/x-www-form-urlencoded)

```javascript
// 简单请求
fetch('https://api.example.com/data', {
  method: 'GET',
});
```

#### 预检请求

不满足简单请求条件的,浏览器先发 OPTIONS 预检:

```javascript
// 触发预检的请求
fetch('https://api.example.com/data', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
});

// 预检请求
// OPTIONS /data HTTP/1.1
// Origin: https://your-site.com
// Access-Control-Request-Method: POST
// Access-Control-Request-Headers: Content-Type

// 服务端响应
// HTTP/1.1 200 OK
// Access-Control-Allow-Origin: https://your-site.com
// Access-Control-Allow-Methods: GET, POST, PUT, DELETE
// Access-Control-Allow-Headers: Content-Type, Authorization
// Access-Control-Max-Age: 86400
```

### 13.3 credentials(凭证)

```javascript
// omit:不发送 cookie
fetch(url, { credentials: 'omit' });

// same-origin:同源时发送 cookie(默认)
fetch(url, { credentials: 'same-origin' });

// include:跨域也发送 cookie
fetch(url, { credentials: 'include' });
```

服务端必须显式允许凭证:

```http
Access-Control-Allow-Origin: https://your-site.com
Access-Control-Allow-Credentials: true
```

注意:`Access-Control-Allow-Origin: *` 与 `credentials: include` 不兼容,必须指定具体来源。

### 13.4 Authorization 头

```javascript
// Token 认证
const response = await fetch('/api/protected', {
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});

// 自动附加 token 的拦截器
function authFetch(url, options = {}) {
  const token = localStorage.getItem('token');
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: token ? `Bearer ${token}` : '',
    },
  });
}
```

### 13.5 Cookie 与 CSRF

```javascript
// 服务端设置 cookie
// Set-Cookie: session=abc; HttpOnly; Secure; SameSite=Strict

// CSRF 防护:双重 cookie
const csrfToken = getCookie('csrf-token');
const response = await fetch('/api/data', {
  method: 'POST',
  credentials: 'include',
  headers: {
    'X-CSRF-Token': csrfToken,
  },
});
```

---

## 14. HTTP/2 与 Server Push

### 14.1 HTTP/2 特性

- **多路复用**:单一 TCP 连接上并行多个请求
- **头部压缩**:HPACK 算法,减少重复头部
- **二进制分帧**:更高效的传输
- **Server Push**:服务器主动推送资源

### 14.2 Server Push 与 Service Worker

```javascript
// 服务端推送(已在主流浏览器废弃,但 Service Worker 仍可用)
self.addEventListener('push', (event) => {
  const payload = event.data?.json() || {};
  event.waitUntil(
    self.registration.showNotification(payload.title || '通知', {
      body: payload.body || '',
      icon: '/icon.png',
      data: payload.data,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});
```

### 14.3 Priority Hints

```javascript
// 通过 priority 选项声明优先级(2024+)
fetch('/api/critical', { priority: 'high' });
fetch('/api/non-critical', { priority: 'low' });

// HTML 中的 priority 属性
// <img src="hero.jpg" fetchpriority="high">
// <img src="below-fold.jpg" fetchpriority="low">
```

---

## 15. GraphQL 客户端

### 15.1 GraphQL 简介

GraphQL 是 Facebook 于 2015 年开源的查询语言,客户端精确指定所需字段,避免 REST 的过度/不足获取。

```graphql
# REST 需要多次请求
# GET /users/1
# GET /users/1/posts

# GraphQL 一次请求
query {
  user(id: 1) {
    name
    email
    posts {
      title
      content
    }
  }
}
```

### 15.2 原生 Fetch 调用 GraphQL

```javascript
async function graphqlFetch(query, variables = {}) {
  const response = await fetch('/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const { data, errors } = await response.json();
  if (errors) {
    throw new Error(errors[0].message);
  }
  return data;
}

// 使用
const data = await graphqlFetch(`
  query GetUser($id: ID!) {
    user(id: $id) {
      name
      email
    }
  }
`, { id: 1 });
```

### 15.3 Apollo Client

```javascript
import { ApolloClient, InMemoryCache, gql } from '@apollo/client';

const client = new ApolloClient({
  uri: '/graphql',
  cache: new InMemoryCache(),
});

// 查询
const { data } = await client.query({
  query: gql`
    query GetUsers {
      users {
        id
        name
      }
    }
  `,
});

// 变更
const result = await client.mutate({
  mutation: gql`
    mutation CreateUser($name: String!) {
      createUser(name: $name) {
        id
      }
    }
  `,
  variables: { name: 'Alice' },
});

// 订阅(WebSocket)
const observable = client.subscribe({
  query: gql`
    subscription OnMessage {
      messageAdded {
        id
        content
      }
    }
  `,
});
observable.subscribe({
  next: (data) => console.log('新消息:', data),
});
```

### 15.4 urql

```javascript
import { createClient, gql } from 'urql';

const client = createClient({
  url: '/graphql',
});

const result = await client.query(gql`
  query { users { id name } }
`).toPromise();
```

### 15.5 GraphQL 与 REST 对比

| 维度        | REST                       | GraphQL                      |
| ----------- | -------------------------- | ---------------------------- |
| 端点        | 多个(/users, /posts)      | 单一(/graphql)              |
| 数据获取    | 服务端定义返回结构         | 客户端精确指定字段           |
| 过度获取    | 常见                       | 避免                         |
| 不足获取    | 需多次请求                 | 一次请求获取关联数据         |
| 缓存        | HTTP 缓存天然支持          | 需客户端缓存(Apollo)        |
| 版本化      | /v1, /v2                   | 通过 schema 演进            |
| 学习曲线    | 较低                       | 较高                         |
| 工具链      | 成熟                       | GraphiQL、Codegen 等         |
| 文件上传    | 原生 multipart             | 需 multipart 规范扩展        |
| 实时通信    | WebSocket                  | Subscription(基于 WebSocket)|

---

## 16. 请求重试与熔断

### 16.1 指数退避重试

```javascript
async function fetchRetry(url, options = {}, retries = 3) {
  const baseDelay = 1000;
  const maxDelay = 30000;

  for (let i = 0; i <= retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) {
        return response;
      }
      // 5xx 重试,4xx 不重试
      if (response.status < 500) {
        throw new Error(`HTTP ${response.status}`);
      }
      // 继续重试
    } catch (err) {
      if (i === retries) {
        throw err;
      }
    }
    // 指数退避 + 抖动
    const delay = Math.min(
      baseDelay * Math.pow(2, i) + Math.random() * 100,
      maxDelay
    );
    await new Promise((r) => setTimeout(r, delay));
  }
}
```

### 16.2 熔断器模式

```javascript
class CircuitBreaker {
  constructor({ threshold = 5, timeout = 60000, resetTimeout = 30000 } = {}) {
    this.failures = 0;
    this.threshold = threshold;
    this.timeout = timeout;
    this.resetTimeout = resetTimeout;
    this.state = 'closed'; // closed | open | half-open
    this.lastFailure = 0;
  }

  async call(fn) {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailure > this.resetTimeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await fn();
      this.reset();
      return result;
    } catch (err) {
      this.failures++;
      this.lastFailure = Date.now();
      if (this.failures >= this.threshold) {
        this.state = 'open';
        setTimeout(() => {
          this.state = 'half-open';
        }, this.resetTimeout);
      }
      throw err;
    }
  }

  reset() {
    this.failures = 0;
    this.state = 'closed';
  }
}

const breaker = new CircuitBreaker({ threshold: 5 });

async function callApi() {
  return breaker.call(() => fetch('/api/data').then((r) => r.json()));
}
```

### 16.3 限流器(Rate Limiter)

```javascript
class RateLimiter {
  constructor({ maxRequests, perMs }) {
    this.maxRequests = maxRequests;
    this.perMs = perMs;
    this.requests = [];
  }

  async acquire() {
    const now = Date.now();
    this.requests = this.requests.filter((t) => now - t < this.perMs);

    if (this.requests.length >= this.maxRequests) {
      const oldest = this.requests[0];
      const wait = this.perMs - (now - oldest);
      await new Promise((r) => setTimeout(r, wait));
      return this.acquire();
    }

    this.requests.push(now);
  }
}

const limiter = new RateLimiter({ maxRequests: 10, perMs: 1000 });

async function rateLimitedFetch(url) {
  await limiter.acquire();
  return fetch(url);
}
```

### 16.4 并发控制

```javascript
async function parallelLimit(tasks, limit) {
  const results = [];
  const executing = new Set();

  for (const task of tasks) {
    if (executing.size >= limit) {
      await Promise.race(executing);
    }
    const p = task().then((result) => {
      executing.delete(p);
      return result;
    });
    executing.add(p);
    results.push(p);
  }

  return Promise.all(results);
}

// 使用:最多 5 个并发
const urls = ['/api/1', '/api/2', '/api/3', /* ... */];
const results = await parallelLimit(
  urls.map((url) => () => fetch(url).then((r) => r.json())),
  5
);
```

---

## 17. 生产级 HTTP 客户端

### 17.1 完整封装

```javascript
class HttpClient {
  constructor(config = {}) {
    this.baseURL = config.baseURL || '';
    this.timeout = config.timeout || 10000;
    this.retries = config.retries || 0;
    this.headers = config.headers || {};
    this.authToken = config.authToken;
    this.onError = config.onError || (() => {});
    this.onRequest = config.onRequest || (() => {});
    this.onResponse = config.onResponse || (() => {});
  }

  async request(path, options = {}) {
    const url = this.baseURL + path;
    const controller = new AbortController();
    const timeoutSignal = AbortSignal.timeout(this.timeout);
    const combinedSignal = AbortSignal.any([
      controller.signal,
      timeoutSignal,
      options.signal,
    ].filter(Boolean));

    const config = {
      ...options,
      signal: combinedSignal,
      headers: {
        'Content-Type': 'application/json',
        ...this.headers,
        ...options.headers,
        ...(this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {}),
      },
    };

    this.onRequest({ url, options: config });

    let lastError;
    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        const response = await fetch(url, config);
        this.onResponse({ url, response });

        if (!response.ok) {
          const error = new HttpError(`HTTP ${response.status}`, response.status, await response.text());
          if (response.status < 500) throw error;
          lastError = error;
        } else {
          return response;
        }
      } catch (err) {
        lastError = err;
        if (err.name === 'AbortError' || err.name === 'TimeoutError') {
          throw err;
        }
      }
      if (attempt < this.retries) {
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
      }
    }
    throw lastError;
  }

  get(path, options) {
    return this.request(path, { ...options, method: 'GET' });
  }
  post(path, body, options) {
    return this.request(path, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    });
  }
  put(path, body, options) {
    return this.request(path, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }
  patch(path, body, options) {
    return this.request(path, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }
  delete(path, options) {
    return this.request(path, { ...options, method: 'DELETE' });
  }
}

class HttpError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.body = body;
  }
}

// 使用
const client = new HttpClient({
  baseURL: 'https://api.example.com',
  timeout: 5000,
  retries: 3,
  authToken: 'abc123',
  onRequest: ({ url }) => console.log(`→ ${url}`),
  onResponse: ({ url, response }) => console.log(`← ${url} ${response.status}`),
  onError: (err) => console.error('HTTP 错误:', err),
});

const response = await client.get('/users');
const users = await response.json();
```

### 17.2 拦截器模式

```javascript
class InterceptorManager {
  constructor() {
    this.interceptors = [];
  }
  use(fulfilled, rejected) {
    this.interceptors.push({ fulfilled, rejected });
    return this.interceptors.length - 1;
  }
  eject(id) {
    if (this.interceptors[id]) {
      this.interceptors[id] = null;
    }
  }
  forEach(fn) {
    this.interceptors.forEach((i) => i && fn(i));
  }
}

class InterceptableHttpClient {
  constructor() {
    this.requestInterceptors = new InterceptorManager();
    this.responseInterceptors = new InterceptorManager();
  }

  async request(url, options) {
    let config = { url, ...options };

    // 应用请求拦截器
    this.requestInterceptors.forEach((i) => {
      config = i.fulfilled(config) || config;
    });

    let response = await fetch(config.url, config);

    // 应用响应拦截器
    this.responseInterceptors.forEach((i) => {
      response = i.fulfilled(response) || response;
    });

    return response;
  }
}

// 使用
const client = new InterceptableHttpClient();

// 请求拦截器:自动加 token
client.requestInterceptors.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers = { ...config.headers, Authorization: `Bearer ${token}` };
  }
  return config;
});

// 响应拦截器:401 自动刷新 token
client.responseInterceptors.use(async (response) => {
  if (response.status === 401) {
    await refreshToken();
    // 重新发起请求
  }
  return response;
});
```

### 17.3 请求去重

```javascript
class DedupHttpClient {
  constructor() {
    this.pending = new Map();
  }

  async get(url) {
    if (this.pending.has(url)) {
      return this.pending.get(url);
    }

    const promise = fetch(url)
      .then((response) => {
        this.pending.delete(url);
        return response;
      })
      .catch((err) => {
        this.pending.delete(url);
        throw err;
      });

    this.pending.set(url, promise);
    return promise;
  }
}
```

---

## 18. 常见陷阱与最佳实践

### 18.1 常见陷阱

#### 18.1.1 未检查 response.ok

```javascript
// 错误
const data = await fetch('/api/data').then((r) => r.json());
// HTTP 500 时仍会解析响应体,可能得到错误页 HTML

// 正确
const response = await fetch('/api/data');
if (!response.ok) {
  throw new Error(`HTTP ${response.status}`);
}
const data = await response.json();
```

#### 18.1.2 响应体多次读取

```javascript
// 错误
const response = await fetch('/api/data');
const text = await response.text();
const json = await response.json(); // TypeError

// 正确
const response = await fetch('/api/data');
const cloned = response.clone();
const text = await response.text();
const json = await cloned.json();
```

#### 18.1.3 credentials 跨域问题

```javascript
// 跨域携带 cookie 必须显式声明
fetch('https://api.example.com/data', {
  credentials: 'include', // 不是 same-origin
});
// 且服务端必须返回
// Access-Control-Allow-Origin: https://your-site.com (具体值,不能是 *)
// Access-Control-Allow-Credentials: true
```

#### 18.1.4 AbortController 未清理

```javascript
// 错误:超时后仍触发 abort,即使请求已完成
function fetchWithTimeout(url, timeout) {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeout);
  return fetch(url, { signal: controller.signal });
}

// 正确:请求完成后清理 timer
async function fetchWithTimeout(url, timeout) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
```

#### 18.1.5 GET 请求带 body

```javascript
// 错误:GET 请求不支持 body
fetch('/api/data', { method: 'GET', body: JSON.stringify({}) });
// 浏览器会忽略 body 或报错

// 正确:用 query string
const params = new URLSearchParams({ page: 1, size: 10 });
fetch(`/api/data?${params}`);
```

#### 18.1.6 Content-Type 与 body 不匹配

```javascript
// 错误
fetch('/api/data', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: 'plain text', // 类型不匹配
});

// 正确
fetch('/api/data', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Alice' }),
});
```

#### 18.1.7 Service Worker 缓存 POST 请求

```javascript
// 错误:POST 请求无法缓存
caches.match(postRequest);

// 正确:仅缓存 GET
if (request.method === 'GET') {
  event.respondWith(cacheFirst(request));
}
```

### 18.2 最佳实践

1. **始终检查 response.ok**:HTTP 错误状态码不会 reject
2. **使用 AbortSignal.timeout**:避免手动管理 timer
3. **流式处理大响应**:使用 ReadableStream 而非一次性读取
4. **统一错误处理**:封装 HttpClient,集中处理错误
5. **缓存策略明确**:Service Worker 按资源类型路由
6. **CORS 头部精确**:避免使用 `*` 当需要 credentials
7. **重试幂等性**:GET/PUT/DELETE 可重试,POST 需谨慎
8. **指数退避+抖动**:避免惊群效应
9. **超时分级**:连接超时、读取超时分别处理
10. **监控与日志**:记录请求耗时、成功率、错误码

---

## 19. 性能优化

### 19.1 减少请求数量

```javascript
// 1. 批量请求
const response = await fetch('/api/users/batch', {
  method: 'POST',
  body: JSON.stringify({ ids: [1, 2, 3, 4, 5] }),
});

// 2. GraphQL 一次取数
const data = await graphqlFetch(`
  query {
    users { id name posts { title } }
  }
`);

// 3. 资源预加载
<link rel="preload" href="/api/critical" as="fetch" crossorigin />
```

### 19.2 减少响应体积

```javascript
// 1. Gzip/Brotli 压缩(服务端)
// 服务端返回 Content-Encoding: gzip

// 2. 字段筛选(GraphQL)
query { users { id name } }  // 只要 id 和 name

// 3. 分页
fetch('/api/users?page=1&size=20');

// 4. 条件请求(ETag)
const response = await fetch('/api/data', {
  headers: { 'If-None-Match': etag },
});
if (response.status === 304) {
  // 使用缓存
}
```

### 19.3 缓存利用

```javascript
// 1. HTTP 缓存
// Cache-Control: max-age=3600

// 2. Service Worker 缓存
// 见第 12 章

// 3. 内存缓存
const cache = new Map();
async function cachedFetch(url) {
  if (cache.has(url)) return cache.get(url);
  const response = await fetch(url);
  const data = await response.json();
  cache.set(url, data);
  return data;
}
```

### 19.4 预连接与 DNS 预解析

```html
<!-- DNS 预解析 -->
<link rel="dns-prefetch" href="//api.example.com">

<!-- 预连接(DNS + TCP + TLS) -->
<link rel="preconnect" href="//api.example.com" crossorigin>
```

### 19.5 keepalive 保持连接

```javascript
// 页面卸载时仍发送请求(analytics)
window.addEventListener('unload', () => {
  fetch('/api/analytics', {
    method: 'POST',
    body: JSON.stringify({ event: 'page_view' }),
    keepalive: true,
  });
});

// 或使用 sendBeacon
navigator.sendBeacon('/api/analytics', JSON.stringify({ event: 'page_view' }));
```

### 19.6 流式渲染

```javascript
// 服务端流式返回 HTML
const response = await fetch('/page');
const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const html = decoder.decode(value, { stream: true });
  // 流式插入 DOM
  document.getElementById('app').insertAdjacentHTML('beforeend', html);
}
```

---

## 20. 测试与 Mock

### 20.1 Mock Service Worker(MSW)

```javascript
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

const server = setupServer(
  http.get('/api/users', () => {
    return HttpResponse.json([
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]);
  }),
  http.post('/api/users', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: 3, ...body }, { status: 201 });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test('fetch users', async () => {
  const response = await fetch('/api/users');
  const users = await response.json();
  expect(users).toHaveLength(2);
});
```

### 20.2 Fetch Mock

```javascript
import { jest } from '@jest/globals';

global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ name: 'Alice' }),
  })
);

test('fetch', async () => {
  const data = await fetch('/api/data').then((r) => r.json());
  expect(data.name).toBe('Alice');
  expect(fetch).toHaveBeenCalledWith('/api/data');
});
```

### 20.3 集成测试中的真实请求

```javascript
// 使用真实 HTTP 服务器
import { createServer } from 'http';

beforeAll((done) => {
  const server = createServer((req, res) => {
    if (req.url === '/api/data') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ name: 'Alice' }));
    }
  });
  server.listen(3000, done);
});

test('fetch', async () => {
  const response = await fetch('http://localhost:3000/api/data');
  const data = await response.json();
  expect(data.name).toBe('Alice');
});
```

---

## 21. 安全考虑

### 21.1 XSS 与 CSRF

```javascript
// 1. XSS 防护:转义用户输入
function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;',
    '"': '&quot;', "'": '&#39;'
  }[c]));
}

// 2. CSRF 防护:双重提交 cookie
const csrfToken = document.cookie.match(/csrf-token=([^;]+)/)?.[1];
fetch('/api/data', {
  method: 'POST',
  headers: { 'X-CSRF-Token': csrfToken },
  credentials: 'same-origin',
});
```

### 21.2 HTTPS 与 HSTS

```http
# 服务端响应头
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

### 21.3 Content Security Policy

```http
Content-Security-Policy: default-src 'self'; connect-src 'self' https://api.example.com
```

### 21.4 敏感数据处理

```javascript
// 1. Token 存储在内存,不存 localStorage
let authToken = null;

function login(token) {
  authToken = token;
}

// 2. HttpOnly cookie 存储会话(无法被 JS 读取)
// Set-Cookie: session=abc; HttpOnly; Secure; SameSite=Strict

// 3. 不在 URL 中传递敏感数据
// 错误
fetch(`/api/data?token=${secret}`);
// 正确
fetch('/api/data', { headers: { Authorization: `Bearer ${secret}` } });

// 4. 日志脱敏
function logRequest(url) {
  const sanitized = url.replace(/token=[^&]+/, 'token=***');
  console.log(sanitized);
}
```

### 21.5 防止 SSRF

```javascript
// 服务端验证用户提供的 URL
function isAllowedUrl(url) {
  const parsed = new URL(url);
  // 仅允许 https
  if (parsed.protocol !== 'https:') return false;
  // 拒绝内网 IP
  const blocked = ['127.0.0.1', '0.0.0.0', 'localhost', '10.', '172.16.', '192.168.'];
  return !blocked.some((ip) => parsed.hostname.startsWith(ip));
}
```

---

## 22. 与其他网络栈对比

### 22.1 Fetch vs XMLHttpRequest

| 特性          | Fetch                | XMLHttpRequest     |
| ------------- | -------------------- | ------------------ |
| API 风格      | Promise              | 事件回调           |
| 流式响应      | 原生支持             | 仅 responseType='stream'(实验性) |
| 取消          | AbortSignal          | abort()            |
| 进度          | ReadableStream       | progress 事件      |
| 超时          | 手动实现             | timeout 属性       |
| 同步请求      | 不支持               | 支持(已废弃)     |
| 上传进度      | 不支持(需手动构造) | upload.onprogress  |
| 兼容性        | 现代浏览器           | IE10+              |

### 22.2 Fetch vs axios

| 特性            | Fetch           | axios              |
| --------------- | --------------- | ------------------ |
| 类型            | 浏览器原生      | 第三方库           |
| 拦截器          | 需自行封装      | 内置               |
| 自动 JSON       | 需手动 .json()  | 自动转换           |
| 超时            | 手动 AbortSignal | timeout 选项       |
| 重试            | 手动实现        | axios-retry 插件   |
| 取消            | AbortController  | CancelToken(已废弃,改用 AbortController) |
| 进度            | ReadableStream   | onUploadProgress / onDownloadProgress |
| XSRF            | 手动实现         | 内置               |
| Node.js 支持    | Node 18+ 原生    | 一直支持           |
| 体积            | 0                | 13KB               |

### 22.3 Fetch vs Node.js http 模块

```javascript
// Node.js 内置 http 模块
const http = require('http');
http.get('http://example.com', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => console.log(data));
});

// Node 18+ 支持 Fetch
const response = await fetch('http://example.com');
const data = await response.text();
```

### 22.4 与其他语言对比

| 语言       | 原生 HTTP 客户端                          | 第三方主流                |
| ---------- | ----------------------------------------- | ------------------------- |
| JavaScript | fetch(Node 18+ / 浏览器)                | axios、got、ky            |
| Python     | urllib                                    | requests、httpx、aiohttp  |
| Go         | net/http                                  | (无主流第三方)            |
| Rust       | reqwest                                   | hyper、isahc              |
| Java       | java.net.http.HttpClient(Java 11+)       | OkHttp、Apache HttpClient |
| C#         | HttpClient                                | RestSharp                 |

---

## 23. 案例研究:实时聊天应用

### 23.1 需求

- 用户登录后建立 WebSocket 连接
- 接收消息流式显示
- 支持发送消息、图片
- 离线时缓存未发送消息,上线后重发
- Service Worker 缓存历史消息

### 23.2 实现

```javascript
// chat-client.js
class ChatClient {
  constructor(userId) {
    this.userId = userId;
    this.ws = null;
    this.pendingMessages = [];
    this.messageQueue = [];
  }

  async connect() {
    const token = await this.getToken();
    this.ws = new WebSocket(`wss://api.chat.example.com/ws?token=${token}`);

    this.ws.addEventListener('open', () => {
      console.log('已连接');
      // 发送积压消息
      while (this.pendingMessages.length > 0) {
        this.ws.send(JSON.stringify(this.pendingMessages.shift()));
      }
    });

    this.ws.addEventListener('message', async (event) => {
      // 流式接收(如果是 Blob)
      if (event.data instanceof Blob) {
        const reader = event.data.stream().getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          // 按行处理 NDJSON
          const lines = buffer.split('\n');
          buffer = lines.pop();
          for (const line of lines) {
            const msg = JSON.parse(line);
            this.displayMessage(msg);
          }
        }
      } else {
        const msg = JSON.parse(event.data);
        this.displayMessage(msg);
      }
    });

    this.ws.addEventListener('close', () => {
      console.log('连接断开,5 秒后重连');
      setTimeout(() => this.connect(), 5000);
    });
  }

  send(content) {
    const message = { userId: this.userId, content, timestamp: Date.now() };
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      this.pendingMessages.push(message);
    }
  }

  async sendImage(file) {
    // 分块上传
    const CHUNK_SIZE = 1024 * 1024; // 1MB
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const uploadId = Date.now().toString();

    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);

      const formData = new FormData();
      formData.append('file', chunk);
      formData.append('uploadId', uploadId);
      formData.append('chunkIndex', i);
      formData.append('totalChunks', totalChunks);

      await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
    }

    return uploadId;
  }

  displayMessage(msg) {
    // 渲染到 UI
    const el = document.createElement('div');
    el.textContent = `${msg.userId}: ${msg.content}`;
    document.getElementById('messages').appendChild(el);
  }

  async getToken() {
    const response = await fetch('/api/auth/token');
    const { token } = await response.json();
    return token;
  }
}
```

### 23.3 Service Worker 离线支持

```javascript
// sw.js
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('chat-v1').then((cache) => cache.addAll([
      '/',
      '/index.html',
      '/chat-client.js',
      '/styles.css',
    ]))
  );
});

self.addEventListener('fetch', (event) => {
  // 1. 历史消息 → Cache First
  if (event.request.url.includes('/api/messages/history')) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(event.request);
        const networkPromise = fetch(event.request).then((response) => {
          const clone = response.clone();
          caches.open('chat-v1').then((cache) => cache.put(event.request, clone));
          return response;
        }).catch(() => cached);
        return cached || networkPromise;
      })()
    );
    return;
  }

  // 2. WebSocket 不拦截
  if (event.request.url.startsWith('wss://')) {
    return;
  }

  // 3. 其他 → Network First
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// 后台同步:离线发送的消息
self.addEventListener('sync', (event) => {
  if (event.tag === 'send-pending') {
    event.waitUntil(sendPendingMessages());
  }
});

async function sendPendingMessages() {
  const cache = await caches.open('pending-messages');
  const requests = await cache.keys();
  for (const request of requests) {
    const response = await fetch(request);
    if (response.ok) {
      await cache.delete(request);
    }
  }
}
```

### 23.4 性能与可观测性

```javascript
// 上报性能指标
class ChatMetrics {
  constructor() {
    this.metrics = {
      messageLatency: [],
      connectionUptime: 0,
      reconnectCount: 0,
    };
  }

  recordMessageLatency(sentAt, receivedAt) {
    this.metrics.messageLatency.push(receivedAt - sentAt);
    if (this.metrics.messageLatency.length > 100) {
      this.metrics.messageLatency.shift();
    }
  }

  flush() {
    // 使用 sendBeacon 在页面卸载时上报
    navigator.sendBeacon('/api/metrics', JSON.stringify(this.metrics));
  }
}
```

---

## 24. 习题

### 24.1 基础题

#### 习题 1(填空)

fetch() 函数返回一个 ______ 对象,该对象在响应 ______ 到达时 resolve(注意:不是响应体完成)。

<details>
<summary>答案</summary>

Promise;头部(状态行+响应头)

</details>

#### 习题 2(选择)

下列哪种情况会导致 fetch() 返回的 Promise reject?
A. HTTP 404 Not Found
B. HTTP 500 Internal Server Error
C. CORS 预检失败
D. 响应体为空

<details>
<summary>答案</summary>

C

fetch 只在网络层错误(DNS、连接拒绝、CORS 失败)时 reject。HTTP 4xx/5xx 不会 reject,需要手动检查 response.ok。

</details>

### 24.2 应用题

#### 习题 3(代码修复)

以下代码意图实现"并发请求,最多 3 个同时进行",但有 bug。请修复。

```javascript
async function parallelLimit(urls, limit) {
  const results = [];
  for (let i = 0; i < urls.length; i += limit) {
    const batch = urls.slice(i, i + limit);
    const batchResults = await Promise.all(batch.map((url) => fetch(url)));
    results.push(...batchResults);
  }
  return results;
}
```

<details>
<summary>答案</summary>

```javascript
async function parallelLimit(urls, limit) {
  const results = new Array(urls.length);
  let index = 0;

  async function worker() {
    while (index < urls.length) {
      const i = index++;
      results[i] = await fetch(urls[i]);
    }
  }

  const workers = Array.from({ length: Math.min(limit, urls.length) }, () => worker());
  await Promise.all(workers);
  return results;
}
```

原实现是"分批并发",每批内并发但批间串行,效率低。修复后采用 worker pool 模式,持续补充新请求,保持并发度。

</details>

#### 习题 4(代码编写)

实现一个"竞速取消"函数:同时发起多个请求,任一完成则取消其他。

<details>
<summary>答案</summary>

```javascript
async function raceCancel(urls) {
  const controller = new AbortController();
  const promises = urls.map((url) =>
    fetch(url, { signal: controller.signal })
      .then((response) => {
        controller.abort(); // 取消其他
        return response;
      })
      .catch((err) => {
        if (err.name === 'AbortError') return null; // 被取消
        throw err;
      })
  );
  const results = await Promise.all(promises);
  return results.find((r) => r !== null);
}

// 使用
const response = await raceCancel([
  'https://cdn1.example.com/file',
  'https://cdn2.example.com/file',
  'https://cdn3.example.com/file',
]);
```

</details>

### 24.3 分析题

#### 习题 5(分析)

某团队在 Service Worker 中使用以下缓存策略,但用户反馈"页面更新后,部分用户仍看到旧内容"。分析原因并给出修复方案。

```javascript
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request);
    })
  );
});
```

<details>
<summary>答案</summary>

**原因**:
- 使用 Cache First 策略,缓存命中后立即返回,不更新缓存
- HTML 主文档被缓存后,即使服务器有新版本,用户仍看到旧 HTML
- 旧 HTML 可能引用旧的 JS/CSS,这些资源也可能被缓存

**修复方案**:
1. HTML 主文档使用 Network First 或 Stale-While-Revalidate
2. 静态资源(CSS/JS/图片)使用 Cache First,文件名带 hash
3. 定期清理旧版本缓存

```javascript
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.mode === 'navigate') {
    // HTML: Network First
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open('html-v1').then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
  } else {
    // 其他: Stale-While-Revalidate
    event.respondWith(
      (async () => {
        const cache = await caches.open('static-v1');
        const cached = await cache.match(request);
        const networkPromise = fetch(request).then((response) => {
          cache.put(request, response.clone());
          return response;
        });
        return cached || networkPromise;
      })()
    );
  }
});
```

</details>

### 24.4 创造题

#### 习题 6(开放)

设计一个"自适应 HTTP 客户端",要求:
1. 根据网络状况(2G/3G/4G/WiFi)自动调整超时
2. 根据历史成功率动态调整重试次数
3. 在弱网下自动启用压缩
4. 离线时自动切换到缓存
5. 提供可观测性指标(请求数、成功率、P95 延迟)

<details>
<summary>参考答案</summary>

```javascript
class AdaptiveHttpClient {
  constructor() {
    this.metrics = {
      total: 0,
      success: 0,
      latencies: [],
    };
    this.networkType = navigator.connection?.effectiveType || '4g';
    navigator.connection?.addEventListener('change', () => {
      this.networkType = navigator.connection.effectiveType;
    });
  }

  get timeout() {
    return { 'slow-2g': 30000, '2g': 15000, '3g': 10000, '4g': 5000 }[this.networkType] || 10000;
  }

  get retries() {
    const successRate = this.metrics.success / (this.metrics.total || 1);
    if (successRate > 0.95) return 0;
    if (successRate > 0.8) return 1;
    return 3;
  }

  get compression() {
    return ['slow-2g', '2g', '3g'].includes(this.networkType);
  }

  async request(url, options = {}) {
    const start = performance.now();
    let lastError;

    for (let i = 0; i <= this.retries; i++) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeout);

        const headers = { ...options.headers };
        if (this.compression) {
          headers['Accept-Encoding'] = 'gzip, br';
        }

        const response = await fetch(url, {
          ...options,
          signal: AbortSignal.any([controller.signal, options.signal].filter(Boolean)),
          headers,
        });

        clearTimeout(timer);

        this.metrics.total++;
        if (response.ok) this.metrics.success++;
        this.metrics.latencies.push(performance.now() - start);
        if (this.metrics.latencies.length > 100) this.metrics.latencies.shift();

        return response;
      } catch (err) {
        lastError = err;
        if (err.name === 'AbortError' && !navigator.onLine) {
          // 离线时尝试缓存
          const cache = await caches.open('offline-v1');
          const cached = await cache.match(url);
          if (cached) return cached;
        }
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, i)));
      }
    }
    throw lastError;
  }

  getStats() {
    const sorted = [...this.metrics.latencies].sort((a, b) => a - b);
    return {
      total: this.metrics.total,
      successRate: this.metrics.success / (this.metrics.total || 1),
      p95: sorted[Math.floor(sorted.length * 0.95)],
    };
  }
}
```

设计权衡:
1. 基于 Network Information API 获取网络类型
2. 历史成功率驱动重试次数,避免无谓重试
3. 弱网自动启用压缩,减少传输量
4. 离线时降级到 Service Worker 缓存
5. 指标收集用于监控与调优
6. 实际生产还需考虑:请求优先级、队列调度、AB 测试

</details>

---

## 25. 参考文献

### 25.1 规范与标准

1. WHATWG. *Fetch Standard*. Living Standard. https://fetch.spec.whatwg.org/
2. WHATWG. *Streams Standard*. Living Standard. https://streams.spec.whatwg.org/
3. W3C. *Service Worker 1*. Candidate Recommendation, 2024. https://www.w3.org/TR/service-workers-1/
4. ECMA International. *ECMAScript 2025 Language Specification (ECMA-262, 16th Edition)*. 2025. https://tc39.es/ecma262/
5. IETF. *HTTP/1.1: Message Syntax and Routing (RFC 7230)*. 2014. https://tools.ietf.org/html/rfc7230
6. IETF. *HTTP/2 (RFC 7540)*. 2015. https://tools.ietf.org/html/rfc7540

### 25.2 关键论文与文章

7. Anne van Kesteren. *Fetch: a modern replacement for XMLHttpRequest*. WHATWG Blog, 2015. https://blog.whatwg.org/fetching-resources
8. Domenic Denicola. *Streams API: The Web Stream API Explained*. GitHub WICG/streams, 2016.
9. Jake Archibald. *Service Worker gotchas*. Smashing Magazine, 2016.
10. Addy Osmani. *Image Optimization*. O'Reilly Media, 2019.

### 25.3 推荐书籍

11. Thomas Parisot. *HTTP/2 in Action*. Manning Publications, 2021.
12. Ben Schwarz. *High Performance Browser Networking*. O'Reilly Media, 2013.(Ilya Grigorik 著)

---

## 26. 延伸阅读

### 26.1 相关规范

- **Notifications API**:https://notifications.spec.whatwg.org/
- **Push API**:https://w3c.github.io/push-api/
- **Background Sync**:https://wicg.github.io/background-sync/spec/
- **Background Fetch API**:https://wicg.github.io/background-fetch/
- **WebTransport**:https://w3c.github.io/webtransport/

### 26.2 相关 FANDEX 文档

- `javascript/Promise构造器`:深入 Promise A+ 规范、async/await 语义
- `javascript/生成器函数`:异步生成器、CSP 模式
- `javascript/Proxy与Reflect`:Vue 3 响应式实现
- `javascript/事件循环`:微任务、宏任务调度
- `javascript/自定义Error`:HTTP 错误的封装与处理
- `javascript/Web存储API`:localStorage、IndexedDB
- `javascript/索引数据库`:客户端数据库存储

### 26.3 进阶主题

1. **WebRTC**:点对点实时通信
2. **WebTransport**:基于 HTTP/3 的低延迟传输
3. **WebCodecs**:浏览器原生视频/音频编解码
4. **WebTransport over HTTP/3**:下一代实时通信
5. **Edge Computing**:Cloudflare Workers、Deno Deploy、Vercel Edge Functions

### 26.4 工具与库

| 工具          | 用途                    | 链接                              |
| ------------- | ----------------------- | --------------------------------- |
| axios         | HTTP 客户端             | https://axios-http.com/           |
| ky            | 基于 Fetch 的轻量客户端 | https://github.com/sindresorhus/ky|
| got           | Node.js HTTP 客户端     | https://github.com/sindresorhus/got|
| MSW           | Mock Service Worker     | https://mswjs.io/                 |
| Workbox       | Service Worker 工具集   | https://developer.chrome.com/docs/workbox |
| Apollo Client | GraphQL 客户端          | https://www.apollographql.com/    |
| urql          | 轻量 GraphQL 客户端     | https://formidable.com/open-source/urql/ |
| Relay         | Facebook 的 GraphQL 客户端 | https://relay.dev/             |

### 26.5 学习资源

- **MDN Web Docs**:https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API
- **web.dev**:https://web.dev/learn/pwa
- **Google Developers - Service Workers**:https://developers.google.com/web/fundamentals/primers/service-workers
- **Jake Archibald 的博客**:https://jakearchibald.com/
- **Smashing Magazine - PWA**:https://www.smashingmagazine.com/category/progressive-web-apps

---

## 附录 A:浏览器兼容性速查

### A.1 Fetch API

| 浏览器            | 支持版本 |
| ----------------- | -------- |
| Chrome            | 42+      |
| Firefox           | 39+      |
| Safari            | 10.1+    |
| Edge              | 14+      |
| iOS Safari        | 10.3+    |
| Node.js           | 18+      |

### A.2 AbortController

| 浏览器            | 支持版本 |
| ----------------- | -------- |
| Chrome            | 66+      |
| Firefox           | 57+      |
| Safari            | 12.1+    |
| Edge              | 16+      |
| Node.js           | 15+      |

### A.3 Web Streams API

| 浏览器            | 支持版本 |
| ----------------- | -------- |
| Chrome            | 43+      |
| Firefox           | 65+      |
| Safari            | 10.1+    |
| Edge              | 79+      |
| Node.js           | 16+      |

### A.4 Service Worker

| 浏览器            | 支持版本 |
| ----------------- | -------- |
| Chrome            | 40+      |
| Firefox           | 44+      |
| Safari            | 11.1+    |
| Edge              | 17+      |
| iOS Safari        | 11.3+    |

### A.5 新特性

| 特性                       | Chrome | Firefox | Safari |
| -------------------------- | ------ | ------- | ------ |
| AbortSignal.timeout()      | 103+   | 100+    | 16+    |
| AbortSignal.any()          | 116+   | 124+    | 17.4+  |
| Response.json()            | 105+   | 无      | 无     |
| Priority Hints             | 101+   | 无      | 无     |
| CompressionStream          | 80+    | 113+    | 16.4+  |

---

## 附录 B:常见 HTTP 状态码速查

| 状态码 | 含义                  | 典型场景                          |
| ------ | --------------------- | --------------------------------- |
| 200    | OK                    | 请求成功                          |
| 201    | Created               | POST 创建资源成功                 |
| 204    | No Content            | 请求成功但无响应体(DELETE/PUT)  |
| 206    | Partial Content       | Range 请求(分块下载)            |
| 301    | Moved Permanently     | 永久重定向                        |
| 302    | Found                 | 临时重定向                        |
| 304    | Not Modified          | 条件请求命中缓存                  |
| 400    | Bad Request           | 请求参数错误                      |
| 401    | Unauthorized          | 未认证(需要登录)                |
| 403    | Forbidden             | 已认证但无权限                    |
| 404    | Not Found             | 资源不存在                        |
| 405    | Method Not Allowed    | 方法不允许(如对 /users 用 DELETE)|
| 408    | Request Timeout       | 请求超时                          |
| 409    | Conflict              | 资源冲突(并发修改)              |
| 413    | Payload Too Large     | 请求体过大                        |
| 415    | Unsupported Media Type| Content-Type 不支持               |
| 429    | Too Many Requests     | 限流(配合 Retry-After 头部)     |
| 500    | Internal Server Error | 服务器内部错误                    |
| 502    | Bad Gateway           | 网关错误(上游无响应)            |
| 503    | Service Unavailable   | 服务不可用(维护中)              |
| 504    | Gateway Timeout       | 网关超时                          |

---

## 附录 C:Fetch 选项完整参考

```javascript
fetch(url, {
  // HTTP 方法
  method: 'GET' | 'HEAD' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS',

  // 请求头
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer token',
    // ...
  } | Headers,

  // 请求体
  body: string | Blob | ArrayBuffer | Uint8Array | FormData | URLSearchParams | ReadableStream,

  // 跨域模式
  mode: 'cors' | 'no-cors' | 'same-origin' | 'navigate' | 'websocket',

  // 凭证
  credentials: 'omit' | 'same-origin' | 'include',

  // 缓存模式
  cache: 'default' | 'no-store' | 'reload' | 'no-cache' | 'force-cache' | 'only-if-cached',

  // 重定向
  redirect: 'follow' | 'error' | 'manual',

  // 来源
  referrer: string,
  referrerPolicy: 'no-referrer' | 'no-referrer-when-downgrade' | 'same-origin' | 'origin' | 'strict-origin' | 'origin-when-cross-origin' | 'strict-origin-when-cross-origin' | 'unsafe-url',

  // 完整性校验
  integrity: 'sha256-abc...' | 'sha384-abc...' | 'sha512-abc...',

  // 保持连接
  keepalive: boolean,

  // 取消信号
  signal: AbortSignal,

  // 优先级
  priority: 'high' | 'low' | 'auto',
});
```

---

## 附录 D:Stream 类型关系图

```
┌─────────────────┐     pipeThrough     ┌─────────────────┐     pipeTo     ┌─────────────────┐
│  ReadableStream │ ──────────────────> │ TransformStream │ ─────────────> │ WritableStream  │
│  (生产者)       │                     │  (转换器)        │                │  (消费者)        │
└─────────────────┘                     └─────────────────┘                └─────────────────┘
        │                                        │
        │ tee()                                  │
        ▼                                        ▼
┌─────────────────┐                     ┌─────────────────┐
│  ReadableStream │                     │  ReadableStream │
│  (分叉 1)       │                     │  (TransformStream│
└─────────────────┘                     │   的可读端)      │
                                        └─────────────────┘
```

---

## 附录 E:Service Worker 事件生命周期

```
注册 ──> installing ──> installed ──> activating ──> activated ──> (运行中)
                                                                    │
                                                                    │ fetch
                                                                    │ push
                                                                    │ sync
                                                                    │ message
                                                                    │
                                                                    ▼
                                                              (被新版本替换)
                                                                    │
                                                                    ▼
                                                                redundant
```

主要事件:
- `install`:首次安装或新版本下载后触发
- `activate`:新版本接管时触发,适合清理旧缓存
- `fetch`:页面发起网络请求时触发
- `push`:收到 Push 通知时触发
- `sync`:后台同步(网络恢复时)
- `periodicsync`:周期性后台同步
- `message`:与主线程通信
- `notificationclick`:用户点击通知

---

## 附录 F:常见 Content-Type 对照

| Content-Type                         | 用途                          | body 类型      |
| ------------------------------------ | ----------------------------- | -------------- |
| application/json                     | JSON 数据                     | string         |
| application/x-www-form-urlencoded    | 表单数据(URL 编码)          | string/URLSearchParams |
| multipart/form-data                  | 文件上传                      | FormData       |
| text/plain                           | 纯文本                        | string         |
| text/html                            | HTML                          | string         |
| application/xml                      | XML                           | string         |
| application/octet-stream             | 二进制数据                    | Blob/ArrayBuffer |
| image/png, image/jpeg                | 图片                          | Blob           |

---

## 附录 G:Fetch 与 async/await 协同模式

### G.1 顺序请求

```javascript
async function fetchSequential() {
  const user = await fetch('/api/user').then((r) => r.json());
  const posts = await fetch(`/api/posts?userId=${user.id}`).then((r) => r.json());
  const comments = await fetch(`/api/comments?postId=${posts[0].id}`).then((r) => r.json());
  return { user, posts, comments };
}
```

### G.2 并发请求

```javascript
async function fetchParallel() {
  const [user, posts, comments] = await Promise.all([
    fetch('/api/user').then((r) => r.json()),
    fetch('/api/posts').then((r) => r.json()),
    fetch('/api/comments').then((r) => r.json()),
  ]);
  return { user, posts, comments };
}
```

### G.3 竞速

```javascript
async function fetchRace(urls) {
  // 任一完成即返回,其他被忽略(但不会取消)
  const response = await Promise.race(urls.map((url) => fetch(url)));
  return response;
}
```

### G.4 全部完成(包括失败)

```javascript
async function fetchAllSettled(urls) {
  const results = await Promise.allSettled(urls.map((url) => fetch(url)));
  return results.map((r) => ({
    status: r.status,
    value: r.status === 'fulfilled' ? r.value : null,
    reason: r.status === 'rejected' ? r.reason : null,
  }));
}
```

### G.5 重试 + 退避

```javascript
async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i <= retries; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
    } catch (err) {
      if (i === retries) throw err;
    }
    await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, i)));
  }
}
```

---

## 附录 H:调试技巧

### H.1 Chrome DevTools

1. **Network 面板**:查看所有请求、响应、耗时
2. **Application > Service Workers**:查看注册状态、手动更新、卸载
3. **Application > Cache Storage**:查看缓存内容
4. **Lighthouse**:PWA 评分、性能分析

### H.2 在 Service Worker 中调试

```javascript
// sw.js
self.addEventListener('fetch', (event) => {
  console.log('[SW] 拦截请求:', event.request.url);
  // 在 DevTools 的 Console 中切换到 Service Worker 上下文查看日志
  event.respondWith(fetch(event.request));
});
```

### H.3 调试 CORS

```javascript
// 在 Console 中手动测试
fetch('https://api.example.com/data', { mode: 'cors' })
  .then((r) => console.log('成功:', r))
  .catch((e) => console.error('失败:', e));

// 查看具体错误
// Chrome: chrome://flags/#enable-experimental-web-platform-features
// 在 Console 中启用 "Verbose" 级别查看详细 CORS 错误
```

### H.4 模拟离线

```javascript
// DevTools > Application > Service Workers > Offline
// 或
if ('connection' in navigator) {
  console.log(navigator.connection.effectiveType);
  console.log(navigator.connection.downlink);
  console.log(navigator.connection.rtt);
}
```

---

## 附录 I:从 XMLHttpRequest 迁移到 Fetch

### I.1 GET 请求

```javascript
// XHR
const xhr = new XMLHttpRequest();
xhr.open('GET', '/api/data', true);
xhr.onreadystatechange = function () {
  if (xhr.readyState === 4 && xhr.status === 200) {
    console.log(JSON.parse(xhr.responseText));
  }
};
xhr.send();

// Fetch
const response = await fetch('/api/data');
const data = await response.json();
console.log(data);
```

### I.2 POST 请求

```javascript
// XHR
const xhr = new XMLHttpRequest();
xhr.open('POST', '/api/data', true);
xhr.setRequestHeader('Content-Type', 'application/json');
xhr.onreadystatechange = function () {
  if (xhr.readyState === 4 && xhr.status === 201) {
    console.log(JSON.parse(xhr.responseText));
  }
};
xhr.send(JSON.stringify({ name: 'Alice' }));

// Fetch
const response = await fetch('/api/data', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Alice' }),
});
const data = await response.json();
console.log(data);
```

### I.3 上传进度

```javascript
// XHR
const xhr = new XMLHttpRequest();
xhr.upload.addEventListener('progress', (e) => {
  const percent = (e.loaded / e.total * 100).toFixed(2);
  console.log(`上传进度: ${percent}%`);
});
xhr.open('POST', '/api/upload', true);
xhr.send(formData);

// Fetch(不支持上传进度,需用 XMLHttpRequest 兼容)
// 替代方案:使用 ReadableStream(实验性)
// 或继续使用 XHR 进行带进度的上传
```

### I.4 下载进度

```javascript
// XHR
const xhr = new XMLHttpRequest();
xhr.addEventListener('progress', (e) => {
  const percent = e.lengthComputable
    ? (e.loaded / e.total * 100).toFixed(2)
    : '?';
  console.log(`下载进度: ${percent}%`);
});
xhr.open('GET', '/api/large-file', true);
xhr.responseType = 'blob';
xhr.onload = function () {
  console.log(xhr.response);
};
xhr.send();

// Fetch(流式)
const response = await fetch('/api/large-file');
const total = parseInt(response.headers.get('Content-Length'), 10);
const reader = response.body.getReader();
let received = 0;
const chunks = [];
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  chunks.push(value);
  received += value.length;
  console.log(`下载进度: ${(received / total * 100).toFixed(2)}%`);
}
const blob = new Blob(chunks);
```

### I.5 超时

```javascript
// XHR
const xhr = new XMLHttpRequest();
xhr.timeout = 5000;
xhr.ontimeout = function () {
  console.log('请求超时');
};
xhr.open('GET', '/api/data', true);
xhr.send();

// Fetch
const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), 5000);
try {
  const response = await fetch('/api/data', { signal: controller.signal });
} catch (err) {
  if (err.name === 'AbortError') {
    console.log('请求超时');
  }
} finally {
  clearTimeout(timer);
}

// 或使用 AbortSignal.timeout()(ES2022+)
const response = await fetch('/api/data', { signal: AbortSignal.timeout(5000) });
```

---

## 附录 J:术语表

| 术语              | 英文                     | 释义                                              |
| ----------------- | ------------------------ | ------------------------------------------------- |
| 同源策略          | Same-origin policy       | 浏览器限制跨源访问的安全机制                      |
| CORS              | Cross-Origin Resource Sharing | 跨域资源共享,通过 HTTP 头部授权跨域访问      |
| 预检请求          | Preflight request        | 跨域复杂请求前的 OPTIONS 探测                     |
| 简单请求          | Simple request           | 不触发预检的跨域请求                              |
| 凭证              | Credentials              | cookie、HTTP 认证、客户端 SSL 证书                |
| 背压              | Backpressure             | 消费者慢于生产者时反向施压的机制                  |
| 流                | Stream                   | 按顺序到达的数据序列                              |
| 管道              | Pipe                     | 流之间的连接,数据自动从读端流向写端              |
| 服务工作线程      | Service Worker           | 浏览器后台运行的脚本,可拦截网络请求              |
| 缓存优先          | Cache First              | 优先从缓存读取,未命中再请求网络                  |
| 网络优先          | Network First            | 优先请求网络,失败再读缓存                        |
| 过期时重新验证    | Stale-While-Revalidate   | 立即返回缓存,后台异步更新                        |
| 熔断器            | Circuit Breaker          | 错误累积到阈值时停止请求,避免雪崩                |
| 限流              | Rate Limiting            | 限制单位时间内的请求数量                          |
| 指数退避          | Exponential Backoff      | 重试间隔按指数增长,避免惊群                       |
| 抖动              | Jitter                   | 在退避基础上加随机量,避免同步重试                |
| 幂等              | Idempotent               | 多次执行结果相同(GET/PUT/DELETE 幂等,POST 不幂等)|
| 代理              | Proxy                    | 中间人转发请求(Service Worker 即代理)            |
| 拦截器            | Interceptor              | 在请求/响应前后注入逻辑的机制                     |
| 离线优先          | Offline First            | 优先考虑离线场景的设计哲学                        |
| 渐进式 Web 应用   | Progressive Web App      | 使用 Service Worker 等技术的 Web 应用形态         |

---

## 结语

网络请求 API 是现代 Web 应用的基石。从 XMLHttpRequest 的回调地狱,到 Fetch 的 Promise 抽象,再到 Streams API 的流式处理与 Service Worker 的离线能力,Web 平台的网络栈日益强大。

掌握 Fetch 标准、AbortController 取消语义、Web Streams API、Service Worker 缓存策略,以及重试、熔断、限流等分布式系统模式,是构建生产级 Web 应用的必备能力。希望本文能为你的工程实践提供坚实的理论基础与可复用的代码模板。

继续深入学习:

- **WebSocket / WebTransport**:实时通信
- **WebRTC**:点对点音视频
- **HTTP/3 (QUIC)**:下一代传输协议
- **Edge Computing**:边缘计算(Cloudflare Workers、Vercel Edge)
- **BFF 模式**:Backend for Frontend

愿你在 Web 工程之路上,代码稳健、请求高效、响应流畅。
