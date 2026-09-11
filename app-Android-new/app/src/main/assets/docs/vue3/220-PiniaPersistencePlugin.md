---
order: 220
title: Pinia 持久化插件
module: 'vue3'
category: 前端技术
difficulty: advanced
description: Pinia持久化插件pinia-plugin-persistedstate配置与使用。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'vue3/160-KeepAliveCacheLifecycle'
  - 'vue3/150-AsyncComponentSuspense'
  - 'vue3/200-VueRouterNavigationGuard'
  - 'vue3/330-VuePerformanceDetailed'
prerequisites: []
---

## 1. 安装与配置

```bash
npm install pinia-plugin-persistedstate
javascript
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
## 持久化需求

**基本写法：手动持久化 store**
`localStorage.setItem('<键>', JSON.stringify(<store>.$state))`
```ts
// 在 mutation 后保存
watch(() => store.$state, (state) => {
  localStorage.setItem('cart', JSON.stringify(state));
}, { deep: true });
```

---

**基本写法：初始化时读取**
`store.$state = JSON.parse(localStorage.getItem('<键>'))`
```ts
// 应用启动恢复状态
const saved = localStorage.getItem('cart');
if (saved) store.$patch(JSON.parse(saved));
```

---

## pinia-plugin-persistedstate

**基本写法：安装持久化插件**
`npm install pinia-plugin-persistedstate`
```bash
# 安装官方推荐插件
npm install pinia-plugin-persistedstate
```

---

**基本写法：注册插件**
`<pinia>.use(<piniaPluginPersistedstate>)`
```ts
// 注册到 Pinia
import { createPinia } from 'pinia';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';
const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);
```

---

## 选项式 Store 持久化

**基本写法：persist 选项开启持久化**
`persist: true`
```ts
// 默认持久化到 localStorage
defineStore('user', {
  state: () => ({ name: '' }),
  persist: true
});
```

---

**基本写法：配置 persist 选项**
`persist: { key, storage, paths }`
```ts
// 自定义键名存储与字段
defineStore('user', {
  state: () => ({ name: '', token: '', temp: '' }),
  persist: {
    key: 'app-user',
    storage: localStorage,
    paths: ['name', 'token'] // 仅持久化部分字段
  }
});
```

---

## 组合式 Store 持久化

**基本写法：setup store 持久化**
`defineStore('<名称>', () => { }, { persist: true })`
```ts
// 第三个参数配置 persist
export const useUser = defineStore('user', () => {
  const name = ref('');
  return { name };
}, { persist: true });
```

---

## storage 配置

**基本写法：使用 sessionStorage**
`persist: { storage: sessionStorage }`
```ts
// 会话级存储关闭后清除
persist: { storage: sessionStorage };
```

---

**基本写法：自定义 storage 实现**
`persist: { storage: { getItem, setItem } }`
```ts
// 兼容自定义存储接口
persist: {
  storage: {
    getItem: (key) => myDB.get(key),
    setItem: (key, value) => myDB.set(key, value)
  }
};
```

---

## paths 选择性持久化

**基本写法：指定持久化的字段路径**
`persist: { paths: ['<字段1>', '<嵌套.字段>'] }`
```ts
// 仅持久化部分嵌套字段
persist: {
  paths: ['user.name', 'user.token', 'preferences.theme']
};
```

---

## 加密持久化

**基本写法：自定义序列化**
`persist: { serializer: { serialize, deserialize } }`
```ts
// 加密存储
import CryptoJS from 'crypto-js';
persist: {
  serializer: {
    serialize: (state) => CryptoJS.AES.encrypt(JSON.stringify(state), 'key').toString(),
    deserialize: (val) => JSON.parse(CryptoJS.AES.decrypt(val, 'key').toString(CryptoJS.enc.Utf8))
  }
};
```

---

## beforeRestore afterRestore 钩子

**基本写法：恢复前钩子**
`persist: { beforeRestore: (<ctx>) => <逻辑> }`
```ts
// 恢复前执行逻辑
persist: {
  beforeRestore: (ctx) => console.log('即将恢复', ctx.store.$id)
};
```

---

**基本写法：恢复后钩子**
`persist: { afterRestore: (<ctx>) => <逻辑> }`
```ts
// 恢复后执行逻辑
persist: {
  afterRestore: (ctx) => ctx.store.validate()
};
```

---

## 自定义 Pinia 插件

**基本写法：编写插件函数**
`function <plugin>(<context>) { <逻辑> }`
```ts
// 插件接收 context
function myPlugin({ store }) {
  store.$onAction(() => console.log('action called'));
}
pinia.use(myPlugin);
```

---

**基本写法：扩展 store 状态**
`<plugin>: ({ store }) => { store.<新字段> = <值> }`
```ts
// 为所有 store 注入字段
pinia.use(({ store }) => {
  store.createdAt = Date.now();
});
```

---

**基本写法：响应式扩展**
`({ store }) => { const <ref> = ref(<值>); }`
```ts
// 注入响应式属性
import { ref } from 'vue';
pinia.use(({ store }) => {
  store.loading = ref(false);
});
```

---

## $subscribe 订阅状态

**基本写法：订阅 state 变化**
`store.$subscribe((<mutation>, <state>) => <逻辑>)`
```ts
// 监听 state 变化
store.$subscribe((mutation, state) => {
  localStorage.setItem('cart', JSON.stringify(state));
});
```

---

**基本写法：附在组件上随组件卸载**
`store.$subscribe(<cb>, { detached: false })`
```ts
// 默认附在组件上 detached true 则全局
store.$subscribe(cb, { detached: true });
```

---

## $onAction 订阅 action

**基本写法：监听 action 调用**
`store.$onAction((<ctx>) => <逻辑>)`
```ts
// 监听所有 action
const unsubscribe = store.$onAction(({ name, args, after, onError }) => {
  console.log('action:', name);
  after((result) => console.log('done', result));
  onError((err) => console.error('err', err));
});
```

---

**基本写法：取消订阅**
`<unsubscribe>()`
```ts
// 卸载时取消
onUnmounted(() => unsubscribe());
```

---

## 重置状态

**基本写法：$reset 重置为初始状态**
`store.$reset()`
```ts
// 仅选项式 store 支持
store.$reset();
```

---

**基本写法：setup store 手动重置**
`function <reset>() { <字段>.value = <初值>; }`
```ts
// setup store 需自己实现
export const useUser = defineStore('user', () => {
  const name = ref('');
  const reset = () => { name.value = ''; };
  return { name, reset };
});
```

---

## SSR 持久化

**基本写法：服务端跳过 localStorage**
`if (typeof window !== 'undefined') <持久化>`
```ts
// 仅客户端持久化
persist: {
  storage: typeof window !== 'undefined' ? localStorage : undefined
};
```

---

## 多 store 协同持久化

**基本写法：跨 store 持久化**
`persist: { paths: ['<字段>'] }`
```ts
// 分别配置不同 store
const useAuth = defineStore('auth', {
  state: () => ({ token: '' }),
  persist: { paths: ['token'] }
});
const useCart = defineStore('cart', {
  state: () => ({ items: [] }),
  persist: { storage: sessionStorage }
});
```

---

## 版本迁移

**基本写法：版本号控制**
`persist: { key: '<键>_v<版本>' }`
```ts
// 通过 key 版本号失效旧数据
persist: { key: 'user_v2' };
```

---

**基本写法：迁移函数**
`beforeRestore: (<ctx>) => { <迁移逻辑> }`
```ts
// 恢复时迁移旧数据
persist: {
  beforeRestore: ({ store }) => {
    const old = JSON.parse(localStorage.getItem('user_v1'));
    if (old) store.$patch(migrate(old));
  }
};
```

---

## 持久化调试

**基本写法：查看持久化数据**
`localStorage.getItem('<键>')`
```ts
// 浏览器控制台查看
console.log(localStorage.getItem('user'));
```

---

**基本写法：清空持久化**
`localStorage.removeItem('<键>')`
```ts
// 退出登录清空
function logout() {
  localStorage.removeItem('user');
  store.$reset();
}
```

---

## 插件组合

**基本写法：组合多个插件**
`pinia.use(<plugin1>); pinia.use(<plugin2>)`
```ts
// 多个插件按顺序生效
pinia.use(persistPlugin);
pinia.use(logPlugin);
pinia.use(debouncePlugin);
```

---

## $patch 批量更新

**基本写法：批量更新触发持久化**
`store.$patch({ <字段1>: <值1>, <字段2>: <值2> })`
```ts
// 一次更新多个字段
store.$patch({ name: 'Alice', age: 20 });
```

---

**基本写法：函数式 patch**
`store.$patch((<state>) => { <state>.<列表>.push(<项>) })`
```ts
// 复杂修改用函数
store.$patch(state => {
  state.items.push(newItem);
});
```
