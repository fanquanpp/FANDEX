---
order: 102
title: 'Next.js-App-Router'
module: react
category: 'dev-lang'
difficulty: advanced
description: 'Next.js App Router详解：文件夹约定、布局、加载态、错误态。'
author: fanquanpp
updated: '2026-06-14'
related:
  - 'react/React-Compiler自动记忆化'
  - 'react/Server-Components与Client-Components'
  - 'react/React-19新增API'
  - react/并发渲染与可中断更新
prerequisites:
  - react/概述与环境配置
---

## 1. 文件夹约定

### 1.1 路由结构

```
app/
  layout.tsx          # 根布局
  page.tsx            # 首页 /
  loading.tsx         # 全局加载态
  error.tsx           # 全局错误态
  not-found.tsx       # 404 页面
  about/
    page.tsx          # /about
  blog/
    layout.tsx        # /blog 布局
    page.tsx          # /blog
    [slug]/
      page.tsx        # /blog/:slug
```

### 1.2 特殊文件

| 文件            | 用途           |
| --------------- | -------------- |
| `layout.tsx`    | 共享布局       |
| `page.tsx`      | 路由页面       |
| `loading.tsx`   | 加载状态       |
| `error.tsx`     | 错误处理       |
| `not-found.tsx` | 404            |
| `template.tsx`  | 重新挂载的布局 |
| `default.tsx`   | 并行路由默认   |

## 2. 布局嵌套

```tsx
// app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <nav>导航</nav>
        {children}
      </body>
    </html>
  );
}

// app/blog/layout.tsx
export default function BlogLayout({ children }) {
  return (
    <div className="blog-layout">
      <Sidebar />
      {children}
    </div>
  );
}
```

## 3. 加载态

```tsx
// app/blog/loading.tsx
export default function Loading() {
  return <Skeleton />;
}
```

Next.js 自动用 Suspense 包裹页面，显示 loading.tsx。

## 4. 错误态

```tsx
// app/error.tsx
'use client';

export default function Error({ error, reset }) {
  return (
    <div>
      <h2>出错了</h2>
      <button onClick={reset}>重试</button>
    </div>
  );
}
```

## 5. 数据获取

```tsx
// Server Component 中直接 async
async function Page() {
  const data = await fetch('https://api.example.com/data');
  return <div>{data.title}</div>;
}
```
