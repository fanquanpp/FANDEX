---
order: 70
title: Tailwind CSS 组件复用
module: 'tailwind'
category: 前端技术
difficulty: intermediate
description: Tailwind CSS 组件复用方案对比：纯工具类组件封装 / @apply 提取 / CSS 变量组合，配 cva + clsx + tailwind-merge 工程化实践，附适用场景决策表
author: fanquanpp
updated: '2026-09-08'
related:
  - 'tailwind/003-UtilityCore'
  - 'tailwind/005-ThemeCustomization'
prerequisites:
  - 'tailwind/003-UtilityCore'
---


## 0. 先打个比方：从"预制菜"到"中央厨房"

你一定见过预制菜：把洗好的菜、配好的料包封装在一起，拆开就能下锅，省去每天洗菜切菜的重复劳动。做网站也类似——同一个"蓝色圆角按钮"可能出现在全站几十个地方，如果每次都重新写一遍那 8 个工具类，改一次样式就要全站搜索替换，维护成本极高。

组件复用的本质，就是把"反复出现的工具类组合"沉淀为可复用的零件。就像餐饮行业的三种经营模式：

- **菜品封装**：中央厨房把标准菜式做成半成品（对应：纯工具类组件封装）；
- **调料包**：把固定的调料配比装成一包（对应：`@apply` 提取样式）；
- **统一供应链**：所有餐厅从同一供应商进货、共用一套原材料标准（对应：CSS 变量组合 + 设计令牌）。

本篇文章采用**对比驱动**的讲法：把三种主流复用方案放在一起对比——各自的写法、原理、优劣、适用场景，最后给出工程化组合方案（cva + clsx + tailwind-merge）和一张决策速查表。

## 1. 三种复用方案总览

先把三张"牌"摊开对比，心中有数再逐张细讲：

| 维度 | 方案一：组件封装 | 方案二：@apply 提取 | 方案三：CSS 变量组合 |
| --- | --- | --- | --- |
| 载体 | React/Vue 组件代码 | CSS（@layer components） | CSS 变量 + 设计令牌 |
| 典型语法 | `class="btn btn-primary"` | `@apply bg-blue-600 ...` | `bg-primary` + `var(--color-primary)` |
| 是否依赖框架 | 是（组件框架） | 否（纯 CSS） | 否（纯 CSS） |
| 变体支持 | 通过 props / cva | `@apply` 内可写 `dark:` 等 | 依赖令牌本身 |
| 适用项目 | React/Vue 等组件化项目 | 纯 HTML / 服务端模板 | 需要主题切换 / 多端复用的项目 |
| 可维护性 | 高（单一封装点） | 中（类名与 CSS 双处维护） | 高（改一处全站生效） |
| 学习成本 | 低 | 中 | 低 |

**核心结论先行**：组件框架项目首选"组件封装"（配合 cva 管理变体）；纯 HTML 项目用 `@apply`；主题相关的取值交给"CSS 变量组合"。三者并不互斥，可以组合使用。

## 2. 方案一：纯工具类组件封装（推荐）

### 2.1 直观理解

组件封装就像中央厨房的"菜品封装"：把一组工具类写进组件内部，调用方只传 props，无需关心内部样式。类名只出现一次，改样式只改组件文件。

### 2.2 React 示例：按钮组件

```tsx
// Button.tsx —— 类名只在这里出现一次
export function Button({ variant = 'primary', children }) {
  return (
    <button
      className={
        variant === 'primary'
          ? 'rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700'
          : 'rounded-lg bg-gray-100 px-4 py-2 font-medium text-gray-800 hover:bg-gray-200'
      }
    >
      {children}
    </button>
  )
}
```

```tsx
// 使用处：只关心业务，不关心样式
<Button variant="primary">提交</Button>
<Button>取消</Button>
```

### 2.3 为什么说"组件封装"是主流推荐

- **单一事实来源**：类名组合只存在组件文件里，全局搜索 `rounded-lg` 就能找到所有按钮；
- **类型安全**：TypeScript 的 props 定义天然约束了调用方的取值范围；
- **与框架生态契合**：React/Vue/Svelte 的组件模型就是为这种复用设计的。

## 3. 方案二：@apply 提取样式

### 3.1 直观理解

`@apply` 就像"调料包"：把一组工具类的"配方"装进一个自定义类名里，HTML 里写一个类名，编译时展开成整组样式。

### 3.2 基础用法

```css
/* src/styles/global.css */
@import "tailwindcss";

/* 在 components 层注册一个"半成品样式" */
@layer components {
  .btn-primary {
    @apply inline-flex items-center justify-center rounded-lg bg-blue-600
           px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700;
  }
}
```

```html
<!-- 使用处：一行类名，即可获得整组样式 -->
<button class="btn-primary">主按钮</button>
<a href="#" class="btn-primary">作为链接使用</a>
```

### 3.3 原理：@apply 做了什么事

`@apply` 不是运行时行为，而是**构建期的"宏展开"**：Tailwind 编译器在编译时把 `@apply` 后面的工具类逐个解析，把对应的 CSS 声明复制到 `.btn-primary` 规则里。你可以把编译结果想象成：

```css
.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  background-color: var(--color-blue-600);
  /* ...其他声明 */
}
.btn-primary:hover { background-color: var(--color-blue-700); }
```

`@apply` 内部还可以写变体和令牌类：

```css
@layer components {
  .card {
    @apply rounded-xl border border-gray-200 bg-white p-6 shadow-sm
           dark:border-gray-800 dark:bg-gray-900;
  }
}
```

### 3.4 注意：v4 中作用域样式里的 @apply

在 v4 中，如果要在 CSS Modules、Vue `<style scoped>`、Svelte `<style>` 这类**作用域样式**里使用 `@apply`，需要通过 `@reference` 指令引入主题令牌，否则编译器不知道 `bg-blue-600` 等类对应的值：

```css
/* Button.module.css —— 作用域样式中使用 @apply 需要 @reference */
@reference "../../styles/global.css";

.btn {
  @apply rounded-lg bg-blue-600 px-4 py-2 text-white;
}
```

### 3.5 @apply 的适用与不适用

- 适合：纯 HTML / 服务端模板项目；工具类组合确实过长、反复出现且不依赖框架的场景；
- 不适合：组件框架项目——**官方建议直接在组件里写工具类**，因为组件本身就是最好的封装，额外写一层 `@apply` 反而造成"类名与 CSS 两处维护"。

## 4. 方案三：CSS 变量组合（设计令牌）

### 4.1 直观理解

第三张牌最"隐形"却最根本：把颜色、间距、圆角等取值沉淀为设计令牌（承接第 5 篇），组件里全部使用语义类。这样"换肤"时只改令牌，所有组件自动跟随。

### 4.2 示例

```css
/* 主题层：定义语义令牌 */
@theme {
  --color-primary: #1677ff;
  --color-danger: #f5222d;
  --radius-card: 12px;
  --shadow-card: 0 2px 8px rgb(0 0 0 / 0.08);
}
```

```html
<!-- 组件层：只使用语义类，不出现具体色值 -->
<button class="bg-primary text-white rounded-card px-4 py-2">提交</button>
<div class="bg-white shadow-card rounded-card p-6">卡片</div>
```

### 4.3 与方案一、二的组合

方案三的威力在于"打底"：它让方案一的组件 props 值和方案二的 `@apply` 内容都建立在稳定的语义令牌之上。例如按钮组件里写 `bg-primary` 而不是 `bg-blue-600`，未来品牌换色时组件代码零改动。

## 5. 工程化组合：cva + clsx + tailwind-merge

当组件出现多个维度（variant、size、状态）时，手工三元表达式会爆炸。业界（shadcn/ui 等主流实践）的标准答案是三个小工具组合使用。

### 5.1 clsx：条件类名的可读写法

`clsx` 是一个不到 300 字节的小库，支持字符串、对象、数组，自动过滤 `false`/`null`/`undefined`：

```ts
import { clsx } from 'clsx'

// 写法一：逻辑与 —— 条件成立才拼接
const a = clsx('px-4 py-2', isActive && 'bg-blue-600 text-white')

// 写法二：对象 —— 键是类名，值是布尔条件
const b = clsx({ 'bg-blue-600 text-white': isActive, 'opacity-50': isDisabled })
```

### 5.2 tailwind-merge：解决类名冲突

有一个关键陷阱：**CSS 里最后定义的规则优先，与 HTML class 属性中字符串的顺序无关**。如果组件内部有 `bg-blue-600`，调用方传 `bg-red-500`，最终元素 class 是 `bg-blue-600 bg-red-500`，谁生效取决于编译产物顺序，结果不可预测。

`tailwind-merge` 能识别 Tailwind 类的语义，**保留同组类中靠后的那一个**：

```ts
import { twMerge } from 'tailwind-merge'

twMerge('bg-blue-600 text-white', 'bg-red-500')
// => 'bg-red-500 text-white'（都是背景色，后者胜出）
```

### 5.3 cva：变体的一等公民

`cva`（class-variance-authority）用声明式配置管理组件的多维度变体：

```ts
import { cva, type VariantProps } from 'class-variance-authority'

// 定义按钮的变体体系：variant × size 两个维度
const buttonVariants = cva(
  // 基础样式：始终存在
  'inline-flex items-center justify-center rounded-md font-medium transition-colors',
  {
    variants: {
      variant: {
        primary:   'bg-blue-600 text-white hover:bg-blue-700',
        secondary: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
        danger:    'bg-red-500 text-white hover:bg-red-600',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-base',
        lg: 'h-12 px-6 text-lg',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
)

// 提取类型：调用方 props 自动获得类型提示
type ButtonProps = VariantProps<typeof buttonVariants>
```

### 5.4 组合成 cn()：完整组件

把三者串起来，就得到 shadcn/ui 同款的标准写法：

```ts
// lib/utils.ts —— 全项目共享的 cn 工具函数
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

```tsx
// Button.tsx —— 变体 + 外部覆盖两不误
import { cn } from '@/lib/utils'
import { buttonVariants } from './button-variants'

export function Button({ variant, size, className, children }) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
    >
      {children}
    </button>
  )
}
```

```tsx
// 使用处：可以精细化覆盖任意样式
<Button variant="danger" size="lg" className="w-full dark:bg-red-400">
  全宽危险按钮
</Button>
```

工作流程说明：`cva` 负责按 variant/size 生成基础类名 → `clsx` 负责拼接条件类名 → `twMerge` 负责消除冲突（外部 `className` 的 `w-full` 不会与内部的宽度类打架）。

## 6. 补充零件：@utility 自定义工具类

如果需要一个"不属于任何组件、也不属于默认工具类"的新能力，v4 提供了 `@utility` 指令（上一篇文章介绍过）。它和 `@apply` 的区别在于：`@apply` 是"组合已有工具类"，`@utility` 是"创建全新的工具类"：

```css
/* 创建全新工具类：文字渐变 */
@utility text-gradient {
  background-image: linear-gradient(to right, #1677ff, #722ed1);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
```

```html
<!-- 像内置工具类一样支持变体 -->
<h2 class="text-gradient hover:opacity-80">渐变标题</h2>
```

## 7. 复用决策速查表

| 场景 | 推荐方案 | 理由 |
| --- | --- | --- |
| React/Vue/Svelte 组件框架项目 | 组件封装 + 工具类（不写 @apply） | 组件本身就是封装层，避免双处维护 |
| 组件有多种变体（primary/secondary/size） | cva + cn() | 声明式变体管理 + 类型安全 |
| 需要允许调用方覆盖样式 | cn()（clsx + tailwind-merge） | 冲突可预测，后者胜出 |
| 纯 HTML / 服务端模板项目 | `@apply` 提取组件类 | 无组件框架，CSS 是最合适的封装层 |
| CSS Modules / Vue scoped 中用 @apply | `@reference` + `@apply` | 让作用域样式认识主题令牌 |
| 全新的、不属于任何组件的工具能力 | `@utility` | 原生指令，支持变体 |
| 品牌换色 / 多主题切换 | 设计令牌（方案三）打底 | 改一处、全站生效 |

## 8. 常见错误与对策

| 常见错误 | 报错 / 现象 | 原因 | 解决办法 |
| --- | --- | --- | --- |
| 组件内部与外部类名冲突（`bg-blue-600` + `bg-red-500`） | 颜色时对时错、结果不确定 | CSS 优先级取决于编译产物顺序，与 class 书写顺序无关 | 用 `twMerge` / `cn()` 合并类名 |
| 在 CSS Modules 里用 `@apply` | 编译报错"找不到工具类" | 作用域样式不知道主题令牌 | 文件头部加 `@reference` 引入主题文件 |
| 把 `@apply` 写进 `<style scoped>` 而缺 `@reference` | 类名解析失败 | 同上 | 同上 |
| 组件项目里滥用 `@apply` 包一层类 | 类名与 CSS 双处维护，改一处漏一处 | 组件本身就是封装层，`@apply` 冗余 | 直接在组件里写工具类 |
| 手写三元表达式拼接变体（`${v==='x'?'...':'...'}`） | 可读性差、容易写错 | 缺少变体管理工具 | 改用 cva |
| `@apply` 里用了未定义的类名 | 编译报错 `Cannot apply unknown utility class` | 类名拼写错误或令牌未定义 | 检查拼写；自定义类先定义在 `@theme` 中 |
| 忘记给组件加 `className` 透传 | 调用方无法覆盖样式 | 组件没有接收外部类名 | 组件 props 增加 `className` 并用 `cn()` 合并 |

## 10. 一句话记忆

**复用三板斧：组件封装管结构（框架项目首选）、`@apply` 管纯 CSS 沉淀、设计令牌管全局取值；工程化收尾用 `cva + cn()` 管变体和类名冲突——先定方案，再写代码。**
