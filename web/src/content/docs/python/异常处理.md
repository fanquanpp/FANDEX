---
order: 120
tags:
  - python
difficulty: intermediate
title: 异常处理
module: python
category: 'Python Basics'
description: '异常体系、try-except、自定义异常与上下文管理器。'
author: Anonymous
related:
  - python/打包与发布
  - python/面向对象编程
  - python/文件IO与上下文管理器
  - 'python/项目示例-网页爬虫与数据分析'
prerequisites:
  - python/语法速查
---

## 1. 异常体系 (Exception Hierarchy)

Python 中的所有异常都派生自 `BaseException` 类，形成了一个层次结构。

### 1.1 异常层次结构

```
 BaseException
 ├── SystemExit
 ├── KeyboardInterrupt
 ├── GeneratorExit
 └── Exception
  ├── ArithmeticError
  │ ├── FloatingPointError
  │ ├── OverflowError
  │ └── ZeroDivisionError
  ├── AssertionError
  ├── AttributeError
  ├── EOFError
  ├── ImportError
  ├── LookupError
  │ ├── IndexError
  │ └── KeyError
  ├── NameError
  ├── OSError
  │ ├── FileNotFoundError
  │ └── PermissionError
  ├── SyntaxError
  ├── TypeError
  └── ValueError
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

### 更新日志 (Changelog)

- 2026-04-05: 补充异常体系与自定义异常细节。
- 2026-04-05: 扩写内容，增加详细的异常体系、捕获处理、抛出异常、断言、自定义异常、最佳实践和实际示例等内容。
