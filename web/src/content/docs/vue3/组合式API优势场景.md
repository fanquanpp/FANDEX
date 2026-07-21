---
order: 101
title: 组合式API优势场景
module: vue3
category: 'dev-lang'
difficulty: advanced
description: 'Vue 3组合式API vs 选项式API对比与优势场景分析。'
author: fanquanpp
updated: '2026-06-14'
related:
  - vue3/computed缓存机制与watch执行时机
  - vue3/Router详解
  - vue3/自定义组合函数封装
  - vue3/Teleport传送门应用
prerequisites:
  - vue3/语法速查
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
