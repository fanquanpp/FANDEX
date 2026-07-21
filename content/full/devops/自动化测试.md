---
order: 57
title: 自动化测试
module: devops
category: 运维
difficulty: intermediate
description: 自动化测试：单元测试、集成测试、E2E测试、性能测试与测试策略
author: fanquanpp
updated: '2026-06-14'
related:
  - devops/性能调优
  - devops/高可用架构
  - devops/故障排查
  - devops/容器安全
prerequisites:
  - devops/概述与Linux基础
---

## 1. 测试金字塔

```
        /  E2E测试  \        少量，慢，脆弱
       /  集成测试    \      适量
      /   单元测试      \    大量，快，稳定
```

| 层级     | 数量 | 速度 | 范围        | 成本 |
| -------- | ---- | ---- | ----------- | ---- |
| 单元测试 | 多   | 毫秒 | 单个函数/类 | 低   |
| 集成测试 | 中   | 秒   | 模块间交互  | 中   |
| E2E测试  | 少   | 分钟 | 完整流程    | 高   |

## 2. 单元测试

### 2.1 测试框架

| 语言       | 框架    | 断言库  |
| ---------- | ------- | ------- |
| Java       | JUnit 5 | AssertJ |
| Python     | pytest  | 内置    |
| Go         | testing | testify |
| JavaScript | Jest    | 内置    |
| Rust       | 内置    | assert! |

### 2.2 测试结构（AAA 模式）

```python
def test_user_creation():
    # Arrange（准备）
    user_data = {"name": "Alice", "email": "alice@example.com"}

    # Act（执行）
    user = create_user(user_data)

    # Assert（断言）
    assert user.name == "Alice"
    assert user.email == "alice@example.com"
```

### 2.3 Mock 与 Stub

```python
from unittest.mock import Mock, patch

# Mock
db = Mock()
db.save.return_value = True
assert db.save({"name": "Alice"}) == True

# Patch
@patch('module.external_api')
def test_with_patch(mock_api):
    mock_api.return_value = {"status": "ok"}
    result = call_api()
    assert result["status"] == "ok"
```

### 2.4 测试覆盖率

| 覆盖率类型 | 说明               |
| ---------- | ------------------ |
| 行覆盖率   | 执行到的代码行比例 |
| 分支覆盖率 | 执行到的分支比例   |
| 函数覆盖率 | 调用到的函数比例   |
| 路径覆盖率 | 执行到的路径比例   |

```bash
# 生成覆盖率报告
pytest --cov=myapp --cov-report=html
go test -coverprofile=coverage.out
jest --coverage
```

## 3. 集成测试

### 3.1 数据库集成测试

```python
import pytest
from testcontainers.postgres import PostgresContainer

@pytest.fixture
def postgres():
    with PostgresContainer("postgres:16") as pg:
        yield pg.get_connection_url()

def test_user_repository(postgres):
    repo = UserRepository(postgres)
    repo.create(User(name="Alice"))
    users = repo.find_all()
    assert len(users) == 1
```

### 3.2 API 集成测试

```python
from fastapi.testclient import TestClient

def test_create_user():
    client = TestClient(app)
    response = client.post("/api/users", json={
        "name": "Alice",
        "email": "alice@example.com"
    })
    assert response.status_code == 201
    assert response.json()["name"] == "Alice"
```

### 3.3 消息队列集成测试

```python
from testcontainers.rabbitmq import RabbitMqContainer

@pytest.fixture
def rabbitmq():
    with RabbitMqContainer("rabbitmq:3-management") as rb:
        yield rb

def test_message_publish(rabbitmq):
    publisher = MessagePublisher(rabbitmq)
    consumer = MessageConsumer(rabbitmq)

    publisher.publish("test_queue", {"event": "created"})
    message = consumer.consume("test_queue", timeout=5)

    assert message["event"] == "created"
```

## 4. E2E 测试

### 4.1 Playwright

```javascript
test('user login flow', async ({ page }) => {
  await page.goto('/login');

  await page.fill('[data-testid="username"]', 'alice');
  await page.fill('[data-testid="password"]', 'secret');
  await page.click('[data-testid="login-btn"]');

  await expect(page).toHaveURL('/dashboard');
  await expect(page.locator('.welcome')).toContainText('Alice');
});
```

### 4.2 Cypress

```javascript
describe('User Login', () => {
  it('should login successfully', () => {
    cy.visit('/login');
    cy.get('[data-testid="username"]').type('alice');
    cy.get('[data-testid="password"]').type('secret');
    cy.get('[data-testid="login-btn"]').click();
    cy.url().should('include', '/dashboard');
    cy.get('.welcome').should('contain', 'Alice');
  });
});
```

### 4.3 E2E 测试最佳实践

- 使用 data-testid 选择器
- 避免依赖实现细节
- 测试关键用户流程
- 设置合理的超时
- 并行执行加速
- 视频和截图记录失败

## 5. 契约测试

### 5.1 Pact

消费者驱动契约测试：

```javascript
// 消费者端
const provider = new Pact({
  consumer: 'UserService',
  provider: 'UserAPI',
});

await provider.addInteraction({
  state: 'user exists',
  uponReceiving: 'a request for user',
  withRequest: {
    method: 'GET',
    path: '/api/users/1',
  },
  willRespondWith: {
    status: 200,
    body: { id: 1, name: 'Alice' },
  },
});
```

```javascript
// 提供者端验证
const verifier = new Verifier({
  providerBaseUrl: 'http://localhost:8080',
  pactBrokerUrl: 'http://pact-broker:9292',
  provider: 'UserAPI',
});

await verifier.verify();
```

## 6. 性能测试

### 6.1 负载测试

确定系统在预期负载下的表现：

```javascript
// k6 脚本
import http from 'k6/http';

export const options = {
  stages: [
    { duration: '2m', target: 100 }, // 上升到100用户
    { duration: '5m', target: 100 }, // 维持100用户
    { duration: '2m', target: 0 }, // 下降到0
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  http.get('http://target/api/users');
}
```

### 6.2 压力测试

确定系统的极限：

```javascript
export const options = {
  stages: [
    { duration: '5m', target: 500 },
    { duration: '5m', target: 1000 },
    { duration: '5m', target: 2000 },
    { duration: '5m', target: 0 },
  ],
};
```

### 6.3 浸泡测试

长时间运行检测内存泄漏等问题：

```javascript
export const options = {
  stages: [
    { duration: '1h', target: 50 },
    { duration: '12h', target: 50 },
    { duration: '1h', target: 0 },
  ],
};
```

## 7. CI 中的测试策略

### 7.1 测试门禁

```yaml
# GitHub Actions
- name: Run tests
  run: |
    pytest --cov=myapp --cov-fail-under=80
    pytest integration/ -m "not slow"
```

### 7.2 测试分层执行

| 阶段    | 测试类型 | 频率     | 触发 |
| ------- | -------- | -------- | ---- |
| PR      | 单元测试 | 每次提交 | 自动 |
| PR      | 集成测试 | 每次提交 | 自动 |
| Merge   | E2E 测试 | 合并时   | 自动 |
| Nightly | 性能测试 | 每晚     | 定时 |
| Release | 全量测试 | 发布时   | 手动 |

### 7.3 测试报告

- 覆盖率趋势图
- 测试通过率
- 失败测试分类
- 性能基线对比
