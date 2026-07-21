---
order: 65
tags:
  - css
  - 'css-variables'
difficulty: intermediate
title: 'CSS 变量与自定义属性'
module: css
category: 'CSS Basics'
description: CSS自定义属性（变量）定义、作用域、动态更新、主题系统与最佳实践详解。
author: fanquanpp
updated: '2026-06-13'
related:
  - css/移动端适配
  - css/函数
  - css/特性查询
  - css/层叠层
prerequisites:
  - css/概述与基本语法
---

## 1. CSS 自定义属性基础

### 1.1 什么是 CSS 自定义属性

CSS自定义属性（也称为CSS变量）允许开发者定义可复用的值，通过 `--` 前缀声明，使用 `var()` 函数引用。

```css
/* 声明自定义属性 */
:root {
  --primary-color: #3498db;
  --secondary-color: #2ecc71;
  --font-size-base: 16px;
  --spacing-unit: 8px;
  --border-radius: 4px;
  --transition-speed: 0.3s;
}

/* 使用自定义属性 */
.button {
  background-color: var(--primary-color);
  font-size: var(--font-size-base);
  padding: var(--spacing-unit) calc(var(--spacing-unit) * 2);
  border-radius: var(--border-radius);
  transition: background-color var(--transition-speed) ease;
}

.button:hover {
  background-color: var(--secondary-color);
}
```

### 1.2 与预处理器变量的区别

| 特性           | CSS自定义属性      | Sass/Less变量  |
| :------------- | :----------------- | :------------- |
| 运行时         | 是，动态更新       | 否，编译时替换 |
| 作用域         | 遵循CSS层叠        | 全局或块级     |
| 媒体查询       | 可在媒体查询中修改 | 不可           |
| JavaScript操作 | 可读写             | 不可           |
| 浏览器支持     | 现代浏览器         | 编译后无限制   |

### 1.3 命名规范

```css
:root {
  /* 推荐：使用有意义的名称 */
  --color-primary: #3498db;
  --color-secondary: #2ecc71;
  --color-text: #333;
  --color-background: #fff;

  /* 推荐：语义化命名而非具体值 */
  --color-danger: #e74c3c; /* 而非 --color-red */
  --spacing-small: 8px; /* 而非 --spacing-8px */
  --font-size-large: 1.25rem; /* 而非 --font-size-20 */

  /* 大小写敏感 */
  --myVar: 10px;
  --myvar: 20px; /* 不同于 --myVar */

  /* 可以包含特殊字符 */
  --my-color: blue;
  --my_color: blue;
}
```

## 2. 作用域与层叠

### 2.1 自定义属性的作用域

```css
/* 全局作用域（:root） */
:root {
  --main-color: #3498db;
  --padding: 16px;
}

/* 局部作用域 */
.card {
  --card-bg: white;
  --card-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  background: var(--card-bg);
  box-shadow: var(--card-shadow);
  padding: var(--padding);
}

/* 子元素继承父元素的自定义属性 */
.card-header {
  /* 继承 --card-bg, --card-shadow, --main-color 等 */
  color: var(--main-color);
  padding: var(--padding);
}

/* 覆盖父级自定义属性 */
.dark .card {
  --card-bg: #2d2d2d;
  --card-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  --main-color: #5dade2; /* 局部覆盖 */
}
```

### 2.2 层叠与优先级

```css
:root {
  --theme-color: blue;
}

.container {
  --theme-color: green;
}

.container .element {
  /* --theme-color 为 green（继承自 .container） */
  color: var(--theme-color);
}

.element-outside {
  /* --theme-color 为 blue（继承自 :root） */
  color: var(--theme-color);
}

/* 优先级规则与普通CSS属性相同 */
#special {
  --theme-color: red; /* ID选择器优先级更高 */
}
```

## 3. var() 函数

### 3.1 基本用法与默认值

```css
.element {
  /* 使用默认值：当变量未定义时使用 */
  color: var(--text-color, #333);
  font-size: var(--font-size, 16px);

  /* 默认值可以是另一个变量 */
  background: var(--bg-color, var(--default-bg, white));

  /* 默认值可以包含空格和多个值 */
  margin: var(--margin, 10px 20px);

  /* 不能用于属性名 */
  /* 错误: var(--prop-name): red; */
}
```

### 3.2 var() 在计算中的使用

```css
:root {
  --spacing: 8;
}

.element {
  /* calc() 中使用变量 */
  padding: calc(var(--spacing) * 1px); /* 8px */
  margin: calc(var(--spacing) * 2px); /* 16px */
  width: calc(100% - var(--spacing) * 4px); /* 100% - 32px */

  /* 变量直接存储带单位的值更常见 */
  --spacing-unit: 8px;
  padding: var(--spacing-unit);
  margin: calc(var(--spacing-unit) * 2);
}
```

## 4. 动态主题系统

### 4.1 亮色/暗色主题

```css
/* 亮色主题 */
:root {
  --color-bg-primary: #ffffff;
  --color-bg-secondary: #f5f5f5;
  --color-text-primary: #333333;
  --color-text-secondary: #666666;
  --color-border: #e0e0e0;
  --color-accent: #3498db;
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.08);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* 暗色主题 */
[data-theme='dark'] {
  --color-bg-primary: #1a1a2e;
  --color-bg-secondary: #16213e;
  --color-text-primary: #e0e0e0;
  --color-text-secondary: #a0a0a0;
  --color-border: #333355;
  --color-accent: #5dade2;
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.4);
}

/* 系统偏好检测 */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme]) {
    --color-bg-primary: #1a1a2e;
    --color-bg-secondary: #16213e;
    --color-text-primary: #e0e0e0;
    --color-text-secondary: #a0a0a0;
    --color-border: #333355;
    --color-accent: #5dade2;
    --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.3);
    --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.4);
  }
}

/* 应用主题变量 */
body {
  background-color: var(--color-bg-primary);
  color: var(--color-text-primary);
  transition:
    background-color 0.3s ease,
    color 0.3s ease;
}

.card {
  background-color: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-md);
  color: var(--color-text-primary);
}
```

### 4.2 JavaScript 动态切换主题

```html
<button id="theme-toggle">切换主题</button>

<script>
  const toggle = document.getElementById('theme-toggle');
  const html = document.documentElement;

  // 读取保存的主题偏好
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    html.setAttribute('data-theme', savedTheme);
  }

  toggle.addEventListener('click', () => {
    const current = html.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  });
</script>
```

### 4.3 品牌主题系统

```css
/* 多品牌主题 */
:root {
  /* 默认品牌 */
  --brand-primary: #3498db;
  --brand-secondary: #2ecc71;
  --brand-gradient: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary));
}

[data-brand='brand-a'] {
  --brand-primary: #e74c3c;
  --brand-secondary: #f39c12;
}

[data-brand='brand-b'] {
  --brand-primary: #9b59b6;
  --brand-secondary: #1abc9c;
}

/* 组件使用品牌变量 */
.brand-button {
  background: var(--brand-gradient);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: var(--border-radius, 4px);
}
```

## 5. 响应式设计中的变量

### 5.1 断点变量

```css
:root {
  /* 断点值（用于JS读取） */
  --breakpoint-sm: 640px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 1024px;
  --breakpoint-xl: 1280px;

  /* 响应式间距 */
  --container-padding: 16px;
  --section-spacing: 32px;
}

@media (min-width: 768px) {
  :root {
    --container-padding: 24px;
    --section-spacing: 48px;
  }
}

@media (min-width: 1024px) {
  :root {
    --container-padding: 32px;
    --section-spacing: 64px;
  }
}

.container {
  padding: 0 var(--container-padding);
}

section {
  margin-bottom: var(--section-spacing);
}
```

### 5.2 流式排版

```css
:root {
  /* 流式字体大小 */
  --font-size-base: clamp(1rem, 0.875rem + 0.5vw, 1.25rem);
  --font-size-sm: clamp(0.875rem, 0.75rem + 0.5vw, 1rem);
  --font-size-lg: clamp(1.25rem, 1rem + 1vw, 1.75rem);
  --font-size-xl: clamp(1.75rem, 1.25rem + 2vw, 3rem);
}

body {
  font-size: var(--font-size-base);
}

h1 {
  font-size: var(--font-size-xl);
}
h2 {
  font-size: var(--font-size-lg);
}
small {
  font-size: var(--font-size-sm);
}
```

## 6. JavaScript 操作自定义属性

### 6.1 读写自定义属性

```javascript
// 读取自定义属性
const root = document.documentElement;
const primaryColor = getComputedStyle(root).getPropertyValue('--color-primary');
console.log(primaryColor.trim()); // "#3498db"

// 设置自定义属性
root.style.setProperty('--color-primary', '#e74c3c');

// 在特定元素上设置
const card = document.querySelector('.card');
card.style.setProperty('--card-bg', '#f0f0f0');

// 移除自定义属性
card.style.removeProperty('--card-bg');
```

### 6.2 动态样式更新

```javascript
// 根据用户输入动态更新主题色
function updateAccentColor(hex) {
  document.documentElement.style.setProperty('--color-accent', hex);
}

// 基于滚动位置更新变量
window.addEventListener('scroll', () => {
  const scrollPercent = window.scrollY / (document.body.scrollHeight - window.innerHeight);
  document.documentElement.style.setProperty('--scroll-progress', scrollPercent);
});

// 鼠标位置跟踪
document.addEventListener('mousemove', (e) => {
  const x = e.clientX / window.innerWidth;
  const y = e.clientY / window.innerHeight;
  document.documentElement.style.setProperty('--mouse-x', x);
  document.documentElement.style.setProperty('--mouse-y', y);
});
```

## 7. 常见问题与解决方案

### 7.1 变量未定义时的回退

```css
/* 问题：变量未定义导致属性无效 */
.element {
  color: var(--undefined-var); /* 无效值，属性被忽略 */
}

/* 解决方案1：提供默认值 */
.element {
  color: var(--undefined-var, #333);
}

/* 解决方案2：使用 @supports 检测 */
@supports (--css: variables) {
  .element {
    color: var(--text-color);
  }
}
@supports not (--css: variables) {
  .element {
    color: #333;
  }
}
```

### 7.2 循环依赖

```css
/* 错误：循环引用 */
:root {
  --a: var(--b);
  --b: var(--a); /* 无限循环！ */
}

/* 解决方案：确保变量定义不形成环 */
:root {
  --a: blue;
  --b: var(--a); /* 正确：单向依赖 */
}
```

### 7.3 变量与单位

```css
/* 问题：变量值缺少单位 */
:root {
  --size: 20;
}

.element {
  /* width: var(--size)px;  错误！这会被解析为 "20px" 字符串但不是有效值 */
  width: calc(var(--size) * 1px); /* 正确 */
}

/* 推荐：变量直接包含单位 */
:root {
  --size: 20px;
}

.element {
  width: var(--size); /* 简洁正确 */
}
```

## 8. 总结与最佳实践

### 8.1 核心要点

1. **CSS变量是运行时动态的**，与预处理器变量本质不同
2. **遵循层叠规则**，可在任何选择器中定义和覆盖
3. **var() 必须提供默认值**，增强健壮性
4. **语义化命名**，使用 `--color-danger` 而非 `--color-red`

### 8.2 最佳实践

1. **全局变量放在 :root**，局部变量放在组件选择器
2. **分类组织变量**：颜色、间距、字体、动画等分组
3. **主题系统用 data 属性**：`[data-theme="dark"]` 切换
4. **响应式用媒体查询修改变量**，而非重复写组件样式
5. **JavaScript 修改变量实现动态效果**，避免直接操作样式
6. **变量命名加前缀**：避免与第三方库冲突，如 `--myapp-color`
