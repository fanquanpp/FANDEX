---
order: 60
tags:
  - vue3
  - composable
difficulty: intermediate
title: '自定义 Hook'
module: vue3
category: 'Vue3 Basics'
description: Vue3组合式函数（Composables/自定义Hook）设计模式、最佳实践与常用Hook实现。
author: fanquanpp
updated: '2026-06-13'
related:
  - vue3/Vue3性能优化实践
  - vue3/响应式系统
  - vue3/组件系统
  - vue3/TypeScript集成
prerequisites:
  - vue3/语法速查
---

## 1. 自定义 Hook 概述

### 1.1 什么是组合式函数

组合式函数（Composable）是利用Vue组合式API封装的可复用状态逻辑。习惯上以 `use` 前缀命名。

```typescript
// 基本结构
import { ref, onMounted, onBeforeUnmount } from 'vue';

export function useXxx() {
  // 响应式状态
  const state = ref(initialValue);

  // 方法
  function doSomething() {
    /* ... */
  }

  // 生命周期钩子
  onMounted(() => {
    /* ... */
  });

  // 暴露状态和方法
  return { state, doSomething };
}
```

### 1.2 与 Mixin 的对比

| 特性     | Mixin                   | Composable         |
| :------- | :---------------------- | :----------------- |
| 命名冲突 | 容易冲突                | 显式解构，无冲突   |
| 来源不清 | 不知道属性来自哪个mixin | 清晰的函数调用来源 |
| 类型支持 | 差                      | 完整TypeScript支持 |
| 灵活性   | 静态混入                | 动态参数，可组合   |
| 逻辑复用 | 隐式共享                | 显式返回           |

## 2. 常用自定义 Hook 实现

### 2.1 useMouse - 鼠标位置追踪

```typescript
// composables/useMouse.ts
import { ref, onMounted, onBeforeUnmount } from 'vue';

export function useMouse() {
  const x = ref(0);
  const y = ref(0);

  function update(event: MouseEvent) {
    x.value = event.clientX;
    y.value = event.clientY;
  }

  onMounted(() => window.addEventListener('mousemove', update));
  onBeforeUnmount(() => window.removeEventListener('mousemove', update));

  return { x, y };
}

// 使用
// <script setup>
// import { useMouse } from '@/composables/useMouse'
// const { x, y } = useMouse()
// </script>
// <template>
//   <p>鼠标位置: {{ x }}, {{ y }}</p>
// </template>
```

### 2.2 useFetch - 数据请求

```typescript
// composables/useFetch.ts
import { ref, watch, toValue, type MaybeRef } from 'vue';

export function useFetch<T>(url: MaybeRef<string>) {
  const data = ref<T | null>(null);
  const error = ref<string | null>(null);
  const loading = ref(false);

  async function execute() {
    loading.value = true;
    error.value = null;

    try {
      const response = await fetch(toValue(url));
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      data.value = await response.json();
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error';
    } finally {
      loading.value = false;
    }
  }

  // URL变化时自动重新请求
  watch(() => toValue(url), execute, { immediate: true });

  return { data, error, loading, refresh: execute };
}

// 使用
// const { data, loading, error } = useFetch<User[]>('/api/users')
```

### 2.3 useLocalStorage - 本地存储

```typescript
// composables/useLocalStorage.ts
import { ref, watch, type Ref } from 'vue';

export function useLocalStorage<T>(key: string, defaultValue: T): Ref<T> {
  const stored = localStorage.getItem(key);
  const data = ref<T>(stored ? JSON.parse(stored) : defaultValue) as Ref<T>;

  watch(
    data,
    (newValue) => {
      localStorage.setItem(key, JSON.stringify(newValue));
    },
    { deep: true }
  );

  return data;
}

// 使用
// const theme = useLocalStorage('theme', 'light')
// const recentSearches = useLocalStorage<string[]>('recent', [])
```

### 2.4 useDebounce - 防抖

```typescript
// composables/useDebounce.ts
import { ref, watch, type Ref } from 'vue';

export function useDebounce<T>(value: Ref<T>, delay: number = 300): Ref<T> {
  const debouncedValue = ref(value.value) as Ref<T>;
  let timer: ReturnType<typeof setTimeout>;

  watch(value, (newVal) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      debouncedValue.value = newVal;
    }, delay);
  });

  return debouncedValue;
}

// 使用
// const searchQuery = ref('')
// const debouncedQuery = useDebounce(searchQuery, 500)
// watch(debouncedQuery, (q) => { search(q) })
```

### 2.5 useEventListener - 事件监听

```typescript
// composables/useEventListener.ts
import { onMounted, onBeforeUnmount, type MaybeRef } from 'vue';
import { unref } from 'vue';

export function useEventListener(
  target: MaybeRef<EventTarget | null>,
  event: string,
  handler: EventListener,
  options?: AddEventListenerOptions
) {
  onMounted(() => {
    const el = unref(target);
    el?.addEventListener(event, handler, options);
  });

  onBeforeUnmount(() => {
    const el = unref(target);
    el?.removeEventListener(event, handler);
  });
}

// 使用
// const container = ref<HTMLElement>()
// useEventListener(container, 'scroll', handleScroll)
// useEventListener(window, 'resize', handleResize)
```

### 2.6 useIntersectionObserver - 可见性检测

```typescript
// composables/useIntersectionObserver.ts
import { ref, onMounted, onBeforeUnmount, type Ref } from 'vue';

export function useIntersectionObserver(
  target: Ref<HTMLElement | null>,
  options?: IntersectionObserverInit
) {
  const isVisible = ref(false);
  let observer: IntersectionObserver | null = null;

  onMounted(() => {
    if (!target.value) return;

    observer = new IntersectionObserver(([entry]) => {
      isVisible.value = entry.isIntersecting;
    }, options);

    observer.observe(target.value);
  });

  onBeforeUnmount(() => {
    observer?.disconnect();
  });

  return { isVisible };
}

// 使用
// const imageRef = ref<HTMLImageElement>()
// const { isVisible } = useIntersectionObserver(imageRef)
```

## 3. Hook 组合模式

### 3.1 Hook 之间的组合

```typescript
// composables/useMouseInElement.ts
import { ref, type Ref } from 'vue';
import { useEventListener } from './useEventListener';

export function useMouseInElement(target: Ref<HTMLElement | null>) {
  const x = ref(0);
  const y = ref(0);
  const isOutside = ref(true);

  useEventListener(target, 'mousemove', (event: Event) => {
    const rect = (target.value as HTMLElement).getBoundingClientRect();
    const mouseEvent = event as MouseEvent;
    x.value = mouseEvent.clientX - rect.left;
    y.value = mouseEvent.clientY - rect.top;
    isOutside.value =
      mouseEvent.clientX < rect.left ||
      mouseEvent.clientX > rect.right ||
      mouseEvent.clientY < rect.top ||
      mouseEvent.clientY > rect.bottom;
  });

  return { x, y, isOutside };
}
```

### 3.2 带参数的 Hook

```typescript
// composables/useCounter.ts
import { ref, computed } from 'vue';

export function useCounter(initialValue = 0, options?: { min?: number; max?: number }) {
  const count = ref(initialValue);

  const min = options?.min ?? -Infinity;
  const max = options?.max ?? Infinity;

  const isMin = computed(() => count.value <= min);
  const isMax = computed(() => count.value >= max);

  function increment(delta = 1) {
    count.value = Math.min(count.value + delta, max);
  }

  function decrement(delta = 1) {
    count.value = Math.max(count.value - delta, min);
  }

  function reset() {
    count.value = initialValue;
  }

  return { count, isMin, isMax, increment, decrement, reset };
}

// 使用
// const { count, increment, decrement, isMin, isMax } = useCounter(0, { min: 0, max: 10 })
```

### 3.3 异步 Hook

```typescript
// composables/useAsync.ts
import { ref, type Ref } from 'vue';

export function useAsync<T>(fn: () => Promise<T>) {
  const data: Ref<T | null> = ref(null);
  const error: Ref<Error | null> = ref(null);
  const loading = ref(false);

  async function execute() {
    loading.value = true;
    error.value = null;
    try {
      data.value = await fn();
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err));
    } finally {
      loading.value = false;
    }
  }

  return { data, error, loading, execute };
}

// 使用
// const { data, loading, execute: loadUser } = useAsync(() => fetchUser(userId))
// onMounted(loadUser)
```

## 4. 常见问题与解决方案

### 4.1 Hook 中访问组件实例

```typescript
// 问题：composable中无法直接访问this
// 解决方案：通过参数传入或使用getCurrentInstance

import { getCurrentInstance } from 'vue';

export function useI18n() {
  const instance = getCurrentInstance();
  // 不推荐：getCurrentInstance只在setup中有效
  // 推荐方式：通过参数传入

  const i18n = instance?.appContext.config.globalProperties.$i18n;
  return { t: i18n?.t };
}
```

### 4.2 SSR 兼容性

```typescript
// 问题：浏览器API在SSR中不可用
// 解决方案：在onMounted中调用，或检查环境

export function useWindowSize() {
  const width = ref(0);
  const height = ref(0);

  // 安全：onMounted只在客户端执行
  onMounted(() => {
    width.value = window.innerWidth;
    height.value = window.innerHeight;

    useEventListener(window, 'resize', () => {
      width.value = window.innerWidth;
      height.value = window.innerHeight;
    });
  });

  return { width, height };
}
```

### 4.3 响应式参数丢失

```typescript
// 问题：直接解构props导致响应式丢失
// 解决方案：使用toRef或toRefs

import { toRef, toRefs } from 'vue';

export function useSearch(props: { query: string }) {
  // 错误：直接解构丢失响应式
  // const { query } = props

  // 正确：使用toRef保持响应式
  const query = toRef(props, 'query');

  // 或使用toRefs
  // const { query } = toRefs(props)

  watch(query, (newQuery) => {
    // 响应式生效
  });
}
```

## 5. 总结与最佳实践

### 5.1 命名与组织

1. **use前缀**：所有composable以 `use` 开头
2. **文件命名**：`useXxx.ts`，放在 `composables/` 目录
3. **单一职责**：每个composable只做一件事
4. **返回ref**：返回的响应式数据保持ref形式

### 5.2 设计原则

1. **显式参数**：不依赖全局状态，通过参数传入
2. **清理资源**：在onBeforeUnmount中清理副作用
3. **SSR安全**：浏览器API只在onMounted中使用
4. **灵活组合**：composable之间可以互相调用
5. **类型安全**：使用泛型提供完整TypeScript支持
