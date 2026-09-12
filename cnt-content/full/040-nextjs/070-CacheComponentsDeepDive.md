---
order: 70
title: 缓存体系与 Cache Components 深入
module: 'nextjs'
category: 前端技术
difficulty: advanced
description: Next.js 16 缓存模型全景：use cache 指令、cacheLife 七档 profile、cacheTag 与 updateTag 按需失效、PPR 静态壳与动态洞，以及从传统缓存语义到新模型的完整迁移映射。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'nextjs/030-DataFetchingCaching'
  - 'nextjs/060-RenderingStrategies'
  - 'nextjs/090-DeploymentOptimization'
prerequisites:
  - 'nextjs/030-DataFetchingCaching'
---
## 前置知识

建议先阅读以下内容再进入本文：

- [Next.js 数据获取与缓存](/nextjs/030-DataFetchingCaching)

## 0. 一句话理解

> Cache Components 是 Next.js 16 的新缓存模型：**一切默认动态执行，想缓存的地方用 `'use cache'` 显式声明**，缓存多久用 `cacheLife` 声明，按需失效用 `cacheTag` + `updateTag`/`revalidateTag`；静态部分预渲染成"壳"秒开，动态部分在 `<Suspense>` 里流式补齐——这就是 PPR（部分预渲染）。

前置知识：本篇默认你已读完第 3 篇《Next.js 数据获取与缓存》（四层缓存地图、15 的 fetch 默认语义）与第 6 篇《渲染策略与缓存》（SSG/ISR/SSR 选型）。本篇是两者的进阶合流：把"缓存"从框架的隐式行为，变成写在代码里的显式声明。

学习目标：

1. 能说出 Cache Components 相对传统模型的三点本质变化（默认动态、显式缓存、静态/动态同页共存）。
2. 会用 `'use cache'` 的函数级、组件级、文件级三种写法，并说清缓存键的构成与序列化限制。
3. 会用 `cacheLife` 的 stale/revalidate/expire 三参数与七个内置 profile 精确控制缓存生命周期。
4. 会区分 `updateTag`、`revalidateTag`、`refresh` 三个失效 API 的语义与调用位置。
5. 能把传统写法（路由段配置、fetch 选项、`unstable_cache`）逐一映射到新模型。

## 1. 演进史：缓存为什么必须"显式化"

Next.js 的缓存语义经历过三个阶段，理解这条线，就能理解新模型的每个设计决定：

| 阶段 | 默认行为 | 问题 |
| --- | --- | --- |
| 13/14 时代 | fetch 默认进数据缓存、Router Cache 自动缓存页面 | "为什么页面没更新"成为第一高频疑难；缓存发生在开发者看不见的地方 |
| 15（2024-10） | 反转默认值：fetch 默认不缓存、GET 接口不缓存、页面段不再进客户端缓存 | 缓存可控了，但"缓存了几层、每层存多久"仍分散在路由段配置、fetch 选项、staleTimes 等多处 |
| 16（2025-10） | Cache Components：**一切默认动态，缓存全靠 `'use cache'` 显式声明** | 学习成本前置，换来"看代码即知缓存行为"与静态/动态自由组合 |

**类比**：13/14 像入住酒店时房间冰箱"默认随便吃、退房统一结算"——方便但退房时账单吓人；15 相当于冰箱改成"默认锁上，想要扫码开锁"；16 则是干脆搬走冰箱，给你一张 explicit 的菜单：想吃什么写下来（`'use cache'`），写多久保鲜（`cacheLife`），什么时候主动换货（`cacheTag`）。

为什么值得再学一套模型？两个硬收益：

1. **同一路由内静态与动态共存**（PPR 落地）。过去一个页面要么整页静态、要么整页动态；商品页的"商品描述"（稳定）与"实时价格"（动态）不得不绑成一种策略。
2. **导航即时性有保障**。框架在开发期校验每个路由能否"点击即切换"（instant navigation），把会阻塞预取的代码以错误/洞察形式报给你，而不是上线后靠用户感知。

## 2. 启用与游戏规则

```ts
// next.config.ts
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  cacheComponents: true, // 16 起的稳定开关；取代旧的 experimental.dynamicIO / ppr / useCache
}

export default nextConfig
```

启用后，四条硬性规则立即生效：

1. **一切默认动态**：页面、布局、接口里的代码默认每次请求执行；没有 `'use cache'` 的取数不会被缓存。传统模型的 `dynamic = "force-dynamic"` 不再需要（本来就已全动态）。
2. **旧的路由段配置报错**：启用后导出 `dynamic`、`revalidate`、`fetchCache`、`dynamicParams` 的路由段会在构建时直接报错——它们被 `use cache` + `cacheLife` 体系取代（映射表见第 7 节）。
3. **只支持 Node.js 运行时**：`runtime = 'edge'` 已废弃且与 Cache Components 不兼容；静态导出（`output: "export"`）同样不支持。
4. **动态读取必须能"避开壳"**：`cookies()`、`headers()`、`searchParams` 以及依赖动态参数的读取要放进 `<Suspense>` 边界内，否则开发期会收到 blocking-prerender 类洞察/错误——因为它们会让静态壳无法预渲染。

存量项目不必一次改完：给还没准备好改造的页面、布局加 `export const instant = false` 可以**暂缓**导航即时性校验（注意它只是"允许阻塞"，并不把页面变成全动态；`new Date()`、`Math.random()` 这类同步 IO 造成的构建错误它也救不了，见第 6 节末尾）。官方还提供了 `cache-components-instant-false` codemod 一键给全应用加豁免，随后逐路由回收。

## 3. 'use cache'：把缓存写进代码

### 3.1 三个声明层级

```tsx
// 层级一：函数级——最常用，任何 async 函数都可以
export async function getProductList() {
  "use cache" // 这个函数的返回值进入缓存，同参数调用直接复用
  const res = await fetch("https://api.example.com/products")
  return res.json()
}

// 层级二：组件级——缓存整个组件的渲染输出
export async function ProductCard({ id }: { id: string }) {
  "use cache"
  const product = await getProduct(id) // 组件内的取数一并被缓存
  return <article>{product.name}</article>
}

// 层级三：文件级——文件顶部声明，覆盖所有导出（每个导出都必须是 async）
"use cache"

export async function getMonthlyReport() {
  return db.orders.aggregate() // 文件内导出函数全部可缓存
}
```

**讲解：**

1. 缓存的是**返回值/渲染输出**，不是"执行过程"：相同输入第二次调用时函数体根本不执行，直接返回上次序列化的结果。
2. 页面与布局也是模块：在 `page.tsx` 顶部加 `'use cache'` 即缓存整个路由段；想让整条路由都预渲染，page、layout、并行路由槽都要加（`layout` 缓存的只是自己的壳，`children` 作为组合槽穿透，不会被连带缓存）。
3. 在启用 `cacheComponents` 的项目里，缓存函数内部的所有 fetch 自动进缓存，不再需要（也不该再写）`cache: "force-cache"` 之类的选项。
4. 框架导出（`generateMetadata`、`generateStaticParams`）在文件级 `'use cache'` 下同样被覆盖，因此必须写成 async。

### 3.2 缓存键：什么决定"命中"

一条缓存条目的键由四部分构成：

1. **构建 ID**：每次构建唯一，新部署天然作废旧缓存（配置了 `deploymentId` 则以它为准）；
2. **函数 ID**：函数在代码中的位置与签名的安全哈希——改了代码位置即换键；
3. **可序列化参数**：组件的 props 或函数入参（如 `getProduct(id)` 的 `id`，每个 id 一条缓存）；
4. **HMR 哈希**（仅开发环境）：热更新时作废开发缓存。

一个容易被忽略的细节：**闭包变量会被自动捕获为参数**。在组件内部定义并使用了外层 `userId` 的缓存函数，`userId` 会成为缓存键的一部分——不同用户天然隔离，但也意味着"用户级缓存条目"会随用户数增长，要想清楚这是不是你想要的。

### 3.3 序列化与约束

缓存条目要跨越"执行 -> 存储 -> 复用"的边界，入参和返回值都必须可序列化（React RSC 序列化体系）：

| 类别 | 入参 | 返回值 |
| --- | --- | --- |
| 基础类型/普通对象/数组 | 可以 | 可以 |
| Date、Map、Set、TypedArray | 可以 | 可以 |
| JSX 元素 | 仅作 pass-through（不读取、只透传） | 可以 |
| 类实例、函数、Symbol、URL | 不可以 | 不可以 |

```tsx
// pass-through：children 可以是任何东西，只要缓存组件"不看它"
async function CachedShell({ children }: { children: React.ReactNode }) {
  "use cache"
  return (
    <section>
      <h2>本站公告（缓存壳的一部分）</h2>
      {children} {/* 动态内容原样透传，不影响缓存条目 */}
    </section>
  )
}
```

**讲解：**

1. 约束一：缓存函数内**不能读请求时 API**——`cookies()`、`headers()`、`searchParams` 以及调用链上任何间接读取都会报 `next-request-in-use-cache` 错误。正确姿势是在缓存作用域之外读，把值作为参数传进来。
2. 约束二：`React.cache` 的作用域在每个缓存函数内是隔离的，不能靠它把外部数据"带进"缓存作用域——用参数。
3. 约束三：本篇示例都假设启用 `cacheComponents`；未启用时 `'use cache'` 不可用（15 时代它曾以实验旗标存在，16 转正并更名）。

## 4. cacheLife：三参数讲清"存多久"

`cacheLife` 必须写在 `'use cache'` 作用域内（不能在模块顶层调用），用三个时间参数描述一条缓存的一生：

| 参数 | 控制的是 | 超时后的行为 |
| --- | --- | --- |
| `stale` | **客户端**：浏览器路由缓存可以直接用缓存、不发请求的时长 | 过期后导航需向服务器确认 |
| `revalidate` | **服务端**：后台再生的周期（类比 ISR 的 revalidate） | 到期后的下一个请求先拿旧值，后台再生 |
| `expire` | **服务端**：绝对寿命上限 | 过期且无流量后，下一个请求**同步等待**新鲜内容（不再回旧值） |

七个内置 profile（不调用 `cacheLife` 时应用 `default`）：

| profile | stale | revalidate | expire | 典型内容 |
| --- | --- | --- | --- | --- |
| `default` | 5 分钟 | 15 分钟 | 永不过期 | 通用默认 |
| `seconds` | 30 秒 | 1 秒 | 1 分钟 | 盘口、比分等准实时数据 |
| `minutes` | 5 分钟 | 1 分钟 | 1 小时 | 社交信息流、新闻 |
| `hours` | 5 分钟 | 1 小时 | 1 天 | 商品库存、天气 |
| `days` | 5 分钟 | 1 天 | 1 周 | 博客文章 |
| `weeks` | 5 分钟 | 1 周 | 30 天 | 播客、周刊 |
| `max` | 5 分钟 | 30 天 | 1 年 | 法律文本、归档内容 |

```tsx
import { cacheLife } from "next/cache"

export async function getPost(slug: string) {
  "use cache"
  cacheLife("days") // 每天更新一次的内容；官方建议每个 use cache 都显式声明 profile
  return fetchPost(slug)
}
```

**讲解：**

1. **预渲染阈值**：`revalidate: 0` 或 `expire` 小于 5 分钟的缓存会在预渲染时被排除，成为请求时才填充的"动态洞"；`stale` 不足 30 秒同样被排除（预取还没被点就过期了，没有意义）。七个内置 profile 里只有 `seconds` 落入动态洞区间。这就是"缓存时长"与"静态壳"之间的自动权衡。
2. `stale` 传给客户端走的是 `x-nextjs-stale-time` 响应头，客户端路由强制 30 秒下限；Server Action 里的失效调用会立即清空客户端缓存、无视 stale。
3. profile 可以在 `next.config.ts` 的 `cacheLife` 字段自定义或覆盖内置项（如自定义 `biweekly`），也可以在调用处传内联对象 `{ stale, revalidate, expire }` 做一次性配置；省略的字段继承 `default`。
4. **嵌套规则**：外层缓存显式声明了 `cacheLife` 就用自己的；没声明则用 `default`，且内层更短的寿命会"传染"拉低外层。为防止意外的静默降级，把短寿命缓存嵌进未声明 `cacheLife` 的外层会在预渲染时直接报错——修复方式是给外层显式加 `cacheLife`。这也是官方强烈建议"每处 use cache 都写明 profile"的原因：让每个调用点的行为一眼可判。

## 5. cacheTag 与失效三件套

时间再生之外，写操作后需要按需失效。先在缓存作用域内打标签：

```tsx
import { cacheLife, cacheTag } from "next/cache"

export async function getProducts() {
  "use cache"
  cacheLife("hours")
  cacheTag("products") // 打上标签，之后可按标签整体失效
  return fetchProducts()
}
```

然后按语义三选一（旧模型的 `fetch` 的 `next.tags` 选项被 `cacheTag` 取代）：

| API | 语义 | 调用位置 | 典型场景 |
| --- | --- | --- | --- |
| `updateTag(tag)` | **读自己写的**：失效后立刻读新数据 | 仅 Server Action | 用户改完个人资料立刻看到新值 |
| `revalidateTag(tag, profile)` | **SWR**：先回旧值、后台再生；profile 必填（推荐 `'max'`） | Server Action 与 Route Handler | CMS 发布文章、Webhook 通知 |
| `refresh()` | **只刷新未缓存数据**：不碰任何缓存 | 仅 Server Action | 已读消息后刷新头部未读数 |

```ts
// app/actions.ts —— 表单改完立见（读自己写的）
"use server"

import { updateTag } from "next/cache"

export async function updateProduct(id: string, data: ProductInput) {
  await db.product.update({ where: { id }, data })
  updateTag(`product-${id}`) // 下一个请求等待新鲜数据，用户不会看到旧价格闪一下
}
```

```ts
// app/api/webhook/route.ts —— CMS 回调，允许短暂旧值（SWR）
import { revalidateTag } from "next/cache"

export async function POST() {
  revalidateTag("products", "max") // 16 起第二个参数必填；单参数写法已废弃
  return Response.json({ ok: true })
}
```

**讲解：**

1. **为什么 `revalidateTag` 要加 profile**：单参数旧语义是"立即失效、下个请求同步再生"，高并发下容易造成缓存击穿；新签名明确了"旧值还能被端多久"。需要"写后立读"就用 `updateTag`——两者语义互补而不是二选一。
2. `revalidatePath` 保持原样、不受影响；`updateTag`/`refresh` 在 Server Action 之外调用会直接抛错，Route Handler 或 Webhook 里只能用 `revalidateTag`。
3. 失效会同时清空服务端缓存与客户端路由缓存（客户端的 stale 时长被无视），保证全链路一致。

## 6. PPR：静态壳与动态洞的完整示例

Cache Components 的落点是 PPR（Partial Prerendering，部分预渲染）：构建期把"能确定的部分"预渲染成静态壳（App Shell），请求时秒发；动态读取所在的 `<Suspense>` 边界成为"洞"，由流式响应补齐。

```tsx
// app/products/[id]/page.tsx —— 电商商品页：静态壳 + 动态价格
import { Suspense } from "react"
import ProductInfo from "./product-info" // 商品名、描述、图集：稳定内容
import LivePrice from "./live-price" // 实时价格：每次请求都该新鲜

export default function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  // 关键技巧：不在页面顶层 await params！
  // 把 Promise 原样传下去，让未知参数也能预渲染出壳
  return (
    <main>
      <ProductInfo params={params} />
      <Suspense fallback={<p>价格加载中……</p>}>
        <LivePrice params={params} />
      </Suspense>
    </main>
  )
}
```

```tsx
// app/products/[id]/product-info.tsx —— 壳的一部分：显式缓存
import { cacheLife, cacheTag } from "next/cache"

export default async function ProductInfo({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params // 在缓存组件内 await，id 自动成为缓存键
  const product = await getProduct(id) // getProduct 内含 'use cache' + cacheLife('hours')
  return <article>{product.description}</article>
}
```

```tsx
// app/products/[id]/live-price.tsx —— 动态洞：不声明缓存即每次执行
export default async function LivePrice({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const price = await fetchLatestPrice(id) // 无 'use cache' => 请求时实时执行
  return <strong>￥{price}</strong>
}
```

登录态、主题偏好这类"读请求"的内容同理：把 `(await cookies()).get(...)` 下沉到 `<Suspense>` 包住的子组件里，页面的其余部分照常进壳。一个特例值得知道：如果 Cookie 驱动的是根布局 `<html>` 上的属性（`lang`、`data-theme` 等），整个子树都会被绑到请求上——官方推荐用一段内联脚本在绘制前设置属性，保住静态壳。

**同步 IO 陷阱**：预渲染期的壳里不允许 `new Date()`、`Date.now()`、`Math.random()`、`crypto.randomUUID()` 这类"每次执行结果都不同"的同步调用，构建会直接报错，且 `instant = false` 也无法豁免。修复思路一致：把调用挪进 `<Suspense>` 内的动态区（或客户端组件）；确需在服务端动态区触发时，可在读取前调用 `connection()` 显式声明"我要切换到请求时执行"。

## 7. 传统模型 -> 新模型映射表

迁移不用死记：传统模型里的每个缓存手段，在新模型里都有唯一对应物。

| 传统写法（16 未启用 cacheComponents 时仍可用） | 新模型写法 | 说明 |
| --- | --- | --- |
| `export const revalidate = 3600` | `'use cache'` + `cacheLife('hours')` | 数值对不上内置 profile 就取近似或自定义 |
| `export const dynamic = "force-static"` | `'use cache'` + `cacheLife('max')` | 启用后原配置直接报错 |
| `export const dynamic = "force-dynamic"` | 删除即可 | 新模型本来就全动态 |
| `export const fetchCache = "force-cache"` | 删除，取数放进 `'use cache'` 作用域 | 缓存作用域内的 fetch 自动缓存 |
| `fetch(url, { cache: "force-cache", next: { revalidate, tags } })` | `'use cache'` + `cacheLife` + `cacheTag` | fetch 选项淡出；注意持久性差异（见第 8 节） |
| `unstable_cache(fn, keys, { tags, revalidate })` | 改写为 `'use cache'` 函数 | 缓存键从参数自动推导，keyParts 不再需要 |
| `unstable_noStore()` | 删除 | 默认就不缓存；需要请求时执行用 `connection()` + `<Suspense>` |
| `export const dynamicParams = false` | 删除；未命中时在页面里 `notFound()` | `dynamicParams` 与新模型不兼容 |
| `generateStaticParams` 返回 `[]`（全部推迟到运行时） | 必须返回至少一条真实参数 | 空数组会报错；未列出的参数首次访问后升级为预渲染 |
| `middleware.ts` + `runtime='edge'` | `proxy.ts`（Node.js 运行时） | Cache Components 仅支持 Node 运行时 |

两个易踩的映射细节：

1. **GET Route Handler 不能直接标 `'use cache'`**（指令不能用在 GET 导出上）：把取数抽成缓存辅助函数，Handler 调它。Handler 遇到未缓存/运行时读取会以抛错方式退出预渲染，注意别让已有的 `try/catch` 把这个"退出信号"当成业务异常记录进日志。
2. **`generateMetadata` 与组件同规**：读外部数据要加 `'use cache'`；确需运行时数据时无法被 Suspense 包裹，官方做法是在页面里放一个"动态标记"组件（`await connection()` 的空组件包进 Suspense）让元数据走流式。

## 8. 运行时存储：内存、远程与部署边界

`'use cache'` 的默认实现是**服务器进程内的 LRU 内存缓存**（容量可用 `cacheMaxMemorySize` 配置），这带来一组必须正视的持久性事实：

| 环境 | 默认 `use cache` 的运行时表现 |
| --- | --- |
| Serverless（实例易逝） | 缓存条目基本不跨请求复用，每次冷启动重算；构建期预渲染不受影响 |
| 自托管单实例 | 条目跨请求持久，命中率最高 |
| 跨部署 | 构建 ID 变了缓存键就变，**任何部署都会让旧缓存全部作废** |

| 指令 | 存储位置 | 适合 |
| --- | --- | --- |
| `'use cache'` | 进程内存（默认） | 预渲染壳、单实例自托管 |
| `'use cache: remote'` | 平台提供的持久缓存 handler（Redis/KV 等） | Serverless 下需要跨请求、跨实例复用的运行时缓存 |
| `'use cache: private'` | 不落服务端缓存，请求级私有 | 合规要求下必须在缓存作用域读请求信息的少数场景 |
| 传统 fetch 数据缓存 | 持久缓存层 | 需要跨部署、跨实例存活的响应缓存（新模型下仍是独立一层，可继续用） |

**讲解：**

1. 判断口诀：**壳靠内存就够（预渲染在构建期完成），运行时热数据看部署形态**。Serverless 项目里"缓存了却没变快"，先查是不是默认内存缓存没跨请求复用。
2. 需要跨部署存活的旧数据，传统 fetch 数据缓存与 `unstable_cache` 反而更持久——这也是迁移指南提醒"两者语义并不等价"的原因：新模型换了"生命周期写在代码里"的清晰性，持久性默认值更保守。
3. 调试缓存行为：开发期缓存函数的 console.log 会带 `Cache` 前缀标注"命中回放"；生产可用 `NEXT_PRIVATE_DEBUG_CACHE=1` 输出命中/未命中日志。

## 9. 陷阱与调试清单

1. **构建挂起 50 秒超时**：报错"Filling a cache during prerender timed out"，几乎总是缓存作用域里 await 了外部创建的动态 Promise（把 `cookies()` 的 Promise 当 props 传入、从共享 Map 里取动态 Promise 等）。修复：在缓存作用域外 await 完再传纯值。
2. **`next-request-in-use-cache`**：缓存函数直接或间接读了 `cookies()`/`headers()`/`searchParams`。修复：外移读取、参数传入；改造困难时的合规逃生门是 `'use cache: private'`。
3. **嵌套短缓存报错**：`cacheLife('seconds')` 的组件被未显式声明 `cacheLife` 的外层 `'use cache'` 引用，预渲染报错。修复：给外层显式声明 profile。
4. **以为 `instant = false` 万事大吉**：它只是推迟导航校验；同步 IO（`new Date()` 等）导致的构建错误照报。
5. **在 Route Handler 里调 `updateTag`**：会抛错——它仅限 Server Action；Handler/Webhook 用 `revalidateTag(tag, profile)`。
6. **升级后旧写法报错却不知道原因**：启用 `cacheComponents` 后 `dynamic`/`revalidate`/`fetchCache`/`dynamicParams` 四个路由段配置全部非法，按第 7 节映射表逐一替换。

## 10. 实战场景：三类页面怎么落

**场景一：内容站（博客/文档，第 6 篇决策树中的 ISR 页）**

```tsx
// app/blog/[slug]/page.tsx
import { Suspense } from "react"
import { cacheLife, cacheTag } from "next/cache"

async function getPost(slug: string) {
  "use cache"
  cacheLife("days") // 文章日更粒度
  cacheTag(`post-${slug}`, "post-list")
  return fetchPost(slug)
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  return (
    <Suspense fallback={<article aria-busy="true">加载中……</article>}>
      <PostBody params={params} />
    </Suspense>
  )
}

async function PostBody({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await getPost(slug)
  return <article>{post.content}</article>
}
```

CMS 后台发布后走 Webhook：`revalidateTag("post-list", "max")`；全站静态壳 + 每日再生，成本最低。

**场景二：登录后仪表盘（SSR + 流式）**

无 `'use cache'` 的区域默认请求时执行；把实时卡片各自包进 `<Suspense>`，静态壳（侧边栏、布局）预取后秒开，逐卡流式补齐。某个卡片允许 1 分钟旧值？给它单独加 `'use cache'` + `cacheLife('minutes')`，粒度精确到卡片。

**场景三：写操作后的即时反馈**

用户提交表单（Server Action）-> 写库 -> `updateTag` 失效对应标签 -> 重渲染读到新数据，全程不需要客户端手动 `router.refresh()`；页面上"与本次写操作无关的未缓存数据"若也要刷新，追加一个 `refresh()` 即可。

## 小结

初学者要点：

- Cache Components = `'use cache'`（显式声明缓存）+ `cacheLife`（声明存多久）+ `cacheTag`（声明怎么失效）+ `<Suspense>`（声明动态在哪）。
- 默认一切动态；静态壳是"送"的，动态内容流式补齐。
- 失效三件套按语义选：`updateTag` 读自己写的、`revalidateTag(tag, profile)` 先旧后新、`refresh` 只刷未缓存数据。

进阶注意：

- 每处 `'use cache'` 都显式写 `cacheLife`，避免嵌套缓存的隐式传播与预渲染报错。
- 序列化限制、请求 API 禁区、同步 IO 禁区是三类最常见的构建/运行时错误来源，出错先查第 9 节清单。
- 存储默认是进程内存：Serverless 与多实例部署需要评估 `use cache: remote` 或保留传统 fetch 数据缓存；任何重新部署都会作废全部 `use cache` 条目。
- 该模型仍在新版本中快速演进（profile 数值、校验规则等以当前版本的官方文档为准），大版本升级前先读升级指南。

- 传统缓存语义（fetch 选项、四层缓存地图）的完整入门，见第 3 篇《Next.js 数据获取与缓存》。
- SSG/ISR/SSR 渲染选型与决策树，见第 6 篇《渲染策略与缓存》。
- 缓存对部署形态（Serverless/自托管/静态导出）的影响，见第 9 篇《Next.js 部署与性能优化》。
- Route Handler 的缓存语义与 `revalidateTag` 在接口层的用法，见第 4 篇《Route Handlers 与 API 设计》。
