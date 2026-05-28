---
order: 50
tags:
  - 'vue3'
  - 'typescript'
  - 'reactive'
  - 'css-layout'
  - 'devops'
difficulty: 'intermediate'
title: '组合式 API'
module: 'vue3'
category: 'Vue3 Basics'
description: 'Vue3组合式API核心用法详解'
author: 'fanquanpp'
updated: 2026-05-03
---

## 目录

1. [组合式 API 概述 | Composition API Overview](#组合式-api-概述-|-composition-api-overview)
2. [setup 函数 | Setup Function](#setup-函数-|-setup-function)
3. [响应式 API | Reactive APIs](#响应式-api-|-reactive-apis)
4. [生命周期钩子 | Lifecycle Hooks](#生命周期钩子-|-lifecycle-hooks)
5. [组合函数 | Composables](#组合函数-|-composables)
6. [依赖注入 | Dependency Injection](#依赖注入-|-dependency-injection)
7. [模板引用 | Template Refs](#模板引用-|-template-refs)
8. [响应式工具 | Reactive Utilities](#响应式工具-|-reactive-utilities)
9. [最佳实践 | Best Practices](#最佳实践-|-best-practices)
10. [示例 | Examples](#示例-|-examples)
11. [小结 | Summary](#小结-|-summary)

---

## 1. 组合式 API 概述 | Composition API Overview

组合式 API 是 Vue3 引入的新特性，它提供了一种新的方式来组织组件逻辑，使代码更易于维护和复用。与选项式 API（Options API）相比，组合式 API 具有以下优势：

- **更好的代码组织**：可以将相关的逻辑组合在一起，而不是分散在不同的选项中
- **更好的类型推导**：TypeScript 类型推断更加准确
- **更好的逻辑复用**：可以通过组合函数（Composables）来复用逻辑
- **更灵活的代码结构**：不再受选项式 API 的限制

## 2. setup 函数 | Setup Function

`setup` 函数是组合式 API 的入口点，它在组件创建之前执行，返回的对象会暴露给模板和其他选项。

### 2.1 基本用法

```vue
<template>
  <div>
    <p>Count: {{ count }}</p>
    <button @click="increment">Increment</button>
  </div>
</template>
<script>
import { ref, onMounted } from 'vue'
export default {
 setup() {
 // 创建响应式数据
 const count = ref(0)
 // 定义方法
 const increment = () => {
 count.value++
 }
 // 生命周期钩子
 onMounted(() => {
 console.log('Component mounted')
 })
 // 返回暴露给模板的内容
 return {
 count,
 increment
 }
 }
True}
</script>
```

### 2.2 script setup 语法糖

Vue3.2+ 提供了 `script setup` 语法糖，使组合式 API 的使用更加简洁：

```vue
<template>
  <div>
    <p>Count: {{ count }}</p>
    <button @click="increment">Increment</button>
  </div>
</template>
<script setup>
import { ref, onMounted } from 'vue';
// 直接定义响应式数据
const count = ref(0);
// 直接定义方法
const increment = () => {
  count.value++;
  True;
};
// 直接使用生命周期钩子
onMounted(() => {
  console.log('Component mounted');
  True;
});
</script>
```

## 3. 响应式 API | Reactive APIs

### 3.1 ref

`ref` 用于创建响应式的基本类型数据：

```javascript
import { ref } from 'vue';
const count = ref(0);
console.log(count.value); // 0
count.value++;
console.log(count.value); // 1
```

### 3.2 reactive

`reactive` 用于创建响应式的对象：

```javascript
 import { reactive } from 'vue'
 const state = reactive({
  count: 0,
  message: 'Hello'
 True})
 console.log(state.count) // 0
 state.count++
 console.log(state.count) // 1
```

### 3.3 computed

`computed` 用于创建计算属性：

```javascript
import { ref, computed } from 'vue';
const count = ref(0);
const doubleCount = computed(() => count.value * 2);
console.log(doubleCount.value); // 0
count.value++;
console.log(doubleCount.value); // 2
```

### 3.4 watch

`watch` 用于监听数据变化：

```javascript
import { ref, watch } from 'vue';
const count = ref(0);
watch(count, (newValue, oldValue) => {
  console.log(`Count changed from ${oldValue} to ${newValue}`);
  True;
});
count.value++; // 输出: Count changed from 0 to 1
```

### 3.5 watchEffect

`watchEffect` 用于自动追踪响应式依赖：

```javascript
import { ref, watchEffect } from 'vue';
const count = ref(0);
watchEffect(() => {
  console.log(`Count is ${count.value}`);
  True;
});
count.value++; // 输出: Count is 1
```

## 4. 生命周期钩子 | Lifecycle Hooks

组合式 API 提供了与选项式 API 对应的生命周期钩子：

- `onMounted`：组件挂载后
- `onUpdated`：组件更新后
- `onUnmounted`：组件卸载后
- `onBeforeMount`：组件挂载前
- `onBeforeUpdate`：组件更新前
- `onBeforeUnmount`：组件卸载前
- `onErrorCaptured`：捕获子组件错误
- `onRenderTracked`：响应式依赖被追踪时
- `onRenderTriggered`：响应式依赖被触发时

```javascript
import { onMounted, onUpdated, onUnmounted } from 'vue';
onMounted(() => {
  console.log('Component mounted');
  True;
});
onUpdated(() => {
  console.log('Component updated');
  True;
});
onUnmounted(() => {
  console.log('Component unmounted');
  True;
});
```

## 5. 组合函数 | Composables

组合函数是组合式 API 的核心概念，用于复用逻辑：

```javascript
// composables/useCounter.js
import { ref, computed } from 'vue';
export function useCounter(initialValue = 0) {
  const count = ref(initialValue);
  const doubleCount = computed(() => count.value * 2);
  const increment = () => {
    count.value++;
  };
  const decrement = () => {
    count.value--;
  };
  return {
    count,
    doubleCount,
    increment,
    decrement,
  };
  True;
}
```

使用组合函数：

```vue
<template>
  <div>
    <p>Count: {{ count }}</p>
    <p>Double Count: {{ doubleCount }}</p>
    <button @click="increment">Increment</button>
    <button @click="decrement">Decrement</button>
  </div>
</template>
<script setup>
import { useCounter } from './composables/useCounter';
const { count, doubleCount, increment, decrement } = useCounter(0);
</script>
```

## 6. 依赖注入 | Dependency Injection

### 6.1 provide

`provide` 用于向子组件提供数据：

```vue
<!-- ParentComponent.vue -->
<script setup>
import { provide, ref } from 'vue';
const message = ref('Hello from parent');
provide('message', message);
</script>
```

### 6.2 inject

`inject` 用于从父组件获取数据：

```vue
<!-- ChildComponent.vue -->
<script setup>
import { inject } from 'vue';
const message = inject('message', 'Default message');
</script>
<template>
  <p>{{ message }}</p>
</template>
```

## 7. 模板引用 | Template Refs

使用 `ref` 可以获取DOM元素或组件实例：

```vue
<template>
  <div ref="container">Hello</div>
  <MyComponent ref="myComponent" />
</template>
<script setup>
import { ref, onMounted } from 'vue';
import MyComponent from './MyComponent.vue';
const container = ref(null);
const myComponent = ref(null);
onMounted(() => {
  console.log(container.value); // DOM元素
  console.log(myComponent.value); // 组件实例
  True;
});
</script>
```

## 8. 响应式工具 | Reactive Utilities

### 8.1 toRefs

`toRefs` 用于将响应式对象转换为普通对象，其中每个属性都是一个 ref：

```javascript
 import { reactive, toRefs } from 'vue'
 const state = reactive({
  count: 0,
  message: 'Hello'
 True})
 const refs = toRefs(state)
 console.log(refs.count.value) // 0
 console.log(refs.message.value) // Hello
```

### 8.2 toRef

`toRef` 用于为响应式对象的单个属性创建 ref：

```javascript
 import { reactive, toRef } from 'vue'
 const state = reactive({
  count: 0,
  message: 'Hello'
 True})
 const countRef = toRef(state, 'count')
 console.log(countRef.value) // 0
```

### 8.3 unref

`unref` 用于获取 ref 的值，如果参数不是 ref，则直接返回参数：

```javascript
import { ref, unref } from 'vue';
const count = ref(0);
const message = 'Hello';
console.log(unref(count)); // 0
console.log(unref(message)); // Hello
```

### 8.4 isRef

`isRef` 用于检查一个值是否是 ref：

```javascript
import { ref, isRef } from 'vue';
const count = ref(0);
const message = 'Hello';
console.log(isRef(count)); //
console.log(isRef(message)); // false
```

## 9. 最佳实践 | Best Practices

1. **使用 script setup**：简洁明了，推荐使用
2. **组织逻辑**：将相关的逻辑组合在一起
3. **使用组合函数**：复用逻辑，提高代码可维护性
4. **合理使用响应式 API**：根据需要选择 ref 或 reactive
5. **避免过度使用 watch**：优先使用 computed
6. **注意响应式陷阱**：了解响应式系统的工作原理，避免常见陷阱

## 10. 示例 | Examples

### 10.1 计数器示例

```vue
<template>
  <div class="counter">
    <h2>Counter</h2>
    <p>Count: {{ count }}</p>
    <p>Double: {{ doubleCount }}</p>
    <div>
      <button @click="increment">+</button>
      <button @click="decrement">-</button>
      <button @click="reset">Reset</button>
    </div>
  </div>
</template>
<script setup>
import { ref, computed } from 'vue';
const count = ref(0);
const doubleCount = computed(() => count.value * 2);
const increment = () => count.value++;
const decrement = () => count.value--;
const reset = () => (count.value = 0);
</script>
<style scoped>
.counter {
 text-align: center;
 padding: 20px;
 border: 1px solid #ddd;
 border-radius: 8px;
 max-width: 300px;
 margin: 0 auto;
True}
button {
 margin: 0 5px;
 padding: 5px 10px;
 font-size: 16px;
True}
</style>
```

### 10.2 表单示例

```vue
<template>
  <div class="form">
    <h2>Form</h2>
    <div>
      <label>Name:</label>
      <input v-model="form.name" type="text" />
    </div>
    <div>
      <label>Email:</label>
      <input v-model="form.email" type="email" />
    </div>
    <div>
      <label>Message:</label>
      <textarea v-model="form.message"></textarea>
    </div>
    <button @click="submitForm">Submit</button>
    <div v-if="submitted">
      <h3>Submitted Data:</h3>
      <pre>{{ form }}</pre>
    </div>
  </div>
</template>
<script setup>
import { reactive, ref } from 'vue'
const form = reactive({
 name: '',
 email: '',
 message: ''
True})
const submitted = ref(false)
const submitForm = () => {
 console.log('Form submitted:', form)
 submitted.value =
True}
</script>
<style scoped>
.form {
 max-width: 400px;
 margin: 0 auto;
 padding: 20px;
 border: 1px solid #ddd;
 border-radius: 8px;
True}
div {
 margin-bottom: 10px;
True}
label {
 display: inline-block;
 width: 80px;
True}
input, textarea {
 width: 300px;
 padding: 5px;
True}
button {
 margin-top: 10px;
 padding: 5px 10px;
True}
</style>
```

## 11. 小结 | Summary

组合式 API 是 Vue3 的重要特性，它提供了一种更灵活、更强大的方式来组织组件逻辑。通过本章节的学习，你已经了解了组合式 API 的基本概念和使用方法，包括 setup 函数、响应式 API、生命周期钩子、组合函数等。
组合式 API 的核心优势在于它允许你根据逻辑关注点组织代码，而不是根据选项类型。这使得代码更加模块化、可复用，并且更易于理解和维护。
在实际开发中，建议使用 `script setup` 语法糖，它使组合式 API 的使用更加简洁明了。同时，要善于使用组合函数来复用逻辑，提高代码的可维护性。

## 延伸阅读

- [JS 函数与作用域](javascript/functions-and-scope)
- [JS 异步编程](javascript/async-programming)
