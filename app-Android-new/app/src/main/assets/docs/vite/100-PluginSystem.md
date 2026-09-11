---
order: 100
title: Vite 插件系统
module: 'vite'
category: 前端技术
difficulty: advanced
description: Vite 插件系统：插件 API、钩子机制（config/resolveId/load/transform 等）、插件开发入门与常用插件盘点
author: fanquanpp
updated: '2026-09-12'
related:
  - 'vite/080-BuildSplit'
  - 'vite/120-Vite8Rolldown'
prerequisites:
  - 'vite/030-ConfigFile'
  - 'vite/080-BuildSplit'
---

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

## 5. 编写第一个插件：虚拟模块

目标是实现一个"加载虚拟模块"的插件：业务代码 `import data from 'virtual:demo'` 时，返回插件生成的 JSON 数据。这个模式广泛用于：自动生成路由、注入构建版本号、注入运行时配置。

```ts
// plugins/virtual-demo.ts
import type { Plugin } from 'vite'

export function virtualDemo(): Plugin {
  const virtualModuleId = 'virtual:demo'
  const resolvedId = '\0' + virtualModuleId  // \0 前缀避免与其他插件冲突

  return {
    name: 'virtual-demo',
    // 解析阶段：把虚拟模块 ID 解析为唯一标识
    resolveId(id) {
      if (id === virtualModuleId) return resolvedId
    },
    // 加载阶段：返回模块源码
    load(id) {
      if (id === resolvedId) {
        return `export const data = ${JSON.stringify({ hello: 'vite' })}`
      }
    },
  }
}
```

```ts
// 业务代码中使用
import { data } from 'virtual:demo'
console.log(data.hello)  // 'vite'
```

```ts
// vite.config.ts 中注册
import { defineConfig } from 'vite'
import { virtualDemo } from './plugins/virtual-demo'

export default defineConfig({
  plugins: [virtualDemo()],
})
```

讲解：

- `\0` 前缀是 Rollup/Rolldown 约定的"不可见 ID"标记，防止虚拟模块被真实文件系统解析命中——业务代码里绝不能出现 `\0` 开头的路径。
- `resolveId` 返回 `\0` 开头的 ID 后，`load` 拿到的入参就是加了 `\0` 的 ID，靠它区分"这是虚拟模块"。
- 虚拟模块不依赖磁盘文件，内容完全由插件在运行时生成——这是它强大的原因。

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
