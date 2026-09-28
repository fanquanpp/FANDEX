---
order: 50
title: 响应式系统
module: 'vue3'
category: 前端技术
difficulty: intermediate
description: 从给前端实验室播放器做状态的真实场景理解 Vue 3 响应式：Proxy 原理、ref 与 reactive 的选择、浅层响应与 markRaw、effectScope 作用域管理，以及解构丢失响应性等经典坑。
author: fanquanpp
updated: '2026-09-28'
related:
  - 'vue3/060-ComputedCacheWatchTiming'
  - 'vue3/080-CompositionAPIAdvantageScene'
  - 'vue3/100-CustomComposableWrapper'
  - 'vue3/370-VaporMode'
prerequisites:
  - 'vue3/020-Vue3QuickStartGuide'
---

## 前置知识

- [第一个组件](/vue3/020-Vue3QuickStartGuide)：会用 `ref` 写计数器，知道「改了数据视图就变」这件事不用你操心

## 学习目标

- 说清 Vue 3 靠什么做到「改数据自动更新视图」：Proxy 拦截读写、渲染时收集依赖、赋值时触发更新
- 在 ref 与 reactive 之间快速做出正确选择，并说清各自不能做什么
- 用 `shallowRef` / `markRaw` 管住「不该响应式的东西」：第三方类实例、大列表、图表库对象
- 用 `effectScope` / `onScopeDispose` 写出可整体销毁的组合式函数
- 避开三大经典坑：解构丢响应性、引用替换丢代理、误把大对象做深度响应

## 场景：给「前端实验室」的代码播放器建状态

FANDEX 网页端的前端实验室页面是一个交互密集的 React/编辑器岛屿。设想用 Vue 3 重写它的核心：左边代码输入框，右边实时预览，外加运行日志、执行耗时统计。它需要这样的状态：

```ts
// studio.ts —— 实验室播放器的状态模块
import { ref, reactive, computed } from 'vue';

export const code = ref('<h1>hello</h1>');

export const runLog = reactive<{ time: string; text: string }[]>([]);

export const stats = reactive({
  runCount: 0,
  lastCostMs: 0,
});

export const summary = computed(
  () => `已运行 ${stats.runCount} 次，上次耗时 ${stats.lastCostMs}ms`
);

export function run() {
  const start = performance.now();
  runLog.push({ time: new Date().toLocaleTimeString(), text: code.value });
  stats.lastCostMs = Math.round(performance.now() - start);
  stats.runCount++;
}
```

`code` 一变，输入框和预览同时更新；`stats.runCount` 一变，`summary` 重新计算、组件自动重渲染。没有任何一处「通知视图」的代码——这就是响应式系统在干活。本文的目标是让你不仅会用，还知道它为什么可靠、什么时候会失效。

## 一、原理：三个词就够了

Vue 3 的响应式可以用一句话概括：**用 Proxy 拦截读写，读的时候记住谁在读（依赖收集），写的时候通知他们更新（触发更新）**。

1. `ref()` / `reactive()` 返回的是被 Proxy 包住的代理对象。你对 `state.count` 的每次读取都会触发 Proxy 的 get 拦截器，每次赋值触发 set 拦截器。
2. 组件渲染函数执行时，模板里用到的每个响应式属性都被「正在渲染的组件」读取——get 拦截器把这个组件记为该属性的依赖。
3. 之后 `state.count++` 走 set 拦截器，Vue 查依赖表，把依赖这个属性的组件排进更新队列（异步、去重、按组件批量执行）。

对比 Vue 2：`Object.defineProperty` 只能拦截「已存在属性的读写」，所以新增属性要 `Vue.set`、数组下标赋值要hack。Proxy 拦截的是整个对象层面的操作，新增、删除、`list[0] = 99`、Map / Set 的方法调用全部原生支持：

```ts
import { reactive } from 'vue';

const state = reactive({ list: [1, 2, 3], map: new Map<string, number>() });

state.list[0] = 99;    // 触发更新（Vue 2 里不行）
state.newField = 'x';  // 新属性自动响应式（Vue 2 里要 Vue.set）
delete state.newField; // 删除也触发更新
state.map.set('a', 1); // Map 方法同样被拦截
```

2026 年的现状补充：3.5 重构了响应式 internals（大数组深度操作提速、内存下降），API 完全不变；即将到来的 3.6 Vapor 模式也**不改变这套响应式 API**——变的只是编译产物如何更新 DOM。你现在学的心智模型在两个模式里通用。

## 二、ref 还是 reactive：一个决策表

| 场景 | 选择 | 原因 |
| :--- | :--- | :--- |
| 基本类型（数字、字符串、布尔） | `ref` | reactive 根本不接受基本类型 |
| 需要整体替换的对象（换一页数据） | `ref` | `state.value = newObj` 一行搞定 |
| 局部表单对象、不会整体替换 | `reactive` | 写法少一层 `.value` |
| 要被解构展开返回的模块 | `ref` 或 `reactive + toRefs` | 见坑点一 |

日常速记：**默认用 ref；只有当你确定这个对象永远不会被整体替换、且想省掉 .value 时，才用 reactive。** 官方风格指南同样倾向 ref，理由是 ref 的能力是 reactive 的超集。

`ref` 包对象时，`.value` 内部自动再套一层 reactive 代理，所以深层属性照样响应式——`user.value.address.city = 'x'` 能触发更新。

## 三、动手：浅层响应与「不响应的值」

实验室播放器继续演进：要嵌入一个第三方图表库，并把运行日志做成大列表。两处都需要管住响应式的范围。

### 3.1 markRaw：第三方实例不要代理

图表库实例（ECharts、CodeMirror Editor）自带复杂内部状态，被 Proxy 代理后轻则性能劣化，重则内部逻辑错乱（库用 Map/WeakMap 做实例索引，代理后 `get` 拿到的是代理对象，匹配不上）：

```ts
import { shallowRef, markRaw } from 'vue';

export const editor = shallowRef<Editor | null>(null);

export function mountEditor(el: HTMLElement) {
  const ed = new CodeMirror(el, { value: code.value });
  editor.value = markRaw(ed); // 永久标记：这个对象不要代理
}
```

`markRaw` 是「永久豁免」：标记过的对象即使被塞进 reactive / ref 里也保持原样。误用响应式包装第三方实例是 Vue 3 新手最贵的错误之一，症状通常是「库莫名失灵且控制台查不出原因」。

### 3.2 shallowRef：大列表只要「换的时候」通知我

运行日志可能有几千条。深度响应式会为每条日志建代理，成本高而收益低——我们只在「整批替换日志」时才需要触发更新：

```ts
import { shallowRef } from 'vue';

const logs = shallowRef<LogEntry[]>([]);

// 触发更新的唯一方式：替换 .value
logs.value = fetchNewLogs();

// 想原地改又手动通知？用 triggerRef
logs.value.push(newLog);
triggerRef(logs); // 手动触发依赖更新
```

`shallowRef` 只追踪 `.value` 本身的赋值，内部一概不管。配合「不可变更新」（总是造新数组替换）是最省心的组合，也是大多数状态库（Pinia 之外）推荐的模式。

### 3.3 customRef：把防抖做进 ref

搜索框防抖是 `customRef` 的经典应用——拦截 set，延迟后再真正更新并触发依赖：

```ts
import { customRef } from 'vue';

export function debouncedRef<T>(value: T, delay = 300) {
  let timer: ReturnType<typeof setTimeout>;
  return customRef((track, trigger) => ({
    get() {
      track();   // 照常收集依赖
      return value;
    },
    set(newValue) {
      clearTimeout(timer);
      timer = setTimeout(() => {
        value = newValue;
        trigger(); // 延迟后才通知视图
      }, delay);
    },
  }));
}

// 用法：视图绑定它，输入停 300ms 后才触发过滤
const searchQuery = debouncedRef('', 300);
```

日常业务里 VueUse 的 `refDebounced` 更省事，但亲手写一遍 `customRef`，你才算真正理解 track / trigger 这对开关就是响应式的全部。

## 四、effectScope：组合式函数的「总开关」

`watch` / `watchEffect` / `computed` 都会创建需要停止的副作用。组件里使用时它们自动随组件销毁；但**在组件外**（独立状态模块、测试、跨组件共享的逻辑）创建的副作用没人管，会永久泄漏。`effectScope` 就是它们的容器：

```ts
import { effectScope, watchEffect, onScopeDispose } from 'vue';

// 一个可整体销毁的轮询模块
export function usePolling(fetcher: () => Promise<void>, interval = 5000) {
  const scope = effectScope();

  scope.run(() => {
    watchEffect(async () => {
      await fetcher();
    });
    const timer = setInterval(fetcher, interval);
    onScopeDispose(() => clearInterval(timer)); // scope 停止时顺带清理
  });

  return {
    stop: () => scope.stop(), // 一次停掉内部所有 watch 与 onScopeDispose 回调
  };
}
```

配套的两个小工具：`getCurrentScope()` 判断「我现在在某个 scope 里吗」（避免在组件 setup 之外裸调 watch）；`onScopeDispose(fn)` 注册清理回调，写在组合式函数里等效于组件里的 `onUnmounted`，但组件内外都能用。设计[自定义组合式函数](/vue3/100-CustomComposableWrapper)时这是标配。

## 五、坑点与自检

### 坑一：解构 reactive 丢响应性

```ts
const state = reactive({ count: 0 });
const { count } = state; // count 是普通数字 0，和 state 从此无关
state.count++;
console.log(count); // 依然是 0
```

原因：解构发生在读取瞬间，拿走的是当时的值。修复：`const { count } = toRefs(state)`，每个属性变成与源对象同步的 ref。函数参数、props 传值同理——传出去的是值不是引用。

### 坑二：替换 reactive 变量的引用

```ts
let state = reactive({ count: 0 });
state = { count: 1 }; // 变量现在指向普通对象，视图还绑着旧代理
```

视图模板绑定的是 `reactive()` 返回的那个代理。重新赋值后组件读的还是旧代理，更新「消失」。修复：整体替换的需求用 `ref`（`state.value = {...}`）；或逐字段赋值；数组的批量替换用 `list.splice(0, list.length, ...newItems)`。

### 坑三：对大对象 / 第三方实例做深度响应

症状：大数组操作卡、图表库行为异常。处方：大列表用 `shallowRef` + 不可变更新，第三方实例一律 `markRaw`。

### 自检（回答不出的回对应小节）

1. Vue 3 靠什么让「新增属性」自动响应式，而 Vue 2 需要 Vue.set？
2. `logs.value.push(x)` 在 shallowRef 下触发更新吗？怎么让它触发？
3. 为什么第三方类实例要 markRaw？不标记的典型症状是什么？
4. 组件外创建的 watchEffect 谁负责停？effectScope 解决什么问题？

## 练习

1. 实现实验室播放器的状态模块：`code`（ref）、`runLog`（shallowRef 大列表 + 清空 / 追加）、`stats`（reactive）、`summary`（computed），并写一个「重置全部」函数，验证每种 API 的更新方式。
2. 用 `customRef` 写一个 `throttledRef`（节流：设定时间内最多更新一次），与本文的 debouncedRef 对比测试。
3. 把 `usePolling` 改造为可暂停 / 恢复（结合 [watch 暂停恢复](/vue3/360-Vue3NewFeatures3435)），确认 stop 后定时器与 watch 全部清理。

## 下一步

- [Computed 缓存与 watch 时机](/vue3/060-ComputedCacheWatchTiming)：响应式之上最常用的两个派生 API 的细节
- [Composition API 的优势与场景](/vue3/080-CompositionAPIAdvantageScene)：为什么这套 API 配合响应式能重构逻辑组织
- [自定义 Composable 封装](/vue3/100-CustomComposableWrapper)：effectScope 与 onScopeDispose 的工程化用法
