---
order: 60
title: 元数据与字符编码
module: 'html5'
category: 前端技术
difficulty: beginner
description: meta、title、link、UTF-8
author: fanquanpp
updated: '2026-09-12'
related:
  - 'html5/040-DocTypeDeclaration'
  - 'html5/240-HTML5OfflineStorageWebAPI'
  - 'html5/110-TextSemantic'
  - 'html5/120-List'
prerequisites:
  - 'html5/020-HTML5OverviewCoreFeature'
---

## 1. 元数据概述

元数据（Metadata）是"关于数据的数据"，在 HTML 中通过 `<head>` 内的元素描述文档的属性、行为和关系。

```html
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="页面描述" />
  <title>页面标题</title>
  <link rel="stylesheet" href="styles.css" />
</head>
```

### 1.1 元数据分类

| 类别     | 元素                | 作用                     |
| -------- | ------------------- | ------------------------ |
| 字符编码 | `<meta charset>`    | 声明文档编码             |
| 视口配置 | `<meta viewport>`   | 移动端适配               |
| SEO 相关 | `<meta name>`       | 描述、关键词、机器人指令 |
| 社交分享 | `<meta property>`   | Open Graph、Twitter Card |
| 安全策略 | `<meta http-equiv>` | CSP、CORS                |
| 资源关系 | `<link>`            | 样式表、图标、预加载     |

## 2. meta 元素详解

### 2.1 字符编码声明

```html
<meta charset="UTF-8" />
```

**关键规则**：编码声明必须在文档前 1024 字节内；必须在 `<title>` 之前声明，防止 XSS 攻击；推荐始终使用 UTF-8。

### 2.2 SEO 元数据

```html
<meta name="description" content="深入讲解 HTML5 元数据与字符编码" />
<meta name="robots" content="index, follow" />
<meta name="author" content="fanquanpp" />
```

### 2.3 Open Graph 与社交分享

```html
<meta property="og:title" content="页面标题" />
<meta property="og:description" content="页面描述" />
<meta property="og:image" content="https://example.com/image.jpg" />
<meta name="twitter:card" content="summary_large_image" />
```

### 2.4 安全相关元数据

```html
<meta http-equiv="Content-Security-Policy" content="default-src 'self'" />
<meta name="referrer" content="strict-origin-when-cross-origin" />
```

## 3. UTF-8 字符编码

### 3.1 UTF-8 编码原理

UTF-8 是一种变长编码，使用 1-4 个字节表示 Unicode 码点：

| 码点范围           | 字节数 | 编码格式                              |
| ------------------ | ------ | ------------------------------------- |
| U+0000 ~ U+007F    | 1      | `0xxxxxxx`                            |
| U+0080 ~ U+07FF    | 2      | `110xxxxx 10xxxxxx`                   |
| U+0800 ~ U+FFFF    | 3      | `1110xxxx 10xxxxxx 10xxxxxx`          |
| U+10000 ~ U+10FFFF | 4      | `11110xxx 10xxxxxx 10xxxxxx 10xxxxxx` |

中文字符"中"（U+4E2D）的 UTF-8 编码：

$$
\text{UTF-8} = \text{0xE4 0xB8 0xAD}
$$

### 3.2 编码声明优先级

BOM > HTTP Content-Type 头 > meta charset 声明

## 4. link 元素

```html
<link rel="stylesheet" href="styles.css" />
<link rel="icon" type="image/png" href="/favicon.png" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preload" href="font.woff2" as="font" crossorigin />
<link rel="canonical" href="https://example.com/page" />
```
## head 容器

**文档头部容器**
`<head>...[meta|title|link|style|script]...</head>`
```html
<!-- 文档头部基础结构 -->
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="页面描述" />
  <title>页面标题</title>
  <link rel="stylesheet" href="styles.css" />
</head>
```

| 类别     | 元素                | 作用                     |
| -------- | ------------------- | ------------------------ |
| 字符编码 | `<meta charset>`    | 声明文档编码             |
| 视口配置 | `<meta viewport>`   | 移动端适配               |
| SEO 相关 | `<meta name>`       | 描述、关键词、机器人指令 |
| 社交分享 | `<meta property>`   | Open Graph、Twitter Card |
| 安全策略 | `<meta http-equiv>` | CSP、CORS                |
| 资源关系 | `<link>`            | 样式表、图标、预加载     |

---

## meta 元素

**字符编码声明**
`<meta charset="<编码>" />`
```html
<!-- 必须在文档前 1024 字节内,title 之前 -->
<meta charset="UTF-8" />
```

**SEO 元数据**
`<meta name="<名称>" content="<内容>" />`
```html
<!-- 页面描述 -->
<meta name="description" content="深入讲解 HTML5 元数据与字符编码" />

<!-- 搜索引擎指令 -->
<meta name="robots" content="index, follow" />

<!-- 作者 -->
<meta name="author" content="fanquanpp" />

<!-- 关键词 -->
<meta name="keywords" content="HTML5,meta,字符编码" />
```

**Open Graph 社交分享**
`<meta property="og:<属性>" content="<值>" />`
```html
<!-- Facebook / 微博等社交平台分享 -->
<meta property="og:title" content="页面标题" />
<meta property="og:description" content="页面描述" />
<meta property="og:image" content="https://example.com/image.jpg" />
<meta property="og:url" content="https://example.com/page" />

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="页面标题" />
```

**安全相关元数据**
`<meta http-equiv="<HTTP头>" content="<值>" />`
```html
<!-- 内容安全策略 -->
<meta http-equiv="Content-Security-Policy" content="default-src 'self'" />

<!-- Referrer 策略 -->
<meta name="referrer" content="strict-origin-when-cross-origin" />

<!-- X-UA-Compatible -->
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
```

---

## viewport 视口配置

**移动端视口**
`<meta name="viewport" content="<键>=<值>, <键>=<值>" />`
```html
<!-- 标准移动端配置 -->
<meta name="viewport" content="width=device-width, initial-scale=1.0" />

<!-- 禁止用户缩放(不推荐,影响可访问性) -->
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />

<!-- 适配刘海屏 -->
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
```

| 属性            | 值                 | 说明             |
| --------------- | ------------------ | ---------------- |
| `width`         | device-width / 数值 | 布局视口宽度     |
| `height`        | device-height / 数值 | 布局视口高度     |
| `initial-scale` | 0.1 ~ 10.0         | 初始缩放比例     |
| `minimum-scale` | 0.1 ~ 10.0         | 最小缩放比例     |
| `maximum-scale` | 0.1 ~ 10.0         | 最大缩放比例     |
| `user-scalable` | yes / no           | 是否允许用户缩放 |
| `viewport-fit`  | auto / contain / cover | 适配刘海屏     |

---

## title 元素

**文档标题**
`<title>[标题文本]</title>`
```html
<!-- 浏览器标签页标题,SEO 重要字段 -->
<title>页面标题 - 网站名称</title>
```

---

## link 元素

**资源关系**
`<link rel="<关系>" [type="<MIME>"] [href="<URL>"] [media="<媒体查询>"] />`
```html
<!-- 样式表 -->
<link rel="stylesheet" href="styles.css" />

<!-- 网站图标 -->
<link rel="icon" type="image/png" href="/favicon.png" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />

<!-- 预连接(加速第三方资源) -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="dns-prefetch" href="https://fonts.googleapis.com" />

<!-- 预加载关键资源 -->
<link rel="preload" href="font.woff2" as="font" crossorigin />
<link rel="preload" href="hero.jpg" as="image" />

<!-- 规范化 URL -->
<link rel="canonical" href="https://example.com/page" />

<!-- 替代语言版本 -->
<link rel="alternate" hreflang="en" href="https://example.com/en/page" />
<link rel="alternate" hreflang="zh-CN" href="https://example.com/zh/page" />

<!-- manifest(PWA) -->
<link rel="manifest" href="/manifest.json" />
```

| rel 值          | 作用              |
| --------------- | ----------------- |
| `stylesheet`    | 样式表            |
| `icon`          | 网站图标          |
| `preconnect`    | 预连接域名        |
| `dns-prefetch`  | DNS 预解析        |
| `preload`       | 预加载资源        |
| `prefetch`      | 预获取下一页资源  |
| `canonical`     | 规范化 URL        |
| `alternate`     | 替代版本          |
| `manifest`      | PWA manifest      |

---

## style 与 script

**内联样式**
`<style [type="text/css"] [media="<媒体查询>"]>[CSS]</style>`
```html
<style>
  body { font-family: Arial, sans-serif; }
</style>
```

**脚本引入**
`<script src="<URL>" [type="<类型>"] [defer] [async] [crossorigin]></script>`
```html
<!-- 外部脚本,defer 等文档解析完后执行 -->
<script src="app.js" defer></script>

<!-- 异步加载 -->
<script src="analytics.js" async></script>

<!-- 模块脚本 -->
<script type="module" src="app.mjs"></script>

<!-- 内联脚本 -->
<script>
  console.log('页面加载完成');
</script>
```

| 属性     | 作用                              |
| -------- | --------------------------------- |
| `defer`  | 延迟执行(按顺序,DOMContentLoaded 前) |
| `async`  | 异步执行(下载完即执行,不保证顺序)  |
| `type="module"` | ES 模块                  |
| `crossorigin`   | 跨域脚本                |

---

## base 元素

**基准 URL**
`<base href="<URL>" [target="<目标>"] />`
```html
<!-- 文档内所有相对 URL 的基准 -->
<base href="https://www.example.com/" target="_blank" />
```

---

## UTF-8 字符编码

**UTF-8 编码原理**

| 码点范围           | 字节数 | 编码格式                              |
| ------------------ | ------ | ------------------------------------- |
| U+0000 ~ U+007F    | 1      | `0xxxxxxx`                            |
| U+0080 ~ U+07FF    | 2      | `110xxxxx 10xxxxxx`                   |
| U+0800 ~ U+FFFF    | 3      | `1110xxxx 10xxxxxx 10xxxxxx`          |
| U+10000 ~ U+10FFFF | 4      | `11110xxx 10xxxxxx 10xxxxxx 10xxxxxx` |

**编码声明优先级**
`BOM > HTTP Content-Type 头 > meta charset 声明`

**JavaScript 检测编码**
```javascript
// 获取文档字符编码
console.log(document.characterSet); // 'UTF-8'
console.log(document.inputEncoding);
```

## 动手试试

### 入门版（必做）

1. 新建 `encoding.html`，写入中文内容并声明 `<meta charset="UTF-8">`，用浏览器打开确认显示正常；
2. 删除 `<meta charset>` 行，刷新页面，观察中文是否变成乱码；
3. 把 `charset` 改成 `GBK`（同时把文件另存为 GBK 编码），观察浏览器如何表现。

### 进阶版（选做）

1. 在页面里补全 `description`、`og:title`、`og:image`，分享到社交平台查看卡片效果；
2. 用浏览器开发者工具的网络面板查看响应头里的 `Content-Type: text/html; charset=utf-8`；
3. 尝试配置一个简单的 CSP（只允许同源脚本），观察外部脚本被拦截。

## 核心知识点

> 一句话记住元数据：`charset` 放最前防乱码，`title` 命名页面，`description` 写摘要，`viewport` 管移动端，`link` 引资源。

- 元数据放在 `<head>` 中，是给浏览器、搜索引擎和社交平台看的说明；
- `<meta charset="UTF-8">` 必须位于文档前 1024 字节内，且先于 `<title>`；
- UTF-8 是 1-4 字节的变长编码，兼容 ASCII，是 Web 的默认编码；
- 编码优先级：BOM > HTTP 响应头 > meta 声明；
- `description`/`robots` 服务 SEO，Open Graph 服务社交分享，CSP 服务安全；
- `<link>` 负责样式、图标、预连接、预加载与规范地址。

## 注意事项与改进建议

| 问题点 | 说明 | 改进方案 |
| --- | --- | --- |
| charset 声明靠后 | 浏览器先用默认编码解析导致乱码 | 放在 `<head>` 第一行 |
| 编辑器与声明不一致 | 文件是 UTF-8 却声明 GBK（或反之） | 统一编辑器保存编码为 UTF-8 |
| 依赖 `keywords` | 搜索引擎已忽略该标签 | 用 `description` 与真实内容做 SEO |
| CSP 过于严格 | 误伤第三方脚本、字体、图片 | 先用 `Content-Security-Policy-Report-Only` 试运行 |
| 滥用 `preload` | 预加载过多资源抢占带宽 | 只预加载首屏关键资源 |
| 多个 `<base>` | 只有第一个生效，链接基准混乱 | 全页只保留一个或不用 |

## 扩展学习

- 字符集：`javascript/130-UnicodePropertyEscape` 了解 Unicode 属性转义；
- 性能：`html5/380-CriticalRenderingPathAndResourceLoading` 中资源加载策略；
- 安全：`javascript/480-ErrorBoundaryGlobalErrorCatch` 与 CSP 的配合；
- SEO：`css/660-HTMLSemanticSEO` 全面理解语义化与元数据的组合；
- 移动端：`html5/360-ViewportConfigMobileFirst` 深入 viewport 配置。
