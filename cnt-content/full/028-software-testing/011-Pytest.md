---
order: 110
title: pytest
module: 'software-testing'
category: 云与基础设施
difficulty: intermediate
description: pytest单元测试框架：fixture、参数化、插件、配置与最佳实践详解。
author: fanquanpp
updated: '2026-08-30'
related:
  - 'software-testing/009-BoundaryValueAnalysis'
  - 'software-testing/013-APIAutomationTest'
prerequisites:
  - 'software-testing/001-TestBasicsMethod'
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
## pytest 命令行

**基本写法：运行测试**
`pytest [<选项>] [<路径>]`

```bash
# pytest 常用命令
pytest                          # 运行所有测试
pytest test_file.py             # 运行指定文件
pytest -v                       # 详细输出
pytest -s                       # 显示 print 输出
pytest -k "表达式"              # 按表达式筛选
pytest -x                       # 失败立即停止
pytest --maxfail=2              # 失败 N 次停止
pytest --tb=short               # 简短回溯
```

---

## 测试函数定义

**基本写法：以 test_ 开头定义测试**
`def test_<名称>(): <断言>`

```python
# 定义测试函数，函数名须以 test_ 开头
def test_add():
    assert 1 + 1 == 2
```

---

## assert 断言

**基本写法：使用原生 assert**
`assert <表达式>[, <消息>]`

```python
# pytest 使用原生 assert 语句
def test_equal():
    assert 2 + 3 == 5
    assert "hello" in "hello world"
    assert [1, 2] == [1, 2]
```

---

## 测试类

**换行写法：使用类组织测试**
`class Test<名称>:`
`    def test_<方法>(self): <断言>`

```python
# 测试类名须以 Test 开头，不能有 __init__
class TestCalculator:
    def test_add(self):
        assert self.add(1, 2) == 3

    def add(self, a, b):
        return a + b
```

---

## 异常断言

**基本写法：断言抛出异常**
`with pytest.raises(<异常类型>[, match=<正则>]): <调用>`

```python
# 断言代码抛出指定异常
import pytest

def test_zero_division():
    with pytest.raises(ZeroDivisionError):
        1 / 0

def test_value_error():
    with pytest.raises(ValueError, match="invalid"):
        int("abc")
```

---

## 警告断言

**基本写法：断言产生警告**
`with pytest.warns(<警告类型>[, match=<正则>]): <调用>`

```python
# 断言产生警告
import warnings

def test_warning():
    with pytest.warns(UserWarning):
        warnings.warn("test", UserWarning)
```

---

## fixture 注入

**基本写法：使用 fixture 注入依赖**
`def test_<名称>(<fixture名>): <语句>`

```python
# 通过参数名注入 fixture
import pytest

@pytest.fixture
def sample_data():
    return [1, 2, 3]

def test_sum(sample_data):
    assert sum(sample_data) == 6
```

---

## conftest.py 共享 fixture

**基本写法：在 conftest.py 中定义共享 fixture**
`# conftest.py`
`@pytest.fixture`
`def <fixture名>(): <返回值>`

```python
# conftest.py 文件中的 fixture 自动被同目录及子目录测试发现
import pytest

@pytest.fixture
def db_connection():
    conn = create_conn()
    yield conn
    conn.close()
```

---

## 跳过测试

**基本写法：跳过测试用例**
`@pytest.mark.skip(reason="<原因>")`
`@pytest.mark.skipif(<条件>, reason="<原因>")`

```python
# 跳过或条件跳过测试
import pytest

@pytest.mark.skip(reason="未实现")
def test_future():
    pass

@pytest.mark.skipif(sys.platform == "win32", reason="不支持 Windows")
def test_unix_only():
    pass
```

---

## 标记预期失败

**基本写法：标记测试预期失败**
`@pytest.mark.xfail([reason="<原因>"][, raises=<异常>])`

```python
# 标记预期失败的测试
@pytest.mark.xfail(reason="已知 bug")
def test_known_bug():
    assert buggy_func() == 1
```

---

## 自定义标记

**基本写法：自定义标记并筛选**
`@pytest.mark.<标记名>`
`pytest -m <标记名>`

```python
# 自定义标记并按标记筛选
import pytest

@pytest.mark.slow
def test_large_dataset():
    pass

# 运行: pytest -m slow
```

---

## 测试输出捕获

**基本写法：访问捕获的输出**
`capsys.readouterr().out`
`capsys.readouterr().err`

```python
# 捕获 stdout/stderr
def test_output(capsys):
    print("hello")
    captured = capsys.readouterr()
    assert "hello" in captured.out
```

---

## 临时目录

**基本写法：使用临时目录 fixture**
`def test_<名称>(tmp_path): <语句>`
`def test_<名称>(tmp_path_factory): <语句>`

```python
# 使用 tmp_path 创建临时目录
def test_file_write(tmp_path):
    file = tmp_path / "test.txt"
    file.write_text("content")
    assert file.read_text() == "content"
```

---

## 退出码

**基本写法：pytest 退出码含义**
`0 全部通过 | 1 部分失败 | 2 中断 | 5 无测试`

```bash
# pytest 退出码: 0 通过, 1 失败, 2 中断, 3 内部错误, 4 命令行错误, 5 无测试
pytest; echo $?
```
