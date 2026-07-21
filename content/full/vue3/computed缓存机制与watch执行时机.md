---
order: 100
title: computed缓存机制与watch执行时机
module: vue3
category: 'dev-lang'
difficulty: advanced
description: 'Vue 3 computed缓存机制与watch执行时机详解。'
author: fanquanpp
updated: '2026-06-14'
related:
  - vue3/Pinia状态管理详解
  - vue3/插件开发
  - vue3/Router详解
  - vue3/组合式API优势场景
prerequisites:
  - vue3/语法速查
---

## 1. computed 缓存机制

### 1.1 惰性求值

computed 只有在被读取时才会计算，且缓存结果：

```javascript
const count = ref(0);
const doubled = computed(() => {
  console.log('computed 执行');
  return count.value * 2;
});

// 首次读取：执行计算
console.log(doubled.value); // computed 执行 → 0

// 再次读取：返回缓存
console.log(doubled.value); // 无日志 → 0（缓存）

// 依赖变化
count.value = 1;
// 此时不会重新计算！computed 是惰性的

// 再次读取：重新计算
console.log(doubled.value); // computed 执行 → 2
```

### 1.2 脏标记机制

Vue 3 使用脏标记（dirty flag）实现缓存：

```
初始状态: dirty = true
首次读取: 执行计算 → dirty = false → 缓存结果
依赖变化: dirty = true → 不立即重新计算
再次读取: dirty === true → 重新计算 → dirty = false
```

### 1.3 computed vs methods

| 特性     | computed | methods  |
| -------- | -------- | -------- |
| 缓存     | 有       | 无       |
| 响应式   | 是       | 否       |
| 调用方式 | 属性访问 | 函数调用 |
| 副作用   | 不应有   | 可以有   |

## 2. watch 执行时机

### 2.1 默认行为

```javascript
const count = ref(0);

watch(
  count,
  (newVal, oldVal) => {
    console.log('watch 触发:', newVal);
  },
  { flush: 'pre' }
); // 默认值

count.value = 1;
console.log('同步代码');
// 输出顺序: 同步代码 → watch 触发: 1
```

### 2.2 flush 选项

| flush 值 | 执行时机           | 用途               |
| -------- | ------------------ | ------------------ |
| `pre`    | DOM 更新前（默认） | 修改其他响应式数据 |
| `post`   | DOM 更新后         | 访问更新后的 DOM   |
| `sync`   | 同步执行           | 调试（性能差）     |

```javascript
watch(
  count,
  (newVal) => {
    // pre: DOM 还未更新
  },
  { flush: 'pre' }
);

watch(
  count,
  (newVal) => {
    // post: DOM 已更新，可安全访问
    document.getElementById('counter').textContent;
  },
  { flush: 'post' }
);
```

### 2.3 immediate 选项

```javascript
watch(
  source,
  (newVal, oldVal) => {
    // 创建时立即执行一次
  },
  { immediate: true }
);
```

### 2.4 deep 选项

```javascript
const state = reactive({ nested: { count: 0 } });

watch(
  state,
  (newVal) => {
    // 深层变化也会触发
  },
  { deep: true }
);

// Vue 3.4+ watch 自动深层监听 reactive 对象
```

## 3. watchEffect

```javascript
// 自动追踪依赖
watchEffect(() => {
  console.log(count.value); // 自动追踪 count
});

// 与 watch 的区别
// watchEffect: 自动追踪、立即执行、无旧值
// watch: 显式指定、惰性执行、有旧值
```

## 4. 停止侦听器

```javascript
const stop = watch(source, callback);

// 组件卸载时自动停止
// 手动停止
stop();
```
