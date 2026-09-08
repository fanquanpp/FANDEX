---
order: 720
title: CSS 原生嵌套工程实践
module: 'css'
category: 前端技术
difficulty: intermediate
description: 原生嵌套的工程化使用：组件样式组织、嵌套深度与权重治理、老浏览器构建回退，以及从 Sass 到原生嵌套的渐进迁移策略与决策清单。
author: fanquanpp
updated: '2026-09-08'
related:
  - 'css/042-CSSNativeNesting'
  - 'css/055-Sass'
  - 'css/040-CascadeLayer'
  - 'css/044-CSSArchitectureMethodology'
  - 'css/057-PostCSS'
prerequisites:
  - 'css/042-CSSNativeNesting'
---

## 1. 学习目标与定位

`css/042-CSSNativeNesting` 讲的是嵌套**语法**（`&` 怎么写、权重怎么算）；本篇讲的是嵌套**怎么在真实项目里用**：

- 什么样的样式适合嵌套、什么样不适合；
- 团队如何约定嵌套深度、书写顺序与命名；
- 老浏览器场景如何通过构建层回退；
- 存量 Sass/Less 项目如何渐进迁移到原生嵌套，哪些预处理器能力需要保留。

前置知识：先读完 042，理解 `&` 与 `:is()` 权重语义；再读本篇。

## 2. 心智模型：嵌套是“作用域收敛”工具

原生嵌套的最大价值不是“少打几个字”，而是**把一个组件的全部状态收拢到一个块里**，让样式的归属一目了然：

```css
/* 嵌套前：一个按钮的样式散落四处，删组件时容易漏 */
.btn { }
.btn:hover { }
.btn[disabled] { }
.btn .icon { }
@media (min-width: 768px) { .btn { padding: 12px 24px; } }

/* 嵌套后：归属清晰，增删状态都在一处 */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;

  .icon {
    width: 16px;
  }

  &:hover {
    background: #1d4ed8;
  }

  &[disabled] {
    opacity: 0.5;
    pointer-events: none;
  }

  @media (min-width: 768px) {
    padding: 12px 24px;
  }
}
```

反过来，**不携带状态的“扁平方”也有它的优势**：搜索友好（全文搜 `.btn:hover` 就能定位）、权重天然低、不依赖浏览器版本。工程上两者的关系是“组件内部用嵌套收拢，组件之间保持扁平”，而不是二选一。

## 3. 团队约定：四条硬规则

嵌套的自由度很高，没有约定的团队很快会写出五层深、权重失控的样式。以下是经过大量项目验证的最小约定集：

### 3.1 深度不超过三层

```css
/* 推荐上限的典型形态：组件 -> 子元素 -> 状态 */
.card {
  .media {
    &:hover {
      outline: 2px solid blue;
    }
  }
}

/* 不推荐：四层起，展开后选择器冗长且难覆盖 */
.card {
  .body {
    .content {
      .item {
        .title { } /* 五层：改一个字号要面对 .card .body .content .item .title */
      }
    }
  }
}
```

超过三层的信号是“你在用 DOM 结构写样式”。解法是给深层节点独立类名（配合 BEM，见 `css/058-BEMNamingMethodology`），在顶层平铺。

### 3.2 声明在前，嵌套规则在后

```css
.btn {
  /* 第一段：自己的属性声明 */
  padding: 8px 16px;
  border-radius: 6px;

  /* 第二段：子元素 */
  .icon { }

  /* 第三段：自身状态 */
  &:hover { }

  /* 第四段：条件 @规则 */
  @media (min-width: 768px) { }
}
```

浏览器对混排并不报错，但固定顺序让 code review 与 diff 一目了然，stylelint 的 `order` 类规则也能直接校验。

### 3.3 优先显式 `&`

隐式后代嵌套（不带 `&`）合法且常见，但状态、伪类、复合场景一律显式写 `&`，减少“这个规则到底挂在谁身上”的歧义：

```css
.list {
  .item { }          /* 子元素：隐式后代可接受 */
  &:hover { }        /* 自身状态：必须显式 */
  & + & { margin: 0 8px; } /* 兄弟关系：必须显式 */
}
```

### 3.4 禁止字符串拼接式 `&`

`&__title`、`&--active` 这类 Sass 习惯在原生 CSS 中是无效语法（详见 042 第 7 节）。团队规范里应直接列为禁用项，lint 规则（stylelint `selector-nested-pattern` 等）可以兜底。

## 4. 与 BEM、@layer 的组合拳

### 4.1 嵌套 + BEM：写全类名，不做拼接

```css
.card {
  display: block;

  .card__title {
    font-size: 1.25rem;
  }

  /* 修饰符用复合选择器表达“同一元素” */
  &.card--featured {
    border: 2px solid gold;
  }

  /* 状态挂在修饰符下 */
  .card--featured .card__title {
    color: #b45309;
  }
}
```

类名虽长，但每条规则搜索可达、权重恒定（全类名扁平结构），这是 BEM 与嵌套结合的最稳形态。

### 4.2 嵌套 + @layer：把组件放进层里管理优先级

嵌套解决“组织”，`@layer` 解决“优先级”，两者正交，组合使用效果最好：

```css
@layer reset, base, components, utilities;

@layer components {
  .btn {
    &:hover {
      background: #1d4ed8;
    }
  }
}

/* utilities 层永远赢过 components 层，无论选择器权重 */
@layer utilities {
  .mt-0 {
    margin-top: 0 !important; /* 连 important 都不一定需要 */
  }
}
```

原理与层的完整规则见 `css/040-CascadeLayer`。要点：进了层的样式永远低于无层样式，第三方样式最适合用 `@import ... layer(...)` 收进低优先级层。

## 5. 老浏览器怎么办：构建层回退

原生嵌套在 2023-2024 起全面可用，但存量业务常要兼容旧内核（如企业内嵌 WebView）。策略是**源码用原生嵌套写，构建时编译成平铺 CSS**：

```bash
# 方案一：postcss-nesting（PostCSS 插件，逐条展开嵌套）
npm install -D postcss postcss-nesting
```

```javascript
// postcss.config.mjs
export default {
  plugins: {
    'postcss-nesting': {},
  },
};
```

```bash
# 方案二：Lightning CSS（内置嵌套转译，顺带做前缀与语法降级）
npx lightningcss --browserslist ">= 0.5%, not dead" \
  --minify src/nested.css -o dist/flat.css
```

```json
// package.json：统一声明目标浏览器，转译深度由它驱动
{
  "browserslist": ["last 2 versions", "> 1%", "not dead"]
}
```

决策依据很简单：**browserslist 里有不支持嵌套的浏览器，就把转译挂进构建链**；目标全绿时编译步骤可以省略。构建链集成细节见 `css/057-PostCSS`。

## 6. 从 Sass 迁移到原生嵌套：渐进策略

存量项目不必“一夜切换”。推荐按能力逐项评估、分四步走：

### 6.1 能力对照：原生 CSS 已经覆盖了什么

| Sass 能力 | 原生 CSS 对应物 | 迁移结论 |
| --- | --- | --- |
| 嵌套 + `&` | 原生嵌套（注意不能拼接，见 042） | 可直接迁移 |
| 变量 `$x` | 自定义属性 `--x`（运行时、可继承、可动画） | 可迁移，语义更强 |
| `@mixin`/`@include` | 工具类 + `@layer`；少量场景仍需 Sass | 大部分可替代 |
| `@extend` | 无直接对应（`composes` 仅限 CSS Modules） | 保留或改写工具类 |
| 函数（颜色运算等） | `color-mix()`、相对颜色语法、`calc()` | 基本可替代 |
| 控制指令 `@each`/`@for` | 无（`@function` 尚未普及） | 保留 Sass 或换生成脚本 |
| 拆分与 `@use` 模块 | `@import`（原生）+ 构建打包 | 基本可替代 |

### 6.2 四步迁移法

```text
第一步：新旧并存
  新组件全部用原生嵌套写；存量 Sass 文件不动。
  在 browserslist 与 CI 里锁定“支持嵌套”的目标。

第二步：替换变量
  $primary -> --primary（自定义属性）。
  注意差异：Sass 变量编译期替换，CSS 变量运行时继承——
  依赖“编译期固化”行为（如每断点重算）的地方先别动。

第三步：回收 mixin
  简单的 @mixin flex-center 改成 utilities 层工具类；
  带逻辑/断点的 mixin（respond-to）改用嵌套 @media；
  实在复杂的保留，不强行翻译。

第四步：收尾
  剩余的 @extend 与控制指令集中到少数 Sass 文件，
  或等 @function / 更多原生能力普及后再评估。
```

### 6.3 什么时候该保留 Sass

以下情形继续用 Sass 是理性的，不要为了“去预处理器”而硬迁：

- 组件库 / 设计令牌体系大量依赖 `@each` 批量生成工具类；
- 团队还在兼容不支持嵌套的浏览器且没有构建链（纯静态页 + 手工维护 CSS）；
- `@extend` 的选择器复用已被验证且改动成本高。

反过来说，如果项目已经有一个现代构建链（Vite 等），Sass 的存在感会持续下降——先迁移“嵌套与变量”这两块占大头的用法，收益立现。

## 7. 完整示例：一个组件目录的落地

真实项目里，一个组件的样式通常这样组织（以原生嵌套 + BEM + @layer 为约定）：

```html
<div class="user-card">
  <img class="user-card__avatar" src="avatar.png" alt="" />
  <div class="user-card__meta">
    <p class="user-card__name">张三</p>
    <p class="user-card__desc">前端工程师</p>
  </div>
</div>
```

```css
@layer components;

@layer components {
  .user-card {
    display: flex;
    gap: 12px;
    padding: 16px;
    border: 1px solid #e5e7eb;
    border-radius: 8px;

    .user-card__avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      object-fit: cover;
    }

    .user-card__name {
      font-weight: 600;
      margin: 0;
    }

    .user-card__desc {
      color: #6b7280;
      margin: 2px 0 0;
    }

    &:hover {
      border-color: #93c5fd;
    }

    &.is-active {
      border-color: #2563eb;
      box-shadow: 0 2px 8px rgb(37 99 235 / 20%);
    }

    @media (max-width: 480px) {
      flex-direction: column;
    }
  }
}
```

自检清单（可贴进团队 PR 模板）：

- 嵌套深度是否不超过三层；
- 声明是否全部在嵌套规则之前；
- 是否存在 `&__x` 拼接（必须为零）；
- 父级选择器是否为单一选择器（避免 `:is()` 权重抬升）；
- 组件是否包在 `components` 层里，工具类是否在 `utilities` 层。

## 8. 常见陷阱

| 陷阱 | 症状 | 原因与解法 |
| --- | --- | --- |
| 照搬 Sass 的 `&--x` | 规则整条失效 | 原生 `&` 不能拼接，写全类名 |
| 父级写成选择器列表 | 覆盖莫名失败 | `:is()` 取最高权重；父级保持单选择器 |
| 嵌套写满 DOM 层级 | 选择器冗长、难覆盖 | 深层节点独立类名，顶层平铺 |
| 变量迁移后行为变化 | 断点内取值不符合预期 | Sass 编译期替换 vs CSS 变量运行时继承 |
| 无构建链上嵌套 | 旧内核用户样式丢失 | browserslist 判定 + postcss-nesting 转译 |
| 只治理不 lint | 约定逐渐腐化 | stylelint 限制深度与嵌套模式 |

## 动手试试

1. 给现有项目写一份嵌套约定（深度、顺序、命名），并用 stylelint 固化；
2. 把一个 Sass 组件迁移到原生嵌套，逐一对照第 6 节的能力表记录取舍；
3. 故意把父级写成 `#a, .b`，在 DevTools 验证 `:is()` 权重抬升；
4. 配置 postcss-nesting，对比转译前后的产物；
5. 进阶挑战：把一个组件库的 utilities 抽进 `@layer utilities`，验证工具类不再需要 `!important`。

## 核心知识点

> 一句话记住工程化嵌套：组件内部用嵌套收拢、组件之间保持扁平；深度不超三层、声明在前、显式 `&`、禁拼接；老浏览器靠构建转译兜底，Sass 按“变量 -> 嵌套 -> mixin -> 收尾”四步渐进迁移。

- 嵌套的价值是归属清晰，不是省字数；超三层说明在用 DOM 结构写样式；
- 嵌套与 BEM 组合写全类名，与 `@layer` 组合治理优先级；
- browserslist 里含旧内核时，用 postcss-nesting / Lightning CSS 转译；
- Sass 能力并非全部可替代：`@extend` 与控制指令是最后两块阵地；
- 变量迁移注意编译期/运行时的语义差异；
- 用 lint 与 PR 自检清单守住约定。

## 注意事项与改进建议

| 问题点 | 说明 | 改进方案 |
| --- | --- | --- |
| 一次性重写存量样式 | 回归风险大 | 四步渐进，新旧并存 |
| 只有口头约定 | 约定失守 | stylelint + PR 模板固化 |
| 目标浏览器不明 | 转译策略摇摆 | 先定 browserslist 再定构建 |
| 为去 Sass 而去 Sass | 消耗在低价值翻译 | 按 6.3 节评估保留价值 |

## 扩展学习

- 嵌套语法与 `&` 规则：`css/042-CSSNativeNesting`；
- Sass 预处理器：`css/055-Sass`；
- Less 与 Stylus：`css/056-LessStylus`；
- 层叠层：`css/040-CascadeLayer`；
- 架构方法论：`css/044-CSSArchitectureMethodology`；
- PostCSS 构建链：`css/057-PostCSS`。
