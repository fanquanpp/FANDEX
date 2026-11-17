---
order: 100
title: 表格样式
module: 'css'
category: 前端技术
difficulty: beginner
description: border-collapse、border-spacing、caption-side、empty-cells 与 table-layout，系统掌握表格美化。
author: fanquanpp
updated: '2026-11-16'
related:
  - 'css/140-PseudoClassPseudoElement'
  - 'css/170-PriorityCalculation'
prerequisites:
  - 'html5/120-List'
  - 'css/020-CSS3OverviewBasicSyntax'
---

## 0. 直觉：表格默认样式“很散”，需要收拢

浏览器默认的表格：边框各自独立、单元格之间有缝隙、宽度随内容乱撑。表格样式的核心就是把这张“散装表格”整理成整齐的网格。

最常用的一条规则是 `border-collapse: collapse`：让相邻单元格的边框合并成一条，表格立刻“紧凑”起来。

## 1. 核心属性

### 1.1 border-collapse：边框合并

```css
table {
  border-collapse: collapse; /* 合并相邻边框（推荐） */
  /* border-collapse: separate; 保留独立边框 */
}
```

**讲解：** `collapse` 让相邻单元格共用一条边框，是表格样式的事实标准；`separate` 是默认值，配合 `border-spacing` 控制单元格间距。

### 1.2 border-spacing：单元格间距

```css
table {
  border-collapse: separate;
  border-spacing: 4px 8px; /* 水平 4px，垂直 8px */
}
```

**讲解：** 只在 `separate` 模式下生效；`collapse` 模式下该属性无效。

### 1.3 caption-side：标题位置

```css
table {
  caption-side: top;    /* 标题在表格上方（默认） */
  /* caption-side: bottom; 标题在下方 */
}
```

**讲解：** 控制 `<caption>` 标题的位置，配合 `<caption>` 提供表格语义标题。

### 1.4 empty-cells：空单元格

```css
table {
  border-collapse: separate;
  empty-cells: hide; /* 隐藏空单元格的背景与边框 */
}
```

**讲解：** 只在 `separate` 模式下生效；`show` 为默认值。数据表格中合并单元格后留下的空位可以用它隐藏。

### 1.5 table-layout：宽度算法

```css
table {
  table-layout: auto;   /* 浏览器按内容计算（默认） */
  table-layout: fixed;  /* 按第一行/列宽计算，更快更可控 */
}
```

**讲解：** `fixed` 模式按第一行决定列宽，渲染更快，适合大数据表格；`auto` 会随内容自适应，但长内容可能撑破布局。

### 1.6 完整示例

```html
<style>
  table {
    border-collapse: collapse;
    width: 100%;
  }
  th,
  td {
    border: 1px solid #ddd;
    padding: 8px 12px;
    text-align: left;
  }
  th {
    background: #f5f5f5;
  }
  tbody tr:nth-child(odd) {
    background: #fafafa; /* 隔行变色 */
  }
</style>
<table>
  <caption>月度销售统计</caption>
  <thead>
    <tr><th>月份</th><th>销售额</th></tr>
  </thead>
  <tbody>
    <tr><td>1 月</td><td>12000</td></tr>
    <tr><td>2 月</td><td>15000</td></tr>
  </tbody>
</table>
```

**讲解：** 完整表格样式的标准套路：`collapse` 合并边框、`th` 加底色区分表头、`:nth-child(odd)` 隔行变色、`<caption>` 提供标题。

## 2. 动手试试

1. 建一个 3x3 表格，分别用 `collapse` 与 `separate` 观察边框差异；
2. 给表头加背景色，用 `:nth-child(odd)` 做隔行变色；
3. 用 `table-layout: fixed` 固定列宽，对比 `auto` 的行为；
4. 进阶挑战：做一个响应式表格，小屏时把表头变成竖排（`display: block` 方案）。

## 3. 核心知识点

> 一句话记住表格样式：`collapse` 收边框，`spacing` 调间距，`caption` 定标题，`fixed` 管宽度；表头加底色，隔行变色更好读。

- `border-collapse: collapse` 是表格首选；
- `border-spacing` 与 `empty-cells` 只在 `separate` 下生效；
- `caption-side` 控制标题位置；
- `table-layout: fixed` 性能更好、宽度可控；
- 表头用 `th` + 背景色区分，隔行变色用 `:nth-child`；
- 表格语义（`caption`/`thead`/`tbody`）与样式配合。

## 4. 注意事项与改进建议

| 问题点 | 说明 | 改进方案 |
| --- | --- | --- |
| 忘记 `collapse` | 双层边框、间隙大 | 表格一律 `border-collapse: collapse` |
| 用 div 拼表格 | 语义与读屏支持全丢 | 使用原生 `table` 结构 |
| 列宽随内容乱变 | 布局跳动 | `table-layout: fixed` + 显式列宽 |
| 没有表头 | 数据含义不明 | 用 `th` + `scope` 语义化 |
| 大表格无分页 | 渲染与滚动卡顿 | 虚拟滚动或分页 |

## 5. 扩展学习

- 结构语义：`html5/120-List` 与表格的对比；
- 隔行变色：`css/140-PseudoClassPseudoElement` 的 `:nth-child`；
- 响应式表格：`css/370-ResponsiveDesign`；
- 数据可视化：用 `css/250-CSS3GridGridLayout` 做网格布局。

## 6. 动手实践：遮码自检

先只读任务与提示，遮住第 1 节的示例代码自己写，再对照参考实现。

**任务一**：给一张「订单表」写样式——合并相邻边框、表头有底色、奇偶行隔行变色、标题 `<caption>` 置于表格下方；列宽不随内容乱撑（用 `fixed` 模式并给两列显式宽度）。

**任务二**：回答两问——（a）`border-spacing: 8px` 写在 `border-collapse: collapse` 的表上为什么不生效；（b）`table-layout: fixed` 快在哪里、代价是什么。

**提示**：任务一是第 1.6 节标准套路加两处新要求：`caption-side: bottom` 与 `table-layout: fixed`（fixed 模式的列宽由第一行决定，给 `th` 设 `width`）；任务二的两个「为什么」分别在第 1.2、1.5 节的讲解里。

**参考实现**（先自己写完再看）：

```css
/* 任务一 */
table {
  border-collapse: collapse;
  table-layout: fixed;
  width: 100%;
}

th { width: 30%; }     /* fixed 模式：第一行的列宽决定全表 */
td { width: 70%; }

th,
td {
  border: 1px solid #ddd;
  padding: 8px 12px;
}

th { background: #f5f5f5; }

tbody tr:nth-child(odd) { background: #fafafa; }

table caption { caption-side: bottom; }

/* 任务二 */
/* (a) border-spacing 只在 separate 模式下生效——collapse 已把相邻边框
       合并成一条，单元格之间没有「缝」可调，属性直接被忽略 */
/* (b) fixed 只读第一行就把列宽定死，后面的行不再参与测宽，长表格渲染更快；
       代价是列宽不再随内容自适应，内容过长会溢出或换行，需要自己规划列宽 */
```

验收点：任务一里若忘了 `table-layout: fixed` 模式下第一行才定列宽，把宽度写在了某个 `td` 上是无效的；把 `caption-side` 写在 `<caption>` 元素自身上也无效——它要写在 `<caption>` 的父级表格上。
