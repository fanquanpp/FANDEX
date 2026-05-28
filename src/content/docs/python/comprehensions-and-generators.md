---
order: 90
tags:
  - 'python'
  - 'database'
  - 'networking'
  - 'functional'
difficulty: 'intermediate'
title: '推导式与生成器'
module: 'python'
category: 'Python Basics'
description: '列表推导、字典推导、生成器表达式与迭代器。'
author: 'Anonymous'
---

## 目录

1. [推导式](#推导式)
2. [迭代器](#迭代器)
3. [生成器](#生成器)
4. [惰性求值](#惰性求值)
5. [迭代工具](#迭代工具)
6. [最佳实践](#最佳实践)
7. [实际应用示例](#实际应用示例)

---

## 1. 推导式 (Comprehensions)

推导式是一种简洁高效的方式，用于从现有的序列创建新的序列。

### 1.1 列表推导式 (List Comprehensions)

列表推导式使用方括号 `[]` 来创建新的列表：

```python
 # 基本语法: [expression for item in iterable if condition]
 # 生成平方数列表
 squares = [x ** 2 for x in range(10)]
 print(squares) # 输出: [0, 1, 4, 9, 16, 25, 36, 49, 64, 81]
 # 带条件的列表推导式
 even_squares = [x ** 2 for x in range(10) if x % 2 == 0]
 print(even_squares) # 输出: [0, 4, 16, 36, 64]
 # 嵌套的列表推导式
 matrix = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
 flattened = [num for row in matrix for num in row]
 print(flattened) # 输出: [1, 2, 3, 4, 5, 6, 7, 8, 9]
 # 复杂表达式的列表推导式
 names = ["Alice", "Bob", "Charlie", "David"]
 name_lengths = [(name, len(name)) for name in names]
 print(name_lengths) # 输出: [('Alice', 5), ('Bob', 3), ('Charlie', 7), ('David', 5)]
 # 多层嵌套的列表推导式
 # 生成 3x3 的乘法表
 multiplication_table = [[i * j for j in range(1, 4)] for i in range(1, 4)]
 print(multiplication_table) # 输出: [[1, 2, 3], [2, 4, 6], [3, 6, 9]]
```

### 1.2 字典推导式 (Dictionary Comprehensions)

字典推导式使用花括号 `{}` 来创建新的字典：

```python
 # 基本语法: {key_expression: value_expression for item in iterable if condition}
 # 从列表创建字典
 names = ["Alice", "Bob", "Charlie"]
 name_lengths = {name: len(name) for name in names}
 print(name_lengths) # 输出: {'Alice': 5, 'Bob': 3, 'Charlie': 7}
 # 带条件的字典推导式
 numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
 even_squares = {num: num ** 2 for num in numbers if num % 2 == 0}
 print(even_squares) # 输出: {2: 4, 4: 16, 6: 36, 8: 64, 10: 100}
 # 从现有字典创建新字典
 person = {"name": "Alice", "age": 30, "city": "New York"}
 upper_case = {k.upper(): v for k, v in person.items()}
 print(upper_case) # 输出: {'NAME': 'Alice', 'AGE': 30, 'CITY': 'New York'}
 # 交换字典的键值对
 original = {"a": 1, "b": 2, "c": 3}
 swapped = {v: k for k, v in original.items()}
 print(swapped) # 输出: {1: 'a', 2: 'b', 3: 'c'}
```

### 1.3 集合推导式 (Set Comprehensions)

集合推导式使用花括号 `{}` 来创建新的集合：

```python
 # 基本语法: {expression for item in iterable if condition}
 # 生成平方数集合
 numbers = [1, 2, 3, 4, 5, 4, 3, 2, 1]
 squares = {x ** 2 for x in numbers}
 print(squares) # 输出: {1, 4, 9, 16, 25}（自动去重）
 # 带条件的集合推导式
 positive_numbers = {x for x in range(-5, 6) if x > 0}
 print(positive_numbers) # 输出: {1, 2, 3, 4, 5}
 # 字符串去重
 text = "hello world"
 unique_chars = {char for char in text if char != " "}
 print(unique_chars) # 输出: {'d', 'e', 'h', 'l', 'o', 'r', 'w'}
```

### 1.4 推导式的性能

推导式通常比传统的循环更高效，因为它们在 C 语言级别执行，减少了 Python 解释器的开销：

```python
 import time
 # 使用传统循环
 start = time.time()
 squares = []
 for i in range(1000000):
  squares.append(i ** 2)
 end = time.time()
 print(f"传统循环: {end - start:.4f} 秒")
 # 使用列表推导式
 start = time.time()
 squares = [i ** 2 for i in range(1000000)]
 end = time.time()
 print(f"列表推导式: {end - start:.4f} 秒")
```

## 2. 迭代器 (Iterators)

迭代器是实现了迭代协议的对象，它允许我们遍历容器中的元素。

### 2.1 迭代器协议

一个对象要成为迭代器，必须实现两个方法：

- `__iter__()`: 返回迭代器本身
- `__next__()`: 返回下一个元素，当没有更多元素时抛出 `StopIteration` 异常

```python
 # 自定义迭代器
 class Countdown:
  def __init__(self, start):
  self.start = start
  def __iter__(self):
  return self
  def __next__(self):
  if self.start <= 0:
  raise StopIteration
  self.start -= 1
  return self.start + 1
 # 使用自定义迭代器
 for i in Countdown(5):
  print(i) # 输出: 5, 4, 3, 2, 1
 # 手动使用迭代器
 countdown = Countdown(3)
 it = iter(countdown)
 print(next(it)) # 输出: 3
 print(next(it)) # 输出: 2
 print(next(it)) # 输出: 1
 # print(next(it)) # 抛出 StopIteration 异常
```

### 2.2 内置迭代器

Python 中的许多内置对象都是可迭代的，例如列表、元组、字符串、字典等：

```python
 # 列表是可迭代的
 numbers = [1, 2, 3]
 it = iter(numbers)
 print(next(it)) # 输出: 1
 print(next(it)) # 输出: 2
 print(next(it)) # 输出: 3
 # 字符串是可迭代的
 text = "hello"
 it = iter(text)
 print(next(it)) # 输出: 'h'
 print(next(it)) # 输出: 'e'
 # 字典是可迭代的（默认迭代键）
 d = {"a": 1, "b": 2}
 it = iter(d)
 print(next(it)) # 输出: 'a'
 print(next(it)) # 输出: 'b'
 # 迭代字典的值
 it = iter(d.values())
 print(next(it)) # 输出: 1
 print(next(it)) # 输出: 2
 # 迭代字典的键值对
 it = iter(d.items())
 print(next(it)) # 输出: ('a', 1)
 print(next(it)) # 输出: ('b', 2)
```

### 2.3 `iter()` 和 `next()` 函数

- `iter()`: 将可迭代对象转换为迭代器
- `next()`: 获取迭代器的下一个元素

```python
 # 使用 iter() 函数
 numbers = [1, 2, 3]
 it = iter(numbers)
 # 使用 next() 函数
 print(next(it)) # 输出: 1
 print(next(it)) # 输出: 2
 print(next(it)) # 输出: 3
 # print(next(it)) # 抛出 StopIteration 异常
 # 为 next() 提供默认值
 it = iter([])
 print(next(it, "No more elements")) # 输出: No more elements
```

## 3. 生成器 (Generators)

生成器是一种特殊的迭代器，它使用 `yield` 关键字来生成值，实现了惰性求值。

### 3.1 生成器表达式 (Generator Expressions)

生成器表达式使用圆括号 `()` 来创建生成器，语法与列表推导式类似：

```python
 # 基本语法: (expression for item in iterable if condition)
 # 创建生成器
 gen = (x ** 2 for x in range(10))
 print(type(gen)) # 输出: <class 'generator'>
 # 遍历生成器
 for num in gen:
  print(num) # 输出: 0, 1, 4, 9, 16, 25, 36, 49, 64, 81
 # 生成器只能遍历一次
 gen = (x ** 2 for x in range(5))
 print(list(gen)) # 输出: [0, 1, 4, 9, 16]
 print(list(gen)) # 输出: []（生成器已耗尽）
 # 内存使用对比
 import sys
 # 列表占用的内存
 t_list = [x for x in range(1000000)]
 print(f"列表内存: {sys.getsizeof(t_list):,} 字节")
 # 生成器占用的内存
 t_gen = (x for x in range(1000000))
 print(f"生成器内存: {sys.getsizeof(t_gen):,} 字节")
```

### 3.2 生成器函数 (Generator Functions)

生成器函数使用 `yield` 关键字来定义，当函数被调用时，它返回一个生成器对象：

```python
 # 基本语法
 def generator_function():
  yield value1
  yield value2
  # ...
 # 示例: 生成斐波那契数列
 def fibonacci(n):
  """生成前 n 个斐波那契数"""
  a, b = 0, 1
  for _ in range(n):
  yield a
  a, b = b, a + b
 # 使用生成器函数
 for num in fibonacci(10):
  print(num, end=" ") # 输出: 0 1 1 2 3 5 8 13 21 34
 # 手动使用生成器
 fib = fibonacci(3)
 print(next(fib)) # 输出: 0
 print(next(fib)) # 输出: 1
 print(next(fib)) # 输出: 1
 # print(next(fib)) # 抛出 StopIteration 异常
 # 示例: 生成无限序列
 def infinite_counter():
  """生成无限递增的计数器"""
  i = 0
  while True:
  yield i
  i += 1
 # 使用无限生成器（需要手动停止）
 counter = infinite_counter()
 for _ in range(5):
  print(next(counter)) # 输出: 0, 1, 2, 3, 4
```

### 3.3 生成器的高级特性

#### 3.3.1 `send()` 方法

生成器的 `send()` 方法允许向生成器发送值：

```python
 def echo():
  while True:
  received = yield
  print(f"Received: {received}")
 # 使用 send() 方法
 gen = echo()
 next(gen) # 启动生成器
 gen.send("Hello") # 输出: Received: Hello
 gen.send("World") # 输出: Received: World
 gen.close() # 关闭生成器
```

#### 3.3.2 `throw()` 方法

生成器的 `throw()` 方法允许向生成器抛出异常：

```python
 def error_handling():
  try:
  while True:
  yield "Normal operation"
  except ValueError:
  yield "Handling ValueError"
  except Exception:
  yield "Handling other exception"
 # 使用 throw() 方法
 gen = error_handling()
 print(next(gen)) # 输出: Normal operation
 print(gen.throw(ValueError)) # 输出: Handling ValueError
 print(next(gen)) # 输出: Normal operation
 print(gen.throw(TypeError)) # 输出: Handling other exception
```

#### 3.3.3 `close()` 方法

生成器的 `close()` 方法用于关闭生成器：

```python
 def countdown(n):
  while n > 0:
  yield n
  n -= 1
 # 使用 close() 方法
 gen = countdown(5)
 print(next(gen)) # 输出: 5
 print(next(gen)) # 输出: 4
 gen.close()
 # print(next(gen)) # 抛出 StopIteration 异常
```

## 4. 惰性求值 (Lazy Evaluation)

惰性求值是一种计算策略，它推迟计算直到真正需要结果的时候。

### 4.1 惰性求值的优势

- **节省内存**: 不需要一次性存储所有数据
- **提高性能**: 避免不必要的计算
- **处理无限序列**: 可以表示理论上无限的序列
- **流式处理**: 适合处理大型数据集

### 4.2 惰性求值的应用

```python
 # 处理大型文件
 def read_large_file(file_path):
  """惰性读取大型文件"""
  with open(file_path, 'r') as f:
  for line in f:
  yield line.strip()
 # 使用生成器处理大型文件
 for line in read_large_file('large_file.txt'):
  # 处理每一行，而不是一次性加载整个文件
  pass
 # 链式生成器
 def filter_lines(lines, keyword):
  """过滤包含关键字的行"""
  for line in lines:
  if keyword in line:
  yield line
 def process_lines(lines):
  """处理行"""
  for line in lines:
  yield line.upper()
 # 链式使用生成器
 lines = read_large_file('large_file.txt')
 filtered = filter_lines(lines, 'python')
 processed = process_lines(filtered)
 for line in processed:
  print(line)
```

## 5. 迭代工具

Python 标准库提供了一些实用的迭代工具：

### 5.1 `itertools` 模块

`itertools` 模块提供了许多用于创建和操作迭代器的函数：

```python
 import itertools
 # 无限迭代器
 # count(): 从指定值开始无限计数
 for i in itertools.count(5, 2):
  print(i, end=" ")
  if i > 10:
  break # 输出: 5 7 9 11
 # cycle(): 无限循环迭代一个序列
 count = 0
 for item in itertools.cycle(['A', 'B', 'C']):
  print(item, end=" ")
  count += 1
  if count > 5:
  break # 输出: A B C A B C
 # repeat(): 重复一个值指定次数或无限次
 for item in itertools.repeat('Hello', 3):
  print(item) # 输出: Hello Hello Hello
 # 组合迭代器
 # product(): 笛卡尔积
 print(list(itertools.product([1, 2], ['a', 'b'])))
 # 输出: [(1, 'a'), (1, 'b'), (2, 'a'), (2, 'b')]
 # permutations(): 排列
 print(list(itertools.permutations([1, 2, 3], 2)))
 # 输出: [(1, 2), (1, 3), (2, 1), (2, 3), (3, 1), (3, 2)]
 # combinations(): 组合
 print(list(itertools.combinations([1, 2, 3], 2)))
 # 输出: [(1, 2), (1, 3), (2, 3)]
 # 其他有用的函数
 # chain(): 连接多个迭代器
 print(list(itertools.chain([1, 2], [3, 4], [5, 6])))
 # 输出: [1, 2, 3, 4, 5, 6]
 # groupby(): 分组
 from operator import itemgetter
 data = [
  {'name': 'Alice', 'age': 25},
  {'name': 'Bob', 'age': 30},
  {'name': 'Charlie', 'age': 25},
  {'name': 'David', 'age': 30}
 True]
 # 按年龄分组
 data.sort(key=itemgetter('age'))
 for age, group in itertools.groupby(data, key=itemgetter('age')):
  print(f"Age {age}:")
  for person in group:
  print(f" {person['name']}")
```

### 5.2 `functools` 模块

`functools` 模块中的 `reduce()` 函数可以与生成器结合使用：

```python
 from functools import reduce
 # 使用 reduce() 计算生成器的和
 def numbers():
  for i in range(1, 6):
  yield i
 result = reduce(lambda x, y: x + y, numbers())
 print(result) # 输出: 15
```

## 6. 最佳实践

### 6.1 推导式的最佳实践

- **简洁性**: 推导式应该简洁明了，避免过于复杂的表达式
- **可读性**: 对于复杂的逻辑，考虑使用传统循环
- **性能**: 对于大型数据集，考虑使用生成器表达式
- **嵌套**: 避免过多的嵌套推导式，保持代码可读性

### 6.2 生成器的最佳实践

- **内存管理**: 对于大型数据集，优先使用生成器
- **无限序列**: 使用生成器表示无限序列
- **流式处理**: 使用生成器进行流式数据处理
- **组合使用**: 多个生成器可以组合使用，形成数据处理管道
- **异常处理**: 在生成器中适当处理异常

### 6.3 迭代器的最佳实践

- **理解迭代协议**: 了解 `__iter__` 和 `__next__` 方法的实现
- **避免修改**: 迭代过程中避免修改正在迭代的容器
- **使用内置函数**: 充分利用 `iter()`, `next()`, `enumerate()`, `zip()` 等内置函数
- **自定义迭代器**: 当需要特殊迭代行为时，考虑实现自定义迭代器

## 7. 实际应用示例

### 7.1 数据处理

```python
 # 处理日志文件
 def parse_log(file_path):
  """解析日志文件，提取关键信息"""
  with open(file_path, 'r') as f:
  for line in f:
  if 'ERROR' in line:
  parts = line.split()
  timestamp = parts[0]
  error_message = ' '.join(parts[3:])
  yield {'timestamp': timestamp, 'error': error_message}
 # 使用生成器处理日志
 for error in parse_log('app.log'):
  print(f"[{error['timestamp']}] ERROR: {error['error']}")
```

### 7.2 数学计算

```python
 # 生成素数
 def is_prime(n):
  if n <= 1:
  return False
  for i in range(2, int(n**0.5) + 1):
  if n % i == 0:
  return False
  return
 def primes():
  """生成无限素数序列"""
  n = 2
  while True:
  if is_prime(n):
  yield n
  n += 1
 # 使用生成器获取前 10 个素数
 prime_gen = primes()
 for _ in range(10):
  print(next(prime_gen), end=" ") # 输出: 2 3 5 7 11 13 17 19 23 29
```

### 7.3 网络爬虫

```python
 import requests
 from bs4 import BeautifulSoup
 def crawl(url, max_depth=2):
  """简单的网页爬虫"""
  visited = set()
  def _crawl(url, depth):
  if depth > max_depth or url in visited:
  return
  visited.add(url)
  yield url
  try:
  response = requests.get(url)
  soup = BeautifulSoup(response.text, 'html.parser')
  for link in soup.find_all('a', href=True):
  next_url = link['href']
  if next_url.startswith('http'):
  yield from _crawl(next_url, depth + 1)
  except Exception:
  pass
  yield from _crawl(url, 0)
 # 使用生成器爬取网页
 for url in crawl('https://example.com', max_depth=1):
  print(url)
```

---

### 更新日志 (Changelog)

- 2026-04-05: 深入细化生成器与惰性计算。
- 2026-04-05: 扩写内容，增加详细的推导式用法、迭代器实现、生成器高级特性、惰性求值应用和实际示例等内容。
