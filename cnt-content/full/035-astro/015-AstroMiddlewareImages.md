---
order: 10
title: Astro 中间件与图片优化
module: 'astro'
category: 前端技术
difficulty: advanced
description: 用 astro:middleware 搭建全站请求闸口与粉丝团鉴权守卫，配合 astro:assets 打通图片管线与响应式图。
author: fanquanpp
updated: '2026-09-02'
related:
  - 'astro/007-StylingFontsAssets'
  - 'astro/003-PagesRouting'
  - 'astro/008-BuildDeploy'
prerequisites:
  - 'astro/003-PagesRouting'
  - 'astro/007-StylingFontsAssets'
---

## 前置知识

- [Astro 页面与路由](/astro/003-PagesRouting)：知道请求如何落到页面与端点，中间件正是插在这条链路的最前端。
- [Astro 样式与资源优化](/astro/007-StylingFontsAssets)：已接触 `Image` / `Picture` 组件的基本用法，本文在此基础上讲全局图片管线与响应式配置。
- [Astro 构建与部署](/astro/008-BuildDeploy)：理解静态输出与 SSR 适配器的区别，这决定中间件运行在构建期还是请求期。

## 学习目标

1. 能说明中间件在 Astro 请求链路中的位置，会用 `onRequest` 编写并在 `locals` 上挂载数据。
2. 能为粉丝团后台实现登录守卫，未登录访问受保护路由时自动重定向到登录页。
3. 能用 TypeScript 为 `App.Locals` 扩展类型，让中间件注入的数据在页面里获得类型提示。
4. 能配置 `image.service`、`domains` 与 `remotePatterns`，让远程海报图也走优化管线。
5. 能用 `layout` / `fit` / `priority` 等响应式图片属性，为演唱会海报生成多尺寸 `srcset`。

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

守卫里"拿着 sessionId 做什么"是一个设计决策点。最轻的做法是只判断 Cookie 存在——适合演示，但伪造 Cookie 即可绕过；标准做法是把不透明会话 ID 拿去服务端存储（KV、Redis、数据库）换取用户信息，中间件里完成这次换取，页面拿到的就是已经验证过的身份；无状态做法是校验签名 token（如 JWT），快但吊销困难。示例代码里 `context.locals.user = ...` 的位置正是留给这次换取的：不管选哪种方案，**验证逻辑只存在于中间件一处**，页面与端点永远信任 `locals`，这个不变式是守卫模式的全部意义。

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

## 4. astro:assets：把远程海报接入全局图片管线

第 007 篇已经讲过 `Image` 组件的用法，这里补上"管线配置"这一层。`astro.config.mjs` 的 `image` 字段决定全站图片如何被压缩与转换：默认服务基于 sharp，在构建期或请求期把原图转成 WebP/AVIF 多尺寸产物；本地图片直接进管线，**远程图片必须先授权域名**，否则构建直接报错——这是防止站点沦为任意图片的转换代理。

```javascript
// astro.config.mjs：图片管线配置
import { defineConfig } from 'astro/config'

export default defineConfig({
  image: {
    // 默认服务即 sharp，显式写出便于将来替换为无 sharp 的托管方案
    service: { entrypoint: 'astro/assets/services/sharp' },
    // 允许优化的远程图片域名：CDN 上的歌姬海报与演唱会主视觉
    domains: ['cdn.vocalive.example'],
    // 更细粒度的授权：协议 + 主机名 + 路径模式
    remotePatterns: [{ protocol: 'https', hostname: 'img.crypton.example', pathname: '/posters/**' }],
    // 为 layout 属性生成的响应式样式开启全局开关
    responsiveStyles: true,
  },
})
```

配置之后，远程图与本地图走同一条路：构建期生成缓存友好的 `/_image` 端点 URL，按需转换并带长缓存头。页面里唯一要改的是数据来源——歌姬海报存在 CDN 时，把远程 URL 直接交给 `Image` 组件即可。

这条管线的两种运行形态值得一并理解。静态输出下，所有图片变体在构建期一次性生成、随站点一起发布，部署后没有图片处理开销，适合素材固定的内容站；SSR 形态下 `/_image` 是一个真正的端点，浏览器首次请求某个尺寸时才转换并回源，之后靠响应头的长缓存直出——素材每天更新（比如每天发布新演出海报）的场景更适合它。至于"远程域名必须授权"这条规则，本质是防滥用：若任何人都能把你的站点当任意图片的转换代理，服务器 CPU 与带宽就成了别人的免费算力，`domains` / `remotePatterns` 就是授权名单。

## 5. 响应式图片：一张海报适配全端

现代 `astro:assets` 支持声明式响应式布局：指定 `layout` 后，`Image` 会自动生成 `srcset` 与 `sizes`，并输出宽高防止布局抖动（CLS）。对演唱会海报这类"既要首页缩略、又要详情页大图"的素材尤其合适。

```astro
---
// src/pages/concerts/magical-mirai-2026.astro：演唱会详情页
import { Image, Picture } from 'astro:assets'
import poster from '../../assets/posters/magical-mirai-2026.jpg'
---

<!-- 主海报：constrained 表示随容器伸缩但不超过原始宽度 -->
<Image
  src={poster}
  alt="魔法未来 2026 主视觉海报，初音未来应援色渐变"
  layout="constrained"
  fit="cover"
  format="avif"
  fallbackFormat="webp"
  priority
  widths={[480, 960, 1440]}
/>

<!-- 角色立绘：Picture 同时输出多格式，浏览器择优加载 -->
<Picture
  src="https://cdn.vocalive.example/vsinger/miku-full.png"
  alt="初音未来立绘"
  formats={['avif', 'webp']}
  width={800}
  height={1200}
  loading="lazy"
/>
```

逐项说明：`layout="constrained"` 是内容图的推荐值（`full-width` 给通栏 Banner，`fixed` 给定宽图标位）；`fit="cover"` 决定裁切方式；`format` + `fallbackFormat` 组合让支持 AVIF 的浏览器拿最小体积；首屏海报加 `priority` 生成高优先级加载提示，非首屏立绘用 `loading="lazy"`。这些属性都是对原生加载提示的封装，最终都会落到 `<img>` 标签上。

把 `widths` 数组定准是响应式图片里最需要"拍脑袋"的一步，其实有章可循：先看布局容器实际会出现的最大渲染宽度（比如详情页海报最大 720 CSS 像素），再按 1 倍、2 倍屏幕密度放大就是合理集合（720、1440），无需为极端设备堆十档宽度；`sizes` 属性由 `layout` 模式自动生成，手动覆盖仅在布局特殊时才需要。最后别忘了替代文本（alt）是图片的无障碍接口：海报写"魔法未来 2026 主视觉"，而不是"图片"或文件名——这与性能无关，却是图片组件用法的及格线。

## 6. 实战整合：受保护的应援壁纸库

把两块能力拼起来：一个需要登录才能访问的歌姬壁纸库页面，图片全部走优化管线。中间件负责拦人，页面负责出图。

```astro
---
// src/pages/fanclub/wallpapers.astro：粉丝团专属壁纸库
import { Image } from 'astro:assets'

// 守卫已在中间件完成，这里直接取登录用户
const { user } = Astro.locals
const wallpapers = [
  { id: 'miku-2026', singer: '初音未来', color: '#39C5BB', src: '/wallpapers/miku-2026.png' },
  { id: 'rin-2026', singer: '镜音铃', color: '#FFE500', src: '/wallpapers/rin-2026.png' },
]
---

<h1 style={`border-left: 4px solid ${wallpapers[0].color}`}>{user?.name} 的壁纸库</h1>
<ul>
  {
    wallpapers.map((w) => (
      <li>
        <Image src={w.src} alt={`${w.singer} 应援壁纸`} width={1200} height={675} layout="constrained" loading="lazy" />
        <span>应援色 {w.color}</span>
      </li>
    ))
  }
</ul>
```

未登录用户访问这个页面时，根本走不到组件代码——中间件已经 302 到登录页。这就是"闸口在前、页面保持纯粹"的价值：页面里没有一行鉴权代码，图片优化也不需要关心权限。

顺着这个整合还能再走一步：`locals` 里的用户信息可以反哺图片管线。比如按粉丝团等级决定海报尺寸上限（普通成员列表页只出 480 宽度变体，会员可看高清），把等级放进 `locals` 后，页面里一个三元表达式就能切换 `widths` 数组；再比如在 `requestTimer` 式的后置处理里，对图片端点响应追加 `Cache-Control` 微调。这些都不需要新的框架 API，全部是"中间件注入数据、页面消费数据"这一既有模式的延伸——当你发现自己在两个页面里复制同一段判断时，把判断上移到中间件，几乎总是对的。

## 易错点与最佳实践

1. **静态输出下中间件在构建期执行**：没有 SSR 适配器时，静态页面的中间件在 `astro build` 时跑一遍，`locals` 是构建期的值。需要每个请求都执行的守卫，必须为相应路由开启 SSR（页面里 `export const prerender = false` 并安装适配器）。
2. **中间件里读请求体**：Body 是一次性的流，中间件消费后页面端就拿不到了。鉴权只需要 Cookie 与头信息，别在闸口拆包裹。
3. **远程图片域名忘配置**：`Image` 收到未授权域名的远程图会直接抛错（而不是静默降级），新接入图床时要同步更新 `domains` / `remotePatterns`。
4. **守卫范围过宽**：中间件对所有请求生效，匹配前缀时记得放行登录页与静态资源，否则会出现重定向循环或字体图标被拦。
5. **首屏图滥用懒加载**：`loading="lazy"` 用在首屏海报上反而拖慢 LCP。首屏用 `priority`，其余用懒加载，一行属性之差性能差距很大。

## 本篇小结

1. 中间件是全站请求的闸口，`onRequest` + `next()` 放行、返回 `Response` 短路，`locals` 是它与页面之间的传话筒。
2. 路由守卫按路径前缀圈定保护范围，未登录重定向并携带回跳地址；`sequence` 组合多个中间件形成分层管道。
3. 通过 `App.Locals` 类型扩展，中间件注入的数据在页面与端点中都有完整类型提示。
4. `image` 配置决定全站图片管线：sharp 服务、远程域名授权、响应式样式开关，远程图与本地图同一条路。
5. `layout` / `fit` / `priority` 等属性让一张海报自动适配全端尺寸，首屏与非首屏分别用 `priority` 与 `loading="lazy"`。

## 动手实践

1. **给壁纸库加分会员判断**：在守卫中增加粉丝团等级校验，等级不足时重定向到"升级会员"页。提示：等级存在会话 Cookie 或需要请求端点验证，中间件里只做判断不做查询业务。
2. **接入真实图床**：注册一个支持 S3 的对象存储，把演唱会海报上传后在 `remotePatterns` 中授权其域名，用 `Picture` 组件对比 AVIF 与 JPEG 的体积差异。提示：注意构建期报错信息会指出未授权的域名。
3. **请求耗时看板**：用 `requestTimer` 中间件把每个页面请求的耗时写入 `X-Process-Ms` 头，再用浏览器网络面板对比静态页与 SSR 页的耗时构成。提示：`next()` 返回后再改响应头。
