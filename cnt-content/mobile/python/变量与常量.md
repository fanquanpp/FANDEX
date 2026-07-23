# 变量与常量

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 变量赋值

**基本写法：动态类型赋值**
`<变量> = <值>`

```python
# 基本变量赋值
x = 10
name = "Alice"
is_valid = True
```

---

**基本写法：动态类型改变**
`<变量> = <新类型的值>`

```python
# 变量 x 从整数变为字符串
x = "Hello"
```

---

## 链式赋值

**基本写法：多个变量指向同一对象**
`<变量1> = <变量2> = <值>`

```python
# 链式赋值，a、b、c 指向同一对象
a = b = c = 100
```

---

## 多重赋值（解包）

**单行写法：同时为多个变量赋值**
`<变量1>, <变量2> = <值1>, <值2>`

```python
# 多重赋值（单行写法）
x, y = 1, 2
```

---

**单行写法：解包列表或元组**
`<变量1>, <变量2>, <变量3> = <序列>`

```python
# 解包列表到多个变量
values = [3, 4, 5]
x, y, z = values
```

---

**基本写法：使用星号收集剩余值**
`<变量1>, *<变量2> = <序列>`

```python
# 使用星号收集剩余值到列表
first, *rest = [1, 2, 3, 4, 5]
```

---

## 内存地址与引用

**基本写法：查看对象内存地址**
`id(<对象>)`

```python
# 查看变量的内存地址
x = 10
print(id(x))
```

---

## 变量作用域

**基本写法：局部作用域变量**
`def <函数>(): <局部变量> = <值>`

```python
# 函数内部定义的局部变量
def my_function():
    local_var = "local"
    print(local_var)
```

---

**基本写法：全局作用域变量**
`<全局变量> = <值>`

```python
# 模块级别定义的全局变量
global_var = "global"
```

---

**基本写法：使用 global 声明修改全局变量**
`global <变量名>`

```python
# 在函数内部声明并修改全局变量
count = 0

def increment():
    global count
    count += 1
```

---

**基本写法：使用 nonlocal 声明修改嵌套作用域变量**
`nonlocal <变量名>`

```python
# 在内部函数中修改外层函数的变量
def outer_function():
    count = 0
    def inner_function():
        nonlocal count
        count += 1
    inner_function()
```

---

## 引用计数

**基本写法：查看对象引用计数**
`sys.getrefcount(<对象>)`

```python
# 查看对象的引用计数
import sys
x = [1, 2, 3]
print(sys.getrefcount(x))
```

---

## 常量命名约定

**基本写法：常量使用全大写字母和下划线**
`<UPPER_CASE_NAME> = <值>`

```python
# 常量命名约定（全大写加下划线）
MAX_CONNECTIONS = 100
DEFAULT_TIMEOUT = 30
PI = 3.14159265359
```

---

## 实现真正的常量

**换行写法：使用类实现不可修改常量**
`class <常量类>:`
`    <常量1> = <值>`
`    <常量2> = <值>`
`    def __setattr__(self, name, value): raise AttributeError(...)`

```python
# 通过 __setattr__ 禁止修改的常量类
class Constants:
    MAX_CONNECTIONS = 100
    DEFAULT_TIMEOUT = 30

    def __setattr__(self, name, value):
        raise AttributeError("Constants cannot be modified")
```

---

## 枚举常量

**换行写法：使用 enum 模块定义枚举常量**
`class <枚举类>(Enum):`
`    <成员1> = <值>`
`    <成员2> = <值>`

```python
# 使用 Enum 定义一组相关常量
from enum import Enum

class Color(Enum):
    RED = 1
    GREEN = 2
    BLUE = 3
```

---

**换行写法：使用 auto() 自动赋值**
`class <枚举类>(Enum):`
`    <成员1> = auto()`
`    <成员2> = auto()`

```python
# 使用 auto() 自动生成枚举值
from enum import Enum, auto

class Direction(Enum):
    NORTH = auto()
    SOUTH = auto()
    EAST = auto()
    WEST = auto()
```

---

**基本写法：访问枚举成员**
`<枚举类>.<成员>`

```python
# 访问枚举成员及其值
print(Color.RED)
print(Color.RED.value)
```

---

**基本写法：遍历枚举**
`for <变量> in <枚举类>: <语句>`

```python
# 遍历枚举的所有成员
for color in Color:
    print(color.name, color.value)
```

---

## 变量交换

**单行写法：两个变量交换**
`<变量1>, <变量2> = <变量2>, <变量1>`

```python
# 使用元组解包交换两个变量
a, b = 1, 2
a, b = b, a
```

---

**单行写法：三个变量交换**
`<变量1>, <变量2>, <变量3> = <变量3>, <变量1>, <变量2>`

```python
# 三个变量循环交换
x, y, z = 1, 2, 3
x, y, z = z, x, y
```

---

**基本写法：列表元素交换**
`<列表>[<索引1>], <列表>[<索引2>] = <列表>[<索引2>], <列表>[<索引1>]`

```python
# 交换列表中两个位置的元素
lst = [1, 2, 3, 4]
lst[0], lst[1] = lst[1], lst[0]
