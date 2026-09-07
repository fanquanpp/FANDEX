---
order: 130
title: API 自动化测试
module: 'software-testing'
category: 云与基础设施
difficulty: intermediate
description: API自动化测试：RESTful API测试、工具选型、断言策略与框架设计详解。
author: fanquanpp
updated: '2026-08-30'
related:
  - 'software-testing/015-WhiteBoxTestCoverage'
prerequisites:
  - 'software-testing/001-TestBasicsMethod'
---

## 1. API 测试概述

### 1.1 什么是 API 测试

API 测试是在没有用户界面的情况下，直接对应用程序编程接口进行测试，验证接口的功能、性能和安全性。

### 1.2 与 UI 测试对比

| 对比项   | API 测试   | UI 测试  |
| -------- | ---------- | -------- |
| 速度     | 快（毫秒） | 慢（秒） |
| 稳定性   | 高         | 低       |
| 覆盖率   | 高         | 中       |
| 维护成本 | 低         | 高       |
| 反馈速度 | 快         | 慢       |

### 1.3 测试层级

```
契约测试 → 功能测试 → 集成测试 → 端到端测试
```

## 2. 工具选型

| 工具              | 语言    | 特点               |
| ----------------- | ------- | ------------------ |
| Postman           | GUI     | 易上手、Collection |
| REST Assured      | Java    | 强大、灵活         |
| Requests + pytest | Python  | 轻量、灵活         |
| SuperTest         | Node.js | JS 生态            |
| Karate            | DSL     | BDD 风格           |
| HttpRunner        | Python  | 中文友好           |

## 3. Python API 测试框架

### 3.1 基础封装

```python
import requests

class APIClient:
    def __init__(self, base_url):
        self.base_url = base_url
        self.session = requests.Session()
        self.token = None

    def set_token(self, token):
        self.token = token
        self.session.headers.update({"Authorization": f"Bearer {token}"})

    def get(self, path, **kwargs):
        return self.session.get(f"{self.base_url}{path}", **kwargs)

    def post(self, path, json=None, **kwargs):
        return self.session.post(f"{self.base_url}{path}", json=json, **kwargs)

    def put(self, path, json=None, **kwargs):
        return self.session.put(f"{self.base_url}{path}", json=json, **kwargs)

    def delete(self, path, **kwargs):
        return self.session.delete(f"{self.base_url}{path}", **kwargs)
```

### 3.2 测试用例

```python
import pytest

@pytest.fixture
def api():
    client = APIClient("https://api.example.com")
    # 登录获取 Token
    response = client.post("/auth/login", json={
        "username": "admin",
        "password": "password123"
    })
    client.set_token(response.json()["token"])
    return client

class TestUserAPI:

    def test_create_user(self, api):
        response = api.post("/api/users", json={
            "name": "Alice",
            "email": "alice@example.com"
        })
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Alice"
        assert "id" in data

    def test_get_user(self, api):
        # 先创建
        create_resp = api.post("/api/users", json={
            "name": "Bob", "email": "bob@example.com"
        })
        user_id = create_resp.json()["id"]

        # 再查询
        response = api.get(f"/api/users/{user_id}")
        assert response.status_code == 200
        assert response.json()["name"] == "Bob"

    def test_update_user(self, api):
        create_resp = api.post("/api/users", json={
            "name": "Charlie", "email": "charlie@example.com"
        })
        user_id = create_resp.json()["id"]

        response = api.put(f"/api/users/{user_id}", json={
            "name": "Charlie Updated"
        })
        assert response.status_code == 200
        assert response.json()["name"] == "Charlie Updated"

    def test_delete_user(self, api):
        create_resp = api.post("/api/users", json={
            "name": "David", "email": "david@example.com"
        })
        user_id = create_resp.json()["id"]

        response = api.delete(f"/api/users/{user_id}")
        assert response.status_code == 204

        # 验证已删除
        get_resp = api.get(f"/api/users/{user_id}")
        assert get_resp.status_code == 404
```

## 4. 断言策略

### 4.1 状态码断言

```python
assert response.status_code == 200
assert response.status_code in [200, 201]
```

### 4.2 响应体断言

```python
# JSON Schema 验证
from jsonschema import validate

schema = {
    "type": "object",
    "required": ["id", "name", "email"],
    "properties": {
        "id": {"type": "integer"},
        "name": {"type": "string"},
        "email": {"type": "string", "format": "email"}
    }
}

validate(instance=response.json(), schema=schema)
```

### 4.3 响应时间断言

```python
assert response.elapsed.total_seconds() < 2.0
```

### 4.4 响应头断言

```python
assert "application/json" in response.headers["Content-Type"]
assert "X-Request-Id" in response.headers
```

## 5. 数据驱动测试

### 5.1 YAML 数据文件

```yaml
# testdata/users.yaml
create_user:
  - name: 'Alice'
    email: 'alice@example.com'
    expected_status: 201
  - name: ''
    email: 'invalid'
    expected_status: 400
  - name: 'Bob'
    email: ''
    expected_status: 400
```

### 5.2 参数化测试

```python
import yaml

@pytest.fixture
def user_test_data():
    with open("testdata/users.yaml") as f:
        return yaml.safe_load(f)["create_user"]

@pytest.mark.parametrize("data", user_test_data(), ids=lambda d: d["name"])
def test_create_user_data_driven(api, data):
    response = api.post("/api/users", json={
        "name": data["name"],
        "email": data["email"]
    })
    assert response.status_code == data["expected_status"]
```

## 6. 契约测试

### 6.1 Pact 框架

```python
from pact import Consumer, Provider

pact = Consumer('WebApp').has_pact_with(Provider('API'))

(pact
 .given('user exists')
 .upon_receiving('a request for user')
 .with_request('GET', '/api/users/1')
 .will_respond_with(200, body={
     'id': 1,
     'name': 'Alice'
 }))

with pact:
    result = api.get('/api/users/1')
    assert result.json()['name'] == 'Alice'
```

## 7. 最佳实践

| 实践     | 描述                    |
| -------- | ----------------------- |
| 分层封装 | Client → Service → Test |
| 数据工厂 | 自动创建测试数据        |
| 清理数据 | 测试后清理              |
| 环境隔离 | 测试环境独立            |
| 幂等设计 | 重复执行结果一致        |
| 并发安全 | 测试间无依赖            |
| 日志记录 | 请求/响应完整记录       |
## requests 基础请求

**基本写法：发送 HTTP 请求**
`import requests`
`requests.<method>(<url>, **<kwargs>)`

```python
# requests 发送各类 HTTP 请求
import requests

r = requests.get("https://api.example.com/users")
r = requests.post("https://api.example.com/users", json={"name": "Alice"})
r = requests.put(url, json=data)
r = requests.delete(url)
```

---

## 响应对象

**基本写法：访问响应内容**
`<response>.status_code`
`<response>.json()`
`<response>.text`
`<response>.headers`

```python
# 访问 HTTP 响应
r = requests.get("https://api.example.com/users")
assert r.status_code == 200
data = r.json()
content = r.text
headers = r.headers
```

---

## 请求参数

**基本写法：传递查询参数与请求体**
`requests.get(<url>, params=<字典>)`
`requests.post(<url>, json=<字典>|data=<字典>)`

```python
# 查询参数与请求体
params = {"page": 1, "size": 10}
r = requests.get(url, params=params)

payload = {"name": "Alice", "age": 30}
r = requests.post(url, json=payload)
r = requests.post(url, data=payload)
```

---

## 请求头与认证

**基本写法：设置请求头与认证**
`requests.get(<url>, headers=<字典>, auth=(<user>, <pass>))`

```python
# 自定义请求头与 Basic 认证
headers = {"Authorization": "Bearer token", "Content-Type": "application/json"}
r = requests.get(url, headers=headers)
r = requests.get(url, auth=("user", "pass"))
```

---

## pytest 集成 API 测试

**换行写法：pytest 测试 API**
`def test_<名称>():`
`    r = requests.<method>(<url>)`
`    assert r.status_code == <期望>`

```python
# pytest 测试 API 接口
import requests

def test_get_users():
    r = requests.get("https://api.example.com/users")
    assert r.status_code == 200
    assert isinstance(r.json(), list)

def test_create_user():
    r = requests.post(url, json={"name": "Alice"})
    assert r.status_code == 201
    assert r.json()["name"] == "Alice"
```

---

## TestClient FastAPI 测试

**换行写法：FastAPI 测试客户端**
`from fastapi.testclient import TestClient`
`client = TestClient(<app>)`
`response = client.<method>("<路径>")`

```python
# FastAPI 内置测试客户端
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"msg": "hello"}
```

---

## responses 模拟 HTTP

**换行写法：使用 responses 拦截请求**
`@responses.activate`
`def test_<名称>():`
`    responses.add(responses.GET, <url>, json=<数据>, status=<状态码>)`

```python
# responses 库模拟 HTTP 响应
import responses
import requests

@responses.activate
def test_mock_api():
    responses.add(
        responses.GET,
        "https://api.example.com/users",
        json={"id": 1},
        status=200,
    )
    r = requests.get("https://api.example.com/users")
    assert r.json() == {"id": 1}
```

---

## httpx 异步测试

**换行写法：httpx 异步客户端**
`async with httpx.AsyncClient() as client:`
`    response = await client.<method>(<url>)`

```python
# httpx 异步 API 测试
import httpx
import pytest

@pytest.mark.asyncio
async def test_async_api():
    async with httpx.AsyncClient() as client:
        response = await client.get("https://api.example.com/users")
        assert response.status_code == 200
```

---

## JSON Schema 验证

**换行写法：验证响应结构**
`from jsonschema import validate`
`validate(instance=<数据>, schema=<schema>)`

```python
# 验证 JSON 响应符合 schema
from jsonschema import validate

schema = {
    "type": "object",
    "properties": {
        "id": {"type": "integer"},
        "name": {"type": "string"},
    },
    "required": ["id", "name"],
}

def test_response_schema():
    data = response.json()
    validate(instance=data, schema=schema)
```

---

## 参数化 API 测试

**换行写法：参数化测试多个接口**
`@pytest.mark.parametrize("<参数>", [<数据>])`
`def test_<名称>(<参数>): <调用与断言>`

```python
# 参数化测试多个用例
import pytest
import requests

@pytest.mark.parametrize("user_id, expected_name", [
    (1, "Alice"),
    (2, "Bob"),
    (3, "Charlie"),
])
def test_get_user(user_id, expected_name):
    r = requests.get(f"https://api.example.com/users/{user_id}")
    assert r.json()["name"] == expected_name
```

---

## 会话管理

**换行写法：使用 Session 保持会话**
`s = requests.Session()`
`s.headers.update(<头>)`
`r = s.<method>(<url>)`

```python
# Session 保持 Cookie 与连接
s = requests.Session()
s.headers.update({"Authorization": "Bearer token"})

r = s.post(url, json={"name": "Alice"})
r = s.get(url)  # 复用会话
s.close()
```

---

## 超时与重试

**基本写法：设置超时与自动重试**
`requests.<method>(<url>, timeout=<秒>)`
`from requests.adapters import HTTPAdapter`
`s.mount("<前缀>", HTTPAdapter(max_retries=<n>))`

```python
# 超时设置与自动重试
import requests
from requests.adapters import HTTPAdapter

r = requests.get(url, timeout=5)

s = requests.Session()
adapter = HTTPAdapter(max_retries=3)
s.mount("https://", adapter)
```

---

## pytest-httpserver 本地服务器

**换行写法：启动本地 HTTP 服务器**
`with HTTPServer() as httpserver:`
`    httpserver.expect_request("<路径>").respond_with_json(<数据>)`
`    requests.get(httpserver.url_for("<路径>"))`

```python
# pytest-httpserver 启动本地 Mock 服务器
from pytest_httpserver import HTTPServer
import requests

def test_local_server():
    with HTTPServer() as httpserver:
        httpserver.expect_request("/api").respond_with_json({"ok": True})
        r = requests.get(httpserver.url_for("/api"))
        assert r.json() == {"ok": True}
```
