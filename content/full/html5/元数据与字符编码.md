---
order: 51
title: 元数据与字符编码
module: html5
category: HTML5
difficulty: beginner
description: 'meta、title、link、UTF-8'
author: fanquanpp
updated: '2026-06-14'
related:
  - html5/文档类型声明
  - html5/离线存储与WebAPI
  - html5/文本语义
  - html5/列表
prerequisites:
  - html5/概述与核心特性
---

## 1. 元数据概述

元数据（Metadata）是"关于数据的数据"，在 HTML 中通过 `<head>` 内的元素描述文档的属性、行为和关系。

```html
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="页面描述" />
  <title>页面标题</title>
  <link rel="stylesheet" href="styles.css" />
</head>
```

### 1.1 元数据分类

| 类别     | 元素                | 作用                     |
| -------- | ------------------- | ------------------------ |
| 字符编码 | `<meta charset>`    | 声明文档编码             |
| 视口配置 | `<meta viewport>`   | 移动端适配               |
| SEO 相关 | `<meta name>`       | 描述、关键词、机器人指令 |
| 社交分享 | `<meta property>`   | Open Graph、Twitter Card |
| 安全策略 | `<meta http-equiv>` | CSP、CORS                |
| 资源关系 | `<link>`            | 样式表、图标、预加载     |

## 2. meta 元素详解

### 2.1 字符编码声明

```html
<meta charset="UTF-8" />
```

**关键规则**：编码声明必须在文档前 1024 字节内；必须在 `<title>` 之前声明，防止 XSS 攻击；推荐始终使用 UTF-8。

### 2.2 SEO 元数据

```html
<meta name="description" content="深入讲解 HTML5 元数据与字符编码" />
<meta name="robots" content="index, follow" />
<meta name="author" content="fanquanpp" />
```

### 2.3 Open Graph 与社交分享

```html
<meta property="og:title" content="页面标题" />
<meta property="og:description" content="页面描述" />
<meta property="og:image" content="https://example.com/image.jpg" />
<meta name="twitter:card" content="summary_large_image" />
```

### 2.4 安全相关元数据

```html
<meta http-equiv="Content-Security-Policy" content="default-src 'self'" />
<meta name="referrer" content="strict-origin-when-cross-origin" />
```

## 3. UTF-8 字符编码

### 3.1 UTF-8 编码原理

UTF-8 是一种变长编码，使用 1-4 个字节表示 Unicode 码点：

| 码点范围           | 字节数 | 编码格式                              |
| ------------------ | ------ | ------------------------------------- |
| U+0000 ~ U+007F    | 1      | `0xxxxxxx`                            |
| U+0080 ~ U+07FF    | 2      | `110xxxxx 10xxxxxx`                   |
| U+0800 ~ U+FFFF    | 3      | `1110xxxx 10xxxxxx 10xxxxxx`          |
| U+10000 ~ U+10FFFF | 4      | `11110xxx 10xxxxxx 10xxxxxx 10xxxxxx` |

中文字符"中"（U+4E2D）的 UTF-8 编码：

$$
\text{UTF-8} = \text{0xE4 0xB8 0xAD}
$$

### 3.2 编码声明优先级

BOM > HTTP Content-Type 头 > meta charset 声明

## 4. link 元素

```html
<link rel="stylesheet" href="styles.css" />
<link rel="icon" type="image/png" href="/favicon.png" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preload" href="font.woff2" as="font" crossorigin />
<link rel="canonical" href="https://example.com/page" />
```
