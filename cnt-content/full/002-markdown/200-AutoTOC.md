---
order: 200
title: 自动目录
module: 'markdown'
category: 工具链
difficulty: beginner
description: 自动目录（TOC）的实现方式：各平台占位符语法、GitHub 手动锚点目录、生成工具与维护建议。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'markdown/020-HeadingSyntax'
  - 'markdown/190-AnchorLinks'
  - 'markdown/050-LinkImage'
prerequisites:
  - 'markdown/020-HeadingSyntax'
---

> **认知导入（Layer 1 进阶层）**
> 前置知识：002 标题语法（目录就是标题的链接列表）。
> 边界说明：`[TOC]` 这类目录占位符**不是 CommonMark/GFM 语法**，各平台各有一套；GitHub 完全不支持占位符，需要手动链接或工具生成。
> 强制练习：在 README 里为三个二级标题手写一个目录，并逐个点击验证锚点跳转。

## 1. 为什么需要自动目录

自动目录（Table of Contents, TOC）根据文档标题层级生成导航列表，价值有三：

- **快速导航**：长文档点击目录项直接跳转对应章节；
- **文档概览**：读者先看目录即可判断内容结构；
- **自动同步**：占位符方案下标题变更时目录自动更新，无需手动维护。

实现方式分三类：平台占位符（`[TOC]` 等）、构建工具参数（Pandoc/Hugo）、手动锚点链接（GitHub 适用）。

## 2. 各平台占位符语法

### 2.1 `[TOC]`（Typora、GitLab、Python-Markdown）

```markdown
[TOC]

## 第一章 概述

### 1.1 背景

## 第二章 方法
```

同一行占位符在三类环境有效：Typora（原生支持）、GitLab（同时支持 `[[_TOC_]]` 变体，GitHub 不支持）、Python-Markdown（需在扩展中启用 `toc`，MkDocs 默认启用）。渲染时占位符位置生成整棵目录树。注意该写法在 GitHub 上只是普通文本——这是"从 GitLab 迁文档到 GitHub"时最常见的残留物。

### 2.2 VuePress / VitePress：`[[toc]]`

```markdown
[[toc]]

## 标题一

### 子标题
```

### 2.3 Jekyll / kramdown：`{:toc}`

```markdown
* 无序列表占位
{:toc}

## 标题一

## 标题二
```

`{:toc}` 是 kramdown 的行内属性扩展，通常配一个空列表项使用。

### 2.4 Azure DevOps Wiki：`[[_TOC_]]`

Azure DevOps Wiki 用 `[[_TOC_]]`（大小写不敏感）。注意网传"GitHub 支持 `[[_TOC_]]`"是讹传——那是 Azure DevOps 的语法，GitHub 上只会原样显示。

### 2.5 Hugo：模板变量

Hugo 在模板层用 `.TableOfContents` 输出目录，配合 `markup.tableOfContents` 配置控制起始/结束级别与是否有序：

```go
{{ .TableOfContents }}
```

### 2.6 Pandoc：命令行参数

```bash
# 生成带目录的文档
pandoc input.md -o output.pdf --toc

# 自定义目录标题
pandoc input.md -o output.pdf --toc -V toc-title="目录"

# 控制目录深度（只收录 h2-h3）
pandoc input.md -o output.pdf --toc --toc-depth=3
```

## 3. GitHub 上的目录方案

### 3.1 内置大纲

GitHub 会为仓库内 Markdown 文件与 Issue/PR 自动生成右上的"大纲"（Outline）下拉面板，无需任何语法。如果只是希望读者能导航，这个内置能力往往已经够用。

### 3.2 手动锚点目录（README 常见做法）

GitHub 不支持 `[TOC]`，通用做法是手写一组页内链接：

```markdown
## 目录

- [概述](#概述)
- [安装](#安装)
  - [基本用法](#基本用法)
  - [高级配置](#高级配置)
- [常见问题](#常见问题)

## 概述

## 安装

### 基本用法

### 高级配置

## 常见问题
```

锚点目标由 GitHub 按固定规则从标题生成，详见 `markdown/190-AnchorLinks`。中文标题保留原字符，空格换连字符，特殊符号剔除。

长目录常用 `<details>` 折叠，保持 README 首屏干净：

```markdown
<details>
<summary>目录</summary>

- [概述](#概述)
- [安装](#安装)

</details>
```

### 3.3 生成工具

手动目录的锚点容易拼错，用工具生成并回写：

```bash
# doctoc：为文件插入/更新 GitHub 风格目录
npx doctoc README.md

# markdown-toc
npx markdown-toc -i README.md
```

VS Code 用户可装 Markdown All in One 扩展，提供"Create Table of Contents"命令并支持保存时自动更新。

这些工具的工作方式一致：扫描标题 → 按目标平台的 slug 规则生成锚点 → 把目录列表插入占位注释之间。例如 doctoc 会在文件中写入 `<!-- START doctoc -->` 与 `<!-- END doctoc -->` 注释，之后重复执行只更新注释之间的内容，不会破坏正文。用工具管理目录时不要手工编辑注释块内部，否则下次更新会被覆盖。

## 4. Obsidian 与笔记软件

Obsidian 没有目录占位符，替代方案是内置的"大纲"面板（实时反映标题层级）；社区插件（如 Automatic Table of Contents）可以插入同步目录。Notion、语雀等托管笔记工具同样由界面层提供大纲，不依赖 Markdown 语法——在笔记软件与 Git 仓库之间搬运文档时，删掉失效的占位符是必要的清理步骤。

## 5. 目录深度与位置

### 5.1 深度控制

- 常规文档收录 h2-h3 两级即可；收录到 h4 以下会让目录比正文还长。
- 占位符方案里用平台配置控制（Pandoc `--toc-depth`、Hugo `tableOfContents` 配置）；手动目录直接控制链接列表层级。

### 5.2 放置位置

- **文档开头**：最常见，方便进入正文前总览；
- **固定侧边栏**：文档站点（VuePress、MkDocs 等）的标准形态，目录由站点布局渲染，不写进正文；
- **折叠面板**：GitHub 长文档用 `<details>` 折叠。

## 6. 维护建议与陷阱

1. **能用工具就不用手写**：占位符、构建参数或 doctoc 均可自动同步，手动目录只在没有更好选择时用。
2. **标题命名清晰且稳定**：目录条目就是标题文本；频繁改标题会破坏外部深链的锚点。
3. **层级不超过 4 级**：正文与目录都遵守，超深层级说明结构需要拆分文档。
4. **超过五六个章节的长文档才配目录**：短文档目录反而是噪音。
5. **警惕占位符残留**：`[TOC]`、`[[toc]]` 换平台后变成裸文本，发布前全局搜索一遍。
6. **锚点失效先查标题改动**：手动目录跳转失效几乎都是标题被改导致 slug 变化，重新生成或修正链接即可。

## 小结

- 初学者要点：目录 = 标题链接列表；Typora/GitLab 用 `[TOC]`，GitHub 用手动锚点链接或内置大纲面板；长文档才有必要配目录。
- 进阶注意：占位符语法全部是平台扩展（`[TOC]`、`[[toc]]`、`{:toc}`、`[[_TOC_]]` 互不兼容，后两者分别是 VuePress 与 Azure DevOps 的方言）；Pandoc/Hugo 在构建层生成目录并用参数控制深度；GitHub 手写目录的锚点遵循固定 slug 规则，工具生成可避免拼错（规则细节见 `markdown/190-AnchorLinks`）。
