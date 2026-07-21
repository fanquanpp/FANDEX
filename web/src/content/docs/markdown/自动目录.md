---
order: 62
title: 自动目录
module: markdown
category: 'Markdown Basics'
difficulty: beginner
description: 'Markdown自动目录生成：[TOC]语法、平台实现与自定义目录方案。'
author: fanquanpp
updated: '2026-06-14'
related:
  - markdown/链接与图片
  - markdown/转换工具
  - markdown/锚点跳转
  - markdown/图片CDN加速
prerequisites:
  - markdown/语法指南
---

## 1. 自动目录概述

### 1.1 为什么需要自动目录

自动目录（Table of Contents, TOC）根据文档标题自动生成导航结构，核心价值：

- **快速导航**：点击目录项跳转到对应章节
- **文档概览**：一目了然地了解文档结构
- **自动更新**：标题变更时目录自动同步

### 1.2 实现方式

| 方式          | 语法         | 适用平台        |
| :------------ | :----------- | :-------------- |
| **`[TOC]`**   | `[TOC]`      | 部分编辑器      |
| **`[[toc]]`** | `[[toc]]`    | VuePress 等     |
| **`{:toc}`**  | `{:toc}`     | Jekyll/Kramdown |
| **Pandoc**    | `--toc` 参数 | Pandoc          |
| **HTML 手动** | 锚点链接     | 通用            |

## 2. 各平台目录语法

### 2.1 `[TOC]` 语法

最常见的目录语法，在文档中插入 `[TOC]` 即可自动生成：

```markdown
[TOC]

## 第一章 概述

### 1.1 背景

### 1.2 目标

## 第二章 方法

### 2.1 实验设计

### 2.2 数据分析
```

支持 `[TOC]` 的平台：

| 平台         | 语法     | 说明                |
| :----------- | :------- | :------------------ |
| **Typora**   | `[TOC]`  | 原生支持            |
| **VS Code**  | 需插件   | Markdown All in One |
| **Obsidian** | 无需语法 | 大纲面板自动显示    |

### 2.2 VuePress / VitePress

```markdown
[[toc]]

## 标题一

### 子标题

## 标题二
```

### 2.3 Jekyll / Kramdown

```markdown
- 目录
  {:toc}

## 标题一

## 标题二
```

### 2.4 Hugo

Hugo 使用模板变量自动生成目录：

```go
{{ .TableOfContents }}
```

### 2.5 Pandoc

```bash
# 生成带目录的文档
pandoc input.md -o output.pdf --toc

# 自定义目录标题
pandoc input.md -o output.pdf --toc -V toc-title="目录"

# 设置目录深度
pandoc input.md -o output.pdf --toc --toc-depth=3
```

## 3. GitHub 中的目录

### 3.1 README 自动目录

GitHub 不支持 `[TOC]` 语法，但可以通过以下方式实现目录：

**方案一：手动锚点链接**

```markdown
## 目录

- [概述](#概述)
- [安装](#安装)
- [使用方法](#使用方法)
  - [基本用法](#基本用法)
  - [高级配置](#高级配置)
- [常见问题](#常见问题)

## 概述

## 安装

## 使用方法

### 基本用法

### 高级配置

## 常见问题
```

### 3.2 GitHub 锚点规则

GitHub 自动为标题生成锚点，规则如下：

| 规则           | 示例标题          | 生成的锚点         |
| :------------- | :---------------- | :----------------- |
| 转小写         | `Getting Started` | `#getting-started` |
| 空格变连字符   | `Hello World`     | `#hello-world`     |
| 移除特殊字符   | `What's New?`     | `#whats-new`       |
| 中文保留       | `安装指南`        | `#安装指南`        |
| 多个连字符合并 | `A -- B`          | `#a----b`          |

### 3.3 自动生成工具

```bash
# 使用 markdown-toc 自动生成
npx markdown-toc README.md --insert

# 使用 doctoc
npx doctoc README.md
```

## 4. 自定义目录

### 4.1 带编号的目录

```markdown
## 目录

1. [1. 概述](#1-概述)
2. [2. 安装](#2-安装)
   1. [2.1 系统要求](#21-系统要求)
   2. [2.2 安装步骤](#22-安装步骤)
3. [3. 使用](#3-使用)
```

### 4.2 带图标的目录

```markdown
## 目录

- [概述](#概述)
- [配置](#配置)
- [快速开始](#快速开始)
- [常见问题](#常见问题)
```

### 4.3 折叠目录

使用 HTML `<details>` 标签创建可折叠目录：

```markdown
<details>
<summary> 目录</summary>

- [概述](#概述)
- [安装](#安装)
- [使用](#使用)

</details>
```

## 5. 目录深度控制

### 5.1 包含/排除级别

```markdown
<!-- 只包含 h2 和 h3 -->

## 目录

- [标题一](#标题一)
  - [子标题](#子标题)
- [标题二](#标题二)

<!-- 不包含 h1（通常 h1 是文档标题） -->
```

### 5.2 各平台深度设置

| 平台         | 设置方式        | 默认深度 |
| :----------- | :-------------- | :------- |
| **Pandoc**   | `--toc-depth=3` | 3        |
| **Hugo**     | `tocEndLevel`   | 3        |
| **VuePress** | `toc.maxDepth`  | 2        |
| **Jekyll**   | Kramdown 选项   | 3        |

## 6. 最佳实践

### 6.1 目录放置位置

- **文档开头**：最常见，方便读者快速导航
- **固定侧边栏**：长文档推荐，始终可见
- **折叠**：中等长度文档，不占用太多空间

### 6.2 维护建议

- 使用自动生成工具，避免手动维护
- 标题命名要清晰，目录才有意义
- 控制标题层级不超过 4 级
- 长文档（超过 5 个章节）建议添加目录
