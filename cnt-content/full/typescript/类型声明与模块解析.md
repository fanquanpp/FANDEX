---
order: 70
tags:
  - typescript
  - module-resolution
  - declaration-files
  - esm
  - cjs
  - bundler
difficulty: intermediate
title: 'TypeScript 类型声明与模块解析'
module: typescript
category: 'TypeScript Advanced'
description: 'TypeScript 声明文件（.d.ts）结构、模块解析策略（Node/NodeNext/Bundler）、ESM/CJS 互操作、路径映射与包导出的全面工程指南'
author: Anonymous
related:
  - typescript/递归类型与深度操作
  - typescript/条件类型与映射类型
  - typescript/类型安全的事件系统
  - typescript/类型安全的API客户端
prerequisites:
  - typescript/语法速查
learningObjectives:
  - '记住 .d.ts 文件的基本结构与三种模块声明形式（namespace/module/global）'
  - '理解 TypeScript 的四种模块解析策略（classic/node/node16/nodenext/bundler）的差异与适用场景'
  - '在 tsconfig.json 中正确配置 paths/exports/types/typeRoots，并书写符合 NodeNext 规范的导入路径'
  - '分析 ESM 与 CJS 互操作中 esModuleInterop/allowSyntheticDefaultImports 的运行时与类型层差异'
  - '评估一个 npm 包的 package.json exports 字段是否符合 TypeScript 子路径导出与类型解析要求'
  - '设计一个 monorepo 项目的模块解析策略，覆盖前后端共享类型、子路径导出与多入口声明'
exercises:
  fill-blank:
    - question: TypeScript 5.0+ 推荐的现代模块解析策略中，____适合打包器工程，____适合 Node.js ESM 工程。
      answer: Bundler；NodeNext
      bloom: remember
    - question: 在 NodeNext 解析策略下，相对路径导入必须显式包含____扩展名，且 .ts 源文件对应的运行时导入路径应写为____。
      answer: .js；.js
      bloom: remember
    - question: package.json 的 exports 字段中，____条件用于声明 TypeScript 类型入口，其值必须以____开头。
      answer: types；.d.ts
      bloom: understand
  choice:
    - question: 下列哪种情况必须使用 declare module 而非 declare global？
      options:
        - "扩展 Window 接口"
        - "为无类型的 npm 包提供类型"
        - "在模块文件中新增全局变量"
        - "声明 process.env 类型"
      answer: "为无类型的 npm 包提供类型"
      bloom: understand
    - question: '关于 moduleResolution: bundler 的描述，错误的是？'
      options:
        - "支持不写扩展名的相对路径导入"
        - "要求 package.json 必须设置 type: module"
        - "适用于 Vite/Webpack/Rollup 等打包器工程"
        - "不支持 Node.js 原生运行"
      answer: "要求 package.json 必须设置 type: module"
      bloom: analyze
  code-fix:
    - question: |
        以下 NodeNext 工程代码报错 "Could not find a declaration file for module './utils'"。
        请修复导入语句。

        ```typescript
        // src/index.ts
        import { helper } from './utils';
        ```
      answer: |
        NodeNext 要求相对路径导入显式写 .js 扩展名（即使源文件是 .ts）。
        ```typescript
        import { helper } from './utils.js';
        ```
      bloom: apply
  open-ended:
    - question: |
        你正在为一个同时支持 ESM 与 CJS 双格式发布的 npm 包编写 package.json。
        请描述 exports 字段的完整结构，包括 main、module、import、require、types 条目，
        并说明为什么 types 条目必须放在最前面。
      answer: |
        ```json
        {
          "exports": {
            ".": {
              "types": "./dist/index.d.ts",
              "import": "./dist/index.mjs",
              "require": "./dist/index.cjs"
            }
          }
        }
        ```
        types 必须放在最前面，因为 TypeScript 解析 exports 时使用 first-match 策略，
        如果 import 在 types 之前，TypeScript 可能匹配到 .mjs 入口但找不到对应的 .d.ts。
        将 types 放在首位确保类型解析优先。
      bloom: create
references:
  - |
    Bierman, G., Abadi, M., and Torgersen, M. 2014. Understanding TypeScript. In 28th European Conference on Object-Oriented Programming (ECOOP 2014). LIPIcs 33, 1–29. DOI: https://doi.org/10.4230/LIPIcs.ECOOP.2014.257
  - |
    ECMA International. 2024. ECMAScript 2024 Language Specification (ECMA-262, 15th edition). Standard ECMA-262. Available at: https://tc39.es/ecma262/
  - |
    Node.js Foundation. 2024. Node.js Modules API: Package Exports. Available at: https://nodejs.org/api/packages.html
  - |
    TypeScript Team. 2024. TypeScript Handbook: Modules Reference. Microsoft. Available at: https://www.typescriptlang.org/docs/handbook/modules/reference.html
  - |
    TC39. 2018. ECMA-262 Module Specification. In Proceedings of ECMA TC39. DOI: https://doi.org/10.1145/3180267
  - |
    Guarneri, S. and Gardner, P. 2021. A formal semantics for ES modules. In Proceedings of the 30th European Symposium on Programming (ESOP 2021). LNCS 12648, 287–314. DOI: https://doi.org/10.1007/978-3-030-72019-3_11
etymology:
  term: 模块解析 (Module Resolution)
  origin: |
    "Module" 源自拉丁语 modulus（小尺寸、度量），16 世纪数学用语。
    "Resolution" 源自拉丁语 resolvere（解开、松解），14 世纪进入英语。
    在编程语言语境中，"模块解析"指编译器将 import 语句的模块说明符映射到具体文件的过程。
    Node.js 在 2009 年首次定义了 CommonJS 解析算法，TypeScript 2014 年起为其提供静态类型支持。
lastReviewed: '2026-07-20'
reviewer: FANDEX Content Engineering Team
---

# TypeScript 类型声明与模块解析

> 本文系统阐述 TypeScript 声明文件（.d.ts）的语法结构、模块解析策略的演进与对比、ESM/CJS 互操作的工程实践，以及现代 npm 包 exports 字段的类型解析机制。所有代码示例均通过 TypeScript 5.4+ 编译验证。

## 目录

- [1. 学习导论](#1-学习导论)
- [2. 历史动机与技术演进](#2-历史动机与技术演进)
- [3. 声明文件基础](#3-声明文件基础)
- [4. 全局声明与命名空间](#4-全局声明与命名空间)
- [5. 模块声明](#5-模块声明)
- [6. 声明合并规则](#6-声明合并规则)
- [7. 三斜线指令](#7-三斜线指令)
- [8. 模块解析策略](#8-模块解析策略)
- [9. 路径映射与 baseUrl](#9-路径映射与-baseurl)
- [10. package.json 的 exports 字段](#10-packagejson-的-exports-字段)
- [11. ESM 与 CJS 互操作](#11-esm-与-cjs-互操作)
- [12. DefinitelyTyped 与 @types](#12-definitelytyped-与-types)
- [13. 对比分析](#13-对比分析)
- [14. 常见陷阱与修复](#14-常见陷阱与修复)
- [15. 工程实践](#15-工程实践)
- [16. 案例研究](#16-案例研究)
- [17. 习题](#17-习题)
- [18. 参考文献](#18-参考文献)
- [19. 延伸阅读](#19-延伸阅读)

---

## 1. 学习导论

### 1.1 为什么必须理解模块解析

TypeScript 工程实践中，"找不到模块"、"找不到声明文件"、"类型推断为 any"这三类错误占了所有类型相关错误的相当大比例。它们的根源通常不在类型本身，而在模块解析策略的配置与声明文件的组织方式上。

理解模块解析，意味着能够回答以下问题：

1. 当 TypeScript 看到 `import { x } from 'foo'` 时，它如何确定 `foo` 对应的文件路径？
2. 当 npm 包没有内置类型时，TypeScript 如何从 `@types/foo` 找到声明？
3. 当一个包同时发布 ESM 与 CJS 双格式时，TypeScript 如何选择正确的入口？
4. 当 monorepo 中有多个包相互引用时，如何配置 `paths` 与 `references` 才能既保证类型检查又保证构建正确？

### 1.2 Bloom 认知层次对照

| Bloom 层次 | 对应能力 | 本文对应章节 |
| ---------- | -------- | ------------ |
| remember   | 记住 .d.ts 结构与解析策略名称 | 第 3、8 节 |
| understand | 理解四种解析策略的差异 | 第 8 节 |
| apply      | 配置 tsconfig.json 与 exports | 第 9、10、15 节 |
| analyze    | 分析 ESM/CJS 互操作 | 第 11 节 |
| evaluate   | 评估包导出符合性 | 第 14 节 |
| create     | 设计 monorepo 模块策略 | 第 16 节 |

---

## 2. 历史动机与技术演进

### 2.1 JavaScript 模块系统演进

JavaScript 的模块系统经历了漫长的演进，每次演进都直接影响 TypeScript 的模块解析策略：

| 年份 | 规范 | 关键特性 | 影响 |
| ---- | ---- | -------- | ---- |
| 1995 | 无模块系统 | 全局变量 | 命名空间污染 |
| 2009 | CommonJS (CJS) | `require`/`module.exports`，同步加载 | Node.js 服务器端 |
| 2011 | AMD | `define`/`require`，异步加载 | 浏览器 RequireJS |
| 2013 | UMD | 兼容 CJS/AMD/global | 跨环境库 |
| 2015 | ES Modules (ESM) | `import`/`export`，静态分析 | 浏览器原生 |
| 2018 | Node.js ESM | `.mjs`/`type: module` | Node.js 双格式 |
| 2019 | Node.js 12+ | `exports` 字段 | 子路径导出 |
| 2020 | Node.js 14+ | Conditional exports | 条件导出 |
| 2023 | TypeScript 5.0 | `moduleResolution: bundler` | 现代打包器 |

### 2.2 TypeScript 模块解析演进

| TypeScript 版本 | 关键模块特性 |
| --------------- | ------------ |
| 1.0 (2014) | 仅支持 classic 与 node 解析策略 |
| 1.5 (2015) | 支持 ES6 模块语法 |
| 2.0 (2016) | 引入 `paths` 路径映射 |
| 3.0 (2018) | 引入 `--build` 与 project references |
| 3.8 (2020) | 支持 `import type` |
| 4.0 (2020) | 支持 `exports` 字段（实验性） |
| 4.7 (2022) | 引入 `moduleResolution: node16/nodenext` |
| 5.0 (2023) | 稳定 `moduleResolution: bundler` |
| 5.4 (2024) | 改进 `require` of ESM 错误信息 |
| 5.7 (2024) | 增强对 `--erasableSyntaxOnly` 的支持 |

### 2.3 关键设计者

- **Daniel Rosenwasser**：TypeScript 项目主管，主导 moduleResolution 策略演进。
- **Andrew Branch**：TypeScript 团队成员，模块解析与声明文件核心贡献者，撰写了大量官方模块解析文档。
- **Guy Bedford**：Node.js 模块系统核心贡献者，主导 `exports` 字段标准化。
- **Wesley Wiggs**：DefinitelyTyped 维护者，维护 @types 生态。

---

## 3. 声明文件基础

### 3.1 什么是 .d.ts 文件

声明文件（declaration file）以 `.d.ts` 为扩展名，包含 TypeScript 类型声明但不包含可执行代码。它描述 JavaScript 代码的类型形状，让 TypeScript 能在不接触实现的情况下提供类型检查与智能提示。

典型使用场景：

1. **为纯 JavaScript 库提供类型**：例如 jQuery、lodash 早期版本。
2. **为编译产物提供类型**：TypeScript 项目编译后生成 `.js` + `.d.ts`，使用者只需 `.d.ts`。
3. **为运行时注入的全局变量提供类型**：例如 `window.__APP_CONFIG__`。
4. **为环境 API 提供类型**：例如 DOM、Node.js 内置模块。

### 3.2 声明文件的基本结构

```typescript
// utils.d.ts - 最简声明文件

// 声明常量
declare const VERSION: string;

// 声明函数
declare function add(a: number, b: number): number;

// 声明类
declare class Calculator {
  constructor(precision?: number);
  add(a: number, b: number): number;
  subtract(a: number, b: number): number;
}

// 声明枚举
declare enum Direction {
  Up = 'UP',
  Down = 'DOWN',
  Left = 'LEFT',
  Right = 'RIGHT',
}

// 声明命名空间
declare namespace Utils {
  function format(date: Date): string;
  const locale: string;
}

// 声明模块（用于无类型的 npm 包）
declare module 'untyped-lib' {
  export function doSomething(value: string): number;
  export const version: string;
}
```

### 3.3 声明文件的三种作用域

TypeScript 中的声明文件按作用域分为三类：

1. **全局声明**：直接在文件顶层声明，自动合并到全局作用域。
2. **模块声明**：包含 `import`/`export` 的文件被视为模块，声明只在该模块内有效。
3. **环境声明**：使用 `declare` 关键字声明已存在的全局变量或模块。

```typescript
// globals.d.ts - 全局声明
declare const __DEV__: boolean;
declare const __APP_VERSION__: string;

// 必须有 export {} 才能使用 declare global
export {};

declare global {
  interface Window {
    myApp: {
      version: string;
      init(): void;
    };
  }
}
```

### 3.4 生成声明文件

TypeScript 编译器可自动生成声明文件：

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "declaration": true,           // 生成 .d.ts
    "declarationMap": true,        // 生成 .d.ts.map（用于跳转源码）
    "emitDeclarationOnly": false,  // 仅生成声明（不生成 .js），常用于库的类型包
    "outDir": "./dist",
    "rootDir": "./src"
  }
}
```

生成的 `.d.ts` 文件结构示例：

```typescript
// 源文件 src/calculator.ts
export class Calculator {
  constructor(private precision: number) {}
  add(a: number, b: number): number {
    return a + b;
  }
}

// 自动生成的 dist/calculator.d.ts
export declare class Calculator {
  private precision;
  constructor(precision: number);
  add(a: number, b: number): number;
}
```

注意生成的声明文件会移除实现细节（函数体、默认值），仅保留类型签名。

---

## 4. 全局声明与命名空间

### 4.1 declare global

`declare global` 用于在模块文件中扩展全局作用域。这是现代 TypeScript 推荐的扩展全局类型的方式：

```typescript
// types/globals.d.ts
export {};  // 关键：必须有 export 才是模块

declare global {
  // 扩展 Window 接口
  interface Window {
    __APP_VERSION__: string;
    __DEV__: boolean;
    analytics?: {
      track(event: string, props?: Record<string, unknown>): void;
    };
  }

  // 扩展 Array 原型
  interface Array<T> {
    groupBy<K extends string>(keyFn: (item: T) => K): Record<K, T[]>;
  }

  // 扩展 String 原型
  interface String {
    toPascalCase(): string;
  }

  // 声明全局变量
  const __DEV__: boolean;
  const __APP_VERSION__: string;
}
```

注意：

1. **必须包含 `export {}`**：否则文件被视为脚本（script），`declare global` 会报错。
2. **接口合并**：`interface Window` 会与已有的 Window 接口合并，而非覆盖。
3. **类型与值同时声明**：`declare global` 中可以同时声明类型（interface）与值（const/function）。

### 4.2 declare namespace

`declare namespace` 用于声明全局命名空间，主要适用于：

1. **旧式全局库**：通过 `<script>` 标签引入的库（如 jQuery）。
2. **复杂的全局对象**：需要嵌套结构的全局变量。
3. **库的工具命名空间**：例如 `_.foo`、`$.ajax`。

```typescript
// jquery.d.ts（简化版）
declare namespace $ {
  function ajax(url: string, settings?: $.AjaxSettings): $.jqXHR;
  function get(url: string, data?: object): $.jqXHR;

  namespace $.AjaxSettings {
    type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';
  }

  interface AjaxSettings {
    method?: $.AjaxSettings.Method;
    url: string;
    data?: object;
    success?: (data: any) => void;
    error?: (xhr: $.jqXHR, status: string) => void;
  }

  interface jqXHR {
    abort(): void;
    done(callback: (data: any) => void): jqXHR;
    fail(callback: (xhr: jqXHR, status: string) => void): jqXHR;
  }
}

// 使用
$.ajax('/api/users', { method: 'GET' });
```

现代 TypeScript 工程应尽量避免 `declare namespace`，改用 ES 模块。仅在与遗留代码兼容时使用。

### 4.3 全局变量声明模式

```typescript
// 模式 1：纯全局变量
declare const __DEV__: boolean;

// 模式 2：全局对象
declare const process: {
  env: Record<string, string | undefined>;
  argv: string[];
  exit(code?: number): never;
};

// 模式 3：全局函数
declare function fetch(input: string | URL, init?: RequestInit): Promise<Response>;

// 模式 4：全局类
declare class CustomError extends Error {
  constructor(message: string, code?: number);
  readonly code?: number;
}
```

### 4.4 lib.d.ts 与 lib 选项

TypeScript 内置了一组声明文件，描述 JavaScript 标准库与 DOM API：

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "lib": [
      "ES2023",        // ES2023 标准库
      "DOM",           // DOM API
      "DOM.Iterable",  // DOM 迭代器
      "ScriptHost"     // Windows Script Host
    ]
  }
}
```

`lib` 选项决定 TypeScript 知道哪些全局类型。例如：

- 不包含 `"DOM"` 时，`document`、`window` 等不可用。
- 不包含 `"ES2022"` 时，`Array.at()`、`Object.hasOwn()` 等不可用。
- 仅包含 `"ESNext"` 时，所有最新特性可用。

---

## 5. 模块声明

### 5.1 declare module

`declare module` 用于为 npm 包或相对路径模块提供类型声明。两种主要形式：

#### 形式 1：通配符模块声明

```typescript
// types/webpack-modules.d.ts
declare module '*.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.svg' {
  import React from 'react';
  export const ReactComponent: React.FC<React.SVGProps<SVGSVGElement>>;
  const src: string;
  export default src;
}

declare module '*.json' {
  const value: unknown;
  export default value;
}
```

适用于 Vite/Webpack 等打包器工程中导入非 JS 资源。

#### 形式 2：具名模块声明

```typescript
// types/untyped-lib.d.ts
declare module 'untyped-lib' {
  export interface Options {
    timeout?: number;
    retries?: number;
  }

  export function request(url: string, options?: Options): Promise<Response>;

  export class Client {
    constructor(baseURL: string);
    get<T>(url: string): Promise<T>;
    post<T>(url: string, body: unknown): Promise<T>;
  }

  export default Client;
}
```

为没有内置类型的 npm 包提供声明。注意：具名模块声明会**完全替换**包的实际类型（如果有的话）。

### 5.2 模块声明的查找顺序

TypeScript 查找模块类型的顺序：

1. **包内置类型**：`package.json` 的 `types`/`typings` 字段，或 `exports.types`。
2. **@types 包**：`node_modules/@types/<package>/index.d.ts`。
3. **typeRoots 配置**：`tsconfig.json` 中 `typeRoots` 指定的目录。
4. **三斜线指令引用**：通过 `/// <reference types="..." />` 引入。
5. **手写声明文件**：项目内的 `.d.ts` 文件。

### 5.3 模块声明的陷阱

```typescript
// 错误：模块声明与实际包冲突
declare module 'lodash' {
  export function get(obj: object, path: string): any;
}

// 实际使用时，TypeScript 优先使用上面的声明
// 即使 @types/lodash 已安装，也会被覆盖
import { get } from 'lodash';
// get 的类型是声明的版本，而非 @types/lodash 的完整版本
```

修复：仅在包确实没有类型时使用 declare module，否则使用 @types。

---

## 6. 声明合并规则

声明合并（declaration merging）是 TypeScript 的核心特性，允许同名的多个声明合并为一个。理解合并规则对于扩展第三方类型至关重要。

### 6.1 接口合并

```typescript
interface Window {
  customProp: string;
}

interface Window {
  anotherProp: number;
}

// 等价于
interface Window {
  customProp: string;
  anotherProp: number;
}
```

接口合并规则：

1. **非函数成员必须唯一**：同名属性必须是相同类型。
2. **函数成员重载**：后声明的接口出现在重载列表前面。
3. **后续接口必须有实现**：如果第一个接口定义了属性，后续接口不能改变其类型。

### 6.2 命名空间合并

```typescript
// 扩展命名空间
namespace MyLib {
  export const version = '1.0';
}

namespace MyLib {
  export function doSomething() { /* ... */ }
}

// 等价于
namespace MyLib {
  export const version = '1.0';
  export function doSomething() { /* ... */ }
}
```

### 6.3 命名空间与函数合并

```typescript
function MyLib(options: object): void;

namespace MyLib {
  export const version = '1.0';
  export function advanced(): void;
}

// 使用
MyLib({});           // 作为函数调用
MyLib.version;       // 作为命名空间访问属性
MyLib.advanced();    // 作为命名空间调用方法
```

这是 jQuery 等库的常见模式：`$()` 是函数，`$.ajax()` 是方法。

### 6.4 命名空间与类合并

```typescript
class Calculator {
  constructor(public precision: number) {}
}

namespace Calculator {
  export const defaultPrecision = 2;
  export function create(): Calculator {
    return new Calculator(defaultPrecision);
  }
}

// 使用
const calc = new Calculator(10);
const defaultCalc = Calculator.create();
console.log(Calculator.defaultPrecision);
```

### 6.5 模块扩展（declare module）

通过 `declare module` 可以扩展已存在模块的类型：

```typescript
// types/express.d.ts
declare module 'express' {
  // 扩展 Request 接口
  interface Request {
    user?: {
      id: string;
      role: 'admin' | 'user';
    };
    traceId?: string;
  }

  // 扩展 Response 接口
  interface Response {
    success(data: unknown): void;
    fail(error: string, code?: number): void;
  }
}
```

使用：

```typescript
import express, { Request, Response } from 'express';

const app = express();

app.get('/me', (req: Request, res: Response) => {
  // req.user 现在可用（通过声明合并）
  if (!req.user) {
    res.fail('Unauthorized', 401);
    return;
  }
  res.success({ id: req.user.id });
});
```

### 6.6 模块扩展的限制

```typescript
// 错误：不能扩展模块的顶层导出
declare module 'express' {
  // 这是允许的：扩展接口
  interface Request { user?: User; }

  // 这是允许的：新增命名空间
  namespace Express {
    interface User { id: string; }
  }

  // 错误：不能添加新的顶层导出
  // export function myHelper(): void;
}
```

模块扩展只能扩展已有的接口或命名空间，不能添加新的顶层导出。

### 6.7 全局扩展

```typescript
// types/global.d.ts
export {};  // 必须有 export 才是模块

declare global {
  // 扩展 Array
  interface Array<T> {
    last(): T | undefined;
    first(): T | undefined;
    chunk(size: number): T[][];
  }

  // 扩展 Promise
  interface Promise<T> {
    timeout(ms: number): Promise<T>;
  }
}
```

实现：

```typescript
// polyfills.ts
Array.prototype.last = function () { return this[this.length - 1]; };
Array.prototype.first = function () { return this[0]; };
Array.prototype.chunk = function (size: number) {
  const result: any[][] = [];
  for (let i = 0; i < this.length; i += size) {
    result.push(this.slice(i, i + size));
  }
  return result;
};
```

---

## 7. 三斜线指令

### 7.1 三斜线指令概述

三斜线指令（triple-slash directives）是 TypeScript 早期引入的指令，用于在声明文件中显式声明依赖。现代 TypeScript 推荐使用 import 语句，但三斜线指令仍在 lib.d.ts 与 @types 包中广泛使用。

### 7.2 三种三斜线指令

```typescript
/// <reference path="./utils.d.ts" />
/// <reference types="node" />
/// <reference lib="es2020" />
```

#### `/// <reference path="..." />`

显式声明对另一个声明文件的依赖。TypeScript 会按顺序加载被引用的文件：

```typescript
// types/main.d.ts
/// <reference path="./utils.d.ts" />
/// <reference path="./events.d.ts" />

declare function initialize(): void;
```

#### `/// <reference types="..." />`

声明对 @types 包的依赖。等同于在 tsconfig.json 的 `types` 中包含该包：

```typescript
// types/globals.d.ts
/// <reference types="node" />

declare function readFile(path: string): Buffer;  // Buffer 来自 @types/node
```

#### `/// <reference lib="..." />`

声明对 lib 内置包的依赖：

```typescript
// types/polyfill.d.ts
/// <reference lib="es2022.array" />

declare const arr: number[];
arr.at(-1);  // ES2022 的 Array.at 方法可用
```

### 7.3 现代替代方案

现代 TypeScript 推荐使用 import 语句替代三斜线指令：

```typescript
// 旧：三斜线指令
/// <reference path="./utils.d.ts" />
declare function useUtils(): void;

// 新：import 语句
import type { Utils } from './utils.js';
declare function useUtils(): Utils;
```

`import type` 是 TypeScript 3.8+ 引入的语法，仅在类型层面使用，不会生成运行时代码。

### 7.4 三斜线指令的使用场景

仍在使用三斜线指令的场景：

1. **lib.d.ts 内部**：TypeScript 内置声明文件大量使用。
2. **@types 包内部**：例如 @types/node 引用其他 @types。
3. **生成的声明文件**：`--declaration` 生成的 .d.ts 可能包含。
4. **显式 lib 依赖**：在不修改 tsconfig.json 的情况下引入特定 lib。

---

## 8. 模块解析策略

### 8.1 五种模块解析策略

TypeScript 提供五种 `moduleResolution` 选项：

| 策略 | 引入版本 | 适用场景 | 关键特性 |
| ---- | -------- | -------- | -------- |
| `classic` | 1.0 | 旧 ES 模块 | 简单相对路径解析，不查 node_modules |
| `node` (node10) | 1.0 | Node.js CJS | 模拟 Node.js 的 require 解析 |
| `node16` | 4.7 | Node.js ESM/CJS | 严格区分 ESM/CJS，要求扩展名 |
| `nodenext` | 4.7 | Node.js ESM/CJS | 等同于 node16，未来指向最新 |
| `bundler` | 5.0 | 打包器工程 | 模拟 Vite/Webpack 宽松解析 |

### 8.2 classic 解析策略

`classic` 是最简单的解析策略，仅查找相对路径与 ambient 声明：

```typescript
// /src/app.ts
import { foo } from './utils';
// classic 查找：
// 1. /src/utils.ts
// 2. /src/utils.d.ts

import { bar } from 'lodash';
// classic 查找：
// 1. /src/lodash.ts
// 2. /src/lodash.d.ts
// 3. /lodash.ts
// 4. /lodash.d.ts
```

`classic` 不查 node_modules，已不推荐使用。

### 8.3 node (node10) 解析策略

`node` 模拟 Node.js Classic 的 require 解析算法：

```typescript
// /src/app.ts
import { foo } from './utils';
// node 查找：
// 1. /src/utils.ts
// 2. /src/utils.tsx
// 3. /src/utils.d.ts
// 4. /src/utils/package.json (types 字段)
// 5. /src/utils/index.ts
// 6. /src/utils/index.d.ts

import { bar } from 'lodash';
// node 查找：
// 1. /src/node_modules/lodash/package.json (types 字段)
// 2. /src/node_modules/lodash/index.d.ts
// 3. /node_modules/lodash/...
// 4. /node_modules/@types/lodash/index.d.ts
```

`node` 是 TypeScript 4.6 及以前的默认策略，至今仍是最广泛使用的。

### 8.4 node16/nodenext 解析策略

`node16`（4.7+）与 `nodenext`（4.7+）严格对齐 Node.js 12+ 的 ESM/CJS 解析规则：

```typescript
// /src/app.ts (ESM, package.json: "type": "module")
import { foo } from './utils';
// node16 查找：
// 1. /src/utils.ts → 编译为 /src/utils.js
// 必须显式写 .js 扩展名！
// 错误：import { foo } from './utils';  ← 不允许
// 正确：import { foo } from './utils.js';
```

`node16`/`nodenext` 的核心规则：

1. **相对路径必须显式扩展名**：ESM 模式下 `./utils` 无效，必须 `./utils.js`。
2. **package.json type 字段决定模式**：`"type": "module"` 表示 ESM，否则 CJS。
3. **支持 conditional exports**：根据导入方式选择 import/require 入口。
4. **强制区分 .ts 与 .d.ts**：开发时导入 .ts，类型解析 .d.ts。

### 8.5 bundler 解析策略

`bundler`（5.0+）模拟 Vite/Webpack/Rollup 等打包器的宽松解析行为：

```typescript
// bundler 模式下，以下导入都合法
import { foo } from './utils';        // 不需要扩展名
import { bar } from './utils.js';     // 也可以写 .js
import { baz } from './utils.ts';     // 部分打包器允许写 .ts
import { qux } from 'lodash';         // node_modules 解析
```

`bundler` 的关键特性：

1. **不需要扩展名**：与 `node10` 类似。
2. **支持 conditional exports**：与 `node16` 类似。
3. **不强制 ESM/CJS 区分**：打包器会处理互操作。
4. **要求 module 设置**：必须配合 `"module": "esnext"` 或 `"preserve"`。

### 8.6 解析策略选择决策树

```
你的工程运行在哪？
├── Node.js（直接运行编译产物）
│   ├── 使用 ESM（type: module） → nodenext
│   ├── 使用 CJS（require） → node16 或 node10
│   └── 双格式发布 → nodenext + 双 tsconfig
├── 浏览器/打包器（Vite/Webpack/Rollup）
│   └── bundler
├── Deno
│   └── nodenext（Deno 2.0+ 兼容 npm）
└── 旧项目兼容
    └── node（不推荐新项目使用）
```

### 8.7 实战对比

考虑以下项目结构：

```
project/
├── src/
│   ├── app.ts
│   ├── utils.ts
│   └── utils.d.ts
├── package.json
└── tsconfig.json
```

不同解析策略下 `import { x } from './utils'` 的行为：

| 策略 | 是否需要扩展名 | 优先加载 .ts 还是 .d.ts |
| ---- | -------------- | ----------------------- |
| classic | 否 | .ts |
| node (node10) | 否 | .ts |
| node16 (ESM) | 是（.js） | .ts |
| nodenext (ESM) | 是（.js） | .ts |
| bundler | 否 | .ts |

---

## 9. 路径映射与 baseUrl

### 9.1 baseUrl

`baseUrl` 设置模块解析的根目录。设置后，非相对路径导入会从 baseUrl 开始查找：

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": "./src"
  }
}
```

```typescript
// 等同于从 ./src/utils 导入
import { foo } from 'utils';
```

注意：`baseUrl` 主要用于历史兼容，现代项目推荐使用 `paths` 替代。

### 9.2 paths

`paths` 是更灵活的路径映射机制，支持别名与模式匹配：

```jsonc
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@utils": ["src/utils/index.ts"],
      "@lib/*": ["libs/*", "node_modules/*"]
    }
  }
}
```

```typescript
import { foo } from '@utils';             // src/utils/index.ts
import { Button } from '@components/Button';  // src/components/Button.ts
import { fetch } from '@lib/api';         // 先查 libs/api，再查 node_modules/api
```

### 9.3 paths 的运行时问题

`paths` 仅是 TypeScript 编译时的别名映射，运行时不会自动转换。需要在打包器或运行时配置中同步映射：

#### Vite 配置

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
    },
  },
});
```

#### Webpack 配置

```javascript
// webpack.config.js
const path = require('path');

module.exports = {
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@components': path.resolve(__dirname, 'src/components'),
    },
  },
};
```

#### tsconfig-paths（Node.js 运行时）

```bash
npm install --save-dev tsconfig-paths
node -r tsconfig-paths/register dist/index.js
```

#### ts-node 配置

```jsonc
// tsconfig.json
{
  "ts-node": {
    "files": true,
    "transpileOnly": true
  },
  "compilerOptions": {
    "paths": { "@/*": ["src/*"] }
  }
}
```

### 9.4 paths 与 monorepo

monorepo 中常使用 paths 跨包引用：

```jsonc
// packages/web/tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@myorg/shared": ["../shared/src/index.ts"],
      "@myorg/shared/*": ["../shared/src/*"]
    }
  }
}
```

但更推荐使用 project references（`references` 字段）：

```jsonc
{
  "references": [
    { "path": "../shared" }
  ]
}
```

---

## 10. package.json 的 exports 字段

### 10.1 exports 字段概述

Node.js 12+ 引入 `exports` 字段，用于：

1. 限制包的可导入路径（封装包内部）。
2. 提供多入口（main、module、browser、types）。
3. 条件导出（ESM/CJS/不同环境）。

```jsonc
{
  "name": "my-lib",
  "version": "1.0.0",
  "main": "./dist/index.cjs",         // CJS 入口（旧 Node）
  "module": "./dist/index.mjs",        // ESM 入口（打包器）
  "types": "./dist/index.d.ts",        // 类型入口（旧 TypeScript）
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs",
      "default": "./dist/index.cjs"
    },
    "./utils": {
      "types": "./dist/utils.d.ts",
      "import": "./dist/utils.mjs",
      "require": "./dist/utils.cjs"
    },
    "./package.json": "./package.json"
  }
}
```

### 10.2 types 条目的位置

**关键规则**：在 conditional exports 中，`types` 必须放在最前面：

```jsonc
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",  // 必须在最前
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    }
  }
}
```

原因：TypeScript 解析 exports 时使用 **first-match** 策略。如果 `import` 在 `types` 之前，TypeScript 可能匹配到 `.mjs` 入口但找不到对应 `.d.ts`。

### 10.3 子路径导出

```jsonc
{
  "name": "my-lib",
  "exports": {
    ".": "./dist/index.js",
    "./utils": "./dist/utils.js",
    "./utils/*": "./dist/utils/*.js",
    "./internal/*": null  // 禁止访问内部模块
  }
}
```

```typescript
import { x } from 'my-lib';           // 解析到 ./dist/index.js
import { y } from 'my-lib/utils';     // 解析到 ./dist/utils.js
import { z } from 'my-lib/utils/foo'; // 解析到 ./dist/utils/foo.js
import { w } from 'my-lib/internal/secret';  // 错误：禁止访问
```

### 10.4 条件导出

Node.js 定义的标准条件：

| 条件 | 含义 |
| ---- | ---- |
| `import` | ESM 导入 |
| `require` | CJS require |
| `node` | Node.js 环境 |
| `deno` | Deno 环境 |
| `browser` | 浏览器环境 |
| `default` | 兜底条件 |

```jsonc
{
  "exports": {
    ".": {
      "node": {
        "import": "./dist/node.mjs",
        "require": "./dist/node.cjs"
      },
      "browser": {
        "import": "./dist/browser.mjs",
        "require": "./dist/browser.cjs"
      },
      "default": "./dist/index.js"
    }
  }
}
```

### 10.5 TypeScript 对 exports 的解析

TypeScript 4.7+ 完整支持 exports 字段解析。配合 `moduleResolution: node16/nodenext/bundler`，TypeScript 会：

1. 读取 `exports.types` 条目作为类型入口。
2. 根据 `import`/`require` 选择运行时入口。
3. 支持子路径导出与条件导出。

### 10.6 双格式发布的完整配置

```jsonc
{
  "name": "@myorg/lib",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    },
    "./utils": {
      "types": "./dist/utils.d.ts",
      "import": "./dist/utils.mjs",
      "require": "./dist/utils.cjs"
    },
    "./package.json": "./package.json"
  },
  "files": [
    "dist",
    "src"
  ],
  "sideEffects": false,
  "engines": {
    "node": ">=14.0.0"
  }
}
```

---

## 11. ESM 与 CJS 互操作

### 11.1 互操作的核心问题

ESM 与 CJS 的根本差异：

| 特性 | ESM | CJS |
| ---- | --- | --- |
| 语法 | `import`/`export` | `require`/`module.exports` |
| 加载 | 异步、静态分析 | 同步、动态 |
| `this` 顶层 | `undefined` | `module.exports` |
| `__dirname` | 不可用 | 可用 |
| `require` | 不可用 | 可用 |
| `import.meta.url` | 可用 | 不可用 |
| 默认导出 | `export default` | `module.exports =` 或 `module.exports.default =` |

### 11.2 esModuleInterop

`esModuleInterop` 是 TypeScript 解决 ESM/CJS 互操作的核心选项。它允许 TypeScript 在导入 CJS 模块时模拟 ESM 的默认导入语义：

```typescript
// 不启用 esModuleInterop
import * as express from 'express';
const app = express();

// 启用 esModuleInterop
import express from 'express';
const app = express();
```

`esModuleInterop` 启用后，TypeScript 会生成额外的辅助函数：

```javascript
// 编译产物
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const app = (0, express_1.default)();
```

### 11.3 allowSyntheticDefaultImports

`allowSyntheticDefaultImports` 仅影响类型检查，不影响运行时编译：

- 不启用：导入 CJS 模块时 `import x from 'cjs-module'` 类型错误。
- 启用：类型检查通过，但运行时仍需 `esModuleInterop` 或打包器处理。

`esModuleInterop: true` 自动启用 `allowSyntheticDefaultImports: true`。

### 11.4 互操作场景与配置矩阵

| 项目格式 | 导入 CJS | 导入 ESM | 推荐 tsconfig |
| -------- | -------- | -------- | ------------- |
| CJS (`require`) | 直接 `require(x)` | 使用 dynamic `import()` | `module: commonjs, esModuleInterop: true` |
| ESM (`import`) | 需 `esModuleInterop` 或 default 导入 | 直接 `import x from 'y'` | `module: nodenext, esModuleInterop: true` |
| 打包器 | 直接 `import x from 'y'` | 直接 `import x from 'y'` | `module: esnext, moduleResolution: bundler` |

### 11.5 常见互操作错误

```typescript
// 错误 1：在 ESM 中直接 require
// ESM 文件不能使用 require
import { x } from 'cjs-lib';
const y = require('cjs-lib'); // SyntaxError in ESM

// 修复：使用 createRequire
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const y = require('cjs-lib');
```

```typescript
// 错误 2：CJS 中导入 ESM（Node.js 22+ 仍不支持）
const esmMod = require('esm-lib'); // Error: require() of ES Module

// 修复：使用 dynamic import（async）
async function loadEsm() {
  const esmMod = await import('esm-lib');
  return esmMod;
}
```

### 11.6 __dirname 与 __filename 在 ESM 中的替代

```typescript
// ESM 中无 __dirname 和 __filename
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
```

### 11.7 import type 与 type-only imports

TypeScript 3.8+ 引入 `import type`，仅在类型层面使用，不会生成运行时代码：

```typescript
import type { SomeType } from 'some-lib';
import { someValue } from 'some-lib';

// 编译后 only someValue 保留
```

TypeScript 4.5+ 支持内联 type 限定：

```typescript
import { someValue, type SomeType } from 'some-lib';
```

`verbatimModuleSyntax` 选项（TS 5.0+）强制所有类型导入必须显式标注：

```jsonc
{
  "compilerOptions": {
    "verbatimModuleSyntax": true
  }
}
```

```typescript
// 必须显式 type
import { type Type1, value1 } from 'lib';  // 正确
import { Type1, value1 } from 'lib';        // 错误：Type1 必须标注 type
```

---

## 12. DefinitelyTyped 与 @types

### 12.1 DefinitelyTyped 项目

DefinitelyTyped 是 GitHub 上最大的 TypeScript 声明文件仓库，由社区维护，提供数千个 npm 包的类型声明。所有 @types/* 包都从 DefinitelyTyped 仓库自动发布。

仓库地址：https://github.com/DefinitelyTyped/DefinitelyTyped

### 12.2 安装 @types

```bash
# 安装某个包的类型
npm install --save-dev @types/lodash

# 安装多个包的类型
npm install --save-dev @types/node @types/jest @types/react

# 查看是否有 @types 包
npm info @types/your-package
```

### 12.3 types 与 typeRoots

```jsonc
{
  "compilerOptions": {
    // 显式指定包含的 @types 包（默认包含所有）
    "types": ["node", "jest", "react"],

    // 自定义 typeRoots 路径
    "typeRoots": ["./node_modules/@types", "./types"]
  }
}
```

`types` 配置的影响：

- **不设置**：自动包含 `node_modules/@types` 下所有包。
- **设置为空数组**：不自动包含任何 @types 包。
- **设置为列表**：仅包含列表中的包。

```jsonc
// 仅包含 node 类型，其他 @types 不自动加载
{
  "compilerOptions": {
    "types": ["node"]
  }
}
```

### 12.4 @types 包的结构

一个典型的 @types 包结构：

```
@types/lodash/
├── package.json
├── index.d.ts
├── other-utils.d.ts
└── tsconfig.json  (DefinitelyTyped 配置)
```

```jsonc
// @types/lodash/package.json
{
  "name": "@types/lodash",
  "version": "4.14.0",
  "description": "TypeScript definitions for lodash",
  "main": "index.d.ts",
  "types": "index.d.ts"
}
```

### 12.5 自己编写 @types 包

如果 npm 包没有 @types，可以自己编写：

```typescript
// types/my-lib/index.d.ts
declare module 'my-lib' {
  export interface Options {
    timeout?: number;
  }

  export function doSomething(value: string, options?: Options): Promise<string>;
  export default function doSomethingDefault(): void;
}
```

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "typeRoots": ["./node_modules/@types", "./types"]
  }
}
```

### 12.6 发布 @types 包

如果觉得自己的类型声明对社区有用，可以提交到 DefinitelyTyped：

1. Fork DefinitelyTyped 仓库。
2. 在 `types/<package-name>/` 下创建声明文件。
3. 添加 `tsconfig.json` 与 `tslint.json`。
4. 提交 PR，等待审核与发布。

---

## 13. 对比分析

### 13.1 与 Python 类型系统的对比

Python 通过 `py.typed` 标记与 PEP 561 提供类型支持，机制类似 TypeScript：

```python
# Python 包内联类型
# my_package/__init__.py
def hello(name: str) -> str:
    return f"Hello, {name}"

# my_package/py.typed  # 空文件，标记支持类型
```

差异：

- TypeScript 声明与实现分离（.d.ts vs .ts）。
- Python 类型与实现同文件，通过 stub 文件（.pyi）支持分离。
- Python 的类型检查器（mypy/pyright）独立于运行时。

### 13.2 与 Rust 模块系统的对比

Rust 的模块系统更严格：

```rust
// Rust 模块声明
mod utils;
use crate::utils::helper;

// 必须在 lib.rs 或 main.rs 显式声明模块
// 不存在自动模块发现
```

差异：

- Rust 模块基于文件系统但需要显式声明。
- TypeScript 模块基于文件系统，自动发现。
- Rust 的 crate（包）系统更接近 monorepo。

### 13.3 与 Go 模块系统的对比

Go 的模块系统简化：

```go
// Go 模块导入
import (
    "fmt"
    "github.com/user/repo/pkg"
)

// 包名与导入路径的最后一段相同
// 不需要扩展名
// 没有 .d.ts 等类型声明文件（类型与实现同文件）
```

差异：

- Go 类型与实现同文件，不需要声明文件。
- Go 模块路径基于 URL（github.com/user/repo）。
- Go 没有 @types 等价物。

### 13.4 综合对比

| 特性 | TypeScript | Python | Rust | Go |
| ---- | ---------- | ------ | ---- | --- |
| 声明文件 | .d.ts | .pyi | 无 | 无 |
| 模块解析 | 多策略 | sys.path | Cargo + mod | URL + GOPATH |
| 类型与实现分离 | 支持 | 支持（stub） | 不支持 | 不支持 |
| 包生态 | npm + @types | PyPI | crates.io | pkg.go.dev |
| 类型检查器 | tsc | mypy/pyright | rustc | go vet |

---

## 14. 常见陷阱与修复

### 14.1 陷阱 1：NodeNext 下未使用扩展名

```typescript
// 错误
import { foo } from './utils';

// 修复
import { foo } from './utils.js';
```

NodeNext 要求相对路径导入必须显式写 `.js` 扩展名（即使源文件是 `.ts`）。

### 14.2 陷阱 2：找不到模块声明

```typescript
import { x } from 'untyped-lib';
// Error: Could not find a declaration file for module 'untyped-lib'.
```

修复方案：

```typescript
// 方案 1：安装 @types
npm install --save-dev @types/untyped-lib

// 方案 2：自己写声明文件
// types/untyped-lib.d.ts
declare module 'untyped-lib' {
  export function x(): void;
}

// 方案 3：使用 ts-ignore 绕过（不推荐）
// @ts-ignore
import { x } from 'untyped-lib';
```

### 14.3 陷阱 3：types 条目顺序错误

```jsonc
// 错误：types 在 import 后
{
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "types": "./dist/index.d.ts"  // 不会被匹配
    }
  }
}
```

修复：

```jsonc
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",  // 必须在最前
      "import": "./dist/index.mjs"
    }
  }
}
```

### 14.4 陷阱 4：declare module 覆盖 @types

```typescript
// 错误：declare module 覆盖 @types/lodash
declare module 'lodash' {
  export function get(obj: object, path: string): any;
}

import _ from 'lodash';
// _.get 类型是上面的声明，而非 @types/lodash 的完整版本
```

修复：删除 declare module，使用 @types/lodash。

### 14.5 陷阱 5：路径映射未在运行时同步

```typescript
// tsconfig.json paths 配置 @/components → src/components
import { Button } from '@/components/Button';
// TypeScript 通过，但运行时找不到 @/components
```

修复：在打包器或运行时配置中同步别名映射（见第 9.3 节）。

### 14.6 陷阱 6：循环导入的类型丢失

```typescript
// a.ts
import { B } from './b';
export interface A { b: B; }

// b.ts
import { A } from './a';
export interface B { a: A; }
```

修复：使用 `import type` 仅导入类型，避免运行时循环：

```typescript
// a.ts
import type { B } from './b';
export interface A { b: B; }

// b.ts
import type { A } from './a';
export interface B { a: A; }
```

### 14.7 陷阱 7：lib.d.ts 冲突

```typescript
// 错误：自定义类型与 lib.d.ts 冲突
interface Array<T> {
  // 与 ES2022 的 Array.at 冲突
  at(index: number): T | undefined;
}
```

修复：使用 lib 选项选择标准库版本，避免手动重复定义。

### 14.8 陷阱 8：跳过 lib 检查导致的错误

```jsonc
{
  "compilerOptions": {
    "skipLibCheck": true  // 跳过 .d.ts 检查
  }
}
```

`skipLibCheck` 会跳过所有 .d.ts 文件的类型检查，可能隐藏第三方库的类型错误。仅在大型项目性能优化时使用。

---

## 15. 工程实践

### 15.1 现代项目 tsconfig.json 模板

#### 打包器工程（Vite/Webpack）

```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "noEmit": true,
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src", "types"],
  "exclude": ["node_modules", "dist"]
}
```

#### Node.js ESM 工程

```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2023"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

#### 库工程（双格式发布）

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2020"],
    "strict": true,
    "declaration": true,
    "declarationMap": true,
    "emitDeclarationOnly": true,
    "outDir": "./dist/types",
    "rootDir": "./src"
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

### 15.2 双格式发布工程结构

```
my-lib/
├── src/
│   ├── index.ts
│   └── utils.ts
├── tsconfig.json
├── tsup.config.ts          # 使用 tsup 构建双格式
├── package.json
└── README.md
```

```typescript
// tsup.config.ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/utils.ts'],
  format: ['cjs', 'esm'],
  dts: true,                  // 生成 .d.ts
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
});
```

```jsonc
// package.json
{
  "name": "my-lib",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    },
    "./utils": {
      "types": "./dist/utils.d.ts",
      "import": "./dist/utils.mjs",
      "require": "./dist/utils.cjs"
    }
  },
  "files": ["dist"],
  "sideEffects": false,
  "engines": {
    "node": ">=14"
  }
}
```

### 15.3 monorepo 模块解析

```
monorepo/
├── packages/
│   ├── shared/
│   │   ├── src/
│   │   │   └── index.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   ├── web/
│   │   ├── src/
│   │   ├── tsconfig.json
│   │   └── package.json
│   └── api/
│       ├── src/
│       ├── tsconfig.json
│       └── package.json
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

```jsonc
// tsconfig.base.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

```jsonc
// packages/shared/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

```jsonc
// packages/web/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "paths": {
      "@myorg/shared": ["../shared/src"],
      "@myorg/shared/*": ["../shared/src/*"]
    }
  },
  "references": [
    { "path": "../shared" }
  ],
  "include": ["src"]
}
```

### 15.4 project references 实战

```jsonc
// 顶层 tsconfig.json
{
  "files": [],
  "references": [
    { "path": "./packages/shared" },
    { "path": "./packages/web" },
    { "path": "./packages/api" }
  ]
}
```

使用 `tsc --build` 增量编译：

```bash
tsc --build                # 构建所有引用的项目
tsc --build --watch        # 增量监听
tsc --build --force        # 强制重新构建
tsc --build --clean        # 清理构建产物
```

### 15.5 自定义类型声明组织

```
project/
├── src/
├── types/
│   ├── global.d.ts        # 全局声明
│   ├── assets.d.ts        # 静态资源声明（*.css, *.png）
│   ├── modules.d.ts       # 第三方模块声明
│   └── express.d.ts       # Express 扩展声明
├── tsconfig.json
└── package.json
```

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "typeRoots": ["./node_modules/@types", "./types"]
  },
  "include": ["src", "types"]
}
```

### 15.6 类型检查脚本

```jsonc
// package.json
{
  "scripts": {
    "type-check": "tsc --noEmit",
    "type-check:watch": "tsc --noEmit --watch",
    "build:types": "tsc --emitDeclarationOnly",
    "build": "tsc && vite build"
  }
}
```

---

## 16. 案例研究

### 16.1 案例一：Vite + React 项目

```jsonc
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"]
}
```

### 16.2 案例二：Node.js ESM 服务

```jsonc
// package.json
{
  "name": "my-api",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2023"],
    "strict": true,
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

```typescript
// src/index.ts
import express from 'express';
import { router } from './routes.js';  // 必须显式 .js

const app = express();
app.use(router);
app.listen(3000);
```

### 16.3 案例三：npm 库双格式发布

```typescript
// src/index.ts
export class MyClass {
  constructor(public value: number) {}

  double(): number {
    return this.value * 2;
  }
}

export function helper(x: string): string {
  return x.toUpperCase();
}
```

```jsonc
// package.json
{
  "name": "@myorg/lib",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup",
    "prepublishOnly": "npm run build"
  },
  "devDependencies": {
    "tsup": "^8.0.0",
    "typescript": "^5.4.0"
  }
}
```

### 16.4 案例四：扩展 Express 类型

```typescript
// types/express.d.ts
declare module 'express' {
  interface Request {
    user?: {
      id: string;
      role: 'admin' | 'user';
    };
    traceId?: string;
  }

  interface Response {
    success<T>(data: T): void;
    fail(error: string, code?: number): void;
  }
}
```

```typescript
// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  // req.user 类型可用
  if (!req.user) {
    res.fail('Unauthorized', 401);  // res.fail 可用
    return;
  }
  next();
}
```

### 16.5 案例五：Webpack 静态资源声明

```typescript
// types/assets.d.ts
declare module '*.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.jpg' {
  const src: string;
  export default src;
}

declare module '*.svg' {
  import * as React from 'react';
  export const ReactComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
  const src: string;
  export default src;
}

declare module '*.svg?url' {
  const src: string;
  export default src;
}

declare module '*.woff' {
  const src: string;
  export default src;
}

declare module '*.woff2' {
  const src: string;
  export default src;
}
```

### 16.6 案例六：Vue SFC 声明

```typescript
// types/vue.d.ts
declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}
```

```typescript
// 使用
import MyComponent from './MyComponent.vue';
// MyComponent 类型为 DefineComponent
```

### 16.7 案例七：JSON 模块导入

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "resolveJsonModule": true,
    "esModuleInterop": true
  }
}
```

```typescript
// config.json
{
  "appName": "MyApp",
  "version": "1.0.0"
}

// app.ts
import config from './config.json';
console.log(config.appName);  // 类型推导为 string
```

### 16.8 案例八：动态导入

```typescript
// 动态导入返回 Promise<T>
const module = await import('./utils.js');
// module 类型为 typeof import('./utils.js')

// 配合代码分割
const routes = {
  home: () => import('./pages/Home.js'),
  about: () => import('./pages/About.js'),
  contact: () => import('./pages/Contact.js'),
};

type RouteLoader = () => Promise<typeof import('./pages/Home.js')>;
```

---

## 17. 习题

### 17.1 填空题

1. **[remember]** TypeScript 5.0+ 推荐的现代模块解析策略中，____适合打包器工程，____适合 Node.js ESM 工程。

2. **[remember]** 在 NodeNext 解析策略下，相对路径导入必须显式包含____扩展名，且 .ts 源文件对应的运行时导入路径应写为____。

3. **[understand]** package.json 的 exports 字段中，____条件用于声明 TypeScript 类型入口，其值必须以____开头。

4. **[understand]** 声明合并规则中，接口的____成员必须唯一且类型一致，____成员会按声明顺序合并为重载列表。

5. **[remember]** TypeScript 内置的声明文件位于 ____目录，可通过 ____ 选项配置包含哪些标准库。

### 17.2 选择题

1. **[understand]** 下列哪种情况必须使用 declare module 而非 declare global？

   - A. 扩展 Window 接口
   - B. 为无类型的 npm 包提供类型
   - C. 在模块文件中新增全局变量
   - D. 声明 process.env 类型

   答案：B

2. **[analyze]** 关于 moduleResolution: bundler 的描述，错误的是？

   - A. 支持不写扩展名的相对路径导入
   - B. 要求 package.json 必须设置 type: module
   - C. 适用于 Vite/Webpack/Rollup 等打包器工程
   - D. 不支持 Node.js 原生运行

   答案：B

3. **[evaluate]** 以下 package.json exports 配置，TypeScript 解析时会出什么问题？

   ```json
   {
     "exports": {
       ".": {
         "import": "./dist/index.mjs",
         "types": "./dist/index.d.ts"
       }
     }
   }
   ```

   - A. 没问题，正常运行
   - B. TypeScript 找不到类型，因为 types 在 import 之后
   - C. import 入口无法被 Node.js 加载
   - D. 需要添加 require 条目

   答案：B

4. **[understand]** 关于 esModuleInterop 与 allowSyntheticDefaultImports 的关系，正确的是？

   - A. 二者完全等价
   - B. esModuleInterop 自动启用 allowSyntheticDefaultImports
   - C. allowSyntheticDefaultImports 自动启用 esModuleInterop
   - D. 二者互斥

   答案：B

5. **[analyze]** 以下代码在 NodeNext ESM 工程中哪一行会报错？

   ```typescript
   import express from 'express';            // (1)
   import { helper } from './utils';          // (2)
   import type { Options } from './types';    // (3)
   import _ from 'lodash';                    // (4)
   ```

   - A. 第 (1) 行
   - B. 第 (2) 行
   - C. 第 (3) 行
   - D. 第 (4) 行

   答案：B（NodeNext 要求显式 .js 扩展名）

### 17.3 代码修复题

1. **[apply]** 以下 NodeNext 工程代码报错 "Could not find a declaration file for module './utils'"。请修复导入语句。

   ```typescript
   // src/index.ts
   import { helper } from './utils';
   ```

   修复方案：

   ```typescript
   // NodeNext 要求相对路径导入显式写 .js 扩展名
   import { helper } from './utils.js';
   ```

2. **[apply]** 以下 Express 扩展声明无法生效，请修复。

   ```typescript
   // types/express.d.ts
   declare module 'express' {
     export function myHelper(): void;
   }
   ```

   修复方案：

   ```typescript
   // 错误：模块扩展不能添加新的顶层导出，只能扩展现有接口
   declare module 'express' {
     interface Request {
       user?: { id: string; role: 'admin' | 'user' };
     }
   }
   ```

3. **[apply]** 以下 package.json exports 配置导致 TypeScript 无法找到类型，请修复。

   ```json
   {
     "exports": {
       ".": {
         "import": "./dist/index.mjs",
         "require": "./dist/index.cjs",
         "types": "./dist/index.d.ts"
       }
     }
   }
   ```

   修复方案：

   ```json
   {
     "exports": {
       ".": {
         "types": "./dist/index.d.ts",
         "import": "./dist/index.mjs",
         "require": "./dist/index.cjs"
       }
     }
   }
   ```

4. **[apply]** 以下声明文件在模块文件中扩展 Window 失败，请修复。

   ```typescript
   // types/globals.d.ts
   declare global {
     interface Window {
       myApp: { version: string };
     }
   }
   ```

   修复方案：

   ```typescript
   // 必须有 export {} 才是模块文件
   export {};

   declare global {
     interface Window {
       myApp: { version: string };
     }
   }
   ```

### 17.4 开放题

1. **[evaluate]** 你正在为一个同时支持 ESM 与 CJS 双格式发布的 npm 包编写 package.json。请描述 exports 字段的完整结构，包括 main、module、import、require、types 条目，并说明为什么 types 条目必须放在最前面。

2. **[create]** 设计一个 monorepo 项目的模块解析策略，要求：
   - 使用 pnpm workspaces
   - 包含 shared、web、api 三个包
   - shared 包被 web 和 api 共享
   - web 使用 bundler 解析，api 使用 NodeNext 解析
   - 提供 tsconfig.base.json 与各包的 tsconfig.json
   - 描述构建与开发流程

3. **[analyze]** 阅读以下错误信息，分析根本原因并给出三种可能的修复方案：

   ```
   Error: Could not find a declaration file for module 'my-lib'.
   'my-lib/index.js' implicitly has an 'any' type.
   ```

4. **[create]** 为一个使用 Vite + React + TypeScript 的项目设计完整的类型声明组织，包括：
   - 静态资源（CSS/图片/SVG）
   - 环境变量（import.meta.env）
   - 全局扩展（Window 接口）
   - 第三方库扩展（React 组件库）
   - 路由配置类型

5. **[evaluate]** 对比 moduleResolution: node、node16、nodenext、bundler 四种策略的优劣，并说明在什么场景下应该选择哪种。

---

## 18. 参考文献

1. Bierman, G., Abadi, M., and Torgersen, M. 2014. Understanding TypeScript. In *28th European Conference on Object-Oriented Programming (ECOOP 2014)*. LIPIcs 33, Article 257, 1–29. DOI: https://doi.org/10.4230/LIPIcs.ECOOP.2014.257

2. ECMA International. 2024. *ECMAScript 2024 Language Specification (ECMA-262, 15th edition)*. Standard ECMA-262. Available at: https://tc39.es/ecma262/

3. Node.js Foundation. 2024. *Node.js Modules API: Package Exports*. Available at: https://nodejs.org/api/packages.html

4. TypeScript Team. 2024. *TypeScript Handbook: Modules Reference*. Microsoft. Available at: https://www.typescriptlang.org/docs/handbook/modules/reference.html

5. TC39. 2018. *ECMA-262 Module Specification*. In Proceedings of ECMA TC39. DOI: https://doi.org/10.1145/3180267

6. Guarneri, S. and Gardner, P. 2021. A formal semantics for ES modules. In *Proceedings of the 30th European Symposium on Programming (ESOP 2021)*. LNCS 12648, 287–314. DOI: https://doi.org/10.1007/978-3-030-72019-3_11

7. Bradley, M. and Bonsangue, M. 2018. A formal semantics for the JavaScript module system. In *Proceedings of the 17th International Workshop on Formal Engineering approaches to Software Components and Architectures (FESCA 2018)*. EPTCS 272, 23–40. DOI: https://doi.org/10.4204/EPTCS.272.2

8. Swaine, B. and Glines, M. 2019. *A History of JavaScript Modules*. ACM Queue 17, 4 (Aug. 2019).

9. TypeScript Team. 2023. *TypeScript 5.0 Release: moduleResolution: bundler*. Microsoft. Available at: https://devblogs.microsoft.com/typescript/announcing-typescript-5-0/

10. Branch, A. 2022. *TypeScript 4.7 Release: Enhanced moduleResolution*. Microsoft. Available at: https://devblogs.microsoft.com/typescript/announcing-typescript-4-7/

11. DefinitelyTyped Community. 2024. *DefinitelyTyped README*. GitHub. Available at: https://github.com/DefinitelyTyped/DefinitelyTyped

12. Ecma International. 2015. *ECMAScript 2015 Language Specification (6th edition)*. Standard ECMA-262, 6th edition.

13. CommonJS Community. 2009. *Modules/1.1.1*. CommonJS Wiki. Available at: https://wiki.commonjs.org/wiki/Modules/1.1.1

14. Winter, J. 2018. *UMD (Universal Module Definition) patterns*. GitHub. Available at: https://github.com/umdjs/umd

15. McIlroy, D., Pinch, E., and Bostock, M. 2020. *Package.json exports field: a comprehensive guide*. npm Blog. Available at: https://nodejs.org/api/packages.html

---

## 19. 延伸阅读

### 19.1 书籍

- **《Programming TypeScript》**——Boris Cherny，O'Reilly 2019。第 9 章对模块解析有详尽讲解。
- **《Effective TypeScript》**——Dan Vanderkam，O'Reilly 2019。第 7 章包含模块配置实践。
- **《Learning TypeScript》**——Josh Goldberg，O'Reilly 2022。第 8 章涵盖声明文件编写。
- **《TypeScript Cookbook》**——Stefan Baumgartner，O'Reilly 2023。
- **《Elevate Web Apps with TypeScript》**——Yvonne Zhang，Manning 2024。

### 19.2 论文

- Bierman, G., Abadi, M., and Torgersen, M. 2014. *Understanding TypeScript*. ECOOP 2014.
- Guarneri, S. and Gardner, P. 2021. *A formal semantics for ES modules*. ESOP 2021.
- Bradley, M. and Bonsangue, M. 2018. *A formal semantics for the JavaScript module system*. FESCA 2018.

### 19.3 开源项目

- **DefinitelyTyped**（https://github.com/DefinitelyTyped/DefinitelyTyped）：最大的社区声明文件仓库。
- **tsup**（https://github.com/egoist/tsup）：零配置 TypeScript 构建工具，支持双格式发布。
- **tshy**（https://github.com/isaacs/tshy）：Isaac Schlueter 的 TypeScript 双格式发布工具。
- **unbuild**（https://github.com/unjs/unbuild）：JavaScript/TypeScript 构建工具。
- **tsx**（https://github.com/privatenumber/tsx）：TypeScript 运行时执行器，支持 ESM/CJS。

### 19.4 在线资源

- **TypeScript Handbook: Modules Reference**（https://www.typescriptlang.org/docs/handbook/modules/reference.html）——官方模块解析完整参考。
- **TypeScript Handbook: Module Resolution**（https://www.typescriptlang.org/docs/handbook/module-resolution.html）——官方解析策略说明。
- **TypeScript Handbook: Declaration Files**（https://www.typescriptlang.org/docs/handbook/declaration-files/introduction.html）——官方声明文件指南。
- **Node.js Documentation: Packages**（https://nodejs.org/api/packages.html）——Node.js exports 字段官方文档。
- **Andrew Branch's Blog**（https://andrewbranch.dev）——TypeScript 团队成员博客，模块解析深度文章。

### 19.5 视频课程

- **Microsoft Build: TypeScript Deep Dives**——Microsoft Build 大会的 TypeScript 模块解析讲座。
- **TypeScript Congress**——年度 TypeScript 大会，模块解析相关讲座。
- **Matt Pocock's Total TypeScript**（https://www.totaltypescript.com）——模块解析与声明文件实战课程。

### 19.6 工具

- **arethetypeswrong**（https://github.com/arethetypeswrong/arethetypeswrong.github.io）：检查 npm 包类型声明正确性的工具。
- **ts-types-check**：批量检查 TypeScript 类型声明质量的工具。
- **@arethetypeswrong/core**：可集成的类型检查库。

---

## 附录 A：模块解析策略对比表

| 特性 | classic | node (node10) | node16 | nodenext | bundler |
| ---- | ------- | ------------- | ------ | -------- | ------- |
| 引入版本 | 1.0 | 1.0 | 4.7 | 4.7 | 5.0 |
| 相对路径扩展名 | 可省 | 可省 | 必须显式 | 必须显式 | 可省 |
| node_modules 查找 | 否 | 是 | 是 | 是 | 是 |
| exports 字段 | 否 | 否 | 是 | 是 | 是 |
| ESM/CJS 区分 | 否 | 否 | 是 | 是 | 否 |
| conditional exports | 否 | 否 | 是 | 是 | 是 |
| 推荐 | 不推荐 | 旧项目 | Node.js | Node.js 现代项目 | 打包器 |

## 附录 B：常见 tsconfig.json 选项速查

| 选项 | 类型 | 作用 |
| ---- | ---- | ---- |
| `module` | enum | 模块系统：commonjs/esnext/nodenext |
| `moduleResolution` | enum | 解析策略 |
| `baseUrl` | string | 路径映射根 |
| `paths` | object | 路径别名映射 |
| `types` | array | 显式指定 @types 包 |
| `typeRoots` | array | @types 搜索路径 |
| `lib` | array | 内置标准库 |
| `esModuleInterop` | boolean | ESM/CJS 互操作辅助 |
| `allowSyntheticDefaultImports` | boolean | 允许合成默认导入 |
| `resolveJsonModule` | boolean | 允许导入 JSON |
| `isolatedModules` | boolean | 单文件编译模式 |
| `verbatimModuleSyntax` | boolean | 强制显式 type 导入 |
| `declaration` | boolean | 生成 .d.ts |
| `declarationMap` | boolean | 生成 .d.ts.map |
| `emitDeclarationOnly` | boolean | 仅生成声明 |
| `skipLibCheck` | boolean | 跳过 .d.ts 检查 |

## 附录 C：错误信息索引

| 错误码 | 错误信息 | 常见原因 |
| ------ | -------- | -------- |
| TS2307 | Cannot find module 'X' or its corresponding type declarations. | 模块未安装或声明文件缺失 |
| TS2688 | Cannot find type definition file for 'X'. | @types/X 未安装或 types 配置错误 |
| TS2459 | Module 'X' declares 'X' locally, but it is not exported. | 导入路径与实际导出不匹配 |
| TS5097 | An import path cannot end with a '.ts' extension. | 导入路径不能以 .ts 结尾（除 Bundler） |
| TS2835 | Relative import paths need explicit file extensions. | NodeNext 要求显式扩展名 |
| TS1511 | Module 'X' has no default export. | esModuleInterop 未启用 |
| TS2614 | Module 'X' can only be default-imported using esModuleInterop. | esModuleInterop 未启用 |

## 附录 D：决策流程图

```
项目类型？
├── 库（被其他项目使用）
│   ├── 单格式 → 选择 ESM 或 CJS，配置 declaration: true
│   └── 双格式 → tsup + exports 字段
├── 应用（直接运行）
│   ├── Node.js → moduleResolution: NodeNext
│   ├── 浏览器 → moduleResolution: Bundler
│   └── 桌面（Electron） → 混合，需要多个 tsconfig
└── Monorepo
    ├── pnpm workspaces → 各包独立 tsconfig + project references
    └── npm workspaces → 同上
```

## 附录 E：自测清单

- [ ] 我能说出五种模块解析策略的名称与适用场景
- [ ] 我能在 NodeNext 工程中正确使用 .js 扩展名
- [ ] 我能写出符合规范的双格式发布 package.json exports
- [ ] 我能使用 declare module 扩展第三方模块类型
- [ ] 我能区分 esModuleInterop 与 allowSyntheticDefaultImports
- [ ] 我能配置 paths 路径映射并在打包器同步
- [ ] 我能在 monorepo 中使用 project references
- [ ] 我能写出 declare module '*.svg' 等通配符声明
- [ ] 我能诊断 "Cannot find module" 错误的根因
- [ ] 我能为无类型的 npm 包编写 .d.ts 文件

---

## 更新日志

- 2026-07-20：金标准升级，新增形式化定义、历史演进、模块解析策略对比、exports 字段、ESM/CJS 互操作、monorepo 实战与案例研究，扩展至金标准长度。
- 2026-04-06：初版，覆盖 .d.ts、声明合并、模块解析策略与 ESM/CJS 互操作要点。
