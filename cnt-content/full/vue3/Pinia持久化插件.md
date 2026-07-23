---
order: 106
title: Pinia持久化插件
module: vue3
category: 'dev-lang'
difficulty: advanced
description: 'Pinia持久化插件pinia-plugin-persistedstate配置与使用。'
author: fanquanpp
updated: '2026-06-14'
related:
  - vue3/KeepAlive缓存与生命周期
  - vue3/异步组件与Suspense
  - 'vue3/Vue-Router导航守卫'
  - vue3/Vue性能优化详解
prerequisites:
  - vue3/语法速查
---

## 1. 安装与配置

```bash
npm install pinia-plugin-persistedstate
```

```javascript
import { createPinia } from 'pinia';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';

const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);
```

## 2. 基本用法

```javascript
export const useUserStore = defineStore('user', {
  state: () => ({
    name: '',
    token: '',
  }),
  persist: true, // 启用持久化
});
```

## 3. 高级配置

```javascript
export const useUserStore = defineStore('user', {
  state: () => ({
    name: '',
    token: '',
    preferences: { theme: 'light' },
  }),
  persist: {
    key: 'my-user-store', // 存储键名
    storage: sessionStorage, // 存储方式
    pick: ['token', 'preferences'], // 只持久化部分字段
    omit: ['name'], // 排除部分字段
    beforeHydrate: (ctx) => {
      // 恢复前处理
      console.log('about to hydrate', ctx);
    },
    afterHydrate: (ctx) => {
      // 恢复后处理
      console.log('hydrated', ctx);
    },
  },
});
```

## 4. 自定义存储

```javascript
persist: {
  storage: {
    getItem: (key) => {
      return cookies.get(key);
    },
    setItem: (key, value) => {
      cookies.set(key, value, { expires: 7 });
    },
    removeItem: (key) => {
      cookies.remove(key);
    }
  }
}
```

## 5. Setup Store 语法

```javascript
export const useUserStore = defineStore(
  'user',
  () => {
    const token = ref('');
    const name = ref('');

    return { token, name };
  },
  {
    persist: {
      pick: ['token'],
    },
  }
);
```
