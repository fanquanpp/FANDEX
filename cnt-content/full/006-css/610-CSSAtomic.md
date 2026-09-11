---
order: 610
title: CSS 原子化
module: 'css'
category: 前端技术
difficulty: intermediate
description: Tailwind CSS、UnoCSS
author: fanquanpp
updated: '2026-09-12'
related:
  - 'css/590-PostCSS'
  - 'css/600-BEMNamingMethodology'
  - 'css/550-CriticalRenderPathOptimization'
prerequisites:
  - 'css/020-CSS3OverviewBasicSyntax'
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

## 动手试试

1. 用工具类（如 `.text-center`、`.mt-4`）搭建一个卡片；
2. 对比“语义类 + 组件样式”与“原子类”两种写法的可维护性；
3. 在 Tailwind 中体验原子化工作流；
4. 进阶挑战：用 @apply 抽取重复工具类组合。

## 核心知识点

> 一句话记住原子化：一个类只做一件事（`.flex`、`.p-4`），组合成 UI；HTML 变长但 CSS 不增长。

- 原子类 = 单一职责的工具类；
- 优点：无样式冗余、改动局部化、设计约束统一；
- 缺点：HTML 类名冗长、组件样式散落；
- 代表：Tailwind CSS、UnoCSS；
- 可配合组件封装缓解可读性问题。

## 注意事项与改进建议

| 问题点 | 说明 | 改进方案 |
| --- | --- | --- |
| 类名泛滥 | HTML 难读 | 组件封装 + @apply |
| 与 BEM 混用 | 风格冲突 | 项目统一一种策略 |
| 动态拼接类名 | 样式丢失 | 使用完整类名或 safelist |

## 扩展学习

- Tailwind：`tailwind/030-UtilityCore`；
- BEM：`css/600-BEMNamingMethodology`；
- 架构：`css/560-CSSArchitectureMethodology`。
