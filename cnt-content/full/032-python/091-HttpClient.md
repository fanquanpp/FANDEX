---
order: 910
title: Python http.client HTTP 客户端
module: 'python'
category: 后端技术
difficulty: beginner
description: Python http.client HTTP 客户端 的完整教学讲解。
author: fanquanpp
updated: '2026-09-08'
related: []
prerequisites: []
---

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
# 同一连接发多个请求
conn = http.client.HTTPConnection("example.com")
conn.request("GET", "/a")
r1 = conn.getresponse()
r1.read()
conn.request("GET", "/b")
r2 = conn.getresponse()
r2.read()
conn.close()
```
