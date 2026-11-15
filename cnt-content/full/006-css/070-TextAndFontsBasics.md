---
order: 80
title: 文本与字体基础
module: 'css'
category: 前端技术
difficulty: beginner
description: font 家族属性、文本对齐与间距控制，是正文排版的第一块基石。
author: fanquanpp
updated: '2026-10-11'
related:
  - 'css/490-TypeScaleAndSpacingTokens'
  - 'css/510-CSSFontLoading'
prerequisites:
  - 'css/020-CSS3OverviewBasicSyntax'
  - 'css/050-CSS3BoxModelDetailed'
---

## 0. 直觉：把文字当成“可以被打扮的内容”

页面里 90% 的内容是文字。CSS 控制文字有两组开关：一组管“字体长什么样”（`font-*`），一组管“文字怎么摆”（`text-*`）。本课把最常用的十几个属性一次讲清，排版进阶（字号阶梯、网格基准线）见 `css/490-TypeScaleAndSpacingTokens`。

## 1. font-family：用哪套字体

```css
body {
  font-family: "PingFang SC", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif;
}
```

**讲解：** 浏览器从左到右找用户电脑里第一个存在的字体；都不存在就用最后的兜底类别（`sans-serif`/`serif`/`monospace`）。多个字体之间用逗号分隔，字体名含空格时加引号。

常用系统字体栈：

```css
/* 中文阅读：无衬线优先 */
font-family: "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif;

/* 代码：等宽优先 */
font-family: "JetBrains Mono", Consolas, "Courier New", monospace;
```

## 2. font-size：字号

```css
html {
  font-size: 16px;   /* 根字号，rem 的参照 */
}
p {
  font-size: 16px;   /* 固定像素 */
}
.note {
  font-size: 0.875rem; /* 相对根字号：16px * 0.875 = 14px */
}
```

**讲解：** `px` 是固定大小；`em` 相对“父元素字号”；`rem` 相对“根元素字号”。入门阶段推荐正文用 `px` 或 `rem`，响应式排版再引入 `clamp()`（见 `css/120-CSSFunctions`）。

## 3. font-weight 与 font-style

```css
.bold {
  font-weight: 700;   /* 或 bold，正常是 400/normal */
}
.lighter {
  font-weight: 300;
}
.italic {
  font-style: italic; /* 斜体 */
}
```

**讲解：** 常见字重是 400（常规）与 700（加粗）。没有安装对应字重时，浏览器会合成加粗或加细，效果可能发虚；重要标题建议加载真实字重（见 `css/510-CSSFontLoading`）。

## 4. line-height：行高

```css
p {
  line-height: 1.6;   /* 无单位倍数，最佳实践 */
}
```

**讲解：** 无单位的 `line-height` 是“当前字号的倍数”，会随字号自动缩放，是正文的标准写法。1.5-1.8 适合中文正文，按钮等紧凑元素常用 1。

## 5. text-align 与 text-decoration

```css
.center {
  text-align: center;   /* left/right/center/justify */
}
a {
  text-decoration: none; /* 去掉下划线 */
}
.strike {
  text-decoration: line-through;
}
```

**讲解：** `text-align` 控制块内文本的水平对齐；`text-decoration` 控制下划线/删除线等装饰，常用于链接去下划线。

## 6. 字距与缩进

```css
.spread {
  letter-spacing: 2px;   /* 字符间距 */
  word-spacing: 4px;     /* 词间距（中文几乎无效） */
}
.indent {
  text-indent: 2em;      /* 首行缩进两个字符 */
}
```

**讲解：** 标题加 `letter-spacing` 能提升精致感，正文慎用；`text-indent: 2em` 是中文段落首行缩进的标准写法。

## 7. 完整示例：一篇文章的正文样式

```html
<style>
  body {
    font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
    font-size: 16px;
    line-height: 1.7;
    color: #333;
  }
  h1 {
    font-size: 28px;
    font-weight: 700;
    letter-spacing: 1px;
  }
  p {
    text-indent: 2em;
    margin-bottom: 12px;
  }
  .price {
    font-size: 20px;
    font-weight: 700;
    color: #d63031;
  }
</style>
<h1>标题</h1>
<p>正文段落，首行缩进两个字符，行高 1.7 更易读。</p>
<p class="price">价格：99 元</p>
```

**讲解：** 这是“文章页最小可用排版”：中文字体栈 + 1.7 行高 + 首行缩进 + 标题层级，已经超过大多数默认页面。

## 8. 动手试试

1. 给页面设置中文字体栈，刷新对比默认字体；
2. 把 `line-height` 从 1 调到 2，观察行距变化，找到最舒适的数值；
3. 用 `letter-spacing` 给标题加间距，对比正文效果；
4. 进阶挑战：用 `rem` 写一套“正文 16px、注释 14px、标题 28px”的字号体系。

## 9. 核心知识点

> 一句话记住文本与字体：`font-family` 定字体，`font-size` 定大小，`line-height` 定行距，`text-*` 管对齐与装饰。

- `font-family` 多字体回退，末尾必须放通用类别；
- `px`/`em`/`rem`：固定、相对父级、相对根元素；
- `font-weight` 用 400/700，`font-style` 用 `italic`；
- `line-height` 用无单位倍数，正文 1.5-1.8；
- `text-align` 管对齐，`text-decoration` 管装饰；
- `letter-spacing` 用于标题，`text-indent: 2em` 用于中文首行缩进。

## 10. 注意事项与改进建议

| 问题点 | 说明 | 改进方案 |
| --- | --- | --- |
| 字体栈末尾忘了通用类别 | 找不到字体时回退不可控 | 末尾写 `sans-serif`/`serif`/`monospace` |
| 行高用固定 px | 字号变化后行距失调 | 用无单位倍数 |
| 正文用 letter-spacing | 中文正文拉大字距反而难读 | 只给标题加字距 |
| 中文字体用 font-weight 加粗 | 合成加粗发虚 | 加载真实字重或使用系统粗体 |
| 首行缩进用空格 | 复制粘贴后排版错乱 | 用 `text-indent: 2em` |

## 11. 扩展学习

- 排版进阶：`css/490-TypeScaleAndSpacingTokens`；
- 字体加载与 @font-face：`css/510-CSSFontLoading`；
- 响应式字号（clamp）：`css/120-CSSFunctions`；
- 盒模型与间距：`css/050-CSS3BoxModelDetailed`。

## 12. 动手实践：遮码自检

先只读任务与提示，遮住第 1-7 节的示例代码自己写，再对照参考实现。

**任务一**：为「文章页」写一份正文排版——中文字体栈（含通用类别兜底）、根字号 16px、正文 0.875rem、无单位行高 1.7、段落首行缩进 2 字符、标题加粗并带一点字距。

**任务二**：回答两问并各给一行代码佐证——（a）为什么 `line-height` 推荐写无单位值而不是 `24px`；（b）字体栈末尾为什么必须放 `sans-serif` 这类通用类别。

**提示**：任务一照着第 7 节「文章页最小可用排版」的骨架默写，注意 `text-indent` 用 `em` 不是 `px`；任务二的两个「为什么」分别在第 4、1 节的讲解里——一个关乎字号变化后的行距，一个关乎找不到字体时的回退。

**参考实现**（先自己写完再看）：

```css
/* 任务一 */
html {
  font-size: 16px;
}

body {
  font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
  line-height: 1.7;
}

p {
  font-size: 0.875rem; /* 16 * 0.875 = 14px，相对根字号 */
  text-indent: 2em;
}

h1 {
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: 1px;
}

/* 任务二 */
/* (a) line-height: 1.7 —— 无单位是「字号的倍数」，字号变大行距自动跟着放大；
       24px 是死值，标题字号 28px 时行高反而比字号小，文字会叠 */
p { line-height: 1.7; }

/* (b) 末尾的通用类别是「保底字体」——前面所有具体字体都不存在时，
       浏览器至少能选一个同风格的系统字体，而不是任由默认值兜底 */
body { font-family: "PingFang SC", "Microsoft YaHei", sans-serif; }
```

验收点：任务一里把根字号从 16px 改成 20px 后，正文与标题应等比放大——这正是 rem 体系的意义；任务二 (a) 如果把 `line-height: 1.7` 换成 `24px` 再把某段字号调到 32px，会看到行间挤在一起，即验证了死值的缺陷。
