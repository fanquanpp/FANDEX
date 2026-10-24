---
order: 80
title: Bun 概述与快速上手
module: 'nestjs'
category: 后端技术
difficulty: beginner
description: 零基础第一课：认识"全家桶"运行时 Bun，两分钟跑起第一个 TypeScript 脚本。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'nestjs/090-BunQuickStart'
  - 'nestjs/100-BunBuiltinServerSQL'
  - 'javascript/020-JavaScriptOverviewRuntimeEnv'
prerequisites:
  - 'javascript/020-JavaScriptOverviewRuntimeEnv'
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

```text
你好，Bun！
启动耗时：0.4ms
```

**讲解：**

1. `bun hello.ts` 直接执行 TypeScript，无需安装 ts-node 或先编译。
2. `performance.now()` 返回毫秒时间戳，前后相减得到运行耗时——Bun 的进程启动通常在个位数毫秒级（官方 1.4 数据：Linux 冷启动约 5ms，Windows 约 15ms）。
3. 同样代码用 `node hello.js` 对比，能直观感受到运行时差异；快来自底层实现（进程更轻、启动路径更短），而不是魔法。

## 1. Bun 是什么

Bun 是 2022 年发布的 JavaScript/TypeScript 运行时与一体化工具链，底层用 JavaScriptCore 引擎（Safari 同款，而非 Node 的 V8），1.0 之前的实现语言是 Zig，1.4（2026-08）起核心迁移为 Rust。它的目标是"一个工具替代 Node.js + npm + webpack + jest"：

- 运行时：兼容 Node.js API 与 npm 生态，冷启动与 I/O 更快；
- 包管理器：`bun install` 并行下载 + 全局内容寻址缓存，通常比 npm 快数倍；
- 打包器：内置打包、压缩与 React Compiler 集成（对标 webpack/esbuild）；
- 测试器：内置 Jest 兼容的测试框架；
- 运行器：`bunx` 对标 `npx`，临时执行 npm 包命令。

一个类比：Node 生态是"工具箱"，每个工具（npm、jest、webpack）各买各的、版本各配各的；Bun 是"多功能瑞士军刀"，一把刀全包——换来的是零配置和统一体验，代价是刀刃的每个功能都比专业工具"够用但不一定最深"。

> 花絮：2025 年 12 月 Bun 团队加入 Anthropic，项目以开源方式继续开发；对使用者来说，关注 release notes 即可。

### 1.1 版本现状（2026-09）

- Bun 1.4.x 为当前稳定版（1.4 于 2026-08-20 发布）。核心以 Rust 重写，资源占用显著下降（空闲 CPU 降至约五分之一、内存最多省 35%），Node 兼容性迎来 1.0 以来最大跃升（新增 1500+ 项 Node 测试通过，Playwright、Next.js、Vitest 可直接运行）。
- 1.4 亮点：内置无头浏览器自动化 `Bun.WebView`、图像库 `Bun.Image`、Markdown 解析 `Bun.markdown`、终端 PTY `Bun.Terminal`、系统级定时任务 `Bun.cron()`；`bun build` 集成 React Compiler。测试并行的三件套（`--parallel` 跨 worker 进程分发、`--shard` CI 分片、`--changed` 只测受影响用例）已于 1.3.13（2026-04）落地。
- 1.3（2025-10）确立三大内置能力：零配置前端开发服务器、统一 SQL API（`Bun.SQL` 支持 PostgreSQL/MySQL/SQLite）、内置 Redis 客户端。
- 1.2（2025-01）是兼容性分水岭：`Bun.serve` 支持路由表、内置 S3 客户端（`Bun.S3Client`）、文本锁文件 `bun.lock` 取代二进制锁文件。
- 兼容性：Node.js 项目大多可直接 `bun run` 启动；Windows（含 ARM64）支持已成熟。

| 版本 | 发布 | 一句话记忆点 |
| --- | --- | --- |
| 1.2 | 2025-01 | Node 兼容大跃进、路由表、S3 客户端、文本锁文件 |
| 1.3 | 2025-10 | 前端零配置开发、统一 SQL、内置 Redis（1.3.13 起测试并行/分片/增量） |
| 1.4 | 2026-08 | Rust 重写、WebView/Image/Markdown/Cron 内置、Node 兼容跃升 |

## 2. 与 Node.js 对比

| 维度 | Node.js | Bun |
| --- | --- | --- |
| JS 引擎 | V8 | JavaScriptCore |
| 冷启动 | 较慢 | 个位数毫秒级 |
| 包管理 | npm/pnpm/yarn | bun（也兼容 npm 仓库） |
| 测试 | 需额外安装 Jest/Vitest | 内置（Jest 兼容 API） |
| 打包 | 需 webpack/Vite | 内置 |
| 数据库/对象存储 | 各装驱动 | SQLite/Postgres/MySQL/S3/Redis 内置 |
| 兼容性 | 标准 | 高度兼容 Node API，仍有少数边缘差异 |

**什么时候选 Bun：**

1. 脚本、CLI 与小型全栈服务——启动快、内置全，一条命令完成开发闭环；
2. 追求安装/测试速度的 monorepo——`bun install` 与 `bun test --parallel` 的提速是数量级的；
3. 想减少依赖数量的项目——SQLite、S3、Redis 驱动都内置，lockfile 能瘦一大圈。

什么时候慎选：重度依赖个别 Node 原生插件、或使用 Bun 尚未完全兼容的库时，先用 `bun run` 跑一遍现有测试套件再决定切换；生产关键系统切换前，把兼容性验证当成一次正式的回归测试。

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

1. `bun run` 既能跑 TS 文件，也能跑 `package.json` 里的 scripts（如 `bun run dev`）；跑脚本时 `bun script.ts` 可省略 `run`。
2. `bun add` 与 npm 的 `npm install 包` 等价，生成的还是 `package.json` + 锁文件——项目形态不变，团队可以有人用 npm、有人用 Bun。
3. `bun build` 把入口文件连同依赖打包成浏览器可用或服务器可用的产物；`--target` 选择目标运行时。

## 4. 常见陷阱

1. **拿"Bun 兼容 Node"当"等于 Node"**：绝大多数常用 API 无差异，但边缘模块（个别原生插件、未覆盖的 Node 内置行为）可能不同；切换前跑全量测试是最便宜的验证。
2. **锁文件混用工具**：同一项目里 bun.lock 与 package-lock.json 并存，两套工具各自解析出不同版本。项目选定一个包管理器，另一个锁文件进 .gitignore。
3. **误以为 `bun install` 会执行任意 postinstall 脚本**：出于供应链安全考虑，Bun 默认禁止依赖的生命周期脚本，需要显式信任（trustedDependencies）。装含编译步骤的包失败时，先想到这条。
4. **在 Node 项目里用 Bun 特有 API**（`Bun.serve`、`bun:sqlite` 等）：代码会失去 Node 可运行性；要跨运行时的库代码只用 Web 标准 API，Bun 专属能力收敛在应用入口层。
5. **升级不做隔离验证**：Bun 迭代快、兼容面持续扩大，升级后先跑 `bun test` 全量过一遍，CI 里固定版本号避免流水线"自动漂移"。

## 5. 动手试试

1. 用 `bun init` 初始化一个项目，观察生成的 `package.json` 与 `index.ts`。
2. 写一个斐波那契计算脚本，分别用 `node` 与 `bun` 运行 10 次，记录平均耗时。
3. 用 `bunx` 运行一个 npm CLI 工具（如 `bunx tsc --version`）。
4. 运行 `bun --version` 确认版本，去 bun.com/blog 对照一次 release notes，认识"读更新日志"这个习惯的价值。

## 6. 本篇小结

**初学者要点：**

- Bun 把运行时、包管理、打包、测试装进一个二进制：`bun run` 一条命令，快是它的名片。
- 项目形态与 Node 完全一致（package.json + node_modules），切换的心理成本主要在"命令换名字"。
- 版本记忆：1.2 补兼容、1.3 补内置（SQL/Redis）、1.4 换 Rust 底座；学习时按 1.2+ 的行为理解即可。

**进阶注意：**

- 兼容性是概率而不是承诺：新项目用 Bun 很安全，存量项目切换必须先过测试套件。
- Bun 专属 API 很香，但会让代码绑定运行时——分层设计，把 `Bun.*` 调用收敛到边界层。
