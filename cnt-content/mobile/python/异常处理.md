# 异常处理

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## try-except 语句

**基本写法：基本 try-except**
`try: <语句> except <异常>: <处理>`

```python
# 基本 try-except 异常处理
try:
    result = 10 / 0
except ZeroDivisionError:
    print("除零错误")
```

---

**基本写法：捕获异常信息**
`try: <语句> except <异常> as <变量>: <处理>`

```python
# 捕获异常信息到变量
try:
    result = 10 / 0
except ZeroDivisionError as e:
    print(f"错误: {e}")
```

---

**基本写法：捕获多种异常**
`try: <语句> except (<异常1>, <异常2>): <处理>`

```python
# 捕获多种异常类型
try:
    value = int("abc")
except (ValueError, TypeError) as e:
    print(f"转换错误: {e}")
```

---

**换行写法：多 except 块**
`try: <语句>`
`except <异常1>: <处理1>`
`except <异常2>: <处理2>`

```python
# 多个 except 块分别处理不同异常
try:
    value = int(input("请输入数字: "))
    result = 10 / value
except ValueError:
    print("输入不是有效数字")
except ZeroDivisionError:
    print("不能除以零")
```

---

## try-except-else 语句

**基本写法：try-except-else**
`try: <语句> except <异常>: <处理> else: <无异常时执行>`

```python
# try-except-else 语句
try:
    value = int("123")
except ValueError:
    print("转换失败")
else:
    print(f"转换成功: {value}")
```

---

## try-finally 语句

**基本写法：try-finally**
`try: <语句> finally: <无论是否异常都执行>`

```python
# try-finally 语句
try:
    file = open("test.txt", "r")
    content = file.read()
finally:
    file.close()
```

---

## try-except-finally 语句

**换行写法：完整的异常处理结构**
`try: <语句>`
`except <异常>: <处理>`
`else: <无异常时执行>`
`finally: <清理>`

```python
# 完整的 try-except-else-finally 结构
try:
    file = open("test.txt", "r")
    content = file.read()
except FileNotFoundError:
    print("文件不存在")
    content = ""
else:
    print("文件读取成功")
finally:
    file.close()
```

---

## 抛出异常

**基本写法：使用 raise 抛出异常**
`raise <异常>(<消息>)`

```python
# 使用 raise 抛出异常
def check_age(age):
    if age < 0:
        raise ValueError("年龄不能为负数")
    return age
```

---

**基本写法：重新抛出当前异常**
`raise`

```python
# 重新抛出当前捕获的异常
try:
    result = 10 / 0
except ZeroDivisionError:
    print("记录错误日志")
    raise
```

---

**基本写法：抛出异常链**
`raise <新异常> from <原异常>`

```python
# 抛出异常链（保留原始异常）
try:
    result = 10 / 0
except ZeroDivisionError as e:
    raise RuntimeError("计算失败") from e
```

---

## 自定义异常

**换行写法：定义自定义异常类**
`class <异常类>(Exception):`
`    def __init__(self, <参数>): <语句>`

```python
# 定义自定义异常类
class InvalidAgeError(Exception):
    def __init__(self, age, message="年龄无效"):
        self.age = age
        self.message = message
        super().__init__(self.message)
```

---

**换行写法：定义带额外属性的自定义异常**
`class <异常类>(Exception):`
`    def __init__(self, <参数>):`
`        self.<属性> = <值>`
`        super().__init__(<消息>)`

```python
# 定义带额外属性的自定义异常
class DatabaseError(Exception):
    def __init__(self, query, error_code):
        self.query = query
        self.error_code = error_code
        super().__init__(f"Database error {error_code}: {query}")
```

---

**基本写法：使用自定义异常**
`raise <自定义异常>(<参数>)`

```python
# 使用自定义异常
def set_age(age):
    if age < 0 or age > 150:
        raise InvalidAgeError(age)
    return age
```

---

**基本写法：捕获自定义异常**
`try: <语句> except <自定义异常> as <变量>: <处理>`

```python
# 捕获自定义异常
try:
    set_age(-5)
except InvalidAgeError as e:
    print(f"错误: {e.message}, 年龄: {e.age}")
```

---

## 异常层次结构

**基本写法：捕获 Exception 基类**
`try: <语句> except Exception: <处理>`

```python
# 捕获 Exception 基类（捕获所有非系统退出异常）
try:
    result = 10 / 0
except Exception as e:
    print(f"发生异常: {e}")
```

---

**基本写法：捕获 BaseException**
`try: <语句> except BaseException: <处理>`

```python
# 捕获 BaseException（包括 KeyboardInterrupt 等）
try:
    result = 10 / 0
except BaseException as e:
    print(f"发生异常: {e}")
```

---

## 常见内置异常

**基本写法：ValueError 值错误**
`raise ValueError(<消息>)`

```python
# 抛出 ValueError
def parse_int(value):
    if not value.isdigit():
        raise ValueError(f"无法转换为整数: {value}")
    return int(value)
```

---

**基本写法：TypeError 类型错误**
`raise TypeError(<消息>)`

```python
# 抛出 TypeError
def add(a, b):
    if not isinstance(a, (int, float)) or not isinstance(b, (int, float)):
        raise TypeError("参数必须是数字")
    return a + b
```

---

**基本写法：KeyError 键错误**
`raise KeyError(<键>)`

```python
# 抛出 KeyError
def get_value(dictionary, key):
    if key not in dictionary:
        raise KeyError(f"键不存在: {key}")
    return dictionary[key]
```

---

**基本写法：IndexError 索引错误**
`raise IndexError(<消息>)`

```python
# 抛出 IndexError
def get_item(lst, index):
    if index >= len(lst):
        raise IndexError(f"索引超出范围: {index}")
    return lst[index]
```

---

**基本写法：AttributeError 属性错误**
`raise AttributeError(<消息>)`

```python
# 抛出 AttributeError
class MyClass:
    pass

obj = MyClass()
if not hasattr(obj, "name"):
    raise AttributeError("对象没有 name 属性")
```

---

**基本写法：FileNotFoundError 文件未找到错误**
`raise FileNotFoundError(<文件路径>)`

```python
# 抛出 FileNotFoundError
import os

def read_file(path):
    if not os.path.exists(path):
        raise FileNotFoundError(f"文件不存在: {path}")
    with open(path, "r") as f:
        return f.read()
```

---

## 异常处理最佳实践

**基本写法：捕获具体异常**
`try: <语句> except <具体异常>: <处理>`

```python
# 捕获具体异常而非通用异常
try:
    value = int("abc")
except ValueError:
    print("值错误")
```

---

**基本写法：使用上下文管理器替代 try-finally**
`with <资源> as <变量>: <语句>`

```python
# 使用 with 语句替代 try-finally
with open("test.txt", "r") as f:
    content = f.read()
```

---

## 异常断言

**基本写法：使用 assert 断言**
`assert <条件>, <消息>`

```python
# 使用 assert 断言条件
def calculate_average(numbers):
    assert len(numbers) > 0, "列表不能为空"
    return sum(numbers) / len(numbers)
```

---

**基本写法：禁用 assert 优化**
`python -O <脚本>`

```python
# 使用 -O 选项运行时，assert 语句会被忽略
# 命令行执行：python -O script.py
```

---

## 异常组（Python 3.11+）

**基本写法：使用 ExceptionGroup**
`raise ExceptionGroup(<消息>, [<异常1>, <异常2>])`

```python
# 抛出异常组
errors = [
    ValueError("第一个错误"),
    TypeError("第二个错误"),
]
raise ExceptionGroup("多个错误发生", errors)
```

---

**基本写法：使用 except* 捕获异常组**
`try: <语句> except* <异常>: <处理>`

```python
# 使用 except* 捕获异常组中的特定类型
try:
    raise ExceptionGroup("错误组", [ValueError("值错误"), TypeError("类型错误")])
except* ValueError:
    print("捕获到 ValueError")
except* TypeError:
    print("捕获到 TypeError")
```

---

## 异常上下文

**基本写法：访问异常上下文**
`<异常>.__context__`

```python
# 访问异常的上下文（隐式链）
try:
    try:
        result = 10 / 0
    except ZeroDivisionError:
        raise RuntimeError("处理失败")
except RuntimeError as e:
    print(f"异常: {e}")
    print(f"上下文: {e.__context__}")
```

---

**基本写法：访问异常原因**
`<异常>.__cause__`

```python
# 访问异常的原因（显式链）
try:
    try:
        result = 10 / 0
    except ZeroDivisionError as e:
        raise RuntimeError("处理失败") from e
except RuntimeError as e:
    print(f"异常: {e}")
    print(f"原因: {e.__cause__}")
```

---

## 自定义异常处理

**换行写法：定义带异常处理的基类**
`class <基类>:`
`    def <方法>(self):`
`        try: <语句>`
`        except <异常>: <处理>`

```python
# 定义带异常处理的基类
class Repository:
    def find_by_id(self, entity_id):
        try:
            return self._fetch(entity_id)
        except KeyError:
            return None
        except Exception as e:
            raise DatabaseError(f"查询失败: {e}")
```

---

**换行写法：定义异常处理装饰器**
`def <装饰器名>(func):`
`    def wrapper(*args, **kwargs):`
`        try: return func(*args, **kwargs)`
`        except <异常>: <处理>`
`    return wrapper`

```python
# 定义异常处理装饰器
def handle_errors(default=None):
    def decorator(func):
        def wrapper(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                print(f"错误: {e}")
                return default
        return wrapper
    return decorator
```

---

## 异常日志记录

**基本写法：使用 logging 记录异常**
`import logging`
`logging.exception(<消息>)`

```python
# 使用 logging 记录异常
import logging

try:
    result = 10 / 0
except ZeroDivisionError:
    logging.exception("发生除零错误")
```

---

**基本写法：使用 traceback 记录异常**
`import traceback`
`traceback.print_exc()`

```python
# 使用 traceback 打印异常堆栈
import traceback

try:
    result = 10 / 0
except ZeroDivisionError:
    traceback.print_exc()
```

---

## 上下文管理器异常处理

**换行写法：自定义上下文管理器处理异常**
`class <上下文管理器>:`
`    def __enter__(self): <语句>`
`    def __exit__(self, exc_type, exc_val, exc_tb): <处理>`

```python
# 自定义上下文管理器处理异常
class SafeOperation:
    def __enter__(self):
        print("开始操作")
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type is not None:
            print(f"捕获异常: {exc_val}")
            return True
        print("操作完成")
        return False
```

---

**基本写法：使用 contextlib.suppress 抑制异常**
`with suppress(<异常>): <语句>`

```python
# 使用 contextlib.suppress 抑制特定异常
from contextlib import suppress

with suppress(FileNotFoundError):
    with open("nonexistent.txt", "r") as f:
        content = f.read()
```

---

## 异常重试机制

**换行写法：实现重试装饰器**
`def <装饰器>(retries=<n>):`
`    def decorator(func):`
`        def wrapper(*args, **kwargs):`
`            for i in range(retries):`
`                try: return func(*args, **kwargs)`
`                except <异常>: <处理>`
`        return wrapper`
`    return decorator`

```python
# 实现重试装饰器
import time

def retry(max_retries=3, delay=1):
    def decorator(func):
        def wrapper(*args, **kwargs):
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    if attempt == max_retries - 1:
                        raise
                    time.sleep(delay)
        return wrapper
    return decorator
```
