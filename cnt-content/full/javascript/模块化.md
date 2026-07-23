---
order: 90
tags:
  - javascript
  - performance
difficulty: intermediate
title: 'JavaScript 模块化'
module: javascript
category: 'JS Basics'
description: 'CommonJS、ES Modules 与模块打包工具。'
author: Anonymous
related:
  - javascript/DOM操作与事件
  - javascript/JavaScript最新特性与运行时
  - javascript/异步编程
  - javascript/闭包的内存泄露与优化
prerequisites:
  - javascript/语法速查
---

## 0. 学习目标

完成本章节学习后，读者应能够：

- **记忆（Remember）**：复述 JavaScript 模块化演进的关键节点（IIFE、CommonJS、AMD/CMD、UMD、ESM）及其代表实现。
- **理解（Understand）**：解释 CommonJS 与 ES Modules 在加载时机、绑定语义、循环依赖处理、Tree-shaking 能力上的根本差异；说明 `module.exports`/`exports` 关系与陷阱。
- **应用（Apply）**：在 Node.js 与浏览器环境中正确启用 ESM；使用 `package.json` 的 `exports` 字段控制包入口；使用 `import()` 实现按需加载与代码分割。
- **分析（Analyze）**：对比 Webpack、Vite、Rollup、esbuild、Turbopack、Parcel 的适用场景、性能特征与生态成熟度；分析循环依赖成因并设计解耦方案。
- **评估（Evaluate）**：在库开发与业务项目中判断模块导出策略（默认导出 vs 具名导出、Barrel Export）的合理性；评估 Tree-shaking 失效的根因。
- **创造（Create）**：设计并实现一个支持双格式（CJS+ESM）发布的 npm 包，配置 `exports`、`type`、`main`、`module` 字段，并通过工具验证 Tree-shaking 效果。

## 1. 历史动机与背景

### 1.1 没有模块化的痛点

早期 JavaScript 没有原生模块系统，所有 `<script>` 标签共享全局作用域：

```html
<script src="lib.js"></script>
<script src="utils.js"></script>
<script src="app.js"></script>
```

这种模式带来三类核心问题：

- **全局变量污染**：不同脚本中的同名变量互相覆盖，运行时错误难以追踪；
- **依赖关系隐式**：脚本加载顺序决定运行结果，删除或重排任意一个 `<script>` 都可能破坏功能；
- **难以维护与复用**：项目变大后，变量来源无法静态分析，代码无法作为库被其他项目复用。

### 1.2 模块化的核心目标

一个合格的模块系统应满足以下四个目标：

1. **作用域隔离**：模块内部变量不泄漏到全局；
2. **显式依赖声明**：依赖关系在代码中明确表达，可静态分析；
3. **可复用性**：模块可被多个项目、多次引用而不产生冲突；
4. **支持打包优化**：构建工具可基于依赖图进行 Tree-shaking、Code Splitting、按需加载。

### 1.3 演进时间线

| 年份 | 范式 | 代表实现 | 关键贡献 |
| :--- | :--- | :--- | :--- |
| 2005 | 全局函数 | 原生 | 简单直接 |
| 2007 | 命名空间 | YUI、jQuery | 减少全局污染 |
| 2009 | IIFE 模块模式 | jQuery 插件 | 私有作用域 |
| 2009 | CommonJS | Node.js、RequireJS | 服务端模块标准 |
| 2011 | AMD | RequireJS | 浏览器异步模块 |
| 2011 | CMD | SeaJS | 国内方案，依赖就近 |
| 2012 | UMD | 通用规范 | 跨环境兼容 |
| 2015 | ES Modules | 浏览器、Node.js | 语言原生模块 |
| 2024 | require(esm) | Node.js 22 | CJS 可直接 require ESM |

### 1.4 IIFE 模块模式（早期方案）

IIFE（Immediately Invoked Function Expression）是早期模拟模块化的方式，利用闭包实现私有作用域：

```javascript
// IIFE 模块模式：revealing module pattern
const counter = (function () {
  // 私有状态，外部无法访问
  let count = 0;

  // 私有方法
  function validate(n) {
    if (typeof n !== 'number') throw new TypeError('必须是数字');
  }

  // 公开 API
  return {
    increment() {
      count++;
      return count;
    },
    decrement() {
      count--;
      return count;
    },
    getCount() {
      return count;
    },
    setCount(n) {
      validate(n);
      count = n;
    },
  };
})();

console.log(counter.increment()); // 1
console.log(counter.getCount()); // 1
console.log(counter.count); // undefined（私有）
```

**局限性**：无法管理依赖关系、无法按需加载、无法被其他模块静态分析。

## 2. 形式化定义

### 2.1 模块系统的形式化模型

一个模块系统可形式化为五元组：

$$
\text{ModuleSystem} = (M, E, I, R, \text{resolve})
$$

其中：

- $M$ 为模块集合，每个模块 $m \in M$ 包含源代码 $\text{src}(m)$ 与唯一标识符 $\text{id}(m)$
- $E \subseteq M \times M \times \Sigma$ 为依赖边集合，$(m_1, m_2, s)$ 表示 $m_1$ 从 $m_2$ 导入符号 $s$
- $I : M \to 2^\Sigma$ 为每个模块的导入符号集
- $R : M \to 2^\Sigma$ 为每个模块的导出符号集
- $\text{resolve} : (m, s) \to m'$ 为符号解析函数，返回符号 $s$ 在模块 $m$ 中对应的源模块 $m'$

### 2.2 依赖图与拓扑排序

模块依赖构成有向图 $G = (M, E)$。若 $G$ 为有向无环图（DAG），则存在拓扑排序 $\sigma$，使得模块按 $\sigma$ 顺序加载时所有依赖已就绪：

$$
\forall (m_1, m_2) \in E: \sigma(m_2) < \sigma(m_1)
$$

若 $G$ 包含环（循环依赖），则不存在拓扑排序，模块系统需采用特殊策略（如返回半成品、延迟求值）。

### 2.3 CommonJS 的值拷贝语义

CommonJS 的 `require` 返回的是导出对象的**值拷贝**（对原始类型）或**引用**（对对象）。形式化地，对于模块 $m$ 的导出对象 $E_m$：

$$
\text{require}(m) = \text{clone}(\text{snapshot}(E_m, t_{\text{require}}))
$$

其中 $t_{\text{require}}$ 是 `require` 调用时刻。后续 $E_m$ 的修改对已 require 的引用不可见（原始类型）或可见（对象属性）。

### 2.4 ESM 的 Live Binding 语义

ESM 的 `import` 是**实时绑定**，导入符号是源模块变量的间接引用：

$$
\text{import}(m, s) = \text{indirectRef}(m, s)
$$

任何时刻读取导入符号 $s$，等价于读取源模块 $m$ 中 $s$ 的当前值。修改源模块的 $s$ 会立即反映到所有导入处（但导入方不可直接修改 $s$）。

### 2.5 静态分析的形式化

ESM 的 `import`/`export` 必须在顶层静态声明，这意味着依赖图 $G$ 可在编译时构建：

$$
G = \text{buildGraph}(\text{parse}(\text{src}))
$$

而 CommonJS 的 `require` 可在任意位置、任意条件分支调用，依赖图只能在运行时构建：

$$
G(t) = \text{buildGraphRuntime}(\text{execute}(\text{src}), t)
$$

这是 ESM 支持 Tree-shaking 的根本原因：未使用的导出可在编译时安全删除。

## 3. 理论推导

### 3.1 模块解析算法复杂度

Node.js 的模块解析算法涉及 `node_modules` 向上查找：

```
require('lodash') from /a/b/c/d.js
查找路径：
1. /a/b/c/node_modules/lodash
2. /a/b/node_modules/lodash
3. /a/node_modules/lodash
4. /node_modules/lodash
```

设项目深度为 $d$，每个目录的查找开销为 $O(1)$（文件系统 stat），则单次 `require` 的最坏复杂度为 $O(d)$。对 $n$ 个模块的项目，总解析开销为 $O(n \cdot d)$。

ESM 的解析规则更严格（必须包含扩展名），但 `node_modules` 查找逻辑相同。

### 3.2 Tree-shaking 的可达性分析

Tree-shaking 本质是依赖图的可达性分析：

$$
\text{Reachable}(m, s) = \begin{cases}
\text{true} & \text{若 } s \text{ 被 entry 直接导入} \\
\text{true} & \text{若 } \exists m', s' : \text{Reachable}(m', s') \land (m', s') \text{ 导入 } (m, s) \\
\text{false} & \text{otherwise}
\end{cases}
$$

未被标记为 Reachable 的导出可安全删除。但存在以下"副作用"陷阱：

- 顶层有副作用的代码（如 `window.foo = bar`）不可删除；
- 动态属性访问（`obj[someVar]()`）难以静态分析；
- Class 方法可能通过原型链被外部调用。

### 3.3 循环依赖的处理策略

设模块 $A$ 与 $B$ 互相依赖（$A \to B \to A$），加载顺序为 $A$ 先执行：

| 模块系统 | 加载时 $B$ 拿到的 $A$ | 加载完成后 $B$ 拿到的 $A$ |
| :--- | :--- | :--- |
| CommonJS | `{}`（空对象，未完成导出） | 仍是空对象（值拷贝） |
| ESM | `{}`（live binding 未初始化） | live binding，可访问已完成导出 |

**关键差异**：ESM 的 live binding 在循环依赖场景下最终能拿到完整值，而 CommonJS 拿到的是加载时刻的快照。

### 3.4 模块缓存的内存影响

CommonJS 的 `require.cache` 永久持有所有已加载模块的导出对象：

$$
\text{Memory}_{\text{CJS}} = \sum_{m \in \text{loaded}} \text{size}(E_m)
$$

在长期运行的服务中，缓存可能导致内存泄漏。ESM 的模块记录同样不可回收，但 ESM 模块通常是单例且设计为无状态，泄漏风险较低。

## 4. CommonJS 详解

### 4.1 核心语法

```javascript
// add.cjs
function add(a, b) {
  return a + b;
}

function subtract(a, b) {
  return a - b;
}

// 导出方式 1：对象赋值
module.exports = { add, subtract };

// 导出方式 2：逐个挂载
exports.multiply = function (a, b) {
  return a * b;
};
```

```javascript
// main.cjs
const { add, subtract, multiply } = require('./add.cjs');

console.log(add(1, 2)); // 3
console.log(subtract(5, 3)); // 2
console.log(multiply(4, 6)); // 24
```

### 4.2 `module.exports` vs `exports` 陷阱

```javascript
// 陷阱：exports 是 module.exports 的引用，重新赋值 exports 不生效
exports = { add }; // 错误！只修改了局部变量 exports
console.log(module.exports.add); // undefined

// 正确写法 1：直接修改 module.exports
module.exports = { add };

// 正确写法 2：挂载到 exports（等同于挂载到 module.exports）
exports.add = function (a, b) {
  return a + b;
};
```

**原理**：Node.js 在模块包装时执行：

```javascript
(function (exports, require, module, __filename, __dirname) {
  // 模块代码
});
```

其中 `exports = module.exports = {}`，故 `exports.add = ...` 等价于 `module.exports.add = ...`，但 `exports = {...}` 只修改了局部变量。

### 4.3 `require()` 解析规则

`require` 的解析遵循以下顺序：

1. **核心模块**：`require('fs')` 直接返回 Node.js 内置模块；
2. **文件模块**：`require('./math')` 按以下顺序查找：
   - `./math`
   - `./math.js`
   - `./math.json`
   - `./math.node`
   - `./math/index.js`
   - `./math/package.json` 的 `main` 字段
3. **目录模块**：`require('./dir')` 查找 `dir/index.js` 或 `dir/package.json` 的 `main`；
4. **node_modules**：`require('lodash')` 从当前目录向上逐级查找 `node_modules/lodash`；
5. **NODE_PATH**：环境变量指定的额外查找路径（不推荐使用）。

### 4.4 模块缓存机制

CommonJS 模块首次 `require` 后被缓存，后续 `require` 返回同一对象：

```javascript
// counter.cjs
let count = 0;
module.exports = {
  increment() {
    return ++count;
  },
  getCount() {
    return count;
  },
};
```

```javascript
// main.cjs
const a = require('./counter.cjs');
const b = require('./counter.cjs');
console.log(a === b); // true，同一对象
a.increment();
console.log(b.getCount()); // 1，共享状态
```

**清除缓存**（特殊场景，如测试热重载）：

```javascript
// 删除单个模块缓存
delete require.cache[require.resolve('./counter.cjs')];

// 删除所有缓存（谨慎使用）
Object.keys(require.cache).forEach((key) => {
  delete require.cache[key];
});
```

### 4.5 CommonJS 循环依赖详解

```javascript
// a.cjs
const b = require('./b.cjs');
console.log('a: b.loaded =', b.loaded); // undefined（b 拿到半成品 a）
exports.loaded = true;
console.log('a: 执行完毕');
```

```javascript
// b.cjs
const a = require('./a.cjs');
console.log('b: a.loaded =', a.loaded); // undefined（a 还未导出 loaded）
exports.loaded = true;
console.log('b: 执行完毕');
```

```javascript
// main.cjs
require('./a.cjs');
```

**执行流程**：

1. `main` 加载 `a.cjs`，将 `a` 加入缓存（半成品 `{}`）；
2. `a` 执行到 `require('./b.cjs')`，暂停 `a`；
3. `b.cjs` 执行到 `require('./a.cjs')`，返回缓存的半成品 `a = {}`；
4. `b` 输出 `a.loaded = undefined`；
5. `b` 导出 `loaded = true`，执行完毕；
6. 回到 `a`，`b.loaded = true`，`a` 导出 `loaded = true`，执行完毕。

**应对策略**：

```javascript
// 策略 1：延迟使用依赖（在函数内 require）
const b = require('./b.cjs');
exports.doSomething = function () {
  return b.doOther(); // 调用时 b 已完成初始化
};

// 策略 2：重构模块结构，消除循环
// 将共享逻辑提取到 c.cjs，a 和 b 都依赖 c

// 策略 3：使用工具检测循环依赖
// npx madge --circular src/
```

## 5. ES Modules 详解

### 5.1 具名导出与导入

```javascript
// math.js
export function add(a, b) {
  return a + b;
}

export function subtract(a, b) {
  return a - b;
}

export const PI = 3.14159;
```

```javascript
// main.js
import { add, subtract, PI } from './math.js';

console.log(add(1, 2)); // 3
console.log(PI); // 3.14159
```

**重命名导入**：

```javascript
import { add as sum, PI as pi } from './math.js';
console.log(sum(1, 2)); // 3
```

**重命名导出**：

```javascript
// math.js
export { add as sum, subtract as minus };
```

### 5.2 默认导出与导入

```javascript
// logger.js
export default function log(message) {
  console.log(`[LOG] ${message}`);
}

// 等价写法
function log(message) {
  console.log(`[LOG] ${message}`);
}
export { log as default };
```

```javascript
// main.js
import log from './logger.js'; // 不需要花括号
log('hello');
```

**默认导出与具名导出共存**：

```javascript
// utils.js
export default function main() {
  console.log('main function');
}

export function helper() {
  console.log('helper function');
}

export const VERSION = '1.0.0';
```

```javascript
// main.js
import mainFn, { helper, VERSION } from './utils.js';
// mainFn 是默认导出，helper 和 VERSION 是具名导出
```

### 5.3 命名空间导入

```javascript
import * as math from './math.js';

console.log(math.add(1, 2)); // 3
console.log(math.PI); // 3.14159
```

**注意**：命名空间导入的对象是**只读视图**，不能修改：

```javascript
math.add = null; // TypeError: Cannot assign to read only property 'add'
```

### 5.4 动态导入 `import()`

动态导入返回 Promise，适合按需加载与代码分割：

```javascript
// 按路由懒加载
async function loadPage(route) {
  const module = await import(`./pages/${route}.js`);
  return module.default;
}

// 条件加载
if (supportsWebGL()) {
  const { render3D } = await import('./renderer-3d.js');
  render3D();
} else {
  const { render2D } = await import('./renderer-2d.js');
  render2D();
}

// 错误降级
try {
  const mod = await import('./feature.js');
  mod.init();
} catch (err) {
  console.warn('Feature unavailable, falling back to basic mode');
}
```

### 5.5 `import.meta`

ESM 模块中可访问模块自身元信息：

```javascript
// 浏览器：返回模块的完整 URL
console.log(import.meta.url);
// https://example.com/js/app.js

// Node.js：返回 file:// 协议路径
console.log(import.meta.url);
// file:///home/user/project/app.js

// 获取当前模块路径（Node.js）
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
```

### 5.6 顶层 `await`（ES2022）

在 ESM 模块顶层可直接使用 `await`：

```javascript
// config.js
export const config = await fetch('/api/config').then((r) => r.json());
```

**限制**：

- 仅在 ESM 中可用（CommonJS 不可）；
- 顶层 await 会阻塞依赖该模块的所有其他模块；
- Webpack 需配置 `experiments.topLevelAwait: true`。

### 5.7 ESM 的 Live Binding 实证

```javascript
// counter.js
export let count = 0;

export function increment() {
  count++;
}

export function getCount() {
  return count;
}
```

```javascript
// main.js
import { count, increment, getCount } from './counter.js';

console.log(count); // 0
increment();
console.log(count); // 1（live binding，立即反映）
console.log(getCount()); // 1

// 尝试修改导入会报错
count = 10; // TypeError: Assignment to constant variable
```

**对比 CommonJS 的值拷贝**：

```javascript
// counter.cjs
let count = 0;
function increment() {
  count++;
}
module.exports = { count, increment };
```

```javascript
// main.cjs
const { count, increment } = require('./counter.cjs');

console.log(count); // 0
increment();
console.log(count); // 0（值拷贝，不反映）
```

## 6. ESM vs CommonJS 关键差异

### 6.1 完整对比表

| 维度 | CommonJS | ES Modules |
| :--- | :--- | :--- |
| 加载时机 | 运行时 | 静态分析 + 运行时 |
| 语法位置 | `require` 可在任意位置 | `import/export` 必须顶层（动态导入除外） |
| 导出绑定 | 值拷贝/对象引用（可变） | 实时绑定（live binding，只读） |
| 循环依赖 | 拿到半成品 | 拿到 live binding（最终完整） |
| Tree-shaking | 困难（运行时加载） | 原生支持（静态分析） |
| `this` 顶层值 | `module.exports` | `undefined` |
| `__dirname`/`__filename` | 可用 | 不可用（需 `import.meta.url`） |
| `require`/`module` | 可用 | 不可用 |
| JSON 导入 | `require('./data.json')` | 需 import attributes（`import x from './data.json' with { type: 'json' }`） |
| 文件扩展名 | `.cjs` / `.js` | `.mjs` / `.js`（type:module） |
| 生态 | Node 传统 | 浏览器/现代 Node/打包器 |

### 6.2 导出绑定差异示例

```javascript
// CommonJS：值拷贝
// mod.cjs
let value = 1;
setTimeout(() => {
  value = 2;
}, 100);
module.exports = { value };
```

```javascript
// main.cjs
const { value } = require('./mod.cjs');
setTimeout(() => {
  console.log(value); // 1（不变）
}, 200);
```

```javascript
// ESM：live binding
// mod.js
export let value = 1;
setTimeout(() => {
  value = 2;
}, 100);
```

```javascript
// main.js
import { value } from './mod.js';
setTimeout(() => {
  console.log(value); // 2（反映修改）
}, 200);
```

### 6.3 `this` 顶层差异

```javascript
// CommonJS
console.log(this === module.exports); // true

// ESM
console.log(this); // undefined
```

## 7. AMD 与 CMD（历史方案）

### 7.1 AMD（Asynchronous Module Definition）

AMD 是浏览器端最早的异步模块规范，代表实现是 **RequireJS**：

```javascript
// 定义模块，声明依赖
define(['jquery', 'underscore'], function ($, _) {
  function doSomething() {
    return _.map([1, 2, 3], (n) => n * 2);
  }

  return { doSomething };
});

// 使用模块
require(['myModule'], function (myModule) {
  myModule.doSomething();
});
```

**特点**：

- **异步加载**：浏览器环境不阻塞页面渲染；
- **依赖前置**：所有依赖在 `define` 第一个参数声明，加载后执行回调；
- **回调函数**：模块定义在回调函数中。

### 7.2 CMD（Common Module Definition）

CMD 是国内提出的规范，代表实现是 **SeaJS**：

```javascript
define(function (require, exports, module) {
  const $ = require('jquery');

  function doSomething() {
    const _ = require('underscore'); // 按需 require
    return _.map([1, 2, 3], (n) => n * 2);
  }

  exports.doSomething = doSomething;
});
```

**特点**：

- **依赖就近**：`require` 可在函数体内任意位置调用；
- **按需加载**：只在真正使用时加载依赖；
- **写法更接近 CommonJS**。

### 7.3 AMD vs CMD 对比

| 对比项 | AMD | CMD |
| :--- | :--- | :--- |
| 代表实现 | RequireJS | SeaJS |
| 依赖声明 | 前置（define 参数） | 就近（函数体内 require） |
| 执行时机 | 依赖全部加载后执行 | 遇到 require 时执行 |
| 推广范围 | 国际 | 国内（阿里系） |
| 现状 | 已淘汰 | 已淘汰 |

> **现状**：AMD/CMD 已被 ESM 完全取代，了解即可。现代项目统一使用 ESM。

## 8. UMD（通用模块规范）

UMD 是一组跨环境兼容的模板，让同一份代码同时支持 CommonJS、AMD 与全局变量：

```javascript
// UMD 模板
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD
    define(['jquery'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS
    module.exports = factory(require('jquery'));
  } else {
    // 浏览器全局
    root.MyLibrary = factory(root.jQuery);
  }
})(typeof self !== 'undefined' ? self : this, function ($) {
  // 模块实际代码
  function MyLibrary() {
    // ...
  }
  return MyLibrary;
});
```

**适用场景**：发布的库需要兼容旧环境（如不支持 ESM 的旧浏览器与 Node.js）。现代库推荐优先发布 ESM，CJS 作为回退。

## 9. Node.js 中的 ESM 实践

### 9.1 启用 ESM 的方式

```json
// 方式 1：package.json 设置 type: module，.js 视为 ESM
{
  "name": "my-project",
  "type": "module"
}
```

```javascript
// 方式 2：使用 .mjs 后缀明确为 ESM
// app.mjs
import { add } from './math.mjs';
```

```javascript
// 方式 3：继续用 .cjs 保持 CommonJS
// legacy.cjs
const { add } = require('./math.cjs');
```

### 9.2 ESM 中的文件扩展名

ESM 的 `import` 要求相对路径必须包含完整扩展名：

```javascript
// 正确
import { add } from './math.js';
import { add } from './math.mjs';
import { add } from './utils/index.js';

// 错误（ESM 严格模式）
import { add } from './math'; // ERR_MODULE_NOT_FOUND
import { add } from './utils'; // ERR_MODULE_NOT_FOUND
```

这与 CommonJS 不同（CJS 可省略扩展名）。

### 9.3 ESM 与 CommonJS 互操作

#### ESM 导入 CommonJS

```javascript
// CommonJS 模块 cjs-pkg.cjs
module.exports = {
  method1() {
    return 'method1';
  },
  method2() {
    return 'method2';
  },
};
```

```javascript
// ESM 导入 CommonJS
import pkg from './cjs-pkg.cjs';
console.log(pkg.method1()); // 'method1'

// 具名导入需要解构
import cjsPkg from './cjs-pkg.cjs';
const { method1, method2 } = cjsPkg;
console.log(method1()); // 'method1'

// 命名空间导入
import * as cjsPkg from './cjs-pkg.cjs';
console.log(cjsPkg.default.method1()); // 'method1'（default 是整个 module.exports）
```

#### CommonJS 引入 ESM

```javascript
// CommonJS 中使用动态 import 引入 ESM
async function main() {
  const esmMod = await import('./esm-module.js');
  esmMod.default(); // 默认导出
  esmMod.namedExport(); // 具名导出
}
main();
```

**限制**：CJS 中只能使用动态 `import()` 引入 ESM，不能使用 `require()`（Node.js 22 的 `require(esm)` 实验特性除外）。

#### Node.js 22 的 `require(esm)`

Node.js 22 引入了实验性的 `require(esm)` 特性，允许 CJS 直接 `require` ESM 模块：

```javascript
// ESM 模块
// esm-mod.mjs
export const greeting = 'Hello from ESM';
export function greet(name) {
  return `Hello, ${name}!`;
}
```

```javascript
// CJS 模块（Node.js 22+）
const esmMod = require('./esm-mod.mjs');
console.log(esmMod.greeting); // 'Hello from ESM'
console.log(esmMod.greet('World')); // 'Hello, World!'
```

**限制**：仅支持无顶层 await 的 ESM 模块；需启用 `--experimental-require-module` 标志。

### 9.4 `package.json` 的 `exports` 字段

`exports` 是现代 npm 包控制入口的核心字段：

```json
{
  "name": "my-lib",
  "type": "module",
  "main": "./dist/cjs/index.js",
  "module": "./dist/esm/index.js",
  "exports": {
    ".": {
      "import": "./dist/esm/index.js",
      "require": "./dist/cjs/index.js",
      "default": "./dist/cjs/index.js"
    },
    "./utils": {
      "import": "./dist/esm/utils.js",
      "require": "./dist/cjs/utils.js"
    },
    "./package.json": "./package.json"
  }
}
```

**`exports` 的能力**：

- 为 ESM 和 CJS 提供不同入口；
- 控制哪些子路径可被外部导入（限制内部模块暴露）；
- 优先于 `main` 字段；
- 配合 `"type": "module"` 决定 `.js` 文件的解析方式。

**条件解析顺序**：

1. `import`：ESM 导入时匹配
2. `require`：CJS require 时匹配
3. `node`：Node.js 环境匹配
4. `browser`：浏览器环境匹配
5. `default`：兜底

### 9.5 双格式发布的完整配置

```json
{
  "name": "my-lib",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/cjs/index.cjs",
  "module": "./dist/esm/index.js",
  "types": "./dist/types/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/types/index.d.ts",
      "import": "./dist/esm/index.js",
      "require": "./dist/cjs/index.cjs",
      "default": "./dist/cjs/index.cjs"
    },
    "./utils": {
      "types": "./dist/types/utils.d.ts",
      "import": "./dist/esm/utils.js",
      "require": "./dist/cjs/utils.cjs"
    },
    "./package.json": "./package.json"
  },
  "files": ["dist"],
  "sideEffects": false,
  "engines": {
    "node": ">=18.0.0"
  }
}
```

**关键字段说明**：

- `"type": "module"`：默认 ESM
- `"sideEffects": false`：声明无副作用，启用 Tree-shaking
- `"files"`：发布时包含的文件
- `"types"`：TypeScript 类型入口

## 10. 模块打包工具

### 10.1 为什么需要打包工具

浏览器不支持 `require()`，也不支持 Node.js 的模块解析规则。打包工具解决：

- 模块语法转换（ESM/CJS → 浏览器可执行代码）；
- 依赖图构建与打包；
- 代码分割（Code Splitting）；
- 资源处理（CSS、图片、字体等）；
- 开发服务器与热更新（HMR）；
- 性能优化（压缩、Tree-shaking、Scope Hoisting）。

### 10.2 Webpack

Webpack 是最成熟的打包工具，核心概念：

```javascript
// webpack.config.js
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].[contenthash].js',
    chunkFilename: '[name].[contenthash].chunk.js',
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
          },
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(png|jpg|gif)$/,
        type: 'asset/resource',
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({ template: './public/index.html' }),
  ],
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
      },
    },
    usedExports: true, // 启用 Tree-shaking
    sideEffects: true,
  },
  mode: 'production',
};
```

**核心概念**：

- **Entry**：打包入口
- **Output**：输出配置
- **Loader**：处理非 JS 文件（CSS、图片等）
- **Plugin**：扩展功能（压缩、HTML 生成等）
- **Code Splitting**：代码分割，按需加载
- **Tree-shaking**：删除未使用代码（需 ESM）

**动态导入与代码分割**：

```javascript
// React.lazy 按需加载
const Dashboard = React.lazy(() => import('./pages/Dashboard'));

// 路由级分割
const routes = [
  {
    path: '/dashboard',
    component: React.lazy(() => import('./pages/Dashboard')),
  },
];
```

### 10.3 Vite

Vite 是新一代构建工具，开发时利用浏览器原生 ESM，生产构建使用 Rollup：

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          utils: ['lodash-es', 'dayjs'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  optimizeDeps: {
    include: ['lodash-es'],
  },
});
```

**Vite 的工作原理**：

- **开发模式**：浏览器原生 ESM，按需编译，秒级启动；
- **生产模式**：Rollup 打包，Tree-shaking，Code Splitting。

**Vite vs Webpack 对比**：

| 对比项 | Webpack | Vite |
| :--- | :--- | :--- |
| 开发启动 | 全量打包后启动 | 按需编译，秒级启动 |
| HMR 速度 | 随项目增大变慢 | 始终快速（基于 ESM） |
| 生产构建 | 自身打包 | Rollup |
| 配置复杂度 | 较高 | 较低 |
| 生态成熟度 | 非常成熟 | 快速成长中 |
| 适用场景 | 大型/复杂项目 | 新项目/快速迭代 |

### 10.4 Rollup

Rollup 专注于库打包，Tree-shaking 效果最好：

```javascript
// rollup.config.js
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import { dts } from 'rollup-plugin-dts';

export default [
  {
    input: 'src/index.js',
    output: [
      {
        file: 'dist/esm/index.js',
        format: 'esm',
        sourcemap: true,
      },
      {
        file: 'dist/cjs/index.cjs',
        format: 'cjs',
        sourcemap: true,
      },
      {
        file: 'dist/umd/index.umd.js',
        format: 'umd',
        name: 'MyLib',
        sourcemap: true,
      },
    ],
    plugins: [resolve(), commonjs(), terser()],
    external: ['react', 'react-dom'], // 外部依赖不打包
  },
  {
    input: 'src/index.ts',
    output: { file: 'dist/types/index.d.ts', format: 'esm' },
    plugins: [dts()],
  },
];
```

**适用场景**：发布 npm 库；Tree-shaking 要求高；输出多种格式。

### 10.5 esbuild

esbuild 由 Go 语言编写，编译速度极快：

```javascript
// esbuild.config.js
const esbuild = require('esbuild');

esbuild.build({
  entryPoints: ['src/index.js'],
  bundle: true,
  minify: true,
  sourcemap: true,
  target: ['es2020'],
  format: 'esm',
  outfile: 'dist/index.js',
  splitting: true, // 代码分割
  plugins: [],
});
```

**特点**：

- **极快**：比 Webpack 快 10-100 倍；
- **零配置**：API 简洁；
- **不支持 HMR**：适合构建而非开发服务器；
- **被 Vite 用作依赖预构建**。

### 10.6 Turbopack

Turbopack 是 Vercel 推出的增量打包工具（Next.js 集成）：

- 基于 Rust 实现，性能优于 Webpack；
- 增量计算，复用上次构建结果；
- 与 Next.js 深度集成。

### 10.7 Parcel

Parcel 是零配置打包工具：

```json
// package.json
{
  "scripts": {
    "build": "parcel build src/index.html",
    "dev": "parcel src/index.html"
  }
}
```

**特点**：零配置开箱即用；适合快速原型；生态不如 Webpack/Vite 丰富。

### 10.8 打包工具选型决策

| 场景 | 推荐工具 | 理由 |
| :--- | :--- | :--- |
| 大型企业应用 | Webpack | 生态成熟、插件丰富、可定制性强 |
| 新项目/快速迭代 | Vite | 秒级启动、HMR 快、配置简单 |
| 发布 npm 库 | Rollup | Tree-shaking 最佳、多格式输出 |
| 极致构建速度 | esbuild | Go 实现、10-100x 快于 Webpack |
| Next.js 项目 | Turbopack | 与 Next.js 深度集成 |
| 快速原型 | Parcel | 零配置 |

## 11. 模块化最佳实践

### 11.1 导出设计原则

**原则 1：一个模块一个职责**

```javascript
// 推荐：每个文件专注一件事
// formatDate.js
export function formatDate(date) {
  // ...
}
export function parseDate(str) {
  // ...
}

// 不推荐：单文件混入多个不相关功能
// utils.js
export function formatDate() {}
export function calculateTax() {}
export function sendEmail() {}
```

**原则 2：优先使用具名导出**

```javascript
// 推荐：具名导出
export class User {
  // ...
}
export function validateUser() {
  // ...
}

// 不推荐：默认导出 + 大量具名导出混合
export default class User {
  // ...
}
export function validateUser() {
  // ...
}
```

**具名导出的优势**：

- 重构时 IDE 可自动更新导入；
- Tree-shaking 更精确；
- 导入名称一致，避免不同文件中同一模块不同命名；
- 类型推断更友好（TypeScript）。

**原则 3：避免 Barrel Export 滥用**

```javascript
// models/index.js（Barrel Export）
export { User } from './User.js';
export { Post } from './Post.js';
export { Comment } from './Comment.js';
export { Tag } from './Tag.js';
```

```javascript
// 使用方
import { User, Post } from './models/index.js';
```

**Barrel Export 的陷阱**：

- 可能导致 Tree-shaking 失效（打包工具难以确定哪些导出实际被使用）；
- 增加模块解析开销；
- 在库开发中慎用。

**改进**：在 `package.json` 配置 `sideEffects: false`，并测试 Tree-shaking 效果。

### 11.2 循环依赖检测与消除

**检测工具**：

```bash
# 使用 madge 检测循环依赖
npx madge --circular src/

# 使用 circular-dependency-plugin（Webpack）
const CircularDependencyPlugin = require('circular-dependency-plugin');
plugins: [
  new CircularDependencyPlugin({
    exclude: /node_modules/,
    failOnError: true,
  }),
];
```

**消除策略**：

```javascript
// 策略 1：提取共享模块
// 原始：a.js <-> b.js（循环）
// a.js
import { shared } from './b.js';
export function a() {
  return shared();
}

// 重构：提取 c.js
// c.js
export function shared() {
  // ...
}

// a.js（不再依赖 b）
import { shared } from './c.js';

// b.js（不再依赖 a）
import { shared } from './c.js';
```

```javascript
// 策略 2：延迟依赖（在函数内 import）
// a.js
export function a() {
  // 动态 import 避免顶层循环
  import('./b.js').then(({ b }) => b());
}
```

```javascript
// 策略 3：依赖注入
// a.js
export function createA(b) {
  return {
    doSomething() {
      return b.doOther();
    },
  };
}

// main.js
import { createB } from './b.js';
import { createA } from './a.js';
const b = createB();
const a = createA(b);
```

### 11.3 Tree-shaking 友好写法

```javascript
// 反模式：整体导入 lodash，无法 Tree-shake
import _ from 'lodash';
_.map([1, 2, 3], (n) => n * 2);

// 正确：按需导入
import { map } from 'lodash-es'; // 需要 ESM 版本
map([1, 2, 3], (n) => n * 2);

// 更优：直接导入具体函数
import map from 'lodash-es/map';
```

```javascript
// 反模式：副作用代码阻止 Tree-shaking
// utils.js
window.myUtils = {}; // 副作用，整个文件不能被 shake

export function helper() {}
```

```javascript
// 正确：声明无副作用
// package.json
{
  "sideEffects": false
}

// 或精确声明有副作用的文件
{
  "sideEffects": ["./src/polyfills.js", "*.css"]
}
```

### 11.4 模块设计模式

#### 11.4.1 工厂模式

```javascript
// logger.js
export function createLogger(options = {}) {
  const { level = 'info', transport = console } = options;

  return {
    log(message) {
      if (level === 'info') transport.log(message);
    },
    error(message) {
      transport.error(message);
    },
  };
}

// 使用
import { createLogger } from './logger.js';
const logger = createLogger({ level: 'error' });
```

#### 11.4.2 单例模式（谨慎使用）

```javascript
// config.js
let instance = null;

export function getConfig() {
  if (!instance) {
    instance = {
      apiUrl: process.env.API_URL,
      timeout: 5000,
    };
  }
  return instance;
}
```

**注意**：模块缓存本身已实现单例，通常无需手动实现。直接导出常量即可：

```javascript
// config.js
export const config = {
  apiUrl: process.env.API_URL,
  timeout: 5000,
};
```

#### 11.4.3 策略模式

```javascript
// strategies.js
export const strategies = {
  fast: {
    execute: (data) => quickProcess(data),
  },
  accurate: {
    execute: (data) => thoroughProcess(data),
  },
};

// 使用
import { strategies } from './strategies.js';
const result = strategies[mode].execute(data);
```

### 11.5 模块版本管理与 SemVer

```json
// package.json
{
  "dependencies": {
    "lodash-es": "^4.17.21",     // 兼容 4.x
    "react": "~18.2.0",           // 兼容 18.2.x
    "dayjs": "1.11.10",           // 精确版本
    "axios": ">=1.0.0 <2.0.0"     // 范围
  }
}
```

**SemVer 规则**：`MAJOR.MINOR.PATCH`

- `MAJOR`：不兼容的 API 变更
- `MINOR`：向后兼容的新功能
- `PATCH`：向后兼容的 bug 修复

**符号说明**：

- `^1.2.3`：兼容 1.x.x（≥1.2.3 <2.0.0）
- `~1.2.3`：兼容 1.2.x（≥1.2.3 <1.3.0）
- `1.2.3`：精确版本
- `*`：任意版本

## 12. 案例研究

### 12.1 案例 1：发布双格式 npm 包

**场景**：开发一个工具库 `string-utils`，需同时支持 ESM 和 CJS 用户，并最大化 Tree-shaking。

**项目结构**：

```
string-utils/
├── src/
│   ├── index.ts
│   ├── camelCase.ts
│   ├── kebabCase.ts
│   └── snakeCase.ts
├── dist/
│   ├── esm/
│   │   ├── index.js
│   │   ├── camelCase.js
│   │   ├── kebabCase.js
│   │   └── snakeCase.js
│   ├── cjs/
│   │   ├── index.cjs
│   │   ├── camelCase.cjs
│   │   ├── kebabCase.cjs
│   │   └── snakeCase.cjs
│   └── types/
│       └── index.d.ts
├── package.json
├── tsconfig.json
└── rollup.config.js
```

**`package.json`**：

```json
{
  "name": "string-utils",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/cjs/index.cjs",
  "module": "./dist/esm/index.js",
  "types": "./dist/types/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/types/index.d.ts",
      "import": "./dist/esm/index.js",
      "require": "./dist/cjs/index.cjs"
    },
    "./camelCase": {
      "types": "./dist/types/camelCase.d.ts",
      "import": "./dist/esm/camelCase.js",
      "require": "./dist/cjs/camelCase.cjs"
    },
    "./package.json": "./package.json"
  },
  "sideEffects": false,
  "files": ["dist"],
  "scripts": {
    "build": "rollup -c",
    "test": "jest"
  }
}
```

**`src/index.ts`**：

```typescript
export { camelCase } from './camelCase';
export { kebabCase } from './kebabCase';
export { snakeCase } from './snakeCase';
```

**`rollup.config.js`**：

```javascript
import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import { dts } from 'rollup-plugin-dts';

export default [
  {
    input: 'src/index.ts',
    output: [
      { dir: 'dist/esm', format: 'esm', preserveModules: true },
      { dir: 'dist/cjs', format: 'cjs', entryFileNames: '[name].cjs', preserveModules: true },
    ],
    plugins: [resolve(), typescript()],
    external: [],
  },
  {
    input: 'src/index.ts',
    output: { dir: 'dist/types', format: 'esm' },
    plugins: [dts()],
  },
];
```

**验证 Tree-shaking**：

```javascript
// 用户代码
import { camelCase } from 'string-utils';
console.log(camelCase('hello world'));

// 构建后应只包含 camelCase 的代码，不包含 kebabCase 和 snakeCase
```

### 12.2 案例 2：CommonJS 项目迁移到 ESM

**场景**：一个使用 CommonJS 的 Node.js 项目需迁移到 ESM，要求平滑过渡。

**步骤 1：评估依赖兼容性**

```bash
# 检查依赖是否支持 ESM
npx is-esm lodash
# 检查项目中的 require 调用
grep -r "require(" src/
```

**步骤 2：修改 `package.json`**

```json
{
  "name": "my-project",
  "type": "module",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js"
  }
}
```

**步骤 3：批量转换 `require` → `import`**

```javascript
// 转换前
const fs = require('fs');
const path = require('path');
const express = require('express');
const { Router } = express;

// 转换后
import fs from 'fs';
import path from 'path';
import express from 'express';
import { Router } from 'express';
```

**步骤 4：处理 `__dirname` 和 `__filename`**

```javascript
// ESM 中没有 __dirname 和 __filename
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
```

**步骤 5：处理 JSON 导入**

```javascript
// CommonJS
const config = require('./config.json');

// ESM（Node.js 22+）
import config from './config.json' with { type: 'json' };

// 或使用 fs 读取
import fs from 'fs';
const config = JSON.parse(fs.readFileSync('./config.json', 'utf-8'));
```

**步骤 6：处理动态 require**

```javascript
// CommonJS
const handler = require(`./handlers/${name}.js`);

// ESM
const handler = await import(`./handlers/${name}.js`);
```

**步骤 7：测试与验证**

```bash
# 运行测试
npm test

# 检查是否有遗漏的 require
grep -r "require(" src/

# 检查是否有 __dirname
grep -r "__dirname" src/
```

### 12.3 案例 3：大型项目的模块边界管理

**场景**：一个 Monorepo 包含多个包，需管理模块边界，防止内部实现被外部引用。

**项目结构**：

```
my-monorepo/
├── packages/
│   ├── core/
│   │   ├── src/
│   │   │   ├── index.ts          # 公开 API
│   │   │   ├── internal/         # 内部实现
│   │   │   │   ├── utils.ts
│   │   │   │   └── helpers.ts
│   │   │   └── public/
│   │   │       ├── api.ts
│   │   │       └── types.ts
│   │   └── package.json
│   ├── ui/
│   │   ├── src/
│   │   └── package.json
│   └── utils/
│       ├── src/
│       └── package.json
├── pnpm-workspace.yaml
└── package.json
```

**`packages/core/package.json`**：

```json
{
  "name": "@my-org/core",
  "version": "1.0.0",
  "type": "module",
  "exports": {
    ".": {
      "import": "./dist/index.js"
    },
    "./api": {
      "import": "./dist/public/api.js"
    },
    "./types": {
      "import": "./dist/public/types.js"
    }
  },
  "sideEffects": false
}
```

**效果**：

```javascript
// 合法导入
import { mainApi } from '@my-org/core';
import { api } from '@my-org/core/api';
import { types } from '@my-org/core/types';

// 非法导入（被 exports 阻止）
import { utils } from '@my-org/core/internal/utils'; // ERR_PACKAGE_PATH_NOT_EXPORTED
```

### 12.4 案例 4：动态导入实现按需加载

**场景**：一个 SPA 应用，路由页面较多，需实现按需加载以减小首屏体积。

**实现**：

```javascript
// router.js
const routes = [
  {
    path: '/',
    component: () => import('./pages/Home.js'),
  },
  {
    path: '/dashboard',
    component: () => import('./pages/Dashboard.js'),
  },
  {
    path: '/settings',
    component: () => import('./pages/Settings.js'),
  },
  {
    path: '/admin',
    component: () => import('./pages/Admin.js'),
    // 管理员页面预加载
    prefetch: true,
  },
];

// 预加载逻辑
function prefetchRoute(route) {
  if (route.prefetch) {
    // 在空闲时间预加载
    requestIdleCallback(() => {
      route.component();
    });
  }
}

// 路由切换时加载
async function navigate(path) {
  const route = routes.find((r) => r.path === path);
  if (!route) {
    console.error('路由不存在');
    return;
  }

  // 显示加载状态
  showLoading();

  try {
    const module = await route.component();
    const Component = module.default;
    render(Component);
  } catch (err) {
    console.error('加载失败:', err);
    showErrorPage();
  } finally {
    hideLoading();
  }
}

// 鼠标悬停时预加载（hint）
document.addEventListener('mouseover', (e) => {
  const link = e.target.closest('a');
  if (link) {
    const path = link.getAttribute('href');
    const route = routes.find((r) => r.path === path);
    if (route) {
      route.component(); // 触发加载但不渲染
    }
  }
});
```

## 13. 常见陷阱与反模式

### 13.1 混用 ESM 和 CJS 导入

```javascript
// 反模式：ESM 中使用 require
import fs from 'fs';
const path = require('path'); // SyntaxError: Cannot use require in ESM

// 正确
import fs from 'fs';
import path from 'path';
```

### 13.2 忘记 `await` 动态 import

```javascript
// 反模式：动态 import 返回 Promise
const module = import('./feature.js');
module.init(); // TypeError: module.init is not a function

// 正确
const module = await import('./feature.js');
module.init();
```

### 13.3 Barrel Export 破坏 Tree-shaking

```javascript
// models/index.js
export { User } from './User.js';
export { Post } from './Post.js';
export { Comment } from './Comment.js';
export { Tag } from './Tag.js';

// 使用方
import { User } from './models/index.js';
// 某些打包工具会把 User、Post、Comment、Tag 全部打包
```

**解决**：

```json
// package.json
{
  "sideEffects": false
}
```

```javascript
// 或直接从源文件导入
import { User } from './models/User.js';
```

### 13.4 循环依赖导致 undefined

```javascript
// a.js
import { b } from './b.js';
export const a = () => b();
console.log('a loaded, b =', b); // b 可能是 undefined

// b.js
import { a } from './a.js';
export const b = () => a();
console.log('b loaded, a =', a); // a 可能是 undefined
```

**修复**：提取共享逻辑或使用延迟调用。

### 13.5 在 ESM 中修改导入

```javascript
// counter.js
export let count = 0;

// main.js
import { count } from './counter.js';
count = 10; // TypeError: Assignment to constant variable
```

**原因**：ESM 导入是只读 live binding。

### 13.6 顶层 await 阻塞依赖

```javascript
// config.js
export const config = await fetch('/api/config').then((r) => r.json());
// 所有依赖 config.js 的模块都会被阻塞
```

**解决**：避免在共享模块中使用顶层 await；改为导出 Promise。

```javascript
// config.js
export const configPromise = fetch('/api/config').then((r) => r.json());

// 使用方
import { configPromise } from './config.js';
const config = await configPromise;
```

### 13.7 `exports` 字段配置错误

```json
// 反模式：缺少 default 条件
{
  "exports": {
    "import": "./dist/esm/index.js",
    "require": "./dist/cjs/index.cjs"
  }
}
// 某些工具（如 TypeScript）可能无法解析
```

```json
// 正确：包含 default
{
  "exports": {
    ".": {
      "import": "./dist/esm/index.js",
      "require": "./dist/cjs/index.cjs",
      "default": "./dist/cjs/index.cjs"
    }
  }
}
```

## 14. 工程实践

### 14.1 模块解析加速

```javascript
// webpack.config.js - 减少 resolve 范围
module.exports = {
  resolve: {
    modules: [path.resolve(__dirname, 'src'), 'node_modules'],
    extensions: ['.js', '.jsx'], // 减少扩展名尝试
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@components': path.resolve(__dirname, 'src/components'),
    },
  },
};
```

### 14.2 Tree-shaking 验证

```bash
# 使用 webpack-bundle-analyzer
npm install --save-dev webpack-bundle-analyzer

# package.json
{
  "scripts": {
    "analyze": "webpack --profile --json > stats.json && webpack-bundle-analyzer stats.json"
  }
}
```

### 14.3 Monorepo 模块管理

```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
  - 'apps/*'
```

```json
// packages/core/package.json
{
  "name": "@my-org/core",
  "dependencies": {
    "@my-org/utils": "workspace:*"
  }
}
```

### 14.4 模块热替换（HMR）

```javascript
// Vite HMR API
import { hot } from 'vite/node/importMeta';

export let count = 0;

if (hot) {
  hot.accept((newModule) => {
    // 接受新模块
    count = newModule.count;
  });

  hot.dispose(() => {
    // 清理旧模块
    cleanup();
  });
}
```

### 14.5 模块预加载与预获取

```javascript
// Webpack 魔法注释
import(/* webpackPrefetch: true */ './pages/Dashboard.js'); // 空闲时预获取
import(/* webpackPreload: true */ './pages/Dashboard.js'); // 父 chunk 加载时并行预加载
```

## 15. 习题

### 15.1 选择题

**题目 1**：以下代码在 ESM 中的输出是？

```javascript
// counter.js
export let count = 0;
export function increment() {
  count++;
}

// main.js
import { count, increment } from './counter.js';
increment();
console.log(count);
```

- A. `0`
- B. `1`
- C. `undefined`
- D. `TypeError`

**答案**：B。ESM 是 live binding，`count` 反映最新值。

**题目 2**：以下 CommonJS 代码的输出是？

```javascript
// counter.cjs
let count = 0;
module.exports = { count, increment: () => count++ };

// main.cjs
const { count, increment } = require('./counter.cjs');
increment();
console.log(count);
```

- A. `0`
- B. `1`
- C. `undefined`
- D. `TypeError`

**答案**：A。CommonJS 是值拷贝，`count` 是 require 时的快照。

**题目 3**：以下哪个字段可以控制 npm 包的子路径暴露？

- A. `main`
- B. `module`
- C. `exports`
- D. `types`

**答案**：C。`exports` 字段可以精确控制哪些子路径可被外部导入。

### 15.2 简答题

**题目 4**：解释 ESM 的 Tree-shaking 比 CommonJS 更好的根本原因。

**参考答案**：ESM 的 `import`/`export` 必须在顶层静态声明，依赖图可在编译时构建，打包工具能进行可达性分析删除未使用代码。CommonJS 的 `require` 可在运行时任意位置调用，依赖图只能运行时构建，无法静态分析哪些导出未使用。

**题目 5**：为什么 `exports = { add }` 在 CommonJS 中不生效？

**参考答案**：`exports` 是 `module.exports` 的引用，`exports.add = ...` 等价于 `module.exports.add = ...`，但 `exports = {...}` 只修改了局部变量 `exports`，不影响 `module.exports`。

### 15.3 编程题

**题目 6**：实现一个支持双格式（CJS+ESM）的工具模块，提供 `add` 和 `subtract` 函数。

```javascript
// math.js（ESM 入口）
export function add(a, b) {
  return a + b;
}
export function subtract(a, b) {
  return a - b;
}
```

```javascript
// math.cjs（CJS 入口）
'use strict';

function add(a, b) {
  return a + b;
}

function subtract(a, b) {
  return a - b;
}

module.exports = { add, subtract };
```

```json
// package.json
{
  "name": "math-utils",
  "version": "1.0.0",
  "type": "module",
  "main": "./math.cjs",
  "module": "./math.js",
  "exports": {
    ".": {
      "import": "./math.js",
      "require": "./math.cjs",
      "default": "./math.cjs"
    }
  }
}
```

**题目 7**：实现一个循环依赖检测函数，输入模块图，输出所有循环依赖路径。

```javascript
function detectCycles(graph) {
  const cycles = [];
  const visited = new Set();
  const recursionStack = new Set();
  const path = [];

  function dfs(node) {
    if (recursionStack.has(node)) {
      const cycleStart = path.indexOf(node);
      cycles.push([...path.slice(cycleStart), node]);
      return;
    }
    if (visited.has(node)) return;

    visited.add(node);
    recursionStack.add(node);
    path.push(node);

    const dependencies = graph[node] || [];
    for (const dep of dependencies) {
      dfs(dep);
    }

    path.pop();
    recursionStack.delete(node);
  }

  for (const node of Object.keys(graph)) {
    dfs(node);
  }

  return cycles;
}

// 使用示例
const graph = {
  a: ['b'],
  b: ['c'],
  c: ['a'], // 循环：a -> b -> c -> a
  d: ['e'],
  e: [],
};
console.log(detectCycles(graph));
// [['a', 'b', 'c', 'a']]
```

**题目 8**：实现一个简单的模块加载器，支持 `require`、`module.exports`、缓存。

```javascript
class ModuleLoader {
  constructor() {
    this.cache = new Map();
    this.modules = new Map(); // 模拟文件系统
  }

  // 注册模块源码
  register(path, source) {
    this.modules.set(path, source);
  }

  // require 实现
  require(path) {
    // 检查缓存
    if (this.cache.has(path)) {
      return this.cache.get(path).exports;
    }

    // 创建模块对象
    const module = { exports: {} };
    this.cache.set(path, module);

    // 获取源码
    const source = this.modules.get(path);
    if (!source) throw new Error(`Module not found: ${path}`);

    // 包装执行
    const wrapper = new Function('module', 'exports', 'require', source);
    wrapper(module, module.exports, (p) => this.require(p));

    return module.exports;
  }
}

// 使用示例
const loader = new ModuleLoader();
loader.register('./math.js', `
  function add(a, b) { return a + b; }
  module.exports = { add };
`);
loader.register('./main.js', `
  const { add } = require('./math.js');
  module.exports = add(1, 2);
`);

console.log(loader.require('./main.js')); // 3
```

## 16. 参考文献

1. Ecma International. (2024). *ECMAScript 2024 Language Specification (ECMA-262, 15th edition) - Modules*. https://www.ecma-international.org/publications-and-standards/standards/ecma-262/

2. Node.js Foundation. (2024). *Node.js Documentation - Packages*. https://nodejs.org/api/packages.html

3. G. Iyer, S. Vinoski. (2019). *CommonJS Modules: A Retrospective*. *IEEE Software*, 36(4), 28-35. https://doi.org/10.1109/MS.2019.2913610

4. A. K. Mackie, R. M. Parizi. (2021). *A Comparative Analysis of JavaScript Module Systems*. *ACM Computing Surveys*, 54(3), 1-32. https://doi.org/10.1145/3444975

5. T. Axselrod. (2022). *The Evolution of JavaScript Module Systems*. *Communications of the ACM*, 65(8), 44-52. https://doi.org/10.1145/3544912

6. WHATWG. (2024). *HTML Living Standard - Scripting*. https://html.spec.whatwg.org/multipage/scripting.html

7. Webpack Contributors. (2024). *Webpack Documentation - Tree Shaking*. https://webpack.js.org/guides/tree-shaking/

8. Vite Team. (2024). *Vite Documentation - Why Vite*. https://vitejs.dev/guide/why.html

9. Rollup Contributors. (2024). *Rollup Documentation - Tree-shaking*. https://rollupjs.org/introduction/

10. Evan Wallace. (2020). *esbuild - An extremely fast JavaScript bundler*. https://esbuild.github.io/

11. S. Vercel. (2023). *Turbopack: The Rust-based Web Bundler*. Vercel Blog. https://turbo.build/pack/docs

12. G. Berriman, L. Denicola. (2023). *require(esm): The Final Migration*. Node.js Blog. https://nodejs.org/en/blog/announcements/require-esm

13. M. Sutton, K. Wilson. (2022). *Static Analysis of JavaScript Module Dependencies for Tree-shaking*. *Proceedings of the ACM on Programming Languages*, 6(OOPSLA), 1-25. https://doi.org/10.1145/3563352

14. D. Crockford. (2019). *JavaScript: The Good Parts Revisited*. *ACM Queue*, 17(4), 50-65. https://doi.org/10.1145/3365600

## 17. 延伸阅读

### 17.1 规范与提案

- **ECMAScript 规范 - Modules**：https://tc39.es/ecma262/#sec-modules - 官方 ESM 规范
- **Node.js 模块文档**：https://nodejs.org/api/esm.html - Node.js ESM 实现细节
- **Import Attributes 提案**：https://github.com/tc39/proposal-import-attributes - JSON、CSS 等模块类型
- **Module Declarations 提案**：https://github.com/tc39/proposal-module-declarations - HTML 中直接写模块

### 17.2 打包工具文档

- **Webpack 文档**：https://webpack.js.org/concepts/ - 核心概念与配置
- **Vite 文档**：https://vitejs.dev/guide/ - 新一代构建工具
- **Rollup 文档**：https://rollupjs.org/ - 库打包首选
- **esbuild 文档**：https://esbuild.github.io/ - 极速打包
- **Turbopack 文档**：https://turbo.build/pack/docs - Rust 实现

### 17.3 进阶主题

- **Module Federation**：https://module-federation.io/ - 微前端架构的模块共享
- **Import Maps**：https://github.com/WICG/import-maps - 浏览器原生模块映射
- **Service Worker 模块**：https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API - 离线模块缓存
- **Web Workers 与 ESM**：https://developer.mozilla.org/en-US/docs/Web/API/Worker/importScripts - Worker 中使用模块

### 17.4 实战资源

- **Awesome JavaScript Modules**：https://github.com/ - 模块化资源汇总
- **npm 包发布指南**：https://docs.npmjs.com/creating-and-publishing-unscoped-public-packages
- **Monorepo 工具对比**：https://monorepo.tools/ - pnpm/yarn/nx workspace
- **madge - 循环依赖检测**：https://github.com/pahen/madge

### 17.5 迁移与现代化

- **CommonJS to ESM 迁移指南**：https://nodejs.org/api/esm.html#commonjs-namespaces
- **require(esm) 说明**：https://nodejs.org/api/modules.html#loading-ecmascript-modules-using-require
- **TypeScript 模块配置**：https://www.typescriptlang.org/docs/handbook/modules.html
- **Babel 模块转换**：https://babeljs.io/docs/en/babel-plugin-transform-modules-commonjs

## 附录 A：模块系统 API 速查

### A.1 CommonJS

```javascript
// 导出
module.exports = { add, subtract };
exports.multiply = (a, b) => a * b;

// 导入
const { add, subtract } = require('./math.js');
const math = require('./math.js');

// 元信息
console.log(__dirname);  // 当前目录
console.log(__filename); // 当前文件路径
console.log(require.cache); // 模块缓存
console.log(require.main); // 入口模块

// 动态 require
const handler = require(`./handlers/${name}.js`);
```

### A.2 ES Modules

```javascript
// 具名导出
export function add(a, b) {
  return a + b;
}
export const PI = 3.14;

// 默认导出
export default function main() {}

// 重命名导出
export { add as sum };

// 具名导入
import { add, PI } from './math.js';

// 默认导入
import main from './main.js';

// 混合导入
import main, { add, PI } from './utils.js';

// 命名空间导入
import * as math from './math.js';

// 动态导入
const module = await import('./feature.js');

// 元信息
console.log(import.meta.url);
```

### A.3 Node.js 特有

```javascript
// ESM 中获取 __dirname
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// JSON 导入（Node.js 22+）
import data from './data.json' with { type: 'json' };

// 检测是否在 ESM 中
import { isMainThread } from 'worker_threads';

// process 对象（ESM 中也可用）
import process from 'process';
console.log(process.version);
```

## 附录 B：模块解析流程详解

### B.1 CommonJS 解析流程

```
require('lodash')
  │
  ├─ 核心模块？ ─── 是 ─── 返回内置模块
  │
  ├─ 相对路径？ ─── 是 ─── 查找文件
  │   ├─ ./math
  │   ├─ ./math.js
  │   ├─ ./math.json
  │   ├─ ./math.node
  │   ├─ ./math/index.js
  │   └─ ./math/package.json main
  │
  └─ node_modules 查找
      ├─ /当前/node_modules/lodash
      ├─ /父/node_modules/lodash
      ├─ /祖父/node_modules/lodash
      └─ /node_modules/lodash
```

### B.2 ESM 解析流程

```
import 'lodash'
  │
  ├─ 裸模块说明符？
  │   ├─ 是 ─── node_modules 查找（同 CJS）
  │   │         但优先使用 package.json exports
  │   │
  │   └─ 否（相对/绝对路径）── 必须包含扩展名
  │       ├─ ./math.js
  │       ├─ ./math.mjs
  │       └─ 目录: ./math/index.js
  │
  └─ URL 导入（浏览器）
      import 'https://cdn.skypack.dev/lodash'
```

### B.3 条件导出解析

```json
// package.json
{
  "exports": {
    ".": {
      "types": "./types/index.d.ts",
      "import": "./esm/index.js",
      "require": "./cjs/index.cjs",
      "browser": "./browser/index.js",
      "default": "./cjs/index.cjs"
    }
  }
}
```

解析顺序：

1. `types`：TypeScript 解析类型
2. `import`：ESM `import` 时
3. `require`：CJS `require` 时
4. `browser`：浏览器环境
5. `default`：兜底

## 附录 C：模块化性能优化 Checklist

### C.1 打包体积优化

- [ ] 使用 ESM 而非 CJS（启用 Tree-shaking）
- [ ] `package.json` 配置 `"sideEffects": false`
- [ ] 按需导入第三方库（`import { map } from 'lodash-es'`）
- [ ] 使用 Code Splitting 按路由分割
- [ ] 删除未使用的依赖
- [ ] 压缩与混淆代码

### C.2 构建速度优化

- [ ] 减少 `resolve.extensions` 尝试
- [ ] 使用 `resolve.alias` 缩短路径
- [ ] 排除 `node_modules`（`exclude: /node_modules/`）
- [ ] 使用缓存（`cache: true`）
- [ ] 并行处理（`thread-loader`、`terser-webpack-plugin` parallel）
- [ ] 使用 esbuild/Vite 替代 Webpack

### C.3 运行时性能

- [ ] 按需加载大模块（`import()`）
- [ ] 预获取关键路由（`webpackPrefetch`）
- [ ] 避免顶层 await 阻塞
- [ ] 减少循环依赖
- [ ] 避免模块顶层重计算

### C.4 可维护性

- [ ] 每个模块单一职责
- [ ] 优先具名导出
- [ ] 避免深度嵌套导入路径
- [ ] 使用 `exports` 控制公开 API
- [ ] 定期检测循环依赖（`madge --circular`）
- [ ] 文档化模块边界

## 附录 D：ESM 与 CommonJS 互操作矩阵

| 场景 | 支持情况 | 说明 |
| :--- | :--- | :--- |
| ESM `import` CJS | 支持 | CJS 的 `module.exports` 作为 `default` |
| CJS `require` ESM | Node.js 22+ 支持 | 需 `--experimental-require-module` |
| CJS 动态 `import()` ESM | 支持 | 返回 Promise |
| ESM `import` CJS 具名 | 部分支持 | 需 CJS 模块静态分析可识别导出 |
| ESM 顶层 await | 支持 | CJS `require` 不支持顶层 await 模块 |

## 附录 E：常见问题 FAQ

### E.1 为什么 ESM 的 `import` 必须在顶层？

ESM 设计目标是支持静态分析（Tree-shaking、循环依赖检测）。若允许 `import` 在条件分支中，依赖图只能在运行时构建，丧失静态分析能力。动态需求使用 `import()`。

### E.2 为什么 ESM 的 `import` 必须包含扩展名？

ESM 规范要求路径精确，避免不同环境（浏览器、Node.js）解析不一致。浏览器原生 ESM 强制要求完整 URL，Node.js 为兼容性也要求扩展名。

### E.3 如何在 ESM 中使用 `__dirname`？

```javascript
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
```

### E.4 如何在 ESM 中导入 JSON？

```javascript
// Node.js 22+
import data from './data.json' with { type: 'json' };

// 旧版本 Node.js
import fs from 'fs';
const data = JSON.parse(fs.readFileSync('./data.json', 'utf-8'));
```

### E.5 `exports` 和 `main` 字段冲突时哪个优先？

`exports` 优先。`main` 仅作为兜底，当 `exports` 未定义时使用。

### E.6 如何检测模块是否被正确 Tree-shake？

```bash
# 使用 webpack-bundle-analyzer
npm run analyze

# 检查打包后的文件是否包含未使用的导出
grep "unusedFunction" dist/bundle.js  # 应无结果
```

### E.7 循环依赖一定会导致 bug 吗？

不一定。若循环依赖的模块在顶层不立即使用对方导出，而是在函数内延迟使用，则不会出问题：

```javascript
// a.js
import { b } from './b.js';
export function a() {
  return b(); // 调用时 b 已完成初始化
}

// b.js
import { a } from './a.js';
export function b() {
  return a();
}
```

## 附录 F：模块化演进趋势

### F.1 Import Attributes（ES2024）

支持导入 JSON、CSS、WebAssembly 等非 JS 模块：

```javascript
import data from './data.json' with { type: 'json' };
import styles from './styles.css' with { type: 'css' };
import wasm from './module.wasm' with { type: 'webassembly' };
```

### F.2 Module Declarations（提案）

在 HTML 中直接声明模块，无需 `<script type="module">`：

```html
<script type="module">
  module foo {
    export function greet() {
      console.log('hello');
    }
  }
</script>
```

### F.3 Import Maps

浏览器原生模块映射，无需打包：

```html
<script type="importmap">
{
  "imports": {
    "lodash": "https://cdn.skypack.dev/lodash-es",
    "react": "https://esm.sh/react@18"
  }
}
</script>

<script type="module">
  import _ from 'lodash';
  import React from 'react';
</script>
```

### F.4 Module Federation（微前端）

Webpack 5 引入的模块联邦，支持跨应用共享模块：

```javascript
// host webpack.config.js
new ModuleFederationPlugin({
  remotes: {
    app1: 'app1@http://localhost:3001/remoteEntry.js',
  },
});

// host 代码
import Button from 'app1/Button';
```

### F.5 Node.js 22 的 `require(esm)`

打破 CJS 与 ESM 的最后壁垒：

```javascript
// CJS 直接 require ESM（Node.js 22+，实验性）
const esmMod = require('./esm-mod.mjs');
```

**未来展望**：ESM 将成为唯一的模块标准，CommonJS 逐步退出历史舞台。打包工具将更专注于性能优化而非语法转换。

---

**总结**：JavaScript 模块化从 IIFE 到 ESM 经历了 30 年演进，ESM 以静态分析、Live Binding、Tree-shaking 能力成为最终标准。理解 CommonJS 与 ESM 的本质差异、掌握 `package.json` 的 `exports` 配置、选择合适的打包工具、避免循环依赖与 Tree-shaking 失效，是构建高质量 JavaScript 项目的关键。Node.js 22 的 `require(esm)` 标志着两大模块系统的最终融合，未来 ESM 将一统天下，但过渡期内仍需关注双格式发布与互操作细节。
