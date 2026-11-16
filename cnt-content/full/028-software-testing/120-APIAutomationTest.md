---
order: 170
title: API 自动化测试
module: 'software-testing'
category: 云与基础设施
difficulty: intermediate
description: API自动化测试：RESTful API测试、工具选型、断言策略与框架设计详解。
author: fanquanpp
updated: '2026-10-11'
related:
  - 'software-testing/070-WhiteBoxTestCoverage'
prerequisites:
  - 'software-testing/010-TestBasicsMethod'
---

## 1. API 测试概述

### 1.1 什么是 API 测试

API 测试是在没有用户界面的情况下，直接对应用程序编程接口进行测试，验证接口的功能、性能和安全性。
它绕过浏览器渲染层，执行快、定位准，是自动化测试投入产出比最高的一层。

前置知识：HTTP 协议基础（方法、状态码、请求头）、JSON、pytest 基本用法。

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

## 7. 常见陷阱

| 陷阱                       | 说明与规避                                                     |
| -------------------------- | -------------------------------------------------------------- |
| 只断言状态码               | 200 不代表业务正确，必须同时校验响应体关键字段                 |
| 不设超时                   | `requests` 默认不超时，一条挂起请求能卡死整个流水线；始终传 `timeout=5` 这类显式值 |
| 用例间数据耦合             | 用例 B 依赖用例 A 创建的数据，并行执行必然互踩；每条用例自建自清 |
| 硬编码环境地址             | base_url、账号一律走配置或环境变量，本地/CI 各跑各的           |
| 忽略响应时间以外的性能信号 | 偶发的慢接口要靠多次采样与分位值（P95/P99）观察，单次 `elapsed` 不可靠 |

## 8. 最佳实践

| 实践     | 描述                    |
| -------- | ----------------------- |
| 分层封装 | Client → Service → Test |
| 数据工厂 | 自动创建测试数据        |
| 清理数据 | 测试后清理              |
| 环境隔离 | 测试环境独立            |
| 幂等设计 | 重复执行结果一致        |
| 并发安全 | 测试间无依赖            |
| 日志记录 | 请求/响应完整记录       |

## 教学自检

以下题目按遮码自检法设计：先遮住参考答案自己写，再对照。

### 题 1：最小客户端封装（遮码题）

任务：用 `requests.Session` 封装一个 `APIClient`：构造时接收 `base_url`，
提供 `set_token` 把 Bearer Token 写进公共请求头，并暴露 `get/post`。

参考答案：

```python
class APIClient:
    def __init__(self, base_url):
        self.base_url = base_url
        self.session = requests.Session()

    def set_token(self, token):
        self.session.headers.update({"Authorization": f"Bearer {token}"})

    def get(self, path, **kwargs):
        return self.session.get(f"{self.base_url}{path}", **kwargs)

    def post(self, path, json=None, **kwargs):
        return self.session.post(f"{self.base_url}{path}", json=json, **kwargs)
```

自检：为什么更新 `session.headers` 而不是每次请求手工拼头？——Session 复用
连接池且公共头一次设置全局生效；逐请求拼头是「封装失效」的第一信号。

### 题 2：断言层次（遮码题）

任务：对 `POST /api/users` 的成功响应写完整断言：状态码、响应体关键字段。
再说明为什么「只断言状态码」不可靠。

参考答案：

```python
resp = api.post("/api/users", json={"name": "Alice", "email": "alice@example.com"})
assert resp.status_code == 201
data = resp.json()
assert data["name"] == "Alice"
assert "id" in data
```

200/201 只说明「请求被受理」，不说明「业务做对了」——服务端可能返回
200 加一个错误 JSON。断言要「结构（Schema）+ 关键值」两层。

### 题 3：数据驱动（遮码题）

任务：用 `parametrize` 对「合法用户返回 201、空名返回 400、非法邮箱返回
400」三组数据写一条参数化用例。

参考答案：

```python
@pytest.mark.parametrize("payload,expected", [
    ({"name": "Alice", "email": "a@example.com"}, 201),
    ({"name": "", "email": "a@example.com"}, 400),
    ({"name": "Bob", "email": "bad"}, 400),
])
def test_create_user(api, payload, expected):
    resp = api.post("/api/users", json=payload)
    assert resp.status_code == expected
```

自检：一条用例覆盖一个「规则维度 + 边界」，非法输入路径与合法路径
写在一起反而暴露参数化 ID 的定位价值——失败时 ID 直接指出哪组数据挂了。

### 题 4：陷阱归因（概念题）

任务：CI 上 API 用例偶发卡死几分钟。检查代码发现所有请求都没传 `timeout`。
解释机制，并给出另外两条「用例间互踩」的典型症状。

参考答案：`requests` 默认没有超时——服务端挂起时请求永远等待，整条
流水线被一条用例拖死；每个请求都应显式传 `timeout=5` 之类。互踩的另外
两个典型：用例 B 依赖用例 A 创建的数据（并行执行顺序不可控，B 随机失败）；
共享环境里的固定数据被多人/多任务同时修改（断言「列表第一行是 Alice」
而别人也插入了 Alice）。对策都是自建自清、用例隔离。

## 小结

- 初学者要点：用 `requests.Session` 封装一个带 base_url 与鉴权头的
  APIClient，每条用例「发请求 → 断状态码 → 断响应体」，配上 pytest
  参数化做数据驱动，就是一套可用的 API 自动化框架。
- 进阶注意：断言要「结构 + 关键值」两层；契约测试的完整展开（Pact 流程与工具链）见《API 测试工具链与契约测试》，其把「消费者
  期望什么」固化为可回归的契约，适合微服务间的接口防护网；性能维度
  交给专门的压测工具（JMeter/k6/Locust），不要在功能用例里顺带压测。
