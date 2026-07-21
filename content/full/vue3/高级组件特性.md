---
order: 120
tags:
  - vue3
difficulty: advanced
title: 'Vue3 高级组件特性'
module: vue3
category: 'Vue3 Basics'
description: '异步组件、动态组件、Teleport 与 Suspense。'
author: fanquanpp
updated: '2026-05-03'
related:
  - vue3/Vue性能优化详解
  - vue3/性能优化
  - 'vue3/项目示例-个人博客站点'
  - vue3/理论知识点
prerequisites:
  - vue3/语法速查
---

## 1. 动态组件

### 1.1 基本用法

**作用**：根据条件动态渲染不同的组件
**用法**：

```vue
<template>
  <div>
    <button @click="currentComponent = 'ComponentA'">组件 A</button>
    <button @click="currentComponent = 'ComponentB'">组件 B</button>
    <button @click="currentComponent = 'ComponentC'">组件 C</button>
    <component :is="currentComponent" />
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import ComponentA from './ComponentA.vue';
import ComponentB from './ComponentB.vue';
import ComponentC from './ComponentC.vue';
const currentComponent = ref('ComponentA');
</script>
```

**组件定义**：

```vue
<!-- ComponentA.vue -->
<template>
  <div class="component">
    <h3>组件 A</h3>
    <p>这是组件 A 的内容</p>
  </div>
</template>
<style scoped>
.component {
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
  margin-top: 20px;
  background-color: #f9f9f9;
}
</style>
```

### 1.2 动态组件的传参

```vue
<template>
  <div>
    <button @click="currentComponent = 'ComponentA'">组件 A</button>
    <button @click="currentComponent = 'ComponentB'">组件 B</button>
    <component :is="currentComponent" :message="message" @update="handleUpdate" />
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import ComponentA from './ComponentA.vue';
import ComponentB from './ComponentB.vue';
const currentComponent = ref('ComponentA');
const message = ref('Hello from parent');
function handleUpdate(newMessage: string) {
  message.value = newMessage;
}
</script>
```

### 1.3 动态组件的缓存

```vue
<template>
  <div>
    <button @click="currentComponent = 'ComponentA'">组件 A</button>
    <button @click="currentComponent = 'ComponentB'">组件 B</button>
    <keep-alive>
      <component :is="currentComponent" />
    </keep-alive>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import ComponentA from './ComponentA.vue';
import ComponentB from './ComponentB.vue';
const currentComponent = ref('ComponentA');
</script>
```

## 2. 异步组件

### 2.1 基本用法

**作用**：按需加载组件，提高初始加载性能
**用法**：

```vue
<template>
  <div>
    <h1>异步组件示例</h1>
    <button @click="showAsyncComponent = ">加载异步组件</button>
    <div v-if="showAsyncComponent">
      <AsyncComponent />
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, defineAsyncComponent } from 'vue'
const showAsyncComponent = ref(false)
// 定义异步组件
const AsyncComponent = defineAsyncComponent({
 loader: () => import('./AsyncComponent.vue'),
 loadingComponent: () => <div>加载中...</div>,
 errorComponent: () => <div>加载失败</div>,
 delay: 200,
 timeout: 3000
}
</script>
```

### 2.2 高级配置

```vue
<template>
  <div>
    <h1>异步组件高级配置</h1>
    <AsyncComponentWithOptions />
  </div>
</template>
<script setup lang="ts">
import { defineAsyncComponent } from 'vue'
const AsyncComponentWithOptions = defineAsyncComponent({
 // 加载组件的函数
 loader: () => import('./HeavyComponent.vue'),
 // 加载过程中显示的组件
 loadingComponent: {
 template: '<div class="loading">加载中，请稍候...</div>'
 },
 // 加载失败时显示的组件
 errorComponent: {
 template: '<div class="error">加载失败，请重试</div>'
 },
 // 延迟显示加载组件的时间（毫秒）
 delay: 300,
 // 超时时间（毫秒）
 timeout: 5000,
 // 是否在组件加载失败时重试
 suspensible: false
}
</script>
<style scoped>
.loading {
  padding: 20px;
  text-align: center;
  color: #666;
}
.error {
  padding: 20px;
  text-align: center;
  color: #e74c3c;
}
</style>
```

## 3. 递归组件

### 3.1 基本用法

**作用**：组件可以递归调用自身，适用于树形结构等场景
**用法**：

```vue
<template>
  <div class="tree-node">
    <div class="node-content" @click="toggleExpanded">
      {{ node.name }}
      <span v-if="node.children && node.children.length > 0">
        {{ expanded ? '▼' : '▶' }}
      </span>
    </div>
    <div v-if="node.children && node.children.length > 0 && expanded" class="node-children">
      <TreeView v-for="child in node.children" :key="child.id" :node="child" />
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue';
const props = defineProps<{
  node: {
    id: number;
    name: string;
    children?: Array<{
      id: number;
      name: string;
      children?: Array<any>;
    }>;
  };
  ;
}>();
const expanded = ref(false);
function toggleExpanded() {
  expanded.value = !expanded.value;
  ;
}
</script>
<style scoped>
.tree-node {
  margin-left: 20px;
}
.node-content {
  cursor: pointer;
  padding: 5px;
  border-radius: 4px;
  transition: background-color 0.3s;
}
.node-content:hover {
  background-color: #f0f0f0;
}
.node-children {
  margin-top: 5px;
}
</style>
```

### 3.2 使用场景

```vue
<template>
  <div class="tree-view">
    <h2>树形结构示例</h2>
    <TreeView :node="treeData" />
  </div>
</template>
<script setup lang="ts">
import TreeView from './TreeView.vue';
const treeData = {
  id: 1,
  name: '根节点',
  children: [
    {
      id: 2,
      name: '子节点 1',
      children: [
        {
          id: 3,
          name: '孙节点 1-1',
        },
        {
          id: 4,
          name: '孙节点 1-2',
        },
      ],
    },
    {
      id: 5,
      name: '子节点 2',
      children: [
        {
          id: 6,
          name: '孙节点 2-1',
        },
      ],
    },
  ],
};
</script>
<style scoped>
.tree-view {
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background-color: #f9f9f9;
}
</style>
```

## 4. 函数式组件

### 4.1 基本用法

**作用**：无状态、无实例的组件，性能更高
**用法**：

```vue
<template>
  <div>
    <h2>函数式组件示例</h2>
    <FunctionalComponent :message="message" />
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import FunctionalComponent from './FunctionalComponent.vue';
const message = ref('Hello from parent');
</script>
```

**函数式组件定义**：

```vue
<script setup lang="ts">
import { defineProps } from 'vue';
const props = defineProps<{
  message: string;
  ;
}>();
</script>
<template>
  <div class="functional-component">
    <p>{{ message }}</p>
    <p>这是一个函数式组件</p>
  </div>
</template>
<style scoped>
.functional-component {
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background-color: #f9f9f9;
}
</style>
```

## 5. 组件插槽

### 5.1 基本插槽

**作用**：允许父组件向子组件注入内容
**用法**：

```vue
<template>
  <div>
    <h2>插槽示例</h2>
    <SlotComponent>
      <p>这是插槽内容</p>
    </SlotComponent>
  </div>
</template>
<script setup lang="ts">
import SlotComponent from './SlotComponent.vue';
</script>
```

**插槽组件定义**：

```vue
<template>
  <div class="slot-component">
    <h3>插槽组件</h3>
    <slot></slot>
  </div>
</template>
<style scoped>
.slot-component {
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background-color: #f9f9f9;
}
</style>
```

### 5.2 具名插槽

```vue
<template>
  <div>
    <h2>具名插槽示例</h2>
    <NamedSlotComponent>
      <template #header>
        <h3>自定义头部</h3>
      </template>
      <template #content>
        <p>自定义内容</p>
        <p>更多内容</p>
      </template>
      <template #footer>
        <p>自定义底部</p>
      </template>
    </NamedSlotComponent>
  </div>
</template>
<script setup lang="ts">
import NamedSlotComponent from './NamedSlotComponent.vue';
</script>
```

**具名插槽组件定义**：

```vue
<template>
  <div class="named-slot-component">
    <div class="header">
      <slot name="header">默认头部</slot>
    </div>
    <div class="content">
      <slot name="content">默认内容</slot>
    </div>
    <div class="footer">
      <slot name="footer">默认底部</slot>
    </div>
  </div>
</template>
<style scoped>
.named-slot-component {
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background-color: #f9f9f9;
}
.header {
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
}
.content {
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
}
.footer {
  margin-top: 10px;
}
</style>
```

### 5.3 作用域插槽

```vue
<template>
  <div>
    <h2>作用域插槽示例</h2>
    <ScopedSlotComponent>
      <template #item="{ item }">
        <li class="custom-item">{{ item.id }}: {{ item.name }}</li>
      </template>
    </ScopedSlotComponent>
  </div>
</template>
<script setup lang="ts">
import ScopedSlotComponent from './ScopedSlotComponent.vue';
</script>
<style scoped>
.custom-item {
  padding: 5px;
  border-bottom: 1px solid #eee;
}
</style>
```

**作用域插槽组件定义**：

```vue
<template>
  <div class="scoped-slot-component">
    <h3>作用域插槽组件</h3>
    <ul>
      <slot v-for="item in items" :key="item.id" name="item" :item="item">
        {{ item.name }}
      </slot>
    </ul>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue'
const items = ref([
 { id: 1, name: '项目 1' },
 { id: 2, name: '项目 2' },
 { id: 3, name: '项目 3' }
]
</script>
<style scoped>
.scoped-slot-component {
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background-color: #f9f9f9;
}
ul {
  list-style: none;
  padding: 0;
  margin: 0;
}
</style>
```

## 6. 组件继承

### 6.1 基本用法

**作用**：通过组合式 API 实现组件逻辑的复用
**用法**：

```vue
<template>
  <div class="base-component">
    <h3>{{ title }}</h3>
    <p>{{ message }}</p>
    <button @click="handleClick">点击我</button>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue';
const props = defineProps<{
  title: string;
  message: string;
  ;
}>();
const emit = defineEmits<{
  (e: 'click'): void;
  ;
}>();
function handleClick() {
  emit('click');
  ;
}
</script>
<style scoped>
.base-component {
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background-color: #f9f9f9;
}
</style>
```

**继承组件**：

```vue
<template>
  <div class="extended-component">
    <BaseComponent :title="title" :message="message" @click="handleBaseClick" />
    <p>这是扩展内容</p>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import BaseComponent from './BaseComponent.vue';
const title = ref('扩展组件');
const message = ref('这是扩展组件的消息');
function handleBaseClick() {
  console.log('Base component clicked');
}
</script>
<style scoped>
.extended-component {
  padding: 20px;
  border: 1px solid #42b983;
  border-radius: 8px;
  background-color: #f0f9f0;
}
</style>
```

## 7. 组件的 provide/inject

### 7.1 基本用法

**作用**：实现组件之间的依赖注入，避免 props 层层传递
**用法**：

```vue
<template>
  <div class="parent-component">
    <h2>父组件</h2>
    <ChildComponent />
  </div>
</template>
<script setup lang="ts">
import { provide } from 'vue'
import ChildComponent from './ChildComponent.vue'
// 提供数据
provide('message', 'Hello from parent')
provide('user', {
 name: '张三',
 age: 20
}
</script>
<style scoped>
.parent-component {
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background-color: #f9f9f9;
}
</style>
```

**子组件**：

```vue
<template>
  <div class="child-component">
    <h3>子组件</h3>
    <p>{{ injectedMessage }}</p>
    <p>用户名: {{ injectedUser.name }}</p>
    <p>年龄: {{ injectedUser.age }}</p>
    <GrandchildComponent />
  </div>
</template>
<script setup lang="ts">
import { inject } from 'vue';
import GrandchildComponent from './GrandchildComponent.vue';
// 注入数据
const injectedMessage = inject('message', '默认消息');
const injectedUser = inject('user', { name: '默认用户', age: 0 });
</script>
<style scoped>
.child-component {
  padding: 20px;
  border: 1px solid #3498db;
  border-radius: 8px;
  background-color: #f0f8ff;
  margin-top: 10px;
}
</style>
```

**孙组件**：

```vue
<template>
  <div class="grandchild-component">
    <h4>孙组件</h4>
    <p>{{ injectedMessage }}</p>
    <p>用户名: {{ injectedUser.name }}</p>
  </div>
</template>
<script setup lang="ts">
import { inject } from 'vue';
// 注入数据
const injectedMessage = inject('message', '默认消息');
const injectedUser = inject('user', { name: '默认用户', age: 0 });
</script>
<style scoped>
.grandchild-component {
  padding: 20px;
  border: 1px solid #e74c3c;
  border-radius: 8px;
  background-color: #fff0f0;
  margin-top: 10px;
}
</style>
```

## 8. 组件的生命周期钩子

### 8.1 常用生命周期钩子

```vue
<template>
  <div class="lifecycle-component">
    <h2>生命周期钩子示例</h2>
    <p>组件状态: {{ status }}</p>
    <button @click="updateMessage">更新消息</button>
  </div>
</template>
<script setup lang="ts">
import {
  ref,
  onMounted,
  onUpdated,
  onUnmounted,
  onBeforeMount,
  onBeforeUpdate,
  onBeforeUnmount,
} from 'vue';
const status = ref('创建中');
const message = ref('初始消息');
// 组件挂载前
onBeforeMount(() => {
  status.value = '挂载前';
  console.log('组件挂载前');
});
// 组件挂载后
onMounted(() => {
  status.value = '已挂载';
  console.log('组件挂载后');
});
// 组件更新前
onBeforeUpdate(() => {
  console.log('组件更新前');
});
// 组件更新后
onUpdated(() => {
  console.log('组件更新后');
});
// 组件卸载前
onBeforeUnmount(() => {
  status.value = '卸载前';
  console.log('组件卸载前');
});
// 组件卸载后
onUnmounted(() => {
  console.log('组件卸载后');
});
function updateMessage() {
  message.value = '更新后的消息';
}
</script>
<style scoped>
.lifecycle-component {
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background-color: #f9f9f9;
}
</style>
```

## 9. 组件的错误处理

### 9.1 错误边界

**作用**：捕获组件树中的错误，防止整个应用崩溃
**用法**：

```vue
<template>
  <div class="error-boundary">
    <h2>错误边界示例</h2>
    <ErrorBoundary>
      <BuggyComponent />
    </ErrorBoundary>
  </div>
</template>
<script setup lang="ts">
import ErrorBoundary from './ErrorBoundary.vue';
import BuggyComponent from './BuggyComponent.vue';
</script>
<style scoped>
.error-boundary {
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background-color: #f9f9f9;
}
</style>
```

**错误边界组件**：

```vue
<template>
  <div>
    <slot v-if="!hasError"></slot>
    <div v-else class="error-message">
      <h3>发生错误</h3>
      <p>{{ error.message }}</p>
      <button @click="resetError">重试</button>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, onErrorCaptured } from 'vue';
const hasError = ref(false);
const error = ref<Error | null>(null);
onErrorCaptured((err) => {
  hasError.value = error.value = err as Error;
  return; // 阻止错误继续传播
});
function resetError() {
  hasError.value = false;
  error.value = null;
}
</script>
<style scoped>
.error-message {
  padding: 20px;
  border: 1px solid #e74c3c;
  border-radius: 8px;
  background-color: #fff0f0;
  color: #e74c3c;
}
</style>
```

**有 bug 的组件**：

```vue
<template>
  <div class="buggy-component">
    <h3>有 bug 的组件</h3>
    <button @click="triggerError">触发错误</button>
  </div>
</template>
<script setup lang="ts">
function triggerError() {
  // 故意触发错误
  throw new Error('这是一个测试错误');
}
</script>
<style scoped>
.buggy-component {
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background-color: #f9f9f9;
}
</style>
```

## 10. 最佳实践

### 10.1 组件设计原则

- **单一职责**：每个组件只负责一个功能
- **可复用性**：设计通用的、可复用的组件
- **可维护性**：代码结构清晰，易于理解和维护
- **性能优化**：合理使用 `v-memo`、`keep-alive` 等优化性能
- **类型安全**：使用 TypeScript 为组件添加类型

### 10.2 高级组件使用建议

- **动态组件**：用于根据条件渲染不同的组件
- **异步组件**：用于按需加载大型组件，提高初始加载性能
- **递归组件**：用于树形结构等递归场景
- **函数式组件**：用于无状态、纯展示的组件
- **插槽**：用于组件内容的定制化
- **provide/inject**：用于组件间的依赖注入
- **错误边界**：用于捕获和处理组件错误

### 10.3 性能优化

- **合理使用 keep-alive**：缓存组件状态，减少重复渲染
- **使用异步组件**：按需加载组件，减少初始包大小
- **组件拆分**：将复杂组件拆分为更小的、可复用的组件
- **避免不必要的渲染**：使用 `v-memo`、计算属性等优化渲染性能
- **事件监听清理**：在组件卸载时清理事件监听器

## 11. 总结

Vue3 的高级组件特性为开发者提供了强大的工具，从动态组件、异步组件到递归组件、插槽等，使开发者可以构建更加灵活、高效的应用。通过本教程的学习，你应该已经掌握了 Vue3 高级组件特性的基本使用方法和最佳实践，可以在实际项目中灵活运用。
