# 03-响应式系统 | Reactive System
 False
 False> @Author: fanquanpp
 False> @Category: Vue3 Basics
 False> @Description: 03-响应式系统 | Reactive System
 False> @Updated: 2026-05-03
 False
 False---
 False
 False## 目录
 False
 False1. [响应式系统概述 | Reactive System Overview](#响应式系统概述-|-reactive-system-overview)
 False2. [响应式 API | Reactive APIs](#响应式-api-|-reactive-apis)
 False3. [响应式工具 | Reactive Utilities](#响应式工具-|-reactive-utilities)
 False4. [响应式系统的陷阱 | Reactive System Pitfalls](#响应式系统的陷阱-|-reactive-system-pitfalls)
 False5. [响应式系统的最佳实践 | Reactive System Best Practices](#响应式系统的最佳实践-|-reactive-system-best-practices)
 False6. [示例 | Examples](#示例-|-examples)
 False7. [小结 | Summary](#小结-|-summary)
 False
 False---
 False
 False## 1. 响应式系统概述 | Reactive System Overview
 False
 FalseVue3 的响应式系统是其核心特性之一，它使得数据变化能够自动触发视图更新。与 Vue2 相比，Vue3 的响应式系统进行了重构，使用 ES6 Proxy 替代了 Object.defineProperty，提供了更强大的响应式能力。
 False
 False### 1.1 响应式系统的工作原理
 False
 FalseVue3 的响应式系统主要包括以下几个部分：
 False
 False- **响应式数据**：使用 `ref` 或 `reactive` 创建的可观察数据
 False- **依赖追踪**：自动追踪组件渲染过程中使用的响应式数据
 False- **依赖收集**：收集组件对响应式数据的依赖
 False- **触发更新**：当响应式数据变化时，自动触发依赖该数据的组件更新
 False
 False### 1.2 Vue3 响应式系统的优势
 False
 False- **更强大的响应式能力**：支持更多数据类型，包括 Map、Set 等
 False- **更好的性能**：使用 Proxy 减少了不必要的依赖追踪
 False- **更简洁的 API**：提供了 `ref`、`reactive`、`computed` 等简洁的 API
 False- **更好的 TypeScript 支持**：类型推断更加准确
 False
 False## 2. 响应式 API | Reactive APIs
 False
 False### 2.1 ref
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

 False`ref` 也可以用于创建响应式的对象：
 False
```javascript
 Trueimport { ref } from 'vue'
 True
 Trueconst user = ref({
 True name: 'John',
 True age: 30
 True})
 True
 Trueconsole.log(user.value.name) // John
 Trueuser.value.age = 31
 Trueconsole.log(user.value.age) // 31
 True```

 False### 2.2 reactive
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

 False### 2.3 computed
 False
 False`computed` 用于创建计算属性，它会根据依赖的响应式数据自动重新计算：
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

 False### 2.4 watch
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

 False`watch` 也可以监听多个数据源：
 False
```javascript
 Trueimport { ref, watch } from 'vue'
 True
 Trueconst count = ref(0)
 Trueconst message = ref('Hello')
 True
 Truewatch([count, message], ([newCount, newMessage], [oldCount, oldMessage]) => {
 True console.log(`Count changed from ${oldCount} to ${newCount}`)
 True console.log(`Message changed from ${oldMessage} to ${newMessage}`)
 True})
 True
 Truecount.value++ // 输出: Count changed from 0 to 1
 Truemessage.value = 'Hi' // 输出: Message changed from Hello to Hi
 True```

 False### 2.5 watchEffect
 False
 False`watchEffect` 用于自动追踪响应式依赖，当依赖变化时重新执行：
 False
```javascript
 Trueimport { ref, watchEffect } from 'vue'
 True
 Trueconst count = ref(0)
 True
 Trueconst stop = watchEffect(() => {
 True console.log(`Count is ${count.value}`)
 True})
 True
 Truecount.value++ // 输出: Count is 1
 True
 True// 停止监听
 Truestop()
 Truecount.value++ // 不会输出
 True```

 False## 3. 响应式工具 | Reactive Utilities
 False
 False### 3.1 toRefs
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
 True
 True// refs.count 是一个 ref，修改它会影响原对象
 Truerefs.count.value++
 Trueconsole.log(state.count) // 1
 True```

 False### 3.2 toRef
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
 True
 True// 修改 ref 会影响原对象
 TruecountRef.value++
 Trueconsole.log(state.count) // 1
 True```

 False### 3.3 unref
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

 False### 3.4 isRef
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

 False### 3.5 shallowRef
 False
 False`shallowRef` 用于创建浅响应式的 ref，只响应 `.value` 的变化，不响应内部属性的变化：
 False
```javascript
 Trueimport { shallowRef } from 'vue'
 True
 Trueconst user = shallowRef({
 True name: 'John',
 True age: 30
 True})
 True
 True// 修改内部属性不会触发更新
 Trueuser.value.age = 31
 True
 True// 修改 .value 会触发更新
 Trueuser.value = {
 True name: 'John',
 True age: 31
 True}
 True```

 False### 3.6 shallowReactive
 False
 False`shallowReactive` 用于创建浅响应式的对象，只响应顶层属性的变化，不响应嵌套属性的变化：
 False
```javascript
 Trueimport { shallowReactive } from 'vue'
 True
 Trueconst state = shallowReactive({
 True user: {
 True name: 'John',
 True age: 30
 True }
 True})
 True
 True// 修改嵌套属性不会触发更新
 Truestate.user.age = 31
 True
 True// 修改顶层属性会触发更新
 Truestate.user = {
 True name: 'John',
 True age: 31
 True}
 True```

 False### 3.7 triggerRef
 False
 False`triggerRef` 用于手动触发 `shallowRef` 的更新：
 False
```javascript
 Trueimport { shallowRef, triggerRef } from 'vue'
 True
 Trueconst user = shallowRef({
 True name: 'John',
 True age: 30
 True})
 True
 True// 修改内部属性
 Trueuser.value.age = 31
 True
 True// 手动触发更新
 TruetriggerRef(user)
 True```

 False### 3.8 customRef
 False
 False`customRef` 用于创建自定义的 ref：
 False
```javascript
 Trueimport { customRef } from 'vue'
 True
 Truefunction useDebouncedRef(value, delay = 300) {
 True let timeout
 True return customRef((track, trigger) => {
 True return {
 True get() {
 True track()
 True return value
 True },
 True set(newValue) {
 True clearTimeout(timeout)
 True timeout = setTimeout(() => {
 True value = newValue
 True trigger()
 True }, delay)
 True }
 True }
 True })
 True}
 True
 True// 使用自定义 ref
 Trueconst searchQuery = useDebouncedRef('')
 True```

 False## 4. 响应式系统的陷阱 | Reactive System Pitfalls
 False
 False### 4.1 响应式数据的解构
 False
 False当你解构响应式对象时，解构出来的值会失去响应性：
 False
```javascript
 Trueimport { reactive } from 'vue'
 True
 Trueconst state = reactive({
 True count: 0,
 True message: 'Hello'
 True})
 True
 True// 解构会失去响应性
 Trueconst { count, message } = state
 Trueconsole.log(count) // 0
 True
 True// 修改原对象
 Truestate.count++
 Trueconsole.log(count) // 0 (不会更新)
 True```

 False解决方法是使用 `toRefs`：
 False
```javascript
 Trueimport { reactive, toRefs } from 'vue'
 True
 Trueconst state = reactive({
 True count: 0,
 True message: 'Hello'
 True})
 True
 True// 使用 toRefs 解构
 Trueconst { count, message } = toRefs(state)
 Trueconsole.log(count.value) // 0
 True
 True// 修改原对象
 Truestate.count++
 Trueconsole.log(count.value) // 1 (会更新)
 True```

 False### 4.2 响应式数据的替换
 False
 False当你替换整个响应式对象时，新对象不会自动成为响应式的：
 False
```javascript
 Trueimport { reactive } from 'vue'
 True
 Trueconst state = reactive({
 True count: 0,
 True message: 'Hello'
 True})
 True
 True// 替换整个对象会失去响应性
 Truestate = {
 True count: 1,
 True message: 'Hi'
 True} // 错误：不能直接替换响应式对象
 True```

 False解决方法是修改对象的属性，而不是替换整个对象：
 False
```javascript
 Trueimport { reactive } from 'vue'
 True
 Trueconst state = reactive({
 True count: 0,
 True message: 'Hello'
 True})
 True
 True// 修改对象的属性
 Truestate.count = 1
 Truestate.message = 'Hi'
 True```

 False### 4.3 响应式数据的添加
 False
 False当你向响应式对象添加新属性时，新属性不会自动成为响应式的：
 False
```javascript
 Trueimport { reactive } from 'vue'
 True
 Trueconst state = reactive({
 True count: 0
 True})
 True
 True// 添加新属性
 Truestate.message = 'Hello' // 新属性是响应式的
 True```

 False在 Vue3 中，使用 `reactive` 创建的对象，添加新属性时会自动成为响应式的，这是因为 Vue3 使用了 Proxy。
 False
 False### 4.4 响应式数据的删除
 False
 False当你从响应式对象中删除属性时，删除操作不会触发更新：
 False
```javascript
 Trueimport { reactive } from 'vue'
 True
 Trueconst state = reactive({
 True count: 0,
 True message: 'Hello'
 True})
 True
 True// 删除属性
 Truedelete state.message // 不会触发更新
 True```

 False解决方法是使用 `Vue.delete` 或 `Reflect.deleteProperty`：
 False
```javascript
 Trueimport { reactive } from 'vue'
 True
 Trueconst state = reactive({
 True count: 0,
 True message: 'Hello'
 True})
 True
 True// 使用 Reflect.deleteProperty
 TrueReflect.deleteProperty(state, 'message') // 会触发更新
 True```

 False## 5. 响应式系统的最佳实践 | Reactive System Best Practices
 False
 False### 5.1 选择合适的响应式 API
 False
 False- **基本类型**：使用 `ref`
 False- **对象**：使用 `reactive`
 False- **需要解构的对象**：使用 `reactive` + `toRefs`
 False- **性能敏感的场景**：使用 `shallowRef` 或 `shallowReactive`
 False
 False### 5.2 避免过度响应
 False
 False- **不需要响应式的数据**：不要使用响应式 API
 False- **频繁变化的数据**：考虑使用 `shallowRef` 或 `customRef`
 False- **大型对象**：考虑使用 `shallowReactive`
 False
 False### 5.3 合理使用计算属性
 False
 False- **复杂的计算逻辑**：使用 `computed`
 False- **依赖多个响应式数据**：使用 `computed`
 False- **需要缓存计算结果**：使用 `computed`
 False
 False### 5.4 合理使用监听器
 False
 False- **需要执行副作用**：使用 `watch` 或 `watchEffect`
 False- **需要监听特定数据**：使用 `watch`
 False- **需要自动追踪依赖**：使用 `watchEffect`
 False- **需要清理副作用**：使用 `watch` 或 `watchEffect` 的清理函数
 False
 False## 6. 示例 | Examples
 False
 False### 6.1 响应式数据示例
 False
```vue
 True<template>
 True <div class="reactive-example">
 True <h2>Reactive Data Example</h2>
 True <div>
 True <p>Count: {{ count }}</p>
 True <p>Double Count: {{ doubleCount }}</p>
 True <p>Message: {{ message }}</p>
 True <button @click="increment">Increment</button>
 True <button @click="changeMessage">Change Message</button>
 True </div>
 True </div>
 True</template>
 True
 True<script setup>
 Trueimport { ref, computed } from 'vue'
 True
 Trueconst count = ref(0)
 Trueconst message = ref('Hello')
 Trueconst doubleCount = computed(() => count.value * 2)
 True
 Trueconst increment = () => count.value++
 Trueconst changeMessage = () => message.value = 'Hi'
 True</script>
 True
 True<style scoped>
 True.reactive-example {
 True padding: 20px;
 True border: 1px solid #ddd;
 True border-radius: 8px;
 True max-width: 400px;
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

 False### 6.2 监听器示例
 False
```vue
 True<template>
 True <div class="watch-example">
 True <h2>Watch Example</h2>
 True <div>
 True <p>Count: {{ count }}</p>
 True <p>Message: {{ message }}</p>
 True <button @click="increment">Increment</button>
 True <button @click="changeMessage">Change Message</button>
 True <div>
 True <h3>Watch Log:</h3>
 True <ul>
 True <li v-for="(log, index) in logs" :key="index">{{ log }}</li>
 True </ul>
 True </div>
 True </div>
 True </div>
 True</template>
 True
 True<script setup>
 Trueimport { ref, watch, watchEffect } from 'vue'
 True
 Trueconst count = ref(0)
 Trueconst message = ref('Hello')
 Trueconst logs = ref([])
 True
 True// 使用 watch 监听单个数据
 Truewatch(count, (newValue, oldValue) => {
 True logs.value.push(`Count changed from ${oldValue} to ${newValue}`)
 True})
 True
 True// 使用 watch 监听多个数据
 Truewatch([count, message], ([newCount, newMessage], [oldCount, oldMessage]) => {
 True if (newCount !== oldCount) {
 True logs.value.push(`Count changed from ${oldCount} to ${newCount}`)
 True }
 True if (newMessage !== oldMessage) {
 True logs.value.push(`Message changed from ${oldMessage} to ${newMessage}`)
 True }
 True})
 True
 True// 使用 watchEffect 自动追踪依赖
 TruewatchEffect(() => {
 True logs.value.push(`Current count: ${count.value}, current message: ${message.value}`)
 True})
 True
 Trueconst increment = () => count.value++
 Trueconst changeMessage = () => message.value = `Hi ${Math.random()}`
 True</script>
 True
 True<style scoped>
 True.watch-example {
 True padding: 20px;
 True border: 1px solid #ddd;
 True border-radius: 8px;
 True max-width: 400px;
 True margin: 0 auto;
 True}
 True
 Truebutton {
 True margin: 0 5px;
 True padding: 5px 10px;
 True font-size: 16px;
 True}
 True
 Trueul {
 True list-style-type: none;
 True padding: 0;
 True}
 True
 Trueli {
 True padding: 5px 0;
 True border-bottom: 1px solid #eee;
 True}
 True</style>
 True```

 False### 6.3 计算属性示例
 False
```vue
 True<template>
 True <div class="computed-example">
 True <h2>Computed Example</h2>
 True <div>
 True <p>First Name: <input v-model="firstName" /></p>
 True <p>Last Name: <input v-model="lastName" /></p>
 True <p>Full Name: {{ fullName }}</p>
 True <p>Full Name Length: {{ fullNameLength }}</p>
 True </div>
 True </div>
 True</template>
 True
 True<script setup>
 Trueimport { ref, computed } from 'vue'
 True
 Trueconst firstName = ref('John')
 Trueconst lastName = ref('Doe')
 True
 True// 计算全名
 Trueconst fullName = computed(() => `${firstName.value} ${lastName.value}`)
 True
 True// 计算全名长度
 Trueconst fullNameLength = computed(() => fullName.value.length)
 True</script>
 True
 True<style scoped>
 True.computed-example {
 True padding: 20px;
 True border: 1px solid #ddd;
 True border-radius: 8px;
 True max-width: 400px;
 True margin: 0 auto;
 True}
 True
 Trueinput {
 True width: 200px;
 True padding: 5px;
 True}
 True</style>
 True```

 False## 7. 小结 | Summary
 False
 FalseVue3 的响应式系统是其核心特性之一，它使用 ES6 Proxy 提供了更强大的响应式能力。通过本章节的学习，你已经了解了 Vue3 响应式系统的基本概念和使用方法，包括响应式 API、响应式工具、响应式系统的陷阱和最佳实践。
 False
 False响应式系统的核心优势在于它使得数据变化能够自动触发视图更新，减少了手动操作 DOM 的需要，提高了开发效率。在实际开发中，要根据具体场景选择合适的响应式 API，避免过度响应，合理使用计算属性和监听器，以提高应用的性能和可维护性。

## 延伸阅读

- [[javascript/prototype-and-inheritance|JS 原型链]]
- [[javascript/async-programming|JS 异步]]
 False