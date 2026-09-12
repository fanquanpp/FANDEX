---
order: 150
title: HTML5 表格与复杂结构
module: 'html5'
category: 前端技术
difficulty: beginner
description: 表格、定义列表、全局属性大表与 details/dialog/popover 等复杂结构，含语义化标签浅读。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'html5/090-HTML5CoreGlobalAttributes'
  - 'html5/100-HTML5BasicContentTags'
  - 'html5/170-SemanticTag'
prerequisites:
  - 'html5/100-HTML5BasicContentTags'
---
## 前置知识

建议先阅读以下内容再进入本文：

- [HTML5 基础内容标签](/html5/100-HTML5BasicContentTags)

## 0. 核心认知：表格是"数据表"，不是"布局工具"

表格是 HTML 里最容易被误用的标签：很多人用 `<div>` 拼"假表格"，结果既难读又难维护；反过来，也有人用 `<table>` 拼页面布局，同样是错的。正确的做法是用语义化的表格标签表达"数据表"，让浏览器和读屏软件都知道"这是数据"。页面布局交给 CSS 的 Flex/Grid，不是表格的职责。

## 1. 定义列表：术语 + 描述的"键值对"

定义列表使用 `<dl>` 标签定义，术语使用 `<dt>` 标签定义，描述使用 `<dd>` 标签定义。
**示例**：

```html
<h3>术语解释</h3>
<dl>
<dt>HTML</dt>
<dd>超文本标记语言，用于创建网页结构</dd>
<dt>CSS</dt>
<dd>层叠样式表，用于美化网页</dd>
<dt>JavaScript</dt>
<dd>脚本语言，用于实现网页交互</dd>
</dl>
```

**讲解：**

- `<dl>` 是定义列表容器，`<dt>` 表示术语，`<dd>` 表示术语的说明；
- 一个 `<dt>` 可以对应多个 `<dd>`，用于表达"一对多"的释义关系；
- 定义列表适合术语表、键值对数据，不要用它做纯视觉排版。

## 2. 表格标签（table）

### 2.1 表格的基本结构

```html
<table>
  <caption>2026 年一季度销量</caption>
  <thead>
    <tr>
      <th scope="col">产品</th>
      <th scope="col">一月</th>
      <th scope="col">二月</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">键盘</th>
      <td>120</td>
      <td>150</td>
    </tr>
    <tr>
      <th scope="row">鼠标</th>
      <td>80</td>
      <td>95</td>
    </tr>
  </tbody>
  <tfoot>
    <tr>
      <td>合计</td>
      <td>200</td>
      <td>245</td>
    </tr>
  </tfoot>
</table>
```

**讲解：**

1. `<table>` 是表格容器；`<caption>` 是表格标题，显示在表格上方，读屏软件会先读到它。
2. `<thead>`（表头）、`<tbody>`（表体）、`<tfoot>`（表尾）把表格分成三个语义区，浏览器和 CSS 可以分别定位。
3. `<tr>` 是"行"，`<th>` 是"表头单元格"（默认加粗居中），`<td>` 是"数据单元格"。
4. 每个 `<th>` 配 `scope="col"`（这一列的表头）或 `scope="row"`（这一行的表头）后，读屏软件能说出"这一列/这一行是什么"，是无障碍的关键细节。

### 2.2 合并单元格：colspan 与 rowspan

```html
<table>
  <thead>
    <tr>
      <th>课程</th>
      <th colspan="2">成绩</th>
    </tr>
    <tr>
      <th></th>
      <th>期中</th>
      <th>期末</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th rowspan="2">数学</th>
      <td>85</td>
      <td>90</td>
    </tr>
    <tr>
      <td>—</td>
      <td>88</td>
    </tr>
  </tbody>
</table>
```

**讲解：**

1. `colspan="2"` 让单元格向右横跨 2 列（"成绩"盖住期中、期末两列）。
2. `rowspan="2"` 让单元格向下竖跨 2 行（"数学"盖住两行数据）。
3. 合并后，被盖住的格子要少写，否则表格会多出一格、结构错位。
4. 判断合并方向的口诀：`colspan` 管"横着占几列"，`rowspan` 管"竖着占几行"。

### 2.3 表格使用原则

- 数据表格用 `<table>`，页面布局不要用表格（布局交给 CSS Flex/Grid）；
- 表头用 `<th>` 并加 `scope`，不要用 `<td>` 加粗冒充；
- 没有数据的格子写 `—` 或留空都可以，不要把 `&nbsp;` 当万能填充（实体字符见 001-HTML5CommentsAndEntities）；
- 表格列多时用 `<colgroup>` 统一给列加样式，避免逐格重复写；
- 超长表格配合 `overflow-x: auto` 容器做横向滚动（样式部分见 CSS 模块）。

### 2.4 相关标签的衔接

- 响应式图片 `<picture>` / `<source>`：见 `html5/140-ImagesAndResponsiveImages`；
- Web Components 的 `<template>` / `<slot>`：见 `html5/310-WebComponentsPWADevelopment`；
- 拖放 `<draggable>` 的完整 API：见 `html5/250-DragAPI`。

## 3. 全局属性

全局属性是几乎所有 HTML 元素都支持的属性，用于提供额外的信息或功能。其中 `id`/`class`/`style` 三个最常用的已在 006-HTML5CoreGlobalAttributes 速通，这里保留完整参考表。

### 3.1 基本全局属性

| 属性              | 描述                                            | 示例                                   |
| ----------------- | ----------------------------------------------- | -------------------------------------- |
| `id`              | 唯一标识符，用于通过 JavaScript 或 CSS 选择元素 | `id="header"`                          |
| `class`           | 样式类名，用于为元素应用 CSS 样式               | `class="container main"`               |
| `style`           | 行内样式，直接在元素上定义样式                  | `style="color: red; font-size: 16px;"` |
| `title`           | 悬停提示文字，当鼠标悬停在元素上时显示          | `title="这是一个提示"`                 |
| `hidden`          | 隐藏元素，使其不显示在页面上                    | `hidden`                               |
| `contenteditable` | 使元素内容可编辑                                | `contenteditable=""`                   |
| `spellcheck`      | 启用或禁用拼写检查                              | `spellcheck=""`                        |
| `tabindex`        | 指定元素在 Tab 键顺序中的位置                   | `tabindex="1"`                         |
| `accesskey`       | 指定访问元素的快捷键                            | `accesskey="k"`                        |

**示例**：

```html
 <!-- 使用 id 和 class -->
 <!-- div 是"无语义容器"，见 005-HTML5DivSpanContainers -->
 <div id="header" class="container">
  <h1>网站标题</h1>
 </div>
 <!-- 使用行内样式 -->
 <p style="color: blue; font-weight: bold;">这是蓝色粗体文本</p>
 <!-- 使用 title 属性 -->
 <a href="#" title="点击这里">链接</a>
 <!-- 使用 hidden 属性 -->
 <div hidden>这个元素是隐藏的</div>
 <!-- 使用 contenteditable 属性 -->
 <div contenteditable="">点击此处编辑内容</div>
```

**讲解：**

- `id` 在页面内必须唯一，`class` 可复用，二者分别是"身份"与"分类"；
- `hidden` 是布尔属性，存在即生效，等价于 CSS `display: none` 的语义层实现；
- `contenteditable` 让普通元素变为可编辑区域，多用于富文本与笔记类应用。

### 3.2 自定义数据属性

`data-*` 属性用于存储自定义数据，这些数据可以通过 JavaScript 访问。
**语法**：`data-属性名="值"`
**示例**：

```html
 <!-- 存储产品信息 -->
 <div class="product" data-id="123" data-name="iPhone 13" data-price="799">
  <h3>iPhone 13</h3>
  <p>价格: $799</p>
 </div>
 <!-- 通过 JavaScript 访问 -->
 <script>
  const product = document.querySelector('.product');
  const productId = product.dataset.id;
  const productName = product.dataset.name;
  const productPrice = product.dataset.price;
  console.log(`产品 ID: ${productId}, 名称: ${productName}, 价格: $${productPrice}`);
 </script>
```

**讲解：**

- `data-*` 以 `data-` 前缀承载自定义数据，不污染标准属性命名空间；
- JavaScript 通过 `element.dataset` 读取，`data-price` 对应 `dataset.price`；
- 适合存放与元素绑定的业务数据，复杂状态仍应交给框架或状态管理；
- 完整实践见 `340-CustomDataAttribute`。

### 3.3 其他全局属性

| 属性        | 描述                         | 示例                                             |
| ----------- | ---------------------------- | ------------------------------------------------ |
| `lang`      | 指定元素内容的语言           | `lang="zh-CN"`                                   |
| `dir`       | 指定文本方向                 | `dir="ltr"` (从左到右) 或 `dir="rtl"` (从右到左) |
| `translate` | 指定是否翻译元素内容         | `translate="no"`                                 |
| `draggable` | 指定元素是否可拖动           | `draggable=""`                                   |
| `dropzone`  | 指定元素作为放置目标时的行为 | `dropzone="copy"`                                |

**示例**：

```html
 <!-- 指定语言 -->
 <div lang="en">This is English text</div>
 <div lang="zh-CN">这是中文文本</div>
 <!-- 指定文本方向 -->
 <div dir="rtl">مرحبا بالعالم</div> <!-- 阿拉伯语，从右到左 -->
 <!-- 指定不可翻译 -->
 <div translate="no">品牌名称: Apple</div>
 <!-- 指定可拖动 -->
 <div draggable="">可拖动元素</div>
```

**讲解：**

- `lang` 与 `dir` 影响拼写检查、翻译工具和文本方向，多语言页面必须正确设置；
- `translate="no"` 告诉翻译工具不要翻译品牌名等专有内容；
- `draggable` 开启 HTML5 拖拽，配合拖拽事件实现排序、上传等交互。

## 4. 语义化标签浅读

> 本节第一遍"了解即可"：先用好 005-HTML5DivSpanContainers 的 div/span，做出页面后再回来看本节与 010-SemanticTag 的完整讲解。

HTML5 引入了一系列语义化标签，用于更清晰地描述网页结构。
| 标签 | 描述 |
|------|------|
| `<header>` | 页面或section的头部 |
| `<nav>` | 导航链接区域 |
| `<main>` | 页面的主要内容 |
| `<section>` | 文档中的节 |
| `<article>` | 独立的内容块 |
| `<aside>` | 侧边栏或附加内容 |
| `<footer>` | 页面或section的底部 |
| `<figure>` | 图表、图像等 |
| `<figcaption>` | 图表的标题 |

注意：`<div>` 是"无语义容器"，仅用于样式分组或脚本挂载；能用上面任一语义标签表达时，就不要用 `div`（具体取舍见 003）。

**示例**：

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>语义化标签示例</title>
  </head>
  <body>
    <header>
      <h1>网站标题</h1>
      <nav>
        <ul>
          <li><a href="#">首页</a></li>
          <li><a href="#">关于</a></li>
          <li><a href="#">服务</a></li>
          <li><a href="#">联系</a></li>
        </ul>
      </nav>
    </header>
    <main>
      <section>
        <h2>新闻</h2>
        <article>
          <h3>最新新闻标题</h3>
          <p>新闻内容...</p>
        </article>
        <article>
          <h3>另一则新闻</h3>
          <p>新闻内容...</p>
        </article>
      </section>
      <aside>
        <h3>侧边栏</h3>
        <p>侧边栏内容...</p>
      </aside>
    </main>
    <footer>
      <p>2026 网站名称. 保留所有权利.</p>
    </footer>
  </body>
</html>
```

**讲解：**

- 页面骨架由 `header`、`nav`、`main`、`aside`、`footer` 组成，层级一目了然；
- `main` 只出现一次，内部按主题拆分为 `section`，独立内容用 `article`；
- 该结构对搜索引擎与屏幕阅读器都友好，是"语义化优先"的标准写法；
- 完整深入（`article` 与 `section` 的边界、SEO 影响等）见 `170-SemanticTag`。

## 5. 综合示例：产品展示页面（纯 HTML 骨架）

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>产品展示</title>
    <!-- 注意：本示例只有 HTML 骨架，没有 CSS 样式 -->
  </head>
  <body>
    <header>
      <h1>产品展示</h1>
      <nav>
        <ul>
          <li><a href="#">首页</a></li>
          <li><a href="#">产品</a></li>
          <li><a href="#">关于我们</a></li>
          <li><a href="#">联系我们</a></li>
        </ul>
      </nav>
    </header>
    <main>
      <h2>热门产品</h2>
      <section>
        <article class="product" data-id="1" data-name="智能手机" data-price="2999">
          <h3>智能手机</h3>
          <p>6.5 英寸屏幕，128GB 存储，4800 万像素摄像头</p>
          <p>价格：2999 元</p>
        </article>
        <article class="product" data-id="2" data-name="笔记本电脑" data-price="5999">
          <h3>笔记本电脑</h3>
          <p>14 英寸屏幕，8GB 内存，512GB 固态硬盘</p>
          <p>价格：5999 元</p>
        </article>
        <article class="product" data-id="3" data-name="平板电脑" data-price="1999">
          <h3>平板电脑</h3>
          <p>10.5 英寸屏幕，64GB 存储，支持手写笔</p>
          <p>价格：1999 元</p>
        </article>
      </section>
    </main>
    <footer>
      <p>&copy; 2026 产品展示. 保留所有权利.</p>
    </footer>
  </body>
</html>
```

**讲解：**

- 每个产品用 `article` 表达"独立可复用"的内容，后续加样式或交互都不影响结构；
- `data-id`、`data-name`、`data-price` 是自定义数据属性（见 3.2 节），JavaScript 课程会用它实现"点击查看详情"；
- 页面没有写任何 CSS，先保证结构正确，网格布局等美化留给 CSS 课程。

## 6. 最佳实践

### 6.1 语义化标签的使用

- **使用语义化标签**：优先使用语义化标签（如 `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<footer>`）来构建网页结构，而不是使用通用的 `<div>` 标签；
- **正确嵌套**：确保标签的嵌套顺序正确，例如 `<li>` 必须在 `<ul>` 或 `<ol>` 内部；
- **避免过度使用**：不要为了使用语义化标签而过度使用，应该根据内容的实际含义选择合适的标签。

### 6.2 全局属性的使用

- **id 的唯一性**：确保每个元素的 `id` 属性值在页面中是唯一的；
- **class 的复用**：使用 `class` 属性来为多个元素应用相同的样式，提高代码的可维护性；
- **避免行内样式**：尽量避免使用 `style` 属性直接在元素上定义样式，应该使用 CSS 文件或 `<style>` 标签；
- **合理使用 data-\* 属性**：使用 `data-*` 属性来存储与元素相关的自定义数据，而不是使用 `id` 或 `class` 来存储数据。

## 7. 进阶知识点

> 本节是速览；`dialog` 与 `popover` 的完整指南（`showModal`/`returnValue`/`::backdrop`/使用时机对比/可访问性）见专项 `430-HTML5DialogPopoverGuide`。

### 7.1 可折叠内容：details 与 summary

```html
<!-- 默认折叠 -->
<details>
  <summary>常见问题：如何重置密码？</summary>
  <p>请访问登录页面，点击"忘记密码"链接。</p>
</details>

<!-- 默认展开 -->
<details open>
  <summary>使用说明</summary>
  <p>这是默认展开的说明内容。</p>
</details>
```

**讲解：**

- `<details>` 提供原生折叠容器，`<summary>` 是始终可见的标题行；
- 添加 `open` 属性可让内容默认展开，移除后默认折叠；
- 无需 JavaScript 即可实现 FAQ、详情展开等交互，且天然支持键盘操作。

### 7.2 原生对话框：dialog

```html
<dialog id="myDialog">
  <form method="dialog">
    <p>请确认操作</p>
    <button>取消</button>
    <button value="confirm">确认</button>
  </form>
</dialog>

<script>
  const dialog = document.getElementById('myDialog');
  dialog.showModal(); // 以模态方式显示，自动聚焦并屏蔽背景交互
  dialog.close();     // 关闭对话框
</script>
```

**讲解：**

- `showModal()` 打开模态框，`show()` 打开非模态框，二者行为不同；
- `method="dialog"` 让表单提交直接关闭对话框，并通过 `returnValue` 带回按钮值；
- 模态框自带焦点管理，可搭配 `::backdrop` 伪元素定制遮罩样式。

### 7.3 轻量弹出层：popover

```html
<button popovertarget="my-popover">打开弹出层</button>

<div id="my-popover" popover>
  <p>这是一个弹出层内容</p>
  <button popovertarget="my-popover" popovertargetaction="hide">关闭</button>
</div>
```

**讲解：**

- `popover` 属性把元素声明为弹出层，默认隐藏，由触发按钮控制显隐；
- `popovertarget` 声明触发按钮，`popovertargetaction` 可选 `toggle`/`show`/`hide`；
- 弹出层自动置于顶层（top layer），无需手动管理 `z-index`。

## 8. 动手试试

### 入门版

1. 用 `<table>` 做一个"本周课程表"：`<caption>` 写标题，`<thead>` 放星期，`<tbody>` 放课程；
2. 用 `<dl>` 列出 3 个今天学会的标签及其含义；
3. 用 `<details>` + `<summary>` 做一个"展开看更多"区域。

### 进阶版

1. 给课程表加一个跨两列的"午休"单元格（`colspan`），再试一个跨两行的"自习"（`rowspan`）；
2. 用 `data-*` 给课程表每一行绑定课程编号，再用 `document.querySelectorAll('[data-id]')` 在 Console 里把它们全部打印出来；
3. 把 5 节的产品展示页抄下来运行，给每个产品加 `id` 和 `class`，为后续 CSS 课程做准备。

## 9. 核心知识点

- 数据表用 `table` + `caption`/`thead`/`tbody`/`tfoot` + `th`/`td`，表头加 `scope`；
- `colspan` 横着占列，`rowspan` 竖着占行，合并后要少写被盖住的格子；
- `dl`/`dt`/`dd` 表达"术语 + 描述"的键值对；
- 全局属性：`id` 唯一、`class` 复用、`style` 仅临时、`data-*` 存数据；
- `details`/`dialog`/`popover` 是三个免 JavaScript 的交互组件；
- 语义化标签（`header`/`nav`/`main`/`article`/`section`/`aside`/`footer`）浅读，完整版在 008。

> 一句话记住这节课：表格装数据不装布局；`th` 加 `scope`，合并记 `colspan`/`rowspan`；`id` 要唯一，`class` 可复用，`data-*` 存数据。

## 10. 注意事项与改进建议

| 问题点 | 说明 | 改进方案 |
| --- | --- | --- |
| 用表格拼页面布局 | 布局应由 CSS Flex/Grid 负责 | 数据才用 `table`，布局用 div + CSS |
| 合并单元格后结构错位 | 被盖住的格子没少写 | 合并几格就少写几格 |
| 表头用 `td` 加粗冒充 | 读屏软件无法识别列含义 | 用 `th` 并加 `scope` |
| 行内样式泛滥 | 样式与结构耦合，难以维护 | 抽取到 CSS 类，按类名复用 |
| 滥用 `details`/`dialog` | 语义不匹配或兼容性考虑不足 | 先确认语义，再检查浏览器支持度后降级 |
| 用 `data-*` 存复杂状态 | 数据量一大难以维护 | 交给框架或状态管理 |

## 11. 扩展学习

- 语义方向：阅读 `170-SemanticTag` 掌握 `article` 与 `section` 的边界；
- 数据方向：结合 `340-CustomDataAttribute` 实践 `data-*` 与 `dataset`；
- 无障碍方向：参考 `180-Accessibility` 补齐 ARIA 与键盘导航；
- 表单方向：`190-HTML5FormValidation` 学习输入类型与验证 API；
- 媒体方向：在 `200-AudioVideo` 中学习 `audio`/`video` 的完整 API；
- 容器方向：回顾 `080-HTML5DivSpanContainers`，理解 div/span 与语义标签的取舍。
