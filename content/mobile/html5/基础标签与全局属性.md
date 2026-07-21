# 基础标签与全局属性 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数

---

## 标题标签

**六级标题**
`<h1>...</h1>` | `<h2>...</h2>` | `<h3>...</h3>` | `<h4>...</h4>` | `<h5>...</h5>` | `<h6>...</h6>`
```html
<!-- 标题层级递减,每页建议仅一个 h1 -->
<h1>网站主标题</h1>
<h2>章节标题</h2>
<h3>子章节标题</h3>
<h4>子子章节标题</h4>
```

| 标签   | 语义               |
| ------ | ------------------ |
| `<h1>` | 一级标题,页面主标题 |
| `<h2>` | 二级标题,章节标题   |
| `<h3>` | 三级标题,子章节     |
| `<h4>` | 四级标题            |
| `<h5>` | 五级标题            |
| `<h6>` | 六级标题            |

---

## 段落与行内容器

**段落标签**
`<p>[内容]</p>`
```html
<!-- 段落自动添加上下空白 -->
<p>这是一个段落。段落是网页中最基本的文本单位。</p>
<p>这是另一个段落。</p>
```

**行内文本容器**
`<span>[内容]</span>`
```html
<!-- 用于对局部文本应用样式 -->
<p>这是一段文本,其中 <span style="color: red;">红色部分</span> 被标记。</p>
```

---

## 文本语义标签

**强调与标记标签**

| 标签        | 描述       | 语义             |
| ----------- | ---------- | ---------------- |
| `<strong>`  | 加粗       | 重要内容         |
| `<em>`      | 倾斜       | 强调内容         |
| `<mark>`    | 标记       | 突出显示         |
| `<small>`   | 小号字体   | 辅助性内容       |
| `<del>`     | 删除线     | 已删除内容       |
| `<ins>`     | 下划线     | 已插入内容       |
| `<sub>`     | 下标       | 下标文本         |
| `<sup>`     | 上标       | 上标文本         |
| `<abbr>`    | 缩写       | 带标题的缩写     |
| `<cite>`    | 引用标题   | 作品标题         |
| `<dfn>`     | 定义术语   | 术语定义         |
| `<address>` | 联系方式   | 作者/联系方式    |
| `<time>`    | 时间       | 机器可读时间     |

```html
<!-- 文本语义综合示例 -->
<p>这是 <strong>重要内容</strong>,这是 <em>强调内容</em>。</p>
<p>这是 <mark>突出显示</mark> 的内容。</p>
<p>这是 <del>已删除</del> 的内容,这是 <ins>已插入</ins> 的内容。</p>
<p>水的化学式是 H<sub>2</sub>O,2 的平方是 2<sup>2</sup>。</p>
<p><abbr title="HyperText Markup Language">HTML</abbr> 是 Web 的基础。</p>
```

---

## 换行与分割线

**换行与水平线**
`<br>` | `<hr>`
```html
<!-- br 强制换行,hr 主题分割 -->
<p>这是第一行<br />这是第二行</p>
<hr />
<p>这是分割线下面的内容</p>
```

---

## 列表标签

**无序列表**
`<ul>...<li>[项]</li>...</ul>`
```html
<!-- 默认圆点标记 -->
<ul>
  <li>苹果</li>
  <li>香蕉</li>
  <li>橙子</li>
</ul>
```

**有序列表**
`<ol [start="<起始>"] [reversed] [type="1|A|a|I|i"]>...<li>[项]</li>...</ol>`
```html
<!-- 数字编号列表 -->
<ol>
  <li>准备材料</li>
  <li>混合原料</li>
  <li>加热</li>
</ol>

<!-- 倒序列表 -->
<ol reversed>
  <li>第四步</li>
  <li>第三步</li>
</ol>

<!-- 字母编号列表 -->
<ol type="A">
  <li>选项 A</li>
  <li>选项 B</li>
</ol>
```

**定义列表**
`<dl><dt>[术语]</dt><dd>[描述]</dd>...</dl>`
```html
<!-- 术语-描述成对出现 -->
<dl>
  <dt>HTML</dt>
  <dd>超文本标记语言</dd>
  <dt>CSS</dt>
  <dd>层叠样式表</dd>
</dl>
```

**嵌套列表**
```html
<!-- 列表可多层嵌套 -->
<ul>
  <li>HTML 基础
    <ul>
      <li>标签语法</li>
      <li>语义化标签</li>
    </ul>
  </li>
  <li>CSS 基础
    <ul>
      <li>选择器</li>
      <li>盒模型</li>
    </ul>
  </li>
</ul>
```

---

## 超链接

**锚点链接**
`<a href="<URL>" [target="_self|_blank|_parent|_top"] [rel="<关系>"] [title="<提示>"]>[文本]</a>`
```html
<!-- 外部链接,新窗口打开 -->
<a href="https://www.example.com" target="_blank" rel="noopener">访问示例网站</a>

<!-- 内部页面 -->
<a href="about.html">关于我们</a>

<!-- 页面锚点 -->
<a href="#section1">跳转到第一部分</a>

<!-- 邮件链接 -->
<a href="mailto:info@example.com">发送邮件</a>

<!-- 电话链接 -->
<a href="tel:+1234567890">拨打电话</a>
```

| target 值  | 行为           |
| ---------- | -------------- |
| `_self`    | 当前窗口(默认) |
| `_blank`   | 新窗口         |
| `_parent`  | 父框架         |
| `_top`     | 整个窗口       |

---

## 图像标签

**图像**
`<img src="<URL>" alt="<替代文本>" [width="<宽>"] [height="<高>"] [loading="lazy|eager"] [title="<提示>"] />`
```html
<!-- 基本图像 -->
<img src="images/photo.jpg" alt="美丽的风景" width="400" height="300" />

<!-- 延迟加载 -->
<img src="images/large-image.jpg" alt="大型图像" loading="lazy" />
```

---

## 全局属性

**基础全局属性**

| 属性              | 描述                       | 示例                       |
| ----------------- | -------------------------- | -------------------------- |
| `id`              | 唯一标识符                 | `id="header"`              |
| `class`           | 样式类名(可多个空格分隔)   | `class="container main"`   |
| `style`           | 行内样式                   | `style="color: red;"`      |
| `title`           | 悬停提示文字               | `title="提示"`             |
| `hidden`          | 隐藏元素                   | `hidden`                   |
| `contenteditable` | 内容可编辑                 | `contenteditable="true"`   |
| `spellcheck`      | 拼写检查                   | `spellcheck="true"`        |
| `tabindex`        | Tab 键顺序                 | `tabindex="1"`             |
| `accesskey`       | 快捷键                     | `accesskey="k"`            |
| `dir`             | 文本方向                   | `dir="ltr"` / `dir="rtl"`  |
| `lang`            | 内容语言                   | `lang="zh-CN"`             |
| `translate`       | 是否翻译                   | `translate="no"`           |
| `draggable`       | 是否可拖动                 | `draggable="true"`         |

```html
<!-- id 与 class -->
<div id="header" class="container">
  <h1>网站标题</h1>
</div>

<!-- 行内样式 -->
<p style="color: blue; font-weight: bold;">蓝色粗体文本</p>

<!-- hidden 隐藏 -->
<div hidden>这个元素是隐藏的</div>

<!-- contenteditable 可编辑 -->
<div contenteditable="true">点击此处编辑内容</div>
```

---

## 自定义数据属性

**data-* 数据存储**
`data-<名称>="<值>"`
```html
<!-- 存储产品信息 -->
<div class="product" data-id="123" data-name="iPhone 13" data-price="799">
  <h3>iPhone 13</h3>
</div>

<!-- JavaScript 读取 -->
<script>
  const product = document.querySelector('.product');
  const productId = product.dataset.id;
  const productName = product.dataset.name;
  const productPrice = product.dataset.price;
  console.log(`产品 ID: ${productId}, 名称: ${productName}, 价格: $${productPrice}`);
</script>
```

---

## 语义化结构标签

**页面结构标签**

| 标签           | 描述                  |
| -------------- | --------------------- |
| `<header>`     | 页面或 section 的头部 |
| `<nav>`        | 导航链接区域          |
| `<main>`       | 页面主要内容(唯一)    |
| `<section>`    | 文档中的主题节        |
| `<article>`    | 独立、可复用的内容块  |
| `<aside>`      | 侧边栏或附加内容      |
| `<footer>`     | 页面或 section 的底部 |
| `<figure>`     | 图表、图像等独立单元  |
| `<figcaption>` | figure 的标题         |
| `<search>`     | 搜索区域(HTML 2023)   |
| `<dialog>`     | 对话框(HTML 2021)     |

```html
<!-- 语义化页面结构 -->
<header>
  <h1>网站标题</h1>
  <nav>
    <ul>
      <li><a href="#">首页</a></li>
      <li><a href="#">关于</a></li>
    </ul>
  </nav>
</header>
<main>
  <article>
    <h2>文章标题</h2>
    <p>文章内容...</p>
  </article>
  <aside>
    <h3>侧边栏</h3>
  </aside>
</main>
<footer>
  <p>&copy; 2026 网站名称</p>
</footer>
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

## 弹出对话框(HTML 2021+)

**dialog 元素**
`<dialog [open]>[内容]</dialog>`
```html
<!-- 模态对话框 -->
<dialog id="myDialog">
  <form method="dialog">
    <p>请确认操作</p>
    <button>取消</button>
    <button value="confirm">确认</button>
  </form>
</dialog>

<script>
  const dialog = document.getElementById('myDialog');
  dialog.showModal(); // 显示模态
  dialog.close();     // 关闭
</script>
```

---

## Popover 弹出层(HTML 2024+)

**popover 属性**
`<div popover [="auto|manual"]>[内容]</div>`
```html
<!-- 声明式弹出层 -->
<button popovertarget="my-popover">打开弹出层</button>

<div id="my-popover" popover>
  <p>这是一个弹出层内容</p>
  <button popovertarget="my-popover" popovertargetaction="hide">关闭</button>
</div>
```
