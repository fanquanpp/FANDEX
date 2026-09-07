---
order: 200
title: 锚点跳转
module: 'markdown'
category: 工具链
difficulty: intermediate
description: Markdown锚点跳转机制：标题锚点、自定义锚点与跨文档链接。
author: fanquanpp
updated: '2026-08-02'
related:
  - 'markdown/018-ConversionTool'
  - 'markdown/019-AutoTOC'
  - 'markdown/021-ImageCDNAcceleration'
  - 'markdown/022-VCSPRCollaboration'
prerequisites:
  - 'markdown/001-SyntaxGuide'
---

## 自动生成的标题锚点

**基本写法：标题自动生成锚点**
`## <标题>`
```markdown
# 标题自动生成锚点 id
## 安装步骤
# 锚点为 #安装步骤
```

---

**基本写法：链接到本页锚点**
`[<文本>](#<锚点>)`
```markdown
# 跳转到当前文档的某标题
[跳到安装步骤](#安装步骤)
```

---

**基本写法：英文标题锚点规则**
`## <English Title>`
```markdown
# GitHub 规则：小写、空格转横线、去特殊字符
## Getting Started
# 锚点为 #getting-started
```

---

**基本写法：中文标题锚点**
`## <中文标题>`
```markdown
# 中文标题原样作为锚点
## 中文标题
# 锚点为 #中文标题
```

---

**基本写法：带特殊字符的标题**
`## <标题 (含符号)>`
```markdown
# 特殊字符被忽略
## API v2.0 - 简介
# 锚点为 #api-v20--简介
```

---

## 重复标题处理

**基本写法：重复标题加序号**
`## <标题>` 出现多次
```markdown
# 第二次出现的标题自动加 -1，第三次加 -2
## 示例
# 第一个锚点 #示例
# 第二个锚点 #示例-1
```

---

**基本写法：手动锚点**
`## <标题> {#<自定义锚点>}`
```markdown
# 用 {#id} 指定自定义锚点（部分渲染器支持）
## 示例
# 第一个锚点 #示例
# 第二个锚点 #示例-1
```

---

**基本写法：手动锚点**
`## <标题> {#<自定义锚点>}`
```markdown
# 用 {#id} 指定自定义锚点（部分渲染器支持）
## 自定义锚点 {#my-anchor}
```

---

## 自定义锚点（HTML）

**基本写法：用 HTML 锚点**
`<a id="<锚点>"></a>`
```markdown
# 用 HTML 标签定义锚点
<a id="custom-section"></a>
## 章节内容
```

---

**基本写法：链接到自定义锚点**
`[<文本>](#<自定义锚点>)`
```markdown
# 跳转到 HTML 定义的锚点
[跳到自定义](#custom-section)
```

---

**基本写法：name 属性锚点**
`<a name="<锚点>"></a>`
```markdown
# 旧式 name 属性定义锚点
<a name="section-1"></a>
```

---

## 跨文档锚点跳转

**基本写法：链接到其他文件锚点`
`[<文本>](<文件>#<锚点>)`
```markdown
# 跳转到其他 markdown 文件的标题
[参见安装文档](install.md#安装步骤)
```

---

**基本写法：链接到 HTML 文件锚点**

`[<文本>](<文件>.html#<锚点>)`
```markdown
# 跳转到 HTML 文件的锚点
[查看页面](page.html#section)
```

---

**基本写法：绝对路径锚点**

`[<文本>](/<路径>#<锚点>)`
```markdown
# 用绝对路径跳转
[文档首页](/docs/index.md#top)
```

---

## 目录（TOC）自动生成

**基本写法：GitHub 自动目录`
`<鼠标悬停标题旁的链接图标>`
```markdown
# GitHub 在标题旁自动生成链接图标
# README 顶部会自动生成目录
## 章节一
```

---

**基本写法：VS Code 插件生成 TOC`
`通过 Markdown All in One 等插件生成`
```markdown
# 用插件自动生成目录
- [章节一](#章节一)
- [章节二](#章节二)
```

---

**基本写法：手动目录`
`- [<章节>](#<锚点>)`
```markdown
# 手动维护目录列表
## GitHub 锚点规则

**基本写法：转小写`
`<标题>` 转为 `<小写>`
```markdown
# GitHub 锚点全部小写
## Hello World
# 锚点 #hello-world
```

---

**基本写法：空格转横线`
`<空格>` 转为 `-`
```markdown
# 空格替换为横线
## Getting Started Guide
# 锚点 #getting-started-guide
```

---

**基本写法：去除特殊字符`
`<特殊字符>` 被忽略
```markdown
# 标点符号被移除
## What's New?
# 锚点 #whats-new
```

---

**基本写法：连续横线合并`
`<多个空格>` 合并为单个 `-`
```markdown
# 多个空格不产生多个横线
## A  B
# 锚点 #a--b（部分渲染器合并为 #a-b）
```

---

## 锚点实战场景

**基本写法：返回顶部`
`[返回顶部](#<顶部锚点>)`
```markdown
# 在文档末尾添加返回顶部链接
[返回顶部](#top)
```

---

**基本写法：顶部锚点定义`
`<a id="top"></a>`
```markdown
# 文档顶部定义锚点
<a id="top"></a>
# 标题
```

---

**基本写法：脚注式跳转`
`<正文>[<跳转>](#<锚点>)`
```markdown
# 文中插入跳转链接
详见 [附录](#附录)。
```

---

**基本写法：导航栏式目录`
`[<章节1>](#<锚点1>) | [<章节2>](#<锚点2>)`
```markdown
# 顶部水平导航目录
[安装](#安装) | [配置](#配置) | [使用](#使用)
```

---

## 不同渲染器差异

**基本写法：GitHub 锚点`
`[<文本>](#<小写横线格式>)`
```markdown
# GitHub 标题生成小写横线锚点
[跳转](#section-title)
```

---

**基本写法：GitLab 锚点`
`[<文本>](#<锚点>)`
```markdown
# GitLab 类似 GitHub 规则
[跳转](#section-title)
```

---

**基本写法：VuePress 自定义容器锚点`
`## <标题>`
```markdown
# VuePress 自动生成侧边栏目录与锚点
## 章节标题
```

---

**基本写法：Docusaurus 锚点`
`## <标题>`
```markdown
# Docusaurus 自动生成 TOC 与锚点
## Section Title
```

---

## 锚点链接验证

**基本写法：检查锚点有效性`
`点击链接验证跳转`
```markdown
# 提交前点击所有锚点链接验证
[测试链接](#测试锚点)
```

---

**基本写法：用工具检测`
`markdown-link-check <文件>`
```bash
# 用工具检测 markdown 链接有效性
markdown-link-check README.md
```

---

## 锚点命名规范

**基本写法：英文锚点规范`
`## <English Title>`
```markdown
# 推荐使用英文锚点避免编码问题
## Installation Steps
```

---

**基本写法：简短锚点`
`## <简短标题>`
```markdown
# 锚点尽量简短易记
## Quick Start
```

---

**基本写法：层级清晰`
`## <父章节> ### <子章节>`
```markdown
# 通过标题层级反映文档结构
## 基础
## 安装

## 配置

## 进阶
### 高级用法
```

---

## 注意事项

**基本写法：锚点区分大小写`
`[<文本>](#<精确大小写>)`
```markdown
# 锚点通常区分大小写需精确匹配
[跳转](#SectionTitle)
```

---

**基本写法：避免锚点重复`
`为重复标题指定自定义锚点`
```markdown
# 重复标题用自定义锚点区分
## 示例 {#example-1}
## 示例 {#example-2}
```

---

**基本写法：链接前后留空行`
`<段落>`
`[<链接>](#<锚点>)`
```markdown
# 链接与上下文用空行分隔避免解析问题
正文段落。

[跳转](#section)

下一段落。
```
## 1. 锚点概述

### 1.1 什么是锚点

锚点是 HTML 中的**页面内定位标记**，允许通过 URL 的片段标识符（`#` 后的部分）跳转到页面内的指定位置。

```markdown
[跳转到安装章节](#安装)

### 1.2 锚点的工作原理

```
URL: https://example.com/docs#installation
                              ↑            ↑
                           页面路径      锚点标识符

1. 浏览器加载页面
2. 查找 id="installation" 的元素
3. 滚动到该元素位置
```

## 2. 标题自动锚点

### 2.1 自动生成规则

Markdown 渲染器会自动为标题生成锚点 ID：

```markdown
## Getting Started → <h2 id="getting-started">

## Hello World! → <h2 id="hello-world">

## API v2.0 → <h2 id="api-v20">

## C++ 编程 → <h2 id="c-编程">
```

### 2.2 GitHub 锚点规则

| 规则           | 输入标题          | 生成的 ID          |
| :------------- | :---------------- | :----------------- |
| 转小写         | `Getting Started` | `getting-started`  |
| 空格→连字符    | `Hello World`     | `hello-world`      |
| 移除标点       | `What's New?`     | `whats-new`        |
| 保留中文       | `安装指南`        | `安装指南`         |
| 保留数字       | `Step 1`          | `step-1`           |
| 连续连字符合并 | `A --- B`         | `a----b`           |
| 重复 ID 加后缀 | 两个 `Hello`      | `hello`, `hello-1` |

### 2.3 各平台差异

| 平台         | 中文处理 | 重复标题     | 特殊字符 |
| :----------- | :------- | :----------- | :------- |
| **GitHub**   | 保留     | 加 `-1` 后缀 | 移除     |
| **GitLab**   | 保留     | 加 `-1` 后缀 | 移除     |
| **Hugo**     | 可配置   | 加 `-1` 后缀 | 移除     |
| **VuePress** | 可配置   | 加 `-1` 后缀 | 移除     |
| **Obsidian** | 保留     | 不重复       | 移除     |

## 3. 自定义锚点

### 3.1 HTML 方式

```markdown
<a id="custom-anchor"></a>

## 标题

内容...
```

链接到自定义锚点：

```markdown
[跳转到自定义位置](#custom-anchor)
```

### 3.2 Hugo 短代码

```markdown
## 标题 {#my-anchor}

内容...

[跳转](#my-anchor)
```

### 3.3 Kramdown 方式

```markdown
## 标题

{: #my-anchor}

[跳转](#my-anchor)
```

### 3.4 VuePress 方式

VuePress 自动为标题生成锚点，也支持自定义：

```markdown
## 标题 <MyAnchor/>

[跳转](#myanchor)
```

## 4. 跳转链接语法

### 4.1 页面内跳转

```markdown
[跳转到安装](#安装)
[跳转到配置](#配置)
[跳转到 FAQ](#常见问题)
```

### 4.2 跨页面跳转

```markdown
[跳转到其他页面的章节](./other-page.md#章节标题)
[跳转到其他页面](../guide/README.md#概述)
```

### 4.3 跨站点跳转

```markdown
[跳转到外部页面的锚点](https://example.com/docs#section)
```

## 5. 实际应用

### 5.1 README 目录

```markdown
# My Project

## 使用

### 基本用法

## FAQ
```

### 5.2 交叉引用

在长文档中引用其他章节：

```markdown
如需了解安装步骤，请参阅[安装指南](#安装指南)。

详细配置选项请参考[高级配置](#高级配置)章节。
```

### 5.3 返回顶部

```markdown
<a id="top"></a>

# 文档标题

... 长文档内容 ...

[↑ 返回顶部](#top)
```

## 6. 常见问题

### 6.1 锚点不生效

| 问题             | 原因           | 解决方案               |
| :--------------- | :------------- | :--------------------- |
| 点击无反应       | 锚点 ID 不匹配 | 检查大小写和连字符     |
| 中文锚点乱码     | URL 编码问题   | 使用英文锚点或检查编码 |
| 重复标题跳转错误 | 多个相同 ID    | 使用自定义锚点区分     |
| 跨页面跳转失败   | 路径错误       | 检查相对路径           |

### 6.2 调试技巧

```javascript
// 在浏览器控制台查看所有锚点
document.querySelectorAll('[id]').forEach((el) => {
  console.log(`#${el.id} → ${el.textContent.trim().substring(0, 30)}`);
});
```

### 6.3 最佳实践

- 优先使用英文标题，确保锚点兼容性
- 避免重复标题，或使用自定义锚点区分
- 长文档在每章末尾添加返回目录链接
- 使用自动目录生成工具而非手动维护
