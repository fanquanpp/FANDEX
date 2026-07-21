---
order: 65
tags:
  - typescript
  - namespace
  - module
difficulty: intermediate
title: 命名空间与模块
module: typescript
category: 'TS Advanced'
description: TypeScript命名空间、ES模块、CommonJS模块、模块解析策略与声明文件详解。
author: fanquanpp
updated: '2026-07-21'
related:
  - typescript/this类型与多态
  - typescript/符号与唯一类型
  - typescript/枚举进阶
  - typescript/工具类型实现原理
prerequisites:
  - typescript/语法速查
---

## 学习目标

完成本章学习后，读者应能够在以下认知层级（Bloom 分类法）达到相应能力：

1. **记忆（Remember）**：复述命名空间（Namespace）与模块（Module）的语法差异，列举 TypeScript 的四种模块解析策略（Classic、Node、Node16、Bundler），写出 `import`、`export`、`declare`、`namespace` 关键字的基本用法。
2. **理解（Understand）**：解释 JavaScript 模块系统的演化历程（IIFE、CommonJS、AMD、UMD、ESM），说明 TypeScript 命名空间在编译后的结构，对比命名空间与模块在作用域、依赖管理、Tree-shaking 等维度的差异。
3. **应用（Apply）**：使用 ES 模块组织中型项目，编写 `.d.ts` 声明文件为 JavaScript 库提供类型，配置 `tsconfig.json` 的 `moduleResolution` 与 `paths` 别名。
4. **分析（Analyze）**：解构复杂模块依赖图，识别循环依赖，分析模块解析失败的根本原因，判断何时应使用命名空间而非模块。
5. **评价（Evaluate）**：评估不同模块解析策略对构建产物、运行时性能、工具链兼容性的影响，为项目选择合适的 `module` 与 `moduleResolution` 配置。
6. **创造（Create）**：设计并发布一个完整的 TypeScript 库，包含多模块入口、类型声明文件、Tree-shaking 友好的导出结构、支持 CommonJS 与 ESM 双格式。

## 历史动机与背景

JavaScript 的模块系统经历了长达二十年的演化，是前端工程化最曲折的篇章之一。理解这段历史，是正确使用 TypeScript 命名空间与模块的前提。

### 阶段一：全局变量与 IIFE（1995-2009）

早期的 JavaScript 没有模块系统，所有脚本共享全局作用域。开发者通过立即执行函数表达式（IIFE）模拟私有作用域：

```javascript
// 1990 年代的"模块"模式
var MyModule = (function () {
  var privateVar = 'secret';

  function privateFunction() {
    return privateVar;
  }

  return {
    publicMethod: function () {
      return privateFunction();
    },
  };
})();

MyModule.publicMethod(); // 'secret'
```

这种模式的缺陷显而易见：

- **全局命名空间污染**：每个模块都要在 `window` 上挂载一个变量。
- **依赖顺序脆弱**：模块间的依赖通过脚本加载顺序保证，极易出错。
- **无法声明依赖关系**：模块无法显式表达"我依赖谁"。

### 阶段二：CommonJS 与 AMD（2009-2015）

2009 年，Node.js 采用 CommonJS 规范，为服务端 JavaScript 带来了真正的模块系统：

```javascript
// CommonJS 模块
const fs = require('fs');  // 同步加载
const path = require('path');

module.exports = {
  readFile: function (file) {
    return fs.readFileSync(file, 'utf-8');
  },
};
```

同期，浏览器端的 AMD（Asynchronous Module Definition）规范出现，RequireJS 是其代表实现：

```javascript
// AMD 模块
define(['jquery', 'underscore'], function ($, _) {
  return {
    decorate: function (el) {
      $(el).addClass(_.uniqueId('item-'));
    },
  };
});
```

UMD（Universal Module Definition）试图统一 CommonJS 与 AMD：

```javascript
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(['jquery'], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('jquery'));
  } else {
    root.MyModule = factory(root.jQuery);
  }
}(typeof self !== 'undefined' ? self : this, function ($) {
  return {};
}));
```

这一时期模块系统碎片化严重，开发者需要为不同环境编写不同代码。

### 阶段三：TypeScript 命名空间（2012-2015）

TypeScript 1.0（2012）引入了命名空间（早期称为"内部模块"），作为对 JavaScript 模块缺失的补丁：

```typescript
// 命名空间：通过对象嵌套组织代码
namespace Geometry {
  export interface Point { x: number; y: number }

  export function distance(a: Point, b: Point): number {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  export namespace Shapes {
    export class Circle {
      constructor(public center: Point, public radius: number) {}
    }
  }
}

// 使用
const p1: Geometry.Point = { x: 0, y: 0 };
const p2: Geometry.Point = { x: 3, y: 4 };
Geometry.distance(p1, p2); // 5
```

命名空间编译后是一个全局变量（或 IIFE），无需模块加载器即可运行。在 ES 模块尚未普及的年代，命名空间是组织大型 TypeScript 代码的主要手段。

### 阶段四：ES 模块的标准化（2015-2020）

ECMAScript 2015（ES6）正式将模块纳入语言标准，称为 ES Modules（ESM）：

```javascript
// ES 模块
import fs from 'fs';
import { readFile } from 'fs/promises';

export function readJson(file) {
  return readFile(file, 'utf-8').then(JSON.parse);
}

export default readJson;
```

ESM 是静态的：`import` 与 `export` 必须在顶层，且路径必须是字符串字面量。这一约束使得编译时可以确定模块依赖图，为 Tree-shaking 提供了基础。

然而，ESM 在浏览器中的普及花费了数年。直到 2018 年，主流浏览器才原生支持 `<script type="module">`。Node.js 直到 12.x（2019）才稳定支持 ESM。在此期间，TypeScript 同时支持命名空间与 ESM，开发者需要在两者间抉择。

### 阶段五：模块解析策略的多元化（2020-至今）

随着 Node.js 12+ 支持 ESM、Webpack 5、Vite、esbuild 等构建工具的成熟，模块解析策略变得复杂。TypeScript 4.7（2022）引入了 `node16`、`nodenext` 解析策略，4.8 引入了 `bundler` 策略，以适配不同的运行环境。

今天，**ES 模块已成为主流**，命名空间主要用于向后兼容与特定场景（如扩展全局类型）。理解两者的差异与各自的适用场景，是 TypeScript 开发者的必备知识。

## 形式化定义

### 模块系统的形式化模型

一个模块系统可以形式化为六元组：

$$
\mathcal{M} = (M, \Sigma, \rho, \iota, \epsilon, \delta)
$$

其中：

- $M$：**模块集合**（Set of Modules），每个模块 $m \in M$ 是一个独立的代码单元。
- $\Sigma$：**符号空间**（Symbol Space），所有可导出符号的集合，包括变量、函数、类、类型等。
- $\rho$：**解析函数**（Resolution Function），$\rho: M \times \text{Path} \to M$，将模块标识符映射到具体模块。
- $\iota$：**导入操作**（Import Operation），$\iota: M \times \Sigma \to \Sigma$，从一个模块导入符号到当前模块。
- $\epsilon$：**导出操作**（Export Operation），$\epsilon: M \times \Sigma \to \Sigma$，将符号从模块导出。
- $\delta$：**依赖关系**（Dependency Relation），$\delta \subseteq M \times M$，模块间的有向依赖图。

### ES 模块的静态性

ES 模块的关键特性是**静态性（Static Structure）**，形式化定义为：

$$
\forall m \in M: \text{imports}(m) \text{ 与 } \text{exports}(m) \text{ 可在编译时确定}
$$

即模块的导入与导出关系是编译时常量，不依赖运行时状态。这一性质使得：

1. **Tree-shaking 可行**：未使用的导出可在编译时删除。
2. **循环依赖可检测**：依赖图 $\delta$ 可静态分析。
3. **类型检查可精确**：编译器能确定每个符号的来源模块。

### 命名空间的语义

命名空间编译后为对象嵌套结构，形式化为：

$$
\text{compile}(\text{namespace } N \{ S \}) = \text{var } N = (\text{function}() \{ S; \text{return } E \})()
$$

其中 $S$ 是命名空间体语句，$E$ 是导出成员对象。因此命名空间本质是 IIFE 的语法糖，其符号在运行时是对象的属性。

### 模块解析的形式化

模块解析函数 $\rho$ 的行为由解析策略决定。对于 Node.js 解析策略：

$$
\rho(m, p) = \begin{cases}
\text{findFile}(p) & \text{if } p \text{ is relative path} \\
\text{findNodeModule}(p, \text{cwd}(m)) & \text{if } p \text{ is bare specifier} \\
\text{findTypeDeclaration}(p) & \text{if } p \text{ is type-only}
\end{cases}
$$

其中 `findNodeModules` 会沿目录树向上搜索 `node_modules` 目录。

### 循环依赖的图论定义

模块依赖图 $\delta$ 中的循环依赖定义为：

$$
\exists m_1, m_2, \dots, m_n \in M: (m_1, m_2), (m_2, m_3), \dots, (m_n, m_1) \in \delta
$$

即存在一条从某模块回到自身的路径。ES 模块与 CommonJS 对循环依赖的处理方式不同（详见理论推导一）。

## 理论推导

### 推导一：ES 模块与 CommonJS 的循环依赖处理

**定理**：ES 模块与 CommonJS 在循环依赖下表现出不同的语义。

**证明**：

**CommonJS 的循环依赖处理**：

CommonJS 模块在第一次 `require` 时执行，执行过程中若 `require` 一个正在执行的模块，返回该模块当前已导出的部分（即 `module.exports` 的快照）。

```javascript
// a.js (CommonJS)
console.log('a starting');
exports.done = false;
const b = require('./b.js');
console.log('in a, b.done =', b.done);
exports.done = true;
console.log('a done');

// b.js (CommonJS)
console.log('b starting');
exports.done = false;
const a = require('./a.js');  // 返回 a 当前的 exports: { done: false }
console.log('in b, a.done =', a.done);  // false
exports.done = true;
console.log('b done');

// 执行 require('./a.js')：
// a starting
// b starting
// in b, a.done = false
// b done
// in a, b.done = true
// a done
```

**ES 模块的循环依赖处理**：

ES 模块的导入是**活的引用（Live Binding）**，即导入的变量始终指向导出模块的当前值。

```javascript
// a.mjs (ESM)
import { done as bDone } from './b.mjs';
console.log('a starting');
export let done = false;
console.log('in a, b.done =', bDone);  // 取决于 b 是否已执行到此处
done = true;
console.log('a done');

// b.mjs (ESM)
import { done as aDone } from './a.mjs';
console.log('b starting');
export let done = false;
console.log('in b, a.done =', aDone);  // 取决于 a 是否已执行到此处
done = true;
console.log('b done');
```

关键区别：

1. CommonJS 返回值的快照，ESM 返回活的引用。
2. CommonJS 的循环依赖可能导致部分初始化的值被使用，ESM 通过 TDZ（Temporal Dead Zone）在访问未初始化的 `let`/`const` 导出时抛出 `ReferenceError`，更早暴露问题。
3. ESM 的静态性使得循环依赖在编译时可检测，而 CommonJS 的动态 `require` 使得循环依赖只能在运行时发现。

### 推导二：Tree-shaking 的正确性条件

**定理**：ES 模块的 Tree-shaking 在满足以下条件时是安全的（不改变程序语义）：

1. 模块无副作用（Side-Effect-Free）。
2. 被删除的导出未被任何模块导入。
3. 导出符号的引用是透明的（无 `Proxy`、`Object.defineProperty` 等元编程干扰）。

**证明**：

设模块 $m$ 导出符号集合 $E_m$，其中未使用的导出集合为 $U_m \subseteq E_m$。Tree-shaking 删除 $U_m$ 的导出代码。

对于条件 1（无副作用）：模块 $m$ 的顶层语句除导出外不产生可观察效果（如修改全局变量、写入文件、发起网络请求）。删除 $U_m$ 不影响其他模块的行为。

对于条件 2（未使用）：$U_m$ 中的符号未被任何 $\iota(m', \sigma)$ 导入，因此删除不影响其他模块。

对于条件 3（透明引用）：符号的访问是普通属性访问，无 getter/setter 副作用，删除导出声明不影响属性访问语义。

`package.json` 的 `"sideEffects": false` 字段是开发者向构建工具声明条件 1 成立的契约。若声明错误（实际有副作用），Tree-shaking 会破坏程序语义。

### 推导三：模块解析的终止性

**定理**：在无循环依赖的前提下，模块解析算法必然终止。

**证明**：

模块解析算法沿依赖图 $\delta$ 进行深度优先遍历。定义已解析模块集合 $V$，初始为空。

对于模块 $m$，解析其依赖 $m_1, m_2, \dots, m_k$：

- 若 $m_i \in V$，跳过（已解析）。
- 若 $m_i \notin V$，加入 $V$ 并递归解析。

由于依赖图无环（无循环依赖），且 $M$ 是有限集合，算法必然在有限步内遍历完所有可达模块，终止。

若存在循环依赖（$m_1 \to m_2 \to \dots \to m_1$），算法需要特殊处理（如标记"正在解析"状态），否则可能无限递归。ESM 与 CommonJS 的运行时通过模块缓存（Module Cache）处理循环依赖，避免无限递归。

### 推导四：声明合并与命名空间的代数结构

**定理**：同名命名空间的多次声明在合并操作下构成幺半群。

**证明**：

定义命名空间合并操作 $\oplus$：

$$
N_1 \oplus N_2 = \text{namespace } N \{ \text{members}(N_1) \cup \text{members}(N_2) \}
$$

其中同名成员按接口声明合并规则处理。

满足结合律：

$$
(N_1 \oplus N_2) \oplus N_3 = N_1 \oplus (N_2 \oplus N_3)
$$

存在单位元 $\epsilon$（空命名空间）：

$$
N \oplus \epsilon = N = \epsilon \oplus N
$$

因此 $(\text{Namespace}, \oplus, \epsilon)$ 构成幺半群。这一性质保证了命名空间可以分散在多个文件中声明并自动合并，是大型项目组织代码的数学基础。

## 代码示例

### 示例 1：ES 模块基础

```typescript
// math.ts - 导出多个符号
export const PI = 3.141592653589793;

export function add(a: number, b: number): number {
  return a + b;
}

export function multiply(a: number, b: number): number {
  return a * b;
}

// 默认导出：每个模块只能有一个
export default class Calculator {
  static add = add;
  static multiply = multiply;
}

// main.ts - 导入符号
import Calculator, { PI, add } from './math';

console.log(PI);                    // 3.14159...
console.log(add(2, 3));             // 5
console.log(Calculator.multiply(4, 5)); // 20

// 导入时重命名
import { add as plus } from './math';
plus(1, 2); // 3

// 导入整个模块作为命名空间
import * as Math from './math';
Math.add(1, 2); // 3
```

### 示例 2：命名空间基础

```typescript
// 命名空间：通过对象嵌套组织代码
namespace Geometry {
  // export 关键字使接口外部可见
  export interface Point {
    x: number;
    y: number;
  }

  // 未导出的接口仅在命名空间内可见
  interface InternalShape {
    type: string;
  }

  export function distance(a: Point, b: Point): number {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  // 嵌套命名空间
  export namespace Shapes {
    export class Circle {
      constructor(public center: Point, public radius: number) {}

      area(): number {
        return Math.PI * this.radius ** 2;
      }
    }

    export class Rectangle {
      constructor(
        public topLeft: Point,
        public width: number,
        public height: number
      ) {}

      area(): number {
        return this.width * this.height;
      }
    }
  }
}

// 使用
const p1: Geometry.Point = { x: 0, y: 0 };
const p2: Geometry.Point = { x: 3, y: 4 };
console.log(Geometry.distance(p1, p2)); // 5

const circle = new Geometry.Shapes.Circle(p1, 5);
console.log(circle.area()); // 78.54...

// 命名空间可以跨文件拆分，使用 reference 引用
// file1.ts
namespace App {
  export function init() {
    console.log('App initialized');
  }
}

// file2.ts
/// <reference path="file1.ts" />
namespace App {
  export function run() {
    init(); // 可访问 file1.ts 中的 init
  }
}
```

### 示例 3：模块解析策略

```jsonc
// tsconfig.json - 不同的模块解析策略
{
  "compilerOptions": {
    // Classic: 适用于旧项目，不推荐
    // "moduleResolution": "classic"

    // Node: 适用于 CommonJS 项目，TypeScript 默认
    // 解析逻辑与 Node.js 的 require 一致
    "moduleResolution": "node"

    // Node16/Nodenext: 适用于 Node.js 12+ 的 ESM 项目
    // 严格区分 .mjs 与 .cjs，支持 package.json 的 exports 字段
    // "moduleResolution": "nodenext"

    // Bundler: 适用于 Webpack/Vite 等构建工具
    // 允许 import 不带扩展名，支持 package.json exports
    // "moduleResolution": "bundler"
  }
}

// paths 别名：简化长路径导入
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@utils/*": ["src/utils/*"]
    }
  }
}

// 使用别名导入
import { Button } from '@components/Button';
import { formatDate } from '@utils/date';
```

### 示例 4：声明文件（.d.ts）

```typescript
// global.d.ts - 为 JavaScript 库提供类型声明

// 声明全局变量
declare const APP_VERSION: string;
declare const __DEV__: boolean;

// 声明全局函数
declare function gtag(...args: any[]): void;

// 声明全局对象
declare global {
  interface Window {
    analytics: {
      track(event: string, properties?: Record<string, unknown>): void;
      identify(userId: string, traits?: Record<string, unknown>): void;
    };
  }

  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test';
      DATABASE_URL: string;
      JWT_SECRET: string;
    }
  }
}

// 为无类型的 npm 包声明模块
declare module 'untyped-library' {
  export function doSomething(input: string): number;
  export const version: string;
}

// 为 CSS/JSON 等非 JS 资源声明模块
declare module '*.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module '*.svg' {
  const content: string;
  export default content;
}

declare module '*.json' {
  const value: unknown;
  export default value;
}
```

### 示例 5：动态导入

```typescript
// 动态导入：按需加载模块，返回 Promise
async function loadHeavyModule() {
  // 动态导入返回 Promise<Module>
  const heavyModule = await import('./heavy-module');
  return heavyModule.processLargeData;
}

// 使用场景：路由级代码分割
async function router(path: string) {
  switch (path) {
    case '/dashboard':
      const { renderDashboard } = await import('./pages/Dashboard');
      return renderDashboard();
    case '/settings':
      const { renderSettings } = await import('./pages/Settings');
      return renderSettings();
    default:
      const { render404 } = await import('./pages/NotFound');
      return render404();
  }
}

// 条件加载：根据环境加载不同实现
async function getDatabase() {
  if (process.env.NODE_ENV === 'production') {
    return await import('./db/production');
  } else {
    return await import('./db/mock');
  }
}

// 动态导入的类型推导
interface DatabaseModule {
  connect(): Promise<Connection>;
  disconnect(): Promise<void>;
}

// 显式类型注解
const dbModule: Promise<typeof import('./db/production')> = import('./db/production');
```

### 示例 6：模块导出的多种形式

```typescript
// utils.ts

// 1. 命名导出
export const formatDate = (date: Date): string => date.toISOString();
export const parseDate = (str: string): Date => new Date(str);

// 2. 命名导出（声明后导出）
function helper(): void { /* ... */ }
export { helper };

// 3. 重命名导出
export { helper as internalHelper };

// 4. 聚合导出（Barrel File）
// index.ts
export { formatDate, parseDate } from './utils';
export { Button } from './Button';
export * from './types';

// 5. 类型导出
export type ID = string;
export interface User {
  id: ID;
  name: string;
}

// 6. 默认导出
export default class Logger {
  log(message: string) {
    console.log(message);
  }
}

// 7. 默认导出（表达式）
export default 'This is the default export';

// 8. 混合导出
export const version = '1.0.0';
export function getVersion() { return version; }
export default class App { /* ... */ }
```

### 示例 7：命名空间与模块的混用

```typescript
// 不推荐：命名空间与模块混用
// 但在特定场景下仍有价值

// types.ts - 使用命名空间组织类型
export namespace API {
  export interface User {
    id: string;
    name: string;
  }

  export interface Post {
    id: string;
    title: string;
    author: User;
  }

  export type Response<T> = {
    data: T;
    status: 'success' | 'error';
    message?: string;
  };
}

// 使用
import { API } from './types';

async function fetchUser(id: string): Promise<API.Response<API.User>> {
  const res = await fetch(`/api/users/${id}`);
  return res.json();
}

// 命名空间用于扩展全局类型
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'web-component': { prop: string };
    }
  }
}
```

### 示例 8：CommonJS 与 ESM 互操作

```typescript
// package.json - 双格式发布
{
  "name": "my-library",
  "main": "./dist/index.cjs",      // CommonJS 入口
  "module": "./dist/index.mjs",    // ESM 入口（构建工具识别）
  "types": "./dist/index.d.ts",    // 类型声明
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
  "sideEffects": false  // 声明无副作用，启用 Tree-shaking
}

// index.ts - 源代码使用 ESM
export function add(a: number, b: number): number {
  return a + b;
}

export default class Calculator {
  static add = add;
}

// 使用 tsconfig.json 配置多格式输出
// tsconfig.cjs.json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "CommonJS",
    "outDir": "./dist",
    "declaration": true
  }
}

// tsconfig.esm.json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "Node",
    "outDir": "./dist",
    "declaration": true
  }
}
```

### 示例 9：模块声明合并扩展

```typescript
// 扩展 Express 的 Request 类型
// types/express.d.ts
import { Request } from 'express';

declare module 'express' {
  interface Request {
    user?: {
      id: string;
      username: string;
      role: 'admin' | 'user';
    };
    traceId?: string;
  }
}

// 扩展 Vue 的 ComponentCustomProperties
// types/vue.d.ts
import { ComponentCustomProperties } from 'vue';

declare module 'vue' {
  interface ComponentCustomProperties {
    $API: typeof import('./api');
    $format: typeof import('./utils/format');
  }
}

// 扩展 Jest 的 Matchers
// types/jest.d.ts
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeWithinRange(floor: number, ceiling: number): R;
      toBeValidEmail(): R;
    }
  }
}

// 使用
expect('test@example.com').toBeValidEmail();
expect(5).toBeWithinRange(1, 10);
```

### 示例 10：模块解析路径

```typescript
// 项目结构
// project/
// ├── src/
// │   ├── components/
// │   │   ├── Button.ts
// │   │   └── Input.ts
// │   ├── utils/
// │   │   └── date.ts
// │   └── index.ts
// ├── node_modules/
// │   └── lodash/
// └── tsconfig.json

// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",                    // 基础路径
    "paths": {
      "@/*": ["src/*"],                // 绝对别名
      "@components": ["src/components"], // 目录别名
      "@components/*": ["src/components/*"],
      "lodash": ["node_modules/lodash"] // 重定向
    }
  }
}

// src/index.ts
// 相对路径导入
import { Button } from './components/Button';

// 别名导入
import { Button } from '@/components/Button';
import { Button } from '@components/Button';
import { formatDate } from '@/utils/date';

// 裸导入（从 node_modules 解析）
import _ from 'lodash';
```

### 示例 11：Tree-shaking 友好的导出

```typescript
// 反模式：整体导出，阻碍 Tree-shaking
// utils.ts
export default {
  add,
  subtract,
  multiply,
  divide,
};

// 使用方
import utils from './utils';
utils.add(1, 2);  // 构建工具无法确定哪些函数被使用，全部打包

// 正确模式：命名导出，便于 Tree-shaking
export function add(a: number, b: number) { return a + b; }
export function subtract(a: number, b: number) { return a - b; }
export function multiply(a: number, b: number) { return a * b; }
export function divide(a: number, b: number) { return a / b; }

// 使用方
import { add } from './utils';
add(1, 2);  // 构建工具可识别仅 add 被使用，其余函数被 Tree-shake

// 副作用标记
// package.json
{
  "sideEffects": false  // 声明所有模块无副作用
}

// 或精确标记有副作用的文件
{
  "sideEffects": [
    "./src/polyfills.ts",
    "*.css"
  ]
}
```

### 示例 12：循环依赖处理

```typescript
// 循环依赖示例：a.ts 与 b.ts 互相导入

// a.ts
import { bFunction } from './b';

export function aFunction(): string {
  return 'a-' + bFunction();
}

// b.ts
import { aFunction } from './a';

export function bFunction(): string {
  return 'b';
}

export function callA(): string {
  return aFunction();  // 循环调用
}

// 解决方案 1：提取共享逻辑到独立模块
// shared.ts
export function sharedLogic(): string {
  return 'shared';
}

// a.ts
import { sharedLogic } from './shared';
export function aFunction(): string {
  return 'a-' + sharedLogic();
}

// b.ts
import { sharedLogic } from './shared';
export function bFunction(): string {
  return 'b-' + sharedLogic();
}

// 解决方案 2：使用依赖注入
// a.ts
export function createA(bDep: { bFunction: () => string }) {
  return {
    aFunction: () => 'a-' + bDep.bFunction(),
  };
}

// b.ts
import { createA } from './a';
export const b = {
  bFunction: () => 'b',
};
export const a = createA(b);
```

## 对比分析

### 命名空间 vs 模块

| 维度 | 命名空间（Namespace） | 模块（Module） |
|---|---|---|
| **语法** | `namespace N { ... }` | `export` / `import` |
| **作用域** | 全局（编译后为全局对象） | 文件级（每文件一模块） |
| **依赖管理** | 手动管理（`<reference>`） | 显式声明（`import`） |
| **加载方式** | 全部加载 | 按需加载（动态 `import()`） |
| **Tree-shaking** | 不支持 | 支持 |
| **循环依赖** | 不易处理 | 有明确语义 |
| **工具支持** | 有限 | 完善（ESLint、Prettier 等） |
| **未来趋势** | 逐步淘汰 | 主流 |
| **适用场景** | 扩展全局类型、向后兼容 | 所有新项目 |

### 模块解析策略对比

| 策略 | 适用场景 | 扩展名要求 | package.json exports | Node.js ESM |
|---|---|---|---|---|
| **Classic** | 旧项目 | 不需要 | 不支持 | 不支持 |
| **Node** | CommonJS 项目 | 不需要 | 部分支持 | 不支持 |
| **Node16** | Node.js 12+ ESM | 需要 | 支持 | 支持 |
| **Nodenext** | Node.js 未来版本 | 需要 | 支持 | 支持 |
| **Bundler** | Webpack/Vite | 不需要 | 支持 | 不适用 |

### CommonJS vs ES Modules

| 维度 | CommonJS | ES Modules |
|---|---|---|
| **语法** | `require` / `module.exports` | `import` / `export` |
| **加载方式** | 同步 | 异步 |
| **静态性** | 动态 | 静态 |
| **Tree-shaking** | 不支持 | 支持 |
| **循环依赖** | 返回快照 | 活的引用 |
| **Top-level await** | 不支持 | 支持 |
| **`this` 语义** | `module.exports` | `undefined` |
| **`__dirname`/`__filename`** | 可用 | 不可用（需 `import.meta.url`） |
| **浏览器支持** | 不支持 | 原生支持 |

### 声明文件发布方式

| 方式 | 描述 | 优点 | 缺点 |
|---|---|---|---|
| **打包在包内** | `types` 字段指向 `.d.ts` | 简单 | 仅支持单一类型 |
| **@types 仓库** | DefinitelyTyped 维护 | 社区维护 | 更新滞后 |
| **联合包** | 同一包含 JS 与 `.d.ts` | 用户体验好 | 维护两份代码 |
| **源码发布** | 直接发布 `.ts` | 最准确 | 需要构建工具支持 |

## 常见陷阱与反模式

### 陷阱 1：在新项目中使用命名空间（生产事故案例）

**场景**：2020 年某团队在新项目中沿用命名空间组织代码，导致 Tree-shaking 失效，Bundle 体积膨胀至 5MB（本应 800KB），首屏加载时间从 1.2s 增加到 4.8s，移动端用户流失率上升 15%。

```typescript
// 反模式：在新项目中使用命名空间
namespace App {
  export namespace Pages {
    export class HomePage { /* 1000 行代码 */ }
    export class AboutPage { /* 800 行代码 */ }
    export class ContactPage { /* 600 行代码 */ }
  }
}

// 即使只使用 HomePage，构建工具也无法 Tree-shake 其他页面
import { App } from './app';
new App.Pages.HomePage(); // 全部代码被打包

// 正确模式：使用 ES 模块
// pages/HomePage.ts
export class HomePage { /* 1000 行代码 */ }

// 使用
import { HomePage } from './pages/HomePage';
// 构建工具可 Tree-shake 未使用的 AboutPage、ContactPage
```

### 陷阱 2：模块解析失败

```typescript
// 反模式：导入路径错误
import { Button } from 'components/Button';  // 缺少 @ 别名
import { utils } from './utils';  // utils 是目录，需指定文件或 index

// 正确模式
import { Button } from '@/components/Button';  // 使用配置的别名
import { utils } from './utils/index';  // 显式指定 index
// 或确保 utils 目录有 index.ts
```

### 陷阱 3：循环依赖导致的运行时错误

```typescript
// 反模式：未处理的循环依赖
// a.ts
import { b } from './b';
export const a = () => b() + 1;

// b.ts
import { a } from './a';
export const b = () => a() + 1;  // 循环：a 调用 b，b 调用 a

// 调用 a() 会导致栈溢出

// 正确模式：重构，打破循环
// shared.ts
export const baseValue = 1;

// a.ts
import { baseValue } from './shared';
export const a = () => baseValue + 1;

// b.ts
import { baseValue } from './shared';
export const b = () => baseValue + 1;
```

### 陷阱 4：声明文件路径错误

```typescript
// 反模式：声明文件未被识别
// types/custom.d.ts
declare module 'custom-lib' {
  export function foo(): void;
}

// tsconfig.json 未包含 types 目录
{
  "include": ["src/**/*"]  // 缺少 "types/**/*"
}

// 正确模式：确保声明文件在 include 范围内
{
  "include": ["src/**/*", "types/**/*", "*.d.ts"]
}
```

### 陷阱 5：默认导出与命名导出混淆

```typescript
// 反模式：导入方式与导出方式不匹配
// utils.ts
export default function add(a: number, b: number) { return a + b; }

// main.ts
import { add } from './utils';  // 错误：add 是默认导出，不是命名导出

// 正确模式
import add from './utils';  // 默认导入
// 或修改导出为命名导出
export function add(a: number, b: number) { return a + b; }
import { add } from './utils';  // 命名导入
```

### 陷阱 6：动态导入的类型丢失

```typescript
// 反模式：动态导入后类型为 any
const module = await import('./heavy');
module.someFunction();  // 无类型提示

// 正确模式：确保被导入模块有类型导出
// heavy.ts
export function someFunction(input: string): number {
  return input.length;
}

// 动态导入会自动推导类型
const heavyModule = await import('./heavy');
heavyModule.someFunction('hello');  // 类型安全，返回 number
```

### 陷阱 7：sideEffects 标记错误

```typescript
// 反模式：错误声明无副作用
// package.json
{
  "sideEffects": false
}

// 但 polyfill.ts 实际有副作用
// polyfill.ts
Array.prototype.customMethod = function () { /* ... */ };

// 构建工具会 Tree-shake polyfill.ts，导致 customMethod 丢失

// 正确模式：精确标记有副作用的文件
{
  "sideEffects": [
    "./src/polyfills.ts",
    "*.css"
  ]
}
```

### 陷阱 8：CommonJS 与 ESM 混用的 interop 问题

```typescript
// 反模式：在 ESM 项目中直接导入 CommonJS 模块
// main.mjs
import _ from 'lodash';  // 行为可能不一致

// 正确模式：使用 interop 工具或配置
// tsconfig.json
{
  "compilerOptions": {
    "esModuleInterop": true,  // 启用 interop
    "allowSyntheticDefaultImports": true
  }
}

// 或使用 namespace import
import * as _ from 'lodash';
```

## 工程实践

### 实践一：项目模块组织规范

```
src/
├── components/           # 通用组件
│   ├── Button/
│   │   ├── Button.tsx
│   │   ├── Button.test.tsx
│   │   ├── Button.types.ts
│   │   └── index.ts     # Barrel file
│   └── index.ts         # 组件统一导出
├── hooks/               # 自定义 Hooks
│   ├── useAuth.ts
│   └── index.ts
├── pages/               # 页面组件
│   ├── Home/
│   └── About/
├── services/            # API 服务
│   ├── api.ts
│   └── auth.ts
├── utils/               # 工具函数
│   ├── date.ts
│   ├── format.ts
│   └── index.ts
├── types/               # 类型定义
│   ├── global.d.ts
│   └── api.d.ts
├── App.tsx
└── index.tsx
```

**规范**：

1. **每个目录配 `index.ts`**：作为 Barrel file，统一导出，简化导入路径。
2. **组件目录化**：复杂组件单独建目录，包含组件、测试、类型。
3. **类型与逻辑分离**：`.types.ts` 文件专门存放类型定义。
4. **避免深层嵌套**：目录层级不超过 4 层，否则使用别名。

### 实践二：tsconfig.json 配置

```jsonc
{
  "compilerOptions": {
    "target": "ES2022",              // 编译目标
    "module": "ESNext",              // 模块格式
    "moduleResolution": "Bundler",   // 解析策略（适用于构建工具）

    "baseUrl": ".",                  // 路径别名基础路径
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@utils/*": ["src/utils/*"],
      "@hooks/*": ["src/hooks/*"],
      "@services/*": ["src/services/*"]
    },

    "declaration": true,             // 生成 .d.ts
    "declarationMap": true,          // 生成 .d.ts.map
    "sourceMap": true,               // 生成 .js.map

    "esModuleInterop": true,         // CJS/ESM 互操作
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,

    "strict": true,                  // 严格模式
    "skipLibCheck": true,            // 跳过库类型检查（提升速度）
    "resolveJsonModule": true,       // 允许导入 JSON

    "isolatedModules": true,         // 隔离模块（兼容 esbuild）
    "verbatimModuleSyntax": true     // 严格区分 type/value 导入
  },
  "include": ["src/**/*", "types/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 实践三：发布 TypeScript 库

```jsonc
// package.json
{
  "name": "my-library",
  "version": "1.0.0",
  "description": "A TypeScript library",

  // 入口配置
  "main": "./dist/index.cjs",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",

  // 现代导出配置
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

  // 声明无副作用
  "sideEffects": false,

  // 指定支持的 Node.js 版本
  "engines": {
    "node": ">=14.0.0"
  },

  // 文件包含
  "files": [
    "dist",
    "README.md"
  ]
}
```

### 实践四：模块性能优化

```typescript
// 1. 动态导入：按需加载
const AdminPanel = React.lazy(() => import('./pages/AdminPanel'));

// 2. 代码分割：路由级
import { BrowserRouter, Route } from 'react-router-dom';

<BrowserRouter>
  <Route path="/" element={<Home />} />
  <Route path="/admin" element={<React.Suspense><AdminPanel /></React.Suspense>} />
</BrowserRouter>

// 3. Barrel file 优化：避免循环依赖
// utils/index.ts
export * from './date';
export * from './format';
export * from './math';

// 4. 类型导入优化：使用 import type
import type { User, Post } from './types';  // 仅类型，编译后删除
import { fetchUser } from './api';          // 值导入

// 5. 避免默认导出：便于重构与自动导入
// 反模式
export default class Button { }
import MyButton from './Button';  // 导入名可变，易出错

// 正确模式
export class Button { }
import { Button } from './Button';  // 导入名固定
```

## 案例研究

### 案例一：从命名空间迁移到模块

**背景**：某遗留项目使用命名空间组织代码，迁移到 ES 模块以支持 Tree-shaking。

```typescript
// 迁移前：命名空间
namespace App {
  export namespace Services {
    export class AuthService {
      login(user: string, pass: string) { /* ... */ }
    }
    export class DataService {
      fetch(url: string) { /* ... */ }
    }
  }

  export namespace Components {
    export class HeaderComponent { /* ... */ }
  }
}

// 迁移后：ES 模块
// services/AuthService.ts
export class AuthService {
  login(user: string, pass: string) { /* ... */ }
}

// services/DataService.ts
export class DataService {
  fetch(url: string) { /* ... */ }
}

// services/index.ts
export { AuthService } from './AuthService';
export { DataService } from './DataService';

// components/HeaderComponent.ts
export class HeaderComponent { /* ... */ }

// 使用
import { AuthService } from './services';
const auth = new AuthService();
auth.login('user', 'pass');
```

**迁移步骤**：

1. 为每个命名空间成员创建独立文件。
2. 将 `namespace` 关键字替换为 `export`。
3. 在使用处添加 `import` 语句。
4. 删除原命名空间文件。
5. 配置 `tsconfig.json` 的 `module: "ESNext"`。
6. 更新构建工具配置（Webpack/Vite）。

### 案例二：多格式库发布

**背景**：发布一个同时支持 CommonJS 与 ESM 的 TypeScript 库。

```typescript
// src/index.ts - 源代码使用 ESM
export function add(a: number, b: number): number {
  return a + b;
}

export default class Calculator {
  static add = add;
}

// 配置 tsup（基于 esbuild）构建多格式
// tsup.config.ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],           // 输出 CommonJS 与 ESM
  dts: true,                         // 生成类型声明
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,                   // 启用 Tree-shaking
});

// package.json
{
  "name": "my-lib",
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
  "sideEffects": false
}
```

### 案例三：大型项目的模块别名配置

**背景**：大型 monorepo 项目，使用路径别名简化导入。

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      // 应用别名
      "@app/*": ["apps/web/src/*"],
      "@admin/*": ["apps/admin/src/*"],

      // 包别名（monorepo）
      "@myorg/ui": ["packages/ui/src"],
      "@myorg/ui/*": ["packages/ui/src/*"],
      "@myorg/utils": ["packages/utils/src"],
      "@myorg/utils/*": ["packages/utils/src/*"],

      // 通用别名
      "@components/*": ["apps/web/src/components/*"],
      "@hooks/*": ["apps/web/src/hooks/*"],
      "@pages/*": ["apps/web/src/pages/*"],
      "@services/*": ["apps/web/src/services/*"],
      "@utils/*": ["apps/web/src/utils/*"],
      "@types/*": ["apps/web/src/types/*"],
      "@assets/*": ["apps/web/src/assets/*"]
    }
  }
}

// 使用
import { Button } from '@myorg/ui';
import { formatDate } from '@myorg/utils';
import { useAuth } from '@hooks/useAuth';
import { HomePage } from '@pages/HomePage';
```

### 案例四：TypeScript 库的类型声明发布

**背景**：为一个 JavaScript 库编写高质量的类型声明文件。

```typescript
// my-lib.d.ts - 完整的类型声明

// 类型定义
export type ID = string;
export type Timestamp = number;

export interface User {
  id: ID;
  name: string;
  email: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  password?: string;
}

// 函数声明
export function createUser(input: CreateUserInput): Promise<User>;
export function getUser(id: ID): Promise<User | null>;
export function updateUser(id: ID, input: UpdateUserInput): Promise<User>;
export function deleteUser(id: ID): Promise<void>;

// 类声明
export class UserAPI {
  constructor(baseUrl: string);
  create(input: CreateUserInput): Promise<User>;
  get(id: ID): Promise<User | null>;
  update(id: ID, input: UpdateUserInput): Promise<User>;
  delete(id: ID): Promise<void>;
}

// 默认导出
declare const myLib: {
  UserAPI: typeof UserAPI;
  createUser: typeof createUser;
  getUser: typeof getUser;
  updateUser: typeof updateUser;
  deleteUser: typeof deleteUser;
};

export default myLib;

// package.json
{
  "name": "my-lib",
  "types": "./my-lib.d.ts"
}
```

## 习题

### 基础题

1. **概念理解**：解释命名空间与模块的根本区别，说明为何 TypeScript 官方推荐在新项目中使用模块而非命名空间。

2. **模块解析**：给定以下 `tsconfig.json`，描述 TypeScript 如何解析 `import { Button } from '@components/Button'`：
   ```json
   {
     "compilerOptions": {
       "baseUrl": ".",
       "paths": { "@components/*": ["src/components/*"] },
       "moduleResolution": "node"
     }
   }
   ```

3. **声明文件**：为以下 JavaScript 函数编写 TypeScript 声明文件：
   ```javascript
   function formatDate(date, format) {
     // 格式化日期
   }
   formatDate.patterns = {
     ISO: 'YYYY-MM-DD',
     US: 'MM/DD/YYYY'
   };
   module.exports = formatDate;
   ```

4. **导出导入**：写出以下模块的所有合法导入方式：
   ```typescript
   // math.ts
   export const PI = 3.14;
   export function add(a, b) { return a + b; }
   export default class Calculator {}
   ```

### 进阶题

5. **循环依赖**：分析以下代码的执行顺序，说明 CommonJS 与 ESM 下的输出差异：
   ```typescript
   // a.ts
   import { b } from './b';
   export const a = 1;
   console.log('a', b);

   // b.ts
   import { a } from './a';
   export const b = 2;
   console.log('b', a);
   ```

6. **模块解析策略**：对比 `node`、`node16`、`bundler` 三种解析策略在以下场景的行为：
   - 导入 `'./utils'`（无扩展名）
   - 导入 `'lodash'`（裸导入）
   - 导入 `'#internal'`（package.json subpath imports）

7. **Tree-shaking**：分析以下代码在 Webpack 5 与 Rollup 中的 Tree-shaking 行为：
   ```typescript
   // utils.ts
   export function add(a, b) { return a + b; }
   export function unused() { console.log('not used'); }
   export default { add, unused };

   // main.ts
   import utils from './utils';
   utils.add(1, 2);
   ```

8. **双格式发布**：配置一个 TypeScript 库，使其同时发布 CommonJS 与 ESM 格式，要求：
   - `package.json` 的 `exports` 字段正确
   - 类型声明文件可用
   - 支持 Tree-shaking
   - 通过 tsup 构建多格式

### 挑战题

9. **大型项目模块设计**：为一个 monorepo（包含 web、admin、mobile 三个应用，共享 ui、utils、api 三个包）设计模块结构，要求：
   - 路径别名配置清晰
   - 避免循环依赖
   - 支持 Tree-shaking
   - 各应用可独立部署

10. **库的完整发布**：从零开始发布一个 TypeScript 库，要求：
    - 源代码使用 ESM
    - 发布 CommonJS + ESM + 类型声明
    - `package.json` 的 `exports` 完整
    - 支持路径子导入（如 `my-lib/utils`）
    - 通过 `sideEffects` 声明
    - 文档与示例完整

11. **模块解析算法**：实现一个简化的 TypeScript 模块解析算法，要求：
    - 支持 `node` 与 `bundler` 策略
    - 处理 `paths` 别名
    - 处理 `package.json` 的 `exports` 字段
    - 检测循环依赖
    - 返回解析路径或错误

## 参考文献

1. Ecma International. (2015). *ECMAScript 2015 Language Specification: Modules*. ECMA-262, 6th Edition. https://262.ecma-international.org/6.0/

2. Ecma International. (2024). *ECMAScript 2024 Language Specification: Modules*. ECMA-262, 15th Edition. https://262.ecma-international.org/15.0/

3. Microsoft. (2024). *TypeScript Handbook: Modules*. https://www.typescriptlang.org/docs/handbook/modules.html

4. Microsoft. (2024). *TypeScript Handbook: Namespaces*. https://www.typescriptlang.org/docs/handbook/namespaces.html

5. Microsoft. (2024). *TypeScript Handbook: Module Resolution*. https://www.typescriptlang.org/docs/handbook/module-resolution.html

6. Microsoft. (2024). *TypeScript Handbook: Declaration Files*. https://www.typescriptlang.org/docs/handbook/declaration-files/introduction.html

7. CommonJS Organization. (2009). *CommonJS Modules Specification 1.1.1*. https://wiki.commonjs.org/wiki/Modules/1.1.1

8. Miller, J. (2014). *Asynchronous Module Definition (AMD) Specification*. https://github.com/amdjs/amdjs-api/blob/master/AMD.md

9. Node.js Foundation. (2024). *Node.js Documentation: Packages*. https://nodejs.org/api/packages.html

10. Webpack Contributors. (2024). *Webpack Documentation: Tree Shaking*. https://webpack.js.org/guides/tree-shaking/

11. Bierman, G., Abadi, M., & Torgersen, M. (2014). *Understanding TypeScript*. Proceedings of the 28th European Conference on Object-Oriented Programming (ECOOP '14), 257-281. https://doi.org/10.1007/978-3-662-44202-9_11

12. Watt, C. (2023). *ESM in Node.js: A complete guide*. Node.js Documentation. https://nodejs.org/api/esm.html

## 延伸阅读

- **TypeScript Deep Dive: Modules**：https://basarat.gitbook.io/typescript/project/modules — 深入讲解 TypeScript 模块系统。
- **Node.js ESM Documentation**：https://nodejs.org/api/esm.html — Node.js 官方 ESM 文档，包含互操作细节。
- **Webpack Tree Shaking Guide**：https://webpack.js.org/guides/tree-shaking — Webpack 的 Tree-shaking 实现原理。
- **Rollup Documentation**：https://rollupjs.org/guide/en — Rollup 的模块打包原理，ESM 优先。
- **tsup**：https://tsup.egoist.dev — 基于 esbuild 的零配置 TypeScript 构建工具，支持多格式。
- **unbuild**：https://github.com/unjs/unbuild — 另一个流行的 TypeScript 库构建工具。
- *JavaScript: The Definitive Guide*（David Flanagan 著）：第 13 章深入讲解 JavaScript 模块系统。
- *Exploring ES6*（Axel Rauschmayer 著）：https://exploringjs.com/es6/ch_modules.html — ESM 的完整指南。
- *You Don't Know JS: ES6 & Beyond*（Kyle Simpson 著）：第 3 章讲解模块系统的演进。
- **DefinitelyTyped**：https://github.com/DefinitelyTyped/DefinitelyTyped — 社区维护的 TypeScript 类型声明仓库，学习声明文件的最佳实践。
