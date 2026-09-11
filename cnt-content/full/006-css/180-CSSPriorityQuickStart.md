---
order: 180
title: 样式优先级语法速查手册
module: 'css'
category: 前端技术
difficulty: beginner
description: 用一句话和三条规则快速掌握 CSS 覆盖规则，是深入学习优先级前的入门速查。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'css/130-CSS3SelectorSystem'
  - 'css/170-PriorityCalculation'
  - 'css/040-StyleSheetImportMethod'
prerequisites:
  - 'css/020-CSS3OverviewBasicSyntax'
---

## 0. 一句话记住优先级

**选择器越“具体”，优先级越高；一样具体时，后写的赢。**

`#main` 比 `.card` 具体，`.card` 比 `div` 具体。写 CSS 时 90% 的“样式不生效”，都能用这一句话解释。

## 1. 初学者必记的 3 条规则

1. **后写的覆盖先写的**：两条规则命中同一个元素、权重相同，后面的生效；
2. **ID 大于类，类大于标签**：`#id` > `.class` > `div`，数量多的一方胜出；
3. **`!important` 与行内样式是“最后手段”**：它们能赢过普通规则，但会破坏可预测性，能不用就不用。

```css
/* 规则 1：两条类选择器，后写生效 */
p {
  color: black;
}
p {
  color: blue; /* 生效 */
}

/* 规则 2：类选择器胜过标签选择器 */
p {
  color: black;
}
.text {
  color: red; /* 生效，类比标签具体 */
}
```

**讲解：** 第三条里的“行内样式”指写在 HTML `style` 属性里的样式，它不经过选择器，因此优先级高于任何普通选择器规则。

## 2. 常见场景速查表

| 场景 | 谁生效 | 原因 |
| --- | --- | --- |
| 两个相同的 `p {}` | 后写的 | 权重相同，按顺序 |
| `div` 与 `.box` 同时命中 | `.box` | 类 > 标签 |
| `.box` 与 `#main` 同时命中 | `#main` | ID > 类 |
| 十个类 vs 一个 ID | 一个 ID | ID 权重高于任意数量的类 |
| 行内样式 vs `.box` | 行内样式 | 行内样式权重最高（除 !important） |
| 带 `!important` 的 `.box` | `!important` | 反转优先级 |
| 浏览器默认样式 vs 你的规则 | 你的规则 | 作者样式 > 浏览器默认样式 |

## 3. 权重速查：四元组入门版

完整计算规则在 `css/170-PriorityCalculation`，入门阶段只需要知道三档：

| 选择器示例 | 档位 |
| --- | --- |
| `*`、`div`、`p` | 元素级（最低） |
| `.box`、`:hover`、`[type]` | 类级 |
| `#header` | ID 级（最高） |

组合选择器按“每一部分相加”：`.nav .item p` 就是“两个类 + 一个标签”，能赢过“一个类 + 一个标签”的 `.item p`。

## 4. 与 007 的分工

本课是“速查”，告诉你常见场景谁赢；`css/170-PriorityCalculation` 是“深入版”，讲四元组精确计算、`:where()`/`:is()`/`@layer` 等现代工具对优先级的改造。遇到“明明后写却不生效”“第三方库覆盖不掉”这类问题，再去读 007。

## 5. 动手试试

1. 写 `h1 { color: red; }` 和 `h1 { color: blue; }`，观察后写生效；
2. 给同一个元素加 `class="title"` 和 `id="main"`，写 `.title` 与 `#main` 两条规则，验证 ID 胜出；
3. 在 HTML 里写 `style="color: green"`，验证行内样式胜出；
4. 进阶挑战：给 `.title` 加 `!important`，看它能否赢过行内样式与 ID。

## 6. 核心知识点

> 一句话记住优先级速查：具体程度决定胜负，同样具体后写赢；ID 大于类、类大于标签，`!important` 与行内样式是例外。

- 优先级四字口诀：具体、顺序、例外；
- 相同权重看书写顺序，后写覆盖先写；
- `#id` > `.class` > `标签`，组合选择器按部分累加；
- 行内样式 > 所有普通规则；`!important` > 行内样式；
- 浏览器默认样式优先级最低，你的样式总能覆盖它；
- 遇到疑难再去读 007，本课速查足以处理日常 90% 场景。

## 7. 注意事项与改进建议

| 问题点 | 说明 | 改进方案 |
| --- | --- | --- |
| 用 `!important` 救火 | 会压过其它所有规则，越救越乱 | 先查权重与书写顺序，最后才用 |
| 用 ID 写组件样式 | 权重太高，后续难以覆盖 | 组件样式用类选择器 |
| 疯狂嵌套选择器 | 权重被抬升，改起来困难 | 保持选择器“短而平” |
| 后写不生效就以为缓存问题 | 多数是权重问题 | 用 DevTools Computed 面板看谁赢了 |

## 8. 扩展学习

- 选择器系统：`css/130-CSS3SelectorSystem`；
- 优先级深入版：`css/170-PriorityCalculation`；
- 样式表引入方式：`css/040-StyleSheetImportMethod`；
- 层叠层 @layer：`css/450-CascadeLayer`。
