---
order: 260
title: React 服务端渲染
module: 'react'
category: 前端技术
difficulty: intermediate
description: React SSR 原理与工程实践：renderToString 与流式渲染、水合与选择性水合、SSR/SSG/ISR/RSC 的区别。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'react/140-ServerComponents'
  - 'react/130-ConcurrentRendering'
  - 'react/100-NextJSFullStack'
  - 'react/410-NextJsAppRouter'
prerequisites:
  - 'react/010-OverviewEnvSetup'
---

## 前置知识

- [Server Components](/react/140-ServerComponents)：先分清 RSC 与 SSR 的分工
- [React 服务端渲染](/react/100-NextJSFullStack)：Next.js 是 SSR 最主流的工程载体

## 1. 概述

服务端渲染（SSR）指 React 组件在 Node.js（或 Edge 运行时）中先执行一遍，把结果作为 HTML 发给浏览器，再由客户端 React "水合"（hydration）接管的过程。它解决的是**首屏速度与 SEO**：用户不用等 JS 下载执行完就能看到内容，爬虫拿到的是完整 HTML。

React 的 SSR API 演进：

- `renderToString`（React 16~）：一次性渲染为字符串，同步阻塞，无流式能力，现在只建议用于简单场景或生成静态标记
- `renderToPipeableStream`（React 18+，Node.js）：流式渲染，配合 Suspense 逐步下发 HTML
- `renderToReadableStream`（React 18+，Web Streams）：面向 Edge/Deno/Cloudflare Workers 等环境

React 18 之后的 SSR 都是"流式 + Suspense"形态；React 19 进一步改进了流式注入与 Web Streams 支持。注意：SSR 与 RSC 是互补关系——SSR 决定 HTML 如何生成与下发，RSC 决定哪些组件的 JS 根本不发到浏览器，Next.js App Router 中两者默认叠加工作。

## 2. 基础概念

### 2.1 SSR 的两个阶段

1. **服务端渲染**：组件树在服务端执行，产出 HTML（流式或整段）
2. **客户端水合**：浏览器加载 JS 后，React 在既有 DOM 上"接管"——为元素绑定事件处理器、建立 Fiber 树，而不是重新创建 DOM

水合失败的后果是 UI 闪断或控制台 hydration mismatch 报错，因此**服务端与客户端的首次渲染输出必须完全一致**。

### 2.2 渲染策略全景对比

| 策略 | HTML 生成时机 | 适合场景 | 代表实现 |
| :--- | :--- | :--- | :--- |
| CSR | 浏览器中（JS 执行后） | 强交互后台应用 | Vite SPA |
| SSR | 每次请求时 | 个性化、实时数据页面 | Next.js `ssr: true` 页面、自建 Express |
| SSG | 构建时一次性 | 博客、文档、营销页 | Next.js 静态导出、Astro |
| ISR | 构建时 + 按周期再生 | 内容多但更新不频繁 | Next.js `revalidate` |
| RSC/流式 | 请求时（组件级流式） | 数据源直连 + 渐进呈现 | Next.js App Router |

### 2.3 最小可运行示例（无框架）

```tsx
// server.jsx — 仅用 Express + React 演示原理，工程中建议直接用框架
import { createServer } from 'node:http';
import { renderToPipeableStream } from 'react-dom/server';
import { App } from './App';

createServer((req, res) => {
  const { pipe } = renderToPipeableStream(<App url={req.url} />, {
    bootstrapScripts: ['/main.js'],
    onShellReady() {
      res.setHeader('content-type', 'text/html');
      pipe(res); // 开始流式下发
    },
    onShellError(err) {
      res.statusCode = 500;
      res.end('渲染失败');
    },
  });
}).listen(3000);
```

```tsx
// main.js — 客户端入口：hydrateRoot 接管
import { hydrateRoot } from 'react-dom/client';
import { App } from './App';

hydrateRoot(document.getElementById('root'), <App />);
```

## 3. 快速上手

### 3.1 renderToString：理解原理的起点

```tsx
import { renderToString } from 'react-dom/server';

const html = renderToString(<App />);
res.send(`<html><body><div id="root">${html}</div><script src="/main.js"></script></body></html>`);
```

`renderToString` 同步执行：整棵树渲染完才返回，组件多时服务端响应时间线性变长，且不支持 Suspense 流式。仅适合脚本生成静态页或理解原理。

### 3.2 流式渲染：renderToPipeableStream

```tsx
import { renderToPipeableStream } from 'react-dom/server';

app.get('/', (req, res) => {
  const { pipe, abort } = renderToPipeableStream(<App />, {
    bootstrapScripts: ['/main.js'],
    onShellReady() {
      // 外壳（不依赖任何挂起数据的部分）就绪，尽早下发
      res.setHeader('content-type', 'text/html');
      pipe(res);
    },
    onShellError(error) {
      res.statusCode = 500;
      res.end('服务端渲染失败');
    },
    onError(error) {
      // 记录单个组件级错误（外壳之后出错不会 500，会在流中降级）
      console.error('SSR 渲染错误：', error);
    },
  });
  // 超时兜底：太久没渲染完就中止，让客户端接管
  setTimeout(abort, 10_000);
});
```

三个回调的分工：`onShellReady` 表示"骨架"可以发了；`onError` 处理流式过程中个别组件的失败；`onShellError` 表示连骨架都渲染不出来，只能回 500。

### 3.3 Suspense 驱动的渐进呈现

```tsx
function Page() {
  return (
    <>
      <header>立即显示的导航</header>
      <Suspense fallback={<CommentsSkeleton />}>
        <Comments /> {/* 慢数据：服务端稍后把结果注入 HTML */}
      </Suspense>
    </>
  );
}
```

Suspense 边界内的组件延迟就绪时，React 会先发送 fallback 占位，数据就绪后再把真实 HTML 与一段内联脚本注入到流中替换占位——整个过程不需要客户端重新请求。

## 4. 详细用法

### 4.1 水合：hydrateRoot

```tsx
import { hydrateRoot } from 'react-dom/client';
import { App } from './App';

hydrateRoot(document.getElementById('root'), <App />, {
  // 可恢复错误（如 mismatch）的兜底上报
  onRecoverableError: (error) => {
    reportToSentry({ type: 'hydration', error });
  },
});
```

注意入口是 `hydrateRoot` 而不是 `createRoot`：后者会清空容器重建 DOM，前者在服务端 HTML 上"接管"。用错了会出现页面闪一下的现象。

### 4.2 选择性水合（Selective Hydration）

React 18 起的水合是按 Suspense 边界分片的：JS 加载后，React 先水合已就绪的部分；用户点击尚未水合的区域时，React 会**优先水合被点击的边界**再处理事件——交互不必等整页水合完成。

```tsx
function Layout() {
  return (
    <>
      <Suspense fallback={<SidebarSkeleton />}>
        <Sidebar /> {/* 数据慢，但用户一点它就优先水合 */}
      </Suspense>
      <Suspense fallback={<FeedSkeleton />}>
        <Feed />
      </Suspense>
    </>
  );
}
```

### 4.3 水合不匹配（Hydration Mismatch）排查

服务端与客户端首次渲染不一致时触发。常见诱因与修法：

```tsx
// 诱因一：时间/随机值直接参与渲染
function Clock() {
  return <span>{new Date().toLocaleTimeString()}</span>; // 服务端与客户端几乎必然不同
}

// 修法：客户端挂载后再更新
function Clock() {
  const [now, setNow] = useState<string | null>(null);
  useEffect(() => setNow(new Date().toLocaleTimeString()), []);
  return <span>{now ?? '--:--:--'}</span>;
}
```

```tsx
// 诱因二：依赖浏览器特有值（window、localStorage）
const theme = localStorage.getItem('theme'); // 服务端没有 localStorage，直接崩

// 修法：初始值与 SSR 一致，Effect 中再读取真实偏好
const [theme, setTheme] = useState('light');
useEffect(() => {
  const saved = localStorage.getItem('theme');
  if (saved) setTheme(saved);
}, []);
```

其他诱因：浏览器扩展改写 DOM、非法 HTML 嵌套（`<p>` 里放 `<div>` 导致浏览器纠正结构）、服务端与客户端条件渲染依据不同。React 19 的 mismatch 报错会直接给出两端文本 diff，比 18 时代好排查得多。

### 4.4 服务端数据获取与注水数据

无框架自建 SSR 时，常见做法是渲染前取数并注入脚本，客户端读取复用：

```tsx
// 服务端：渲染前取数（请求级瀑布，注意控制层级）
const data = await fetchInitialData(req.url);
const { pipe } = renderToPipeableStream(<App initialData={data} />, options);
```

```tsx
// 或者：把数据内联进 HTML，客户端读取
<script id="__DATA__" type="application/json"
  dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />
```

```tsx
// 客户端：初始化时复用，避免二次请求
const initial = JSON.parse(document.getElementById('__DATA__')!.textContent!);
```

> 注意 `</script>` 注入风险：JSON 中的 `<` 要转义。RSC 方案（如 Next.js App Router）已经内置了这套数据流（RSC Payload），自建时才需要手工处理。

## 5. 常见场景

### 5.1 内容站：SSG/ISR 优先

博客、文档等页面内容在构建期已知，优先 SSG；需要在运行时按周期刷新就用 ISR：

```tsx
// Next.js App Router：每 60 秒再生一次
export const revalidate = 60;

export default async function Posts() {
  const posts = await getPosts();
  return <List items={posts} />;
}
```

### 5.2 个性化页面：SSR + 流式

登录后视图、搜索结果等依赖请求上下文的页面用 SSR；把慢区块包进 Suspense 保住首屏。

### 5.3 混合策略

现代框架通常允许页面级选择：营销页静态化、控制台 CSR、详情页 SSR——按页选择而不是全站一刀切。

## 6. 注意事项

- **模块顶层不要有副作用**：同一份代码要跑在服务端与客户端，顶层写 `window` 操作或全局单例连接都会出问题
- **`useLayoutEffect` 在服务端不执行**：SSR 下 React 会告警，测量 DOM 的逻辑要放进 Effect 或 `useLayoutEffect` 并做好客户端守卫
- **事件处理器只在客户端有意义**：`onClick` 等在服务端渲染时被忽略，别依赖它完成关键逻辑
- **服务端渲染不等于可交互**：水合完成前按钮点了没反应，流式 + 选择性水合是缓解手段，而不是消除
- **渲染时长就是接口时长**：SSR 把组件渲染搬到了服务端，慢查询会直接拖慢 TTFB，用 Suspense 切片隔离慢数据
- **自建 SSR 成本高**：路由、数据流、代码分割都要手工处理，除非要精确控制，否则选 Next.js / React Router 7 框架模式等成熟方案

## 7. 进阶用法

### 7.1 Edge 渲染

在 Cloudflare Workers、Vercel Edge 等环境使用 Web Streams 版 API：

```tsx
import { renderToReadableStream } from 'react-dom/server';

export default {
  async fetch(request) {
    const stream = await renderToReadableStream(<App />, {
      bootstrapScripts: ['/main.js'],
    });
    return new Response(stream, { headers: { 'content-type': 'text/html' } });
  },
};
```

冷启动低、离用户近，适合全球分发的页面；注意 Edge 运行时没有完整的 Node API（如 `fs`）。

### 7.2 与 RSC 的叠加

Next.js App Router 的请求流水线：服务端先跑 RSC 得到组件树描述，再叠加流式 SSR 输出 HTML + RSC Payload。对开发者来说这意味着：

- 页面默认 SSR（可交互性来自客户端组件的水合）
- 页面默认 RSC（非交互组件不发 JS）
- 两者通过 Suspense 边界与 `loading.tsx` / `error.tsx` 约定切片

### 7.3 Partial Pre-rendering（React 19.2+）

React 19.2 在 react-dom 层引入了 Partial Pre-rendering 支持：静态外壳可以提前预渲染并走 CDN，动态空洞在请求时"恢复"。它让"SSG 的速度 + SSR 的个性化"在同一路由中共存，具体启用方式由框架暴露（关注 Next.js 16 的 Cache Components 生态）。

## 8. 小结

- SSR = 服务端出 HTML + 客户端水合，目标是首屏与 SEO；React 18 后一律推荐流式 API
- `renderToPipeableStream`（Node）/ `renderToReadableStream`（Edge）+ Suspense 是现代 SSR 的基本盘
- 水合一致性是纪律：时间、随机、浏览器 API 一律不要直接参与首次渲染
- SSR/SSG/ISR/RSC 是工具箱里的不同工具：按页面特征选策略，而不是全站统一

## 速查

**renderToString 渲染为字符串**

`const <html> = renderToString(<App />)`
```tsx
import { renderToString } from 'react-dom/server';
const html = renderToString(<App />);
```

**renderToPipeableStream 流式输出**

`const { pipe } = renderToPipeableStream(<App />, <options>)`
```tsx
const { pipe } = renderToPipeableStream(<App />, {
  onShellReady() { res.setHeader('content-type', 'text/html'); pipe(res); }
});
```

**renderToReadableStream 边缘环境**

`await renderToReadableStream(<App />)`
```tsx
const stream = await renderToReadableStream(<App />);
return new Response(stream);
```

**hydrateRoot 水合**

`hydrateRoot(<container>, <App>)`
```tsx
import { hydrateRoot } from 'react-dom/client';
hydrateRoot(document.getElementById('root'), <App />);
```

**Suspense 流式切片**

`<Suspense fallback={<占位>}> <慢组件 /> </Suspense>`
```tsx
<Suspense fallback={<Skeleton />}>
  <Comments />
</Suspense>
```

**ISR 周期再生**

`export const <revalidate> = <秒>`
```tsx
export const revalidate = 60;
```

**水合错误上报**

`onRecoverableError: <handler>`
```tsx
hydrateRoot(el, <App />, { onRecoverableError: (e) => report(e) });
```
