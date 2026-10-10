---
order: 660
title: CSS 原子化
module: 'css'
category: 前端技术
difficulty: intermediate
description: 用「把值变成词表」的心智模型讲透原子化 CSS：Tailwind v4 的 CSS-first 配置、变体与按需扫描原理、UnoCSS 的规则系统，以及动态类名为什么必然失效。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'css/590-PostCSS'
  - 'css/600-BEMNamingMethodology'
  - 'css/620-CSSModules'
  - 'css/550-CriticalRenderPathOptimization'
prerequisites:
  - 'css/020-CSS3OverviewBasicSyntax'
---

## 前置知识

- 常用属性（间距、颜色、布局）的基本用法；
- [CSS 变量与自定义属性](/css/410-CSSVariableCustomAttribute)：原子化的设计约束就建立在变量之上。

## 学习目标

- 用「词表」模型解释原子化的收益与代价，说明它和传统语义类不是同一维度的方案；
- 会用 Tailwind 的变体语法（`hover:`、`md:`）与 v4 的 CSS-first 配置；
- 能解释「按需生成」的扫描原理，并因此预判动态拼接类名必然失效。

预计 40 到 60 分钟。

## 概念引入：类名的两种哲学

传统写法里，类名描述「这是什么」：

```css
.card__header { padding: 16px; font-weight: 600; }
```

类名越来越「语义化」，代价是每出现一种新组合就要回 CSS 文件加一条规则——CSS 随项目增长，而且看 HTML 猜不出最终样式。

原子化（Atomic CSS）把方向反过来：类名直接描述「改什么值」，一个类只做一件事：

```html
<div class="p-4 font-semibold">卡片头</div>
```

心智模型一句话：

> 原子类 = 把设计系统的「值」提前做成一本词表，HTML 用词表造句；HTML 变长，CSS 不再增长。

传统方案 CSS 与 HTML 一起长大；原子化方案的 CSS 是**收敛**的——词表是有限的，用的只是其中一小部分。

## Tailwind：词表与变体

### 基本用法（Tailwind v4，2025 年起默认）

v4 的配置搬进了 CSS 文件（CSS-first），不再需要 `tailwind.config.js`：

```css
/* app.css */
@import "tailwindcss";

@theme {
  --color-primary: #2563eb;
  --spacing-18: 4.5rem;
}
```

`@theme` 里声明的变量会自动生成对应词表：`--color-primary` 产生 `bg-primary`、`text-primary` 等类；同时这些自定义属性在运行时可用（详见[自定义属性](/css/410-CSSVariableCustomAttribute)）。v3 项目的 `tailwind.config.js` 写法仍然受支持（`theme.extend` 结构），迁移时二者对照即可。

### 变体：状态与断点的前缀语法

```html
<button class="bg-primary hover:bg-primary/90 focus:ring-2 md:w-1/2 lg:w-1/3">
  按钮
</button>
```

`hover:`、`focus:`、`md:` 是「修饰前缀」，展开后就是对应状态/媒体查询里的普通类。响应式前缀默认按 `min-width` 移动优先，与[响应式设计](/css/370-ResponsiveDesign)的原则一致。

### @apply：词表反哺传统 CSS

```css
.btn-primary {
  @apply px-4 py-2 bg-primary text-white rounded hover:bg-primary/90;
}
```

适用边界：把**重复出现**的工具类组合收敛成语义类（通常是为了复用或多页共享）；组件内部一次性的样式组合不需要它——直接写在 JSX/模板里更贴近原子化的本意。

## 按需生成的原理：扫描的是文本

Tailwind（v3 的 JIT、v4 的引擎）与 UnoCSS 都是**扫描源码文本、按需生成 CSS**：工具把项目里所有文件当纯文本扫描，凡出现过的完整类名字符串就生成对应规则，没出现的不生成。

这个原理直接推出两条铁律：

1. **动态拼接类名必然失效**：

```javascript
// 反例：源码文本里从未出现 "bg-red-500" 这个完整字符串
<div className={`bg-${color}-500`}>
```

   扫描器不做字符串运算，产物里没有 `bg-red-500`。正确做法是让**完整类名**出现在源码文本里（完整写出映射对象、或配置 safelist）。

2. **产物体积与项目规模解耦**：一千个页面可能只用到词表的三百个类，生成的 CSS 通常是几 KB 到几十 KB 且高度可缓存——这是原子化在性能上反直觉的优势。

## UnoCSS：规则引擎视角

UnoCSS 把「词表」抽象成可组合的规则系统，Tailwind 语法只是它的预设之一：

```javascript
// uno.config.ts
import { defineConfig, presetUno, presetAttributify } from 'unocss';

export default defineConfig({
  presets: [presetUno(), presetAttributify()],
  rules: [['text-primary', { color: '#2563eb' }]],
  shortcuts: {
    btn: 'px-4 py-2 rounded cursor-pointer',
    'btn-primary': 'btn bg-primary text-white hover:bg-primary/90',
  },
});
```

- `rules`：自定义「类名 → CSS 声明」的规则，任意扩展词表；
- `shortcuts`：工具类组合的别名（类似 `@apply` 的构建期版本）；
- `presetAttributify`：允许把工具类写进属性（`text="red-500"`），缓解 HTML 类名冗长。

选型结论：**Tailwind 生态最大、默认最稳；UnoCSS 定制自由度高、适合想要自己定词表的团队**。二者的心智模型完全一致，切换成本低。

## 常见坑与调试实录

**坑 1：动态拼接类名（见上文原理）。** 调试特征：类名写在 HTML 里、DevTools 里查无此类、生成的 CSS 里也搜不到。修复方向只有两个——完整类名出现在源码文本，或把动态值改为 CSS 变量/内联样式：

```javascript
// 动态值走变量，词表只收录稳定的类
<div className="bg-primary" style={{ '--tint': shade }}>
```

**坑 2：以为原子类能覆盖第三方样式。** 工具类与第三方库类名都在全局层，胜负由层叠与源顺序决定（回看[优先级计算](/css/170-PriorityCalculation)）；覆盖第三方组件优先用 `!` 重要前缀之外的正路——提高选择器特异性或用 Cascade Layers 分层。

**坑 3：HTML 类名爆炸后放弃思考。** 一行四百个工具类的 `div` 通常意味着「该抽组件了」或「该用 `@apply`/`shortcuts` 收敛了」。原子化的可读性靠组件封装维持，脱离组件框架裸写工具类才是它被批评的根源。

**坑 4：与语义类体系（BEM、CSS Modules）混用无章法。** 两种方案并存不是问题，问题是边界不明。常见分工：布局与间距用工具类，组件视觉主题用 module/语义类；写进团队规范比争论孰优孰劣有用。

## 与之前和之后的知识的关系

- 之前：[自定义属性](/css/410-CSSVariableCustomAttribute) 是词表的底层载体，v4 的 `@theme` 就是声明变量的语法糖；[优先级计算](/css/170-PriorityCalculation) 解释工具类覆盖为什么经常「看起来不生效」；
- 并行：[CSS Modules](/css/620-CSSModules) 解决命名冲突、原子化解决约束统一，二者解决的不是同一个问题，可以同项目共存；
- 之后：原子化产物是「静态可缓存」的典型，资源加载视角见[关键渲染路径优化](/css/550-CriticalRenderPathOptimization)。

## 自我检查

- 能用「词表」模型说清原子化的体积优势来自哪里；
- 能解释为什么 `bg-${color}-500` 必然失效，并给出两种修复方向；
- 知道 Tailwind v4 的配置入口是 CSS 里的 `@theme`，v3 才是 JS 配置文件。

## 小练习

### 练习 1：搭一个卡片（热身题）

任务：只用工具类实现一张卡片：白色圆角卡片、内边距 16、标题加粗、底部一个主色按钮，悬停时按钮颜色加深。先在纸上写出你打算用的类，再写 HTML。

提示：圆角 `rounded-lg`、内边距 `p-4`、加粗 `font-semibold`、主色来自 `@theme` 定义的 `--color-primary`。

参考实现：

```css
/* app.css */
@import "tailwindcss";
@theme {
  --color-primary: #2563eb;
}
```

```html
<div class="bg-white rounded-lg p-4 shadow">
  <h2 class="font-semibold text-lg mb-2">标题</h2>
  <button class="px-4 py-2 rounded bg-primary text-white hover:bg-primary/90">
    操作
  </button>
</div>
```

### 练习 2：修复失效的动态颜色（修 Bug 题）

任务：下面的代码想把状态映射成颜色，实际完全不生效。给出两种修复（映射对象方案与 safelist 方案），并说明各自的适用场景。

```jsx
const color = props.status === 'ok' ? 'green' : 'red';
return <span className={`text-${color}-500`}>{props.status}</span>;
```

提示：扫描器找的是完整类名字符串。

参考实现：

```jsx
// 方案一：完整类名映射（推荐，词表自动按需生成）
const statusClass = {
  ok: 'text-green-500',
  fail: 'text-red-500',
};
return <span className={statusClass[props.status] ?? 'text-gray-500'}>{props.status}</span>;

// 方案二：safelist（适合类名确实无法静态列出的场景，产物会变大）
// uno.config.ts / tailwind 配置里：
// safelist: ['text-green-500', 'text-red-500']
```

### 练习 3：词表收敛（挑战题）

任务：项目里有五处重复出现同样的按钮工具类组合。分别用 Tailwind 的 `@apply` 与 UnoCSS 的 `shortcuts` 收敛成一个语义类 `.btn-primary`，并写一段注释说明「什么时候不该做这种收敛」。

提示：只在组合被多处复用时收敛；组件内部一次性组合直接写。

参考实现：

```css
/* Tailwind 方案 */
.btn-primary {
  @apply px-4 py-2 rounded bg-primary text-white hover:bg-primary/90;
}
```

```javascript
// UnoCSS 方案
// uno.config.ts
shortcuts: { 'btn-primary': 'px-4 py-2 rounded bg-primary text-white hover:bg-primary/90' }
```

```html
<!-- 使用处 -->
<button class="btn-primary">提交</button>
```

## 下一步

- [CSS Modules](/css/620-CSSModules)：同属现代组件样式方案，对比两者解决的是不是同一个问题；
- [CSS 架构方法论](/css/560-CSSArchitectureMethodology)：把原子化放进团队整体的样式架构；
- [关键渲染路径优化](/css/550-CriticalRenderPathOptimization)：静态可缓存的 CSS 产物如何影响首屏。
