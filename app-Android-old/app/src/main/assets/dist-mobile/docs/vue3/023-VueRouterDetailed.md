## 前置知识

- [computed 缓存机制与 watch 执行时机](/vue3/022-ComputedCacheWatchTiming)：建议先完成前一篇的学习

## 学习目标

- 掌握「1. Vue Router 概述」的核心机制、典型用法与常见陷阱
- 掌握「2. 环境搭建」的核心机制、典型用法与常见陷阱
- 掌握「3. 基础用法」的核心机制、典型用法与常见陷阱
- 掌握「4. 路由守卫」的核心机制、典型用法与常见陷阱
- 掌握「5. 编程式导航」的核心机制、典型用法与常见陷阱


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
 npm install vue-router
 # 使用 yarn
 yarn add vue-router
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
 ]
 const router = createRouter({
  history: createWebHistory(),
  routes
 }
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
    component: () => import('../views/User.vue'),
  },
];
vue
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
        component: () => import('../views/UserList.vue'),
      },
      {
        path: ':id',
        name: 'UserDetail',
        component: () => import('../views/UserDetail.vue'),
      },
    ],
  },
];
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
});
// 全局后置守卫
router.afterEach((to, from) => {
  // 可以在这里添加页面标题更新等操作
  document.title = to.meta.title || '默认标题';
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
      const isAdmin = localStorage.getItem('role') === 'admin';
      if (isAdmin) {
        next();
      } else {
        next('/');
      }
    },
  },
];
```

### 4.3 组件内守卫

```vue
<script setup lang="ts">
import { onBeforeRouteEnter, onBeforeRouteUpdate, onBeforeRouteLeave } from 'vue-router';
// 进入路由前
onBeforeRouteEnter((to, from, next) => {
  console.log('进入路由前');
  next();
});
// 路由更新时
onBeforeRouteUpdate((to, from, next) => {
  console.log('路由更新时');
  next();
});
// 离开路由前
onBeforeRouteLeave((to, from, next) => {
  if (confirm('确定要离开吗？')) {
    next();
  } else {
    next(false);
  }
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
}
function navigateToUser(id: number) {
  router.push({
    name: 'User',
    params: { id },
  });
}
function goBack() {
  router.back();
}
function goForward() {
  router.forward();
}
function navigateReplace() {
  router.replace('/about');
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
      title: '管理员页面',
    },
  },
];
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
 }
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
 }
```

## 8. 路由懒加载

### 8.1 基本用法

```ts
const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/Home.vue'),
  },
  {
    path: '/about',
    name: 'About',
    component: () => import('../views/About.vue'),
  },
];
```

### 8.2 命名 chunk

```ts
const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import(/* webpackChunkName: "home" */ '../views/Home.vue'),
  },
  {
    path: '/about',
    name: 'About',
    component: () => import(/* webpackChunkName: "about" */ '../views/About.vue'),
  },
];
```

## 9. 路由模块化

### 9.1 模块化路由配置

```ts
// router/modules/user.ts
import { RouteRecordRaw } from 'vue-router';
const userRoutes: RouteRecordRaw[] = [
  {
    path: '/user',
    component: () => import('../../views/user/UserLayout.vue'),
    children: [
      {
        path: '',
        name: 'UserList',
        component: () => import('../../views/user/UserList.vue'),
      },
      {
        path: ':id',
        name: 'UserDetail',
        component: () => import('../../views/user/UserDetail.vue'),
      },
    ],
  },
];
export default userRoutes;
ts
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
 ]
 const router = createRouter({
  history: createWebHistory(),
  routes
 }
 export default router
```

## 10. 常见问题与解决方案

### 10.1 路由参数变化时组件不更新

**问题**：当路由参数变化时，组件不会重新渲染
**解决方案**：

```vue
<script setup lang="ts">
import { watch, useRoute } from 'vue-router';
const route = useRoute();
// 监听路由参数变化
watch(
  () => route.params.id,
  (newId) => {
    // 处理参数变化
    fetchData(newId);
  }
);
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
        component: () => import('../views/UserList.vue'),
      },
    ],
  },
];
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
## 路由创建

**createRouter 创建路由**
`const <router> = createRouter(<options>);`
```typescript
import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: () => import('@/views/Home.vue') },
    { path: '/about', name: 'about', component: () => import('@/views/About.vue') }
  ]
});

export default router;
```

**history 模式选择**
```typescript
import {
  createRouter,
  createWebHistory,        // HTML5 模式
  createWebHashHistory,    // hash 模式
  createMemoryHistory      // 内存模式(SSR/测试)
} from 'vue-router';

const router = createRouter({
  history: createWebHistory(),          // /path
  history: createWebHashHistory(),      // /#/path
  history: createMemoryHistory(),
  routes: []
});
```

---

## 路由配置

**静态路由**
```typescript
import Home from '@/views/Home.vue';

const routes = [
  { path: '/', component: Home },
  { path: '/about', component: () => import('@/views/About.vue') }
];
```

**命名路由**
```typescript
const routes = [
  { path: '/users/:id', name: 'user', component: UserDetail }
];

// 使用 name 跳转
router.push({ name: 'user', params: { id: 1 } });
```

**动态路由参数**
```typescript
const routes = [
  { path: '/users/:id', component: UserDetail },
  { path: '/users/:id/posts/:postId', component: UserPost }
];

// 获取参数
const route = useRoute();
console.log(route.params.id, route.params.postId);
```

**可选参数与正则**
```typescript
const routes = [
  { path: '/users/:id?', component: UserList },          // 可选
  { path: '/users/:id(\\d+)', component: UserDetail },   // 仅数字
  { path: '/:pathMatch(.*)*', name: 'NotFound', component: NotFound }  // 404
];
```

**嵌套路由**
```typescript
const routes = [
  {
    path: '/user',
    component: UserLayout,
    children: [
      { path: '', component: UserHome },
      { path: 'profile', component: UserProfile },
      { path: 'posts', component: UserPosts }
    ]
  }
];
```

**命名视图**
```typescript
const routes = [
  {
    path: '/layout',
    components: {
      default: Home,
      sidebar: Sidebar,
      header: Header
    }
  }
];
vue
<template>
  <router-view />
  <router-view name="sidebar" />
  <router-view name="header" />
</template>
```

**重定向与别名**
```typescript
const routes = [
  { path: '/home', redirect: '/' },
  { path: '/users', redirect: { name: 'userList' } },
  { path: '/list', redirect: to => ({ path: '/users' }) },
  { path: '/about', alias: '/info', component: About }
];
```

---

## Router 实例 API

**router.push 编程式跳转**
`router.push(<location>);`
```typescript
import { useRouter } from 'vue-router';
const router = useRouter();

router.push('/path');
router.push({ path: '/path' });
router.push({ name: 'user', params: { id: 1 } });
router.push({ path: '/search', query: { q: 'vue' } });
router.push({ path: 'register', hash: '#form' });
router.push({ name: 'user', params: { id: 1 }, query: { tab: 'profile' } });
```

**router.replace 替换历史**
`router.replace(<location>);`
```typescript
router.replace('/login');
router.replace({ name: 'home' });
```

**router.go / forward / back**
```typescript
router.go(1);           // 前进
router.go(-1);          // 后退
router.go(-2);          // 后退两步
router.forward();       // 前进
router.back();          // 后退
```

**router.beforeEach 全局前置守卫**
`router.beforeEach((to, from, next) => {});`
```typescript
router.beforeEach((to, from) => {
  if (to.meta.requiresAuth && !isAuthenticated()) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }
  // 返回 false 取消导航
  // 返回路径或路由对象重定向
  // 不返回或返回 true 继续
});
```

**router.afterEach 全局后置钩子**
`router.afterEach((to, from) => {});`
```typescript
router.afterEach((to, from) => {
  document.title = to.meta.title || 'App';
});
```

**router.beforeResolve 解析守卫**
```typescript
router.beforeResolve(async (to) => {
  await someAsyncCheck();
});
```

**router.addRoute 动态添加路由**
`router.addRoute([parentName], <route>);`
```typescript
router.addRoute({ path: '/new', component: NewPage });
router.addRoute('parent', { path: 'child', component: ChildPage });
router.removeRoute('routeName');
router.hasRoute('routeName');
router.getRoutes();
```

---

## 组件内 API

**useRouter 获取 router 实例**
`const <router> = useRouter();`
```typescript
import { useRouter } from 'vue-router';
const router = useRouter();

function goHome() {
  router.push('/');
}
```

**useRoute 获取当前路由**
`const <route> = useRoute();`
```typescript
import { useRoute } from 'vue-router';
const route = useRoute();

console.log(route.path);        // /users/1
console.log(route.name);        // 'user'
console.log(route.params);      // { id: '1' }
console.log(route.query);       // { tab: 'profile' }
console.log(route.hash);        // '#section'
console.log(route.fullPath);    // /users/1?tab=profile#section
console.log(route.meta);        // { requiresAuth: true }
console.log(route.matched);     // 匹配的路由记录数组
```

**router-link 组件**
```vue
<template>
  <router-link to="/home">Home</router-link>
  <router-link :to="{ name: 'user', params: { id: 1 } }">用户</router-link>
  <router-link to="/about" replace>About</router-link>
  <router-link to="/list" custom v-slot="{ navigate }">
    <button @click="navigate">列表</button>
  </router-link>
  <router-link to="/page" v-slot="{ href, route, navigate, isActive, isExactActive }">
    <a :href="href" @click="navigate">{{ route.fullPath }}</a>
  </router-link>
</template>
```

**router-view 组件**
```vue
<template>
  <router-view />
  <router-view name="sidebar" />
  <router-view v-slot="{ Component }">
    <transition name="fade" mode="out-in">
      <component :is="Component" />
    </transition>
  </router-view>

  <router-view v-slot="{ Component, route }">
    <keep-alive>
      <component :is="Component" :key="route.path" />
    </keep-alive>
  </router-view>
</template>
```

---

## 路由元信息

**meta 定义**
```typescript
const routes = [
  {
    path: '/admin',
    component: Admin,
    meta: {
      requiresAuth: true,
      title: '管理后台',
      roles: ['admin']
    }
  }
];
```

**meta 访问**
```typescript
import { useRoute } from 'vue-router';
const route = useRoute();

if (route.meta.requiresAuth) {
  // 鉴权
}

// 守卫中
router.beforeEach((to) => {
  if (to.meta.requiresAuth && !isLoggedIn()) {
    return '/login';
  }
});
```

---

## 组件内守卫

**onBeforeRouteUpdate 路由更新前**
```typescript
import { onBeforeRouteUpdate } from 'vue-router';

onBeforeRouteUpdate((to, from) => {
  if (to.params.id !== from.params.id) {
    loadData(to.params.id);
  }
});
```

**onBeforeRouteLeave 离开前**
```typescript
import { onBeforeRouteLeave } from 'vue-router';

onBeforeRouteLeave((to, from) => {
  const answer = window.confirm('确定离开?未保存的数据将丢失');
  if (!answer) return false;
});
```

---

## 路由独享守卫

**beforeEnter 路由独享**
```typescript
const routes = [
  {
    path: '/admin',
    component: Admin,
    beforeEnter: (to, from) => {
      if (!isAdmin()) return '/login';
    }
  },
  {
    path: '/users',
    component: Users,
    beforeEnter: [authGuard, logGuard]  // 多个守卫
  }
];
```

---

## 滚动行为

**scrollBehavior 控制滚动**
```typescript
const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;  // 后退/前进时恢复
    }
    if (to.hash) {
      return { el: to.hash, behavior: 'smooth' };
    }
    return { top: 0 };
  }
});
```

---

## 完整示例

**路由配置 + 守卫**
```typescript
import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  { path: '/', name: 'home', component: () => import('@/views/Home.vue') },
  { path: '/login', name: 'login', component: () => import('@/views/Login.vue') },
  {
    path: '/admin',
    name: 'admin',
    component: () => import('@/views/Admin.vue'),
    meta: { requiresAuth: true, roles: ['admin'] },
    children: [
      { path: '', name: 'admin-home', component: () => import('@/views/admin/Home.vue') },
      { path: 'users', name: 'admin-users', component: () => import('@/views/admin/Users.vue') }
    ]
  },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('@/views/NotFound.vue') }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    return savedPosition || { top: 0 };
  }
});

router.beforeEach(async (to, from) => {
  if (to.meta.requiresAuth && !isAuthenticated()) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }
});

router.afterEach((to) => {
  document.title = (to.meta.title as string) || 'FANDEX';
});

export default router;
```
