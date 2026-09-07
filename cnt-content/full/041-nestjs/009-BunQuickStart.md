---
order: 90
title: Bun 快速入门：项目、依赖与测试
module: 'nestjs'
category: 后端技术
difficulty: beginner
description: bun init 创建项目、bun add 管理依赖、bun test 编写测试，完整走一遍小工具开发。
author: fanquanpp
updated: '2026-09-08'
related:
  - 'nestjs/008-BunOverview'
  - 'nestjs/010-BunBuiltinServerSQL'
prerequisites:
  - 'nestjs/008-BunOverview'
---

## 0. 一句话理解

> Bun 的项目还是 `package.json` + `node_modules` 那套（生态兼容），只是执行更快、命令更短、测试内置。

## 1. 初始化项目

```bash
bun init -y
```

**讲解：**

1. `bun init` 生成 `package.json`、`index.ts`、`tsconfig.json` 与 `.gitignore`。
2. `-y` 跳过交互提问；生成的 `index.ts` 里有一个可运行的 `server` 示例。
3. 对比 `npm init`：多出了开箱即用的 TypeScript 配置，无需再装 `typescript` 与 `ts-node`。

## 2. 管理依赖

```bash
bun add hono
bun add -d @types/bun
bun remove hono
```

**讲解：**

1. `bun add` 安装运行时依赖，`-d` 安装开发依赖，`bun remove` 卸载。
2. 锁文件是 `bun.lock`（也兼容 `bun.lockb`），提交 git 保证环境一致。
3. 安装速度快的原理：并行下载 + 全局内容寻址缓存，同一版本只存一份。

## 3. 内置测试框架

```typescript
// math.ts
export function factorial(n: number): number {
  if (n < 0) throw new Error("负数没有阶乘")
  let result = 1
  for (let i = 2; i <= n; i++) result *= i
  return result
}
```

```typescript
// math.test.ts
import { describe, expect, test } from "bun:test"
import { factorial } from "./math"

describe("factorial", () => {
  test("0 的阶乘是 1", () => {
    expect(factorial(0)).toBe(1)
  })

  test("5 的阶乘是 120", () => {
    expect(factorial(5)).toBe(120)
  })

  test("负数抛错", () => {
    expect(() => factorial(-1)).toThrow("负数")
  })
})
```

```bash
bun test
```

**讲解：**

1. `bun:test` 提供与 Jest 几乎相同的 API：`describe/test/expect`。
2. 测试文件命名 `*.test.ts` 会被自动发现，不需要配置文件。
3. 三个用例分别覆盖：边界（0）、正常（5）、异常（负数）——这是测试设计的标准三分法。
4. `bun test` 默认并发运行测试文件，整体速度远快于 Jest。

## 4. scripts 与任务

```json
// package.json
{
  "name": "demo",
  "type": "module",
  "scripts": {
    "dev": "bun --watch index.ts",
    "start": "bun index.ts",
    "test": "bun test",
    "build": "bun build ./index.ts --outdir dist --target bun"
  }
}
```

**讲解：**

1. `bun --watch index.ts` 监听文件变化自动重启，相当于 Node 生态的 nodemon。
2. `bun build --target bun` 打出专门给 Bun 运行的产物，还可以用 `--target browser` 或 `--target node`。
3. `type: "module"` 让项目默认使用 ESM 语法。

## 5. 动手试试

1. 给 `factorial` 加 `1 的阶乘` 测试并运行 `bun test`。
2. 用 `bun add` 安装 `zod`，写一个校验邮箱的小函数与对应测试。
3. 用 `bun build` 打包，观察产物文件与体积。

## 6. 一句话记住

> Bun 不改变 Node 的项目形态，只把安装、运行、测试、打包四件事变快变短；测试从第一天就写，成本几乎为零。
