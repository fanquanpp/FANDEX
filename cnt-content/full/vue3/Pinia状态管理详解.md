---
order: 90
tags:
  - vue3
difficulty: intermediate
title: 'Pinia 状态管理详解'
module: vue3
category: 'Vue3 Basics'
description: 'Store 定义、状态读写、异步操作与插件机制。'
author: fanquanpp
updated: '2026-05-03'
related:
  - vue3/组件系统
  - vue3/TypeScript集成
  - vue3/插件开发
  - vue3/computed缓存机制与watch执行时机
prerequisites:
  - vue3/语法速查
---

## 1. Pinia 概述

Pinia 是 Vue 3 官方推荐的状态管理库，它是 Vuex 的替代品，提供了更简洁的 API 和更好的 TypeScript 支持。

### 1.1 主要特性

- **简洁的 API**：使用组合式 API 风格
- **更好的 TypeScript 支持**：无需手动类型声明
- **模块化设计**：支持多个 Store
- **支持插件**：可以扩展 Pinia 功能
- **支持持久化**：可以轻松实现状态持久化
- **支持热更新**：开发时可以热更新状态
- **支持 SSR**：服务端渲染友好

## 2. 环境搭建

### 2.1 安装 Pinia

```bash
 # 使用 npm
 npm install pinia
 # 使用 yarn
 yarn add pinia
```

### 2.2 基本配置

```ts
// main.ts
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
const app = createApp(App);
const pinia = createPinia();
app.use(pinia);
app.mount('#app');
```

## 3. 基础用法

### 3.1 创建 Store

```ts
 // store/counter.ts
 import { defineStore } from 'pinia'
 export const useCounterStore = defineStore('counter', {
  // 状态
  state: () => ({
  count: 0,
  name: '计数器'
  }),
  // 计算属性
  getters: {
  doubleCount: (state) => state.count * 2,
  // 可以访问其他 getter
  doubleCountPlusOne: (state, getters) => getters.doubleCount + 1
  },
  // 方法
  actions: {
  increment() {
  this.count++
  },
  incrementBy(amount: number) {
  this.count += amount
  },
  // 异步操作
  async incrementAsync() {
  await new Promise(resolve => setTimeout(resolve, 1000))
  this.count++
  }
  }
 }
```

### 3.2 使用 Store

```vue
<template>
  <div>
    <h1>{{ counterStore.name }}</h1>
    <p>Count: {{ counterStore.count }}</p>
    <p>Double Count: {{ counterStore.doubleCount }}</p>
    <p>Double Count Plus One: {{ counterStore.doubleCountPlusOne }}</p>
    <button @click="counterStore.increment">Increment</button>
    <button @click="counterStore.incrementBy(5)">Increment by 5</button>
    <button @click="counterStore.incrementAsync">Increment Async</button>
  </div>
</template>
<script setup lang="ts">
import { useCounterStore } from '../store/counter';
const counterStore = useCounterStore();
</script>
```

## 4. 状态管理

### 4.1 直接修改状态

```vue
<script setup lang="ts">
import { useCounterStore } from '../store/counter';
const counterStore = useCounterStore();
// 直接修改状态
counterStore.count = 10;
</script>
```

### 4.2 使用 $patch 批量修改

```vue
<script setup lang="ts">
import { useCounterStore } from '../store/counter'
const counterStore = useCounterStore()
// 批量修改状态
counterStore.$patch({
 count: 20,
 name: '新计数器'
}
// 使用函数形式批量修改
counterStore.$patch((state) => {
 state.count += 10
 state.name = '更新后的计数器'
}
</script>
```

### 4.3 重置状态

```vue
<script setup lang="ts">
import { useCounterStore } from '../store/counter';
const counterStore = useCounterStore();
// 重置状态到初始值
function resetStore() {
  counterStore.$reset();
}
</script>
```

## 5. Getters

### 5.1 基础 Getters

```ts
 export const useCounterStore = defineStore('counter', {
  state: () => ({
  count: 0
  }),
  getters: {
  // 基础 getter
  doubleCount: (state) => state.count * 2,
  // 带参数的 getter
  getCountBy: (state) => (multiplier: number) => state.count * multiplier
  }
 }
```

```vue
<template>
  <div>
    <p>Double Count: {{ counterStore.doubleCount }}</p>
    <p>Count * 3: {{ counterStore.getCountBy(3) }}</p>
  </div>
</template>
```

### 5.2 访问其他 Store 的 Getters

```ts
 // store/user.ts
 import { defineStore } from 'pinia'
 import { useCounterStore } from './counter'
 export const useUserStore = defineStore('user', {
  state: () => ({
  name: '张三'
  }),
  getters: {
  // 访问其他 store 的 getter
  userWithCount: (state) => {
  const counterStore = useCounterStore()
  return `${state.name} 的计数器值为 ${counterStore.count}`
  }
  }
 }
```

## 6. Actions

### 6.1 基础 Actions

```ts
 export const useCounterStore = defineStore('counter', {
  state: () => ({
  count: 0
  }),
  actions: {
  increment() {
  this.count++
  },
  incrementBy(amount: number) {
  this.count += amount
  }
  }
 }
```

### 6.2 异步 Actions

```ts
 export const useUserStore = defineStore('user', {
  state: () => ({
  userList: [],
  loading: false
  }),
  actions: {
  async fetchUsers() {
  this.loading =
  try {
  const response = await fetch('https://api.example.com/users')
  this.userList = await response.json()
  } catch (error) {
  console.error('获取用户列表失败:', error)
  } finally {
  this.loading = false
  }
  }
  }
 }
```

### 6.3 访问其他 Store 的 Actions

```ts
 // store/cart.ts
 import { defineStore } from 'pinia'
 import { useUserStore } from './user'
 export const useCartStore = defineStore('cart', {
  state: () => ({
  items: []
  }),
  actions: {
  addItem(item: any) {
  this.items.push(item)
  // 访问其他 store 的 action
  const userStore = useUserStore()
  userStore.updateLastActivity()
  }
  }
 }
```

## 7. 模块化

### 7.1 基本模块化

```ts
// store/modules/user.ts
export const useUserStore = defineStore('user', {
  // ...
  ,
});
// store/modules/cart.ts
export const useCartStore = defineStore('cart', {
  // ...
  ,
});
// store/index.ts
export * from './modules/user';
export * from './modules/cart';
```

### 7.2 组合式 Store

```ts
// store/user.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
export const useUserStore = defineStore('user', () => {
  // 状态
  const name = ref('张三');
  const age = ref(20);
  // 计算属性
  const isAdult = computed(() => age.value >= 18);
  // 方法
  function updateName(newName: string) {
    name.value = newName;
  }
  function incrementAge() {
    age.value++;
  }
  return {
    name,
    age,
    isAdult,
    updateName,
    incrementAge,
  };
});
```

## 8. 持久化

### 8.1 使用 pinia-plugin-persistedstate

安装：

```bash
 npm install pinia-plugin-persistedstate
```

配置：

```ts
// main.ts
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';
import App from './App.vue';
const app = createApp(App);
const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);
app.use(pinia);
app.mount('#app');
```

使用：

```ts
export const useCounterStore = defineStore('counter', {
  state: () => ({
    count: 0,
  }),
  // 启用持久化
  persist: True,
});
```

### 8.2 自定义持久化配置

```ts
 export const useUserStore = defineStore('user', {
  state: () => ({
  name: '张三',
  age: 20,
  token: ''
  }),
  persist: {
  // 存储到 localStorage
  storage: localStorage,
  // 只持久化特定字段
  paths: ['name', 'token'],
  // 自定义键名
  key: 'user-storage'
  }
 }
```

## 9. 插件

### 9.1 自定义插件

```ts
// pinia plugins
import { PiniaPluginContext } from 'pinia';
export function myPiniaPlugin(context: PiniaPluginContext) {
  const { store } = context;
  // 在 store 初始化时执行
  console.log('Store initialized:', store.$id);
  // 添加自定义方法
  store.$resetState = () => {
    store.$reset();
    console.log('Store reset:', store.$id);
  };
  // 监听状态变化
  store.$subscribe((mutation, state) => {
    console.log('State changed:', mutation.type, state);
  });
}
// main.ts
import { createPinia } from 'pinia';
import { myPiniaPlugin } from './plugins/pinia';
const pinia = createPinia();
pinia.use(myPiniaPlugin);
```

### 9.2 使用官方插件

- **pinia-plugin-persistedstate**：状态持久化
- **pinia-plugin-debug**：调试工具
- **pinia-plugin-logger**：日志记录

## 10. 类型安全

### 10.1 TypeScript 支持

```ts
 // store/user.ts
 import { defineStore } from 'pinia'
 interface User {
  id: number
  name: string
  email: string
 }
 export const useUserStore = defineStore('user', {
  state: (): {
  users: User[]
  loading: boolean
  } => ({
  users: [],
  loading: false
  }),
  getters: {
  activeUsers: (state): User[] => {
  return state.users.filter(user => user.name.length > 0)
  }
  },
  actions: {
  addUser(user: User) {
  this.users.push(user)
  }
  }
 }
```

### 10.2 组合式 Store 的类型

```ts
// store/user.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
interface User {
  id: number;
  name: string;
  ;
}
export const useUserStore = defineStore('user', () => {
  const users = ref<User[]>([]);
  const loading = ref(false);
  const activeUsers = computed(() => {
    return users.value.filter((user) => user.name.length > 0);
  });
  function addUser(user: User) {
    users.value.push(user);
  }
  return {
    users,
    loading,
    activeUsers,
    addUser,
  };
  ;
});
```

## 11. 最佳实践

1. **使用模块化**：将不同功能的状态分离到不同的 Store 中
2. **使用组合式 API**：对于复杂的 Store，使用组合式 API 风格
3. **使用 TypeScript**：提供类型安全，减少运行时错误
4. **合理使用持久化**：只持久化必要的状态
5. **使用 actions 处理复杂逻辑**：将业务逻辑封装在 actions 中
6. **使用 getters 处理派生状态**：避免在组件中重复计算
7. **监听状态变化**：使用 $subscribe 监听状态变化，执行副作用
8. **测试 Store**：确保 Store 的逻辑正确

## 12. 常见问题与解决方案

### 12.1 状态更新后组件不更新

**问题**：修改状态后组件没有重新渲染
**解决方案**：确保使用正确的方式修改状态，对于对象和数组，使用 $patch 或直接替换整个对象/数组

### 12.2 持久化不生效

**问题**：状态持久化后刷新页面状态丢失
**解决方案**：检查持久化配置是否正确，确保存储介质（localStorage/sessionStorage）可用

### 12.3 多个 Store 之间的依赖

**问题**：多个 Store 之间存在循环依赖
**解决方案**：在 actions 中按需导入其他 Store，避免在模块顶部直接导入

### 12.4 异步操作的错误处理

**问题**：异步 actions 中的错误没有被正确处理
**解决方案**：使用 try/catch 捕获错误，并在组件中处理错误状态

## 13. 总结

Pinia 是 Vue3 生态系统中推荐的状态管理库，它提供了简洁的 API、更好的 TypeScript 支持和强大的功能。通过本教程的学习，你应该已经掌握了 Pinia 的核心概念和使用方法，可以在实际项目中灵活运用。
