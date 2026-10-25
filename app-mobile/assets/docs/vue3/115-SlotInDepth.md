---
order: 120
title: 插槽与内容分发
module: 'vue3'
category: 前端技术
difficulty: beginner
description: 默认/具名/作用域插槽递进、v-slot 解构、动态插槽名、编译作用域与无渲染组件模式——通用列表与表格列自定义实战
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：Vue 3 / 组件进阶 / Slots（官方文档 Slots 章节）。
- **解决什么问题**：props 传**数据**，插槽传**内容**（一段模板）。卡片布局、列表项渲染、表格列自定义、弹窗的标题/内容/底部结构——凡是"骨架固定、局部内容由使用方决定"的组件都需要插槽。
- **什么时候用到**：封装通用卡片/对话框/列表组件；表格组件让业务方自定义单元格；设计"布局组件"。
- **本篇承接**：[组件系统](/vue3/110-ComponentSystem) 第 5 节与原「组件进阶特性」篇第 5 节的插槽内容迁入本篇并扩展。

## 心智模型：三种插槽是"控制权的三次交接"

```text
默认插槽     父组件决定"插入什么内容"（位置唯一）
具名插槽     父组件决定"哪些内容放进哪些位置"（多出口）
作用域插槽   子组件把内部数据交给父组件渲染（数据在子、渲染权在父）
```

一句话总纲：**插槽把"子组件的一部分模板"交给父组件来写**；作用域插槽再进一步——"这行数据是子组件的，但长什么样父组件说了算"。

## 动手一：默认插槽与后备内容

```vue
<!-- BaseCard.vue：骨架归组件，内容归使用方 -->
<template>
  <div class="card">
    <slot>
      <!-- 后备内容（fallback）：使用方没给内容时显示 -->
      <p class="empty">暂无内容</p>
    </slot>
  </div>
</template>
```

```vue
<!-- 使用方 -->
<BaseCard>
  <p>这是被插入到 slot 位置的内容</p>
</BaseCard>

<BaseCard />          <!-- 显示"暂无内容" -->
```

插槽内容可以使用父组件作用域的一切（数据、方法）——因为它编译时属于**父组件**的作用域。这条规则的完整含义见下文"编译作用域"。

## 动手二：具名插槽（多出口布局）

```vue
<!-- PageShell.vue -->
<template>
  <div class="page">
    <header class="page-header">
      <slot name="header">默认头部</slot>   <!-- 每个出口都可以有后备内容 -->
    </header>
    <main>
      <slot />                            <!-- 没写 name 的内容默认进这里（default） -->
    </main>
    <footer>
      <slot name="footer">默认底部</slot>
    </footer>
  </div>
</template>
```

```vue
<!-- 使用方：template + #名字 指定去向 -->
<PageShell>
  <template #header>
    <h2>自定义头部</h2>
  </template>

  <p>没有包裹 template 的内容默认进 default 插槽</p>

  <template #footer>
    <p>自定义底部</p>
  </template>
</PageShell>
```

要点：`#header` 是 `v-slot:header` 的缩写；`v-slot` 只能写在 `<template>` 或组件标签上；多出口组件（布局壳、弹窗的标题/内容/按钮区）是它最典型的用途。

## 动手三：作用域插槽（通用列表的单元格自定义）

需求：一个通用列表组件管数据获取与分页，**每行长什么样**由使用方决定。子组件把每行数据"递出来"：

```vue
<!-- DataList.vue -->
<script setup lang="ts">
import { ref } from 'vue'

interface Item { id: number; name: string; online: boolean }
const items = ref<Item[]>([
  { id: 1, name: '项目 1', online: true },
  { id: 2, name: '项目 2', online: false },
  { id: 3, name: '项目 3', online: true },
])
</script>

<template>
  <ul class="data-list">
    <li v-for="item in items" :key="item.id">
      <!-- 把 item 传给插槽：这就是"作用域"插槽 -->
      <slot name="item" :item="item">
        {{ item.name }}      <!-- 后备渲染：使用方懒得自定义时兜底 -->
      </slot>
    </li>
  </ul>
</template>
```

```vue
<!-- 使用方：解构拿数据，自定义渲染 -->
<DataList>
  <template #item="{ item }">
    <strong>{{ item.id }}: {{ item.name }}</strong>
    <span :class="item.online ? 'on' : 'off'">
      {{ item.online ? '在线' : '离线' }}
    </span>
  </template>
</DataList>
```

逐段讲解：

- `:item="item"` 把子组件的循环变量挂到插槽 props 上；使用方 `#item="{ item }"` 用对象解构接收——**只解构需要的字段**（`{ item }`）而不是整包接收，模板可读性更好；
- 作用域插槽解决的本质矛盾：数据在子组件（列表组件负责请求与分页），渲染需求在使用方（业务页知道要显示"在线徽标"）。props 解决不了——props 传不了"模板"；
- 表格组件的列自定义是这个模式的工业级应用（`#cell="{ row }"`），Element Plus、Ant Design Vue 的自定义列全是作用域插槽。

**只传插槽 props 不传组件内部状态**是纪律：插槽 props 是子组件的公开 API，把整只组件实例 `:self="this` 式地抛出去会让使用方依赖内部实现，组件重构即破坏使用方。

## 动手四：动态插槽名与插槽对象

```vue
<template>
  <!-- 插槽名来自变量：按配置切换布局的编辑器类组件会用 -->
  <PageShell>
    <template #[section]>动态内容</template>
  </PageShell>

  <!-- $slots：程序化检查使用方传了哪些插槽 -->
  <footer v-if="$slots.footer">
    <slot name="footer" />
  </footer>
</template>

<script setup lang="ts">
import { useSlots } from 'vue'
const slots = useSlots()
// 组合式 API 里等价访问：slots.header?.() —— 插槽本质是返回 vnode 的函数
</script>
```

两个进阶用法：`#[变量名]` 的动态指令参数让插槽名可在运行时决定（多布局容器）；`v-if="$slots.footer"` 判断使用方是否传了某插槽来决定渲染空壳与否——组件库里常见的"传了才渲染包装元素"技巧。

给插槽 props 定类型用 `defineSlots` 宏（纯类型声明，运行时无产物）：

```ts
const slots = defineSlots<{
  default(props: { item: Item; index: number }): unknown
  header?(props: { title: string }): unknown
  footer?(): unknown
}>()
```

声明后，使用方的 `#default="{ item }"` 拿到的 `item` 就是 `Item` 类型——组件库开发体验的标配。

## 关键概念：编译作用域——为什么父模板拿不到子组件数据

```vue
<!-- ChildScope.vue -->
<script setup lang="ts">
const secret = ref('子组件内部状态')
</script>
<template>
  <slot :item="secret">
    <!-- 这里能访问 secret（子作用域） -->
  </slot>
</template>
```

```vue
<!-- 父组件 -->
<ChildScope>
  {{ secret }}      <!-- ReferenceError：secret 不存在！ -->
</ChildScope>
```

规则一句话：**插槽内容的变量来自"模板书写处"的作用域（父组件），与它最终渲染在子组件的哪个位置无关**。这正是"插槽内容编译时属于父组件"的语义——父模板里只能看到父的变量与插槽 props。想用子的数据，只能通过作用域插槽的 props 显式传递，没有别的门。

## 模式：无渲染组件（renderless）

作用域插槽的极致用法：组件**只管逻辑、完全不管长相**，把渲染权 100% 交给使用方：

```vue
<!-- FetchData.vue：只负责取数与状态管理 -->
<script setup lang="ts">
import { ref, onMounted } from 'vue'

const props = defineProps<{ url: string }>()
const data = ref<unknown>(null)
const loading = ref(false)
const error = ref<Error | null>(null)

onMounted(async () => {
  loading.value = true
  try {
    data.value = await fetch(props.url).then(r => r.json())
  } catch (e) {
    error.value = e as Error
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <slot :data="data" :loading="loading" :error="error" />
</template>
```

```vue
<!-- 使用方：同一逻辑，两种完全不同的长相 -->
<FetchData url="/api/singers">
  <template #default="{ data, loading, error }">
    <p v-if="loading">加载中...</p>
    <p v-else-if="error">出错了：{{ error.message }}</p>
    <ul v-else>
      <li v-for="s in data" :key="s.id">{{ s.name }}</li>
    </ul>
  </template>
</FetchData>
```

价值与边界：无渲染组件把"取数状态机"复用为组件；但**逻辑复用的首选是组合式函数**（composable，见[自定义组合式函数](/vue3/090-CustomHook)）——composable 更轻、无模板成本、TS 推断更好。renderless 组件留在"逻辑需要渲染器配合"（比如要渲染多个插槽出口、需要在模板里组织结构）的场景，不要当默认工具。

## 常见困惑

**"默认插槽也能写成 `#default` 吗？"**——能，两种写法等价；内容不包 template 时隐式进 default。混用时注意：显式 template 与裸内容可以共存，都归 default。

**"插槽 props 能解构重命名吗？"**——能：`#item="{ item: row }"` 与 JS 解构语法一致。

**"v-slot 与 slot-scope 的老写法？"**——`slot="header" slot-scope="props"` 是 Vue 2 已废弃语法，见到即说明资料过时；`slot-scope` 在 Vue 3 已移除。

## 动手实践：给播客应用做组件三件套

任务：

1. 写 PageShell 三出口布局（header/default/footer），header 带后备内容；
2. 写 DataList（内造 5 行数据），使用方自定义渲染：每行显示歌名 + 时长徽标，时长超 5 分钟标红；
3. 给 DataList 增加 `$slots.header` 判断：传了 #header 才渲染工具条容器；
4. 把 FetchData 无渲染组件接到真实接口（或本地 mock），用同一组件渲染出"卡片列表"与"表格"两种形态；
5. （编译作用域实验）在插槽内容里访问子组件的内部 ref，读出报错，再用作用域插槽 props 修复。

<details>
<summary>参考实现（先自己写再展开）</summary>

```vue
<!-- 2/3：DataList 增加工具条判断 -->
<template>
  <div v-if="$slots.header" class="list-toolbar"><slot name="header" /></div>
  <ul>
    <li v-for="item in items" :key="item.id">
      <slot name="item" :item="item">{{ item.name }}</slot>
    </li>
  </ul>
</template>

<!-- 使用方 -->
<DataList :items="songs">
  <template #header><h4>曲库（{{ songs.length }}）</h4></template>
  <template #item="{ item }">
    {{ item.name }}
    <b :class="{ hot: item.duration > 300 }">{{ (item.duration / 60).toFixed(1) }} 分钟</b>
  </template>
</DataList>

<!-- 4：mock 两形态 -->
<FetchData url="/mock/singers.json">
  <template #default="{ data, loading }">
    <div v-if="!loading" class="cards">
      <div v-for="s in data" :key="s.id" class="card">{{ s.name }}</div>
    </div>
  </template>
</FetchData>
<FetchData url="/mock/singers.json">
  <template #default="{ data }">
    <table v-if="data"><tr v-for="s in data" :key="s.id"><td>{{ s.name }}</td></tr></table>
  </template>
</FetchData>
```

判读要点：任务 5 的报错信息（secret is not defined）就是编译作用域的直接证据——同一份插槽内容换成 `#item="{ secret }"` 后即可访问。
</details>

## 检验清单

- 能说出三种插槽各自交接了什么控制权，并给每种举一个组件例子；
- 能用 `#item="{ item }"` 解构作用域插槽并解释"数据在子、渲染在父"的分工；
- 能解释编译作用域规则，并演示"父模板访问子内部变量会报错"；
- 会用 `$slots`/`useSlots` 做条件渲染与动态插槽名；
- 能实现一个无渲染组件，并说出它与组合式函数的取舍边界。

## 下一步

- [组件基础与通信](/vue3/110-ComponentSystem)：props/emits/attrs 透传的完整规则；
- [动态组件、递归组件与函数式组件](/vue3/145-DynamicComponentPatterns)：插槽之外的组件复用形态；
- [自定义组合式函数](/vue3/090-CustomHook)：逻辑复用的首选工具。

## 参考与致谢

- Vue 官方文档 Slots 章节（CC BY-NC-SA 4.0，要点对照并重写组织）：<https://vuejs.org/guide/components/slots.html>
- 本篇插槽示例承接自 110 第 5 节与 240 第 5 节并重写扩充，行为已对照 Vue 3 官方文档核校。
