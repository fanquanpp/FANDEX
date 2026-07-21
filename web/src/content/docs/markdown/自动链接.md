---
order: 55
title: 自动链接
module: markdown
category: 'Markdown Basics'
difficulty: beginner
description: Markdown自动链接机制：URL识别规则、邮箱链接与扩展语法。
author: fanquanpp
updated: '2026-06-14'
related:
  - markdown/脚注
  - markdown/删除线
  - markdown/Emoji表情
  - markdown/下标与上标
prerequisites:
  - markdown/语法指南
---

## 1. 自动链接概述

### 1.1 什么是自动链接

自动链接是指 Markdown 解析器**自动识别**文本中的 URL 或邮箱地址，并将其转换为可点击的超链接，无需手动使用链接语法。

### 1.2 两种自动链接

| 类型                | 语法                    | 来源            |
| :------------------ | :---------------------- | :-------------- |
| **尖括号自动链接**  | `<https://example.com>` | CommonMark 标准 |
| **裸 URL 自动链接** | `https://example.com`   | GFM 扩展        |

## 2. 尖括号自动链接

### 2.1 URL 自动链接

```markdown
<https://github.com>
<http://example.com/path?q=1&r=2>
```

渲染为可点击链接，链接文本就是 URL 本身。

### 2.2 邮箱自动链接

```markdown
<user@example.com>
<contact@company.org>
```

邮箱自动链接会进行 HTML 实体编码，防止垃圾邮件爬虫：

```html
<!-- 渲染后的 HTML -->
<a
  href="mailto:&#117;&#115;&#101;&#114;&#64;&#101;&#120;&#97;&#109;&#112;&#108;&#101;&#46;&#99;&#111;&#109;"
  >user@example.com</a
>
```

### 2.3 规则

- 尖括号内必须是合法的 URL 或邮箱格式
- URL 必须包含协议（`http://` 或 `https://`）
- 尖括号内不能有空格
- 尖括号内的 `&` 和 `<` 需要转义

```markdown
<!-- 有效 -->

<https://example.com>
<user@example.com>

<!-- 无效 -->

<example.com> <!-- 缺少协议 -->
< https://example.com > <!-- 有空格 -->
```

## 3. GFM 裸 URL 自动链接

### 3.1 URL 识别规则

GFM 可以自动识别不带尖括号的 URL：

```markdown
访问 https://github.com 了解更多
浏览 www.example.com 查看
```

### 3.2 识别条件

| 条件           | 说明                                |
| :------------- | :---------------------------------- |
| **协议前缀**   | 必须以 `http://` 或 `https://` 开头 |
| **www 前缀**   | `www.` 开头的域名也会被识别         |
| **有效域名**   | 必须包含点号和顶级域                |
| **路径和查询** | URL 可以包含路径、查询参数和片段    |

### 3.3 URL 边界

GFM 使用以下规则确定 URL 的结束位置：

- 空格或换行
- 未配对的标点符号（如 `)`、`]`）
- 中文等 CJK 字符
- 控制字符

```markdown
<!-- 正确识别 -->

访问 https://github.com/user/repo 了解更多。

<!-- 括号内的 URL -->

请参考文档（https://docs.example.com）获取详情。

<!-- URL 末尾的标点 -->

这是链接 https://example.com。
```

### 3.4 邮箱自动链接

GFM 也支持裸邮箱地址的自动链接：

```markdown
联系 user@example.com 获取更多信息
```

## 4. 自动链接的定制

### 4.1 修改链接文本

自动链接的显示文本始终是 URL 本身。如需自定义文本，使用标准链接语法：

```markdown
<!-- 自动链接：显示 URL -->

<https://github.com>

<!-- 标准链接：自定义文本 -->

[GitHub](https://github.com)
```

### 4.2 在新窗口打开

自动链接默认在当前窗口打开。如需在新窗口打开，需要使用 HTML：

```markdown
<a href="https://example.com" target="_blank">在新窗口打开</a>
```

### 4.3 nofollow 属性

为自动链接添加 `rel="nofollow"` 防止搜索引擎追踪：

```markdown
<a href="https://example.com" rel="nofollow">不追踪的链接</a>
```

## 5. 安全考虑

### 5.1 XSS 防护

Markdown 解析器会对自动链接中的特殊字符进行编码：

```markdown
<https://example.com/search?q=<script>alert(1)</script>>

<!-- 渲染后 -->

<a href="https://example.com/search?q=&lt;script&gt;alert(1)&lt;/script&gt;">...</a>
```

### 5.2 邮箱保护

尖括号邮箱自动链接使用 HTML 实体编码保护邮箱地址：

```markdown
<!-- 源码 -->

<user@example.com>

<!-- 渲染后（实体编码） -->
<a href="mailto:&#117;&#115;&#101;&#114;&#64;&#101;&#120;&#97;&#109;&#112;&#108;&#101;&#46;&#99;&#111;&#109;">
  &#117;&#115;&#101;&#114;&#64;&#101;&#120;&#97;&#109;&#112;&#108;&#101;&#46;&#99;&#111;&#109;
</a>
```

### 5.3 JavaScript 协议

Markdown 解析器通常**不识别** `javascript:` 协议的自动链接：

```markdown
<javascript:alert(1)> <!-- 不会被渲染为链接 -->
```

## 6. 跨平台差异

| 特性       | CommonMark | GFM | Obsidian   |
| :--------- | :--------- | :-- | :--------- |
| 尖括号 URL |            |     |            |
| 尖括号邮箱 |            |     |            |
| 裸 URL     |            |     |            |
| 裸邮箱     |            |     |            |
| www 前缀   |            |     |            |
| Wiki 链接  |            |     | `[[页面]]` |
