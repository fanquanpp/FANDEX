---
order: 80
tags:
  - vue3
  - typescript
difficulty: intermediate
title: 'TypeScript 集成'
module: vue3
category: 'Vue3 Basics'
description: Vue3中TypeScript的集成与使用
author: fanquanpp
updated: '2026-05-03'
related:
  - vue3/自定义Hook
  - vue3/组件系统
  - vue3/Pinia状态管理详解
  - vue3/插件开发
prerequisites:
  - vue3/语法速查
---

## 1. TypeScript 集成概述 | TypeScript Integration Overview

TypeScript 是 JavaScript 的超集，它添加了静态类型系统，提供了更好的代码提示、类型检查和代码重构能力。Vue3 对 TypeScript 提供了良好的支持，通过集成 TypeScript，可以提高代码的可维护性和类型安全性。

### 1.1 TypeScript 的优势

- **类型安全**：提供静态类型检查，减少运行时错误
- **代码提示**：IDE 提供更好的代码提示和自动补全
- **代码重构**：更安全的代码重构，减少重构引入的错误
- **可读性**：类型注解提高代码的可读性和可维护性
- **生态系统**：丰富的类型定义库和工具

### 1.2 Vue3 对 TypeScript 的支持

- **内置类型定义**：Vue3 提供了完整的 TypeScript 类型定义
- **组合式 API**：组合式 API 天然支持 TypeScript
- **脚本设置**：`script setup` 语法糖对 TypeScript 有良好的支持
- **工具链**：Vite 等构建工具对 TypeScript 有良好的支持

## 2. 环境设置 | Environment Setup

### 2.1 创建 TypeScript 项目

使用 Vite 创建 Vue3 + TypeScript 项目：

```bash
 # 使用 npm
 npm create vite@latest my-vue3-ts-app -- --template vue-ts
 # 使用 yarn
 yarn create vite my-vue3-ts-app --template vue-ts
 # 使用 pnpm
 pnpm create vite my-vue3-ts-app --template vue-ts
```

### 2.2 配置 TypeScript

TypeScript 配置文件 `tsconfig.json`：

```json
 {
  "compilerOptions": {
  "target": "ES2020",
  "useDefineForClassFields": true,
  "module": "ESNext",
  "lib": ["ES2020", "DOM", "DOM.Iterable"],
  "skipLibCheck": true,
  /* Bundler mode */
  "moduleResolution": "bundler",
  "allowImportingTsExtensions": true,
  "resolveJsonModule": true,
  "isolatedModules": true,
  "noEmit": true,
  "jsx": "preserve",
  /* Linting */
  "strict": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true,
  "noFallthroughCasesInSwitch":
  },
  "include": ["src/**/*.ts", "src/**/*.d.ts", "src/**/*.tsx", "src/**/*.vue"],
  "references": [{ "path": "./tsconfig.node.json" }]
 }
```

### 2.3 安装依赖

```bash
 # 安装 TypeScript
 npm install typescript
 # 安装 Vue 类型定义
 npm install @vue/runtime-core
 # 安装 ESLint 和 Prettier
 npm install eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin prettier
```

## 3. 基本类型使用 | Basic Type Usage

### 3.1 基础类型

```typescript
 // 字符串
 const message: string = 'Hello TypeScript'
 // 数字
 const count: number = 42
 // 布尔值
 const isActive: boolean =
 // 数组
 const numbers: number[] = [1, 2, 3]
 const strings: Array<string> = ['a', 'b', 'c']
 // 元组
 const person: [string, number] = ['John', 30]
 // 枚举
 enum Color {
  Red,
  Green,
  Blue
 }
 const color: Color = Color.Red
 // 任意类型
 const anything: any = 'anything'
 // 未知类型
 const unknownValue: unknown = 'unknown'
 // 空类型
 const nothing: void = undefined
 // 永不返回的函数
 function error(message: string): never {
  throw new Error(message)
 }
```

### 3.2 接口

```typescript
interface User {
  id: number;
  name: string;
  email: string;
  age?: number; // 可选属性
  readonly createdAt: Date; // 只读属性
}
const user: User = {
  id: 1,
  name: 'John',
  email: 'john@example.com',
  createdAt: new Date(),
};
// 函数接口
interface GreetFunction {
  (name: string): string;
}
const greet: GreetFunction = (name) => {
  return `Hello, ${name}!`;
};
```

### 3.3 类型别名

```typescript
type UserId = number;
type UserName = string;
type UserEmail = string;
type User = {
  id: UserId;
  name: UserName;
  email: UserEmail;
  age?: number;
  readonly createdAt: Date;
};
// 联合类型
type Status = 'active' | 'inactive' | 'pending';
const userStatus: Status = 'active';
// 交叉类型
type Person = {
  name: string;
  age: number;
};
type Employee = {
  employeeId: number;
  department: string;
};
type EmployeePerson = Person & Employee;
const employee: EmployeePerson = {
  name: 'John',
  age: 30,
  employeeId: 123,
  department: 'Engineering',
};
```

## 4. Vue 组件中的 TypeScript | TypeScript in Vue Components

### 4.1 单文件组件中的 TypeScript

```vue
<template>
  <div class="component">
    <h2>{{ title }}</h2>
    <p>{{ message }}</p>
    <button @click="handleClick">Click me</button>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue';
// 类型注解
const title: string = 'Hello TypeScript';
const message: string = 'Welcome to Vue3 + TypeScript';
const count: number = ref(0);
// 函数类型
const handleClick: () => void = () => {
  count.value++;
  console.log(`Count: ${count.value}`);
};
</script>
<style scoped>
.component {
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
}
</style>
```

### 4.2 Props 类型

```vue
<template>
  <div class="child">
    <h3>{{ title }}</h3>
    <p>{{ message }}</p>
    <p v-if="count">Count: {{ count }}</p>
  </div>
</template>
<script setup lang="ts">
defineProps<{
  title: string;
  message: string;
  count?: number;
  ;
}>();
</script>
<!-- 或者使用接口 -->
<script setup lang="ts">
interface Props {
  title: string;
  message: string;
  count?: number;
  ;
}
defineProps<Props>();
</script>
```

### 4.3 Emits 类型

```vue
<template>
  <div class="child">
    <button @click="handleClick">Click me</button>
  </div>
</template>
<script setup lang="ts">
const emit = defineEmits<{
  (e: 'click', message: string): void;
  (e: 'custom', data: { id: number; name: string }): void;
  ;
}>();
const handleClick: () => void = () => {
  emit('click', 'Button clicked');
  emit('custom', { id: 1, name: 'Test' });
  ;
};
</script>
```

### 4.4 响应式数据类型

```vue
<template>
  <div class="component">
    <p>Count: {{ count }}</p>
    <p>User: {{ user.name }}</p>
  </div>
</template>
<script setup lang="ts">
import { ref, reactive } from 'vue'
// ref 类型
const count = ref<number>(0)
// reactive 类型
interface User {
 id: number
 name: string
 age?: number
}
const user = reactive<User>({
 id: 1,
 name: 'John'
}
</script>
```

### 4.5 计算属性类型

```vue
<template>
  <div class="component">
    <p>Count: {{ count }}</p>
    <p>Double Count: {{ doubleCount }}</p>
  </div>
</template>
<script setup lang="ts">
import { ref, computed } from 'vue';
const count = ref<number>(0);
// 计算属性类型
const doubleCount = computed<number>(() => {
  return count.value * 2;
});
</script>
```

## 5. 组合式 API 与 TypeScript | Composition API with TypeScript

### 5.1 组合函数类型

```typescript
// composables/useCounter.ts
import { ref, computed, Ref } from 'vue';
export function useCounter(initialValue: number = 0) {
  const count = ref<number>(initialValue);
  const doubleCount = computed<number>(() => count.value * 2);
  const increment = (): void => {
    count.value++;
  };
  const decrement = (): void => {
    count.value--;
  };
  const reset = (): void => {
    count.value = initialValue;
  };
  return {
    count,
    doubleCount,
    increment,
    decrement,
    reset,
  };
}
// 使用组合函数
import { useCounter } from './composables/useCounter';
const { count, doubleCount, increment, decrement, reset } = useCounter(0);
```

### 5.2 依赖注入类型

```typescript
 // 父组件
 import { provide, ref, Ref } from 'vue'
 interface Theme {
  primary: string
  secondary: string
 }
 const theme = ref<Theme>({
  primary: '#42b983',
  secondary: '#35495e'
 }
 provide<Ref<Theme>>('theme', theme)
 // 子组件
 import { inject, Ref } from 'vue'
 interface Theme {
  primary: string
  secondary: string
 }
 const theme = inject<Ref<Theme>>('theme')
```

## 6. 路由与状态管理 | Routing and State Management

### 6.1 Vue Router 与 TypeScript

```typescript
 // router/index.ts
 import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
 const routes: Array<RouteRecordRaw> = [
  {
  path: '/',
  name: 'Home',
  component: () => import('../views/Home.vue')
  },
  {
  path: '/about',
  name: 'About',
  component: () => import('../views/About.vue')
  },
  {
  path: '/user/:id',
  name: 'User',
  component: () => import('../views/User.vue'),
  props:
  }
 ]
 const router = createRouter({
  history: createWebHistory(),
  routes
 }
 export default router
 // 组件中使用
 import { useRoute, useRouter } from 'vue-router'
 const route = useRoute()
 const router = useRouter()
 // 类型安全的参数访问
 const userId = route.params.id as string
 // 类型安全的导航
 router.push({ name: 'User', params: { id: '1' } })
```

### 6.2 Pinia 与 TypeScript

```typescript
 // stores/user.ts
 import { defineStore } from 'pinia'
 import { ref, computed } from 'vue'
 interface User {
  id: number
  name: string
  email: string
 }
 export const useUserStore = defineStore('user', () => {
  const user = ref<User | null>(null)
  const isLoggedIn = computed<boolean>(() => !!user.value)
  const login = (userData: User): void => {
  user.value = userData
  }
  const logout = (): void => {
  user.value = null
  }
  return {
  user,
  isLoggedIn,
  login,
  logout
  }
 }
 // 组件中使用
 import { useUserStore } from './stores/user'
 const userStore = useUserStore()
 userStore.login({
  id: 1,
  name: 'John',
  email: 'john@example.com'
 }
 console.log(userStore.isLoggedIn) //
```

## 7. 工具类型 | Utility Types

### 7.1 内置工具类型

```typescript
// Partial<T> - 使所有属性可选
interface User {
  id: number;
  name: string;
  email: string;
}
const partialUser: Partial<User> = {
  name: 'John',
};
// Required<T> - 使所有属性必需
const requiredUser: Required<User> = {
  id: 1,
  name: 'John',
  email: 'john@example.com',
};
// Readonly<T> - 使所有属性只读
const readonlyUser: Readonly<User> = {
  id: 1,
  name: 'John',
  email: 'john@example.com',
};
// Pick<T, K> - 从 T 中选取 K 个属性
const pickedUser: Pick<User, 'name' | 'email'> = {
  name: 'John',
  email: 'john@example.com',
};
// Omit<T, K> - 从 T 中排除 K 个属性
const omittedUser: Omit<User, 'id'> = {
  name: 'John',
  email: 'john@example.com',
};
// Record<K, T> - 构建键为 K 类型，值为 T 类型的对象
const userMap: Record<number, User> = {
  1: { id: 1, name: 'John', email: 'john@example.com' },
  2: { id: 2, name: 'Jane', email: 'jane@example.com' },
};
```

### 7.2 自定义工具类型

```typescript
// 深度部分类型
type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;
// 深度只读类型
type DeepReadonly<T> = T extends object
  ? {
      readonly [P in keyof T]: DeepReadonly<T[P]>;
    }
  : T;
// 非空类型
type NonNullable<T> = T extends null | undefined ? never : T;
// 函数参数类型
type Parameters<T extends (...args: any[]) => any> = T extends (...args: infer P) => any
  ? P
  : never;
// 函数返回类型
type ReturnType<T extends (...args: any[]) => any> = T extends (...args: any[]) => infer R
  ? R
  : any;
```

## 8. 最佳实践 | Best Practices

### 8.1 类型定义

- **使用接口**：对于对象类型，优先使用接口
- **使用类型别名**：对于联合类型、交叉类型等，使用类型别名
- **使用泛型**：对于可复用的类型，使用泛型
- **避免 any**：尽量避免使用 any 类型，使用 unknown 代替

### 8.2 组件设计

- **明确 props 类型**：为组件的 props 定义明确的类型
- **明确 emits 类型**：为组件的事件定义明确的类型
- **使用类型断言**：在必要时使用类型断言，但要谨慎
- **使用类型守卫**：使用类型守卫提高类型安全性

### 8.3 代码组织

- **类型文件**：将共享的类型定义放在单独的类型文件中
- **命名规范**：使用 PascalCase 命名接口和类型别名
- **注释**：为复杂的类型添加注释
- **模块化**：将类型定义按功能模块划分

### 8.4 工具配置

- **严格模式**：启用 TypeScript 的严格模式
- **ESLint**：配置 ESLint 检查 TypeScript 代码
- **Prettier**：使用 Prettier 格式化 TypeScript 代码
- **编辑器配置**：配置 VS Code 等编辑器的 TypeScript 支持

## 9. 示例 | Examples

### 9.1 基础组件示例

```vue
<template>
  <div class="button">
    <button
      :class="['btn', `btn-${variant}`, { 'btn-disabled': disabled }]"
      :disabled="disabled"
      @click="$emit('click')"
    >
      <slot></slot>
    </button>
  </div>
</template>
<script setup lang="ts">
defineProps<{
  variant: 'primary' | 'secondary' | 'success' | 'danger';
  disabled?: boolean;
  ;
}>();
defineEmits<{
  (e: 'click'): void;
  ;
}>();
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

### 9.2 复杂组件示例

```vue
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
<script setup lang="ts">
import { ref, computed } from 'vue'
interface Todo {
 id: number
 text: string
 completed: boolean
}
const todos = ref<Todo[]>([
 { id: 1, text: 'Learn Vue3', completed: false },
 { id: 2, text: 'Learn TypeScript', completed: false },
 { id: 3, text: 'Build a project', completed: false }
]
const newTodo = ref<string>('')
const completedCount = computed<number>(() => {
 return todos.value.filter(todo => todo.completed).length
}
const remainingCount = computed<number>(() => {
 return todos.value.filter(todo => !todo.completed).length
}
const addTodo = (): void => {
 if (newTodo.value.trim()) {
 todos.value.push({
 id: Date.now(),
 text: newTodo.value.trim(),
 completed: false
 })
 newTodo.value = ''
 }
}
const updateTodo = (todo: Todo): void => {
 console.log('Updated todo:', todo)
}
const deleteTodo = (id: number): void => {
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

## 10. 小结 | Summary

TypeScript 与 Vue3 的集成可以提高代码的可维护性和类型安全性，减少运行时错误，提供更好的开发体验。通过本章节的学习，你已经了解了 TypeScript 与 Vue3 集成的基本方法和最佳实践。
在实际开发中，要充分利用 TypeScript 的类型系统，为组件、props、事件、状态等添加明确的类型定义，同时要注意避免过度使用 any 类型，保持代码的类型安全性。只有这样，才能充分发挥 TypeScript 的优势，构建高质量的 Vue3 应用。

## 延伸阅读

- [TypeScript](typescript/overview)
