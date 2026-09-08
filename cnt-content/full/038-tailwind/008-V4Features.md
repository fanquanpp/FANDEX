---
order: 80
title: Tailwind CSS v4 新特性
module: 'tailwind'
category: 前端技术
difficulty: intermediate
description: Tailwind CSS v4 新特性时间线：Oxide 引擎、CSS-first 配置、自动内容检测、@tailwindcss/vite 插件、原生 @layer 级联与 @source/@utility/@custom-variant 新语法
author: fanquanpp
updated: '2026-09-08'
related:
  - 'tailwind/002-InstallConfig'
  - 'tailwind/005-ThemeCustomization'
prerequisites:
  - 'tailwind/002-InstallConfig'
---


## 0. 先打个比方：汽车界的"年度改款"

汽车品牌每年都会发布"年度改款"：外观小改、发动机升级、车机系统换代，但方向盘还是方向盘、油门还是油门——**核心驾驶逻辑不变，体验全面提升**。有的年份是"换代"级别的大改，连平台架构都推倒重来。

Tailwind CSS v4 就是一次"**换代级改款**"。2025 年 1 月 22 日，Tailwind 团队正式发布 v4.0，发布公告的第一句话就是"这是一个从零重写的全新框架"。发动机（构建引擎）从 JavaScript 换成了 Rust，中控系统（配置文件）从 JS 文件搬进了 CSS，还全系标配了此前需要加装的功能（容器查询、3D 变换等）。

本篇文章采用**时间线驱动**的讲法：沿着"v3 时代 → v4.0 发布 → v4.1/v4.2/v4.3 迭代"的时间轴，逐个拆解 v4 的核心变化。了解"为什么变"，比记住"变成什么"更重要。

## 1. 版本演进时间线

| 时间 | 版本 | 里程碑 |
| --- | --- | --- |
| 2017 年底 | v0.x | 框架诞生，Utility-First 理念确立 |
| 2021 年 | v2.x | 引入 JIT 模式雏形 |
| 2022 年 | v3.0 | JIT 成为默认，`tailwind.config.js` 时代 |
| 2025-01-22 | v4.0 | 从零重写：Rust 引擎 Oxide、CSS-first 配置、自动内容检测 |
| 2025-2026 | v4.1 / v4.2 | 新增 webpack 插件、新调色板、逻辑属性工具类等 |
| 2026-05 | v4.3 | 持续迭代：性能与细节继续完善 |

对学习者最有意义的对照是 **v3 与 v4 的架构对比**：

| 特性 | v3 | v4 |
| --- | --- | --- |
| 构建引擎 | Node.js + PostCSS | Rust（Oxide） |
| 配置方式 | tailwind.config.js | CSS（@theme） |
| 内容扫描 | content 数组 | 自动检测 + @source |
| 安装集成 | PostCSS 插件为主 | @tailwindcss/vite 首选 |
| 暗色模式 | darkMode: 'class' 配置 | dark: 默认跟随系统，@custom-variant 自定义 |
| 容器查询 | 官方插件 | 内置 |
| 色彩空间 | RGB/HEX | OKLCH（P3） |

## 2. 第一大变化：Oxide Rust 引擎，快 100 倍

### 2.1 直观理解

v3 的构建管线是"JavaScript 跑在 Node 上"，就像一辆 1.5L 自吸发动机；v4 用 Rust 重写了整个编译管线（解析器、内容扫描器、CSS 生成器全部编译为 Rust 原生代码），并内嵌了 Lightning CSS（前缀补全、压缩、降级一体化），相当于换上了涡轮增压。

### 2.2 官方基准数据（来自 v4 发布公告）

Tailwind 团队在自己的 Catalyst 项目上做的实测：

| 场景 | v3.4 | v4.0 | 提升倍数 |
| --- | --- | --- | --- |
| 全量构建 | 378ms | 100ms | 约 3.8 倍 |
| 增量重建（有新 CSS） | 44ms | 5ms | 约 8.8 倍 |
| 增量重建（无新 CSS） | 35ms | 192µs | 约 182 倍 |

最后一个数字最有意义：**当你复用已生成的类名时，增量构建在微秒级完成**——热更新（HMR）从"明显等待"变成"几乎瞬时"。真实项目体感：大型设计系统全量构建从 4 秒级降到 1 秒以内。

### 2.3 附带收益：安装体积减半

v4 的 `tailwindcss` 包通过可选依赖携带平台对应的 Rust 二进制，整体安装体积约 15MB，而 v3 的 JavaScript 依赖链约 45MB。对开发者完全透明——按 v4 方式安装即可自动获得全部性能收益，无需任何调优参数。

## 3. 第二大变化：CSS-first 配置

### 3.1 从 JS 配置到 CSS 配置

v4 最大的开发者可见变化：`tailwind.config.js` 不再需要。所有主题定制通过 `@theme` 块在 CSS 中完成（详见第 5 篇）：

```css
/* src/styles/global.css —— 唯一的配置与入口 */
@import "tailwindcss";

@theme {
  --color-primary: oklch(0.623 0.214 259.8);
  --font-sans: "Inter", system-ui, sans-serif;
  --breakpoint-3xl: 1920px;
}
```

`@theme` 中每个 `--var` 既是 CSS 变量，又自动生成对应工具类（`bg-primary`、`font-sans`、`3xl:` 前缀）。三行 `@tailwind base/components/utilities` 指令也合并为一行 `@import "tailwindcss"`。

### 3.2 CSS-first 带来的三个收益

- **心智简化**：不用在 JS 对象与 CSS 之间来回翻译，样式概念全部在 CSS 中表达；
- **调试友好**：令牌变量直接暴露在浏览器 `:root` 中，DevTools 可直接修改验证；
- **生态统一**：设计与工程共用同一份 CSS 变量，设计稿上的令牌能一字不差落到代码，设计同学也能直接读懂。

## 4. 第三大变化：自动内容检测

### 4.1 告别 content 数组

v3 必须在 `tailwind.config.js` 里手写 `content: ['./src/**/*.{html,js,ts,jsx,tsx}']`，漏配一个目录就少一堆样式——这是 v3 最常见的配置错误。v4 的 Oxide 引擎会**自动扫描项目中的模板文件**（HTML/JSX/TSX/Vue/Svelte/PHP 等），并根据 `.gitignore` 规则自动忽略依赖目录与二进制文件：

```css
/* v4：零配置自动检测 */
@import "tailwindcss";

/* 仅当类名出现在扫描范围之外时，用 @source 补充 */
@source "../shared-components";

/* 排除某些目录 */
@source not "../legacy";
```

### 4.2 @source 的进阶用法

某些场景下类名是"动态生成"的（如数据库里的类名、配置文件拼出的类名），可以用 `@source inline()` 强制纳入扫描：

```css
/* 把 JS 文件里的完整类名也纳入扫描 */
@source inline("./src/config/theme.js");
```

> 注意：无论 v3 还是 v4，**运行时拼接的类名（`bg-${color}-500`）都不会被扫描到**，因为扫描器读的是源码文本而非运行时结果。完整类名 + 映射表是唯一可靠做法。

## 5. 第四大变化：@tailwindcss/vite 首选插件

### 5.1 集成方式大洗牌

v3 时代 PostCSS 插件是标准集成方式；v4 把集成优先级调整为：

1. **Vite 插件 `@tailwindcss/vite`**：首选，与 Vite 开发服务器深度集成，CSS 变换在 dev server 内部完成，性能最佳；
2. **CLI `@tailwindcss/cli`**：适合无打包器的静态站点（Hugo 等）；
3. **PostCSS 插件 `@tailwindcss/postcss`**：保留用于兼容 Next.js 等仍走 PostCSS 管线的框架。

```bash
# v4 + Vite 安装：只需两个包
pnpm add tailwindcss @tailwindcss/vite
```

```ts
// vite.config.ts —— 注册插件
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [tailwindcss()],
})
```

```css
/* src/styles/global.css —— 入口只剩一行 */
@import "tailwindcss";
```

对比 v3 的安装（`tailwindcss` + `postcss` + `autoprefixer` + 两个配置文件），v4 真正做到了"开箱即用"。注意 `@tailwindcss/vite` 要求 Vite 5 及以上版本。

## 6. 第五大变化：原生 @layer 级联

### 6.1 从"指令"到"原生级联层"

v4 全面采用 CSS 原生级联层（Cascade Layers）组织样式。`@import "tailwindcss"` 内部实际是：

```css
/* node_modules/tailwindcss/index.css 的简化视图 */
@layer theme, base, components, utilities;
@import "./theme.css" layer(theme);      /* 设计令牌 */
@import "./preflight.css" layer(base);    /* 样式重置 */
@import "./utilities.css" layer(utilities); /* 工具类 */
```

四个内置层的优先级（后者覆盖前者）：

| 层 | 内容 | 优先级 |
| --- | --- | --- |
| `theme` | 设计令牌（`--color-*` 等变量） | 1（最低） |
| `base` | Preflight 重置、基础样式 | 2 |
| `components` | `@apply` 提取的组件类 | 3 |
| `utilities` | 工具类 | 4（最高） |

这个设计的工程含义：**组件类天然被工具类覆盖**——元素同时有组件类和工具类时，工具类胜出，所以"在组件基础上用工具类微调"永远有效，不需要 `!important`。

### 6.2 自定义样式放进正确层级

```css
@import "tailwindcss";

/* 全局基础样式放 base 层，可被工具类覆盖 */
@layer base {
  body { @apply antialiased text-gray-800; }
}

/* 组件样式放 components 层 */
@layer components {
  .btn-primary { @apply rounded-lg bg-blue-600 px-4 py-2 text-white; }
}
```

## 7. 新语法全家桶：@source / @utility / @custom-variant / @reference

v4 把 v3 需要写 JS 插件才能完成的事，全部搬进 CSS 指令：

| 指令 | 替代 v3 的什么 | 用途 |
| --- | --- | --- |
| `@source` | `content` 数组 | 补充/排除扫描范围 |
| `@utility` | `plugin` 注册工具类 | 定义全新工具类，支持变体 |
| `@custom-variant` | `darkMode` 等变体配置 | 自定义变体（如 class 策略暗色） |
| `@reference` | 无（新增） | 作用域样式中引用主题令牌 |
| `@config` | 保留兼容 | 仍想用 JS 配置时的过渡通道 |
| `@plugin` | `plugins` 数组 | 加载第三方插件（如 typography） |

```css
/* @utility：全新工具类 */
@utility text-gradient {
  background-image: linear-gradient(to right, #1677ff, #722ed1);
  background-clip: text;
  color: transparent;
}

/* @custom-variant：class 策略暗色模式 */
@custom-variant dark (&:where(.dark, .dark *));

/* @plugin：加载官方排版插件 */
@plugin "@tailwindcss/typography";
```

## 8. 内置能力扩容：从"加装"到"标配"

v4 把大量此前需要插件的功能直接内置：

| 能力 | v3 状态 | v4 状态 | 示例 |
| --- | --- | --- | --- |
| 容器查询 | `@tailwindcss/container-queries` 插件 | 内置 | `@container` + `@lg:grid-cols-3` |
| 3D 变换 | 无 | 内置 | `rotate-x-45`、`perspective-*` |
| scrollbar 样式 | 手写 `::-webkit-scrollbar` | 内置工具类 | `scrollbar-thin`、`scrollbar-thumb-gray-400` |
| 入场动画 | JS 库或手写 | `@starting-style` 支持 | 元素出现时平滑过渡 |
| `not-*` 变体 | 无 | 内置 | 非匹配时应用样式 |
| 渐变增强 | 基础 | radial/conic 渐变、插值模式 | `bg-radial`、`bg-conic` |

```html
<!-- 容器查询：子元素根据父容器宽度自适应（v3 需要插件） -->
<div class="@container">
  <div class="grid grid-cols-1 @lg:grid-cols-3">
    <div>父容器达到 lg 宽度时变三列</div>
  </div>
</div>
```

## 9. 全新调色板：OKLCH 与 P3

v4 的默认调色板重新设计，改用 OKLCH 色彩空间并支持 P3 广色域：

| 维度 | v3 调色板 | v4 调色板 |
| --- | --- | --- |
| 色彩空间 | RGB | OKLCH |
| 色阶数量 | 每色相 10 阶（50-900） | 每色相 11 阶（50-950） |
| 色相覆盖 | 22 个 | 22 个（含新增 olive 等） |
| 视觉均匀度 | 部分色阶过渡不均 | 亮度、饱和度过渡均匀 |

**迁移警示**：因为色彩空间改变，同一色阶号（如 `blue-500`）在 v4 下的最终显示颜色与 v3 不同。迁移后视觉观感可能变化，重点页面需逐页核对品牌色。

## 10. 迁移指南：v3 到 v4

### 10.1 安装与入口

```bash
# 安装 v4 及相关插件
pnpm add tailwindcss @tailwindcss/vite
```

```css
/* 旧入口（v3） */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* 新入口（v4） */
@import "tailwindcss";
```

### 10.2 配置迁移示例

```css
/* 旧 tailwind.config.js 的 theme.extend 转写为： */
@theme {
  --color-brand-500: #1677ff;
  --font-sans: "Inter", sans-serif;
}
```

暗色模式配置迁移：

```css
/* 旧：tailwind.config.js 中 darkMode: 'class' */
/* 新：CSS 中自定义变体 */
@custom-variant dark (&:where(.dark, .dark *));
```

### 10.3 官方自动化迁移工具

```bash
# 官方升级工具：自动重写 CSS 入口、迁移配置、处理常见语法差异
npx @tailwindcss/upgrade
```

建议在独立 git 分支上执行，逐条审查改动后再合并。官方还提供了完整的升级指南文档（见文末链接）。

### 10.4 常见破坏性变化自查清单

- **默认边框颜色**：v3 默认 `border` 为 gray-200，v4 默认使用 `currentColor`，涉及边框需显式指定颜色；
- **调色板观感**：OKLCH 下同一色号显示不同，重点检查品牌色；
- **阴影与圆角**：`shadow-sm` 等阴影值微调，容器圆角默认值有变化；
- **动态类名**：`bg-${color}-500` 拼接在 v4 中同样不被扫描，改用完整类名或映射表；
- **浏览器要求**：v4 要求现代浏览器（Chrome 111+、Safari 16.4+、Firefox 128+），不支持 IE11。

### 10.5 是否值得迁移

| 场景 | 建议 |
| --- | --- |
| 新项目 | 直接用 v4，无历史包袱 |
| 中小型 v3 项目 | 迁移成本低，收益明显（性能 + 配置简化），建议迁移 |
| 大型 v3 项目 | 评估调色板观感变化与插件生态兼容性后，分批迁移 |
| 深度依赖 v3 生态插件 | 先确认插件已支持 v4 再迁移 |

## 11. 常见错误与对策

| 常见错误 | 报错 / 现象 | 原因 | 解决办法 |
| --- | --- | --- | --- |
| 还在写 `@tailwind base; @tailwind components; @tailwind utilities;` | 样式完全不生效 | v4 已废弃三行指令 | 改为 `@import "tailwindcss"` |
| 仍创建 tailwind.config.js 配置主题 | 配置不生效 | v4 的配置在 CSS 中 | 用 `@theme` 块；确有需要可用 `@config` 过渡 |
| 安装了 PostCSS 插件方式却期望 Vite 速度 | 集成报错或不工作 | v4 首选 Vite 插件 | 使用 `@tailwindcss/vite`；Next.js 等框架用 `@tailwindcss/postcss` |
| 忘记 `border` 显式指定颜色 | 边框变成文字颜色（currentColor） | v4 默认边框色改为 currentColor | 显式写 `border-gray-200` 等 |
| 迁移后发现品牌色观感全变 | 同一色号颜色不同 | 调色板从 RGB 换成 OKLCH | 核对重点色号，必要时用自定义 `--color-*` 固定品牌值 |
| 拼接类名 `bg-${color}-500` | 样式缺失且无报错 | 扫描器只识别源码中的完整类名 | 用完整类名或映射表 |
| v3 插件在 v4 中报错 | 插件加载失败 | 部分 v3 插件尚未适配 v4 | 查插件文档；用 `@utility`/`@custom-variant` 原生替代 |

## 13. 一句话记忆

**v4 = 换发动机（Rust 的 Oxide，快 100 倍）+ 换中控（配置搬进 CSS 的 @theme）+ 全系标配（容器查询、OKLCH、新语法全家桶）——"改款"之后，功能更强、上手更简单。**
