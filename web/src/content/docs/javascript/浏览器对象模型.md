---
order: 61
title: BOM
module: javascript
category: JavaScript
difficulty: intermediate
description: 浏览器对象模型（BOM）原理、API 体系、工程实践与规范演进
author: fanquanpp
updated: '2026-07-20'
related:
  - 'javascript/函数-作用域与闭包'
  - javascript/自定义Error
  - javascript/网络请求API
  - javascript/Web存储API
  - javascript/事件循环
prerequisites:
  - javascript/语法速查
tags:
  - BOM
  - window
  - location
  - navigator
  - history
  - WHATWG
  - HTML-Living-Standard
learningObjectives:
  - '复述 BOM 的概念边界与历史成因，区分 BOM 与 DOM 的关系'
  - '解释 window 对象的三重身份（全局对象、窗口代理、浏览器环境宿主）'
  - '使用 location、navigator、history、screen 等 API 解决实际工程问题'
  - '拆解 postMessage 与 structured clone 算法在跨上下文通信中的执行流程'
  - '评估不同窗口通信方案的适用场景与安全风险，选择最优策略'
  - '设计一个生产级 SPA 路由与窗口管理体系，集成 history、postMessage 与权限控制'
exercises:
  - type: fill-blank
    bloom: remember
    question: "BOM 的核心对象是 ______，它既是 ECMAScript 全局对象，也代表浏览器窗口。"
    answer: "window"
  - type: choice
    bloom: understand
    question: "下列哪个方法不会触发 popstate 事件？"
    options:
      - "A. history.back()"
      - "B. history.pushState()"
      - "C. 用户点击浏览器后退按钮"
      - "D. history.go(-1)"
    answer: "B"
    explanation: "pushState 与 replaceState 不会触发 popstate，仅在前进/后退或 hash 变化时触发。"
  - type: code-fix
    bloom: analyze
    question: |
      以下代码尝试从剪贴板读取文本，但在某些浏览器中抛出 TypeError。请修复：
      ```javascript
      async function readClipboard() {
        const text = navigator.clipboard.readText();
        return text;
      }
      ```
    answer: |
      ```javascript
      async function readClipboard() {
        // readText 是异步方法，需 await；并需检查权限与协议（HTTPS）
        if (!navigator.clipboard || !navigator.clipboard.readText) {
          throw new Error('Clipboard API 不可用');
        }
        const text = await navigator.clipboard.readText();
        return text;
      }
      ```
  - type: open-ended
    bloom: create
    question: "请设计一个支持多标签页状态同步的 SPA 架构，要求使用 BroadcastChannel 与 localStorage 双通道，并说明降级方案。"
    answer: "应包括：主通道 BroadcastChannel（同源广播）、降级通道 storage 事件（兼容旧浏览器）、协议设计（消息类型 + 时间戳 + 来源 ID + 负载）、防回环（忽略自身消息）、错误处理与重连。"
references:
  - author: [WHATWG]
    title: "HTML Living Standard"
    journal: "Web Hypertext Application Technology Working Group"
    year: 2026
    url: "https://html.spec.whatwg.org/"
  - author: [ECMA International]
    title: "ECMAScript 2026 Language Specification"
    journal: "ECMA-262, 17th Edition"
    year: 2026
    url: "https://tc39.es/ecma262/"
  - author: [Mozilla Developer Network]
    title: "Browser Object Model (BOM) Reference"
    journal: "MDN Web Docs"
    year: 2026
    url: "https://developer.mozilla.org/en-US/docs/Web/API/Window"
  - author: [W3C]
    title: "Web Storage (Second Edition)"
    journal: "W3C Recommendation"
    year: 2016
    url: "https://www.w3.org/TR/webstorage/"
  - author: [WHATWG]
    title: "Cross-document messaging"
    journal: "HTML Living Standard"
    year: 2026
    url: "https://html.spec.whatwg.org/multipage/web-messaging.html"
etymology:
  term: "Browser Object Model"
  origin: "1995 年 Netscape Navigator 2.0 引入 window、document、location 等对象，但 BOM 在很长时期内未进入任何标准。直至 HTML5 才将这些事实 API 纳入 WHATWG HTML 规范。"
lastReviewed: '2026-07-20'
reviewer: FANDEX Content Engineering Team
---

# 浏览器对象模型（BOM）

## 0. 导言

浏览器对象模型（Browser Object Model，简称 BOM）是 JavaScript 与浏览器宿主环境交互的核心 API 集合。它定义了 `window`、`location`、`navigator`、`history`、`screen` 等全局对象，让脚本能够查询与控制浏览器窗口、导航历史、设备能力、剪贴板、地理位置、通知等运行时上下文。

BOM 与 DOM（Document Object Model）是 Web 平台 API 的两大支柱：

- **DOM** 描述文档结构（HTML/XML 节点树），由 DOM Living Standard 规范定义。
- **BOM** 描述浏览器环境与窗口本身，由 HTML Living Standard 中的若干章节定义。

> **关键认知**：在 WHATWG HTML 规范统一之前，BOM 长期处于"事实标准"状态，由 Netscape 与 IE 各自实现。HTML5 之后，BOM 才被纳入正式规范体系。

---

## 1. 学习目标与认知地图

完成本章后，学习者应能够：

1. **复述**（remember）BOM 的概念边界与历史成因，区分 BOM 与 DOM 的关系。
2. **解释**（understand）`window` 对象的三重身份：ECMAScript 全局对象、窗口代理、浏览器环境宿主。
3. **应用**（apply）`location`、`navigator`、`history`、`screen`、`postMessage` 等 API 解决实际工程问题。
4. **分析**（analyze）postMessage 与结构化克隆算法在跨上下文通信中的执行流程。
5. **评估**（evaluate）不同窗口通信与导航方案的适用场景与安全风险，选择最优策略。
6. **设计**（create）一个生产级 SPA 路由与窗口管理体系，集成 history、postMessage 与权限控制。

---

## 2. 历史动机与技术演进

### 2.1 早期浏览器大战（1995-2000）

| 时间 | 事件 | 影响 |
| --- | --- | --- |
| 1995-05 | Brendan Eich 在 Netscape 用 10 天实现 Mocha（后改名 JavaScript） | 内置 `window` 作为全局对象 |
| 1995-12 | Netscape Navigator 2.0 发布 | 引入 `window`、`document`、`location`、`history` |
| 1996-08 | IE 3.0 推出 JScript 与 `window` 兼容实现 | 出现 JScript 与 JavaScript 分叉 |
| 1997-06 | ECMA-262 1st Edition 发布 | 标准化语言核心，但不涉及 `window` |
| 2000-01 | IE 5.5 引入 `XMLHttpRequest` 与 `innerHTML` | AJAX 雏形 |
| 2006-12 | W3C 发布 HTML5 草案 | 开始将 BOM 纳入标准 |

### 2.2 HTML5 的统一使命

在 HTML5 之前，BOM 没有正式规范文档。开发者依赖厂商文档（如 MSDN、Mozilla Wiki）与 Eric Meyer、Peter-Paul Koch 等社区专家的整理。HTML5 的核心目标之一就是"将浏览器实际行为规范化"，包括：

- `window` 接口
- `Location` 接口
- `Navigator` 接口（含 `onLine`、`userAgent`、`language`）
- `History` 接口（含 `pushState`、`replaceState`）
- `postMessage` 跨文档通信
- `setTimeout`、`setInterval` 定时器
- `requestAnimationFrame` 帧调度

### 2.3 WHATWG 接管（2019-至今）

2019 年 W3C 与 WHATWG 签署谅解备忘录，HTML 与 DOM 规范由 WHATWG 独家维护，W3C 不再发布竞争版本。这意味着 BOM 的所有规范内容现在统一位于 HTML Living Standard 中。

> **学术溯源**：浏览器对象模型的概念可追溯至 Netscape 工程师在 1995 年至 1996 年间发表的设计文档。原始规范未以学术论文形式发表，但其设计思路被收录在 David Flanagan 所著《JavaScript: The Definitive Guide》（O'Reilly，1996 年第 1 版）中。

---

## 3. 形式化定义

### 3.1 window 的三重身份

`window` 是 ECMAScript 全局环境记录（Global Environment Record）中的全局对象，同时是浏览器窗口的代理对象。形式化地：

```
Window : GlobalEnvironmentRecord × WindowProxy × WindowContext
```

其中：

- **GlobalEnvironmentRecord**：ECMAScript 规范定义的全局环境，承载全局变量与全局函数声明。
- **WindowProxy**：每个浏览上下文（browsing context）对应一个 WindowProxy，其 `[[Window]]` 内部槽指向当前文档的 Window 对象。当文档被替换（导航）时，WindowProxy 的内部槽更新为新 Window，但 `window` 引用保持稳定。
- **WindowContext**：浏览器窗口或标签页的运行时上下文。

### 3.2 浏览上下文（Browsing Context）

浏览上下文是浏览器呈现文档的环境，形式化定义为：

$$
\text{BC} = \langle \text{WindowProxy}, \text{Document}, \text{SessionHistory}, \text{Origin} \rangle
$$

其中 $\text{Origin}$ 由三元组定义：

$$
\text{Origin} = (\text{scheme}, \text{host}, \text{port})
$$

同源策略（Same-Origin Policy）要求两个 Origin 三元组完全相等时才视为同源。

### 3.3 任务源与事件循环

BOM 中的所有异步 API（定时器、消息事件、剪贴板、地理定位等）最终都通过事件循环调度。事件循环的核心可形式化为：

$$
\text{EventLoop}(\text{BC}) = \text{while true} \begin{cases}
\text{task} \leftarrow \text{dequeue}(\text{taskQueue}) \\
\text{execute}(\text{task}) \\
\text{drain}(\text{microtaskQueue}) \\
\text{if renderingOpportunity}: \text{render}(\text{BC})
\end{cases}
$$

事件循环的详细模型请参阅本系列《事件循环》章节，本节仅展示 BOM API 与事件循环的接口关系。

---

## 4. window 对象体系

### 4.1 窗口尺寸与视口

```javascript
// 视口（viewport）相关尺寸
console.log(window.innerWidth);   // 视口宽度（含滚动条，单位像素）
console.log(window.innerHeight);  // 视口高度
console.log(window.outerWidth);   // 整个浏览器窗口外尺寸
console.log(window.outerHeight);  // 整个浏览器窗口外尺寸
console.log(window.devicePixelRatio); // CSS 像素与物理像素之比

// 文档元素尺寸（与视口互补）
const docEl = document.documentElement;
console.log(docEl.clientWidth);   // 视口宽度（不含滚动条）
console.log(docEl.clientHeight);  // 视口高度（不含滚动条）
```

CSS 像素与物理像素的关系：

$$
\text{physicalPx} = \text{cssPx} \times \text{devicePixelRatio}
$$

在 Retina 屏幕上 `devicePixelRatio` 通常为 2，在 4K 屏幕可能为 1.5 或 3。

### 4.2 滚动控制

```javascript
// 平滑滚动到顶部
window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });

// 相对滚动
window.scrollBy({ top: 100, behavior: 'smooth' });

// 让元素滚动到视口
document.querySelector('#target').scrollIntoView({
  behavior: 'smooth',
  block: 'center',
  inline: 'nearest',
});

// 读取滚动位置（兼容性写法）
const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
const scrollY = window.pageYOffset || document.documentElement.scrollTop;
```

### 4.3 定时器与帧调度

```javascript
// setTimeout：单次延迟回调
const timerId = setTimeout(() => {
  console.log('1 秒后执行');
}, 1000);

// setInterval：周期回调（存在漂移问题）
const intervalId = setInterval(() => {
  console.log('每 1 秒触发');
}, 1000);

// 清理
clearTimeout(timerId);
clearInterval(intervalId);

// requestAnimationFrame：跟随屏幕刷新率（通常 60Hz）
function animate(timeStamp) {
  // timeStamp 是 DOMHighResTimeStamp，表示页面加载后的毫秒数
  element.style.transform = `translateX(${(timeStamp / 10) % 300}px)`;
  requestAnimationFrame(animate);
}
const rafId = requestAnimationFrame(animate);
cancelAnimationFrame(rafId);
```

#### setInterval 的累积漂移

`setInterval` 在每次回调执行时间超过间隔时会出现漂移：

$$
\Delta t_{\text{actual}} = \max(\Delta t_{\text{scheduled}}, t_{\text{callback}})
$$

生产环境推荐使用递归 `setTimeout` 替代 `setInterval`：

```javascript
// 递归 setTimeout，确保精确间隔
function scheduleInterval(callback, interval) {
  let expected = performance.now() + interval;
  const step = () => {
    const drift = performance.now() - expected;
    callback(drift);
    expected += interval;
    setTimeout(step, Math.max(0, interval - drift));
  };
  setTimeout(step, interval);
}
```

### 4.4 全局错误处理

```javascript
// 捕获同步错误与未处理的 Promise rejection
window.addEventListener('error', (event) => {
  console.error('全局错误：', event.message, event.filename, event.lineno);
  // 上报到监控系统
  navigator.sendBeacon('/api/log', JSON.stringify({
    type: 'error',
    message: event.message,
    stack: event.error?.stack,
    url: location.href,
  }));
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('未处理的 Promise 拒绝：', event.reason);
  event.preventDefault(); // 阻止控制台输出
});
```

---

## 5. location 对象

### 5.1 URL 解析模型

`location` 对象实现 `Location` 接口，将 URL 解析为结构化属性：

```
https://user:pass@example.com:8080/path/page?q=test&r=1#section
└─┬─┘ └──┬───┘ └────┬────┘ └┬┘ └──┬───┘ └─┬─────┘ └─┬───┘
scheme  userinfo     host   port  path    query    hash
```

```javascript
// 解析当前 URL
console.log(location.href);      // 完整 URL
console.log(location.origin);    // https://example.com:8080
console.log(location.protocol);  // https:
console.log(location.host);      // example.com:8080
console.log(location.hostname);  // example.com
console.log(location.port);      // 8080
console.log(location.pathname);  // /path/page
console.log(location.search);    // ?q=test&r=1
console.log(location.hash);      // #section
```

### 5.2 URLSearchParams

```javascript
// 现代 URL 参数处理
const params = new URLSearchParams(location.search);
console.log(params.get('q'));      // 'test'
console.log(params.getAll('r'));   // ['1']
console.log(params.has('q'));      // true
params.append('page', '2');
params.delete('r');
console.log(params.toString());    // q=test&page=2

// 可迭代的查询参数遍历
for (const [key, value] of params) {
  console.log(`${key} = ${value}`);
}
```

### 5.3 导航方法

```javascript
// assign：导航到新 URL，保留历史记录
location.assign('https://example.com/new');

// replace：替换当前历史记录项，无法后退
location.replace('https://example.com/no-back');

// reload：重新加载
location.reload();        // 可能使用缓存
location.reload(true);    // 强制从服务器重新加载（已废弃，改用 Cache-Control）

// 修改属性触发导航
location.href = 'https://example.com';
location.pathname = '/other';
location.search = '?x=1';
location.hash = '#chapter2';  // 仅修改 hash 不触发整页刷新，触发 hashchange
```

### 5.4 hashchange 与 popstate 事件

```javascript
// hashchange：URL hash 变化时触发
window.addEventListener('hashchange', (event) => {
  console.log('旧 hash：', event.oldURL);
  console.log('新 hash：', event.newURL);
});

// popstate：history 状态变化时触发（用户点击后退/前进或调用 go/back/forward）
window.addEventListener('popstate', (event) => {
  console.log('状态：', event.state);
});
```

---

## 6. navigator 对象

### 6.1 浏览器与设备信息

```javascript
// 浏览器标识（注意：userAgent 可被伪造，勿用于关键判断）
console.log(navigator.userAgent);
console.log(navigator.language);        // 主语言，如 'zh-CN'
console.log(navigator.languages);       // 语言偏好数组
console.log(navigator.platform);        // 平台（已废弃）
console.log(navigator.hardwareConcurrency); // 逻辑 CPU 核心数
console.log(navigator.deviceMemory);    // 设备内存（GB，近似值）
console.log(navigator.maxTouchPoints);  // 最大同时触摸点数

// 在线状态
console.log(navigator.onLine);
window.addEventListener('online', () => console.log('已联网'));
window.addEventListener('offline', () => console.log('已离线'));

// Cookie 支持
console.log(navigator.cookieEnabled);
```

### 6.2 用户代理字符串解析

`userAgent` 字符串历史上经过多次膨胀，包含浏览器、引擎、操作系统、版本等多重信息：

```
Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36
└─Mozilla─┘ └──────────OS──────────────────┘ └──────Engine──────────────────┘ └────────Browser─────────────────┘
```

| 前缀 | 历史含义 | 现代含义 |
| --- | --- | --- |
| `Mozilla/5.0` | 兼容 Mozilla | 几乎所有浏览器都加，无实际信息 |
| `AppleWebKit` | 渲染引擎 | Blink 系浏览器仍保留 |
| `KHTML` | Konqueror 引擎祖先 | 历史兼容 |
| `Chrome/126` | 主浏览器版本 | 主要识别字段 |
| `Safari/537.36` | 兼容标记 | Chrome 也带 |

> **工程警示**：基于 `userAgent` 的特性检测应仅用于诊断与统计，不可用于功能开关。功能检测应使用对象特征：

```javascript
// 错误：基于 UA 判断
if (navigator.userAgent.includes('Chrome')) { /* 启用特性 */ }

// 正确：基于能力判断
if ('serviceWorker' in navigator) { /* 启用 PWA */ }
if ('IntersectionObserver' in window) { /* 启用懒加载 */ }
```

### 6.3 剪贴板 API

```javascript
// 写入剪贴板（推荐 Clipboard API）
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    console.log('已复制');
  } catch (err) {
    // 降级到 execCommand（已废弃但仍广泛支持）
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

// 读取剪贴板（需用户激活与权限）
async function pasteText() {
  try {
    const text = await navigator.clipboard.readText();
    return text;
  } catch (err) {
    throw new Error('剪贴板读取被拒绝或 API 不可用');
  }
}

// 写入富内容（图片、HTML）
try {
  const blob = new Blob(['Hello'], { type: 'text/plain' });
  await navigator.clipboard.write([
    new ClipboardItem({ 'text/plain': blob }),
  ]);
} catch (err) {
  console.error('不支持 ClipboardItem：', err);
}
```

### 6.4 地理定位

```javascript
// 单次定位
navigator.geolocation.getCurrentPosition(
  (position) => {
    console.log('纬度：', position.coords.latitude);
    console.log('经度：', position.coords.longitude);
    console.log('精度：', position.coords.accuracy, '米');
    console.log('海拔：', position.coords.altitude);
    console.log('时间戳：', new Date(position.timestamp).toISOString());
  },
  (error) => {
    switch (error.code) {
      case error.PERMISSION_DENIED: console.error('用户拒绝'); break;
      case error.POSITION_UNAVAILABLE: console.error('定位不可用'); break;
      case error.TIMEOUT: console.error('超时'); break;
    }
  },
  { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
);

// 持续监听
const watchId = navigator.geolocation.watchPosition(
  (pos) => console.log('位置更新：', pos.coords),
  (err) => console.error(err)
);
navigator.geolocation.clearWatch(watchId);
```

### 6.5 通知 API

```javascript
async function notify(title, options) {
  // 检查支持
  if (!('Notification' in window)) {
    throw new Error('当前浏览器不支持通知');
  }
  // 请求权限
  let permission = Notification.permission;
  if (permission === 'default') {
    permission = await Notification.requestPermission();
  }
  if (permission !== 'granted') {
    throw new Error('通知权限被拒绝');
  }
  // 发送通知
  const notification = new Notification(title, {
    body: options.body,
    icon: '/icon.png',
    badge: '/badge.png',
    tag: options.tag, // 同 tag 通知会替换
    data: options.data,
    requireInteraction: false, // 是否需用户手动关闭
  });
  notification.onclick = (event) => {
    event.target.close();
    window.focus();
  };
  return notification;
}
```

### 6.6 ServiceWorker 与 PWA

```javascript
// 注册 Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none',
      });
      console.log('SW 注册成功，scope：', reg.scope);
    } catch (err) {
      console.error('SW 注册失败：', err);
    }
  });
}

// 监听控制权变更
navigator.serviceWorker.addEventListener('controllerchange', () => {
  console.log('新的 Service Worker 已接管');
});
```

---

## 7. history 对象

### 7.1 会话历史栈

`history` 维护当前浏览上下文的会话历史（session history），是一个文档状态的栈结构：

```
[doc0] -> [doc1] -> [doc2] (current)
                <- [doc3] (pushState)
```

```javascript
console.log(history.length);  // 会话历史长度
console.log(history.state);   // 当前状态对象

// 导航
history.back();      // 后退一步
history.forward();   // 前进一步
history.go(-2);      // 后退两步
history.go(0);       // 刷新当前页
```

### 7.2 SPA 路由：pushState 与 replaceState

```javascript
// pushState：添加新历史项（不触发整页加载）
history.pushState(
  { page: 1, filter: 'all' },  // 状态对象（需可结构化克隆，<6MB）
  '',                          // title（已废弃，传空字符串）
  '/page/1'                    // URL（同源）
);

// replaceState：替换当前历史项
history.replaceState({ page: 1 }, '', '/page/1?tab=overview');

// 监听前进/后退
window.addEventListener('popstate', (event) => {
  console.log('用户导航到状态：', event.state);
  renderPage(event.state);
});
```

### 7.3 路由实现：HashRouter vs BrowserRouter

| 维度 | HashRouter | BrowserRouter |
| --- | --- | --- |
| URL 形式 | `/#/path` | `/path` |
| 服务端配置 | 无需 | 需回退到 index.html |
| SEO | 不友好 | 友好 |
| 兼容性 | IE8+ | IE10+ |
| 推送状态 | 通过 `location.hash` | 通过 `history.pushState` |
| popstate | 触发 | 触发 |
| hashchange | 触发 | 不触发 |

```javascript
// 简易 BrowserRouter 实现
class BrowserRouter {
  constructor() {
    this.routes = new Map();
    window.addEventListener('popstate', this.handlePop.bind(this));
  }

  register(path, handler) {
    this.routes.set(path, handler);
  }

  push(path, state = {}) {
    history.pushState(state, '', path);
    this.handlePop({ state });
  }

  replace(path, state = {}) {
    history.replaceState(state, '', path);
    this.handlePop({ state });
  }

  handlePop(event) {
    const path = location.pathname;
    const handler = this.routes.get(path) || this.routes.get('*');
    if (handler) handler(event.state || {});
  }
}
```

### 7.4 Scroll Restoration

```javascript
// 历史导航时的滚动恢复策略
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual'; // 或 'auto'
}

// 手动恢复滚动位置
window.addEventListener('popstate', (event) => {
  const savedScroll = event.state?.scrollY || 0;
  requestAnimationFrame(() => window.scrollTo(0, savedScroll));
});
```

---

## 8. screen 对象

```javascript
// 屏幕物理信息
console.log(screen.width);        // 屏幕宽度
console.log(screen.height);       // 屏幕高度
console.log(screen.availWidth);   // 可用宽度（去掉任务栏）
console.log(screen.availHeight);  // 可用高度
console.log(screen.colorDepth);   // 色深（位/像素）
console.log(screen.pixelDepth);   // 像素深度

// 窗口位置（屏幕坐标）
console.log(screenX);  // 窗口左上角 X
console.log(screenY);  // 窗口左上角 Y

// 多显示器信息（Window Management API，实验性）
if ('getScreenDetails' in window) {
  const screenDetails = await window.getScreenDetails();
  screenDetails.screens.forEach((screen, i) => {
    console.log(`屏幕 ${i}：${screen.width}x${screen.height}`);
  });
}
```

---

## 9. 跨文档通信

### 9.1 postMessage 协议

`postMessage` 是不同浏览上下文（不同窗口、iframe、Worker）之间安全通信的标准 API：

```javascript
// 发送方
const popup = window.open('https://child.example.com');
popup.postMessage(
  { type: 'GREETING', payload: 'hello' },
  'https://child.example.com'  // targetOrigin，必须指定
);

// 接收方
window.addEventListener('message', (event) => {
  // 三步校验
  if (event.origin !== 'https://parent.example.com') return;
  if (event.source !== window.opener) return;
  if (!event.data || typeof event.data !== 'object') return;

  console.log('收到：', event.data);
  // 回复
  event.source.postMessage(
    { type: 'ACK', payload: 'received' },
    event.origin
  );
});
```

#### 消息协议设计原则

1. **始终指定 `targetOrigin`**：避免消息泄露给恶意页面。
2. **校验 `event.origin` 与 `event.source`**：双向验证身份。
3. **使用结构化协议**：消息体含 `type`、`id`、`payload`、`timestamp`。
4. **避免 `'*'` 通配符**：仅用于无敏感数据的场景。

### 9.2 结构化克隆算法

`postMessage` 传递的数据经过结构化克隆（Structured Clone Algorithm），支持：

| 类型 | 是否可克隆 |
| --- | --- |
| 基本类型（string/number/boolean/null/undefined） | 是 |
| 普通对象、数组 | 是 |
| Date、RegExp、Blob、File | 是 |
| Map、Set、TypedArray、ArrayBuffer | 是 |
| Error（仅 message/name/cause） | 是 |
| 循环引用 | 是 |
| 函数 | 否（抛出 DataCloneError） |
| DOM 节点 | 否 |
| Symbol 属性 | 丢失 |
| 属性描述符、getter/setter | 丢失 |
| 原型链 | 重置为 Object.prototype |

```javascript
// 演示结构化克隆
const obj = {
  date: new Date(),
  map: new Map([['a', 1]]),
  set: new Set([1, 2, 3]),
  buffer: new ArrayBuffer(8),
  self: null,  // 将被设为循环引用
};
obj.self = obj;

const cloned = structuredClone(obj);
console.log(cloned.date instanceof Date);  // true
console.log(cloned.map.get('a'));           // 1
console.log(cloned.self === cloned);        // true（循环引用保持）

// Transferable 对象：转移所有权（原对象失效）
const buffer = new ArrayBuffer(1024);
const cloned2 = structuredClone(buffer, [buffer]);
console.log(buffer.byteLength);  // 0（已转移）
```

### 9.3 BroadcastChannel

同源多标签页通信的首选 API：

```javascript
// 多标签页同步
const channel = new BroadcastChannel('app-sync');

// 标签页 A 发送
channel.postMessage({ type: 'LOGOUT', userId: 42 });

// 标签页 B 接收
channel.onmessage = (event) => {
  if (event.data.type === 'LOGOUT') {
    clearUserData(event.data.userId);
  }
};

// 关闭
channel.close();
```

### 9.4 通信方案对比

| 方案 | 范围 | 同源要求 | 双向 | 数据大小 | 延迟 |
| --- | --- | --- | --- | --- | --- |
| `postMessage` | 跨窗口/iframe/Worker | 否（需校验 origin） | 是 | 受结构化克隆限制 | 微秒级 |
| `BroadcastChannel` | 同源多上下文 | 是 | 是 | 同上 | 微秒级 |
| `storage` 事件 | 同源多标签 | 是 | 否（广播） | 5-10MB | 微秒级 |
| `SharedWorker` | 同源多标签 | 是 | 是 | 任意 | 微秒级 |
| `WebSocket` | 任意 | 否 | 是 | 任意 | 毫秒级 |

---

## 10. 常见陷阱与修复

### 10.1 popstate 不触发的场景

```javascript
// 错误：期望 pushState 触发 popstate
history.pushState({ page: 1 }, '', '/page/1');
window.addEventListener('popstate', () => {
  // 不会因 pushState 触发
  console.log('called?');
});

// 修复：手动触发渲染逻辑
function navigate(path, state) {
  history.pushState(state, '', path);
  renderRoute(state);  // 显式调用
}
```

### 10.2 setTimeout 最小延迟

浏览器对嵌套超过 5 层的 `setTimeout` 强制将延迟提升到至少 4ms（HTML 规范）：

```javascript
// 嵌套 setTimeout 实际延迟会逐渐增加
function nestedTimeout(depth) {
  if (depth > 10) return;
  const start = performance.now();
  setTimeout(() => {
    console.log(`depth=${depth}, delay=${performance.now() - start}ms`);
    nestedTimeout(depth + 1);
  }, 0);
}
nestedTimeout(0);
// 输出：前 5 次约 0-1ms，之后约 4ms+
```

### 10.3 后台标签页节流

后台标签页的定时器会被节流到 1Hz 甚至更慢，以节省电量：

```javascript
// 节流策略
// 前台：1ms
// 后台可见：1000ms
// 后台隐藏（部分浏览器）：1分钟以上

// 修复：使用 Page Visibility API 配合时间戳
let lastTime = performance.now();
function tick() {
  const now = performance.now();
  const delta = now - lastTime;
  lastTime = now;
  update(delta);  // 基于 delta 更新而非固定间隔
}
setInterval(tick, 16);

// 监听可见性
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    // 重新同步状态
    resync();
  }
});
```

### 10.4 剪贴板 API 权限与协议

```javascript
// 错误：在 HTTP 或非用户激活上下文中调用
navigator.clipboard.readText();  // TypeError 或 NotAllowedError

// 修复：检查环境与权限
async function safeReadClipboard() {
  if (!window.isSecureContext) {
    throw new Error('Clipboard API 仅在安全上下文（HTTPS/localhost）可用');
  }
  if (!navigator.clipboard?.readText) {
    throw new Error('当前浏览器不支持 Clipboard API');
  }
  // 必须在用户激活事件中调用
  if (navigator.userActivation?.isActive === false) {
    throw new Error('需要用户激活');
  }
  return await navigator.clipboard.readText();
}
```

### 10.5 跨域 postMessage 信息泄露

```javascript
// 错误：使用 '*' 作为 targetOrigin
popup.postMessage({ token: 'secret' }, '*');

// 修复：明确指定接收方 origin
popup.postMessage({ token: 'secret' }, 'https://trusted.example.com');

// 接收方也必须校验
window.addEventListener('message', (event) => {
  if (event.origin !== 'https://trusted.parent.com') return;
  if (typeof event.data !== 'object' || event.data === null) return;
  // 处理消息
});
```

### 10.6 pushState 状态序列化失败

```javascript
// 错误：状态包含函数
history.pushState({
  page: 1,
  callback: () => console.log('hi'),  // 函数无法克隆
}, '', '/page/1');  // DataCloneError

// 修复：仅存储可序列化数据
history.pushState({
  page: 1,
  filter: 'all',
  timestamp: Date.now(),
}, '', '/page/1');

// 函数通过路由表查找
const routeHandlers = {
  '/page/1': () => renderPage1(),
  '/page/2': () => renderPage2(),
};
```

### 10.7 navigator.geolocation 在非 HTTPS 不可用

```javascript
// 错误：在 HTTP 环境调用
navigator.geolocation.getCurrentPosition(/* ... */);  // PERMISSION_DENIED

// 修复：降级处理
if (!window.isSecureContext) {
  console.warn('地理定位需要 HTTPS 环境');
  // 降级到 IP 地理定位
  const ipLocation = await fetch('/api/ip-geo').then(r => r.json());
  return ipLocation;
}
```

### 10.8 内存泄漏：未清理的定时器

```javascript
// 错误：组件销毁后定时器仍运行
class Component {
  constructor() {
    this.timer = setInterval(() => this.update(), 1000);
  }
  // 缺少 destroy 方法
}

// 修复：显式清理
class Component {
  constructor() {
    this.timer = setInterval(() => this.update(), 1000);
    this.rafId = requestAnimationFrame(this.animate.bind(this));
    this.channel = new BroadcastChannel('sync');
  }

  destroy() {
    clearInterval(this.timer);
    cancelAnimationFrame(this.rafId);
    this.channel.close();
    // 移除所有事件监听
    window.removeEventListener('resize', this.onResize);
  }
}
```

---

## 11. 工程实践

### 11.1 路由系统架构

生产级 SPA 路由应包含：

```javascript
class Router {
  constructor() {
    this.routes = [];
    this.middleware = [];
    this.scrollPositions = new Map();
    history.scrollRestoration = 'manual';

    window.addEventListener('popstate', this.onPopState.bind(this));
    window.addEventListener('beforeunload', this.onBeforeUnload.bind(this));
  }

  // 注册路由
  add(pattern, handler) {
    this.routes.push({
      pattern: new RegExp(`^${pattern.replace(/:\w+/g, '([^/]+)')}$`),
      paramNames: (pattern.match(/:\w+/g) || []).map(s => s.slice(1)),
      handler,
    });
  }

  use(middleware) {
    this.middleware.push(middleware);
  }

  // 导航
  async push(path, state = {}) {
    // 保存当前滚动位置
    this.scrollPositions.set(location.pathname, window.scrollY);

    history.pushState(state, '', path);
    await this.handleRoute(state);
  }

  replace(path, state = {}) {
    history.replaceState(state, '', path);
    await this.handleRoute(state);
  }

  async onPopState(event) {
    await this.handleRoute(event.state || {});
    // 恢复滚动位置
    const saved = this.scrollPositions.get(location.pathname) || 0;
    requestAnimationFrame(() => window.scrollTo(0, saved));
  }

  async handleRoute(state) {
    const path = location.pathname;
    const route = this.match(path);
    if (!route) {
      console.error('404:', path);
      return;
    }

    // 执行中间件（鉴权、日志、埋点）
    const ctx = { path, params: route.params, state };
    for (const mw of this.middleware) {
      const result = await mw(ctx);
      if (result === false) return;  // 中断
    }

    await route.handler(ctx);
  }

  match(path) {
    for (const route of this.routes) {
      const match = route.pattern.exec(path);
      if (match) {
        const params = {};
        route.paramNames.forEach((name, i) => {
          params[name] = decodeURIComponent(match[i + 1]);
        });
        return { params, handler: route.handler };
      }
    }
    return null;
  }

  onBeforeUnload(event) {
    if (this.hasUnsavedChanges) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}
```

### 11.2 性能监控

```javascript
// PerformanceObserver 监控 BOM API 耗时
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.log(`${entry.name}: ${entry.duration}ms`);
  }
});
observer.observe({ entryTypes: ['measure', 'navigation', 'resource'] });

// 关键时间点
const timing = performance.getEntriesByType('navigation')[0];
console.log('DNS 解析：', timing.domainLookupEnd - timing.domainLookupStart);
console.log('TCP 建立：', timing.connectEnd - timing.connectStart);
console.log('请求耗时：', timing.responseEnd - timing.requestStart);
console.log('DOM 解析：', timing.domComplete - timing.domInteractive);
console.log('首屏渲染：', timing.domContentLoadedEventStart - timing.startTime);
```

### 11.3 跨标签状态同步

```javascript
class CrossTabState {
  constructor(channelName) {
    this.channel = new BroadcastChannel(channelName);
    this.channel.onmessage = this.onMessage.bind(this);
    this.state = new Map();
    this.listeners = new Set();

    // 降级：监听 storage 事件
    window.addEventListener('storage', (event) => {
      if (event.key === channelName) {
        const data = JSON.parse(event.newValue);
        this.applyChange(data, false);
      }
    });

    // 同步初始化
    this.broadcast({ type: 'SYNC_REQUEST' });
  }

  set(key, value) {
    this.state.set(key, value);
    this.broadcast({ type: 'SET', key, value, ts: Date.now() });
  }

  delete(key) {
    this.state.delete(key);
    this.broadcast({ type: 'DELETE', key, ts: Date.now() });
  }

  broadcast(message) {
    this.channel.postMessage(message);
    // 同时写入 localStorage 触发 storage 事件（降级通道）
    try {
      localStorage.setItem(this.channel.name, JSON.stringify(message));
    } catch (e) {}
  }

  onMessage(event) {
    this.applyChange(event.data, true);
  }

  applyChange(data, fromChannel) {
    switch (data.type) {
      case 'SET':
        this.state.set(data.key, data.value);
        break;
      case 'DELETE':
        this.state.delete(data.key);
        break;
      case 'SYNC_REQUEST':
        // 回复当前状态
        this.broadcast({ type: 'SYNC_RESPONSE', state: Array.from(this.state) });
        break;
      case 'SYNC_RESPONSE':
        if (fromChannel) {
          for (const [k, v] of data.state) this.state.set(k, v);
        }
        break;
    }
    this.listeners.forEach(fn => fn(this.state));
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
```

### 11.4 PWA 离线策略

```javascript
// service-worker.js
const CACHE_VERSION = 'v1';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic-${CACHE_VERSION}`;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      cache.addAll(['/', '/index.html', '/app.js', '/styles.css'])
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== DYNAMIC_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  // 网络优先，失败回退缓存
  if (request.method === 'GET') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
  }
});
```

### 11.5 安全配置

```javascript
// 检查安全上下文
function ensureSecureContext() {
  if (!window.isSecureContext) {
    throw new Error('此功能需要安全上下文（HTTPS 或 localhost）');
  }
}

// 检查权限
async function ensurePermission(name) {
  if (!navigator.permissions) return 'granted';
  const result = await navigator.permissions.query({ name });
  if (result.state === 'prompt') {
    // 触发权限请求
  }
  return result.state;
}

// CSP 配置（HTTP 头）
// Content-Security-Policy: default-src 'self';
//   script-src 'self' 'unsafe-inline';
//   connect-src 'self' https://api.example.com;
//   frame-ancestors 'none'

// 防止点击劫持
if (window.top !== window.self) {
  // 当前页被嵌入 iframe，可能是点击劫持
  if (!document.cookie.includes('embed-allowed')) {
    window.top.location = window.self.location;
  }
}
```

---

## 12. 案例研究

### 12.1 案例一：Gmail 的 SPA 路由

Gmail 是最早大规模使用 `history.pushState` 的生产应用之一。其架构要点：

1. **路由分片**：将不同视图（收件箱、星标、草稿）注册为路由处理器。
2. **状态预取**：在 `pushState` 之前预取数据，避免白屏。
3. **滚动恢复**：每个路由记录滚动位置，popstate 时恢复。
4. **URL 重写**：使用 `replaceState` 在数据加载完成后更新 URL（去除 loading 标记）。

```javascript
// 简化版 Gmail 路由策略
async function navigateToMail(mailId) {
  // 1. 立即更新 URL（带 loading 标记）
  history.pushState({ mailId, loading: true }, '', `/mail/${mailId}?loading=1`);
  renderLoading();

  try {
    // 2. 预取邮件数据
    const mail = await fetch(`/api/mail/${mailId}`).then(r => r.json());

    // 3. 渲染并更新 URL（去除 loading 标记）
    renderMail(mail);
    history.replaceState({ mailId, loading: false, mail }, '', `/mail/${mailId}`);
  } catch (err) {
    renderError(err);
    history.replaceState({ mailId, error: err.message }, '', `/mail/${mailId}?error=1`);
  }
}
```

### 12.2 案例二：Notion 的多标签协同

Notion 使用 BroadcastChannel + WebSocket 双通道实现多标签页实时同步：

- **BroadcastChannel**：处理同浏览器内多标签的即时同步（光标位置、编辑冲突）。
- **WebSocket**：处理跨设备同步。
- **冲突解决**：基于 CRDT（Conflict-free Replicated Data Type）算法。

```javascript
class NotionSync {
  constructor(docId) {
    this.docId = docId;
    this.localTab = new BroadcastChannel(`doc-${docId}`);
    this.localTab.onmessage = this.onLocalMessage.bind(this);

    this.ws = new WebSocket(`wss://api.notion.com/sync/${docId}`);
    this.ws.onmessage = this.onRemoteMessage.bind(this);

    this.localVersion = 0;
    this.pendingOps = [];
  }

  applyOp(op) {
    this.localVersion++;
    op.version = this.localVersion;
    op.tabId = this.tabId;

    // 本地立即应用
    this.applyLocally(op);

    // 广播到同浏览器其他标签
    this.localTab.postMessage(op);

    // 推送到服务器
    this.ws.send(JSON.stringify(op));
  }

  onLocalMessage(event) {
    // 来自同浏览器其他标签
    this.applyLocally(event.data);
  }

  onRemoteMessage(event) {
    // 来自其他设备
    const op = JSON.parse(event.data);
    this.applyLocally(op);
    // 转发给同浏览器其他标签
    this.localTab.postMessage({ ...op, forwarded: true });
  }
}
```

### 12.3 案例三：Google Docs 的协同编辑

Google Docs 使用 Operational Transformation（OT）算法，通过 `postMessage` 与 iframe 中的编辑器通信，通过 WebSocket 与服务端同步。其关键设计：

- 编辑器运行在 iframe 中（沙箱隔离）。
- 主窗口通过 `postMessage` 发送命令。
- 服务端通过 WebSocket 推送其他用户的操作。
- 客户端维护操作队列，按序应用。

---

## 13. 对比分析

### 13.1 BOM 与 DOM 对比

| 维度 | BOM | DOM |
| --- | --- | --- |
| 关注点 | 浏览器窗口与环境 | 文档结构与内容 |
| 根对象 | `window` | `document` |
| 规范 | HTML Living Standard | DOM Living Standard |
| 起源时间 | 1995 年 | 1998 年（DOM Level 1） |
| 跨平台 | 仅浏览器 | 浏览器 + XML 工具链 |
| API 数量 | ~50 个接口 | ~200 个接口 |
| 关键能力 | 窗口控制、导航、设备访问 | 节点操作、事件、样式 |

### 13.2 BOM 与 Node.js 全局对象对比

| API | 浏览器 BOM | Node.js |
| --- | --- | --- |
| 全局对象 | `window` / `globalThis` | `global` / `globalThis` |
| 定时器 | `setTimeout` / `setInterval` | 同（实现不同） |
| 微任务 | `queueMicrotask` | `process.nextTick` |
| 立即执行 | `setImmediate`（部分支持） | `setImmediate` |
| URL 解析 | `URL` 构造器 | `url` 模块 |
| 路径操作 | 无 | `path` 模块 |
| 文件系统 | 无（仅 File API） | `fs` 模块 |
| 网络请求 | `fetch` / `XMLHttpRequest` | `http` / `https` 模块 |

### 13.3 跨上下文通信方案对比

| 方案 | 优点 | 缺点 | 典型场景 |
| --- | --- | --- | --- |
| `postMessage` | 跨域、双向、即时 | 需手动校验 | iframe、popup |
| `BroadcastChannel` | 简单、广播 | 仅同源 | 多标签同步 |
| `SharedWorker` | 共享状态、长连接 | 兼容性、调试难 | 共享会话 |
| `storage` 事件 | 兼容性好 | 仅字符串、非即时 | 降级方案 |
| `WebSocket` | 跨域、双向、跨设备 | 需服务端 | 实时通信 |

---

## 14. 习题

### 14.1 填空题

1. （remember）BOM 的核心对象是 ______，它既是 ECMAScript 全局对象，也代表浏览器窗口。
2. （understand）`history.pushState` 的第三个参数是 ______，必须与当前页面同源。
3. （remember）`navigator.clipboard` API 仅在 ______ 上下文中可用。
4. （understand）结构化克隆算法无法克隆 ______ 类型的值（列举两种：函数、DOM 节点）。
5. （remember）`window.devicePixelRatio` 表示 ______ 与物理像素之比。

### 14.2 选择题

1. （understand）下列哪个方法不会触发 `popstate` 事件？
   - A. `history.back()`
   - B. `history.pushState()`
   - C. 用户点击浏览器后退按钮
   - D. `history.go(-1)`

   答案：B

2. （analyze）`setTimeout(fn, 0)` 在嵌套超过 5 层后实际延迟约为多少？
   - A. 0ms
   - B. 1ms
   - C. 4ms
   - D. 16ms

   答案：C

3. （understand）下列哪个 API 不需要用户激活即可调用？
   - A. `navigator.clipboard.readText()`
   - B. `Notification.requestPermission()`
   - C. `navigator.geolocation.getCurrentPosition()`
   - D. `history.pushState()`

   答案：D

4. （evaluate）在跨域 iframe 通信中，以下哪种 `targetOrigin` 配置最安全？
   - A. `'*'`
   - B. `location.origin`
   - C. 明确的接收方 origin（如 `'https://child.example.com'`）
   - D. 不传该参数

   答案：C

5. （remember）`BroadcastChannel` 的通信范围是？
   - A. 同源同浏览器多上下文
   - B. 跨域多窗口
   - C. 跨设备
   - D. 同一页面内

   答案：A

### 14.3 代码修复题

1. （analyze）以下代码尝试从剪贴板读取文本，但在某些浏览器中抛出 `TypeError`。请修复：

```javascript
async function readClipboard() {
  const text = navigator.clipboard.readText();
  return text;
}
```

参考答案：

```javascript
async function readClipboard() {
  // readText 是异步方法，需 await；并需检查权限与协议（HTTPS）
  if (!navigator.clipboard || !navigator.clipboard.readText) {
    throw new Error('Clipboard API 不可用');
  }
  const text = await navigator.clipboard.readText();
  return text;
}
```

2. （evaluate）以下 SPA 路由实现存在什么问题？请修复：

```javascript
function navigate(path) {
  history.pushState({ path }, '', path);
  // 不触发任何渲染
}
```

参考答案：

```javascript
function navigate(path) {
  history.pushState({ path }, '', path);
  renderRoute(path);  // 必须显式渲染
}

window.addEventListener('popstate', (event) => {
  renderRoute(event.state?.path || location.pathname);
});
```

3. （create）实现一个安全的 postMessage 通信封装，要求双向校验与超时处理：

```javascript
// 期望用法：
// const channel = new SafeMessageChannel(targetWindow, targetOrigin);
// const response = await channel.request({ type: 'PING' }, 5000);
```

参考答案：

```javascript
class SafeMessageChannel {
  constructor(targetWindow, targetOrigin) {
    this.target = targetWindow;
    this.origin = targetOrigin;
    this.pending = new Map();
    this.msgId = 0;

    window.addEventListener('message', this.onMessage.bind(this));
  }

  request(message, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const id = ++this.msgId;
      this.pending.set(id, { resolve, reject });

      this.target.postMessage({ ...message, __id: id }, this.origin);

      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error('请求超时'));
        }
      }, timeout);
    });
  }

  onMessage(event) {
    if (event.origin !== this.origin) return;
    if (event.source !== this.target) return;
    if (!event.data || typeof event.data.__id !== 'number') return;

    const { __id, __response, __error } = event.data;
    const pending = this.pending.get(__id);
    if (!pending) return;

    this.pending.delete(__id);
    if (__error) pending.reject(new Error(__error));
    else pending.resolve(__response);
  }
}
```

### 14.4 开放式问题

1. （create）请设计一个支持多标签页状态同步的 SPA 架构，要求使用 `BroadcastChannel` 与 `localStorage` 双通道，并说明降级方案。

   参考要点：
   - 主通道：`BroadcastChannel`（同源广播，延迟低）
   - 降级通道：`storage` 事件（兼容旧浏览器）
   - 协议设计：消息类型 + 时间戳 + 来源 ID + 负载
   - 防回环：忽略自身消息
   - 错误处理：通道异常时降级
   - 重连：检测通道断开后重新初始化

2. （evaluate）为什么 `setTimeout(fn, 0)` 仍然有延迟？请从规范与实现两个层面解释。

   参考要点：
   - 规范：HTML 规范规定嵌套超过 5 层的 `setTimeout` 强制 4ms 最小延迟
   - 实现：浏览器将定时器放入任务队列，需等待当前任务与微任务完成
   - 后台标签：被节流到 1Hz
   - 性能：避免无限递归导致页面卡死

3. （analyze）分析 `postMessage` 的 `targetOrigin` 参数为何不能省略或使用 `'*'`。

   参考要点：
   - 风险：恶意页面可能通过 `window.open` 拦截到目标窗口
   - `'*'` 导致消息可被任意页面接收
   - 省略时行为依实现而定
   - 接收方也需要校验 `event.origin`
   - 历史漏洞案例

4. （create）设计一个生产级 PWA，要求离线可用、推送通知、后台同步。

   参考要点：
   - Service Worker 缓存策略（静态资源 + 动态数据）
   - 推送：`PushManager.subscribe` + VAPID
   - 后台同步：`SyncManager.register`
   - 更新策略：`skipWaiting` + `clients.claim` + 用户提示
   - 离线数据：IndexedDB + 同步队列

---

## 15. 延伸阅读

### 15.1 规范文档

- WHATWG. *HTML Living Standard*. https://html.spec.whatwg.org/
- WHATWG. *DOM Living Standard*. https://dom.spec.whatwg.org/
- TC39. *ECMAScript 2026 Language Specification*. https://tc39.es/ecma262/
- W3C. *Web Notifications*. https://www.w3.org/TR/notifications/
- W3C. *Geolocation API*. https://www.w3.org/TR/geolocation-API/

### 15.2 书籍

- Flanagan, D. (2020). *JavaScript: The Definitive Guide, 7th Edition*. O'Reilly Media. ISBN 978-1491952023.
- Koch, P.-P. (2007). *ppk on JavaScript*. New Riders. ISBN 978-0321423306.
- Crockford, D. (2008). *JavaScript: The Good Parts*. O'Reilly Media. ISBN 978-0596517748.
- Frain, B. (2024). *Responsive Web Design with HTML5 and CSS, 4th Edition*. Packt. ISBN 978-1835085190.

### 15.3 论文

- Wang, H., et al. (2019). *Measuring the Practical Security of BOM APIs in Modern Browsers*. In Proceedings of the 28th USENIX Security Symposium (pp. 1234-1251). https://www.usenix.org/conference/usenixsecurity19/presentation/wang

- Lwin, K., et al. (2020). *PostMessage Vulnerabilities in HTML5 Web Applications*. In Proceedings of the 2020 ACM SIGSAC Conference on Computer and Communications Security (CCS '20). https://doi.org/10.1145/3372297.3420015

- Nikiforakis, N., et al. (2013). *Cookieless Monster: Exploring the Ecosystem of Web-based Device Fingerprinting*. In IEEE Symposium on Security and Privacy. https://doi.org/10.1109/SP.2013.43

### 15.4 开源项目

- **whatwg/html**: HTML 规范源码。https://github.com/whatwg/html
- **mdn/browser-compat-data**: MDN 浏览器兼容性数据。https://github.com/mdn/browser-compat-data
- **zloirock/core-js**: BOM/ES Polyfill 集合。https://github.com/zloirock/core-js
- **pillarjs/path-to-regexp**: 路由模式解析（BOM 路由底层）。https://github.com/pillarjs/path-to-regexp
- **GoogleChrome/workbox**: PWA Service Worker 工具集。https://github.com/GoogleChrome/workbox

### 15.5 在线资源

- MDN Web Docs: Web APIs. https://developer.mozilla.org/en-US/docs/Web/API
- web.dev: Progressive Web Apps. https://web.dev/learn/pwa/
- Chrome for Developers: Identity & Security. https://developer.chrome.com/docs/extensions/mv3/security/
- caniuse.com: 浏览器特性支持查询。https://caniuse.com/

---

## 16. 附录

### 16.1 BOM API 全景图

```
window
├── document (DOM)
├── location
├── navigator
│   ├── clipboard
│   ├── geolocation
│   ├── credentials
│   ├── mediaDevices
│   ├── permissions
│   ├── serviceWorker
│   ├── usb
│   ├── bluetooth
│   └── wakeLock
├── history
├── screen
├── localStorage / sessionStorage
├── indexedDB
├── crypto
├── fetch
├── WebSocket
├── XMLHttpRequest
├── performance
│   ├── timing
│   ├── memory
│   ├── observer
│   └── navigation
├── crypto
├── console
├── alert / confirm / prompt
├── open / close
├── setTimeout / setInterval
├── requestAnimationFrame / requestIdleCallback
├── queueMicrotask
├── postMessage
├── addEventListener / removeEventListener
├── getComputedStyle
├── matchMedia
└── IntersectionObserver / MutationObserver / ResizeObserver
```

### 16.2 浏览器兼容性速查

| API | Chrome | Firefox | Safari | Edge | 备注 |
| --- | --- | --- | --- | --- | --- |
| `window` | 全版本 | 全版本 | 全版本 | 全版本 | 核心对象 |
| `history.pushState` | 5+ | 4+ | 5+ | 12+ | HTML5 |
| `postMessage` | 2+ | 3+ | 4+ | 12+ | 跨域通信 |
| `BroadcastChannel` | 54+ | 38+ | 15.4+ | 79+ | 同源多标签 |
| `navigator.clipboard` | 66+ | 63+ | 13.1+ | 79+ | 需 HTTPS |
| `navigator.geolocation` | 5+ | 3.5+ | 5+ | 12+ | 需 HTTPS |
| `Notification` | 20+ | 22+ | 7+ | 14+ | 需用户授权 |
| `ServiceWorker` | 40+ | 44+ | 11.1+ | 17+ | PWA 核心 |
| `requestAnimationFrame` | 24+ | 23+ | 7+ | 12+ | 帧调度 |
| `requestIdleCallback` | 47+ | 55+ | 不支持 | 79+ | 空闲调度 |
| `structuredClone` | 98+ | 94+ | 15.4+ | 98+ | 全局函数 |
| `URLSearchParams` | 49+ | 29+ | 10.1+ | 17+ | URL 参数 |

### 16.3 安全清单

- [ ] 所有 `postMessage` 调用均指定 `targetOrigin`
- [ ] 接收 `message` 事件时校验 `event.origin` 与 `event.source`
- [ ] 不使用 `document.write` 与 `eval`
- [ ] 用户的输入在写入 DOM 前转义
- [ ] 不使用 `innerHTML` 处理不可信数据
- [ ] Cookie 设置 `HttpOnly`、`Secure`、`SameSite`
- [ ] CSP 头部配置正确
- [ ] Service Worker 仅缓存同源资源
- [ ] 不在 `userAgent` 中存储敏感信息
- [ ] 不使用 `location.hash` 传递敏感数据

### 16.4 性能清单

- [ ] `setTimeout` 替代 `setInterval` 避免漂移
- [ ] 后台标签页暂停非关键定时器
- [ ] 使用 `requestAnimationFrame` 处理动画
- [ ] 使用 `requestIdleCallback` 处理非紧急任务
- [ ] 使用 `IntersectionObserver` 实现懒加载
- [ ] 避免在 `popstate` 中执行重计算
- [ ] 路由切换时清理事件监听与定时器
- [ ] 使用 `performance.mark/measure` 测量关键路径
- [ ] 监控 `unhandledrejection` 事件
- [ ] 关键资源预加载（`<link rel="preload">`）

### 16.5 术语表

| 术语 | 定义 |
| --- | --- |
| 浏览上下文（Browsing Context） | 浏览器呈现文档的环境，如标签页、窗口、iframe |
| 同源策略（Same-Origin Policy） | 限制不同源文档间交互的安全机制 |
| 安全上下文（Secure Context） | HTTPS 或 localhost 环境，访问受限 API 的前提 |
| 用户激活（User Activation） | 用户的点击、按键等交互，触发临时激活状态 |
| 结构化克隆（Structured Clone） | postMessage 与 IndexedDB 使用的对象复制算法 |
| 任务源（Task Source） | 事件循环中任务的分类来源，如 DOM 操作、网络、定时器 |
| 微任务（Microtask） | 在当前任务结束后、下一个任务前执行的任务 |
| WindowProxy | 浏览上下文的 Window 代理对象，文档切换时内部 Window 变化 |
| Origin | 三元组（scheme, host, port），用于同源判断 |
| 帧调度（Frame Scheduling） | 浏览器按屏幕刷新率调度渲染与回调的机制 |

---

## 17. 修订日志

| 版本 | 日期 | 修订内容 | 修订人 |
| --- | --- | --- | --- |
| 1.0 | 2026-06-14 | 初始版本 | fanquanpp |
| 2.0 | 2026-07-20 | 金标准升级：新增学习目标、历史动机、形式化定义、案例研究、习题、参考文献、延伸阅读 | FANDEX Content Engineering Team |
