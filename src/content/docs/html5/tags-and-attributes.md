---
order: 20
tags:
  - 'html5'
  - 'database'
  - 'css-layout'
  - 'devops'
difficulty: 'intermediate'
title: 'HTML5 基础标签与全局属性'
module: 'html5'
category: 'HTML5 Basics'
description: '文本、列表、表格标签与全局属性详解。'
author: 'Anonymous'
---

## 目录

1. [基础文本标签](#基础文本标签)
2. [列表标签](#列表标签)
3. [超链接与多媒体](#超链接与多媒体)
4. [全局属性](#全局属性)
5. [语义化标签](#语义化标签)
6. [实际应用示例](#实际应用示例)
7. [最佳实践](#最佳实践)

---

## 1. 基础文本标签

基础文本标签用于定义和格式化网页中的文本内容，是构建网页结构的基础。

### 1.1 标题标签

标题标签用于定义网页中的标题，从 `<h1>` 到 `<h6>`，级别依次递减。
| 标签 | 描述 | 语义 |
|------|------|------|
| `<h1>` | 一级标题 | 最重要的标题，通常用于页面主标题 |
| `<h2>` | 二级标题 | 次要标题，通常用于章节标题 |
| `<h3>` | 三级标题 | 子章节标题 |
| `<h4>` | 四级标题 | 更小的子章节标题 |
| `<h5>` | 五级标题 | 更次要的标题 |
| `<h6>` | 六级标题 | 最次要的标题 |
**示例**：

```html
<h1>网站主标题</h1>
<h2>章节标题</h2>
<h3>子章节标题</h3>
<h4>子子章节标题</h4>
```

**最佳实践**：

- 每个页面应该只有一个 `<h1>` 标签，用于页面的主标题
- 标题应该按照层级顺序使用，不要跳过层级
- 标题内容应该简洁明了，能够准确反映章节内容

### 1.2 段落标签

`<p>` 标签用于定义段落，是最常用的文本容器之一。
**示例**：

```html
<p>这是一个段落。段落是网页中最基本的文本单位，用于组织和展示文本内容。</p>
<p>这是另一个段落。每个段落都会自动在前后添加空白，使文本更易于阅读。</p>
```

### 1.3 行内文本容器

`<span>` 标签是一个行内元素，用于对文本的一部分进行样式设置或标记。
**示例**：

```html
<p>这是一段文本，其中 <span style="color: red;">红色部分</span> 是使用 span 标签标记的。</p>
```

### 1.4 强调标签

用于对文本进行强调，具有语义含义。
| 标签 | 描述 | 语义 |
|------|------|------|
| `<strong>` | 加粗 | 表示重要内容 |
| `<em>` | 倾斜 | 表示强调内容 |
| `<mark>` | 标记 | 表示突出显示的内容 |
| `<small>` | 小号字体 | 表示辅助性内容 |
| `<del>` | 删除线 | 表示已删除的内容 |
| `<ins>` | 下划线 | 表示已插入的内容 |
| `<sub>` | 下标 | 表示下标文本 |
| `<sup>` | 上标 | 表示上标文本 |
**示例**：

```html
<p>这是 <strong>重要内容</strong>，这是 <em>强调内容</em>。</p>
<p>这是 <mark>突出显示</mark> 的内容。</p>
<p>这是 <small>辅助性内容</small>。</p>
<p>这是 <del>已删除</del> 的内容，这是 <ins>已插入</ins> 的内容。</p>
<p>水的化学式是 H<sub>2</sub>O，2 的平方是 2<sup>2</sup>。</p>
```

### 1.5 换行和分割线

| 标签   | 描述                                   |
| ------ | -------------------------------------- |
| `<br>` | 换行标签，用于在文本中插入换行         |
| `<hr>` | 分割线标签，用于在页面中插入水平分割线 |

**示例**：

```html
<p>这是第一行<br />这是第二行</p>
<hr />
<p>这是分割线下面的内容</p>
```

## 2. 列表标签

列表标签用于组织和展示一系列相关的项目。

### 2.1 无序列表

无序列表使用 `<ul>` 标签定义，列表项使用 `<li>` 标签定义，默认使用圆点作为列表项标记。
**示例**：

```html
<h3>购物清单</h3>
<ul>
  <li>苹果</li>
  <li>香蕉</li>
  <li>橙子</li>
  <li>牛奶</li>
</ul>
```

### 2.2 有序列表

有序列表使用 `<ol>` 标签定义，列表项使用 `<li>` 标签定义，默认使用数字作为列表项标记。
**属性**：

- `start`: 指定列表的起始编号
- `reversed`: 倒序列表
- `type`: 指定编号类型（1, A, a, I, i）
  **示例**：

```html
 <h3>步骤说明</h3>
 <ol>
  <li>准备材料</li>
  <li>混合 ingredients</li>
  <li>加热</li>
  <li>冷却</li>
 </ol>
 <h3>倒序列表</h3>
 ol reversed>
  <li>第四步</li>
  <li>第三步</li>
  <li>第二步</li>
  <li>第一步</li>
 </ol>
 <h3>字母编号列表</h3>
 <ol type="A">
  <li>选项 A</li>
  <li>选项 B</li>
  <li>选项 C</li>
 </ol>
```

### 2.3 定义列表

定义列表使用 `<dl>` 标签定义，术语使用 `<dt>` 标签定义，描述使用 `<dd>` 标签定义。
**示例**：

```html
<h3>术语解释</h3>
dl>
<dt>HTML</dt>
<dd>超文本标记语言，用于创建网页结构</dd>
<dt>CSS</dt>
<dd>层叠样式表，用于美化网页</dd>
<dt>JavaScript</dt>
<dd>脚本语言，用于实现网页交互</dd>
dl>
```

### 2.4 嵌套列表

列表可以嵌套使用，创建层次结构。
**示例**：

```html
 <h3>课程大纲</h3>
 ul>
  <li>HTML 基础
  ul>
  <li>标签语法</li>
  <li>语义化标签</li>
  <li>表单元素</li>
  </ul>
  </li>
  <li>CSS 基础
  ul>
  <li>选择器</li>
  <li>盒模型</li>
  <li>布局技巧</li>
  </ul>
  </li>
  <li>JavaScript 基础
  ul>
  <li>变量和数据类型</li>
  <li>控制流</li>
  <li>函数</li>
  </ul>
  </li>
 ul>
```

## 3. 超链接与多媒体

### 3.1 超链接

超链接使用 `<a>` 标签定义，用于链接到其他网页、文件或位置。
**属性**：

- `href`: 指定链接目标
- `target`: 指定打开链接的方式
- `_self`: 在当前窗口打开（默认）
- `_blank`: 在新窗口打开
- `_parent`: 在父框架打开
- `_top`: 在整个窗口打开
- `title`: 指定悬停提示文字
- `rel`: 指定链接与当前页面的关系
  **示例**：

```html
 <!-- 链接到外部网站 -->
 a href="https://www.example.com" target="_blank">访问示例网站</a>
 <!-- 链接到同一网站的其他页面 -->
 a href="about.html">关于我们</a>
 <!-- 链接到页面内的锚点 -->
 a href="#section1">跳转到第一部分</a>
 <!-- 链接到电子邮件 -->
 a href="mailto:info@example.com">发送邮件</a>
 <!-- 链接到电话 -->
 a href="tel:+1234567890">拨打电话</a>
```

### 3.2 图像

图像使用 `<img>` 标签定义，用于在网页中插入图片。
**属性**：

- `src`: 指定图像源文件路径
- `alt`: 指定图像的替代文本（对 SEO 和无障碍至关重要）
- `width`: 指定图像宽度
- `height`: 指定图像高度
- `title`: 指定悬停提示文字
- `loading`: 指定图像加载方式（`lazy` 用于延迟加载）
  **示例**：

```html
<!-- 基本图像 -->
img src="images/photo.jpg" alt="美丽的风景" width="400" height="300">
<!-- 带有标题的图像 -->
img src="images/logo.png" alt="网站标志" title="网站标志">
<!-- 延迟加载的图像 -->
img src="images/large-image.jpg" alt="大型图像" loading="lazy">
```

### 3.3 其他多媒体标签

| 标签       | 描述             |
| ---------- | ---------------- |
| `<audio>`  | 用于播放音频文件 |
| `<video>`  | 用于播放视频文件 |
| `<iframe>` | 用于嵌入其他网页 |

**示例**：

```html
<!-- 音频播放器 -->
audio controls>
<source src="audio/song.mp3" type="audio/mpeg" />
您的浏览器不支持音频元素。 audio>
<!-- 视频播放器 -->
video controls width="600">
<source src="video/movie.mp4" type="video/mp4" />
您的浏览器不支持视频元素。 video>
<!-- 嵌入网页 -->
iframe
src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3022.1422937950146!2d-74.0061380845947!3d40.71277577933185!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x89c25a22a3bda30d%3A0xb89d1fe6bc499443!2sNew%20York%2C%20NY%2C%20USA!5e0!3m2!1sen!2sus!4v1620000000000!5m2!1sen!2sus"
width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy"> iframe>
```

## 4. 全局属性

全局属性是几乎所有 HTML 元素都支持的属性，用于提供额外的信息或功能。

### 4.1 基本全局属性

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
 div id="header" class="container">
  <h1>网站标题</h1>
 </div>
 <!-- 使用行内样式 -->
 p style="color: blue; font-weight: bold;">这是蓝色粗体文本</p>
 <!-- 使用 title 属性 -->
 a href="#" title="点击这里">链接</a>
 <!-- 使用 hidden 属性 -->
 div hidden>这个元素是隐藏的</div>
 <!-- 使用 contenteditable 属性 -->
 div contenteditable="">点击此处编辑内容</div>
```

### 4.2 自定义数据属性

`data-*` 属性用于存储自定义数据，这些数据可以通过 JavaScript 访问。
**语法**：`data-属性名="值"`
**示例**：

```html
 <!-- 存储产品信息 -->
 div class="product" data-id="123" data-name="iPhone 13" data-price="799">
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

### 4.3 其他全局属性

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
 div lang="en">This is English text</div>
 div lang="zh-CN">这是中文文本</div>
 <!-- 指定文本方向 -->
 div dir="rtl">مرحبا بالعالم</div> <!-- 阿拉伯语，从右到左 -->
 <!-- 指定不可翻译 -->
 div translate="no">品牌名称: Apple</div>
 <!-- 指定可拖动 -->
 div draggable="">可拖动元素</div>
```

## 5. 语义化标签

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

## 6. 实际应用示例

### 6.1 示例 1：基本网页结构

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>基本网页结构</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        line-height: 1.6;
        margin: 0;
        padding: 0;
      }
      header {
        background-color: #333;
        color: white;
        padding: 1rem;
      }
      nav ul {
        list-style: none;
        padding: 0;
      }
      nav ul li {
        display: inline;
        margin-right: 1rem;
      }
      nav ul li a {
        color: white;
        text-decoration: none;
      }
      main {
        padding: 2rem;
      }
      footer {
        background-color: #333;
        color: white;
        text-align: center;
        padding: 1rem;
        position: fixed;
        bottom: 0;
        width: 100%;
      }
    </style>
  </head>
  <body>
    <header>
      <h1>我的网站</h1>
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
        <h2>欢迎访问我的网站</h2>
        <p>这是一个使用 HTML5 基础标签构建的网页。</p>
        <p>HTML5 提供了丰富的标签和属性，用于创建结构清晰、语义化的网页。</p>
      </section>
      <section>
        <h2>服务列表</h2>
        <ul>
          <li>网站设计</li>
          <li>前端开发</li>
          <li>后端开发</li>
          <li>移动应用开发</li>
        </ul>
      </section>
      <section>
        <h2>联系我们</h2>
        <p>邮箱: <a href="mailto:info@example.com">info@example.com</a></p>
        <p>电话: <a href="tel:+1234567890">123-456-7890</a></p>
      </section>
    </main>
    <footer>
      <p>2026 我的网站. 保留所有权利.</p>
    </footer>
  </body>
</html>
```

### 6.2 示例 2：产品展示页面

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>产品展示</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        line-height: 1.6;
        margin: 0;
        padding: 0;
      }
      .container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 2rem;
      }
      h1 {
        text-align: center;
      }
      .product-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 2rem;
        margin-top: 2rem;
      }
      .product {
        border: 1px solid #ddd;
        border-radius: 5px;
        padding: 1rem;
        text-align: center;
      }
      .product img {
        max-width: 100%;
        height: auto;
        border-radius: 5px;
      }
      .product h3 {
        margin-top: 1rem;
      }
      .product p {
        color: #666;
      }
      .price {
        font-weight: bold;
        color: #e63946;
        font-size: 1.2rem;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>产品展示</h1>
      <div class="product-grid">
        <div class="product" data-id="1" data-name="智能手机" data-price="2999">
          <img src="https://via.placeholder.com/300" alt="智能手机" />
          <h3>智能手机</h3>
          <p>6.5英寸屏幕，128GB存储，4800万像素摄像头</p>
          <p class="price">¥2999</p>
          <a href="#" class="btn">查看详情</a>
        </div>
        <div class="product" data-id="2" data-name="笔记本电脑" data-price="5999">
          <img src="https://via.placeholder.com/300" alt="笔记本电脑" />
          <h3>笔记本电脑</h3>
          <p>14英寸屏幕，8GB内存，512GB固态硬盘</p>
          <p class="price">¥5999</p>
          <a href="#" class="btn">查看详情</a>
        </div>
        <div class="product" data-id="3" data-name="平板电脑" data-price="1999">
          <img src="https://via.placeholder.com/300" alt="平板电脑" />
          <h3>平板电脑</h3>
          <p>10.5英寸屏幕，64GB存储，支持手写笔</p>
          <p class="price">¥1999</p>
          <a href="#" class="btn">查看详情</a>
        </div>
      </div>
    </div>
    <script>
      // 为产品添加点击事件
      document.querySelectorAll('.product').forEach((product) => {
        product.addEventListener('click', function () {
          const id = this.dataset.id;
          const name = this.dataset.name;
          const price = this.dataset.price;
          alert(`产品 ID: ${id}\n名称: ${name}\n价格: ¥${price}`);
        });
      });
    </script>
  </body>
</html>
```

## 7. 最佳实践

### 7.1 语义化标签的使用

- **使用语义化标签**：优先使用语义化标签（如 `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<footer>`）来构建网页结构，而不是使用通用的 `<div>` 标签。
- **正确嵌套**：确保标签的嵌套顺序正确，例如 `<li>` 必须在 `<ul>` 或 `<ol>` 内部。
- **避免过度使用**：不要为了使用语义化标签而过度使用，应该根据内容的实际含义选择合适的标签。

### 7.2 全局属性的使用

- **id 的唯一性**：确保每个元素的 `id` 属性值在页面中是唯一的。
- **class 的复用**：使用 `class` 属性来为多个元素应用相同的样式，提高代码的可维护性。
- **避免行内样式**：尽量避免使用 `style` 属性直接在元素上定义样式，应该使用 CSS 文件或 `<style>` 标签。
- **合理使用 data-\* 属性**：使用 `data-*` 属性来存储与元素相关的自定义数据，而不是使用 `id` 或 `class` 来存储数据。

### 7.3 链接和图像的最佳实践

- **链接的可访问性**：为链接添加 `title` 属性，提供额外的上下文信息。
- **图像的 alt 属性**：为所有图像添加 `alt` 属性，描述图像的内容，这对 SEO 和无障碍访问都很重要。
- **图像的尺寸**：为图像指定 `width` 和 `height` 属性，这样浏览器可以在加载图像之前预留空间，避免页面布局跳动。
- **图像的延迟加载**：对于大型图像，使用 `loading="lazy"` 属性来延迟加载，提高页面加载速度。

### 7.4 代码风格

- **缩进**：使用一致的缩进（通常是 2 或 4 个空格）来提高代码的可读性。
- **大小写**：HTML 标签和属性通常使用小写。
- **引号**：属性值应该使用双引号包围。
- **注释**：为复杂的代码添加注释，提高代码的可维护性。

---

### 更新日志 (Changelog)

- 2026-04-05: 细化基础标签与全局属性用法。
- 2026-04-05: 扩写内容，增加详细的基础文本标签、列表标签、超链接与多媒体、全局属性、语义化标签的概念、示例和最佳实践，以及实际应用示例。
