---
order: 20
title: Astro 项目创建与目录结构
module: 'astro'
category: 前端技术
difficulty: beginner
description: 手把手从零创建并运行第一个 Astro 项目：环境检查、create astro 向导、目录结构、配置文件、修改页面、构建与预览
author: fanquanpp
updated: '2026-08-30'
related:
  - 'astro/003-PagesRouting'
  - 'astro/004-ComponentsProps'
prerequisites:
  - 'html5/010-SemanticTag'
---


## 0. 先想清楚：我们要搭一座什么样的"房子"

搭建一个 Astro 项目，很像用**积木搭一座房子**。

- 地基和框架（Node.js 环境、项目脚手架）要先打好，否则后面一切无从谈起；
- 每一块积木（目录、配置文件、页面文件）都有固定的形状和位置，放对了，房子自然立得起来；
- 你不必一次记住所有积木的用途，跟着图纸（向导）一步步走，先搭出能住的小房子，再慢慢加房间。

本篇就是你的"图纸"。请打开电脑终端（Windows 下推荐使用 PowerShell 或 VS Code 内置终端），跟着下面的步骤，一步一步实际操作。本模块后面的 003（路由）、004（组件）、005（内容集合）都建立在这套房子的基础上。

## 1. 准备工作

### 1.1 前置条件：Node.js 环境

Astro 是基于 Node.js 的工具链，先确认电脑上安装了正确版本的 Node.js。截至 2026 年，Astro 官方要求 **Node.js v22.12.0 或更高版本**（注意：奇数版本号如 v23 不受支持，这是 Astro 的明确约定）。

打开终端，输入以下两个命令检查：

```bash
node -v
npm -v
```

正常输出类似：

```text
v22.12.0
10.9.2
```

- `node -v` 显示 Node.js 版本号，以 `v` 开头；
- `npm -v` 显示 npm（Node 包管理器）版本号。npm 随 Node.js 一起安装，无需单独配置。

如果提示"node 不是内部或外部命令"，说明 Node.js 未安装或未加入 PATH。请先到 Node.js 官网（https://nodejs.org/zh-cn）下载 LTS 版本安装，安装时保持默认选项（勾选"Add to PATH"），重启终端后再检查。

### 1.2 前置条件：编辑器

推荐使用 VS Code，并安装官方 Astro 扩展（在 VS Code 扩展市场搜索 "Astro"，作者为 astro-build）。该扩展提供语法高亮、智能补全、类型检查提示，对新手非常重要。

### 1.3 检查是否已有 create-astro

不需要预先安装任何脚手架工具。`npm create astro@latest` 会在执行时自动临时下载 create-astro 向导，用完即走，不会污染你的环境。这也是它被称为"零配置启动"的原因。

## 2. 第 1 步：创建项目

### 2.1 打开终端并进入目标目录

在终端中，先进入你想存放项目的目录（例如 `C:\Users\你的用户名\projects`）：

```bash
cd projects
```

说明：`create astro` 可以在电脑上的任何位置运行，向导会自动为你创建项目文件夹，因此不需要提前手动新建空目录。

### 2.2 执行创建命令

```bash
npm create astro@latest
```

执行后，向导（CLI Wizard）会依次询问几个问题：

| 提问 | 选项 | 建议选择 |
| --- | --- | --- |
| 项目名称（Directory） | 输入任意英文名，如 `my-site` | 小写英文字母 + 连字符 |
| 选择模板（Select a template） | Baseline / Blog / Docs / Portfolio / Minimal 等 | 初学选 **Baseline**（空白基础模板） |
| 是否安装依赖（Install dependencies?） | Yes / No | Yes（省去后面手动 `npm install`） |
| 是否初始化 Git（Initialize a Git repository?） | Yes / No | 想用版本管理选 Yes，否则 No |
| 是否使用 TypeScript（Use TypeScript?） | Yes / No | 强烈建议 Yes（类型提示对学习有巨大帮助） |

如果你不想一路点选，可以用"非交互式"命令一步到位：

```bash
npm create astro@latest my-site -- --template baseline --install --git --no-ai --yes
```

各标志含义：

- `--template baseline`：使用空白基础模板；
- `--install`：创建后自动安装依赖；
- `--git`：初始化 Git 仓库（`--no-git` 则跳过）；
- `--yes`：跳过全部交互提示，使用默认值；
- `--no-ai`：跳过创建 AI 代理配置文件。

其他常用模板：`minimal`（最小模板）、`blog`（博客）、`docs`（文档站）、`portfolio`（作品集）。你甚至可以用任意 GitHub 仓库作为模板，例如 `--template 用户名/仓库名`。

### 2.3 查看创建结果

创建成功后，进入项目目录：

```bash
cd my-site
```

## 3. 第 2 步：启动开发服务器

### 3.1 安装依赖（如果向导中选了 No）

```bash
npm install
```

会生成 `node_modules/` 目录，把项目需要的全部依赖下载到本地。这一步通常需要 1 到 3 分钟，视网络情况而定。

### 3.2 启动开发模式

```bash
npm run dev
```

看到类似输出即为成功：

```text
  Local: http://localhost:4321/
```

用浏览器打开 **http://localhost:4321/**，你应该能看到模板默认的首页。

这里有几个概念需要理解：

- **开发服务器（dev server）**：一个在本地运行的服务，负责把 Astro 源码实时编译成浏览器能看懂的 HTML；
- **热更新（HMR，Hot Module Replacement）**：修改 `src/` 下的文件保存后，浏览器无需手动刷新即可看到变化；
- **默认端口 4321**：如果被占用，Astro 会自动改用 4322、4323 等。

停止服务器：在终端按 `Ctrl + C`。

## 4. 第 3 步：认识项目目录结构

打开 `my-site` 文件夹（建议直接用 VS Code 打开：在项目目录执行 `code .`），观察整体结构：

```text
my-site/
  src/                    # 源码目录（重点区域）
    pages/                # 路由目录：每个 .astro/.md 文件生成一个页面
      index.astro         # 首页，对应 /
    content.config.ts     # 内容集合配置（用到内容集合时才会创建）
  public/                 # 静态资源目录：favicon.svg、robots.txt 等
  astro.config.mjs        # Astro 配置文件
  package.json            # 项目依赖与脚本定义
  tsconfig.json           # TypeScript 配置
  README.md
```

逐块理解：

- `src/pages/`：**唯一必须存在的目录**。`index.astro` 是首页。你往这个目录里每添加一个文件，站点就多一个页面（详见 003 篇）；
- `src/` 下的 `components/`、`layouts/`、`styles/` 目录：模板不一定会创建，按需自己新建（详见 004 篇）；
- `public/`：放 favicon、robots.txt 等不需要处理的静态文件，构建时会**原样拷贝**到输出目录根路径，例如 `public/favicon.svg` 通过 `/favicon.svg` 访问；
- `astro.config.mjs`：Astro 的配置中心；
- `package.json`：记录依赖和 npm 脚本。

## 5. 第 4 步：认识核心配置文件

### 5.1 astro.config.mjs

```js
// astro.config.mjs
import { defineConfig } from 'astro/config'

// 官方推荐用 defineConfig 包裹配置，可获得类型提示与配置校验
export default defineConfig({
  site: 'https://example.com',  // 站点最终部署地址，生成 sitemap 和规范链接必需
  output: 'static',             // 输出模式：static（默认）/ server（SSR）/ hybrid
  compressHTML: true,           // 构建时压缩 HTML 中的空白字符
  markdown: {
    shikiConfig: { theme: 'github-dark' }, // 代码高亮主题（Shiki）
  },
})
```

讲解：

- `site`：填最终上线域名。不填也能构建，但 sitemap、OG 图片等依赖绝对地址的功能会失效；
- `output`：默认 `static`（构建期生成全部页面）。需要服务端渲染时改为 `server` 并安装适配器（详见 001 篇第 8 节）；
- `markdown.shikiConfig`：控制代码块高亮主题，常用的还有 `github-light`、`one-dark-pro` 等。

### 5.2 package.json 的脚本

打开 `package.json`，找到 `scripts` 字段：

```json
{
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "astro": "astro"
  }
}
```

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 启动开发服务器（热更新） |
| `npm run build` | 生产构建，输出到 `dist/` |
| `npm run preview` | 本地预览 `dist/` 构建产物（模拟线上环境） |
| `npx astro ...` | 调用 Astro CLI 子命令 |

## 6. 第 5 步：修改你的第一个页面

打开 `src/pages/index.astro`，里面是模板生成的首页。把内容替换为：

```astro
---
// frontmatter（组件脚本）：构建期执行，不会发送到浏览器
const siteName = '我的第一个 Astro 站点'
const author = 'FANDEX 学员'
const now = new Date().toLocaleDateString('zh-CN')
---

<!-- 模板：输出静态 HTML -->
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{siteName}</title>
  </head>
  <body>
    <h1>{siteName}</h1>
    <p>作者：{author}</p>
    <p>今天日期：{now}</p>
    <p>这段内容会被直接渲染为静态 HTML，无需任何客户端 JavaScript。</p>
  </body>
</html>
```

保存文件，回到浏览器（http://localhost:4321/），页面会自动刷新，你应该能看到自己的站点名和今天的日期。

关键语法点：

- `---` 包裹的 frontmatter 是"组件脚本"，在构建期于服务端运行，可以定义变量、导入模块、读取文件，但**不会**发送到浏览器；
- 模板中使用 `{表达式}` 语法输出变量的值；
- 这段 HTML 在构建后是完整、独立、可被搜索引擎直接抓取的静态文件。

## 7. 第 6 步：添加第二个页面

在 `src/pages/` 下新建文件 `about.astro`，写入：

```astro
---
const pageTitle = '关于本站'
---

<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{pageTitle}</title>
  </head>
  <body>
    <h1>{pageTitle}</h1>
    <p>这是通过文件路由自动生成的第二个页面，访问 /about 即可看到。</p>
    <a href="/">返回首页</a>
  </body>
</html>
```

保存后，浏览器访问 **http://localhost:4321/about/**，即可看到新页面。

这就是 Astro"文件路由"的威力：**新增一个文件就是新增一个页面**，不需要配置任何路由表。页面之间用普通的 `<a href="/xxx">` 链接跳转即可（Astro 刻意不提供框架专属的 `<Link>` 组件）。

## 8. 第 7 步：构建与预览

开发调试完成后，生成用于上线的最终产物：

```bash
npm run build
```

构建结束后，项目根目录出现 `dist/` 文件夹，里面是全部静态文件（HTML、CSS、JS、图片）。预览生产产物：

```bash
npm run preview
```

浏览器访问输出的本地地址（通常也是 localhost:4321），体验与线上一致的效果。将 `dist/` 目录上传到任意静态托管平台（GitHub Pages、Netlify、Vercel、OSS 等）即可完成部署。

### 8.1 看看 dist 里长什么样

构建完成后打开 `dist/`，它的结构是"扁平化"的：每个页面生成一个对应的 HTML 文件，静态资源按类型归入 `_astro/` 目录：

```text
dist/
  index.html            # 首页 /
  about/index.html      # 页面 /about（子路径页面向下生成一层目录）
  _astro/               # 构建产物：压缩后的 CSS、JS、图片等
  favicon.svg           # public/ 里的文件原样拷贝到这里
```

理解两个细节：

- `about/index.html` 对应 `/about`，这是静态站点的常见组织方式（`build.format` 可以调整输出格式，如 `directory` 或 `file`）；
- `public/` 中的文件不经任何处理，原样出现在 `dist/` 根路径——所以 `public/favicon.svg` 在页面里用 `/favicon.svg` 引用即可。

## 9. 常用命令速查表

| 命令 | 作用 | 备注 |
| --- | --- | --- |
| `npm create astro@latest` | 启动创建向导 | 可加 `--template` 指定模板 |
| `npm run dev` | 启动开发服务器 | 默认 http://localhost:4321 |
| `npm run build` | 生产构建 | 输出到 `dist/` |
| `npm run preview` | 预览构建产物 | 需先 build |
| `npx astro add react` | 添加官方集成 | 支持 react、tailwind、mdx、sitemap 等 |
| `npx astro check` | 类型与语法检查 | CI 中常用 |
| `npx astro info` | 输出环境诊断信息 | 排查问题时贴给社区 |

## 10. 常见错误与对策表

| 常见错误 | 报错/现象 | 原因 | 解决办法 |
| --- | --- | --- | --- |
| `node` 不是内部或外部命令 | 终端提示命令不存在 | Node.js 未安装或未加入 PATH | 到 nodejs.org 安装 LTS 版，勾选 Add to PATH，重开终端 |
| `npm create astro@latest` 卡住或失败 | 长时间无响应或网络报错 | npm 源较慢或网络受限 | 切换镜像源：`npm config set registry https://registry.npmmirror.com` 后重试 |
| 版本过低错误 | 报错要求 Node.js 版本 >= 22.12.0 | Node.js 版本太旧 | 使用 nvm-windows 安装并切换新版本 |
| 端口被占用 | `Port 4321 is already in use` | 另一个进程占用了 4321 | 关掉占用进程，或让 Astro 自动改用 4322 等端口 |
| 页面修改后不刷新 | 浏览器看不到改动 | 开发服务器未运行，或改的是 `public/`（public 文件不触发 HMR） | 确认 `npm run dev` 在运行；`public/` 内容需手动刷新 |
| 构建后页面样式/资源 404 | 引用的图片、脚本找不到 | 资源路径写成了相对路径或未放进 `public/` | 资源放 `public/` 后用 `/文件名` 绝对路径引用 |

## 12. 一句话记忆

**`npm create astro@latest` 生成积木盒，`npm run dev` 边搭边看，`npm run build` 出成品——src/pages 里每个文件就是一块会自动变成页面的积木。**
