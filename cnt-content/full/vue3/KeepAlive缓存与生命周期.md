---
order: 104
title: KeepAlive缓存与生命周期
module: vue3
category: 'dev-lang'
difficulty: advanced
description: 'Vue 3 KeepAlive组件缓存机制与activated/deactivated生命周期。'
author: fanquanpp
updated: '2026-06-14'
related:
  - vue3/自定义组合函数封装
  - vue3/Teleport传送门应用
  - vue3/异步组件与Suspense
  - vue3/Pinia持久化插件
prerequisites:
  - vue3/语法速查
---

## 1. KeepAlive 基础

### 1.1 基本用法

```html
<RouterView v-slot="{ Component }">
  <KeepAlive>
    <component :is="Component" />
  </KeepAlive>
</RouterView>
```

### 1.2 缓存策略

```html
<!-- 缓存指定组件 -->
<KeepAlive include="UserList,Settings">
  <component :is="current" />
</KeepAlive>

<!-- 排除指定组件 -->
<KeepAlive exclude="Login">
  <component :is="current" />
</KeepAlive>

<!-- 最大缓存数 -->
<KeepAlive :max="10">
  <component :is="current" />
</KeepAlive>
```

## 2. 生命周期钩子

```javascript
import { onActivated, onDeactivated } from 'vue';

export default {
  setup() {
    onActivated(() => {
      console.log('组件被激活');
    });

    onDeactivated(() => {
      console.log('组件被停用');
    });
  },
};
```

| 钩子            | 触发时机         |
| --------------- | ---------------- |
| `onActivated`   | 组件从缓存激活时 |
| `onDeactivated` | 组件被缓存停用时 |

## 3. 缓存刷新

```javascript
// 需要刷新缓存时，移除 include 中的组件名
const cachedViews = ref(['UserList', 'Settings']);

function refreshCache(name) {
  cachedViews.value = cachedViews.value.filter((v) => v !== name);
  nextTick(() => {
    cachedViews.value.push(name);
  });
}
```
