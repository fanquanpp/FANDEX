---
order: 20
title: 服务器组件与客户端组件边界
module: 'nextjs'
category: 前端技术
difficulty: beginner
description: Next.js App Router 组件边界系统讲解：use client 指令的传播规则、服务器组件作为 children/props 穿过客户端组件的组合模式、props 序列化边界（函数为什么传不了）、第三方库缺 use client 时的包装层写法
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- 知识类别：React 服务器组件（RSC）与客户端组件的边界机制——`"use client"` 指令的传播、序列化协议与组合模式。
- 解决什么问题：入门篇只回答了"哪种组件是什么"，本篇回答工程里真正纠缠人的三件事——边界怎么划才对、数据怎么"穿过"客户端组件、第三方库没有 `"use client"` 时怎么救。
- 什么时候用到：任何真实页面的组件树设计；引入图表、轮播、富文本等第三方库时；排查"为什么整个页面都进了客户端 bundle"。
- 入门对比表与后厨/餐桌类比见[Next.js 16 起步](/nextjs/010-NextJS16Overview)第 3 节，本篇在其上展开。

## 前置知识

- [Next.js 16 起步](/nextjs/010-NextJS16Overview)：理解服务器/客户端组件的分工与"尽量下沉"原则。
- [Next.js App Router 路由系统](/nextjs/020-AppRouterRouting)：知道 layout/page 的嵌套结构。

## 学习目标

- 能说清 `"use client"` 是**边界声明**：它标记的是"从这里开始往下的整棵子树"进入客户端，而不是单个组件。
- 能用 children/props 组合模式把服务器组件"穿过"客户端组件渲染，并解释为什么这是默认该用的形态。
- 能背出序列化边界清单：什么能过、什么不能过、为什么函数传不过去。
- 能为缺少 `"use client"` 的第三方组件写包装层，并知道这在模块图上的代价。

## 0. 回顾：边界是一条单向线

[入门篇](/nextjs/010-NextJS16Overview)的心智模型：服务器组件是后厨，客户端组件是餐桌。本篇先给这条类比补上"边界"的几何形状——**它不是两个组件之间的一条线，而是一个文件的顶部宣告后，往子树方向无限延伸**：

```text
app/page.tsx            (服务器)
  └─ ProductList        (服务器)
       └─ AddToCart.tsx  "use client"   ← 边界从这一行的文件开始
            └─ Tooltip   (客户端：即使没写指令，也在边界之内)
                 └─ …    (整棵子树都是客户端)
```

两条直接推论，都是工程事故高发区：

1. **指令不需要在子树里重复写**。`AddToCart.tsx` 标了 `"use client"`，它 import 的所有模块自动成为客户端模块——重复写不报错但会造成"到处都是 use client"的错觉，误以为要逐个声明。
2. **反向不成立**：客户端组件不能 import 服务器组件。一旦进入边界，剩下的路都在浏览器里。想让服务器内容出现在客户端组件"内部"，靠的不是 import，而是第 2 节的组合模式。

## 1. 序列化边界：props 能带什么过河

服务器组件把 props 传给客户端组件时，数据要经历一次"序列化"——从服务器进程跨过网络到达浏览器。这条河上只有部分货物能通行：

| 能过河 | 不能过河 |
| --- | --- |
| 字符串、数字、布尔、null | 函数（包括事件处理器） |
| 普通对象、数组（可 JSON 化） | 类实例（Date 除外）、Symbol |
| Date、Map、Set、BigInt | 带循环引用/不可序列化字段的对象 |
| React 元素（作为 children/props） | 服务端专属对象（数据库连接、stream） |

函数为什么不能过？想一遍数据流就明白：客户端按钮的 `onClick` 必须是**浏览器里**的一段可执行代码，而服务器组件传过来的函数只存在于服务器内存里——序列化协议传的是数据，不是代码。类实例同理：传过去的对象在浏览器端"重新长出来"，原型链上的方法根本没有被带过去，调用了就是 undefined is not a function。

两个常见场景的正确姿势：

```tsx
// 场景一：想把"点击行为"传下去 —— 改传客户端组件可调用的"描述"，行为下沉
// 错误：<ClientRow onSelect={() => track(row.id)} />   // 函数过不了河
// 正确：把 id 传过去，行为写在客户端组件内部
<ClientRow rowId={row.id} />

// 场景二：Date/Map 能过，但别传 class 实例
// 错误：new UserRepository() 整个实例当 props
// 正确：传纯数据，客户端需要的行为用官方 Server Action（函数在服务端、客户端拿到的是引用）
<ClientRow deadline={deadlineAt} />   // Date 可以
```

讲解：`Date`、`Map`、`Set` 能过河是 React 官方序列化实现专门支持的，但依赖往往装着"顺手"的陷阱——`dayjs` 的实例、ORM 查出来的 Model 实例，都建议先转成纯数据（`.toISOString()`、plain object）再传。**序列化边界的自检口诀：把 props `JSON.stringify` 一遍，除了 Date/Map/Set，能原样回来的才能传。**

## 2. 组合模式：把服务器组件从客户端组件"中间穿过去"

初学者最常见的错误形态：页面需要交互，就把整个页面标 `"use client"`，数据获取也搬进 `useEffect`——后厨整个搬上餐桌，服务器组件的所有优势（直接取数、不进 bundle、流式渲染）全部报废。

正确的结构是**角色反转**：交互壳（客户端组件）当"插槽"，服务器内容当 children 从外面塞进去：

```tsx
// app/product/[id]/page.tsx —— 服务器组件（不写 use client）
import { db } from "@/lib/db"
import { AddToCart } from "./add-to-cart"

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const product = await db.product.findUnique({ where: { id } })
  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1>{product.name}</h1>
      {/* 服务器渲染的详情块，作为 children 穿过客户端组件 */}
      <InteractiveCard
        productId={product.id}
        price={product.price}
        cover={<img src={product.coverUrl} alt={product.name} className="rounded-xl" />}
      >
        <ProductSpecs specs={product.specs} />  {/* 服务器组件，依然在服务器渲染 */}
      </InteractiveCard>
    </main>
  )
}
```

```tsx
// app/product/[id]/add-to-cart.tsx —— 客户端组件（交互壳）
"use client"
import { useState } from "react"

export function InteractiveCard({
  productId, price, cover, children,
}: { productId: string; price: number; cover: React.ReactNode; children: React.ReactNode }) {
  const [adding, setAdding] = useState(false)
  return (
    <section className="rounded-2xl border p-6 shadow-sm">
      {cover}
      {children}                       {/* 服务器渲染结果原样落位 */}
      <button
        onClick={() => setAdding(true)}
        disabled={adding}
        className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
      >
        {adding ? "已加入" : `加入购物车 ¥${price}`}
      </button>
    </section>
  )
}
```

关键点逐条拆：

- **children 是"已经渲染好的结果"**：`ProductSpecs` 在服务器渲染成 HTML/虚拟 DOM 描述，作为 props 序列化传给客户端组件——穿过边界的不是"组件"，是渲染产物。所以交互壳不需要知道也不需要拿到 ProductSpecs 的代码。
- **数据方向没有违规**：`productId`、`price` 是纯数据，能过河；交互壳内部的状态变化只影响自己的 UI。
- **这个模式反过来读也成立**：看到"整个页面 use client"的提交，第一反应应该是——哪个子块其实是静态的？把它提出去当 children。
- 交互壳从 React.ReactNode 类型的 props 接 children/插槽，`React.ReactNode` 是可序列化 props 的官方类型表达。

同一思想最常见的三个变体：**主题切换器**（客户端组件包 `<html>`，`{children}` 透传整页内容）、**轮播/标签页容器**（客户端交互壳包服务器渲染的卡片列表）、**Suspense 边界内的骨架**（客户端骨架配合服务器流式内容，见第 3 篇）。

## 3. 第三方库包装层：补上缺失的 "use client"

多数现代组件库（图表、轮播）直接发布了带 `"use client"` 的构建产物，import 即用。但仍有不少库（尤其工具型组件、旧版库、部分 UMD 产物）没写指令，在服务器组件里 import 会报错：

```text
Error: You're importing a component that needs "useState".
It only works in a Client Component ...
```

标准解法是**包装层**：自己建一个标了 `"use client"` 的薄壳文件，在壳里 re-export 第三方组件：

```tsx
// components/charts.tsx —— 专门的客户端包装层
"use client"
import { BarChart } from "some-chart-lib"

export { BarChart }
// 或者包一层默认 props：
export function SalesBar({ data }: { data: { month: string; value: number }[] }) {
  return <BarChart data={data} height={280} />
}
```

```tsx
// app/dashboard/page.tsx —— 服务器组件照常取数
import { SalesBar } from "@/components/charts"

export default async function Dashboard() {
  const data = await db.sales.groupByMonthly()
  return <SalesBar data={data} />   // 纯数据过河，库的体积只进客户端包
}
```

拆解三个要点：

1. **包装层要薄**。只做"补指令 + 固定默认 props"两件事，业务逻辑不要写进来——它本质是给第三方库"登记户口"，不是二次封装。
2. **代价要心里有数**：整个库从此进入客户端 bundle（图表库动辄上百 KB）。所以包装层文件要按库拆分（charts.tsx、editor.tsx），配合动态 `next/dynamic` 懒加载，别让首页为一个图表背上编辑器的体积。
3. **报错不一定是缺指令**：库在模块顶层读取 `window`（SSR 阶段没有 window）时，即使加了 `"use client"` 仍会在预渲染阶段崩——此时需要 `next/dynamic` 的 `ssr: false`。两种故障的分辨：报错提到 Hook/事件处理器 → 补指令；报错 ReferenceError: window is not defined → 关 SSR。

## 4. 三个工程场景串联

### 4.1 电商商品页：边界下沉的完整样板

第 2 节的商品页就是场景一，边界划分的最终形态：页面骨架、规格表、评论列表全是服务器组件（各自可流式、可缓存），唯一的边界线画在"加购按钮"这一个叶子上。检验标准：浏览器 DevTools 的 Sources 里搜 `ProductSpecs`——搜不到，说明它没进 bundle；搜 `AddToCart`——搜得到，这是它应得的代价。

### 4.2 图表仪表盘：数据在下、图形在上

```tsx
// 服务器组件：聚合查询不进浏览器
export default async function Analytics() {
  const [visits, orders] = await Promise.all([db.visits.daily(), db.orders.daily()])
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <VisitsChart points={visits} />
      <OrdersChart points={orders} />
    </div>
  )
}
```

讲解：两个图表壳都是客户端组件（包装层产物），props 只传纯数据点。仪表盘的"重取数、轻交互"结构正好落在边界两侧——聚合查询享受服务器直连数据库与缓存（第 3 篇），图形渲染的体积被隔离在两个懒加载的壳里。若图表需要点击下钻，交互产生的路由跳转（`router.push`）仍在客户端壳内完成，不需要把取数逻辑搬过来。

### 4.3 主题切换器：包裹整棵树的边界

```tsx
// app/theme-provider.tsx
"use client"
import { createContext, useContext, useState } from "react"

const ThemeCtx = createContext<{ theme: string; toggle: () => void }>({ theme: "light", toggle: () => {} })

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState("light")
  return (
    <ThemeCtx.Provider value={{ theme, toggle: () => setTheme(t => t === "light" ? "dark" : "light") }}>
      <div data-theme={theme}>{children}</div>
    </ThemeCtx.Provider>
  )
}
```

```tsx
// app/layout.tsx —— 服务器组件
import { ThemeProvider } from "./theme-provider"
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <ThemeProvider>{children}</ThemeProvider>  {/* 整页内容穿过这个边界 */}
      </body>
    </html>
  )
}
```

讲解：这是"边界包裹整棵树"的特例——`children` 是服务器渲染的整页内容，穿过 ThemeProvider 时只带走了 provider 本身的代码。它演示了组合模式的上限：**边界可以很高，但代价只算边界内的代码**。反例是"为了主题切换把 layout 标 use client"——整棵树的每个页面都被拖进客户端，正是该用 children 穿透的信号。

## 5. 常见错误与对策

| 错误场景 | 报错/表现 | 原因 | 解决办法 |
| --- | --- | --- | --- |
| 整页 `use client` | bundle 巨大、LCP 变差 | 把交互边界划在了页面级 | 交互下沉到叶子，静态块用 children 穿透 |
| 给客户端组件传 `onClick` | 构建报错：Event handlers cannot be passed to Client Component props | 函数过不了序列化边界 | 行为写在客户端组件内部，或改用 Server Action 引用 |
| 客户端组件里读数据库 | 构建失败或密钥泄漏 | 边界内的一切 import 都进浏览器 | 取数留在服务器组件，传纯数据下来 |
| 传 ORM Model 实例 | 运行时方法丢失/序列化报错 | 类实例不保证可序列化 | 先转 plain object / ISO 字符串 |
| import 无指令的图表库 | You're importing a component that needs useState | 库没标 use client | 建包装层文件补指令 |
| 包装后报 window is not defined | 预渲染崩溃 | 库顶层读浏览器全局 | `next/dynamic` + `ssr: false` |

## 6. 动手实践

**任务一：体检现有页面。** 打开一个真实页面，在浏览器里列出进 bundle 的组件名（Sources 搜索或看 build 产物），找出一个"本可以在服务器"的组件，用 children 穿透重构它。提示：从"只有静态内容却被标了 use client"的组件下手；重构前后对比客户端 chunk 体积。

**任务二：函数走私实验。** 故意在服务器组件里给客户端组件传一个箭头函数，读懂报错；再用两种方式修复（行为下沉 / Server Action），说明各自适用场景。提示：报错信息里会明确列出"过不了河"的 prop 名；Server Action 适合"行为本身需要服务端权限"的场合（见第 5 篇）。

**任务三：给无指令库写包装层。** 挑一个没有 `"use client"` 的小型组件库，写包装层接入仪表盘，并用 next/dynamic 懒加载，确认首页 bundle 未增长。提示：包装文件顶部第一行就是指令；`next/dynamic(() => import(...), { ssr: false })` 处理读 window 的库。

先自己写，再对照参考实现：

<details>
<summary>任务二参考实现</summary>

```tsx
// 错误版本（服务器组件里）：
// <LikeButton onLike={() => api.like(post.id)} />   // 构建报错

// 修复 A：行为下沉——like 逻辑写进客户端组件（适合纯前端行为）
"use client"
export function LikeButton({ postId, liked }: { postId: string; liked: boolean }) {
  const [on, setOn] = useState(liked)
  return (
    <button onClick={() => setOn(!on)} aria-pressed={on} className="...">
      {on ? "已赞" : "点赞"}
    </button>
  )
}

// 修复 B：Server Action——行为必须发生在服务端（写库/鉴权）
// actions.ts（服务器）："use server" + export async function like(postId: string) {...}
// 客户端组件里 import { like } from "./actions" 后 onClick={like 的包装}
```

判断标准一句话：行为只改本地 UI → 下沉成内部状态；行为要动服务端数据 → Server Action。两者都不是"把函数当 props 传"，因为那条河上函数永远过不去（Server Action 传过去的是"服务端函数的引用"，由框架代理调用，与普通函数是两回事）。
</details>

<details>
<summary>任务三参考实现</summary>

```tsx
// components/editor-shell.tsx
"use client"
import dynamic from "next/dynamic"

// ssr: false：库顶层读 window，只能在浏览器加载
const MarkdownEditor = dynamic(() => import("light-editor").then(m => m.Editor), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse rounded-lg bg-gray-100" />,
})

export function EditorShell({ initial }: { initial: string }) {
  return <MarkdownEditor defaultValue={initial} />
}
```

```tsx
// app/edit/page.tsx（服务器组件）
import { EditorShell } from "@/components/editor-shell"
export default async function Page() {
  const doc = await db.doc.findFirst()
  return <EditorShell initial={doc.content} />
}
```

自检三步：构建日志确认编辑器库单独成 chunk（没有混进首页入口）；断网模拟（DevTools Network 面板设 Offline 后刷新）确认页面主体仍可渲染，编辑器区域显示 loading 占位；`ssr: false` 的组件不参与服务器预渲染，所以初始 HTML 里它不存在——这是代价，换来的是库代码完全不阻塞首屏。
</details>

## 7. 一句话记住

> `"use client"` 是子树边界不是组件标签：边界之内一切 import 都进浏览器；props 过河只认可序列化数据（函数与类实例不行）；服务器内容进客户端组件"内部"靠 children/插槽穿透而不是 import；第三方库缺指令就写薄包装层，读 window 的再加 ssr: false。

## 8. 相关阅读

- 两种组件的入门对比与后厨类比：[Next.js 16 起步](/nextjs/010-NextJS16Overview)
- 交互壳内发起的服务端变更：[Server Actions 与表单](/nextjs/050-ServerActionsForms)
- 服务器数据获取与缓存语义：[数据获取与缓存](/nextjs/030-DataFetchingCaching)

## 参考与致谢

- 边界规则、序列化支持类型与组合模式依据 Next.js 官方文档 Server and Client Components（MIT License 的官方文档站点）：https://nextjs.org/docs/app/getting-started/server-and-client-components
