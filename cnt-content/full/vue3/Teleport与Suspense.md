---
order: 50
title: Teleport与Suspense
module: vue3
category: Vue3
difficulty: intermediate
description: 传送门与异步组件
author: fanquanpp
updated: '2026-06-14'
related:
  - vue3/模板语法
  - vue3/指令系统
  - vue3/组合式API
  - vue3/Provide与Inject
prerequisites:
  - vue3/语法速查
---

## 1. Teleport

### 1.1 基本用法

Teleport 允许将组件模板的一部分"传送"到 DOM 中的其他位置：

```vue
<template>
  <button @click="showModal = true">打开弹窗</button>

  <Teleport to="body">
    <div v-if="showModal" class="modal">
      <p>这是一个模态框</p>
      <button @click="showModal = false">关闭</button>
    </div>
  </Teleport>
</template>
```

### 1.2 to 属性

```vue
<!-- 传送到 body -->
<Teleport to="body">

<!-- 传送到指定选择器 -->
<Teleport to="#modals">

<!-- 传送到指定元素 -->
<Teleport :to="targetElement">
```

### 1.3 disabled 属性

```vue
<!-- 条件性传送 -->
<Teleport to="body" :disabled="isMobile">
  <!-- 移动端不传送，桌面端传送 -->
</Teleport>
```

### 1.4 多个 Teleport 共享目标

多个 Teleport 传送到同一目标时，按渲染顺序追加。

## 2. Suspense

### 2.1 基本用法

```vue
<template>
  <Suspense>
    <template #default>
      <AsyncComponent />
    </template>
    <template #fallback>
      <LoadingSpinner />
    </template>
  </Suspense>
</template>
```

### 2.2 异步组件

```javascript
// defineAsyncComponent
const AsyncComp = defineAsyncComponent(() => import('./HeavyComponent.vue'));

// 带 options
const AsyncComp = defineAsyncComponent({
  loader: () => import('./HeavyComponent.vue'),
  loadingComponent: LoadingSpinner,
  errorComponent: ErrorDisplay,
  delay: 200,
  timeout: 3000,
});
```

### 2.3 异步 setup

```vue
<script setup>
// async setup 组件会触发 Suspense
const data = await fetch('/api/data').then((r) => r.json());
</script>
```

### 2.4 Suspense 事件

```vue
<Suspense @pending="onPending" @resolve="onResolve" @fallback="onFallback">
  <AsyncComponent />
</Suspense>
```

### 2.5 嵌套 Suspense

```vue
<Suspense>
  <Header />
  <Suspense>
    <AsyncContent />
  </Suspense>
</Suspense>
```
