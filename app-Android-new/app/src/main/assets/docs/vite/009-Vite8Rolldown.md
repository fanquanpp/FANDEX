---
order: 90
title: Vite 8 与 Rolldown 新特性
module: 'vite'
category: 前端技术
difficulty: intermediate
description: Vite 8 单引擎架构：版本演进时间线、Rolldown（Rust 打包器）、Oxc、Lightning CSS、Bundled Dev Mode 与升级迁移指南
author: fanquanpp
updated: '2026-08-02'
related:
  - 'vite/007-BuildSplit'
  - 'vite/008-PluginSystem'
prerequisites:
  - 'vite/002-QuickStart'
  - 'vite/007-BuildSplit'
---

## 0. 一个类比：给跑车换发动机

想象一辆老跑车，装配了两台发动机：日常市区代步用一台"省油小引擎"，上了赛道又换另一台"暴力大引擎"。问题来了——两套引擎的调校逻辑不同，市区开得顺的车，上赛道却可能熄火；你在市区验证过的所有行为，上赛道都要重新适应。

Vite 的旧架构正是这样一辆"双引擎跑车"：开发时用 esbuild 快速编译，生产构建时换用 Rollup。两个引擎各自强大，但"开发正常、上线报错"的诡异问题总在引擎切换处冒出来。而 Vite 8 干的事，就是**换上一台全新的统一发动机——Rolldown**：市区、赛道都用它，行为一致，而且更快。

本文按时间线带你走一遍 Vite 的演进史，重点理解 Rolldown 这台"新发动机"的来龙去脉。

## 1. 时间线：Vite 4 -> 5 -> 6 -> 7 -> 8

先给一个宏观时间线（均为正式发布时间，数据来源见文末参考链接）：

| 版本 | 发布时间 | 关键变化 |
| --- | --- | --- |
| Vite 4 | 2022 年 12 月 | 基于 Rollup 3，升级 esbuild，引入 SWC 实验支持 |
| Vite 5 | 2023 年 11 月 | 基于 Rollup 4，性能与体积优化，移除部分废弃 API |
| Vite 6 | 2024 年 11 月 | 引入 **Environment API**（多环境构建基础）、依赖预构建默认启用 |
| Vite 7 | 2025 年 6 月 | 性能优化、API 精简、为 Rolldown 迁移铺路，提供 `rolldown-vite` 实验包 |
| **Vite 8** | **2026 年 3 月 12 日** | **Rolldown 成为唯一打包器**（取代 esbuild + Rollup），单引擎时代开启 |
| Vite 8.1 | 2026 年 6 月 23 日 | 实验性 **Bundled Dev Mode**、Chunk Import Map、Wasm ESM 等 |

讲解：Vite 从 4 到 7 是"量变"（性能与体验持续打磨），Vite 8 是"质变"——官方博客称之为 **"自 Vite 2 以来最重大的架构变更"**（The most significant architectural change since Vite 2）。发布时 Vite 周下载量已达 6500 万次，是生态覆盖面最广的前端构建工具。

## 2. 双引擎时代的困境

### 2.1 为什么当初要"两台引擎"

Vite 诞生初期做了一个务实的选择：

```text
开发（dev）：
  esbuild —— 极快的依赖预构建与 TS/JSX 转换，让开发体验"瞬间"

生产（build）：
  Rollup —— 成熟稳定的打包、代码分割、tree-shaking，插件生态丰富
```

这个策略让 Vite 得以快速崛起——不必从零造解析器和打包器，把精力集中在开发体验上。

### 2.2 双引擎的代价

但两套引擎意味着**两套转换管线、两套插件系统**，以及越来越多让它们"对齐"的胶水代码：

```text
问题 1：行为不一致
  模块解析规则、CJS 互操作、代码分割边界在两套引擎中各有差异，
  "本地能跑，上线就挂"的根源就在引擎切换处。

问题 2：插件体系割裂
  一个插件往往要为 dev（esbuild 侧）和 build（Rollup 侧）分别适配。

问题 3：维护成本爆炸
  一个流水线修好的对齐问题，随时可能在另一条流水线上引入新差异。
  Vite 团队在官方博客直言："这不是一个可持续的长期方案。"
```

## 3. Vite 8：Rolldown 统一天下

### 3.1 核心变化一句话

**开发与生产统一使用基于 Rust 的 Rolldown 作为唯一打包器**：

```text
Vite 8 之前的双引擎：
  开发：esbuild（预构建、TS/JSX 转换）
  生产：Rollup（打包、代码分割、tree-shaking）
  痛点：两套转换管线、两套插件系统、dev/prod 行为不一致

Vite 8 的单引擎：
  开发 + 生产：Rolldown（Rust 编写，兼容 Rollup/Vite 插件 API）
  收益：行为一致、构建更快、插件生态不变
```

### 3.2 性能数据（官方博客与 VoidZero 公布的真实案例）

| 团队 | 效果 |
| --- | --- |
| Linear | 生产构建从 46 秒降至 6 秒（约 8 倍提速） |
| Ramp | 构建时间减少 57% |
| Beehiiv | 构建时间减少 64% |
| Mercedes-Benz.io | 构建时间减少最多 38% |

讲解：基准测试中 Rolldown 比 Rollup **快 10-30 倍**（项目越大差距越明显），与 esbuild 处于同一性能水平。典型中型 Vue/React 项目（50-100 个组件）构建时间从 8-12 秒降到 1-3 秒。收益来自两点：Rust 原生执行（解析、转换、压缩全在原生层完成）和模块级持久化缓存（增量构建时无需重复处理未变化模块）。

## 4. Rolldown：Rust 打包器

### 4.1 与 Rollup / esbuild 的关系

| 对比维度 | Rollup（旧生产引擎） | esbuild（旧开发引擎） | Rolldown（Vite 8） |
| --- | --- | --- | --- |
| 语言 | JavaScript | Go | Rust |
| 打包能力 | 完整 | 有限 | 完整 |
| 插件 API | 完整 | 不兼容 Rollup | 完全兼容 Rollup/Vite 插件 API |
| 性能 | 基线 | 快 | 比 Rollup 快 10-30 倍，追平 esbuild |

Rolldown 的设计目标就是**集两家之长**：esbuild 的速度 + Rollup 的插件 API。Vite 官方对其定位的三大关键词是：性能（Performance）、兼容（Compatibility）、高级特性（Advanced features）。

### 4.2 Rolldown 自己的时间线

| 时间 | 里程碑 |
| --- | --- |
| 2024 年 4 月 | 首个公开版本 0.10.1 |
| 2024 年 12 月 | 1.0.0-beta.1，圈定 1.0 功能范围 |
| 2025 年 5 月 | 发布 `rolldown-vite` 技术预览包，供早期用户测试 |
| 2025 年 12 月 | Vite 8 beta 发布，Rolldown 成为默认打包器 |
| 2026 年 1 月 | Rolldown 1.0 RC，API 稳定性确认 |
| **2026 年 3 月** | **Vite 8 稳定版发布**，所有 Vite 用户底层都是 Rolldown |
| **2026 年 5 月** | **Rolldown 1.0 稳定版发布**，正式达到生产就绪 |
| 2026 年 7 月 | Rolldown 1.2.x 持续迭代 |

讲解：注意顺序——Vite 8 稳定版（2026 年 3 月）先于 Rolldown 1.0（2026 年 5 月）发布，说明 Vite 团队对 Rolldown 的可靠性有足够信心。Rolldown 1.0 采用语义化版本管理：`^1.0.0` 的 API 已锁定，选项名、类型与插件钩子签名向后兼容，升级无需改代码。

### 4.3 三层架构

```text
第一层：Rust 核心
  模块图构建、依赖解析、代码生成、tree-shaking 全部用 Rust 实现

第二层：Oxc 编译器基础设施
  解析（Parser）、转换（Transformer）、压缩（Minifier）复用 Oxc

第三层：napi-rs 桥接层
  在 Node.js 中加载 Rust 原生模块，保持与 JS 生态的无缝衔接
```

Framer、PLAID 等公司已在生产环境使用 Rolldown。

## 5. Oxc 与 Lightning CSS：配套换装的零件

### 5.1 Oxc：统一的语言基础设施

Vite 8 中，TS/JSX 转换与 JS 压缩从 esbuild 切换到了 **Oxc**（Rust 编写的 JS/TS 工具链）：

```text
Oxc 生态全家桶：
  Oxc Parser      解析 JS/TS/JSX
  Oxc Transformer 转换 TS/JSX -> JS（替代 esbuild 的转换）
  Oxc Minifier    代码压缩（替代 terser/esbuild 压缩）
  Rolldown        打包（构建在 Oxc 之上）
  Oxlint          代码检查（ESLint 生态的 Rust 替代）
```

对 Vite 用户最直接的感受：**Vite 8 不再内置 esbuild**，转换与压缩由 Rolldown 内部基于 Oxc 完成，功能等价但更快。配套的还有 `@vitejs/plugin-react` 升级到 v6，React 项目的转换引擎从 Babel 切换到 Oxc——Babel 不再是必要依赖。

### 5.2 Lightning CSS：CSS 管线的 Rust 化

```text
Vite 8 CSS 管线：
  预处理器（sass/less）-> PostCSS 插件 -> Lightning CSS（压缩 + 降级 + 前缀）
```

讲解：以前需要额外安装 cssnano 压缩 CSS，Vite 8 内置的 Lightning CSS 已覆盖"压缩、autoprefixer（前缀）、语法降级"等能力，多数项目不再需要单独配置。Vite 8 比 Vite 7 安装体积大约增加 15MB（Lightning CSS 约占 10MB、Rolldown 约占 5MB）——用空间换时间，官方认为这笔账值得。

## 6. Bundled Dev Mode 与其它新特性

### 6.1 Bundled Dev Mode（实验性，Vite 8.1）

Vite 以"不打包的开发服务器"闻名，但应用规模极大时（数千上万个模块），浏览器逐个请求模块的开销会拖慢启动与整页刷新。Vite 8.1 提供实验性的 **Bundled Dev Mode**（此前称 Full Bundle Mode），让开发环境也可以像生产一样打包输出：

```text
无打包 dev：浏览器按需请求每个模块（中小项目最优）
Bundled Dev：一次性打包再服务（大型应用启动/刷新更快，HMR 依然即时）
```

官方基准数据（应用含约 1 万个 React 组件时）：

| 指标 | 提升幅度 |
| --- | --- |
| 启动速度 | 约 15 倍 |
| 整页刷新 | 约 10 倍 |
| 网络请求数 | 减少到约 1/10 |
| HMR | 保持即时 |

实测中 Linear 团队冷启动渲染快 3 倍、整页刷新快约 40%。该模式目前在 Vite 8.1 中为实验性特性（侧重浏览器端与基础插件），大型单体应用可尝鲜，使用大量第三方插件的项目建议等待生态适配。

### 6.2 其它值得关注的新特性

1. TypeScript 路径别名原生支持
  - 不再需要 vite-tsconfig-paths 插件，配置 resolve.tsconfigPaths 即可读取 tsconfig 的 paths

2. 装饰器元数据支持
  - NestJS 等依赖 emitDecoratorMetadata 的框架无需再折腾 Babel/SWC 配置

3. 内置 Vite Devtools
  - 浏览器扩展形态，可查看模块依赖图、转换结果、触发依赖预构建、分析产物 chunk

4. 浏览器日志转发（forwardConsole）
  - 浏览器 console 日志转发到终端（006 篇第 8 节）

5. Chunk Import Map（实验性）
  - 用导入映射提升 chunk 缓存效率，缓解"改一行代码哈希级联变化"问题

6. Wasm ESM 支持
  - .wasm?init 导入支持在 SSR 环境中使用

## 7. 对插件生态的影响

Rolldown 以"Rollup 插件兼容"为第一设计目标，迁移成本极低：

```text
绝大多数现有 Vite/Rollup 插件在 Vite 8 中开箱即用，无需改动
```

三个值得了解的生态新特性：

1. Hook Filters（钩子过滤）
  - 插件声明 id/code/moduleType 过滤器后，不匹配的文件不再进入 JS 桥接层
  - ——插件再多，构建时间也不线性增长

2. 内置 Rust 插件
  - replace（变量替换）等高频场景提供 Rust 原生实现（replacePlugin），
  - 配置更简单、性能更好；esmExternalRequirePlugin 等也一并内置

3. registry.vite.dev 官方插件目录
  - 每日同步 npm 数据，可检索 Vite/Rolldown/Rollup 三类插件

讲解：Hook Filters 是 Rolldown 给插件作者的"性能福利"——过去每个插件要对每个模块执行一次 JS 调用，现在过滤器直接在 Rust 层拦截，不匹配的直接跳过。对普通使用者而言：升级到 Vite 8 后插件照常工作，但建议把常用插件同步升级到最新版本以获得原生性能收益。

## 8. 升级迁移指南

### 8.1 从 Vite 7 升级到 Vite 8

总体平滑，三步走：

```bash
# 1. 升级核心与框架插件
pnpm add -D vite@latest @vitejs/plugin-react@latest
# 或 Vue 项目
pnpm add -D vite@latest @vitejs/plugin-vue@latest
```

2. 检查要点（官方迁移指南）：
- Node.js 版本：需要 20.19+ 或 22.12+
- 配置文件 vite.config.ts 通常无需改动（rollupOptions 等保持兼容，
     迁移到 rolldownOptions 更佳，旧写法暂时保留并给出弃用提示）
- 确认浏览器目标：默认从 Vite 7 的 Chrome 107 等提升到
     'baseline-widely-available'（Chrome 111 / Edge 111 / Firefox 114 / Safari 16.4）
- 删除或替换依赖 esbuild 专属行为的代码（Vite 8 不再内置 esbuild）
- 第三方插件升级到最新版

```text
3. 曾使用 rolldown-vite 过渡包的用户：
   把依赖从 rolldown-vite 换回 vite 即可
```

讲解：Vite 8 无需任何 opt-in 标记，Rolldown 即为默认打包器。配置层面 `rollupOptions`、插件钩子等沿用 Rollup 语义。升级后建议对比产物体积与行为——Rolldown 默认启用更激进的死代码消除与常量内联，产物通常更小；若某个边界行为与旧版本不同，可在官方迁移指南中确认是否已知变更。

### 8.2 未来方向（官方预告的实验方向）

```text
- 原生 AST 操作：MagicString 等操作直接在 Rust 层完成
- Environment API 稳定化：为 Node / Edge / Browser 多环境构建提供统一接口
- Module Federation 支持：Rolldown 解锁的新能力方向
```

## 9. 常见错误与对策表

| 现象 / 报错信息 | 常见原因 | 解决办法 |
| --- | --- | --- |
| 升级后提示 Node 版本过低 | Vite 8 要求 Node.js 20.19+ 或 22.12+ | 升级 Node 到满足要求的版本 |
| 依赖 esbuild 专属 API 的代码报错 | Vite 8 不再内置 esbuild | 移除 esbuild 专属写法，改用 Rolldown/Oxc 等价能力 |
| 升级后插件报不兼容错误 | 插件未适配 Rolldown | 升级插件到最新版；冷门插件查官方兼容性说明或 registry.vite.dev |
| 产物行为与旧版略有差异 | Rolldown 的 tree-shaking/常量内联更激进 | 在官方迁移指南确认是否已知变更，必要时显式配置 |
| 自定义浏览器 target 失效 | Vite 8 默认 target 提升为 baseline-widely-available | 显式配置 `build.target` 覆盖默认值 |
| 升级后首次构建较慢 | 模块级持久化缓存未建立 | 属正常现象，第二次构建即开始享受缓存收益 |
| `rollupOptions` 出现弃用提示 | 旧配置名仍在兼容期内 | 迁移到 `rolldownOptions`（或 `worker.rolldownOptions`） |

## 11. 一句话记忆

Vite 8 给跑车换了一台统一发动机：Rust 写的 Rolldown 同时接管开发与生产，双引擎时代"本地能跑、上线就挂"的顽疾从架构上根除——更快、更一致、插件生态照常运转。
