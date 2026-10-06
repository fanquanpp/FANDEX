---
order: 60
title: 国际化路由与本地化
module: 'nextjs'
category: 前端技术
difficulty: beginner
description: '[lang] 动态段路由、proxy.ts 语言协商、字典加载策略与静态渲染的配合'
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- 知识类别：Next.js App Router 的国际化（i18n）——路由层语言前缀、请求层语言协商、内容层字典加载。
- 解决什么问题：多语言站点的 URL 怎么设计（/en/products 还是 Cookie 决定语言）、新访客按什么规则进对应语言、翻译文案放哪、怎么在不牺牲静态渲染的前提下完成以上全部。
- 什么时候用到：跨境电商多语言站点、文档站按浏览器语言跳转、SaaS 用户手动切换语言并记住偏好。
- 路由基础（动态段、generateStaticParams）见《App Router 路由》，请求拦截的完整用法（鉴权代理）见《认证、代理与安全》——本篇把 proxy 用在语言协商这一件事上。

## 0. 一句话理解

> 三层结构：URL 层用 `app/[lang]` 动态段把语言编码进路径；入口层用 `proxy.ts` 把无前缀请求按 Accept-Language（或用户 Cookie）重定向到对应语言；内容层用字典文件按 locale 加载翻译——服务器组件渲染字典，翻译文件不进客户端 bundle。

## 1. URL 层：app/[lang] 动态段

官方推荐的做法是把所有路由挪进 `app/[lang]`，让语言成为路由的一部分：

```tsx
// app/[lang]/page.tsx
export default async function Page({ params }: PageProps<'/[lang]'>) {
  const { lang } = await params   // 15+ 中 params 是 Promise，必须 await
  return <h1>{lang === 'zh-CN' ? '产品' : 'Products'}</h1>
}
```

```tsx
// app/[lang]/layout.tsx —— 根布局也搬进来，<html lang> 才能跟语言走
export default async function RootLayout({
  children,
  params,
}: LayoutProps<'/[lang]'>) {
  return (
    <html lang={(await params).lang}>
      <body>{children}</body>
    </html>
  )
}
```

**讲解：**

1. 根布局嵌进 `[lang]` 之后，`<html lang="...">` 能拿到当前语言——这对屏幕阅读器与浏览器翻译提示都是正确性要求，不只是 SEO 细节。
2. `params.lang` 是 `string` 类型，不校验直接用会把 `/foo/bar` 也当合法语言渲染出空翻译页面。正确姿势是 `hasLocale` 窄化 + `notFound()`（见第 3 节），让非法 locale 得到 404。
3. 易错点：**`generateStaticParams` 漏 locale 导致 404**。静态渲染依赖它枚举所有 locale（见第 4 节）；新增语言时只加了字典、忘了往 `generateStaticParams` 的返回数组里补一项，构建产物里就没有那个语言的路由，线上直接 404。新增语言的检查清单：字典文件、`locales` 数组、`generateStaticParams`，三处缺一不可。

## 2. 入口层：proxy.ts 语言协商

Next.js 16 起 `middleware.ts` 更名为 `proxy.ts`（导出函数同样叫 `proxy`），语义就是"请求进入应用前的代理"：

```ts
// proxy.ts（项目根目录）
import { NextResponse } from "next/server"
import { match } from "@formatjs/intl-localematcher"
import Negotiator from "negotiator"

const locales = ["zh-CN", "en-US", "ja-JP"]
const defaultLocale = "zh-CN"

// 协商优先级：用户显式选择的 Cookie > 浏览器 Accept-Language > 默认语言
function getLocale(request: Request): string {
  const cookieLocale = request.headers
    .get("cookie")?
    .match(/NEXT_LOCALE=(zh-CN|en-US|ja-JP)/)?.[1]
  if (cookieLocale) return cookieLocale

  const acceptLanguage = request.headers.get("accept-language") ?? ""
  return match(
    acceptLanguage.split(",").map((s) => s.split(";")[0]),
    locales,
    defaultLocale,
  )
}

export function proxy(request: Request) {
  const { pathname } = request.nextUrl
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`,
  )
  if (pathnameHasLocale) return   // 已带语言前缀：放行

  const locale = getLocale(request)
  request.nextUrl.pathname = `/${locale}${pathname}`
  return NextResponse.redirect(request.nextUrl)
}

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],   // 跳过内部路径、API 与静态文件
}
```

**讲解：**

1. 为什么协商放在 proxy 而不是页面里：`Accept-Language` 是请求头，页面若按请求头渲染就被拉进动态渲染，且没有前缀的 URL 会被搜索引擎当成重复内容。放进 proxy 做重定向，URL 规范化、页面保持静态。
2. 协商链的顺序是产品决策：Cookie 优先意味着"老用户永远得到他上次选的语言"，Accept-Language 只服务首次访问。把两者倒过来会出现"用户切了中文、刷新又变英文"的经典投诉。
3. `matcher` 的否定模式是易错区：`_next`（内部资源）、`api`（接口）、含 `.` 的路径（favicon.ico 等静态文件）都不该被重定向——漏了最后一条，`/robots.txt` 会被 302 到 `/zh-CN/robots.txt`。
4. 依赖说明：`negotiator` 解析 Accept-Language 权重，`@formatjs/intl-localematcher` 做区域回退匹配（请求要 `en-GB`、站点只有 `en-US` 时命中它）。两者都是官方示例指引的库，也可以手写简化版匹配。

## 3. 内容层：字典文件与加载策略

```json
// dictionaries/en.json
{ "products": { "cart": "Add to Cart" } }
```

```json
// dictionaries/zh-CN.json
{ "products": { "cart": "加入购物车" } }
```

```ts
// app/[lang]/dictionaries.ts
import "server-only"
import { notFound } from "next/navigation"

const dictionaries = {
  "en-US": () => import("./en.json").then((m) => m.default),
  "zh-CN": () => import("./zh-CN.json").then((m) => m.default),
  "ja-JP": () => import("./ja.json").then((m) => m.default),
}

export type Locale = keyof typeof dictionaries

export const hasLocale = (locale: string): locale is Locale =>
  locale in dictionaries

export const getDictionary = async (locale: Locale) => dictionaries[locale]()
```

```tsx
// app/[lang]/page.tsx
import { notFound } from "next/navigation"
import { getDictionary, hasLocale } from "./dictionaries"

export default async function Page({ params }: PageProps<'/[lang]'>) {
  const { lang } = await params
  if (!hasLocale(lang)) notFound()

  const dict = await getDictionary(lang)
  return <button>{dict.products.cart}</button>
}
```

**讲解：**

1. 每个语言是**动态 import**：构建器把各语言字典拆成独立 chunk，请求 zh-CN 的用户不会下载 ja-JP 的文案——这是"按需加载"而非"全部打进一个包"。
2. `import "server-only"` 是编译期保险丝：谁把这个文件 import 进客户端组件，构建直接失败。服务器组件渲染字典意味着翻译文件根本不出服务器，只有结果 HTML 下发。
3. **跨组件共享 locale**：组件树深处也要翻译时，逐层传 `lang`（prop drilling）很啰嗦。16 提供 `next/root-params`——`import { lang } from "next/root-params"` 后任意服务器组件可直接 `await lang()`，把取 locale 收进 `getDictionary` 内部，调用方不再传参。注意它只在服务器组件与服务器工具里可用，客户端组件拿不到。
4. 易错点：字典键用嵌套对象（`dict.products.cart`）时，翻译同事删键不会报编译错，页面渲染出 `undefined`。要么给字典上 TS 类型（`typeof en` 作为其他语言的形状约束），要么在 CI 里做键齐性检查。

## 4. 静态渲染：generateStaticParams 与 i18n 的配合

```tsx
// app/[lang]/layout.tsx
export async function generateStaticParams() {
  return [{ lang: "zh-CN" }, { lang: "en-US" }, { lang: "ja-JP" }]
}
```

**讲解：**

1. 有了它，三个语言 x 每条路由的组合在构建期全部预渲染，请求时直接返回静态 HTML——语言前缀只是路径的一部分，不破坏静态化。这与第 3 篇的静态渲染规则完全一致：`[lang]` 就是普通动态段，枚举了参数就能静态化。
2. 语言 x 内容双重枚举是乘法关系：3 语言 x 500 篇文章 = 1500 个静态页。构建时间可接受时这是最优解；内容量大时改用 ISR（补 `revalidate` 或 Cache Components），别为了"全静态"让构建跑一小时。
3. 用户手动切换语言 = 换一个 URL（`/en-US/products` -> `/zh-CN/products`），切换器只是个链接组件加一句 Cookie 写入；预取（Link 组件）让跨语言跳转和其他站内导航一样快。

## 5. 三个真实场景

**场景一：跨境电商中英日三语站点。** 商品详情页路由 `/[lang]/products/[id]`，`generateStaticParams` 返回 3 语言 x 热销 200 商品的组合做静态，长尾商品走动态渲染。proxy 的协商链是"Cookie > Accept-Language > 默认 zh-CN"——日本用户首次访问被 Accept-Language 送到 `/ja-JP/`，他手动切到英文后 `NEXT_LOCALE=en-US` 写入 Cookie，此后任何入口都稳定落在英文站。易错现场：上线日新增德语，字典与切换器都加了，`generateStaticParams` 忘了补，`/de-US` 全站 404，构建日志却全绿——因为参数枚举本来就是"白名单制"，少了不报错，只在访问时发现。

**场景二：文档站按浏览器语言首次跳转并记住偏好。** 开源项目文档站（类似本仓库的形态）：`/` 根路径没有语言前缀，proxy 把它重定向到协商出的语言；侧边栏的语言切换器做两件事——跳转对应语言的同一篇文档（按路由映射表）并写 Cookie。要点是"记住偏好"必须写 Cookie：只靠 Accept-Language 的话，用户在英文操作系统上每次都想看中文，每次都被送回英文。

**场景三：SaaS 用户手动切换 locale 后持久化。** 多租户 SaaS 的语言偏好属于"用户资料"而非"浏览器属性"：切换动作走 Server Action 把 locale 写进用户表，proxy 协商链升级为"已登录 -> 读用户资料（需要鉴权，proxy 里只查会话 Cookie 是否有效、具体语言由 layout 读）-> 未登录 -> Cookie -> Accept-Language"。工程上的取舍：proxy 里不查数据库（每次请求都过），语言偏好随用户会话在页面层读取——这就是第 8 篇讲的"proxy 只做轻判断，重逻辑进应用层"。

## 6. 动手实践

**任务一：三语言骨架。** 把一个单语言 App Router 项目改造成 `zh-CN / en-US / ja-JP` 三语言结构：路由迁入 `[lang]`、proxy 协商、字典加载，三条路径全部可静态渲染（构建日志里三个语言前缀的路由都标记为静态）。提示：先改目录结构与 proxy，跑通重定向，最后接字典——一次改三层会让你分不清哪层坏了。

**任务二：协商优先级实验。** 用 curl 验证协商链：不带 Cookie 带 `Accept-Language: ja` 应重定向到 `/ja-JP/`；带 `NEXT_LOCALE=zh-CN` Cookie 访问应覆盖 Accept-Language。提示：`curl -I -H "Accept-Language: ja" http://localhost:3000/products` 看 302 的 Location 头；Cookie 用 `-H "Cookie: NEXT_LOCALE=zh-CN"` 模拟。

**任务三：复现"漏 locale"事故。** 造一个四语言配置但 `generateStaticParams` 只返回三个的场景，`next build` 观察构建输出里缺失的路由，再访问那个语言前缀看 404。修复它，并写一条 CI 断言：`generateStaticParams` 返回的 lang 集合必须等于字典文件集合。提示：断言可以直接 import 两边做集合比对，放进单元测试即可。

先自己操作，再对照参考实现：

<details>
<summary>任务三参考实现（CI 断言部分）</summary>

```ts
// tests/i18n-parity.test.ts（Vitest 形态，其他测试框架同理）
import { describe, expect, it } from "vitest"
import { readdirSync } from "node:fs"
import { generateStaticParams } from "@/app/[lang]/layout"
import { dictionaries } from "@/app/[lang]/dictionaries"

describe("i18n 完整性", () => {
  it("generateStaticParams 必须覆盖全部字典语言", async () => {
    const params = await generateStaticParams()
    const routed = new Set(params.map((p) => p.lang))
    const dicted = new Set(Object.keys(dictionaries))
    expect([...routed].sort()).toEqual([...dicted].sort())
  })

  it("各语言字典键结构一致（以 en-US 为基准）", async () => {
    const base = flatten(dictionaries["en-US"])
    for (const [locale, load] of Object.entries(dictionaries)) {
      const dict = await load()
      expect(Object.keys(flatten(dict)).sort(),
        `${locale} 缺键`).toEqual(Object.keys(base).sort())
    }
  })
})
```

要点：a) 第一条断言直接堵住"漏 locale"事故——字典加了、路由没枚举，测试立刻红；b) 第二条堵"翻译漏键"事故，`flatten` 把嵌套对象拍平成 `a.b.c` 键路径再比对；c) 挂进 CI 后，新增语言的三处检查清单只剩一处需要人记得（字典文件本身），其余两处由测试兜底。
</details>

## 7. 一句话记住

> 语言进 URL（`app/[lang]`）、协商进 proxy（Cookie 优先于 Accept-Language）、翻译进字典（动态 import + server-only）；静态化靠 `generateStaticParams` 枚举全部 locale——新增语言三处同步：字典、locales 数组、参数枚举，漏一处就是线上 404。

## 参考与致谢

- Next.js 官方文档 Internationalization 指南与 Proxy 文件约定，来源：https://nextjs.org/docs/app/guides/internationalization ，许可证 CC BY 4.0。本文 `[lang]` 路由、字典动态 import、`next/root-params`、`generateStaticParams` 静态化与 proxy 协商示例均依据 16 版官方文档整理；Cookie 优先的协商链为工程实践扩展，官方示例仅含 Accept-Language。
