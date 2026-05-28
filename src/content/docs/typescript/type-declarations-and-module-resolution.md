---
order: 70
tags:
  - 'typescript'
  - 'oop'
difficulty: 'intermediate'
title: 'TypeScript 类型声明与模块解析'
module: 'typescript'
category: 'TypeScript Advanced'
description: '.d.ts 文件、声明合并、模块解析策略与路径映射。'
author: 'Anonymous'
---

## 目录

1. [`.d.ts` 是什么](#`.d.ts`-是什么)
2. [全局声明](#全局声明)
3. [第三方类型管理](#第三方类型管理)
4. [模块解析策略](#模块解析策略)
5. [ESM/CJS 互操作](#esm/cjs-互操作)
6. [`package.json` 的 `exports` 与类型解析](#`package.json`-的-`exports`-与类型解析)
7. [常见排查清单](#常见排查清单)

---

## 1. `.d.ts` 是什么 (What is .d.ts)

`.d.ts`（声明文件）用于描述 JavaScript 模块/全局变量的类型信息，让 TypeScript 能在不改动运行时代码的情况下进行类型检查与智能提示。
典型场景：

- 纯 JavaScript 库希望为使用者提供类型
- 工程里存在没有类型的脚本或全局变量

## 2. 全局声明 (Global Declarations)

### 2.1 `declare global`

当你需要扩展全局类型（例如给 `Window` 加字段）：

```ts
export {};
declare global {
  interface Window {
    __APP_VERSION__: string;
  }
  True;
}
```

要点：

- 文件必须是模块（加 `export {}`）否则会污染全局作用域解析方式

### 2.2 `declare namespace`（仅在必要时）

用于旧式全局库或脚本注入式变量。现代代码更推荐 ESM 导入导出。

## 3. 第三方类型管理 (Managing 3rd-party Types)

常见来源：

- 包自带类型（`types` 字段或内置 `.d.ts`）
- `@types/*`（DefinitelyTyped）
  关键点：
- `types`/`typeRoots` 会影响 TypeScript 在哪里找类型声明
- 过度配置 `typeRoots` 容易导致“找不到类型”

## 4. 模块解析策略 (Module Resolution)

`moduleResolution` 决定 TypeScript 如何从 `import` 语句推导目标文件与类型。
常见选择：

- `Bundler`：面向打包器的解析策略（适合前端与现代构建工具）
- `NodeNext`：对齐 Node ESM/CJS 的解析规则（适合 Node ESM 工程）
- `Node`：传统 Node 解析（偏旧）

## 5. ESM/CJS 互操作 (Interop)

常见问题：

- 有的库是 CJS：`module.exports = ...`
- 你的工程是 ESM：`import ... from ...`
  常用配置：
- `esModuleInterop: `
- `allowSyntheticDefaultImports: `
  但要理解：
- 这些开关主要影响“类型层面”和“编译产物的导入形式”
- 运行时是否工作仍取决于 Node/打包器对 CJS/ESM 的支持

## 6. `package.json` 的 `exports` 与类型解析

现代包经常使用 `exports` 字段限制可导入路径，TypeScript 解析时也会尊重该字段。
排查思路：

- 确认包是否提供对应入口的 `.d.ts`
- 检查 `exports` 是否包含 `types` 条目或映射
- 若是 NodeNext 工程，确认文件扩展名与导入路径是否匹配（`.js`/`.ts` 的关系）

## 7. 常见排查清单 (Checklist)

- 导入路径是否与实际输出一致（NodeNext 下经常要求显式扩展名）
- `types`/`typeRoots` 是否覆盖了默认搜索路径
- `module`/`moduleResolution` 是否匹配你的运行环境

---

### 更新日志 (Changelog)

- 2026-04-06: 新增「类型声明与模块解析」知识点，补充声明文件与 ESM/CJS 互操作要点
