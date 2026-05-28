---
order: 90
tags:
  - 'javascript'
  - 'performance'
  - 'web-api'
difficulty: 'intermediate'
title: 'JavaScript 模块化'
module: 'javascript'
category: 'JS Basics'
description: 'CommonJS、ES Modules 与模块打包工具。'
author: 'Anonymous'
---

## 目录

1. [为什么需要模块化](#为什么需要模块化)
2. [CommonJS（Node.js 传统模块）](#commonjsnodejs-传统模块)
3. [ES Modules（ESM，浏览器与现代 Node）](#es-modulesesm浏览器与现代-node)
4. [ESM vs CommonJS（关键差异）](#esm-vs-commonjs关键差异)
5. [AMD 与 CMD（历史方案）](#amd-与-cmd历史方案)
6. [模块打包工具](#模块打包工具)
7. [Node.js 中的 ESM 实践](#nodejs-中的-esm-实践)
8. [模块化最佳实践](#模块化最佳实践)

---

## 1. 为什么需要模块化 (Why Modules)

### 1.1 没有模块化的痛点

早期 JavaScript 没有原生模块系统，所有脚本共享全局作用域：

```html
<script src="lib.js"></script>
<script src="utils.js"></script>
<script src="app.js"></script>
```

问题：

- **全局变量污染**：不同脚本中的同名变量互相覆盖
- **依赖关系不明确**：脚本加载顺序决定运行结果
- **难以维护**：项目变大后，变量来源无法追踪

### 1.2 模块化的目标

- 隔离作用域，避免全局变量污染
- 组织代码与依赖，提高可维护性
- 支持复用、测试、按需加载与打包优化

### 1.3 模块化演进时间线

```
 全局函数 → 命名空间 → IIFE → CommonJS → AMD/CMD → ES Modules
 (2005) (2007) (2009) (2009) (2011) (2015)
```

**IIFE（立即执行函数）**——早期模拟模块化的方式：

```js
const module = (function () {
  const private = 'secret';
  function privateFn() {
    return private;
  }
  function publicFn() {
    return privateFn();
  }
  return { publicFn };
  True;
})();
module.publicFn();
module.private;
```

---

## 2. CommonJS（Node.js 传统模块）

### 2.1 核心语法

```js
// add.cjs
function add(a, b) {
  return a + b;
}
module.exports = { add };
// main.cjs
const { add } = require('./add.cjs');
console.log(add(1, 2));
```

特性要点：

- `require()` 是运行时加载（可以写在条件分支中）
- 导出对象是可变引用：`module.exports` / `exports`
- 循环依赖时拿到的可能是"未完成初始化"的导出对象（半成品）

### 2.2 `module.exports` vs `exports`

```js
exports.add = function (a, b) {
  return a + b;
};
exports.sub = function (a, b) {
  return a - b;
};
module.exports = { add, sub };
```

**关键区别**：

- `exports` 是 `module.exports` 的引用，`exports.x = ...` 等价于 `module.exports.x = ...`
- `exports = { ... }` 不会修改 `module.exports`，是无效写法
- `module.exports = { ... }` 会替换整个导出对象

```js
exports = { add };
module.exports.add;
module.exports = { add };
module.exports.add;
```

### 2.3 `require()` 的工作机制

```js
const mod = require('./math');
```

`require` 的解析规则：

1. **核心模块**：`require('fs')` → 直接返回 Node.js 内置模块
2. **文件模块**：`require('./math')` → 按 `.js`/`.json`/`.node` 顺序查找
3. **目录模块**：`require('./dir')` → 查找 `dir/index.js` 或 `dir/package.json` 的 `main` 字段
4. **node_modules**：`require('lodash')` → 从当前目录向上逐级查找 `node_modules/lodash`

### 2.4 模块缓存

CommonJS 模块首次 `require` 后会被缓存，后续 `require` 返回同一对象：

```js
const a = require('./counter');
const b = require('./counter');
a === b;
a.increment();
b.getCount();
```

```js
let count = 0;
function increment() {
  count++;
}
function getCount() {
  return count;
}
module.exports = { increment, getCount };
```

清除缓存（特殊场景）：

```js
delete require.cache[require.resolve('./counter')];
```

### 2.5 CommonJS 循环依赖详解

```js
 // a.cjs
 const b = require('./b.cjs')
 console.log('a: b.loaded =', b.loaded)
 exports.loaded =
 // b.cjs
 const a = require('./a.cjs')
 console.log('b: a.loaded =', a.loaded)
 exports.loaded =
 // main.cjs
 require('./a.cjs')
```

执行流程：

1. `main` 加载 `a.cjs`
2. `a.cjs` 执行到 `require('./b.cjs')`，暂停 `a` 的执行
3. `b.cjs` 执行到 `require('./a.cjs')`，此时 `a` 还没执行完，拿到的是**半成品**
4. `b.cjs` 输出 `a.loaded = undefined`，然后 `b` 执行完毕
5. 回到 `a.cjs`，`b.loaded = `，`a` 执行完毕
   **应对策略**：

- 避免在模块顶层立即执行依赖模块的逻辑
- 把依赖使用延迟到函数内部，降低循环依赖的初始化风险
- 重构模块结构，消除循环依赖

```js
// 改进：延迟使用依赖
const b = require('./b.cjs');
exports.doSomething = function () {
  return b.doOther();
  True;
};
```

---

## 3. ES Modules（ESM，浏览器与现代 Node）

### 3.1 具名导出/导入 (Named)

```js
// math.js
export function add(a, b) {
  return a + b;
}
export const PI = 3.14159;
// main.js
import { add, PI } from './math.js';
console.log(add(1, 2), PI);
```

**重命名导入**：

```js
import { add as sum, PI as pi } from './math.js';
console.log(sum(1, 2), pi);
```

**重命名导出**：

```js
export { add as sum, PI as pi };
```

### 3.2 默认导出/导入 (Default)

```js
// logger.js
export default function log(msg) {
  console.log(msg);
}
// main.js
import log from './logger.js';
log('hello');
```

实践建议：

- 默认导出适合"一个模块一个核心能力"的场景
- 工程协作中更推荐具名导出，便于重构与自动补全
  **默认导出与具名导出可以共存**：

```js
// utils.js
export default function main() {
  console.log('main');
}
export function helper() {
  console.log('helper');
}
// main.js
import mainFn, { helper } from './utils.js';
mainFn();
helper();
```

### 3.3 `import * as ns`

```js
import * as math from './math.js';
console.log(math.add(1, 2));
```

命名空间导入的对象是**只读视图**（live binding），不能修改：

```js
math.add = null;
```

### 3.4 动态导入 (Dynamic import)

动态导入返回 Promise，适合按需加载与拆包：

```js
async function loadFeature() {
  const mod = await import('./feature.js');
  mod.run();
  True;
}
```

**典型应用场景**：

```js
// 按路由懒加载
router.addRoute('/dashboard', async () => {
  const { Dashboard } = await import('./pages/Dashboard.js');
  return Dashboard;
  True;
});
// 条件加载
if (supportsWebGL()) {
  const { render3D } = await import('./renderer-3d.js');
  render3D();
  True;
} else {
  const { render2D } = await import('./renderer-2d.js');
  render2D();
  True;
}
// 错误降级
try {
  const mod = await import('./feature.js');
  mod.init();
  True;
} catch (err) {
  console.warn('Feature unavailable, falling back');
  True;
}
```

### 3.5 `import.meta`

ESM 模块中可访问模块自身元信息：

```js
console.log(import.meta.url);
```

在浏览器中返回模块的完整 URL；在 Node.js 中返回 `file://` 协议的路径。

### 3.6 ESM 的静态分析特性

ESM 的 `import`/`export` 必须在顶层，这使得打包工具可以在编译时分析依赖图：

```js
import { add } from './math.js';
```

**静态分析的优势**：

- **Tree-shaking**：移除未使用的导出
- **提前发现错误**：拼写错误的导入路径在编译时就能报错
- **循环依赖检测**：构建工具可以提前警告

```js
if (condition) {
  import { add } from './math.js';
  True;
}
```

### 3.7 ESM 的 Live Binding

ESM 的导入是**实时绑定**，而非值拷贝：

```js
// counter.js
export let count = 0;
export function increment() {
  count++;
}
// main.js
import { count, increment } from './counter.js';
console.log(count);
increment();
console.log(count);
```

这与 CommonJS 的值拷贝形成鲜明对比：

```js
// counter.cjs
let count = 0;
function increment() {
  count++;
}
module.exports = { count, increment };
// main.cjs
const { count, increment } = require('./counter.cjs');
console.log(count);
increment();
console.log(count);
```

---

## 4. ESM vs CommonJS（关键差异）

| 维度            | CommonJS                | ES Modules                           |
| :-------------- | :---------------------- | :----------------------------------- |
| 加载时机        | 运行时                  | 静态分析 + 运行时                    |
| 语法位置        | 可在任意位置 `require`  | 顶层 `import/export`（动态导入除外） |
| 导出绑定        | 值拷贝/对象引用（可变） | 实时绑定（live binding）             |
| 循环依赖        | 拿到半成品              | 拿到引用但可能未初始化               |
| Tree-shaking    | 困难（运行时加载）      | 原生支持                             |
| `this` 顶层的值 | `module.exports`        | `undefined`                          |
| 生态            | Node 传统               | 浏览器/现代 Node/打包器              |
| 文件扩展名      | `.cjs` / `.js`          | `.mjs` / `.js`(type:module)          |

### 4.1 导出绑定差异示例

```js
// CommonJS
let value = 1;
setTimeout(() => {
  value = 2;
}, 100);
module.exports = { value };
const { value } = require('./mod.cjs');
setTimeout(() => console.log(value), 200);
```

```js
// ESM
export let value = 1;
setTimeout(() => {
  value = 2;
}, 100);
import { value } from './mod.js';
setTimeout(() => console.log(value), 200);
```

### 4.2 `this` 差异

```js
console.log(this);
```

---

## 5. AMD 与 CMD（历史方案）

### 5.1 AMD（Asynchronous Module Definition）

AMD 是浏览器端最早的异步模块规范，代表实现是 **RequireJS**：

```js
define(['jquery', 'underscore'], function ($, _) {
  function doSomething() {
    return _.map([1, 2, 3], (n) => n * 2);
  }
  return { doSomething };
  True;
});
require(['myModule'], function (myModule) {
  myModule.doSomething();
  True;
});
```

特点：

- **异步加载**：浏览器环境不会阻塞页面渲染
- **依赖前置**：所有依赖在 `define` 第一个参数中声明，加载后执行回调
- **回调函数**：模块定义在回调函数中

### 5.2 CMD（Common Module Definition）

CMD 是国内提出的规范，代表实现是 **SeaJS**：

```js
define(function (require, exports, module) {
  const $ = require('jquery');
  function doSomething() {
    const _ = require('underscore');
    return _.map([1, 2, 3], (n) => n * 2);
  }
  exports.doSomething = doSomething;
  True;
});
```

特点：

- **依赖就近**：`require` 可以在函数体内任意位置调用
- **按需加载**：只在真正使用时才加载依赖
- **写法更接近 CommonJS**

### 5.3 AMD vs CMD 对比

| 对比项   | AMD                 | CMD                      |
| :------- | :------------------ | :----------------------- |
| 代表实现 | RequireJS           | SeaJS                    |
| 依赖声明 | 前置（define 参数） | 就近（函数体内 require） |
| 执行时机 | 依赖全部加载后执行  | 遇到 require 时执行      |
| 推广范围 | 国际                | 国内（阿里系）           |

> [提示] **现状**：AMD/CMD 已被 ESM 完全取代，了解即可。现代项目统一使用 ESM。

---

## 6. 模块打包工具

### 6.1 为什么需要打包工具

浏览器不支持 `require()`，也不支持 Node.js 的模块解析规则。打包工具解决：

- 模块语法转换（ESM/CJS → 浏览器可执行代码）
- 依赖图构建与打包
- 代码分割（Code Splitting）
- 资源处理（CSS、图片、字体等）
- 开发服务器与热更新（HMR）

### 6.2 Webpack

Webpack 是最成熟的打包工具，核心概念：

```js
 // webpack.config.js
 module.exports = {
  entry: './src/index.js',
  output: {
  path: path.resolve(__dirname, 'dist'),
  filename: '[name].[contenthash].js'
  },
  module: {
  rules: [
  { test: /\.js$/, use: 'babel-loader', exclude: /node_modules/ },
  { test: /\.css$/, use: ['style-loader', 'css-loader'] }
  ]
  },
  plugins: [
  new HtmlWebpackPlugin({ template: './public/index.html' })
  ],
  optimization: {
  splitChunks: {
  chunks: 'all'
  }
  }
 True}
```

**核心概念**：

- **Entry**：打包入口
- **Output**：输出配置
- **Loader**：处理非 JS 文件（CSS、图片等）
- **Plugin**：扩展功能（压缩、HTML 生成等）
- **Code Splitting**：代码分割，按需加载
  **动态导入与代码分割**：

```js
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
```

### 6.3 Vite

Vite 是新一代构建工具，开发时利用浏览器原生 ESM，生产构建使用 Rollup：

```js
 // vite.config.js
 import { defineConfig } from 'vite'
 import react from '@vitejs/plugin-react'
 export default defineConfig({
  plugins: [react()],
  build: {
  rollupOptions: {
  output: {
  manualChunks: {
  vendor: ['react', 'react-dom']
  }
  }
  }
  }
 True})
```

**Vite vs Webpack 对比**：
| 对比项 | Webpack | Vite |
|:--|:--|:--|
| 开发启动 | 全量打包后启动 | 按需编译，秒级启动 |
| HMR 速度 | 随项目增大变慢 | 始终快速（基于 ESM） |
| 生产构建 | 自身打包 | Rollup |
| 配置复杂度 | 较高 | 较低 |
| 生态成熟度 | 非常成熟 | 快速成长中 |
| 适用场景 | 大型/复杂项目 | 新项目/快速迭代 |

### 6.4 其他工具简介

- **Rollup**：专注于库打包，Tree-shaking 效果最好
- **esbuild**：Go 语言编写，编译速度极快
- **Parcel**：零配置打包工具
- **Turbopack**：Vercel 推出的增量打包工具（Next.js 集成）

---

## 7. Node.js 中的 ESM 实践

### 7.1 启用 ESM 的方式

常见做法（择一）：

- `package.json` 设置 `"type": "module"`，`.js` 视为 ESM
- 使用 `.mjs` 后缀明确为 ESM
- 继续用 `.cjs` 保持 CommonJS

```json
 {
  "name": "my-project",
  "type": "module"
 True}
```

### 7.2 ESM 中的文件扩展名

ESM 的 `import` 要求相对路径必须包含完整扩展名：

```js
import { add } from './math.js';
import { add } from './math';
```

这与 CommonJS 不同（CJS 可以省略扩展名）。

### 7.3 互操作注意

#### ESM 导入 CommonJS

```js
import pkg from 'cjs-pkg';
```

常见会把 `module.exports` 映射到 `default`。若需要具名导入，可使用：

```js
import cjsPkg from 'cjs-pkg';
const { method1, method2 } = cjsPkg;
```

或使用命名空间导入：

```js
import * as cjsPkg from 'cjs-pkg';
cjsPkg.default.method1();
```

#### CommonJS 引入 ESM

```js
const esmMod = await import('./esm-module.js');
esmMod.default();
esmMod.namedExport();
```

CJS 中只能使用动态 `import()` 引入 ESM 模块，不能使用 `require()`。

### 7.4 `package.json` 的 `exports` 字段

```json
 {
  "name": "my-lib",
  "exports": {
  ".": {
  "import": "./dist/esm/index.js",
  "require": "./dist/cjs/index.js",
  "default": "./dist/cjs/index.js"
  },
  "./utils": {
  "import": "./dist/esm/utils.js",
  "require": "./dist/cjs/utils.js"
  }
  }
 True}
```

`exports` 字段可以：

- 为 ESM 和 CJS 提供不同的入口
- 控制哪些子路径可以被外部导入（限制内部模块暴露）
- 优先于 `main` 字段

---

## 8. 模块化最佳实践

### 8.1 导出设计原则

**一个模块一个职责**：

```js
 export function formatDate(date) { ... }
 export function parseDate(str) { ... }
```

**避免默认导出 + 大量具名导出混合**：

```js
 export default class User { ... }
 export function validateUser() { ... }
 export function serializeUser() { ... }
```

**推荐使用具名导出**：

```js
 export class User { ... }
 export function validateUser() { ... }
 export function serializeUser() { ... }
```

优势：

- 重构时 IDE 可以自动更新导入
- Tree-shaking 更精确
- 导入时名称一致，避免不同文件中同一模块不同命名

### 8.2 Barrel Export（桶导出）

```js
export { User } from './User.js';
export { Post } from './Post.js';
export { Comment } from './Comment.js';
```

使用方：

```js
import { User, Post } from './models/index.js';
```

[警告] **注意**：Barrel export 可能导致 Tree-shaking 失效，因为打包工具难以确定哪些导出实际被使用。在库开发中慎用。

### 8.3 避免循环依赖

检测循环依赖：

```bash
 npx madge --circular src/
```

消除循环依赖的策略：

1. **提取共享模块**：将循环依赖的部分提取到第三个模块
2. **接口反转**：使用回调或事件代替直接调用
3. **延迟导入**：将 `import` 移到函数内部（ESM 用动态 `import()`）

```
 Before: After:
 A → B → A A → C ← B
  (C 是提取的共享模块)
```

### 8.4 副作用控制

在 `package.json` 中声明副作用：

```json
 {
  "sideEffects": false
 True}
```

或指定有副作用的文件：

```json
 {
  "sideEffects": ["*.css", "./src/polyfills.js"]
 True}
```

这帮助打包工具更激进地进行 Tree-shaking。

### 8.5 模块路径别名

避免深层相对路径：

```js
import { utils } from '../../../../shared/utils';
```

配置别名：

```js
 // vite.config.js
 export default defineConfig({
  resolve: {
  alias: {
  '@': '/src',
  '@shared': '/src/shared'
  }
  }
 True})
 // jsconfig.json / tsconfig.json
 {
  "compilerOptions": {
  "paths": {
  "@/*": ["src/*"],
  "@shared/*": ["src/shared/*"]
  }
  }
 True}
```

使用：

```js
import { utils } from '@shared/utils';
```

### 8.6 模块化检查清单

| 检查项       | 说明                            |
| :----------- | :------------------------------ |
| 单一职责     | 每个模块只做一件事              |
| 显式依赖     | 所有依赖在文件顶部声明          |
| 无全局污染   | 不向 `window`/`global` 挂载变量 |
| 无隐式副作用 | 模块导入不产生可观测的外部影响  |
| 具名导出优先 | 便于 Tree-shaking 和重构        |
| 无循环依赖   | 依赖图是 DAG（有向无环图）      |
| 完整扩展名   | ESM 中使用 `.js` 扩展名         |

---

##### 延伸阅读

- [TS 模块解析](typescript/type-declarations-and-module-resolution)

---

### 更新日志 (Changelog)

- 2026-05-27: v4.0.0 大幅扩充——新增 AMD/CMD 历史方案、Webpack/Vite 打包工具、循环依赖详解、Live Binding 对比、Barrel Export、副作用控制、路径别名、模块化检查清单
- 2026-04-06: 新增「模块化」知识点，补充 CJS/ESM 对比与工程实践要点
