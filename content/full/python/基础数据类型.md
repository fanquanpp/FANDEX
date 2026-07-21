---
order: 40
title: 'Python 基础数据类型：从对象模型到工程实践的深度解析'
module: python
category: Python Basics
difficulty: beginner
description: '系统阐述 Python 基础数据类型（int/float/complex/bool/NoneType/str/bytes/Decimal/Fraction）的对象模型、内存布局、不可变性语义、IEEE 754 浮点精度、整数缓存机制、字符串驻留、类型转换规则、可变性与不可变性、引用语义与值语义，以及生产环境下的精度陷阱、性能优化与最佳实践。'
author: fanquanpp
updated: '2026-07-21'
tags:
  - python
  - data-types
  - int
  - float
  - string
  - bytes
  - decimal
  - ieee-754
  - immutability
  - type-conversion
related:
  - python/程序结构与基本语法
  - python/变量与常量
  - python/列表推导式进阶
  - python/运算符与表达式
  - python/字符串与正则
prerequisites:
  - python/语法速查
---

# Python 基础数据类型：从对象模型到工程实践的深度解析

> 数据类型是编程语言的基石。在 Python 中，"一切皆对象"的设计哲学使得基础数据类型（int、float、complex、bool、NoneType、str、bytes）不仅是数据的容器，更是承载丰富语义的对象。本文从 Python 对象模型出发，系统阐述基础数据类型的形式化定义、内存布局、不可变性语义、IEEE 754 浮点精度模型、整数缓存机制、字符串驻留、类型转换规则，并通过生产级案例分析精度陷阱、性能优化与最佳实践，帮助开发者构建对 Python 类型系统的深入理解。

## 1. 学习目标

本文依据 Bloom's Taxonomy（布鲁姆认知目标分类学）的六个层次组织学习目标，确保从低阶认知到高阶创造的渐进式掌握。

### 1.1 记忆（Remembering）

- 列出 Python 的九种基础数据类型：`int`、`float`、`complex`、`bool`、`NoneType`、`str`、`bytes`、`bytearray`、`memoryview`。
- 回忆 Python 整数的小整数缓存范围：`[-5, 256]`。
- 列出 IEEE 754 双精度浮点数的关键参数：1 位符号位、11 位指数位、52 位尾数位。
- 陈述 Python 的可变类型与不可变类型的代表：可变（list/dict/set/bytearray）、不可变（int/float/str/tuple/bytes/frozenset）。

### 1.2 理解（Understanding）

- 解释"一切皆对象"在 Python 中的具体含义：每个值都是 `object` 的实例，具有 `id`、`type`、`value` 三要素。
- 描述 `is` 与 `==` 的差异：前者比较对象身份（identity），后者比较对象值（equality）。
- 区分 `bytes`、`bytearray`、`memoryview` 三种二进制数据类型的语义与适用场景。
- 解释 IEEE 754 浮点数 `0.1 + 0.2 != 0.3` 现象的根本原因。

### 1.3 应用（Applying）

- 使用 `decimal.Decimal` 处理金融场景的高精度运算。
- 使用 `fractions.Fraction` 处理有理数运算，避免浮点误差。
- 使用 `struct` 模块在二进制数据与 Python 类型之间转换。
- 使用 `encode()`/`decode()` 在 `str` 与 `bytes` 之间转换，正确处理字符编码。

### 1.4 分析（Analyzing）

- 分析 Python 整数"任意精度"的实现机制及其对性能的影响。
- 解构 `bool` 作为 `int` 子类的设计决策及其带来的便利与陷阱。
- 比较使用 `float`、`Decimal`、`Fraction` 三种数值类型在精度、性能、易用性上的差异。
- 分析字符串驻留（interning）机制对内存优化与身份比较的影响。

### 1.5 评价（Evaluating）

- 评估在金融、科学计算、Web 开发等不同场景下选择数值类型的决策依据。
- 评判 Python"不可变类型"在多线程环境下的安全性。
- 评价 `decimal` 模块上下文（context）设计相对于全局浮点环境的优劣。

### 1.6 创造（Creating）

- 设计一套适用于电商订单系统的金额计算抽象层，自动选择 `Decimal` 或 `int`（分单位）。
- 实现一个支持自定义精度、舍入策略的有理数运算库。
- 构建一个类型安全的二进制协议解析器，基于 `struct` 与 `memoryview`。

## 2. 历史动机与背景

### 2.1 Python 类型系统的演进

Python 的类型系统经历了从"动态类型"到"可选类型注解"的渐进演进。理解这一演进有助于把握当前类型系统的设计哲学。

#### 2.1.1 Python 1.x 时代（1994-2000）

Python 1.x 的类型系统相对简单：

- 整数分为 `int`（C long，固定精度）与 `long`（任意精度，后缀 `L`）。
- 字符串分为 `str`（字节串）与 `unicode`（Unicode 字符串）。
- 浮点数统一为 `float`（C double）。
- 没有 `bool` 类型，使用 `0` 和 `1` 表示真假，或 `None` 表示"空"。

这种设计的局限：

1. `int` 与 `long` 的区分容易导致溢出问题（`int` 在 C 层面是 32/64 位）。
2. 字节串与 Unicode 字符串的区分是 Python 2 字符编码问题的根源。
3. 缺乏布尔类型导致代码可读性差。

#### 2.1.2 Python 2.x 时代（2000-2010）

Python 2.0 引入了 `bool` 类型（PEP 285），但仍保持 `int`/`long` 与 `str`/`unicode` 的区分。Python 2.4 引入了 `decimal` 模块（PEP 327），为金融计算提供了高精度方案。

#### 2.1.3 Python 3.0 的统一（2008）

Python 3.0 进行了多项重要统一：

- **整数统一**：`int` 与 `long` 合并为单一的 `int` 类型，任意精度（PEP 237）。`1L` 语法被移除。
- **字符串统一**：`str` 默认为 Unicode，字节串使用 `bytes`（PEP 3110, 3137）。
- **除法语义**：`/` 总是返回浮点数，`//` 表示整数除法（PEP 238）。

这一统一大幅简化了类型系统，但 Python 2 到 Python 3 的迁移因此变得复杂。

#### 2.1.4 类型注解时代（2014+）

Python 3.5（PEP 484）引入了类型注解（Type Hints），标志着 Python 从"纯动态类型"转向"渐进类型化"（Gradual Typing）。基础数据类型在 `typing` 模块中有了对应的泛型形式：

```python
from typing import Optional, Union, List

# Python 3.9+ 可直接使用内置类型作为泛型
def process(values: list[int], flag: bool = False) -> str | None:
    ...
```

### 2.2 "一切皆对象"的设计哲学

Python 的核心设计哲学是"一切皆对象"（Everything is an object）。这意味着：

- 整数 `42` 是 `int` 类的实例，`int` 是 `type` 类的实例，`type` 是 `object` 的子类。
- 函数、类、模块、异常都是对象，可以赋值给变量、作为参数传递、作为返回值。
- 每个对象都有三要素：
  - **身份（identity）**：`id(obj)`，CPython 中是内存地址。
  - **类型（type）**：`type(obj)`，决定对象支持的操作。
  - **值（value）**：对象承载的数据。

这一设计带来：

1. **一致性**：所有值都遵循统一的协议（`__repr__`、`__str__`、`__eq__`、`__hash__` 等）。
2. **灵活性**：函数可以接受任意类型的参数（鸭子类型）。
3. **代价**：相比 C/Rust，Python 的对象开销大（每个 `int` 至少 28 字节，而 C 的 `int` 仅 4 字节）。

### 2.3 不可变性的设计动机

Python 的基础数据类型（`int`、`float`、`complex`、`bool`、`str`、`bytes`、`tuple`、`frozenset`）都是不可变的（immutable）。不可变性意味着：

- 对象创建后，其值不能被修改。
- "修改"操作实际上是创建新对象。

不可变性的设计动机：

1. **线程安全**：不可变对象无需锁即可在多线程间共享。
2. **哈希性**：不可变对象可作为字典键、集合元素（`__hash__` 稳定）。
3. **简化推理**：函数参数为不可变类型时，函数内不会意外修改调用方的数据。
4. **内存优化**：相同值的不可变对象可共享（如小整数缓存、字符串驻留）。

代价：频繁"修改"大字符串会创建多个临时对象，效率低下。Python 通过 `+=` 操作符的 `__iadd__` 优化（对可变类型原地修改，对不可变类型回退到 `__add__`）缓解这一问题。

### 2.4 IEEE 754 与浮点精度问题

浮点数精度问题是计算机科学的经典话题。Python 的 `float` 类型遵循 IEEE 754 双精度标准（binary64），其特性：

- 1 位符号位 + 11 位指数位 + 52 位尾数位。
- 表示范围：约 $\pm 1.8 \times 10^{308}$。
- 精度：约 15-17 位十进制有效数字。
- 无法精确表示大部分十进制小数（如 0.1、0.2）。

```python
>>> 0.1 + 0.2
0.30000000000000004
>>> 0.1 + 0.2 == 0.3
False
```

这一现象并非 Python 独有，而是 IEEE 754 标准的固有特性，影响所有使用二进制浮点的语言（C、Java、JavaScript 等）。Python 的 `decimal` 模块（PEP 327）通过十进制浮点运算解决了这一问题，适用于金融、会计等对精度敏感的场景。

## 3. 形式化定义

### 3.1 Python 对象模型形式化

Python 对象 $o$ 是一个三元组：

$$
o = \langle \text{id}, \text{type}, \text{value} \rangle
$$

- $\text{id}(o) \in \mathbb{N}$：对象身份标识，CPython 中为内存地址，全局唯一。
- $\text{type}(o) \in \mathcal{T}$：对象类型，决定支持的操作集合。
- $\text{value}(o)$：对象承载的值，类型由 $\text{type}(o)$ 决定。

类型关系形式化：

$$
\forall o: \text{type}(o) \in \mathcal{T}, \quad \forall t \in \mathcal{T}: \text{type}(t) = \text{type}, \quad \text{type} \prec \text{object}
$$

其中 $\prec$ 表示继承关系（子类 $\prec$ 父类）。

### 3.2 不可变性形式化

类型 $T$ 是不可变的，当且仅当其所有实例的值在创建后不可修改：

$$
\text{Immutable}(T) \iff \forall o \in T, \forall t \geq t_{\text{create}}: \text{value}(o, t) = \text{value}(o, t_{\text{create}})
$$

Python 的不可变类型集合：

$$
\mathcal{T}_{\text{imm}} = \{ \text{int}, \text{float}, \text{complex}, \text{bool}, \text{NoneType}, \text{str}, \text{bytes}, \text{tuple}, \text{frozenset} \}
$$

### 3.3 整数类型形式化

Python 3 的 `int` 类型支持任意精度：

$$
\text{int} = \{ x \in \mathbb{Z} \mid x \text{ 可由任意位数的二进制补码表示} \}
$$

数学上 $\text{int} = \mathbb{Z}$，但受内存限制。算术运算：

- 加法：$a + b$，时间复杂度 $O(\max(\log|a|, \log|b|))$。
- 乘法：$a \times b$，使用 Karatsuba 算法，复杂度 $O(n^{1.585})$，其中 $n$ 为位数。
- 比较：$a < b$，复杂度 $O(\max(\log|a|, \log|b|))$。

### 3.4 IEEE 754 浮点数形式化

`float` 类型遵循 IEEE 754 binary64 标准。一个双精度浮点数 $f$ 表示为：

$$
f = (-1)^s \times 1.m_1 m_2 ... m_{52} \times 2^{e - 1023}
$$

- $s \in \{0, 1\}$：符号位。
- $m_1 m_2 ... m_{52}$：52 位尾数（隐含的前导 1）。
- $e \in [0, 2047]$：11 位指数，偏移量 1023。

特殊值：

- $e = 0, m = 0$：$\pm 0$（零）。
- $e = 0, m \neq 0$：次正规数（subnormal）。
- $e = 2047, m = 0$：$\pm \infty$（无穷）。
- $e = 2047, m \neq 0$：NaN（非数）。

精度界限：$\epsilon_{\text{machine}} = 2^{-52} \approx 2.22 \times 10^{-16}$，即机器 epsilon。

### 3.5 布尔类型形式化

`bool` 是 `int` 的子类：

$$
\text{bool} \prec \text{int}, \quad \text{bool} = \{\text{True}, \text{False}\}, \quad \text{True} = 1, \text{False} = 0
$$

布尔运算：

$$
\begin{aligned}
\text{True} + \text{True} &= 2 \\
\text{True} + \text{False} &= 1 \\
\text{sum}([\text{True}, \text{False}, \text{True}, \text{True}]) &= 3
\end{aligned}
$$

这一设计使得 `sum()` 可用于统计布尔列表中 `True` 的数量，但也带来陷阱：`isinstance(True, int)` 返回 `True`。

### 3.6 字符串形式化

Python 3 的 `str` 类型是 Unicode 字符序列：

$$
\text{str} = \text{Sequence}[\text{CodePoint}], \quad \text{CodePoint} \in [0, 0x10FFFF]
$$

每个 Unicode 码点（code point）是 0 到 0x10FFFF 的整数。字符串长度是码点数量：

$$
\text{len}(s) = |\text{CodePoints}(s)|
$$

CPython 内部使用三种编码之一存储字符串：

- Latin-1（1 字节/字符）：纯 ASCII 或 Latin-1 字符。
- UCS-2（2 字节/字符）：基本多语言平面（BMP）字符。
- UCS-4（4 字节/字符）：包含辅助平面字符（如 emoji）。

选择策略：根据字符串中最大码点自动选择最紧凑的编码。

### 3.7 字节类型形式化

`bytes` 是不可变的字节序列：

$$
\text{bytes} = \text{Sequence}[\text{Byte}], \quad \text{Byte} \in [0, 255]
$$

`bytearray` 是可变版本：

$$
\text{bytearray} = \text{MutableSequence}[\text{Byte}]
$$

`memoryview` 是缓冲区协议的视图：

$$
\text{memoryview} = \text{View}[\text{Buffer}]
$$

允许在不复制数据的情况下访问底层缓冲区。

### 3.8 类型转换形式化

类型转换函数 $\text{convert}(v, T)$ 将值 $v$ 转换为类型 $T$：

$$
\text{convert}(v, T) = \begin{cases}
T(v) & \text{if } v \text{ 可表示为 } T \\
\text{ValueError} & \text{if } v \text{ 格式无效} \\
\text{OverflowError} & \text{if } v \text{ 超出 } T \text{ 范围}
\end{cases}
$$

常见转换：

- $\text{convert}(\text{"42"}, \text{int}) = 42$
- $\text{convert}(\text{"3.14"}, \text{float}) = 3.14$
- $\text{convert}(3.14, \text{int}) = 3$（向零取整）
- $\text{convert}(42, \text{str}) = \text{"42"}$
- $\text{convert}(\text{"hello"}, \text{bytes}, \text{encoding="utf-8"}) = b\text{"hello"}$

## 4. 理论推导

### 4.1 小整数缓存的数学依据

CPython 缓存了 `[-5, 256]` 范围内的整数对象。这一设计的依据：

**命题**：小整数的使用频率服从重尾分布，缓存 `[-5, 256]` 可覆盖大多数实际使用。

**论证**：

1. 循环索引、数组下标、布尔运算结果集中在小整数范围。
2. Python 内部大量使用小整数（如哈希值、引用计数初始值）。
3. 缓存范围的选择是经验性的：扩大范围增加内存开销，缩小范围降低命中率。

**身份等价性**：

$$
\forall x \in [-5, 256], \forall a, b: (a = x \land b = x) \implies \text{id}(a) = \text{id}(b)
$$

即同一小整数的所有引用指向同一对象。这使得 `a is b` 在此范围内为 `True`：

```python
>>> a = 100
>>> b = 100
>>> a is b
True
>>> a = 1000
>>> b = 1000
>>> a is b
False  # 大整数不缓存
```

### 4.2 字符串驻留机制

字符串驻留（interning）是 Python 的内存优化机制。符合标识符规则的字符串（仅含字母、数字、下划线）会被自动驻留：

**命题**：字符串驻留使得相同内容的字符串共享同一对象，节省内存并加速比较。

**驻留规则**（CPython 实现）：

1. 标识符形式的字符串字面量自动驻留。
2. 通过 `sys.intern()` 显式驻留。
3. 模块编译时常量折叠的字符串结果驻留。
4. 长字符串、含特殊字符的字符串不自动驻留。

```python
>>> a = "hello"
>>> b = "hello"
>>> a is b
True  # 标识符形式，自动驻留

>>> a = "hello world"
>>> b = "hello world"
>>> a is b
False  # 含空格，不自动驻留

>>> import sys
>>> a = sys.intern("hello world")
>>> b = sys.intern("hello world")
>>> a is b
True  # 显式驻留
```

### 4.3 IEEE 754 精度误差分析

**定理**：十进制小数 $0.1$ 无法被 IEEE 754 binary64 精确表示。

**证明**：

$0.1$ 的二进制表示是无限循环小数：

$$
0.1_{10} = 0.000\overline{1100}_2 = 0.0 \ 0011 \ 0011 \ 0011 \ ...
$$

IEEE 754 binary64 的尾数为 52 位，截断后：

$$
0.1 \approx 1.1001100110011001100110011001100110011001100110011010 \times 2^{-4}
$$

实际存储值：

$$
0.1_{\text{float}} = 0.1000000000000000055511151231257827021181583404541015625
$$

误差约为 $5.55 \times 10^{-18}$，在显示时被舍入为 `0.1`，但累加后误差暴露：

$$
0.1 + 0.2 = 0.30000000000000004 \neq 0.3
$$

**精度界限**：任何不在 $\frac{p}{2^q}$（$p, q$ 为整数）形式的十进制小数都无法精确表示。

### 4.4 浮点比较的容差方法

由于浮点误差，直接比较 `a == b` 不可靠。常用容差方法：

**绝对容差**：

$$
|a - b| < \epsilon_{\text{abs}}
$$

适用于值范围已知且较小的场景。

**相对容差**：

$$
\frac{|a - b|}{\max(|a|, |b|)} < \epsilon_{\text{rel}}
$$

适用于值范围较大的场景。

**ULP（Unit in the Last Place）方法**：

$$
\text{ULP}(a, b) = \left| \text{int}(a) - \text{int}(b) \right| < \text{tolerance}
$$

将浮点数的位模式作为整数比较，最精确。

Python 的 `math.isclose()` 函数结合了绝对与相对容差：

```python
import math

# 默认：相对容差 1e-9，绝对容差 0.0
math.isclose(0.1 + 0.2, 0.3)  # True

# 自定义容差
math.isclose(a, b, rel_tol=1e-6, abs_tol=1e-9)
```

### 4.5 Decimal 的精度模型

`decimal.Decimal` 使用十进制浮点运算，精度由上下文（context）控制：

$$
\text{Decimal}(x) = (-1)^s \times \text{coefficient} \times 10^{\text{exponent}}
$$

- $\text{coefficient}$：整数系数，任意精度。
- $\text{exponent}$：整数指数。
- 精度 `prec`：系数的最大有效位数。

默认上下文：`prec = 28`，即 28 位有效数字。

```python
from decimal import Decimal, getcontext

# 默认精度 28
getcontext().prec = 28
Decimal('0.1') + Decimal('0.2')  # Decimal('0.3')

# 设置更高精度
getcontext().prec = 50
Decimal(1) / Decimal(7)  # 50 位有效数字
```

### 4.6 整数任意精度的性能分析

Python 整数的任意精度带来性能代价：

| 操作 | C `int`（64位） | Python `int`（小整数） | Python `int`（大整数） |
|------|----------------|----------------------|----------------------|
| 加法 | $O(1)$ | $O(1)$ | $O(n)$，$n$ 为位数 |
| 乘法 | $O(1)$ | $O(1)$ | $O(n^{1.585})$（Karatsuba） |
| 除法 | $O(1)$ | $O(1)$ | $O(n^2)$ |
| 比较 | $O(1)$ | $O(1)$ | $O(n)$ |
| 内存 | 8 字节 | 28 字节（小整数） | $O(n)$ 字节 |

**实践建议**：

- 小整数运算性能接近 C，可放心使用。
- 大整数运算（如 RSA 加密、大数因子分解）需注意性能。
- 科学计算应使用 `numpy` 的固定精度整数（`int64`、`uint64`）。

### 4.7 字符串编码的性能分析

CPython 字符串的内部编码影响性能：

| 编码 | 字符宽度 | 适用场景 | 内存（每个 ASCII 字符） |
|------|---------|---------|----------------------|
| Latin-1 | 1 字节 | 纯 ASCII/Latin-1 | 1 字节 |
| UCS-2 | 2 字节 | BMP 字符（含中文） | 2 字节 |
| UCS-4 | 4 字节 | 全 Unicode（含 emoji） | 4 字节 |

字符串的内部编码自动选择，开发者通常无需关心。但需注意：

- 中文字符串通常使用 UCS-2 存储，内存占用是 ASCII 字符串的 2 倍。
- 含 emoji 的字符串使用 UCS-4，内存占用是 ASCII 的 4 倍。
- 大量字符串处理时，编码选择显著影响内存与性能。

### 4.8 布尔作为整数子类的影响

`bool` 继承自 `int` 带来以下影响：

**便利**：

```python
# 统计 True 的数量
flags = [True, False, True, True, False]
count = sum(flags)  # 3

# 布尔作为索引
data = ['a', 'b', 'c']
data[True]  # 'b'，等价于 data[1]
```

**陷阱**：

```python
# isinstance 检查
isinstance(True, int)  # True，可能出乎意料

# 字典键冲突
d = {1: 'int', True: 'bool'}
d  # {1: 'bool'}，True 覆盖了 1
```

设计决策：在需要严格区分 `bool` 与 `int` 的场景，使用 `type(x) is bool` 而非 `isinstance(x, bool)`。

## 5. 代码示例

### 5.1 整数类型与运算

```python
"""
Python 整数类型与运算示例

本模块演示：
1. 任意精度整数的运算
2. 整数的不同进制表示
3. 位运算
4. 整数与浮点数的混合运算
5. 大整数运算的性能测试
"""
import sys
import time


def demo_integer_basics() -> None:
    """演示整数基础运算"""
    # 任意精度整数
    big_num = 10 ** 100  # Googol
    print(f"10^100 = {big_num}")
    print(f"位数: {len(str(big_num))}")  # 101 位

    # 不同进制表示
    decimal_num = 255
    binary_num = 0b11111111      # 二进制
    octal_num = 0o377            # 八进制
    hex_num = 0xff               # 十六进制

    print(f"十进制: {decimal_num}")
    print(f"二进制: {bin(decimal_num)}")      # 0b11111111
    print(f"八进制: {oct(decimal_num)}")      # 0o377
    print(f"十六进制: {hex(decimal_num)}")    # 0xff
    print(f"所有进制相等: {decimal_num == binary_num == octal_num == hex_num}")  # True

    # Python 3.6+ 支持下划线分隔（提高可读性）
    big_num_readable = 1_000_000_000
    print(f"下划线分隔: {big_num_readable}")  # 1000000000


def demo_bit_operations() -> None:
    """演示位运算"""
    a = 0b1100  # 12
    b = 0b1010  # 10

    print(f"a = {a} ({bin(a)})")
    print(f"b = {b} ({bin(b)})")
    print(f"a & b = {a & b} ({bin(a & b)})")   # 按位与: 0b1000 = 8
    print(f"a | b = {a | b} ({bin(a | b)})")   # 按位或: 0b1110 = 14
    print(f"a ^ b = {a ^ b} ({bin(a ^ b)})")   # 按位异或: 0b0110 = 6
    print(f"~a = {~a}")                        # 按位取反: -13
    print(f"a << 2 = {a << 2} ({bin(a << 2)})")  # 左移: 0b110000 = 48
    print(f"a >> 2 = {a >> 2} ({bin(a >> 2)})")  # 右移: 0b11 = 3


def demo_integer_division() -> None:
    """演示 Python 3 的除法语义"""
    a = 17
    b = 5

    # / 总是返回 float
    print(f"{a} / {b} = {a / b}")      # 3.4

    # // 整数除法（向下取整）
    print(f"{a} // {b} = {a // b}")    # 3

    # 注意负数的向下取整
    print(f"-{a} // {b} = {-a // b}")  # -4（不是 -3）

    # % 取模（结果符号与除数一致）
    print(f"{a} % {b} = {a % b}")      # 2
    print(f"-{a} % {b} = {-a % b}")    # 3

    # divmod 同时返回商和余数
    quotient, remainder = divmod(a, b)
    print(f"divmod({a}, {b}) = ({quotient}, {remainder})")  # (3, 2)


def demo_performance_comparison() -> None:
    """对比小整数与大整数的运算性能"""
    # 小整数运算
    start = time.perf_counter()
    for _ in range(10_000_000):
        _ = 1 + 1
    small_int_time = time.perf_counter() - start

    # 大整数运算
    big_a = 10 ** 1000
    big_b = 10 ** 1000
    start = time.perf_counter()
    for _ in range(10_000_000):
        _ = big_a + big_b
    big_int_time = time.perf_counter() - start

    print(f"小整数加法 1000 万次: {small_int_time:.3f}s")
    print(f"大整数加法 1000 万次: {big_int_time:.3f}s")
    print(f"性能比: {big_int_time / small_int_time:.1f}x")


def demo_integer_memory() -> None:
    """演示整数的内存占用"""
    # 小整数（缓存范围内）
    small = 42
    print(f"小整数 {small} 内存: {sys.getsizeof(small)} 字节")  # 28 字节

    # 大整数
    big = 10 ** 100
    print(f"大整数 10^100 内存: {sys.getsizeof(big)} 字节")    # 约 60 字节

    # 对比 C 语言的 int（4 字节）
    print(f"Python int 是 C int 的 {sys.getsizeof(42) / 4} 倍")


if __name__ == '__main__':
    print("=== 整数基础 ===")
    demo_integer_basics()
    print("\n=== 位运算 ===")
    demo_bit_operations()
    print("\n=== 除法语义 ===")
    demo_integer_division()
    print("\n=== 性能对比 ===")
    demo_performance_comparison()
    print("\n=== 内存占用 ===")
    demo_integer_memory()
```

### 5.2 浮点数与精度陷阱

```python
"""
Python 浮点数与精度陷阱示例

本模块演示：
1. IEEE 754 浮点数的基本特性
2. 精度误差的经典案例
3. 浮点比较的正确方法
4. 特殊值：无穷大、NaN
5. 浮点数的显示与实际值
"""
import math
import sys


def demo_float_precision() -> None:
    """演示浮点精度问题"""
    # 经典案例：0.1 + 0.2 != 0.3
    result = 0.1 + 0.2
    expected = 0.3
    print(f"0.1 + 0.2 = {result}")
    print(f"0.3       = {expected}")
    print(f"相等: {result == expected}")  # False
    print(f"差值: {result - expected}")   # 5.551115123125783e-17

    # 显示更多小数位
    print(f"\n0.1 的实际值: {0.1:.30f}")
    print(f"0.2 的实际值: {0.2:.30f}")
    print(f"0.3 的实际值: {0.3:.30f}")

    # 大数运算的精度损失
    big = 1e16
    print(f"\n1e16 + 1 = {big + 1}")      # 1e16，精度丢失
    print(f"1e16 + 1 == 1e16: {big + 1 == big}")  # True

    # 浮点数的舍入误差
    total = 0.0
    for _ in range(10):
        total += 0.1
    print(f"\n0.1 累加 10 次: {total}")    # 0.9999999999999999
    print(f"等于 1.0: {total == 1.0}")    # False


def demo_float_comparison() -> None:
    """演示浮点数的正确比较方法"""
    a = 0.1 + 0.2
    b = 0.3

    # 错误：直接比较
    print(f"直接比较 a == b: {a == b}")  # False

    # 正确：使用 math.isclose
    print(f"math.isclose(a, b): {math.isclose(a, b)}")  # True

    # 自定义容差比较
    def almost_equal(x: float, y: float, tolerance: float = 1e-9) -> bool:
        """浮点数容差比较"""
        return abs(x - y) < tolerance

    print(f"almost_equal(a, b): {almost_equal(a, b)}")

    # 相对容差比较（适用于大数）
    def relative_equal(x: float, y: float, rel_tol: float = 1e-9) -> bool:
        """相对容差比较"""
        return abs(x - y) <= rel_tol * max(abs(x), abs(y))

    print(f"relative_equal(1e10, 1e10 + 1): {relative_equal(1e10, 1e10 + 1)}")


def demo_special_values() -> None:
    """演示浮点数的特殊值"""
    # 无穷大
    positive_inf = float('inf')
    negative_inf = float('-inf')
    print(f"正无穷: {positive_inf}")
    print(f"负无穷: {negative_inf}")
    print(f"1 / 0 触发异常（Python 不允许）")
    try:
        1 / 0
    except ZeroDivisionError as e:
        print(f"ZeroDivisionError: {e}")

    # 但 1.0 / 0.0 也是异常
    # 浮点的无穷大通过其他方式获得
    print(f"float('inf') > 1e308: {positive_inf > 1e308}")
    print(f"inf + 1 == inf: {positive_inf + 1 == positive_inf}")
    print(f"inf - inf: {positive_inf - negative_inf}")  # inf
    print(f"inf - inf（同号）: {positive_inf - positive_inf}")  # nan

    # NaN（非数）
    nan = float('nan')
    print(f"\nNaN: {nan}")
    print(f"NaN == NaN: {nan == nan}")  # False（NaN 不等于任何值，包括自己）
    print(f"NaN != NaN: {nan != nan}")  # True
    print(f"math.isnan(nan): {math.isnan(nan)}")  # 正确的 NaN 检测方法

    # 检测无穷大
    print(f"math.isinf(positive_inf): {math.isinf(positive_inf)}")


def demo_float_limits() -> None:
    """演示浮点数的限制"""
    print(f"最大浮点数: {sys.float_info.max}")           # 约 1.8e308
    print(f"最小正浮点数: {sys.float_info.min}")         # 约 2.2e-308
    print(f"机器 epsilon: {sys.float_info.epsilon}")     # 约 2.2e-16
    print(f"有效位数: {sys.float_info.dig}")             # 15
    print(f"尾数位数: {sys.float_info.mant_dig}")        # 53

    # 溢出为无穷大
    big = sys.float_info.max
    print(f"\nmax * 2 = {big * 2}")  # inf（溢出）

    # 下溢为零
    small = sys.float_info.min
    print(f"min / 2 = {small / 2}")  # 0.0（下溢）


def demo_decimal_for_finance() -> None:
    """演示 Decimal 在金融场景的应用"""
    from decimal import Decimal, ROUND_HALF_UP, getcontext

    # 浮点数计算金额（错误做法）
    float_prices = [19.99, 5.49, 3.50]
    float_total = sum(float_prices)
    print(f"浮点求和: {float_total}")  # 28.980000000000004

    # Decimal 计算金额（正确做法）
    decimal_prices = [Decimal('19.99'), Decimal('5.49'), Decimal('3.50')]
    decimal_total = sum(decimal_prices)
    print(f"Decimal 求和: {decimal_total}")  # 28.98

    # 精确的货币计算
    price = Decimal('19.99')
    quantity = Decimal('3')
    tax_rate = Decimal('0.08')

    subtotal = price * quantity
    tax = subtotal * tax_rate
    total = subtotal + tax

    # 四舍五入到分
    total_rounded = total.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    print(f"单价: {price}, 数量: {quantity}")
    print(f"小计: {subtotal}")
    print(f"税额: {tax}")
    print(f"总计: {total}")
    print(f"四舍五入: {total_rounded}")


if __name__ == '__main__':
    print("=== 浮点精度 ===")
    demo_float_precision()
    print("\n=== 浮点比较 ===")
    demo_float_comparison()
    print("\n=== 特殊值 ===")
    demo_special_values()
    print("\n=== 浮点限制 ===")
    demo_float_limits()
    print("\n=== Decimal 金融场景 ===")
    demo_decimal_for_finance()
```

### 5.3 字符串与编码

```python
"""
Python 字符串与编码示例

本模块演示：
1. Unicode 字符串与字节串的区别
2. 字符编码转换（UTF-8、GBK、UTF-16）
3. 字符串的常用操作
4. 原始字符串与转义
5. 字符串格式化
"""
import sys


def demo_str_vs_bytes() -> None:
    """演示 str 与 bytes 的区别"""
    # str 是 Unicode 字符序列
    text = "你好，Python"
    print(f"str: {text}")
    print(f"类型: {type(text)}")
    print(f"长度（字符数）: {len(text)}")  # 9

    # bytes 是字节序列
    encoded_utf8 = text.encode('utf-8')
    print(f"\nUTF-8 编码: {encoded_utf8}")
    print(f"类型: {type(encoded_utf8)}")
    print(f"长度（字节数）: {len(encoded_utf8)}")  # 17（中文 3 字节，英文 1 字节）

    encoded_gbk = text.encode('gbk')
    print(f"GBK 编码: {encoded_gbk}")
    print(f"长度: {len(encoded_gbk)}")  # 13（中文 2 字节）

    # 解码
    decoded = encoded_utf8.decode('utf-8')
    print(f"\n解码后: {decoded}")
    print(f"与原文相同: {decoded == text}")

    # 编码错误处理
    bad_bytes = b'\xff\xfe'
    try:
        bad_bytes.decode('utf-8')
    except UnicodeDecodeError as e:
        print(f"解码错误: {e}")

    # 错误处理策略
    print(f"ignore: {bad_bytes.decode('utf-8', errors='ignore')}")  # 忽略错误字节
    print(f"replace: {bad_bytes.decode('utf-8', errors='replace')}")  # 替换为 ?


def demo_string_operations() -> None:
    """演示字符串常用操作"""
    s = "Hello, World"

    # 索引与切片
    print(f"原字符串: {s}")
    print(f"s[0]: {s[0]}")           # H
    print(f"s[-1]: {s[-1]}")         # d
    print(f"s[0:5]: {s[0:5]}")       # Hello
    print(f"s[:5]: {s[:5]}")         # Hello
    print(f"s[7:]: {s[7:]}")         # World
    print(f"s[::-1]: {s[::-1]}")     # dlroW ,olleH（反转）

    # 字符串方法
    print(f"upper: {s.upper()}")
    print(f"lower: {s.lower()}")
    print(f"title: {s.title()}")
    print(f"capitalize: {s.capitalize()}")
    print(f"swapcase: {s.swapcase()}")

    # 查找与替换
    print(f"find 'World': {s.find('World')}")    # 7
    print(f"find 'Python': {s.find('Python')}")  # -1（未找到）
    print(f"replace: {s.replace('World', 'Python')}")

    # 分割与连接
    parts = "a,b,c,d".split(',')
    print(f"split: {parts}")
    print(f"join: {','.join(parts)}")

    # 判断方法
    print(f"'123'.isdigit(): {'123'.isdigit()}")     # True
    print(f"'abc'.isalpha(): {'abc'.isalpha()}")     # True
    print(f"'abc123'.isalnum(): {'abc123'.isalnum()}")  # True
    print(f"'  '.isspace(): {'  '.isspace()}")       # True


def demo_string_formats() -> None:
    """演示字符串格式化方法"""
    name = "Alice"
    age = 30
    score = 95.6789

    # 1. %-formatting（旧式，不推荐）
    old_style = "姓名: %s, 年龄: %d, 分数: %.2f" % (name, age, score)
    print(f"%-formatting: {old_style}")

    # 2. str.format()
    format_method = "姓名: {}, 年龄: {}, 分数: {:.2f}".format(name, age, score)
    print(f"str.format(): {format_method}")

    # 命名参数
    named = "姓名: {n}, 年龄: {a}".format(n=name, a=age)
    print(f"命名参数: {named}")

    # 3. f-string（Python 3.6+，推荐）
    f_string = f"姓名: {name}, 年龄: {age}, 分数: {score:.2f}"
    print(f"f-string: {f_string}")

    # f-string 表达式
    print(f"明年年龄: {age + 1}")
    print(f"姓名大写: {name.upper()}")
    print(f"列表: {[x * 2 for x in range(3)]}")

    # f-string 调试（Python 3.8+）
    x = 42
    print(f"{x = }")  # x = 42

    # 对齐与填充
    print(f"{'左对齐':<10}|")
    print(f"{'右对齐':>10}|")
    print(f"{'居中':^10}|")
    print(f"{'填充':*^10}|")

    # 数字格式化
    print(f"二进制: {42:b}")        # 101010
    print(f"八进制: {42:o}")        # 52
    print(f"十六进制: {42:x}")      # 2a
    print(f"科学计数: {123456.789:e}")  # 1.234568e+05
    print(f"千分位: {1234567:,}")   # 1,234,567


def demo_raw_strings() -> None:
    """演示原始字符串与转义"""
    # 普通字符串中的转义
    normal = "Hello\nWorld\tTab"
    print(f"普通字符串: {normal}")

    # 原始字符串（不处理转义）
    raw = r"Hello\nWorld\tTab"
    print(f"原始字符串: {raw}")

    # 正则表达式使用原始字符串
    import re
    pattern = r"\d+\.\d+"  # 匹配浮点数
    text = "价格 19.99 元"
    match = re.search(pattern, text)
    if match:
        print(f"匹配: {match.group()}")

    # Windows 文件路径
    path_normal = "C:\\Users\\Alice\\Documents"
    path_raw = r"C:\Users\Alice\Documents"
    print(f"普通路径: {path_normal}")
    print(f"原始路径: {path_raw}")
    print(f"路径相等: {path_normal == path_raw}")


def demo_string_memory() -> None:
    """演示字符串的内存占用"""
    # ASCII 字符串（Latin-1 编码）
    ascii_str = "a" * 1000
    print(f"ASCII 字符串 1000 字符: {sys.getsizeof(ascii_str)} 字节")

    # 中文字符串（UCS-2 编码）
    chinese_str = "中" * 1000
    print(f"中文字符串 1000 字符: {sys.getsizeof(chinese_str)} 字节")

    # 含 emoji 的字符串（UCS-4 编码）
    emoji_str = "🎉" * 1000
    print(f"emoji 字符串 1000 字符: {sys.getsizeof(emoji_str)} 字节")

    # 字符串驻留测试
    a = "interned_string"
    b = "interned_string"
    print(f"\n标识符形式驻留: {a is b}")  # True

    c = "interned string"  # 含空格
    d = "interned string"
    print(f"含空格不驻留: {c is d}")  # False（通常）

    # 显式驻留
    import sys as sys_module
    e = sys_module.intern("interned string")
    f = sys_module.intern("interned string")
    print(f"显式驻留: {e is f}")  # True


if __name__ == '__main__':
    print("=== str 与 bytes ===")
    demo_str_vs_bytes()
    print("\n=== 字符串操作 ===")
    demo_string_operations()
    print("\n=== 字符串格式化 ===")
    demo_string_formats()
    print("\n=== 原始字符串 ===")
    demo_raw_strings()
    print("\n=== 字符串内存 ===")
    demo_string_memory()
```

### 5.4 布尔类型与 None

```python
"""
Python 布尔类型与 None 示例

本模块演示：
1. 布尔值的基本运算
2. bool 作为 int 子类的特性
3. 真值测试（truthiness）
4. None 的语义与使用
5. 短路求值
"""


def demo_bool_basics() -> None:
    """演示布尔值基础"""
    # 布尔字面量
    t = True
    f = False
    print(f"True: {t}, 类型: {type(t)}")
    print(f"False: {f}, 类型: {type(f)}")

    # 布尔运算
    print(f"True and False: {True and False}")  # False
    print(f"True or False: {True or False}")    # True
    print(f"not True: {not True}")              # False

    # 比较运算返回布尔值
    print(f"1 < 2: {1 < 2}")        # True
    print(f"1 == 1.0: {1 == 1.0}")  # True（int 与 float 比较）
    print(f"'a' < 'b': {'a' < 'b'}")  # True

    # bool 是 int 的子类
    print(f"\nbool 是 int 子类: {issubclass(bool, int)}")  # True
    print(f"isinstance(True, int): {isinstance(True, int)}")  # True
    print(f"True + True: {True + True}")      # 2
    print(f"True + False: {True + False}")    # 1
    print(f"sum([True, False, True, True]): {sum([True, False, True, True])}")  # 3


def demo_truthiness() -> None:
    """演示真值测试（truthiness）"""
    # 以下值在布尔上下文中为 False
    falsy_values = [False, None, 0, 0.0, 0j, '', [], {}, set(), frozenset()]
    print("假值列表:")
    for val in falsy_values:
        print(f"  bool({val!r}) = {bool(val)}")

    # 其他所有值为 True
    truthy_values = [True, 1, -1, 0.1, 'a', [0], {0: 0}, {0}]
    print("\n真值示例:")
    for val in truthy_values:
        print(f"  bool({val!r}) = {bool(val)}")

    # 自定义对象的真值
    class EmptyContainer:
        """通过 __len__ 定义真值"""
        def __len__(self):
            return 0

    class TruthyObject:
        """默认为 True"""
        pass

    print(f"\nbool(EmptyContainer()): {bool(EmptyContainer())}")  # False
    print(f"bool(TruthyObject()): {bool(TruthyObject())}")       # True

    # 使用真值测试简化代码
    data = []
    # 冗长写法
    if len(data) == 0:
        print("数据为空")
    # Pythonic 写法
    if not data:
        print("数据为空（Pythonic）")


def demo_short_circuit() -> None:
    """演示短路求值"""
    # and 短路：第一个为 False 时，不计算第二个
    def expensive_operation():
        print("  expensive_operation 被调用")
        return True

    print("and 短路:")
    result = False and expensive_operation()  # 不会调用
    print(f"  结果: {result}")

    # or 短路：第一个为 True 时，不计算第二个
    print("\nor 短路:")
    result = True or expensive_operation()  # 不会调用
    print(f"  结果: {result}")

    # 利用短路避免错误
    user = None
    # 安全访问（避免 AttributeError）
    name = user and user.get('name')  # 如果 user 为 None，返回 None
    print(f"\n安全访问: {name}")

    # 等价于
    name = user.get('name') if user else None
    print(f"条件表达式: {name}")

    # 默认值模式
    config = {}
    timeout = config.get('timeout') or 30  # 如果 timeout 为 None 或 0，使用 30
    print(f"默认值: {timeout}")


def demo_none_usage() -> None:
    """演示 None 的使用"""
    # None 表示"无"或"未定义"
    x = None
    print(f"x: {x}, 类型: {type(x)}")
    print(f"x is None: {x is None}")  # True（使用 is 而非 ==）

    # None 作为默认参数（陷阱：可变默认参数）
    def append_to_list(value, lst=None):
        """
        向列表追加值（正确处理 None 默认值）

        参数:
            value: 要追加的值
            lst: 目标列表，None 时创建新列表
        返回:
            追加后的列表
        """
        if lst is None:
            lst = []
        lst.append(value)
        return lst

    # 正确：每次调用创建新列表
    print(append_to_list(1))  # [1]
    print(append_to_list(2))  # [2]（不是 [1, 2]）

    # None 作为"未提供"的标记
    def greet(name=None):
        """
        问候函数

        参数:
            name: 名字，None 时使用默认问候
        """
        if name is None:
            return "Hello, stranger!"
        return f"Hello, {name}!"

    print(greet())         # Hello, stranger!
    print(greet("Alice"))  # Hello, Alice!

    # 区分 None 与 False/0
    def process(value):
        """
        处理值，区分 None 与其他假值

        参数:
            value: 输入值
        """
        if value is None:
            return "未提供"
        elif not value:
            return f"假值: {value}"
        else:
            return f"真值: {value}"

    print(process(None))   # 未提供
    print(process(0))      # 假值: 0
    print(process(False))  # 假值: False
    print(process(1))      # 真值: 1


def demo_null_object_pattern() -> None:
    """演示空对象模式（替代 None 检查）"""
    from typing import Protocol, Optional

    class Logger(Protocol):
        """日志协议"""
        def log(self, message: str) -> None:
            ...

    class ConsoleLogger:
        """控制台日志"""
        def log(self, message: str) -> None:
            print(f"[CONSOLE] {message}")

    class NullLogger:
        """空日志（什么都不做）"""
        def log(self, message: str) -> None:
            pass  # 空实现

    def do_work(logger: Optional[Logger] = None) -> None:
        """
        执行工作

        参数:
            logger: 日志器，None 时使用空日志
        """
        # 使用空对象模式，避免 if logger is not None 检查
        actual_logger = logger if logger is not None else NullLogger()
        actual_logger.log("开始工作")
        actual_logger.log("工作完成")

    print("使用控制台日志:")
    do_work(ConsoleLogger())

    print("\n不传日志（使用空对象）:")
    do_work()  # 不输出日志


if __name__ == '__main__':
    print("=== 布尔基础 ===")
    demo_bool_basics()
    print("\n=== 真值测试 ===")
    demo_truthiness()
    print("\n=== 短路求值 ===")
    demo_short_circuit()
    print("\n=== None 使用 ===")
    demo_none_usage()
    print("\n=== 空对象模式 ===")
    demo_null_object_pattern()
```

### 5.5 类型转换与 Decimal/Fraction

```python
"""
Python 类型转换与高精度数值示例

本模块演示：
1. 显式类型转换
2. 隐式类型转换（强制转换）
3. Decimal 高精度十进制运算
4. Fraction 有理数运算
5. 数值类型的选型决策
"""
from decimal import Decimal, getcontext, localcontext
from fractions import Fraction
import math


def demo_explicit_conversion() -> None:
    """演示显式类型转换"""
    # 字符串转数字
    print("字符串转数字:")
    print(f"  int('42'): {int('42')}")           # 42
    print(f"  int('0xff', 16): {int('0xff', 16)}")  # 255
    print(f"  int('1010', 2): {int('1010', 2)}")  # 10
    print(f"  float('3.14'): {float('3.14')}")   # 3.14

    # 数字转字符串
    print("\n数字转字符串:")
    print(f"  str(42): {str(42)}")
    print(f"  str(3.14): {str(3.14)}")
    print(f"  repr(3.14): {repr(3.14)}")

    # 数字之间转换
    print("\n数字转换:")
    print(f"  int(3.14): {int(3.14)}")    # 3（向零取整）
    print(f"  int(-3.14): {int(-3.14)}")  # -3（向零取整）
    print(f"  int(3.99): {int(3.99)}")    # 3
    print(f"  float(42): {float(42)}")    # 42.0
    print(f"  round(3.14): {round(3.14)}")  # 3
    print(f"  round(3.5): {round(3.5)}")   # 4（银行家舍入）
    print(f"  round(2.5): {round(2.5)}")   # 2（银行家舍入，向偶数）
    print(f"  math.trunc(3.7): {math.trunc(3.7)}")  # 3（向零取整）
    print(f"  math.floor(3.7): {math.floor(3.7)}")  # 3（向下取整）
    print(f"  math.ceil(3.2): {math.ceil(3.2)}")    # 4（向上取整）

    # 转换失败
    try:
        int("not a number")
    except ValueError as e:
        print(f"\n  转换失败: {e}")


def demo_implicit_conversion() -> None:
    """演示隐式类型转换"""
    # int 与 float 运算，int 自动转为 float
    result = 1 + 2.0
    print(f"1 + 2.0 = {result}, 类型: {type(result)}")  # 3.0, float

    # int 与 complex 运算，int 自动转为 complex
    result = 1 + 2j
    print(f"1 + 2j = {result}, 类型: {type(result)}")  # (1+2j), complex

    # bool 与 int 运算，bool 自动转为 int
    result = True + 1
    print(f"True + 1 = {result}, 类型: {type(result)}")  # 2, int

    # 类型提升规则
    # bool < int < float < complex
    # 运算结果类型为"更宽"的类型

    # 注意：str 不自动转换
    try:
        "count: " + 42  # TypeError
    except TypeError as e:
        print(f"\nstr + int 错误: {e}")

    # 必须显式转换
    result = "count: " + str(42)
    print(f"显式转换: {result}")


def demo_decimal_advanced() -> None:
    """演示 Decimal 高级用法"""
    # 设置全局精度
    getcontext().prec = 28

    # 基本运算
    a = Decimal('0.1')
    b = Decimal('0.2')
    print(f"Decimal('0.1') + Decimal('0.2') = {a + b}")  # 0.3
    print(f"float 0.1 + 0.2 = {0.1 + 0.2}")              # 0.30000000000000004

    # 从 float 创建 Decimal（注意：会有精度问题）
    from_float = Decimal(0.1)
    print(f"\nDecimal(0.1) = {from_float}")  # 0.1000000000000000055511151231257827021181583404541015625

    # 从 str 创建 Decimal（推荐）
    from_str = Decimal('0.1')
    print(f"Decimal('0.1') = {from_str}")  # 0.1

    # 使用 localcontext 临时修改精度
    with localcontext() as ctx:
        ctx.prec = 50
        pi = Decimal('3.14159265358979323846264338327950288419716939937510')
        print(f"\n50 位精度的 pi: {pi}")
        print(f"pi * 2 = {pi * 2}")

    # 精度恢复
    print(f"外部精度: {getcontext().prec}")  # 28

    # 舍入模式
    from decimal import ROUND_HALF_UP, ROUND_DOWN, ROUND_CEILING, ROUND_FLOOR

    value = Decimal('2.675')
    print(f"\n舍入 2.675 到 2 位小数:")
    print(f"  ROUND_HALF_UP: {value.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)}")  # 2.68
    print(f"  ROUND_DOWN: {value.quantize(Decimal('0.01'), rounding=ROUND_DOWN)}")        # 2.67
    print(f"  ROUND_CEILING: {value.quantize(Decimal('0.01'), rounding=ROUND_CEILING)}")  # 2.68
    print(f"  ROUND_FLOOR: {value.quantize(Decimal('0.01'), rounding=ROUND_FLOOR)}")      # 2.67

    # 注意：浮点的 2.675 实际是 2.67499999999999982236431605997495353221893310546875
    print(f"\nfloat 2.675 的实际值: {Decimal(2.675)}")
    print(f"round(2.675, 2) = {round(2.675, 2)}")  # 2.67（不是 2.68！）


def demo_fraction() -> None:
    """演示 Fraction 有理数运算"""
    # 创建 Fraction
    f1 = Fraction(1, 3)  # 1/3
    f2 = Fraction(2, 6)  # 2/6，自动约分为 1/3
    print(f"Fraction(1, 3) = {f1}")
    print(f"Fraction(2, 6) = {f2}")  # 1/3
    print(f"f1 == f2: {f1 == f2}")   # True

    # 从字符串创建
    f3 = Fraction('0.5')  # 1/2
    f4 = Fraction('1/4')
    print(f"\nFraction('0.5') = {f3}")
    print(f"Fraction('1/4') = {f4}")

    # 运算（精确，无误差）
    print(f"\n1/3 + 1/4 = {f1 + f4}")  # 7/12
    print(f"1/3 - 1/4 = {f1 - f4}")  # 1/12
    print(f"1/3 * 1/4 = {f1 * f4}")  # 1/12
    print(f"1/3 / 1/4 = {f1 / f4}")  # 4/3

    # 解决浮点精度问题
    print(f"\n0.1 + 0.2 (float) = {0.1 + 0.2}")
    print(f"Fraction(1, 10) + Fraction(2, 10) = {Fraction(1, 10) + Fraction(2, 10)}")  # 3/10

    # 从 float 创建 Fraction（捕获 float 的实际值）
    from_float = Fraction(0.1)
    print(f"\nFraction(0.1) = {from_float}")  # 复杂分数
    # 使用 limit_denominator 获取"接近"的简单分数
    approx = from_float.limit_denominator(100)
    print(f"limit_denominator(100): {approx}")  # 1/10

    # 转换为 float
    print(f"float(Fraction(1, 3)) = {float(Fraction(1, 3))}")  # 0.3333...


def demo_numeric_choice() -> None:
    """演示数值类型的选型决策"""
    import timeit

    # 性能对比
    setup = "from decimal import Decimal; from fractions import Fraction"

    float_time = timeit.timeit("0.1 + 0.2", number=1_000_000)
    decimal_time = timeit.timeit(
        "Decimal('0.1') + Decimal('0.2')",
        setup=setup,
        number=1_000_000
    )
    fraction_time = timeit.timeit(
        "Fraction(1, 10) + Fraction(2, 10)",
        setup=setup,
        number=1_000_000
    )

    print("100 万次加法性能对比:")
    print(f"  float:    {float_time:.3f}s")
    print(f"  Decimal:  {decimal_time:.3f}s")
    print(f"  Fraction: {fraction_time:.3f}s")
    print(f"  Decimal 慢 {decimal_time / float_time:.1f}x")
    print(f"  Fraction 慢 {fraction_time / float_time:.1f}x")

    # 选型建议表
    print("\n数值类型选型建议:")
    print("  - 科学计算、图形、游戏：float（性能优先）")
    print("  - 金融、会计、货币：Decimal（精度优先）")
    print("  - 数学计算、分数运算：Fraction（精确有理数）")
    print("  - 大整数（RSA、密码学）：int（任意精度）")


if __name__ == '__main__':
    print("=== 显式转换 ===")
    demo_explicit_conversion()
    print("\n=== 隐式转换 ===")
    demo_implicit_conversion()
    print("\n=== Decimal 高级 ===")
    demo_decimal_advanced()
    print("\n=== Fraction ===")
    demo_fraction()
    print("\n=== 数值选型 ===")
    demo_numeric_choice()
```

### 5.6 bytes、bytearray 与 memoryview

```python
"""
Python 二进制数据类型示例

本模块演示：
1. bytes 与 bytearray 的区别
2. 字节序处理（大端、小端）
3. struct 模块处理二进制协议
4. memoryview 零拷贝访问
5. 十六进制与 Base64 编码
"""
import struct
from base64 import b64encode, b64decode


def demo_bytes_bytearray() -> None:
    """演示 bytes 与 bytearray"""
    # bytes 不可变
    b = b'hello'
    print(f"bytes: {b}, 类型: {type(b)}")
    try:
        b[0] = ord('H')  # TypeError: 'bytes' object does not support item assignment
    except TypeError as e:
        print(f"  修改失败: {e}")

    # bytearray 可变
    ba = bytearray(b'hello')
    print(f"\nbytearray: {ba}, 类型: {type(ba)}")
    ba[0] = ord('H')  # 修改成功
    print(f"  修改后: {ba}")
    ba.extend(b' world')
    print(f"  追加后: {ba}")

    # 创建方式
    print("\n创建方式:")
    print(f"  bytes(5): {bytes(5)}")              # b'\x00\x00\x00\x00\x00'
    print(f"  bytes([65, 66, 67]): {bytes([65, 66, 67])}")  # b'ABC'
    print(f"  bytes.fromhex('48656c6c6f'): {bytes.fromhex('48656c6c6f')}")  # b'Hello'

    # 字节遍历
    print("\n字节遍历:")
    for byte in b'ABC':
        print(f"  {byte} ({chr(byte)})")

    # hex() 与 fromhex()
    data = b'\x00\x01\x02\xff'
    print(f"\nhex(): {data.hex()}")  # 000102ff
    print(f"hex('-'): {data.hex('-')}")  # 00-01-02-ff


def demo_byte_order() -> None:
    """演示字节序处理"""
    # 整数的字节序
    num = 0x12345678

    # 大端序（网络字节序）
    big_endian = num.to_bytes(4, byteorder='big')
    print(f"{num:#x} 大端: {big_endian.hex()}")  # 12345678

    # 小端序（x86 默认）
    little_endian = num.to_bytes(4, byteorder='little')
    print(f"{num:#x} 小端: {little_endian.hex()}")  # 78563412

    # 从字节恢复
    restored_big = int.from_bytes(big_endian, byteorder='big')
    restored_little = int.from_bytes(little_endian, byteorder='little')
    print(f"恢复: {restored_big:#x}, {restored_little:#x}")

    # 系统字节序
    import sys
    print(f"\n系统字节序: {sys.byteorder}")  # little（x86/ARM 通常是小端）

    # 位运算的字节序无关性
    # 位运算（&、|、^、~、<<、>>）在整数层面操作，与字节序无关
    a = 0xFF00
    b = 0x00FF
    print(f"\n0xFF00 & 0x00FF = {a & b:#x}")  # 0x0
    print(f"0xFF00 | 0x00FF = {a | b:#x}")    # 0xffff


def demo_struct_module() -> None:
    """演示 struct 模块处理二进制协议"""
    # struct 格式字符
    # <: 小端序
    # >: 大端序（网络字节序）
    # B: unsigned char (1 字节)
    # H: unsigned short (2 字节)
    # I: unsigned int (4 字节)
    # f: float (4 字节)
    # d: double (8 字节)
    # s: bytes (需指定长度，如 10s)

    # 打包二进制数据（模拟网络协议）
    # 协议格式: [版本:1B][类型:1B][长度:2B][数据:4B]
    version = 1
    msg_type = 2
    length = 4
    data = 0x12345678

    # 大端序打包
    packet = struct.pack('>BBHI', version, msg_type, length, data)
    print(f"打包: {packet.hex()}")  # 0102000412345678

    # 解包
    unpacked = struct.unpack('>BBHI', packet)
    print(f"解包: {unpacked}")  # (1, 2, 4, 305419896)

    # 命名解包
    from collections import namedtuple
    Packet = namedtuple('Packet', ['version', 'type', 'length', 'data'])
    pkt = Packet._make(struct.unpack('>BBHI', packet))
    print(f"命名解包: {pkt}")

    # 打包浮点数
    pi = 3.14159265358979
    packed_float = struct.pack('>d', pi)
    print(f"\npi 打包: {packed_float.hex()}")
    unpacked_float = struct.unpack('>d', packed_float)[0]
    print(f"pi 解包: {unpacked_float}")

    # 处理变长字符串
    name = "Alice"
    age = 30
    # 格式: [年龄:1B][名字长度:1B][名字:5s]
    packed_person = struct.pack('>BB5s', age, len(name), name.encode())
    print(f"\n打包 person: {packed_person.hex()}")

    # 解包变长字符串
    age_unpacked, name_len, name_bytes = struct.unpack('>BB5s', packed_person)
    name_unpacked = name_bytes.decode()
    print(f"解包 person: age={age_unpacked}, name={name_unpacked}")


def demo_memoryview() -> None:
    """演示 memoryview 零拷贝访问"""
    # 创建大字节数组
    data = bytearray(range(256))

    # 创建 memoryview（不复制数据）
    mv = memoryview(data)
    print(f"memoryview: {mv}")
    print(f"长度: {len(mv)}")
    print(f"前 10 字节: {bytes(mv[:10])}")

    # 切片也是零拷贝
    slice_mv = mv[10:20]
    print(f"切片 [10:20]: {bytes(slice_mv)}")

    # 通过 memoryview 修改原数据
    mv[0] = 255
    print(f"\n修改 mv[0] 后的 data[0]: {data[0]}")  # 255

    # 性能对比：memoryview vs bytes 切片
    import timeit

    large_data = bytearray(1_000_000)

    # bytes 切片会复制数据
    bytes_time = timeit.timeit(lambda: bytes(large_data[100:1000]), number=10000)
    # memoryview 切片不复制
    mv_time = timeit.timeit(lambda: memoryview(large_data)[100:1000], number=10000)

    print(f"\n1 万次切片 900 字节:")
    print(f"  bytes:      {bytes_time:.3f}s")
    print(f"  memoryview: {mv_time:.3f}s")
    print(f"  memoryview 快 {bytes_time / mv_time:.1f}x")

    # memoryview 与 struct 配合
    # 高效解析二进制数据
    binary_data = struct.pack('>IIf', 1, 2, 3.14)
    mv = memoryview(binary_data)
    # 从 memoryview 解包，避免复制
    unpacked = struct.unpack_from('>IIf', mv)
    print(f"\n从 memoryview 解包: {unpacked}")


def demo_base64_hex() -> None:
    """演示 Base64 与十六进制编码"""
    # 原始数据
    data = b'Hello, World!'

    # 十六进制编码
    hex_encoded = data.hex()
    print(f"原文: {data}")
    print(f"十六进制: {hex_encoded}")  # 48656c6c6f2c20576f726c6421
    print(f"解码: {bytes.fromhex(hex_encoded)}")

    # Base64 编码（用于二进制数据在文本协议中传输）
    b64 = b64encode(data)
    print(f"\nBase64: {b64}")  # b'SGVsbG8sIFdvcmxkIQ=='
    print(f"解码: {b64decode(b64)}")

    # URL 安全的 Base64
    url_data = b'\xff\xfe\xfd'
    standard_b64 = b64encode(url_data)
    print(f"\n标准 Base64: {standard_b64}")  # b'//79'
    # URL 安全 Base64（替换 +/ 为 -_）
    from base64 import urlsafe_b64encode
    urlsafe_b64 = urlsafe_b64encode(url_data)
    print(f"URL 安全 Base64: {urlsafe_b64}")  # b'__79'

    # 实际应用：编码图片为 Data URL
    # 假设有一个小的 PNG 图片
    png_header = b'\x89PNG\r\n\x1a\n'
    data_url = f"data:image/png;base64,{b64encode(png_header).decode()}"
    print(f"\nData URL: {data_url}")


if __name__ == '__main__':
    print("=== bytes 与 bytearray ===")
    demo_bytes_bytearray()
    print("\n=== 字节序 ===")
    demo_byte_order()
    print("\n=== struct 模块 ===")
    demo_struct_module()
    print("\n=== memoryview ===")
    demo_memoryview()
    print("\n=== Base64 与十六进制 ===")
    demo_base64_hex()
```

## 6. 对比分析

### 6.1 数值类型对比

| 类型 | 精度 | 范围 | 性能 | 适用场景 | 典型陷阱 |
|------|------|------|------|---------|---------|
| `int` | 任意精度 | 仅受内存限制 | 小整数快，大整数慢 | 整数运算、大数计算 | 大整数运算性能下降 |
| `float` | 15-17 位有效数字 | $\pm 1.8 \times 10^{308}$ | 最快 | 科学计算、图形 | 精度误差（0.1+0.2!=0.3） |
| `complex` | 同 float | 同 float | 略慢于 float | 复数运算、信号处理 | 无法比较大小 |
| `Decimal` | 可配置（默认 28 位） | 任意（随精度） | 比 float 慢 10-100 倍 | 金融、会计 | 从 float 创建有精度问题 |
| `Fraction` | 精确（有理数） | 任意 | 比 float 慢 100-1000 倍 | 数学计算、分数运算 | 分母过大时性能下降 |

### 6.2 字符串与字节类型对比

| 类型 | 可变性 | 内容 | 典型用途 | 编码 |
|------|--------|------|---------|------|
| `str` | 不可变 | Unicode 字符 | 文本处理 | Latin-1/UCS-2/UCS-4（自动） |
| `bytes` | 不可变 | 字节（0-255） | 二进制数据、编码文本 | 无（原始字节） |
| `bytearray` | 可变 | 字节（0-255） | 修改二进制数据 | 无（原始字节） |
| `memoryview` | 视图 | 缓冲区引用 | 零拷贝访问 | 无（缓冲区视图） |

### 6.3 类型转换方法对比

| 方法 | 用途 | 示例 | 注意事项 |
|------|------|------|---------|
| `int(x)` | 转 int | `int('42')`, `int(3.14)` | 向零取整 |
| `float(x)` | 转 float | `float('3.14')`, `float(42)` | 精度有限 |
| `str(x)` | 转 str | `str(42)`, `str(3.14)` | 用户友好 |
| `repr(x)` | 转 str | `repr('hello')` | 开发者友好（含引号） |
| `bool(x)` | 转 bool | `bool(0)`, `bool('')` | 空值为 False |
| `format(x, spec)` | 格式化 | `format(3.14, '.2f')` | 灵活的格式控制 |
| `f"{x:spec}"` | 格式化 | `f"{3.14:.2f}"` | 简洁（Python 3.6+） |

### 6.4 浮点舍入方法对比

| 方法 | 行为 | `round(2.5)` | `round(3.5)` | 适用场景 |
|------|------|-------------|-------------|---------|
| `round()` | 银行家舍入（向偶数） | 2 | 4 | 统计、减少累计误差 |
| `math.floor()` | 向下取整 | 2 | 3 | 数学下界 |
| `math.ceil()` | 向上取整 | 3 | 4 | 数学上界 |
| `math.trunc()` | 向零取整 | 2 | 3 | 截断小数部分 |
| `int()` | 向零取整 | 2 | 3 | 等价于 trunc |
| `Decimal.quantize(ROUND_HALF_UP)` | 四舍五入 | 3 | 4 | 金融（传统舍入） |

### 6.5 Python 与其他语言的类型系统对比

| 特性 | Python | C | Java | JavaScript | Rust |
|------|--------|---|------|-----------|------|
| 类型检查 | 动态 + 可选注解 | 静态 | 静态 | 动态 | 静态 |
| 整数精度 | 任意 | 固定（32/64位） | 固定（32/64位） | 53位（Number） | 固定（32/64位） |
| 浮点 | IEEE 754 binary64 | IEEE 754 | IEEE 754 | IEEE 754 | IEEE 754 |
| 字符串 | Unicode | 字节数组 | UTF-16 | UTF-16 | UTF-8 |
| 布尔 | int 子类 | int（C99） | 独立类型 | 独立类型 | 独立类型 |
| 不可变性 | 显式（int/str/tuple） | 无 | String 不可变 | String 不可变 | 默认不可变 |

## 7. 常见陷阱与反模式

### 7.1 浮点数直接比较

**反模式**：

```python
# 错误：直接比较浮点数
def calculate_total(prices: list[float]) -> bool:
    """计算总价是否等于预期"""
    total = sum(prices)
    return total == 100.0  # 可能因浮点误差返回 False
```

**事故案例**：某电商平台的促销活动，计算商品总价是否达到优惠门槛（100 元）。由于浮点误差，`19.99 + 5.49 + 3.50 + 71.02` 结果为 `100.00000000000001`，与 `100.0` 不相等，导致用户无法享受优惠。该问题在测试环境未复现，仅在特定价格组合下出现，排查耗时 8 小时。

**正确做法**：

```python
import math
from decimal import Decimal

# 方法一：使用容差比较
def calculate_total_v1(prices: list[float], target: float = 100.0) -> bool:
    """使用容差比较浮点数"""
    total = sum(prices)
    return math.isclose(total, target, rel_tol=1e-9)

# 方法二：使用 Decimal（推荐金融场景）
def calculate_total_v2(prices: list[str], target: str = "100.00") -> bool:
    """使用 Decimal 精确计算"""
    decimal_prices = [Decimal(p) for p in prices]
    total = sum(decimal_prices)
    return total == Decimal(target)

# 方法三：使用整数（分为单位）
def calculate_total_v3(prices_in_cents: list[int], target_cents: int = 10000) -> bool:
    """使用整数（分）避免浮点"""
    return sum(prices_in_cents) == target_cents
```

### 7.2 可变默认参数

**反模式**：

```python
# 错误：使用 list/dict 作为默认参数
def add_item(item, items=[]):
    """向列表添加项"""
    items.append(item)
    return items

# 第一次调用
print(add_item(1))  # [1]
# 第二次调用（共享同一列表！）
print(add_item(2))  # [1, 2]，而不是 [2]
```

**事故案例**：某 Web 框架的请求处理函数使用 `def handle(request, cache=[])` 缓存数据。在高并发下，多个请求共享同一 cache 列表，导致用户 A 看到了用户 B 的数据。该问题在单用户测试时未复现，上线后引发数据泄漏投诉。

**正确做法**：

```python
def add_item(item, items=None):
    """使用 None 作为默认值"""
    if items is None:
        items = []
    items.append(item)
    return items

print(add_item(1))  # [1]
print(add_item(2))  # [2]
```

### 7.3 is 与 == 混淆

**反模式**：

```python
# 错误：使用 is 比较值
a = 1000
b = 1000
print(a is b)  # False（大整数不缓存）

# 错误：使用 == 比较 None
if x == None:  # 应该用 is None
    ...
```

**事故案例**：某服务在开发环境（使用小整数）测试通过，但在生产环境（大整数 ID）下，`if user_id is target_id` 始终返回 False，导致权限检查失效。

**正确做法**：

```python
# 值比较用 ==
a = 1000
b = 1000
print(a == b)  # True

# 身份比较（None、True、False、哨兵对象）用 is
if x is None:
    ...
if x is True:  # 而非 x == True
    ...
```

### 7.4 整数除法的负数行为

**反模式**：

```python
# 错误：假设 // 向零取整
def calculate_pages(total: int, per_page: int) -> int:
    """计算页数"""
    return total // per_page + 1  # 当 total 为负数时错误

print(calculate_pages(-10, 3))  # -2（-10 // 3 = -4，+1 = -3）
```

**正确做法**：

```python
import math

def calculate_pages(total: int, per_page: int) -> int:
    """计算页数（正确处理负数）"""
    # 使用 math.ceil 向上取整
    return math.ceil(total / per_page)

# 或者使用 divmod
def calculate_pages_v2(total: int, per_page: int) -> int:
    """使用 divmod 计算页数"""
    quotient, remainder = divmod(total, per_page)
    return quotient + (1 if remainder > 0 else 0)
```

### 7.5 字符串编码错误

**反模式**：

```python
# 错误：忽略编码问题
def read_file(path: str) -> str:
    """读取文件内容"""
    with open(path) as f:  # 默认编码可能不是 UTF-8
        return f.read()

# 错误：str 与 bytes 混用
def process(data) -> str:
    """处理数据"""
    return data + "suffix"  # 如果 data 是 bytes，会 TypeError
```

**事故案例**：某数据处理脚本在 Windows 开发环境（默认 GBK）运行正常，部署到 Linux 服务器（默认 UTF-8）后读取含中文的文件报 `UnicodeDecodeError`。

**正确做法**：

```python
def read_file(path: str, encoding: str = 'utf-8') -> str:
    """显式指定编码"""
    with open(path, encoding=encoding) as f:
        return f.read()

def process(data) -> str:
    """处理数据，正确处理 bytes/str"""
    if isinstance(data, bytes):
        data = data.decode('utf-8')
    return data + "suffix"
```

### 7.6 round() 的银行家舍入

**反模式**：

```python
# 错误：假设 round() 是四舍五入
def calculate_tax(amount: float) -> float:
    """计算税额（四舍五入到分）"""
    return round(amount * 0.08, 2)

print(calculate_tax(2.675))  # 0.21（不是 0.22！）
# 因为 round() 使用银行家舍入，且 2.675 实际是 2.674999...
```

**事故案例**：某财务系统的税额计算使用 `round()`，导致大量交易税额少收 1 分钱，累计损失显著。

**正确做法**：

```python
from decimal import Decimal, ROUND_HALF_UP

def calculate_tax(amount: Decimal) -> Decimal:
    """使用 Decimal 精确计算税额"""
    tax = amount * Decimal('0.08')
    return tax.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

print(calculate_tax(Decimal('2.675')))  # 0.22
```

### 7.7 布尔作为整数索引

**反模式**：

```python
# 错误：bool 作为字典键
config = {1: 'enabled', True: 'yes'}
print(config)  # {1: 'yes'}，True 覆盖了 1

# 错误：bool 作为索引
data = ['a', 'b', 'c']
flag = True
print(data[flag])  # 'b'（可能不是预期）
```

**正确做法**：

```python
# 使用不同的键
config = {1: 'enabled', 'true': 'yes'}

# 显式转换为 int
index = int(flag)
print(data[index])

# 或使用条件表达式
print('b' if flag else 'a')
```

### 7.8 大字符串的 += 操作

**反模式**：

```python
# 错误：循环中使用 += 拼接字符串
def build_csv(rows: list[list[str]]) -> str:
    """构建 CSV 内容"""
    result = ""
    for row in rows:
        result += ",".join(row) + "\n"
    return result
```

**正确做法**：

```python
def build_csv(rows: list[list[str]]) -> str:
    """使用 join 高效构建 CSV"""
    lines = [",".join(row) for row in rows]
    return "\n".join(lines)

# 或使用 io.StringIO
from io import StringIO

def build_csv_v2(rows: list[list[str]]) -> str:
    """使用 StringIO 构建 CSV"""
    buffer = StringIO()
    for row in rows:
        buffer.write(",".join(row))
        buffer.write("\n")
    return buffer.getvalue()
```

## 8. 工程实践

### 8.1 数值类型的工程选型

**决策框架**：

```python
"""
数值类型选型决策框架

根据业务场景选择合适的数值类型：
1. 金融/会计：Decimal（精度优先）
2. 科学计算：float（性能优先）或 numpy
3. 整数计数：int（任意精度）
4. 分数运算：Fraction（精确有理数）
5. 二进制位操作：int（位运算）
"""
from decimal import Decimal, Context, ROUND_HALF_UP
from typing import Union
from dataclasses import dataclass


# 场景一：金融系统
@dataclass
class Money:
    """
    货币值对象（金融场景）

    使用 Decimal 保证精度，封装货币计算逻辑
    """
    amount: Decimal
    currency: str = "CNY"

    def __post_init__(self):
        """初始化后校验"""
        if not isinstance(self.amount, Decimal):
            # 从 str 创建 Decimal，避免 float 精度问题
            self.amount = Decimal(str(self.amount))

    def __add__(self, other: 'Money') -> 'Money':
        """加法（同币种）"""
        if self.currency != other.currency:
            raise ValueError(f"币种不匹配: {self.currency} vs {other.currency}")
        return Money(self.amount + other.amount, self.currency)

    def __mul__(self, factor: Union[int, Decimal, 'Money']) -> 'Money':
        """乘法"""
        if isinstance(factor, Money):
            raise TypeError("货币不能相乘")
        return Money(self.amount * Decimal(str(factor)), self.currency)

    def allocate(self, ratios: list[int]) -> list['Money']:
        """
        按比例分配金额（避免精度损失）

        参数:
            ratios: 比例列表，如 [3, 2, 1] 表示 3:2:1
        返回:
            分配后的金额列表
        """
        total_ratio = sum(ratios)
        results = []
        allocated = Decimal('0')
        for i, ratio in enumerate(ratios[:-1]):
            share = (self.amount * ratio / total_ratio).quantize(
                Decimal('0.01'), rounding=ROUND_HALF_UP
            )
            results.append(Money(share, self.currency))
            allocated += share
        # 最后一份取余数，避免累计误差
        results.append(Money(self.amount - allocated, self.currency))
        return results

    def __str__(self) -> str:
        return f"{self.amount} {self.currency}"


# 使用示例
price = Money("19.99")
quantity = 3
total = price * quantity
print(f"总价: {total}")  # 59.97 CNY

# 按比例分配（避免精度损失）
amount = Money("100.00")
shares = amount.allocate([1, 1, 1])  # 三等分
for i, share in enumerate(shares):
    print(f"份额 {i+1}: {share}")
# 份额 1: 33.33 CNY
# 份额 2: 33.33 CNY
# 份额 3: 33.34 CNY（余数给最后一份）
```

### 8.2 类型安全的配置处理

```python
"""
类型安全的配置处理

使用类型注解与转换函数，避免类型混淆
"""
from typing import TypeVar, Callable, Optional
import os


T = TypeVar('T')


def get_config(
    key: str,
    converter: Callable[[str], T],
    default: Optional[T] = None,
    required: bool = False
) -> Optional[T]:
    """
    类型安全的环境变量读取

    参数:
        key: 环境变量名
        converter: 转换函数（int、float、str 等）
        default: 默认值
        required: 是否必需
    返回:
        转换后的值
    异常:
        ValueError: 转换失败
        KeyError: required 为 True 且未设置
    """
    value = os.getenv(key)
    if value is None:
        if required:
            raise KeyError(f"必需的环境变量 {key} 未设置")
        return default
    try:
        return converter(value)
    except (ValueError, TypeError) as e:
        raise ValueError(f"环境变量 {key}={value} 转换失败: {e}")


# 布尔值转换（处理 "false"、"0"、"no" 等）
def str_to_bool(s: str) -> bool:
    """
    字符串转布尔值

    支持的 true 值: true, 1, yes, on, y, t（大小写不敏感）
    支持的 false 值: false, 0, no, off, n, f, ''（大小写不敏感）
    """
    lower = s.lower()
    if lower in ('true', '1', 'yes', 'on', 'y', 't'):
        return True
    if lower in ('false', '0', 'no', 'off', 'n', 'f', ''):
        return False
    raise ValueError(f"无法将 '{s}' 转换为布尔值")


# 列表转换（逗号分隔）
def str_to_list(s: str, sep: str = ',') -> list[str]:
    """字符串转列表"""
    return [item.strip() for item in s.split(sep) if item.strip()]


# 使用示例
if __name__ == '__main__':
    os.environ['DEBUG'] = 'false'
    os.environ['PORT'] = '8080'
    os.environ['ALLOWED_HOSTS'] = 'localhost,127.0.0.1,example.com'

    debug = get_config('DEBUG', str_to_bool, default=False)
    port = get_config('PORT', int, default=8000)
    hosts = get_config('ALLOWED_HOSTS', str_to_list, default=['localhost'])

    print(f"debug: {debug} ({type(debug)})")       # False
    print(f"port: {port} ({type(port)})")          # 8080
    print(f"hosts: {hosts} ({type(hosts)})")       # ['localhost', '127.0.0.1', 'example.com']
```

### 8.3 二进制协议解析器

```python
"""
类型安全的二进制协议解析器

基于 struct 与 memoryview，高效解析二进制数据
"""
import struct
from typing import NamedTuple
from dataclasses import dataclass


class PacketHeader(NamedTuple):
    """数据包头部"""
    magic: int          # 魔数（2 字节）
    version: int        # 版本（1 字节）
    msg_type: int       # 消息类型（1 字节）
    payload_len: int    # 负载长度（4 字节）
    checksum: int       # 校验和（4 字节）

    @classmethod
    def from_bytes(cls, data: bytes) -> 'PacketHeader':
        """从字节解析头部"""
        if len(data) < cls.size():
            raise ValueError(f"数据过短: {len(data)} < {cls.size