---
order: 190
title: 接口测试方法
module: 'software-testing'
category: 云与基础设施
difficulty: beginner
description: '接口功能测试的三层断言意识：状态码、关键字段、结构；异常输入的返回语义；与 API 自动化、工具链、测试替身的分工地图。'
author: fanquanpp
updated: '2026-10-07'
related:
  - 'software-testing/120-APIAutomationTest'
  - 'software-testing/130-APITestToolchainAndContract'
  - 'software-testing/190-TestDouble'
  - 'software-testing/140-PerformanceTestingMethod'
prerequisites:
  - 'software-testing/010-TestBasicsMethod'
---

## 知识点地图

- **知识类别**：接口功能测试方法（API 测试家族的方法论分支）。
- **解决什么问题**：接口「请求对了、响应对不对」——它与性能压测（扛多少）是两个问题；只断言状态码 200 的接口测试几乎等于没测。
- **什么时候用到**：为接口设计第一份测试用例集时；评审别人接口用例时；接口自动化的断言总「假绿」要排查时；上游服务改动前后要守护兼容性时。
- **同族文档分工**：《API 自动化测试》讲概念与 Python 框架；《API 测试工具链与契约测试》讲 Postman/Newman、REST Assured、Supertest 与契约；本篇讲**方法**（断言什么、怎么设计用例）；性能那一半（扛多少）见《性能测试方法》。

前置知识：HTTP 协议（方法、状态码、请求头）、JSON 结构。会用任一语言发 HTTP 请求即可，本文不绑定工具。

## 一、场景：一份只断言 200 的用例集

接手同事留下的接口用例集，全部长这样：

```python
def test_create_order(api):
    resp = api.post("/api/orders", json={"sku": "A001", "qty": 1})
    assert resp.status_code == 200
```

跑起来全绿。第二天库存服务把「商品不存在」的返回从 `200 + {"code": "SKU_NOT_FOUND"}` 改成了标准的 `404`，前端照常工作——用例集却红了。问题不在用例写错，在**断言的层次太浅**：它只验证了「连接还在」，没验证「业务对不对」。

## 二、三层断言：状态码、关键字段、结构

接口测试的核心不是工具，是**三层断言**的意识：

| 层次 | 断言什么 | 抓什么问题 |
| :--- | :--- | :--- |
| 1. 状态码 | 200/201/404/401/400 各就各位 | 路由、鉴权、参数校验的大类错误 |
| 2. 关键字段 | 响应里业务关键字段的**值**正确 | 业务逻辑错误（金额算错、状态机跳错） |
| 3. 结构 | 字段类型与必选项符合约定（JSON Schema） | 上游悄悄删字段、改类型、加脏字段 |

为什么状态码是最浅的一层：接口挂了仍返回 `200 + {"error": ...}` 的现实比想象中多——网关、旧版 BFF、错误码包装层都会这么干。只断言 200，等于把这层风险全部放行。

```python
# 同一个接口的三层完整写法
def test_create_order_full(api):
    resp = api.post("/api/orders", json={"sku": "A001", "qty": 1})

    # 第 1 层：状态码
    assert resp.status_code == 201

    # 第 2 层：关键字段的值（而不是"有这个字段"）
    body = resp.json()
    assert body["status"] == "PENDING"          # 状态机初态
    assert body["total"] == 9900                # 金额按分存储，业务正确性

    # 第 3 层：结构（Schema 见《API 测试工具链与契约测试》第 5 节）
    assert isinstance(body["items"], list) and len(body["items"]) == 1
    assert {"id", "status", "total", "items"} <= set(body.keys())  # 必备字段在
```

逐行说明取舍：第 2 层断言 `total == 9900` 是**具体值断言**，比 `assert "total" in body` 强一个量级——后者只证明字段存在，金额算错了照样绿。但具体值断言对数据构造有要求（用例要先确保 A001 的价格是 99 元），所以好的接口用例集总是「造数 - 断言 - 清数」三段式。`{"id",...} <= set(keys)` 用子集判断而不是全等，避免上游加一个无害的新字段就打破所有用例——结构要锁「必须有」，谨慎锁「不许多」（后者交给 Schema 的 `additionalProperties: False`）。

## 三、异常输入的返回语义

正向用例只验证了「接口存在」，**异常输入的返回语义**才体现接口质量。给每个接口至少配三类异常用例：

| 异常类别 | 输入示例 | 期望语义 |
| :--- | :--- | :--- |
| 参数缺失/非法 | `qty: 0`、`qty: -1`、`qty: "abc"` | 400 系，且错误信息能定位到字段 |
| 资源不存在 | 不存在的 `order_id` | 404，不是 200 包错误码 |
| 权限不足 | 用户 A 查用户 B 的订单 | 403/404，且响应体不泄露他人数据 |

```python
@pytest.mark.parametrize("qty,expected", [
    (0, 400),      # 零数量：非法
    (-1, 400),     # 负数：非法
    ("abc", 400),  # 类型错：非法
    (1, 201),      # 正常值：对照组
])
def test_order_qty_semantics(api, qty, expected):
    resp = api.post("/api/orders", json={"sku": "A001", "qty": qty})
    assert resp.status_code == expected
    if expected == 400:
        # 400 的响应体应指明错在哪个字段，而不是一句笼统的 "bad request"
        assert "qty" in resp.json()["message"]
```

这段代码值得讲的两处：`parametrize` 把「异常语义表」直接变成可执行的用例矩阵，加一类异常输入只加一行；对照组 `(1, 201)` 故意混在里面——如果接口整体挂了，异常用例全红会让你误以为「校验坏了」，对照组让失败原因一眼可辨。

三个场景例子：

1. **真实工程场景（幂等性验证）**：支付回调接口要能承受同一次通知的重放——同一笔回调发两次，第二次应返回与第一次相同的结果且不重复入账。这类「重复提交」用例属于异常语义里的重要一支。
2. **并发边界**：两个请求同时扣最后一件库存，期望恰好一个 201、一个 409（冲突）——异常语义不只针对单请求的坏输入，也针对竞争时序。
3. **字符集与转义**：昵称字段提交 `"<script>alert(1)</script>"` 与 emoji、超长字符串，期望要么被规范化存储、要么被拒绝，而不是把原始串原样回显到下游页面。

## 四、依赖没就绪：Mock 与替身的分工

接口测试常卡在「依赖的服务还没开发完」。解法是替身，但**要区分两种用途**：

- 给开发**联调**用的 Mock 图快：内存里现写一个 Flask 路由、甚至 `json-server` 起个假接口，能跑就行，随用随扔；
- 给**自动化测试**用的 Mock 必须可版本化、可进 CI（WireMock 这类）：否则上游接口一改，Mock 的假设悄悄过期，测试全绿而集成爆炸。

彻底解法是把「Mock 假设」升级为**契约测试**：消费方与提供方各自验证同一份契约文件，接口变更在 CI 阶段即被发现——理论与工具见《测试替身》第 5 节与《API 测试工具链与契约测试》第 6 节。

## 五、与性能测试的分界

本篇与《性能测试方法》测的是同一批接口的两个正交维度：

| 维度 | 问的问题 | 典型断言 | 工具 |
| :--- | :--- | :--- | :--- |
| 功能（本篇） | 响应**对不对** | 三层断言、异常语义 | pytest/Postman/REST Assured |
| 性能（《性能测试方法》） | 扛得住**多少** | P95、吞吐量、错误率 | k6/JMeter |

边界纪律：不要在功能用例里顺带压测（一次 `elapsed` 断言既测不出性能也污染功能结果），也不要在压测脚本里做深度字段断言（高负载下业务报错率上升是预期行为）。

## 动手实践

**任务**：给一个公开 API（如 `https://jsonplaceholder.typicode.com` 的 `/posts`）设计一份三层断言 + 异常语义用例集。

提示：
- 正向用例至少覆盖三层断言，关键字段断言具体值；
- 异常语义至少覆盖参数非法与资源不存在两类；
- 用 `parametrize` 组织异常矩阵，记得留对照组；
- 用 `{"必填字段"} <= set(body.keys())` 断言结构。

参考实现（先自己写，再对照）：

```python
import pytest, requests

BASE = "https://jsonplaceholder.typicode.com"

def test_get_post_three_layers():
    r = requests.get(f"{BASE}/posts/1", timeout=5)
    assert r.status_code == 200                       # 第 1 层
    body = r.json()
    assert body["userId"] == 1                        # 第 2 层：具体值
    assert isinstance(body["title"], str)             # 第 3 层：类型
    assert {"userId", "id", "title", "body"} <= set(body.keys())

@pytest.mark.parametrize("pid,expected", [(1, 200), (999999, 404), (0, 404)])
def test_get_post_semantics(pid, expected):
    r = requests.get(f"{BASE}/posts/{pid}", timeout=5)
    assert r.status_code == expected                  # 存在/不存在的返回语义

def test_create_post_returns_created():
    r = requests.post(f"{BASE}/posts", json={"title": "t", "body": "b", "userId": 1}, timeout=5)
    assert r.status_code == 201
    assert r.json()["id"] is not None                 # 创建类接口：201 + 新资源标识
```

## 坑点与自检

| 坑 | 现象 | 对策 |
| :--- | :--- | :--- |
| 只断言状态码 | 接口挂了返回 200 + 错误体照样绿 | 三层断言强制：码 + 值 + 结构 |
| 断言「有字段」不断言「值正确」 | 金额算错、状态跳错全放行 | 关键字段断具体值，数据自造自清 |
| 异常用例只测一个「错误密码」 | 资源不存在、权限不足全裸奔 | 三类异常语义矩阵化 |
| 功能用例里顺带断言响应时间 | 单次 elapsed 既不可靠又混淆目标 | 性能归压测，分位值见《性能测试方法》 |
| Mock 假设不过期管理 | 上游改字段，测试假绿、集成爆炸 | 版本化 Mock 或契约测试 |

自检清单：

- [ ] 接口用例集覆盖状态码、关键字段、结构三层断言
- [ ] 每个接口至少三类异常输入的返回语义用例
- [ ] 关键字段断言的是具体值，且测试数据自建自清
- [ ] 依赖服务的替身可版本化，或已升级为契约测试

## 练习

1. 给本篇开头的「只断言 200」用例集补全三层断言与异常语义，改造前后各跑一遍，记录它抓住的差异。
2. 找一个你项目里的真实接口，写出它的「异常语义表」（输入、期望状态码、期望响应体要点），并全部变成 `parametrize` 用例。
3. 故意把一个接口的响应加一个新字段、删一个旧字段，观察你的 Schema 与子集断言各自的反应，体会「锁必须」与「锁不许」的差别。

## 下一步

- Python 栈框架封装与数据驱动：见《API 自动化测试》。
- Postman/Newman、REST Assured、Supertest 与契约测试的工程化：见《API 测试工具链与契约测试》。
- 替身五分类与过度 Mock 的代价：见《测试替身》。
- 性能那一半（P95、吞吐、阶梯加压）：见《性能测试方法》。
