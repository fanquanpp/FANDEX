---
order: 340
title: Observer 家族与页面生命周期
module: 'html5'
category: 前端技术
difficulty: beginner
description: IntersectionObserver 懒加载与曝光统计、ResizeObserver 组件自适应、MutationObserver、Page Visibility 切页暂停与 View Transitions 速览。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'html5/245-WebStorage'
  - 'html5/270-HistoryAPI'
  - 'html5/140-ImagesAndResponsiveImages'
prerequisites: []
---

## 知识点地图

- **知识类别**：交互 API（观察者家族）与页面生命周期。
- **解决什么问题**：想知道「元素进入视口了吗」（懒加载、曝光统计）、「容器尺寸变了吗」（自适应组件）、「这段 DOM 被谁改了」（调试与第三方组件监听）、「用户还看着页面吗」（切标签页暂停视频、停轮询）。这四件事的共同点是**你不能靠轮询**，浏览器提供了对应的观察者 API 主动通知你。
- **什么时候用到**：商品列表/图片流的懒加载；埋点曝光统计；侧边栏随容器宽度换布局；多标签页场景的资源节流；SPA 路由切换的过渡动画（View Transitions 速览）。

## 与 007-javascript 模块的分工

观察者 API 的**深入语义**（threshold 数组的数学、rootMargin 负值技巧、observe 的批量回调模型、与跨标签页通信 BroadcastChannel 的组合）在 [浏览器观察者与跨标签页通信](/javascript/417-BrowserObserversAndCrossTabMessaging) 系统展开。本篇聚焦 HTML 页面的三个典型场景：图片懒加载、列表曝光统计、切页暂停媒体与轮询，并给出每个 API 的最小正确写法。

本篇由原 [Web Storage 与 Fetch API](/html5/245-WebStorage) 的 IntersectionObserver 速查节扩为专篇。

## 1. IntersectionObserver：进入视口的两种用途

原速查代码（承接自 245）：

```javascript
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target); // 只触发一次时用完即止
      }
    });
  },
  {
    root: null,          // null 表示浏览器视口
    rootMargin: '0px',
    threshold: 0.1,      // 目标可见度达到 10% 触发
  }
);
observer.observe(document.querySelector('.target'));
// observer.disconnect(); // 停止全部观察
```

**逐项讲解：**

- 回调拿到的 `entries` 是**一批**变化（浏览器把同帧内的多次交叉合并成一次回调），所以遍历而不是只看第一个；
- `threshold` 是数组 `[0, 0.5, 1]`，分别在「刚露头 / 一半可见 / 完全可见」时触发；曝光统计常用 `[0.5]`（半屏可见才算有效曝光）；
- `rootMargin` 能把视口向外扩，如 `'200px'` 表示「距离视口还有 200px 就算进入」——懒加载提前量就是用它实现，用户几乎看不到加载过程。

### 1.1 工程例子一：图片懒加载（loading 属性之外的手工版）

```html
<img data-src="/images/poster-1.webp" alt="海报" class="lazy" width="640" height="360" />
<img data-src="/images/poster-2.webp" alt="海报" class="lazy" width="640" height="360" />
<script>
  const io = new IntersectionObserver(
    (entries, obs) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const img = entry.target;
        img.src = img.dataset.src;    // 进入视口才赋真实地址
        img.removeAttribute('data-src');
        obs.unobserve(img);           // 图加载一次就够了
      }
    },
    { rootMargin: '200px' }           // 提前 200px 开始加载
  );
  document.querySelectorAll('img.lazy').forEach((img) => io.observe(img));
</script>
```

**讲解：**

- 真实地址先藏在 `data-src`，`src` 为空就不会立刻下载——这是懒加载的全部机关；
- `width/height` 占位防布局抖动（CLS 指标），省略会让页面「边滚边跳」；
- 单纯图片懒加载优先用原生 `loading="lazy"` 属性（见 [图像与响应式](/html5/140-ImagesAndResponsiveImages)）；手写版的价值在于**加载时机的完全可控**（自定义渐入动画、加载失败重试、骨架屏联动）。

### 1.2 工程例子二：曝光统计（埋点的正确姿势）

```javascript
const exposure = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.intersectionRatio >= 0.5 && !entry.target.dataset.reported) {
        entry.target.dataset.reported = '1';   // 同一次访问只报一次
        navigator.sendBeacon('/api/exposure', JSON.stringify({
          slot: entry.target.dataset.slot,
          at: Date.now(),
        }));
      }
    }
  },
  { threshold: 0.5 }
);
document.querySelectorAll('[data-slot]').forEach((el) => exposure.observe(el));
```

- `dataset.reported` 标记防重复上报；若要「离开再进入也算一次」，逻辑改为进出各记一次；
- `sendBeacon` 专为「页面即将关闭也要把数据发出去」设计，比 fetch 更适合埋点。

## 2. ResizeObserver：容器尺寸变化

窗口 resize 有 `window.resize` 事件，但**容器**尺寸变化（侧栏折叠、父容器 flex 伸缩）事件不会告诉你——ResizeObserver 观察的就是元素盒子的变化：

```javascript
const ro = new ResizeObserver((entries) => {
  for (const entry of entries) {
    const { inlineSize } = entry.contentBoxSize[0]; // 容器内容宽度
    entry.target.classList.toggle('compact', inlineSize < 480);
  }
});
ro.observe(document.querySelector('.card'));
```

- 经典用途是「组件随容器而不是随屏幕自适应」：同一个卡片组件放进窄侧栏自动切紧凑布局，放进主栏自动切宽松布局——媒体查询只认视口，做不到这件事；
- 回调里**不要再改被观察元素的尺寸**（改宽度再触发改宽度），会形成循环；要改就改内容层或加防抖；
- `contentBoxSize` 是内容盒；边框盒尺寸看 `entry.borderBoxSize`。

## 3. MutationObserver：DOM 变更监听

```javascript
const mo = new MutationObserver((mutations) => {
  for (const m of mutations) {
    if (m.type === 'childList') console.log('节点增删：', m.addedNodes, m.removedNodes);
    if (m.type === 'attributes') console.log('属性变化：', m.attributeName);
  }
});
mo.observe(document.querySelector('#list'), {
  childList: true,     // 监听子节点增删
  attributes: true,    // 监听属性变化
  subtree: false,      // true 则连同后代一起监听
});
// mo.disconnect();
```

- 典型场景：调试第三方组件为什么改你的 DOM、给动态插入的内容挂行为、无障碍工具感知列表更新；
- 它监听的是**你自己的页面 DOM**，别拿它当跨标签页通信通道——那是 storage 事件（[Web Storage](/html5/245-WebStorage)）与 BroadcastChannel 的地盘。

## 4. Page Visibility：用户还看着页面吗

```javascript
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    video.pause();            // 切走标签页：暂停视频
    stopPolling();            // 停掉轮询，省流量省电
  } else {
    video.play();
    startPolling();
  }
});
```

**讲解：**

- 触发时机：切标签页、最小化窗口、锁屏——`hidden`；回到页面——`visible`；
- 视频站「切走自动暂停」、行情页「后台停轮询回来立刻刷一次」都是这一个事件；不处理的后台轮询会持续消耗用户电量与服务器配额；
- 轮询的节制版：`hidden` 时清掉定时器，`visible` 时先立即拉一次数据再重启定时器，回来看到的是新数据而不是等满一个周期。

### 4.1 配套：页面卸载前的最后一口气

`beforeunload` 只适合「未保存提醒」，数据上报要用 `visibilitychange`（hidden 时）或 `pagehide`——`unload` 在移动端不可靠且会破坏往返缓存：

```javascript
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    navigator.sendBeacon('/api/session-end', JSON.stringify({ stayMs: Date.now() - enterAt }));
  }
});
```

## 5. View Transitions 速览

同文档（SPA 路由切换）的过渡动画，一行 API 让浏览器自动做新旧两套截图的交叉过渡：

```javascript
// 在更新 DOM 前包一层
document.startViewTransition(() => {
  renderNewList(newData); // 你的路由切换/列表更新代码
});
```

```css
/* 给特定元素标记为同一视觉实体，浏览器会做位置插值而不是淡入淡出 */
.card-hero { view-transition-name: hero-card; }
```

- 两步机制：浏览器先截「旧状态」图，回调里你更新 DOM，再截「新状态」图，然后用 CSS 动画从旧图过渡到新图；
- 适合列表详情展开、卡片飞入购物车这类「元素连续性」动画；整体页面淡入淡出则零 CSS 就有；
- 跨文档（MPA 跳转）的 View Transitions 与 History API 的导航控制（`history.pushState` 体系）配合使用，见 [HistoryAPI](/html5/270-HistoryAPI)；社团幻灯片项目用 opacity 切换实现的页面过渡，正可以对照本 API 重新实现一遍，体会「浏览器接管动画」与「手写样式切换」的差异。

## 6. 动手实践

### 任务

1. 给一个长图列表做懒加载 + 渐入动画（进入视口后加 class 触发 CSS transition）；
2. 给统计卡片加「半屏可见才计一次曝光」的埋点，切换标签页时把本次会话的曝光数用 sendBeacon 上报；
3. 做一个双栏布局：右栏被折叠到 400px 以下时，栏内卡片自动切换为单列紧凑样式（用 ResizeObserver，不用媒体查询）；
4. 做一个轮播组件：页面不可见时暂停自动轮播，可见时恢复并立即切换到下一张。

### 提示

- 渐入动画：初始 `opacity:0; transform: translateY(12px)`，加 class 后过渡到正常态；
- 任务 3 的判断条件写进一个函数，resize 回调里只调它；
- 任务 4 用 `visibilitychange` + 一个 `advance()` 函数，两处复用。

<details>
<summary>参考实现（先自己写，写完再展开对照）</summary>

```javascript
// 任务 1
const io = new IntersectionObserver((entries, obs) => {
  for (const e of entries) {
    if (e.isIntersecting) {
      e.target.src = e.target.dataset.src;
      e.target.classList.add('revealed');
      obs.unobserve(e.target);
    }
  }
}, { rootMargin: '150px' });
document.querySelectorAll('img.lazy').forEach((el) => io.observe(el));
/* CSS:
img.lazy { opacity: 0; transform: translateY(12px); transition: all .4s; }
img.lazy.revealed { opacity: 1; transform: none; }
*/

// 任务 2
let exposureCount = 0;
const expo = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (e.isIntersecting && e.intersectionRatio >= 0.5 && !e.target.dataset.done) {
      e.target.dataset.done = '1';
      exposureCount++;
    }
  }
}, { threshold: 0.5 });
document.querySelectorAll('.stat-card').forEach((el) => expo.observe(el));

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && exposureCount > 0) {
    navigator.sendBeacon('/api/exposure-batch', JSON.stringify({ count: exposureCount }));
    exposureCount = 0; // 已上报的清零，回来重新累计
  }
});

// 任务 3
const aside = document.querySelector('.sidebar');
const ro = new ResizeObserver(() => {
  aside.classList.toggle('narrow', aside.clientWidth < 400);
});
ro.observe(aside);

// 任务 4
const slides = document.querySelectorAll('.slide');
let idx = 0;
let timer = null;
function advance() {
  slides[idx].classList.remove('active');
  idx = (idx + 1) % slides.length;
  slides[idx].classList.add('active');
}
function startLoop() {
  advance();               // 恢复时立即切一张，不等一个周期
  timer = setInterval(advance, 3000);
}
function stopLoop() {
  clearInterval(timer);
  timer = null;
}
document.addEventListener('visibilitychange', () => {
  document.visibilityState === 'visible' ? startLoop() : stopLoop();
});
startLoop();
```

**参考实现讲解：** 任务 2 把「上报」挂在 visibilitychange 上而不是 unload——移动端 unload 不可靠；任务 4 的关键在恢复时先 `advance()` 再启动定时器，否则用户回来要先干等 3 秒。

</details>

## 7. 常见陷阱速查

| 问题点 | 说明 | 改进方案 |
| --- | --- | --- |
| 懒加载图没有占位尺寸 | 滚动时布局跳动 | width/height 或 aspect-ratio 占位 |
| IntersectionObserver 回调只看 entries[0] | 批量变化漏处理 | 遍历 entries |
| ResizeObserver 回调里改自身尺寸 | 循环触发报警 | 改内容层尺寸或加防抖 |
| 后台标签页继续轮询 | 耗电耗流量，数据过期 | visibilitychange 停/启轮询 |
| 用 unload 发统计 | 移动端常不触发 | pagehide 或 visibilitychange + sendBeacon |
| 给 MutationObserver 配 subtree: true 却监听全页 | 任何动画类名变化都触发回调 | 收窄观察目标与属性过滤（attributeFilter） |
| 期望 MutationObserver 跨标签页通知 | 它只看本文档 DOM | storage 事件或 BroadcastChannel |

## 8. 扩展学习

- 观察者深入与跨页消息：[浏览器观察者与跨标签页通信](/javascript/417-BrowserObserversAndCrossTabMessaging)；
- 原生懒加载属性与响应式图像：[图像与响应式](/html5/140-ImagesAndResponsiveImages)；
- 路由与导航控制：[HistoryAPI](/html5/270-HistoryAPI)；
- 列表滚动的另一个极端（虚拟滚动）属于渲染性能话题：[关键渲染路径与资源加载](/html5/380-CriticalRenderingPathAndResourceLoading)。

## 参考与致谢

- MDN Web Docs：IntersectionObserver、ResizeObserver、MutationObserver、Page Visibility API、View Transitions 文档（CC-BY-SA 2.5），https://developer.mozilla.org/zh-CN/docs/Web/API/Intersection_Observer_API
- WICG View Transitions API Draft Report，https://wicg.github.io/view-transitions/
