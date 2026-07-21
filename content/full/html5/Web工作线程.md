---
order: 62
title: 'Web-Workers'
module: html5
category: HTML5
difficulty: advanced
description: 'Web Workers'
author: fanquanpp
updated: '2026-06-14'
related:
  - html5/拖拽API
  - html5/地理位置定位
  - 'html5/Service-Worker与PWA'
  - html5/历史记录API
prerequisites:
  - html5/概述与核心特性
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

### 内联 Worker

```javascript
const code = `self.onmessage = (e) => { self.postMessage(e.data.reduce((s, n) => s + n * n, 0)); };`;
const blob = new Blob([code], { type: 'application/javascript' });
const worker = new Worker(URL.createObjectURL(blob));
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
