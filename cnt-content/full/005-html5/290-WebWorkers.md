---
order: 290
title: Web Workers
module: 'html5'
category: 前端技术
difficulty: advanced
description: 用 Web Worker 把卡死页面的重活搬进后台线程：最小可用示例、结构化克隆与 Transferable、Worker 能用与不能用什么，以及 Comlink 等现代封装。
author: fanquanpp
updated: '2026-09-13'
related:
  - 'html5/250-DragAPI'
  - 'html5/300-ServiceWorkerPWA'
  - 'html5/320-WebSocket'
prerequisites:
  - 'html5/020-HTML5OverviewCoreFeature'
---

## 前置要求

- JavaScript 中级基础：Promise、事件监听（`javascript/001`-`005`、`javascript/039`、`javascript/023`），以及事件循环概念（`javascript/027`）；
- 先建立"消息传递"心智：Worker 里没有 DOM、没有 `window`，主线程和它之间**只能靠 postMessage 说话**。

> **警告：未学完 JavaScript 基础之前，第一遍请直接跳过本篇**，先按 005 的路线图走完主线；Worker 没有 DOM，直接上手会连"为什么 console 输出在别处"都想不通。

## 1. 场景切入：一次让页面卡死的解析

想象你在给 FANDEX 网页端加一个"导入作品数据包"功能：用户丢进来一个 8 MB 的 JSON 文件，需要遍历每个作品、算色彩统计。你在主线程写下处理循环，点下按钮的瞬间——页面冻住了：按钮按不动、滚动失灵、正在播放的律动背景动画也停了。

原因在事件循环：JavaScript 主线程只有一条，渲染、事件响应、你的计算排同一条队。计算超过约 50 毫秒，用户就能感觉到卡顿（性能指标里的 INP 变差）；超过 1 秒，页面就像死机。

Web Worker 的答案是：**再开一条线程专门干重活**。主线程只负责收发消息和渲染，Worker 算完把结果寄回来。它是浏览器里少数能碰"真并发"的手段之一。

## 2. 动手：卡顿对比实验

这个实验分两步：先亲手制造卡顿，再用 Worker 治好它。

**第一步：主线程版。** 新建 `worker-demo.html`：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <title>主线程 vs Worker</title>
  <style>
    button { padding: 8px 16px; margin-right: 8px; }
    #fps { font-variant-numeric: tabular-nums; color: #39C5BB; }
    p { line-height: 1.8; }
  </style>
</head>
<body>
  <p>实时帧率：<span id="fps">--</span> fps（正常应接近 60）</p>
  <button id="btn-main">主线程算 1 亿次求和</button>
  <button id="btn-worker">Worker 算 1 亿次求和</button>
  <p id="result"></p>

  <script>
    // 帧率表：每秒统计渲染了多少帧
    let frames = 0;
    function tick() {
      frames++;
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    setInterval(() => {
      document.getElementById('fps').textContent = frames;
      frames = 0;
    }, 1000);

    function heavySum() {
      let sum = 0;
      for (let i = 0; i < 1e8; i++) sum += i;
      return sum;
    }

    document.getElementById('btn-main').addEventListener('click', () => {
      const sum = heavySum();           // 页面在这里冻住约 1 秒
      document.getElementById('result').textContent = '主线程：' + sum;
    });

    // 第二步再加这段
  </script>
</body>
</html>
```

先点第一个按钮，盯着帧率表：数字会从 60 掉到 0，约一秒后才恢复。

**第二步：Worker 版。** 同目录新建 `sum-worker.js`：

```javascript
// Worker 世界里没有 window，全局对象是 self（DedicatedWorkerGlobalScope）
self.onmessage = () => {
  let sum = 0;
  for (let i = 0; i < 1e8; i++) sum += i;
  self.postMessage(sum);            // 把结果寄回主线程
};
```

回到 `worker-demo.html`，在注释处补上：

```javascript
const worker = new Worker('sum-worker.js');

worker.onmessage = (e) => {
  document.getElementById('result').textContent = 'Worker：' + e.data;
};
worker.onerror = (e) => console.error('Worker 出错：', e.message);

document.getElementById('btn-worker').addEventListener('click', () => {
  worker.postMessage('start');
});
```

再点第二个按钮：帧率稳在 60，结果算完后出现。同一个 1 亿次循环，差别只在于它跑在哪条线程。

> 注意：Worker 必须通过 http(s) 加载，`file://` 双击打开会因同源限制失败。用 Live Server 或 `npx serve` 起本地服务测试。

## 3. 讲为什么：一座只通邮车的桥

Worker 与主线程之间唯一的通道是 `postMessage`，理解它的两条规则，就理解了 Worker 编程的全部难点。

**规则一：消息是复制过去（结构化克隆），不是共享。** 传一个 100 MB 的对象，主线程要先完整拷贝一份。所以大数据要改走 **Transferable（可转移）**通道——把所有权整个过户，零拷贝：

```javascript
const buffer = new ArrayBuffer(1024 * 1024);       // 1 MB 二进制数据
worker.postMessage({ buffer }, [buffer]);           // 第二个参数：转移清单
// 此刻主线程的 buffer.byteLength 变为 0，数据已"搬家"到 Worker
```

可转移的类型主要是 `ArrayBuffer`、`MessagePort`、`ImageBitmap`、`OffscreenCanvas` 和各种流。图像处理、音视频场景基本必用。

**规则二：消息是异步事件。** `postMessage` 发出后代码继续往下走，回复在将来的某个 `message` 事件里到达。实际项目里建议立刻包一层 Promise，调用方就好写多了：

```javascript
function callWorker(worker, message) {
  return new Promise((resolve) => {
    worker.addEventListener('message', function onMsg(e) {
      worker.removeEventListener('message', onMsg);
      resolve(e.data);
    });
    worker.postMessage(message);
  });
}
```

嫌样板代码多？社区的标准答案是 **Comlink**（GoogleChromeLabs 出品）：用 ES Proxy 把 Worker 包装成"看起来直接调用的异步对象"，`await proxy.heavySum()` 一行搞定通信。生产项目强烈建议用它，本篇教的是它底下的原理。

## 4. Worker 里能用什么、不能用什么

Worker 是个"残缺的浏览器环境"，边界必须背下来：

| 能用 | 不能用 |
| --- | --- |
| `fetch` / `WebSocket` | DOM（`document`、元素操作） |
| `indexedDB` / Cache Storage | `localStorage` / `sessionStorage` |
| `setTimeout` / `setInterval` | `window`、`alert` 等浏览器 UI |
| `FileReader` / `Blob` / `URL` | 大部分依赖 DOM 的 API |
| `OffscreenCanvas` 绘图 | `requestAnimationFrame`（没画面可刷） |

第一性的判断法：**Worker 里没有"屏幕"和"窗口"**，凡是和显示、输入相关的都没有；凡是和网络、存储、计算相关的都有。

三个常用补充点：

- **ES Module Worker**：`new Worker('w.js', { type: 'module' })` 后，Worker 里可以直接 `import`，还能复用主项目的模块——三浏览器均已支持，新项目默认用它，`importScripts()` 留给老代码；
- **错误监控**：主线程的 `worker.onerror` 能拿到 `e.message/filename/lineno`；Worker 内部用 `try/catch` 包住业务代码，把错误 `postMessage` 回来是更可控的做法；
- **善后**：Worker 常驻会占内存，不再用时在主线程调 `worker.terminate()`（或 Worker 内 `self.close()` 自尽）。

## 5. 进阶速览：Worker 家族与并发模式

**SharedWorker**：多个同源标签页共享一个 Worker 实例，靠 `port` 通信，常用于跨标签页共享状态。注意 Safari 与 Chrome 私有模式支持历来不稳，生产慎选，多数跨标签需求用下面这个更简单：

```javascript
// BroadcastChannel：同源广播，两个标签页同步状态只要三行
const bc = new BroadcastChannel('fandex-theme');
bc.onmessage = (e) => applyTheme(e.data);   // 对方标签页发来
bc.postMessage('dark');                      // 我方广播出去
```

**Worker 池**：批量任务时按 CPU 核数建几个 Worker 轮流用，避免频繁创建销毁。骨架版：

```javascript
class WorkerPool {
  constructor(script, size = navigator.hardwareConcurrency - 1) {
    this.idle = Array.from({ length: size }, () => new Worker(script));
  }
  run(data) {
    const worker = this.idle.pop();
    return new Promise((resolve) => {
      worker.onmessage = (e) => {
        resolve(e.data);
        this.idle.push(worker);
      };
      worker.postMessage(data);
    });
  }
  dispose() { this.idle.forEach((w) => w.terminate()); }
}
```

**OffscreenCanvas**：把画布本体转移进 Worker，动画循环也能搬到后台——适合像素画生成器、粒子背景这类持续重绘场景（FANDEX 的律动背景若计算量大就是典型候选）：

```javascript
// 主线程：画布控制权转移
const offscreen = document.querySelector('canvas').transferControlToOffscreen();
worker.postMessage({ canvas: offscreen }, [offscreen]);

// Worker 里：正常 getContext('2d') 绘制，循环用 setTimeout/自调度即可
```

**Service Worker**：Worker 家族里最出名的成员，但它不是为计算而生，而是充当页面的"网络代理"实现离线缓存，见 `html5/300-ServiceWorkerPWA`。

## 6. 坑点自检

| 现象 | 原因 | 修法 |
| --- | --- | --- |
| `new Worker` 报安全错误 | `file://` 打开，Worker 被同源策略拦下 | 本地起 http 服务 |
| Worker 里 `document` 报错 | 没有 DOM | 算完 `postMessage` 回主线程改 UI |
| Worker 里 `localStorage` 报错 | 存储类 API 不进 Worker | 用 `indexedDB` 或让主线程代劳 |
| 传大对象明显变慢 | 结构化克隆在深拷贝 | 大二进制走 Transferable |
| 转移后主线程读 `buffer` 是空的 | 所有权已过户，正常现象 | 需要双方都用就复制而不是转移 |
| 页面内存持续上涨 | Worker 没终止 | 任务结束 `terminate()`；页面卸载兜底 |
| Worker 报错但控制台没信息 | 没监听 `onerror` | 主线程统一注册错误处理 |
| `import` 语法报错 | classic 模式默认 | `new Worker(url, { type: 'module' })` |

## 7. 练习

1. （必做）完成第 2 节对比实验，并用 DevTools 的 Performance 面板录制两种点击：主线程版能看到一个约 1 秒的长任务，Worker 版长任务出现在独立线程轨道上——截图留档；
2. （必做）把第 2 节的"导入 JSON"需求做成 Worker 版：主线程读文件为文本，交给 Worker 解析并统计（条数、某字段总和），结果回显；
3. （选做）用 `Promise.all` + 两个 Worker 并行算两个 1 亿次求和，对比串行总耗时，验证真并行的收益；
4. （选做）用 `BroadcastChannel` 实现"多标签页主题同步"：一个标签页切暗色，其他标签页立即跟随；
5. （选做）读一遍 Comlink 的 README，把第 2 节示例改写成 Comlink 版本，体会通信被隐藏后的代码形态。

## 8. 下一步

- Worker 家族最重要的成员 Service Worker 与离线应用：`html5/300-ServiceWorkerPWA`；
- 后台线程与网络的组合拳（Worker 内 `fetch` + WebSocket 推送）：`html5/320-WebSocket`；
- 想量化"卡顿"与优化效果，系统学 DevTools Performance 面板与 INP 指标，见 `javascript/500-DebugPerformanceOptimization`。
