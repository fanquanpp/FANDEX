---
order: 63
title: 锚点跳转
module: markdown
category: 'Markdown Basics'
difficulty: intermediate
description: Markdown锚点跳转机制：标题锚点、自定义锚点与跨文档链接。
author: fanquanpp
updated: '2026-06-14'
related:
  - markdown/转换工具
  - markdown/自动目录
  - markdown/图片CDN加速
  - markdown/版本控制下的PR协作
prerequisites:
  - markdown/语法指南
---

## 1. 锚点概述

### 1.1 什么是锚点

锚点是 HTML 中的**页面内定位标记**，允许通过 URL 的片段标识符（`#` 后的部分）跳转到页面内的指定位置。

```markdown
[跳转到安装章节](#安装)

## 安装

安装步骤...
```

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

## 目录

- [安装](#安装)
- [配置](#配置)
- [使用](#使用)
  - [基本用法](#基本用法)
  - [高级用法](#高级用法)
- [FAQ](#faq)

## 安装

## 配置

## 使用

### 基本用法

### 高级用法

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
