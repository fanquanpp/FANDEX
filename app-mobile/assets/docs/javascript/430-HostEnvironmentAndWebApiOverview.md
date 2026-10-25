---
order: 500
title: 宿主环境与 Web API 总览
module: 'javascript'
category: 前端技术
difficulty: intermediate
description: 浏览器宿主环境与 Web API 的分层总览：ECMAScript 内核之外还有什么、宿主对象五元组模型、各能力族（网络、存储、观察器、线程、设备能力）的设计动机与演化时间线，以及通往各专篇的导读地图，附 Geolocation 与 Notification 两个设备能力示例。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'javascript/410-DOMOperationEvent'
  - 'javascript/420-BOMBrowserObjectModel'
  - 'javascript/440-FetchApiAndAbortController'
  - 'javascript/460-StorageForTheWeb'
  - 'javascript/417-BrowserObserversAndCrossTabMessaging'
prerequisites:
  - 'javascript/220-ES6NewFeatures'
  - 'javascript/060-ControlFlow'
---

## 知识点地图

- **知识类别**：宿主环境（host environment）与 Web API 的**总览与分层**——语言规范之外，浏览器递给 JS 的全部能力。
- **解决什么问题**：`fetch`、`localStorage`、`setTimeout` 这些「不是 JS 语言却天天在用」的东西到底是什么、从哪来、按什么规则工作；以及模块内十几篇 Web API 专篇该怎么排列成一张学习地图。
- **什么时候用到**：建立浏览器能力的全景认知时；遇到「Node 里没有这个 API」「这个 API 为什么要求 HTTPS」一类环境问题时；决定某个需求该用哪一族 API 时。

## 前置知识

- [BOM 浏览器对象模型](/javascript/420-BOMBrowserObjectModel)：树外的 window、location、history；
- [DOM 操作与事件](/javascript/410-DOMOperationEvent)：树内的 document 与事件模型。

## 学习目标

读完本文你将能够：

1. 说出「语言内核（ECMAScript）」与「宿主环境（浏览器）」的分界，判断一个 API 属于哪一层；
2. 用「方法、事件、状态、生命周期、权限」五元组描述任何一个 Web API；
3. 复述 Web API 演化的三条主线（异步化、零开销观察者、能力权限化）；
4. 按需求把任务路由到正确的专篇：网络请求、存储、观察器、线程、设备能力。

预计 30 到 45 分钟。本篇是地图不是词典：每个能力族只讲「是什么、为什么、去哪学」。

## 1. 引言

Web API 是浏览器暴露给 JavaScript 的一组宿主对象与接口集合，它构成了 ECMAScript 语言内核与外部世界（网络、存储、设备、渲染管线、操作系统）之间的契约层。如果没有 Web API，JavaScript 仅是一门能操作数值、字符串与对象的纯计算语言；正是 Web API 让 JavaScript 具备了「感知与改造现实世界」的能力——发起网络请求、持久化数据、监听视口变化、调度后台线程、获取地理位置、推送系统通知、剪贴板读写、设备方向感知等。

理解 Web API 不仅是掌握「调用方式」，更重要的是理解其背后的**异步模型**、**生命周期**、**安全模型**（同源策略、CORS、CSP、权限 API）、**事件循环集成方式**以及**资源回收契约**。本篇从分层模型与历史演进两个维度建立全景，再给出通往各专篇的导读。

## 2. 分层模型：语言内核之外的一切

从 `console.log('hi')` 到 `fetch('/api')`，两者调用的是完全不同的两层东西：

| 层 | 是什么 | 谁定义 | 例子 | 换个宿主还在吗 |
| --- | --- | --- | --- | --- |
| 语言内核 | 语法、类型、内建对象 | ECMA-262 规范 | `Array`、`Promise`、`JSON`、`Math` | 在（Node/Deno 都有） |
| DOM 层 | 文档树与事件 | W3C/WHATWG DOM 标准 | `document`、`addEventListener` | 不在（Node 没有） |
| BOM 层 | 窗口与导航 | HTML 标准 | `window`、`location`、`history` | 不在 |
| 能力层 | 网络/存储/线程/设备 | 各自的独立规范 | `fetch`、`localStorage`、`Worker` | 部分在（Node 18+ 有 fetch） |

判断口诀：**在 Node 里跑一下，报 `undefined is not a function` 的就是宿主 API。** `setTimeout` 在两边都有但实现不同（浏览器的进事件循环渲染管线，Node 的进 libuv 定时器轮）；`fetch` 本是浏览器 API，Node 18 起才补齐；`document` 永远只在浏览器。这个分界解释了模块里反复出现的两条纪律：DOM 代码不能在 Node 测试里跑；纯逻辑（工具函数、数据变换）不碰宿主 API 才能在两端复用。

## 3. 形式化定义：用五元组描述一个 Web API

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

拿任何一个 API 套一遍，它的用法立刻结构化。以 `navigator.clipboard` 为例：$M=\{\text{writeText}, \text{readText}\}$；$E_v$ 为空但受权限事件约束；$P=\{\text{HTTPS}, \text{用户手势}\}$——读 417 篇时你会看到这两条约束正是从 $P$ 里长出来的使用纪律。

## 4. 历史动机与背景

### 4.1 Web API 的演化时间线

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

### 4.2 设计动机分析

Web API 的演化遵循三条主线：

1. **异步化**：从回调（XHR、`setTimeout`）→ Promise（Fetch）→ Async/Await（ES2017）→ 异步迭代器（Streams API）。每次演化都是为了解决「回调地狱」与错误传播问题。
2. **零开销观察者**：`scroll`、`resize`、`mutation` 事件在主线程触发，成本高昂。`IntersectionObserver`、`ResizeObserver`、`MutationObserver`、`PerformanceObserver` 把监听逻辑下沉到浏览器内核，仅在状态变化时回调，大幅降低主线程压力。
3. **能力解耦与权限化**：早期浏览器把能力直接挂在 `navigator` 上（如 `navigator.geolocation`）；现代 API 采用 Permissions API 模型，调用前显式请求权限，符合隐私优先的 Web 演进方向。

三条主线是阅读后续专篇的透镜：遇到任何新 API，先问它处在哪条主线的哪一步——是老回调模式的遗民，还是权限化浪潮下的新贵。

## 5. 能力族导读：每个需求去哪篇

本模块把 Web API 按能力族拆成了专篇，路由表如下：

| 你要做什么 | 去哪篇 | 关键词 |
| --- | --- | --- |
| 窗口、地址栏、历史记录 | [BOM 浏览器对象模型](/javascript/420-BOMBrowserObjectModel) | window / location / history / 定时器 / URL |
| 判断元素可见、监听 DOM 变动与尺寸、跨标签页同步 | [浏览器观察器与跨标签页通信](/javascript/417-BrowserObserversAndCrossTabMessaging) | IntersectionObserver / MutationObserver / ResizeObserver / Clipboard / BroadcastChannel |
| 发请求、取消与超时 | [fetch 与 AbortController](/javascript/440-FetchApiAndAbortController) | Request / Response / signal / 错误语义 |
| 流式读取大响应、处理 SSE | [Web Streams 数据流](/javascript/455-WebStreamsDataFlow) | ReadableStream / getReader / SSE |
| 存用户偏好与 Token | [网络存储](/javascript/460-StorageForTheWeb) | Cookie / localStorage / sessionStorage |
| 存大量结构化数据 | [IndexedDB](/javascript/470-IndexedDBADatabaseInYourBrowser) | 对象仓库 / 索引 / 事务 |
| 真并行计算 | [Web Workers 多线程](/javascript/670-WebWorkersMultithreading) | 结构化克隆 / Transferable / SharedArrayBuffer |
| 离线缓存与推送 | [Service Worker 与 PWA](/javascript/680-ServiceWorkerPWA) | install / activate / fetch 拦截 |

本篇保留两个不便单独立篇的「设备能力」示例（下一节），以及全局的兼容性与安全附录（第 9 节）。

## 6. 设备能力两例：Geolocation 与 Notification

### 6.1 Geolocation

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
      enableHighAccuracy: true,  // 高精度模式（更耗电）
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

它是「权限化」主线的典型样本：能力挂在 `navigator` 上，调用即弹权限框，错误回调的第一个错误码就是 PERMISSION_DENIED。安全约束（HTTP 下不可用）见第 9.3 节清单。

### 6.2 Notification API

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

通知的完整生命周期在 Service Worker 里管理（页面关了通知还能在），所以它与 680 篇是搭档：本篇只负责「请求权限、发通知」这一段。

## 7. 前沿与趋势

- WebGPU API：替代 WebGL 的现代 GPU 接口
- WebTransport：基于 QUIC 的低延迟双向通信
- WebCodecs：原生音视频编解码 API
- Web Authentication (WebAuthn)：替代密码的生物特征与硬件认证
- File System Access API：浏览器内文件系统读写能力
- WebHID / WebUSB / WebSerial：硬件设备访问

## 8. 参考与延伸

- [MDN Web Docs - Web APIs](https://developer.mozilla.org/en-US/docs/Web/API)
- [WHATWG Standards](https://spec.whatwg.org/)
- [W3C Standards](https://www.w3.org/TR/)
- [Chrome Developers - Web Capabilities](https://developer.chrome.com/docs/capabilities/)
- C. Anderson et al. 2021. "Fugu: Capabilities for the Web." *ACM Queue* 19, 3 (June 2021). Retrieved from https://queue.acm.org/detail.cfm?id=3469541
- [web.dev - Performance](https://web.dev/performance/)

## 9. 附录

### 9.1 浏览器兼容性速查

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

### 9.2 调试速查表

| 场景 | DevTools 面板 | 关键操作 |
| --- | --- | --- |
| Fetch 失败排查 | Network | 查看 Request Headers、Response、Status Code |
| IndexedDB 数据 | Application > Storage > IndexedDB | 查看 object store 内容 |
| localStorage 内容 | Application > Storage > Local Storage | 在线编辑值 |
| Service Worker | Application > Service Workers | 取消注册、推送事件 |
| Web Worker 调试 | Sources | 选择 Worker 线程，设置断点 |
| 内存泄漏 | Memory | 拍摄 Heap Snapshot 对比 |
| 性能分析 | Performance | 录制 Flame Chart 分析长任务 |

### 9.3 安全检查清单

- 所有 Fetch 调用设置合理的 `Content-Type`
- 用户输入通过 `encodeURIComponent` 处理后再拼接到 URL
- IndexedDB 不存储敏感信息（密钥、密码），使用 Web Crypto API 加密后再存
- Service Worker 仅缓存同源资源，避免中间人攻击
- BroadcastChannel 仅用于非敏感数据（同源假设仍可被 XSS 绕过）
- Geolocation、Notification、Clipboard 等权限 API 调用前检查 `Permissions.query`
- Worker 内执行的代码需同源，避免动态 `importScripts` 加载第三方脚本

### 9.4 更新日志

- 2026-04-05：初始创建，涵盖 Fetch、Storage、IntersectionObserver、Web Workers、Geolocation 等常用接口。
- 2026-06-13：扩展文件上传下载、IndexedDB Promise 封装、AbortController 取消机制。
- 2026-07-21：金标准升级，新增形式化定义、理论推导、对比分析、陷阱反模式、案例研究、习题、ACM 参考文献、延伸阅读，覆盖 BroadcastChannel、ResizeObserver、Permissions API 等现代 API。
- 2026-10-06：按单主题拆分重组——网络/存储/观察器/Worker 的实操与工程内容迁入各专篇（417/440/450/460/470/670），本篇聚焦宿主环境分层与能力族导读，改名「宿主环境与 Web API 总览」。

## 本章总结

浏览器递给 JS 的能力分四层：语言内核跟着规范走遍所有宿主；DOM 与 BOM 是浏览器的私产；fetch、Storage、Worker 等能力层各有独立规范，Node 只选择性收编。任何 Web API 都能用「方法、事件、状态、生命周期、权限」五元组拆开看——权限维度解释了为什么 Geolocation 要弹框、Clipboard 要 HTTPS。演化的三条主线（异步化、零开销观察者、能力权限化）是判断一个 API 新旧的透镜。本篇是地图：具体动手的内容都在能力族专篇里，路由表在第 5 节。

## 下一步

按需求路由：发请求去 [fetch 与 AbortController](/javascript/440-FetchApiAndAbortController)；做懒加载与跨标签页同步去 [浏览器观察器与跨标签页通信](/javascript/417-BrowserObserversAndCrossTabMessaging)；存数据去 [网络存储](/javascript/460-StorageForTheWeb)。
