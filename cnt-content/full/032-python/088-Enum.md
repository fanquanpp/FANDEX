---
order: 880
title: Python enum 枚举
module: 'python'
category: 后端技术
difficulty: beginner
description: Python enum 枚举 的完整教学讲解。
author: fanquanpp
updated: '2026-09-08'
related: []
prerequisites: []
---

## Enum 基础

**基本写法：定义枚举**
`class <名称>(enum.Enum):`
```python
# 定义枚举类型
import enum

class Color(enum.Enum):
    RED = 1
    GREEN = 2
    BLUE = 3

print(Color.RED)           # Color.RED
print(Color.RED.value)     # 1
print(Color.RED.name)      # RED
```

**基本写法：按值获取成员**
`<枚举>(<值>)`
```python
# 通过值获取枚举成员
c = Color(1)
print(c is Color.RED)
```

**基本写法：按名获取成员**
`<枚举>[<名称>]`
```python
# 通过名称字符串获取成员
c = Color["RED"]
print(c is Color.RED)
```

**基本写法：遍历枚举**
`for <成员> in <枚举>:`
```python
# 遍历所有枚举成员
for c in Color:
    print(c.name, c.value)
```

---

## IntEnum 与 IntFlag

**基本写法：IntEnum**
`class <名称>(enum.IntEnum):`
```python
# IntEnum 支持整数比较与运算
class Priority(enum.IntEnum):
    LOW = 1
    NORMAL = 2
    HIGH = 3

print(Priority.HIGH > Priority.LOW)
```

**基本写法：IntFlag 位标志**
`class <名称>(enum.IntFlag):`
```python
# IntFlag 支持位运算
class Perm(enum.IntFlag):
    R = 4
    W = 2
    X = 1

p = Perm.R | Perm.W
print(Perm.R in p)
```

---

## StrEnum（3.11+）

**基本写法：StrEnum**
`class <名称>(enum.StrEnum):`
```python
# StrEnum 成员的 str() 返回成员名
class Status(enum.StrEnum):
    ACTIVE = "active"
    INACTIVE = "inactive"

print(str(Status.ACTIVE))    # active
print(Status.ACTIVE.upper()) # ACTIVE
```

---

## auto 自动赋值

**基本写法：auto 自动赋值**
`<成员> = enum.auto()`
```python
# 使用 auto 自动生成值
class Color(enum.Enum):
    RED = enum.auto()
    GREEN = enum.auto()
    BLUE = enum.auto()
```

**基本写法：自定义 auto 生成器**
`enum.auto()` 配合 `_generate_next_value_`
```python
# 自定义 auto 生成逻辑
class Color(enum.Enum):
    def _generate_next_value_(name, start, count, last_values):
        return name.lower()
    RED = enum.auto()
    GREEN = enum.auto()
```

---

## 唯一值与别名

**基本写法：@unique 强制唯一**
`@enum.unique`
```python
# 强制枚举值唯一
@enum.unique
class Color(enum.Enum):
    RED = 1
    GREEN = 2
```

**基本写法：别名**
`<别名> = <成员>`
```python
# 同值成员成为别名
class Color(enum.Enum):
    RED = 1
    CRIMSON = 1  # 别名指向 RED

print(Color.CRIMSON is Color.RED)
```

---

## Flag 与 auto 位运算

**基本写法：Flag**
`class <名称>(enum.Flag):`
```python
# Flag 支持位运算
class Permission(enum.Flag):
    R = enum.auto()
    W = enum.auto()
    X = enum.auto()

p = Permission.R | Permission.W
print(Permission.R in p)
```

**基本写法：组合成员**
`<成员1> | <成员2>`
```python
# 组合权限
RW = Permission.R | Permission.W
print(RW.value)
```

---

## 枚举方法

**基本写法：枚举自定义方法**
`class <枚举>(enum.Enum):\n    def <方法>(self):`
```python
# 枚举成员可定义方法
class Color(enum.Enum):
    RED = 1
    GREEN = 2
    def is_primary(self):
        return self in (Color.RED, Color.GREEN, Color.BLUE)
```

**基本写法：__str__ 自定义**
`def __str__(self):`
```python
# 自定义枚举字符串表示
class Color(enum.Enum):
    RED = 1
    def __str__(self):
        return f"Color({self.name})"
```

---

## 枚举与 dataclass

**基本写法：Enum 结合 dataclass（3.12+）**
`class <类>(enum.Enum):`
```python
# 使用 dataclass 装饰枚举
from dataclasses import dataclass

@dataclass
class ItemData:
    name: str
    price: float

class Item(ItemData, enum.Enum):
    APPLE = ("apple", 1.5)
    BANANA = ("banana", 0.8)
```

---

## enum 成员属性

**基本写法：_value_ 与 _name_**
`<成员>._value_` | `<成员>._name_`
```python
# 访问成员的值与名称
print(Color.RED._value_)
print(Color.RED._name_)
```

**基本写法：__members__ 字典**
`<枚举>.__members__`
```python
# 获取所有成员的有序字典
for name, member in Color.__members__.items():
    print(name, member)
```
