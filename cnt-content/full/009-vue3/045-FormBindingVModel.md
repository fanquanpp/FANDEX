---
order: 50
title: 表单绑定与组件 v-model
module: 'vue3'
category: 前端技术
difficulty: beginner
description: text/select/checkbox/radio 各自的绑定语义、.lazy/.number/.trim 修饰符、组件 v-model 与 defineModel（3.4+）、多 v-model 参数——后台表单与设置页实战
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：Vue 3 / 表单输入绑定（官方文档 Form Input Bindings 章节）+ 组件双向绑定。
- **解决什么问题**：表单是后台管理系统的主体：文本、下拉、多选、开关各有各的值形态（字符串/数组/布尔），`v-model` 把"监听事件 + 回写变量"打包成一条指令；自定义组件（日期选择器、开关）要被 `v-model` 使用时，需要组件自己实现协议。
- **什么时候用到**：后台管理表单、设置页、筛选栏、任何"控件值与状态双向同步"的场景。
- **本篇承接**：[指令系统](/vue3/040-Vue3DirectiveSystem) 2.5 节的表单绑定内容迁入本篇扩展成篇。

## 心智模型：v-model 是语法糖

```html
<input v-model="text">
<!-- 等价展开 -->
<input :value="text" @input="text = $event.target.value">
```

`v-model` = **绑值** + **监听对应事件并回写**。不同控件的事件与值形态不同，这解释了所有"怪行为"：

| 控件 | 绑定属性 | 监听事件 | 值形态 |
| --- | --- | --- | --- |
| text / textarea | value | input | string |
| checkbox（单个） | checked | change | boolean |
| checkbox（多个） | checked | change | **string[]**（共享同一 ref） |
| radio | checked | change | 选中项的 value |
| select（单选） | value | change | 选中 option 的 value |
| select（多选） | value | change | **string[]** |

三个易错点全部源于这张表：

1. **多个 checkbox 绑同一数组**：`checkedValues` 必须初始化为 `ref([])`——写成 `ref('')` 时勾选行为是往字符串上追加，永远不对；
2. **radio 靠 value 区分**：`v-model` 绑定的 ref 存的是"选中那个 radio 的 value"，忘写 value 属性则拿到空字符串；
3. **select 的占位项**：`<option value="">请选择</option>` 的空串要与其他 option 的 value 类型一致，比较逻辑才不踩坑。

## 场景一：后台管理的筛选表单（原生控件全家）

```vue
<script setup lang="ts">
import { ref, watch } from 'vue'

const keyword    = ref('')
const status     = ref('')                 // 单选：'' 表示全部
const categories = ref<string[]>([])       // 多选：数组
const onlyVip    = ref(false)              // 开关：布尔
const pageSize   = ref(20)                 // 数字：注意 .number

// 筛选变化触发查询（防抖省略）
watch([keyword, status, categories, onlyVip, pageSize], () => {
  fetchList({ q: keyword.value, status: status.value,
              categories: categories.value, vip: onlyVip.value,
              size: pageSize.value })
})
</script>

<template>
  <input v-model.trim="keyword" placeholder="搜索歌名/作者" />

  <select v-model="status">
    <option value="">全部状态</option>
    <option value="published">已发布</option>
    <option value="draft">草稿</option>
  </select>

  <label v-for="c in ['流行', '电子', '古风']" :key="c">
    <input v-model="categories" type="checkbox" :value="c" /> {{ c }}
  </label>

  <label><input v-model="onlyVip" type="checkbox" /> 仅 VIP 可见</label>

  <select v-model.number="pageSize">
    <option :value="20">20 条/页</option>
    <option :value="50">50 条/页</option>
  </select>
</template>
```

逐段讲解：

- `v-model.trim` 在搜索框上就地清洗首尾空格——`keyword === ''` 的"空搜索"判断从此可靠，不用每个比较都写 `.trim()`；
- `v-model.number` 的**实际行为**：若 `parseFloat` 能解析就转数字，**不能解析时保留原字符串**（输入"abc"不会变成 NaN）。所以别假设它"保证数字"，关键数值仍要校验；
- `:value="c"`（动态绑定）与 `value="c"`（字面量"字符 c"）的区别是表单第一大笔误：静态写法下勾选"流行"存进数组的是字母 c。

## 三个修饰符的准确语义

```html
<input v-model.lazy="bio">      <!-- input 事件改为 change 事件：失焦或回车才同步 -->
<input v-model.number="age">    <!-- 能转数字就转，不能则原样字符串 -->
<input v-model.trim="name">     <!-- 去首尾空格后存入 -->
```

`.lazy` 的正确场景：**重输入成本的校验**（手机号一边输一边校验会中途报错）、性能敏感的超大表单。滥用 `.lazy` 的代价是"父组件里的实时联动失效"（比如输入时实时计数）——它改的是同步时机，不是优化开关。三个修饰符可以组合：`v-model.lazy.trim="title"`。

## 场景二：设置页的自定义开关组件（组件 v-model 协议）

Vue 3 组件上使用 `v-model` 的协议是：接收 `modelValue` prop，发出 `update:modelValue` 事件。

**Vue 3.4+ 的推荐写法：defineModel 宏**

```vue
<!-- ToggleSwitch.vue -->
<script setup lang="ts">
const model = defineModel<boolean>({ required: true })
// 3.4+ 编译器宏：声明一个"双向 prop"，
// 读它就是 modelValue，赋值它就自动 emit update:modelValue
</script>

<template>
  <button
    class="toggle"
    :class="{ on: model }"
    role="switch"
    :aria-checked="model"
    @click="model = !model"
  >
    <span class="knob" />
  </button>
</template>
```

```vue
<!-- 使用方：与原生控件无差别 -->
<ToggleSwitch v-model="settings.autoPlay" />
```

逐段讲解：

- `defineModel` 返回一个**可读可写的 ref**——`model = !model` 一行同时完成"改本地值"与"通知父组件"，把旧写法的 `props.modelValue` + `emit('update:modelValue', ...)` 两步并作一步；
- 3.4 之前的写法仍然合法且值得认识（读懂老代码）：`const props = defineProps<{ modelValue: boolean }>()` + `const emit = defineEmits<{ 'update:modelValue': [boolean] }>()`，然后 `emit('update:modelValue', !props.modelValue)`；
- `required: true` 让漏传 v-model 在开发期报警；开关类组件还可以给默认值：`defineModel<boolean>({ default: false })`。

**为什么组件 v-model 不直接改 prop**：props 是单向数据流——子组件改 prop，父组件的状态与子组件的显示会失同步，且 Vue 会在控制台警告。defineModel 的赋值走的仍是事件回写，单向流的纪律没有被破坏，只是仪式被宏折叠了。

## 场景三：表单卡片的多 v-model 参数

需求：一个"时间范围"组件要同时暴露开始与结束两个值，各自独立双向绑定：

```vue
<!-- DateRangePicker.vue -->
<script setup lang="ts">
const start = defineModel<Date | null>('start', { required: true })
const end   = defineModel<Date | null>('end', { required: true })
</script>

<template>
  <input type="date" :value="start?.toISOString().slice(0, 10)"
         @change="start = ($event.target as HTMLInputElement).valueAsDate" />
  <span>至</span>
  <input type="date" :value="end?.toISOString().slice(0, 10)"
         @change="end = ($event.target as HTMLInputElement).valueAsDate" />
</template>
```

```vue
<!-- 使用方 -->
<DateRangePicker v-model:start="filter.from" v-model:end="filter.to" />
```

命名参数（`v-model:start`）让一个组件承载多个双向值，且每个名字独立——这是 Vue 3 相对 Vue 2（只有一个 value）的最大升级。注意生成的 prop 是 `start`、事件是 `update:start`。

### defineModel 的两个进阶能力

**自定义修饰符**：使用方的 `v-model.capitalize` 会以 `modifiers` 对象暴露给组件，配合解构写法在 set 前加工：

```ts
// 首字母大写修饰符：v-model.capitalize="title"
const [model, modifiers] = defineModel<string>({
  set(value) {
    if (modifiers.capitalize) {
      return value.charAt(0).toUpperCase() + value.slice(1)
    }
    return value
  },
})
```

**local 模式**：`defineModel<string>({ default: '', local: true })`——组件先维护本地副本、**不必等父组件回传**就更新显示，适合父组件不关心每次中间值的场景（拖拽滑杆的中间态）。代价是父组件的值与本地副本可能短暂不一致，强一致需求不要开。

## v-model 与计算属性的组合模式

复杂表单值（格式化货币、拼音联动）用 **可写计算属性** 做中间层，比在每个事件里手工转换干净：

```ts
const rawAmount = ref('')                    // 输入框的原始字符串
const amount = computed({
  get: () => formatCNY(Number(rawAmount.value || 0)),
  set: (v: string) => { rawAmount.value = v.replace(/[^\d.]/g, '') }
})
// 模板：<input v-model="amount"> —— 格式化在 get、清洗在 set，输入框无感
```

这模式还有个类型收窄的隐藏坑：`rawAmount` 是 `ref('')` 推断为 `Ref<string>`，计算属性 get 返回 string 与输入框匹配；若把 get 改成返回 number，模板里 `{{ amount }}` 与校验逻辑的类型都会跟着变——TS 集成的完整类型陷阱见[TypeScript 集成](/vue3/230-TypeScriptIntegration)。

## 动手实践：做一个完整的设置页

任务：

1. 用原生控件搭"通知设置"卡：三个 checkbox（站内信/邮件/短信）绑同一数组 `channels`、一个开关组件绑 `mute`；
2. 实现第 3 节的 ToggleSwitch（defineModel 版），并在旧写法（props + emit）下重写一遍，对比代码量；
3. 给开关加"操作中"防抖：点击后 300ms 内禁止再点（提示：defineModel 的值 + 本地 busy ref 配合）；
4. 实现 DateRangePicker 并验证：父组件 watch `filter.from` 能在子组件改日期时收到变化。

<details>
<summary>参考实现（先自己写再展开）</summary>

```vue
<!-- 1 + 2 -->
<script setup lang="ts">
import { ref, watch } from 'vue'
import ToggleSwitch from './ToggleSwitch.vue'
const channels = ref<string[]>([])
const mute = ref(false)
watch(channels, v => console.log('通知渠道:', v))
</script>
<template>
  <label v-for="c in ['站内信','邮件','短信']" :key="c">
    <input v-model="channels" type="checkbox" :value="c" /> {{ c }}
  </label>
  <ToggleSwitch v-model="mute" />
</template>

<!-- 3 -->
<script setup lang="ts">
const model = defineModel<boolean>({ required: true })
const busy = ref(false)
function toggle() {
  if (busy.value) return
  busy.value = true
  model.value = !model.value
  setTimeout(() => (busy.value = false), 300)
}
</script>
<template>
  <button :disabled="busy" @click="toggle">{{ model ? '开' : '关' }}</button>
</template>
```

判读要点：任务 2 的对比结论——defineModel 把"声明 prop + 声明事件 + emit 调用"三处收敛成一处，这是 3.4+ 项目应默认采用它的理由；任务 3 说明 defineModel 返回的是普通 ref，围绕它的本地状态（busy）照常叠加。
</details>

## 检验清单

- 能背出五类控件的 v-model 展开形态（事件与值形态）并解释多选 checkbox 为什么必须是数组；
- 能说出三个修饰符的准确语义与 `.lazy` 的适用/滥用场景；
- 能用 defineModel 实现单值与多参数（v-model:start）的组件双向绑定，并说出它折叠了哪三处样板；
- 知道组件 v-model 的底层协议（modelValue / update:modelValue）与 props 单向数据流的关系；
- 能用可写计算属性承接"格式化 + 清洗"的表单中间层。

## 下一步

- [插槽与内容分发](/vue3/115-SlotInDepth)：表单布局组件的下一块拼图；
- [组件系统](/vue3/110-ComponentSystem)：props/emits 的完整规则；
- [TypeScript 集成](/vue3/230-TypeScriptIntegration)：defineModel 的类型标注与常见报错。

## 参考与致谢

- Vue 官方文档 Form Input Bindings / Component v-model（CC BY-NC-SA 4.0，译文引用为学习用途并已重写组织）：<https://vuejs.org/guide/essentials/forms.html>
- 本篇表单绑定节承接自 [指令系统](/vue3/040-Vue3DirectiveSystem) 2.5 节并重写扩充，defineModel 语义已对照 Vue 3.4 官方文档核校。
