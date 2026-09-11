---
order: 330
title: Python httpx 与 requests
module: 'python'
category: 后端技术
difficulty: beginner
description: Python httpx 与 requests 的完整教学讲解。
author: fanquanpp
updated: '2026-09-12'
related: []
prerequisites: []
---

## httpx 客户端

**基本写法：创建客户端**
`httpx.Client()`
```python
# 同步客户端
import httpx

with httpx.Client() as client:
    resp = client.get("https://www.python.org")
```

**基本写法：AsyncClient**
`httpx.AsyncClient()`
```python
# 异步客户端
async with httpx.AsyncClient() as client:
    resp = await client.get("https://www.python.org")
```

**基本写法：get 请求**
`client.get(<URL>)`
```python
# GET 请求
resp = httpx.get("https://www.python.org")
print(resp.status_code)
```

**基本写法：post 请求**
`client.post(<URL>, json=<数据>)`
```python
# POST JSON
resp = httpx.post("https://httpbin.org/post", json={"name": "Alice"})
```

---

## httpx 响应

**基本写法：状态码**
`resp.status_code`
```python
# 状态码
print(resp.status_code)
```

**基本写法：响应文本**
`resp.text`
```python
# 文本内容
print(resp.text[:100])
```

**基本写法：响应 JSON**
`resp.json()`
```python
# JSON 内容
data = resp.json()
```

**基本写法：响应字节**
`resp.content`
```python
# 字节内容
print(resp.content[:50])
```

**基本写法：响应头**
`resp.headers`
```python
# 响应头
print(resp.headers["content-type"])
```

---

## httpx 请求配置

**基本写法：超时**
`httpx.Timeout(<秒>)` | `timeout=<秒>`
```python
# 超时配置
client = httpx.Client(timeout=10.0)
client = httpx.Client(timeout=httpx.Timeout(5.0, connect=2.0))
```

**基本写法：headers**
`client.headers[<键>] = <值>`
```python
# 默认请求头
client = httpx.Client(headers={"User-Agent": "MyClient/1.0"})
```

**基本写法：auth 认证**
`httpx.BasicAuth(<用户>, <密码>)`
```python
# 基本认证
client = httpx.Client(auth=httpx.BasicAuth("user", "pass"))
```

**基本写法：proxy 代理**
`httpx.Client(proxy=<URL>)`
```python
# 代理设置
client = httpx.Client(proxy="http://proxy:8080")
```

**基本写法：params 查询参数**
`client.get(<URL>, params=<字典>)`
```python
# 查询参数
resp = client.get("https://httpbin.org/get", params={"q": "python", "page": 1})
```

---

## httpx 会话管理

**基本写法：with 自动关闭**
`with httpx.Client() as client:`
```python
# 自动管理连接
with httpx.Client(base_url="https://api.example.com") as client:
    r1 = client.get("/users")
    r2 = client.get("/posts")
```

**基本写法：base_url 基础 URL**
`httpx.Client(base_url=<URL>)`
```python
# 基础 URL
client = httpx.Client(base_url="https://api.example.com")
r = client.get("/users")
```

---

## httpx 流式响应

**基本写法：stream 流式读取**
`with client.stream("GET", <URL>) as resp:`
```python
# 流式响应
with httpx.stream("GET", "https://example.com/big") as resp:
    for chunk in resp.iter_bytes(chunk_size=1024):
        print(len(chunk))
```

**基本写法：iter_lines**
`for line in resp.iter_lines():`
```python
# 按行迭代
with client.stream("GET", url) as resp:
    for line in resp.iter_lines():
        print(line)
```

---

## requests 库

**基本写法：get 请求**
`requests.get(<URL>, params=<字典>)`
```python
# requests GET
import requests

resp = requests.get("https://www.python.org", params={"q": "python"})
print(resp.status_code)
```

**基本写法：post 请求**
`requests.post(<URL>, data=<数据>, json=<JSON>)`
```python
# POST 表单与 JSON
r = requests.post(url, data={"key": "value"})
r = requests.post(url, json={"name": "Alice"})
```

**基本写法：自定义 headers**
`requests.get(<URL>, headers=<字典>)`
```python
# 自定义头
r = requests.get(url, headers={"User-Agent": "MyClient/1.0"})
```

**基本写法：timeout 超时**
`requests.get(<URL>, timeout=<秒>)`
```python
# 超时设置
r = requests.get(url, timeout=10)
```

---

## requests Session 会话

**基本写法：Session 复用连接**
`requests.Session()`
```python
# Session 保持 Cookie 与连接
s = requests.Session()
s.headers.update({"Authorization": "Bearer token"})
r1 = s.get(url)
r2 = s.get(url)
s.close()
```

**基本写法：with 自动关闭**
`with requests.Session() as s:`
```python
# 自动关闭会话
with requests.Session() as s:
    r = s.get(url)
```

---

## requests 响应

**基本写法：响应内容**
`r.text` | `r.json()` | `r.content`
```python
# 响应内容
print(r.text)
print(r.json())
print(r.content)
```

**基本写法：状态检查**
`r.raise_for_status()`
```python
# 状态码非 2xx 抛出异常
r = requests.get(url)
r.raise_for_status()
```

**基本写法：响应头**
`r.headers`
```python
# 响应头
print(r.headers["Content-Type"])
```

**基本写法：cookies**
`r.cookies`
```python
# 响应 Cookie
print(r.cookies.get("session"))
```

---

## requests 认证

**基本写法：basic auth**
`requests.auth.HTTPBasicAuth(<用户>, <密码>)`
```python
# 基本认证
from requests.auth import HTTPBasicAuth

r = requests.get(url, auth=HTTPBasicAuth("user", "pass"))
```

**基本写法：bearer token**
`headers={"Authorization": "Bearer <token>"}`
```python
# Bearer Token
r = requests.get(url, headers={"Authorization": "Bearer abc123"})
```

---

## requests 异常处理

**基本写法：捕获异常**
`except requests.RequestException:`
```python
# requests 异常基类
try:
    r = requests.get(url, timeout=5)
    r.raise_for_status()
except requests.Timeout:
    print("超时")
except requests.HTTPError as e:
    print("HTTP 错误:", e)
except requests.RequestException as e:
    print("请求异常:", e)
```

---

## 文件上传与下载

**基本写法：上传文件**
`requests.post(<URL>, files={<字段>: <文件>})`
```python
# multipart 上传
with open("data.txt", "rb") as f:
    r = requests.post(url, files={"file": f})
```

**基本写法：下载文件**
`with open(<路径>, "wb") as f:\n    f.write(r.content)`
```python
# 下载二进制
r = requests.get(url)
with open("image.png", "wb") as f:
    f.write(r.content)
```

**基本写法：流式下载**
`requests.get(<URL>, stream=True)`
```python
# 大文件流式下载
r = requests.get(url, stream=True)
with open("big.zip", "wb") as f:
    for chunk in r.iter_content(chunk_size=8192):
        f.write(chunk)
```
