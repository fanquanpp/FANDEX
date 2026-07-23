---
order: 110
title: 类型注解与mypy
module: python
category: 'dev-lang'
difficulty: advanced
description: Python类型注解与mypy详解：typing模块、泛型、Protocol、TypeVar、Literal、TypedDict与渐进式类型系统。
author: fanquanpp
updated: '2026-07-21'
related:
  - python/数据类与字段默认值
  - python/装饰器进阶
  - python/描述符
  - python/打包与发布
  - python/Python与测试
  - python/Python与代码质量
prerequisites:
  - python/语法速查
  - python/面向对象编程
  - python/描述符
---

## 概述

Python 类型注解（Type Hints）是 Python 3.0 以来最重要的语言演进之一。它改变了 Python 作为"动态类型语言"的传统定位，引入了一套"渐进式类型系统"（Gradual Typing System），让开发者可以在保留动态类型灵活性的同时，获得静态类型检查的工程收益。

PEP 484（Type Hints，2014）奠定了类型注解的标准语法与语义，随后 PEP 526、PEP 544、PEP 585、PEP 586、PEP 589、PEP 604、PEP 612、PEP 646、PEP 673、PEP 675、PEP 695、PEP 696、PEP 698、PEP 702 等一系列 PEP 不断扩展类型系统的表达能力。mypy 作为 PEP 484 的参考实现，是 Python 类型检查生态的旗舰工具，与 pyright、pytype、pyre 共同构成 Python 静态类型检查的工具矩阵。

本篇文档将系统论述 Python 类型注解的语法、语义、类型系统理论、mypy 工程实践、与第三方库（Pydantic、TypedDict、dataclasses）的协作、性能分析、陷阱与反模式、真实案例研究等。目标是让读者从理论、语法、工具、工程四个维度全面掌握 Python 类型系统。

## 1. 学习目标

本篇采用 Bloom 分类法按认知层级组织学习目标。

### 1.1 记忆层（Remember）

学习者能够准确复述以下事实性知识：

- Python 类型注解由 PEP 484 引入，标准语法为 `def f(x: int) -> str:`。
- `typing` 模块提供 `List`、`Dict`、`Tuple`、`Set`、`Optional`、`Union`、`Callable`、`TypeVar`、`Generic`、`Protocol`、`Literal`、`TypedDict`、`Final`、`ClassVar`、`NewType`、`Any`、`Never`、`NoReturn` 等核心类型。
- Python 3.9+ 支持内置泛型（如 `list[int]`、`dict[str, int]`），无需导入 `typing.List`。
- Python 3.10+ 支持 `X | Y` 联合类型语法，等价于 `Union[X, Y]`。
- Python 3.12+ 引入 PEP 695 类型参数语法，支持 `def f[T](x: T) -> T:` 与 `class C[T]:`。
- mypy 是 PEP 484 的参考实现，由 Jukka Lehtosalo 开发。
- 类型注解在运行时不强制执行，仅由静态检查工具（mypy、pyright）验证。
- `from __future__ import annotations` 使注解延迟求值（PEP 563）。

### 1.2 理解层（Understand）

学习者能够用自己的语言解释以下概念：

- 渐进式类型系统（Gradual Typing）的核心思想：允许部分代码有类型，部分代码无类型。
- 子类型（Subtyping）与 номинальное（Nominal）子类型、结构化（Structural）子类型的区别。
- 协变（Covariance）、逆变（Contravariance）、不变（Invariance）的形式化定义。
- `Any` 与 `object` 的区别：`Any` 关闭类型检查，`object` 接受任意值但限制操作。
- `TypeVar`、`Generic`、`Protocol` 三者的关系与适用场景。
- `mypy` 的类型推断算法：局部推断、双向推断（bidirectional inference）。
- `@overload` 装饰器的作用：为同一函数提供多个类型签名。

### 1.3 应用层（Apply）

学习者能够在真实工程场景中：

- 为现有 Python 项目添加类型注解，并通过 mypy 严格模式检查。
- 使用 `TypeVar` 与 `Generic` 实现类型安全的泛型容器与函数。
- 使用 `Protocol` 实现"鸭子类型"的静态化，避免继承耦合。
- 使用 `TypedDict` 为字典数据结构添加类型约束。
- 使用 `Literal` 类型约束字符串或字面值，实现字面值类型安全。
- 配置 mypy（`mypy.ini` 或 `pyproject.toml`），适配大型项目的渐进式迁移。

### 1.4 分析层（Analyze）

学习者能够剖析：

- 同一段代码在 `Any`、`object`、`Protocol` 三种类型约束下的安全性差异。
- mypy 的类型推断失败案例，分析根因并给出修复方案。
- 类型注解对运行时性能的影响（注解求值开销、`from __future__ import annotations` 的优化）。
- Pydantic v2 如何在类型注解基础上构建运行时校验系统。
- TypeScript 与 Python 类型系统的异同：结构化 vs 名义、严格模式、推断能力。

### 1.5 评价层（Evaluate）

学习者能够评价：

- 在给定项目中，是否值得引入类型注解？引入到什么程度？
- mypy、pyright、pytype、pyre 四个工具的选型权衡。
- 一段类型注解的精度与可读性是否平衡？是否过度使用复杂类型？
- `Any` 的使用是否合理？是否有更精确的替代方案？

### 1.6 创造层（Create）

学习者能够：

- 设计一套企业级类型注解规范，覆盖命名、精度、Protocol 使用、TypedDict 使用等。
- 构建自定义 mypy 插件，实现业务特定的类型检查规则。
- 基于类型注解实现运行时校验库（类似 Pydantic）。
- 设计类型安全的领域模型，使用 `Literal`、`TypedDict`、`Protocol` 表达业务约束。

## 2. 历史动机与背景

### 2.1 动态类型的双刃剑

Python 作为动态类型语言，其灵活性是早期快速发展的关键。但随项目规模扩大，动态类型的代价逐渐显现：

1. **重构困难**：修改函数签名后，调用处的错误只能在运行时暴露。
2. **API 文档缺失**：函数参数与返回值类型不明确，开发者需阅读实现才能理解。
3. **IDE 智能补全受限**：IDE 难以提供精确的属性与方法补全。
4. **大型项目维护成本高**：Dropbox、Google 等公司在百万行级 Python 代码中遇到严重的维护问题。

### 2.2 渐进式类型系统的提出

Jeremy Siek 与 Walid Taha 在 2006 年的论文"Gradual Typing for Functional Languages"中首次提出渐进式类型系统的概念。其核心思想是：

- 允许代码中部分有类型，部分无类型。
- 有类型与无类型代码可以无缝互操作。
- 类型检查是可选的，不强制全量启用。

这一思想完美契合 Python 的实际情况：既有大量遗留无类型代码，又希望新代码获得类型安全。PEP 484 借鉴了渐进式类型系统理论，定义了 Python 类型注解的标准。

### 2.3 PEP 演进时间线

| PEP | 年份 | 标题 | 核心内容 |
|-----|------|------|----------|
| PEP 3107 | 2006 | Function Annotations | 引入函数注解语法 `def f(x: int):` |
| PEP 484 | 2014 | Type Hints | 定义类型注解标准与 `typing` 模块 |
| PEP 526 | 2016 | Syntax for Variable Annotations | 变量注解语法 `x: int = 0` |
| PEP 544 | 2018 | Protocols | 结构化子类型（Protocol） |
| PEP 561 | 2018 | Distributing Type Information | 包的类型信息分发（py.typed） |
| PEP 563 | 2017 | Postponed Evaluation of Annotations | 延迟注解求值 |
| PEP 585 | 2019 | Type Hinting Generics In Standard Collections | 内置泛型 `list[int]` |
| PEP 586 | 2019 | Literal Types | 字面值类型 `Literal['a', 'b']` |
| PEP 589 | 2019 | TypedDict | 字典类型约束 |
| PEP 591 | 2019 | Final | `Final` 修饰符 |
| PEP 604 | 2020 | Complementary syntax for Unions | `X \| Y` 联合类型 |
| PEP 612 | 2020 | Parameter Specification Variables | `ParamSpec` |
| PEP 613 | 2020 | Explicit Type Aliases | `TypeAlias` |
| PEP 646 | 2021 | Variadic Generics | `TypeVarTuple`、`*Ts` |
| PEP 673 | 2021 | Self Type | `Self` 类型 |
| PEG 675 | 2022 | Arbitrary Literal String Type | `LiteralString` |
| PEP 681 | 2022 | Data Class Transform | `@dataclass_transform` |
| PEP 692 | 2023 | TypedDict for `**kwargs` | `Unpack[TypedDict]` |
| PEP 695 | 2023 | Type Parameter Syntax | `def f[T](x: T) -> T:` |
| PEP 696 | 2024 | Type Defaults for TypeVarLike | `TypeVar` 默认值 |
| PEP 698 | 2024 | `@override` | 覆盖检查装饰器 |
| PEP 702 | 2024 | `@deprecated` | 弃用标记装饰器 |

### 2.4 mypy 的诞生与演进

mypy 由 Jukka Lehtosalo 在剑桥大学攻读博士期间开发，最初是一种带类型推断的 Python 方言。2012 年起，mypy 重新定位为标准 Python 的静态类型检查器，成为 PEP 484 的参考实现。

Dropbox 是 mypy 的早期主要赞助商，其 Python 代码库约 400 万行，mypy 帮助 Dropbox 显著降低了运行时错误率。随后 Google、Microsoft、Meta 等公司均在其 Python 项目中采用类型注解。

### 2.5 类型检查工具生态

| 工具 | 开发者 | 实现语言 | 特点 |
|------|--------|----------|------|
| mypy | Jukka Lehtosalo | Python | PEP 484 参考实现，生态成熟 |
| pyright | Microsoft | TypeScript | 性能极快，VSCode 默认 |
| pytype | Google | Python | 类型推断能力强，适合遗留代码 |
| pyre | Meta | OCaml | 性能极快，支持增量检查 |
| pylance | Microsoft | TypeScript | pyright 的 LSP 封装 |

## 3. 形式化定义

### 3.1 类型系统的形式化定义

类型系统（Type System）是一个由类型规则组成的系统，用于在编译时或运行时检查程序的类型正确性。形式化定义为：

$$
\text{TypeSystem} = (\text{Types}, \text{Terms}, \text{Rules}, \vdash)
$$

其中：
- $\text{Types}$ 是类型的集合。
- $\text{Terms}$ 是程序的语法项。
- $\text{Rules}$ 是类型规则（typing rules）。
- $\vdash$ 是类型判断关系，$\Gamma \vdash e : T$ 表示在环境 $\Gamma$ 下，表达式 $e$ 的类型为 $T$。

### 3.2 子类型关系的形式化定义

子类型关系 $\sqsubseteq$ 满足以下性质：

1. 自反性：$T \sqsubseteq T$
2. 传递性：若 $T_1 \sqsubseteq T_2$ 且 $T_2 \sqsubseteq T_3$，则 $T_1 \sqsubseteq T_3$

子类型关系的判断规则：

$$
\frac{\Gamma \vdash e : T_1 \quad T_1 \sqsubseteq T_2}{\Gamma \vdash e : T_2} \text{(Subsumption)}
$$

### 3.3 名义子类型 vs 结构子类型

**名义子类型（Nominal Subtyping）**：子类型关系由显式声明决定。

$$
\text{class } B(\text{A}): \ldots \implies B \sqsubseteq_{\text{nominal}} A
$$

Python 默认采用名义子类型：`class Dog(Animal)` 声明 `Dog` 是 `Animal` 的子类型。

**结构子类型（Structural Subtyping）**：子类型关系由结构（属性与方法）决定。

$$
B \sqsubseteq_{\text{structural}} A \iff \forall m \in \text{members}(A): m \in \text{members}(B) \land \text{type}(m, B) \sqsubseteq \text{type}(m, A)
$$

Python 通过 `Protocol`（PEP 544）支持结构子类型。

### 3.4 协变、逆变与不变

设 $F$ 是类型构造子（如 `List`、`Callable`）。

**协变（Covariance）**：

$$
T_1 \sqsubseteq T_2 \implies F[T_1] \sqsubseteq F[T_2]
$$

**逆变（Contravariance）**：

$$
T_1 \sqsubseteq T_2 \implies F[T_2] \sqsubseteq F[T_1]
$$

**不变（Invariance）**：

$$
T_1 \sqsubseteq T_2 \not\implies F[T_1] \sqsubseteq F[T_2] \land F[T_2] \sqsubseteq F[T_1]
$$

Python 中：
- `List[T]` 是不变的（因可变容器）。
- `Tuple[T, ...]` 是协变的（因不可变）。
- `Callable[[T], R]` 的参数 `T` 是逆变的，返回值 `R` 是协变的。
- `TypeVar('T', covariant=True)` 声明协变 TypeVar。
- `TypeVar('T', contravariant=True)` 声明逆变 TypeVar。

### 3.5 渐进式类型系统的形式化

渐进式类型系统引入 `Any` 类型，与任意类型双向兼容：

$$
\forall T: \text{Any} \sqsubseteq T \land T \sqsubseteq \text{Any}
$$

这意味着 `Any` 类型的值可以赋给任意类型变量，任意类型变量也可赋给 `Any` 类型变量。`Any` 是类型检查的"逃生舱"（escape hatch），但滥用会削弱类型安全性。

`object` 与 `Any` 的区别：`object` 是所有类型的顶层超类型（top type），但接受 `object` 类型的变量后，只能调用 `object` 自身的方法（如 `__str__`、`__eq__`）。`Any` 则允许任意操作，不进行类型检查。

## 4. 理论推导

### 4.1 mypy 的类型推断算法

mypy 使用局部类型推断（local type inference）与双向类型检查（bidirectional type checking）相结合的策略。

**局部类型推断**：

对于无显式注解的变量，mypy 根据赋值表达式推断类型：

```python
x = 42  # mypy 推断 x: int
y = [1, 2, 3]  # mypy 推断 y: list[int]
z = []  # mypy 推断 z: list[Any]，需显式注解以更精确
```

**双向类型检查**：

在期望类型已知时，mypy 使用期望类型指导推断：

```python
def f(x: int) -> int:
    return x

# 期望返回 int，mypy 检查 return x 的类型是否为 int
```

### 4.2 协变与逆变的推导

为什么 `List[T]` 是不变的？考虑以下反例：

```python
# 假设 List[int] 是 List[object] 的子类型（协变）
def append_bad(lst: list[object]) -> None:
    lst.append('hello')  # 危险！

ints: list[int] = [1, 2, 3]
append_bad(ints)  # 若协变，类型检查通过
# 但此时 ints = [1, 2, 3, 'hello']，类型被破坏！
```

因此，可变容器必须是不变的。

为什么 `Tuple[T, ...]` 是协变的？元组不可变，无法添加元素，因此不存在上述破坏类型的方式。

为什么 `Callable[[T], R]` 的参数 `T` 是逆变的？考虑：

```python
# 假设 Callable[[Animal], None] 是 Callable[[Dog], None] 的子类型（协变）
def handle_animal(a: Animal) -> None:
    ...

# 若协变，handle_animal 可赋给 Callable[[Dog], None]
callback: Callable[[Dog], None] = handle_animal
# 调用 callback(dog) 实际调用 handle_animal(dog)，安全

# 反之若 Callable[[Dog], None] 是 Callable[[Animal], None] 的子类型（错误）
def handle_dog(d: Dog) -> None:
    ...

callback: Callable[[Animal], None] = handle_dog  # 类型检查通过
callback(animal)  # 实际调用 handle_dog(animal)，但 animal 可能不是 Dog，崩溃！
```

因此函数参数必须逆变。

### 4.3 Protocol 的结构子类型推导

设 `Protocol P` 定义了方法 `m`：

```python
class P(Protocol):
    def m(self, x: int) -> str: ...
```

类型 `T` 满足 `T <: P` 当且仅当 `T` 具有方法 `m`，且 `m` 的签名兼容：

$$
T \sqsubseteq P \iff \exists m \in \text{methods}(T): \text{signature}(m, T) \sqsubseteq \text{signature}(m, P)
$$

这是结构子类型的核心。Protocol 让 Python 在保留鸭子类型灵活性的同时，获得了静态类型检查的能力。

### 4.4 类型检查的时间复杂度

mypy 的类型检查时间复杂度与代码规模、注解密度、类型复杂度相关。一般而言：

$$
T(n, m) = O(n \cdot m)
$$

其中 $n$ 是代码行数，$m$ 是平均类型复杂度。对于大型项目（百万行），mypy 检查可能耗时数分钟。mypy 提供增量检查（incremental checking）与守护进程模式（daemon mode）以加速。

### 4.5 `from __future__ import annotations` 的语义

PEP 563 引入注解延迟求值。默认情况下，注解在模块加载时求值，可能导致前向引用问题：

```python
class Node:
    # 默认情况下，'Node' 在类定义中不可用
    def set_next(self, next: 'Node') -> None: ...
```

使用 `from __future__ import annotations` 后，所有注解以字符串形式存储，不在加载时求值：

```python
from __future__ import annotations

class Node:
    def set_next(self, next: Node) -> None: ...  # 无需引号
```

这简化了前向引用，但也带来运行时反射的复杂性（`typing.get_type_hints()` 需重新求值）。Python 3.14 计划将此行为设为默认。

## 5. 代码示例

本节提供多个完整可运行的代码示例，覆盖类型注解的核心用法与典型工程场景。

### 5.1 基础类型注解

```python
# 基础类型注解示例：函数参数、返回值、变量

# 函数注解
def greet(name: str, times: int = 1) -> str:
    """生成问候语
    
    Args:
        name: 被问候者姓名
        times: 问候次数
    
    Returns:
        问候字符串
    """
    return ', '.join([f'Hello, {name}!'] * times)


# 变量注解
count: int = 0
name: str = 'Alice'
pi: float = 3.14159
is_active: bool = True

# 容器类型注解（Python 3.9+ 内置泛型）
numbers: list[int] = [1, 2, 3]
mapping: dict[str, int] = {'a': 1, 'b': 2}
pair: tuple[int, str] = (1, 'hello')
triple: tuple[int, str, float] = (1, 'hello', 3.14)
fixed_length: tuple[int, ...] = (1, 2, 3, 4)  # 任意长度

# 集合类型
unique_numbers: set[int] = {1, 2, 3}
frozen: frozenset[str] = frozenset({'a', 'b'})


# Optional 与 Union
from typing import Optional, Union

def find_user(user_id: int) -> Optional[str]:
    """查找用户名，未找到返回 None"""
    users = {1: 'Alice', 2: 'Bob'}
    return users.get(user_id)


def process(value: Union[int, str, float]) -> str:
    """处理多种类型输入"""
    return str(value)


# Python 3.10+ 的 | 语法
def find_user_new(user_id: int) -> str | None:
    return find_user(user_id)


def process_new(value: int | str | float) -> str:
    return str(value)
```

### 5.2 TypeVar 与泛型

```python
# TypeVar 与泛型示例：实现类型安全的容器

from typing import TypeVar, Generic

# 定义类型变量
T = TypeVar('T')
K = TypeVar('K')
V = TypeVar('V')


# 泛型函数
def first(items: list[T]) -> T:
    """返回列表第一个元素，类型与列表元素类型一致"""
    if not items:
        raise IndexError('列表为空')
    return items[0]


def get_value(mapping: dict[K, V], key: K, default: V) -> V:
    """从字典获取值，类型与字典一致"""
    return mapping.get(key, default)


# 泛型类
class Stack(Generic[T]):
    """类型安全的栈
    
    使用 Generic[T] 声明泛型类，
    实例化时指定具体类型，如 Stack[int]()。
    """
    
    def __init__(self) -> None:
        self._items: list[T] = []
    
    def push(self, item: T) -> None:
        """压栈"""
        self._items.append(item)
    
    def pop(self) -> T:
        """弹栈"""
        if not self._items:
            raise IndexError('栈为空')
        return self._items.pop()
    
    def peek(self) -> T:
        """查看栈顶元素"""
        if not self._items:
            raise IndexError('栈为空')
        return self._items[-1]
    
    def __len__(self) -> int:
        return len(self._items)


# 使用泛型类
int_stack: Stack[int] = Stack()
int_stack.push(1)
int_stack.push(2)
print(int_stack.pop())  # 2

str_stack: Stack[str] = Stack()
str_stack.push('hello')
print(str_stack.pop())  # hello

# 类型错误会被 mypy 检测
# int_stack.push('hello')  # mypy 报错：str 不能赋给 int


# 受限 TypeVar
from typing import TypeVar

# TypeVar 的 bound 参数：限制类型必须是指定类的子类
Number = TypeVar('Number', bound='int | float')

def add(a: Number, b: Number) -> Number:
    """两数相加，类型保持一致"""
    return a + b

# TypeVar 的 constraints 参数：限制类型必须是指定类型之一
AnyStr = TypeVar('AnyStr', str, bytes)

def concat(a: AnyStr, b: AnyStr) -> AnyStr:
    """拼接字符串或字节串，类型保持一致"""
    return a + b
```

### 5.3 Protocol 结构化类型

```python
# Protocol 示例：结构化子类型（鸭子类型的静态化）

from typing import Protocol, runtime_checkable


# 定义 Protocol
@runtime_checkable
class Drawable(Protocol):
    """可绘制对象的 Protocol
    
    任何具有 draw() 方法的类型都自动满足此 Protocol，
    无需显式继承。
    """
    def draw(self) -> None: ...


@runtime_checkable
class Comparable(Protocol):
    """可比较对象的 Protocol"""
    def __lt__(self, other: 'Comparable') -> bool: ...


# 实现类（无需显式继承 Protocol）
class Circle:
    """圆形"""
    def __init__(self, radius: float):
        self.radius = radius
    
    def draw(self) -> None:
        print(f'绘制圆形，半径 {self.radius}')


class Square:
    """方形"""
    def __init__(self, side: float):
        self.side = side
    
    def draw(self) -> None:
        print(f'绘制方形，边长 {self.side}')


class TextLabel:
    """文本标签（无 draw 方法，不满足 Drawable）"""
    def __init__(self, text: str):
        self.text = text


# 使用 Protocol 作为类型注解
def render_all(items: list[Drawable]) -> None:
    """渲染所有可绘制对象"""
    for item in items:
        item.draw()


# 测试
shapes: list[Drawable] = [Circle(5.0), Square(3.0)]
render_all(shapes)


# 排序示例
def sort_items(items: list[Comparable]) -> list[Comparable]:
    """对可比较对象排序"""
    return sorted(items)


# runtime_checkable 允许使用 isinstance 检查
print(isinstance(Circle(1.0), Drawable))  # True
print(isinstance(TextLabel('hi'), Drawable))  # False
```

### 5.4 TypedDict 字典类型

```python
# TypedDict 示例：为字典添加类型约束

from typing import TypedDict, Required, NotRequired


# 基础 TypedDict
class UserInfo(TypedDict):
    """用户信息字典类型
    
    所有字段都是必需的。
    """
    id: int
    name: str
    email: str


# 使用
user: UserInfo = {
    'id': 1,
    'name': 'Alice',
    'email': 'alice@example.com',
}

# 类型检查
# user['id'] = 'abc'  # mypy 报错：str 不能赋给 int


# 可选字段（Python 3.11+）
class UserOptional(TypedDict, total=False):
    """所有字段都是可选的"""
    id: int
    name: str
    email: str


# 混合必需与可选字段（Python 3.11+）
class UserMixed(TypedDict):
    """混合字段"""
    id: Required[int]
    name: Required[str]
    email: NotRequired[str]
    age: NotRequired[int]


# 函数式语法
Point2D = TypedDict('Point2D', {'x': int, 'y': int})
p: Point2D = {'x': 1, 'y': 2}


# 嵌套 TypedDict
class Address(TypedDict):
    city: str
    street: str
    zip_code: str


class UserWithAddress(TypedDict):
    id: int
    name: str
    address: Address


user_with_addr: UserWithAddress = {
    'id': 1,
    'name': 'Alice',
    'address': {
        'city': 'Beijing',
        'street': 'Main St',
        'zip_code': '100000',
    },
}


# 在函数签名中使用
def create_user(data: UserInfo) -> UserWithAddress:
    """创建带地址的用户"""
    return {
        'id': data['id'],
        'name': data['name'],
        'address': {
            'city': 'Unknown',
            'street': 'Unknown',
            'zip_code': '000000',
        },
    }
```

### 5.5 Literal 字面值类型

```python
# Literal 类型示例：约束字符串或字面值

from typing import Literal, overload


# 基础 Literal
def set_mode(mode: Literal['read', 'write', 'append']) -> None:
    """设置文件模式"""
    print(f'模式: {mode}')


set_mode('read')  # 正确
# set_mode('delete')  # mypy 报错：'delete' 不是 'read' | 'write' | 'append'


# Literal 与 Union 组合
Direction = Literal['up', 'down', 'left', 'right']


def move(direction: Direction, steps: int) -> None:
    """移动"""
    print(f'向 {direction} 移动 {steps} 步')


move('up', 5)
# move('forward', 5)  # mypy 报错


# Literal 用于状态机
class TrafficLight:
    """交通灯"""
    state: Literal['red', 'yellow', 'green']
    
    def __init__(self) -> None:
        self.state = 'red'
    
    def next(self) -> None:
        if self.state == 'red':
            self.state = 'green'
        elif self.state == 'green':
            self.state = 'yellow'
        elif self.state == 'yellow':
            self.state = 'red'


# overload 配合 Literal
@overload
def get_config(key: Literal['timeout']) -> int: ...
@overload
def get_config(key: Literal['host']) -> str: ...
@overload
def get_config(key: Literal['debug']) -> bool: ...


def get_config(key: Literal['timeout', 'host', 'debug']) -> int | str | bool:
    """根据 key 返回不同类型的配置
    
    mypy 根据 key 的字面值推断返回类型
    """
    configs = {
        'timeout': 30,
        'host': 'localhost',
        'debug': True,
    }
    return configs[key]


# 使用时 mypy 能精确推断返回类型
timeout: int = get_config('timeout')
host: str = get_config('host')
debug: bool = get_config('debug')
```

### 5.6 Callable 类型

```python
# Callable 类型示例：函数作为参数

from typing import Callable, ParamSpec, TypeVar
from collections.abc import Callable as CallableABC


# 基础 Callable
def apply(func: Callable[[int, int], int], a: int, b: int) -> int:
    """应用函数"""
    return func(a, b)


def add(a: int, b: int) -> int:
    return a + b


def multiply(a: int, b: int) -> int:
    return a * b


print(apply(add, 3, 4))  # 7
print(apply(multiply, 3, 4))  # 12


# 无参数的 Callable
def run_callback(cb: Callable[[], None]) -> None:
    """运行无参数回调"""
    cb()


# 任意参数的 Callable
from typing import Any

def run_anything(func: Callable[..., Any], *args: Any, **kwargs: Any) -> Any:
    """运行任意函数"""
    return func(*args, **kwargs)


# ParamSpec（Python 3.10+）：保留函数参数签名
P = ParamSpec('P')
R = TypeVar('R')


def log_call(func: Callable[P, R]) -> Callable[P, R]:
    """装饰器：记录函数调用
    
    使用 ParamSpec 保留原函数的参数签名，
    使装饰后的函数与原函数类型一致。
    """
    def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
        print(f'调用 {func.__name__}({args}, {kwargs})')
        return func(*args, **kwargs)
    return wrapper


@log_call
def greet(name: str, times: int = 1) -> str:
    return f'Hello, {name}! ' * times


print(greet('Alice', 2))
# mypy 知道 greet('Alice', 2) 返回 str，参数是 (name: str, times: int = 1)
```

### 5.7 ClassVar 与 Final

```python
# ClassVar 与 Final 示例

from typing import ClassVar, Final


class Configuration:
    """配置类"""
    
    # ClassVar：类变量，不是实例变量
    # mypy 会阻止通过实例赋值
    DEFAULT_PORT: ClassVar[int] = 8080
    VERSION: ClassVar[str] = '1.0.0'
    
    # 实例变量
    def __init__(self, port: int) -> None:
        self.port: int = port  # 实例变量


config = Configuration(9000)
print(config.port)  # 9000
print(Configuration.DEFAULT_PORT)  # 8080

# ClassVar 不应通过实例赋值
# config.DEFAULT_PORT = 9090  # mypy 报错


# Final：不可重新赋值的变量
MAX_CONNECTIONS: Final[int] = 100
# MAX_CONNECTIONS = 200  # mypy 报错：Final 变量不可重新赋值


class MathConstants:
    """数学常量"""
    PI: Final[float] = 3.141592653589793
    E: Final[float] = 2.718281828459045


# Final 方法：禁止子类覆盖
class Base:
    @final
    def base_method(self) -> None:
        """此方法不可被子类覆盖"""
        print('base method')


# class Child(Base):
#     def base_method(self) -> None:  # mypy 报错
#         print('child method')
```

### 5.8 NewType

```python
# NewType 示例：创建语义化的类型别名

from typing import NewType


# 创建新类型
UserId = NewType('UserId', int)
UserName = NewType('UserName', str)
Email = NewType('Email', str)


# 使用 NewType 区分语义
def get_user(user_id: UserId) -> dict:
    """根据用户 ID 查询"""
    return {'id': user_id, 'name': 'Alice'}


# UserId 是 int 的子类型，可以与 int 互操作
user_id: UserId = UserId(123)
print(user_id + 1)  # 124，可作为 int 使用

# 但不能直接将 int 赋给 UserId
# user_id = 123  # mypy 报错：int 不能赋给 UserId


def create_user(name: UserName, email: Email) -> dict:
    """创建用户
    
    使用 NewType 防止参数顺序颠倒。
    """
    return {'name': name, 'email': email}


# 显式构造增强可读性
user = create_user(
    name=UserName('Alice'),
    email=Email('alice@example.com'),
)
print(user)
```

### 5.9 overload 函数重载

```python
# overload 示例：函数重载

from typing import overload


# 同一函数的多个类型签名
@overload
def parse(value: int) -> int: ...
@overload
def parse(value: str) -> str: ...
@overload
def parse(value: list[int]) -> list[int]: ...
@overload
def parse(value: None) -> None: ...


def parse(value: int | str | list[int] | None) -> int | str | list[int] | None:
    """根据输入类型返回相应类型
    
    mypy 根据 @overload 签名精确推断返回类型
    """
    if value is None:
        return None
    elif isinstance(value, int):
        return value * 2
    elif isinstance(value, str):
        return value.upper()
    elif isinstance(value, list):
        return [x * 2 for x in value]
    return None


# mypy 能精确推断返回类型
result1: int = parse(42)
result2: str = parse('hello')
result3: list[int] = parse([1, 2, 3])
result4: None = parse(None)


# 实际应用：数据库查询
@overload
def query(sql: str, fetch_one: Literal[True]) -> dict | None: ...
@overload
def query(sql: str, fetch_one: Literal[False] = False) -> list[dict]: ...


def query(sql: str, fetch_one: bool = False) -> dict | list[dict] | None:
    """查询数据库
    
    fetch_one=True 返回单条记录或 None，
    fetch_one=False 返回记录列表。
    """
    # 模拟查询
    if fetch_one:
        return {'id': 1, 'name': 'Alice'}
    return [{'id': 1, 'name': 'Alice'}, {'id': 2, 'name': 'Bob'}]


# 使用
single: dict | None = query('SELECT * FROM users LIMIT 1', fetch_one=True)
multi: list[dict] = query('SELECT * FROM users')
```

### 5.10 TypeGuard 与 TypeIs

```python
# TypeGuard 与 TypeIs 示例：用户定义类型守卫

from typing import TypeGuard, TypeIs


# TypeGuard（Python 3.10+）
def is_str_list(items: list[object]) -> TypeGuard[list[str]]:
    """判断列表是否全是字符串
    
    返回 TypeGuard[list[str]] 时，若返回 True，
    mypy 将 items 的类型收窄为 list[str]。
    """
    return all(isinstance(x, str) for x in items)


def process_items(items: list[object]) -> None:
    """处理项目列表"""
    if is_str_list(items):
        # 此处 items 类型为 list[str]
        for s in items:
            print(s.upper())  # 安全调用 str 方法
    else:
        print('列表包含非字符串元素')


process_items(['hello', 'world'])  # HELLO, WORLD
process_items([1, 2, 3])  # 列表包含非字符串元素


# TypeIs（Python 3.13+）：双向类型收窄
def is_positive_int(x: object) -> TypeIs[int]:
    """判断是否为正整数
    
    TypeIs 比 TypeGuard 更严格：
    - TypeGuard 仅收窄 if 分支
    - TypeIs 双向收窄（if 与 else 分支）
    """
    return isinstance(x, int) and x > 0


def classify(x: object) -> str:
    if is_positive_int(x):
        # x 类型收窄为 int
        return f'正整数: {x}'
    else:
        # x 类型收窄为排除 int 后的类型
        return f'其他: {x}'
```

### 5.11 dataclass 与类型注解

```python
# dataclass 与类型注解示例

from dataclasses import dataclass, field
from typing import ClassVar


@dataclass
class User:
    """用户数据类"""
    id: int
    name: str
    email: str
    age: int = 0
    tags: list[str] = field(default_factory=list)
    _internal: int = field(default=0, repr=False)
    
    # ClassVar 不被视为字段
    counter: ClassVar[int] = 0
    
    def __post_init__(self) -> None:
        """初始化后校验"""
        if self.age < 0:
            raise ValueError('年龄不能为负')
        User.counter += 1


# 使用
user = User(id=1, name='Alice', email='alice@example.com', age=30)
print(user)


# frozen dataclass：不可变
@dataclass(frozen=True)
class Point:
    """不可变点"""
    x: float
    y: float
    
    def distance_to(self, other: 'Point') -> float:
        """计算距离"""
        return ((self.x - other.x) ** 2 + (self.y - other.y) ** 2) ** 0.5


p1 = Point(0.0, 0.0)
p2 = Point(3.0, 4.0)
print(f'距离: {p1.distance_to(p2)}')  # 5.0

# p1.x = 1.0  # mypy 报错：frozen dataclass 不可变


# slots dataclass（Python 3.10+）
@dataclass(slots=True)
class SlottedUser:
    """使用 __slots__ 的 dataclass，性能更优"""
    id: int
    name: str
```

### 5.12 mypy 配置

```python
# mypy 配置示例（pyproject.toml）

"""
[tool.mypy]
# Python 版本
python_version = "3.11"

# 严格模式
strict = true

# 严格模式等价于以下选项：
# disallow_any_generics = true
# disallow_subclassing_any = true
# disallow_untyped_calls = true
# disallow_untyped_defs = true
# disallow_incomplete_defs = true
# check_untyped_defs = true
# disallow_untyped_decorators = true
# no_implicit_optional = true
# warn_redundant_casts = true
# warn_unused_ignores = true
# warn_return_any = true
# no_implicit_reexport = true
# strict_equality = true

# 自定义选项
warn_unused_configs = true
warn_redundant_casts = true
warn_unused_ignores = true
warn_return_any = true
no_implicit_reexport = true
strict_equality = true

# 排除目录
exclude = [
    'tests/',
    'docs/',
    'build/',
]

# 模块特定配置
[[tool.mypy.overrides]]
module = 'third_party_lib.*'
ignore_missing_imports = true

[[tool.mypy.overrides]]
module = 'tests.*'
disallow_untyped_defs = false

# 逐文件配置
[[tool.mypy.overrides]]
module = 'myproject.legacy'
disallow_untyped_calls = false
disallow_untyped_defs = false
"""
```

### 5.13 渐进式迁移策略

```python
# 渐进式迁移示例：为遗留代码添加类型注解

# 第 1 步：为新代码添加类型注解
def new_function(x: int, y: int) -> int:
    return x + y


# 第 2 步：为现有函数添加注解，参数与返回值
def existing_function(name: str, count: int = 1) -> list[str]:
    """已有函数添加注解"""
    return [name] * count


# 第 3 步：复杂函数使用 overload
from typing import overload, Union


@overload
def process(data: int) -> int: ...
@overload
def process(data: str) -> str: ...


def process(data: Union[int, str]) -> Union[int, str]:
    if isinstance(data, int):
        return data * 2
    return data.upper()


# 第 4 步：使用 Any 作为过渡，逐步精确化
from typing import Any


def legacy_handler(data: Any) -> Any:
    """遗留代码，先标注 Any，后续精确化"""
    return data


# 第 5 步：用 Protocol 替代 Any
from typing import Protocol


class DataHandler(Protocol):
    def handle(self, data: bytes) -> bytes: ...


def modern_handler(handler: DataHandler, data: bytes) -> bytes:
    """使用 Protocol 替代 Any"""
    return handler.handle(data)


# 第 6 步：使用 cast 进行类型断言（谨慎使用）
from typing import cast


def unsafe_cast(data: Any) -> dict[str, int]:
    """类型断言，告诉 mypy data 的实际类型"""
    # 注意：cast 不进行运行时检查，仅类型检查时生效
    return cast(dict[str, int], data)
```

### 5.14 自定义 mypy 插件

```python
# 自定义 mypy 插件示例：扩展 mypy 的类型检查能力

"""
mypy 插件允许扩展 mypy 的类型推断与检查规则，
常用于框架集成（如 Django、SQLAlchemy、Pydantic）。
"""

from mypy.plugin import Plugin, ClassDefContext
from mypy.plugins import dataclasses


class CustomPlugin(Plugin):
    """自定义 mypy 插件"""
    
    def get_class_decorator_hook(self, fullname: str):
        """处理类装饰器"""
        if fullname == 'my_module.my_decorator':
            return self.my_decorator_hook
        return None
    
    def my_decorator_hook(self, ctx: ClassDefContext) -> None:
        """自定义装饰器钩子"""
        # 调用 dataclass 插件处理
        dataclasses.dataclass_class_maker_callback(ctx)
        # 添加自定义逻辑
        # ...


def plugin(version: str):
    """插件入口"""
    return CustomPlugin


# 在 pyproject.toml 中启用插件
"""
[tool.mypy]
plugins = my_mypy_plugin.py
"""
```

## 6. 对比分析

### 6.1 Python 类型系统 vs TypeScript 类型系统

| 维度 | Python 类型注解 | TypeScript |
|------|-----------------|------------|
| 类型系统 | 渐进式、可选 | 渐进式、可选 |
| 子类型 | 名义 + 结构（Protocol） | 结构 |
| 类型推断 | 局部 + 双向 | 全局 + 双向 |
| 运行时检查 | 默认无 | 编译为 JS 时移除 |
| 工具 | mypy、pyright | tsc |
| 严格模式 | strict | strict |
| 泛型 | TypeVar + Generic | `<T>` |
| 联合类型 | `Union`、`X \| Y` | `X \| Y` |
| 字面值类型 | `Literal` | 字面值类型 |
| 条件类型 | 无 | `T extends U ? X : Y` |
| 映射类型 | 无 | `{ [K in keyof T]: ... }` |

**论述**：

Python 与 TypeScript 都采用渐进式类型系统，但 TypeScript 的类型系统表达能力更强（条件类型、映射类型、模板字面量类型等）。Python 的优势是与运行时对象模型深度整合，且 `Protocol` 支持结构子类型，灵活性高。TypeScript 的优势在前端生态统治地位与极强的类型推断能力。

### 6.2 mypy vs pyright vs pytype vs pyre

| 维度 | mypy | pyright | pytype | pyre |
|------|------|---------|--------|------|
| 开发者 | Jukka Lehtosalo | Microsoft | Google | Meta |
| 实现语言 | Python | TypeScript | Python | OCaml |
| 性能 | 中 | 极快 | 中 | 极快 |
| 类型推断 | 中 | 强 | 极强 | 强 |
| 严格性 | 可配置 | 可配置 | 较宽松 | 较严格 |
| 增量检查 | 支持 | 支持 | 支持 | 支持 |
| IDE 集成 | LSP | LSP（VSCode 默认） | LSP | LSP |
| 适用场景 | 大型项目 | VSCode 用户 | 遗留代码 | 大型项目 |

**论述**：

- mypy 是 PEP 484 参考实现，生态最成熟，配置最灵活，适合大多数项目。
- pyright 性能极快，VSCode 默认集成，类型推断能力强，适合前端工程师。
- pytype 类型推断能力极强，能为无类型注解的代码推断类型，适合遗留代码迁移。
- pyre 性能极快，但生态较小，主要在 Meta 内部使用。

### 6.3 Pydantic vs dataclasses vs attrs vs TypedDict

| 维度 | Pydantic | dataclasses | attrs | TypedDict |
|------|----------|-------------|-------|-----------|
| 运行时校验 | 内置 | 无 | 可选 | 无 |
| 类型注解 | 必需 | 必需 | 必需 | 必需 |
| 序列化 | 内置 | 需第三方 | 需第三方 | 手动 |
| 性能 | v2 极快 | 原生 | 原生 | 原生 |
| 不可变 | 可选 | frozen | 可选 | N/A |
| 适用场景 | API 模型、配置 | 简单数据类 | 中等复杂 | 字典数据 |

**论述**：

- Pydantic 适合需要运行时校验的场景，如 API 请求/响应模型、配置文件解析。v2 用 Rust 重写，性能极快。
- dataclasses 是标准库方案，适合简单 DTO，无需第三方依赖。
- attrs 比 dataclasses 更早，功能更丰富，但社区热度下降。
- TypedDict 适合需要类型约束的字典数据，如 JSON 解析。

## 7. 常见陷阱与反模式

### 7.1 陷阱一：滥用 Any

**问题描述**：开发者为图方便大量使用 `Any`，使类型检查形同虚设。

**错误示例**：

```python
def process(data: Any) -> Any:
    """使用 Any 失去类型安全"""
    return data['key']  # mypy 不检查 data 是否支持 [] 操作
```

**生产事故案例**：某团队在数据处理管道中大量使用 `Any`，导致运行时 `KeyError` 频发。事后审计发现，`Any` 的使用使 mypy 无法发现键名错误，单元测试覆盖率不足。

**正确做法**：使用具体类型或 `Protocol`：

```python
from typing import Protocol


class HasKey(Protocol):
    def __getitem__(self, key: str) -> str: ...


def process(data: HasKey) -> str:
    return data['key']  # mypy 检查 data 支持 [] 操作
```

### 7.2 陷阱二：可变默认值

**问题描述**：函数参数使用可变默认值（如 `def f(x=[])`），多次调用共享同一对象。

**错误示例**：

```python
def add_item(item: str, items: list[str] = []) -> list[str]:
    items.append(item)
    return items


# 多次调用共享同一列表
print(add_item('a'))  # ['a']
print(add_item('b'))  # ['a', 'b']，而非 ['b']
```

**正确做法**：使用 `None` 作为默认值：

```python
from typing import Optional


def add_item(item: str, items: Optional[list[str]] = None) -> list[str]:
    if items is None:
        items = []
    items.append(item)
    return items
```

### 7.3 陷阱三：误用 Optional

**问题描述**：`Optional[T]` 等价于 `T | None`，但开发者常误以为 `Optional[T]` 表示"可选参数"。

**错误示例**：

```python
# 误以为 Optional 表示参数可选
def greet(name: Optional[str] = None) -> str:
    # name 类型是 str | None，需要处理 None
    return f'Hello, {name}!'  # 若 name 为 None，输出 'Hello, None!'
```

**正确做法**：区分"可选参数"与"可空类型"：

```python
# 可选参数：默认值为 None
def greet(name: str | None = None) -> str:
    if name is None:
        return 'Hello, stranger!'
    return f'Hello, {name}!'
```

### 7.4 陷阱四：忽略协变与逆变

**问题描述**：误以为 `list[Dog]` 是 `list[Animal]` 的子类型。

**错误示例**：

```python
class Animal: ...
class Dog(Animal): ...


def add_animal(animals: list[Animal]) -> None:
    animals.append(Animal())


dogs: list[Dog] = [Dog()]
# add_animal(dogs)  # mypy 报错：list 是不变的
# 若允许，dogs 中会出现 Animal，类型被破坏
```

**正确做法**：使用 `Sequence`（协变）或 `Iterable`：

```python
from collections.abc import Sequence


def count_animals(animals: Sequence[Animal]) -> int:
    """Sequence 是只读的，协变安全"""
    return len(animals)


count_animals(dogs)  # 正确
```

### 7.5 陷阱五：TypeVar 作用域错误

**问题描述**：在函数内部定义 TypeVar，导致类型推断失败。

**错误示例**：

```python
def first(items: list[T]) -> T:  # T 未定义
    return items[0]
```

**正确做法**：TypeVar 必须在模块顶层定义：

```python
from typing import TypeVar

T = TypeVar('T')


def first(items: list[T]) -> T:
    return items[0]
```

### 7.6 陷阱六：前向引用

**问题描述**：在类定义中引用尚未定义的类型。

**错误示例**：

```python
class Node:
    def set_next(self, next: Node) -> None: ...  # 'Node' 未定义
```

**正确做法**：使用字符串或 `from __future__ import annotations`：

```python
from __future__ import annotations


class Node:
    def set_next(self, next: Node) -> None: ...  # 正确
```

### 7.7 陷阱七：运行时类型检查缺失

**问题描述**：类型注解仅在静态检查时生效，运行时不强制。外部输入仍需运行时校验。

**错误示例**：

```python
def process(data: dict[str, int]) -> int:
    return sum(data.values())


# 外部 JSON 数据不保证类型
import json
raw = json.loads('{"a": "not an int"}')
# process(raw)  # 运行时 TypeError，但 mypy 不报错
```

**正确做法**：使用 Pydantic 进行运行时校验：

```python
from pydantic import BaseModel


class Data(BaseModel):
    values: dict[str, int]


def process(data: Data) -> int:
    return sum(data.values.values())


raw = json.loads('{"a": "not an int"}')
# Data(**raw)  # Pydantic 在运行时校验，抛出 ValidationError
```

### 7.8 陷阱八：过度复杂的类型

**问题描述**：为追求类型精确，写出难以理解的复杂类型。

**错误示例**：

```python
from typing import Callable, Union, TypeVar, ParamSpec

P = ParamSpec('P')
R = TypeVar('R')
T = TypeVar('T')


def complex_decorator(
    func: Callable[P, R]
) -> Callable[
    [Callable[[Callable[P, R], T], R]],
    Callable[[Callable[P, R], T], Union[R, T]]
]:
    ...
```

**正确做法**：简化或拆分类型，优先可读性：

```python
def simple_decorator(func: Callable[..., Any]) -> Callable[..., Any]:
    ...
```

### 7.9 陷阱九：mypy 配置不当

**问题描述**：mypy 配置过严或过松，导致开发体验差或类型检查形同虚设。

**建议**：根据项目阶段选择合适配置：
- 新项目：使用 `strict = true`。
- 遗留项目迁移：先关闭严格选项，逐步启用。
- 测试代码：放宽 `disallow_untyped_defs`。

### 7.10 陷阱十：注解求值开销

**问题描述**：复杂的注解在模块加载时求值，影响启动性能。

**正确做法**：使用 `from __future__ import annotations` 延迟求值：

```python
from __future__ import annotations

# 注解以字符串形式存储，不在加载时求值
def process(data: list[dict[str, int]]) -> int:
    return sum(sum(d.values()) for d in data)
```

## 8. 工程实践

### 8.1 类型注解规范

**函数签名**：所有公开函数必须有完整类型注解。

```python
# 正确
def get_user(user_id: int) -> User | None:
    ...

# 错误（公开函数无注解）
def get_user(user_id):
    ...
```

**变量注解**：类属性与模块级变量应有注解。

```python
class Config:
    host: str = 'localhost'
    port: int = 8080


DEFAULT_TIMEOUT: Final[int] = 30
```

**容器类型**：使用泛型容器，避免裸 `list`、`dict`。

```python
# 正确
def process(items: list[int]) -> dict[str, int]:
    ...

# 错误（无泛型参数）
def process(items: list) -> dict:
    ...
```

### 8.2 mypy 工程配置

```toml
# pyproject.toml
[tool.mypy]
python_version = "3.11"
strict = true
warn_unused_configs = true
warn_redundant_casts = true
warn_unused_ignores = true
warn_return_any = true
no_implicit_reexport = true
strict_equality = true

# 排除测试目录
exclude = [
    'tests/',
    'build/',
]

# 第三方库忽略缺失导入
[[tool.mypy.overrides]]
module = 'third_party.*'
ignore_missing_imports = true

# 测试代码放宽
[[tool.mypy.overrides]]
module = 'tests.*'
disallow_untyped_defs = false
disallow_untyped_calls = false
```

### 8.3 CI/CD 集成

```yaml
# .github/workflows/typecheck.yml
name: Type Check

on: [push, pull_request]

jobs:
  mypy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - run: pip install mypy
      - run: mypy --strict src/
```

### 8.4 性能优化

**策略一：使用 `from __future__ import annotations`**

延迟注解求值，减少模块加载时间。

**策略二：避免在热路径使用 `typing.get_type_hints()`**

`get_type_hints()` 在运行时求值注解，开销大。若需运行时反射，考虑缓存。

**策略三：使用 `@dataclass(slots=True)`**

`slots=True` 启用 `__slots__`，减少内存占用与属性访问开销。

**策略四：mypy 守护进程**

```bash
dmypy run -- src/
```

`dmypy` 启动守护进程，避免每次启动 mypy 的开销，增量检查速度提升 10 倍以上。

### 8.5 与第三方库协作

**Pydantic**：类型注解 + 运行时校验。

```python
from pydantic import BaseModel


class User(BaseModel):
    id: int
    name: str
    email: str


user = User(id=1, name='Alice', email='alice@example.com')
```

**SQLAlchemy 2.0**：类型安全的 ORM。

```python
from sqlalchemy.orm import Mapped, mapped_column


class User(Base):
    __tablename__ = 'users'
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str]
```

**FastAPI**：基于类型注解的 API 文档生成。

```python
from fastapi import FastAPI


app = FastAPI()


@app.get('/users/{user_id}')
def get_user(user_id: int) -> dict:
    return {'id': user_id, 'name': 'Alice'}
```

## 9. 案例研究

### 9.1 案例一：Dropbox 的类型注解迁移

Dropbox 是 mypy 的主要赞助商，其 Python 代码库约 400 万行。Dropbox 在 2015-2019 年间完成了全量类型注解迁移：

**迁移策略**：
1. 从核心库开始，逐步扩展到业务代码。
2. 使用 mypy 的 `--disallow-untyped-defs` 选项，强制新代码必须有类型注解。
3. 为第三方库编写 stub 文件（typeshed 贡献）。

**收益**：
- 运行时错误减少 30% 以上。
- 重构效率显著提升，IDE 智能补全更精确。
- 新人入职成本降低，类型注解即文档。

**经验**：
- 渐进式迁移是关键，一次性迁移成本过高。
- mypy 配置需根据团队成熟度调整。
- TypeGuard 与 Protocol 是处理复杂场景的利器。

### 9.2 案例二：FastAPI 的类型驱动设计

FastAPI 是基于 Starlette 与 Pydantic 的现代 Web 框架，其设计哲学是"类型驱动"：

```python
from fastapi import FastAPI
from pydantic import BaseModel


app = FastAPI()


class Item(BaseModel):
    name: str
    price: float
    is_offer: bool | None = None


@app.post('/items/')
def create_item(item: Item) -> dict:
    return {'item': item, 'total': item.price * 2}
```

**关键设计**：
1. 函数参数类型注解自动转换为请求体模型。
2. 返回值类型注解自动生成响应模型。
3. OpenAPI 文档自动从类型注解生成。
4. Pydantic 提供运行时校验，mypy 提供静态检查。

### 9.3 案例三：typeshed 的 stub 生态

typeshed 是 Python 类型 stub 文件的中央仓库，包含标准库与第三方库的 stub：

- 标准库 stub：Python 标准库的类型注解。
- 第三方库 stub：如 `requests`、`flask`、`django` 等。
- `py.typed` 标记：包内自带类型注解的库（如 Pydantic）。

typeshed 是 Python 类型生态的基石，mypy、pyright 等工具均依赖 typeshed。

### 9.4 案例四：SQLAlchemy 2.0 的类型系统

SQLAlchemy 2.0 引入了完整的类型系统：

```python
from sqlalchemy.orm import Mapped, mapped_column, DeclarativeBase


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = 'users'
    
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(50))
    email: Mapped[str | None] = mapped_column(String(100), nullable=True)
```

**关键设计**：
- `Mapped[T]` 标记 ORM 字段，T 是 Python 类型。
- `mapped_column` 关联数据库列定义。
- mypy 能检查字段类型与查询结果类型。

### 9.5 案例五：Pydantic v2 的 Rust 核心

Pydantic v2 用 Rust 重写核心，性能提升 5-50 倍：

```python
from pydantic import BaseModel


class User(BaseModel):
    id: int
    name: str
    email: str


# Rust 核心在运行时校验类型
user = User(id=1, name='Alice', email='alice@example.com')
```

**关键设计**：
- 类型注解作为校验规则的声明。
- Rust 核心执行实际校验，性能极快。
- 与 mypy 深度集成，静态检查 + 运行时校验双重保障。

## 10. 习题

### 10.1 基础题

**题目 1**：为以下函数添加类型注解。

```python
def calculate_total(prices, discount=0):
    return sum(prices) * (1 - discount)
```

**参考答案要点**：
- `prices: list[float]`
- `discount: float = 0.0`
- 返回 `float`

**题目 2**：解释 `Optional[T]` 与 `T | None` 的关系。

**参考答案要点**：
- 两者等价，都是 `Union[T, None]` 的语法糖。
- `Optional[T]` 是 Python 3.5+ 的写法。
- `T | None` 是 Python 3.10+ 的语法。

**题目 3**：解释 `Any` 与 `object` 的区别。

**参考答案要点**：
- `Any` 与任意类型双向兼容，不进行类型检查。
- `object` 是顶层类型，接受任意值但限制操作（只能调用 object 方法）。
- `Any` 是逃生舱，`object` 是安全约束。

### 10.2 进阶题

**题目 4**：实现一个类型安全的 `first` 函数，返回列表第一个元素，列表为空时抛出异常。

**参考答案要点**：
- 使用 `TypeVar('T')`。
- 签名 `def first(items: list[T]) -> T`。
- 列表为空时 `raise IndexError`。

**题目 5**：使用 `Protocol` 定义 `Iterable` 协议，并实现一个接受任意可迭代对象的 `count` 函数。

**参考答案要点**：
- `Protocol` 定义 `__iter__` 方法。
- `def count(it: Iterable[T]) -> int`。

**题目 6**：使用 `TypedDict` 定义一个用户信息字典类型，包含必填的 `id`、`name` 与可选的 `email`、`age`。

**参考答案要点**：
- 继承 `TypedDict`。
- `id: Required[int]`、`name: Required[str]`。
- `email: NotRequired[str]`、`age: NotRequired[int]`。

### 10.3 挑战题

**题目 7**：实现一个类型安全的 `memoize` 装饰器，使用 `ParamSpec` 保留函数签名。

**参考答案要点**：
- `P = ParamSpec('P')`、`R = TypeVar('R')`。
- `def memoize(func: Callable[P, R]) -> Callable[P, R]`。
- 内部使用字典缓存结果。

**题目 8**：实现一个类型安全的 ORM 字段基类，使用 `Generic` 与 `TypeVar`，支持不同字段类型。

**参考答案要点**：
- `T = TypeVar('T')`。
- `class Field(Generic[T])`。
- `__get__` 返回 `T | None`，`__set__` 接受 `T`。

**题目 9**：分析 CPython 中 `typing.get_type_hints()` 的实现，解释其在运行时如何求值注解。

**参考答案要点**：
- `get_type_hints()` 遍历对象的 `__annotations__`。
- 对字符串形式的注解调用 `eval()`。
- 需要正确的全局与局部命名空间。

**题目 10**：设计一套企业级类型注解规范，覆盖命名、精度、Protocol 使用、TypedDict 使用、Any 使用策略。

**参考答案要点**：
- 所有公开 API 必须有完整类型注解。
- 容器类型必须使用泛型参数。
- 优先使用 `Protocol` 替代 `Any`。
- 字典数据使用 `TypedDict`。
- `Any` 仅用于过渡期，必须有 `# type: ignore` 与注释。

## 11. 参考文献

[1] Lehtosalo, J. 2014. PEP 484: Type Hints. Python Enhancement Proposals. https://peps.python.org/pep-0484/

[2] Siek, J. G. and Taha, W. 2006. Gradual Typing for Functional Languages. In Proceedings of the Scheme and Functional Programming Workshop (SFPW '06). DOI: https://doi.org/10.1145/1176624.1176626

[3] Siek, J. G. and Taha, W. 2007. Gradual Typing for Objects. In Proceedings of the European Conference on Object-Oriented Programming (ECOOP '07). DOI: https://doi.org/10.1007/978-3-540-73589-2_2

[4] Lehtosalo, J. and Langa, Ł. 2016. PEP 526: Syntax for Variable Annotations. Python Enhancement Proposals. https://peps.python.org/pep-0526/

[5] Bond, I. and Dower, N. 2018. PEP 544: Protocols: Structural subtyping (static duck typing). Python Enhancement Proposals. https://peps.python.org/pep-0544/

[6] Ivanov, N. and Ivanov, S. 2018. PEP 561: Distributing and Packaging Type Information. Python Enhancement Proposals. https://peps.python.org/pep-0561/

[7] Cannon, B. 2017. PEP 563: Postponed Evaluation of Annotations. Python Enhancement Proposals. https://peps.python.org/pep-0563/

[8] Langa, Ł. 2019. PEP 585: Type Hinting Generics In Standard Collections. Python Enhancement Proposals. https://peps.python.org/pep-0585/

[9] Lee, B. 2019. PEP 586: Literal Types. Python Enhancement Proposals. https://peps.python.org/pep-0586/

[10] Lee, B. 2019. PEP 589: TypedDict: Type Hints for Dictionaries with a Fixed Set of Keys. Python Enhancement Proposals. https://peps.python.org/pep-0589/

[11] Lee, B. 2019. PEP 591: Adding a final qualifier to typing. Python Enhancement Proposals. https://peps.python.org/pep-0591/

[12] Langa, Ł. 2020. PEP 604: Allow writing union types as X | Y. Python Enhancement Proposals. https://peps.python.org/pep-0604/

[13] Dower, N. 2020. PEP 612: Parameter Specification Variables. Python Enhancement Proposals. https://peps.python.org/pep-0612/

[14] Bhattacharyya, S. 2021. PEP 646: Variadic Generics. Python Enhancement Proposals. https://peps.python.org/pep-0646/

[15] Oden, J. 2021. PEP 673: Self type. Python Enhancement Proposals. https://peps.python.org/pep-0673/

[16] Srivastav, K. 2022. PEP 675: Arbitrary Literal String Type. Python Enhancement Proposals. https://peps.python.org/pep-0675/

[17] Goel, P. 2022. PEP 681: dataclass_transform. Python Enhancement Proposals. https://peps.python.org/pep-0681/

[18]preloadMortada, M. 2023. PEP 692: Using TypedDict for more precise **kwargs typing. Python Enhancement Proposals. https://peps.python.org/pep-0692/

[19] Traut, E. 2023. PEP 695: Type Parameter Syntax. Python Enhancement Proposals. https://peps.python.org/pep-0695/

[20] overloadDower, N. 2024. PEP 696: Type Defaults for TypeVarLikes. Python Enhancement Proposals. https://peps.python.org/pep-0696/

[21] Traut, E. 2024. PEP 698: Override Decorator for Static Type Checkers. Python Enhancement Proposals. https://peps.python.org/pep-0698/

[22] Calvert, M. 2024. PEP 702: Marking deprecations using the type system. Python Enhancement Proposals. https://peps.python.org/pep-0702/

[23] Pierce, B. C. 2002. Types and Programming Languages. MIT Press. ISBN: 978-0262162098

[24] Ramalho, L. 2022. Fluent Python, 2nd Edition. O'Reilly Media. ISBN: 978-1492056355

[25] mypy documentation. 2024. https://mypy.readthedocs.io/

[26] pyright documentation. 2024. https://github.com/microsoft/pyright

[27] typeshed repository. 2024. https://github.com/python/typeshed

[28] Pydantic documentation. 2024. https://docs.pydantic.dev/

[29] FastAPI documentation. 2024. https://fastapi.tiangolo.com/

[30] SQLAlchemy 2.0 documentation. 2024. https://docs.sqlalchemy.org/en/20/

## 12. 延伸阅读

### 12.1 官方文档

- Python typing module: https://docs.python.org/3/library/typing.html
- PEP 484: Type Hints: https://peps.python.org/pep-0484/
- PEP 544: Protocols: https://peps.python.org/pep-0544/
- PEP 585: Type Hinting Generics: https://peps.python.org/pep-0585/
- PEP 586: Literal Types: https://peps.python.org/pep-0586/
- PEP 589: TypedDict: https://peps.python.org/pep-0589/
- PEP 604: Union Types: https://peps.python.org/pep-0604/
- PEP 695: Type Parameter Syntax: https://peps.python.org/pep-0695/

### 12.2 经典教材

- Benjamin C. Pierce. Types and Programming Languages. MIT Press, 2002.（类型理论经典教材）
- Luciano Ramalho. Fluent Python, 2nd Edition. O'Reilly Media, 2022.（第 8 章深入类型注解）
- David Beazley, Brian K. Jones. Python Cookbook, 3rd Edition. O'Reilly Media, 2013.

### 12.3 前沿论文与演讲

- Jeremy Siek, Walid Taha. Gradual Typing for Functional Languages. SFPW 2006.
- Jeremy Siek, Walid Taha. Gradual Typing for Objects. ECOOP 2007.
- Jukka Lehtosalo. Mypy: Optional Static Typing for Python. PyCon 2016.
- Greg Price. Typeshed: Type Stubs for Python. PyCon 2017.
- Samuel Colvin. Pydantic v2: Rust-Powered Validation. PyCon 2023.

### 12.4 开源项目源码

- mypy: https://github.com/python/mypy
- pyright: https://github.com/microsoft/pyright
- pytype: https://github.com/google/pytype
- pyre: https://github.com/facebook/pyre-check
- typeshed: https://github.com/python/typeshed
- Pydantic: https://github.com/pydantic/pydantic
- FastAPI: https://github.com/tiangolo/fastapi

### 12.5 进阶主题

- 类型推断算法：Hindley-Milner 类型系统。
- 渐进式类型系统理论：Siek & Taha 的系列论文。
- 类型安全的元编程：mypy 插件开发。
- 类型与运行时校验的结合：Pydantic、Typeguard。
- 类型在异步编程中的应用：`Coroutine[T, T_co, T_contra]`。
- 类型在函数式编程中的应用：`@overload`、`TypeGuard`、`TypeIs`。

## 附录 A：类型注解速查表

| 类型 | 语法 | 示例 |
|------|------|------|
| 基本类型 | `int`、`str`、`float`、`bool` | `x: int = 0` |
| 列表 | `list[T]` | `x: list[int] = [1, 2]` |
| 字典 | `dict[K, V]` | `x: dict[str, int] = {}` |
| 元组 | `tuple[T1, T2]` | `x: tuple[int, str] = (1, 'a')` |
| 可选 | `T \| None` | `x: int \| None = None` |
| 联合 | `T1 \| T2` | `x: int \| str = 1` |
| 可调用 | `Callable[[T1, T2], R]` | `f: Callable[[int], str]` |
| 泛型 | `Generic[T]` | `class Stack(Generic[T]):` |
| 协议 | `Protocol` | `class Drawable(Protocol):` |
| 字面值 | `Literal['a', 'b']` | `mode: Literal['read', 'write']` |
| TypedDict | `TypedDict` | `class User(TypedDict):` |
| 最终 | `Final[T]` | `MAX: Final[int] = 100` |
| 类变量 | `ClassVar[T]` | `count: ClassVar[int] = 0` |

## 附录 B：mypy 严格模式选项速查表

| 选项 | 说明 |
|------|------|
| `disallow_any_generics` | 禁止裸泛型（如 `list` 而非 `list[int]`） |
| `disallow_subclassing_any` | 禁止子类化 `Any` 类型 |
| `disallow_untyped_calls` | 禁止调用无类型注解的函数 |
| `disallow_untyped_defs` | 禁止定义无类型注解的函数 |
| `disallow_incomplete_defs` | 禁止部分参数有注解 |
| `check_untyped_defs` | 检查无注解函数的函数体 |
| `disallow_untyped_decorators` | 禁止无类型注解的装饰器 |
| `no_implicit_optional` | 禁止隐式 Optional |
| `warn_redundant_casts` | 警告冗余 cast |
| `warn_unused_ignores` | 警告未使用的 `type: ignore` |
| `warn_return_any` | 警告返回 Any |
| `no_implicit_reexport` | 禁止隐式重新导出 |
| `strict_equality` | 严格相等检查 |

## 附录 C：Python 版本与类型系统特性对照表

| Python 版本 | 关键特性 |
|-------------|----------|
| 3.0 | 函数注解语法（PEP 3107） |
| 3.5 | typing 模块（PEP 484） |
| 3.6 | 变量注解（PEP 526）、`__set_name__` |
| 3.7 | `from __future__ import annotations`（PEP 563） |
| 3.8 | `Literal`、`TypedDict`、`Final`、`Protocol` |
| 3.9 | 内置泛型 `list[int]`（PEP 585） |
| 3.10 | `X \| Y` 联合类型（PEP 604）、`ParamSpec` |
| 3.11 | `Required`、`NotRequired`、`Self`（PEP 673）、`LiteralString`（PEP 675） |
| 3.12 | 类型参数语法 `def f[T]():`（PEP 695）、`@override`（PEP 698） |
| 3.13 | `TypeIs`（PEP 742）、`@deprecated`（PEP 702） |

## 结语

Python 类型注解与 mypy 是现代 Python 工程实践的基石。从 PEP 484 的提出到 PEP 695 的类型参数语法，Python 类型系统经历了十多年的演进，已发展成为表达力强、工程化完善的渐进式类型系统。

掌握类型注解与 mypy 后，读者将具备以下能力：

1. 为现有 Python 项目添加类型注解，通过 mypy 严格模式检查。
2. 使用 `TypeVar`、`Generic`、`Protocol`、`TypedDict`、`Literal` 等高级类型表达复杂业务约束。
3. 配置 mypy 适配大型项目，集成到 CI/CD 流水线。
4. 评估与选择类型检查工具（mypy、pyright、pytype、pyre）。
5. 与 Pydantic、FastAPI、SQLAlchemy 等现代框架深度协作。

类型注解的学习曲线适中，但其工程价值极高。建议读者在掌握本篇内容后，深入阅读 PEP 文档与 typeshed 源码，将类型系统理论转化为工程能力。
