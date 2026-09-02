---
order: 100
title: Vue3 编译优化
module: 'vue3'
category: 前端技术
difficulty: advanced
description: 编译时优化与运行时优化
author: fanquanpp
updated: '2026-08-01'
related:
  - 'vue3/008-CustomDirectiveAdvanced'
  - 'vue3/009-TransitionAnimation'
  - 'vue3/011-Vue3SSR'
  - 'vue3/012-LifecycleHook'
prerequisites: []
---

## 前置知识

- [Transition 与动画](/vue3/009-TransitionAnimation)：建议先完成前一篇的学习

## 学习目标

- 掌握「概述」的核心机制、典型用法与常见陷阱
- 掌握「基础概念」的核心机制、典型用法与常见陷阱
- 掌握「快速上手」的核心机制、典型用法与常见陷阱
- 掌握「详细用法」的核心机制、典型用法与常见陷阱
- 掌握「常见场景」的核心机制、典型用法与常见陷阱


### SSR 优化

```javascript
// Vue 3 SSR 编译优化
// 服务端渲染时，编译器会生成不同的代码

// 客户端渲染函数
function render() {
  return createBlock('div', null, [
    _hoisted_1,
    createVNode('p', null, _ctx.message, PatchFlags.TEXT),
  ]);
}

// SSR 渲染函数（直接拼接字符串，无需 VNode）
function ssrRender(_ctx, _push, _parent) {
  _push(`<div>`);
  _push(`<header><h1>标题</h1></header>`); // 静态内容直接输出字符串
  _push(`<p>${_ctx.message}</p>`); // 动态内容插值
  _push(`</div>`);
}
// SSR 模式下性能远优于客户端渲染
```
## 概述

Vue 3 相比 Vue 2 在性能上有显著提升，其中编译器优化是核心因素之一。Vue 3 的编译器在模板编译阶段进行了多项优化，包括静态提升、预字符串化、PatchFlag 标记、Block Tree 收集和事件缓存等。这些优化使得 Vue 3 在更新时能够跳过大量不变的内容，只对动态部分进行精确的 diff 运算，从而大幅提升渲染性能。理解这些优化机制有助于编写更高性能的 Vue 应用。

## 基础概念

**静态提升（Static Hoisting）**：编译器将模板中的静态节点提取到渲染函数外部，使其只创建一次。后续渲染时直接复用，避免重复创建 VNode。

**预字符串化（Static Stringification）**：连续的静态节点会被合并为一个静态字符串 VNode，进一步减少 VNode 创建开销。

**PatchFlag**：编译器为动态节点打上补丁标记，标记该节点哪些属性是动态的。更新时只需检查标记的属性，跳过静态属性。

**Block Tree**：以组件根节点或 v-if/v-for 节点为 Block，收集所有动态子节点的引用。更新时只遍历动态节点列表，跳过整棵静态子树。

**事件缓存**：编译器缓存内联事件处理函数，避免每次渲染都创建新的函数引用，减少不必要的子组件更新。

**Tree Shaking**：Vue 3 的运行时支持基于 ES Module 的 Tree Shaking，未使用的 API 不会被打包进最终产物。

## 快速上手

### 静态提升

```html
<!-- 模板 -->
<template>
  <div>
    <p>静态内容</p>
    <span>{{ dynamicText }}</span>
  </div>
</template>
javascript
// 编译后的渲染函数（简化版）
// 静态节点被提升到渲染函数外部
const _hoisted_1 = createVNode('p', null, '静态内容');

function render() {
  return createVNode('div', null, [
    _hoisted_1, // 直接复用，不重新创建
    createVNode('span', null, _ctx.dynamicText, PatchFlags.TEXT),
  ]);
}
```

### PatchFlag 标记

```html
<template>
  <div :class="className">{{ message }}</div>
</template>
javascript
// 编译后：标记动态部分
function render() {
  return createVNode(
    'div',
    { class: _ctx.className }, // 动态 class
    _ctx.message, // 动态文本
    PatchFlags.CLASS | PatchFlags.TEXT // 标记：class 和 text 是动态的
  );
}

// PatchFlags 枚举值
// TEXT = 1          文本内容动态
// CLASS = 2         class 动态
// STYLE = 4         style 动态
// PROPS = 8         非 class/style 的属性动态
// FULL_PROPS = 16   完整属性动态（含 key 变化）
// EVENT_HANDLERS = 32  事件处理动态
// HOISTED = -1      静态提升的节点
// CACHED = -2       缓存的节点
```

## 详细用法

### 预字符串化

```html
<!-- 模板中有多个连续的静态节点 -->
<template>
  <div>
    <header>
      <h1>标题</h1>
      <nav>
        <a href="/">首页</a>
        <a href="/about">关于</a>
        <a href="/contact">联系</a>
      </nav>
    </header>
    <main>{{ content }}</main>
  </div>
</template>
javascript
// 编译后：连续静态节点合并为一个字符串
const _hoisted_1 = createStaticVNode(
  '<header><h1>标题</h1><nav>' +
    '<a href="/">首页</a>' +
    '<a href="/about">关于</a>' +
    '<a href="/contact">联系</a>' +
    '</nav></header>',
  6 // 节点数量，用于 hydration
);

function render() {
  return createVNode('div', null, [
    _hoisted_1, // 整个 header 被字符串化
    createVNode('main', null, _ctx.content, PatchFlags.TEXT),
  ]);
}
```

### Block Tree 与动态节点收集

```html
<template>
  <div class="container">
    <h1>标题</h1>
    <p v-if="showDesc">描述文字</p>
    <ul>
      <li v-for="item in list" :key="item.id">{{ item.name }}</li>
    </ul>
    <footer>底部</footer>
  </div>
</template>
javascript
// v-if 和 v-for 会创建新的 Block
// 组件根节点是根 Block，收集所有动态子节点

function render() {
  return (
    // 根 Block
    createBlock('div', { class: 'container' }, [
      // 静态节点不收集
      createVNode('h1', null, '标题', -1 /* HOISTED */),

      // v-if 创建 Block
      _ctx.showDesc
        ? (openBlock(), createBlock('p', { key: 0 }, '描述文字'))
        : createCommentVNode('v-if', true),

      // v-for 创建 Block
      (openBlock(true), // 使用 fragment block
      renderList(_ctx.list, (item) => {
        return createBlock('li', { key: item.id }, item.name, PatchFlags.TEXT);
      })),

      // 静态节点不收集
      createVNode('footer', null, '底部', -1 /* HOISTED */),
    ])
  );
  // diff 时只遍历收集的动态节点，跳过 h1 和 footer
}
```

### 事件缓存

```html
<template>
  <button @click="count++">点击 {{ count }}</button>
</template>
javascript
// 未缓存：每次渲染都创建新的函数
function render_uncached() {
  return createVNode(
    'button',
    {
      onClick: ($event) => _ctx.count++,
    },
    '点击 ' + _ctx.count,
    PatchFlags.TEXT
  );
}

// 缓存后：事件处理函数只创建一次
function render_cached() {
  return (
    // 使用 withCtx 缓存事件处理器
    withCtx(($event) => _ctx.count++, _cache || (_cache = []), 0)
  );
  // 实际编译结果：
  // _cache[0] || (_cache[0] = ($event) => (_ctx.count++))
  // 首次创建后缓存，后续直接使用缓存
}
```

## 常见场景

### 优化前后对比

```html
<!-- 优化前：所有节点都参与 diff -->
<template>
  <div>
    <header class="static-header">
      <h1>固定标题</h1>
      <p>固定描述</p>
    </header>
    <main>
      <p>{{ dynamicContent }}</p>
    </main>
    <footer class="static-footer">
      <p>固定底部</p>
    </footer>
  </div>
</template>

<!-- 优化后编译结果 -->
<!-- header 和 footer 被静态提升 -->
<!-- 只有 main 中的 p 节点参与 diff -->
javascript
// Vue 2 的渲染函数：全量 diff
function render_v2() {
  return _c('div', [
    _c('header', { staticClass: 'static-header' }, [
      _c('h1', [_v('固定标题')]),
      _c('p', [_v('固定描述')]),
    ]),
    _c('main', [_c('p', [_v(_s(dynamicContent))])]),
    _c('footer', { staticClass: 'static-footer' }, [_c('p', [_v('固定底部')])]),
  ]);
  // 每次更新都要遍历所有节点
}

// Vue 3 的渲染函数：靶向更新
const _hoisted_1 = createStaticVNode(
  '<header class="static-header"><h1>固定标题</h1><p>固定描述</p></header>',
  3
);
const _hoisted_2 = createStaticVNode('<footer class="static-footer"><p>固定底部</p></footer>', 2);

function render_v3() {
  return createBlock('div', null, [
    _hoisted_1,
    createVNode('main', null, [createVNode('p', null, _ctx.dynamicContent, PatchFlags.TEXT)]),
    _hoisted_2,
  ]);
  // 只 diff main 中的 p 节点
}
```

### 编写高性能模板

```html
<!-- 不推荐：整个列表都是动态的 -->
<template>
  <div :class="containerClass">
    <div v-for="item in items" :key="item.id">
      <span>{{ item.name }}</span>
      <span>{{ item.price }}</span>
    </div>
  </div>
</template>

<!-- 推荐：将静态部分提取出来 -->
<template>
  <div :class="containerClass">
    <StaticHeader />
    <!-- 静态内容独立为组件 -->
    <div v-for="item in items" :key="item.id">
      <!-- 使用 v-memo 跳过未变化的项 -->
      <div v-memo="[item.name, item.price]">
        <span>{{ item.name }}</span>
        <span>{{ item.price }}</span>
      </div>
    </div>
  </div>
</template>
```

## 注意事项

- **v-once 的使用**：`v-once` 可以让节点只渲染一次，后续更新跳过。但过度使用会使代码难以维护，通常让编译器自动优化即可。
- **v-memo 的适用场景**：`v-memo` 适合大型 v-for 列表中只有部分项变化的场景，但不要在简单列表上使用，因为缓存本身也有开销。
- **动态组件与 Block**：`<component :is="...">` 会导致编译器无法确定具体的节点结构，可能退化为全量 diff。尽量使用确定的组件标签。
- **内联模板的局限**：内联模板（inline template）无法享受编译优化，因为编译器在编译父组件时无法看到子组件的模板内容。
- **编译模式的差异**：开发模式和生产模式的编译结果不同，生产模式会移除开发辅助代码并启用所有优化。性能测试应在生产模式下进行。

## 进阶用法

### v-memo 深度优化

```html
<template>
  <!-- v-memo：只在依赖变化时更新 -->
  <div v-for="item in largeList" :key="item.id" v-memo="[item.selected]">
    <!-- 只有 item.selected 变化时才会重新渲染 -->
    <ExpensiveComponent :data="item" />
    <span>{{ item.name }}</span>
    <span :class="{ active: item.selected }"> {{ item.selected ? '已选中' : '未选中' }} </span>
  </div>
</template>
javascript
// v-memo 编译结果
function render() {
  return renderList(_ctx.largeList, (item) => {
    return withMemo(
      [item.selected], // 依赖数组
      () =>
        createBlock('div', { key: item.id }, [
          createVNode(ExpensiveComponent, { data: item }, null, PatchFlags.PROPS),
          createVNode('span', null, item.name, PatchFlags.TEXT),
          createVNode(
            'span',
            {
              class: { active: item.selected },
            },
            item.selected ? '已选中' : '未选中',
            PatchFlags.CLASS | PatchFlags.TEXT
          ),
        ]),
      _cache,
      0
    );
  });
}
```

### 自定义编译优化

```javascript
// vite.config.ts 中配置编译选项
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [
    vue({
      template: {
        // 编译器选项
        compilerOptions: {
          // 将所有自定义元素视为原生元素（跳过组件解析）
          isCustomElement: (tag) => tag.startsWith('x-'),
        },
        // 自定义转换插件
        transformAssetUrls: {
          // 自定义资源 URL 转换
        },
      },
    }),
  ],
});
```

## 静态提升 Static Hoisting

**基本写法：静态节点提升到 render 函数外**
`const <vnode> = createVNode('div', null, '静态')`
```vue
<!-- 静态节点被提升避免每次渲染重建 -->
<div class="header"><span>静态标题</span></div>
```

---

**基本写法：纯静态提升**
`<div class="box">固定内容</div>`
```vue
<!-- 不含动态绑定的节点整体提升 -->
<div class="box">固定内容</div>
```

---

## 补丁标记 PatchFlag

**基本写法：编译器标记动态节点类型**
`createVNode('div', null, text, PatchFlags.TEXT)`
```vue
<!-- 编译产物带 patchFlag 仅比对动态部分 -->
<div>{{ message }}</div>
```

---

**基本写法：标记不同类型动态**
`PatchFlags.TEXT | PatchFlags.CLASS | PatchFlags.PROPS`
```vue
<!-- 文本动态 -->
<div>{{ msg }}</div>
<!-- class 动态 -->
<div :class="cls">文本</div>
<!-- props 动态 -->
<div :id="id">文本</div>
```

---

## 块级树 Block

**基本写法：根节点收集动态子节点**
`createBlock('div', null, [<children>], PatchFlags)`
```vue
<!-- 模板根节点自动作为 Block -->
<template>
  <div>
    <p>静态</p>
    <p>{{ msg }}</p>
  </div>
</template>
```

---

**基本写法：Block 数组优化 diff**
`const <dynamicChildren> = []`
```ts
// Block 仅 diff 动态子节点跳过静态
block.dynamicChildren = [dynamicVNode];
```

---

## v-if 优化的 key

**基本写法：v-if/v-else 配 key 优化**
`<div v-if="<条件>" key="a">`
```vue
<!-- 添加 key 提高复用判断 -->
<div v-if="show" key="on">显示</div>
<div v-else key="off">隐藏</div>
```

---

## v-for 优化的 key

**基本写法：稳定唯一 key 加速 diff**
`<div v-for="<项> in <列表>" :key="<项>.id">`
```vue
<!-- 使用稳定 key -->
<div v-for="item in list" :key="item.id">{{ item.name }}</div>
```

---

## 缓存事件处理函数

**基本写法：内联事件被缓存**
`<button @click="<回调>">`
```vue
<!-- 编译器缓存事件处理避免每次创建 -->
<button @click="onClick">点击</button>
```

---

**基本写法：内联表达式事件**
`<button @click="count++">`
```vue
<!-- 缓存为函数 -->
<button @click="count++">加</button>
```

---

## 静态属性合并

**基本写法：静态 class style 合并为对象**
`createElementVNode('div', { class: 'box' })`
```vue
<!-- 静态 class 提前计算 -->
<div class="box">内容</div>
```

---

## v-once 一次性渲染

**基本写法：标记节点只渲染一次**
`<div v-once>{{ <静态值> }}</div>`
```vue
<!-- 编译为静态提升节点 -->
<header v-once>{{ title }}</header>
```

---

## v-memo 记忆化

**基本写法：依赖未变跳过子树 patch**
`<div v-memo="[<依赖>]">`
```vue
<!-- 依赖不变跳过整个子树更新 -->
<div v-memo="[item.id]">
  <span>{{ item.name }}</span>
  <span>{{ item.age }}</span>
</div>
```

---

## 内联事件缓存

**基本写法：内联函数自动缓存**
`<button @click="<复杂表达式>">`
```vue
<!-- 表达式被提取并缓存 -->
<button @click="onClick($event, id)">点击</button>
```

---

## BlockTree 收集

**基本写法：动态子节点收集到数组**
`<block>.dynamicChildren`
```ts
// Block 仅遍历动态节点
function patchBlock(n1, n2) {
  for (let i = 0; i < n2.dynamicChildren.length; i++) {
    patch(n1.dynamicChildren[i], n2.dynamicChildren[i]);
  }
}
```

---

## 模板编译产物对比

**基本写法：编译前模板**
`<div :id="<动态>"><span>静态</span></div>`
```vue
<!-- 源模板 -->
<template>
  <div :id="dynamicId"><span>静态</span></div>
</template>
```

---

**基本写法：编译后渲染函数**
`function render(_ctx) { return createVNode('div', { id: _ctx.dynamicId }, [staticVNode]) }`
```ts
// 编译产物
function render(_ctx) {
  return createVNode('div', { id: _ctx.dynamicId }, [
    _hoisted_1 // 静态节点提升
  ], PatchFlags.PROPS, ['id']);
}
```

---

## Slot 优化

**基本写法：编译作用域插槽**
`<slot :<字段>="<值>" />`
```vue
<!-- 插槽编译为函数 -->
<slot :item="item" />
```

---

**基本写法：消费作用域插槽**
`<template #default="{ <字段> }">`
```vue
<!-- 编译为接收 props 的函数 -->
<template #default="{ item }">{{ item.name }}</template>
```

---

## Fragment 多根节点

**基本写法：多根节点编译为 Fragment**
`<><div/><div/></>`
```vue
<!-- 不再需要单一根节点 -->
<template>
  <header>头部</header>
  <main>主体</main>
</template>
```

---

## v-bind 合并

**基本写法：v-bind 对象展开**
`<div v-bind="<对象>">`
```vue
<!-- 编译为合并的 props 对象 -->
<div v-bind="attrs">内容</div>
```

---

## v-model 编译

**基本写法：v-model 编译为 modelValue 与 update**
`<input v-model="<值>" />`
```vue
<!-- 等价于 -->
<input :model-value="value" @update:model-value="value = $event" />
```

---

## 自定义指令编译

**基本写法：指令编译为 withDirectives**
`withDirectives(createVNode(...), [[<指令>, <值>]])`
```vue
<!-- 模板指令 -->
<div v-focus>内容</div>
```

---

## 编译器选项

**基本写法：配置编译选项**
`compilerOptions: { isCustomElement: <fn> }`
```ts
// vite.config.js
vue({
  template: {
    compilerOptions: { isCustomElement: tag => tag.startsWith('x-') }
  }
})
```

---

## 编译模式 ssr

**基本写法：SSR 编译模式**
`compile(<模板>, { ssr: true })`
```ts
// 服务端编译为字符串拼接
import { compile } from 'vue/compiler-ssr';
const render = compile(template, { ssr: true });
```

---

## 性能对比

**基本写法：Vue 3 比 Vue 2 性能提升**
`{ 性能: '提升 1.3~2 倍', 包体积: '减少 40%' }`
```ts
// 编译优化使 Vue 3 渲染更快
// Block + PatchFlag + 静态提升
```

---

## 源码映射

**基本写法：开发环境启用 sourcemap**
`vue({ template: { compilerOptions: { sourceMap: true } } })`
```ts
// 便于调试模板
vue({ template: { compilerOptions: { sourceMap: true } } })
```

---

## 编译错误

**基本写法：编译错误处理**
`compile(<模板>) // 抛出错误`
```ts
// 模板语法错误编译期检测
try {
  compile('<div>');
} catch (e) {
  console.error(e);
}
```

---

## 编译宏

**基本写法：defineProps 与 defineEmits**
`const <props> = defineProps(['<字段>'])`
```vue
<!-- 编译宏无需导入 -->
<script setup>
const props = defineProps(['count']);
const emit = defineEmits(['change']);
</script>
```

---

## defineOptions 宏

**基本写法：script setup 中声明组件选项**
`defineOptions({ name: '<组件名>' })`
```vue
<!-- Vue 3.3+ -->
<script setup>
defineOptions({ name: 'UserCard', inheritAttrs: false });
</script>
```
## shallowRef 浅响应引用

**基本写法：仅 .value 替换触发更新**
`const <ref> = shallowRef(<对象>)`
```ts
// 适合大型不可变结构
const data = shallowRef({ items: [] });
data.value = { items: newArray }; // 触发
data.value.items.push(1); // 不触发
```

---

## triggerRef 强制触发更新

**基本写法：修改 shallowRef 内部后手动触发**
`triggerRef(<shallowRef>)`
```ts
// 浅响应下深度修改后通知
const state = shallowRef({ count: 0 });
state.value.count++;
triggerRef(state);
```

---

## shallowReactive 浅响应对象

**基本写法：仅根属性响应**
`const <state> = shallowReactive(<对象>)`
```ts
// 性能优化避免深层代理
const state = shallowReactive({ foo: 1, nested: { bar: 2 } });
state.foo++; // 响应
state.nested.bar++; // 不响应
```

---

## customRef 自定义 ref

**基本写法：自定义依赖追踪与触发**
`const <ref> = customRef((<track>, <trigger>) => ({ get, set }))`
```ts
// 实现防抖 ref
function useDebouncedRef(value, delay = 200) {
  let timeout;
  return customRef((track, trigger) => ({
    get() { track(); return value; },
    set(newValue) {
      clearTimeout(timeout);
      timeout = setTimeout(() => { value = newValue; trigger(); }, delay);
    }
  }));
}
```

---

## readonly 只读代理

**基本写法：创建只读响应式对象**
`const <ro> = readonly(<reactive对象>)`
```ts
// 防止误修改
const original = reactive({ count: 0 });
const ro = readonly(original);
```

---

## shallowReadonly 浅只读

**基本写法：仅根属性只读**
`const <ro> = shallowReadonly(<对象>)`
```ts
// 根属性只读嵌套可改
const state = shallowReadonly({ foo: 1, nested: { bar: 2 } });
state.foo = 2; // 警告
state.nested.bar = 3; // 允许
```

---

## computed 计算属性

**基本写法：只读计算属性**
`const <c> = computed(() => <计算>)`
```ts
// 自动缓存依赖未变不重算
const double = computed(() => count.value * 2);
```

---

**基本写法：可写计算属性**
`const <c> = computed({ get, set })`
```ts
// 提供 get 与 set
const fullName = computed({
  get: () => `${first.value} ${last.value}`,
  set: (v) => { [first.value, last.value] = v.split(' '); }
});
```

---

**基本写法：调试钩子**
`computed(() => <计算>, { onTrack, onTrigger })`
```ts
// 开发期调试依赖
const c = computed(() => state.count * 2, {
  onTrack(e) { console.log('tracked', e); },
  onTrigger(e) { console.log('triggered', e); }
});
```

---

## watch 侦听器

**基本写法：侦听 ref**
`watch(<ref>, (<new>, <old>) => <逻辑>)`
```ts
// 监听 ref 变化
watch(count, (newVal, oldVal) => console.log(newVal));
```

---

**基本写法：侦听 getter 函数**
`watch(() => <reactive.字段>, <回调>)`
```ts
// 监听 reactive 属性
watch(() => state.count, (n, o) => console.log(n));
```

---

**基本写法：侦听多个源**
`watch([<源1>, <源2>], ([n1, n2]) => <逻辑>)`
```ts
// 同时监听多个源
watch([count, () => state.name], ([n, name]) => console.log(n, name));
```

---

**基本写法：deep 深度监听**
`watch(<源>, <回调>, { deep: true })`
```ts
// 对象深层变化触发
watch(state, (n) => console.log(n), { deep: true });
```

---

**基本写法：immediate 立即执行**
`watch(<源>, <回调>, { immediate: true })`
```ts
// 创建时立即执行一次
watch(count, (n) => init(n), { immediate: true });
```

---

**基本写法：flush 调整时机**
`watch(<源>, <回调>, { flush: 'post' })`
```ts
// post 在 DOM 更新后执行 pre 在更新前
watch(count, cb, { flush: 'post' });
```

---

**基本写法：once 仅触发一次**
`watch(<源>, <回调>, { once: true })`
```ts
// Vue 3.5 新增只监听一次
watch(count, (n) => console.log(n), { once: true });
```

---

**基本写法：暂停恢复监听**
`const { pause, resume } = watch(<源>, <回调>)`
```ts
// Vue 3.5 新增手动控制
const { pause, resume } = watch(count, cb);
pause();
resume();
```

---

## watchEffect 副作用

**基本写法：自动收集依赖**
`watchEffect(() => <副作用>)`
```ts
// 自动追踪内部响应式依赖
watchEffect(() => console.log(state.count));
```

---

**基本写法：清理副作用**
`watchEffect((<onCleanup>) => <逻辑>)`
```ts
// 在重新执行前清理
watchEffect((onCleanup) => {
  const timer = setInterval(tick, 1000);
  onCleanup(() => clearInterval(timer));
});
```

---

**基本写法：调整执行时机**
`watchEffect(() => <副作用>, { flush: 'post' })`
```ts
// pre 默认 post 在 DOM 后 sync 同步
watchEffect(() => updateDOM(), { flush: 'post' });
```

---

## watchPostEffect

**基本写法：post 模式的 watchEffect 简写**
`watchPostEffect(() => <副作用>)`
```ts
// 等价 flush: 'post'
watchPostEffect(() => console.log('DOM 更新后'));
```

---

## watchSyncEffect

**基本写法：同步模式的 watchEffect 简写**
`watchSyncEffect(() => <副作用>)`
```ts
// 等价 flush: 'sync'
watchSyncEffect(() => console.log('同步执行'));
```

---

## toRef 与 toRefs

**基本写法：toRef 单属性转 ref**
`const <ref> = toRef(<reactive>, '<字段>')`
```ts
// 保持响应式关联
const countRef = toRef(state, 'count');
```

---

**基本写法：toRefs 全部属性转 ref**
`const <refs> = toRefs(<reactive>)`
```ts
// 配合解构
const { count, name } = toRefs(state);
```

---

**基本写法：toRef 从普通值创建 ref**
`const <ref> = toRef(<值>)`
```ts
// 等价 ref 但语义更清晰
const r = toRef(1);
```

---

## unref 解包 ref

**基本写法：获取 ref 或原值**
`const <val> = unref(<maybeRef>)`
```ts
// 是 ref 返回 .value 否则原值
const val = unref(maybeRef);
```

---

## isRef isReactive 判断

**基本写法：判断响应式类型**
`isRef(<值>); isReactive(<值>); isProxy(<值>)`
```ts
// 类型守卫
if (isRef(val)) val.value;
if (isReactive(val)) /* */;
```

---

## markRaw 永不代理

**基本写法：标记对象跳过响应式**
`const <raw> = markRaw(<对象>)`
```ts
// 第三方实例避免代理开销
const chart = markRaw(echarts.init(dom));
state.chart = chart;
```

---

## toRaw 获取原始对象

**基本写法：读取代理背后的原始对象**
`const <raw> = toRaw(<reactive>)`
```ts
// 用于调试或传递给非响应式代码
const raw = toRaw(state);
```

---

## effectScope 作用域管理

**基本写法：统一管理 effect 生命周期**
`const <scope> = effectScope()`
```ts
// 集中停止所有 effect
const scope = effectScope();
scope.run(() => {
  watch(count, cb);
  watchEffect(() => /* */);
});
onUnmounted(() => scope.stop());
```

---

## getCurrentScope 当前作用域

**基本写法：获取当前 effect scope**
`const <scope> = getCurrentScope()`
```ts
// 在组合式函数中使用
const scope = getCurrentScope();
```

---

## onScopeDispose 作用域清理

**基本写法：注册作用域销毁回调**
`onScopeDispose(() => <清理>)`
```ts
// 类似 onUnmounted 但作用域级
onScopeDispose(() => clearInterval(timer));
```

---

## 响应式转换工具

**基本写法：使用 reactive 解构 props 保持响应**
`const { <字段> = <默认> } = defineProps(['<字段>'])`
```vue
<!-- Vue 3.5 响应式解构 -->
<script setup>
const { count = 0, msg = 'hi' } = defineProps(['count', 'msg']);
</script>
```

---

## 异步组件与 Suspense

**基本写法：defineAsyncComponent**
`const <comp> = defineAsyncComponent(() => import(<路径>))`
```ts
// 异步加载组件
const Async = defineAsyncComponent(() => import('./Heavy.vue'));
```

---

**基本写法：配置加载状态**
`defineAsyncComponent({ loader, loadingComponent, errorComponent })`
```ts
// 完整配置
const Async = defineAsyncComponent({
  loader: () => import('./Heavy.vue'),
  loadingComponent: Loading,
  errorComponent: Error,
  delay: 200,
  timeout: 3000
});
```
