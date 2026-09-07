---
order: 840
title: Python 测试 unittest/pytest
module: 'python'
category: 后端技术
difficulty: beginner
description: Python 测试 unittest/pytest 的完整教学讲解。
author: fanquanpp
updated: '2026-08-01'
---

## unittest 基础

**基本写法：编写测试类**
`class <类>(unittest.TestCase):`
```python
# 继承 TestCase 编写单元测试
import unittest

class TestString(unittest.TestCase):
    def test_upper(self):
        self.assertEqual("abc".upper(), "ABC")
```

**基本写法：运行测试**
`python -m unittest <模块>`
```python
# 命令行运行 unittest 测试
# 执行：python -m unittest test_my module
# 自动发现：python -m unittest discover
```

---

## unittest 断言

**基本写法：相等断言**
`self.assertEqual(<实际>, <期望>)`
```python
# 验证两值相等
self.assertEqual(sum([1, 2]), 3)
```

**基本写法：不等与布尔**
`self.assertNotEqual / self.assertTrue / self.assertFalse`
```python
# 不等与布尔断言
self.assertNotEqual(1, 2)
self.assertTrue("a" in "abc")
self.assertFalse([])
```

**基本写法：判断异常**
`self.assertRaises(<异常类>)`
```python
# 验证代码抛出指定异常
with self.assertRaises(ZeroDivisionError):
    1 / 0
```

**基本写法：异常匹配**
`self.assertRaisesRegex(<异常>, <正则>)`
```python
# 验证异常消息匹配
with self.assertRaisesRegex(ValueError, "invalid"):
    int("abc")
```

**基本写法：近似比较**
`self.assertAlmostEqual(<实际>, <期望>, places=<小数位>)`
```python
# 浮点数近似相等比较
self.assertAlmostEqual(0.1 + 0.2, 0.3, places=7)
```

**基本写法：包含判断**
`self.assertIn / self.assertNotIn`
```python
# 判断成员关系
self.assertIn(2, [1, 2, 3])
self.assertNotIn("x", "abc")
```

**基本写法：None 判断**
`self.assertIsNone / self.assertIsNotNone`
```python
# 判断是否为 None
self.assertIsNone(None)
self.assertIsNotNone(0)
```

---

## unittest 前后置

**基本写法：每个用例前后置**
`def setUp(self) / def tearDown(self)`
```python
# 每个测试方法前后执行
class TestDB(unittest.TestCase):
    def setUp(self):
        self.conn = create_conn()

    def tearDown(self):
        self.conn.close()

    def test_query(self):
        self.assertTrue(self.conn.query())
```

**基本写法：类级前后置**
`@classmethod def setUpClass / tearDownClass`
```python
# 整个测试类只执行一次
class TestSuite(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = load_fixture()

    @classmethod
    def tearDownClass(cls):
        cls.data = None
```

---

## pytest 基础

**基本写法：函数式测试**
`def test_<函数名>():`
```python
# pytest 无需继承，直接写函数
def test_addition():
    assert 1 + 1 == 2
```

**基本写法：运行 pytest**
`pytest [<选项>]`
```python
# 常用命令行运行方式
# pytest                       运行所有测试
# pytest test_x.py             运行指定文件
# pytest -k "add"              按名称匹配运行
# pytest -v                    详细输出
# pytest --tb=short            简短回溯
```

**基本写法：异常断言**
`pytest.raises(<异常类>)`
```python
# 验证抛出异常
import pytest
def test_div_zero():
    with pytest.raises(ZeroDivisionError):
        1 / 0
```

**基本写法：近似断言**
`pytest.approx(<期望>)`
```python
# 浮点近似比较
def test_float():
    assert 0.1 + 0.2 == pytest.approx(0.3)
```

---

## pytest fixture

**基本写法：定义 fixture**
`@pytest.fixture`
```python
# 通过 fixture 注入测试数据
@pytest.fixture
def sample_list():
    return [1, 2, 3]

def test_len(sample_list):
    assert len(sample_list) == 3
```

**基本写法：yield 前后置**
`@pytest.fixture`
`def <名>(): yield <值>`
```python
# yield 前为准备，后为清理
@pytest.fixture
def db_conn():
    conn = create_conn()
    yield conn
    conn.close()
```

**基本写法：fixture 作用域**
`@pytest.fixture(scope="<作用域>")`
```python
# 控制 fixture 生命周期
@pytest.fixture(scope="session")
def config():
    return load_config()  # 整个会话只执行一次
```

**基本写法：自动使用**
`@pytest.fixture(autouse=True)`
```python
# 自动应用到所有测试，无需参数
@pytest.fixture(autouse=True)
def reset_state():
    yield
    clear_cache()
```

---

## pytest 参数化

**基本写法：参数化测试**
`@pytest.mark.parametrize("<参数>", [(<值1>,), (<值2>,)])`
```python
# 一组数据生成多个用例
@pytest.mark.parametrize("a,b,expected", [
    (1, 2, 3),
    (4, 5, 9),
    (0, 0, 0),
])
def test_add(a, b, expected):
    assert a + b == expected
```

---

## pytest 标记

**基本写法：自定义标记**
`@pytest.mark.<标记名>`
```python
# 标记测试分类运行
@pytest.mark.slow
def test_big_data():
    ...

# 运行：pytest -m slow
```

**基本写法：跳过测试**
`@pytest.mark.skip(reason="<原因>")`
```python
# 无条件跳过
@pytest.mark.skip(reason="暂不支持")
def test_future():
    pass
```

**基本写法：条件跳过**
`@pytest.mark.skipif(<条件>, reason="<原因>")`
```python
# 满足条件时跳过
import sys
@pytest.mark.skipif(sys.platform == "win32", reason="仅 Linux")
def test_unix_only():
    pass
```

**基本写法：预期失败**
`@pytest.mark.xfail`
```python
# 标记为预期失败，失败不报错
@pytest.mark.xfail(reason="已知 bug")
def test_known_issue():
    assert 1 == 2
```

---

## mock 模拟

**基本写法：patch 替换对象**
`unittest.mock.patch("<目标>")`
```python
# 临时替换函数或对象
from unittest.mock import patch

@patch("mymodule.requests.get")
def test_api(mock_get):
    mock_get.return_value.status_code = 200
    assert mymodule.fetch() == 200
```

**基本写法：配置 mock 行为**
`mock.return_value / mock.side_effect`
```python
# 设置返回值或副作用
mock_get.return_value.json.return_value = {"ok": True}
mock_get.side_effect = ConnectionError("超时")  # 抛异常
```

**基本写法：断言调用**
`mock.assert_called_once_with(<参数>)`
```python
# 验证 mock 被调用情况
mock_get.assert_called_once_with("https://api.com")
mock_get.assert_not_called()
```

**基本写法：MagicMock**
`MagicMock()`
```python
# 创建支持魔法方法的模拟对象
from unittest.mock import MagicMock
m = MagicMock()
m.__len__.return_value = 5
print(len(m))  # 5
```
