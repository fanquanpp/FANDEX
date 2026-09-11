---
order: 120
title: Teleport 与 Suspense
module: 'vue3'
category: 前端技术
difficulty: intermediate
description: 传送门与异步组件
author: fanquanpp
updated: '2026-09-12'
related:
  - 'vue3/030-Vue3TemplateSyntax'
  - 'vue3/040-Vue3DirectiveSystem'
  - 'vue3/180-API'
  - 'vue3/170-ProvideInject'
prerequisites: []
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

> 现状提示：Suspense 自 Vue 3.0 起一直标记为实验性，API 已趋稳但官方尚未承诺稳定；生产使用前关注当前版本的官方文档标注。

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
## Teleport 传送门

**Teleport 基础用法**
`<Teleport to="<target>">...</Teleport>`
```vue
<template>
  <Teleport to="body">
    <div class="modal">弹窗内容</div>
  </Teleport>

  <Teleport to="#modals">
    <div>传送到指定容器</div>
  </Teleport>

  <Teleport :to="dynamicTarget">
    <div>动态目标</div>
  </Teleport>
</template>
```

**Teleport 禁用传送**
`<Teleport to="<target>" :disabled="<flag>">`
```vue
<Teleport to="body" :disabled="isInline">
  <div>条件传送</div>
</Teleport>

<script setup>
import { ref } from 'vue';
const isInline = ref(false);
</script>
```

**Teleport 多个目标**
```vue
<Teleport to="body">
  <Modal v-if="showA" />
</Teleport>

<Teleport to="body">
  <Modal v-if="showB" />
</Teleport>
<!-- 多个 Teleport 到同一目标按顺序追加 -->
```

**Teleport 配合组件**
```vue
<template>
  <button @click="show = true">打开</button>
  <Teleport to="body">
    <Modal v-if="show" @close="show = false">
      <h2>标题</h2>
      <p>内容</p>
    </Modal>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue';
import Modal from './Modal.vue';
const show = ref(false);
</script>
```

---

## Teleport 事件与样式

**Teleport 内事件冒泡**
```vue
<template>
  <div @click="onParentClick">
    <Teleport to="body">
      <div @click="onModalClick">点击</div>
      <!-- 点击事件在 DOM 上冒泡到 body,但 Vue 逻辑冒泡仍按组件树 -->
    </Teleport>
  </div>
</template>
```

**Teleport 与样式作用域**
```vue
<style scoped>
.modal {
  background: white;  /* 即使传送走,scoped 样式仍生效 */
}
</style>
```

---

## Suspense 异步组件

**Suspense 基础用法**
```vue
<template>
  <Suspense>
    <template #default>
      <AsyncComponent />
    </template>
    <template #fallback>
      <div>Loading...</div>
    </template>
  </Suspense>
</template>

<script setup>
import { defineAsyncComponent } from 'vue';
const AsyncComponent = defineAsyncComponent(() => import('./Async.vue'));
</script>
```

**Suspense 多异步组件**
```vue
<Suspense>
  <template #default>
    <Header />      <!-- 都是异步组件 -->
    <Content />
    <Footer />
  </template>
  <template #fallback>
    <PageSkeleton />
  </template>
</Suspense>
```

**Suspense 配合 async setup**
```vue
<!-- AsyncPage.vue -->
<script setup>
import { ref } from 'vue';

// setup 可以是 async
const data = await fetch('/api/data').then(r => r.json());
</script>

<template>
  <div>{{ data }}</div>
</template>

<!-- 父组件 -->
<Suspense>
  <AsyncPage />
  <template #fallback>
    <Spinner />
  </template>
</Suspense>
```

---

## Suspense 事件

**Suspense 事件处理**
```vue
<template>
  <Suspense
    @resolve="onResolve"
    @pending="onPending"
    @fallback="onFallback"
  >
    <template #default>
      <AsyncComp />
    </template>
    <template #fallback>
      <Loading />
    </template>
  </Suspense>
</template>

<script setup>
function onResolve() {
  console.log('异步组件加载完成');
}
function onPending() {
  console.log('开始加载异步组件');
}
function onFallback() {
  console.log('显示 fallback');
}
</script>
```

---

## Suspense 嵌套

**Suspense 嵌套**
```vue
<Suspense>
  <template #default>
    <Layout>
      <Suspense>
        <template #default>
          <AsyncWidget />
        </template>
        <template #fallback>
          <WidgetSkeleton />
        </template>
      </Suspense>
    </Layout>
  </template>
  <template #fallback>
    <PageSkeleton />
  </template>
</Suspense>
```

---

## 异步组件加载错误

**defineAsyncComponent 错误处理**
```typescript
import { defineAsyncComponent } from 'vue';

const AsyncComp = defineAsyncComponent({
  loader: () => import('./AsyncComp.vue'),
  loadingComponent: LoadingSpinner,
  errorComponent: ErrorDisplay,
  delay: 200,       // 显示 loading 前延迟
  timeout: 3000,    // 超时显示 error
  onError(err, retry, fail, attempts) {
    if (attempts <= 3) {
      retry();
    } else {
      fail();
    }
  }
});
```

**onErrorCaptured 捕获异步错误**
```vue
<template>
  <Suspense>
    <AsyncComp v-if="!error" />
    <ErrorComp v-else :error="error" />
    <template #fallback>
      <Loading />
    </template>
  </Suspense>
</template>

<script setup>
import { ref, onErrorCaptured } from 'vue';
const error = ref(null);

onErrorCaptured((err) => {
  error.value = err;
  return false;  // 阻止继续向上传递
});
</script>
```

---

## 综合应用

**Modal + Teleport + Transition**
```vue
<template>
  <button @click="open">打开</button>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isOpen" class="modal-mask" @click.self="close">
        <div class="modal">
          <slot />
          <button @click="close">关闭</button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue';
const isOpen = ref(false);
const open = () => { isOpen.value = true; };
const close = () => { isOpen.value = false; };
</script>

<style>
.modal-enter-active, .modal-leave-active {
  transition: opacity 0.3s;
}
.modal-enter-from, .modal-leave-to {
  opacity: 0;
}
</style>
```

**异步数据 + Suspense + Skeleton**
```vue
<!-- AsyncList.vue -->
<script setup>
const items = await fetch('/api/items').then(r => r.json());
</script>

<template>
  <ul>
    <li v-for="item in items" :key="item.id">{{ item.name }}</li>
  </ul>
</template>

<!-- 父组件 -->
<template>
  <Suspense>
    <AsyncList />
    <template #fallback>
      <ul>
        <li v-for="n in 5" :key="n" class="skeleton">Loading...</li>
      </ul>
    </template>
  </Suspense>
</template>
```

---

## 常见陷阱

| 陷阱 | 原因 | 正确做法 |
| --- | --- | --- |
| Teleport 目标渲染时报错找不到节点 | 目标元素在 Teleport 挂载时尚不存在 | 保证目标先渲染，或用 Vue 3.5 的 `<Teleport defer>` 延迟到下一轮渲染 |
| Teleport 内容丢失父组件 scoped 样式 | scoped 属性选择器基于 data 标记，传送后仍生效，但深层子组件样式不继承 | 样式随组件走（写在子组件内），或把样式挂到目标容器 |
| 弹窗内点击"意外"触发了页面其他元素 | 传送后 DOM 冒泡走真实 DOM 树，不再经过原位置父级 | 事件逻辑放在 Teleport 内部组件中，不要依赖原位置的父级监听 |
| async setup 组件没写 Suspense 直接使用 | 父组件不知道要等待异步 setup | async setup 组件必须包在 `<Suspense>` 中使用 |
| 把 defineAsyncComponent 当成 Suspense 替代品 | 两者作用不同：前者处理"加载哪个组件"，后者协调"渲染前等待" | 路由级代码分割用 defineAsyncComponent；async setup 数据等待用 Suspense |
