---
order: 100
title: 规范文档编写
module: markdown
category: toolchain
difficulty: intermediate
description: Markdown规范文档编写进阶：表格进阶、脚注、自动目录、交叉引用等高级技巧。
author: fanquanpp
updated: '2026-06-14'
related:
  - markdown/表格
  - markdown/语法速查
  - markdown/高级语法与文档自动化
prerequisites:
  - markdown/语法指南
---

## 1. 表格进阶

### 1.1 基本表格

```markdown
| 列1   | 列2   | 列3   |
| ----- | ----- | ----- |
| 数据1 | 数据2 | 数据3 |
```

### 1.2 对齐方式

```markdown
| 左对齐       |  居中对齐  |       右对齐 |
| :----------- | :--------: | -----------: |
| 左           |     中     |           右 |
| 长文本左对齐 | 长文本居中 | 长文本右对齐 |
```

- `:---` 左对齐（默认）
- `:---:` 居中对齐
- `---:` 右对齐

### 1.3 复杂表格处理

Markdown 原生不支持合并单元格，可使用 HTML：

```html
<table>
  <thead>
    <tr>
      <th>模块</th>
      <th colspan="2">配置项</th>
    </tr>
    <tr>
      <th></th>
      <th>名称</th>
      <th>默认值</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td rowspan="2">数据库</td>
      <td>host</td>
      <td>localhost</td>
    </tr>
    <tr>
      <td>port</td>
      <td>5432</td>
    </tr>
  </tbody>
</table>
```

### 1.4 表格内换行

使用 `<br>` 标签实现表格内换行：

```markdown
| 项目  | 描述                       |
| ----- | -------------------------- |
| 功能A | 第一行<br>第二行<br>第三行 |
```

### 1.5 表格内代码

```markdown
| 方法 | 语法            | 说明             |
| ---- | --------------- | ---------------- |
| 数组 | `Array.from()`  | 从类数组创建数组 |
| 对象 | `Object.keys()` | 获取键名数组     |
```

## 2. 脚注

### 2.1 基本脚注

```markdown
这是一段包含脚注的文本[^1]，还有另一个脚注[^2]。

[^1]: 这是第一个脚注的内容。

[^2]: 这是第二个脚注的内容。
```

### 2.2 命名脚注

```markdown
根据最新研究[^study-2024]显示...

[^study-2024]: Smith, J. et al. "Advanced Research" Nature, 2024.
```

### 2.3 行内脚注

```markdown
这是行内脚注^[这是行内脚注的内容，无需单独声明。]的示例。
```

### 2.4 多引用脚注

```markdown
同一脚注可被多次引用[^note]，如这里[^note]和这里[^note]。

[^note]: 这个脚注被引用了多次。
```

### 2.5 脚注位置

脚注定义可放在文档任意位置，渲染器会自动将它们收集到文档末尾。推荐放在引用段落之后或文档末尾。

## 3. 自动目录

### 3.1 GitHub 风格目录

```markdown
## 目录

- [概述](#概述)
- [安装](#安装)
  - [npm 安装](#npm-安装)
  - [yarn 安装](#yarn-安装)
- [配置](#配置)
- [API 参考](#api-参考)
```

锚点生成规则：

- 标题文本转小写
- 空格替换为 `-`
- 特殊字符移除（除 `-`）
- 中文标题直接使用中文作为锚点（部分渲染器支持）

### 3.2 自动生成目录

使用工具自动生成目录：

```bash
# 使用 markdown-toc
npx markdown-toc README.md -i

# 使用 doctoc
npx doctoc README.md
```

### 3.3 Astro/VitePress 目录组件

```astro
---
// 在 Astro 中使用目录组件
import TableOfContents from '../components/TableOfContents.astro';
---

<TableOfContents headings={headings} />
```

VitePress 中使用 `[[_TOC_]]`：

```markdown
## 目录

[[_TOC_]]

## 第一节
```

## 4. 交叉引用

### 4.1 标题锚点引用

```markdown
详见 [安装指南](#安装指南) 章节。

引用子标题：参见 [npm 安装](#npm-安装)。
```

### 4.2 自定义锚点

```html
<h2 id="custom-anchor">自定义锚点标题</h2>
```

引用：

```markdown
跳转到 [自定义锚点](#custom-anchor)
```

### 4.3 跨文件引用

```markdown
详见 [API 文档](./api-reference.md#认证) 中的认证章节。

引用其他目录的文件：参见 [配置说明](../config/settings.md#环境变量)。
```

### 4.4 引用代码块

使用 HTML 锚点标记代码块：

````html
<div id="example-code">```javascript const greeting = 'Hello, World!';</div>
````

</div>
```

引用：

```markdown
参见 [示例代码](#example-code)
```

## 5. 文档结构规范

### 5.1 标题层级

```markdown
# 文档标题（H1，仅一个）

## 章节（H2）

### 小节（H3）

#### 细节（H4，尽量少用）
```

规则：

- 每个文档只有一个 H1
- 不跳过层级（H1 → H3 是错误的）
- H4 以下尽量少用

### 5.2 元信息模板

```markdown
---
order: 100
title: '文档标题'
module: '模块名'
category: '分类'
difficulty: '难度'
description: '简短描述'
author: 'fanquanpp'
updated: 2026-06-14
---
```

### 5.3 章节组织

```markdown
## 1. 概述

## 2. 基础概念

### 2.1 核心术语

### 2.2 工作原理

## 3. 实践指南

### 3.1 快速开始

### 3.2 进阶配置

## 4. 最佳实践

## 5. 常见问题

## 6. 参考资料
```

### 5.4 提示框

```markdown
> **提示**：这是一个有用的提示信息。

> **注意**：这是一个需要注意的警告。

> **错误**：这是一个常见错误的说明。

> **推荐**：这是一个推荐的做法。
```

```

```
