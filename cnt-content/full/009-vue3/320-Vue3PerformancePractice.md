---
order: 320
title: Vue3 性能优化实践：测量先行，四层动刀
module: 'vue3'
category: 前端技术
difficulty: intermediate
description: 从内容库浏览页「筛选卡、滚动掉帧、首屏 2MB」三宗罪讲起：Performance 面板定位后按层动刀——响应式层 shallowRef/markRaw、渲染层 key 与组件边界、体积层异步组件与路由懒加载、验证层复测与 web-vitals，附深层 watch 卡顿、v-if 拿不到 v-for 变量、事件泄漏三则实录。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'vue3/280-Vue3CompileOptimization'
  - 'vue3/325-Vue3PerformanceToolkit'
  - 'vue3/050-ReactiveSystem'
  - 'vue3/270-Vue3ViteBuildConfig'
prerequisites:
  - 'vue3/280-Vue3CompileOptimization'
---

## 前置知识

- [Vue3 编译优化](/vue3/280-Vue3CompileOptimization)：知道 PatchFlag 与 Block 让 diff 只走动态名单——本篇解决「名单之外」的工程问题；
- [响应式系统](/vue3/050-ReactiveSystem)：ref / reactive 的追踪与断链规则。

## 学习目标

读完本文你将能够：

1. 用 Chrome Performance 面板把「卡」翻译成「哪一层、哪个组件、多少毫秒」；
2. 按响应式、渲染、体积三层选对工具：shallowRef / markRaw / key / 异步组件 / 路由懒加载各治什么；
3. 用 web-vitals 在真实用户侧验证优化效果，而不是只看自己电脑；
4. 识别深层 watch、v-if 与 v-for 同标签、事件未清理三个高频性能坑；
5. 建立「测量、动刀、复测」的闭环纪律，知道什么时候该停下（优化也有成本）。

预计 70 到 90 分钟。

## 1. 你现在要解决什么问题

FANDEX 内容库浏览页（Vue 3.5 + Vite 实现）：顶部筛选栏，下方 3000 条文档卡片，左侧目录树，右侧相关推荐。上线后三个反馈：

- **筛选卡**：每敲一个字，页面卡顿 200ms 以上；
- **滚动掉帧**：卡片滚起来一顿一顿；
- **首屏 2MB**：打开页面要下载 2MB JavaScript，弱网白屏三秒。

新手最容易的反应是「把学过的优化全加上」：到处 v-memo、所有 ref 换 shallowRef、每个组件都异步化。结果代码复杂一倍，卡顿依旧。本篇的纪律只有一条：**先测量定位，再按层动刀，动完复测**。三层结构预先摆好，测出哪层有问题去哪层拿工具：

```text
响应式层：数据变化触发了多少依赖？（shallowRef、markRaw、watch 粒度）
渲染层  ：组件更新与 patch 花了多少？（key、组件边界、v-memo）
体积层  ：首屏要下载解析多少 JS？（异步组件、路由懒加载、tree shaking）
```

## 2. 第一步：把「卡」翻译成数字

打开 Chrome DevTools 的 Performance 面板，录制「敲三个字 + 滚动列表」，停止后看三样东西：

1. **Main 线程火焰图**：找超过 50ms 的长任务，点开看调用栈——筛选卡顿的栈里是 3000 次 render 还是 3000 次响应式触发；
2. **每秒帧数**：滚动段的 FPS 曲线掉到 30 以下即掉帧，定位是 layout（样式重排）还是 script（脚本）占大头；
3. **Summary 饼图**：Scripting / Rendering / Painting 的占比决定先动哪层。

预期测量结果（本篇示例项目的形状）：筛选敲键触发「一次状态变化 + 3000 张卡片的渲染」；滚动掉帧主因是 3000 个卡片 DOM 全部存在；首屏 2MB 里 800KB 是图表库。三宗罪分别对应三层——先记下数字，优化后要拿同一把尺子复测。

## 3. 响应式层：别让大数据背响应式的税

Vue 的响应式（Proxy 递归代理）不是免费的：`ref(3000条数组)` 会把每条记录的每个字段都包上代理。3000 条 x 10 个字段 = 3 万个 Proxy，创建慢、追踪也慢。数据量大且**整体替换、不做细粒度字段改动**时，换 shallowRef：

```ts
import { shallowRef, triggerRef } from 'vue';

const docs = shallowRef([]);          // 只代理数组本身，不深入元素

async function loadDocs() {
  const list = await fetchDocs();     // 整体替换：shallowRef 自动触发更新
  docs.value = list;
}

function patchOne(doc) {              // 局部改动需要手动点灯
  doc.title = '新标题';
  triggerRef(docs);                   // 手动触发依赖
}
```

第二类税来自「不可能响应的数据」：图表实例、编辑器实例、地图对象——带大量内部状态的类实例，包成响应式纯浪费还可能出错，用 markRaw 标记豁免：

```ts
import { markRaw, shallowRef } from 'vue';

const chart = shallowRef(null);
chart.value = markRaw(new ECharts(el));   // 不被代理
```

第三类坑是 watch 粒度：`watch(() => store, cb, { deep: true })` 监听整个 store 且深比较，任何字段变化都触发一遍深遍历。修法永远是**收窄监听源**——watch 具体字段（getter 返回 `store.filter`），深层需求优先考虑「事件驱动」而不是「深度监视」。三个手段的共同思想：**响应式覆盖面要和真实的数据流形状匹配，别为不需要追踪的数据付追踪的钱。**

## 4. 渲染层：缩小组件更新的边界

筛选卡顿的另一半原因：筛选词 state 放在页面根组件，一变整棵树重渲染。结构性修法按优先级：

1. **状态下放**：筛选词只被「筛选栏 + 卡片列表」用，就收进这两个组件共有的最小父级，目录树和推荐栏从此与敲字无关（080 篇同款思路）；
2. **稳定 key**：卡片列表 `:key="doc.id"`，稳定 id 让 diff 复用节点；下标 key 在筛选（数组重排）时全表错乱重建——滚动掉帧与闪烁的常见元凶；
3. **热点再上 v-memo**：280 篇的规则不变，测量证实的大列表才用；
4. **显示切换选 v-show / v-if 有讲究**：频繁切换用 v-show（display 切换，保留 DOM）；条件很少变化且初始开销敏感用 v-if（真实卸载）。附一条 Vue 3 的语法事实：同一元素上 v-if 优先级高于 v-for，v-if 里**拿不到 v-for 的作用域变量**——这种写法本身就是坏味道，用 computed 过滤数据源才是正解。

Vue DevTools 的「高亮更新」（Highlight updates）开关是这一层的好尺子：打开后谁在无谓更新，界面直接闪给你看。

## 5. 体积层：首屏只带首屏要用的

800KB 图表库是首屏包的大头，但它只在文档统计弹窗里用。两层动刀：

```ts
// 路由级：每个页面独立 chunk，进哪个页下哪个包
const routes = [
  { path: '/docs', component: () => import('./pages/DocList.vue') },
  { path: '/lab', component: () => import('./pages/Lab.vue') },
];

// 组件级：重组件异步化，用到时才拉
import { defineAsyncComponent } from 'vue';
const StatsChart = defineAsyncComponent(() => import('./StatsChart.vue'));
```

配套三件：`import { debounce } from 'lodash-es'` 式命名导入吃满 tree shaking（拒收 `import _ from 'lodash'` 整包）；图片 `loading="lazy"` 延后视口外加载；构建产物用 rollup-plugin-visualizer 生成体积报告，确认大块头真的被切出去了。完整的 Vite 分包与预加载策略（manualChunks、modulePreload）在 [Vue 3 与 Vite](/vue3/270-Vue3ViteBuildConfig) 与 [Vue3 性能工程工具箱](/vue3/325-Vue3PerformanceToolkit)。

## 6. 验证：复测 + 真实用户数据

三层动完，回到第 2 节同一把尺子：录制同操作，长任务消失、FPS 回到 55 以上、首屏 JS 从 2MB 降到 500KB 以下——优化闭环才算完成。最后一层验证在真实用户侧，实验室数据只是下限：

```ts
import { onLCP, onINP, onCLS } from 'web-vitals';

function report(metric) {
  navigator.sendBeacon('/api/perf', JSON.stringify(metric));
}
onLCP(report);   // 最大内容绘制：首屏观感
onINP(report);   // 交互到下一次绘制：卡不卡
onCLS(report);   // 累积布局偏移：稳不稳
```

三个指标各有健康线（LCP 2.5s、INP 200ms、CLS 0.1），线上分布比本地跑分诚实——你测不到的千元机用户，RUM 替你看着。

## 7. 常见错误与调试实录

**错误一：deep watch 卡死输入。** 给 3000 条数据的 store 挂 `{ deep: true }` 的 watch 做自动保存，每次筛选都全量深比较 100ms 以上。三步定位：Performance 面板长任务栈里有深度遍历痕迹；验真身——watch 源是整个大对象；修正——收窄到具体字段，或改用 watchEffect 只追踪真实用到的依赖，保存类需求改事件驱动（提交时存）。

**错误二：v-if 和 v-for 挤在一个标签上。** `<div v-for="doc in docs" v-if="doc.visible">` 在 Vue 3 里 v-if 先执行，`doc` 未定义直接报错。这不是性能坑而是优先级事实：Vue 3 中 v-if 高于 v-for。修正：computed 先过滤出 visibleDocs，v-for 遍历结果——语义更清晰，还省掉隐藏节点的渲染开销。

**错误三：滚动监听泄漏，越用越卡。** 卡片组件在 onMounted 里 `window.addEventListener('scroll', ...)` 做曝光埋点，列表筛选重建后旧组件卸载但监听器还在，滚一次触发几百个幽灵回调。三步定位：Performance 里 scroll 回调数量异常、内存快照里组件实例未释放；验真身——onUnmounted 没有配对清理；修正——注册与清理成对书写，或封装成组合函数统一管理（080 篇的模式）。内存泄漏在性能问题里最隐蔽：它不是「慢」，是「越来越慢」。

**错误四：优化过度。** 给 20 条的小列表上 v-memo、给布尔值包 shallowRef、给不重组件全部异步化——每层优化都有维护成本与间接伤害（异步组件延迟、缓存漏依赖 bug）。判断标准回到测量：**量不出差异的优化不做。**

## 8. 实际项目中的使用场景

- **首屏预算**：给项目定死「首屏 JS gzip 后不超过 N KB」并写进 CI（325 篇的 Lighthouse CI 配置），体积回归在合并前拦截；
- **长列表分层方案**：几百条用「computed 过滤 + 稳定 key」就够；上千条上虚拟列表（325 篇手写核心 + vue-virtual-scroller 完整版）；上万条配合 shallowRef 与 Worker 分片处理；
- **性能监控常态化**：web-vitals 上报加长任务观察（PerformanceObserver 的 longtask 类型），线上劣化有报警；
- **优化评审话术**：每个优化 PR 必须附「优化前后测量数据」——没有数据的优化请求，评审时直接打回。

## 9. 小练习

预测题（5 分钟）：`docs` 是 3000 条的 shallowRef，直接 `docs.value[0].title = 'x'`，界面更新吗？（不更新——shallowRef 不追踪元素内部属性；补 `triggerRef(docs)` 或改为整体替换。）

修改题（10 分钟）：把第 1 节浏览页的筛选词 state 下放，验收：DevTools 高亮更新开着，敲字时目录树与推荐栏不闪。

修 Bug 题（15 分钟）：反馈「列表从 300 条涨到 3000 条后页面明显变慢」，给出排查顺序（响应式税、渲染名单、DOM 过量）与每步的测量手段，并给出与数据量匹配的分层方案。

挑战题（30 分钟）：实现 useLongTaskReporter 组合函数：用 PerformanceObserver 监听 longtask，超过 50ms 的任务上报「时长与归因」。验收：制造一个 200ms 循环，控制台收到一条上报。

## 10. 与之前和之后的知识的关系

- 往前：280 篇给了编译层的地基（diff 只走动态名单），本篇管「名单之外」的三层工程；050 篇的 Proxy 原理解释了响应式税从哪来；
- 往后：[Vue3 性能工程工具箱](/vue3/325-Vue3PerformanceToolkit) 承接虚拟列表、Worker、构建与 CI 预算的具体实现；[Vue3 服务端渲染](/vue3/350-Vue3SSR) 从另一个方向治首屏；[Vapor 模式](/vue3/370-VaporMode) 是运行时开销的终极解法。

## 11. 官方文档

- 性能（官方优化清单）：https://cn.vuejs.org/guide/best-practices/performance
- shallowRef / markRaw / triggerRef：https://cn.vuejs.org/api/reactivity-advanced.html
- defineAsyncComponent：https://cn.vuejs.org/guide/components/async.html
- web-vitals：https://github.com/GoogleChrome/web-vitals

## 12. 自我检查

- 能描述 Performance 面板定位「筛选卡」的完整操作序列与三个观察点；
- 能说出 shallowRef、markRaw、watch 收窄各自治什么税，并举出适用数据形状；
- 能写出「状态下放 + 稳定 key + 热点 v-memo」的组合拳并排出优先级；
- 能用 defineAsyncComponent 与路由懒加载治理首屏体积，并说出验证手段；
- 能复述「测量、动刀、复测」闭环，并说出「量不出差异的优化不做」的判断标准。

## 本章总结

性能优化的纪律是测量先行：Performance 面板把「卡」翻译成长任务、FPS 与占比数字，再按层动刀——响应式层砍掉大数据的追踪税（shallowRef 整体替换、markRaw 豁免第三方实例、watch 收窄监听源），渲染层缩小组件更新边界（状态下放、稳定 key、热点 v-memo、v-show/v-if 按切换频率选），体积层让首屏只带首屏要用的（路由懒加载、异步组件、tree shaking、图片懒加载）。动完用同一把尺复测，再用 web-vitals 在真实用户侧验证。三个高频坑：deep watch 深比较、v-if 高于 v-for（拿不到循环变量）、监听器泄漏让页面越来越慢。所有优化都要过同一道关：量不出差异的优化不做。

## 下一步

进入 [Vue3 性能工程工具箱](/vue3/325-Vue3PerformanceToolkit)：本篇点到为止的重武器在此展开——手写虚拟列表核心、Web Worker 计算卸载、请求去重缓存、Vite 分包与压缩、Lighthouse CI 体积预算，一套可以直接抄进项目的工程件。
