---
order: 110
title: 组件基础与通信
module: 'vue3'
category: 前端技术
difficulty: intermediate
description: 单一主题：SFC、defineProps（含 3.5 响应式解构）、defineEmits、attrs 透传、defineOptions 与组件通信总览——组件如何定义、如何对话
author: fanquanpp
updated: '2026-10-07'
related:
  - 'vue3/115-SlotInDepth'
  - 'vue3/045-FormBindingVModel'
  - 'vue3/145-DynamicComponentPatterns'
  - 'vue3/170-ProvideInject'
prerequisites:
  - 'vue3/050-ReactiveSystem'
---

## 知识点地图

- **知识类别**：Vue 3 / 组件基础（官方文档 Components In-Depth 的地基部分）。
- **解决什么问题**：组件是 Vue 应用的积木——**怎么定义一块积木（SFC）、它对外暴露什么接口（props/emits/attrs）、积木之间怎么对话（通信）**。接口定义不清是组件库与业务组件一切混乱的源头。
- **什么时候用到**：写第一个业务组件；封装可复用组件；评审组件 API 设计。
- **边界声明**：本篇由旧版"组件系统"收窄重写。插槽迁至[插槽与内容分发](/vue3/115-SlotInDepth)；生命周期归[生命周期钩子](/vue3/070-LifecycleHook)；动态/递归/函数式组件见[动态组件与函数式组件](/vue3/145-DynamicComponentPatterns)；组件 v-model 见[表单绑定与组件 v-model](/vue3/045-FormBindingVModel)。

## 心智模型：组件是一份"接口契约"

```text
父组件 ──props（数据下行）──► 子组件
父组件 ◄──events（事件上行）── 子组件
父组件 ──slots（内容定制）──► 子组件        → 详见插槽篇
子组件 ──expose（受控暴露）──► 父组件的 ref  → 详见响应式系统篇
祖先 ──provide/inject（跨层注入）──► 后代    → 详见 Provide/Inject 篇
```

契约纪律一句话：**数据只往下、事件只往上**；违反单向流的双向耦合（子在子改 props）是组件腐化的起点。

## 单文件组件（SFC）与 script setup

```vue
<!-- UserCard.vue：结构/逻辑/样式三段式 -->
<script setup lang="ts">
import { computed } from 'vue'

// 声明式接口：props 进、事件出
const props = defineProps<{ name: string; level: number }>()
const emit = defineEmits<{ follow: [name: string] }>()

const title = computed(() => `Lv.${props.level} ${props.name}`)
</script>

<template>
  <div class="user-card">
    <h3>{{ title }}</h3>
    <button @click="emit('follow', props.name)">关注</button>
  </div>
</template>

<style scoped>
.user-card { border: 1px solid #ddd; }
</style>
```

`<script setup>` 是编译器语法糖：顶层变量自动暴露给模板、组件自动注册、性能更好（静态提升直接作用于它）。需要 `name`（递归/DevTools）或关闭 attrs 透传等"组件选项"时用 `defineOptions` 宏：

```ts
defineOptions({
  name: 'UserCard',        // DevTools 显示名 / 递归组件引用名
  inheritAttrs: false,     // 关闭 attrs 自动透传（见下文透传节）
})
```

## props：defineProps 与验证

```ts
// 运行时声明：类型即校验器，可带默认值与必填
const props = defineProps({
  name: { type: String, required: true },
  level: { type: Number, default: 1 },
  tags: { type: Array as PropType<string[]>, default: () => [] },  // 对象默认值必须工厂函数
})

// 泛型声明（推荐）：纯类型，编译器生成等价运行时代码
const props = defineProps<{ name: string; level?: number }>()
```

**Vue 3.5+ 的响应式 props 解构**——解构后的变量仍是响应式的（编译器转译成 props.x 访问），默认值直接写在解构默认值里：

```ts
const { name, level = 1, tags = [] } = defineProps<{
  name: string
  level?: number
  tags?: string[]
}>()
// 模板与脚本里直接用 name/level——值变化时依赖它的 computed/watch 正常触发
```

两条 props 纪律：**单向数据流**（子组件不写 props——需要"改"就 emit 或用本地副本 computed 的 get/set 包一层）；**对象与数组默认值必须是工厂函数**（`default: () => []`），共享引用会让所有组件实例共用同一数组。

## emits：defineEmits 与事件验证

```ts
// 泛型写法：事件名与载荷类型一体化
const emit = defineEmits<{
  follow: [name: string]
  change: [value: string, old: string]
}>()

emit('follow', props.name)
emit('change', newVal, oldVal)   // 多参数载荷用元组声明
```

事件验证的价值在**可读与可查**：未声明的 emit 在运行时警告（开发期），类型系统在使用方 `@follow` 处给出回调参数提示。命名用 kebab-case 触发（`@follow-me`）或 camelCase（`@followMe`）皆可，模板里统一风格即可。

## attrs 透传：看不见的第三条通道

父组件传了**子组件没声明为 props** 的属性（class、id、data-*、事件）会进入 `$attrs`，默认自动落到子组件**根元素**上：

```vue
<!-- 父组件 -->
<MyInput class="large" id="name-input" data-test="username" @focus="onFocus" />
```

```vue
<!-- MyInput.vue（单根组件）：class/id/data-test/@focus 全部自动落在 <input> 上 -->
<template>
  <input />
</template>
```

三个必须掌握的开关：

```vue
<script setup lang="ts">
// 1. 关闭自动透传：多根组件（会警告"无法确定落点"）或要手动控制落点时
defineOptions({ inheritAttrs: false })

// 2. 手动指定落点（绑定到内层 input 而不是根 div）
const attrs = useAttrs()
</script>

<template>
  <div class="field">
    <label>用户名</label>
    <input v-bind="attrs" />   <!-- class/id/事件一次性转发到真正该接收的元素 -->
  </div>
</template>
```

```ts
// 3. useAttrs 是非响应式的快照读取——响应式追踪用计算属性或 watchEffect
import { useAttrs, watchEffect } from 'vue'
const attrs = useAttrs()
watchEffect(() => console.log('class 变了:', attrs.class))   // 变化可被追踪
```

组件库封装 input/select 时这是核心技巧：**业务方写的 placeholder/disabled 应该落在真正的 input 上，而不是组件的根 div 上**——透传就是让"用了像没用封装"的机制。

## 组件通信总览：按距离选通道

| 距离 | 通道 | 一句话 |
| --- | --- | --- |
| 父 → 子 | props | 数据下行，声明即契约 |
| 子 → 父 | emits | 事件上行，声明载荷类型 |
| 父 ↔ 子 | v-model / defineModel | 特殊的双向语法糖（见[表单绑定](/vue3/045-FormBindingVModel)） |
| 父 → 子 | 模板引用 + defineExpose | 命令式调用子组件方法（见[响应式系统](/vue3/050-ReactiveSystem)） |
| 祖先 → 后代 | provide / inject | 跨层注入，跳过中间层（见[Provide 与 Inject](/vue3/170-ProvideInject)） |
| 任意 | Pinia | 全局状态（见 [Pinia](/vue3/210-PiniaStateManagementDetailed)） |

选型红线：**两层以内用 props/emits，三层以上想 inject 或状态提升，跨页面共享上 Pinia**。props 钻透（prop drilling）超过三层还硬传，是"该上 provide/Pinia"的信号而不是"该多写几个中转 props"的信号。

## 组件设计原则（评审清单）

1. **单一职责**：一个组件只回答一个问题；超过 300 行/混合"取数 + 布局 + 交互"就拆；
2. **props 面窄**：必填项越少越好，能从上下文推导的不进 props；
3. **命名即文档**：多词组件名（`UserCard` 不是 `Card`）、事件用动词（`save`/`change`/`remove`）；
4. **可复用与可维护的平衡**：为"第二处使用"抽象，不为"可能的未来"抽象；
5. **性能默认正确**：列表 key、合理拆分让更新范围最小（手段见[性能实践](/vue3/320-Vue3PerformancePractice)）。

## 动手实践：做一个规范的表单控件组件

任务：

1. 写 `AppSelect.vue`：props 收 options/value，emits 发 change，attrs 透传到原生 select（placeholder、id、事件落在真元素上）；
2. 加 v-for 渲染 option 与选中态回显，父组件用 `v-model` 接（提示：defineModel）；
3. 用 `defineOptions({ inheritAttrs: false })` + `v-bind="$attrs"` 实现"传 class 到根容器、传 placeholder 到 select"的分流；
4. 故意在子组件里写 `props.value = x`，观察控制台警告，理解单向数据流的防线；
5. （3.5 实验）用响应式 props 解构写默认值，父组件不传该 prop 时验证默认值生效且响应式成立。

<details>
<summary>参考实现（先自己写再展开）</summary>

```vue
<!-- AppSelect.vue -->
<script setup lang="ts">
interface Option { label: string; value: string }

defineOptions({ name: 'AppSelect', inheritAttrs: false })

const props = defineProps<{ options: Option[] }>()
const model = defineModel<string>({ required: true })

const attrs = useAttrs()
</script>

<template>
  <div class="app-select" :class="$attrs.class">
    <select v-model="model" v-bind="{ ...attrs, class: undefined }">
      <option v-for="o in props.options" :key="o.value" :value="o.value">
        {{ o.label }}
      </option>
    </select>
  </div>
</template>

<!-- 父组件 -->
<AppSelect
  v-model="city"
  class="wide"
  :options="[{ label: '杭州', value: 'hz' }]"
  placeholder="选择城市"
  @focus="onFocus"
/>
```

判读要点：`class` 要留在根容器上、其余 attrs 落在 select 上，所以绑定 `{ ...attrs, class: undefined }` 把 class 从转发列表里剔除（根容器用 `$attrs.class` 单独接）——这是透传分流的完整形态。
</details>

## 检验清单

- 能说出组件通信的五条通道与各自的距离定位，并给"三层以上 props 钻透"开出正确的处方；
- 能写出运行时与泛型两种 defineProps，并解释对象默认值为何必须工厂函数；
- 会用 3.5+ 响应式 props 解构写默认值，并知道它是编译器转译而非普通解构；
- 能用 inheritAttrs/useAttrs 实现透传分流（class 到根、其余到真元素）；
- 能背出五条组件设计原则并应用于评审。

<!-- 恢复自 cnt-content/full/009-vue3/240-Vue3AdvancedComponentFeature.md（实施前 HEAD 62c90663 版本）；拆分时该小节未随迁，2026-10-07 内容保全复核恢复 -->

## 高级组件使用建议


- **动态组件**：用于根据条件渲染不同的组件
- **异步组件**：用于按需加载大型组件，提高初始加载性能
- **递归组件**：用于树形结构等递归场景
- **函数式组件**：用于无状态、纯展示的组件
- **插槽**：用于组件内容的定制化
- **provide/inject**：用于组件间的依赖注入
- **错误边界**：用于捕获和处理组件错误


## 下一步

- [插槽与内容分发](/vue3/115-SlotInDepth)：内容层面的定制通道；
- [Provide 与 Inject](/vue3/170-ProvideInject)：跨层注入的完整规则与类型安全；
- [动态组件、递归组件与函数式组件](/vue3/145-DynamicComponentPatterns)：组件形态的进阶模式。

## 参考与致谢

- Vue 官方文档 Components In-Depth：Props / Events / Fallthrough Attributes（CC BY-NC-SA 4.0，要点对照并重写组织）：<https://vuejs.org/guide/components/props.html>
- 本篇由旧版"组件系统"收窄重写，透传/defineExpose 素材承接自旧篇第二系列，行为已对照 Vue 3.5 官方文档核校。
