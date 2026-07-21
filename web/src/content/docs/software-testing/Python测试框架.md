---
order: 56
title: pytest
module: 'software-testing'
category: 'eng-infra'
difficulty: intermediate
description: pytest单元测试框架：fixture、参数化、插件、配置与最佳实践详解。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'software-testing/边界值分析'
  - 'software-testing/Web自动化测试'
  - 'software-testing/Java单元测试'
  - 'software-testing/API自动化测试'
prerequisites:
  - 'software-testing/测试基础与方法'
---

## 1. pytest 基础

### 1.1 安装

```bash
pip install pytest pytest-cov pytest-mock
```

### 1.2 基本示例

```python
# test_calc.py
def add(a, b):
    return a + b

def test_add():
    assert add(1, 2) == 3
    assert add(-1, 1) == 0
    assert add(0, 0) == 0
```

```bash
pytest test_calc.py -v
```

### 1.3 测试发现规则

| 规则   | 描述                       |
| ------ | -------------------------- |
| 文件名 | `test_*.py` 或 `*_test.py` |
| 类名   | `Test*`（无 `__init__`）   |
| 函数名 | `test_*`                   |

## 2. Fixture

### 2.1 基本用法

```python
import pytest

@pytest.fixture
def sample_data():
    return [1, 2, 3, 4, 5]

def test_sum(sample_data):
    assert sum(sample_data) == 15
```

### 2.2 Fixture 作用域

| 作用域     | 描述                 |
| ---------- | -------------------- |
| `function` | 每个测试函数（默认） |
| `class`    | 每个测试类           |
| `module`   | 每个模块             |
| `session`  | 整个测试会话         |

```python
@pytest.fixture(scope="session")
def db_connection():
    conn = create_connection()
    yield conn
    conn.close()
```

### 2.3 Fixture 依赖

```python
@pytest.fixture
def db(db_connection):
    return Database(db_connection)

@pytest.fixture
def user(db):
    return db.create_user(name="Alice")
```

### 2.4 conftest.py

```python
# conftest.py - 自动发现，无需导入
import pytest

@pytest.fixture
def app():
    app = create_app()
    app.config["TESTING"] = True
    return app

@pytest.fixture
def client(app):
    return app.test_client()
```

### 2.5 参数化 Fixture

```python
@pytest.fixture(params=["sqlite", "postgresql"])
def db_engine(request):
    engine = create_engine(request.param)
    yield engine
    engine.dispose()

def test_query(db_engine):
    result = db_engine.execute("SELECT 1")
    assert result.fetchone()[0] == 1
```

## 3. 参数化测试

### 3.1 @pytest.mark.parametrize

```python
@pytest.mark.parametrize("input,expected", [
    (1, 1),
    (2, 4),
    (3, 9),
    (-1, 1),
    (0, 0),
])
def test_square(input, expected):
    assert input ** 2 == expected
```

### 3.2 多参数组合

```python
@pytest.mark.parametrize("x", [1, 2])
@pytest.mark.parametrize("y", [10, 20])
def test_multiply(x, y):
    assert x * y > 0
```

### 3.3 参数化 ID

```python
@pytest.mark.parametrize("input,expected", [
    ("hello", "HELLO"),
    ("WORLD", "WORLD"),
], ids=["lowercase", "uppercase"])
def test_upper(input, expected):
    assert input.upper() == expected
```

## 4. 标记（Markers）

### 4.1 内置标记

| 标记                       | 描述       |
| -------------------------- | ---------- |
| `@pytest.mark.skip`        | 跳过测试   |
| `@pytest.mark.skipif`      | 条件跳过   |
| `@pytest.mark.xfail`       | 预期失败   |
| `@pytest.mark.parametrize` | 参数化     |
| `@pytest.mark.slow`        | 自定义标记 |

### 4.2 自定义标记

```python
# pytest.ini
[pytest]
markers =
    slow: slow tests
    integration: integration tests

# 使用
@pytest.mark.slow
def test_large_dataset():
    ...
```

### 4.3 选择执行

```bash
# 运行非 slow 测试
pytest -m "not slow"

# 运行 integration 测试
pytest -m integration

# 组合
pytest -m "integration and not slow"
```

## 5. Mock 与 Patch

### 5.1 unittest.mock

```python
from unittest.mock import Mock, patch

def test_api_call():
    mock_response = Mock()
    mock_response.json.return_value = {"status": "ok"}
    mock_response.status_code = 200

    with patch("requests.get", return_value=mock_response):
        result = fetch_data("https://api.example.com")
        assert result["status"] == "ok"
```

### 5.2 pytest-mock

```python
def test_database_query(mocker):
    mock_db = mocker.patch("app.database.query")
    mock_db.return_value = [{"id": 1, "name": "Alice"}]

    result = get_users()
    assert len(result) == 1
    mock_db.assert_called_once()
```

## 6. 插件生态

| 插件            | 功能        |
| --------------- | ----------- |
| pytest-cov      | 覆盖率      |
| pytest-mock     | Mock 封装   |
| pytest-asyncio  | 异步测试    |
| pytest-django   | Django 集成 |
| pytest-flask    | Flask 集成  |
| pytest-xdist    | 并行执行    |
| pytest-timeout  | 超时控制    |
| pytest-randomly | 随机顺序    |

## 7. 配置

### 7.1 pyproject.toml

```toml
[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = ["test_*.py"]
python_classes = ["Test*"]
python_functions = ["test_*"]
addopts = "-v --tb=short --strict-markers"
markers = [
    "slow: slow tests",
    "integration: integration tests",
]
```

### 7.2 覆盖率

```bash
pytest --cov=app --cov-report=html --cov-report=term-missing
```

## 8. 最佳实践

| 实践          | 描述               |
| ------------- | ------------------ |
| 命名规范      | `test_` 前缀       |
| 单一断言      | 每个测试一个关注点 |
| AAA 模式      | Arrange-Act-Assert |
| Fixture 复用  | conftest.py 共享   |
| 参数化        | 减少重复代码       |
| Mock 外部依赖 | 隔离测试           |
| 覆盖率目标    | 80%+               |
