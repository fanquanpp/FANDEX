---
order: 790
title: Python 网络编程 socket/http
module: 'python'
category: 后端技术
difficulty: beginner
description: Python 网络编程 socket/http 的完整教学讲解。
author: fanquanpp
updated: '2026-08-01'
---

## socket TCP 服务端

**基本写法：创建 TCP 服务端**
`socket.socket(socket.AF_INET, socket.SOCK_STREAM)`
```python
# 创建 IPv4 TCP 套接字并监听
import socket
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.bind(("127.0.0.1", 8080))
s.listen(5)
conn, addr = s.accept()
data = conn.recv(1024)
conn.sendall(b"hello")
conn.close()
```

**基本写法：设置地址复用**
`<套接字>.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)`
```python
# 避免端口释放等待，立即重启绑定
s = socket.socket()
s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
s.bind(("", 8080))
```

**基本写法：并发接收连接**
`while True: <套接字>.accept()`
```python
# 循环接受多个客户端连接
while True:
    conn, addr = s.accept()
    try:
        while True:
            data = conn.recv(1024)
            if not data:
                break
            conn.sendall(data)  # 回显
    finally:
        conn.close()
```

**基本写法：设置超时**
`<套接字>.settimeout(<秒数>)`
```python
# 设置阻塞操作的超时时间
s.settimeout(5.0)
try:
    conn, addr = s.accept()
except socket.timeout:
    print("接受连接超时")
```

---

## socket TCP 客户端

**基本写法：创建 TCP 客户端**
`<套接字>.connect((<主机>, <端口>))`
```python
# 连接服务端并发送数据
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.connect(("127.0.0.1", 8080))
s.sendall(b"ping")
response = s.recv(1024)
s.close()
```

**基本写法：发送字符串数据**
`<字符串>.encode(<编码>)`
```python
# 字符串转字节后发送
s.sendall("你好".encode("utf-8"))
response = s.recv(1024).decode("utf-8")
```

---

## socket UDP 通信

**基本写法：UDP 服务端**
`socket.socket(socket.AF_INET, socket.SOCK_DGRAM)`
```python
# UDP 无连接，直接接收数据报
s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
s.bind(("127.0.0.1", 8080))
data, addr = s.recvfrom(1024)
s.sendto(b"ack", addr)
```

**基本写法：UDP 客户端**
`<套接字>.sendto(<数据>, (<主机>, <端口>))`
```python
# UDP 发送无需建立连接
s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
s.sendto(b"hello", ("127.0.0.1", 8080))
data, addr = s.recvfrom(1024)
```

---

## socketserver 模块

**基本写法：TCP 请求处理类**
`class <类>(socketserver.BaseRequestHandler):`
```python
# 继承 BaseRequestHandler 简化服务端
import socketserver

class Handler(socketserver.BaseRequestHandler):
    def handle(self):
        data = self.request.recv(1024)
        self.request.sendall(data)

server = socketserver.TCPServer(("127.0.0.1", 8080), Handler)
server.serve_forever()
```

**基本写法：多线程服务端**
`socketserver.ThreadingTCPServer(<地址>, <处理器>)`
```python
# 每个连接独立线程处理
server = socketserver.ThreadingTCPServer(("0.0.0.0", 8080), Handler)
server.serve_forever()
```

**基本写法：UDP 服务端**
`socketserver.UDPServer(<地址>, <处理器>)`
```python
# UDP 请求处理
class UDPHandler(socketserver.BaseRequestHandler):
    def handle(self):
        data, sock = self.request
        sock.sendto(b"ack", self.client_address)

server = socketserver.UDPServer(("127.0.0.1", 8080), UDPHandler)
```

---

## http.client 标准库客户端

**基本写法：HTTP GET 请求**
`http.client.HTTPSConnection(<主机>)`
```python
# 发起 HTTPS GET 请求
import http.client
conn = http.client.HTTPSConnection("www.example.com")
conn.request("GET", "/")
resp = conn.getresponse()
print(resp.status, resp.read().decode())
conn.close()
```

**基本写法：带请求头**
`conn.request(<方法>, <路径>, <请求体>, <头字典>)`
```python
# 携带自定义请求头
headers = {"Authorization": "Bearer token123"}
conn.request("GET", "/api", headers=headers)
```

**基本写法：HTTP POST 请求**
`conn.request("POST", <路径>, <请求体>)`
```python
# 发送 POST 请求体
import json
body = json.dumps({"name": "Tom"})
conn.request("POST", "/api", body, {"Content-Type": "application/json"})
```

---

## urllib.request 请求

**基本写法：发起 GET 请求**
`urllib.request.urlopen(<URL>)`
```python
# 最简方式打开 URL
from urllib.request import urlopen
resp = urlopen("https://www.example.com")
html = resp.read().decode("utf-8")
```

**基本写法：构造 Request 对象**
`urllib.request.Request(<URL>, headers=<头>)`
```python
# 自定义请求头
from urllib.request import Request, urlopen
req = Request("https://example.com", headers={"User-Agent": "MyApp"})
resp = urlopen(req)
```

**基本写法：POST 请求**
`urlopen(<Request>, data=<字节串>)`
```python
# 发送表单数据
from urllib.parse import urlencode
data = urlencode({"q": "python"}).encode()
resp = urlopen(Request("https://example.com", data=data))
```

---

## urllib.parse URL 处理

**基本写法：URL 编码**
`urllib.parse.urlencode(<字典>)`
```python
# 字典转查询字符串
from urllib.parse import urlencode
print(urlencode({"a": 1, "b": "中文"}))  # a=1&b=%E4%B8%AD%E6%96%87
```

**基本写法：解析 URL**
`urllib.parse.urlparse(<URL>)`
```python
# 拆解 URL 各部分
from urllib.parse import urlparse
r = urlparse("https://a.com/path?q=1#frag")
print(r.scheme, r.netloc, r.path)  # https a.com /path
```

**基本写法：拼接 URL**
`urllib.parse.urljoin(<基础URL>, <相对路径>)`
```python
# 基于基础 URL 拼接相对路径
from urllib.parse import urljoin
print(urljoin("https://a.com/dir/", "page.html"))  # https://a.com/dir/page.html
```

**基本写法：解析查询字符串**
`urllib.parse.parse_qs(<查询串>)`
```python
# 查询字符串转字典
from urllib.parse import parse_qs
print(parse_qs("a=1&b=2&b=3"))  # {'a': ['1'], 'b': ['2', '3']}
```

---

## urllib.error 异常处理

**基本写法：捕获 HTTP 错误**
`urllib.error.HTTPError`
```python
# 处理 HTTP 状态码错误
from urllib.request import urlopen
from urllib.error import HTTPError, URLError
try:
    resp = urlopen("https://example.com/404")
except HTTPError as e:
    print(e.code, e.reason)  # 404 Not Found
except URLError as e:
    print(e.reason)
```
