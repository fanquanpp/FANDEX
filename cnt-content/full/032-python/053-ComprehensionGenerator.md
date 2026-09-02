---
order: 530
title: 推导式与生成器
module: 'python'
category: 后端技术
difficulty: intermediate
description: 列表推导、字典推导、生成器表达式与迭代器。
author: fanquanpp
updated: '2026-08-01'
related:
  - 'python/051-PythonVectorDatabase'
  - 'python/052-PythonAdvancedLatestFeature'
  - 'python/054-ModulePackageEngineering'
  - 'python/065-DecoratorAdvanced'
prerequisites: []
---

## 前置知识

- [Python 进阶与最新特性](/python/052-PythonAdvancedLatestFeature)：建议先完成前一篇的学习

## 学习目标

- 掌握「1. 推导式 (Comprehensions)」的核心机制、典型用法与常见陷阱
- 掌握「2. 迭代器 (Iterators)」的核心机制、典型用法与常见陷阱
- 掌握「3. 生成器 (Generators)」的核心机制、典型用法与常见陷阱
- 掌握「4. 惰性求值 (Lazy Evaluation)」的核心机制、典型用法与常见陷阱
- 掌握「5. 迭代工具」的核心机制、典型用法与常见陷阱


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
 ]
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

## 列表推导式

**基本写法：基本列表推导式**
`[<表达式> for <变量> in <可迭代对象>]`

```python
# 基本列表推导式
squares = [x ** 2 for x in range(5)]
```

---

**基本写法：带条件的列表推导式**
`[<表达式> for <变量> in <可迭代对象> if <条件>]`

```python
# 带条件的列表推导式
evens = [x for x in range(10) if x % 2 == 0]
```

---

**基本写法：带 if-else 的列表推导式**
`[<表达式1> if <条件> else <表达式2> for <变量> in <可迭代对象>]`

```python
# 带 if-else 的列表推导式
labels = ["even" if x % 2 == 0 else "odd" for x in range(5)]
```

---

## 嵌套列表推导式

**基本写法：嵌套 for 的列表推导式**
`[<表达式> for <变量1> in <可迭代对象1> for <变量2> in <可迭代对象2>]`

```python
# 嵌套 for 的列表推导式
pairs = [(x, y) for x in range(3) for y in range(3)]
```

---

**基本写法：带条件的嵌套推导式**
`[<表达式> for <变量1> in <可迭代对象1> for <变量2> in <可迭代对象2> if <条件>]`

```python
# 带条件的嵌套推导式
pairs = [(x, y) for x in range(3) for y in range(3) if x != y]
```

---

**换行写法：多行嵌套推导式**
`[<表达式>`
` for <变量1> in <可迭代对象1>`
` for <变量2> in <可迭代对象2>]`

```python
# 多行嵌套推导式
matrix = [
    [x * y for y in range(3)]
    for x in range(3)
]
```

---

## 字典推导式

**基本写法：基本字典推导式**
`{<键表达式>: <值表达式> for <变量> in <可迭代对象>}`

```python
# 基本字典推导式
squares = {x: x ** 2 for x in range(5)}
```

---

**基本写法：带条件的字典推导式**
`{<键表达式>: <值表达式> for <变量> in <可迭代对象> if <条件>}`

```python
# 带条件的字典推导式
even_squares = {x: x ** 2 for x in range(10) if x % 2 == 0}
```

---

**基本写法：反转字典键值**
`{<值>: <键> for <键>, <值> in <字典>.items()}`

```python
# 反转字典的键和值
original = {"a": 1, "b": 2, "c": 3}
reversed_dict = {v: k for k, v in original.items()}
```

---

## 集合推导式

**基本写法：基本集合推导式**
`{<表达式> for <变量> in <可迭代对象>}`

```python
# 基本集合推导式
squares = {x ** 2 for x in range(5)}
```

---

**基本写法：带条件的集合推导式**
`{<表达式> for <变量> in <可迭代对象> if <条件>}`

```python
# 带条件的集合推导式
even_squares = {x ** 2 for x in range(10) if x % 2 == 0}
```

---

## 生成器表达式

**基本写法：基本生成器表达式**
`(<表达式> for <变量> in <可迭代对象>)`

```python
# 基本生成器表达式
squares_gen = (x ** 2 for x in range(5))
print(next(squares_gen))
```

---

**基本写法：带条件的生成器表达式**
`(<表达式> for <变量> in <可迭代对象> if <条件>)`

```python
# 带条件的生成器表达式
evens_gen = (x for x in range(10) if x % 2 == 0)
print(list(evens_gen))
```

---

**基本写法：生成器表达式作为函数参数**
`<函数>(<表达式> for <变量> in <可迭代对象>)`

```python
# 生成器表达式作为函数参数
total = sum(x ** 2 for x in range(10))
```

---

## 生成器函数

**换行写法：定义生成器函数**
`def <函数名>(<参数>):`
`    yield <值>`

```python
# 定义生成器函数
def count_up_to(max_value):
    count = 0
    while count < max_value:
        yield count
        count += 1
```

---

**基本写法：使用生成器**
`for <变量> in <生成器>: <语句>`

```python
# 使用生成器
for num in count_up_to(5):
    print(num)
```

---

**基本写法：使用 next() 获取值**
`next(<生成器>)`

```python
# 使用 next() 获取生成器的下一个值
gen = count_up_to(3)
print(next(gen))
```

---

**基本写法：使用 list() 转换生成器**
`list(<生成器>)`

```python
# 将生成器转换为列表
gen = count_up_to(5)
print(list(gen))
```

---

## yield 语句

**基本写法：使用 yield 生成值**
`yield <值>`

```python
# 使用 yield 生成值
def simple_generator():
    yield 1
    yield 2
    yield 3
```

---

**基本写法：使用 yield from 委托生成器**
`yield from <可迭代对象>`

```python
# 使用 yield from 委托给子生成器
def combined_generator():
    yield from [1, 2, 3]
    yield from [4, 5, 6]
```

---

**基本写法：yield from 委托给另一个生成器**
`yield from <生成器函数>()`

```python
# yield from 委托给另一个生成器
def sub_generator():
    yield "a"
    yield "b"

def main_generator():
    yield "start"
    yield from sub_generator()
    yield "end"
```

---

## 生成器方法

**基本写法：使用 send() 发送值**
`<生成器>.send(<值>)`

```python
# 使用 send() 向生成器发送值
def echo_generator():
    while True:
        received = yield
        print(f"收到: {received}")

gen = echo_generator()
next(gen)
gen.send("Hello")
```

---

**基本写法：使用 throw() 抛出异常**
`<生成器>.throw(<异常>)`

```python
# 使用 throw() 在生成器中抛出异常
def safe_generator():
    try:
        while True:
            yield "正常"
    except ValueError:
        yield "捕获到异常"

gen = safe_generator()
print(next(gen))
print(gen.throw(ValueError))
```

---

**基本写法：使用 close() 关闭生成器**
`<生成器>.close()`

```python
# 使用 close() 关闭生成器
gen = count_up_to(10)
print(next(gen))
gen.close()
```

---

## 无限生成器

**换行写法：定义无限生成器**
`def <函数名>():`
`    while True:`
`        yield <值>`

```python
# 定义无限生成器
def infinite_counter():
    count = 0
    while True:
        yield count
        count += 1
```

---

**基本写法：使用 itertools.islice 限制无限生成器**
`islice(<无限生成器>, <n>)`

```python
# 使用 islice 限制无限生成器的输出
from itertools import islice

gen = infinite_counter()
first_ten = list(islice(gen, 10))
```

---

## 生成器管道

**换行写法：生成器管道组合**
`gen1 = (<表达式> for <变量> in <可迭代对象>)`
`gen2 = (<表达式> for <变量> in gen1)`
`gen3 = (<表达式> for <变量> in gen2)`

```python
# 生成器管道组合
numbers = range(100)
squared = (x ** 2 for x in numbers)
evens = (x for x in squared if x % 2 == 0)
result = list(evens)
```

---

## itertools 模块

**基本写法：使用 itertools.chain 连接**
`chain(<可迭代对象1>, <可迭代对象2>)`

```python
# 使用 chain 连接多个可迭代对象
from itertools import chain
combined = chain([1, 2, 3], [4, 5, 6])
print(list(combined))
```

---

**基本写法：使用 itertools.chain.from_iterable 展平**
`chain.from_iterable(<嵌套可迭代对象>)`

```python
# 使用 chain.from_iterable 展平嵌套列表
from itertools import chain
nested = [[1, 2], [3, 4], [5, 6]]
flat = chain.from_iterable(nested)
print(list(flat))
```

---

**基本写法：使用 itertools.product 笛卡尔积**
`product(<可迭代对象1>, <可迭代对象2>)`

```python
# 使用 product 生成笛卡尔积
from itertools import product
colors = ["red", "blue"]
sizes = ["S", "M"]
combinations = list(product(colors, sizes))
```

---

**基本写法：使用 itertools.combinations 组合**
`combinations(<可迭代对象>, <r>)`

```python
# 使用 combinations 生成所有组合
from itertools import combinations
combos = list(combinations([1, 2, 3, 4], 2))
```

---

**基本写法：使用 itertools.permutations 排列**
`permutations(<可迭代对象>, <r>)`

```python
# 使用 permutations 生成所有排列
from itertools import permutations
perms = list(permutations([1, 2, 3], 2))
```

---

**基本写法：使用 itertools.cycle 循环**
`cycle(<可迭代对象>)`

```python
# 使用 cycle 无限循环可迭代对象
from itertools import cycle
cycler = cycle(["A", "B", "C"])
first_five = [next(cycler) for _ in range(5)]
```

---

**基本写法：使用 itertools.repeat 重复**
`repeat(<元素>, <次数>)`

```python
# 使用 repeat 重复元素
from itertools import repeat
repeated = list(repeat("Hello", 3))
```

---

**基本写法：使用 itertools.starmap 应用函数**
`starmap(<函数>, <可迭代对象>)`

```python
# 使用 starmap 将函数应用于解包的参数
from itertools import starmap
pairs = [(2, 3), (4, 5), (6, 7)]
results = list(starmap(lambda x, y: x + y, pairs))
```

---

**基本写法：使用 itertools.groupby 分组**
`groupby(<可迭代对象>, <键函数>)`

```python
# 使用 groupby 按键分组
from itertools import groupby
data = [("a", 1), ("a", 2), ("b", 3), ("b", 4)]
for key, group in groupby(data, key=lambda x: x[0]):
    print(f"{key}: {list(group)}")
```

---

**基本写法：使用 itertools.accumulate 累积**
`accumulate(<可迭代对象>, <函数>)`

```python
# 使用 accumulate 累积计算
from itertools import accumulate
numbers = [1, 2, 3, 4, 5]
cumsum = list(accumulate(numbers))
```

---

## 生成器与协程

**换行写法：定义协程生成器**
`def <协程名>():`
`    while True:`
`        <值> = yield`
`        <处理>`

```python
# 定义协程生成器
def coroutine():
    print("启动协程")
    while True:
        value = yield
        print(f"处理: {value}")

coro = coroutine()
next(coro)
coro.send("数据")
```

---

## 生成器表达式与列表推导式对比

**基本写法：列表推导式（立即计算）**
`[<表达式> for <变量> in <可迭代对象>]`

```python
# 列表推导式（立即计算，占用内存）
squares_list = [x ** 2 for x in range(1000000)]
```

---

**基本写法：生成器表达式（惰性计算）**
`(<表达式> for <变量> in <可迭代对象>)`

```python
# 生成器表达式（惰性计算，节省内存）
squares_gen = (x ** 2 for x in range(1000000))
```

---

## 生成器与迭代器

**换行写法：自定义迭代器类**
`class <迭代器类>:`
`    def __iter__(self): return self`
`    def __next__(self): <语句>`

```python
# 自定义迭代器类
class CountDown:
    def __init__(self, start):
        self.current = start

    def __iter__(self):
        return self

    def __next__(self):
        if self.current <= 0:
            raise StopIteration
        self.current -= 1
        return self.current + 1
```

---

**换行写法：可迭代对象类**
`class <可迭代对象类>:`
`    def __iter__(self): yield <值>`

```python
# 可迭代对象类（使用 yield）
class NumberRange:
    def __init__(self, start, end):
        self.start = start
        self.end = end

    def __iter__(self):
        current = self.start
        while current < self.end:
            yield current
            current += 1
```

---

## 生成器与内存优化

**基本写法：使用生成器处理大文件**
`def <函数名>(<文件路径>):`
`    with open(<文件路径>) as f:`
`        for line in f: yield <处理>`

```python
# 使用生成器逐行处理大文件
def read_large_file(file_path):
    with open(file_path, "r") as f:
        for line in f:
            yield line.strip()
```

---

**基本写法：使用生成器过滤数据**
`(<表达式> for <变量> in <可迭代对象> if <条件>)`

```python
# 使用生成器表达式过滤数据
data = range(1000000)
filtered = (x for x in data if x % 2 == 0)
result = sum(filtered)
```

---

## 生成器与 send() 双向通信

**换行写法：带 send() 的生成器**
`def <生成器名>():`
`    <初始化>`
`    while True:`
`        <输入> = yield <输出>`
`        <处理>`

```python
# 带 send() 的双向通信生成器
def accumulator():
    total = 0
    while True:
        value = yield total
        total += value

gen = accumulator()
next(gen)
print(gen.send(10))
print(gen.send(20))
```

---

## 生成器与 yield from

**换行写法：使用 yield from 委托**
`def <主生成器>():`
`    yield <值1>`
`    yield from <子生成器>()`
`    yield <值2>`

```python
# 使用 yield from 委托子生成器
def sub_generator():
    yield "sub1"
    yield "sub2"

def main_generator():
    yield "start"
    yield from sub_generator()
    yield "end"
```

---

**基本写法：yield from 返回值**
`result = yield from <生成器>`

```python
# yield from 获取子生成器的返回值
def sub_generator():
    yield 1
    yield 2
    return "完成"

def main_generator():
    result = yield from sub_generator()
    print(f"子生成器返回: {result}")
```
