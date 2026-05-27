# JavaScript 模块化 (Modularity)
 False
 False> @Version: v4.0.0
 False> @Module: C08-模块化
 False
 False> @Author: Anonymous
 False> @Category: JS Basics
 False> @Description: 对比 CommonJS 与 ES Modules，讲清导入导出、默认/具名、动态加载、循环依赖与工程化落地。 | CommonJS vs ESM, exports/imports, dynamic import, circular deps, and practical tooling notes.
 False
 False---
 False
 False## 目录
 False
 False1. [为什么需要模块化](#为什么需要模块化)
 False2. [CommonJS（Node.js 传统模块）](#commonjsnodejs-传统模块)
 False3. [ES Modules（ESM，浏览器与现代 Node）](#es-modulesesm浏览器与现代-node)
 False4. [ESM vs CommonJS（关键差异）](#esm-vs-commonjs关键差异)
 False5. [AMD 与 CMD（历史方案）](#amd-与-cmd历史方案)
 False6. [模块打包工具](#模块打包工具)
 False7. [Node.js 中的 ESM 实践](#nodejs-中的-esm-实践)
 False8. [模块化最佳实践](#模块化最佳实践)
 False
 False---
 False
 False## 1. 为什么需要模块化 (Why Modules)
 False
 False### 1.1 没有模块化的痛点
 False
 False早期 JavaScript 没有原生模块系统，所有脚本共享全局作用域：
 False
```html
 True<script src="lib.js"></script>
 True<script src="utils.js"></script>
 True<script src="app.js"></script>
 True```

 False问题：
 False
 False- **全局变量污染**：不同脚本中的同名变量互相覆盖
 False- **依赖关系不明确**：脚本加载顺序决定运行结果
 False- **难以维护**：项目变大后，变量来源无法追踪
 False
 False### 1.2 模块化的目标
 False
 False- 隔离作用域，避免全局变量污染
 False- 组织代码与依赖，提高可维护性
 False- 支持复用、测试、按需加载与打包优化
 False
 False### 1.3 模块化演进时间线
 False
```
 True全局函数 → 命名空间 → IIFE → CommonJS → AMD/CMD → ES Modules
 True(2005) (2007) (2009) (2009) (2011) (2015)
 True```

 False**IIFE（立即执行函数）**——早期模拟模块化的方式：
 False
```js
 Trueconst module = (function () {
 True const private = 'secret'
 True function privateFn() { return private }
 True function publicFn() { return privateFn() }
 True return { publicFn }
 True})()
 True
 Truemodule.publicFn()
 Truemodule.private
 True```

 False---
 False
 False## 2. CommonJS（Node.js 传统模块）
 False
 False### 2.1 核心语法
 False
```js
 True// add.cjs
 Truefunction add(a, b) { return a + b }
 Truemodule.exports = { add }
 True
 True// main.cjs
 Trueconst { add } = require('./add.cjs')
 Trueconsole.log(add(1, 2))
 True```

 False特性要点：
 False
 False- `require()` 是运行时加载（可以写在条件分支中）
 False- 导出对象是可变引用：`module.exports` / `exports`
 False- 循环依赖时拿到的可能是"未完成初始化"的导出对象（半成品）
 False
 False### 2.2 `module.exports` vs `exports`
 False
```js
 Trueexports.add = function (a, b) { return a + b }
 Trueexports.sub = function (a, b) { return a - b }
 True
 Truemodule.exports = { add, sub }
 True```

 False**关键区别**：
 False
 False- `exports` 是 `module.exports` 的引用，`exports.x = ...` 等价于 `module.exports.x = ...`
 False- `exports = { ... }` 不会修改 `module.exports`，是无效写法
 False- `module.exports = { ... }` 会替换整个导出对象
 False
```js
 Trueexports = { add }
 Truemodule.exports.add
 True
 Truemodule.exports = { add }
 Truemodule.exports.add
 True```

 False### 2.3 `require()` 的工作机制
 False
```js
 Trueconst mod = require('./math')
 True```

 False`require` 的解析规则：
 False
 False1. **核心模块**：`require('fs')` → 直接返回 Node.js 内置模块
 False2. **文件模块**：`require('./math')` → 按 `.js`/`.json`/`.node` 顺序查找
 False3. **目录模块**：`require('./dir')` → 查找 `dir/index.js` 或 `dir/package.json` 的 `main` 字段
 False4. **node_modules**：`require('lodash')` → 从当前目录向上逐级查找 `node_modules/lodash`
 False
 False### 2.4 模块缓存
 False
 FalseCommonJS 模块首次 `require` 后会被缓存，后续 `require` 返回同一对象：
 False
```js
 Trueconst a = require('./counter')
 Trueconst b = require('./counter')
 Truea === b
 True
 Truea.increment()
 Trueb.getCount()
 True```

```js
 Truelet count = 0
 Truefunction increment() { count++ }
 Truefunction getCount() { return count }
 Truemodule.exports = { increment, getCount }
 True```

 False清除缓存（特殊场景）：
 False
```js
 Truedelete require.cache[require.resolve('./counter')]
 True```

 False### 2.5 CommonJS 循环依赖详解
 False
```js
 True// a.cjs
 Trueconst b = require('./b.cjs')
 Trueconsole.log('a: b.loaded =', b.loaded)
 Trueexports.loaded = true
 True
 True// b.cjs
 Trueconst a = require('./a.cjs')
 Trueconsole.log('b: a.loaded =', a.loaded)
 Trueexports.loaded = true
 True
 True// main.cjs
 Truerequire('./a.cjs')
 True```

 False执行流程：
 False
 False1. `main` 加载 `a.cjs`
 False2. `a.cjs` 执行到 `require('./b.cjs')`，暂停 `a` 的执行
 False3. `b.cjs` 执行到 `require('./a.cjs')`，此时 `a` 还没执行完，拿到的是**半成品**
 False4. `b.cjs` 输出 `a.loaded = undefined`，然后 `b` 执行完毕
 False5. 回到 `a.cjs`，`b.loaded = true`，`a` 执行完毕
 False
 False**应对策略**：
 False
 False- 避免在模块顶层立即执行依赖模块的逻辑
 False- 把依赖使用延迟到函数内部，降低循环依赖的初始化风险
 False- 重构模块结构，消除循环依赖
 False
```js
 True// 改进：延迟使用依赖
 Trueconst b = require('./b.cjs')
 True
 Trueexports.doSomething = function () {
 True return b.doOther()
 True}
 True```

 False---
 False
 False## 3. ES Modules（ESM，浏览器与现代 Node）
 False
 False### 3.1 具名导出/导入 (Named)
 False
```js
 True// math.js
 Trueexport function add(a, b) { return a + b }
 Trueexport const PI = 3.14159
 True
 True// main.js
 Trueimport { add, PI } from './math.js'
 Trueconsole.log(add(1, 2), PI)
 True```

 False**重命名导入**：
 False
```js
 Trueimport { add as sum, PI as pi } from './math.js'
 Trueconsole.log(sum(1, 2), pi)
 True```

 False**重命名导出**：
 False
```js
 Trueexport { add as sum, PI as pi }
 True```

 False### 3.2 默认导出/导入 (Default)
 False
```js
 True// logger.js
 Trueexport default function log(msg) { console.log(msg) }
 True
 True// main.js
 Trueimport log from './logger.js'
 Truelog('hello')
 True```

 False实践建议：
 False
 False- 默认导出适合"一个模块一个核心能力"的场景
 False- 工程协作中更推荐具名导出，便于重构与自动补全
 False
 False**默认导出与具名导出可以共存**：
 False
```js
 True// utils.js
 Trueexport default function main() { console.log('main') }
 Trueexport function helper() { console.log('helper') }
 True
 True// main.js
 Trueimport mainFn, { helper } from './utils.js'
 TruemainFn()
 Truehelper()
 True```

 False### 3.3 `import * as ns`
 False
```js
 Trueimport * as math from './math.js'
 Trueconsole.log(math.add(1, 2))
 True```

 False命名空间导入的对象是**只读视图**（live binding），不能修改：
 False
```js
 Truemath.add = null
 True```

 False### 3.4 动态导入 (Dynamic import)
 False
 False动态导入返回 Promise，适合按需加载与拆包：
 False
```js
 Trueasync function loadFeature() {
 True const mod = await import('./feature.js')
 True mod.run()
 True}
 True```

 False**典型应用场景**：
 False
```js
 True// 按路由懒加载
 Truerouter.addRoute('/dashboard', async () => {
 True const { Dashboard } = await import('./pages/Dashboard.js')
 True return Dashboard
 True})
 True
 True// 条件加载
 Trueif (supportsWebGL()) {
 True const { render3D } = await import('./renderer-3d.js')
 True render3D()
 True} else {
 True const { render2D } = await import('./renderer-2d.js')
 True render2D()
 True}
 True
 True// 错误降级
 Truetry {
 True const mod = await import('./feature.js')
 True mod.init()
 True} catch (err) {
 True console.warn('Feature unavailable, falling back')
 True}
 True```

 False### 3.5 `import.meta`
 False
 FalseESM 模块中可访问模块自身元信息：
 False
```js
 Trueconsole.log(import.meta.url)
 True```

 False在浏览器中返回模块的完整 URL；在 Node.js 中返回 `file://` 协议的路径。
 False
 False### 3.6 ESM 的静态分析特性
 False
 FalseESM 的 `import`/`export` 必须在顶层，这使得打包工具可以在编译时分析依赖图：
 False
```js
 Trueimport { add } from './math.js'
 True```

 False**静态分析的优势**：
 False
 False- **Tree-shaking**：移除未使用的导出
 False- **提前发现错误**：拼写错误的导入路径在编译时就能报错
 False- **循环依赖检测**：构建工具可以提前警告
 False
```js
 Trueif (condition) {
 True import { add } from './math.js'
 True}
 True```

 False### 3.7 ESM 的 Live Binding
 False
 FalseESM 的导入是**实时绑定**，而非值拷贝：
 False
```js
 True// counter.js
 Trueexport let count = 0
 Trueexport function increment() { count++ }
 True
 True// main.js
 Trueimport { count, increment } from './counter.js'
 Trueconsole.log(count)
 Trueincrement()
 Trueconsole.log(count)
 True```

 False这与 CommonJS 的值拷贝形成鲜明对比：
 False
```js
 True// counter.cjs
 Truelet count = 0
 Truefunction increment() { count++ }
 Truemodule.exports = { count, increment }
 True
 True// main.cjs
 Trueconst { count, increment } = require('./counter.cjs')
 Trueconsole.log(count)
 Trueincrement()
 Trueconsole.log(count)
 True```

 False---
 False
 False## 4. ESM vs CommonJS（关键差异）
 False
 False| 维度 | CommonJS | ES Modules |
 False| :-- | :-- | :-- |
 False| 加载时机 | 运行时 | 静态分析 + 运行时 |
 False| 语法位置 | 可在任意位置 `require` | 顶层 `import/export`（动态导入除外） |
 False| 导出绑定 | 值拷贝/对象引用（可变） | 实时绑定（live binding） |
 False| 循环依赖 | 拿到半成品 | 拿到引用但可能未初始化 |
 False| Tree-shaking | 困难（运行时加载） | 原生支持 |
 False| `this` 顶层的值 | `module.exports` | `undefined` |
 False| 生态 | Node 传统 | 浏览器/现代 Node/打包器 |
 False| 文件扩展名 | `.cjs` / `.js` | `.mjs` / `.js`(type:module) |
 False
 False### 4.1 导出绑定差异示例
 False
```js
 True// CommonJS
 Truelet value = 1
 TruesetTimeout(() => { value = 2 }, 100)
 Truemodule.exports = { value }
 True
 Trueconst { value } = require('./mod.cjs')
 TruesetTimeout(() => console.log(value), 200)
 True```

```js
 True// ESM
 Trueexport let value = 1
 TruesetTimeout(() => { value = 2 }, 100)
 True
 Trueimport { value } from './mod.js'
 TruesetTimeout(() => console.log(value), 200)
 True```

 False### 4.2 `this` 差异
 False
```js
 Trueconsole.log(this)
 True```

 False---
 False
 False## 5. AMD 与 CMD（历史方案）
 False
 False### 5.1 AMD（Asynchronous Module Definition）
 False
 FalseAMD 是浏览器端最早的异步模块规范，代表实现是 **RequireJS**：
 False
```js
 Truedefine(['jquery', 'underscore'], function ($, _) {
 True function doSomething() {
 True return _.map([1, 2, 3], n => n * 2)
 True }
 True return { doSomething }
 True})
 True
 Truerequire(['myModule'], function (myModule) {
 True myModule.doSomething()
 True})
 True```

 False特点：
 False
 False- **异步加载**：浏览器环境不会阻塞页面渲染
 False- **依赖前置**：所有依赖在 `define` 第一个参数中声明，加载后执行回调
 False- **回调函数**：模块定义在回调函数中
 False
 False### 5.2 CMD（Common Module Definition）
 False
 FalseCMD 是国内提出的规范，代表实现是 **SeaJS**：
 False
```js
 Truedefine(function (require, exports, module) {
 True const $ = require('jquery')
 True
 True function doSomething() {
 True const _ = require('underscore')
 True return _.map([1, 2, 3], n => n * 2)
 True }
 True
 True exports.doSomething = doSomething
 True})
 True```

 False特点：
 False
 False- **依赖就近**：`require` 可以在函数体内任意位置调用
 False- **按需加载**：只在真正使用时才加载依赖
 False- **写法更接近 CommonJS**
 False
 False### 5.3 AMD vs CMD 对比
 False
 False| 对比项 | AMD | CMD |
 False|:--|:--|:--|
 False| 代表实现 | RequireJS | SeaJS |
 False| 依赖声明 | 前置（define 参数） | 就近（函数体内 require） |
 False| 执行时机 | 依赖全部加载后执行 | 遇到 require 时执行 |
 False| 推广范围 | 国际 | 国内（阿里系） |
 False
 False> [提示] **现状**：AMD/CMD 已被 ESM 完全取代，了解即可。现代项目统一使用 ESM。
 False
 False---
 False
 False## 6. 模块打包工具
 False
 False### 6.1 为什么需要打包工具
 False
 False浏览器不支持 `require()`，也不支持 Node.js 的模块解析规则。打包工具解决：
 False
 False- 模块语法转换（ESM/CJS → 浏览器可执行代码）
 False- 依赖图构建与打包
 False- 代码分割（Code Splitting）
 False- 资源处理（CSS、图片、字体等）
 False- 开发服务器与热更新（HMR）
 False
 False### 6.2 Webpack
 False
 FalseWebpack 是最成熟的打包工具，核心概念：
 False
```js
 True// webpack.config.js
 Truemodule.exports = {
 True entry: './src/index.js',
 True output: {
 True path: path.resolve(__dirname, 'dist'),
 True filename: '[name].[contenthash].js'
 True },
 True module: {
 True rules: [
 True { test: /\.js$/, use: 'babel-loader', exclude: /node_modules/ },
 True { test: /\.css$/, use: ['style-loader', 'css-loader'] }
 True ]
 True },
 True plugins: [
 True new HtmlWebpackPlugin({ template: './public/index.html' })
 True ],
 True optimization: {
 True splitChunks: {
 True chunks: 'all'
 True }
 True }
 True}
 True```

 False**核心概念**：
 False
 False- **Entry**：打包入口
 False- **Output**：输出配置
 False- **Loader**：处理非 JS 文件（CSS、图片等）
 False- **Plugin**：扩展功能（压缩、HTML 生成等）
 False- **Code Splitting**：代码分割，按需加载
 False
 False**动态导入与代码分割**：
 False
```js
 Trueconst Dashboard = React.lazy(() => import('./pages/Dashboard'))
 True```

 False### 6.3 Vite
 False
 FalseVite 是新一代构建工具，开发时利用浏览器原生 ESM，生产构建使用 Rollup：
 False
```js
 True// vite.config.js
 Trueimport { defineConfig } from 'vite'
 Trueimport react from '@vitejs/plugin-react'
 True
 Trueexport default defineConfig({
 True plugins: [react()],
 True build: {
 True rollupOptions: {
 True output: {
 True manualChunks: {
 True vendor: ['react', 'react-dom']
 True }
 True }
 True }
 True }
 True})
 True```

 False**Vite vs Webpack 对比**：
 False
 False| 对比项 | Webpack | Vite |
 False|:--|:--|:--|
 False| 开发启动 | 全量打包后启动 | 按需编译，秒级启动 |
 False| HMR 速度 | 随项目增大变慢 | 始终快速（基于 ESM） |
 False| 生产构建 | 自身打包 | Rollup |
 False| 配置复杂度 | 较高 | 较低 |
 False| 生态成熟度 | 非常成熟 | 快速成长中 |
 False| 适用场景 | 大型/复杂项目 | 新项目/快速迭代 |
 False
 False### 6.4 其他工具简介
 False
 False- **Rollup**：专注于库打包，Tree-shaking 效果最好
 False- **esbuild**：Go 语言编写，编译速度极快
 False- **Parcel**：零配置打包工具
 False- **Turbopack**：Vercel 推出的增量打包工具（Next.js 集成）
 False
 False---
 False
 False## 7. Node.js 中的 ESM 实践
 False
 False### 7.1 启用 ESM 的方式
 False
 False常见做法（择一）：
 False
 False- `package.json` 设置 `"type": "module"`，`.js` 视为 ESM
 False- 使用 `.mjs` 后缀明确为 ESM
 False- 继续用 `.cjs` 保持 CommonJS
 False
```json
 True{
 True "name": "my-project",
 True "type": "module"
 True}
 True```

 False### 7.2 ESM 中的文件扩展名
 False
 FalseESM 的 `import` 要求相对路径必须包含完整扩展名：
 False
```js
 Trueimport { add } from './math.js'
 Trueimport { add } from './math'
 True```

 False这与 CommonJS 不同（CJS 可以省略扩展名）。
 False
 False### 7.3 互操作注意
 False
 False#### ESM 导入 CommonJS
 False
```js
 Trueimport pkg from 'cjs-pkg'
 True```

 False常见会把 `module.exports` 映射到 `default`。若需要具名导入，可使用：
 False
```js
 Trueimport cjsPkg from 'cjs-pkg'
 Trueconst { method1, method2 } = cjsPkg
 True```

 False或使用命名空间导入：
 False
```js
 Trueimport * as cjsPkg from 'cjs-pkg'
 TruecjsPkg.default.method1()
 True```

 False#### CommonJS 引入 ESM
 False
```js
 Trueconst esmMod = await import('./esm-module.js')
 TrueesmMod.default()
 TrueesmMod.namedExport()
 True```

 FalseCJS 中只能使用动态 `import()` 引入 ESM 模块，不能使用 `require()`。
 False
 False### 7.4 `package.json` 的 `exports` 字段
 False
```json
 True{
 True "name": "my-lib",
 True "exports": {
 True ".": {
 True "import": "./dist/esm/index.js",
 True "require": "./dist/cjs/index.js",
 True "default": "./dist/cjs/index.js"
 True },
 True "./utils": {
 True "import": "./dist/esm/utils.js",
 True "require": "./dist/cjs/utils.js"
 True }
 True }
 True}
 True```

 False`exports` 字段可以：
 False- 为 ESM 和 CJS 提供不同的入口
 False- 控制哪些子路径可以被外部导入（限制内部模块暴露）
 False- 优先于 `main` 字段
 False
 False---
 False
 False## 8. 模块化最佳实践
 False
 False### 8.1 导出设计原则
 False
 False**一个模块一个职责**：
 False
```js
 Trueexport function formatDate(date) { ... }
 Trueexport function parseDate(str) { ... }
 True```

 False**避免默认导出 + 大量具名导出混合**：
 False
```js
 Trueexport default class User { ... }
 Trueexport function validateUser() { ... }
 Trueexport function serializeUser() { ... }
 True```

 False**推荐使用具名导出**：
 False
```js
 Trueexport class User { ... }
 Trueexport function validateUser() { ... }
 Trueexport function serializeUser() { ... }
 True```

 False优势：
 False- 重构时 IDE 可以自动更新导入
 False- Tree-shaking 更精确
 False- 导入时名称一致，避免不同文件中同一模块不同命名
 False
 False### 8.2 Barrel Export（桶导出）
 False
```js
 Trueexport { User } from './User.js'
 Trueexport { Post } from './Post.js'
 Trueexport { Comment } from './Comment.js'
 True```

 False使用方：
 False
```js
 Trueimport { User, Post } from './models/index.js'
 True```

 False[警告] **注意**：Barrel export 可能导致 Tree-shaking 失效，因为打包工具难以确定哪些导出实际被使用。在库开发中慎用。
 False
 False### 8.3 避免循环依赖
 False
 False检测循环依赖：
 False
```bash
 Truenpx madge --circular src/
 True```

 False消除循环依赖的策略：
 False
 False1. **提取共享模块**：将循环依赖的部分提取到第三个模块
 False2. **接口反转**：使用回调或事件代替直接调用
 False3. **延迟导入**：将 `import` 移到函数内部（ESM 用动态 `import()`）
 False
```
 TrueBefore: After:
 TrueA → B → A A → C ← B
 True (C 是提取的共享模块)
 True```

 False### 8.4 副作用控制
 False
 False在 `package.json` 中声明副作用：
 False
```json
 True{
 True "sideEffects": false
 True}
 True```

 False或指定有副作用的文件：
 False
```json
 True{
 True "sideEffects": ["*.css", "./src/polyfills.js"]
 True}
 True```

 False这帮助打包工具更激进地进行 Tree-shaking。
 False
 False### 8.5 模块路径别名
 False
 False避免深层相对路径：
 False
```js
 Trueimport { utils } from '../../../../shared/utils'
 True```

 False配置别名：
 False
```js
 True// vite.config.js
 Trueexport default defineConfig({
 True resolve: {
 True alias: {
 True '@': '/src',
 True '@shared': '/src/shared'
 True }
 True }
 True})
 True
 True// jsconfig.json / tsconfig.json
 True{
 True "compilerOptions": {
 True "paths": {
 True "@/*": ["src/*"],
 True "@shared/*": ["src/shared/*"]
 True }
 True }
 True}
 True```

 False使用：
 False
```js
 Trueimport { utils } from '@shared/utils'
 True```

 False### 8.6 模块化检查清单
 False
 False| 检查项 | 说明 |
 False|:--|:--|
 False| 单一职责 | 每个模块只做一件事 |
 False| 显式依赖 | 所有依赖在文件顶部声明 |
 False| 无全局污染 | 不向 `window`/`global` 挂载变量 |
 False| 无隐式副作用 | 模块导入不产生可观测的外部影响 |
 False| 具名导出优先 | 便于 Tree-shaking 和重构 |
 False| 无循环依赖 | 依赖图是 DAG（有向无环图） |
 False| 完整扩展名 | ESM 中使用 `.js` 扩展名 |
 False
 False---
 False
 False##### 延伸阅读

- [[typescript/type-declarations-and-module-resolution|TS 模块解析]]

---

### 更新日志 (Changelog)

- 2026-05-27: v4.0.0 大幅扩充——新增 AMD/CMD 历史方案、Webpack/Vite 打包工具、循环依赖详解、Live Binding 对比、Barrel Export、副作用控制、路径别名、模块化检查清单
- 2026-04-06: 新增「模块化」知识点，补充 CJS/ESM 对比与工程实践要点
 False