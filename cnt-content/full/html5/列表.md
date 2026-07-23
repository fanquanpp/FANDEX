---
order: 53
title: 列表
module: html5
category: HTML5
difficulty: beginner
description: ul、ol、dl
author: fanquanpp
updated: '2026-06-14'
related:
  - html5/元数据与字符编码
  - html5/文本语义
  - html5/链接与锚点
  - html5/图像与响应式图片
prerequisites:
  - html5/概述与核心特性
---

## 1. 无序列表 ul

```html
<ul>
  <li>苹果</li>
  <li>香蕉</li>
  <li>橙子</li>
</ul>
```

```css
ul {
  list-style-type: disc;
} /* 实心圆（默认） */
ul {
  list-style-type: circle;
} /* 空心圆 */
ul {
  list-style-type: square;
} /* 实心方块 */
ul {
  list-style-type: none;
} /* 无标记 */
```

## 2. 有序列表 ol

```html
<ol>
  <li>第一步</li>
  <li>第二步</li>
</ol>

<ol start="5">
  <li>第五项</li>
</ol>

<ol reversed>
  <li>第三项</li>
  <li>第二项</li>
</ol>
```

```css
ol {
  list-style-type: decimal;
} /* 1, 2, 3 */
ol {
  list-style-type: lower-roman;
} /* i, ii, iii */
ol {
  list-style-type: cjk-ideographic;
} /* 一, 二, 三 */
```

### CSS 计数器

```css
ol.custom {
  counter-reset: section;
  list-style: none;
}
ol.custom li {
  counter-increment: section;
}
ol.custom li::before {
  content: '第' counter(section) '章：';
  font-weight: bold;
}
```

## 3. 定义列表 dl

```html
<dl>
  <dt>HTML</dt>
  <dd>超文本标记语言</dd>
  <dt>CSS</dt>
  <dd>层叠样式表</dd>
</dl>
```

### 多对多关系

```html
<!-- 一个术语多个定义 -->
<dl>
  <dt>Java</dt>
  <dd>一种编程语言</dd>
  <dd>一种咖啡</dd>
</dl>
```

## 4. 列表布局技巧

```css
ul,
ol {
  list-style: none;
  margin: 0;
  padding: 0;
}
ul.nav {
  display: flex;
  gap: 1rem;
}
ul.custom-mark li {
  position: relative;
  padding-left: 1.5em;
}
ul.custom-mark li::before {
  content: '';
  position: absolute;
  left: 0;
  color: green;
}
```
