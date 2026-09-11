---
order: 260
title: Markdown Frontmatter YAML
module: 'markdown'
category: 工具链
difficulty: intermediate
description: Markdown 文件头部的 YAML frontmatter：标量/数组/对象字段、多行文本、类型陷阱与各平台约定。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'markdown/270-SpecDocumentWriting'
  - 'markdown/310-AdvancedSyntaxDocumentAutomation'
prerequisites:
  - 'markdown/010-SyntaxGuide'
---

> **Layer 2 专业层标注**：Frontmatter 用于文档工程化（本仓库的每篇教程就带 frontmatter），写普通笔记可以跳过本篇。
> 边界说明：frontmatter 本身不是"渲染给人看的 Markdown"，而是给静态站点生成器、文档工具读取的机器元数据；语法基础是 YAML。
> 强制练习：给一篇 md 文件加上 `title` 与 `tags` 两个 frontmatter 字段，用 Obsidian 的"属性"面板或站点构建验证是否被读取。

## 1. 什么是 frontmatter

frontmatter 是写在 Markdown 文件**最顶部**的一段元数据块，以两行 `---` 包裹，内部是 YAML 格式的键值对。渲染正文时它不会显示为内容，而是被工具读取用于标题、分类、日期、排序等：

```markdown
---
title: 文档标题
date: 2025-07-31
---
正文内容
```

类比：正文是快递箱里的货物，frontmatter 是贴在箱外的面单——收件方（构建工具）先读面单再决定货物怎么摆。

支持 frontmatter 的常见平台：Jekyll（发明者）、Hugo、Hexo、Astro、Docusaurus、MkDocs、Obsidian（属性面板）、Zola 等。注意 Hugo 默认用 `+++` 包裹的 TOML，也支持 YAML。

### 1.1 位置要求

frontmatter 必须是文件第一行：前面不能有空行、注释或 BOM 字符，否则不会被识别。

## 2. 基础字段类型

### 2.1 标量（字符串 / 数字 / 布尔 / 空值）

```yaml
title: 用户指南
version: 2.1
published: true
draft: false
featured: null
empty: ~        # ~ 等价 null
```

### 2.2 需要加引号的字符串

值里含 ASCII 冒号加空格、井号、首尾空格等特殊字符时必须加引号：

```yaml
title: "包含: 冒号的标题"
note: "key: value 含冒号"
hash: "#不是注释"
path: "a/b/c"
```

引号规则：值以数字、`[`、`{`、`&`、`*`、`!` 等开头，或包含 `: `（冒号空格）与 ` #`（空格井号）时，必须用引号包裹，否则 YAML 解析报错或被截断。

### 2.3 数组

行内写法适合短数组，块状写法适合长数组：

```yaml
tags: [js, ts, web]
authors:
  - Alice
  - Bob
```

### 2.4 对象与对象数组

```yaml
author:
  name: Alice
  email: alice@example.com

posts:
  - title: 第一篇
    date: 2025-01-01
  - title: 第二篇
    date: 2025-02-01
```

对象数组项的子键要对齐（`- ` 之后同列），错位会改变数据结构。

## 3. 多行文本

YAML 提供两种多行标量，frontmatter 中常用于 description、summary：

```yaml
description: |
  第一行
  第二行
  保留所有换行
```

`|`（literal）保留换行符；`>`（folded）把换行折叠为空格，适合长段落摘要：

```yaml
summary: >
  这是一段长文本，
  换行会被折叠成空格。
```

末尾换行可用 `|-`（去掉末尾换行）与 `|+`（保留全部末尾换行）控制：

```yaml
desc: |-
  精确无末尾换行
```

注意块标记（`|`、`>`、`|-`）必须独占一行（冒号后即换行），内容写在下一行起——把内容跟在标记同一行是无效 YAML。

## 4. 日期类型

YAML 会把符合 ISO 8601 的值解析为日期对象（而非字符串）：

```yaml
date: 2025-07-31
datetime: 2025-07-31T10:30:00Z
```

若工具链期望字符串，加上引号：`date: "2025-07-31"`。

## 5. 高级特性与陷阱

### 5.1 锚点与引用（复用配置）

`&` 定义锚点，`*` 引用，`<<` 合并键：

```yaml
defaults: &def
  lang: zh
  draft: false
post1:
  <<: *def
  title: 第一篇
```

注意合并键 `<<` 属于 YAML 1.1 约定，部分严格的 1.2 解析器（一些 JS 实现）不支持，跨工具使用前先验证。

### 5.2 类型陷阱（最高频出错点）

- **`no` / `yes` / `on` / `off` 会被解析为布尔值**（YAML 1.1）：

  ```yaml
  country: no     # 解析为 false，不是字符串 "no"
  country: "no"   # 正确：想存字符串就加引号
  ```

- **版本号、纯数字字符串**：`v1.0` 是字符串没问题，但 `version: 1.10` 是浮点数（1.1），语义被破坏，应写 `version: "1.10"`。
- **缩进必须用空格**：YAML 禁止用制表符缩进，一个 Tab 就能让整个文件解析失败。

### 5.3 YAML 锚点注释与 `---` 分隔符的冲突

`---` 在 YAML 中也是多文档分隔符。frontmatter 场景下，工具只读取**第一个** `---` 包裹的块，其后再次出现的 `---` 就是正文中的水平分隔线，不会再被当作元数据。

## 6. 常用约定字段参考

不同生态有各自的约定字段，举两类典型：

```yaml
# 博客类（Hexo / Jekyll 风格）
---
title: 文章标题
date: 2025-07-31
tags: [前端, JS]
categories: 教程
author: Alice
cover: /img/a.png
draft: false
summary: 简短摘要
---
```

```yaml
# 文档站点类（Docusaurus 风格）
---
title: API 文档
description: 接口说明文档
sidebar_position: 3
sidebar_label: 接口
slug: /api
---
```

工具会自动补全或校验字段时（如本仓库的内容管线），只写内容字段即可，托管字段交给工具维护。

## 7. 常见陷阱汇总

1. **frontmatter 前有空行或内容**：识别失败，整段被当正文渲染出两条水平线。
2. **值含 `: ` 未加引号**：YAML 解析报错，构建中断。
3. **制表符缩进**：必须全部替换为空格。
4. **`no`/`on`/`off` 被吃成布尔**：可疑字符串一律加引号。
5. **块标记与内容同行**：`desc: |- 文本` 是无效写法，标记必须独占一行。
6. **日期与字符串混淆**：确认目标工具期望的类型，必要时加引号显式声明。
7. **`---` 在正文中紧跟 frontmatter 闭合行**：部分工具会把第二个 `---` 也解析进元数据区，闭合行与正文之间留一个空行更稳。

## 小结

- 初学者要点：frontmatter 是文件最顶部 `---` 包裹的 YAML 元数据块，不渲染为正文；字段形式就四种——标量、数组、对象、多行文本；值含冒号加空格或 `#` 时加引号。
- 进阶注意：YAML 类型系统比看上去激进（`no` 是 false、日期自动解析），可疑值都加引号；缩进只能用空格；`|` 保留换行、`>` 折叠换行、`|-` 去末尾换行且标记必须独占一行；`<<` 合并键在部分解析器不可用；Hugo 用户注意它默认是 TOML（`+++`）。
