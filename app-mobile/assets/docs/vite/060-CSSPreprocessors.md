---
order: 60
title: Vite CSS 与预处理器
module: 'vite'
category: 前端技术
difficulty: intermediate
description: Vite 样式方案：从 Sass 源码到浏览器 CSS 的完整处理流水线，讲清预处理器、PostCSS、CSS Modules、Lightning CSS 与 Tailwind 集成
author: fanquanpp
updated: '2026-09-12'
related:
  - 'vite/040-StaticAssets'
  - 'vite/080-BuildSplit'
prerequisites:
  - 'vite/030-ConfigFile'
---


## 1. 从中央厨房的食材加工流水线说起

想象一家连锁餐厅的中央厨房。你点了一份"番茄牛腩套餐"，后厨的加工流水线是这样的：

```text
采购验收 -> 切配间（预处理）-> 炒制间（主加工）-> 摆盘间（质检装盘）-> 出餐窗口（送达）
```

CSS 在 Vite 里的旅程惊人地相似。一段 **Sass 源码**要变成浏览器里真正生效的样式，同样要经过一条**处理流水线**：

```text
第 1 站：入口登记   —— JS 中 import './style.scss'，Vite 发现并登记这个样式模块
第 2 站：切配预处理 —— Sass/LESS 编译器把 .scss/.less 编译成标准 CSS（变量、嵌套被展开）
第 3 站：炒制加工   —— PostCSS 后处理（自动加 -webkit- 等厂商前缀）
第 4 站：质检装盘   —— CSS Modules 类名局部化 / 压缩混淆
第 5 站：出餐送达   —— 开发时注入 <style> 标签；生产时抽取成独立 .css 文件按需加载
```

本文采用**流程驱动**的写法：顺着这条流水线一站一站走，把 Vite 的样式方案（预处理器、PostCSS、CSS Modules、Lightning CSS、Tailwind）全部串成一条清晰的链路。每站你都会看到：这一站解决什么问题、需要什么配置、出了错怎么排查。

## 2. 第 1 站：入口登记——CSS 如何进入构建

### 2.1 在 JS 中 import CSS

Vite 对 CSS 的处理几乎零配置：在 JS/TS 中 `import './style.css'` 即可。

```ts
// src/main.ts
import './style.css'    // 引入后样式自动生效
```

```css
/* src/style.css */
body {
  margin: 0;
  font-family: system-ui, sans-serif;
}
```

讲解：Vite 会解析 CSS 中的 `@import` 与 `url()` 引用——`url()` 指向的图片、字体等资源会走《Vite 静态资源处理》介绍的静态资源管线（加哈希、可内联）；`@import` 引入的其他 CSS 文件会被内联合并。Vite 同时把 CSS 与 JS 的依赖关系绑定：某个 CSS 仅被特定 chunk 使用时，它会跟随该 chunk 一起拆分，实现"只有访问对应页面才下载它的样式"。

### 2.2 三种进入方式对比

| 方式 | 写法 | 适用场景 |
| --- | --- | --- |
| JS import | `import './style.css'` | 组件级样式，最常用 |
| HTML link | `<link rel="stylesheet" href="/src/style.css">` | 少数全局样式，index.html 中直接引用 |
| CSS @import | `@import './base.css'` | 样式文件之间的组织 |

## 3. 第 2 站：切配预处理——Sass / LESS 编译

### 3.1 为什么需要预处理器

原生 CSS 没有变量、没有嵌套、没有函数。写大型项目的样式时，你会陷入"同一个颜色复制十遍"、"选择器层层嵌套写到手酸"的困境。Sass（SCSS 语法）和 LESS 等预处理器解决了这些问题：

```scss
// styles/main.scss：变量 + 嵌套 + 混合（mixin）
$primary: #4f46e5;          // 主题色变量
$radius: 8px;

.card {
  color: $primary;
  border-radius: $radius;

  // 嵌套写法：生成 .card:hover
  &:hover {
    opacity: 0.8;
  }

  // 嵌套生成 .card .title
  .title {
    font-size: 18px;
  }
}
```

### 3.2 接入：只需安装编译器

Vite 本身不做预处理器编译，但内置了对它们的**识别**——只要装了对应编译器，写代码时无需任何配置：

```bash
# SCSS / Sass（推荐现代 sass-embedded，编译更快）
pnpm add -D sass
# LESS
pnpm add -D less
```

安装后直接使用：

```ts
// main.ts：直接 import .scss 文件，Vite 自动调用编译器
import './styles/main.scss'
```

讲解：Vite 8 使用**现代 Sass API**编译 SCSS（官方建议优先安装 `sass-embedded` 以获得更快的原生编译速度）。注意 Sass 的语法演进：`@use` / `@forward` 是官方推荐的模块化语法，旧的 `@import` 已进入弃用流程——新项目请从第一天就用 `@use`。

### 3.3 共享变量：additionalData

多个组件都要用同一套 SCSS 变量时，手动在每个文件顶部 `@use` 一遍太繁琐。用 `additionalData` 全局自动注入：

```ts
// vite.config.ts
export default defineConfig({
  css: {
    preprocessorOptions: {
      scss: {
        // 每个 scss 文件编译前自动注入这两行（可同时注入 mixin 等）
        additionalData: `@use "/src/styles/variables" as *;`,
      },
    },
  },
})
```

```scss
// src/styles/_variables.scss（下划线开头 = 私有 partial 文件，不会被单独编译）
$primary: #4f46e5;
$gap: 16px;
```

讲解：使用 `@use` 时，被注入的变量建议用 `!default` 定义（允许被覆盖）；`additionalData` 只注入到项目源码，不会污染第三方库的样式。注意：注入的内容会拼接在**每个** SCSS 文件开头，如果其中有编译错误，所有组件样式都会报错——因此注入的内容要精简，只放真正全局通用的部分。

## 4. 第 3 站：炒制加工——PostCSS 后处理

### 4.1 PostCSS 是什么

PostCSS 是一个"CSS 后处理生态"：先用插件把 CSS 解析成语法树，然后由各种插件做转换（加厂商前缀、支持未来语法、代码检查等）。它是"加工环节"，工作在预处理器输出标准 CSS 之后。

### 4.2 自动加厂商前缀

```bash
pnpm add -D autoprefixer
```

```js
// postcss.config.js（项目根目录）
export default {
  plugins: {
    // 自动添加浏览器厂商前缀（-webkit-、-moz- 等）
    autoprefixer: {},
  },
}
```

```json
// package.json：声明目标浏览器（browserslist）
{
  "browserslist": ["defaults", "not dead"]
}
```

讲解：Vite 会自动读取项目根目录的 PostCSS 配置并应用。autoprefixer 依据 `browserslist`（可写在 package.json 或 `.browserslistrc`）中声明的目标浏览器，决定为哪些属性加前缀——比如你的代码写 `display: flex`，遇到需要兼容的旧浏览器时会自动补出 `display: -webkit-box` 等写法。如果你在 `vite.config.ts` 里同时配置了 `css.postcss`，则以此为准（两种方式二选一，不要重复配置）。

## 5. 第 4 站：质检装盘——CSS Modules 局部作用域

### 5.1 问题：CSS 的全局污染

CSS 中所有选择器默认是**全局**的。两个组件各自写了 `.title { color: red }` 和 `.title { color: blue }`，后加载的会覆盖先加载的——样式冲突是大型项目最常见的样式事故。

### 5.2 CSS Modules：自动局部化

CSS Modules 让每个类名在构建时自动变成**带哈希的唯一名字**：

```css
/* src/components/Button.module.css */
.btn {
  padding: 8px 16px;
  background: #4f46e5;
  color: #fff;
}

.active {
  opacity: 0.6;
}
```

```tsx
// src/components/Button.tsx
import styles from './Button.module.css'

export function Button({ active }: { active: boolean }) {
  return (
    <button className={`${styles.btn} ${active ? styles.active : ''}`}>
      Click
    </button>
  )
}
```

```text
构建后 styles.btn 被替换成类似 _btn_1x3f2 的唯一类名
两个组件各自的 .title 互不干扰
```

讲解：约定规则是**文件名以 `.module.css`（或 `.module.scss`）结尾**即启用 CSS Modules。`.module.css` 之外的普通 `.css` 仍是全局样式（适合 normalize.css 等全局重置）。CSS Modules 让"组件样式"与"全局样式"的边界一目了然：

| 文件命名 | 作用域 | 用途 |
| --- | --- | --- |
| `.module.css` / `.module.scss` | 局部（类名自动哈希） | 组件私有样式 |
| 普通 `.css` / `.scss` | 全局 | 全局重置、主题变量、第三方库样式 |

### 5.3 自定义命名规则

```ts
// vite.config.ts
export default defineConfig({
  css: {
    modules: {
      // 开发环境建议用可读命名，便于调试定位
      generateScopedName: '[name]__[local]__[hash:base64:5]',
    },
  },
})
```

讲解：生产构建默认采用短哈希类名（压缩体积）；开发环境配成 `[name]__[local]` 形式更易调试。CSS Modules 还支持 `composes` 组合复用（如 `.btn-danger { composes: btn }`），此处不再展开。

## 6. 第 5 站：出餐送达——压缩与按需加载

### 6.1 开发环境：注入式

开发时，Vite 把 CSS 通过 `<style>` 标签注入页面，修改样式后 HMR 毫秒级生效，无需刷新。

### 6.2 生产环境：抽取与压缩

生产构建时，Vite 默认行为：

```text
1. 所有 CSS 抽取为独立 .css 文件（默认开启 CSS 代码分割）
2. 每个异步 chunk（动态 import 的模块）使用的 CSS 独立成文件，随 chunk 按需加载
3. 压缩混淆（Vite 8 中 CSS 压缩默认由 Lightning CSS 承担，且配合新默认构建目标自动做语法降级）
```

```ts
// 路由懒加载组件：其样式自动独立成 chunk 并按需加载
const Dashboard = lazy(() => import('./pages/Dashboard'))
```

这意味着"只访问首页的用户不会下载管理页的样式"。

### 6.3 关闭分割的场景

```ts
// vite.config.ts
export default defineConfig({
  build: {
    cssCodeSplit: false,   // 关闭 CSS 分割，全部合并为一个文件
  },
})
```

讲解：小项目或整页风格统一时可关闭分割、减少请求数；大型应用建议保留默认，配合路由懒加载实现样式按需。若需要更激进的压缩/降级，可显式启用 Lightning CSS 转换器：

```ts
// vite.config.ts
import { defineConfig } from 'vite'

export default defineConfig({
  css: {
    transformer: 'lightningcss',   // 显式启用 Lightning CSS（需安装 lightningcss）
  },
})
```

```bash
pnpm add -D lightningcss
```

讲解：Lightning CSS（Rust 编写）比传统 JS 实现的 CSS 处理快约 100 倍，能同时完成压缩、语法降级、CSS Modules。Vite 8 中它是生产构建 CSS 压缩的默认承担者（详见本模块《Vite 8 与 Rolldown 新特性》）。

## 7. 综合案例：Tailwind CSS 的接入流程

把第 2-6 站串起来，看 Tailwind CSS v4 如何接入。v4 是"原生 CSS 优先、零配置"的版本，官方提供 Vite 插件：

```bash
pnpm add tailwindcss @tailwindcss/vite
```

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [tailwindcss()],
})
```

```css
/* src/index.css：唯一的 Tailwind 入口 */
@import "tailwindcss";
```

```ts
// main.ts 中引入
import './index.css'
```

讲解：v4 通过 Vite 插件直接工作，不再需要 `tailwind.config.js` 与 PostCSS 配置。对比 v3 的接入方式（`pnpm add -D tailwindcss postcss autoprefixer` + 初始化配置 + PostCSS 插件），v4 的流水线更短：`import "tailwindcss"` 一条指令就把整个工具链接入了 Vite。若项目仍是 v3，注意两种接入方式不可混用。

一条流水线走完，回顾 Tailwind 在这条链中的位置：**入口在 JS import，加工在 Vite 插件（扫描源码生成用到的工具类），输出在生产构建压缩**——它同样服从第 1-6 站的流程框架。

## 8. 常见错误与对策表

| 序号 | 报错/现象 | 原因 | 解决办法 |
| --- | --- | --- | --- |
| 1 | `SassError: Undefined variable` | `additionalData` 注入路径错误，或变量未用 `!default` | 检查注入的 `@use` 路径（是否加 `/`、文件名是否带下划线前缀）；被覆盖的变量用 `!default` 定义 |
| 2 | 预处理器安装后仍报"找不到 sass" | 新增依赖后 dev server 未重启 | 重启 `pnpm dev`（依赖变更后 dev server 需重启才会识别） |
| 3 | 厂商前缀未生效 | 未安装 autoprefixer，或未声明 browserslist | `pnpm add -D autoprefixer`，并在 package.json 配置 `browserslist` |
| 4 | CSS Modules 类名全部失效/冲突 | 文件未以 `.module.css` 结尾（被当成全局样式） | 检查文件名命名；组件中 `import styles from './xxx.module.css'` |
| 5 | Tailwind 工具类不生效 | v4 未注册 `@tailwindcss/vite` 插件，或入口 CSS 未 `@import "tailwindcss"` | 检查 vite.config.ts 插件与入口 CSS；区分 v3/v4 接入方式 |
| 6 | 动态 import 页面的样式没生效 | `cssCodeSplit` 关闭后异步 chunk 的样式被合并但加载顺序异常 | 按需确认是否真的需要关闭分割；大项目保持默认开启 |
| 7 | 全局样式污染组件 | 全局 `.css` 中的选择器与组件类名重名 | 组件样式一律走 `.module.css`；全局样式用前缀约定（如 `.fx-`）隔离 |

## 9. 一句话记忆

**CSS 在 Vite 中就是一条五站流水线：import 入口登记 -> 预处理器编译 -> PostCSS 加工 -> CSS Modules 装盘 -> 压缩按需送达——你只需记住"装编译器就能用、`.module.css` 管局部、生产自动分割"三个要点**。
