---
order: 290
title: 渲染函数与 h()
module: 'vue3'
category: 前端技术
difficulty: beginner
description: 在虚拟 DOM 理论之上动手写 render：h() 参数与 vnode 结构、动态组件与函数式组件的 render 实现、模板何时该换 render、JSX 简述——表格列渲染器与动态表单两个工程场景
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：Vue 3 / 深入渲染机制（官方文档 Render Function 章节）。
- **解决什么问题**：模板语法覆盖 95% 的场景，剩下 5%——**结构在运行时才确定**（按 schema 生成表单、按列配置渲染表格、递归渲染任意嵌套的树）时，模板的静态结构反成束缚。渲染函数让你直接产出 vnode，用纯 JS 的表达能力处理动态结构。
- **什么时候用到**：动态表单生成器、表格列渲染器、组件库的底层封装、从模板编译产物学习 Vue 原理。
- **前置阅读**：[虚拟 DOM 与 diff 算法](/vue3/290-Vue3TheoryKnowledge)（h() 产出的 vnode 就是 diff 的输入）；与[动态组件、递归组件与函数式组件](/vue3/145-DynamicComponentPatterns)互为表里——那边讲"何时用这些组件形态"，本篇讲"用 render 怎么实现"。

## 心智模型：模板是编译期，render 是运行时

```text
.vue 模板 ──编译器──► render 函数（编译产物就是 h() 调用树）──► vnode 树 ──► diff/patch ──► 真实 DOM

手写 render = 跳过"写模板"这一步，直接写编译产物
```

两个推论：

1. 模板能表达的 render 都能表达（它就是编译目标）；render 能表达的模板不一定（运行时分支、动态组件类型、任意嵌套）；
2. 写 render 的成本是**放弃模板的编译期优化**（[编译优化](/vue3/280-Vue3CompileOptimization)的静态提升/PatchFlag 只在编译模板时生成）——手写 vnode 全部按动态处理。这是"能不用就不用"的根本原因。

## h() 的参数与 vnode 结构

```ts
import { h } from 'vue'

// h(类型, props/attrs, 子节点)
const vnode = h(
  'div',                                  // 1. 标签字符串 | 组件对象 | 异步组件
  {                                       // 2. props 对象（可省略）
    id: 'box',
    class: ['a', { b: true }],            // class/style 支持数组/对象/嵌套
    style: { color: 'red' },
    onClick: () => console.log('clicked'),// on 开头即事件监听（onClick/onInput）
    someProp: 123,                        // 组件的 props / 未声明的变 attrs
  },
  [                                       // 3. 子节点：字符串 | vnode 数组 | 插槽对象
    h('span', 'hello'),
    h('em', 'world'),
  ]
)
```

子节点三种形态的判别：

```ts
h('div', '纯文本')                    // 字符串 = 文本子节点
h('div', [h('span'), h('span')])      // 数组 = 子 vnode 列表（唯一组件根约束仍适用）
h(Comp, null, {                       // 对象 = 插槽（对应模板里的 slot 内容）
  default: () => '默认插槽内容',
  header: () => h('h1', '标题'),      // 作用域插槽：(props) => vnode
  footer: (slotProps) => h('p', slotProps.x),
})
```

组件的 render 写法（`<script setup>` 里 `return h(...)` 之外的形态是 setup 返回函数）：

```vue
<script>
import { h } from 'vue'

export default {
  props: ['level'],
  setup(props, { slots, attrs, emit }) {
    // setup 返回渲染函数（替代 template）
    return () => h(`h${props.level}`, attrs, slots)
    // 注意：返回的是 () => vnode 函数，不是 vnode 本身——
    // 每次重渲染重新调用，才能拿到最新 props
  },
}
</script>
```

常见错误：setup 直接 `return h(...)`——返回了**一次性** vnode，props 变化后界面不更新。记住**返回渲染函数**（`() => h(...)`），这是 render 写法第一大坑。

## 场景一：动态表单生成器（按 schema 渲染）

需求：后台的"自定义问卷"功能——表单结构存在数据库里，前端按 JSON schema 渲染：

```ts
interface FieldSchema {
  type: 'input' | 'select' | 'checkbox'
  prop: string
  label: string
  options?: { label: string; value: string }[]
}

// DynamicForm.vue
<script setup lang="ts">
import { h, useModel } from 'vue'

const props = defineProps<{ schema: FieldSchema[]; modelValue: Record<string, unknown> }>()
const emit = defineEmits<{ 'update:modelValue': [Record<string, unknown>] }>()

function renderField(f: FieldSchema) {
  const on = {
    'onUpdate:modelValue': (v: unknown) =>
      emit('update:modelValue', { ...props.modelValue, [f.prop]: v }),
  }
  switch (f.type) {
    case 'input':
      return h('div', { class: 'field' }, [
        h('label', f.label),
        h('input', { ...on, value: String(props.modelValue[f.prop] ?? '') }),
      ])
    case 'select':
      return h('div', { class: 'field' }, [
        h('label', f.label),
        h('select', on, (f.options ?? []).map(o =>
          h('option', { value: o.value }, o.label))),
      ])
    case 'checkbox':
      return h('label', { class: 'field' }, [
        h('input', { type: 'checkbox', ...on, checked: Boolean(props.modelValue[f.prop]) }),
        f.label,
      ])
  }
}
</script>

<template>
  <component :is="() => schema.map(renderField)" />
</template>
```

为什么这个场景值得 render：schema 的字段数量、类型、选项全是**运行时数据**——模板要靠 `v-if` 链穷举控件类型，render 里就是一个 `switch`。逐段讲解：

- `onUpdate:modelValue` 是 `v-model` 的编译后形态（见[表单绑定](/vue3/045-FormBindingVModel)的语法糖展开）——render 里事件名一律用编译后形态；
- `emit('update:modelValue', { ...旧值, [字段]: 新值 })`：整体替换对象触发响应式，比原地改属性更可靠；
- 模板里用 `<component :is="() => schema.map(renderField)">` 是"在 SFC 里嵌入 render"的实用桥——`:is` 接受函数式组件，函数体就是渲染逻辑，模板负责外层布局。

## 场景二：表格列渲染器（类型化列配置）

需求：ProTable 类组件的列配置里，某些列要自定义渲染（状态徽标、操作按钮），列配置是 TS 对象数组：

```ts
interface Column<T> {
  key: keyof T & string
  title: string
  render?: (row: T) => ReturnType<typeof h>   // 可选的自定义渲染
}

function useColumns() {
  const columns: Column<{ name: string; status: 'on' | 'off' }>[] = [
    { key: 'name', title: '歌姬' },
    {
      key: 'status', title: '状态',
      render: (row) => h('span',
        { class: ['badge', row.status === 'on' ? 'green' : 'gray'] },
        row.status === 'on' ? '启用' : '停用'),
    },
  ]
  return columns
}
```

表格组件内部对每格调用 `col.render?.(row) ?? row[col.key]`——**配置里带渲染逻辑**，这正是 render 函数的舒适区（配置对象里放不了模板字符串，放 JSX/函数才顺）。

## 动手三：函数式组件与动态组件的 render 实现

```ts
// 函数式组件：本质就是"一个渲染函数"，无实例、无状态、开销最小
import { h, type FunctionalComponent } from 'vue'

const Badge: FunctionalComponent<{ text: string; type?: 'ok' | 'warn' }> =
  (props, { slots }) =>
    h('span', { class: `badge ${props.type ?? 'ok'}` }, slots.default?.() ?? props.text)
Badge.props = ['text', 'type']
```

```ts
// 动态组件的 render 形态：h() 第一个参数直接放组件对象/名称
import CompA from './A.vue'
import CompB from './B.vue'

const maps = { a: CompA, b: CompB }
const current = maps[tab.value]
return () => h(current, { size: 'large', onOk: handleOk })
// 等价于模板的 <component :is="current" size="large" @ok="handleOk">
```

函数式组件适合"纯输入纯输出"的展示件（徽标、图标、文本装饰）；带内部状态的组件老实用 `<script setup>`。函数式组件的完整适用条件与 145 篇的递归组件场景互为表里。

## JSX 简述

```tsx
// 需要 @vitejs/plugin-vue-jsx；语法近似 React JSX
const App = () => (
  <div class="box">
    <h1 onClick={handle}>标题</h1>
    <Badge text="新" type="warn">角标</Badge>
  </div>
)
```

JSX 与 h() 是同一件事的两种语法糖（JSX 编译成 h 调用），选型完全按口味：**纯 TS 项目/深度 render 场景（类 React 背景团队）选 JSX；普通 Vue 项目偶发动态结构用 `<component :is="() => ...">` 桥接**，不为 5% 的场景引入 JSX 工具链。

## 何时该用 render 而非模板（决策清单）

```text
选模板（默认）：
  - 结构在编译期可知；团队以 SFC 协作为主；需要编译器优化与 DevTools 模板调试
选 render/JSX：
  - 结构由运行时数据决定（schema 驱动、列配置、任意深度递归）
  - 在 TS 配置对象里写渲染逻辑（ProTable 列、路由菜单渲染）
  - 封装组件库底层（一个函数产出多种 vnode 形态）
信号：模板里 v-if 链超过四层、或开始拼接字符串模板 —— 该换 render 了
```

## 常见困惑

**"手写 render 会失去编译优化吗？"**——会。静态提升、PatchFlag、Block 树都来自模板编译（见[编译优化](/vue3/280-Vue3CompileOptimization)）；手写 vnode 按"全动态"处理。性能敏感的热点组件优先保模板，render 只用于模板表达不了的结构。

**"v-if/v-for 在 render 里怎么写？"**——就是 JS 本身：`cond ? h(A) : h(B)`、`list.map(x => h(Item, { item: x }))`。v-show 对应 `style: { display: cond ? '' : 'none' }`。

**"插槽在 render 里必须写成函数吗？"**——是。插槽编译后就是 `(props) => vnode` 的函数（延迟执行才能拿到最新作用域数据），直接传 vnode 数组会失去响应性更新。

## 动手实践：从模板翻译到 render

任务：

1. 写一个模板版 `<HLevel level="3">` 组件（渲染 h3 标题 + 默认插槽），再翻译成 setup 返回渲染函数的版本，验证 props 变化（level 3 改 1）两版都正确更新；
2. 实现动态表单生成器：schema 含 input/select/checkbox 各一，验证父组件 `v-model` 收到的对象字段齐全；
3. 把表格列渲染器接到一个 5 行的本地数组上，验证徽标列渲染与 sort 后仍正确（检验 render 里闭包变量的正确性）；
4. 用函数式组件实现 Badge，统计它在 1000 行列表里的渲染耗时，与 `<script setup>` 版对比（理解"无实例"的开销差异量级）；
5. （陷阱实验）把 setup 的返回值从 `() => h(...)` 改成 `h(...)`，改变 props 观察界面是否更新，读出原因。

<details>
<summary>参考实现（先自己写再展开）</summary>

```ts
// 1
// HLevel.vue
<script setup lang="ts">
import { h } from 'vue'
const props = defineProps<{ level: 1 | 2 | 3 | 4 }>()
</script>
<template>
  <component :is="`h${props.level}`"><slot /></component>
</template>

// render 版（等价）
export default {
  props: { level: { type: Number, required: true } },
  setup(props, { slots }) {
    return () => h(`h${props.level}`, slots.default?.())
  },
}

// 2 的使用侧
const form = ref<Record<string, unknown>>({})
// <DynamicForm v-model="form" :schema="schema" />
// 提交时检查 Object.keys(form.value) 覆盖 schema 的全部 prop

// 5 的现象：props.level 从 3 改为 1 后界面不变——
// return h(...) 只在 setup 执行时求值一次，之后不再重渲染；
// return () => h(...) 每次重渲染都重新调用拿到新 props。
</script>
```

判读要点：任务 5 是 render 写法的第一坑，修复后用 Vue DevTools 的组件 inspector 观察 render 组件没有模板调试信息——这就是"放弃编译器"的体感。
</details>

## 检验清单

- 能画出"模板 → 编译器 → render → vnode → diff → DOM"的链路并说明手写 render 跳过与失去了什么；
- 能背出 h() 三参数的形态与子节点的三种类型（文本/vnode 数组/插槽对象）；
- 能解释"setup 必须返回渲染函数而不是 vnode"的原因（任务 5 的实验结论）；
- 能为 schema 驱动表单与列配置渲染两个场景分别写出 render 实现；
- 能说出函数式组件与 `<script setup>` 组件的取舍，以及 JSX 与 h() 的关系。

## 下一步

- [动态组件、递归组件与函数式组件](/vue3/145-DynamicComponentPatterns)：这些组件形态的应用场景全集；
- [虚拟 DOM 与 diff 算法](/vue3/290-Vue3TheoryKnowledge)：h() 产出的 vnode 如何被 diff 消化；
- [编译优化](/vue3/280-Vue3CompileOptimization)：模板编译器给了手写 render 什么。

## 参考与致谢

- Vue 官方文档 Render Function 章节（CC BY-NC-SA 4.0，要点对照并重写组织）：<https://vuejs.org/guide/extras/render-function.html>
- @vitejs/plugin-vue-jsx 官方文档（MIT）：<https://github.com/vitejs/vite-plugin-vue/tree/main/packages/plugin-vue-jsx>
- 本篇场景代码为原创工程实践，h() 行为已对照 Vue 3 官方文档核校。
