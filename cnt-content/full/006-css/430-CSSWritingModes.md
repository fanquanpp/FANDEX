---
order: 460
title: CSS 书写模式
module: 'css'
category: 前端技术
difficulty: intermediate
description: writing-mode 与逻辑属性配合，让布局适配横排、竖排与从右到左的文字方向。
author: fanquanpp
updated: '2026-11-16'
related:
  - 'css/420-LogicalProperty'
  - 'css/070-TextAndFontsBasics'
  - 'css/130-CSS3SelectorSystem'
prerequisites:
  - 'css/020-CSS3OverviewBasicSyntax'
  - 'css/420-LogicalProperty'
---

## 0. 直觉：文字方向一变，整个布局坐标系都变了

默认网页是“从左到右、从上到下”的横排（`horizontal-tb`）。日文古籍、中文标语常需要竖排（`vertical-rl`），阿拉伯语需要从右到左。`writing-mode` 切换方向后，`margin-left` 这类物理属性不再符合直觉——所以要用逻辑属性。

## 1. writing-mode 的三个取值

```css
.horizontal {
  writing-mode: horizontal-tb;  /* 默认：行水平，块从上到下 */
}
.vertical-rl {
  writing-mode: vertical-rl;    /* 竖排：行垂直，块从右到左 */
}
.vertical-lr {
  writing-mode: vertical-lr;    /* 竖排：行垂直，块从左到右 */
}
```

**讲解：** 名字拆解：`vertical-rl` = 行内方向垂直、块级方向从右到左。中文竖排用 `vertical-rl`，标题与书签常见；`vertical-lr` 多用于表格与东亚以外的竖排场景。

## 2. 竖排后的文字控制

```css
.vertical-text {
  writing-mode: vertical-rl;
  text-orientation: mixed;  /* 默认：中文直立，拉丁字母旋转 90 度 */
}
.upright {
  text-orientation: upright; /* 所有字符直立 */
}
```

**讲解：** 竖排时数字与英文默认旋转，`text-orientation: upright` 可强制直立；`text-combine-upright: all` 还能把“2026”这样的数字竖排时压缩成一个直立数字串。

## 3. 逻辑属性：方向变了布局不乱

```css
.card {
  /* 物理属性：竖排时语义混乱 */
  /* margin-left: 8px; */

  /* 逻辑属性：始终指“行首方向” */
  margin-inline-start: 8px;
  padding-block: 12px;       /* 块方向（上下）内边距 */
  border-inline-end: 2px solid #4f5bd5;  /* 行尾方向边框 */
}
```

**讲解：** 逻辑属性用 `block`（块方向）与 `inline`（行内方向）代替上下左右：`margin-inline-start` 在横排时是左边距，竖排时自动变成上边距。要支持多语言/多方向的项目应优先逻辑属性，完整清单见 `css/420-LogicalProperty`。

## 4. direction 与 dir 属性

```css
.rtl {
  direction: rtl;  /* 从右到左排版（阿拉伯语、希伯来语） */
}
```

```html
<p dir="rtl">عربى</p>
```

**讲解：** `direction` 控制行内方向，但更推荐在 HTML 上用 `dir` 属性声明，因为 `dir` 能同步影响文本语义、选择器与无障碍树。CSS 的 `direction` 只做视觉覆盖。

## 5. 动手试试

1. 给一段中文设置 `writing-mode: vertical-rl`，观察标点与数字的朝向；
2. 在竖排容器里分别用 `margin-left` 与 `margin-inline-start`，对比两者的表现；
3. 用 `text-combine-upright: all` 让竖排中的年份“2026”直立压缩；
4. 进阶挑战：把一套横排卡片布局改成逻辑属性，再切换 `writing-mode` 验证布局仍然正确。

## 6. 核心知识点

> 一句话记住书写模式：writing-mode 切换横竖排，text-orientation 管字符朝向，方向相关的间距边框用逻辑属性才不随方向错乱。

- `horizontal-tb` 默认横排，`vertical-rl`/`vertical-lr` 竖排；
- 中文竖排选 `vertical-rl`；
- `text-orientation: upright` 强制字符直立；
- 逻辑属性 `*-inline-*`/`*-block-*` 随方向自动调整；
- 多语言项目优先 `dir` 属性，而非 CSS `direction`；
- 逻辑属性详解见 `css/420-LogicalProperty`。

## 7. 注意事项与改进建议

| 问题点 | 说明 | 改进方案 |
| --- | --- | --- |
| 竖排容器用物理 margin | 方向切换后间距错乱 | 统一改用逻辑属性 |
| 数字/英文竖排旋转 | 阅读体验差 | `text-orientation: upright` |
| 用 CSS direction 控制语义 | 无障碍树与选择器不同步 | HTML 用 `dir` 声明 |
| 竖排与 flex 混用 | 主轴方向理解混乱 | 先确认 `writing-mode` 再定主轴 |

## 8. 扩展学习

- 逻辑属性全集：`css/420-LogicalProperty`；
- 文本与字体：`css/070-TextAndFontsBasics`；
- 国际化与可访问性样式：`css/500-AccessibleStyling`；
- 排版进阶：`css/490-TypeScaleAndSpacingTokens`。

## 9. 动手实践：遮码自检

先只读任务与提示，遮住第 1-4 节的示例代码自己写，再对照参考实现。

**任务一**：实现「中式竖排书签」——一段唐诗竖排显示（行从右往左推进），年份「2026」要求直立压缩成一个数字串，拉丁字母不旋转。

**任务二**：口算轴翻转——`writing-mode: vertical-rl` 容器里，`margin-block-start` 与 `padding-inline-start` 各对应哪个物理方向？把两者各写一行并注明映射结果。

**提示**：任务一的三个开关分别是 `writing-mode`、`text-combine-upright: all`、`text-orientation: upright`（第 1-2 节）；任务二靠「名字拆解法」——vertical-rl 是行内方向垂直、块级方向从右到左，block 轴变成水平、inline 轴变成竖直（第 1 节讲解）。

**参考实现**（先自己写完再看）：

```css
/* 任务一 */
.scroll {
  writing-mode: vertical-rl;      /* 竖排：行垂直，新行从右往左推进 */
  text-orientation: mixed;         /* 中文直立、拉丁字母旋转（默认值） */
}

.scroll .year {
  text-combine-upright: all;       /* 2026 压缩成一个直立数字串 */
}

/* 若要求拉丁字母也直立 */
.scroll .latin {
  text-orientation: upright;
}

/* 任务二 */
/* vertical-rl 下：
   margin-block-start = margin-right（块级方向从右往左，起点在右）
   padding-inline-start = padding-top（行内方向自上而下，起点在上） */
.v-card {
  margin-block-start: 16px;   /* 物理右侧留白 */
  padding-inline-start: 8px;  /* 物理顶部留白 */
}
```

验收点：任务二在 DevTools 的 Computed 面板里能看到 `margin-block-start` 展开为 `margin-right`——轴映射以计算值为准，不要凭横排直觉猜；任务一里若漏了 `text-combine-upright`，年份会四个数字各占一格，竖排节奏全乱。
