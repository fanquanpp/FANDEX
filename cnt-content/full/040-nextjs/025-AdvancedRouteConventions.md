---
order: 50
title: Next.js 高级路由约定：平行路由与拦截路由
module: 'nextjs'
category: 前端技术
difficulty: beginner
description: App Router 两组高级文件约定：@slot 平行路由（并行渲染、default.tsx 兜底、独立 loading/error）与拦截路由（(.) (..) (...) 约定），配仪表盘多面板与商品模态框两个经典场景
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- 知识类别：App Router 的两组高级文件约定——平行路由（parallel routes，`@slot`）与拦截路由（intercepting routes，`(.)`/`(..)`/`(...)`）。
- 解决什么问题：单一 children 槽位表达不了的两类需求——同一版面里多个互相独立加载、独立导航的面板；以及"站内点击弹模态框、刷新/直达却是完整页面"的 URL 语义。
- 什么时候用到：仪表盘、社交信息流、带侧边栏多面板的后台；商品图集、登录弹窗、任何"内容有独立 URL 的弹层"。
- 基础文件约定（layout/page/loading/error）见[App Router 路由系统](/nextjs/020-AppRouterRouting)。

## 前置知识

- [Next.js App Router 路由系统](/nextjs/020-AppRouterRouting)：掌握 layout 嵌套、动态路由与 loading/error 文件。
- [Next.js 服务器组件与客户端组件边界](/nextjs/015-ServerClientComponents)：slot 本质是 React.ReactNode props，理解其序列化含义。

## 学习目标

- 能用 `@folder` 定义槽位，在 layout 里当 props 渲染，并说出"children 是隐式槽位"。
- 能用 `default.tsx` 处理硬导航后的槽位失配，解释为什么缺它就是 404。
- 能为每个槽位配置独立的 loading/error，实现面板级互不影响的加载。
- 能用 `(.)` 等约定实现"站内弹模态框、刷新直达完整页"的模态路由模式。

## 0. children 只有一个：两个真实痛点

基础 App Router 里，layout 的 children 只有一个槽——所有内容沿同一条路由树流动。这带来两个真实痛点：

痛点一，**仪表盘的"一人慢、全页等"**：布局里的数据总览、团队动态、图表三个面板挤在同一个 children 里，任何一个查询慢都会拖住整页。它们明明是三块互不相关的业务。

痛点二，**模态框的 URL 语义**：商品列表里点一张图弹出大图模态框。用户预期是——站内点击弹框、可分享 URL、刷新或分享给别人打开时看到完整详情页。单一 children 做不到"同一个 URL、两种呈现取决于怎么到达"。

平行路由解决痛点一，拦截路由解决痛点二，两者组合是官方推荐的模态路由完整解。

## 1. 平行路由：@slot 与多面板并行渲染

### 1.1 基本约定：@folder 即槽位

`@` 前缀的文件夹定义一个具名槽位，槽位以 props 形式传给同级的 layout：

```text
app/dashboard/
├── layout.tsx        # 同时接收 children、analytics、team
├── page.tsx          # children 槽（页面主体）
├── @analytics/
│   ├── page.tsx
│   └── loading.tsx   # 本槽位专属加载态
└── @team/
    ├── page.tsx
    └── loading.tsx
```

```tsx
// app/dashboard/layout.tsx
export default function DashboardLayout({
  children,
  analytics,
  team,
}: {
  children: React.ReactNode
  analytics: React.ReactNode
  team: React.ReactNode
}) {
  return (
    <main className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-4">
      <div className="lg:col-span-2">{children}</div>
      <section>{analytics}</section>
      <section>{team}</section>
    </main>
  )
}
```

要点拆解：

- **槽位不影响 URL**：`@analytics/page.tsx` 对应的还是 `/dashboard`，`@` 文件夹名只是 props 名。URL 结构仍由普通文件夹决定。
- **children 是隐式槽位**：`app/dashboard/page.tsx` 等价于 `app/dashboard/@children/page.tsx`——文档明说 children 不需要映射到文件夹，但它参与槽位机制的一切规则（包括下面的 default 兜底）。
- **独立流式渲染**：每个槽位可以有自己的 loading.tsx，Next 对各槽位独立流式——`@analytics` 的慢查询让本面板先显示骨架，`@team` 正常渲染，互不拖累。这正是痛点一的解。

### 1.2 default.tsx：硬导航后的失配兜底

槽位会记住各自的"当前子页"。软导航（站内 Link 点击）时 Next 做局部渲染：`@team` 跳到 `/settings`，`@analytics` 保持原状。但**硬导航**（刷新、直链、分享出去的 URL）时，URL 无法表达"另一个槽当时停在哪"，失配的槽位需要兜底：

```tsx
// app/dashboard/@analytics/default.tsx —— 刷新到 /settings 时，analytics 槽渲染这里
export default function Default() {
  return <div className="rounded-xl border p-4 text-sm text-gray-500">数据总览（刷新后回退）</div>
}
```

规则链条：失配槽位有 `default.tsx` 就渲染它；没有则整个页面 404——包括那些本来匹配良好的其他槽位。同理，children 作为隐式槽位，在"槽位 URL 与主页面组合"的页面里刷新时也需要 default 兜底。**调试口诀：刷新就 404，先找哪个槽缺 default。**

### 1.3 条件渲染与独立加载

槽位是 props，layout 可以按条件选择渲染哪个——官方权限面板的写法：

```tsx
// app/dashboard/layout.tsx：按角色渲染不同面板
import { checkUserRole } from "@/lib/auth"

export default function Layout({ user, admin }: { user: React.ReactNode; admin: React.ReactNode }) {
  return checkUserRole() === "admin" ? admin : user
}
```

必须知道的坑：**条件决定的是"给用户看哪个"，不是"跑哪个"**——两个槽位都在服务器执行了取数，落选槽的输出也会随响应发出。真正的权限控制必须在每个槽位内部（或数据访问层）做鉴权，layout 的三元表达式不是安全边界。另外同一层级的槽位渲染策略必须一致：一个槽位是动态渲染，同级所有槽位都会变动态，没法"一半预渲染一半请求时渲染"。

## 2. 拦截路由：同一个 URL 的两种到达方式

### 2.1 (.) 约定与图集模态框

拦截路由用文件夹名前缀声明"拦截谁的展示"：

| 前缀 | 拦截对象 |
| --- | --- |
| `(.)` | 同层级 |
| `(..)` | 上一层级（注意：按路由树层级，不是文件系统层级） |
| `(..)(..)` | 上两级 |
| `(...)` | app 根目录 |

经典场景：商品图集点击看大图。站内从列表点进去，弹模态框；刷新或分享 URL，直接进完整详情页：

```text
app/
├── layout.tsx             # 接收 children 与 modal 两个槽
├── page.tsx               # 商品列表
├── @modal/
│   ├── default.tsx        # 返回 null：默认不渲染模态层
│   └── (.)product/[id]/page.tsx   # 拦截同层 /product/[id]
└── product/[id]/page.tsx  # 完整详情页（直达/刷新落点）
```

```tsx
// app/layout.tsx
export default function RootLayout({ children, modal }: { children: React.ReactNode; modal: React.ReactNode }) {
  return (
    <html>
      <body>
        {modal}       {/* 模态层与主内容并排渲染 */}
        {children}
      </body>
    </html>
  )
}
```

```tsx
// app/@modal/(.)product/[id]/page.tsx —— 拦截版：包成模态框
import { Modal } from "@/components/modal"
import { ProductDetail } from "@/components/product-detail"

export default async function InterceptedProduct({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <Modal>
      <ProductDetail id={id} compact />   {/* 与完整页共用同一数据组件 */}
    </Modal>
  )
}
```

```tsx
// components/modal.tsx —— 客户端组件：关闭 = router.back()
"use client"
import { useRouter } from "next/navigation"

export function Modal({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative max-h-[80vh] w-[min(90vw,640px)] overflow-auto rounded-2xl bg-white p-6 shadow-2xl">
        <button
          onClick={() => router.back()}
          className="absolute right-3 top-3 rounded-full bg-gray-100 px-2 py-1 text-sm"
        >
          关闭
        </button>
        {children}
      </div>
    </div>
  )
}
```

到达方式的语义矩阵，这张表是整个模式的灵魂：

| 到达方式 | URL | 渲染 |
| --- | --- | --- |
| 列表页点 `<Link href="/product/42">` | /product/42 | 拦截路由：列表之上的模态框，列表上下文保留 |
| 直接输入/分享/刷新 | /product/42 | 完整详情页，模态槽由 default.tsx 渲染为 null |
| 模态内点"关闭"（router.back()） | 回到 / | 模态消失，历史栈干净 |
| 浏览器前进 | /product/42 | 模态重新出现 |

### 2.2 模态闭合的三个配套文件

拦截路由模式下"关闭"不是隐藏 DOM，而是让 URL 离开模态匹配范围。配套写法：

```tsx
// app/@modal/default.tsx —— 非模态 URL 时渲染 null（初始加载/刷新）
export default function Default() { return null }
```

```tsx
// app/@modal/page.tsx —— 回到 "/" 时也渲染 null（软导航离开模态）
export default function Page() { return null }
```

```tsx
// app/@modal/[...catchAll]/page.tsx —— 跳去其他任意页面时渲染 null
export default function CatchAll() { return null }
```

三个 null 的分工：default 管硬导航失配，page.tsx 管"回首页"这个具体目标，catch-all 管其余一切软导航目标。缺哪个，对应路径下模态框就会"赖着不走"——因为软导航到不匹配的 URL 时，槽位会保留上一个内容（第 1.2 节的规则反过来看就是坑）。

## 3. 常见错误与对策

| 错误场景 | 表现 | 原因 | 解决办法 |
| --- | --- | --- | --- |
| 刷新直接 404 | 页面整体 404 而非面板回退 | 失配槽位缺 default.tsx | 每个参与槽位（含 children 所在层）补 default |
| 模态框关不掉 | 跳走后模态还在 | 槽位缺 page.tsx / catch-all 的 null 兜底 | 三个配套 null 文件补齐 |
| 条件槽位鉴权失效 | 普通用户也能"看到" admin 数据 | layout 三元只决定展示，两个槽都在服务器跑了 | 槽位内部/数据层做真鉴权 |
| 拦截路径不生效 | 站内点击仍跳完整页 | 前缀层级写错（(..) 数错层） | 记住按路由树层级数，被拦截目标与拦截文件逐层对齐 |
| 槽位之间加载互相拖累 | 一个面板慢全页等 | 把面板写成了同一个 children 里的兄弟组件 | 拆成 @slot，各自配 loading |

## 4. 动手实践

**任务一：双面板仪表盘。** 用平行路由搭"课程列表（children）+ 学习统计（@stats）"仪表盘，给 @stats 写慢查询（`await new Promise(r => setTimeout(r, 2000))` 模拟）并配专属 loading 骨架，验证课程列表先渲染完成。提示：骨架样式写在 @stats/loading.tsx；观察浏览器 Network 的流式响应（HTML 分段到达）。

**任务二：default 兜底实验。** 在任务一基础上把 @stats 的子页 `/stats/weekly` 做出来，站内跳过去后刷新，分别删掉与保留 default.tsx 观察差异。提示：删掉 default 时整个 /stats/weekly 404——包括 children 槽；这就是"失配拖垮整页"的实证。

**任务三：通知中心模态框。** 实现"顶栏铃铛点击弹通知模态、刷新 /notifications 直达完整通知页"。提示：@modal/(.)notifications + @modal/default.tsx + @modal/[...catchAll] 三件套；模态内容与完整页复用同一个 NotificationList 服务器组件。

先自己写，再对照参考实现：

<details>
<summary>任务三参考实现</summary>

```text
app/
├── layout.tsx                      # { children, modal }
├── @modal/
│   ├── default.tsx                 # return null
│   ├── [...catchAll]/page.tsx      # return null
│   └── (.)notifications/page.tsx   # 拦截版
└── notifications/page.tsx          # 完整页
```

```tsx
// app/@modal/(.)notifications/page.tsx
import { Modal } from "@/components/modal"
import { NotificationList } from "@/components/notification-list"

export default async function NotificationsModal() {
  const items = await db.notification.list({ limit: 20 })   // 服务器直连取数
  return (
    <Modal>
      <NotificationList items={items} compact />
    </Modal>
  )
}
```

验证矩阵照第 2.1 节的表逐行走一遍：铃铛 `<Link href="/notifications">` 弹模态且列表页保留在背景；`router.back()` 关闭；直接输入 URL 得到完整页；模态开着时点侧栏其他菜单，模态随 catch-all 的 null 消失。四条全过，这套约定才算落地——它难的不是写，是把"到达方式决定呈现"的语义记进肌肉记忆。
</details>

## 5. 一句话记住

> 平行路由用 @slot 把一个 layout 拆成多个独立流式渲染的面板（children 是隐式槽位），硬导航失配靠 default.tsx 兜底、缺了就 404；拦截路由用 (.)/(..)/(...) 让"站内到达"渲染成模态、"直达刷新"渲染成完整页，闭合靠 default + page + catchAll 三个 null 兜底；条件槽位只管展示不管鉴权。

## 6. 相关阅读

- 基础文件约定与 loading/error：[App Router 路由系统](/nextjs/020-AppRouterRouting)
- 模态与交互壳的组件边界：[服务器组件与客户端组件边界](/nextjs/015-ServerClientComponents)
- 槽位独立流式与 Suspense 的关系：[数据获取与缓存](/nextjs/030-DataFetchingCaching)

## 参考与致谢

- 槽位约定、default 行为、条件渲染与模态模式依据 Next.js 官方文档 Parallel Routes / Intercepting Routes / default.js（MIT License 的官方文档站点，版本 16.3.8）：https://nextjs.org/docs/app/api-reference/file-conventions/parallel-routes
