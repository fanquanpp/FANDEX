---
order: 280
title: Web Workers
module: 'html5'
category: 前端技术
difficulty: advanced
description: Web Workers
author: fanquanpp
updated: '2026-08-30'
related:
  - 'html5/026-DragAPI'
  - 'html5/027-Geolocation'
  - 'html5/029-ServiceWorkerPWA'
prerequisites:
  - 'html5/007-HTML5OverviewCoreFeature'
---

> 前置要求（中级）：本节需要 JavaScript 中级基础——Promise、async/await、事件监听、class（`javascript/001`-`005`、`039`、`023`、`017`），以及事件循环概念（`javascript/027`）。Worker 内没有 DOM/window，所有通信都走 postMessage 消息，先理解"消息传递"再写代码。
>
> 进阶方向：Worker 中绘图可使用 OffscreenCanvas（速查区有完整示例），适合图像处理、游戏渲染场景；第一遍可跳过。

> **警告：未学完 JavaScript 基础（`javascript/001`-`005`、`039`、`023`）之前，第一遍请直接跳过本篇**，先按 005 的路线图走完主线；Worker 没有 DOM，直接上手会连"为什么 console 都在别处"都想不通。

## 内联 Worker

**通过 Blob 创建内联 Worker**
```javascript
const code = `
  self.onmessage = (e) => {
    const result = e.data.reduce((s, n) => s + n * n, 0);
    self.postMessage(result);
  };
`;
const blob = new Blob([code], { type: 'application/javascript' });
const worker = new Worker(URL.createObjectURL(blob));

worker.postMessage([1, 2, 3, 4, 5]);
worker.onmessage = (e) => console.log('结果:', e.data);
```

---

## 1. Web Workers 概述

Web Workers 允许在后台线程中运行 JavaScript，避免 CPU 密集型任务阻塞主线程。

| 特性         | 主线程 | Worker 线程 |
| ------------ | ------ | ----------- |
| DOM 访问     |        |             |
| 网络请求     |        |             |
| IndexedDB    |        |             |
| localStorage |        |             |

## 2. Dedicated Worker

**主线程**：

```javascript
const worker = new Worker('worker.js');
worker.postMessage({ type: 'CALCULATE', data: [1, 2, 3, 4, 5] });
worker.onmessage = (e) => console.log('Worker 返回:', e.data);
worker.onerror = (e) => console.error('Worker 错误:', e.message);
worker.terminate();
```

**Worker 线程（worker.js）**：

```javascript
self.onmessage = (e) => {
  const { type, data } = e.data;
  if (type === 'CALCULATE') {
    const result = data.reduce((sum, n) => sum + n * n, 0);
    self.postMessage({ type: 'RESULT', data: result });
  }
};
```

### Transferable Objects

```javascript
const buffer = new ArrayBuffer(1024 * 1024);
worker.postMessage({ buffer }, [buffer]); // 零拷贝传输
```

## 3. Shared Worker

```javascript
const worker = new SharedWorker('shared-worker.js');
worker.port.start();
worker.port.postMessage('Hello');
worker.port.onmessage = (e) => console.log('收到:', e.data);
```

## 4. Worker 池

```javascript
class WorkerPool {
  constructor(workerScript, poolSize = navigator.hardwareConcurrency) {
    this.workers = Array.from({ length: poolSize }, () => new Worker(workerScript));
  }
  execute(data) {
    return new Promise((resolve) => {
      const worker = this.workers.pop();
      worker.onmessage = (e) => {
        resolve(e.data);
        this.workers.push(worker);
      };
      worker.postMessage(data);
    });
  }
  terminate() {
    this.workers.forEach((w) => w.terminate());
  }
}
```
## Dedicated Worker 专用 Worker

**创建 Worker**
`const worker = new Worker(<scriptURL>, [options])`
```javascript
// 主线程
const worker = new Worker('worker.js');

// 发送消息给 Worker
worker.postMessage({ type: 'CALCULATE', data: [1, 2, 3, 4, 5] });

// 接收 Worker 消息
worker.onmessage = (e) => console.log('Worker 返回:', e.data);

// 错误处理
worker.onerror = (e) => console.error('Worker 错误:', e.message);

// 终止 Worker
worker.terminate();
```

**Worker 线程脚本**
```javascript
// worker.js
self.onmessage = (e) => {
  const { type, data } = e.data;
  if (type === 'CALCULATE') {
    const result = data.reduce((sum, n) => sum + n * n, 0);
    self.postMessage({ type: 'RESULT', data: result });
  }
};
```

**Worker options 选项**

| 字段          | 说明                                | 示例                 |
| ------------- | ----------------------------------- | -------------------- |
| `type`        | 模块类型 classic/module              | `{ type: 'module' }` |
| `name`        | Worker 名称(用于调试)              | `{ name: 'calc' }`   |
| `credentials` | 凭证 include/same-origin/omit       | `{ credentials: 'same-origin' }` |

**Worker 全局上下文**
```javascript
// worker.js 中
self.name;            // Worker 名称
self.location;        // Worker 脚本 URL
self.navigator;       // navigator 对象
self.importScripts(); // 同步引入脚本(仅 classic 模式)

// 关闭 Worker
self.close();
```

**importScripts 引入脚本**
```javascript
// worker.js
importScripts('lib.js', 'helper.js');

// module 模式使用 import
import { helper } from './helper.js';
```

---

## Worker 通信

**postMessage 基础通信**
```javascript
// 主线程
worker.postMessage('文本消息');
worker.postMessage({ type: 'task', payload: data });
worker.postMessage({ buffer }, [buffer]); // 转移所有权

// Worker
self.postMessage({ result: '完成' });
```

**结构化克隆与可转移对象**
```javascript
// 主线程:转移 ArrayBuffer 所有权(零拷贝)
const buffer = new ArrayBuffer(1024 * 1024);
worker.postMessage({ buffer }, [buffer]);
// 主线程的 buffer 此后不可用

// Worker 端接收
self.onmessage = (e) => {
  const { buffer } = e.data;
  const view = new Uint8Array(buffer);
  view[0] = 255;
  self.postMessage({ buffer }, [buffer]); // 再传回
};
```

**Transferable Objects 类型**

| 类型                | 说明                  |
| ------------------- | --------------------- |
| `ArrayBuffer`       | 二进制数据缓冲区      |
| `MessagePort`       | 消息端口              |
| `ImageBitmap`       | 图像位图              |
| `OffscreenCanvas`   | 离屏 Canvas           |
| `ReadableStream`    | 可读流                |
| `WritableStream`    | 可写流                |
| `TransformStream`   | 转换流                |
| `AudioData`         | 音频数据              |

---

## Shared Worker 共享 Worker

**创建 SharedWorker**
`const worker = new SharedWorker(<scriptURL>, [name])`
```javascript
// 主线程(可被多个标签页共享)
const worker = new SharedWorker('shared-worker.js');

// 启动端口
worker.port.start();

// 通过 port 通信
worker.port.postMessage('Hello');
worker.port.onmessage = (e) => console.log('收到:', e.data);

// 关闭端口
worker.port.close();
```

**SharedWorker 脚本**
```javascript
// shared-worker.js
const connections = [];

self.onconnect = (e) => {
  const port = e.ports[0];
  connections.push(port);

  port.onmessage = (e) => {
    // 广播给所有连接
    connections.forEach((p) => p.postMessage(e.data));
  };

  port.start();
};
```

---

## Worker 池

**Worker 池实现**
```javascript
class WorkerPool {
  constructor(workerScript, poolSize = navigator.hardwareConcurrency) {
    this.workers = Array.from({ length: poolSize }, () => new Worker(workerScript));
  }

  execute(data) {
    return new Promise((resolve) => {
      const worker = this.workers.pop();
      worker.onmessage = (e) => {
        resolve(e.data);
        this.workers.push(worker);
      };
      worker.postMessage(data);
    });
  }

  terminate() {
    this.workers.forEach((w) => w.terminate());
  }
}

// 使用
const pool = new WorkerPool('worker.js', 4);
const results = await Promise.all([
  pool.execute([1, 2, 3]),
  pool.execute([4, 5, 6]),
  pool.execute([7, 8, 9]),
]);
```

---

## Worker 中可用 API

**可在 Worker 中使用的 API**
```javascript
// worker.js
// 网络
fetch('https://api.example.com/data');
const ws = new WebSocket('wss://example.com');

// IndexedDB
const db = indexedDB.open('mydb');

// Cache Storage
const cache = await caches.open('my-cache');

// setTimeout / setInterval
setTimeout(() => self.postMessage('done'), 1000);

// FileReader / Blob / URL
const reader = new FileReader();

// OffscreenCanvas(主线程 transferControlToOffscreen)
const ctx = offscreenCanvas.getContext('2d');
```

**不可在 Worker 中使用的 API**
- DOM 操作(document, window, parent)
- localStorage / sessionStorage
- XMLHttpRequest(部分旧版不支持)
- 某些 UI 相关 API

---

## OffscreenCanvas

**主线程转移控制权**
```javascript
const canvas = document.getElementById('canvas');
const offscreen = canvas.transferControlToOffscreen();

const worker = new Worker('canvas-worker.js');
worker.postMessage({ canvas: offscreen }, [offscreen]);
```

**Worker 中绘制**
```javascript
// canvas-worker.js
self.onmessage = (e) => {
  const canvas = e.data.canvas;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = 'red';
  ctx.fillRect(10, 10, 100, 50);

  // 动画循环
  let x = 0;
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'blue';
    ctx.fillRect(x, 10, 50, 50);
    x = (x + 2) % canvas.width;
    requestAnimationFrame(animate);
  }
  animate();
};
```

---

## Worker 类型与场景

| Worker 类型       | 创建方式                        | 共享范围         | 适用场景               |
| ----------------- | ------------------------------- | ---------------- | ---------------------- |
| Dedicated Worker  | `new Worker()`                  | 单个页面         | 密集计算、数据处理     |
| Shared Worker     | `new SharedWorker()`            | 多个同源页面     | 共享状态、广播         |
| Service Worker    | `navigator.serviceWorker.register()` | 全域名(网络代理) | 离线缓存、推送通知     |
| Audio Worklet     | `audioContext.audioWorklet.addModule()` | 音频线程     | 音频处理               |

---

## MessageChannel 双向通信

**主线程创建通道**
```javascript
const channel = new MessageChannel();

const worker1 = new Worker('worker1.js');
const worker2 = new Worker('worker2.js');

// 将 port1 给 worker1,port2 给 worker2
worker1.postMessage({ port: channel.port1 }, [channel.port1]);
worker2.postMessage({ port: channel.port2 }, [channel.port2]);
```

**Worker 间通过端口通信**
```javascript
// worker1.js
self.onmessage = (e) => {
  const port = e.data.port;
  port.postMessage('来自 worker1');
  port.onmessage = (e) => console.log('收到:', e.data);
};

// worker2.js
self.onmessage = (e) => {
  const port = e.data.port;
  port.onmessage = (e) => {
    console.log('收到:', e.data);
    port.postMessage('来自 worker2');
  };
};
```

---

## BroadcastChannel 广播

**跨上下文广播**
```javascript
// 主线程或 Worker 中
const channel = new BroadcastChannel('app-events');

// 监听消息
channel.onmessage = (e) => {
  console.log('收到广播:', e.data);
};

// 发送广播(所有同源页面和 Worker 都能收到)
channel.postMessage({ type: 'UPDATE', data: '新数据' });

// 关闭
channel.close();
```

---

## 错误处理

**Worker 错误事件**
```javascript
worker.onerror = (e) => {
  console.error('错误信息:', e.message);
  console.error('文件:', e.filename);
  console.error('行号:', e.lineno);
  console.error('列号:', e.colno);
};
```

**Worker 内部错误捕获**
```javascript
// worker.js
self.onerror = (message, filename, lineno, colno, error) => {
  console.error('Worker 错误:', message);
  return true; // 阻止默认行为
};

try {
  // 可能出错的代码
} catch (e) {
  self.postMessage({ type: 'ERROR', error: e.message });
}
```

## 动手试试

### 入门版（必做）

1. 写一个页面：点击按钮后执行 1 亿次循环求和，先在主线程跑一次（观察卡顿），再用 Worker 跑一次（观察流畅）；
2. 在 Worker 中计算一组数字的平方和，把结果发回主线程显示；
3. 在主线程用 `postMessage` 传递对象，Worker 处理后回传。

### 进阶版（选做）

1. 用 Transferable 把大 `ArrayBuffer` 转移给 Worker 处理，对比普通拷贝的耗时；
2. 实现一个 Worker 池，并行计算 100 个任务；
3. 用 `BroadcastChannel` 让两个标签页同步“计数”状态。

## 核心知识点

> 一句话记住 Worker：主线程管界面，Worker 管计算；`postMessage` 通信，`terminate` 善后；DOM 不能碰，Transferable 可提速。

- `new Worker(url)` 创建后台线程，`postMessage`/`onmessage` 收发消息；
- Worker 无 DOM 权限，适合计算、图像处理、数据解析等重活；
- `SharedWorker` 多页面共享，需通过 `port` 通信；
- Worker 池复用线程，避免频繁创建销毁的开销；
- `MessageChannel` 让 Worker 之间直接通信，`BroadcastChannel` 做页面广播；
- 不再使用时 `terminate()` 释放资源。

## 注意事项与改进建议

| 问题点 | 说明 | 改进方案 |
| --- | --- | --- |
| Worker 里操作 DOM | 直接报错 | 计算完 `postMessage` 回主线程渲染 |
| 频繁创建/销毁 Worker | 启动开销大 | 使用 Worker 池复用 |
| 忘记 `terminate` | 线程与内存泄漏 | 任务完成或页面卸载时终止 |
| 大对象普通传递 | 序列化复制耗时 | 用 Transferable 转移所有权 |
| SharedWorker 忘记 `start()` | 消息收不到 | 创建后调用 `port.start()` |
| Worker 报错无监听 | 静默失败难排查 | 注册 `onerror` 统一处理 |

## 扩展学习

- 离线场景：`html5/028-ServiceWorkerPWA` 中 Service Worker（Worker 家族的一员）；
- 数据缓存：`html5/014-HTML5OfflineStorageWebAPI` 中 Worker 与 IndexedDB 的配合；
- 性能：`javascript/049-DebugPerformanceOptimization` 用性能面板分析主线程任务；
- 并发模式：`javascript/027-AsyncConcurrencyControl` 对比异步任务与 Worker 的取舍。
