---
order: 420
title: 元类：class 语句背后发生的事
module: 'python'
category: 后端技术
difficulty: advanced
description: 以「设备命令处理器自动注册」为场景，先用 __init_subclass__ 解决八成需求，再用 type() 三参数与自定义元类拆开 class 语句的黑盒：__new__ 与 __init__ 的分工、字段收集轻量 ORM、元类冲突与隐式传播，最后给出「什么时候才真的需要元类」的决策清单。
author: fanquanpp
updated: '2026-09-29'
related:
  - 'python/580-PythonDescriptorProtocol'
  - 'python/600-MetaclassSingleton'
  - 'python/490-DataTypeObjectModelDeepDive'
prerequisites:
  - 'python/460-OOP'
  - 'python/490-DataTypeObjectModelDeepDive'
---

## 前置知识

- [OOP 基础](/python/460-OOP)：熟练使用继承与类属性；
- [数据类型与对象模型深潜](/python/490-DataTypeObjectModelDeepDive)：知道「一切皆对象」在 Python 里字面为真。

## 你现在要解决什么问题

FoloToy 这类多设备项目里，每种型号有自己的指令处理器。新手写法是每个处理器写完后，再去注册表里手动补一行：

```python
class VolumeHandler:
    command = "volume"
    def handle(self, payload): ...

class PlayHandler:
    command = "play"
    def handle(self, payload): ...

HANDLERS = {
    "volume": VolumeHandler,
    "play": PlayHandler,
    # 每加一个类都要回来加一行，忘了就 404
}
```

「写完类自动进注册表」就是需求。这一篇从最轻的工具试到最重的工具，过程中把「class 语句到底做了什么」一并拆开——元类只是终点，不是起点。

## 先动手：八成场景用 __init_subclass__ 就够

`__init_subclass__` 是父类上的一个钩子，每个子类被定义时自动执行（PEP 487，3.6 起）。它不需要任何「魔法」：

```python
class Handler:
    command: str = ""
    registry: dict[str, type] = {}

    def __init_subclass__(cls, **kwargs):
        super().__init_subclass__(**kwargs)
        if cls.command:
            Handler.registry[cls.command] = cls

class VolumeHandler(Handler):
    command = "volume"
    def handle(self, payload): return f"vol {payload}"

class PlayHandler(Handler):
    command = "play"
    def handle(self, payload): return f"play {payload}"

print(Handler.registry)
```

```text
{'volume': <class '__main__.VolumeHandler'>, 'play': <class '__main__.PlayHandler'>}
```

写完类即注册，没有第二行，也没有额外依赖。它就是普通方法：IDE 能跳转、能断点、多个父类的钩子靠 `super()` 链组合，不会打架。**先想它，再想元类**——这个顺序本身就是本篇的核心结论之一，理由到最后给。

## 为什么：class 语句是 type() 的语法糖

Python 里类本身是对象，它的类型是 `type`。检查一下：

```python
class Dog:
    pass

print(type(Dog))          # Dog 这个对象的类型
print(type(type))         # type 自己的类型是……自己
```

```text
<class 'type'>
<class 'type'>
```

`class Dog:` 这行语句在解释器眼里等价于「调用一次 type」：读类体、攒出名字、基类、属性字典，交给 `type` 造出类对象。`type` 的三参数形式可以直接手动调：

```python
def bark(self):
    return f"{self.name}: woof"

Dog = type(
    "Dog",                       # 类名
    (object,),                   # 基类元组
    {
        "__init__": lambda self, name: setattr(self, "name", name),
        "bark": bark,
    },
)

print(Dog("Rex").bark())
print(type(Dog))
```

```text
Rex: woof
<class 'type'>
```

两段代码造出的 Dog 没有区别。**type 就是 Python 的默认元类**——「元类」不是什么另立门户的机制，它就是「造类的类」。`metaclass=XXX` 参数的含义因此不言自明：这次造类，别用默认的 `type`，换我给的这位工匠。

## 亲手写一个元类：字段收集的轻量 ORM

这是元类最经典的真实用武之地（Django Model、SQLAlchemy、Pydantic 全是这么起家的）：扫描类体，把声明过的字段收集成表结构。字段本身用描述符实现（协议详见 [Python 描述符协议](/python/580-PythonDescriptorProtocol)）：

```python
class Field:
    """字段描述符：负责存取与类型检查。"""
    def __init__(self, column_type):
        self.column_type = column_type
        self.name = None

    def __set_name__(self, owner, name):      # 类创建时自动告知自己的属性名
        self.name = name

    def __get__(self, instance, owner):
        if instance is None:
            return self
        return instance.__dict__.get(self.name)

    def __set__(self, instance, value):
        expected = {"INTEGER": int, "TEXT": str, "REAL": float}.get(self.column_type)
        if expected and not isinstance(value, expected) and value is not None:
            raise TypeError(f"{self.name} 期望 {expected.__name__}，来了 {type(value).__name__}")
        instance.__dict__[self.name] = value

class ModelMeta(type):
    """造类时顺手收集所有 Field，拼成表结构。"""
    def __new__(mcs, name, bases, namespace, **kwargs):
        cls = super().__new__(mcs, name, bases, namespace, **kwargs)
        columns = {}
        for base in bases:                     # 先继承父类字段
            columns.update(getattr(base, "_columns", {}))
        for key, value in namespace.items():   # 再收本类字段
            if isinstance(value, Field):
                columns[key] = value
        cls._columns = columns
        cls.__table__ = namespace.get("__table__", name.lower())
        return cls

class Model(metaclass=ModelMeta):
    def to_insert_sql(self):
        cols = ", ".join(self._columns)
        vals = ", ".join(repr(getattr(self, c)) for c in self._columns)
        return f"INSERT INTO {self.__table__} ({cols}) VALUES ({vals});"

class Product(Model):
    id = Field("INTEGER")
    name = Field("TEXT")
    price = Field("REAL")

print(Product.__table__, list(Product._columns))
p = Product()
p.id, p.name, p.price = 1, "widget", 9.9
print(p.to_insert_sql())
p.price = "九块九"
```

```text
product ['id', 'name', 'price']
INSERT INTO product (id, name, price) VALUES (1, 'widget', 9.9);
TypeError: price 期望 float，来了 str
```

注意 `__new__` 与 `__init__` 的分工，这是元类新手最大的坑：`__new__` 收到的 `namespace` 是类体执行结果的**原始字典**，此时改动还能进类；轮到 `__init__` 时类已造完，`namespace` 已被消化成 `cls.__dict__`，再改它是无效的——要动就动 `cls` 本身。另一个惯例：元类方法第一个参数写成 `mcs`，与普通方法的 `self`、类方法的 `cls` 区分开。

## 元类还能拦什么

**拦实例化：`__call__`。** `Product()` 这行代码其实调用的是元类的 `__call__`。在元类上重写它，就能控制「实例化」这个动作——单例模式最稳的实现就藏在这里，完整展开见 [元类与单例](/python/600-MetaclassSingleton)。

**定制类体命名空间：`__prepare__`。** 类体执行前，解释器向元类要一个空字典来装属性，`__prepare__` 让你能换成别的容器（比如按键排序、访问即计数的字典）。3.7 之后普通 dict 已保序，这个钩子如今极少用，知道存在即可：

```python
class TrackingMeta(type):
    @classmethod
    def __prepare__(mcs, name, bases, **kwargs):
        return {}          # 换成任意 Mapping 子类即可定制类体行为
```

**返回已存在的类。** 元类 `__new__` 允许不造新类、直接返回缓存里的旧类，这是「按名字取类」缓存的基础——合法且有用，别当成 bug。

## 你一直在用元类

元类不是炫技专用，标准库与主流框架全靠它：

- `enum.Enum`：`EnumMeta` 把 `RED = 1` 这类赋值变成真正的枚举成员，所以枚举类不能像普通类那样随意加属性；
- `abc.ABCMeta`：`@abstractmethod` 的「实例化时才报错」检查就注册在元类里；
- Pydantic 的 `ModelMetaclass`：上一篇 [数据类与 Pydantic](/python/550-DataClassPydantic) 里「字段自动变成可校验属性」就是它在造类时干的；
- Django 的 `ModelBase`：`name = models.CharField(...)` 变成表列，同样是类创建时刻的收集。

读懂本篇的 ORM 例子，再看这些框架源码里的元类，骨架是一样的。

## 元类冲突：两个工匠抢一个活

多继承的两个基类若各有不同元类，Python 不知道听谁的：

```python
class MetaA(type): pass
class MetaB(type): pass
class A(metaclass=MetaA): pass
class B(metaclass=MetaB): pass

class C(A, B):        # 谁来造 C？
    pass
```

```text
Traceback (most recent call last):
  ...
TypeError: metaclass conflict: the metaclass of a derived class must be a (non-strict) subclass of the metaclasses of all its bases
```

解法是显式指定一个同时继承两者的「桥接元类」：

```python
class MetaAB(MetaA, MetaB):
    pass

class C(A, B, metaclass=MetaAB):
    pass

print(type(C))
```

```text
<class '__main__.MetaAB'>
```

接第三方库的类做多继承时撞上这个错，多半说明两个库各自带了自己的元类——这通常是想重读设计、而不是硬写桥接的信号。

## 什么时候才真的需要元类

按成本从低到高试，能不用元类就不用：

| 需求 | 首选工具 |
| --- | --- |
| 子类定义时做注册、检查、改属性 | `__init_subclass__` |
| 对单个类做加工（不改继承树） | 类装饰器 |
| 拦截实例化（单例、缓存实例） | 元类 `__call__` |
| 自定义类体命名空间 | 元类 `__prepare__` |
| 控制类怎么被「造出来」本身 | 元类 `__new__` |

判断标准一句话：**要动的动作发生在「类创建时」且 `__init_subclass__` 与装饰器够不着，才请元类**。比如「拦住每一次实例化」「控制类体里属性怎么收集」，元类是唯一解；只是注册与检查，元类是过度设计。

## 常见坑点

坑一：魔法溢出到子类。元类随继承隐式传播，子类作者未必知情。一个在 `__new__` 里强制检查 docstring 的元类，会让下游所有子类莫名 `TypeError`。给自己留退出开关（`namespace.get("_skip_check")`），或者一开始就用 `__init_subclass__`。

坑二：在 `__init__` 里改 `namespace` 无效。前面已讲，排查手段：把改动挪进 `__new__`，或直接 `cls.attr = ...`。

坑三：`__call__` 拦截有持续开销。`__new__` 只在类创建时跑一次，几乎免费；`__call__` 每次实例化都要过，热路径（循环里造大量小对象）能测出成倍差距。热点对象的实例化别挂元类。

坑四：注解未必已解析。元类里读 `namespace["__annotations__"]` 时，字符串化注解（`from __future__ import annotations`）还没解开，要用 `typing.get_type_hints(cls)` 延迟求值，别直接消费注解字典。

## 自我检查

- 能说出 `class Dog:` 等价于哪一次 `type()` 调用，并默写三参数；
- 能用 `__init_subclass__` 写出自动注册，并说明它为什么优先于元类；
- 能写出最小元类，并说清 `__new__` 与 `__init__` 里各自能改什么；
- 看到 `metaclass conflict` 报错知道原因与桥接解法；
- 能举出两个「你早就在用元类」的标准库例子。

## 练习

1. 预测题：`print(type("abc"), type(str), type(type))` 三段输出分别是什么？先写再运行。
2. 修改题：给本篇 Handler 注册器加规则——`command` 缺失或与已有命令重复时，在类定义那一刻就抛 `TypeError`（而不是等到运行时）。
3. 实战题：给本篇 Model 的元类加 `create_table_sql()`，生成 `CREATE TABLE product (id INTEGER, name TEXT, price REAL);`，并用断言 `assert "CREATE TABLE product" in Product.create_table_sql()` 自测。
4. 挑战题：把注册器改造成「同一条命令允许多个处理器按优先级排队」：`registry` 存 `list[type]`，`__init_subclass__` 里按类属性 `priority` 插入排序，写三个断言验证顺序。

## 下一步

- 元类 `__call__` 的招牌应用——线程安全单例：[元类与单例](/python/600-MetaclassSingleton)；
- 描述符协议如何与元类配合完成字段系统：[Python 描述符协议](/python/580-PythonDescriptorProtocol)；
- 不想手搓 ORM，看成熟方案怎么做：[SQLAlchemy](/python/830-PythonSQLAlchemy)。
