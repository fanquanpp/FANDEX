---
order: 140
title: 静态资源与性能优化
module: 'nextjs'
category: 前端技术
difficulty: beginner
description: next/image 与 next/font 的生产用法、bundle 体积分析与 Web Vitals 采集上报
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- 知识类别：Next.js 静态资源（图片、字体）优化与前端性能工程。
- 解决什么问题：页面"看着能用"和"加载快、不跳动、交互跟手"之间的差距——图片没有多档位、字体阻塞渲染、bundle 里混进了不该进的库、指标只有感觉没有数字。
- 什么时候用到：首屏大图引发 CLS/LCP 告警、接品牌字体、上线前体积预算审查、线上性能回归排查。
- 本篇讲资源侧与度量侧；部署方式、构建产物与环境变量见《Next.js 部署与环境配置》，渲染与缓存策略见第 3、6、7 篇。

## 0. 一句话理解

> 资源优化的主线：图片交给 `next/image`（多档位、懒加载、防偏移全自动），字体交给 `next/font`（构建期自托管、自动度量校正），bundle 靠测量不靠猜，指标靠 `web-vitals` 采集而不是感觉。

## 1. next/image：把图片交给流水线

```tsx
import Image from "next/image"
import { Inter } from "next/font/google"

const inter = Inter({ subsets: ["latin"] })

export default function Home() {
  return (
    <main className={inter.className}>
      <Image
        src="/hero.png"
        alt="首页横幅"
        width={1200}
        height={600}
        priority // 首屏图片：跳过懒加载、预加载，改善 LCP
      />
    </main>
  )
}
```

**讲解：**

1. `next/image` 自动完成四件事：按设备生成多种尺寸（srcset）、转换为 WebP/AVIF、进入视口才懒加载、按 `width/height` 预留空间防止布局偏移。`priority` 只给首屏关键图加——它控制的是预加载优先级，不是"画质"。
2. 远程图片需在 `next.config.ts` 的 `images.remotePatterns` 中声明域名（16 起 `images.domains` 已废弃）；本地图片 URL 带查询串时还需配置 `images.localPatterns`，这是 16 新增的防枚举限制。
3. Next.js 16 调整了图片的若干默认值，升级后行为变化集中在：

| 配置项 | 15 默认 | 16 默认 | 意图 |
| --- | --- | --- | --- |
| `images.qualities` | 1-100 任意值 | 仅 `[75]` | 缩减变体数量，quality 会被吸附到最接近的允许值 |
| `images.minimumCacheTTL` | 60 秒 | 4 小时 | 减少无 cache-control 图片的重复校验 |
| `images.imageSizes` | 含 16 | 移除 16 | 绝大多数项目用不到 16px 档 |
| `images.maximumRedirects` | 不限 | 3 次 | 防止重定向风暴 |

4. 中文字体体积大（动辄数 MB），优先级策略：系统字体栈兜底，确需品牌字体时只引入需要的字重，并考虑 unicode-range 子集化（详见第 2 节）。

### 1.1 fill、sizes、白名单与占位模糊

基础用法之外，生产环境高频的四件事：

第一，**`fill` 模式：不知道尺寸的图片怎么写**。图片由后端任意给、或作为卡片封面铺满容器时，改用 `fill`（绝对定位铺满父元素），尺寸约束交给父容器：

```tsx
<div className="relative aspect-[16/9] overflow-hidden rounded-xl">
  <Image src={post.coverUrl} alt="封面" fill
         sizes="(max-width: 768px) 100vw, 33vw"
         className="object-cover" />
</div>
```

`fill` 的两个前提都藏在细节里：父元素必须有定位上下文（`relative`），且必须由父元素提供宽高（`aspect-*` 或固定高度），否则图片塌成 0 高——"图片不显示"九成是少了这两样。`object-cover` 负责裁剪填充，与普通 img 的用法一致。

第二，**`sizes`：告诉浏览器这张图占多大**。没有 `sizes` 时浏览器按 100vw 估算、请求偏大的档位；写清"移动端全屏、桌面端占三分之一"，浏览器才会选真正需要的分辨率。经验法则：`sizes` 写的是图片**渲染宽度**占视口的比例（含断点条件），与容器实际布局对齐，而不是拍脑袋写 100vw。

第三，**`remotePatterns`：远程图片域名白名单**。`<Image>` 的 src 指向外部域名时必须先登记，否则构建直接报错：

```ts
// next.config.ts
export default {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.example.com" },
      { protocol: "https", hostname: "*.r2.dev" },   // 通配子域
    ],
  },
}
```

白名单的意义不止"放行"：所有远程图都会经过 Next 的优化服务中转（缩放、转格式），无白名单等于把服务器变成开放的图片代理。16 起 `images.domains` 已废弃，迁移到 `remotePatterns` 还能约束协议与路径。

第四，**`placeholder="blur"`：占位模糊**。静态导入的图片自动生成 base64 模糊底图；远程图需自备 `blurDataURL`（一张极小的模糊图）。列表页滚动时的"从糊到清"就是它，代价是首屏 HTML 里多一段 base64——只给首屏附近的图开。

## 2. next/font：构建期自托管与加载策略

`next/font` 的本质是"构建期把字体变成自己的静态资源"，加载策略围绕三个旋钮：

```tsx
import { Inter, Noto_Sans_SC } from "next/font/google"

// 变量字体：一个声明覆盖全字重
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })

// 中文字体：只拉一个字重，避免全字重下载
const noto = Noto_Sans_SC({
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
  preload: false,   // 中文字体体积大：关闭预加载，按需加载
})
```

```tsx
<main className={`${inter.variable} ${noto.variable} font-sans`}>
  {/* globals.css 里把 --font-inter 接入 --font-sans 令牌链 */}
</main>
```

要点逐条：

1. **`preload` 默认开启**，字体会以最高优先级预加载——这对拉丁字体（几十 KB）是优化，对数 MB 的中文字体是灾难，所以中文字体显式 `preload: false`。
2. **`display: "swap"`**：回退字体先渲染、字体到了再换，文字始终可读；代价是字体交换瞬间的轻微布局抖动，`next/font` 内置的 fallback 度量校正（自动生成 `size-adjust`）能把抖动压到最小。
3. **`variable` + CSS 变量**：字体以变量注入而不是直接给 `className`，多个字体（正文/代码/展示）可以组合进同一套 `--font-*` 令牌，交给主题层统一。直接用 `className` 只适合"整站一种字体"的最简场景。
4. **本地字体**走 `next/font/local`（`src` 指向 woff2，声明 `weight`/`style`），逻辑与 Google 字体一致——自托管、免第三方请求、自动度量校正，是品牌字体的标准姿势。

## 3. 三个真实场景

**场景一：电商首页大图引发 CLS 告警（真实工程形态）。** 商品卡封面从旧 CMS 迁到新图床后，首页 Lighthouse 的 CLS 从 0.05 涨到 0.28——旧代码里封面是裸 `<img>` 且不写高宽，图片加载完成瞬间把下方"加入购物车"按钮顶下去，用户在点击瞬间点空。修复三步：卡片容器固定 `aspect-[3/4]`（占位先于图片存在），裸 img 换 `<Image fill sizes="(max-width: 768px) 50vw, 25vw">`，首屏前四张加 `priority`。CLS 回落到 0.02。这里的核心认知：CLS 不是"图片加载慢"，是"布局空间没提前留"。

**场景二：博客字体闪烁治理。** 技术博客接了品牌衬线字体，上线后老读者反馈"每次进页面文字都跳一下"——原始写法是 `<link href="fonts.googleapis.com/...">` 引第三方字体：请求阻塞 + 回退字体度量不同，字体到达瞬间全篇文字重排。改用 `next/font/google` 后字体在构建期自托管、`display: "swap"` 配合自动 `size-adjust` 度量校正，交换瞬间几乎无位移；再给正文字体关掉 `preload`（正文不是 LCP 元素，预加载抢了首图带宽）。判断题：什么时候必须动字体？——当回退字体与目标字体的 x 高度差肉眼可见时，任何 CSS 都救不了，必须让 `next/font` 生成度量。

**场景三：构建产物里混进了编辑器库。** 后台项目 bundle 突然涨了 1.2MB，没人动过依赖。打开 bundle 分析（第 4 节）按体积排序，发现 `monaco-editor` 被打进首屏 chunk——排查提交记录，是有人为了做一个"JSON 预览"全量引入了编辑器包，且该页面在根 layout 下被预取。修复：预览功能改为点击时动态 `import()`，按需加载后该 chunk 只在用到时下载。教训：bundle 异常增长的第一反应不是"删依赖"，而是先测量、找到具体是哪个包进了哪个 chunk。

## 4. bundle 体积：从猜测到测量

优化体积的第一原则是**先测量再动手**。Next.js 官方路径是 `@next/bundle-analyzer`：

```bash
npm install -D @next/bundle-analyzer
```

```js
// next.config.ts（Turbopack 为默认打包器时，分析在 webpack 构建下进行）
const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
})
module.exports = withBundleAnalyzer({})
```

```bash
ANALYZE=true next build --webpack
```

**讲解：**

1. 分析器产出两份 treemap：`client`（浏览器下载的 JS）与 `server`（服务端依赖）。用户感受到的加载慢几乎只与 client 侧有关，优先看它。
2. **Turbopack 注意**：16 起生产构建默认 Turbopack，bundle 分析工具目前按 webpack 产物工作，所以分析跑一次 `--webpack` 构建即可；分析结论（哪个包大）在 Turbopack 下同样成立，不要为了"分析时和线上构建器一致"而把日常构建退回 webpack。
3. 看到超大依赖后的三板斧，按优先级：
   - **动态 import**：`const Editor = (await import("monaco-editor")).Editor`——把重依赖从首屏 chunk 挪到用户触发的 chunk；
   - **`optimizePackageImports`**：对图标库、组件库这类"-barrel-导出"（一个 index 转发几百个模块）的包，配置后只打包实际用到的模块：

     ```ts
     // next.config.ts
     export default {
       experimental: {
         optimizePackageImports: ["lucide-react", "@mui/material"],
       },
     }
     ```

   - **`serverExternalPackages`**：只该活在服务端的包（数据库驱动、Prisma 引擎等）声明出来，避免被打进客户端或被打包器改写：

     ```ts
     // next.config.ts
     export default {
       serverExternalPackages: ["pg", "prisma"],
     }
     ```

4. 易错点：`next/dynamic` 与 `React.lazy` 只影响"哪个 chunk 装得下它"，不影响"这个包是否被多个 chunk 重复包含"；怀疑重复打包时看 treemap 里同名模块出现的次数，再考虑 `turbopackChunking`/`splitChunks` 调整。

## 5. Web Vitals：把"感觉慢"变成数字

本地 Lighthouse 是实验室数据（模拟设备、单次采样），线上指标要靠真实用户采集。Next.js 内置了上报钩子：

```tsx
// app/layout.tsx（或任意客户端组件）
"use client"

import { useReportWebVitals } from "next/web-vitals"

export function WebVitalsReporter() {
  useReportWebVitals((metric) => {
    // metric: { id, name, value, rating, delta, navigationType }
    const body = JSON.stringify({
      name: metric.name,      // LCP / CLS / INP / TTFB / FCP
      value: metric.value,
      rating: metric.rating,  // good / needs-improvement / poor
      id: metric.id,          // 同一次访问内去重用
    })
    navigator.sendBeacon("/api/vitals", body)
  })
  return null
}
```

**讲解：**

1. `useReportWebVitals` 底层是 `web-vitals` 库：LCP/CLS/INP 三个核心指标加 FCP/TTFB 辅助指标，浏览器一有最终值就回调一次。`sendBeacon` 在页面卸载时也能把数据发出去，比 fetch 更适合埋点。
2. **CLS 的特殊性**：它是"累计"指标，会话期间持续累加，上报时机是页面隐藏/关闭；所以服务端聚合时按 `metric.id` 取最后一次值。
3. 上报到自己的接口还是第三方 RUM 服务（Vercel Analytics、Datadog RUM 等）？小团队自建 `/api/vitals` 落库足够；要看分位数（p75）与设备/地区切片时，第三方 RUM 省下大量聚合工作。
4. 有了数据之后的最小闭环：把 p75 LCP / INP / CLS 接进告警，阈值参考 Core Web Vitals 官方分级（LCP 2.5s、INP 200ms、CLS 0.1 为 good 上界）。没有告警的指标报表只是装饰。

## 6. 动手实践

**任务一：LCP 优化闭环。** 用 Lighthouse 跑一次首页性能报告，挑一项优化（最常见：给首屏图片加 `priority`），复测对比 LCP 数值。提示：Lighthouse 的"Opportunities"区会直接给出建议清单，每次只改一项再复测，否则说不清是哪一项起的作用。

**任务二：亲手制造并修复一次 CLS。** 写一个商品卡列表：先裸 `<img>` 不写宽高跑一次 Lighthouse 记下 CLS；再换 `<Image>` 固定容器比例复测。提示：CLS 需要"加载时机制造偏移"，可在 DevTools Network 面板把节流设为 Slow 4G 让图片明显滞后于文本。

**任务三：揪出 bundle 里的重依赖。** 给项目接入 bundle 分析，找到 client treemap 中最大的两个包，判断它们是否应该出现在首屏；对其中之一做动态 import 或 `optimizePackageImports`，对比前后首屏 JS 体积。提示：对比要同一条路由、同一次 `ANALYZE=true` 流程，并把两份 treemap 截图留档。

先自己操作，再对照参考流程：

<details>
<summary>任务二参考操作流程</summary>

```tsx
// 反例：会引发 CLS 的写法
function ProductCardBad({ item }: { item: { cover: string; name: string } }) {
  return (
    <div className="card">
      <img src={item.cover} alt={item.name} />  {/* 无宽高：加载后顶开布局 */}
      <button>加入购物车</button>
    </div>
  )
}

// 修复：容器定比例 + Image fill
function ProductCard({ item }: { item: { cover: string; name: string } }) {
  return (
    <div className="card">
      <div className="relative aspect-[3/4] overflow-hidden">
        <Image src={item.cover} alt={item.name} fill
               sizes="(max-width: 768px) 100vw, 25vw"
               className="object-cover" />
      </div>
      <button>加入购物车</button>
    </div>
  )
}
```

验证步骤：`npm run build && npm run start`，Chrome DevTools -> Lighthouse -> 移动端 + Slow 4G 跑性能，对比两版的 CLS 数值；反例通常 0.2 以上，修复版应接近 0。若修复版仍有偏移，检查容器是否真的先渲染了（骨架结构必须在图片请求发出前就占位）。
</details>

## 7. 一句话记住

> 图片与字体是浏览器侧最常见的两类性能税：`next/image` 负责"多档位 + 懒加载 + 防偏移"三件套，`next/font` 负责"构建期自托管 + 度量校正"；bundle 与指标都不靠感觉——`ANALYZE=true` 测体积、`useReportWebVitals` 采数据、p75 接告警。

## 参考与致谢

- Next.js 官方文档（Images / Font / Optimizing / Debugging 等章节），来源：https://nextjs.org/docs ，许可证 CC BY 4.0。本文图片默认值表与 font/image API 形态依据 Next.js 16 官方文档整理。
- `web-vitals` 与 Core Web Vitals 分级标准来自 Google web.dev（https://web.dev/articles/vitals ，CC BY 4.0）。
