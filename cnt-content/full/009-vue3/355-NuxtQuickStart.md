---
order: 360
title: Nuxt 快速上手：手搭 SSR 的工程化形态
module: 'vue3'
category: 前端技术
difficulty: beginner
description: 从 350 篇的手搭链路出发学 Nuxt 3/4：约定式路由替代手动注册、useAsyncData 与 useFetch 替代数据预取注水、server/api 用 Nitro 写后端、渲染模式按路由切换与静态生成、useHead 管 SEO、error.vue 兜底，附水合随机值与 useAsyncData 键名两则实录。
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 前置知识

- [Vue3 服务端渲染](/vue3/350-Vue3SSR)：理解水合、单例污染、预取注水三条链路——Nuxt 是它们的零配置封装；
- [Vue Router 详解](/vue3/190-VueRouterDetailed)：路由基本概念。

## 1. Nuxt 在解决什么

350 篇手搭的链路补上路由、构建、分割、部署，就是一个框架——Nuxt 3（2022 年发布，2025 年起 4.x 为当前主线）就是这份工作二十年沉淀的社区标准版。它给 SSR 全链路一个约定：

```text
手搭件                        Nuxt 约定
手动注册路由            →    pages/ 目录自动生成路由
服务端预取 + 状态注水   →    useAsyncData / useFetch
Node 服务器 + API       →    server/api/（Nitro 引擎，可部署到边缘）
渲染模式全局切换        →    nuxt.config 一行 + routeRules 按路由混合
SEO 元信息              →    useHead / useSeoMeta
错误页面                →    error.vue + useError
```

上手方式一条命令：

```bash
npx nuxi init fandex-doc && cd fandex-doc && npm install && npm run dev
```

## 2. 约定式路由：pages 目录即路由表

创建 `pages/doc/[id].vue`，路由 `/doc/:id` 自动注册，不需要手写 createRouter：

```vue
<!-- pages/doc/[id].vue -->
<script setup>
const route = useRoute();          // 自动导入：Nuxt 的组合函数无需 import
</script>

<template>
  <article>
    <h1>文档 {{ route.params.id }}</h1>
    <NuxtLink to="/doc/fiber">去 Fiber 篇</NuxtLink>
  </article>
</template>
```

动态段 `[id].vue`、嵌套路由靠目录层级、可选段 `[slug].vue` 加双括号——**目录结构就是路由表**，配合 `NuxtLink`（SSR 感知的 router-link 包装）完成导航。组件 `components/`、组合函数 `composables/` 同样自动导入。

## 3. useAsyncData：预取注水一行搞定

350 篇第 5 节的「服务端预取、序列化注水、客户端继承」整条链路，在 Nuxt 里是一个调用：

```vue
<script setup>
const { data: doc, pending, error } = await useAsyncData(
  `doc-${route.params.id}`,                       // 键：缓存与去重的身份
  () => $fetch(`/api/doc/${route.params.id}`)
);
</script>
```

要点逐个说：服务端执行时数据直接进 payload 注水，客户端水合时**不再发请求**；`await` 让渲染等数据就绪（Suspense 机制）；返回的 error 在服务端可直接触发 404（`throw createError({ statusCode: 404 })`）。同 URL 并发调用按键去重。`useFetch(url)` 是 `useAsyncData(() => $fetch(url))` 的语法糖，日常首选。刷新与翻页场景用 `refresh()` 或给键加上变化参数。

坑在键名：两个组件请求同一数据但键不同，就是两次请求；键写死、参数变了键没变，会拿到旧数据——**键必须完整编码请求身份**。

## 4. server/api：前端项目里的后端

`server/api/` 目录下的文件自动成为 API 端点，跑在 Nitro 引擎上：

```ts
// server/api/doc/[id].get.ts   →   GET /api/doc/:id
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  const doc = await readDocFromDb(id);        // 你的数据层
  if (!doc) {
    throw createError({ statusCode: 404, statusMessage: '文档不存在' });
  }
  return doc;                                  // 自动序列化为 JSON
});
```

这改变了项目形态：Nuxt 项目天然全栈——文档接口、搜索聚合、敏感密钥调用（第三方 API key 只放服务端）都写进 server/ 目录，客户端经 `$fetch('/api/...')` 消费。中间件（`server/middleware/`）统一做鉴权与日志，Nitro 的部署目标横跨 Node、Cloudflare Workers、Vercel Edge——同一份代码换目标平台。

## 5. 渲染模式：按路由混合，不用二选一

整站 SSR 不是义务。nuxt.config 里按需分配：

```ts
export default defineNuxtConfig({
  routeRules: {
    '/':            { prerender: true },   // 首页：构建期静态生成
    '/doc/**':      { ssr: true },         // 文档页：SSR（SEO 要紧）
    '/lab/**':      { ssr: false },        // 前端实验室：纯客户端（交互重、无 SEO 诉求）
    '/api/**':      { cors: true },
  },
});
```

一条 routeRules 让内容页吃 SEO、工具页省服务器——这正是 FANDEX 这类「内容 + 实验室」混合站的形态：静态与岛屿（Astro 路线）或混合渲染（Nuxt 路线），殊途同归。全站静态化用 `nuxi generate`（爬所有链接预渲染成静态文件）。

## 6. SEO 与错误兜底

每页元信息用 useSeoMeta（自动进服务端渲染的 head）：

```ts
useSeoMeta({
  title: () => doc.value?.title ?? '文档',
  description: () => doc.value?.summary,
  ogTitle: () => doc.value?.title,
});
```

错误兜底两层：页面里 `createError` 抛 4xx/5xx（配合 useAsyncData 的 error），根级 `error.vue` 渲染统一错误页（`clearError({ redirect: '/' })` 返回）。

## 7. 常见错误与调试实录

**错误一：水合随机值警告又回来了。** 有人以为上了 Nuxt 就自动免疫 mismatch——在页面里直接渲染 `Math.random()`，警告照旧。Nuxt 封装的是机制不是物理：服务端与客户端仍是两次执行。修法同 350 篇：初值放 onMounted，或用 `<ClientOnly>` 组件包住纯客户端区块（自带 fallback 插槽）。

**错误二：useAsyncData 键名重复或遗漏参数。** 搜索页两个组件分别用键 `'search'` 调不同参数的接口，后到的覆盖先到的数据。修正：键带全参数（`` `search-${query}-${page}` ``），或用 useFetch 的自动键模式让框架按 URL 生成。

**错误三：服务端能跑客户端崩的 import。** 某个依赖（如仅浏览器端的图表库）被 pages 组件静态 import，SSR 启动即报 `window is not defined`——Nuxt 会明确报出是哪个包。修正：`defineAsyncComponent` 延迟加载、`.client.vue` 后缀约定（该文件只在客户端打包），或放到 routeRules 的 ssr: false 路由下。

## 8. 小练习

预测题（3 分钟）：`/lab/**` 配了 ssr: false 后，直接访问 /lab 页面，HTML 里有没有正文？（没有——该路由退化为 CSR，服务端只回壳与 JS；这正是「工具页省服务器」的代价。）

修改题（10 分钟）：给 2 节的文档页接 3 节的 server/api 数据源，用 useFetch 拉取并在 error 时抛 404；验收：访问不存在的 id 返回 Nuxt 默认 404 页，再自定义为 error.vue 版本。

修 Bug 题（15 分钟）：列表页筛选变化后 useFetch 不重新请求。原因与修法：URL 是响应式的 ref 但没放进请求（或键不含参数）——把 query 做进 URL 与键，验证 Network 随筛选发车且无重复。

挑战题（30 分钟）：实现「点赞」全栈闭环：server/api/like/[id].post.ts 内存计数 + 页面按钮调 `$fetch` 后 refresh() 刷新 useAsyncData。验收：刷新页面后计数仍在（服务端内存），多标签页一致——并思考生产环境该换成什么存储（提示：单实例内存是 Nitro 开发形态，生产要 Redis 或数据库）。

## 9. 官方文档

- Nuxt 入门：https://nuxt.com/docs/getting-started/introduction
- 数据获取（useAsyncData / useFetch）：https://nuxt.com/docs/getting-started/data-fetching
- 服务端目录与 Nitro：https://nuxt.com/docs/guide/directory-structure/server
- 渲染模式与 routeRules：https://nuxt.com/docs/guide/concepts/rendering

## 本章总结

Nuxt 是 350 篇手搭链路的工程化形态：pages 目录即路由，useAsyncData/useFetch 把预取注水压缩成一个 await（键是去重与缓存的身份，必须编码完整请求参数），server/api 加 Nitro 让前端项目天然全栈且可上边缘，routeRules 按路由混合 SSR/CSR/静态生成，useSeoMeta 与 error.vue 补齐 SEO 与兜底。三条实录守住边界：Nuxt 不豁免水合物理（随机值仍要延迟）、键名错即数据错、仅浏览器依赖用 .client.vue 或异步化。学习路径是「手搭看懂机制、Nuxt 承接生产」。
