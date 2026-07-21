---
title: 'Glossary'
module: 'html5'
---

## HTML5 专有名词查阅表

## 名词列表

内容整理中，敬请期待。

## HTML5 高级名词注释 (Advanced Glossary)

## A

| 术语               | 英文               | 释义                                                                 |
| ------------------ | ------------------ | -------------------------------------------------------------------- |
| adoptedStyleSheets | adoptedStyleSheets | Shadow DOM 共享样式表机制，`shadowRoot.adoptedStyleSheets = [sheet]` |
| AbortController    | AbortController    | 中止控制器，配合 Fetch API 取消请求，`controller.abort()`            |
| AbortSignal        | AbortSignal        | 中止信号，`fetch(url, {signal: controller.signal})` 传入请求         |

## B

| 术语              | 英文              | 释义                                                      |
| ----------------- | ----------------- | --------------------------------------------------------- |
| Background Sync   | Background Sync   | Service Worker 后台同步 API，网络恢复时自动重试失败请求   |
| Broadcast Channel | Broadcast Channel | 同源跨标签页/窗口通信 API，`new BroadcastChannel('name')` |

## C

| 术语                     | 英文                     | 释义                                                                                |
| ------------------------ | ------------------------ | ----------------------------------------------------------------------------------- |
| Custom Elements          | Custom Elements          | Web Components 核心 API，`customElements.define('my-el', MyElement)` 注册自定义元素 |
| customElements.define    | customElements.define    | 注册自定义元素方法，接受标签名（须含连字符）和类定义                                |
| connectedCallback        | connectedCallback        | 自定义元素生命周期回调，元素插入 DOM 时触发                                         |
| disconnectedCallback     | disconnectedCallback     | 自定义元素生命周期回调，元素从 DOM 移除时触发                                       |
| attributeChangedCallback | attributeChangedCallback | 自定义元素生命周期回调，观察属性变化时触发                                          |
| adoptedCallback          | adoptedCallback          | 自定义元素生命周期回调，元素移到新 document 时触发                                  |
| Cache API                | Cache API                | Service Worker 缓存接口，`caches.open()`/`cache.match()`/`cache.add()`              |
| Content Security Policy  | CSP                      | 内容安全策略，HTTP 头限制资源加载来源，防御 XSS 攻击                                |

## D

| 术语             | 英文             | 释义                                                    |
| ---------------- | ---------------- | ------------------------------------------------------- |
| DataChannel      | DataChannel      | WebRTC 数据通道，支持点对点传输任意数据，类似 WebSocket |
| Dedicated Worker | Dedicated Worker | 专用 Worker，仅被创建它的页面使用                       |

## E

| 术语        | 英文        | 释义                                                                 |
| ----------- | ----------- | -------------------------------------------------------------------- |
| EventSource | EventSource | Server-Sent Events 客户端接口，`new EventSource(url)` 接收服务端推送 |

## F

| 术语           | 英文           | 释义                                                                           |
| -------------- | -------------- | ------------------------------------------------------------------------------ |
| Fullscreen API | Fullscreen API | 全屏接口，`element.requestFullscreen()` 进入、`document.exitFullscreen()` 退出 |

## G

| 术语         | 英文         | 释义                                                                              |
| ------------ | ------------ | --------------------------------------------------------------------------------- |
| getUserMedia | getUserMedia | 获取媒体设备（摄像头/麦克风），`navigator.mediaDevices.getUserMedia(constraints)` |

## H

| 术语          | 英文          | 释义                                                                            |
| ------------- | ------------- | ------------------------------------------------------------------------------- |
| HTML Template | HTML Template | `<template>` 标签，声明不被渲染的 DOM 模板，`content` 属性获取 DocumentFragment |
| HTML Slot     | HTML Slot     | `<slot>` 标签，Shadow DOM 中的内容占位符，`name` 属性匹配 `slot` 属性           |

## I

| 术语           | 英文                                   | 释义                                                         |
| -------------- | -------------------------------------- | ------------------------------------------------------------ |
| ICE            | Interactive Connectivity Establishment | WebRTC 连接建立协议，通过 STUN/TURN 服务器收集候选地址       |
| IDBDatabase    | IDBDatabase                            | IndexedDB 数据库连接对象，`indexedDB.open()` 打开/创建数据库 |
| IDBObjectStore | IDBObjectStore                         | IndexedDB 对象存储（类似表），`db.createObjectStore()` 创建  |
| IDBTransaction | IDBTransaction                         | IndexedDB 事务对象，保证操作的原子性和一致性                 |

## J

| 术语               | 英文                        | 释义                                                     |
| ------------------ | --------------------------- | -------------------------------------------------------- |
| 构建自定义元素     | Autonomous Custom Element   | 独立自定义元素，继承 `HTMLElement`                       |
| 构建自定义内置元素 | Customized Built-in Element | 扩展内置元素，如 `class MyBtn extends HTMLButtonElement` |

## K

| 术语          | 英文             | 释义                                                   |
| ------------- | ---------------- | ------------------------------------------------------ |
| manifest.json | Web App Manifest | PWA 配置文件，定义应用名称、图标、启动 URL、显示模式等 |

## L

| 术语                | 英文                | 释义                                                                       |
| ------------------- | ------------------- | -------------------------------------------------------------------------- |
| Lifecycle Callbacks | Lifecycle Callbacks | 自定义元素生命周期回调：connected、disconnected、adopted、attributeChanged |

## M

| 术语                   | 英文             | 释义                                                  |
| ---------------------- | ---------------- | ----------------------------------------------------- |
| MediaRecorder          | MediaRecorder    | 媒体录制 API，将 MediaStream 录制为音视频文件         |
| MediaSource Extensions | MSE              | 媒体源扩展，允许 JS 动态构建媒体流用于 `<video>` 播放 |
| MessageChannel         | MessageChannel   | 双向消息通道，创建两个互相通信的 MessagePort          |
| MutationObserver       | MutationObserver | DOM 变动观察器，监听子节点、属性、文本变化            |

## N

| 术语           | 英文           | 释义                                               |
| -------------- | -------------- | -------------------------------------------------- |
| Navigation API | Navigation API | 现代路由 API，替代 history API，支持拦截和过渡动画 |

## O

| 术语                | 英文                 | 释义                                                              |
| ------------------- | -------------------- | ----------------------------------------------------------------- |
| observedAttributes  | observedAttributes   | 自定义元素静态 getter，返回需观察变化的属性名数组                 |
| online/offline 事件 | online/offline Event | 网络状态变化事件，`window.addEventListener('online/offline', fn)` |

## P

| 术语                | 英文                | 释义                                                                    |
| ------------------- | ------------------- | ----------------------------------------------------------------------- |
| PWA                 | Progressive Web App | 渐进式 Web 应用，可安装、离线工作、推送通知，体验接近原生应用           |
| Push API            | Push API            | 推送通知接口，`registration.pushManager.subscribe()` 订阅推送           |
| Payment Request API | Payment Request API | 浏览器原生支付接口，提供标准化支付流程                                  |
| Permissions API     | Permissions API     | 权限查询接口，`navigator.permissions.query({name: 'geolocation'})`      |
| postMessage         | postMessage         | 跨源通信方法，`window.postMessage(data, origin)` 发送、`onmessage` 接收 |

## R

| 术语                       | 英文                        | 释义                                                             |
| -------------------------- | --------------------------- | ---------------------------------------------------------------- |
| RTCPeerConnection          | RTCPeerConnection           | WebRTC 点对点连接对象，管理音视频和数据通道的传输                |
| RTCDataChannel             | RTCDataChannel              | WebRTC 数据通道，支持可靠/不可靠传输                             |
| Registering Service Worker | Service Worker Registration | `navigator.serviceWorker.register('/sw.js')` 注册 Service Worker |
| requestIdleCallback        | requestIdleCallback         | 浏览器空闲时执行低优先级任务，适合非关键计算                     |

## S

| 术语                    | 英文                         | 释义                                                       |
| ----------------------- | ---------------------------- | ---------------------------------------------------------- |
| Shadow DOM              | Shadow DOM                   | Web Components 封装机制，将样式和结构隔离在 Shadow Root 内 |
| Shadow Root             | Shadow Root                  | Shadow DOM 的根节点，`element.attachShadow({mode})` 创建   |
| Shadow Host             | Shadow Host                  | 包含 Shadow Root 的宿主元素                                |
| open/closed Shadow DOM  | open/closed Shadow DOM       | `mode: 'open'` 允许 JS 访问 Shadow Root，`closed` 不允许   |
| Service Worker          | Service Worker               | 独立线程的代理服务器，拦截请求、管理缓存、处理推送和同步   |
| Service Worker 生命周期 | SW Lifecycle                 | 注册→安装(install)→激活(activate)→运行→终止                |
| SDP                     | Session Description Protocol | WebRTC 会话描述协议，描述媒体能力和传输地址                |
| SharedWorker            | SharedWorker                 | 共享 Worker，可被多个同源页面共用                          |
| Stream API              | Streams API                  | 流式数据处理接口，ReadableStream 和 WritableStream         |

## T

| 术语                | 英文                    | 释义                                                           |
| ------------------- | ----------------------- | -------------------------------------------------------------- |
| Touch Events        | Touch Events            | 触摸事件：`touchstart`、`touchmove`、`touchend`、`touchcancel` |
| TextEncoder/Decoder | TextEncoder/TextDecoder | 文本编码/解码 API，UTF-8 编码转换                              |

## U

| 术语   | 英文   | 释义                                           |
| ------ | ------ | ---------------------------------------------- |
| WebUSB | WebUSB | USB 设备访问 API，允许 Web 应用与 USB 设备通信 |

## V

| 术语           | 英文                | 释义                                                        |
| -------------- | ------------------- | ----------------------------------------------------------- |
| Visibility API | Page Visibility API | 页面可见性 API，`document.visibilityState` 检测页面是否可见 |

## W

| 术语               | 英文               | 释义                                                                 |
| ------------------ | ------------------ | -------------------------------------------------------------------- |
| Web Components     | Web Components     | Web 组件标准，包含 Custom Elements、Shadow DOM、HTML Templates       |
| WebRTC             | WebRTC             | Web 实时通信，支持浏览器间音视频和数据点对点传输                     |
| WebSocket          | WebSocket          | 全双工持久连接协议，`new WebSocket(url)` 创建，低延迟实时通信        |
| Web Animations API | Web Animations API | 浏览器动画编程接口，`element.animate(keyframes, options)`            |
| Web Speech API     | Web Speech API     | 语音识别和合成接口，`SpeechRecognition` 和 `SpeechSynthesis`         |
| Web Bluetooth      | Web Bluetooth      | 蓝牙设备访问 API，允许 Web 应用与 BLE 设备通信                       |
| Web Share API      | Web Share API      | 系统分享接口，`navigator.share({title, text, url})` 调用系统分享面板 |
| Worklet            | Worklet            | 轻量级执行环境，如 Paint Worklet、Audio Worklet，在渲染/音频线程运行 |

## X

| 术语           | 英文 | 释义                                                |
| -------------- | ---- | --------------------------------------------------- |
| XMLHttpRequest | XHR  | 传统异步请求对象，支持 GET/POST、进度事件、超时设置 |

## Y

| 术语     | 英文            | 释义                                                                   |
| -------- | --------------- | ---------------------------------------------------------------------- |
| 渲染阻塞 | Render-blocking | 阻塞页面首次渲染的资源，如同步 `<script>` 和 `<link rel="stylesheet">` |

## Z

| 术语   | 英文         | 释义                                                            |
| ------ | ------------ | --------------------------------------------------------------- |
| 暂存区 | Staging Area | Service Worker 安装时的缓存准备阶段，`install` 事件中预缓存资源 |

## HTML5 API 名词注释 (API Glossary)

## A

| 术语         | 英文         | 释义                                                                  |
| ------------ | ------------ | --------------------------------------------------------------------- |
| AudioContext | AudioContext | Web Audio API 的核心对象，管理音频图的创建和处理                      |
| addColorStop | addColorStop | Canvas 渐变添加颜色停止点方法，`gradient.addColorStop(offset, color)` |

## B

| 术语          | 英文          | 释义                                                           |
| ------------- | ------------- | -------------------------------------------------------------- |
| Blob          | Blob          | 二进制大对象，表示不可变的原始数据，`new Blob([data], {type})` |
| bezierCurveTo | bezierCurveTo | Canvas 三次贝塞尔曲线路径方法，需要两个控制点和一个终点        |
| beginPath     | beginPath     | Canvas 开始新路径，清除之前的路径列表                          |

## C

| 术语                     | 英文                     | 释义                                                               |
| ------------------------ | ------------------------ | ------------------------------------------------------------------ |
| Canvas API               | Canvas API               | 2D 图形绘制接口，通过 `getContext('2d')` 获取绘图上下文            |
| CanvasRenderingContext2D | CanvasRenderingContext2D | Canvas 2D 渲染上下文，提供绑制路径、矩形、文字、图像等方法         |
| clearRect                | clearRect                | Canvas 清除矩形区域像素                                            |
| clip                     | clip                     | Canvas 裁剪路径，将当前路径设为裁剪区域                            |
| createLinearGradient     | createLinearGradient     | Canvas 创建线性渐变对象                                            |
| createRadialGradient     | createRadialGradient     | Canvas 创建径向渐变对象                                            |
| closePath                | closePath                | Canvas 闭合路径，从当前点画直线到路径起点                          |
| clipboardData            | clipboardData            | 剪贴板数据对象，`e.clipboardData.getData()`/`setData()` 读写剪贴板 |

## D

| 术语             | 英文              | 释义                                                                                |
| ---------------- | ----------------- | ----------------------------------------------------------------------------------- |
| Drag API         | Drag and Drop API | 原生拖放接口，事件：`dragstart`、`drag`、`dragenter`、`dragover`、`drop`、`dragend` |
| DataTransfer     | DataTransfer      | 拖放数据传递对象，`setData()`/`getData()` 存取拖拽数据                              |
| drawImage        | drawImage         | Canvas 绘制图像方法，支持缩放和裁切                                                 |
| devicePixelRatio | devicePixelRatio  | 设备像素比，物理像素与 CSS 像素的比率，高清屏通常为 2 或 3                          |

## E

| 术语               | 英文               | 释义                     |
| ------------------ | ------------------ | ------------------------ |
| event.dataTransfer | event.dataTransfer | 拖放事件中的数据传输对象 |

## F

| 术语       | 英文       | 释义                                                                             |
| ---------- | ---------- | -------------------------------------------------------------------------------- |
| fillRect   | fillRect   | Canvas 填充矩形                                                                  |
| fillText   | fillText   | Canvas 填充文字                                                                  |
| fillStyle  | fillStyle  | Canvas 填充样式，支持颜色、渐变、图案                                            |
| FileReader | FileReader | 异步读取 Blob/文件对象的 API，`readAsText`、`readAsDataURL`、`readAsArrayBuffer` |
| FormData   | FormData   | 构建表单数据的接口，用于 AJAX 文件上传和键值对提交                               |
| Fetch API  | Fetch API  | 基于 Promise 的网络请求接口，替代 XMLHttpRequest，`fetch(url, options)`          |

## G

| 术语                     | 英文                     | 释义                                                                           |
| ------------------------ | ------------------------ | ------------------------------------------------------------------------------ |
| Geolocation API          | Geolocation API          | 地理定位接口，`navigator.geolocation.getCurrentPosition()` 获取位置            |
| getCurrentPosition       | getCurrentPosition       | 获取当前地理位置，回调接收 `Position` 对象含 `coords.latitude/longitude`       |
| getContext               | getContext               | 获取 Canvas 绘图上下文，`'2d'` 或 `'webgl'`/`'webgl2'`                         |
| getImageData             | getImageData             | Canvas 获取像素数据，返回 `ImageData` 对象                                     |
| globalCompositeOperation | globalCompositeOperation | Canvas 合成操作模式，如 `source-over`、`multiply`、`screen`、`destination-out` |

## I

| 术语                 | 英文                 | 释义                                                            |
| -------------------- | -------------------- | --------------------------------------------------------------- |
| IndexedDB            | IndexedDB            | 浏览器端 NoSQL 数据库，支持事务、索引、游标，存储大量结构化数据 |
| ImageData            | ImageData            | Canvas 像素数据对象，`data` 属性为 `Uint8ClampedArray`          |
| IntersectionObserver | IntersectionObserver | 异步观察元素与视口交叉状态的 API，用于懒加载和曝光检测          |

## J

| 术语 | 英文 | 释义                                                                      |
| ---- | ---- | ------------------------------------------------------------------------- |
| JSON | JSON | JavaScript 对象表示法，`JSON.parse()` 反序列化、`JSON.stringify()` 序列化 |

## L

| 术语         | 英文         | 释义                                              |
| ------------ | ------------ | ------------------------------------------------- |
| localStorage | localStorage | 本地持久存储，5MB+ 容量，数据永久保留除非手动清除 |
| lineTo       | lineTo       | Canvas 从当前点画直线到指定点                     |
| lineWidth    | lineWidth    | Canvas 线条宽度属性                               |

## M

| 术语        | 英文        | 释义                                             |
| ----------- | ----------- | ------------------------------------------------ |
| MediaStream | MediaStream | 媒体流对象，getUserMedia 返回，包含音频/视频轨道 |
| moveTo      | moveTo      | Canvas 移动画笔到指定点（不画线）                |
| measureText | measureText | Canvas 测量文本宽度，返回 `TextMetrics` 对象     |

## N

| 术语             | 英文             | 释义                                                        |
| ---------------- | ---------------- | ----------------------------------------------------------- |
| Notification API | Notification API | 浏览器通知接口，`Notification.requestPermission()` 请求权限 |

## O

| 术语            | 英文            | 释义                                       |
| --------------- | --------------- | ------------------------------------------ |
| OffscreenCanvas | OffscreenCanvas | 离屏画布，可在 Worker 线程中渲染，提升性能 |

## P

| 术语            | 英文            | 释义                                                                              |
| --------------- | --------------- | --------------------------------------------------------------------------------- |
| putImageData    | putImageData    | Canvas 将像素数据绘制到画布                                                       |
| Path2D          | Path2D          | Canvas 路径对象，可缓存和复用路径，支持 SVG 路径字符串                            |
| Performance API | Performance API | 性能监控接口，`performance.now()` 高精度时间、`performance.getEntries()` 资源计时 |

## Q

| 术语             | 英文             | 释义                                        |
| ---------------- | ---------------- | ------------------------------------------- |
| quadraticCurveTo | quadraticCurveTo | Canvas 二次贝塞尔曲线方法，一个控制点加终点 |

## R

| 术语                  | 英文                  | 释义                                                        |
| --------------------- | --------------------- | ----------------------------------------------------------- |
| requestAnimationFrame | requestAnimationFrame | 浏览器动画帧回调，与屏幕刷新同步，通常 60fps                |
| ResizeObserver        | ResizeObserver        | 观察元素尺寸变化的 API，回调接收 `ResizeObserverEntry` 数组 |
| restore               | restore               | Canvas 恢复保存的绘图状态（从状态栈弹出）                   |
| rotate                | rotate                | Canvas 旋转当前变换矩阵                                     |

## S

| 术语            | 英文            | 释义                                               |
| --------------- | --------------- | -------------------------------------------------- |
| sessionStorage  | sessionStorage  | 会话存储，数据在标签页关闭后清除，同源同标签页共享 |
| save            | save            | Canvas 保存当前绘图状态到状态栈                    |
| scale           | scale           | Canvas 缩放当前变换矩阵                            |
| strokeRect      | strokeRect      | Canvas 描边矩形                                    |
| strokeText      | strokeText      | Canvas 描边文字                                    |
| strokeStyle     | strokeStyle     | Canvas 描边样式                                    |
| setTransform    | setTransform    | Canvas 重置并设置变换矩阵                          |
| shadowBlur      | shadowBlur      | Canvas 阴影模糊度                                  |
| shadowColor     | shadowColor     | Canvas 阴影颜色                                    |
| shadowOffsetX/Y | shadowOffsetX/Y | Canvas 阴影偏移量                                  |

## T

| 术语      | 英文      | 释义                                                       |
| --------- | --------- | ---------------------------------------------------------- |
| translate | translate | Canvas 平移当前变换矩阵                                    |
| toDataURL | toDataURL | Canvas 导出为 Base64 图片，`canvas.toDataURL('image/png')` |
| toBlob    | toBlob    | Canvas 导出为 Blob 对象，异步回调                          |

## U

| 术语                | 英文                | 释义                                                   |
| ------------------- | ------------------- | ------------------------------------------------------ |
| URL.createObjectURL | URL.createObjectURL | 为 Blob/File 创建临时 URL，须用 `revokeObjectURL` 释放 |
| URL.revokeObjectURL | URL.revokeObjectURL | 释放 createObjectURL 创建的临时 URL                    |

## V

| 术语          | 英文          | 释义                                                    |
| ------------- | ------------- | ------------------------------------------------------- |
| Vibration API | Vibration API | 设备振动接口，`navigator.vibrate(pattern)` 控制振动模式 |

## W

| 术语          | 英文          | 释义                                                                  |
| ------------- | ------------- | --------------------------------------------------------------------- |
| WebGL         | WebGL         | 基于 OpenGL ES 的 3D 图形 API，`getContext('webgl')` 获取上下文       |
| WebGL2        | WebGL2        | WebGL 升级版，基于 OpenGL ES 3.0，支持更多纹理格式和着色器特性        |
| Web Audio API | Web Audio API | 高级音频处理接口，支持音效、分析、空间化等                            |
| Web Storage   | Web Storage   | localStorage 和 sessionStorage 的统称，替代 Cookie 的客户端存储方案   |
| Web Workers   | Web Workers   | 后台线程执行脚本，不阻塞 UI，通过 `postMessage` 通信                  |
| Worker        | Worker        | Web Worker 实例，`new Worker('script.js')` 创建，`onmessage` 接收消息 |

## X

| 术语           | 英文           | 释义                                                  |
| -------------- | -------------- | ----------------------------------------------------- |
| XMLHttpRequest | XMLHttpRequest | 传统 AJAX 请求对象，已被 Fetch API 取代，但仍广泛使用 |

## HTML5 核心名词注释 (Core Glossary)

## A

| 术语         | 英文            | 释义                                                                    |
| ------------ | --------------- | ----------------------------------------------------------------------- |
| a 标签       | Anchor Tag      | `<a>` 超链接标签，`href` 指定目标 URL，`target` 指定打开方式            |
| alt 属性     | alt Attribute   | 图片替代文本，图片无法显示时展示，对 SEO 和无障碍至关重要               |
| article 标签 | article Tag     | `<article>` 独立内容区域，如博客文章、新闻条目                          |
| aside 标签   | aside Tag       | `<aside>` 侧边栏内容，与主内容间接相关                                  |
| audio 标签   | audio Tag       | `<audio>` 原生音频播放，支持 `src`、`controls`、`autoplay`、`loop` 属性 |
| aria 属性    | ARIA Attributes | 无障碍富互联网应用属性，`role`、`aria-label`、`aria-hidden` 等          |

## B

| 术语            | 英文           | 释义                                                                  |
| --------------- | -------------- | --------------------------------------------------------------------- |
| blockquote 标签 | blockquote Tag | `<blockquote>` 块引用，`cite` 属性标注来源 URL                        |
| br 标签         | br Tag         | `<br>` 换行标签，自闭合，不应用于布局间距                             |
| button 标签     | button Tag     | `<button>` 按钮元素，`type` 属性：`submit`（默认）、`reset`、`button` |

## C

| 术语            | 英文            | 释义                                                                    |
| --------------- | --------------- | ----------------------------------------------------------------------- |
| class 属性      | class Attribute | 元素类名，空格分隔多个值，CSS 和 JS 选择器的主要目标                    |
| charset         | charset         | 字符编码声明，`<meta charset="UTF-8">`，推荐使用 UTF-8                  |
| 语义化标签      | Semantic Tags   | 具有明确含义的 HTML5 标签：`<header>`、`<nav>`、`<main>`、`<footer>` 等 |
| contenteditable | contenteditable | 使元素内容可编辑的属性，值为 ``/`false`                                 |
| canvas 标签     | canvas Tag      | `<canvas>` 画布元素，通过 JavaScript 绘制 2D/3D 图形                    |

## D

| 术语          | 英文              | 释义                                                          |
| ------------- | ----------------- | ------------------------------------------------------------- |
| data 属性     | data-\* Attribute | 自定义数据属性，`data-` 前缀，JS 通过 `dataset` 访问          |
| datalist 标签 | datalist Tag      | `<datalist>` 输入建议列表，配合 `<input list="id">` 使用      |
| details 标签  | details Tag       | `<details>` 可折叠内容区域，`<summary>` 为可见标题            |
| div 标签      | div Tag           | `<div>` 通用块级容器，无语义，用于样式和脚本钩子              |
| DOCTYPE       | DOCTYPE           | 文档类型声明，`<!DOCTYPE html>` 告知浏览器使用 HTML5 标准模式 |
| draggable     | draggable         | 拖拽属性，``/`false`/`auto`，配合 Drag API 使用               |

## E

| 术语       | 英文      | 释义                                                               |
| ---------- | --------- | ------------------------------------------------------------------ |
| embed 标签 | embed Tag | `<embed>` 嵌入外部内容（插件），已被 `<object>` 和 `<iframe>` 取代 |

## F

| 术语          | 英文         | 释义                                                                |
| ------------- | ------------ | ------------------------------------------------------------------- |
| footer 标签   | footer Tag   | `<footer>` 页脚区域，包含版权、联系信息等                           |
| form 标签     | form Tag     | `<form>` 表单容器，`action` 提交地址、`method` 请求方法（GET/POST） |
| fieldset 标签 | fieldset Tag | `<fieldset>` 表单分组，`<legend>` 提供组标题                        |
| figure 标签   | figure Tag   | `<figure>` 自包含内容容器，`<figcaption>` 提供说明文字              |

## G

| 术语     | 英文             | 释义                                                                           |
| -------- | ---------------- | ------------------------------------------------------------------------------ |
| 全局属性 | Global Attribute | 所有 HTML 元素共有的属性：`id`、`class`、`style`、`title`、`lang`、`hidden` 等 |

## H

| 术语        | 英文             | 释义                                                           |
| ----------- | ---------------- | -------------------------------------------------------------- |
| head 标签   | head Tag         | `<head>` 文档头部，包含元数据、样式表、脚本引用                |
| header 标签 | header Tag       | `<header>` 页眉区域，通常包含导航和标题                        |
| h1-h6 标签  | Heading Tags     | `<h1>`~`<h6>` 标题标签，h1 最高级，每页建议仅一个 h1           |
| hr 标签     | hr Tag           | `<hr>` 主题分隔线，表示段落级主题转换                          |
| hidden 属性 | hidden Attribute | 隐藏元素，浏览器不渲染，不同于 `display: none`（语义层面隐藏） |

## I

| 术语        | 英文         | 释义                                                                            |
| ----------- | ------------ | ------------------------------------------------------------------------------- |
| id 属性     | id Attribute | 元素唯一标识符，文档内不可重复，JS 和 CSS 锚点选择器目标                        |
| iframe 标签 | iframe Tag   | `<iframe>` 内嵌框架，`src` 指定嵌入页面，`sandbox` 限制权限                     |
| img 标签    | img Tag      | `<img>` 图片标签，自闭合，`src` 图片路径、`alt` 替代文本、`loading` 懒加载      |
| input 标签  | input Tag    | `<input>` 表单输入控件，`type` 决定输入类型                                     |
| input 类型  | Input Types  | HTML5 新增类型：`email`、`url`、`date`、`color`、`range`、`number`、`search` 等 |

## J

| 术语     | 英文                    | 释义                                             |
| -------- | ----------------------- | ------------------------------------------------ |
| 渐进增强 | Progressive Enhancement | 先保证基本功能可用，再逐步增强高级体验的设计策略 |

## K

| 术语     | 英文                 | 释义                                           |
| -------- | -------------------- | ---------------------------------------------- |
| 优雅降级 | Graceful Degradation | 先构建完整功能，再确保低级浏览器基本可用的策略 |

## L

| 术语       | 英文      | 释义                                                                      |
| ---------- | --------- | ------------------------------------------------------------------------- |
| label 标签 | label Tag | `<label>` 表单标签，`for` 属性关联控件，提升可点击区域和可访问性          |
| link 标签  | link Tag  | `<link>` 外部资源链接，`rel="stylesheet"` 引入 CSS，`rel="icon"` 设置图标 |
| li 标签    | li Tag    | `<li>` 列表项，须在 `<ul>` 或 `<ol>` 内使用                               |

## M

| 术语        | 英文             | 释义                                                                     |
| ----------- | ---------------- | ------------------------------------------------------------------------ |
| main 标签   | main Tag         | `<main>` 文档主内容区域，每页仅一个，不含侧边栏和导航                    |
| meta 标签   | meta Tag         | `<meta>` 元数据标签，`charset`、`viewport`、`description`、`keywords` 等 |
| mark 标签   | mark Tag         | `<mark>` 标记/高亮文本，默认黄色背景                                     |
| meter 标签  | meter Tag        | `<meter>` 标量度量，`min`/`max`/`value`/`low`/`high`/`optimum` 属性      |
| method 属性 | method Attribute | 表单提交方法：`GET`（URL 参数）或 `POST`（请求体）                       |

## N

| 术语       | 英文       | 释义                               |
| ---------- | ---------- | ---------------------------------- |
| nav 标签   | nav Tag    | `<nav>` 导航区域，包含主要导航链接 |
| novalidate | novalidate | 表单属性，禁用浏览器内置表单验证   |

## O

| 术语          | 英文         | 释义                                                              |
| ------------- | ------------ | ----------------------------------------------------------------- |
| ol 标签       | ol Tag       | `<ol>` 有序列表，`type` 编号类型、`start` 起始值、`reversed` 倒序 |
| optgroup 标签 | optgroup Tag | `<optgroup>` 选项分组，`label` 属性指定组名                       |
| option 标签   | option Tag   | `<option>` 下拉选项，`value` 提交值、`selected` 默认选中          |
| output 标签   | output Tag   | `<output>` 计算结果输出，`for` 关联参与计算的元素                 |

## P

| 术语          | 英文         | 释义                                              |
| ------------- | ------------ | ------------------------------------------------- |
| p 标签        | p Tag        | `<p>` 段落标签，块级元素，不可嵌套块级元素        |
| placeholder   | placeholder  | 输入提示文本，值提交时不会发送，不应替代 label    |
| pattern       | pattern      | 正则表达式验证模式，如 `pattern="[0-9]{3}"`       |
| progress 标签 | progress Tag | `<progress>` 进度条，`value` 当前值、`max` 最大值 |

## Q

| 术语   | 英文  | 释义                                 |
| ------ | ----- | ------------------------------------ |
| q 标签 | q Tag | `<q>` 行内短引用，浏览器自动添加引号 |

## R

| 术语      | 英文           | 释义                                                        |
| --------- | -------------- | ----------------------------------------------------------- |
| required  | required       | 表单必填验证属性，提交时浏览器自动验证                      |
| role 属性 | role Attribute | ARIA 角色属性，定义元素的无障碍语义，如 `role="navigation"` |

## S

| 术语         | 英文          | 释义                                                                    |
| ------------ | ------------- | ----------------------------------------------------------------------- |
| section 标签 | section Tag   | `<section>` 主题性内容分组，通常包含标题                                |
| span 标签    | span Tag      | `<span>` 通用行内容器，无语义，用于样式和脚本钩子                       |
| src 属性     | src Attribute | 资源路径属性，指定外部文件 URL                                          |
| style 标签   | style Tag     | `<style>` 内嵌样式表，`media` 属性指定适用媒体                          |
| script 标签  | script Tag    | `<script>` 脚本标签，`src` 外部脚本、`defer` 延迟执行、`async` 异步加载 |
| select 标签  | select Tag    | `<select>` 下拉选择框，包含 `<option>` 子元素                           |
| spellcheck   | spellcheck    | 拼写检查属性，``/`false`，适用于可编辑元素                              |

## T

| 术语          | 英文         | 释义                                                                           |
| ------------- | ------------ | ------------------------------------------------------------------------------ |
| table 标签    | table Tag    | `<table>` 表格容器，含 `<thead>`、`<tbody>`、`<tfoot>`、`<tr>`、`<th>`、`<td>` |
| textarea 标签 | textarea Tag | `<textarea>` 多行文本输入，`rows`/`cols` 指定尺寸                              |
| time 标签     | time Tag     | `<time>` 时间/日期标签，`datetime` 属性提供机器可读格式                        |
| title 标签    | title Tag    | `<title>` 文档标题，显示在浏览器标签页，对 SEO 至关重要                        |

## U

| 术语    | 英文   | 释义                                          |
| ------- | ------ | --------------------------------------------- |
| ul 标签 | ul Tag | `<ul>` 无序列表，子元素 `<li>` 前显示项目符号 |

## V

| 术语       | 英文      | 释义                                                                                  |
| ---------- | --------- | ------------------------------------------------------------------------------------- |
| viewport   | viewport  | `<meta name="viewport">` 视口设置，`width=device-width, initial-scale=1.0` 实现响应式 |
| video 标签 | video Tag | `<video>` 原生视频播放，支持 `src`、`controls`、`autoplay`、`muted`、`poster` 属性    |

## W

| 术语     | 英文     | 释义                                                            |
| -------- | -------- | --------------------------------------------------------------- |
| WAI-ARIA | WAI-ARIA | Web 无障碍倡议 - 无障碍富互联网应用，规范定义了角色、状态和属性 |

## HTML5 语义/性能/无障碍名词注释 (Semantic/Performance/A11y Glossary)

## A

| 术语       | 英文           | 释义                                                      |
| ---------- | -------------- | --------------------------------------------------------- |
| 无障碍     | Accessibility  | 使网页对残障人士可用的技术和实践                          |
| ARIA       | ARIA           | Accessible Rich Internet Applications，无障碍富互联网应用 |
| ARIA 角色  | ARIA Role      | `role="..."` 定义的元素语义角色                           |
| ARIA 属性  | ARIA Attribute | `aria-*` 属性增强无障碍支持                               |
| 自适应图片 | Adaptive Image | 根据屏幕和带宽选择合适尺寸图片                            |
| 异步加载   | Async Loading  | 不阻塞页面渲染的异步资源加载                              |
| 属性       | Attribute      | HTML 元素的额外配置信息                                   |
| 自动播放   | Autoplay       | 媒体元素自动开始播放                                      |

## B

| 术语     | 英文                      | 释义                               |
| -------- | ------------------------- | ---------------------------------- |
| 后备内容 | Fallback Content          | 不支持元素时的替代内容             |
| 基线     | Baseline                  | 文本基线对齐线                     |
| 批量渲染 | Batched Rendering         | 合并 DOM 操作减少重排              |
| 双向文本 | Bidi / Bidirectional Text | 从左到右和从右到左的文本           |
| 品牌图标 | Favicon                   | 网站图标，显示在浏览器标签页和书签 |
| 面包屑   | Breadcrumb                | 导航路径显示当前位置               |

## C

| 术语            | 英文                    | 释义                            |
| --------------- | ----------------------- | ------------------------------- |
| Canvas 离屏渲染 | Off-screen Rendering    | 在不可见画布上预先绘制          |
| 字符集          | Character Encoding      | 字符编码声明，`charset="UTF-8"` |
| 色值            | Color Value             | CSS 颜色表示方法                |
| 颜色格式        | Color Format            | #hex、rgb()、hsl() 等颜色表示   |
| 颜色选择器      | Color Picker            | 选择颜色的 UI 组件              |
| 内容属性        | Content Attribute       | 元素开始标签的属性              |
| 内容分类        | Content Categories      | HTML5 元素的分类体系            |
| 核心 Web 指标   | Core Web Vitals         | Google 评价用户体验的指标       |
| 渐进增强        | Progressive Enhancement | 从基础开始逐步增强              |
| 降级            | Graceful Degradation    | 在旧浏览器优雅降级              |

## D

| 术语      | 英文               | 释义                        |
| --------- | ------------------ | --------------------------- |
| data 属性 | data Attribute     | `data-*` 存储自定义数据     |
| 数据 URL  | Data URL           | `data:` 协议嵌入资源内容    |
| 深色模式  | Dark Mode          | 深色主题界面                |
| 声明      | Declaration        | DOCTYPE 文档类型声明        |
| 默认样式  | Default Styles     | 浏览器内置样式              |
| 延迟加载  | Deferred Loading   | 延迟加载非关键资源          |
| 可发现性  | Discoverability    | 搜索引擎发现页面内容        |
| 占位符    | Placeholder        | 输入框提示文字              |
| 下载属性  | Download Attribute | 链接触发下载而非导航        |
| 可拖拽    | Draggable          | `draggable="true"` 启用拖拽 |

## E

| 术语       | 英文             | 释义                                     |
| ---------- | ---------------- | ---------------------------------------- |
| 可编辑内容 | Editable Content | `contenteditable` 启用内联编辑           |
| 实体       | Entity           | HTML 特殊字符代码，如 `&nbsp;`、`&copy;` |
| 可扩展     | Extensibility    | 通过 Web Components 扩展 HTML            |
| 外链       | External Link    | 指向其他网站的链接                       |

## F

| 术语     | 英文               | 释义               |
| -------- | ------------------ | ------------------ |
| 填充     | Fill               | SVG 填充属性       |
| 首屏     | First Screen       | 首屏内容可见时间   |
| 首屏渲染 | First Paint        | 首次绘制时间       |
| 闪屏     | Flash              | 内容短暂显示后消失 |
| 灵活布局 | Flexible Layout    | 响应式设计布局方式 |
| 折叠     | Fold               | 视口分割线         |
| 字体加载 | Font Loading       | 字体文件加载策略   |
| 字体栈   | Font Stack         | 备选字体列表       |
| 表单验证 | Form Validation    | 原生表单输入验证   |
| 前端框架 | Frontend Framework | UI 组件库和框架    |

## G

| 术语     | 英文             | 释义                           |
| -------- | ---------------- | ------------------------------ |
| 全屏 API | Fullscreen API   | `requestFullscreen()` 全屏显示 |
| 全局属性 | Global Attribute | 所有 HTML 元素共有的属性       |

## H

| 术语     | 英文          | 释义                       |
| -------- | ------------- | -------------------------- |
| 标题级别 | Heading Level | `h1` 到 `h6` 标题层级      |
| 标题树   | Heading Tree  | 页面标题层级结构           |
| 热点     | Hotspot       | 图片上可点击的区域         |
| 悬停状态 | Hover State   | 鼠标悬停效果               |
| HTTP/2   | HTTP/2        | 现代网络协议，支持多路复用 |
| HTTP/3   | HTTP/3        | QUIC 协议的新一代 HTTP     |
| 超链接   | Hyperlink     | 可点击跳转的链接           |

## I

| 术语     | 英文                 | 释义                   |
| -------- | -------------------- | ---------------------- |
| 图标字体 | Icon Font            | 字体形式的图标集       |
| 内联 SVG | Inline SVG           | 直接嵌入 HTML 的 SVG   |
| 智能提示 | Input Hint           | 输入框引导文字         |
| 国际化   | Internationalization | 多语言支持             |
| 内联样式 | Inline Style         | `style` 属性直接写 CSS |

## J

| 术语    | 英文    | 释义                    |
| ------- | ------- | ----------------------- |
| JSON-LD | JSON-LD | 结构化数据 JSON 格式    |
| JWT     | JWT     | JSON Web Token 认证方式 |

## K

| 术语     | 英文                | 释义                 |
| -------- | ------------------- | -------------------- |
| 键盘导航 | Keyboard Navigation | 仅用键盘操作界面     |
| 键盘陷阱 | Keyboard Trap       | 键盘焦点被困在元素内 |
| 关键词   | Keyword             | 搜索引擎优化的关键词 |

## L

| 术语       | 英文              | 释义                   |
| ---------- | ----------------- | ---------------------- |
| 标签       | Label             | 表单输入的描述文字     |
| 懒加载     | Lazy Loading      | 延迟加载视口外资源     |
| 布局视口   | Layout Viewport   | CSS 布局参考的视口     |
| 懒加载图片 | Lazy-loaded Image | 滚动到视口才加载的图片 |
| 轻量级     | Lightweight       | 资源体积小加载快       |
| 链接预取   | Link Prefetching  | 预加载下一页资源       |
| 本地化     | Localization      | 适配特定地区           |
| 长描述     | Long Description  | 图片的详细文本描述     |

## M

| 术语           | 英文                           | 释义                     |
| -------------- | ------------------------------ | ------------------------ |
| 标记语言       | Markup Language                | HTML 是一种标记语言      |
| 最大内容绘制   | LCP / Largest Contentful Paint | 最大内容元素绘制时间     |
| 语义           | Meaning                        | 元素传达的含义           |
| 元数据         | Metadata                       | 描述数据的数据           |
| 微数据         | Microdata                      | HTML 语义增强格式        |
| 微格式         | Microformat                    | 复用 HTML 属性的简单语义 |
| 首次输入延迟   | FID / First Input Delay        | 首次交互到响应的延迟     |
| 最小可交互时间 | TTI / Time to Interactive      | 页面可交互时间           |
| 混排           | Mixed Content                  | HTTPS 页面加载 HTTP 资源 |
| 移动优先       | Mobile-first                   | 优先为移动端设计         |
| 模态框         | Modal                          | 阻断交互的弹出层         |
| 监测           | Monitoring                     | 性能监测                 |

## N

| 术语       | 英文               | 释义                           |
| ---------- | ------------------ | ------------------------------ |
| 导航       | Navigation         | 网站导航菜单                   |
| 导航标记   | Nav                | `<nav>` 导航语义标签           |
| 新窗口     | New Window         | `target="_blank"` 新标签页打开 |
| 下一代图片 | Next-gen Image     | WebP、AVIF 等新格式            |
| 无障碍树   | Accessibility Tree | 屏幕阅读器访问的内容树         |

## O

| 术语     | 英文       | 释义                      |
| -------- | ---------- | ------------------------- |
| 对象     | Object     | 多媒体嵌入元素 `<object>` |
| 离屏     | Off-screen | 视口外不可见              |
| 开放图谱 | Open Graph | Facebook 社交分享协议     |
| 可选文本 | Alt Text   | 图片替代文字描述          |

## P

| 术语         | 英文                         | 释义                       |
| ------------ | ---------------------------- | -------------------------- |
| 页面可见性   | Page Visibility              | document.visibilityState   |
| 分页         | Pagination                   | 分页导航                   |
| 模式切换     | Pattern Switcher             | 主题切换按钮               |
| 占位符图片   | Placeholder Image            | 加载前显示的占位图         |
| 图片格式     | Picture Format               | JPEG、PNG、WebP、AVIF 等   |
| 图片优化     | Image Optimization           | 压缩和格式优化             |
| 首字节时间   | TTFB / Time to First Byte    | 首字节到达时间             |
| 首次内容绘制 | FCP / First Contentful Paint | 首次内容绘制时间           |
| 播放器       | Player                       | 音视频播放器控件           |
| 可访问性     | Accessibility                | 可访问性支持               |
| 多边形热点   | Polygon Hotspot              | 多边形可点击区域           |
| 预连接       | Preconnect                   | 预先建立连接               |
| 预加载       | Preload                      | 预先加载关键资源           |
| 预渲染       | Prerender                    | 预先渲染页面               |
| 渐进式渲染   | Progressive Rendering        | 分阶段显示内容             |
| 属性值       | Property Value               | 属性赋的值                 |
| 协议         | Protocol                     | `http://` 和 `https://` 等 |

## Q

| 术语 | 英文    | 释义         |
| ---- | ------- | ------------ |
| 质量 | Quality | 媒体质量等级 |

## R

| 术语       | 英文              | 释义                   |
| ---------- | ----------------- | ---------------------- |
| 雷达图     | Radar Chart       | 多维数据图表           |
| 首次渲染   | First Paint       | 首屏渲染时间           |
| 相关搜索   | Related Search    | 搜索结果相关推荐       |
| 渲染       | Rendering         | 将代码转为可视内容     |
| 渲染阻塞   | Render-blocking   | 阻塞页面渲染的资源     |
| 渲染树     | Render Tree       | DOM 和 CSSOM 合成      |
| 响应式图片 | Responsive Image  | 根据屏幕选择图片       |
| 响应式设计 | Responsive Design | 适配不同屏幕尺寸       |
| 富媒体     | Rich Media        | 音视频等多媒体内容     |
| 角色       | Role              | ARIA 元素角色          |
| 圆角       | Rounded Corner    | border-radius 圆角效果 |

## S

| 术语       | 英文               | 释义                        |
| ---------- | ------------------ | --------------------------- |
| 骨架屏     | Skeleton Screen    | 加载占位动画                |
| 源         | Source             | 多媒体或图片的 URL          |
| 源集       | Srcset             | 响应式图片多尺寸            |
| 屏幕阅读器 | Screen Reader      | 朗读页面的辅助工具          |
| 脚本模式   | Script Mode        | `type="module"` ES 模块     |
| 搜索框     | Search Box         | 搜索输入框                  |
| 搜索优化   | SEO                | 搜索引擎优化                |
| 安全属性   | Security Attribute | `sandbox`、`rel` 等安全属性 |
| 自闭合标签 | Self-closing Tag   | 无需闭合的标签如 `<img />`  |
| 语义标签   | Semantic Tag       | 有意义的 HTML 标签          |
| 服务端渲染 | SSR                | 服务端生成 HTML             |
| 阴影       | Shadow             | box-shadow 阴影效果         |
| 共享链接   | Social Share       | 社交媒体分享按钮            |
| 软键盘     | Soft Keyboard      | 移动端虚拟键盘              |
| 空间       | Space              | 元素间距                    |
| 空间设计   | Spacing            | 内边距外边距设计            |
| 规范       | Specification      | HTML 标准文档               |
| 堆叠       | Stacking           | z-index 层叠顺序            |
| 结构化数据 | Structured Data    | Schema.org 结构化标记       |
| 样式表     | Stylesheet         | CSS 样式文件链接            |
| 提交按钮   | Submit Button      | 表单提交控件                |
| SVG        | SVG                | 可缩放矢量图形              |
| SVG 动画   | SVG Animation      | SMIL 动画或 CSS 动画        |
| 系统字体   | System Font        | 操作系统原生字体            |
| 系统主题   | System Theme       | 跟随系统深浅色模式          |

## T

| 术语       | 英文               | 释义                        |
| ---------- | ------------------ | --------------------------- |
| 表格标题   | Table Caption      | `<caption>` 表格标题        |
| 目标       | Target             | `target` 属性指定打开位置   |
| 文本方向   | Text Direction     | `dir` 属性设置文本方向      |
| 节         | Section            | `<section>` 内容区块        |
| 选择器     | Selector           | CSS 选择器                  |
| 语义结构   | Semantic Structure | 页面语义化布局              |
| 顺序焦点   | Tab Order          | Tab 键导航顺序              |
| 制表符     | Tab                | `\t` 或制表符字符           |
| 模板       | Template           | `<template>` 模板元素       |
| 主题       | Theme              | 界面颜色风格                |
| 主题色     | Theme Color        | `<meta name="theme-color">` |
| 节流       | Throttling         | 限制函数调用频率            |
| 时间表     | Timeline           | 时间线组件                  |
| 工具提示   | Tooltip            | 悬浮显示的提示信息          |
| 触摸目标   | Touch Target       | 可触摸点击的最小尺寸        |
| 触摸优化   | Touch-friendly     | 适配触摸操作                |
| 轨迹       | Track              | 视频字幕轨道                |
| 事务       | Transaction        | 数据库操作单位              |
| 树组件     | Tree Component     | 树形结构组件                |
| 树视图     | Tree View          | 可展开的层级列表            |
| 断点       | Breakpoint         | 响应式布局尺寸点            |
| 级联       | Cascade            | CSS 样式层叠规则            |
| 层叠上下文 | Stacking Context   | z-index 层叠上下文          |
| 信任       | Trust              | 网站可信度                  |

## U

| 术语           | 英文                 | 释义             |
| -------------- | -------------------- | ---------------- |
| 统一资源定位符 | URL                  | 资源的网络地址   |
| 无障碍使用     | Usable               | 可用的           |
| 用户体验       | UX / User Experience | 用户使用体验     |
| 用户界面       | UI                   | 界面交互设计     |
| 用户代理       | User Agent           | 浏览器标识字符串 |

## V

| 术语     | 英文            | 释义               |
| -------- | --------------- | ------------------ |
| 验证     | Validation      | 检查 HTML 语法     |
| 验证器   | Validator       | HTML 验证工具      |
| 视频格式 | Video Format    | MP4、WebM、OGG 等  |
| 视图     | View            | 页面视图           |
| 视口     | Viewport        | 可视区域           |
| 可视区域 | Visual Area     | 用户可见的页面区域 |
| 可视内容 | Visible Content | 用户可见的内容     |
| 可视化   | Visualization   | 数据可视化         |

## W

| 术语           | 英文           | 释义                  |
| -------------- | -------------- | --------------------- |
| Web Components | Web Components | 原生组件化标准        |
| Webhook        | Webhook        | HTTP 回调通知         |
| WebP           | WebP           | Google 开发的图片格式 |
| 小部件         | Widget         | 界面组件              |
| Wiki           | Wiki           | 协作编辑文档          |
| 窗口小部件     | Gadget         | 侧边栏小工具          |

## X

| 术语  | 英文  | 释义               |
| ----- | ----- | ------------------ |
| XHTML | XHTML | HTML 的 XML 序列化 |
| XML   | XML   | 可扩展标记语言     |
| XSLT  | XSLT  | XML 样式表转换     |

## Y

| 术语         | 英文          | 释义              |
| ------------ | ------------- | ----------------- |
| YouTube 嵌入 | YouTube Embed | 嵌入 YouTube 视频 |

## Z

| 术语   | 英文        | 释义                  |
| ------ | ----------- | --------------------- |
| 压缩   | Compression | GZIP、Brotli 资源压缩 |
| 零状态 | Zero State  | 无数据时的初始状态    |
