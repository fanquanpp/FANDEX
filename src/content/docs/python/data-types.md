---
order: 40
tags:
  - 'python'
  - 'database'
difficulty: 'beginner'
title: '基础数据类型'
module: 'python'
category: 'Python Basics'
description: '数值、字符串、布尔类型与类型转换。'
author: 'Anonymous'
---

## 目录

1. [数字](#数字)
2. [字符串](#字符串)
3. [布尔](#布尔)
4. [空值](#空值)
5. [类型转换](#类型转换)
6. [类型检查](#类型检查)
7. [最佳实践](#最佳实践)

---

## 1. 数字 (Numbers)

Python 3 提供了三种数值类型：

- **`int` (整型)**: 任意精度整数，在 Python 3 中不再有 `long` 类型。
- **`float` (浮点型)**: 双精度浮点数（64位）。
- **`complex` (复数)**: 形如 `3 + 4j`，其中 `j` 表示虚数单位。

### 1.1 整数类型

#### 1.1.1 整数表示

```python
 # 十进制整数
 x = 123
 # 二进制整数（以 0b 或 0B 开头）
 y = 0b1010 # 10
 # 八进制整数（以 0o 或 0O 开头）
 z = 0o123 # 83
 # 十六进制整数（以 0x 或 0X 开头）
 p = 0x1A # 26
```

#### 1.1.2 整数操作

```python
 # 基本算术运算
 addition = 10 + 5 # 15
 subtraction = 10 - 5 # 5
 multiplication = 10 * 5 # 50
 division = 10 / 5 # 2.0（总是返回浮点数）
 floor_division = 10 // 3 # 3（整除，向下取整）
 modulo = 10 % 3 # 1（取模/余数）
 power = 2 ** 3 # 8（幂运算）
 # 复合赋值运算符
 x = 10
 x += 5 # x = x + 5 → 15
 x -= 3 # x = x - 3 → 12
 x *= 2 # x = x * 2 → 24
 x /= 4 # x = x / 4 → 6.0
 x //= 2 # x = x // 2 → 3.0（注意：结果是浮点数）
```

### 1.2 浮点数类型

#### 1.2.1 浮点数表示

```python
 # 普通浮点数
 pi = 3.14159
 # 科学记数法
 avogadro = 6.022e23 # 6.022 × 10²³
 small = 1.23e-4 # 1.23 × 10⁻⁴
```

#### 1.2.2 浮点数操作

```python
 # 基本算术运算
 f1 = 3.14 + 2.71 # 5.85
 f2 = 10.0 - 3.5 # 6.5
 f3 = 2.5 * 4.0 # 10.0
 f4 = 10.0 / 3.0 # 3.3333333333333335
 # 浮点数精度问题
 0.1 + 0.2 # 0.30000000000000004（注意：浮点数精度限制）
```

### 1.3 复数类型

```python
 # 复数定义
 c1 = 3 + 4j
 c2 = complex(2, 5) # 2 + 5j
 # 复数运算
 c3 = c1 + c2 # 5 + 9j
 c4 = c1 * c2 # (3*2 - 4*5) + (3*5 + 4*2)j → -14 + 23j
 # 复数属性
 print(c1.real) # 3.0（实部）
 print(c1.imag) # 4.0（虚部）
 print(c1.conjugate()) # 3 - 4j（共轭复数）
```

### 1.4 数学函数

Python 提供了 `math` 模块来支持更复杂的数学运算：

```python
 import math
 # 基本数学函数
 print(math.pi) # π ≈ 3.141592653589793
 print(math.e) # e ≈ 2.718281828459045
 # 三角函数
 print(math.sin(math.pi/2)) # sin(π/2) = 1.0
 print(math.cos(math.pi)) # cos(π) = -1.0
 # 指数和对数
 print(math.exp(1)) # e¹ ≈ 2.71828
 print(math.log(math.e)) # ln(e) = 1.0
 print(math.log10(100)) # log₁₀(100) = 2.0
 # 取整函数
 print(math.floor(3.9)) # 3（向下取整）
 print(math.ceil(3.1)) # 4（向上取整）
 print(round(3.5)) # 4（四舍五入）
 # 其他函数
 print(math.sqrt(16)) # 4.0（平方根）
 print(math.factorial(5)) # 120（阶乘）
```

## 2. 字符串 (Strings - `str`)

字符串是不可变的序列类型，用于存储 Unicode 字符。

### 2.1 字符串定义

```python
 # 单引号字符串
 s1 = 'Hello, World!'
 # 双引号字符串
 s2 = "Hello, World!"
 # 三引号字符串（支持多行）
 s3 = '''Hello,
 World!'''
 # 原始字符串（不转义）
 s4 = r'C:\\path\\to\\file' # 输出: C:\path\to\file
 # 字节字符串（Python 3）
 s5 = b'Hello' # 字节字符串，类型为 bytes
```

### 2.2 字符串操作

#### 2.2.1 字符串拼接

```python
 # 使用 + 运算符
 first_name = "Alice"
 last_name = "Smith"
 full_name = first_name + " " + last_name # "Alice Smith"
 # 使用 * 运算符重复
 print("Hello" * 3) # "HelloHelloHello"
 # 使用 f-string（Python 3.6+）
 age = 30
 message = f"My name is {full_name} and I am {age} years old."
```

#### 2.2.2 字符串切片

字符串切片使用 `s[start:stop:step]` 语法：

```python
 s = "Hello, World!"
 # 获取单个字符
 print(s[0]) # 'H'
 print(s[-1]) # '!'
 # 切片操作
 print(s[0:5]) # 'Hello'（从索引 0 到 4）
 print(s[7:]) # 'World!'（从索引 7 到末尾）
 print(s[:5]) # 'Hello'（从开头到索引 4）
 print(s[::2]) # 'Hlo ol!'（步长为 2）
 print(s[::-1]) # '!dlroW ,olleH'（反转字符串）
```

#### 2.2.3 字符串方法

Python 提供了丰富的字符串方法：

```python
 s = "Hello, World!"
 # 大小写转换
 print(s.upper()) # 'HELLO, WORLD!'
 print(s.lower()) # 'hello, world!'
 print(s.title()) # 'Hello, World!'
 print(s.capitalize()) # 'Hello, world!'
 # 查找和替换
 print(s.find("World")) # 7（首次出现的索引）
 print(s.replace("World", "Python")) # 'Hello, Python!'
 # 分割和连接
 print(s.split(", ")) # ['Hello', 'World!']
 print(", ".join(["Hello", "Python"])) # 'Hello, Python'
 # 去除空白
 print(" Hello ".strip()) # 'Hello'
 print(" Hello ".lstrip()) # 'Hello '
 print(" Hello ".rstrip()) # ' Hello'
 # 检查方法
 print(s.startswith("Hello")) #
 print(s.endswith("!")) #
 print(s.isalpha()) # False（包含非字母字符）
 print("123".isdigit()) #
 print("Hello123".isalnum()) #
```

### 2.3 字符串格式化

Python 提供了多种字符串格式化方法：

#### 2.3.1 f-string（推荐，Python 3.6+）

```python
 name = "Alice"
 age = 30
 # 基本用法
 print(f"My name is {name} and I am {age} years old.")
 # 表达式
 print(f"Next year I will be {age + 1} years old.")
 # 格式化选项
 pi = 3.14159
 print(f"Pi is approximately {pi:.2f}") # 3.14
 print(f"Age: {age:03d}") # 030
 print(f"Name: {name:>10}") # ' Alice'
 print(f"Name: {name:<10}") # 'Alice '
 print(f"Name: {name:^10}") # ' Alice '
```

#### 2.3.2 format() 方法

```python
 # 基本用法
 print("My name is {} and I am {} years old.".format(name, age))
 # 位置参数
 print("{0} {1}".format("Hello", "World")) # 'Hello World'
 print("{1} {0}".format("Hello", "World")) # 'World Hello'
 # 关键字参数
 print("My name is {name} and I am {age} years old.".format(name="Bob", age=25))
 # 格式化选项
 print("Pi is approximately {:.2f}".format(pi)) # 3.14
```

#### 2.3.3 % 运算符

```python
 # 基本用法
 print("My name is %s and I am %d years old." % (name, age))
 # 格式化选项
 print("Pi is approximately %.2f" % pi) # 3.14
 print("Age: %03d" % age) # 030
 print("Name: %10s" % name) # ' Alice'
```

## 3. 布尔 (Booleans - `bool`)

布尔类型只有两个值：``和`False`。

### 3.1 布尔运算

```python
 # 逻辑运算符
 print( and False) # False
 print( or False) #
 print(not True) # False
 # 比较运算符
 print(5 > 3) #
 print(5 == 3) # False
 print(5 != 3) #
 print(5 >= 3) #
 print(5 <= 3) # False
```

### 3.2 布尔上下文

在 Python 中，所有对象都可以在布尔上下文中使用（如 `if` 语句）：

```python
 # 布尔上下文中的评估
 if "Hello":
  print("非空字符串为真")
 if [1, 2, 3]:
  print("非空列表为真")
 if 0:
  print("0 为假")
 else:
  print("0 为假")
 if None:
  print("None 为假")
 else:
  print("None 为假")
```

### 3.3 Falsy 值

以下值在布尔上下文中被视为 `False`：

- `None`
- `False`
- 数字：`0`, `0.0`, `0j`（复数）
- 序列和集合：`""`（空字符串）, `[]`（空列表）, `()`（空元组）, `{}`（空字典）, `set()`（空集合）
  所有其他值都被视为 ``。

## 4. 空值 (NoneType - `None`)

`None` 是 Python 中的特殊值，表示「无」或「空」。

### 4.1 基本用法

```python
 # 赋值
 x = None
 print(x) # None
 # 函数默认参数
 def greet(name=None):
  if name is None:
  print("Hello, Guest!")
  else:
  print(f"Hello, {name}!")
 greet() # Hello, Guest!
 greet("Alice") # Hello, Alice!
 # 函数返回值（如果没有显式返回值）
 def no_return():
  pass
 print(no_return()) # None
```

### 4.2 注意事项

```python
 # None 不等于 0、False 或空字符串
 print(None == 0) # False
 print(None == False) # False
 print(None == "") # False
 # 使用 is 运算符检查 None（推荐）
 x = None
 print(x is None) #
 print(x is not None) # False
```

## 5. 类型转换 (Type Casting)

Python 提供了内置函数来进行类型转换：

### 5.1 基本类型转换

```python
 # 转换为整数
 print(int("123")) # 123
 print(int(3.9)) # 3（向下取整）
 print(int(True)) # 1
 print(int(False)) # 0
 # 转换为浮点数
 print(float("3.14")) # 3.14
 print(float(10)) # 10.0
 print(float(True)) # 1.0
 # 转换为字符串
 print(str(123)) # "123"
 print(str(3.14)) # "3.14"
 print(str(True)) # ""
 print(str(None)) # "None"
 # 转换为布尔值
 print(bool(1)) #
 print(bool(0)) # False
 print(bool("Hello")) #
 print(bool("")) # False
 print(bool([])) # False
 print(bool(None)) # False
```

### 5.2 高级类型转换

```python
 # 转换为列表
 print(list("Hello")) # ['H', 'e', 'l', 'l', 'o']
 print(list((1, 2, 3))) # [1, 2, 3]
 # 转换为元组
 print(tuple([1, 2, 3])) # (1, 2, 3)
 print(tuple("Hello")) # ('H', 'e', 'l', 'l', 'o')
 # 转换为集合
 print(set([1, 2, 3, 2, 1])) # {1, 2, 3}（去重）
 # 转换为字典
 print(dict([("a", 1), ("b", 2)])) # {'a': 1, 'b': 2}
```

## 6. 类型检查

使用 `type()` 函数检查对象的类型：

```python
 print(type(42)) # <class 'int'>
 print(type(3.14)) # <class 'float'>
 print(type("Hello")) # <class 'str'>
 print(type(True)) # <class 'bool'>
 print(type(None)) # <class 'NoneType'>
 print(type([1, 2, 3])) # <class 'list'>
 print(type((1, 2, 3))) # <class 'tuple'>
 print(type({"a": 1})) # <class 'dict'>
 # 使用 isinstance() 检查类型
 print(isinstance(42, int)) #
 print(isinstance(3.14, float)) #
 print(isinstance("Hello", str)) #
 print(isinstance([1, 2, 3], list)) #
 # 检查是否为多种类型之一
 print(isinstance(42, (int, float))) #
```

## 7. 最佳实践

### 7.1 数字类型

- **整数**：使用 `int` 类型存储整数，Python 会自动处理大整数。
- **浮点数**：注意浮点数精度问题，如需精确计算，考虑使用 `decimal` 模块。
- **复数**：仅在需要时使用复数类型。

### 7.2 字符串

- **定义**：优先使用单引号或双引号，多行字符串使用三引号。
- **格式化**：优先使用 f-string（Python 3.6+），它更简洁易读。
- **操作**：字符串是不可变的，频繁修改字符串会创建新对象，考虑使用 `list` 或 `io.StringIO`。

### 7.3 布尔和 None

- **布尔**：直接使用布尔值，避免使用 `== ` 或 `== False`。
- **None**：使用 `is None` 和 `is not None` 检查 None 值，而不是 `== None`。

### 7.4 类型转换

- **安全转换**：在转换前检查值是否有效，避免运行时错误。
- **显式转换**：当类型不明确时，使用显式类型转换提高代码可读性。

---

### 更新日志 (Changelog)

- 2026-04-05: 细化 Python 基本数据类型及常用操作。
- 2026-04-05: 扩写内容，增加详细的数字类型操作、字符串方法、布尔运算、None 使用场景、类型转换和最佳实践等内容。
