---
order: 110
title: Vite 库模式：把组件库打包成可发布的产物
module: 'vite'
category: 前端技术
difficulty: intermediate
description: Vite 库模式（build.lib）：应用构建与库构建的分界、external 与 peerDependencies 防止框架双份、es/cjs/umd 多格式产物、package.json exports 导出契约、CSS 合并与资源内联、类型声明与 watch 持续构建。
author: fanquanpp
updated: '2026-10-11'
related:
  - 'vite/030-ConfigFile'
  - 'vite/080-BuildSplit'
  - 'vite/100-PluginSystem'
  - 'vite/170-WorkspaceSetup'
prerequisites:
  - 'vite/080-BuildSplit'
---

## 知识点地图

- **知识类别**：Vite 库模式（Library Mode，`build.lib` 配置），对应 vite.dev 指南「Library Mode」章节。
- **解决什么问题**：`vite build` 的默认目标是**应用**——从 `index.html` 出发、把一切依赖打进带哈希的产物；直接拿它打组件库，产物里会出现两份框架、一个没人用的 HTML 入口、消费方无法摇树的巨型文件。库模式把构建目标从「可上线的网页」切换为「可发布的包」。
- **什么时候用到**：开发组件库、工具库、SDK；在 monorepo 里产出供多个应用消费的共享包（工作区配置见 [pnpm Workspace 搭建](/vite/170-WorkspaceSetup)）；给 UMD 场景（CDN script 标签、旧构建链）提供全局变量产物。
- **本篇不讲**：分包与体积优化（见 [Vite 生产构建与代码分割](/vite/080-BuildSplit)）；用插件定制打包行为（见 [插件系统](/vite/100-PluginSystem)）。

## 0. 一个类比：成品菜与中央厨房

应用构建像餐厅出菜：接单（`index.html`）、备料（转换源码）、把菜完整做熟装盘（打包全部依赖）、直接端给客人（浏览器执行）。

库构建是中央厨房：你产出的是**酱料包和半成品**，交给下游无数家餐厅（应用项目）去最终装配。这意味着三件事：

- **不该替餐厅决定配菜**——框架（React/Vue）由消费方提供，库里只留引用；
- **包装要标准化**——产物格式（es/cjs/umd）和 `package.json` 导出字段是餐厅拿货的接口；
- **不做摆盘**——没有 HTML 入口、没有面向最终用户的路由与按需加载策略。

`build.lib` 就是告诉 Vite「这次构建你是中央厨房」的开关。

## 1. 事故现场：组件库按应用模式打包

把一个 Vue 组件库（`my-ui`）交给新同学打包，他直接 `vite build`：

```text
dist/
  index.html                 0.46 kB   <- 库要 HTML 干什么？
  assets/index-Bh7kRCDa.js  142.31 kB <- 比源码还大
  assets/index-9f2c1.css     12.80 kB
```

三个症状：

1. **产物里有两份 Vue**：`my-ui` 的 `dependencies` 写了 `vue`，应用也装了 `vue`，应用模式照单全收，运行时出现两个 Vue 实例——`Invalid hook call` / 组件无法复用类报错的经典来源；
2. **消费方无法 tree-shaking**：应用模式下产物是「成品」而非「带 ESM 导出的源码模块」，`import { Button } from 'my-ui'` 会把整个 142KB 拉进应用；
3. **产物接口没契约**：没有 `exports` 字段约定入口与格式，消费方只能靠猜路径引入。

结论先行：**库不是应用，构建目标必须显式切换**。下面逐条修复。

## 2. 最小可用的库模式配置

```ts
// vite.config.ts
import { resolve } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'), // 库的公共 API 入口
      name: 'MyUI',                              // UMD/IIFE 的全局变量名
      fileName: (format) => `my-ui.${format}.js`, // 产物文件名，按格式区分
      formats: ['es', 'cjs', 'umd'],             // 产出三种格式
    },
    rollupOptions: {
      external: ['vue'], // 框架不打包（下一节展开）
      output: {
        globals: { vue: 'Vue' }, // UMD 下 vue 由全局变量 Vue 提供
      },
    },
  },
})
```

```bash
vite build
```

```text
dist/my-ui.es.js      8.42 kB │ gzip: 3.10 kB
dist/my-ui.cjs.js     9.05 kB │ gzip: 3.35 kB
dist/my-ui.umd.js    10.12 kB │ gzip: 3.88 kB
```

与第 1 节对比：没有 `index.html`，体积从 142KB 降到 10KB 以内——差的 130KB 就是被打出去的 Vue 与摇掉的死代码。逐项解释：

| 字段 | 作用 | 缺省会怎样 |
| :--- | :--- | :--- |
| `entry` | 库的公共 API 入口，从这里分析导出图 | 应用模式找 `index.html`，产出错误目标 |
| `name` | UMD/IIFE 格式挂载的全局变量名 | 打 UMD 时直接报错要求补 `name` |
| `fileName` | 产物文件名，可写成函数按格式区分 | 默认用 `package.json` 的 `name` 字段 |
| `formats` | 产物格式列表：`es` / `cjs` / `umd` / `iife` | 默认 `['es', 'umd']` |

两个约束提前记住：

- `name` 只在 `umd` / `iife` 格式必需；纯 `es` + `cjs` 的现代库可以不写；
- **多入口**（`entry` 传对象）时 `formats` 不能包含 `umd` / `iife`——多个入口没有唯一的全局变量名可挂，Vite 会直接拒绝。

## 3. 别把框架打进库：external 与 peerDependencies

`external: ['vue']` 告诉打包器：**遇到对 `vue` 的导入，原样保留 `import` 语句，不去解析打包**。这是库模式最重要的一条纪律，原因有两层：

- **正确性**：一个页面只能有一份框架实例。库里打进一份 Vue，应用里又有一份，组件各自挂在不同的响应式系统上——`instanceof` 校验失败、Hook 报错、状态互不相通，全是这类「双实例」事故；
- **体积**：框架代码在消费方的产物里迟早会有一份，库里再打一份纯属浪费。

`external` 通常与 `package.json` 的依赖声明配套，各管一头：

```jsonc
// my-ui/package.json
{
  "name": "my-ui",
  "type": "module",
  "peerDependencies": {
    "vue": "^3.5.0" // 对消费方的契约：你需要自备 Vue 3.5+
  },
  "devDependencies": {
    "vue": "^3.5.0" // 自己开发/测试时装一份，不进产物
  }
}
```

- **`peerDependencies` 是「声明」**：告诉 npm/pnpm 与消费方「这个包运行时由宿主提供」，pnpm 会校验版本范围是否满足；
- **`rollupOptions.external` 是「执行」**：构建时真的把 `vue` 留在产物外面。

两者都要写：只写 external 不写 peer，消费方装包时没有任何提示；只写 peer 不写 external，构建照样把框架打进产物。库自己的纯工具依赖（如 `clsx`）才放 `dependencies`——它们会被打进产物，要权衡体积。

把 external 写成函数可以少维护一份清单——所有 `peerDependencies` 一律外部化：

```ts
import pkg from './package.json' with { type: 'json' }

export default defineConfig({
  build: {
    lib: { entry: resolve(__dirname, 'src/index.ts') },
    rollupOptions: {
      // 函数形式：返回 true 表示该模块不打包
      external: (id) => id in (pkg.peerDependencies ?? {}),
    },
  },
})
```

注意配置名仍是 `rollupOptions`：与 [生产构建](/vite/080-BuildSplit) 一致的约定——在 Rolldown 化的 Vite 8 里它是兼容入口，插件与配置无需改动。

## 4. 多格式产物与 package.json 导出契约

三种格式各服务一类消费方：

| 格式 | 消费场景 | 特点 |
| :--- | :--- | :--- |
| `es`（ESM） | Vite/现代打包器、浏览器原生 `<script type="module">` | 静态结构可 tree-shaking，**主力格式** |
| `cjs`（CommonJS） | Node 传统 `require()`、SSR 老链路、jest 旧配置 | 动态结构，摇不了树 |
| `umd` | CDN `<script>` 直接引入、无构建环境 | 单文件、带全局变量、体积最大 |

产出了文件，还要让消费方**找得到、选得对**——这是 `exports` 字段的职责，它是包的「路由表」：

```jsonc
// my-ui/package.json
{
  "name": "my-ui",
  "version": "1.0.0",
  "type": "module",
  "files": ["dist"], // 发布白名单：只带产物
  "main": "./dist/my-ui.cjs.js",     // 传统入口（老工具兜底）
  "module": "./dist/my-ui.es.js",    // ESM 入口（部分老打包器认这个）
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/my-ui.es.js",  // import 语法走这里
      "require": "./dist/my-ui.cjs.js" // require 语法走这里
    }
  },
  "sideEffects": ["dist/*.css"] // 只有 CSS 有副作用，JS 全部可摇
}
```

读取规则：支持 `exports` 的工具按「条件匹配」选文件——`import` 语句匹配 `import` 条件拿 ESM，`require` 调用匹配 `require` 条件拿 CJS，TypeScript 认 `types` 条件。`main`/`module` 是 `exports` 出现之前的旧字段，保留它们是为了兼容不认识 `exports` 的老工具链。

`sideEffects` 直接决定消费方的摇树效果：声明为 `false` 表示「所有模块无副作用，没用到的随便删」；CSS 副作用必须列出（删掉 CSS 引入样式就丢了）。这条与 [生产构建](/vite/080-BuildSplit) 第 6 节的 tree-shaking 条款是同一件事的发布侧操作。

## 5. CSS 与静态资源：库产物的两个特殊处理

应用模式下每个组件的 CSS 按需拆分；库产物要反着来——**合并成一份**，消费方引一次就齐：

```ts
export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'MyUI',
      cssFileName: 'my-ui', // 产物 CSS 文件名（较新版本提供）
    },
    // 库模式下 cssCodeSplit 默认已是 false：全部 CSS 合并
  },
})
```

```text
dist/my-ui.es.js
dist/my-ui.umd.js
dist/my-ui.css   <- 单一 CSS 产物
```

消费方按需引入一次：`import 'my-ui/dist/my-ui.css'`。要留意预处理链路与 [CSS 与预处理器](/vite/060-CSSPreprocessors) 一致——库里的 SCSS/Less 同样会被编译成普通 CSS 再合并。

静态资源（图片、字体）在库模式下建议**内联而不是产出带哈希的文件**：库产物的资源 URL 是「构建期决定的字符串」，消费方的打包器不会处理库里输出的独立资源文件，换部署路径就 404。调大 `build.assetsInlineLimit` 让小资源变成 base64 走 JS/CSS 一并带走；超过阈值的大资源才真正落盘，并在库文档里说明随包分发。

## 6. TypeScript 类型与多入口

产物没有类型声明，消费方的 TS 项目立刻标红。社区标准做法是 `vite-plugin-dts`，把 `.d.ts` 生成并入构建：

```bash
pnpm add -D vite-plugin-dts
```

```ts
// vite.config.ts
import dts from 'vite-plugin-dts'

export default defineConfig({
  plugins: [dts({ outDir: 'dist' })], // 生成 dist/index.d.ts
  build: {
    lib: { entry: resolve(__dirname, 'src/index.ts'), name: 'MyUI' },
  },
})
```

入口 `src/index.ts` 是类型的单一出口：公共 API 一律从这里 re-export，`exports` 的 `types` 条件指向它生成的声明文件。内部模块的类型外泄与否，取决于你从这里导出什么。

多入口面向「按子路径引入」的场景（类似 `lodash-es` 的按模块导入）：

```ts
build: {
  lib: {
    entry: {
      index: resolve(__dirname, 'src/index.ts'),
      button: resolve(__dirname, 'src/components/button/index.ts'),
    },
    formats: ['es', 'cjs'], // 多入口只支持 es/cjs
  },
},
```

`exports` 里为每个子路径补一条映射，消费方就能写 `import { Button } from 'my-ui/button'`——天然获得比单一入口更细的摇树粒度。子路径不多时，维护单一入口加 `sideEffects: false` 通常就够了，别为摇树提前拆到十几入口。

## 7. 开发调试与持续构建

库的开发循环和应用不同——库里没有可运行的页面，调试靠一个**演示应用**：

```text
my-ui/
  src/          # 库源码
  playground/   # 本地演示应用（有自己的 index.html 与入口）
  vite.config.ts
```

两种接法：

- **源码直引（推荐，monorepo 常规）**：playground 直接 `import { Button } from '../src'` 引源码，Vite dev server 即时转换，没有「改库-构建-再看」的循环；工作区里用 `workspace:*` 协议让应用引用库包，配置见 [pnpm Workspace 搭建](/vite/170-WorkspaceSetup)；
- **构建消费（验证发布形态）**：`vite build --watch` 持续产出 `dist/`，演示项目把 `my-ui` 指向产物目录。它的价值是**测产物本身**——exports 字段对不对、external 后消费方能否解析、UMD 全局变量名对不对，这些只有消费真实产物才能暴露。发布前用 `npm pack` 拿到真实 tgz 在干净项目里装一次，是发布前 checklist 的最后一关。

单测与库开发天然合拍：Vitest 直接导源码测，无需先构建，配置见 [Vite 与 Vitest 测试](/vite/090-ViteVitestTesting)。

## 8. 动手实践

任务：把第 1 节的 `my-ui`（一个含 Button 组件与 SCSS 样式的 Vue 组件库）按本篇改造成可发布形态，并逐项验收。

1. **切库模式**：写 `build.lib` 最小配置（只出 `es` 格式），build 后确认产物无 `index.html`、体积不含 Vue；
2. **补契约**：在 `package.json` 配齐 `exports`/`files`/`peerDependencies`/`sideEffects`，`npm pack` 后在另一个空白 Vite 项目里 `npm i <tgz路径>`，用 `import { Button } from 'my-ui'` 验证 ESM 消费与类型提示；
3. **加 UMD**：`formats` 加 `umd`，写一个只带 `<script src=".../my-ui.umd.js">` 的纯 HTML 页面，验证 `MyUI` 全局变量可用——这一步会逼你配 `globals`；
4. **CSS 验证**：确认产物是单一 CSS 文件，且第 2 步的空白项目引入后按钮样式生效；
5. **摇树验证**：往库里加一个无人使用的大工具函数，重建后在消费方产物里确认它没有出现。

<details>
<summary>验收要点（先自己跑，再展开对照）</summary>

第 2 步最容易翻车：`exports` 写了但 `types` 路径不对，TS 项目里 import 正常、悬停无类型——用 `npm pack` 后的真实包排查，别只看源码目录。第 3 步如果报「UMD 未提供全局变量」，检查 `output.globals` 的键必须与 `external` 数组里的模块名完全一致。第 5 步若无效果，回头查三处：产物是 ESM、`sideEffects` 已声明、消费方走的是生产构建（dev 模式不摇树）。

</details>

## 9. 常见错误与对策表

| 现象 / 报错信息 | 常见原因 | 解决办法 |
| :--- | :--- | :--- |
| 消费方报 `Invalid hook call` / 双实例 | 框架被打进库产物 | `external` 框架 + `peerDependencies` 声明，`pnpm why` 排查 |
| 打 UMD 报 `name` 缺失 | UMD/IIFE 需要全局变量名 | `build.lib.name` 必填该场景 |
| 多入口配 UMD 直接报错 | 多入口没有唯一全局名 | 多入口只用 `es`/`cjs` 格式 |
| 消费方 `require` 不了包 | 只产出了 `es` 格式 | `formats` 加 `cjs` 并在 `exports.require` 指向 |
| `exports` 配了但找不到类型 | `types` 条件路径错误或声明未生成 | `vite-plugin-dts` 产出后核对路径，`npm pack` 实测 |
| 库样式在消费方丢失 | CSS 未随包分发或未被引入 | 单一 CSS 产物并在库文档说明引入方式 |
| 库里图片换环境就 404 | 产物输出了带哈希的独立资源文件 | 调大 `assetsInlineLimit` 内联，大资源随包说明 |
| 消费方摇不动树 | 产物非 ESM 或 `sideEffects` 缺失 | 出 `es` 格式、声明 `sideEffects`、公共 API 走单一入口 |
| dev 一切正常、装包后路径 404 | 本地从未消费过真实产物 | 发布前 `npm pack` + 干净项目实测 |

## 10. 一句话记忆

库模式就是把构建目标从「端给浏览器的成品菜」换成「交给下游的酱料包」：框架 external 留给消费方、`exports` 写清格式路由、CSS 合并成一份、类型随包分发——库里只留 API，其余的交给宿主。
