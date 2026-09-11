---
order: 10
title: Next.js 16 概述与快速上手
module: 'nextjs'
category: 前端技术
difficulty: beginner
description: 零基础第一课：理解元框架、App Router、服务器组件与客户端组件，用 create-next-app 五分钟跑起第一个项目，并建立 Next.js 16 的版本认知。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'nextjs/020-AppRouterRouting'
  - 'nextjs/030-DataFetchingCaching'
  - 'react/010-OverviewEnvSetup'
prerequisites:
  - 'react/010-OverviewEnvSetup'
  - 'typescript/030-TypeScriptOverviewEnvSetup'
---

## 0. 五分钟创建第一个项目（先读这里）

> 学习目标：跑起一个 Next.js 项目，理解"页面文件 = 路由"，并认识服务器组件与客户端组件两种基本形态。

```bash
npx create-next-app@latest my-app --ts --app --tailwind --eslint
cd my-app
npm run dev
```

**讲解：**

1. `create-next-app` 是官方脚手架：`--ts` 使用 TypeScript，`--app` 使用 App Router（当前唯一推荐），`--tailwind` 预装 Tailwind CSS。Next.js 16 起脚手架流程被简化重构，默认模板即 App Router + TypeScript + Tailwind + ESLint。
2. `npm run dev` 启动开发服务器，默认地址 `http://localhost:3000`。开发与生产构建默认使用 Turbopack 打包器（见 1.1 节），启动与热更新明显快于旧版 webpack。
3. 打开 `app/page.tsx`，修改文字保存，浏览器会热更新——这就是"文件即路由"的起点。

## 1. Next.js 是什么

React 本身只是"UI 库"：它负责把组件渲染成界面，但不关心路由、数据获取、构建打包、SEO 这些工程问题。直接用 React 搭建生产级网站，你需要自己挑选路由方案、自己配置服务端渲染、自己处理图片字体优化——就像拿到毛坯房后要自己走水电、装门窗。

Next.js 是 React 官方文档推荐的**全栈元框架（meta-framework）**，由 Vercel 主导维护。它相当于"精装交付"：在 React 之上补齐了生产应用需要的全套能力——

- 文件路由与布局系统（App Router）：文件夹即路由，`layout.tsx` 即共享壳；
- 服务器组件（Server Components）：默认在服务器渲染，可直接连数据库；
- 客户端组件：需要交互的部分才送进浏览器；
- 数据获取与缓存体系：fetch、ISR（增量静态再生）、16 时代的 Cache Components；
- 内置优化：图片（next/image）、字体（next/font）、SEO 元数据、打包（Turbopack）；
- 前后端一体：Route Handlers（HTTP 接口）与 Server Actions（服务器函数）让你在一个项目里写完全栈。

**类比**：React 是发动机，Next.js 是整车——发动机决定动力上限，但方向盘、变速箱、安全气囊这些"能开上路"的部件由整车厂提供。换框架（如 Remix）相当于换整车，发动机仍是 React。

### 1.1 版本现状（2026-09）

- Next.js 16.3.x 为 **Active LTS**（16.3 于 2026-08-03 发布，核心新特性是 Instant Navigations；2026-08-25 安全版本为 16.3.3）；15.5.x 为 Maintenance LTS，仅安全维护。官方自 2026-07 起实行月度安全发布流程，生产项目应跟踪安全公告及时升级补丁版本。
- 16.0（2025-10-21）是近年最重要的一次大版本：Turbopack 成为默认打包器（开发与构建，官方数据构建提速 2-5 倍、Fast Refresh 最快 10 倍）、推出 Cache Components 显式缓存模型、`middleware.ts` 更名为 `proxy.ts`。
- 环境要求：Node.js 20.9+（推荐 22 LTS）、TypeScript 5.1+；配套 React 19.2+（App Router 实际使用 React Canary 通道，可用 View Transitions、`useEffectEvent`、`<Activity>` 等 19.2 特性）。
- 新项目统一使用 App Router；Pages Router 进入维护模式，仅用于存量项目。

学习建议：版本号不必背，记住**两条主线**即可——15 完成了"缓存默认值反转"（fetch、GET 接口、客户端导航默认不再缓存）与请求 API 异步化（`params`、`cookies()` 等要 `await`）；16 完成了"Turbopack 默认化 + 缓存显式化（Cache Components）+ 代理层更名（proxy.ts）"。

## 2. 认识项目结构

```text
my-app/
  app/
    layout.tsx      # 根布局：所有页面共享的壳（html/body）
    page.tsx        # 首页，对应路径 /
    globals.css     # 全局样式
  public/           # 静态资源（图片等，按原样对外提供）
  proxy.ts          # 请求入口层（16 起由 middleware.ts 更名；脚手架默认不生成）
  next.config.ts    # Next.js 配置文件（16 支持原生 TS 类型）
  package.json
  tsconfig.json
  .env.local        # 本机环境变量（不提交 git）
```

**讲解：**

1. `app/` 目录下的每个文件都映射路由：`page.tsx` 是页面，`layout.tsx` 是布局，`loading.tsx`/`error.tsx`/`not-found.tsx` 是三种状态页面，`route.ts` 是后端接口——文件名就是功能，这是 App Router"约定优先于配置"的哲学。
2. 文件夹一层层嵌套对应 URL 一级级下钻：`app/posts/[id]/page.tsx` 就是 `/posts/42` 这样的动态路由。
3. 组件默认是**服务器组件**：在服务器上渲染成 HTML 再发给浏览器，代码里可以直接读数据库、访问环境变量密钥，而且这些代码不会被打包进浏览器 JS。
4. 需要交互（onClick、useState）的文件要在顶部写 `"use client"`，标记为客户端组件。

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

服务器组件与客户端组件的分工是 Next.js 最重要的心智模型：

| 对比项 | 服务器组件（默认） | 客户端组件（"use client"） |
| --- | --- | --- |
| 运行位置 | 服务器，渲染成 HTML 后下发 | 浏览器，随 JS 包下载执行 |
| 能否用 useState/onClick | 不能 | 能 |
| 能否直接连数据库/读密钥 | 能 | 不能（会打进浏览器包，构建报错或泄漏） |
| 对首屏与 SEO | 友好（完整 HTML） | 首屏多一次 JS 执行 |
| 典型用途 | 列表、详情、读数据的页面 | 表单校验、弹窗、轮播、实时刷新 |

**类比**：服务器组件像餐厅后厨——备料（数据库查询）、烹饪（渲染）都在后厨完成，顾客拿到的已是成品；客户端组件像餐桌上的互动服务——加菜、退菜（交互状态）必须发生在顾客面前。后厨的锅碗（数据库客户端、密钥）没必要也不应该搬到餐桌上。

## 4. 第二个页面：客户端组件与交互

```tsx
// app/counter/page.tsx
"use client" // 必须是文件第一行，声明以下代码运行在浏览器

import { useState } from "react"

export default function CounterPage() {
  const [count, setCount] = useState(0)
  return (
    <main>
      <p>当前计数：{count}</p>
      <button onClick={() => setCount(count + 1)}>加一</button>
    </main>
  )
}
```

**讲解：**

1. 访问 `/counter` 即可看到可交互的计数器；删掉 `"use client"` 再保存，构建会直接报错——服务器组件不允许使用状态与事件。
2. 划分原则是**尽量下沉**：页面骨架保持服务器组件，只把真正需要交互的叶子组件标 `"use client"`，让进入浏览器的 JS 越少越好。
3. 两种组件可以在同一棵组件树里组合：服务器组件可以把客户端组件当子组件使用，反向传递则只能通过 props 把服务器数据传下去。

## 5. 常用命令

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 启动开发服务器（默认 Turbopack，热更新） |
| `npm run build` | 生产构建，日志会标注每个路由的渲染类型 |
| `npm run start` | 以生产模式启动服务器（需先 build） |
| `npx @next/codemod@canary upgrade latest` | 官方升级 CLI，自动跑 codemod 迁移破坏性变更 |

**讲解：**

1. Next.js 16 移除了 `next lint` 命令：ESLint 直接用 `npx eslint .` 运行（或改用 Biome），`next build` 也不再顺带执行 lint。
2. 大版本升级优先用 codemod CLI，它能自动处理 `params` 异步化、middleware 更名等机械改动；无法自动迁移的部分参考官方升级指南。

## 6. 新手常见陷阱

1. **给 `params` 直接取属性**：Next.js 15 起 `params`、`searchParams`、`cookies()`、`headers()` 都是异步的，必须 `await` 后再读，同步访问在 16 已直接报错（详见第 2 篇）。
2. **在服务器组件里写交互**：`useState`/`onClick` 只属于客户端组件，报错信息会明确提示补 `"use client"`。
3. **把密钥加 `NEXT_PUBLIC_` 前缀**：带前缀的变量会被内联进浏览器代码，任何访客可见；数据库连接串、API Key 绝不能加（详见第 9 篇）。
4. **在客户端组件里 import 数据库客户端**：`'use client'` 文件里的所有 import 都会进入浏览器包，`@/lib/db` 会让构建失败甚至泄漏密钥；数据访问只能写在服务器侧。

## 7. 本模块学习路线

本模块共 10 篇，按由浅入深排列：本篇概述建立整体认知后，App Router 路由、数据获取与缓存是地基；Route Handlers 与 Server Actions 解决"数据怎么改"；渲染策略与缓存深挖（Cache Components）是进阶选型课；认证、代理与安全、部署与性能优化面向上线；学习总结用于二轮复习串线。

## 8. 动手试试

1. 在 `app/about/page.tsx` 新建一个"关于"页面，访问 `/about` 看是否生效。
2. 把计数器页面改出"减一"与"重置"按钮，体会客户端组件的状态管理。
3. 在首页加一张图片：把图片放进 `public/`，用 `<img src="/xxx.png" alt="描述" />`（进阶后换成官方 `next/image`，见第 9 篇）。
4. 新建 `app/contact/page.tsx`，用 `<Link href="/about">` 在页面之间跳转（下一章详解路由）。

## 9. 一句话记住

> Next.js = React + 文件路由 + 服务器渲染 + 前后端一体；`app/` 里放 `page.tsx` 就有页面，默认服务器组件、需要交互才加 `"use client"`；16 时代的三个关键词是 Turbopack 默认、缓存显式化（Cache Components）与 proxy.ts。
