---
order: 480
title: CSS 原生嵌套
module: 'css'
category: 前端技术
difficulty: intermediate
description: CSS 原生嵌套语法与 & 规则详解：隐式后代嵌套、& 复合选择器、伪类伪元素、后置反转上下文、嵌套 @media，以及权重计算等关键细节。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'css/720-CSSNestingInPractice'
  - 'css/570-Sass'
  - 'css/450-CascadeLayer'
  - 'css/130-CSS3SelectorSystem'
  - 'css/170-PriorityCalculation'
prerequisites:
  - 'css/020-CSS3OverviewBasicSyntax'
  - 'css/130-CSS3SelectorSystem'
---

## 1. 学习目标与前置知识

读完整篇你应该能：

- 用原生嵌套把一段“重复父选择器”的传统 CSS 改写成嵌套形式，并知道它展开了哪些规则；
- 正确使用 `&` 处理 hover、伪元素、复合选择器与“反转上下文”四类场景；
- 说出嵌套在权重（specificity）计算上的一个关键细节，避免“写了嵌套样式突然盖不住”的坑。

前置知识：基本选择器（类、标签、后代选择器）与优先级概念（`css/130-CSS3SelectorSystem`、`css/170-PriorityCalculation`）。本文只讲语法与 `&` 规则本身；工程化迁移、与 Sass 的取舍见 `css/720-CSSNestingInPractice`。

## 2. 痛点：父选择器被反复手写

传统 CSS 里，一个组件的所有状态都要重复写父选择器：

```css
/* 传统写法：.card 重复了 4 次，改类名要改 4 处 */
.card {
  padding: 1rem;
}
.card .title {
  font-size: 1.5rem;
}
.card:hover {
  box-shadow: 0 4px 12px rgb(0 0 0 / 10%);
}
@media (min-width: 768px) {
  .card {
    padding: 2rem;
  }
}
```

样式多起来之后，“同一个组件的规则散落在文件各处”是维护时的主要噪音。CSS 原生嵌套（CSS Nesting）允许把子规则写进父规则内部，浏览器直接解析，无需任何预处理器：

```css
/* 原生嵌套：组件样式收拢在一处 */
.card {
  padding: 1rem;

  .title {
    font-size: 1.5rem; /* 等价于 .card .title */
  }

  &:hover {
    box-shadow: 0 4px 12px rgb(0 0 0 / 10%); /* 等价于 .card:hover */
  }

  @media (min-width: 768px) {
    padding: 2rem; /* 等价于 @media (min-width: 768px) { .card { padding: 2rem } } */
  }
}
```

一个帮助记忆的心智模型：**嵌套规则块就是“带上下文的样式作用域”**——里面写的每条规则都自动携带父级上下文，就像 Sass 的嵌套，但这是浏览器原生语法，写完即生效。

## 3. 两条基本嵌套规则

### 3.1 不带 & ：隐式后代嵌套

嵌套选择器不带 `&` 时，浏览器自动在前面加“父选择器 + 后代组合器”（即隐式 `& ` 前缀）：

```css
.card {
  .title {
    font-weight: bold;
  }
  /* 等价于：.card .title（后代关系） */

  > .body {
    padding: 15px;
  }
  /* 以组合器开头时等价于：.card > .body（& 被隐式前置） */
}
```

### 3.2 带 & ：显式引用父选择器

`&` 是嵌套选择器（nesting selector），代表“父规则的选择器匹配到的元素”。需要把父选择器当作**复合选择器的一部分**（无空格拼接）时必须显式写：

```css
.button {
  background: blue;

  &:hover {
    background: darkblue;
  }
  /* 等价于 .button:hover —— 无空格，同一元素 */

  &.primary {
    background: green;
  }
  /* 等价于 .button.primary —— 同一元素且带 primary 类 */

  &[disabled] {
    opacity: 0.5;
  }
  /* 等价于 .button[disabled] */

  & > span {
    font-weight: bold;
  }
  /* 等价于 .button > span —— 显式写法，与隐式等价 */
}
```

辨析一句话：**有空格是“后代”，无空格是“同一个元素自己”**。`& :hover`（带空格）表示 `.card` 的任意后代被 hover，几乎总不是你想要的；`&:hover`（无空格）才是“card 自己被 hover”。

## 4. & 的四类高频用法

### 4.1 伪类与伪元素

```css
.link {
  color: blue;

  &:hover {
    color: darkblue;
  }
  &:focus-visible {
    outline: 2px solid blue;
  }
  &::before {
    content: "→";
    margin-right: 4px;
  }
}
```

### 4.2 & 后置：反转上下文

`&` 不必须写在开头。放在后面可以表达“**父元素处于某个环境时**”——这是手写传统 CSS 时最容易写错方向的场景：

```css
.card {
  padding: 1rem;

  .dark-theme & {
    background: #333; /* 等价于 .dark-theme .card */
  }
  /* 读法：在 .dark-theme 里的这张 card */

  :has(img) & {
    border-radius: 0; /* 等价于 :has(img) .card */
  }
}
```

### 4.3 同一规则内多次使用 &

`&` 可以在一个嵌套选择器里出现多次，常用于兄弟关系：

```css
.button {
  & + & {
    margin-left: 8px;
  }
  /* 等价于 .button + .button：相邻的按钮之间加间距 */

  & ~ & {
    opacity: 0.9;
  }
  /* 等价于 .button ~ .button */
}
```

### 4.4 嵌套 @media / @supports / @container

条件类 @规则可以直接嵌在组件规则里，让“断点样式跟着组件走”：

```css
.container {
  width: 100%;

  @media (min-width: 768px) {
    width: 750px;
  }
  @supports (backdrop-filter: blur(10px)) {
    backdrop-filter: blur(10px);
  }
  @container (min-width: 400px) {
    flex-direction: row;
  }
}
```

展开规则：嵌套的 @media 展开 = “原条件 AND 外层上下文”，即上面等价于 `@media (min-width: 768px) { .container { width: 750px } }`。

## 5. 关键细节一：标签选择器嵌套建议带 &

当前各引擎对“裸标签选择器嵌套”均已支持（所谓 relaxed nesting，2023 年底起陆续落地）：

```css
.card {
  /* 现代浏览器：两种写法都合法 */
  h2 {
    color: red;
  } /* 等价 .card h2 */

  & h2 {
    color: red;
  } /* 同上，显式写法 */
}
```

但在“放宽嵌套”之前的早期实现里，`h2 { }` 这种以标签开头的嵌套会被整条忽略。**为了兼容尚未升级的旧版浏览器，标签选择器嵌套统一写成 `& h2` 最稳妥**；类、id、属性选择器开头的嵌套则从始至终都没有兼容问题。

## 6. 关键细节二：& 参与权重计算，行为类似 :is()

这是嵌套最容易被忽视的一点。嵌套选择器展开时，`&` 的行为是把父选择器包进 `:is()`，而 **`:is()` 的权重取其参数中最高的那个，并应用到所有经它匹配的元素**：

```css
/* 基础写法 */
#sidebar {
  .item {
    a {
      color: gray;
    }
  }
}
/* 展开为 :is(#sidebar) .item a，权重 (1,1,1)，与手写 #sidebar .item a 相同 */
```

正常情况下嵌套不改变权重。但父选择器是一个**列表**时，坑就出现了：

```css
/* 侧栏和页脚共用一段嵌套样式 */
#sidebar, .footer {
  .item {
    color: gray;
  }
}
/* 实际展开为 :is(#sidebar, .footer) .item */
/* :is() 的权重取参数最高者 (1,0,0)（那个 id），
   于是通过 .footer 匹配到的 .item 权重也是 (1,1,1)，
   而不是你直觉里的 .footer .item = (0,1,1) */

/* 后果：想覆盖页脚里的 item 时，下面的规则赢不了—— */
.footer .item {
  color: red; /* 权重 (0,1,1)，低于 (1,1,1)，覆盖失败 */
}
```

排查方法：在 DevTools 的 Styles 面板里直接看最终选择器与被划掉的声明；发现权重异常时，优先检查是不是把 id 或高权重选择器混进了嵌套父级列表。

结论：**嵌套本身不抬高权重，但“父级含选择器列表”时会按 `:is()` 取最大值**。组件样式的父级尽量保持单一选择器，通用覆写交给 `@layer`（`css/450-CascadeLayer`）。

## 7. 关键细节三：& 不能做字符串拼接

从 Sass 过来的同学最容易踩这个坑。原生 CSS 的 `&` 是一个**真选择器**，不是字符串占位符，后面不能直接“长出”新词：

```css
/* 错误写法（无效，整条嵌套规则被丢弃） */
.card {
  &__title {
    color: red;
  } /* &__title 不是合法选择器：--title 不能作为类型/类名拼接 */

  &--active {
    color: blue;
  } /* 同样无效 */
}

/* 正确写法：完整类名 + 显式关系 */
.card {
  .card__title {
    color: red;
  }

  &.card--active {
    color: blue;
  } /* &.card--active 是合法复合选择器（& + 类选择器） */
}
```

原因：复合选择器的每一片段必须是合法的简单选择器（类 `.x`、id `#x`、伪类、属性选择器等），`&__title` 中的 `__title` 只是一个裸标识符，什么都不是。BEM 命名在原生嵌套里要写全类名，或配合 `css/720-CSSNestingInPractice` 中介绍的工程化方案。

## 8. 完整示例：手风琴组件

一段可直接运行的 HTML + CSS，覆盖本文全部语法点：

```html
<details class="accordion">
  <summary class="accordion__head">什么是原生嵌套？</summary>
  <div class="accordion__body">
    <p>无需预处理器，浏览器直接解析的嵌套语法。</p>
  </div>
</details>
```

```css
.accordion {
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;

  /* 子元素：类选择器嵌套，无兼容负担 */
  .accordion__head {
    padding: 12px 16px;
    cursor: pointer;

    &:hover {
      background: #f5f5f5;
    } /* .accordion .accordion__head:hover */

    &::marker {
      content: "+ ";
    } /* 展开指示符 */
  }

  .accordion__body {
    padding: 0 16px 12px;
    color: #555;

    p {
      margin: 0;
    } /* 标签嵌套用隐式后代（现代引擎均支持） */
  }

  /* 上下文反转：展开状态作用于整块 */
  &[open] {
    border-color: #99f;

    .accordion__head {
      background: #eef;
    }
  }

  /* 媒体查询内嵌 */
  @media (max-width: 480px) {
    border-radius: 0;
  }
}
```

## 9. 常见陷阱速查

| 陷阱 | 症状 | 原因与解法 |
| --- | --- | --- |
| `& :hover` 多写了空格 | 后代整体 hover 异常 | 空格变后代组合器；同元素状态用 `&:hover` |
| `&__title` 字符串拼接 | 规则整条失效 | `&` 是真选择器；写全类名 `.card__title` |
| 嵌套选择器并列多支 | 覆盖失效，权重莫名变高 | `&` 类似 `:is()`，权重取最高分支；拆开写或用 `@layer` |
| 嵌套过深（4 层+） | 选择器冗长、难覆盖 | 控制在 2-3 层，深了改用平铺类名 |
| 旧浏览器丢裸标签嵌套 | 部分规则不生效 | 标签选择器统一 `& h2` 前缀写法 |
| 声明与规则乱序 | 阅读困难 | 约定声明在前、嵌套规则在后 |

## 动手试试

1. 把一段重复父选择器的传统 CSS 重写为嵌套，再用 DevTools 检查展开后的选择器是否一致；
2. 分别写 `&:hover` 与 `& :hover`，观察两者的实际匹配差异；
3. 写一个 `.dark-theme &` 反转上下文规则，验证展开结果；
4. 刻意写一次 `&__title`，在 DevTools 里看它如何被丢弃；
5. 进阶挑战：用 `& + &` 实现按钮组的相邻间距，并嵌套一段 `@media`。

## 核心知识点

> 一句话记住原生嵌套语法：不带 & 是后代嵌套，`&` 引用父选择器；`&:hover` 定自身状态，`.dark &` 反转上下文，`&` 类似 `:is()` 会抬高权重且不能字符串拼接。

- 隐式规则：嵌套选择器自动获得 `& `（后代）前缀；组合器开头（`>`/`+`/`~`）也隐式携带 `&`；
- `&` 四用法：伪类伪元素、复合选择器、后置反转上下文、多次引用写兄弟关系；
- `@media`/`@supports`/`@container` 可嵌套进组件规则；
- 权重细节：`&` 按 `:is()` 语义展开，父级是选择器列表时权重取最高参数；覆盖前先展开验证；
- `&__title` 这类字符串拼接在原生 CSS 中无效（Sass 专属习惯）；
- 标签选择器嵌套写 `& h2` 兼容性最稳；类/id 开头无历史负担。

## 注意事项与改进建议

| 问题点 | 说明 | 改进方案 |
| --- | --- | --- |
| 嵌套过深 | 选择器膨胀、权重失控 | 约定不超过 3 层 |
| 依赖编译的旧写法 | 裸标签嵌套旧引擎丢失 | 统一 `&` 前缀写法 |
| Sass 习惯直接照搬 | `&--x` 无效 | 按本文第 7 节改写 |
| 权重意外抬升 | 样式盖不住 | 展开验证、必要时 `@layer` 收纳 |

## 扩展学习

- 工程化实践与 Sass 迁移：`css/720-CSSNestingInPractice`；
- Sass 预处理器：`css/570-Sass`；
- 层叠层收纳第三方样式：`css/450-CascadeLayer`；
- 选择器体系：`css/130-CSS3SelectorSystem`；
- 新特性总览：`css/650-CSSNewFeatures`。
