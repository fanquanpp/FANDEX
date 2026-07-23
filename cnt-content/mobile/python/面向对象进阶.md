# Python 面向对象进阶

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 抽象基类

**换行写法：定义抽象基类**
`from abc import ABC, abstractmethod`
`class <类名>(ABC):`
`    @abstractmethod`
`    def <方法名>(self): <语句>`

```python
# 定义抽象基类
from abc import ABC, abstractmethod

class Animal(ABC):
    @abstractmethod
    def speak(self):
        pass
```

---

**基本写法：实现抽象基类**
`class <子类>(<抽象基类>): def <抽象方法>(self): <语句>`

```python
# 实现抽象基类
class Dog(Animal):
    def speak(self):
        return "Woof!"
```

---

## 数据类

**换行写法：使用 dataclass**
`from dataclasses import dataclass`
`@dataclass`
`class <类名>:`
`    <字段1>: <类型>`
`    <字段2>: <类型>`

```python
# 使用 dataclass 装饰器
from dataclasses import dataclass

@dataclass
class Point:
    x: float
    y: float
```

---

**换行写法：带默认值的 dataclass**
`@dataclass`
`class <类名>:`
`    <字段1>: <类型>`
`    <字段2>: <类型> = <默认值>`

```python
# 带默认值的 dataclass
@dataclass
class User:
    name: str
    age: int = 18
    active: bool = True
```

---

**换行写法：使用 field() 设置默认值**
`from dataclasses import dataclass, field`
`@dataclass`
`class <类名>:`
`    <字段>: <类型> = field(default_factory=<工厂>)`

```python
# 使用 field() 设置可变默认值
from dataclasses import dataclass, field

@dataclass
class Student:
    name: str
    grades: list = field(default_factory=list)
```

---

## 封装与访问控制

**基本写法：使用单下划线表示受保护**
`self._<属性> = <值>`

```python
# 使用单下划线表示受保护属性
class BankAccount:
    def __init__(self, balance):
        self._balance = balance
```

---

**基本写法：使用双下划线表示私有**
`self.__<属性> = <值>`

```python
# 使用双下划线表示私有属性（名称重整）
class BankAccount:
    def __init__(self, balance):
        self.__balance = balance
```

---

**基本写法：提供公共访问方法**
`def get_<属性>(self): return self.__<属性>`

```python
# 提供公共方法访问私有属性
class BankAccount:
    def __init__(self, balance):
        self.__balance = balance

    def get_balance(self):
        return self.__balance
```

---

**基本写法：提供公共修改方法**
`def set_<属性>(self, <值>): self.__<属性> = <值>`

```python
# 提供公共方法修改私有属性
class BankAccount:
    def set_balance(self, balance):
        if balance < 0:
            raise ValueError("Balance cannot be negative")
        self.__balance = balance
```

---

## 组合与聚合

**换行写法：使用组合**
`class <类名>:`
`    def __init__(self):`
`        self.<组件> = <其他类>()`

```python
# 使用组合关系
class Engine:
    def start(self):
        return "Engine started"

class Car:
    def __init__(self):
        self.engine = Engine()

    def start(self):
        return self.engine.start()
```

---

## 多态

**基本写法：多态实现**
`def <函数>(<参数>: <类型>): <参数>.<方法>()`

```python
# 多态实现（不同类调用相同方法）
class Dog:
    def speak(self):
        return "Woof!"

class Cat:
    def speak(self):
        return "Meow!"

def animal_speak(animal):
    return animal.speak()
```

---

## 元类

**换行写法：使用 type() 动态创建类**
`<类名> = type("<类名>", (<父类>,), {<属性>: <值>})`

```python
# 使用 type() 动态创建类
Dog = type("Dog", (), {"bark": lambda self: "Woof!"})
dog = Dog()
```

---

**换行写法：自定义元类**
`class <元类名>(type):`
`    def __new__(mcs, name, bases, namespace): <语句>`

```python
# 自定义元类
class MyMeta(type):
    def __new__(mcs, name, bases, namespace):
        cls = super().__new__(mcs, name, bases, namespace)
        return cls

class MyClass(metaclass=MyMeta):
    pass
```

---

## 描述符

**换行写法：自定义描述符**
`class <描述符类>:`
`    def __get__(self, obj, objtype): <语句>`
`    def __set__(self, obj, value): <语句>`

```python
# 自定义描述符
class ValidatedAttribute:
    def __init__(self, name):
        self.name = name

    def __get__(self, obj, objtype):
        return obj.__dict__.get(self.name)

    def __set__(self, obj, value):
        if not isinstance(value, int):
            raise TypeError("Must be integer")
        obj.__dict__[self.name] = value
```

---

## 类装饰器

**换行写法：使用类装饰器**
`def <装饰器名>(cls): <修改类> return <类>`

```python
# 使用类装饰器添加方法
def add_method(cls):
    cls.new_method = lambda self: "New method"
    return cls

@add_method
class MyClass:
    pass
```

---

## __slots__ 优化

**基本写法：使用 __slots__ 限制属性**
`class <类名>: __slots__ = [<属性1>, <属性2>]`

```python
# 使用 __slots__ 限制实例属性
class Point:
    __slots__ = ["x", "y"]

    def __init__(self, x, y):
        self.x = x
        self.y = y
```

---

## 枚举类

**换行写法：定义枚举类**
`from enum import Enum`
`class <枚举类>(Enum):`
`    <成员1> = <值>`
`    <成员2> = <值>`

```python
# 定义枚举类
from enum import Enum

class Color(Enum):
    RED = 1
    GREEN = 2
    BLUE = 3
```

---

**基本写法：访问枚举成员**
`<枚举类>.<成员>`

```python
# 访问枚举成员
print(Color.RED)
print(Color.RED.value)
```

---

**基本写法：通过值获取枚举成员**
`<枚举类>(<值>)`

```python
# 通过值获取枚举成员
print(Color(1))
```

---

**基本写法：遍历枚举**
`for <变量> in <枚举类>: <语句>`

```python
# 遍历枚举的所有成员
for color in Color:
    print(color.name, color.value)
```
