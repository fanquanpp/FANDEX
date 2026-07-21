---
order: 54
title: Vue3编译优化
module: vue3
category: Vue3
difficulty: advanced
description: 编译时优化与运行时优化
author: fanquanpp
updated: '2026-06-14'
related:
  - vue3/自定义指令进阶
  - vue3/Transition与动画
  - vue3/Vue3服务端渲染
  - vue3/生命周期钩子
prerequisites:
  - vue3/语法速查
---

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
```

```javascript
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
```

```javascript
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
```

```javascript
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
```

```javascript
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
```

```javascript
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
```

```javascript
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
```

```javascript
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
// vue.config.js 或 vite.config.js 中配置编译选项
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
