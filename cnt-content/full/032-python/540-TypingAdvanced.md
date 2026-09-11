---
order: 540
title: Python typing 进阶
module: 'python'
category: 后端技术
difficulty: beginner
description: Python typing 进阶 的完整教学讲解。
author: fanquanpp
updated: '2026-09-12'
related: []
prerequisites: []
---

## Literal 字面量类型

**基本写法：限定具体值**
`Literal[<值1>, <值2>]`
```python
# 限定参数只能取特定字面值
from typing import Literal

def set_mode(mode: Literal["r", "w", "a"]) -> None:
    pass

set_mode("r")
```

---

## TypedDict 结构化字典

**基本写法：定义 TypedDict**
`class <名称>(TypedDict):\n    <字段>: <类型>`
```python
# 类型化字典
from typing import TypedDict

class User(TypedDict):
    id: int
    name: str
    active: bool

u: User = {"id": 1, "name": "Alice", "active": True}
```

**基本写法：total=False 全可选**
`class <名称>(TypedDict, total=False):`
```python
# 所有字段可选
class Point(TypedDict, total=False):
    x: int
    y: int
```

**基本写法：Required 与 NotRequired（3.11+）**
`Required[<类型>]` | `NotRequired[<类型>]`
```python
# 单字段控制可选性
from typing import TypedDict, Required, NotRequired

class Config(TypedDict):
    host: Required[str]
    port: NotRequired[int]
```

**基本写法：ReadOnly 只读（3.13+）**
`ReadOnly[<类型>]`
```python
# 标记字段只读
from typing import TypedDict, ReadOnly

class Item(TypedDict):
    id: ReadOnly[int]
    name: str
```

---

## Final 不可变注解

**基本写法：声明 Final**
`<变量>: Final[<类型>] = <值>`
```python
# Final 表示变量不应被重新赋值
from typing import Final

MAX_SIZE: Final[int] = 100
```

**基本写法：类属性 Final**
`<属性>: Final[<类型>]`
```python
# 类属性标记为 Final
class Config:
    VERSION: Final[str] = "1.0.0"
```

---

## Protocol 结构子类型

**基本写法：定义 Protocol**
`class <名称>(Protocol):\n    def <方法>(self): ...`
```python
# 鸭子类型的静态检查支持
from typing import Protocol

class Closeable(Protocol):
    def close(self) -> None: ...

def close_all(items: list[Closeable]) -> None:
    for item in items:
        item.close()
```

**基本写法：runtime_checkable**
`@runtime_checkable`
```python
# 允许 isinstance 检查
from typing import Protocol, runtime_checkable

@runtime_checkable
class Iterable2(Protocol):
    def __iter__(self): ...

print(isinstance([1, 2], Iterable2))
```

---

## TypeVar 类型变量

**基本写法：定义 TypeVar**
`T = TypeVar("<名称>")`
```python
# 泛型类型变量
from typing import TypeVar

T = TypeVar("T")

def first(items: list[T]) -> T:
    return items[0]
```

**基本写法：带约束**
`TypeVar("<名称>", <类型1>, <类型2>)`
```python
# 限定类型取值范围
T = TypeVar("T", int, float)

def add(a: T, b: T) -> T:
    return a + b
```

**基本写法：bound 上界**
`TypeVar("<名称>", bound=<类型>)`
```python
# 上界约束
T = TypeVar("T", bound=str)

def upper(x: T) -> T:
    return x.upper()
```

**基本写法：TypeVar 默认值（3.13+）**
`TypeVar("<名称>", default=<类型>)`
```python
# 类型参数默认值
T = TypeVar("T", default=int)

def value(x: T = 0) -> T:
    return x
```

---

## ParamSpec 参数规格

**基本写法：定义 ParamSpec**
`P = ParamSpec("<名称>")`
```python
# 捕获可调用对象的参数规格
from typing import ParamSpec, TypeVar, Callable

P = ParamSpec("P")
R = TypeVar("R")

def logged(func: Callable[P, R]) -> Callable[P, R]:
    def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
        return func(*args, **kwargs)
    return wrapper
```

---

## TypeVarTuple 可变泛型

**基本写法：定义 TypeVarTuple**
`Ts = TypeVarTuple("<名称>")`
```python
# 可变长度类型变量元组
from typing import TypeVarTuple, Unpack

Ts = TypeVarTuple("Ts")

def first(x: tuple[*Ts]) -> tuple[*Ts]:
    return x
```

---

## TypeAlias 类型别名

**基本写法：类型别名**
`type <别名> = <类型>`
```python
# Python 3.12 新语法
type Vector = list[float]

def norm(v: Vector) -> float:
    return sum(x * x for x in v) ** 0.5
```

**基本写法：泛型别名**
`type <别名>[<参数>] = <类型>`
```python
# 带类型参数的别名
type Pair[T] = tuple[T, T]

def make(x: int) -> Pair[int]:
    return (x, x)
```

---

## TypeGuard 与 TypeIs 类型 narrowing

**基本写法：TypeGuard**
`TypeGuard[<类型>]`
```python
# 自定义类型守卫
from typing import TypeGuard

def is_str_list(val: list) -> TypeGuard[list[str]]:
    return all(isinstance(x, str) for x in val)

def process(val: list):
    if is_str_list(val):
        return [x.upper() for x in val]
```

**基本写法：TypeIs（3.13+）**
`TypeIs[<类型>]`
```python
# TypeIs 提供更直观的双向 narrowing
from typing import TypeIs

def is_int(x: object) -> TypeIs[int]:
    return isinstance(x, int)
```

---

## overload 函数重载

**基本写法：overload 装饰器**
`@overload`
```python
# 函数重载签名
from typing import overload

@overload
def parse(x: int) -> str: ...
@overload
def parse(x: str) -> int: ...
def parse(x):
    if isinstance(x, int):
        return str(x)
    return int(x)
```

---

## Generic 泛型类

**基本写法：Generic 类**
`class <类>(Generic[T]):`
```python
# 泛型容器
from typing import Generic, TypeVar

T = TypeVar("T")

class Stack(Generic[T]):
    def __init__(self):
        self._items: list[T] = []
    def push(self, item: T) -> None:
        self._items.append(item)
    def pop(self) -> T:
        return self._items.pop()
```

**基本写法：PEP 695 泛型语法（3.12+）**
`class <类>[T]:`
```python
# 新语法无需 TypeVar
class Stack[T]:
    def __init__(self):
        self._items: list[T] = []
    def push(self, item: T) -> None:
        self._items.append(item)
```

---

## Never 与 NoReturn

**基本写法：NoReturn**
`def <函数>() -> NoReturn:`
```python
# 表示函数永不返回
from typing import NoReturn

def fatal() -> NoReturn:
    raise SystemExit(1)
```

**基本写法：Never**
`def <函数>() -> Never:`
```python
# Never 表示永不产生值（3.11+）
from typing import Never

def unreachable() -> Never:
    raise RuntimeError
```

---

## override 装饰器（3.12+）

**基本写法：标记覆盖**
`@typing.override`
```python
# 标记方法覆盖父类方法
from typing import override

class Base:
    def run(self): pass

class Sub(Base):
    @override
    def run(self):
        print("子类实现")
```
