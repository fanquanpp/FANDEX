# Vue Router API 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数

---

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
```
```vue
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
