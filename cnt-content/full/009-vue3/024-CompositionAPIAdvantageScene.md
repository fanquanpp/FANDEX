---
order: 240
title: 组合式 API 优势场景
module: 'vue3'
category: 前端技术
difficulty: advanced
description: Vue 3组合式API vs 选项式API对比与优势场景分析。
author: fanquanpp
updated: '2026-09-08'
related:
  - 'vue3/022-ComputedCacheWatchTiming'
  - 'vue3/023-VueRouterDetailed'
  - 'vue3/025-CustomComposableWrapper'
  - 'vue3/026-TeleportPortalApp'
prerequisites: []
---

## 1. 两种 API 对比

### 1.1 选项式 API

```javascript
export default {
  data() {
    return { count: 0, user: null };
  },
  computed: {
    doubled() {
      return this.count * 2;
    },
  },
  methods: {
    increment() {
      this.count++;
    },
  },
  mounted() {
    this.fetchUser();
  },
};
```

### 1.2 组合式 API

```javascript
export default {
  setup() {
    const count = ref(0);
    const user = ref(null);
    const doubled = computed(() => count.value * 2);
    const increment = () => count.value++;
    onMounted(() => fetchUser());
    return { count, user, doubled, increment };
  },
};
```

## 2. 组合式 API 优势

### 2.1 逻辑复用

```javascript
// 可复用的鼠标位置逻辑
function useMouse() {
  const x = ref(0);
  const y = ref(0);
  const update = (e) => {
    x.value = e.clientX;
    y.value = e.clientY;
  };
  onMounted(() => window.addEventListener('mousemove', update));
  onUnmounted(() => window.removeEventListener('mousemove', update));
  return { x, y };
}

// 在任何组件中使用
const { x, y } = useMouse();
```

### 2.2 逻辑关注点聚合

选项式 API 中，同一功能的代码分散在 data/methods/computed 中；组合式 API 中，相关代码聚合在一起。

### 2.3 更好的类型推导

```typescript
// 组合式 API：自动类型推导
const count = ref(0); // Ref<number>
const name = ref(''); // Ref<string>

// 选项式 API：需要额外声明
```

## 3. 适用场景

| 场景            | 推荐 API   |
| --------------- | ---------- |
| 简单组件        | 选项式 API |
| 逻辑复用        | 组合式 API |
| TypeScript 项目 | 组合式 API |
| 大型项目        | 组合式 API |
| 快速原型        | 选项式 API |
## 组合式 API

**基本写法：ref 响应式引用**
`const <变量> = ref(<初始值>);`
```typescript
// 创建响应式引用
import { ref } from 'vue';
const count = ref(0);
count.value++;
```

---

**基本写法：reactive 对象响应式**
`const <变量> = reactive(<对象>);`
```typescript
// 创建响应式对象
import { reactive } from 'vue';
const state = reactive({ count: 0, name: 'Vue' });
state.count++;
```

---

**基本写法：computed 计算属性**
`const <变量> = computed(() => <表达式>);`
```typescript
// 只读计算属性
import { computed } from 'vue';
const double = computed(() => count.value * 2);
// 可写计算属性
const fullName = computed({
    get: () => `${first.value} ${last.value}`,
    set: (v) => { [first.value, last.value] = v.split(' '); }
});
```

---

**基本写法：watch 监听**
`watch(<源>, (<新值>, <旧值>) => { }, { <选项> });`
```typescript
// 监听 ref
import { watch } from 'vue';
watch(count, (newVal, oldVal) => {
    console.log(`${oldVal} -> ${newVal}`);
}, { immediate: true, deep: false });
```

---

**基本写法：watchEffect 副作用监听**
`watchEffect(() => <表达式>);`
```typescript
// 自动追踪依赖
import { watchEffect } from 'vue';
watchEffect(() => {
    console.log(count.value);
});
```

---

**基本写法：生命周期钩子**
`on<名称>(() => { });`
```typescript
// 组件挂载后
import { onMounted, onUnmounted } from 'vue';
onMounted(() => { console.log('mounted'); });
onUnmounted(() => { cleanup(); });
```

---

## 组件定义

**基本写法：defineComponent 定义组件**
`defineComponent({ <选项> });`
```typescript
// 定义组件
import { defineComponent } from 'vue';
export default defineComponent({
    props: { msg: String },
    setup(props) {
        return { greeting: `Hello ${props.msg}` };
    }
});
```

---

**基本写法：script setup 单文件组件**
```vue
<script setup lang="ts">
import { ref } from 'vue';
const count = ref(0);
const increment = () => count.value++;
</script>
```

---

**基本写法：defineProps 定义 props**
`const props = defineProps<{ <属性>: <类型> }>();`
```typescript
// TypeScript 类型声明
const props = defineProps<{
    msg: string;
    count?: number;
}>();
```

---

**基本写法：defineEmits 定义事件**
`const emit = defineEmits<{ <事件>: [<参数>] }>();`
```typescript
// 定义事件
const emit = defineEmits<{
    change: [value: string];
    submit: [];
}>();
emit('change', 'new');
```

---

**基本写法：defineExpose 暴露方法**
`defineExpose({ <方法> });`
```typescript
// 暴露给父组件
defineExpose({ increment });
```

---

## 自定义组合函数

**基本写法：useXxx 模式**
`function use<名称>(<参数>) { return { <返回值> }; }`
```typescript
// 自定义 Hook
import { ref, onMounted } from 'vue';
function useMouse() {
    const x = ref(0);
    const y = ref(0);
    const update = (e: MouseEvent) => { x.value = e.x; y.value = e.y; };
    onMounted(() => window.addEventListener('mousemove', update));
    onUnmounted(() => window.removeEventListener('mousemove', update));
    return { x, y };
}
```

---

## Pinia 状态管理

**基本写法：defineStore 定义 Store**
`const use<Store> = defineStore('<名称>', { <选项> });`
```typescript
// Options 写法
import { defineStore } from 'pinia';
export const useCounterStore = defineStore('counter', {
    state: () => ({ count: 0 }),
    getters: { double: (state) => state.count * 2 },
    actions: { increment() { this.count++; } }
});
```

---

**基本写法：Setup Store**
`const use<Store> = defineStore('<名称>', () => { return { }; });`
```typescript
// Composition 写法
import { ref, computed } from 'vue';
export const useCounter = defineStore('counter', () => {
    const count = ref(0);
    const double = computed(() => count.value * 2);
    function increment() { count.value++; }
    return { count, double, increment };
});
```

---

**基本写法：使用 Store**
`const <store> = use<Store>();`
```typescript
// 在组件中使用
import { useCounterStore } from '@/stores/counter';
const store = useCounterStore();
store.count;
store.increment();
```

---

**基本写法：storeToRefs 解构**
`const { <字段> } = storeToRefs(<store>);`
```typescript
// 保持响应式的解构
import { storeToRefs } from 'pinia';
const store = useCounterStore();
const { count } = storeToRefs(store);
```

---

**基本写法：订阅状态变化**
`<store>.$subscribe((<state>, <payload>) => { });`
```typescript
// 监听状态变化
store.$subscribe((state, payload) => {
    localStorage.setItem('counter', JSON.stringify(state));
});
```

---

## 依赖注入

**基本写法：provide 提供依赖**
`provide(<键>, <值>);`
```typescript
// 父组件提供
import { provide, ref } from 'vue';
const theme = ref('dark');
provide('theme', theme);
```

---

**基本写法：inject 注入依赖**
`const <变量> = inject(<键> [, <默认值>]);`
```typescript
// 子组件注入
import { inject } from 'vue';
const theme = inject('theme', 'light');
```

---

## Teleport 与 Suspense

**基本写法：Teleport 传送**
`<Teleport to="<选择器>"><内容></Teleport>`
```vue
<template>
<Teleport to="body">
    <div class="modal">Modal Content</div>
</Teleport>
</template>
```

---

**基本写法：Suspense 异步组件**
`<Suspense><template #default><异步组件/></template><template #fallback><加载中/></template></Suspense>`
```vue
<template>
<Suspense>
    <template #default>
        <AsyncComponent />
    </template>
    <template #fallback>
        <div>Loading...</div>
    </template>
</Suspense>
</template>
```
