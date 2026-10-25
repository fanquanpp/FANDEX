---
order: 670
title: CSS Modules
module: 'css'
category: 前端技术
difficulty: intermediate
description: 用「构建期重命名」的心智模型讲透 CSS Modules：类名哈希如何实现样式隔离、composes 组合、:global 逃逸舱，以及动态类名与测试选择器两大高频坑。
author: fanquanpp
updated: '2026-10-11'
related:
  - 'css/600-BEMNamingMethodology'
  - 'css/610-CSSAtomic'
  - 'css/630-CSSInJS'
  - 'css/480-CSSNativeNesting'
prerequisites:
  - 'css/020-CSS3OverviewBasicSyntax'
---

## 前置知识

- 选择器与层叠基础：[选择器体系](/css/130-CSS3SelectorSystem)、[优先级计算](/css/170-PriorityCalculation)；
- 组件化开发的语境（React/Vue 任一框架写过组件即可）。

## 学习目标

- 用「构建期重命名」一句话解释 CSS Modules 的全部行为，说清它与 BEM 命名约定的本质区别；
- 会用 `styles.xxx` 映射、`composes` 组合、`:global()` 逃逸舱三件武器；
- 能预判两个高频翻车点：动态拼接类名失效、哈希类名让测试选择器变脆。

预计 40 到 60 分钟。

## 概念引入：全局命名空间是一口大锅

CSS 的类名天然是**全局**的：两个文件都写了 `.title`，后加载的覆盖先加载的，谁也不警告你。项目小的时候靠 BEM 这类命名约定避让（`card__title--highlight`），约定本质是「人肉命名空间」——靠自觉，规模一大必然撞车。

CSS Modules 的思路换了一层：**不靠人自律，靠构建器保证唯一**。你在源码里照常写 `.btn`，构建时打包器把类名改写成「文件名_类名_哈希」的唯一形态，于是每个文件里的 `.btn` 都自动成了局部类。一句话心智模型：

> CSS Modules = 构建期给类名重命名，源码里的类名与浏览器里的类名从此是两个世界。

## 核心心智模型：一张映射表

理解 CSS Modules 只需要抓住一件事：**构建器维护了一张「源码类名 → 产物类名」的映射表**。

```css
/* Button.module.css */
.btn { padding: 8px 16px; border-radius: 4px; }
.primary { background: #2563eb; color: #fff; }
```

```javascript
import styles from './Button.module.css';
// styles 的值就是那张映射表：
// { btn: 'Button_btn_x9y8z', primary: 'Button_primary_a1b2c' }

function Button() {
  return <button className={`${styles.btn} ${styles.primary}`}>点击</button>;
}
```

浏览器最终收到：

```html
<button class="Button_btn_x9y8z Button_primary_a1b2c">点击</button>
```

这张模型解释了所有规则：

1. **文件名必须是 `*.module.css`**——这是告诉打包器「启用重命名」的开关；
2. **类名必须经映射表引用**（`styles.btn`）——直接在 HTML 里写 `class="btn"` 拿到的不是这个类；
3. **哈希保证唯一**——两个组件各自有 `.btn` 互不干扰，隔离不需要任何运行时代码（对比 CSS-in-JS 的运行时生成）。

## 基本用法与命名风格

以 Vite 为例（React/Vue 项目开箱即用，无需配置）：

```jsx
// Card.jsx
import styles from './Card.module.css';

export function Card({ children }) {
  return <article className={styles.card}>{children}</article>;
}
```

类名风格的选择影响引用写法：

| 源码风格 | 引用方式 | 说明 |
| --- | --- | --- |
| camelCase：`.primaryBtn` | `styles.primaryBtn` | 可以直接点出来，TS 自动补全友好 |
| kebab-case：`.primary-btn` | `styles['primary-btn']` | 必须方括号取值，补全体验差 |

**推荐 camelCase**。另外源码里保留的 `_`/`-` 都会进入产物类名，调试时在 DevTools 里还能按文件前缀定位，这是哈希方案的隐藏福利。

## 组合：composes

`composes` 是 CSS Modules 内置的「类组合」能力——一个类声明它复用哪些类，构建时产物里直接挂上多个类名：

```css
/* Button.module.css */
.base {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
}

.primary {
  composes: base;
  background: #2563eb;
  color: #fff;
}
```

`styles.primary` 的映射值是 `'Button_base_xxx Button_primary_yyy'`——不是「选择器叠加」，而是**类名列表拼接**。所以它没有层叠优先级问题，被组合的类与组合方是平级的。

两点边界要知道：

- `composes` 只能写在类的顶层，不能出现在选择器嵌套或媒体查询里；
- 它是构建期语法，依赖工具链实现（webpack 的 css-loader、postcss-modules 均支持；换工具链前先验证）。

## 逃逸舱：:global()

偶尔你确实需要写全局类——覆盖第三方组件的内部类名、给富文本内容挂样式：

```css
/* Card.module.css */
.card :global(.rich-text p) {
  margin-block: 0.5em;
}
```

`.rich-text p` 不会被重命名，只有外层 `.card` 还是局部的。心智模型：`:global()` 是「这一段退出重命名」的逃逸舱，**用一次少一次**——每次使用都在重新引入你当初想摆脱的全局冲突风险，规范的做法是在注释里写明为什么需要它。

## 横向对比：隔离方案的分工

| 方案 | 隔离机制 | 运行时成本 | 适用 |
| --- | --- | --- | --- |
| BEM | 命名约定 | 零 | 无构建链的静态页面 |
| CSS Modules | 构建期哈希类名 | 零 | 组件化项目的主流默认解 |
| CSS-in-JS | 运行时生成类名 | 有运行时 | 需要高度动态样式的场景 |
| Shadow DOM | DOM 树隔离 | 完全隔离但约束大 | Web Components |
| `@scope` | 浏览器原生作用域 | 零 | 逐步落地的原生方案 |

CSS Modules 的位置很清晰：**零运行时的组件级隔离**。它解决命名冲突，但不解决「设计约束统一」（那是设计 token 与 [原子化](/css/610-CSSAtomic) 的领域），也不像 Shadow DOM 那样隔离元素选择器与继承。

## 常见坑与调试实录

**坑 1：动态拼接类名，样式静默丢失。**

```javascript
// 反例：kind = 'primary' | 'danger'
<button className={`btn-${kind}`}>     // 产物里根本没有 btn-primary 这个类
```

映射表里只有 `styles.primary`、`styles.danger` 这些**出现在 CSS 文件里的类名**，`btn-primary` 不在表中，浏览器里查无此类。正确姿势是把所有可能用到的类都写进 CSS 文件并经映射表引用：

```javascript
// 参考写法：映射收敛
const kindClass = { primary: styles.primary, danger: styles.danger };
<button className={`${styles.btn} ${kindClass[kind]}`}>
```

**坑 2：测试与自动化选择器变脆。** 哈希类名对用户不可见，但 `document.querySelector('.btn')` 也随之失效。测试应该锚定语义锚点（`data-testid`、`aria-*`、`role`）而不是样式类名——类名是视觉实现细节，不该成为行为契约。

**坑 3：TypeScript 报模块类型缺失。** 补一个全局声明即可（或用 `vite/client` 自带类型）：

```typescript
// vite-env.d.ts 或全局 .d.ts
declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}
```

代价是类名拼写错误编译期查不出来；需要强类型可以引入 `typed-css-modules` 生成精确类型。

**坑 4：以为 Modules 隔离了一切。** 它只重命名**类名**。`a { ... }`、`* { box-sizing: ... }` 这类元素选择器与通配选择器照样全局生效，写在 `.module.css` 里依然会漏出去。全局性样式请放到普通全局样式文件里，别混进 module 文件。

## 与之前和之后的知识的关系

- 之前：[优先级计算](/css/170-PriorityCalculation) 解释了为什么全局类名会互相覆盖——Modules 从源头消灭了这种覆盖；[BEM 命名](/css/600-BEMNamingMethodology) 是「约定式隔离」，可与 Modules 共存（module 文件内部仍然值得用 BEM 语义命名）；
- 并行：[CSS-in-JS](/css/630-CSSInJS) 用运行时换动态能力；[原生嵌套](/css/480-CSSNativeNesting) 让 module 文件内部少写重复前缀；
- 之后：组件库打包时 module 文件同样参与摇树与压缩，产物构成可回看 [关键渲染路径优化](/css/550-CriticalRenderPathOptimization) 的资源加载视角。

## 自我检查

- 能用「映射表」模型解释：为什么 `class="btn"` 引用不到、为什么零运行时、为什么动态拼接会失效；
- 说出 `composes` 生成的是类名列表而不是选择器叠加；
- 知道 `:global()` 该少用，且元素选择器不受 Modules 保护。

## 小练习

### 练习 1：亲手复现命名冲突与修复（预测题）

任务：建一个最小 Vite 项目（或用现有项目），创建两个组件各带 `Title.module.css`，里面都写 `.title { color: red; }` 与 `.title { color: blue; }`。先预测：两者会互相覆盖吗？再打开 DevTools 查看实际类名验证。

提示：回想映射表模型——两个文件的 `.title` 在产物里还是同名类吗？

参考现象（先预测再看）：不会覆盖。产物类名形如 `Title_title_hash1` 与 `Other_title_hash2`，各是各的类。这正是与手写全局类最大的行为差异。

### 练习 2：修复动态拼接（修 Bug 题）

任务：下面的代码在切换主题时按钮完全不变色，找出问题并用映射收敛修复：

```jsx
import styles from './Button.module.css';
// Button.module.css 中定义了 .primary 与 .danger
<button className={`button-${theme}`}>提交</button>
```

提示：`button-primary` 这个类在产物 CSS 里存在吗？映射表里有哪个键？

参考实现：

```jsx
import styles from './Button.module.css';

const themeClass = { primary: styles.primary, danger: styles.danger };

export function SubmitButton({ theme }) {
  return <button className={`${styles.btn} ${themeClass[theme]}`}>提交</button>;
}
```

### 练习 3：覆盖第三方组件的内部类（挑战题）

任务：项目里引入了一个第三方日期选择器，其内部面板类名为 `.datepicker-panel`，要求把面板背景改成浅灰。用 CSS Modules 的 `:global()` 实现，并在注释里写明为什么这里必须逃逸。

提示：逃逸范围要尽量小——把全局选择器限定在你自己的局部容器内。

参考实现：

```css
/* DatePickerWrapper.module.css */
.wrapper :global(.datepicker-panel) {
  background: #f5f5f5;
}
```

```jsx
import styles from './DatePickerWrapper.module.css';

// .datepicker-panel 是第三方库的内部实现类，无法经映射表引用；
// 用局部 .wrapper 限定逃逸范围，避免污染页面上其他同名类。
<div className={styles.wrapper}><DatePicker /></div>
```

## 下一步

- [CSS 原子化](/css/610-CSSAtomic)：另一条主流路线，解决的是约束统一而非命名冲突；
- [CSS-in-JS](/css/630-CSSInJS)：什么时候值得为动态样式付运行时代价；
- [CSS 架构方法论](/css/560-CSSArchitectureMethodology)：把 Modules、原子化、BEM 放进整体架构决策。
