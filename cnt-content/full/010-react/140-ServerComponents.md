---
order: 140
title: Server Components
module: 'react'
category: 前端技术
difficulty: advanced
description: React 服务器组件（RSC）原理与实战：RSC 与 SSR 的区别、'use client' 边界、序列化规则与组合模式。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'react/120-FiberArchitecture'
  - 'react/130-ConcurrentRendering'
  - 'react/150-HooksPrinciple'
  - 'react/400-ServerClientComponents'
prerequisites:
  - 'react/010-OverviewEnvSetup'
---

## 前置知识

- [Fiber 架构](/react/120-FiberArchitecture)：了解渲染流程有助于理解 RSC 的输出格式
- [React19 新特性](/react/060-React19NewFeatures)：RSC 在 React 19 正式稳定

## 1. 概述

React Server Components（RSC，服务器组件）是一类**只在服务端运行**的组件：它们的代码不会打包进客户端 Bundle，渲染产物是一份序列化的描述（RSC Payload），由客户端 React "接收"后与客户端组件合并成最终的 UI 树。

时间线：React 团队于 2020 年 12 月发布 RSC RFC，2023 年 3 月 Next.js 13.4 基于 RSC 的 App Router 进入稳定，**React 19（2024 年 12 月）起 RSC 协议与相关 API 正式稳定**。如今 RSC 不再是某个框架的私有特性，而是 React 官方的架构方向，Next.js App Router、React Router 7（框架模式）、Waku、Vite 的 RSC 插件等均基于它实现。

理解 RSC 的最大误区是把它和 SSR 混为一谈：**SSR 解决的是"HTML 什么时候生成"，RSC 解决的是"哪些组件的 JS 根本不需要发到浏览器"**。两者可以叠加使用，但解决的是不同层面的问题。

## 2. 基础概念

### 2.1 两种组件

| 特性 | Server Component（默认） | Client Component |
| :--- | :--- | :--- |
| 运行环境 | 仅服务端（构建时 + 请求时） | 服务端预渲染 + 客户端水合 |
| 能否 `async` 直接 `await` | 可以 | 不可以（需要 Effect/use()） |
| Hooks | 不能用 `useState`/`useEffect` 等 | 全部可用 |
| 事件处理 / 交互 | 不支持 | 支持 |
| 访问后端资源 | 直接（数据库、文件系统、密钥） | 需经 API / Server Action |
| 客户端 Bundle 体积 | 零（不发 JS） | 计入 Bundle |
| 文件约定 | 默认；部分框架支持 `.server.tsx` | 文件顶部声明 `'use client'` |

### 2.2 RSC 与 SSR 的区别（高频面试题）

| 维度 | SSR（React 18 起） | RSC（React 19 稳定） |
| :--- | :--- | :--- |
| 解决的问题 | 首屏 HTML 的生成与水合前体验 | 减少客户端 JS 体积、直连数据源 |
| 组件是否在客户端执行 | 全部组件都要发送 JS 并水合 | Server Component 的 JS 不发送、不水合 |
| 输出 | HTML 字符串/流 | HTML + RSC Payload（组件树的序列化描述） |
| 交互能力 | 组件水合后可用 | Server Component 无交互，交互交给 Client Component |
| 是否可同时使用 | 是：App Router 中两者默认叠加 | 同左 |

一个直观的对比：一个纯展示的商品列表页，SSR 下服务端渲染 HTML 后仍要向浏览器发送整套组件 JS 并水合；RSC 下这些组件的 JS 根本不出服务端，浏览器只下载真正交互的那几 KB。

### 2.3 边界指令

```tsx
// app/page.tsx — 不写指令即为 Server Component（App Router 默认）
import { db } from '@/lib/db';

export default async function Page() {
  const posts = await db.post.findMany({ take: 10 });
  return <PostList posts={posts} />;
}
```

```tsx
// components/LikeButton.tsx — 需要交互时声明 'use client'
'use client';

import { useState } from 'react';

export function LikeButton({ initialCount }: { initialCount: number }) {
  const [count, setCount] = useState(initialCount);
  return <button onClick={() => setCount((c) => c + 1)}>赞 {count}</button>;
}
```

`'use client'` 是**边界声明**而非"组件类型标记"：从该文件 import 进来的所有模块都被划入客户端 Bundle。因此边界应尽量下沉到叶子节点，避免在入口处一刀切。

`'use server'` 则标记 Server Action（函数级别的服务端入口），与 RSC 边界是两回事，详见 [React19 新特性](/react/060-React19NewFeatures)。

## 3. 快速上手

### 3.1 服务端数据获取

Server Component 可以是异步函数，直接 `await` 数据源：

```tsx
// app/users/page.tsx
import { db } from '@/lib/db';

export default async function UsersPage() {
  const users = await db.user.findMany({ orderBy: { createdAt: 'desc' } });

  return (
    <ul>
      {users.map((u) => (
        <li key={u.id}>{u.name}</li>
      ))}
    </ul>
  );
}
```

不需要 `useEffect`、不需要 loading 状态管理——数据就绪前整个组件不返回，页面级加载态交给 `<Suspense>` 或 `loading.tsx`。

### 3.2 嵌入客户端组件

```tsx
// app/posts/page.tsx（Server Component）
import { LikeButton } from './LikeButton'; // Client Component

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await db.post.findUnique({ where: { id } });

  return (
    <article>
      <h1>{post.title}</h1>
      <p>{post.content}</p>
      {/* 服务端取数，客户端交互：各干各的 */}
      <LikeButton initialCount={post.likes} />
    </article>
  );
}
```

### 3.3 流式渲染

配合 Suspense 把慢的部分流式下发，快的部分先显示：

```tsx
import { Suspense } from 'react';

export default function Dashboard() {
  return (
    <div>
      <h1>仪表盘</h1>
      <Suspense fallback={<ChartSkeleton />}>
        <SalesChart /> {/* 内部 await 慢查询 */}
      </Suspense>
      <Suspense fallback={<ListSkeleton />}>
        <RecentOrders />
      </Suspense>
    </div>
  );
}
```

## 4. 详细用法

### 4.1 序列化规则：什么能穿过边界

Server Component 渲染结果（包括传给 Client Component 的 props）要经过 RSC 序列化：

**可以传递**：字符串、数字、布尔、`null`/`undefined`、可序列化普通对象与数组、`Date`、`Map`、`Set`、`BigInt`、Promise（客户端用 `use()` 解包）、React 元素（含 Server Component 渲染结果）、Client Component 引用。

**不能传递**：函数（除非是 Server Action）、类实例、Symbol、DOM 节点。

```tsx
// Server Component：把 Promise 直接作为 props 传下去（React 19）
export default async function Page() {
  const userPromise = db.user.findFirst();
  return (
    <Suspense fallback={<Loading />}>
      <Profile user={userPromise} /> {/* Client Component 收到 Promise */}
    </Suspense>
  );
}
```

```tsx
'use client';
import { use } from 'react';

export function Profile({ user }: { user: Promise<User> }) {
  const u = use(user); // 在客户端解包
  return <h1>{u.name}</h1>;
}
```

### 4.2 组合模式：children 穿透边界

Client Component **不能 import** Server Component，但可以把 Server Component 作为 `children` 传入：

```tsx
'use client';
// components/Collapsible.tsx
import { useState } from 'react';

export function Collapsible({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen((o) => !o)}>{open ? '收起' : '展开'}</button>
      {open && children}
    </div>
  );
}
```

```tsx
// app/page.tsx（Server Component）
import { Collapsible } from './Collapsible';

export default async function Page() {
  const detail = await fetchDetail();
  return (
    <Collapsible>
      {/* detail 这段渲染发生在服务端，不进客户端 Bundle */}
      <Detail detail={detail} />
    </Collapsible>
  );
}
```

"交互的外壳在客户端，内容在服务端"是 RSC 最常用的组合拳：Modal、Tabs、下拉面板都可以这样拆。

### 4.3 环境与安全

```tsx
// 服务端专属能力：密钥、数据库、文件系统
import { db } from '@/lib/db';   // 只有服务端能 import 的模块
import { SECRET_KEY } from '$env/static/private';

export async function Page() {
  const data = await db.query(SECRET_KEY);
  return <Chart data={data} />;
}
```

由于这段代码物理上不可能到达浏览器，密钥泄露风险随之降低——这是 RSC 相比"前端调 API"的安全收益。但要小心：把数据作为 props 传给 Client Component 时，数据会完整地出现在 HTML/RSC Payload 里，敏感字段必须先过滤。

## 5. 常见场景

### 5.1 何时用 Server Component

- 纯展示内容：文章、商品列表、文档、营销页
- 直连数据源：数据库查询、读文件、调内部服务
- 引用大型依赖：Markdown 解析、语法高亮、图表数据处理等重库只在服务端跑
- 隐藏敏感信息：API 密钥、内部字段过滤后再下发

### 5.2 何时用 Client Component

- 状态与交互：表单输入、开关、拖拽
- 浏览器 API：`localStorage`、`IntersectionObserver`、Canvas
- 需要订阅外部 store 或使用 `useState`/`useEffect` 等钩子的任何组件

### 5.3 迁移策略

存量 CRA/Vite SPA 不需要一夜之间改成 RSC。常见路径是：

1. 新页面用 RSC 优先的框架（Next.js App Router 等）搭建
2. 把"只读展示"的页面改为 Server Component，删掉对应的 fetch Effect
3. 交互组件保留 `'use client'`，用 children 模式把内容部分留在服务端

## 6. 注意事项

- **不要在 Server Component 中使用任何 Hook 或事件**：`useState`、`useEffect`、`onClick` 都会直接报错
- **边界尽量下沉**：`'use client'` 放在叶子组件上，而不是页面入口
- **props 会出现在网络载荷中**：传给 Client Component 的数据等于发给了用户，敏感字段先行剔除
- **Server Component 的渲染结果不做增量复用**：同一棵子树在请求间按需重取，注意用框架层缓存（如 Next.js 的 `revalidate`）控制成本
- **context 不能跨边界共享**：`createContext` 的 Provider 必须在客户端树内；服务端要传值就走 props
- **第三方库兼容性**：带 `useState` 的旧组件库组件必须包在 Client Component 里使用

## 7. 进阶用法

### 7.1 RSC Payload 与协议

Server Component 的输出并不是 HTML，而是形如下面这种行式协议（RSC Payload），客户端 React 依据它重建组件树：

```text
0:["$@1",["development",null]]
1:{\"name\":\"张三\",\"email\":\"zhang@example.com\"}
2:T1a,<h1>用户中心</h1>
```

流式 SSR 输出 HTML 的同时，把 RSC Payload 嵌入其中，两者在一次请求里同时到达——这就是"SSR 与 RSC 叠加"的落地形式。

### 7.2 请求内缓存与去重

React 19 提供 `cache()` 用于服务端请求内去重（同一请求里多次调用同一函数只执行一次）：

```tsx
import { cache } from 'react';

export const getUser = cache(async (id: string) => {
  return db.user.findUnique({ where: { id } });
});
```

跨请求缓存与失效则交给框架（Next.js 的 `revalidate`、`unstable_cache` 等）。React 19.2 还新增了 `cacheSignal`，在缓存生命周期结束时中止进行中的请求。

### 7.3 生态现状速览

- **Next.js App Router**：RSC 的参考实现，`app/` 目录默认 Server Component
- **React Router 7（框架模式）**：承接 Remix，逐步引入 RSC 支持
- **Waku**：社区主导的轻量 RSC 框架
- **Vite**：官方 RSC 插件（`@vitejs/plugin-rsc`）已可用，适合存量 Vite 项目渐进迁移

## 8. 小结

- RSC = 只在服务端运行的组件，产物是序列化载荷，客户端 JS 体积趋近于零
- RSC 与 SSR 互补：SSR 管 HTML 首屏，RSC 管组件代码的"不上车"
- 默认服务端、显式 `'use client'` 划边界；边界下沉，数据过滤后再传
- 组合模式（children 穿透 + Promise props + `use()`）是写好 RSC 应用的核心手法

## 速查

**声明边界**

`'use client'`
```tsx
'use client';
import { useState } from 'react';
export function Counter() { /* 交互组件 */ }
```

**异步服务端组件**

`async function <Page>() { await ... }`
```tsx
export default async function Page() {
  const data = await db.query();
  return <List items={data} />;
}
```

**Promise 作为 props**

`<ClientComp data={<Promise>} />`
```tsx
<Suspense fallback={<Loading />}>
  <Profile user={getUser(id)} />
</Suspense>
```

**children 穿透**

`<ClientShell>{<ServerContent />}</ClientShell>`
```tsx
<Tabs>
  <ServerRenderedPanel /> {/* 服务端渲染的标签内容 */}
</Tabs>
```

**请求内去重**

`cache(<异步函数>)`
```tsx
import { cache } from 'react';
export const getUser = cache((id: string) => db.user.findUnique({ where: { id } }));
```
