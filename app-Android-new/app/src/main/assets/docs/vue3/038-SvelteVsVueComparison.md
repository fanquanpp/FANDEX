---
order: 380
title: Svelte 精要与 Vue 对照
module: 'vue3'
category: 前端技术
difficulty: intermediate
description: 用 Vue 的知识体系理解 Svelte：编译时框架、runes 响应式与 Vue 组合式 API 的一一对应。
author: fanquanpp
updated: '2026-09-08'
related:
  - 'vue3/016-ReactiveSystem'
  - 'vue3/010-Vue3CompileOptimization'
  - 'vue3/023-VueRouterDetailed'
prerequisites:
  - 'vue3/006-API'
  - 'vue3/003-Vue3TemplateSyntax'
---

## 0. 一句话理解

> Svelte 与 Vue 同属"模板 + 响应式"流派：Vue 在运行时用响应式代理加虚拟 DOM 追踪依赖，Svelte 在编译期把组件直接编译成操作 DOM 的原生 JavaScript，没有虚拟 DOM。

## 1. Svelte 是什么

Svelte 是一个"编译时框架"：React 与 Vue 在浏览器里做运行时 diff，Svelte 则在构建阶段完成依赖分析与更新代码生成，运行时体积小、更新路径短。

Svelte 5（2024-10 发布）引入 runes（符文）语法，用 `$state`、`$derived`、`$effect` 显式声明响应式，替代旧版 `let` 自动响应式与 store 体系。当前稳定版为 Svelte 5.55.x 与 SvelteKit 2.57.x（2026-05），新项目统一使用 SvelteKit 脚手架。

## 2. 五分钟跑起来

```bash
npx sv create my-app
cd my-app
npm run dev
```

1. `sv create` 是官方 CLI，选择 SvelteKit 模板；开发服务器默认 `http://localhost:5173`。
2. 页面文件是 `src/routes/+page.svelte`，文件即路由，改完保存即热更新。

## 3. 组件文件对照

Svelte 的 `.svelte` 文件与 Vue 单文件组件结构同构：`<script>` 对应 `<script setup>`，模板直接写 HTML，样式写在 `<style>`。

```svelte
<!-- src/routes/+page.svelte -->
<script>
  let count = $state(0)

  function add() {
    count += 1
  }
</script>

<main>
  <h1>你好，Svelte 5</h1>
  <p>点击次数：{count}</p>
  <button onclick={add}>加一</button>
</main>
```

1. `{count}` 插值等价于 Vue 的 `{{ count }}`。
2. 事件绑定用属性形式 `onclick={add}`（注意是全小写 `onclick`，不是 `onClick`），等价于 Vue 的 `@click="add"`。
3. 编译后没有虚拟 DOM：按钮点击直接更新那一个 `<p>` 的文本节点。

## 4. 响应式对照：runes 对组合式 API

Svelte 5 的三个符文与 Vue 组合式 API 几乎一一对应：

| Svelte 5 | Vue 3 | 差异要点 |
| --- | --- | --- |
| `let count = $state(0)` | `const count = ref(0)` | Svelte 直接赋值 `count += 1` 触发更新；Vue 需要 `.value` |
| `let total = $derived(price * qty)` | `const total = computed(() => ...)` | 都是只读派生值，依赖变化自动重算 |
| `$effect(() => { ... })` | `watchEffect(() => { ... })` | 都自动追踪函数内读取的响应式值，返回清理函数做取消订阅 |

```svelte
<script>
  let price = $state(100)
  let qty = $state(2)
  let total = $derived(price * qty)

  // 副作用：keyword 变化时自动重新执行，类似 watchEffect
  let keyword = $state("")
  $effect(() => {
    console.log(`搜索关键词：${keyword}`)
  })
</script>
```

要点：

1. `$derived` 只读，不要手动赋值，它保证显示值与源数据一致——语义与 `computed` 相同。
2. `$effect` 用于日志、同步 `localStorage`、对接非响应式 API；不要在里面反向修改其他响应式变量，否则循环触发，这与 `watchEffect` 的使用纪律一致。
3. 旧版 store（`writable` 与模板 `$count` 自动订阅）仍兼容，存量项目无需迁移；新项目跨组件共享状态用模块级 `$state` 导出即可。

## 5. 双向绑定：bind: 对 v-model

```svelte
<script>
  let name = $state("")
  let agree = $state(false)
</script>

<input bind:value={name} placeholder="姓名" />
<input type="checkbox" bind:checked={agree} />
```

1. `bind:value` 让输入框与变量双向同步，等价于 Vue 的 `v-model`；复选框用 `bind:checked`，对应 `v-model` 在复选框上的行为。
2. 相比 React 受控组件（`value` 加 `onChange`）的写法，Svelte 与 Vue 的双向绑定都是语法糖，底层仍是"属性下行、事件上行"。

## 6. 路由与全栈：SvelteKit 对 Vue Router 与 Nuxt

| 能力 | Svelte 生态 | Vue 生态 |
| --- | --- | --- |
| 组件级路由 | SvelteKit 文件路由（`+page.svelte` 即路由） | Vue Router（`vue3/023-VueRouterDetailed`） |
| 数据加载 | `+page.ts` 的 `load` 函数 | 路由守卫与组合函数 |
| 全栈元框架 | SvelteKit | Nuxt |

两者思路一致：文件约定代替路由配置，服务端与客户端共享同一套路由定义。

## 7. 选型建议

1. 团队已有 Vue 技术栈、需要丰富生态（组件库、后台模板）时，继续用 Vue；Svelte 生态体量更小。
2. 追求极致包体积与首屏性能（嵌入式 WebView、营销页、小组件）时，Svelte 的编译时方案值得评估。
3. 从 Vue 迁移 Svelte 的心智成本很低：模板语法、响应式划分、单向数据流全部同构，主要差异只是"编译期完成依赖追踪"这一条。

## 8. 动手试试

1. 用 `sv create` 建一个计数器，把 `vue3/002-Vue3QuickStartGuide` 的计数器用 runes 重写一遍，对比两者代码量。
2. 给计数器加"减一"按钮，数量为 0 时禁用（`disabled={count <= 1}`）。
3. 用模块级 `export const cartCount = $state(0)` 做跨页面共享状态，再回想 Pinia 解决的是同一个问题。

## 9. 一句话记住

> Svelte 是"编译时"的 Vue：`$state`、`$derived`、`$effect` 对应 `ref`、`computed`、`watchEffect`，`bind:` 对应 `v-model`，模板与单向数据流心智完全通用。
