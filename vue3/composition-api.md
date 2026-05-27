# 02-组合式 API | Composition API
 False
 False> @Author: fanquanpp
 False> @Category: Vue3 Basics
 False> @Description: 02-组合式 API | Composition API
 False> @Updated: 2026-05-03
 False
 False---
 False
 False## 目录
 False
 False1. [组合式 API 概述 | Composition API Overview](#组合式-api-概述-|-composition-api-overview)
 False2. [setup 函数 | Setup Function](#setup-函数-|-setup-function)
 False3. [响应式 API | Reactive APIs](#响应式-api-|-reactive-apis)
 False4. [生命周期钩子 | Lifecycle Hooks](#生命周期钩子-|-lifecycle-hooks)
 False5. [组合函数 | Composables](#组合函数-|-composables)
 False6. [依赖注入 | Dependency Injection](#依赖注入-|-dependency-injection)
 False7. [模板引用 | Template Refs](#模板引用-|-template-refs)
 False8. [响应式工具 | Reactive Utilities](#响应式工具-|-reactive-utilities)
 False9. [最佳实践 | Best Practices](#最佳实践-|-best-practices)
 False10. [示例 | Examples](#示例-|-examples)
 False11. [小结 | Summary](#小结-|-summary)
 False
 False---
 False
 False## 1. 组合式 API 概述 | Composition API Overview
 False
 False组合式 API 是 Vue3 引入的新特性，它提供了一种新的方式来组织组件逻辑，使代码更易于维护和复用。与选项式 API（Options API）相比，组合式 API 具有以下优势：
 False
 False- **更好的代码组织**：可以将相关的逻辑组合在一起，而不是分散在不同的选项中
 False- **更好的类型推导**：TypeScript 类型推断更加准确
 False- **更好的逻辑复用**：可以通过组合函数（Composables）来复用逻辑
 False- **更灵活的代码结构**：不再受选项式 API 的限制
 False
 False## 2. setup 函数 | Setup Function
 False
 False`setup` 函数是组合式 API 的入口点，它在组件创建之前执行，返回的对象会暴露给模板和其他选项。
 False
 False### 2.1 基本用法
 False
```vue
 True<template>
 True <div>
 True <p>Count: {{ count }}</p>
 True <button @click="increment">Increment</button>
 True </div>
 True</template>
 True
 True<script>
 Trueimport { ref, onMounted } from 'vue'
 True
 Trueexport default {
 True setup() {
 True // 创建响应式数据
 True const count = ref(0)
 True
 True // 定义方法
 True const increment = () => {
 True count.value++
 True }
 True
 True // 生命周期钩子
 True onMounted(() => {
 True console.log('Component mounted')
 True })
 True
 True // 返回暴露给模板的内容
 True return {
 True count,
 True increment
 True }
 True }
 True}
 True</script>
 True```

 False### 2.2 script setup 语法糖
 False
 FalseVue3.2+ 提供了 `script setup` 语法糖，使组合式 API 的使用更加简洁：
 False
```vue
 True<template>
 True <div>
 True <p>Count: {{ count }}</p>
 True <button @click="increment">Increment</button>
 True </div>
 True</template>
 True
 True<script setup>
 Trueimport { ref, onMounted } from 'vue'
 True
 True// 直接定义响应式数据
 Trueconst count = ref(0)
 True
 True// 直接定义方法
 Trueconst increment = () => {
 True count.value++
 True}
 True
 True// 直接使用生命周期钩子
 TrueonMounted(() => {
 True console.log('Component mounted')
 True})
 True</script>
 True```

 False## 3. 响应式 API | Reactive APIs
 False
 False### 3.1 ref
 False
 False`ref` 用于创建响应式的基本类型数据：
 False
```javascript
 Trueimport { ref } from 'vue'
 True
 Trueconst count = ref(0)
 Trueconsole.log(count.value) // 0
 True
 Truecount.value++
 Trueconsole.log(count.value) // 1
 True```

 False### 3.2 reactive
 False
 False`reactive` 用于创建响应式的对象：
 False
```javascript
 Trueimport { reactive } from 'vue'
 True
 Trueconst state = reactive({
 True count: 0,
 True message: 'Hello'
 True})
 True
 Trueconsole.log(state.count) // 0
 Truestate.count++
 Trueconsole.log(state.count) // 1
 True```

 False### 3.3 computed
 False
 False`computed` 用于创建计算属性：
 False
```javascript
 Trueimport { ref, computed } from 'vue'
 True
 Trueconst count = ref(0)
 Trueconst doubleCount = computed(() => count.value * 2)
 True
 Trueconsole.log(doubleCount.value) // 0
 Truecount.value++
 Trueconsole.log(doubleCount.value) // 2
 True```

 False### 3.4 watch
 False
 False`watch` 用于监听数据变化：
 False
```javascript
 Trueimport { ref, watch } from 'vue'
 True
 Trueconst count = ref(0)
 True
 Truewatch(count, (newValue, oldValue) => {
 True console.log(`Count changed from ${oldValue} to ${newValue}`)
 True})
 True
 Truecount.value++ // 输出: Count changed from 0 to 1
 True```

 False### 3.5 watchEffect
 False
 False`watchEffect` 用于自动追踪响应式依赖：
 False
```javascript
 Trueimport { ref, watchEffect } from 'vue'
 True
 Trueconst count = ref(0)
 True
 TruewatchEffect(() => {
 True console.log(`Count is ${count.value}`)
 True})
 True
 Truecount.value++ // 输出: Count is 1
 True```

 False## 4. 生命周期钩子 | Lifecycle Hooks
 False
 False组合式 API 提供了与选项式 API 对应的生命周期钩子：
 False
 False- `onMounted`：组件挂载后
 False- `onUpdated`：组件更新后
 False- `onUnmounted`：组件卸载后
 False- `onBeforeMount`：组件挂载前
 False- `onBeforeUpdate`：组件更新前
 False- `onBeforeUnmount`：组件卸载前
 False- `onErrorCaptured`：捕获子组件错误
 False- `onRenderTracked`：响应式依赖被追踪时
 False- `onRenderTriggered`：响应式依赖被触发时
 False
```javascript
 Trueimport { onMounted, onUpdated, onUnmounted } from 'vue'
 True
 TrueonMounted(() => {
 True console.log('Component mounted')
 True})
 True
 TrueonUpdated(() => {
 True console.log('Component updated')
 True})
 True
 TrueonUnmounted(() => {
 True console.log('Component unmounted')
 True})
 True```

 False## 5. 组合函数 | Composables
 False
 False组合函数是组合式 API 的核心概念，用于复用逻辑：
 False
```javascript
 True// composables/useCounter.js
 Trueimport { ref, computed } from 'vue'
 True
 Trueexport function useCounter(initialValue = 0) {
 True const count = ref(initialValue)
 True const doubleCount = computed(() => count.value * 2)
 True
 True const increment = () => {
 True count.value++
 True }
 True
 True const decrement = () => {
 True count.value--
 True }
 True
 True return {
 True count,
 True doubleCount,
 True increment,
 True decrement
 True }
 True}
 True```

 False使用组合函数：
 False
```vue
 True<template>
 True <div>
 True <p>Count: {{ count }}</p>
 True <p>Double Count: {{ doubleCount }}</p>
 True <button @click="increment">Increment</button>
 True <button @click="decrement">Decrement</button>
 True </div>
 True</template>
 True
 True<script setup>
 Trueimport { useCounter } from './composables/useCounter'
 True
 Trueconst { count, doubleCount, increment, decrement } = useCounter(0)
 True</script>
 True```

 False## 6. 依赖注入 | Dependency Injection
 False
 False### 6.1 provide
 False
 False`provide` 用于向子组件提供数据：
 False
```vue
 True<!-- ParentComponent.vue -->
 True<script setup>
 Trueimport { provide, ref } from 'vue'
 True
 Trueconst message = ref('Hello from parent')
 True
 Trueprovide('message', message)
 True</script>
 True```

 False### 6.2 inject
 False
 False`inject` 用于从父组件获取数据：
 False
```vue
 True<!-- ChildComponent.vue -->
 True<script setup>
 Trueimport { inject } from 'vue'
 True
 Trueconst message = inject('message', 'Default message')
 True</script>
 True
 True<template>
 True <p>{{ message }}</p>
 True</template>
 True```

 False## 7. 模板引用 | Template Refs
 False
 False使用 `ref` 可以获取DOM元素或组件实例：
 False
```vue
 True<template>
 True <div ref="container">Hello</div>
 True <MyComponent ref="myComponent" />
 True</template>
 True
 True<script setup>
 Trueimport { ref, onMounted } from 'vue'
 Trueimport MyComponent from './MyComponent.vue'
 True
 Trueconst container = ref(null)
 Trueconst myComponent = ref(null)
 True
 TrueonMounted(() => {
 True console.log(container.value) // DOM元素
 True console.log(myComponent.value) // 组件实例
 True})
 True</script>
 True```

 False## 8. 响应式工具 | Reactive Utilities
 False
 False### 8.1 toRefs
 False
 False`toRefs` 用于将响应式对象转换为普通对象，其中每个属性都是一个 ref：
 False
```javascript
 Trueimport { reactive, toRefs } from 'vue'
 True
 Trueconst state = reactive({
 True count: 0,
 True message: 'Hello'
 True})
 True
 Trueconst refs = toRefs(state)
 Trueconsole.log(refs.count.value) // 0
 Trueconsole.log(refs.message.value) // Hello
 True```

 False### 8.2 toRef
 False
 False`toRef` 用于为响应式对象的单个属性创建 ref：
 False
```javascript
 Trueimport { reactive, toRef } from 'vue'
 True
 Trueconst state = reactive({
 True count: 0,
 True message: 'Hello'
 True})
 True
 Trueconst countRef = toRef(state, 'count')
 Trueconsole.log(countRef.value) // 0
 True```

 False### 8.3 unref
 False
 False`unref` 用于获取 ref 的值，如果参数不是 ref，则直接返回参数：
 False
```javascript
 Trueimport { ref, unref } from 'vue'
 True
 Trueconst count = ref(0)
 Trueconst message = 'Hello'
 True
 Trueconsole.log(unref(count)) // 0
 Trueconsole.log(unref(message)) // Hello
 True```

 False### 8.4 isRef
 False
 False`isRef` 用于检查一个值是否是 ref：
 False
```javascript
 Trueimport { ref, isRef } from 'vue'
 True
 Trueconst count = ref(0)
 Trueconst message = 'Hello'
 True
 Trueconsole.log(isRef(count)) // true
 Trueconsole.log(isRef(message)) // false
 True```

 False## 9. 最佳实践 | Best Practices
 False
 False1. **使用 script setup**：简洁明了，推荐使用
 False2. **组织逻辑**：将相关的逻辑组合在一起
 False3. **使用组合函数**：复用逻辑，提高代码可维护性
 False4. **合理使用响应式 API**：根据需要选择 ref 或 reactive
 False5. **避免过度使用 watch**：优先使用 computed
 False6. **注意响应式陷阱**：了解响应式系统的工作原理，避免常见陷阱
 False
 False## 10. 示例 | Examples
 False
 False### 10.1 计数器示例
 False
```vue
 True<template>
 True <div class="counter">
 True <h2>Counter</h2>
 True <p>Count: {{ count }}</p>
 True <p>Double: {{ doubleCount }}</p>
 True <div>
 True <button @click="increment">+</button>
 True <button @click="decrement">-</button>
 True <button @click="reset">Reset</button>
 True </div>
 True </div>
 True</template>
 True
 True<script setup>
 Trueimport { ref, computed } from 'vue'
 True
 Trueconst count = ref(0)
 Trueconst doubleCount = computed(() => count.value * 2)
 True
 Trueconst increment = () => count.value++
 Trueconst decrement = () => count.value--
 Trueconst reset = () => count.value = 0
 True</script>
 True
 True<style scoped>
 True.counter {
 True text-align: center;
 True padding: 20px;
 True border: 1px solid #ddd;
 True border-radius: 8px;
 True max-width: 300px;
 True margin: 0 auto;
 True}
 True
 Truebutton {
 True margin: 0 5px;
 True padding: 5px 10px;
 True font-size: 16px;
 True}
 True</style>
 True```

 False### 10.2 表单示例
 False
```vue
 True<template>
 True <div class="form">
 True <h2>Form</h2>
 True <div>
 True <label>Name:</label>
 True <input v-model="form.name" type="text" />
 True </div>
 True <div>
 True <label>Email:</label>
 True <input v-model="form.email" type="email" />
 True </div>
 True <div>
 True <label>Message:</label>
 True <textarea v-model="form.message"></textarea>
 True </div>
 True <button @click="submitForm">Submit</button>
 True <div v-if="submitted">
 True <h3>Submitted Data:</h3>
 True <pre>{{ form }}</pre>
 True </div>
 True </div>
 True</template>
 True
 True<script setup>
 Trueimport { reactive, ref } from 'vue'
 True
 Trueconst form = reactive({
 True name: '',
 True email: '',
 True message: ''
 True})
 True
 Trueconst submitted = ref(false)
 True
 Trueconst submitForm = () => {
 True console.log('Form submitted:', form)
 True submitted.value = true
 True}
 True</script>
 True
 True<style scoped>
 True.form {
 True max-width: 400px;
 True margin: 0 auto;
 True padding: 20px;
 True border: 1px solid #ddd;
 True border-radius: 8px;
 True}
 True
 Truediv {
 True margin-bottom: 10px;
 True}
 True
 Truelabel {
 True display: inline-block;
 True width: 80px;
 True}
 True
 Trueinput, textarea {
 True width: 300px;
 True padding: 5px;
 True}
 True
 Truebutton {
 True margin-top: 10px;
 True padding: 5px 10px;
 True}
 True</style>
 True```

 False## 11. 小结 | Summary
 False
 False组合式 API 是 Vue3 的重要特性，它提供了一种更灵活、更强大的方式来组织组件逻辑。通过本章节的学习，你已经了解了组合式 API 的基本概念和使用方法，包括 setup 函数、响应式 API、生命周期钩子、组合函数等。
 False
 False组合式 API 的核心优势在于它允许你根据逻辑关注点组织代码，而不是根据选项类型。这使得代码更加模块化、可复用，并且更易于理解和维护。
 False
 False在实际开发中，建议使用 `script setup` 语法糖，它使组合式 API 的使用更加简洁明了。同时，要善于使用组合函数来复用逻辑，提高代码的可维护性。

## 延伸阅读

- [[javascript/functions-and-scope|JS 函数与作用域]]
- [[javascript/async-programming|JS 异步编程]]
 False