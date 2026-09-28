---
order: 470
title: React 的 Vite 工具链：脚手架现状与 vite.config.ts 实战
module: 'react'
category: 前端技术
difficulty: beginner
description: 讲清 React 脚手架的现在时：create-react-app 已退场，当前主流是 Vite（react 模板）与 Next.js 两条线；以 react-ts 模板拆解 @vitejs/plugin-react 与 Fast Refresh，覆盖 API 代理、VITE_ 前缀环境变量与三条命令的终端输出。
author: fanquanpp
updated: '2026-09-28'
related:
  - 'react/090-TestEngineering'
  - 'nextjs/010-NextJS16Overview'
  - 'vite/070-DevServerHMR'
  - 'vite/050-ViteEnvModes'
prerequisites:
  - 'react/010-OverviewEnvSetup'
  - 'vite/010-ViteOverview'
---

## 前置知识

- 已完成 [概述与环境配置](/react/010-OverviewEnvSetup)：装好 Node.js 与 npm，写过最简 JSX 组件；
- 没接触过 Vite 也可以跟练，原理主线在 [Vite 构建工具概述](/vite/010-ViteOverview)，本文专注 React 项目里的实际用法。

## 学习目标

读完本文你将能够：

1. 说清 React 脚手架的现在时：create-react-app 为何退场、两条主流路线各适合谁；
2. 用 react-ts 模板从零创建项目，说出 @vitejs/plugin-react 同时承担的两件事；
3. 演示并解释 Fast Refresh 与整页刷新的区别；
4. 独立配置 API 代理与 VITE_ 前缀环境变量，读懂 CORS 报错原文；
5. 读懂 dev、build、preview 的终端输出，发布前用 preview 验证生产构建。

预计 45 到 60 分钟。

## 1. 问题引入：React 官方脚手架的现在时

你搜「React 创建项目」，会得到三种互相矛盾的答案：十年老教程教你 `npx create-react-app`，近几年的博客教你 Vite，还有一大批教 Next.js 的。哪个是官方现在的口径？

2026 年的现状一次说清：

- **create-react-app（CRA）已退出历史**：React 团队 2023 年起不再维护它，react.dev 的「创建新项目」页面也不再推荐。网上仍有 CRA 教程，特征是 `npm start` 启动和 webpack——看到就换教程；
- **当前两条主流线**：纯前端单页应用（SPA，产物就是一份静态站点）用 Vite 的 react 模板，本文主角；要服务端渲染、文件路由、全栈能力的走 Next.js，见 [Next.js 16 概述与快速上手](/nextjs/010-NextJS16Overview)。

动手第一步：

```bash
npm create vite@latest my-app -- --template react-ts
cd my-app
npm install
npm run dev
```

预期输出（Vite 版本号以你安装时脚手架的默认为准）：

```text
VITE vX.Y.Z  ready in 280 ms

  Local:   http://localhost:5173/
  Network: use --host to expose
  press h + enter to show help
```

浏览器打开 Local 地址，能看到 React + TypeScript 的默认页面。

## 2. 核心概念：vite.config.ts 与 React 特有项

react-ts 模板的配置文件出奇地短：

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
```

就一个插件，但它同时干两件事：

1. **衔接 JSX 转译**：`.jsx` / `.tsx` 里的 JSX 不是浏览器认识的语法，插件把它接入 Vite 的转译管线（dev 期底层由 esbuild——Go 写的高速转译器——完成）；
2. **Fast Refresh（快速刷新）**：这才是核心价值。编辑组件时改动被局部替换到页面，组件状态（输入框里的文字、计数器数值）原样保留；没有它，每次保存都是整页刷新、状态全丢。

动手感受：在 App.tsx 写一个 useState 计数器（写法见 [状态与事件](/react/030-StateEvent)），点几次按钮让数字走到 3，再改一行 JSX 文案并保存。预期：页面不刷新、数字仍是 3、文案已更新——Fast Refresh 在替你干活。

还有一件要自己动手的事：**@ 别名**。与 Vue 侧的 create-vue 不同，react-ts 模板没有预设 `@`：你要给 vite.config.ts 的 resolve.alias 加一条映射（用 ESM 的 `fileURLToPath(new URL('./src', import.meta.url))` 取路径，原因见 Vite 概览），并在 tsconfig.app.json 的 compilerOptions.paths 里加 `"@/*": ["./src/*"]`。两边缺一，要么编辑器报红线、要么运行时解析失败——**别名永远是两处同步**。

## 3. 三条命令与一次真实的 CORS 报错

### npm run dev

输出见第 1 节。要点：dev 是「按需编译」——浏览器请求哪个模块现编译哪个，启动瞬时；react、react-dom 首次启动会经过一次 esbuild 预构建，属正常现象。

### npm run build

```bash
npm run build
```

预期输出（终端里每行开头有成功记号，此处按纯文本呈现；数值随依赖版本浮动）：

```text
vite vX.Y.Z building for production...
transforming (46) src/App.tsx
dist/index.html                   0.46 kB │ gzip:  0.30 kB
dist/assets/index-4uaIi8A-.css    1.42 kB │ gzip:  0.71 kB
dist/assets/index-B_iDDKF-.js  187.45 kB │ gzip: 59.42 kB
built in 1.02s
```

react-ts 模板的 build 脚本是 `tsc -b && vite build`：先全量类型检查再打包，类型错误会挡住构建——dev 不查类型所以页面能跑，模板有意把类型问题挡在上线前。187 kB 的 JS 主体是 react、react-dom 加你的代码，gzip 后约 60 kB；觉得大，去读 [Vite 生产构建与代码分割](/vite/080-BuildSplit)。

### npm run preview

```bash
npm run preview
```

预期输出：

```text
Local:   http://localhost:4173/
```

它伺服 dist 目录，模拟产物上线后的样子。**dev 正常、preview 出问题（或反过来）是上线前最常见的坑**，发布前必跑一遍。

### API 代理：本文主线案例

场景：前端在 5173，后端在 8080。组件里直接写绝对地址 `fetch('http://localhost:8080/api/todos').then((res) => res.json())`，预期报错（Chrome 控制台真实原文）：

```text
Access to fetch at 'http://localhost:8080/api/todos' from origin
'http://localhost:5173' has been blocked by CORS policy: No
'Access-Control-Allow-Origin' header is present on the requested resource.
```

原因：浏览器的同源策略要求跨源请求由目标服务器明确授权。开发期标准解法不是逼后端改，而是让请求「看起来同源」。往 vite.config.ts 里加（与 plugins 并列）：

```ts
server: {
  proxy: {
    '/api': { target: 'http://localhost:8080', changeOrigin: true }
  }
}
```

保存后组件里改成相对路径 `fetch('/api/todos').then((res) => res.json())`。预期效果：Network 面板里是同源的 `http://localhost:5173/api/todos`，状态 200，待办数据返回，CORS 报错消失。原理：浏览器以为自己在跟 5173 说话，Vite 在背后转发给 8080；`changeOrigin: true` 让转发请求的 Host 头指向后端，按 Host 校验的后端不写它会回 404 或 403。边界记牢：**proxy 只活在 dev 服务器里**，上线的等价转发交给 Nginx 或网关。

## 4. 环境变量与 VITE_ 前缀

```bash
# .env.development（npm run dev 时生效）
VITE_API_BASE=/api
VITE_APP_TITLE=React 待办本
```

组件里 `console.log(import.meta.env.VITE_API_BASE, import.meta.env.VITE_APP_TITLE)`，预期输出（dev 模式浏览器控制台）：

```text
/api React 待办本
```

两条纪律：只有 `VITE_` 前缀的变量会注入浏览器代码——`.env` 里常混着密钥这类服务器专属信息，前缀是白名单，防止整包泄漏给访客；`import.meta.env` 是构建期字符串替换，改 `.env` 后要重启 dev server。完整规则（`.env.production`、自定义模式）在 [环境变量与模式](/vite/050-ViteEnvModes)。

## 5. 修改实验

实验一：把 `server.port` 改成 3000 并加 `open: true`，预测终端输出与浏览器行为，再验证。

实验二：把 plugins 数组里的 `react()` 注释掉，重启 dev。先预测两件事——页面还能不能渲染？改代码后是局部更新还是整页刷新？运行验证：esbuild 仍会转译 JSX，页面照常渲染，但 Fast Refresh 消失，保存即整页刷新、状态丢失——插件的价值就此现形。

实验三：在 `.env.development` 加一行 `TOKEN=xyz`（无前缀），组件里 `console.log(import.meta.env.TOKEN)`。先写预测再运行，并用第 4 节的白名单逻辑解释结果。

## 6. 常见错误与调试实录

实录一：`npm start` 报 Missing script。
从 CRA 时代带来的肌肉记忆在 Vite 项目里会撞墙，真实输出：

```text
npm error Missing script: "start"
npm error
npm error   To see a list of scripts, run:
npm error     npm run
```

按提示跑 `npm run` 看脚本清单：dev、build、lint、preview。对应关系：CRA 的 `npm start` 等于 Vite 的 `npm run dev`。

实录二：代理改了不生效。
现代 Vite 会在保存 vite.config.ts 时自动重启并打印 `server restarted`——终端里没有这行，改动就没生效。排查顺序：1) 代理前缀与请求路径是否一致；2) target 的端口对不对；3) 你改的是 `.ts` 还是 `.js`，项目实际用哪个；4) 兜底 Ctrl+C 重跑 `npm run dev`。CORS 报错原文与完整案例见第 3 节。

实录三：环境变量 undefined。
三步：查拼写与大小写、查 VITE_ 前缀（白名单外的变量不进浏览器）、重启 dev server。一次 `console.log(import.meta.env)` 列出全部注入成功的键，别逐个猜。

## 7. 实际项目中的使用场景：选型判断

| 你要做的事 | 选 | 理由 |
| --- | --- | --- |
| 后台管理、内部工具、纯 SPA | Vite react 模板 | 心智负担最小，启动与构建都快 |
| 需要 SEO、文件路由、全栈能力 | Next.js | 服务端渲染与路由是一等公民，走 nextjs 模块 |
| 嵌入已有的 webpack 大仓库 | 都不急 | 渐进迁移，别为了换工具重写整个仓库 |

不应做的：跟着旧教程装 CRA（官方已弃）；在纯 Vite 项目里硬上 SSR（框架线的事，直接评估 Next.js）。

## 8. 小练习

预测题（5 分钟）：不运行，判断 dev 模式控制台里这两行的输出：

```ts
console.log(import.meta.env.MODE, import.meta.env.PROD)
console.log(import.meta.env.VITE_APP_TITLE ?? '缺失')
```

（提示：MODE 是模式名，PROD 是布尔值，第二行取决于第 4 节的配置。跑一遍对照，全对才算过。）

修改题（15 分钟）：给项目配上 `@` 别名，做到两处同步（vite.config.ts 的 resolve.alias 与 tsconfig.app.json 的 paths）。验收：组件里 `import { fmtDate } from '@/utils/date'` 既不报红线、运行时也正常工作。

修 Bug 题（15 分钟）：后端路由是 `/todos`（不带 /api 前缀），你配了第 3 节的代理后，页面请求 `fetch('/api/todos')` 得到 404，而直接访问 `http://localhost:8080/todos` 返回 200。按三步定位：代理默认把路径原样转发，后端实际收到了什么？查 Vite 代理的 rewrite 选项如何重写路径。修完页面应恢复 200。

挑战题（半小时）：把站点部署到子路径：vite.config.ts 设 `base: '/app/'` 后 build，再用 preview 加路径 `/app/` 验证。验收清单：Network 里所有资源引用都带 /app/ 前缀且无 404；直接访问根路径会得到什么、为什么；换更深子路径时只需改哪一处配置。

## 9. 与之前和之后的知识的关系

- 往前：[概述与环境配置](/react/010-OverviewEnvSetup) 给了环境与 JSX 起点，本文接上「项目怎么组织、怎么跑、怎么发」的工程线；
- 往后：[测试与工程化](/react/090-TestEngineering) 把工具链延伸到测试与 CI；全栈线直接开 [Next.js 16 概述与快速上手](/nextjs/010-NextJS16Overview)；
- Vite 深入：[Vite 开发服务器与 HMR](/vite/070-DevServerHMR) 讲透 Fast Refresh 底下的热更新机制，[环境变量与模式](/vite/050-ViteEnvModes) 补全第 4 节。

## 10. 官方文档

- Vite 指南：https://vite.dev/guide/
- Vite 配置参考：https://vite.dev/config/
- react.dev 创建新项目（脚手架官方口径）：https://react.dev/learn/start-a-new-react-project
- Next.js 文档：https://nextjs.org/docs

## 11. 自我检查

- 能说清「为什么新 React 项目不再用 create-react-app」及两条线的分界；
- 能说出 @vitejs/plugin-react 的两个职责，并用计数器实验演示 Fast Refresh 保留状态；
- 能读懂 CORS 报错原文，并按固定顺序排查代理（前缀、端口、重启、changeOrigin）；
- 能解释 VITE_ 前缀的安全意义，以及改 `.env` 后为什么要重启；
- 能说出 dev 与 preview 的区别，以及发布前必跑 preview 的原因。

## 本章总结

React 的脚手架故事在 2023 年翻页：CRA 退场，纯 SPA 线由 Vite react 模板接棒，全栈线由 Next.js 接棒。Vite 侧要吃透三件事——react() 插件带来的 Fast Refresh 让改代码不丢状态、proxy 让开发期跨域消失、VITE_ 前缀安全地喂环境变量。三条命令各司其职：dev 按需编译、build 先类型检查再产出带哈希的 dist、preview 验产物。发布前跑一遍 preview，能提前拦下大部分环境差异 bug。

## 下一步

两条路任选：继续工程线，进入 [测试与工程化](/react/090-TestEngineering)；或直接开全栈线 [Next.js 16 概述与快速上手](/nextjs/010-NextJS16Overview)。
