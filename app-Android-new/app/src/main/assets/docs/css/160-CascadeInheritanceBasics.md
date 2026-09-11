---
order: 160
title: 继承与层叠机制入门
module: 'css'
category: 前端技术
difficulty: intermediate
description: 哪些属性会继承、inherit/initial/unset/revert 的差别，以及层叠决策的入门模型。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'css/170-PriorityCalculation'
  - 'css/180-CSSPriorityQuickStart'
  - 'css/130-CSS3SelectorSystem'
prerequisites:
  - 'css/020-CSS3OverviewBasicSyntax'
  - 'css/180-CSSPriorityQuickStart'
---

## 0. 直觉：有些样式“传下去”，有些样式“抢着赢”

给 `body` 设置 `color: #333`，整个页面文字都变色——这叫继承。两个选择器同时命中一个元素，只有一个赢——这叫层叠。继承解决“默认值从哪来”，层叠解决“谁说了算”，两者合起来才是 CSS 的决策全貌。

## 1. 哪些属性会继承

```css
body {
  color: #333;          /* 可继承：文字颜色 */
  font-size: 16px;      /* 可继承：字号 */
  font-family: Arial, sans-serif;  /* 可继承：字体 */
  line-height: 1.6;     /* 可继承：行高 */
  text-align: center;   /* 可继承：对齐 */
  margin: 0;            /* 不可继承：外边距 */
  padding: 0;           /* 不可继承：内边距 */
  border: 1px solid red; /* 不可继承：边框 */
  background: #fff;     /* 不可继承：背景 */
}
```

**讲解：** 规律是“跟文字外观相关的属性大多可继承（color/font*/text*/line-height），跟盒子布局相关的属性基本不可继承（margin/padding/border/background/width/height）”。记规律比背清单可靠。

## 2. 继承与初始值

如果某个属性既没被设置、又不可继承，元素使用它的初始值（initial value）：

| 属性 | 初始值 |
| --- | --- |
| `color` | `canvastext`（通常是黑色） |
| `margin`/`padding` | `0` |
| `background-color` | `transparent` |
| `display` | `inline` |
| `width`/`height` | `auto` |

**讲解：** “为什么 div 默认占满一行、span 不占”——因为 `div` 是块级元素，但它的 `width` 初始值是 `auto`，自动填满父容器。初始值不等于 0，很多布局直觉来自这里。

## 3. 四个全局关键字

```css
.reset-color {
  color: initial;   /* 回到初始值（黑色） */
}
.inherit-color {
  color: inherit;   /* 强制继承父级 */
}
.unset-color {
  color: unset;     /* 可继承属性=inherit，不可继承=initial */
}
.revert-color {
  color: revert;    /* 回退到用户代理（浏览器默认）样式 */
}
```

**讲解：** 日常最常用 `inherit`（强制继承）与 `unset`（清除某条声明）；`revert` 常用于“撤销重置样式，恢复浏览器默认”。`initial` 会把可继承属性也变回初始值，容易误用。

## 4. 层叠决策的入门模型

当多个规则命中同一元素时，按以下顺序决策（深入算法见 `css/170-PriorityCalculation`）：

1. 来源与重要性：作者 `!important` > 行内样式 > 普通规则 > 浏览器默认；
2. 选择器权重：ID > 类 > 标签；
3. 书写顺序：权重相同时后写赢。

```css
p {
  color: gray;       /* (0,0,0,1) */
}
.text {
  color: blue;       /* (0,0,1,0) 赢 */
}
```

**讲解：** 层叠是“先比来源，再比权重，最后比顺序”的三级筛选；继承只负责“没有规则命中时”的默认值来源，优先级低于任何作者规则。

## 5. 与 007 的分工

本课是“入门版”：记住哪些属性会继承、四个关键字干什么、层叠三级模型；`css/170-PriorityCalculation` 是“深入版”：四元组精确计算、`:is()`/`:where()` 的权重规则、`@layer` 分层、工程实践。先有本课直觉，再读 007 才不会迷失在规范细节里。

## 6. 动手试试

1. 给 `body` 设置 `color`/`font-size`，观察哪些子元素继承、哪些不继承；
2. 给一个 `a` 标签写 `color: inherit`，对比默认链接颜色；
3. 用 `unset` 清除一个类里设置的颜色，观察它是否“恢复继承”；
4. 进阶挑战：写一个“重置按钮样式”的规则，用 `revert` 恢复浏览器默认按钮外观。

## 7. 核心知识点

> 一句话记住继承与层叠：文字属性往下传、盒子属性不传；没规则时用初始值；有冲突时按“来源 → 权重 → 顺序”决出胜负。

- 可继承：color/font/text 系列；不可继承：盒模型与背景；
- 没有值可用时用初始值，初始值不等于 0；
- `inherit` 强制继承、`initial` 回初始值、`unset` 按属性类型二选一、`revert` 回浏览器默认；
- 层叠三级：来源与重要性 → 权重 → 顺序；
- 继承的优先级低于任何作者规则；
- 深入算法见 009，本课负责日常直觉。

## 8. 注意事项与改进建议

| 问题点 | 说明 | 改进方案 |
| --- | --- | --- |
| 认为所有属性都继承 | 盒子属性其实不继承 | 按“文字 vs 盒子”分类记忆 |
| 用 initial 清样式 | 可继承属性被清回初始值，行为意外 | 想“不设置”用 `unset`，想“跟父级”用 `inherit` |
| 重置样式全用 `* {}` | 破坏可继承属性的自然传播 | 重置方案见 `css/150-CSSResetAndNormalize` |
| 只记权重不记来源 | 浏览器默认/!important 场景判断错 | 先过“来源与重要性”这一级 |

## 9. 扩展学习

- 优先级深入：`css/170-PriorityCalculation`；
- 优先级速查：`css/180-CSSPriorityQuickStart`；
- 重置方案：`css/150-CSSResetAndNormalize`；
- 选择器系统：`css/130-CSS3SelectorSystem`。
