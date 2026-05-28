---
order: 20
tags:
  - 'vue3'
  - 'networking'
  - 'typescript'
  - 'reactive'
  - 'devops'
difficulty: 'beginner'
title: 'Vue3 快速入门指南'
module: 'vue3'
category: 'Vue3 Basics'
description: 'Vue3 快速入门指南'
author: 'fanquanpp'
updated: 2026-05-03
---

## 目录

1. [环境搭建](#环境搭建)
2. [项目结构](#项目结构)
3. [第一个 Vue3 应用](#第一个-vue3-应用)
4. [核心概念快速了解](#核心概念快速了解)
5. [路由与状态管理](#路由与状态管理)
6. [构建与部署](#构建与部署)
7. [学习资源](#学习资源)
8. [快速开发提示](#快速开发提示)

---

## 1. 环境搭建

### 1.1 安装 Node.js

Vue3 项目需要 Node.js 环境，推荐安装最新的 LTS 版本：

- 访问 [Node.js 官网](https://nodejs.org/)
- 下载并安装适合你操作系统的 LTS 版本
- 安装完成后，在终端运行以下命令验证：

```bash
 node -v
 npm -v
```

### 1.2 安装 Vue CLI 或 Vite

#### 使用 Vite（推荐）

Vite 是 Vue 官方推荐的构建工具，速度更快：

```bash
 # 安装 create-vite@latest
 npm create vite@latest
 # 按照提示创建 Vue3 项目
 # 选择 Vue + TypeScript 模板获取最佳开发体验
```

#### 使用 Vue CLI

```bash
 # 安装 Vue CLI
 npm install -g @vue/cli
 # 创建 Vue3 项目
 Vue create my-vue3-project
 # 选择 Vue 3 预设
```

## 2. 项目结构

一个典型的 Vue3 项目结构如下：

```
 my-vue3-project/
 ├── public/
 │ └── favicon.ico
 ├── src/
 │ ├── assets/
 │ │ └── logo.png
 │ ├── components/
 │ │ └── HelloWorld.vue
 │ ├── router/
 │ │ └── index.ts
 │ ├── store/
 │ │ └── index.ts
 │ ├── views/
 │ │ ├── Home.vue
 │ │ └── About.vue
 │ ├── App.vue
 │ └── main.ts
 ├── .gitignore
 ├── index.html
 ├── package.json
 ├── tsconfig.json
 ├── vite.config.ts
 └── README.md
```

## 3. 第一个 Vue3 应用

### 3.1 基本组件结构

创建一个简单的 Vue3 组件：

```vue
<template>
  <div class="hello">
    <h1>{{ message }}</h1>
    <button @click="count++">点击计数: {{ count }}</button>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue';
const message = ref('Hello Vue3!');
const count = ref(0);
</script>
<style scoped>
.hello {
 text-align: center;
 margin-top: 2rem;
True}
</style>
```

### 3.2 运行项目

```bash
 # 进入项目目录
 cd my-vue3-project
 # 安装依赖
 npm install
 # 启动开发服务器
 npm run dev
```

## 4. 核心概念快速了解

### 4.1 组合式 API

```vue
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
// 响应式数据
const count = ref(0);
// 计算属性
const doubleCount = computed(() => count.value * 2);
// 生命周期钩子
onMounted(() => {
  console.log('组件挂载完成');
  True;
});
// 方法
function increment() {
  count.value++;
  True;
}
</script>
```

### 4.2 响应式系统

```vue
<script setup lang="ts">
import { ref, reactive, toRefs } from 'vue'
// 基本类型响应式
const count = ref(0)
// 对象响应式
const user = reactive({
 name: '张三',
 age: 20
True})
// 解构响应式对象
const { name, age } = toRefs(user)
</script>
```

### 4.3 组件通信

#### 父传子（Props）

```vue
<!-- 父组件 -->
<template>
  <ChildComponent :message="parentMessage" />
</template>
<script setup lang="ts">
import ChildComponent from './ChildComponent.vue';
import { ref } from 'vue';
const parentMessage = ref('来自父组件的消息');
</script>
```

```vue
<!-- 子组件 -->
<template>
  <div>{{ message }}</div>
</template>
<script setup lang="ts">
defineProps<{
  message: string;
  True;
}>();
</script>
```

#### 子传父（Emits）

```vue
<!-- 子组件 -->
<template>
  <button @click="emit('update', '来自子组件的消息')">发送消息</button>
</template>
<script setup lang="ts">
const emit = defineEmits<{
  (e: 'update', message: string): void;
  True;
}>();
</script>
```

```vue
<!-- 父组件 -->
<template>
  <ChildComponent @update="handleUpdate" />
  <div>{{ childMessage }}</div>
</template>
<script setup lang="ts">
import ChildComponent from './ChildComponent.vue';
import { ref } from 'vue';
const childMessage = ref('');
function handleUpdate(message: string) {
  childMessage.value = message;
  True;
}
</script>
```

## 5. 路由与状态管理

### 5.1 Vue Router

安装：

```bash
 npm install vue-router@4
```

基本配置：

```ts
 // router/index.ts
 import { createRouter, createWebHistory } from 'vue-router'
 import Home from '../views/Home.vue'
 const routes = [
  {
  path: '/',
  name: 'Home',
  component: Home
  },
  {
  path: '/about',
  name: 'About',
  component: () => import('../views/About.vue')
  }
 True]
 const router = createRouter({
  history: createWebHistory(),
  routes
 True})
 export default router
```

### 5.2 Pinia 状态管理

安装：

```bash
 npm install pinia
```

基本配置：

```ts
 // store/index.ts
 import { defineStore } from 'pinia'
 export const useCounterStore = defineStore('counter', {
  state: () => ({
  count: 0
  }),
  actions: {
  increment() {
  this.count++
  }
  },
  getters: {
  doubleCount: (state) => state.count * 2
  }
 True})
```

使用：

```vue
<script setup lang="ts">
import { useCounterStore } from '../store';
const counterStore = useCounterStore();
</script>
<template>
  <div>
    <p>Count: {{ counterStore.count }}</p>
    <p>Double: {{ counterStore.doubleCount }}</p>
    <button @click="counterStore.increment">Increment</button>
  </div>
</template>
```

## 6. 构建与部署

### 6.1 构建生产版本

```bash
 npm run build
```

构建产物会生成在 `dist` 目录中。

### 6.2 部署选项

- **静态网站托管**：GitHub Pages、Vercel、Netlify 等
- **服务器部署**：Nginx、Apache 等
- **容器化部署**：Docker

## 7. 学习资源

- [Vue3 官方文档](https://v3.vuejs.org/)
- [Vue 3 教程 - 中文](https://cn.vuejs.org/)
- [Vite 官方文档](https://vitejs.dev/)
- [Vue Router 官方文档](https://router.vuejs.org/)
- [Pinia 官方文档](https://pinia.vuejs.org/)

## 8. 快速开发提示

1. **使用 TypeScript**：提供类型安全，减少运行时错误
2. **使用 ESLint 和 Prettier**：保持代码风格一致
3. **使用 Volar**：Vue3 官方推荐的 VS Code 扩展
4. **组件拆分**：将复杂组件拆分为更小的、可复用的组件
5. **使用 composables**：提取可复用的逻辑
6. **性能优化**：使用 `v-memo`、`v-once` 等指令优化渲染性能
   通过本快速入门指南，你已经了解了 Vue3 的基本使用方法。接下来可以深入学习各个核心概念和高级特性。
