---
order: 3
title: 性能与接口测试
module: 'software-testing'
category: 软件测试
difficulty: intermediate
description: 'LoadRunner 与 JMeter 性能测试、API 接口测试、Postman 工具使用、REST Assured 与接口 Mock。'
author: fanquanpp
updated: '2026-06-14'
related:
  - 'software-testing/测试基础与方法'
  - 'software-testing/功能与自动化测试'
  - 'software-testing/安全与移动测试'
  - 'software-testing/测试概念与原则'
prerequisites: []
---

## 1. 性能测试概述

### 1.1 性能测试分类

| 类型           | 目标                   | 典型指标           |
| :------------- | :--------------------- | :----------------- |
| **负载测试**   | 系统在预期负载下的表现 | 响应时间、吞吐量   |
| **压力测试**   | 系统的极限承载能力     | 最大并发、崩溃点   |
| **稳定性测试** | 长时间运行的可靠性     | 内存泄漏、性能衰减 |
| **尖峰测试**   | 突发流量下的表现       | 恢复时间、错误率   |
| **容量测试**   | 系统最大处理能力       | 数据量上限         |

### 1.2 性能指标

| 指标           | 英文             | 说明                     |
| :------------- | :--------------- | :----------------------- |
| **响应时间**   | Response Time    | 请求发出到收到响应的时间 |
| **吞吐量**     | Throughput       | 单位时间处理的请求数     |
| **并发用户数** | Concurrent Users | 同时在线的用户数         |
| **TPS**        | Transactions/s   | 每秒事务数               |
| **QPS**        | Queries/s        | 每秒查询数               |
| **错误率**     | Error Rate       | 失败请求占总请求的比例   |
| **CPU 利用率** | CPU Usage        | 服务器 CPU 使用率        |
| **内存利用率** | Memory Usage     | 服务器内存使用率         |

## 2. JMeter 性能测试

### 2.1 JMeter 核心概念

```
测试计划 (Test Plan)
├── 线程组 (Thread Group)        ← 模拟并发用户
│   ├── HTTP 请求采样器          ← 发送请求
│   ├── JSON 提取器             ← 提取响应数据
│   ├── 断言                    ← 验证结果
│   └── 监听器                  ← 收集结果
├── 配置元件
│   ├── HTTP 请求默认值
│   └── CSV 数据文件设置
└── 前置/后置处理器
```

### 2.2 JMeter 脚本示例（.jmx 结构）

```xml
<!-- 线程组配置：模拟 100 并发用户 -->
<ThreadGroup guiclass="ThreadGroupGui" testclass="ThreadGroup" testname="用户登录压测">
  <intProp name="ThreadGroup.num_threads">100</intProp>
  <intProp name="ThreadGroup.ramp_time">10</intProp>  <!-- 10秒内启动100线程 -->
  <boolProp name="ThreadGroup.same_user_on_next_iteration">true</boolProp>
  <stringProp name="ThreadGroup.on_sample_error">continue</stringProp>
  <elementProp name="ThreadGroup.main_controller" elementType="LoopController">
    <stringProp name="LoopController.loops">50</stringProp>  <!-- 每线程循环50次 -->
  </elementProp>
</ThreadGroup>

<!-- HTTP 请求采样器 -->
<HTTPSamplerProxy guiclass="HttpTestSampleGui" testclass="HTTPSamplerProxy" testname="登录接口">
  <stringProp name="HTTPSampler.domain">api.example.com</stringProp>
  <stringProp name="HTTPSampler.port">443</stringProp>
  <stringProp name="HTTPSampler.protocol">https</stringProp>
  <stringProp name="HTTPSampler.path">/api/login</stringProp>
  <stringProp name="HTTPSampler.method">POST</stringProp>
  <boolProp name="HTTPSampler.use_keepalive">true</boolProp>
  <stringProp name="Argument.value">{"username":"admin","password":"123456"}</stringProp>
</HTTPSamplerProxy>
```

### 2.3 JMeter 命令行执行

```bash
# 非GUI模式执行（推荐用于压测）
jmeter -n -t login_test.jmx -l results.jtl -e -o report/

# 参数说明
# -n  非GUI模式
# -t  测试计划文件
# -l  结果日志文件
# -e  生成HTML报告
# -o  报告输出目录

# 远程分布式压测
jmeter -n -t test.jmx -R server1:1099,server2:1099 -l results.jtl
```

### 2.4 性能测试结果分析

| 指标         | 合格标准     | 需关注     | 严重     |
| :----------- | :----------- | :--------- | :------- |
| **响应时间** | < 200ms      | 200ms - 1s | > 1s     |
| **错误率**   | < 0.1%       | 0.1% - 1%  | > 1%     |
| **TPS**      | 满足业务需求 | 接近瓶颈   | 明显下降 |
| **CPU**      | < 70%        | 70% - 85%  | > 85%    |
| **内存**     | < 70%        | 70% - 85%  | > 85%    |

## 3. LoadRunner 性能测试

### 3.1 LoadRunner 组件

| 组件           | 功能               |
| :------------- | :----------------- |
| **VuGen**      | 虚拟用户脚本生成器 |
| **Controller** | 场景设计与执行控制 |
| **Analysis**   | 结果分析与报告生成 |

### 3.2 脚本录制与增强

```c
// LoadRunner 脚本示例（C语言）
Action()
{
    // 事务开始
    lr_start_transaction("login");

    // 设置参数化
    web_submit_data("login",
        "Action=https://api.example.com/login",
        "Method=POST",
        "RecContentType=application/json",
        ITEMDATA,
        "Name=username", "Value={username}", ENDITEM,  // 参数化
        "Name=password", "Value={password}", ENDITEM,
        LAST);

    // 检查点
    web_reg_find("Text=token",
        "SaveCount=token_count",
        LAST);

    // 事务结束
    if (atoi(lr_eval_string("{token_count}")) > 0) {
        lr_end_transaction("login", LR_PASS);
    } else {
        lr_end_transaction("login", LR_FAIL);
    }

    // 思考时间
    lr_think_time(3);

    return 0;
}
```

### 3.3 场景设计

| 场景类型     | 说明                 | 适用     |
| :----------- | :------------------- | :------- |
| **手动场景** | 手动设置虚拟用户数   | 精确控制 |
| **目标场景** | 设定目标指标自动调整 | 目标导向 |
| **真实场景** | 基于生产流量回放     | 接近真实 |

## 4. API 接口测试

### 4.1 接口测试要点

| 测试维度     | 说明                        |
| :----------- | :-------------------------- |
| **功能验证** | 接口返回数据是否正确        |
| **参数验证** | 必填/选填、类型、范围、边界 |
| **异常处理** | 错误码、错误信息是否合理    |
| **安全性**   | 认证、授权、SQL注入、XSS    |
| **性能**     | 响应时间、并发能力          |
| **兼容性**   | 不同版本接口的向下兼容      |

### 4.2 REST Assured（Java）

```java
import io.restassured.RestAssured;
import io.restassured.http.ContentType;
import org.junit.jupiter.api.Test;
import static io.restassured.RestAssured.*;
import static org.hamcrest.Matchers.*;

class UserApiTest {

    @Test
    void testGetUser() {
        given()
            .baseUri("https://api.example.com")
            .header("Authorization", "Bearer token_value")
        .when()
            .get("/users/1")
        .then()
            .statusCode(200)
            .body("id", equalTo(1))
            .body("name", not(emptyString()))
            .body("email", containsString("@"));
    }

    @Test
    void testCreateUser() {
        given()
            .baseUri("https://api.example.com")
            .contentType(ContentType.JSON)
            .body("{\"name\":\"张三\",\"email\":\"zhangsan@example.com\"}")
        .when()
            .post("/users")
        .then()
            .statusCode(201)
            .body("id", greaterThan(0))
            .body("name", equalTo("张三"));
    }

    @Test
    void testUpdateUser() {
        given()
            .baseUri("https://api.example.com")
            .contentType(ContentType.JSON)
            .header("Authorization", "Bearer token_value")
            .body("{\"name\":\"李四\"}")
        .when()
            .put("/users/1")
        .then()
            .statusCode(200)
            .body("name", equalTo("李四"));
    }

    @Test
    void testDeleteUser() {
        given()
            .baseUri("https://api.example.com")
            .header("Authorization", "Bearer token_value")
        .when()
            .delete("/users/1")
        .then()
            .statusCode(204);
    }

    @Test
    void testNotFound() {
        given()
            .baseUri("https://api.example.com")
        .when()
            .get("/users/99999")
        .then()
            .statusCode(404)
            .body("error", equalTo("Not Found"));
    }
}
```

## 5. Postman 工具

### 5.1 请求构建

```
POST https://api.example.com/api/login
Headers:
  Content-Type: application/json
Body (raw JSON):
{
  "username": "admin",
  "password": "123456"
}
```

### 5.2 环境变量

```javascript
// 设置环境变量
pm.environment.set('base_url', 'https://api.example.com');
pm.environment.set('token', pm.response.json().token);

// 获取环境变量
const baseUrl = pm.environment.get('base_url');
const token = pm.environment.get('token');

// 环境配置
// 开发环境: base_url = https://dev.api.example.com
// 测试环境: base_url = https://test.api.example.com
// 生产环境: base_url = https://api.example.com
```

### 5.3 断言脚本

```javascript
// 状态码断言
pm.test('状态码为 200', function () {
  pm.response.to.have.status(200);
});

// 响应体断言
pm.test('返回 token', function () {
  const json = pm.response.json();
  pm.expect(json.token).to.be.a('string');
  pm.expect(json.token.length).to.be.above(0);
});

// 响应头断言
pm.test('Content-Type 为 JSON', function () {
  pm.response.to.have.header('Content-Type', 'application/json; charset=utf-8');
});

// 响应时间断言
pm.test('响应时间小于 500ms', function () {
  pm.expect(pm.response.responseTime).to.be.below(500);
});

// JSON Schema 验证
pm.test('响应符合 Schema', function () {
  const schema = {
    type: 'object',
    required: ['id', 'name', 'email'],
    properties: {
      id: { type: 'integer' },
      name: { type: 'string' },
      email: { type: 'string', format: 'email' },
    },
  };
  pm.expect(tv4.validate(pm.response.json(), schema)).to.be.true;
});
```

### 5.4 Collection Runner

```javascript
// 集合执行顺序与数据传递

// 1. 登录接口 - 保存 token
pm.test('保存 token', function () {
  const json = pm.response.json();
  pm.environment.set('auth_token', json.token);
});

// 2. 后续接口 - 使用 token
// Headers 中: Authorization: Bearer {{auth_token}}

// 3. 数据清理 - 删除测试数据
pm.sendRequest({
  url: pm.environment.get('base_url') + '/test/cleanup',
  method: 'POST',
  header: { Authorization: 'Bearer ' + pm.environment.get('auth_token') },
});
```

## 6. 接口 Mock

### 6.1 Mock 概述

Mock 是模拟接口行为的技术，用于在依赖服务不可用或未开发完成时进行测试。

### 6.2 Python Mock 示例

```python
from unittest.mock import Mock, patch
import pytest
import requests

# 被测函数
def get_user_info(user_id: int) -> dict:
    response = requests.get(f"https://api.example.com/users/{user_id}")
    if response.status_code == 200:
        return response.json()
    return None

# 使用 Mock 测试
class TestGetUserInfo:
    @patch('requests.get')
    def test_get_user_success(self, mock_get):
        # 配置 Mock 返回值
        mock_get.return_value = Mock(
            status_code=200,
            json=lambda: {"id": 1, "name": "张三", "email": "zhangsan@example.com"}
        )

        result = get_user_info(1)

        assert result["id"] == 1
        assert result["name"] == "张三"
        mock_get.assert_called_once_with("https://api.example.com/users/1")

    @patch('requests.get')
    def test_get_user_not_found(self, mock_get):
        mock_get.return_value = Mock(status_code=404, json=lambda: {})

        result = get_user_info(99999)

        assert result is None
```

### 6.3 Flask Mock Server

```python
from flask import Flask, jsonify, request

app = Flask(__name__)

# 模拟用户接口
@app.route('/api/users/<int:user_id>', methods=['GET'])
def get_user(user_id):
    users = {
        1: {"id": 1, "name": "张三", "email": "zhangsan@example.com"},
        2: {"id": 2, "name": "李四", "email": "lisi@example.com"},
    }
    user = users.get(user_id)
    if user:
        return jsonify(user)
    return jsonify({"error": "Not Found"}), 404

# 模拟登录接口
@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    if data.get("username") == "admin" and data.get("password") == "123456":
        return jsonify({"token": "mock_token_12345", "user_id": 1})
    return jsonify({"error": "Invalid credentials"}), 401

if __name__ == '__main__':
    app.run(port=5000)
```

### 6.4 Mock 工具对比

| 工具              | 类型      | 特点                | 适用场景   |
| :---------------- | :-------- | :------------------ | :--------- |
| **unittest.mock** | Python 库 | 代码级 Mock         | 单元测试   |
| **Flask Mock**    | 轻量服务  | 快速搭建模拟 API    | 开发联调   |
| **WireMock**      | 独立服务  | 丰富的请求匹配规则  | 集成测试   |
| **MockServer**    | 独立服务  | Java 生态，功能强大 | 企业级项目 |
| **Postman Mock**  | 内置功能  | 与 Collection 集成  | API 测试   |
