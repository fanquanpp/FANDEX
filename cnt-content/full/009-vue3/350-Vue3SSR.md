---
order: 350
title: Vue3 服务端渲染：先出 HTML，再接上电
module: 'vue3'
category: 前端技术
difficulty: advanced
description: 从文档阅读页「白屏 2 秒、搜索引擎抓不到正文」讲起：手搭最小 SSR（createSSRApp 每请求新实例 + renderToString），拆解水合与 mismatch、单例污染、数据预取与状态注水、流式渲染，附 window 未定义、水合不匹配、跨请求串数据三则实录，Nuxt 集成另见 355 篇。
author: fanquanpp
updated: '2026-09-29'
related:
  - 'vue3/280-Vue3CompileOptimization'
  - 'vue3/355-NuxtQuickStart'
  - 'vue3/220-PiniaPersistencePlugin'
  - 'vue3/370-VaporMode'
prerequisites:
  - 'vue3/280-Vue3CompileOptimization'
---

## 前置知识

- [Vue3 编译优化](/vue3/280-Vue3CompileOptimization)：知道 ssrRender 编译产物直接拼 HTML 字符串——本篇讲它的完整运行链路；
- [Pinia 状态管理详解](/vue3/210-PiniaStateManagementDetailed)：store 的定义与 $patch。

## 学习目标

读完本文你将能够：

1. 用 createSSRApp + renderToString 手搭一个最小可运行的 SSR 服务，并解释「每个请求新建应用实例」为什么不可省；
2. 解释水合（hydration）在做什么，定位与修复 hydration mismatch 警告；
3. 识别单例污染——SSR 最隐蔽的 bug 类别；
4. 实现「服务端预取数据 + 状态注水」链路，让客户端不再重复请求；
5. 说清 CSR / SSR / SSG 的选型边界，知道什么时候直接上 Nuxt。

预计 70 到 90 分钟。

## 1. 你现在要解决什么问题

文档阅读页是纯客户端渲染（CSR）：浏览器先下载 500KB JS，执行完，界面才出现——弱网下白屏两秒；更糟的是搜索引擎爬虫抓到的 HTML 是一个空的 `<div id="app">`，正文一个字都没有，文档站赖以生存的搜索流量进不来。

SSR（服务端渲染）把顺序反过来：**服务器执行组件，直接把 HTML 发给浏览器**——首屏内容随第一个响应到达，爬虫拿到的就是完整正文；浏览器随后下载 JS 把静态页面「接上电」（水合），恢复交互。渲染方案是一道光谱，先看全貌：

```text
CSR（客户端渲染）：服务器发空壳，浏览器跑 JS 生成一切   —— 交互重、首屏慢、SEO 弱
SSR（服务端渲染）：服务器每请求生成 HTML，客户端水合     —— 首屏快、SEO 好、要养服务器
SSG（静态生成）  ：构建期把页面全部生成好，部署即 CDN    —— 最快最稳，但内容要构建期已知
FANDEX 网页端走的是第四条路：Astro 静态主体 + 交互岛屿——内容站形态的最优解。
```

本篇手搭 Vue 3 SSR 的最小链路——不为在生产里替代 Nuxt（355 篇），为的是把 SSR 的三个核心机制（水合、单例、注水）拆到看得见。

## 2. 动手：最小可运行的 SSR

```js
// server.mjs
import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import express from 'express';

const App = {
  setup() {
    return () =>
      h('div', { class: 'doc' }, [
        h('h1', 'Fiber 架构'),
        h('p', '渲染为什么能随时停下……'),
      ]);
  },
};

const server = express();

server.get('*', async (req, res) => {
  const app = createSSRApp(App);          // 关键：每个请求一个新实例
  const html = await renderToString(app); // 组件执行，产出 HTML 字符串
  res.send(`<!DOCTYPE html>
    <html>
      <head><title>文档</title></head>
      <body>
        <div id="app">${html}</div>
        <script type="module" src="/entry-client.js"></script>
      </body>
    </html>`);
});

server.listen(3000);
```

浏览器现在打开任何路径都能立刻看到正文——没有白屏，没有 JS 也能读（这叫「可服务端渲染的内容天然渐进增强」）。但页面还是死的：按钮没反应、数据不更新，因为 `entry-client.js` 还不存在。

预期行为检查点：`curl localhost:3000/doc/fiber` 能看到完整 HTML 正文； view-source 里正文可见（而不是 CSR 的空 div）。

## 3. 水合：把静态页面接上电

客户端入口干的事不是「重新渲染」，是**水合（hydration）**：用同一个组件在同一位置创建应用，Vue 发现 DOM 已经存在，就不再重建，只做三件事——校验现有 HTML 与预期一致、给元素挂事件监听、建立响应式连接。

```js
// entry-client.js
import { createSSRApp } from 'vue';
import App from './App.js';

createSSRApp(App).mount('#app');   // SSR 应用必须用 createSSRApp 创建
```

两个易踩的规则立刻浮出：**必须用 createSSRApp 而不是 createApp**（后者不进入水合模式，会在已有 DOM 上重建，闪烁一次）；服务端与客户端渲染的**首屏输出必须逐字节一致**。不一致时控制台出现水合警告：

```text
Hydration node mismatch:
- rendered on server: <span>14:32:05</span>
- rendered on client: <span>14:32:06</span>
```

常见来源三类：时间（服务端 14:32:05、客户端下一秒）、随机数、浏览器 locale/时区差。修法分层：能延迟的就进 onMounted 再更新（服务端跳过 mounted，天然只在客户端执行）；确实要在首屏容错的节点加 `data-allow-mismatch` 属性显式豁免：

```vue
<template>
  <span data-allow-mismatch>{{ currentTime }}</span>
</template>
<script setup>
import { ref, onMounted } from 'vue';
const currentTime = ref('');
onMounted(() => {                  // 只在客户端执行
  currentTime.value = new Date().toLocaleTimeString();
});
</script>
```

顺带一个 3.5 的实用件：`useId()` 生成 SSR 安全的唯一 id（服务端与客户端产生相同值），给表单 label、aria 属性用——手写计数器 id 在 SSR 下两端不同步，正是 mismatch 的隐形来源。

## 4. 单例污染：SSR 最隐蔽的 bug

上一步跑通后有人会「优化」：把 app 提到请求处理函数外面创建。灾难随之而来——**Node 进程是长命的，应用实例是跨请求共享的**：A 用户的 store 状态残留给 B 用户，B 的购物车里躺着 A 的文档。这就是单例污染。

纪律一句话：**请求内的一切（app、router、pinia）都必须在请求处理函数里新建。** 生产形状是工厂函数：

```js
// app.js —— 工厂：每次调用生产一套全新全家桶
import { createSSRApp } from 'vue';
import { createPinia } from 'pinia';

export function createApp() {
  const app = createSSRApp(App);
  app.use(createPinia());
  return { app };
}

// server.mjs 的请求处理里
const { app } = createApp();       // 每请求一套，互不污染
```

对照浏览器：CSR 天然每用户一个独立页面进程，这个问题不存在——它是服务端长驻内存送来的新故障类别，也是 6.x 系列 SSR 事故里最难排查的一类（症状是「偶发的数据串门」，复现依赖并发）。

## 5. 数据预取与状态注水：别让客户端白跑一趟

阅读页数据来自 API。最朴素的 SSR 流程里有个浪费：服务端渲染时请求了一次数据，客户端水合时组件又请求一次。正确链路是**预取 + 注水**：服务端拿数据、渲染 HTML、把状态序列化进页面，客户端直接继承。

以 Pinia 为例（其 SSR 集成已内置）：

```js
// 服务端：请求处理内
const { app } = createApp();
const pinia = createPinia();
app.use(pinia);

const docStore = useDocStore(pinia);
await docStore.loadDoc(route.params.id);      // 预取：数据进 store

const html = await renderToString(app);
const state = JSON.stringify(pinia.state.value);

res.send(`...
  <div id="app">${html}</div>
  <script>window.__INITIAL_STATE__ = ${state}</script>
  <script type="module" src="/entry-client.js"></script>
...`);
```

```js
// 客户端入口：恢复注水状态
const { app } = createApp();
const pinia = createPinia();
app.use(pinia);

if (typeof window !== 'undefined' && window.__INITIAL_STATE__) {
  pinia.state.value = window.__INITIAL_STATE__;   // 水合时状态已就位，组件不再发请求
}
app.mount('#app');
```

预期行为：Network 面板里文档接口只在服务端出现一次；客户端首屏直接有数据。安全注意：注水数据落在页面源码里，**不要把敏感字段放进去**（它们对任何查看源码的人可见），并用安全序列化防 XSS（JSON 里的 `</script>` 片段要转义）。

## 6. 流式渲染：不用等最慢的那块

renderToString 等整棵树渲染完才回第一个字节，最慢的数据源拖住整个首屏。流式渲染把页面**边渲染边发**：

```js
import { renderToPipeableStream } from 'vue/server-renderer';

const { pipe } = renderToPipeableStream(app);
pipe(res);   // 骨架立刻发出，慢组件的位置先发占位，数据到了再补发
```

配合 Suspense 划块：快内容先到先显示，慢的评论流先显示骨架再流式补充——TTFB 从「等最慢」变成「等最快」，这正是 280 篇 ssrRender 编译产物（静态字符串直出）在传输层的放大。

## 7. 什么时候别手搭：去用 Nuxt

上面的手搭链路补全路由、构建、代码分割、部署适配后，就是一个小型框架——这正是 Nuxt 做的事：约定式路由、useAsyncData 数据获取、Nitro 服务端、渲染模式切换（整站 SSR、按路由混合、纯静态生成）。工程结论：**学习看本篇的手搭，生产看 Nuxt**。Nuxt 3/4 的快速上手在 [Nuxt 快速上手](/vue3/355-NuxtQuickStart)。

## 8. 常见错误与调试实录

**错误一：`window is not defined`。** 组件模块顶层或 store 初始化里访问 window，服务端一启动就崩。三步定位：报错栈指向模块加载期；验真身——Node 进程没有 window；修正——访问浏览器的代码挪进 onMounted / onMounted 之后的生命周期，初始化类需求给安全默认值（`typeof window !== 'undefined' ? ... : 默认`）。220 篇持久化的 storage 配置就是同款问题的插件形态。

**错误二：水合不匹配循环报错。** 控制台刷屏 mismatch 警告，界面闪烁。三步定位：对比警告里「服务端渲染的」与「客户端渲染的」两段 HTML 的差异点；验真身——差异是否来自时间、随机数、localStorage 初值、日期格式化（locale）；修正——初值确定性化（服务端给占位值，onMounted 再补真值），确需容忍处加 data-allow-mismatch。逐字节一致是水合的契约，任何「服务端算不出来」的值都必须延迟到客户端。

**错误三：偶发的用户数据串门。** 测试环境单人操作永远正常，线上偶发 A 看到 B 的昵称。三步定位：串门的数据全部来自 store；验真身——app 或 store 在模块顶层创建（单例），长驻 Node 进程跨请求共享；修正——第 4 节的工厂函数，请求内新建全家桶。凡「偶发、并发才现」的状态错乱，先查单例。

## 9. 修改实验

实验一：给第 2 节的最小 SSR 加一个真实接口（本地 JSON 文件即可），先体验「客户端水合时二次请求」，再按第 5 节改造为预取 + 注水，用 Network 面板确认请求只剩服务端一次。

实验二：制造一次水合不匹配：在模板里直接输出 `new Date().toLocaleTimeString()`，观察警告形态；然后分别用 onMounted 延迟与 data-allow-mismatch 两种方式修复，对比控制台输出的差异。

实验三：把第 4 节的单例版（app 提到外面）与工厂版并存，用两个不同浏览器会话同时请求带状态的页面，观察单例版的串门现象——亲手复现一次生产事故。

## 10. 小练习

预测题（5 分钟）：createApp 替换 createSSRApp 后，页面表现是？（客户端放弃水合、整个重建 DOM——首屏闪一下且服务端 HTML 的价值归零；功能大概率还能用，所以这类错误常被忽略到性能评审才现形。）

修改题（10 分钟）：给阅读页加「阅读进度 SSR 安全化」：进度条初值服务端渲染为 0，客户端水合后从 localStorage 恢复（220 篇），要求零 mismatch 警告。

修 Bug 题（15 分钟）：注水后客户端控制台报「Cannot read properties of null」，定位到 `window.__INITIAL_STATE__` 存在但 store 字段缺失。给出原因（序列化的状态结构与 store 定义字段不一致，常见于版本更迭后新字段未初始化）与修法（注水前用 store 初始状态做合并兜底）。

挑战题（30 分钟）：把第 5 节扩成「含路由预取」：每个路由组件定义 `loadData(store, route)` 静态方法，服务端按当前路由逐个 await 后再渲染——这就是路由级数据预取的通用形态（Nuxt 的 useAsyncData 内部同构思想）。

## 11. 与之前和之后的知识的关系

- 往前：280 篇的 ssrRender 编译产物是本篇 renderToString 的内核；220 篇的 SSR 持久化、080 篇的 typeof window 纪律都在本篇汇合；
- 往后：[Nuxt 快速上手](/vue3/355-NuxtQuickStart) 把手搭链路工程化；[Vapor 模式与 Vue 3.6 展望](/vue3/370-VaporMode) 关注水合成本的下一代解法；React 侧的对应故事（流式 SSR、选择性水合）在 [React 服务端渲染](/react/260-ReactSSR)。

## 12. 官方文档

- 服务端渲染指南：https://cn.vuejs.org/guide/scaling-up/ssr.html
- @vue/server-renderer API：https://cn.vuejs.org/api/ssr.html
- 水合 mismatch 处理（data-allow-mismatch）：https://cn.vuejs.org/guide/scaling-up/ssr.html#hydration-mismatch
- useId：https://cn.vuejs.org/api/composition-api-helpers.html

## 13. 自我检查

- 能手写出 createSSRApp + renderToString 的最小服务并解释每请求新建实例的原因；
- 能描述水合三步（校验、挂监听、连响应式），说出 createApp 替换的后果；
- 能复述单例污染的成因、症状（偶发串数据）与工厂函数修法；
- 能画出「预取、渲染、注水、继承」四步链路并说出注水的安全注意事项；
- 拿到 window 未定义、mismatch 刷屏、数据串门三个现场能各在 1 分钟内给出排查方向。

## 本章总结

SSR 把首屏从「等 JS」变成「等 HTML」：服务端 createSSRApp 渲染出 HTML 直出，客户端水合接上电。三条铁律撑起整条链路——每请求新建应用全家桶（防单例污染，症状是偶发串数据）；服务端与客户端首屏输出逐字节一致（时间、随机、locale 都要延迟到 onMounted，必要时 data-allow-mismatch 豁免，useId 解决 id 同步）；数据服务端预取后序列化注水，客户端继承不重跑（注意源码可见的安全边界）。流式渲染配 Suspense 让首字节不等最慢的块。学习用手搭看清机制，生产交给 Nuxt 的工程化封装。

## 下一步

进入 [Nuxt 快速上手](/vue3/355-NuxtQuickStart)：约定式路由、useAsyncData、server/api、渲染模式切换——本篇手搭的每个零件，在 Nuxt 里都有一个对应的约定与零配置实现。
