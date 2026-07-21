---
order: 55
tags:
  - vue3
difficulty: intermediate
title: 生命周期钩子
module: vue3
category: 'Vue3 Basics'
description: Vue3组件生命周期钩子详解：创建、挂载、更新、卸载与调试钩子的使用场景。
author: fanquanpp
updated: '2026-06-13'
related:
  - vue3/Vue3编译优化
  - vue3/Vue3服务端渲染
  - vue3/Vue3测试策略
  - 'vue3/Vue3与Web Components'
prerequisites:
  - vue3/语法速查
---

## 1. 生命周期概述

### 1.1 Vue3 生命周期流程

```
创建阶段: setup() → onBeforeMount → onMounted
更新阶段: onBeforeUpdate → onUpdated
卸载阶段: onBeforeUnmount → onUnmounted
调试钩子: onRenderTracked → onRenderTriggered
```

### 1.2 选项式 vs 组合式 API

| 选项式 API      | 组合式 API（setup中） | 说明           |
| :-------------- | :-------------------- | :------------- |
| beforeCreate    | setup()               | 组件实例创建前 |
| created         | setup()               | 组件实例创建后 |
| beforeMount     | onBeforeMount         | 挂载前         |
| mounted         | onMounted             | 挂载后         |
| beforeUpdate    | onBeforeUpdate        | 更新前         |
| updated         | onUpdated             | 更新后         |
| beforeUnmount   | onBeforeUnmount       | 卸载前         |
| unmounted       | onUnmounted           | 卸载后         |
| errorCaptured   | onErrorCaptured       | 错误捕获       |
| renderTracked   | onRenderTracked       | 渲染依赖追踪   |
| renderTriggered | onRenderTriggered     | 渲染触发       |

> 注意：在组合式API中，`beforeCreate` 和 `created` 的逻辑直接写在 `setup()` 中。

## 2. 各生命周期钩子详解

### 2.1 onMounted

组件挂载完成后调用，此时DOM已渲染，可以访问DOM元素。

```vue
<template>
  <div ref="container">内容区域</div>
  <canvas ref="canvas"></canvas>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const container = ref(null);
const canvas = ref(null);

onMounted(() => {
  // 访问DOM元素
  console.log(container.value); // <div>内容区域</div>

  // 初始化Canvas
  const ctx = canvas.value.getContext('2d');
  ctx.fillStyle = '#3498db';
  ctx.fillRect(0, 0, 100, 100);

  // 获取元素尺寸
  const rect = container.value.getBoundingClientRect();
  console.log('元素尺寸:', rect.width, rect.height);

  // 初始化第三方库
  // const chart = new Chart(canvas.value, config)
});

// 可以注册多个onMounted，按注册顺序执行
onMounted(() => {
  console.log('第二个onMounted');
});
</script>
```

### 2.2 onUpdated

组件更新完成后调用，可以访问更新后的DOM。

```vue
<template>
  <div ref="content">{{ message }}</div>
  <button @click="message = 'Updated!'">更新</button>
</template>

<script setup>
import { ref, onUpdated } from 'vue';

const message = ref('Hello');
const content = ref(null);

onUpdated(() => {
  // DOM已更新
  console.log('DOM已更新，内容:', content.value?.textContent);

  // 注意：避免在onUpdated中修改响应式数据，可能导致无限循环
});
</script>
```

### 2.3 onBeforeUnmount 与 onUnmounted

```vue
<template>
  <div>定时器组件</div>
</template>

<script setup>
import { ref, onBeforeUnmount, onUnmounted } from 'vue';

const timer = ref(null);
const resizeObserver = ref(null);

// 启动定时器
timer.value = setInterval(() => {
  console.log('定时执行');
}, 1000);

// 启动ResizeObserver
onMounted(() => {
  resizeObserver.value = new ResizeObserver((entries) => {
    console.log('尺寸变化:', entries);
  });
  resizeObserver.value.observe(document.body);
});

// onBeforeUnmount: 组件卸载前，实例仍然可用
onBeforeUnmount(() => {
  console.log('组件即将卸载，清理资源...');

  // 清理定时器
  if (timer.value) {
    clearInterval(timer.value);
    timer.value = null;
  }

  // 清理Observer
  if (resizeObserver.value) {
    resizeObserver.value.disconnect();
    resizeObserver.value = null;
  }
});

// onUnmounted: 组件已卸载，所有子组件也已卸载
onUnmounted(() => {
  console.log('组件已完全卸载');
});
</script>
```

### 2.4 onErrorCaptured

捕获后代组件的错误，用于错误边界。

```vue
<script setup>
import { ref, onErrorCaptured } from 'vue';

const error = ref(null);

onErrorCaptured((err, instance, info) => {
  // err: 错误对象
  // instance: 触发错误的组件实例
  // info: 错误来源信息（如 'render'、'event handler'）

  console.error('捕获到子组件错误:', err);
  console.error('错误来源:', info);

  error.value = err.message;

  // 返回false阻止错误继续向上传播
  return false;

  // 返回true或不返回，错误继续传播
});
</script>

<template>
  <div v-if="error" class="error-boundary">
    <h3>出错了</h3>
    <p>{{ error }}</p>
    <button @click="error = null">重试</button>
  </div>
  <slot v-else />
</template>
```

## 3. 生命周期实战模式

### 3.1 异步数据加载

```vue
<template>
  <div v-if="loading">加载中...</div>
  <div v-else-if="error">{{ error }}</div>
  <div v-else>
    <ul>
      <li v-for="item in data" :key="item.id">{{ item.name }}</li>
    </ul>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const data = ref([]);
const loading = ref(true);
const error = ref(null);

async function fetchData() {
  loading.value = true;
  error.value = null;
  try {
    const response = await fetch('/api/items');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    data.value = await response.json();
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

onMounted(fetchData);
</script>
```

### 3.2 事件监听器管理

```vue
<script setup>
import { onMounted, onBeforeUnmount } from 'vue';

// 键盘快捷键
function handleKeydown(e) {
  if (e.key === 'Escape') {
    // 关闭弹窗等
  }
}

// 窗口大小变化
function handleResize() {
  // 响应式调整
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
  window.addEventListener('resize', handleResize);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown);
  window.removeEventListener('resize', handleResize);
});
</script>
```

### 3.3 轮询数据

```vue
<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';

const data = ref(null);
let pollTimer = null;
const POLL_INTERVAL = 5000;

async function pollData() {
  try {
    const response = await fetch('/api/status');
    data.value = await response.json();
  } catch (err) {
    console.error('轮询失败:', err);
  }
}

onMounted(() => {
  pollData(); // 立即执行一次
  pollTimer = setInterval(pollData, POLL_INTERVAL);
});

onBeforeUnmount(() => {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
});
</script>
```

## 4. 服务器端渲染（SSR）注意事项

```vue
<script setup>
import { ref, onMounted } from 'vue';

const windowWidth = ref(0);

// onMounted只在客户端执行，SSR时不会运行
onMounted(() => {
  windowWidth.value = window.innerWidth;

  window.addEventListener('resize', () => {
    windowWidth.value = window.innerWidth;
  });
});

// 避免在setup顶层访问浏览器API
// const width = window.innerWidth  // SSR报错！

// 使用onMounted保护浏览器API调用
</script>
```

## 5. 常见问题与解决方案

### 5.1 onUpdated 无限循环

```vue
<!-- 错误：onUpdated中修改响应式数据 -->
<script setup>
import { ref, onUpdated } from 'vue';

const count = ref(0);

onUpdated(() => {
  count.value++; // 触发更新 → 再次调用onUpdated → 无限循环！
});
</script>

<!-- 正确：只在特定条件下修改 -->
<script setup>
import { ref, onUpdated } from 'vue';

const count = ref(0);
const needsUpdate = ref(false);

onUpdated(() => {
  if (needsUpdate.value) {
    needsUpdate.value = false;
    // 执行更新
  }
});
</script>
```

### 5.2 内存泄漏

```vue
<script setup>
import { onBeforeUnmount } from 'vue';

// 常见泄漏源及清理
onBeforeUnmount(() => {
  // 1. 清除定时器
  clearInterval(timer);

  // 2. 移除事件监听
  window.removeEventListener('scroll', handleScroll);

  // 3. 断开Observer
  observer.disconnect();

  // 4. 取消未完成的请求
  abortController.abort();

  // 5. 清理第三方库实例
  chart.destroy();
});
</script>
```

### 5.3 异步操作在组件卸载后执行

```vue
<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';

const isMounted = ref(false);

onMounted(() => {
  isMounted.value = true;

  fetchData().then((data) => {
    // 检查组件是否仍然挂载
    if (!isMounted.value) return;
    // 安全地更新状态
    items.value = data;
  });
});

onBeforeUnmount(() => {
  isMounted.value = false;
});
</script>
```

## 6. 总结与最佳实践

### 6.1 生命周期使用场景

| 钩子            | 典型用途                          |
| :-------------- | :-------------------------------- |
| setup()         | 初始化响应式数据、计算属性        |
| onMounted       | DOM操作、异步请求、初始化第三方库 |
| onUpdated       | DOM更新后的操作（谨慎使用）       |
| onBeforeUnmount | 清理定时器、事件监听、第三方实例  |
| onErrorCaptured | 错误边界、错误日志上报            |

### 6.2 最佳实践

1. **资源获取与释放配对**：onMounted获取，onBeforeUnmount释放
2. **避免onUpdated中修改状态**：防止无限循环
3. **SSR安全**：浏览器API只在onMounted中使用
4. **使用组合函数封装**：将生命周期逻辑提取到可复用的composable中
5. **异步操作检查挂载状态**：防止卸载后更新状态
