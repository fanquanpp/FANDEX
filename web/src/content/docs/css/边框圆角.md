---
order: 60
title: 边框圆角
module: css
category: CSS
difficulty: beginner
description: 'border-radius'
author: fanquanpp
updated: '2026-06-14'
related:
  - css/Grid网格布局
  - css/动画与过渡
  - css/媒体查询
  - css/容器查询
prerequisites:
  - css/概述与基本语法
---

## 1. border-radius 语法

```css
.box {
  border-radius: 10px;
}
.box {
  border-radius: 10px 20px 30px 40px;
} /* 左上 右上 右下 左下 */
.box {
  border-radius: 50px / 20px;
} /* 水平/垂直半径 */
```

## 2. 常见形状

```css
.circle {
  border-radius: 50%;
}
.pill {
  border-radius: 9999px;
}
.leaf {
  border-radius: 0 100% 0 100%;
}
.diagonal {
  border-radius: 50% 0 50% 0;
}
.blob {
  border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%;
}
```

## 3. 实战效果

```css
.bubble {
  border-radius: 12px;
  border-bottom-left-radius: 2px;
}
.card {
  border-radius: 8px;
  overflow: hidden;
}
.button {
  border-radius: 6px;
  transition: border-radius 0.3s;
}
.button:hover {
  border-radius: 12px;
}
```

## 4. 注意事项

- 百分比参照元素尺寸
- 圆角不会裁剪溢出内容（需配合 `overflow: hidden`）
- 表格 `border-collapse: collapse` 时圆角无效
