---
order: 90
title: Astro 7 新特性速览
module: 'astro'
category: 前端技术
difficulty: intermediate
description: 时间线驱动了解 Astro 版本演进：1 到 7 的关键特性，重点解析 Astro 7 的 Rust 编译器、Sätteri、Vite 8 与路由缓存
author: fanquanpp
updated: '2026-09-12'
related:
  - 'astro/050-ContentCollections'
  - 'astro/080-BuildDeploy'
prerequisites:
  - 'astro/030-PagesRouting'
---


## 0. 开篇：一辆车的年度改款

车企每年都推出新款车型。有的年份是"大改款"：换发动机、换平台，开起来判若两车；有的年份只是"小改款"：改改大灯、升级车机，方向盘还是那个方向盘。判断一次改款重不重要，看的不是版本号跳了几位，而是**改了哪一层**——动力总成（引擎）换了，才叫脱胎换骨。

Astro 也是一样。2021 年 6 月这台"车"刚上路，到 2026 年已经完成多次改款。本文按**版本演进时间线**组织，带你从 1.0 一路开到 7.0：先看每一代的"改款主题"（引擎级还是外观级），再重点把当前最新版——**Astro 7**——的每一处升级拆开讲透。看完你会发现，Astro 7 正是那一次"换发动机"的大改款。

## 1. 时间线总览：六年七次改款

| 版本 | 发布时间 | 改款主题（"换的是哪一层"） | 代表性能力 |
| --- | --- | --- | --- |
| Astro 1.0 | 2022 年 8 月 | 上市首发 | 岛屿架构、零脚本默认、多框架集成 |
| Astro 2.0 | 2023 年 1 月 | 内容层起步 | Content Collections（内容集合）、Hybrid 渲染实验 |
| Astro 3.0 | 2023 年 8 月 | 体验小改 | View Transitions 实验、Vite 4.4、新文档站点 |
| Astro 4.0 | 2023 年 12 月 | 开发体验大改 | 开发者工具栏、i18n 路由、增量内容缓存实验 |
| Astro 5.0 | 2024 年 12 月 | 内容层重构 | Content Layer（内容层）、Server Islands、简化预渲染 |
| Astro 6.0 | 2026 年 3 月 | 平台级重构 | 重设计 dev server、Fonts API、CSP、路由缓存实验、Rust 编译器实验 |
| Astro 7.0 | 2026 年 6 月 | 引擎级大改 | Rust 编译器转正、Sätteri、Vite 8 + Rolldown、Advanced Routing |

> 说明：版本演进中值得关注的行业背景——Astro 项目 2021 年 6 月开源，2022 年 1 月成立 Astro Technology Company 专职维护，2026 年 1 月该公司加入 Cloudflare，因此 6.x/7.x 中 Cloudflare 适配器与开发体验的深度整合并非偶然。

## 2. 前传：1.0-5.0 的"改款史"

### 2.1 Astro 1.0（2022-08）：首发车型，定义"内容优先"

1.0 确立了 Astro 的全部根基：**岛屿架构**（页面默认零脚本，交互组件显式水合）、**多框架集成**（React/Vue/Svelte 同页共存）、**Astro 组件语法**（frontmatter + HTML 模板）。今天你写的每一行 `.astro` 代码，语法都来自这代车型。

### 2.2 Astro 2.0（2023-01）：内容集合与 Hybrid 实验

2.0 引入 **Content Collections**：给 Markdown/MDX 内容加 schema 校验与 TypeScript 类型推断，并首次实验 Hybrid Rendering（静态与 SSR 混用）。官方宣称同样站点可比 SPA 方案"少 90% 的 JavaScript、快 33%"。

### 2.3 Astro 3.0 / 4.0（2023）：体验改善

3.0 带来 View Transitions 实验支持（页面切换动画）；4.0 则是一次开发者体验大改款：**开发者工具栏**（浏览器内检查岛屿、无障碍审计）、**i18n 国际化路由**、增量内容缓存实验。这一代没有动架构，但把"写代码的体验"往前推了一大步。

### 2.4 Astro 5.0（2024-12）：内容层重构

5.0 把内容管理升级为 **Content Layer**：内容不再只能来自本地 Markdown，任何来源（CMS、REST API、数据库）都能通过 **loader** 接入统一的内容存储，类型安全不变。同时推出 **Server Islands**（服务端岛屿，`server:defer` 指令）、类型安全环境变量（`astro:env`），并**简化预渲染**——移除 `output: 'hybrid'`，改为每页 `prerender` 标记。内容集合构建速度提升最高 5 倍，内存占用下降 25%-50%。

## 3. Astro 6.0（2026-03）：换平台的那一步

6.0 是一次"平台级重构"，为 7.0 的引擎更换铺路：

- **重设计 dev server**：基于 Vite 7 的 Environment API，开发环境与生产构建共享同一套代码路径，目标平台的真实运行时（如 Cloudflare `workerd`）在开发期即可运行；
- **内置 Fonts API**：自动下载、缓存、自托管字体，自动生成优化回退与预加载链接（详见 007 文档）；
- **Content Security Policy（CSP）API**：内置安全配置，一键开启；
- **实验特性**：Rust 编译器、路由缓存、队列渲染；同时移除 Legacy Content Collections（必须使用 Content Layer API），Node.js 最低版本升到 22。

## 4. Astro 7.0（2026-06）：引擎级大改款

2026 年 6 月 22 日发布的 Astro 7，官方定位为"**速度版本**（speed release）"：**不改变组件语法、岛屿架构与路由模型**，而是把构建链路中最耗时的部分全部换成 Rust 原生实现。官方基准测试显示，真实站点构建提速 15%-61%，部分站点超过 2 倍。

升级方式（官方推荐）：

```bash
npx @astrojs/upgrade
# 新项目直接：
npm create astro@latest
```

### 4.1 第一台新引擎：Rust 编译器

`.astro` 组件的编译器从 Go 实现完全重写为 Rust：解析层基于 Oxc，CSS 作用域处理基于 Lightning CSS，按平台分发原生二进制（WASM 兜底）。

```astro
---
// 语法完全不变，编译路径已原生化
const items = ['Rust', 'Fast', 'Astro']
---

<ul>
  {items.map((item) => <li>{item}</li>)}
</ul>
```

对开发者而言**零感知**——写法不变、行为不变，只是编译更快、内存占用更低。但编译器行为更严格：未闭合标签直接报错（不再自动修正无效 HTML），空白处理遵循 JSX 规则（两个行内元素之间的换行不再产生可见空格，需要时显式书写）。

### 4.2 第二台新引擎：Sätteri Markdown/MDX 管线

Astro 7 默认的 Markdown/MDX 处理器替换为 **Sätteri**——基于 Rust 的原生管线（CommonMark 解析用 pulldown-cmark，MDX 表达式解析用 Oxc），6.x 后期已作为可选项提供，7.0 转正为默认。

| 能力 | Sätteri 内置支持 | 备注 |
| --- | --- | --- |
| GFM（表格、任务列表等） | 原生 | 无需插件 |
| 标题 ID、Frontmatter、Wiki 链接 | 原生 | 开箱即用 |
| 数学公式、指令（directives） | 原生 | 容器块、折叠块等 |
| remark/rehype 插件 | 需迁移 | 安装 `@astrojs/markdown-remark` 并配置 `markdown: { processor: unified() }` 继续使用 unified 生态 |

Sätteri 的提速原理：插件按声明的节点类型路由，不再整树遍历。官方文档站与 Cloudflare 文档站切换到 Sätteri 后，构建时间各减少 1 分钟以上。依赖 remark/rehype 插件的项目，需安装 `@astrojs/markdown-remark` 并在配置中指定 `markdown: { processor: unified() }`（官方明确标注为 legacy 路径）。

```js
// astro.config.mjs：Markdown 行为仍可配置
export default defineConfig({
  markdown: {
    shikiConfig: { theme: 'github-dark' },  // 代码高亮主题
  },
})
```

### 4.3 第三台新引擎：Vite 8 与 Rolldown 打包器

Astro 7 升级到 Vite 8——Vite 史上最大版本之一：用 Rust 编写的 **Rolldown** 统一替代了 esbuild 与 Rollup 双打包器（此前开发期用 esbuild、生产期用 Rollup，两套管线需维护一致性）。基准测试中 Rolldown 比 Rollup 快 **10-30 倍**，同时兼容 Rollup 与 Vite 插件 API。

```text
旧方案：开发期 esbuild + 生产期 Rollup（两套管线、两套插件系统）
        │
        ▼
Vite 8：Rolldown 一套引擎通吃（原生速度、同一插件 API）
```

对大多数项目**零配置迁移**：Vite 8 的兼容层会自动转换既有的 `esbuild` 与 `rollupOptions` 配置，既有 Vite 插件继续工作。打包阶段是 Astro 构建的第一步，其加速直接作用于全站。依赖 Vite 内部 API 的自定义集成需对照 Vite 8 迁移指南验证。

### 4.4 第四项升级：队列渲染引擎

渲染引擎改为基于队列（queue-based）的方式：把页面中可并行渲染的部分排队调度，更充分地利用空闲 CPU。官方基准测试中，astro.build（约 308 页）构建从 62.7 秒降到 24.2 秒——队列渲染与三台"Rust 引擎"共同构成了 15%-61% 的整体提速。

### 4.5 Advanced Routing：src/fetch.ts 入口

高级路由在 Astro 7 中默认启用（此前为实验特性），新增 **`src/fetch.ts`** 保留文件名入口，让你完全掌控请求管线：

```ts
// src/fetch.ts（示意：标准 fetch handler 模式）
export default {
  async fetch(request, ctx) {
    // 请求入口：可先做鉴权、日志等横切处理
    ctx.logger.info(`请求进入：${request.url}`)

    // 每个 Astro 能力都是可组合的 fetch 处理
    const response = await ctx.render(request)
    response.headers.set('x-powered-by', 'Astro')
    return response
  },
}
```

要点：采用标准 fetch handler 模式（Request 进、Response 出，与 Cloudflare Workers、WinterCG 运行时一致），**兼容 Hono 中间件**，可直接复用 Hono 生态；把鉴权、日志、响应头改写等横切关注点集中到一个文件（`ctx` 对象的具体能力以官方 Advanced Routing 文档为准）。注意 `src/fetch.ts` 是保留文件名（高级路由默认启用并自动导入它，与 middleware 类似）——项目里已有同名文件需改名，或用配置中的 `fetchFile` 选项另指定路径，也可将 `advancedRouting` 关闭。

### 4.6 路由缓存：从实验到稳定

"最快的构建是不发生的构建。"Astro 6 实验性的**路由缓存**在 7.0 转正，配置从 `experimental` 块移到顶层，通过 `routeRules` 按 URL 模式声明式配置（配合 `cache.provider`）：

```js
// astro.config.mjs（server 模式项目）
import { defineConfig, memoryCache } from 'astro/config'

export default defineConfig({
  output: 'server',
  cache: { provider: memoryCache() },  // 内置内存缓存提供方
  // 对象形式：URL 路由模式 -> 缓存选项
  // 模式支持静态路径、[id]、[...path]；不支持 /docs/** 这类 glob 通配
  routeRules: {
    '/docs/[...path]': {
      maxAge: 3600,   // 缓存 1 小时
      swr: 86400,     // 过期后 24 小时内仍提供旧内容（stale-while-revalidate）
    },
  },
})
```

同时新增**实验性 CDN 缓存提供方**：Netlify、Vercel、Cloudflare 三个官方适配器可将缓存配置下发到平台边缘节点（从 `@astrojs/<平台>/cache` 导入对应 provider 替换 `memoryCache()`），全球就近返回缓存响应，进一步降低源站压力。

### 4.7 安全升级：CSP 完善

CSP（Content Security Policy）从 Astro 6 起内置并转正，7.0 继续完善，用于限制浏览器可加载的资源来源，防御 XSS。在配置的 `security.csp` 字段中开启（Astro 6 起即可用布尔值直接启用）：

```js
// astro.config.mjs
export default defineConfig({
  security: {
    csp: true,  // 开启内置 CSP：Astro 自动生成响应头（SSR）或 <meta> 标签（静态），
                // 并自动放行 Astro 自身需要的规则；也支持传入对象自定义指令与脚本哈希
  },
})
```

内置实现支持 SHA-512 脚本哈希、自定义指令等能力，具体指令级配置项以官方 Configuration Reference 的 `security.csp` 为准。收紧 `script-src` 是文档站最常见的 XSS 防护手段。

### 4.8 AI 增强：为编程工具优化的开发体验

Astro 7 针对 AI 编程工具优化了开发体验，也直接改善了人类开发者的终端体验：

1. **自动识别编码代理**：检测到 AI 环境时自动启用后台模式与 JSON 日志；
2. **后台开发服务器**：`astro dev` 不再阻塞终端，服务就绪后返回 URL 与进程 ID 并转入后台；
3. **进程管理命令**：`astro dev status` / `astro dev logs` / `astro dev stop`；
4. **健康检查端点**：每个开发服务器暴露 `/_astro/status` 供探测；
5. **结构化 JSON 日志**：`ctx.logger` 在 API 路由与中间件中始终可用，内置 `json`、`node`、`console` 处理器。

```bash
astro dev status
# 输出示例（JSON）：
# {"status":"running","pid":1234,"url":"http://localhost:4321"}
```

此前 AI 工具执行 `astro dev` 常遇到"命令不退出、重复启动、无法判断就绪"等问题，Astro 7 用"后台模式 + JSON 日志"提供了标准化的开发协议。

## 5. 升级到 Astro 7：注意事项清单

第一，**Node.js 版本**：Astro 6 起最低要求 Node 22.12（Node 18/20 已不再支持），7.x 沿用这一要求，升级前先确认运行时；

第二，**模板语法更严格**：未闭合标签会构建报错，存量项目里的非规范 HTML 需修正；空白处理改为 JSX 风格（`compressHTML` 默认值变为 `'jsx'`），依赖行内元素间空格的布局需检查渲染结果，需要空格时写 `{' '}`；

第三，**Markdown 插件检查**：使用 remark/rehype/recma 插件的项目需迁移，或安装 `@astrojs/markdown-remark` 并配置 `markdown: { processor: unified() }` 继续使用 unified 生态（Sätteri 默认不执行这些插件）；

第四，**Vite 深层集成**：依赖 Vite 内部 API 的集成需按 Vite 8 迁移指南测试，普通项目无需改动；

第五，**Astro DB 已移除**：`@astrojs/db` 及其 CLI 命令（`astro db`、`astro login`、`astro link` 等）在 7.0 中直接移除（而非弃用），改用独立数据库客户端。

## 6. 常见错误与对策

| 常见错误 | 典型报错/现象 | 原因 | 解决办法 |
| --- | --- | --- | --- |
| 升级后 Node 版本不满足 | 启动报错提示 Node 版本过低 | Astro 7 要求 Node 22+ | 升级 Node 到 22 及以上（如通过 nvm / fnm） |
| 未闭合标签升级后构建失败 | 构建报 HTML 解析错误 | 新 Rust 编译器不再自动修正无效 HTML | 修正模板中的未闭合标签（新增严格校验） |
| 页面行内元素间多出/消失空格 | 渲染结果与升级前不同 | 空白处理改为 JSX 风格（compressHTML 默认 'jsx'） | 需要空格时显式写 `{' '}`，或将 `compressHTML` 设为 `true`/`false` 恢复旧行为 |
| remark/rehype 插件不生效 | Markdown 输出与升级前不一致 | Sätteri 默认不执行 unified 插件 | 安装 `@astrojs/markdown-remark` 显式保留 unified 管线，或迁移到 Sätteri 原生能力 |
| 找不到 `astro db` 命令 | 命令不存在 | `@astrojs/db` 在 7.0 被移除 | 改用独立数据库客户端或迁移到其他数据方案 |
| 升级后自定义 Vite 插件报错 | 插件在构建期报错 | 插件依赖 Vite 内部 API，Rolldown 下不兼容 | 对照 Vite 8 迁移指南调整插件，或等待插件作者适配 |

## 7. 一句话记忆

**"Astro 7 是'换发动机'的一次大改款：编译器、Markdown 管线、打包器全部 Rust 原生，语法与写法不变，构建提速 15%-61%，路由缓存转正、AI 开发体验就位——升级只是 `npx @astrojs/upgrade` 一条命令。"**
