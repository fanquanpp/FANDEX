---
order: 40
title: Next.js 部署与性能优化
module: 'nextjs'
category: 前端技术
difficulty: intermediate
description: 构建产物、环境变量、Vercel 与自托管部署、图片字体优化与核心性能指标排查。
author: fanquanpp
updated: '2026-09-08'
related:
  - 'nextjs/003-DataFetchingCaching'
  - 'devops/029-DockerfileMultiBuild'
  - 'cloud-computing/009-DockerDeepAnalysis'
prerequisites:
  - 'nextjs/003-DataFetchingCaching'
---

## 0. 一句话理解

> 部署 = `next build` 产出优化后的产物；优化 = 图片走 next/image、字体走 next/font、慢查询加缓存。

## 1. 构建与产物

```bash
npm run build
```

**讲解：**

1. 构建时 Next.js 会输出三类页面：静态页（SSG）、ISR 页（按 revalidate 更新）、动态页（SSR 或客户端渲染）。
2. 构建日志里 `○` 表示静态、`ƒ` 表示动态、`●` 表示 ISR，新项目应尽量让更多页面静态化。
3. 产物默认输出到 `.next/`；用 Docker 部署时参考 `next.config.ts` 的 `output: "standalone"` 模式，只复制运行所需文件。

## 2. 环境变量

```bash
# .env.local（仅本机，不提交 git）
DATABASE_URL="postgres://..."
NEXT_PUBLIC_SITE_URL="https://example.com"
```

```tsx
// 服务端读取
const dbUrl = process.env.DATABASE_URL
// 客户端读取（必须 NEXT_PUBLIC_ 前缀，会打包进浏览器代码）
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
```

**讲解：**

1. 不带前缀的变量只在服务器端可用，密钥（数据库密码、API Key）绝不能加 `NEXT_PUBLIC_`。
2. 以 `NEXT_PUBLIC_` 开头的变量会被内联进浏览器包，任何人都能看到，只放公开信息。
3. 生产环境在部署平台配置同名变量即可覆盖，不需要改代码。

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
        priority
      />
    </main>
  )
}
```

**讲解：**

1. `next/image` 自动做响应式尺寸、WebP/AVIF 转换与懒加载；`priority` 让首屏图片提前加载。
2. `width/height` 必须提供，用来预留空间防止布局偏移（CLS）。
3. `next/font` 自动托管字体并优化加载，避免第三方字体阻塞渲染；中文字体体积大，建议只引入需要的字重或使用子集。

## 4. 核心性能指标自查

| 指标 | 含义 | 常见优化 |
| --- | --- | --- |
| LCP | 最大内容绘制（首屏） | 图片加 priority、减少阻塞脚本、服务端渲染关键内容 |
| CLS | 布局偏移 | 图片/字体预留尺寸，避免内容弹出 |
| INP | 交互延迟 | 减少客户端 JS、拆分组件、避免长任务 |
| TTFB | 首字节时间 | 使用 CDN 边缘缓存、数据库查询优化、ISR |

## 5. 部署方式选择

- **Vercel**：官方平台，push 即部署，推荐学习与中小企业使用；
- **自托管 Node**：`output: "standalone"` + Docker + Nginx 反向代理；
- **静态导出**：纯静态站可 `output: "export"` 部署到任意静态托管，但会失去 SSR/ISR 能力。

## 6. 动手试试

1. 把项目部署到 Vercel（`vercel` 命令或 GitHub 导入），观察构建日志中的路由类型。
2. 用 Chrome DevTools 的 Lighthouse 跑一次性能报告，对照上表优化其中一项。
3. 写一个 Dockerfile（多阶段构建 + standalone 输出），本地 `docker build` 成功。

## 7. 一句话记住

> 构建时能静态就静态，密钥只进服务端环境变量，图片字体交给 next/image 与 next/font，性能报告用 Lighthouse 说话。
