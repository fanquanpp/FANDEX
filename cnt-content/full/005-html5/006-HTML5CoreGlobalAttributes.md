---
order: 60
title: id、 class、 style：打通 HTML 到 CSS/JS 的通道
module: 'html5'
category: 前端技术
difficulty: beginner
description: 三个必须背的全局属性速通：id 是身份证号、class 是可复用标签、style 是紧急临时样式，附终极对比表。
author: fanquanpp
updated: '2026-08-30'
related:
  - 'html5/005-HTML5DivSpanContainers'
  - 'html5/007-HTML5OverviewCoreFeature'
  - 'html5/009-HTML5TableAndStructuredContent'
prerequisites:
  - 'html5/005-HTML5DivSpanContainers'
---

## 0. 学习目标（可验证）

- [ ] 能说出 `id`、`class`、`style` 三者的定位（身份证号 / 分类标签 / 临时记号笔）
- [ ] 能说出 `id` 的两个约束（页面唯一、命名规范）和 `class` 的两个特性（可重复、可多值）
- [ ] 能背出终极对比表里"CSS 怎么选、JS 怎么拿"两列
- [ ] 能写出一段带 `id` 和多个 `class` 的 HTML，并用锚点跳转验证 id 的作用

## 1. 一句话理解

> `id` 是身份证号（全页面唯一），`class` 是班级标签（全班共用一个名字），`style` 是临时记号笔（应急可以，正式作品别用）。

HTML 只负责"有什么"，CSS 负责"长什么样"，JavaScript 负责"能做什么"。这三个属性就是三者的接口：没有它们，CSS 找不到要美化的元素，JavaScript 找不到要操作的元素。

## 2. id：身份证号（必须唯一）

```html
<div id="header">页面头部</div>
<div id="main">页面主体</div>
```

规则：

- **全页面唯一**：一个 id 值只能出现一次，重复是错误用法；
- **命名规范**：建议以字母开头，只能包含字母、数字、下划线、连字符，不能有空格。HTML5 规范本身允许数字开头，但 CSS 选择器很难选中以数字开头的 id，所以约定以字母开头；
- **两个用途**：锚点跳转（`<a href="#main">跳到主体</a>`）和 JavaScript 精准抓取（`document.getElementById('main')`）。

## 3. class：班级标签（可以重复）

```html
<p class="notice">第一条通知</p>
<p class="notice">第二条通知</p>
```

规则：

- **可以重复**：多个元素共享同一个 class，CSS 一次写样式，全部生效；
- **可以多值**：一个元素可以挂多个 class，用空格分隔：`class="notice urgent"`——一个管外观，一个管紧急程度，职责分离；
- 命名同样建议字母开头，多个单词用小写加连字符（如 `card-title`）。

```html
<style>
  .notice { color: blue; }
  .urgent { font-weight: bold; }
</style>
<p class="notice urgent">紧急通知</p>
```

上面这段是完整可运行的最小示例：`.notice` 管颜色，`.urgent` 管加粗，互不干扰。

## 4. style：紧急临时样式（仅供测试）

```html
<p style="color: red;">这行是红色的</p>
```

`style` 直接在标签上写 CSS，浏览器立即生效。但它的代价是：样式写死在 HTML 里，改一处要翻遍所有标签，完全没法复用。**正式项目禁用，它只属于两分钟快速测试。** 真正的样式应该写在 CSS 文件里，用 `class` 引用。

## 5. 终极对比表

| 属性 | 能否重复 | CSS 怎么选 | JS 怎么拿 | 一句话定位 |
| --- | --- | --- | --- | --- |
| `id` | 不能（全页唯一） | `#header` | `getElementById('header')` | 身份证号 |
| `class` | 能 | `.notice` | `getElementsByClassName('notice')` | 班级标签 |
| `style` | 不涉及（写在元素上） | 直接生效，无需选择器 | 读 `element.style.color` | 临时记号笔 |

## 6. 动手试试

### 入门版

1. 写三张卡片，全部 `class="card"`，再给第一张加 `class="featured"`，用 `<style>` 分别给 `.card` 和 `.featured` 加不同颜色，观察"共享样式 + 个别加强"的效果；
2. 给页面里某个 `div` 加 `id="about"`，在页面底部放一个 `<a href="#about">回到关于</a>`，点击验证锚点跳转；
3. 故意写两个相同的 id，在 F12 的 Console 里执行 `document.getElementById('xxx')`，观察它只返回第一个元素。

### 进阶版

1. 用 `getElementById` 和 `getElementsByClassName` 分别抓取元素，在 Console 里打印出来，体会 id 精准、class 批量；
2. 把上一步用 `style` 写的样式全部改写成 class，并总结"哪些样式必须抽出来复用"。

## 7. 常见问题与改进建议

| 常见问题 | 原因 | 改进建议 |
| --- | --- | --- |
| 多个元素用了同一个 id | 把 id 当 class 用 | id 全页唯一，批量样式用 class |
| id/class 用数字开头 | 不知道 CSS 选择器难处理 | 以字母开头，如 `card-1` |
| class 值里写空格 | 空格是多值分隔符 | 一个单词一个 class，如 `card featured` |
| style 属性堆满页面 | 图方便，跳过 CSS 文件 | 测试后立刻抽成 class |
| 给 `span` 设宽高没效果 | 行内元素天性如此 | 需要时转 inline-block（CSS 模块） |

## 8. 下一步

到这里，0 基础前置四件套完成：注释与实体、块级与行内、div/span 容器、id/class/style。接下来 `005-HTML5OverviewCoreFeature` 快速上手课里的所有代码，你已经没有陌生概念了。完整的全局属性大表（`title`、`hidden`、`data-*` 等）在 `007-HTML5TableAndStructuredContent` 中作为参考保留。
