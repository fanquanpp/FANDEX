---
order: 53
title: Transition与动画
module: vue3
category: Vue3
difficulty: intermediate
description: Vue3过渡与动画系统
author: fanquanpp
updated: '2026-06-14'
related:
  - vue3/Provide与Inject
  - vue3/自定义指令进阶
  - vue3/Vue3编译优化
  - vue3/Vue3服务端渲染
prerequisites:
  - vue3/语法速查
---

## 1. Transition 组件

```vue
<template>
  <Transition name="fade">
    <div v-if="show">内容</div>
  </Transition>
</template>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
```

## 2. 过渡类名

| 类名             | 说明         |
| ---------------- | ------------ |
| `v-enter-from`   | 进入起始状态 |
| `v-enter-active` | 进入生效状态 |
| `v-enter-to`     | 进入结束状态 |
| `v-leave-from`   | 离开起始状态 |
| `v-leave-active` | 离开生效状态 |
| `v-leave-to`     | 离开结束状态 |

## 3. JavaScript 钩子

```vue
<Transition
  @before-enter="onBeforeEnter"
  @enter="onEnter"
  @after-enter="onAfterEnter"
  @before-leave="onBeforeLeave"
  @leave="onLeave"
  @after-leave="onAfterLeave"
>
  <div v-if="show">内容</div>
</Transition>
```

## 4. TransitionGroup

```vue
<TransitionGroup name="list" tag="ul">
  <li v-for="item in items" :key="item.id">{{ item.text }}</li>
</TransitionGroup>

<style>
.list-move,
.list-enter-active,
.list-leave-active {
  transition: all 0.5s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
.list-leave-active {
  position: absolute;
}
</style>
```

## 5. 自定义过渡

```vue
<Transition
  :duration="{ enter: 500, leave: 300 }"
  enter-active-class="animate__animated animate__fadeIn"
  leave-active-class="animate__animated animate__fadeOut"
>
  <div v-if="show">内容</div>
</Transition>
```
