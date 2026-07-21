---
order: 54
title: 定位详解
module: css
category: CSS
difficulty: intermediate
description: static、relative、absolute、fixed、sticky
author: fanquanpp
updated: '2026-06-14'
related:
  - css/样式表引入方式
  - css/margin合并与塌陷
  - css/浮动与清除
  - css/层叠上下文
prerequisites:
  - css/概述与基本语法
---

## 1. position 属性

| 值         | 定位类型 | 脱离文档流 | 参照物       |
| ---------- | -------- | ---------- | ------------ |
| `static`   | 默认     |            | —            |
| `relative` | 相对定位 |            | 自身原位置   |
| `absolute` | 绝对定位 |            | 最近定位祖先 |
| `fixed`    | 固定定位 |            | 视口         |
| `sticky`   | 粘性定位 | →          | 滚动容器     |

## 2. relative

```css
.element {
  position: relative;
  top: 10px;
  left: 20px;
}
```

不脱离文档流，原位置保留。常作 absolute 的参照容器。

## 3. absolute

```css
.parent {
  position: relative;
}
.child {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
```

脱离文档流，参照最近定位祖先。

## 4. fixed

```css
.header {
  position: fixed;
  top: 0;
  width: 100%;
  z-index: 100;
}
```

参照视口，滚动时固定。注意 transform 会改变包含块。

## 5. sticky

```css
.sidebar {
  position: sticky;
  top: 20px;
}
th {
  position: sticky;
  top: 0;
  background: white;
  z-index: 1;
}
```

阈值前 relative，达到后 fixed。必须指定 top/bottom。

## 6. z-index

```css
:root {
  --z-dropdown: 100;
  --z-modal: 300;
  --z-toast: 400;
}
```

z-index 仅对定位元素生效；同一层叠上下文内比较；子元素无法超越父上下文。
