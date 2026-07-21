---
order: 56
title: Wikis
module: github
category: GitHub
difficulty: beginner
description: 'GitHub Wikis详解：项目文档管理、编辑与协作。'
author: fanquanpp
updated: '2026-06-14'
related:
  - github/Fork工作流
  - github/Projects看板
  - github/社区讨论
  - github/AI编程助手
prerequisites:
  - github/GitHub概述
---

## 1. Wikis 概述

### 1.1 什么是 GitHub Wikis

GitHub Wikis 是仓库内置的**文档系统**，适合存放项目文档、教程和设计文档。

### 1.2 Wiki vs README

| 特性     | README     | Wiki             |
| :------- | :--------- | :--------------- |
| **位置** | 仓库根目录 | 独立的 Wiki 区域 |
| **内容** | 项目概览   | 详细文档         |
| **编辑** | 提交代码   | 独立编辑         |
| **结构** | 单文件     | 多页面           |
| **权限** | 同仓库权限 | 可独立配置       |

## 2. 启用和配置

### 2.1 启用 Wiki

1. 仓库 Settings → Features → Wikis → 勾选
2. 访问 `https://github.com/user/repo/wiki`

### 2.2 权限设置

| 选项                   | 说明           |
| :--------------------- | :------------- |
| **Public**             | 所有人可编辑   |
| **Collaborators only** | 仅协作者可编辑 |

## 3. 创建和编辑页面

### 3.1 创建首页

访问 Wiki 页面，点击 "Create the first page"

### 3.2 添加新页面

1. Wiki → New Page
2. 输入标题和内容
3. 选择编辑模式（Markdown 推荐）

### 3.3 侧边栏

创建 `_Sidebar.md` 文件自定义导航：

```markdown
**文档导航**

- [[首页]]
- [[安装指南]]
- [[API 文档]]
  - [[认证 API]]
  - [[用户 API]]
- [[常见问题]]
```

### 3.4 页脚

创建 `_Footer.md` 文件：

```markdown
---

文档最后更新于 2026-06-14
如有问题请提交 [Issue](../../issues)
```

## 4. 本地编辑 Wiki

### 4.1 克隆 Wiki

```bash
# Wiki 是独立的 Git 仓库
git clone https://github.com/user/repo.wiki.git

# 目录结构
repo.wiki/
├── Home.md           ← 首页
├── _Sidebar.md       ← 侧边栏
├── _Footer.md        ← 页脚
├── Installation.md   ← 自定义页面
└── API-Reference.md  ← 自定义页面
```

### 4.2 本地编辑并推送

```bash
cd repo.wiki
vim API-Reference.md
git add .
git commit -m "docs: update API reference"
git push origin master
```

## 5. 最佳实践

- 首页作为目录，链接到其他页面
- 使用 `_Sidebar.md` 统一导航
- 文档与代码变更同步更新
- 使用 Wiki 记录设计决策和架构
- 长文档拆分为多个页面
