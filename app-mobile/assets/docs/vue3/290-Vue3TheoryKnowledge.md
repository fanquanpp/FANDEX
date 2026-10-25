---
order: 280
title: 虚拟 DOM 与 diff 算法
module: 'vue3'
category: 前端技术
difficulty: intermediate
description: 单一主题：为什么需要虚拟 DOM、Vue3 diff 的五步流程与最长递增子序列、与 React 的对照——响应式原理归 050、编译优化归 280
author: fanquanpp
updated: '2026-10-07'
related:
  - 'vue3/050-ReactiveSystem'
  - 'vue3/280-Vue3CompileOptimization'
  - 'vue3/295-RenderFunctionH'
prerequisites:
  - 'vue3/050-ReactiveSystem'
---

## 知识点地图

- **知识类别**：Vue 3 / 渲染机制理论（虚拟 DOM 与 diff 这一层）。
- **解决什么问题**：直接操作 DOM 贵在"每次读写都可能触发重排"；虚拟 DOM 用 JS 对象描述界面，diff 算出最小变更集再一次性 patch。理解这条链路，才能解释"为什么 key 不能用 index"、"为什么大列表要虚拟滚动"、"Vapor 模式省掉了什么"。
- **什么时候用到**：面试深水区；性能优化的原理依据；读懂渲染函数与编译产物。
- **边界声明**：本篇由旧版"理论知识点"收窄。响应式原理（defineProperty 到 Proxy 的演进）已归[响应式系统](/vue3/050-ReactiveSystem) §1.1；编译优化（静态提升/PatchFlag/Block 树）归[编译优化](/vue3/280-Vue3CompileOptimization)。本篇只讲虚拟 DOM 与 diff。

## 心智模型：双树与最小变更集

```text
模板/render ──执行──► 新 vnode 树
                        │
旧 vnode 树 ──diff 对比──┴──► 补丁列表（增/删/移/改属性）──► 最小化真实 DOM 操作
```

虚拟 DOM 是真实 DOM 的 JS 对象表示。JS 对象操作（纳秒级）比 DOM 操作（可能触发重排重绘，微秒到毫秒级）便宜几个量级，所以"先在 JS 里比清楚，再一次性动 DOM"是划算的——**前提是 diff 本身也要便宜**，这就是算法层的设计空间。

## diff 五步：头尾同步 + LIS

新旧子节点列表对比（有 key 的列表 diff）分五步：

```text
旧: [A, B, C, D, E, F, G]
新: [A, B, F, C, D, E, H, G]
```

1. **从头同步**：A、B 相同，遇到 C 不等于 F 停止；
2. **从尾同步**：G、E？不对——从尾是 G 相同、再往前 E 与 H 不同即停（尾部相同的节点直接复用）；
3. **挂载新增**：若旧列表先耗尽，新列表剩余节点全部挂载（如尾部追加的场景）；
4. **卸载移除**：若新列表先耗尽，旧列表剩余节点全部卸载（如列表缩短的场景）；
5. **未知序列用 LIS**：中间乱序部分——这是算法的核心，见下节。

日常 80% 的列表操作（尾部追加、头部截断）被前三步以 O(n) 解决，只有真正的乱序重排才进入第五步。

## 核心算法：最长递增子序列（LIS）最小化移动

```text
中间乱序部分：
旧: [C, D, E, F]
新: [F, C, D, E]

第一步：给新节点建立 key→索引 映射：F->0, C->1, D->2, E->3
第二步：把旧节点序列翻译成"在新列表中的位置"：[1, 2, 3, 0]（C 在新列表第 1 位，D 第 2 位...）
第三步：求该序列的最长递增子序列：[1, 2, 3]（对应 C、D、E）
结论：C、D、E 的相对顺序没变 → 它们原地不动，只把 F 移到开头 —— 1 次 DOM 移动
```

为什么 LIS 是正确的贪心：递增子序列里的节点**相对顺序保持不变**，它们一个都不用动；不在子序列里的节点逐个移动到位。LIS 求的是"最大的不动集合"，等价于"最小的移动次数"。

key 在这里的角色：没有 key（或用 index 当 key），新旧节点的对应关系只能按位置猜——列表头部插入一项时，index 当 key 会让所有节点"内容都变了"，触发全量更新甚至输入框串位。**key 必须是稳定的业务标识**（id），这是 diff 算法对模板层的要求。

## 与 React diff 的对照

| 特性 | Vue 3 | React |
| --- | --- | --- |
| 比较策略 | 同层比较 + 头尾双端预处理 | 单端递归比较 |
| 列表移动 | LIS 最小化移动 | 依次移动（可能多于最优） |
| 更新时机 | 依赖收集精确到组件，异步队列去重 | setState 触发子树重渲（ Fiber 可中断调度） |
| key 的作用 | 复用判断 + 移动判断 | 复用判断 |

关键差异的根源：Vue 有响应式依赖收集，**知道"谁变了"**，重渲范围天然小；React 靠"组件状态变了就重渲子树"，依赖 memo/manual 对比。两边都在同层比较（跨层移动视为删+建），所以**把可移动的节点放在同一层列表里**是两个框架共同的优化纪律。

## 编译辅助：diff 之前就把"不会变的"排除

diff 之前 Vue 3 的编译器已经做了两件减负事——静态提升（纯静态节点只创建一次）与 PatchFlag/Block 树（diff 直接抄"动态节点名单"，跳过全部静态节点）。这三板的机制与产物分析在[编译优化](/vue3/280-Vue3CompileOptimization)专篇，本篇只需知道因果：**编译器把"diff 什么"的名单提前算好，运行时的 diff 因此可以忽略静态内容**。

## 与渲染函数的关系

[渲染函数与 h()](/vue3/295-RenderFunctionH) 产出的就是这里的 vnode；理解 diff 后再看 h() 的子节点数组（为什么要 key、为什么数组是幂等 diff 的单位）会完全透明。

## 动手实践：看见 diff 的行为

任务：

1. 渲染一个 1000 行列表，用 Vue DevTools 的组件渲染高亮验证"尾部追加只更新新增行"；
2. 把 key 从 id 换成 index，在列表**头部**插入一项，观察输入框内容串位（经典 key 反例）；
3. 用 `performance.mark/measure` 或 DevTools 火焰图对比"1000 行乱序重排"在 index-key 与 id-key 下的耗时差；
4. （原理实验）在 render 函数里返回不带 key 的同构 vnode 数组，然后交换两项顺序，观察控制台行为与 DOM 是否被复用。

<details>
<summary>参考实现（先自己写再展开）</summary>

```vue
<script setup lang="ts">
import { ref } from 'vue'

interface Row { id: number; text: string; note: string }
const rows = ref<Row[]>(
  Array.from({ length: 1000 }, (_, i) => ({ id: i, text: `行 ${i}`, note: '' }))
)

function unshiftRow() {
  rows.value.unshift({ id: Date.now(), text: '新行', note: '' })
}
</script>

<template>
  <!-- 任务 2/3：把 :key="row.id" 换成 :key="i" 再试头部插入 -->
  <button @click="unshiftRow">头部插入</button>
  <ul>
    <li v-for="(row, i) in rows" :key="row.id">
      {{ row.text }}
      <!-- 每行放一个可输入框：index-key 时输入会"留在行位置"而不是跟着数据走 -->
      <input v-model="row.note" />
    </li>
  </ul>
</template>
```

判读要点：任务 2 的串位机制——index 当 key 时，头部插入后"位置 0 的 key 还是 0"，diff 认为位置 0 的节点没变、只是文本变了，于是复用了旧 DOM（含你的输入内容），而数据已经整体后移一位。id-key 下新行是全新节点，旧行靠 id 精确复用。
</details>

## 检验清单

- 能画出"render → vnode → diff → patch"的链路并说出虚拟 DOM 的收益前提；
- 能复述 diff 五步与每步覆盖的列表操作形态；
- 能解释 LIS 如何最小化移动，并推导一个四元素乱序的移动次数；
- 能解释 index 当 key 导致输入框串位的完整因果链；
- 能对照 React 说出两者的 diff 差异与根源（依赖收集 vs 子树重渲）。

## 下一步

- [编译优化](/vue3/280-Vue3CompileOptimization)：diff 名单是怎么在编译期算好的；
- [响应式系统](/vue3/050-ReactiveSystem)：更新从哪个属性变化开始（含 §1.1 响应式原理演进）；
- [渲染函数与 h()](/vue3/295-RenderFunctionH)：亲手产出 vnode。

## 参考与致谢

- Vue 官方文档 Rendering Mechanism（CC BY-NC-SA 4.0，要点对照并重写组织）：<https://vuejs.org/guide/extras/rendering-mechanism.html>
- vue-core 源码 renderer.ts 的 LIS 实现（MIT，本篇 LIS 示例为自行推演）：<https://github.com/vuejs/core>
- 本篇 diff 五步/LIS/React 对照内容承接自旧篇 290 并修复（原文件头部损坏的代码块已按语义重建）。
