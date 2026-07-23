---
order: 73
title: CSS原子化
module: css
category: CSS
difficulty: intermediate
description: 'Tailwind CSS、UnoCSS'
author: fanquanpp
updated: '2026-06-14'
related:
  - css/PostCSS与构建工具
  - css/BEM命名方法论
  - css/CSS模块化
  - css/关键渲染路径优化
prerequisites:
  - css/概述与基本语法
---

## 1. CSS 原子化概述

原子化 CSS（Atomic CSS）将每个样式属性拆分为独立的工具类，按需组合。

## 2. Tailwind CSS

### 2.1 基本用法

```html
<div class="flex items-center justify-between p-4 bg-white rounded-lg shadow-md">
  <h1 class="text-xl font-bold text-gray-900">标题</h1>
  <button class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">操作</button>
</div>
```

### 2.2 响应式前缀

```html
<div class="w-full md:w-1/2 lg:w-1/3">响应式宽度</div>
```

### 2.3 状态变体

```html
<button class="bg-blue-500 hover:bg-blue-600 focus:ring-2 active:bg-blue-700">按钮</button>
```

### 2.4 自定义配置

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: { primary: '#3498db' },
      spacing: { 18: '4.5rem' },
    },
  },
  plugins: [],
};
```

### 2.5 @apply 指令

```css
.btn-primary {
  @apply px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600;
}
```

## 3. UnoCSS

### 3.1 特点

- 更快的编译速度
- 高度可定制的预设系统
- 按需生成，零冗余

```javascript
// uno.config.ts
import { defineConfig, presetUno, presetAttributify } from 'unocss';

export default defineConfig({
  presets: [presetUno(), presetAttributify()],
  rules: [['text-primary', { color: '#3498db' }]],
  shortcuts: {
    btn: 'px-4 py-2 rounded cursor-pointer',
    'btn-primary': 'btn bg-blue-500 text-white hover:bg-blue-600',
  },
});
```

## 4. 对比

| 特性     | Tailwind CSS | UnoCSS |
| -------- | ------------ | ------ |
| 性能     | 快           | 更快   |
| 定制性   | 高           | 更高   |
| 生态     | 最大         | 增长中 |
| 学习曲线 | 中等         | 中等   |
