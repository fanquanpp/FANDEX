---
order: 70
tags:
  - vue3
difficulty: intermediate
title: 组件系统
module: vue3
category: 'Vue3 Basics'
description: Vue3组件系统与通信机制
author: fanquanpp
updated: '2026-05-03'
related:
  - vue3/响应式系统
  - vue3/自定义Hook
  - vue3/TypeScript集成
  - vue3/Pinia状态管理详解
prerequisites:
  - vue3/语法速查
---

## 1. 组件系统概述 | Component System Overview

组件是 Vue3 应用的基本构建块，它允许我们将 UI 拆分为独立、可复用的部分。Vue3 的组件系统提供了一种清晰的方式来组织和管理应用的 UI 结构，使代码更加模块化、可维护。

### 1.1 组件的特点

- **封装性**：组件将模板、逻辑和样式封装在一起
- **可复用性**：组件可以在多个地方重复使用
- **组合性**：组件可以嵌套组合，形成复杂的 UI 结构
- **可维护性**：组件化使代码更加清晰、易于维护

### 1.2 组件的类型

- **全局组件**：在整个应用中可用
- **局部组件**：只在特定组件中可用
- **单文件组件**：使用 `.vue` 文件格式，包含模板、脚本和样式

## 2. 单文件组件 | Single-File Components

单文件组件（SFC）是 Vue3 推荐的组件编写方式，它使用 `.vue` 文件格式，包含三个部分：

- `<template>`：组件的模板
- `<script>`：组件的逻辑
- `<style>`：组件的样式

### 2.1 基本结构

```vue
<template>
  <div class="component">
    <h2>{{ title }}</h2>
    <p>{{ message }}</p>
    <button @click="handleClick">Click me</button>
  </div>
</template>
<script setup>
import { ref } from 'vue';
const title = ref('Hello');
const message = ref('Welcome to Vue3');
const handleClick = () => {
  message.value = 'You clicked the button!';
};
</script>
<style scoped>
.component {
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
}
h2 {
  color: #42b983;
}
button {
  padding: 5px 10px;
  background-color: #42b983;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
</style>
```

### 2.2 script setup 语法

Vue3.2+ 提供了 `script setup` 语法糖，使组件的编写更加简洁：

- 不需要导出组件
- 直接在模板中使用定义的变量和函数
- 自动注册导入的组件

## 3. 组件的 props

Props 是组件的输入数据，允许父组件向子组件传递数据。

### 3.1 基本用法

```vue
<!-- ChildComponent.vue -->
<template>
  <div class="child">
    <h3>{{ title }}</h3>
    <p>{{ message }}</p>
  </div>
</template>
<script setup>
defineProps({
 title: String,
 message: {
 type: String,
 default: 'Default message'
 }
}
</script>
<!-- ParentComponent.vue -->
<template>
  <div class="parent">
    <ChildComponent title="Hello from parent" message="This is a prop" />
  </div>
</template>
<script setup>
import ChildComponent from './ChildComponent.vue';
</script>
```

### 3.2 Props 验证

```vue
<script setup>
defineProps({
 // 基本类型
 title: String,
 count: Number,
 isActive: Boolean,
 items: Array,
 user: Object,
 callback: Function,
 // 带默认值
 message: {
 type: String,
 default: 'Default message'
 },
 // 必需的
 requiredProp: {
 type: String,
 required:
 },
 // 自定义验证
 customProp: {
 validator: (value) => {
 return ['option1', 'option2'].includes(value)
 }
 }
}
</script>
```

## 4. 组件的事件

事件允许子组件向父组件传递消息。

### 4.1 基本用法

```vue
<!-- ChildComponent.vue -->
<template>
  <div class="child">
    <button @click="handleClick">Click me</button>
  </div>
</template>
<script setup>
const emit = defineEmits(['click', 'custom-event']);
const handleClick = () => {
  emit('click', 'Button clicked');
  emit('custom-event', { data: 'Custom event data' });
};
</script>
<!-- ParentComponent.vue -->
<template>
  <div class="parent">
    <ChildComponent @click="handleChildClick" @custom-event="handleCustomEvent" />
  </div>
</template>
<script setup>
import ChildComponent from './ChildComponent.vue';
const handleChildClick = (message) => {
  console.log('Child clicked:', message);
};
const handleCustomEvent = (data) => {
  console.log('Custom event:', data);
};
</script>
```

### 4.2 事件验证

```vue
<script setup>
const emit = defineEmits({
 // 基本事件
 click: null,
 // 带参数验证的事件
 'update:count': (value) => {
 return typeof value === 'number'
 }
}
</script>
```

## 5. 组件的插槽

插槽允许父组件向子组件的特定位置插入内容。

### 5.1 基本插槽

```vue
<!-- ChildComponent.vue -->
<template>
  <div class="child">
    <h3>Child Component</h3>
    <slot></slot>
  </div>
</template>
<!-- ParentComponent.vue -->
<template>
  <div class="parent">
    <ChildComponent>
      <p>This content is inserted into the slot</p>
    </ChildComponent>
  </div>
</template>
```

### 5.2 具名插槽

```vue
<!-- ChildComponent.vue -->
<template>
  <div class="child">
    <header>
      <slot name="header"></slot>
    </header>
    <main>
      <slot></slot>
    </main>
    <footer>
      <slot name="footer"></slot>
    </footer>
  </div>
</template>
<!-- ParentComponent.vue -->
<template>
  <div class="parent">
    <ChildComponent>
      <template #header>
        <h2>Page Header</h2>
      </template>
      <p>Main content goes here</p>
      <template #footer>
        <p>Page Footer</p>
      </template>
    </ChildComponent>
  </div>
</template>
```

### 5.3 作用域插槽

```vue
<!-- ChildComponent.vue -->
<template>
  <div class="child">
    <ul>
      <li v-for="item in items" :key="item.id">
        <slot :item="item">{{ item.name }}</slot>
      </li>
    </ul>
  </div>
</template>
<script setup>
import { ref } from 'vue'
const items = ref([
 { id: 1, name: 'Item 1' },
 { id: 2, name: 'Item 2' },
 { id: 3, name: 'Item 3' }
]
</script>
<!-- ParentComponent.vue -->
<template>
  <div class="parent">
    <ChildComponent>
      <template #default="{ item }">
        <strong>{{ item.id }}: {{ item.name }}</strong>
      </template>
    </ChildComponent>
  </div>
</template>
```

## 6. 组件的生命周期

组件的生命周期包括创建、挂载、更新、卸载等阶段，我们可以在这些阶段执行相应的逻辑。

### 6.1 生命周期钩子

| 钩子函数            | 描述               |
| :------------------ | :----------------- |
| `onMounted`         | 组件挂载后         |
| `onUpdated`         | 组件更新后         |
| `onUnmounted`       | 组件卸载后         |
| `onBeforeMount`     | 组件挂载前         |
| `onBeforeUpdate`    | 组件更新前         |
| `onBeforeUnmount`   | 组件卸载前         |
| `onErrorCaptured`   | 捕获子组件错误     |
| `onRenderTracked`   | 响应式依赖被追踪时 |
| `onRenderTriggered` | 响应式依赖被触发时 |

### 6.2 使用生命周期钩子

```vue
<template>
  <div class="component">
    <h2>{{ title }}</h2>
    <p>{{ message }}</p>
  </div>
</template>
<script setup>
import { ref, onMounted, onUpdated, onUnmounted } from 'vue';
const title = ref('Hello');
const message = ref('Welcome to Vue3');
onMounted(() => {
  console.log('Component mounted');
  // 执行初始化逻辑
});
onUpdated(() => {
  console.log('Component updated');
  // 执行更新后逻辑
});
onUnmounted(() => {
  console.log('Component unmounted');
  // 执行清理逻辑
});
</script>
```

## 7. 组件的通信

### 7.1 父子组件通信

- **Props**：父组件向子组件传递数据
- **Events**：子组件向父组件传递消息
- **Refs**：父组件访问子组件的实例或 DOM 元素

### 7.2 跨组件通信

- **Provide/Inject**：祖先组件向后代组件传递数据
- **Pinia/Vuex**：状态管理库
- **Event Bus**：事件总线

### 7.3 Provide/Inject 示例

```vue
<!-- GrandparentComponent.vue -->
<script setup>
import { provide, ref } from 'vue';
import ParentComponent from './ParentComponent.vue';
const theme = ref('light');
const changeTheme = () => {
  theme.value = theme.value === 'light' ? 'dark' : 'light';
};
provide('theme', theme);
provide('changeTheme', changeTheme);
</script>
<!-- ChildComponent.vue -->
<script setup>
import { inject } from 'vue';
const theme = inject('theme', 'light');
const changeTheme = inject('changeTheme');
</script>
<template>
  <div :class="theme">
    <p>Current theme: {{ theme }}</p>
    <button @click="changeTheme">Change theme</button>
  </div>
</template>
<style scoped>
.light {
  background-color: white;
  color: black;
}
.dark {
  background-color: black;
  color: white;
}
</style>
```

## 8. 组件的高级特性

### 8.1 动态组件

```vue
<template>
  <div class="dynamic-component">
    <button @click="currentComponent = 'ComponentA'">Component A</button>
    <button @click="currentComponent = 'ComponentB'">Component B</button>
    <component :is="currentComponent"></component>
  </div>
</template>
<script setup>
import { ref } from 'vue';
import ComponentA from './ComponentA.vue';
import ComponentB from './ComponentB.vue';
const currentComponent = ref('ComponentA');
</script>
```

### 8.2 异步组件

```vue
<template>
  <div class="async-component">
    <Suspense>
      <template #default>
        <AsyncComponent />
      </template>
      <template #fallback>
        <p>Loading...</p>
      </template>
    </Suspense>
  </div>
</template>
<script setup>
import { defineAsyncComponent } from 'vue'
const AsyncComponent = defineAsyncComponent({
 loader: () => import('./AsyncComponent.vue'),
 loadingComponent: () => '<p>Loading...</p>',
 errorComponent: () => '<p>Error</p>',
 delay: 200,
 timeout: 3000
}
</script>
```

### 8.3 递归组件

```vue
<template>
  <div class="tree-node">
    <div class="node-content" @click="toggle">
      {{ node.name }}
    </div>
    <div v-if="isOpen && node.children" class="node-children">
      <TreeNode v-for="child in node.children" :key="child.id" :node="child" />
    </div>
  </div>
</template>
<script setup>
import { ref } from 'vue'
const props = defineProps({
 node: Object
}
const isOpen = ref(false)
const toggle = () => {
 isOpen.value = !isOpen.value
}
</script>
<style scoped>
.tree-node {
  margin-left: 20px;
}
.node-content {
  cursor: pointer;
  padding: 5px;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin: 5px 0;
}
.node-content:hover {
  background-color: #f0f0f0;
}
.node-children {
  margin-top: 5px;
}
</style>
```

## 9. 组件的最佳实践

### 9.1 组件设计原则

- **单一职责**：每个组件只负责一个功能
- **可复用性**：设计通用的、可复用的组件
- **可维护性**：代码清晰、易于理解和维护
- **性能优化**：避免不必要的渲染和计算

### 9.2 组件命名规范

- **组件名**：使用 PascalCase（大驼峰）命名
- **文件名**：使用 PascalCase 命名，与组件名一致
- **props 名**：使用 camelCase（小驼峰）命名
- **事件名**：使用 kebab-case（短横线分隔）命名

### 9.3 组件样式规范

- **使用 scoped**：避免样式冲突
- **使用 CSS 变量**：便于主题切换
- **使用 BEM 命名**：提高样式的可维护性
- **避免使用深度选择器**：保持组件的封装性

### 9.4 性能优化

- **使用 v-memo**：缓存计算结果
- **使用 v-once**：只渲染一次
- **使用 keep-alive**：缓存组件状态
- **使用 shallowRef 和 shallowReactive**：减少响应式开销
- **避免在模板中使用复杂表达式**：使用计算属性

## 10. 示例 | Examples

### 10.1 基础组件示例

```vue
<!-- Button.vue -->
<template>
  <button
    :class="['btn', `btn-${variant}`, { 'btn-disabled': disabled }]"
    :disabled="disabled"
    @click="$emit('click')"
  >
    <slot></slot>
  </button>
</template>
<script setup>
defineProps({
 variant: {
 type: String,
 default: 'primary',
 validator: (value) => {
 return ['primary', 'secondary', 'success', 'danger'].includes(value)
 }
 },
 disabled: {
 type: Boolean,
 default: false
 }
}
defineEmits(['click'])
</script>
<style scoped>
.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}
.btn-primary {
  background-color: #42b983;
  color: white;
}
.btn-secondary {
  background-color: #999;
  color: white;
}
.btn-success {
  background-color: #28a745;
  color: white;
}
.btn-danger {
  background-color: #dc3545;
  color: white;
}
.btn-disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
```

### 10.2 复杂组件示例

```vue
<!-- TodoList.vue -->
<template>
  <div class="todo-list">
    <h2>Todo List</h2>
    <div class="todo-input">
      <input v-model="newTodo" @keyup.enter="addTodo" placeholder="Add a new todo" />
      <button @click="addTodo">Add</button>
    </div>
    <ul class="todo-items">
      <li v-for="todo in todos" :key="todo.id" class="todo-item">
        <input type="checkbox" v-model="todo.completed" @change="updateTodo(todo)" />
        <span :class="{ completed: todo.completed }">{{ todo.text }}</span>
        <button @click="deleteTodo(todo.id)">Delete</button>
      </li>
    </ul>
    <div class="todo-stats">
      <p>Total: {{ todos.length }}</p>
      <p>Completed: {{ completedCount }}</p>
      <p>Remaining: {{ remainingCount }}</p>
    </div>
  </div>
</template>
<script setup>
import { ref, computed } from 'vue'
const todos = ref([
 { id: 1, text: 'Learn Vue3', completed: false },
 { id: 2, text: 'Build a project', completed: false },
 { id: 3, text: 'Deploy to production', completed: false }
]
const newTodo = ref('')
const completedCount = computed(() => {
 return todos.value.filter(todo => todo.completed).length
}
const remainingCount = computed(() => {
 return todos.value.filter(todo => !todo.completed).length
}
const addTodo = () => {
 if (newTodo.value.trim()) {
 todos.value.push({
 id: Date.now(),
 text: newTodo.value.trim(),
 completed: false
 })
 newTodo.value = ''
 }
}
const updateTodo = (todo) => {
 // 可以在这里添加更新逻辑，比如发送到服务器
 console.log('Updated todo:', todo)
}
const deleteTodo = (id) => {
 todos.value = todos.value.filter(todo => todo.id !== id)
}
</script>
<style scoped>
.todo-list {
  max-width: 400px;
  margin: 0 auto;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
}
.todo-input {
  display: flex;
  margin-bottom: 20px;
}
.todo-input input {
  flex: 1;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px 0 0 4px;
}
.todo-input button {
  padding: 8px 16px;
  background-color: #42b983;
  color: white;
  border: none;
  border-radius: 0 4px 4px 0;
  cursor: pointer;
}
.todo-items {
  list-style-type: none;
  padding: 0;
  margin-bottom: 20px;
}
.todo-item {
  display: flex;
  align-items: center;
  padding: 10px;
  border-bottom: 1px solid #eee;
}
.todo-item input {
  margin-right: 10px;
}
.todo-item span {
  flex: 1;
}
.todo-item .completed {
  text-decoration: line-through;
  color: #999;
}
.todo-item button {
  padding: 4px 8px;
  background-color: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
.todo-stats {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  color: #666;
}
</style>
```

## 11. 小结 | Summary

Vue3 的组件系统是其核心特性之一，它提供了一种清晰、模块化的方式来组织和管理应用的 UI 结构。通过本章节的学习，你已经了解了 Vue3 组件系统的基本概念和使用方法，包括单文件组件、props、事件、插槽、生命周期、组件通信和高级特性。
组件系统的核心优势在于它允许我们将 UI 拆分为独立、可复用的部分，使代码更加模块化、可维护。在实际开发中，要遵循组件设计原则，使用合适的命名规范和样式规范，注意性能优化，以构建高质量的 Vue3 应用。
