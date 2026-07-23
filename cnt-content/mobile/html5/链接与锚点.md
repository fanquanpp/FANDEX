# 链接与锚点 语法速查手册

> **符号约定**:`< >` 必填参数 | `[ ]` 可选参数

---

## 超链接基础

**a 锚点元素**
`<a href="<URL>" [target="<目标>"] [rel="<关系>"] [download[="<文件名>"]] [type="<MIME>"]>[文本]</a>`
```html
<!-- 外部网站 -->
<a href="https://example.com">访问示例网站</a>

<!-- 邮件链接(带主题) -->
<a href="mailto:contact@example.com?subject=Hello">发送邮件</a>

<!-- 电话链接 -->
<a href="tel:+861012345678">拨打电话</a>

<!-- 短信链接 -->
<a href="sms:+861012345678?body=你好">发送短信</a>

<!-- 下载文件 -->
<a href="document.pdf" download="自定义文件名.pdf">下载文件</a>
```

| href 协议 | 用途         | 示例                              |
| --------- | ------------ | --------------------------------- |
| `http(s)` | 网页         | `https://example.com`             |
| `mailto`  | 邮件         | `mailto:user@example.com`         |
| `tel`     | 电话         | `tel:+861012345678`               |
| `sms`     | 短信         | `sms:+861012345678`               |
| `#`       | 锚点         | `#section1`                       |
| `javascript` | 脚本(不推荐) | `javascript:void(0)`           |

---

## target 属性

**链接打开方式**

| 值        | 行为                 |
| --------- | -------------------- |
| `_self`   | 当前窗口打开(默认)   |
| `_blank`  | 新窗口/标签页打开    |
| `_parent` | 父框架中打开         |
| `_top`    | 顶层窗口中打开       |
| `<名称>`  | 指定名称的窗口/框架  |

```html
<!-- 新窗口打开(安全写法) -->
<a href="https://example.com" target="_blank" rel="noopener noreferrer">外部链接</a>
```

> 安全提示:使用 `target="_blank"` 时务必添加 `rel="noopener noreferrer"`,防止新窗口通过 `window.opener` 操纵原窗口。

---

## rel 属性

**链接关系**

| rel 值        | 作用                              |
| ------------- | --------------------------------- |
| `noopener`    | 新窗口无法访问 window.opener      |
| `noreferrer`  | 不发送 Referer 头                 |
| `nofollow`    | 搜索引擎不传递权重                |
| `ugc`         | 用户生成内容                      |
| `sponsored`   | 付费链接                          |
| `bookmark`    | 永久书签                          |
| `next`        | 下一页                            |
| `prev`        | 上一页                            |
| `canonical`   | 规范化 URL                        |
| `alternate`   | 替代版本(如 RSS、其他语言)        |
| `license`     | 版权信息                          |
| `help`        | 帮助文档                          |

```html
<!-- 综合示例 -->
<a rel="noopener noreferrer">无 opener 不发送 Referer</a>
<a rel="nofollow">不传递权重</a>
<a rel="ugc">用户生成内容</a>
<a rel="sponsored">广告链接</a>
```

---

## 锚点与页面内导航

**页面内跳转**
`<a href="#<ID>">[文本]</a>` + `<[元素] id="<ID>">`
```html
<!-- 跳转到指定 ID -->
<h2 id="section1">第一节</h2>
<a href="#section1">跳转到第一节</a>

<!-- 跳回顶部 -->
<a href="#">回到顶部</a>

<!-- 跨页面锚点 -->
<a href="page.html#section1">跳到其他页面的第一节</a>
```

**平滑滚动**
```css
html {
  scroll-behavior: smooth;
}

/* 锚点偏移(避免被固定头部遮挡) */
[id] {
  scroll-margin-top: 80px;
}
```

**JavaScript 滚动**
```javascript
// 平滑滚动到元素
document.getElementById('section1').scrollIntoView({
  behavior: 'smooth',
  block: 'start'
});

// 滚动到顶部
window.scrollTo({ top: 0, behavior: 'smooth' });
```

---

## 路径系统

**绝对路径**
```html
<!-- 完整 URL -->
<a href="https://example.com/page.html">完整 URL</a>

<!-- 根目录开始 -->
<a href="/about/index.html">根目录开始</a>
```

**相对路径**
```html
<!-- 同目录 -->
<a href="page.html">同目录</a>

<!-- 子目录 -->
<a href="sub/page.html">子目录</a>

<!-- 父目录 -->
<a href="../page.html">父目录</a>

<!-- 上两级 -->
<a href="../../page.html">上两级</a>
```

| 路径         | 含义               |
| ------------ | ------------------ |
| `/path`      | 根目录绝对路径     |
| `./page`     | 当前目录(可省略)   |
| `../page`    | 上级目录           |
| `page.html`  | 相对当前页面       |
| `//host/path`| 协议相对路径       |

---

## 链接可访问性

**描述性链接文本**
```html
<!-- 正确:描述性文本 -->
<a href="report.pdf">查看2026年度报告</a>

<!-- 错误:无意义文本 -->
<a href="report.pdf">点击这里</a>
```

**跳过导航链接**
```html
<!-- 键盘用户跳过重复导航 -->
<body>
  <a href="#main-content" class="skip-link">跳到主要内容</a>
  <header>...</header>
  <main id="main-content">...</main>
</body>

<style>
  .skip-link {
    position: absolute;
    left: -9999px;
  }
  .skip-link:focus {
    left: 0;
    top: 0;
    background: #fff;
    padding: 1rem;
  }
</style>
```

---

## 链接状态 CSS

**链接伪类**
```css
a:link    { color: blue; }       /* 未访问 */
a:visited { color: purple; }     /* 已访问 */
a:hover   { color: red; }        /* 悬停 */
a:focus   { outline: 2px solid; } /* 聚焦 */
a:active  { color: orange; }     /* 点击时 */
```

---

## Ping 追踪

**ping 属性**
`<a href="<URL>" ping="<追踪URL>">[文本]</a>`
```html
<!-- 浏览器会向 ping 指定的 URL 发送 POST 请求 -->
<a href="https://example.com" ping="https://track.example.com/click">链接</a>
```
