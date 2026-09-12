---
order: 170
title: 语义化标签
module: 'html5'
category: 前端技术
difficulty: beginner
description: HTML5语义化标签详解：header、nav、main、article、section、aside、footer等，提升可访问性与SEO。
author: fanquanpp
updated: '2026-09-13'
related:
  - 'html5/080-HTML5DivSpanContainers'
  - 'html5/100-HTML5BasicContentTags'
  - 'html5/150-HTML5TableAndStructuredContent'
  - 'html5/180-Accessibility'
  - 'html5/190-HTML5FormValidation'
prerequisites: []
---

## 学习目标

本文是「HTML5」模块的第 17 篇，难度定位为入门。重点内容：HTML5语义化标签详解：header、nav、main、article、section、aside、footer等，提升可访问性与SEO。

主要章节：

- 0. 语义化标签的直觉：给网页内容贴“标签牌”
- 1. 语义化标签概述
- 2. 页面结构标签
- 3. 内容分区标签
- 4. 文本级语义标签
- 5. 完整语义化页面示例
- ……共 13 个章节

> 阅读建议（零基础）：本篇是「了解即可」章节。第一遍重点读第 0 节与第 1 节即可。

## 0. 语义化标签的直觉：给网页内容贴“标签牌”

想象一下：如果网页是一个房间，里面的内容就是家具。

- 用 `div` 搭建的页面 = 所有家具都用同样的白布盖着，你走进来只能摸到一堆方方正正的块，不知道哪个是沙发、哪个是桌子；
- 用语义化标签搭建的页面 = 每件家具都有标签牌（“沙发”“餐桌”“书架”），一摸就知道这是什么。

屏幕阅读器（给视障用户读网页的软件）就是这样工作的。语义化标签，就是给网页内容贴标签牌。

那具体怎么给网页内容“贴标签牌”呢？下面我们用代码来对比一下——同样是“首页导航”，用 `div` 怎么写，用语义化标签又怎么写。

## 1. 语义化标签概述

### 1.1 什么是语义化

语义化是指使用具有明确含义的HTML标签来描述内容的结构和意义，而非仅仅关注外观表现。

**语义化的好处**：

- **可读性**：代码结构清晰，便于团队协作和维护
- **可访问性**：屏幕阅读器等辅助技术能更好地理解页面结构
- **SEO优化**：搜索引擎能更准确地理解页面内容
- **可维护性**：结构化的代码更容易修改和扩展

### 1.2 语义化 vs 非语义化

```html
<!-- 非语义化：全部使用div（div汤） -->
<div class="header">
  <div class="nav">
    <div class="nav-item">首页</div>
    <div class="nav-item">关于</div>
  </div>
</div>
<div class="main">
  <div class="article">
    <div class="article-title">文章标题</div>
    <div class="article-content">文章内容</div>
  </div>
  <div class="sidebar">侧边栏</div>
</div>
<div class="footer">页脚</div>

<!-- 语义化：使用有意义的标签 -->
<header>
  <nav>
    <a href="/">首页</a>
    <a href="/about">关于</a>
  </nav>
</header>
<main>
  <article>
    <h1>文章标题</h1>
    <p>文章内容</p>
  </article>
  <aside>侧边栏</aside>
</main>
<footer>页脚</footer>
```

**讲解：**

- 左半部分用 `div` + `class` 模拟页面结构，类名只能表达样式意图，机器无法识别；
- 右半部分换成 `header`/`nav`/`main`/`article`/`aside`/`footer`，浏览器、搜索引擎和读屏软件都能直接理解结构；
- 语义化并不增加功能代码，却让可访问性、SEO 与可维护性同时受益。

## 2. 页面结构标签

学习路径：先搭“骨架”（`header`、`nav`、`main`、`footer`），再填“内容分区”（`article`、`section`、`aside`），最后修饰“文本细节”（`time`、`figure`、`details` 等）。从大到小，先看到森林，再看到树木。

### 2.1 header

`<header>` 表示页面或区块的头部，通常包含标题、导航、搜索等。

```html
<!-- 页面级 header -->
<header>
  <div class="logo">
    <img src="logo.png" alt="网站Logo" />
    <span>我的网站</span>
  </div>
  <nav aria-label="主导航">
    <ul>
      <li><a href="/">首页</a></li>
      <li><a href="/products">产品</a></li>
      <li><a href="/about">关于我们</a></li>
      <li><a href="/contact">联系方式</a></li>
    </ul>
  </nav>
  <form role="search">
    <input type="search" placeholder="搜索..." aria-label="搜索" />
    <button type="submit">搜索</button>
  </form>
</header>

<!-- 区块级 header -->
<article>
  <header>
    <h2>文章标题</h2>
    <time datetime="2026-06-13">2026年6月13日</time>
    <address>作者：<a href="mailto:author@example.com">张三</a></address>
  </header>
  <p>文章内容...</p>
</article>
```

**讲解：**

- `header` 可同时用于页面级和区块级：页面头部放 Logo 与导航，文章头部放标题、时间与作者；
- `aria-label="主导航"` 为无可见文字的导航提供可访问名称，供读屏软件播报；
- `role="search"` 在旧浏览器中补充搜索区域的语义，现代 HTML 可直接使用 `<search>` 元素。

### 2.2 nav

`<nav>` 定义导航链接的区域，一个页面可以有多个导航。

```html
<!-- 主导航 -->
<nav aria-label="主导航">
  <ul>
    <li><a href="/" aria-current="page">首页</a></li>
    <li><a href="/blog">博客</a></li>
    <li><a href="/projects">项目</a></li>
  </ul>
</nav>

<!-- 面包屑导航 -->
<nav aria-label="面包屑">
  <ol>
    <li><a href="/">首页</a></li>
    <li><a href="/blog">博客</a></li>
    <li aria-current="page">当前文章</li>
  </ol>
</nav>

<!-- 分页导航 -->
<nav aria-label="分页">
  <ul>
    <li><a href="?page=1" aria-label="第1页">1</a></li>
    <li><a href="?page=2" aria-current="page" aria-label="当前页，第2页">2</a></li>
    <li><a href="?page=3" aria-label="第3页">3</a></li>
  </ul>
</nav>
```

**讲解：**

- `<nav>` 专用于“主要导航块”，普通链接组（如页脚友链）不必全部包进 `nav`；
- `aria-current="page"` 标记当前所在页，读屏用户可立即感知位置；
- 面包屑用 `<ol>` 表达层级顺序，与主导航的 `<ul>` 形成语义区分。

### 2.3 main

`<main>` 表示页面的主要内容区域，每个页面只能有一个。

```html
<body>
  <header>...</header>
  <nav>...</nav>

  <main id="main-content">
    <!-- 页面的核心内容 -->
    <h1>页面主标题</h1>
    <p>主要内容区域...</p>
  </main>

  <aside>...</aside>
  <footer>...</footer>
</body>

<!-- 跳过导航链接（可访问性） -->
<body>
  <a href="#main-content" class="skip-link">跳到主要内容</a>
  <header>...</header>
  <main id="main-content">...</main>
</body>
```

**讲解：**

- `<main>` 是全页唯一的主内容容器，不要嵌套在 `article`/`section` 内部；
- 第一个示例说明 `main` 与 `header`/`nav`/`aside`/`footer` 的并列关系；
- 第二个示例的“跳过导航链接”让键盘用户直接跳到 `#main-content`，是 WCAG 2.4.1 的常见实现。

### 2.4 footer

`<footer>` 定义页面或区块的底部，通常包含版权、联系方式、链接等。

```html
<footer>
  <div class="footer-content">
    <section>
      <h3>关于我们</h3>
      <p>公司简介...</p>
    </section>
    <section>
      <h3>快速链接</h3>
      <ul>
        <li><a href="/privacy">隐私政策</a></li>
        <li><a href="/terms">服务条款</a></li>
      </ul>
    </section>
    <section>
      <h3>联系方式</h3>
      <address>
        <a href="mailto:info@example.com">info@example.com</a><br />
        <a href="tel:+8612345678">+86 123-4567-8</a>
      </address>
    </section>
  </div>
  <p><small>&copy; 2026 我的公司. 保留所有权利.</small></p>
</footer>
```

**讲解：**

- `footer` 同样可以出现在区块内（如文章底部），与 `header` 首尾呼应；
- `address` 只用于联系方式，与页面地址说明区分开；
- 版权行用 `<small>` 弱化视觉权重，符合“附属细则”的语义。

## 3. 内容分区标签

### 3.1 article

`<article>` 表示独立的、可复用的内容块。

```html
<!-- 博客文章 -->
<article>
  <header>
    <h2>深入理解HTML5语义化</h2>
    <p>
      由 <a href="/author/zhangsan">张三</a> 发布于
      <time datetime="2026-06-13">2026年6月13日</time>
    </p>
  </header>
  <p>文章正文内容...</p>
  <section>
    <h3>评论</h3>
    <article>
      <header>
        <p>李四 评论于 <time datetime="2026-06-13T10:30">10:30</time></p>
      </header>
      <p>非常好的文章！</p>
    </article>
  </section>
</article>

<!-- 新闻条目 -->
<article itemscope itemtype="https://schema.org/NewsArticle">
  <h2 itemprop="headline">重大新闻标题</h2>
  <meta itemprop="datePublished" content="2026-06-13" />
  <p itemprop="articleBody">新闻内容...</p>
</article>
```

**讲解：**

- `article` 强调“可独立分发”：博客文章、新闻、评论都可以各自成为一个 `article`；
- 评论作为 `article` 嵌套在文章的 `section` 中，体现“评论本身也是独立内容”；
- 第二个示例使用 `itemscope`/`itemtype` 微数据标注新闻类型，增强搜索引擎对结构化信息的理解。

### 3.2 section

`<section>` 表示文档中的一个主题分组，通常包含标题。

```html
<article>
  <h1>Web开发指南</h1>

  <section>
    <h2>HTML基础</h2>
    <p>HTML是Web的骨架...</p>
  </section>

  <section>
    <h2>CSS样式</h2>
    <p>CSS负责页面的视觉表现...</p>
  </section>

  <section>
    <h2>JavaScript交互</h2>
    <p>JavaScript让页面动起来...</p>
  </section>
</article>

<!-- section vs div 的选择 -->
<!-- section: 内容有主题意义，通常有标题 -->
<!-- div: 仅用于样式/脚本目的，无语义 -->
```

**讲解：**

- `section` 必须有主题意义且通常带标题，是 `article` 内部的章节容器；
- 同一 `article` 下用多个 `section` 划分主题，对应文档大纲中的层级；
- 纯布局容器应退回 `div`，不要为了“语义化”强行套 `section`。

### 3.3 aside

`<aside>` 表示与主内容间接相关的辅助内容。

```html
<main>
  <article>
    <h1>如何学习编程</h1>
    <p>学习编程的第一步是...</p>
  </article>

  <aside aria-label="相关文章">
    <h2>推荐阅读</h2>
    <ul>
      <li><a href="/post/2">编程语言选择指南</a></li>
      <li><a href="/post/3">高效学习方法</a></li>
    </ul>
  </aside>

  <aside aria-label="广告">
    <h2>赞助商</h2>
    <p>广告内容...</p>
  </aside>
</main>
```

**讲解：**

- `aside` 的内容与主内容“间接相关”，可独立存在（推荐文章、广告、相关链接）；
- 多个 `aside` 通过不同的 `aria-label` 区分用途，避免读屏播报时混淆；
- `aside` 放在 `main` 内部或外部均可，取决于它服务于整页还是局部内容。

## 4. 文本级语义标签

### 4.1 time

```html
<!-- 日期 -->
<time datetime="2026-06-13">2026年6月13日</time>

<!-- 日期和时间 -->
<time datetime="2026-06-13T14:30:00+08:00">下午2:30</time>

<!-- 时间段 -->
<time datetime="PT2H30M">2小时30分钟</time>

<!-- 可读性更好的日期 -->
<time datetime="2026-06-13">上周五</time>
```

**讲解：**

- `datetime` 提供机器可读的 ISO 8601 时间值，可见文本可以是“上周五”这类自然表达；
- 时间值带时区（`+08:00`）时适合标注跨时区事件；
- `PT2H30M` 表示持续时间，用于时长类内容（如视频长度）。

### 4.2 figure 与 figcaption

```html
<!-- 图片说明 -->
<figure>
  <img src="chart.png" alt="2026年销售数据图表" />
  <figcaption>图1：2026年上半年销售数据趋势</figcaption>
</figure>

<!-- 代码示例 -->
<figure>
  <figcaption>示例：Hello World程序</figcaption>
  <pre><code>console.log("Hello, World!");</code></pre>
</figure>

<!-- 引用 -->
<figure>
  <blockquote>
    <p>任何足够先进的技术，都与魔法无异。</p>
  </blockquote>
  <figcaption>—— 亚瑟·克拉克，<cite>未来的轮廓</cite></figcaption>
</figure>
```

**讲解：**

- `figure` 把图表、代码、引用等“独立媒体”与其说明文字绑定；
- `figcaption` 必须是 `figure` 的第一个或最后一个子元素，作为整体标题；
- 图片 + `figcaption` 组合可替代无意义的“标题 div”，语义更完整。

### 4.3 details 与 summary

```html
<!-- 可折叠内容 -->
<details>
  <summary>常见问题：如何重置密码？</summary>
  <p>请访问登录页面，点击"忘记密码"链接，输入注册邮箱后按照邮件指引操作。</p>
</details>

<!-- 默认展开 -->
<details open>
  <summary>使用说明</summary>
  <p>这是默认展开的说明内容。</p>
</details>

<!-- 手风琴效果（需JS配合） -->
<div class="accordion">
  <details>
    <summary>第一章：入门</summary>
    <p>入门内容...</p>
  </details>
  <details>
    <summary>第二章：进阶</summary>
    <p>进阶内容...</p>
  </details>
  <details>
    <summary>第三章：高级</summary>
    <p>高级内容...</p>
  </details>
</div>
```

**讲解：**

- `details` 提供原生折叠交互，`summary` 是折叠开关的标题；
- `open` 属性控制默认展开状态，无需脚本即可切换；
- 多个 `details` 可组合出手风琴效果，如需“同时只展开一个”则要配合 JavaScript。

### 4.4 mark、abbr、cite

```html
<!-- 高亮文本 -->
<p>搜索结果中 <mark>HTML5</mark> 语义化标签的使用...</p>

<!-- 缩写 -->
<p><abbr title="HyperText Markup Language">HTML</abbr> 是Web的基础。</p>

<!-- 引用标题 -->
<p>参考书目：<cite>JavaScript高级程序设计</cite></p>

<!-- 定义术语 -->
<p><dfn>语义化</dfn>是指使用具有明确含义的标签来描述内容。</p>

<!-- 联系方式 -->
<address>
  作者：<a href="mailto:author@example.com">张三</a><br />
  地址：北京市朝阳区xxx
</address>
```

**讲解：**

- `mark` 表示与当前语境相关的标记（如搜索结果高亮），不要用于普通装饰；
- `abbr` 配合 `title` 给出全称，`dfn` 标记术语的首次定义；
- `cite` 引用作品标题，`address` 提供文档或文章的联系信息。

## 5. 完整语义化页面示例

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>我的博客 - HTML5语义化</title>
  </head>
  <body>
    <!-- 跳过导航（可访问性） -->
    <a href="#main" class="skip-link">跳到主要内容</a>

    <header>
      <div class="logo">
        <a href="/">我的博客</a>
      </div>
      <nav aria-label="主导航">
        <ul>
          <li><a href="/" aria-current="page">首页</a></li>
          <li><a href="/archive">归档</a></li>
          <li><a href="/about">关于</a></li>
        </ul>
      </nav>
    </header>

    <!-- 纯布局容器：未来用 CSS flex/grid 排版，无任何语义 -->
    <div class="layout">
      <main id="main">
        <article>
          <header>
            <h1>深入理解HTML5语义化标签</h1>
            <p>
              由 <span>张三</span> 发布于
              <time datetime="2026-06-13"> 2026年6月13日 </time>
            </p>
          </header>

          <section>
            <h2>什么是语义化</h2>
            <p>语义化是使用有意义的HTML标签...</p>
          </section>

          <section>
            <h2>常用语义化标签</h2>
            <p>HTML5引入了许多新的语义化标签...</p>

            <figure>
              <img src="semantic-structure.png" alt="HTML5语义化页面结构示意图" />
              <figcaption>图1：HTML5语义化页面结构</figcaption>
            </figure>
          </section>

          <footer>
            <p>
              标签： <a href="/tag/html5">HTML5</a>，
              <a href="/tag/semantic">语义化</a>
            </p>
          </footer>
        </article>

        <section>
          <h2>评论</h2>
          <article>
            <header>
              <p>李四 评论于 <time datetime="2026-06-13T15:00">15:00</time></p>
            </header>
            <p>非常实用的文章！</p>
          </article>
        </section>
      </main>

      <aside aria-label="侧边栏">
        <section>
          <h2>关于作者</h2>
          <p>Web开发者，热爱开源...</p>
        </section>
        <nav aria-label="文章分类">
          <h2>分类</h2>
          <ul>
            <li><a href="/cat/html">HTML</a></li>
            <li><a href="/cat/css">CSS</a></li>
            <li><a href="/cat/js">JavaScript</a></li>
          </ul>
        </nav>
      </aside>
    </div>

    <footer>
      <p><small>&copy; 2026 我的博客. 保留所有权利.</small></p>
    </footer>
  </body>
</html>
```

**讲解：**

- 页面从“跳过链接”开始，随后按 `header`、`main`、`aside`、`footer` 展开，形成完整语义骨架；
- `header`/`main`/`footer` 在现代 HTML5 中自带 `banner`/`main`/`contentinfo` 语义角色，无需再写 `role` 属性；
- `article` 内部自带 `header`/`section`/`footer`，证明这些标签可在任意层级重复使用；
- `<div class="layout">` 只负责布局（未来用 flex/grid 排版），不承载语义，与内容结构分离；
- 微数据（`itemscope`/`itemprop`）属于进阶知识，见第 8 章 8.3，本示例不再混入。

## 6. 常见问题与解决方案

### 6.1 section vs div 的选择

**原则**：有主题意义用 section，仅用于样式用 div

```html
<!-- 正确：section有主题 -->
<section>
  <h2>产品特性</h2>
  <p>内容...</p>
</section>

<!-- 正确：div仅用于布局 -->
<div class="grid">
  <div class="col-8">...</div>
  <div class="col-4">...</div>
</div>
```

**讲解：**

- 判断依据是“有没有主题意义”：有主题且能成章节用 `section`，仅排版用 `div`；
- `section` 默认没有视觉差异，其价值体现在大纲、SEO 与读屏导航；
- 网格布局中的列容器是典型 `div` 场景，不需要强行语义化。

### 6.2 article vs section 的选择

- **article**：内容独立、可单独分发（博客文章、新闻、评论）
- **section**：内容的主题分组（章节、选项卡面板）

### 6.3 多个 header/footer

一个页面可以有多个 header 和 footer，但 main 只能有一个。

```html
<!-- 正确：article内可以有header/footer -->
<article>
  <header>文章头部</header>
  <p>内容</p>
  <footer>文章底部</footer>
</article>
```

**讲解：**

- 页面可容纳多个 `header`/`footer`，因为每个区块都可以有自己的头部与底部；
- 唯一性约束只落在 `main` 上：全页仅有一个 `main`；
- 区块级 `header` 使用 `h2` 等较低级别标题，避免与页面 `h1` 竞争。

## 7. 总结与最佳实践

### 7.1 语义化标签选择流程

```
内容是否独立可复用？ → 是 → article
                    → 否 → 内容是否有主题分组？ → 是 → section
                                                 → 否 → 仅用于样式？ → 是 → div
                                                                       → 否 → 考虑其他标签
```

### 7.2 最佳实践

1. **优先使用语义化标签**，div/span 作为最后选择
2. **每个 section/article 应有标题**（h1-h6）
3. **main 每页只有一个**，不要嵌套在 article/section 中
4. **nav 用于主要导航**，不要包裹所有链接
5. **使用 ARIA 标签**增强可访问性：`aria-label`、`aria-current`
6. **添加跳过导航链接**，方便键盘用户
7. **使用微数据（Microdata）**增强SEO

## 8. 进阶知识点

### 8.1 搜索区域：search

```html
<search>
  <form action="/search">
    <input type="search" name="q" aria-label="站内搜索" />
    <button type="submit">搜索</button>
  </form>
</search>
```

**讲解：**

- `<search>` 是 HTML Living Standard 引入的搜索语义容器，替代 `role="search"`；
- 它只描述“这里是搜索区域”，表单与输入框的职责仍由 `form`/`input` 承担；
- 站点搜索与站内过滤均可使用，读屏软件会将其识别为 landmark 区域。

### 8.2 对话框：dialog

```html
<dialog id="confirm">
  <form method="dialog">
    <p>确认删除这条记录吗？</p>
    <button value="cancel">取消</button>
    <button value="ok">确认</button>
  </form>
</dialog>
<button id="open">打开对话框</button>

<script>
  document.getElementById('open').addEventListener('click', () => {
    document.getElementById('confirm').showModal();
  });
</script>
```

**讲解：**

- `showModal()` 以模态方式打开，背景内容自动不可交互，焦点被限制在对话框内；
- `method="dialog"` 让按钮直接关闭对话框，并把 `value` 写入 `dialog.returnValue`；
- 对话框属于顶层渲染层，天然覆盖其他内容，无需维护 `z-index`。

### 8.3 微数据增强语义

```html
<article itemscope itemtype="https://schema.org/Product">
  <h2 itemprop="name">无线耳机</h2>
  <p itemprop="description">支持主动降噪的蓝牙耳机</p>
  <meta itemprop="price" content="399" />
  <meta itemprop="priceCurrency" content="CNY" />
</article>
```

**讲解：**

- `itemscope` 声明一个微数据条目，`itemtype` 指向 schema.org 类型，`itemprop` 标记具体属性；
- 价格等机器字段用 `<meta>` 承载，可见文本可保持人类友好的写法；
- 搜索引擎据此生成富媒体摘要（价格、评分等），是 SEO 的结构化数据方案之一。

### 8.4 ARIA 增强可访问性

```html
<button aria-expanded="false" aria-controls="menu">菜单</button>
<ul id="menu" role="menu" hidden>
  <li role="menuitem">首页</li>
  <li role="menuitem">关于</li>
</ul>
```

**讲解：**

- ARIA 只在原生语义不足时使用：自定义菜单、手风琴、选项卡等复合组件；
- `aria-expanded` 告知读屏软件展开状态，`aria-controls` 指向被控制的元素；
- 优先使用原生元素（如 `<details>`、`<dialog>`），ARIA 是补充而非替代。

## 9. 动手试试：改造一个“非语义化”页面

下面是一段用 `div` 搭建的页面结构，请用学过的语义化标签重写它：

```html
<div class="page">
  <div class="header">
    <div class="logo">我的网站</div>
    <div class="nav">
      <a href="#">首页</a>
      <a href="#">关于</a>
    </div>
  </div>
  <div class="main">
    <div class="article">
      <div class="title">文章标题</div>
      <div class="content">文章内容...</div>
    </div>
    <div class="sidebar">侧边栏</div>
  </div>
  <div class="footer">版权信息</div>
</div>
```

### 9.1 参考答案

```html
<header>
  <div class="logo">我的网站</div>
  <nav>
    <a href="#">首页</a>
    <a href="#">关于</a>
  </nav>
</header>
<main>
  <article>
    <h1>文章标题</h1>
    <p>文章内容...</p>
  </article>
  <aside>侧边栏</aside>
</main>
<footer>版权信息</footer>
```

讲解：

- `header`/`main`/`footer` 替换外层三个 `div`，页面骨架立刻可读；
- `article` 内的“标题 + 内容”换成 `h1` 与 `p`，标题层级恢复；
- `nav`、`aside` 分别表达导航与侧边栏，`div` 仅保留 `logo` 这类纯布局容器。

## 10. 核心知识点

- 语义化 = 用有明确含义的标签描述结构：`header`/`nav`/`main`/`article`/`section`/`aside`/`footer`；
- `main` 每页唯一；`header`/`footer` 可重复出现在页面与区块两级；
- `article` 用于可独立分发的内容，`section` 用于主题分组，`div` 仅做样式容器；
- 文本级语义标签（`time`、`figure`、`details`、`mark`、`abbr`、`cite`）让内容细节也可被理解；
- 语义化优先、ARIA 补充、微数据增强，三者共同支撑 SEO 与无障碍。

## 11. 注意事项与改进建议

| 问题点 | 说明 | 改进方案 |
| --- | --- | --- |
| `div` 汤 | 全站 div + class 模拟结构，语义完全丢失 | 按内容含义换用语义化标签 |
| `section` 无标题 | 大纲中无法识别该分组的主题 | 为 `section` 补充 `h1`-`h6` 标题 |
| `main` 出现多次 | 违反唯一性原则，读屏跳转混乱 | 全页只保留一个 `main` |
| `nav` 包裹所有链接 | landmark 泛滥，导航识别失效 | 仅主要导航与分页使用 `nav` |
| 滥用 ARIA | 与原生语义冲突，反而误导读屏 | 优先原生元素，ARIA 只做补充 |
| `article` 嵌套过深 | 大纲层级膨胀，阅读困难 | 评论等独立内容才使用嵌套 `article` |

## 12. 扩展学习

- 完整实践：阅读 `html5/110-TextSemantic` 与 `html5/120-List` 掌握文本与列表语义；
- 无障碍深化：结合 `html5/180-Accessibility` 学习 WCAG 与 ARIA 完整规范；
- 结构化数据：在 `html5/350-MicrodataJSONLD` 中对比微数据与 JSON-LD；
- 交互组件：`html5/160-ProgressMeter`、`html5/310-WebComponentsPWADevelopment` 可延伸自定义组件语义；
- SEO 方向：参考 `css/660-HTMLSemanticSEO` 了解语义化对搜索排名的影响。
