---
order: 130
title: Vite 插件系统
module: 'vite'
category: 前端技术
difficulty: advanced
description: Vite 插件系统：插件 API、钩子机制（config/resolveId/load/transform 等）、插件开发入门与常用插件盘点
author: fanquanpp
updated: '2026-10-11'
related:
  - 'vite/080-BuildSplit'
  - 'vite/120-Vite8Rolldown'
prerequisites:
  - 'vite/030-ConfigFile'
  - 'vite/080-BuildSplit'
---

## 知识点地图

- **知识类别**：Vite 插件生态与运行机制（钩子时序、顺序控制、enforce/apply、生态选型），对应 vite.dev 的「API: Plugin API」章节。
- **解决什么问题**：Vite 核心只提供「底座」，所有框架与大多数工程能力都来自插件；不理解钩子时序就解释不了「为什么我的 transform 没跑」「为什么两个插件互相覆盖」；不懂选型标准就分不清该装插件、写插件还是改构建配置。
- **什么时候用到**：接入框架/工程化插件并排查插件间冲突；评估一个第三方插件能否引入（兼容性、维护状态）；读懂脚手架的 plugins 数组；为「写自己的插件」建立机制地图（动手篇见 110）。
- **本篇主线**：插件 = 带钩子的对象；钩子按构建阶段排布（3 节），插件间按数组顺序 + enforce 分层（4 节）；选型先问「能力该长在哪一层」（2 节）；虚拟模块作为机制的综合案例只留速览（5 节），手把手实现见 110。
- **本篇不讲**：从零写插件的完整工作流（见 [Vite 插件开发](/vite/110-VitePluginDevelopment)）；产物体积分析的使用（见 [生产构建与拆包](/vite/080-BuildSplit)）。

## 0. 一个类比：乐高插口与手机应用商店

想象你有一套乐高积木。底座上预留了一排**标准插口**——不管插上轮胎、门板还是火箭筒，插口形状都一样，插上即用。如果有人发明了新的乐高零件，只要接口符合标准，你的底座就能直接兼容，不需要改造底座本身。

Vite 就是那个"底座"，插件（Plugin）就是插口上的"零件"：

```text
Vite 底座（核心能力）：
  模块解析、转换调度、HMR、构建编排

插上去的零件（插件提供的能力）：
  React/Vue 支持、路径别名、代码检查、产物分析、PWA、旧浏览器兼容...
```

再用手机应用商店理解：手机系统本身只提供打电话、发短信等基础能力，你要用地图、支付、游戏，去"应用商店"（插件生态）下载安装即可。Vite 的哲学完全相同——**核心保持精简，能力通过插件扩展**。Vite 8 中 Rolldown 完全兼容 Rollup 插件 API，绝大部分现有插件开箱即用（详见《Vite 8 与 Rolldown 新特性》），插件生态的"插口标准"从未改变过。

## 1. 插件是什么

### 1.1 一个插件就是一个对象

在 Vite 中，插件本质上是一个**带有名字和若干钩子函数的对象**：

```ts
// 最简单的插件
const myPlugin = {
  name: 'my-plugin',        // 插件名（必须唯一）
  transform(code, id) {     // 钩子：转换模块源码
    return { code, map: null }
  },
}
```

插件通过"钩子"（hook）介入构建流程的特定时机——**在构建管线的特定时刻，执行你写的特定代码**。Vite 核心自身只负责调度：什么时候调用哪个钩子，由 Vite 决定；钩子里面干什么，由插件决定。

### 1.2 Vite 里其实全是插件

你可能想不到：Vite 内置的能力（CSS 处理、静态资源、HTML 转换、依赖预构建）本身就是 30 多个内置插件组成的。打开 Vite 源码的 `packages/vite/src/node/plugins/` 目录就能看到。理解这一点很重要：**你和官方插件作者用的是同一套 API**，没有"内功与外功"之分。

官方框架插件是最好的人门教材：`@vitejs/plugin-react`、`@vitejs/plugin-vue` 都用纯 JS 编写、开源可读，安装到项目后直接去 `node_modules` 里读源码，比看任何教程都直观。

## 2. 常用插件一览

| 插件 | 用途 |
| --- | --- |
| `@vitejs/plugin-react` | React JSX 转换 + Fast Refresh（Vite 8 起底层由 Babel 切换为 Oxc） |
| `@vitejs/plugin-vue` | Vue 单文件组件（SFC）支持 |
| `@vitejs/plugin-legacy` | 旧浏览器兼容（语法降级 + polyfill） |
| `@tailwindcss/vite` | Tailwind CSS 集成（见《Vite CSS 与预处理器》） |
| `vite-plugin-pwa` | PWA 支持（Service Worker 等） |
| `vite-plugin-inspect` | 插件调试：可视化查看每个模块被哪些插件处理过 |
| `unplugin-auto-import` | 自动按需引入 API（写代码不 import 也能用） |
| `rollup-plugin-visualizer` | 产物体积可视化分析（见《Vite 生产构建与代码分割》） |

插件分两类：

- **官方插件**：vitejs 组织维护（`@vitejs/*`），随核心迭代、质量有保障。
- **社区插件**：unplugin 系列、第三方作者维护。命名约定：Vite 专属插件用 `vite-plugin-` 前缀，框架专属用 `vite-plugin-vue-`、`vite-plugin-react-` 等；纯 Rolldown 插件用 `rolldown-plugin-` 前缀。

检索插件推荐官方目录 **https://registry.vite.dev/**（Vite 8 起提供，每日同步 npm 数据），可按 Vite/Rolldown/Rollup 分类检索，也能看到插件的流行度与兼容状态。

安装与注册示例：

```bash
pnpm add -D @vitejs/plugin-legacy
```

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import legacy from '@vitejs/plugin-legacy'

export default defineConfig({
  plugins: [
    legacy({
      targets: ['defaults', 'not IE 11'],
    }),
  ],
})
```

**选型时问的三个问题**（决定「装它 / 换它 / 自己写」）：

1. **能力该长在哪一层？** 能用配置解决的（别名、代理、分包）不装插件；能用构建期脚本解决的（生成文件）不进 dev 管线；只有「参与模块转换/产物生成」的需求才配插件——插件是 dev server 的常驻住户，每多一个都多一份冷启动与钩子开销；
2. **它兼容 Vite 8 的 Rolldown 管线吗？** 只用了 `transform`/`resolveId`/`load` 等通用钩子的插件天然兼容；依赖 Rollup 专属阶段钩子或 renderStart 之类生成期深水钩子的，要在 registry.vite.dev 查兼容标注（详见 [Vite 8 与 Rolldown](/vite/120-Vite8Rolldown)）；
3. **它和现有插件谁先谁后？** 两个插件都改 `transform` 时，数组顺序就是执行顺序；带 `enforce: 'pre'/'post'` 的插件会跳出常规层——引入新插件前先想清楚它应该站在你现有插件的哪一边（时序详见第 3、4 节）。

真实选型复盘：某团队想给项目加「构建期生成版本号注入页面」。候选方案里「写个脚本在 build 前生成 version.ts」比「装一个 meta 注入插件」更合适——需求只是产出一个文件，不参与模块转换，脚本零运行时成本。反例是「自动生成路由」：它要在 dev 管线里实时响应文件增删并触发 HMR，脚本方案做不到，虚拟模块插件（第 5 节）才是对的层。

## 3. 钩子机制：插口上的触点

### 3.1 钩子按阶段划分

一个模块从"被 import"到"写入产物"，会依次经过这些钩子：

```text
解析阶段：resolveId（解析模块 ID） -> load（加载模块源码）
转换阶段：transform（转换源码）
输出阶段：buildEnd / generateBundle / writeBundle（生成产物）

另有一类生命周期钩子：
  config / configResolved（配置处理）
  configureServer（dev server 启动）
  handleHotUpdate（文件变更触发 HMR 时）
```

### 3.2 核心钩子速查表

| 钩子 | 触发时机 | 典型用途 |
| --- | --- | --- |
| `config` | 读取用户配置后、合并前 | 修改/追加配置项 |
| `configResolved` | 配置最终确定后 | 读取最终配置，决定插件行为（如区分 dev/build） |
| `configureServer` | dev server 启动时 | 注入中间件、添加自定义接口 |
| `transformIndexHtml` | 处理 index.html 时 | 注入脚本、修改 HTML 标签 |
| `resolveId` | 解析 import 路径时 | 自定义模块解析、虚拟模块注册 |
| `load` | 加载模块内容时 | 返回虚拟模块源码 |
| `transform` | 每个模块转换时 | 编译、改写源码 |
| `handleHotUpdate` | 文件变更触发 HMR 时 | 自定义 HMR 边界与更新逻辑 |
| `buildEnd` | 构建分析完成后 | 记录构建元数据、统计耗时 |
| `generateBundle` | 产物生成阶段 | 修改/删除产物文件 |
| `writeBundle` | 产物写入磁盘后 | 产物落盘后的收尾工作 |

### 3.3 钩子的执行顺序

```text
按模块请求顺序：resolveId -> load -> transform
按构建流程顺序：config -> buildStart -> (每个模块走上面的三件套) -> buildEnd -> generateBundle -> writeBundle
```

关键规则：**多个插件都实现了同一个钩子时，按 `plugins` 数组顺序依次调用**；同一个钩子的返回值会作为后续插件的输入。所以插件顺序错了，行为就可能错。

Vite 独有钩子（`config`、`configureServer`、`handleHotUpdate` 等）只在 Vite 环境生效；Rolldown 在 Vite 8 中实现了同样的钩子，因此开发与构建走同一套插件管线（《Vite 8 与 Rolldown 新特性》详述）。

## 4. 插件顺序与执行时机

### 4.1 enforce：控制全局顺序

默认情况下，用户插件按数组顺序执行，Vite 内置插件在用户插件之后。想调整位置，用 `enforce`：

```text
pre（最先） -> 用户默认顺序 -> post（最后） -> Vite 内置插件

典型用法：
  别名/路径解析类插件用 pre（要先于其他插件解析路径）
  产物修改类插件用 post（要在最后操作产物）
```

```ts
// vite.config.ts
export default defineConfig({
  plugins: [
    { name: 'a', enforce: 'pre', ... },   // 最先执行
    { name: 'b', ... },                    // 按数组顺序
    { name: 'c', enforce: 'post', ... },   // 最后执行
  ],
})
```

### 4.2 apply：按环境生效

有的插件只在开发或构建时需要：

```ts
// 只在 dev server 环境生效
{ name: 'dev-only', apply: 'serve', ... }
// 只在生产构建生效
{ name: 'build-only', apply: 'build', ... }
```

`apply` 还可以传函数：`apply: (config, env) => env.mode === 'staging'`，实现按模式生效。

## 5. 虚拟模块速览：插件机制的综合案例

虚拟模块是「插件机制能做什么」的最好综合案例：业务代码 `import data from 'virtual:demo'`，插件用 `resolveId`（认领 ID）+ `load`（凭空供货）两个钩子生成这个不存在于磁盘的模块。它广泛用于自动生成路由、注入构建版本号、聚合图标精灵图。

机制骨架一眼版：

```ts
export function virtualDemo(): Plugin {
  const virtualModuleId = 'virtual:demo'
  const resolvedId = '\0' + virtualModuleId // \0 前缀避免与真实文件解析冲突

  return {
    name: 'virtual-demo',
    resolveId(id) {
      if (id === virtualModuleId) return resolvedId // 认领
    },
    load(id) {
      if (id === resolvedId) {
        return `export const data = ${JSON.stringify({ hello: 'vite' })}` // 供货
      }
    },
  }
}
```

三个必记规则：`\0` 前缀是 Rolldown 约定的「非磁盘模块」标记，业务代码里绝不能出现；`load` 只对认领过的 ID 供货；虚拟模块内容完全由插件运行时生成，因此能接 HMR、能读构建配置。

本篇只立机制地图；从真实需求出发的完整实现（数据加工、插件间协作、dev 接口与 HMR 联动、测试发布）见 [Vite 插件开发](/vite/110-VitePluginDevelopment) 第 1-2 节。

## 6. transform 钩子：转换源码

`transform` 是最常用的钩子，负责"改写代码"。示例：给每个 TS/JS 文件注入一行版权注释。

```ts
// plugins/console-demo.ts
import type { Plugin } from 'vite'

export function consoleDemo(): Plugin {
  return {
    name: 'console-demo',
    // 仅处理 .ts/.js 文件，其他文件直接返回 null 跳过
    transform(code, id) {
      if (!id.endsWith('.ts') && !id.endsWith('.js')) return null
      // 演示：给每个文件头部注入一行注释
      const banner = '/* transformed by console-demo */\n'
      return {
        code: banner + code,
        map: null,   // sourcemap 由后续插件/构建器生成
      }
    },
  }
}
```

讲解：

- `transform` 返回 `{ code, map }` 对象或直接返回字符串；不需要修改时返回 `null`（或 `undefined`）。
- 返回值会**依次传给下一个插件的 transform**，形成一条转换链：`插件A.transform -> 插件B.transform -> ... -> 构建器`。
- 钩子内尽量避免高成本操作。Vite 8 中 Rolldown 提供 **hook filters**（钩子过滤）：插件声明 `transformFilter: { id: { include: [/\.ts$/] } }` 后，不匹配的文件直接跳过 JS 桥接层，插件再多也不拖慢构建（详见《Vite 8 与 Rolldown 新特性》）。

### transform 钩子进阶：改写 import 语句

一个真实场景：把 `import { debounce } from 'lodash'` 自动改写为 `import { debounce } from 'lodash-es'`（lodash 的 ESM 版本，可被 tree-shaking，见《Vite 生产构建与代码分割》）：

```ts
import type { Plugin } from 'vite'

export function lodashEsm(): Plugin {
  return {
    name: 'lodash-esm',
    transform(code, id) {
      // 只处理源码文件，不处理 node_modules
      if (id.includes('node_modules')) return null
      // 替换 import 来源
      return code.replace(
        /from\s+['"]lodash['"]/g,
        "from 'lodash-es'",
      )
    },
  }
}
```

## 7. 插件与构建配置的配合

### 7.1 插件可以直接返回配置

插件返回的对象中可以声明 `build`、`resolve` 等字段，Vite 会把它们合并进最终配置——这让插件能做到"安装即用，零手动配置"：

```ts
// 插件内部返回配置
function myPlugin(): Plugin {
  return {
    name: 'my-plugin',
    config() {
      return {
        resolve: {
          alias: { '@': '/src' },   // 插件帮忙配置好别名
        },
      }
    },
  }
}
```

### 7.2 configResolved：读取最终配置

有时插件需要"知道最终配置是什么"再决定行为：

```ts
import type { Plugin } from 'vite'

export function demoPlugin(): Plugin {
  let isBuild = false
  return {
    name: 'demo',
    configResolved(config) {
      // 拿到合并后的最终配置
      isBuild = config.command === 'build'
    },
    transform(code, id) {
      if (!isBuild) return null  // 仅生产构建时转换
    },
  }
}
```

## 8. 调试插件：vite-plugin-inspect

写插件最头疼的是"不知道我的钩子到底有没有被调用、改成了什么样"。官方推荐 `vite-plugin-inspect`：

```bash
pnpm add -D vite-plugin-inspect
```

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import inspect from 'vite-plugin-inspect'

export default defineConfig({
  plugins: [inspect()],
})
```

启动 `pnpm dev` 后访问 `http://localhost:5173/__inspect/`，可以看到：

```text
每个模块被哪些插件处理过
每个插件的 transform 前后代码对比（diff 视图）
虚拟模块的内容
构建/开发两条管线的完整处理链
```

这是学习钩子机制的最佳可视化工具——改一行插件代码，刷新页面就能看到效果。

## 动手实践

任务：用 vite-plugin-inspect 亲眼看见「钩子时序」，把第 3、4 节的纸面知识变成实证。

1. 在任意 Vite 项目安装并注册 `vite-plugin-inspect`（`pnpm add -D vite-plugin-inspect`，plugins 里放最前），启动 dev 后打开终端输出的 inspect 面板地址；
2. 随便打开一个 `.ts` 模块详情页，数一数它经历了多少个插件的 `transform`——记录插件处理顺序，对照第 4 节的 enforce 分层，判断哪些插件是 pre 层、哪些在 normal 层；
3. 自己写一个最小 transform 插件（只打印 `console.log('[my-plugin]', id)`），分别在 `enforce: 'pre'` 与不写 enforce 两种情况下注册到数组末尾，在 inspect 面板观察它的位置变化，并用终端日志验证执行顺序；
4. 把 `apply: 'build'` 加到自己的插件上，重启 dev，验证它不再执行（终端无打印），`pnpm build` 时恢复。

<details>
<summary>参考要点（先自己试，再展开对照）</summary>

第 2 题判读：inspect 的模块详情按执行顺序列出每个插件的介入（alias/resolve/transform...）。你会看到 @vitejs/plugin-react（vite:react-babel 或 oxc 系）通常在 transform 序列靠前（内部声明 pre），visualizer 这类只关心构建期的插件在 dev 阶段根本不出现（apply: 'build'）。

第 3 题结论：不写 enforce 时，插件严格按数组顺序排在 normal 层尾部；`enforce: 'pre'` 后它整体提到所有 normal 层插件之前——即使它在数组里排最后。这就是 4.1 节「enforce 优先于数组顺序」的实证。打印日志的顺序应与 inspect 面板一致，两套证据互验。

第 4 题：apply 是「环境开关」，与 enforce 正交——一个管「跑不跑」，一个管「谁先跑」。生产插件常见的组合是 `apply: 'build'` + 无 enforce（产物加工类不需要抢 dev 管线的位置）。

</details>

## 9. 常见错误与对策表

| 现象 / 报错信息 | 常见原因 | 解决办法 |
| --- | --- | --- |
| 插件完全没生效 | 忘记注册：只安装了包，没加进 `plugins` 数组 | 在 `vite.config.ts` 的 `plugins` 中注册插件 |
| 插件在 build 时失效 | 钩子只在 dev 生效，或没有设置 `apply: 'build'` | 区分 Vite 独有钩子与通用钩子，按需设置 `apply` |
| 转换结果不对 / 被后面的插件覆盖 | `plugins` 数组顺序不对 | 调整顺序，或用 `enforce: 'pre' / 'post'` 控制时机 |
| 虚拟模块在业务代码里报"模块找不到" | `resolveId` 返回的不是带 `\0` 的 ID，或 `load` 没匹配 | 确认 `resolveId` 返回 `'\0' + id`，`load` 用同一 ID 匹配 |
| `\0` 前缀的 ID 出现在报错信息里 | 虚拟模块 ID 泄漏到业务代码或错误信息 | 虚拟模块仅内部使用，`load` 返回真实源码后对外不可见 |
| 改了插件代码不生效 | dev server 未重启（配置与插件列表变更不触发 HMR） | 重启 `pnpm dev` |
| transform 返回格式错误 | 返回了 `{ code }` 但缺 `map`，或直接返回了 `undefined` | 返回 `{ code, map }` 对象；不需要处理时显式返回 `null` |
| 与 Rolldown 不兼容的冷门插件报错 | 极少数依赖 Rollup 内部 API 的插件 | 升级插件到最新版；仍异常则查官方兼容性说明（《Vite 8 与 Rolldown 新特性》有迁移指引） |

## 10. 一句话记忆

Vite 插件就是"乐高插口上的零件"：核心留好标准钩子（resolveId、load、transform、buildEnd...），插件在特定时机插上自己的代码——理解"何时插、插在哪、返回什么"，就掌握了 Vite 一半的架构。
