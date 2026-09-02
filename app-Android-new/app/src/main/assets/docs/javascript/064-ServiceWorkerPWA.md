---
order: 640
title: Service Worker 与 PWA
module: 'javascript'
category: 前端技术
difficulty: advanced
description: 离线优先：Service Worker 生命周期、缓存策略与 PWA 安装体验。
author: fanquanpp
updated: '2026-09-02'
related:
  - 'javascript/046-StorageForTheWeb'
  - 'javascript/043-WebAPIBrowserInterface'
  - 'javascript/044-FetchApiAndAbortController'
prerequisites:
  - 'javascript/046-StorageForTheWeb'
---

# Service Worker 与 PWA

Service Worker 是一段运行在页面之外的脚本，站在网页与网络之间充当可编程的代理：它拦截本源的所有请求，决定"走网络、读缓存还是返回离线页"。配合 Cache Storage 与 Web App Manifest，站点可以获得离线可用、秒开、可安装的 PWA 体验。本篇覆盖 Service Worker 的生命周期与作用域、三种经典缓存策略、Fetch 拦截与离线回退、Manifest 与安装提示，以及推送与后台同步的概览。

## 前置知识

- [网络存储](/module/javascript/046-StorageForTheWeb)：Cache Storage 与其他存储 API 同属浏览器持久化体系。
- [Web API 与浏览器接口](/module/javascript/043-WebAPIBrowserInterface)：Service Worker 本质上是宿主提供的一组 Web API。
- [fetch 与 AbortController](/module/javascript/044-FetchApiAndAbortController)：拦截层大量使用 fetch 与 Response 的知识。

## 学习目标

- 能描述 Service Worker 的 install、waiting、activate 生命周期与作用域规则。
- 能针对不同资源类型选择 cache-first、network-first 或 stale-while-revalidate 策略。
- 能编写 fetch 拦截逻辑实现离线回退页。
- 能编写 Manifest 并用 beforeinstallprompt 引导用户安装 PWA。
- 能说出后台同步与推送通知的适用场景与基本事件模型。

## 一、Service Worker 的定位：页面之外的可编程代理

Service Worker 与普通脚本有三个本质区别：它运行在独立的 Worker 环境中，无法访问 DOM；它常驻后台，即使页面全部关闭也可能被唤醒处理事件；它是事件驱动的，浏览器只在需要时（请求到达、推送到达、同步触发）调用它。使用前提是 HTTPS 或 localhost——因为它权限极大（可以拦截篡改一切请求），必须防传输劫持。

```javascript
// 页面入口：注册 Service Worker，路径决定作用域
if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('/sw.js', { scope: '/' }) // 根路径脚本默认作用域为整站
    .then((reg) => console.log('注册成功，作用域：', reg.scope))
    .catch((err) => console.error('注册失败：', err));
}
```

作用域是理解 SW 的第一道关卡：`/sw.js` 默认控制整站，而 `/js/sw.js` 只能控制 `/js/` 下的页面。要把作用域提升到根目录，需要响应头 `Service-Worker-Allowed: /`。这也解释了为什么绝大多数项目把 SW 脚本放在站点根目录。

## 二、生命周期与作用域

SW 的生命周期是三步状态机：**install**（下载执行新脚本，预缓存资源）、**waiting**（新 SW 就绪但旧 SW 仍在控制页面，等待所有标签页关闭）、**activate**（旧 SW 退出，新 SW 接管，适合清理过期缓存）。一个关键设计是：安装中的新 SW 不会打断旧 SW，避免"半新半旧"的页面状态。

```javascript
// sw.js：install -> waiting -> activate 三阶段
const CACHE = 'fandex-live-v2'; // 版本号一变，旧缓存即可被识别并清理

self.addEventListener('install', (event) => {
  event.waitUntil(
    // waitUntil 保证异步任务完成后才算安装成功
    caches.open(CACHE).then((cache) => cache.addAll(['/offline.html']))
  );
  // self.skipWaiting(); // 可选：跳过等待立即接管（新版本差异大时才用）
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      // 删除所有非当前版本的旧缓存
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
});
```

两个 API 必须理解：`event.waitUntil(promise)` 告诉浏览器"事件没结束，别杀我"，Promise 兑现前 SW 保持存活；`clients.claim()` 让刚 activate 的 SW 立即控制已打开的页面（默认只控制之后打开的页面）。缓存清单中的版本号是整个方案的安全阀：只要版本一变，新 SW 就会被检测到并走一遍完整生命周期。

更新检测的时机也有讲究：浏览器会在每次页面导航时重新拉取 sw.js 做字节级比对（并且至少每 24 小时强制检查一次），内容一致则直接复用旧脚本。因此发布时无需任何手动刷新机制，只要新脚本内容有差异，新 SW 就会自动进入 install 阶段排队等待接管。

## 三、Cache Storage 与三种缓存策略

Cache Storage 是按名字分组的 Request 到 Response 的缓存表，与 HTTP 缓存相互独立、由代码全权控制。不同资源的新鲜度要求不同，对应的策略也不同：

```javascript
// 三种经典缓存策略
const CACHE = 'fandex-live-v2';

async function cacheFirst(request) {
  // 缓存优先：应援色 CSS、字体、图标这类几乎不变的静态资源
  const hit = await caches.match(request);
  return hit ?? fetch(request);
}

async function networkFirst(request) {
  // 网络优先：余票数、排期这类必须新鲜的数据，失败才回退缓存
  try {
    const fresh = await fetch(request);
    const cache = await caches.open(CACHE);
    cache.put(request, fresh.clone()); // body 只能读一次，缓存前必须 clone
    return fresh;
  } catch {
    return (await caches.match(request)) ?? Response.error();
  }
}

async function staleWhileRevalidate(request) {
  // 先用缓存立刻响应，后台悄悄更新，下次访问即是新数据
  const cache = await caches.open(CACHE);
  const cached = await caches.match(request);
  const fresh = fetch(request)
    .then((res) => {
      cache.put(request, res.clone());
      return res;
    })
    .catch(() => cached);
  return cached ?? fresh;
}
```

选择原则可以概括为一句话：**按"用户能容忍多旧"来分配资源**。静态资产容忍极旧，用 cache-first；业务数据不能旧，用 network-first；歌单封面、艺人介绍这类介于两者之间的内容，用 stale-while-revalidate 兼顾速度与新鲜度。策略本身只是十几行代码，价值在于把它们按资源类型路由到正确的位置。

存储配额是另一个必须正视的现实：Cache Storage 的配额由浏览器按整站统筹，`navigator.storage.estimate()` 可以查询已用空间与上限；配额紧张时浏览器可能整体回收站点存储。因此缓存列表要有条目上限与淘汰策略，而真正重要的数据（例如待重发的购票单）应存入 IndexedDB，不要依赖缓存的长久性。

## 四、Fetch 拦截与离线回退

`fetch` 事件是 SW 的核心：页面发出的每个同源请求都会先经过这里，`event.respondWith(promise)` 用自定义响应替换默认行为。未被 respondWith 覆盖的请求按浏览器默认流程走，因此"选择性拦截"是完全可行的。

```javascript
// fetch 拦截：按资源类型分流，离线时回退
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // 只拦截同源 GET；跨域资源与购票 POST 一律放行
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) {
    return;
  }

  if (request.mode === 'navigate') {
    // 页面导航：网络优先，彻底离线时展示离线页
    event.respondWith(
      networkFirst(request).catch(() => caches.match('/offline.html'))
    );
  } else if (request.url.includes('/static/')) {
    // 静态资源：缓存优先，命中即零网络成本
    event.respondWith(cacheFirst(request));
  }
});
```

缓存键的规范化是拦截层容易忽略的一环：同一个资源经由带查询参数与不带查询参数的 URL 访问时，会被缓存成两个条目，命中率随之下降。策略上可以在缓存前用 `new URL(request.url)` 剥离无关参数，或对带时间戳的请求统一归一到规范地址，让"同一资源只有一份缓存"成为默认。

这套分流逻辑让购票页在地铁里也能打开：导航请求失败时立即呈现缓存的离线页与"恢复网络后自动重试"的提示；脚本、样式全部来自缓存，页面秒开；唯独购票按钮会提示联网。离线体验的边界感由此确立——离线可以浏览，交易必须在线。离线页本身也应该在 install 阶段预缓存（本篇第二节正是这样做的），否则"离线回退页也要联网取"就成了死循环。

## 五、Manifest 与安装提示

PWA 的"可安装"由 Web App Manifest 描述。清单声明应用名、图标、启动 URL、显示模式与主题色；浏览器综合清单与 SW 的活跃情况，判断站点是否满足安装条件。

```html
<!-- index.html 中引用清单 -->
<link rel="manifest" href="/manifest.webmanifest" />
<!-- 高质量 PWA 的两大标记：theme_color 让地址栏融入应援色 -->
<meta name="theme-color" content="#39C5BB" />
```

```json
{
  "name": "FANDEX Live",
  "short_name": "FANDEX",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#39C5BB",
  "theme_color": "#39C5BB",
  "icons": [
    { "src": "/icons/icon.svg", "sizes": "any", "type": "image/svg+xml" }
  ]
}
```

默认情况下浏览器会在条件满足时自动弹出安装横幅，但时机不可控。更专业的做法是拦截 `beforeinstallprompt` 事件，把安装邀请留到用户表现出兴趣的时刻（例如收藏了某场演唱会之后）：

```javascript
// 把安装提示留到最合适的时机
let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();   // 阻止浏览器默认横幅
  deferredPrompt = e;   // 暂存事件对象
});

favoriteButton.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt(); // 主动触发安装弹窗
  const { outcome } = await deferredPrompt.userChoice;
  console.log(outcome === 'accepted' ? '已添加到主屏幕' : '用户暂不安装');
  deferredPrompt = null;   // 该事件只能消费一次
});
```

清单中的 `display` 字段决定安装后的呈现形态：`standalone` 让应用脱离浏览器 UI 独立成窗，是最常见的 PWA 形态；`minimal-ui` 保留少量导航控件；`fullscreen` 则完全沉浸，演唱会直播页常选它。图标建议提供 SVG 矢量格式，一套文件即可适配各分辨率的主屏幕。

## 六、推送与后台同步概览

两项能力让 PWA 超越"离线网页"。**后台同步（Background Sync）** 解决"断网时的操作不丢失"：用户在地铁里点击购票，请求先存入 IndexedDB 并注册同步任务，网络恢复后浏览器唤醒 SW 重发。**推送（Push）** 解决"页面没开也能收到通知"：服务器经推送服务下发消息，SW 的 `push` 事件被唤醒并展示通知。

```javascript
// sw.js：后台同步与推送的事件入口
self.addEventListener('sync', (event) => {
  if (event.tag === 'retry-ticket-order') {
    // 网络恢复后重放：从 IndexedDB 取出未发送的购票单逐个提交
    event.waitUntil(flushPendingOrders());
  }
});

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification('FANDEX Live', {
      body: data.body ?? '您关注的演唱会已开票',
      icon: '/icons/icon.svg',
      data: { url: '/concerts/42' }, // 点击通知时跳转用
    })
  );
});
```

推送需要服务端生成 VAPID 密钥、前端用 PushManager 订阅，且通知权限必须由用户显式授予；后台同步则要求请求"可以安全重放"（幂等或带去重 id）。订阅流程的骨架是：页面调用 `registration.pushManager.subscribe({ userVisibleKey: ... })` 拿到订阅对象，把其中的 endpoint 上报给业务服务器；服务器之后向该 endpoint 投递加密消息，浏览器负责唤醒 SW。两者共同的工程要点是：把待办数据先落盘（IndexedDB），再依赖浏览器唤醒机制，绝不假设 SW 会一直活着。通知权限的申请时机也要克制：在用户完成一次有价值的操作后再请求授权，拒绝率远低于页面加载即弹窗。

## 易错点与最佳实践

1. **修改了 sw.js 但页面毫无变化**。SW 脚本本身受 HTTP 缓存影响，旧的 sw.js 可能被缓存数小时。错误示范与修正：

```javascript
// 注册时不加任何配置（反例）：sw.js 被 HTTP 缓存拖住，更新延迟可达 24 小时
// navigator.serviceWorker.register('/sw.js');

// 修正：注册时声明跳过 HTTP 缓存，更新检测始终直达服务器
navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' });
```

2. **缓存 Response 前忘记 clone**。`cache.put(request, res)` 直接把响应体消费掉，返回给页面的将是空 body。修正：`cache.put(request, res.clone())`，一条给缓存、一条给调用方。

3. **缓存无限膨胀**。activate 时不清旧版本缓存，用户设备会被历次版本缓存占满。修正：以版本号命名缓存，activate 中删除所有非当前版本，必要时用 `estimate()` 监控配额。

4. **把非幂等请求交给后台同步重放**。POST 购票单被重放两次就会重复扣款。修正：为订单生成客户端唯一 id，服务端幂等去重，或在提交前检查 IndexedDB 中是否已存在该 id。

5. **skipWaiting 与 clients.claim 滥用**。新 SW 立即接管会让"页面代码是旧版、缓存是新版"的错位窗口变大。修正：小步发布时保持默认 waiting 行为，仅在关键修复时使用 skipWaiting 并配合页面刷新提示。

## 本篇小结

- Service Worker 是可编程的网络代理，独立于页面运行、事件驱动、要求 HTTPS，作用域由脚本路径决定。
- 生命周期为 install、waiting、activate 三阶段；版本化缓存名是触发更新的安全阀，waitUntil 维持存活。
- 缓存策略按容忍的新鲜度分配：静态资源 cache-first，业务数据 network-first，中间地带 stale-while-revalidate。
- Manifest 与 beforeinstallprompt 联合实现可控的安装体验；SW 活跃是安装条件之一，display 模式决定安装后的形态。
- 后台同步让断网操作可重放，推送让页面未开也能收到通知；两者的前提都是数据先落盘。

## 动手实践

1. **离线可用的歌单页**：为歌单页实现 network-first 加离线回退，断网时展示最近一次成功的歌单数据与醒目的离线横幅。思路：数据请求与页面导航分别处理；把最近一次 JSON 响应写入缓存；横幅状态由 `navigator.onLine` 与 fetch 失败共同决定。

2. **运行时缓存清理器**：实现按"最大缓存条目数"的 LRU 清理逻辑，在 activate 与每次 cache.put 后触发。思路：Cache API 没有顺序保证，需要自己维护 key 的时间戳索引（可存于 IndexedDB），超出上限时从最旧开始删除。

3. **安装转化埋点**：统计安装弹窗的曝光、接受与拒绝次数，并验证"收藏行为之后再弹窗"是否提升转化。思路：暂存 beforeinstallprompt，把 prompt() 的调用挂在收藏按钮的点击回调上，用 userChoice 结果作为埋点事件上报。
