---
order: 30
tags:
  - 'python'
difficulty: 'beginner'
title: '变量与常量'
module: 'python'
category: 'Python Basics'
description: '变量命名、动态类型、常量约定与作用域。'
author: 'Anonymous'
---

## 目录

1. [变量](#变量)
2. [常量](#常量)
3. [变量交换](#变量交换)
4. [变量命名规范](#变量命名规范)
5. [最佳实践](#最佳实践)

---

## 1. 变量 (Variables)

变量是内存中存储数据的标签，用于引用和操作数据。

### 1.1 定义与赋值 (Assignment)

Python 是动态类型语言，变量不需要预先声明类型，可以直接赋值。

#### 1.1.1 基本赋值

```python
 # 基本赋值
 x = 10
 name = "Alice"
 is_valid =
 # 改变变量类型（动态类型）
 x = "Hello" # 变量 x 现在指向字符串
 print(x) # 输出: Hello
 # 链式赋值
 a = b = c = 100
 print(a, b, c) # 输出: 100 100 100
 # 多重赋值（解包）
 x, y = 1, 2
 print(x, y) # 输出: 1 2
 # 解包列表或元组
 values = [3, 4, 5]
 x, y, z = values
 print(x, y, z) # 输出: 3 4 5
 # 解包时使用 * 收集剩余值
 first, *rest = [1, 2, 3, 4, 5]
 print(first) # 输出: 1
 print(rest) # 输出: [2, 3, 4, 5]
 # 解包字典
 person = {"name": "Bob", "age": 30}
 name, age = person.items()
 print(name, age) # 输出: ('name', 'Bob') ('age', 30)
 # 同时解包键值对
 for key, value in person.items():
  print(f"{key}: {value}")
```

#### 1.1.2 内存地址与引用

```python
 # 查看变量的内存地址
 x = 10
 print(id(x)) # 输出: 内存地址（如 140703324934240）
 # 多个变量指向同一个对象
 a = 42
 b = a
 print(id(a) == id(b)) # 输出:
 # 不可变对象的行为
 x = 10
 y = x
 x = 20 # 创建新对象
 print(y) # 输出: 10（y 仍然指向原来的对象）
 # 可变对象的行为
 lst1 = [1, 2, 3]
 lst2 = lst1
 lst1.append(4) # 修改原对象
 print(lst2) # 输出: [1, 2, 3, 4]（lst2 指向同一个对象）
```

### 1.2 变量的作用域 (Scope - LEGB)

Python 中变量的作用域遵循 LEGB 规则，即变量查找顺序为：

1. **Local (L)**: 局部作用域，在函数内部定义的变量
2. **Enclosing (E)**: 嵌套作用域，在嵌套函数的外层函数中定义的变量
3. **Global (G)**: 全局作用域，在模块级别定义的变量
4. **Built-in (B)**: 内置作用域，Python 内置的变量和函数

#### 1.2.1 局部作用域

```python
 def my_function():
  # 局部变量
  local_var = "local"
  print(local_var) # 输出: local
 my_function()
 # print(local_var) # 错误: NameError: name 'local_var' is not defined
```

#### 1.2.2 全局作用域

```python
 # 全局变量
 global_var = "global"
 def my_function():
  # 访问全局变量
  print(global_var) # 输出: global
 my_function()
 print(global_var) # 输出: global
```

#### 1.2.3 修改全局变量

```python
 # 全局变量
 count = 0
 def increment():
  # 声明要修改全局变量
  global count
  count += 1
  print(count) # 输出: 1
 increment()
 print(count) # 输出: 1
```

#### 1.2.4 嵌套作用域

```python
 def outer_function():
  # 嵌套作用域变量
  outer_var = "outer"
  def inner_function():
  # 访问嵌套作用域变量
  print(outer_var) # 输出: outer
  inner_function()
 outer_function()
 # print(outer_var) # 错误: NameError: name 'outer_var' is not defined
```

#### 1.2.5 修改嵌套作用域变量

```python
 def outer_function():
  count = 0
  def inner_function():
  # 声明要修改嵌套作用域变量
  nonlocal count
  count += 1
  print(count) # 输出: 1
  inner_function()
  print(count) # 输出: 1
 outer_function()
```

#### 1.2.6 内置作用域

```python
 # 使用内置函数
 print(len([1, 2, 3])) # 输出: 3
 print(max(1, 2, 3)) # 输出: 3
 # 查看内置作用域
 aimport builtins
 print(dir(builtins)) # 列出所有内置变量和函数
```

### 1.3 变量的生命周期

变量的生命周期指变量从创建到被回收的过程：

1. **创建**: 当变量被赋值时创建
2. **使用**: 变量被引用和操作
3. **销毁**: 当变量不再被引用时，由垃圾回收器回收

#### 1.3.1 引用计数

Python 使用引用计数来跟踪对象的引用情况：

```python
 import sys
 x = [1, 2, 3]
 print(sys.getrefcount(x)) # 输出: 2（x 本身是一个引用，getrefcount 又创建了一个临时引用）
 y = x
 print(sys.getrefcount(x)) # 输出: 3（y 又增加了一个引用）
 y = None
 print(sys.getrefcount(x)) # 输出: 2（y 不再引用 x）
 x = None
 # 此时引用计数为 0，对象可能被回收
```

#### 1.3.2 垃圾回收

Python 的垃圾回收机制包括：

1. **引用计数**: 当引用计数为 0 时，对象被立即回收
2. **循环引用收集**: 处理循环引用的情况

```python
 # 循环引用示例
 class Node:
  def __init__(self, value):
  self.value = value
  self.next = None
 # 创建循环引用
 node1 = Node(1)
 node2 = Node(2)
 node1.next = node2
 node2.next = node1
 # 移除外部引用
 node1 = None
 node2 = None
 # 此时两个节点形成循环引用，但会被垃圾回收器检测并回收
```

## 2. 常量 (Constants)

Python 中没有内置的常量机制，但可以通过约定和技术手段实现。

### 2.1 常量命名约定

按照 Python 社区的约定，使用全大写字母和下划线来命名常量：

```python
 # 常量命名约定
 MAX_CONNECTIONS = 100
 defAULT_TIMEOUT = 30
 PI = 3.14159265359
 # 注意：这只是约定，仍然可以修改
 MAX_CONNECTIONS = 200 # 不会报错，但不推荐
```

### 2.2 实现真正的常量

可以通过类或模块级别的实现来创建真正的常量：

#### 2.2.1 使用类实现常量

```python
 class Constants:
  """常量类"""
  MAX_CONNECTIONS = 100
  DEFAULT_TIMEOUT = 30
  PI = 3.14159265359
  # 禁止修改
  def __setattr__(self, name, value):
  raise AttributeError("Constants cannot be modified")
 # 使用
 const = Constants()
 print(const.PI) # 输出: 3.14159265359
 # const.PI = 3.14 # 错误: AttributeError: Constants cannot be modified
```

#### 2.2.2 使用模块级实现

```python
 # const.py
 class _Const:
  class ConstError(TypeError):
  """常量错误"""
  pass
  def __setattr__(self, name, value):
  if name in self.__dict__:
  raise self.ConstError(f"Can't rebind const ({name})")
  self.__dict__[name] = value
 import sys
 sys.modules[__name__] = _Const()
 # 使用
 # 在其他文件中
 import const
 const.MAX_CONNECTIONS = 100
 const.DEFAULT_TIMEOUT = 30
 print(const.MAX_CONNECTIONS) # 输出: 100
 # const.MAX_CONNECTIONS = 200 # 错误: ConstError: Can't rebind const (MAX_CONNECTIONS)
```

### 2.3 枚举常量

对于一组相关的常量，可以使用 `enum` 模块：

```python
 from enum import Enum, auto
 class Color(Enum):
  RED = 1
  GREEN = 2
  BLUE = 3
 class Direction(Enum):
  NORTH = auto()
  SOUTH = auto()
  EAST = auto()
  WEST = auto()
 # 使用
 print(Color.RED) # 输出: Color.RED
 print(Color.RED.value) # 输出: 1
 print(Direction.NORTH.value) # 输出: 1
 # 遍历枚举
 for color in Color:
  print(color.name, color.value)
```

## 3. 变量交换 (Swapping)

Python 提供了简洁的变量交换方式：

### 3.1 基本交换

```python
 # Pythonic 方式（推荐）
 a, b = 1, 2
 a, b = b, a
 print(a, b) # 输出: 2 1
 # 传统方式（不推荐）
 temp = a
 a = b
 b = temp
 print(a, b) # 输出: 2 1
```

### 3.2 多变量交换

```python
 # 三个变量交换
 x, y, z = 1, 2, 3
 x, y, z = z, x, y
 print(x, y, z) # 输出: 3 1 2
 # 列表元素交换
 lst = [1, 2, 3, 4]
 lst[0], lst[1] = lst[1], lst[0]
 print(lst) # 输出: [2, 1, 3, 4]
```

### 3.3 高级交换技巧

```python
 # 使用算术运算交换（不推荐，仅作了解）
 a, b = 10, 20
 a = a + b # a = 30
 b = a - b # b = 10
 a = a - b # a = 20
 print(a, b) # 输出: 20 10
 # 使用位运算交换（不推荐，仅作了解）
 a, b = 10, 20
 a = a ^ b
 b = a ^ b
 a = a ^ b
 print(a, b) # 输出: 20 10
```

## 4. 变量命名规范

Python 中的变量命名应遵循以下规范：

### 4.1 命名规则

- **只能包含字母、数字和下划线**
- **不能以数字开头**
- **区分大小写**
- **不能使用 Python 关键字**（如 `def`, `class`, `if` 等）

### 4.2 命名约定

- **变量和函数**: 使用小写字母和下划线（snake_case）
- **常量**: 使用全大写字母和下划线（UPPER_CASE）
- **类名**: 使用驼峰命名法（CamelCase）
- **模块名**: 使用小写字母，尽量简短
- **包名**: 使用小写字母，尽量简短

```python
 # 变量和函数
 user_name = "Alice"
 def calculate_total():
  pass
 # 常量
 MAX_VALUE = 100
 # 类名
 class UserProfile:
  pass
 # 模块名: user_utils.py
 # 包名: utils
```

## 5. 最佳实践

### 5.1 变量使用

- **有意义的变量名**: 使用描述性的变量名，避免使用单字母变量（除非是循环计数器等简单场景）
- **避免全局变量**: 尽量减少全局变量的使用，优先使用函数参数和返回值
- **合理的作用域**: 将变量定义在最小必要的作用域内
- **避免变量遮蔽**: 不要在嵌套作用域中使用与外部作用域相同的变量名

### 5.2 常量使用

- **使用命名约定**: 常量使用全大写字母和下划线
- **集中管理**: 将相关常量集中在一个模块或类中
- **使用枚举**: 对于一组相关的常量，使用 `enum` 模块
- **文档化**: 为常量添加注释，说明其用途和取值范围

### 5.3 性能考虑

- **避免频繁创建大对象**: 对于频繁使用的大对象，考虑缓存
- **注意可变对象**: 理解可变对象和不可变对象的行为差异
- **合理使用引用**: 避免不必要的引用，以减少内存使用

---

### 更新日志 (Changelog)

- 2026-04-05: 拆分变量作用域 LEGB 规则。
- 2026-04-05: 扩写内容，增加详细的变量赋值方式、作用域示例、生命周期、常量实现、变量交换技巧和命名规范等内容。
