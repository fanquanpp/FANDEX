---
order: 70
tags:
  - python
difficulty: intermediate
title: 函数详解
module: python
category: 'Python Basics'
description: '函数定义、参数类型、lambda 表达式与高阶函数。'
author: Anonymous
related:
  - python/Python与Web爬虫
  - python/Python与自动化
  - python/Python与测试
  - python/Python与日志
prerequisites:
  - python/语法速查
---

## 1. 函数基本语法 (Basic Syntax)

函数是封装逻辑的可重用代码块，用于组织和简化代码。

### 1.1 定义与调用 (Definition & Invocation)

```python
 # 基本函数定义
 def greet(name, msg="Hello"):
  """
  函数文档字符串 | Docstring
  Args:
  name (str): 用户名
  msg (str): 问候消息，默认为 "Hello"
  Returns:
  str: 格式化的问候消息
  """
  return f"{msg}, {name}!"
 # 调用函数
 print(greet("Alice")) # 输出: Hello, Alice!
 print(greet("Bob", "Hi")) # 输出: Hi, Bob!
 # 无返回值的函数
 def print_message(message):
  """打印消息"""
  print(f"Message: {message}")
 print_message("Hello, World!") # 输出: Message: Hello, World!
 # 多返回值函数
 def get_user_info():
  """返回用户信息"""
  name = "Alice"
  age = 30
  city = "New York"
  return name, age, city # 返回元组
 user_name, user_age, user_city = get_user_info()
 print(f"Name: {user_name}, Age: {user_age}, City: {user_city}")
 # 空函数
 def placeholder():
  """占位函数"""
  pass # 空语句
```

### 1.2 参数传递 (Parameter Passing)

Python 中采用**引用传递** (Pass by Object Reference) 的方式传递参数：

- **不可变对象 (int, str, tuple)**: 修改形参不会影响实参
- **可变对象 (list, dict, set)**: 修改形参的内容会影响实参

```python
 # 不可变对象示例
 def modify_immutable(x):
  x = x + 1
  print(f"Inside function: x = {x}")
 num = 10
 modify_immutable(num)
 print(f"Outside function: num = {num}") # 输出: 10（实参未改变）
 # 可变对象示例
 def modify_mutable(lst):
  lst.append(4)
  print(f"Inside function: lst = {lst}")
 my_list = [1, 2, 3]
 modify_mutable(my_list)
 print(f"Outside function: my_list = {my_list}") # 输出: [1, 2, 3, 4]（实参被修改）
 # 重新绑定可变对象
 def rebind_mutable(lst):
  lst = [4, 5, 6] # 重新绑定局部变量
  print(f"Inside function: lst = {lst}")
 my_list = [1, 2, 3]
 rebind_mutable(my_list)
 print(f"Outside function: my_list = {my_list}") # 输出: [1, 2, 3]（实参未改变）
```

## 2. 参数类型 (Parameter Types)

Python 支持多种类型的函数参数：

### 2.1 位置参数 (Positional Parameters)

位置参数是最基本的参数类型，必须按顺序传递：

```python
 def add(a, b):
  return a + b
 print(add(3, 5)) # 输出: 8
 # print(add(3)) # 错误: 缺少位置参数 b
```

### 2.2 关键字参数 (Keyword Parameters)

关键字参数允许通过参数名指定值，顺序可以任意：

```python
 def greet(name, age):
  return f"Hello, {name}! You are {age} years old."
 print(greet(name="Alice", age=30)) # 输出: Hello, Alice! You are 30 years old.
 print(greet(age=25, name="Bob")) # 输出: Hello, Bob! You are 25 years old.
```

### 2.3 默认参数 (Default Parameters)

默认参数为参数提供默认值，当调用时未提供该参数时使用：

```python
 def greet(name, msg="Hello", age=None):
  if age:
  return f"{msg}, {name}! You are {age} years old."
  return f"{msg}, {name}!"
 print(greet("Alice")) # 输出: Hello, Alice!
 print(greet("Bob", "Hi")) # 输出: Hi, Bob!
 print(greet("Charlie", age=25)) # 输出: Hello, Charlie! You are 25 years old.
 # 陷阱: 不要使用可变对象作为默认参数
 def add_item(item, items=[]): # 危险：默认参数在函数定义时只计算一次
  items.append(item)
  return items
 print(add_item(1)) # 输出: [1]
 print(add_item(2)) # 输出: [1, 2]（意外：使用了同一个列表）
 # 正确的做法
 def add_item_safe(item, items=None):
  if items is None:
  items = []
  items.append(item)
  return items
 print(add_item_safe(1)) # 输出: [1]
 print(add_item_safe(2)) # 输出: [2]（正确：每次创建新列表）
```

### 2.4 可变参数 (\*args)

可变参数允许接收任意数量的位置参数，会将这些参数打包成一个元组：

```python
 def sum_numbers(*args):
  """计算任意数量数字的和"""
  total = 0
  for num in args:
  total += num
  return total
 print(sum_numbers(1, 2, 3)) # 输出: 6
 print(sum_numbers(1, 2, 3, 4, 5)) # 输出: 15
 print(sum_numbers()) # 输出: 0
 # 解包序列作为可变参数
 numbers = [1, 2, 3, 4, 5]
 print(sum_numbers(*numbers)) # 输出: 15
```

### 2.5 关键字可变参数 (\*\*kwargs)

关键字可变参数允许接收任意数量的关键字参数，会将这些参数打包成一个字典：

```python
 def print_person(**kwargs):
  """打印人物信息"""
  for key, value in kwargs.items():
  print(f"{key}: {value}")
 print_person(name="Alice", age=30, city="New York")
 # 输出:
 # name: Alice
 # age: 30
 # city: New York
 # 解包字典作为关键字可变参数
 person_info = {"name": "Bob", "age": 25, "city": "London"}
 print_person(**person_info)
```

### 2.6 混合使用不同类型的参数

参数定义的顺序必须是：位置参数 → 默认参数 → 可变参数 → 关键字可变参数

```python
 def mixed_params(a, b, c=10, *args, **kwargs):
  print(f"a: {a}, b: {b}, c: {c}")
  print(f"args: {args}")
  print(f"kwargs: {kwargs}")
 mixed_params(1, 2, 3, 4, 5, 6, name="Alice", age=30)
 # 输出:
 # a: 1, b: 2, c: 3
 # args: (4, 5, 6)
 # kwargs: {'name': 'Alice', 'age': 30}
```

## 3. 匿名函数 (Lambda)

Lambda 函数是一种小型的匿名函数，使用 `lambda` 关键字定义：

### 3.1 基本语法

```python
 # 基本语法: lambda arguments: expression
 add = lambda x, y: x + y
 print(add(5, 5)) # 输出: 10
 # 无参数
 greet = lambda: "Hello, World!"
 print(greet()) # 输出: Hello, World!
 # 单个参数
 square = lambda x: x ** 2
 print(square(4)) # 输出: 16
 # 多个参数
 max_num = lambda x, y: x if x > y else y
 print(max_num(10, 20)) # 输出: 20
```

### 3.2 Lambda 函数的应用场景

Lambda 函数常用于需要简短函数的场景，如作为高阶函数的参数：

```python
 # 与 map() 结合
 numbers = [1, 2, 3, 4, 5]
 squared = list(map(lambda x: x ** 2, numbers))
 print(squared) # 输出: [1, 4, 9, 16, 25]
 # 与 filter() 结合
 even_numbers = list(filter(lambda x: x % 2 == 0, numbers))
 print(even_numbers) # 输出: [2, 4]
 # 与 sorted() 结合
 students = [
  {"name": "Alice", "grade": 85},
  {"name": "Bob", "grade": 92},
  {"name": "Charlie", "grade": 78}
 ]
 # 按分数排序
 sorted_by_grade = sorted(students, key=lambda student: student["grade"], reverse=True)
 print(sorted_by_grade)
 # 与 reduce() 结合
 from functools import reduce
 product = reduce(lambda x, y: x * y, numbers)
 print(product) # 输出: 120
 # 作为返回值
 def make_adder(n):
  return lambda x: x + n
 add5 = make_adder(5)
 print(add5(10)) # 输出: 15
```

## 4. 装饰器 (Decorators)

装饰器是一种特殊的函数，用于修改其他函数的行为，而不改变其源代码：

### 4.1 基本装饰器

```python
 def timer(func):
  """计算函数执行时间的装饰器"""
  import time
  def wrapper(*args, **kwargs):
  start_time = time.time()
  result = func(*args, **kwargs)
  end_time = time.time()
  print(f"{func.__name__} 执行时间: {end_time - start_time:.4f} 秒")
  return result
  return wrapper
 @timer # 等价于: slow_function = timer(slow_function)
 def slow_function():
  """模拟耗时操作"""
  import time
  time.sleep(1)
  print("Function executed")
 slow_function()
```

### 4.2 带参数的装饰器

```python
 def repeat(n):
  """重复执行函数 n 次的装饰器"""
  def decorator(func):
  def wrapper(*args, **kwargs):
  for i in range(n):
  result = func(*args, **kwargs)
  return result
  return wrapper
  return decorator
 @repeat(3) # 传递参数给装饰器
 def say_hello(name):
  print(f"Hello, {name}!")
 say_hello("Alice")
 # 输出:
 # Hello, Alice!
 # Hello, Alice!
 # Hello, Alice!
```

### 4.3 保留原函数信息

使用 `functools.wraps` 保留原函数的元数据：

```python
 import functools
 def my_decorator(func):
  @functools.wraps(func) # 保留原函数信息
  def wrapper(*args, **kwargs):
  print("Before function execution")
  result = func(*args, **kwargs)
  print("After function execution")
  return result
  return wrapper
 @my_decorator
 def example():
  """示例函数"""
  print("Function executed")
 example()
 print(f"Function name: {example.__name__}")
 print(f"Function docstring: {example.__doc__}")
```

### 4.4 装饰器链

多个装饰器可以同时应用于一个函数：

```python
 def decorator1(func):
  def wrapper(*args, **kwargs):
  print("Decorator 1 before")
  result = func(*args, **kwargs)
  print("Decorator 1 after")
  return result
  return wrapper
 def decorator2(func):
  def wrapper(*args, **kwargs):
  print("Decorator 2 before")
  result = func(*args, **kwargs)
  print("Decorator 2 after")
  return result
  return wrapper
 @decorator1
 @decorator2
 def my_function():
  print("Function executed")
 my_function()
 # 输出顺序:
 # Decorator 1 before
 # Decorator 2 before
 # Function executed
 # Decorator 2 after
 # Decorator 1 after
```

## 5. 高阶函数 (Higher-Order Functions)

高阶函数是指接收函数作为参数或返回函数的函数：

### 5.1 接收函数作为参数

```python
 def apply_function(func, value):
  """应用函数到值"""
  return func(value)
 def square(x):
  return x ** 2
 def cube(x):
  return x ** 3
 print(apply_function(square, 5)) # 输出: 25
 print(apply_function(cube, 5)) # 输出: 125
 print(apply_function(lambda x: x + 1, 5)) # 输出: 6
```

### 5.2 返回函数

```python
 def make_multiplier(n):
  """返回一个乘以 n 的函数"""
  def multiplier(x):
  return x * n
  return multiplier
 double = make_multiplier(2)
 triple = make_multiplier(3)
 print(double(5)) # 输出: 10
 print(triple(5)) # 输出: 15
```

### 5.3 内置高阶函数

#### 5.3.1 `map()`

`map()` 函数对序列中的每个元素应用一个函数：

```python
 # 基本用法
 numbers = [1, 2, 3, 4, 5]
 squared = list(map(lambda x: x ** 2, numbers))
 print(squared) # 输出: [1, 4, 9, 16, 25]
 # 多个序列
 numbers1 = [1, 2, 3]
 numbers2 = [4, 5, 6]
 summed = list(map(lambda x, y: x + y, numbers1, numbers2))
 print(summed) # 输出: [5, 7, 9]
 # 自定义函数
 def to_upper(s):
  return s.upper()
 words = ["hello", "world", "python"]
 upper_words = list(map(to_upper, words))
 print(upper_words) # 输出: ['HELLO', 'WORLD', 'PYTHON']
```

#### 5.3.2 `filter()`

`filter()` 函数根据函数结果过滤序列中的元素：

```python
 # 基本用法
 numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
 even_numbers = list(filter(lambda x: x % 2 == 0, numbers))
 print(even_numbers) # 输出: [2, 4, 6, 8, 10]
 # 过滤非空字符串
 words = ["hello", "", "world", "", "python"]
 non_empty = list(filter(lambda s: s, words))
 print(non_empty) # 输出: ['hello', 'world', 'python']
 # 自定义函数
 def is_positive(n):
  return n > 0
 numbers = [-5, -3, 0, 2, 7, -1]
 positive_numbers = list(filter(is_positive, numbers))
 print(positive_numbers) # 输出: [2, 7]
```

#### 5.3.3 `reduce()`

`reduce()` 函数对序列中的元素进行累积计算：

```python
 from functools import reduce
 # 基本用法
 numbers = [1, 2, 3, 4, 5]
 sum_result = reduce(lambda x, y: x + y, numbers)
 print(sum_result) # 输出: 15
 # 带初始值
 product_result = reduce(lambda x, y: x * y, numbers, 10) # 初始值为 10
 print(product_result) # 输出: 1200 (10 * 1 * 2 * 3 * 4 * 5)
 # 连接字符串
 words = ["Hello", " ", "World", "!"]
 sentence = reduce(lambda x, y: x + y, words)
 print(sentence) # 输出: Hello World!
 # 查找最大值
 numbers = [3, 1, 4, 1, 5, 9, 2, 6]
 max_value = reduce(lambda x, y: x if x > y else y, numbers)
 print(max_value) # 输出: 9
```

## 6. 函数作用域 (Function Scope)

Python 中的变量作用域遵循 LEGB 规则：

1. **Local (L)**: 局部作用域，在函数内部定义的变量
2. **Enclosing (E)**: 嵌套作用域，在嵌套函数的外层函数中定义的变量
3. **Global (G)**: 全局作用域，在模块级别定义的变量
4. **Built-in (B)**: 内置作用域，Python 内置的变量和函数

### 6.1 局部作用域

```python
 def my_function():
  local_var = "local"
  print(local_var) # 可以访问局部变量
 my_function()
 # print(local_var) # 错误: 无法访问局部变量
```

### 6.2 全局作用域

```python
 global_var = "global"
 def my_function():
  print(global_var) # 可以访问全局变量
 my_function()
 print(global_var) # 可以访问全局变量
```

### 6.3 修改全局变量

```python
 global_var = "global"
 def my_function():
  global global_var # 声明要修改全局变量
  global_var = "modified global"
  print(global_var)
 my_function()
 print(global_var) # 输出: modified global
```

### 6.4 嵌套作用域

```python
 def outer_function():
  outer_var = "outer"
  def inner_function():
  nonlocal outer_var # 声明要修改嵌套作用域变量
  outer_var = "modified outer"
  print(outer_var)
  inner_function()
  print(outer_var) # 输出: modified outer
 outer_function()
```

## 7. 递归函数 (Recursive Functions)

递归函数是调用自身的函数，用于解决可以分解为相同子问题的问题：

### 7.1 基本递归

```python
 def factorial(n):
  """计算阶乘"""
  if n <= 1:
  return 1
  return n * factorial(n - 1)
 print(factorial(5)) # 输出: 120
 # 斐波那契数列
 def fibonacci(n):
  """计算斐波那契数列第 n 项"""
  if n <= 1:
  return n
  return fibonacci(n - 1) + fibonacci(n - 2)
 print(fibonacci(10)) # 输出: 55
```

### 7.2 递归的注意事项

- **基线条件**: 必须有一个明确的终止条件
- **递归深度**: Python 默认递归深度限制为 1000
- **性能**: 某些递归实现可能效率低下，可考虑使用记忆化或迭代

```python
 # 记忆化优化斐波那契
 from functools import lru_cache
 @lru_cache(maxsize=None)
 def fibonacci_memo(n):
  if n <= 1:
  return n
  return fibonacci_memo(n - 1) + fibonacci_memo(n - 2)
 print(fibonacci_memo(100)) # 快速计算大值
 # 迭代实现斐波那契
 def fibonacci_iterative(n):
  if n <= 1:
  return n
  a, b = 0, 1
  for _ in range(2, n + 1):
  a, b = b, a + b
  return b
 print(fibonacci_iterative(100)) # 更高效
```

## 8. 函数式编程 (Functional Programming)

函数式编程是一种编程范式，强调使用纯函数、不可变数据和高阶函数：

### 8.1 纯函数

纯函数是指没有副作用且相同输入总是产生相同输出的函数：

```python
 # 纯函数
 def add(a, b):
  return a + b
 # 非纯函数（有副作用）
 total = 0
 def add_to_total(x):
  global total
  total += x
  return total
```

### 8.2 不可变数据

函数式编程鼓励使用不可变数据，避免修改现有数据：

```python
 # 不可变操作
 numbers = [1, 2, 3]
 # 创建新列表而不是修改原列表
 new_numbers = [x * 2 for x in numbers]
 print(numbers) # 原列表不变: [1, 2, 3]
 print(new_numbers) # 新列表: [2, 4, 6]
 # 使用元组（不可变）
 point = (1, 2)
 # point[0] = 3 # 错误: 元组不可修改
```

### 8.3 函数式编程工具

```python
 from functools import reduce
 # 组合函数
 def compose(f, g):
  return lambda x: f(g(x))
 def add_one(x):
  return x + 1
 def multiply_by_two(x):
  return x * 2
 # 先加 1，再乘以 2
 add_one_then_multiply_by_two = compose(multiply_by_two, add_one)
 print(add_one_then_multiply_by_two(5)) # 输出: 12
 # 管道操作
 from functools import reduce
 def pipe(data, *functions):
  return reduce(lambda x, func: func(x), functions, data)
 result = pipe(
  5,
  lambda x: x + 1, # 6
  lambda x: x * 2, # 12
  lambda x: x - 3 # 9
 )
 print(result) # 输出: 9
```

## 9. 函数最佳实践

### 9.1 函数设计

- **单一职责**: 每个函数应该只做一件事情
- **函数长度**: 保持函数简洁，通常不超过 50 行
- **命名规范**: 使用小写字母和下划线，函数名应该描述其功能
- **文档字符串**: 为函数添加详细的文档字符串
- **参数数量**: 尽量减少参数数量，通常不超过 5 个

### 9.2 性能优化

- **避免重复计算**: 使用缓存或记忆化
- **避免不必要的全局变量**: 优先使用函数参数和返回值
- **使用适当的数据结构**: 选择合适的数据结构提高性能
- **生成器**: 对于大型数据集，使用生成器节省内存

### 9.3 代码风格

- **缩进**: 使用 4 个空格进行缩进
- **空行**: 在函数定义之间使用空行
- **注释**: 为复杂的逻辑添加注释
- **类型提示**: 使用类型提示提高代码可读性

```python
 # 使用类型提示
 def greet(name: str, age: int) -> str:
  """问候函数"""
  return f"Hello, {name}! You are {age} years old."
 # 类型提示的好处
 # 1. 提高代码可读性
 # 2. 支持静态类型检查
 # 3. 提供更好的代码补全
```

---

### 更新日志 (Changelog)

- 2026-04-05: 深入细化装饰器与参数传递细节。
- 2026-04-05: 扩写内容，增加详细的函数定义、参数类型、Lambda函数应用、装饰器实现、高阶函数、作用域、递归函数和函数式编程等内容。
