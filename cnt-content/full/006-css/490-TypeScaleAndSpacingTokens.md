---
order: 530
title: 排版与网格系统
module: 'css'
category: 前端技术
difficulty: intermediate
description: '用字号阶梯、行高、8pt 间距与 CSS 变量搭一套可复用的排版网格，让页面看起来专业而不是"随手排的"。'
author: fanquanpp
updated: '2026-10-07'
related:
  - 'css/410-CSSVariableCustomAttribute'
  - 'css/370-ResponsiveDesign'
prerequisites:
  - 'css/020-CSS3OverviewBasicSyntax'
---


## 一句话理解

排版系统 = 一套**有规律的数值**：字号阶梯（type scale）、行高、间距与网格。
它让不同页面看起来同属一个产品，而不是每个页面各自"发挥"。

## 为什么需要

- 随手选的字号与间距，在滚动阅读时会显得杂乱。
- 设计令牌（CSS 变量）让全局改字号、改间距只需改一处。
- 响应式页面里，字号阶梯配合 `clamp()` 能平滑过渡。

## 核心概念

**1. 字号阶梯（Type Scale）**

以正文为基准，按固定比例放大/缩小：

```css
:root {
  --text-xs: 0.75rem;   /* 12px */
  --text-sm: 0.875rem;  /* 14px */
  --text-base: 1rem;    /* 16px 基准 */
  --text-lg: 1.25rem;   /* 20px */
  --text-xl: 1.5rem;    /* 24px */
  --text-2xl: 2rem;     /* 32px */
}
```

**2. 行高与垂直节奏**

行高也走同一套数字，让相邻文本块的间距看起来稳定：

```css
:root {
  --leading-tight: 1.25;
  --leading-normal: 1.6;
  --leading-loose: 1.8;
  --space-1: 4px;
  --space-2: 8px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
}
```

**3. 8pt 间距体系**

间距只取 4 或 8 的倍数（`4/8/16/24/32/48`），
元素之间的缝隙在视觉上有明确的层级，不会出现"3px 还是 5px"的选择困难。

## 落地示例

```css
/* 响应式字号：随视口平滑变化，且不超出上下限 */
.page-title {
  font-size: clamp(1.5rem, 1.2rem + 1.6vw, 2.5rem);
  line-height: var(--leading-tight);
}

.page-body {
  font-size: var(--text-base);
  line-height: var(--leading-normal);
  /* 段落间距与 8pt 体系对齐 */
  margin-block: var(--space-4);
}

.card {
  padding: var(--space-4);
  gap: var(--space-2);
}
```

## 文本装饰与对齐

排版系统除了字号与行高，还包含文本的对齐与装饰属性：

```css
.quote {
  text-align: center;        /* left/center/right/justify */
  text-transform: uppercase; /* 大小写转换 */
  text-decoration: underline;
  letter-spacing: 0.05em;    /* 字间距 */
  word-spacing: 0.1em;       /* 词间距 */
  text-indent: 2em;          /* 首行缩进 */
}
```

**讲解：**

- `text-align` 控制行内内容对齐；`justify` 两端对齐需注意中文断行；
- `text-decoration` 可组合 `underline`/`line-through`/`overline`，`text-decoration-color` 单独调色；
- `text-transform` 只改变显示（`uppercase`/`lowercase`/`capitalize`），不改变源码文本；
- `letter-spacing`/`word-spacing` 微调字距与词距，标题常用小幅字距；
- 垂直方向用 `vertical-align` 控制行内元素基线对齐（`middle`/`baseline`/`super` 等）。

**中文排版补充：**

- 中文正文推荐 `text-align: justify` 两端对齐；需要精细控制断词策略时用 `text-justify`（标准值为 `auto`/`inter-word`/`inter-character`，`inter-ideograph` 是 IE 时代旧值，不要再用）；
- 中文标点（逗号、句号）不应出现在行首，浏览器自动处理；需要更精细控制时设置 `hanging-punctuation`（支持有限）；
- 中文正文字号建议 ≥ 16px，行高 1.6-1.8，比英文略宽；
- 全角与半角：中文内容用全角标点，代码与英文单词保持半角。

## 常见误区

| 误区 | 真相 |
| --- | --- |
| 标题越大越好 | 字号阶梯保证层级关系，标题与正文的比例比绝对大小更重要 |
| 行高越宽松越好 | 正文 1.5-1.7 合适，标题用紧凑行高，避免留白失衡 |
| 间距随手填 | 间距来自同一数值体系，视觉才统一 |
| 只用 px 固定字号 | 用 rem 基准 + clamp() 兼顾可访问性与响应式 |
| 文本装饰乱用 | 下划线只用于链接 | 正文装饰用 color/weight 表达，统一进令牌 |

## 小结

排版系统的本质是"约束"：字号、行高、间距都从有限的数值集合里取值。
先用 CSS 变量把阶梯定义出来，再让所有组件消费变量，页面自然会整齐。
下一步可结合 `css/410-CSSVariableCustomAttribute` 做主题化扩展。

## 动手试试

1. 用变量定义字号阶梯与间距体系，改造一个页面；
2. 用 `clamp()` 做响应式标题字号；
3. 用 8pt 网格统一组件间距；
4. 进阶挑战：给项目写一份排版规范文档。

## 核心知识点

> 一句话记住排版系统：字号阶梯 + 行高 + 间距体系 + 网格对齐，全部走设计令牌；约束即秩序。

- 字号阶梯：基准 1rem 等比放大；
- 行高：正文 1.5-1.7、标题紧凑；
- 间距体系：8pt 倍数（--space-1..8）；
- 网格：列宽、沟槽、外边距统一；
- `clamp()` 响应式字号；
- 文本对齐与装饰统一规范。

## 注意事项与改进建议

| 问题点 | 说明 | 改进方案 |
| --- | --- | --- |
| 字号随手填 | 页面杂乱 | 只用阶梯变量 |
| 行高失衡 | 阅读困难 | 正文 1.5+ |
| 间距魔法值 | 无法统一 | 间距变量 |
| 忽略中文排版 | 标点悬挂异常 | 参考中文排版规范 |

## 扩展学习

- 字体加载：`css/510-CSSFontLoading`；
- 文本与字体基础：`css/070-TextAndFontsBasics`；
- 设计令牌：`css/410-CSSVariableCustomAttribute`。

## 动手实践：遮码自检

先只读任务与提示，遮住「核心概念」「落地示例」两节的示例代码自己写，再对照参考实现。

**任务一**：从零搭一套排版令牌——字号阶梯六级（xs 到 2xl，基准 1rem 按比例放大）、三个行高档、8pt 间距体系五档；再写一个「大标题」规则：clamp 流式字号 + 紧凑行高 + 间距令牌。

**任务二**：判断并修复——页面里出现了 `margin: 13px`、`padding: 22px`、`font-size: 17px` 三个「随手值」，按 8pt 体系给出各自的归档值，并说明归档为什么比「精确还原设计稿」更值得。

**提示**：任务一的阶梯比例常用 1.2 到 1.333（ minor third 到 perfect fourth），间距只取 4/8 的倍数（核心概念第 3 点）；任务二对照「常见误区」表的「间距随手填」一行——就近归档到体系内的值，误差让位于一致性。

**参考实现**（先自己写完再看）：

```css
/* 任务一 */
:root {
  --text-xs: 0.75rem;   /* 12px */
  --text-sm: 0.875rem;  /* 14px */
  --text-base: 1rem;    /* 16px */
  --text-lg: 1.25rem;   /* 20px */
  --text-xl: 1.5rem;    /* 24px */
  --text-2xl: 2rem;     /* 32px */

  --leading-tight: 1.25;
  --leading-normal: 1.6;
  --leading-loose: 1.8;

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
}

.page-title {
  font-size: clamp(1.5rem, 1.2rem + 1.6vw, 2.5rem); /* 流式但不越阶 */
  line-height: var(--leading-tight);
  margin-block-end: var(--space-6);
}

/* 任务二 */
/* margin: 13px → var(--space-3)（12px，4 的三倍）或 --space-2（8px），就近归档 */
/* padding: 22px → var(--space-6)（24px，8 的三倍） */
/* font-size: 17px → var(--text-base)（16px），阶梯外不放值 */
/* 归档的理由：17px 与 16px 视觉无差，但「体系外」的值会繁殖——
   下一个人看到 17px 就敢写 18px，阶梯约束因此瓦解 */
```

验收点：任务一里把 clamp 的中间项斜率写成 0 会让标题在所有视口下固定为最大值——首选值必须随 vw 变化；任务二里给 17px 单独加一个 `--text-md: 1.0625rem` 是「用令牌的形式破坏令牌」，正确的动作是归档到最近的阶梯值。
