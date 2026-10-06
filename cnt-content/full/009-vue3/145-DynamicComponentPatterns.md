---
order: 150
title: 动态组件、递归组件与函数式组件
module: 'vue3'
category: 前端技术
difficulty: beginner
description: component :is 的传参与缓存、递归组件渲染树与评论楼中楼、真正的函数式组件、组合替代继承、高阶组件与错误边界——组件进阶模式全集
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：Vue 3 / 组件进阶模式（动态组件、递归组件、函数式组件、组合/继承、错误边界）。
- **解决什么问题**：一组组件在运行时才确定渲染谁（Tab 切换、向导流程）；数据本身就是树（菜单、评论楼、组织架构）；纯展示件不需要组件实例的开销；通用逻辑要"包"在任意组件外面（加载态、权限）。
- **什么时候用到**：Tab 与多步表单、无限层级评论/菜单、高频列表的纯展示子件、统一 loading 包装、局部错误兜底。
- **互为表里**：渲染函数与 JSX 的实现细节见[渲染函数与 h()](/vue3/295-RenderFunctionH)；插槽的自定义渲染见[插槽与内容分发](/vue3/115-SlotInDepth)。
- **本篇承接**：旧篇「组件进阶特性」的动态/递归/函数式/继承四类内容迁入本篇重写（其中旧篇"函数式组件"示例实为普通 SFC，本篇给出正确形态）。

## 心智模型：四个模式对应四种"复用障碍"

| 模式 | 障碍 | 解法 |
| --- | --- | --- |
| 动态组件 | 渲染目标运行时才定 | `<component :is>` |
| 递归组件 | 数据结构是递归的 | 组件引用自身 |
| 函数式组件 | 纯展示不需要实例 | 一个渲染函数 |
| 高阶组件 | 通用逻辑包任意组件 | 包装函数返回新组件 |

## 动手一：动态组件（Tab 场景）

```vue
<script setup lang="ts">
import { ref, shallowRef, type Component } from 'vue'
import ComponentA from './ComponentA.vue'
import ComponentB from './ComponentB.vue'
import ComponentC from './ComponentC.vue'

const tabs = { A: ComponentA, B: ComponentB, C: ComponentC }
// 注意类型：存"组件对象"用 shallowRef，别用 ref 深度代理组件定义
const current = shallowRef<Component>(tabs.A)
const message = ref('来自父组件的消息')
</script>

<template>
  <button v-for="(comp, name) in tabs" :key="name" @click="current = comp">
    组件 {{ name }}
  </button>

  <!-- 传 props 与监听事件与静态组件完全同形 -->
  <keep-alive>
    <component :is="current" :message="message" @update="m => (message = m)" />
  </keep-alive>
</template>
```

三个关键点逐段讲：

- **`shallowRef` 而不是 `ref` 存组件**：组件定义是含函数的大对象，`ref` 会做深度响应式代理（无意义且耗性能），`shallowRef` 只追踪"换没换组件"这个引用变化。误用 `ref` 的症状是控制台出现 Vue 的性能提示；
- **props 与事件的传递形态与静态组件一致**：`:is` 只是让"渲染谁"成为变量，组件接口协议（props/emits）不变——这是动态组件传参的全部秘密；
- **`keep-alive` 包裹 `component` 是黄金组合**：切换时组件被缓存而非销毁，Tab 里的表单输入、滚动位置都不丢。缓存细节（include/exclude/max、activated 钩子）见 [KeepAlive 缓存与生命周期](/vue3/160-KeepAliveCacheLifecycle)。

换成字符串形态（`:is="'ComponentA'"`）的写法依赖全局注册或字符串解析，`<script setup>` 的局部组件配合对象映射才是类型安全的主流形态。

## 动手二：递归组件（树形菜单与评论楼中楼）

```vue
<!-- TreeNode.vue：组件在自己的模板里引用自己（以文件名） -->
<script setup lang="ts">
import { ref } from 'vue'

interface TreeNode {
  id: number
  name: string
  children?: TreeNode[]
}

defineProps<{ node: TreeNode }>()
const expanded = ref(false)
</script>

<template>
  <div class="tree-node">
    <div class="node-content" @click="expanded = !expanded">
      {{ node.name }}
      <span v-if="node.children?.length">{{ expanded ? '▼' : '→' }}</span>
    </div>
    <div v-if="expanded && node.children?.length" class="node-children">
      <!-- 递归点：渲染子节点 = 渲染自己 -->
      <TreeNode v-for="child in node.children" :key="child.id" :node="child" />
    </div>
  </div>
</template>
```

递归组件的三条纪律：

1. **必须有终止条件**：`v-if="expanded && node.children?.length"` 保证叶子节点不再递归——漏掉终止条件是无限递归爆栈的直接原因（浏览器报 "Maximum call stack size exceeded"）；
2. **自引用靠文件名**：`<script setup>` 组件在自己的模板里直接写文件名（`TreeNode`）即可自引用；若组件经 `app.component()` 注册则用注册名；
3. **`key` 必给**：递归列表每层都是 `v-for`，没有 key 时层级变化会引发错误的节点复用。

**评论楼中楼**是同一模式（把 `node.name` 换成评论内容与头像、把展开条件换成"查看 N 条回复"），差异只在数据形状——递归组件学一次，菜单/评论/组织架构/分类树四处复用。

数据侧的预备：树形 JSON 常由后端的**邻接表**（parentId 链）转换而来，前端 `buildTree(list)` 一次性转好再交给递归组件；超大层级（万级节点）先做虚拟滚动再谈递归（见[性能实践](/vue3/320-Vue3PerformancePractice)）。

## 动手三：函数式组件（正确的形态）

旧篇把一个普通 `<script setup>` 组件叫"函数式组件"——那是误解。**函数式组件就是"一个渲染函数本身"**：无实例、无自身状态、无生命周期，props 变化直接重新执行函数：

```ts
// Badge.ts —— 整个组件就是一个函数
import { h, type FunctionalComponent } from 'vue'

interface Props { text: string; type?: 'ok' | 'warn' | 'err' }

const Badge: FunctionalComponent<Props, { click: MouseEvent }> = (props, { slots, emit }) =>
  h(
    'span',
    {
      class: ['badge', props.type ?? 'ok'],
      onClick: (e: MouseEvent) => emit('click', e),
    },
    slots.default?.() ?? props.text,   // 插槽优先，props 兜底
  )
Badge.props = ['text', 'type']         // 函数式组件需手动声明 props
Badge.emits = ['click']

export default Badge
```

```vue
<script setup lang="ts">
import Badge from './Badge'
</script>
<template>
  <Badge text="新" type="warn" @click="onClick">角标文字</Badge>
</template>
```

取舍：函数式组件**没有**响应式状态、computed、生命周期——它只是 `props 与插槽 到 vnode` 的纯函数。适合徽标、图标、文本装饰这类纯映射展示件；需要状态（如计数器）就老实用 `<script setup>`。批量渲染 1000 个展示件时，省掉每组件一个组件实例的开销是它的实际收益（幅度是常量级的，别神化）。

## 动手四：组合替代继承（与"高阶组件"的边界）

旧篇的"组件继承"示例实际是**组合**（外层组件包裹内层组件）——这正是 Vue 3 的官方姿态：**组件间没有继承机制，逻辑复用靠组合式函数，结构复用靠插槽与包裹**：

```vue
<!-- 结构复用：包裹组件（对比 React 的 HOC 思路） -->
<script setup lang="ts">
import { h, defineComponent, type Component } from 'vue'

// withLoading：给任意组件包一层加载态（高阶组件模式）
export function withLoading(Wrapped: Component) {
  return defineComponent({
    name: 'WithLoading',
    props: ['loading'],
    setup(props, { attrs, slots }) {
      return () =>
        props.loading
          ? h('div', { class: 'loading' }, '加载中...')
          : h(Wrapped, attrs, slots)      // attrs 已含父组件传入的全部 props 与事件（Vue 3 里事件也在 attrs）
    },
  })
}
</script>
```

```ts
// 使用：得到一个带加载态的新组件
const AsyncUserCard = withLoading(UserCard)
// <AsyncUserCard :loading="pending" :user="user" @refresh="reload" />
```

逐段讲解：包装组件用 `attrs`（含未声明为 props 的全部透传项，Vue 3 中 `v-on` 事件也在其中）原样转发给被包组件——**这就是 Vue 3 版的 HOC 全部要点**：不再需要 Vue 2 时代的 `v-on="$listeners"`（`$listeners` 已并入 attrs）。注意旧资料里 `useListeners()` 的写法在 Vue 3 **不存在**，见到即知资料过时。

什么时候真的需要 HOC：**同一个包装逻辑要作用到"编译期不确定的一组组件"**（按配置生成带权限/加载态的组件集）。若只是"这个页面要加载态"，直接在页面里 `v-if` 更直白——高阶组件是最后的选择，组合式函数（逻辑）+ 插槽（结构）优先（见[自定义组合式函数](/vue3/090-CustomHook)与[插槽](/vue3/115-SlotInDepth)）。

## 动手五：错误边界（局部故障不拖垮全页）

`onErrorCaptured` 是 Vue 的错误捕获钩子，用它包出"错误边界"组件：

```vue
<!-- ErrorBoundary.vue -->
<script setup lang="ts">
import { ref, onErrorCaptured } from 'vue'

const hasError = ref(false)
const error = ref<Error | null>(null)

onErrorCaptured((err) => {
  hasError.value = true
  error.value = err as Error
  return false          // 返回 false 阻止错误继续向上传播
})

function reset() {
  hasError.value = false
  error.value = null
}
</script>

<template>
  <slot v-if="!hasError" />
  <div v-else class="error-box">
    <h3>这块内容出了问题</h3>
    <p>{{ error?.message }}</p>
    <button @click="reset">重试</button>
  </div>
</template>
```

```vue
<!-- 使用：易出错的第三方挂件单独圈起来 -->
<ErrorBoundary>
  <ThirdPartyWidget />
</ErrorBoundary>
```

要点：`return false` 是"就地消化"——不返回则错误继续冒泡到更高层或 `app.config.errorHandler`（全局兜底，生产错误上报的挂钩处）。策略是**双层**：关键区域套 ErrorBoundary 保局部可用，全局 errorHandler 收集上报。错误边界的粒度按"业务模块"划，逐组件都包等于给每个组件盖一床被子。

## 常见困惑

**"动态组件切换时状态丢了？"**——那就是没包 `keep-alive`（组件被销毁重建）。反过来，"切换后状态怎么还在"则是缓存生效——两者都是预期行为，按业务选。

**"递归组件能改成循环渲染吗？"**——扁平化数据（`flat list + parentId`）配 `v-for` 也能渲染树（靠缩进计算），性能更好但缩进层级、展开状态管理都要自己做；中小树用递归组件（可读性优先），巨树才值得扁平化。

**"函数式组件能用 defineModel 吗？"**——不能。没有实例就没有响应式系统，双向绑定走 props + emits 手动转发，或者干脆升级成普通组件。

## 动手实践：做一套 Tab + 评论楼

任务：

1. 写三页签的动态组件切换，每页一个输入框，验证不包 keep-alive 时切走再回来输入丢失、包上后保留；
2. 用递归组件渲染三层评论楼（数据自己造），实现"展开回复"与"回复总数"统计；
3. 实现 Badge 函数式组件并在一个 20 行列表里使用；
4. 用 withLoading 包装任意组件，切换 loading 观察"加载中..."与正常内容的互斥渲染；
5. 写 BuggyComponent 在按钮点击时 throw，用 ErrorBoundary 圈住它，验证整页其余部分仍可交互、点重试后恢复。

<details>
<summary>参考实现（先自己写再展开）</summary>

```ts
// 2 的数据形状（评论楼中楼）
interface Comment {
  id: number
  author: string
  content: string
  replies?: Comment[]
}
const comments: Comment[] = [
  { id: 1, author: '夜航', content: '前排！', replies: [
    { id: 2, author: '星尘', content: '前排 +1' },
    { id: 3, author: '初音', content: '来晚了', replies: [
      { id: 4, author: '夜航', content: '欢迎' },
    ]},
  ]},
]
// CommentNode.vue 里把 TreeNode 的字段换掉即可：
// @click="expanded = !expanded" 显示"{{ replies?.length }} 条回复"
```

```vue
<!-- 5 的验证要点 -->
<ErrorBoundary>
  <BuggyComponent />
</ErrorBoundary>
<button>页面其他按钮仍可点击</button>
<!-- BuggyComponent 抛错后：只有边界内显示错误卡片，边界外的按钮照常工作 -->
```

判读要点：任务 1 是 keep-alive 价值的直观实验；任务 5 里如果把 `return false` 去掉，错误会继续向上冒（控制台 unhandled），对比可理解传播链。
</details>

## 检验清单

- 能用 `shallowRef + <component :is> + keep-alive` 搭出带缓存的 Tab 切换，并解释为什么不用 `ref` 存组件；
- 能写一个终止条件正确的递归组件，并说出三条递归纪律；
- 能实现真正的函数式组件（函数 + 手动 props 声明），并说出它与普通组件的能力边界；
- 能实现 Vue 3 版高阶组件（attrs 转发，无需 $listeners），并说出组合式函数/插槽优先的取舍；
- 能实现错误边界并说明 `return false` 与全局 errorHandler 的双层策略。

## 下一步

- [渲染函数与 h()](/vue3/295-RenderFunctionH)：本篇各模式的底层实现工具；
- [KeepAlive 缓存与生命周期](/vue3/160-KeepAliveCacheLifecycle)：动态组件缓存的完整参数；
- [组件基础与通信](/vue3/110-ComponentSystem)：props/emits/attrs 的基础规则。

## 参考与致谢

- Vue 官方文档：组件基础之动态组件、Edge Cases（递归组件）（CC BY-NC-SA 4.0，要点对照并重写组织）：<https://vuejs.org/guide/essentials/component-basics.html>
- 本篇动态/递归/继承内容承接自旧篇 240 并修正（函数式组件定义、$listeners 过时写法），行为已对照 Vue 3 官方文档核校。
