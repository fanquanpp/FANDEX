---
order: 310
title: History API
module: 'html5'
category: 前端技术
difficulty: intermediate
description: 用 pushState 与 popstate 从零写一个迷你 SPA 路由：历史栈与 state 恢复、刷新 404 的服务端配置、hash 与 history 两种模式取舍，以及切换动画的 View Transitions 配合。
author: fanquanpp
updated: '2026-10-05'
related:
  - 'html5/300-ServiceWorkerPWA'
  - 'css/340-CSSViewTransitions'
  - 'html5/280-CrossDocumentCommunication'
prerequisites:
  - 'html5/020-HTML5OverviewCoreFeature'
---

> 前置依赖：先接触过 SPA 路由概念（Vue Router 或 React Router）再读本篇；示例需要事件监听基础（`javascript/039`）。

## 1. 场景切入：后退键坏了的列表页

你在 FANDEX 网页端逛作品集：点进一幅像素画，URL 从 `/gallery` 变成 `/work/42`，详情在当前页内展示。你按了一下浏览器后退键想回列表——如果开发者偷懒只做了"内容切换"没管历史记录，后退键会直接把你踹回上一个网站，而不是回到 `/gallery`。

同理：筛选条件（`?tag=像素&sort=最新`）如果只存在内存里，用户一刷新就丢，也没法把带筛选结果的链接发给朋友。这两个问题的共同答案是 History API：**把界面状态写进 URL 和历史栈，让浏览器的后退/前进/刷新/分享四大基础设施替你干活**。

Vue Router、React Router 的 history 模式，底层就是本篇这几个调用。读懂它们，框架的路由配置报错你就能自己排查。

## 2. 动手：一个能进能退的迷你路由

新建 `mini-spa.html`（走 localhost 或 Live Server 打开），整份复制即可运行：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <title>迷你路由</title>
  <style>
    nav a { margin-right: 16px; }
    nav a.active { color: #39C5BB; font-weight: bold; }
    main { border-top: 1px solid #eee; padding-top: 16px; min-height: 120px; }
  </style>
</head>
<body>
  <nav>
    <a href="/">首页</a>
    <a href="/gallery">画廊</a>
    <a href="/about">关于</a>
  </nav>
  <main id="view"></main>

  <script>
    const view = document.getElementById('view');

    const routes = {
      '/': () => '<h2>首页</h2><p>欢迎来到 FANDEX 演示站。</p>',
      '/gallery': () => '<h2>画廊</h2><p>这里是作品列表。</p>',
      '/about': () => '<h2>关于</h2><p>一个教学用迷你路由。</p>',
    };

    function render() {
      const path = location.pathname;
      view.innerHTML = (routes[path] || routes['/'])();
      document.querySelectorAll('nav a').forEach((a) =>
        a.classList.toggle('active', a.getAttribute('href') === path)
      );
    }

    // 拦截站内链接点击：改 URL + 渲染，不真正发起跳转
    document.querySelector('nav').addEventListener('click', (e) => {
      const link = e.target.closest('a');
      if (!link) return;
      e.preventDefault();
      const path = link.getAttribute('href');
      history.pushState({ path }, '', path);   // 入栈新条目
      render();
    });

    // 前进/后退时浏览器只改 URL，渲染得自己做
    window.addEventListener('popstate', render);

    render(); // 首次加载
  </script>
</body>
</html>
```

动手清单：

1. 点"画廊"，URL 变为 `/gallery`，内容切换，没有页面刷新；
2. 按浏览器后退键，回到首页——后退键第一次"听话"了；
3. 在 `/gallery` 按 F5 刷新，大概率 404——这不是 bug，是本篇最重要的一个"为什么"，见第 4 节；
4. 把 `pushState` 换成 `replaceState` 再试：后退键会跳过画廊直接回到上一个网站，体会"替换当前条目"和"新增条目"的区别。

## 3. 讲为什么：一套 API，两个角色

### 3.1 写入历史的两个方法

```javascript
// 新增一个历史条目：后退键会回到上一个 URL
history.pushState(state, '', url);

// 替换当前条目：后退键越过这里，直接回到上上个
history.replaceState(state, '', url);
```

参数表：

| 参数 | 说明 |
| --- | --- |
| `state` | 随条目存储的状态对象，前进/后退时原样还给你。必须是可结构化克隆的数据；浏览器对序列化后的大小有限制且各实现不同（Firefox 约 16 MiB，WebKit 系更小），**只存 ID、页码这类轻量值**，大数据放 localStorage/IndexedDB，state 里只放钥匙 |
| 第二参数 | 历史遗留，传空串 `''` |
| `url` | 新 URL。**必须同源**，否则抛 SecurityError；可以传相对路径、查询串或 hash |

两者的分工口诀：**push 用于"用户到达了一个新地方"，replace 用于"同一个地方换了个说法"**。典型 replace 场景：分页点击后把 `?page=2` 替换进当前条目；或登录后把带 `?code=xxx` 的 URL 清干净。

### 3.2 读回状态的 popstate

用户点后退/前进（或代码调 `back()`/`forward()`/`go(n)`）时，浏览器只做两件事：换 URL、触发 `popstate`。**渲染是你自己的事**：

```javascript
window.addEventListener('popstate', (event) => {
  // event.state 就是当初 pushState 存进去的对象
  renderPage(event.state?.page ?? 'home');
});
```

最容易记错的点：**`pushState`/`replaceState` 自己不触发 `popstate`**。所以迷你路由里"导航函数"和"popstate 回调"都必须调 `render()`——很多教程封装成 `navigate()` 内部先 push 再 render，就是这个原因。

### 3.3 顺手的辅助成员

```javascript
history.length;              // 当前会话的历史条目数（只读）
history.state;               // 当前条目的 state（刷新后依然在）
history.scrollRestoration;   // 'auto'（默认，浏览器自动恢复滚动） | 'manual'

// 手动接管滚动恢复：SPA 常用，切换视图时自己 scrollTo
history.scrollRestoration = 'manual';
```

后退回到长列表时滚动位置对不对，用户体验差别巨大。默认 `auto` 在纯浏览器导航下够用；SPA 动态渲染内容后往往需要 `manual` + 自行恢复。

## 4. 讲为什么：刷新 404 是 history 模式的宿命

迷你路由在 `/gallery` 刷新会 404，因为浏览器向服务器**真的请求了** `/gallery` 这个路径，而服务器上没有这个文件。这正是 history 路由的唯一硬性部署要求：**服务器把所有前端路由都兜底返回 `index.html`**，剩下的交给 JS 渲染。

Nginx 的经典写法：

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

开发环境里，Vite（`historyApiFallback` 默认开启）和 Live Server 都已内置。对比一下 hash 模式：URL 写成 `/#/gallery`，hash 部分根本不会发给服务器，所以不需要任何配置、天然可部署到静态托管——代价是 URL 不干净、SEO 差、和页面锚点语义冲突。**hash 是部署能力不足时的退路，history 是正路**；现代平台（Vercel、Netlify、Cloudflare Pages）都有现成的 SPA fallback 开关，没有理由再选 hash。

## 5. 进阶：把查询参数写进 URL

列表页的筛选条件用 `URLSearchParams` 读写，配合 `replaceState`（筛选不该让后退键一步步回放）：

```javascript
function setPage(page) {
  const url = new URL(location.href);
  url.searchParams.set('page', String(page));
  history.replaceState(history.state, '', url);
  loadList(page);
}

// 首次加载：从 URL 恢复状态（刷新、分享链接都不丢）
const initialPage = Number(new URLSearchParams(location.search).get('page')) || 1;
loadList(initialPage);
```

这段模式值得背下来：**URL 是状态的第一存储**。组件挂载时先读 URL，任何状态变化先写 URL 再渲染——做到这一点，刷新、后退、分享三个能力自动到账。

## 6. 坑点自检

| 现象 | 原因 | 修法 |
| --- | --- | --- |
| 后退后页面不变 | 没监听 `popstate`，或监听了但没重新渲染 | popstate 回调里必须重渲染 |
| `popstate` 在 push 后没触发 | 正常行为，push 本就不触发 | `navigate()` 里 push 后手动渲染 |
| 刷新 404 | 服务器没有 SPA fallback | Nginx `try_files` / 平台 rewrite 配置 |
| 抛 SecurityError | `pushState` 传了跨域 URL | 只允许同源；跨域只能 `location.href` 真跳转 |
| 全站链接都被拦截 | 委托监听时没判断来源 | 校验 `link.origin === location.origin`、`target !== '_blank'`、带 `download` 的放行 |
| state 超限报错 | 塞了大对象 | state 只存 ID/页码，数据放外部存储 |
| 后退后滚动位置乱跳 | SPA 动态渲染破坏了 `auto` 恢复 | `scrollRestoration = 'manual'` 自行恢复 |
| 带筛选刷新全丢 | 状态只存在组件内存 | 参照第 5 节"URL 是状态的第一存储" |

## 7. 现代补充：导航这件事正在被重新设计

两个 2026 视角的动向，知道即可，生产仍以 `pushState` 体系为主：

- **View Transitions API**：路由切换时两行代码拿到整页过渡动画（旧视图淡出、新视图淡入），与 `pushState` 完美配合——`document.startViewTransition(() => render())`，详见 `css/340-CSSViewTransitions`；
- **Navigation API**（`navigation.addEventListener('navigate', ...)`）：Chrome/Safari 已实现，把"拦截导航、接管路由"标准化，Firefox 尚未跟上；框架作者值得关注，业务代码暂时不必直接依赖。

框架层面（Vue Router / React Router / TanStack Router）早已封装好以上全部并处理了边缘情况；本篇的意义是让你在遇到"路由刷新 404""后退键行为诡异"时，能穿透框架看到浏览器这一层的真相。

## 8. 练习

1. （必做）给迷你路由加一个 `/work/42` 动态路由：解析 `location.pathname` 匹配 `/^\/work\/(\d+)$/`，渲染对应编号；
2. （必做）实现"画廊滚动位置恢复"：离开画廊时把 `scrollY` 存进 state（`replaceState`），后退回来时恢复；
3. （选做）用 `URLSearchParams` 实现 `?tag=&sort=` 筛选：改变时 `replaceState`，并把"清除筛选"做成一个普通链接（href 带真实参数，保证可分享）；
4. （选做）对比实验：同一页面分别用 hash 与 history 模式部署到任一静态托管，验证 hash 免配置、history 需要重写规则。

## 9. 下一步

- 给路由切换加上过渡动画：`css/340-CSSViewTransitions`；
- URL 参数只是状态共享的起点，跨窗口/跨 iframe 通信见 `html5/280-CrossDocumentCommunication`；
- 让页面离线可用、后端 404 兜底后依然完整运行：`html5/300-ServiceWorkerPWA`。
