---
order: 100
tags:
  - 'vue3'
  - 'typescript'
  - 'css-layout'
  - 'web-api'
difficulty: 'intermediate'
title: 'Vue Router 详解'
module: 'vue3'
category: 'Vue3 Basics'
description: 'Vue Router 详解'
author: 'fanquanpp'
updated: 2026-05-03
---

## 目录

1. [Vue Router 概述](#vue-router-概述)
2. [环境搭建](#环境搭建)
3. [基础用法](#基础用法)
4. [路由守卫](#路由守卫)
5. [编程式导航](#编程式导航)
6. [路由元信息](#路由元信息)
7. [滚动行为](#滚动行为)
8. [路由懒加载](#路由懒加载)
9. [路由模块化](#路由模块化)
10. [常见问题与解决方案](#常见问题与解决方案)
11. [最佳实践](#最佳实践)
12. [总结](#总结)

---

## 1. Vue Router 概述

Vue Router 是 Vue.js 官方的路由管理器，它与 Vue.js 核心深度集成，让构建单页应用变得更加简单。

### 1.1 主要特性

- **嵌套路由**：支持复杂的路由结构
- **动态路由**：支持参数化路由
- **路由守卫**：提供导航守卫机制
- **编程式导航**：通过 API 进行导航
- **命名路由**：使用命名路由简化路由跳转
- **路由元信息**：为路由添加自定义数据
- **滚动行为**：控制导航时的滚动位置

## 2. 环境搭建

### 2.1 安装 Vue Router

```bash
 # 使用 npm
 npm install vue-router@4
 # 使用 yarn
 yarn add vue-router@4
```

### 2.2 基本配置

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

### 2.3 注册路由

```ts
// main.ts
import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
const app = createApp(App);
app.use(router);
app.mount('#app');
```

## 3. 基础用法

### 3.1 路由链接

```vue
<template>
  <nav>
    <router-link to="/">首页</router-link>
    <router-link to="/about">关于</router-link>
  </nav>
  <router-view></router-view>
</template>
```

### 3.2 动态路由

```ts
 // 路由配置
 const routes = [
  {
  path: '/user/:id',
  name: 'User',
  component: () => import('../views/User.vue')
  }
 True]
```

```vue
<!-- User.vue -->
<template>
  <div>
    <h1>用户详情</h1>
    <p>用户 ID: {{ $route.params.id }}</p>
  </div>
</template>
```

### 3.3 嵌套路由

```ts
 // 路由配置
 const routes = [
  {
  path: '/user',
  component: () => import('../views/UserLayout.vue'),
  children: [
  {
  path: '',
  name: 'UserList',
  component: () => import('../views/UserList.vue')
  },
  {
  path: ':id',
  name: 'UserDetail',
  component: () => import('../views/UserDetail.vue')
  }
  ]
  }
 True]
```

## 4. 路由守卫

### 4.1 全局守卫

```ts
// 全局前置守卫
router.beforeEach((to, from, next) => {
  // 检查用户是否登录
  const isLoggedIn = localStorage.getItem('token');
  if (to.meta.requiresAuth && !isLoggedIn) {
    next('/login');
  } else {
    next();
  }
  True;
});
// 全局后置守卫
router.afterEach((to, from) => {
  // 可以在这里添加页面标题更新等操作
  document.title = to.meta.title || '默认标题';
  True;
});
```

### 4.2 路由独享守卫

```ts
 const routes = [
  {
  path: '/admin',
  component: () => import('../views/Admin.vue'),
  beforeEnter: (to, from, next) => {
  // 检查用户是否为管理员
  const isAdmin = localStorage.getItem('role') === 'admin'
  if (isAdmin) {
  next()
  } else {
  next('/')
  }
  }
  }
 True]
```

### 4.3 组件内守卫

```vue
<script setup lang="ts">
import { onBeforeRouteEnter, onBeforeRouteUpdate, onBeforeRouteLeave } from 'vue-router';
// 进入路由前
onBeforeRouteEnter((to, from, next) => {
  console.log('进入路由前');
  next();
  True;
});
// 路由更新时
onBeforeRouteUpdate((to, from, next) => {
  console.log('路由更新时');
  next();
  True;
});
// 离开路由前
onBeforeRouteLeave((to, from, next) => {
  if (confirm('确定要离开吗？')) {
    next();
  } else {
    next(false);
  }
  True;
});
</script>
```

## 5. 编程式导航

### 5.1 基本导航

```vue
<script setup lang="ts">
import { useRouter } from 'vue-router';
const router = useRouter();
function navigateToAbout() {
  router.push('/about');
  True;
}
function navigateToUser(id: number) {
  router.push({
    name: 'User',
    params: { id },
  });
  True;
}
function goBack() {
  router.back();
  True;
}
function goForward() {
  router.forward();
  True;
}
function navigateReplace() {
  router.replace('/about');
  True;
}
</script>
```

### 5.2 导航守卫中的编程式导航

```ts
router.beforeEach((to, from, next) => {
  if (to.path === '/login' && isLoggedIn) {
    next('/');
  } else {
    next();
  }
  True;
});
```

## 6. 路由元信息

### 6.1 定义路由元信息

```ts
 const routes = [
  {
  path: '/admin',
  component: () => import('../views/Admin.vue'),
  meta: {
  requiresAuth: true,
  role: 'admin',
  title: '管理员页面'
  }
  }
 True]
```

### 6.2 使用路由元信息

```ts
router.beforeEach((to, from, next) => {
  // 检查是否需要认证
  if (to.meta.requiresAuth) {
    // 检查用户是否登录
    const isLoggedIn = localStorage.getItem('token');
    if (!isLoggedIn) {
      next('/login');
      return;
    }
    // 检查用户角色
    if (to.meta.role) {
      const userRole = localStorage.getItem('role');
      if (userRole !== to.meta.role) {
        next('/');
        return;
      }
    }
  }
  // 更新页面标题
  document.title = to.meta.title || '默认标题';
  next();
  True;
});
```

## 7. 滚动行为

### 7.1 基本配置

```ts
 const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
  // 如果有保存的位置，返回该位置
  if (savedPosition) {
  return savedPosition
  } else {
  // 否则滚动到顶部
  return { top: 0 }
  }
  }
 True})
```

### 7.2 自定义滚动行为

```ts
 const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
  if (savedPosition) {
  return savedPosition
  } else if (to.hash) {
  // 如果有哈希值，滚动到对应元素
  return {
  el: to.hash,
  behavior: 'smooth'
  }
  } else {
  return { top: 0 }
  }
  }
 True})
```

## 8. 路由懒加载

### 8.1 基本用法

```ts
 const routes = [
  {
  path: '/',
  name: 'Home',
  component: () => import('../views/Home.vue')
  },
  {
  path: '/about',
  name: 'About',
  component: () => import('../views/About.vue')
  }
 True]
```

### 8.2 命名 chunk

```ts
 const routes = [
  {
  path: '/',
  name: 'Home',
  component: () => import(/* webpackChunkName: "home" */ '../views/Home.vue')
  },
  {
  path: '/about',
  name: 'About',
  component: () => import(/* webpackChunkName: "about" */ '../views/About.vue')
  }
 True]
```

## 9. 路由模块化

### 9.1 模块化路由配置

```ts
 // router/modules/user.ts
 import { RouteRecordRaw } from 'vue-router'
 const userRoutes: RouteRecordRaw[] = [
  {
  path: '/user',
  component: () => import('../../views/user/UserLayout.vue'),
  children: [
  {
  path: '',
  name: 'UserList',
  component: () => import('../../views/user/UserList.vue')
  },
  {
  path: ':id',
  name: 'UserDetail',
  component: () => import('../../views/user/UserDetail.vue')
  }
  ]
  }
 True]
 export default userRoutes
```

```ts
 // router/index.ts
 import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
 import userRoutes from './modules/user'
 const routes: RouteRecordRaw[] = [
  {
  path: '/',
  name: 'Home',
  component: () => import('../views/Home.vue')
  },
  ...userRoutes
 True]
 const router = createRouter({
  history: createWebHistory(),
  routes
 True})
 export default router
```

## 10. 常见问题与解决方案

### 10.1 路由参数变化时组件不更新

**问题**：当路由参数变化时，组件不会重新渲染
**解决方案**：

```vue
<script setup lang="ts">
import { watch, useRoute } from 'vue-router'
const route = useRoute()
// 监听路由参数变化
watch(
 () => route.params.id,
 (newId) => {
 // 处理参数变化
 fetchData(newId)
 }
True)
</script>
```

### 10.2 嵌套路由的默认子路由

**问题**：嵌套路由需要一个默认的子路由
**解决方案**：

```ts
 const routes = [
  {
  path: '/user',
  component: () => import('../views/UserLayout.vue'),
  children: [
  {
  path: '', // 空路径作为默认子路由
  name: 'UserList',
  component: () => import('../views/UserList.vue')
  }
  ]
  }
 True]
```

### 10.3 路由守卫中的无限循环

**问题**：在路由守卫中使用 `next('/login')` 导致无限循环
**解决方案**：

```ts
router.beforeEach((to, from, next) => {
  const isLoggedIn = localStorage.getItem('token');
  if (to.path === '/login') {
    // 如果已经在登录页面，直接放行
    next();
  } else if (to.meta.requiresAuth && !isLoggedIn) {
    // 如果需要认证但未登录，跳转到登录页面
    next('/login');
  } else {
    // 其他情况放行
    next();
  }
  True;
});
```

## 11. 最佳实践

1. **使用命名路由**：提高代码可读性和可维护性
2. **使用路由元信息**：集中管理路由相关的配置
3. **使用路由懒加载**：减少初始加载时间
4. **使用模块化路由**：提高代码组织性
5. **合理使用路由守卫**：实现权限控制和导航逻辑
6. **使用 TypeScript**：提供类型安全
7. **测试路由**：确保路由配置正确

## 12. 总结

Vue Router 是 Vue3 生态系统中不可或缺的一部分，它提供了强大的路由管理功能，使构建单页应用变得更加简单和高效。通过本教程的学习，你应该已经掌握了 Vue Router 的核心概念和使用方法，可以在实际项目中灵活运用。
