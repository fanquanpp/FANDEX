---
order: 560
title: Less 与 Stylus
module: 'css'
category: 前端技术
difficulty: intermediate
description: Less 与 Stylus 预处理器教学：变量、混合、嵌套与运算的核心用法，与 Sass 的能力对照，以及在原生 CSS（变量/嵌套/@layer）时代的选型建议。
author: fanquanpp
updated: '2026-09-08'
related:
  - 'css/055-Sass'
  - 'css/057-PostCSS'
  - 'css/042-CSSNativeNesting'
  - 'css/072-CSSNesting'
  - 'css/036-CSSVariableCustomAttribute'
prerequisites:
  - 'css/002-CSS3OverviewBasicSyntax'
---

## 1. 学习目标与背景

读完本篇你应该能：

- 用 Less 完成变量定义、混合复用与嵌套书写，看懂 Stylus 的极简语法；
- 对照 Sass 说出三种预处理器的语法差异与生态现状；
- 判断一个新项目还有没有必要引入 Less/Stylus，以及老项目里的它们该怎么与原生 CSS 能力共存。

预处理器是什么：CSS 本身长期缺少变量、复用、计算等“编程能力”，预处理器提供一门**超集语言**，写完后编译成普通 CSS 交给浏览器。三巨头里 Sass 生态最大（见 `css/055-Sass`），本篇讲剩下的两位：**Less** 与 **Stylus**。

先说结论性的背景：三者诞生时 CSS 还没有自定义属性与原生嵌套；如今这两块基础能力已原生可用（`css/036-CSSVariableCustomAttribute`、`css/042-CSSNativeNesting`），预处理器的“刚需”变少了——Less 仍广泛存在于存量项目（尤其是 Bootstrap 4 之前的生态与 Ant Design 老版本），Stylus 则主要见于历史项目。学它们更多是为了**看懂和接手存量代码**，新项目首选“原生 CSS + 必要时 Sass”。

## 2. Less：最贴近 CSS 的超集

Less 的设计原则是“**合法的 CSS 一定是合法的 Less**”，学习成本最低。

### 2.1 变量

```less
// Less 变量以 @ 开头（区别于 CSS 自定义属性的 --）
@primary: #3498db;
@spacing: 1rem;
@banner-height: 240px;

body {
  color: @primary;
  padding: @spacing;
}

.hero {
  height: @banner-height;
}
```

关键语义：Less 变量是**编译期替换**——编译产物里没有 `@primary`，只有替换后的十六进制值。这与 CSS 自定义属性的“运行时、可继承、可被媒体查询改写”完全不同，也是迁移时最容易踩的差异（见第 5 节）。

### 2.2 混合（Mixin）：样式片段复用

```less
// 定义：带括号的类（不会输出到产物）
.flex-center() {
  display: flex;
  justify-content: center;
  align-items: center;
}

// 带参数的混合
.button-variant(@bg; @color: white) {
  background: @bg;
  color: @color;
  &:hover {
    background: darken(@bg, 10%); // Less 内置颜色函数
  }
}

// 使用：像调用函数一样
.container {
  .flex-center();
}
.btn-primary {
  .button-variant(#3498db);
}
```

Less 独有的便利：不带括号的普通类本身就是混合——`.container { .flex-center; }` 会直接“借用”任意类的样式。方便但也让输出物难以预测，团队使用时建议统一带括号定义（不输出）。

### 2.3 嵌套与运算

```less
.nav {
  display: flex;

  a {
    color: @primary;
    &:hover {
      opacity: 0.8;
    } // & 引用父选择器，与原生嵌套语义相同
  }
}

@base: 16px;
h1 {
  font-size: @base * 2; // 支持四则运算
}
```

### 2.4 内置函数与守卫

```less
// 常用内置函数：颜色处理与数学
@shadow: darken(@primary, 20%);
@half: percentage(0.5); // 50%

// when 守卫：Less 版的条件判断
.mixin(@size) when (@size > 16px) {
  font-weight: 600;
}
.mixin(@size) when (default()) {
  font-weight: 400; // default() 是 else 分支
}
```

## 3. Stylus：极简自由的语法

Stylus 允许省略花括号、分号甚至冒号，三种风格可以混用：

```stylus
// 缩进风格：无花括号、无分号、无冒号
primary = #3498db
spacing = 1rem

body
  color primary
  padding spacing
```

```stylus
// 混合与函数
flex-center()
  display flex
  justify-content center
  align-items center

.container
  flex-center()

// 返回值的函数（与混合的区别：有 return 语义）
rem(px)
  (px / 16) * 1rem

h1
  font-size rem(32)
```

```stylus
// 插值与条件循环
for i in 1..4
  .m-{i}
    margin (i * 8px)
```

Stylus 的自由是双刃剑：写起来快，但团队没有 lint 时风格最容易失控（有人花括号有人缩进）。接手 Stylus 项目第一件事是确认缩进风格与缩进单位。

## 4. 三种预处理器能力对照

| 特性 | Sass（SCSS） | Less | Stylus |
| --- | --- | --- | --- |
| 变量前缀 | `$` | `@` | 无前缀或 `$` |
| 语法自由度 | 必须 CSS 风格 | 必须 CSS 风格 | 可省略符号 |
| 混合 | `@mixin` / `@include` | `.name()` 或类借用 | `name()` |
| 条件 | `@if / @else` | `when` 守卫 | `if / else` |
| 循环 | `@for / @each` | 递归混合模拟 | `for / in` 原生支持 |
| 内置颜色函数 | 丰富 | 丰富 | 丰富 |
| 生态与工具链 | 最大（Dart Sass） | 大（存量项目多） | 小 |
| 现状 | 新项目首选预处理器 | 维护存量为主 | 历史项目为主 |

选择参考：只能选一个预处理器学，选 Sass；接手 Bootstrap 3/4、Ant Design 3.x 等老项目，读 Less；接手 2014-2017 年的 Node 系老项目，可能遇到 Stylus。

## 5. 与原生 CSS 能力的关系：什么还需要预处理器

原生 CSS 已经吃掉了预处理器的两大核心功能，迁移/新选型时按这张表判断：

| 需求 | 旧做法（Less/Stylus） | 原生 CSS 对应 | 结论 |
| --- | --- | --- | --- |
| 变量 | `@primary` | 自定义属性 `--primary` | 迁移后语义更强（运行时可切主题） |
| 嵌套 | `&:hover` | 原生嵌套（`css/042`） | 可直接替换 |
| 命名空间/优先级治理 | 无好方案 | `@layer`（`css/040`） | 原生更优 |
| 颜色计算 | `darken()` 等编译期函数 | `color-mix()` / 相对颜色（`css/035`） | 基本可替代 |
| 复杂逻辑（循环生成工具类） | 循环 + 插值 | 无原生等价物 | 保留预处理器 |
| 拆分与组织 | `@import` | 原生 `@import`（构建器处理） | 可替代 |

实践建议：存量 Less/Stylus 项目**不必为迁移而迁移**；做增改时优先用原生能力（自定义属性、嵌套、@layer、`color-mix()`），预处理器代码在触及处逐步替换。完整的迁移四步法见 `css/072-CSSNesting` 第 6 节。

## 6. 完整示例：同一组件的两种写法

```html
<nav class="nav">
  <a class="nav__link" href="#">首页</a>
  <a class="nav__link" href="#">文档</a>
</nav>
```

```less
// ---- Less 版 ----
@nav-bg: #1f2937;
@link-color: #e5e7eb;

.nav {
  display: flex;
  gap: 16px;
  padding: 12px 24px;
  background: @nav-bg;

  .nav__link {
    color: @link-color;
    text-decoration: none;
    padding: 6px 10px;
    border-radius: 4px;

    &:hover {
      background: lighten(@nav-bg, 12%);
    }
  }

  @media (max-width: 640px) {
    gap: 8px;
    padding: 8px 12px;
  }
}
```

```stylus
// ---- Stylus 版（同样的产物） ----
nav-bg = #1f2937

.nav
  display flex
  gap 16px
  padding 12px 24px
  background nav-bg

  .nav__link
    color #e5e7eb
    text-decoration none
    padding 6px 10px
    border-radius 4px

    &:hover
      background lighten(nav-bg, 12%)

  @media (max-width: 640px)
    gap 8px
    padding 8px 12px
```

两者编译产物完全一致；差异只在书写体验与配套工具链。

## 7. 常见陷阱

| 陷阱 | 症状 | 原因与解法 |
| --- | --- | --- |
| Less 变量当 CSS 变量用 | 主题切换失效 | `@x` 编译期固化；需要运行时切换用 `--x` |
| Less 类借用无处不在 | 产物里出现意外选择器 | 统一带括号定义混合 |
| Stylus 缩进混用 | 编译报错或规则错位 | 统一风格并接入 lint |
| 嵌套过深 | 选择器冗长 | 控制在 3 层内 |
| 新项目默认上预处理器 | 工具链多一层却没用到能力 | 先评估原生能力是否够用 |

## 动手试试

1. 把一段含颜色与间距的 CSS 用 Less 变量重构，对比编译前后产物；
2. 用 Less 的 `.flex-center()` 混合重写一个居中组件，再试试“类借用”写法并观察产物差异；
3. 用 Stylus 的 `for` 循环生成一套间距工具类；
4. 把其中 `@变量` 改写成 CSS 自定义属性，验证主题切换能力的变化；
5. 进阶挑战：按 `css/072-CSSNesting` 的四步法，把上面的 Less 片段迁移为纯原生 CSS。

## 核心知识点

> 一句话记住 Less/Stylus：Less 是“合法 CSS 即合法 Less”的超集，变量 `@`、混合 `.name()`；Stylus 可省略符号、语法最自由；两者都在被原生 CSS（变量/嵌套/@layer/color-mix）替代，新项目首选原生或 Sass。

- Less：`@变量` 编译期替换、带参混合、`when` 守卫、`darken()` 等内置函数；
- Stylus：缩进/花括号/分号三种风格可混用，原生 `for` 循环与函数；
- 对照表记差异：变量前缀、条件写法、循环能力；
- 编译期变量与运行时自定义属性是两种语义，主题切换必须用后者；
- 存量项目渐进迁移，新项目优先原生 CSS 能力。

## 注意事项与改进建议

| 问题点 | 说明 | 改进方案 |
| --- | --- | --- |
| 语法太自由 | 团队风格不一 | 统一 lint 与书写风格 |
| 多预处理器混用 | 构建链混乱 | 项目统一一种 |
| 忽视原生能力 | 重复造轮子 | 变量/嵌套/@layer 优先原生 |
| 老版本依赖 | Less 旧版有安全漏洞 | 升级到维护版本或迁移 |

## 扩展学习

- Sass（预处理器首选）：`css/055-Sass`；
- PostCSS（处理管道，与预处理器互补）：`css/057-PostCSS`；
- 原生嵌套与迁移策略：`css/042-CSSNativeNesting`、`css/072-CSSNesting`；
- CSS 自定义属性：`css/036-CSSVariableCustomAttribute`；
- 架构方法论：`css/044-CSSArchitectureMethodology`。
