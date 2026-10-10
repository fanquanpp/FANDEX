---
order: 410
title: Python 面向对象进阶：封装、组合、多态与类设计
module: 'python'
category: 后端技术
difficulty: beginner
description: 会写类之后的设计主线——封装的命名约定三层、组合优于继承的判断口诀、多态与 isinstance 分支的重构、类装饰器、__slots__ 的内存收益与代价；抽象基类/数据类/元类/描述符/枚举五个专题的桥接导引与遮代码自检练习。
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：Python 面向对象的「类设计」主线——封装（访问控制约定）、组合与继承的取舍、多态（同名方法分发）、类装饰器与 `__slots__`。它回答的问题是：类**怎么组织**才可维护，而不是类**怎么定义**（那是 [面向对象基础](/python/460-OOP) 的事）。
- **解决什么问题**：写出的类越大越难改——私有状态被到处直改、继承树越拉越长一动就断、`isinstance` 分支越堆越多、百万级小对象把内存吃爆。本篇给的是每个问题的默认答案：约定式封装、has-a 优先、同名方法分发、装饰器扩展类、slots 换内存。
- **什么时候用到**：任何超过两个类的代码；code review 里「这个该不该继承」「这个属性能不能暴露」的判断；数据分析与游戏开发里海量对象场景的内存优化。接口约定（强制子类实现）的专篇见 [抽象基类与协议](/python/482-AbstractBaseClassAndProtocol)；设计模式的全景应用见 [Python 设计模式](/python/610-PythonDesignPattern)。

## 封装：约定三层，不靠保险箱

Python 没有真正的 private，封装靠**命名约定**分三层，各自传达不同的协作意图：

```python
class BankAccount:
    currency = "CNY"          # 公开：类内外随便用

    def __init__(self, balance: float):
        self._balance = balance        # 单下划线：内部实现，别在外面碰（约定，不强制）
        self.__pin = "1234"            # 双下划线：名称重整为 _BankAccount__pin

    def get_balance(self) -> float:    # 公开访问器：读私有的唯一正门
        return self._balance

    def set_balance(self, balance: float) -> None:
        if balance < 0:
            raise ValueError("余额不能为负")
        self._balance = balance        # 修改器：校验收口在这里
```

逐段解释三层的真实语义：单下划线 `_balance` 对解释器**毫无约束**（`account._balance` 照样能访问），它是写给协作者的「这是实现细节，改动不通知你」；双下划线 `__pin` 触发**名称重整**（name mangling），类外写 `account.__pin` 得 AttributeError（属性已被改名为 `_BankAccount__pin`）——它的用途是**避免子类无意覆盖**，不是保密（`account._BankAccount__pin` 依然可及）。易错点标注：继承里双下划线最容易出现「属性消失」的灵异现象——子类定义 `self.__cache`，重整成 `_子类名__cache`，父类方法里找的是 `_父类名__cache`，两个是不同属性。约定总结：公开属性不加前缀、内部实现单下划线、双下划线只留给「确需防子类命名冲突」的场合——绝大多数类一辈子用不到双下划线。getter/setter 的 Java 式写法在 Python 里通常也不需要：直接公开属性，日后需要拦截时升级为 `property`（属性钩子的机制见 [描述符协议](/python/580-PythonDescriptorProtocol)，那是 property 的底层）。

## 组合与继承：has-a 优先的判断口诀

```python
class Engine:
    def start(self) -> str:
        return "Engine started"

class Car:
    def __init__(self) -> None:
        self.engine = Engine()          # 组合：Car「有一个」Engine

    def start(self) -> str:
        return self.engine.start()      # 委托而不是继承
```

判断口诀：**is-a 用继承，has-a 用组合**。`Car(Engine)` 说「汽车是一种引擎」，显然错；「汽车有一个引擎」是组合。为什么工程上组合几乎总是更优：继承把父类实现钉进子类（父类一改、子类全验），组合只在构造点耦合接口；继承无法运行时换引擎，组合可以 `car.engine = TurboEngine()`——可测试性也随组合而来（测试替身直接塞进来，见 [抽象基类与协议](/python/482-AbstractBaseClassAndProtocol) 的例子二与 [unittest 与 mock](/python/755-UnittestAndMockStdlib)）。继承的正当场景收敛为两条：真正的 is-a 分类学（`GoldenRetriever(Dog)`）与框架要求（`unittest.TestCase`、ABC 子类）。多重继承与 MRO 的完整规则见 [面向对象基础](/python/460-OOP) 与 [元类](/python/590-Metaclass)。

## 多态：删掉 isinstance 分支

```python
class Dog:
    def speak(self) -> str:
        return "Woof!"

class Cat:
    def speak(self) -> str:
        return "Meow!"

def speak(animal) -> str:               # 调用方不关心类型
    return animal.speak()               # 同名方法自动分发
```

反模式对照：函数里写 `if isinstance(animal, Dog): ... elif isinstance(animal, Cat): ...` 的分支堆积，每新增一种动物就要改函数——多态的意义正是把「类型判断」变成「方法分发」，调用方零改动。需要「强制所有动物都实现 speak」时，给它们挂上共同的抽象基类（机制见 [抽象基类与协议](/python/482-AbstractBaseClassAndProtocol)）；只是类型标注需求时用 Protocol（见 [类型注解与 mypy](/python/530-TypeAnnotationMypy)）。isinstance 并非永远错：**边界处**（入口解析、按能力过滤）用一次是正常防御，反模式指的是**用分支替代分发**。

## 类装饰器：把「改类」收进函数

```python
def add_repr(cls):
    """给类补一个统一的 __repr__——类装饰器收口样板代码。"""
    def __repr__(self) -> str:
        fields = ", ".join(f"{k}={v!r}" for k, v in vars(self).items())
        return f"{cls.__name__}({fields})"
    cls.__repr__ = __repr__
    return cls

@add_repr
class Config:
    def __init__(self, host: str, port: int):
        self.host = host
        self.port = port

print(Config("db.local", 5432))         # Config(host='db.local', port=5432)
```

逐段解释：类装饰器与函数装饰器（见 [装饰器](/python/500-Decorator)）是同一机制——类也是对象，装饰器收下类、修改、返回；`vars(self)` 拿实例 `__dict__`，字段枚举由装饰器统一实现。适用边界：一次性、横切多类的扩展（加 repr、注册、打日志）适合类装饰器；字段生成（`__init__`/`__eq__`）就该用 dataclass（见 [数据类与 Pydantic](/python/550-DataClassPydantic)）——本例与 dataclass 的分工正是「要不要按注解生成整个方法族」的分界。类装饰器与 `__init_subclass__` 的分工：前者要**显式贴**在每个类上，后者**定义即生效**（插件注册用后者，见 [抽象基类与协议](/python/482-AbstractBaseClassAndProtocol) 例子三）。

## __slots__：海量小对象的内存开关

```python
import sys

class PointFull:
    def __init__(self, x, y):
        self.x, self.y = x, y

class PointSlots:
    __slots__ = ("x", "y")              # 声明：实例只有这两个属性
    def __init__(self, x, y):
        self.x, self.y = x, y

a, b = PointFull(1, 2), PointSlots(1, 2)
print(sys.getsizeof(a) + sys.getsizeof(a.__dict__))    # 普通版：对象 + __dict__ 两份
print(sys.getsizeof(b))                                # slots 版：固定槽位，无 __dict__
```

逐段讲收益与代价：普通类每个实例挂一个 `__dict__`（哈希表，几十到上百字节），百万级对象时是主要内存开销；`__slots__` 把属性固定为预分配的槽位，实测省 40%-60% 内存、属性访问还略快。代价三件套（写代码前先想清楚）：其一，**不能动态加属性**——`b.z = 1` 直接 AttributeError，`PointFull` 可以；其二，与带 `__dict__` 的多继承父类组合会冲突（两个父类都定义非空 slots 时 TypeError）；其三，想要「slots + 默认值」要小心类属性与描述符的交互（dataclass 用户直接 `@dataclass(slots=True)`，3.10+，细节见 [dataclass 字段与默认值](/python/560-DataClassFieldDefault)）。判断器：对象数量到十万级且字段固定才开 slots；普通业务类不开——动态性是 Python 的默认价值。

## 专题桥接：五个深入方向的导引

本篇原为十主题大杂烩，现在按一类一文件拆分，其余五个专题各有专篇，这里只留导引与分界：

| 专题 | 专篇 | 与本篇的分界 |
| --- | --- | --- |
| 抽象基类与 Protocol | [抽象基类与协议](/python/482-AbstractBaseClassAndProtocol) | 「强制子类实现约定」的接口设计，含注册钩子与选型 |
| dataclass 与字段 | [数据类与 Pydantic](/python/550-DataClassPydantic)、[dataclass 字段与默认值](/python/560-DataClassFieldDefault) | 消灭样板、可变默认值走 `default_factory`、frozen 变体 |
| 描述符与 property | [描述符](/python/570-Descriptor)、[描述符协议](/python/580-PythonDescriptorProtocol) | 属性访问钩子，property 的底层机制 |
| 元类 | [元类](/python/590-Metaclass) | 「类的类」，`type()` 动态建类与类创建拦截 |
| 枚举 | [枚举](/python/280-Enum) | 有限取值集合（`Color.RED`、按值取成员、遍历），含 IntEnum/StrEnum/Flag |

判断器速记：想「少写样板」去 550/560；想「拦截属性读写」去 570/580；想「拦截类创建」去 590；想「有限常量集合」去 280；想「强制实现契约」去 482。

## 常见坑点速记

- 双下划线私有在继承里触发名称重整错位——「属性消失」先查 `_类名__属性` 的展开名；
- 单下划线是约定不是锁：内部实现暴露给协作者的是意图，不是安全性；
- is-a 才继承，has-a 用组合；「为了复用代码而继承」几乎总是错；
- isinstance 分支堆积是多态的反模式；分支只该出现在边界解析处；
- `__slots__` 禁动态属性、与多继承冲突——十万级对象以下别开；
- 类装饰器管横切扩展，dataclass 管字段生成，`__init_subclass__` 管自动注册——三种「改类」工具各管一段。

## 动手实践

练习一（预测题）：下面代码的输出是什么？为什么？

```python
class Base:
    def __init__(self):
        self.__token = "base-secret"

    def peek(self):
        return self.__token

class Child(Base):
    def __init__(self):
        super().__init__()
        self.__token = "child-secret"

c = Child()
print(c.peek())
print(c._Child__token)
print(hasattr(c, "_Base__token"))
```

提示：名称重整按「定义所在的类」展开，不是按实例。

<details>
<summary>参考实现</summary>

输出：`base-secret`、`child-secret`、`True`。解释：`Base.peek` 里的 `self.__token` 被重整为 `self._Base__token`，读的是 `super().__init__()` 存进去的那份；`Child.__init__` 里的 `self.__token` 重整为 `self._Child__token`，是**另一个属性**——实例上两个 token 并存，互不覆盖。第三行证明双下划线不是隐私：换算出重整名即可访问。这就是「双下划线在继承里造成属性并存」的灵异现象本尊，协作代码用单下划线即可避免。
</details>

练习二（实战题）：把下面的分支代码重构成多态，并给新增形状（`Triangle`）留出「零改动调用方」的扩展点。再补一个抽象层声明「所有形状必须有 area」（用 [抽象基类](/python/482-AbstractBaseClassAndProtocol) 的 ABC）。

```python
def total_area(shapes):
    total = 0
    for s in shapes:
        if isinstance(s, Circle):
            total += 3.14159 * s.r ** 2
        elif isinstance(s, Square):
            total += s.side ** 2
    return total
```

提示：每个形状类实现同名 `area()` 方法；ABC 保证漏实现实例化即报错。

<details>
<summary>参考实现</summary>

```python
from abc import ABC, abstractmethod
import math

class Shape(ABC):
    @abstractmethod
    def area(self) -> float: ...

class Circle(Shape):
    def __init__(self, r: float):
        self.r = r
    def area(self) -> float:
        return math.pi * self.r ** 2

class Square(Shape):
    def __init__(self, side: float):
        self.side = side
    def area(self) -> float:
        return self.side ** 2

class Triangle(Shape):                    # 新增：调用方零改动
    def __init__(self, base: float, height: float):
        self.base, self.height = base, height
    def area(self) -> float:
        return self.base * self.height / 2

def total_area(shapes) -> float:
    return sum(s.area() for s in shapes)

print(total_area([Circle(1), Square(2), Triangle(3, 4)]))
```

对比原版：分支数 = 形状数且每加一个改函数；多态版调用方恒定一行 `sum`，新增形状只写新类。ABC 的价值在 `Triangle` 漏写 `area` 时实例化即 TypeError，而不是 sum 时 AttributeError——错误前移到定义期。
</details>

练习三（实战题）：写一个 `@immutable(cls)` 类装饰器：装饰后的类实例化时把 `__setattr__` 换成抛 `AttributeError` 的版本（初始化完成后不可再改属性）。用一个小类验证「构造时能赋值、构造后不能改」。

提示：拦截的是**之后的**赋值不是构造期间的——临时换回原 `__setattr__`，或在 `__init__` 完成后打标记。

<details>
<summary>参考实现</summary>

```python
def immutable(cls):
    original_init = cls.__init__

    def __init__(self, *args, **kwargs):
        object.__setattr__(self, "_sealed", False)
        original_init(self, *args, **kwargs)
        object.__setattr__(self, "_sealed", True)

    def __setattr__(self, name, value):
        if getattr(self, "_sealed", False):
            raise AttributeError(f"{cls.__name__} 实例不可修改")
        object.__setattr__(self, name, value)

    cls.__init__ = __init__
    cls.__setattr__ = __setattr__
    return cls

@immutable
class Point:
    def __init__(self, x, y):
        self.x, self.y = x, y

p = Point(1, 2)
p.x = 10        # AttributeError: Point 实例不可修改
```

逐段解释：`_sealed` 标记由装饰器注入的 `__init__` 设置——构造期间为 False（允许 `self.x = ...`），构造完成置 True；之后任何赋值走被替换的 `__setattr__` 直接抛错。用 `object.__setattr__` 绕过拦截来设置标记本身（否则设置 `_sealed` 也会被拦）。与 `@dataclass(frozen=True)` 的分工：frozen dataclass 由装饰器生成整套路由（含 `__delattr__`、哈希），本练习是理解其机制的手工版——生产中直接用 dataclass（见 550/560 篇）。
</details>

练习四（找错题）：这个 `__slots__` 类有两处问题，先找再修：

```python
class Node:
    __slots__ = ["value", "next"]

    def __init__(self, value):
        self.value = value
        self.next = None
        self.visited = False        # 标记遍历状态

import json
print(json.dumps(Node(1), default=str))
```

提示：slots 声明的属性清单完整吗？再想 slots 实例还有没有 __dict__ 供 json 的 default=str 之外的场景使用。

<details>
<summary>参考实现</summary>

```python
class Node:
    __slots__ = ["value", "next", "visited"]     # visited 补进清单

    def __init__(self, value):
        self.value = value
        self.next = None
        self.visited = False
```

两处问题：其一，`self.visited = False` 赋值给未声明的属性，slots 类直接抛 `AttributeError: 'Node' object has no attribute 'visited'`——slots 是白名单不是文档，漏声明的属性一律不可用；修复是把 visited 加进清单。其二（设计层面）：slots 实例没有 `__dict__`，任何依赖实例字典的机制（`vars(obj)`、部分序列化器、给实例挂临时属性的调试技巧）都会失效——`json.dumps` 这里靠 `default=str` 兜底能跑，但更常见的场景是 `vars(node)` 直接 TypeError。结论与正文一致：slots 只在十万级对象且字段冻结的场景开启；算法结构（链表/树的节点）恰是它的正当用例——属性固定、数量巨大。
</details>

练习五（实战题）：给本篇 `Config` 类做「组合换继承」改造：原代码 `class PostgresConfig(DatabaseConfig)` 继承拿到了 host/port/user/password 四个字段与方法。改写为 `PostgresConfig` **组合**一个通用的 `ConnectionInfo` 对象，保持对外接口不变（调用方仍能读 `cfg.host`）。体会改造后哪些代码不用再动。

提示：`__init__` 里持有 `ConnectionInfo` 实例；「保持读法不变」可以用 property 委托（property 机制见 [描述符协议](/python/580-PythonDescriptorProtocol)）。

<details>
<summary>参考实现</summary>

```python
class ConnectionInfo:
    def __init__(self, host: str, port: int, user: str, password: str):
        self.host, self.port = host, port
        self.user, self.password = user, password

class PostgresConfig:
    def __init__(self, **kw):
        self.conn = ConnectionInfo(**kw)          # has-a

    @property
    def host(self) -> str:                        # 对外读法不变
        return self.conn.host

    @property
    def port(self) -> int:
        return self.conn.port

cfg = PostgresConfig(host="db.local", port=5432, user="app", password="x")
print(cfg.host, cfg.port)                          # db.local 5432
```

改造收益：`ConnectionInfo` 成为可复用件（MySQL/Redis 配置直接组合同一个类）；连接信息的修改逻辑收敛在它一处；`PostgresConfig` 专属字段（如 `sslmode`）加在自己身上，不再被父类字段挤占命名。代价是要写几个 property 委托——字段多时这个样板正是 dataclass 组合或 `__getattr__` 兜底可以消化的（读者可尝试 `def __getattr__(self, name): return getattr(self.conn, name)` 一行替代全部 property，并讨论它牺牲显性接口的代价）。
</details>

## 与之前和之后的知识的关系

- 往前：类定义、继承、MRO 的语法基础见 [面向对象基础](/python/460-OOP)；装饰器语法见 [装饰器](/python/500-Decorator)；函数参数与名称可见性见 [函数详解](/python/100-FunctionDetailed)。
- 往后：接口约定的专篇见 [抽象基类与协议](/python/482-AbstractBaseClassAndProtocol)；样板消除见 [数据类与 Pydantic](/python/550-DataClassPydantic) 与 [dataclass 字段与默认值](/python/560-DataClassFieldDefault)；属性钩子见 [描述符协议](/python/580-PythonDescriptorProtocol)；类创建拦截见 [元类](/python/590-Metaclass)；有限常量集合见 [枚举](/python/280-Enum)；本篇模式在框架中的落地见 [Python 设计模式](/python/610-PythonDesignPattern)。

## 官方文档

- 数据模型（名称重整、`__slots__`、`__setattr__` 协议）：https://docs.python.org/3/reference/datamodel.html（PSF License）
- dataclasses（slots=True 与 frozen 的组合行为）：https://docs.python.org/3/library/dataclasses.html（PSF License）

## 自我检查

- 能说出命名约定三层的语义与双下划线名称重整在继承中的坑；
- 能用 is-a/has-a 口诀判断一段继承该不该改成组合，并说明组合带来的可测试性；
- 能把 isinstance 分支重构为同名方法分发，并说出分支只该留在边界的理由；
- 能写一个类装饰器并说清它与 dataclass、`__init_subclass__` 的分工边界；
- 能列出 `__slots__` 的收益与三件套代价，并按对象规模判断是否启用；
- 能按五个桥接专题的判断器，把新需求导向正确的专篇。
