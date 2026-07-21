---
order: 58
title: Vue3性能优化实践
module: vue3
category: Vue3
difficulty: intermediate
description: Vue3应用性能优化技巧
author: fanquanpp
updated: '2026-06-14'
related:
  - vue3/Vue3测试策略
  - 'vue3/Vue3与Web Components'
  - vue3/响应式系统
  - vue3/自定义Hook
prerequisites:
  - vue3/语法速查
---

# Vue3 性能优化实践 | Vue3 Performance Optimization in Practice

> 本文档对标 MIT 6.170、Stanford CS142、CMU 17-437 软件工程课程水准，系统化阐述 Vue 3 应用的性能优化理论与实践。涵盖响应式系统优化、渲染优化、打包优化、运行时优化、网络层优化等核心主题，并辅以数学建模、对比分析、案例研究与习题。

---

## 目录

1. [学习目标](#1-学习目标--learning-objectives)
2. [历史动机与发展脉络](#2-历史动机与发展脉络--historical-motivation-and-evolution)
3. [形式化定义](#3-形式化定义--formal-definitions)
4. [理论推导与原理解析](#4-理论推导与原理解析--theoretical-derivation)
5. [代码示例](#5-代码示例--code-examples)
6. [对比分析](#6-对比分析--comparative-analysis)
7. [常见陷阱与最佳实践](#7-常见陷阱与最佳实践--pitfalls-and-best-practices)
8. [工程实践](#8-工程实践--engineering-practice)
9. [案例研究](#9-案例研究--case-studies)
10. [习题](#10-习题--exercises)
11. [参考文献](#11-参考文献--references)
12. [延伸阅读](#12-延伸阅读--further-reading)

---

## 1. 学习目标 | Learning Objectives

本章节基于 Bloom 教育目标分类法（Bloom's Taxonomy）设计学习目标，覆盖记忆、理解、应用、分析、评价、创造六个层次，确保学习者从基础认知走向高阶工程实践能力。

### 1.1 记忆层（Remember）

完成本章节学习后，学习者应当能够：

- **R1**：准确陈述 Vue 3 响应式系统的核心实现机制（Proxy、Reflect、Effect、Track、Trigger）。
- **R2**：列举 Vue 3 提供的性能优化相关 API 与指令（`shallowRef`、`shallowReactive`、`markRaw`、`triggerRef`、`v-once`、`v-memo`、`<KeepAlive>`、`defineAsyncComponent`、`computed`、`watchEffect`）。
- **R3**：复述 Vue 3 渲染管线的主要阶段：模板编译 → 渲染函数 → 虚拟 DOM 树 → Diff 算法 → 真实 DOM 更新。
- **R4**：背记 Vite 在开发环境与生产环境所采用的不同打包策略（开发环境 ESM 原生模块，生产环境 Rollup 打包）。
- **R5**：识别 Vue 3.2+ 引入的关键性能优化特性：静态提升（Static Hoisting）、PatchFlag、Block Tree、缓存事件处理器。

### 1.2 理解层（Understand）

完成本章节学习后，学习者应当能够：

- **U1**：解释为何 Vue 3 使用 Proxy 替代 Vue 2 的 `Object.defineProperty`，并说明两者在性能与能力上的差异。
- **U2**：阐述响应式依赖收集与触发更新的完整流程，并说明为什么 Vue 3 采用惰性收集（Lazy Tracking）策略。
- **U3**：描述 `shallowRef`、`shallowReactive`、`markRaw` 的语义差异及各自适用场景。
- **U4**：理解 `<KeepAlive>` 的 LRU 缓存算法、`include`/`exclude`/`max` 三个属性的协作机制。
- **U5**：说明 `v-memo` 指令如何通过依赖数组比对避免不必要的子树重渲染。

### 1.3 应用层（Apply）

完成本章节学习后，学习者应当能够：

- **A1**：在真实项目中正确使用 `shallowRef` 处理大型列表数据，避免深度响应式开销。
- **A2**：使用 `vue-virtual-scroller` 或 `@tanstack/vue-virtual` 实现万级数据列表的虚拟滚动。
- **A3**：使用 `defineAsyncComponent` 结合路由懒加载实现按需加载，并通过 `webpackChunkName` 或 `viteManualChunks` 控制分包策略。
- **A4**：使用 Chrome DevTools Performance 面板与 Vue DevTools 分析组件渲染性能瓶颈。
- **A5**：应用 Tree Shaking、Code Splitting、Scope Hoisting、压缩混淆等手段优化生产包体积。

### 1.4 分析层（Analyze）

完成本章节学习后，学习者应当能够：

- **An1**：分析一个 Vue 3 应用的渲染性能瓶颈，定位是响应式追踪开销、Diff 开销、布局抖动（Layout Thrashing）还是网络请求阻塞。
- **An2**：对比 `computed` 与 `watch` 的执行时机、缓存策略、适用场景，分析何时使用何者更优。
- **An3**：解构 Vue 3 编译器生成的渲染函数，识别 PatchFlag、动态节点、静态节点，分析编译优化的收益。
- **An4**：分析一个慢速列表的渲染流程，识别 Key 复用错误、内联函数导致的子组件重渲染、深度响应式开销等问题。

### 1.5 评价层（Evaluate）

完成本章节学习后，学习者应当能够：

- **E1**：评估一个 Vue 3 应用的 Core Web Vitals（LCP、FID、INP、CLS、TTFB、TBT）指标，并给出优化优先级建议。
- **E2**：判断何时应当牺牲代码可读性换取性能（如手动 `markRaw`、`shallowRef`），何时不应当。
- **E3**：评价不同的状态管理方案（Pinia、Provide/Inject、props 传递、Composition API 共享）在大规模应用中的性能权衡。
- **E4**：权衡 SSR、SSG、ISR、CSR 四种渲染策略在不同业务场景下的性能与开发成本。

### 1.6 创造层（Create）

完成本章节学习后，学习者应当能够：

- **C1**：设计一套针对企业级 Vue 3 应用的性能监控体系，涵盖运行时指标采集、上报、可视化、告警全链路。
- **C2**：基于 Web Worker 与 Vue 3 的响应式系统，实现 CPU 密集型任务的并行计算方案。
- **C3**：设计一个性能基线（Performance Budget）系统，在 CI/CD 中自动检测性能回退。
- **C4**：构建一个可插拔的 Vue 3 性能优化 Babel/Vite 插件，自动注入 `v-memo`、自动标记 `markRaw`。

---

## 2. 历史动机与发展脉络 | Historical Motivation and Evolution

### 2.1 Vue 1.0 时代（2014-2016）：响应式的诞生

Vue.js 由 Evan You（尤雨溪）于 2014 年 2 月发布，其设计哲学受到 Angular、Knockout 与 React 的多重影响。Vue 1.0 的响应式系统基于 `Object.defineProperty` 实现，采用细粒度依赖追踪：每个属性都对应一个 Dep（依赖收集器），每个观察者（Watcher）订阅相关的 Dep。

**Vue 1.0 的性能特点**：

- 优点：细粒度更新，精准触达每个数据属性对应的 DOM 节点。
- 缺点：每个属性都需要递归遍历，初始大型对象初始化开销大；无法监测属性的新增/删除；数组下标修改需调用 `$set`。

```javascript
// Vue 1.0 时代的响应式实现示意（简化版）
Object.defineProperty(obj, key, {
  enumerable: true,
  configurable: true,
  get() {
    dep.depend(); // 依赖收集
    return value;
  },
  set(newVal) {
    if (newVal === value) return;
    value = newVal;
    dep.notify(); // 触发更新
  },
});
```

### 2.2 Vue 2.0 时代（2016-2020）：虚拟 DOM 的引入

Vue 2.0 于 2016 年 9 月发布，引入了虚拟 DOM（Virtual DOM），将响应式系统从"细粒度属性级"调整为"组件级 + 属性级"的混合模式。每个组件对应一个 Watcher，组件内部的数据变化触发组件重新渲染，Diff 算法在虚拟 DOM 树上执行。

**Vue 2.0 的性能改进**：

- 引入虚拟 DOM，降低大规模应用的内存占用。
- 组件级 Watcher 减少了 Watcher 的数量。
- 支持服务端渲染（SSR）。

**Vue 2.0 的性能瓶颈**：

- `Object.defineProperty` 无法监测数组索引修改与对象属性新增/删除，需要 `Vue.set` 与 `$set`。
- 大型对象的递归响应式转换在初始化阶段开销大。
- 模板编译对静态节点缺乏优化（Vue 2.6 引入静态节点提升部分缓解）。

### 2.3 Vue 3.0 时代（2020-2023）：Proxy 与编译优化

Vue 3.0 于 2020 年 9 月正式发布，是一次完整的重写。核心变化包括：

1. **响应式系统重写**：使用 ES6 Proxy 替代 `Object.defineProperty`，支持数组索引、Map、Set、属性新增/删除的响应式追踪。
2. **编译器优化**：引入静态提升（Static Hoisting）、PatchFlag、Block Tree、缓存事件处理器，将虚拟 DOM 的 Diff 复杂度从 $O(n)$ 降至 $O(d)$（其中 $d$ 为动态节点数）。
3. **Composition API**：提供逻辑组合能力，避免 Options API 在大型组件中的逻辑分散问题。
4. **Tree Shaking**：将全局 API 改为模块化导入，支持按需引入，包体积从 Vue 2 的 30KB+ 降至 10KB+（按使用情况）。
5. **TypeScript 重写**：源码使用 TypeScript 重写，类型推断更准确。

### 2.4 Vue 3.2+ 时代（2021-2024）：编译时优化深化

Vue 3.2 引入 `<script setup>` 语法糖，进一步简化 Composition API 写法。Vue 3.3 引入 `defineSlots`、`defineModel`（实验性）。Vue 3.4 重写模板解析器，性能提升约 3 倍。Vue 3.5 引入响应式系统重写（Reactive System Destructuring），减少内存占用。

**关键版本性能里程碑**：

| 版本 | 发布时间 | 关键性能特性 |
|------|----------|--------------|
| Vue 3.0 | 2020-09 | Proxy 响应式、编译优化、Tree Shaking |
| Vue 3.2 | 2021-08 | `<script setup>`、`v-memo`、SSR 改进 |
| Vue 3.3 | 2023-05 | `defineSlots`、泛型组件改进 |
| Vue 3.4 | 2023-12 | 模板解析器重写、解析速度 3x、更精确的 PatchFlag |
| Vue 3.5 | 2024-09 | 响应式系统重写、内存优化、`useId`、`useTemplateRef` |

### 2.5 Evan You 的设计哲学

Evan You 在多次演讲与博客中阐述 Vue 的设计哲学，对性能优化有直接影响：

1. **渐进式框架（Progressive Framework）**：Vue 的核心库只关注视图层，路由、状态管理、构建工具作为独立包按需引入。这一哲学使得性能优化可以分层进行：模板层、组件层、路由层、状态层、构建层。

2. **编译时 + 运行时协同**：Vue 介于 React（重运行时）与 Svelte（重编译时）之间，通过编译器为运行时提供提示（PatchFlag、静态提升），兼顾灵活性与性能。Evan You 在 VueConf 2020 演讲中称之为 "Compiler-assisted Reactivity"。

3. **开发者体验优先（DX First）**：Vue 在 API 设计上优先考虑易用性，但通过编译优化在不牺牲 DX 的前提下提升性能。`<script setup>` 即是典型例子：语法简洁，编译后生成等价的高性能渲染函数。

4. **合理的默认值**：Vue 3 默认对 `ref`/`reactive` 进行深度响应式转换，但在性能敏感场景提供 `shallowRef`/`shallowReactive`/`markRaw` 等"逃生舱"（Escape Hatch）。

---

## 3. 形式化定义 | Formal Definitions

### 3.1 响应式系统的形式化定义

**定义 3.1（响应式对象）**：给定一个对象 $o \in \text{Object}$，其响应式代理记为 $\text{reactive}(o)$，满足：

$$
\text{reactive}: \text{Object} \to \text{Proxy} \\
\forall p \in \text{keys}(o), \forall v \in \text{value}(o, p): \\
\text{get}(\text{reactive}(o), p) \Rightarrow \text{track}(o, p) \land \text{return } \text{reactive}(v) \text{ if } v \text{ is Object} \\
\text{set}(\text{reactive}(o), p, v') \Rightarrow \text{trigger}(o, p) \land o[p] \leftarrow v'
$$

其中 $\text{track}$ 是依赖收集操作，$\text{trigger}$ 是触发更新操作。

**定义 3.2（依赖收集）**：设 $\mathcal{D}$ 为依赖映射，$\mathcal{D}: (\text{Object}, \text{Key}) \to \mathcal{P}(\text{Effect})$，其中 $\mathcal{P}(\text{Effect})$ 是 Effect 集合的幂集。当前激活的 Effect 记为 $\text{activeEffect}$，则：

$$
\text{track}(o, p) := \text{if } \text{activeEffect} \neq \text{null}: \\
\quad \mathcal{D}(o, p) \leftarrow \mathcal{D}(o, p) \cup \{\text{activeEffect}\}
$$

**定义 3.3（触发更新）**：当响应式对象的属性 $p$ 被修改时：

$$
\text{trigger}(o, p) := \forall e \in \mathcal{D}(o, p): \text{schedule}(e)
$$

其中 $\text{schedule}$ 是将 Effect 加入微任务队列的调度操作，Vue 3 使用 `Promise.resolve().then` 实现。

### 3.2 虚拟 DOM 的形式化定义

**定义 3.4（虚拟 DOM 节点）**：虚拟 DOM 节点 $v$ 是一个三元组：

$$
v = \langle \text{type}, \text{props}, \text{children} \rangle
$$

其中：
- $\text{type} \in \text{String} \cup \text{Component} \cup \text{Symbol}$（如 `Fragment`、`Teleport`、`Suspense`）
- $\text{props}: \text{String} \to \text{Value}$，包含属性、事件、指令等
- $\text{children} \in \text{Array}\langle v \rangle \cup \text{String} \cup \text{null}$

**定义 3.5（Diff 算法）**：给定新旧虚拟 DOM 树 $v_{\text{old}}$ 与 $v_{\text{new}}$，Diff 算法计算补丁集合 $\Delta$：

$$
\text{Diff}(v_{\text{old}}, v_{\text{new}}) \to \Delta = \{(op, \text{path}, \text{value}) \mid op \in \{\text{insert}, \text{remove}, \text{update}, \text{move}\}\}
$$

Vue 3 的 Diff 算法在最坏情况下复杂度为 $O(n)$，但通过 PatchFlag 与 Block Tree 可以将实际复杂度降至 $O(d)$，其中 $d$ 为动态节点数。

### 3.3 PatchFlag 的形式化定义

**定义 3.6（PatchFlag）**：PatchFlag 是编译器为每个动态节点附加的整数标记 $f \in \mathbb{Z}$，表示该节点在更新时需要被 Patch 的部分：

| Flag 值 | 名称 | 含义 |
|---------|------|------|
| 1 | `TEXT` | 仅文本内容动态 |
| 2 | `CLASS` | 仅 class 绑定动态 |
| 4 | `STYLE` | 仅 style 绑定动态 |
| 8 | `PROPS` | 仅有非 class/style 的 props 动态 |
| 16 | `FULL_PROPS` | props 完全动态（需完整 diff） |
| 32 | `HYDRATE_EVENTS` | 事件监听器（SSR 水合） |
| 64 | `STABLE_FRAGMENT` | 子节点顺序不变的 Fragment |
| 128 | `KEYED_FRAGMENT` | 带 key 的 Fragment |
| 256 | `UNKEYED_FRAGMENT` | 不带 key 的 Fragment |
| 512 | `NEED_PATCH` | 需要 patch（如 ref） |
| 1024 | `DYNAMIC_SLOTS` | 子插槽动态 |
| 2048 | `HOISTED` | 静态提升节点 |
| -1 | `BAIL` | 退出优化模式 |

**编译时优化收益**：若一个组件有 $n$ 个节点，其中 $d$ 个动态节点，传统 Diff 复杂度为 $O(n)$，Vue 3 优化后为 $O(d)$。当 $d \ll n$ 时（典型场景 $d/n < 0.1$），性能提升可达 10 倍以上。

### 3.4 KeepAlive 的形式化定义

**定义 3.7（KeepAlive 缓存）**：KeepAlive 维护一个 LRU（最近最少使用）缓存 $\mathcal{C}$，容量上限为 $k$。当组件切换时：

$$
\text{onActivate}(c) := \\
\quad \text{if } c \in \mathcal{C}: \text{remove from cache, push to head} \\
\quad \text{else}: \text{create } c, \text{push to head} \\
\quad \text{if } |\mathcal{C}| > k: \text{evict tail}
$$

LRU 缓存的查询、插入、淘汰均可在 $O(1)$ 时间复杂度内完成（基于双向链表 + 哈希表实现）。

### 3.5 性能指标的形式化定义

**定义 3.8（Core Web Vitals）**：Google 定义的三项核心性能指标：

- **LCP（Largest Contentful Paint）**：最大内容绘制时间，目标 $\leq 2.5\text{s}$。
- **INP（Interaction to Next Paint）**：交互到下一次绘制时间，目标 $\leq 200\text{ms}$（2024 年 3 月正式替代 FID）。
- **CLS（Cumulative Layout Shift）**：累计布局偏移，目标 $\leq 0.1$。

**定义 3.9（性能预算）**：性能预算 $B$ 是一个多维度约束：

$$
B = \langle B_{\text{size}}, B_{\text{time}}, B_{\text{count}}, B_{\text{score}} \rangle
$$

其中：
- $B_{\text{size}}$：JS/CSS/图片等资源体积上限
- $B_{\text{time}}$：LCP/INP/CLS/TBT 等时间指标上限
- $B_{\text{count}}$：HTTP 请求数、DOM 节点数上限
- $B_{\text{score}}$：Lighthouse Performance 分数下限

---

## 4. 理论推导与原理解析 | Theoretical Derivation

### 4.1 响应式系统的复杂度分析

#### 4.1.1 Vue 2 的响应式初始化复杂度

Vue 2 使用 `Object.defineProperty` 递归遍历对象的所有属性。设对象有 $n$ 个属性，深度为 $d$，平均每个属性有 $k$ 个子属性，则初始化复杂度为：

$$
T_{\text{init}}^{\text{Vue2}} = O(n \cdot k^d)
$$

对于深度嵌套的大型对象（如 1000 条记录的列表，每条 10 个字段，深度 3 层），$T_{\text{init}}$ 约为 $10^7$ 次属性遍历，在低端设备上可能导致数百毫秒的初始化延迟。

#### 4.1.2 Vue 3 的响应式初始化复杂度

Vue 3 使用 Proxy 实现惰性响应式：只对被访问的属性进行响应式转换。

$$
T_{\text{init}}^{\text{Vue3}} = O(1) \quad \text{（仅创建 Proxy）}
$$

$$
T_{\text{access}}^{\text{Vue3}}(p) = O(1) \quad \text{（首次访问属性 } p \text{ 时转换为响应式）}
$$

**收益分析**：若一个大型对象有 $n$ 个属性，但组件只访问了 $m$ 个（$m \ll n$），则 Vue 3 的响应式转换次数从 $O(n)$ 降至 $O(m)$。

#### 4.1.3 依赖追踪的复杂度

设一个组件的渲染函数访问了 $k$ 个响应式属性，每次属性变化触发的更新调度复杂度为：

$$
T_{\text{trigger}} = O(k) \quad \text{（收集依赖）} + O(1) \quad \text{（调度微任务）}
$$

Vue 3 使用 `Set` 数据结构存储依赖，去重操作为 $O(1)$ 均摊。

### 4.2 虚拟 DOM Diff 算法的复杂度

#### 4.2.1 传统 Diff 算法（React 风格）

传统 Diff 算法对同层节点进行逐个比对，时间复杂度：

$$
T_{\text{diff}}^{\text{traditional}} = O(n)
$$

其中 $n$ 为同层节点总数。

#### 4.2.2 Vue 3 Block Tree + PatchFlag 优化

Vue 3 将模板划分为 Block，每个 Block 的根节点收集所有动态子节点（Dynamic Children）到一个数组中。Diff 时只比对动态节点数组：

$$
T_{\text{diff}}^{\text{Vue3}} = O(d)
$$

其中 $d$ 为动态节点数，$d \leq n$。

**最坏情况**：若所有节点都是动态的（$d = n$），则 Vue 3 与传统 Diff 复杂度相同。

**典型情况**：在大多数模板中，动态节点占比 $d/n \approx 5\% \sim 20\%$，性能提升 5-20 倍。

#### 4.2.3 Keyed List Diff 算法

Vue 3 的 Keyed List Diff 算法使用最长递增子序列（LIS）算法最小化 DOM 移动操作。LIS 算法的复杂度为 $O(n \log n)$，但实际应用中移动操作通常较少，性能优于朴素的逐个比对。

**定理 4.1**：给定两个长度为 $n$ 的列表，使用 LIS 的 Diff 算法所需的 DOM 移动次数等于 $n - \text{LIS}(\text{mapping})$，其中 $\text{mapping}$ 是新旧节点对应位置的映射。

**证明**：LIS 中的节点保持相对顺序不变，因此无需移动；非 LIS 节点需要移动到正确位置。移动次数最小化当且仅当保持顺序的节点数最大化，即 LIS。

### 4.3 KeepAlive 的 LRU 缓存分析

KeepAlive 维护容量为 $k$ 的 LRU 缓存。设组件切换序列长度为 $n$，命中率 $h$ 为命中缓存的访问比例。

**命中时复杂度**：$O(1)$（哈希表查询 + 链表节点移动）。

**未命中时复杂度**：$O(1)$（创建组件 + 可能淘汰一个节点）。

**空间复杂度**：$O(k)$。

**命中率公式**（基于 80/20 法则，即 80% 的访问集中在 20% 的组件上）：

$$
h \approx 1 - \left(\frac{4}{5}\right)^k
$$

当 $k = 5$ 时，$h \approx 0.67$；当 $k = 10$ 时，$h \approx 0.89$。因此实践中 `max` 属性设置为 5-10 通常能覆盖大部分场景。

### 4.4 计算属性缓存的复杂度

`computed` 属性基于依赖追踪实现缓存。设依赖数量为 $k$，依赖变化的频率为 $f$，计算属性的访问频率为 $a$。

**无缓存时的计算次数**：$a \cdot f$。

**有缓存时的计算次数**：$f$（仅在依赖变化时计算）。

**收益比**：$\frac{a \cdot f}{f} = a$。当访问频率 $a \gg 1$ 时（如模板中多处使用），缓存收益显著。

**缓存失效条件**：

$$
\text{dirty} := \bigvee_{d \in \text{deps}(c)} \text{changed}(d)
$$

当任一依赖变化时，`dirty` 标记为 `true`，下次访问时重新计算。

### 4.5 v-memo 的优化收益分析

`v-memo="[deps]"` 指令在子树重渲染前检查依赖数组是否变化。设子树节点数为 $n$，依赖数组长度为 $k$。

**无 v-memo 时的渲染开销**：$O(n)$。

**有 v-memo 时的渲染开销**：$O(k)$（依赖比对）+ $O(n)$ if 依赖变化，否则 $0$。

**期望开销**（设依赖变化概率为 $p$）：

$$
E[T] = O(k) + p \cdot O(n)
$$

当 $p \ll 1$ 且 $k \ll n$ 时，$E[T] \approx O(k)$，优化显著。

### 4.6 包体积的数学建模

设应用源码体积为 $S$，按需引入后的体积为 $S'$，Tree Shaking 效率为 $\eta$：

$$
S' = S \cdot (1 - \eta)
$$

Vue 3 的 Tree Shaking 效率取决于使用情况。仅使用核心 API 时，$\eta \approx 0.6$；使用大量高级 API（如 Teleport、Suspense、Transition）时，$\eta \approx 0.2$。

**Gzip 压缩后体积**：

$$
S_{\text{gzip}} \approx 0.3 \cdot S'
$$

**生产环境推荐基线**：

| 资源 | 压缩前 | Gzip 后 |
|------|--------|---------|
| Vue 核心（仅核心 API） | 60 KB | 20 KB |
| Vue 完整运行时 | 90 KB | 35 KB |
| Vue + Vue Router + Pinia | 130 KB | 45 KB |
| 完整企业应用（含 UI 库） | 500-1000 KB | 150-300 KB |

### 4.7 网络传输优化建模

设资源体积为 $S$，网络带宽为 $B$，RTT 为 $R$，HTTP/2 多路复用下的并发数为 $C$。

**HTTP/1.1 串行加载**：

$$
T_{\text{load}} = R + \frac{S}{B} \cdot N
$$

其中 $N$ 为资源数。

**HTTP/2 并行加载**：

$$
T_{\text{load}} \approx R + \frac{S_{\text{total}}}{B}
$$

**收益**：HTTP/2 相比 HTTP/1.1，在 $N = 50$、$R = 100\text{ms}$、$B = 10\text{Mbps}$、$S = 50\text{KB}$ 的典型场景下，加载时间从 $1.2\text{s}$ 降至 $0.4\text{s}$。

### 4.8 渲染性能的帧预算分析

浏览器渲染帧率为 60 FPS（每帧 16.67 ms）。Vue 应用的渲染流程：

$$
T_{\text{frame}} = T_{\text{JS}} + T_{\text{style}} + T_{\text{layout}} + T_{\text{paint}} + T_{\text{composite}}
$$

**性能预算分配**：

- $T_{\text{JS}} \leq 8\text{ms}$（JS 执行，包括 Vue 响应式触发、渲染函数执行、Diff）
- $T_{\text{style}} \leq 4\text{ms}$（样式计算）
- $T_{\text{layout}} \leq 3\text{ms}$（布局计算）
- $T_{\text{paint}} + T_{\text{composite}} \leq 1.7\text{ms}$

**超出帧预算的后果**：掉帧（Frame Drop），用户感知为卡顿。连续掉帧超过 5 帧通常被用户察觉。

---

## 5. 代码示例 | Code Examples

### 5.1 响应式系统优化

#### 5.1.1 shallowRef 处理大型列表

```vue
<!-- LargeList.vue —— Vue 3.4+ -->
<script setup lang="ts">
import { shallowRef, triggerRef, type Ref } from 'vue';

interface Item {
  id: number;
  name: string;
  active: boolean;
}

// 使用 shallowRef 避免对数组元素进行深度响应式转换
// 适用于：万级数据列表、第三方数据可视化库的输入
const items: Ref<Item[]> = shallowRef([]);

// 批量追加数据时，直接操作 .value 并手动触发更新
function appendData(newItems: Item[]): void {
  // 直接 push 到原数组，shallowRef 不会自动追踪
  items.value.push(...newItems);
  // 手动触发依赖更新
  triggerRef(items);
}

// 替换整个数组（推荐方式）
function replaceData(newItems: Item[]): void {
  // 直接替换 .value，shallowRef 会自动触发
  items.value = newItems;
}

// 模拟加载数据
async function loadMore(): Promise<void> {
  const newItems: Item[] = Array.from({ length: 1000 }, (_, i) => ({
    id: Date.now() + i,
    name: `Item ${i}`,
    active: Math.random() > 0.5,
  }));
  appendData(newItems);
}
</script>

<template>
  <div>
    <button @click="loadMore">加载更多</button>
    <p>共 {{ items.length }} 条</p>
  </div>
</template>
```

#### 5.1.2 shallowReactive 优化嵌套对象

```typescript
import { shallowReactive, watchEffect } from 'vue';

// 场景：表单配置对象，只需要追踪顶层属性变化
const formConfig = shallowReactive({
  layout: 'vertical',
  labelPosition: 'top',
  // 嵌套对象不会被深度响应式
  validation: {
    rules: {},
    messages: {},
  },
});

// 修改顶层属性会触发更新
formConfig.layout = 'horizontal'; // 触发更新

// 修改嵌套属性不会触发更新
formConfig.validation.rules = { required: true }; // 不触发更新

// 若需要触发嵌套更新，使用 triggerRef 或替换整个对象
formConfig.validation = { rules: { required: true }, messages: {} }; // 触发更新
```

#### 5.1.3 markRaw 跳过响应式转换

```typescript
import { reactive, markRaw, readonly } from 'vue';
import * as monaco from 'monaco-editor';
import L from 'leaflet';

// 场景：第三方库实例（Monaco Editor、Leaflet 地图、ECharts 实例）
// 这些实例内部已有自己的事件系统，响应式转换会导致性能问题与内存泄漏
const state = reactive({
  // Monaco Editor 实例标记为 raw，跳过响应式转换
  editor: markRaw(monaco.editor.create(document.getElementById('editor'), {
    value: 'Hello Vue',
    language: 'typescript',
  })),
  // Leaflet 地图实例
  map: markRaw(L.map('map').setView([51.505, -0.09], 13)),
  // ECharts 实例
  chart: markRaw(echarts.init(document.getElementById('chart'))),
});

// 场景：大型静态数据（如国家列表、行政区划树）
const staticData = markRaw({
  countries: [/* 200+ 国家数据 */],
  provinces: [/* 3000+ 省市区数据 */],
});

const state2 = reactive({
  // 静态数据不会被响应式转换，节省内存与初始化时间
  regions: staticData,
});
```

#### 5.1.4 triggerRef 手动触发更新

```typescript
import { shallowRef, triggerRef, watch } from 'vue';

const map = shallowRef<HTMLDivElement | null>(null);

// 场景：手动管理 DOM 或第三方实例时，需要触发依赖更新
function setupMap(): void {
  // 直接修改 .value 的属性不会触发更新
  if (map.value) {
    map.value.classList.add('initialized');
  }
  // 手动触发更新
  triggerRef(map);
}

// watch 会响应 triggerRef
watch(map, (newMap) => {
  console.log('Map updated:', newMap);
});
```

### 5.2 虚拟列表实现

#### 5.2.1 使用 vue-virtual-scroller

```vue
<!-- VirtualList.vue —— Vue 3.3+ -->
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { RecycleScroller } from 'vue-virtual-scroller';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';

interface User {
  id: number;
  name: string;
  email: string;
  avatar: string;
}

const users = ref<User[]>([]);

// 生成 10000 条测试数据
onMounted(() => {
  users.value = Array.from({ length: 10000 }, (_, i) => ({
    id: i,
    name: `User ${i}`,
    email: `user${i}@example.com`,
    avatar: `https://i.pravatar.cc/40?u=${i}`,
  }));
});

function onVisibleChange(startIndex: number, endIndex: number): void {
  console.log(`可见范围: ${startIndex} - ${endIndex}`);
}
</script>

<template>
  <RecycleScroller
    :items="users"
    :item-size="60"
    key-field="id"
    :buffer="200"
    class="scroller"
    @visible-change="onVisibleChange"
  >
    <template #default="{ item }">
      <div class="user-item">
        <img :src="item.avatar" :alt="item.name" class="avatar" />
        <div class="info">
          <div class="name">{{ item.name }}</div>
          <div class="email">{{ item.email }}</div>
        </div>
      </div>
    </template>
  </RecycleScroller>
</template>

<style scoped>
.scroller {
  height: 600px;
}

.user-item {
  display: flex;
  align-items: center;
  height: 60px;
  padding: 0 16px;
  border-bottom: 1px solid #eee;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  margin-right: 12px;
}

.info {
  display: flex;
  flex-direction: column;
}

.name {
  font-weight: 600;
  color: #333;
}

.email {
  font-size: 12px;
  color: #666;
}
</style>
```

#### 5.2.2 自定义虚拟滚动（教学实现）

```vue
<!-- CustomVirtualScroll.vue —— Vue 3.4+ -->
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, type Ref } from 'vue';

interface Item {
  id: number;
  content: string;
}

const props = withDefaults(defineProps<{
  items: Item[];
  itemHeight?: number;
  visibleHeight?: number;
  buffer?: number;
}>(), {
  itemHeight: 50,
  visibleHeight: 600,
  buffer: 5,
});

const containerRef: Ref<HTMLDivElement | null> = ref(null);
const scrollTop = ref(0);

// 计算可见区域的起始与结束索引
const visibleRange = computed(() => {
  const start = Math.max(0, Math.floor(scrollTop.value / props.itemHeight) - props.buffer);
  const visibleCount = Math.ceil(props.visibleHeight / props.itemHeight);
  const end = Math.min(
    props.items.length,
    start + visibleCount + props.buffer * 2,
  );
  return { start, end };
});

// 可见项列表
const visibleItems = computed(() => {
  return props.items
    .slice(visibleRange.value.start, visibleRange.value.end)
    .map((item, index) => ({
      ...item,
      offsetY: (visibleRange.value.start + index) * props.itemHeight,
    }));
});

// 容器总高度（撑开滚动条）
const totalHeight = computed(() => props.items.length * props.itemHeight);

function handleScroll(): void {
  if (containerRef.value) {
    scrollTop.value = containerRef.value.scrollTop;
  }
}

onMounted(() => {
  if (containerRef.value) {
    containerRef.value.addEventListener('scroll', handleScroll, { passive: true });
  }
});

onUnmounted(() => {
  if (containerRef.value) {
    containerRef.value.removeEventListener('scroll', handleScroll);
  }
});
</script>

<template>
  <div
    ref="containerRef"
    class="virtual-container"
    :style="{ height: `${visibleHeight}px` }"
  >
    <div class="virtual-content" :style="{ height: `${totalHeight}px` }">
      <div
        v-for="item in visibleItems"
        :key="item.id"
        class="virtual-item"
        :style="{
          height: `${itemHeight}px`,
          transform: `translateY(${item.offsetY}px)`,
        }"
      >
        {{ item.content }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.virtual-container {
  overflow-y: auto;
  position: relative;
  border: 1px solid #ddd;
}

.virtual-content {
  position: relative;
}

.virtual-item {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  padding: 0 16px;
  border-bottom: 1px solid #eee;
  box-sizing: border-box;
}
</style>
```

### 5.3 异步组件与代码分割

#### 5.3.1 defineAsyncComponent 完整配置

```typescript
import { defineAsyncComponent, type Component } from 'vue';
import LoadingSpinner from '@/components/LoadingSpinner.vue';
import ErrorDisplay from '@/components/ErrorDisplay.vue';

// 场景：路由级懒加载，按页面维度分包
const HomeView = defineAsyncComponent({
  loader: () => import('@/views/HomeView.vue'),
  loadingComponent: LoadingSpinner,
  errorComponent: ErrorDisplay,
  delay: 200, // 延迟 200ms 显示 loading，避免闪烁
  timeout: 10000, // 10 秒超时
  suspensible: true, // 配合 Suspense
  onError(error, retry, fail, attempts) {
    // 网络抖动重试机制
    if (error.message.includes('Failed to fetch') && attempts <= 3) {
      retry();
    } else {
      fail();
    }
  },
});

// 场景：按功能模块分包
const PDFViewer = defineAsyncComponent({
  loader: () => import(/* webpackChunkName: "pdf" */ '@/components/PDFViewer.vue'),
  loadingComponent: LoadingSpinner,
});

const ChartEditor = defineAsyncComponent({
  loader: () => import(/* webpackChunkName: "charts" */ '@/components/ChartEditor.vue'),
  loadingComponent: LoadingSpinner,
});

export { HomeView, PDFViewer, ChartEditor };
```

#### 5.3.2 Vite 手动分包配置

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vue 核心单独分包
          vue: ['vue', 'vue-router', 'pinia'],
          // UI 库单独分包
          'element-plus': ['element-plus'],
          // 编辑器相关分包
          editor: ['monaco-editor', '@codemirror/state'],
          // 图表库分包
          charts: ['echarts', 'vue-echarts'],
        },
      },
    },
    chunkSizeWarningLimit: 1000, // 1MB 警告阈值
    cssCodeSplit: true, // CSS 按需分割
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // 生产环境移除 console
        drop_debugger: true,
      },
    },
  },
});
```

### 5.4 v-once 与 v-memo

#### 5.4.1 v-once 静态内容

```vue
<!-- StaticContent.vue -->
<script setup lang="ts">
import { ref } from 'vue';

// 静态内容，只在首次渲染时计算
const copyright = `© ${new Date().getFullYear()} FANDEX. All rights reserved.`;

// 动态内容
const counter = ref(0);
</script>

<template>
  <!-- v-once：只渲染一次，后续更新不再触发重渲染 -->
  <footer v-once>
    <div class="copyright">{{ copyright }}</div>
    <nav>
      <a href="/about">关于</a>
      <a href="/privacy">隐私</a>
      <a href="/terms">条款</a>
    </nav>
  </footer>

  <!-- 动态内容 -->
  <main>
    <button @click="counter++">点击 {{ counter }}</button>
  </main>
</template>
```

#### 5.4.2 v-memo 条件性缓存

```vue
<!-- DataTable.vue —— Vue 3.2+ -->
<script setup lang="ts">
import { ref, computed } from 'vue';

interface Row {
  id: number;
  name: string;
  age: number;
  department: string;
  salary: number;
  selected: boolean;
}

const rows = ref<Row[]>([]);
const selectedIds = ref<Set<number>>(new Set());

// 模拟 1000 行数据
rows.value = Array.from({ length: 1000 }, (_, i) => ({
  id: i,
  name: `Employee ${i}`,
  age: 20 + (i % 40),
  department: ['Engineering', 'Sales', 'Marketing'][i % 3],
  salary: 5000 + (i % 10) * 1000,
  selected: false,
}));

function toggleRow(row: Row): void {
  row.selected = !row.selected;
  if (row.selected) {
    selectedIds.value.add(row.id);
  } else {
    selectedIds.value.delete(row.id);
  }
}

// 计算选中总数
const selectedCount = computed(() => rows.value.filter((r) => r.selected).length);
</script>

<template>
  <table>
    <thead>
      <tr>
        <th>ID</th>
        <th>Name</th>
        <th>Age</th>
        <th>Department</th>
        <th>Salary</th>
        <th>Selected</th>
      </tr>
    </thead>
    <tbody>
      <!--
        v-memo 依赖数组：
        - row.id：行标识变化时重渲染（通常不变）
        - row.selected：选中状态变化时重渲染
        当且仅当这两个值变化时才重渲染该行
        收益：toggleRow 修改 selected 时，只重渲染对应行，其他 999 行不重渲染
      -->
      <tr
        v-for="row in rows"
        :key="row.id"
        v-memo="[row.id, row.selected]"
        :class="{ selected: row.selected }"
        @click="toggleRow(row)"
      >
        <td>{{ row.id }}</td>
        <td>{{ row.name }}</td>
        <td>{{ row.age }}</td>
        <td>{{ row.department }}</td>
        <td>{{ row.salary }}</td>
        <td>{{ row.selected ? '✓' : '' }}</td>
      </tr>
    </tbody>
  </table>
  <p>已选中 {{ selectedCount }} 行</p>
</template>

<style scoped>
.selected {
  background-color: #e6f7ff;
}
</style>
```

### 5.5 计算属性缓存与执行时机

```typescript
import { ref, computed, watch, watchEffect } from 'vue';

const firstName = ref('John');
const lastName = ref('Doe');
const age = ref(30);

// computed：惰性求值，缓存结果
// 仅在 firstName 或 lastName 变化时重新计算
// 多次访问 fullName 只触发一次计算
const fullName = computed(() => {
  console.log('computed: calculating fullName');
  return `${firstName.value} ${lastName.value}`;
});

// 访问 fullName（首次计算）
console.log(fullName.value); // 计算并缓存
// 再次访问（命中缓存，不计算）
console.log(fullName.value); // 直接返回缓存值

// watch：明确指定监听源，回调在依赖变化后触发
// 默认惰性（不立即执行），可通过 immediate: true 立即执行
watch(fullName, (newVal, oldVal) => {
  console.log(`watch: ${oldVal} -> ${newVal}`);
}, { immediate: false });

// watchEffect：自动收集依赖，立即执行一次
// 适合副作用与依赖紧密关联的场景
watchEffect(() => {
  console.log(`watchEffect: ${fullName.value}, age=${age.value}`);
});

// 修改依赖
firstName.value = 'Jane'; // 触发：computed 失效、watch 回调、watchEffect 回调
lastName.value = 'Smith'; // 触发：computed 失效、watch 回调、watchEffect 回调
age.value = 31;           // 仅触发 watchEffect 回调（computed 不依赖 age）
```

### 5.6 KeepAlive 优化

```vue
<!-- App.vue -->
<script setup lang="ts">
import { ref, computed, onActivated, onDeactivated } from 'vue';
import HomeView from '@/views/HomeView.vue';
import UserView from '@/views/UserView.vue';
import SettingsView from '@/views/SettingsView.vue';

type ViewName = 'home' | 'user' | 'settings';

const currentView = ref<ViewName>('home');

const viewMap = {
  home: HomeView,
  user: UserView,
  settings: SettingsView,
};

// KeepAlive include 只缓存指定组件
const cachedViews = computed(() => ['HomeView', 'UserView']);
</script>

<template>
  <div>
    <nav>
      <button
        v-for="(view, name) in viewMap"
        :key="name"
        :class="{ active: currentView === name }"
        @click="currentView = name as ViewName"
      >
        {{ name }}
      </button>
    </nav>

    <!--
      KeepAlive 配置：
      - include：只缓存名称匹配的组件（基于组件的 name 选项）
      - max：最多缓存 5 个组件实例，超出按 LRU 淘汰
    -->
    <KeepAlive :include="cachedViews" :max="5">
      <component :is="viewMap[currentView]" />
    </KeepAlive>
  </div>
</template>
```

```vue
<!-- UserView.vue —— 缓存组件示例 -->
<script setup lang="ts">
import { ref, onActivated, onDeactivated, onMounted, onUnmounted } from 'vue';

// 定义组件名（用于 KeepAlive include 匹配）
defineOptions({ name: 'UserView' });

const userList = ref<string[]>([]);
let timer: ReturnType<typeof setInterval> | null = null;

// 首次挂载：调用 onMounted
onMounted(() => {
  console.log('UserView mounted');
  userList.value = ['Alice', 'Bob', 'Charlie'];
  // 启动定时刷新
  timer = setInterval(() => {
    console.log('Refreshing user list...');
  }, 5000);
});

// KeepAlive 缓存时：调用 onActivated / onDeactivated
// 而非 onMounted / onUnmounted
onActivated(() => {
  console.log('UserView activated (restored from cache)');
  // 可恢复定时器、网络请求
});

onDeactivated(() => {
  console.log('UserView deactivated (cached)');
  // 可暂停定时器、取消未完成请求
});

// 真正销毁时：调用 onUnmounted
onUnmounted(() => {
  console.log('UserView unmounted (truly destroyed)');
  if (timer) {
    clearInterval(timer);
  }
});
</script>

<template>
  <div>
    <h2>用户列表</h2>
    <ul>
      <li v-for="user in userList" :key="user">{{ user }}</li>
    </ul>
  </div>
</template>
```

### 5.7 生产环境性能监控

```typescript
// utils/performance.ts —— Vue 3.4+
import { onMounted, onUnmounted, type ComponentPublicInstance } from 'vue';

interface PerformanceMetric {
  componentName: string;
  mountTime: number;
  updateTime: number;
  renderCount: number;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private observers: PerformanceObserver[] = [];

  constructor() {
    this.setupPerformanceObservers();
  }

  // 监听浏览器性能指标
  private setupPerformanceObservers(): void {
    // LCP
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      console.log('LCP:', lastEntry.startTime);
      this.reportMetric('LCP', lastEntry.startTime);
    });
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    this.observers.push(lcpObserver);

    // CLS
    const clsObserver = new PerformanceObserver((list) => {
      let clsValue = 0;
      for (const entry of list.getEntries()) {
        const layoutShiftEntry = entry as PerformanceEntry & {
          hadRecentInput: boolean;
          value: number;
        };
        if (!layoutShiftEntry.hadRecentInput) {
          clsValue += layoutShiftEntry.value;
        }
      }
      console.log('CLS:', clsValue);
      this.reportMetric('CLS', clsValue);
    });
    clsObserver.observe({ entryTypes: ['layout-shift'] });
    this.observers.push(clsObserver);

    // Long Task
    const longTaskObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        console.warn(`Long Task detected: ${entry.duration}ms`);
        this.reportMetric('LongTask', entry.duration);
      }
    });
    longTaskObserver.observe({ entryTypes: ['longtask'] });
    this.observers.push(longTaskObserver);
  }

  // 上报指标到服务端
  private reportMetric(name: string, value: number): void {
    if (import.meta.env.PROD) {
      navigator.sendBeacon('/api/metrics', JSON.stringify({ name, value, ts: Date.now() }));
    }
  }

  // Vue 组件渲染耗时
  trackComponent(name: string): { end: () => void } {
    const start = performance.now();
    return {
      end: () => {
        const duration = performance.now() - start;
        const metric = this.metrics.get(name);
        if (metric) {
          metric.updateTime = duration;
          metric.renderCount++;
        } else {
          this.metrics.set(name, {
            componentName: name,
            mountTime: duration,
            updateTime: duration,
            renderCount: 1,
          });
        }
      },
    };
  }

  getMetrics(): PerformanceMetric[] {
    return Array.from(this.metrics.values());
  }

  destroy(): void {
    this.observers.forEach((o) => o.disconnect());
    this.observers = [];
  }
}

export const performanceMonitor = new PerformanceMonitor();
```

### 5.8 路由懒加载与预加载策略

```typescript
// router/index.ts —— Vue Router 4 + Vue 3.4+
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    // 首页直接加载（首屏优化）
    component: () => import(/* webpackChunkName: "home" */ '@/views/HomeView.vue'),
  },
  {
    path: '/about',
    name: 'about',
    // 路由级懒加载
    component: () => import(/* webpackChunkName: "about" */ '@/views/AboutView.vue'),
    // 预加载策略：用户停留首页超过 3 秒后预加载
    meta: { preload: true },
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import(/* webpackChunkName: "dashboard" */ '@/views/DashboardView.vue'),
    meta: { preload: true, requiresAuth: true },
  },
  {
    path: '/admin',
    name: 'admin',
    component: () => import(/* webpackChunkName: "admin" */ '@/views/AdminView.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  // 滚动行为优化
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    }
    if (to.hash) {
      return { el: to.hash, behavior: 'smooth' };
    }
    return { top: 0 };
  },
});

// 预加载策略：在浏览器空闲时预加载可能访问的路由
let preloadedRoutes = new Set<string>();

router.afterEach((to) => {
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(() => {
      routes
        .filter((r) => r.meta?.preload && !preloadedRoutes.has(r.name as string))
        .forEach((r) => {
          preloadedRoutes.add(r.name as string);
          // 触发 chunk 预加载
          (r.component as any)();
        });
    });
  }
});

export default router;
```

### 5.9 图片懒加载与响应式图片

```vue
<!-- LazyImage.vue —— Vue 3.4+ -->
<script setup lang="ts">
import { ref, type Ref } from 'vue';

interface Props {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  lazy?: boolean;
  placeholder?: string;
  sizes?: string;
  srcset?: string;
}

const props = withDefaults(defineProps<Props>(), {
  lazy: true,
  placeholder: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxIiBoZWlnaHQ9IjEiLz4=',
});

const imgRef: Ref<HTMLImageElement | null> = ref(null);
const loaded = ref(false);
const error = ref(false);

function onLoad(): void {
  loaded.value = true;
}

function onError(): void {
  error.value = true;
}
</script>

<template>
  <picture>
    <source v-if="srcset" :srcset="srcset" :sizes="sizes" />
    <img
      ref="imgRef"
      :src="loaded ? src : placeholder"
      :alt="alt"
      :width="width"
      :height="height"
      :loading="lazy ? 'lazy' : 'eager'"
      :decoding="'async'"
      @load="onLoad"
      @error="onError"
    />
  </picture>
</template>

<style scoped>
img {
  transition: opacity 0.3s;
  opacity: 0;
}

img[src]:not([src*="data:"]) {
  opacity: 1;
}
</style>
```

### 5.10 Tree Shaking 与按需引入

```typescript
// 优化的 Element Plus 按需引入
// unplugin-vue-components + unplugin-auto-import
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import Components from 'unplugin-vue-components/vite';
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers';
import AutoImport from 'unplugin-auto-import/vite';

export default defineConfig({
  plugins: [
    vue(),
    AutoImport({
      resolvers: [ElementPlusResolver()],
      imports: ['vue', 'vue-router', 'pinia'],
      dts: 'src/types/auto-imports.d.ts',
    }),
    Components({
      resolvers: [ElementPlusResolver()],
      dts: 'src/types/components.d.ts',
    }),
  ],
});
```

```typescript
// 优化的 Lodash 按需引入
// 错误：import _ from 'lodash' (引入整个 lodash)
// 正确：import debounce from 'lodash/debounce' (只引入 debounce)
import debounce from 'lodash/debounce';
import throttle from 'lodash/throttle';

// 或使用 lodash-es 配合 Tree Shaking
import { debounce, throttle } from 'lodash-es';

const debouncedSearch = debounce((query: string) => {
  console.log('Searching:', query);
}, 300);
```

### 5.11 Web Worker 计算卸载

```typescript
// workers/heavy-compute.worker.ts
self.onmessage = (e: MessageEvent<{ data: number[]; operation: string }>) => {
  const { data, operation } = e.data;
  let result: number;

  switch (operation) {
    case 'sum':
      result = data.reduce((a, b) => a + b, 0);
      break;
    case 'average':
      result = data.reduce((a, b) => a + b, 0) / data.length;
      break;
    case 'max':
      result = Math.max(...data);
      break;
    default:
      result = 0;
  }

  self.postMessage({ result });
};
```

```vue
<!-- HeavyCompute.vue -->
<script setup lang="ts">
import { ref, type Ref } from 'vue';
import HeavyComputeWorker from '@/workers/heavy-compute.worker.ts?worker';

const result: Ref<number | null> = ref(null);
const computing = ref(false);

const worker = new HeavyComputeWorker();

worker.onmessage = (e: MessageEvent<{ result: number }>) => {
  result.value = e.data.result;
  computing.value = false;
};

function compute(): void {
  computing.value = true;
  // 生成 1000 万条数据
  const data = Array.from({ length: 10_000_000 }, () => Math.random() * 100);
  // 卸载到 Web Worker，主线程不阻塞
  worker.postMessage({ data, operation: 'average' });
}
</script>

<template>
  <div>
    <button @click="compute" :disabled="computing">
      {{ computing ? '计算中...' : '开始计算' }}
    </button>
    <p>结果: {{ result ?? '尚未计算' }}</p>
  </div>
</template>
```

### 5.12 请求缓存与去重

```typescript
// utils/request-cache.ts —— Vue 3.4+
import { ref, type Ref } from 'vue';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class RequestCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private pending: Map<string, Promise<unknown>> = new Map();

  // 带缓存的请求
  async get<T>(key: string, fetcher: () => Promise<T>, ttl: number = 60_000): Promise<T> {
    // 命中缓存
    const cached = this.cache.get(key) as CacheEntry<T> | undefined;
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }

    // 请求去重：相同 key 的并发请求复用同一个 Promise
    const pending = this.pending.get(key) as Promise<T> | undefined;
    if (pending) {
      return pending;
    }

    const promise = fetcher().then((data) => {
      this.cache.set(key, { data, timestamp: Date.now(), ttl });
      this.pending.delete(key);
      return data;
    }).catch((err) => {
      this.pending.delete(key);
      throw err;
    });

    this.pending.set(key, promise);
    return promise;
  }

  // 响应式缓存（返回 ref，自动更新）
  useCached<T>(key: string, fetcher: () => Promise<T>, ttl: number = 60_000): Ref<T | null> {
    const data: Ref<T | null> = ref(null);
    this.get(key, fetcher, ttl).then((result) => {
      data.value = result;
    });
    return data;
  }

  invalidate(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }
}

export const requestCache = new RequestCache();
```

---

## 6. 对比分析 | Comparative Analysis

### 6.1 Vue 3 与其他主流框架的性能对比

| 维度 | Vue 3 | React 18 | Angular 17 | Svelte 4 | SolidJS |
|------|-------|----------|------------|----------|---------|
| 响应式机制 | Proxy + Effect | Hooks + 调度 | Zone.js + 信号 | 编译时响应式 | 信号（Signal） |
| 虚拟 DOM | 有（Block Tree 优化） | 有（Fiber） | 有（Incremental DOM） | 无 | 无 |
| 编译时优化 | 静态提升、PatchFlag | 无（运行时 JSX） | 模板编译 | 完全编译 | 完全编译 |
| 包体积（gzipped） | 35 KB | 45 KB | 130 KB | 10 KB | 7 KB |
| 首屏渲染速度 | 快 | 中 | 慢 | 极快 | 极快 |
| 更新性能（动态节点少） | 快（$O(d)$） | 中（$O(n)$） | 中 | 极快 | 极快 |
| 更新性能（动态节点多） | 快 | 快 | 中 | 快 | 极快 |
| 内存占用 | 中 | 高 | 高 | 低 | 低 |
| TypeScript 支持 | 优秀 | 优秀 | 优秀 | 良好 | 优秀 |
| 生态成熟度 | 高 | 极高 | 高 | 中 | 中 |
| SSR 性能 | 高 | 中 | 中 | 高 | 高 |

### 6.2 响应式系统对比

| 特性 | Vue 3（Proxy） | React（Hooks） | Svelte（编译时） | Solid（Signal） |
|------|----------------|----------------|------------------|-----------------|
| 数据变更检测 | 自动（Proxy 拦截） | 手动（setState） | 编译时分析 | 自动（Signal） |
| 依赖追踪 | 自动（运行时） | 手动（deps 数组） | 编译时 | 自动（运行时） |
| 细粒度更新 | 组件级 + 属性级 | 组件级 | DOM 级 | DOM 级 |
| 不可变性要求 | 不要求 | 要求 | 不要求 | 不要求 |
| 性能开销 | 中（Proxy 拦截） | 低（无拦截） | 极低（编译时） | 极低（Signal） |
| 学习曲线 | 中 | 高（Hooks 规则） | 低 | 中 |

### 6.3 编译优化策略对比

| 优化策略 | Vue 3 | React | Svelte | Solid |
|----------|-------|-------|--------|-------|
| 静态提升 | 是 | 否 | 是 | 是 |
| PatchFlag | 是 | 否 | N/A | N/A |
| Block Tree | 是 | 否 | N/A | N/A |
| 缓存事件处理器 | 是 | 否 | 是 | 是 |
| 死代码消除 | 部分 | 否 | 是 | 是 |
| Tree Shaking | 是 | 否 | 是 | 是 |

### 6.4 状态管理方案对比

| 方案 | 适用场景 | 性能 | 复杂度 | Vue 3 推荐 |
|------|----------|------|--------|-----------|
| Pinia | 中大型应用 | 高 | 中 | 是 |
| Provide/Inject | 跨层级通信 | 高 | 低 | 是 |
| Composition API 共享 | 简单场景 | 高 | 低 | 是 |
| Vuex 4 | 遗留应用迁移 | 中 | 高 | 否（推荐 Pinia） |
| Redux | 跨框架共享 | 中 | 高 | 否 |
| 直接 props 传递 | 浅层组件 | 极高 | 低 | 是（≤3 层） |

### 6.5 渲染策略对比

| 策略 | 首屏速度 | SEO | 开发成本 | 适用场景 |
|------|----------|-----|----------|----------|
| CSR（客户端渲染） | 慢 | 差 | 低 | 后台管理系统 |
| SSR（服务端渲染） | 快 | 好 | 高 | 内容站、电商 |
| SSG（静态生成） | 极快 | 好 | 中 | 博客、文档站 |
| ISR（增量静态生成） | 极快 | 好 | 中 | 大型内容站 |
| Islands（岛屿） | 极快 | 好 | 高 | 内容站 + 少量交互 |

---

## 7. 常见陷阱与最佳实践 | Pitfalls and Best Practices

### 7.1 响应式陷阱

#### 7.1.1 解构 reactive 对象丢失响应性

**陷阱**：

```typescript
import { reactive } from 'vue';

const state = reactive({ count: 0, name: 'Vue' });

// 错误：解构后丢失响应性
const { count, name } = state;
// count 与 name 是普通值，不再响应 state.count 的变化

// 错误：作为函数参数传递
function increment(count: number) {
  count++; // 修改的是局部变量，不影响 state.count
}
increment(state.count);
```

**正确做法**：

```typescript
import { reactive, toRefs, toRef } from 'vue';

const state = reactive({ count: 0, name: 'Vue' });

// 正确：使用 toRefs 转换为 ref
const { count, name } = toRefs(state);
// count.value++ 会更新 state.count

// 正确：使用 toRef 单独转换
const countRef = toRef(state, 'count');

// 正确：传递整个 reactive 对象
function increment(state: { count: number }) {
  state.count++;
}
increment(state);
```

#### 7.1.2 ref 在模板中的自动解包陷阱

```vue
<script setup lang="ts">
import { ref, reactive } from 'vue';

const count = ref(0);
const state = reactive({ count: ref(0) });

// 模板中：count 自动解包为 count.value
// 但嵌套在 reactive 中的 ref 也会自动解包
</script>

<template>
  <div>
    <!-- 模板中无需 .value -->
    <p>{{ count }}</p>
    <!-- reactive 中的 ref 也会自动解包 -->
    <p>{{ state.count }}</p>
  </div>
</template>
```

**注意**：在 JS/TS 中访问 ref 必须使用 `.value`，仅在模板中自动解包。这是 Vue 3 最常见的陷阱之一。

#### 7.1.3 reactive 重新赋值丢失响应性

```typescript
import { reactive } from 'vue';

// 错误：重新赋值会丢失响应性
let state = reactive({ count: 0 });
state = reactive({ count: 1 }); // 原代理对象被丢弃，依赖关系断裂

// 正确方案 1：使用 ref
import { ref } from 'vue';
const state = ref({ count: 0 });
state.value = { count: 1 }; // 替换 .value 保持响应性

// 正确方案 2：使用 Object.assign
const state = reactive({ count: 0 });
Object.assign(state, { count: 1 }); // 修改属性而非替换对象

// 正确方案 3：逐属性修改
const state = reactive({ count: 0 });
state.count = 1;
```

#### 7.1.4 watch 监听 reactive 对象的深度问题

```typescript
import { reactive, watch } from 'vue';

const state = reactive({
  user: {
    profile: {
      name: 'Vue',
    },
  },
});

// reactive 对象默认深度监听
watch(state, (newVal, oldVal) => {
  // newVal 与 oldVal 是同一对象（reactive 不变）
  // 但深层属性变化会触发
  console.log('state changed');
});

state.user.profile.name = 'Vue 3'; // 触发

// 监听特定属性需要使用 getter 函数
watch(
  () => state.user.profile.name,
  (newVal, oldVal) => {
    console.log(`${oldVal} -> ${newVal}`); // Vue -> Vue 3
  },
);
```

### 7.2 渲染性能陷阱

#### 7.2.1 v-for 缺少 key 或使用 index 作为 key

**陷阱**：

```vue
<template>
  <!-- 错误：使用 index 作为 key -->
  <div v-for="(item, index) in items" :key="index">
    {{ item.name }}
  </div>
</template>
```

**问题分析**：当列表项发生插入、删除、重排序时，使用 `index` 作为 `key` 会导致：
1. Vue 错误复用 DOM 节点，可能导致状态错乱。
2. 输入框、复选框等表单元素的状态会跟随位置而非数据。
3. 触发不必要的组件重渲染。

**正确做法**：

```vue
<template>
  <!-- 正确：使用唯一稳定的 ID -->
  <div v-for="item in items" :key="item.id">
    {{ item.name }}
  </div>
</template>
```

#### 7.2.2 内联函数导致子组件重渲染

**陷阱**：

```vue
<template>
  <!-- 错误：每次渲染都创建新的函数引用 -->
  <ChildComponent @click="() => handleClick(item.id)" />
  <ChildComponent :filter="(x) => x.id === item.id" />
</template>
```

**正确做法**：

```vue
<script setup lang="ts">
import { useMemoizedHandlers } from '@/composables/useMemoizedHandlers';

const { getHandler } = useMemoizedHandlers();

// 缓存事件处理器
const handleClick = (id: number) => {
  // 处理逻辑
};

// 缓存过滤函数
const getFilter = (id: number) => (x: { id: number }) => x.id === id;
</script>

<template>
  <!-- Vue 3 默认会缓存事件处理器，无需额外处理 -->
  <ChildComponent @click="handleClick(item.id)" />
  <!-- 非事件 props 的函数仍需手动优化 -->
  <ChildComponent :filter="getFilter(item.id)" />
</template>
```

#### 7.2.3 大型列表未使用虚拟滚动

**陷阱**：

```vue
<template>
  <!-- 错误：直接渲染 10000 个 DOM 节点 -->
  <div v-for="item in largeList" :key="item.id">
    {{ item.name }}
  </div>
</template>
```

**影响**：DOM 节点数超过 5000 时，浏览器渲染性能急剧下降，可能导致：
- 首次渲染耗时数秒
- 滚动卡顿
- 内存占用过高（每个 DOM 节点约 1-10 KB）

**正确做法**：使用虚拟滚动（参见 5.2 节）。

### 7.3 内存泄漏陷阱

#### 7.3.1 定时器与事件监听未清理

```typescript
import { onMounted, onUnmounted } from 'vue';

// 错误：定时器与监听器未在 onUnmounted 清理
onMounted(() => {
  setInterval(() => {
    // 组件销毁后仍会执行
  }, 1000);

  window.addEventListener('resize', handleResize);
});

// 正确：在 onUnmounted 中清理
let timer: ReturnType<typeof setInterval> | null = null;

function handleResize(): void {
  // 处理逻辑
}

onMounted(() => {
  timer = setInterval(() => {
    // ...
  }, 1000);
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
  window.removeEventListener('resize', handleResize);
});
```

#### 7.3.2 响应式数据未释放

```typescript
import { reactive, onUnmounted } from 'vue';

// 场景：全局状态中存储了组件相关数据，组件销毁后未清理
const globalState = reactive({
  componentData: new Map<string, unknown>(),
});

onMounted(() => {
  globalState.componentData.set(componentId, largeData);
});

// 必须在 onUnmounted 中清理
onUnmounted(() => {
  globalState.componentData.delete(componentId);
});
```

### 7.4 可访问性（A11y）最佳实践

```vue
<script setup lang="ts">
import { ref, computed } from 'vue';

const expanded = ref(false);
const panelId = computed(() => `panel-${Math.random().toString(36).slice(2)}`);
</script>

<template>
  <!-- 可访问的手风琴组件 -->
  <div>
    <button
      type="button"
      :aria-expanded="expanded"
      :aria-controls="panelId"
      @click="expanded = !expanded"
    >
      {{ expanded ? '收起' : '展开' }}
    </button>
    <div
      :id="panelId"
      role="region"
      :aria-hidden="!expanded"
    >
      <p>面板内容</p>
    </div>
  </div>
</template>
```

### 7.5 SEO 优化陷阱

- **CSR 应用 SEO 差**：纯客户端渲染的应用，搜索引擎爬虫可能无法获取动态内容。解决方案：使用 SSR（Nuxt）或 SSG。
- **缺少 meta 信息**：使用 `@unhead/vue` 或 `vue-router-meta` 动态设置 `title`、`description`、`og:` 等 meta 标签。
- **缺少语义化标签**：使用 `<main>`、`<article>`、`<nav>`、`<aside>` 等语义化标签。

### 7.6 最佳实践清单

1. **响应式**：优先使用 `ref`，仅对需要深度响应式的对象使用 `reactive`；大型数据使用 `shallowRef`；第三方实例使用 `markRaw`。
2. **计算属性**：优先使用 `computed` 缓存计算结果，避免在模板中写复杂表达式。
3. **事件处理**：Vue 3 默认缓存事件处理器，无需手动 `useCallback`；但非事件 props 的函数仍需注意。
4. **列表渲染**：始终使用稳定唯一的 `key`；超过 1000 项使用虚拟滚动。
5. **组件拆分**：合理拆分组件，避免单个组件过大；但不要过度拆分（< 50 行的组件通常不需要拆分）。
6. **异步加载**：路由级懒加载；大型依赖（编辑器、图表库）异步加载。
7. **资源优化**：图片懒加载、响应式图片（`srcset`）；字体子集化；SVG 图标。
8. **缓存策略**：HTTP 缓存（Cache-Control、ETag）；Service Worker 缓存；CDN。
9. **预加载**：关键资源 `preload`；未来资源 `prefetch`；DNS 预解析。
10. **监控**：生产环境接入性能监控（Sentry、RUM、自研监控）。

---

## 8. 工程实践 | Engineering Practice

### 8.1 Vite 构建优化

#### 8.1.1 开发环境优化

```typescript
// vite.config.ts —— 开发环境
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig(({ mode }) => ({
  plugins: [vue()],
  server: {
    port: 3000,
    open: true,
    hmr: {
      port: 3001, // 单独 HMR 端口，避免冲突
      overlay: true, // 错误覆盖层
    },
    // 代理 API 请求
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  // 依赖预构建优化
  optimizeDeps: {
    include: ['vue', 'vue-router', 'pinia', 'axios'],
    exclude: ['@vueuse/core'],
  },
  // CSS 预处理
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@import "@/styles/variables.scss";`,
      },
    },
  },
  // 路径别名
  resolve: {
    alias: {
      '@': '/src',
    },
  },
}));
```

#### 8.1.2 生产环境优化

```typescript
// vite.config.ts —— 生产环境
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { visualizer } from 'rollup-plugin-visualizer';
import { compression } from 'vite-plugin-compression2';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    vue(),
    // 包体积分析
    visualizer({
      open: false,
      filename: 'dist/stats.html',
      gzipSize: true,
      brotliSize: true,
    }),
    // Gzip 压缩
    compression({
      algorithm: 'gzip',
      exclude: [/\.br$/, /\.gz$/],
    }),
    // Brotli 压缩（更高效）
    compression({
      algorithm: 'brotliCompress',
      exclude: [/\.br$/, /\.gz$/],
    }),
    // PWA 离线缓存
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.example\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60,
              },
            },
          },
        ],
      },
    }),
  ],
  build: {
    target: 'es2020',
    outDir: 'dist',
    assetsDir: 'assets',
    // 资源内联阈值（4KB 以下内联为 base64）
    assetsInlineLimit: 4096,
    // CSS 代码分割
    cssCodeSplit: true,
    // Source Map（生产环境关闭以减小体积）
    sourcemap: false,
    // Terser 压缩
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info'],
      },
      format: {
        comments: false,
      },
    },
    rollupOptions: {
      output: {
        // 入口文件名
        entryFileNames: 'assets/[name]-[hash].js',
        // 代码块文件名
        chunkFileNames: 'assets/[name]-[hash].js',
        // 资源文件名
        assetFileNames: 'assets/[name]-[hash].[ext]',
        manualChunks: {
          vue: ['vue', 'vue-router', 'pinia'],
          ui: ['element-plus'],
          utils: ['lodash-es', 'dayjs', 'axios'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});
```

### 8.2 Vue Router 优化

```typescript
// router/index.ts
import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: () => import('@/layouts/DefaultLayout.vue'),
      children: [
        {
          path: '',
          name: 'home',
          component: () => import('@/views/HomeView.vue'),
        },
      ],
    },
  ],
  // 滚动行为
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition;
    if (to.hash) return { el: to.hash, behavior: 'smooth' };
    return { top: 0, left: 0 };
  },
});

// 全局前置守卫
router.beforeEach((to, from) => {
  const authStore = useAuthStore();
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }
});

// 页面标题
router.afterEach((to) => {
  document.title = (to.meta.title as string) || 'FANDEX';
});

export default router;
```

### 8.3 Pinia 状态管理优化

```typescript
// stores/useUserStore.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { userApi } from '@/api/user';

export const useUserStore = defineStore('user', () => {
  // state
  const user = ref<User | null>(null);
  const token = ref<string>('');

  // getters（使用 computed）
  const isLoggedIn = computed(() => !!token.value);
  const userName = computed(() => user.value?.name ?? '游客');

  // actions
  async function login(credentials: LoginCredentials): Promise<void> {
    const { user: userData, token: userToken } = await userApi.login(credentials);
    user.value = userData;
    token.value = userToken;
    // 持久化
    localStorage.setItem('token', userToken);
  }

  function logout(): void {
    user.value = null;
    token.value = '';
    localStorage.removeItem('token');
  }

  return { user, token, isLoggedIn, userName, login, logout };
});
```

### 8.4 调试工具

#### 8.4.1 Vue DevTools

```typescript
// main.ts
import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { createPinia } from 'pinia';

const app = createApp(App);
app.use(router);
app.use(createPinia());

// 开发环境启用 Vue DevTools 性能监控
if (import.meta.env.DEV) {
  app.config.performance = true;
}

app.mount('#app');
```

#### 8.4.2 Chrome DevTools Performance 面板

**分析步骤**：

1. 打开 Chrome DevTools → Performance 面板。
2. 点击"Record"按钮，操作应用。
3. 停止录制，分析火焰图。
4. 重点关注：
   - 长任务（> 50ms）
   - 布局抖动（Layout Thrashing）
   - 强制同步布局（Forced Synchronous Layout）
   - 脚本执行时间过长

#### 8.4.3 Lighthouse 审计

```bash
# 命令行运行 Lighthouse
npx lighthouse https://example.com --output html --output-path ./lighthouse-report.html --view

# 关键指标：
# - Performance（性能）
# - Accessibility（可访问性）
# - Best Practices（最佳实践）
# - SEO（搜索引擎优化）
```

### 8.5 CI/CD 性能基线

```yaml
# .github/workflows/performance.yml
name: Performance Budget

on:
  pull_request:
    branches: [main, develop]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build
      - name: Run Lighthouse CI
        uses: treosh/lighthouse-ci-action@v11
        with:
          urls: |
            http://localhost:3000
          upload-artifacts: true
          temporary-public-storage: true
          config-path: ./.lighthouserc.json
```

```json
// .lighthouserc.json
{
  "ci": {
    "collect": {
      "startServerCommand": "npm run preview",
      "startServerReadyPattern": "Local:",
      "numberOfRuns": 3
    },
    "assert": {
      "preset": "lighthouse:recommended",
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "categories:accessibility": ["error", { "minScore": 0.9 }],
        "first-contentful-paint": ["error", { "maxNumericValue": 2000 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }],
        "total-blocking-time": ["error", { "maxNumericValue": 300 }]
      }
    }
  }
}
```

---

## 9. 案例研究 | Case Studies

### 9.1 Vue 官网（vuejs.org）性能优化

Vue 官网使用 VitePress（基于 Vue 3 的静态站点生成器）构建，是 Vue 3 性能优化的标杆案例。

**优化策略**：

1. **SSG（静态生成）**：所有页面在构建时预渲染为 HTML，首屏 LCP < 0.5s。
2. **按需加载**：路由懒加载，仅加载当前页面的 JS。
3. **MDX 增强**：Markdown 中嵌入 Vue 组件，实现交互式文档。
4. **PWA**：Service Worker 缓存所有静态资源，离线可访问。
5. **图片优化**：使用 SVG 图标，避免位图。

**性能指标**（基于公开报告）：

- Lighthouse Performance: 100/100
- LCP: 0.4s
- INP: 50ms
- CLS: 0
- TBT: 0ms

### 9.2 Nuxt 3（Nuxt.com）

Nuxt 3 是基于 Vue 3 的元框架，提供 SSR、SSG、ISR 等多种渲染模式。

**关键优化**：

1. **混合渲染（Hybrid Rendering）**：不同路由使用不同渲染策略。
2. **Nitro 引擎**：基于 Rollup 与 unjs 的服务端引擎，支持多平台部署。
3. **自动导入**：组件与 Composable 自动导入，减少手动 import。
4. **数据获取**：`useFetch`、`useAsyncData` 实现服务端与客户端数据预取与水合。

```vue
<!-- Nuxt 3 数据获取示例 -->
<script setup lang="ts">
// 服务端与客户端共享的数据获取
const { data: posts, pending, error } = await useFetch('/api/posts', {
  // 服务端预取，客户端水合
  server: true,
  // 客户端缓存
  key: 'posts',
  // 转换数据
  transform: (posts: Post[]) => posts.slice(0, 10),
});
</script>
```

### 9.3 Element Plus 组件库优化

Element Plus 是 Vue 3 最流行的 UI 组件库之一，其性能优化策略包括：

1. **按需引入**：通过 `unplugin-vue-components` 实现 Tree Shaking。
2. **CSS 变量**：使用 CSS 变量实现主题切换，避免重复样式。
3. **虚拟滚动**：`el-table-v2`、`el-select-v2` 内置虚拟滚动。
4. **SSR 友好**：避免在组件初始化时访问 `window`、`document`。

```typescript
// 按需引入配置
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers';

export default defineConfig({
  plugins: [
    vue(),
    AutoImport({
      resolvers: [ElementPlusResolver()],
    }),
    Components({
      resolvers: [ElementPlusResolver()],
    }),
  ],
});
```

### 9.4 Vuetify 3 性能考量

Vuetify 3 是基于 Material Design 的 Vue 3 UI 库，其性能特点：

1. **VLab 架构**：组件按实验室阶段划分，稳定组件优先保证性能。
2. **全局配置**：通过 `createVuetify` 统一配置主题、断点等，减少运行时开销。
3. **Tree Shaking**：Vuetify 3 完全重写为 Tree Shakable。
4. **指令系统**：`v-ripple`、`v-intersect` 等指令使用 IntersectionObserver 等高效 API。

### 9.5 GitLab Vue 3 迁移性能案例

GitLab 在 2023-2024 年间逐步将部分模块从 Vue 2 迁移至 Vue 3，其性能优化经验：

1. **渐进式迁移**：使用 `@vue/compat` 兼容模式，逐步替换。
2. **响应式系统升级**：移除 `Vue.set`、`$set`，改用 Proxy 支持的新语法。
3. **过滤器移除**：Vue 3 移除 `filter`，替换为 `computed` 或方法调用。
4. **事件总线移除**：Vue 3 移除 `$on`、`$off`，替换为 mitt 或 Pinia。

**性能收益**（迁移后）：

- 包体积减少 15%（Tree Shaking）
- 首屏渲染速度提升 20%（编译优化）
- 内存占用减少 10%（Proxy 比 defineProperty 更高效）

---

## 10. 习题 | Exercises

### 10.1 选择题

**题目 1**：下列哪个 API 不会触发深度响应式转换？

- A. `reactive`
- B. `ref`
- C. `shallowReactive`
- D. `readonly`

<details>
<summary>答案与解析</summary>

**答案**：C

**解析**：
- `reactive`：深度响应式，递归转换所有嵌套属性。
- `ref`：对对象类型使用 `reactive` 进行深度转换。
- `shallowReactive`：只对第一层属性响应式，嵌套属性不转换。
- `readonly`：深度只读，但仍保留响应式。

</details>

**题目 2**：Vue 3 编译器生成的 PatchFlag 的作用是？

- A. 标记组件是否需要更新
- B. 标记动态节点的更新类型，跳过不必要的 Diff
- C. 标记静态节点以提升到渲染函数外
- D. 标记组件是否使用 SSR

<details>
<summary>答案与解析</summary>

**答案**：B

**解析**：PatchFlag 是编译器为动态节点附加的整数标记，表示该节点在更新时需要被 Patch 的部分（如 TEXT、CLASS、STYLE、PROPS）。运行时 Diff 算法根据 PatchFlag 只比对动态部分，跳过静态部分，将复杂度从 $O(n)$ 降至 $O(d)$。

</details>

**题目 3**：关于 `v-memo` 指令，下列说法错误的是？

- A. `v-memo` 接受一个依赖数组作为参数
- B. 当依赖数组中的值未变化时，跳过子树的渲染
- C. `v-memo` 可以用于任何元素，包括组件
- D. `v-memo` 适合用于所有 `v-for` 列表

<details>
<summary>答案与解析</summary>

**答案**：D

**解析**：`v-memo` 适合用于依赖变化少、子树渲染开销大的场景。对于简单的列表项（如纯文本），`v-memo` 的依赖比对开销可能大于其节省的渲染开销，反而降低性能。`v-memo` 应当用于复杂子树（如多列表格、嵌套组件）。

</details>

**题目 4**：KeepAlive 的 `max` 属性使用的数据结构是？

- A. 队列（FIFO）
- B. 栈（LIFO）
- C. LRU 缓存
- D. 哈希表

<details>
<summary>答案与解析</summary>

**答案**：C

**解析**：KeepAlive 使用 LRU（Least Recently Used，最近最少使用）缓存算法。当缓存的组件数量超过 `max` 时，淘汰最近最少访问的组件。LRU 通过双向链表 + 哈希表实现，查询、插入、淘汰均为 $O(1)$。

</details>

**题目 5**：下列哪种情况不会触发 Vue 3 的响应式更新？

- A. 修改 `ref.value`
- B. 修改 `reactive` 对象的属性
- C. 修改 `shallowRef.value` 的嵌套属性
- D. 修改 `shallowReactive` 对象的第一层属性

<details>
<summary>答案与解析</summary>

**答案**：C

**解析**：`shallowRef` 只追踪 `.value` 本身的变化，不深度追踪 `.value` 内部属性的变化。修改 `shallowRef.value` 的嵌套属性不会触发更新，需要调用 `triggerRef` 手动触发。

</details>

### 10.2 填空题

**题目 1**：Vue 3 的响应式系统使用 ES6 的 ________ 替代了 Vue 2 的 `Object.defineProperty`。

<details>
<summary>答案</summary>

Proxy

</details>

**题目 2**：Vue 3 编译器通过 ________ 算法将虚拟 DOM 的 Diff 复杂度从 $O(n)$ 降至 $O(d)$，其中 $d$ 为动态节点数。

<details>
<summary>答案</summary>

Block Tree + PatchFlag

</details>

**题目 3**：`computed` 属性的缓存失效条件是 ________。

<details>
<summary>答案</summary>

任一依赖项发生变化（dirty 标记为 true）

</details>

**题目 4**：Vue 3 中，使用 ________ API 可以将一个对象标记为永不响应式，跳过 Proxy 转换。

<details>
<summary>答案</summary>

`markRaw`

</details>

**题目 5**：HTTP/2 相比 HTTP/1.1 的关键性能优势是 ________，允许在同一 TCP 连接上并行传输多个请求。

<details>
<summary>答案</summary>

多路复用（Multiplexing）

</details>

### 10.3 编程题

**题目 1**：实现一个性能优化的可编辑大型表格组件，要求：

1. 支持至少 1000 行数据
2. 编辑单元格时不影响其他行
3. 排序与筛选不重渲染所有行

```vue
<!-- EditableTable.vue -->
<script setup lang="ts">
import { ref, computed, shallowRef, triggerRef } from 'vue';

interface Column {
  key: string;
  title: string;
  editable?: boolean;
}

interface Row {
  id: number;
  [key: string]: string | number;
}

const props = defineProps<{
  columns: Column[];
  data: Row[];
}>();

// 使用 shallowRef 避免深度响应式
const rows = shallowRef<Row[]>([...props.data]);
const sortKey = ref<string>('');
const sortOrder = ref<'asc' | 'desc'>('asc');
const filterText = ref('');

// 排序与筛选结果（computed 缓存）
const displayRows = computed(() => {
  let result = rows.value;

  // 筛选
  if (filterText.value) {
    const text = filterText.value.toLowerCase();
    result = result.filter((row) =>
      props.columns.some((col) =>
        String(row[col.key]).toLowerCase().includes(text),
      ),
    );
  }

  // 排序
  if (sortKey.value) {
    const key = sortKey.value;
    const order = sortOrder.value === 'asc' ? 1 : -1;
    result = [...result].sort((a, b) => {
      if (a[key] < b[key]) return -1 * order;
      if (a[key] > b[key]) return 1 * order;
      return 0;
    });
  }

  return result;
});

function toggleSort(key: string): void {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortKey.value = key;
    sortOrder.value = 'asc';
  }
}

// 编辑单元格（仅更新对应行，使用 v-memo 避免其他行重渲染）
function editCell(rowId: number, key: string, value: string): void {
  const row = rows.value.find((r) => r.id === rowId);
  if (row) {
    row[key] = value;
    triggerRef(rows);
  }
}
</script>

<template>
  <div>
    <input v-model="filterText" placeholder="筛选..." />

    <table>
      <thead>
        <tr>
          <th
            v-for="col in columns"
            :key="col.key"
            @click="toggleSort(col.key)"
          >
            {{ col.title }}
            <span v-if="sortKey === col.key">
              {{ sortOrder === 'asc' ? '↑' : '↓' }}
            </span>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in displayRows"
          :key="row.id"
          v-memo="[row.id, sortKey, sortOrder, filterText]"
        >
          <td v-for="col in columns" :key="col.key">
            <input
              v-if="col.editable"
              :value="row[col.key]"
              @input="editCell(row.id, col.key, ($event.target as HTMLInputElement).value)"
            />
            <span v-else>{{ row[col.key] }}</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
```

**题目 2**：实现一个带请求去重与缓存的 composable。

```typescript
// composables/useCachedRequest.ts
import { ref, type Ref } from 'vue';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
const pending = new Map<string, Promise<unknown>>();

export function useCachedRequest<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 60000,
): { data: Ref<T | null>; loading: Ref<boolean>; error: Ref<Error | null> } {
  const data: Ref<T | null> = ref(null);
  const loading = ref(false);
  const error: Ref<Error | null> = ref(null);

  async function execute(): Promise<void> {
    // 命中缓存
    const cached = cache.get(key) as CacheEntry<T> | undefined;
    if (cached && Date.now() - cached.timestamp < ttl) {
      data.value = cached.data;
      return;
    }

    // 请求去重
    const existing = pending.get(key) as Promise<T> | undefined;
    if (existing) {
      loading.value = true;
      try {
        data.value = await existing;
      } catch (e) {
        error.value = e as Error;
      } finally {
        loading.value = false;
      }
      return;
    }

    loading.value = true;
    const promise = fetcher()
      .then((result) => {
        cache.set(key, { data: result, timestamp: Date.now() });
        return result;
      })
      .finally(() => {
        pending.delete(key);
      });

    pending.set(key, promise);

    try {
      data.value = await promise;
    } catch (e) {
      error.value = e as Error;
    } finally {
      loading.value = false;
    }
  }

  execute();

  return { data, loading, error };
}
```

### 10.4 思考题

**题目 1**：为什么 Vue 3 选择 Proxy 而不是 `Object.defineProperty`？请从能力、性能、兼容性三个维度分析。

<details>
<summary>参考答案</summary>

1. **能力维度**：
   - Proxy 可以监听属性的新增与删除，`Object.defineProperty` 不能。
   - Proxy 可以监听数组索引与 `length` 变化，`Object.defineProperty` 不能。
   - Proxy 支持 Map、Set、WeakMap、WeakSet，`Object.defineProperty` 不支持。

2. **性能维度**：
   - Proxy 是惰性的，只在访问时递归转换；`Object.defineProperty` 是初始化时递归遍历，大型对象初始化慢。
   - Proxy 的拦截开销略高于 `Object.defineProperty`，但实际差距在 5% 以内。

3. **兼容性维度**：
   - Proxy 是 ES6 特性，不支持 IE11；`Object.defineProperty` 是 ES5，支持 IE9+。
   - Vue 3 放弃 IE11 支持，因此选择 Proxy。Vue 2.7 作为 Vue 2 的最后一个版本，仍支持 IE11。

</details>

**题目 2**：在什么场景下应该使用 `shallowRef` 而不是 `ref`？请给出至少 3 个具体场景。

<details>
<summary>参考答案</summary>

1. **大型数据列表**：万级以上的数据列表，深度响应式转换开销大，且通常整列表替换而非逐项修改。
2. **第三方库实例**：Monaco Editor、ECharts、Leaflet 等第三方库的实例，内部已有自己的事件系统，响应式转换会导致性能问题。
3. **静态配置对象**：如路由配置、菜单配置等不会动态修改的对象，无需深度响应式。
4. **复杂嵌套对象**：深度嵌套的对象（如 DOM 树、AST），深度响应式转换开销大于收益。

</details>

**题目 3**：如何在一个 Vue 3 应用中实现性能监控？请设计一套完整的监控方案。

<details>
<summary>参考答案</summary>

完整方案应包括：

1. **指标采集层**：
   - Core Web Vitals（LCP、INP、CLS）通过 PerformanceObserver 采集。
   - Vue 组件渲染耗时通过 `app.config.performance = true` 开启。
   - 自定义指标通过 `performance.mark` / `performance.measure` 采集。

2. **数据上报层**：
   - 使用 `navigator.sendBeacon` 在页面卸载时可靠上报。
   - 批量上报：累积一定数量或定时上报。
   - 错误上报：window.onerror、unhandledrejection。

3. **数据存储与可视化**：
   - 后端存储时序数据（如 InfluxDB、Prometheus）。
   - 前端可视化仪表盘（如 Grafana、自研 Vue 仪表盘）。

4. **告警机制**：
   - 阈值告警：LCP > 2.5s、错误率 > 1%。
   - 趋势告警：性能持续下降。
   - 分位数告警：P95 LCP > 4s。

5. **CI/CD 集成**：
   - Lighthouse CI 在 PR 时运行。
   - 性能预算检查。
   - 性能回退阻断合并。

</details>

**题目 4**：对比 CSR、SSR、SSG、ISR 四种渲染策略，分析各自的适用场景与性能权衡。

<details>
<summary>参考答案</summary>

| 策略 | 首屏速度 | SEO | 服务器成本 | 实时性 | 适用场景 |
|------|----------|-----|------------|--------|----------|
| CSR | 慢（需 JS 执行） | 差 | 低（静态托管） | 高 | 后台管理系统、SaaS 工具 |
| SSR | 快（HTML 直出） | 好 | 高（每请求渲染） | 高 | 电商、新闻、社交 |
| SSG | 极快（CDN 缓存） | 好 | 极低（静态托管） | 低 | 博客、文档、营销页 |
| ISR | 极快（CDN 缓存） | 好 | 低（按需重生成） | 中 | 大型内容站、电商目录 |

**权衡**：
- 首屏速度：SSG ≈ ISR > SSR > CSR
- 实时性：SSR ≈ CSR > ISR > SSG
- 服务器成本：SSR > ISR > CSR ≈ SSG
- 开发成本：SSR > ISR > SSG > CSR

**Vue 3 实践**：
- CSR：纯 Vite + Vue 3
- SSR：Nuxt 3
- SSG：VitePress、Nuxt 3 SSG 模式
- ISR：Nuxt 3 + Nitro ISR

</details>

**题目 5**：请分析 `computed` 与 `watch` 的执行时机差异，并说明何时使用何者。

<details>
<summary>参考答案</summary>

**执行时机差异**：

- `computed`：
  - 惰性求值，首次访问时才计算。
  - 缓存结果，依赖不变时多次访问返回缓存值。
  - 依赖变化时仅标记为 dirty，下次访问才重计算。
  - 适合：派生状态计算。

- `watch`：
  - 主动监听，依赖变化后回调。
  - 默认惰性（不立即执行），`immediate: true` 立即执行。
  - 适合：副作用（网络请求、本地存储、DOM 操作）。

- `watchEffect`：
  - 自动收集依赖，立即执行一次。
  - 适合：副作用与依赖紧密关联的场景。

**使用建议**：

- 派生数据用 `computed`（如 `fullName = firstName + lastName`）。
- 副作用用 `watch`（如 `watch(userId, fetchUser)`）。
- 副作用 + 自动依赖收集用 `watchEffect`。
- 避免在 `watch` 中修改被监听的数据，可能导致无限循环。

</details>

---

## 11. 参考文献 | References

1. You, E. (2020). *Vue.js 3.0 Release Notes*. Vue.js Foundation. https://github.com/vuejs/core/releases/tag/v3.0.0

2. You, E. (2020). *Vue 3 Reactivity System Design*. Vue.js Documentation. https://vuejs.org/guide/extras/reactivity-in-depth.html

3. Vue.js Team. (2024). *Vue.js Official Documentation (3.4+)*. Vue.js Foundation. https://vuejs.org/

4. Vite Team. (2024). *Vite: Next Generation Frontend Tooling*. Evan You. https://vitejs.dev/

5. Pinia Team. (2024). *Pinia: The Vue Store that you will enjoy using*. https://pinia.vuejs.org/

6. Nuxt Team. (2024). *Nuxt 3: The Intuitive Vue Framework*. https://nuxt.com/

7. Google Chrome Team. (2024). *Core Web Vitals: Essential metrics for a healthy site*. Google. https://web.dev/vitals/

8. W3C. (2023). *Web Performance Working Group*. W3C. https://www.w3.org/webperf/

9. Ivanov, M. (2023). *Virtual Scrolling Implementation Patterns*. VueConf 2023. https://vueconf.org/2023

10. Zhang, S. (2024). *Vue 3 Performance Optimization Guide*. Vue.js Asia. https://vuejs.org/guide/best-practices/performance.html

11. Krause, E. (2023). *Progressive Web Apps with Vue 3 and Vite PWA*. Evil Martians. https://evilmartians.com/

12. Vue Router Team. (2024). *Vue Router 4 Documentation*. https://router.vuejs.org/

13. Element Plus Team. (2024). *Element Plus: A Vue 3 UI Framework*. https://element-plus.org/

14. Vuetify Team. (2024). *Vuetify 3: Material Design Component Framework*. https://vuetifyjs.com/

15. VueUse Team. (2024). *VueUse: Collection of Utility Composition Functions*. https://vueuse.org/

16. UnJS Team. (2024). *UnJS: Unified JavaScript Tools*. https://unjs.io/

17. Nielsen, J. (1993). *Usability Engineering*. Morgan Kaufmann. ISBN: 978-0125184059

18. Krug, S. (2014). *Don't Make Me Think, Revisited: A Common Sense Approach to Web Usability* (3rd ed.). New Riders. ISBN: 978-0321965516

19. Osmani, A. (2021). *Image Optimization: Adding Performance to Your Web Images*. O'Reilly Media. ISBN: 978-1492057579

20. Grigorik, I. (2013). *High Performance Browser Networking*. O'Reilly Media. https://hpbn.co/

---

## 12. 延伸阅读 | Further Reading

### 12.1 官方资源

- **Vue.js 官方文档**：https://vuejs.org/
- **Vue.js GitHub 仓库**：https://github.com/vuejs/core
- **Vue RFC（Request for Comments）**：https://github.com/vuejs/rfcs
- **Vue Conf 演讲视频**：https://www.vuemastery.com/conferences/
- **Evan You 个人博客**：https://evanyou.me/

### 12.2 进阶书籍

- **《Vue.js 3 从入门到实战》**：杨志坚、张志美著，电子工业出版社，2023。
- **《Vue.js 3 Cookbook》**：Heitor Ribeiro 著，Packt Publishing，2024。
- **《Front-End Performance Optimization》**：Alex Macaw 著，Pragmatic Bookshelf，2023。
- **《High Performance Web Sites》**：Steve Souders 著，O'Reilly Media，2007。
- **《Even Faster Web Sites》**：Steve Souders 著，O'Reilly Media，2009。

### 12.3 在线课程

- **Vue Mastery**：https://www.vuemastery.com/
- **Vue School**：https://vueschool.io/
- **Frontend Masters: Vue 3 Fundamentals**：https://frontendmasters.com/courses/vue-3-fundamentals/
- **Egghead: Build Vue 3 Apps with the Composition API**：https://egghead.io/courses/build-vue-3-apps-with-the-composition-api

### 12.4 论文与技术报告

- **"Vue.js: The Progressive Framework"**：Evan You, VueConf 2020.
- **"Reactivity in Vue 3"**：Evan You, JSConf EU 2020.
- **"Compiler-assisted Reactivity"**：Evan You, Vue.js Conf 2021.
- **"Performance Analysis of Modern Web Frameworks"**：Krause et al., ICSE 2023.
- **"A Comparative Study of React, Vue, and Angular"**：Zhang et al., IEEE Software 2023.

### 12.5 工具与库

- **Vue DevTools**：https://devtools.vuejs.org/
- **Vite**：https://vitejs.dev/
- **Vitest**：https://vitest.dev/
- **Vue Router**：https://router.vuejs.org/
- **Pinia**：https://pinia.vuejs.org/
- **VueUse**：https://vueuse.org/
- **VitePress**：https://vitepress.dev/
- **Nuxt 3**：https://nuxt.com/
- **Vue Virtual Scroller**：https://github.com/Akryum/vue-virtual-scroller
- **Vue Performance Observer**：https://github.com/vuejs/core/tree/main/packages/runtime-core

### 12.6 社区与博客

- **Vue.js 论坛**：https://forum.vuejs.org/
- **Vue.js Discord**：https://discord.com/invite/vue
- **Vue News**：https://news.vuejs.org/
- **Anthony Fu 博客**：https://antfu.me/
- **Evan You 博客**：https://evanyou.me/
- **CSS-Tricks Vue 文章**：https://css-tricks.com/guides/vue/
- **Smashing Magazine Vue 文章**：https://www.smashingmagazine.com/category/vue

### 12.7 性能基准与监控

- **Lighthouse**：https://developers.google.com/web/tools/lighthouse
- **WebPageTest**：https://www.webpagetest.org/
- **Chrome DevTools**：https://developers.google.com/web/tools/chrome-devtools
- **Sentry**：https://sentry.io/
- **SpeedCurve**：https://www.speedcurve.com/
- **Calibre**：https://calibreapp.com/

### 12.8 学习路径建议

1. **入门阶段**：
   - Vue 3 官方文档基础部分
   - Vue Mastery 免费课程
   - 实践：Todo App、博客系统

2. **进阶阶段**：
   - Vue 3 源码阅读（响应式系统、编译器）
   - Vue Router、Pinia 深度使用
   - 实践：电商前台、后台管理系统

3. **高级阶段**：
   - Nuxt 3 全栈开发
   - Vite 插件开发
   - Vue 3 编译器扩展
   - 实践：SSR 应用、PWA 应用、性能监控平台

4. **专家阶段**：
   - Vue 3 核心源码贡献
   - 自研 Vue 3 UI 库
   - Vue 3 性能优化专著
   - 实践：开源项目、技术布道

---

## 附录 A：性能优化速查表

| 优化场景 | 推荐方案 | 收益评估 |
|----------|----------|----------|
| 大型列表渲染 | 虚拟滚动 | 内存与渲染时间降低 90%+ |
| 第三方库实例 | `markRaw` | 避免响应式开销与内存泄漏 |
| 深度嵌套对象 | `shallowRef` | 初始化时间降低 80%+ |
| 静态内容 | `v-once` | 后续渲染跳过，节省 Diff 时间 |
| 条件性子树缓存 | `v-memo` | 子树重渲染节省 90%+ |
| 路由懒加载 | `defineAsyncComponent` | 首屏 JS 体积降低 50%+ |
| 计算缓存 | `computed` | 重复访问节省 100% 计算 |
| 组件缓存 | `<KeepAlive>` | 切换组件节省 80%+ 渲染 |
| 包体积优化 | Tree Shaking | 包体积降低 30%+ |
| 网络优化 | HTTP/2 + Gzip + Brotli | 传输时间降低 60%+ |
| 图片优化 | 懒加载 + 响应式 | 图片体积降低 70%+ |
| 字体优化 | 子集化 + `font-display` | 字体加载时间降低 80%+ |

## 附录 B：Vue 3 性能优化检查清单

- [ ] 响应式：使用 `shallowRef`/`shallowReactive` 处理大型数据
- [ ] 响应式：使用 `markRaw` 标记第三方库实例
- [ ] 渲染：`v-for` 使用稳定唯一的 `key`
- [ ] 渲染：大型列表使用虚拟滚动
- [ ] 渲染：静态内容使用 `v-once`
- [ ] 渲染：复杂子树使用 `v-memo`
- [ ] 计算：派生状态使用 `computed` 缓存
- [ ] 缓存：组件切换使用 `<KeepAlive>`
- [ ] 加载：路由懒加载
- [ ] 加载：大型依赖异步加载
- [ ] 打包：Tree Shaking 按需引入
- [ ] 打包：手动分包优化
- [ ] 打包：Gzip + Brotli 压缩
- [ ] 网络：HTTP/2 启用
- [ ] 网络：CDN 部署静态资源
- [ ] 网络：Service Worker 缓存
- [ ] 图片：懒加载 + 响应式图片
- [ ] 字体：子集化 + `font-display: swap`
- [ ] 监控：Core Web Vitals 采集
- [ ] 监控：Vue 组件渲染耗时
- [ ] CI/CD：Lighthouse 自动审计
- [ ] CI/CD：性能预算检查

---

> **文档版本**：v2.0（2026-06-14）
> **目标读者**：Vue 3 中高级开发者、前端架构师、性能工程师
> **配套版本**：Vue 3.4+、Vite 5+、Pinia 2+、Vue Router 4+
> **维护者**：FANDEX 团队
> **反馈渠道**：issues@fandex.dev

---

*本文档对标 MIT 6.170 Software Studio、Stanford CS142 Web Applications、CMU 17-437 Engineering of Web Applications 课程水准，旨在为 Vue 3 开发者提供系统化、工程化的性能优化参考。*
