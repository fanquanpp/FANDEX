---
order: 10
title: Next.js 16 概述与快速上手
module: 'nextjs'
category: 前端技术
difficulty: beginner
description: 零基础第一课：理解 App Router、服务器组件与客户端组件，用 create-next-app 五分钟跑起第一个项目。
author: fanquanpp
updated: '2026-09-08'
related:
  - 'nextjs/002-AppRouterRouting'
  - 'nextjs/003-DataFetchingCaching'
  - 'react/001-OverviewEnvSetup'
prerequisites:
  - 'react/001-OverviewEnvSetup'
  - 'typescript/003-TypeScriptOverviewEnvSetup'
---

## 0. 五分钟创建第一个项目（先读这里）

> 学习目标：跑起一个 Next.js 项目，理解"页面文件 = 路由"。

```bash
npx create-next-app@latest my-app --ts --app --tailwind --eslint
cd my-app
npm run dev
```

**讲解：**

1. `create-next-app` 是官方脚手架：`--ts` 使用 TypeScript，`--app` 使用 App Router（当前唯一推荐），`--tailwind` 预装 Tailwind CSS v4。
2. `npm run dev` 启动开发服务器，默认地址 `http://localhost:3000`。
3. 打开 `app/page.tsx`，修改文字保存，浏览器会热更新——这就是"文件即路由"的起点。

## 1. Next.js 是什么

Next.js 是 React 的全栈元框架，由 Vercel 维护。它在 React 之上补齐了生产应用需要的：

- 文件路由与布局系统（App Router）；
- 服务器组件（Server Components）与客户端组件；
- 数据获取、缓存与增量静态再生（ISR）；
- 图片、字体、SEO 元数据的内置优化；
- 前后端一体（Route Handlers、Server Actions）。

### 1.1 版本现状（2026-08）

- Next.js 16.2.x 为 Active LTS（16.0 于 2025-10 发布；16.2.11 为 2026-07 安全版本）。
- 要求 Node.js 20.9+，推荐 Node 22 LTS；React 19.2+。
- 新项目统一使用 App Router；Pages Router 仅用于维护存量项目。

## 2. 认识项目结构

```text
my-app/
  app/
    layout.tsx      # 根布局：所有页面共享的壳（html/body）
    page.tsx        # 首页，对应路径 /
    globals.css     # 全局样式
  public/           # 静态资源（图片等）
  package.json
  tsconfig.json
  next.config.ts    # Next.js 配置文件
```

**讲解：**

1. `app/` 目录下的每个文件都映射路由：`page.tsx` 是页面，`layout.tsx` 是布局。
2. 组件默认是**服务器组件**：在服务器上渲染成 HTML 再发给浏览器，代码里可以直接读数据库、访问环境变量。
3. 需要交互（onClick、useState）的文件要在顶部写 `"use client"`，标记为客户端组件。

## 3. 第一个页面：服务器组件

```tsx
// app/page.tsx
export default function Home() {
  return (
    <main>
      <h1>你好，Next.js 16</h1>
      <p>这个页面在服务器上渲染，浏览器里能看到完整 HTML。</p>
    </main>
  )
}
```

**讲解：**

1. `export default function Home()` 是页面组件的固定写法，文件名决定路由，函数名只用于开发调试。
2. 没有 `"use client"` 的组件默认是服务器组件：用户点击"查看源代码"能看到渲染好的完整内容，SEO 友好。
3. `main` 等语义化标签与 HTML 一致，配合 Tailwind 类名即可快速排版。

## 4. 动手试试

1. 在 `app/about/page.tsx` 新建一个"关于"页面，访问 `/about` 看是否生效。
2. 在首页加一张图片：把图片放进 `public/`，用 `<img src="/xxx.png" alt="描述" />`（进阶后用官方 `next/image`）。
3. 新建 `app/contact/page.tsx`，用 `<Link href="/about">` 在页面之间跳转（下一章详解路由）。

## 5. 一句话记住

> Next.js = React + 文件路由 + 服务器渲染；`app/` 里放 `page.tsx` 就有页面，默认服务器组件、需要交互才加 `"use client"`。
