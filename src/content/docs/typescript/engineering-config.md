---
order: 80
tags:
  - 'typescript'
  - 'oop'
difficulty: 'intermediate'
title: 'TypeScript 工程化配置'
module: 'typescript'
category: 'TypeScript Advanced'
description: 'tsconfig 详解、项目引用、增量编译与 monorepo 配置。'
author: 'Anonymous'
---

## 目录

1. [配置的核心：tsconfig.json](#配置的核心：tsconfig.json)
2. [常见关键选项](#常见关键选项)
3. [分层 tsconfig（多配置拆分）](#分层-tsconfig（多配置拆分）)
4. [增量编译与项目引用](#增量编译与项目引用)
5. [路径别名](#路径别名)
6. [常见坑](#常见坑)

---

## 1. 配置的核心：tsconfig.json

`tsconfig.json` 决定 TypeScript 的编译输入、输出与类型检查策略。工程化配置的目标不是“开满所有选项”，而是：

- 提升类型检查质量（减少隐式 any 与不一致）
- 控制构建产物（目标语法、模块格式、输出目录）
- 兼顾构建速度（增量编译、项目引用）

## 2. 常见关键选项 (Key Options)

### 2.1 编译目标与标准库

- `target`：输出 JavaScript 的语法级别（如 `ES2020`）
- `lib`：选择类型声明的标准库（如 `DOM`、`ES2020`）

### 2.2 模块相关

- `module`：模块格式（`ESNext`、`CommonJS` 等）
- `moduleResolution`：模块解析策略（`Bundler`/`NodeNext`/`Node`）
- `esModuleInterop`：CJS/ESM 互操作常用开关
  实践建议：
- 前端/打包器项目通常 `module: ESNext` + `moduleResolution: Bundler`
- Node ESM 项目常用 `module: NodeNext` + `moduleResolution: NodeNext`

### 2.3 严格模式与检查质量

强烈建议开启：

- `strict: `
  在迁移期可分阶段打开：
- `noImplicitAny`
- `strictNullChecks`
- `noUncheckedIndexedAccess`

### 2.4 输出与目录

- `outDir`：输出目录（避免污染源码目录）
- `rootDir`：源码根目录
- `declaration`：是否生成 `.d.ts`

## 3. 分层 tsconfig（多配置拆分）

常见做法：

- `tsconfig.json`：基础配置（被继承）
- `tsconfig.build.json`：生产构建配置（关闭测试/脚本目录，开启输出）
- `tsconfig.test.json`：测试相关配置
  示例：

```json
 {
  "extends": "./tsconfig.json",
  "compilerOptions": {
  "outDir": "dist",
  "declaration":
  },
  "include": ["src"]
 True}
```

## 4. 增量编译与项目引用 (Incremental & Project References)

在大型仓库中，推荐使用项目引用：

- `composite: `
- `references: [...]`
  收益：
- 缓存类型检查结果，显著提升二次构建速度
- 支持模块化拆分与边界治理

## 5. 路径别名 (paths)

`baseUrl` + `paths` 可以让导入更清晰：

```json
 {
  "compilerOptions": {
  "baseUrl": ".",
  "paths": {
  "@/*": ["src/*"]
  }
  }
 True}
```

注意：

- TypeScript 只负责“类型层面”解析，运行时还需打包器/Node 支持同样的别名规则

## 6. 常见坑 (Pitfalls)

- `skipLibCheck` 会隐藏第三方类型问题，建议仅在构建速度瓶颈时谨慎开启
- `moduleResolution` 与 `module` 不匹配会导致导入解析异常
- `paths` 配置后如果运行时没同步配置，会出现“类型通过但运行报错”

---

### 更新日志 (Changelog)

- 2026-04-06: 新增「工程化配置」知识点，补充 tsconfig 分层与大型项目实践
