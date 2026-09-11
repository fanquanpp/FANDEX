---
order: 250
title: Markdown 定义列表
module: 'markdown'
category: 工具链
difficulty: intermediate
description: 定义列表的扩展语法（PHP Markdown Extra 等）、各渲染器支持差异与 CommonMark 兼容替代方案。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'markdown/100-Table'
  - 'markdown/230-HtmlEmbed'
  - 'markdown/240-CommonMarkSpec'
prerequisites:
  - 'markdown/010-SyntaxGuide'
---

> **认知导入（Layer 2 专业层）**
> 前置知识：006 列表语法。
> 边界说明：定义列表**不在 CommonMark 与 GFM 规范内**，属于第三方扩展语法。本篇先讲清"哪些渲染器认识它"，再给出不认识时的兜底写法，避免写出"在自己电脑上好看、推上 GitHub 就散架"的文档。
> 强制练习：在 GitHub 上提交一段 PHP Markdown Extra 语法的定义列表，观察它退化成什么样子。

## 1. 什么是定义列表

定义列表（definition list）表达"术语——解释"的成对结构。HTML 里对应三个标签：`<dl>` 是容器，`<dt>` 是术语（term），`<dd>` 是定义（description）：

```html
<dl>
  <dt>Git</dt>
  <dd>分布式版本控制系统</dd>
</dl>
```

渲染时术语加粗、定义缩进悬挂显示。文档中的典型用途：术语表、API 字段说明、缩写解释。Markdown 核心语法没有对应写法，需要扩展语法或 HTML 实现。

## 2. 扩展语法：PHP Markdown Extra 风格

事实标准写法来自 PHP Markdown Extra，Python-Markdown 的 `def_list` 扩展、Pandoc、kramdown 均采用兼容语法：术语单独一行，定义以冒号 `:` 开头写在下一行。

### 2.1 基本写法

```markdown
Git
: 分布式版本控制系统

Markdown
: 轻量级标记语言
```

### 2.2 多术语共享一个定义

```markdown
HTML
超文本标记语言
: 用于构建网页结构的标记语言
```

连续多行术语（中间无空行）共享下方的定义。

### 2.3 一个术语多个定义

```markdown
API
: 应用程序编程接口
: 一种软件接口规范
```

连续多个 `:` 行分别渲染为多个 `<dd>`。

### 2.4 定义中嵌套块级内容

定义内容缩进后可以放列表、代码块等块级元素：

```markdown
HTTP 方法
: 常用方法包括：

      - GET 获取资源
      - POST 创建资源
      - PUT 更新资源
```

（缩进规则随实现略有差异，PHP Markdown Extra 用 4 空格；写作时以目标渲染器的文档为准。）

## 3. 渲染器支持对照

| 平台 / 渲染器 | 原生支持 | 说明 |
| :--- | :--- | :--- |
| GitHub | 不支持 | 术语与定义被合并为普通段落 |
| CommonMark / GFM 规范 | 无此语法 | 核心规范不包含定义列表 |
| PHP Markdown Extra | 支持 | 该语法的出处 |
| Python-Markdown | 支持（需启用 `def_list` 扩展） | MkDocs 需在 `markdown_extensions` 中添加 `def_list` |
| Pandoc | 支持 | `Term\n: Definition` 写法 |
| kramdown（Jekyll 默认） | 支持 | 与 PHP Extra 语法兼容 |
| Obsidian | 不支持 | 可通过内嵌 HTML 的 `<dl>` 实现 |
| Typora | 不支持原生语法 | 可通过内嵌 HTML 实现 |

**GitHub 上的具体退化表现**值得预演：下面的源码

```markdown
Git
: 分布式版本控制系统
```

在 GitHub 上会渲染为一个普通段落，冒号行被"懒延续"并入上一行，读者看到的是 `Git : 分布式版本控制系统` 这样的连排文本——结构信息完全丢失。因此面向 GitHub 的文档（README、Issue）不要使用定义列表语法。

## 4. CommonMark 兼容的替代方案

### 4.1 粗体加冒号（最常用）

```markdown
**Git**：分布式版本控制系统
**Markdown**：轻量级标记语言
```

任何渲染器都支持，源码与渲染结果一致性最好。

### 4.2 列表承载术语

```markdown
- **Git**：分布式版本控制系统
- **Markdown**：轻量级标记语言
```

适合术语较多的场合，视觉上比纯段落更有条理。

### 4.3 表格呈现

```markdown
| 术语 | 定义 |
| --- | --- |
| Git | 分布式版本控制系统 |
| Markdown | 轻量级标记语言 |
```

表格见 `markdown/100-Table`，适合需要严格两列对齐的对照场景。

### 4.4 内嵌 HTML 的 `<dl>`

需要真正的定义列表语义（如屏幕阅读器优化）时，直接写 HTML：

```markdown
<dl>
  <dt>Git</dt>
  <dd>分布式版本控制系统</dd>
  <dt>Markdown</dt>
  <dd>轻量级标记语言</dd>
</dl>
```

注意 `<dl>` 与内部标签之间保留空行，否则部分解析器把整段当作一个 HTML 块处理（详见 `markdown/230-HtmlEmbed`）。

## 5. 实战场景

### 5.1 文档末尾术语表

```markdown
## 术语表

VCS
: 版本控制系统

Repository
: 代码仓库，存储项目全部文件与历史
```

（仅限支持定义列表扩展的站点；GitHub 上的 README 请改用粗体加冒号。）

### 5.2 API 字段说明

```markdown
- **userId**：用户唯一标识，类型 string
- **token**：访问令牌，有效期 2 小时
```

### 5.3 缩写解释

```markdown
- **REST**：表述性状态转移（Representational State Transfer）
- **GraphQL**：一种 API 查询语言
```

## 6. 常见陷阱

1. **在 GitHub 上使用扩展语法**：结构退化为普通段落，这是最高频问题。发布前在目标平台预览。
2. **术语与定义之间插了空行**：PHP Markdown Extra 要求定义行紧接术语行，空行会把两者切成独立段落；个别实现（如某些配置下的 Pandoc）反而要求空行，跨实现写作前先查文档。
3. **冒号用了中文全角**：语法要求半角 `:`，全角冒号不构成定义行。
4. **定义缩进不一致**：嵌套块内容时缩进数量不足会被切回普通段落。
5. **混淆冒号与列表标记**：`: ` 是定义标记不是缩进列表，前面再加 `-` 属于错误写法。

## 小结

- 初学者要点：定义列表表达"术语——解释"，Markdown 核心语法没有它；GitHub 上请直接用"粗体加冒号"或列表的替代写法，任何平台都稳。
- 进阶注意：PHP Markdown Extra 风格（术语行 + `: 定义` 行）是扩展语法的事实标准，Python-Markdown（MkDocs 需启用 `def_list`）、Pandoc、kramdown 支持；需要真正的 `<dl>` 语义时用内嵌 HTML；发布前务必在目标渲染器上验证。
