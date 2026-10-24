---
order: 330
title: Vue3 性能工程工具箱：虚拟列表、Worker、构建与预算
module: 'vue3'
category: 前端技术
difficulty: beginner
description: 与 320 篇配套的工程件集合：三十行手写虚拟列表核心与 vue-virtual-scroller 完整版、Web Worker 计算卸载（?worker 导入）、请求去重与缓存组合函数、Vite 分包压缩与体积分析、Lighthouse CI 性能预算配置，让优化从手工操作变成可复用资产。
author: fanquanpp
updated: '2026-10-11'
related: []
prerequisites: []
---

## 前置知识

- [Vue3 性能优化实践](/vue3/320-Vue3PerformancePractice)：先测量后动刀的纪律，本篇是它的武器库；
- [Vue 3 与 Vite](/vue3/270-Vue3ViteBuildConfig)：vite.config.ts 的基本结构。

## 1. 这篇是干什么的

320 篇每层只点名了工具，本篇把四个「写了就能用」的工程件展开到可抄代码级别：虚拟列表、Web Worker、请求去重缓存、构建预算。每个都给出「什么时候用、怎么实现、坑在哪」。

## 2. 虚拟列表：先手写核心，再上库

需求形状：上千条数据的滚动列表，DOM 常驻只剩可视区。手写 30 行核心，理解库在做什么：

```vue
<script setup>
import { ref, computed } from 'vue';

const props = defineProps({ items: Array, itemHeight: { type: Number, default: 56 } });

const container = ref(null);
const scrollTop = ref(0);

const visibleCount = computed(() =>
  Math.ceil((container.value?.clientHeight ?? 600) / props.itemHeight) + 2  // 上下各多渲染 1 条缓冲
);
const startIndex = computed(() => Math.max(0, Math.floor(scrollTop.value / props.itemHeight) - 1));
const visibleItems = computed(() =>
  props.items.slice(startIndex.value, startIndex.value + visibleCount.value)
);
const offsetY = computed(() => startIndex.value * props.itemHeight);
</script>

<template>
  <div
    ref="container"
    class="virtual-list"
    @scroll="scrollTop = $event.target.scrollTop"
  >
    <!-- 撑起真实滚动高度的隐形占位 -->
    <div :style="{ height: items.length * itemHeight + 'px' }" />
    <div class="viewport" :style="{ transform: `translateY(${offsetY}px)` }">
      <div
        v-for="item in visibleItems"
        :key="item.id"
        :style="{ height: itemHeight + 'px' }"
      >
        <slot :item="item" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.virtual-list { height: 600px; overflow-y: auto; position: relative; }
.viewport { position: absolute; top: 0; left: 0; right: 0; }
</style>
```

核心三件套：**总高占位**撑出真实滚动条、**起点切片**只渲染可视区附近、**位移补偿**让切片对准滚动位置。固定行高是前提；行高不固定的列表，自己写就要维护「前缀和高度表」，复杂度陡增——这正是上库的信号。生产环境直接用 vue-virtual-scroller：

```vue
<script setup>
import { RecycleScroller } from 'vue-virtual-scroller';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';
</script>

<template>
  <RecycleScroller
    :items="users"
    :item-size="60"
    key-field="id"
    :buffer="200"
    class="scroller"
  >
    <template #default="{ item }">
      <UserRow :user="item" />
    </template>
  </RecycleScroller>
</template>
```

RecycleScroller 额外做了节点回收复用（滚动中 DOM 数量恒定），buffer 控制视口外预渲染距离。坑：key-field 必须指向唯一稳定字段；行内图片要定宽高，否则加载完成撑高行导致跳动。

## 3. Web Worker：把计算挪出主线程

数据聚合、大文件解析这类毫秒到秒级的计算，在主线程跑就掉帧。Vite 对 Worker 有一等支持，`?worker` 后缀导入：

```ts
// workers/stats.worker.ts
self.onmessage = (e) => {
  const { docs } = e.data;
  // 重活在这里：分类统计、聚合，几百毫秒也不影响主线程
  const byCategory = docs.reduce((acc, d) => {
    acc[d.category] = (acc[d.category] ?? 0) + 1;
    return acc;
  }, {});
  self.postMessage(byCategory);
};
```

```vue
<script setup>
import { ref, onUnmounted } from 'vue';
import StatsWorker from '@/workers/stats.worker.ts?worker';   // Vite 编译为独立 chunk

const result = ref(null);
const worker = new StatsWorker();

worker.onmessage = (e) => {
  result.value = e.data;
  computing.value = false;
};
onUnmounted(() => worker.terminate());   // 组件卸载必须终止，否则线程泄漏
</script>
```

边界认知：Worker 与主线程**不共享内存**，postMessage 走结构化克隆——传 100MB 数据本身就要几百毫秒。适合「计算重、传输小」的任务；传大数组时考虑 Transferable（ArrayBuffer 转移所有权，零拷贝）。DOM 与 Vue 响应式对象都不能进 Worker——进去之前先变成纯数据。

## 4. 请求去重与缓存：useFetch 不再重复发车

切换筛选时同一 URL 被连续请求、多个组件同时挂载请求同一接口——两个浪费用一个组合函数解决：

```ts
// composables/useCachedFetch.ts
import { ref, shallowRef } from 'vue';

const cache = new Map();          // url -> Promise（进行中或已完成）

export function useCachedFetch(url) {
  const data = shallowRef(null);
  const error = ref(null);

  async function load() {
    if (!cache.has(url.value)) {
      // 去重：进行中的请求直接复用同一个 Promise
      cache.set(
        url.value,
        fetch(url.value).then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        })
      );
    }
    try {
      data.value = await cache.get(url.value);
    } catch (e) {
      cache.delete(url.value);    // 失败不缓存，允许重试
      error.value = e;
    }
  }

  load();
  return { data, error, reload: load };
}
```

要点：缓存的是 **Promise 而不是结果**——「去重」天然成立（并发请求共用一次飞行）；失败要清缓存允许重试；shallowRef 存响应数据免响应式税（320 篇）。生产级需求（过期策略、SWR、分页）直接上 VueUse 的 useFetch 或 TanStack Query，本函数的价值是看懂它们的内核。

## 5. Vite 构建：分包、压缩与体积报告

三件配置写在 vite.config.ts：

```ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { visualizer } from 'rollup-plugin-visualizer';
import { compression } from 'vite-plugin-compression2';

export default defineConfig({
  plugins: [
    vue(),
    visualizer({ filename: 'dist/stats.html', gzipSize: true }),  // 构建后生成体积报告
    compression({ algorithm: 'gzip' }),                            // 产出 .gz 静态压缩文件
  ],
  build: {
    rollupOptions: {
      output: {
        // 把稳定的第三方库拆成独立 chunk，业务迭代不再打散它们的缓存
        manualChunks: {
          vue: ['vue', 'vue-router', 'pinia'],
          charts: ['echarts'],
        },
      },
    },
  },
});
```

使用顺序有讲究：先 `npm run build` 打开 dist/stats.html 体积报告，找出最大块，再决定拆什么——图表库走 manualChunks 独立缓存，业务组件走路由懒加载（320 篇）。开发期别忘了 optimizeDeps 预构建（依赖多时首启慢，把稳定依赖显式 include 进去）。服务器确认开了 gzip/brotli 传输压缩，静态压缩文件是给 CDN 用的。

## 6. CI 性能预算：让回归在合并前现形

优化的死敌是回潮：三周前的优化被一个新依赖悄悄吃掉。预算写进 CI（GitHub Actions + Lighthouse CI）：

```json
// .lighthouserc.json
{
  "ci": {
    "collect": {
      "startServerCommand": "npm run preview",
      "numberOfRuns": 3
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }],
        "total-blocking-time": ["error", { "maxNumericValue": 300 }]
      }
    }
  }
}
```

```yaml
# .github/workflows/performance.yml
name: Performance Budget
on: [pull_request]
jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm run build
      - uses: treosh/lighthouse-ci-action@v11
        with:
          config-path: ./.lighthouserc.json
```

PR 上每条超标指标直接打红，预算线按自己项目的历史数据定（先测出基线，再收紧）。纯体积类的粗预算可以用 size-limit 之类的包体积断言工具做补充——关键不是工具，是「预算数字进了门禁」这件事。

## 6.1 网络传输侧：预加载、压缩细节与资源瘦身

承接原性能篇拆出的网络维度补充，四个工程动作：

**关键资源预加载**——首屏真正需要的资源提前一步：

```html
<!-- index.html：预加载首屏大图与关键接口（prefetch 则是"下一页可能用"，优先级更低） -->
<link rel="preload" href="/images/hero.jpg" as="image" />
<link rel="preload" href="/fonts/main.woff2" as="font" type="font/woff2" crossorigin />
```

**压缩的收尾细节**——用 terser 时顺手清掉生产日志与调试器（Vite 默认 esbuild 压缩已很快，需要 drop_console 这类语义级裁剪时才换 terser）：

```ts
build: {
  minify: 'terser',
  terserOptions: {
    compress: { drop_console: true, drop_debugger: true },
  },
}
```

**Tree-shaking 的导入纪律**——命名导入让打包器能安全剪枝，命名空间/默认全量导入会把整个库拖进包：

```ts
import { debounce } from 'lodash-es'   // 只打包 debounce
import _ from 'lodash'                  // 反例：全量进包
```

**静态资源瘦身清单**——图片转 WebP/AVIF（同画质体积减 30% 起）、构建期压缩（vite-plugin-imagemin 或 CI 里的 sqoosh）、静态资源上 CDN 并配长缓存（带内容哈希的文件名配 `Cache-Control: max-age=31536000, immutable`）。

**请求合并**——同屏多个小接口合批（BFF 聚合或网关 batch 端点），把三次往返压成一次；与上文 useCachedFetch 的去重缓存配合使用（去重管"同一接口别发两次"，合批管"多个接口并成一次"）。

## 7. 小练习

预测题（3 分钟）：手写虚拟列表滚动到第 500 条时，DOM 里实际存在多少个列表项节点？（可视区条数 + 2 条缓冲，与总数据量无关——这正是「虚拟」的含义。）

修改题（10 分钟）：给 useCachedFetch 加 `staleTime` 参数：缓存超过 N 秒后视为过期，重新请求（旧数据先展示，新数据到了再替换——SWR 雏形）。

修 Bug 题（15 分钟）：Worker 方案上线后内存缓慢上涨。找出问题：组件反复挂载卸载但 new StatsWorker() 在 setup 外（模块顶层）创建了一次、且从未 terminate——修正为 setup 内创建 + onUnmounted 终止，或模块级单例 + 复用不终止（二选一并说明取舍）。

挑战题（30 分钟）：把手写虚拟列表升级为「不定行高」：渲染后用 ref 测量实际高度更新高度表，重算总高与起点。验收：混合 40px 与 80px 行的列表滚动不错位。做完再看 vue-virtual-scroller 的 DynamicScroller，你会认出每一行代码。

## 8. 官方文档

- Vite 构建 options：https://cn.vite.dev/config/build-options.html
- Vite Web Worker：https://cn.vite.dev/guide/features.html#web-workers
- vue-virtual-scroller：https://github.com/Akryum/vue-virtual-scroller
- Lighthouse CI：https://github.com/GoogleChrome/lighthouse-ci

## 本章总结

四个工程件对应四类瓶颈：虚拟列表治 DOM 过量（总高占位 + 起点切片 + 位移补偿三件套，固定行高手写、动态行高上库）；Web Worker 治主线程长任务（?worker 导入、结构化克隆、onUnmounted 必须 terminate）；请求去重治重复飞行（缓存 Promise 而非结果）；构建与 CI 治体积回潮（visualizer 报告找大块、manualChunks 拆稳定库、Lighthouse CI 把预算写进门禁）。每个件都遵守同一条纪律：先测量确认瓶颈属于这一类，再取工具。

## 与本文相关的学习路径

- [Vue3 性能优化实践](/vue3/320-Vue3PerformancePractice)：本工具箱的使用前提与测量方法；
- [Vue 3 与 Vite](/vue3/270-Vue3ViteBuildConfig)：vite.config 的系统讲解；
- [Vue3 编译优化](/vue3/280-Vue3CompileOptimization)：运行时侧的优化地基。
