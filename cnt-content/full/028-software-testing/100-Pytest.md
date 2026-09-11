---
order: 100
title: pytest
module: 'software-testing'
category: 云与基础设施
difficulty: intermediate
description: pytest单元测试框架：fixture、参数化、插件、配置与最佳实践详解。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'software-testing/060-BoundaryValueAnalysis'
  - 'software-testing/120-APIAutomationTest'
prerequisites:
  - 'software-testing/010-TestBasicsMethod'
---

## 1. pytest 基础

pytest 是 Python 生态事实上的标准测试框架。它的核心卖点：用原生 `assert`
写断言（失败时自动展示表达式两边的实际值），用函数参数实现依赖注入
（fixture），用装饰器实现参数化与标记。写过 unittest 的话，可以把它理解为
「少写一半样板代码」的替代品；刚入门则可以直接从 pytest 学起。

前置知识：Python 基础语法、函数与装饰器、pip 虚拟环境的基本使用。

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

### 2.6 内置 fixture

pytest 自带一批开箱即用的 fixture，覆盖测试中最常见的三类需求：

| fixture       | 用途                 | 典型场景                     |
| ------------- | -------------------- | ---------------------------- |
| `tmp_path`    | 本次测试专属临时目录 | 读写文件、验证落盘逻辑       |
| `capsys`      | 捕获 stdout/stderr   | 验证命令行输出               |
| `monkeypatch` | 临时修改环境/属性    | 改环境变量、替换函数后还原   |
| `caplog`      | 捕获日志记录         | 验证告警与日志内容           |

```python
import os

def test_write_and_read(tmp_path):
    # tmp_path 是 pathlib.Path，测试结束后自动清理
    file = tmp_path / "data.txt"
    file.write_text("hello", encoding="utf-8")
    assert file.read_text(encoding="utf-8") == "hello"

def test_output(capsys):
    print("hello")
    captured = capsys.readouterr()
    assert "hello" in captured.out

def test_env(monkeypatch):
    # monkeypatch.setenv 只在本测试内生效，结束后自动还原
    monkeypatch.setenv("APP_MODE", "test")
    assert os.environ["APP_MODE"] == "test"
```

陷阱：不要在测试里手工改 `os.environ` 或全局变量——用 `monkeypatch`，
否则测试之间会互相污染，并行执行时问题尤其隐蔽。

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

### 4.4 异常断言

用 `pytest.raises` 验证「代码是否按预期抛错」，这是把防御性逻辑纳入测试的
标准做法：

```python
import pytest

def divide(a: int, b: int) -> int:
    if b == 0:
        raise ValueError("除数不能为零")
    return a // b

def test_zero_division():
    with pytest.raises(ZeroDivisionError):
        1 / 0

def test_divide_rejects_zero():
    # match 接收正则，额外校验错误消息
    with pytest.raises(ValueError, match="除数不能为零"):
        divide(6, 0)
```

常见错误是把 `pytest.raises` 的范围写得太宽，把整段业务逻辑都包进去——
这样即使异常从错误的语句抛出，测试也会通过。`with` 块内只放「会抛错的那
一行」。

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

## 小结

- 初学者要点：pytest 的三块基石——原生 `assert`（失败自动展开）、fixture
  （函数参数即依赖注入，`conftest.py` 免导入共享）、`@pytest.mark.
  parametrize`（参数化）；`pytest.raises` 验证异常路径，`with` 块内只放
  会抛错的那一行。
- 进阶注意：优先用内置 fixture（`tmp_path`/`monkeypatch`/`capsys`）而不是
  手工管理临时状态，避免用例间污染；自定义标记必须在配置里注册（配合
  `--strict-markers` 防拼写错误）；`-m` 表达式（`"integration and not
  slow"`）+ `pytest-xdist` 并行是 CI 提速的标准组合；覆盖率阈值交给
  `--cov-fail-under` 或 CI 门禁，而不是口头约定。
