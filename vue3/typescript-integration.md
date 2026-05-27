# 02-TypeScript 集成 | TypeScript Integration
 False
 False> @Author: fanquanpp
 False> @Category: Vue3 Basics
 False> @Description: 02-TypeScript 集成 | TypeScript Integration
 False> @Updated: 2026-05-03
 False
 False---
 False
 False## 目录
 False
 False1. [TypeScript 集成概述 | TypeScript Integration Overview](#typescript-集成概述-|-typescript-integration-overview)
 False2. [环境设置 | Environment Setup](#环境设置-|-environment-setup)
 False3. [基本类型使用 | Basic Type Usage](#基本类型使用-|-basic-type-usage)
 False4. [Vue 组件中的 TypeScript | TypeScript in Vue Components](#vue-组件中的-typescript-|-typescript-in-vue-components)
 False5. [组合式 API 与 TypeScript | Composition API with TypeScript](#组合式-api-与-typescript-|-composition-api-with-typescript)
 False6. [路由与状态管理 | Routing and State Management](#路由与状态管理-|-routing-and-state-management)
 False7. [工具类型 | Utility Types](#工具类型-|-utility-types)
 False8. [最佳实践 | Best Practices](#最佳实践-|-best-practices)
 False9. [示例 | Examples](#示例-|-examples)
 False10. [小结 | Summary](#小结-|-summary)
 False
 False---
 False
 False## 1. TypeScript 集成概述 | TypeScript Integration Overview
 False
 FalseTypeScript 是 JavaScript 的超集，它添加了静态类型系统，提供了更好的代码提示、类型检查和代码重构能力。Vue3 对 TypeScript 提供了良好的支持，通过集成 TypeScript，可以提高代码的可维护性和类型安全性。
 False
 False### 1.1 TypeScript 的优势
 False
 False- **类型安全**：提供静态类型检查，减少运行时错误
 False- **代码提示**：IDE 提供更好的代码提示和自动补全
 False- **代码重构**：更安全的代码重构，减少重构引入的错误
 False- **可读性**：类型注解提高代码的可读性和可维护性
 False- **生态系统**：丰富的类型定义库和工具
 False
 False### 1.2 Vue3 对 TypeScript 的支持
 False
 False- **内置类型定义**：Vue3 提供了完整的 TypeScript 类型定义
 False- **组合式 API**：组合式 API 天然支持 TypeScript
 False- **脚本设置**：`script setup` 语法糖对 TypeScript 有良好的支持
 False- **工具链**：Vite 等构建工具对 TypeScript 有良好的支持
 False
 False## 2. 环境设置 | Environment Setup
 False
 False### 2.1 创建 TypeScript 项目
 False
 False使用 Vite 创建 Vue3 + TypeScript 项目：
 False
```bash
 True# 使用 npm
 Truenpm create vite@latest my-vue3-ts-app -- --template vue-ts
 True
 True# 使用 yarn
 Trueyarn create vite my-vue3-ts-app --template vue-ts
 True
 True# 使用 pnpm
 Truepnpm create vite my-vue3-ts-app --template vue-ts
 True```

 False### 2.2 配置 TypeScript
 False
 FalseTypeScript 配置文件 `tsconfig.json`：
 False
```json
 True{
 True "compilerOptions": {
 True "target": "ES2020",
 True "useDefineForClassFields": true,
 True "module": "ESNext",
 True "lib": ["ES2020", "DOM", "DOM.Iterable"],
 True "skipLibCheck": true,
 True
 True /* Bundler mode */
 True "moduleResolution": "bundler",
 True "allowImportingTsExtensions": true,
 True "resolveJsonModule": true,
 True "isolatedModules": true,
 True "noEmit": true,
 True "jsx": "preserve",
 True
 True /* Linting */
 True "strict": true,
 True "noUnusedLocals": true,
 True "noUnusedParameters": true,
 True "noFallthroughCasesInSwitch": true
 True },
 True "include": ["src/**/*.ts", "src/**/*.d.ts", "src/**/*.tsx", "src/**/*.vue"],
 True "references": [{ "path": "./tsconfig.node.json" }]
 True}
 True```

 False### 2.3 安装依赖
 False
```bash
 True# 安装 TypeScript
 Truenpm install typescript
 True
 True# 安装 Vue 类型定义
 Truenpm install @vue/runtime-core
 True
 True# 安装 ESLint 和 Prettier
 Truenpm install eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin prettier
 True```

 False## 3. 基本类型使用 | Basic Type Usage
 False
 False### 3.1 基础类型
 False
```typescript
 True// 字符串
 Trueconst message: string = 'Hello TypeScript'
 True
 True// 数字
 Trueconst count: number = 42
 True
 True// 布尔值
 Trueconst isActive: boolean = true
 True
 True// 数组
 Trueconst numbers: number[] = [1, 2, 3]
 Trueconst strings: Array<string> = ['a', 'b', 'c']
 True
 True// 元组
 Trueconst person: [string, number] = ['John', 30]
 True
 True// 枚举
 Trueenum Color {
 True Red,
 True Green,
 True Blue
 True}
 Trueconst color: Color = Color.Red
 True
 True// 任意类型
 Trueconst anything: any = 'anything'
 True
 True// 未知类型
 Trueconst unknownValue: unknown = 'unknown'
 True
 True// 空类型
 Trueconst nothing: void = undefined
 True
 True// 永不返回的函数
 Truefunction error(message: string): never {
 True throw new Error(message)
 True}
 True```

 False### 3.2 接口
 False
```typescript
 Trueinterface User {
 True id: number
 True name: string
 True email: string
 True age?: number // 可选属性
 True readonly createdAt: Date // 只读属性
 True}
 True
 Trueconst user: User = {
 True id: 1,
 True name: 'John',
 True email: 'john@example.com',
 True createdAt: new Date()
 True}
 True
 True// 函数接口
 Trueinterface GreetFunction {
 True (name: string): string
 True}
 True
 Trueconst greet: GreetFunction = (name) => {
 True return `Hello, ${name}!`
 True}
 True```

 False### 3.3 类型别名
 False
```typescript
 Truetype UserId = number
 Truetype UserName = string
 Truetype UserEmail = string
 True
 Truetype User = {
 True id: UserId
 True name: UserName
 True email: UserEmail
 True age?: number
 True readonly createdAt: Date
 True}
 True
 True// 联合类型
 Truetype Status = 'active' | 'inactive' | 'pending'
 Trueconst userStatus: Status = 'active'
 True
 True// 交叉类型
 Truetype Person = {
 True name: string
 True age: number
 True}
 True
 Truetype Employee = {
 True employeeId: number
 True department: string
 True}
 True
 Truetype EmployeePerson = Person & Employee
 True
 Trueconst employee: EmployeePerson = {
 True name: 'John',
 True age: 30,
 True employeeId: 123,
 True department: 'Engineering'
 True}
 True```

 False## 4. Vue 组件中的 TypeScript | TypeScript in Vue Components
 False
 False### 4.1 单文件组件中的 TypeScript
 False
```vue
 True<template>
 True <div class="component">
 True <h2>{{ title }}</h2>
 True <p>{{ message }}</p>
 True <button @click="handleClick">Click me</button>
 True </div>
 True</template>
 True
 True<script setup lang="ts">
 Trueimport { ref } from 'vue'
 True
 True// 类型注解
 Trueconst title: string = 'Hello TypeScript'
 Trueconst message: string = 'Welcome to Vue3 + TypeScript'
 Trueconst count: number = ref(0)
 True
 True// 函数类型
 Trueconst handleClick: () => void = () => {
 True count.value++
 True console.log(`Count: ${count.value}`)
 True}
 True</script>
 True
 True<style scoped>
 True.component {
 True padding: 20px;
 True border: 1px solid #ddd;
 True border-radius: 8px;
 True}
 True</style>
 True```

 False### 4.2 Props 类型
 False
```vue
 True<template>
 True <div class="child">
 True <h3>{{ title }}</h3>
 True <p>{{ message }}</p>
 True <p v-if="count">Count: {{ count }}</p>
 True </div>
 True</template>
 True
 True<script setup lang="ts">
 TruedefineProps<{
 True title: string
 True message: string
 True count?: number
 True}>()
 True</script>
 True
 True<!-- 或者使用接口 -->
 True<script setup lang="ts">
 Trueinterface Props {
 True title: string
 True message: string
 True count?: number
 True}
 True
 TruedefineProps<Props>()
 True</script>
 True```

 False### 4.3 Emits 类型
 False
```vue
 True<template>
 True <div class="child">
 True <button @click="handleClick">Click me</button>
 True </div>
 True</template>
 True
 True<script setup lang="ts">
 Trueconst emit = defineEmits<{
 True (e: 'click', message: string): void
 True (e: 'custom', data: { id: number; name: string }): void
 True}>()
 True
 Trueconst handleClick: () => void = () => {
 True emit('click', 'Button clicked')
 True emit('custom', { id: 1, name: 'Test' })
 True}
 True</script>
 True```

 False### 4.4 响应式数据类型
 False
```vue
 True<template>
 True <div class="component">
 True <p>Count: {{ count }}</p>
 True <p>User: {{ user.name }}</p>
 True </div>
 True</template>
 True
 True<script setup lang="ts">
 Trueimport { ref, reactive } from 'vue'
 True
 True// ref 类型
 Trueconst count = ref<number>(0)
 True
 True// reactive 类型
 Trueinterface User {
 True id: number
 True name: string
 True age?: number
 True}
 True
 Trueconst user = reactive<User>({
 True id: 1,
 True name: 'John'
 True})
 True</script>
 True```

 False### 4.5 计算属性类型
 False
```vue
 True<template>
 True <div class="component">
 True <p>Count: {{ count }}</p>
 True <p>Double Count: {{ doubleCount }}</p>
 True </div>
 True</template>
 True
 True<script setup lang="ts">
 Trueimport { ref, computed } from 'vue'
 True
 Trueconst count = ref<number>(0)
 True
 True// 计算属性类型
 Trueconst doubleCount = computed<number>(() => {
 True return count.value * 2
 True})
 True</script>
 True```

 False## 5. 组合式 API 与 TypeScript | Composition API with TypeScript
 False
 False### 5.1 组合函数类型
 False
```typescript
 True// composables/useCounter.ts
 Trueimport { ref, computed, Ref } from 'vue'
 True
 Trueexport function useCounter(initialValue: number = 0) {
 True const count = ref<number>(initialValue)
 True const doubleCount = computed<number>(() => count.value * 2)
 True
 True const increment = (): void => {
 True count.value++
 True }
 True
 True const decrement = (): void => {
 True count.value--
 True }
 True
 True const reset = (): void => {
 True count.value = initialValue
 True }
 True
 True return {
 True count,
 True doubleCount,
 True increment,
 True decrement,
 True reset
 True }
 True}
 True
 True// 使用组合函数
 Trueimport { useCounter } from './composables/useCounter'
 True
 Trueconst { count, doubleCount, increment, decrement, reset } = useCounter(0)
 True```

 False### 5.2 依赖注入类型
 False
```typescript
 True// 父组件
 Trueimport { provide, ref, Ref } from 'vue'
 True
 Trueinterface Theme {
 True primary: string
 True secondary: string
 True}
 True
 Trueconst theme = ref<Theme>({
 True primary: '#42b983',
 True secondary: '#35495e'
 True})
 True
 Trueprovide<Ref<Theme>>('theme', theme)
 True
 True// 子组件
 Trueimport { inject, Ref } from 'vue'
 True
 Trueinterface Theme {
 True primary: string
 True secondary: string
 True}
 True
 Trueconst theme = inject<Ref<Theme>>('theme')
 True```

 False## 6. 路由与状态管理 | Routing and State Management
 False
 False### 6.1 Vue Router 与 TypeScript
 False
```typescript
 True// router/index.ts
 Trueimport { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
 True
 Trueconst routes: Array<RouteRecordRaw> = [
 True {
 True path: '/',
 True name: 'Home',
 True component: () => import('../views/Home.vue')
 True },
 True {
 True path: '/about',
 True name: 'About',
 True component: () => import('../views/About.vue')
 True },
 True {
 True path: '/user/:id',
 True name: 'User',
 True component: () => import('../views/User.vue'),
 True props: true
 True }
 True]
 True
 Trueconst router = createRouter({
 True history: createWebHistory(),
 True routes
 True})
 True
 Trueexport default router
 True
 True// 组件中使用
 Trueimport { useRoute, useRouter } from 'vue-router'
 True
 Trueconst route = useRoute()
 Trueconst router = useRouter()
 True
 True// 类型安全的参数访问
 Trueconst userId = route.params.id as string
 True
 True// 类型安全的导航
 Truerouter.push({ name: 'User', params: { id: '1' } })
 True```

 False### 6.2 Pinia 与 TypeScript
 False
```typescript
 True// stores/user.ts
 Trueimport { defineStore } from 'pinia'
 Trueimport { ref, computed } from 'vue'
 True
 Trueinterface User {
 True id: number
 True name: string
 True email: string
 True}
 True
 Trueexport const useUserStore = defineStore('user', () => {
 True const user = ref<User | null>(null)
 True const isLoggedIn = computed<boolean>(() => !!user.value)
 True
 True const login = (userData: User): void => {
 True user.value = userData
 True }
 True
 True const logout = (): void => {
 True user.value = null
 True }
 True
 True return {
 True user,
 True isLoggedIn,
 True login,
 True logout
 True }
 True})
 True
 True// 组件中使用
 Trueimport { useUserStore } from './stores/user'
 True
 Trueconst userStore = useUserStore()
 True
 TrueuserStore.login({
 True id: 1,
 True name: 'John',
 True email: 'john@example.com'
 True})
 True
 Trueconsole.log(userStore.isLoggedIn) // true
 True```

 False## 7. 工具类型 | Utility Types
 False
 False### 7.1 内置工具类型
 False
```typescript
 True// Partial<T> - 使所有属性可选
 Trueinterface User {
 True id: number
 True name: string
 True email: string
 True}
 True
 Trueconst partialUser: Partial<User> = {
 True name: 'John'
 True}
 True
 True// Required<T> - 使所有属性必需
 Trueconst requiredUser: Required<User> = {
 True id: 1,
 True name: 'John',
 True email: 'john@example.com'
 True}
 True
 True// Readonly<T> - 使所有属性只读
 Trueconst readonlyUser: Readonly<User> = {
 True id: 1,
 True name: 'John',
 True email: 'john@example.com'
 True}
 True
 True// Pick<T, K> - 从 T 中选取 K 个属性
 Trueconst pickedUser: Pick<User, 'name' | 'email'> = {
 True name: 'John',
 True email: 'john@example.com'
 True}
 True
 True// Omit<T, K> - 从 T 中排除 K 个属性
 Trueconst omittedUser: Omit<User, 'id'> = {
 True name: 'John',
 True email: 'john@example.com'
 True}
 True
 True// Record<K, T> - 构建键为 K 类型，值为 T 类型的对象
 Trueconst userMap: Record<number, User> = {
 True 1: { id: 1, name: 'John', email: 'john@example.com' },
 True 2: { id: 2, name: 'Jane', email: 'jane@example.com' }
 True}
 True```

 False### 7.2 自定义工具类型
 False
```typescript
 True// 深度部分类型
 Truetype DeepPartial<T> = T extends object
 True ? {
 True [P in keyof T]?: DeepPartial<T[P]>
 True }
 True : T
 True
 True// 深度只读类型
 Truetype DeepReadonly<T> = T extends object
 True ? {
 True readonly [P in keyof T]: DeepReadonly<T[P]>
 True }
 True : T
 True
 True// 非空类型
 Truetype NonNullable<T> = T extends null | undefined ? never : T
 True
 True// 函数参数类型
 Truetype Parameters<T extends (...args: any[]) => any> = T extends (...args: infer P) => any ? P : never
 True
 True// 函数返回类型
 Truetype ReturnType<T extends (...args: any[]) => any> = T extends (...args: any[]) => infer R ? R : any
 True```

 False## 8. 最佳实践 | Best Practices
 False
 False### 8.1 类型定义
 False
 False- **使用接口**：对于对象类型，优先使用接口
 False- **使用类型别名**：对于联合类型、交叉类型等，使用类型别名
 False- **使用泛型**：对于可复用的类型，使用泛型
 False- **避免 any**：尽量避免使用 any 类型，使用 unknown 代替
 False
 False### 8.2 组件设计
 False
 False- **明确 props 类型**：为组件的 props 定义明确的类型
 False- **明确 emits 类型**：为组件的事件定义明确的类型
 False- **使用类型断言**：在必要时使用类型断言，但要谨慎
 False- **使用类型守卫**：使用类型守卫提高类型安全性
 False
 False### 8.3 代码组织
 False
 False- **类型文件**：将共享的类型定义放在单独的类型文件中
 False- **命名规范**：使用 PascalCase 命名接口和类型别名
 False- **注释**：为复杂的类型添加注释
 False- **模块化**：将类型定义按功能模块划分
 False
 False### 8.4 工具配置
 False
 False- **严格模式**：启用 TypeScript 的严格模式
 False- **ESLint**：配置 ESLint 检查 TypeScript 代码
 False- **Prettier**：使用 Prettier 格式化 TypeScript 代码
 False- **编辑器配置**：配置 VS Code 等编辑器的 TypeScript 支持
 False
 False## 9. 示例 | Examples
 False
 False### 9.1 基础组件示例
 False
```vue
 True<template>
 True <div class="button">
 True <button
 True :class="[
 True 'btn',
 True `btn-${variant}`,
 True { 'btn-disabled': disabled }
 True ]"
 True :disabled="disabled"
 True @click="$emit('click')"
 True >
 True <slot></slot>
 True </button>
 True </div>
 True</template>
 True
 True<script setup lang="ts">
 TruedefineProps<{
 True variant: 'primary' | 'secondary' | 'success' | 'danger'
 True disabled?: boolean
 True}>()
 True
 TruedefineEmits<{
 True (e: 'click'): void
 True}>()
 True</script>
 True
 True<style scoped>
 True.btn {
 True padding: 8px 16px;
 True border: none;
 True border-radius: 4px;
 True cursor: pointer;
 True font-size: 14px;
 True}
 True
 True.btn-primary {
 True background-color: #42b983;
 True color: white;
 True}
 True
 True.btn-secondary {
 True background-color: #999;
 True color: white;
 True}
 True
 True.btn-success {
 True background-color: #28a745;
 True color: white;
 True}
 True
 True.btn-danger {
 True background-color: #dc3545;
 True color: white;
 True}
 True
 True.btn-disabled {
 True opacity: 0.6;
 True cursor: not-allowed;
 True}
 True</style>
 True```

 False### 9.2 复杂组件示例
 False
```vue
 True<template>
 True <div class="todo-list">
 True <h2>Todo List</h2>
 True <div class="todo-input">
 True <input
 True v-model="newTodo"
 True @keyup.enter="addTodo"
 True placeholder="Add a new todo"
 True />
 True <button @click="addTodo">Add</button>
 True </div>
 True <ul class="todo-items">
 True <li v-for="todo in todos" :key="todo.id" class="todo-item">
 True <input
 True type="checkbox"
 True v-model="todo.completed"
 True @change="updateTodo(todo)"
 True />
 True <span :class="{ 'completed': todo.completed }">{{ todo.text }}</span>
 True <button @click="deleteTodo(todo.id)">Delete</button>
 True </li>
 True </ul>
 True <div class="todo-stats">
 True <p>Total: {{ todos.length }}</p>
 True <p>Completed: {{ completedCount }}</p>
 True <p>Remaining: {{ remainingCount }}</p>
 True </div>
 True </div>
 True</template>
 True
 True<script setup lang="ts">
 Trueimport { ref, computed } from 'vue'
 True
 Trueinterface Todo {
 True id: number
 True text: string
 True completed: boolean
 True}
 True
 Trueconst todos = ref<Todo[]>([
 True { id: 1, text: 'Learn Vue3', completed: false },
 True { id: 2, text: 'Learn TypeScript', completed: false },
 True { id: 3, text: 'Build a project', completed: false }
 True])
 True
 Trueconst newTodo = ref<string>('')
 True
 Trueconst completedCount = computed<number>(() => {
 True return todos.value.filter(todo => todo.completed).length
 True})
 True
 Trueconst remainingCount = computed<number>(() => {
 True return todos.value.filter(todo => !todo.completed).length
 True})
 True
 Trueconst addTodo = (): void => {
 True if (newTodo.value.trim()) {
 True todos.value.push({
 True id: Date.now(),
 True text: newTodo.value.trim(),
 True completed: false
 True })
 True newTodo.value = ''
 True }
 True}
 True
 Trueconst updateTodo = (todo: Todo): void => {
 True console.log('Updated todo:', todo)
 True}
 True
 Trueconst deleteTodo = (id: number): void => {
 True todos.value = todos.value.filter(todo => todo.id !== id)
 True}
 True</script>
 True
 True<style scoped>
 True.todo-list {
 True max-width: 400px;
 True margin: 0 auto;
 True padding: 20px;
 True border: 1px solid #ddd;
 True border-radius: 8px;
 True}
 True
 True.todo-input {
 True display: flex;
 True margin-bottom: 20px;
 True}
 True
 True.todo-input input {
 True flex: 1;
 True padding: 8px;
 True border: 1px solid #ddd;
 True border-radius: 4px 0 0 4px;
 True}
 True
 True.todo-input button {
 True padding: 8px 16px;
 True background-color: #42b983;
 True color: white;
 True border: none;
 True border-radius: 0 4px 4px 0;
 True cursor: pointer;
 True}
 True
 True.todo-items {
 True list-style-type: none;
 True padding: 0;
 True margin-bottom: 20px;
 True}
 True
 True.todo-item {
 True display: flex;
 True align-items: center;
 True padding: 10px;
 True border-bottom: 1px solid #eee;
 True}
 True
 True.todo-item input {
 True margin-right: 10px;
 True}
 True
 True.todo-item span {
 True flex: 1;
 True}
 True
 True.todo-item .completed {
 True text-decoration: line-through;
 True color: #999;
 True}
 True
 True.todo-item button {
 True padding: 4px 8px;
 True background-color: #dc3545;
 True color: white;
 True border: none;
 True border-radius: 4px;
 True cursor: pointer;
 True}
 True
 True.todo-stats {
 True display: flex;
 True justify-content: space-between;
 True font-size: 14px;
 True color: #666;
 True}
 True</style>
 True```

 False## 10. 小结 | Summary
 False
 FalseTypeScript 与 Vue3 的集成可以提高代码的可维护性和类型安全性，减少运行时错误，提供更好的开发体验。通过本章节的学习，你已经了解了 TypeScript 与 Vue3 集成的基本方法和最佳实践。
 False
 False在实际开发中，要充分利用 TypeScript 的类型系统，为组件、props、事件、状态等添加明确的类型定义，同时要注意避免过度使用 any 类型，保持代码的类型安全性。只有这样，才能充分发挥 TypeScript 的优势，构建高质量的 Vue3 应用。

## 延伸阅读

- [[typescript/overview|TypeScript]]
 False