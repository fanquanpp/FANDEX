---
order: 150
title: Next.js 部署与环境配置
module: 'nextjs'
category: 前端技术
difficulty: intermediate
description: 从 next build 到上线：Turbopack 构建产物怎么读、环境变量分级、四种部署方式（Vercel / standalone / Docker / 静态导出）怎么选。
author: fanquanpp
updated: '2026-10-11'
related:
  - 'nextjs/030-DataFetchingCaching'
  - 'nextjs/070-CacheComponentsDeepDive'
  - 'nextjs/088-AssetsAndPerfOptimization'
  - 'devops/060-DockerfileMultiBuild'
  - 'cloud-computing/070-DockerDeepAnalysis'
prerequisites:
  - 'nextjs/030-DataFetchingCaching'
---

## 知识点地图

- 知识类别：Next.js 应用的构建产物、环境配置与部署上线链路。
- 解决什么问题：开发环境"能跑"到生产"跑得稳"之间的鸿沟——构建日志怎么读、密钥怎么分级、四种部署方式怎么选。
- 什么时候用到：首次上线、上线后的稳定性排查、自托管/Docker 化改造。
- 渲染与缓存策略（决定路由能否静态化）见第 3、6、7 篇；图片、字体与 Web Vitals 等资源优化见《静态资源与性能优化》；本篇专注部署与环境侧。

## 0. 一句话理解

> 部署 = `next build` 产出按路由分类的优化产物，再交给运行时（Node/Docker/Vercel）执行；环境配置 = 密钥只留在服务端、公开配置才加 `NEXT_PUBLIC_` 前缀。

开发时页面"能跑"和上线后"跑得稳"是两回事。本篇覆盖从构建到上线的完整链路：构建产物怎么看、环境变量怎么分级、四种部署方式怎么选。资源与性能优化（图片、字体、bundle、Web Vitals）见《静态资源与性能优化》。

## 1. 构建与产物

```bash
npm run build
```

Next.js 16 起，开发与生产构建**默认都由 Turbopack 完成**（Turbopack 在 16 转正为默认打包器，官方数据生产构建提速 2-5 倍）；有自定义 webpack 配置的存量项目可临时用 `next build --webpack` 退回。构建结束会打印两类信息（下为文本转写；真实输出中 Next.js 标志与每行行首是绿色对勾符号）：

```text
Next.js 16 (Turbopack)

Compiled successfully in 615ms
Finished TypeScript in 1114ms
Collecting page data in 208ms
Generating static pages in 239ms

Route (app)
  /                    静态：构建时生成一次
  /blog/[id]           ISR：静态 + 定时再生
  /dashboard           动态：每次请求渲染
```

（文本转写说明：真实日志中 Next.js 标志与成功行行首为绿色对勾符号；Route 清单里每条路由前还有一个符号标记——静态是空心圆、ISR 是实心圆、动态是斜体字母 f。）

**讲解：**

1. 构建日志里空心圆标记表示静态（SSG）、实心圆表示 ISR、斜体 f 表示动态（SSR/按请求渲染）。新项目应尽量让更多页面落在静态与 ISR 两类——它们可以被 CDN 直接缓存，成本最低、速度最快。
2. 16 的构建输出会展示每个阶段的耗时（编译、类型检查、收集页面数据、生成静态页），定位"构建慢在哪一步"不再靠猜。
3. `next dev` 与 `next build` 在 16 起使用**独立的输出目录**，二者可并发执行；框架还会加锁文件防止同一项目同时跑多个 dev 或 build 实例互相覆盖产物。
4. 产物默认输出到 `.next/`，是"给服务器读的中间产物"，不要手工改动或直接部署这个目录。自托管/Docker 部署推荐配合 `output: "standalone"`（见第 3 节），它会生成一个只含运行必需文件的精简目录。
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

## 3. 部署方式选择

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

## 4. 动手实践

**任务一：读懂构建日志。** 把项目部署到 Vercel（`vercel` 命令或 GitHub 导入），对照第 1 节读懂构建日志中每个路由的静态/ISR/动态符号标记，并回答：为什么 `/dashboard` 没有被静态化？（如果你按第 3 篇练过，答案就藏在它的代码里。）提示：动态信号（cookies/headers/no-store fetch）会把整页拉进动态渲染。

**任务二：standalone 镜像对比。** 写出第 3 节的多阶段 Dockerfile，本地 `docker build` 后 `docker run -p 3000:3000` 验证；再用 `docker image ls` 记下镜像体积，与"不分阶段、直接 COPY 整个 node_modules"的土法镜像对比。提示：对比前确认 `next.config.ts` 里有 `output: "standalone"`，否则 `.next/standalone` 目录不存在，构建最后一步会报 COPY 找不到路径。

**任务三：亲眼看见密钥泄漏。** 故意把一个假密钥加 `NEXT_PUBLIC_` 前缀构建一次，在浏览器源代码里找到它，再改回来。提示：生产构建后用浏览器"查看源代码"或 DevTools 全局搜索密钥值；这个实验做完，"前缀即公开"就不再是需要记忆的规则。

先自己操作，再对照参考流程：

<details>
<summary>任务二参考操作流程</summary>

```bash
# 1. 确认配置：next.config.ts 中有 output: "standalone"
# 2. 构建镜像
docker build -t my-next-app .
# 3. 运行并验证
docker run -p 3000:3000 my-next-app
# 浏览器访问 http://localhost:3000

# 4. 体积对比
docker image ls my-next-app
```

对照组（反例，仅用于观察体积，不要用于生产）：去掉 `deps`/`build` 阶段，用单阶段 `COPY . .` + `npm install` 的 Dockerfile 构建同名不同 tag 的镜像。常见量级：standalone 三阶段镜像约 200-300MB，单阶段全量镜像可达 1.2GB 以上（本机数值以实测为准，与依赖数量强相关）。差值来自三处：多阶段只复制运行必需文件、Alpine 基础镜像小、standalone 的最小化 node_modules 剔除了 devDependencies。
</details>

<details>
<summary>任务三参考操作流程</summary>

```bash
# 1. .env.local 写入假密钥
echo 'NEXT_PUBLIC_FAKE_KEY="sk-test-do-not-use-12345"' >> .env.local
npm run build && npm run start
```

1. 浏览器打开站点，`Ctrl+U` 查看源代码，`Ctrl+F` 搜索 `sk-test-do-not-use-12345`——能直接命中，任何访客可见。
2. DevTools Sources 面板里同样能搜到：它被内联进了客户端 chunk，而不是藏在接口响应里。
3. 修复：去掉 `NEXT_PUBLIC_` 前缀，重新 build，再搜一次——搜索无结果，变量只存在于服务器进程内存中。
4. 复盘：`NEXT_PUBLIC_` 变量是**构建期内联**，这意味着即使你后来删掉它，历史构建产物里仍然带着旧值——真实事故里"改了配置"不等于"堵住了泄漏"，被泄漏的密钥必须轮换。
</details>

## 5. 一句话记住

> 构建看日志标记：空心圆静态、实心圆 ISR、斜体 f 动态，能静态就静态；密钥只进服务端变量，`NEXT_PUBLIC_` 即公开；部署三选一——Vercel 省心、standalone + Docker 可控、纯静态才考虑 export。

- 图片、字体、bundle 与 Web Vitals 等资源与性能工程，见《静态资源与性能优化》。
- 缓存与渲染策略决定了路由能不能静态化，见第 3 篇《Next.js 数据获取与缓存》、第 6 篇《渲染策略与缓存》与第 7 篇《缓存体系与 Cache Components 深入》。
- 安全响应头、HTTPS 与 proxy 配置，见第 8 篇《认证、代理与安全》。
- Docker 多阶段构建的通用写法，见 devops 模块《Dockerfile 多阶段构建》。
