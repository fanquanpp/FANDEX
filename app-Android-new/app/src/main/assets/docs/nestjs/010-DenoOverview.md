---
order: 10
title: Deno 概述与快速上手
module: 'nestjs'
category: 后端技术
difficulty: beginner
description: 零基础第一课：理解 Deno 的安全模型与内置工具链，用两分钟运行第一个 TypeScript 脚本。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'nestjs/020-DenoQuickStart'
  - 'nestjs/030-DenoPermissionsSecurity'
  - 'typescript/030-TypeScriptOverviewEnvSetup'
prerequisites:
  - 'javascript/020-JavaScriptOverviewRuntimeEnv'
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
4. 运行不带参数的 `deno` 会进入交互式 REPL（读取-求值-打印循环），适合随手验证一行 API；`deno repl` 是它的显式写法。

## 1. Deno 是什么

Deno 是 Node.js 创始人 Ryan Dahl 于 2020 年发布 1.0 的 JavaScript/TypeScript 运行时，由 Rust 编写，基于 V8 引擎与 Tokio 异步运行时。它的起源很有戏剧性：2018 年 Ryan 在 JSConf 演讲《我对 Node.js 感到后悔的十件事》中复盘了 Node 的历史包袱（安全模型缺失、模块系统混乱、package.json 泛滥），Deno 就是这份"后悔清单"的正面回应。

它的设计目标可以浓缩为四条：

- 默认安全：脚本不能随意读文件、访问网络，必须显式授权（详见[权限模型与安全实践](/nestjs/030-DenoPermissionsSecurity)）；
- 原生 TypeScript：编译器内置，不需要 ts-node、tsx、webpack 之类的胶水；
- 现代模块：直接用 URL 导入，或使用 JSR/npm 包；Deno 2 起兼容 `package.json` 与 `node_modules`，Node 项目迁移成本大幅降低；
- 内置工具链：格式化、测试、基准、代码检查、打包、编译单文件可执行程序，全部一条命令。

把运行时类比成"机场安检"更容易理解 Node 与 Deno 的差异：Node 是"乘客（代码）落地即放行，想去哪去哪"；Deno 是"默认全部拦下，你要去登机口、去免税店，必须逐项出示通行证（权限参数）"。安检多花几秒，换来的是劫机（恶意依赖）几乎无从下手。

### 1.1 版本现状（2026-09）

- Deno 2.9 为当前稳定版（2026-06-25 发布，引入 `deno desktop`、CSS 模块导入、快照测试与参数化测试、Node.js 26 兼容）。
- 2.x 关键节点：2.0（2024-10）开启 npm 与 `package.json` 兼容时代；2.4（2025-07）恢复 `deno bundle` 并稳定内置 OpenTelemetry；2.5（2025-09）支持在配置文件里管理权限集；2.6（2025-12）推出 `dx`（跑包二进制的新入口，口号"dx is the new npx"）与 `deno audit` 供应链审计；2.7（2026-02）稳定 Temporal 日期 API、支持 Windows ARM；2.8（2026-05）支持 `import defer` 并新增 `deno transpile`、`deno ci` 等子命令。
- 配套平台：Deno Deploy 提供边缘部署、KV 存储与 Cron 定时任务（见[Web 开发与云端部署](/nestjs/070-DenoWebFrameworkDeploy)）。

| 版本 | 发布 | 与初学者最相关的能力 |
| --- | --- | --- |
| 2.0 | 2024-10 | 兼容 npm 包与 Node 项目，`node:` 前缀导入 |
| 2.5 | 2025-09 | 权限写进 deno.json（权限集），不用每次敲一长串 |
| 2.6 | 2025-12 | `deno audit` 依赖漏洞扫描、`dx` 快速运行包命令 |
| 2.7 | 2026-02 | Temporal 日期 API 稳定，替代 Date 的现代方案 |
| 2.9 | 2026-06 | 当前稳定版；Node 26 兼容、快照测试 |

学习本模块不需要追新特性：2.x 各版本对基础语法（导入、权限、测试）完全向后兼容，先用起来，再按需关注新版公告。

## 2. 内置工具链

```bash
deno fmt               # 格式化代码（含 Markdown、JSON、YAML）
deno lint              # 代码检查，默认启用推荐规则集
deno test              # 运行测试，自动发现 *_test.ts / *.test.ts
deno bench             # 运行基准测试
deno check main.ts     # 对文件做类型检查
deno compile hello.ts  # 编译成单个可执行文件
deno info              # 查看依赖树与缓存位置
```

**讲解：**

1. `deno fmt` 与 `deno lint` 对标 Prettier/ESLint，零配置即用；`fmt --check` 在 CI 里只校验不落盘。
2. `deno test` 自动发现 `*_test.ts` 文件并运行，内置断言库 `@std/assert`，不需要安装 Jest。
3. `deno compile` 把脚本连同运行时打包成单文件可执行程序，适合分发 CLI 工具——收到的同事不需要装 Deno 也能跑。
4. 这些子命令全部开箱即用：一个二进制文件覆盖了 Node 生态里 prettier、eslint、jest、ts-node、pkg 五个工具的职责。

## 3. 与 Node.js 的对比

| 维度 | Node.js | Deno |
| --- | --- | --- |
| 类型支持 | 需 tsx/ts-node | 原生 TypeScript |
| 模块 | npm + CommonJS/ESM | URL/JSR/npm，标准 ESM |
| 权限 | 默认全开 | 默认全关，按需授权 |
| 配置 | package.json + 一堆工具 | 零配置起步，deno.json 按需引入 |
| 生态 | 全球最大 | 兼容 npm，原生生态（JSR）快速增长 |
| 工具链 | 各工具自行组装 | fmt/lint/test/compile 全内置 |

**什么时候选 Deno：**

1. 新写的脚本、CLI 工具、小型 API 服务——零配置与类型内置让起步成本接近零；
2. 对供应链安全敏感的项目——权限模型 + 锁文件 + `deno audit` 的默认防线比 Node 的约定更硬；
3. 边缘场景（Deno Deploy）——代码与云端 API 一致，部署就是一条命令。

什么时候暂不选：团队重度依赖只支持 Node 的原生插件、或存量 Node 项目已稳定运行时，Deno 2 的兼容层虽好，也不必为迁移而迁移——先用 Deno 写新脚本是阻力最小的切入方式。

## 4. 常见陷阱与调试

1. **权限报错误以为程序有 bug**：`PermissionDenied: Requires read access to "secret.txt"` 是安全模型在起作用，不是异常。看报错第一行的 "Requires xxx access"，在运行命令补上对应 `--allow-xxx` 即可（详见[权限模型与安全实践](/nestjs/030-DenoPermissionsSecurity)）。
2. **`--watch` 模式下权限被"遗忘"**：`deno run --watch` 重启的是脚本进程，不会改权限；改了权限参数要手动重新运行命令。
3. **Windows 路径分隔符**：拼路径一律用 `@std/path` 的 `join`，手工拼 `assets/cover.png` 在 Linux 部署环境可能翻车。
4. **缓存"灵异现象"**：改了远程依赖的版本但行为没变，多半是全局缓存没刷新——`DENO_DIR` 环境变量控制缓存目录（Windows 默认 `%LOCALAPPDATA%\deno`），删除对应缓存或运行 `deno cache` 强制重取。
5. **类型报错但代码能跑**：`deno run` 默认不做全量类型检查（快速启动优先）；上线前用 `deno check` 显式验证，把错误挡在 CI。

## 5. 动手试试

1. 修改 `hello.ts`，用 `Deno.readTextFile` 读取同目录的一个 txt 文件，运行后观察权限提示。
2. 运行 `deno fmt hello.ts` 看看格式化效果，再试 `deno lint`。
3. 用 `deno compile hello.ts` 生成可执行文件并运行它，对比 `deno run` 与双击 exe 的启动速度。
4. 进入 REPL（直接运行 `deno`），输入 `Deno.version` 查看当前版本号。

## 6. 本篇小结

**初学者要点：**

- Deno = 原生 TypeScript + 默认安全的现代运行时；一个命令跑脚本，一条权限规则保护系统。
- 装好就能写：无 package.json、无 tsconfig、无编译步骤；`deno run` 与 `deno test` 是最高频的两条命令。
- 报错分两类：权限类报错补 `--allow-xxx`，语法/类型类报错改代码。

**进阶注意：**

- Deno 2 已兼容 npm 与 Node 项目结构，但"零配置"与"权限最小化"仍是它区别于 Node 的核心价值，迁移时别把这两样也丢掉。
- 2.x 迭代很快（约每季度一个 minor），生产项目用 `deno-version` 固定 CI 版本，关注 release notes 而不是盲目升级。
