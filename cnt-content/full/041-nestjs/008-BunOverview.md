---
order: 80
title: Bun 概述与快速上手
module: 'nestjs'
category: 后端技术
difficulty: beginner
description: 零基础第一课：认识"全家桶"运行时 Bun，两分钟跑起第一个 TypeScript 脚本。
author: fanquanpp
updated: '2026-08-03'
related:
  - 'nestjs/009-BunQuickStart'
  - 'nestjs/010-BunBuiltinServerSQL'
  - 'javascript/002-JavaScriptOverviewRuntimeEnv'
prerequisites:
  - 'javascript/002-JavaScriptOverviewRuntimeEnv'
---

## 0. 两分钟运行第一个脚本（先读这里）

> 学习目标：安装 Bun 并运行 TypeScript，体验"启动快到感觉不到"。

```bash
# Windows（PowerShell）
powershell -c "irm bun.sh/install.ps1 | iex"
```

```typescript
// hello.ts
const start = performance.now()
console.log("你好，Bun！")
console.log(`启动耗时：${(performance.now() - start).toFixed(1)}ms`)
```

```bash
bun hello.ts
```

**讲解：**

1. `bun hello.ts` 直接执行 TypeScript，无需安装 ts-node 或先编译。
2. `performance.now()` 返回毫秒时间戳，前后相减得到运行耗时——Bun 的冷启动通常在十几毫秒内。
3. 同样代码用 `node hello.js` 对比，能直观感受到运行时差异。

## 1. Bun 是什么

Bun 是一个由 Zig 编写的 JavaScript/TypeScript 运行时与工具链，2022 年发布，目标是"一个工具替代 Node.js + npm + webpack + jest"：

- 运行时：兼容 Node.js API，比 Node 冷启动更快；
- 包管理器：`bun install` 比 npm/pnpm 快数倍，可直接读取 npm 包；
- 打包器：内置打包与压缩（对标 webpack/esbuild）；
- 测试器：内置 Jest 风格测试框架；
- 运行器：`bunx` 对标 `npx`。

### 1.1 版本现状（2026-08）

- Bun 1.3.x 为当前稳定版（1.3.14，2026-05）；1.3 引入零配置前端开发、统一 SQL API、内置 Redis 客户端。
- 兼容性：Node.js 项目大多可直接用 `bun run` 启动；Windows 支持已成熟。

## 2. 与 Node.js 对比

| 维度 | Node.js | Bun |
| --- | --- | --- |
| 语言 | C++ | Zig |
| 冷启动 | 较慢 | 极快 |
| 包管理 | npm/pnpm/yarn | bun（也兼容 npm 仓库） |
| 测试 | 需额外安装 Jest/Vitest | 内置 |
| 打包 | 需 webpack/Vite | 内置 |
| 兼容性 | 标准 | 兼容 Node API，少数边缘差异 |

## 3. 内置命令速览

```bash
bun run script.ts   # 运行脚本（兼容 package.json scripts）
bun install         # 安装依赖
bun add hono        # 添加依赖
bun test            # 运行测试
bun build ./src/index.ts --outdir dist  # 打包
bunx cowsay "hi"    # 临时执行 npm 包
```

**讲解：**

1. `bun run` 既能跑 TS 文件，也能跑 `package.json` 里的 scripts（如 `bun run dev`）。
2. `bun add` 与 npm 的 `npm install 包` 等价，生成的还是 `package.json` + 锁文件。
3. `bun build` 把入口文件连同依赖打包成浏览器可用或服务器可用的产物。

## 4. 动手试试

1. 用 `bun init` 初始化一个项目，观察生成的 `package.json` 与 `index.ts`。
2. 写一个斐波那契计算脚本，分别用 `node` 与 `bun` 运行 10 次，记录平均耗时。
3. 用 `bunx` 运行一个 npm CLI 工具（如 `bunx tsc --version`）。

## 5. 一句话记住

> Bun 把运行时、包管理、打包、测试装进一个二进制：`bun run` 一条命令，快是它的名片。
