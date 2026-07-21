---
order: 54
title: 链接与锚点
module: html5
category: HTML5
difficulty: beginner
description: a标签、target、相对/绝对路径
author: fanquanpp
updated: '2026-06-14'
related:
  - html5/文本语义
  - html5/列表
  - html5/图像与响应式图片
  - html5/音频与视频
prerequisites:
  - html5/概述与核心特性
---

## 1. 超链接基础

```html
<a href="https://example.com">访问示例网站</a>
<a href="mailto:contact@example.com">发送邮件</a>
<a href="tel:+861012345678">拨打电话</a>
<a href="document.pdf" download>下载文件</a>
```

### 1.1 target 属性

| 值        | 行为                 |
| --------- | -------------------- |
| `_self`   | 当前窗口打开（默认） |
| `_blank`  | 新窗口/标签页打开    |
| `_parent` | 父框架中打开         |
| `_top`    | 顶层窗口中打开       |

```html
<a href="https://example.com" target="_blank" rel="noopener noreferrer">外部链接</a>
```

> **安全提示**：使用 `target="_blank"` 时务必添加 `rel="noopener noreferrer"`。

### 1.2 rel 属性

```html
<a rel="noopener">无 opener</a>
<a rel="noreferrer">不发送 Referer</a>
<a rel="nofollow">不传递权重</a>
<a rel="ugc">用户生成内容</a>
```

## 2. 锚点与页面内导航

```html
<h2 id="section1">第一节</h2>
<a href="#section1">跳转到第一节</a>
```

```css
html {
  scroll-behavior: smooth;
}
[id] {
  scroll-margin-top: 80px;
}
```

## 3. 路径系统

```html
<!-- 绝对路径 -->
<a href="https://example.com/page.html">完整 URL</a>
<a href="/about/index.html">根目录开始</a>

<!-- 相对路径 -->
<a href="page.html">同目录</a>
<a href="sub/page.html">子目录</a>
<a href="../page.html">父目录</a>
```

## 4. 链接可访问性

```html
<!--  描述性链接文本 -->
<a href="report.pdf">查看2026年度报告</a>

<!-- 跳过导航链接 -->
<a href="#main-content" class="skip-link">跳到主要内容</a>
```
