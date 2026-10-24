---
order: 180
title: 会话管理：Session API
module: 'astro'
category: 前端技术
difficulty: advanced
description: 用 Astro Session API 把"不透明 sessionId 换取身份"落成可运行实现：Astro.session、存储驱动与 Cookie 机制。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'astro/130-AstroMiddleware'
  - 'astro/100-AstroFormsActions'
prerequisites:
  - 'astro/130-AstroMiddleware'
---

## 知识点地图

- **知识类别**：会话管理（Session API）——服务端有状态的会话存取，属"服务端状态"类知识。[中间件篇](/astro/130-AstroMiddleware)讲过设计点"sessionId 是不透明钥匙，要去服务端换取身份"，本篇把这句话落成可运行的实现。
- **解决什么问题**：HTTP 无状态，登录态、购物车、偏好这些"跟人走"的数据需要一个服务端保管处。Session API 就是 Astro 内建的保管处：你只管 `session.set/get`，Cookie 的签发、sessionId 的生成、服务端存储的读写全部由框架接管。
- **什么时候用到**：粉丝团后台登录态、未登录也能用的购物车暂存、主题偏好记忆。前提：站点必须能按请求渲染（SSR 适配器或按需页面）——纯静态站点没有"请求"，也就没有会话。

> 版本说明：Session API 自 Astro 5.7 引入（初为实验特性，后续版本转正），字段与驱动名以所用版本官方 Session 指南为准；本文行为语义跨版本稳定。

## 学习目标

- 理解 Session 的存储模型：客户端只有不透明 sessionId cookie，数据全在服务端驱动里
- 会配置存储驱动（file / redis / 平台托管）并解释选型依据
- 会用 `Astro.session`（或中间件里的 `context.session`）完成存、取、删、销毁
- 能把 130 篇守卫里"换取身份"的占位补成真实实现，并防住会话固定攻击

## 1. 存储模型：一把钥匙开一个保险柜

Session 的安全设计建立在"分工"上：

```text
浏览器                    服务端
┌──────────────────┐      ┌──────────────────────────────┐
│ Cookie:           │      │ 存储驱动（文件/Redis/KV）      │
│  不透明 sessionId  │ ───→ │  sessionId -> { user, ... }  │
│ （不含业务数据）    │      │  数据永远不落到浏览器          │
└──────────────────┘      └──────────────────────────────┘
```

Cookie 里只有一个随机字符串（sessionId），用户信息、购物车这些数据全在服务端。换成别的写法会怎样：把登录态直接塞 Cookie（哪怕是加密的）——用户拿到的是全部数据，改设备要重新塞、吊销要等过期、体积还占请求头；服务端会话则随时可删、可改、可下线。这也是 130 篇守卫设计点的由来：**验证身份的动作发生在服务端存储处，浏览器只持有入场券**。

配置只在 `astro.config.mjs` 一处：

```javascript
// astro.config.mjs：开发环境用文件驱动即可
import { defineConfig } from 'astro/config'

export default defineConfig({
  // ...已有的适配器配置不动
  session: {
    driver: 'file',        // 会话数据存本地 .astro/session/（自动生成，勿提交 git）
  },
})
```

生产环境换驱动（多实例部署必须共享存储，否则 A 实例发的票 B 实例不认）：

```javascript
session: {
  driver: 'redis',             // unstorage 生态的驱动名，还有 upstash / vercelKV / netlifyBlobs 等
  options: { url: process.env.REDIS_URL },
}
```

驱动选型一句话：本地开发 file；自建多实例 Redis；Vercel/Netlify 用平台托管 KV（部分平台有开箱默认驱动，检测到适配器即自动启用）。共同点：sessionId 与数据都不过浏览器，选谁只影响"多个服务实例之间认不认同一张票"。

## 2. 用法四件套：set / get / destroy / regenerate

```typescript
// src/pages/api/login.ts：登录端点——登录成功写入会话
import type { APIRoute } from 'astro'

export const POST: APIRoute = async ({ request, session, cookies }) => {
  const { username, password } = await request.json()
  const user = await verifyUser(username, password)      // 校验逻辑自备（查库/调认证服务）
  if (!user) {
    return new Response(JSON.stringify({ error: '用户名或密码错误' }), { status: 401 })
  }
  await session.regenerate()                             // 登录瞬间换新 sessionId：防会话固定
  await session.set('user', { name: user.name, level: user.level })
  return new Response(JSON.stringify({ ok: true }))
}
```

```typescript
// src/middleware.ts：守卫——把 130 篇的占位换成真实换取
const authGuard = defineMiddleware(async (context, next) => {
  if (!context.url.pathname.startsWith('/fanclub')) return next()

  const user = await context.session?.get('user')        // 拿 sessionId 去驱动里换用户
  if (!user) {
    return context.redirect(`/login?redirect=${encodeURIComponent(context.url.pathname)}`, 302)
  }
  context.locals.user = user                             // 验证逻辑只此一处，页面信任 locals
  return next()
})
```

```typescript
// src/pages/api/logout.ts：登出——销毁会话而非只删 Cookie
export const POST: APIRoute = async ({ session }) => {
  await session.destroy()      // 服务端数据 + 客户端 Cookie 一起清
  return new Response(JSON.stringify({ ok: true }))
}
```

逐处解释：`session.regenerate()` 在"校验通过之后、写入用户数据之前"调用——会话固定攻击的原理是攻击者先在受害者浏览器里种下一个已知 sessionId，等受害者登录后用这个已知 id 冒充；登录瞬间换新 id 让旧 id 作废，攻击链条断在换钥匙这一步。`destroy()` 而不是只 `delete('user')`：登出意味着保险柜整个作废，残留的旧 sessionId 复用是隐患。中间件里用 `context.session?.get` 带可选链——它确保"会话系统未启用的部署形态"下守卫降级而不是 500。

## 3. 三个不同场景的落地

**后台登录态**：第 2 节的完整闭环（登录写、守卫换、登出毁）。注意会话里只放"需要随取随用的身份与权限"，大对象（完整歌单、统计数据）存数据库、会话里放 id。

**购物车暂存**：未登录用户的购物车没有 user 可存，但 sessionId 在首次访问时已自动签发——会话天然支持匿名暂存：

```typescript
// POST /api/cart：未登录用户也能把应援商品先放进购物车
export const POST: APIRoute = async ({ request, session }) => {
  const item = await request.json()
  const cart = (await session.get('cart')) ?? []
  await session.set('cart', [...cart, item])
  return new Response(JSON.stringify({ count: cart.length + 1 }))
}
```

登录后把匿名购物车并入用户账户（读 `session.get('cart')` 合并进数据库），这就是电商"登录前加购"的标准实现路径。

**主题偏好记忆**：应援色这类轻量偏好用会话或 Cookie 皆可，判据是"要不要服务端感知"。切换应援色要在服务端渲染时就生效（页面背景色由 `locals` 决定）就存会话：`await session.set('themeColor', '#39C5BB')`，中间件读取后注入 `locals`——与 130 篇 readPrefs 的 Cookie 版本相比，会话版的好处是值可以是结构化对象、且不暴露在浏览器可编辑的 Cookie 里；只做客户端暗色模式这类纯展示偏好，留在 Cookie 即可，不必为它开服务端会话。

## 4. 边界与易错点

- **无 SSR 适配器 = 无会话**：纯静态输出的站点没有按请求执行的服务端代码，`Astro.session` 会报错。最低门槛是给需要会话的页面开按需渲染（`export const prerender = false` 加适配器）。
- **会话不是数据库**：会话数据应有生命周期（随会话销毁）、无强一致要求；订单、收藏这类持久数据落库，会话只存过渡态。
- **驱动与部署形态不匹配**：本地开发 file 驱动部署到 Serverless（多实例、文件系统临时）会导致"登录态时有时无"——症状是刷新一下就登出，见到这个症状先查驱动配置。
- **不要在会话里存敏感明文**：会话数据在服务端存储里是可读的（尤其平台托管 KV），密码、完整支付信息这类数据不入会话。

## 5. 动手实践

练习一（补完 130 篇的守卫换取）。任务：130 篇动手实践一"给守卫补换取逻辑"在本篇收口——按第 2 节实现 login/logout 端点与守卫，跑通"未登录访问被拦 -> 登录 -> 再访问放行 -> 登出后再被拦"四步。提示：四步各自验证点是 302、200、200、302；用 `curl -i` 看状态码即可，不需要前端页面。

<details>
<summary>参考实现要点（先自己写，再展开对照）</summary>

```bash
# 1. 未登录访问受保护页
curl -i http://localhost:4321/fanclub/            # 302 -> /login?redirect=%2Ffanclub%2F
# 2. 登录
curl -i -X POST http://localhost:4321/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"demo","password":"demo"}' \
  -c cookies.txt                                   # 200；-c 把会话 cookie 存下来
# 3. 带会话再访问
curl -i http://localhost:4321/fanclub/ -b cookies.txt   # 200
# 4. 登出后重访
curl -i -X POST http://localhost:4321/api/logout -b cookies.txt -c cookies.txt
curl -i http://localhost:4321/fanclub/ -b cookies.txt   # 302
```

对照要点：`-c`/`-b` 是 curl 模拟"浏览器保存并回发 cookie"的方式；第 2 步若省略 regenerate，第 4 步销毁的会话 id 与第 1 步前预置的相同——正是会话固定攻击的形态，把 `session.regenerate()` 注释掉再跑一遍，能加深"为什么登录要换钥匙"的体感。

</details>

练习二（匿名购物车）。任务：实现第 3 节的购物车端点并加一个 GET 返回当前列表；用两个独立 curl 会话验证"未登录购物车互不串门"。提示：curl 不带 `-b`/`-c` 时每次都是新会话；对比带同一份 cookies.txt 的请求，确认数据跟随 sessionId 而不是接口。

练习三（驱动切换故障复现）。任务：file 驱动下登录，然后把配置临时改成指向另一个目录的 file 驱动，刷新受保护页——观察登录态消失（模拟"多实例不共享存储"）。目的：在受控环境里先见到"驱动不匹配"的症状，将来在生产里遇到能秒判。

## 本篇小结

Session API 的模型是"浏览器持不透明钥匙、服务端驱动开保险柜"：`session.set/get/destroy/regenerate` 四件套覆盖存、取、销毁、换钥匙；驱动按部署形态选（开发 file、自建 Redis、平台托管 KV），多实例必须共享驱动。登录流程的标准顺序是"校验 -> regenerate -> 写入"，登出用 destroy 而非删单键。会话不是数据库：放过渡态与身份，持久数据落库；纯静态站点无会话，按需渲染是最低门槛。

## 参考与致谢

- 本篇 Session API 用法、驱动配置与会话固定防护参照 Astro 官方文档 Sessions 指南整理改写；Astro 官方文档以 MIT 许可发布：https://docs.astro.build/en/guides/sessions/
