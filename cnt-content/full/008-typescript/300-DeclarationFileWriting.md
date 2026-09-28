---
order: 310
title: 声明文件编写：给没有类型的世界补类型
module: 'typescript'
category: '前端技术'
difficulty: advanced
description: 从「给一个无类型的 npm 包补声明」动手：.d.ts 的 declare 语法、declare module 模块声明、types 字段与发布、三斜线引用，以及「只写类型不写实现」的心智模型。
author: fanquanpp
updated: '2026-09-28'
related:
  - 'typescript/340-ModuleDeclarationGlobalAugmentation'
  - 'typescript/330-ModuleResolutionModernToolchains'
  - 'typescript/290-NamespaceModule'
  - 'typescript/660-RuntimeSchemaValidation'
prerequisites:
  - 'typescript/290-NamespaceModule'
---

## 0. 真实场景：一个没有类型的依赖

FANDEX 想接一个内部统计脚本 `@company/tracker`，`pnpm add` 装上后第一行 import 就红了：

```typescript
import { track } from '@company/tracker';
// 报错：找不到模块 @company/tracker 或其相应的类型声明
```

打开 `node_modules/@company/tracker` 一看：只有 `index.js`，没有 `.d.ts`，`package.json` 里也没有 `types` 字段。包本身能用（运行时没问题），是**类型世界不认识它**。补一份声明文件，就是给它发一张「类型世界的身份证」。这张身份证怎么写、放哪、怎么被找到，就是本篇内容。

## 1. 一句话理解

> `.d.ts` 是「只写类型、不写实现」的文件：TS 看到它就知道每个导出长什么样，但不会把它编译成 JS。`declare` 系列关键字的意思都是「这个东西在运行时存在，我只是描述它」。

## 2. 动手：三步补齐缺失的声明

### 2.1 建一个环境声明文件

在项目里建 `src/types/tracker.d.ts`（文件名随意，位置在 `tsconfig` 的 `include` 范围内即可）：

```typescript
// src/types/tracker.d.ts
declare module '@company/tracker' {
  export interface TrackOptions {
    event: string;
    props?: Record<string, string | number | boolean>;
    immediate?: boolean;
  }

  export function track(event: string, props?: Record<string, string | number>): void;
  export function trackBatch(events: TrackOptions[]): void;
  export function flush(): Promise<void>;
}
```

保存后回到业务代码——红线消失，`track('page_view', { page: '/docs' })` 有了完整补全。`declare module '包名' { ... }` 的意思是：**「这个包的类型长这样」**，里面写的内容与普通模块体一致（export 函数、接口、类型都行），只是没有实现。

### 2.2 校验声明与运行时是否一致

声明是**手写的承诺**，编译器不会去 `index.js` 里核对。写完立刻自测：

```typescript
// 临时脚本 scratch/check.ts
import { track, flush, trackBatch } from '@company/tracker';

track('page_view');                       // 若实际要求两个参数，运行时会炸
trackBatch([{ event: 'click' }]);
void flush();
// npx tsc --noEmit 看类型，npx tsx scratch/check.ts 看运行时
```

类型过不代表运行时对——`.d.ts` 没有任何运行时效力，这是声明文件的第一原则。

### 2.3 全局变量也要声明

如果这个包还会往 `window` 上挂东西（统计脚本常见），补一段全局声明：

```typescript
// src/types/tracker.d.ts 追加
declare global {
  interface Window {
    __trackerReady?: boolean;
  }
}

export {};   // 关键：让这个文件成为模块，declare global 才合法
```

`export {}` 这一行是新人最常漏的：**`declare global` 只能出现在模块文件里**。没有它，文件是「全局脚本」，`declare global` 直接报错。全局增强的完整规则（接口合并、为什么能合并）见[模块声明与全局类型增强](/typescript/340-ModuleDeclarationGlobalAugmentation)。

## 3. declare 家族速览

| 写法 | 场景 | 例子 |
| --- | --- | --- |
| `declare module 'x' { ... }` | 给无类型 npm 包 / CDN 模块补声明 | 本文 2.1 |
| `declare global { ... }` | 往全局空间合并类型（window、process.env） | 本文 2.3 |
| `declare const X: T` | 描述全局存在的变量（CDN 注入的脚本） | `declare const gtag: (...args: unknown[]) => void` |
| `declare function f(): T` | 描述全局存在的函数 | 老脚本的全局工具函数 |
| `declare namespace N { ... }` | 描述挂在全局对象下的分组（老库常见） | 读 `@types/node` 时到处都是 |

共同点：**只出现在 `.d.ts` 或 `declare` 上下文里，编译后全部消失**。它们不创建任何运行时东西，只告诉类型系统「运行时已经有了，长这样」。

## 4. 发布带类型的包：types 字段

反过来，如果你写了一个库要给别人用，得让 TS 能自动找到你的声明。三件套：

```jsonc
// package.json
{
  "name": "@company/tracker",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",        // 指向声明入口
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",    // exports 条件映射里也要有 types
      "default": "./dist/index.js"
    }
  }
}
```

`.d.ts` 从哪来？两种来源：

1. **手写**：适合 API 面小的库，直接维护 `.d.ts`；
2. **tsc 生成**：源码就是 TS 时，`tsc` 加 `declaration: true` 自动从源码产出 `.d.ts`，类型永远和实现同步——**绝大多数项目选这条**。

没有内置类型的社区包，先查 `@types/包名`（DefinitelyTyped 生态，如 `@types/react`）；都没有，才走本篇的手写声明。查找到声明文件的完整顺序（types 字段 → @types → index.d.ts）见[模块解析策略](/typescript/330-ModuleResolutionModernToolchains)。

## 5. 三斜线指令：声明文件里的 import

`.d.ts` 里偶尔见到：

```typescript
/// <reference types="vite/client" />
```

这是三斜线指令：**把另一个声明文件（或包的类型入口）拉进当前文件的编译**。在 .d.ts 之外的世界里它已基本被 `import type` 取代；保留的两个常用场景：

1. 环境声明文件引用工具链类型（如上面的 `vite/client`，给 `import.meta.env` 提供类型——FANDEX 这类 Astro/Vite 项目里 `src/env.d.ts` 顶部就有它）；
2. 全局脚本式 `.d.ts` 里引用其他全局声明（没有 import 语法可用）。

见到 `/// <reference types="..." />` 不必慌，读作「本文件还需要 xxx 包的类型」即可。

## 6. 坑点与自检

### 坑 1：声明与运行时不一致

`.d.ts` 写错没有任何编译报错，直到运行时炸。补声明后必须用真实调用自测一遍（2.2 步不是可选项）。

### 坑 2：declare global 写在了非模块文件里

没有 `export {}`（或任何 import/export）的 `.d.ts` 是全局脚本，`declare global` 报错。记住这对搭档。

### 坑 3：把声明文件写进了编译产物

`src/types/*.d.ts` 会被 tsc 当普通文件编译检查，这没问题；但发布时别把内部环境的 `.d.ts` 打进包——发布的 `types` 只指向你自己的 `dist/index.d.ts`。

### 坑 4：用 declare module 给已有类型的包「改类型」

`declare module 'x'` 对已有完整类型的包是**模块扩展**（合并而非覆盖），写法与补缺失声明相同但语义不同——扩展详见[模块声明与全局类型增强](/typescript/340-ModuleDeclarationGlobalAugmentation)。

### 坑 5：声明了但 tsconfig 没包含

新建的 `types/` 目录不在 `include` 里时声明不生效。报「找不到声明」先查 `tsconfig.json` 的 include/exclude。

### 自检清单

- [ ] 能为一个无类型 npm 包写出可用的 declare module 声明并自测
- [ ] 能解释 `.d.ts` 与 `.ts` 的本质区别（只有类型，不产出 JS）
- [ ] 知道 `declare global` 必须在模块文件里（`export {}`）
- [ ] 能说出 types 字段、@types、手写声明三条类型的来源优先级
- [ ] 能读懂三斜线指令的作用

## 7. 练习

1. 给项目里真实存在的一个无类型依赖（找 `node_modules` 里没有 `types` 字段的包）补一份声明，含至少一个函数与一个接口，并用 `tsc --noEmit` 验证。
2. 给 `window` 挂一个 `__APP_VERSION__: string` 的全局声明，然后在任意组件里 `window.__APP_VERSION?.trim()`，确认类型生效。
3. 用 `tsc -p` 加 `declaration: true` 把一个两文件的 TS 小项目编译出 `dist/index.d.ts`，打开看编译器替你写了什么声明。

## 8. 下一步

- [模块声明与全局类型增强](/typescript/340-ModuleDeclarationGlobalAugmentation)：声明合并的机制与模块扩展
- [模块解析策略](/typescript/330-ModuleResolutionModernToolchains)：声明文件是怎么被找到的
- [import type 与 verbatimModuleSyntax](/typescript/320-ImportTypeVerbatimModuleSyntax)：类型与值的导入边界
- [运行时 Schema 校验](/typescript/660-RuntimeSchemaValidation)：声明不可信时的运行时兜底
