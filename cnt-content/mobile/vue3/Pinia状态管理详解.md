# Pinia API 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数

---

## 创建 Pinia

**createPinia 创建实例**
```typescript
import { createApp } from 'vue';
import { createPinia } from 'pinia';

const app = createApp(App);
app.use(createPinia());
app.mount('#app');
```

**pinia 插件**
```typescript
const pinia = createPinia();

pinia.use(({ store }) => {
  store.$subscribe((mutation, state) => {
    localStorage.setItem(store.$id, JSON.stringify(state));
  });
});

app.use(pinia);
```

---

## defineStore 定义 store

**Options 选项式**
`const <useStore> = defineStore(<id>, <options>);`
```typescript
import { defineStore } from 'pinia';

export const useCounterStore = defineStore('counter', {
  state: () => ({
    count: 0,
    name: 'Tom'
  }),
  getters: {
    double: (state) => state.count * 2,
    doublePlusOne(): number {
      return this.double + 1;
    }
  },
  actions: {
    increment() {
      this.count++;
    },
    async fetchCount() {
      const res = await fetch('/api/count');
      this.count = await res.json();
    }
  }
});
```

**Setup 组合式**
`const <useStore> = defineStore(<id>, <setup>);`
```typescript
import { defineStore, ref, computed } from 'pinia';

export const useCounterStore = defineStore('counter', () => {
  const count = ref(0);
  const name = ref('Tom');

  const double = computed(() => count.value * 2);
  const doublePlusOne = computed(() => double.value + 1);

  function increment() {
    count.value++;
  }

  async function fetchCount() {
    const res = await fetch('/api/count');
    count.value = await res.json();
  }

  return { count, name, double, doublePlusOne, increment, fetchCount };
});
```

**TS 类型推断**
```typescript
import { defineStore } from 'pinia';

export const useUserStore = defineStore('user', {
  state: () => ({
    user: null as { id: number; name: string } | null,
    token: '' as string
  }),
  getters: {
    isLoggedIn: (state) => !!state.user,
    userName(): string {
      return this.user?.name ?? '';
    }
  },
  actions: {
    setUser(user: { id: number; name: string }) {
      this.user = user;
    }
  }
});
```

---

## 使用 store

**获取 store**
`const <store> = useXxxStore();`
```typescript
import { useCounterStore } from '@/stores/counter';

const counterStore = useCounterStore();

// state
console.log(counterStore.count);
counterStore.count++;           // 直接修改(可行)

// getters
console.log(counterStore.double);

// actions
counterStore.increment();
await counterStore.fetchCount();
```

**store 解构(响应性丢失)**
```typescript
const store = useCounterStore();
const { count } = store;  // 响应性丢失
```

**storeToRefs 解构响应式**
`const { <key>, ... } = storeToRefs(<store>);`
```typescript
import { storeToRefs } from 'pinia';

const store = useCounterStore();
const { count, name, double } = storeToRefs(store);  // 保持响应性

// actions 可以直接解构(函数无需响应性)
const { increment } = store;
```

---

## State 操作

**直接修改**
```typescript
const store = useCounterStore();
store.count++;
store.user = { id: 1, name: 'Tom' };
```

**$patch 批量修改**
`store.$patch(<partial | function>);`
```typescript
store.$patch({ count: 100, name: 'New' });

store.$patch((state) => {
  state.count = 100;
  state.list.push('new item');
  state.user.name = 'Tom';
});
```

**$reset 重置状态**
```typescript
store.$reset();
```

**$subscribe 订阅 state**
`store.$subscribe((mutation, state) => {}, [options]);`
```typescript
const unsubscribe = store.$subscribe((mutation, state) => {
  console.log('mutation.type:', mutation.type);  // 'direct' | 'patch object' | 'patch function'
  console.log('mutation.storeId:', mutation.storeId);
  console.log('state:', state);
}, { detached: true });

// 取消订阅
unsubscribe();
```

---

## Getters

**基础 getter**
```typescript
getters: {
  double: (state) => state.count * 2,
  quadruple: (state) => state.count * 4
}
```

**getter 互相调用**
```typescript
getters: {
  double: (state) => state.count * 2,
  quadruple(): number {
    return this.double * 2;
  }
}
```

**getter 接收参数**
```typescript
getters: {
  getUserById: (state) => (id: number) => {
    return state.users.find(u => u.id === id);
  }
}

// 使用
const user = store.getUserById(1);
```

**跨 store 调用**
```typescript
import { useUserStore } from './user';

export const useCartStore = defineStore('cart', {
  getters: {
    userNameWithItems(): string {
      const userStore = useUserStore();
      return `${userStore.name} (${this.items.length})`;
    }
  }
});
```

---

## Actions

**同步 action**
```typescript
actions: {
  increment() {
    this.count++;
  },
  reset() {
    this.count = 0;
    this.user = null;
  }
}
```

**异步 action**
```typescript
actions: {
  async fetchUser(id: number) {
    try {
      const res = await fetch(`/api/users/${id}`);
      this.user = await res.json();
    } catch (e) {
      console.error(e);
    }
  }
}
```

**action 调用其他 action**
```typescript
actions: {
  async login(credentials) {
    const user = await api.login(credentials);
    this.setUser(user);
    this.loadProfile();
  },
  setUser(user) {
    this.user = user;
  },
  async loadProfile() {
    this.profile = await api.getProfile(this.user.id);
  }
}
```

**$onAction 订阅 action**
`store.$onAction(<callback>, [detached]);`
```typescript
const unsubscribe = store.$onAction({
  name: 'fetchUser',
  after: (result) => console.log('action done', result),
  onError: (error) => console.error('action error', error)
});

// 或函数式
const unsubscribe = store.$onAction((context) => {
  console.log('action:', context.name, context.args);
  context.after((result) => console.log('done'));
  context.onError((error) => console.error(error));
});

unsubscribe();
```

---

## 多 store 组合

**store 互相调用**
```typescript
// stores/user.ts
export const useUserStore = defineStore('user', () => {
  const user = ref(null);
  return { user };
});

// stores/cart.ts
import { useUserStore } from './user';
export const useCartStore = defineStore('cart', () => {
  const userStore = useUserStore();
  const items = ref([]);

  const canCheckout = computed(() =>
    !!userStore.user && items.value.length > 0
  );

  return { items, canCheckout };
});
```

---

## 持久化

**手动持久化**
```typescript
import { useUserStore } from './user';

const store = useUserStore();

store.$subscribe((mutation, state) => {
  localStorage.setItem('user', JSON.stringify(state));
});

// 初始化时恢复
const saved = localStorage.getItem('user');
if (saved) {
  store.$patch(JSON.parse(saved));
}
```

**插件方式**
```typescript
// main.ts
const pinia = createPinia();

pinia.use(({ store }) => {
  // 恢复
  const saved = localStorage.getItem(store.$id);
  if (saved) {
    store.$patch(JSON.parse(saved));
  }

  // 订阅变化
  store.$subscribe((mutation, state) => {
    localStorage.setItem(store.$id, JSON.stringify(state));
  });
});

app.use(pinia);
```

---

## 组件中使用

```vue
<script setup lang="ts">
import { useCounterStore } from '@/stores/counter';
import { storeToRefs } from 'pinia';

const store = useCounterStore();
const { count, double } = storeToRefs(store);
const { increment } = store;

function handleReset() {
  store.$reset();
}

function handleBatchUpdate() {
  store.$patch({ count: 100 });
}
</script>

<template>
  <div>
    <p>count: {{ count }}</p>
    <p>double: {{ double }}</p>
    <button @click="increment">+1</button>
    <button @click="handleReset">重置</button>
  </div>
</template>
```
