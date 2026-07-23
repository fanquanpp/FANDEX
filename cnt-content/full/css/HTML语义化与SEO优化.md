---
order: 103
title: HTML语义化与SEO优化
module: css
category: 'dev-lang'
difficulty: intermediate
description: HTML语义化标签与SEO优化详解：结构化标记、Schema.org、无障碍与搜索引擎友好实践。
author: fanquanpp
updated: '2026-06-14'
related:
  - css/CSS新特性
  - css/CSS性能优化详解
  - css/响应式图片
  - 'css/项目示例-响应式个人主页'
prerequisites:
  - css/概述与基本语法
---

## 1. 语义化标签体系

### 1.1 文档结构标签

```html
<header>
  <nav aria-label="主导航">
    <ul>
      <li><a href="/">首页</a></li>
      <li><a href="/about">关于</a></li>
    </ul>
  </nav>
</header>

<main>
  <article>
    <header>
      <h1>文章标题</h1>
      <time datetime="2026-06-14">2026年6月14日</time>
    </header>
    <section>
      <h2>第一节</h2>
      <p>内容段落</p>
    </section>
    <section>
      <h2>第二节</h2>
      <p>内容段落</p>
    </section>
    <footer>
      <p>作者：张三</p>
    </footer>
  </article>

  <aside aria-label="侧边栏">
    <section>
      <h2>相关文章</h2>
      <ul>
        ...
      </ul>
    </section>
  </aside>
</main>

<footer>
  <p>&copy; 2026 示例网站</p>
</footer>
```

### 1.2 语义标签对照表

| 标签        | 语义          | 使用场景           |
| ----------- | ------------- | ------------------ |
| `<header>`  | 页眉/区块头部 | 页面顶部、文章头部 |
| `<nav>`     | 导航          | 主导航、面包屑     |
| `<main>`    | 主内容区      | 页面唯一主内容     |
| `<article>` | 独立内容      | 博客文章、新闻     |
| `<section>` | 内容分区      | 章节分组           |
| `<aside>`   | 附属内容      | 侧边栏、广告       |
| `<footer>`  | 页脚/区块尾部 | 版权信息、链接     |
| `<figure>`  | 自包含内容    | 图片、图表         |
| `<details>` | 可展开详情    | FAQ、补充说明      |
| `<time>`    | 时间/日期     | 发布日期、事件时间 |
| `<address>` | 联系信息      | 作者联系方式       |
| `<mark>`    | 标记/高亮     | 搜索结果高亮       |

### 1.3 反模式

```html
<!--  div 汤 -->
<div class="header">
  <div class="nav">
    <div class="nav-item">首页</div>
  </div>
</div>
<div class="main">
  <div class="article">
    <div class="title">标题</div>
  </div>
</div>

<!--  语义化 -->
<header>
  <nav>
    <a href="/">首页</a>
  </nav>
</header>
<main>
  <article>
    <h1>标题</h1>
  </article>
</main>
```

## 2. SEO 核心要素

### 2.1 页面元信息

```html
<head>
  <!-- 基础元信息 -->
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>页面标题 - 网站名称（建议 60 字符以内）</title>
  <meta name="description" content="页面描述，建议 150-160 字符" />
  <meta name="robots" content="index, follow" />

  <!-- Open Graph（社交媒体分享） -->
  <meta property="og:type" content="article" />
  <meta property="og:title" content="文章标题" />
  <meta property="og:description" content="文章描述" />
  <meta property="og:image" content="https://example.com/image.jpg" />
  <meta property="og:url" content="https://example.com/article" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="文章标题" />
  <meta name="twitter:description" content="文章描述" />
  <meta name="twitter:image" content="https://example.com/image.jpg" />

  <!-- 规范链接 -->
  <link rel="canonical" href="https://example.com/article" />

  <!-- 替代语言版本 -->
  <link rel="alternate" hreflang="en" href="https://example.com/en/article" />
  <link rel="alternate" hreflang="zh" href="https://example.com/zh/article" />
</head>
```

### 2.2 标题层级

```html
<!--  正确的标题层级 -->
<h1>页面主标题（每页仅一个）</h1>
<h2>章节标题</h2>
<h3>小节标题</h3>
<h2>另一个章节</h2>

<!--  错误的标题层级 -->
<h1>主标题</h1>
<h3>跳过了 h2</h3>
<!-- 错误 -->
<h2>标题</h2>
<h1>又出现 h1</h1>
<!-- 错误 -->
```

### 2.3 结构化数据（Schema.org）

```html
<script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "文章标题",
    "author": {
      "@type": "Person",
      "name": "张三"
    },
    "datePublished": "2026-06-14",
    "dateModified": "2026-06-14",
    "image": "https://example.com/image.jpg",
    "publisher": {
      "@type": "Organization",
      "name": "示例网站",
      "logo": {
        "@type": "ImageObject",
        "url": "https://example.com/logo.png"
      }
    }
  }
</script>
```

常见 Schema.org 类型：

| 类型             | 用途       |
| ---------------- | ---------- |
| `Article`        | 文章       |
| `Product`        | 商品       |
| `FAQPage`        | FAQ 页面   |
| `HowTo`          | 教程       |
| `BreadcrumbList` | 面包屑导航 |
| `Organization`   | 组织/公司  |
| `WebSite`        | 网站搜索   |

### 2.4 面包屑导航

```html
<nav aria-label="面包屑">
  <ol itemscope itemtype="https://schema.org/BreadcrumbList">
    <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
      <a itemprop="item" href="/"><span itemprop="name">首页</span></a>
      <meta itemprop="position" content="1" />
    </li>
    <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
      <a itemprop="item" href="/blog"><span itemprop="name">博客</span></a>
      <meta itemprop="position" content="2" />
    </li>
    <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
      <span itemprop="name">当前文章</span>
      <meta itemprop="position" content="3" />
    </li>
  </ol>
</nav>
```

## 3. 无障碍与 SEO 交集

### 3.1 图片优化

```html
<!--  有 alt 文本 -->
<img src="chart.png" alt="2026年Q1销售增长趋势图，同比增长15%" />

<!--  装饰性图片 -->
<img src="divider.png" alt="" role="presentation" />

<!--  复杂图片配合长描述 -->
<figure>
  <img src="infographic.png" alt="信息图：全球碳排放趋势" />
  <figcaption>详细描述...</figcaption>
</figure>
```

### 3.2 链接文本

```html
<!--  模糊链接 -->
<a href="/article">点击这里</a>
<a href="/article">了解更多</a>

<!--  描述性链接 -->
<a href="/article">阅读关于CSS性能优化的完整指南</a>
```

### 3.3 ARIA 地标

```html
<header role="banner">
  <nav role="navigation" aria-label="主导航">
    <main role="main">
      <aside role="complementary">
        <footer role="contentinfo"></footer>
      </aside>
    </main>
  </nav>
</header>
```

## 4. 技术 SEO

### 4.1 页面加载性能

Core Web Vitals 对 SEO 排名的影响：

| 指标 | 目标值  | 优化方向                |
| ---- | ------- | ----------------------- |
| LCP  | < 2.5s  | 关键 CSS 内联、图片优化 |
| INP  | < 200ms | 减少主线程阻塞          |
| CLS  | < 0.1   | 预留尺寸、字体优化      |

### 4.2 robots.txt

```
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Sitemap: https://example.com/sitemap.xml
```

### 4.3 Sitemap

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/</loc>
    <lastmod>2026-06-14</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
```

### 4.4 SSR/SSG 对 SEO 的影响

| 渲染模式 | SEO 友好度 | 说明                   |
| -------- | ---------- | ---------------------- |
| SSR      | 最佳       | 服务端返回完整 HTML    |
| SSG      | 最佳       | 构建时生成静态 HTML    |
| CSR      | 较差       | 需要额外处理（预渲染） |
| ISR      | 良好       | 增量静态再生           |
