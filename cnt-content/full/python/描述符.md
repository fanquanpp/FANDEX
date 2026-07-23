---
order: 107
title: 描述符
module: python
category: 'dev-lang'
difficulty: advanced
description: Python描述符协议详解：__get__、__set__、__delete__、数据描述符与非数据描述符、协议底层机制与生产级工程实践。
author: fanquanpp
updated: '2026-07-21'
related:
  - python/元类与单例模式
  - python/装饰器进阶
  - python/弱引用
  - python/数据类与字段默认值
  - python/属性与方法查找
  - python/上下文管理器
prerequisites:
  - python/语法速查
  - python/面向对象编程
  - python/元类与单例模式
---

## 概述

描述符（Descriptor）是 Python 面向对象体系中最为深邃的协议之一。它不是一种语法糖，也不是一种设计模式的简单实现，而是 Python 属性访问机制（attribute access）的核心底层基石。Python 中 `property`、`classmethod`、`staticmethod`、`super()` 的工作机制，`@dataclass` 字段校验、ORM 字段定义、ORM 关系映射、Pydantic 模型校验、Django Model 字段等几乎所有"魔法"背后的原动力，最终都可以追溯到描述符协议。

理解描述符，意味着理解 Python 对象模型如何把"属性访问"这一日常行为转化为方法调用。这是从"使用 Python"到"理解 Python"的分水岭。Raymond Hettinger 在 PyCon 2013 的著名演讲"Descriptor HowTo"开篇即指出："描述符是一种优雅的机制，让对象属性访问可被自定义代码劫持，从而支撑起整个 Python 类系统的抽象层级"。

本篇文档将围绕描述符协议的形式化定义、底层调用机制、协议分类、设计模式、与元类和属性查找链的交互、生产级工程实践、性能分析、陷阱与反模式、真实案例研究等展开系统化论述，目标是让读者从协议层、字节码层、C 源码层全方位掌握描述符。

## 1. 学习目标

本篇采用 Bloom 分类法（Bloom's Taxonomy）按认知层级组织学习目标。Bloom 分类法将认知能力由低到高划分为六个层级：记忆（Remember）、理解（Understand）、应用（Apply）、分析（Analyze）、评价（Evaluate）、创造（Create）。本节明确每个层级应达成的可观测学习成果。

### 1.1 记忆层（Remember）

学习者能够准确复述以下事实性知识：

- 描述符协议包含三个核心方法：`__get__(self, obj, objtype=None)`、`__set__(self, obj, value)`、`__delete__(self, obj)`。
- 仅实现 `__get__` 的描述符称为非数据描述符（non-data descriptor）。
- 同时实现 `__get__` 与 `__set__`（或 `__delete__`）的描述符称为数据描述符（data descriptor）。
- 描述符必须定义为类属性，不能定义为实例属性。
- `property` 装饰器内部本质上是数据描述符的工厂函数。
- `classmethod` 与 `staticmethod` 内部均是非数据描述符。
- 描述符的 `__set_name__` 钩子在 Python 3.6 引入。

### 1.2 理解层（Understand）

学习者能够用自己的语言解释以下概念：

- 为什么数据描述符优先级高于实例字典，而非数据描述符优先级低于实例字典。
- `__getattribute__` 在属性访问链中执行查找的完整顺序。
- 为什么 `property` 装饰器无法在实例层面覆盖类层面的同名属性。
- 描述符如何成为 ORM 字段、`@cached_property`、`@dataclass` 字段校验等高级特性的底层基础。
- `super()` 在 MRO 链上查找时如何与描述符交互。

### 1.3 应用层（Apply）

学习者能够在真实工程场景中：

- 自定义一个带类型校验的 `TypedField` 描述符，实现类似 Pydantic 的字段验证。
- 实现一个 `LazyProperty` 描述符，做到首次访问时计算并缓存结果。
- 使用 `__set_name__` 自动登记字段元信息，构建轻量级 ORM 字段基类。
- 借助描述符实现 ORM 关系映射中的 `ForeignKey`、`ManyToMany` 字段。
- 通过描述符实现只读属性、读写校验属性、计算属性。

### 1.4 分析层（Analyze）

学习者能够剖析：

- 同一段 `obj.attr` 字节码在数据描述符、非数据描述符、普通类属性、实例属性四种场景下的执行路径差异。
- 描述符在 CPython 解释器层面的 `tp_descr_get` 与 `tp_descr_set` 槽位调用。
- 描述符与元类协作时，属性查找链在 metaclass MRO 与 class MRO 上的双重遍历。
- 描述符协议在多继承菱形继承下的查找顺序。

### 1.5 评价层（Evaluate）

学习者能够评价：

- 在给定业务场景下，使用 `property`、自定义描述符、`__getattr__`、`__setattr__` 哪种方案更合适。
- 描述符方案与 `@dataclass`、Pydantic、attrs 等第三方库方案在性能、可维护性、扩展性上的权衡。
- 一段生产代码中描述符设计的合理性与潜在风险。

### 1.6 创造层（Create）

学习者能够：

- 设计一套支持字段校验、类型转换、序列化、反序列化的企业级字段基类体系。
- 构建一个支持迁移、关系映射、查询构造的微型 ORM 原型。
- 基于描述符实现一套领域驱动设计（DDD）中的值对象（Value Object）与聚合根（Aggregate Root）基础设施。

## 2. 历史动机与背景

### 2.1 Python 早期属性访问的痛点

Python 早期（1.x 时代）属性访问机制相对原始。开发者若希望在属性读写时插入自定义逻辑（例如类型校验、计算属性、缓存、日志），唯一手段是重写 `__getattr__` 与 `__setattr__` 这两个方法。然而这两个方法是全局性的，所有属性访问都会经过它们，导致代码充斥着大量 `if name == 'xxx':` 分支，可维护性极差。

```python
# 早期风格的属性访问拦截（反模式示例）
class Person:
    def __init__(self):
        self._age = 0

    def __getattr__(self, name):
        if name == 'age':
            return self._age
        raise AttributeError(name)

    def __setattr__(self, name, value):
        if name == 'age':
            if not isinstance(value, int):
                raise TypeError('age must be int')
            if value < 0:
                raise ValueError('age must be non-negative')
            self._age = value
        else:
            super().__setattr__(name, value)
```

上述代码的问题在于：每增加一个受控属性，都要修改 `__getattr__` 与 `__setattr__`，违反开闭原则（Open-Closed Principle, OCP）。属性越多，方法体越膨胀，最终演化成无法维护的"上帝方法"。

### 2.2 描述符协议的引入

Python 2.2 是一次里程碑式的版本发布，Guido van Rossum 与其团队在该版本中完成了"类型与类的统一"（type/class unification），引入了新式类（new-style class）。新式类的引入伴随了一系列对象模型的重新设计，其中描述符协议便是核心组成部分之一。

描述符协议的引入动机有三：

1. **支撑 `property` 装饰器**：将"属性访问拦截"从全局方法下沉到字段级别，每个属性独立维护自己的读写逻辑。
2. **支撑 `classmethod` 与 `staticmethod`**：让类方法与静态方法在 MRO 链上以"属性"形式存在，访问时通过描述符协议完成方法绑定。
3. **支撑 `super()` 机制**：`super()` 在 MRO 链上查找方法时，依赖描述符协议完成绑定方法的构造。

Guido van Rossum 在 PEP 252（Making Types Look More Like Classes）与 PEP 253（Subtyping Built-in Types）中正式定义了描述符协议的语义。Python 2.2 后，描述符协议成为 Python 对象模型的根基。

### 2.3 演进里程碑

| 版本 | 年份 | 关键变化 |
|------|------|----------|
| Python 2.2 | 2001 | 新式类引入描述符协议，`property`、`classmethod`、`staticmethod` 诞生 |
| Python 2.3 | 2003 | `super()` 实现重写，深度依赖描述符协议 |
| Python 2.6 | 2008 | `abc` 抽象基类模块基于描述符协议实现 |
| Python 3.0 | 2008 | 新式类成为默认，描述符协议成为唯一对象模型 |
| Python 3.6 | 2016 | 引入 `__set_name__` 钩子，描述符可在类创建时获知自身字段名 |
| Python 3.8 | 2019 | `functools.cached_property` 引入，基于非数据描述符 + 写入实例字典实现 |
| Python 3.11 | 2022 | 描述符协议相关字节码优化，`LOAD_ATTR` 性能提升 |
| Python 3.12 | 2023 | `__init_subclass__` 与 `__set_name__` 协同机制进一步完善 |

### 2.4 现代价值

时至今日，描述符协议在以下领域仍是不可替代的底层机制：

- **ORM 框架**：SQLAlchemy 的 `Column`、Django ORM 的 `Field`、Tortoise ORM 的 `Field` 均基于描述符实现。
- **数据校验库**：Pydantic v1 的 `Field`、attrs 的 `attrib()`、dataclasses 的字段校验扩展。
- **Web 框架**：Django 的视图类属性、Flask 的 `app.route` 装饰器内部机制、ViewSet 的 action 装饰器。
- **GUI 框架**：Kivy 的 `OptionProperty`、PyQt 的 `pyqtProperty`。
- **科学计算**：NumPy 的某些特性、Pandas 的 `DataFrame` 列访问机制。
- **CLI 工具**：Click 的 `Option`、Typer 的参数声明。

掌握描述符协议，意味着掌握了 Python 高级框架"最后一层抽象"的钥匙。

## 3. 形式化定义

### 3.1 描述符协议的形式化表述

设 $C$ 为任意 Python 类，$c$ 为 $C$ 的实例。设 $a$ 为 $C$ 的一个类属性（class attribute），即 $a \in C.\_\_dict\_\_$。称 $a$ 为描述符，当且仅当 $a$ 的类型实现了以下方法中的至少一个：

$$
a \text{ 是描述符} \iff \exists m \in \{\text{\_\_get\_\_}, \text{\_\_set\_\_}, \text{\_\_delete\_\_}\}: m \in \text{type}(a).\_\_dict\_\_ \lor m \in \text{MRO}(\text{type}(a))
$$

其中 MRO（Method Resolution Order，方法解析顺序）表示类型的方法解析顺序链。

### 3.2 协议三方法的形式化定义

**`__get__` 方法**：

$$
\text{\_\_get\_\_}: (a: \text{Descriptor}, \text{obj}: \text{Optional}[T], \text{objtype}: \text{Optional}[\text{Type}[T]]) \to \text{Any}
$$

其语义为：当通过 $c.x$ 或 $C.x$ 访问属性 $x$ 时，若 $x$ 是描述符，则调用 $a.\_\_get\_\_(c, C)$ 返回最终值。当通过类访问 $C.x$ 时，$\text{obj}$ 为 $\text{None}$，$\text{objtype}$ 为 $C$。

**`__set__` 方法**：

$$
\text{\_\_set\_\_}: (a: \text{Descriptor}, \text{obj}: T, \text{value}: \text{Any}) \to \text{None}
$$

其语义为：当执行 $c.x = v$ 时，若 $x$ 是数据描述符，则调用 $a.\_\_set\_\_(c, v)$。

**`__delete__` 方法**：

$$
\text{\_\_delete\_\_}: (a: \text{Descriptor}, \text{obj}: T) \to \text{None}
$$

其语义为：当执行 $\text{del } c.x$ 时，若 $x$ 是数据描述符，则调用 $a.\_\_delete\_\_(c)$。

### 3.3 数据描述符与非数据描述符的形式化分类

定义数据描述符（Data Descriptor）：

$$
\text{DataDescriptor}(a) \iff \text{\_\_set\_\_} \in \text{type}(a) \lor \text{\_\_delete\_\_} \in \text{type}(a)
$$

定义非数据描述符（Non-Data Descriptor）：

$$
\text{NonDataDescriptor}(a) \iff \text{\_\_get\_\_} \in \text{type}(a) \land \text{\_\_set\_\_} \notin \text{type}(a) \land \text{\_\_delete\_\_} \notin \text{type}(a)
$$

注意：判定是否为数据描述符的关键是 `__set__` 或 `__delete__` 是否存在，而 `__get__` 是否存在不影响这一分类。一个仅实现 `__set__` 而未实现 `__get__` 的对象仍是数据描述符。

### 3.4 属性访问优先级的形式化定义

设 $c$ 为类 $C$ 的实例，$x$ 为待访问的属性名。属性访问 $c.x$ 的查找顺序形式化为：

$$
\text{lookup}(c, x) = \begin{cases}
\text{data\_desc.\_\_get\_\_}(c, C) & \text{if } \exists d \in C.\text{MRO}: x \in d.\_\_dict\_\_ \land \text{DataDescriptor}(d.\_\_dict\_\_[x]) \\
c.\_\_dict\_\_[x] & \text{if } x \in c.\_\_dict\_\_ \\
\text{non\_data\_desc.\_\_get\_\_}(c, C) & \text{if } \exists d \in C.\text{MRO}: x \in d.\_\_dict\_\_ \land \text{NonDataDescriptor}(d.\_\_dict\_\_[x]) \\
d.\_\_dict\_\_[x] & \text{if } \exists d \in C.\text{MRO}: x \in d.\_\_dict\_\_ \\
\text{\_\_getattr\_\_}(c, x) & \text{if } \text{\_\_getattr\_\_} \in \text{type}(c) \\
\text{raise AttributeError}(x) & \text{otherwise}
\end{cases}
$$

这一优先级链可概括为：

1. 数据描述符（最高优先级）
2. 实例字典 `__dict__`
3. 非数据描述符
4. 类字典（普通类属性）
5. `__getattr__`（兜底）
6. 抛出 `AttributeError`

数据描述符之所以"数据"，是因为它能"控制数据"——它优先于实例字典，意味着实例无法通过 `self.__dict__[x] = v` 绕过描述符的写入校验。

### 3.5 属性赋值优先级的形式化定义

属性赋值 $c.x = v$ 的查找顺序形式化为：

$$
\text{assign}(c, x, v) = \begin{cases}
\text{data\_desc.\_\_set\_\_}(c, v) & \text{if } \exists d \in C.\text{MRO}: x \in d.\_\_dict\_\_ \land \text{DataDescriptor}(d.\_\_dict\_\_[x]) \\
\text{\_\_setattr\_\_}(c, x, v) & \text{if } \text{\_\_setattr\_\_} \in \text{type}(c) \\
c.\_\_dict\_\_[x] = v & \text{otherwise}
\end{cases}
$$

注意：赋值时只检查数据描述符，非数据描述符不参与赋值拦截。

## 4. 理论推导

### 4.1 `__getattribute__` 的查找链推导

CPython 中 `object.__getattribute__` 的实现位于 `Objects/object.c` 文件中的 `slot_tp_getattribute_hook` 与 `_PyObject_GenericGetAttrWithDict` 函数。其核心逻辑可伪代码表示如下：

```c
// CPython Objects/object.c 中属性访问的简化伪代码
PyObject* _PyObject_GenericGetAttrWithDict(PyObject *obj, PyObject *name) {
    PyObject *descr = NULL;
    PyObject *res = NULL;
    
    // 第 1 步：在类型的 MRO 链上查找描述符
    descr = _PyType_Lookup(type(obj), name);
    
    // 第 2 步：若找到数据描述符，调用其 __get__
    if (descr != NULL && PyDescr_IsData(descr)) {
        return descr->ob_type->tp_descr_get(descr, obj, type(obj));
    }
    
    // 第 3 步：在实例字典中查找
    if (obj->__dict__ != NULL) {
        res = PyDict_GetItem(obj->__dict__, name);
        if (res != NULL) {
            Py_INCREF(res);
            return res;
        }
    }
    
    // 第 4 步：若找到非数据描述符，调用其 __get__
    if (descr != NULL) {
        return descr->ob_type->tp_descr_get(descr, obj, type(obj));
    }
    
    // 第 5 步：返回类属性（普通类属性）
    if (descr != NULL) {
        Py_INCREF(descr);
        return descr;
    }
    
    // 第 6 步：调用 __getattr__ 兜底
    if (type(obj)->tp_getattro == slot_tp_getattr_hook) {
        return call_getattr_hook(obj, name);
    }
    
    // 第 7 步：抛出 AttributeError
    PyErr_Format(PyExc_AttributeError, ...);
    return NULL;
}
```

从上述伪代码可清晰看出属性访问的完整链路。这条链路是 Python 对象模型的核心算法，理解了它，便理解了 Python 属性访问的全部秘密。

### 4.2 数据描述符优先级的必要性

为什么数据描述符优先级要高于实例字典？这是 Python 设计者经过深思熟虑后的权衡。考虑 `property` 装饰器：

```python
class Circle:
    def __init__(self, radius):
        self._radius = radius
    
    @property
    def radius(self):
        return self._radius
    
    @radius.setter
    def radius(self, value):
        if value < 0:
            raise ValueError('radius must be non-negative')
        self._radius = value
```

若数据描述符优先级低于实例字典，那么 `circle.radius = 5` 将直接写入 `circle.__dict__['radius'] = 5`，绕过 setter 的校验。`property` 的存在意义便被彻底瓦解。因此，数据描述符必须拥有最高优先级，否则所有依赖描述符的校验、计算、缓存机制都将失效。

### 4.3 非数据描述符优先级低于实例字典的原因

`classmethod` 与 `staticmethod` 是非数据描述符。它们没有 `__set__`，因此优先级低于实例字典。这一设计的考量是：

- 实例属性应能"覆盖"类方法，给开发者以灵活性。
- 但实例属性不应能"覆盖" `property`，因为 `property` 通常承载校验逻辑。

这一权衡体现了 Python"实用胜于纯粹"的设计哲学。Python 给开发者足够的自由，但保留必要的约束。

### 4.4 描述符查找的时间复杂度分析

设 $n$ 为类 $C$ 的 MRO 链长度，$m$ 为类字典平均属性数。属性访问 $c.x$ 的时间复杂度为：

$$
T(n, m) = O(n \cdot m) + O(1) = O(n \cdot m)
$$

其中 $O(n \cdot m)$ 来自 `_PyType_Lookup` 在 MRO 链上遍历各类字典，$O(1)$ 来自实例字典的哈希查找。

对于典型 Python 类，$n \leq 10$，$m \leq 100$，故 $T \approx O(1000)$，在纳秒级别，可视为常数时间。但对于深度继承的框架（如 Django 的 CBV，MRO 链可达 20+），描述符查找的开销不可忽略。

CPython 3.3+ 引入了"类型属性缓存"（type attribute cache），通过 `_PyType_Lookup` 内部的版本号机制缓存查找结果，将重复查找的复杂度降至 $O(1)$。这一优化使描述符访问几乎与普通属性访问同速。

### 4.5 `__set_name__` 的调用时机推导

Python 3.6 引入 `__set_name__` 钩子。其调用时机发生在类创建时，由 `type.__new__` 触发。形式化描述如下：

设 $C = \text{type}(name, bases, namespace)$ 是一次类创建。在 `type.__new__` 完成 MRO 链构建后，对 $namespace$ 中每个键值对 $(k, v)$，若 $\text{type}(v)$ 实现了 `__set_name__`，则调用：

$$
v.\_\_set\_name\_\_(C, k)
$$

这一调用在类创建时自动发生，开发者无需显式触发。`__set_name__` 的典型用途是让描述符获知自身在类中的字段名，从而支持自动字段登记、元信息收集、字段名验证等功能。

```python
class Field:
    def __set_name__(self, owner, name):
        # 在类创建时被调用，name 是字段在类中的属性名
        self.name = name
        # 可在此自动登记字段到 owner 的元信息中
        if not hasattr(owner, '_fields'):
            owner._fields = []
        owner._fields.append(name)
    
    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        return obj.__dict__.get(self.name)
    
    def __set__(self, obj, value):
        obj.__dict__[self.name] = value
```

`__set_name__` 的引入极大地简化了描述符的字段名管理，是描述符协议现代化的重要里程碑。

## 5. 代码示例

本节提供多个完整可运行的代码示例，每个示例均带详细中文注释，覆盖描述符协议的核心用法与典型工程场景。

### 5.1 最简描述符示例

```python
# 最简描述符示例：展示描述符协议的基本工作机制

class SimpleDescriptor:
    """最简描述符：实现 __get__、__set__、__delete__ 三个方法
    
    这是一个数据描述符，因为同时实现了 __get__ 与 __set__。
    数据描述符的优先级高于实例字典，因此可以拦截所有属性访问与赋值。
    """
    
    def __init__(self, name):
        # 内部存储键名，用于在实例字典中存取真实值
        self.name = name
    
    def __get__(self, obj, objtype=None):
        # 当通过实例或类访问属性时被调用
        # obj 为实例（通过类访问时为 None），objtype 为类
        if obj is None:
            # 通过类访问时，返回描述符自身（与 property 行为一致）
            return self
        # 通过实例访问时，从实例字典中读取真实值
        # 使用 self.name 作为键，避免与描述符属性本身冲突
        return obj.__dict__.get(self.name, None)
    
    def __set__(self, obj, value):
        # 当通过实例赋值时被调用
        # 将值写入实例字典（注意键名是 self.name，不是描述符自身）
        obj.__dict__[self.name] = value
    
    def __delete__(self, obj):
        # 当通过 del 删除属性时被调用
        if self.name in obj.__dict__:
            del obj.__dict__[self.name]
        else:
            raise AttributeError(f"属性 {self.name!r} 不存在")


class Person:
    # 描述符必须定义为类属性
    name = SimpleDescriptor('_name_internal')
    
    def __init__(self, name):
        # 通过描述符写入值
        self.name = name


# 测试
p = Person('Alice')
print(p.name)  # 输出: Alice
p.name = 'Bob'
print(p.name)  # 输出: Bob
print(p.__dict__)  # 输出: {'_name_internal': 'Bob'}，真实值存储在实例字典
del p.name
print(p.name)  # 输出: None

# 通过类访问返回描述符自身
print(Person.name)  # 输出: <SimpleDescriptor object at 0x...>
```

### 5.2 类型校验描述符

```python
# 类型校验描述符：实现类似 Pydantic 的字段类型检查

class TypedField:
    """带类型校验的数据描述符
    
    在赋值时检查值的类型，类型不符则抛出 TypeError。
    这是构建数据校验库的基础原语。
    """
    
    def __init__(self, expected_type, default=None):
        # expected_type: 期望的类型（可以是类型或类型元组）
        # default: 默认值（当未赋值时返回）
        if not isinstance(expected_type, (type, tuple)):
            raise TypeError('expected_type 必须是类型或类型元组')
        self.expected_type = expected_type
        self.default = default
        # 内部存储键名，由 __set_name__ 自动设置
        self._storage_name = None
    
    def __set_name__(self, owner, name):
        # 在类创建时自动调用，获知字段名
        # owner 是定义该描述符的类，name 是字段在类中的属性名
        self._storage_name = f'_typed_{name}'
        self.name = name
    
    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        # 返回存储值，若不存在则返回默认值
        return obj.__dict__.get(self._storage_name, self.default)
    
    def __set__(self, obj, value):
        # 类型校验
        if not isinstance(value, self.expected_type):
            actual_type = type(value).__name__
            expected_name = (
                self.expected_type.__name__ 
                if isinstance(self.expected_type, type)
                else ' or '.join(t.__name__ for t in self.expected_type)
            )
            raise TypeError(
                f'字段 {self.name!r} 期望类型 {expected_name}，'
                f'实际收到 {actual_type!r}'
            )
        obj.__dict__[self._storage_name] = value
    
    def __delete__(self, obj):
        if self._storage_name in obj.__dict__:
            del obj.__dict__[self._storage_name]
        else:
            raise AttributeError(f'字段 {self.name!r} 不存在')


class User:
    """使用 TypedField 进行字段类型校验的用户模型"""
    
    name = TypedField(str)
    age = TypedField(int)
    email = TypedField((str, type(None)))  # 允许 str 或 None
    
    def __init__(self, name, age, email=None):
        self.name = name
        self.age = age
        self.email = email


# 测试
user = User('Alice', 30, 'alice@example.com')
print(user.name, user.age, user.email)  # Alice 30 alice@example.com

# 类型校验失败
try:
    user.age = '三十'  # 期望 int，收到 str
except TypeError as e:
    print(f'校验失败: {e}')

# email 允许 None
user.email = None
print(user.email)  # None
```

### 5.3 范围校验描述符

```python
# 范围校验描述符：在类型校验基础上增加范围检查

class RangeField:
    """带范围校验的数据描述符
    
    支持类型校验、最小值校验、最大值校验。
    可用于数值字段、字符串长度、集合大小等多种场景。
    """
    
    def __init__(self, type_, min_val=None, max_val=None, default=None):
        self.type_ = type_
        self.min_val = min_val
        self.max_val = max_val
        self.default = default
        self._storage_name = None
        self.name = None
    
    def __set_name__(self, owner, name):
        self._storage_name = f'_range_{name}'
        self.name = name
    
    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        return obj.__dict__.get(self._storage_name, self.default)
    
    def __set__(self, obj, value):
        # 第 1 步：类型校验
        if not isinstance(value, self.type_):
            raise TypeError(
                f'字段 {self.name!r} 期望 {self.type_.__name__}，'
                f'收到 {type(value).__name__}'
            )
        # 第 2 步：最小值校验
        if self.min_val is not None and value < self.min_val:
            raise ValueError(
                f'字段 {self.name!r} 值 {value!r} 小于最小值 {self.min_val}'
            )
        # 第 3 步：最大值校验
        if self.max_val is not None and value > self.max_val:
            raise ValueError(
                f'字段 {self.name!r} 值 {value!r} 大于最大值 {self.max_val}'
            )
        obj.__dict__[self._storage_name] = value


class Product:
    """商品模型，演示范围校验"""
    
    # 价格必须是非负数，且不超过 100000
    price = RangeField((int, float), min_val=0, max_val=100000)
    # 库存必须是整数，且在 0 到 10000 之间
    stock = RangeField(int, min_val=0, max_val=10000)
    # 折扣率必须是 0 到 1 之间的浮点数
    discount = RangeField(float, min_val=0.0, max_val=1.0, default=1.0)
    
    def __init__(self, price, stock, discount=1.0):
        self.price = price
        self.stock = stock
        self.discount = discount


# 测试
p = Product(99.9, 100, 0.8)
print(f'价格: {p.price}, 库存: {p.stock}, 折扣: {p.discount}')

# 范围校验失败
try:
    p.price = -10
except ValueError as e:
    print(f'校验失败: {e}')

try:
    p.discount = 1.5
except ValueError as e:
    print(f'校验失败: {e}')
```

### 5.4 惰性计算属性（Lazy Property）

```python
# 惰性计算属性：首次访问时计算，后续访问直接返回缓存值

class LazyProperty:
    """惰性计算描述符
    
    首次访问时调用计算函数，并将结果缓存到实例字典。
    后续访问直接从实例字典读取，跳过描述符的 __get__ 调用。
    
    这是 functools.cached_property 的简化实现。
    利用非数据描述符的优先级低于实例字典这一特性实现缓存。
    """
    
    def __init__(self, func):
        # 接收被装饰的函数
        self.func = func
        # 缓存键名
        self.name = func.__name__
        # 保留函数元信息
        self.__doc__ = func.__doc__
        self.__name__ = func.__name__
    
    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        # 调用计算函数获取值
        value = self.func(obj)
        # 将结果写入实例字典
        # 由于 LazyProperty 是非数据描述符（无 __set__），
        # 后续访问会直接命中实例字典，跳过 __get__
        obj.__dict__[self.name] = value
        return value


class DataFrame:
    """演示惰性计算的 DataFrame 模型"""
    
    def __init__(self, data):
        self.data = data
    
    @LazyProperty
    def row_count(self):
        """计算行数（模拟耗时操作）"""
        print('  [计算 row_count]')
        return len(self.data)
    
    @LazyProperty
    def column_count(self):
        """计算列数（模拟耗时操作）"""
        print('  [计算 column_count]')
        if not self.data:
            return 0
        return len(self.data[0])
    
    @LazyProperty
    def summary(self):
        """生成汇总信息"""
        print('  [计算 summary]')
        return {
            'rows': self.row_count,
            'cols': self.column_count,
        }


# 测试
df = DataFrame([[1, 2, 3], [4, 5, 6], [7, 8, 9]])

print('首次访问 row_count:')
print(f'  结果: {df.row_count}')

print('再次访问 row_count:')
print(f'  结果: {df.row_count}')  # 不会打印 [计算 row_count]

print('访问 summary:')
print(f'  结果: {df.summary}')

# 查看实例字典，确认缓存已写入
print(f'实例字典: {df.__dict__}')
```

### 5.5 只读属性描述符

```python
# 只读属性描述符：禁止在初始化后修改属性值

class ReadOnly:
    """只读描述符
    
    值只能在 __init__ 中通过特殊机制设置一次，
    之后任何赋值尝试都会抛出 AttributeError。
    """
    
    def __init__(self):
        self._storage_name = None
    
    def __set_name__(self, owner, name):
        self._storage_name = f'_readonly_{name}'
        self.name = name
    
    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        return obj.__dict__.get(self._storage_name)
    
    def __set__(self, obj, value):
        # 检查是否已设置
        if self._storage_name in obj.__dict__:
            raise AttributeError(
                f'只读属性 {self.name!r} 不可修改'
            )
        # 首次设置允许（用于 __init__）
        obj.__dict__[self._storage_name] = value
    
    def __delete__(self, obj):
        raise AttributeError(f'只读属性 {self.name!r} 不可删除')


class Configuration:
    """配置类，关键字段只读"""
    
    host = ReadOnly()
    port = ReadOnly()
    
    def __init__(self, host, port):
        # 在 __init__ 中首次设置允许
        self.host = host
        self.port = port


# 测试
config = Configuration('localhost', 8080)
print(f'{config.host}:{config.port}')

# 尝试修改只读属性
try:
    config.host = '0.0.0.0'
except AttributeError as e:
    print(f'修改失败: {e}')

# 尝试删除只读属性
try:
    del config.port
except AttributeError as e:
    print(f'删除失败: {e}')
```

### 5.6 ORM 字段基类

```python
# ORM 字段基类：模拟 Django/SQLAlchemy 的字段定义机制

class Field:
    """ORM 字段基类
    
    所有具体字段类型（CharField、IntegerField 等）的父类。
    通过 __set_name__ 自动收集字段元信息。
    通过 __get__、__set__ 实现字段值的读写与校验。
    """
    
    # 字段类型（子类覆盖）
    field_type = None
    
    def __init__(self, primary_key=False, nullable=True, default=None):
        self.primary_key = primary_key
        self.nullable = nullable
        self.default = default
        self.name = None
        self._storage_name = None
    
    def __set_name__(self, owner, name):
        self.name = name
        self._storage_name = f'_field_{name}'
        # 自动登记字段到 owner 的 _meta 元信息中
        if not hasattr(owner, '_meta'):
            owner._meta = {'fields': []}
        owner._meta['fields'].append(self)
    
    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        if self._storage_name not in obj.__dict__:
            return self.default
        return obj.__dict__[self._storage_name]
    
    def __set__(self, obj, value):
        # 校验空值
        if value is None:
            if not self.nullable:
                raise ValueError(f'字段 {self.name!r} 不可为空')
        else:
            # 类型校验
            if self.field_type and not isinstance(value, self.field_type):
                raise TypeError(
                    f'字段 {self.name!r} 期望 {self.field_type.__name__}，'
                    f'收到 {type(value).__name__}'
                )
        obj.__dict__[self._storage_name] = value
    
    def to_db(self, value):
        """将 Python 值转换为数据库存储值（子类可覆盖）"""
        return value
    
    def to_python(self, db_value):
        """将数据库值转换为 Python 值（子类可覆盖）"""
        return db_value


class CharField(Field):
    """字符串字段"""
    field_type = str
    
    def __init__(self, max_length=255, **kwargs):
        super().__init__(**kwargs)
        self.max_length = max_length
    
    def __set__(self, obj, value):
        if value is not None:
            if not isinstance(value, str):
                raise TypeError(
                    f'字段 {self.name!r} 期望 str，收到 {type(value).__name__}'
                )
            if len(value) > self.max_length:
                raise ValueError(
                    f'字段 {self.name!r} 长度 {len(value)} 超过最大值 {self.max_length}'
                )
        super().__set__(obj, value)


class IntegerField(Field):
    """整数字段"""
    field_type = int
    
    def __init__(self, min_val=None, max_val=None, **kwargs):
        super().__init__(**kwargs)
        self.min_val = min_val
        self.max_val = max_val
    
    def __set__(self, obj, value):
        if value is not None and isinstance(value, int):
            if self.min_val is not None and value < self.min_val:
                raise ValueError(
                    f'字段 {self.name!r} 值 {value} 小于最小值 {self.min_val}'
                )
            if self.max_val is not None and value > self.max_val:
                raise ValueError(
                    f'字段 {self.name!r} 值 {value} 大于最大值 {self.max_val}'
                )
        super().__set__(obj, value)


class DateTimeField(Field):
    """日期时间字段"""
    field_type = None  # 类型在 __set__ 中动态检查
    
    def __set__(self, obj, value):
        if value is not None:
            from datetime import datetime
            if not isinstance(value, datetime):
                raise TypeError(
                    f'字段 {self.name!r} 期望 datetime，收到 {type(value).__name__}'
                )
        super().__set__(obj, value)


class Model:
    """模型基类"""
    
    def __init__(self, **kwargs):
        # 按 _meta 中登记的字段顺序赋值
        for field in self._meta['fields']:
            if field.name in kwargs:
                setattr(self, field.name, kwargs[field.name])
            elif field.default is not None:
                setattr(self, field.name, field.default)
            elif not field.nullable:
                raise ValueError(f'必填字段 {field.name!r} 未提供')
    
    def __repr__(self):
        fields = []
        for field in self._meta['fields']:
            value = getattr(self, field.name, None)
            fields.append(f'{field.name}={value!r}')
        return f'{type(self).__name__}({", ".join(fields)})'


class User(Model):
    """用户模型，使用 ORM 字段定义"""
    
    id = IntegerField(primary_key=True, nullable=False)
    username = CharField(max_length=50, nullable=False)
    email = CharField(max_length=100, nullable=True)
    age = IntegerField(min_val=0, max_val=150, nullable=True)
    created_at = DateTimeField(nullable=True)


# 测试
user = User(
    id=1,
    username='alice',
    email='alice@example.com',
    age=30,
)
print(user)

# 字段校验
try:
    user.age = 200  # 超过最大值
except ValueError as e:
    print(f'校验失败: {e}')

try:
    user.username = 'a' * 100  # 超过最大长度
except ValueError as e:
    print(f'校验失败: {e}')

# 查看字段元信息
print('\n字段元信息:')
for field in User._meta['fields']:
    print(f'  {field.name}: type={field.field_type}, '
          f'nullable={field.nullable}, pk={field.primary_key}')
```

### 5.7 外键关系字段

```python
# 外键关系字段：模拟 ORM 的外键与关联对象访问

class ForeignKey:
    """外键描述符
    
    存储 关联对象 ID，访问时惰性加载关联对象。
    这是 ORM 实现"延迟加载"（lazy loading）的经典手段。
    """
    
    def __init__(self, related_model, nullable=True):
        self.related_model = related_model
        self.nullable = nullable
        self.name = None
        self._id_storage = None
    
    def __set_name__(self, owner, name):
        self.name = name
        self._id_storage = f'_fk_id_{name}'
        self._obj_storage = f'_fk_obj_{name}'
    
    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        # 检查缓存
        cached = obj.__dict__.get(self._obj_storage, '_missing_')
        if cached != '_missing_':
            return cached
        # 惰性加载
        related_id = obj.__dict__.get(self._id_storage)
        if related_id is None:
            return None
        # 模拟从数据库加载（实际场景中是数据库查询）
        related_obj = self._load_from_db(related_id)
        # 缓存加载结果
        obj.__dict__[self._obj_storage] = related_obj
        return related_obj
    
    def __set__(self, obj, value):
        if value is None:
            if not self.nullable:
                raise ValueError(f'外键 {self.name!r} 不可为空')
            obj.__dict__[self._id_storage] = None
            obj.__dict__[self._obj_storage] = None
            return
        # 接受关联对象实例或 ID
        if isinstance(value, self.related_model):
            obj.__dict__[self._id_storage] = value.id
            obj.__dict__[self._obj_storage] = value
        elif isinstance(value, int):
            obj.__dict__[self._id_storage] = value
            obj.__dict__.pop(self._obj_storage, None)  # 清除缓存
        else:
            raise TypeError(
                f'外键 {self.name!r} 期望 {self.related_model.__name__} 或 int，'
                f'收到 {type(value).__name__}'
            )
    
    def _load_from_db(self, related_id):
        """模拟从数据库加载关联对象"""
        # 实际场景中是 SELECT * FROM table WHERE id = ?
        print(f'  [数据库查询] 加载 {self.related_model.__name__} id={related_id}')
        return self.related_model._db.get(related_id)


# 模拟数据库存储
class Author:
    _db = {}
    
    def __init__(self, id, name):
        self.id = id
        self.name = name
        Author._db[id] = self
    
    def __repr__(self):
        return f'Author(id={self.id}, name={self.name!r})'


class Book:
    """图书模型，包含对 Author 的外键"""
    
    author = ForeignKey(Author, nullable=False)
    
    def __init__(self, id, title, author):
        self.id = id
        self.title = title
        self.author = author
    
    def __repr__(self):
        return f'Book(id={self.id}, title={self.title!r}, author={self.author})'


# 准备测试数据
author1 = Author(1, 'Alice')
author2 = Author(2, 'Bob')

# 创建图书，通过 ID 关联作者
book = Book(101, 'Python 进阶', 1)  # 通过 ID 关联
print('首次访问 author:')
print(f'  {book.author}')  # 触发数据库查询

print('再次访问 author:')
print(f'  {book.author}')  # 直接返回缓存，不查询

# 通过对象实例关联
book.author = author2
print(f'修改后: {book.author}')  # 直接返回缓存对象
```

### 5.8 自定义 property 装饰器

```python
# 自定义 property 装饰器：从零实现 property 的核心机制

class MyProperty:
    """从零实现的 property 装饰器
    
    演示 property 的内部机制：本质上是数据描述符的工厂。
    """
    
    def __init__(self, fget=None, fset=None, fdel=None, doc=None):
        self.fget = fget
        self.fset = fset
        self.fdel = fdel
        self.__doc__ = doc or (fget.__doc__ if fget else None)
        self.name = fget.__name__ if fget else None
    
    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        if self.fget is None:
            raise AttributeError(f'属性 {self.name!r} 不可读')
        return self.fget(obj)
    
    def __set__(self, obj, value):
        if self.fset is None:
            raise AttributeError(f'属性 {self.name!r} 不可写')
        self.fset(obj, value)
    
    def __delete__(self, obj):
        if self.fdel is None:
            raise AttributeError(f'属性 {self.name!r} 不可删')
        self.fdel(obj)
    
    # 提供装饰器风格的 API
    def getter(self, fget):
        return type(self)(fget, self.fset, self.fdel, self.__doc__)
    
    def setter(self, fset):
        return type(self)(self.fget, fset, self.fdel, self.__doc__)
    
    def deleter(self, fdel):
        return type(self)(self.fget, self.fset, fdel, self.__doc__)


class Temperature:
    """温度类，演示自定义 property"""
    
    def __init__(self, celsius):
        self.celsius = celsius
    
    @MyProperty
    def fahrenheit(self):
        """华氏温度（计算属性）"""
        return self.celsius * 9 / 5 + 32
    
    @fahrenheit.setter
    def fahrenheit(self, value):
        if value < -459.67:
            raise ValueError('低于绝对零度')
        self.celsius = (value - 32) * 5 / 9


# 测试
t = Temperature(100)
print(f'100°C = {t.fahrenheit}°F')  # 212.0

t.fahrenheit = 32
print(f'32°F = {t.celsius}°C')  # 0.0

try:
    t.fahrenheit = -500  # 低于绝对零度
except ValueError as e:
    print(f'校验失败: {e}')
```

### 5.9 描述符与元类协作

```python
# 描述符与元类协作：实现自动字段校验与元信息收集

class FieldMeta(type):
    """元类：在类创建时收集所有字段描述符
    
    通过遍历类字典，识别 Field 实例，构建字段元信息表。
    这是 dataclasses、Pydantic 等库的核心机制。
    """
    
    def __new__(mcs, name, bases, namespace):
        # 第 1 步：先让 type.__new__ 创建类，触发各字段的 __set_name__
        cls = super().__new__(mcs, name, bases, namespace)
        
        # 第 2 步：收集字段信息
        fields = {}
        # 遍历 MRO 链上的所有类
        for base in reversed(cls.__mro__):
            for key, value in vars(base).items():
                if isinstance(value, ValidatedField):
                    fields[key] = value
        
        # 将字段信息附加到类
        cls._fields = fields
        cls._field_names = list(fields.keys())
        
        return cls


class ValidatedField:
    """可校验字段描述符基类"""
    
    def __init__(self, **kwargs):
        self.name = None
        self._storage_name = None
        self.required = kwargs.get('required', False)
        self.default = kwargs.get('default', None)
    
    def __set_name__(self, owner, name):
        self.name = name
        self._storage_name = f'_validated_{name}'
    
    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        if self._storage_name not in obj.__dict__:
            return self.default
        return obj.__dict__[self._storage_name]
    
    def __set__(self, obj, value):
        # 调用子类定义的校验逻辑
        self.validate(value)
        obj.__dict__[self._storage_name] = value
    
    def validate(self, value):
        """子类覆盖此方法实现具体校验"""
        if self.required and value is None:
            raise ValueError(f'字段 {self.name!r} 必填')


class StringType(ValidatedField):
    """字符串类型字段"""
    
    def __init__(self, max_length=None, min_length=None, **kwargs):
        super().__init__(**kwargs)
        self.max_length = max_length
        self.min_length = min_length
    
    def validate(self, value):
        super().validate(value)
        if value is None:
            return
        if not isinstance(value, str):
            raise TypeError(f'字段 {self.name!r} 期望 str')
        if self.max_length and len(value) > self.max_length:
            raise ValueError(
                f'字段 {self.name!r} 长度 {len(value)} 超过 {self.max_length}'
            )
        if self.min_length and len(value) < self.min_length:
            raise ValueError(
                f'字段 {self.name!r} 长度 {len(value)} 小于 {self.min_length}'
            )


class IntegerType(ValidatedField):
    """整数类型字段"""
    
    def __init__(self, min_val=None, max_val=None, **kwargs):
        super().__init__(**kwargs)
        self.min_val = min_val
        self.max_val = max_val
    
    def validate(self, value):
        super().validate(value)
        if value is None:
            return
        if not isinstance(value, int):
            raise TypeError(f'字段 {self.name!r} 期望 int')
        if self.min_val is not None and value < self.min_val:
            raise ValueError(f'字段 {self.name!r} 值 {value} 小于 {self.min_val}')
        if self.max_val is not None and value > self.max_val:
            raise ValueError(f'字段 {self.name!r} 值 {value} 大于 {self.max_val}')


class Schema(metaclass=FieldMeta):
    """使用 FieldMeta 元类的 Schema 基类"""
    
    def __init__(self, **kwargs):
        for name in self._field_names:
            if name in kwargs:
                setattr(self, name, kwargs[name])
            elif self._fields[name].required:
                raise ValueError(f'必填字段 {name!r} 未提供')
    
    def to_dict(self):
        """序列化为字典"""
        return {
            name: getattr(self, name)
            for name in self._field_names
        }
    
    @classmethod
    def from_dict(cls, data):
        """从字典反序列化"""
        return cls(**data)


class UserSchema(Schema):
    """用户 Schema"""
    
    username = StringType(min_length=3, max_length=20, required=True)
    age = IntegerType(min_val=0, max_val=150, required=True)
    email = StringType(max_length=100, required=False)


# 测试
user = UserSchema(username='alice', age=30, email='alice@example.com')
print(f'用户: {user.to_dict()}')

# 校验失败
try:
    user.age = '三十'
except TypeError as e:
    print(f'校验失败: {e}')

try:
    user.username = 'ab'  # 长度不足
except ValueError as e:
    print(f'校验失败: {e}')

# 查看字段元信息
print('\nSchema 字段元信息:')
for name in UserSchema._field_names:
    field = UserSchema._fields[name]
    print(f'  {name}: {type(field).__name__}, required={field.required}')
```

### 5.10 描述符实现类方法与静态方法

```python
# 描述符实现类方法与静态方法：从零实现 classmethod 与 staticmethod

class MyClassMethod:
    """从零实现的 classmethod
    
    classmethod 本质上是非数据描述符：
    - 实现 __get__，返回绑定到类的方法
    - 不实现 __set__，因此实例属性可覆盖（虽然不推荐）
    """
    
    def __init__(self, func):
        self.func = func
    
    def __get__(self, obj, objtype=None):
        # classmethod 绑定到类，而非实例
        # objtype 是类本身
        if objtype is None:
            objtype = type(obj)
        
        # 返回一个绑定到类的可调用对象
        def bound_method(*args, **kwargs):
            return self.func(objtype, *args, **kwargs)
        
        # 保留方法元信息
        bound_method.__name__ = self.func.__name__
        bound_method.__doc__ = self.func.__doc__
        return bound_method


class MyStaticMethod:
    """从零实现的 staticmethod
    
    staticmethod 是最简单的描述符：
    - 实现 __get__，返回原始函数
    - 不绑定 self 或 cls
    """
    
    def __init__(self, func):
        self.func = func
    
    def __get__(self, obj, objtype=None):
        # staticmethod 不做任何绑定，直接返回原函数
        return self.func


class MathHelper:
    """演示自定义 classmethod 与 staticmethod"""
    
    @MyClassMethod
    def from_string(cls, s):
        """从字符串构造实例"""
        return cls(int(s))
    
    @MyStaticMethod
    def is_positive(n):
        """判断是否为正数"""
        return n > 0
    
    def __init__(self, value):
        self.value = value


# 测试
m = MathHelper.from_string('42')
print(f'构造结果: {m.value}')  # 42

print(f'is_positive(10): {MathHelper.is_positive(10)}')  # True
print(f'is_positive(-5): {MathHelper.is_positive(-5)}')  # False
```

### 5.11 弱引用键描述符

```python
# 弱引用键描述符：避免在描述符实例上存储实例状态

import weakref


class WeakDescriptor:
    """使用弱引用存储实例状态的描述符
    
    传统描述符的常见陷阱：直接在描述符实例上存储值会导致所有实例共享同一份数据。
    使用 WeakKeyDictionary 可以正确按实例隔离存储。
    """
    
    def __init__(self):
        self.name = None
        # 使用弱引用字典，避免内存泄漏
        self._storage = weakref.WeakKeyDictionary()
    
    def __set_name__(self, owner, name):
        self.name = name
    
    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        return self._storage.get(obj, None)
    
    def __set__(self, obj, value):
        self._storage[obj] = value
    
    def __delete__(self, obj):
        if obj in self._storage:
            del self._storage[obj]
        else:
            raise AttributeError(f'属性 {self.name!r} 不存在')


class Session:
    """会话类，演示弱引用描述符"""
    
    user_id = WeakDescriptor()
    token = WeakDescriptor()
    
    def __init__(self, user_id, token):
        self.user_id = user_id
        self.token = token


# 测试
s1 = Session(1, 'token-1')
s2 = Session(2, 'token-2')

print(f's1: user_id={s1.user_id}, token={s1.token}')
print(f's2: user_id={s2.user_id}, token={s2.token}')

# 删除 s1 后，其数据自动从弱引用字典中清除
del s1
import gc
gc.collect()
# 弱引用字典中只剩 s2 的数据
print('s1 被删除后，弱引用字典自动清理')
```

### 5.12 描述符实现观察者模式

```python
# 描述符实现观察者模式：属性变化时通知监听器

class ObservableField:
    """可观察字段描述符
    
    当属性值变化时，自动通知所有注册的监听器。
    适用于响应式编程、数据绑定、事件驱动架构。
    """
    
    def __init__(self, default=None):
        self.default = default
        self.name = None
        self._storage_name = None
    
    def __set_name__(self, owner, name):
        self.name = name
        self._storage_name = f'_observable_{name}'
    
    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        return obj.__dict__.get(self._storage_name, self.default)
    
    def __set__(self, obj, value):
        old_value = obj.__dict__.get(self._storage_name, self.default)
        # 仅在值变化时触发通知
        if old_value != value:
            obj.__dict__[self._storage_name] = value
            self._notify(obj, old_value, value)
    
    def _notify(self, obj, old_value, new_value):
        """通知所有监听器"""
        listeners = getattr(obj, '_listeners', {}).get(self.name, [])
        for listener in listeners:
            listener(obj, self.name, old_value, new_value)


class Observable:
    """可观察对象基类"""
    
    def __init__(self):
        # 监听器字典：{field_name: [listener_functions]}
        object.__setattr__(self, '_listeners', {})
    
    def add_listener(self, field_name, listener):
        """添加监听器"""
        if field_name not in self._listeners:
            self._listeners[field_name] = []
        self._listeners[field_name].append(listener)
    
    def remove_listener(self, field_name, listener):
        """移除监听器"""
        if field_name in self._listeners:
            self._listeners[field_name].remove(listener)


class ShoppingCart(Observable):
    """购物车，演示可观察字段"""
    
    item_count = ObservableField(default=0)
    total_price = ObservableField(default=0.0)


# 测试
cart = ShoppingCart()

# 注册监听器
def log_change(obj, field_name, old_value, new_value):
    print(f'  [日志] {field_name}: {old_value} -> {new_value}')

def update_discount(obj, field_name, old_value, new_value):
    if field_name == 'total_price' and new_value > 1000:
        print(f'  [折扣] 总价 {new_value} 超过 1000，可享受 9 折')

cart.add_listener('item_count', log_change)
cart.add_listener('total_price', log_change)
cart.add_listener('total_price', update_discount)

# 修改属性，自动触发监听器
print('修改 item_count:')
cart.item_count = 5

print('修改 total_price:')
cart.total_price = 1500

print('total_price 不变（不触发通知）:')
cart.total_price = 1500
```

## 6. 对比分析

本节将描述符与 Python 中其他属性访问拦截机制进行对比，帮助读者在工程实践中选择最合适的方案。

### 6.1 描述符 vs property vs `__getattr__` vs `__setattr__`

| 维度 | 描述符 | property | `__getattr__` | `__setattr__` |
|------|--------|----------|---------------|---------------|
| 作用范围 | 单个字段 | 单个字段 | 所有未找到的属性 | 所有属性 |
| 优先级 | 数据描述符最高 | 数据描述符最高 | 兜底 | 兜底 |
| 复用性 | 高（一个类可被多个类使用） | 中（每个字段需重新定义） | 低（每个类需重写） | 低 |
| 性能 | 接近原生效 | 接近原生效 | 较慢（每次都触发） | 较慢 |
| 适用场景 | 字段类型、ORM、Schema | 简单计算属性、读写校验 | 动态属性、代理对象 | 全局属性控制 |
| 代码复杂度 | 中 | 低 | 高 | 高 |
| 子类继承 | 友好（自动继承） | 友好 | 需 super 协作 | 需 super 协作 |

**论述**：

- **描述符**适合需要"可复用字段类型"的场景，例如 ORM 字段、校验字段、关系字段。一个 `IntegerField` 描述符类可以被任意多个模型类使用，复用性远高于 `property`。
- **property**适合简单场景，例如一个类的某个字段需要校验或计算，且不需要复用。`property` 本质上是数据描述符的语法糖，但每个字段都要写一组 `@property` + `@xxx.setter`，复用性差。
- **`__getattr__`**只在属性未找到时触发，适合动态属性、代理对象（如 `__getattr__` 转发到内部对象）。不适合做字段校验，因为校验字段在实例字典中存在时不会触发 `__getattr__`。
- **`__setattr__`**在所有属性赋值时触发，适合全局性控制（如禁止动态属性、统一序列化）。但每个赋值都要经过它，性能开销大，且容易写出递归调用（在 `__setattr__` 内部又赋值）。

### 6.2 描述符 vs `@dataclass` vs Pydantic vs attrs

| 维度 | 自定义描述符 | `@dataclass` | Pydantic | attrs |
|------|--------------|--------------|----------|-------|
| 学习成本 | 高 | 低 | 低 | 中 |
| 字段校验 | 完全自定义 | 需 `__post_init__` | 内置丰富 | 内置基础 |
| 类型注解 | 可选 | 必需 | 必需 | 必需 |
| 序列化 | 需手动实现 | 需第三方 | 内置 | 需第三方 |
| 性能 | 取决于实现 | 原生 | 编译模式极快 | 原生 |
| 可扩展性 | 极高 | 中 | 高 | 高 |
| 适用场景 | 框架开发、特殊需求 | 简单数据类 | API 模型、配置 | 中等复杂模型 |

**论述**：

- 自定义描述符是底层机制，适合开发框架或库（如自研 ORM、配置系统）。日常业务代码不推荐直接使用。
- `@dataclass`是 Python 标准库提供的轻量数据类方案，适合简单 DTO（Data Transfer Object）。校验需在 `__post_init__` 中手动实现。
- Pydantic 是当前 Python 生态中最流行的数据校验库，FastAPI、LangChain 等均深度依赖。其 v2 版本用 Rust 重写了核心，性能极快。
- attrs 是 attrs 库提供的数据类方案，比 `@dataclass` 更早，功能更丰富，但社区热度不如 Pydantic。

### 6.3 数据描述符 vs 非数据描述符

| 维度 | 数据描述符 | 非数据描述符 |
|------|------------|--------------|
| 定义 | 实现 `__set__` 或 `__delete__` | 仅实现 `__get__` |
| 优先级 | 高于实例字典 | 低于实例字典 |
| 实例字典覆盖 | 不可（强制拦截） | 可（实例字典优先） |
| 典型代表 | `property`、ORM 字段 | `classmethod`、`staticmethod`、`cached_property` |
| 缓存能力 | 需自行实现 | 可借助实例字典实现缓存 |
| 适用场景 | 校验、计算属性、只读 | 方法绑定、惰性计算 |

**论述**：

数据描述符的核心价值是"强制拦截"——无论开发者如何赋值，都会经过描述符的 `__set__`。这使其成为字段校验的首选。非数据描述符则更灵活，允许实例字典覆盖，适合方法绑定（`classmethod`）和惰性计算（`cached_property`）。

`functools.cached_property` 巧妙利用非数据描述符的特性：首次访问时通过 `__get__` 计算并写入实例字典，后续访问因实例字典优先而直接返回缓存值，跳过 `__get__`。这是非数据描述符的经典应用。

## 7. 常见陷阱与反模式

本节列举描述符使用中的常见陷阱与反模式，每个陷阱均附生产事故案例。

### 7.1 陷阱一：在描述符实例上存储实例状态

**问题描述**：初学者常在描述符实例的 `__dict__` 上直接存储实例属性值，导致所有类的实例共享同一份数据。

**错误示例**：

```python
class BadField:
    def __init__(self):
        self.value = None  # 错误：在描述符实例上存储
    
    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        return self.value
    
    def __set__(self, obj, value):
        self.value = value  # 错误：所有实例共享同一个 self.value


class Model:
    field = BadField()


# 测试：实例间数据串扰
m1 = Model()
m2 = Model()
m1.field = 'Alice'
print(m2.field)  # 输出 'Alice'，而非 None —— 数据串扰！
```

**生产事故案例**：某团队开发用户会话管理模块，使用描述符存储会话状态。上线后发现用户 A 的会话数据被用户 B 看到。根因是描述符在实例上存储状态，导致所有用户共享同一份数据。事后通过 `WeakKeyDictionary` 修复，但已造成用户数据泄露事故。

**正确做法**：

```python
import weakref

class GoodField:
    def __init__(self):
        # 使用弱引用字典，按实例隔离存储
        self._storage = weakref.WeakKeyDictionary()
    
    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        return self._storage.get(obj)
    
    def __set__(self, obj, value):
        self._storage[obj] = value
```

### 7.2 陷阱二：忘记处理 `obj is None` 的情况

**问题描述**：`__get__` 的 `obj` 参数在通过类访问时为 `None`。若忘记处理，会抛出 `AttributeError`。

**错误示例**：

```python
class BadGet:
    def __get__(self, obj, objtype=None):
        # 错误：未处理 obj is None
        return obj.value  # 通过类访问时 obj 为 None，抛出 AttributeError


class Model:
    attr = BadGet()


# 通过类访问触发错误
print(Model.attr)  # AttributeError: 'NoneType' object has no attribute 'value'
```

**正确做法**：

```python
class GoodGet:
    def __get__(self, obj, objtype=None):
        if obj is None:
            return self  # 通过类访问时返回描述符自身
        return obj._value
```

### 7.3 陷阱三：`__set__` 中递归调用自身

**问题描述**：在 `__set__` 中通过 `setattr(obj, name, value)` 赋值，会再次触发描述符的 `__set__`，导致无限递归。

**错误示例**：

```python
class RecursiveSet:
    def __set_name__(self, owner, name):
        self.name = name
    
    def __set__(self, obj, value):
        # 错误：setattr 会再次触发 __set__
        setattr(obj, self.name, value)  # 无限递归！
    
    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        return obj.__dict__.get(self.name)
```

**正确做法**：直接操作实例字典，避免 `setattr`：

```python
class SafeSet:
    def __set_name__(self, owner, name):
        self.name = name
        self._storage_name = f'_safe_{name}'
    
    def __set__(self, obj, value):
        # 直接写入实例字典，使用不同的键名
        obj.__dict__[self._storage_name] = value
    
    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        return obj.__dict__.get(self._storage_name)
```

### 7.4 陷阱四：描述符定义为实例属性

**问题描述**：描述符协议只对类属性生效。若定义为实例属性，描述符协议不会被触发。

**错误示例**：

```python
class Descriptor:
    def __get__(self, obj, objtype=None):
        return 'descriptor'


class Model:
    def __init__(self):
        # 错误：描述符定义为实例属性
        self.attr = Descriptor()


m = Model()
print(m.attr)  # 输出 <Descriptor object>，而非 'descriptor'
```

**正确做法**：描述符必须定义为类属性：

```python
class Model:
    attr = Descriptor()  # 正确：类属性


m = Model()
print(m.attr)  # 输出 'descriptor'
```

### 7.5 陷阱五：混淆数据描述符与非数据描述符的优先级

**问题描述**：误以为非数据描述符也能拦截赋值，导致校验逻辑失效。

**错误示例**：

```python
class NonDataValidator:
    """非数据描述符（仅 __get__）"""
    
    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        return obj.__dict__.get('value')
    
    # 缺少 __set__，因此是非数据描述符


class Model:
    attr = NonDataValidator()


m = Model()
m.attr = 'hello'  # 直接写入实例字典，不触发任何校验
print(m.attr)  # 'hello'
```

**正确做法**：若需校验赋值，必须实现 `__set__`，使其成为数据描述符。

### 7.6 陷阱六：忘记实现 `__set_name__` 导致存储键名冲突

**问题描述**：在 Python 3.6 之前，描述符需手动传入存储键名。若键名与描述符属性名相同，会导致递归或覆盖。

**错误示例**：

```python
class BadField:
    def __init__(self, name):
        self.name = name  # 存储键名与字段名相同
    
    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        return obj.__dict__.get(self.name)
    
    def __set__(self, obj, value):
        obj.__dict__[self.name] = value


class Model:
    attr = BadField('attr')  # 存储键名 'attr' 与字段名 'attr' 相同


m = Model()
m.attr = 'hello'
# m.__dict__ = {'attr': 'hello'}
# 但 m.attr 触发描述符 __get__，返回 obj.__dict__.get('attr') = 'hello'
# 看似正常，但若描述符实例自身有同名属性，会引发混乱
```

**正确做法**：使用 `__set_name__` 自动获取字段名，并使用带前缀的存储键名：

```python
class GoodField:
    def __set_name__(self, owner, name):
        self.name = name
        self._storage_name = f'_good_{name}'
    
    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        return obj.__dict__.get(self._storage_name)
    
    def __set__(self, obj, value):
        obj.__dict__[self._storage_name] = value
```

### 7.7 陷阱七：描述符与 `__slots__` 冲突

**问题描述**：`__slots__` 限制了实例可有的属性。若描述符的存储键名不在 `__slots__` 中，赋值会失败。

**错误示例**：

```python
class SlotField:
    def __set_name__(self, owner, name):
        self._storage_name = f'_slot_{name}'
    
    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        return getattr(obj, self._storage_name, None)
    
    def __set__(self, obj, value):
        setattr(obj, self._storage_name, value)  # 若 _storage_name 不在 __slots__，失败


class Model:
    __slots__ = ()  # 空 slots，不允许任何实例属性
    attr = SlotField()


m = Model()
m.attr = 'hello'  # AttributeError: 'Model' object has no attribute '_slot_attr'
```

**正确做法**：将描述符的存储键名加入 `__slots__`，或避免使用 `__slots__`：

```python
class Model:
    __slots__ = ('_slot_attr',)
    attr = SlotField()
```

### 7.8 陷阱八：描述符继承时的覆盖问题

**问题描述**：子类定义了与父类同名的描述符，会覆盖父类描述符。若两者存储键名相同，可能导致数据混乱。

**错误示例**：

```python
class Base:
    field = SomeField('field')


class Child(Base):
    field = SomeField('field')  # 覆盖父类描述符


c = Child()
c.field = 'hello'
# Child.field 与 Base.field 共用存储键名 'field'，可能导致数据混乱
```

**正确做法**：每个描述符使用唯一的存储键名，或使用 `__set_name__` 自动获取字段名并结合类名生成唯一键名。

### 7.9 陷阱九：描述符与多继承 MRO 的复杂性

**问题描述**：多继承下，描述符在 MRO 链上的查找顺序可能不符合预期，导致调用错误的描述符。

**建议**：使用 `super().__get__()` 显式调用父类描述符，确保 MRO 链上的正确查找。

### 7.10 陷阱十：性能敏感场景滥用描述符

**问题描述**：描述符的 `__get__` 与 `__set__` 涉及方法调用，比直接属性访问慢。在性能敏感的循环中滥用描述符可能导致性能瓶颈。

**生产事故案例**：某团队在量化交易系统中使用描述符封装订单字段，每笔订单涉及数十次字段访问。在 10 万笔/秒的高频场景下，描述符开销导致系统延迟从 1ms 飙升至 5ms。事后通过 `__slots__` + 直接属性访问重构，延迟降至 1.2ms。

**建议**：性能敏感场景避免使用描述符，改用 `__slots__` 或直接属性访问。描述符适合 I/O 密集型或业务逻辑复杂的场景。

## 8. 工程实践

本节讨论描述符在生产环境中的最佳实践与性能优化策略。

### 8.1 命名约定

**存储键名命名约定**：描述符在实例字典中的存储键名应遵循统一约定，避免与用户属性冲突。推荐使用下划线前缀 + 字段名：

```python
class Field:
    def __set_name__(self, owner, name):
        self.name = name
        # 存储键名使用下划线前缀，避免与用户属性冲突
        self._storage_name = f'_field_{name}'
```

**字段登记约定**：使用 `__set_name__` 自动登记字段到类的元信息表中，便于后续遍历：

```python
class Field:
    def __set_name__(self, owner, name):
        self.name = name
        if not hasattr(owner, '_field_registry'):
            owner._field_registry = {}
        owner._field_registry[name] = self
```

### 8.2 类型注解

为描述符添加完整的类型注解，提升代码可读性与 IDE 支持：

```python
from typing import Any, Optional, Type, TypeVar

T = TypeVar('T')


class TypedField:
    """带类型校验的描述符"""
    
    def __init__(
        self,
        expected_type: Type[T],
        default: Optional[T] = None,
    ) -> None:
        self.expected_type: Type[T] = expected_type
        self.default: Optional[T] = default
        self.name: Optional[str] = None
        self._storage_name: Optional[str] = None
    
    def __set_name__(self, owner: type, name: str) -> None:
        self.name = name
        self._storage_name = f'_typed_{name}'
    
    def __get__(self, obj: Any, objtype: Optional[type] = None) -> Any:
        if obj is None:
            return self
        return obj.__dict__.get(self._storage_name, self.default)
    
    def __set__(self, obj: Any, value: Any) -> None:
        if value is not None and not isinstance(value, self.expected_type):
            raise TypeError(...)
        obj.__dict__[self._storage_name] = value
```

### 8.3 性能优化策略

**策略一：使用 `__slots__` 加速实例字典访问**

```python
class FastModel:
    __slots__ = ('_field_name', '_field_age')
    
    name = Field('name')
    age = Field('age')
```

`__slots__` 将实例属性存储在 tuple 而非 dict 中，访问速度更快，内存占用更小。

**策略二：缓存描述符查找结果**

CPython 内置的类型属性缓存可自动加速重复查找。对于自定义加速，可在描述符内部缓存计算结果：

```python
class CachedField:
    def __init__(self, func):
        self.func = func
        self.name = func.__name__
    
    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        # 检查实例字典缓存
        if self.name in obj.__dict__:
            return obj.__dict__[self.name]
        # 计算并缓存
        value = self.func(obj)
        obj.__dict__[self.name] = value
        return value
```

**策略三：避免在 `__get__` 中执行重计算**

`__get__` 在每次属性访问时被调用。若包含重计算，应缓存结果或使用惰性计算模式。

**策略四：使用 C 扩展描述符**

对于性能极致敏感的场景，可用 Cython 或 C 扩展实现描述符。NumPy、Pandas 等库大量使用 C 扩展描述符。

### 8.4 测试策略

**单元测试**：为每个描述符类编写完整的单元测试，覆盖正常路径、边界值、异常路径。

```python
import pytest


class TestTypedField:
    def test_normal_assignment(self):
        class Model:
            name = TypedField(str)
        
        m = Model()
        m.name = 'Alice'
        assert m.name == 'Alice'
    
    def test_type_check(self):
        class Model:
            age = TypedField(int)
        
        m = Model()
        with pytest.raises(TypeError):
            m.age = 'thirty'
    
    def test_class_access(self):
        class Model:
            name = TypedField(str)
        
        # 通过类访问应返回描述符自身
        assert isinstance(Model.name, TypedField)
    
    def test_default_value(self):
        class Model:
            age = TypedField(int, default=18)
        
        m = Model()
        assert m.age == 18
```

**属性测试**：使用 Hypothesis 等属性测试库，自动生成测试用例：

```python
from hypothesis import given, strategies as st


class TestRangeField:
    @given(st.integers(min_value=0, max_value=100))
    def test_valid_range(self, value):
        class Model:
            age = RangeField(int, min_val=0, max_val=100)
        
        m = Model()
        m.age = value
        assert m.age == value
    
    @given(st.integers(max_value=-1))
    def test_invalid_range(self, value):
        class Model:
            age = RangeField(int, min_val=0, max_val=100)
        
        m = Model()
        with pytest.raises(ValueError):
            m.age = value
```

### 8.5 文档与元信息

为描述符添加完整的 docstring 与元信息，便于 IDE 提示与文档生成：

```python
class Field:
    """字段描述符基类
    
    用于定义模型字段，支持类型校验、默认值、可空性等特性。
    
    Attributes:
        name: 字段名（由 __set_name__ 自动设置）
        field_type: 字段类型
        nullable: 是否允许为空
        default: 默认值
    
    Example:
        >>> class User:
        ...     name = Field(str, nullable=False)
        ...     age = Field(int, default=18)
        >>> user = User()
        >>> user.name = 'Alice'
        >>> user.name
        'Alice'
    """
    
    field_type: Optional[type] = None
    
    def __init__(
        self,
        field_type: Optional[type] = None,
        nullable: bool = True,
        default: Any = None,
    ) -> None:
        self.field_type = field_type
        self.nullable = nullable
        self.default = default
        self.name: Optional[str] = None
```

## 9. 案例研究

本节剖析真实开源项目中描述符的应用，帮助读者理解描述符在工业级代码中的实践。

### 9.1 案例一：Django ORM 的 Field 实现

Django ORM 的 `Field` 类是描述符协议的经典应用。每个 `Field` 实例是数据描述符，在模型类上定义，拦截属性读写。

**Django Field 简化版**：

```python
class Field:
    """Django ORM Field 的简化版
    
    源码位置: django/db/models/fields/__init__.py
    """
    
    # 字段元信息
    is_relation = False
    many_to_many = False
    many_to_one = False
    one_to_many = False
    one_to_one = False
    
    def __init__(self, verbose_name=None, name=None, primary_key=False,
                 unique=False, blank=False, null=False, default=None,
                 editable=True, **kwargs):
        self.verbose_name = verbose_name
        self.name = name
        self.primary_key = primary_key
        self.unique = unique
        self.blank = blank
        self.null = null
        self.default = default
        self.editable = editable
        self.is_relation = False
        self.remote_field = None
    
    def contribute_to_class(self, cls, name, private_only=False):
        """字段在类创建时被调用，注册到模型的 _meta 中"""
        self.name = name
        self.attname = self.get_attname()
        # 注册到 _meta
        cls._meta.add_field(self, private=private_only)
        # 设置描述符
        setattr(cls, name, self)
    
    def __get__(self, instance, cls=None):
        """读取字段值"""
        if instance is None:
            return self
        return instance.__dict__.get(self.attname)
    
    def __set__(self, instance, value):
        """写入字段值"""
        instance.__dict__[self.attname] = value
```

**关键设计点**：

1. `contribute_to_class` 机制：Django 使用元类 `ModelBase` 在类创建时调用 `Field.contribute_to_class`，将字段注册到 `_meta`。
2. `attname` 与 `name` 分离：`name` 是字段在 Python 中的属性名，`attname` 是在实例字典中的存储键名（通常相同，但外键不同）。
3. 延迟加载：外键字段通过 `ForeignKeyDeferredAttribute` 描述符实现延迟加载。

### 9.2 案例二：SQLAlchemy 的 AttributeDescriptor

SQLAlchemy 的 ORM 层使用描述符实现属性访问拦截。其核心是 `InstrumentedAttribute` 类，它包装了 SQL 列定义与 Python 属性访问。

**SQLAlchemy 描述符简化版**：

```python
class InstrumentedAttribute:
    """SQLAlchemy InstrumentedAttribute 的简化版
    
    源码位置: sqlalchemy/orm/attributes.py
    """
    
    def __init__(self, fget=None, fset=None, fdel=None, comparator=None):
        self.fget = fget
        self.fset = fset
        self.fdel = fdel
        self.comparator = comparator
    
    def __get__(self, obj, owner=None):
        if obj is None:
            # 类访问返回 InstrumentedAttribute 自身，支持查询构造
            return self
        # 实例访问返回实际值
        return self.fget(obj) if self.fget else None
    
    def __set__(self, obj, value):
        if self.fset:
            # 触发变更追踪
            self.fset(obj, value)
    
    def __delete__(self, obj):
        if self.fdel:
            self.fdel(obj)
```

**关键设计点**：

1. 类访问返回描述符自身：支持 `User.name == 'Alice'` 这样的查询构造语法。
2. 实例访问返回实际值：支持 `user.name` 读取数据。
3. 变更追踪：`__set__` 中触发变更事件，记录脏字段。

### 9.3 案例三：Pydantic v1 的 Field

Pydantic v1 使用描述符实现字段校验。Pydantic v2 改用 Rust 重写核心，但 v1 的描述符实现仍是经典案例。

**Pydantic v1 Field 简化版**：

```python
class Field:
    """Pydantic v1 Field 的简化版"""
    
    def __init__(self, default=None, type_=None, validator=None):
        self.default = default
        self.type_ = type_
        self.validator = validator
        self.name = None
    
    def __set_name__(self, owner, name):
        self.name = name
    
    def __get__(self, obj, owner=None):
        if obj is None:
            return self
        return obj.__dict__.get(self.name, self.default)
    
    def __set__(self, obj, value):
        # 类型校验
        if self.type_ and not isinstance(value, self.type_):
            value = self.type_(value)  # 尝试类型转换
        # 自定义校验器
        if self.validator:
            value = self.validator(value)
        obj.__dict__[self.name] = value
```

**关键设计点**：

1. 类型转换：赋值时若类型不符，尝试自动转换（如 `int('42')`）。
2. 自定义校验器：支持 `@validator` 装饰器定义的字段校验逻辑。
3. 默认值处理：支持可变默认值的深拷贝（避免共享）。

### 9.4 案例四：Django 的 cached_property

Django 的 `cached_property` 是非数据描述符的经典应用，Python 3.8 后被 `functools.cached_property` 替代。

**Django cached_property 实现**：

```python
class cached_property:
    """Django 的 cached_property 实现
    
    源码位置: django/utils/functional.py
    """
    
    def __init__(self, func, name=None):
        self.func = func
        self.__doc__ = getattr(func, '__doc__')
        self.name = name or func.__name__
    
    def __get__(self, instance, cls=None):
        if instance is None:
            return self
        # 计算并缓存到实例字典
        res = instance.__dict__[self.name] = self.func(instance)
        return res
```

**关键设计点**：

1. 非数据描述符：仅实现 `__get__`，无 `__set__`。
2. 实例字典优先：首次访问后，结果写入实例字典，后续访问直接命中实例字典，跳过 `__get__`。
3. 缓存清除：通过 `del instance.__dict__[name]` 可清除缓存，重新计算。

### 9.5 案例五：Flask 的 route 装饰器与描述符

Flask 的 `route` 装饰器虽然看似与描述符无关，但其内部的 `Flask.view_functions` 字典管理与基于描述符的视图类（CBV）机制深度协作。

**Flask CBV 简化版**：

```python
class MethodView:
    """Flask MethodView 简化版
    
    通过描述符实现方法分发
    """
    
    def __init__(self, view_class):
        self.view_class = view_class
    
    def __get__(self, obj, cls=None):
        # 返回可调用对象，根据请求方法分发
        def dispatch_request(*args, **kwargs):
            instance = self.view_class()
            method = request.method.lower()
            handler = getattr(instance, method, None)
            if handler is None:
                abort(405)
            return handler(*args, **kwargs)
        return dispatch_request
```

## 10. 习题

本节提供基础、进阶、挑战三个层次的习题，每道题附参考答案要点。

### 10.1 基础题

**题目 1**：编写一个 `PositiveInt` 描述符，要求赋值时必须是正整数，否则抛出 `ValueError`。

**参考答案要点**：
- 实现 `__set_name__` 自动获取字段名与存储键名。
- `__set__` 中检查 `isinstance(value, int)` 与 `value > 0`。
- 使用 `obj.__dict__[self._storage_name] = value` 存储。

**题目 2**：解释数据描述符与非数据描述符的核心区别，并各举一例。

**参考答案要点**：
- 区别：是否实现 `__set__` 或 `__delete__`。
- 数据描述符优先级高于实例字典，非数据描述符优先级低于实例字典。
- 数据描述符示例：`property`、ORM 字段。
- 非数据描述符示例：`classmethod`、`staticmethod`、`cached_property`。

**题目 3**：解释为什么描述符必须定义为类属性而非实例属性。

**参考答案要点**：
- 描述符协议由 `__getattribute__` 在类型的 MRO 链上查找时触发。
- 实例属性不在类型的 MRO 链上，因此描述符协议不会被触发。
- 实例属性访问直接返回对象本身，不调用 `__get__`。

### 10.2 进阶题

**题目 4**：编写一个 `LazyField` 描述符，首次访问时调用工厂函数计算值，后续访问直接返回缓存。要求：缓存写入实例字典，后续访问跳过描述符 `__get__`。

**参考答案要点**：
- 实现为非数据描述符（仅 `__get__`）。
- `__get__` 中检查实例字典是否已有缓存。
- 计算结果写入 `obj.__dict__[self.name]`。
- 由于非数据描述符优先级低于实例字典，后续访问直接命中缓存。

**题目 5**：实现一个 `ValidatedField` 描述符，支持多个校验器函数链式调用。每个校验器接收值，返回校验后的值或抛出异常。

**参考答案要点**：
- `__init__` 接收 `*validators` 参数。
- `__set__` 中依次调用 `value = validator(value)`。
- 任一校验器抛出异常即终止。

**题目 6**：实现一个 `Choice` 描述符，赋值时必须是预定义选项之一。

**参考答案要点**：
- `__init__` 接收 `choices` 列表。
- `__set__` 中检查 `value in self.choices`，否则抛出 `ValueError`。

### 10.3 挑战题

**题目 7**：实现一个微型 ORM 框架，包含 `Model` 基类、`Field` 字段基类、`CharField`、`IntegerField`、`ForeignKey` 字段类。要求：
- 自动收集字段元信息到 `_meta`。
- 支持从字典构造实例（`from_dict`）。
- 支持序列化为字典（`to_dict`）。
- 外键支持延迟加载。

**参考答案要点**：
- 使用元类 `FieldMeta` 在类创建时收集字段。
- `Field` 基类实现 `__set_name__`、`__get__`、`__set__`。
- `ForeignKey` 内部使用 `WeakKeyDictionary` 缓存关联对象。
- `Model.from_dict` 与 `Model.to_dict` 遍历 `_meta['fields']` 实现。

**题目 8**：实现一个 `Observable` 描述符，属性变化时通知所有监听器。要求：
- 监听器签名：`listener(instance, field_name, old_value, new_value)`。
- 仅在值变化时触发（值相同时不触发）。
- 支持添加与移除监听器。
- 支持弱引用监听器，避免内存泄漏。

**参考答案要点**：
- 使用 `WeakKeyDictionary` 或 `WeakSet` 存储监听器。
- `__set__` 中比较新旧值，仅在不同时触发监听器。
- 提供 `add_listener` 与 `remove_listener` 方法。

**题目 9**：分析 CPython 源码中 `object.__getattribute__` 的实现，绘制属性访问的完整流程图。要求标注每一步的优先级与可能的提前返回点。

**参考答案要点**：
- 入口：`slot_tp_getattribute_hook`。
- 调用 `_PyType_Lookup` 在 MRO 链上查找描述符。
- 检查是否为数据描述符，若是则调用 `tp_descr_get`。
- 查找实例字典。
- 检查是否为非数据描述符，若是则调用 `tp_descr_get`。
- 返回类属性。
- 调用 `__getattr__`。
- 抛出 `AttributeError`。

**题目 10**：设计一套支持字段校验、类型转换、序列化、反序列化的企业级 Schema 基类体系。要求：
- 支持嵌套 Schema（Schema 字段类型为另一个 Schema）。
- 支持列表字段（`ListField(ItemType)`）。
- 支持可选字段与必填字段。
- 支持自定义校验器。
- 性能优化：使用 `__slots__` 与缓存。

**参考答案要点**：
- `Schema` 基类使用元类 `SchemaMeta` 收集字段。
- `NestedField` 支持嵌套 Schema。
- `ListField` 支持列表字段，内部遍历校验每个元素。
- `from_dict` 与 `to_dict` 递归处理嵌套。
- 使用 `__slots__` 加速字段访问。

## 11. 参考文献

本节列出本篇文档参考的学术论文、官方文档、技术书籍，遵循 ACM Reference Format。

[1] Van Rossum, G. 2001. PEP 252: Making Types Look More Like Classes. Python Enhancement Proposals. https://peps.python.org/pep-0252/

[2] Van Rossum, G. 2001. PEP 253: Subtyping Built-in Types. Python Enhancement Proposals. https://peps.python.org/pep-0253/

[3] Hettinger, R. 2003. Descriptor HowTo Guide. Python Official Documentation. https://docs.python.org/3/howto/descriptor.html

[4] Hettinger, R. 2013. Python's Class Development Toolkit. PyCon 2013. https://www.youtube.com/watch?v=HTLu2D4LjRo

[5] Python Software Foundation. 2024. Python Language Reference: Invoking descriptors. https://docs.python.org/3/reference/datamodel.html#invoking-descriptors

[6] Python Software Foundation. 2024. Python Language Reference: Implementing Descriptors. https://docs.python.org/3/howto/descriptor.html

[7] Brandl, G. 2010. Sphinx Documentation: Descriptor Protocol. https://www.sphinx-doc.org/

[8] Lutz, M. 2013. Learning Python, 5th Edition. O'Reilly Media. ISBN: 978-1449355739

[9] Ramalho, L. 2022. Fluent Python, 2nd Edition. O'Reilly Media. ISBN: 978-1492056355

[10] Beazley, D. and Jones, B. K. 2013. Python Cookbook, 3rd Edition. O'Reilly Media. ISBN: 978-1449340377

[11] Holovaty, A. and Kaplan-Moss, J. 2024. Django Documentation: Models and databases. Django Software Foundation. https://docs.djangoproject.com/en/5.0/topics/db/models/

[12] Bayer, M. 2024. SQLAlchemy Documentation: ORM Attribute Instrumentation. https://docs.sqlalchemy.org/en/20/orm/

[13] Colvin, S. 2024. Pydantic Documentation: Fields. https://docs.pydantic.dev/latest/concepts/fields/

[14] PEP 487: Simpler customisation of class creation. 2017. Python Enhancement Proposals. https://peps.python.org/pep-0487/

[15] PEP 557: Data Classes. 2017. Python Enhancement Proposals. https://peps.python.org/pep-0557/

[16] Hunt, A. and Thomas, D. 1999. The Pragmatic Programmer: Your Journey to Mastery. Addison-Wesley. ISBN: 978-0201616224

[17] Fowler, M. 2002. Patterns of Enterprise Application Architecture. Addison-Wesley. ISBN: 978-0321127426. DOI: https://doi.org/10.5555/579257

[18] Brandl, G. 2010. The Python Tutorial: Classes. https://docs.python.org/3/tutorial/classes.html

[19] Kuchling, A. M. 2024. What's New in Python 3.6: PEP 487 - Simpler customisation of class creation. https://docs.python.org/3/whatsnew/3.6.html

[20] CPython Source Code. 2024. Objects/object.c: _PyObject_GenericGetAttrWithDict. https://github.com/python/cpython/blob/main/Objects/object.c

## 12. 延伸阅读

### 12.1 官方文档

- Python Descriptor HowTo Guide: https://docs.python.org/3/howto/descriptor.html
- Python Data Model: Invoking Descriptors: https://docs.python.org/3/reference/datamodel.html#invoking-descriptors
- Python Standard Library: functools.cached_property: https://docs.python.org/3/library/functools.html#functools.cached_property
- Python Standard Library: property: https://docs.python.org/3/library/functions.html#property
- PEP 252: Making Types Look More Like Classes: https://peps.python.org/pep-0252/
- PEP 253: Subtyping Built-in Types: https://peps.python.org/pep-0253/
- PEP 487: Simpler customisation of class creation: https://peps.python.org/pep-0487/

### 12.2 经典教材

- Luciano Ramalho. Fluent Python, 2nd Edition. O'Reilly Media, 2022.（第 19 章"属性与描述符"深入讨论描述符协议）
- Mark Lutz. Learning Python, 5th Edition. O'Reilly Media, 2013.（第 38 章覆盖描述符基础）
- David Beazley, Brian K. Jones. Python Cookbook, 3rd Edition. O'Reilly Media, 2013.（第 8 章"类与对象"包含多个描述符实战案例）
- Brett Slatkin. Effective Python, 2nd Edition. Addison-Wesley, 2019.（第 27 条"使用属性而非 get/set 方法"）

### 12.3 前沿论文与演讲

- Raymond Hettinger. Python's Class Development Toolkit. PyCon 2013.（描述符协议的最佳入门演讲）
- Raymond Hettinger. Beyond PEP 8. PyCon 2015.（讨论描述符在生产代码中的应用）
- Brett Slatkin. Pythonic Objects. PyCon 2018.（讨论数据类、描述符与对象模型）
- Hynek Schlawack. attrs: Attributes for Python. PyCon 2017.（attrs 库的设计哲学）
- Samuel Colvin. Pydantic v2: 10x faster, more features. PyCon 2023.（Pydantic v2 用 Rust 重写描述符核心）

### 12.4 开源项目源码

- CPython: Objects/object.c 与 Objects/descrobject.c（描述符协议的 C 实现）
- Django: django/db/models/fields/__init__.py（Django ORM 字段实现）
- SQLAlchemy: lib/sqlalchemy/orm/attributes.py（SQLAlchemy 属性描述符实现）
- Pydantic: pydantic/fields.py（Pydantic 字段实现）
- attrs: src/attr/_make.py（attrs 字段实现）
- Flask: src/flask/views.py（Flask MethodView 与描述符）

### 12.5 进阶主题

- 元类与描述符协作：理解元类如何收集描述符元信息。
- `__init_subclass__` 与 `__set_name__` 协同：Python 3.6+ 的类创建钩子。
- 描述符与类型注解：结合 `typing` 模块实现类型安全的描述符。
- 描述符与异步：异步描述符（`__get__` 返回协程）的设计模式。
- 描述符的性能基准测试：使用 `timeit` 与 `pytest-benchmark` 评估描述符开销。
- 描述符在数据科学库中的应用：NumPy、Pandas 的描述符实践。

## 附录 A：描述符协议速查表

| 方法 | 触发场景 | 参数 | 返回值 |
|------|----------|------|--------|
| `__get__(self, obj, objtype=None)` | 属性读取 | obj 为实例（类访问为 None），objtype 为类 | 任意值 |
| `__set__(self, obj, value)` | 属性赋值 | obj 为实例，value 为新值 | None |
| `__delete__(self, obj)` | del 删除 | obj 为实例 | None |
| `__set_name__(self, owner, name)` | 类创建时 | owner 为类，name 为字段名 | None |

## 附录 B：属性访问优先级速查表

| 优先级 | 来源 | 说明 |
|--------|------|------|
| 1 | 数据描述符 | `__set__` 或 `__delete__` 存在 |
| 2 | 实例字典 | `obj.__dict__` |
| 3 | 非数据描述符 | 仅 `__get__` 存在 |
| 4 | 类字典 | 普通类属性 |
| 5 | `__getattr__` | 兜底 |
| 6 | AttributeError | 抛出异常 |

## 附录 C：常见描述符速查表

| 描述符 | 类型 | 说明 |
|--------|------|------|
| `property` | 数据描述符 | 计算属性，支持 getter/setter/deleter |
| `classmethod` | 非数据描述符 | 类方法，绑定到类 |
| `staticmethod` | 非数据描述符 | 静态方法，不绑定 |
| `functools.cached_property` | 非数据描述符 | 惰性缓存属性 |
| `abc.abstractmethod` | 非数据描述符 | 抽象方法标记 |
| `functools.partial` | 非数据描述符 | 偏函数（Python 3.8+） |

## 结语

描述符是 Python 对象模型的核心机制，理解描述符意味着理解 Python 的属性访问、方法绑定、继承机制、元类协作等高级特性。本篇从历史动机、形式化定义、理论推导、代码示例、对比分析、陷阱反模式、工程实践、案例研究等多个维度系统论述了描述符协议。

掌握描述符后，读者将具备以下能力：

1. 阅读与理解主流 Python 框架（Django、SQLAlchemy、Pydantic）的源码。
2. 设计并实现自定义的字段校验库、ORM 框架、Schema 系统。
3. 在工程实践中合理选择描述符、property、`__getattr__` 等方案。
4. 排查与描述符相关的生产事故与性能问题。
5. 在代码评审中识别描述符反模式，提出改进建议。

描述符的学习曲线陡峭，但其价值无可替代。建议读者在掌握本篇内容后，深入阅读 CPython 源码与主流框架源码，将理论知识转化为工程能力。
