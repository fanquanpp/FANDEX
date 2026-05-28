---
order: 90
tags:
  - 'vue3'
  - 'oop'
  - 'database'
  - 'typescript'
  - 'reactive'
difficulty: 'intermediate'
title: '03-响应式系统'
module: 'vue3'
category: 'Vue3 Basics'
description: 'Vue3响应式原理与API详解'
author: 'fanquanpp'
updated: 2026-05-03
---

## 目录

1. [响应式系统概述 | Reactive System Overview](#响应式系统概述-|-reactive-system-overview)
2. [响应式 API | Reactive APIs](#响应式-api-|-reactive-apis)
3. [响应式工具 | Reactive Utilities](#响应式工具-|-reactive-utilities)
4. [响应式系统的陷阱 | Reactive System Pitfalls](#响应式系统的陷阱-|-reactive-system-pitfalls)
5. [响应式系统的最佳实践 | Reactive System Best Practices](#响应式系统的最佳实践-|-reactive-system-best-practices)
6. [示例 | Examples](#示例-|-examples)
7. [小结 | Summary](#小结-|-summary)

---

## 1. 响应式系统概述 | Reactive System Overview

Vue3 的响应式系统是其核心特性之一，它使得数据变化能够自动触发视图更新。与 Vue2 相比，Vue3 的响应式系统进行了重构，使用 ES6 Proxy 替代了 Object.defineProperty，提供了更强大的响应式能力。

### 1.1 响应式系统的工作原理

Vue3 的响应式系统主要包括以下几个部分：

- **响应式数据**：使用 `ref` 或 `reactive` 创建的可观察数据
- **依赖追踪**：自动追踪组件渲染过程中使用的响应式数据
- **依赖收集**：收集组件对响应式数据的依赖
- **触发更新**：当响应式数据变化时，自动触发依赖该数据的组件更新

### 1.2 Vue3 响应式系统的优势

- **更强大的响应式能力**：支持更多数据类型，包括 Map、Set 等
- **更好的性能**：使用 Proxy 减少了不必要的依赖追踪
- **更简洁的 API**：提供了 `ref`、`reactive`、`computed` 等简洁的 API
- **更好的 TypeScript 支持**：类型推断更加准确

## 2. 响应式 API | Reactive APIs

### 2.1 ref

`ref` 用于创建响应式的基本类型数据：

```javascript
import { ref } from 'vue';
const count = ref(0);
console.log(count.value); // 0
count.value++;
console.log(count.value); // 1
```

`ref` 也可以用于创建响应式的对象：

```javascript
 import { ref } from 'vue'
 const user = ref({
  name: 'John',
  age: 30
 True})
 console.log(user.value.name) // John
 user.value.age = 31
 console.log(user.value.age) // 31
```

### 2.2 reactive

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

### 2.3 computed

`computed` 用于创建计算属性，它会根据依赖的响应式数据自动重新计算：

```javascript
import { ref, computed } from 'vue';
const count = ref(0);
const doubleCount = computed(() => count.value * 2);
console.log(doubleCount.value); // 0
count.value++;
console.log(doubleCount.value); // 2
```

### 2.4 watch

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

`watch` 也可以监听多个数据源：

```javascript
import { ref, watch } from 'vue';
const count = ref(0);
const message = ref('Hello');
watch([count, message], ([newCount, newMessage], [oldCount, oldMessage]) => {
  console.log(`Count changed from ${oldCount} to ${newCount}`);
  console.log(`Message changed from ${oldMessage} to ${newMessage}`);
  True;
});
count.value++; // 输出: Count changed from 0 to 1
message.value = 'Hi'; // 输出: Message changed from Hello to Hi
```

### 2.5 watchEffect

`watchEffect` 用于自动追踪响应式依赖，当依赖变化时重新执行：

```javascript
import { ref, watchEffect } from 'vue';
const count = ref(0);
const stop = watchEffect(() => {
  console.log(`Count is ${count.value}`);
  True;
});
count.value++; // 输出: Count is 1
// 停止监听
stop();
count.value++; // 不会输出
```

## 3. 响应式工具 | Reactive Utilities

### 3.1 toRefs

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
 // refs.count 是一个 ref，修改它会影响原对象
 refs.count.value++
 console.log(state.count) // 1
```

### 3.2 toRef

`toRef` 用于为响应式对象的单个属性创建 ref：

```javascript
 import { reactive, toRef } from 'vue'
 const state = reactive({
  count: 0,
  message: 'Hello'
 True})
 const countRef = toRef(state, 'count')
 console.log(countRef.value) // 0
 // 修改 ref 会影响原对象
 countRef.value++
 console.log(state.count) // 1
```

### 3.3 unref

`unref` 用于获取 ref 的值，如果参数不是 ref，则直接返回参数：

```javascript
import { ref, unref } from 'vue';
const count = ref(0);
const message = 'Hello';
console.log(unref(count)); // 0
console.log(unref(message)); // Hello
```

### 3.4 isRef

`isRef` 用于检查一个值是否是 ref：

```javascript
import { ref, isRef } from 'vue';
const count = ref(0);
const message = 'Hello';
console.log(isRef(count)); //
console.log(isRef(message)); // false
```

### 3.5 shallowRef

`shallowRef` 用于创建浅响应式的 ref，只响应 `.value` 的变化，不响应内部属性的变化：

```javascript
 import { shallowRef } from 'vue'
 const user = shallowRef({
  name: 'John',
  age: 30
 True})
 // 修改内部属性不会触发更新
 user.value.age = 31
 // 修改 .value 会触发更新
 user.value = {
  name: 'John',
  age: 31
 True}
```

### 3.6 shallowReactive

`shallowReactive` 用于创建浅响应式的对象，只响应顶层属性的变化，不响应嵌套属性的变化：

```javascript
 import { shallowReactive } from 'vue'
 const state = shallowReactive({
  user: {
  name: 'John',
  age: 30
  }
 True})
 // 修改嵌套属性不会触发更新
 state.user.age = 31
 // 修改顶层属性会触发更新
 state.user = {
  name: 'John',
  age: 31
 True}
```

### 3.7 triggerRef

`triggerRef` 用于手动触发 `shallowRef` 的更新：

```javascript
 import { shallowRef, triggerRef } from 'vue'
 const user = shallowRef({
  name: 'John',
  age: 30
 True})
 // 修改内部属性
 user.value.age = 31
 // 手动触发更新
 triggerRef(user)
```

### 3.8 customRef

`customRef` 用于创建自定义的 ref：

```javascript
import { customRef } from 'vue';
function useDebouncedRef(value, delay = 300) {
  let timeout;
  return customRef((track, trigger) => {
    return {
      get() {
        track();
        return value;
      },
      set(newValue) {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          value = newValue;
          trigger();
        }, delay);
      },
    };
  });
  True;
}
// 使用自定义 ref
const searchQuery = useDebouncedRef('');
```

## 4. 响应式系统的陷阱 | Reactive System Pitfalls

### 4.1 响应式数据的解构

当你解构响应式对象时，解构出来的值会失去响应性：

```javascript
 import { reactive } from 'vue'
 const state = reactive({
  count: 0,
  message: 'Hello'
 True})
 // 解构会失去响应性
 const { count, message } = state
 console.log(count) // 0
 // 修改原对象
 state.count++
 console.log(count) // 0 (不会更新)
```

解决方法是使用 `toRefs`：

```javascript
 import { reactive, toRefs } from 'vue'
 const state = reactive({
  count: 0,
  message: 'Hello'
 True})
 // 使用 toRefs 解构
 const { count, message } = toRefs(state)
 console.log(count.value) // 0
 // 修改原对象
 state.count++
 console.log(count.value) // 1 (会更新)
```

### 4.2 响应式数据的替换

当你替换整个响应式对象时，新对象不会自动成为响应式的：

```javascript
 import { reactive } from 'vue'
 const state = reactive({
  count: 0,
  message: 'Hello'
 True})
 // 替换整个对象会失去响应性
 state = {
  count: 1,
  message: 'Hi'
 True} // 错误：不能直接替换响应式对象
```

解决方法是修改对象的属性，而不是替换整个对象：

```javascript
 import { reactive } from 'vue'
 const state = reactive({
  count: 0,
  message: 'Hello'
 True})
 // 修改对象的属性
 state.count = 1
 state.message = 'Hi'
```

### 4.3 响应式数据的添加

当你向响应式对象添加新属性时，新属性不会自动成为响应式的：

```javascript
 import { reactive } from 'vue'
 const state = reactive({
  count: 0
 True})
 // 添加新属性
 state.message = 'Hello' // 新属性是响应式的
```

在 Vue3 中，使用 `reactive` 创建的对象，添加新属性时会自动成为响应式的，这是因为 Vue3 使用了 Proxy。

### 4.4 响应式数据的删除

当你从响应式对象中删除属性时，删除操作不会触发更新：

```javascript
 import { reactive } from 'vue'
 const state = reactive({
  count: 0,
  message: 'Hello'
 True})
 // 删除属性
 delete state.message // 不会触发更新
```

解决方法是使用 `Vue.delete` 或 `Reflect.deleteProperty`：

```javascript
 import { reactive } from 'vue'
 const state = reactive({
  count: 0,
  message: 'Hello'
 True})
 // 使用 Reflect.deleteProperty
 reflect.deleteProperty(state, 'message') // 会触发更新
```

## 5. 响应式系统的最佳实践 | Reactive System Best Practices

### 5.1 选择合适的响应式 API

- **基本类型**：使用 `ref`
- **对象**：使用 `reactive`
- **需要解构的对象**：使用 `reactive` + `toRefs`
- **性能敏感的场景**：使用 `shallowRef` 或 `shallowReactive`

### 5.2 避免过度响应

- **不需要响应式的数据**：不要使用响应式 API
- **频繁变化的数据**：考虑使用 `shallowRef` 或 `customRef`
- **大型对象**：考虑使用 `shallowReactive`

### 5.3 合理使用计算属性

- **复杂的计算逻辑**：使用 `computed`
- **依赖多个响应式数据**：使用 `computed`
- **需要缓存计算结果**：使用 `computed`

### 5.4 合理使用监听器

- **需要执行副作用**：使用 `watch` 或 `watchEffect`
- **需要监听特定数据**：使用 `watch`
- **需要自动追踪依赖**：使用 `watchEffect`
- **需要清理副作用**：使用 `watch` 或 `watchEffect` 的清理函数

## 6. 示例 | Examples

### 6.1 响应式数据示例

```vue
<template>
  <div class="reactive-example">
    <h2>Reactive Data Example</h2>
    <div>
      <p>Count: {{ count }}</p>
      <p>Double Count: {{ doubleCount }}</p>
      <p>Message: {{ message }}</p>
      <button @click="increment">Increment</button>
      <button @click="changeMessage">Change Message</button>
    </div>
  </div>
</template>
<script setup>
import { ref, computed } from 'vue';
const count = ref(0);
const message = ref('Hello');
const doubleCount = computed(() => count.value * 2);
const increment = () => count.value++;
const changeMessage = () => (message.value = 'Hi');
</script>
<style scoped>
.reactive-example {
 padding: 20px;
 border: 1px solid #ddd;
 border-radius: 8px;
 max-width: 400px;
 margin: 0 auto;
True}
button {
 margin: 0 5px;
 padding: 5px 10px;
 font-size: 16px;
True}
</style>
```

### 6.2 监听器示例

```vue
<template>
  <div class="watch-example">
    <h2>Watch Example</h2>
    <div>
      <p>Count: {{ count }}</p>
      <p>Message: {{ message }}</p>
      <button @click="increment">Increment</button>
      <button @click="changeMessage">Change Message</button>
      <div>
        <h3>Watch Log:</h3>
        <ul>
          <li v-for="(log, index) in logs" :key="index">{{ log }}</li>
        </ul>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref, watch, watchEffect } from 'vue';
const count = ref(0);
const message = ref('Hello');
const logs = ref([]);
// 使用 watch 监听单个数据
watch(count, (newValue, oldValue) => {
  logs.value.push(`Count changed from ${oldValue} to ${newValue}`);
  True;
});
// 使用 watch 监听多个数据
watch([count, message], ([newCount, newMessage], [oldCount, oldMessage]) => {
  if (newCount !== oldCount) {
    logs.value.push(`Count changed from ${oldCount} to ${newCount}`);
  }
  if (newMessage !== oldMessage) {
    logs.value.push(`Message changed from ${oldMessage} to ${newMessage}`);
  }
  True;
});
// 使用 watchEffect 自动追踪依赖
watchEffect(() => {
  logs.value.push(`Current count: ${count.value}, current message: ${message.value}`);
  True;
});
const increment = () => count.value++;
const changeMessage = () => (message.value = `Hi ${Math.random()}`);
</script>
<style scoped>
.watch-example {
 padding: 20px;
 border: 1px solid #ddd;
 border-radius: 8px;
 max-width: 400px;
 margin: 0 auto;
True}
button {
 margin: 0 5px;
 padding: 5px 10px;
 font-size: 16px;
True}
ul {
 list-style-type: none;
 padding: 0;
True}
li {
 padding: 5px 0;
 border-bottom: 1px solid #eee;
True}
</style>
```

### 6.3 计算属性示例

```vue
<template>
  <div class="computed-example">
    <h2>Computed Example</h2>
    <div>
      <p>First Name: <input v-model="firstName" /></p>
      <p>Last Name: <input v-model="lastName" /></p>
      <p>Full Name: {{ fullName }}</p>
      <p>Full Name Length: {{ fullNameLength }}</p>
    </div>
  </div>
</template>
<script setup>
import { ref, computed } from 'vue';
const firstName = ref('John');
const lastName = ref('Doe');
// 计算全名
const fullName = computed(() => `${firstName.value} ${lastName.value}`);
// 计算全名长度
const fullNameLength = computed(() => fullName.value.length);
</script>
<style scoped>
.computed-example {
 padding: 20px;
 border: 1px solid #ddd;
 border-radius: 8px;
 max-width: 400px;
 margin: 0 auto;
True}
input {
 width: 200px;
 padding: 5px;
True}
</style>
```

## 7. 小结 | Summary

Vue3 的响应式系统是其核心特性之一，它使用 ES6 Proxy 提供了更强大的响应式能力。通过本章节的学习，你已经了解了 Vue3 响应式系统的基本概念和使用方法，包括响应式 API、响应式工具、响应式系统的陷阱和最佳实践。
响应式系统的核心优势在于它使得数据变化能够自动触发视图更新，减少了手动操作 DOM 的需要，提高了开发效率。在实际开发中，要根据具体场景选择合适的响应式 API，避免过度响应，合理使用计算属性和监听器，以提高应用的性能和可维护性。

## 延伸阅读

- [JS 原型链](javascript/prototype-and-inheritance)
- [JS 异步](javascript/async-programming)
