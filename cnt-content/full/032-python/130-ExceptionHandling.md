---
order: 140
title: 异常处理
module: 'python'
category: 后端技术
difficulty: intermediate
description: 异常体系、try-except、自定义异常与上下文管理器。
author: fanquanpp
updated: '2026-10-05'
related:
  - 'python/740-PackagePublish'
  - 'python/460-OOP'
  - 'python/300-FileIOContextManager'
  - 'python/970-PythonProjectExampleWebCrawlerDataAnalysis'
prerequisites: []
---

## 知识点地图

- **知识类别**：Python 的异常处理体系——内建异常层级、`try/except/else/finally` 捕获结构、`raise` 抛出、自定义异常类、断言与异常组（3.11+）。它是错误从发生到被处置的完整通路。
- **解决什么问题**：网络会断、文件会缺、用户输入会烂——程序必须有组织地面对失败：哪里抛、哪里接、接住后怎么恢复或翻译、没接住的怎么留下现场。没有这套纪律的代码要么裸奔崩溃、要么 `except Exception: pass` 把故障吞进黑箱。
- **什么时候用到**：所有与外部世界交互的代码（文件、网络、数据库、用户输入）；分层架构里「底层抛领域异常、上层翻译成用户可读信息」的边界设计；`with` 资源清理的正确性依赖本篇的 `__exit__` 异常语义（见 [上下文管理器](/python/520-ContextManager)）。测试侧对异常的断言见 [Python 测试](/python/750-PythonTest) 与 [unittest 与 mock](/python/755-UnittestAndMockStdlib)。

## 前置知识

- [装饰器进阶](/python/510-DecoratorAdvanced)：建议先完成前一篇的学习

## 学习目标

- 掌握「1. 异常体系 (Exception Hierarchy)」的核心机制、典型用法与常见陷阱
- 掌握「2. 捕获处理 (Try-Except)」的核心机制、典型用法与常见陷阱
- 掌握「3. 抛出异常 (Raise)」的核心机制、典型用法与常见陷阱
- 掌握「4. 断言 (Assert)」的核心机制、典型用法与常见陷阱
- 掌握「5. 自定义异常 (Custom Exception)」的核心机制、典型用法与常见陷阱


## 1. 异常体系 (Exception Hierarchy)

Python 中的所有异常都派生自 `BaseException` 类，形成了一个层次结构。

### 1.1 异常层次结构

```mermaid
flowchart TD
    T0["BaseException"]
    T1["SystemExit"]
    T2["KeyboardInterrupt"]
    T3["GeneratorExit"]
    T4["Exception"]
    T5["ArithmeticError"]
    T6["FloatingPointError"]
    T7["OverflowError"]
    T8["ZeroDivisionError"]
    T9["AssertionError"]
    T10["AttributeError"]
    T11["EOFError"]
    T12["ImportError"]
    T13["LookupError"]
    T14["IndexError"]
    T15["KeyError"]
    T16["NameError"]
    T17["OSError"]
    T18["FileNotFoundError"]
    T19["PermissionError"]
    T20["SyntaxError"]
    T21["TypeError"]
    T22["ValueError"]
    T0 --> T1
    T0 --> T2
    T0 --> T3
    T0 --> T4
    T4 --> T5
    T0 --> T6
    T0 --> T7
    T0 --> T8
    T8 --> T9
    T8 --> T10
    T8 --> T11
    T8 --> T12
    T8 --> T13
    T0 --> T14
    T0 --> T15
    T15 --> T16
    T15 --> T17
    T0 --> T18
    T0 --> T19
    T19 --> T20
    T19 --> T21
    T19 --> T22
```

### 1.2 常见异常类型

| 异常类型            | 描述         | 示例                          |
| ------------------- | ------------ | ----------------------------- |
| `ZeroDivisionError` | 除数为零     | `1 / 0`                       |
| `TypeError`         | 类型错误     | `"2" + 2`                     |
| `ValueError`        | 值错误       | `int("abc")`                  |
| `IndexError`        | 索引越界     | `[1, 2, 3][5]`                |
| `KeyError`          | 字典键不存在 | `{"a": 1}["b"]`               |
| `FileNotFoundError` | 文件未找到   | `open("non_existent.txt")`    |
| `PermissionError`   | 权限错误     | `open("/etc/passwd", "w")`    |
| `NameError`         | 名称未定义   | `print(undefined_variable)`   |
| `SyntaxError`       | 语法错误     | `if  print("Hello")`          |
| `AttributeError`    | 属性不存在   | `"string".undefined_method()` |

## 2. 捕获处理 (Try-Except)

### 2.1 基本语法

```python
 try:
  # 可能引发异常的代码
  result = 10 / 0
 except ZeroDivisionError as e:
  # 捕获特定异常
  print(f"Error: {e}")
 else:
  # 无异常时执行
  print("Success!")
 finally:
  # 无论是否有异常都执行
  print("Cleanup done.")
```

### 2.2 捕获多种异常

```python
 try:
  # 可能引发多种异常的代码
  value = int(input("Enter a number: "))
  result = 10 / value
 except ValueError as e:
  # 捕获值错误
  print(f"Invalid input: {e}")
 except ZeroDivisionError as e:
  # 捕获除零错误
  print(f"Cannot divide by zero: {e}")
 except Exception as e:
  # 捕获其他所有异常
  print(f"An error occurred: {e}")
```

### 2.3 捕获异常的元组

```python
 try:
  # 可能引发异常的代码
  value = int(input("Enter a number: "))
  result = 10 / value
 except (ValueError, ZeroDivisionError) as e:
  # 捕获多种异常
  print(f"Error: {e}")
```

### 2.4 无异常时执行 (else 子句)

```python
 try:
  # 可能引发异常的代码
  result = 10 / 2
 except ZeroDivisionError:
  print("Cannot divide by zero")
 else:
  # 无异常时执行
  print(f"Result: {result}")
 finally:
  print("Execution completed")
```

### 2.5 无论是否有异常都执行 (finally 子句)

```python
 try:
  # 可能引发异常的代码
  file = open("data.txt", "r")
  content = file.read()
 except FileNotFoundError:
  print("File not found")
 finally:
  # 无论是否有异常都执行，用于清理资源
  if 'file' in locals():
  file.close()
  print("File handling completed")
```

## 3. 抛出异常 (Raise)

### 3.1 基本用法

```python
 def divide(a, b):
  if b == 0:
  raise ZeroDivisionError("Cannot divide by zero")
  return a / b
 # 使用
 try:
  result = divide(10, 0)
 except ZeroDivisionError as e:
  print(f"Error: {e}")
```

### 3.2 重新抛出异常

```python
 try:
  # 可能引发异常的代码
  result = 10 / 0
 except ZeroDivisionError as e:
  print(f"Caught an error: {e}")
  # 重新抛出异常
  raise
```

### 3.3 抛出异常并指定原因

```python
 try:
  # 可能引发异常的代码
  value = int("abc")
 except ValueError as e:
  # 抛出新异常并指定原因
  raise ValueError("Invalid input") from e
```

## 4. 断言 (Assert)

断言用于调试和内部检查，当条件为 False 时会引发 `AssertionError` 异常。

### 4.1 基本用法

```python
 def calculate_discount(price, discount):
  # 断言折扣必须在 0 到 1 之间
  assert 0 <= discount < 1, "Discount must be between 0 and 1"
  return price * (1 - discount)
 # 使用
 print(calculate_discount(100, 0.2)) # 输出: 80.0
 # print(calculate_discount(100, 1.5)) # 引发 AssertionError: Discount must be between 0 and 1
```

### 4.2 断言的使用场景

- **调试**：在开发阶段检查条件是否满足
- **代码文档**：明确函数的前置条件
- **内部检查**：确保代码逻辑的正确性

### 4.3 注意事项

- 断言可以通过 `-O` 选项禁用，因此不应该用于处理运行时错误
- 断言失败会直接终止程序，因此应该只用于开发和测试阶段

## 5. 自定义异常 (Custom Exception)

### 5.1 基本自定义异常

```python
 class MyError(Exception):
  """自定义异常类"""
  pass
 # 使用
 try:
  raise MyError("This is a custom error")
 except MyError as e:
  print(f"Caught custom error: {e}")
```

### 5.2 带额外属性的自定义异常

```python
 class BusinessError(Exception):
  """业务异常类"""
  def __init__(self, message, error_code):
  super().__init__(message)
  self.error_code = error_code
 # 使用
 try:
  raise BusinessError("Insufficient funds", 4001)
 except BusinessError as e:
  print(f"Error: {e}")
  print(f"Error code: {e.error_code}")
```

### 5.3 异常层次结构

```python
 class BaseError(Exception):
  """基础异常类"""
  pass
 class AuthenticationError(BaseError):
  """认证异常"""
  pass
 class AuthorizationError(BaseError):
  """授权异常"""
  pass
 class NotFoundError(BaseError):
  """资源未找到异常"""
  pass
 # 使用
 try:
  raise AuthenticationError("Invalid credentials")
 except BaseError as e:
  print(f"Base error: {e}")
 except Exception as e:
  print(f"Other error: {e}")
```

## 6. 异常处理的最佳实践

### 6.1 只捕获必要的异常

```python
 # 不好的做法
 try:
  # 可能引发多种异常的代码
  value = int(input("Enter a number: "))
  result = 10 / value
 except:
  # 捕获所有异常，包括系统退出等
  print("An error occurred")
 # 好的做法
 try:
  value = int(input("Enter a number: "))
  result = 10 / value
 except ValueError:
  print("Invalid input")
 except ZeroDivisionError:
  print("Cannot divide by zero")
```

### 6.2 提供具体的错误信息

```python
 # 不好的做法
 try:
  file = open("data.txt", "r")
 except FileNotFoundError:
  print("Error")
 # 好的做法
 try:
  file = open("data.txt", "r")
 except FileNotFoundError as e:
  print(f"Error opening file: {e}")
```

### 6.3 使用 finally 或 with 语句清理资源

```python
 # 使用 finally
 try:
  file = open("data.txt", "r")
  content = file.read()
 except FileNotFoundError:
  print("File not found")
 finally:
  if 'file' in locals():
  file.close()
 # 使用 with 语句（更简洁）
 try:
  with open("data.txt", "r") as file:
  content = file.read()
 except FileNotFoundError:
  print("File not found")
 # 文件会自动关闭
```

### 6.4 避免过度使用异常

```python
 # 不好的做法
 try:
  value = int(input("Enter a number: "))
 except ValueError:
  print("Invalid input")
 # 好的做法（对于简单的输入验证）
 user_input = input("Enter a number: ")
 if user_input.isdigit():
  value = int(user_input)
 else:
  print("Invalid input")
```

### 6.5 合理使用异常层次结构

```python
 def process_data(data):
  try:
  # 处理数据
  pass
  except AuthenticationError:
  # 处理认证错误
  pass
  except AuthorizationError:
  # 处理授权错误
  pass
  except BaseError as e:
  # 处理其他业务错误
  pass
  except Exception as e:
  # 处理系统错误
  pass
```

## 7. 上下文管理器与异常处理

### 7.1 使用 `with` 语句

`with` 语句用于管理资源，确保资源在使用后被正确释放，即使发生异常。

```python
 # 使用 with 语句打开文件
 with open("data.txt", "r") as file:
  content = file.read()
  print(content)
 # 文件会自动关闭
 # 使用 with 语句处理多个资源
 with open("input.txt", "r") as infile, open("output.txt", "w") as outfile:
  content = infile.read()
  outfile.write(content)
 # 两个文件都会自动关闭
```

### 7.2 自定义上下文管理器

```python
 class MyContextManager:
  def __enter__(self):
  """进入上下文时执行"""
  print("Entering context")
  return self
  def __exit__(self, exc_type, exc_val, exc_tb):
  """退出上下文时执行"""
  print("Exiting context")
  if exc_type:
  print(f"An exception occurred: {exc_val}")
  # 返回  表示异常已处理，返回 False 表示异常需要继续传播
  return False
 # 使用自定义上下文管理器
 with MyContextManager() as cm:
  print("Inside context")
  # 引发异常
  raise ValueError("Test error")
 # 输出:
 # Entering context
 # Inside context
 # Exiting context
 # An exception occurred: Test error
 # Traceback (most recent call last):
 # ...
 # ValueError: Test error
```

## 8. 实际应用示例

### 8.1 文件操作

```python
 def read_file(file_path):
  """读取文件内容"""
  try:
  with open(file_path, "r", encoding="utf-8") as file:
  content = file.read()
  return content
  except FileNotFoundError:
  print(f"Error: File '{file_path}' not found")
  return None
  except PermissionError:
  print(f"Error: Permission denied for '{file_path}'")
  return None
  except UnicodeDecodeError:
  print(f"Error: Unable to decode file '{file_path}'")
  return None
 # 使用
 content = read_file("data.txt")
 if content:
  print(f"File content: {content[:100]}...")
```

### 8.2 网络请求

```python
 import requests
 def fetch_data(url):
  """获取网络数据"""
  try:
  response = requests.get(url, timeout=5)
  response.raise_for_status() # 引发 HTTP 错误
  return response.json()
  except requests.exceptions.Timeout:
  print("Error: Request timed out")
  return None
  except requests.exceptions.HTTPError as e:
  print(f"Error: HTTP error - {e}")
  return None
  except requests.exceptions.ConnectionError:
  print("Error: Connection error")
  return None
  except ValueError:
  print("Error: Invalid JSON response")
  return None
 # 使用
 data = fetch_data("https://api.example.com/data")
 if data:
  print(f"Data received: {data}")
```

### 8.3 数据库操作

```python
 import sqlite3
 def get_user(user_id):
  """从数据库获取用户信息"""
  try:
  conn = sqlite3.connect("users.db")
  cursor = conn.cursor()
  cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
  user = cursor.fetchone()
  return user
  except sqlite3.Error as e:
  print(f"Database error: {e}")
  return None
  finally:
  if 'conn' in locals():
  conn.close()
 # 使用
 user = get_user(1)
 if user:
  print(f"User: {user}")
```

### 8.4 业务逻辑

```python
 class InsufficientFundsError(Exception):
  """余额不足异常"""
  pass
 class Account:
  def __init__(self, balance):
  self.balance = balance
  def withdraw(self, amount):
  if amount > self.balance:
  raise InsufficientFundsError(f"Insufficient funds. Balance: {self.balance}, Requested: {amount}")
  self.balance -= amount
  return self.balance
 # 使用
 try:
  account = Account(1000)
  new_balance = account.withdraw(1500)
  print(f"New balance: {new_balance}")
 except InsufficientFundsError as e:
  print(f"Error: {e}")
```

## 9. 异常处理的性能考虑

### 9.1 异常的开销

异常处理会带来一定的性能开销，尤其是在频繁发生异常的情况下。因此，对于预期可能发生的情况，应该使用条件检查而不是异常处理。

```python
 # 性能较差的做法（频繁引发异常）
 def process_values(values):
  results = []
  for value in values:
  try:
  results.append(1 / value)
  except ZeroDivisionError:
  results.append(0)
  return results
 # 性能较好的做法（使用条件检查）
 def process_values(values):
  results = []
  for value in values:
  if value != 0:
  results.append(1 / value)
  else:
  results.append(0)
  return results
```

### 9.2 异常处理的最佳实践

- 只在真正意外的情况下使用异常
- 对于预期的错误情况，使用条件检查
- 保持异常处理代码简洁
- 避免在循环中频繁引发异常
- 合理使用异常层次结构，便于维护

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

## 动手实践

练习一（预测题）：不运行代码，判断输出：

```python
def risky():
    try:
        raise ValueError("原始错误")
    except KeyError:
        print("不会到这里")
    finally:
        print("finally 执行")

try:
    risky()
except ValueError as e:
    print(f"外层捕获: {e}")
```

提示：except 只拦截匹配的类型；finally 无论是否匹配都会执行。

<details>
<summary>参考实现</summary>

输出三行：`finally 执行`、`外层捕获: 原始错误`。`risky` 里的 `except KeyError` 与 ValueError 不匹配，ValueError 穿过该 except 向上传播——但 `finally` 在传播**之前**执行（finally 是唯一「异常也要经过」的出口）；离开 `risky` 后外层 `except ValueError` 接住。这正是「异常没被接住时 finally 依然运行」的语义演示：资源清理（finally/with）与错误处置（except）是两条独立机制，别指望一个 except 顺带做清理。
</details>

练习二（实战题）：写一个分层异常小系统：`AppError(Exception)` 基类，子类 `ConfigError` 与 `NetworkError`；`load_config` 函数在文件缺失时抛 `ConfigError` 并用 `raise ... from` 链上原始的 FileNotFoundError。写调用方代码区分捕获两种异常并打印异常链。

提示：`raise ConfigError(...) from exc`；查看链用 `e.__cause__`。

<details>
<summary>参考实现</summary>

```python
import json
from pathlib import Path

class AppError(Exception):
    """应用异常基类：上层只需要捕获它一族。"""

class ConfigError(AppError): ...
class NetworkError(AppError): ...

def load_config(path: str) -> dict:
    try:
        return json.loads(Path(path).read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise ConfigError(f"配置文件不存在: {path}") from exc
    except json.JSONDecodeError as exc:
        raise ConfigError(f"配置不是合法 JSON: {path}") from exc

def handle(path: str) -> None:
    try:
        print(load_config(path))
    except NetworkError as e:
        print(f"网络问题: {e}")          # 先接子类
    except ConfigError as e:
        print(f"配置问题: {e}; 根因: {e.__cause__!r}")

handle("missing.json")
# 配置问题: 配置文件不存在: missing.json; 根因: FileNotFoundError(2, 'No such file...')
```

设计要点：子类异常必须**先接**（except 按顺序匹配，基类在前会把子类全吞掉）；`from exc` 保留异常链，traceback 里出现 `The above exception was the direct cause...`，排障时能看到「翻译前的真相」；不写 from 时新异常的 `__context__` 也会隐式链上原异常，但语义是「处理中顺带发生的」，显式 from 才是「我翻译它」。
</details>

练习三（实战题）：给 320 篇的 HTTP 重试场景写 `retry_on(exc_types, attempts=3)` 装饰器：只对指定异常重试，每次间隔翻倍（1s、2s、4s），最后一次失败把原异常原样抛出（保留异常链）。

提示：装饰器与 `*args/**kwargs` 转发见 [装饰器](/python/500-Decorator)；「最后一次」判断用 `attempt == attempts - 1`。

<details>
<summary>参考实现</summary>

```python
import time
import functools

def retry_on(exc_types, attempts: int = 3):
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            last: Exception | None = None
            for attempt in range(attempts):
                try:
                    return func(*args, **kwargs)
                except exc_types as exc:        # 只重试声明的类型
                    last = exc
                    if attempt < attempts - 1:
                        time.sleep(2 ** attempt)
            raise last from last                 # 原异常原样上抛，链上自己
        return wrapper
    return decorator

@retry_on((TimeoutError, ConnectionError), attempts=3)
def flaky_fetch(url: str) -> str:
    raise TimeoutError(f"{url} 超时")

try:
    flaky_fetch("https://api.example.com")
except TimeoutError as e:
    print(f"三次重试后放弃: {e}")
```

要点：`except exc_types` 接元组——`except (A, B)` 是「任一匹配」，重试范围由调用方声明，绝不裸 `except Exception`（那会把 KeyboardInterrupt 之外的编程 bug 也重试三遍）；`raise last from last` 把最终失败与第一次异常链起来，调用方 traceback 能看到全部三次现场（其实最后一次的现场在 `__cause__`，前几次在日志里）。`functools.wraps` 保住被装饰函数的元信息。
</details>

练习四（找错题）：这个「读取可选配置」的函数有两处问题，先找再修：

```python
def get_setting(key, default=None):
    try:
        config = open("config.json", "r").read()
        import json
        return json.loads(config)[key]
    except Exception:
        return default
```

提示：open 没有 with；except Exception 吞了什么不该吞的？

<details>
<summary>参考实现</summary>

```python
import json
from pathlib import Path

def get_setting(key: str, default=None):
    try:
        data = json.loads(Path("config.json").read_text(encoding="utf-8"))
    except FileNotFoundError:
        return default                 # 文件缺失是「可选」的正常路径
    except json.JSONDecodeError as exc:
        raise ValueError("config.json 格式损坏") from exc   # 损坏要炸出来
    return data.get(key, default)      # 键缺失也走默认值
```

两处问题：其一，`open(...).read()` 没有 with——文件对象在 read 之后靠 GC 关闭，异常路径与 CPython 引用计数之外的实现上都可能泄漏句柄；其二，`except Exception` 把 `KeyError`（调用方拼错键名）、`json.JSONDecodeError`（配置损坏）、甚至 `MemoryError` 全部翻译成「返回默认值」——配置写坏了系统却安静地跑在默认值上，是最危险的一类静默故障。修后版本按「缺文件可选、损坏必须炸、键缺失可选」三种语义分别处置，这正是本篇最佳实践「接住你能处置的，放过你不能处置的」的落地。
</details>

练习五（实战题）：写 `validate_positive(*values)`：对所有参数做正数校验，任何一个不合法时**收集全部**错误（而不是发现第一个就停），最后用 `ExceptionGroup`（3.11+）一次性抛出；单参数合法时正常返回 None。

提示：收集错误列表后 `raise ExceptionGroup("校验失败", errors)`；配合 `except*` 语法。

<details>
<summary>参考实现</summary>

```python
def validate_positive(*values: float) -> None:
    errors: list[ValueError] = []
    for i, v in enumerate(values):
        if not isinstance(v, (int, float)) or v <= 0:
            errors.append(ValueError(f"第 {i} 个参数 {v!r} 不是正数"))
    if errors:
        raise ExceptionGroup("参数校验失败", errors)

try:
    validate_positive(1, -5, "abc", 0)
except* ValueError as eg:
    for err in eg.exceptions:
        print(err)
# 第 1 个参数 -5 不是正数
# 第 2 个参数 'abc' 不是正数
# 第 3 个参数 0 不是正数
```

要点：传统 raise 只能带一个异常，收集式校验要么只报第一个（用户要多轮才能改完），要么拼一条长字符串（丢失结构）；`ExceptionGroup` 把多个同类异常打包，`except*` 按类型分拣处理。`eg.exceptions` 是打包内的原始异常元组。这个模式在批量校验（表单、配置、文件清单）里是 3.11+ 的正解，与 TaskGroup 的多任务异常聚合是同一机制的两个消费端（TaskGroup 见 [异步编程进阶](/python/670-AsyncProgrammingDetailed)）。
</details>

## 自我检查

- 能画出 BaseException 的主干分支（KeyboardInterrupt、SystemExit、Exception）并说出「业务代码只捕 Exception 及其子类」的理由；
- 能写出 try/except/else/finally 四段各自的职责，并解释 finally 在异常传播路径上的执行时机；
- 能用 `raise NewError(...) from exc` 保留异常链并说明与隐式 `__context__` 的语义差异；
- 能设计分层异常体系（领域基类 + 具体子类）并按「子类先接」的顺序捕获；
- 能说出裸 `except Exception: return default` 的静默故障风险，并按语义拆分处置路径；
- 能用 ExceptionGroup 与 `except*` 做批量校验的多错误聚合。
