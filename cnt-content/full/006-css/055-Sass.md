---
order: 550
title: Sass
module: 'css'
category: 前端技术
difficulty: intermediate
description: Sass 预处理器教学：变量、嵌套、混合、占位符继承、函数与 @use 模块系统，以及与原生 CSS（变量/嵌套/@layer）的分工与选型。
author: fanquanpp
updated: '2026-09-08'
related:
  - 'css/056-LessStylus'
  - 'css/042-CSSNativeNesting'
  - 'css/072-CSSNesting'
  - 'css/036-CSSVariableCustomAttribute'
  - 'css/044-CSSArchitectureMethodology'
  - 'css/057-PostCSS'
prerequisites:
  - 'css/002-CSS3OverviewBasicSyntax'
---

## 1. 学习目标与背景

读完本篇你应该能：

- 用 SCSS 完成变量、嵌套、混合、占位符继承与自定义函数的日常书写；
- 使用现代 `@use` 模块系统组织样式文件，并知道它为什么取代了 `@import`；
- 说清 Sass 变量与 CSS 自定义属性的语义差异，以及哪些 Sass 能力已经被原生 CSS 替代。

Sass 是历史最久、生态最大的 CSS 预处理器：Bootstrap、大量组件库与设计系统都构建在其上。它提供变量、嵌套、混合、继承、运算与控制流，最终编译为普通 CSS。类比：如果说 CSS 是“配置语言”，Sass 就是给配置加上了“变量、函数与模块”的编程能力，让重复样式可以收敛成定义。

两种语法：

- **SCSS**（`.scss`，主流推荐）：完全兼容 CSS 语法的超集，花括号风格；
- **Sass**（`.sass`，缩进风格）：省略花括号与分号，如今较少见。

本文示例统一 SCSS。当前实现为 Dart Sass（`npm i -D sass`），Vite/Webpack 均开箱支持。

## 2. 变量：编译期替换

```scss
// 变量以 $ 开头，编译时把引用处替换为字面值
$font-stack: 'Helvetica Neue', sans-serif;
$primary: #3498db;
$spacing-unit: 1rem;

body {
  font-family: $font-stack;
  color: $primary;
}
.card {
  margin: $spacing-unit * 2; // 可参与运算 => 2rem
}
```

必须建立的认知：**`$primary` 在产物里不存在**——编译后是写死的 `color: #3498db`。这与 CSS 自定义属性（`--primary`，运行时存在、可继承、可按媒体查询/主题切换改值）是两种语义：

| 维度 | Sass 变量 `$x` | CSS 自定义属性 `--x` |
| --- | --- | --- |
| 生效阶段 | 编译期替换 | 运行时计算 |
| 产物中 | 消失 | 保留 |
| 换主题 | 重新编译 | JS/属性切换即可 |
| 可动画 | 否 | 可（`@property` 注册后） |

选型口诀：**编译期知道的常量用 `$`；需要运行时变化（暗色主题、用户偏好）的用 `--`**。两者常配合：`$` 定义令牌源，编译输出 `--` 变量。

## 3. 嵌套

```scss
.nav {
  display: flex;

  ul {
    list-style: none;
  }
  a {
    text-decoration: none;

    &:hover {
      color: darken($primary, 10%);
    } // & 引用父选择器 => .nav a:hover
  }
}
```

Sass 的 `&` 与原生 CSS 嵌套的 `&` 语义基本一致，但有一个**Sass 专属能力**：`&` 可以做字符串拼接（`&--primary` 生成 `.nav--primary`）——这在原生 CSS 里无效（详见 `css/042-CSSNativeNesting` 第 7 节）。把 Sass 嵌套直接照搬到原生 CSS 时，必须排查这类写法。

嵌套深度约定同样适用：不超过 3 层，产物选择器过长会带来覆盖困难。

## 4. 混合（Mixin）：可复用的样式片段

```scss
// 无参混合：常用声明集合
@mixin flex-center {
  display: flex;
  justify-content: center;
  align-items: center;
}

// 带参混合 + 默认值
@mixin truncate($lines: 1) {
  @if $lines == 1 {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  } @else {
    display: -webkit-box;
    -webkit-line-clamp: $lines;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
}

// 响应式混合：@content 允许调用方“塞入”任意样式块
@mixin respond-to($breakpoint) {
  @if $breakpoint == md {
    @media (min-width: 768px) { @content; }
  } @else if $breakpoint == lg {
    @media (min-width: 1024px) { @content; }
  }
}

// 使用
.container {
  @include flex-center;
}
.title {
  @include truncate(2);
}
.sidebar {
  width: 100%;
  @include respond-to(md) {
    width: 25%;
  }
}
```

`@content` 是混合最强大的机制：把一段样式“模板化”，调用处填空。断点语义集中在一处定义，全站响应式口径统一。

## 5. 继承（@extend）：慎用的复用

```scss
// %placeholder：只定义不输出，被 extend 时才生成选择器
%button-base {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn-primary {
  @extend %button-base;
  background: $primary;
}
.btn-secondary {
  @extend %button-base;
  background: gray;
}
```

编译产物是**选择器分组**：`.btn-primary, .btn-secondary { padding: 8px 16px; ... }`。代价是产物里按钮的选择器组会随继承数量膨胀，且 HTML 上看不到“这些按钮共享样式”的信息。社区共识：**优先用混合或占位符类 + 多类名**，`@extend` 只在明确的同语义复用（如错误状态集合）时使用。

## 6. 函数与运算

```scss
$base: 16px;

// 自定义函数：有返回值（区别于 mixin 的“输出样式”）
@function rem($px) {
  @return ($px / 16) * 1rem;
}

h1 {
  font-size: rem(32); // 2rem
}

// 内置函数举隅
$dark: darken($primary, 15%);   // 变暗
$lighter: lighten($primary, 20%);
$mixed: mix($primary, white, 70%);
$alpha: rgba($primary, 0.6);
```

与原生能力的衔接：这类颜色派生如今也能用 `color-mix()` 与相对颜色语法在浏览器里完成（`css/035-ModernColorSpace`）。Sass 版本的优势是编译期完成、产物更小；原生版本的优势是运行时随变量联动。需要与 CSS 变量联动的派生色，用原生写法。

## 7. 模块系统：@use 取代 @import

```scss
// _variables.scss（下划线开头的 partial 不单独编译）
$primary: #3498db !default; // !default：允许使用者预先覆盖

// _mixins.scss
@mixin flex-center { /* ... */ }

// main.scss
@use 'variables' as *; // 命名空间全部展开（as *）或 as v 前缀访问
@use 'mixins' as *;

.btn {
  background: $primary;
  @include flex-center;
}
```

现代工程规则：

- 用 `@use` 而非 `@import`：`@use` 只加载一次、有命名空间、依赖关系显式；`@import` 全局污染且已被 Dart Sass 标记废弃；
- `!default` 让令牌文件可被上游覆盖，是组件库/主题包的标准手法；
- `sass:math`、`sass:color` 等内置模块通过 `@use 'sass:math'` 引入。

## 8. 控制指令：批量生成

```scss
// @each + map：设计令牌 -> 工具类
$spacings: (0: 0, 1: 4px, 2: 8px, 4: 16px, 8: 32px);

@each $key, $val in $spacings {
  .mt-#{$key} { margin-top: $val; }
  .p-#{$key} { padding: $val; }
}
// 产物：.mt-0/.p-0 ... .mt-8/.p-8 共 10 个类
```

`@for`/`@while`/`@if` 同理。这类“生成型”用法是 Sass 至今难以被完全替代的阵地（原生 CSS 没有循环；`@function` 尚未普及，见 `css/065-CSSNewFeatures` 第 8 节）。

## 9. 完整示例：主题令牌 + 按钮组件

```scss
// _tokens.scss
$colors: (
  primary: #2563eb,
  danger: #dc2626,
) !default;
$radius: 6px !default;

@function color($name) {
  @return map-get($colors, $name);
}

// buttons.scss
@use 'tokens' as *;

@mixin button($bg) {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  border-radius: $radius;
  background: $bg;
  color: white;
  cursor: pointer;

  &:hover {
    background: darken($bg, 8%);
  }
  &[disabled] {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.btn-primary { @include button(color(primary)); }
.btn-danger { @include button(color(danger)); }
```

编译后得到两个语义清晰、参数集中于令牌文件的按钮类——这就是“设计令牌 + mixin”的经典 Sass 架构（架构全景见 `css/044-CSSArchitectureMethodology`）。

## 10. 与原生 CSS 的分工：现在还要不要 Sass

| Sass 能力 | 原生替代 | 保留建议 |
| --- | --- | --- |
| 嵌套 | 原生嵌套（`css/042`） | 可替代 |
| 变量 | 自定义属性（`css/036`） | 按语义分工 |
| 简单 mixin | 工具类 + `@layer`（`css/040`） | 大多可替代 |
| 颜色函数 | `color-mix()` / 相对颜色（`css/035`） | 可替代 |
| `@each`/`@for` 生成 | 无 | 保留 |
| `@extend` | 无直接等价 | 保留或改多类名 |
| `@use` 模块 | 原生 `@import` + 打包器 | 视工具链 |

结论：**存量项目继续用 Sass 没有问题；新项目若已有构建链，优先原生 CSS，仅当需要“生成型”能力（批量工具类、主题矩阵）时引入 Sass**。从 Sass 迁出的四步策略见 `css/072-CSSNesting` 第 6 节；PostCSS 在链路中的位置见 `css/057-PostCSS`。

## 11. 常见陷阱

| 陷阱 | 症状 | 原因与解法 |
| --- | --- | --- |
| `$` 变量做主题切换 | 运行时切换无效 | 编译期替换；主题用 `--` 变量 |
| 嵌套照搬原生 CSS | `&--x` 在原生中无效 | 迁移时排查拼接写法 |
| 嵌套过深 | 选择器冗长 | 深度不超 3 层 |
| `@extend` 泛滥 | 产物选择器组膨胀 | 优先 mixin / 多类名 |
| 继续用 `@import` | 全局污染、废弃警告 | 全面改 `@use` |
| sourcemap 缺失 | 调试定位到编译产物 | 构建开启 sourcemap |

## 动手试试

1. 用 `$` 变量 + `@function rem()` 重构一组 px 字号，检查产物；
2. 写一个带 `@content` 的响应式混合，统一全站断点；
3. 用 `@each` + map 生成一套颜色文本工具类；
4. 把同一段颜色派生分别用 `darken()` 与 `color-mix()` 实现，对比产物与运行时行为；
5. 进阶挑战：按 `css/072-CSSNesting` 的四步法，把某个组件从 Sass 变量+嵌套迁移到自定义属性+原生嵌套。

## 核心知识点

> 一句话记住 Sass：`$` 编译期变量、嵌套分组、`@mixin/@include` 复用片段、`%`+`@extend` 谨慎继承、`@function` 计算、`@use` 模块化；与原生 CSS 的分工是“生成与编译期归 Sass，运行时与结构归原生”。

- 语法选 SCSS；实现用 Dart Sass（`sass` 包）；
- `$` 变量消失于产物，主题切换必须用 `--` 自定义属性；
- Sass 的 `&--x` 拼接是编译期字符串能力，原生 CSS 没有；
- `@content` 让混合模板化；`@extend` 生成选择器分组，慎用；
- `@use`（带命名空间、单次加载）全面取代 `@import`；
- 控制指令批量生成工具类是 Sass 的存量优势阵地。

## 注意事项与改进建议

| 问题点 | 说明 | 改进方案 |
| --- | --- | --- |
| 嵌套过深 | 产物选择器冗长 | 深度不超 3 层 |
| @extend 滥用 | 选择器膨胀难调试 | 优先 mixin |
| 变量与 CSS 变量混用 | 语义不清 | 明确编译期/运行期分工 |
| 依赖构建 | 调试需 sourcemap | 构建链统一开启 |

## 扩展学习

- Less 与 Stylus：`css/056-LessStylus`；
- PostCSS（下游处理管道）：`css/057-PostCSS`；
- 原生嵌套与迁移策略：`css/042-CSSNativeNesting`、`css/072-CSSNesting`；
- CSS 自定义属性：`css/036-CSSVariableCustomAttribute`；
- 架构方法论：`css/044-CSSArchitectureMethodology`。
