---
order: 260
title: Vue 3 与 Vite：vite.config.ts 逐行拆解与三条命令
module: 'vue3'
category: 前端技术
difficulty: beginner
description: 以 create-vue 生成的 vite.config.ts 逐行拆解为线索，讲清 dev/build/preview 三命令、@ 别名、开发代理与环境变量 VITE_ 前缀约定，附真实报错的调试实录。
author: fanquanpp
updated: '2026-10-11'
related:
  - 'vue3/020-Vue3QuickStartGuide'
  - 'vite/050-ViteEnvModes'
  - 'vite/080-BuildSplit'
  - 'vue3/400-ComponentLibraryEngineering'
prerequisites:
  - 'vue3/010-OverviewEnv'
  - 'vite/010-ViteOverview'
---

## 前置知识

- 已完成 [概述与环境](/vue3/010-OverviewEnv)：装好 Node.js 与 npm；
- 最好跟过 [Vue3 快速入门指南](/vue3/020-Vue3QuickStartGuide)：用 create-vue 跑起过一个项目，本文从它的 vite.config.ts 讲起；
- Vite 原理可后补，主线在 [Vite 构建工具概述](/vite/010-ViteOverview)，本文专注项目里的实际用法。

## 学习目标

读完本文你将能够：

1. 逐行解释 create-vue 生成的 vite.config.ts 每一行在做什么；
2. 说清 dev、build、preview 背后各发生什么，读懂终端输出；
3. 独立配置 @ 别名、开发代理 proxy 与 VITE_ 前缀环境变量；
4. 看懂 dist/ 产物结构，解释文件名里哈希的用途；
5. 对「proxy 不生效」「环境变量 undefined」「build 报类型错误」有固定排查顺序。

预计 45 到 60 分钟。

## 1. 问题引入：这份 vite.config.ts 每一行都是什么

场景：你用 create-vue 建了项目，`npm run dev` 一跑就能看页面。直到某天 `@/utils/money` 这样的导入报错，或同事说「帮我配个代理」，你打开 vite.config.ts，看到的是：

```ts
import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
```

逐行拆解，没有一行是玄学：

- `from 'node:url'`：第一行就在提醒你——**这个文件跑在 Node 里，不在浏览器里**，所以能做路径运算（环境差异见 [JavaScript 概述与运行环境](/javascript/020-JavaScriptOverviewRuntimeEnv)）；
- `defineConfig(...)`：对运行毫无作用，纯粹给编辑器类型提示，写错字段立刻有红线；
- `plugins: [vue()]`：教 Vite 认识 `.vue` 单文件组件。Vite 本体只是通用构建器，看不懂「模板、脚本、样式三段式」，`vue()` 负责拆开处理；
- `resolve.alias`：把 `@` 映射到 src 目录。`new URL('./src', import.meta.url)` 是 ESM（import/export 模块标准）里取「当前文件所在目录」的写法，`fileURLToPath` 再转成普通路径——旧教程里的 `__dirname` 在 ESM 里不存在。

插件、别名、代理、环境变量——Vue 项目里九成的构建配置就是这四件事。

## 2. 核心概念：三条命令背后各发生什么

### npm run dev：起一个「不打包」的开发服务器

```bash
npm run dev
```

预期输出（Local 前的箭头装饰此处省略，Vite 版本号以脚手架当前默认为准）：

```text
VITE vX.Y.Z  ready in 312 ms

  Local:   http://localhost:5173/
  Network: use --host to expose
```

背后三件事：**按需编译**——请求哪个模块才现编译哪个，启动瞬时；**依赖预构建**——vue 等依赖首次启动被 esbuild（Go 写的高速转译器）整理成浏览器友好的单文件；**改动即时生效**——保存 `.vue` 后局部更新，靠 HMR（热模块替换：只替换改动的模块，不刷新整页），计数器状态不丢。细节见 [Vite 开发服务器与 HMR](/vite/075-HmrMechanismAndHotApi)。

### npm run build：产出能上线的静态文件

```bash
npm run build
```

预期输出（终端里每行开头有成功记号，此处按纯文本呈现）：

```text
vite vX.Y.Z building for production...
dist/index.html                   0.46 kB │ gzip:  0.30 kB
dist/assets/index-B2Jf9xKq.css    5.02 kB │ gzip:  1.32 kB
dist/assets/index-C5fKv0zt.js    48.23 kB │ gzip: 19.12 kB
built in 1.24s
```

TypeScript 模板的 build 会先跑类型检查再构建，类型错误直接让命令失败（实录见第 5 节）。产物文件名带哈希：内容一变哈希就变，浏览器缓存可以放心写成「永久缓存」。dist/ 下是 index.html 加 assets/ 里带哈希的 css、js，扔给任何静态服务器就是一个站点。

### npm run preview：本地验证「生产版」

```bash
npm run preview
```

预期输出：

```text
Local:   http://localhost:4173/
```

它用一个小型静态服务器伺服 dist，模拟上线后的样子。**dev 能跑、preview 出问题（或反过来）是最常见的上线前 bug 来源**，发布前必跑。

## 3. 四个必会配置

### 3.1 @ 别名与 tsconfig 的联动

`@` 别名还有半边：TS 要认识 `@/xxx`，靠 tsconfig.app.json 里 paths 的映射 `"@/*": ["./src/*"]`。create-vue 两边都配好了；自己新增别名时必须**两处同步**，缺一边就是「编辑器报红线」或「运行时解析失败」。

### 3.2 代理 proxy：让开发期跨域消失

场景：前端在 5173，后端在 8080，组件里直接请求 `fetch('http://localhost:8080/api/users')` 会被 CORS 拦下（真实报错见 5 节实录一）。CORS 是浏览器的同源策略：跨源请求须由目标服务器明确授权。开发期标准解法不是逼后端改，而是让请求「看起来同源」。往 vite.config.ts 里加（与 plugins 并列）：

```ts
server: {
  proxy: {
    '/api': { target: 'http://localhost:8080', changeOrigin: true }
  }
}
```

组件里改成相对路径 `fetch('/api/users').then((res) => res.json())`。预期效果：Network 面板里是同源的 `http://localhost:5173/api/users`，状态 200，CORS 拦截消失——浏览器以为自己在跟 5173 说话，Vite 在背后转发给 8080。`changeOrigin: true` 把转发请求的 Host 头改成 target 的地址，按 Host 校验的后端漏写它会回 404 或 403。边界记牢：**proxy 只活在 dev 服务器**，上线的等价转发交给 Nginx。

### 3.3 环境变量与 VITE_ 前缀

先记结论（完整规则见 [环境变量与模式](/vite/050-ViteEnvModes)）：`.env` 里以 `VITE_` 开头的变量才会注入浏览器端代码，通过 `import.meta.env` 读取。

```bash
# .env.development（npm run dev 时生效）
VITE_API_BASE=/api
VITE_APP_TITLE=命令行记账本 Web 版
```

组件里 `console.log(import.meta.env.VITE_API_BASE, import.meta.env.VITE_APP_TITLE)`，预期输出（浏览器控制台）：

```text
/api 命令行记账本 Web 版
```

前缀的意义：`.env` 里常混着数据库密码这类服务器专属信息，Vite 用前缀做白名单，没前缀的不进浏览器产物。`import.meta.env` 是构建时字符串替换，改 `.env` 后要重启 dev server。

### 3.4 组件库按需引入（Vue 项目高频场景）

全量引入 Element Plus 这类组件库时，没用的组件和样式也会进产物。社区惯例是 unplugin-vue-components：模板里直接写标签，插件按用到的组件自动补 import 与样式。先 `npm i -D unplugin-vue-components`，再往 vite.config.ts 加：

```ts
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

export default defineConfig({
  plugins: [
    vue(),
    Components({ resolvers: [ElementPlusResolver()] })
  ]
})
```

预期效果：模板里直接写 `<el-button type="primary">保存</el-button>`，零 import 语句；build 后产物只包含用到的组件与样式，体积随使用量走。它本质上只是一个 Vite 插件——第 1 节你已见过插件数组的形状。

## 4. 修改实验

实验一（改参数）：把 `server.port` 改成 3000 并加 `open: true`，先预测终端输出和浏览器行为，再验证。

实验二（拆配置）：把 alias 里 `'@'` 的目标改成不存在的 `./src-不存在`，刷新浏览器。预期报错开头是 `Failed to resolve import "@/..."`——解析器按别名找不到文件。看完改回来。

实验三（验证前缀约定）：在 `.env.development` 加一行 `SECRET=abc`（无 VITE_ 前缀），组件里 `console.log(import.meta.env.SECRET)`。先写预测，再运行。

## 5. 常见错误与调试实录

实录一：CORS 真实报错与 proxy 排查。
不配代理直接请求 8080 时，Chrome 控制台的真实报错：

```text
Access to fetch at 'http://localhost:8080/api/users' from origin
'http://localhost:5173' has been blocked by CORS policy: No
'Access-Control-Allow-Origin' header is present on the requested resource.
```

看到它就走 3.2。代理配了仍不生效？现代 Vite 保存 vite.config.ts 时会自动重启并打印 `server restarted`——**终端里没有这行，改动就没生效**。常见原因：文件没保存、改的是 `.js` 而项目用 `.ts`、终端里的 dev server 是别的项目或旧窗口。兜底：Ctrl+C 后重跑 `npm run dev`。

实录二：`import.meta.env.XXX` 打印 undefined。
三步：1) 打开 `.env` 核对拼写与大小写；2) 确认有 `VITE_` 前缀——没前缀的变量 Vite 故意不暴露给浏览器（3.3 的白名单）；3) 是否重启过 dev server。`console.log(import.meta.env)` 一次列出所有注入成功的键，比逐个猜快。

实录三：`npm run build` 报类型错误，但页面明明能跑。
真实报错格式：

```text
src/App.vue:12:20 - error TS2322: Type 'string' is not assignable to type 'number'.
```

原因：build 脚本先跑 vue-tsc 类型检查再构建，而 dev 不做类型检查，页面照常能跑。这不是 Vite 出错，是模板把类型问题挡在上线前。修掉类型即可；临时 `npx vite build` 可跳过检查（仅排查用）。

## 6. 实际项目中的使用场景

- 前后端联调：代理是标配，通常每个后端服务一条规则；
- 部署到子路径加 `base: '/app/'`；多环境发布用 `.env.staging` 加构建模式（详见 vite 模块）；
- 不建议做的：把业务逻辑写进 vite.config.ts（它只在构建期运行）；遇到问题不假思索抄配置。

## 7. 小练习

预测题（5 分钟）：不运行，判断 dev 模式控制台里这三行的输出：

```ts
console.log(import.meta.env.MODE)
console.log(import.meta.env.PROD)
console.log(import.meta.env.VITE_API_BASE ?? '缺失')
```

（提示：MODE 是模式名，PROD 是布尔值，第三条取决于 3.3 的配置。跑一遍对照，全对才算过。）

修 Bug 题（15 分钟）：同事从旧博客抄来别名配置：

```ts
resolve: {
  alias: { '@': path.resolve(__dirname, './src') }
}
```

dev server 启动直接崩溃，报错原文：

```text
ReferenceError: __dirname is not defined in ES module scope
```

按「读报错三步」定位：报错说的是哪个变量？它为什么在 ESM 里不存在？第 1 节给过什么替代写法？修完启动应恢复正常。

挑战题（半小时）：加 `.env.staging`（VITE_API_BASE 指向预发地址）与对应构建脚本，用 preview 验证产物读到 staging 值。验收：产物里 `import.meta.env.MODE` 等于 staging；源码里没有硬编码切换逻辑。

## 8. 与之前和之后的知识的关系

- 往前：[Vue3 快速入门指南](/vue3/020-Vue3QuickStartGuide) 带你跑起了 create-vue 项目，本文拆透它背后的配置；
- 往后：[组件库工程化](/vue3/400-ComponentLibraryEngineering) 扩展 3.4；[Vue3 编译优化](/vue3/280-Vue3CompileOptimization) 讲模板编译期优化，同属「构建期魔法」；
- Vite 本体：[Vite 构建工具概述](/vite/010-ViteOverview) 是原理主线，[环境变量与模式](/vite/050-ViteEnvModes) 与 [生产构建与代码分割](/vite/080-BuildSplit) 是 3.3 与第 2 节的完整版。

## 9. 官方文档

- Vite 配置参考：https://vite.dev/config/
- Vite 环境变量与模式：https://vite.dev/guide/env-and-mode
- Vue 官方工具链指南（含 create-vue）：https://cn.vuejs.org/guide/scaling-up/tooling.html

## 10. 自我检查

- 能复述 vite.config.ts 四个组成部分的作用；
- 能说出 dev 与 preview 的区别，以及发布前必跑 preview 的原因；
- 能解释 proxy 消开发期跨域的原理、以及为何救不了生产；
- 见到环境变量 undefined 能三步排查，并说出 VITE_ 前缀的安全理由；
- 能解释产物文件名里哈希的用途。

## 本章总结

create-vue 生成的 vite.config.ts 没有一行是咒语：node:url 提醒你配置跑在 Node，defineConfig 只为类型提示，vue() 教 Vite 拆解 SFC，@ 别名是 ESM 写法拼出的路径映射。三条命令各司其职——dev 按需编译加 HMR，build 先类型检查再产出带哈希的 dist，preview 验产物。proxy 让开发期跨域消失但救不了生产，VITE_ 前缀是安全白名单，别名要与 tsconfig 两处同步。带走这套心智模型，配置文件就从「抄来的咒语」变回「可推理的代码」。

## 下一步

进入 [Vue3 编译优化](/vue3/280-Vue3CompileOptimization)，看构建期的另一件大事：Vue 模板在编译阶段做了哪些优化。
