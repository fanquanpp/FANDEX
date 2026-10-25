---
order: 230
title: TypeScript 集成
module: 'vue3'
category: 前端技术
difficulty: intermediate
description: 教学化重写：defineProps 泛型、组合函数返回类型、模板与 ref 自动解包的类型陷阱、vue-tsc 检查工作流——逐个拆常见类型报错
author: fanquanpp
updated: '2026-10-07'
related:
  - 'vue3/110-ComponentSystem'
  - 'vue3/090-CustomHook'
  - 'vue3/045-FormBindingVModel'
  - 'vue3/210-PiniaStateManagementDetailed'
prerequisites:
  - 'vue3/110-ComponentSystem'
---

## 知识点地图

- **知识类别**：Vue 3 / TypeScript 工程集成。
- **解决什么问题**：Vue 的类型系统有自己的一层：模板表达式要类型检查、ref 在模板里自动解包、props/emits/插槽都有专属声明宏。不看穿这一层，报错信息就像天书——"Type 'Ref<number>' is not assignable to type 'number'"。
- **什么时候用到**：新项目初始化 TS；接手"满屏类型报错"的 Vue 项目；给组件库补类型声明。
- **前置阅读**：[组件基础与通信](/vue3/110-ComponentSystem)（defineProps/defineEmits 的运行时面）。

## 心智模型：三层类型检查点

```text
第 1 层 脚本层：普通 TS —— ref/computed 的类型推断，与框架无关
第 2 层 宏层：   defineProps/defineEmits/defineModel/defineSlots —— 编译器宏有专属类型规则
第 3 层 模板层：vue-tsc 才检查 —— 编辑器 Volar 插件与命令行双入口
```

第三层是新手盲区：`tsc` 不认识 `.vue` 文件，模板里的类型错误（比如把 ref 当值用）**只有 vue-tsc 能抓到**。这就是"编辑器不报错、构建时爆炸"的根源。

## 动手一：环境与 vue-tsc 工作流

```bash
# 脚手架自带 TS：create-vue 选 TypeScript 即得以下全件
pnpm create vue@latest my-app -- --typescript
```

```json
// package.json 的检查脚本（核心就一条）
{
  "scripts": {
    "typecheck": "vue-tsc --noEmit",
    "build": "vue-tsc --noEmit && vite build"
  }
}
```

工作流纪律三条：

1. **IDE 装 Vue - Official（Volar）扩展并禁用旧的 Vetur**——两套插件并存时模板检查互相打架；
2. **`vue-tsc --noEmit` 进 CI**（等价流水线静态检查层的门禁）——编辑器不报错不等于通过；
3. **`.vue` 模块声明**：TS 需要知道 `.vue` 是什么——脚手架的 `env.d.ts` 里有 `/// <reference types="vite/client" />`，删了它 `import App from './App.vue'` 直接报"找不到模块"。

## 动手二：defineProps 的两种类型面

```ts
// 泛型写法（推荐）：类型即声明，编译器生成等价的运行时校验
interface Props {
  title: string
  level?: number
  items?: string[]
}
const props = defineProps<Props>()

// 带默认值：3.5+ 直接用解构默认值（见组件基础篇）；此前的写法是 withDefaults
const props = withDefaults(defineProps<Props>(), { level: 1, items: () => [] })
```

复杂类型用 `PropType`（运行时声明的场景）：

```ts
import type { PropType } from 'vue'
const props = defineProps({
  user: { type: Object as PropType<{ id: number; name: string }>, required: true },
  callback: Function as PropType<(id: number) => void>,
})
```

常见报错对照：

| 报错 | 原因 | 修法 |
| --- | --- | --- |
| `Type 'X' is not assignable to type 'string \| undefined'` | 传了错类型/漏了可选标记 | 对照 Props 接口修调用方 |
| 对象/数组默认值直接写 `default: []` 被警告 | 共享引用 | 工厂函数 `default: () => []` |
| 模板里 `props.items.map` 报 possibly undefined | 可选 prop 没收窄 | `props.items?.map` 或设为必填 |

## 动手三：组合函数的返回类型

组合函数的 TS 价值在"返回什么、调用方就拥有什么"：

```ts
// composables/useCounter.ts
import { ref, computed } from 'vue'

export function useCounter(initial = 0) {
  const count = ref(initial)                       // Ref<number> 自动推断
  const double = computed(() => count.value * 2)   // ComputedRef<number>
  function increment(step = 1) { count.value += step }
  // 返回值类型被完整推断，调用方解构后 IDE 全程有提示
  return { count, double, increment }
}
```

三条类型纪律：

1. **返回 ref 不返回值**：`return { count }`（Ref<number>）而不是 `return { count: count.value }`（死数字）——丢了 ref 就丢了响应性，运行时表现为"更新了但界面不动"；
2. **需要显式类型时导出别名**：跨文件传组合函数结果时 `export type Counter = ReturnType<typeof useCounter>`；
3. **参数"可能是 ref"**：`MaybeRefOrGetter<T>` 类型 + `toValue()`（见[响应式系统](/vue3/050-ReactiveSystem)的工具箱节），这是"响应式参数"组合函数的标配签名。

## 动手四：ref 自动解包的四个类型陷阱

**陷阱一：模板里 ref 自动解包，脚本里必须 .value**——同一变量在两层类型不同：

```ts
const count = ref(0)
// 模板：{{ count + 1 }}        正常（模板层自动解包）
// 脚本：if (count > 3) {}      类型报错：Ref<number> 与 number 无法比较
// 正确：if (count.value > 3)
```

**陷阱二：reactive 对象里的 ref 自动解包，但解构后失效**：

```ts
const state = reactive({ count: ref(0) })
state.count++                    // 正常：reactive 深层把 ref 解包成 number

const { count } = state          // 类型上是 number——且响应性随解构丢失（响应式系统篇坑一）
// 两个问题叠加：类型没骗你（确实是 number），响应性确实没了
```

**陷阱三：数组里的 ref 不解包**：

```ts
const list = ref([ref(1), ref(2)])
// list.value[0] 的类型是 Ref<number>——数组内的 ref 不自动解包
// 正确访问：list.value[0].value；模板里会渲染出对象而不是 1
```

**陷阱四（高频）：模板引用的可空与泛型标注**：

```ts
import { useTemplateRef } from 'vue'
import type { ComponentPublicInstance } from 'vue'

const input = useTemplateRef<HTMLInputElement>('inputRef')   // Ref<HTMLInputElement | null>
const formRef = useTemplateRef<InstanceType<typeof MyForm>>('formRef')
input.value?.focus()           // 可选链是必须的——挂载前是 null
```

## 动手五：emits、插槽与全局类型

```ts
// emits：事件名 → 参数元组
const emit = defineEmits<{ change: [value: string]; submit: [payload: FormPayload] }>()

// 插槽（组件库方向）：defineSlots 声明插槽 props 类型（见插槽篇）
const slots = defineSlots<{ item(props: { row: Row }): unknown }>()
```

全局类型增强（全局组件、全局属性）放 `env.d.ts`：

```ts
declare module 'vue' {
  interface GlobalComponents {
    RouterLink: typeof import('vue-router')['RouterLink']   // 模板里 <RouterLink> 有类型
  }
}
```

## 常见困惑

**"tsc 和 vue-tsc 什么关系？"**——vue-tsc 是 tsc 的超集，多认识 `.vue` 单文件组件（解析 SFC 三段并检查模板表达式）。含 `.vue` 的项目 typecheck 必须用 vue-tsc。

**"any 能不能救急？"**——救急可以，但要留注释与工单。比 any 更好的过渡是 `unknown`（用前必须收窄，不会静默扩散）。

**"第三方库没有类型怎么办？"**——先查 DefinitelyTyped（`@types/xxx`）；没有就在 `shims.d.ts` 里自己声明模块的最小接口面。

## 动手实践：把一个组件改成全类型安全

任务：

1. 写 `TodoList.vue`：泛型 defineProps（items: Todo[]、filter: 'all' | 'done'），emits 声明 toggle/remove 事件的载荷元组；
2. 写 useTodos 组合函数，返回类型完整推断，并导出 `ReturnType` 别名供测试使用；
3. 故意制造四个陷阱各一次（脚本里 ref 不 .value、解构 reactive、数组内 ref、模板引用不 ?.），读出各自报错并修复；
4. 把 `vue-tsc --noEmit` 加进 package.json 与 CI，故意留一个类型错误验证门禁拦得住。

<details>
<summary>参考实现（先自己写再展开）</summary>

```ts
// 1 + 2
interface Todo { id: number; text: string; done: boolean }

// composables/useTodos.ts
export function useTodos() {
  const todos = ref<Todo[]>([])
  const filter = ref<'all' | 'done'>('all')
  const shown = computed(() =>
    filter.value === 'done' ? todos.value.filter(t => t.done) : todos.value)
  function toggle(id: number) {
    const t = todos.value.find(t => t.id === id)
    if (t) t.done = !t.done
  }
  return { todos, filter, shown, toggle }
}
export type Todos = ReturnType<typeof useTodos>

// TodoList.vue
const props = defineProps<{ items: Todo[]; filter: 'all' | 'done' }>()
const emit = defineEmits<{ toggle: [id: number]; remove: [id: number] }>()

// 3 的报错形态（vue-tsc 输出）：
// 陷阱一 error TS2365: Operator '>' cannot be applied to types 'Ref<number>' and 'number'
// 陷阱四 error TS18047: 'input.value' is possibly 'null'
// 陷阱三类型不报错但渲染异常（[object Object]）——类型对，心智模型错
```

判读要点：任务 4 是本篇的落点——**类型安全不是编辑器的恩赐，是 CI 里的一行命令**。四处报错能对号入座，本篇目标达成。
</details>

## 检验清单

- 能画出三层类型检查点并说出 vue-tsc 与 tsc 的关系；
- 能用泛型 defineProps + 3.5 解构默认值（或 withDefaults）完成组件接口声明；
- 能写出返回类型完整推断的组合函数，并用 ReturnType 导出类型别名；
- 能复述 ref 自动解包的四个陷阱与各自的类型表现；
- 能把 typecheck 挂进构建与 CI 门禁。

## 下一步

- [组件基础与通信](/vue3/110-ComponentSystem)：props/emits 的运行时机制（类型面之外）；
- [Pinia 状态管理](/vue3/210-PiniaStateManagementDetailed)：全局状态的类型推导；
- [表单绑定与组件 v-model](/vue3/045-FormBindingVModel)：defineModel 的类型面。

## 参考与致谢

- Vue 官方文档 TypeScript with Composition API（CC BY-NC-SA 4.0，要点对照并重写组织）：<https://vuejs.org/guide/typescript/composition-api.html>
- vue-tsc 与 Vue - Official（Volar）工具文档（MIT）：<https://github.com/vuejs/language-tools>
- 陷阱报错文案为 vue-tsc 实测输出形态摘录。
