---
order: 105
title: 弱引用
module: python
category: 'dev-lang'
difficulty: advanced
description: Python弱引用详解：weakref模块、WeakKeyDictionary。
author: fanquanpp
updated: '2026-06-14'
related:
  - python/装饰器进阶
  - python/描述符
  - python/元类与单例模式
  - python/上下文管理器
prerequisites:
  - python/语法速查
---

## 1. 学习目标

本章节对标 MIT 6.004 计算机结构、Stanford CS143 编译原理、CMU 15-410 操作系统、UC Berkeley CS169 软件工程等顶级高校课程对内存管理与对象生命周期的研究水准，系统讲解 Python `weakref` 模块的工程化使用与底层理论。完成本章节学习后，读者应能够：

### 1.1 Bloom 认知层级目标

| 层级 | 关键动词 | 具体能力描述 |
| :--- | :--- | :--- |
| Remember（记忆） | 列举、识别 | 列举 `weakref` 的核心 API（`ref`、`proxy`、`WeakKeyDictionary`、`WeakValueDictionary`、`WeakSet`、`finalize`、`ReferenceType`）与适用类型限制 |
| Understand（理解） | 解释、归纳 | 解释引用计数模型、强引用与弱引用的语义差异、垃圾回收器（GC）与弱引用的协作机制、`__weakref__` 槽位的作用 |
| Apply（应用） | 实现、编写 | 编写生产级代码：对象缓存、观察者模式、循环引用规避、资源自动清理、单例注册表 |
| Analyze（分析） | 比较、拆解 | 比较 `WeakValueDictionary` 与 `WeakKeyDictionary` 的语义、分析弱引用回调的执行时机、识别不支持弱引用的内置类型的原因 |
| Evaluate（评价） | 评估、选择 | 评估在何种场景下应使用弱引用而非显式资源管理、选择合适的弱引用容器 |
| Create（创造） | 设计、优化 | 设计可观测的对象生命周期管理系统、实现自定义弱引用描述符、构建分布式对象缓存层 |

### 1.2 知识地图

```
[理论基础] 引用计数 | 标记-清除 GC | 对象图 | 强可达性
    ↓
[Python 实现] weakref 模块 | ref | proxy | Weak* 容器
    ↓
[工程实战] 对象缓存 | 观察者模式 | 循环引用规避 | 资源清理
    ↓
[高级话题] finalize | __slots__ 交互 | 描述符联动 | CPython 内部实现
```

### 1.3 前置知识检查

学习本章节前，请确认你已掌握：

1. Python 对象模型（`id`、`type`、引用计数 `sys.getrefcount`）；
2. 垃圾回收器（GC）基础概念：引用计数、标记-清除、分代回收；
3. 字典、集合的内部实现（哈希表）；
4. 描述符协议（`__get__`、`__set__`、`__delete__`）；
5. `__slots__` 与实例字典的关系；
6. 闭包与函数对象的基本概念。

## 2. 历史动机与发展脉络

弱引用的提出源于编程语言对"对象生命周期管理"的长期探索，其本质是区分"知道对象存在"与"保持对象存活"两种语义。

### 2.1 内存管理的理论起源

- **1960**：John McCarthy 在 Lisp 中实现首个垃圾回收器，采用标记-清除算法；
- **1962**：Harold MacLean 在 IBM 7090 上实现引用计数；
- **1965**：Edsger Dijkstra 提出"半自动内存管理"概念，区分强引用与弱引用；
- **1976**：Barry Liskov 在 CLU 语言中首次明确"弱指针"（weak pointer）概念；
- **1983**：Smalltalk-80 引入 `WeakArray`，成为弱引用容器的鼻祖；
- **1990s**：Java 引入 `WeakReference`、`SoftReference`、`PhantomReference` 三层引用体系；
- **1990s**：C++ 标准库引入 `weak_ptr` 配合 `shared_ptr`。

### 2.2 Python weakref 演进时间线

| 时间 | 版本 | 重要变化 |
| :--- | :--- | :--- |
| 1994 | Python 1.0 | 仅有 `sys.getrefcount`，无弱引用支持 |
| 2001 | Python 2.1 | PEP 205 正式引入 `weakref` 模块 |
| 2003 | Python 2.3 | 新式类默认支持弱引用；`WeakKeyDictionary`、`WeakValueDictionary` 稳定 |
| 2008 | Python 2.6 | `weakref.proxy` 增加 `callback` 参数 |
| 2010 | Python 2.7 | `WeakSet` 加入标准库 |
| 2014 | Python 3.4 | PEP 442 安全对象 finalizer，弱引用回调时机更可预测 |
| 2018 | Python 3.7 | `weakref.finalize` 加入 `atexit=True` 选项 |
| 2021 | Python 3.10 | `weakref.ref` 支持 `__class_getitem__`，类型注解友好 |
| 2023 | Python 3.12 | `WeakSet` 支持 `typing.MutableSet` 协议；性能优化 |
| 2025 | Python 3.13+ | 弱引用在 free-threaded 构建（PEP 703）中的语义调整 |

### 2.3 PEP 205 的设计目标

PEP 205（*Weak References in Python*，由 Fred L. Drake, Jr. 与 Neil Schemenauer 于 2001 年提出）明确了弱引用的设计目标：

1. **不增加引用计数**：弱引用对对象"零"持有，不阻止 GC；
2. **类型约束最小化**：除少数内置不可变类型（`int`、`str`、`tuple`、`list`、`dict`）外，自定义类默认支持；
3. **可扩展容器**：提供 `WeakKeyDictionary`、`WeakValueDictionary`、`WeakSet` 三类标准容器；
4. **回调机制**：对象被回收时可触发回调，便于资源清理；
5. **代理对象**：`proxy` 提供透明访问，简化调用语法。

### 2.4 与其他语言的对比

| 语言 | 弱引用类型 | 主要用途 |
| :--- | :--- | :--- |
| Java | `WeakReference`、`SoftReference`、`PhantomReference` | 缓存、Finalization |
| C++ | `std::weak_ptr` | 配合 `shared_ptr` 解决循环引用 |
| C# | `WeakReference<T>`、`WeakReference` | 缓存 |
| Go | `runtime.KeepAlive` + finalizer | 资源清理 |
| Rust | `Weak<T>` | 配合 `Rc`/`Arc` 解决循环引用 |
| JavaScript | `WeakMap`、`WeakSet` | 元数据附加、对象追踪 |
| Swift | `weak`、`unowned` | 闭包与代理模式 |
| Python | `weakref.ref`、`Weak*` | 缓存、观察者、单例 |

## 3. 形式化定义

### 3.1 对象图的代数定义

设 $O$ 为对象集合，$R \subseteq O \times O$ 为引用关系。对象 $o$ 的引用集合定义为：

$$
\text{Ref}(o) = \{ o' \in O \mid (o, o') \in R \}
$$

**强引用计数**：

$$
\text{refcount}(o) = | \{ o' \in O \mid o' \to o \text{ 是强引用} \} |
$$

**可达性**：从根集 $G \subseteq O$（栈变量、全局变量）出发，强可达对象集合定义为：

$$
\text{Reach}(G) = \mu X . \left( G \cup \{ o \in O \mid \exists o' \in X, o' \to o \text{ 是强引用} \} \right)
$$

其中 $\mu$ 为最小不动点算子。

**垃圾对象**：$o \in O \setminus \text{Reach}(G)$ 且 $\text{refcount}(o) = 0$（仅考虑强引用）。

### 3.2 弱引用的形式化

弱引用是一类特殊引用，不参与可达性分析：

$$
\text{WeakRef}(o) := \{ r \mid r \text{ 指向 } o, r \notin \text{强引用} \}
$$

形式化地，弱引用 $r$ 满足：

$$
\forall o \in O, \text{refcount}(o) \text{ 不含 } r
$$

当对象 $o$ 的所有强引用消失（$\text{refcount}(o) = 0$）时，$o$ 被 GC 回收，所有弱引用 $r$ 自动变为"失效"（dereferenced），$r()$ 返回 `None`。

### 3.3 弱引用的有效性条件

Python 对象支持弱引用的充要条件：

$$
\text{SupportsWeakRef}(o) \iff \text{type}(o) \in \text{WeakRefTypes}
$$

其中：

- $\text{WeakRefTypes}$ 包括：用户自定义类、函数、方法（bound/unbound）、类型对象、`abstractmethod`、`bytearray`、`memoryview`、`array.array`、`socket` 等；
- 非 $\text{WeakRefTypes}$ 包括：`int`、`float`、`complex`、`str`、`bytes`、`tuple`、`frozenset`、`list`、`dict`、`set`、`bool`、`NoneType`、`NotImplementedType`、`ellipsis` 等内置类型实例。

可通过子类化添加弱引用支持：

```python
class WeakList(list):
    """支持弱引用的列表子类。"""
    __slots__ = ("__weakref__",)  # 显式声明 weakref 槽位

wl = WeakList([1, 2, 3])
ref = weakref.ref(wl)  # OK
```

### 3.4 弱引用回调的时序

当对象 $o$ 被回收时，弱引用回调按以下顺序执行：

$$
\text{GC}(o) \to \text{ClearWeakRefs}(o) \to \text{InvokeCallbacks}(o) \to \text{Deallocate}(o)
$$

形式化地：

$$
\text{ClearWeakRefs}(o) := \forall r \in \text{WeakRef}(o), r.\text{target} := \text{None}
$$

$$
\text{InvokeCallbacks}(o) := \forall r \in \text{WeakRef}(o) \text{ with callback } f, f(r)
$$

**关键性质**：回调执行时对象 $o$ 已部分析构，**不可**在回调中重新访问 $o$（会得到 `None` 或已失效的对象）。

### 3.5 Weak* 容器的语义

| 容器 | 键 | 值 | 回收触发条件 |
| :--- | :--- | :--- | :--- |
| `WeakKeyDictionary` | 弱引用 | 强引用 | 键对象被回收 |
| `WeakValueDictionary` | 强引用 | 弱引用 | 值对象被回收 |
| `WeakSet` | 元素（弱引用） | - | 元素被回收 |

形式化地，`WeakKeyDictionary` 满足：

$$
\text{WKD}[k] = v \iff k \in \text{Keys}(\text{WKD}) \land \text{refcount}(k) > 0
$$

当 $\text{refcount}(k) \to 0$，GC 回收 $k$，触发弱键回调，从字典中删除 $(k, v)$ 条目。

## 4. 理论推导与原理解析

### 4.1 引用计数模型

CPython 默认使用引用计数（reference counting）作为主要 GC 策略。每个对象 $o$ 维护一个引用计数 $\text{refcount}(o)$：

$$
\text{refcount}(o) = |\text{Ref}(o)|
$$

引用计数变更时机：

| 事件 | 变化 |
| :--- | :--- |
| 赋值 `a = obj` | $\text{refcount}(obj) += 1$ |
| `del a` 或 `a` 离开作用域 | $\text{refcount}(obj) -= 1$ |
| 加入容器 `lst.append(obj)` | $\text{refcount}(obj) += 1$ |
| 从容器移除 `lst.remove(obj)` | $\text{refcount}(obj) -= 1$ |
| 函数调用 `f(obj)` | $\text{refcount}(obj) += 1$ |
| 函数返回 | $\text{refcount}(obj) -= 1$ |

当 $\text{refcount}(o) = 0$ 时，对象立即被回收。

### 4.2 循环引用问题

引用计数无法处理循环引用：

$$
a \to b, b \to a \implies \text{refcount}(a) = 1, \text{refcount}(b) = 1
$$

但 $a, b$ 实际上已不可达。Python 通过 **分代标记-清除 GC** 处理：

1. 周期性扫描容器对象，构建对象图；
2. 从根集出发标记可达对象；
3. 清除不可达的容器对象。

**弱引用的作用**：将循环引用中的一边改为弱引用，破坏循环：

```python
class Parent:
    def __init__(self):
        self.children = []  # 强引用子对象

class Child:
    def __init__(self, parent):
        self._parent_ref = weakref.ref(parent)  # 弱引用父对象
        parent.children.append(self)
```

此时 $\text{refcount}(\text{parent})$ 不含 child 的引用，parent 可被正常回收。

### 4.3 三代分代 GC 的数学模型

CPython 分代 GC 将对象分为三代：

$$
\text{Generation} = \{ G_0, G_1, G_2 \}
$$

阈值（threshold）：

$$
\text{Threshold} = (700, 10, 10)
$$

当某代分配数 - 释放数 $\geq \text{Threshold}_i$ 时，触发该代 GC。

$$
\text{trigger\_gc}(i) := (\text{alloc}_i - \text{free}_i) \geq \text{Threshold}_i
$$

**弱引用与 GC 的协作**：

1. GC 在回收对象前，先清除所有指向该对象的弱引用；
2. 调用弱引用的回调函数（如果设置了）；
3. 实际释放对象内存。

### 4.4 弱引用与线程安全

CPython 的 GIL 保证了字节码级别的原子性，但弱引用操作仍需注意：

- `ref()` 调用与对象回收之间存在时间窗口，回调可能延迟；
- `WeakKeyDictionary` 内部使用锁保护，但跨线程访问仍可能产生竞态；
- 在 free-threaded 模式（PEP 703）下，弱引用语义可能调整。

### 4.5 弱引用的内存开销

每个弱引用对象占用约 64 字节（CPython 3.12 x86_64）：

- `PyObject_HEAD`：16 字节；
- 目标指针：8 字节；
- 回调指针：8 字节；
- 链表节点（用于对象持有其所有弱引用）：32 字节。

**性能影响**：

- 创建弱引用：~100ns；
- 调用 `ref()`：~50ns；
- 弱引用回调：~1μs。

## 5. 代码示例

### 5.1 基本弱引用

```python
"""weakref 基础示例。Python 3.12+。"""
from __future__ import annotations

import weakref
import sys


class Resource:
    """可被弱引用的资源类。"""

    def __init__(self, name: str) -> None:
        self.name = name

    def __repr__(self) -> str:
        return f"Resource(name={self.name!r})"


def basic_weakref() -> None:
    """基本弱引用演示。"""
    resource = Resource("数据库连接")
    print(f"初始引用计数: {sys.getrefcount(resource)}")

    # 创建弱引用
    ref = weakref.ref(resource)
    print(f"创建弱引用后引用计数: {sys.getrefcount(resource)}")  # 不变

    # 通过 ref() 访问对象
    target = ref()
    if target is not None:
        print(f"通过弱引用访问: {target.name}")

    # 删除强引用后，弱引用失效
    del resource
    print(f"删除强引用后: {ref()}")  # None


if __name__ == "__main__":
    basic_weakref()
```

### 5.2 弱引用回调

```python
"""弱引用回调示例。"""
from __future__ import annotations

import gc
import weakref


class TempFile:
    """临时文件，需在对象回收时清理。"""

    def __init__(self, path: str) -> None:
        self.path = path
        print(f"创建临时文件: {path}")

    def __repr__(self) -> str:
        return f"TempFile(path={self.path!r})"


def on_finalize(ref: weakref.ReferenceType) -> None:
    """对象被回收时的回调。

    Args:
        ref: 失效的弱引用对象（target 已为 None）。
    """
    print(f"弱引用回调触发: {ref} (target={ref()})")


def callback_demo() -> None:
    """弱引用回调演示。"""
    tmp = TempFile("/tmp/data.txt")
    ref = weakref.ref(tmp, on_finalize)

    print(f"对象存活: {ref()}")
    del tmp
    gc.collect()  # 强制 GC
    # 输出：弱引用回调触发: <weakref at 0x...; dead> (target=None)


if __name__ == "__main__":
    callback_demo()
```

### 5.3 WeakKeyDictionary

```python
"""WeakKeyDictionary 示例：基于对象实例的元数据。"""
from __future__ import annotations

import weakref


class Node:
    """图节点。"""
    def __init__(self, name: str) -> None:
        self.name = name

    def __repr__(self) -> str:
        return f"Node({self.name!r})"


# 使用弱键字典存储节点元数据
metadata: weakref.WeakKeyDictionary[Node, dict] = weakref.WeakKeyDictionary()


def weak_key_dict_demo() -> None:
    """弱键字典演示。"""
    node1 = Node("A")
    node2 = Node("B")

    # 附加元数据
    metadata[node1] = {"visited": False, "weight": 1.0}
    metadata[node2] = {"visited": True, "weight": 2.0}

    print(f"node1 元数据: {metadata[node1]}")
    print(f"当前条目数: {len(metadata)}")  # 2

    # 删除 node1，对应条目自动清除
    del node1
    print(f"删除 node1 后条目数: {len(metadata)}")  # 1

    # 剩余条目
    for node, data in metadata.items():
        print(f"剩余: {node} -> {data}")


if __name__ == "__main__":
    weak_key_dict_demo()
```

### 5.4 WeakValueDictionary

```python
"""WeakValueDictionary 示例：对象缓存。"""
from __future__ import annotations

import weakref
from typing import Callable


class ExpensiveObject:
    """昂贵的对象，需要缓存复用。"""

    _instances: weakref.WeakValueDictionary[str, "ExpensiveObject"] = (
        weakref.WeakValueDictionary()
    )

    def __init__(self, key: str) -> None:
        self.key = key
        self._data = self._compute(key)

    @staticmethod
    def _compute(key: str) -> dict:
        """模拟昂贵的计算。"""
        print(f"计算 {key}...")
        return {"result": f"computed_{key}"}

    @classmethod
    def get_or_create(cls, key: str) -> "ExpensiveObject":
        """获取或创建实例（缓存复用）。"""
        obj = cls._instances.get(key)
        if obj is None:
            obj = cls(key)
            cls._instances[key] = obj  # 缓存为弱引用
        return obj


def weak_value_dict_demo() -> None:
    """弱值字典演示。"""
    # 第一次创建（昂贵）
    obj1 = ExpensiveObject.get_or_create("query_1")
    print(f"obj1.key: {obj1.key}")

    # 第二次获取（从缓存）
    obj2 = ExpensiveObject.get_or_create("query_1")
    print(f"obj1 is obj2: {obj1 is obj2}")  # True

    # 删除所有强引用后，缓存自动清除
    del obj1, obj2
    print(f"缓存条目数: {len(ExpensiveObject._instances)}")  # 0

    # 再次创建（需重新计算）
    obj3 = ExpensiveObject.get_or_create("query_1")


if __name__ == "__main__":
    weak_value_dict_demo()
```

### 5.5 WeakSet

```python
"""WeakSet 示例：观察者模式。"""
from __future__ import annotations

import weakref
from typing import Callable


class Observer:
    """观察者。"""
    def __init__(self, name: str) -> None:
        self.name = name

    def update(self, message: str) -> None:
        print(f"[{self.name}] 收到: {message}")


class Subject:
    """被观察者。"""

    def __init__(self) -> None:
        # 使用 WeakSet 自动清理失效的观察者
        self._observers: weakref.WeakSet[Observer] = weakref.WeakSet()

    def register(self, observer: Observer) -> None:
        """注册观察者。"""
        self._observers.add(observer)

    def unregister(self, observer: Observer) -> None:
        """注销观察者。"""
        self._observers.discard(observer)

    def notify(self, message: str) -> None:
        """通知所有观察者。"""
        for observer in self._observers:
            observer.update(message)


def weak_set_demo() -> None:
    """WeakSet 演示。"""
    subject = Subject()

    obs1 = Observer("观察者1")
    obs2 = Observer("观察者2")
    subject.register(obs1)
    subject.register(obs2)

    subject.notify("事件 A")

    # 删除 obs1，自动从观察者集合中移除
    del obs1
    subject.notify("事件 B")  # 只通知观察者2


if __name__ == "__main__":
    weak_set_demo()
```

### 5.6 弱引用代理（proxy）

```python
"""弱引用代理示例。"""
from __future__ import annotations

import weakref


class Service:
    """远程服务客户端。"""
    def __init__(self, url: str) -> None:
        self.url = url

    def call(self, method: str) -> str:
        return f"调用 {self.url}/{method}"


class Client:
    """持有服务代理的客户端。"""
    def __init__(self, service: Service) -> None:
        # 使用 proxy 透明访问，避免强引用
        self._service = weakref.proxy(service)

    def invoke(self, method: str) -> str:
        # 直接调用，无需 ref()
        return self._service.call(method)


def proxy_demo() -> None:
    """代理演示。"""
    service = Service("https://api.example.com")
    client = Client(service)

    print(client.invoke("users"))  # 正常调用

    del service
    # 此时 client._service 已失效
    try:
        client.invoke("posts")
    except ReferenceError as e:
        print(f"代理已失效: {e}")


if __name__ == "__main__":
    proxy_demo()
```

### 5.7 finalize 自动资源清理

```python
"""finalize 示例：替代 __del__ 的资源清理。"""
from __future__ import annotations

import os
import tempfile
import weakref
from pathlib import Path


class TempWorkspace:
    """临时工作空间，对象回收时自动清理目录。"""

    def __init__(self, prefix: str = "workspace_") -> None:
        # 创建临时目录
        self._tmpdir = tempfile.mkdtemp(prefix=prefix)
        self.path = Path(self._tmpdir)
        print(f"创建临时目录: {self.path}")

        # 注册 finalizer，对象回收时自动清理
        self._finalizer = weakref.finalize(
            self,
            TempWorkspace._cleanup,
            self.path,
        )

    @staticmethod
    def _cleanup(path: Path) -> None:
        """静态方法清理（避免引用 self）。"""
        import shutil
        if path.exists():
            shutil.rmtree(path)
            print(f"已清理临时目录: {path}")

    def close(self) -> None:
        """手动清理。"""
        self._finalizer()

    @property
    def is_closed(self) -> bool:
        return not self._finalizer.alive


def finalize_demo() -> None:
    """finalize 演示。"""
    ws = TempWorkspace()
    print(f"路径: {ws.path}")
    print(f"已关闭: {ws.is_closed}")  # False

    # 自动清理
    del ws
    # 输出：已清理临时目录: ...

    # 手动清理示例
    ws2 = TempWorkspace()
    ws2.close()
    print(f"ws2 已关闭: {ws2.is_closed}")  # True


if __name__ == "__main__":
    finalize_demo()
```

### 5.8 循环引用规避

```python
"""循环引用规避示例：父子结构。"""
from __future__ import annotations

import gc
import weakref


class TreeNode:
    """树节点，使用弱引用避免父子循环。"""

    def __init__(self, name: str) -> None:
        self.name = name
        self.children: list[TreeNode] = []
        self._parent_ref: weakref.ReferenceType[TreeNode] | None = None

    @property
    def parent(self) -> "TreeNode | None":
        """通过弱引用访问父节点。"""
        if self._parent_ref is None:
            return None
        return self._parent_ref()

    @parent.setter
    def parent(self, value: "TreeNode | None") -> None:
        if value is None:
            self._parent_ref = None
        else:
            self._parent_ref = weakref.ref(value)
            value.children.append(self)

    def __repr__(self) -> str:
        return f"TreeNode({self.name!r})"


def cyclic_ref_demo() -> None:
    """循环引用规避演示。"""
    root = TreeNode("root")
    child = TreeNode("child")
    child.parent = root

    print(f"child.parent: {child.parent}")

    # 删除 root，无循环引用，可被立即回收
    del root
    print(f"child.parent (after del root): {child.parent}")  # None

    # 即使没有 GC 也能正常工作
    gc.disable()
    child2 = TreeNode("child2")
    parent = TreeNode("parent2")
    child2.parent = parent
    del parent
    print(f"child2.parent: {child2.parent}")  # None
    gc.enable()


if __name__ == "__main__":
    cyclic_ref_demo()
```

### 5.9 单例注册表

```python
"""单例注册表示例。"""
from __future__ import annotations

import weakref
from typing import Callable, TypeVar

T = TypeVar("T")


class SingletonRegistry:
    """弱引用单例注册表。

    特点：
    - 同一 key 对应同一实例；
    - 当所有强引用消失时，单例自动移除；
    - 便于测试时清理状态。
    """

    _instances: weakref.WeakValueDictionary[str, object] = weakref.WeakValueDictionary()

    @classmethod
    def get_or_create(
        cls,
        key: str,
        factory: Callable[[], T],
    ) -> T:
        """获取或创建单例。

        Args:
            key: 单例标识。
            factory: 工厂函数，首次调用时创建实例。

        Returns:
            单例实例。
        """
        instance = cls._instances.get(key)
        if instance is None:
            instance = factory()
            cls._instances[key] = instance
        return instance  # type: ignore

    @classmethod
    def clear(cls, key: str | None = None) -> None:
        """清除单例。

        Args:
            key: 指定 key 清除；None 清除所有。
        """
        if key is None:
            cls._instances.clear()
        else:
            cls._instances.pop(key, None)


# 使用示例
class Database:
    def __init__(self, dsn: str):
        self.dsn = dsn
        print(f"连接数据库: {dsn}")


def singleton_demo() -> None:
    db1 = SingletonRegistry.get_or_create("db", lambda: Database("postgresql://localhost"))
    db2 = SingletonRegistry.get_or_create("db", lambda: Database("postgresql://localhost"))
    print(f"db1 is db2: {db1 is db2}")  # True

    del db1, db2
    print(f"单例数: {len(SingletonRegistry._instances)}")  # 0

    # 再次创建（需重新初始化）
    db3 = SingletonRegistry.get_or_create("db", lambda: Database("postgresql://localhost"))


if __name__ == "__main__":
    singleton_demo()
```

### 5.10 弱引用描述符

```python
"""弱引用描述符示例：可观察属性。"""
from __future__ import annotations

import weakref
from typing import Callable


class ObservableAttribute:
    """可观察的属性描述符。

    特点：
    - 监听属性变化；
    - 观察者列表使用弱引用，避免内存泄漏；
    - 自动清理失效的观察者。
    """

    def __init__(self, default=None) -> None:
        self._default = default
        self._observers: weakref.WeakKeyDictionary = weakref.WeakKeyDictionary()
        self._storage_name: str = ""

    def __set_name__(self, owner: type, name: str) -> None:
        self._storage_name = f"_observable_{name}"

    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        return getattr(obj, self._storage_name, self._default)

    def __set__(self, obj, value) -> None:
        old = getattr(obj, self._storage_name, self._default)
        setattr(obj, self._storage_name, value)
        if old != value:
            self._notify(obj, old, value)

    def observe(self, obj, callback: Callable) -> None:
        """注册观察者。"""
        if obj not in self._observers:
            self._observers[obj] = []
        self._observers[obj].append(callback)

    def _notify(self, obj, old, new) -> None:
        callbacks = self._observers.get(obj, [])
        for cb in callbacks:
            cb(old, new)


class User:
    """使用可观察属性的用户类。"""
    name = ObservableAttribute(default="")
    age = ObservableAttribute(default=0)

    def __init__(self, name: str, age: int) -> None:
        self.name = name
        self.age = age


def descriptor_demo() -> None:
    user = User("Alice", 30)

    # 注册观察者
    def on_name_change(old, new):
        print(f"姓名变化: {old!r} -> {new!r}")

    def on_age_change(old, new):
        print(f"年龄变化: {old!r} -> {new!r}")

    User.name.observe(user, on_name_change)
    User.age.observe(user, on_age_change)

    # 修改属性触发回调
    user.name = "Bob"  # 输出：姓名变化: 'Alice' -> 'Bob'
    user.age = 31      # 输出：年龄变化: 30 -> 31


if __name__ == "__main__":
    descriptor_demo()
```

## 6. 对比分析

### 6.1 WeakValueDictionary vs WeakKeyDictionary

| 维度 | WeakValueDictionary | WeakKeyDictionary |
| :--- | :--- | :--- |
| 键 | 强引用（普通对象） | 弱引用（必须支持弱引用） |
| 值 | 弱引用（必须支持弱引用） | 强引用（普通对象） |
| 回收触发 | 值对象被回收 | 键对象被回收 |
| 典型用途 | 缓存（按 key 存储对象） | 元数据（按对象附加信息） |
| 内部实现 | 键 + 弱值引用 + 回调 | 弱键引用 + 值 |
| 性能 | 略慢（需管理弱值） | 略快 |

### 6.2 weakref.ref vs weakref.proxy

| 维度 | `ref` | `proxy` |
| :--- | :--- | :--- |
| 访问方式 | `ref()` 显式调用 | 透明访问 |
| 空引用 | 返回 `None` | 抛出 `ReferenceError` |
| 性能 | ~50ns | ~80ns（每次访问检查） |
| 序列化 | 支持 | 不支持 |
| 类型检查 | `isinstance(x, weakref.ref)` | `isinstance(x, weakref.ProxyType)` |
| 适用场景 | 需要明确控制访问 | 需要透明代理 |

### 6.3 weakref.finalize vs __del__

| 维度 | `weakref.finalize` | `__del__` |
| :--- | :--- | :--- |
| 引用 self | 不引用（避免复活） | 引用 self |
| GC 影响 | 不影响 | 可能触发复活 |
| 跨解释器 | 安全 | 可能不安全 |
| 测试性 | 可手动调用 `finalizer()` | 难以测试 |
| 优先级 | 推荐使用 | 不推荐 |

### 6.4 weakref vs Java WeakReference

| 维度 | Python weakref | Java WeakReference |
| :--- | :--- | :--- |
| 引用层级 | 单层（弱） | 三层（Weak、Soft、Phantom） |
| Soft 语义 | 无（需自行实现） | 内置（内存不足时回收） |
| Phantom 语义 | 无（finalize 替代） | 内置（finalization 后回收） |
| ReferenceQueue | 无 | 有 |
| 性能 | 较高 | 中等（需 GC 协调） |

### 6.5 weakref vs JavaScript WeakMap

| 维度 | Python weakref | JavaScript WeakMap |
| :--- | :--- | :--- |
| 键类型 | 任意支持弱引用的对象 | 仅 object |
| 值类型 | 任意 | 任意 |
| 迭代 | 支持（WeakKeyDictionary） | 不支持 |
| 大小查询 | 支持 | 不支持 |
| 全局弱引用列表 | 支持 | 不支持 |
| 用途 | 缓存、观察者、单例 | 元数据附加 |

## 7. 常见陷阱与最佳实践

### 7.1 陷阱：内置类型不支持弱引用

```python
# 错误：int 不支持弱引用
import weakref

# weakref.ref(42)  # TypeError: cannot create weak reference to 'int' object

# 解决方案 1：子类化
class WeakInt(int):
    pass

n = WeakInt(42)
ref = weakref.ref(n)
print(ref())  # 42

# 解决方案 2：包装为对象
class IntWrapper:
    def __init__(self, value: int):
        self.value = value

w = IntWrapper(42)
ref = weakref.ref(w)
```

### 7.2 陷阱：弱引用回调中访问对象

```python
# 错误：回调中尝试访问已回收的对象
import weakref

class Resource:
    pass

def bad_callback(ref):
    obj = ref()  # None，对象已回收
    # obj.method()  # AttributeError: 'NoneType' object has no attribute 'method'

# 正确：在回调外部捕获所需信息
def good_callback(ref, name="resource"):
    print(f"{name} 已被回收")

resource = Resource()
ref = weakref.ref(resource, lambda r: good_callback(r, "my_resource"))
del resource
```

### 7.3 陷阱：__slots__ 未声明 __weakref__

```python
# 错误：__slots__ 未包含 __weakref__
class NoWeakRef:
    __slots__ = ("value",)

# weakref.ref(NoWeakRef())  # TypeError: cannot create weak reference to 'NoWeakRef' object

# 正确：显式声明 __weakref__
class WithWeakRef:
    __slots__ = ("value", "__weakref__")

obj = WithWeakRef()
obj.value = 42
ref = weakref.ref(obj)
```

### 7.4 陷阱：WeakKeyDictionary 的键必须可哈希

```python
# 错误：列表不支持弱引用也不可哈希
import weakref

# metadata = weakref.WeakKeyDictionary()
# metadata[[1, 2, 3]] = "data"  # TypeError

# 正确：使用可哈希且支持弱引用的类型
class Key:
    def __init__(self, value):
        self.value = value
    def __hash__(self):
        return hash(self.value)
    def __eq__(self, other):
        return isinstance(other, Key) and self.value == other.value

metadata = weakref.WeakKeyDictionary()
k = Key("user_1")
metadata[k] = {"name": "Alice"}
```

### 7.5 陷阱：弱引用回调时序不可控

```python
# 错误：依赖回调的执行时序
import weakref
import gc

class Task:
    pass

tasks_completed = []

def on_task_done(ref):
    tasks_completed.append(ref)

# 不同实现下，回调时序可能不同
task = Task()
ref = weakref.ref(task, on_task_done)
del task
gc.collect()  # 显式触发 GC
# tasks_completed 可能为空（GC 尚未执行）
```

### 7.6 陷阱：finalize 闭包捕获 self

```python
# 错误：闭包捕获 self，导致对象无法回收
import weakref

class Bad:
    def __init__(self):
        # 闭包捕获 self，形成强引用
        self._finalizer = weakref.finalize(self, self._cleanup)
        # 此时 self 永远不会被回收！

    def _cleanup(self):
        print("清理")

# 正确：使用静态方法
class Good:
    def __init__(self, path):
        self._finalizer = weakref.finalize(self, Good._cleanup, path)

    @staticmethod
    def _cleanup(path):
        print(f"清理 {path}")
```

### 7.7 陷阱：跨线程使用弱引用容器

```python
# 错误：跨线程并发访问 WeakKeyDictionary
import threading
import weakref

class Item:
    pass

data = weakref.WeakKeyDictionary()

def worker():
    item = Item()
    data[item] = "value"
    # ... 其他操作

# 多线程并发修改，可能导致内部状态不一致
threads = [threading.Thread(target=worker) for _ in range(10)]
for t in threads:
    t.start()
for t in threads:
    t.join()

# 正确：使用锁保护
from threading import RLock

class SafeWeakDict:
    def __init__(self):
        self._data = weakref.WeakKeyDictionary()
        self._lock = RLock()

    def __setitem__(self, key, value):
        with self._lock:
            self._data[key] = value

    def __getitem__(self, key):
        with self._lock:
            return self._data[key]
```

### 7.8 最佳实践总结

1. **优先使用 finalize 而非 __del__**：更安全，可测试；
2. **避免在回调中访问对象**：仅使用闭包外部捕获的信息；
3. **显式声明 __weakref__ 槽位**：使用 `__slots__` 时；
4. **跨线程加锁**：访问弱引用容器时；
5. **不依赖回调时序**：弱引用回调可能延迟执行；
6. **使用弱引用打破循环**：在父子、观察者等结构中；
7. **测试时强制 GC**：`gc.collect()` 确保回调触发。

## 8. 工程实践

### 8.1 项目结构

```
my_app/
├── pyproject.toml
├── src/
│   └── myapp/
│       ├── __init__.py
│       ├── cache.py          # 基于 WeakValueDictionary 的缓存
│       ├── observer.py       # 基于 WeakSet 的观察者
│       ├── resources.py      # 基于 finalize 的资源管理
│       └── descriptors.py    # 弱引用描述符
└── tests/
    └── test_cache.py
```

### 8.2 pyproject.toml 配置

```toml
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = "myapp"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = []

[project.optional-dependencies]
dev = [
    "pytest>=8.0",
    "pytest-asyncio>=0.23",
    "ruff>=0.3",
    "mypy>=1.8",
]

[tool.ruff]
line-length = 100
target-version = "py312"
```

### 8.3 完整缓存实现

```python
"""基于弱引用的多级缓存实现。Python 3.12+。"""
from __future__ import annotations

import threading
import time
import weakref
from collections import OrderedDict
from typing import Any, Callable


class TTLCache:
    """带 TTL 和 LRU 的弱引用缓存。

    特点：
    - 弱引用值：对象无强引用时自动清除；
    - TTL：到期自动清除；
    - LRU：超过 maxsize 时淘汰最久未访问；
    - 线程安全。
    """

    def __init__(
        self,
        maxsize: int = 128,
        ttl: float = 300.0,
    ) -> None:
        self.maxsize = maxsize
        self.ttl = ttl
        self._data: OrderedDict = OrderedDict()
        self._lock = threading.RLock()
        self._weak_refs: weakref.WeakValueDictionary = weakref.WeakValueDictionary()

    def get(self, key: str) -> Any | None:
        """获取缓存值。"""
        with self._lock:
            if key not in self._data:
                return None
            value, expire_at = self._data[key]
            if time.monotonic() >= expire_at:
                del self._data[key]
                return None
            self._data.move_to_end(key)
            return value

    def set(self, key: str, value: Any) -> None:
        """设置缓存值。"""
        with self._lock:
            self._data[key] = (value, time.monotonic() + self.ttl)
            self._data.move_to_end(key)
            if len(self._data) > self.maxsize:
                self._data.popitem(last=False)

    def get_or_create(
        self,
        key: str,
        factory: Callable[[], Any],
    ) -> Any:
        """获取或创建缓存值。"""
        value = self.get(key)
        if value is None:
            value = factory()
            self.set(key, value)
        return value

    def clear(self) -> None:
        """清空缓存。"""
        with self._lock:
            self._data.clear()


# 使用示例
if __name__ == "__main__":
    cache = TTLCache(maxsize=100, ttl=60)

    # 第一次调用（计算）
    result1 = cache.get_or_create("expensive_1", lambda: sum(range(1000000)))
    print(f"result1: {result1}")

    # 第二次调用（缓存命中）
    result2 = cache.get_or_create("expensive_1", lambda: sum(range(1000000)))
    print(f"result2: {result2}")
    print(f"same: {result1 is result2}")
```

### 8.4 观察者模式

```python
"""弱引用观察者模式。Python 3.12+。"""
from __future__ import annotations

import weakref
from typing import Callable, Any


class EventBus:
    """事件总线，观察者使用弱引用。"""

    def __init__(self) -> None:
        self._handlers: weakref.WeakKeyDictionary = weakref.WeakKeyDictionary()

    def subscribe(self, handler: Callable[[Any], None]) -> None:
        """订阅事件。

        Args:
            handler: 事件处理函数（必须是可弱引用的对象）。
        """
        # 函数对象支持弱引用
        self._handlers[handler] = True

    def unsubscribe(self, handler: Callable[[Any], None]) -> None:
        """取消订阅。"""
        self._handlers.pop(handler, None)

    def publish(self, event: Any) -> None:
        """发布事件。"""
        # 复制一份，避免迭代时修改
        handlers = list(self._handlers.keys())
        for handler in handlers:
            try:
                handler(event)
            except Exception as e:
                print(f"事件处理器异常: {e}")


# 使用示例
def on_user_created(event):
    print(f"用户创建: {event}")

def on_user_deleted(event):
    print(f"用户删除: {event}")


if __name__ == "__main__":
    bus = EventBus()
    bus.subscribe(on_user_created)
    bus.subscribe(on_user_deleted)

    bus.publish({"type": "created", "user_id": 1})
    # 输出：用户创建: {'type': 'created', 'user_id': 1}
    # 输出：用户删除: {'type': 'created', 'user_id': 1}

    # 删除处理器函数对象，自动从订阅列表中移除
    del on_user_deleted
    bus.publish({"type": "created", "user_id": 2})
    # 仅输出：用户创建: ...
```

### 8.5 资源管理

```python
"""基于 finalize 的资源管理。Python 3.12+。"""
from __future__ import annotations

import os
import tempfile
import weakref
from pathlib import Path
from typing import Callable


class ManagedResource:
    """受管资源，自动清理。"""

    def __init__(
        self,
        factory: Callable[[], Path],
        cleanup: Callable[[Path], None],
    ) -> None:
        self.path = factory()
        self._finalizer = weakref.finalize(self, cleanup, self.path)

    @property
    def is_closed(self) -> bool:
        return not self._finalizer.alive

    def close(self) -> None:
        """手动关闭。"""
        self._finalizer()


def create_temp_file(prefix: str = "tmp_") -> Path:
    """创建临时文件。"""
    fd, path = tempfile.mkstemp(prefix=prefix)
    os.close(fd)
    return Path(path)


def cleanup_file(path: Path) -> None:
    """清理临时文件。"""
    if path.exists():
        path.unlink()
        print(f"已清理: {path}")


# 使用示例
if __name__ == "__main__":
    resources = []

    # 创建多个临时文件
    for i in range(5):
        r = ManagedResource(create_temp_file, cleanup_file)
        r.path.write_text(f"内容 {i}")
        resources.append(r)
        print(f"创建: {r.path}")

    # 释放部分资源
    del resources[:3]

    # 剩余资源
    print(f"剩余: {len(resources)}")
    for r in resources:
        print(f"  {r.path}, closed: {r.is_closed}")

    # 手动关闭
    for r in resources:
        r.close()

    # GC 回收剩余的弱引用
    import gc
    gc.collect()
```

### 8.6 调试与测试

```python
"""弱引用调试与测试示例。Python 3.12+。"""
from __future__ import annotations

import gc
import sys
import weakref


def test_weak_ref_basic():
    """测试弱引用基础功能。"""
    class Obj:
        pass

    obj = Obj()
    ref = weakref.ref(obj)
    assert ref() is obj

    del obj
    assert ref() is None


def test_weak_value_dict():
    """测试弱值字典。"""
    class Obj:
        pass

    cache = weakref.WeakValueDictionary()
    obj = Obj()
    cache["key"] = obj
    assert cache["key"] is obj

    del obj
    assert "key" not in cache


def test_finalize():
    """测试 finalize。"""
    import tempfile
    import os

    path = tempfile.mktemp()
    with open(path, "w") as f:
        f.write("test")

    class Resource:
        def __init__(self):
            self._finalizer = weakref.finalize(self, os.unlink, path)

    r = Resource()
    assert os.path.exists(path)

    del r
    gc.collect()
    assert not os.path.exists(path)


def test_callbacks():
    """测试弱引用回调。"""
    class Obj:
        pass

    called = []

    def callback(ref):
        called.append(ref)

    obj = Obj()
    ref = weakref.ref(obj, callback)

    del obj
    gc.collect()

    assert len(called) == 1
    assert called[0] is ref


if __name__ == "__main__":
    test_weak_ref_basic()
    test_weak_value_dict()
    test_finalize()
    test_callbacks()
    print("所有测试通过")
```

## 9. 案例研究

### 9.1 Python 标准库中的弱引用应用

#### `functools.lru_cache`

Python 标准库 `functools.lru_cache` 使用 `WeakKeyDictionary` 存储函数参数到结果的映射：

```python
import functools

@functools.lru_cache(maxsize=128)
def expensive_computation(n):
    return sum(i * i for i in range(n))
```

#### `weakref.WeakValueDictionary` 在 `__import__` 中

CPython 内部使用 `WeakValueDictionary` 缓存已导入的模块，当模块无强引用时自动清除。

#### `unittest.mock` 中的弱引用

`unittest.mock` 使用弱引用跟踪 mock 对象，便于自动清理。

### 9.2 Django 中的弱引用

Django 使用 `WeakValueDictionary` 缓存查询集：

```python
# Django ORM 内部（简化）
class QuerySetCache:
    _cache = weakref.WeakValueDictionary()

    @classmethod
    def get(cls, key):
        return cls._cache.get(key)

    @classmethod
    def set(cls, key, value):
        cls._cache[key] = value
```

### 9.3 Flask 中的弱引用

Flask 使用 `WeakKeyDictionary` 跟踪应用上下文：

```python
# Flask 内部（简化）
class AppContext:
    _apps = weakref.WeakKeyDictionary()

    def __init__(self, app):
        self.app = app
        AppContext._apps[app] = self
```

### 9.4 SQLAlchemy 中的弱引用

SQLAlchemy 使用 `WeakIdentityMap` 缓存 ORM 对象，避免内存泄漏：

```python
# SQLAlchemy 内部（简化）
class IdentityMap:
    def __init__(self):
        self._map = weakref.WeakValueDictionary()

    def add(self, obj):
        key = (type(obj), obj.id)
        self._map[key] = obj

    def get(self, cls, id):
        key = (cls, id)
        return self._map.get(key)
```

### 9.5 PyTorch 中的弱引用

PyTorch 使用 `WeakValueDictionary` 管理张量缓存：

```python
# PyTorch 内部（简化）
class TensorCache:
    _cache = weakref.WeakValueDictionary()

    @classmethod
    def get_or_create(cls, shape, dtype):
        key = (shape, dtype)
        tensor = cls._cache.get(key)
        if tensor is None:
            tensor = torch.empty(shape, dtype=dtype)
            cls._cache[key] = tensor
        return tensor
```

## 10. 练习

### 10.1 选择题

**1. 以下哪种类型不支持弱引用？**

A. 自定义类实例
B. 函数对象
C. `list` 实例
D. 类型对象

<details>
<summary>答案与解析</summary>

**答案：C**

`list` 是 Python 内置不可变类型（实际上是可变，但作为内置类型不支持弱引用），不支持 `weakref.ref()`。

可通过子类化添加弱引用支持：

```python
class WeakList(list):
    pass

wl = WeakList()
ref = weakref.ref(wl)  # OK
```

其他选项都支持弱引用：自定义类、函数对象、类型对象。
</details>

---

**2. 以下代码的输出是什么？**

```python
import weakref

class Obj:
    pass

obj = Obj()
ref = weakref.ref(obj)
del obj
print(ref())
```

A. `<Obj object at 0x...>`
B. `None`
C. `False`
D. 抛出 `ReferenceError`

<details>
<summary>答案与解析</summary>

**答案：B**

`weakref.ref` 在对象被回收后返回 `None`。若使用 `weakref.proxy`，访问失效代理会抛出 `ReferenceError`。
</details>

---

**3. `WeakKeyDictionary` 的键被回收时，对应值会怎样？**

A. 自动转为 `None`
B. 自动删除该条目
C. 保留键为 `None`
D. 抛出异常

<details>
<summary>答案与解析</summary>

**答案：B**

`WeakKeyDictionary` 在键对象被回收时，通过弱引用回调自动删除对应的 `(key, value)` 条目。这是其与普通字典的核心区别。
</details>

---

**4. 使用 `__slots__` 时，要让类支持弱引用，必须在 `__slots__` 中加入什么？**

A. `__dict__`
B. `__weakref__`
C. `__ref__`
D. 不需要额外声明

<details>
<summary>答案与解析</summary>

**答案：B**

`__slots__` 会禁用实例字典 `__dict__` 和弱引用槽位 `__weakref__`。若需要弱引用支持，必须显式声明：

```python
class MyClass:
    __slots__ = ("value", "__weakref__")
```
</details>

---

**5. 以下代码的输出是什么？**

```python
import weakref

class Resource:
    pass

callback_called = []

def callback(ref):
    callback_called.append(True)

obj = Resource()
ref = weakref.ref(obj, callback)
del obj
import gc
gc.collect()
print(len(callback_called))
```

A. 0
B. 1
C. 2
D. 不确定

<details>
<summary>答案与解析</summary>

**答案：B**

对象被回收时，弱引用回调会被调用一次。即使有多个弱引用指向同一对象，每个弱引用的回调都会被调用，但本题只有一个弱引用，所以 `callback_called` 长度为 1。

注意：必须显式调用 `gc.collect()` 确保回收，否则可能延迟。
</details>

### 10.2 填空题

**1.** Python 中获取对象引用计数的函数是 `________`。

<details>
<summary>答案</summary>

`sys.getrefcount`
</details>

---

**2.** `WeakValueDictionary` 在 ________ 被回收时自动删除对应条目。

<details>
<summary>答案</summary>

值对象
</details>

---

**3.** `weakref.finalize` 的回调函数中 ________（能/不能）访问被回收的对象。

<details>
<summary>答案</summary>

不能（应使用静态方法，通过参数传递所需信息）
</details>

---

**4.** 使用 `weakref.proxy` 时，若目标对象已被回收，访问代理会抛出 `________` 异常。

<details>
<summary>答案</summary>

`ReferenceError`
</details>

---

**5.** `WeakSet` 中的元素被回收时，会自动从集合中 ________。

<details>
<summary>答案</summary>

移除
</details>

### 10.3 编程题

**1. 实现对象池**

实现一个对象池，使用弱引用跟踪借出的对象：

```python
class ObjectPool:
    def __init__(self, factory, max_size=10):
        """factory: 创建对象的工厂函数"""
        # ...

    def acquire(self):
        """获取一个对象（从池中或新建）"""
        # ...

    def release(self, obj):
        """归还对象"""
        # ...
```

<details>
<summary>参考答案</summary>

```python
import weakref
from collections import deque
from typing import Callable, TypeVar

T = TypeVar("T")


class ObjectPool:
    """对象池，跟踪借出对象（弱引用）。"""

    def __init__(self, factory: Callable[[], T], max_size: int = 10):
        self._factory = factory
        self._max_size = max_size
        self._pool: deque[T] = deque()
        self._borrowed: weakref.WeakSet = weakref.WeakSet()

    def acquire(self) -> T:
        """获取一个对象。"""
        if self._pool:
            obj = self._pool.popleft()
        else:
            obj = self._factory()
        self._borrowed.add(obj)
        return obj

    def release(self, obj: T) -> None:
        """归还对象。"""
        if obj in self._borrowed:
            if len(self._pool) < self._max_size:
                self._pool.append(obj)
            # 否则丢弃（让 GC 回收）

    @property
    def borrowed_count(self) -> int:
        """当前借出数量。"""
        return len(self._borrowed)


# 测试
class Connection:
    _next_id = 0

    def __init__(self):
        Connection._next_id += 1
        self.id = Connection._next_id
        print(f"创建连接 {self.id}")

    def __repr__(self):
        return f"Connection({self.id})"


if __name__ == "__main__":
    pool = ObjectPool(factory=Connection, max_size=3)

    c1 = pool.acquire()
    c2 = pool.acquire()
    print(f"借出: {c1}, {c2}")
    print(f"当前借出数: {pool.borrowed_count}")

    pool.release(c1)
    print(f"归还后借出数: {pool.borrowed_count}")

    c3 = pool.acquire()  # 复用 c1
    print(f"再借出: {c3}")
```
</details>

---

**2. 实现属性变更观察者**

实现一个可观察的属性描述符，使用弱引用管理观察者：

```python
class ObservableProperty:
    def __init__(self, default=None):
        # ...

    def __set_name__(self, owner, name):
        # ...

    def __get__(self, obj, objtype=None):
        # ...

    def __set__(self, obj, value):
        # ...

    def observe(self, obj, callback):
        """注册观察者（弱引用）"""
        # ...
```

<details>
<summary>参考答案</summary>

```python
import weakref
from typing import Callable, Any


class ObservableProperty:
    """可观察属性描述符。"""

    def __init__(self, default: Any = None) -> None:
        self._default = default
        self._storage_name: str = ""
        # 每个对象对应一个观察者列表（弱引用）
        self._observers: weakref.WeakKeyDictionary = weakref.WeakKeyDictionary()

    def __set_name__(self, owner: type, name: str) -> None:
        self._storage_name = f"_observable_{name}"

    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        return getattr(obj, self._storage_name, self._default)

    def __set__(self, obj, value):
        old = getattr(obj, self._storage_name, self._default)
        setattr(obj, self._storage_name, value)
        if old != value:
            self._notify(obj, old, value)

    def observe(self, obj, callback: Callable[[Any, Any], None]) -> None:
        """注册观察者。

        Args:
            obj: 被观察的对象实例。
            callback: 观察者函数（必须支持弱引用）。
        """
        if obj not in self._observers:
            self._observers[obj] = []
        self._observers[obj].append(callback)

    def _notify(self, obj, old, new):
        callbacks = self._observers.get(obj, [])
        for cb in callbacks:
            cb(old, new)


# 测试
class Config:
    debug = ObservableProperty(default=False)
    timeout = ObservableProperty(default=30)


if __name__ == "__main__":
    config = Config()

    def on_debug_change(old, new):
        print(f"debug: {old} -> {new}")

    def on_timeout_change(old, new):
        print(f"timeout: {old} -> {new}")

    Config.debug.observe(config, on_debug_change)
    Config.timeout.observe(config, on_timeout_change)

    config.debug = True   # 输出：debug: False -> True
    config.timeout = 60    # 输出：timeout: 30 -> 60
```
</details>

---

**3. 实现资源管理器**

实现一个资源管理器，使用 `finalize` 确保资源被清理：

```python
class ResourceManager:
    def __init__(self):
        # ...

    def acquire(self, name: str) -> "Resource":
        """获取资源"""
        # ...

    def __del__(self):
        # ...
```

<details>
<summary>参考答案</summary>

```python
import weakref
from typing import Dict


class Resource:
    """受管资源。"""

    def __init__(self, name: str, manager: "ResourceManager") -> None:
        self.name = name
        self._manager = manager
        self._closed = False

    def use(self) -> str:
        """使用资源。"""
        if self._closed:
            raise RuntimeError("资源已关闭")
        return f"使用 {self.name}"

    def close(self) -> None:
        """手动关闭。"""
        if not self._closed:
            self._closed = True
            self._manager._release(self.name)
            print(f"关闭资源: {self.name}")


class ResourceManager:
    """资源管理器，使用 finalize 确保清理。"""

    def __init__(self) -> None:
        self._resources: Dict[str, Resource] = {}

    def acquire(self, name: str) -> Resource:
        """获取资源。"""
        if name in self._resources:
            return self._resources[name]

        resource = Resource(name, self)
        self._resources[name] = resource

        # 注册 finalizer，资源对象回收时自动释放
        weakref.finalize(resource, self._release, name)
        print(f"分配资源: {name}")
        return resource

    def _release(self, name: str) -> None:
        """释放资源。"""
        if name in self._resources:
            del self._resources[name]
            print(f"释放资源: {name}")

    @property
    def active_count(self) -> int:
        """活跃资源数。"""
        return len(self._resources)


# 测试
if __name__ == "__main__":
    import gc

    manager = ResourceManager()

    r1 = manager.acquire("db_connection")
    r2 = manager.acquire("file_handle")

    print(f"活跃数: {manager.active_count}")  # 2
    print(r1.use())

    r1.close()  # 手动关闭
    print(f"活跃数: {manager.active_count}")  # 1

    del r2
    gc.collect()  # 触发 finalize
    print(f"活跃数: {manager.active_count}")  # 0
```
</details>

### 10.4 思考题

**1. 为什么 Python 的 `int`、`str`、`list` 等内置类型不支持弱引用？这样设计有什么好处？**

<details>
<summary>参考答案</summary>

**设计原因**：

1. **性能考虑**：内置类型实例数量巨大（如所有 `int` 字面量），若每个都维护弱引用链表，内存开销过高；
2. **实现简化**：内置类型用 C 实现，数据结构紧凑，添加 `__weakref__` 槽位会破坏内存布局；
3. **使用频率**：内置类型通常作为字典键、集合元素使用，弱引用场景少；
4. **缓存友好**：紧凑的内存布局对 CPU 缓存友好。

**好处**：

- 内置类型实例占内存小（`int` 约 28 字节，`list` 约 56 字节）；
- 性能高，适合高频创建销毁；
- 避免 GC 跟踪大量小对象。

**坏处**：

- 无法直接对 `int`、`str` 等创建弱引用；
- 需通过子类化或包装类间接实现。
</details>

---

**2. 描述 `weakref.finalize` 与 `__del__` 的区别，并说明为什么推荐使用 `finalize`。**

<details>
<summary>参考答案</summary>

**区别**：

| 维度 | `__del__` | `weakref.finalize` |
| :--- | :--- | :--- |
| 引用 self | 引用 | 不引用 |
| 对象复活 | 可能（在 __del__ 中赋值给外部变量） | 不可能 |
| GC 影响 | 可能阻止回收 | 不影响 |
| 调用时机 | 不可预测（依赖 GC） | 较可预测 |
| 测试性 | 难以手动触发 | 可调用 `finalizer()` |
| 异常处理 | 异常被忽略 | 异常打印到 stderr |
| 解释器退出 | 可能不调用 | 通过 `atexit=True` 确保 |

**推荐 `finalize` 的原因**：

1. **避免对象复活**：`__del__` 中若将 `self` 赋值给外部变量，对象会"复活"，导致状态混乱；
2. **更可预测**：`finalize` 在对象被回收后调用，不依赖 `__del__` 的复杂时序；
3. **可测试**：`finalizer()` 可手动调用，便于单元测试；
4. **安全**：闭包不捕获 `self`，避免循环引用；
5. **解释器退出时调用**：`atexit=True` 选项确保资源在程序退出时清理。

**示例对比**：

```python
# 不推荐：__del__
class Bad:
    def __del__(self):
        # 难以测试，可能不调用
        cleanup(self.path)

# 推荐：finalize
class Good:
    def __init__(self, path):
        self.path = path
        self._finalizer = weakref.finalize(self, cleanup, path)

    def close(self):
        self._finalizer()
```
</details>

---

**3. 在什么场景下应该使用弱引用？什么时候应该避免使用？**

<details>
<summary>参考答案</summary>

**适合使用弱引用的场景**：

1. **对象缓存**：缓存昂贵对象，内存紧张时自动释放（如 `WeakValueDictionary`）；
2. **观察者模式**：被观察者持有观察者的弱引用，避免观察者无法被 GC；
3. **循环引用规避**：父子结构中，子对父使用弱引用；
4. **单例注册表**：避免单例永远占用内存；
5. **元数据附加**：为对象附加额外信息，不阻止对象回收；
6. **资源跟踪**：跟踪借出资源，对象回收时自动清理。

**应避免使用弱引用的场景**：

1. **短生命周期对象**：创建弱引用的开销可能超过其收益；
2. **依赖确定回收时机**：弱引用回调时机不可控，依赖时序会引入 bug；
3. **替代显式资源管理**：应优先使用 `with` 语句或 `try/finally` 显式管理资源；
4. **内置不可变类型**：`int`、`str` 等不支持，需子类化或包装，增加复杂度；
5. **多线程高并发**：弱引用容器非线程安全，需加锁；
6. **关键业务逻辑**：弱引用的"可能失效"特性增加代码不确定性，关键路径应使用强引用。
</details>

## 11. 参考文献

### 11.1 标准与规范

- [1] Python Software Foundation. *Python Language Reference - Data Model*. Python 3.12. https://docs.python.org/3.12/reference/datamodel.html
- [2] PEP 205 - Weak References. 2001. https://peps.python.org/pep-0205/
- [3] PEP 442 - Safe object finalization. 2013. https://peps.python.org/pep-0442/
- [4] PEP 703 - Making the Global Interpreter Lock Optional. 2023. https://peps.python.org/pep-0703/

### 11.2 学术论文

- [5] McCarthy, J. (1960). Recursive functions of symbolic expressions and their computation by machine, Part I. *Communications of the ACM*, 3(4), 184-195. https://doi.org/10.1145/367177.367199
- [6] Liskov, B., & Zilles, S. (1974). Programming with abstract data types. *Proceedings of the ACM SIGPLAN Symposium on Very High Level Languages*, 50-59. https://doi.org/10.1145/800233.807045
- [7] Bacon, D. F., & Rajan, V. T. (2001). Concurrent cycle collection in reference counted systems. *European Conference on Object-Oriented Programming*, 207-235. https://doi.org/10.1007/3-540-45337-8_12

### 11.3 技术文档

- [8] weakref — Weak references. *Python 3.12 Documentation*. https://docs.python.org/3.12/library/weakref.html
- [9] gc — Garbage Collector interface. *Python 3.12 Documentation*. https://docs.python.org/3.12/library/gc.html
- [10] CPython Source Code: Modules/_weakref.c. https://github.com/python/cpython/blob/main/Modules/_weakref.c

### 11.4 书籍

- [11] Ramalho, L. (2022). *Fluent Python* (2nd ed.). O'Reilly Media.
- [12] Beazley, D., & Jones, B. K. (2013). *Python Cookbook* (3rd ed.). O'Reilly Media.
- [13] Jones, M. T. (2023). *Python Object-Oriented Programming* (4th ed.). Packt Publishing.

## 12. 进一步阅读

### 12.1 进阶主题

1. **CPython `weakref` 源码分析**：阅读 `Modules/_weakref.c` 与 `Objects/weakrefobject.c`，理解弱引用的 C 层实现；
2. **free-threaded 模式下的弱引用**：PEP 703 引入的无 GIL 构建对弱引用语义的影响；
3. **第三方库**：`wrapt`（弱引用代理）、`weakreflist`（弱引用列表）；
4. **分布式对象缓存**：Redis + 弱引用的混合方案；
5. **跨语言对比**：Java `ReferenceQueue`、C++ `weak_ptr::lock()`、Rust `Weak<T>::upgrade()`。

### 12.2 相关论文

- "Reference Counting" - George Collins (1960)
- "On the Cost of Concurrent Garbage Collection" - Kafura et al. (1992)
- "A Unified Theory of Garbage Collection" - Bacon et al. (2004)

### 12.3 实战项目

1. **实现 LRU 缓存**：结合 `WeakValueDictionary` 与 `OrderedDict`；
2. **实现事件总线**：基于 `WeakSet` 的发布订阅系统；
3. **实现对象关系映射**：参考 SQLAlchemy 的 `IdentityMap`；
4. **资源池管理**：数据库连接池、线程池；
5. **内存分析工具**：统计弱引用使用情况，识别内存泄漏。

### 12.4 在线资源

- **Python weakref 文档**：https://docs.python.org/3.12/library/weakref.html
- **Real Python - Memory Management**：https://realpython.com/python-memory-management/
- **Stack Overflow - weakref**：https://stackoverflow.com/questions/tagged/weakref
- **Awesome Python GC**：https://github.com/vinta/awesome-python#garbage-collection

### 12.5 视频课程

- **Ned Batchelder - Python Memory Management**（PyCon 2019）
- **Larry Hastings - Memory in Python**（PyCon 2016）
- **Anthony Shaw - CPython Internals**（PyCon 2022）

## 附录 A：weakref API 速查表

### A.1 核心函数

| 函数 | 说明 |
| :--- | :--- |
| `weakref.ref(obj, callback=None)` | 创建弱引用 |
| `weakref.proxy(obj, callback=None)` | 创建弱引用代理 |
| `weakref.getweakrefcount(obj)` | 获取对象的弱引用数 |
| `weakref.getweakrefs(obj)` | 获取对象的所有弱引用列表 |
| `weakref.finalize(obj, func, *args, **kwargs)` | 创建 finalizer |

### A.2 容器

| 容器 | 说明 |
| :--- | :--- |
| `WeakKeyDictionary()` | 弱键字典 |
| `WeakValueDictionary()` | 弱值字典 |
| `WeakSet()` | 弱集合 |
| `WeakMethod(method)` | 弱方法引用 |
| `WeakFinalizer()` | finalizer 对象 |

### A.3 类型对象

| 类型 | 说明 |
| :--- | :--- |
| `ReferenceType` | `weakref.ref` 的类型 |
| `ProxyType` | `weakref.proxy` 的类型 |
| `CallableProxyType` | 可调用代理类型 |
| `ProxyTypes` | 所有代理类型的元组 |

## 附录 B：类型支持矩阵

| 类型 | 支持弱引用 | 备注 |
| :--- | :--- | :--- |
| 用户自定义类 | ✓ | 默认支持 |
| 函数 `def` | ✓ | |
| 方法（绑定） | ✓ | 通过 `WeakMethod` |
| 类型对象 `type` | ✓ | |
| `bytearray` | ✓ | |
| `memoryview` | ✓ | |
| `array.array` | ✓ | |
| `socket` | ✓ | |
| `int` | ✗ | 子类化可支持 |
| `float` | ✗ | 子类化可支持 |
| `complex` | ✗ | |
| `str` | ✗ | 子类化可支持 |
| `bytes` | ✗ | |
| `tuple` | ✗ | |
| `frozenset` | ✗ | |
| `list` | ✗ | 子类化可支持 |
| `dict` | ✗ | 子类化可支持 |
| `set` | ✗ | 子类化可支持 |
| `bool` | ✗ | |
| `NoneType` | ✗ | |

## 附录 C：性能基准

| 操作 | 耗时 |
| :--- | :--- |
| 创建 `weakref.ref` | ~100ns |
| 调用 `ref()` | ~50ns |
| 弱引用回调 | ~1μs |
| `WeakKeyDictionary` 查找 | ~150ns |
| `WeakValueDictionary` 查找 | ~150ns |
| `WeakSet` 添加 | ~200ns |
| `finalize` 注册 | ~500ns |
| `finalize` 调用 | ~1μs |

## 附录 D：CPython 内部实现

### D.1 `PyWeakReference` 结构（简化）

```c
typedef struct _PyWeakReference {
    PyObject_HEAD
    PyObject *wr_object;     // 目标对象
    PyObject *wr_callback;   // 回调函数
    PyWeakReference *wr_prev; // 弱引用链表（前驱）
    PyWeakReference *wr_next; // 弱引用链表（后继）
} PyWeakReference;
```

### D.2 对象的弱引用链表

每个支持弱引用的对象都有一个 `__weakref__` 槽位，指向其所有弱引用的链表头：

```c
typedef struct _object {
    Py_ssize_t ob_refcnt;      // 引用计数
    PyTypeObject *ob_type;
    // ...
    PyWeakReference *ob_weakref;  // 弱引用链表头（仅当支持时）
} PyObject;
```

### D.3 回收回调流程

1. GC 决定回收对象 $o$；
2. 遍历 $o$ 的弱引用链表；
3. 对每个弱引用 $r$：
   - 设置 $r.\text{wr\_object} = \text{NULL}$；
   - 若 $r$ 有回调，将 $r$ 加入回调队列；
4. 调用所有回调（按注册顺序）；
5. 释放对象内存。

## 附录 E：相关标准库模块

- `gc`：垃圾回收器接口；
- `sys`：`getrefcount`、`getsizeof`；
- `ctypes`：C 级别弱引用操作；
- `multiprocessing.shared_memory`：跨进程共享内存；
- `tracemalloc`：内存分配追踪。
