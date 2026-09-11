---
order: 180
title: Markdown 提示框（admonition/callout）
module: 'markdown'
category: 工具链
difficulty: beginner
description: GitHub 警报块、Obsidian Callout、MkDocs 与 Docusaurus 提示框语法及跨平台兼容方案。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'markdown/070-BlockquoteNestedList'
  - 'markdown/110-GitHubFlavoredMarkdown'
  - 'markdown/230-HtmlEmbed'
prerequisites:
  - 'markdown/010-SyntaxGuide'
---

> **认知导入（Layer 1 进阶层）**
> 前置知识：031 引用与嵌套列表（GitHub/Obsidian 的提示框都建立在引用语法之上）。
> 边界说明：提示框**没有跨平台的统一标准**——GitHub、Obsidian、MkDocs、Docusaurus 各有一套私有语法。本篇按平台分别讲清写法，并给出任何平台都生效的兜底方案。
> 强制练习：在 GitHub 仓库的任意 md 文件里写一个 `> [!NOTE]` 警报块并预览，再改成小写 `[!note]` 观察差异。

## 1. 提示框是什么

提示框（admonition / callout）是一块带颜色、图标和标题的强调区域，用来把"注意""警告""小技巧"从正文中凸显出来。它本质上是块引用（blockquote）的视觉增强：多数平台的语法都长在 `>` 引用上。

类比：正文是公路上匀速行驶的车流，提示框就是路边的黄色警示牌——内容仍在同一页里，但视觉层级完全不同。

需要先建立预期：这些都是**各平台的扩展语法**。在写作前先确认目标渲染器，选对应的一套；跨平台分发时用第 6 节的兜底写法。

## 2. GitHub 警报块（alerts）

GitHub 于 2024 年 1 月起支持五种警报块，写在引用块的第一行：

```markdown
> [!NOTE]
> 补充说明信息，用户阅读时值得留意。

> [!TIP]
> 有助于更好完成任务的技巧建议。

> [!IMPORTANT]
> 用户必须知道的关键信息。

> [!WARNING]
> 可能带来风险的内容，请立即关注。

> [!CAUTION]
> 负面后果的严重警告。
```

渲染为带图标与配色的强调块，标签（NOTE 等）固定显示，内容为后续引用行。

### 2.1 语法要点与限制

- **标记必须全大写**：`[!NOTE]` 有效，`[!note]` 不会被识别为警报块（这一点与 Obsidian 相反）。
- 标记必须位于引用块**第一行**，后续以 `>` 开头的行都属于警报块内容；空引用行 `>` 可分隔段落。
- 标题文字不可自定义，固定显示 NOTE/TIP 等标签；Obsidian 那种 `[!note] 自定义标题` 的写法在 GitHub 上无效。
- 警报块支持嵌套内容（如列表），但**警报块之间不能互相嵌套**，也不要嵌进其他块结构。

适用的位置：仓库内 Markdown 文件、Issue、Pull Request、Discussion 及评论均会渲染。

## 3. Obsidian Callout

Obsidian 的 callout 同样基于引用块，类型名**不区分大小写**，且支持自定义标题与折叠控制：

```markdown
> [!note] 提示
> 这是一条提示内容。

> [!info]+ 默认展开，可点击折叠
> 内容。

> [!warning]- 默认折叠，点击展开
> 内容。
```

规则：类型后跟 `+` 表示可折叠且默认展开；跟 `-` 表示可折叠且默认收起；不带符号则不可折叠。类型名后可以直接跟自定义标题；省略标题时显示类型名首字母大写。

Obsidian 内建类型（常用部分）：

| 类型 | 用途 |
| :--- | :--- |
| `note` / `info` / `abstract` | 普通备注、信息、摘要 |
| `tip` / `hint` | 技巧 |
| `success` / `failure` | 成功 / 失败状态 |
| `question` / `help` | 疑问、FAQ |
| `warning` / `caution` | 警告 |
| `danger` / `error` / `bug` | 危险操作、错误、缺陷 |
| `example` | 示例 |
| `quote` | 引用 |
| `todo` | 待办 |

callout 内部可以承载任意块级内容，每行以 `>` 开头即可：

````markdown
> [!todo] 待办事项
> - [x] 任务一
> - [ ] 任务二

> [!example] 代码示例
> ```python
> print("hello")
> ```
````

未知类型（如 `> [!my-custom]`）在 Obsidian 中仍会渲染成中性样式，可通过 CSS 代码片段（`--callout-color` 等变量）自定义外观。

## 4. MkDocs / Python-Markdown Admonition

MkDocs Material 主题使用 `!!!` 语法，内容整体缩进 4 个空格：

```markdown
!!! note
    这是一个提示框内容。

!!! warning "重要警告"
    类型后用引号写自定义标题。
```

可折叠变体用问号：`???` 默认收起，`???+` 默认展开：

```markdown
??? tip "点击展开的提示"
    默认折叠的内容。

???+ note
    默认展开、可折叠的内容。
```

## 5. Docusaurus Admonition

Docusaurus 基于 MDX，用三个冒号包裹，内容不需要缩进：

```markdown
:::note
这是一个提示。

:::tip 内层提示
支持嵌套提示框。
:::

:::
```

类型后跟空格加文字即为自定义标题：`:::warning 重要警告`。

## 6. 跨平台对照与通用兜底

| 平台 | 语法 | 类型名大小写 | 自定义标题 | 折叠 |
| :--- | :--- | :--- | :--- | :--- |
| GitHub | `> [!NOTE]` | 必须大写 | 不支持 | 不支持 |
| Obsidian | `> [!note]` | 不敏感 | 支持 | `+` / `-` |
| MkDocs Material | `!!! note` / `??? note` | 小写惯例 | `"标题"` | `???` / `???+` |
| Docusaurus | `:::note ... :::` | 小写惯例 | 类型后接文字 | 支持变体 |

若文档需要跨平台分发，或目标渲染器完全不认识这些扩展，用两种兜底：

**引用加粗体（任何 Markdown 渲染器都支持）**：

```markdown
> **Note**: 这里是说明文字
> **Warning**: 注意潜在风险
```

**内嵌 HTML（详见 `markdown/230-HtmlEmbed`）**：

```html
<div class="alert alert-warning">
<strong>警告</strong>: 此操作不可恢复
</div>
```

## 7. 实战场景

```markdown
> [!WARNING]
> 弃用提示：此 API 已废弃，请迁移到 v2 版本。

> [!NOTE]
> 本功能需要 v2.0 及以上版本。

> [!TIP]
> 按 Tab 可快速补全文件名。
```

使用密度建议：一篇文档中警报块不超过三五处。提示框的价值在于稀缺性——满屏都是警示牌，等于没有警示牌。一般约定：WARNING/CAUTION 留给真正有风险的操作，普通说明用正文或普通引用。

## 8. 常见陷阱

1. **大小写搞混平台**：GitHub 必须大写 `[!NOTE]`，Obsidian 不敏感；从 Obsidian 粘贴到 GitHub 时小写 callout 会退化为普通引用。
2. **GitHub 端尝试自定义标题**：`> [!NOTE] 我的标题` 中的"我的标题"不会成为标题，识别会直接失败或按内容处理。
3. **MkDocs 内容忘了缩进**：`!!!` 之下没有 4 空格缩进的行不属于提示框。
4. **把警报块当装饰用**：样式≠语义，滥用 warning 会稀释真正风险的注意力。
5. **在纯 CommonMark 渲染器上期待特效**：所有提示框语法都是扩展，兜底方案见第 6 节。

## 小结

- 初学者要点：GitHub 用 `> [!NOTE]` 等五种大写警报块；Obsidian 用 `> [!note] 标题`，`+`/`-` 控制折叠；MkDocs 用 `!!! note` 加 4 空格缩进；通用兜底是"引用 + 粗体"。
- 进阶注意：提示框语法全是平台扩展，没有统一标准；GitHub 不可自定义标题、不可嵌套警报块；Obsidian 类型名不区分大小写且可 CSS 定制；跨平台文档先确认目标渲染器再选语法。
