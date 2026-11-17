---
order: 110
title: CSS 简写属性
module: 'css'
category: 前端技术
difficulty: intermediate
description: margin/padding/border/background/font 等简写属性的 1-4 值规则与“重置未写属性”陷阱。
author: fanquanpp
updated: '2026-11-16'
related:
  - 'css/050-CSS3BoxModelDetailed'
  - 'css/290-BackgroundEnhancement'
  - 'css/070-TextAndFontsBasics'
prerequisites:
  - 'css/020-CSS3OverviewBasicSyntax'
  - 'css/050-CSS3BoxModelDetailed'
---

## 0. 直觉：一个属性写四个方向，省代码也藏陷阱

`margin: 10px 20px` 比 `margin-top/right/bottom/left` 四行短得多，这就是简写属性（shorthand）。它把多个子属性合并成一条声明，但代价是：**没写的子属性会被重置为初始值**。理解这条代价，是工程上避免“样式莫名消失”的关键。

## 1. margin/padding 的 1-4 值规则

```css
/* 1 个值：四边相同 */
margin: 10px;

/* 2 个值：上下 | 左右 */
margin: 10px 20px;

/* 3 个值：上 | 左右 | 下 */
margin: 10px 20px 30px;

/* 4 个值：上 | 右 | 下 | 左（顺时针） */
margin: 10px 20px 30px 40px;
```

**讲解：** 记忆口诀“上右下左，顺时针”。`padding` 规则完全相同。`border-width`/`border-style`/`border-radius` 等方向类简写也遵循同一套规则。

## 2. border 简写

```css
.card {
  border: 1px solid #ddd;   /* width style color，顺序任意 */
  border-radius: 8px;
}
```

**讲解：** `border` 一行同时设置宽度、样式、颜色；只写 `border: 1px` 不合法，因为 `border-style` 默认为 `none`（不显示）。`border-radius` 有自己的 1-4 值规则（水平/垂直、四角）。

## 3. background 完整简写

```css
.banner {
  background: #f5f5f5 url("bg.png") no-repeat center / cover;
}
```

**讲解：** `background` 可合并颜色、图片、重复方式、位置、尺寸、附加方式等。注意两点：未写子属性会重置（例如只写 `background: url(...)` 会把颜色清掉）；`background-size` 用 `/` 与位置分隔。多背景分别写时，拆成 `background-image`/`background-color` 更安全。完整体系见 `css/290-BackgroundEnhancement`。

## 4. font 简写

```css
.article {
  font: italic 700 16px/1.7 "PingFang SC", sans-serif;
}
```

**讲解：** `font` 的格式是 `style weight size/line-height family`，其中 `size` 与 `family` 必填，其余可省。**只要写了 `font`，未写部分（如 `font-weight`）就会重置**，因此很少用于整段覆盖，常用于集中设置一组排版属性。

## 5. 其他常用简写

```css
.item {
  /* 动画 */
  animation: spin 2s linear infinite;
  /* 过渡 */
  transition: transform 0.3s ease;
  /* 列表 */
  list-style: none;
  /* 外框 */
  outline: 2px solid #4f5bd5;
  /* 文本装饰 */
  text-decoration: underline wavy red;
}
```

**讲解：** 规则一致：简写覆盖一组相关属性，未写的子属性回到初始值。动画/过渡/列表/外框的细节分别见 `css/330-CSSAnimationTransition`、`css/080-CSSListStyle` 对应文档。

## 6. 简写会重置未指定属性

这是简写最重要的一条陷阱：

```css
.btn {
  background-color: #d63031;
  transition: transform 0.2s ease;
}
.btn:hover {
  background: #e17055;   /* 注意：background 简写把颜色覆盖为 #e17055 是期望，但若写成 background: none，颜色也会被重置 */
}
```

```css
/* 反面案例：只想改背景图，却用简写 */
.card {
  background: #fff;
}
.card.featured {
  background: url("badge.png") no-repeat;  /* #fff 被重置为透明 */
}
```

**讲解：** 修复方式是“用子属性覆盖子属性”：`background-image: url(...)` 只改图片，保留颜色。凡是“只想改其中一项”的场景，都优先写子属性。

## 7. 动手试试

1. 用 1-4 值分别设置 `padding`，在 DevTools 盒模型图确认四边值；
2. 写 `background: url(...)` 覆盖原本有背景色的元素，观察颜色消失，再用 `background-color` 修复；
3. 用 `font` 简写集中设置一段文章排版，再单独改 `font-weight`，观察是否被重置；
4. 进阶挑战：整理一份自己项目里“应拆成子属性”的简写清单。

## 8. 核心知识点

> 一句话记住简写属性：简写省代码，但未写的子属性会被重置；只改一项就用子属性。

- `margin`/`padding` 的 1-4 值按“上右下左”顺时针；
- `border` 合并宽度、样式、颜色，缺样式不显示；
- `background` 可合并全部背景子属性，`size` 用 `/` 分隔；
- `font` 合并 style/weight/size/line-height/family，size 与 family 必填；
- 简写会重置未指定子属性，覆盖场景优先用子属性；
- 同一定义多次简写时，后写会清掉前面简写覆盖的子属性。

## 9. 注意事项与改进建议

| 问题点 | 说明 | 改进方案 |
| --- | --- | --- |
| 简写覆盖整段背景 | 颜色/图片被意外重置 | 单属性覆盖单属性 |
| `font` 简写后单独改字重无效 | 顺序问题或再次被重置 | 把 `font` 放最前，子属性放后面 |
| 记混 3 值与 4 值方向 | 布局间距出错 | 写注释标明方向，或拆成子属性 |
| 多背景用简写 | 可读性差、易错 | 多背景拆开写 `background-image` |

## 10. 扩展学习

- 盒模型与方向属性：`css/050-CSS3BoxModelDetailed`；
- 背景完整体系：`css/290-BackgroundEnhancement`；
- 文本与字体：`css/070-TextAndFontsBasics`；
- 动画与过渡简写：`css/330-CSSAnimationTransition`。

## 11. 动手实践：遮码自检

先只读任务与提示，遮住第 1-6 节的示例代码自己写，再对照参考实现。

**任务一**：只用 `padding` 的简写各写一行，实现四种方向组合——四边 10px、上下 10px 左右 20px、上 10px 左右 20px 下 30px、上 10px 右 20px 下 30px 左 40px。

**任务二**：修一份「背景丢失」的样式——`.card` 本来有白色底和一张角标图，同事为了加圆角把声明改成了 `background: url("badge.png") no-repeat;`，白底消失了。要求修复并说明根因，再用 `font` 简写复现一次同类问题（改 `font-size` 结果字重变了）。

**提示**：任务一背口诀「上右下左，顺时针」，3 值的中间一档是「左右」；任务二的根因在第 6 节——简写会重置未写的子属性，修法是「子属性覆盖子属性」，`font` 的同类问题同理。

**参考实现**（先自己写完再看）：

```css
/* 任务一 */
.a { padding: 10px; }
.b { padding: 10px 20px; }
.c { padding: 10px 20px 30px; } /* 上 | 左右 | 下 */
.d { padding: 10px 20px 30px 40px; } /* 上右下左 */

/* 任务二 */
.card {
  background-color: #fff;            /* 白底：子属性保住 */
  background-image: url("badge.png"); /* 只改图片，颜色不受牵连 */
  background-repeat: no-repeat;
  border-radius: 8px;
}

.article {
  font: 16px/1.7 "PingFang SC", sans-serif; /* 先简写：此时 font-weight 被重置为 normal */
  font-weight: 700;                          /* 再用子属性补回想要的重置项 */
}
```

验收点：任务二若在 `.article` 里把 `font-weight: 700` 写在 `font` 简写之前，字重会被简写重置回 normal——「简写在前、子属性在后」是这条规则的固定动作。
