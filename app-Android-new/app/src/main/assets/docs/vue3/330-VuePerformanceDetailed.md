---
order: 330
title: Vue 性能优化详解
module: 'vue3'
category: 前端技术
difficulty: advanced
description: Vue 3 性能优化详解：shallowRef/markRaw 响应式减负、v-memo/v-once 渲染跳过、虚拟滚动与异步组件，附完整可运行示例与陷阱清单。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'vue3/220-PiniaPersistencePlugin'
  - 'vue3/200-VueRouterNavigationGuard'
  - 'vue3/340-PerformanceOptimization'
  - 'vue3/240-Vue3AdvancedComponentFeature'
prerequisites:
  - 'vue3/050-ReactiveSystem'
---

## 前置知识

- [响应式系统](/vue3/050-ReactiveSystem)：理解 ref/reactive 的追踪机制，才能明白"少一层代理"为什么快

## 学习目标

- 掌握 shallowRef / shallowReactive / markRaw 的适用场景与副作用
- 会用 v-memo、v-once 跳过不必要的渲染，并理解 v-memo 依赖数组的语义
- 能手写一个最小可用的虚拟滚动列表，知道何时该上现成库
- 了解异步组件与 KeepAlive 在性能优化中的分工

## 1. 响应式优化

原则：**让响应式系统只追踪真正会变的数据**。Vue 3 的 Proxy 是惰性深层的——只有被读取的属性才会递归代理，但大型不可变数据集仍然不值得交给代理。

### 1.1 shallowRef：只追踪 .value 的替换

```vue
<script setup>
import { shallowRef } from 'vue';

// 大型数据集（如上万条的表格数据）不需要深层响应式
const bigData = shallowRef(loadHugeDataset());

// 只有整体替换 .value 才触发更新
function replaceAll(newData) {
  bigData.value = newData; // 触发
}

// 原地修改不会触发（浅层）
function mutateInPlace() {
  bigData.value.items.push(newItem); // 不触发
  // 需要手动通知时：
  // import { triggerRef } from 'vue'; triggerRef(bigData);
}
</script>
```

典型场景：一次性加载、整体替换的列表数据；配合第三方图表库的数据快照；`performance.mark` 采样的时间序列。

### 1.2 shallowReactive：只追踪根级属性

```javascript
import { shallowReactive } from 'vue';

const state = shallowReactive({
  items: [],  // 嵌套属性不是响应式的
  count: 0    // 根级属性是响应式的
});

state.count++;       // 触发
state.items.push(1); // 不触发
```

### 1.3 markRaw：把数据挡在响应式系统之外

```javascript
import { markRaw, reactive } from 'vue';

const state = reactive({
  // 第三方类实例、图表实例、复杂对象：永远不需要被代理
  chart: markRaw(new Chartlib(/* ... */)),
  config: markRaw(frozenConfig)
});
```

陷阱：`markRaw` 标记的是对象本身，且**不可撤销**。如果后续把该对象的"干净副本"（浅拷贝或序列化还原）塞进响应式系统，标记会丢失，仍会被代理。需要彻底排除时，直接用普通变量存放，或用 `shallowRef` 控制更新时机。

### 1.4 Object.freeze：从源头跳过代理

```javascript
const frozenList = Object.freeze(hugeArray);
const items = ref(frozenList); // Vue 检测到冻结对象，跳过深层代理转换
```

适合真正只读的字典、枚举表、配置常量。注意：冻结后连"通过替换触发"的路径也被堵死（对象本身不可变），只适合一次性写入的数据。

## 2. 渲染优化

### 2.1 v-memo：按依赖数组跳过子树更新

```vue
<template>
  <div v-for="item in list" :key="item.id" v-memo="[item.selected]">
    <p>{{ item.name }}（依赖不变时整段 VNode 复用）</p>
    <ExpensiveComponent :data="item" />
    <button @click="toggle(item)">
      {{ item.selected ? '已选中' : '未选中' }}
    </button>
  </div>
</template>
```

`v-memo="[item.selected]"` 的语义：仅当 `item.selected` 与上次渲染不同（或依赖数组长度变化）时才重新 diff 这棵子树，否则整体复用缓存。上面例子中改 `item.name` 不会触发这一项的更新——**依赖数组必须覆盖模板中用到的所有响应式值**，漏掉一个就是静默的界面陈旧 bug。

无 `v-for` 时也可以单独使用：`<div v-memo="[a, b]">...</div>`，等价于"只有 a 或 b 变了才重新渲染这里"。

### 2.2 v-once：静态内容只渲染一次

```vue
<template>
  <h1 v-once>{{ title }}</h1>
  <!-- 后续任何更新都跳过该节点 -->
</template>
```

### 2.3 虚拟滚动：只渲染可视区

一万条数据全量渲染，瓶颈在 DOM 数量而不是 Vue 本身。虚拟滚动的思路是只渲染视口内 + 上下缓冲区的条目：

```vue
<template>
  <!-- 容器固定高度，内部撑起总高度，可视区用 transform 平移 -->
  <div class="viewport" ref="viewport" @scroll="onScroll">
    <div class="spacer" :style="{ height: totalHeight + 'px' }"></div>
    <div class="slice" :style="{ transform: `translateY(${offset}px)` }">
      <div v-for="item in visibleItems" :key="item.id" class="row">
        {{ item.content }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const items = ref(Array.from({ length: 10000 }, (_, i) => ({
  id: i,
  content: `条目 ${i}`
})));
const ROW_HEIGHT = 40;
const BUFFER = 5;

const viewport = ref(null);
const scrollTop = ref(0);
const viewportHeight = ref(600);

const start = computed(() =>
  Math.max(0, Math.floor(scrollTop.value / ROW_HEIGHT) - BUFFER)
);
const end = computed(() =>
  Math.min(items.value.length,
    Math.ceil((scrollTop.value + viewportHeight.value) / ROW_HEIGHT) + BUFFER)
);
const visibleItems = computed(() => items.value.slice(start.value, end.value));
const totalHeight = computed(() => items.value.length * ROW_HEIGHT);
const offset = computed(() => start.value * ROW_HEIGHT);

function onScroll(e) {
  scrollTop.value = e.target.scrollTop;
  viewportHeight.value = e.target.clientHeight;
}
</script>

<style scoped>
.viewport { position: relative; overflow-y: auto; height: 600px; }
.spacer { position: absolute; top: 0; left: 0; width: 1px; }
.slice { position: absolute; top: 0; left: 0; right: 0; }
.row { height: 40px; line-height: 40px; border-bottom: 1px solid #eee; }
</style>
```

上面是定高行的最小实现，用于理解原理。生产项目推荐 `vue-virtual-scroller`、`vueuse` 的 `useVirtualList`，或表格组件内置的虚拟滚动——它们处理了变高行、横向虚拟化与滚动抖动。

### 2.4 大计算量挪出渲染路径

过滤器式的内联计算（`{{ list.filter(...).map(...).length }}`）每次渲染都重新执行。改用 `computed` 享受缓存，超大数据集再考虑 `shallowRef` + 手动失效。

## 3. 组件优化

### 3.1 异步组件：首屏只加载首屏

```javascript
import { defineAsyncComponent } from 'vue';

// 重型组件（图表、编辑器、地图）按需加载
const HeavyChart = defineAsyncComponent(() => import('./HeavyChart.vue'));

// 带加载与错误态的完整写法
const Editor = defineAsyncComponent({
  loader: () => import('./Editor.vue'),
  loadingComponent: Spinner,
  errorComponent: ErrorBox,
  delay: 200,    // 200ms 内返回则不闪 loading
  timeout: 10000
});
```

配合路由懒加载（`() => import('./views/About.vue')`）与打包分析（`rollup-plugin-visualizer`），把首屏 bundle 控制在合理体积。

### 3.2 KeepAlive：缓存组件实例

```vue
<template>
  <KeepAlive :include="['UserList', 'Settings']" :max="10">
    <RouterView />
  </KeepAlive>
</template>
```

切换标签页/路由时保留组件状态，避免重复请求与重建开销。`include` 按组件名匹配，`max` 用 LRU 策略防止内存无限增长。详见 [KeepAlive 缓存与生命周期](/vue3/160-KeepAliveCacheLifecycle)。

### 3.3 列表项组件：稳定 key + 少量 props

- `:key` 用业务唯一 id，不用数组下标——下标 key 在插入/删除时会引发大面积错误复用。
- 列表项组件的 props 保持精简：传整个大对象会让 Vue 追踪更多属性的变更。

## 4. 编译优化

Vue 3 编译器在构建期已经做了大量工作，理解它们有助于写出"编译器友好"的模板：

- **静态提升（Static Hoisting）**：纯静态的 VNode 被提到 render 函数外，只创建一次。
- **补丁标记（Patch Flags）**：动态节点带上"只有文本会变"这类标记，diff 时跳过静态内容。
- **块级树（Block Tree）**：diff 在扁平化的动态节点数组中进行，不再递归遍历整棵树。
- **缓存处理器（Cache Handlers）**：内联事件处理函数被缓存，子组件不会因父组件重渲染而跟着重渲染。

这意味着：把"会不会变"的信息留给编译器（不要把静态内容包进 `v-if` 动态分支之外又包一层函数调用），静态节点越多，收益越大。

## 5. 常见陷阱

| 陷阱 | 后果 | 正确做法 |
| --- | --- | --- |
| v-memo 依赖数组漏写模板中用到的值 | 界面显示陈旧数据 | 依赖数组覆盖该子树用到的**全部**响应式值 |
| shallowRef 后原地 push 不更新 | 数据变了界面不动 | 整体替换 `.value`，或 `triggerRef` 手动触发 |
| 对需要深层编辑的数据用 Object.freeze | 改不动也不报错（严格模式抛错） | 只对真正只读的数据冻结 |
| 用 index 作 key 且列表会增删 | 复用错组件、输入串行 | 用业务唯一 id |
| 在 v-for 上同时挂 v-if | 每次渲染都完整过滤，且可读性差 | 用 `computed` 预先过滤 |
| 深层 watch 大型对象 | 一次修改遍历整棵树 | 改造数据结构，或 shallowRef + 精确触发 |

## 6. 测量先行

优化前先测量，避免凭感觉优化：

- **Vue DevTools** 的 Timeline / Components 面板：定位重渲染热点组件。
- **`app.config.performance = true`**（开发模式）：打开组件渲染耗时追踪。
- **Performance API**：`performance.mark('list-render-start')` / `performance.measure` 包住可疑代码段。
- **`rollup-plugin-visualizer`**：分析 bundle 构成，确认分包策略有效。

## 7. 小结

分层记住优化抓手：

1. **数据层**：shallowRef / shallowReactive / markRaw / Object.freeze，让代理只覆盖会变的数据。
2. **渲染层**：v-memo 按依赖跳过子树、v-once 冻结静态内容、虚拟滚动控制 DOM 总量、计算属性接住重复计算。
3. **组件层**：异步组件切分首屏、KeepAlive 复用实例、稳定 key 保证正确复用。
4. **编译层**：信任静态提升与补丁标记，保持模板"静态信息"清晰。

所有优化的前提是测量：先用 DevTools 与 Performance API 定位热点，再从上述四层中选对应工具，避免过早优化把代码搅复杂。
