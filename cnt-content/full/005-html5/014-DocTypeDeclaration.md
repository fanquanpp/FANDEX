---
order: 140
title: 文档类型声明
module: 'html5'
category: 前端技术
difficulty: beginner
description: DOCTYPE与HTML Living Standard
author: fanquanpp
updated: '2026-09-08'
related:
  - 'html5/012-HTML5FormValidation'
  - 'html5/013-HTML5MultimediaCanvasDrawing'
  - 'html5/015-HTML5OfflineStorageWebAPI'
  - 'html5/016-MetadataCharacterEncoding'
prerequisites:
  - 'html5/007-HTML5OverviewCoreFeature'
---

## 0. 直觉：DOCTYPE 是网页的“身份证”

你打开一份文件时，系统靠扩展名知道该用哪个软件。浏览器打开网页时，靠第一行的 `<!DOCTYPE html>` 知道“这是一份现代 HTML 文档，请按标准模式渲染”。

没有这行声明，浏览器会退回到十多年前的“怪异模式”，同样的 CSS 可能变得完全不同。所以 DOCTYPE 虽然只有一行，却是每张网页的标配。

## 1. DOCTYPE 声明

### 1.1 什么是 DOCTYPE

DOCTYPE（Document Type Declaration）是 HTML 文档的第一行，用于告知浏览器当前文档使用的 HTML 版本和渲染模式。它不是 HTML 标签，而是一条"处理指令"。

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <title>文档类型声明示例</title>
  </head>
  <body>
    <p>这是一个 HTML5 文档</p>
  </body>
</html>
```

**讲解：**

- `<!DOCTYPE html>` 必须位于文档第一行，连前面的空行或注释都不能有；
- 它不是 HTML 标签，而是一条“处理指令”，浏览器读取后进入标准渲染模式；
- 大小写不敏感，社区习惯统一大写。

### 1.2 DOCTYPE 的历史演变

| 版本             | DOCTYPE 声明                                                    | 说明          |
| ---------------- | --------------------------------------------------------------- | ------------- |
| HTML 2.0         | `<!DOCTYPE HTML PUBLIC "-//IETF//DTD HTML 2.0//EN">`            | 极其简洁      |
| HTML 4.01 Strict | `<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN" ...>`        | 包含 DTD 引用 |
| XHTML 1.0        | `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" ...>` | XML 语法      |
| HTML5            | `<!DOCTYPE html>`                                               | 极简声明      |

HTML5 的 DOCTYPE 设计哲学是**向后兼容**与**极简主义**——它不再引用 DTD，因为 HTML5 不再基于 SGML。

### 1.3 标准模式与怪异模式

| 模式             | 触发条件            | 特点                         |
| ---------------- | ------------------- | ---------------------------- |
| **标准模式**     | 存在有效的 DOCTYPE  | 按 W3C 标准渲染              |
| **怪异模式**     | 缺少 DOCTYPE 或无效 | 模拟旧浏览器行为             |
| **几乎标准模式** | 某些过渡型 DOCTYPE  | 除表格单元格高度外按标准渲染 |

**关键差异**：盒模型（怪异模式下 width 包含 padding 和 border）、行内元素尺寸、字体继承、图片间距。

```javascript
// 检测当前渲染模式
if (document.compatMode === 'CSS1Compat') {
  console.log('标准模式');
} else {
  console.log('怪异模式');
}
```

**讲解：**

- `document.compatMode` 返回当前渲染模式，`CSS1Compat` 表示标准模式；
- `QuirksMode` 表示怪异模式，此时盒模型等行为与标准不同；
- 调试 CSS 布局异常时，先检查这一项可以排除“DOCTYPE 缺失”的干扰。

## 2. HTML Living Standard

### 2.1 从 W3C 到 WHATWG

2019 年，W3C 与 WHATWG 达成协议，HTML 和 DOM 规范由 WHATWG 作为唯一发布者维护。HTML 正式成为"活标准"（Living Standard）。

**核心理念**：持续演进、向后兼容、浏览器驱动、社区参与。

### 2.2 规范结构

| 章节           | 内容                       |
| -------------- | -------------------------- |
| Infrastructure | 术语、编码、解析器         |
| Semantics      | 元素语义定义               |
| DOM            | 文档对象模型               |
| Communication  | Web Sockets、Web Messaging |
| Web Workers    | 后台线程                   |

### 2.3 新特性演进时间线

| 年份 | 新增特性                                                    |
| ---- | ----------------------------------------------------------- |
| 2020 | `loading="lazy"` 图片懒加载在各浏览器铺开                   |
| 2022 | `<dialog>` 实现全浏览器兼容（Baseline 2022）、Container Queries、`:has()` 选择器 |
| 2023 | `<search>` 元素进入标准、`popover` 属性首发（Chrome 114）、View Transitions API |
| 2024 | `popover` 达成 Baseline、CSS Anchor Positioning（Chrome 125） |
| 2025 | Invoker Commands 定名 `command`/`commandfor`（Chrome/Edge 135）、可定制 select 进入 Baseline |

## 3. DOCTYPE 最佳实践

- 永远在文档首行声明 DOCTYPE
- 推荐大写 `<!DOCTYPE html>`
- 使用 W3C Markup Validation Service 验证

## 4. 动手试试

1. 新建一个 `test.html`，第一行写 `<!DOCTYPE html>`，用浏览器打开后按 F12 查看控制台；
2. 在控制台输入 `document.compatMode`，确认返回 `CSS1Compat`（标准模式）；
3. 删除第一行 DOCTYPE，刷新页面再执行一次，对比 `compatMode` 的变化；
4. 进阶挑战：在怪异模式下给元素设置 `width: 100px; padding: 20px;`，观察实际占宽与标准模式的区别。

## 5. 核心知识点

> 一句话记住 DOCTYPE：文档首行写 DOCTYPE，标准模式有保证；`compatMode` 查状态，怪异模式要提防。

- `<!DOCTYPE html>` 是 HTML5 的极简声明，触发标准渲染模式；
- 缺少或写错 DOCTYPE 会进入怪异模式，导致盒模型、字体、图片间距等行为异常；
- HTML5 不再引用 DTD，声明只有一行，无需记忆复杂的 PUBLIC 字符串；
- `document.compatMode` 可检测当前渲染模式；
- HTML 是 WHATWG 维护的“活标准”，持续演进、向后兼容。

## 6. 注意事项与改进建议

| 问题点 | 说明 | 改进方案 |
| --- | --- | --- |
| DOCTYPE 前有内容 | 注释、BOM 或空行导致声明失效 | 确保 `<!DOCTYPE html>` 是文件的第一个字节序列 |
| 使用旧版长 DOCTYPE | 冗余且可能触发几乎标准模式 | 统一使用 HTML5 极简声明 |
| 用 `XHTML` 式自闭合 | 对 HTML5 无意义且易出错 | 按 HTML5 语法书写 |
| 忽略怪异模式 | 同一套 CSS 在不同模式渲染不同 | 排查布局问题时先确认 `compatMode` |

## 7. 扩展学习

- 元数据：`html5/016-MetadataCharacterEncoding` 学习 charset 与编码声明优先级；
- 渲染原理：`html5/038-CriticalRenderingPathAndResourceLoading` 理解解析与渲染流程；
- 废弃标签：`html5/040-HTML5ObsoleteTags` 考古 font/center/frameset 等老标签与现代替代方案；
- 盒模型差异：`css/004-CSS3BoxModelDetailed` 中怪异模式与标准模式的对比；
- 标准动态：持续关注 WHATWG HTML Living Standard 更新日志。
