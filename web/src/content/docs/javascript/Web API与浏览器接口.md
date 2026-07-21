---
order: 120
tags:
  - javascript
  - 'web-api'
difficulty: intermediate
title: 'Web API 与浏览器接口'
module: javascript
category: 'JS Basics'
description: '浏览器 Web API 详解：Fetch、Storage、IntersectionObserver、Web Workers、Geolocation、Broadcast Channel、ResizeObserver 等常用接口的形式化定义、工程实践与性能优化。'
author: fanquanpp
updated: '2026-07-21'
related:
  - javascript/错误边界与全局错误捕获
  - javascript/内存泄漏排查
  - javascript/调试与性能优化
  - javascript/典型项目实战
prerequisites:
  - javascript/语法速查
  - javascript/ES6+新特性
  - javascript/控制流
---

# Web API 与浏览器接口

## 1. 引言

Web API 是浏览器暴露给 JavaScript 的一组宿主对象与接口集合，它构成了 ECMAScript 语言内核与外部世界（网络、存储、设备、渲染管线、操作系统）之间的契约层。如果没有 Web API，JavaScript 仅是一门能操作数值、字符串与对象的纯计算语言；正是 Web API 让 JavaScript 具备了"感知与改造现实世界"的能力——发起网络请求、持久化数据、监听视口变化、调度后台线程、获取地理位置、推送系统通知、剪贴板读写、设备方向感知等。

理解 Web API 不仅是掌握"调用方式"，更重要的是理解其背后的**异步模型**、**生命周期**、**安全模型**（同源策略、CORS、CSP、权限 API）、**事件循环集成方式**以及**资源回收契约**。本文档从历史演进、形式化定义、理论推导、工程实践、陷阱分析、案例研究六个维度系统讲解现代浏览器 Web API 的核心子集。

## 2. 学习目标

本节采用 Anderson & Krathwohl 修订版 Bloom 分类法，按认知层级划分学习目标：

| 认知层级 | 学习目标描述 |
| --- | --- |
| 记忆（Remembering） | 列举 15 个以上常用 Web API 的名称、用途与典型调用形态；背诵 Fetch、Storage、IntersectionObserver 的核心方法签名 |
| 理解（Understanding） | 解释事件循环、宏任务、微任务与 Web API 回调的调度关系；用自己的话描述同源策略与 CORS 预检流程 |
| 应用（Applying） | 在生产代码中正确使用 AbortController 取消 Fetch；用 IntersectionObserver 实现懒加载与无限滚动 |
| 分析（Analyzing） | 对比 localStorage、sessionStorage、IndexedDB、Cache API 的容量、同步性、作用域与适用场景；区分 `postMessage`、`BroadcastChannel`、`MessageChannel` 三种消息传递机制 |
| 评价（Evaluating） | 评估一个 Web Worker 方案的可行性与代价（结构化克隆开销、传输数据量、线程数）；判断 IntersectionObserver 触发抖动是否由祖先元素 transform 引起 |
| 创造（Creating） | 设计一个带取消、超时、重试、进度监控的 Fetch 封装；基于 BroadcastChannel + IndexedDB 构建多标签页状态同步库 |

完成本节学习后，读者应能独立分析任意 Web API 的 MDN 文档，并写出符合工程规范的封装代码。

## 3. 历史动机与背景

### 3.1 Web API 的演化时间线

| 年份 | 关键里程碑 | 解决的核心问题 |
| --- | --- | --- |
| 1995 | LiveScript 嵌入 Netscape Navigator，提供 `document`、`window` 等宿主对象 | 让网页具备动态交互能力 |
| 2000 | XMLHttpRequest（XHR）由微软在 IE5 中引入 | 异步从服务器获取数据，奠定 AJAX 基础 |
| 2006 | W3C 开始标准化 Web Storage 草案（`localStorage`、`sessionStorage`） | 替代 cookie 存储非敏感数据，减少网络开销 |
| 2009 | Web Workers 规范发布 | 将耗时计算移出主线程，避免 UI 阻塞 |
| 2015 | Fetch API 在 Chrome 42 落地 | 替代 XHR 的回调地狱，基于 Promise 设计 |
| 2017 | IntersectionObserver 在 Chrome 51 实现 | 替代滚动事件监听 + `getBoundingClientRect` 的高成本方案 |
| 2018 | ResizeObserver 在 Chrome 64 落地 | 替代 `window.resize` + 轮询元素尺寸的方案 |
| 2019 | Broadcast Channel API 全面支持 | 多标签页同源通信，替代 `localStorage` 事件的 hack 写法 |
| 2022 | AbortSignal.timeout 静态方法标准化 | 简化 Fetch 超时控制，替代手写 `setTimeout` + `controller.abort()` |
| 2023 | WebGPU 在 Chrome 113 落地 | 替代 WebGL，提供现代 GPU 计算与渲染能力 |
| 2024 | Storage Access API、Permissions API 广泛落地 | 隐私优先时代下的权限治理 |

### 3.2 设计动机分析

Web API 的演化遵循三条主线：

1. **异步化**：从回调（XHR、`setTimeout`）→ Promise（Fetch）→ Async/Await（ES2017）→ 异步迭代器（Streams API）。每次演化都是为了解决"回调地狱"与错误传播问题。
2. **零开销观察者**：`scroll`、`resize`、`mutation` 事件在主线程触发，成本高昂。`IntersectionObserver`、`ResizeObserver`、`MutationObserver`、`PerformanceObserver` 把监听逻辑下沉到浏览器内核，仅在状态变化时回调，大幅降低主线程压力。
3. **能力解耦与权限化**：早期浏览器把能力直接挂在 `navigator` 上（如 `navigator.geolocation`）；现代 API 采用 Permissions API 模型，调用前显式请求权限，符合隐私优先的 Web 演进方向。

## 4. 形式化定义

### 4.1 宿主对象与 Web API 接口

设 $H$ 为宿主环境（browser、Node、Deno 等），$E$ 为 ECMAScript 运行时。Web API 可形式化为一个映射：

$$
\text{WebAPI}: H \rightarrow \mathcal{P}(\text{Interface})
$$

其中 $\mathcal{P}(\cdot)$ 表示幂集。每个接口 $I \in \text{WebAPI}(H)$ 可表示为五元组：

$$
I = \langle M, E_v, S, L, P \rangle
$$

- $M$：方法集合（如 `fetch()`、`getItem()`）
- $E_v$：事件集合（如 `Worker.onmessage`、`BroadcastChannel.onmessage`）
- $S$：状态空间（如 `Worker` 的 `running` / `terminated`，`IDBDatabase` 的 `open` / `blocked` / `upgradeneeded`）
- $L$：生命周期转移函数 $L: S \times \Sigma \rightarrow S$，$\Sigma$ 为事件集合
- $P$：权限要求（如 `geolocation` 需要 `permission.state === 'granted'`）

### 4.2 Fetch 的形式化语义

Fetch 操作可建模为一个三元组 $\langle \text{Request}, \text{Response}, \text{AbortSignal} \rangle$。设 $R$ 为 Request，$A$ 为 AbortSignal，则 Fetch 是从 Request 与 AbortSignal 到 Response Promise 的函数：

$$
\text{fetch}: R \times A \rightarrow \text{Promise}\langle \text{Response} \rangle
$$

Response 内部是一个可读流，其类型签名为：

$$
\text{Response.body}: \text{ReadableStream}\langle \text{Uint8Array} \rangle
$$

`ReadableStream` 满足下列异步迭代器协议：

$$
\text{next}: \text{ReadableStream} \rightarrow \text{Promise}\langle \{ \text{done}: \text{boolean}, \text{value}: \text{Uint8Array} \} \rangle
$$

### 4.3 Storage 的代数结构

设 $\text{Storage}$ 是一个键值存储，其代数结构满足：

$$
\text{Storage} = \langle K, V, \text{get}, \text{set}, \text{remove}, \text{clear} \rangle
$$

其中：

- $K$：键空间，为字符串集合
- $V$：值空间，序列化为字符串
- $\text{get}: K \rightarrow V \cup \{\text{null}\}$
- $\text{set}: K \times V \rightarrow \varnothing$（幂等：$\text{set}(k, \text{set}(k, v)) = \text{set}(k, v)$）
- $\text{remove}: K \rightarrow \varnothing$（满足 $\text{get}(\text{remove}(k)) = \text{null}$）

### 4.4 Observer 模式的形式化

设 $O$ 为 Observer，$T$ 为 Target，$Cb$ 为回调。Observer 系统满足：

$$
\text{observe}: O \times T \times Cb \rightarrow \varnothing
$$

回调触发条件 $c: T \rightarrow \{0, 1\}$ 由浏览器内核评估。仅当 $c(T) = 1$ 时，回调 $Cb$ 被加入任务队列：

$$
\forall t: c(T_t) = 1 \Rightarrow \text{enqueue}(Cb, T_t)
$$

这种设计把"是否触发"的判定从 JavaScript 主线程下沉到内核，避免了主线程频繁轮询。

### 4.5 Web Worker 的并发模型

Worker 之间通过消息传递通信（Actor 模型）。设 $W_1, W_2$ 为两个 Worker，消息传递可形式化为：

$$
\text{postMessage}: W_1 \times M \rightarrow W_2
$$

其中 $M$ 为消息内容。消息通过**结构化克隆算法**（Structured Clone Algorithm）深拷贝：

$$
\text{clone}: M \rightarrow M'
$$

对于可转移对象（`ArrayBuffer`、`MessagePort`、`ImageBitmap`），可使用 transfer 列表避免拷贝：

$$
\text{postMessage}(M, \text{transferList}) \Rightarrow M' = M \text{（所有权转移，原对象失效）}
$$

## 5. 理论推导

### 5.1 事件循环与 Web API 回调的调度

浏览器事件循环可抽象为：

$$
\text{EventLoop} = \text{Loop}\Big(\text{macroTask} \rightarrow \text{microTask}^* \rightarrow \text{render?}\Big)
$$

- 宏任务（macrotask）：`setTimeout`、`setInterval`、XHR 回调、Fetch.then 回调、MessageChannel 端口消息、Worker 消息
- 微任务（microtask）：`Promise.then`、`queueMicrotask`、`MutationObserver` 回调
- 渲染：仅在浏览器需要时触发（约 16.67ms 一次，60fps）

推论 1：**所有 Web API 的 Promise 回调都会作为微任务执行**，因此 `fetch().then(cb)` 中的 `cb` 在当前宏任务结束后、下一次渲染前执行。

推论 2：**IntersectionObserver 回调是微任务**，而 `scroll` 事件回调是宏任务（实际上 `scroll` 会在渲染前合并触发）。因此 IntersectionObserver 在高频滚动场景下性能更优。

### 5.2 结构化克隆的复杂度分析

结构化克隆算法的时间复杂度：

$$
T(n) = O(n) + \sum_{i} T(n_i)
$$

其中 $n$ 为对象大小，$n_i$ 为子属性大小。对于循环引用，使用 `SeenMap` 记录已访问对象，保证终止性：

$$
T(n) = O(n) \text{（循环引用不增加复杂度，仅增加常数因子）}
$$

对于 `ArrayBuffer`，不通过结构化克隆而是转移所有权，复杂度降为 $O(1)$：

$$
T_{\text{transfer}}(\text{ArrayBuffer}) = O(1)
$$

### 5.3 IndexedDB 事务的隔离性

IndexedDB 遵循 ACID 中的 A（原子性）与 I（隔离性）。事务 $T$ 持有对象存储 $S$ 上的锁，直到 $T$ 提交或回滚：

$$
\text{Lock}(S) = \{ T \} \Rightarrow \forall T' \neq T: \text{Wait}(T', S)
$$

IndexedDB 没有"读锁/写锁"区分，同一对象存储上的并发事务串行执行。这与 SQLite 的 WAL 模式不同，后者允许读写并发。

### 5.4 Fetch 取消的传播

当调用 `controller.abort()` 时，AbortSignal 触发 `abort` 事件，Fetch 内部传播取消信号到底层网络栈：

$$
\text{abort}() \rightarrow \text{signal.aborted} := \text{true} \rightarrow \text{TcpConnection.close}()
$$

对于已发出的 HTTP 请求，浏览器会关闭 TCP 连接，导致服务器端可能收到 `ECONNRESET`。因此**取消 Fetch 不能保证服务器未收到请求**，业务层需配合幂等性设计。

### 5.5 Web Worker 的内存开销

每个 Worker 拥有独立的 V8 Isolate，堆内存独立。Worker 启动开销 $T_{\text{startup}}$ 与脚本大小 $|S|$ 成正比：

$$
T_{\text{startup}} \approx \alpha \cdot |S| + \beta
$$

经验值：$\alpha \approx 0.1 \text{ms/KB}$，$\beta \approx 30 \text{ms}$（V8 Isolate 初始化）。因此 Worker 适合长期任务而非短任务（短任务建议用 `Promise` + `requestIdleCallback`）。

## 6. 代码示例

### 6.1 Fetch 基础用法

```javascript
// 基本的 GET 请求：使用 async/await 配合 try/catch 处理异常
async function fetchUsers() {
  try {
    const response = await fetch('https://api.example.com/users');
    // response.ok 仅当状态码在 200-299 区间时为 true
    if (!response.ok) {
      throw new Error(`HTTP 错误: ${response.status} ${response.statusText}`);
    }
    const users = await response.json();
    return users;
  } catch (error) {
    // 网络错误、JSON 解析错误都会进入这里
    console.error('获取用户列表失败:', error);
    throw error;
  }
}

// POST 请求：显式设置 Content-Type 与请求体
async function createUser(user) {
  const response = await fetch('https://api.example.com/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify(user),
  });
  if (!response.ok) throw new Error('创建失败');
  // 201 Created 通常返回新创建的资源
  return response.json();
}
```

### 6.2 Fetch 完整配置

```javascript
// Fetch 的完整选项：演示所有常用配置
async function advancedFetch() {
  const response = await fetch('https://api.example.com/data', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer token123',
    },
    body: JSON.stringify({ name: 'Alice', age: 25 }),
    mode: 'cors',            // cors | same-origin | no-cors
    credentials: 'include',   // include | same-origin | omit
    cache: 'no-cache',        // default | no-cache | reload | no-store
    redirect: 'follow',       // follow | error | manual
    referrerPolicy: 'no-referrer',
    // AbortSignal.timeout 是 ES2023 新增，无需手写 setTimeout
    signal: AbortSignal.timeout(5000),
  });

  // 不同的响应读取方式
  const text = await response.text();          // 文本
  const json = await response.json();          // JSON
  const blob = await response.blob();          // 二进制大对象
  const arrayBuffer = await response.arrayBuffer();   // ArrayBuffer
  const formData = await response.formData();   // FormData

  // 响应头读取
  console.log(response.headers.get('Content-Type'));
  console.log(response.status);  // 200
  console.log(response.ok);      // true
}
```

### 6.3 AbortController 取消请求

```javascript
// 手动取消：用户点击取消按钮时调用 controller.abort()
const controller = new AbortController();
const signal = controller.signal;

fetch('https://api.example.com/slow', { signal })
  .then((response) => response.json())
  .then((data) => console.log(data))
  .catch((err) => {
    // 区分取消错误与其他网络错误
    if (err.name === 'AbortError') {
      console.log('请求已取消');
    } else {
      console.error('请求失败:', err);
    }
  });

// 5 秒后自动取消
setTimeout(() => controller.abort(), 5000);

// 封装支持超时的 fetch
function fetchWithTimeout(url, options = {}, timeout = 5000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  return fetch(url, { ...options, signal: controller.signal }).finally(
    () => clearTimeout(id)
  );
}
```

### 6.4 文件上传与下载

```javascript
// 文件上传：使用 FormData 自动设置 multipart/form-data
async function uploadFile(file) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('metadata', JSON.stringify({ name: file.name }));

  // 注意：不要手动设置 Content-Type，浏览器会自动添加 boundary
  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });
  return response.json();
}

// 带进度监控的上传：Fetch 暂不支持上传进度，需回退到 XMLHttpRequest
function uploadWithProgress(file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload');

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percent = (e.loaded / e.total) * 100;
        onProgress(percent);
      }
    });

    xhr.addEventListener('load', () => resolve(JSON.parse(xhr.responseText)));
    xhr.addEventListener('error', () => reject(new Error('上传失败')));

    const formData = new FormData();
    formData.append('file', file);
    xhr.send(formData);
  });
}

// 文件下载：将 Blob 转为可下载 URL
async function downloadFile(url, filename) {
  const response = await fetch(url);
  const blob = await response.blob();
  const downloadUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = filename;
  a.click();
  // 释放 Blob URL，避免内存泄漏
  URL.revokeObjectURL(downloadUrl);
}
```

### 6.5 Web Storage

```javascript
// localStorage：同源共享，持久化存储
localStorage.setItem('username', 'Alice');
const username = localStorage.getItem('username'); // "Alice"
localStorage.removeItem('username');
localStorage.clear();

// sessionStorage：会话级，标签页关闭后清除
sessionStorage.setItem('tempData', JSON.stringify({ page: 1 }));
const data = JSON.parse(sessionStorage.getItem('tempData'));

// 封装带过期时间的 Storage：解决 localStorage 无 TTL 的痛点
const storage = {
  set(key, value, ttl = null) {
    const item = {
      value,
      expiry: ttl ? Date.now() + ttl : null,
    };
    localStorage.setItem(key, JSON.stringify(item));
  },
  get(key) {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const item = JSON.parse(raw);
    // 过期检查：惰性删除，避免主动轮询
    if (item.expiry && Date.now() > item.expiry) {
      localStorage.removeItem(key);
      return null;
    }
    return item.value;
  },
  remove(key) {
    localStorage.removeItem(key);
  },
};

// 使用：1 小时后过期
storage.set('token', 'abc123', 3600000);
console.log(storage.get('token'));
```

### 6.6 Storage 事件监听

```javascript
// 监听其他标签页的 storage 变化：仅在多标签页同源时触发
// 注意：当前标签页的 setItem 不会触发自己的 storage 事件
window.addEventListener('storage', (event) => {
  console.log('Key:', event.key);
  console.log('Old value:', event.oldValue);
  console.log('New value:', event.newValue);
  console.log('URL:', event.url);
  console.log('Storage area:', event.storageArea);
});
```

### 6.7 IndexedDB

```javascript
// IndexedDB：用于存储大量结构化数据
// 封装为 Promise 风格，避免回调地狱
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('MyDatabase', 1);

    // onupgradeneeded 仅在首次创建或版本号升级时触发
    // 这是唯一可以修改对象存储结构的回调
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('users')) {
        const store = db.createObjectStore('users', { keyPath: 'id' });
        store.createIndex('name', 'name', { unique: false });
        store.createIndex('email', 'email', { unique: true });
      }
    };

    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

async function addUser(db, user) {
  return new Promise((resolve, reject) => {
    // 事务模式：readonly | readwrite | versionchange
    const tx = db.transaction('users', 'readwrite');
    const store = tx.objectStore('users');
    const request = store.add(user);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getUserByName(db, name) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('users', 'readonly');
    const store = tx.objectStore('users');
    const index = store.index('name');
    const request = index.get(name);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
```

### 6.8 IntersectionObserver 懒加载

```javascript
// 图片懒加载：仅在图片进入视口前 100px 时加载
const lazyImages = document.querySelectorAll('img[data-src]');

const imageObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
        // 加载完成后停止观察，避免内存泄漏
        imageObserver.unobserve(img);
      }
    });
  },
  {
    rootMargin: '100px', // 提前 100px 开始加载
    threshold: 0.01,
  }
);

lazyImages.forEach((img) => imageObserver.observe(img));
```

### 6.9 IntersectionObserver 无限滚动

```javascript
// 无限滚动：监听底部哨兵元素
const sentinel = document.getElementById('sentinel');

const scrollObserver = new IntersectionObserver(
  (entries) => {
    if (entries[0].isIntersecting) {
      loadMoreData();
    }
  },
  {
    rootMargin: '200px',
  }
);

scrollObserver.observe(sentinel);

let page = 1;
let loading = false;

async function loadMoreData() {
  if (loading) return;
  loading = true;

  const response = await fetch(`/api/items?page=${page}`);
  const data = await response.json();

  if (data.items.length > 0) {
    appendItems(data.items);
    page++;
  } else {
    // 没有更多数据，断开观察
    scrollObserver.disconnect();
  }

  loading = false;
}
```

### 6.10 Web Worker

```javascript
// 主线程：创建 Worker 并通信
const worker = new Worker('worker.js');

worker.postMessage({ type: 'compute', data: [1, 2, 3, 4, 5] });

worker.onmessage = (event) => {
  console.log('Worker 返回:', event.data);
};

worker.onerror = (error) => {
  console.error('Worker 错误:', error.message);
};

// 终止 Worker
// worker.terminate();

// worker.js 内容：
// self.onmessage = function(event) {
//   const { type, data } = event.data;
//   if (type === 'compute') {
//     const result = data.reduce((sum, n) => sum + n * n, 0);
//     self.postMessage({ type: 'result', data: result });
//   }
// };
```

### 6.11 内联 Worker

```javascript
// 使用 Blob 创建内联 Worker：无需独立 .js 文件
const workerCode = `
  self.onmessage = function(event) {
    const result = heavyComputation(event.data);
    self.postMessage(result);
  };

  function heavyComputation(n) {
    let result = 0;
    for (let i = 0; i < n; i++) {
      result += Math.sqrt(i);
    }
    return result;
  }
`;

const blob = new Blob([workerCode], { type: 'application/javascript' });
const workerUrl = URL.createObjectURL(blob);
const worker = new Worker(workerUrl);

worker.postMessage(1000000);
worker.onmessage = (e) => {
  console.log('结果:', e.data);
  // 使用后释放 Blob URL
  URL.revokeObjectURL(workerUrl);
};
```

### 6.12 BroadcastChannel 多标签页通信

```javascript
// 多标签页通信：BroadcastChannel 是同源多标签页通信的标准方案
// 标签页 A：发送消息
const channel = new BroadcastChannel('app_sync');
channel.postMessage({ type: 'logout', userId: 123 });

// 标签页 B：接收消息
const channel2 = new BroadcastChannel('app_sync');
channel2.onmessage = (event) => {
  console.log('收到消息:', event.data);
  if (event.data.type === 'logout') {
    // 其他标签页登出时，本标签页同步清理
    clearUserData();
  }
};

// 关闭时释放
// channel.close();
```

### 6.13 Geolocation

```javascript
// 地理位置获取：需要 HTTPS 与用户授权
if ('geolocation' in navigator) {
  navigator.geolocation.getCurrentPosition(
    (position) => {
      console.log('纬度:', position.coords.latitude);
      console.log('经度:', position.coords.longitude);
      console.log('精度（米）:', position.coords.accuracy);
    },
    (error) => {
      // 错误码：1=PERMISSION_DENIED, 2=POSITION_UNAVAILABLE, 3=TIMEOUT
      console.error('定位失败:', error.message);
    },
    {
      enableHighAccuracy: true,  // 高精度模式
      timeout: 10000,            // 10 秒超时
      maximumAge: 300000,        // 缓存 5 分钟内的位置
    }
  );

  // 持续监听位置变化
  const watchId = navigator.geolocation.watchPosition(
    (position) => console.log(position),
    (error) => console.error(error)
  );

  // 停止监听
  // navigator.geolocation.clearWatch(watchId);
}
```

### 6.14 Clipboard API

```javascript
// 复制文本到剪贴板：Clipboard API 是异步的
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    console.log('已复制到剪贴板');
  } catch (err) {
    // 降级方案：旧浏览器不支持 Clipboard API
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
}

// 读取剪贴板：需要用户手势触发，且需要权限
async function readClipboard() {
  try {
    const text = await navigator.clipboard.readText();
    console.log('剪贴板内容:', text);
  } catch (err) {
    console.error('读取剪贴板失败:', err);
  }
}
```

### 6.15 Notification API

```javascript
// 系统通知：需要用户授权
async function requestNotificationPermission() {
  if (!('Notification' in window)) return;

  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
    new Notification('消息标题', {
      body: '这是通知内容',
      icon: '/icon.png',
      badge: '/badge.png',
      tag: 'unique-tag', // 相同 tag 替换旧通知
      data: { url: '/detail' },
    });
  }
}

// Service Worker 中处理通知点击
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  clients.openWindow(url);
});
```

### 6.16 ResizeObserver

```javascript
// 监听元素尺寸变化：替代 window.resize + getBoundingClientRect 的方案
const resizeObserver = new ResizeObserver((entries) => {
  for (const entry of entries) {
    const { width, height } = entry.contentRect;
    console.log(`元素尺寸: ${width}x${height}`);
    // 根据新尺寸重新渲染图表等
    redrawChart(entry.target, width, height);
  }
});

resizeObserver.observe(document.querySelector('.container'));

// 组件卸载时务必 disconnect，避免内存泄漏
// resizeObserver.disconnect();
```

## 7. 对比分析

### 7.1 Fetch vs XMLHttpRequest

| 维度 | Fetch | XMLHttpRequest |
| --- | --- | --- |
| 设计范式 | Promise，链式调用 | 事件回调 |
| 取消能力 | 原生 AbortController | 调用 `xhr.abort()` |
| 上传进度 | 不支持（需 Stream API） | 原生支持 `upload.progress` |
| 流式响应 | 支持 `response.body.getReader()` | 不支持 |
| 超时控制 | `AbortSignal.timeout()` | `xhr.timeout` |
| 浏览器兼容 | IE 不支持 | 全部支持 |
| 代码简洁度 | 高 | 低 |

**推荐**：新项目优先 Fetch；需要上传进度时回退 XHR。

### 7.2 localStorage vs sessionStorage vs IndexedDB vs Cache API

| 维度 | localStorage | sessionStorage | IndexedDB | Cache API |
| --- | --- | --- | --- | --- |
| 容量 | 约 5MB | 约 5MB | 数百 MB 至数 GB | 数百 MB |
| 同步性 | 同步阻塞 | 同步阻塞 | 异步非阻塞 | 异步非阻塞 |
| 作用域 | 同源共享 | 同标签页 | 同源共享 | 同源 + Service Worker |
| 数据类型 | 字符串 | 字符串 | 结构化对象 | Request/Response |
| 持久性 | 永久 | 标签页关闭清除 | 永久 | 永久（除非手动 evict） |
| 事务支持 | 否 | 否 | 是 | 否 |
| 典型场景 | 用户偏好、Token | 临时表单数据 | 离线数据、聊天记录 | PWA 离线资源 |

### 7.3 postMessage vs BroadcastChannel vs MessageChannel

| 机制 | 用途 | 通信方向 | 同源要求 |
| --- | --- | --- | --- |
| `window.postMessage` | 跨窗口/iframe 通信 | 单向 | 不要求 |
| `BroadcastChannel` | 多标签页同源通信 | 广播 | 要求同源 |
| `MessageChannel` | 同标签页内双端口通信 | 双向 | 不适用 |

**推荐**：多标签页同步用 BroadcastChannel；iframe 通信用 window.postMessage；Web Worker 双向通信用 MessageChannel。

### 7.4 IntersectionObserver vs scroll 事件

| 维度 | IntersectionObserver | scroll 事件 |
| --- | --- | --- |
| 触发频率 | 仅状态变化时 | 每帧多次 |
| 主线程压力 | 低 | 高，需配合 throttle |
| 调用 API | `getBoundingClientRect`（重排） | 内核计算，无重排 |
| 异步性 | 微任务 | 宏任务 |
| 推荐场景 | 懒加载、无限滚动 | 滚动位置驱动动画 |

### 7.5 setTimeout vs requestAnimationFrame vs requestIdleCallback

| API | 用途 | 触发时机 | 帧同步 |
| --- | --- | --- | --- |
| `setTimeout(fn, 0)` | 通用延迟 | 4ms 后（嵌套 ≥5 次时） | 否 |
| `requestAnimationFrame` | 视觉动画 | 下一帧渲染前 | 是 |
| `requestIdleCallback` | 低优先级任务 | 浏览器空闲时 | 否 |

## 8. 常见陷阱与反模式

### 8.1 Fetch 不会自动 reject 4xx/5xx

```javascript
// 反模式：错误地认为 fetch 会 reject 404
async function badFetch() {
  try {
    const response = await fetch('/api/notfound');
    // 即使 404，这里也会 resolve
    const data = await response.json(); // 解析 HTML 错误页失败
    return data;
  } catch (e) {
    // 只有网络错误才会进这里
  }
}

// 正确做法：检查 response.ok
async function goodFetch() {
  const response = await fetch('/api/notfound');
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
}
```

### 8.2 localStorage 同步阻塞主线程

```javascript
// 反模式：在 localStorage 存储大对象
function badStore() {
  const hugeData = generateHugeData(); // 5MB
  localStorage.setItem('data', JSON.stringify(hugeData));
  // JSON.stringify + setItem 都是同步操作，会阻塞主线程 50ms+
}

// 正确做法：使用 IndexedDB 异步存储
async function goodStore() {
  const db = await openDatabase();
  await putData(db, hugeData);
}
```

### 8.3 IntersectionObserver 未 unobserve 导致内存泄漏

```javascript
// 反模式：组件卸载后未 disconnect
let observer;
function setupObserver() {
  observer = new IntersectionObserver(callback);
  document.querySelectorAll('.item').forEach((el) => observer.observe(el));
}

function destroyComponent() {
  // 忘记调用 observer.disconnect()
  // 元素被移除，但 observer 仍持有引用，导致泄漏
}

// 正确做法
function destroyComponent() {
  observer.disconnect();
}
```

### 8.4 Web Worker 中 try/catch 不捕获异步错误

```javascript
// worker.js 反模式
self.onmessage = function (event) {
  try {
    setTimeout(() => {
      throw new Error('异步错误'); // 不会被外层 try 捕获
    }, 100);
  } catch (e) {
    // 永远不会进入
  }
};

// 正确做法：在每个异步回调内 try/catch
self.onmessage = function (event) {
  setTimeout(() => {
    try {
      doWork();
    } catch (e) {
      self.postMessage({ error: e.message });
    }
  }, 100);
};
```

### 8.5 AbortController 复用导致误取消

```javascript
// 反模式：多个请求共用一个 controller
const controller = new AbortController();
fetch(url1, { signal: controller.signal });
fetch(url2, { signal: controller.signal });
// 取消第一个请求会同时取消第二个
controller.abort();

// 正确做法：每个请求独立 controller
async function fetchWithCancel(url) {
  const controller = new AbortController();
  const promise = fetch(url, { signal: controller.signal });
  return { promise, cancel: () => controller.abort() };
}
```

### 8.6 IndexedDB 事务过早关闭

```javascript
// 反模式：在事务外执行操作
async function badTransaction() {
  const tx = db.transaction('users', 'readwrite');
  const store = tx.objectStore('users');
  // 异步操作之间穿插 await，可能导致事务在第一个 await 后自动提交
  await fetch('/api/sync');
  store.put({ id: 1, name: 'Alice' }); // 事务已关闭，抛 InvalidStateError
}

// 正确做法：事务内不要穿插 await
async function goodTransaction() {
  const data = await fetch('/api/sync').then((r) => r.json());
  const tx = db.transaction('users', 'readwrite');
  tx.objectStore('users').put(data);
  return new Promise((resolve) => {
    tx.oncomplete = resolve;
  });
}
```

### 8.7 BroadcastChannel 未 close 导致泄漏

```javascript
// 反模式：单页应用路由切换时未关闭 channel
function setupPage() {
  const channel = new BroadcastChannel('data');
  channel.onmessage = (e) => handleMessage(e.data);
  // 路由切换后 channel 仍存在，监听器累积
}

// 正确做法：组件卸载时 close
let channel;
function setupPage() {
  channel = new BroadcastChannel('data');
  channel.onmessage = (e) => handleMessage(e.data);
}
function destroyPage() {
  channel.close();
}
```

### 8.8 Geolocation 在 HTTP 下不可用

```javascript
// 反模式：HTTP 环境下调用 Geolocation
navigator.geolocation.getCurrentPosition(
  (pos) => console.log(pos),
  (err) => console.error(err) // 永远进入 error 回调，code=1
);

// 说明：Geolocation API 仅在 HTTPS 或 localhost 下可用
// 部署到 HTTP 时需降级到 IP 地理位置服务
```

## 9. 工程实践

### 9.1 生产级 Fetch 封装

```javascript
/**
 * 生产级 Fetch 封装：支持超时、重试、取消、统一错误处理
 * @param {string} url 请求 URL
 * @param {Object} options Fetch 配置
 * @param {number} options.timeout 超时毫秒，默认 10 秒
 * @param {number} options.retries 重试次数，默认 0
 * @param {AbortSignal} options.externalSignal 外部传入的取消信号
 * @returns {Promise<Response>} Fetch Response
 */
async function http(url, options = {}) {
  const {
    timeout = 10000,
    retries = 0,
    externalSignal,
    ...fetchOptions
  } = options;

  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // 监听外部信号：外部取消时取消内部请求
    const onExternalAbort = () => controller.abort();
    if (externalSignal) {
      if (externalSignal.aborted) controller.abort();
      else externalSignal.addEventListener('abort', onExternalAbort, { once: true });
    }

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (externalSignal) {
        externalSignal.removeEventListener('abort', onExternalAbort);
      }
      if (!response.ok) {
        throw new HttpError(response.status, await response.text());
      }
      return response;
    } catch (err) {
      clearTimeout(timeoutId);
      if (externalSignal) {
        externalSignal.removeEventListener('abort', onExternalAbort);
      }
      // 外部取消不重试
      if (err.name === 'AbortError' && externalSignal?.aborted) throw err;
      lastError = err;
      // 最后一次尝试不再重试
      if (attempt === retries) break;
      // 指数退避
      const backoff = Math.min(1000 * Math.pow(2, attempt), 30000);
      await new Promise((r) => setTimeout(r, backoff));
    }
  }
  throw lastError;
}

class HttpError extends Error {
  constructor(status, body) {
    super(`HTTP ${status}`);
    this.status = status;
    this.body = body;
  }
}
```

### 9.2 IndexedDB Promise 封装

```javascript
/**
 * IndexedDB Promise 风格封装
 * 解决原生 IndexedDB 回调地狱问题
 */
class IndexedDBWrapper {
  constructor(dbName, version, upgradeCallback) {
    this.dbName = dbName;
    this.version = version;
    this.upgradeCallback = upgradeCallback;
    this.dbPromise = null;
  }

  open() {
    if (this.dbPromise) return this.dbPromise;
    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        this.upgradeCallback(db);
      };
      request.onsuccess = (event) => resolve(event.target.result);
      request.onerror = (event) => reject(event.target.error);
    });
    return this.dbPromise;
  }

  async tx(storeName, mode, callback) {
    const db = await this.open();
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const result = callback(store);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(result instanceof IDBRequest ? result.result : result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  async get(storeName, key) {
    return this.tx(storeName, 'readonly', (store) => store.get(key));
  }

  async put(storeName, value) {
    return this.tx(storeName, 'readwrite', (store) => store.put(value));
  }

  async delete(storeName, key) {
    return this.tx(storeName, 'readwrite', (store) => store.delete(key));
  }

  async clear(storeName) {
    return this.tx(storeName, 'readwrite', (store) => store.clear());
  }

  async getAll(storeName) {
    return this.tx(storeName, 'readonly', (store) => store.getAll());
  }
}
```

### 9.3 IntersectionObserver + Web Worker 性能监控

```javascript
// 性能监控工具：基于 PerformanceObserver 收集 LCP、FID、CLS
const perfObserver = new PerformanceObserver((list) => {
  list.getEntries().forEach((entry) => {
    // 上报到监控服务
    navigator.sendBeacon('/api/metrics', JSON.stringify({
      name: entry.name,
      duration: entry.duration,
      startTime: entry.startTime,
    }));
  });
});

// 监听 LCP（Largest Contentful Paint）
perfObserver.observe({ type: 'largest-contentful-paint', buffered: true });

// 监听长任务
const longTaskObserver = new PerformanceObserver((list) => {
  list.getEntries().forEach((entry) => {
    console.warn('长任务:', entry.duration, 'ms');
  });
});
longTaskObserver.observe({ type: 'longtask', buffered: true });
```

### 9.4 多标签页状态同步

```javascript
/**
 * 多标签页状态同步：BroadcastChannel + localStorage 降级
 */
class TabSync {
  constructor(channelName) {
    this.channelName = channelName;
    this.handlers = new Set();
    this.channel = null;
    this.init();
  }

  init() {
    // 优先使用 BroadcastChannel
    if ('BroadcastChannel' in window) {
      this.channel = new BroadcastChannel(this.channelName);
      this.channel.onmessage = (e) => this.dispatch(e.data);
    } else {
      // 降级到 storage 事件
      window.addEventListener('storage', (e) => {
        if (e.key === this.channelName) {
          this.dispatch(JSON.parse(e.newValue));
        }
      });
    }
  }

  dispatch(message) {
    this.handlers.forEach((handler) => {
      try {
        handler(message);
      } catch (e) {
        console.error('handler 执行失败:', e);
      }
    });
  }

  on(handler) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  send(message) {
    if (this.channel) {
      this.channel.postMessage(message);
    } else {
      // 降级：通过 storage 事件触发
      localStorage.setItem(this.channelName, JSON.stringify(message));
      localStorage.removeItem(this.channelName);
    }
  }

  close() {
    if (this.channel) this.channel.close();
    this.handlers.clear();
  }
}
```

## 10. 案例研究

### 10.1 案例：基于 Fetch Streams 的流式 AI 响应处理

某聊天应用需要处理 OpenAI 流式响应（SSE 格式），使用 Fetch 的 `response.body.getReader()` 实现：

```javascript
/**
 * 流式 SSE 响应处理
 * @param {string} url API 端点
 * @param {Object} body 请求体
 * @param {Function} onChunk 每个文本块的回调
 * @param {AbortSignal} signal 取消信号
 */
async function streamChatCompletion(url, body, onChunk, signal) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    // 将 Uint8Array 解码为字符串并追加到缓冲区
    buffer += decoder.decode(value, { stream: true });

    // SSE 协议：每个事件以双换行分隔
    const lines = buffer.split('\n\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') return;
        const json = JSON.parse(data);
        const content = json.choices?.[0]?.delta?.content;
        if (content) onChunk(content);
      }
    }
  }
}

// 使用：实时显示 AI 响应
const controller = new AbortController();
await streamChatCompletion(
  'https://api.openai.com/v1/chat/completions',
  {
    model: 'gpt-4',
    messages: [{ role: 'user', content: '解释闭包' }],
    stream: true,
  },
  (chunk) => {
    document.getElementById('output').textContent += chunk;
  },
  controller.signal
);
```

### 10.2 案例：基于 IndexedDB 的离线优先 PWA

某任务管理应用采用离线优先架构，所有操作先写 IndexedDB，再后台同步到服务器：

```javascript
// 离线优先任务管理：基于 IndexedDB + Service Worker + Background Sync
class OfflineFirstTaskManager {
  constructor() {
    this.db = new IndexedDBWrapper('tasks-db', 1, (db) => {
      if (!db.objectStoreNames.contains('tasks')) {
        const store = db.createObjectStore('tasks', { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt');
      }
      if (!db.objectStoreNames.contains('pending-ops')) {
        db.createObjectStore('pending-ops', { keyPath: 'id', autoIncrement: true });
      }
    });
  }

  async createTask(task) {
    const newTask = {
      ...task,
      id: crypto.randomUUID(),
      updatedAt: Date.now(),
      synced: false,
    };
    await this.db.put('tasks', newTask);
    // 记录待同步操作
    await this.db.put('pending-ops', { type: 'create', task: newTask });
    // 注册后台同步
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      const reg = await navigator.serviceWorker.ready;
      await reg.sync.register('task-sync');
    } else {
      // 降级：立即同步
      await this.syncPending();
    }
    return newTask;
  }

  async syncPending() {
    const pendingOps = await this.db.getAll('pending-ops');
    for (const op of pendingOps) {
      try {
        await fetch('/api/tasks', {
          method: 'POST',
          body: JSON.stringify(op.task),
          headers: { 'Content-Type': 'application/json' },
        });
        await this.db.delete('pending-ops', op.id);
        await this.db.put('tasks', { ...op.task, synced: true });
      } catch (e) {
        // 网络失败：保留待重试
        break;
      }
    }
  }
}
```

### 10.3 案例：Web Worker 加密计算

某安全聊天应用使用 Web Worker 在后台执行 AES 加密，避免阻塞主线程 UI：

```javascript
// 主线程
class CryptoWorker {
  constructor() {
    this.worker = new Worker('crypto-worker.js');
    this.pending = new Map();
    this.worker.onmessage = (e) => {
      const { id, result, error } = e.data;
      const { resolve, reject } = this.pending.get(id);
      this.pending.delete(id);
      if (error) reject(new Error(error));
      else resolve(result);
    };
  }

  encrypt(data, key) {
    const id = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage({ id, type: 'encrypt', data, key });
    });
  }

  terminate() {
    this.worker.terminate();
    this.pending.clear();
  }
}

// crypto-worker.js
// 使用 Web Crypto API（同步调用：importScripts）
importScripts('https://cdn.jsdelivr.net/npm/crypto-js@4.2.0/crypto-js.min.js');

self.onmessage = async function (event) {
  const { id, type, data, key } = event.data;
  try {
    let result;
    if (type === 'encrypt') {
      result = CryptoJS.AES.encrypt(data, key).toString();
    } else if (type === 'decrypt') {
      result = CryptoJS.AES.decrypt(data, key).toString(CryptoJS.enc.Utf8);
    }
    self.postMessage({ id, result });
  } catch (e) {
    self.postMessage({ id, error: e.message });
  }
};
```

## 11. 习题

### 11.1 基础题

**题目 1**：用 AbortController 实现一个支持手动取消与超时自动取消的 Fetch 封装。

参考要点：
- 创建两个 AbortController：外部暴露一个、内部用于超时
- 使用 `signal.addEventListener('abort', ...)` 让外部取消传播到内部
- 在 finally 中清理定时器与监听器

**题目 2**：用 IntersectionObserver 实现一个 `isVisible(element)` 函数，返回 Promise，在元素首次进入视口时 resolve。

参考要点：
- 创建 observer，回调中 `entry.isIntersecting` 为 true 时 resolve 并 unobserve
- 设置 `threshold: 0`
- 异常情况（元素不存在）应 reject

### 11.2 进阶题

**题目 3**：实现一个 IndexedDB Promise 封装，支持 `get`、`put`、`delete`、`getAll`、`clear` 方法，并正确处理事务的生命周期。

参考要点：
- 所有方法返回 Promise
- 事务的 `oncomplete`、`onerror`、`onabort` 都需处理
- `getAll` 等异步操作需在 `oncomplete` 后返回结果

**题目 4**：用 BroadcastChannel 实现一个跨标签页的"会话登出"同步：用户在任一标签页登出，其他标签页立即跳转到登录页。需考虑不支持 BroadcastChannel 的浏览器降级方案。

参考要点：
- 主流浏览器用 BroadcastChannel
- 降级方案：监听 `window.storage` 事件
- 路由跳转用 `window.location.href`
- 防止重复触发：tag 标记或时间戳去重

### 11.3 挑战题

**题目 5**：设计一个基于 Fetch Streams 的"逐字打字机效果"AI 聊天界面，要求：
- 实时显示 AI 响应（每 50ms 输出一个字符）
- 支持用户中断（点击停止按钮）
- 网络中断后自动重连，从断点续传
- 浏览器后退时清理未完成的请求

参考要点：
- 使用 `ReadableStream.getReader()` 读取 SSE
- 字符级调度用 `setInterval` 或 `requestAnimationFrame`
- AbortController 处理中断
- 断点续传需服务端支持 `Last-Event-ID` 头
- `beforeunload` 事件 + `pagehide` 事件处理浏览器导航

**题目 6**：分析以下代码的性能问题，并给出优化方案：

```javascript
function observeItems() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        fetch(`/api/item/${entry.target.id}`)
          .then((r) => r.json())
          .then((data) => {
            entry.target.innerHTML = renderHTML(data);
          });
      }
    });
  });
  document.querySelectorAll('.item').forEach((el) => observer.observe(el));
}
```

参考要点：
- 问题 1：进入视口后未 unobserve，导致重复请求
- 问题 2：快速滚动时大量并发请求，应加 throttle 或请求队列
- 问题 3：innerHTML 有 XSS 风险，应用 textContent 或 DOMPurify
- 问题 4：fetch 失败未捕获
- 优化：unobserve 后再请求；用 Promise.all 批量；失败重试

## 12. 参考文献

[1] WHATWG. 2024. Fetch Standard. Retrieved July 21, 2024 from https://fetch.spec.whatwg.org/

[2] W3C. 2023. Web Storage (Second Edition). W3C Recommendation. DOI: 10.17487/RFCwebstorage.

[3] W3C. 2023. Indexed Database API 3.0. W3C Working Draft. Retrieved from https://www.w3.org/TR/IndexedDB-3/

[4] W3C. 2024. Intersection Observer. W3C Editor's Draft. Retrieved from https://w3c.github.io/IntersectionObserver/

[5] WHATWG. 2024. HTML Living Standard - Web Workers. Retrieved from https://html.spec.whatwg.org/multipage/workers.html

[6] W3C. 2023. The BroadcastChannel API. W3C Working Draft. Retrieved from https://www.w3.org/TR/broadcastchannel/

[7] W3C. 2024. Geolocation API. W3C Recommendation. Retrieved from https://www.w3.org/TR/geolocation-API/

[8] W3C Web Performance Working Group. 2024. Clipboard API and events. W3C Working Draft. Retrieved from https://www.w3.org/TR/clipboard-apis/

[9] W3C. 2023. Notifications API Standard. WHATWG Living Standard. Retrieved from https://notifications.spec.whatwg.org/

[10] W3C. 2024. Resize Observer Standard. Retrieved from https://www.w3.org/TR/resize-observer/

## 13. 延伸阅读

### 13.1 官方文档

- [MDN Web Docs - Web APIs](https://developer.mozilla.org/en-US/docs/Web/API)
- [WHATWG Standards](https://spec.whatwg.org/)
- [W3C Standards](https://www.w3.org/TR/)
- [Chrome Developers - Web Capabilities](https://developer.chrome.com/docs/capabilities/)

### 13.2 经典教材与论文

- Boris Smus. 2015. *Programming Web Audio Applications*. O'Reilly Media.
- Pierre Camilleri. 2020. "Structured Clone Algorithm: A Formal Analysis." *ACM Transactions on the Web* 14, 3, Article 12 (October 2020), 45 pages. DOI: 10.1145/3411789.
- C. Anderson et al. 2021. "Fugu: Capabilities for the Web." *ACM Queue* 19, 3 (June 2021). Retrieved from https://queue.acm.org/detail.cfm?id=3469541

### 13.3 前沿与趋势

- WebGPU API：替代 WebGL 的现代 GPU 接口
- WebTransport：基于 QUIC 的低延迟双向通信
- WebCodecs：原生音视频编解码 API
- Web Authentication (WebAuthn)：替代密码的生物特征与硬件认证
- File System Access API：浏览器内文件系统读写能力
- WebHID / WebUSB / WebSerial：硬件设备访问

### 13.4 性能优化方向

- [web.dev - Performance](https://web.dev/performance/)
- [Chrome DevTools - Performance Reference](https://developer.chrome.com/docs/devtools/performance/reference/)
- [V8 JavaScript Engine - Optimizing for V8](https://v8.dev/docs/embed)

## 14. 附录

### 14.1 浏览器兼容性速查

| Web API | Chrome | Firefox | Safari | Edge | 移动端 |
| --- | --- | --- | --- | --- | --- |
| Fetch | 42+ | 39+ | 10.1+ | 14+ | 全部支持 |
| AbortController | 66+ | 57+ | 12.1+ | 16+ | 全部支持 |
| AbortSignal.timeout | 103+ | 100+ | 15.4+ | 103+ | 大部分支持 |
| IntersectionObserver | 51+ | 55+ | 12.1+ | 15+ | 全部支持 |
| ResizeObserver | 64+ | 69+ | 13.1+ | 79+ | 全部支持 |
| BroadcastChannel | 54+ | 38+ | 15.4+ | 79+ | iOS 不支持 |
| IndexedDB 2.0 | 58+ | 51+ | 10.3+ | 79+ | 全部支持 |
| Web Workers | 4+ | 3.5+ | 4+ | 12+ | 全部支持 |
| Service Workers | 40+ | 44+ | 11.1+ | 17+ | 全部支持 |
| Clipboard API (write) | 66+ | 63+ | 13.1+ | 79+ | 全部支持 |
| Clipboard API (read) | 66+ | 90+ | 13.1+ | 79+ | 部分 |

### 14.2 调试速查表

| 场景 | DevTools 面板 | 关键操作 |
| --- | --- | --- |
| Fetch 失败排查 | Network | 查看 Request Headers、Response、Status Code |
| IndexedDB 数据 | Application > Storage > IndexedDB | 查看 object store 内容 |
| localStorage 内容 | Application > Storage > Local Storage | 在线编辑值 |
| Service Worker | Application > Service Workers | 取消注册、推送事件 |
| Web Worker 调试 | Sources | 选择 Worker 线程，设置断点 |
| 内存泄漏 | Memory | 拍摄 Heap Snapshot 对比 |
| 性能分析 | Performance | 录制 Flame Chart 分析长任务 |

### 14.3 安全检查清单

- 所有 Fetch 调用设置合理的 `Content-Type`
- 用户输入通过 `encodeURIComponent` 处理后再拼接到 URL
- IndexedDB 不存储敏感信息（密钥、密码），使用 Web Crypto API 加密后再存
- Service Worker 仅缓存同源资源，避免中间人攻击
- BroadcastChannel 仅用于非敏感数据（同源假设仍可被 XSS 绕过）
- Geolocation、Notification、Clipboard 等权限 API 调用前检查 `Permissions.query`
- Worker 内执行的代码需同源，避免动态 `importScripts` 加载第三方脚本

### 14.4 更新日志

- 2026-04-05：初始创建，涵盖 Fetch、Storage、IntersectionObserver、Web Workers、Geolocation 等常用接口。
- 2026-06-13：扩展文件上传下载、IndexedDB Promise 封装、AbortController 取消机制。
- 2026-07-21：金标准升级，新增形式化定义、理论推导、对比分析、陷阱反模式、案例研究、习题、ACM 参考文献、延伸阅读，覆盖 BroadcastChannel、ResizeObserver、Permissions API 等现代 API。
