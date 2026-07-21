---
order: 30
title: 变量与常量
module: python
category: 'dev-lang'
difficulty: beginner
description: Python 变量与常量深度剖析：从名字绑定、LEGB 作用域到引用语义、不可变性与企业级配置管理实践。
author: fanquanpp
updated: '2026-07-21'
related:
  - python/基础数据类型
  - python/函数参数与返回值
  - python/作用域与闭包
  - python/类型注解与mypy
  - python/面向对象编程
  - python/内存模型与垃圾回收
prerequisites:
  - python/概述与环境配置
  - python/程序结构与基本语法
---

# 变量与常量（Variables & Constants）

> "In Python, variables are not boxes; they are labels on boxes." —— Ned Batchelder, *Python Names and Values*

> "Constants are not a language feature in Python; they are a discipline." —— Brandon Rhodes, *Practices of the Pythonic Pro*

## 1. 学习目标（基于 Bloom 分类法）

本节按 Bloom 认知层次（Bloom's Taxonomy）逐级给出可观察、可测量的学习目标。完成本节后，学习者应能：

### 1.1 记忆层（Remember）

- **R1**：准确陈述 Python 变量的本质——"变量是名字（name）到对象（object）的绑定（binding）"，能复述 Ned Batchelder 在 *Python Names and Values* 演讲中对"变量即标签"（variables as labels）而非"变量即盒子"（variables as boxes）的原始论述。
- **R2**：列出 Python 的四种赋值语法：单变量赋值 `x = 1`、多重赋值 `x, y = 1, 2`、链式赋值 `a = b = c = 0`、增量赋值 `x += 1`，并能说明每种语法对应的字节码（`STORE_NAME`、`UNPACK_SEQUENCE`、`STORE_SUBSCR` 等）。
- **R3**：背诵 LEGB 作用域查找规则（Local → Enclosing → Global → Built-in）的完整名称解析顺序，并能列出 `global` 与 `nonlocal` 关键字的使用场景。

### 1.2 理解层（Understand）

- **U1**：解释 Python 的"名字绑定"（name binding）模型——赋值语句将名字绑定到对象，而非将对象存入命名的内存容器，能对比 C 语言"变量即内存槽位"与 Python"变量即引用标签"的本质差异。
- **U2**：阐述可变（mutable）与不可变（immutable）类型的语义差异——不可变类型的"修改"实际是新对象的创建与重新绑定，可变类型的"修改"是原地（in-place）变更，能区分 `int`、`str`、`tuple` 与 `list`、`dict`、`set` 的行为。
- **U3**：说明 `is`（身份相等，identity equality）与 `==`（值相等，value equality）的区别，能阐述 `id()` 函数返回对象内存地址的语义，并解释整数缓存 `[-5, 256]` 与字符串驻留（string interning）机制的实现原理。

### 1.3 应用层（Apply）

- **A1**：使用 `global` 与 `nonlocal` 关键字正确修改全局作用域与嵌套作用域中的变量，避免 `UnboundLocalError`。
- **A2**：实现至少三种 Python 常量方案——命名约定（`UPPER_CASE`）、`__setattr__` 拦截的不可变类、`enum.Enum` 枚举常量、`typing.Final` 类型注解、`@dataclass(frozen=True)` 冻结数据类，并能说明每种方案的优缺点。
- **A3**：使用 `copy.copy`（浅拷贝）与 `copy.deepcopy`（深拷贝）正确处理嵌套可变对象的复制，能识别浅拷贝的"共享引用"陷阱。

### 1.4 分析层（Analyze）

- **An1**：分析"可变默认参数陷阱"（mutable default argument trap）的根因——默认参数在函数定义时求值一次，后续调用共享同一对象，能给出使用 `None` 哨兵与 `factory` 函数的修复方案。
- **An2**：解构"闭包延迟绑定"（closure late binding）现象——循环中创建的闭包捕获的是变量名而非值，所有闭包在调用时访问的是循环结束时变量的最终值，能给出使用默认参数绑定当前值的解决方案。
- **An3**：剖析 CPython 的引用计数（reference counting）与循环垃圾收集器（cyclic garbage collector）的协作机制，能说明 `sys.getrefcount()` 的"额外引用"来源与 `gc.collect()` 的触发条件。

### 1.5 评价层（Evaluate）

- **E1**：评价 Python"无常量关键字"设计的合理性，对比 C/C++ 的 `const`、Java 的 `final`、Rust 的 `let`/`const`，判断 Python"约定优于强制"哲学的适用边界。
- **E2**：审查一段生产代码中的变量使用，识别潜在的"可变默认参数"、"循环变量泄漏"、"全局可变状态"、"浅拷贝共享引用"等反模式，并给出重构建议。
- **E3**：对比 Python 的引用语义与 C++ 的值语义、Java 的引用语义（基本类型值语义、对象引用语义）、Go 的值语义与指针语义，判断各语言在参数传递、赋值行为上的设计权衡。

### 1.6 创造层（Create）

- **C1**：设计一个支持"运行时不可变 + 类型注解"的企业级配置管理模块，结合 `typing.Final`、`@dataclass(frozen=True)`、`__slots__`、`__setattr__` 拦截，提供配置加载、校验、热更新（原子替换）能力。
- **C2**：实现一个"变量可观测性"装饰器，自动追踪函数内所有局部变量的赋值历史，输出变量轨迹（variable trace），用于调试与教学可视化。
- **C3**：构建一个"作用域可视化"工具，给定一段 Python 代码，自动绘制 LEGB 查找树，标注每个名字的绑定来源（local/enclosing/global/builtin），并检测潜在的作用域遮蔽（shadowing）问题。

---

## 2. 历史动机与演化

### 2.1 Python 变量模型的哲学起源

Python 的变量模型与 C、Pascal 等静态语言截然不同，其设计哲学可追溯至 1989 年 Guido van Rossum 在 CWI（荷兰国家数学与计算机科学研究所）开发 ABC 语言的经历。ABC 采用"变量即盒子"模型，要求变量先声明后使用，但 Guido 在设计 Python 时选择了截然不同的路径——"变量即标签"模型，灵感来自 Modula-3 与 Lisp 的符号绑定（symbol binding）语义。

**设计动机**：

1. **简化认知负担**：开发者无需关心内存分配与释放，只需关注名字到对象的绑定关系。
2. **统一的对象模型**：Python 中"一切皆对象"（everything is an object），包括整数、字符串、函数、类、模块，变量只是对象的名字，简化了语言的一致性。
3. **动态类型支持**：变量不绑定类型，对象才有类型，这使得 Python 天然支持动态类型，一个名字可在不同时刻绑定不同类型的对象。
4. **引用语义的简洁性**：赋值即绑定，参数传递即绑定共享，无需区分值传递与引用传递（Python 采用"对象引用传递"，pass-by-object-reference）。

### 2.2 变量模型的演化路径

**Python 0.9.0（1991）**：最初版本即采用"名字绑定"模型，但早期的局部变量查找规则较为简单，仅有 Local 与 Global 两层。

**Python 2.0（2000）**：引入嵌套作用域（nested scopes，PEP 227），形成 LEGB 规则的前身。在此之前，嵌套函数无法访问外层函数的变量，只能通过默认参数传递。

**Python 2.1（2001）**：PEP 227 正式落地，引入 Enclosing 作用域，形成完整的 LEGB 查找规则。

**Python 2.2（2001）**：新式类（new-style class）引入，统一了类与类型的模型，`type` 与 `object` 的关系明确化，为后续的元类机制奠定基础。

**Python 3.0（2008）**：引入 `nonlocal` 关键字（PEP 3104），允许在嵌套函数中修改外层（非全局）作用域的变量，补全了作用域修改能力。

**Python 3.6（2016）**：PEP 526 引入变量注解（variable annotations），允许 `x: int = 1` 语法，变量注解存储在 `__annotations__` 字典中，但不影响运行时行为。

**Python 3.8（2019）**：PEP 572 引入海象运算符（walrus operator）`:=`，允许在表达式内部进行赋值，常见于 `while` 循环条件与列表推导式。

**Python 3.10（2021）**：PEP 634 引入结构化模式匹配（Structural Pattern Matching）`match`/`case`，支持解构赋值，进一步丰富了变量绑定语法。

**Python 3.12（2023）**：PEP 695 引入类型参数语法（type parameter syntax），`type` 语句定义类型别名，`def f[T](x: T) -> T:` 简化泛型定义，进一步强化类型注解体系。

### 2.3 常量机制的演化

Python 至今未引入 `const` 关键字，这是有意为之的设计决策：

**阶段一（Python 1.x-2.x）**：仅依赖命名约定 `UPPER_CASE` 表示常量，无任何强制力。

**阶段二（Python 3.6+）**：PEP 526 引入 `typing.Final` 类型注解，静态类型检查器（mypy、Pyright）可检测 `Final` 变量的重新赋值，但运行时无强制力。

```python
from typing import Final
MAX_CONNECTIONS: Final[int] = 100
MAX_CONNECTIONS = 200  # mypy 报错，运行时不报错
```

**阶段三（Python 3.8+）**：`@dataclass(frozen=True)` 提供运行时强制的不可变数据类，通过 `object.__setattr__` 拦截字段修改。

**阶段四（Python 3.12+）**：社区形成"分层常量"实践：
- 配置常量：`typing.Final` + `@dataclass(frozen=True)` + mypy 检查
- 枚举常量：`enum.Enum` 与 `enum.IntEnum`
- 模块级常量：命名约定 + 模块即单例
- 不可变集合：`types.MappingProxyType`、`frozenset`、`tuple`

### 2.4 与其他语言的对比演化

| 语言 | 变量模型 | 常量机制 | 作用域规则 |
|------|----------|----------|------------|
| C | 变量即盒子 | `const` 关键字（运行时强制） | 块级作用域 |
| C++ | 变量即盒子 | `const`、`constexpr`（编译期） | 块级作用域 |
| Java | 基本类型值语义，对象引用语义 | `final`（运行时强制） | 块级、类级 |
| JavaScript | `let`/`const` 块级作用域，`var` 函数作用域 | `const`（运行时强制，对象仍可变） | 块级、函数、模块 |
| Go | 变量即盒子（值语义），`*T` 指针 | `const`（仅编译期，无运行时强制） | 块级、包级 |
| Rust | 绑定 + 所有权 | `let` 可变、`const` 不可变、`static` 静态 | 块级、模块 |
| Python | 变量即标签（引用语义） | 无 `const`，依赖约定 + `Final` + `frozen` | LEGB |

Python 的"无常量关键字"设计源于其动态性与鸭子类型哲学——强制不可变会与元编程、动态属性修改等特性冲突。社区通过分层方案（约定 + 类型注解 + 不可变数据类）实现了"软常量"，在灵活性与安全性之间取得平衡。

---

## 3. 形式化定义

### 3.1 名字绑定的形式化定义

**定义 3.1（名字绑定）**：给定 Python 运行时环境 $E$，名字 $n \in \text{Names}$，对象 $o \in \text{Objects}$，名字绑定是一个三元组 $(n, o, s)$，其中 $s \in \{\text{local}, \text{enclosing}, \text{global}, \text{builtin}\}$ 表示作用域。绑定操作记作：

$$\text{bind}(n, o, s) : E.\text{namespaces}[s][n] \leftarrow o$$

其中 $E.\text{namespaces}[s]$ 是作用域 $s$ 对应的命名空间字典。

赋值语句 `x = 1` 的语义可形式化为：

$$\text{evaluate}(\text{`x = 1'}) = \text{bind}(\text{`x'}, \text{int}(1), \text{current\_scope})$$

即：在当前作用域的命名空间中，将名字 `x` 绑定到整数对象 `1`。

### 3.2 对象身份与相等性的形式化定义

**定义 3.2（对象身份）**：给定对象 $o$，其身份 $\text{id}(o) \in \mathbb{N}$ 是对象在内存中的唯一标识（CPython 中为内存地址）。两个对象 $o_1, o_2$ 身份相等当且仅当：

$$o_1 \equiv o_2 \iff \text{id}(o_1) = \text{id}(o_2)$$

Python 中 `is` 运算符即测试身份相等：`o_1 is o_2` 等价于 $\text{id}(o_1) = \text{id}(o_2)$。

**定义 3.3（值相等）**：给定对象 $o_1, o_2$，值相等由 `__eq__` 方法定义：

$$o_1 = o_2 \iff o_1.\text{\_\_eq\_\_}(o_2) = \text{True}$$

默认情况下，`object.__eq__` 退化为身份相等：$o_1 = o_2 \iff o_1 \equiv o_2$。自定义类型可重写 `__eq__` 实现值语义。

### 3.3 可变性的形式化定义

**定义 3.4（可变性）**：给定对象 $o$，其类型 $T = \text{type}(o)$。称 $T$ 为可变类型（mutable）若存在操作 $\text{op}$ 使得：

$$\exists \text{op}, \text{op}(o) \land \text{id}(o) \text{ 不变} \land \text{state}(o) \text{ 改变}$$

即对象的状态可在不改变身份的情况下被修改。反之为不可变类型（immutable）。

**Python 类型分类**：

- **不可变类型**：`int`、`float`、`bool`、`str`、`tuple`、`frozenset`、`bytes`、`NoneType`
- **可变类型**：`list`、`dict`、`set`、`bytearray`、自定义类实例

### 3.4 LEGB 作用域的形式化定义

**定义 3.5（LEGB 查找规则）**：给定名字 $n$ 与当前执行上下文 $\text{ctx}$，名字解析函数 $\text{resolve}(n, \text{ctx})$ 定义为：

$$\text{resolve}(n, \text{ctx}) = \begin{cases}
\text{ctx}.\text{local}[n] & \text{if } n \in \text{ctx}.\text{local} \\
\text{ctx}.\text{enclosing}_k[n] & \text{if } n \in \text{ctx}.\text{enclosing}_k, \text{取最近} k \\
\text{ctx}.\text{global}[n] & \text{if } n \in \text{ctx}.\text{global} \\
\text{ctx}.\text{builtin}[n] & \text{if } n \in \text{ctx}.\text{builtin} \\
\bot & \text{otherwise (NameError)}
\end{cases}$$

其中：
- $\text{local}$：当前函数的局部命名空间（`locals()`）
- $\text{enclosing}_k$：第 $k$ 层外层函数的命名空间，按嵌套深度排序
- $\text{global}$：当前模块的全局命名空间（`globals()`）
- $\text{builtin}$：`builtins` 模块的命名空间

### 3.5 引用计数的形式化定义

**定义 3.6（引用计数）**：给定对象 $o$，其引用计数 $\text{refcount}(o) \in \mathbb{N}$ 表示指向 $o$ 的引用数量。引用计数变化规则：

- 创建对象 $o$：$\text{refcount}(o) \leftarrow 1$
- 名字绑定到 $o$：$\text{refcount}(o) \leftarrow \text{refcount}(o) + 1$
- 名字重新绑定到其他对象：$\text{refcount}(o) \leftarrow \text{refcount}(o) - 1$
- 容器（list、dict 等）添加 $o$：$\text{refcount}(o) \leftarrow \text{refcount}(o) + 1$
- 容器移除 $o$：$\text{refcount}(o) \leftarrow \text{refcount}(o) - 1$
- 函数返回、作用域退出：相应名字解除绑定，$\text{refcount}(o) \leftarrow \text{refcount}(o) - 1$

当 $\text{refcount}(o) = 0$ 时，CPython 立即回收 $o$（调用 `__del__` 并释放内存）。

### 3.6 常量的形式化定义

**定义 3.7（常量）**：给定名字 $n$ 与对象 $o$，称 $n$ 为常量若满足以下任一条件：

1. **约定层常量**：$n$ 命名为 `UPPER_CASE`，无运行时强制，仅依赖开发者自律。
2. **类型层常量**：$n$ 注解为 `typing.Final[T]`，静态类型检查器检测重新赋值，运行时无强制。
3. **运行时常量**：$n$ 绑定的对象 $o$ 本身不可变（如 `tuple`、`frozenset`、`frozen dataclass`），或通过 `__setattr__` 拦截修改。

形式化地，强常量 $n$ 满足：

$$\forall t_1, t_2 \in \text{Time}, \text{bind}(n, o, t_1) \land \text{bind}(n, o, t_2) \implies o_1 = o_2$$

即名字 $n$ 在任意时刻绑定的对象相同。

### 3.7 作用域修改的形式化定义

**定义 3.8（`global` 声明）**：在函数 $f$ 内声明 `global n`，使得 $f$ 内对 $n$ 的赋值作用于全局命名空间：

$$\text{bind}(n, o, \text{local}) \xrightarrow{\text{global } n} \text{bind}(n, o, \text{global})$$

**定义 3.9（`nonlocal` 声明）**：在嵌套函数 $f_{\text{inner}}$ 内声明 `nonlocal n`，使得 $f_{\text{inner}}$ 内对 $n$ 的赋值作用于最近的包含 $n$ 绑定的外层函数作用域：

$$\text{bind}(n, o, \text{local}) \xrightarrow{\text{nonlocal } n} \text{bind}(n, o, \text{enclosing}_k)$$

其中 $k$ 是最小的使得 $n \in \text{enclosing}_k$ 的深度。

### 3.8 浅拷贝与深拷贝的形式化定义

**定义 3.10（浅拷贝）**：给定对象 $o$，其浅拷贝 $o'$ 满足：
- $\text{id}(o) \neq \text{id}(o')$（新对象）
- $\forall a \in \text{attrs}(o), \text{id}(o.a) = \text{id}(o'.a)$（属性引用相同对象）

即浅拷贝创建新容器，但容器内元素仍为原对象的引用。

**定义 3.11（深拷贝）**：给定对象 $o$，其深拷贝 $o''$ 满足：
- $\text{id}(o) \neq \text{id}(o'')$（新对象）
- $\forall a \in \text{attrs}(o), \text{deep\_copy}(o.a) = o''.a$（递归深拷贝）

即深拷贝递归创建所有嵌套对象的新副本，完全不共享引用。

---

## 4. 理论推导与证明

### 4.1 名字绑定等价性

**命题 4.1**：赋值语句 `y = x` 后，`x is y` 为真，且对可变对象的原地修改会反映在两个名字上。

**证明**：

设 `x` 当前绑定对象 $o$，即 $\text{bind}(\text{`x'}, o, \text{local})$。

执行 `y = x`：
1. 解释器查找 `x` 的绑定，返回 $o$。
2. 在当前作用域绑定 `y` 到 $o$，即 $\text{bind}(\text{`y'}, o, \text{local})$。
3. 此时 $\text{id}(\text{x}) = \text{id}(o) = \text{id}(\text{y})$，故 `x is y` 为真。

若 $o$ 是可变对象（如 `list`），执行 `x.append(1)`：
1. 解释器查找 `x`，返回 $o$。
2. 调用 `o.append(1)`，原地修改 $o$ 的状态。
3. 由于 `y` 也绑定 $o$，访问 `y` 看到 $o$ 的最新状态。

故 `x.append(1)` 后 `y` 也包含新元素。$\blacksquare$

**推论 4.1**：对不可变对象的"修改"（如 `x += 1` 对 `int`）实际是重新绑定，不会影响其他名字。

### 4.2 不可变对象修改的正确性

**命题 4.2**：对不可变对象 $o$ 执行 `x = x + 1`（$x$ 绑定 $o$），不会修改 $o$，而是创建新对象 $o'$ 并重新绑定 $x$。

**证明**：

设 $x$ 绑定不可变对象 $o$（如 `int`），$\text{value}(o) = v$。

执行 `x = x + 1`：
1. 计算 `x + 1`：解释器查找 `x` 得 $o$，调用 `o.__add__(1)`。
2. 由于 `int` 是不可变类型，`__add__` 不修改 $o$，而是返回新对象 $o'$，$\text{value}(o') = v + 1$。
3. 将 $x$ 重新绑定到 $o'$，即 $\text{bind}(\text{`x'}, o', \text{local})$。
4. 原 $o$ 的状态未变，$\text{value}(o) = v$ 仍成立。

若存在 `y = x`（执行前），则 $y$ 仍绑定 $o$，$\text{value}(y) = v$ 不变。

故 `x = x + 1` 后 `x` 与 `y` 指向不同对象，`x is y` 为假。$\blacksquare$

### 4.3 LEGB 查找的正确性

**命题 4.3**：LEGB 查找规则保证名字解析的确定性——对同一名字，查找顺序固定为 Local → Enclosing → Global → Built-in。

**证明**：

Python 字节码 `LOAD_NAME` 与 `LOAD_GLOBAL` 的实现（CPython `ceval.c`）遵循以下顺序：

1. 检查 `locals()`（局部命名空间字典）。
2. 检查 `globals()`（全局命名空间字典）。
3. 检查 `builtins` 模块的命名空间。

对于嵌套函数，`LOAD_DEREF` 用于加载闭包变量（cell variables），对应 Enclosing 作用域。

形式化地，名字解析函数 $\text{resolve}$ 是顺序查找：

$$\text{resolve}(n) = \begin{cases}
\text{locals}[n] & \text{if found} \\
\text{enclosing}_k[n] & \text{if found, 取最近} k \\
\text{globals}[n] & \text{if found} \\
\text{builtins}[n] & \text{if found} \\
\text{raise NameError} & \text{otherwise}
\end{cases}$$

由于查找顺序固定且确定性，LEGB 规则保证同名名字的解析结果唯一（取决于作用域层次）。$\blacksquare$

**推论 4.2**：内层作用域的同名名字会"遮蔽"（shadow）外层作用域的名字，需通过 `global` 或 `nonlocal` 声明显式访问外层。

### 4.4 可变默认参数陷阱

**命题 4.4**：函数定义 `def f(x=[])` 中，默认参数 `[]` 在函数定义时求值一次，所有调用共享同一列表对象。

**证明**：

Python 函数定义时，解释器执行 `MAKE_FUNCTION` 字节码，将默认参数元组存储在函数对象的 `__defaults__` 属性中。

```python
def f(x=[]):
    x.append(1)
    return x
```

执行 `def f(x=[])` 时：
1. 求值 `[]`，创建空列表对象 $o$（$\text{id}(o) = \text{addr}_1$）。
2. 将 $o$ 存入 `f.__defaults__ = (o,)`。

调用 `f()`（无参数）时：
1. 解释器检查 `f.__defaults__`，取出 $o$ 作为 $x$ 的值。
2. 执行 `x.append(1)`，原地修改 $o$，$\text{value}(o) = [1]$。
3. 返回 $o$。

再次调用 `f()`：
1. 仍从 `f.__defaults__` 取出同一 $o$（$\text{id}(o) = \text{addr}_1$ 不变）。
2. 执行 `x.append(1)`，$o$ 变为 $[1, 1]$。
3. 返回 $o$。

故多次调用 `f()` 会累积元素，因为默认参数在定义时求值一次且共享。$\blacksquare$

**修复方案**：使用 `None` 哨兵，在函数体内创建新对象：

```python
def f(x=None):
    if x is None:
        x = []
    x.append(1)
    return x
```

### 4.5 闭包延迟绑定

**命题 4.5**：在循环中创建的闭包，所有闭包在调用时访问的是循环结束时变量的最终值，而非创建时的值。

**证明**：

考虑代码：

```python
funcs = []
for i in range(3):
    funcs.append(lambda: i)

print([f() for f in funcs])  # [2, 2, 2]，而非 [0, 1, 2]
```

执行过程分析：

1. 循环开始时，`i` 绑定到 `0`，创建闭包 $f_0$。$f_0$ 捕获的是名字 `i`（cell variable），而非值 `0`。
2. 循环迭代，`i` 重新绑定到 `1`、`2`。$f_0$、$f_1$、$f_2$ 均引用同一 cell `i`。
3. 循环结束，`i` 绑定到 `2`。
4. 调用 $f_0()$：解释器查找 `i`，返回当前绑定值 `2`。
5. 同理，$f_1()$、$f_2()$ 均返回 `2`。

形式化地，闭包捕获的是名字 $n$ 的引用，而非值 $v$。调用闭包时，$\text{resolve}(n)$ 在闭包创建时的作用域查找，返回 $n$ 的当前绑定值。$\blacksquare$

**修复方案**：使用默认参数绑定当前值：

```python
funcs = []
for i in range(3):
    funcs.append(lambda i=i: i)  # 默认参数在创建时求值

print([f() for f in funcs])  # [0, 1, 2]
```

或使用 `functools.partial`：

```python
from functools import partial
funcs = [partial(lambda x: x, i) for i in range(3)]
```

### 4.6 整数缓存

**命题 4.6**：CPython 缓存 `[-5, 256]` 范围内的整数对象，使得 `a = 256; b = 256; a is b` 为真，但 `a = 257; b = 257; a is b` 不保证为真。

**证明**：

CPython 启动时预创建 `[-5, 256]` 范围内的整数对象，存入 `small_integers` 数组。当解释器求值整数字面量 `256` 时，直接返回缓存对象的引用，不创建新对象。

故 `a = 256; b = 256`：
- 求值 `256` 返回缓存对象 $o_{256}$。
- $\text{bind}(\text{`a'}, o_{256})$，$\text{bind}(\text{`b'}, o_{256})$。
- $\text{id}(a) = \text{id}(o_{256}) = \text{id}(b)$，`a is b` 为真。

对于 `257`：
- 求值 `257` 创建新对象 $o_{257}^{(1)}$。
- $\text{bind}(\text{`a'}, o_{257}^{(1)})$。
- 再次求值 `257` 可能创建新对象 $o_{257}^{(2)}$（CPython 实现依赖，部分编译器会复用同一字面量，但非保证）。
- $\text{id}(a) \neq \text{id}(b)$ 可能成立，`a is b` 不保证为真。

注意：此行为是 CPython 实现细节，不应在生产代码中依赖。比较整数应使用 `==` 而非 `is`。$\blacksquare$

---

## 5. 代码示例

### 5.1 名字绑定与引用语义

```python
"""
名字绑定演示：变量是标签而非盒子
"""

# 基本绑定
x = 10
print(id(x))  # 输出: 内存地址（如 140703324934240）

# 多个名字绑定同一对象
a = 42
b = a
print(a is b)  # True
print(id(a) == id(b))  # True

# 不可变对象的"修改"实际是重新绑定
x = 10
y = x
x = 20  # 创建新对象 20，重新绑定 x
print(y)  # 10（y 仍指向原对象 10）
print(x is y)  # False

# 可变对象的原地修改
lst1 = [1, 2, 3]
lst2 = lst1
lst1.append(4)  # 原地修改
print(lst2)  # [1, 2, 3, 4]（lst2 指向同一对象）
print(lst1 is lst2)  # True


# 函数参数传递：对象引用传递
def modify_list(lst):
    """修改传入的列表（影响外部）"""
    lst.append(100)
    return lst


def rebind_list(lst):
    """重新绑定（不影响外部）"""
    lst = [100, 200, 300]  # 重新绑定到新对象
    return lst


original = [1, 2, 3]
modify_list(original)
print(original)  # [1, 2, 3, 100]（原地修改）

original = [1, 2, 3]
rebind_list(original)
print(original)  # [1, 2, 3]（未受影响）


# is vs ==
a = 256
b = 256
print(a is b)  # True（CPython 整数缓存）

a = 1000
b = 1000
print(a is b)  # 不保证（可能 False）
print(a == b)  # True（值相等）

# 字符串驻留
s1 = "hello"
s2 = "hello"
print(s1 is s2)  # True（字符串驻留）

s3 = "hello world!"
s4 = "hello world!"
print(s3 is s4)  # 不保证（含空格的字符串可能不驻留）
print(s3 == s4)  # True
```

### 5.2 LEGB 作用域演示

```python
"""
LEGB 作用域查找规则演示
"""

# Built-in 作用域
x = "global x"


def test_builtin():
    # Python 内置函数 len、print 等来自 builtins 模块
    print(len([1, 2, 3]))  # 3（从 builtins 查找）


# Global 作用域
def test_global():
    print(x)  # global x（从 global 查找）


def modify_global():
    global x  # 声明修改全局变量
    x = "modified global"
    print(x)  # modified global


# Enclosing 作用域
def outer():
    y = "enclosing y"

    def inner():
        print(y)  # enclosing y（从 enclosing 查找）

    inner()


# Local 作用域
def test_local():
    z = "local z"
    print(z)  # local z


# 作用域遮蔽（shadowing）
x = "global"


def shadow_test():
    x = "local"  # 遮蔽全局 x
    print(x)  # local


shadow_test()
print(x)  # global（未受影响）


# global 关键字
counter = 0


def increment():
    global counter
    counter += 1


increment()
increment()
print(counter)  # 2


# nonlocal 关键字
def make_counter():
    count = 0

    def increment():
        nonlocal count  # 修改外层函数的变量
        count += 1
        return count

    return increment


c = make_counter()
print(c())  # 1
print(c())  # 2
print(c())  # 3


# globals() 与 locals()
def test_namespaces():
    local_var = "local"
    print("locals:", locals())  # {'local_var': 'local'}
    print("globals has x:", 'x' in globals())  # True


# 嵌套作用域与闭包
def make_adder(n):
    """返回一个加 n 的函数（闭包捕获 n）"""

    def adder(x):
        return x + n

    return adder


add5 = make_adder(5)
add10 = make_adder(10)
print(add5(3))  # 8
print(add10(3))  # 13


# 查看闭包变量
print(add5.__closure__)  # (<cell at 0x...: int object at 0x...>,)
print(add5.__closure__[0].cell_contents)  # 5
```

### 5.3 global 与 nonlocal 的陷阱

```python
"""
global 与 nonlocal 的常见陷阱
"""

# 陷阱 1：未声明 global 导致 UnboundLocalError
counter = 0


def bad_increment():
    # counter += 1 等价于 counter = counter + 1
    # 解释器看到赋值，将 counter 视为局部变量
    # 但读取时局部变量未定义，抛出 UnboundLocalError
    try:
        counter += 1
    except UnboundLocalError as e:
        print(f"Error: {e}")  # local variable 'counter' referenced before assignment


bad_increment()


# 修复：声明 global
def good_increment():
    global counter
    counter += 1


good_increment()
print(counter)  # 1


# 陷阱 2：nonlocal 跨多层函数
def outer():
    x = "outer"

    def middle():
        x = "middle"

        def inner():
            nonlocal x  # 绑定到最近的 enclosing（middle 的 x）
            x = "inner"

        inner()
        print(f"middle x: {x}")  # inner

    middle()
    print(f"outer x: {x}")  # outer（未受影响）


outer()


# 陷阱 3：循环中的闭包延迟绑定
funcs = []
for i in range(3):
    funcs.append(lambda: i)

print([f() for f in funcs])  # [2, 2, 2]（延迟绑定）


# 修复方案 1：默认参数
funcs = [lambda i=i: i for i in range(3)]
print([f() for f in funcs])  # [0, 1, 2]


# 修复方案 2：functools.partial
from functools import partial

funcs = [partial(lambda x: x, i) for i in range(3)]
print([f() for f in funcs])  # [0, 1, 2]


# 修复方案 3：立即执行的工厂函数
def make_func(i):
    return lambda: i


funcs = [make_func(i) for i in range(3)]
print([f() for f in funcs])  # [0, 1, 2]
```

### 5.4 多重赋值与解包

```python
"""
多重赋值与解包语法
"""

# 基本多重赋值
x, y = 1, 2
print(x, y)  # 1 2

# 链式赋值
a = b = c = 100
print(a, b, c)  # 100 100 100

# 交换变量
a, b = 1, 2
a, b = b, a
print(a, b)  # 2 1

# 三变量轮换
x, y, z = 1, 2, 3
x, y, z = z, x, y
print(x, y, z)  # 3 1 2

# 列表解包
values = [3, 4, 5]
x, y, z = values
print(x, y, z)  # 3 4 5

# 星号表达式收集剩余值
first, *rest = [1, 2, 3, 4, 5]
print(first)  # 1
print(rest)  # [2, 3, 4, 5]

*init, last = [1, 2, 3, 4, 5]
print(init)  # [1, 2, 3, 4]
print(last)  # 5

first, *middle, last = [1, 2, 3, 4, 5]
print(first, middle, last)  # 1 [2, 3, 4] 5

# 字典解包
person = {"name": "Bob", "age": 30}

# 解包 items()
for key, value in person.items():
    print(f"{key}: {value}")

# 字典合并（Python 3.9+）
d1 = {"a": 1}
d2 = {"b": 2}
merged = {**d1, **d2}
print(merged)  # {'a': 1, 'b': 2}

# Python 3.9+ 字典合并运算符
merged = d1 | d2
print(merged)  # {'a': 1, 'b': 2}

# 函数参数解包
def add(a, b, c):
    return a + b + c


args = [1, 2, 3]
print(add(*args))  # 6

kwargs = {"a": 1, "b": 2, "c": 3}
print(add(**kwargs))  # 6

# 海象运算符（Python 3.8+）
import re

text = "Hello 123 World 456"
# 传统写法
match = re.search(r"\d+", text)
if match:
    print(match.group())  # 123

# 海象运算符
if (match := re.search(r"\d+", text)):
    print(match.group())  # 123

# 海象运算符在 while 循环中
while (line := input("> ")) != "quit":
    print(f"You said: {line}")

# 海象运算符在列表推导式中
numbers = [1, 2, 3, 4, 5, 6]
# 计算平方并过滤大于 10 的
result = [y for x in numbers if (y := x * x) > 10]
print(result)  # [16, 25, 36]

# 结构化模式匹配（Python 3.10+）
def handle_command(command):
    match command.split():
        case ["quit"]:
            return "Goodbye"
        case ["hello", name]:
            return f"Hello, {name}"
        case ["add", x, y]:
            return int(x) + int(y)
        case ["ls", *args]:
            return f"Listing with args: {args}"
        case _:
            return "Unknown command"


print(handle_command("hello Alice"))  # Hello, Alice
print(handle_command("add 3 5"))  # 8
print(handle_command("ls -l -a"))  # Listing with args: ['-l', '-a']
```

### 5.5 可变与不可变类型

```python
"""
可变与不可变类型的行为差异
"""

# 不可变类型：int, float, str, tuple, frozenset
x = 10
y = x
x += 1  # 创建新对象，x 重新绑定
print(x, y)  # 11 10
print(x is y)  # False

s1 = "hello"
s2 = s1
s1 += " world"  # 创建新字符串
print(s1, s2)  # hello world hello
print(s1 is s2)  # False

# 元组的"不可变"陷阱
t = (1, 2, [3, 4])
# t[0] = 10  # TypeError: 'tuple' object does not support item assignment
t[2].append(5)  # 合法！元组内的可变对象仍可修改
print(t)  # (1, 2, [3, 4, 5])

# 元组不可变的是"引用"，不是"内容"
print(id(t[2]))  # 列表对象的 id 不变

# 可变类型：list, dict, set
lst1 = [1, 2, 3]
lst2 = lst1
lst1.append(4)
print(lst2)  # [1, 2, 3, 4]
print(lst1 is lst2)  # True

d1 = {"a": 1}
d2 = d1
d1["b"] = 2
print(d2)  # {'a': 1, 'b': 2}
print(d1 is d2)  # True

# 函数参数传递
def modify_immutable(x):
    """不可变参数：修改不影响外部"""
    x += 1
    return x


def modify_mutable(lst):
    """可变参数：原地修改影响外部"""
    lst.append(100)
    return lst


n = 10
new_n = modify_immutable(n)
print(n, new_n)  # 10 11

original = [1, 2, 3]
modify_mutable(original)
print(original)  # [1, 2, 3, 100]

# 不可变类型的"修改"返回新对象
s = "hello"
print(id(s))  # 内存地址 1
s += " world"
print(id(s))  # 内存地址 2（新对象）

# 可变类型的"修改"原地变更
lst = [1, 2, 3]
print(id(lst))  # 内存地址 3
lst.append(4)
print(id(lst))  # 内存地址 3（同一对象）

# += 运算符的差异
# 对 list：+= 是原地修改（__iadd__）
lst1 = [1, 2, 3]
lst2 = lst1
lst1 += [4, 5]  # 原地修改
print(lst1 is lst2)  # True
print(lst2)  # [1, 2, 3, 4, 5]

# 对 int：+= 是重新绑定
a = 10
b = a
a += 5  # 重新绑定
print(a is b)  # False
```

### 5.6 浅拷贝与深拷贝

```python
"""
浅拷贝与深拷贝
"""
import copy

# 浅拷贝：创建新容器，但元素引用相同
original = [[1, 2], [3, 4], [5, 6]]

# 方式 1：list.copy()
shallow1 = original.copy()

# 方式 2：切片
shallow2 = original[:]

# 方式 3：list()
shallow3 = list(original)

# 方式 4：copy.copy()
shallow4 = copy.copy(original)

print(original is shallow1)  # False（新列表）
print(original[0] is shallow1[0])  # True（元素引用相同）

# 修改内层列表会影响所有浅拷贝
shallow1[0].append(100)
print(original)  # [[1, 2, 100], [3, 4], [5, 6]]
print(shallow1)  # [[1, 2, 100], [3, 4], [5, 6]]
print(shallow2)  # [[1, 2, 100], [3, 4], [5, 6]]（也受影响）


# 深拷贝：递归复制所有嵌套对象
original = [[1, 2], [3, 4], [5, 6]]
deep = copy.deepcopy(original)

print(original is deep)  # False
print(original[0] is deep[0])  # False（内层列表也是新对象）

deep[0].append(100)
print(original)  # [[1, 2], [3, 4], [5, 6]]（不受影响）
print(deep)  # [[1, 2, 100], [3, 4], [5, 6]]


# 字典的浅拷贝与深拷贝
original = {"a": [1, 2], "b": [3, 4]}

shallow = original.copy()
deep = copy.deepcopy(original)

shallow["a"].append(100)
print(original)  # {'a': [1, 2, 100], 'b': [3, 4]}（受影响）

original = {"a": [1, 2], "b": [3, 4]}  # 重置
deep = copy.deepcopy(original)
deep["a"].append(100)
print(original)  # {'a': [1, 2], 'b': [3, 4]}（不受影响）


# 自定义类的拷贝
class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __copy__(self):
        """自定义浅拷贝"""
        return Point(self.x, self.y)

    def __deepcopy__(self, memo):
        """自定义深拷贝"""
        return Point(copy.deepcopy(self.x, memo), copy.deepcopy(self.y, memo))

    def __repr__(self):
        return f"Point({self.x}, {self.y})"


p1 = Point(1, 2)
p2 = copy.copy(p1)
p3 = copy.deepcopy(p1)

print(p1 is p2)  # False
print(p1.x is p2.x)  # True（浅拷贝，属性引用相同）


# 循环引用的深拷贝
class Node:
    def __init__(self, value):
        self.value = value
        self.parent = None
        self.children = []

    def add_child(self, child):
        child.parent = self
        self.children.append(child)


root = Node("root")
child1 = Node("child1")
child2 = Node("child2")
root.add_child(child1)
root.add_child(child2)

# 深拷贝正确处理循环引用
root_copy = copy.deepcopy(root)
print(root_copy.children[0].parent is root_copy)  # True（新对象的循环引用）
print(root_copy.children[0] is root.children[0])  # False（新对象）
```

### 5.7 常量实现方案

```python
"""
Python 常量的多种实现方案
"""
from enum import Enum, auto
from typing import Final, ClassVar
from dataclasses import dataclass

# 方案 1：命名约定（最简单）
MAX_CONNECTIONS = 100
DEFAULT_TIMEOUT = 30
PI = 3.14159265359

# 缺点：无强制力，可被修改
MAX_CONNECTIONS = 200  # 不会报错


# 方案 2：typing.Final（类型检查器检测）
from typing import Final

MAX_SIZE: Final[int] = 100
# MAX_SIZE = 200  # mypy 报错：Cannot assign to final name "MAX_SIZE"
# 但运行时不报错


# 方案 3：__setattr__ 拦截的不可变类
class Constants:
    """通过 __setattr__ 拦截修改"""

    MAX_CONNECTIONS: ClassVar[int] = 100
    DEFAULT_TIMEOUT: ClassVar[int] = 30
    PI: ClassVar[float] = 3.14159265359

    def __setattr__(self, name, value):
        raise AttributeError(f"Cannot modify constant '{name}'")

    def __delattr__(self, name):
        raise AttributeError(f"Cannot delete constant '{name}'")


const = Constants()
print(const.PI)  # 3.14159265359
try:
    const.PI = 3.14
except AttributeError as e:
    print(f"Error: {e}")  # Cannot modify constant 'PI'


# 方案 4：模块级常量（替换模块对象）
import sys


class _Const:
    class ConstError(TypeError):
        pass

    def __setattr__(self, name, value):
        if name in self.__dict__:
            raise self.ConstError(f"Can't rebind const '{name}'")
        self.__dict__[name] = value

    def __delattr__(self, name):
        if name in self.__dict__:
            raise self.ConstError(f"Can't unbind const '{name}'")
        raise AttributeError(f"'{type(self).__name__}' has no attribute '{name}'")


# sys.modules[__name__] = _Const()
# 之后 import 此模块得到的是 _Const 实例
# const.MAX_SIZE = 100  # 第一次设置允许
# const.MAX_SIZE = 200  # ConstError: Can't rebind const 'MAX_SIZE'


# 方案 5：enum.Enum（一组相关常量）
class Color(Enum):
    RED = 1
    GREEN = 2
    BLUE = 3


class Direction(Enum):
    NORTH = auto()
    SOUTH = auto()
    EAST = auto()
    WEST = auto()


print(Color.RED)  # Color.RED
print(Color.RED.value)  # 1
print(Direction.NORTH.value)  # 1

# 枚举成员是单例
print(Color.RED is Color.RED)  # True

# 枚举不可修改
try:
    Color.RED = 2
except AttributeError as e:
    print(f"Error: {e}")  # cannot reassign member 'RED'


# IntEnum：可与整数比较
class Status(IntEnum):
    OK = 200
    NOT_FOUND = 404
    SERVER_ERROR = 500


print(Status.OK == 200)  # True
print(Status.OK + 1)  # 201


# 方案 6：frozen dataclass（不可变数据类）
from dataclasses import dataclass


@dataclass(frozen=True)
class Config:
    """不可变配置类"""
    host: str
    port: int
    debug: bool = False


config = Config(host="localhost", port=8080, debug=True)
print(config.host)  # localhost

try:
    config.host = "0.0.0.0"  # FrozenInstanceError
except Exception as e:
    print(f"Error: {type(e).__name__}: {e}")

# frozen dataclass 可哈希，可作为字典键或集合元素
print(hash(config))  # 哈希值
configs = {config: "default"}


# 方案 7：types.MappingProxyType（不可变字典视图）
from types import MappingProxyType

_config = {"host": "localhost", "port": 8080}
readonly_config = MappingProxyType(_config)

print(readonly_config["host"])  # localhost
try:
    readonly_config["host"] = "0.0.0.0"  # TypeError: 'mappingproxy' object does not support item assignment
except TypeError as e:
    print(f"Error: {e}")

# 但原字典可修改（影响代理视图）
_config["host"] = "0.0.0.0"
print(readonly_config["host"])  # 0.0.0.0


# 方案 8：__slots__ + __setattr__（节省内存的不可变类）
class ImmutablePoint:
    __slots__ = ('_x', '_y')

    def __init__(self, x, y):
        object.__setattr__(self, '_x', x)
        object.__setattr__(self, '_y', y)

    def __setattr__(self, name, value):
        raise AttributeError(f"'{type(self).__name__}' is immutable")

    def __delattr__(self, name):
        raise AttributeError(f"'{type(self).__name__}' is immutable")

    @property
    def x(self):
        return self._x

    @property
    def y(self):
        return self._y

    def __repr__(self):
        return f"ImmutablePoint({self._x}, {self._y})"


p = ImmutablePoint(1, 2)
print(p.x, p.y)  # 1 2
try:
    p.x = 10  # AttributeError
except AttributeError as e:
    print(f"Error: {e}")
```

### 5.8 类型注解与变量

```python
"""
类型注解（Type Hints）与变量
"""
from typing import Final, List, Dict, Tuple, Optional, Union, Any, ClassVar
from dataclasses import dataclass

# 变量注解（Python 3.6+，PEP 526）
x: int = 10
name: str = "Alice"
is_valid: bool = True
prices: list[float] = [1.0, 2.5, 3.7]
config: dict[str, int] = {"timeout": 30}

# 注解存储在 __annotations__ 中
print(__annotations__)  # {'x': int, 'name': str, ...}

# 注解不影响运行时类型
x: int = "hello"  # 运行时不报错（mypy 报错）

# Final：常量注解
MAX_SIZE: Final[int] = 100
# MAX_SIZE = 200  # mypy 报错，运行时不报错

# ClassVar：类变量注解（区别于实例变量）
class Counter:
    count: ClassVar[int] = 0  # 类变量
    value: int  # 实例变量

    def __init__(self, value: int):
        self.value = value

    def increment(self) -> None:
        Counter.count += 1


# Optional 与 Union
def greet(name: Optional[str] = None) -> str:
    if name is None:
        return "Hello, stranger"
    return f"Hello, {name}"


def process(data: Union[int, str, float]) -> str:
    return str(data)


# Python 3.10+ 使用 | 语法
def greet2(name: str | None = None) -> str:
    if name is None:
        return "Hello, stranger"
    return f"Hello, {name}"


def process2(data: int | str | float) -> str:
    return str(data)


# 复杂类型注解
def process_users(users: list[dict[str, int]]) -> dict[str, list[int]]:
    """处理用户列表，返回按状态分组的用户 ID"""
    result: dict[str, list[int]] = {}
    for user in users:
        status = "active" if user.get("active", 0) else "inactive"
        result.setdefault(status, []).append(user["id"])
    return result


# Tuple 类型
def get_point() -> tuple[float, float]:
    return (1.0, 2.0)


# 可变长度元组
def process_items(items: tuple[int, ...]) -> int:
    return sum(items)


# TypedDict：类型化字典
from typing import TypedDict


class UserDict(TypedDict):
    id: int
    name: str
    email: str
    active: bool


user: UserDict = {"id": 1, "name": "Alice", "email": "alice@example.com", "active": True}


# Protocol：结构子类型（鸭子类型的形式化）
from typing import Protocol


class SupportsClose(Protocol):
    def close(self) -> None:
        ...


def close_resource(resource: SupportsClose) -> None:
    resource.close()


class File:
    def close(self) -> None:
        print("File closed")


close_resource(File())  # 类型检查通过


# dataclass 与类型注解
@dataclass
class User:
    id: int
    name: str
    email: str
    active: bool = True
    tags: list[str] = None  # 错误！可变默认参数陷阱


# 正确写法：使用 field(default_factory=list)
from dataclasses import dataclass, field


@dataclass
class User2:
    id: int
    name: str
    email: str
    active: bool = True
    tags: list[str] = field(default_factory=list)
    metadata: dict[str, str] = field(default_factory=dict)


u1 = User2(id=1, name="Alice", email="alice@example.com")
u2 = User2(id=2, name="Bob", email="bob@example.com")
u1.tags.append("admin")
print(u1.tags)  # ['admin']
print(u2.tags)  # []（独立列表）


# Literal 类型：字面量类型
from typing import Literal


def set_mode(mode: Literal["read", "write", "append"]) -> None:
    print(f"Mode set to: {mode}")


set_mode("read")  # OK
# set_mode("delete")  # mypy 报错


# NewType：创建新类型（类型安全别名）
from typing import NewType

UserId = NewType("UserId", int)
UserName = NewType("UserName", str)


def get_user(user_id: UserId) -> UserName:
    # ...
    return UserName("Alice")


# 必须显式转换
user_id = UserId(123)
name = get_user(user_id)
```

---

## 6. 对比分析

### 6.1 Python vs Ruby

| 维度 | Python | Ruby |
|------|--------|------|
| 变量模型 | 名字绑定（标签） | 名字绑定（标签） |
| 赋值语法 | `x = 1` | `x = 1` |
| 作用域 | LEGB（函数级） | 块级（block scope） |
| 全局变量 | `global` 关键字 | `$` 前缀（`$x`） |
| 实例变量 | `self.x` | `@x` |
| 类变量 | 类体内定义 | `@@x` |
| 常量 | 无（约定 `UPPER_CASE`） | 大写开头（运行时警告修改） |
| 可变性 | 明确区分可变/不可变 | 大多可变（含字符串） |
| 冻结对象 | `frozen dataclass` | `Object.freeze` |

**核心差异**：

1. **作用域**：Python 的作用域是函数级的，Ruby 的作用域是块级的（block、proc、lambda 创建新作用域）。
2. **字符串可变性**：Python 的 `str` 不可变，Ruby 的 `String` 可变（`s << "world"` 原地修改）。
3. **常量强制**：Ruby 大写开头的变量是常量，修改会触发警告（但不阻止）；Python 完全依赖约定。
4. **冻结机制**：Ruby 的 `Object.freeze` 可冻结任意对象（运行时强制）；Python 的 `frozen dataclass` 仅适用于数据类。

### 6.2 Python vs JavaScript

| 维度 | Python | JavaScript |
|------|--------|-----------|
| 变量声明 | 隐式（赋值即声明） | `let`/`const`/`var` 显式 |
| 作用域 | LEGB（函数级） | 块级（`let`/`const`）、函数级（`var`） |
| 提升 | 无 | 有（hoisting） |
| 常量 | 无 `const` 关键字 | `const`（运行时强制，对象仍可变） |
| 基本类型 | `int`、`float`、`str`、`bool`、`None` | `number`、`string`、`boolean`、`null`、`undefined` |
| 引用语义 | 全部对象引用 | 基本类型值传递，对象引用传递 |
| 解构 | 元组解包、`match`/`case` | 解构赋值（对象、数组） |

**核心差异**：

1. **变量声明**：Python 赋值即声明，JS 必须显式声明（`let`/`const`/`var`）。
2. **常量强制**：JS 的 `const` 是运行时强制的（重新赋值报错），但对象的属性仍可修改；Python 完全依赖约定。
3. **提升**：JS 的 `var` 与函数声明会被提升到作用域顶部，Python 无此行为。
4. **基本类型**：Python 的整数是任意精度，JS 的 `number` 是 IEEE 754 双精度浮点（无真正的整数类型，`BigInt` 是后引入的）。

### 6.3 Python vs Go

| 维度 | Python | Go |
|------|--------|-----|
| 变量模型 | 名字绑定（引用语义） | 变量即盒子（值语义） |
| 赋值语法 | `x = 1` | `x := 1`（短变量声明）、`var x int = 1` |
| 类型 | 动态类型 | 静态类型 |
| 作用域 | LEGB（函数级） | 块级 |
| 常量 | 无 `const` 关键字 | `const`（编译期，无运行时强制） |
| 指针 | 无显式指针 | `*T` 指针类型 |
| 参数传递 | 对象引用传递 | 值传递（指针传递引用） |
| 可变性 | 明确区分可变/不可变 | 大多可变（`const` 修饰变量不可重新赋值） |

**核心差异**：

1. **变量模型**：Python 是引用语义（变量即标签），Go 是值语义（变量即盒子），需通过指针实现引用语义。
2. **常量机制**：Go 的 `const` 仅支持编译期常量（基本类型），无法定义运行时常量；Python 完全无 `const`，依赖约定。
3. **参数传递**：Python 是"对象引用传递"（pass-by-object-reference），Go 是值传递（pass-by-value，指针也是值）。
4. **类型系统**：Python 动态类型，Go 静态类型，编译期检查更严格。

### 6.4 综合对比表

| 特性 | Python | Ruby | JavaScript | Go | Rust | Java |
|------|--------|------|-----------|-----|------|------|
| 变量模型 | 标签 | 标签 | 标签 | 盒子 | 绑定 | 混合 |
| 动态类型 | 是 | 是 | 是 | 否 | 否 | 否 |
| 常量关键字 | 无 | 无 | `const` | `const` | `const` | `final` |
| 常量运行时强制 | 否 | 警告 | 是（变量） | 否 | 是 | 是 |
| 不可变对象 | `frozen` | `freeze` | 无 | 无 | `&T` | 无 |
| 作用域 | LEGB | 块级 | 块级/函数 | 块级 | 块级 | 块级/类 |
| 参数传递 | 对象引用 | 对象引用 | 值/引用混合 | 值 | 值/引用 | 值/引用 |
| 解构 | 元组解包、模式匹配 | 多重赋值 | 解构赋值 | 多重返回 | 模式匹配 | 无 |
| 类型注解 | 可选（PEP 484） | 无 | TS 可选 | 必须 | 必须 | 必须 |

---

## 7. 常见陷阱与反模式

### 7.1 可变默认参数陷阱

```python
# 反模式：可变默认参数
def add_item(item, lst=[]):  # 默认参数在定义时求值一次
    lst.append(item)
    return lst


print(add_item(1))  # [1]
print(add_item(2))  # [1, 2]（不是 [2]！）
print(add_item(3))  # [1, 2, 3]


# 正确模式：使用 None 哨兵
def add_item_fixed(item, lst=None):
    if lst is None:
        lst = []
    lst.append(item)
    return lst


print(add_item_fixed(1))  # [1]
print(add_item_fixed(2))  # [2]
```

### 7.2 闭包延迟绑定

```python
# 反模式：循环中的闭包
funcs = []
for i in range(3):
    funcs.append(lambda: i)

print([f() for f in funcs])  # [2, 2, 2]（预期 [0, 1, 2]）

# 正确模式 1：默认参数
funcs = [lambda i=i: i for i in range(3)]
print([f() for f in funcs])  # [0, 1, 2]

# 正确模式 2：工厂函数
def make_func(i):
    return lambda: i


funcs = [make_func(i) for i in range(3)]
print([f() for f in funcs])  # [0, 1, 2]

# 正确模式 3：functools.partial
from functools import partial

funcs = [partial(lambda x: x, i) for i in range(3)]
print([f() for f in funcs])  # [0, 1, 2]
```

### 7.3 循环变量泄漏

```python
# Python 3 中 for 循环变量不会泄漏到外层作用域
for i in range(3):
    pass
# print(i)  # 2（Python 3 中仍可访问，但不推荐依赖）

# 但在生成器表达式中
gen = (x for x in range(3))
print(list(gen))  # [0, 1, 2]
# print(x)  # NameError（生成器变量不泄漏）

# 反模式：依赖循环变量
numbers = [1, 2, 3]
for n in numbers:
    pass
# 使用 n 而非显式变量（不推荐）
# print(f"Last: {n}")  # 3
```

### 7.4 `is` 与 `==` 的误用

```python
# 反模式：用 is 比较值
a = 256
b = 256
print(a is b)  # True（CPython 整数缓存，不应依赖）

a = 1000
b = 1000
print(a is b)  # 不保证（可能 False）
print(a == b)  # True（正确）

# 正确模式：值比较用 ==
a = 1000
b = 1000
print(a == b)  # True

# 单例比较用 is
print(None is None)  # True
print(True is True)  # True

# 检查 None 必须用 is
x = None
if x is None:  # 正确
    print("x is None")
if x == None:  # 不推荐（PEP 8 警告）
    print("x == None")
```

### 7.5 全局可变状态

```python
# 反模式：全局可变状态
_global_cache = {}


def cache_get(key):
    return _global_cache.get(key)


def cache_set(key, value):
    _global_cache[key] = value


# 问题：测试间状态污染、多线程不安全

# 正确模式 1：类封装
class Cache:
    def __init__(self):
        self._data = {}

    def get(self, key):
        return self._data.get(key)

    def set(self, key, value):
        self._data[key] = value


cache = Cache()


# 正确模式 2：依赖注入
class Service:
    def __init__(self, cache):
        self.cache = cache


service = Service(Cache())


# 正确模式 3：contextvars（异步安全）
import contextvars

_request_cache = contextvars.ContextVar('request_cache', default={})


def handle_request():
    cache = _request_cache.get()
    # ...
```

### 7.6 浅拷贝陷阱

```python
import copy

# 反模式：浅拷贝后修改嵌套对象
original = [[1, 2], [3, 4]]
shallow = original.copy()

shallow[0].append(100)
print(original)  # [[1, 2, 100], [3, 4]]（受影响！）

# 正确模式：深拷贝
original = [[1, 2], [3, 4]]
deep = copy.deepcopy(original)

deep[0].append(100)
print(original)  # [[1, 2], [3, 4]]（不受影响）


# 反模式：字典浅拷贝
original = {"a": [1, 2], "b": [3, 4]}
shallow = original.copy()
shallow["a"].append(100)
print(original)  # {'a': [1, 2, 100], 'b': [3, 4]}

# 正确模式
original = {"a": [1, 2], "b": [3, 4]}
deep = copy.deepcopy(original)
deep["a"].append(100)
print(original)  # {'a': [1, 2], 'b': [3, 4]}
```

### 7.7 常量被意外修改

```python
# 反模式：依赖命名约定的常量
MAX_SIZE = 100
# ... 大量代码 ...
MAX_SIZE = 200  # 不小心修改，无任何报错

# 问题：运行时无法检测，可能导致难以追踪的 bug

# 正确模式 1：typing.Final + mypy
from typing import Final

MAX_SIZE: Final[int] = 100
# MAX_SIZE = 200  # mypy 报错（静态检查）

# 正确模式 2：frozen dataclass
from dataclasses import dataclass


@dataclass(frozen=True)
class Config:
    MAX_SIZE: int = 100
    TIMEOUT: int = 30


config = Config()
# config.MAX_SIZE = 200  # FrozenInstanceError（运行时报错）

# 正确模式 3：enum
from enum import Enum


class Limits(Enum):
    MAX_SIZE = 100
    TIMEOUT = 30


# Limits.MAX_SIZE = 200  # AttributeError（运行时报错）
```

### 7.8 类型注解混淆

```python
# 反模式：注解与实际类型不符
x: int = "hello"  # 运行时不报错，但 mypy 报错

# 反模式：误以为注解强制类型
def add(a: int, b: int) -> int:
    return a + b


print(add(1, 2))  # 3
print(add("1", "2"))  # "12"（运行时不报错！）

# 正确模式：运行时类型检查
from pydantic import BaseModel, validator


class AddRequest(BaseModel):
    a: int
    b: int


req = AddRequest(a=1, b=2)  # OK
# req = AddRequest(a="1", b="2")  # ValidationError（自动转换或报错）


# 反模式：可变默认参数与类型注解
from dataclasses import dataclass


@dataclass
class User:
    tags: list[str] = []  # 错误！共享默认参数


u1 = User()
u2 = User()
u1.tags.append("admin")
print(u2.tags)  # ['admin']（受影响！）

# 正确模式：default_factory
from dataclasses import field


@dataclass
class User2:
    tags: list[str] = field(default_factory=list)


u1 = User2()
u2 = User2()
u1.tags.append("admin")
print(u2.tags)  # []（独立列表）
```

---

## 8. 工程实践与最佳实践

### 8.1 命名规范

遵循 PEP 8 命名规范：

```python
# 变量与函数：snake_case
user_name = "Alice"


def calculate_total_price(items):
    pass


# 常量：UPPER_CASE
MAX_CONNECTIONS = 100
DEFAULT_TIMEOUT = 30
PI = 3.14159265359

# 类名：PascalCase（CapWords）
class UserProfile:
    pass


# 模块名：lower_case
# user_utils.py
# data_processor.py

# 包名：lower_case（短名）
# utils/
# services/

# 私有成员：_前缀
class Account:
    def __init__(self):
        self._balance = 0  # 私有（约定）

    def _validate(self):  # 私有方法
        pass


# 名称重整：__前缀（双下划线）
class BankAccount:
    def __init__(self):
        self.__pin = 1234  # _BankAccount__pin


# 特殊方法：__前后双下划线
class Vector:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __add__(self, other):
        return Vector(self.x + other.x, self.y + other.y)

    def __repr__(self):
        return f"Vector({self.x}, {self.y})"


# 类型变量：T、T_co、T_contra、K、V
from typing import TypeVar

T = TypeVar('T')
K = TypeVar('K')
V = TypeVar('V')
```

### 8.2 作用域管理

```python
# 最佳实践：最小作用域原则
def process_data(data):
    # 在使用处定义变量，而非函数开头
    result = []

    for item in data:
        # 局部变量，仅在此块有效
        processed = transform(item)
        result.append(processed)

    return result


def transform(item):
    return item * 2


# 避免：函数开头集中定义所有变量
def bad_practice(data):
    result = []
    processed = None  # 未使用就定义
    temp = None

    for item in data:
        processed = transform(item)
        result.append(processed)

    return result


# 最佳实践：使用闭包封装状态
def make_counter(start=0):
    count = start

    def increment():
        nonlocal count
        count += 1
        return count

    def reset():
        nonlocal count
        count = start

    return increment, reset


inc, reset = make_counter(10)
print(inc())  # 11
print(inc())  # 12
reset()
print(inc())  # 11


# 最佳实践：避免全局变量，使用类或模块封装
# 反模式
_global_counter = 0


def increment_global():
    global _global_counter
    _global_counter += 1


# 正确模式：类封装
class Counter:
    def __init__(self, start=0):
        self._count = start

    def increment(self):
        self._count += 1
        return self._count

    def reset(self):
        self._count = 0


counter = Counter()
print(counter.increment())  # 1
print(counter.increment())  # 2
```

### 8.3 常量管理

```python
"""
企业级常量管理实践
"""
from enum import Enum
from typing import Final
from dataclasses import dataclass


# 1. 模块级常量（简单场景）
# constants.py
APP_NAME = "MyApp"
VERSION = "1.0.0"
MAX_CONNECTIONS = 100


# 2. 分类常量（枚举）
class Environment(Enum):
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"


class HttpStatus(Enum):
    OK = 200
    NOT_FOUND = 404
    SERVER_ERROR = 500


class LogLevel(Enum):
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"


# 3. 配置常量（frozen dataclass）
@dataclass(frozen=True)
class DatabaseConfig:
    host: str
    port: int
    database: str
    user: str
    password: str  # 实际应从环境变量读取
    pool_size: int = 10
    timeout: int = 30

    def get_url(self) -> str:
        return f"postgresql://{self.user}:{self.password}@{self.host}:{self.port}/{self.database}"


# 4. 环境配置
@dataclass(frozen=True)
class AppConfig:
    env: Environment
    debug: bool
    database: DatabaseConfig
    secret_key: str

    @classmethod
    def from_env(cls):
        import os
        env = Environment(os.getenv("APP_ENV", "development"))
        return cls(
            env=env,
            debug=(env == Environment.DEVELOPMENT),
            database=DatabaseConfig(
                host=os.getenv("DB_HOST", "localhost"),
                port=int(os.getenv("DB_PORT", "5432")),
                database=os.getenv("DB_NAME", "myapp"),
                user=os.getenv("DB_USER", "postgres"),
                password=os.getenv("DB_PASSWORD", ""),
            ),
            secret_key=os.getenv("SECRET_KEY", "dev-secret-key"),
        )


# 5. 类型安全的常量访问
config = AppConfig.from_env()
print(config.env)  # Environment.DEVELOPMENT
print(config.database.host)  # localhost

# config.env = "test"  # FrozenInstanceError（不可修改）


# 6. 动态常量（运行时计算但不变）
import math


class MathConstants:
    PI: Final[float] = math.pi
    E: Final[float] = math.e
    GOLDEN_RATIO: Final[float] = (1 + math.sqrt(5)) / 2

    @classmethod
    def as_dict(cls) -> dict[str, float]:
        return {
            "PI": cls.PI,
            "E": cls.E,
            "GOLDEN_RATIO": cls.GOLDEN_RATIO,
        }


print(MathConstants.PI)  # 3.141592653589793
```

### 8.4 类型注解最佳实践

```python
"""
类型注解最佳实践
"""
from typing import Final, Optional, Union, List, Dict, Tuple, Callable, Any, TypeVar, Generic
from dataclasses import dataclass, field
from pydantic import BaseModel


# 1. 始终为函数添加类型注解
def calculate_total(items: list[dict[str, float]]) -> float:
    """计算商品总价"""
    return sum(item["price"] for item in items)


# 2. 使用 Optional 表示可选参数
def greet(name: Optional[str] = None) -> str:
    if name is None:
        return "Hello, stranger"
    return f"Hello, {name}"


# 3. 使用 Final 声明常量
MAX_RETRIES: Final[int] = 3
DEFAULT_TIMEOUT: Final[float] = 30.0


# 4. 使用 Literal 限制取值范围
from typing import Literal


def set_log_level(level: Literal["DEBUG", "INFO", "WARNING", "ERROR"]) -> None:
    print(f"Log level set to: {level}")


set_log_level("INFO")  # OK
# set_log_level("TRACE")  # mypy 报错


# 5. 使用 TypedDict 类型化字典
from typing import TypedDict


class UserDict(TypedDict):
    id: int
    name: str
    email: str
    active: bool


# 6. 使用 Protocol 定义接口
from typing import Protocol


class Repository(Protocol):
    def get(self, id: int) -> dict:
        ...

    def save(self, entity: dict) -> int:
        ...


class UserRepository:
    def get(self, id: int) -> dict:
        return {"id": id, "name": "Alice"}

    def save(self, entity: dict) -> int:
        return entity["id"]


def process(repo: Repository) -> None:
    user = repo.get(1)
    print(user)


process(UserRepository())  # 类型检查通过


# 7. 使用 TypeVar 与 Generic 实现泛型
T = TypeVar('T')


class Stack(Generic[T]):
    def __init__(self) -> None:
        self._items: list[T] = []

    def push(self, item: T) -> None:
        self._items.append(item)

    def pop(self) -> T:
        if not self._items:
            raise IndexError("pop from empty stack")
        return self._items.pop()

    def peek(self) -> T:
        if not self._items:
            raise IndexError("peek from empty stack")
        return self._items[-1]


stack: Stack[int] = Stack()
stack.push(1)
stack.push(2)
print(stack.pop())  # 2


# 8. 使用 Pydantic 进行运行时验证
class User(BaseModel):
    id: int
    name: str
    email: str
    age: int
    active: bool = True


user = User(id=1, name="Alice", email="alice@example.com", age=30)
print(user.name)  # Alice
# User(id="1", name="Alice", email="alice@example.com", age="thirty")  # ValidationError
```

### 8.5 变量可观测性

```python
"""
变量与内存的可观测性工具
"""
import sys
import gc
import tracemalloc
import linecache


# 1. 引用计数
x = [1, 2, 3]
print(sys.getrefcount(x))  # 2（x 与 getrefcount 的参数）

y = x
print(sys.getrefcount(x))  # 3

z = [x, x]
print(sys.getrefcount(x))  # 5

del y, z
print(sys.getrefcount(x))  # 2


# 2. 对象大小
print(sys.getsizeof(0))  # 28（小整数）
print(sys.getsizeof(1000000))  # 36（大整数）
print(sys.getsizeof("hello"))  # 54（字符串）
print(sys.getsizeof([1, 2, 3]))  # 88（列表）


# 3. 内存追踪
tracemalloc.start()


def process_data():
    data = [i ** 2 for i in range(10000)]
    return sum(data)


result = process_data()

snapshot = tracemalloc.take_snapshot()
top_stats = snapshot.statistics('lineno')

print("[ Top 5 memory allocations ]")
for stat in top_stats[:5]:
    print(stat)


# 4. 垃圾回收
gc.enable()
gc.set_debug(gc.DEBUG_STATS)


class Node:
    def __init__(self, value):
        self.value = value
        self.next = None


# 创建循环引用
node1 = Node(1)
node2 = Node(2)
node1.next = node2
node2.next = node1

# 移除外部引用
node1 = None
node2 = None

# 手动触发 GC
collected = gc.collect()
print(f"Collected {collected} objects")


# 5. 闭包变量检查
def make_adder(n):
    def adder(x):
        return x + n

    return adder


add5 = make_adder(5)
print(add5.__closure__)  # (<cell at 0x...: int object at 0x...>,)
print(add5.__closure__[0].cell_contents)  # 5


# 6. 函数注解与变量
def greet(name: str, times: int = 1) -> str:
    """问候函数"""
    return f"Hello, {name}! " * times


print(greet.__annotations__)  # {'name': <class 'str'>, 'times': <class 'int'>, 'return': <class 'str'>}
print(greet.__doc__)  # 问候函数
```

---

## 9. 案例研究

### 9.1 案例：Django Settings 模块

Django 使用 Python 模块机制实现配置管理，是"模块即单例"模式的典型应用。

```python
"""
Django Settings 模式分析
"""
import os
from pathlib import Path


# settings.py
BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")

DEBUG = os.getenv("DEBUG", "False") == "True"

ALLOWED_HOSTS = ["*"]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "myapp",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv("DB_NAME", "mydb"),
        "USER": os.getenv("DB_USER", "postgres"),
        "PASSWORD": os.getenv("DB_PASSWORD", ""),
        "HOST": os.getenv("DB_HOST", "localhost"),
        "PORT": os.getenv("DB_PORT", "5432"),
    }
}


# 使用 settings
from django.conf import settings


def get_database_url():
    """获取数据库 URL"""
    db = settings.DATABASES["default"]
    return f"postgresql://{db['USER']}:{db['PASSWORD']}@{db['HOST']}:{db['PORT']}/{db['NAME']}"


# 优点：
# 1. 模块级常量，全局唯一
# 2. 支持环境变量覆盖
# 3. Django 自动处理 import 时机
# 4. 支持多环境配置（settings.dev.py、settings.prod.py）

# 缺点：
# 1. 运行时可修改（无强制力）
# 2. 全局状态，测试隔离困难
# 3. 配置变更需重启应用
```

### 9.2 案例：pydantic-settings 配置管理

现代 Python 应用倾向于使用 pydantic-settings 进行类型安全的配置管理。

```python
"""
pydantic-settings 配置管理
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, PostgresDsn
from typing import Optional
from enum import Enum


class Environment(str, Enum):
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"


class Settings(BaseSettings):
    """应用配置（pydantic-settings 自动从环境变量加载）"""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # 应用配置
    APP_NAME: str = "MyApp"
    ENVIRONMENT: Environment = Environment.DEVELOPMENT
    DEBUG: bool = False
    SECRET_KEY: str = Field(..., min_length=32)

    # 数据库配置
    DATABASE_URL: PostgresDsn
    DB_POOL_SIZE: int = Field(default=10, ge=1, le=100)
    DB_TIMEOUT: int = Field(default=30, ge=1, le=300)

    # Redis 配置
    REDIS_URL: str = "redis://localhost:6379/0"

    # 日志配置
    LOG_LEVEL: str = "INFO"

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == Environment.PRODUCTION

    @property
    def is_development(self) -> bool:
        return self.ENVIRONMENT == Environment.DEVELOPMENT


# 使用
# settings = Settings()  # 自动从 .env 与环境变量加载
# print(settings.DATABASE_URL)
# print(settings.is_production)


# 优点：
# 1. 类型安全（自动类型转换与校验）
# 2. 不可变（pydantic v2 BaseSettings 默认不可变）
# 3. 支持环境变量与 .env 文件
# 4. 支持复杂类型（PostgresDsn、Enum 等）
# 5. 集成 IDE 类型提示

# 缺点：
# 1. 依赖 pydantic 库
# 2. 启动时校验开销（对大型配置）
```

### 9.3 案例：Feature Flags 模式

```python
"""
Feature Flags（功能开关）模式
"""
from dataclasses import dataclass, field
from typing import Optional
from enum import Enum


class FeatureStatus(Enum):
    ON = "on"
    OFF = "off"
    EXPERIMENTAL = "experimental"


@dataclass(frozen=True)
class FeatureFlag:
    name: str
    status: FeatureStatus
    description: str = ""
    rollout_percentage: int = 100  # 灰度发布百分比


class FeatureFlags:
    """功能开关管理器"""

    _flags: dict[str, FeatureFlag] = {}

    @classmethod
    def register(cls, flag: FeatureFlag) -> None:
        cls._flags[flag.name] = flag

    @classmethod
    def is_enabled(cls, name: str) -> bool:
        flag = cls._flags.get(name)
        if flag is None:
            return False
        return flag.status == FeatureStatus.ON

    @classmethod
    def get(cls, name: str) -> Optional[FeatureFlag]:
        return cls._flags.get(name)

    @classmethod
    def all_flags(cls) -> dict[str, FeatureFlag]:
        return dict(cls._flags)


# 注册功能开关
FeatureFlags.register(FeatureFlag(
    name="new_dashboard",
    status=FeatureStatus.ON,
    description="新版仪表盘",
))

FeatureFlags.register(FeatureFlag(
    name="ai_assistant",
    status=FeatureStatus.EXPERIMENTAL,
    description="AI 助手（实验性）",
    rollout_percentage=10,
))


# 使用
def render_dashboard():
    if FeatureFlags.is_enabled("new_dashboard"):
        return render_new_dashboard()
    return render_old_dashboard()


def render_new_dashboard():
    return "New Dashboard"


def render_old_dashboard():
    return "Old Dashboard"


print(render_dashboard())  # New Dashboard
print(FeatureFlags.is_enabled("ai_assistant"))  # False
```

### 9.4 案例：Flask 配置模式

```python
"""
Flask 配置模式
"""
import os
from flask import Flask


class Config:
    """基础配置"""
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-key")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_RECORD_QUERIES = True


class DevelopmentConfig(Config):
    """开发环境配置"""
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DEV_DATABASE_URL", "sqlite:///dev.db"
    )


class TestingConfig(Config):
    """测试环境配置"""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    WTF_CSRF_ENABLED = False


class ProductionConfig(Config):
    """生产环境配置"""
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL")


config = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig,
}


def create_app(config_name="default"):
    app = Flask(__name__)
    app.config.from_object(config[config_name])

    # 生产环境强制设置 SECRET_KEY
    if not app.config.get("SECRET_KEY"):
        raise RuntimeError("SECRET_KEY must be set in production")

    return app


# 使用
app = create_app("development")
print(app.config["DEBUG"])  # True
print(app.config["SQLALCHEMY_DATABASE_URI"])  # sqlite:///dev.db
```

### 9.5 案例：Pandas 与 NumPy 的内存模型

```python
"""
Pandas 与 NumPy 的内存模型：视图（View）与副本（Copy）
"""
import numpy as np
import pandas as pd


# NumPy 视图
arr = np.array([1, 2, 3, 4, 5])
view = arr[1:4]  # 视图（共享内存）
view[0] = 100
print(arr)  # [  1 100   3   4   5]（原数组受影响）

# NumPy 副本
arr = np.array([1, 2, 3, 4, 5])
copy = arr[1:4].copy()  # 显式副本
copy[0] = 100
print(arr)  # [1 2 3 4 5]（不受影响）


# Pandas 视图与副本
df = pd.DataFrame({"A": [1, 2, 3], "B": [4, 5, 6]})

# SettingWithCopyWarning 陷阱
# df[df.A > 1]["B"] = 100  # 可能不修改原 df（链式索引返回副本）

# 正确方式
df.loc[df.A > 1, "B"] = 100
print(df)
#    A    B
# 0  1    4
# 1  2  100
# 2  3  100


# Pandas 内存优化
df = pd.DataFrame({
    "category": ["A", "B", "A", "C", "B"] * 1000,
    "value": range(5000),
})

print(f"原始内存: {df.memory_usage(deep=True).sum()} bytes")

# 转换为 category 类型节省内存
df["category"] = df["category"].astype("category")
print(f"优化后内存: {df.memory_usage(deep=True).sum()} bytes")


# NumPy 数组的共享内存
a = np.zeros((3, 3))
b = a.reshape(9,)  # 视图
b[0] = 1
print(a[0, 0])  # 1.0（受影响）

# 转置也是视图
c = a.T  # 转置视图
c[0, 0] = 2
print(a[0, 0])  # 2.0
```

### 9.6 案例：多线程变量隔离

```python
"""
多线程与异步环境下的变量隔离
"""
import threading
import contextvars
from concurrent.futures import ThreadPoolExecutor


# 1. threading.local：线程本地存储
thread_local = threading.local()


def process_request(user_id):
    """每个线程独立的 user_id"""
    thread_local.user_id = user_id
    print(f"Thread {threading.current_thread().name}: user_id = {thread_local.user_id}")


with ThreadPoolExecutor(max_workers=3) as executor:
    executor.map(process_request, [1, 2, 3])


# 2. contextvars：异步安全的上下文变量（Python 3.7+）
request_id_var: contextvars.ContextVar[str] = contextvars.ContextVar('request_id', default='')
user_id_var: contextvars.ContextVar[int] = contextvars.ContextVar('user_id', default=0)


async def handle_request(request_id: str, user_id: int):
    """异步处理请求，每个协程独立的上下文"""
    request_id_var.set(request_id)
    user_id_var.set(user_id)

    # 在调用链中传递
    await process_business_logic()


async def process_business_logic():
    """业务逻辑函数，可访问上下文变量"""
    print(f"Request {request_id_var.get()}: processing for user {user_id_var.get()}")


import asyncio


async def main():
    await asyncio.gather(
        handle_request("req-1", 1001),
        handle_request("req-2", 1002),
        handle_request("req-3", 1003),
    )


# asyncio.run(main())


# 3. 上下文管理器封装
class RequestContext:
    """请求上下文管理器"""

    def __init__(self, request_id: str, user_id: int):
        self.request_id = request_id
        self.user_id = user_id
        self._tokens = []

    def __enter__(self):
        self._tokens.append(request_id_var.set(self.request_id))
        self._tokens.append(user_id_var.set(self.user_id))
        return self

    def __exit__(self, *args):
        for token in reversed(self._tokens):
            token.var.reset(token)


# 使用
def process_with_context():
    with RequestContext("req-123", 1001):
        print(f"Inside: {request_id_var.get()}, {user_id_var.get()}")
    # 离开上下文后自动恢复


process_with_context()
```

### 9.7 案例：调试变量与内存

```python
"""
调试变量与内存问题
"""
import sys
import gc
import weakref
import objgraph  # pip install objgraph


# 1. 检测循环引用
class Node:
    def __init__(self, value):
        self.value = value
        self.parent = None
        self.children = []

    def __repr__(self):
        return f"Node({self.value})"


def create_cycle():
    root = Node("root")
    child = Node("child")
    root.children.append(child)
    child.parent = root  # 循环引用
    return root


# 手动触发 GC
gc.collect()
gc.set_debug(gc.DEBUG_SAVEALL)

root = create_cycle()
del root

# 查看 GC 追踪的对象
print(f"GC objects: {len(gc.garbage)}")


# 2. 弱引用：避免循环引用
class WeakNode:
    def __init__(self, value):
        self.value = value
        self._parent = None  # 弱引用
        self.children = []

    @property
    def parent(self):
        return self._parent() if self._parent else None

    @parent.setter
    def parent(self, node):
        self._parent = weakref.ref(node) if node else None


root = WeakNode("root")
child = WeakNode("child")
root.children.append(child)
child.parent = root

# 弱引用不增加引用计数
print(sys.getrefcount(root))  # 2（root 与 getrefcount 参数）


# 3. 内存泄漏检测
def find_leaking_objects():
    """查找内存中的对象"""
    gc.collect()

    # 查看各类对象数量
    print("Top 5 types by count:")
    for obj_type, count in objgraph.most_common_types(limit=5):
        print(f"  {obj_type}: {count}")


# find_leaking_objects()


# 4. 引用链追踪
def trace_references(obj):
    """追踪对象的引用链"""
    print(f"Tracing references to: {obj}")
    referrers = gc.get_referrers(obj)
    for ref in referrers[:5]:  # 限制输出
        print(f"  Referenced by: {type(ref).__name__}")


x = [1, 2, 3]
y = [x]
z = {"list": x}
trace_references(x)


# 5. 变量作用域检查
def inspect_scope():
    """检查函数作用域"""
    local_var = "local"
    print("locals():", list(locals().keys()))
    print("globals() keys:", list(globals().keys())[:5])


inspect_scope()


# 6. 闭包变量检查
def make_counter():
    count = 0

    def increment():
        nonlocal count
        count += 1
        return count

    return increment


counter = make_counter()
print(f"Closure variables: {counter.__code__.co_freevars}")
print(f"Closure cells: {counter.__closure__}")
print(f"Cell contents: {counter.__closure__[0].cell_contents}")
```

---

## 10. 习题与思考题

### 10.1 基础题

**题目 1**：以下代码的输出是什么？解释原因。

```python
x = [1, 2, 3]
y = x
y.append(4)
print(x)
print(x is y)
```

**参考答案**：

```
[1, 2, 3, 4]
True
```

**解释**：`y = x` 将 `y` 绑定到 `x` 引用的同一列表对象。`y.append(4)` 原地修改该对象，`x` 与 `y` 都指向修改后的列表。

---

**题目 2**：以下代码的输出是什么？解释原因。

```python
def f(x=[]):
    x.append(1)
    return x

print(f())
print(f())
print(f())
```

**参考答案**：

```
[1]
[1, 1]
[1, 1, 1]
```

**解释**：默认参数 `[]` 在函数定义时求值一次，存入 `f.__defaults__`。每次调用 `f()` 都使用同一列表对象，`append` 累积元素。

---

**题目 3**：以下代码的输出是什么？解释原因。

```python
funcs = [lambda: i for i in range(3)]
print([f() for f in funcs])
```

**参考答案**：

```
[2, 2, 2]
```

**解释**：闭包捕获的是变量名 `i` 而非值。循环结束时 `i = 2`，所有闭包调用时都返回 `2`。

---

**题目 4**：修复以下代码，使其输出 `[0, 1, 2]`。

```python
funcs = [lambda: i for i in range(3)]
print([f() for f in funcs])
```

**参考答案**：

```python
# 方案 1：默认参数
funcs = [lambda i=i: i for i in range(3)]
print([f() for f in funcs])  # [0, 1, 2]

# 方案 2：工厂函数
def make_func(i):
    return lambda: i

funcs = [make_func(i) for i in range(3)]
print([f() for f in funcs])  # [0, 1, 2]

# 方案 3：functools.partial
from functools import partial

funcs = [partial(lambda x: x, i) for i in range(3)]
print([f() for f in funcs])  # [0, 1, 2]
```

### 10.2 应用题

**题目 1**：实现一个线程安全的计数器，使用 `nonlocal` 关键字。

**参考答案**：

```python
import threading


def make_thread_safe_counter(start=0):
    count = start
    lock = threading.Lock()

    def increment():
        nonlocal count
        with lock:
            count += 1
            return count

    def decrement():
        nonlocal count
        with lock:
            count -= 1
            return count

    def get():
        with lock:
            return count

    def reset():
        nonlocal count
        with lock:
            count = start

    return increment, decrement, get, reset


inc, dec, get, reset = make_thread_safe_counter()


def worker():
    for _ in range(1000):
        inc()


threads = [threading.Thread(target=worker) for _ in range(10)]
for t in threads:
    t.start()
for t in threads:
    t.join()

print(get())  # 10000
```

---

**题目 2**：实现一个不可变的二维向量类，支持加法与哈希。

**参考答案**：

```python
from dataclasses import dataclass
import math


@dataclass(frozen=True)
class Vector2D:
    x: float
    y: float

    def __add__(self, other: "Vector2D") -> "Vector2D":
        return Vector2D(self.x + other.x, self.y + other.y)

    def __sub__(self, other: "Vector2D") -> "Vector2D":
        return Vector2D(self.x - other.x, self.y - other.y)

    def __mul__(self, scalar: float) -> "Vector2D":
        return Vector2D(self.x * scalar, self.y * scalar)

    def magnitude(self) -> float:
        return math.sqrt(self.x ** 2 + self.y ** 2)

    def distance_to(self, other: "Vector2D") -> float:
        return (self - other).magnitude()


v1 = Vector2D(1, 2)
v2 = Vector2D(3, 4)
print(v1 + v2)  # Vector2D(x=4.0, y=6.0)
print(v1.distance_to(v2))  # 2.8284271247461903

# 不可变
try:
    v1.x = 10
except Exception as e:
    print(f"Error: {type(e).__name__}")  # FrozenInstanceError

# 可哈希
print(hash(v1))
points = {v1: "origin", v2: "target"}
```

---

**题目 3**：使用 `contextvars` 实现请求级别的上下文管理。

**参考答案**：

```python
import contextvars
from typing import Optional

# 上下文变量
request_id_var: contextvars.ContextVar[str] = contextvars.ContextVar('request_id', default='')
user_id_var: contextvars.ContextVar[Optional[int]] = contextvars.ContextVar('user_id', default=None)


class RequestContext:
    """请求上下文管理器"""

    def __init__(self, request_id: str, user_id: Optional[int] = None):
        self.request_id = request_id
        self.user_id = user_id
        self._tokens = []

    def __enter__(self):
        self._tokens.append(request_id_var.set(self.request_id))
        self._tokens.append(user_id_var.set(self.user_id))
        return self

    def __exit__(self, *args):
        for token in reversed(self._tokens):
            token.var.reset(token)


def get_current_request_id() -> str:
    return request_id_var.get()


def get_current_user_id() -> Optional[int]:
    return user_id_var.get()


# 使用
with RequestContext("req-123", 1001):
    print(get_current_request_id())  # req-123
    print(get_current_user_id())  # 1001

print(get_current_request_id())  # （恢复默认值）
```

### 10.3 分析题

**题目 1**：分析以下代码的内存使用情况，是否存在内存泄漏？

```python
class Cache:
    _cache = {}

    @classmethod
    def get(cls, key):
        return cls._cache.get(key)

    @classmethod
    def set(cls, key, value):
        cls._cache[key] = value


for i in range(1000000):
    Cache.set(f"key_{i}", f"value_{i}" * 100)
```

**参考答案**：

存在内存泄漏。`Cache._cache` 是类变量，存储的键值对永不释放，持续增长直至耗尽内存。

**修复方案**：

1. 使用 `functools.lru_cache` 限制缓存大小。
2. 使用 `weakref.WeakValueDictionary` 允许值被 GC 回收。
3. 实现 TTL（Time-To-Live）机制，定期清理过期项。
4. 使用 `cachetools.TTLCache` 等成熟缓存库。

```python
from cachetools import TTLCache

cache = TTLCache(maxsize=10000, ttl=3600)  # 最多 10000 项，1 小时过期
```

---

**题目 2**：分析以下代码的作用域问题，给出修复方案。

```python
counter = 0

def increment():
    counter += 1

def get_counter():
    return counter

for _ in range(10):
    increment()

print(get_counter())
```

**参考答案**：

`increment()` 函数内 `counter += 1` 等价于 `counter = counter + 1`，解释器将 `counter` 视为局部变量，但读取时未定义，抛出 `UnboundLocalError`。

**修复方案**：

```python
# 方案 1：声明 global
counter = 0

def increment():
    global counter
    counter += 1


# 方案 2：使用类封装（推荐）
class Counter:
    def __init__(self):
        self._count = 0

    def increment(self):
        self._count += 1

    def get(self):
        return self._count


counter = Counter()
for _ in range(10):
    counter.increment()
print(counter.get())  # 10
```

### 10.4 评价题

**题目**：评价 Python"无常量关键字"设计的优缺点，给出你的观点。

**参考答案**：

**优点**：

1. **灵活性**：动态语言哲学，允许元编程与运行时修改。
2. **简单性**：无需学习额外的 `const` 语义。
3. **一致性**：与 Python"约定优于强制"的整体风格一致。
4. **互操作性**：便于与 C 扩展、动态加载模块交互。

**缺点**：

1. **安全性不足**：无法运行时阻止常量被修改。
2. **依赖外部工具**：需借助 mypy 等静态检查器。
3. **团队协作风险**：新人可能不小心修改常量。
4. **与强类型语言差异大**：来自 C++/Rust 的开发者不适应。

**我的观点**：

Python 的"无常量"设计是合理的，符合其动态语言哲学。但生产环境应采用分层方案：

1. **类型层**：使用 `typing.Final` + mypy 静态检查。
2. **运行时层**：使用 `frozen dataclass`、`enum.Enum`、`MappingProxyType` 实现运行时强制。
3. **约定层**：`UPPER_CASE` 命名约定 + 代码审查。

这样既保留了 Python 的灵活性，又获得了常量的安全性。

### 10.5 创造题

**题目**：设计一个支持"运行时不可变 + 类型注解 + 配置热更新"的企业级配置管理模块。

**参考答案**：

```python
"""
企业级配置管理模块
"""
from typing import Final, ClassVar, Optional, Any, TypeVar, Generic
from dataclasses import dataclass, field, replace
from pathlib import Path
import json
import os
import threading
from contextlib import contextmanager


T = TypeVar('T')


class ConfigError(Exception):
    """配置错误"""


@dataclass(frozen=True)
class DatabaseConfig:
    host: str
    port: int
    database: str
    user: str
    password: str = ""
    pool_size: int = 10
    timeout: int = 30

    @property
    def url(self) -> str:
        return f"postgresql://{self.user}:{self.password}@{self.host}:{self.port}/{self.database}"


@dataclass(frozen=True)
class RedisConfig:
    host: str
    port: int
    db: int = 0
    password: str = ""


@dataclass(frozen=True)
class AppConfig:
    app_name: str
    version: str
    debug: bool
    secret_key: str
    database: DatabaseConfig
    redis: RedisConfig

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "AppConfig":
        return cls(
            app_name=data["app_name"],
            version=data["version"],
            debug=data.get("debug", False),
            secret_key=data["secret_key"],
            database=DatabaseConfig(**data["database"]),
            redis=RedisConfig(**data.get("redis", {"host": "localhost", "port": 6379})),
        )

    @classmethod
    def from_file(cls, path: str | Path) -> "AppConfig":
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return cls.from_dict(data)


class ConfigManager:
    """配置管理器：支持原子热更新"""

    _instance: ClassVar[Optional["ConfigManager"]] = None
    _lock: ClassVar[threading.Lock] = threading.Lock()

    def __init__(self, config: AppConfig):
        self._config = config
        self._listeners: list = []

    @classmethod
    def get_instance(cls) -> "ConfigManager":
        if cls._instance is None:
            raise ConfigError("ConfigManager not initialized")
        return cls._instance

    @classmethod
    def initialize(cls, config: AppConfig) -> "ConfigManager":
        with cls._lock:
            if cls._instance is None:
                cls._instance = cls(config)
            else:
                cls._instance._update(config)
            return cls._instance

    def _update(self, new_config: AppConfig) -> None:
        """原子更新配置"""
        old_config = self._config
        self._config = new_config
        # 通知监听器
        for listener in self._listeners:
            listener(old_config, new_config)

    def reload(self, config: AppConfig) -> None:
        """重新加载配置"""
        self._update(config)

    def reload_from_file(self, path: str | Path) -> None:
        """从文件重新加载配置"""
        new_config = AppConfig.from_file(path)
        self.reload(new_config)

    @property
    def config(self) -> AppConfig:
        return self._config

    def add_listener(self, listener) -> None:
        """添加配置变更监听器"""
        self._listeners.append(listener)

    def remove_listener(self, listener) -> None:
        """移除监听器"""
        self._listeners.remove(listener)


# 使用示例
if __name__ == "__main__":
    config = AppConfig(
        app_name="MyApp",
        version="1.0.0",
        debug=True,
        secret_key="dev-secret-key",
        database=DatabaseConfig(
            host="localhost",
            port=5432,
            database="mydb",
            user="postgres",
        ),
        redis=RedisConfig(host="localhost", port=6379),
    )

    manager = ConfigManager.initialize(config)
    print(manager.config.app_name)  # MyApp

    # 配置不可变
    try:
        manager.config.debug = False
    except Exception as e:
        print(f"Error: {type(e).__name__}")  # FrozenInstanceError

    # 热更新
    def on_config_change(old, new):
        print(f"Config updated: debug {old.debug} -> {new.debug}")

    manager.add_listener(on_config_change)

    new_config = replace(config, debug=False)
    manager.reload(new_config)  # Config updated: debug True -> False
```

### 10.6 思考题

**思考题 1**：为什么 Python 不引入 `const` 关键字？如果引入会有什么问题？

**思考题 2**：Python 的 `is` 运算符在什么场景下应该使用？什么场景下不应该使用？

**思考题 3**：在异步编程中，如何安全地管理请求级别的变量？`contextvars` 与 `threading.local` 有何区别？

---

## 11. 参考文献

### 11.1 官方文档

1. Python Software Foundation. *The Python Language Reference* [EB/OL]. (2024-10-07). https://docs.python.org/3/reference/.
2. Python Software Foundation. *The Python Tutorial: Classes* [EB/OL]. (2024-10-07). https://docs.python.org/3/tutorial/classes.html.
3. Python Software Foundation. *Python Frequently Asked Questions: Programming* [EB/OL]. (2024-10-07). https://docs.python.org/3/faq/programming.html.
4. Python Software Foundation. *PEP 8: Style Guide for Python Code* [EB/OL]. (2001-07-05). https://peps.python.org/pep-0008/.
5. Smith, N. C. *PEP 227: Statically Nested Scopes* [EB/OL]. (2000-11-01). https://peps.python.org/pep-0227/.
6. Cannon, B. *PEP 3104: Access to Names in Outer Scopes* [EB/OL]. (2006-10-02). https://peps.python.org/pep-3104/.
7. Rossum, G. v. *PEP 526: Syntax for Variable Annotations* [EB/OL]. (2016-08-09). https://peps.python.org/pep-0526/.
8. Rossum, G. v. *PEP 484: Type Hints* [EB/OL]. (2014-09-29). https://peps.python.org/pep-0484/.
9. Eddington, C. *PEP 572: Assignment Expressions* [EB/OL]. (2018-02-28). https://peps.python.org/pep-0572/.
10. Brandl, G. *PEP 634: Structural Pattern Matching* [EB/OL]. (2020-09-12). https://peps.python.org/pep-0634/.

### 11.2 经典书籍

11. Lutz, M. *Learning Python* [M]. 5th ed. Sebastopol: O'Reilly Media, 2013.
12. Ramalho, L. *Fluent Python* [M]. 2nd ed. Sebastopol: O'Reilly Media, 2022.
13. Slatkin, B. *Effective Python* [M]. 2nd ed. Boston: Addison-Wesley, 2019.
14. Beazley, D., Jones, B. K. *Python Cookbook* [M]. 3rd ed. Sebastopol: O'Reilly Media, 2013.
15. Hettinger, R. *Beyond PEP 8 -- Best Practices for Beautiful Intelligible Code* [C]. PyCon 2015, 2015.

### 11.3 论文与演讲

16. Batchelder, N. *Python Names and Values* [C]. PyCon 2015, 2015. https://www.youtube.com/watch?v=_AEJHKGk9ns.
17. Rhodes, B. *Practices of the Pythonic Pro* [C]. PyCon 2018, 2018. https://www.youtube.com/watch?v=Ljx7mOlOLgE.
18. Shaw, Z. D. *Learn Python 3 the Hard Way* [M]. Boston: Addison-Wesley, 2017.

### 11.4 在线资源

19. Python Software Foundation. *Python Module of the Week: copy* [EB/OL]. https://pymotw.com/3/copy/.
20. Real Python. *Python Variables* [EB/OL]. https://realpython.com/python-variables/.

---

## 12. 延伸阅读

### 12.1 进阶主题

- **Python 内存模型**：深入理解 CPython 的内存管理、对象分配与回收机制。
- **描述符协议**：理解属性访问的底层机制，`property`、`classmethod`、`staticmethod` 的实现原理。
- **元类**：掌握类创建过程的自定义，`type`、`__init_subclass__`、`__set_name__` 的应用。
- **数据类**：PEP 557 的完整设计，`field`、`default_factory`、`frozen` 的实践。
- **类型注解系统**：PEP 484、PEP 526、PEP 612、PEP 695 的演化路径。

### 12.2 相关文档

- *python/基础数据类型*：Python 内置类型的完整参考。
- *python/函数参数与返回值*：参数传递机制、默认参数、可变参数的深入分析。
- *python/作用域与闭包*：LEGB 规则、闭包原理、装饰器的本质。
- *python/类型注解与mypy*：静态类型检查的完整指南。
- *python/面向对象编程*：类、继承、多态、封装的实践。
- *python/内存模型与垃圾回收*：引用计数、循环 GC、内存优化的深入剖析。

### 12.3 工具与库

- **mypy**：Python 静态类型检查器，支持 `Final`、`ClassVar` 等注解。
- **Pyright**：微软的 Python 类型检查器，VS Code 默认集成。
- **pydantic**：运行时数据验证库，基于类型注解。
- **pydantic-settings**：基于 pydantic 的配置管理库。
- **attrs**：替代 dataclass 的第三方库，更强大的功能。
- **cachetools**：缓存库，提供 `TTLCache`、`LRUCache` 等。
- **objgraph**：内存分析工具，可视化对象引用关系。

### 12.4 社区资源

- **Python 官方论坛**：https://discuss.python.org/
- **Reddit r/Python**：https://reddit.com/r/Python
- **Stack Overflow Python 标签**：https://stackoverflow.com/questions/tagged/python
- **Python Weekly**：每周 Python 新闻邮件
- **Talk Python To Me**：Python 播客

### 12.5 学习路径

1. **入门**：掌握基本赋值、作用域、类型分类。
2. **进阶**：理解名字绑定模型、引用语义、可变性。
3. **高级**：掌握闭包、装饰器、描述符、元类。
4. **专家**：深入内存模型、GC 机制、性能优化。
5. **架构**：配置管理、依赖注入、可观测性。

---

## 附录 A：变量与常量速查表

### A.1 赋值语法

| 语法 | 说明 | 示例 |
|------|------|------|
| `x = value` | 基本赋值 | `x = 10` |
| `x, y = a, b` | 多重赋值 | `x, y = 1, 2` |
| `a = b = c = value` | 链式赋值 | `a = b = c = 0` |
| `x += value` | 增量赋值 | `x += 1` |
| `x := value` | 海象运算符（表达式赋值） | `if (n := len(s)) > 10:` |
| `x, *rest = iterable` | 星号解包 | `first, *rest = [1, 2, 3]` |
| `x: T = value` | 类型注解赋值 | `x: int = 10` |
| `x: Final[T] = value` | 常量注解 | `MAX: Final[int] = 100` |

### A.2 作用域关键字

| 关键字 | 作用 | 示例 |
|--------|------|------|
| `global` | 声明全局变量 | `global x; x = 1` |
| `nonlocal` | 声明外层变量 | `nonlocal x; x += 1` |
| `del` | 删除名字绑定 | `del x` |
| `lambda` | 匿名函数（闭包） | `f = lambda x: x * 2` |

### A.3 可变性表

| 类型 | 可变性 | 示例 |
|------|--------|------|
| `int` | 不可变 | `x = 10; x += 1` 创建新对象 |
| `float` | 不可变 | `x = 1.5; x += 0.5` 创建新对象 |
| `bool` | 不可变 | `True`/`False` 单例 |
| `str` | 不可变 | `s = "hi"; s += "!"` 创建新字符串 |
| `tuple` | 不可变（引用） | `t = (1, [2]); t[1].append(3)` 合法 |
| `frozenset` | 不可变 | `fs = frozenset([1, 2])` |
| `bytes` | 不可变 | `b = b"hello"` |
| `list` | 可变 | `lst.append(1)` 原地修改 |
| `dict` | 可变 | `d["key"] = value` 原地修改 |
| `set` | 可变 | `s.add(1)` 原地修改 |
| `bytearray` | 可变 | `ba.extend(b"...")` 原地修改 |

### A.4 常量实现方案对比

| 方案 | 运行时强制 | 类型安全 | 灵活性 | 推荐场景 |
|------|-----------|----------|--------|----------|
| `UPPER_CASE` 约定 | 否 | 否 | 高 | 简单脚本 |
| `typing.Final` | 否（静态） | 是 | 中 | 类型注解项目 |
| `__setattr__` 拦截 | 是 | 否 | 低 | 严格常量类 |
| `enum.Enum` | 是 | 是 | 中 | 枚举常量 |
| `@dataclass(frozen=True)` | 是 | 是 | 中 | 配置对象 |
| `types.MappingProxyType` | 是 | 否 | 低 | 只读字典 |
| `frozenset` / `tuple` | 是 | 否 | 中 | 不可变集合 |

---

## 附录 B：术语表

| 术语 | 英文 | 定义 |
|------|------|------|
| 名字绑定 | Name Binding | 将名字关联到对象的过程 |
| 引用语义 | Reference Semantics | 变量存储对象引用而非值本身 |
| 值语义 | Value Semantics | 变量存储值本身 |
| 身份相等 | Identity Equality | `is` 运算符，比较 `id()` |
| 值相等 | Value Equality | `==` 运算符，比较 `__eq__` |
| 可变性 | Mutability | 对象是否可在原地修改 |
| 作用域 | Scope | 名字可见的代码区域 |
| LEGB | LEGB | Local, Enclosing, Global, Built-in |
| 闭包 | Closure | 捕获外层作用域变量的函数 |
| 引用计数 | Reference Counting | 跟踪对象引用数量的内存管理机制 |
| 垃圾回收 | Garbage Collection | 自动回收不可达对象的机制 |
| 浅拷贝 | Shallow Copy | 创建新容器，元素引用相同 |
| 深拷贝 | Deep Copy | 递归复制所有嵌套对象 |
| 不可变对象 | Immutable Object | 创建后不可修改的对象 |
| 冻结数据类 | Frozen Dataclass | `@dataclass(frozen=True)` 标注的不可变类 |
| 上下文变量 | Context Variable | `contextvars.ContextVar`，异步安全的上下文存储 |

---

## 更新日志

- 2026-07-21: 完整重写为金标准教学文档，新增 12 章节结构、KaTeX 数学公式、企业级案例研究、习题与参考答案。
- 2026-04-05: 拆分变量作用域 LEGB 规则，扩写赋值方式、常量实现、命名规范等内容。
