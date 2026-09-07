---
order: 400
title: 模块打包原理与 Tree Shaking
module: 'javascript'
category: 前端技术
difficulty: advanced
description: '讲清打包器把模块变成浏览器可运行文件的原理，以及 Tree Shaking 为什么只能"摇掉"没被用到的 ESM 导出。'
author: fanquanpp
updated: '2026-08-30'
related:
  - 'javascript/038-JavaScriptModular'
  - 'javascript/039-ModuleDynamicImportCodeSplitting'
prerequisites:
  - 'javascript/038-JavaScriptModular'
---


## 一句话理解

打包器把"浏览器无法直接运行的模块文件"合并成"浏览器能直接运行的 chunk"；
Tree Shaking 则是在合并时识别并删除**从未被使用的导出**，让产物更小。

## 为什么需要了解

- 浏览器原生 ESM 虽然可用，但请求数多、无压缩协作，生产环境仍然要打包。
- Tree Shaking 决定你的包体积：按需引入库时，摇不掉就白按需。
- 理解 chunk 与依赖图，才能看懂构建产物分析和代码分割。

## 打包器做了什么：三步

1. **解析模块图**：从入口文件出发，追踪每个 import，形成依赖树。
2. **转换与合并**：把 ESM 转成可执行的代码，按引用关系拼接成 chunk。
3. **优化输出**：压缩、去重、Tree Shaking、代码分割（多 chunk）。

```javascript
// 入口 main.js
import { add } from './math.js';
console.log(add(1, 2));

// math.js 导出了两个函数
export function add(a, b) { return a + b; }
export function sub(a, b) { return a - b; } // 从未被引用
```

打包器静态分析后发现 `sub` 没有被引用，最终产物等价于：

```javascript
function add(a, b) { return a + b; }
console.log(add(1, 2));
```

## Tree Shaking 的三个前提

| 前提 | 说明 |
| --- | --- |
| 使用 ESM | `import`/`export` 是静态结构，打包器能在编译期分析 |
| 模块无副作用 | 顶层代码不能有"执行即产生效果"的语句，否则删除导出可能改变行为 |
| 构建工具开启 | Vite/Rollup/Webpack 生产模式默认开启，配合 minifier 完成最后清理 |

```javascript
// 副作用会阻止摇树：顶层 console.log 让整个模块"有副作用"
export const version = '1.0.0';
console.log('module loaded'); // 删除 version 可能导致这行也被删，行为不一致

// 正确姿势：副作用写进函数里
export const version = '1.0.0';
export function init() { console.log('module loaded'); }
```

## sideEffects 字段：显式声明

`package.json` 里的 `sideEffects` 告诉打包器"本包哪些文件有副作用"：

```json
{
  "name": "my-lib",
  "sideEffects": [
    "**/*.css"
  ]
}
```

标记为无副作用的模块，未使用的导出可以放心删除；但**样式文件必须保留**，
否则会出现"代码没报错，样式全没了"的经典事故。

## 常见误解

| 误解 | 真相 |
| --- | --- |
| Tree Shaking 等于压缩 | 压缩只做局部删除和改名；摇树做的是跨模块的引用级删除 |
| CommonJS 也能摇树 | CJS 的 `require` 是运行时行为，绝大多数情况摇不动 |
| 动态 import 越多越好 | 动态 import 生成独立 chunk，按需加载更好，但过度拆分会增加请求数 |
| 只要用了 ESM 就一定能摇掉 | 顶层副作用、`export *`、对象属性访问都会削弱摇树效果 |

## 小结

打包是"模块图 → chunk"的流水线，Tree Shaking 是其中一道静态分析优化。
写库时保持模块纯函数化并正确声明 `sideEffects`，写应用时用 ESM 按需引入，
再配合 模块动态导入与代码分割 控制加载节奏。

## 核心知识点

> 一句话记住打包：入口 → 依赖图 → 代码分割 → Tree Shaking；`import` 静态分析让无用代码被移除，动态 `import()` 做按需加载。

- 打包器：Webpack/Vite/Rollup/esbuild；
- 入口与输出：entry → bundle；
- 代码分割：多入口、动态 import、公共块提取；
- Tree Shaking：删除未使用的导出（依赖 ESM 静态结构）；
- sideEffects 标记：告诉打包器模块是否安全裁剪；
- 产物优化：压缩、哈希、按路由分包。

## 动手试试

1. 观察 Vite 构建输出，找到按路由拆分的 chunk；
2. 把一个 `import { a } from 'lib'` 改为只导入需要的，对比产物大小；
3. 用动态 `import()` 懒加载一个模块；
4. 进阶挑战：用 `rollup-plugin-visualizer` 分析产物。

## 注意事项与改进建议

| 问题点 | 说明 | 改进方案 |
| --- | --- | --- |
| Tree Shaking 失效 | 副作用或 CJS | 使用 ESM + sideEffects 配置 |
| 单包过大 | 首屏慢 | 代码分割 + 懒加载 |
| 循环依赖 | 运行时报错 | 重构依赖方向 |

## 扩展学习

- 模块：`javascript/037-JavaScriptModular`；
- 动态导入：`javascript/038-ModuleDynamicImportCodeSplitting`；
- 构建：`vite/` 模块。
