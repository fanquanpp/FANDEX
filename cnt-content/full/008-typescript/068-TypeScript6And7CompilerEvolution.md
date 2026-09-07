---
order: 680
title: TypeScript 6.0 与 7.0：编译器世代交替
module: 'typescript'
category: 前端技术
difficulty: advanced
description: 6.0 默认值翻转与弃用清单、7.0 Go 原生编译器的完成度与迁移路径，附升级决策指南。
author: fanquanpp
updated: '2026-09-08'
related:
  - 'typescript/050-TypeScript5xNewFeatures'
  - 'typescript/060-TsconfigStrictMode'
  - 'typescript/055-TypeScriptCompilePerformanceOptimization'
prerequisites:
  - 'typescript/003-TypeScriptOverviewEnvSetup'
  - 'typescript/051-TypeScriptEngineeringConfig'
---

## 0. 一句话理解

> TypeScript 6.0（2026-03）是**最后一个 JavaScript 实现的编译器**：翻转一串默认值、清理弃用项，为换代铺路；TypeScript 7.0（2026 年中正式发布）是 Go 原生重写（tsgo），约 10 倍速度、语言语义以 6.0 为基线。语言本身不变，变的是"谁来执行规则、跑多快"。

## 1. 时间线：从双轨并进到 7.0 主线

| 时间 | 事件 |
| --- | --- |
| 2025-03 | 微软宣布 Go 原生移植，仓库 `microsoft/typescript-go`，预览包 `@typescript/native-preview`（命令 `tsgo`） |
| 2025-08 | TypeScript 5.9 发布，5.x 传统线收官 |
| 2026-02 | TypeScript 6.0 Beta |
| 2026-03 | **TypeScript 6.0 正式发布**，官方声明不发布 6.1（仅 6.0.x 补丁） |
| 2026-06 | TypeScript 7.0 RC 进入常规渠道；VS Code 宣布内部迭代切换到 TS 7 |
| 2026 年中 | **TypeScript 7.0 正式发布**，typescript-go 仓库关闭并回迁主仓库 |

npm 上的 `typescript` 包稳定版已进入 7.0.x，命令仍叫 `tsc`——对多数项目，"升级"只是更新依赖版本号。

## 2. TypeScript 6.0：为换代设计的过渡版

### 2.1 默认值翻转（迁移的头号来源）

| 选项 | 5.x 默认 | 6.0 默认 | 影响 |
| --- | --- | --- | --- |
| `strict` | `false` | `true` | 隐式 any、可能的 null 未检查全部变红 |
| `target` | `es3`/`es5` | `es2025`（随年度滚动） | 产物基线大幅现代化，旧浏览器兼容需显式降级 |
| `rootDir` | 推断 | `.`（即 tsconfig 所在目录） | 意外把依赖纳入产出的问题消失，但目录结构调整会暴露旧假设 |
| `types` | 全部 `@types` 包 | 显式声明才注入 | 编译输入变少、启动更快；全局类型需手动登记 |

**应对**：把这几个值**显式写进** tsconfig（无论取什么值），升级后行为即完全可控。

### 2.2 移除与弃用

1. **直接移除**：`--out`（单文件合并输出，改用 `outFile` 已废弃的组合或打包器）、prepend 项目（Project References 的 `prepend` 字段）、`outFile` 模式的多数场景；
2. **软弃用**（5.x 已警告、6.0 默认报错的家族）：`charset`、`importsNotUsedAsValues`、`keyofStringsOnly`、`noImplicitUseStrict`、`suppressExcessPropertyErrors` 等；
3. **宽限期**：tsconfig 写 `"ignoreDeprecations": "6.0"` 可压住弃用报错，**7.0 起失效**——它是缓冲带不是豁免权。

### 2.3 6.0 的隐性收益

默认值现代化让"新装项目"天然处于严格模式 + 现代目标；`types` 默认收紧后，大型项目的编译输入显著缩小，这也是在为 7.0 的性能特性统一基线。

## 3. TypeScript 7.0：Go 原生编译器

### 3.1 为什么快

原编译器是"TypeScript 写的 TypeScript"，跑在 V8 上，启动即加载约 40 万行 JS。Go 移植带来：无 JIT 预热的原生执行、真并发（goroutine 并行检查文件）、更低的内存占用。官方口径为**约 10 倍**量级提速（Scroller 类大仓库全量检查从数十秒进入秒级）。

### 3.2 完成度与兼容性

| 能力 | 状态 |
| --- | --- |
| 程序构建、模块解析、tsconfig 解析 | 完成（错误提示可能不如旧版详细） |
| 解析/扫描、类型检查 | 完成，错误与位置以 6.0 为基线 |
| JSX、声明文件与 JS 产出 | 完成 |
| watch / build / 增量构建（Project References） | 完成 |
| 语言服务（LSP） | 基本完成，持续打磨 |
| **编译器 API**（`ts.createProgram` 等） | **尚未就绪**——依赖它的工具需等待或适配 |

**迁移前必查**：项目里是否有直接调用编译器 API 的代码（自定义 codegen、文档生成、ts-morph 类工具链）；Vue/组件库生态的包装器（vue-tsc 等）是否已声明适配 7.x。

### 3.3 安装与使用

```bash
# 7.x 已是 typescript 包的稳定线，命令不变
npm install -D typescript
npx tsc --version        # 7.0.x

# 需要与旧版并行验证时，用预览包（命令为 tsgo）
npm install -D @typescript/native-preview
npx tsgo --noEmit
```

编辑器侧：VS Code 新版已内置以 TS 7 驱动的语言服务实验通道（`js/ts.experimental.useTsgo`），构建管线可先切 7、编辑器稍后跟进（或反之灰度）。

### 3.4 语言语义不变

7.0 改变的是执行速度与少数有意行为变更（仓库 CHANGES.md 逐条列出）：类型系统、检查规则、CLI 语义均以 6.0 为对齐基线。本模块讲的所有类型知识（泛型、条件类型、类型体操）在 7.0 原样适用。

## 4. 升级决策指南

1. **应用项目**（有 `tsc --build`/CI 全量检查）：直接升 7.0，收益是秒级反馈；先在分支上处理 6.0 默认值翻转带来的报错，再切 7；
2. **库项目**：保守起见先落 6.0（`ignoreDeprecations` 清掉软弃用），`isolatedDeclarations` 开起来，等依赖的 dts 生成链与测试矩阵确认后再上 7；
3. **重度依赖编译器 API 的工程**（自定义 transform、IDE 插件）：继续 5.9/6.0 双轨，等 API 层发布；用 `@typescript/native-preview` 的 `tsgo` 做无 API 依赖路径的预演；
4. ** monorepo**：`tsc --build` + Project References 在 7.0 已完成，配合 `typescript/071-ProjectReferencesMonorepo` 的拆包方案直接迁移；
5. **迁移清单**（顺序执行）：显式写全 `strict/target/rootDir/types` → 清理软弃用选项与 `--out` 用法 → 全量 `tsc --noEmit` 归零 → CI 并行跑 5.x 与 7.x 比对一周 → 切换主工具链。

## 5. 动手试试

1. 给项目 tsconfig 显式写上 `strict/target/rootDir/types` 四项，删掉 `"ignoreDeprecations"` 看看会冒出什么；
2. 用 `tsgo --noEmit` 与 5.9 的 `tsc --noEmit` 各跑一次全量检查，记录耗时差异；
3. 在代码库中 grep `ts.createProgram|ts.factory|require('typescript')`，清点编译器 API 依赖面；
4. 读一遍仓库 CHANGES.md 的"有意行为变更"清单，标出影响自己项目的条目。

## 6. 一句话记住

> 6.0 = 最后的 JS 编译器，把 strict/target/rootDir/types 默认值翻到现代档并清完弃用；7.0 = Go 原生 tsgo，约 10 倍速度、语义不变——语言照旧学，编译器尽管换，唯一要盯的是默认值与编译器 API 依赖。
