---
order: 180
title: Next.js 应用的测试
module: 'nextjs'
category: 前端技术
difficulty: beginner
description: Next.js App Router 测试策略：Vitest + React Testing Library 测纯函数与同步组件（async 服务器组件的官方边界）、Route Handler 与 Server Action 的测试入口、Playwright 走真实渲染链路验证路由与表单，配购物车表单与列表页两个例子
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- 知识类别：Next.js 应用的分层测试——单元测试（Vitest）、组件测试（React Testing Library）、E2E 测试（Playwright）在 App Router 架构下的分工。
- 解决什么问题："服务器组件、客户端组件、Server Action、Route Handler 混在一棵树里，每个环节该用什么工具测、边界在哪"。
- 什么时候用到：给表单校验、数据变更逻辑补防线；上线前验证完整用户路径（进入页面 - 提交表单 - 看到结果）。
- Server Actions 的写法见[Server Actions 与表单](/nextjs/050-ServerActionsForms)，Route Handlers 见[Route Handlers 与 API](/nextjs/040-RouteHandlersApi)。

## 前置知识

- [Next.js 服务器组件与客户端组件边界](/nextjs/015-ServerClientComponents)：知道哪些代码跑在服务器、哪些进浏览器。
- [Next.js Server Actions 与表单](/nextjs/050-ServerActionsForms)：理解 action 函数的调用路径。

## 学习目标

- 能给项目配上 Vitest + React Testing Library，并说出官方对 async Server Components 的测试边界。
- 能用 zod schema 单测守住表单校验这类纯函数逻辑。
- 能测 Route Handler 与 Server Action：直接调用入口函数 + 数据库桩。
- 能用 Playwright 写"进入页面 - 操作 - 断言结果"的真实链路测试，覆盖单测够不到的渲染与路由集成。

## 0. 先想清楚测什么：App Router 的四层

Next.js 应用不是单一运行环境，测试工具必须按层选。按"离浏览器远到近"排成四层：

| 层 | 典型对象 | 工具 | 要验证什么 |
| --- | --- | --- | --- |
| 纯函数 | zod schema、金额计算、权限判断 | Vitest | 输入输出与边界值 |
| 组件（同步） | 客户端组件、无取数的展示组件 | Vitest + React Testing Library | 渲染结果与交互回调 |
| 服务端入口 | Route Handler、Server Action、async 服务器组件 | Vitest 直调 + 桩 / E2E | 输入校验、副作用、错误分支 |
| 完整链路 | 路由跳转、表单提交、真实渲染 | Playwright | 用户路径端到端可用 |

一条官方边界先记住：**Vitest 目前不支持 async 服务器组件**（异步服务器组件对测试生态还太新），官方建议这类组件直接交给 E2E 测试。所以"取数组件"的单元测试不要硬写——把取数逻辑抽成可桩化的纯函数，组件本身走 Playwright。

## 1. Vitest 配置与纯函数测试

### 1.1 最小配置

```bash
pnpm add -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom vite-tsconfig-paths
```

```ts
// vitest.config.mts
import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import tsconfigPaths from "vite-tsconfig-paths"

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: { environment: "jsdom" },
})
```

讲解：`@vitejs/plugin-react` 让 JSX 在测试里被正确转换；`vite-tsconfig-paths` 让 `@/lib/...` 别名与 tsconfig 一致——缺它时测试里的 import 全部报"找不到模块"，是装完就忘的头号坑；`environment: "jsdom"` 提供假 DOM 供组件渲染。

### 1.2 用 zod schema 当例子：表单校验的第一道防线

购物车结算表单的校验规则写成 zod schema——它是纯函数，不碰任何环境，是最值得测的单元：

```ts
// lib/cart-schema.ts
import { z } from "zod"

export const cartItemSchema = z.object({
  sku: z.string().min(1, "缺少商品编号"),
  quantity: z.number().int().min(1, "至少买 1 件").max(99, "单种商品最多 99 件"),
  coupon: z.string().regex(/^VIP-\d{4}$/, "优惠码格式不正确").optional(),
})

export type CartItem = z.infer<typeof cartItemSchema>
```

```ts
// lib/__tests__/cart-schema.test.ts
import { describe, expect, it } from "vitest"
import { cartItemSchema } from "../cart-schema"

describe("cartItemSchema", () => {
  const valid = { sku: "A-1024", quantity: 2 }
  it("接受合法输入", () => {
    expect(cartItemSchema.safeParse(valid).success).toBe(true)
  })
  it("拒绝 0 件与小数件", () => {
    expect(cartItemSchema.safeParse({ ...valid, quantity: 0 }).success).toBe(false)
    expect(cartItemSchema.safeParse({ ...valid, quantity: 1.5 }).success).toBe(false)
  })
  it("优惠码只能整体缺省，给错格式要报错", () => {
    expect(cartItemSchema.safeParse({ ...valid, coupon: "VIP" }).success).toBe(false)
  })
})
```

讲解：`safeParse` 不抛异常、返回结果对象，适合在测试与业务里统一走"成功/失败"分支；校验信息（第二参数）同时是给 Playwright 断言用的 UI 文案来源。schema 测试的价值在边界值——`quantity: 0`、`1.5`、`"01"` 这类人眼容易放过的输入，测试永不疲劳。

## 2. 组件测试：服务器与客户端组件的差别处理

### 2.1 客户端组件：像测普通 React 组件

```tsx
// components/add-to-cart.tsx
"use client"
import { useState } from "react"

export function AddToCart({ price, onSubmit }: { price: number; onSubmit: (qty: number) => void }) {
  const [qty, setQty] = useState(1)
  return (
    <div className="flex items-center gap-3">
      <button aria-label="减少数量" onClick={() => setQty(q => Math.max(1, q - 1))}>-</button>
      <output>{qty}</output>
      <button aria-label="增加数量" onClick={() => setQty(q => q + 1)}>+</button>
      <button onClick={() => onSubmit(qty)}>加入购物车 ¥{price * qty}</button>
    </div>
  )
}
```

```tsx
// components/__tests__/add-to-cart.test.tsx
import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { AddToCart } from "../add-to-cart"

describe("AddToCart", () => {
  it("两次加购后金额与回调数量正确", async () => {
    const onSubmit = vi.fn()
    render(<AddToCart price={100} onSubmit={onSubmit} />)
    await userEvent.click(screen.getByLabelText("增加数量"))
    await userEvent.click(screen.getByLabelText("增加数量"))
    expect(screen.getByRole("button", { name: "加入购物车 ¥300" })).toBeDefined()
    await userEvent.click(screen.getByRole("button", { name: /加入购物车/ }))
    expect(onSubmit).toHaveBeenCalledWith(3)
  })
  it("数量不能减到 0", async () => {
    render(<AddToCart price={100} onSubmit={() => {}} />)
    await userEvent.click(screen.getByLabelText("减少数量"))
    expect(screen.getByRole("status") ?? screen.getByText("1")).toBeDefined()
  })
})
```

讲解：测试用的是**用户视角查询**（`getByRole`/`getByLabelText`），而不是实现细节查询——这要求组件写上 aria 标签，测试与可访问性在这里互相成就。`vi.fn()` 桩掉回调，验证"交互发生了正确的副作用"，不关心回调内部。

### 2.2 服务器组件：两条路

同步服务器组件可以直接 render 测试；**async 服务器组件（含取数）不行**——官方边界，报错会是各种"不是函数"的诡异形态。工程解法是把取数抽走：

```tsx
// 数据访问层（可桩化）
// lib/products.ts
export async function listProducts() { /* db 查询 */ }

// 页面组件（薄壳，交给 Playwright 验证）
export default async function ProductsPage() {
  const items = await listProducts()
  return <ProductList items={items} />
}
```

```ts
// 单测只测数据层逻辑分支
import { describe, expect, it, vi } from "vitest"
vi.mock("@/lib/db", () => ({ db: { product: { findMany: vi.fn() } } }))

describe("listProducts", () => {
  it("空库存返回空数组而不是抛错", async () => {
    const { db } = await import("@/lib/db")
    vi.mocked(db.product.findMany).mockResolvedValue([])
    const { listProducts } = await import("@/lib/products")
    await expect(listProducts()).resolves.toEqual([])
  })
})
```

讲解：`vi.mock` 把数据库模块整体替换，数据层测试覆盖"查询失败/空结果/分页边界"这些分支；页面组件因为只剩"取数 + 渲染"两行，不值得单测，交给第 4 节的 E2E。这个分层让"async 组件不能单测"的限制几乎不构成损失。

## 3. 服务端入口测试：Route Handler 与 Server Action

### 3.1 Route Handler：把处理函数当 HTTP 单元调

Route Handler 导出的就是普通异步函数，测试时构造 Request、断言 Response：

```ts
// app/api/cart/route.ts
import { NextResponse } from "next/server"
import { cartItemSchema } from "@/lib/cart-schema"

export async function POST(request: Request) {
  const body = await request.json()
  const parsed = cartItemSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "参数不合法" }, { status: 400 })
  }
  // ...写库逻辑
  return NextResponse.json({ ok: true })
}
```

```ts
// app/api/cart/__tests__/route.test.ts
import { describe, expect, it, vi } from "vitest"
import { POST } from "../route"

vi.mock("@/lib/cart-db", () => ({ addToCart: vi.fn().mockResolvedValue(undefined) }))

describe("POST /api/cart", () => {
  const makeReq = (body: unknown) =>
    new Request("http://localhost/api/cart", {
      method: "POST",
      body: JSON.stringify(body),
    })

  it("非法参数返回 400", async () => {
    const res = await POST(makeReq({ sku: "", quantity: 0 }))
    expect(res.status).toBe(400)
  })
  it("合法参数返回 200", async () => {
    const res = await POST(makeReq({ sku: "A-1024", quantity: 2 }))
    expect(res.status).toBe(200)
  })
})
```

讲解：不需要启动服务器——Next 的 Route Handler 函数签名就是标准 Web API（Request 进、Response 出），直接调用即可。数据库模块 mock 掉，专注测"校验分支 + 状态码契约"。

### 3.2 Server Action：同思路，加一个"重定向桩"

Server Action 是带 `"use server"` 的异步函数，测试思路相同：

```ts
// app/actions.ts
"use server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function checkout(formData: FormData) {
  const qty = Number(formData.get("quantity"))
  if (!Number.isInteger(qty) || qty < 1) return { error: "数量不合法" }
  await db.order.create({ data: { qty } })
  revalidatePath("/orders")
  redirect("/orders/success")
}
```

```ts
// __tests__/checkout.test.ts
import { describe, expect, it, vi } from "vitest"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
// redirect 在 next/navigation 中会抛特殊错误来中断执行，桩成记录调用即可
vi.mock("next/navigation", () => ({ redirect: vi.fn() }))
vi.mock("@/lib/db", () => ({ db: { order: { create: vi.fn().mockResolvedValue(null) } } }))

describe("checkout action", () => {
  it("非法数量直接返回错误且不写库", async () => {
    const { checkout } = await import("@/app/actions")
    const { db } = await import("@/lib/db")
    const result = await checkout(new FormData())
    expect(result).toEqual({ error: "数量不合法" })
    expect(db.order.create).not.toHaveBeenCalled()
  })
})
```

讲解：`revalidatePath` 与 `redirect` 必须桩掉——前者需要请求上下文，后者靠抛出特殊错误中断函数流。这两个 mock 是 Server Action 测试的固定开场白，缺了就是一堆上下文报错。

## 4. Playwright：真实渲染链路

单测验证不了"路由跳转后布局没坏""表单提交后真的跳到了成功页"——这些横跨渲染、路由、服务端的集成行为，交给 Playwright 走真实浏览器：

```bash
pnpm add -D @playwright/test
pnpm exec playwright install chromium
```

```ts
// playwright.config.ts
import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  webServer: {
    command: "npm run start",          // CI 里先 build 再 start；本地调试可换 npm run dev
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
  use: { baseURL: "http://localhost:3000" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
})
```

### 4.1 场景一：购物车表单的完整链路

```ts
// e2e/checkout.spec.ts
import { expect, test } from "@playwright/test"

test("加入购物车并结算成功", async ({ page }) => {
  await page.goto("/products/a-1024")
  await page.getByRole("button", { name: "加入购物车" }).click()
  await page.getByRole("button", { name: "去结算" }).click()

  // 结算页：提交数量，断言 zod 校验失败文案与成功跳转
  await page.getByLabel("数量").fill("0")
  await page.getByRole("button", { name: "提交订单" }).click()
  await expect(page.getByText("至少买 1 件")).toBeVisible()   // 文案来自 schema

  await page.getByLabel("数量").fill("2")
  await page.getByRole("button", { name: "提交订单" }).click()
  await expect(page).toHaveURL(/\/orders\/success/)
})
```

讲解：注意中间那句断言——"至少买 1 件"正是第 1.2 节 schema 里的校验文案。这就是分层的意义：schema 单测保证规则正确，E2E 保证规则**真的接到了 UI 上**（某天有人换了输入组件忘了传校验结果，单测全绿、这条 E2E 会红）。测试跑在 `npm run start` 的生产构建上，比 dev 模式更接近线上真相。

### 4.2 场景二：列表页路由跳转断言

```ts
// e2e/products.spec.ts
import { expect, test } from "@playwright/test"

test("列表点击进入详情，返回后滚动位置保留", async ({ page }) => {
  await page.goto("/products")
  await expect(page.getByRole("listitem")).toHaveCount(12)

  await page.getByRole("link", { name: /缓震跑鞋/ }).click()
  await expect(page).toHaveURL(/\/products\/a-1024/)
  await expect(page.getByRole("heading", { name: "缓震跑鞋 Pro" })).toBeVisible()

  await page.goBack()
  await expect(page).toHaveURL(/\/products/)
})
```

讲解：列表到详情的往返是 App Router 预取与缓存的集成敏感区——单测完全覆盖不到。断言 URL 与标题而不是 CSS 类名，测试才不会因样式重构误报。

## 5. 常见错误与对策

| 错误场景 | 报错/表现 | 原因 | 解决办法 |
| --- | --- | --- | --- |
| 测试里 import `@/lib` 失败 | Cannot find module | 缺 vite-tsconfig-paths | 加插件并放在 react 插件前 |
| 单测 async 服务器组件 | 各种"not a function"/渲染失败 | Vitest 不支持 async Server Components | 取数抽到数据层单测；组件走 E2E |
| Server Action 测试报上下文错误 | revalidate/redirect 相关异常 | 未桩掉 next/cache 与 next/navigation | 固定开场白：mock 两个模块 |
| E2E 用 dev 服务器 | 结果不稳定、速度慢 | dev 有按需编译等噪声 | webServer 用 build + start |
| 测试断言 CSS 类名 | 样式重构后测试成片变红 | 断言了实现细节 | 改用 role/name/文本断言 |

## 6. 动手实践

**任务一：schema 防线。** 给一个真实表单（登录、下单均可）写 zod schema 与至少 5 个边界用例，故意写错一条规则让测试变红，再修复。提示：边界值从"空、0、超长、非法格式、缺字段"里挑；用 `safeParse` 断言而不是 try/catch。

**任务二：Route Handler 契约测试。** 给一个真实 API 路由写 400/200 两条用例，把"校验文案"与 schema 共享成同一来源。提示：处理函数直调；`new Request(url, { method, body })` 构造请求。

**任务三：一条 E2E 主路径。** 挑应用里最重要的用户路径（登录后进列表、点进详情、提交表单），写一条 Playwright 用例跑通生产构建。提示：webServer 配 build + start；断言用 role/文本；先本地跑 `pnpm exec playwright test --headed` 看着浏览器跑一遍。

先自己写，再对照参考实现：

<details>
<summary>任务一参考实现</summary>

```ts
// lib/login-schema.ts
import { z } from "zod"

export const loginSchema = z.object({
  phone: z.string().regex(/^1\d{10}$/, "手机号格式不正确"),
  password: z.string().min(8, "密码至少 8 位").max(64, "密码过长"),
})
```

```ts
// lib/__tests__/login-schema.test.ts
import { describe, expect, it } from "vitest"
import { loginSchema } from "../login-schema"

describe("loginSchema", () => {
  it.each([
    ["", "缺少手机号与密码"],
    ["12345678901", "手机号缺第 11 位应拒绝"],
    ["1234567890a", "手机号含字母应拒绝"],
  ])("手机号 %s 应被拒绝（%s）", (phone) => {
    const r = loginSchema.safeParse({ phone, password: "12345678" })
    expect(r.success).toBe(false)
  })
  it("密码 7 位拒绝、8 位通过", () => {
    expect(loginSchema.safeParse({ phone: "12345678901", password: "1234567" }).success).toBe(false)
    expect(loginSchema.safeParse({ phone: "12345678901", password: "12345678" }).success).toBe(true)
  })
})
```

`it.each` 把"同一规则、多组输入"的用例压成一张表，报错时直接打印每个用例的语义说明——比五行重复的 it 好维护。故意写错规则的实验（比如把 min(8) 写成 min(6)）让"密码 7 位拒绝"用例变红，这个红色就是测试在替你守门。
</details>

<details>
<summary>任务三参考实现</summary>

```ts
// e2e/auth-flow.spec.ts
import { expect, test } from "@playwright/test"

test("登录后访问订单页", async ({ page }) => {
  await page.goto("/login")
  await page.getByLabel("手机号").fill("13800000000")
  await page.getByLabel("密码").fill("password123")
  await page.getByRole("button", { name: "登录" }).click()

  // 登录成功：跳转并能看到受保护内容（中间件写入会话，见第 8 篇）
  await expect(page).toHaveURL(/\/dashboard/)
  await expect(page.getByRole("heading", { name: "我的订单" })).toBeVisible()

  // 会话保持：新开页面仍已登录（cookie 生效的实证）
  const second = await page.context().newPage()
  await second.goto("/dashboard")
  await expect(second.getByRole("heading", { name: "我的订单" })).toBeVisible()
})
```

三个设计决定：走 UI 登录而不是 API 预置登录态（首次就该验证真实路径；量大后再谈 API 优化）；最后一步用同 context 新开页面验证会话——把"中间件鉴权"这个横切行为也纳入 E2E；全部断言用 URL 与 role，不碰类名。E2E 的纪律是**少而关键**：每个应用挑三五条主路径，其余交给分层单测。
</details>

## 7. 一句话记住

> 按层选工具：纯函数与 schema 用 Vitest 边界值打表；同步客户端组件用 Vitest + RTL 的用户视角断言；async 服务器组件不在单测范围（官方边界），取数抽到数据层、组件走 E2E；Route Handler/Server Action 直调 + 桩掉 next/cache 与 next/navigation；Playwright 用 build + start 跑三五条主路径，断言 URL 与 role 而不是类名。

## 8. 相关阅读

- Server Action 的完整写法与重定向语义：[Server Actions 与表单](/nextjs/050-ServerActionsForms)
- Route Handler 的请求响应契约：[Route Handlers 与 API](/nextjs/040-RouteHandlersApi)
- E2E 覆盖的路由行为细节：[App Router 路由系统](/nextjs/020-AppRouterRouting)

## 参考与致谢

- Vitest 安装、配置与 async 服务器组件限制依据 Next.js 官方文档 How to set up Vitest with Next.js（MIT License 的官方文档站点，版本 16.3.8）：https://nextjs.org/docs/app/guides/testing/vitest
- Playwright 的 webServer 配置模式依据 Playwright 官方文档（Apache-2.0）：https://playwright.dev/docs/test-web-server
