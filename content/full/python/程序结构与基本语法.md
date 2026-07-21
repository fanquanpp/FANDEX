---
order: 20
tags:
  - python
difficulty: beginner
title: 程序结构与基本语法
module: python
category: 'Python Basics'
description: 'Python 缩进规则、语句、注释与编码规范。'
author: Anonymous
related:
  - python/语法速查
  - python/概述与环境配置
  - python/变量与常量
  - python/基础数据类型
prerequisites: []
---

## 1. 程序结构 (Program Structure)

Python 程序由多个组件组成，包括模块导入、全局变量、函数定义、类定义和主逻辑。一个完整的 Python 程序通常遵循以下结构：

### 1.1 标准程序结构

```python
 """
 模块文档字符串
 module-level docstring
 描述模块的功能、使用方法等
 """
 # 模块导入 | Module imports
 import math
 import os
 from datetime import datetime
 # 全局变量 | Global variables
 PI = math.pi
 MAX_VALUE = 100
 # 函数定义 | Function definitions
 def calculate_area(radius):
  """
  计算圆面积 | Calculate area of a circle
  Args:
  radius (float): 圆的半径
  Returns:
  float: 圆的面积
  """
  return PI * (radius ** 2)
 # 类定义 | Class definitions
 class Circle:
  """
  圆类 | Circle class
  """
  def __init__(self, radius):
  self.radius = radius
  def area(self):
  """
  计算面积 | Calculate area
  """
  return calculate_area(self.radius)
 # 主函数 | Main function
 def main():
  """
  主函数 | Main function
  """
  # 局部变量 | Local variables
  r = 5
  circle = Circle(r)
  area = circle.area()
  print(f"Radius: {r}, Area: {area:.2f}")
 # 标准入口点 | Entry point
 if __name__ == "__main__":
  main()
```

### 1.2 程序结构说明

| 组件           | 描述                             | 位置           |
| :------------- | :------------------------------- | :------------- |
| **文档字符串** | 模块级文档，描述模块功能         | 文件开头       |
| **模块导入**   | 导入所需的模块和包               | 文档字符串之后 |
| **全局变量**   | 整个模块可访问的变量             | 模块导入之后   |
| **函数定义**   | 定义可重用的函数                 | 全局变量之后   |
| **类定义**     | 定义面向对象的类                 | 函数定义之后   |
| **主函数**     | 包含程序主要逻辑                 | 类定义之后     |
| **入口点检查** | 确保模块作为脚本运行时执行主逻辑 | 文件末尾       |

### 1.3 入口点机制

`if __name__ == "__main__":` 是 Python 的标准入口点机制：

- 当模块作为脚本直接运行时，`__name__` 变量的值为 `"__main__"`
- 当模块被其他模块导入时，`__name__` 变量的值为模块名
  这样可以确保：
- 模块可以作为脚本直接运行
- 模块可以被其他模块导入而不会执行主逻辑

## 2. 缩进规则 (Indentation)

Python 使用缩进（而非花括号 `{}`）来定义代码块，这是 Python 的一个显著特点。

### 2.1 缩进规则

- **强制要求**: 同一级别的代码块缩进量必须一致
- **规范 (PEP 8)**: 使用 **4 个空格**作为缩进单位
- **禁止**: 禁止混用空格和制表符 (Tab)
- **级别**: 不同级别的代码块使用不同的缩进深度

### 2.2 缩进示例

```python
 # 正确的缩进
 def example():
  if True:
  print("Inside if")
  for i in range(3):
  print(f"Loop {i}")
  print("Outside if")
 # 错误的缩进（不一致）
 def bad_example():
  if True:
  print("Inside if") # 4 空格
  print("Wrong indent") # 6 空格（错误）
```

### 2.3 缩进相关的常见错误

| 错误类型           | 错误示例               | 解决方案               |
| :----------------- | :--------------------- | :--------------------- |
| **缩进不一致**     | 混用 2 空格和 4 空格   | 统一使用 4 空格        |
| **缺少缩进**       | 代码块没有缩进         | 为代码块添加正确的缩进 |
| **多余缩进**       | 不需要缩进的代码被缩进 | 移除多余的缩进         |
| **混用空格和 Tab** | 混合使用空格和 Tab     | 统一使用空格           |

### 2.4 缩进工具

- **编辑器设置**: 配置编辑器使用 4 空格作为缩进
- PyCharm: Settings → Editor → Code Style → Python → Indentation
- VS Code: Settings → Editor: Tab Size → 4, Editor: Insert Spaces →
- **自动格式化**: 使用 `black` 或 `autopep8` 自动格式化代码

```bash
 pip install black
 black your_script.py
```

## 3. 注释规范 (Comments)

注释是代码的重要组成部分，用于解释代码的功能、逻辑和使用方法。

### 3.1 注释类型

| 类型           | 语法          | 用途                 | 示例                           |
| :------------- | :------------ | :------------------- | :----------------------------- |
| **单行注释**   | `#`           | 单行注释             | `# 这是一个单行注释`           |
| **多行注释**   | 多个 `#`      | 多行注释             | `# 这是第一行\n# 这是第二行`   |
| **文档字符串** | `""" ... """` | 模块、函数、类的文档 | `def func():\n """函数文档"""` |

### 3.2 文档字符串 (Docstrings)

文档字符串是一种特殊的注释，用于为模块、函数、类和方法提供文档。

#### 3.2.1 模块文档字符串

```python
 """
 模块名称
 模块描述：详细说明模块的功能、用途和使用方法
 作者: 作者姓名
 版本: 1.0.0
 """
```

#### 3.2.2 函数文档字符串

```python
 def calculate_area(radius):
  """
  计算圆的面积
  Args:
  radius (float): 圆的半径，必须为正数
  Returns:
  float: 圆的面积
  Raises:
  ValueError: 如果半径为负数或零
  Example:
  >>> calculate_area(5)
  78.53981633974483
  """
  if radius <= 0:
  raise ValueError("Radius must be positive")
  return math.pi * (radius ** 2)
```

#### 3.2.3 类文档字符串

```python
 class Circle:
  """
  圆类，用于表示和计算圆的属性
  Attributes:
  radius (float): 圆的半径
  Methods:
  area(): 计算圆的面积
  circumference(): 计算圆的周长
  """
  def __init__(self, radius):
  self.radius = radius
  def area(self):
  """计算圆的面积"""
  return calculate_area(self.radius)
```

### 3.3 注释最佳实践

- **简洁明了**: 注释应该简洁明了，避免冗长
- **解释原因**: 注释应该解释为什么这样做，而不是解释代码在做什么
- **保持更新**: 代码修改时，相应的注释也应该更新
- **避免冗余**: 不要注释显而易见的代码
- **使用英文**: 建议使用英文注释，便于国际化协作
- **规范格式**: 遵循项目的注释风格规范

### 3.4 注释示例

```python
 # 好的注释示例
 # 计算用户年龄，考虑闰年
 age = calculate_age(birth_date, current_date)
 # 不好的注释示例
 # 计算年龄
 age = calculate_age(birth_date, current_date) # 这是计算年龄的代码
```

## 4. 标识符与关键字 (Identifiers & Keywords)

### 4.1 标识符规则

标识符是用来命名变量、函数、类、模块等的名称，必须遵循以下规则：

- **组成**: 由字母（a-z, A-Z）、数字（0-9）和下划线（\_）组成
- **开头**: 不能以数字开头
- **区分大小写**: `name` 和 `Name` 是不同的标识符
- **长度**: 理论上可以任意长，但建议保持合理长度
- **禁止**: 不能使用 Python 关键字作为标识符

### 4.2 Python 关键字

Python 有以下关键字，这些词不能作为标识符：

| 关键字     | 用途         | 关键字     | 用途         |
| :--------- | :----------- | :--------- | :----------- |
| `False`    | 布尔值假     | `None`     | 空值         |
| ``         | 布尔值真     | `and`      | 逻辑与       |
| `as`       | 别名         | `or`       | 逻辑或       |
| `assert`   | 断言         | `not`      | 逻辑非       |
| `break`    | 跳出循环     | `if`       | 条件判断     |
| `class`    | 定义类       | `elif`     | 条件分支     |
| `continue` | 继续循环     | `else`     | 条件分支     |
| `def`      | 定义函数     | `for`      | 循环         |
| `del`      | 删除对象     | `while`    | 循环         |
| `elif`     | 条件分支     | `try`      | 异常处理     |
| `else`     | 条件分支     | `except`   | 异常处理     |
| `except`   | 异常处理     | `finally`  | 异常处理     |
| `finally`  | 异常处理     | `raise`    | 抛出异常     |
| `for`      | 循环         | `import`   | 导入模块     |
| `from`     | 从模块导入   | `pass`     | 空语句       |
| `global`   | 全局变量     | `return`   | 返回值       |
| `nonlocal` | 非局部变量   | `with`     | 上下文管理器 |
| `if`       | 条件判断     | `yield`    | 生成器       |
| `import`   | 导入模块     | `lambda`   | 匿名函数     |
| `in`       | 成员测试     | `is`       | 身份测试     |
| `is`       | 身份测试     | `as`       | 别名         |
| `lambda`   | 匿名函数     | `with`     | 上下文管理器 |
| `pass`     | 空语句       | `async`    | 异步编程     |
| `return`   | 返回值       | `await`    | 异步编程     |
| `try`      | 异常处理     | `break`    | 跳出循环     |
| `while`    | 循环         | `class`    | 定义类       |
| `with`     | 上下文管理器 | `continue` | 继续循环     |
| `yield`    | 生成器       | `def`      | 定义函数     |
| `async`    | 异步编程     | `del`      | 删除对象     |
| `await`    | 异步编程     | `global`   | 全局变量     |
| `nonlocal` | 非局部变量   |            |              |

### 4.3 命名规范

Python 推荐使用以下命名规范（PEP 8）：

| 类型                  | 命名风格           | 示例                                 |
| :-------------------- | :----------------- | :----------------------------------- |
| **变量**              | `snake_case`       | `user_name`, `total_count`           |
| **函数**              | `snake_case`       | `calculate_area`, `get_user_info`    |
| **类**                | `PascalCase`       | `User`, `Circle`, `HttpRequest`      |
| **常量**              | `UPPER_SNAKE_CASE` | `MAX_VALUE`, `PI`, `DEFAULT_TIMEOUT` |
| **模块**              | `snake_case`       | `data_processor`, `utils`            |
| **包**                | `snake_case`       | `my_package`, `project_utils`        |
| **受保护的属性/方法** | `_snake_case`      | `_private_var`, `_internal_method`   |
| **私有属性/方法**     | `__snake_case`     | `__private_var`, `__internal_method` |
| **特殊方法**          | `__snake_case__`   | `__init__`, `__str__`                |

### 4.4 命名最佳实践

- **描述性**: 变量名应该清晰地描述其用途
- **简洁**: 变量名应该简洁但不失描述性
- **一致**: 同一项目中使用一致的命名风格
- **避免缩写**: 除非是广泛认可的缩写（如 `id`, `url`）
- **避免单字母变量**: 除了循环计数器和临时变量外，避免使用单字母变量
- **使用英文**: 变量名应该使用英文，避免使用中文或其他语言

## 5. 语句换行 (Line Breaks)

Python 允许在需要时将长语句分成多行，提高代码可读性。

### 5.1 换行方式

| 方式           | 语法                     | 示例                |
| :------------- | :----------------------- | :------------------ |
| **显式换行**   | 使用反斜杠 `\`           | `result = a + b + \ |
| c + d`         |
| **隐式换行**   | 在 `()`, `[]`, `{}` 内部 | `result = (a + b +  |
| c + d)`        |
| **逗号后换行** | 在逗号后换行             | `items = [          |

'apple',
'banana',
'cherry'
]` |

### 5.2 换行最佳实践

- **可读性**: 选择最具可读性的换行方式
- **一致性**: 在同一项目中使用一致的换行风格
- **缩进**: 换行后的代码应该适当缩进
- **避免过长行**: 每行代码长度不应超过 79 个字符（PEP 8 建议）

### 5.3 换行示例

```python
 # 显式换行
 long_string = "This is a very long string that " \
  "spans multiple lines using backslash"
 # 隐式换行（推荐）
 long_string = (
  "This is a very long string that "
  "spans multiple lines using parentheses"
 )
 # 列表换行
 numbers = [
  1, 2, 3,
  4, 5, 6,
  7, 8, 9
 ]
 # 函数调用换行
 result = calculate(
  param1=value1,
  param2=value2,
  param3=value3
 )
 # 条件语句换行
 if (
  condition1 and
  condition2 or
  condition3
 )
  do_something()
```

## 6. 其他基础语法

### 6.1 分号

Python 允许在一行中使用分号分隔多个语句，但不推荐这样做：

```python
 # 不推荐的写法
 x = 1; y = 2; print(x + y)
 # 推荐的写法
 x = 1
 y = 2
 print(x + y)
```

### 6.2 空语句

`pass` 是 Python 中的空语句，用于占据语法上需要语句的位置：

```python
 def placeholder_function():
  pass # 占位符，后续会实现
 class PlaceholderClass:
  pass # 占位符，后续会实现
 if condition:
  pass # 暂时不做任何事情
 else:
  do_something()
```

### 6.3 代码块

Python 使用缩进来定义代码块，以下结构会创建代码块：

- `if`、`elif`、`else` 语句
- `for`、`while` 循环
- `def` 函数定义
- `class` 类定义
- `try`、`except`、`finally` 异常处理
- `with` 上下文管理器

### 6.4 多行语句

可以使用括号 `()`、方括号 `[]` 或花括号 `{}` 将多个语句组合成一个逻辑行：

```python
 # 多行赋值
 (a, b, c) = (1, 2, 3)
 # 多行条件
 if (condition1 and
  condition2):
  do_something()
 # 多行字典
 data = {
  'name': 'John',
  'age': 30,
  'city': 'New York'
 }
```

## 7. 代码风格指南

### 7.1 PEP 8 核心规则

- **缩进**: 4 个空格，不要使用 Tab
- **行长**: 每行不超过 79 个字符
- **空行**:
- 模块级函数和类定义之间用两个空行
- 类内部方法定义之间用一个空行
- 函数内部逻辑块之间用一个空行
- **空格**:
- 操作符两侧使用空格
- 逗号后使用空格
- 函数参数列表中，等号两侧不使用空格
- **命名**: 遵循 PEP 8 命名规范
- **导入**:
- 每个导入语句单独一行
- 标准库、第三方库、本地模块分开导入

### 7.2 代码风格检查工具

- **flake8**: 检查代码风格和常见错误

```bash
 pip install flake8
 flake8 your_script.py
```

- **pylint**: 更全面的代码分析工具

```bash
 pip install pylint
 pylint your_script.py
```

- **black**: 自动格式化代码

```bash
 pip install black
 black your_script.py
```

- **isort**: 自动排序导入语句

```bash
 pip install isort
 isort your_script.py
```

## 8. 实际应用示例

### 8.1 完整的 Python 程序示例

```python
 """
 温度转换工具
 这个模块提供摄氏度和华氏度之间的转换功能
 """
 # 导入模块
 import sys
 # 全局常量
 FREEZING_POINT_C = 0 # 水的冰点（摄氏度）
 BOILING_POINT_C = 100 # 水的沸点（摄氏度）
 def celsius_to_fahrenheit(celsius):
  """
  将摄氏度转换为华氏度
  Args:
  celsius (float): 摄氏度温度
  Returns:
  float: 华氏度温度
  """
  return (celsius * 9/5) + 32
 def fahrenheit_to_celsius(fahrenheit):
  """
  将华氏度转换为摄氏度
  Args:
  fahrenheit (float): 华氏度温度
  Returns:
  float: 摄氏度温度
  """
  return (fahrenheit - 32) * 5/9
 def main():
  """
  主函数，处理命令行参数并执行转换
  """
  if len(sys.argv) != 3:
  print("用法: python temperature.py <单位> <温度>")
  print("单位: c (摄氏度) 或 f (华氏度)")
  return
  unit = sys.argv[1].lower()
  try:
  temperature = float(sys.argv[2])
  except ValueError:
  print("错误: 温度必须是数字")
  return
  if unit == 'c':
  result = celsius_to_fahrenheit(temperature)
  print(f"{temperature}°C = {result:.2f}°F")
  elif unit == 'f':
  result = fahrenheit_to_celsius(temperature)
  print(f"{temperature}°F = {result:.2f}°C")
  else:
  print("错误: 单位必须是 'c' 或 'f'")
 if __name__ == "__main__":
  main()
```

### 8.2 运行示例

```bash
 # 将 100 摄氏度转换为华氏度
 python temperature.py c 100
 # 输出: 100.0°C = 212.00°F
 # 将 32 华氏度转换为摄氏度
 python temperature.py f 32
 # 输出: 32.0°F = 0.00°C
```

## 9. 常见问题与解决方案

### 9.1 语法错误

| 错误                 | 原因     | 解决方案                             |
| :------------------- | :------- | :----------------------------------- |
| **IndentationError** | 缩进错误 | 检查缩进是否一致，使用 4 空格        |
| **SyntaxError**      | 语法错误 | 检查括号、引号是否匹配，语法是否正确 |
| **NameError**        | 名称错误 | 检查变量名是否正确拼写，是否已定义   |
| **TypeError**        | 类型错误 | 检查操作的数据类型是否正确           |

### 9.2 代码风格问题

| 问题             | 原因                    | 解决方案                       |
| :--------------- | :---------------------- | :----------------------------- |
| **行过长**       | 代码行超过 79 字符      | 使用换行，将长行分成多行       |
| **命名不规范**   | 没有遵循 PEP 8 命名规范 | 修改变量名，使用正确的命名风格 |
| **注释不足**     | 代码缺少必要的注释      | 添加适当的注释和文档字符串     |
| **导入顺序混乱** | 导入语句顺序不正确      | 使用 isort 自动排序导入语句    |

### 9.3 最佳实践建议

- **使用版本控制**: 如 Git，跟踪代码变更
- **编写测试**: 使用 pytest 编写单元测试
- **使用虚拟环境**: 隔离项目依赖
- **持续集成**: 使用 CI 工具自动检查代码风格和运行测试
- **代码审查**: 定期进行代码审查，提高代码质量

## 10. 总结

Python 的程序结构和基础语法设计简洁明了，强调代码可读性和一致性。通过遵循 PEP 8 规范和最佳实践，可以编写更加清晰、可维护的 Python 代码。

### 10.1 关键要点

- **程序结构**: 遵循标准的 Python 程序结构，包括模块导入、全局变量、函数定义、类定义和主逻辑
- **缩进**: 使用 4 个空格作为缩进单位，保持缩进一致
- **注释**: 使用适当的注释和文档字符串，解释代码的功能和逻辑
- **命名**: 遵循 PEP 8 命名规范，使用描述性的名称
- **换行**: 在需要时使用适当的换行方式，提高代码可读性
- **代码风格**: 遵循 PEP 8 代码风格指南，使用工具检查和格式化代码

### 10.2 学习建议

- **实践**: 编写实际的 Python 程序，练习基础语法
- **阅读**: 阅读优秀的 Python 代码，学习好的编程风格
- **工具**: 使用代码分析工具和格式化工具，提高代码质量
- **社区**: 参与 Python 社区，学习和分享经验
  通过掌握 Python 的程序结构和基础语法，可以为后续的 Python 编程学习打下坚实的基础。

---

### 更新日志 (Changelog)

- 2026-04-05: 拆分并细化 Python 基础语法规则。
- 2026-04-05: 扩写内容，增加详细的程序结构说明、缩进规则、注释规范、标识符规则、语句换行和代码风格等内容。
