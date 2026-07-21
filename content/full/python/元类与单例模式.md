---
order: 103
title: 元类与单例模式
module: python
category: 'dev-lang'
difficulty: advanced
description: 元类驱动的单例模式深度剖析：从 __call__ 拦截到线程安全、测试可重置性与企业级应用。
author: fanquanpp
updated: '2026-07-21'
related:
  - python/元类
  - python/生成器与协程
  - python/上下文管理器
  - python/异步编程详解
  - python/类型注解与mypy
  - python/描述符协议
prerequisites:
  - python/语法速查
  - python/面向对象编程
  - python/装饰器进阶
  - python/元类
---

# 元类与单例模式（Metaclass & Singleton Pattern）

> "Singleton is a pattern, but in Python the module is the singleton." —— Brett Slatkin, *Effective Python*

## 1. 学习目标（基于 Bloom 分类法）

本节按 Bloom 认知层次（Bloom's Taxonomy）逐级给出可观察、可测量的学习目标。完成本节后，学习者应能：

### 1.1 记忆层（Remember）

- **R1**：准确陈述单例模式（Singleton Pattern）的经典定义，能复述 GoF《Design Patterns: Elements of Reusable Object-Oriented Software》中对 Singleton 意图（Intent）的原始描述："Ensure a class only has one instance, and provide a global point of access to it."
- **R2**：列出 Python 中实现单例的至少 5 种方式：模块级单例、`__new__` 重写、装饰器、元类 `__call__`、`__init_subclass__`、`importlib` 重载防护、`enum` 单例、`functools.cache` 惰性单例。
- **R3**：背诵元类 `__call__` 方法在实例创建过程中的执行顺序：`type.__call__(cls, *args, **kwargs)` → `cls.__new__(cls, *args, **kwargs)` → `cls.__init__(self, *args, **kwargs)`。

### 1.2 理解层（Understand）

- **U1**：解释为何 Python 的模块导入机制天然提供单例语义（`sys.modules` 缓存），并能说明 `import module` 多次返回同一模块对象的底层机制。
- **U2**：对比"单例类"与"全局唯一对象"的概念差异，理解 Python 社区为何倾向于后者（模块级变量）而非前者（GoF 风格单例类）。
- **U3**：阐述元类 `__call__` 拦截实例化的工作原理，绘制 `SingletonMeta.__call__` 与 `cls.__new__`、`cls.__init__` 的调用时序图。

### 1.3 应用层（Apply）

- **A1**：使用元类实现线程安全的单例 `Database` 类，正确使用 `threading.Lock` 与双重检查锁定（Double-Checked Locking, DCL）模式。
- **A2**：为单例类实现可销毁（destroyable）变体，支持在单元测试中重置实例状态，避免测试间状态污染。
- **A3**：基于元类实现"每子类一实例"（per-subclass singleton）模式，使继承层次中每个子类都拥有独立的单例。

### 1.4 分析层（Analyze）

- **An1**：分析单例模式在 Python 测试中的三大痛点——隐藏依赖、状态泄漏、并行测试冲突，并对比 pytest fixture、`dependency injection`、`contextvar` 等替代方案。
- **An2**：解构"全局状态"（global state）与"共享状态"（shared state）的本质区别，识别单例违反单一职责原则（SRP）的具体场景。
- **An3**：剖析 CPython GIL 与单例线程安全的交互，说明为何在 CPython 下不加锁的简单单例"通常"能工作但仍是错的。

### 1.5 评价层（Evaluate）

- **E1**：评价 GoF 单例模式在现代 Python 中的适用性，判断何时应使用单例、何时应改用模块级对象、何时应使用依赖注入。
- **E2**：审查一段使用元类单例的生产代码，识别潜在的线程安全漏洞、内存泄漏（`_instances` 字典永不释放）与测试隔离问题。
- **E3**：对比单例与 Monostate（Borg 模式）、单例与 Multiton、单例与对象池的工程权衡，给出选型决策矩阵。

### 1.6 创造层（Create）

- **C1**：设计一个支持"环境隔离"（environment-scoped singleton）的元类，使同一进程内不同环境（如 dev/staging/prod）拥有独立的单例实例。
- **C2**：实现一个"可观测单例"（observable singleton）元类，自动记录单例的创建、访问、销毁事件，集成 `logging`、`structlog` 或 `opentelemetry`。
- **C3**：构建一个"单例治理框架"（singleton governance framework），提供注册表、生命周期管理、健康检查、优雅降级与熔断能力。

---

## 2. 历史动机与演化

### 2.1 单例模式的历史起源

单例模式最早可追溯至 GoF 1994 年出版的《Design Patterns: Elements of Reusable Object-Oriented Software》。GoF 将其归类为创建型模式（Creational Pattern），意图解决"需要全局唯一实例"的设计问题。原始动机包括：

- **配置管理**：操作系统配置、应用配置需要全局唯一访问点。
- **硬件抽象**：打印机、串口等物理设备在系统中只能有一个抽象实例。
- **日志系统**：日志记录器需要统一管理日志输出流与格式。
- **数据库连接池**：连接池需要全局协调资源分配。
- **缓存**：全局缓存需要一致性访问。

### 2.2 Python 单例的演化路径

Python 社区对单例模式的态度经历了显著的演化：

**阶段一（Python 1.x-2.x 早期）：GoF 风格的照搬**

早期 Python 开发者直接照搬 Java/C++ 的单例实现，使用 `__new__` 或模块级变量。1994 年 Python 1.x 时代，模块导入机制已天然支持单例，但社区尚未形成共识。

**阶段二（Python 2.2-2.7）：新式类与元类**

2001 年 Python 2.2 引入新式类（new-style class）与 `type` 元类，使元类实现单例成为可能。Alex Martelli 在 2003 年提出"Borg 模式"（Monostate），主张共享状态而非共享身份，更符合 Python 哲学。

**阶段三（Python 3.0-3.5）：模块即单例的共识**

Python 3 时代，社区逐渐形成"模块即单例"的共识。PEP 8 与各类风格指南开始明确推荐使用模块级变量而非单例类。Brett Slatkin 在《Effective Python》中明确指出："Use Modules to Encapsulate State, Not Classes"。

**阶段四（Python 3.6+）：`__init_subclass__` 与类型注解**

Python 3.6 引入 `__init_subclass__`，为许多原本需要元类的场景提供了更简洁的替代方案。Python 3.7 引入 `dataclass`，Python 3.8 引入 `functools.cached_property`，进一步减少了对单例的需求。

**阶段五（Python 3.12+）：现代单例实践**

现代 Python 实践倾向于：

- 使用模块级对象替代单例类。
- 使用 `dependency injection` 框架（如 `injector`、`python-dependency-injector`）管理共享依赖。
- 使用 `contextvars` 管理请求级共享状态。
- 使用 `functools.cache`、`functools.lru_cache` 实现惰性单例。
- 仅在框架级代码（如 Django、SQLAlchemy）使用元类单例。

### 2.3 元类单例的企业级动机

尽管社区倾向于避免单例，但元类单例在以下企业级场景仍有不可替代的价值：

- **框架基础设施**：ORM 引擎、连接池、迁移管理器需要全局唯一协调点。
- **C 扩展桥接**：封装 C 库的全局状态（如 OpenCV、CUDA 上下文）需要 Python 层单例。
- **遗留系统集成**：与 Java/C++ 单例系统互操作时需要保持对称性。
- **配置热加载**：需要原子性切换配置实例的场景。
- **资源配额**：限制资源（如 GPU、文件句柄）的全局配额管理。

---

## 3. 形式化定义

### 3.1 单例模式的形式化定义

**定义 3.1（单例类）**：给定类 $C$，若 $C$ 满足以下两个条件，则称 $C$ 为单例类：

1. **唯一性**：$\forall x, y \in \text{Instances}(C), x = y$，即 $C$ 的所有实例在身份上等同（`x is y` 为真）。
2. **全局可访问性**：存在全局访问点 $\text{getInstance}: \star \to C$，使得任意代码路径均可获取 $C$ 的唯一实例。

形式化地，单例类 $C$ 满足：

$$\text{Singleton}(C) \iff |\text{Instances}(C)| = 1 \land \exists f: \star \to C, \forall t, f(t) \in \text{Instances}(C)$$

其中 $\text{Instances}(C)$ 表示 $C$ 在运行时的实例集合，$|\cdot|$ 表示集合基数，$\star$ 表示任意调用上下文。

### 3.2 元类单例的形式化定义

**定义 3.2（元类单例）**：给定元类 $M$ 与类 $C$（即 $C$ 的元类为 $M$，记作 $\text{metaclass}(C) = M$），若 $M$ 重写 `__call__` 方法满足：

$$M.\text{\_\_call\_\_}(C, \text{args}) = \begin{cases} \text{new\_instance} & \text{if } C \notin M.\text{\_instances} \\ M.\text{\_instances}[C] & \text{otherwise} \end{cases}$$

则称 $C$ 为元类 $M$ 控制的单例类。

### 3.3 单例与恒等性的形式化关系

**定理 3.1（单例恒等性）**：若 $C$ 为单例类，则对任意 $x, y \in \text{Instances}(C)$：

$$x = y \iff x \equiv y \iff \text{id}(x) = \text{id}(y)$$

即单例类的所有实例在身份（identity）、相等性（equality）、哈希值（hash）上完全一致。

**证明**：

由定义 3.1 的唯一性，$|\text{Instances}(C)| = 1$，故 $x, y$ 实际为同一对象，即 $\text{id}(x) = \text{id}(y)$。在 Python 中，`id` 返回对象在内存中的地址，相同 `id` 意味着同一对象，故 $x \equiv y$（身份相等），进而 $x = y$（值相等，因同一对象的值必然相等），`hash(x) = hash(y)`（因 `hash` 是对象的方法，同一对象调用同一方法返回相同结果）。$\blacksquare$

### 3.4 线程安全单例的形式化定义

**定义 3.3（线程安全单例）**：给定单例元类 $M$，若在并发环境下 $M.\text{\_\_call\_\_}$ 满足：

$$\forall t_1, t_2 \in \text{Threads}, \text{call}_{t_1}(C) = \text{call}_{t_2}(C) = x \implies \text{id}(x_{t_1}) = \text{id}(x_{t_2})$$

即任意线程调用 $C$ 的构造获得的实例 `id` 相同，则称 $M$ 为线程安全单例元类。

### 3.5 Monostate（Borg）模式的形式化定义

**定义 3.4（Monostate/Borg）**：给定类 $B$，若 $B$ 满足：

$$\forall x, y \in \text{Instances}(B), x \neq y \land \text{state}(x) = \text{state}(y)$$

即 $B$ 的所有实例身份不同但状态相同（共享 `__dict__`），则称 $B$ 为 Monostate 类。

Monostate 与单例的核心区别在于"身份唯一"vs"状态唯一"。Alex Martelli 在 2003 年提出 Borg 模式时指出，Python 中"状态共享"比"身份共享"更符合实际需求，因为 Python 的语义允许同一状态的不同对象在逻辑上等价。

---

## 4. 理论推导与证明

### 4.1 元类 `__call__` 拦截实例化的正确性

**命题 4.1**：设元类 $M$ 重写 `__call__` 方法，在首次调用时创建实例并缓存，后续调用返回缓存实例。则 $M$ 控制的类 $C$ 满足单例性质。

**证明**：

设 $M.\text{\_\_call\_\_}$ 实现为：

```python
def __call__(cls, *args, **kwargs):
    if cls not in cls._instances:
        cls._instances[cls] = super().__call__(*args, **kwargs)
    return cls._instances[cls]
```

设 $C$ 的元类为 $M$，即 $\text{metaclass}(C) = M$。当执行 `C(...)` 时，Python 解释器实际调用 `M.__call__(C, ...)`。

**归纳基础**：第一次调用 `C(...)` 时，`C not in M._instances` 为真，执行 `super().__call__(...)` 即 `type.__call__(C, ...)`，创建实例 $x$ 并存入 `M._instances[C]`。返回 $x$。

**归纳步骤**：假设第 $k$ 次调用返回 $x$。第 $k+1$ 次调用时，`C in M._instances` 为真，直接返回 `M._instances[C]` = $x$。

由数学归纳法，对所有 $n \geq 1$，第 $n$ 次调用 `C(...)` 返回 $x$，即所有实例身份相同。$\blacksquare$

### 4.2 双重检查锁定（DCL）的必要性

**命题 4.2**：在多线程环境下，简单单例元类（不加锁）无法保证线程安全。

**证明**（反例构造）：

设两个线程 $T_1, T_2$ 同时首次调用 `C(...)`。考虑以下交错执行：

| 时刻 | $T_1$ | $T_2$ |
|------|-------|-------|
| $t_1$ | 检查 `C not in _instances`，为真 | — |
| $t_2$ | — | 检查 `C not in _instances`，为真 |
| $t_3$ | 执行 `super().__call__(...)`，创建 $x_1$ | — |
| $t_4$ | — | 执行 `super().__call__(...)`，创建 $x_2$ |
| $t_5$ | `M._instances[C] = x_1` | — |
| $t_6$ | — | `M._instances[C] = x_2`（覆盖） |
| $t_7$ | 返回 $x_1$ | — |
| $t_8$ | — | 返回 $x_2$ |

结果：$T_1$ 获得 $x_1$，$T_2$ 获得 $x_2$，且 $\text{id}(x_1) \neq \text{id}(x_2)$，违反单例性质。$\blacksquare$

**推论 4.1**：为在多线程环境下保证单例性质，必须引入同步机制。

**双重检查锁定的正确性**：

```python
def __call__(cls, *args, **kwargs):
    if cls not in cls._instances:           # 第一次检查（无锁）
        with cls._lock:                      # 加锁
            if cls not in cls._instances:    # 第二次检查（持锁）
                cls._instances[cls] = super().__call__(*args, **kwargs)
    return cls._instances[cls]
```

**为什么需要两次检查**：

- 第一次检查避免已初始化后的锁开销，提升性能。
- 第二次检查防止多个线程通过第一次检查后重复创建实例。

**Python 中的特殊性**：

在 CPython 中，由于 GIL（Global Interpreter Lock）的存在，字节码级别的操作是原子的。`dict` 的 `__contains__` 与 `__setitem__` 各自是原子的，但 `if ... not in ...: ...[...] = ...` 这一复合操作并非原子。因此 DCL 在 Python 中仍有必要性，尤其是在 `super().__call__()` 涉及复杂初始化（可能释放 GIL，如 I/O 操作）的场景。

### 4.3 每子类一实例（Per-Subclass Singleton）的正确性

**命题 4.3**：设元类 $M$ 的 `_instances` 以类为键，则 $M$ 控制的基类 $B$ 及其子类 $C_1, C_2, \dots, C_n$ 各自独立满足单例性质。

**证明**：

`_instances` 是以类对象为键的字典。由于 $B, C_1, \dots, C_n$ 是不同的类对象（`id` 不同），它们在 `_instances` 中对应不同的键。

对任意 $C_i$，调用 `C_i(...)` 时：

```python
M.__call__(C_i, ...) 
```

由于 $C_i$ 作为键，与 $B$、其他 $C_j$ 区分，故 $C_i$ 的实例独立缓存。即：

$$\forall i \neq j, \text{Instances}(C_i) \cap \text{Instances}(C_j) = \emptyset$$

每个 $C_i$ 各自满足 $|\text{Instances}(C_i)| = 1$。$\blacksquare$

### 4.4 Monostate 与单例的等价性条件

**命题 4.4**：Monostate 类 $B$ 在以下条件下与单例类等价：

1. $B$ 不重写 `__eq__`（使用默认的身份相等）。
2. $B$ 的 `__hash__` 基于 `id`（默认行为）。

**证明**：

Monostate 类的所有实例 $x, y$ 满足 $\text{state}(x) = \text{state}(y)$，即 `x.__dict__ is y.__dict__`（共享 `__dict__`）。

若 $B$ 使用默认 `__eq__`（即身份相等），则 $x = y \iff x \equiv y$。但 Monostate 允许 $x \not\equiv y$（不同 `id`），故 $x \neq y$（值不等）。

若 $B$ 重写 `__eq__` 为基于状态：

```python
def __eq__(self, other):
    return self.__dict__ == other.__dict__
```

则 $x = y$（值相等），但仍 $x \not\equiv y$（身份不等）。

故 Monostate 与单例在"值相等"层面可等价，但在"身份相等"层面不等价。$\blacksquare$

---

## 5. 代码示例

### 5.1 模块级单例（最 Pythonic）

```python
# config.py
"""模块级单例：Python 社区最推荐的方式。

模块在首次导入时执行顶层代码，之后 sys.modules 缓存模块对象，
后续 import 返回同一模块对象，天然保证单例性。
"""
import os
import json
from pathlib import Path


class _Config:
    """配置类（私有，外部不应直接实例化）"""

    def __init__(self):
        self._data = {}
        self._load_default()

    def _load_default(self):
        self._data = {
            "debug": False,
            "host": "localhost",
            "port": 8080,
            "database_url": os.getenv("DATABASE_URL", "sqlite:///app.db"),
        }

    def get(self, key, default=None):
        return self._data.get(key, default)

    def set(self, key, value):
        self._data[key] = value

    def load_from_file(self, path):
        with open(path, "r", encoding="utf-8") as f:
            self._data.update(json.load(f))

    def reset(self):
        """重置为默认配置（测试用）"""
        self._load_default()


# 模块级单例：首次 import 时创建，之后所有 import 返回同一对象
config = _Config()


# 使用示例
# 在其他模块中
# from config import config
# config.set("debug", True)
# print(config.get("host"))  # localhost
```

**验证模块单例性**：

```python
# test_module_singleton.py
import config
from config import config as c1
import config as config_module
from config import config as c2

print(c1 is c2)              # True
print(config_module.config is c1)  # True
print(id(c1) == id(c2))      # True
```

### 5.2 `__new__` 重写实现单例

```python
class Singleton:
    """使用 __new__ 实现单例。

    注意：__init__ 会在每次实例化时被调用，
    需要通过 _initialized 标志避免重复初始化。
    """
    _instance = None
    _initialized = False

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self, value=0):
        if not self._initialized:
            self.value = value
            self._initialized = True


# 测试
s1 = Singleton(10)
s2 = Singleton(20)  # 不会重新初始化，value 仍为 10
print(s1 is s2)      # True
print(s1.value)      # 10
print(s2.value)      # 10
```

### 5.3 装饰器实现单例

```python
import functools


def singleton(cls):
    """单例装饰器：使用闭包缓存实例。

    优点：实现简单，不依赖元类。
    缺点：装饰后返回的是函数而非类，影响 isinstance 检查与继承。
    """
    instances = {}

    @functools.wraps(cls)
    def get_instance(*args, **kwargs):
        if cls not in instances:
            instances[cls] = cls(*args, **kwargs)
        return instances[cls]

    # 保留对原始类的引用，便于测试与重置
    get_instance.__wrapped__ = cls
    get_instance._instances = instances

    return get_instance


@singleton
class Logger:
    def __init__(self):
        self.logs = []

    def log(self, message):
        self.logs.append(message)


# 测试
log1 = Logger()
log2 = Logger()
print(log1 is log2)  # True
log1.log("hello")
print(log2.logs)     # ['hello']
```

### 5.4 元类 `__call__` 实现单例（核心方案）

```python
class SingletonMeta(type):
    """元类单例：通过重写 __call__ 拦截实例化。

    相比 __new__ 方式：
    - __init__ 只在首次实例化时调用
    - 不污染类的 __new__ 与 __init__ 实现
    - 支持继承（每子类独立单例）
    """
    _instances = {}

    def __call__(cls, *args, **kwargs):
        if cls not in cls._instances:
            # 首次调用：创建实例（此时 __init__ 会被调用一次）
            cls._instances[cls] = super().__call__(*args, **kwargs)
        return cls._instances[cls]


class Database(metaclass=SingletonMeta):
    def __init__(self, url="sqlite:///app.db"):
        print(f"初始化数据库连接: {url}")
        self.url = url
        self.connection = f"Connection({url})"

    def query(self, sql):
        return f"查询: {sql} on {self.url}"


# 测试
db1 = Database()  # 输出: 初始化数据库连接: sqlite:///app.db
db2 = Database()  # 无输出（__init__ 不再调用）
print(db1 is db2)  # True
print(db1.query("SELECT 1"))  # 查询: SELECT 1 on sqlite:///app.db
```

### 5.5 线程安全元类单例（DCL）

```python
import threading
from typing import Any, Dict, Type


class ThreadSafeSingletonMeta(type):
    """线程安全单例元类：双重检查锁定（DCL）。

    使用 threading.Lock 保证多线程下只创建一个实例。
    双重检查避免已初始化后的锁开销。
    """
    _instances: Dict[type, Any] = {}
    _lock = threading.Lock()

    def __call__(cls, *args, **kwargs):
        # 第一次检查（无锁，快速路径）
        if cls not in cls._instances:
            with cls._lock:
                # 第二次检查（持锁，防止重复创建）
                if cls not in cls._instances:
                    cls._instances[cls] = super().__call__(*args, **kwargs)
        return cls._instances[cls]


class ConnectionPool(metaclass=ThreadSafeSingletonMeta):
    def __init__(self, max_size=10):
        self.max_size = max_size
        self._pool = []
        self._lock = threading.Lock()

    def acquire(self):
        with self._lock:
            if self._pool:
                return self._pool.pop()
            return f"Connection-{len(self._pool)}"

    def release(self, conn):
        with self._lock:
            self._pool.append(conn)


# 多线程测试
def worker(pool_class, results, idx):
    pool = pool_class()
    results[idx] = id(pool)


results = [None] * 10
threads = [
    threading.Thread(target=worker, args=(ConnectionPool, results, i))
    for i in range(10)
]
for t in threads:
    t.start()
for t in threads:
    t.join()

print(len(set(results)))  # 1（所有线程获得同一实例）
```

### 5.6 每子类一实例的元类单例

```python
class PerClassSingletonMeta(type):
    """每子类一实例的元类单例。

    每个子类拥有独立的单例实例，互不影响。
    适用于插件系统、策略模式等场景。
    """
    _instances: Dict[type, Any] = {}

    def __call__(cls, *args, **kwargs):
        if cls not in cls._instances:
            cls._instances[cls] = super().__call__(*args, **kwargs)
        return cls._instances[cls]


class BasePlugin(metaclass=PerClassSingletonMeta):
    name = "base"

    def execute(self):
        raise NotImplementedError


class MySQLPlugin(BasePlugin):
    name = "mysql"

    def execute(self):
        return f"MySQL 执行: {self.name}"


class RedisPlugin(BasePlugin):
    name = "redis"

    def execute(self):
        return f"Redis 执行: {self.name}"


# 测试
m1 = MySQLPlugin()
m2 = MySQLPlugin()
r1 = RedisPlugin()

print(m1 is m2)       # True
print(m1 is r1)       # False（不同子类独立单例）
print(m1.execute())   # MySQL 执行: mysql
print(r1.execute())   # Redis 执行: redis
```

### 5.7 可销毁单例（测试友好）

```python
import threading


class DestroyableSingletonMeta(type):
    """可销毁单例元类：支持在测试中重置实例。

    提供 destroy() 类方法，从 _instances 中移除当前类的实例。
    下次调用时会创建新实例。
    """
    _instances: Dict[type, Any] = {}
    _lock = threading.Lock()

    def __call__(cls, *args, **kwargs):
        if cls not in cls._instances:
            with cls._lock:
                if cls not in cls._instances:
                    cls._instances[cls] = super().__call__(*args, **kwargs)
        return cls._instances[cls]

    def destroy(cls):
        """销毁单例实例（用于测试重置）"""
        with cls._lock:
            if cls in cls._instances:
                instance = cls._instances.pop(cls)
                # 调用实例的清理方法（如果存在）
                cleanup = getattr(instance, "cleanup", None)
                if callable(cleanup):
                    cleanup()


class CacheService(metaclass=DestroyableSingletonMeta):
    def __init__(self):
        self._cache = {}
        self._connected = True

    def get(self, key):
        return self._cache.get(key)

    def set(self, key, value):
        self._cache[key] = value

    def cleanup(self):
        """资源清理"""
        self._cache.clear()
        self._connected = False


# 测试
c1 = CacheService()
c1.set("k", "v")

CacheService.destroy()  # 销毁实例

c2 = CacheService()     # 创建新实例
print(c1 is c2)          # False
print(c2.get("k"))       # None（新实例无缓存）
```

### 5.8 Monostate（Borg 模式）

```python
class Borg:
    """Borg 模式（Monostate）：所有实例共享状态。

    与单例不同，Borg 允许多个实例存在，
    但所有实例共享同一个 __dict__，即状态一致。
    """
    _shared_state: dict = {}

    def __init__(self):
        # 将实例的 __dict__ 替换为共享状态
        self.__dict__ = self._shared_state
        if not hasattr(self, "initialized"):
            self.initialized = True
            self.data = {}


class ConfigBorg(Borg):
    def __init__(self):
        super().__init__()
        if not hasattr(self, "config"):
            self.config = {}

    def get(self, key, default=None):
        return self.config.get(key, default)

    def set(self, key, value):
        self.config[key] = value


# 测试
c1 = ConfigBorg()
c2 = ConfigBorg()

print(c1 is c2)       # False（不同实例）
c1.set("debug", True)
print(c2.get("debug"))  # True（状态共享）
```

### 5.9 `__init_subclass__` 实现注册式单例

```python
class PluginRegistry:
    """使用 __init_subclass__ 实现插件注册（替代元类）。

    Python 3.6+ 推荐，比元类更简洁。
    """
    registry: dict = {}

    def __init_subclass__(cls, name=None, **kwargs):
        super().__init_subclass__(**kwargs)
        key = name or cls.__name__
        PluginRegistry.registry[key] = cls

    def execute(self):
        raise NotImplementedError


class MySQLPlugin(PluginRegistry, name="mysql"):
    def execute(self):
        return "MySQL 执行"


class RedisPlugin(PluginRegistry, name="redis"):
    def execute(self):
        return "Redis 执行"


# 测试
print(PluginRegistry.registry)
# {'MySQLPlugin': <class 'MySQLPlugin'>, 'mysql': <class 'MySQLPlugin'>, ...}
# 注意：__init_subclass__ 在类定义时即触发，name 参数控制注册键
```

### 5.10 `functools.cache` 惰性单例

```python
import functools


@functools.cache
def get_database(url="sqlite:///app.db"):
    """使用 functools.cache 实现惰性单例。

    每组参数对应一个缓存实例，相同参数返回同一实例。
    适合"参数化单例"场景。
    """
    print(f"创建数据库实例: {url}")
    return {"url": url, "connection": f"Connection({url})"}


# 测试
db1 = get_database()
db2 = get_database()
db3 = get_database("postgres:///prod")

print(db1 is db2)  # True（相同参数）
print(db1 is db3)  # False（不同参数）

# 清除缓存（测试用）
get_database.cache_clear()
```

### 5.11 `enum` 单例

```python
from enum import Enum, auto


class AppState(Enum):
    """使用 enum 实现单例。

    enum 成员在类定义时创建，且全局唯一。
    适合表示有限状态集合。
    """
    INITIALIZED = auto()
    RUNNING = auto()
    STOPPED = auto()

    def transition_to(self, new_state):
        print(f"{self.name} -> {new_state.name}")
        return new_state


# 测试
s1 = AppState.RUNNING
s2 = AppState.RUNNING
print(s1 is s2)  # True（enum 成员全局唯一）

# 实际应用：全局状态机
current_state = AppState.INITIALIZED
current_state = current_state.transition_to(AppState.RUNNING)
print(current_state)  # AppState.RUNNING
```

### 5.12 环境隔离单例

```python
import threading
from typing import Any, Dict, Optional


class EnvironmentScopedSingletonMeta(type):
    """环境隔离单例元类：每个环境拥有独立单例。

    适用于 dev/staging/prod 等多环境共享同一进程的场景。
    """
    _instances: Dict[tuple, Any] = {}  # 键: (cls, environment)
    _lock = threading.Lock()
    _current_environment: Optional[str] = None

    def __call__(cls, *args, environment=None, **kwargs):
        env = environment or cls._current_environment or "default"
        key = (cls, env)

        if key not in cls._instances:
            with cls._lock:
                if key not in cls._instances:
                    cls._instances[key] = super().__call__(*args, **kwargs)
        return cls._instances[key]

    @classmethod
    def set_environment(mcs, env: str):
        mcs._current_environment = env

    @classmethod
    def clear_environment(mcs, env: str):
        """清除指定环境的单例"""
        with mcs._lock:
            keys_to_remove = [k for k in mcs._instances if k[1] == env]
            for k in keys_to_remove:
                del mcs._instances[k]


class ConfigService(metaclass=EnvironmentScopedSingletonMeta):
    def __init__(self):
        import secrets
        self.token = secrets.token_hex(8)
        self.settings = {}


# 测试
EnvironmentScopedSingletonMeta.set_environment("dev")
dev_config1 = ConfigService()
dev_config2 = ConfigService()
print(dev_config1 is dev_config2)  # True

EnvironmentScopedSingletonMeta.set_environment("prod")
prod_config = ConfigService()
print(dev_config1 is prod_config)  # False（不同环境）

EnvironmentScopedSingletonMeta.clear_environment("dev")
# 下次获取 dev 配置会创建新实例
```

### 5.13 可观测单例元类

```python
import logging
import threading
import time
from typing import Any, Dict


class ObservableSingletonMeta(type):
    """可观测单例元类：自动记录创建、访问、销毁事件。

    集成 logging 模块，便于调试与监控。
    """
    _instances: Dict[type, Any] = {}
    _lock = threading.Lock()
    _logger = logging.getLogger("singleton")

    def __call__(cls, *args, **kwargs):
        start = time.perf_counter()
        if cls not in cls._instances:
            with cls._lock:
                if cls not in cls._instances:
                    cls._logger.info(
                        "创建单例实例: class=%s, args=%s, kwargs=%s",
                        cls.__name__, args, kwargs,
                    )
                    cls._instances[cls] = super().__call__(*args, **kwargs)
                    elapsed = (time.perf_counter() - start) * 1000
                    cls._logger.info(
                        "单例创建完成: class=%s, elapsed_ms=%.2f",
                        cls.__name__, elapsed,
                    )
        else:
            cls._logger.debug("访问已有单例: class=%s", cls.__name__)
        return cls._instances[cls]


class ExpensiveService(metaclass=ObservableSingletonMeta):
    def __init__(self):
        time.sleep(0.1)  # 模拟昂贵的初始化
        self.data = "loaded"


# 配置日志
logging.basicConfig(level=logging.DEBUG, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")

# 测试
svc1 = ExpensiveService()  # 输出: 创建单例实例...
svc2 = ExpensiveService()  # 输出: 访问已有单例...
print(svc1 is svc2)  # True
```

---

## 6. 对比分析

### 6.1 与 Ruby 单例的对比

**Ruby 的 Singleton 模块**：

```ruby
require 'singleton'

class Database
  include Singleton
  # 自动定义 private_class_method :new, instance 方法
end

db = Database.instance  # 获取单例
# Database.new          # NoMethodError: private method
```

| 特性 | Python 元类单例 | Ruby Singleton |
|------|----------------|-----------------|
| 实现方式 | 元类 `__call__` 重写 | Mixin 模块 |
| 线程安全 | 需手动加锁 | 内置线程安全 |
| 访问方式 | `Database()` | `Database.instance` |
| 继承支持 | 每子类独立 | 每子类独立 |
| 强制性 | 可绕过（`object.__new__`） | 强制（`new` 私有） |
| 代码侵入 | 低（仅元类声明） | 中（include 模块） |

**Python 的优势**：

- 模块级单例更简洁，无需类声明。
- 元类提供更大的灵活性（如环境隔离、可观测）。
- 装饰器、`functools.cache` 等多种替代方案。

**Ruby 的优势**：

- 标准库提供统一接口，减少实现分歧。
- 强制性更强，不易绕过。
- 线程安全由标准库保证。

### 6.2 与 JavaScript 单例的对比

**JavaScript 单例**：

```javascript
// 方式一：对象字面量（最简单）
const config = {
  debug: false,
  host: 'localhost',
  get(key) { return this[key]; }
};

// 方式二：IIFE + 闭包
const Database = (function() {
  let instance;
  function createInstance() {
    return { url: 'sqlite:///app.db' };
  }
  return {
    getInstance: function() {
      if (!instance) instance = createInstance();
      return instance;
    }
  };
})();

// 方式三：ES6 class + 静态方法
class Singleton {
  static instance = null;
  static getInstance() {
    if (!Singleton.instance) Singleton.instance = new Singleton();
    return Singleton.instance;
  }
}
```

| 特性 | Python 元类单例 | JavaScript 单例 |
|------|----------------|------------------|
| 实现方式 | 元类拦截 `__call__` | 闭包 / 静态方法 |
| 模块单例 | `import` 即单例 | ES Module `import` 即单例 |
| 线程安全 | 需 `threading.Lock` | 单线程，无需考虑 |
| 继承支持 | 元类支持 | 困难（原型链复杂） |
| 装饰器 | `@singleton` 函数装饰器 | 无原生装饰器 |

**关键差异**：

- JavaScript 单线程模型避免了线程安全问题，但也限制了单例在并发场景的应用。
- Python 的模块系统与 JavaScript ES Module 在单例语义上相似。
- Python 元类提供了 JavaScript 无法实现的类创建拦截能力。

### 6.3 与 Go 单例的对比

**Go 单例**：

```go
package singleton

import "sync"

type Database struct {
    URL string
}

var (
    instance *Database
    once     sync.Once
)

func GetInstance() *Database {
    once.Do(func() {
        instance = &Database{URL: "sqlite:///app.db"}
    })
    return instance
}
```

| 特性 | Python 元类单例 | Go `sync.Once` |
|------|----------------|-----------------|
| 实现方式 | 元类 + 字典缓存 | `sync.Once` |
| 线程安全 | 需 `threading.Lock` | 内置线程安全 |
| 代码侵入 | 元类声明 | 包级函数 |
| 性能 | 中等（字典查找 + 锁） | 高（`Once` 优化） |
| 惰性初始化 | 默认惰性 | 默认惰性 |

**Go 的优势**：

- `sync.Once` 提供语言级保证，简洁高效。
- 包级封装天然支持单例语义。
- 并发原语成熟，无需手动 DCL。

**Python 的优势**：

- 元类提供更丰富的扩展点（环境隔离、可观测、可销毁）。
- 动态类型允许运行时修改单例行为。
- 测试时更易 Mock（通过依赖注入）。

### 6.4 与 Java 单例的对比

**Java 单例（DCL）**：

```java
public class Database {
    private static volatile Database instance;
    private String url;

    private Database() {
        this.url = "sqlite:///app.db";
    }

    public static Database getInstance() {
        if (instance == null) {
            synchronized (Database.class) {
                if (instance == null) {
                    instance = new Database();
                }
            }
        }
        return instance;
    }
}

// Java 5+ 推荐使用 enum 单例
public enum DatabaseEnum {
    INSTANCE;
    private String url = "sqlite:///app.db";
}
```

| 特性 | Python 元类单例 | Java DCL/enum |
|------|----------------|----------------|
| 实现复杂度 | 中等（元类） | 低（enum）/ 高（DCL） |
| 线程安全 | 需手动 `Lock` | enum 内置 / DCL 需 `volatile` |
| 序列化 | 需自定义 | enum 内置支持 |
| 反射攻击 | 可绕过 | enum 防御 |
| 继承 | 支持 | enum 不支持 |

**Java 的经验启示**：

- Joshua Bloch 在《Effective Java》中强烈推荐 enum 单例，因其天然防御序列化与反射攻击。
- Python 的 `enum` 同样提供单例语义，但用途更偏向状态枚举而非传统单例。

### 6.5 Python 各单例实现方式对比

| 实现方式 | 代码量 | 线程安全 | 测试友好 | 继承支持 | 性能 | 推荐场景 |
|---------|--------|---------|---------|---------|------|---------|
| 模块级 | 极少 | 是 | 中 | N/A | 最高 | **首选** |
| `__new__` | 少 | 否 | 低 | 中 | 中 | 简单场景 |
| 装饰器 | 少 | 否 | 中 | 低 | 中 | 一次性使用 |
| 元类 `__call__` | 中 | 可选 | 高 | 高 | 中 | 框架级 |
| `__init_subclass__` | 少 | N/A | 高 | 中 | 高 | 注册场景 |
| `functools.cache` | 极少 | 是 | 中 | N/A | 高 | 参数化单例 |
| `enum` | 少 | 是 | 高 | 否 | 高 | 状态枚举 |
| Borg/Monostate | 少 | 否 | 中 | 中 | 中 | 状态共享 |

---

## 7. 常见陷阱与反模式

### 7.1 陷阱一：`__init__` 重复调用

**反模式**：

```python
class BadSingleton:
    _instance = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self, value):
        # 陷阱：每次 Singleton() 都会调用 __init__！
        self.value = value


s1 = BadSingleton(10)
s2 = BadSingleton(20)  # __init__ 再次执行，value 被覆盖
print(s1.value)  # 20（被污染）
print(s2.value)  # 20
```

**修复**：使用 `_initialized` 标志或改用元类。

```python
class GoodSingleton:
    _instance = None
    _initialized = False

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self, value):
        if not self._initialized:
            self.value = value
            self._initialized = True


s1 = GoodSingleton(10)
s2 = GoodSingleton(20)
print(s1.value)  # 10
print(s2.value)  # 10
```

**元类方案天然避免此问题**：元类 `__call__` 在首次调用后直接返回缓存实例，不再调用 `type.__call__`，因此 `__init__` 只执行一次。

### 7.2 陷阱二：线程不安全的简单单例

**反模式**：

```python
class UnsafeSingletonMeta(type):
    _instances = {}

    def __call__(cls, *args, **kwargs):
        # 无锁：多线程下可能创建多个实例
        if cls not in cls._instances:
            cls._instances[cls] = super().__call__(*args, **kwargs)
        return cls._instances[cls]
```

**问题**：见 4.2 节证明，多线程下可能创建多个实例。

**修复**：使用 DCL（见 5.5 节）。

### 7.3 陷阱三：`_instances` 字典内存泄漏

**反模式**：

```python
class LeakySingletonMeta(type):
    _instances = {}

    def __call__(cls, *args, **kwargs):
        if cls not in cls._instances:
            cls._instances[cls] = super().__call__(*args, **kwargs)
        return cls._instances[cls]


# 长时间运行的进程中，动态创建大量单例类
for i in range(10000):
    cls = type(f"DynamicClass{i}", (), {"__metaclass__": LeakySingletonMeta})
    cls()  # 实例永远无法被回收
```

**问题**：`_instances` 以类为键，类对象永远不会被释放，导致内存泄漏。

**修复**：使用 `weakref.WeakKeyDictionary`。

```python
import weakref


class WeakSingletonMeta(type):
    _instances = weakref.WeakKeyDictionary()

    def __call__(cls, *args, **kwargs):
        if cls not in cls._instances:
            cls._instances[cls] = super().__call__(*args, **kwargs)
        return cls._instances[cls]
```

### 7.4 陷阱四：单例状态污染测试

**反模式**：

```python
# test_config.py
class Config(metaclass=SingletonMeta):
    def __init__(self):
        self.debug = False


def test_debug_mode():
    Config().debug = True
    assert Config().debug is True


def test_default_mode():
    # 陷阱：上一个测试修改了状态，这里 Config().debug 仍为 True
    assert Config().debug is False  # 失败！
```

**修复**：使用可销毁单例或 pytest fixture。

```python
import pytest


@pytest.fixture
def config():
    """每个测试独立的 Config 实例"""
    Config.destroy()  # 清除单例
    yield Config()
    Config.destroy()  # 清理


def test_debug_mode(config):
    config.debug = True
    assert config.debug is True


def test_default_mode(config):
    assert config.debug is False  # 通过
```

### 7.5 陷阱五：元类冲突

**反模式**：

```python
class SingletonMeta(type):
    _instances = {}

    def __call__(cls, *args, **kwargs):
        if cls not in cls._instances:
            cls._instances[cls] = super().__call__(*args, **kwargs)
        return cls._instances[cls]


class ORMMeta(type):
    """另一个元类"""
    pass


class BaseModel(metaclass=ORMMeta):
    pass


class User(BaseModel, metaclass=SingletonMeta):
    # TypeError: metaclass conflict
    pass
```

**修复**：创建组合元类。

```python
class CombinedMeta(ORMMeta, SingletonMeta):
    """组合元类：同时满足 ORM 与单例需求"""
    pass


class User(BaseModel, metaclass=CombinedMeta):
    pass
```

### 7.6 陷阱六：单例与 `copy.deepcopy`

**反模式**：

```python
import copy


class SingletonMeta(type):
    _instances = {}

    def __call__(cls, *args, **kwargs):
        if cls not in cls._instances:
            cls._instances[cls] = super().__call__(*args, **kwargs)
        return cls._instances[cls]


class Config(metaclass=SingletonMeta):
    def __init__(self):
        self.data = {"key": "value"}


c1 = Config()
c2 = copy.deepcopy(c1)  # 创建新实例，违反单例！
print(c1 is c2)  # False
```

**修复**：重写 `__copy__` 与 `__deepcopy__`。

```python
class Config(metaclass=SingletonMeta):
    def __init__(self):
        self.data = {"key": "value"}

    def __copy__(self):
        return self  # 单例：返回自身

    def __deepcopy__(self, memo):
        return self  # 单例：返回自身
```

### 7.7 陷阱七：`pickle` 破坏单例

**反模式**：

```python
import pickle


class SingletonMeta(type):
    _instances = {}

    def __call__(cls, *args, **kwargs):
        if cls not in cls._instances:
            cls._instances[cls] = super().__call__(*args, **kwargs)
        return cls._instances[cls]


class Config(metaclass=SingletonMeta):
    def __init__(self):
        self.value = 42


c1 = Config()
data = pickle.dumps(c1)
c2 = pickle.loads(data)  # 创建新实例！
print(c1 is c2)  # False
```

**修复**：重写 `__reduce__`。

```python
class Config(metaclass=SingletonMeta):
    def __init__(self):
        self.value = 42

    def __reduce__(self):
        # 反序列化时返回单例实例
        return (self.__class__, ())
```

### 7.8 陷阱八：子类化单例时的意外共享

**反模式**：

```python
class SharedSingletonMeta(type):
    """错误：所有子类共享同一实例"""
    _instance = None  # 类属性，所有子类共享

    def __call__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super().__call__(*args, **kwargs)
        return cls._instance


class Base(metaclass=SharedSingletonMeta):
    pass


class ChildA(Base):
    pass


class ChildB(Base):
    pass


a = ChildA()
b = ChildB()
print(a is b)  # True（错误：不同子类应独立）
```

**修复**：使用字典以类为键。

```python
class PerClassSingletonMeta(type):
    _instances = {}  # 字典：每子类独立

    def __call__(cls, *args, **kwargs):
        if cls not in cls._instances:
            cls._instances[cls] = super().__call__(*args, **kwargs)
        return cls._instances[cls]
```

### 7.9 陷阱九：单例隐藏依赖导致测试困难

**反模式**：

```python
class Logger(metaclass=SingletonMeta):
    def log(self, msg):
        print(msg)


class UserService:
    def create_user(self, name):
        # 隐藏依赖：Logger 单例
        Logger().log(f"创建用户: {name}")
        return {"name": name}


# 测试时难以 Mock Logger
def test_create_user():
    service = UserService()
    # 如何断言 Logger 被调用？无法直接 Mock
```

**修复**：依赖注入。

```python
class UserService:
    def __init__(self, logger=None):
        self.logger = logger or Logger()

    def create_user(self, name):
        self.logger.log(f"创建用户: {name}")
        return {"name": name}


# 测试
class MockLogger:
    def __init__(self):
        self.logs = []

    def log(self, msg):
        self.logs.append(msg)


def test_create_user():
    mock_logger = MockLogger()
    service = UserService(logger=mock_logger)
    service.create_user("Alice")
    assert mock_logger.logs == ["创建用户: Alice"]
```

### 7.10 陷阱十：过度使用单例

**反模式**：将所有服务类都设为单例。

```python
# 反模式：滥用单例
class UserService(metaclass=SingletonMeta): ...
class EmailService(metaclass=SingletonMeta): ...
class PaymentService(metaclass=SingletonMeta): ...
class NotificationService(metaclass=SingletonMeta): ...
class AnalyticsService(metaclass=SingletonMeta): ...
# 所有服务都是单例，测试困难，耦合严重
```

**修复**：仅在必要场景使用单例（如配置、日志、连接池），业务逻辑类避免单例。

---

## 8. 工程实践与最佳实践

### 8.1 实践一：优先使用模块级单例

```python
# config.py（推荐）
class _Config:
    def __init__(self):
        self.debug = False

config = _Config()

# 其他模块
from config import config
```

**理由**：

- 实现最简单，无需元类或装饰器。
- Python 模块导入机制天然保证单例性。
- 测试时可通过 `importlib.reload` 重置。
- 符合 PEP 8 与社区共识。

### 8.2 实践二：元类单例必须线程安全

```python
import threading


class SingletonMeta(type):
    _instances = {}
    _lock = threading.Lock()

    def __call__(cls, *args, **kwargs):
        if cls not in cls._instances:
            with cls._lock:
                if cls not in cls._instances:
                    cls._instances[cls] = super().__call__(*args, **kwargs)
        return cls._instances[cls]
```

**理由**：多线程环境是 Python 服务的常态（Web 服务器、异步任务），不安全的单例会导致难以复现的 bug。

### 8.3 实践三：提供测试重置机制

```python
class TestableSingletonMeta(type):
    _instances = {}

    def __call__(cls, *args, **kwargs):
        if cls not in cls._instances:
            cls._instances[cls] = super().__call__(*args, **kwargs)
        return cls._instances[cls]

    def reset(cls):
        """重置单例（测试用）"""
        cls._instances.pop(cls, None)


# 测试夹具
import pytest


@pytest.fixture
def singleton_instance():
    SomeService.reset()
    yield SomeService()
    SomeService.reset()
```

### 8.4 实践四：使用 `weakref` 避免内存泄漏

```python
import weakref


class WeakSingletonMeta(type):
    """使用 WeakKeyDictionary 避免类对象无法回收"""
    _instances = weakref.WeakKeyDictionary()
    _lock = threading.Lock()

    def __call__(cls, *args, **kwargs):
        if cls not in cls._instances:
            with cls._lock:
                if cls not in cls._instances:
                    cls._instances[cls] = super().__call__(*args, **kwargs)
        return cls._instances[cls]
```

### 8.5 实践五：文档化单例语义

```python
class Database(metaclass=SingletonMeta):
    """数据库连接管理器（单例）。

    .. note::
        本类为单例，全进程唯一实例。
        使用 ``Database()`` 获取实例，多次调用返回同一对象。

    .. warning::
        单例状态在测试间共享，测试时调用 ``Database.reset()`` 重置。

    Example:
        >>> db1 = Database()
        >>> db2 = Database()
        >>> db1 is db2
        True
    """
    pass
```

### 8.6 实践六：避免单例中持有可变全局状态

```python
# 反模式
class GlobalState(metaclass=SingletonMeta):
    def __init__(self):
        self.user_cache = {}  # 可变全局状态
        self.session_data = {}

# 推荐：使用 contextvars 管理请求级状态
import contextvars

request_user = contextvars.ContextVar("request_user", default=None)

def handle_request(user):
    request_user.set(user)
    # 在此请求范围内访问 request_user.get()
```

### 8.7 实践七：单例初始化应快速且无副作用

```python
# 反模式
class SlowSingleton(metaclass=SingletonMeta):
    def __init__(self):
        # 陷阱：初始化耗时，阻塞首次调用
        time.sleep(10)
        self.data = load_large_dataset()

# 推荐：惰性加载
class LazySingleton(metaclass=SingletonMeta):
    def __init__(self):
        self._data = None

    @property
    def data(self):
        if self._data is None:
            self._data = load_large_dataset()
        return self._data
```

### 8.8 实践八：使用类型注解提升可维护性

```python
from typing import Any, Dict, Optional, Type, TypeVar

T = TypeVar("T")


class TypedSingletonMeta(type):
    _instances: Dict[Type, Any] = {}
    _lock = threading.Lock()

    def __call__(cls: Type[T], *args, **kwargs) -> T:
        if cls not in cls._instances:
            with cls._lock:
                if cls not in cls._instances:
                    cls._instances[cls] = super().__call__(*args, **kwargs)
        return cls._instances[cls]


class Config(metaclass=TypedSingletonMeta):
    def __init__(self) -> None:
        self.debug: bool = False
        self.host: str = "localhost"

    def get(self, key: str, default: Optional[Any] = None) -> Any:
        return getattr(self, key, default)
```

### 8.9 实践九：集成结构化日志

```python
import logging
import structlog


class LoggedSingletonMeta(type):
    _instances = {}
    _lock = threading.Lock()
    _logger = structlog.get_logger("singleton")

    def __call__(cls, *args, **kwargs):
        if cls not in cls._instances:
            with cls._lock:
                if cls not in cls._instances:
                    self._logger.info(
                        "singleton.creating",
                        class_name=cls.__name__,
                    )
                    cls._instances[cls] = super().__call__(*args, **kwargs)
                    self._logger.info(
                        "singleton.created",
                        class_name=cls.__name__,
                    )
        return cls._instances[cls]
```

### 8.10 实践十：提供优雅降级能力

```python
import threading
from typing import Optional


class ResilientSingletonMeta(type):
    """容错单例：初始化失败时返回 None 或上次成功实例"""
    _instances = {}
    _lock = threading.Lock()

    def __call__(cls, *args, **kwargs):
        if cls not in cls._instances:
            with cls._lock:
                if cls not in cls._instances:
                    try:
                        cls._instances[cls] = super().__call__(*args, **kwargs)
                    except Exception as e:
                        logging.error(f"单例初始化失败: {cls.__name__}, {e}")
                        # 返回 None 或上次成功实例（如有）
                        return cls._instances.get(cls, None)
        return cls._instances[cls]
```

---

## 9. 案例研究

### 9.1 案例一：Python `logging` 模块的单例设计

Python 标准库 `logging` 模块是单例模式的经典应用：

```python
import logging


# Logger 对象通过名称全局唯一
logger1 = logging.getLogger("myapp")
logger2 = logging.getLogger("myapp")
print(logger1 is logger2)  # True（同一名称返回同一 Logger）

# 内部实现
class Manager:
    """logging 模块的 Logger 管理器（简化版）"""
    _loggerClass = Logger

    def __init__(self, rootnode):
        self.root = rootnode
        self._loggers = {}  # 名称 -> Logger 的字典

    def getLogger(self, name):
        """获取或创建 Logger"""
        if name in self._loggers:
            return self._loggers[name]
        rv = self._loggerClass(name)
        self._loggers[name] = rv
        return rv
```

**设计要点**：

- 使用"注册表模式"而非元类单例。
- 按名称隔离不同 Logger，支持层级（`myapp.module`）。
- 全局唯一的 `Manager` 实例管理所有 Logger。

**启示**：单例不一定通过元类实现，注册表模式是更灵活的替代方案。

### 9.2 案例二：Django 的 `AppConfig` 单例

Django 框架使用模块级单例管理应用配置：

```python
# django/apps/config.py（简化）
class AppConfig:
    def __init__(self, app_name, app_module):
        self.name = app_name
        self.module = app_module
        self.models = {}


# django/apps/registry.py（简化）
class Apps:
    """Django 应用注册表（模块级单例）"""
    def __init__(self):
        self.app_configs = {}

    def populate(self, installed_apps):
        for app_name in installed_apps:
            module = import_module(app_name)
            app_config = AppConfig(app_name, module)
            self.app_configs[app_name] = app_config

    def get_app_config(self, app_label):
        return self.app_configs[app_label]


# 全局单例
apps = Apps()
```

**使用方式**：

```python
from django.apps import apps

user_app = apps.get_app_config("auth")
print(user_app.name)  # 'django.contrib.auth'
```

**设计要点**：

- 模块级单例，无需元类。
- 提供丰富的 API（`get_app_config`、`get_model`、`get_models`）。
- 支持 `ready()` 钩子进行应用初始化。

### 9.3 案例三：SQLAlchemy 的 `MetaData` 与 `Engine`

SQLAlchemy 使用模块级单例管理数据库元数据：

```python
from sqlalchemy import MetaData, create_engine
from sqlalchemy.orm import declarative_base


# 模块级单例：Base 类
Base = declarative_base()

# Base.metadata 是 MetaData 单例
print(Base.metadata)  # MetaData 对象

# Engine 通常在应用启动时创建一次
engine = create_engine("sqlite:///app.db")

# Session 通过 sessionmaker 工厂创建（非单例）
from sqlalchemy.orm import sessionmaker
Session = sessionmaker(bind=engine)
```

**设计要点**：

- `Base` 类作为模块级单例，所有模型继承自它。
- `metadata` 作为 `Base` 的属性，自动收集所有表定义。
- `Engine` 推荐应用级单例，`Session` 推荐请求级多实例。

### 9.4 案例四：Pydantic 的 `BaseSettings` 单例

Pydantic v2 的 `BaseSettings` 常用作配置单例：

```python
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """应用配置（从环境变量加载）"""
    app_name: str = "MyApp"
    debug: bool = False
    database_url: str = "sqlite:///app.db"

    class Config:
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    """使用 lru_cache 实现惰性单例"""
    return Settings()


# 使用
settings = get_settings()
print(settings.app_name)
```

**设计要点**：

- 使用 `@lru_cache` 装饰器实现单例，简洁优雅。
- 类型注解提供编译时检查。
- 支持环境变量与 `.env` 文件自动加载。
- 测试时调用 `get_settings.cache_clear()` 重置。

### 9.5 案例五：Celery 的 `Celery` 应用单例

Celery 分布式任务队列使用模块级单例：

```python
# celery_app.py
from celery import Celery

app = Celery(
    "myapp",
    broker="redis://localhost:6379",
    backend="redis://localhost:6379",
)

@app.task
def add(x, y):
    return x + y


# 其他模块
from celery_app import app
app.send_task("myapp.add", args=[1, 2])
```

**设计要点**：

- `app` 对象作为模块级单例，全局唯一。
- 装饰器 `@app.task` 注册任务到单例。
- 支持多应用并存（不同模块不同 `app`）。

### 9.6 案例六：Redis 客户端连接池

`redis-py` 使用单例模式管理连接池：

```python
import redis
from threading import Lock


class RedisClientMeta(type):
    """Redis 客户端单例元类"""
    _instances = {}
    _lock = Lock()

    def __call__(cls, *args, **kwargs):
        if cls not in cls._instances:
            with cls._lock:
                if cls not in cls._instances:
                    cls._instances[cls] = super().__call__(*args, **kwargs)
        return cls._instances[cls]


class RedisClient(metaclass=RedisClientMeta):
    def __init__(self, url="redis://localhost:6379"):
        self.pool = redis.ConnectionPool.from_url(url)

    @property
    def conn(self):
        return redis.Redis(connection_pool=self.pool)


# 全局唯一 Redis 客户端
r1 = RedisClient()
r2 = RedisClient()
print(r1 is r2)  # True
```

### 9.7 案例七：TensorFlow / PyTorch 全局会话

深度学习框架常使用单例管理 GPU 资源：

```python
import threading
import torch


class GPUResourceManagerMeta(type):
    """GPU 资源管理器单例"""
    _instance = None
    _lock = threading.Lock()

    def __call__(cls, *args, **kwargs):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__call__(*args, **kwargs)
        return cls._instance


class GPUResourceManager(metaclass=GPUResourceManagerMeta):
    def __init__(self):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.allocated_memory = 0
        self._lock = threading.Lock()

    def allocate(self, size):
        with self._lock:
            if self.allocated_memory + size > torch.cuda.get_device_properties(0).total_memory:
                raise MemoryError("GPU 内存不足")
            self.allocated_memory += size
            return torch.empty(size, device=self.device)

    def deallocate(self, size):
        with self._lock:
            self.allocated_memory -= size
```

### 9.8 案例八：FastAPI 的设置对象

FastAPI 推荐使用 Pydantic Settings 作为配置单例：

```python
from fastapi import FastAPI, Depends
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    app_name: str = "My API"
    admin_email: str = "admin@example.com"
    items_per_page: int = 10


@lru_cache
def get_settings():
    return Settings()


app = FastAPI()


@app.get("/info")
async def info(settings: Settings = Depends(get_settings)):
    return {
        "app_name": settings.app_name,
        "admin_email": settings.admin_email,
    }


@app.get("/items")
async def list_items(
    page: int = 1,
    settings: Settings = Depends(get_settings),
):
    start = (page - 1) * settings.items_per_page
    return {"page": page, "start": start}
```

---

## 10. 习题与思考题

### 10.1 基础题

**题目 10.1.1**：使用模块级方式实现一个 `Logger` 单例，支持 `info`、`warning`、`error` 三个方法，输出格式为 `[时间] [级别] 消息`。

**参考答案**：

```python
# logger.py
from datetime import datetime


class _Logger:
    def _log(self, level, message):
        time_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{time_str}] [{level}] {message}")

    def info(self, message):
        self._log("INFO", message)

    def warning(self, message):
        self._log("WARNING", message)

    def error(self, message):
        self._log("ERROR", message)


logger = _Logger()


# 使用
# from logger import logger
# logger.info("应用启动")
```

**题目 10.1.2**：使用元类实现一个线程安全的单例 `Cache`，支持 `get(key)`、`set(key, value)`、`delete(key)` 方法。

**参考答案**：

```python
import threading


class SingletonMeta(type):
    _instances = {}
    _lock = threading.Lock()

    def __call__(cls, *args, **kwargs):
        if cls not in cls._instances:
            with cls._lock:
                if cls not in cls._instances:
                    cls._instances[cls] = super().__call__(*args, **kwargs)
        return cls._instances[cls]


class Cache(metaclass=SingletonMeta):
    def __init__(self):
        self._data = {}
        self._lock = threading.Lock()

    def get(self, key):
        with self._lock:
            return self._data.get(key)

    def set(self, key, value):
        with self._lock:
            self._data[key] = value

    def delete(self, key):
        with self._lock:
            self._data.pop(key, None)
```

### 10.2 应用题

**题目 10.2.1**：设计一个支持"环境隔离"的配置单例，使同一进程内 dev、staging、prod 环境拥有独立的配置实例。

**参考答案**：见 5.12 节代码示例。

**题目 10.2.2**：为元类单例实现 `__copy__` 与 `__deepcopy__`，确保 `copy.copy` 与 `copy.deepcopy` 返回单例本身。

**参考答案**：

```python
import copy


class SingletonMeta(type):
    _instances = {}

    def __call__(cls, *args, **kwargs):
        if cls not in cls._instances:
            cls._instances[cls] = super().__call__(*args, **kwargs)
        return cls._instances[cls]


class Config(metaclass=SingletonMeta):
    def __init__(self):
        self.data = {}

    def __copy__(self):
        return self

    def __deepcopy__(self, memo):
        return self


c1 = Config()
c2 = copy.copy(c1)
c3 = copy.deepcopy(c1)
print(c1 is c2)  # True
print(c1 is c3)  # True
```

### 10.3 分析题

**题目 10.3.1**：分析以下代码的问题，并给出修复方案。

```python
class SingletonMeta(type):
    _instance = None

    def __call__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super().__call__(*args, **kwargs)
        return cls._instance


class Base(metaclass=SingletonMeta):
    pass


class A(Base):
    pass


class B(Base):
    pass
```

**参考答案**：

**问题**：`_instance` 是类属性，所有子类共享。`A()` 与 `B()` 会返回同一实例，违反"每子类独立单例"的期望。

**修复**：使用字典以类为键。

```python
class SingletonMeta(type):
    _instances = {}  # 字典：每子类独立

    def __call__(cls, *args, **kwargs):
        if cls not in cls._instances:
            cls._instances[cls] = super().__call__(*args, **kwargs)
        return cls._instances[cls]
```

**题目 10.3.2**：为什么在 CPython 中，即使不加锁的简单单例"通常"能工作，但仍然是错的？

**参考答案**：

CPython 的 GIL（Global Interpreter Lock）保证字节码级别的原子性，`dict` 操作（`__contains__`、`__setitem__`）各自是原子的。在单字节码级别，简单单例可能"碰巧"工作。

但 `if cls not in _instances: ... = super().__call__(...)` 是复合操作，中间的 `super().__call__()` 可能涉及：

- 调用 `__new__` 与 `__init__`，可能执行任意 Python 代码。
- I/O 操作（如读取配置文件）会释放 GIL。
- 字节码之间可能发生线程切换。

因此，多线程下仍可能创建多个实例，违反单例性质。生产代码必须使用锁保证线程安全。

### 10.4 评价题

**题目 10.4.1**：评价以下观点："Python 中应该避免使用单例模式，模块级变量是唯一正确的单例实现方式。"

**参考答案**：

该观点部分正确，但过于绝对。

**支持理由**：

- Python 模块导入机制天然支持单例，是最简洁、最 Pythonic 的方式。
- 单例类增加了测试复杂度，隐藏了依赖关系。
- 模块级变量更易于理解、Mock 与重置。

**反对理由**：

- 框架级代码（ORM、连接池）需要更精细的控制，元类单例提供必要扩展点。
- 某些场景需要"参数化单例"（如不同环境不同实例），模块级变量难以表达。
- 元类单例支持继承与每子类独立实例，模块级变量无法实现。
- C 扩展桥接、遗留系统集成等场景可能需要类形式的单例。

**结论**：模块级变量应作为默认选择，元类单例作为框架级或特殊场景的补充。不应一刀切地禁止元类单例，但应避免在业务代码中滥用。

### 10.5 创造题

**题目 10.5.1**：设计一个"单例治理框架"，提供以下能力：

1. 注册表：所有单例的集中管理。
2. 生命周期管理：初始化、销毁、重建。
3. 健康检查：定期检查单例状态。
4. 优雅降级：单例初始化失败时返回降级实例。

**参考答案**：

```python
import threading
import logging
from typing import Any, Callable, Dict, Optional, Type


class SingletonRegistry:
    """单例治理框架"""

    def __init__(self):
        self._instances: Dict[str, Any] = {}
        self._factories: Dict[str, Callable] = {}
        self._health_checks: Dict[str, Callable] = {}
        self._lock = threading.Lock()
        self._logger = logging.getLogger("singleton.registry")

    def register(
        self,
        name: str,
        factory: Callable,
        health_check: Optional[Callable] = None,
    ):
        """注册单例"""
        self._factories[name] = factory
        if health_check:
            self._health_checks[name] = health_check

    def get(self, name: str) -> Any:
        """获取单例实例"""
        if name not in self._instances:
            with self._lock:
                if name not in self._instances:
                    try:
                        self._instances[name] = self._factories[name]()
                        self._logger.info(f"单例创建成功: {name}")
                    except Exception as e:
                        self._logger.error(f"单例创建失败: {name}, {e}")
                        raise
        return self._instances[name]

    def destroy(self, name: str):
        """销毁单例"""
        with self._lock:
            if name in self._instances:
                instance = self._instances.pop(name)
                cleanup = getattr(instance, "cleanup", None)
                if callable(cleanup):
                    cleanup()

    def health_check_all(self) -> Dict[str, bool]:
        """检查所有单例健康状态"""
        results = {}
        for name, check in self._health_checks.items():
            try:
                results[name] = check(self._instances.get(name))
            except Exception:
                results[name] = False
        return results


# 全局注册表
registry = SingletonRegistry()


# 使用
def create_database():
    return Database(url="sqlite:///app.db")


def database_health_check(db):
    return db is not None and db.connection.is_active


registry.register("database", create_database, database_health_check)

db = registry.get("database")
```

### 10.6 思考题

**题目 10.6.1**：在微服务架构中，单例模式是否仍有意义？分布式环境下的"单例"应如何实现？

**提示**：考虑分布式锁（Redis、etcd）、领导选举（Raft、Paxos）、分片与一致性哈希。

**题目 10.6.2**：单例模式与函数式编程的"纯函数"理念是否冲突？如何在函数式风格中使用单例？

**提示**：考虑依赖注入、Reader Monad、副作用隔离。

**题目 10.6.3**：为什么 Python 社区倾向于"模块即单例"而非 GoF 风格单例类？这反映了哪些设计哲学的差异？

**提示**：考虑"显式优于隐式"、鸭子类型、模块系统的设计。

---

## 11. 参考文献

### 11.1 经典文献

- Gamma, E., Helm, R., Johnson, R., & Vlissides, J. (1994). *Design Patterns: Elements of Reusable Object-Oriented Software*. Addison-Wesley Professional.（GoF 经典，单例模式的原始定义）

- Bloch, J. (2018). *Effective Java* (3rd ed.). Addison-Wesley Professional.（Item 3: Enforce the singleton property with a private constructor or an enum type）

- Slatkin, B. (2019). *Effective Python* (2nd ed.). Addison-Wesley Professional.（Item 35: Use Modules to Encapsulate State, Not Classes）

### 11.2 Python 特定文献

- Martelli, A. (2003). *Python Cookbook* (2nd ed.). O'Reilly Media.（Borg 模式的原始提出）

- Ramalho, L. (2022). *Fluent Python* (2nd ed.). O'Reilly Media.（第 11 章：Python 风格的接口与协议）

- Beazley, D., & Jones, B. K. (2013). *Python Cookbook* (3rd ed.). O'Reilly Media.（Recipe 9.13: Using a Metaclass to Control Instance Creation）

### 11.3 PEP 文档

- Python Software Foundation. (2006). *PEP 3115: Metaclasses in Python 3000*. https://peps.python.org/pep-3115/

- Python Software Foundation. (2015). *PEP 487: Simpler customisation of class creation*. https://peps.python.org/pep-0487/

- Python Software Foundation. (2017). *PEP 557: Data Classes*. https://peps.python.org/pep-0557/

### 11.4 学术论文

- Hannemann, J., & Kiczales, G. (2002). Design pattern implementation in Java and AspectJ. *ACM SIGPLAN Notices*, 37(11), 193-205.（单例模式的面向切面实现）

- Beck, K., & Cunningham, W. (1989). Using pattern languages for object-oriented programs. *OOPSLA'89 Workshop on Specification and Design for Object-Oriented Programming*.（设计模式语言）

### 11.5 在线资源

- Python Documentation. *Data model*. https://docs.python.org/3/reference/datamodel.html

- Python Documentation. *types — Dynamic type creation and built-in types*. https://docs.python.org/3/library/types.html

- Real Python. *Python Singleton: How to Use the Singleton Pattern*. https://realpython.com/python-singleton/

---

## 12. 延伸阅读

### 12.1 元类深入

- 本项目 `python/元类.md`：元类与类创建过程的深度解析。
- 本项目 `python/描述符协议.md`：描述符与元类的配合使用。
- 本项目 `python/装饰器进阶.md`：装饰器作为元类的轻量替代方案。

### 12.2 设计模式

- *Head First Design Patterns*（O'Reilly）：单例模式的可视化讲解。
- *Refactoring to Patterns*（Addison-Wesley）：何时引入单例，何时移除单例。
- *Design Patterns in Python*（GitHub 资源）：Python 版 23 种设计模式实现。

### 12.3 测试与单例

- *Test Driven Development*（Kent Beck）：测试驱动开发中的依赖管理。
- pytest 文档：*Fixture 与单例重置*。https://docs.pytest.org/en/stable/fixture.html
- *Working Effectively with Legacy Code*（Michael Feathers）：如何测试遗留代码中的单例。

### 12.4 并发与线程安全

- *Python Concurrency with asyncio*（Matthew Fowler）：异步编程中的单例。
- *High Performance Python*（Micha Gorelick, Ian Ozsvald）：单例的性能考量。
- Python `threading` 文档：https://docs.python.org/3/library/threading.html

### 12.5 框架实践

- Django Documentation. *Applications*. https://docs.djangoproject.com/en/stable/ref/applications/
- SQLAlchemy Documentation. *Session Basics*. https://docs.sqlalchemy.org/en/stable/orm/session_basics.html
- FastAPI Documentation. *Settings and Environment Variables*. https://fastapi.tiangolo.com/advanced/settings/

### 12.6 函数式替代方案

- *Functional Programming in Python*（David Mertz）：函数式风格中的状态管理。
- *Learn You a Haskell for Great Good!*（Miran Lipovača）：Monadic 状态管理对 Python 的启示。
- Python `contextvars` 文档：https://docs.python.org/3/library/contextvars.html

---

## 附录 A：单例模式速查表

| 实现方式 | 代码示例 | 适用场景 |
|---------|---------|---------|
| 模块级 | `config = Config()` | **首选**，简单配置 |
| `__new__` | `if cls._instance is None: ...` | 简单类，不需继承 |
| 装饰器 | `@singleton` | 一次性使用 |
| 元类 | `class Meta(type): __call__` | 框架级，需继承 |
| `__init_subclass__` | `def __init_subclass__(cls):` | 注册场景 |
| `functools.cache` | `@cache; def get(): ...` | 参数化单例 |
| `enum` | `class State(Enum):` | 状态枚举 |
| Borg | `self.__dict__ = self._shared_state` | 状态共享 |

## 附录 B：术语表

- **Singleton Pattern（单例模式）**：确保一个类只有一个实例，并提供全局访问点。
- **Monostate Pattern（Monostate 模式）**：所有实例共享状态的模式，又称 Borg 模式。
- **Double-Checked Locking（DCL，双重检查锁定）**：先检查再加锁再检查的并发模式，减少锁开销。
- **Metaclass（元类）**：创建类的类，Python 中默认元类是 `type`。
- **`__call__`**：元类拦截实例化的钩子方法。
- **`__init_subclass__`**：Python 3.6+ 提供的类创建钩子，简化元类场景。
- **`functools.cache`**：基于 `lru_cache` 的装饰器，实现参数化单例。
- **Borg Pattern（Borg 模式）**：由 Alex Martelli 提出，所有实例共享 `__dict__`。
- **WeakKeyDictionary**：弱引用字典，键被回收时自动删除条目，避免内存泄漏。
- **GIL（Global Interpreter Lock）**：CPython 的全局解释器锁，保证字节码级原子性。

## 附录 C：版本兼容性

| 特性 | Python 2.7 | Python 3.4 | Python 3.6 | Python 3.7 | Python 3.10+ |
|------|-----------|-----------|-----------|-----------|--------------|
| 元类 `__call__` | 支持 | 支持 | 支持 | 支持 | 支持 |
| `__init_subclass__` | 不支持 | 不支持 | 支持 | 支持 | 支持 |
| `metaclass=` 语法 | 不支持（用 `__metaclass__`） | 支持 | 支持 | 支持 | 支持 |
| `functools.cache` | 不支持 | 不支持 | 不支持 | 不支持 | 支持 |
| `enum` 模块 | 不支持 | 支持 | 支持 | 支持 | 支持 |
| `dataclass` | 不支持 | 不支持 | 不支持 | 支持 | 支持 |
| `weakref.WeakKeyDictionary` | 支持 | 支持 | 支持 | 支持 | 支持 |

## 附录 D：学习路径建议

### D.1 初学者路径（0 基础）

1. 理解 Python 类与对象基础（`python/面向对象编程.md`）。
2. 学习模块导入机制（`python/模块与包.md`）。
3. 掌握模块级单例（本文 5.1 节）。
4. 了解 `__new__` 单例（本文 5.2 节）。
5. 实践简单配置类与日志类。

### D.2 进阶路径（有基础）

1. 学习元类基础（`python/元类.md`）。
2. 掌握元类 `__call__` 单例（本文 5.4 节）。
3. 理解线程安全与 DCL（本文 5.5 节）。
4. 学习 Monostate 与 Borg 模式（本文 5.8 节）。
5. 实践框架级单例（如 ORM、连接池）。

### D.3 高级路径（框架开发者）

1. 深入元类冲突与组合（本文 7.5 节）。
2. 掌握可销毁单例与测试重置（本文 5.7 节）。
3. 实现环境隔离单例（本文 5.12 节）。
4. 构建单例治理框架（本文 10.5.1 题）。
5. 研究分布式单例与领导选举。

## 附录 E：调试技巧

### E.1 检查单例性

```python
def assert_singleton(cls):
    """断言类是单例"""
    instances = [cls() for _ in range(10)]
    first = instances[0]
    assert all(inst is first for inst in instances), f"{cls.__name__} 不是单例"
    print(f"{cls.__name__} 单例验证通过")


assert_singleton(Database)
```

### E.2 追踪实例创建

```python
import traceback


class DebugSingletonMeta(type):
    _instances = {}

    def __call__(cls, *args, **kwargs):
        if cls not in cls._instances:
            print(f"首次创建 {cls.__name__} 实例:")
            traceback.print_stack()
            cls._instances[cls] = super().__call__(*args, **kwargs)
        return cls._instances[cls]
```

### E.3 内存泄漏检测

```python
import gc
import weakref


def check_singleton_leak():
    """检查单例字典是否泄漏"""
    gc.collect()
    print(f"SingletonMeta._instances 中的类数: {len(SingletonMeta._instances)}")
    for cls in list(SingletonMeta._instances.keys()):
        ref_count = len(gc.get_referrers(cls))
        print(f"  {cls.__name__}: 引用数 {ref_count}")
```

## 附录 F：性能基准测试

```python
import timeit
import threading


def benchmark_singleton():
    """单例获取性能基准"""
    setup = """
import threading

class SingletonMeta(type):
    _instances = {}
    _lock = threading.Lock()
    def __call__(cls, *args, **kwargs):
        if cls not in cls._instances:
            with cls._lock:
                if cls not in cls._instances:
                    cls._instances[cls] = super().__call__(*args, **kwargs)
        return cls._instances[cls]

class Service(metaclass=SingletonMeta):
    def __init__(self):
        self.value = 42

# 预先创建实例
Service()
"""

    # 测试获取单例的性能
    time_taken = timeit.timeit("Service()", setup=setup, number=1_000_000)
    print(f"获取单例 1,000,000 次: {time_taken:.2f}s")
    print(f"平均每次: {time_taken * 1000:.2f}ns")


benchmark_singleton()
```

典型输出（CPython 3.11，M1 Pro）：

```
获取单例 1,000,000 次: 0.32s
平均每次: 320ns
```

## 附录 G：安全考量

### G.1 防止反射绕过

```python
import copy
import pickle


class SecureSingletonMeta(type):
    _instances = {}

    def __call__(cls, *args, **kwargs):
        if cls not in cls._instances:
            cls._instances[cls] = super().__call__(*args, **kwargs)
        return cls._instances[cls]


class SecureConfig(metaclass=SecureSingletonMeta):
    def __init__(self):
        self.secret = "sensitive-data"

    # 防止 copy 绕过
    def __copy__(self):
        return self

    def __deepcopy__(self, memo):
        return self

    # 防止 pickle 绕过
    def __reduce__(self):
        return (self.__class__, ())

    # 防止 __new__ 绕过
    def __new__(cls, *args, **kwargs):
        # 强制通过元类创建
        return super().__new__(cls)
```

### G.2 敏感数据保护

```python
import os


class SecretManagerMeta(type):
    _instances = {}

    def __call__(cls, *args, **kwargs):
        if cls not in cls._instances:
            cls._instances[cls] = super().__call__(*args, **kwargs)
        return cls._instances[cls]

    def __del__(cls):
        """类销毁时清除敏感数据"""
        for instance in cls._instances.values():
            if hasattr(instance, "_secrets"):
                for key in list(instance._secrets.keys()):
                    instance._secrets[key] = "0" * len(instance._secrets[key])
                    del instance._secrets[key]


class SecretManager(metaclass=SecretManagerMeta):
    def __init__(self):
        self._secrets = {}

    def set_secret(self, key, value):
        self._secrets[key] = value

    def get_secret(self, key):
        return self._secrets.get(key)

    def __repr__(self):
        # 不在 repr 中暴露敏感数据
        return f"SecretManager(keys={list(self._secrets.keys())})"
```

## 附录 H：面试题精选

### H.1 基础题

**Q**: Python 中实现单例模式有几种方式？

**A**: 至少 6 种：

1. 模块级变量（最 Pythonic）
2. `__new__` 重写
3. 装饰器
4. 元类 `__call__`
5. `__init_subclass__`（注册场景）
6. `functools.cache`（参数化单例）
7. `enum`（状态枚举）

### H.2 进阶题

**Q**: 元类单例相比 `__new__` 单例的优势是什么？

**A**:

1. `__init__` 只调用一次，避免重复初始化。
2. 不污染类的 `__new__` 与 `__init__` 实现。
3. 支持每子类独立单例。
4. 易于添加横切逻辑（日志、监控、锁）。

### H.3 高级题

**Q**: 为什么单例模式在 Python 中常被批评？应如何替代？

**A**:

**批评**：

1. 隐藏依赖，测试困难。
2. 全局状态，并发复杂。
3. 违反单一职责原则。
4. 难以 Mock 与替换。

**替代**：

1. 模块级变量（最简单）。
2. 依赖注入框架（`injector`、`python-dependency-injector`）。
3. `contextvars` 管理请求级状态。
4. `functools.cache` 实现惰性单例。
5. 工厂模式 + 配置对象。

### H.4 场景题

**Q**: 在 FastAPI 应用中，如何实现配置单例？

**A**:

```python
from fastapi import FastAPI, Depends
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    app_name: str = "MyApp"
    database_url: str = "sqlite:///app.db"


@lru_cache
def get_settings() -> Settings:
    return Settings()


app = FastAPI()


@app.get("/")
async def root(settings: Settings = Depends(get_settings)):
    return {"app": settings.app_name}
```

**要点**：

- 使用 `@lru_cache` 实现惰性单例。
- 通过 `Depends` 注入，支持测试时 Mock。
- 类型注解提供编译时检查。

## 附录 I：设计模式关联

### I.1 单例与工厂模式

```python
class DatabaseFactory:
    """工厂模式 + 单例：每类数据库一个实例"""
    _instances = {}

    @classmethod
    def get_database(cls, db_type: str):
        if db_type not in cls._instances:
            if db_type == "mysql":
                cls._instances[db_type] = MySQLDatabase()
            elif db_type == "postgres":
                cls._instances[db_type] = PostgresDatabase()
            else:
                raise ValueError(f"未知数据库类型: {db_type}")
        return cls._instances[db_type]
```

### I.2 单例与观察者模式

```python
class EventBusMeta(type):
    """单例事件总线：全局事件分发"""
    _instances = {}

    def __call__(cls, *args, **kwargs):
        if cls not in cls._instances:
            cls._instances[cls] = super().__call__(*args, **kwargs)
        return cls._instances[cls]


class EventBus(metaclass=EventBusMeta):
    def __init__(self):
        self._subscribers = {}

    def subscribe(self, event_type, callback):
        self._subscribers.setdefault(event_type, []).append(callback)

    def publish(self, event_type, data):
        for callback in self._subscribers.get(event_type, []):
            callback(data)
```

### I.3 单例与策略模式

```python
class StrategyRegistry:
    """策略注册表：每策略一个实例"""
    _strategies = {}

    @classmethod
    def register(cls, name):
        def decorator(strategy_cls):
            cls._strategies[name] = strategy_cls()
            return strategy_cls
        return decorator

    @classmethod
    def get(cls, name):
        return cls._strategies.get(name)


@StrategyRegistry.register("sort_asc")
class AscSortStrategy:
    def sort(self, data):
        return sorted(data)


@StrategyRegistry.register("sort_desc")
class DescSortStrategy:
    def sort(self, data):
        return sorted(data, reverse=True)
```

## 附录 J：函数式编程视角

### J.1 单例与副作用

单例本质上是全局可变状态，与函数式编程的"纯函数"理念冲突。函数式风格推荐：

```python
from functools import lru_cache
from dataclasses import dataclass


@dataclass(frozen=True)
class Config:
    """不可变配置"""
    debug: bool = False
    host: str = "localhost"


@lru_cache
def load_config(env: str = "default") -> Config:
    """纯函数式单例：相同输入返回相同输出"""
    if env == "prod":
        return Config(debug=False, host="api.example.com")
    return Config(debug=True, host="localhost")


# 使用
config = load_config("prod")
# config 是不可变对象，无副作用
```

### J.2 Reader Monad 风格

```python
from typing import Callable, TypeVar, Generic

A = TypeVar("A")
B = TypeVar("B")


class Reader(Generic[A, B]):
    """Reader Monad：依赖注入的函数式实现"""
    def __init__(self, run: Callable[[A], B]):
        self.run = run

    def map(self, f: Callable[[B], B]) -> "Reader[A, B]":
        return Reader(lambda env: f(self.run(env)))

    def bind(self, f: Callable[[B], "Reader[A, B]"]) -> "Reader[A, B]":
        return Reader(lambda env: f(self.run(env)).run(env))


# 配置作为环境
config = {"debug": True, "host": "localhost"}


# 依赖配置的函数
def get_host() -> Reader[dict, str]:
    return Reader(lambda env: env["host"])


def format_url(host: str) -> Reader[dict, str]:
    return Reader(lambda env: f"http://{host}:{env.get('port', 80)}")


# 组合
program = get_host().bind(format_url)
print(program.run(config))  # http://localhost:80
```

## 附录 K：并发与异步单例

### K.1 asyncio 单例

```python
import asyncio
from typing import Any, Dict, Type


class AsyncSingletonMeta(type):
    """异步安全单例元类"""
    _instances: Dict[type, Any] = {}
    _locks: Dict[type, asyncio.Lock] = {}

    def __call__(cls, *args, **kwargs):
        if cls not in cls._instances:
            cls._instances[cls] = super().__call__(*args, **kwargs)
        return cls._instances[cls]

    async def aget_instance(cls, *args, **kwargs):
        """异步获取单例实例"""
        if cls not in cls._instances:
            if cls not in cls._locks:
                cls._locks[cls] = asyncio.Lock()
            async with cls._locks[cls]:
                if cls not in cls._instances:
                    cls._instances[cls] = super().__call__(*args, **kwargs)
        return cls._instances[cls]


class AsyncDatabase(metaclass=AsyncSingletonMeta):
    def __init__(self):
        self.connection = None

    async def connect(self):
        await asyncio.sleep(0.1)  # 模拟异步连接
        self.connection = "connected"


async def main():
    db1 = await AsyncDatabase.aget_instance()
    db2 = await AsyncDatabase.aget_instance()
    print(db1 is db2)  # True


asyncio.run(main())
```

### K.2 多进程单例

```python
from multiprocessing import Manager, Lock


class ProcessSafeSingleton:
    """多进程安全单例：使用 Manager 共享状态"""
    _manager = None
    _instances = None
    _lock = None

    @classmethod
    def _init_shared(cls):
        if cls._manager is None:
            cls._manager = Manager()
            cls._instances = cls._manager.dict()
            cls._lock = cls._manager.Lock()

    def __new__(cls, *args, **kwargs):
        cls._init_shared()
        with cls._lock:
            if cls.__name__ not in cls._instances:
                instance = super().__new__(cls)
                cls._instances[cls.__name__] = instance
            return cls._instances[cls.__name__]
```

## 附录 L：哲学反思

### L.1 单例与"显式优于隐式"

Python 之禅（PEP 20）："Explicit is better than implicit." 单例模式隐藏了依赖关系，违反了这一原则。模块级变量更显式，依赖关系清晰可见。

### L.2 单例与"简单胜于复杂"

"There should be one—and preferably only one—obvious way to do it." Python 提供了多种单例实现方式，但"明显的方式"应是模块级变量，而非复杂的元类。

### L.3 单例与"可变性"

"Although practicality beats purity." 单例在工程实践中确实有用，但应谨慎使用。过度追求"纯函数式"而完全禁止单例也是教条主义。

### L.4 单例的"必要之恶"

在以下场景中，单例是"必要之恶"：

- 框架基础设施（ORM、连接池）。
- C 扩展桥接（OpenCV、CUDA）。
- 遗留系统集成（Java/C++ 互操作）。
- 资源配额管理（文件句柄、GPU 内存）。

关键在于：**理解单例的成本，在收益超过成本时使用，并提供充分的测试与隔离机制。**

---

### 更新日志（Changelog）

- 2026-07-21：完整重写至金标准教学水准，新增 12 项结构化内容，覆盖元类单例、线程安全、Monostate、环境隔离、可观测单例与企业级案例研究，新增约 2400 行。
- 2026-06-14：初版，基础元类与单例模式介绍。
