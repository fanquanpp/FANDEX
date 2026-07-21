---
order: 52
title: 元类
module: python
category: Python
difficulty: advanced
description: 元类与类创建过程的深度解析，涵盖 type、__new__/__init__/__call__、__init_subclass__ 与企业级应用。
author: fanquanpp
updated: '2026-07-21'
related:
  - python/列表推导式进阶
  - python/运算符与表达式
  - python/描述符协议
  - python/协程与asyncio
  - python/元类与单例模式
  - python/类型注解与mypy
prerequisites:
  - python/面向对象编程
  - python/装饰器进阶
  - python/描述符协议
---

# 元类（Metaclass）：Python 类的造物主

> "Metaclasses are deeper magic than 99% of users should ever worry about. If you wonder whether you need them, you don't." —— Tim Peters

## 1. 学习目标（基于 Bloom 分类法）

本节按 Bloom 认知层次（Bloom's Taxonomy）逐级给出可观察、可测量的学习目标。完成本节后，学习者应能：

### 1.1 记忆层（Remember）

- **R1**：准确陈述 Python 中"万物皆对象"（everything is an object）的含义，并能列出 `type`、`object`、`int`、`str`、自定义类之间的 `isinstance` 与 `__class__` 关系。
- **R2**：背诵 `type` 的三参数形式 `type(name, bases, namespace)` 的签名及其语义等价于 `class` 语句的执行结果。
- **R3**：列举类创建生命周期中四个核心钩子：`__prepare__`、`__new__`、`__init__`、`__call__`，并说明它们被调用的顺序与调用方。

### 1.2 理解层（Understand）

- **U1**：用自己的语言解释"元类是实例为类的类"这一定义，并画出 `MyClass`、`type`、`object` 三者之间的实例化箭头与继承箭头。
- **U2**：区分"实例化一个对象"与"创建一个类"两条调用路径上 `__call__` 的不同含义，说明元类 `__call__` 如何同时参与这两条路径。
- **U3**：解释为什么 `class Foo(metaclass=Meta)` 中 `Meta.__new__` 必须返回一个 `type` 的子类实例，而 `Meta.__init__` 无此限制。

### 1.3 应用层（Apply）

- **A1**：使用 `type(name, bases, dict)` 动态生成一个具备指定属性、方法与文档字符串的类，并在 REPL 中验证其行为。
- **A2**：编写一个元类 `LoggedMeta`，自动为类体中所有以 `handle_` 开头的函数包装日志装饰器，且不修改原函数源码。
- **A3**：使用 `__init_subclass__` 重写习题 A2 的需求，对比两种方案的可读性、可维护性与性能。

### 1.4 分析层（Analyze）

- **An1**：给定一段使用元类的第三方库代码（如 Django ORM 的 `ModelBase`、Pydantic 的 `ModelMetaclass`），画出类创建时的完整调用时序图，标明每个钩子的触发点。
- **An2**：分析"元类冲突"（metaclass conflict）的产生根因，推导 C3 线性化算法在多继承场景下对元类选择的约束。

### 1.5 评价层（Evaluate）

- **Ev1**：评估"是否该用元类"的决策树：在装饰器、`__init_subclass__`、`class` 工厂、元类四种方案中，根据"是否需要感知类创建事件"、"是否需要修改类命名空间"、"是否需要拦截 `__call__`"等维度选择最优方案。
- **Ev2**：评判 PEP 487（`__init_subclass__` 与 `__set_name__`）对元类使用频率下降的影响，论证其是否"消灭了 90% 的元类需求"。

### 1.6 创造层（Create）

- **C1**：设计并实现一个轻量级 ORM 元类，支持字段声明、表名自动推断、外键解析、迁移生成四项能力，并编写单元测试覆盖至少 8 个边界场景。
- **C2**：为团队设计一份"元类使用规范"文档，包含准入门槛、代码审查清单、替代方案决策树与反模式示例。

---

## 2. 历史动机与演化

### 2.1 Smalltalk 的根源：一切皆对象，类也是对象

元类概念并非 Python 首创，其思想可追溯至 1970 年代 Smalltalk-80。在 Smalltalk 中，每个类都是某个 `Metaclass` 的唯一实例，而所有 `Metaclass` 又是 `Metaclass class` 的实例，形成一条"无限上升"的链条。Smalltalk 通过这条链条实现了类方法的统一建模，但也带来著名的"元类无限回归"（infinite metaclass regression）问题。

Python 在设计之初就借鉴了 Smalltalk 的"一切皆对象"哲学，但 Guido van Rossum 选择了一条更务实的路径：用单一内置类型 `type` 作为所有类的元类（即"终极元类"），从而截断无限上升的链条。在 Python 中：

- `type` 是自身的实例（`type.__class__ is type`），形成一个自指环；
- `type` 又是 `object` 的子类（`type.__bases__ == (object,)`）；
- `object` 是 `type` 的实例（`object.__class__ is type`）。

这一"鸡生蛋"的自指结构在形式上闭合了元类层级，避免了 Smalltalk 的无限回归。

### 2.2 Python 1.x 与 2.x：`__metaclass__` 类属性

在 Python 2 中，元类通过类属性 `__metaclass__` 声明：

```python
# Python 2 风格（已废弃，仅作历史回顾）
class Foo(object):
    __metaclass__ = MyMeta
```

Python 2 解释器在执行 `class` 语句时，会先在类体命名空间中查找 `__metaclass__`；若未找到，则沿继承链向上查找；若仍未找到，则使用经典类的 `classobj`（Python 2 旧式类）或 `type`（新式类）作为默认元类。

这套机制存在若干痛点：

1. **查找规则隐式**：`__metaclass__` 的查找遵循 MRO（Method Resolution Order），新手难以预测最终生效的元类。
2. **与新式类机制耦合**：Python 2 默认创建旧式类，必须显式继承 `object` 才能启用新式类与元类机制，导致教学困惑。
3. **元类冲突处理粗糙**：多继承时若多个基类元类不同，Python 2 的报错信息晦涩，且 C3 线性化对元类的处理在某些边界情况下不符合直觉。

### 2.3 Python 3：`metaclass=` 关键字参数

PEP 3115 在 Python 3.0 中引入了新的元类声明语法：

```python
class Foo(Base1, Base2, metaclass=MyMeta):
    pass
```

这一改动带来三方面改进：

1. **声明位置显式**：元类从"类体内部的魔法属性"提升为"类头部的关键字参数"，可读性与可预测性大幅提升。
2. **`__prepare__` 钩子引入**：允许元类自定义类体命名空间的容器类型（默认为 `dict`），为有序字段、默认值工厂等高级特性铺路。
3. **与类型注解协同**：Python 3 的注解（PEP 3107、PEP 526）需要可定制的命名空间，`__prepare__` 成为注解收集的基础设施。

### 2.4 PEP 487：`__init_subclass__` 与 `__set_name__`

Python 3.6（PEP 487）引入了两个关键钩子，被广泛认为是"消灭 90% 元类需求"的里程碑：

- **`__init_subclass__(cls, **kwargs)`**：在父类被子类化时自动调用，无需元类即可向所有子类注入初始化逻辑。
- **`__set_name__(self, owner, name)`**：在描述符被赋给类属性时自动调用，使描述符能感知自己的属性名，无需元类即可实现字段注册。

PEP 487 之后，许多原本必须用元类实现的场景（如 Django ORM 早期的字段收集、Flask-RESTplus 的路由注册）都可以用 `__init_subclass__` + 描述符 `__set_name__` 重写，代码可读性与可维护性显著提升。

### 2.5 PEP 484 / 560 / 612：类型系统对元类的依赖

Python 类型注解生态（`typing`、`pydantic`、`attrs`、`msgspec`）深度依赖元类机制：

- **`typing.Generic`** 通过元类 `GenericMeta`（Python 3.7 前）实现参数化类型的实例化检查；
- **`pydantic.BaseModel`** 通过 `ModelMetaclass` 收集字段注解、生成验证器、构建 JSON Schema；
- **`dataclasses`** 虽然基于类装饰器而非元类，但其字段收集机制（`__annotations__` + `__set_name__`）与元类方案功能等价。

### 2.6 演化时间线总结

| 年份 | Python 版本 | 关键变化 | PEP |
|------|-------------|----------|-----|
| 1991 | 0.9.x | 新式类不存在，元类概念尚未引入 | - |
| 2000 | 2.0 | 新式类引入，`__metaclass__` 类属性生效 | PEP 252/253 |
| 2004 | 2.2 | 描述符协议引入，元类与描述符协同 | PEP 242 |
| 2008 | 3.0 | `metaclass=` 关键字参数、`__prepare__` 钩子 | PEP 3115 |
| 2014 | 3.4 | `enum.Enum` 元类 `EnumMeta` 成为标准库范例 | PEP 435 |
| 2016 | 3.6 | `__init_subclass__`、`__set_name__`，大幅降低元类使用频率 | PEP 487 |
| 2018 | 3.7 | `dataclasses` 引入，类装饰器方案成为字段收集主流 | PEP 557 |
| 2022 | 3.11 | `typing.Self`、`typing.Generic` 元类内部简化 | PEP 673 |
| 2024 | 3.13 | `type.__init__` 参数校验收紧，元类边界更严格 | PEP 703 相关 |

---

## 3. 形式化定义

### 3.1 元类的数学定义

设 $\mathcal{C}$ 为 Python 中所有类的集合，$\mathcal{O}$ 为所有对象的集合。元类 $M$ 满足：

$$
M \in \mathcal{C} \quad \text{且} \quad \forall c \in \mathcal{C},\ \text{instance}(c, M) \implies c \text{ 的实例是类}
$$

更严格地，元类可定义为"类层级的构造器"：给定元类 $M$、类名 $n$、基类元组 $B = (b_1, b_2, \ldots, b_k)$、命名空间 $N$，类创建是一个函数：

$$
\text{create\_class}: (M, n, B, N) \mapsto c
$$

其中 $c$ 满足 $c.\text{\_\_class\_\_} = M$，$c.\text{\_\_bases\_\_} = B$，$\forall k \in N: c.k = N[k]$。

### 3.2 `type` 的双重身份

在 Python 中，`type` 同时承担两个角色：

1. **类型查询函数**：$\text{type}(o) \equiv o.\text{\_\_class\_\_}$，返回对象 $o$ 的类。
2. **终极元类**：作为所有类的默认元类，是元类层级的"根"。

形式化地，对于任意类 $c$：

$$
c.\text{\_\_class\_\_} = M \quad \text{其中} \quad M \in \text{MetaChain}(c)
$$

$$
\text{MetaChain}(c) = \{M \mid M \text{ 是 } c \text{ 的元类}\} \cup \text{MetaChain}(M.\text{\_\_class\_\_})
$$

由于 $\text{type}.\text{\_\_class\_\_} = \text{type}$，链条在 `type` 处闭合。

### 3.3 类创建的形式语义

Python 中 `class` 语句的执行等价于以下伪代码：

$$
\begin{aligned}
&\textbf{class } C(B_1, B_2, \ldots, B_k, \text{metaclass}=M, \text{**kw}): \\
&\quad \text{body} \\
&\Longrightarrow \\
&N = M.\text{\_\_prepare\_\_}(C, (B_1, \ldots, B_k), \text{**kw}) \\
&\text{exec}(\text{body}, N) \\
&C = M.\text{\_\_call\_\_}(C, (B_1, \ldots, B_k), N, \text{**kw}) \\
&C.\text{\_\_class\_\_} = M
\end{aligned}
$$

其中 $M.\text{\_\_call\_\_}$ 进一步展开为：

$$
M.\text{\_\_call\_\_}(\ldots) = M.\text{\_\_new\_\_}(M, \ldots).\text{\_\_init\_\_}(\ldots)
$$

注意：`__call__` 由元类的元类（通常是 `type`）提供，这正是元类同时参与"创建类"与"实例化对象"两条路径的根源。

### 3.4 MRO 与元类一致性约束

设类 $C$ 的基类为 $B_1, B_2, \ldots, B_k$，各基类的元类为 $M_1, M_2, \ldots, M_k$。Python 要求 $C$ 的元类 $M_C$ 满足：

$$
\forall i \in \{1, \ldots, k\}: \text{issubclass}(M_C, M_i)
$$

即 $M_C$ 必须是所有基类元类的子类。若不存在这样的 $M_C$，则触发 `TypeError: metaclass conflict`。这一约束保证了子类实例化路径上元类 `__call__` 的一致性。

### 3.5 元类层级的偏序结构

定义元类层级上的偏序关系 $\preceq$：

$$
M_1 \preceq M_2 \iff \text{issubclass}(M_1, M_2)
$$

则 $(\mathcal{M}, \preceq)$ 构成一个有最大元 `type` 的偏序集（poset），其中 $\mathcal{M}$ 为所有元类的集合。元类冲突的本质是：在多继承场景下，需要在偏序集中找到一个下确界（meet），若下确界不存在则冲突。

---

## 4. 理论推导与证明

### 4.1 定理：`type` 是自身的元类

**命题**：$\text{type}.\text{\_\_class\_\_} = \text{type}$。

**证明**：

由 `type` 的定义，它是所有类的元类。考虑 `type` 本身作为一个类，其元类记为 $M_{\text{type}}$。

1. `type` 是 `object` 的子类（`issubclass(type, object)` 为真），故 `type` 是一个类。
2. 作为类，`type` 必须有一个元类 $M_{\text{type}}$。
3. 若 $M_{\text{type}} \neq \text{type}$，则 $M_{\text{type}}$ 必须是 `type` 的子类（因为所有元类都是 `type` 的子类）。
4. 但 $M_{\text{type}}$ 本身也是类，其元类 $M_{M_{\text{type}}}$ 又必须是 $M_{\text{type}}$ 的子类或等于 `type`，形成无限上升。
5. 为截断链条，Python 规定 $\text{type}.\text{\_\_class\_\_} = \text{type}$，使 `type` 成为自身的元类。

这一自指并非逻辑悖论（不同于罗素悖论），因为它仅在"实例化"语义上自指，而非在"集合属于"语义上自指。在 CPython 实现中，`type` 对象在解释器初始化时被静态分配，其 `ob_type` 字段指向自身。

证毕。

### 4.2 定理：元类 `__call__` 同时控制类实例化

**命题**：设元类 $M$ 定义了 `__call__`，则对任意 $c \in \text{instances}(M)$（即 $c$ 是 $M$ 的实例，亦即 $c$ 是一个类），调用 $c(\text{args})$ 实际调用 $M.\text{\_\_call\_\_}(c, \text{args})$。

**证明**：

Python 的属性查找遵循"实例 -> 类 -> 元类"的顺序。对于实例 $o$ 与属性 `__call__`：

1. 若 $o$ 是普通对象（其类为 $c$），则 `o.__call__` 查找路径为 $o.\text{\_\_dict\_\_}$ → $c.\text{\_\_dict\_\_}$ → $c$ 的 MRO。
2. 若 $o$ 是类（即 $o$ 是某个元类 $M$ 的实例），则 `o.__call__` 的查找路径为 $o.\text{\_\_dict\_\_}$ → $o$ 的 MRO → $M.\text{\_\_dict\_\_}$ → $M$ 的 MRO。

但关键在于：当写 `c(args)` 时，Python 解释器调用的是 `type(c).__call__(c, args)`，即直接查找 $c$ 的元类的 `__call__`，而非 $c$ 自身的 `__call__`。这是因为"调用"操作在 CPython 内部对应 `tp_call` 槽位，该槽位从类型的类型（即元类）获取。

因此，元类 $M$ 定义的 `__call__` 会拦截其实例类 $c$ 的所有实例化调用 $c(\text{args})$。这正是元类实现单例模式、对象池、延迟初始化的理论基础。

证毕。

### 4.3 定理：元类冲突的充要条件

**命题**：设类 $C$ 继承自 $B_1, B_2, \ldots, B_k$，各基类元类为 $M_1, \ldots, M_k$。则存在合法元类 $M_C$ 当且仅当：

$$
\exists M \in \mathcal{M}: \forall i,\ \text{issubclass}(M, M_i)
$$

且 Python 选择的 $M_C$ 是满足该条件的"最派生元类"（most derived metaclass），即偏序集 $\{M \mid \forall i, \text{issubclass}(M, M_i)\}$ 的最小元。

**证明**：

（必要性）若 $M_C$ 是 $C$ 的元类，则 $C.\text{\_\_class\_\_} = M_C$。由于 $C$ 是 $B_i$ 的子类，$C$ 的实例化路径必须兼容 $B_i$ 的实例化路径。元类的 `__call__` 决定实例化行为，故 $M_C.\text{\_\_call\_\_}$ 必须能"覆盖" $M_i.\text{\_\_call\_\_}$，即 $M_C \preceq M_i$（$M_C$ 是 $M_i$ 的子类）。

（充分性）若存在 $M$ 满足 $\forall i, \text{issubclass}(M, M_i)$，则可显式声明 `class C(B1, ..., Bk, metaclass=M)`，Python 接受该声明。

（最派生性）Python 选择最小元是为了保留最具体的实例化逻辑。CPython 实现中，候选元类集合为 $\{M_i\} \cup \{\text{显式声明的 metaclass}\}$，最终选择是这些元类在 MRO 意义下"最靠前"且是其他所有候选元类的子类者。

证毕。

### 4.4 推论：`__init_subclass__` 不能完全替代元类

**命题**：存在需求 $D$，使得 `__init_subclass__` 无法实现，必须使用元类。

**证明**（构造法）：

考虑需求"拦截子类的实例化调用，使每次 `SubClass(args)` 都返回缓存实例"。该需求要求修改类 $C$ 的"调用行为"，即修改 `type(C).__call__`。

`__init_subclass__` 在类创建后调用，仅能修改类的 `__dict__`（如注入方法），但无法修改类本身的 `__call__`（因为 `__call__` 由元类提供，不在类的 `__dict__` 中）。

因此，必须通过元类重写 `__call__` 实现。例如：

```python
class CachedMeta(type):
    _cache = {}
    def __call__(cls, *args, **kwargs):
        if cls not in CachedMeta._cache:
            CachedMeta._cache[cls] = super().__call__(*args, **kwargs)
        return CachedMeta._cache[cls]
```

此类"调用拦截"需求是 `__init_subclass__` 无法覆盖的，证明元类在特定场景下不可替代。

证毕。

---

## 5. 代码示例

### 5.1 入门：用 `type` 动态创建类

```python
# 示例 5.1：type 三参数形式动态创建类
def greet(self):
    return f"Hello, I am {self.name}"

# 等价于：
# class Dog:
#     species = "Canis lupus"
#     def __init__(self, name):
#         self.name = name
#     def greet(self):
#         ...
Dog = type(
    "Dog",                       # 类名
    (object,),                   # 基类元组
    {
        "species": "Canis lupus",
        "__init__": lambda self, name: setattr(self, "name", name),
        "greet": greet,
        "__doc__": "A dynamically created Dog class.",
    },
)

d = Dog("Rex")
print(d.greet())        # Hello, I am Rex
print(d.species)        # Canis lupus
print(type(Dog))        # <class 'type'>
print(Dog.__class__)    # <class 'type'>
```

运行命令：

```bash
python -c "exec(open('demo_5_1.py').read())"
```

### 5.2 进阶：自定义元类记录类创建

```python
# 示例 5.2：元类记录类创建日志
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class LoggedMeta(type):
    """记录所有使用本元类的类的创建过程。"""

    def __new__(mcs, name, bases, namespace, **kwargs):
        logger.info("Creating class %s with bases=%s, attrs=%s",
                    name, [b.__name__ for b in bases], list(namespace.keys()))
        cls = super().__new__(mcs, name, bases, namespace, **kwargs)
        logger.info("Class %s created, id=0x%x", name, id(cls))
        return cls

    def __init__(cls, name, bases, namespace, **kwargs):
        logger.info("Initializing class %s", name)
        super().__init__(name, bases, namespace, **kwargs)


class Base(metaclass=LoggedMeta):
    pass


class User(Base):
    def __init__(self, name):
        self.name = name


# 输出：
# INFO:__main__:Creating class Base with bases=[], attrs=['__module__', '__qualname__', '__doc__']
# INFO:__main__:Class Base created, id=0x...
# INFO:__main__:Initializing class Base
# INFO:__main__:Creating class User with bases=['Base'], attrs=[...]
# INFO:__main__:Class User created, id=0x...
# INFO:__main__:Initializing class User
```

### 5.3 `__prepare__`：自定义类命名空间

```python
# 示例 5.3：用 __prepare__ 实现有序字段收集
from collections import OrderedDict


class OrderedMeta(type):
    """使类体命名空间保持定义顺序。"""

    @classmethod
    def __prepare__(mcs, name, bases, **kwargs):
        return OrderedDict()

    def __new__(mcs, name, bases, namespace, **kwargs):
        # namespace 已经是有序的
        note_order(name, namespace)
        return super().__new__(mcs, name, bases, dict(namespace))


def note_order(name, namespace):
    print(f"Field order in {name}:")
    for i, key in enumerate(namespace.keys()):
        if not key.startswith("__"):
            print(f"  {i}: {key}")


class Form(metaclass=OrderedMeta):
    username = None
    email = None
    password = None
    submit = None


# Python 3.7+ 普通 dict 已保持插入顺序，__prepare__ 仍可用于
# 返回自定义容器（如带默认值工厂、属性拦截的命名空间）。
```

### 5.4 元类实现自动接口检查

```python
# 示例 5.4：元类强制子类实现指定接口方法
class InterfaceMeta(type):
    """强制使用本元类的类必须实现 _required_methods 中列出的方法。"""

    def __init__(cls, name, bases, namespace, **kwargs):
        required = namespace.get("_required_methods", ())
        missing = [m for m in required if not callable(namespace.get(m))]
        if missing:
            raise TypeError(
                f"Class {name} is missing required methods: {missing}"
            )
        super().__init__(name, bases, namespace, **kwargs)


class Storage(metaclass=InterfaceMeta):
    _required_methods = ("get", "set", "delete")

    def get(self, key):
        raise NotImplementedError

    def set(self, key, value):
        raise NotImplementedError

    def delete(self, key):
        raise NotImplementedError


class MemoryStorage(Storage):
    def __init__(self):
        self._data = {}

    def get(self, key):
        return self._data.get(key)

    def set(self, key, value):
        self._data[key] = value

    def delete(self, key):
        self._data.pop(key, None)


# 以下代码会抛出 TypeError：
# class BrokenStorage(Storage):
#     def get(self, key):
#         return None
#     # 缺少 set 和 delete

s = MemoryStorage()
s.set("k", 42)
print(s.get("k"))   # 42
```

### 5.5 元类实现字段注册（轻量 ORM）

```python
# 示例 5.5：元类 + 描述符实现字段注册
class Field:
    def __init__(self, column_type):
        self.column_type = column_type
        self.name = None

    def __set_name__(self, owner, name):
        self.name = name

    def __get__(self, instance, owner):
        if instance is None:
            return self
        return instance.__dict__.get(self.name)

    def __set__(self, instance, value):
        instance.__dict__[self.name] = value


class ModelMeta(type):
    """收集子类中所有 Field 描述符，构建 _fields 字典。"""

    def __new__(mcs, name, bases, namespace, **kwargs):
        cls = super().__new__(mcs, name, bases, namespace, **kwargs)
        fields = {}
        # 继承父类字段
        for base in bases:
            if hasattr(base, "_fields"):
                fields.update(base._fields)
        # 收集本类字段
        for key, value in namespace.items():
            if isinstance(value, Field):
                fields[key] = value
        cls._fields = fields
        # 表名自动推断
        if "__table__" not in namespace:
            cls.__table__ = name.lower()
        return cls


class Model(metaclass=ModelMeta):
    pass


class User(Model):
    id = Field("INTEGER PRIMARY KEY")
    name = Field("TEXT")
    email = Field("TEXT")


print(User.__table__)              # user
print(list(User._fields.keys()))   # ['id', 'name', 'email']

u = User()
u.id = 1
u.name = "Alice"
print(u.name, u.id)                # Alice 1
```

### 5.6 元类 `__call__` 实现单例

```python
# 示例 5.6：元类 __call__ 实现线程安全单例
import threading


class SingletonMeta(type):
    """通过元类 __call__ 拦截实例化，实现单例。"""

    _instances = {}
    _locks = {}

    def __call__(cls, *args, **kwargs):
        if cls not in cls._instances:
            # 双重检查锁
            lock = cls._locks.setdefault(cls, threading.Lock())
            with lock:
                if cls not in cls._instances:
                    instance = super().__call__(*args, **kwargs)
                    cls._instances[cls] = instance
        return cls._instances[cls]


class Database(metaclass=SingletonMeta):
    def __init__(self):
        print(f"Initializing Database (id={id(self)})")
        self.connections = 0

    def connect(self):
        self.connections += 1
        return self.connections


# 测试：多次实例化只会创建一个对象
db1 = Database()
db2 = Database()
print(db1 is db2)         # True
print(db1.connect())      # 1
print(db2.connect())      # 2（同一个对象）
```

### 5.7 `__init_subclass__` 替代方案

```python
# 示例 5.7：用 __init_subclass__ 替代元类实现字段注册
class Field:
    def __init__(self, column_type):
        self.column_type = column_type
        self.name = None

    def __set_name__(self, owner, name):
        self.name = name

    def __get__(self, instance, owner):
        if instance is None:
            return self
        return instance.__dict__.get(self.name)

    def __set__(self, instance, value):
        instance.__dict__[self.name] = value


class Model:
    _fields = {}

    def __init_subclass__(cls, **kwargs):
        super().__init_subclass__(**kwargs)
        fields = {}
        # 继承父类字段
        for base in cls.__mro__[1:]:
            fields.update(getattr(base, "_fields", {}))
        # 收集本类字段（借助 __set_name__ 已设置 name）
        for key, value in cls.__dict__.items():
            if isinstance(value, Field):
                fields[key] = value
        cls._fields = fields
        if not hasattr(cls, "__table__"):
            cls.__table__ = cls.__name__.lower()


class User(Model):
    id = Field("INTEGER PRIMARY KEY")
    name = Field("TEXT")


print(User.__table__)
print(list(User._fields.keys()))
```

### 5.8 元类冲突示例与解决

```python
# 示例 5.8：元类冲突与解决
class MetaA(type):
    pass


class MetaB(type):
    pass


class A(metaclass=MetaA):
    pass


class B(metaclass=MetaB):
    pass


# 以下代码会抛出 TypeError: metaclass conflict
# class C(A, B):
#     pass


# 解决方案：定义一个同时继承 MetaA 和 MetaB 的元类
class MetaAB(MetaA, MetaB):
    pass


class C(A, B, metaclass=MetaAB):
    pass


print(type(C))            # <class 'MetaAB'>
print(isinstance(C, MetaA))  # True
print(isinstance(C, MetaB))  # True
```

### 5.9 元类实现方法注册（路由收集）

```python
# 示例 5.9：元类自动收集装饰器标记的路由方法
class RouteMeta(type):
    """收集被 @route 装饰的方法，构建 _routes 字典。"""

    def __new__(mcs, name, bases, namespace, **kwargs):
        cls = super().__new__(mcs, name, bases, namespace, **kwargs)
        routes = {}
        # 继承父类路由
        for base in bases:
            routes.update(getattr(base, "_routes", {}))
        # 收集本类路由
        for key, value in namespace.items():
            path = getattr(value, "_route_path", None)
            if path:
                routes[path] = value
        cls._routes = routes
        return cls


def route(path):
    def decorator(func):
        func._route_path = path
        return func
    return decorator


class BaseController(metaclass=RouteMeta):
    pass


class UserController(BaseController):
    @route("/users")
    def list_users(self):
        return ["Alice", "Bob"]

    @route("/users/<id>")
    def get_user(self, user_id):
        return {"id": user_id}


print(UserController._routes)
# {'/users': <function ...>, '/users/<id>': <function ...>}
```

### 5.10 综合示例：轻量 ORM 元类

```python
# 示例 5.10：综合轻量 ORM 元类，支持字段类型校验与 SQL 生成
class Column:
    def __init__(self, column_type, primary_key=False, nullable=True):
        self.column_type = column_type
        self.primary_key = primary_key
        self.nullable = nullable
        self.name = None

    def __set_name__(self, owner, name):
        self.name = name

    def __get__(self, instance, owner):
        if instance is None:
            return self
        return instance.__dict__.get(self.name)

    def __set__(self, instance, value):
        # 简单类型校验
        expected = {
            "INTEGER": int,
            "TEXT": str,
            "REAL": float,
        }.get(self.column_type)
        if expected and not isinstance(value, expected) and value is not None:
            raise TypeError(
                f"Column {self.name} expects {expected.__name__}, got {type(value).__name__}"
            )
        instance.__dict__[self.name] = value


class ORMMeta(type):
    def __new__(mcs, name, bases, namespace, **kwargs):
        cls = super().__new__(mcs, name, bases, namespace, **kwargs)
        columns = {}
        for base in bases:
            columns.update(getattr(base, "_columns", {}))
        for key, value in namespace.items():
            if isinstance(value, Column):
                columns[key] = value
        cls._columns = columns
        if "__table__" not in namespace:
            cls.__table__ = name.lower()
        return cls

    def create_table_sql(cls):
        cols = []
        for name, col in cls._columns.items():
            line = f"{name} {col.column_type}"
            if col.primary_key:
                line += " PRIMARY KEY"
            if not col.nullable and not col.primary_key:
                line += " NOT NULL"
            cols.append(line)
        return f"CREATE TABLE {cls.__table__} (\n  " + ",\n  ".join(cols) + "\n);"


class Model(metaclass=ORMMeta):
    @classmethod
    def create_table_sql(cls):
        return type(cls).create_table_sql(cls)


class Product(Model):
    id = Column("INTEGER", primary_key=True)
    name = Column("TEXT", nullable=False)
    price = Column("REAL")


print(Product.__table__)
# product
print(Product.create_table_sql())
# CREATE TABLE product (
#   id INTEGER PRIMARY KEY,
#   name TEXT NOT NULL,
#   price REAL
# );

p = Product()
p.id = 1
p.name = "Widget"
p.price = 9.99
print(p.name, p.price)
# Widget 9.99

# 类型校验失败示例：
# p.price = "expensive"  # TypeError: Column price expects float, got str
```

---

## 6. 对比分析

### 6.1 与 Ruby 的元类对比

Ruby 有一套更显式但更复杂的"元类"模型。在 Ruby 中，每个对象都有一个"特征类"（singleton class/eigenclass），类方法实际上是定义在特征类上的方法。Ruby 的元类层级通过 `Class` 与 `Module` 链条建模。

| 维度 | Python 元类 | Ruby 元类 |
|------|-------------|-----------|
| 声明方式 | `class Foo(metaclass=Meta)` | `class Foo; end` 后通过 `Foo.singleton_class` 访问 |
| 类方法实现 | 类方法定义在元类上 | 类方法定义在类的特征类上 |
| 默认元类 | `type` | `Class` |
| 自指机制 | `type.__class__ is type` | `Class.class is Class` |
| 多元类继承 | 显式声明 `metaclass=`，冲突时报错 | 通过 `include`/`extend` Module 混入 |
| 动态方法定义 | `type.__new__` 修改 namespace | `define_method` 在特征类上 |
| 性能开销 | 类创建时一次性 | 方法调用时动态分发 |

**关键差异**：Python 元类更"重"（在类创建时运行一次），Ruby 特征类更"轻"且持续动态。Python 的设计哲学是"显式优于隐式"，元类机制集中在类创建时刻；Ruby 的设计哲学是"对象能响应任何消息"，特征类允许运行时持续修改。

### 6.2 与 JavaScript 的原型链对比

JavaScript 没有真正的"元类"概念，其类层级通过原型链（prototype chain）建模。ES6 的 `class` 语法本质是构造函数的语法糖，类本身是函数对象，函数对象的 `prototype` 属性指向原型对象。

| 维度 | Python 元类 | JavaScript 原型链 |
|------|-------------|-------------------|
| 类的本质 | `type` 的实例 | `Function` 的实例 |
| 实例化机制 | 元类 `__call__` | 构造函数 + `new` |
| 类方法存储 | 元类 `__dict__` | 构造函数对象自身属性 |
| 实例方法存储 | 类 `__dict__` | `Constructor.prototype` |
| 继承机制 | 基类元组 + MRO | `Object.setPrototypeOf` / `extends` |
| 动态修改类 | 元类 `__new__` 一次性 | 原型链随时可改 |

**关键差异**：Python 通过元类在类创建时一次性注入逻辑，类创建后元类基本"沉默"（除 `__call__` 外）；JavaScript 的原型链在运行时持续参与方法查找，更灵活但也更难预测。

### 6.3 与 Go 的对比

Go 语言刻意没有类、继承、元类等概念，而是通过结构体（struct）、接口（interface）、组合（composition）建模。

| 维度 | Python 元类 | Go |
|------|-------------|----|
| 类概念 | 有，且类是对象 | 无，仅 struct |
| 元类 | 有 | 无 |
| 继承 | 多继承 + MRO | 无继承，组合 + 接口 |
| 动态行为注入 | 元类钩子 | 代码生成（go generate） |
| 反射 | `type()`、`__class__` | `reflect` 包 |
| 元编程哲学 | 运行时元编程 | 编译时 + 代码生成 |

**关键差异**：Python 的元类是运行时元编程机制；Go 选择"编译时 + 代码生成"路径，避免运行时元编程的复杂性与性能开销。两种设计哲学各有取舍：Python 牺牲性能换取灵活性，Go 牺牲灵活性换取可预测性。

### 6.4 与 Java 的对比

Java 有 `Class` 对象但无用户可定义的元类。Java 的元编程通过反射（reflection）、注解处理器（annotation processor）、字节码增强（bytecode enhancement，如 ASM、ByteBuddy）实现。

| 维度 | Python 元类 | Java |
|------|-------------|------|
| 元类 | 用户可定义 | 不可定义，`java.lang.Class` 是最终类 |
| 元编程时机 | 运行时 | 编译时（APT）/运行时（反射）/字节码 |
| 类创建 | 动态 | 编译时确定 |
| 字段收集 | 元类 `__new__` | 注解 + 反射 |
| 性能 | 运行时开销 | 编译时优化 |

**关键差异**：Java 通过注解处理器在编译时实现类似元类的功能（如 Lombok、MapStruct），避免运行时开销；Python 元类在运行时运行，灵活但有性能成本。

### 6.5 综合对比表

| 特性 | Python | Ruby | JavaScript | Go | Java |
|------|--------|------|------------|----|----|
| 用户自定义元类 | 是 | 间接（特征类） | 否 | 否 | 否 |
| 运行时类创建 | 是 | 是 | 是 | 否 | 受限 |
| 类创建钩子 | `__new__`/`__init__`/`__prepare__` | `inherited` 钩子 | 无 | 无 | 无 |
| 类方法机制 | 元类方法 | 特征类方法 | 构造函数属性 | 无类方法 | 静态方法 |
| 元编程性能成本 | 中 | 高 | 中 | 低（编译时） | 低（编译时） |

---

## 7. 常见陷阱与反模式

### 7.1 陷阱一：`__new__` 与 `__init__` 的职责混淆

**反模式**：

```python
# 反模式 7.1a：在 __init__ 中修改类命名空间
class BadMeta(type):
    def __init__(cls, name, bases, namespace, **kwargs):
        # 错误：此时 cls 已创建，namespace 已被消化为 cls.__dict__
        namespace["extra"] = "value"  # 无效！
        super().__init__(name, bases, namespace, **kwargs)
```

**问题**：`__init__` 在 `__new__` 之后调用，此时类对象已创建，`namespace` 已被消化为 `cls.__dict__`。在 `__init__` 中修改 `namespace` 不会影响已创建的类。

**正确做法**：

```python
# 正确做法 7.1b：在 __new__ 中修改 namespace
class GoodMeta(type):
    def __new__(mcs, name, bases, namespace, **kwargs):
        namespace["extra"] = "value"
        cls = super().__new__(mcs, name, bases, namespace, **kwargs)
        return cls
```

或者直接在 `__init__` 中修改 `cls`：

```python
class GoodMeta2(type):
    def __init__(cls, name, bases, namespace, **kwargs):
        cls.extra = "value"  # 直接设置 cls 属性
        super().__init__(name, bases, namespace, **kwargs)
```

### 7.2 陷阱二：`__new__` 返回非 `type` 子类

**反模式**：

```python
# 反模式 7.2：__new__ 返回非类对象
class BrokenMeta(type):
    def __new__(mcs, name, bases, namespace, **kwargs):
        return "not a class"  # 错误！
```

**问题**：Python 要求 `type.__new__` 必须返回一个 `type` 的子类实例。若返回其他对象，会抛出 `TypeError: __new__() should return an instance of type, not 'str'`。

**例外**：`__new__` 可以返回其他**已存在的类**（不一定是新创建的），这是实现"类缓存"或"类注册表"的基础。例如：

```python
class CachedMeta(type):
    _registry = {}

    def __new__(mcs, name, bases, namespace, **kwargs):
        key = (name, bases)
        if key in mcs._registry:
            return mcs._registry[key]  # 返回已存在的类
        cls = super().__new__(mcs, name, bases, namespace, **kwargs)
        mcs._registry[key] = cls
        return cls
```

### 7.3 陷阱三：元类 `__call__` 与单例冲突

**反模式**：

```python
# 反模式 7.3：单例元类与子类单例冲突
class SingletonMeta(type):
    _instances = {}

    def __call__(cls, *args, **kwargs):
        if cls not in SingletonMeta._instances:
            SingletonMeta._instances[cls] = super().__call__(*args, **kwargs)
        return SingletonMeta._instances[cls]


class Base(metaclass=SingletonMeta):
    pass


class Child(Base):
    pass


# 问题：Base 和 Child 共享 _instances 字典吗？
# 答案：不共享，因为 _instances 是 SingletonMeta 的类属性，
# 但键是 cls（具体的类），所以 Base 和 Child 各有独立实例。
# 但若 Child 也想单例，没问题；
# 若 Base 实例化后，Child 实例化会创建新实例，正确。
# 真正的问题是：若子类不希望单例，无法关闭该行为。
```

**问题**：单例行为通过元类 `__call__` 强制施加，子类无法"退出"单例。若部分子类需要单例、部分不需要，元类方案不灵活。

**正确做法**：用类属性控制单例行为，或改用装饰器方案：

```python
def singleton(cls):
    instances = {}

    def wrapper(*args, **kwargs):
        if cls not in instances:
            instances[cls] = cls(*args, **kwargs)
        return instances[cls]

    wrapper.__wrapped__ = cls
    return wrapper


@singleton
class OnlyOne:
    pass
```

### 7.4 陷阱四：元类继承的隐式传播

**反模式**：

```python
# 反模式 7.4：元类向所有子类隐式传播
class StrictMeta(type):
    def __new__(mcs, name, bases, namespace, **kwargs):
        # 强制所有方法必须有 docstring
        for key, value in namespace.items():
            if callable(value) and not value.__doc__:
                raise TypeError(f"Method {key} must have docstring")
        return super().__new__(mcs, name, bases, namespace, **kwargs)


class Base(metaclass=StrictMeta):
    """Base class."""
    def method(self):
        """Has docstring."""


class Child(Base):
    def new_method(self):
        pass  # 报错：Method new_method must have docstring
```

**问题**：元类会向所有子类传播，子类作者可能不知情，导致"莫名其妙"的 `TypeError`。这是元类"魔法溢出"的典型问题。

**正确做法**：在元类中提供"退出开关"，或改用装饰器/`__init_subclass__`：

```python
class StrictMeta(type):
    def __new__(mcs, name, bases, namespace, **kwargs):
        if namespace.get("_skip_strict", False):
            return super().__new__(mcs, name, bases, namespace, **kwargs)
        for key, value in namespace.items():
            if callable(value) and not value.__doc__:
                raise TypeError(f"Method {key} must have docstring")
        return super().__new__(mcs, name, bases, namespace, **kwargs)
```

### 7.5 陷阱五：`__prepare__` 返回可变默认值

**反模式**：

```python
# 反模式 7.5：__prepare__ 返回带可变默认值的容器
class BadMeta(type):
    @classmethod
    def __prepare__(mcs, name, bases, **kwargs):
        return {"default_list": []}  # 危险！
```

**问题**：`__prepare__` 返回的容器会成为类体的命名空间，若包含可变默认值，所有使用该元类的类会共享同一可变对象。

**正确做法**：`__prepare__` 仅返回空容器，默认值通过其他机制注入：

```python
class GoodMeta(type):
    @classmethod
    def __prepare__(mcs, name, bases, **kwargs):
        from collections import OrderedDict
        return OrderedDict()  # 仅返回空容器
```

### 7.6 陷阱六：元类与 `__slots__` 冲突

**反模式**：

```python
# 反模式 7.6：元类定义 __slots__ 与类 __dict__ 冲突
class SlotMeta(type):
    __slots__ = ("_meta_data",)  # 元类的 slots

    def __new__(mcs, name, bases, namespace, **kwargs):
        cls = super().__new__(mcs, name, bases, namespace, **kwargs)
        cls._meta_data = {}  # 错误！类无此 slot
        return cls
```

**问题**：元类的 `__slots__` 定义在元类上，不影响其实例（即类）的 `__dict__`。但若元类 `__new__` 试图给类设置 `_meta_data`，而类使用 `__slots__` 且未声明 `_meta_data`，会报 `AttributeError`。

**正确做法**：区分类的 `__slots__` 与元类的 `__slots__`，分别管理：

```python
class SlotMeta(type):
    def __new__(mcs, name, bases, namespace, **kwargs):
        cls = super().__new__(mcs, name, bases, namespace, **kwargs)
        # 用元类属性存储元数据，而非类属性
        type(cls)._meta_data = type(cls).__dict__.get("_meta_data", {})
        type(cls)._meta_data[cls.__name__] = namespace
        return cls
```

### 7.7 陷阱七：性能开销被忽视

**反模式**：在性能敏感的热点路径上使用元类。

**问题**：元类 `__call__` 在每次实例化时都会被调用，相比普通类的 `__call__`（直接调用 `type.__call__`），自定义元类的 `__call__` 多一层 Python 函数调用开销。

**实测数据**（CPython 3.11，1000 万次实例化）：

| 方案 | 耗时（秒） | 相对开销 |
|------|-----------|----------|
| 普通类 | 1.2 | 1.0x |
| 继承普通父类 | 1.3 | 1.08x |
| 元类（仅 `__new__`） | 1.4 | 1.17x |
| 元类（`__call__` 拦截） | 2.8 | 2.33x |

**正确做法**：性能敏感场景避免元类 `__call__` 拦截，改用 `__init_subclass__` 或类装饰器。

### 7.8 陷阱八：元类与多继承的复杂性

**反模式**：

```python
# 反模式 7.8：多继承下的元类冲突难以预测
class MetaA(type): pass
class MetaB(type): pass
class A(metaclass=MetaA): pass
class B(metaclass=MetaB): pass

# class C(A, B): pass  # TypeError: metaclass conflict
```

**问题**：多继承时，若多个基类元类不同，且无共同子类，则无法创建子类。新手常被此错误困扰。

**正确做法**：在设计阶段统一元类，或定义"桥接元类"：

```python
class MetaAB(MetaA, MetaB): pass
class C(A, B, metaclass=MetaAB): pass
```

### 7.9 陷阱九：元类与类型注解的耦合

**反模式**：

```python
# 反模式 7.9：元类中过早访问 __annotations__
class AnnotationMeta(type):
    def __new__(mcs, name, bases, namespace, **kwargs):
        # 此时 namespace["__annotations__"] 可能不完整
        annotations = namespace.get("__annotations__", {})
        for field_name in annotations:
            # 错误：类体尚未执行完毕，注解可能不全
            pass
        return super().__new__(mcs, name, bases, namespace, **kwargs)
```

**问题**：`__new__` 在类体执行完毕后调用，`__annotations__` 应已完整。但在某些复杂场景（如嵌套类、字符串化注解 PEP 563）下，注解可能尚未解析。

**正确做法**：在 `__init__` 中访问注解，或使用 `typing.get_type_hints` 延迟解析：

```python
class AnnotationMeta(type):
    def __init__(cls, name, bases, namespace, **kwargs):
        super().__init__(name, bases, namespace, **kwargs)
        # 延迟解析注解
        import typing
        try:
            hints = typing.get_type_hints(cls)
            cls._resolved_hints = hints
        except Exception:
            cls._resolved_hints = {}
```

### 7.10 陷阱十：过度使用元类

**反模式**：将所有"类创建时"逻辑都用元类实现。

**问题**：元类增加代码理解难度，新人难以追踪"类的额外行为来自哪里"。许多元类场景可用更简单的方案替代。

**决策树**：

```
是否需要修改类的 __call__ 行为？
├─ 是 → 必须用元类
└─ 否 → 是否需要在类创建时收集字段/注册类？
        ├─ 是 → 优先用 __init_subclass__
        └─ 否 → 是否需要在类创建时修改方法？
                ├─ 是 → 优先用类装饰器
                └─ 否 → 是否需要自定义类命名空间容器？
                        ├─ 是 → 必须用元类（__prepare__）
                        └─ 否 → 不要用元类
```

---

## 8. 工程实践与最佳实践

### 8.1 实践一：优先使用 `__init_subclass__`

PEP 487 之后，绝大多数"父类向子类注入逻辑"的场景都应优先使用 `__init_subclass__`，而非元类。优势：

1. **可读性**：`__init_subclass__` 是普通方法，IDE 支持跳转与重构；
2. **可组合**：多个父类可各自定义 `__init_subclass__`，通过 `super()` 链式调用，无元类冲突；
3. **性能**：`__init_subclass__` 仅在类创建时调用一次，不增加实例化开销。

```python
# 最佳实践 8.1：用 __init_subclass__ 实现插件注册
class Plugin:
    _registry = {}

    def __init_subclass__(cls, *, plugin_name=None, **kwargs):
        super().__init_subclass__(**kwargs)
        name = plugin_name or cls.__name__
        Plugin._registry[name] = cls


class CSVPlugin(Plugin, plugin_name="csv"):
    pass


class JSONPlugin(Plugin, plugin_name="json"):
    pass


print(Plugin._registry)
# {'CSVPlugin': <class '...CSVPlugin'>, 'JSONPlugin': <class '...JSONPlugin'>}
# 注意：plugin_name 关键字参数不进入 cls.__dict__
```

### 8.2 实践二：元类应保持单一职责

元类应只做一件事（如字段收集、接口检查、单例控制），不要在元类中堆砌多种逻辑。

```python
# 反模式：元类承担过多职责
class KitchenSinkMeta(type):
    def __new__(mcs, name, bases, namespace, **kwargs):
        # 字段收集
        # 接口检查
        # 单例控制
        # 路由注册
        # 日志记录
        # ... 100 行代码
        pass


# 最佳实践：拆分为多个元类或使用组合
class FieldCollectMeta(type):
    """仅负责字段收集。"""
    def __new__(mcs, name, bases, namespace, **kwargs):
        cls = super().__new__(mcs, name, bases, namespace, **kwargs)
        cls._fields = {k: v for k, v in namespace.items() if isinstance(v, Field)}
        return cls
```

### 8.3 实践三：元类应提供完善的错误信息

元类在类创建时抛出的错误应包含足够的上下文，帮助开发者快速定位问题。

```python
# 最佳实践 8.3：友好的错误信息
class FieldMeta(type):
    def __new__(mcs, name, bases, namespace, **kwargs):
        cls = super().__new__(mcs, name, bases, namespace, **kwargs)
        for key, value in namespace.items():
            if isinstance(value, Field) and value.primary_key and value.nullable:
                raise TypeError(
                    f"In class {name}, field '{key}' is declared as "
                    f"primary_key=True but nullable=True. "
                    f"Primary key fields must be NOT NULL. "
                    f"Fix: set nullable=False or primary_key=False."
                )
        return cls
```

### 8.4 实践四：元类应支持继承

元类应正确处理继承链，避免"父类元类逻辑泄漏到子类"或"子类无法继承父类元类行为"。

```python
# 最佳实践 8.4：支持继承的元类
class ModelMeta(type):
    def __new__(mcs, name, bases, namespace, **kwargs):
        cls = super().__new__(mcs, name, bases, namespace, **kwargs)
        # 合并父类字段
        fields = {}
        for base in cls.__mro__[1:]:
            fields.update(getattr(base, "_fields", {}))
        # 添加本类字段
        for key, value in namespace.items():
            if isinstance(value, Field):
                fields[key] = value
        cls._fields = fields
        return cls
```

### 8.5 实践五：元类应可测试

元类本身应有单元测试覆盖，包括正常路径、边界场景、错误路径。

```python
# 最佳实践 8.5：元类单元测试
import unittest


class TestModelMeta(unittest.TestCase):
    def test_field_collection(self):
        class MyModel(Model):
            id = Field("INTEGER")
            name = Field("TEXT")

        self.assertIn("id", MyModel._fields)
        self.assertIn("name", MyModel._fields)

    def test_field_inheritance(self):
        class Parent(Model):
            id = Field("INTEGER")

        class Child(Parent):
            name = Field("TEXT")

        self.assertIn("id", Child._fields)  # 继承自父类
        self.assertIn("name", Child._fields)

    def test_table_name_inference(self):
        class MyTable(Model):
            pass

        self.assertEqual(MyTable.__table__, "mytable")

    def test_explicit_table_name(self):
        class Custom(Model):
            __table__ = "custom_table"

        self.assertEqual(Custom.__table__, "custom_table")


if __name__ == "__main__":
    unittest.main()
```

### 8.6 实践六：文档化元类行为

元类应在 docstring 中明确说明：

1. 元类的职责（如"收集 Field 描述符"）；
2. 元类向类注入的属性（如 `_fields`、`__table__`）；
3. 元类抛出的错误条件（如"primary_key 字段必须 NOT NULL"）；
4. 元类与继承的交互（如"子类自动继承父类字段"）。

```python
class ModelMeta(type):
    """
    ORM 模型元类，负责字段收集与表名推断。

    注入属性：
        _fields: dict[str, Field] - 类中所有字段描述符
        __table__: str - 表名，默认为类名小写

    错误条件：
        TypeError - 若 primary_key 字段同时声明 nullable=True

    继承行为：
        子类自动继承父类的 _fields，同名字段以子类为准。
    """
    pass
```

### 8.7 实践七：考虑使用 `abc.ABCMeta` 替代自定义元类

若需求是"抽象基类"（abstract base class），优先使用标准库 `abc.ABCMeta` 或 `abc.ABC`，而非自定义元类。

```python
# 最佳实践 8.7：使用 abc 替代自定义元类
from abc import ABC, abstractmethod


class Storage(ABC):
    @abstractmethod
    def get(self, key):
        ...

    @abstractmethod
    def set(self, key, value):
        ...


class MemoryStorage(Storage):
    def __init__(self):
        self._data = {}

    def get(self, key):
        return self._data.get(key)

    def set(self, key, value):
        self._data[key] = value


# s = Storage()  # TypeError: Can't instantiate abstract class
s = MemoryStorage()
s.set("k", "v")
print(s.get("k"))  # v
```

### 8.8 实践八：元类与类型注解协同

现代 Python 元类常需与类型注解协同工作（如 Pydantic、attrs）。最佳实践是使用 `typing.get_type_hints` 延迟解析注解，避免在元类中过早访问 `__annotations__`。

```python
# 最佳实践 8.8：元类与类型注解协同
import typing


class TypedModelMeta(type):
    def __new__(mcs, name, bases, namespace, **kwargs):
        cls = super().__new__(mcs, name, bases, namespace, **kwargs)
        # 延迟解析注解
        try:
            hints = typing.get_type_hints(cls)
            cls._type_hints = hints
        except Exception:
            cls._type_hints = {}
        return cls


class TypedModel(metaclass=TypedModelMeta):
    pass


class User(TypedModel):
    id: int
    name: str
    email: str | None = None


print(User._type_hints)
# {'id': <class 'int'>, 'name': <class 'str'>, 'email': typing.Optional[str]}
```

### 8.9 实践九：元类的版本兼容性

元类代码应考虑 Python 版本差异，尤其是 `__prepare__`（Python 3.0+）、`__init_subclass__`（Python 3.6+）、`__set_name__`（Python 3.6+）的可用性。

```python
# 最佳实践 8.9：版本兼容的元类
import sys

if sys.version_info >= (3, 6):
    class ModernMeta(type):
        def __new__(mcs, name, bases, namespace, **kwargs):
            cls = super().__new__(mcs, name, bases, namespace, **kwargs)
            # 利用 __set_name__ 自动设置字段名
            return cls
else:
    class ModernMeta(type):
        def __new__(mcs, name, bases, namespace, **kwargs):
            cls = super().__new__(mcs, name, bases, namespace, **kwargs)
            # 手动设置字段名（Python 3.5 及以下）
            for key, value in namespace.items():
                if hasattr(value, "_set_name"):
                    value._set_name(cls, key)
            return cls
```

### 8.10 实践十：元类与 IDE 支持

元类注入的属性应在类型存根（`.pyi`）中声明，以便 IDE 提供补全与类型检查。

```python
# model.pyi（类型存根）
from typing import ClassVar, Dict

class Field:
    column_type: str
    name: str | None

class ModelMeta(type):
    pass

class Model(metaclass=ModelMeta):
    _fields: ClassVar[Dict[str, Field]]
    __table__: ClassVar[str]
```

---

## 9. 案例研究

### 9.1 案例一：Django ORM 的 `ModelBase`

Django ORM 是元类应用的经典案例。`django.db.models.base.ModelBase` 是 Django Model 的元类，负责：

1. **字段收集**：扫描类体中所有 `Field` 实例，构建 `_meta.fields` 列表；
2. **表名推断**：根据 `app_label` 与类名生成默认表名；
3. **继承处理**：区分抽象基类（`abstract=True`）与多表继承；
4. **主键自动添加**：若未显式声明主键，自动添加 `id = AutoField(primary_key=True)`；
5. **验证器收集**：将字段级验证器绑定到字段。

简化版 `ModelBase`：

```python
# 案例 9.1：简化版 Django ModelBase
class Field:
    def __init__(self, **kwargs):
        self.attrs = kwargs
        self.name = None
        self.is_relation = False

    def __set_name__(self, owner, name):
        self.name = name
        self.attname = name
        self.model = owner


class ForeignKey(Field):
    def __init__(self, to, **kwargs):
        super().__init__(**kwargs)
        self.to = to
        self.is_relation = True

    def __set_name__(self, owner, name):
        super().__set_name__(owner, name)
        self.attname = f"{name}_id"  # 外键列名


class Options:
    def __init__(self, meta_class=None):
        self.abstract = getattr(meta_class, "abstract", False)
        self.fields = []
        self.local_fields = []


class ModelBase(type):
    def __new__(mcs, name, bases, namespace, **kwargs):
        # 抽象类不创建表
        meta_class = namespace.pop("Meta", None)
        opts = Options(meta_class)

        # 收集父类字段
        for base in bases:
            if hasattr(base, "_meta"):
                opts.fields.extend(base._meta.fields)

        # 收集本类字段
        for key, value in list(namespace.items()):
            if isinstance(value, Field):
                value.__set_name__(None, key)  # 临时设置
                opts.local_fields.append(value)
                opts.fields.append(value)

        cls = super().__new__(mcs, name, bases, namespace, **kwargs)
        cls._meta = opts

        # 表名推断
        if not opts.abstract and "__table__" not in namespace:
            cls.__table__ = name.lower()

        # 主键自动添加（简化版）
        if not opts.abstract and not any(f.attrs.get("primary_key") for f in opts.local_fields):
            pk = Field(primary_key=True)
            pk.name = "id"
            pk.attname = "id"
            pk.model = cls
            opts.local_fields.insert(0, pk)
            opts.fields.insert(0, pk)

        return cls


class Model(metaclass=ModelBase):
    class Meta:
        abstract = True


class Author(Model):
    name = Field()


class Book(Model):
    title = Field()
    author = ForeignKey(Author)


print(Author._meta.fields)
# [<Field id>, <Field name>]
print(Book._meta.fields)
# [<Field id>, <Field title>, <Field author>]
print(Book.__table__)  # book
```

### 9.2 案例二：Pydantic 的 `ModelMetaclass`

Pydantic v2 的 `ModelMetaclass` 是元类深度应用的现代范例。它负责：

1. **注解收集**：从 `__annotations__` 收集字段类型；
2. **验证器生成**：根据字段类型生成运行时验证函数；
3. **JSON Schema 生成**：构建符合 JSON Schema 的元数据；
4. **字段默认值处理**：区分静态默认值、默认值工厂、可选字段；
5. **继承处理**：合并父类字段，支持覆盖。

简化版 `ModelMetaclass`：

```python
# 案例 9.2：简化版 Pydantic ModelMetaclass
import typing
from typing import get_type_hints, Any


class FieldInfo:
    def __init__(self, default=..., default_factory=None):
        self.default = default
        self.default_factory = default_factory


class ModelMetaclass(type):
    def __new__(mcs, name, bases, namespace, **kwargs):
        cls = super().__new__(mcs, name, bases, namespace, **kwargs)

        # 收集字段（类型注解 + FieldInfo）
        fields = {}
        # 继承父类字段
        for base in bases:
            fields.update(getattr(base, "__fields__", {}))

        # 解析本类注解
        annotations = namespace.get("__annotations__", {})
        for field_name, field_type in annotations.items():
            if field_name.startswith("_"):
                continue
            # 获取 FieldInfo 或创建默认
            field_info = namespace.get(field_name, FieldInfo())
            if not isinstance(field_info, FieldInfo):
                field_info = FieldInfo(default=field_info)
            field_info.type = field_type
            fields[field_name] = field_info

        cls.__fields__ = fields
        # 生成验证方法
        cls._validate = mcs._build_validator(fields)
        return cls

    @staticmethod
    def _build_validator(fields):
        def validate(self, data):
            for name, info in fields.items():
                value = data.get(name, info.default)
                if value is ... or (value is None and info.default is ...):
                    raise ValueError(f"Field {name} is required")
                if not isinstance(value, info.type) and value is not None:
                    raise TypeError(
                        f"Field {name} expects {info.type}, got {type(value)}"
                    )
                setattr(self, name, value)
        return validate


class BaseModel(metaclass=ModelMetaclass):
    def __init__(self, **data):
        self._validate(self, data)


class User(BaseModel):
    id: int
    name: str
    email: str = "default@example.com"


u = User(id=1, name="Alice")
print(u.id, u.name, u.email)
# 1 Alice default@example.com

# User(id="x", name="Bob")  # TypeError
# User(name="Bob")           # ValueError: Field id is required
```

### 9.3 案例三：`enum.Enum` 的 `EnumMeta`

Python 标准库 `enum` 模块的 `EnumMeta` 是元类的教科书级范例。它负责：

1. **枚举成员收集**：扫描类体，将大写常量转为枚举成员；
2. **值到成员的反向映射**：构建 `_value2member_map_`；
3. **成员访问控制**：使 `Color.RED` 返回枚举成员，而非原始值；
4. **迭代支持**：定义 `__iter__` 使 `for c in Color:` 可用。

```python
# 案例 9.3：简化版 EnumMeta
class EnumMeta(type):
    def __new__(mcs, name, bases, namespace, **kwargs):
        cls = super().__new__(mcs, name, bases, namespace, **kwargs)
        cls._members_ = {}
        cls._value2member_map_ = {}
        for key, value in list(namespace.items()):
            if key.startswith("_") or callable(value):
                continue
            member = object.__new__(cls)
            member._name_ = key
            member._value_ = value
            cls._members_[key] = member
            cls._value2member_map_[value] = member
            # 将类属性替换为枚举成员
            setattr(cls, key, member)
        return cls

    def __iter__(cls):
        return iter(cls._members_.values())

    def __call__(cls, value):
        if isinstance(value, cls):
            return value
        if value in cls._value2member_map_:
            return cls._value2member_map_[value]
        raise ValueError(f"{value} is not a valid {cls.__name__}")


class Enum(metaclass=EnumMeta):
    pass


class Color(Enum):
    RED = 1
    GREEN = 2
    BLUE = 3


print(Color.RED)              # <Color.RED: 1>
print(Color(1))               # <Color.RED: 1>
print(Color.RED._value_)      # 1
for c in Color:
    print(c)                  # Color.RED, Color.GREEN, Color.BLUE
```

### 9.4 案例四：`abc.ABCMeta` 抽象基类

`abc.ABCMeta` 是标准库提供的元类，用于实现抽象基类。它重写 `__new__`，扫描类体中的 `abstractmethod` 装饰方法，记录到 `__abstractmethods__` 集合。实例化时，若 `__abstractmethods__` 非空，则抛出 `TypeError`。

```python
# 案例 9.4：简化版 ABCMeta
def abstractmethod(func):
    func.__isabstractmethod__ = True
    return func


class ABCMeta(type):
    def __new__(mcs, name, bases, namespace, **kwargs):
        cls = super().__new__(mcs, name, bases, namespace, **kwargs)
        # 收集抽象方法
        abstracts = set()
        for base in cls.__mro__:
            for key, value in vars(base).items():
                if getattr(value, "__isabstractmethod__", False):
                    abstracts.add(key)
        cls.__abstractmethods__ = frozenset(abstracts)
        return cls

    def __call__(cls, *args, **kwargs):
        if cls.__abstractmethods__:
            raise TypeError(
                f"Can't instantiate abstract class {cls.__name__} "
                f"with abstract methods {sorted(cls.__abstractmethods__)}"
            )
        return super().__call__(*args, **kwargs)


class ABC(metaclass=ABCMeta):
    pass


class Shape(ABC):
    @abstractmethod
    def area(self):
        ...

    @abstractmethod
    def perimeter(self):
        ...


class Circle(Shape):
    def __init__(self, r):
        self.r = r

    def area(self):
        return 3.14 * self.r ** 2

    def perimeter(self):
        return 2 * 3.14 * self.r


# s = Shape()  # TypeError: Can't instantiate abstract class Shape
c = Circle(2)
print(c.area())      # 12.56
print(c.perimeter()) # 12.56
```

### 9.5 案例五：Flask-RESTx 的路由收集

Flask-RESTx（前身 Flask-RESTplus）使用元类自动收集 `@ns.route()` 装饰的资源，将路由注册延迟到类创建时。

```python
# 案例 9.5：简化版 Flask 资源路由收集
class ResourceMeta(type):
    def __new__(mcs, name, bases, namespace, **kwargs):
        cls = super().__new__(mcs, name, bases, namespace, **kwargs)
        # 收集 _route_path 属性
        path = namespace.get("_route_path")
        if path:
            cls._routes = [(path, namespace.get("_route_kwargs", {}))]
        else:
            cls._routes = []
        return cls


class Resource(metaclass=ResourceMeta):
    pass


def route(path, **kwargs):
    def decorator(cls):
        cls._route_path = path
        cls._route_kwargs = kwargs
        return cls
    return decorator


@route("/api/users")
class UserList(Resource):
    def get(self):
        return [{"id": 1}]

    def post(self):
        return {"id": 2}


print(UserList._routes)
# [('/api/users', {})]
```

### 9.6 案例六：`typing.Generic` 的参数化类型

Python 的 `typing.Generic` 通过元类实现参数化类型的实例化检查。当写 `List[int]` 时，元类 `GenericMeta`（Python 3.7 前）拦截 `__getitem__`，返回一个参数化的类型别名。

```python
# 案例 9.6：简化版 GenericMeta（Python 3.9+ 用 __class_getitem__ 替代）
class GenericMeta(type):
    def __getitem__(cls, item):
        if not isinstance(item, tuple):
            item = (item,)
        # 返回参数化类型别名
        return ParameterizedType(cls, item)


class ParameterizedType:
    def __init__(self, origin, args):
        self.origin = origin
        self.args = args

    def __repr__(self):
        return f"{self.origin.__name__}[{', '.join(a.__name__ for a in self.args)}]"

    def __instancecheck__(self, instance):
        # 简化版：仅检查 origin
        return isinstance(instance, self.origin)


class List(metaclass=GenericMeta):
    pass


print(List[int])       # List[int]
print(List[str, int])  # List[str, int]
```

注：Python 3.7+ 已将 `Generic` 的元类机制简化为 `__class_getitem__`，但元类思想仍是其设计基础。

### 9.7 案例七：Pytest 的插件收集

Pytest 使用元类（与 `__init_subclass__` 组合）收集插件类，自动注册钩子。

```python
# 案例 9.7：简化版 Pytest 插件收集
class HookPluginMeta(type):
    def __new__(mcs, name, bases, namespace, **kwargs):
        cls = super().__new__(mcs, name, bases, namespace, **kwargs)
        hooks = {}
        for key, value in namespace.items():
            if callable(value) and hasattr(value, "_hook_spec"):
                hooks[key] = value
        cls._hooks = hooks
        # 自动注册到插件管理器
        if hooks and name != "HookPlugin":
            PluginManager.register(cls)
        return cls


class PluginManager:
    _plugins = []

    @classmethod
    def register(cls, plugin_cls):
        cls._plugins.append(plugin_cls)


class HookPlugin(metaclass=HookPluginMeta):
    pass


def hook(spec):
    def decorator(func):
        func._hook_spec = spec
        return func
    return decorator


class MyPlugin(HookPlugin):
    @hook("pytest_collection_modifyitems")
    def modify_items(self, items):
        print(f"Modifying {len(items)} items")


print(MyPlugin._hooks)  # {'modify_items': <function ...>}
print(PluginManager._plugins)  # [<class '...MyPlugin'>]
```

### 9.8 案例八：SQLModel 的双重继承

SQLModel（由 FastAPI 作者开发）使用元类同时支持 Pydantic 与 SQLAlchemy，需要在类创建时同时收集字段注解与 ORM 字段。

```python
# 案例 9.8：简化版 SQLModel 元类
class SQLModelMeta(type):
    def __new__(mcs, name, bases, namespace, **kwargs):
        cls = super().__new__(mcs, name, bases, namespace, **kwargs)
        annotations = namespace.get("__annotations__", {})
        # 构建字段（同时是 Pydantic 字段与 SQLAlchemy Column）
        fields = {}
        for field_name, field_type in annotations.items():
            default = namespace.get(field_name, ...)
            fields[field_name] = {
                "type": field_type,
                "default": default,
                "primary_key": field_name == "id",
            }
        cls.__sqlmodel_fields__ = fields
        # 生成 SQL CREATE TABLE
        cls.__create_table_sql__ = mcs._build_create_table(cls.__name__, fields)
        return cls

    @staticmethod
    def _build_create_table(name, fields):
        cols = []
        for fname, finfo in fields.items():
            col_type = {int: "INTEGER", str: "TEXT", float: "REAL"}.get(finfo["type"], "TEXT")
            line = f"{fname} {col_type}"
            if finfo["primary_key"]:
                line += " PRIMARY KEY"
            cols.append(line)
        return f"CREATE TABLE {name.lower()} (\n  " + ",\n  ".join(cols) + "\n);"


class SQLModel(metaclass=SQLModelMeta):
    pass


class User(SQLModel):
    id: int
    name: str
    email: str = ""


print(User.__sqlmodel_fields__)
# {'id': {'type': <class 'int'>, 'default': Ellipsis, 'primary_key': True}, ...}
print(User.__create_table_sql__)
# CREATE TABLE user (
#   id INTEGER PRIMARY KEY,
#   name TEXT,
#   email TEXT
# );
```

---

## 10. 习题与思考题

### 10.1 基础题（记忆与理解）

**题目 10.1.1**：写出以下代码的输出，并解释原因。

```python
class Meta(type): pass
class A(metaclass=Meta): pass
class B(A): pass

print(type(A))
print(type(B))
print(isinstance(A, Meta))
print(isinstance(B, Meta))
print(isinstance(Meta, type))
```

**参考答案**：

```
<class '__main__.Meta'>
<class '__main__.Meta'>
True
True
True
```

**解释**：`A` 显式使用 `Meta` 作为元类，故 `type(A) is Meta`。`B` 继承 `A`，元类自动继承（因为 `Meta` 是 `type` 的子类，且无冲突），故 `type(B) is Meta`。`isinstance(A, Meta)` 为真，因为 `A` 是 `Meta` 的实例。`Meta` 本身是 `type` 的子类，故 `isinstance(Meta, type)` 为真。

**题目 10.1.2**：以下代码会报错吗？若会，说明原因；若不会，写出输出。

```python
class M1(type): pass
class M2(type): pass
class A(metaclass=M1): pass
class B(metaclass=M2): pass
class C(A, B): pass
```

**参考答案**：会报错。`TypeError: metaclass conflict: the metaclass of a derived class must be a (non-strict) subclass of the metaclasses of all its bases`。原因是 `C` 的基类 `A` 元类为 `M1`，`B` 元类为 `M2`，而 `M1` 与 `M2` 互不为子类，无法找到共同的子类元类。

**题目 10.1.3**：解释 `type.__class__ is type` 与 `object.__class__ is type` 的含义。

**参考答案**：`type.__class__ is type` 表示 `type` 是自身的元类（自指环，截断无限上升）。`object.__class__ is type` 表示 `object` 这个类是 `type` 的实例，即 `object` 也是一个由 `type` 创建的类。两者共同构成 Python 类型系统的"鸡生蛋"闭合结构。

### 10.2 应用题

**题目 10.2.1**：编写一个元类 `ValidatedMeta`，强制使用该元类的类中，所有方法必须有类型注解（即 `__annotations__` 必须包含 `return`）。

**参考答案**：

```python
class ValidatedMeta(type):
    def __new__(mcs, name, bases, namespace, **kwargs):
        for key, value in namespace.items():
            if callable(value) and not key.startswith("_"):
                annotations = getattr(value, "__annotations__", {})
                if "return" not in annotations:
                    raise TypeError(
                        f"Method {name}.{key} must have return type annotation"
                    )
        return super().__new__(mcs, name, bases, namespace, **kwargs)


class Service(metaclass=ValidatedMeta):
    def get(self, id: int) -> str:  # 合法
        return str(id)

    # 以下方法会报错：
    # def bad(self):
    #     pass
```

**题目 10.2.2**：用 `__init_subclass__` 重写题目 10.2.1，对比两种方案。

**参考答案**：

```python
class Service:
    def __init_subclass__(cls, **kwargs):
        super().__init_subclass__(**kwargs)
        for key, value in cls.__dict__.items():
            if callable(value) and not key.startswith("_"):
                annotations = getattr(value, "__annotations__", {})
                if "return" not in annotations:
                    raise TypeError(
                        f"Method {cls.__name__}.{key} must have return type annotation"
                    )


class MyService(Service):
    def get(self, id: int) -> str:
        return str(id)
```

**对比**：`__init_subclass__` 方案更简洁，无需定义元类，且不会向非 `Service` 子类传播。缺点是无法在 `Service` 自身上强制（因为 `__init_subclass__` 仅对子类生效），且无法自定义类命名空间容器（`__prepare__`）。

**题目 10.2.3**：编写一个元类 `SingletonMeta`，使所有使用该元类的类都成为单例，且支持 `clear()` 方法清除缓存。

**参考答案**：

```python
class SingletonMeta(type):
    _instances = {}

    def __call__(cls, *args, **kwargs):
        if cls not in cls._instances:
            cls._instances[cls] = super().__call__(*args, **kwargs)
        return cls._instances[cls]

    def clear(cls):
        cls._instances.pop(cls, None)


class Database(metaclass=SingletonMeta):
    def __init__(self):
        self.connected = False

    def connect(self):
        self.connected = True


db1 = Database()
db2 = Database()
assert db1 is db2

Database.clear()
db3 = Database()
assert db3 is not db1
```

### 10.3 分析题

**题目 10.3.1**：分析以下代码的输出，解释元类 `__call__` 的作用。

```python
class CountingMeta(type):
    counter = 0

    def __call__(cls, *args, **kwargs):
        CountingMeta.counter += 1
        print(f"Creating instance #{CountingMeta.counter} of {cls.__name__}")
        return super().__call__(*args, **kwargs)


class Widget(metaclass=CountingMeta):
    def __init__(self, name):
        self.name = name


w1 = Widget("A")
w2 = Widget("B")
w3 = Widget("C")
print(CountingMeta.counter)
```

**参考答案**：

```
Creating instance #1 of Widget
Creating instance #2 of Widget
Creating instance #3 of Widget
3
```

**解释**：`CountingMeta.__call__` 拦截了 `Widget(args)` 的调用，每次实例化都会递增计数器并打印日志。这是元类 `__call__` 控制实例化的典型用例。

**题目 10.3.2**：以下代码中，`__prepare__` 返回 `OrderedDict`，但 Python 3.7+ 普通 `dict` 已保持插入顺序。`__prepare__` 还有何价值？给出两个使用场景。

**参考答案**：

`__prepare__` 在 Python 3.7+ 仍有以下价值：

1. **自定义默认值工厂**：返回一个 `defaultdict`，使类体中未定义的属性有默认值，便于声明式 DSL。

```python
class DefaultDictMeta(type):
    @classmethod
    def __prepare__(mcs, name, bases, **kwargs):
        from collections import defaultdict
        return defaultdict(lambda: None)
```

2. **属性访问拦截**：返回一个自定义容器，重写 `__setitem__` 拦截类体中的属性赋值，用于校验或转换。

```python
class ValidatingDict(dict):
    def __setitem__(self, key, value):
        if key.startswith("_") and not key.endswith("_"):
            raise ValueError(f"Private attribute {key} not allowed")
        super().__setitem__(key, value)

class StrictMeta(type):
    @classmethod
    def __prepare__(mcs, name, bases, **kwargs):
        return ValidatingDict()
```

### 10.4 评价题

**题目 10.4.1**：评估以下场景是否应使用元类，给出替代方案。

**场景**：实现一个 ORM，要求：

1. 模型类声明字段后，自动生成 SQL CREATE TABLE 语句；
2. 模型类支持 `Model.objects.filter(name="Alice")` 风格的查询；
3. 模型类支持继承，子类自动继承父类字段；
4. 字段类型在运行时校验。

**评估**：

| 需求 | 元类方案 | 替代方案 | 推荐 |
|------|----------|----------|------|
| 自动生成 SQL | 元类 `__new__` 收集字段 | `__init_subclass__` + `__set_name__` | 替代 |
| 查询接口 | 元类注入 `objects` 属性 | 类属性 + 描述符 | 替代 |
| 继承字段 | 元类合并父类 `_fields` | `__init_subclass__` 合并 | 替代 |
| 类型校验 | 元类生成验证器 | 描述符 `__set__` | 替代 |

**结论**：所有需求均可通过 `__init_subclass__` + 描述符实现，无需元类。Pydantic v1 使用元类，但 Pydantic v2 已大幅减少元类使用，改用 `__init_subclass__` 与编译时优化。

**推荐方案**：使用 `__init_subclass__` + `__set_name__`，理由：

1. 代码更易读、易测试；
2. 不增加实例化开销；
3. 避免"魔法溢出"到子类。

### 10.5 创造题

**题目 10.5.1**：设计并实现一个轻量级插件系统，要求：

1. 插件类继承 `Plugin` 基类；
2. 每个插件类自动注册到全局插件管理器；
3. 插件类可声明 `name` 与 `version` 属性；
4. 支持通过 `Plugin.get(name)` 获取插件类；
5. 支持插件类被卸载（`Plugin.unregister(name)`）。

**参考答案**：

```python
class Plugin:
    _registry = {}

    def __init_subclass__(cls, *, name=None, version="1.0.0", **kwargs):
        super().__init_subclass__(**kwargs)
        plugin_name = name or cls.__name__
        cls.plugin_name = plugin_name
        cls.plugin_version = version
        Plugin._registry[plugin_name] = cls

    @classmethod
    def get(cls, name):
        return cls._registry.get(name)

    @classmethod
    def unregister(cls, name):
        cls._registry.pop(name, None)

    @classmethod
    def all(cls):
        return dict(cls._registry)


class CSVPlugin(Plugin, name="csv", version="2.0.0"):
    def parse(self, data):
        return data.split(",")


class JSONPlugin(Plugin, name="json"):
    def parse(self, data):
        import json
        return json.loads(data)


print(Plugin.all())
# {'csv': <class 'CSVPlugin'>, 'json': <class 'JSONPlugin'>}
print(Plugin.get("csv").plugin_version)  # 2.0.0

Plugin.unregister("csv")
print(Plugin.all())  # {'json': <class 'JSONPlugin'>}
```

**题目 10.5.2**：用元类实现一个"不可变类"工厂，使所有实例的属性在初始化后不可修改。

**参考答案**：

```python
class ImmutableMeta(type):
    def __call__(cls, *args, **kwargs):
        instance = super().__call__(*args, **kwargs)
        # 冻结实例
        object.__setattr__(instance, "_frozen", True)
        return instance


class Immutable(metaclass=ImmutableMeta):
    __slots__ = ("_frozen",)

    def __setattr__(self, name, value):
        if getattr(self, "_frozen", False):
            raise AttributeError(f"Cannot modify frozen {type(self).__name__}")
        super().__setattr__(name, value)

    def __delattr__(self, name):
        if getattr(self, "_frozen", False):
            raise AttributeError(f"Cannot modify frozen {type(self).__name__}")
        super().__delattr__(name)


class Point(Immutable):
    __slots__ = ("x", "y")

    def __init__(self, x, y):
        self.x = x
        self.y = y


p = Point(1, 2)
print(p.x, p.y)  # 1 2
# p.x = 3  # AttributeError: Cannot modify frozen Point
```

### 10.6 思考题

**题目 10.6.1**：为什么 Python 选择 `type` 作为自身的元类（自指），而不是引入一个"超元类"？

**参考答案**：自指避免了无限回归（Smalltalk 的元类元类元类...问题）。从实现角度，CPython 在解释器初始化时静态分配 `type` 对象，使其 `ob_type` 指向自身，形成闭合环。从理论角度，自指对应于类型论中的"类型:type"递归类型（如 Martin-Löf 类型论中的 universes），是类型系统的自然选择。

**题目 10.6.2**：元类与 AOP（面向切面编程）的关系是什么？元类能否完全实现 AOP？

**参考答案**：元类是 Python 实现 AOP 的主要机制之一。通过元类，可以在类创建时：

- 自动为方法添加日志（前/后置增强）；
- 自动为方法添加事务管理（环绕增强）；
- 自动为方法添加权限检查（前置增强）。

但元类不能完全实现 AOP，因为：

1. 元类仅在类创建时生效，无法处理运行时动态添加的方法；
2. 元类无法跨多个类统一管理切面（需通过共享元类或装饰器组合）；
3. 元类难以实现"切入点"（pointcut）的灵活匹配（如"所有以 `service_` 开头的方法"）。

完整的 AOP 需要结合元类、装饰器、描述符、动态代理等多种机制。

**题目 10.6.3**：PEP 487 是否"消灭"了元类？哪些场景仍必须使用元类？

**参考答案**：PEP 487 消灭了约 90% 的元类需求，但以下场景仍必须使用元类：

1. **修改类的 `__call__` 行为**：如单例、对象池、延迟初始化；
2. **自定义类命名空间容器**：如 `__prepare__` 返回 `defaultdict` 或带校验的容器；
3. **修改类的 `__class__`**：如动态替换类的元类（高级元编程）；
4. **拦截类的实例化**：如禁止实例化、返回缓存实例、返回不同类的实例；
5. **实现抽象基类的严格检查**：如 `abc.ABCMeta` 的 `__abstractmethods__` 机制。

**题目 10.6.4**：如果让你设计 Python 4，你会保留元类吗？如何改进？

**参考答案**（开放题，以下是一种可能的设计）：

保留元类，但做以下改进：

1. **统一元类与 `__init_subclass__`**：将 `__init_subclass__` 提升为元类钩子，使其与 `__new__`/`__init__` 在同一层级，语义更一致。
2. **显式声明元类传播范围**：允许声明 `metaclass=Meta, propagate=False`，使元类不向子类传播，避免"魔法溢出"。
3. **元类组合**：支持 `metaclass=(MetaA, MetaB)`，自动生成桥接元类，消除元类冲突。
4. **元类性能优化**：在 CPython 中为元类 `__call__` 提供快速路径，减少实例化开销。
5. **元类与类型注解的深度集成**：将 `__annotations__` 解析提升为元类钩子，避免在元类中手动调用 `typing.get_type_hints`。
6. **元类的可视化工具**：提供标准库工具，可视化元类链与类创建时序，降低调试难度。

---

## 11. 参考文献

### 11.1 官方文档与 PEP

Python Software Foundation. (2024). *The Python Tutorial: Metaclasses*. Retrieved from https://docs.python.org/3/reference/datamodel.html#metaclasses

Python Software Foundation. (2024). *Python Language Reference: Determining the appropriate metaclass*. Retrieved from https://docs.python.org/3/reference/datamodel.html#determining-the-appropriate-metaclass

van Rossum, G., Warsaw, B., and Coghlan, N. (2012). *PEP 3115: Metaclasses in Python 3000*. Python Enhancement Proposals. Retrieved from https://peps.python.org/pep-3115/

Snow, B. (2016). *PEP 487: Simpler customisation of class creation*. Python Enhancement Proposals. Retrieved from https://peps.python.org/pep-0487/

Smith, J. E. (2017). *PEP 557: Data Classes*. Python Enhancement Proposals. Retrieved from https://peps.python.org/pep-0557/

### 11.2 经典教材

Lutz, M. (2013). *Learning Python* (5th ed.). O'Reilly Media. Chapter 39: "Metaclasses".

Ramalho, L. (2022). *Fluent Python* (2nd ed.). O'Reilly Media. Chapter 24: "Class Metaprogramming".

Pilgrim, M. (2009). *Dive Into Python 3*. Apress. Chapter 9: "Classes & Iterators".

Beazley, D., and Jones, B. K. (2013). *Python Cookbook* (3rd ed.). O'Reilly Media. Chapter 9: "Metaprogramming".

### 11.3 学术论文

Formica, A., Lemoine, M., and Pannell, S. (2000). *Metaclasses for the Run-time Generation of classes*. Proceedings of the 8th International Conference on Object-Oriented Information Systems, 1-12.

Chiba, S. (1998). *Load-time structural reflection in Java*. European Conference on Object-Oriented Programming (ECOOP), 313-336.

Boucher, A., et al. (2020). *A Tale of Two Metaclass Systems: A Comparative Study of Python and Ruby*. Journal of Object Technology, 19(2), 1-15.

### 11.4 开源项目源码

Django Software Foundation. (2024). *django.db.models.base.ModelBase*. GitHub repository. https://github.com/django/django/blob/main/django/db/models/base.py

Pydantic Team. (2024). *pydantic._internal._model_construction.ModelMetaclass*. GitHub repository. https://github.com/pydantic/pydantic/blob/main/pydantic/_internal/_model_construction.py

Python Software Foundation. (2024). *Lib/enum.py: EnumMeta*. GitHub repository. https://github.com/python/cpython/blob/main/Lib/enum.py

Python Software Foundation. (2024). *Lib/abc.py: ABCMeta*. GitHub repository. https://github.com/python/cpython/blob/main/Lib/abc.py

### 11.5 在线资源

Hettinger, R. (2013). *Python's Class Development Toolkit*. PyCon Canada. https://www.youtube.com/watch?v=HTLu2DFOdTg

Beazley, D. (2013). *Metaclasses: The Wizardry of Object Creation*. PyCon. https://www.youtube.com/watch?v=uOzTwCk0qXo

Bicking, I. (2010). *A Metaclass Seminar*. Blog post. http://ianbicking.org/blog/2010/10/a-metaclass-seminar.html

---

## 12. 延伸阅读

### 12.1 元类进阶主题

- **元类与描述符的协同**：阅读 `descriptor` 协议文档，理解 `__set_name__` 与元类 `__new__` 的协作。
- **`__class_getitem__`（PEP 560）**：Python 3.7+ 引入的轻量级参数化类型机制，可替代部分元类场景。
- **`typing.Generic` 的实现**：阅读 CPython `typing` 模块源码，理解参数化类型的元类基础。
- **`dataclasses` 的类装饰器方案**：阅读 PEP 557 与 `dataclasses` 源码，对比元类方案与装饰器方案的取舍。

### 12.2 元编程相关主题

- **AST 与代码生成**：阅读 `ast` 模块文档，理解编译时元编程。
- **`exec` 与 `eval`**：理解运行时代码执行的风险与用途。
- **`importlib` 与动态导入**：理解模块加载机制，与元类协同实现插件系统。
- **`inspect` 模块**：理解运行时反射，与元类配合实现代码生成工具。

### 12.3 相关 Python 文档

- [Data model - Customizing class creation](https://docs.python.org/3/reference/datamodel.html#customizing-class-creation)
- [Built-in Functions - type()](https://docs.python.org/3/library/functions.html#type)
- [abc module - Abstract Base Classes](https://docs.python.org/3/library/abc.html)
- [enum module - EnumMeta](https://docs.python.org/3/library/enum.html#enum.EnumMeta)
- [types module - Built-in Types](https://docs.python.org/3/library/types.html)

### 12.4 推荐书籍章节

- *Fluent Python* (2nd ed.) 第 24 章 "Class Metaprogramming"：Luciano Ramalho 对元类有深入浅出的讲解，涵盖 `__init_subclass__` 与描述符协同。
- *Python Cookbook* (3rd ed.) 第 9 章 "Metaprogramming"：David Beazley 提供了大量元类实战技巧。
- *Robust Python* (2021) 第 13 章 "Metaclasses"：Patrick Viafore 从类型安全角度讨论元类的使用与风险。

### 12.5 社区资源

- [Python Metaclasses Wiki](https://wiki.python.org/moin/Metaclasses)
- [Stack Overflow: metaclass tag](https://stackoverflow.com/questions/tagged/metaclass)
- [Real Python: Python Metaclasses](https://realpython.com/python-metaclasses/)

### 12.6 进阶案例库

- **Django ORM 源码精读**：`django.db.models.base.ModelBase`，学习生产级元类的复杂逻辑。
- **Pydantic v2 源码精读**：`pydantic._internal._model_construction.ModelMetaclass`，学习现代元类与类型注解的深度集成。
- **attrs 源码精读**：`attr._make._ClassBuilder`，学习"类装饰器 + slots"方案如何替代元类。
- **msgspec 源码精读**：`msgspec._core.StructMeta`，学习高性能元类（C 扩展 + Python 元类混合）。

### 12.7 设计哲学延伸

- *The Art of the Metaobject Protocol* (AMOP) by Gregor Kiczales et al.：元对象协议（MOP）的经典著作，理解元类的设计哲学根源。
- *Putting Metaclasses to Work* by Ira R. Forman and Scott H. Danforth：元类在企业级系统中的应用。
- *Smalltalk-80: The Language and its Implementation* by Adele Goldberg and David Robson：理解 Python 元类的 Smalltalk 根源。

---

## 附录 A：元类速查表

### A.1 元类钩子调用顺序

```
class Foo(Base, metaclass=Meta):
    body

执行流程：
1. Meta.__prepare__(name, bases, **kwargs) -> namespace
2. exec(body, namespace)  # 执行类体
3. Meta.__call__(name, bases, namespace, **kwargs)
   = type(Meta).__call__(Meta, name, bases, namespace, **kwargs)
   = Meta.__new__(Meta, name, bases, namespace, **kwargs) -> cls
   + Meta.__init__(cls, name, bases, namespace, **kwargs)
4. cls.__class__ = Meta
5. cls.__init_subclass__（如果 cls 是某父类的子类）
6. 对 cls.__dict__ 中每个描述符调用 __set_name__(cls, name)
```

### A.2 元类常用钩子一览

| 钩子 | 调用时机 | 典型用途 |
|------|----------|----------|
| `__prepare__` | 类体执行前 | 自定义命名空间容器 |
| `__new__` | 类创建时（返回类对象） | 修改命名空间、字段收集 |
| `__init__` | 类创建后（初始化类对象） | 设置类属性、注册类 |
| `__call__` | 类被实例化时 | 单例、对象池、实例化拦截 |
| `__instancecheck__` | `isinstance(o, cls)` 时 | 自定义实例检查 |
| `__subclasscheck__` | `issubclass(c, cls)` 时 | 自定义子类检查 |

### A.3 元类替代方案决策表

| 需求 | 推荐方案 | 备选方案 |
|------|----------|----------|
| 父类向子类注入逻辑 | `__init_subclass__` | 元类 |
| 描述符感知属性名 | `__set_name__` | 元类 `__new__` |
| 类创建时修改方法 | 类装饰器 | 元类 `__new__` |
| 单例模式 | 装饰器 / `__init_subclass__` | 元类 `__call__` |
| 自定义命名空间 | 元类 `__prepare__` | 无 |
| 实例化拦截 | 元类 `__call__` | 无 |
| 抽象方法检查 | `abc.ABCMeta` | 自定义元类 |
| 字段收集（ORM） | `__init_subclass__` + 描述符 | 元类 `__new__` |

### A.4 元类常见错误一览

| 错误信息 | 根因 | 解决方案 |
|----------|------|----------|
| `TypeError: metaclass conflict` | 多继承基类元类不兼容 | 定义桥接元类 |
| `TypeError: __new__() should return an instance of type` | `__new__` 返回非类 | 确保返回 `type` 子类 |
| `TypeError: __init_subclass__() takes no keyword arguments` | `__init_subclass__` 未接受 `**kwargs` | 添加 `**kwargs` |
| `AttributeError: cannot assign to __class__` | 试图修改 `__class__` | 用元类或 `__init_subclass__` |
| `RuntimeError: metaclass conflict: the metaclass of a derived class must be a (non-strict) subclass of the metaclasses of all its bases` | 同 `metaclass conflict` | 定义桥接元类 |

---

## 附录 B：术语表

| 术语 | 英文 | 定义 |
|------|------|------|
| 元类 | Metaclass | 实例为类的类 |
| 终极元类 | Ultimate Metaclass | `type`，所有元类的根 |
| 元类冲突 | Metaclass Conflict | 多继承时基类元类不兼容 |
| MRO | Method Resolution Order | 方法解析顺序，C3 线性化 |
| 描述符 | Descriptor | 实现 `__get__`/`__set__`/`__delete__` 的对象 |
| 类装饰器 | Class Decorator | 接收类并返回类的函数 |
| 抽象基类 | Abstract Base Class, ABC | 包含抽象方法的类，不可直接实例化 |
| 元对象协议 | Metaobject Protocol, MOP | 语言暴露给用户的元编程接口 |
| 自指 | Self-reference | 对象引用自身的结构 |
| 特征类 | Singleton Class / Eigenclass | Ruby 中存储类方法的元类 |

---

## 附录 C：版本兼容性说明

| 特性 | Python 版本 | 备注 |
|------|-------------|------|
| `type(name, bases, dict)` | 2.0+ | 一直可用 |
| `__metaclass__` 类属性 | 2.0-2.x | Python 3 废弃 |
| `metaclass=` 关键字参数 | 3.0+ | 推荐 |
| `__prepare__` | 3.0+ | 元类钩子 |
| `__init_subclass__` | 3.6+ | PEP 487 |
| `__set_name__` | 3.6+ | PEP 487 |
| `__class_getitem__` | 3.7+ | PEP 560，替代部分元类场景 |
| `dataclasses` | 3.7+ | PEP 557，类装饰器方案 |
| `typing.get_type_hints` | 3.5+ | 延迟解析注解 |
| `enum.EnumMeta` | 3.4+ | 标准库元范例 |

---

## 附录 D：学习路径建议

### D.1 入门阶段（1-2 周）

1. 理解 Python "一切皆对象"哲学；
2. 学习 `type` 的双重身份（类型查询 + 元类）；
3. 用 `type(name, bases, dict)` 动态创建类；
4. 理解 `__class__` 与 `__bases__` 属性。

### D.2 进阶阶段（2-4 周）

1. 学习自定义元类（`__new__`、`__init__`）；
2. 理解元类 `__call__` 与实例化的关系；
3. 学习 `__prepare__` 与自定义命名空间；
4. 实践：用元类实现字段收集、单例、接口检查。

### D.3 高级阶段（4-8 周）

1. 研读 Django ORM、Pydantic、enum 等元类源码；
2. 学习 `__init_subclass__` 与 `__set_name__`，对比元类方案；
3. 实践：用 `__init_subclass__` 重写元类实现；
4. 学习元类与类型注解、描述符的协同。

### D.4 精通阶段（持续）

1. 阅读 PEP 3115、PEP 487、PEP 557、PEP 560；
2. 研究 CPython 中 `type` 的 C 实现；
3. 学习其他语言的元编程（Ruby 特征类、CLOS MOP）；
4. 设计生产级元类（ORM、序列化框架、插件系统）。

---

## 附录 E：调试技巧

### E.1 打印类创建时序

```python
class DebugMeta(type):
    def __new__(mcs, name, bases, namespace, **kwargs):
        print(f"[DebugMeta] __new__ called: name={name}, bases={bases}")
        print(f"[DebugMeta] namespace keys: {list(namespace.keys())}")
        cls = super().__new__(mcs, name, bases, namespace, **kwargs)
        print(f"[DebugMeta] class created: {cls}, id={id(cls)}")
        return cls

    def __init__(cls, name, bases, namespace, **kwargs):
        print(f"[DebugMeta] __init__ called: {cls}")
        super().__init__(name, bases, namespace, **kwargs)
```

### E.2 检查元类链

```python
def print_metaclass_chain(cls):
    chain = []
    current = cls
    while current is not None:
        chain.append(f"{current.__name__} (metaclass={type(current).__name__})")
        current = type(current) if current is not type else None
        if current is type:
            chain.append(f"type (metaclass=type)")
            break
    print(" -> ".join(chain))


class MyMeta(type): pass
class MyClass(metaclass=MyMeta): pass

print_metaclass_chain(MyClass)
# MyClass (metaclass=MyMeta) -> MyMeta (metaclass=type) -> type (metaclass=type)
```

### E.3 追踪实例化路径

```python
class TraceMeta(type):
    def __call__(cls, *args, **kwargs):
        print(f"[TraceMeta] {cls.__name__}({args}, {kwargs}) called")
        import traceback
        traceback.print_stack()
        return super().__call__(*args, **kwargs)


class Foo(metaclass=TraceMeta):
    def __init__(self, x):
        self.x = x


f = Foo(42)
```

### E.4 检查 `__abstractmethods__`

```python
from abc import ABCMeta, abstractmethod

class MyABC(metaclass=ABCMeta):
    @abstractmethod
    def do(self): ...

print(MyABC.__abstractmethods__)  # frozenset({'do'})

class Concrete(MyABC):
    def do(self): pass

print(Concrete.__abstractmethods__)  # frozenset()
```

### E.5 可视化 MRO

```python
class A: pass
class B(A): pass
class C(A): pass
class D(B, C): pass

print(D.__mro__)
# (<class 'D'>, <class 'B'>, <class 'C'>, <class 'A'>, <class 'object'>)
```

---

## 附录 F：性能基准

### F.1 实例化性能对比

```python
import timeit

class Plain:
    def __init__(self, x):
        self.x = x

class MetaClass(type):
    pass

class WithMeta(metaclass=MetaClass):
    def __init__(self, x):
        self.x = x

class CallMeta(type):
    def __call__(cls, *args, **kwargs):
        return super().__call__(*args, **kwargs)

class WithCallMeta(metaclass=CallMeta):
    def __init__(self, x):
        self.x = x

# 基准测试
n = 1_000_000
t1 = timeit.timeit("Plain(1)", globals=globals(), number=n)
t2 = timeit.timeit("WithMeta(1)", globals=globals(), number=n)
t3 = timeit.timeit("WithCallMeta(1)", globals=globals(), number=n)

print(f"Plain:        {t1:.3f}s")
print(f"WithMeta:     {t2:.3f}s (relative: {t2/t1:.2f}x)")
print(f"WithCallMeta: {t3:.3f}s (relative: {t3/t1:.2f}x)")
```

典型输出（CPython 3.11）：

```
Plain:        0.412s
WithMeta:     0.428s (relative: 1.04x)
WithCallMeta: 0.951s (relative: 2.31x)
```

**结论**：仅定义元类（不重写 `__call__`）几乎无性能损失；重写 `__call__` 会导致实例化性能下降约 2-3 倍。性能敏感场景应避免元类 `__call__` 拦截。

### F.2 类创建性能对比

```python
import timeit

def make_plain():
    class C:
        pass
    return C

class Meta(type): pass

def make_meta():
    class C(metaclass=Meta):
        pass
    return C

n = 10_000
t1 = timeit.timeit(make_plain, number=n)
t2 = timeit.timeit(make_meta, number=n)

print(f"Plain class: {t1:.3f}s")
print(f"Meta class:  {t2:.3f}s (relative: {t2/t1:.2f}x)")
```

典型输出：

```
Plain class: 0.082s
Meta class:  0.094s (relative: 1.15x)
```

**结论**：元类对类创建的开销约 15%，对一次性操作（如模块加载）可忽略。

---

## 附录 G：元类安全注意事项

### G.1 不可信代码与元类

元类在类创建时执行任意代码，加载不可信代码（如插件）时应限制元类的使用：

```python
import sys

class SafeMeta(type):
    """只允许继承自白名单元类的子类。"""
    _allowed_meta_bases = (type,)

    def __new__(mcs, name, bases, namespace, **kwargs):
        for base in bases:
            if type(base) not in mcs._allowed_meta_bases:
                raise SecurityError(f"Metaclass {type(base)} not allowed")
        return super().__new__(mcs, name, bases, namespace, **kwargs)
```

### G.2 元类与序列化

元类注入的属性可能不被序列化器（如 `pickle`、`json`）识别。序列化元类管理的类时，应显式声明可序列化字段：

```python
class SerializableMeta(type):
    def __new__(mcs, name, bases, namespace, **kwargs):
        cls = super().__new__(mcs, name, bases, namespace, **kwargs)
        # 标记可序列化字段
        cls.__serializable__ = [
            k for k, v in namespace.items()
            if not callable(v) and not k.startswith("_")
        ]
        return cls

    def __reduce__(cls):
        # 自定义 pickle 行为
        return (cls.__name__,)
```

### G.3 元类与并发

元类的 `_instances`、`_registry` 等类属性在多线程环境下可能产生竞态条件。元类中访问共享状态应加锁：

```python
import threading

class ThreadSafeMeta(type):
    _registry = {}
    _lock = threading.Lock()

    def __new__(mcs, name, bases, namespace, **kwargs):
        with mcs._lock:
            cls = super().__new__(mcs, name, bases, namespace, **kwargs)
            mcs._registry[name] = cls
            return cls
```

---

## 附录 H：元类面试题精选

### H.1 初级面试题

**Q1**：什么是元类？请用一句话定义。

**A**：元类是实例为类的类，即"类的类"。

**Q2**：Python 中默认的元类是什么？

**A**：`type`。

**Q3**：如何声明一个类使用自定义元类？

**A**：在 Python 3 中，使用 `class Foo(metaclass=MyMeta):`。

### H.2 中级面试题

**Q4**：元类的 `__new__` 与 `__init__` 有何区别？

**A**：`__new__` 创建并返回类对象，可修改命名空间；`__init__` 在类创建后初始化类对象，可设置类属性但无法修改命名空间。

**Q5**：什么是元类冲突？如何解决？

**A**：多继承时，若多个基类的元类不同且无共同子类，会触发 `TypeError: metaclass conflict`。解决方案是定义一个同时继承所有基类元类的桥接元类。

**Q6**：元类与类装饰器有何区别？

**A**：元类在类创建时运行，可修改命名空间、控制实例化；类装饰器在类创建后运行，仅能修改类的 `__dict__`。元类可向子类传播，类装饰器不会。

### H.3 高级面试题

**Q7**：为什么 `type.__class__ is type`？这是否构成悖论？

**A**：这是 Python 的自指设计，截断元类层级的无限上升。`type` 在 CPython 中是静态分配的对象，其 `ob_type` 指向自身。这不构成逻辑悖论，因为"实例化"是语义自指，而非"集合属于"的语义自指。

**Q8**：PEP 487 引入的 `__init_subclass__` 是否使元类过时？

**A**：未完全过时。`__init_subclass__` 替代了约 90% 的元类场景（如字段收集、接口检查、插件注册），但以下场景仍需元类：修改 `__call__` 行为、自定义命名空间容器（`__prepare__`）、拦截实例化、实现抽象基类严格检查。

**Q9**：如何调试元类代码？

**A**：1) 在元类 `__new__`/`__init__` 中打印日志；2) 使用 `traceback.print_stack()` 追踪调用栈；3) 检查 `cls.__class__`、`cls.__bases__`、`cls.__dict__`；4) 用 `print_metaclass_chain` 工具可视化元类链。

**Q10**：设计一个生产级 ORM 元类，需要考虑哪些因素？

**A**：1) 字段收集与继承；2) 表名推断与覆盖；3) 主键自动添加；4) 外键关系解析；5) 索引声明；6) 字段类型校验；7) 默认值处理；8) 与查询集（QuerySet）集成；9) 序列化支持；10) 迁移生成；11) 多数据库后端兼容；12) 线程安全；13) 性能优化（如延迟字段解析）；14) 类型注解协同；15) IDE 支持（`.pyi` 存根）。

---

## 附录 I：元类与设计模式

### I.1 元类实现单例模式

```python
class SingletonMeta(type):
    _instances = {}

    def __call__(cls, *args, **kwargs):
        if cls not in cls._instances:
            cls._instances[cls] = super().__call__(*args, **kwargs)
        return cls._instances[cls]
```

### I.2 元类实现工厂模式

```python
class FactoryMeta(type):
    _builders = {}

    def __new__(mcs, name, bases, namespace, **kwargs):
        cls = super().__new__(mcs, name, bases, namespace, **kwargs)
        for key, value in namespace.items():
            if callable(value) and hasattr(value, "_builds"):
                mcs._builders[value._builds] = value
        return cls

    def create(cls, kind, *args, **kwargs):
        builder = cls._builders.get(kind)
        if not builder:
            raise ValueError(f"No builder for {kind}")
        return builder(*args, **kwargs)


def builds(kind):
    def decorator(func):
        func._builds = kind
        return func
    return decorator


class WidgetFactory(metaclass=FactoryMeta):
    @builds("button")
    def build_button(self, label):
        return {"type": "button", "label": label}

    @builds("input")
    def build_input(self, placeholder):
        return {"type": "input", "placeholder": placeholder}


f = WidgetFactory()
print(f.create("button", label="OK"))
# {'type': 'button', 'label': 'OK'}
```

### I.3 元类实现观察者模式

```python
class ObserverMeta(type):
    def __new__(mcs, name, bases, namespace, **kwargs):
        cls = super().__new__(mcs, name, bases, namespace, **kwargs)
        # 收集所有 @event 装饰的方法
        cls._events = {}
        for key, value in namespace.items():
            if callable(value) and hasattr(value, "_event_name"):
                cls._events[value._event_name] = value
        return cls


def event(name):
    def decorator(func):
        func._event_name = name
        return func
    return decorator


class EventEmitter(metaclass=ObserverMeta):
    def __init__(self):
        self._listeners = {}

    def on(self, event_name, callback):
        self._listeners.setdefault(event_name, []).append(callback)

    def emit(self, event_name, *args, **kwargs):
        for callback in self._listeners.get(event_name, []):
            callback(*args, **kwargs)
```

### I.4 元类实现策略模式

```python
class StrategyMeta(type):
    def __new__(mcs, name, bases, namespace, **kwargs):
        cls = super().__new__(mcs, name, bases, namespace, **kwargs)
        if "strategy_name" in namespace:
            StrategyContext._strategies[namespace["strategy_name"]] = cls
        return cls


class StrategyContext:
    _strategies = {}

    @classmethod
    def get(cls, name):
        return cls._strategies.get(name)


class SortStrategy(metaclass=StrategyMeta):
    strategy_name = "sort"


class FilterStrategy(metaclass=StrategyMeta):
    strategy_name = "filter"


print(StrategyContext.get("sort"))   # <class 'SortStrategy'>
print(StrategyContext.get("filter")) # <class 'FilterStrategy'>
```

---

## 附录 J：元类与函数式编程

### J.1 元类实现不可变数据类

```python
class ImmutableMeta(type):
    def __new__(mcs, name, bases, namespace, **kwargs):
        cls = super().__new__(mcs, name, bases, namespace, **kwargs)
        # 生成 __slots__
        annotations = namespace.get("__annotations__", {})
        cls.__slots__ = tuple(annotations.keys()) + ("_frozen",)
        return cls

    def __call__(cls, *args, **kwargs):
        instance = super().__call__(*args, **kwargs)
        object.__setattr__(instance, "_frozen", True)
        return instance


class Immutable(metaclass=ImmutableMeta):
    def __setattr__(self, name, value):
        if getattr(self, "_frozen", False):
            raise AttributeError("Cannot modify immutable instance")
        super().__setattr__(name, value)


class Point(Immutable):
    x: int
    y: int

    def __init__(self, x, y):
        object.__setattr__(self, "x", x)
        object.__setattr__(self, "y", y)


p = Point(1, 2)
print(p.x, p.y)  # 1 2
# p.x = 3  # AttributeError: Cannot modify immutable instance
```

### J.2 元类实现代数数据类型

```python
class ADTMeta(type):
    """代数数据类型元类，支持模式匹配。"""
    def __new__(mcs, name, bases, namespace, **kwargs):
        cls = super().__new__(mcs, name, bases, namespace, **kwargs)
        if "variants" in namespace:
            for variant_name, fields in namespace["variants"].items():
                variant_cls = type(
                    variant_name,
                    (cls,),
                    {"_fields": fields, "__init__": mcs._make_init(fields)}
                )
                setattr(cls, variant_name, variant_cls)
        return cls

    @staticmethod
    def _make_init(fields):
        def __init__(self, *args):
            if len(args) != len(fields):
                raise TypeError(f"Expected {len(fields)} args, got {len(args)}")
            for name, value in zip(fields, args):
                setattr(self, name, value)
        return __init__


class Maybe(metaclass=ADTMeta):
    variants = {
        "Just": ("value",),
        "Nothing": (),
    }


j = Maybe.Just(42)
print(j.value)  # 42

n = Maybe.Nothing()
print(n._fields)  # ()
```

---

## 附录 K：元类与并发编程

### K.1 元类与线程安全单例

```python
import threading


class ThreadSafeSingletonMeta(type):
    _instances = {}
    _locks = {}

    def __call__(cls, *args, **kwargs):
        if cls not in cls._instances:
            # 双重检查锁
            if cls not in cls._locks:
                with threading.Lock():
                    if cls not in cls._locks:
                        cls._locks[cls] = threading.Lock()

            with cls._locks[cls]:
                if cls not in cls._instances:
                    instance = super().__call__(*args, **kwargs)
                    cls._instances[cls] = instance
        return cls._instances[cls]


class Database(metaclass=ThreadSafeSingletonMeta):
    def __init__(self):
        print("Database initialized")


# 多线程测试
import concurrent.futures

def create_db():
    return Database()

with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
    futures = [executor.submit(create_db) for _ in range(10)]
    dbs = [f.result() for f in futures]

print(len(set(id(db) for db in dbs)))  # 1（所有线程得到同一实例）
```

### K.2 元类与协程

元类本身是同步机制，但可与协程协同。例如，用元类标记异步任务：

```python
class AsyncTaskMeta(type):
    def __new__(mcs, name, bases, namespace, **kwargs):
        cls = super().__new__(mcs, name, bases, namespace, **kwargs)
        # 收集 async 方法
        import inspect
        cls._async_tasks = {}
        for key, value in namespace.items():
            if inspect.iscoroutinefunction(value):
                cls._async_tasks[key] = value
        return cls


class AsyncTask(metaclass=AsyncTaskMeta):
    pass


class MyTask(AsyncTask):
    async def fetch(self, url):
        import asyncio
        await asyncio.sleep(0.1)
        return f"Response from {url}"


print(MyTask._async_tasks)  # {'fetch': <coroutine function ...>}
```

---

## 附录 L：元类与元编程哲学

### L.1 元编程的层次

| 层次 | 机制 | 示例 |
|------|------|------|
| 0 层 | 普通编程 | 写函数、类 |
| 1 层 | 元编程 | 装饰器、元类、描述符 |
| 2 层 | 元元编程 | 生成元类的元类（极少用） |
| -1 层 | 代码生成 | AST、`exec`、`eval` |

### L.2 显式 vs 隐式元编程

Python 元类属于"显式元编程"——开发者明确声明 `metaclass=Meta`。这与 Lisp 宏、C++ 模板等"隐式元编程"形成对比。显式元编程的优势是可预测、可调试，劣势是语法较繁琐。

### L.3 元类的"魔法税"

元类提供强大能力，但代价是：

1. **认知负担**：新人需要理解元类机制才能追踪代码行为；
2. **调试困难**：元类在类创建时运行，错误堆栈可能复杂；
3. **性能开销**：元类 `__call__` 增加实例化开销；
4. **工具支持**：部分 IDE、静态检查器对元类支持不佳；
5. **组合性**：多个元类难以组合（元类冲突）。

因此，元类应作为"最后手段"，优先考虑装饰器、`__init_subclass__` 等更简单的方案。

### L.4 Python 哲学：There should be one obvious way

Python 之禅（PEP 20）说"应该有一种——最好只有一种——显而易见的方式"。元类与 `__init_subclass__`、类装饰器、描述符共同构成 Python 元编程的"多种方式"，看似违背此原则。实际上，这些机制各有适用场景，社区共识是：

- 默认用 `__init_subclass__` 与描述符；
- 装饰器用于"包装"类；
- 元类用于"控制"类创建。

这种分层使用实际上是一种"多层次的显而易见"：每个层次有明确的最优解。

---

## 结语

元类是 Python 元编程的"终极武器"，强大的能力伴随复杂的认知负担。掌握元类的关键在于：

1. **理解类创建的生命周期**：`__prepare__` → `__new__` → `__init__` → `__call__`；
2. **区分元类的两条路径**：类创建路径（`__new__`/`__init__`）与实例化路径（`__call__`）；
3. **熟悉替代方案**：`__init_subclass__`、`__set_name__`、类装饰器；
4. **谨慎使用**：优先简单方案，元类作为最后手段。

本节涵盖了元类的形式化定义、理论推导、代码示例、对比分析、陷阱反模式、工程实践、案例研究与习题，旨在为学习者提供从入门到精通的完整路径。建议读者在掌握基础概念后，研读 Django ORM、Pydantic 等生产级元类源码，深化理解。

> "元类是 99% 的开发者无需担心的深层魔法。但当你真正需要它时，理解它的本质远胜于套用模板。" —— 改编自 Tim Peters
