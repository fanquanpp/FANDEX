---
order: 480
title: Python 面向对象进阶
module: 'python'
category: 后端技术
difficulty: intermediate
description: 面向对象进阶机制：抽象基类、dataclass、封装、组合、多态、slots 与元类/描述符入门。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'python/460-OOP'
  - 'python/470-OOPFundamentals'
  - 'python/570-Descriptor'
  - 'python/550-DataClassPydantic'
prerequisites:
  - 'python/470-OOPFundamentals'
---

## 从"会写类"到"会设计类"

基础篇解决了"怎么定义类、怎么继承"；进阶篇回答的是工程里真正高频的四个问题：**如何强制子类实现约定**（抽象基类）、**如何少写样板代码**（dataclass）、**如何让对象职责单一可测试**（封装与组合）、**如何在对象数量巨大时省内存**（`__slots__`）。元类与描述符在这里只需建立直觉——它们是"类的类"和"属性访问的钩子"，是理解 `property`、`dataclass`、ORM 字段背后机制的钥匙，深入展开见 [元类](/python/590-Metaclass) 与 [描述符](/python/570-Descriptor)。

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
# 实现抽象基类：漏实现任何抽象方法，实例化时立刻报 TypeError
class Dog(Animal):
    def speak(self):
        return "Woof!"

# 抽象基类自身不能实例化
# Animal()  # TypeError: Can't instantiate abstract class Animal
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
# 注意：可变默认值（list/dict/set）必须走 default_factory，
# 直接写 grades: list[int] = [] 会让所有实例共享同一个列表
from dataclasses import dataclass, field

@dataclass
class Student:
    name: str
    grades: list[int] = field(default_factory=list)
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

# 收益实测（百万级对象场景）：
# 普通类每个实例带一个 __dict__，slots 版省内存约 40%-60%，属性访问也更快
# 代价：不能再动态添加 x/y 之外的属性，且与多重继承中的多_slots_父类易冲突
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

---

## 常见陷阱与最佳实践

1. **抽象基类忘写 @abstractmethod**：基类方法体给了默认实现但不加装饰器，子类不实现也不会报错。需要"强制约定"的方法必须加 `@abstractmethod`；只想提供默认行为则不必。
2. **可变默认值直接写 `= []`**：dataclass 与普通类一样会在类创建时求值一次，所有实例共享同一个列表。一律用 `field(default_factory=list)`。
3. **滥用双下划线私有**：`__name` 触发名称重整（变成 `_类名__name`），继承时容易造成"属性消失"的灵异现象。约定是：公开属性不加前缀，内部实现用单下划线 `_x`，双下划线只用于确需避免子类命名冲突的场合。
4. **继承优先于组合的反模式**：`Car(Engine)` 让汽车"是一种引擎"，显然错误；"有一个"用组合（`self.engine = Engine()`）。判断口诀：is-a 继承，has-a 组合。
5. **多态靠 isinstance 分支实现**：在函数里写一串 `isinstance(x, Dog)` 分支，等于放弃多态。给每个类实现同名方法，让调用方只管调用。

```python
# 错误：类型分支堆积
# def speak(animal):
#     if isinstance(animal, Dog): return "Woof!"
#     elif isinstance(animal, Cat): return "Meow!"

# 正确：同名方法自动分发
def speak(animal):
    return animal.speak()
```

## 本篇小结

1. 抽象基类用 `ABC + @abstractmethod` 把"子类必须实现什么"变成实例化期的硬约束，是插件/驱动类架构的标配。
2. dataclass 消灭 `__init__`/`__repr__`/`__eq__` 样板；可变默认值走 `default_factory`，配合 `frozen=True`/`slots=True` 可获得不可变与省内存变体。
3. 封装约定三层：公开、单下划线内部、双下划线重整；多数场景单下划线即可。
4. 组合优于继承是默认答案，`__slots__` 是海量小对象的内存开关；元类与描述符先建立"类的类"与"属性钩子"直觉，深入见专门篇目。

## 动手实践

1. 用抽象基类定义 `Exporter`（`export(data: dict) -> str`），实现 `JSONExporter` 与 `CSVExporter` 两个子类，验证漏实现时实例化报错。
2. 给一个 `Order` dataclass 加上 `items: list[str]` 与 `frozen=False`，再改造出 `frozen=True` + `slots=True` 的版本，用 `sys.getsizeof` 粗对比两者实例内存。
3. 把一段 `if isinstance` 分支代码重构成多态调用，体会调用方代码量的变化。
