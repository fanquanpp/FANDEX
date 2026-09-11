---
order: 90
title: Next.js 部署与性能优化
module: 'nextjs'
category: 前端技术
difficulty: intermediate
description: 从 next build 到上线：Turbopack 构建、standalone 与 Docker 部署、环境变量分级、next/image 与 next/font 的 16 时代默认值，以及核心性能指标排查。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'nextjs/030-DataFetchingCaching'
  - 'nextjs/070-CacheComponentsDeepDive'
  - 'devops/060-DockerfileMultiBuild'
  - 'cloud-computing/070-DockerDeepAnalysis'
prerequisites:
  - 'nextjs/030-DataFetchingCaching'
---

## 0. 一句话理解

> 部署 = `next build` 产出按路由分类的优化产物，再交给运行时（Node/Docker/Vercel）执行；优化 = 能静态就静态、图片走 next/image、字体走 next/font、密钥只留在服务端。

开发时页面"能跑"和上线后"跑得快、跑得稳"是两回事。本篇覆盖从构建到上线的完整链路：构建产物怎么看、环境变量怎么分级、图片字体怎么自动优化、四种部署方式怎么选。

## 1. 构建与产物

```bash
npm run build
```

Next.js 16 起，开发与生产构建**默认都由 Turbopack 完成**（Turbopack 在 16 转正为默认打包器，官方数据生产构建提速 2-5 倍）；有自定义 webpack 配置的存量项目可临时用 `next build --webpack` 退回。构建结束会打印两类信息：

```text
   ▲ Next.js 16 (Turbopack)

 ✓ Compiled successfully in 615ms
 ✓ Finished TypeScript in 1114ms
 ✓ Collecting page data in 208ms
 ✓ Generating static pages in 239ms

Route (app)
 ○ /                    静态：构建时生成一次
 ● /blog/[id]           ISR：静态 + 定时再生
 ƒ /dashboard           动态：每次请求渲染
```

**讲解：**

1. 构建日志里 `○` 表示静态（SSG）、`●` 表示 ISR、`ƒ` 表示动态（SSR/按请求渲染）。新项目应尽量让更多页面落在 `○` 与 `●`——它们可以被 CDN 直接缓存，成本最低、速度最快。
2. 16 的构建输出会展示每个阶段的耗时（编译、类型检查、收集页面数据、生成静态页），定位"构建慢在哪一步"不再靠猜。
3. `next dev` 与 `next build` 在 16 起使用**独立的输出目录**，二者可并发执行；框架还会加锁文件防止同一项目同时跑多个 dev 或 build 实例互相覆盖产物。
4. 产物默认输出到 `.next/`，是"给服务器读的中间产物"，不要手工改动或直接部署这个目录。自托管/Docker 部署推荐配合 `output: "standalone"`（见第 5 节），它会生成一个只含运行必需文件的精简目录。
5. 注意区分两个"静态"：`next build` 生成的静态页存放在服务器/CDN；浏览器里"查看源代码"能看到完整 HTML，只说明该页面经历了服务器端渲染，不代表它是静态缓存页。渲染策略的选择见第 6 篇，缓存语义见第 3 篇与第 7 篇。

## 2. 环境变量：同一个名字，两个世界

```bash
# .env.local（仅本机，不提交 git）
DATABASE_URL="postgres://user:pass@host:5432/db"   # 服务端密钥
NEXT_PUBLIC_SITE_URL="https://example.com"          # 公开配置
```

```tsx
// 服务端组件 / route.ts / Server Action 中：构建与运行时都可读
const dbUrl = process.env.DATABASE_URL

// 客户端组件中：只有 NEXT_PUBLIC_ 前缀的变量可用，
// 且它在构建时就被内联成字面量
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
```

**讲解：**

1. 常用文件优先级从高到低：`process.env`（部署平台注入）> `.env.production.local` > `.env.local` > `.env.production` > `.env`。`.local` 后缀一律不提交 git。
2. **不带前缀的变量只在服务器端可用**。数据库密码、第三方 API Key、JWT 签名密钥绝不加 `NEXT_PUBLIC_`——带前缀的变量会被内联进浏览器代码，任何访客在"查看源代码"里都能看到。
3. `NEXT_PUBLIC_` 变量是**构建期内联**：改了部署平台的值必须重新构建才生效；服务端变量则是运行时读取，多数平台改完重启即可。
4. 16 移除了 `serverRuntimeConfig`/`publicRuntimeConfig` 两个配置项，运行时配置统一收敛到环境变量，老项目升级时需迁移。
5. 排查"密钥泄漏"的最快方法：构建后全局搜索产物中是否出现密钥明文；出现即说明它被加错了前缀或 import 进了客户端组件。

## 3. 图片与字体优化

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

1. `next/image` 自动完成四件事：按设备生成多种尺寸（srcset）、转换为 WebP/AVIF、进入视口才懒加载、按 `width/height` 预留空间防止布局偏移。`priority` 只给首屏关键图加。
2. 远程图片需在 `next.config.ts` 的 `images.remotePatterns` 中声明域名（16 起 `images.domains` 已废弃）；本地图片 URL 带查询串时还需配置 `images.localPatterns`，这是 16 新增的防枚举限制。
3. Next.js 16 调整了图片的若干默认值，升级后行为变化集中在：

| 配置项 | 15 默认 | 16 默认 | 意图 |
| --- | --- | --- | --- |
| `images.qualities` | 1-100 任意值 | 仅 `[75]` | 缩减变体数量，quality 会被吸附到最接近的允许值 |
| `images.minimumCacheTTL` | 60 秒 | 4 小时 | 减少无 cache-control 图片的重复校验 |
| `images.imageSizes` | 含 16 | 移除 16 | 绝大多数项目用不到 16px 档 |
| `images.maximumRedirects` | 不限 | 3 次 | 防止重定向风暴 |

4. `next/font` 在构建期自托管字体文件并预加载，杜绝第三方字体请求阻塞渲染；`className` 挂到容器上即可全局生效。
5. 中文字体体积大（动辄数 MB），优先级策略：系统字体栈兜底，确需品牌字体时只引入需要的字重，并考虑 unicode-range 子集化。

## 4. 核心性能指标自查

| 指标 | 含义 | 常见优化 |
| --- | --- | --- |
| LCP | 最大内容绘制（首屏主内容出现） | 首屏图加 `priority`、减少阻塞脚本、关键内容服务器渲染 |
| CLS | 累计布局偏移 | 图片/字体预留尺寸、骨架屏模拟真实布局 |
| INP | 交互到下一次绘制延迟 | 减少客户端 JS、拆分大组件、避免长任务 |
| TTFB | 首字节时间 | 静态页走 CDN 边缘、慢查询加缓存（ISR / use cache）、数据库优化 |

**讲解：**

1. 排查工具链：Chrome DevTools 的 Lighthouse 跑实验室评分，`Performance` 面板看真实交互；线上数据用 `vercel analytics` 或接入 `web-vitals` 库回传。
2. Next.js 优化有明确的先后级：先让路由静态化/ISR 化（收益最大），再处理图片字体这类资源优化，最后才考虑手工调 React 渲染。缓存调优见第 3 篇与第 7 篇。
3. 16 支持 `reactCompiler: true`（稳定但默认关闭）自动做组件记忆化，减少多余重渲染；开启会拉长构建时间，建议在性能问题确认后再启用。

## 5. 部署方式选择

| 方式 | 适合 | 关键要点 |
| --- | --- | --- |
| Vercel | 学习、中小项目、快速上线 | 官方平台，push 即部署，图片/ISR/Cache Components 开箱即用 |
| 自托管 Node | 需要掌控运行时的团队 | `output: "standalone"` + 进程守护 + Nginx 反代 |
| Docker 容器 | 统一交付流程、混合云 | 多阶段构建 + standalone，见下方示例 |
| 静态导出 | 纯静态站（无服务端逻辑） | `output: "export"`，失去 SSR/ISR/图片优化/Route Handlers |

```dockerfile
# 多阶段构建（配合 next.config.ts 中 output: "standalone"）
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production
# standalone 只复制运行所需文件（含最小 node_modules）
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

**讲解：**

1. **静态导出的边界**：`output: "export"` 只适用于"构建期就完全确定"的站点——Server Actions、Route Handlers、ISR、图片优化服务都不可用；`cacheComponents`（Cache Components）也不支持静态导出。需要任何服务端能力就选前三种。
2. **运行时要求**：Next.js 16 要求 Node.js 20.9+。旧的 `runtime = 'edge'` 路由段配置已废弃，Cache Components 明确只支持 Node.js 运行时；新项目无需也无法再选择边缘运行时。
3. **自托管的缓存**：`use cache` 的默认实现是实例内存缓存（可用 `cacheMaxMemorySize` 调整容量），单实例部署"能用"；多实例或 Serverless 场景需要平台提供持久缓存 handler（`use cache: remote`）或自行配置 ISR 缓存目录，否则缓存命中率和跨实例一致性会打折。详见第 7 篇。
4. 反向代理（Nginx/Caddy）典型职责：终止 HTTPS、gzip/brotli 压缩、把 `/_next/static/` 等不可变资源设置长缓存（带内容哈希的文件名可以放心 `max-age` 一年），其余路径转发给 Node 进程。
5. 上线前最小检查清单：`next build` 无错误且路由标记符合预期；密钥未出现在客户端产物；安全响应头已配置（见第 8 篇第 5 节）；生产 `next start` 可访问且日志无异常。

## 6. 动手试试

1. 把项目部署到 Vercel（`vercel` 命令或 GitHub 导入），对照第 1 节读懂构建日志中每个路由的 `○/●/ƒ` 标记。
2. 写出上文的多阶段 Dockerfile，本地 `docker build` 后 `docker run -p 3000:3000` 验证，再用 `docker image ls` 对比 standalone 与完整 `node_modules` 的镜像体积差。
3. 用 Lighthouse 跑一次首页性能报告，按第 4 节的表挑一项优化（最常见：给首屏图片加 `priority`），复测对比 LCP 变化。
4. 故意把一个密钥加 `NEXT_PUBLIC_` 前缀构建一次，在浏览器源代码里找到它，再改回来——亲眼看一次泄漏路径，比背十遍规则有效。

## 7. 一句话记住

> 构建看日志标记：`○` 静态、`●` ISR、`ƒ` 动态，能静态就静态；密钥只进服务端变量，`NEXT_PUBLIC_` 即公开；图片字体交给 next/image 与 next/font；部署三选一——Vercel 省心、standalone + Docker 可控、纯静态才考虑 export；性能问题按"静态化 -> 资源优化 -> 渲染调优"的顺序动刀。

- 缓存与渲染策略决定了路由能不能静态化，见第 3 篇《Next.js 数据获取与缓存》、第 6 篇《渲染策略与缓存》与第 7 篇《缓存体系与 Cache Components 深入》。
- 安全响应头、HTTPS 与 proxy 配置，见第 8 篇《认证、代理与安全》。
- Docker 多阶段构建的通用写法，见 devops 模块《Dockerfile 多阶段构建》。
