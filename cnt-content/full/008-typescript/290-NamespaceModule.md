---
order: 310
title: 命名空间与模块
module: 'typescript'
category: '前端技术'
difficulty: intermediate
description: 从「抽一个共享格式化模块」讲起：ES 模块的导出导入姿势、namespace 还会出现在哪、循环依赖为什么会炸、ESM 与 CommonJS 互操作的 default 差异。
author: fanquanpp
updated: '2026-09-29'
related:
  - 'typescript/320-ImportTypeVerbatimModuleSyntax'
  - 'typescript/315-PackageExportsEsmInterop'
  - 'typescript/340-ModuleDeclarationGlobalAugmentation'
  - 'typescript/300-DeclarationFileWriting'
prerequisites:
  - 'typescript/100-InterfaceTypeAlias'
  - 'typescript/110-LiteralUnionTypes'
---

## 0. 真实场景：第二个文件开始的「作用域危机」

FANDEX 早期有个 800 行的 `utils.ts`：格式化日期、计数、生成 slug 全在一个文件里。拆分的第一次尝试：

```typescript
// utils/format.ts
export function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// pages/stats.ts
formatDate(new Date());   // 报错：找不到名称 formatDate
```

在浏览器直接跑两个 script 标签的年代，这种代码靠全局变量就能通。但现代工程里每个文件都是**模块**：文件即作用域，想用的东西必须显式导入导出。本篇讲清楚这套系统的规则，以及 `namespace` 这个历史产物在今天还剩什么用。

## 1. 一句话理解

> 模块（module）= 文件作用域 + 显式导入导出：一个文件里有 `import` 或 `export`，它就是模块，内部声明不再泄漏到全局。命名空间（namespace）= 把一组声明挂到一个全局对象下的旧分组方式，是 ES 模块普及前的产物，今天主要活在类型声明文件和老框架里。

## 2. 动手：把 utils 拆成规范的模块

### 2.1 命名导出：默认选择

```typescript
// src/utils/format.ts
export function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function formatCount(n: number): string {
  return n >= 10000 ? `${(n / 10000).toFixed(1)}w` : String(n);
}

export type Slug = `${string}-${number}`;   // 类型也走 export
```

```typescript
// pages/stats.ts
import { formatDate, formatCount } from '../utils/format';
import type { Slug } from '../utils/format';   // 纯类型导入，编译后消失
```

`export` 关键字放在声明前是最常见写法；也可以底部集中 `export { formatDate, formatCount }`。类型与值同文件导出没问题，但导入时**值与类型分开写**是个好习惯——它让「哪些导入只活在编译期」一目了然，也为 `verbatimModuleSyntax`（见[import type 与 verbatimModuleSyntax](/typescript/320-ImportTypeVerbatimModuleSyntax)）铺路。

### 2.2 桶文件（barrel）：一组模块的统一入口

```typescript
// src/utils/index.ts
export * from './format';
export * from './slug';
```

```typescript
// 任何地方
import { formatDate, slugify } from '../utils';
```

桶文件方便，但有两个代价：模块多了以后启动要解析整棵桶树；**桶文件是循环依赖高发地**（A 桶引 B，B 又引 A 桶）。小项目随意，库项目慎用。

### 2.3 default 导出：克制使用

```typescript
// src/utils/logger.ts
const logger = {
  info(msg: string) { console.log(`[INFO] ${msg}`); },
  error(msg: string) { console.error(`[ERR ] ${msg}`); },
};
export default logger;
```

`export default` 一个文件只能有一个，导入方可以随意命名（`import log from ...` / `import logger from ...` 都行）——这个自由正是团队代码库的死穴：同一个东西五个人五个名字。经验法则：**工具函数、组件用命名导出；只有「模块本体就是一个东西」时用 default**。

## 3. namespace：它是什么，还会在哪遇到

```typescript
// namespace 的样子
namespace Validation {
  export interface StringValidator {
    isAcceptable(s: string): boolean;
  }
  export const version = '1.0';
}

Validation.version;              // 编译后：一个普通对象属性访问
```

namespace 编译后就是一个 IIFE 包裹的对象（历史任务：在没有模块语法的年代模拟「分组」）。今天的决策表：

| 场景 | 用 namespace 吗 |
| --- | --- |
| 应用代码（无论前端后端） | 不用，用 ES 模块 |
| 给无类型的第三方库写声明（.d.ts 里的 `declare namespace`） | 常见，得会读 |
| 扩展全局对象 / 给别人的模块补类型（`declare global`、模块扩展） | 相关语法见[模块声明与全局类型增强](/typescript/340-ModuleDeclarationGlobalAugmentation) |
| 老项目（jQuery 时代代码、部分 Angular 老库） | 会大量遇到，会读即可 |

**会读比会写重要**：看到 `declare namespace NodeJS { interface ProcessEnv { ... } }` 这类代码，知道它在「往一个全局命名空间里合并类型」就够了，新代码不写它。

## 4. 循环依赖：类型导入是解药之一

拆模块拆到一半常见的死局：

```typescript
// src/utils/format.ts
import { truncate } from './slug';          // 想用 slug 的截断
export function excerpt(text: string) {
  return truncate(text, 80);
}

// src/utils/slug.ts
import { formatCount } from './format';     // 又想用 format 的计数
export function truncate(text: string, n: number): string { /* ... */ }
```

TS 编译**不报错**（它能容忍循环），但运行时是雷：ES 模块循环引用时，后初始化的一方拿到的绑定可能是 `undefined`，报「xxx is not a function」且栈信息指不到根因。修复三板斧：

1. **下沉共同依赖**：把两者都用到的部分抽到第三个文件，这是根治；
2. **类型层面的循环用 `import type`**：类型导入编译后完全消失，不产生运行时边，循环立即断开（见 [import type 篇](/typescript/320-ImportTypeVerbatimModuleSyntax)）；
3. **延迟引用**：把 import 挪进函数体内（动态 `import()`），把循环边推迟到调用时。

## 5. ESM 与 CommonJS：互操作的两个坑

TS 项目同时面对两套模块体系，日常会撞上两件事。

### 5.1 default 导出的差异

CommonJS 的 `module.exports = {...}` 整体导出，被 ESM `import x from` 进来时，`x` 到底是整个对象还是对象的 default 属性，取决于 `esModuleInterop` 这类互操作配置。开严格配置（`esModuleInterop: true` 或 Node16+ 解析）后行为才统一。**不要在混搭项目里手写「无 default 的 CJS」再按 ESM 方式导入**，报「has no default export」先查互操作配置。

### 5.2 ESM 的扩展名纪律

Node 原生 ESM 里相对导入**必须写扩展名**：

```typescript
import { formatDate } from './format';    // Node ESM 下报错：找不到模块
import { formatDate } from './format.js'; // 正确：源码写 .js，编译后不变
import { formatDate } from './format.ts'; // 仅 allowImportingTsExtensions + noEmit 场景
```

源码是 TS 却要写 `.js` 后缀，是 ESM 的「编译产物视角」，新人最困惑的一条。打包器（Vite/esbuild）会自动补全，所以 Web 项目感觉不到；Node 直跑项目必踩。模块解析策略（`bundler` / `node16` / `nodenext` 怎么选）见[模块解析策略](/typescript/315-PackageExportsEsmInterop)。

## 6. 坑点与自检

### 坑 1：新代码里写 namespace

应用代码写 namespace 等于手写一个全局单例，模块化、tree-shaking、测试隔离全部受损。见到就换 ES 模块。

### 坑 2：default 导入名五花八门

`import X from './a'` 的 X 由导入者起名。库入口只有一个 default 时，团队约定导入名写进 code review checklist。

### 坑 3：循环依赖静默通过

类型检查不报循环，运行时才炸。用 `madge --circular` 之类的工具在 CI 里查依赖环。

### 坑 4：在 ESM 项目里忘写扩展名

报「Cannot find module」先看是不是 Node 原生 ESM 在跑，相对路径补 `.js`。

### 坑 5：把「模块」当成 `module` 关键字

老代码里的 `module Foo {}` 是 namespace 的旧写法，与「ES 模块」重名但无关。读老代码时注意区分。

### 自检清单

- [ ] 能说出「文件什么时候变成模块」（有 import 或 export）
- [ ] 会写命名导出、类型导出、桶文件，并说出 default 的克制用法
- [ ] 能解释 namespace 的编译产物与它今天仅存的场景
- [ ] 能定位并修一个简单循环依赖（下沉、import type、延迟引用）
- [ ] 知道 Node ESM 相对导入要写 `.js` 扩展名

## 7. 练习

1. 把一个两文件互相 import 的小例子改到编译通过、`npx tsx` 运行不炸，分别用「下沉」和「import type」两种方式各做一遍。
2. 写一个 `src/utils/index.ts` 桶文件，然后故意在 format.ts 里 import 桶文件自身，用 `madge --circular src`（或目测）找出这个环。
3. 读一段你手头项目的 `.d.ts`（如 `@types/node` 里的任意文件），找出一个 `declare namespace`，说清它在往哪个全局空间合并什么类型。

## 8. 下一步

- [import type 与 verbatimModuleSyntax](/typescript/320-ImportTypeVerbatimModuleSyntax)：类型导入的编译期/运行时边界
- [模块解析策略](/typescript/315-PackageExportsEsmInterop)：import 路径是怎么找到文件的
- [声明文件编写](/typescript/300-DeclarationFileWriting)：.d.ts 的写法全解
- [模块声明与全局类型增强](/typescript/340-ModuleDeclarationGlobalAugmentation)：declare module 与 declare global
