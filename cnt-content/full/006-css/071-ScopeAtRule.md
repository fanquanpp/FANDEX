---
order: 710
title: CSS @scope 规则语法速查手册
module: 'css'
category: 前端技术
difficulty: beginner
description: CSS @scope 规则语法速查手册 的完整教学讲解。
author: fanquanpp
updated: '2026-08-30'
related: []
prerequisites: []
---

## 基础语法

**基本写法：定义作用域**
`@scope (<根选择器>) { <规则集> }`
```css
/* 样式仅作用于 .card 子树内 */
@scope (.card) {
  p { color: gray; }
  img { border-radius: 8px; }
}
```

---

**基本写法：甜甜圈作用域（带上限）**
`@scope (<根>) to (<下限>) { <规则集> }`
```css
/* 上界 .article-body，下界 figure，中间区域生效 */
@scope (.article-body) to (figure) {
  img { border: 5px solid black; }
}
/* figure 内部的 img 不受影响，形成"甜甜圈洞" */
```

---

**基本写法：行内 @scope（省略前导）**
```html
<!-- <style> 内的 @scope 自动以父元素为根 -->
<parent-element>
  <style>
    @scope {
      p { color: red; }   <!-- 仅作用于 parent-element 内 -->
    }
  </style>
</parent-element>
```

---

## 多根作用域

**基本写法：多根选择器列表**
`@scope (<根1>, <根2>) { <规则集> }`
```css
/* 多个根共享同一组规则 */
@scope (.mike, .jane) {
  p { color: grey; }
}
```

---

**基本写法：多下限选择器**
`@scope (<根>) to (<下限1>, <下限2>) { <规则集> }`
```css
/* 多个下限同时排除 */
@scope (.article) to (.ad, .quote) {
  p { line-height: 1.6; }
}
```

---

## :scope 伪类

**基本写法：引用作用域根**
`:scope`
```css
/* :scope 指向 @scope 的根元素本身 */
@scope (.card) {
  :scope { padding: 16px; }       /* 等价 .card { padding: 16px; } */
  :scope > h2 { margin-top: 0; }  /* .card 的直接 h2 */
}
```

---

**基本写法：:scope 提升优先级**
```css
/* 普通选择器优先级 0-0-1，加 :scope 后为 0-1-1 */
@scope (.card) {
  img { /* 0-0-1 */ }
  :scope img { /* 0-1-1，优先级更高 */ }
}
```

---

## 作用域与嵌套

**基本写法：在 @scope 中嵌套**
```css
/* @scope 内可使用原生嵌套 */
@scope (.card) {
  & { padding: 16px; }
  & .title { font-weight: bold; }
  & :hover { background: #fafafa; }
}
```

---

**基本写法：@scope 嵌套到规则中**
```css
/* 在组件样式块内声明 @scope */
.card {
  color: black;
  @scope (&) to (& .legacy) {
    p { color: inherit; }
  }
}
```

---

## 级联与优先级

**基本写法：作用域邻近性**
```css
/* 当多个 @scope 都匹配时，DOM 距离更近的根胜出 */
/* 级联顺序：来源 > 重要性 > 层级 > 作用域邻近性 > 优先级 > 顺序 */
@scope (.outer) { h3 { color: red; } }
@scope (.inner) { h3 { color: blue; } }   /* 胜出（更近） */
```

---

**基本写法：与 @layer 组合**
```css
/* @scope 可置于层内 */
@layer components {
  @scope (.card) {
    .title { font-size: 1.2rem; }
  }
}
```

---

## 注意事项速查

**基本写法：选择器隔离而非样式隔离**
`@scope (<根>) { <规则> }`
```css
/* @scope 限制选择器匹配范围，但不阻止继承 */
@scope (.card) {
  p { color: red; }   /* 仅匹配 .card 内的 p */
}
/* 父元素继承的样式仍会作用到 .card 内 */
```

---

**基本写法：@scope 不影响自身之外的元素**
```css
/* 避免全局污染 */
p { color: black; }              /* 全局 */
@scope (.special) {
  p { color: red; }              /* 仅 .special 内 */
}
.special 外的 p 仍是黑色
```

## 动手试试

1. 用 `@scope (.card)` 限定卡片内标题样式；
2. 用 `:scope` 引用根元素；
3. 对比 `@scope` 与 BEM 类名的可维护性；
4. 进阶挑战：用 `@scope` 配合组件样式。

## 核心知识点

> 一句话记住 @scope：`@scope (根) { 规则 }` 把样式限定在子树内，比手写长选择器更清晰，`:scope` 指根元素。

- `@scope (selector) { ... }` 限定作用域；
- `:scope` 指向作用域根；
- 支持 `to` 定义边界；
- 替代深层选择器，避免命名前缀；
- 浏览器支持：Chrome 118+、Safari 17.4+。

## 注意事项与改进建议

| 问题点 | 说明 | 改进方案 |
| --- | --- | --- |
| 依赖编译 | 老浏览器不支持 | 构建转译或 BEM |
| 作用域边界不清 | 样式泄漏 | 明确根与边界 |
| 与 BEM 混用 | 风格冲突 | 团队统一 |

## 扩展学习

- 嵌套：`css/072-CSSNesting`；
- 架构：`css/044-CSSArchitectureMethodology`；
- 新特性：`css/065-CSSNewFeatures`。
