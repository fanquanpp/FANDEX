# HTML5 全局属性与文档结构 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数 | `{ }` 分组 | `|` 或 | `...` 重复

---

## HTML5 文档基本结构

**最小 HTML5 文档**
`<!DOCTYPE html> <html lang="..."> <head>...</head> <body>...</body> </html>`

```html
<!DOCTYPE html>
<!-- HTML5 文档类型声明 -->
<html lang="zh-CN">
  <!-- lang 属性指定文档语言 -->
  <head>
    <meta charset="UTF-8" />
    <!-- 字符编码声明 -->
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <!-- 移动端视口配置 -->
    <title>页面标题</title>
    <!-- 文档标题(必填) -->
  </head>
  <body>
    <!-- 页面内容 -->
  </body>
</html>
```

**head 头部元数据元素**

| 元素                    | 作用                           | 示例                                                |
| ----------------------- | ------------------------------ | --------------------------------------------------- |
| `<title>`               | 文档标题(必填)               | `<title>页面标题</title>`                           |
| `<meta charset>`        | 字符编码                       | `<meta charset="UTF-8" />`                          |
| `<meta name="viewport">`| 移动端视口                     | `<meta name="viewport" content="width=device-width, initial-scale=1.0">` |
| `<meta name="description">` | 页面描述(SEO)            | `<meta name="description" content="页面描述">`      |
| `<meta name="keywords">`    | 关键词(SEO,已废弃)       | `<meta name="keywords" content="HTML5, CSS3">`      |
| `<meta name="author">`      | 作者                       | `<meta name="author" content="张三">`               |
| `<meta http-equiv="refresh">` | 自动刷新                  | `<meta http-equiv="refresh" content="30">`          |
| `<link rel="stylesheet">`   | 外部样式表                 | `<link rel="stylesheet" href="style.css">`          |
| `<link rel="icon">`         | 网站图标                   | `<link rel="icon" href="favicon.ico">`              |
| `<link rel="canonical">`    | 规范链接(SEO)            | `<link rel="canonical" href="https://...">`         |
| `<link rel="preconnect">`   | 预连接                    | `<link rel="preconnect" href="https://cdn.example.com">` |
| `<link rel="preload">`      | 预加载                    | `<link rel="preload" href="font.woff2" as="font">`  |
| `<script>`                  | 脚本                      | `<script src="app.js" defer></script>`              |
| `<style>`                   | 内联样式                  | `<style>body{margin:0}</style>`                     |
| `<base>`                    | 基准 URL                  | `<base href="https://example.com/" target="_blank">`|

---

## 语义化文档结构

**完整文档骨架**

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>语义化页面结构</title>
  </head>
  <body>
    <header><!-- 页面头部 --></header>
    <nav><!-- 导航 --></nav>
    <main>
      <article><!-- 独立内容 --></article>
      <section><!-- 区块 --></section>
      <aside><!-- 侧边栏 --></aside>
    </main>
    <footer><!-- 页脚 --></footer>
  </body>
</html>
```

**语义化结构元素表**

| 元素          | 作用                  | 使用场景                  |
| ------------- | --------------------- | ------------------------- |
| `<header>`    | 页面或区块的头部      | 网站标题、Logo、导航栏    |
| `<nav>`       | 导航链接区域          | 主导航、面包屑导航        |
| `<main>`      | 主要内容(每页唯一)   | 唯一的主要内容区域        |
| `<article>`   | 独立完整的内容        | 文章、新闻、评论、产品卡  |
| `<section>`   | 主题相关的内容区块    | 章节、章节分组            |
| `<aside>`     | 侧边栏或附属信息      | 相关链接、广告、引用      |
| `<footer>`    | 页面或区块的底部      | 版权信息、联系方式        |
| `<figure>`    | 独立的媒体内容        | 图片、图表、代码块        |
| `<figcaption>`| figure 的标题         | 图片说明、图表标题        |
| `<details>`   | 可折叠的详细信息      | FAQ、技术详情             |
| `<summary>`   | details 的标题        | 折叠区域的标题            |
| `<dialog>`    | 对话框/模态框         | 模态对话框                |
| `<search>`    | 搜索区域(HTML Living Standard) | 站点搜索表单    |

---

## HTML5 全局属性

**核心全局属性表**

| 属性            | 作用                          | 示例                              |
| --------------- | ----------------------------- | --------------------------------- |
| `id`            | 元素唯一标识                  | `<div id="header">`               |
| `class`         | 类名(可多个,空格分隔)      | `<div class="box active">`        |
| `style`         | 内联样式                      | `<div style="color:red">`         |
| `title`         | 鼠标悬停提示                  | `<a title="点击查看详情">`        |
| `lang`          | 元素内容语言                  | `<p lang="en">Hello</p>`          |
| `dir`           | 文本方向                      | `<p dir="rtl">...</p>` (ltr/rtl/auto) |
| `tabindex`      | Tab 键焦点顺序                | `<div tabindex="0">`              |
| `accesskey`     | 快捷键                        | `<button accesskey="s">`          |
| `hidden`        | 隐藏元素                     | `<div hidden>...</div>`           |
| `draggable`     | 是否可拖拽                    | `<div draggable="true">`          |
| `spellcheck`    | 拼写检查                      | `<input spellcheck="true">`       |
| `translate`     | 是否翻译                     | `<p translate="no">Brand</p>`     |
| `contenteditable`| 内容可编辑                  | `<div contenteditable="true">`    |
| `contextmenu`   | 上下文菜单(已废弃)         | -                                 |
| `tabindex`      | 焦点顺序                     | `<div tabindex="0">`              |

**data-* 自定义数据属性**
`data-<name>="<value>"`

```html
<!-- 存储自定义数据(详见"自定义数据属性"章节) -->
<div data-user-id="123" data-role="admin">用户信息</div>
```

---

## ARIA 无障碍属性

**常用 ARIA 属性(详见"无障碍访问"章节)**

```html
<!-- 主要 ARIA 属性 -->
<div
  role="button"
  aria-label="关闭"
  aria-hidden="false"
  aria-disabled="false"
  aria-expanded="true"
  aria-controls="menu"
  aria-live="polite"
  aria-current="page"
>
  ...
</div>
```

---

## 事件处理属性

**HTML 事件属性表**

| 事件属性          | 触发时机              | 应用元素              |
| ----------------- | --------------------- | --------------------- |
| `onclick`         | 点击                  | 几乎所有元素          |
| `ondblclick`      | 双击                  | 几乎所有元素          |
| `onmousedown`     | 鼠标按下              | 几乎所有元素          |
| `onmouseup`       | 鼠标释放              | 几乎所有元素          |
| `onmouseover`     | 鼠标移入              | 几乎所有元素          |
| `onmouseout`      | 鼠标移出              | 几乎所有元素          |
| `onmousemove`     | 鼠标移动              | 几乎所有元素          |
| `onkeydown`       | 键盘按下              | 表单元素、可聚焦元素  |
| `onkeyup`         | 键盘释放              | 表单元素、可聚焦元素  |
| `onkeypress`      | 键盘按住(已废弃)    | 表单元素、可聚焦元素  |
| `onfocus`         | 获得焦点              | 表单元素、可聚焦元素  |
| `onblur`          | 失去焦点              | 表单元素、可聚焦元素  |
| `onchange`        | 值改变并失焦          | input、select、textarea |
| `oninput`         | 值改变(实时)        | input、textarea       |
| `onsubmit`        | 表单提交              | `<form>`              |
| `onreset`         | 表单重置              | `<form>`              |
| `onload`          | 加载完成              | `<body>`、`<img>`、`<iframe>` |
| `onunload`        | 卸载(已废弃)        | `<body>`              |
| `onresize`        | 窗口大小改变          | `<body>`              |
| `onscroll`        | 滚动                  | 可滚动元素            |
| `oncontextmenu`   | 右键菜单              | 几乎所有元素          |
| `ondrag`          | 拖拽中                | 可拖拽元素            |
| `ondrop`          | 放置                  | 放置目标              |
| `oncopy`          | 复制                  | 可选中文本元素        |
| `onpaste`         | 粘贴                  | 表单元素              |

---

## 字符编码与 viewport

**字符编码声明**
`<meta charset="<encoding>">`

```html
<!-- UTF-8 是 HTML5 推荐编码,必须放在 <head> 的最前面 -->
<meta charset="UTF-8" />

<!-- 其他常用编码 -->
<meta charset="UTF-16" />
<meta charset="ISO-8859-1" />
```

**viewport 视口配置(移动端必填)**
`<meta name="viewport" content="<key>=<value>, <key>=<value>, ...">`

```html
<!-- 标准移动端视口配置 -->
<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=5.0, user-scalable=yes"
/>
```

**viewport 属性表**

| 属性                | 作用                          | 示例值              |
| ------------------- | ----------------------------- | ------------------- |
| `width`             | 视口宽度                      | `device-width` 或数字 |
| `height`            | 视口高度                      | `device-height` 或数字 |
| `initial-scale`     | 初始缩放比例                  | `1.0`               |
| `minimum-scale`     | 最小缩放比例                  | `1.0`               |
| `maximum-scale`     | 最大缩放比例                  | `5.0`               |
| `user-scalable`     | 是否允许用户缩放              | `yes` 或 `no`       |
| `viewport-fit`      | 视口形状(刘海屏适配)        | `auto` / `contain` / `cover` |

---

## 资源预加载

**link rel 预加载类型**
`<link rel="<type>" href="<url>" as="<resource-type>">`

```html
<!-- 预连接(提前建立连接) -->
<link rel="preconnect" href="https://cdn.example.com" crossorigin />

<!-- DNS 预解析 -->
<link rel="dns-prefetch" href="//cdn.example.com" />

<!-- 预加载关键资源 -->
<link rel="preload" href="font.woff2" as="font" type="font/woff2" crossorigin />
<link rel="preload" href="critical.css" as="style" />
<link rel="preload" href="hero.jpg" as="image" />

<!-- 预获取(空闲时获取) -->
<link rel="prefetch" href="next-page.html" />

<!-- 预渲染(已废弃,改用 prefetch) -->
<link rel="prerender" href="next-page.html" />
```

**as 属性值表**

| 值              | 资源类型         |
| --------------- | ---------------- |
| `audio`         | 音频文件         |
| `document`      | HTML 文档        |
| `embed`         | 嵌入资源         |
| `fetch`         | fetch/XHR 请求   |
| `font`          | 字体文件         |
| `image`         | 图片             |
| `object`        | 插件资源         |
| `script`        | JavaScript       |
| `style`         | CSS 样式表       |
| `track`         | WebVTT 文件      |
| `video`         | 视频文件         |
| `worker`        | Web Worker       |

---

## script 标签属性

**script 加载策略**
`<script src="..." defer | async></script>`

```html
<!-- 普通加载:阻塞 HTML 解析,立即下载执行 -->
<script src="script.js"></script>

<!-- async:异步下载,下载完立即执行(不保证顺序) -->
<script src="analytics.js" async></script>

<!-- defer:异步下载,HTML 解析完成后按顺序执行 -->
<script src="app.js" defer></script>

<!-- 内联模块(默认 defer) -->
<script type="module">
  import { greet } from './utils.js';
  greet();
</script>

<!-- 指定 MIME 类型 -->
<script type="text/javascript" src="script.js"></script>
<script type="module" src="app.js"></script>
<script type="application/json">{"key":"value"}</script>
```

**async vs defer 对比**

| 属性     | 下载     | 执行时机                  | 执行顺序      | 适用场景            |
| -------- | -------- | ------------------------- | ------------- | ------------------- |
| 无       | 阻塞     | 下载完立即执行            | 源顺序        | 关键脚本            |
| `async`  | 不阻塞   | 下载完立即执行            | 不保证顺序    | 独立第三方脚本      |
| `defer`  | 不阻塞   | HTML 解析完成后执行       | 源顺序        | 依赖 DOM 的脚本     |

---

## HTML5 新增特性元素

**HTML Living Standard 2025 新增**

```html
<!-- <dialog> 原生对话框元素 -->
<dialog id="modal">
  <form method="dialog">
    <p>确认操作?</p>
    <button>取消</button>
    <button value="confirm">确认</button>
  </form>
</dialog>

<!-- popover 属性(原生弹出层) -->
<button popovertarget="mypopover">打开弹出</button>
<div id="mypopover" popover>
  <p>这是一个弹出层</p>
</div>

<!-- <search> 搜索区域 -->
<search>
  <form action="/search">
    <input type="search" name="q" />
    <button>搜索</button>
  </form>
</search>

<!-- <details> 可折叠区域 -->
<details>
  <summary>更多详情</summary>
  <p>这里是详细内容</p>
</details>

<!-- loading="lazy" 懒加载 -->
<img src="image.jpg" loading="lazy" alt="..." />

<!-- <template> 内容模板 -->
<template id="card-template">
  <div class="card">
    <h3></h3>
    <p></p>
  </div>
</template>
```

---

## 注意事项

- **DOCTYPE 必填**:HTML5 文档必须以 `<!DOCTYPE html>` 开头(不区分大小写)
- **charset 位置**:`<meta charset>` 必须放在 `<head>` 的最前面,前 1024 字节内
- **viewport 必填**:移动端页面必须配置 viewport,否则会以桌面宽度渲染
- **lang 属性**:应为 `<html>` 指定 `lang` 属性,有助于 SEO 和无障碍访问
- **title 必填**:每个页面必须有唯一的 `<title>`,长度建议 30-60 字符
- **语义化优先**:使用语义化标签(header、nav、main)替代无意义 div
- **script 位置**:推荐 `<script defer>` 放在 `<head>` 中,而非 `<body>` 末尾
- **preconnect 跨域**:跨域资源预加载需添加 `crossorigin` 属性
