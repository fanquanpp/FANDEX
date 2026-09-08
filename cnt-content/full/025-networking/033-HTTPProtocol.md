---
order: 330
title: HTTP 协议
module: 'networking'
category: 云与基础设施
difficulty: beginner
description: Networking HTTP 协议 的完整教学讲解。
author: fanquanpp
updated: '2026-09-08'
related: []
prerequisites: []
---

## HTTP 请求方法

**基本写法：GET 请求资源**
`GET <路径> HTTP/1.1`
```http
# 获取指定资源
GET /api/users HTTP/1.1
Host: example.com
```

**基本写法：POST 创建资源**
`POST <路径> HTTP/1.1`
```http
# 提交数据创建资源
POST /api/users HTTP/1.1
Host: example.com
Content-Type: application/json
Content-Length: 25

{"name":"John","age":30}
```

**基本写法：PUT 更新资源**
`PUT <路径> HTTP/1.1`
```http
# 完整更新资源
PUT /api/users/1 HTTP/1.1
Host: example.com
Content-Type: application/json

{"name":"Jane","age":25}
```

**基本写法：DELETE 删除资源**
`DELETE <路径> HTTP/1.1`
```http
# 删除指定资源
DELETE /api/users/1 HTTP/1.1
Host: example.com
```

**基本写法：PATCH 部分更新**
`PATCH <路径> HTTP/1.1`
```http
# 部分更新资源
PATCH /api/users/1 HTTP/1.1
Host: example.com
Content-Type: application/json

{"age":26}
```

**基本写法：HEAD 获取头信息**
`HEAD <路径> HTTP/1.1`
```http
# 只获取响应头
HEAD /api/users HTTP/1.1
Host: example.com
```

**基本写法：OPTIONS 探测支持的方法**
`OPTIONS <路径> HTTP/1.1`
```http
# 查询服务器支持的方法
OPTIONS /api/users HTTP/1.1
Host: example.com
```

---

## HTTP 状态码

**基本写法：2xx 成功响应**
`HTTP/1.1 <状态码> <原因短语>`
```http
# 200 OK 请求成功
HTTP/1.1 200 OK
Content-Type: application/json

{"id":1,"name":"John"}
```

**基本写法：3xx 重定向**
`HTTP/1.1 301 Moved Permanently`
```http
# 301 永久重定向
HTTP/1.1 301 Moved Permanently
Location: https://example.com/new-path
```

**基本写法：4xx 客户端错误**
`HTTP/1.1 404 Not Found`
```http
# 404 资源不存在
HTTP/1.1 404 Not Found
Content-Type: application/json

{"error":"User not found"}
```

**基本写法：5xx 服务端错误**
`HTTP/1.1 500 Internal Server Error`
```http
# 500 服务器内部错误
HTTP/1.1 500 Internal Server Error
Content-Type: application/json

{"error":"Database connection failed"}
```

---

## 常用请求头

**基本写法：Host 头**
`Host: <域名>`
```http
# 指定目标主机
Host: example.com
```

**基本写法：User-Agent**
`User-Agent: <UA字符串>`
```http
# 标识客户端类型
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)
```

**基本写法：Accept**
`Accept: <MIME类型>`
```http
# 指定可接受的内容类型
Accept: application/json, text/html
```

**基本写法：Authorization**
`Authorization: <类型> <凭证>`
```http
# Bearer Token 认证
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**基本写法：Content-Type**
`Content-Type: <MIME类型>`
```http
# 指定请求体类型
Content-Type: application/json
```

**基本写法：Cookie**
`Cookie: <键>=<值>[; <键>=<值>]`
```http
# 发送 Cookie
Cookie: session=abc123; user_id=1001
```

---

## 常用响应头

**基本写法：Content-Type 响应**
`Content-Type: <MIME类型>`
```http
# 指定响应内容类型
Content-Type: application/json; charset=utf-8
```

**基本写法：Set-Cookie**
`Set-Cookie: <键>=<值>; <选项>`
```http
# 设置 Cookie
Set-Cookie: session=abc123; Path=/; HttpOnly; Secure; Max-Age=3600
```

**基本写法：Cache-Control**
`Cache-Control: <指令>`
```http
# 控制缓存行为
Cache-Control: no-cache, no-store, must-revalidate
```

**基本写法：CORS 头**
`Access-Control-Allow-Origin: <源>`
```http
# 允许跨域访问
Access-Control-Allow-Origin: https://example.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization
```

**基本写法：Location**
`Location: <URL>`
```http
# 重定向目标
Location: https://example.com/new-page
```

---

## HTTP 认证方式

**基本写法：Basic 认证**
`Authorization: Basic <Base64编码>`
```http
# 用户名密码 Base64 编码
Authorization: Basic dXNlcjpwYXNzd29yZA==
```

**基本写法：Bearer Token**
`Authorization: Bearer <token>`
```http
# Bearer Token 认证
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
```

**基本写法：API Key**
`X-API-Key: <密钥>`
```http
# API Key 认证
X-API-Key: abc123def456
```

**基本写法：Digest 认证**
`Authorization: Digest <参数>`
```http
# Digest 摘要认证
Authorization: Digest username="admin", realm="example", nonce="abc", uri="/api", response="xyz"
```

---

## URL 结构

**基本写法：完整 URL 结构**
`<协议>://<用户>:<密码>@<主机>:<端口>/<路径>?<查询>#<片段>`
```text
# URL 各部分组成
https://user:pass@example.com:8080/api/users?page=1#section1
```

**基本写法：URL 编码**
`<编码字符>`
```text
# 特殊字符编码：空格为 %20 或 +
# / 为 %2F
# ? 为 %3F
# & 为 %26
# = 为 %3D
```

---

## Cookie 属性

**基本写法：设置 Cookie 过期时间**
`Set-Cookie: <键>=<值>; Expires=<日期>`
```http
# 设置 Cookie 过期时间
Set-Cookie: session=abc123; Expires=Wed, 09 Jun 2026 10:18:14 GMT
```

**基本写法：设置 Cookie 最大存活时间**
`Set-Cookie: <键>=<值>; Max-Age=<秒数>`
```http
# 设置 Cookie 存活 3600 秒
Set-Cookie: token=xyz; Max-Age=3600
```

**基本写法：设置 Cookie 作用域**
`Set-Cookie: <键>=<值>; Domain=<域>; Path=<路径>`
```http
# 设置 Cookie 作用域
Set-Cookie: session=abc123; Domain=.example.com; Path=/
```

**基本写法：安全 Cookie**
`Set-Cookie: <键>=<值>; Secure; HttpOnly; SameSite=<策略>`
```http
# 安全 Cookie 设置
Set-Cookie: session=abc123; Secure; HttpOnly; SameSite=Strict
```

---

## HTTP 缓存

**基本写法：强缓存**
`Cache-Control: max-age=<秒数>`
```http
# 浏览器强缓存 3600 秒
Cache-Control: max-age=3600
```

**基本写法：协商缓存**
`ETag: "<标签>"`
```http
# 资源唯一标识
ETag: "abc123"
```

**基本写法：Last-Modified**
`Last-Modified: <日期>`
```http
# 资源最后修改时间
Last-Modified: Wed, 09 Jun 2026 10:18:14 GMT
```

**基本写法：条件请求**
`If-None-Match: "<标签>"`
```http
# 客户端验证资源是否变更
If-None-Match: "abc123"
```

---

## HTTPS 与 SSL/TLS

**基本写法：HTTPS 请求**
`https://<域名>/<路径>`
```text
# HTTPS 加密连接
https://example.com/api/users
```

**基本写法：TLS 握手**
```text
# TLS 握手过程
1. ClientHello -> 客户端发送支持的加密套件
2. ServerHello -> 服务器选择加密套件
3. Certificate -> 服务器发送证书
4. KeyExchange -> 密钥交换
5. Finished -> 握手完成
```

**基本写法：HSTS 强制 HTTPS**
`Strict-Transport-Security: max-age=<秒数>`
```http
# 强制浏览器使用 HTTPS
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

---

## HTTP 版本对比

**基本写法：HTTP/1.1 请求**
`GET / HTTP/1.1`
```http
# HTTP/1.1 持久连接
GET /api/users HTTP/1.1
Host: example.com
Connection: keep-alive
```

**基本写法：HTTP/2 特性**
```text
# HTTP/2 主要特性
- 多路复用：单个连接并行多个请求
- 头部压缩：HPACK 算法压缩头部
- 服务端推送：Server Push
- 二进制分帧：二进制格式传输
```

**基本写法：HTTP/3 特性**
```text
# HTTP/3 基于 QUIC 协议
- 使用 UDP 而非 TCP
- 集成 TLS 1.3
- 解决队头阻塞问题
- 连接迁移
```

---

## 实用 HTTP 调试

**基本写法：使用 curl 发送请求**
`curl -v <URL>`
```bash
# 详细模式查看 HTTP 通信过程
curl -v https://example.com
```

**基本写法：查看响应头**
`curl -I <URL>`
```bash
# 只查看响应头
curl -I https://example.com
```

**基本写法：telnet 测试 HTTP**
`telnet <主机> <端口>`
```bash
# 使用 telnet 手动发送 HTTP 请求
telnet example.com 80
GET / HTTP/1.1
Host: example.com

```

**基本写法：查看 TLS 证书**
`openssl s_client -connect <主机>:443`
```bash
# 查看 HTTPS 证书详情
openssl s_client -connect example.com:443 -servername example.com
```
