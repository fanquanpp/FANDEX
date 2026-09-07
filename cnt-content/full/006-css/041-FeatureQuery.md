---
order: 410
title: 特性查询
module: 'css'
category: 前端技术
difficulty: intermediate
description: '@supports'
author: fanquanpp
updated: '2026-08-30'
related:
  - 'css/054-Function'
  - 'css/036-CSSVariableCustomAttribute'
  - 'css/040-CascadeLayer'
  - 'css/037-LogicalProperty'
prerequisites:
  - 'css/002-CSS3OverviewBasicSyntax'
---


## 1. @supports 语法

```css
@supports (display: grid) {
  .container {
    display: grid;
  }
}

@supports not (display: grid) {
  .container {
    display: flex;
  }
}
```

### 逻辑操作符

```css
@supports (display: grid) and (gap: 1rem) {
}
@supports (display: flex) or (display: grid) {
}
@supports not (display: grid) {
}
```

## 2. 常用检测

```css
@supports (backdrop-filter: blur(10px)) {
  .glass {
    backdrop-filter: blur(10px);
  }
}
@supports (aspect-ratio: 1/1) {
  .square {
    aspect-ratio: 1/1;
  }
}
@supports (selector(:has(*))) {
  .card:has(.badge) {
    border-color: gold;
  }
}
```

## 3. JavaScript 检测

```javascript
if (CSS.supports('display', 'grid')) {
  /* 使用 Grid */
}
if (CSS.supports('(display: grid) and (gap: 1rem)')) {
  /* 使用 Grid + gap */
}
```

## 4. 渐进增强策略

```css
/* 基础样式 */
.container {
  display: flex;
  flex-wrap: wrap;
}
.item {
  width: 50%;
}

/* 增强样式 */
@supports (display: grid) {
  .container {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
  .item {
    width: auto;
  }
}
```

## 动手试试

1. 用 `@supports (display: grid)` 为支持 Grid 的浏览器提供布局，其余用 flex 兜底；
2. 用 `@supports not (...)` 做反向检测；
3. 在浏览器控制台用 CSS.supports() 检测特性；
4. 进阶挑战：用 `selector()` 检测选择器支持。

## 核心知识点

> 一句话记住特性查询：`@supports (属性: 值)` 检测浏览器能力，优雅降级与渐进增强的工具。

- 语法：`@supports (display: grid) { ... }`；
- 组合：`and`/`or`/`not`；
- JS 侧：`CSS.supports('display', 'grid')`；
- 用于新特性（Grid、:has、容器查询）的渐进增强；
- 不支持的浏览器直接忽略规则块。

## 注意事项与改进建议

| 问题点 | 说明 | 改进方案 |
| --- | --- | --- |
| 过度嵌套 | 可读性差 | 保持一层 |
| 把支持检测当版本检测 | 能力检测更可靠 | 检测具体属性 |
| 忘记兜底 | 不支持时无样式 | 先写基础样式再增强 |

## 扩展学习

- 渐进增强：`css/064-CSSNewFeatures`；
- 容器查询：`css/032-ContainerQuery`；
- 兼容性：`css/009-PriorityCalculation` 附录。
