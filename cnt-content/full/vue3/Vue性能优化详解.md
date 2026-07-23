---
order: 108
title: Vue性能优化详解
module: vue3
category: 'dev-lang'
difficulty: advanced
description: 'Vue 3性能优化详解：虚拟滚动、shallowRef、冻结数据、v-memo。'
author: fanquanpp
updated: '2026-06-14'
related:
  - vue3/Pinia持久化插件
  - 'vue3/Vue-Router导航守卫'
  - vue3/性能优化
  - vue3/高级组件特性
prerequisites:
  - vue3/语法速查
---

## 1. 响应式优化

### 1.1 shallowRef

```javascript
// 大型对象不需要深层响应式
const bigData = shallowRef(loadHugeDataset());
// 只有 .value 赋值才触发更新
bigData.value = newData; // 触发
bigData.value.items.push(x); // 不触发
```

### 1.2 shallowReactive

```javascript
const state = shallowReactive({
  items: [], // 不是响应式的
  count: 0, // 是响应式的（根级属性）
});
```

### 1.3 markRaw

```javascript
const staticData = markRaw(largeObject);
// 永远不会转为响应式
```

### 1.4 Object.freeze

```javascript
const frozenList = Object.freeze(hugeArray);
const items = ref(frozenList); // 跳过深层响应式转换
```

## 2. 渲染优化

### 2.1 v-memo

```html
<div v-for="item in list" :key="item.id" v-memo="[item.selected]">
  <!-- 仅 item.selected 变化时重新渲染 -->
  <ExpensiveComponent :data="item" />
</div>
```

### 2.2 v-once

```html
<h1 v-once>{{ title }}</h1>
<!-- 只渲染一次，后续更新跳过 -->
```

### 2.3 虚拟滚动

```html
<template v-for="item in visibleItems" :key="item.id">
  <div :style="{ transform: `translateY(${offset}px)` }">{{ item.content }}</div>
</template>
```

推荐库：`vue-virtual-scroller`、`vue3-virtual-scroll-list`

## 3. 组件优化

### 3.1 异步组件

```javascript
const HeavyChart = defineAsyncComponent(() => import('./HeavyChart.vue'));
```

### 3.2 KeepAlive

```html
<KeepAlive :include="['UserList', 'Settings']">
  <RouterView />
</KeepAlive>
```

## 4. 编译优化

Vue 3 编译器自动优化：

- 静态提升（Static Hoisting）
- 补丁标记（Patch Flags）
- 块级树（Block Tree）
- 静态属性提升
