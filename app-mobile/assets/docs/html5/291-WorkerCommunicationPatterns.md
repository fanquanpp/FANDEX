---
order: 360
title: 专项：Worker 通信与家族全景
module: 'html5'
category: 前端技术
difficulty: advanced
description: Web Worker 的进阶通信模式与家族全景：SharedWorker 跨标签页共享、MessageChannel 让两个 Worker 直连、classic 与 module 两种模式、可转移对象全表，以及 Service Worker / Audio Worklet / OffscreenCanvas 的选型对照。
author: fanquanpp
updated: '2026-10-11'
related:
  - 'html5/290-WebWorkers'
  - 'html5/300-ServiceWorkerPWA'
  - 'html5/281-PostMessageRpcPatterns'
prerequisites:
  - 'html5/290-WebWorkers'
---

## 前置要求

本篇是 `html5/290-WebWorkers` 的工程延伸：假定你已经会创建 Worker、理解 postMessage 的结构化克隆与 Transferable 两条规则。各节独立，按需取用。

## 1. SharedWorker：多个标签页共用一个后台线程

Dedicated Worker 一对一服务创建它的页面；`SharedWorker` 可以被**同源的多个标签页**共享同一个实例——适合跨标签页共享连接（比如一条 WebSocket 收消息，全站标签页都受益）或共享状态。通信要通过 `port` 进行：

```javascript
// 主线程（任意标签页）
const worker = new SharedWorker('shared-worker.js');
worker.port.start();                       // 显式启动消息分发
worker.port.postMessage('hello from tab');
worker.port.onmessage = (e) => console.log('收到：', e.data);
```

```javascript
// shared-worker.js：每个标签页连入时触发一次 onconnect
const connections = [];

self.onconnect = (e) => {
  const port = e.ports[0];
  connections.push(port);

  port.onmessage = (e) => {
    // 广播给所有连入的标签页
    connections.forEach((p) => p.postMessage(e.data));
  };
  port.start();
};
```

选型提醒：SharedWorker 的浏览器支持历来摇摆（Safari 一度移除又恢复，Chrome 私有模式下不可用），单纯"跨标签页同步状态"的需求优先用 BroadcastChannel（290 篇）；只有"共享一条昂贵连接/一段大内存"才值得上 SharedWorker。

## 2. 两个 Worker 直连：转寄 MessagePort

主线程的 postMessage 是广播式的，Worker A 与 Worker B 直接对话要靠端口转寄：创建一个 MessageChannel，把两个端口分别"装进信封"寄给两个 Worker。端口可以转移（transfer），这正是它区别于普通消息的地方。

```javascript
// 主线程
const channel = new MessageChannel();
const worker1 = new Worker('worker1.js', { type: 'module' });
const worker2 = new Worker('worker2.js', { type: 'module' });

worker1.postMessage({ port: 'give' }, [channel.port1]);
worker2.postMessage({ port: 'give' }, [channel.port2]);
```

```javascript
// worker1.js 与 worker2.js 结构相同
self.onmessage = (e) => {
  const port = e.data.port;
  port.onmessage = (e) => console.log('对端来话：', e.data);
  port.postMessage('ping');
};
```

连线完成后 A、B 互相通信完全绕过主线程，主线程也不再被消息风暴打扰。这个"端口即权柄"的模式同样适用于多级 iframe 与主/子 Worker 树。注意：用 `onmessage` 属性赋值的方式会隐式 `start()`，若用 `addEventListener('message', ...)` 则必须显式调 `port.start()`，否则消息永远不会派发——排错清单的前三名。

## 3. classic 与 module：两种 Worker 模式

`new Worker(url, options)` 的关键选项：

| 字段 | 说明 |
| --- | --- |
| `type` | `'classic'`（默认）或 `'module'`；module 模式内可用 `import`/`export` |
| `name` | Worker 名称，调试时在 DevTools 的线程列表里区分用 |
| `credentials` | module 模式拉取脚本的凭证策略（`omit`/`same-origin`/`include`） |

```javascript
// module 模式：可以直接复用主项目的 ESM 模块
const worker = new Worker('worker.js', { type: 'module' });

// worker.js（module 模式）
import { heavyProcess } from './lib.js';
self.onmessage = (e) => self.postMessage(heavyProcess(e.data));
```

classic 模式的对应物是同步引入脚本的全局函数，仅老代码可见：

```javascript
// worker.js（classic 模式）
importScripts('lib.js', 'helper.js');   // 阻塞式按序加载，module 模式下不存在
```

Worker 内部的全局对象是 `self`（DedicatedWorkerGlobalScope），常用成员：`self.name`（创建时的 name）、`self.location`（脚本 URL）、`self.navigator`，以及主动退出的 `self.close()`。

## 4. 可转移对象全表

结构化克隆（复制）与 Transferable（转移所有权，零拷贝）的完整清单，传大二进制时对照选用：

| 类型 | 可转移 | 说明 |
| --- | --- | --- |
| `ArrayBuffer` | 是 | 二进制缓冲，转移后原端 `byteLength` 归 0（detached） |
| `MessagePort` | 是 | 端口转寄的基础，第 2 节刚用过 |
| `ImageBitmap` | 是 | 已解码位图，图像处理场景比传 Image 快 |
| `OffscreenCanvas` | 是 | 整块画布搬进 Worker |
| `ReadableStream` / `WritableStream` / `TransformStream` | 是 | 流的所有权转移 |
| `AudioData` / `VideoFrame` | 是 | 音视频帧（WebCodecs 体系） |
| 普通 Object / Array / Map / Set / Date / RegExp / TypedArray | 否（克隆） | 结构化克隆深拷贝；TypedArray 复制时底层的 ArrayBuffer 也可一并转移 |
| `Function` / DOM 节点 / `Symbol` | 不支持 | 抛 `DataCloneError` |

自检：如果转移后又想在主线程读同一个 `ArrayBuffer`，读到的必然是空——所有权已经过户；需要双方同时持有的场景应该复制而不是转移。

## 5. Worker 家族全景与选型

| 成员 | 创建方式 | 服务对象 | 典型场景 |
| --- | --- | --- | --- |
| Dedicated Worker | `new Worker()` | 单个页面 | 密集计算、数据解析、图像处理 |
| Shared Worker | `new SharedWorker()` | 多个同源标签页 | 共享连接与状态 |
| Service Worker | `navigator.serviceWorker.register()` | 整个源（网络代理） | 离线缓存、推送、PWA（`html5/300-ServiceWorkerPWA`） |
| Audio Worklet | `audioContext.audioWorklet.addModule()` | 音频渲染线程 | 低延迟音频合成与处理 |
| OffscreenCanvas | `canvas.transferControlToOffscreen()` 后转入 Worker | 单块画布 | Worker 内持续重绘（粒子、游戏渲染） |

选择路径：重计算 → Dedicated；跨标签共享 → 先 BroadcastChannel，不够再 SharedWorker；离线 → Service Worker；音频 → Audio Worklet；画布重绘 → OffscreenCanvas。

## 6. 练习

1. （必做）跑通第 2 节双 Worker 直连：worker1 每 500ms 发一个递增编号，worker2 收到后回 ACK，主线程全程不参与；
2. （必做）把 290 篇的求和 Worker 改成 `type: 'module'` 版本，把求和函数抽到独立模块被 `import`；
3. （选做）用一个 SharedWorker 统计"当前打开的标签页数量"：每个标签页连入时报到，Worker 广播最新计数；
4. （选做）读 penpal 或 Comlink 的源码目录，找出它用本篇哪个模式建立通信（提示：都在找 port）。

## 7. 下一步

- 基础与对比实验：`html5/290-WebWorkers`；
- 家族里最重要的成员：`html5/300-ServiceWorkerPWA`；
- 消息模型的另一个副本（跨窗口）：`html5/280-CrossDocumentCommunication` 与 `html5/281-PostMessageRpcPatterns`。
