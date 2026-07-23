---
order: 25
tags:
  - html5
  - semantic
difficulty: beginner
title: 语义化标签
module: html5
category: 'HTML5 Basics'
description: HTML5语义化标签详解：header、nav、main、article、section、aside、footer等，提升可访问性与SEO。
author: fanquanpp
updated: '2026-06-13'
related:
  - html5/概述与核心特性
  - html5/基础标签与全局属性
  - html5/无障碍访问
  - html5/表单与验证
prerequisites: []
---

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

## 2. 页面结构标签

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

    <header role="banner">
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

    <div class="layout">
      <main id="main" role="main">
        <article itemscope itemtype="https://schema.org/BlogPosting">
          <header>
            <h1 itemprop="headline">深入理解HTML5语义化标签</h1>
            <p>
              由 <span itemprop="author">张三</span> 发布于
              <time itemprop="datePublished" datetime="2026-06-13"> 2026年6月13日 </time>
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

    <footer role="contentinfo">
      <p><small>&copy; 2026 我的博客. 保留所有权利.</small></p>
    </footer>
  </body>
</html>
```

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
