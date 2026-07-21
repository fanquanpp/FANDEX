# 语义化标签 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数

---

## 页面结构标签

**header 头部**
`<header>...[h1-h6|nav|form]...</header>`
```html
<!-- 页面级 header -->
<header>
  <h1>网站标题</h1>
  <nav>
    <ul>
      <li><a href="/">首页</a></li>
      <li><a href="/about">关于</a></li>
    </ul>
  </nav>
</header>

<!-- article 内的 header -->
<article>
  <header>
    <h2>文章标题</h2>
    <time datetime="2026-06-13">2026年6月13日</time>
  </header>
  <p>文章内容...</p>
</article>
```

**nav 导航**
`<nav [aria-label="<名称>"]>...[a|ul]...</nav>`
```html
<!-- 主导航 -->
<nav aria-label="主导航">
  <ul>
    <li><a href="/" aria-current="page">首页</a></li>
    <li><a href="/blog">博客</a></li>
  </ul>
</nav>

<!-- 面包屑 -->
<nav aria-label="面包屑">
  <ol>
    <li><a href="/">首页</a></li>
    <li><a href="/blog">博客</a></li>
    <li aria-current="page">当前文章</li>
  </ol>
</nav>

<!-- 分页 -->
<nav aria-label="分页">
  <ul>
    <li><a href="?page=1">1</a></li>
    <li><a href="?page=2" aria-current="page">2</a></li>
  </ul>
</nav>
```

**main 主内容**
`<main [id="<锚点ID>"]>...</main>`
```html
<!-- 每页只能有一个 main -->
<body>
  <a href="#main-content" class="skip-link">跳到主要内容</a>
  <header>...</header>
  <main id="main-content">
    <h1>页面主标题</h1>
    <p>主要内容区域...</p>
  </main>
  <footer>...</footer>
</body>
```

**footer 底部**
`<footer>...[address|nav|p]...</footer>`
```html
<footer>
  <section>
    <h3>联系方式</h3>
    <address>
      <a href="mailto:info@example.com">info@example.com</a><br />
      <a href="tel:+8612345678">+86 123-4567-8</a>
    </address>
  </section>
  <p><small>&copy; 2026 我的公司. 保留所有权利.</small></p>
</footer>
```

---

## 内容分区标签

**article 独立内容**
`<article>...[header|section|footer]...</article>`
```html
<!-- 博客文章 -->
<article>
  <header>
    <h2>深入理解HTML5语义化</h2>
    <p>由 <a href="/author/zhangsan">张三</a> 发布于
      <time datetime="2026-06-13">2026年6月13日</time>
    </p>
  </header>
  <p>文章正文内容...</p>
  <footer>
    <p>标签:<a href="/tag/html5">HTML5</a></p>
  </footer>
</article>

<!-- 嵌套评论 -->
<article>
  <header>
    <p>李四 评论于 <time datetime="2026-06-13T10:30">10:30</time></p>
  </header>
  <p>非常好的文章!</p>
</article>
```

**section 主题分组**
`<section>...[h2-h6]...</section>`
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
</article>
```

**aside 侧边栏**
`<aside [aria-label="<名称>"]>...</aside>`
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
    </ul>
  </aside>
</main>
```

---

## 文本级语义标签

**time 时间**
`<time datetime="<ISO日期>">[显示文本]</time>`
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

**figure 与 figcaption**
`<figure>...[img|pre|blockquote]...[<figcaption>[说明]</figcaption>]</figure>`
```html
<!-- 图片说明 -->
<figure>
  <img src="chart.png" alt="2026年销售数据图表" />
  <figcaption>图1:2026年上半年销售数据趋势</figcaption>
</figure>

<!-- 代码示例 -->
<figure>
  <figcaption>示例:Hello World程序</figcaption>
  <pre><code>console.log("Hello, World!");</code></pre>
</figure>

<!-- 引用 -->
<figure>
  <blockquote>
    <p>任何足够先进的技术,都与魔法无异。</p>
  </blockquote>
  <figcaption>—— 亚瑟·克拉克,<cite>未来的轮廓</cite></figcaption>
</figure>
```

**mark 高亮**
`<mark>[文本]</mark>`
```html
<!-- 搜索结果高亮 -->
<p>搜索结果中 <mark>HTML5</mark> 语义化标签的使用...</p>
```

**abbr 缩写**
`<abbr title="<全称>">[缩写]</abbr>`
```html
<abbr title="HyperText Markup Language">HTML</abbr> 是Web的基础。
```

**cite 引用标题**
`<cite>[作品名]</cite>`
```html
参考书目:<cite>JavaScript高级程序设计</cite>
```

**dfn 定义术语**
`<dfn>[术语]</dfn>`
```html
<dfn>语义化</dfn>是指使用具有明确含义的标签来描述内容。
```

**address 联系方式**
`<address>...</address>`
```html
<address>
  作者:<a href="mailto:author@example.com">张三</a><br />
  地址:北京市朝阳区xxx
</address>
```

---

## 可折叠内容

**details 与 summary**
`<details [open]><summary>[标题]</summary>[内容]</details>`
```html
<!-- 默认折叠 -->
<details>
  <summary>常见问题:如何重置密码?</summary>
  <p>请访问登录页面,点击"忘记密码"链接。</p>
</details>

<!-- 默认展开 -->
<details open>
  <summary>使用说明</summary>
  <p>这是默认展开的说明内容。</p>
</details>
```

---

## 搜索区域(HTML 2023)

**search 元素**
`<search>...[form|input]...</search>`
```html
<!-- 站点搜索 -->
<search>
  <form action="/search" role="search">
    <label for="q">搜索</label>
    <input type="search" id="q" name="q" placeholder="搜索内容..." />
    <button type="submit">搜索</button>
  </form>
</search>
```

---

## 对话框(HTML 2021)

**dialog 元素**
`<dialog [open]>[内容]</dialog>`
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
  dialog.showModal();
  dialog.close('cancel');
</script>
```

---

## 微数据增强语义

**itemscope 与 itemtype**
`<article itemscope itemtype="<Schema类型>">...[itemprop]...</article>`
```html
<article itemscope itemtype="https://schema.org/NewsArticle">
  <h2 itemprop="headline">重大新闻标题</h2>
  <meta itemprop="datePublished" content="2026-06-13" />
  <p itemprop="articleBody">新闻内容...</p>
</article>
```

---

## ARIA 增强可访问性

**常用 ARIA 属性**

| 属性              | 作用                |
| ----------------- | ------------------- |
| `aria-label`      | 元素的文本标签      |
| `aria-labelledby` | 引用其他元素作为标签 |
| `aria-current`    | 当前项(page/step等) |
| `aria-expanded`   | 展开/折叠状态       |
| `aria-hidden`     | 对辅助技术隐藏      |
| `role`            | 元素的角色          |

```html
<nav aria-label="主导航">
  <a href="/" aria-current="page">首页</a>
</nav>

<button aria-expanded="false" aria-controls="menu">菜单</button>
<ul id="menu" aria-hidden="true">...</ul>
```
