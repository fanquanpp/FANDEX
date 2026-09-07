---
order: 20
title: Tailwind CSS 安装与配置
module: 'tailwind'
category: 前端技术
difficulty: beginner
description: Tailwind CSS 安装与配置：Vite/React/Astro 项目接入教程、@import 与 @source 详解、Tailwind 3 与 4 配置差异对照
author: fanquanpp
updated: '2026-08-30'
related:
  - 'tailwind/003-UtilityCore'
  - 'css/008-CSS3SelectorSystem'
prerequisites:
  - 'css/008-CSS3SelectorSystem'
---


## 0. 装修开工前的准备

把写网页比作装修一套房子：HTML 是房子的结构（墙、门、窗的位置），CSS 是装修（墙面的颜色、家具的摆放）。而 Tailwind 就是一套"预制墙板 + 标准五金件"的装修方案——但再好的建材，也得先完成"水电进场、工具就位"才能开工。本篇文章就是安装配置的"开工手册"。

装修开工前要做三件事：确认房屋属于哪种户型（项目类型）、确认水电到位（Node.js 环境）、选择施工方案（接入方式）。对应到 Tailwind 就是：

第一，判断项目类型：是 Vite 脚手架项目（React/Vue/Svelte/Astro），还是 Next.js 这类基于 webpack 的项目，还是完全没有构建工具的纯 HTML 页面——不同项目对应不同接入方式。

第二，确认环境就绪：Tailwind 4 的安装与构建依赖 Node.js 20 及以上版本，先运行 `node -v` 检查版本。

第三，选择接入方式：Vite 插件（推荐）、PostCSS 插件、CLI 工具，三者取其一。

下文按"操作向导"的方式，手把手带你完成每一步。你可以对照自己的项目类型，选择对应章节执行。

## 1. 开工检查清单

在执行任何安装命令之前，先完成三项检查：

```bash
# 检查 Node.js 版本：v4 的安装与构建要求 Node.js 20 及以上
node -v

# 检查包管理器：npm / pnpm / yarn 任一即可，本文以 pnpm 为例
pnpm -v

# 确认当前目录是项目根目录（package.json 所在位置）
ls package.json
```

如果 `node -v` 输出的版本低于 v20，请先升级 Node.js。Tailwind 4 依赖新版 Node 运行时，版本过低会导致安装或构建报错。

项目类型判断口诀：**有 Vite 用插件，有 PostCSS 链条用 PostCSS，什么都没有用 CLI**。三种方式最终殊途同归——都在入口 CSS 里写一行 `@import "tailwindcss";`，区别只在于"谁来编译"。

## 2. 方式一：Vite 插件接入（官方推荐，最省心）

这是官方文档首推的方式，适用于 Vite 项目以及所有基于 Vite 的框架（React、Vue、Svelte、SolidJS、Astro 等）。整个接入过程只有五步。

### 第 1 步：创建 Vite 项目

如果你还没有项目，用脚手架创建一个（已有项目可跳过本步）：

```bash
# 创建 React + TypeScript 模板项目
npm create vite@latest my-project -- --template react-ts
cd my-project
npm install
```

### 第 2 步：安装 Tailwind 核心包与 Vite 插件

```bash
pnpm add tailwindcss @tailwindcss/vite
```

讲解：这里安装两个包。`tailwindcss` 是框架核心（内含 Oxide 编译引擎）；`@tailwindcss/vite` 是官方 Vite 专用插件，负责把 Tailwind 挂进 Vite 的构建管线。使用 npm 或 yarn 时命令等价（`npm install` / `yarn add`）。

### 第 3 步：在 vite.config.ts 中注册插件

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // 注册 Tailwind 插件，无需任何配置对象
  ],
})
```

讲解：在 `plugins` 数组中加入 `tailwindcss()` 即可。注意 v4 必须从 `@tailwindcss/vite` 包导入，而不是从 `tailwindcss` 包导入——老教程里常见的 `import tailwindcss from 'tailwindcss'` 是 v3 的 PostCSS 用法，在 v4 中会报 `tailwindcss is not defined` 之类的错误。

### 第 4 步：创建入口 CSS 并写入一行导入

```css
/* src/index.css：项目全局样式入口 */
@import "tailwindcss";
```

这一行是 v4 的全部"安装内容"。它做了三件事：引入 Preflight 基础重置样式、注入默认主题变量（颜色、间距、字号等设计令牌）、挂载全部工具类生成的管线。v3 时代需要 `@tailwind base;`、`@tailwind components;`、`@tailwind utilities;` 三行指令，v4 全部合并进这一行。

### 第 5 步：在应用入口引入 CSS 并启动

```ts
// src/main.ts
import { createRoot } from 'react-dom/client'
import './index.css' // 全局引入一次即可

createRoot(document.getElementById('root')!).render(<App />)
```

```bash
# 启动开发服务器
npm run dev
```

验证方法：在任意组件中写 `<div className="bg-blue-500 p-4 text-white">你好，Tailwind</div>`，页面出现蓝色圆角白字方块，即安装成功。

Vite 插件的额外红利：开发时类名变更会通过 HMR（热更新）即时生效，无需手动刷新；生产构建时自动完成 tree-shaking，只输出被扫描到的类。

## 3. 方式二：PostCSS 接入（Next.js / webpack 生态）

如果你的项目使用 Next.js App Router、Nuxt 或自定义 webpack 构建链，推荐使用 PostCSS 方式。

### 第 1 步：安装依赖

```bash
pnpm add tailwindcss @tailwindcss/postcss
```

讲解：注意插件包名是 `@tailwindcss/postcss`，与 v3 直接在 `tailwindcss` 包内嵌 PostCSS 插件不同。v4 把 PostCSS 插件独立成包。同时，v4 已自动处理 `@import` 与浏览器前缀（vendor prefix），因此项目中旧的 `postcss-import` 和 `autoprefixer` 都可以移除。

### 第 2 步：配置 postcss.config.mjs

```js
// postcss.config.mjs
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
```

### 第 3 步：在全局样式文件中导入

以 Next.js App Router 为例，在 `app/globals.css` 中写入：

```css
/* app/globals.css */
@import "tailwindcss";
```

Next.js 的 Layout 组件已默认引入 `globals.css`，无需额外改动入口文件。启动 `npm run dev` 后即可使用工具类。

## 4. 方式三：CLI 接入（纯 HTML 项目）

没有构建工具的静态 HTML 项目，用官方 CLI 独立编译 CSS，三行命令搞定。

### 第 1 步：安装 CLI 并创建输入文件

```bash
# 初始化 npm 项目（已有 package.json 可跳过）
npm init -y

# 安装 CLI 工具
npm install -D @tailwindcss/cli
```

创建 `src/input.css`，写入导入指令：

```css
/* src/input.css */
@import "tailwindcss";
```

### 第 2 步：编译并监听

```bash
# 开发模式：监听文件变化，实时重编译
npx @tailwindcss/cli -i ./src/input.css -o ./dist/output.css --watch

# 生产构建：压缩输出
npx @tailwindcss/cli -i ./src/input.css -o ./dist/output.css --minify
```

讲解：`-i` 指定输入 CSS，`-o` 指定输出文件，`--watch` 开启监听模式，`--minify` 压缩体积。建议把命令写入 `package.json` 的 scripts：

```json
{
  "scripts": {
    "dev": "@tailwindcss/cli -i ./src/input.css -o ./dist/output.css --watch",
    "build": "@tailwindcss/cli -i ./src/input.css -o ./dist/output.css --minify"
  }
}
```

然后在 HTML 中引入编译产物：

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <link rel="stylesheet" href="./dist/output.css">
</head>
<body class="bg-gray-50">
  <h1 class="text-3xl font-bold text-blue-600">你好，Tailwind CSS</h1>
</body>
</html>
```

## 5. Astro 项目接入

Astro 底层使用 Vite，因此接入方式与第 2 节几乎一致，只有配置位置不同：插件要挂在 `astro.config.mjs` 的 `vite` 字段下。

### 第 1 步：安装依赖

```bash
pnpm add tailwindcss @tailwindcss/vite
```

### 第 2 步：注册插件

```js
// astro.config.mjs
import { defineConfig } from 'astro/config'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
  },
})
```

### 第 3 步：在全局布局中导入 CSS

```css
/* src/styles/global.css */
@import "tailwindcss";
```

```astro
---
// src/layouts/Base.astro
import '../styles/global.css'
---
<html lang="zh-CN">
  <body>
    <slot />
  </body>
</html>
```

之后即可在任意 `.astro` 组件的模板中直接使用工具类。注意：Astro 在 v3 之前有官方的 `@astrojs/tailwind` 集成包，v4 之后官方推荐直接用 Vite 插件方式，二者选其一，不要重复配置。

## 6. 深度理解：@import "tailwindcss" 到底做了什么

这一行导入是 v4 安装配置的核心。它展开后包含三层内容：

第一，**Preflight 基础层**。一套现代 CSS 重置样式：消除浏览器默认的外边距、统一盒模型（`box-sizing: border-box`）、重置标题字号、规范表单控件外观等，让所有浏览器从同一起跑线开始渲染。

第二，**主题变量层（Theme）**。注入默认设计令牌，全部以 CSS 变量形式暴露，例如 `--color-blue-500`、`--spacing-4`、`--font-sans`。这些变量既是工具类生成的依据，也能在自定义 CSS 中直接引用。

第三，**工具类层（Utilities）**。挂载工具类生成管线——框架扫描源文件中的类名，按需生成对应的 CSS 规则。最终产物只包含你用到的类。

此外 v4 采用原生级联层（`@layer theme, base, components, utilities`）管理样式优先级，工具类总是位于最后、优先级最高，因此自定义 CSS 很难"误伤"工具类。

## 7. @source：手动控制扫描范围

v4 最大的配置简化之一：不再需要 `tailwind.config.js` 里的 `content` 数组。框架会自动扫描项目中的模板文件（入口 CSS 所在项目的公共源码根目录，如 `src`），自动忽略 `.gitignore` 中忽略的文件与二进制文件。

但有两种情况需要手动声明 `@source`：

- 类名写在自动扫描范围之外的目录（例如 monorepo 中单独放置的组件包）。
- 第三方组件库的样式依赖 Tailwind 类名，需要把这些库的源码纳入扫描。

```css
/* src/styles/global.css */
@import "tailwindcss";

/* 手动声明需要扫描的目录 */
@source "../components";
@source "../node_modules/@my-lib/ui";

/* 支持 glob 通配符 */
@source "../views/**/*.html";

/* 支持排除规则 */
@source not "../src/**/*.test.tsx";
```

`@source` 的三个要点：

第一，路径是相对于入口 CSS 文件所在目录的。

第二，类名必须是完整的字符串。`bg-${color}-500` 这类动态拼接的类名无法被扫描识别，需要把完整类名字符串列出来，或用 `@source inline("bg-red-500 bg-blue-500")` 之类的内联声明强制收录。

第三，新增 `@source` 后开发服务器通常会自动重扫；若未生效，重启开发服务器即可。

## 8. Tailwind 3 vs 4：配置方式对照

| 对比项 | Tailwind 3 | Tailwind 4 |
| --- | --- | --- |
| 配置位置 | `tailwind.config.js`（JS 文件） | CSS 文件中的 `@theme` 指令 |
| 导入方式 | `@tailwind base;` + `@tailwind components;` + `@tailwind utilities;` | 一行 `@import "tailwindcss";` |
| 扫描配置 | `content: ['./src/**/*.{js,ts,jsx}']` | 自动检测 + 可选 `@source` |
| PostCSS 插件 | 内置在 `tailwindcss` 包 | 独立包 `@tailwindcss/postcss` |
| Vite 集成 | 需走 PostCSS 链 | 原生插件 `@tailwindcss/vite` |
| CLI 工具 | `npx tailwindcss -i ...` | 独立包 `@tailwindcss/cli` |
| 自定义工具类 | `@layer components` + `@apply` | `@utility` 指令 |
| 不透明度 | `bg-opacity-50` 单独类 | `bg-black/50` 斜杠修饰符 |
| 弹性伸缩 | `flex-shrink-0` / `flex-grow` | `shrink-0` / `grow` |
| 浏览器要求 | 较宽松 | Safari 16.4+ / Chrome 111+ / Firefox 128+ |
| 构建引擎 | JS（JIT） | Rust 编写的 Oxide 引擎 |

旧项目升级到 v4，官方提供了自动升级工具，能完成依赖更新、配置迁移等大部分工作：

```bash
# 需要 Node.js 20+
npx @tailwindcss/upgrade
```

官方建议在独立分支运行升级工具，仔细审查 diff 后再合入。

## 9. 安装后的自检清单

完成安装后，用以下五项快速验证环境是否正确：

第一，页面出现 Preflight 重置效果：比如默认 `h1` 不再有巨大的浏览器默认字号和边距，说明基础层生效。

第二，写一个明显的类（如 `bg-red-500`）后样式即时出现，说明类名扫描正常。

第三，尝试一个状态变体（如 `hover:bg-blue-600`），悬停后颜色变化，说明变体编译正常。

第四，在 `vite.config.ts` / 样式文件中故意写错一个类名，页面不应报错，只是样式不生效——工具类天然"静默降级"。

第五，执行生产构建，检查输出 CSS 体积：v4 的 tree-shaking 保证只保留被扫描到的类，几十个组件的项目产物通常在几十 KB 以内。

## 10. 常见错误与对策

| 错误场景 | 报错/表现 | 原因 | 解决办法 |
| --- | --- | --- | --- |
| 插件导入来源错误 | `tailwindcss is not defined` | 从 `tailwindcss` 包导入插件，但 v4 插件在 `@tailwindcss/vite` 中 | `import tailwindcss from '@tailwindcss/vite'` |
| 版本过低 | 安装/运行时报 Node 版本错误 | Tailwind 4 要求 Node.js 20+ | 升级 Node.js 后重装依赖 |
| 类名不生效 | 写了 `bg-blue-500` 无样式 | 类名拼写错误或不在扫描范围 | 核对官方速查表；补充 `@source` |
| 动态拼接类名 | `bg-${color}-500` 不生效 | 扫描器按完整字符串匹配，拼接无法识别 | 维护完整类名映射表或用 `@source inline()` |
| v3 指令残留 | `@tailwind base;` 报错 | v4 移除了这三条指令 | 改为 `@import "tailwindcss";` |
| 重复配置 | 样式重复或冲突 | 同时使用了旧集成包（如 `@astrojs/tailwind`）与 Vite 插件 | 只保留一种接入方式 |
| 修改后不生效 | 改了配置没反应 | Vite 缓存或监听失效 | 重启开发服务器 |

## 12. 一句话记忆

安装 Tailwind 4 只有两步：装包（`tailwindcss` + 对应构建插件）与写一行 `@import "tailwindcss";`——剩下的扫描范围用 `@source` 按需补充，配置从 `tailwind.config.js` 搬进了 CSS。
