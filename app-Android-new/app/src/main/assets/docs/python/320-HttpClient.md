---
order: 320
title: Python http.client HTTP 客户端
module: 'python'
category: 后端技术
difficulty: beginner
description: http.client 底层客户端：连接与请求、响应解析、头处理、异常层级与 keep-alive 复用。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'python/330-HttpxRequests'
  - 'python/310-NetworkSocketHttp'
prerequisites: []
---

## 为什么还要学底层 HTTP 客户端

实际项目发请求应该用 `requests` 或 `httpx`（见 [Httpx 与 Requests](/python/330-HttpxRequests)）——它们有会话、连接池、重试与友好的 API。那 `http.client` 的价值在哪？它是标准库里**最贴近 HTTP 协议本身**的客户端：连接、请求行、头、体、响应全部亲手操作。读懂数它，"连接复用为什么必须先读完响应体""Content-Length 与 chunked 的区别"这些排查问题时的关键细节才有了着落。把它当作 HTTP 协议的"手动挡练习车"，日常开车还是自动挡。

## HTTPConnection

**基本写法：创建连接**
`http.client.HTTPConnection(<主机>, <端口>)`
```python
# 创建 HTTP 连接
import http.client

conn = http.client.HTTPConnection("example.com", 80)
```

**基本写法：HTTPS 连接**
`http.client.HTTPSConnection(<主机>, <端口>)`
```python
# 创建 HTTPS 连接
import ssl

ctx = ssl.create_default_context()
conn = http.client.HTTPSConnection("www.python.org", 443, context=ctx)
```

**基本写法：发起请求**
`conn.request(<方法>, <路径>, <数据>, <头>)`
```python
# 发起 GET 请求
conn.request("GET", "/")
resp = conn.getresponse()
print(resp.status, resp.reason)
print(resp.read().decode()[:100])
```

**基本写法：POST 请求**
`conn.request("POST", <路径>, <数据>, <头>)`
```python
# 发起 POST 请求
import json
body = json.dumps({"name": "Alice"}).encode()
headers = {"Content-Type": "application/json"}
conn.request("POST", "/api/users", body, headers)
resp = conn.getresponse()
```

---

## HTTPResponse 响应对象

**基本写法：获取响应**
`conn.getresponse()`
```python
# 获取响应对象
resp = conn.getresponse()
```

**基本写法：状态码**
`resp.status` | `resp.reason`
```python
# 状态码与原因短语
print(resp.status)    # 200
print(resp.reason)    # OK
```

**基本写法：读取响应体**
`resp.read()` | `resp.read(<长度>)`
```python
# 读取全部或部分响应体
data = resp.read()
chunk = resp.read(1024)
```

**基本写法：获取响应头**
`resp.getheader(<名称>)` | `resp.getheaders()`
```python
# 获取响应头
print(resp.getheader("Content-Type"))
print(resp.getheaders())
```

**基本写法：流式读取**
`for line in resp:`
```python
# 逐行迭代响应体
for line in resp:
    print(line)
```

---

## 请求方法

**基本写法：PUT/DELETE/PATCH**
`conn.request(<方法>, <路径>)`
```python
# 各种 HTTP 方法
conn.request("PUT", "/item/1", body)
conn.request("DELETE", "/item/1")
conn.request("PATCH", "/item/1", body)
```

**基本写法：HEAD 请求**
`conn.request("HEAD", <路径>)`
```python
# HEAD 只获取头
conn.request("HEAD", "/")
resp = conn.getresponse()
print(resp.getheader("Content-Length"))
```

---

## 请求头

**基本写法：自定义请求头**
`conn.request(<方法>, <路径>, <数据>, <头字典>)`
```python
# 携带自定义头
headers = {
    "User-Agent": "MyClient/1.0",
    "Authorization": "Bearer token123",
}
conn.request("GET", "/", headers=headers)
```

**基本写法：添加 Cookie**
`headers["Cookie"] = <字符串>`
```python
# 携带 Cookie
headers = {"Cookie": "session=abc123"}
conn.request("GET", "/", headers=headers)
```

---

## 连接管理

**基本写法：关闭连接**
`conn.close()`
```python
# 关闭连接
conn.close()
```

**基本写法：set_tunnel 代理隧道**
`conn.set_tunnel(<代理主机>, <代理端口>)`
```python
# 通过代理建立隧道
conn = http.client.HTTPSConnection("example.com")
conn.set_tunnel("proxy.local", 8080)
conn.request("GET", "/")
```

**基本写法：connect 手动连接**
`conn.connect()`
```python
# 手动建立连接
conn.connect()
```

---

## 超时与异常

**基本写法：设置超时**
`HTTPConnection(<主机>, <端口>, timeout=<秒>)`
```python
# 连接超时
conn = http.client.HTTPConnection("example.com", timeout=10)
```

**基本写法：捕获异常**
`except http.client.HTTPException:`
```python
# http.client 异常基类
try:
    conn.request("GET", "/")
except http.client.HTTPException as e:
    print("HTTP 异常:", e)
except ConnectionError as e:
    print("连接错误:", e)
```

**基本写法：常见异常类型**
`http.client.HTTPException`
```python
# 异常层级
# HTTPException
#   ├── ProtocolError
#   ├── ResponseNotReady
#   ├── BadStatusLine
#   ├── ImproperConnectionState
#   └── CannotSendRequest
```

---

## HTTPMessage 消息对象

**基本写法：响应头为 email.message.Message**
`type(resp.headers)`
```python
# headers 是 email.message.Message 子类
print(type(resp.headers))
print(resp.headers["Content-Type"])
```

**基本写法：items 遍历头**
`resp.headers.items()`
```python
# 遍历所有头
for key, value in resp.headers.items():
    print(key, value)
```

---

## 持续连接与流水线

**基本写法：复用连接**
`conn.request(...)` 多次
```python
# 同一连接发多个请求（keep-alive）
conn = http.client.HTTPConnection("example.com")
conn.request("GET", "/a")
r1 = conn.getresponse()
r1.read()               # 关键：必须读完（或 close）当前响应，才能发下一个请求
conn.request("GET", "/b")
r2 = conn.getresponse()
r2.read()
conn.close()
```

---

## 常见陷阱与最佳实践

1. **不读完响应体就复用连接，连接会作废**：`request()` 前上一次响应还有未读数据时，`http.client` 会关闭连接并提示 `ResponseNotReady`（或下次连接被服务端断开）。模式固定为"读 status -> 读 headers -> 读体（read() 或迭代）-> 再发下一个请求"。
2. **响应体是一次性流**：`resp.read()` 调用第二次返回空字节串；需要多次使用就先存变量。
3. **异常要同时接 HTTPException 与 OSError**：DNS 失败、连接拒绝抛的是 `ConnectionError` 等 OSError 系异常，协议层错误才是 `HTTPException`；只捕获后者会把网络错误漏给调用方。
4. **没有重试与连接池**：`http.client` 单连接、无自动重定向、无 Cookie 管理。遇到 3xx 要自己看 `resp.status` 与 `Location` 头手动跳转——这也是"生产用 requests/httpx"的核心理由。
5. **HTTPS 证书校验默认开启**：`HTTPSConnection` 默认用 `ssl.create_default_context()` 校验证书；不要为了自签证书随手传 `context=ssl._create_unverified_context()`，正确做法是给 `context` 加载受信任的 CA。

## 本篇小结

1. `http.client` 是标准库的手动挡 HTTP 客户端：`HTTP(S)Connection` 管连接，`request()` 发请求行+头+体，`getresponse()` 拿回 `HTTPResponse`。
2. 协议顺序是硬约束：发下一个请求前必须消费完当前响应；响应体是一次性流。
3. 异常分两族：协议错误看 `HTTPException` 层级，网络错误看 `OSError` 层级，两者都要接。
4. 学习它的意义在于理解协议与排查问题；业务代码请使用 `requests`/`httpx`，需要连接池、重试、超时策略时尤其如此。

## 动手实践

1. 用 `http.client` 手动向 `httpbin.org/get` 发一个带自定义 `User-Agent` 的 GET 请求，打印状态码、响应头与体长。
2. 复用同一连接连续请求同一主机 5 次，对比"每次新建连接"与"keep-alive 复用"的总耗时（`time.perf_counter` 计时）。
3. 故意对一个返回 301 的地址发请求，读取 `Location` 头并手动完成一次重定向，体会高层库替你做了什么。
