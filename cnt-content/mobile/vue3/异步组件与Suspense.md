# 异步组件 API 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数

---

## defineAsyncComponent 基础

**简单异步组件**
`const <comp> = defineAsyncComponent(<loader>);`
```typescript
import { defineAsyncComponent } from 'vue';

const AsyncComp = defineAsyncComponent(() =>
  import('./AsyncComp.vue')
);
```

**完整选项异步组件**
`const <comp> = defineAsyncComponent(<options>);`
```typescript
import { defineAsyncComponent } from 'vue';

const AsyncComp = defineAsyncComponent({
  loader: () => import('./AsyncComp.vue'),
  loadingComponent: LoadingSpinner,
  errorComponent: ErrorDisplay,
  delay: 200,           // 显示 loading 前延迟 ms
  timeout: 3000,        // 超时 ms 后显示 error
  suspensible: true,    // 配合 Suspense
  onError(err, retry, fail, attempts) {
    if (attempts <= 3) {
      retry();
    } else {
      fail();
    }
  }
});
```

**loader 返回 Promise**
```typescript
const AsyncComp = defineAsyncComponent(() =>
  fetch('/api/component')
    .then(res => res.json())
    .then(comp => {
      // 返回组件定义对象
      return { template: comp.template };
    })
);
```

---

## 异步组件使用

**模板中使用**
```vue
<template>
  <AsyncComp />
</template>

<script setup>
import { defineAsyncComponent } from 'vue';
const AsyncComp = defineAsyncComponent(() => import('./AsyncComp.vue'));
</script>
```

**动态组件 is**
```vue
<template>
  <component :is="currentComp" />
</template>

<script setup>
import { shallowRef, defineAsyncComponent } from 'vue';

const currentComp = shallowRef(
  defineAsyncComponent(() => import('./DynamicComp.vue'))
);
</script>
```

**路由懒加载**
```typescript
import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: () => import('@/views/Home.vue')
    },
    {
      path: '/about',
      component: () => import('@/views/About.vue')
    }
  ]
});
```

---

## 配合 Suspense

**Suspense 包裹异步组件**
```vue
<template>
  <Suspense>
    <template #default>
      <AsyncComp />
    </template>
    <template #fallback>
      <div class="loading">Loading...</div>
    </template>
  </Suspense>
</template>

<script setup>
import { defineAsyncComponent } from 'vue';

const AsyncComp = defineAsyncComponent(() => import('./AsyncComp.vue'));
</script>
```

**async setup 组件**
```vue
<!-- AsyncData.vue -->
<script setup>
const data = await fetch('/api/data').then(r => r.json());
</script>

<template>
  <div>{{ data }}</div>
</template>

<!-- 父组件 -->
<template>
  <Suspense>
    <AsyncData />
    <template #fallback>
      <Spinner />
    </template>
  </Suspense>
</template>
```

**Suspense 事件**
```vue
<Suspense
  @resolve="onResolve"
  @pending="onPending"
  @fallback="onFallback"
>
  <AsyncComp />
  <template #fallback>
    <Loading />
  </template>
</Suspense>
```

---

## 异步组件配置选项

**loader 加载器**
```typescript
const AsyncComp = defineAsyncComponent({
  loader: () => import('./AsyncComp.vue')
});
```

**loadingComponent 加载占位**
```typescript
import LoadingSpinner from './LoadingSpinner.vue';

const AsyncComp = defineAsyncComponent({
  loader: () => import('./AsyncComp.vue'),
  loadingComponent: LoadingSpinner
});
```

**errorComponent 错误占位**
```typescript
import ErrorDisplay from './ErrorDisplay.vue';

const AsyncComp = defineAsyncComponent({
  loader: () => import('./AsyncComp.vue'),
  errorComponent: ErrorDisplay
});
```

**delay 延迟显示 loading**
```typescript
const AsyncComp = defineAsyncComponent({
  loader: () => import('./AsyncComp.vue'),
  loadingComponent: LoadingSpinner,
  delay: 200  // 200ms 内加载完不显示 loading
});
```

**timeout 超时**
```typescript
const AsyncComp = defineAsyncComponent({
  loader: () => import('./AsyncComp.vue'),
  errorComponent: ErrorDisplay,
  timeout: 3000  // 3 秒未加载完成显示 error
});
```

---

## 错误处理

**onError 重试机制**
```typescript
const AsyncComp = defineAsyncComponent({
  loader: () => import('./AsyncComp.vue'),
  errorComponent: ErrorDisplay,
  onError(err, retry, fail, attempts) {
    // err: 错误对象
    // retry: 重试函数
    // fail: 标记失败
    // attempts: 已尝试次数
    if (attempts <= 3) {
      setTimeout(retry, 1000 * attempts);
    } else {
      fail();
    }
  }
});
```

**onErrorCaptured 捕获错误**
```vue
<template>
  <Suspense>
    <template #default>
      <AsyncComp v-if="!error" />
      <ErrorComp v-else :error="error" />
    </template>
    <template #fallback>
      <Loading />
    </template>
  </Suspense>
</template>

<script setup>
import { ref, onErrorCaptured, defineAsyncComponent } from 'vue';

const error = ref(null);
const AsyncComp = defineAsyncComponent(() => import('./AsyncComp.vue'));

onErrorCaptured((err) => {
  error.value = err;
  return false;  // 阻止向上传递
});
</script>
```

---

## 高级用法

**工厂函数返回组件**
```typescript
function createAsyncComponent(name: string) {
  return defineAsyncComponent(() => import(`./components/${name}.vue`));
}

const Header = createAsyncComponent('Header');
const Footer = createAsyncComponent('Footer');
const Sidebar = createAsyncComponent('Sidebar');
```

**条件加载**
```typescript
const AsyncComp = defineAsyncComponent(() => {
  return condition.value
    ? import('./CompA.vue')
    : import('./CompB.vue');
});
```

**预加载**
```typescript
// 预先加载组件
const loader = () => import('./HeavyComp.vue');

// 在空闲时预加载
const preload = () => {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => loader());
  }
};

const AsyncComp = defineAsyncComponent(loader);
</script>
```

---

## 异步组件 + 路由

**路由懒加载完整示例**
```typescript
import { createRouter, createWebHistory } from 'vue-router';
import { defineAsyncComponent } from 'vue';
import Layout from '@/views/Layout.vue';

const routes = [
  {
    path: '/',
    component: Layout,
    children: [
      {
        path: '',
        name: 'home',
        component: defineAsyncComponent({
          loader: () => import('@/views/Home.vue'),
          loadingComponent: () => import('@/components/Loading.vue'),
          delay: 200
        })
      },
      {
        path: 'about',
        name: 'about',
        component: () => import('@/views/About.vue')
      },
      {
        path: 'admin',
        name: 'admin',
        component: defineAsyncComponent({
          loader: () => import('@/views/Admin.vue'),
          loadingComponent: () => import('@/components/Loading.vue'),
          errorComponent: () => import('@/components/Error.vue'),
          timeout: 5000,
          onError(err, retry, fail, attempts) {
            if (attempts < 2) retry();
            else fail();
          }
        }),
        meta: { requiresAuth: true }
      }
    ]
  }
];

export default createRouter({
  history: createWebHistory(),
  routes
});
```

---

## 综合应用

**分组加载**
```vue
<template>
  <Suspense>
    <template #default>
      <Header />
      <main>
        <Sidebar />
        <Content />
      </main>
      <Footer />
    </template>
    <template #fallback>
      <PageSkeleton />
    </template>
  </Suspense>
</template>

<script setup>
import { defineAsyncComponent } from 'vue';
import PageSkeleton from '@/components/PageSkeleton.vue';

const Header = defineAsyncComponent(() => import('@/components/Header.vue'));
const Sidebar = defineAsyncComponent(() => import('@/components/Sidebar.vue'));
const Content = defineAsyncComponent(() => import('@/components/Content.vue'));
const Footer = defineAsyncComponent(() => import('@/components/Footer.vue'));
</script>
```

**按需加载组件库**
```typescript
// utils/async-component.ts
import { defineAsyncComponent, type Component } from 'vue';

export function loadAsync(path: string): Component {
  return defineAsyncComponent({
    loader: () => import(/* @vite-ignore */ path),
    loadingComponent: { template: '<div>加载中...</div>' },
    errorComponent: { template: '<div>加载失败</div>' },
    delay: 100,
    timeout: 10000
  });
}

// 使用
const Chart = loadAsync('@/components/Chart.vue');
const Editor = loadAsync('@/components/Editor.vue');
```
