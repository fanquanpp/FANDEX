---
order: 400
title: JSDoc 类型驱动开发：不写 .ts 也有完整类型
module: 'typescript'
category: 前端技术
difficulty: intermediate
description: 用 JSDoc 注释获得 TypeScript 级类型检查：checkJs、@type/@typedef/@import、dts 生成与适用边界。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'typescript/030-TypeScriptOverviewEnvSetup'
  - 'typescript/300-DeclarationFileWriting'
  - 'typescript/670-TypeScript5xNewFeatures'
prerequisites:
  - 'typescript/080-BasicTypeSystem'
  - 'javascript/080-FunctionScopeClosure'
---

## 0. 一句话理解

> TypeScript 检查器不只认 `.ts`：在 `.js` 里写 `@type`、`@param` 等 JSDoc 注释，配合 `checkJs` 即可获得几乎完整的类型检查——不改构建链、不加编译步骤，适合脚本、渐进迁移与"只要类型不要转译"的项目。

## 1. 什么时候选 JSDoc 而不是 .ts

| 场景 | 推荐 | 原因 |
| --- | --- | --- |
| 小脚本、CLI 工具、构建配置 | JSDoc | 免构建：Node 直接跑 `.mjs`，tsc 只做检查 |
| 老旧 CJS 项目渐进加类型 | JSDoc | 逐文件、逐函数增量标注，不动打包链 |
| Node 原生类型剥离（type stripping） | JSDoc 或可擦除 TS | 运行时只"剥"类型，不处理枚举等语法 |
| 组件库、大型应用 | `.ts` | 类型级编程、装饰器等表达力 JSDoc 覆盖不了 |
| 需要枚举/命名空间/参数属性 | `.ts` | 这些语法 JSDoc 无对应物 |

本质区别只有一条：**JSDoc 把类型写进注释，源文件保持合法 JavaScript**。

## 2. 开启检查：jsconfig/checkJs

```json
// jsconfig.json（纯 JS 项目）或 tsconfig.json（混合项目）
{
  "compilerOptions": {
    "checkJs": true,          // 对 .js 也执行类型检查
    "allowJs": true,          // 允许参与编译/检查
    "noEmit": true,           // 只检查不产出
    "strict": true,           // 与 TS 项目同一套严格开关
    "maxNodeModuleJsDepth": 1 // 检查 JS 依赖的深度
  },
  "include": ["src/**/*.js", "scripts/**/*.mjs"]
}
```

`npx tsc --noEmit` 即成为 JS 项目的类型检查命令；编辑器（VS Code 内置 TS 语言服务）无需任何配置即可识别 JSDoc 类型。

## 3. 核心标注语法

### 3.1 @type：变量、字段与复杂类型

```javascript
/** @type {string[]} */
const tags = [];

/** @type {{ host: string, port: number, retries?: number }} */
const config = JSON.parse(fs.readFileSync('conf.json', 'utf8'));  // 从 any 变为精确类型

/** @type {Map<string, (event: string) => void>} */
const handlers = new Map();
```

### 3.2 @param / @returns：函数签名

```javascript
/**
 * 合并两个配置对象。
 * @param {Partial<Config>} base 基础配置
 * @param {Partial<Config>} patch 覆盖配置
 * @param {object} [options] 可选参数
 * @param {boolean} [options.deep=false] 是否深合并
 * @returns {Config} 合并结果
 */
function mergeConfig(base, patch, { deep = false } = {}) { /* ... */ }
```

方括号语法标注可选参数，`@param <名>.<子字段>` 还能给对象参数的属性补类型。

### 3.3 @typedef：自定义类型别名

```javascript
/**
 * 用户实体。
 * @typedef {object} User
 * @property {number} id 用户 ID
 * @property {string} name 昵称
 * @property {'admin' | 'member'} role 角色
 */

/** @param {User} user */
function greet(user) { return `hi, ${user.name}`; }
```

`@typedef` 写在哪个文件，其他文件就能 `import` 那个类型（配合 `import()` 类型）：

```javascript
/** @param {import('./types.js').User} user */
function validate(user) {}
```

### 3.4 @import：TS 5.5+ 的导入语法

```javascript
/** @import { User, Role } from './types.js' */

/** @param {User} user */
function save(user) {}
```

比 `import()` 内联类型更整洁，且 `@import * as ns from './x.js'` 支持命名空间形式。另有 `@satisfies`（对齐 `satisfies` 操作符，见 `typescript/180-SatisfiesOperator`）。

## 4. 类型收窄在 JS 里同样生效

```javascript
/**
 * @param {string | null} input
 */
function render(input) {
  if (input === null) return '';   // 收窄生效
  return input.toUpperCase();      // 此处 input: string
}

/** @type {HTMLElement | null} */
const el = document.querySelector('#app');
if (el) el.textContent = 'ok';     // DOM 类型自动收窄
```

泛型、条件类型、`keyof`、`as const`（写法 `/** @type {const} */` 或括号断言）在 JSDoc 中都有对应物；唯一成体系缺失的是**类型级编程的舒适度**——复杂类型体操请回 `.ts`。

## 5. 生成 .d.ts：库发布的 JSDoc 路线

```json
{
  "compilerOptions": {
    "allowJs": true,
    "declaration": true,
    "emitDeclarationOnly": true,
    "outDir": "dist/types"
  }
}
```

`tsc` 从带 JSDoc 的 JS 源码直接产出声明文件——即"JSDoc 写类型、tsc 出 dts"的库发布路线。配合 TS 5.5 的 `isolatedDeclarations`（见 `typescript/670-TypeScript5xNewFeatures`），产出更快、更可预测。发布卫生（exports/files 字段）见 `javascript/560-PackageJsonEngineeringDeepDive`。

## 6. 与 Node 类型剥离的关系

Node 的原生类型剥离要求 `.ts` 文件只含"可擦除"语法（枚举、命名空间、参数属性都不行，`--erasableSyntaxOnly` 同源约束）。JSDoc 天然满足：**注释会被剥离，源文件就是合法 JS**。因此"Node 直跑 + 完整类型"的最稳组合是：`.mjs` + JSDoc + `tsc --noEmit` 检查。

## 7. 常见陷阱

| 陷阱 | 说明 | 正确做法 |
| --- | --- | --- |
| 忘开 checkJs | 注释写了但从不检查 | jsconfig/tsconfig 显式开启 |
| `@typedef` 藏在深层作用域 | 导入方找不到类型 | 集中放 types.js 或模块顶层 |
| JSDoc 里写 TS 专属语法 | 枚举、interface 声明体 | 用 union 字符串、`@typedef {object}` |
| any 穿透 JSON.parse | 配置对象全 any | `@type` 标注或运行时 Schema 校验 |
| 期望与 .ts 完全等价 | 装饰器、重载书写体验受限 | 类型复杂度超阈值即迁 .ts |

## 8. 动手试试

1. 把一个工具脚本改造成"`.mjs` + JSDoc + `tsc --noEmit`"，故意传错参数验证报错；
2. 用 `@typedef` 抽出重复的配置对象类型，并用 `import()` 类型在第二个文件中复用；
3. 给一个 JS 库加 `emitDeclarationOnly` 产出 `.d.ts`，在 TS 项目里消费验证提示；
4. 体验 `@import` 与 `@satisfies`（TS 5.5+），对比 `import()` 内联写法的可读性。

## 9. 一句话记住

> JSDoc 是"注释里的 TypeScript"：checkJs 打开即得完整检查，@type/@typedef/@import 覆盖九成需求，tsc 还能从 JS 源码直接产出 .d.ts——类型复杂度一旦越界，再迁 .ts 不迟。
