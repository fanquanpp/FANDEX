## 前置知识

- [Python 与 Celery：分布式任务队列的设计、实现与工程实践](/python/018-PythonCeleryDistributedTaskQueue)：建议先完成前一篇的学习

## 学习目标

- 掌握「1. 条件分支 (Selection)」的核心机制、典型用法与常见陷阱
- 掌握「2. 循环结构 (Iteration)」的核心机制、典型用法与常见陷阱
- 掌握「3. 异常处理 (Exception Handling)」的核心机制、典型用法与常见陷阱
- 掌握「4. 控制流的最佳实践」的核心机制、典型用法与常见陷阱
- 掌握「if 条件语句」的核心机制、典型用法与常见陷阱


## 1. 条件分支 (Selection)

条件分支用于根据不同的条件执行不同的代码块。

### 1.1 `if-elif-else` 语句

`if-elif-else` 语句是最基本的条件分支结构：

```python
 # 基本用法
 x = 7
 if x > 10:
  print("Greater than 10")
 elif x < 5:
  print("Less than 5")
 else:
  print("Between 5 and 10")
 # 多个 elif 条件
 temperature = 25
 if temperature < 0:
  print("Freezing")
 elif 0 <= temperature < 10:
  print("Cold")
 elif 10 <= temperature < 20:
  print("Mild")
 elif 20 <= temperature < 30:
  print("Warm")
 else:
  print("Hot")
 # 嵌套 if 语句
 a = 10
 b = 5
 if a > b:
  print("a is greater than b")
  if a > 20:
  print("a is also greater than 20")
  else:
  print("a is not greater than 20")
 else:
  print("a is not greater than b")
```

### 1.2 三元表达式 (Ternary Expression)

三元表达式是一种简洁的条件表达式，用于在一行代码中实现简单的条件判断：

```python
 # 基本用法
 score = 75
 result = "Pass" if score >= 60 else "Fail"
 print(result) # 输出: Pass
 # 嵌套三元表达式
 temperature = 15
 status = "Hot" if temperature > 30 else "Warm" if temperature > 20 else "Mild" if temperature > 10 else "Cold"
 print(status) # 输出: Mild
 # 与函数结合
 def get_grade(score):
  return "A" if score >= 90 else "B" if score >= 80 else "C" if score >= 70 else "D"
 print(get_grade(85)) # 输出: B
 # 用于列表推导式
 numbers = [1, 2, 3, 4, 5]
 even_odd = ["even" if num % 2 == 0 else "odd" for num in numbers]
 print(even_odd) # 输出: ['odd', 'even', 'odd', 'even', 'odd']
```

### 1.3 `match-case` 语句 (Python 3.10+)

`match-case` 语句（模式匹配）是 Python 3.10 引入的新特性，类似于其他语言的 `switch-case`，但功能更强大：

```python
 # 基本用法
 status = 404
 match status:
  case 200:
  print("OK")
  case 404:
  print("Not Found")
  case 500:
  print("Internal Server Error")
  case _:
  print("Unknown Status")
 # 匹配不同类型
 value = "hello"
 match value:
  case int(x):
  print(f"Integer: {x}")
  case str(x):
  print(f"String: {x}")
  case list(x):
  print(f"List: {x}")
  case _:
  print("Other type")
 # 匹配序列
 point = (1, 2)
 match point:
  case (0, 0):
  print("Origin")
  case (x, 0):
  print(f"On x-axis: {x}")
  case (0, y):
  print(f"On y-axis: {y}")
  case (x, y):
  print(f"Point: ({x}, {y})")
 # 匹配字典
 person = {"name": "Alice", "age": 30}
 match person:
  case {"name": name, "age": age}:
  print(f"Name: {name}, Age: {age}")
  case {"name": name}:
  print(f"Name: {name}, Age unknown")
  case _:
  print("Invalid person data")
 # 匹配类实例
 class Point:
  def __init__(self, x, y):
  self.x = x
  self.y = y
 p = Point(3, 4)
 match p:
  case Point(x=0, y=0):
  print("Origin")
  case Point(x=x, y=0):
  print(f"On x-axis: {x}")
  case Point(x=0, y=y):
  print(f"On y-axis: {y}")
  case Point(x=x, y=y):
  print(f"Point: ({x}, {y})")
 # 组合模式匹配
 command = "quit"
 match command:
  case "help" | "h" | "?":
  print("Show help")
  case "quit" | "q" | "exit":
  print("Exit program")
  case _:
  print("Unknown command")
```

## 2. 循环结构 (Iteration)

循环结构用于重复执行代码块，Python 提供了 `for` 循环和 `while` 循环两种主要的循环结构。

### 2.1 `for` 循环

`for` 循环用于遍历序列（如列表、元组、字符串等）或其他可迭代对象：

#### 2.1.1 基本用法

```python
 # 遍历列表
 fruits = ["apple", "banana", "cherry"]
 for fruit in fruits:
  print(fruit)
 # 遍历字符串
 text = "Hello"
 for char in text:
  print(char)
 # 遍历元组
 tuple_data = (1, 2, 3, 4, 5)
 for num in tuple_data:
  print(num)
 # 遍历字典
 person = {"name": "Alice", "age": 30, "city": "New York"}
 # 遍历键
 for key in person:
  print(key)
 # 遍历值
 for value in person.values():
  print(value)
 # 遍历键值对
 for key, value in person.items():
  print(f"{key}: {value}")
```

#### 2.1.2 使用 `range()` 函数

`range()` 函数用于生成一个数值序列，常用于 `for` 循环：

```python
 # 基本用法
 for i in range(5):
  print(i) # 输出: 0, 1, 2, 3, 4
 # 指定起始值和结束值
 for i in range(2, 7):
  print(i) # 输出: 2, 3, 4, 5, 6
 # 指定步长
 for i in range(0, 10, 2):
  print(i) # 输出: 0, 2, 4, 6, 8
 # 倒序
 for i in range(5, 0, -1):
  print(i) # 输出: 5, 4, 3, 2, 1
 # 遍历列表的索引
 fruits = ["apple", "banana", "cherry"]
 for i in range(len(fruits)):
  print(f"Index {i}: {fruits[i]}")
```

#### 2.1.3 使用 `enumerate()` 函数

`enumerate()` 函数用于同时获取索引和值：

```python
 # 基本用法
 fruits = ["apple", "banana", "cherry"]
 for index, fruit in enumerate(fruits):
  print(f"Index {index}: {fruit}")
 # 指定起始索引
 for index, fruit in enumerate(fruits, start=1):
  print(f"Position {index}: {fruit}")
 # 用于字符串
 text = "Hello"
 for index, char in enumerate(text):
  print(f"Character at {index}: {char}")
```

#### 2.1.4 使用 `zip()` 函数

`zip()` 函数用于同时遍历多个序列：

```python
 # 基本用法
 names = ["Alice", "Bob", "Charlie"]
 ages = [30, 25, 35]
 cities = ["New York", "London", "Paris"]
 for name, age, city in zip(names, ages, cities):
  print(f"{name} is {age} years old from {city}")
 # 处理不同长度的序列
 short_list = [1, 2, 3]
 long_list = [10, 20, 30, 40, 50]
 for a, b in zip(short_list, long_list):
  print(f"{a} - {b}") # 只遍历到最短序列的长度
 # 使用 zip(*) 解压缩
 pairs = [(1, 10), (2, 20), (3, 30)]
 a, b = zip(*pairs)
 print(a) # 输出: (1, 2, 3)
 print(b) # 输出: (10, 20, 30)
```

### 2.2 `while` 循环

`while` 循环用于在条件为真时重复执行代码块：

```python
 # 基本用法
 count = 0
 while count < 5:
  print(count)
  count += 1
 # 计算累加和
 sum = 0
 number = 1
 while number <= 10:
  sum += number
  number += 1
 print(f"Sum: {sum}") # 输出: 55
 # 无限循环（需要 break 退出）
 while True:
  user_input = input("Enter 'quit' to exit: ")
  if user_input == "quit":
  break
  print(f"You entered: {user_input}")
 # 使用 else 子句
 try_count = 0
 max_tries = 3
 while try_count < max_tries:
  print(f"Try {try_count + 1}")
  try_count += 1
 else:
  print("Maximum tries reached")
```

### 2.3 循环控制语句

循环控制语句用于控制循环的执行流程：

#### 2.3.1 `break` 语句

`break` 语句用于立即退出当前循环：

```python
 # 在 for 循环中使用
 fruits = ["apple", "banana", "cherry", "date"]
 target = "cherry"
 for fruit in fruits:
  if fruit == target:
  print(f"Found {target}!")
  break
  print(f"Checking {fruit}")
 # 在 while 循环中使用
 number = 0
 while number < 10:
  print(number)
  if number == 5:
  break
  number += 1
```

#### 2.3.2 `continue` 语句

`continue` 语句用于跳过本次循环，进入下一次迭代：

```python
 # 跳过偶数
 for i in range(10):
  if i % 2 == 0:
  continue
  print(i) # 输出: 1, 3, 5, 7, 9
 # 跳过空字符串
 words = ["hello", "", "world", "", "python"]
 for word in words:
  if not word:
  continue
  print(word)
```

#### 2.3.3 `pass` 语句

`pass` 语句是一个空语句，用于占位：

```python
 # 作为占位符
 for i in range(5):
  pass # 什么都不做，只是占位
 # 在条件语句中
 if x > 10:
  pass # 暂时不实现，留作以后补充
 else:
  print("x is not greater than 10")
 # 在函数定义中
 def future_function():
  pass # 暂时不实现
```

### 2.4 `for-else` 和 `while-else` 语句

Python 的循环结构支持 `else` 子句，当循环正常执行结束（没有被 `break` 中断）时，会执行 `else` 代码块：

```python
 # for-else
 fruits = ["apple", "banana", "cherry"]
 target = "date"
 for fruit in fruits:
  if fruit == target:
  print(f"Found {target}!")
  break
 else:
  print(f"{target} not found")
 # while-else
 number = 0
 target = 5
 while number < 10:
  if number == target:
  print(f"Found {target}!")
  break
  number += 1
 else:
  print(f"{target} not found in 0-9")
 # 应用：查找素数
 def is_prime(n):
  if n <= 1:
  return False
  for i in range(2, int(n**0.5) + 1):
  if n % i == 0:
  return False
  else:
  return
 print(is_prime(17)) # 输出:
 print(is_prime(18)) # 输出: False
```

## 3. 异常处理 (Exception Handling)

异常处理用于捕获和处理程序运行时的错误：

```python
 # 基本用法
 try:
  result = 10 / 0
 except ZeroDivisionError:
  print("Cannot divide by zero")
 # 捕获多种异常
 try:
  number = int(input("Enter a number: "))
  result = 10 / number
 except ValueError:
  print("Invalid input, please enter a number")
 except ZeroDivisionError:
  print("Cannot divide by zero")
 # 捕获所有异常
 try:
  # 可能引发异常的代码
  pass
 except Exception as e:
  print(f"An error occurred: {e}")
 # else 子句：当没有异常时执行
 try:
  result = 10 / 2
 except ZeroDivisionError:
  print("Cannot divide by zero")
 else:
  print(f"Result: {result}")
 # finally 子句：无论是否有异常都执行
 try:
  file = open("example.txt", "r")
  content = file.read()
 except FileNotFoundError:
  print("File not found")
 finally:
  if 'file' in locals():
  file.close()
  print("File closed")
 # 使用 with 语句（自动管理资源）
 try:
  with open("example.txt", "r") as file:
  content = file.read()
  print(content)
 except FileNotFoundError:
  print("File not found")
 # 文件会自动关闭
```

## 4. 控制流的最佳实践

### 4.1 条件分支最佳实践

- **保持条件简洁**: 避免过于复杂的条件表达式
- **使用括号**: 当条件复杂时，使用括号提高可读性
- **避免嵌套过深**: 尽量减少 `if` 语句的嵌套层级
- **使用 `match-case`**: 对于多条件判断，优先使用 `match-case`（Python 3.10+）
- **使用常量**: 将魔法数字定义为常量，提高代码可读性

### 4.2 循环最佳实践

- **选择合适的循环类型**: 对于已知次数的循环使用 `for`，对于未知次数的循环使用 `while`
- **使用 `enumerate()`**: 当需要索引和值时，使用 `enumerate()` 函数
- **使用 `zip()`**: 当需要同时遍历多个序列时，使用 `zip()` 函数
- **避免无限循环**: 确保循环有明确的退出条件
- **使用 `for-else`**: 当需要检查循环是否正常完成时，使用 `for-else` 结构

### 4.3 异常处理最佳实践

- **捕获具体异常**: 尽量捕获具体的异常类型，而不是所有异常
- **保持 `try` 块简洁**: 只在 `try` 块中放置可能引发异常的代码
- **使用 `with` 语句**: 对于需要资源管理的操作，使用 `with` 语句
- **记录异常**: 对于重要的异常，使用日志记录而不是简单打印
- **避免过度使用异常**: 不要将异常用于正常的控制流

### 4.4 代码风格

- **缩进**: 使用 4 个空格进行缩进
- **空行**: 在不同的代码块之间使用空行分隔
- **注释**: 为复杂的条件和循环添加注释
- **命名**: 使用有意义的变量和函数名
- **长度**: 保持每行代码长度不超过 79 个字符

---

## if 条件语句

**基本写法：基本 if 语句**
`if <条件>: <语句>`

```python
# 基本 if 语句
if x > 0:
    print("正数")
```

---

**基本写法：if-else 语句**
`if <条件>: <语句1> else: <语句2>`

```python
# if-else 语句
if age >= 18:
    print("成年")
else:
    print("未成年")
```

---

**基本写法：if-elif-else 语句**
`if <条件1>: <语句1> elif <条件2>: <语句2> else: <语句3>`

```python
# if-elif-else 语句
if score >= 90:
    grade = "A"
elif score >= 80:
    grade = "B"
else:
    grade = "C"
```

---

**换行写法：多条件 if 语句**
`if (<条件1> and`
`    <条件2>):`
`    <语句>`

```python
# 多条件 if 语句（换行书写）
if (age >= 18 and
    age <= 65 and
    has_id):
    print("符合条件")
```

---

## 三元条件表达式

**单行写法：三元条件表达式**
`<值1> if <条件> else <值2>`

```python
# 三元条件表达式
status = "成年" if age >= 18 else "未成年"
```

---

## match-case 语句

**基本写法：match-case 基本用法**
`match <对象>: case <模式>: <语句>`

```python
# match-case 基本用法
match status:
    case 200:
        print("OK")
    case 404:
        print("Not Found")
    case _:
        print("Unknown")
```

---

**基本写法：match-case 字面量模式**
`match <对象>: case <字面量>: <语句>`

```python
# match-case 字面量模式匹配
match color:
    case "red":
        print("红色")
    case "green":
        print("绿色")
    case "blue":
        print("蓝色")
```

---

**基本写法：match-case 变量绑定**
`match <对象>: case <变量>: <语句>`

```python
# match-case 变量绑定模式
match point:
    case (0, 0):
        print("原点")
    case (0, y):
        print(f"y 轴上，y={y}")
    case (x, 0):
        print(f"x 轴上，x={x}")
    case (x, y):
        print(f"点 ({x}, {y})")
```

---

**基本写法：match-case 类模式匹配**
`match <对象>: case <类名>(<属性>): <语句>`

```python
# match-case 类模式匹配
class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y

match point:
    case Point(x=0, y=0):
        print("原点")
    case Point(x=x, y=0):
        print(f"x 轴上，x={x}")
    case Point(x=0, y=y):
        print(f"y 轴上，y={y}")
    case Point(x=x, y=y):
        print(f"点 ({x}, {y})")
```

---

**基本写法：match-case 序列模式**
`match <序列>: case [<元素1>, <元素2>]: <语句>`

```python
# match-case 序列模式匹配
match command:
    case [action]:
        print(f"单个命令: {action}")
    case [action, obj]:
        print(f"命令: {action} {obj}")
    case [action, *args]:
        print(f"命令: {action}，参数: {args}")
```

---

**基本写法：match-case 映射模式**
`match <字典>: case {"<键>": <值>}: <语句>`

```python
# match-case 映射模式匹配
match config:
    case {"host": str(host), "port": int(port)}:
        print(f"连接 {host}:{port}")
    case {"socket": str(path)}:
        print(f"Unix socket: {path}")
```

---

**基本写法：match-case 守卫条件**
`match <对象>: case <模式> if <条件>: <语句>`

```python
# match-case 守卫条件
match number:
    case n if n < 0:
        print("负数")
    case 0:
        print("零")
    case n if n > 0:
        print("正数")
```

---

**基本写法：match-case 或模式**
`match <对象>: case <模式1> | <模式2>: <语句>`

```python
# match-case 或模式匹配
match status:
    case 200 | 201:
        print("成功")
    case 400 | 404:
        print("客户端错误")
    case 500 | 502:
        print("服务器错误")
```

---

## while 循环

**基本写法：while 循环**
`while <条件>: <语句>`

```python
# while 循环
count = 0
while count < 5:
    print(count)
    count += 1
```

---

**基本写法：while-else 语句**
`while <条件>: <语句> else: <语句>`

```python
# while-else 语句（循环正常结束执行 else）
count = 0
while count < 5:
    print(count)
    count += 1
else:
    print("循环结束")
```

---

**基本写法：break 跳出循环**
`while <条件>: break`

```python
# 使用 break 跳出循环
while True:
    user_input = input("输入 quit 退出: ")
    if user_input == "quit":
        break
    print(f"你输入了: {user_input}")
```

---

**基本写法：continue 跳过本次迭代**
`while <条件>: continue`

```python
# 使用 continue 跳过本次迭代
count = 0
while count < 10:
    count += 1
    if count % 2 == 0:
        continue
    print(count)
```

---

## for 循环

**基本写法：遍历可迭代对象**
`for <变量> in <可迭代对象>: <语句>`

```python
# 遍历列表
for item in [1, 2, 3]:
    print(item)
```

---

**基本写法：遍历字符串**
`for <字符> in <字符串>: <语句>`

```python
# 遍历字符串
for char in "Hello":
    print(char)
```

---

**基本写法：遍历字典**
`for <键>, <值> in <字典>.items(): <语句>`

```python
# 遍历字典的键值对
for key, value in {"a": 1, "b": 2}.items():
    print(f"{key}: {value}")
```

---

**基本写法：遍历字典键**
`for <键> in <字典>: <语句>`

```python
# 遍历字典的键
for key in {"a": 1, "b": 2}:
    print(key)
```

---

**基本写法：遍历字典值**
`for <值> in <字典>.values(): <语句>`

```python
# 遍历字典的值
for value in {"a": 1, "b": 2}.values():
    print(value)
```

---

**基本写法：使用 range() 生成序列**
`for <变量> in range(<stop>): <语句>`

```python
# 使用 range() 遍历数字序列
for i in range(5):
    print(i)
```

---

**基本写法：使用 range() 指定起止**
`for <变量> in range(<start>, <stop>): <语句>`

```python
# 使用 range() 指定起始和结束
for i in range(1, 6):
    print(i)
```

---

**基本写法：使用 range() 指定步长**
`for <变量> in range(<start>, <stop>, <step>): <语句>`

```python
# 使用 range() 指定步长
for i in range(0, 10, 2):
    print(i)
```

---

**基本写法：使用 enumerate() 获取索引**
`for <索引>, <值> in enumerate(<可迭代对象>): <语句>`

```python
# 使用 enumerate() 获取索引和值
for index, value in enumerate(["a", "b", "c"]):
    print(f"{index}: {value}")
```

---

**基本写法：enumerate() 指定起始索引**
`for <索引>, <值> in enumerate(<可迭代对象>, start=<n>): <语句>`

```python
# 使用 enumerate() 指定起始索引
for index, value in enumerate(["a", "b", "c"], start=1):
    print(f"{index}: {value}")
```

---

**基本写法：使用 zip() 并行遍历**
`for <变量1>, <变量2> in zip(<可迭代对象1>, <可迭代对象2>): <语句>`

```python
# 使用 zip() 并行遍历多个可迭代对象
names = ["Alice", "Bob"]
ages = [25, 30]
for name, age in zip(names, ages):
    print(f"{name}: {age}")
```

---

**基本写法：for-else 语句**
`for <变量> in <可迭代对象>: <语句> else: <语句>`

```python
# for-else 语句（循环正常结束执行 else）
for item in [1, 2, 3]:
    print(item)
else:
    print("循环结束")
```

---

**基本写法：嵌套循环**
`for <变量1> in <可迭代对象1>: for <变量2> in <可迭代对象2>: <语句>`

```python
# 嵌套循环
for i in range(3):
    for j in range(3):
        print(f"({i}, {j})")
```

---

## 循环控制语句

**基本写法：break 跳出 for 循环**
`for <变量> in <可迭代对象>: if <条件>: break`

```python
# 使用 break 跳出 for 循环
for item in [1, 2, 3, 4, 5]:
    if item == 3:
        break
    print(item)
```

---

**基本写法：continue 跳过 for 循环迭代**
`for <变量> in <可迭代对象>: if <条件>: continue`

```python
# 使用 continue 跳过 for 循环的本次迭代
for item in [1, 2, 3, 4, 5]:
    if item % 2 == 0:
        continue
    print(item)
```

---

**基本写法：pass 空语句**
`for <变量> in <可迭代对象>: pass`

```python
# 使用 pass 作为循环体占位符
for item in items:
    pass
```

---

## 无限循环

**基本写法：while True 无限循环**
`while True: <语句>`

```python
# while True 无限循环
while True:
    response = get_input()
    if response == "exit":
        break
    process(response)
```

---

## 循环中的 else 与 break

**基本写法：循环 break 不执行 else**
`for <变量> in <可迭代对象>: if <条件>: break else: <语句>`

```python
# 循环中 break 时不执行 else 块
for item in [1, 2, 3, 4, 5]:
    if item == 3:
        print("找到 3")
        break
else:
    print("未找到 3")
```

---

## 迭代器与可迭代对象

**基本写法：使用 iter() 获取迭代器**
`iter(<可迭代对象>)`

```python
# 获取迭代器
my_iter = iter([1, 2, 3])
```

---

**基本写法：使用 next() 获取下一个值**
`next(<迭代器>)`

```python
# 获取迭代器的下一个值
print(next(my_iter))
```

---

**基本写法：next() 指定默认值**
`next(<迭代器>, <默认值>)`

```python
# 获取迭代器的下一个值，指定默认值
print(next(my_iter, None))
```

---

**换行写法：自定义迭代器类**
`class <类名>:`
`    def __iter__(self): <语句>`
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

**换行写法：可迭代对象（仅实现 __iter__）**
`class <类名>:`
`    def __iter__(self): yield <值>`

```python
# 可迭代对象（使用 yield 实现）
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

## 生成器表达式

**基本写法：生成器表达式**
`(<表达式> for <变量> in <可迭代对象>)`

```python
# 生成器表达式
squares = (x ** 2 for x in range(10))
print(next(squares))
```

---

**基本写法：带条件的生成器表达式**
`(<表达式> for <变量> in <可迭代对象> if <条件>)`

```python
# 带条件的生成器表达式
evens = (x for x in range(20) if x % 2 == 0)
print(list(evens))
```
