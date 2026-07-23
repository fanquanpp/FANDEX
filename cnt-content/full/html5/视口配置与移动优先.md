---
order: 70
title: 视口配置与移动优先
module: html5
category: HTML5
difficulty: beginner
description: viewport、移动优先设计
author: fanquanpp
updated: '2026-06-14'
related:
  - html5/自定义数据属性
  - html5/跨文档通信
  - 'html5/项目示例-交互式表单应用'
prerequisites:
  - html5/概述与核心特性
---

## 1. 视口概念

| 视口类型     | 说明                          |
| ------------ | ----------------------------- |
| **布局视口** | 浏览器用于计算 CSS 布局的视口 |
| **视觉视口** | 用户实际看到的区域            |
| **理想视口** | 设备屏幕的理想尺寸            |

```javascript
console.log(document.documentElement.clientWidth); // 布局视口
console.log(window.visualViewport.width); // 视觉视口
```

## 2. viewport meta 标签

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
```

| 属性            | 值                 | 说明             |
| --------------- | ------------------ | ---------------- |
| `width`         | device-width       | 布局视口宽度     |
| `initial-scale` | 1.0                | 初始缩放比例     |
| `maximum-scale` | 1.0-10.0           | 最大缩放比例     |
| `user-scalable` | yes/no             | 是否允许用户缩放 |
| `viewport-fit`  | auto/contain/cover | 适配刘海屏       |

> **可访问性警告**：禁止用户缩放会影响视力不佳的用户，WCAG 要求支持 200% 缩放。

## 3. 设备像素比

$$
\text{DPR} = \frac{\text{物理像素}}{\text{CSS 像素}}
$$

```javascript
console.log(window.devicePixelRatio); // 1, 2, 3 等
```

## 4. 移动优先设计

```css
/* 移动优先：基础样式 */
.container {
  padding: 1rem;
  display: flex;
  flex-direction: column;
}

/* 平板 */
@media (min-width: 768px) {
  .container {
    padding: 2rem;
    flex-direction: row;
  }
}

/* 桌面 */
@media (min-width: 1024px) {
  .container {
    max-width: 1200px;
    margin: 0 auto;
  }
}
```

## 5. 安全区域适配

```css
.header {
  padding-top: env(safe-area-inset-top);
}
.footer {
  padding-bottom: env(safe-area-inset-bottom);
}
```

## 6. 响应式断点

| 断点 | 宽度     | 设备   |
| ---- | -------- | ------ |
| xs   | < 576px  | 手机   |
| sm   | ≥ 576px  | 大手机 |
| md   | ≥ 768px  | 平板   |
| lg   | ≥ 992px  | 小桌面 |
| xl   | ≥ 1200px | 桌面   |
