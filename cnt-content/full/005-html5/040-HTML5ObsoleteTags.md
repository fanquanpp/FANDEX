---
order: 400
title: 专项：已废弃标签考古
module: 'html5'
category: 前端技术
difficulty: beginner
description: 老网页和旧代码里必遇的废弃标签清单：font、center、frameset、marquee 等，附现代替代方案与遇到老项目时的处理思路。
author: fanquanpp
updated: '2026-09-08'
related:
  - 'html5/007-HTML5OverviewCoreFeature'
  - 'html5/014-DocTypeDeclaration'
  - 'html5/044-HTMLNewElementsAndCapabilities'
prerequisites:
  - 'html5/014-DocTypeDeclaration'
---

## 0. 学习目标（可验证）

- [ ] 能认出 10 个以上已废弃标签，并说出各自替代方案
- [ ] 能解释 frameset 为什么被彻底移除
- [ ] 遇到老项目里的废弃标签，知道"改还是不改"的判断方法

## 1. 一句话理解

> 废弃标签是"历史上的写法"：今天写新代码一律不用，但改老网页、读开源旧项目时一定会遇到。认识它们，是为了不慌。

## 2. 必知废弃标签清单

| 废弃标签 | 曾经的用途 | 现代替代方案 |
| --- | --- | --- |
| `<font>` | 设置文字颜色/字号 | CSS：`color`、`font-size` |
| `<center>` | 水平居中 | CSS：`text-align` 或 Flex/Grid |
| `<big>` | 放大字号 | CSS：`font-size` |
| `<strike>` | 删除线 | `<del>`（语义为"已删除"）或 CSS：`text-decoration` |
| `<tt>` | 等宽字体 | CSS：`font-family: monospace` 或 `<code>` |
| `<nobr>` | 禁止换行 | CSS：`white-space: nowrap` 或 `&nbsp;` |
| `<marquee>` | 滚动文字 | CSS 动画或合理的交互设计 |
| `<blink>` | 闪烁文字 | 不要做，闪烁对阅读和癫痫患者有害 |
| `<acronym>` | 缩写词 | `<abbr>` |
| `<applet>` | 嵌入 Java 小程序 | `<object>`、`<canvas>` 或普通脚本 |
| `<keygen>` | 表单里生成密钥对 | 已从标准与主流浏览器移除；密钥场景用 Web Crypto API |
| `<dir>` | 目录列表 | `<ul>` |
| `<isindex>` | 单行搜索框 | `<form>` + `<input type="search">`（搜索区域可用 `<search>` 包裹，见 044 专项） |
| `<frameset>` / `<frame>` / `<noframes>` | 多框架布局 | 普通文档结构 + iframe（如确需嵌入） |

### 容易误判：重新定义而非废弃

有几个标签网上常被说成"废弃"，其实 HTML5 给了它们**新的语义**，是合法元素，不要见到就急着替换：

| 标签 | 现行语义 | 使用场景 |
| --- | --- | --- |
| `<small>` | 附属细则（small print）：免责声明、版权注释 | `<small>© 2026 Example Inc.</small>` |
| `<u>` | 无明确语义的注释（unarticulated annotation）：中文专名号、标记拼写错误 | 非文本注释类下划线；纯装饰下划线交给 CSS |
| `<s>` | 不再准确/不再相关的内容（如改前的原价） | `<s>原价 99</s> 现价 59` |
| `<b>` | 关键词、产品名等"引起注意但无强调语义"的文字 | 摘要里的关键词加粗 |
| `<i>` | 术语、外文短语、想法声音等斜体语义 | `<i>凌波微步</i>`、外文词 |

判断口诀：**"废弃"是标准让你别再用；"重新定义"是标准让你换个理由用**。以 WHATWG 规范与 MDN 的 "Deprecated" 标记为准，不要凭网上旧文下结论。

## 3. frameset 为什么被彻底移除

frameset 把浏览器窗口切成多个独立框架，问题有三：

1. 每个框架是一份独立文档，SEO 和收藏夹都很难处理；
2. 地址栏 URL 不随框架内容变化，无法分享具体页面；
3. 可访问性差，读屏软件无法理解"窗口碎片"。

所以 HTML5 直接移除了 frameset/frame，现代嵌入需求用 `<iframe>`（见 023-EmbeddedContent）。

## 4. 浏览器还认这些标签吗

大多数废弃标签在旧浏览器兼容模式下仍能渲染（如 `font`、`center`、`marquee`），`frameset` 在新浏览器中已无法作为主文档工作。判断原则：

```text
新代码：一律不写废弃标签
老项目：能改则改；暂时不能改，先确认不影响功能与安全，再排期替换
```

## 5. 遇到老项目的排查思路

1. 先区分"废弃标签"和"标准标签的旧写法"（如 `<br />` 的斜杠写法仍然合法）；
2. 用 W3C 校验器扫描，聚焦 `obsolete` 类报错；
3. 逐个替换：`font` → class + CSS；`center` → CSS；`acronym` → `abbr`；
4. 替换后对比渲染效果，重点检查文字颜色、字号、对齐是否被 CSS 覆盖。

## 6. 动手试试

### 入门版

1. 在本地写一个 `<font color="red">`、`<center>`、`<marquee>` 混用的页面，刷新看看老浏览器的渲染效果；
2. 把页面改写为 CSS 方案，对比代码可维护性。

### 进阶版

1. 找一个开源老项目（或老师提供的旧代码），用校验器扫描废弃标签，列一张"替换清单"；
2. 把 frameset 老页面改造成普通 HTML + iframe 结构，说明改造前后的差异。

## 7. 常见问题与改进建议

| 常见问题 | 原因 | 改进建议 |
| --- | --- | --- |
| 复制来的老代码里有 font 标签，能跑就不管 | 能跑不等于没问题 | 新代码一律不用，老代码登记替换 |
| 用 marquee 做跑马灯 | 不知道已废弃 | 用 CSS 动画实现同等效果 |
| 分不清废弃标签和标准标签 | 网上资料新旧混杂 | 以 WHATWG 规范与 MDN "Deprecated" 标记为准 |

## 8. 下一步

考古结束，回到主线。下一篇专项 `041-HTML5DialogPopoverGuide` 讲的是"未来"：`dialog` 与 `popover` 这两个现代交互组件。
