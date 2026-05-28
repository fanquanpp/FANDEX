---
order: 150
tags:
  - 'python'
  - 'exercises'
difficulty: 'intermediate'
title: 'Python 练习题'
module: 'python'
description: 'Python 核心知识点配套练习，涵盖数据结构、OOP 与异常处理。'
---

````

A. 3
B. 4
C. 报错
D. 1
<details>
<summary>查看答案</summary>
**答案**: B
**解析**: Python 中列表赋值 `b = a` 是引用赋值，`a` 和 `b` 指向同一个列表对象。对 `b` 的修改会反映到 `a` 上，因此 `a` 变为 `[1, 2, 3, 4]`，长度为 4。若需独立副本，应使用 `b = a.copy()` 或 `b = a[:]`。
</details>
### 2. 关于 Python 函数参数，以下说法错误的是？
A. 默认参数在函数定义时求值，而非调用时
B. 可变默认参数（如列表）会在多次调用间共享
C. `*args` 接收关键字参数
D. `**kwargs` 接收多余的关键字参数并组成字典
<details>
<summary>查看答案</summary>
**答案**: C
**解析**: `*args` 接收的是位置参数（组成元组），`**kwargs` 接收关键字参数（组成字典）。这是常见的混淆点。
</details>
### 3. 以下代码的输出是？
```python
class Parent:
 x = 1
class Child(Parent):
 pass
Parent.x = 2
print(Child.x)
````

A. 1
B. 2
C. AttributeError
D. None

<details>
<summary>查看答案</summary>
**答案**: B
**解析**: `Child` 继承自 `Parent`，自身没有 `x` 属性，因此通过 MRO 查找到 `Parent.x`。当 `Parent.x` 被修改为 2 时，`Child.x` 也返回 2。如果 `Child.x = 3` 先执行，则 `Child` 会有自己的 `x` 属性。
</details>
### 4. 以下推导式的结果是？
```python
 result = [x**2 for x in range(6) if x % 2 == 0]
 ```

A. [0, 4, 16]
B. [0, 2, 4]
C. [4, 16]
D. [0, 4, 16, 36]

<details>
<summary>查看答案</summary>
**答案**: A
**解析**: `range(6)` 产生 0,1,2,3,4,5；`x % 2 == 0` 筛选偶数 0,2,4；对每个取平方得 0,4,16。
</details>
### 5. 使用 `with open('f.txt', 'r') as f` 的优势是？
A. 读取速度更快
B. 自动关闭文件，即使发生异常
C. 支持并发读取
D. 自动处理编码问题
<details>
<summary>查看答案</summary>
**答案**: B
**解析**: `with` 语句是上下文管理器，保证在代码块退出时（包括异常情况）自动调用 `f.close()`，避免资源泄漏。
</details>
## 编程题
### 1. 词频统计
编写函数 `word_count(text: str) -> dict`，统计字符串中每个单词出现的次数，忽略大小写和标点。
**输入**: `"Hello, hello! World. world? Python; python."`
**输出**: `{'hello': 2, 'world': 2, 'python': 2}`
<details>
<summary>查看参考答案</summary>
```python
 import re
 from collections import Counter
 def word_count(text: str) -> dict:
  words = re.findall(r'[a-zA-Z]+', text.lower())
  return dict(Counter(words))
 ```
</details>
### 2. 实现一个简单的栈类
用面向对象方式实现一个栈 `Stack`，支持 `push`、`pop`、`peek`、`is_empty` 和 `size` 操作。
**输入**: 依次 push(1), push(2), pop()
**输出**: pop 返回 2，栈中剩余 [1]
<details>
<summary>查看参考答案</summary>
```python
 class Stack:
  def __init__(self):
  self._items = []
  def push(self, item):
  self._items.append(item)
  def pop(self):
  if self.is_empty():
  raise IndexError("pop from empty stack")
  return self._items.pop()
  def peek(self):
  if self.is_empty():
  raise IndexError("peek from empty stack")
  return self._items[-1]
  def is_empty(self):
  return len(self._items) == 0
  def size(self):
  return len(self._items)
 ```
</details>
### 3. CSV 文件处理
编写函数 `process_csv(filepath: str) -> dict`，读取 CSV 文件（含表头），返回每列的平均值（仅处理数值列）。
**输入**: CSV 文件内容：
```
 name,age,score
 Alice,25,90
 Bob,30,85
 Charlie,28,95
 ```

**输出**: `{'age': 27.67, 'score': 90.0}`

<details>
<summary>查看参考答案</summary>
```python
 import csv
 def process_csv(filepath: str) -> dict:
  with open(filepath, 'r', encoding='utf-8') as f:
  reader = csv.DictReader(f)
  columns = reader.fieldnames
  numeric_data = {col: [] for col in columns}
  for row in reader:
  for col in columns:
  try:
  numeric_data[col].append(float(row[col]))
  except (ValueError, TypeError):
  pass
  return {
  col: round(sum(vals) / len(vals), 2)
  for col, vals in numeric_data.items()
  if vals
  }
 ```
</details>
