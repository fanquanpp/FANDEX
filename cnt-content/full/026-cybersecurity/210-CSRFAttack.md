---
order: 210
title: CSRF 攻击
module: 'cybersecurity'
category: 云与基础设施
difficulty: intermediate
description: CSRF 的本体是「浏览器自动附带 Cookie」这个隐式凭证机制：从原理推出攻击形态与五类防御的成立条件，SameSite 三档语义、Token 绑定会话的原因、防御选型决策树，附动手练习与面试题思路。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'cybersecurity/220-CSRFDefense'
  - 'cybersecurity/190-XSSAttack'
  - 'cybersecurity/290-AuthenticationAuthorization'
  - 'cybersecurity/330-SecureCodingPrinciples'
prerequisites:
  - 'cybersecurity/010-SecurityBasicsDefense'
---

## 1. 心智模型：攻击的本体是「隐式凭证」

理解 CSRF 只需要一个事实：**浏览器发送请求时会自动附带目标域的 Cookie，
网页作者拦不住，用户也感知不到**。Cookie 是为了「免登录便利」设计的隐式
凭证，而这份便利对所有页面一视同仁——不管这个页面是银行自己的，还是恶意
站点里一个指向银行的 `<img>`。

于是攻击闭环只有三步：

```text
1. 用户在站点 A 登录，浏览器持有 A 的会话 Cookie
2. 用户被诱导打开恶意站点 B，B 的页面里藏着对 A 的写操作请求
3. 浏览器发请求时自动带上 A 的 Cookie → A 的服务器把 B 发起的请求
   当成用户的合法操作执行
```

由此立刻推出 CSRF 的两个本质特征：它**借用用户的身份**而不是窃取（Cookie
从始至终没离开浏览器，攻击者根本看不到）；它**只能发请求、读不到响应**
（同源策略挡住了读取）。这两个特征决定了防御的所有形态：既然身份是真的，
就要验证「发起者是否为站点自己」；既然读不到响应，Token 放在页面里就是安全的。

与 XSS 的关系对照（面试常考）：

| 对比项     | CSRF                     | XSS                          |
| :--------- | :----------------------- | :--------------------------- |
| 攻击者身份 | 冒用（Cookie 在浏览器里）| 窃用（脚本注入后为所欲为）   |
| 能否读响应 | 不能（同源策略仍生效）   | 能                           |
| 需要脚本   | 不一定（纯 HTML 即可）   | 必须                         |
| 防御重心   | 验证请求的发起来源       | 管住不可信数据进入代码的通道 |

一句话：XSS 成立时 CSRF 防线形同虚设（脚本可以合法地读 Token 再发请求），
所以 CSRF 防御永远以 XSS 防御为前提。

## 2. 攻击形态：从「不需要脚本」到「伪装 JSON」

### 2.1 GET 型与 POST 型

写操作用 GET 时，一张图片就能触发：

```html
<img src="https://bank.example/transfer?to=attacker&amount=10000" />
```

这也是「写操作绝不用 GET」这条设计纪律的安全根源。写操作改用 POST 后，
恶意站点用自动提交的表单同样能打：

```html
<form id="f" action="https://bank.example/transfer" method="POST">
  <input type="hidden" name="to" value="attacker" />
  <input type="hidden" name="amount" value="10000" />
</form>
<script>document.getElementById('f').submit();</script>
```

### 2.2 JSON 型：Content-Type 的小矩阵

CORS 预检挡住了跨站带自定义头或 `application/json` 的「复杂请求」，于是
攻击者转而利用**简单请求**可以绕开预检的特性，把 JSON 塞进允许的简单
Content-Type 里：

```html
<!-- 用 text/plain 发送，服务端若不严格校验 Content-Type 就会把 body 当 JSON 解析 -->
<form action="https://api.example.com/delete" method="POST" enctype="text/plain">
  <input type='hidden' name='{"id":1,"padding":"' value='"}' />
</form>
```

```javascript
// credentials: 'include' 表示跨站请求也携带 Cookie（目标站 SameSite 宽松时成立）
fetch('https://api.example.com/delete', {
  method: 'POST',
  credentials: 'include',
  body: JSON.stringify({ id: 1 }),
});
```

防御上对应的结论：**服务端严格校验 Content-Type，JSON API 只接受
`application/json`**（跨站表单发不出这个类型，预检必被拦）。

## 3. 防御原理：每一招「为什么成立」

### 3.1 CSRF Token：不可预测 + 攻击者读不到

标准流程：服务器生成随机 Token 存进会话，渲染表单时嵌进隐藏字段；提交时
比对。它成立依赖两个条件，缺一即失效：

1. **Token 绑定会话**（不是全局固定值）：固定 Token 一旦从任何用户处泄露
   就是全线失守；绑定会话后，泄露只影响单个会话；
2. **攻击者拿不到 Token**：跨站读不到 A 域的 Cookie、也读不到 A 域页面的
   DOM（同源策略）——所以只要 Token 不出现在 URL 里（Referer 泄露！）、
   不存进可被 XSS 读到的地方，伪造请求就填不出正确答案。

高安全场景升级为 per-request Token（一次一换）或加密 Token（HMAC 绑定
会话 ID，免服务端存储）。

### 3.2 SameSite Cookie：把「自动携带」关小

```http
Set-Cookie: session=abc123; Secure; HttpOnly; SameSite=Lax
```

| 值       | 语义                                            | 副作用                     |
| :------- | :---------------------------------------------- | :------------------------- |
| `Strict` | 任何跨站请求都不带                              | 从外部链接点进来也要重新登录 |
| `Lax`    | 顶级导航的 GET 带其他不带                        | 兼容性与安全的默认平衡点    |
| `None`   | 跨站也带（必须 `Secure`）                        | 等于放弃这层防御            |

版本基线：Chrome 自 2020 年把未声明 SameSite 的 Cookie 默认按 `Lax` 处理，
`None` 强制要求 `Secure`；Firefox/Safari 已跟进。这意味着新站点天然有一层
基础防护，但两点不能省：`Lax` 挡不住顶级 GET 导航（所以写操作仍禁止 GET），
旧系统里未声明 SameSite 的 Cookie 仍在裸奔。

### 3.3 Origin 校验与双提交：两个「次优但轻量」的选项

**Origin 校验**：浏览器在 POST 请求上带 `Origin` 头（比 Referer 可靠——
隐私设置可能剥掉 Referer，但 Origin 在跨站 POST 上不可伪造地存在）。
服务端白名单比对，缺失时拒绝（失败安全）。它实现成本最低，适合 API 网关
层统一做；短板是老浏览器兼容与反向代理剥头的问题。

**双提交 Cookie（Double Submit）**：把随机 Token 同时写进 Cookie 和请求
参数/头，服务端比对两者一致。原理：攻击者能**携带**Cookie（浏览器自动）
却**读不到**Cookie（同源策略），所以填不出匹配值。它不需要服务端存储，
天生适配分布式部署；弱点是子域漏洞（子域 XSS 可以写根域 Cookie 实现
「自双提交」），故要求域划分干净并给 Cookie 加 `__Host-` 前缀锁定。

### 3.4 自定义请求头

跨站「简单请求」发不出自定义头（发出即触发预检、预检必被同源策略拦截）。
所以「关键接口必须带 `X-Requested-With` 之类自定义头」是一道轻量门禁，
常与 Origin 校验配合用于纯 API 服务。

### 3.5 选型决策树

```text
纯 JSON API（SPA/移动端）
  → SameSite=Lax + Content-Type 严格校验 + Origin 校验（自定义头加强）
    Bearer Token 放 localStorage 的 SPA 天然免疫 CSRF（请求不带 Cookie），
    但 XSS 风险上升——两套威胁模型的交换，见 290-AuthenticationAuthorization

传统多页表单（Cookie 会话）
  → SameSite=Lax 基础层 + 同步 Token（绑定会话）主防御 + Origin 校验兜底

高敏感操作（支付、改绑邮箱）
  → 在上述基础上叠加二次确认（重新输入密码 / 短信验证码）：
    CSRF 防的是「未授权的操作」，敏感操作要求「显式的用户意图」最可靠
```

## 4. 面试题思路

- 「CSRF Token 为什么有效？」——按两个成立条件答：不可预测（攻击者无法构造）
  与不可读取（跨域读不到 Cookie 与 DOM）；再补一句前提：Token 不进 URL、
  页面无 XSS，防线才完整。
- 「Double Submit Cookie 的原理和弱点？」——原理是「能带不能读」；弱点是
  子域可写根域 Cookie，用 `__Host-` 前缀与干净的域边界堵住。
- 「SameSite=Lax 之后还需要 Token 吗？」——需要。Lax 只挡跨站子资源与
  POST，顶级 GET 导航不受限；若站点存在 GET 型写操作（本不该有）或旧
  Cookie 未声明 SameSite，Token 仍是主防御。层次防御不因为加了新层就拆除旧层。
- 「CSRF 和 XSS 先修哪个？」——XSS。它能让 CSRF 的所有防线内爆（脚本在
  受信页面里发请求、合法地读 Token）。

## 5. 动手实践

练习任务（先自己写，再看自检区）：

1. 用 Flask 给一个「修改邮箱」表单加上同步 CSRF Token：生成、注入、校验
   三步，校验失败返回 403。
2. 给一个 JSON API 写 Origin 校验中间件：Origin 缺失或不在白名单时拒绝，
   注意豁免同源请求的处理。
3. 检查你自己项目的 Cookie 配置，补齐 `SameSite=Lax; Secure; HttpOnly`
   三件套并验证浏览器 DevTools 中的实际属性。

遮代码自检——先想再对：

提示一：任务 1 的 Token 要绑定到什么？校验用常数时间比较吗？

```python
import secrets, hmac
from flask import session, request, abort

def csrf_token() -> str:
    if '_csrf' not in session:
        session['_csrf'] = secrets.token_urlsafe(32)   # 绑定会话，随会话失效
    return session['_csrf']

@app.before_request
def verify_csrf():
    if request.method in ('POST', 'PUT', 'DELETE'):
        sent = request.form.get('_csrf', '')
        if not hmac.compare_digest(sent, session.get('_csrf', '')):
            abort(403)     # 缺失与不匹配同样拒绝：失败安全
# 模板：<input type="hidden" name="_csrf" value="{{ csrf_token() }}">
```

提示二：任务 2 对「同源请求」和「跨站请求」分别怎么处理？

```python
TRUSTED = {'https://app.example.com'}

@app.before_request
def check_origin():
    if request.method in ('POST', 'PUT', 'DELETE'):
        origin = request.headers.get('Origin')
        if origin is None:
            return        # 非浏览器客户端（curl/服务间调用）无 Origin
        if origin not in TRUSTED:
            abort(403)    # 明确跨站且不在白名单：拒绝
# 注意：Host 与 Origin 的 scheme+host+port 逐段比对，前缀匹配会被
# https://app.example.com.evil.test 绕过
```

提示三：任务 3 用什么命令确认 Cookie 三件套真的生效？

```text
DevTools → Application → Cookies：
  HttpOnly 列打勾、SameSite 显示 Lax、Secure 列打勾
服务端写法（Flask）：
  SESSION_COOKIE_HTTPONLY / SECURE / SAMESITE 三个配置项
响应头验证（curl）：
  curl -si https://app.example.com/login | grep -i set-cookie
  期望看到： Secure; HttpOnly; SameSite=Lax
```

## 6. 常见误区

| 误区                                     | 事实                                                       |
| :--------------------------------------- | :--------------------------------------------------------- |
| 「改成 POST 就不会被 CSRF」               | 自动提交表单专打 POST；GET 只是把门槛降到了图片标签          |
| 「HTTPS 能防 CSRF」                       | 加密保证传输不被窃听，与「请求是否经用户同意」无关           |
| 「Token 放 Cookie 里就不安全」            | 双提交方案本来就放 Cookie；关键是「攻击者读不到」而非「不存放」 |
| 「Token 写进 URL 方便跳转」               | URL 会经 Referer、历史记录、日志泄露，Token 必须走请求体/头   |
| 「上了 SameSite 就能删掉 Token」          | Lax 挡不住顶级 GET 导航与未声明的旧 Cookie，层次防御要叠加   |
| 「纯 API 没有 CSRF 风险」                 | Cookie 认证的 API 照样有；换成 Bearer Token 才真正脱离该模型 |

## 小结

- **初学者要点**：CSRF 的本体是浏览器自动附带 Cookie 这个隐式凭证；攻击
  只发请求不读响应；写操作禁止 GET 是第一道纪律；SameSite=Lax 是新站点的
  天然基础层而非全部。
- **进阶注意**：防御每招都有成立条件——Token 要绑定会话且不进 URL，双提交
  要防子域写根域 Cookie，Origin 校验要失败安全且逐段比对；JSON API 靠严格
  Content-Type 与自定义头；高敏感操作叠加二次确认。防线的前提是先修 XSS，
  完整登录态攻防见 290-AuthenticationAuthorization，落地配置在 220-CSRFDefense。
