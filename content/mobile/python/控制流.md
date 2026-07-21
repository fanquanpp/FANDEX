# 控制流

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

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
