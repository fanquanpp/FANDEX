---
order: 52
title: 文本语义
module: html5
category: HTML5
difficulty: beginner
description: 'h1-h6、p、strong、em、mark、time、address'
author: fanquanpp
updated: '2026-06-14'
related:
  - html5/离线存储与WebAPI
  - html5/元数据与字符编码
  - html5/列表
  - html5/链接与锚点
prerequisites:
  - html5/概述与核心特性
---

## 1. 标题元素 h1-h6

HTML 提供六级标题，`<h1>` 最高，`<h6>` 最低，用于构建文档大纲。

**核心规则**：每个页面建议只有一个 `<h1>`；不要跳级；标题用于语义结构，不用于控制字号。

```html
<h1>网站主标题</h1>
<h2>章节标题</h2>
<h3>小节标题</h3>
```

## 2. 段落与文本元素

### 2.1 强调元素

| 元素       | 语义       | 默认样式 | 使用场景       |
| ---------- | ---------- | -------- | -------------- |
| `<em>`     | 语气强调   | 斜体     | 语音阅读时加重 |
| `<strong>` | 重要性强调 | 粗体     | 标记重要内容   |
| `<mark>`   | 相关性标记 | 黄色高亮 | 搜索结果高亮   |
| `<b>`      | 吸引注意   | 粗体     | 关键词         |
| `<i>`      | 不同语态   | 斜体     | 术语、外文     |
| `<small>`  | 附属细则   | 小字     | 免责声明       |

```html
<p><em>不要</em>在走廊奔跑</p>
<p><strong>警告：</strong>高压危险</p>
<p>搜索"<mark>HTML5</mark>"的结果</p>
```

### 2.2 术语与引用

```html
<dfn>HTML</dfn>是超文本标记语言
<abbr title="HyperText Markup Language">HTML</abbr>
<blockquote cite="https://example.com"><p>引用文字</p></blockquote>
H<sub>2</sub>O E=mc<sup>2</sup>
<code>console.log()</code>
<kbd>Ctrl</kbd> + <kbd>C</kbd>
```

## 3. time 元素

```html
<time datetime="2026-06-14">2026年6月14日</time>
<time datetime="2026-06-14T10:30:00+08:00">上午10:30</time>
<time datetime="PT2H30M">2小时30分钟</time>
```

| 类型     | 格式                | 示例                |
| -------- | ------------------- | ------------------- |
| 日期     | YYYY-MM-DD          | 2026-06-14          |
| 日期时间 | YYYY-MM-DDTHH:MM:SS | 2026-06-14T10:30:00 |
| 持续时间 | PnYnMnDTnHnMnS      | PT2H30M             |

## 4. address 元素

```html
<address>
  <a href="mailto:contact@example.com">contact@example.com</a><br />
  北京市朝阳区某某路123号
</address>
```

**注意**：`<address>` 用于联系信息，不是物理地址的通用容器；默认斜体显示。

## 5. 其他语义文本元素

```html
<p>价格：<del datetime="2026-01-01">¥99</del> <ins>¥79</ins></p>
<p>用户 <bdi>إبراهيم</bdi> 发表了评论</p>
<p>第一行<br />第二行</p>
<p>超长单词<wbr />可以在<wbr />此处<wbr />断行</p>
```
