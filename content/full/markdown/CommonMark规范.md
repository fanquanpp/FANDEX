---
order: 50
title: CommonMark规范
module: markdown
category: 'Markdown Basics'
difficulty: intermediate
description: CommonMark规范详解：标准化Markdown的定义、解析规则与一致性测试。
author: fanquanpp
updated: '2026-06-14'
related:
  - markdown/段落与换行
  - markdown/基础文本格式
  - markdown/列表语法
  - markdown/GitHub风格扩展
prerequisites:
  - markdown/语法指南
---

## 1. CommonMark 概述

### 1.1 为什么需要 CommonMark

原始 Markdown 由 John Gruber 于 2004 年创建，但规范描述模糊，导致各平台实现差异巨大。CommonMark 项目始于 2014 年，目标是创建**无歧义的 Markdown 标准规范**。

| 问题                   | 示例                               |
| :--------------------- | :--------------------------------- |
| **嵌套列表解析不一致** | 不同解析器对缩进列表的处理不同     |
| **链接定义优先级**     | 行内链接 vs 引用链接的优先级不明确 |
| **HTML 块边界**        | HTML 块何时结束的定义不统一        |
| **强调规则**           | `*foo*bar*baz*` 的解析结果不一致   |

### 1.2 CommonMark 的目标

- **无歧义**：每个输入都有唯一确定的输出
- **可测试**：提供超过 8,000 个测试用例
- **向后兼容**：尽量兼容原始 Markdown
- **可扩展**：允许定义扩展规范（如 GFM）

## 2. 规范核心规则

### 2.1 块级与行内结构

CommonMark 将文档解析分为两个阶段：

```
输入文本
    ↓
第一阶段：识别块级结构
  （段落、标题、列表、代码块、引用等）
    ↓
第二阶段：在段落文本中识别行内结构
  （强调、链接、代码、图片等）
```

### 2.2 空白处理规则

| 规则         | 说明               | 示例                       |
| :----------- | :----------------- | :------------------------- |
| **行尾空格** | 连续空格可触发换行 | `空格空格↵` → `<br>`       |
| **制表符**   | 视为 4 个空格      | `\t` → `    `              |
| **连续空行** | 多个空行等同一个   | 段落间只需一个空行         |
| **缩进**     | 4 空格触发代码块   | `    code` → `<pre><code>` |

### 2.3 列表解析规则

CommonMark 对列表的解析有严格定义：

```markdown
- 项目一
  - 子项目（2空格缩进）

1. 有序列表
   1. 子列表（3空格缩进，与文本对齐）
```

**关键规则**：

- 无序列表项的子内容需缩进到列表标记后的第一个非空字符位置
- 有序列表项的子内容需缩进到列表标记（含点号和空格）之后的位置
- 列表连续性由空行和缩进共同决定

### 2.4 强调规则

CommonMark 使用**左右规则**解析强调：

```markdown
_foo_ → <em>foo</em>
**foo** → <strong>foo</strong>
**_foo_** → <strong><em>foo</em></strong>
_foo\*\* → <em>foo</em>_ (右侧\**只匹配一个)
foo*bar* → foo<em>bar</em>
5*3*2 → 5*3\*2 (数字间不触发强调)
```

**规则要点**：

- `*` 和 `_` 都可以表示强调，但 `_` 受单词边界限制
- 左侧 `*`/`_` 前不能是字母数字（或位于行首）
- 右侧 `*`/`_` 后不能是字母数字（或位于行尾）
- 嵌套强调时，外层不能先关闭

## 3. 与原始 Markdown 的差异

### 3.1 关键差异

| 方面         | 原始 Markdown | CommonMark                   |
| :----------- | :------------ | :--------------------------- |
| **嵌套强调** | 不支持        | 支持 `***bold italic***`     |
| **列表续行** | 模糊          | 严格缩进规则                 |
| **HTML 块**  | 7 种标签      | 详细的标签和结束规则         |
| **链接引用** | 不区分大小写  | 区分大小写                   |
| **自动链接** | 仅 `<URL>`    | 同上，GFM 扩展了无尖括号形式 |
| **硬换行**   | 行尾两个空格  | 行尾两个空格或 `\`           |

### 3.2 已知不兼容

```markdown
<!-- 原始 Markdown 解析为列表 -->

1. 第一项
2. 第二项

<!-- 中间有空行时 -->

1. 第一项

2. 第二项
   <!-- CommonMark 解析为两个独立列表 -->
   <!-- 原始 Markdown 解析为一个列表 -->
```

## 4. 解析算法

### 4.2 两阶段解析

**第一阶段：块级解析**

```
1. 逐行读取输入
2. 将行分类（ATX 标题、Setext 标题、代码围栏、引用、列表项等）
3. 构建块级文档树
4. 将内容行附加到对应的块级元素
```

**第二阶段：行内解析**

```
1. 遍历段落和标题的文本内容
2. 识别行内元素（代码跨度、强调、链接等）
3. 构建行内元素树
```

### 4.3 优先级

行内解析的优先级从高到低：

1. **代码跨度**（`` `code` ``）— 最高优先级，内部不解析
2. **自动链接**（`<url>`）
3. **HTML 标签**
4. **强调**（`*` / `_`）
5. **链接和图片**
6. **文本** — 最低优先级

## 5. 一致性测试

### 5.1 测试套件

CommonMark 提供了完整的测试套件，每个测试用例包含：

```yaml
# 示例测试用例
---
title: 'ATX headers'
section: 'ATX headings'
example: 32
markdown: |
  ## foo
    bar
  baz
html: |
  <h2>foo</h2>
  <pre><code>bar
  </code></pre>
  <p>baz</p>
---
```

### 5.2 验证工具

```bash
# 使用 cmark 参考实现
echo '# Hello' | cmark
# <h1>Hello</h1>

# 运行规范测试
python3 spec_tests.py --program cmark

# 使用 CommonMark.js
npm install commonmark
node -e "var commonmark = require('commonmark'); \
  var reader = new commonmark.Parser(); \
  var writer = commonmark.HtmlRenderer(); \
  var doc = reader.parse('# Hello'); \
  console.log(writer.render(doc));"
```

## 6. 实现与生态

### 6.1 主要实现

| 实现              | 语言       | 说明                        |
| :---------------- | :--------- | :-------------------------- |
| **cmark**         | C          | 参考实现，性能最优          |
| **commonmark.js** | JavaScript | JavaScript 参考实现         |
| **commonmark-hs** | Haskell    | 类型安全的实现              |
| **comrak**        | Rust       | 高性能 Rust 实现            |
| **goldmark**      | Go         | Go 生态主流 Markdown 解析器 |

### 6.2 扩展规范

CommonMark 定义了扩展机制，GFM（GitHub Flavored Markdown）是最著名的扩展：

- **表格**：`| col1 | col2 |`
- **任务列表**：`- [ ] todo`
- **删除线**：`~~strikethrough~~`
- **自动链接**：`https://example.com`
- **代码围栏语言**：` ```python `
