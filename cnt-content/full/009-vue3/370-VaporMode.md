---
order: 370
title: Vapor 模式与 Vue 3.6 展望
module: 'vue3'
category: 前端技术
difficulty: advanced
description: Vue 3.6 Vapor 模式原理与进展：编译期 DOM 操作如何取代虚拟 DOM diff、组件 API 为何不变、渐进式迁移策略与生态兼容性。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'vue3/010-OverviewEnv'
  - 'vue3/280-Vue3CompileOptimization'
  - 'vue3/360-Vue3NewFeatures3435'
  - 'vue3/390-SvelteVsVueComparison'
prerequisites:
  - 'vue3/050-ReactiveSystem'
---

## 前置知识

- [编译优化](/vue3/280-Vue3CompileOptimization)：先理解静态提升与补丁标记，才知道虚拟 DOM 模式"贵"在哪
- [响应式系统](/vue3/050-ReactiveSystem)：Vapor 不改变响应式 API，本文的结论建立在这套心智之上

## 学习目标

- 说清 Vapor 模式解决了虚拟 DOM 的哪部分开销，以及它不解决什么
- 理解为什么 Vapor 不改变 `ref` / `<script setup>` 等组件 API
- 掌握"两种编译模式共存"的渐进式迁移思路与生态兼容性检查点
- 知道当前版本状态与生产采用策略

## 1. 版本状态

截至 2026-09：Vue 稳定线是 3.5.x；3.6 处于 RC 阶段，核心特性即 Vapor 模式。Vapor 已完成与虚拟 DOM 模式的功能对等（2025 年底宣布），此后进入以稳定性为主的 RC 迭代。生产项目在 3.6 稳定版发布前继续使用 3.5.x，时间线以官方 Releases 页为准。

## 2. 为什么需要 Vapor：虚拟 DOM 的开销账

Vue 3 的虚拟 DOM 模式已经通过编译优化把运行时 diff 成本压得很低（静态提升、补丁标记、块级树），但仍有两笔固定开销：

1. **VNode 创建**：每次组件重渲染，render 函数都要重新生成一棵轻量 JS 对象树。
2. **diff 遍历**：即使有补丁标记，框架仍要在新旧树之间比较才能确定"改哪里"。

Vapor 的做法是釜底抽薪：**编译期直接生成"改哪里"的定向 DOM 操作代码**，运行时不再创建中间 VNode、不再 diff。响应式数据一变，编译产物直接更新对应 DOM 节点——这也是 Svelte 从一开始的选择。

## 3. 组件 API 不变：Vapor 改的是编译产物

Vapor 最关键的设计决策：它是**编译策略**的变化，不是组件编程模型的变化。

```vue
<!-- 同一份组件源码，虚拟 DOM 模式与 Vapor 模式都能编译 -->
<script setup>
import { ref, computed } from 'vue';

const count = ref(0);
const double = computed(() => count.value * 2);
</script>

<template>
  <button @click="count++">点击次数：{{ count }}，两倍：{{ double }}</button>
</template>
```

- 虚拟 DOM 模式：编译为返回 VNode 树的 render 函数。
- Vapor 模式：编译为一组创建节点 + 订阅响应式的直接操作。

`ref`、`reactive`、`computed`、`watch`、`<script setup>`、defineModel、指令、插槽、Teleport、Suspense 等你学过的一切 API 在 Vapor 下语义不变。学习上的投入不会因为 Vapor 而贬值——变的只是框架在编译器里做的功课。

## 4. 编译产物对比：同一个组件的两种命运

用伪代码示意编译差异（简化，实际产物经过 minify 与更多优化）：

```js
// 虚拟 DOM 模式：render 函数返回 VNode 树
function render() {
  return h('button', { onClick: () => count.value++ },
    `点击次数：${count.value}，两倍：${double.value}`);
  // 每次更新重建整棵 VNode，再 diff 出差异
}

// Vapor 模式：编译为创建节点 + 定向订阅
const n0 = t0();          // 按模板创建真实 <button>
n0.addEventListener('click', () => count.value++);
renderEffect(() => setText(n0, `点击次数：${count.value}，两倍：${double.value}`));
// count 变化 -> effect 直接改文本节点，无 VNode、无 diff
```

两种产物在交互行为上等价，差异只体现在运行时开销：Vapor 少了"建树 + 比较"两个环节，这正是它在大组件树与高频更新场景收益最大的原因。

## 5. 性能特征：收益在哪，不收益在哪

收益明显的场景：

- **高频更新**：计数器、动画驱动、拖拽等每帧触发的状态变化，省掉 VNode 创建与 diff 的固定开销。
- **大组件树重渲染**：组件树越深，跳过 diff 的绝对收益越大。
- **内存敏感**：不保留 VNode 树，渲染内存占用更低。

收益有限的场景：

- **低频静态页面**：虚拟 DOM 模式有静态提升，本来就几乎不 diff。
- **重逻辑轻渲染**：瓶颈在业务计算或网络 IO 时，渲染层优化感知不到。

因此 Vapor 是"渲染性能的地板抬高"，不是万能加速器。性能优化方法论（shallowRef、v-memo、虚拟滚动）依然适用，参见 [性能优化详解](/vue3/330-VuePerformanceDetailed)。

## 6. 渐进式迁移：两种模式共存

Vapor 设计上支持与虚拟 DOM 模式在同一个应用中混用：构建配置中把指定组件标记为 vapor 编译，其余组件维持现状。这带来一条低风险迁移路径：

1. **升级 3.6 稳定版但不开 Vapor**：确认应用与依赖在 3.6 下运行正常。
2. **次要路径试点**：挑选交互频繁、依赖简单的组件（开关、滑块、动效组件）启用 Vapor。
3. **扩大范围**：按页面/模块推进，监控性能指标与控制台警告。
4. **全量或按需定格**：全 Vapor，或长期保持混合——两者都是受支持的稳态。

## 7. 生态兼容性检查点

升级前重点核对三类依赖：

| 检查点 | 风险 | 说明 |
| --- | --- | --- |
| 依赖 `getCurrentInstance` 的库 | 高 | 该 API 在 Vapor 组件中不可用，部分重型组件库（如 Vuetify 的部分能力）曾受影响 |
| 手写 render 函数 / h() 的组件 | 中 | 需要改造为模板或确认 Vapor 下的等价写法 |
| 常规模板组件（含 UI 库组件） | 低 | 模板写法完全兼容，组件库升级到适配版本即可 |

实践建议：升级前用 `npm ls` 梳理直接依赖，逐个查其 issue 区与更新日志中的 "vapor" 关键词；先在次要项目验证，再推进生产。

## 8. 本地体验方式

RC 阶段（不用于生产）想提前感受 Vapor，最小路径是：

```bash
# 安装 3.6 RC 线（tag 以官方 dist-tags 输出为准）
npm install vue@rc
```

再按 Vue 官方文档"Vapor / Compilation Mode"章节在 Vite 配置中为个别组件开启 vapor 编译。验证点：页面行为与虚拟 DOM 模式完全一致；用 DevTools Timeline 对比高频更新组件的渲染耗时。体验后切回 `vue@latest`（3.5 稳定线）即可，注意 lockfile 回滚。

## 9. 常见问题

**Vapor 稳定后需要重写现有应用吗？**
不需要。虚拟 DOM 模式在 3.6 中仍是完整支持的一等公民，存量应用可以永远不启用 Vapor；它是可选的编译优化，不是破坏性迁移。

**学习 Vue 3 应该等 Vapor 吗？**
不应该。组件 API 与生态知识完全通用，现在学的 `<script setup>`、响应式、路由、Pinia 在 Vapor 时代原样有效。等稳定版发布后只需补读一篇"如何启用"的文章。

**Vapor 会让 Svelte 的卖点失效吗？**
部分成立。Svelte 的差异化从"编译时 vs 运行时"收窄为生态、语法与全栈框架（SvelteKit 对 Nuxt）之争，详见 [Svelte 精要与 Vue 对照](/vue3/390-SvelteVsVueComparison)。

## 10. 小结

1. Vapor 是 Vue 3.6 的核心：编译期直接生成 DOM 操作，跳过 VNode 创建与 diff。
2. 组件编程模型不变：`ref`、`<script setup>`、defineModel 等全部通用，学习投入不贬值。
3. 收益集中在大组件树与高频更新场景，不是全场景加速。
4. 采取"升级不启用 -> 试点 -> 扩大 -> 定格"的渐进路径，重点排查 `getCurrentInstance` 依赖。
5. 版本状态与时间线以官方 Releases 页为准，生产项目在稳定版发布前继续用 3.5.x。
