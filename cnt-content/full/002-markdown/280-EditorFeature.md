---
order: 280
title: 编辑器功能
module: 'markdown'
category: 工具链
difficulty: beginner
description: Markdown编辑器核心功能：实时预览、快捷键操作与高效编辑技巧。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'markdown/210-LaTeXMathFormula'
  - 'markdown/220-Mermaid'
  - 'markdown/050-LinkImage'
  - 'markdown/290-ConversionTool'
prerequisites:
  - 'markdown/010-SyntaxGuide'
---


选编辑器不是选"最好的那个"，而是选"与你写作流程匹配的那个"：随手笔记看重即时渲染，工程文档看重插件、Git 与 lint 集成，服务器环境看重轻量。本篇先给一张选型地图，再讲预览、快捷键、片段与粘贴图片这些每天在用的效率功能，最后落到语法检查的配置——它们共同构成"写 Markdown 的手感"。

## 1. 编辑器类型

### 1.1 编辑器分类

| 类型           | 代表                 | 特点               |
| :------------- | :------------------- | :----------------- |
| **所见即所得** | Typora、Notion       | 编辑即预览，无分屏 |
| **分屏预览**   | VS Code、Obsidian    | 左编辑右预览       |
| **纯文本**     | Vim、Sublime Text    | 无预览，专注编辑   |
| **在线编辑**   | StackEdit、Dillinger | 浏览器中使用       |
| **平台内置**   | GitHub、GitLab       | 平台集成编辑器     |

### 1.2 选型建议

| 需求         | 推荐            | 理由               |
| :----------- | :-------------- | :----------------- |
| **长文写作** | Typora          | 所见即所得，沉浸式 |
| **技术文档** | VS Code         | 插件丰富，Git 集成 |
| **知识管理** | Obsidian        | 双链笔记、插件生态 |
| **快速编辑** | Vim / Nano      | 服务器环境         |
| **协作编辑** | Notion / HackMD | 实时协作           |

## 2. 实时预览

### 2.1 预览模式

| 模式           | 说明               | 适用场景     |
| :------------- | :----------------- | :----------- |
| **并排预览**   | 编辑区和预览区并排 | 对比查看效果 |
| **内联预览**   | 编辑区内直接渲染   | 快速确认格式 |
| **全屏预览**   | 只显示渲染结果     | 最终效果检查 |
| **所见即所得** | 编辑即渲染         | 长文写作     |

### 2.2 VS Code 预览

```bash
# 打开预览
Ctrl+Shift+V    # Windows/Linux
Cmd+Shift+V     # macOS

# 侧边预览
Ctrl+K V        # Windows/Linux（先按 Ctrl+K，松开后按 V）
Cmd+K V         # macOS
```

### 2.3 Obsidian 预览

Obsidian 支持三种编辑模式：

- **实时预览**：编辑时即时渲染 Markdown 语法
- **源码模式**：显示原始 Markdown 文本
- **阅读模式**：只读渲染视图

## 3. 快捷键

### 3.1 通用快捷键

| 操作         | VS Code        | Typora         | Obsidian     |
| :----------- | :------------- | :------------- | :----------- |
| **加粗**     | `Ctrl+B`       | `Ctrl+B`       | `Ctrl+B`     |
| **斜体**     | `Ctrl+I`       | `Ctrl+I`       | `Ctrl+I`     |
| **插入链接** | `Ctrl+K`       | `Ctrl+K`       | `Ctrl+K`     |
| **代码**     | `` Ctrl+` ``   | `` Ctrl+` ``   | `` Ctrl+` `` |
| **标题**     | `Ctrl+Shift+]` | `Ctrl+1~6`     | `Ctrl+1~6`   |
| **有序列表** | —              | `Ctrl+Shift+[` | —            |
| **无序列表** | —              | `Ctrl+Shift+]` | —            |
| **引用**     | —              | `Ctrl+Shift+Q` | —            |

### 3.2 VS Code Markdown 快捷键

| 操作         | 快捷键                  | 说明           |
| :----------- | :---------------------- | :------------- |
| **预览**     | `Ctrl+Shift+V`          | 打开预览标签   |
| **侧边预览** | `Ctrl+K V`              | 并排预览       |
| **全屏预览** | 预览中按 `Ctrl+Shift+V` | 切换全屏       |
| **目录**     | 预览中点击标题          | 跳转到对应位置 |

### 3.3 Typora 快捷键

| 操作           | 快捷键         | 说明           |
| :------------- | :------------- | :------------- |
| **源码模式**   | `Ctrl+/`       | 切换源码/渲染  |
| **专注模式**   | `F8`           | 高亮当前行     |
| **打字机模式** | `F9`           | 当前行居中     |
| **大纲**       | `Ctrl+Shift+O` | 显示文档大纲   |
| **插入表格**   | `Ctrl+T`       | 可视化创建表格 |
| **插入图片**   | `Ctrl+Shift+I` | 插入图片       |
| **高亮**       | `Ctrl+Shift+H` | `==高亮==`     |

## 4. 高效编辑技巧

### 4.1 代码片段（Snippets）

VS Code 中可以自定义 Markdown 代码片段：

````json
// .vscode/markdown.code-snippets
{
  "Markdown Table": {
    "prefix": "mdtable",
    "body": ["| ${1:列1} | ${2:列2} | ${3:列3} |", "| --- | --- | --- |", "| $0 |  |  |"],
    "description": "插入 Markdown 表格"
  },
  "Markdown Code Block": {
    "prefix": "mdcode",
    "body": ["```${1:language}", "$0", "```"],
    "description": "插入代码块"
  },
  "Markdown Note": {
    "prefix": "mdnote",
    "body": ["> **注意**: $0"],
    "description": "插入注意框"
  }
}
````

### 4.2 自动补全

| 触发           | 补全内容 | 说明     |
| :------------- | :------- | :------- |
| `#` + 空格     | 标题     | ATX 标题 |
| `-` + 空格     | 无序列表 | 列表项   |
| `1.` + 空格    | 有序列表 | 编号列表 |
| `>` + 空格     | 引用块   | 引用     |
| ` ``` ` + 语言 | 代码围栏 | 代码块   |
| `---` + 回车   | 分隔线   | 水平线   |

### 4.3 粘贴图片

| 编辑器       | 方式     | 说明               |
| :----------- | :------- | :----------------- |
| **Typora**   | 直接粘贴 | 自动保存到指定目录 |
| **VS Code**  | 需插件   | Paste Image 插件   |
| **Obsidian** | 直接粘贴 | 自动保存到附件目录 |
| **GitHub**   | 拖拽上传 | 自动上传到仓库     |

### 4.4 文件管理

```bash
# VS Code Markdown 相关插件
# - Markdown All in One: 快捷键、目录、预览
# - Markdown Preview Enhanced: 增强预览、Mermaid、数学公式
# - markdownlint: 语法检查
# - Paste Image: 粘贴图片
# - Markdown Table Formatter: 表格格式化
```

## 5. 语法检查

### 5.1 markdownlint

markdownlint 是 Markdown 代码质量工具，检查常见问题：

| 规则       | 编号  | 说明                  |
| :--------- | :---- | :-------------------- |
| 标题层级   | MD001 | 标题应按层级递进      |
| 首行标题   | MD041 | 文件首行应为顶级标题  |
| 行长度     | MD013 | 行长度限制（默认 80） |
| 行尾空格   | MD009 | 行尾不应有尾随空格（可豁免硬换行的两个空格） |
| 代码块语言 | MD040 | 代码围栏应指定语言    |
| 裸 URL     | MD034 | 裸 URL 应用尖括号包裹 |
| 链接图片风格 | MD054 | 行内/引用/自动链接风格统一 |

### 5.2 配置

```json
// .markdownlint.json
{
  "MD013": {
    "line_length": 120
  },
  "MD033": false,
  "MD041": false
}
```

## 动手实践：遮代码自检

**练习 1（快捷键默写）**：遮住第 3 节的三张表，只看功能列默写快捷键（预览、侧边预览、加粗、行内代码），写完再对照——记不住的说明还没形成肌肉记忆，回去练。

**提示**：VS Code 的预览系是 `Ctrl+Shift+V` 与 `Ctrl+K V`（先按 `Ctrl+K` 松开再按 `V`，这是 chord 组合键，不是同时按）；Typora 的源码切换是 `Ctrl+/`。

<details>
<summary>参考答案（先默写再看）</summary>

| 功能 | VS Code | Typora |
| :--- | :--- | :--- |
| 打开预览 | `Ctrl+Shift+V` | 所见即所得，无需切换 |
| 侧边预览 | `Ctrl+K V` | — |
| 源码模式 | — | `Ctrl+/` |
| 加粗 | `Ctrl+B` | `Ctrl+B` |
| 行内代码 | `` Ctrl+` `` | `` Ctrl+` `` |

</details>

要点自查：VS Code 是"编辑区 + 预览区"两区模型，Typora 是所见即所得单区模型——模型的差异决定了哪些快捷键存在。

**练习 2（片段与 lint）**：在 VS Code 里按第 4.1 节的结构建一个自定义片段（prefix 自取，body 含一个代码围栏），用 `mdtable` 触发验证；再装 markdownlint 扩展，故意写一行 `#没有空格的标题` 与一行超长文本，观察实时划线提示并按 5.2 的配置关闭其中一条。

**遮码自检（选型层）**：遮住第 1 节，口头回答——长文写作、技术文档、知识管理三类需求各推荐什么编辑器？理由各是什么？（答案：Typora 沉浸式所见即所得；VS Code 插件丰富且 Git 集成；Obsidian 双链与插件生态。）
