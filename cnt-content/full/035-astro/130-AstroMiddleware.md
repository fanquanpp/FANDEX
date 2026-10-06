---
order: 170
title: Astro 中间件
module: 'astro'
category: 前端技术
difficulty: advanced
description: 用 astro:middleware 搭建全站请求闸口、粉丝团鉴权守卫与 locals 类型安全管道。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'astro/030-PagesRouting'
  - 'astro/080-BuildDeploy'
  - 'astro/133-AstroImagesPipeline'
  - 'astro/131-AstroSessionsApi'
prerequisites:
  - 'astro/030-PagesRouting'
---

## 知识点地图

- **知识类别**：中间件（astro:middleware）——全站请求链路的统一闸口，属"服务端管线"类知识。
- **解决什么问题**：鉴权、日志、偏好读取、异常兜底这类"每个请求都要做"的事，不该在每个页面复制一遍；中间件把它们收进一条链，并约定数据通过 `locals` 单向流入页面。
- **什么时候用到**：登录守卫、请求计时、按 Cookie 注入偏好、统一错误页。与图片管线的组合实战（受保护的壁纸库）见 [图片管线篇](/astro/133-AstroImagesPipeline)；会话换取身份的完整实现见 [Session API 篇](/astro/131-AstroSessionsApi)。

> 分工声明：本篇承载原"中间件与图片优化"篇的中间件半边（第 1-3 节与守卫实战）；astro:assets 图片管线整半已迁往 133 篇，两篇互为上下游。

## 前置知识

- [Astro 页面与路由](/astro/030-PagesRouting)：知道请求如何落到页面与端点，中间件正是插在这条链路的最前端。
- [Astro 构建与部署](/astro/080-BuildDeploy)：理解静态输出与 SSR 适配器的区别，这决定中间件运行在构建期还是请求期。

## 学习目标

1. 能说明中间件在 Astro 请求链路中的位置，会用 `onRequest` 编写并在 `locals` 上挂载数据。
2. 能为粉丝团后台实现登录守卫，未登录访问受保护路由时自动重定向到登录页。
3. 能用 TypeScript 为 `App.Locals` 扩展类型，让中间件注入的数据在页面里获得类型提示。

## 1. 中间件：全站请求的统一闸口

中间件（middleware）是一个在**请求到达页面或端点之前**统一执行的函数，相当于园区大门的闸机：无论访客去哪个展馆，都要先过这道闸。鉴权、日志、地域识别、A/B 分流这些"所有页面都要做"的事，写进中间件一次即可，不必在每个页面重复。

Astro 约定中间件放在 `src/middleware.ts`，导出一个 `onRequest` 函数。它接收请求上下文 `context` 与 `next`，返回值决定链路怎么走：返回 `next()` 表示放行（继续渲染目标页面）；直接返回一个 `Response` 则短路——请求根本不会到达页面。

```typescript
// src/middleware.ts：最小可运行中间件
import { defineMiddleware } from 'astro:middleware'

export const onRequest = defineMiddleware((context, next) => {
  // 每个请求先打一行访问日志：方法 + 路径
  console.log(`[访问] ${context.request.method} ${context.url.pathname}`)

  // 在 locals 上挂载数据：本请求生命周期内，页面与端点都能读到
  context.locals.requestTime = Date.now()

  // 放行，继续渲染目标页面
  return next()
})
```

`context.locals` 是中间件与页面之间的"传话筒"：它是每个请求独立的对象，中间件写进去的东西，页面、端点、岛屿的服务端数据源都能读。典型用法是把"当前登录的粉丝"解析一次放进 `locals`，后面所有页面直接用，不再各自解析 Cookie。

执行时机与输出模式强相关，这是中间件的第一课。安装了 SSR 适配器后，静态页面在构建期预渲染，对应的中间件只在 `astro build` 时执行一遍；只有按请求渲染的页面与端点，中间件才在每个请求里执行。因此"登录守卫要拦住的页面"必须按请求渲染（页面顶部 `export const prerender = false`），否则守卫逻辑形同虚设——构建期那一次执行时 Cookie 都不存在。反过来，`defineMiddleware` 只是类型标注的语法糖，去掉它直接导出同名函数也能运行；它的价值在于编辑器对 `context` 参数的完整类型提示。

## 2. 粉丝团后台的路由守卫

守卫（guard）是中间件最经典的应用：检查登录态，未登录访问受保护页面就重定向到登录页。下面的示例保护 `/fanclub/*` 下的所有路由——粉丝团后台里有会员歌单、演唱会优先购票入口等私密内容。

```typescript
// src/middleware.ts：粉丝团登录守卫
import { defineMiddleware, sequence } from 'astro:middleware'

// 约定：登录成功后写入的 Cookie 名
const SESSION_COOKIE = 'fanclub_session'

const authGuard = defineMiddleware((context, next) => {
  const { pathname } = context.url

  // 登录页与静态资源不需要守卫
  const isPublic = pathname === '/login' || pathname.startsWith('/assets')
  if (isPublic) return next()

  // 仅保护粉丝团后台路由
  if (pathname.startsWith('/fanclub')) {
    const sessionId = context.cookies.get(SESSION_COOKIE)?.value
    if (!sessionId) {
      // 未登录：302 到登录页，并带上回跳地址
      return context.redirect(`/login?redirect=${encodeURIComponent(pathname)}`, 302)
    }
    // 已登录：把用户信息放进 locals，页面里用 Astro.locals.user 读取
    context.locals.user = { name: '葱色应援团团员', sessionId }
  }

  return next()
})

export const onRequest = sequence(authGuard)
```

```astro
---
// src/pages/fanclub/index.astro：粉丝团后台首页
const { user } = Astro.locals
---

<h1>欢迎回来，{user?.name}</h1>
<p>优先购票通道已开启：魔法未来 2026 场次可提前 48 小时选座。</p>
```

要点有三处。其一，守卫按**路径前缀**圈定范围，Astro 中间件本身没有路由级开关，匹配逻辑由自己写；公开路由要显式放行，避免把登录页也拦下来造成重定向循环。其二，重定向用 `context.redirect`，带上 `redirect` 参数让登录成功后能跳回原页。其三，`cookies` API 基于 Web 标准封装，读取在中间件、写入（`context.cookies.set`）通常放在处理登录的端点里。

守卫里"拿着 sessionId 做什么"是一个设计决策点。最轻的做法是只判断 Cookie 存在——适合演示，但伪造 Cookie 即可绕过；标准做法是把不透明会话 ID 拿去服务端存储（KV、Redis、数据库）换取用户信息，中间件里完成这次换取，页面拿到的就是已经验证过的身份；无状态做法是校验签名 token（如 JWT），快但吊销困难。示例代码里 `context.locals.user = ...` 的位置正是留给这次换取的：不管选哪种方案，**验证逻辑只存在于中间件一处**，页面与端点永远信任 `locals`，这个不变式是守卫模式的全部意义。这次换取在 Astro 5 的落地实现（`Astro.session` 与存储驱动）就是 [Session API 篇](/astro/131-AstroSessionsApi) 的主题。

## 3. locals 的类型安全与中间件组合

`locals` 默认是自由对象，拼错字段名不会有任何提示。Astro 提供了类型扩展点：在项目里声明 `App.Locals` 接口，全站的 `Astro.locals` 与 `context.locals` 就都有了类型。

```typescript
// src/types.d.ts：为 locals 扩展类型
declare global {
  namespace App {
    interface Locals {
      /** 中间件解析出的登录粉丝，未登录为 undefined */
      user?: { name: string; sessionId: string }
      /** 请求进入时间，用于端点统计耗时 */
      requestTime: number
      /** 应援色偏好，由中间件从 Cookie 读取 */
      themeColor: string
    }
  }
}

export {}
```

```typescript
// src/middleware.ts：用 sequence 组合多个中间件，先读偏好再守卫
import { defineMiddleware, sequence } from 'astro:middleware'

const readPrefs = defineMiddleware((context, next) => {
  // 从 Cookie 读取应援色，默认初音未来绿
  context.locals.themeColor = context.cookies.get('theme')?.value ?? '#39C5BB'
  return next()
})

const requestTimer = defineMiddleware(async (context, next) => {
  context.locals.requestTime = Date.now()
  const response = await next()
  // 放行后还能拿到响应，统一追加统计响应头
  response.headers.set('X-Process-Ms', String(Date.now() - context.locals.requestTime))
  return response
})

// 按数组顺序执行：readPrefs -> authGuard -> requestTimer
export const onRequest = sequence(readPrefs, authGuard, requestTimer)
```

`sequence` 让中间件像洋葱一样分层：前面的先执行 `next` 之前的部分，后面的先执行完，前面再处理响应。设计边界上要守住两条：中间件**不做业务**（解析订单、查库出列表是页面与端点的事），也**不解析请求体**（Body 是流，中间件读了页面就读不到了）。

顺序编排之外，`next()` 的返回值还有一层用途：统一错误处理。把最外层中间件写成 `try { return await next() } catch (err) { 返回统一的错误页 }`，任何内层页面抛出的异常都会被拦在这里渲染成友好的 500 页面，而不是裸堆栈。配合 `locals` 的类型扩展，一条链路里就形成了"前置注入数据、后置兜底异常"的完整骨架——中间件层的职责从此固定：**身份、偏好、计时、兜底，四件事之外的问题交给页面**。

## 4. 与图片管线的整合路标

守卫写好之后，自然会想给守卫后的页面配上需要保护的资源——受保护的应援壁纸库就是两边能力的拼装：中间件负责拦人，页面负责出图，未登录用户根本走不到图片组件代码。这份实战整合（含完整页面代码与"闸口在前、页面保持纯粹"的验证方式）整篇放在[图片管线篇](/astro/133-AstroImagesPipeline)的实战整合一节，读法是先本篇后 133 篇。

## 易错点与最佳实践

1. **静态输出下中间件在构建期执行**：没有 SSR 适配器时，静态页面的中间件在 `astro build` 时跑一遍，`locals` 是构建期的值。需要每个请求都执行的守卫，必须为相应路由开启 SSR（页面里 `export const prerender = false` 并安装适配器）。
2. **中间件里读请求体**：Body 是一次性的流，中间件消费后页面端就拿不到了。鉴权只需要 Cookie 与头信息，别在闸口拆包裹。
3. **守卫范围过宽**：中间件对所有请求生效，匹配前缀时记得放行登录页与静态资源，否则会出现重定向循环或字体图标被拦。

## 本篇小结

1. 中间件是全站请求的闸口，`onRequest` + `next()` 放行、返回 `Response` 短路，`locals` 是它与页面之间的传话筒。
2. 路由守卫按路径前缀圈定保护范围，未登录重定向并携带回跳地址；`sequence` 组合多个中间件形成分层管道。
3. 通过 `App.Locals` 类型扩展，中间件注入的数据在页面与端点中都有完整类型提示。

## 动手实践

1. **给守卫补换取逻辑**：把第 2 节守卫里 `context.locals.user = ...` 一行替换为真实的会话换取——拿 sessionId 去服务端存储查用户，查不到视为未登录重定向。提示：换取的具体实现（driver 配置与 `Astro.session` 用法）按 [Session API 篇](/astro/131-AstroSessionsApi) 的动手环节做完再回来接。
2. **请求耗时看板**：用 `requestTimer` 中间件把每个页面请求的耗时写入 `X-Process-Ms` 头，再用浏览器网络面板对比静态页与 SSR 页的耗时构成。提示：`next()` 返回后再改响应头。

## 参考链接

- Astro 官方文档 Middleware 指南（MIT 许可）：https://docs.astro.build/en/guides/middleware/
- [Astro ClientRouter 与视图过渡](/astro/120-AstroViewTransitions)：预渲染页面的导航增强，与本篇守卫的执行时机互补。
