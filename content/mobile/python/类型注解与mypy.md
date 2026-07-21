# 类型注解与mypy

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

## 基本类型注解

**基本写法：变量类型注解**
`<变量>: <类型> = <值>`

```python
# 变量类型注解
name: str = "Alice"
age: int = 30
height: float = 1.75
is_active: bool = True
```

---

**基本写法：函数参数类型注解**
`def <函数名>(<参数>: <类型>): <语句>`

```python
# 函数参数类型注解
def greet(name: str) -> str:
    return f"Hello, {name}!"
```

---

**基本写法：函数返回值类型注解**
`def <函数名>(<参数>) -> <返回类型>: <语句>`

```python
# 函数返回值类型注解
def add(a: int, b: int) -> int:
    return a + b
```

---

## 复合类型注解

**基本写法：列表类型注解**
`from typing import List`
`<变量>: List[<元素类型>] = <值>`

```python
# 列表类型注解
from typing import List
numbers: List[int] = [1, 2, 3]
names: List[str] = ["Alice", "Bob"]
```

---

**基本写法：字典类型注解**
`from typing import Dict`
`<变量>: Dict[<键类型>, <值类型>] = <值>`

```python
# 字典类型注解
from typing import Dict
user: Dict[str, int] = {"age": 30, "score": 95}
```

---

**基本写法：元组类型注解**
`from typing import Tuple`
`<变量>: Tuple[<类型1>, <类型2>] = <值>`

```python
# 元组类型注解
from typing import Tuple
point: Tuple[int, int] = (3, 4)
```

---

**基本写法：集合类型注解**
`from typing import Set`
`<变量>: Set[<元素类型>] = <值>`

```python
# 集合类型注解
from typing import Set
unique_numbers: Set[int] = {1, 2, 3}
```

---

## Optional 类型

**基本写法：使用 Optional 类型**
`from typing import Optional`
`<变量>: Optional[<类型>] = <值>`

```python
# Optional 类型注解（表示值可以为 None）
from typing import Optional
def find_user(user_id: int) -> Optional[dict]:
    if user_id == 1:
        return {"name": "Alice"}
    return None
```

---

## Union 类型

**基本写法：使用 Union 类型**
`from typing import Union`
`<变量>: Union[<类型1>, <类型2>] = <值>`

```python
# Union 类型注解（表示值可以是多种类型之一）
from typing import Union
def process(data: Union[str, bytes]) -> str:
    if isinstance(data, bytes):
        return data.decode()
    return data
```

---

**基本写法：使用管道符（Python 3.10+）**
`<变量>: <类型1> | <类型2> = <值>`

```python
# 使用管道符表示联合类型
def process(data: str | bytes) -> str:
    if isinstance(data, bytes):
        return data.decode()
    return data
```

---

## Any 类型

**基本写法：使用 Any 类型**
`from typing import Any`
`<变量>: Any = <值>`

```python
# Any 类型注解（表示任意类型）
from typing import Any
data: Any = "hello"
data = 123
```

---

## Callable 类型

**基本写法：使用 Callable 类型**
`from typing import Callable`
`<变量>: Callable[[<参数类型>], <返回类型>] = <函数>`

```python
# Callable 类型注解（表示可调用对象）
from typing import Callable
def apply(func: Callable[[int], int], value: int) -> int:
    return func(value)
```

---

**基本写法：Callable 无参数**
`<变量>: Callable[[], <返回类型>] = <函数>`

```python
# Callable 无参数类型注解
from typing import Callable
callback: Callable[[], None] = lambda: print("Hello")
```

---

## 泛型类型

**换行写法：定义泛型类**
`from typing import TypeVar, Generic`
`T = TypeVar("T")`
`class <类名>(Generic[T]):`
`    def <方法>(self, <参数>: T) -> T: <语句>`

```python
# 定义泛型类
from typing import TypeVar, Generic

T = TypeVar("T")

class Stack(Generic[T]):
    def __init__(self):
        self.items: list[T] = []

    def push(self, item: T) -> None:
        self.items.append(item)

    def pop(self) -> T:
        return self.items.pop()
```

---

**换行写法：定义泛型函数**
`from typing import TypeVar`
`T = TypeVar("T")`
`def <函数名>(<参数>: T) -> T: <语句>`

```python
# 定义泛型函数
from typing import TypeVar

T = TypeVar("T")

def first(items: list[T]) -> T:
    return items[0]
```

---

## TypeVar 约束

**基本写法：带约束的 TypeVar**
`T = TypeVar("T", <类型1>, <类型2>)`

```python
# 带约束的 TypeVar（限制为指定类型之一）
from typing import TypeVar

T = TypeVar("T", int, float)

def add(a: T, b: T) -> T:
    return a + b
```

---

**基本写法：带边界的 TypeVar**
`T = TypeVar("T", bound=<类型>)`

```python
# 带边界的 TypeVar（限制为指定类型及其子类）
from typing import TypeVar

class Animal:
    def speak(self) -> str:
        return "sound"

T = TypeVar("T", bound=Animal)

def make_speak(animal: T) -> str:
    return animal.speak()
```

---

## TypedDict

**换行写法：定义 TypedDict**
`from typing import TypedDict`
`class <TypedDict类>(TypedDict):`
`    <字段1>: <类型>`
`    <字段2>: <类型>`

```python
# 定义 TypedDict（类型安全的字典）
from typing import TypedDict

class User(TypedDict):
    name: str
    age: int
    email: str
```

---

**基本写法：使用 TypedDict**
`<变量>: <TypedDict类> = {<字段>: <值>}`

```python
# 使用 TypedDict
user: User = {"name": "Alice", "age": 30, "email": "alice@example.com"}
```

---

## Literal 类型

**基本写法：使用 Literal 类型**
`from typing import Literal`
`<变量>: Literal[<值1>, <值2>] = <值>`

```python
# Literal 类型注解（限制为特定字面量值）
from typing import Literal

def set_mode(mode: Literal["read", "write", "append"]) -> None:
    print(f"模式: {mode}")
```

---

## Final 类型

**基本写法：使用 Final 类型**
`from typing import Final`
`<变量>: Final[<类型>] = <值>`

```python
# Final 类型注解（表示常量，不可重新赋值）
from typing import Final
MAX_SIZE: Final[int] = 100
```

---

## ClassVar 类型

**基本写法：使用 ClassVar 类型**
`from typing import ClassVar`
`<属性>: ClassVar[<类型>] = <值>`

```python
# ClassVar 类型注解（表示类变量而非实例变量）
from typing import ClassVar

class MyClass:
    count: ClassVar[int] = 0
    name: str = "default"
```

---

## Protocol 类型

**换行写法：定义 Protocol**
`from typing import Protocol`
`class <Protocol名>(Protocol):`
`    def <方法>(self, <参数>) -> <返回类型>: ...`

```python
# 定义 Protocol（结构化子类型）
from typing import Protocol

class Drawable(Protocol):
    def draw(self) -> None:
        ...

def render(obj: Drawable) -> None:
    obj.draw()
```

---

## 类型别名

**基本写法：定义类型别名**
`<别名> = <类型>`

```python
# 定义类型别名
Vector = list[float]
Matrix = list[Vector]

def create_vector() -> Vector:
    return [1.0, 2.0, 3.0]
```

---

**基本写法：使用 TypeAlias**
`from typing import TypeAlias`
`<别名>: TypeAlias = <类型>`

```python
# 使用 TypeAlias 显式声明类型别名
from typing import TypeAlias
UserId: TypeAlias = int
UserName: TypeAlias = str
```

---

## NewType

**基本写法：使用 NewType 创建新类型**
`from typing import NewType`
`<新类型> = NewType("<新类型名>", <基础类型>)`

```python
# 使用 NewType 创建新类型
from typing import NewType
UserId = NewType("UserId", int)

def get_user(user_id: UserId) -> str:
    return f"User {user_id}"
```

---

## mypy 配置

**基本写法：创建 mypy.ini 配置文件**
`[mypy]`
`python_version = <版本>`
`strict = <布尔值>`

```python
# mypy.ini 配置文件
# [mypy]
# python_version = 3.11
# strict = True
# warn_return_any = True
# warn_unused_configs = True
```

---

**基本写法：使用 pyproject.toml 配置**
`[tool.mypy]`
`python_version = "<版本>"`

```python
# pyproject.toml 中的 mypy 配置
# [tool.mypy]
# python_version = "3.11"
# strict = true
# disallow_untyped_defs = true
```

---

## 运行 mypy

**基本写法：运行 mypy 检查**
`mypy <文件或目录>`

```python
# 运行 mypy 检查 Python 文件
# 命令行执行：mypy script.py
```

---

**基本写法：运行 mypy 严格模式**
`mypy --strict <文件>`

```python
# 运行 mypy 严格模式
# 命令行执行：mypy --strict script.py
```

---

**基本写法：忽略特定错误**
`# type: ignore`

```python
# 忽略类型检查错误
result = some_untyped_function()  # type: ignore
```

---

**基本写法：忽略特定错误码**
`# type: ignore[<错误码>]`

```python
# 忽略特定错误码
result = some_function()  # type: ignore[no-untyped-call]
```

---

## 类型注解进阶

**基本写法：使用 Type 获取类型**
`from typing import Type`
`def <函数>(<参数>: Type[<类>]) -> <语句>`

```python
# 使用 Type 注解表示类本身
from typing import Type

class Animal:
    @classmethod
    def create(cls) -> "Animal":
        return cls()

def factory(cls: Type[Animal]) -> Animal:
    return cls.create()
```

---

**基本写法：使用 TypeGuard**
`from typing import TypeGuard`
`def <函数>(<参数>: <类型>) -> TypeGuard[<目标类型>]: <语句>`

```python
# 使用 TypeGuard 定义类型守卫
from typing import TypeGuard

def is_string_list(items: list) -> TypeGuard[list[str]]:
    return all(isinstance(item, str) for item in items)
```

---

**基本写法：使用 ParamSpec**
`from typing import ParamSpec`
`P = ParamSpec("P")`

```python
# 使用 ParamSpec 传递参数签名
from typing import ParamSpec, TypeVar, Callable

P = ParamSpec("P")
R = TypeVar("R")

def decorator(func: Callable[P, R]) -> Callable[P, R]:
    def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
        return func(*args, **kwargs)
    return wrapper
```

---

**基本写法：使用 Concatenate**
`from typing import Concatenate`
`def <函数>(<参数>: Callable[Concatenate[<类型>, P], R]): <语句>`

```python
# 使用 Concatenate 在参数签名前添加参数
from typing import Concatenate, ParamSpec, TypeVar, Callable

P = ParamSpec("P")
R = TypeVar("R")

def with_context(func: Callable[Concatenate[str, P], R]) -> Callable[P, R]:
    def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
        return func("context", *args, **kwargs)
    return wrapper
```

---

## 类型注解与 dataclass

**换行写法：带类型注解的 dataclass**
`from dataclasses import dataclass`
`@dataclass`
`class <类名>:`
`    <字段1>: <类型>`
`    <字段2>: <类型> = <默认值>`

```python
# 带类型注解的 dataclass
from dataclasses import dataclass

@dataclass
class User:
    name: str
    age: int
    email: str = ""
    active: bool = True
```

---

## 类型注解与 Pydantic

**换行写法：使用 Pydantic 模型**
`from pydantic import BaseModel`
`class <模型名>(BaseModel):`
`    <字段1>: <类型>`
`    <字段2>: <类型>`

```python
# 使用 Pydantic 定义数据模型
from pydantic import BaseModel

class User(BaseModel):
    name: str
    age: int
    email: str
```

---

**基本写法：使用 Pydantic 验证**
`<模型>(**<字典>)`

```python
# 使用 Pydantic 进行数据验证
data = {"name": "Alice", "age": 30, "email": "alice@example.com"}
user = User(**data)
```

---

## 异步类型注解

**换行写法：异步函数类型注解**
`from typing import Coroutine, Any`
`async def <函数>(<参数>: <类型>) -> <返回类型>: <语句>`

```python
# 异步函数类型注解
import asyncio

async def fetch_data(url: str) -> str:
    await asyncio.sleep(1)
    return f"Data from {url}"
```

---

**基本写法：Awaitable 类型注解**
`from typing import Awaitable`
`<变量>: Awaitable[<类型>] = <协程>`

```python
# Awaitable 类型注解
from typing import Awaitable

def get_fetcher() -> Awaitable[str]:
    return fetch_data("https://example.com")
```

---

**基本写法：AsyncIterator 类型注解**
`from typing import AsyncIterator`
`async def <函数>() -> AsyncIterator[<类型>]: <语句>`

```python
# AsyncIterator 类型注解
from typing import AsyncIterator

async def async_range(n: int) -> AsyncIterator[int]:
    for i in range(n):
        yield i
        await asyncio.sleep(0.1)
```

---

## 类型注解最佳实践

**基本写法：为所有函数添加类型注解**
`def <函数名>(<参数>: <类型>) -> <返回类型>: <语句>`

```python
# 为所有函数添加类型注解
def calculate_total(prices: list[float], tax_rate: float) -> float:
    subtotal = sum(prices)
    return subtotal * (1 + tax_rate)
```

---

**基本写法：使用 NoReturn 表示不返回**
`from typing import NoReturn`
`def <函数>(<参数>) -> NoReturn: <语句>`

```python
# 使用 NoReturn 表示函数不返回
from typing import NoReturn

def raise_error(message: str) -> NoReturn:
    raise ValueError(message)
```

---

**基本写法：使用 overload 重载**
`from typing import overload`
`@overload`
`def <函数>(<参数>: <类型1>) -> <返回类型1>: ...`

```python
# 使用 overload 定义函数重载
from typing import overload

@overload
def process(data: int) -> int: ...

@overload
def process(data: str) -> str: ...

def process(data):
    if isinstance(data, int):
        return data * 2
    return data.upper()
```

---

## Python 3.13+ 类型系统增强

**基本写法：TypeIs 缩窄类型（Python 3.13）**
`from typing import TypeIs`
`def <函数>(<参数>: <类型>) -> TypeIs[<目标类型>]: <语句>`

```python
# Python 3.13 TypeIs 类型缩窄（双向缩窄,比 TypeGuard 更严格）
from typing import TypeIs

def is_str_list(items: list) -> TypeIs[list[str]]:
    return all(isinstance(item, str) for item in items)
```

---

**基本写法：ReadOnly 类型限定符（Python 3.13）**
`from typing import ReadOnly`
`<属性>: ReadOnly[<类型>]`

```python
# Python 3.13 ReadOnly 类型限定符（标记 TypedDict 只读字段,禁止写入）
from typing import TypedDict, ReadOnly

class User(TypedDict):
    name: ReadOnly[str]
    age: int
```

---

**基本写法：deprecated 装饰器（Python 3.13）**
`from warnings import deprecated`
`@deprecated("<弃用说明>")`
`def <函数>() -> <返回类型>: <语句>`

```python
# Python 3.13 deprecated 装饰器（标记弃用函数,调用时触发 DeprecationWarning）
from warnings import deprecated

@deprecated("use new_function() instead")
def old_function() -> None:
    print("old")
```

---

**基本写法：PEP 695 类型别名语句**
`type <别名> = <类型>`

```python
# PEP 695 类型别名语句（原生语法,无需 typing.TypeAlias）
type Point = tuple[float, float]
type Vector = list[float]

def origin() -> Point:
    return (0.0, 0.0)
```

---

**基本写法：PEP 695 泛型类新语法**
`class <类名>[<类型参数>]:`
`    def <方法>(self, <参数>: <类型参数>) -> <类型参数>: <语句>`

```python
# PEP 695 泛型类新语法（无需显式声明 TypeVar 和 Generic）
class Stack[T]:
    def __init__(self) -> None:
        self.items: list[T] = []

    def push(self, item: T) -> None:
        self.items.append(item)

    def pop(self) -> T:
        return self.items.pop()
```

---

**基本写法：Python 3.14 deferred annotations 求值**
`<变量>: <前向引用类型> = <值>`
`class <类名>:`
`    <属性>: <前向引用类型> = <值>`

```python
# Python 3.14 deferred annotations 延迟求值（注解默认延迟,访问 __annotations__ 时才求值）
# 无需 from __future__ import annotations 即可使用前向引用
class Node:
    next: Node | None = None

def build() -> Node:
    return Node()
```
