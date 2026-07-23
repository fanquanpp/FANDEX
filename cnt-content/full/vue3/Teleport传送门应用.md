---
order: 103
title: Teleport传送门应用
module: vue3
category: 'dev-lang'
difficulty: advanced
description: 'Vue 3 Teleport传送门组件应用：模态框、通知、全屏遮罩。'
author: fanquanpp
updated: '2026-06-14'
related:
  - vue3/组合式API优势场景
  - vue3/自定义组合函数封装
  - vue3/KeepAlive缓存与生命周期
  - vue3/异步组件与Suspense
prerequisites:
  - vue3/语法速查
---

## 1. Teleport 基础

### 1.1 基本用法

```html
<Teleport to="body">
  <div class="modal">模态框内容</div>
</Teleport>
```

`to` 属性指定目标容器，内容渲染到该容器中，但逻辑仍属于当前组件。

### 1.2 条件传送

```html
<Teleport to="body" :disabled="isMobile">
  <Modal />
</Teleport>
```

`disabled` 为 true 时，内容渲染在原位。

## 2. 实际应用

### 2.1 模态框

```html
<Teleport to="body">
  <div v-if="show" class="modal-overlay" @click="show = false">
    <div class="modal-content" @click.stop>
      <slot />
    </div>
  </div>
</Teleport>
```

### 2.2 通知系统

```html
<Teleport to="#notifications">
  <TransitionGroup name="notification">
    <div v-for="n in notifications" :key="n.id" class="notification">{{ n.message }}</div>
  </TransitionGroup>
</Teleport>
```

### 2.3 全屏遮罩

```html
<Teleport to="body">
  <div v-if="loading" class="fullscreen-loading">
    <Spinner />
  </div>
</Teleport>
```

## 3. 多 Teleport 同一目标

多个 Teleport 到同一目标时，按渲染顺序追加：

```html
<Teleport to="#modals">
  <div>A</div>
</Teleport>
<Teleport to="#modals">
  <div>b</div>
</Teleport>
<!-- 结果：a, b -->
```
