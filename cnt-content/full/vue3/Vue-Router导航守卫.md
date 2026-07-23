---
order: 107
title: 'Vue-Router导航守卫'
module: vue3
category: 'dev-lang'
difficulty: advanced
description: 'Vue Router导航守卫详解：全局守卫、路由独享守卫、组件内守卫。'
author: fanquanpp
updated: '2026-06-14'
related:
  - vue3/异步组件与Suspense
  - vue3/Pinia持久化插件
  - vue3/Vue性能优化详解
  - vue3/性能优化
prerequisites:
  - vue3/语法速查
---

## 1. 全局守卫

### 1.1 beforeEach

```javascript
router.beforeEach((to, from) => {
  const auth = useAuthStore();
  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }
});
```

### 1.2 afterEach

```javascript
router.afterEach((to, from, failure) => {
  if (!failure) {
    document.title = to.meta.title || 'App';
  }
});
```

## 2. 路由独享守卫

```javascript
const routes = [
  {
    path: '/admin',
    component: Admin,
    beforeEnter: (to, from) => {
      if (!isAdmin()) return '/login';
    },
  },
];
```

## 3. 组件内守卫

```javascript
export default {
  beforeRouteEnter(to, from, next) {
    // 无法访问 this
    next((vm) => {
      // 通过 vm 访问组件实例
    });
  },
  beforeRouteUpdate(to, from) {
    // 路由参数变化时（如 /user/1 → /user/2）
  },
  beforeRouteLeave(to, from) {
    // 离开前确认
    if (hasUnsavedChanges) {
      return window.confirm('确认离开？');
    }
  },
};
```

## 4. 守卫执行顺序

```
1. beforeRouteLeave（离开组件）
2. beforeEach（全局）
3. beforeRouteUpdate（复用组件）
4. beforeEnter（路由配置）
5. beforeRouteEnter（进入组件）
6. afterEach（全局）
```

## 5. 返回值

| 返回值               | 效果     |
| -------------------- | -------- |
| `true` / `undefined` | 允许导航 |
| `false`              | 取消导航 |
| 路由对象             | 重定向   |
