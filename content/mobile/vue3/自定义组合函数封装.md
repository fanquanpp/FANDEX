# Composables 组合函数语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数

---

## 组合函数规范

**命名规范**
```typescript
// 组合函数以 use 开头,返回响应式对象或函数
export function useCounter(initial: number = 0) {
  const count = ref(initial);
  const increment = () => count.value++;
  const decrement = () => count.value--;
  const reset = () => { count.value = initial; };

  return { count, increment, decrement, reset };
}
```

**返回值规范**
```typescript
// 推荐:返回对象,便于解构
export function useMouse() {
  const x = ref(0);
  const y = ref(0);

  // ...

  return { x, y };
}

// 也可以返回响应式数组,但少用
export function useState() {
  const state = ref(null);
  const setState = (val: any) => { state.value = val; };
  return [state, setState] as const;
}
```

---

## 基础 Composables

**useCounter 计数器**
```typescript
import { ref, computed } from 'vue';

export function useCounter(initial: number = 0, step: number = 1) {
  const count = ref(initial);
  const double = computed(() => count.value * 2);

  function increment() {
    count.value += step;
  }
  function decrement() {
    count.value -= step;
  }
  function reset() {
    count.value = initial;
  }

  return { count, double, increment, decrement, reset };
}
```

**useMouse 鼠标位置**
```typescript
import { ref, onMounted, onUnmounted } from 'vue';

export function useMouse() {
  const x = ref(0);
  const y = ref(0);

  function update(event: MouseEvent) {
    x.value = event.pageX;
    y.value = event.pageY;
  }

  onMounted(() => window.addEventListener('mousemove', update));
  onUnmounted(() => window.removeEventListener('mousemove', update));

  return { x, y };
}
```

**useEventListener 事件监听**
```typescript
import { onMounted, onUnmounted, type Ref } from 'vue';

export function useEventListener(
  target: Ref<EventTarget | null> | EventTarget,
  event: string,
  callback: (e: Event) => void
) {
  const handler = (e: Event) => callback(e);

  onMounted(() => {
    const el = 'value' in target ? target.value : target;
    el?.addEventListener(event, handler);
  });

  onUnmounted(() => {
    const el = 'value' in target ? target.value : target;
    el?.removeEventListener(event, handler);
  });
}
```

---

## 数据请求

**useFetch 数据请求**
```typescript
import { ref, watch, type Ref } from 'vue';

export function useFetch<T>(url: Ref<string> | string) {
  const data = ref<T | null>(null);
  const error = ref<string | null>(null);
  const isLoading = ref(false);

  async function doFetch() {
    data.value = null;
    error.value = null;
    isLoading.value = true;

    try {
      const finalUrl = typeof url === 'string' ? url : url.value;
      const res = await fetch(finalUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      data.value = await res.json() as T;
    } catch (e: any) {
      error.value = e.message;
    } finally {
      isLoading.value = false;
    }
  }

  if (typeof url !== 'string') {
    watch(url, doFetch, { immediate: true });
  } else {
    doFetch();
  }

  return { data, error, isLoading, refresh: doFetch };
}
```

**useDebounce 防抖**
```typescript
import { ref, watch, type Ref } from 'vue';

export function useDebouncedRef<T>(initial: T, delay: number = 200): Ref<T> {
  const value = ref(initial) as Ref<T>;
  const debounced = ref(initial) as Ref<T>;
  let timer: number | undefined;

  watch(value, (newVal) => {
    if (timer) clearTimeout(timer);
    timer = window.setTimeout(() => {
      debounced.value = newVal;
    }, delay);
  });

  return value;
}

export function useDebounce<T>(fn: (...args: T[]) => void, delay: number = 200) {
  let timer: number | undefined;
  return (...args: T[]) => {
    if (timer) clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), delay);
  };
}
```

---

## 状态管理

**useLocalStorage 本地存储**
```typescript
import { ref, watch, type Ref } from 'vue';

export function useLocalStorage<T>(
  key: string,
  defaultValue: T
): Ref<T> {
  const stored = localStorage.getItem(key);
  const value = ref<T>(
    stored ? JSON.parse(stored) : defaultValue
  ) as Ref<T>;

  watch(value, (newVal) => {
    try {
      localStorage.setItem(key, JSON.stringify(newVal));
    } catch (e) {
      console.error('localStorage 写入失败:', e);
    }
  }, { deep: true });

  return value;
}
```

**useToggle 切换状态**
```typescript
import { ref } from 'vue';

export function useToggle(initial: boolean = false) {
  const value = ref(initial);
  const toggle = () => { value.value = !value.value; };
  const setTrue = () => { value.value = true; };
  const setFalse = () => { value.value = false; };

  return { value, toggle, setTrue, setFalse };
}
```

**useState 全局状态**
```typescript
import { ref, type Ref } from 'vue';

const globalState = new Map<string, Ref<any>>();

export function useState<T>(key: string, initial: T): Ref<T> {
  if (!globalState.has(key)) {
    globalState.set(key, ref(initial));
  }
  return globalState.get(key) as Ref<T>;
}
```

---

## 副作用与生命周期

**useInterval 定时器**
```typescript
import { onUnmounted } from 'vue';

export function useInterval(callback: () => void, delay: number = 1000) {
  let timer: number | undefined;

  const start = () => {
    if (timer) return;
    timer = window.setInterval(callback, delay);
  };

  const stop = () => {
    if (timer) {
      clearInterval(timer);
      timer = undefined;
    }
  };

  const reset = (newDelay?: number) => {
    stop();
    if (newDelay) delay = newDelay;
    start();
  };

  onUnmounted(stop);

  return { start, stop, reset };
}
```

**useTimeout 延时器**
```typescript
import { onUnmounted } from 'vue';

export function useTimeout(callback: () => void, delay: number = 0) {
  let timer: number | undefined;
  let started = false;

  const start = () => {
    if (started) return;
    started = true;
    timer = window.setTimeout(() => {
      callback();
      started = false;
    }, delay);
  };

  const clear = () => {
    if (timer) {
      clearTimeout(timer);
      timer = undefined;
      started = false;
    }
  };

  onUnmounted(clear);

  return { start, clear };
}
```

**useEventListener 自动清理**
```typescript
import { onMounted, onUnmounted, onUpdated, type Ref } from 'vue';

export function useResizeObserver(
  target: Ref<HTMLElement | null>,
  callback: ResizeObserverCallback
) {
  let observer: ResizeObserver | null = null;

  const observe = () => {
    if (target.value) {
      observer?.disconnect();
      observer = new ResizeObserver(callback);
      observer.observe(target.value);
    }
  };

  onMounted(observe);
  onUpdated(observe);
  onUnmounted(() => observer?.disconnect());
}
```

---

## 模板引用

**useTemplateRef 模板引用(Vue 3.5+)**
```typescript
import { useTemplateRef } from 'vue';

const inputEl = useTemplateRef<HTMLInputElement>('inputRef');
onMounted(() => inputEl.value?.focus());
```
```vue
<template>
  <input ref="inputRef" />
</template>
```

**封装 useElementSize**
```typescript
import { ref, onMounted, onUnmounted, useTemplateRef, type Ref } from 'vue';

export function useElementSize() {
  const width = ref(0);
  const height = ref(0);
  const el = useTemplateRef<HTMLElement>('sizeRef');

  let observer: ResizeObserver | null = null;

  onMounted(() => {
    if (el.value) {
      observer = new ResizeObserver((entries) => {
        const rect = entries[0].contentRect;
        width.value = rect.width;
        height.value = rect.height;
      });
      observer.observe(el.value);
    }
  });

  onUnmounted(() => observer?.disconnect());

  return { el, width, height };
}
```

---

## 表单与校验

**useForm 表单管理**
```typescript
import { reactive, ref, computed } from 'vue';

export function useForm<T extends Record<string, any>>(
  initial: T,
  validators: Partial<Record<keyof T, (val: any) => string | null>> = {}
) {
  const values = reactive({ ...initial }) as T;
  const errors = ref<Partial<Record<keyof T, string>>>({});
  const touched = ref<Partial<Record<keyof T, boolean>>>({});

  function validate(): boolean {
    const newErrors: Partial<Record<keyof T, string>> = {};
    let valid = true;

    (Object.keys(validators) as Array<keyof T>).forEach((key) => {
      const validator = validators[key];
      if (validator) {
        const error = validator(values[key]);
        if (error) {
          newErrors[key] = error;
          valid = false;
        }
      }
    });

    errors.value = newErrors;
    return valid;
  }

  function setField<K extends keyof T>(key: K, value: T[K]) {
    values[key] = value;
    touched.value[key] = true;
  }

  function reset() {
    Object.assign(values, initial);
    errors.value = {};
    touched.value = {};
  }

  const isValid = computed(() => Object.keys(errors.value).length === 0);

  return { values, errors, touched, validate, setField, reset, isValid };
}
```

---

## 综合示例

**useMouseDrag 拖拽**
```typescript
import { ref, onMounted, onUnmounted, type Ref } from 'vue';

export function useMouseDrag(target: Ref<HTMLElement | null>) {
  const isDragging = ref(false);
  const startX = ref(0);
  const startY = ref(0);
  const currentX = ref(0);
  const currentY = ref(0);

  function onMouseDown(e: MouseEvent) {
    if (!target.value) return;
    isDragging.value = true;
    startX.value = e.clientX;
    startY.value = e.clientY;
    currentX.value = e.clientX;
    currentY.value = e.clientY;
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  function onMouseMove(e: MouseEvent) {
    if (!isDragging.value) return;
    currentX.value = e.clientX;
    currentY.value = e.clientY;
  }

  function onMouseUp() {
    isDragging.value = false;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  }

  onMounted(() => {
    target.value?.addEventListener('mousedown', onMouseDown);
  });

  onUnmounted(() => {
    target.value?.removeEventListener('mousedown', onMouseDown);
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  });

  const deltaX = () => currentX.value - startX.value;
  const deltaY = () => currentY.value - startY.value;

  return { isDragging, currentX, currentY, deltaX, deltaY };
}
```

**useBreakpoint 响应式断点**
```typescript
import { ref, onMounted, onUnmounted, computed } from 'vue';

const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536
};

export function useBreakpoint() {
  const width = ref(window.innerWidth);

  function update() {
    width.value = window.innerWidth;
  }

  onMounted(() => window.addEventListener('resize', update));
  onUnmounted(() => window.removeEventListener('resize', update));

  const isMobile = computed(() => width.value < BREAKPOINTS.md);
  const isTablet = computed(() =>
    width.value >= BREAKPOINTS.md && width.value < BREAKPOINTS.lg
  );
  const isDesktop = computed(() => width.value >= BREAKPOINTS.lg);

  return { width, isMobile, isTablet, isDesktop };
}
```
