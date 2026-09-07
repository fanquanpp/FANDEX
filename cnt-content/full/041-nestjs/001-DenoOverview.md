---
order: 10
title: Deno 概述与快速上手
module: 'nestjs'
category: 后端技术
difficulty: beginner
description: 零基础第一课：理解 Deno 的安全模型与内置工具链，用两分钟运行第一个 TypeScript 脚本。
author: fanquanpp
updated: '2026-09-08'
related:
  - 'nestjs/002-DenoQuickStart'
  - 'nestjs/003-DenoPermissionsSecurity'
  - 'typescript/003-TypeScriptOverviewEnvSetup'
prerequisites:
  - 'javascript/002-JavaScriptOverviewRuntimeEnv'
---

## 0. 两分钟运行第一个脚本（先读这里）

> 学习目标：安装 Deno 并运行一个 TypeScript 脚本，感受"无需配置文件"的开发体验。

```bash
# Windows（PowerShell）
irm https://deno.land/install.ps1 | iex

# 或通过包管理器
winget install DenoLand.Deno
```

```typescript
// hello.ts
const name = Deno.args[0] ?? "世界"
console.log(`你好，${name}！`)
```

```bash
deno run hello.ts 小明
```

**讲解：**

1. `Deno.args` 是命令行参数数组，`?? "世界"` 在未传参时给默认值。
2. 不需要 `package.json`、不需要 `tsconfig.json`、不需要先编译——`deno run` 直接执行 TypeScript。
3. 输出 `你好，小明！`，第一个 Deno 程序完成。

## 1. Deno 是什么

Deno 是 Node.js 创始人 Ryan Dahl 于 2020 年发布的 JavaScript/TypeScript 运行时，由 Rust 编写。它的设计目标是修复 Node.js 的历史问题：

- 默认安全：脚本不能随意读文件、写网络，必须显式授权；
- 原生 TypeScript：不需要 ts-node、webpack；
- 去中心化依赖：直接用 URL 导入，或使用 JSR/npm 包；
- 内置工具链：格式化、测试、代码检查、打包全部内置。

### 1.1 版本现状（2026-08）

- Deno 2.7+ 为当前稳定版（2.7 于 2026-02 发布，引入 Temporal API、Windows ARM 支持与 npm overrides）。
- 2.x 兼容 npm 包与 Node.js 项目（`node:` 前缀导入），迁移成本已大幅降低。
- 配套平台：Deno Deploy 提供边缘部署、KV 存储与 Cron 定时任务。

## 2. 内置工具链

```bash
deno fmt            # 格式化代码
deno lint           # 代码检查
deno test           # 运行测试
deno compile hello.ts  # 编译成单个可执行文件
```

**讲解：**

1. `deno fmt` 与 `deno lint` 对标 Prettier/ESLint，零配置即用。
2. `deno test` 自动发现 `*_test.ts` 文件并运行，内置断言库。
3. `deno compile` 把脚本连同运行时打包成单文件可执行程序，适合分发 CLI 工具。

## 3. 与 Node.js 的对比

| 维度 | Node.js | Deno |
| --- | --- | --- |
| 类型支持 | 需 tsx/ts-node | 原生 TypeScript |
| 模块 | npm + CommonJS/ESM | URL/JSR/npm，标准 ESM |
| 权限 | 默认全开 | 默认全关，按需授权 |
| 配置 | package.json + 一堆工具 | 零配置起步 |
| 生态 | 全球最大 | 兼容 npm，原生生态快速增长 |

## 4. 动手试试

1. 修改 `hello.ts`，用 `Deno.readTextFile` 读取同目录的一个 txt 文件，运行后观察权限提示。
2. 运行 `deno fmt hello.ts` 看看格式化效果。
3. 用 `deno compile hello.ts` 生成可执行文件并运行它。

## 5. 一句话记住

> Deno = 原生 TypeScript + 默认安全的现代运行时；一个命令跑脚本，一条权限规则保护系统。
