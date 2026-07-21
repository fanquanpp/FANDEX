# 程序结构与基本语法

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 模块文档字符串

**基本写法：模块级文档字符串**
`"""<模块描述>"""`

```python
# 模块开头的文档字符串
"""用户管理模块，提供用户增删改查功能"""
```

---

## 导入语句

**单行写法：导入单个模块**
`import <模块>`

```python
# 导入 math 模块
import math
```

---

**单行写法：从模块导入指定对象**
`from <模块> import <对象>`

```python
# 从 datetime 模块导入 datetime 类
from datetime import datetime
```

---

**换行写法：从模块导入多个对象**
`from <模块> import (<对象1>, <对象2>, <对象3>)`

```python
# 从 typing 模块导入多个类型（换行书写）
from typing import (
    List,
    Dict,
    Optional,
    Union,
)
```

---

## 全局变量定义

**基本写法：模块级全局变量**
`<变量> = <值>`

```python
# 定义模块级全局常量
PI = math.pi
MAX_VALUE = 100
```

---

## 函数定义

**基本写法：定义函数**
`def <函数名>(<参数>): <语句>`

```python
# 定义计算圆面积的函数
def calculate_area(radius):
    return PI * (radius ** 2)
```

---

## 类定义

**单行写法：简单类定义**
`class <类名>: <类体>`

```python
# 定义空类作为占位符
class Placeholder: pass
```

---

**换行写法：包含属性和方法的类定义**
`class <类名>:`
`    def __init__(self, <参数>): <初始化>`
`    def <方法>(self): <语句>`

```python
# 定义 Circle 类，包含初始化方法和实例方法
class Circle:
    def __init__(self, radius):
        self.radius = radius

    def area(self):
        return calculate_area(self.radius)
```

---

## 主函数与入口点

**基本写法：定义主函数**
`def main(): <语句>`

```python
# 定义程序主函数
def main():
    circle = Circle(5)
    print(f"Area: {circle.area():.2f}")
```

---

**基本写法：标准入口点检查**
`if __name__ == "__main__": <主逻辑>`

```python
# 模块作为脚本运行时执行主函数
if __name__ == "__main__":
    main()
```

---

## 缩进规则

**基本写法：使用 4 个空格定义代码块**
`<语句>:`
`    <4 空格缩进的语句>`

```python
# 使用 4 个空格缩进定义代码块
def example():
    if True:
        print("Inside if")
        for i in range(3):
            print(f"Loop {i}")
    print("Outside if")
```

---

## 注释规范

**基本写法：单行注释**
`# <注释内容>`

```python
# 这是一个单行注释
age = 30  # 行尾注释
```

---

**基本写法：函数文档字符串**
`def <函数>(<参数>): """<文档内容>"""`

```python
# 为函数添加文档字符串
def calculate_area(radius):
    """计算圆的面积"""
    return math.pi * (radius ** 2)
```

---

**换行写法：多行文档字符串**
`def <函数>(<参数>):`
`    """`
`    <描述>`
`    Args: <参数说明>`
`    Returns: <返回值说明>`
`    """`

```python
# 多行文档字符串（换行书写）
def calculate_area(radius):
    """
    计算圆的面积
    Args:
        radius: 圆的半径
    Returns:
        圆的面积
    """
    return math.pi * (radius ** 2)
```

---

## 标识符规则

**基本写法：合法标识符命名**
`<标识符> = <值>`

```python
# 合法的标识符命名
user_name = "Alice"
_total = 100
PI = 3.14
```

---

## 命名规范

**基本写法：变量和函数使用 snake_case**
`<变量> = <snake_case>`

```python
# 变量使用 snake_case 命名
user_name = "Alice"
```

---

**基本写法：函数使用 snake_case**
`def <snake_case>(): <语句>`

```python
# 函数使用 snake_case 命名
def calculate_total():
    pass
```

---

**基本写法：常量使用 UPPER_SNAKE_CASE**
`<UPPER_CASE> = <值>`

```python
# 常量使用全大写加下划线
MAX_VALUE = 100
DEFAULT_TIMEOUT = 30
```

---

**基本写法：类名使用 PascalCase**
`class <PascalCase>: <类体>`

```python
# 类名使用 PascalCase 命名
class UserProfile:
    pass
```

---

**基本写法：私有属性使用下划线前缀**
`self._<属性> = <值>`

```python
# 私有属性使用单下划线前缀
class MyClass:
    def __init__(self):
        self._private_var = 0
```

---

## 语句换行

**单行写法：使用反斜杠显式换行**
`<语句> \`
`    <续行>`

```python
# 使用反斜杠实现显式换行
long_string = "This is a very long string that " \
    "spans multiple lines using backslash"
```

---

**换行写法：在括号内隐式换行**
`<表达式> (`
`    <内容>`
`)`

```python
# 在括号内隐式换行（推荐写法）
long_string = (
    "This is a very long string that "
    "spans multiple lines using parentheses"
)
```

---

**换行写法：列表多行书写**
`<列表> = [`
`    <元素1>,`
`    <元素2>,`
`]`

```python
# 列表换行书写
numbers = [
    1, 2, 3,
    4, 5, 6,
    7, 8, 9,
]
```

---

**换行写法：函数调用多行书写**
`<函数>(`
`    <参数1>=<值1>,`
`    <参数2>=<值2>,`
`)`

```python
# 函数调用换行书写
result = calculate(
    param1=value1,
    param2=value2,
    param3=value3,
)
```

---

## 分号与空语句

**基本写法：分号分隔多个语句**
`<语句1>; <语句2>`

```python
# 使用分号在一行分隔多个语句（不推荐）
x = 1; y = 2; print(x + y)
```

---

**基本写法：pass 空语句占位**
`pass`

```python
# 使用 pass 作为函数体占位符
def placeholder_function():
    pass
```

---

**基本写法：pass 用于类定义占位**
`class <类名>: pass`

```python
# 使用 pass 作为类体占位符
class PlaceholderClass:
    pass
```

---

**基本写法：pass 用于条件语句占位**
`if <条件>: pass`

```python
# 使用 pass 作为条件语句体占位符
if condition:
    pass
```

---

## 多行语句组合

**单行写法：元组解包多行赋值**
`(<变量1>, <变量2>, <变量3>) = (<值1>, <值2>, <值3>)`

```python
# 使用元组解包进行多变量赋值
(a, b, c) = (1, 2, 3)
```

---

**换行写法：多行字典定义**
`<字典> = {`
`    <键1>: <值1>,`
`    <键2>: <值2>,`
`}`

```python
# 字典换行书写
data = {
    'name': 'John',
    'age': 30,
    'city': 'New York',
}
```

---

**换行写法：多行条件表达式**
`if (<条件1> and`
`    <条件2>):`
`    <语句>`

```python
# 多行条件表达式（换行书写）
if (condition1 and
    condition2):
    do_something()
