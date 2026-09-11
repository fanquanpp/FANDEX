---
order: 90
title: Bun 快速入门：项目、依赖与测试
module: 'nestjs'
category: 后端技术
difficulty: beginner
description: bun init 创建项目、bun add 管理依赖、bun test 编写测试，完整走一遍小工具开发。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'nestjs/080-BunOverview'
  - 'nestjs/100-BunBuiltinServerSQL'
  - 'nestjs/120-BunTestBench'
prerequisites:
  - 'nestjs/080-BunOverview'
---

## 0. 一句话理解

> Bun 的项目还是 `package.json` + `node_modules` 那套（生态兼容），只是执行更快、命令更短、测试内置。

本篇以"演出海报文件夹整理工具"为背景，把建项目、装依赖、写测试、打包四件事走一遍——这套动作在任何 Bun 项目里都一样。

## 1. 初始化项目

```bash
bun init -y
```

```text
package.json   index.ts   tsconfig.json   .gitignore
```

**讲解：**

1. `bun init` 生成 `package.json`、`index.ts`、`tsconfig.json` 与 `.gitignore`；`-y` 跳过交互提问。
2. 生成的 `index.ts` 里有一个可运行的 `server` 示例，`bun run index.ts` 立刻能看到效果。
3. 对比 `npm init`：多出了开箱即用的 TypeScript 配置，无需再装 `typescript` 与 `ts-node`——`bun run` 与 `bun test` 都原生理解 TS。

## 2. 管理依赖

```bash
bun add hono                # 运行时依赖
bun add -d @types/bun       # 开发依赖（-d 等价 npm 的 --save-dev）
bun remove hono             # 卸载
bun add zod@3               # 安装指定版本段
```

**讲解：**

1. `bun add` 安装并写入 `package.json` 的 dependencies；`-d` 写入 devDependencies，`bun remove` 卸载。
2. 锁文件是文本格式的 `bun.lock`（Bun 1.2 起，取代旧二进制 `bun.lockb`），可读、可评审、合并冲突好处理；提交 git 保证环境一致。
3. 安装速度快的原理：并行下载 + 全局内容寻址缓存——同一版本的包文件在全局只存一份，项目里用硬链接指过去，重复安装近乎零成本。
4. 团队约定一条：同一项目只用一个包管理器。bun.lock 与 package-lock.json 并存会导致两套工具解析出不同版本，"我这能跑"的经典事故由此而来。

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

```text
math.test.ts:
pass factorial > 0 的阶乘是 1
pass factorial > 5 的阶乘是 120
pass factorial > 负数抛错

 3 pass
 (0ms)
```

**讲解：**

1. `bun:test` 提供与 Jest 几乎相同的 API：`describe/test/expect`；Jest 项目迁移基本是"改 import 来源"这一步。
2. 测试文件命名 `*.test.ts`（或 `*_test.ts`）会被自动发现，不需要配置文件；要排除某个目录用 `bunfig.toml` 配置。
3. 三个用例分别覆盖：边界（0）、正常（5）、异常（负数）——这是测试设计的标准三分法。
4. `bun test` 默认并发运行测试文件；1.3.13 起 `--parallel` 可跨多个 worker 进程分发，大型仓库整体提速更明显。
5. mock、快照、覆盖率等进阶用法（`jest.fn` 风格的 `mock()`、`--coverage`）见[内置测试与基准](/nestjs/120-BunTestBench)。

## 4. scripts 与任务

```json
// package.json
{
  "name": "poster-tools",
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

1. `bun --watch index.ts` 监听文件变化自动重启，相当于 Node 生态的 nodemon；`--hot` 是热重载（尽量保留进程内状态），开发服务时更顺滑。
2. `bun build --target bun` 打出专门给 Bun 运行的产物，还可以用 `--target browser`（浏览器）或 `--target node`（Node）。
3. `type: "module"` 让项目默认使用 ESM 语法。
4. `bun run dev` 会读取 scripts 并用 Bun 执行；npm 生态的脚本大多原样可用，`pre`/`post` 钩子同样生效。

## 5. bunx：临时执行 npm 命令

```bash
bunx create-vite my-app   # 不全局安装，直接跑 npm 包的命令
bunx tsc --version
```

**讲解：**

1. `bunx` 对标 `npx`：临时下载并执行包里的命令，用完即走，不污染全局。
2. 首次执行会下载包（进全局缓存），第二次几乎瞬时——缓存复用与 `bun install` 同源。

## 6. 常见陷阱

1. **`bun test` 找不到测试**：默认匹配 `*.test.{ts,js,...}` 与 `*_test.*`；文件名写成 `tests.ts` 不会被发现。
2. **在测试里读环境变量拿不到**：`bun test` 有自己的环境隔离习惯，`.env` 文件里的变量需要显式加载（Bun 自动读取项目根目录 `.env`，但 CI 注入的变量名要与代码一致）；CI 与本地差异优先排查变量来源。
3. **依赖的 postinstall 脚本没执行**：Bun 默认不运行依赖的生命周期脚本（供应链防护）。确需允许时把包名加进 package.json 的 `trustedDependencies`，不要图省事全局放开。
4. **把 `bun.lockb`（旧二进制）留在仓库**：1.2 之后新锁文件是 `bun.lock`；两者并存会让团队成员解析出不同结果，迁移时删旧留新。
5. **期待 `bun run` 代替构建**：`bun run` 是"跑"，`bun build` 才是"打包"；部署前忘了 build，服务器上跑的是旧产物。

## 7. 动手试试

1. 给 `factorial` 加 `1 的阶乘` 测试并运行 `bun test`。
2. 用 `bun add` 安装 `zod`，写一个校验邮箱的小函数与对应测试。
3. 用 `bun build` 打包，观察产物文件与体积；再试 `--target browser` 对比产物差异。
4. 把上面四步写成 package.json 的 scripts，体验"一个文件就是项目说明书"。

## 8. 本篇小结

**初学者要点：**

- Bun 不改变 Node 的项目形态，只把安装、运行、测试、打包四件事变快变短；测试从第一天就写，成本几乎为零。
- 命令对照记忆：`npm install` -> `bun install`、`npx` -> `bunx`、`nodemon` -> `bun --watch`、`jest` -> `bun test`。
- 文本锁文件 `bun.lock` 入库，团队与 CI 版本一致。

**进阶注意：**

- 生命周期脚本默认禁用是安全特性不是 bug；`trustedDependencies` 是唯一的正规入口。
- 从 Jest 迁移先改 import、再跑全量；mock 与快照的深度用法留在测试篇专门练。
