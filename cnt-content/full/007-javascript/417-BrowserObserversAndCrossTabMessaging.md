---
order: 480
title: 浏览器观察器与跨标签页通信
module: 'javascript'
category: 前端技术
difficulty: intermediate
description: 三个 Observer（IntersectionObserver/MutationObserver/ResizeObserver）与 Clipboard、BroadcastChannel：把「是否可见、DOM 变没变、尺寸变没变」的判断下沉到浏览器内核，以及同源多标签页的状态同步，附懒加载、表单脏检查、登录态同步三个完整场景与未断开观察导致的内存泄漏实录。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'javascript/430-HostEnvironmentAndWebApiOverview'
  - 'javascript/410-DOMOperationEvent'
  - 'javascript/460-StorageForTheWeb'
  - 'javascript/350-MemoryManagementAndGarbageCollection'
prerequisites:
  - 'javascript/410-DOMOperationEvent'
---

## 知识点地图

- **知识类别**：DOM 观察器（IntersectionObserver、MutationObserver、ResizeObserver）与跨标签页通信（Clipboard API、BroadcastChannel），属于 [宿主环境与 Web API 总览](/javascript/430-HostEnvironmentAndWebApiOverview) 之下的一族「观察与传递」接口。
- **解决什么问题**：判断「元素进没进视口、DOM 改没改、尺寸变没变」这类问题，用 `scroll`/`setInterval` 轮询又贵又不准；三个 Observer 把判断下沉到浏览器内核，状态变化才回调。多标签页之间「一边登出、另一边还挂着已失效的登录态」，BroadcastChannel 提供同源广播的正规解法。
- **什么时候用到**：图片懒加载与无限滚动（IntersectionObserver）、监听第三方组件或富文本的 DOM 变化做脏检查（MutationObserver）、容器尺寸驱动的图表重绘（ResizeObserver）、复制邀请链接（Clipboard）、多标签页登录态与主题同步（BroadcastChannel）。

## 前置知识

- 已完成 [DOM 操作与事件](/javascript/410-DOMOperationEvent)：会 querySelector 与 addEventListener，理解事件回调是异步的；
- 已完成 [事件循环](/javascript/290-EventLoop)：知道宏任务与微任务，Observer 回调的触发时机建立在它之上。

## 学习目标

读完本文你将能够：

1. 用 IntersectionObserver 实现图片懒加载与无限滚动，说出 rootMargin 与 threshold 的语义；
2. 用 MutationObserver 监听 DOM 变化实现表单脏检查，说出四个 observe 选项各管什么；
3. 用 ResizeObserver 让图表跟随容器尺寸重绘，并解释它比 window.resize 准在哪里；
4. 用 Clipboard API 完成复制与读取，知道降级方案与权限约束；
5. 用 BroadcastChannel 实现多标签页登录态同步，并说出未 close/unobserve 导致的内存泄漏怎么防。

预计 45 到 60 分钟，含 2 组动手实践与 3 道练习。

## 1. 你现在要解决什么问题

商品详情页首屏有 30 张图，直接全量加载，首屏时间超标。第一版用滚动事件监听：

```javascript
window.addEventListener('scroll', () => {
  document.querySelectorAll('img[data-src]').forEach((img) => {
    const rect = img.getBoundingClientRect();   // 每次滚动对每张图强制布局
    if (rect.top < window.innerHeight) img.src = img.dataset.src;
  });
});
```

能跑，但滚动一次要对每张未加载的图调一次 `getBoundingClientRect`，浏览器被迫反复重排；节流后仍有「临界位置漏判」的边角问题。另一边，运营后台要求「表单被改过但没保存时，离开页面前弹确认框」——轮询比对整个表单快照既浪费又有时序坑。还有跨标签页：用户在 A 标签页退出登录，B 标签页还带着旧 token 继续发请求，接口 401 报错刷屏。

这三类问题的共性：**「某件事发生了吗」的判断不该由你的 JS 反复轮询，而该由浏览器在状态变化的瞬间告诉你。** 观察器家族与跨标签页通信就是为此设计的。

## 2. 观察器家族总览

| 观察器 | 观察什么 | 典型场景 | 取消方式 |
| --- | --- | --- | --- |
| IntersectionObserver | 目标元素与视口（或指定根）的相交状态 | 懒加载、无限滚动、曝光埋点 | `unobserve(el)` / `disconnect()` |
| MutationObserver | DOM 树的子节点、属性、文本变动 | 脏检查、第三方组件适配、录入审计 | `disconnect()` |
| ResizeObserver | 元素自身尺寸变化 | 容器自适应图表、虚拟列表 | `unobserve(el)` / `disconnect()` |

三个 Observer 的共同设计：**构造时传回调，`observe` 时传目标，回调收到的是「一批记录」（entries），且「是否触发」的判定在浏览器内核里完成**，只有状态真正变化时才把回调排进任务队列——相比滚动事件每帧多次触发，主线程压力低一个量级。对比一下两条路线：

| 维度 | IntersectionObserver | scroll 事件 |
| --- | --- | --- |
| 触发频率 | 仅状态变化时 | 每帧多次 |
| 主线程压力 | 低 | 高，需配合节流 |
| 位置计算 | 内核完成，无强制重排 | `getBoundingClientRect` 触发重排 |
| 推荐场景 | 懒加载、无限滚动、曝光埋点 | 滚动位置驱动的视差动画 |

需要「跟随滚动位置连续变化」的视差效果仍用 scroll（它要的不是「过了阈值」而是「每一刻的值」）；离散的「进没进、过没过」判断一律优先 Observer。

## 3. IntersectionObserver：可见性观察

**基本写法：观察元素可见性**

```javascript
// 元素进入/离开视口触发
const ob = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.isIntersecting) console.log('可见', e.target);
  });
}, { threshold: 0.5 });
ob.observe(document.querySelector('.box'));
```

**基本写法：取消观察**

```javascript
// 停止观察单个或全部
ob.unobserve(el);
ob.disconnect();
```

构造参数两个最常用：`rootMargin` 把视口边界向外（或向内）扩，写法同 CSS margin，`'100px'` 表示「距视口还有 100px 就算相交」；`threshold` 是相交比例阈值，`0.5` 表示「可见面积过半才算进入」。回调参数 `entry.isIntersecting` 是布尔的进出判断，`entry.intersectionRatio` 是连续的相交比例。

### 3.1 场景一：图片懒加载

```javascript
// 图片懒加载：仅在图片进入视口前 100px 时加载
const lazyImages = document.querySelectorAll('img[data-src]');

const imageObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src;         // data-src 里的真实地址赋给 src，触发加载
        img.removeAttribute('data-src');   // 标记已处理
        // 加载完成后停止观察，避免重复触发与内存泄漏
        imageObserver.unobserve(img);
      }
    });
  },
  {
    rootMargin: '100px', // 提前 100px 开始加载：用户滚到之前图已在路上
    threshold: 0.01,
  }
);

lazyImages.forEach((img) => imageObserver.observe(img));
```

逐段拆解：

- `img[data-src]` 是懒加载的约定：HTML 里真实地址放在 `data-src`，`src` 留空或放占位图，观察器命中后才把地址「转正」。如果不 `removeAttribute('data-src')`，同一张图会在后续交叉状态变化时被再次命中（虽然结果幂等，但日志与埋点会被污染）；
- `unobserve(img)` 这一行是纪律而非优化：图片加载完就不该再被观察。漏掉它正是本篇第 7 节内存泄漏实录的主角；
- `rootMargin: '100px'` 是体验与流量的平衡：太小学户会看到「图跟不上滚动」的空白，太大则提前拉了大量永远不会被看到的图。

### 3.2 场景二：无限滚动

```javascript
// 无限滚动：监听底部哨兵元素
const sentinel = document.getElementById('sentinel');

const scrollObserver = new IntersectionObserver(
  (entries) => {
    if (entries[0].isIntersecting) {
      loadMoreData();
    }
  },
  { rootMargin: '200px' }
);

scrollObserver.observe(sentinel);

let page = 1;
let loading = false;

async function loadMoreData() {
  if (loading) return;              // 在途请求未回来：忽略重复触发
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

关键设计是「哨兵元素」：一个固定放在列表末尾的空 div。观察它比观察「最后一条数据」更稳——列表刷新、条目增删都不用重新挂观察。`loading` 标志位防的是「回调在请求返回前又被触发」：rootMargin 200px 意味着快速滚动时哨兵可能连续多帧处于相交状态。

### 3.3 动手实践：首见即知

实现 `isVisible(element)`：返回 Promise，元素首次进入视口时 resolve。先自己写再看参考。

提示：构造 observer；回调里 `entry.isIntersecting` 为真时 resolve 并 `unobserve`；元素不存在应直接 reject。

参考实现（先自己写再对照）：

```javascript
function isVisible(el, options = {}) {
  return new Promise((resolve, reject) => {
    if (!(el instanceof Element)) {
      reject(new TypeError('isVisible 需要一个 DOM 元素'));
      return;
    }
    const ob = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        ob.unobserve(el);
        ob.disconnect();
        resolve(true);
      }
    }, { threshold: 0, ...options });
    ob.observe(el);
  });
}
```

## 4. MutationObserver：DOM 变动观察

**基本写法：监听 DOM 变化**

```javascript
// 子节点/属性变化回调
const ob = new MutationObserver((muts) => {
  muts.forEach((m) => console.log(m.type, m.target));
});
ob.observe(document.body, {
  childList: true,     // 子节点变动（增删）
  subtree: true,       // 含后代节点
  attributes: true,    // 属性变动
  characterData: true, // 文本变动
});
```

四个选项按需打开，**范围开得越大、回调越频繁**：`subtree: true` 加在 `document.body` 上等于监听整页，无必要时不要这么开。`m.type` 告诉你变动种类（`childList`/`attributes`/`characterData`），`m.addedNodes`/`removedNodes`/`m.attributeName` 给出细节。

### 4.1 场景三：表单脏检查

运营后台的「未保存提醒」需求：表单任何字段被用户改过（包括框架渲染出来的自定义控件），离开页面前要确认。MutationObserver 比轮询快照可靠——它不关心谁改的 DOM，只报告「改了」：

```javascript
function watchForm(formEl, onDirty) {
  let dirty = false;

  const ob = new MutationObserver((muts) => {
    if (muts.length === 0 || dirty) return;
    dirty = true;                 // 一脏永脏：置过标记就不再回调
    ob.disconnect();              // 观察任务已完成，立即收摊
    onDirty();
  });

  ob.observe(formEl, {
    attributes: true,             // 用户控件常以 aria-* 或 class 标记选中态
    attributeFilter: ['value', 'class', 'aria-checked', 'aria-selected'],
    childList: true,              // 富文本/标签输入会增删节点
    subtree: true,
    characterData: true,
  });

  return {
    isDirty() { return dirty; },
    markClean() {                 // 保存成功后重新武装观察
      dirty = false;
      ob.disconnect();
      ob.observe(formEl, {
        attributes: true,
        attributeFilter: ['value', 'class', 'aria-checked', 'aria-selected'],
        childList: true,
        subtree: true,
        characterData: true,
      });
    },
    stop() { ob.disconnect(); },
  };
}

const guard = watchForm(document.querySelector('#editor-form'), () => {
  window.onbeforeunload = () => '改动尚未保存，确定离开？';
});
```

逐段看：`attributeFilter` 把监听收窄到与表单状态相关的四个属性，避免页面无关的样式变更触发误报；回调第一次触发就 `disconnect()`——脏标记是单向的，继续观察只会白耗；`markClean` 在保存后重建观察，让「下一轮修改」重新可检。原生 `input`/`change` 事件覆盖不了「JS 程序改写控件」的场景（比如日期选择器把选中值写进 DOM），MutationObserver 补的正是这个盲区。

## 5. ResizeObserver：尺寸观察

**基本写法：监听元素尺寸**

```javascript
// 元素尺寸变化回调
const ob = new ResizeObserver((entries) => {
  entries.forEach((e) => console.log(e.contentRect.width));
});
ob.observe(document.querySelector('.box'));
```

它和 `window.resize` 的差异在于**观察对象**：window.resize 只知道「窗口变了」，不知道「哪个元素跟着变了」——侧栏折叠、面板拖宽、字体加载完成引起的回流，窗口尺寸可能一个像素都没变，元素却已经变了。图表容器是经典受害场景：

```javascript
const chart = document.querySelector('.chart');

const ro = new ResizeObserver((entries) => {
  for (const entry of entries) {
    const { width, height } = entry.contentRect;
    // 按新尺寸重绘：echarts 的 resize()、canvas 的重设宽高等
    redrawChart(entry.target, width, height);
  }
});

ro.observe(chart);

// 组件卸载时务必 disconnect，避免内存泄漏
// ro.disconnect();
```

`contentRect` 是元素**内容盒**的尺寸（不含 padding 与 border）——重绘布局时用它，别混用 offsetWidth（含 border）。

## 6. Clipboard API：读写剪贴板

**基本写法：读写剪贴板**

```javascript
// 需 HTTPS 与用户手势
await navigator.clipboard.writeText('复制内容');
const text = await navigator.clipboard.readText();
```

两条硬约束：环境必须是 HTTPS 或 localhost；调用必须发生在用户手势（点击、按键）的处理链里——页面加载完自动偷偷读剪贴板是权限模型明令禁止的。读操作比写操作更受限，多数浏览器会弹权限询问。

工程上必须带降级：老浏览器或非安全上下文下 `navigator.clipboard` 是 undefined。

```javascript
// 复制文本到剪贴板：Clipboard API 优先，execCommand 降级
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    // 降级方案：隐藏 textarea + execCommand
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');   // 已废弃但仍是唯一的同步降级
    document.body.removeChild(textarea);
    return ok;
  }
}

// 读取剪贴板：需要用户手势触发，且需要权限
async function readClipboard() {
  try {
    return await navigator.clipboard.readText();
  } catch (err) {
    console.error('读取剪贴板失败（多半是权限拒绝）:', err);
    return null;
  }
}
```

## 7. BroadcastChannel：同源多标签页通信

**基本写法：同源页面广播**

```javascript
// 同源多标签页通信
const ch = new BroadcastChannel('evt');
ch.postMessage({ hello: 1 });
ch.onmessage = (e) => console.log(e.data);
ch.close();
```

一个频道名把同源的所有标签页连成广播组：任一成员 `postMessage`，其余成员的 `onmessage` 都会收到（发送者自己收不到）。消息经结构化克隆传输，对象、数组、Map 都可以直接发。跨标签页同步还有一条 storage 事件路线（写 `localStorage` 让别的标签页收到 `storage` 事件），机制对比见第 8 节；storage 路线只能传字符串，BroadcastChannel 能传结构化对象，是首选方案。

### 7.1 场景四：多标签页登录态同步

用户在 A 标签页退出登录，B、C 标签页必须立即跟着清理并跳登录页，否则旧 token 继续发请求，401 刷屏：

```javascript
// auth-sync.js：每个标签页都加载这份代码
const authChannel = new BroadcastChannel('auth_sync');

// 收到广播：跟着执行相同的动作
authChannel.onmessage = (event) => {
  const { type, userId } = event.data;
  if (type === 'logout') {
    clearLocalSession(userId);        // 清 token、用户缓存
    redirectTo('/login');             // 跳登录页
  }
  if (type === 'login') {
    refreshHeader(event.data.user);   // 顶栏从游客态切成用户态
  }
};

// 登录/登出动作发生处：广播给其他标签页
function logout(userId) {
  clearLocalSession(userId);
  authChannel.postMessage({ type: 'logout', userId, at: Date.now() });
  redirectTo('/login');               // 自己跳，别的标签页收到消息后也跳
}
```

逐段看：频道名 `auth_sync` 是约定，两个标签页必须用同一个名字才能互通；`logout` 里先清理本地、再广播——顺序反了的话，收到广播的标签页可能把刚写回的数据又清一次；消息里带 `at: Date.now()` 时间戳，便于接收方丢弃迟到消息。注意广播**不会回到发送者**，所以发送侧自己也要执行一遍同样的清理。

不支持 BroadcastChannel 的环境降级到 storage 事件（写入一个专用 key，其他标签页在 `storage` 事件里读值），完整的双方案封装：

```javascript
/**
 * 多标签页状态同步：BroadcastChannel 优先，storage 事件降级
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
        if (e.key === this.channelName && e.newValue) {
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
    return () => this.handlers.delete(handler);   // 返回取消订阅函数
  }

  send(message) {
    if (this.channel) {
      this.channel.postMessage(message);
    } else {
      // 降级：通过 storage 事件触发（当前标签页不会收到自己的 storage 事件）
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

单页应用的路由切换相当于「换页」，TabSync 实例若不 `close()`，旧页面的监听器会一直挂着，随路由次数累积——这就是下一个场景的反面教材。

### 7.2 三种跨端消息机制怎么选

| 机制 | 用途 | 通信方向 | 同源要求 |
| --- | --- | --- | --- |
| `window.postMessage` | 跨窗口/iframe 通信 | 单向 | 不要求 |
| `BroadcastChannel` | 多标签页同源通信 | 广播 | 要求同源 |
| `MessageChannel` | 同标签页内双端口通信 | 双向 | 不适用 |

选择口诀：iframe 与弹窗通信用 `window.postMessage`；同源多标签页同步用 `BroadcastChannel`；与 Web Worker 双向通信用 `MessageChannel`（或直接 Worker 自带的 postMessage）。

## 8. 动手实践

任务一：给第 3.1 节的懒加载加「加载失败重试」——图片 `onerror` 时换备用源再试一次。提示：监听 img 的 `error` 事件；备用源可以放在 `data-fallback` 属性里；重试也失败就 `unobserve` 并显示占位图。

参考实现（先自己写再对照）：

```javascript
const lazyImages = document.querySelectorAll('img[data-src]');
const imageObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    const img = entry.target;
    img.addEventListener('error', () => {
      if (img.dataset.fallback && img.src !== img.dataset.fallback) {
        img.src = img.dataset.fallback;      // 换备用源重试一次
      } else {
        img.src = '/img/placeholder.png';    // 兜底占位图
        imageObserver.unobserve(img);
      }
    }, { once: true });
    img.src = img.dataset.src;
    img.removeAttribute('data-src');
    imageObserver.unobserve(img);
  });
}, { rootMargin: '100px', threshold: 0.01 });
lazyImages.forEach((img) => imageObserver.observe(img));
```

任务二：用 ResizeObserver 实现一个「字号随容器宽度缩放」的标题：容器每 100px 宽，字号 16px 起步按比例增大。提示：回调里读 `entry.contentRect.width`，写 `entry.target.style.fontSize`；注意别在回调里改尺寸又触发自己（改字号不改变容器宽度时是安全的）。

## 9. 常见错误与调试实录

**错误一：观察器未断开导致内存泄漏。** 组件销毁时只移除了 DOM，观察器还握着元素引用：

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

症状：单页应用反复进出列表页，内存快照里堆积大量已脱离 DOM 的节点（DevTools Memory 面板能看到 Retained by Observer）。纪律：**observe 与 disconnect 成对出现**，组件卸载钩子里必写；对「见一次就没」的目标（懒加载图片）用 `unobserve(el)` 逐个摘除。BroadcastChannel 同理，不用了要 `close()`：

```javascript
// 反模式：单页应用路由切换时未关闭 channel
function setupPage() {
  const channel = new BroadcastChannel('data');
  channel.onmessage = (e) => handleMessage(e.data);
  // 路由切换后 channel 仍存在，监听器累积
}
```

**错误二：观察回调里发请求不加防抖，快速滚动打出请求风暴。** 分析下面这段代码的问题：

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

四个问题：进入视口后未 `unobserve`，来回滚动会重复请求同一元素；快速滚动时大量并发请求，应加节流或请求队列；`innerHTML` 直接插入服务端返回的 HTML 有 XSS 风险，应改 `textContent` 或先清洗；`fetch` 失败未捕获，一个失败的网络请求就留下一个未处理的 Promise rejection。修法：`unobserve` 后再请求；失败重试或显示占位。

## 10. 与之前和之后的知识的关系

- 往前：[DOM 操作与事件](/javascript/410-DOMOperationEvent) 的「事件回调 + 事件对象」是观察器回调的同构形状——只是触发方从用户行为换成了浏览器状态；[事件循环](/javascript/290-EventLoop) 解释了 Observer 回调与滚动事件在任务队列里的位置差异；
- 往后：[网络存储](/javascript/460-StorageForTheWeb) 的 storage 事件是跨标签页同步的降级路线；[内存管理与垃圾回收](/javascript/350-MemoryManagementAndGarbageCollection) 解释未断开的观察器为什么能拖住元素不放；懒加载与无限滚动的请求层配套见 [fetch 与 AbortController](/javascript/440-FetchApiAndAbortController)。

## 11. 官方文档

- MDN IntersectionObserver：https://developer.mozilla.org/zh-CN/docs/Web/API/IntersectionObserver
- MDN MutationObserver：https://developer.mozilla.org/zh-CN/docs/Web/API/MutationObserver
- MDN ResizeObserver：https://developer.mozilla.org/zh-CN/docs/Web/API/ResizeObserver
- MDN Clipboard API：https://developer.mozilla.org/zh-CN/docs/Web/API/Clipboard_API
- MDN BroadcastChannel：https://developer.mozilla.org/zh-CN/docs/Web/API/BroadcastChannel

## 自我检查

- 能说出三个 Observer 各观察什么、各自对应的取消方法；
- 能写出懒加载示例并解释 rootMargin、threshold、unobserve 三个细节各防什么；
- 能解释 MutationObserver 的脏检查为什么能覆盖「JS 程序改写控件」的盲区；
- 能说出 Clipboard 的两条硬约束（HTTPS、用户手势）与降级思路；
- 能实现多标签页登录态同步，并说出「广播不回发给发送者」这条规则对代码顺序的影响。

## 本章总结

「状态变没变」的判断交给浏览器：IntersectionObserver 管可见性（懒加载、无限滚动），MutationObserver 管 DOM 变动（脏检查），ResizeObserver 管尺寸（自适应重绘）——三者的回调都收到一批记录，且必须与 unobserve/disconnect 成对使用，否则就是内存泄漏。Clipboard 读写剪贴板要求 HTTPS 与用户手势，execCommand 是最后的降级。BroadcastChannel 把同源标签页连成广播组，登录态、主题、购物车的跨页同步都靠它；storage 事件是它的字符串版降级。观察器家族共同的收益：把轮询换成「变化即通知」，主线程从每帧判断里彻底解放。

## 下一步

进入 [网络存储](/javascript/460-StorageForTheWeb)：观察器管「页面里的变化」，存储管「数据留下来的方式」——Cookie、localStorage、IndexedDB 与 Cache API 的分层选型。
