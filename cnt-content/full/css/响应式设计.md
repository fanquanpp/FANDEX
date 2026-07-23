---
order: 70
tags:
  - css
  - 'css-layout'
difficulty: intermediate
title: 响应式设计
module: css
category: 'CSS Basics'
description: CSS响应式设计与媒体查询实践
author: fanquanpp
updated: '2026-05-03'
related:
  - css/Sass预处理器
  - css/Less与Stylus
  - css/PostCSS与构建工具
  - css/BEM命名方法论
prerequisites:
  - css/概述与基本语法
---

## 2. 媒体查询

### 基本语法

```css
@media (条件) {
  /* 样式规则 */
}
```

### 常用媒体特性

- `width`/`height`：视口宽度/高度
- `min-width`/`max-width`：最小/最大视口宽度
- `orientation`：设备方向（portrait/landscape）
- `device-pixel-ratio`：设备像素比

### 断点设置

```css
/* 移动设备 */
@media (max-width: 767px) {
  /* 移动设备样式 */
}
/* 平板设备 */
@media (min-width: 768px) and (max-width: 1023px) {
  /* 平板设备样式 */
}
/* 桌面设备 */
@media (min-width: 1024px) {
  /* 桌面设备样式 */
}
```

## 3. 弹性布局技术

### 弹性网格系统

```css
.container {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
}
.item {
  flex: 1 1 300px; /* 增长因子 1, 收缩因子 1, 基础宽度 300px */
}
```

### 网格布局

```css
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}
```

## 4. 响应式图像

### 自适应图像

```css
img {
  max-width: 100%;
  height: auto;
}
```

### 图片源集

```html
<picture>
  <source media="(max-width: 768px)" srcset="small-image.jpg" />
  <source media="(min-width: 769px)" srcset="large-image.jpg" />
  <img src="fallback-image.jpg" alt="Description" />
</picture>
```

## 5. 响应式排版

### 相对字体单位

```css
 :
  font-size: 16px;
 }
 @media (max-width: 768px) {
  :root {
  font-size: 14px;
  }
 }
 body {
  font-size: 1rem;
 }
 h1 {
  font-size: 2.5rem;
 }
```

## 6. 响应式设计最佳实践

1. **移动优先**：从移动设备开始设计，然后扩展到更大的屏幕
2. **渐进增强**：确保基本功能在所有设备上都能正常工作
3. **性能优化**：针对移动设备优化图像和资源加载
4. **测试**：在不同设备和浏览器上测试设计
5. **简化导航**：在移动设备上使用汉堡菜单等简化导航

## 7. 常见问题与解决方案

### 问题1：图像在小屏幕上显示过大

**解决方案**：使用 `max-width: 100%; height: auto;` 确保图像适应容器

### 问题2：导航菜单在小屏幕上拥挤

**解决方案**：实现汉堡菜单，在小屏幕上折叠导航

### 问题3：表格在小屏幕上溢出

**解决方案**：在小屏幕上使表格可水平滚动，或重新设计表格布局

## 8. 工具与资源

- **响应式设计测试工具**：
- [Responsinator](http://www.responsinator.com/)
- [BrowserStack](https://www.browserstack.com/)
- Chrome DevTools 设备模拟器
- **响应式框架**：
- [Bootstrap](https://getbootstrap.com/)
- [Foundation](https://get.foundation/)
- [Tailwind CSS](https://tailwindcss.com/)

## 9. 实战示例

### 响应式导航栏

```html
<nav class="navbar">
  <div class="logo">Logo</div>
  <div class="menu-toggle"></div>
  <ul class="nav-links">
    <li><a href="#">Home</a></li>
    <li><a href="#">About</a></li>
    <li><a href="#">Services</a></li>
    <li><a href="#">Contact</a></li>
  </ul>
</nav>
```

```css
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #333;
  color: white;
}
.nav-links {
  display: flex;
  list-style: none;
  gap: 1rem;
}
.menu-toggle {
  display: none;
  cursor: pointer;
}
@media (max-width: 768px) {
  .nav-links {
    position: absolute;
    top: 70px;
    left: 0;
    right: 0;
    background: #333;
    flex-direction: column;
    align-items: center;
    padding: 1rem;
    gap: 1rem;
    display: none;
  }
  .nav-links.active {
    display: flex;
  }
  .menu-toggle {
    display: block;
  }
}
```

```javascript
const menuToggle = document.querySelector('.menu-toggle');
const navLinks = document.querySelector('.nav-links');
menuToggle.addEventListener('click', () => {
  navLinks.classList.toggle('active');
});
```

## 延伸阅读

- [JavaScript](javascript/overview)
