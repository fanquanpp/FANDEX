---
order: 102
title: 自定义组合函数封装
module: vue3
category: 'dev-lang'
difficulty: advanced
description: 'Vue 3自定义组合函数（Composables）封装模式与最佳实践。'
author: fanquanpp
updated: '2026-06-14'
related:
  - vue3/Router详解
  - vue3/组合式API优势场景
  - vue3/Teleport传送门应用
  - vue3/KeepAlive缓存与生命周期
prerequisites:
  - vue3/语法速查
---

## 1. Composable 设计原则

### 1.1 命名约定

以 `use` 开头：`useMouse`、`useFetch`、`useLocalStorage`

### 1.2 输入输出

```typescript
// 输入：ref 或 getter
function useExample(source: Ref<T> | (() => T)) {
  const resolved = computed(() => unref(source));
  // ...
  return {/* refs, computed, methods */};
}
```

## 2. 常见 Composable 模式

### 2.1 useFetch

```typescript
function useFetch<T>(url: Ref<string> | string) {
  const data = ref<T | null>(null);
  const error = ref<Error | null>(null);
  const loading = ref(false);

  const execute = async () => {
    loading.value = true;
    error.value = null;
    try {
      const res = await fetch(unref(url));
      data.value = await res.json();
    } catch (e) {
      error.value = e as Error;
    } finally {
      loading.value = false;
    }
  };

  watch(() => unref(url), execute, { immediate: true });

  return { data, error, loading, execute };
}
```

### 2.2 useLocalStorage

```typescript
function useLocalStorage<T>(key: string, defaultValue: T) {
  const stored = localStorage.getItem(key);
  const data = ref<T>(stored ? JSON.parse(stored) : defaultValue);

  watch(
    data,
    (val) => {
      localStorage.setItem(key, JSON.stringify(val));
    },
    { deep: true }
  );

  return data;
}
```

### 2.3 useEventListener

```typescript
function useEventListener(target: Ref<EventTarget | null>, event: string, handler: EventListener) {
  onMounted(() => target.value?.addEventListener(event, handler));
  onUnmounted(() => target.value?.removeEventListener(event, handler));
}
```

## 3. 最佳实践

- 始终在 `onUnmounted` 中清理副作用
- 返回 `ref` 而非 `reactive` 对象
- 接受 `ref` 或 getter 作为输入
- 提供合理的默认值
