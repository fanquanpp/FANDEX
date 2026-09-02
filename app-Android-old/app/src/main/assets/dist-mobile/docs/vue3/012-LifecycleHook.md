## 前置知识

- [Vue3 服务端渲染](/vue3/011-Vue3SSR)：建议先完成前一篇的学习

## 学习目标

- 掌握「1. 生命周期概述」的核心机制、典型用法与常见陷阱
- 掌握「2. 各生命周期钩子详解」的核心机制、典型用法与常见陷阱
- 掌握「3. 生命周期实战模式」的核心机制、典型用法与常见陷阱
- 掌握「4. 服务器端渲染（SSR）注意事项」的核心机制、典型用法与常见陷阱
- 掌握「5. 常见问题与解决方案」的核心机制、典型用法与常见陷阱


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
## 生命周期钩子总览

**组合式 API 钩子对照**
```typescript
import {
  onBeforeMount,    // 挂载前
  onMounted,        // 已挂载
  onBeforeUpdate,   // 更新前
  onUpdated,        // 已更新
  onBeforeUnmount,  // 卸载前
  onUnmounted,      // 已卸载
  onErrorCaptured,  // 错误捕获
  onActivated,      // KeepAlive 激活
  onDeactivated,    // KeepAlive 停用
  onServerPrefetch  // SSR 预取
} from 'vue';
```

---

## 创建与挂载阶段

**onBeforeMount 挂载前**
`onBeforeMount(<callback>);`
```typescript
import { onBeforeMount } from 'vue';
onBeforeMount(() => {
  console.log('组件即将挂载,DOM 尚未生成');
});
```

**onMounted 已挂载**
`onMounted(<callback>);`
```typescript
import { ref, onMounted } from 'vue';
const inputRef = ref<HTMLInputElement | null>(null);

onMounted(() => {
  console.log('组件已挂载,DOM 可访问');
  inputRef.value?.focus();
});

onMounted(() => {
  const timer = setInterval(() => console.log('tick'), 1000);
  // 在 onUnmounted 中清理
});
```

---

## 更新阶段

**onBeforeUpdate 更新前**
`onBeforeUpdate(<callback>);`
```typescript
import { onBeforeUpdate } from 'vue';
onBeforeUpdate(() => {
  console.log('DOM 即将更新,此时访问的是旧 DOM');
});
```

**onUpdated 已更新**
`onUpdated(<callback>);`
```typescript
import { onUpdated } from 'vue';
onUpdated(() => {
  console.log('DOM 已更新完毕');
  // 注意:不要在此处修改响应式状态,可能引起死循环
});
```

---

## 卸载阶段

**onBeforeUnmount 卸载前**
`onBeforeUnmount(<callback>);`
```typescript
import { onBeforeUnmount } from 'vue';
let timer: number;

onBeforeUnmount(() => {
  console.log('组件即将卸载,实例仍可用');
  clearInterval(timer);
});
```

**onUnmounted 已卸载**
`onUnmounted(<callback>);`
```typescript
import { onUnmounted } from 'vue';
onUnmounted(() => {
  console.log('组件已卸载,所有指令解绑,事件监听移除');
});
```

---

## 错误处理

**onErrorCaptured 错误捕获**
`onErrorCaptured((err, instance, info) => <boolean | void>);`
```typescript
import { onErrorCaptured } from 'vue';
onErrorCaptured((err, instance, info) => {
  console.error('捕获错误:', err);
  console.log('组件实例:', instance);
  console.log('错误信息:', info);
  return false;  // 阻止继续向上传递
});
```

---

## KeepAlive 钩子

**onActivated 激活**
`onActivated(<callback>);`
```typescript
import { onActivated } from 'vue';
onActivated(() => {
  console.log('被 keep-alive 缓存的组件激活');
});
```

**onDeactivated 停用**
`onDeactivated(<callback>);`
```typescript
import { onDeactivated } from 'vue';
onDeactivated(() => {
  console.log('被 keep-alive 缓存的组件停用');
});
```

---

## 服务端渲染钩子

**onServerPrefetch SSR 预取**
`onServerPrefetch(<asyncCallback>);`
```typescript
import { onServerPrefetch } from 'vue';
onServerPrefetch(async () => {
  await fetchInitialData();
  console.log('服务端预取完成');
});
```

---

## 调试钩子

**onRenderTracked 渲染依赖追踪(开发)**
`onRenderTracked((e) => {});`
```typescript
import { onRenderTracked } from 'vue';
onRenderTracked((event) => {
  console.log('渲染依赖被追踪:', event);
  // event: { effect, target, key, type }
});
```

**onRenderTriggered 渲染依赖触发(开发)**
`onRenderTriggered((e) => {});`
```typescript
import { onRenderTriggered } from 'vue';
onRenderTriggered((event) => {
  console.log('渲染依赖被触发:', event);
  // event: { effect, target, key, type, newValue, oldValue }
});
```

---

## 钩子注册与清理

**多次注册同一钩子**
```typescript
onMounted(() => console.log('first'));
onMounted(() => console.log('second'));
// 两个回调都会按注册顺序执行
```

**注册顺序与组件生命周期**
```typescript
import { ref, onMounted } from 'vue';
const setup = () => {
  const state = ref(0);
  // setup 同步执行期间注册的钩子按顺序触发
  onMounted(() => console.log('A'));
  onMounted(() => console.log('B'));
  return { state };
};
```

**钩子中清理副作用**
```typescript
import { onMounted, onUnmounted } from 'vue';

function useInterval(callback: () => void, delay: number) {
  let timer: number | undefined;
  onMounted(() => {
    timer = setInterval(callback, delay);
  });
  onUnmounted(() => {
    if (timer) clearInterval(timer);
  });
}
```

---

## 选项式 API 钩子对照

| 选项式 API | 组合式 API |
|---|---|
| beforeCreate | setup() 同步部分 |
| created | setup() 同步部分 |
| beforeMount | onBeforeMount |
| mounted | onMounted |
| beforeUpdate | onBeforeUpdate |
| updated | onUpdated |
| beforeUnmount | onBeforeUnmount |
| unmounted | onUnmounted |
| errorCaptured | onErrorCaptured |
| activated | onActivated |
| deactivated | onDeactivated |
| serverPrefetch | onServerPrefetch |
| renderTracked | onRenderTracked |
| renderTriggered | onRenderTriggered |
