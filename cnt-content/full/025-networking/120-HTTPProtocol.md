---
order: 150
title: HTTP 协议
module: 'networking'
category: 云与基础设施
difficulty: beginner
description: HTTP 协议学习笔记：从一次真实页面加载出发动手观察请求方法与状态码，理解 HTTP/1.1 到 2 到 3 的演进动因、报文头、Cookie、缓存与 HTTPS/TLS 1.3 现状。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'networking/130-CurlHTTPRequest'
  - 'networking/370-ProxyConfig'
  - 'networking/020-OSITCPIPModel'
prerequisites: []
---

## 从一次页面加载说起

你在浏览器打开 <https://fanquanpp.github.io/FANDEX/>（本笔记库的网页端）。页面立刻出来了，
但你按 F12 打开「网络」面板刷新一次，会看到几十上百条请求：HTML 文档一条、CSS 一条、
JS 若干条、字体、图标、搜索索引……每一条都是一个独立的 HTTP「请求-响应」。

HTTP 就是这套对话的语法：客户端（浏览器/curl）发一份**报文**问「我要什么」，服务器回一份
报文答「给你/不行/去别处拿」。协议本身**无状态**——它不记得你上一条问过什么，登录态这类
状态全靠 Cookie/Token 在应用层自己延续。

先建立全貌再逐个拆：

```mermaid
flowchart LR
    V1["HTTP/1.0<br/>每请求一条连接"] --> V11["HTTP/1.1<br/>持久连接 + Host 头"]
    V11 --> V2["HTTP/2 (RFC 9113)<br/>二进制分帧 + 多路复用"]
    V2 --> V3["HTTP/3 (RFC 9114)<br/>QUIC (RFC 9000) 承载"]
```

| 版本     | 标准                        | 关键改进                                       | 遗留问题                                   |
| :------- | :-------------------------- | :--------------------------------------------- | :----------------------------------------- |
| HTTP/1.0 | -                           | 基本请求-响应                                  | 每个请求都要 TCP 三次握手                  |
| HTTP/1.1 | RFC 9112（语义见 RFC 9110） | 持久连接、Host 头、分块传输、缓存协商          | 同一连接同时只能一个未完成请求，浏览器靠开约 6 条连接缓解 |
| HTTP/2   | RFC 7540，更新于 RFC 9113   | 二进制分帧、单连接多路复用、HPACK 头压缩       | TCP 层队头阻塞仍在；服务器推送已被主流浏览器移除 |
| HTTP/3   | RFC 9114                    | 承载在 QUIC 上：内置 TLS 1.3、流间独立交付、连接迁移 | UDP 被部分网络拦截时需回落 HTTP/2      |

### 动手：确认对面在说什么版本

不用任何框架，curl 就能看清协议版本：

```bash
curl -sI --http2 https://example.com | head -1
# HTTP/2 200                      ← 该站点支持 HTTP/2

curl -sI --http3 https://www.cloudflare.com | head -1
# HTTP/3 200                      ← 需要 curl 构建时编译了 QUIC 支持，
#                                    部分 Linux 发行版默认不带，Windows 可用官方构建
```

把 `example.com` 换成 `fanquanpp.github.io` 再试一次，对比结果。如果 `--http3` 报
不支持的选项，说明你的 curl 没编译 QUIC，这不是错误——返回什么版本取决于**双方**都支持什么。

### 讲为什么：队头阻塞是理解版本演进的钥匙

1. **HTTP/1.1 的排队**：一条 TCP 连接上同时只能有一个未完成的请求。页面有 30 个资源？
   要么串行等，要么浏览器偷偷开约 6 条连接并行——这是当年「网站优化第一条：合并请求」的根源。
2. **HTTP/2 的半吊子解决**：把报文切成二进制「帧」，多个流（stream）的帧在同一连接上交错，
   HTTP 层不再排队。但 TCP 要求**字节流严格按序交付**——任何一个包丢失，后面所有流的数据
   都必须等它重传完成。瓶颈只是从 HTTP 层下沉到了 TCP 层。
3. **HTTP/3 真正拆掉它**：QUIC 在 UDP 上以「流」为单位做可靠重传，丢包只阻塞所属的流。
   TLS 1.3 握手内嵌在协议里，首次连接 1-RTT 即可发数据；连接用 Connection ID 标识，
   手机从 Wi-Fi 切到蜂窝、IP 变了连接还活着（连接迁移）——四元组标识的 TCP 做不到。
   配套规范：丢失恢复 RFC 9002、TLS 映射 RFC 9001。

TLS 1.3（RFC 8446）本身也是这次演进的主角：握手从 2-RTT 减到 1-RTT，删掉了 RSA 静态密钥
交换、CBC 模式、RC4、压缩与重协商等历史包袱，只保留有前向安全的 (EC)DHE 类套件。
2026 年的现状：TLS 1.3 是默认首选，TLS 1.2 仍广泛共存，更早版本应当禁用（详见
cybersecurity/090-HTTPSPrinciple）。

**WebSocket（RFC 6455）**是另一条支线：它借 HTTP 完成一次「升级」握手
（`Upgrade: websocket`，状态码 101），之后连接切换为全双工消息通道，适合聊天、行情推送这类
服务器主动推数据的场景。HTTP/2 上可经 RFC 8441 用 CONNECT 方法复用连接；HTTP/3 上的
对应物是 WebTransport（仍在推广期，选型宜保守）。

---

## 请求方法：动词决定语义

方法不是装饰，它向服务器（和中间的缓存、代理）声明这次操作的**语义与安全性**。
GET/HEAD 是安全的（只读），PUT/DELETE 是幂等的（重复执行结果一样），POST 两者都不保证。

| 方法    | 语义               | 幂等 | 有请求体 |
| :------ | :----------------- | :--- | :------- |
| GET     | 读取资源           | 是   | 否       |
| HEAD    | 只要响应头不要正文 | 是   | 否       |
| POST    | 提交数据/创建资源  | 否   | 是       |
| PUT     | 整体替换资源       | 是   | 是       |
| PATCH   | 部分修改资源       | 不保证 | 是     |
| DELETE  | 删除资源           | 是   | 通常无   |
| OPTIONS | 探测支持的方法     | 是   | 否       |

```http
GET /api/users?page=1 HTTP/1.1
Host: example.com

POST /api/users HTTP/1.1
Host: example.com
Content-Type: application/json
Content-Length: 25

{"name":"John","age":30}

PATCH /api/users/1 HTTP/1.1
Host: example.com
Content-Type: application/json

{"age":26}
```

动手验证 OPTIONS（配合 CORS 时很常用）：

```bash
curl -i -X OPTIONS https://api.github.com
# 观察 Allow / Access-Control-Allow-* 响应头
```

坑点：GET 请求理论上没有请求体，但**GET 的参数全在 URL 里**——会进服务器日志、代理日志、
浏览器历史。密码、token 千万别放 GET 参数里。

---

## 状态码：服务器的答复分类

状态码第一位就是分类，记住这一层，剩下按需查：

| 类别 | 含义         | 高频成员                                                            |
| :--- | :----------- | :------------------------------------------------------------------ |
| 1xx  | 中间状态     | 101 Switching Protocols（WebSocket 升级）                           |
| 2xx  | 成功         | 200 OK；204 No Content；206 Partial Content（断点续传）             |
| 3xx  | 重定向       | 301 永久；302 临时；304 Not Modified（缓存命中）                    |
| 4xx  | 客户端错误   | 400；401 未认证；403 无权限；404；429 请求过多；451 法律原因        |
| 5xx  | 服务端错误   | 500 内部错误；502 网关上游故障；503 暂不可用；504 网关超时          |

```http
HTTP/1.1 301 Moved Permanently
Location: https://example.com/new-path

HTTP/1.1 404 Not Found
Content-Type: application/json

{"error":"User not found"}
```

最值得区分的三组：

- **301 vs 302**：301 永久重定向，浏览器和搜索引擎会缓存并更新书签；302 临时。
  改版迁移域名用 301，登录后跳转用 302/303/307。
- **401 vs 403**：401 是「没登录」（该去认证了），403 是「登录了但没权限」（认证了也没用）。
- **500 vs 502/504**：500 是应用自己崩了；502/504 是前面的网关（Nginx、负载均衡）联系
  不上/等不到后面的应用——排查方向完全不同，看到 502 先查后端进程是否活着。

---

## 请求头与响应头：报文的元数据

```http
# 常见请求头
Host: example.com                          # HTTP/1.1 必带，一台服务器托管多站点靠它路由
User-Agent: Mozilla/5.0 (Windows NT 10.0)  # 客户端标识
Accept: application/json, text/html        # 我能接受什么类型
Content-Type: application/json             # 我发来的正文是什么类型
Authorization: Bearer eyJhbGciOi...        # 认证凭证
Cookie: session=abc123                     # 回传此前服务器设置的 Cookie

# 常见响应头
Content-Type: application/json; charset=utf-8
Set-Cookie: session=abc123; Path=/; HttpOnly; Secure; Max-Age=3600
Cache-Control: max-age=3600
Location: https://example.com/new-page
Access-Control-Allow-Origin: https://app.example.com   # CORS：允许哪个源跨域访问
```

### 动手：读一遍 FANDEX 的真实响应头

```bash
curl -sI https://fanquanpp.github.io/FANDEX/ | sort
```

你会看到 `content-type: text/html`、缓存与安全相关的一串头。安全头不是玄学，本仓库网页端
就在模板里写了 CSP（见 `app-web/src/lib/csp.ts`），形如：

```text
Content-Security-Policy: default-src 'self';
  script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;
  connect-src 'self'
```

含义：脚本只许来自自身和 jsDelivr CDN（供前端实验室动态加载格式化插件），除此之外一律禁止。
读一个真实项目的 CSP，比背十条规范有用。

### 认证头的四种常见形态

```http
Authorization: Basic dXNlcjpwYXNzd29yZA==     # Basic：用户名:密码 的 Base64
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...  # Bearer：无状态令牌（JWT 等）
X-API-Key: abc123def456                        # API Key：机器对机器的常见约定
Authorization: Digest username="admin", realm="example", nonce="abc", uri="/api", response="xyz"
```

Basic 只是 Base64 **编码不是加密**，必须搭配 HTTPS 才有意义；Digest 设计上避免明文传密码，
但部署越来越少，互联网 API 的事实标准是 Bearer Token。

---

## URL 结构与编码

```text
https://user:pass@example.com:8080/api/users?page=1&size=20#section1
  协议    凭证(已弃用)  主机   端口   路径      查询参数        片段
```

URL 里只能出现安全字符，其余要百分号编码：空格 `%20`（表单里常作 `+`）、`/` `%2F`、
`?` `%3F`、`&` `%26`、`=` `%3D`。中文会按 UTF-8 逐字节编码。手动拼查询串时别自己 `%`
——用库函数（JS 的 `encodeURIComponent`、Python 的 `urllib.parse.quote`）。

坑点：URL 里带用户名密码的形式（`user:pass@host`）浏览器已弃用，且钓鱼攻击爱用它伪装域名
（`https://example.com@evil.com/` 实际访问的是 evil.com）。看到 URL 先找最后一个 `@` 之后的
主机名。

---

## Cookie：无状态协议上的状态补丁

服务器用 `Set-Cookie` 下发，浏览器之后每次请求自动回传 `Cookie` 头。属性决定它的生命周期
和暴露面：

```http
# 作用域与生命周期
Set-Cookie: session=abc123; Domain=.example.com; Path=/; Max-Age=3600
# Max-Age 优先于 Expires；都不写则是「会话 Cookie」，关浏览器即失效

# 安全三件套 + SameSite
Set-Cookie: session=abc123; Secure; HttpOnly; SameSite=Lax
```

| 属性      | 作用                                                               |
| :-------- | :----------------------------------------------------------------- |
| Secure    | 只经 HTTPS 传输                                                    |
| HttpOnly  | JS 读不到（XSS 偷不走会话 Cookie，见 cybersecurity/200-XSSDefense）|
| SameSite  | 跨站请求是否携带：Strict 最严；Lax 是现代浏览器默认；None 需配 Secure |
| Domain/Path | 生效范围；Domain 设得过宽会扩大暴露面                            |

---

## 缓存：少发请求才是最快的请求

HTTP 缓存分两层：

1. **强缓存**：`Cache-Control: max-age=3600`——3600 秒内浏览器连服务器都不问，直接用本地副本。
   常用指令：`no-cache`（可以存但用前必须验证）、`no-store`（完全不许存，敏感数据用）、
   `immutable`（永不变化，配内容哈希文件名）、`stale-while-revalidate=86400`（过期后可先用旧的，
   后台刷新）。
2. **协商缓存**：强缓存过期后，带上 `If-None-Match: "abc123"`（对应响应里的 `ETag`）或
   `If-Modified-Since`（对应 `Last-Modified`）问一句「变了吗」。没变服务器回 **304**，
   不传正文，省流量不省往返。

```http
# 响应
ETag: "abc123"
Last-Modified: Wed, 09 Jun 2026 10:18:14 GMT
Cache-Control: max-age=3600

# 过期后的再验证请求
GET /style.css HTTP/1.1
If-None-Match: "abc123"
```

真实工程模式（本仓库前端构建就是这个思路）：静态资源文件名带内容哈希
（`index.a1b2c3.js`），可以配超长 `max-age` + `immutable` 敢缓存；HTML 不带哈希、必须每次
验证或短缓存。注意一个现实约束：本仓库部署在 GitHub Pages 上，**你改不了它下发的
Cache-Control**（统一约 10 分钟），所以仓库靠 Service Worker（`app-web/public/sw.js`）
在应用层补缓存策略——CDN 不可控时，浏览器端还有一层可以控制。

---

## HTTPS：TLS 在 HTTP 下面垫了什么

HTTPS = HTTP over TLS。TLS 握手在传任何 HTTP 报文之前先完成三件事：协商套件、验证服务器
证书（证书链 -> 域名匹配 -> 有效期 -> 吊销状态）、用 (EC)DHE 商定只有双方知道的会话密钥。
之后 HTTP 报文整体加密传输。完整的握手流程、证书验证与部署配置在
cybersecurity/090-HTTPSPrinciple 与 cybersecurity/080-DigitalCertificate 展开，这里给两个
网络视角的要点：

- **HSTS**（`Strict-Transport-Security: max-age=31536000; includeSubDomains`）：服务器告诉
  浏览器「之后一年内访问本域一律直接走 HTTPS，别先试 HTTP」。这是防御 SSL 剥离（中间人把
  你的 HTTPS 请求降级成 HTTP）的主要手段。
- **手看证书**：

```bash
openssl s_client -connect example.com:443 -servername example.com </dev/null 2>/dev/null \
  | openssl x509 -noout -subject -dates -issuer
# subject=CN=example.com
# notBefore / notAfter / issuer 一目了然
```

---

## 实用调试三件套

```bash
# 1. 看完整往返（请求头、响应头、TLS 握手时间线）
curl -v https://example.com

# 2. telnet 手写一个 HTTP/1.1 请求，体会报文就是纯文本
#    （仅对 80 端口的纯 HTTP 有效；HTTPS 流量是密文，telnet 打不了）
telnet example.com 80
GET / HTTP/1.1
Host: example.com
# 连按两次回车发送

# 3. 查证书（见上一节 openssl s_client）
```

进一步抓手：请求耗时分解用 `curl -w`（DNS/连接/TLS/首字节各占多久）、抓包用
networking/270-Tcpdump、报文级分析用 networking/280-WiresharkCLI。

---

## 坑点与自检

| 坑点 | 事实 |
| :--- | :--- |
| 把状态码当装饰 | 301 与 302 的缓存语义、401 与 403 的排查方向完全不同，返回错了客户端行为就错 |
| GET 请求里塞敏感参数 | URL 会进日志与历史记录，敏感数据走请求体 + HTTPS |
| 以为加了 HTTPS 就完事 | 没有 HSTS 时首次访问仍可被降级；证书过期/域名不匹配会直接被浏览器拦截 |
| HTTP/2 = 网站必然更快 | 单连接多路复用对弱网明显，但 TCP 队头阻塞还在；丢包严重时甚至不如多连接的 1.1 |
| 缓存头乱设 | 接口误设长 max-age 会「改了代码用户看不到」；敏感接口必须 no-store |

自检清单：

- 能用 curl 看出目标站点支持的 HTTP 版本与证书信息吗？
- 能说清 301/302、401/403、500/502 的区别与排查方向吗？
- 能解释 FANDEX 网页端「HTML 短缓存 + 哈希文件名长缓存 + Service Worker」三层各管什么吗？
- Cookie 的 Secure/HttpOnly/SameSite 各自挡住哪类攻击？

---

## 练习

1. 用 `curl -sI` 对比 `fanquanpp.github.io`、`www.cloudflare.com`、任意一个你常用的国内站点：
   记录各自的 HTTP 版本、`cache-control`、安全头差异，并解释为什么云厂商站点普遍开了 HTTP/3。
2. 手写 telnet 请求获取一个仍开放 80 端口的站点首页，观察 301 响应与 `Location` 头。
3. 给自己项目的一个纯静态 API 响应加上 `ETag`，用 curl 连续请求两次，确认第二次返回 304。
4. 读 `app-web/src/lib/csp.ts` 里的 MAIN_CSP，逐条写出每个指令允许/禁止什么，
   思考：如果站点要新增一个第三方统计脚本，CSP 需要怎么改，风险是什么？
5. 在浏览器 F12 的网络面板里找到一条 304 响应，对照本文学过的协商缓存头
   （If-None-Match/ETag）验证请求确实带了再验证信息。

---

## 下一步

- networking/130-CurlHTTPRequest：把 curl 的参数体系练熟，本文所有验证动作的工具箱。
- cybersecurity/090-HTTPSPrinciple：TLS 1.3 握手、证书链与部署配置的完整版。
- networking/270-Tcpdump：想看 HTTP 报文在网线上长什么样，抓包是下一步。
