---
order: 280
title: Python enum 枚举
module: 'python'
category: 后端技术
difficulty: beginner
description: enum 模块全解：定义枚举、IntEnum/StrEnum/Flag、auto 赋值、别名规则与工程实践。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'python/480-OOPAdvanced'
  - 'python/540-TypingAdvanced'
prerequisites:
  - 'python/480-OOPAdvanced'
---

## 枚举解决什么问题

用裸字符串或裸整数表示"有限且固定的一组取值"，是最常见的缺陷来源：`status = "actve"` 拼错了没人拦得住，`1` 和 `2` 谁代表谁全靠注释。枚举把一组常量组织成一个类型：**取值只能在成员里选，拼错直接 AttributeError，打印出来人类可读，还能挂方法**。可以把它类比成"带校验的常量字典"——字典不阻止你取不存在的键时的静默错误，枚举则把错误提前到第一次书写。

Python 的枚举由标准库 `enum` 提供，三个最常用的变体各有分工：`Enum`（通用）、`IntEnum`/`StrEnum`（需要与整数/字符串互操作的场合）、`IntFlag`/`Flag`（位标志组合）。

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
print(Perm.R in p)     # True（in 判断需要 3.12+；旧版本用 bool(p & Perm.R)）
print(int(p))          # 6
```

---

## StrEnum（3.11+）

**基本写法：StrEnum**
`class <名称>(enum.StrEnum):`
```python
# StrEnum 成员的 str() 返回成员值（普通 Enum 的 str() 返回 "Status.ACTIVE" 形式）
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

---

## 常见陷阱与最佳实践

1. **同值成员不是新成员，而是别名**：遍历时别名不会出现，只在 `__members__` 里可见。不需要别名时加 `@enum.unique` 让重复值直接报错，把"手滑写重"挡在运行之前。

```python
import enum

@enum.unique
class Level(enum.Enum):
    LOW = 1
    HIGH = 2
    # HIGH_AGAIN = 2  # 加了 @unique 后这一行会抛 ValueError
```

2. **普通 Enum 与 int/str 比较恒为 False**：`Color.RED == 1` 是 False，作为字典键存进 JSON 后会失配。需要互操作就继承 `IntEnum` / `StrEnum`（3.11+）；只是想要"名字即值"的序列化场景，StrEnum 比"普通 Enum + 手写 to_dict"干净得多。

3. **别用 `.value` 当唯一身份做等值判断**：`Color.RED.value == Color2.RED.value` 比的是值，`Color.RED is Color.RED` 比的才是身份。业务判断统一写 `status is Status.ACTIVE`，既快又不会在两个枚举同值时误判相等。

4. **auto() 的值依赖声明顺序**：在成员中间插入一个新成员，后续成员的值全部顺移。凡是值会被持久化到数据库或对外协议的枚举，显式写死数值，不要用 auto()。

5. **Flag 的 `in` 需要 3.12+**：旧版本里 `Perm.R in p` 会抛 TypeError，跨版本代码用 `bool(p & Perm.R)` 最稳。

## 本篇小结

1. 枚举的本质是"有限取值的类型化"：成员即实例，取值即遍历，拼错即报错——用枚举替换裸字符串/魔法数字是零成本的重构收益。
2. 选型口诀：通用场景用 `Enum`；要与整数/字符串互操作用 `IntEnum` / `StrEnum`；权限、选项这类可组合状态用 `Flag` / `IntFlag`。
3. 别名与 `@unique` 是同一件事的两面：默认宽容（同值合并），声明后严格（重复报错），持久化场景建议始终严格。
4. 枚举可以挂方法与 `__str__`，配合 dataclass（3.12+）还能给成员附加字段——它是一个完整的类，而不是常量列表。

## 动手实践

1. 把一个使用 `"pending"/"running"/"done"` 字符串状态的小脚本重构为 `StrEnum`，统计字符串拼写的拼写保护效果（故意写错一个，观察报错时机）。
2. 用 `IntFlag` 实现文件权限模型，支持 `|` 授予、`&` 检查、`^` 反转三种操作，并打印每个状态的整数值。
3. 定义一个携带折扣率的订单类型枚举（普通成员 + `discount` 方法），验证"枚举成员可以携带行为"。
