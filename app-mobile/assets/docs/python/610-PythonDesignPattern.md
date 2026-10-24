---
order: 540
title: Python 与设计模式
module: 'python'
category: 后端技术
difficulty: intermediate
description: Python实现设计模式
author: fanquanpp
updated: '2026-10-11'
related:
  - 'python/140-BuiltinDataStructure'
  - 'python/210-Regex'
  - 'python/730-PythonPackagingEvolution'
  - 'python/920-PythonJupyter'
prerequisites: []
---

# Python 与设计模式

## 前置知识

- [抽象基类与协议](/python/482-AbstractBaseClassAndProtocol)：行为型模式的骨架（抽象方法、`__init_subclass__` 注册钩子）都建立在它之上
- [单例模式](/python/600-SingletonPattern)：建议先完成前一篇的学习，本文只讲惯用形态，并发与异步专论见该文

## 学习目标

- 掌握「创建型模式」的核心机制、典型用法与常见陷阱：单例、工厂、建造者
- 掌握「结构型模式」的核心机制、典型用法与常见陷阱：装饰器、适配器、组合
- 掌握「行为型模式」的核心机制、典型用法与常见陷阱：观察者、策略、命令、模板方法、责任链
- 掌握「上下文管理器模式」的进入/退出协议与资源收口用法
- 能在工程场景中判断「该用哪种模式」，并识别「不需要模式」的简单情形

## 知识点地图

- **知识类别**：经典设计模式的 Python 落地——创建型（单例、工厂、建造者）、结构型（装饰器、适配器、组合）、行为型（观察者、策略、命令、模板方法、责任链）与上下文管理器模式。它们是 GoF 模式在动态语言里的**简化形态**：很多 Java 里需要接口与类的模式，Python 用模块、函数、装饰器就能表达。
- **解决什么问题**：对象该全局唯一（配置、连接池）怎么办；对象创建要按条件选择实现类（渠道、存储后端）怎么办；请求发出方与执行方要解耦（命令）、算法骨架固定步骤可换（模板方法）、处理环节可动态编排（责任链）怎么办。
- **什么时候用到**：配置管理（单例）、插件与驱动分发（工厂，配合 [抽象基类与协议](/python/482-AbstractBaseClassAndProtocol) 的注册钩子）、操作撤销/任务队列（命令）、框架钩子（模板方法）、中间件管道（责任链，Web 框架的中间件栈就是它，见 [FastAPI](/python/880-PythonFastAPI)）。单例的完整专论（并发与异步场景）见 [单例模式](/python/600-SingletonPattern)。

## 概述

设计模式是面向对象编程中经过验证的解决方案模板，用于解决常见的软件设计问题。Python 的动态特性使得许多设计模式的实现比传统静态语言更简洁。本文介绍 Python 中常用的设计模式及其惯用实现方式，重点在于利用 Python 语言特性（如装饰器、元类、描述符等）实现更优雅的方案。

## 基础概念

### 设计模式分类

- 创建型：关注对象的创建机制，如单例、工厂、建造者
- 结构型：关注对象的组合方式，如适配器、装饰器、代理
- 行为型：关注对象间的通信，如策略、观察者、命令

### Python 的特殊之处

Python 的动态特性使得一些传统设计模式可以更简洁地实现：

- 不需要接口定义，鸭子类型天然支持多态
- 装饰器模式可以直接用 Python 装饰器实现
- 单例模式可以用模块级别变量实现
- 策略模式可以用函数代替类

## 快速上手

先把「模式」落到手感。下面两个最常见的场景各用十几行代码完成，写完再对照参考，体会「Python 里很多模式只是一行语法」的含义。

**例子一：策略模式——函数就是策略**

策略模式要解决的问题是「同一件事有多种做法，运行时才决定用哪种」。静态语言需要接口加一组策略类；Python 里函数是一等公民，直接把函数当参数传即可：

```python
def discount_none(price: float) -> float:
    return price

def discount_vip(price: float) -> float:
    return round(price * 0.8, 2)

def checkout(price: float, strategy) -> float:
    return strategy(price)          # 接受任何「价格 -> 价格」的可调用对象

print(checkout(100, discount_none))   # 100.0
print(checkout(100, discount_vip))    # 80.0
```

`checkout` 不认识任何具体策略，它只依赖一个约定：可调用、收一个价格、还一个价格。这就是鸭子类型——策略根本不需要类，除非它还要携带状态或多个协作方法。

**例子二：单例——模块就是现成的答案**

需要全局唯一的配置对象或连接池时，先想到的不该是 `__new__` 魔法，而是模块缓存：Python 保证每个模块只被 import 一次，模块里的实例天然全局唯一：

```python
# settings.py
class Settings:
    def __init__(self):
        self.db_url = "sqlite:///app.db"

settings = Settings()
```

```python
# 任何其他文件里
from settings import settings   # 无论在哪里 import，拿到的都是同一个对象
```

两个例子合起来看：设计模式在 Python 里常常「退化」成一条语言特性——函数一等公民对应策略，import 缓存对应单例。先想语言特性，再想类图，是 Python 风格的第一原则。

**动手试一试**：不新建类、不修改 `checkout`，给例子一加一种「满 200 减 50」的促销策略，并用一行代码切换验证。

遮代码自检——先自己写完再看参考：

<details>
<summary>参考实现（点开前先自己完成）</summary>

```python
def discount_full_reduction(price: float) -> float:
    return price - (price // 200) * 50

print(checkout(450, discount_full_reduction))   # 400.0
```

对照要点：新增策略没有改动 `checkout` 的任何一行——「对扩展开放、对修改关闭」在 Python 里就是这么轻。注意 `price // 200` 的整除让 450 元只触发一次满减（减 50 而不是减 100），写业务策略时边界条件要先用极端值验证。

</details>

## 创建型模式

### 单例模式

**基本写法：模块级单例**

```python
# 模块本身就是单例

# config.py
class Config:
    def __init__(self):
        self.settings = {}

config = Config()  # 模块变量

# 使用：from config import config
```

**基本写法：__new__ 实现**

```python
# 通过 __new__ 控制实例化
class Singleton:
    _instance = None
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

a = Singleton()
b = Singleton()
print(a is b)  # True
```

**基本写法：元类单例**

```python
# 元类实现单例
class SingletonMeta(type):
    _instances = {}
    def __call__(cls, *args, **kwargs):
        if cls not in cls._instances:
            cls._instances[cls] = super().__call__(*args, **kwargs)
        return cls._instances[cls]

class DB(metaclass=SingletonMeta):
    pass
```

**基本写法：装饰器单例**

```python
# 装饰器实现单例
def singleton(cls):
    instances = {}
    @functools.wraps(cls)
    def wrapper(*args, **kwargs):
        if cls not in instances:
            instances[cls] = cls(*args, **kwargs)
        return instances[cls]
    return wrapper

@singleton
class Service:
    pass
```

### 工厂模式

**基本写法：简单工厂**

```python
# 工厂函数
class Dog:
    def speak(self): return "Woof"

class Cat:
    def speak(self): return "Meow"

def create_animal(kind):
    if kind == "dog":
        return Dog()
    if kind == "cat":
        return Cat()
    raise ValueError("未知类型")
```

**基本写法：工厂方法**

```python
# 工厂方法模式
class AnimalFactory:
    def create(self):
        raise NotImplementedError

class DogFactory(AnimalFactory):
    def create(self):
        return Dog()

class CatFactory(AnimalFactory):
    def create(self):
        return Cat()
```

**基本写法：抽象工厂**

```python
# 抽象工厂
import abc

class GUIFactory(abc.ABC):
    @abc.abstractmethod
    def create_button(self): pass
    @abc.abstractmethod
    def create_input(self): pass

class WinFactory(GUIFactory):
    def create_button(self): return WinButton()
    def create_input(self): return WinInput()
```

### 建造者模式

```python
class QueryBuilder:
    """SQL 查询建造者"""
    def __init__(self):
        self._table = ""
        self._columns = []
        self._conditions = []
        self._order_by = ""
        self._limit = None

    def select(self, *columns):
        self._columns = columns or ["*"]
        return self

    def from_table(self, table):
        self._table = table
        return self

    def where(self, condition):
        self._conditions.append(condition)
        return self

    def order_by(self, column):
        self._order_by = column
        return self

    def limit(self, n):
        self._limit = n
        return self

    def build(self):
        """构建 SQL 语句"""
        cols = ", ".join(self._columns)
        sql = f"SELECT {cols} FROM {self._table}"
        if self._conditions:
            sql += " WHERE " + " AND ".join(self._conditions)
        if self._order_by:
            sql += f" ORDER BY {self._order_by}"
        if self._limit:
            sql += f" LIMIT {self._limit}"
        return sql

# 使用
query = QueryBuilder() \
    .select("name", "age") \
    .from_table("users") \
    .where("age > 18") \
    .where("status = 'active'") \
    .order_by("name") \
    .limit(10) \
    .build()
# SELECT name, age FROM users WHERE age > 18 AND status = 'active' ORDER BY name LIMIT 10
```

## 结构型模式

### 装饰器模式

Python 的装饰器语法天然实现了装饰器模式：

```python
import functools
import time

def retry(max_attempts=3, delay=1):
    """重试装饰器"""
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(max_attempts):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    if attempt == max_attempts - 1:
                        raise
                    time.sleep(delay)
        return wrapper
    return decorator

def timer(func):
    """计时装饰器"""
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        result = func(*args, **kwargs)
        elapsed = time.perf_counter() - start
        print(f"{func.__name__} 耗时: {elapsed:.3f}s")
        return result
    return wrapper

# 组合使用多个装饰器
@timer
@retry(max_attempts=3, delay=2)
def fetch_data(url):
    """获取数据"""
    import requests
    return requests.get(url).json()
```

### 适配器模式

```python
class OldAPI:
    """旧版 API"""
    def get_user_info(self, user_id):
        return {"name": "Alice", "age": 30}

class NewAPI:
    """新版 API"""
    def fetch_user(self, user_id):
        return {"full_name": "Alice", "user_age": 30}

class UserAdapter:
    """适配器：统一新旧 API 的接口"""
    def __init__(self, api):
        self.api = api

    def get_name(self, user_id):
        data = self.api.fetch_user(user_id) if hasattr(self.api, 'fetch_user') \
            else self.api.get_user_info(user_id)
        return data.get("full_name") or data.get("name")

    def get_age(self, user_id):
        data = self.api.fetch_user(user_id) if hasattr(self.api, 'fetch_user') \
            else self.api.get_user_info(user_id)
        return data.get("user_age") or data.get("age")
```

### 组合模式

```python
class Component:
    """组件基类"""
    def render(self, indent=0):
        raise NotImplementedError

class Leaf(Component):
    """叶子节点"""
    def __init__(self, name):
        self.name = name

    def render(self, indent=0):
        print(" " * indent + f"- {self.name}")

class Composite(Component):
    """组合节点"""
    def __init__(self, name):
        self.name = name
        self.children = []

    def add(self, component):
        self.children.append(component)

    def render(self, indent=0):
        print(" " * indent + f"+ {self.name}")
        for child in self.children:
            child.render(indent + 2)

# 使用：构建树形结构
root = Composite("项目")
src = Composite("src")
src.add(Leaf("main.py"))
src.add(Leaf("utils.py"))
tests = Composite("tests")
tests.add(Leaf("test_main.py"))
root.add(src)
root.add(tests)
root.render()
```

## 行为型模式

### 观察者模式

```python
class Observable:
    """可观察对象"""
    def __init__(self):
        self._observers = []

    def subscribe(self, observer):
        """订阅事件"""
        self._observers.append(observer)

    def unsubscribe(self, observer):
        """取消订阅"""
        self._observers.remove(observer)

    def notify(self, event):
        """通知所有观察者"""
        for observer in self._observers:
            observer(event)

# 使用
class EventBus:
    """事件总线：观察者模式的应用"""
    def __init__(self):
        self._handlers = {}

    def on(self, event_type, handler):
        """注册事件处理器"""
        if event_type not in self._handlers:
            self._handlers[event_type] = []
        self._handlers[event_type].append(handler)

    def emit(self, event_type, data=None):
        """触发事件"""
        for handler in self._handlers.get(event_type, []):
            handler(data)

# 使用示例
bus = EventBus()
bus.on("user_created", lambda data: print(f"欢迎新用户: {data}"))
bus.on("order_placed", lambda data: print(f"新订单: {data}"))
bus.emit("user_created", "Alice")
```

### 策略模式

策略模式允许在运行时选择算法。Python 中可以用函数代替策略类：

```python
# 传统类实现
class Sorter:
    def __init__(self, strategy):
        self.strategy = strategy

    def sort(self, data):
        return self.strategy(data)

# Pythonic 实现：直接使用函数
def bubble_sort(data):
    """冒泡排序"""
    result = data[:]
    n = len(result)
    for i in range(n):
        for j in range(0, n - i - 1):
            if result[j] > result[j + 1]:
                result[j], result[j + 1] = result[j + 1], result[j]
    return result

def quick_sort(data):
    """快速排序"""
    if len(data) <= 1:
        return data
    pivot = data[len(data) // 2]
    left = [x for x in data if x < pivot]
    middle = [x for x in data if x == pivot]
    right = [x for x in data if x > pivot]
    return quick_sort(left) + middle + quick_sort(right)

# 使用
data = [3, 1, 4, 1, 5, 9]
sorted_data = quick_sort(data)  # 直接选择排序策略
```

### 命令模式

```python
# 命令模式
class Command:
    def execute(self):
        raise NotImplementedError

class LightOnCommand(Command):
    def __init__(self, light):
        self.light = light
    def execute(self):
        self.light.on()

class Light:
    def on(self): print("灯亮")
    def off(self): print("灯灭")

class Remote:
    def __init__(self):
        self._cmd = None
    def set_command(self, cmd):
        self._cmd = cmd
    def press(self):
        self._cmd.execute()
```

### 模板方法模式

```python
from abc import ABC, abstractmethod

class DataProcessor(ABC):
    """数据处理器模板"""
    def process(self, data):
        """模板方法：定义处理流程"""
        data = self.read(data)
        data = self.validate(data)
        data = self.transform(data)
        self.output(data)

    @abstractmethod
    def read(self, data):
        pass

    def validate(self, data):
        """默认验证逻辑，子类可覆盖"""
        if not data:
            raise ValueError("数据为空")
        return data

    @abstractmethod
    def transform(self, data):
        pass

    def output(self, data):
        """默认输出逻辑"""
        print(f"处理结果: {data}")

class CSVProcessor(DataProcessor):
    def read(self, data):
        return data.split(",")

    def transform(self, data):
        return [item.strip().upper() for item in data]

class JSONProcessor(DataProcessor):
    def read(self, data):
        import json
        return json.loads(data)

    def transform(self, data):
        return {k: v.upper() if isinstance(v, str) else v for k, v in data.items()}
```

### 责任链模式

```python
class Handler:
    """处理器基类"""
    def __init__(self):
        self._next = None

    def set_next(self, handler):
        self._next = handler
        return handler

    def handle(self, request):
        if self._next:
            return self._next.handle(request)
        return None

class AuthHandler(Handler):
    def handle(self, request):
        if not request.get("token"):
            return "认证失败"
        return super().handle(request)

class RoleHandler(Handler):
    def handle(self, request):
        if request.get("role") != "admin":
            return "权限不足"
        return super().handle(request)

class LogHandler(Handler):
    def handle(self, request):
        print(f"记录日志: {request}")
        return super().handle(request)

# 构建责任链
auth = AuthHandler()
role = RoleHandler()
log = LogHandler()
auth.set_next(role).set_next(log)

# 使用
result = auth.handle({"token": "abc", "role": "admin"})
```

## 上下文管理器模式

**基本写法：with 语句模式**

```python
# 上下文管理器模式
class Transaction:
    def __enter__(self):
        print("开始事务")
        return self
    def __exit__(self, *exc):
        if exc[0] is None:
            print("提交")
        else:
            print("回滚")
        return False

with Transaction():
    pass
```

## 工程应用：插件注册表

插件系统是「注册表 + 装饰器自注册」的典型应用，本质上是用注册表字典替代 if-elif 的工厂模式——本文动手实践的练习二会让你亲手实现一遍：

```python
class PluginRegistry:
    """插件注册表"""
    _plugins = {}

    @classmethod
    def register(cls, name):
        """注册插件装饰器"""
        def decorator(plugin_class):
            cls._plugins[name] = plugin_class
            return plugin_class
        return decorator

    @classmethod
    def get(cls, name):
        return cls._plugins.get(name)

# 注册插件
@PluginRegistry.register("mysql")
class MySQLPlugin:
    def connect(self):
        return "MySQL 连接"

@PluginRegistry.register("postgres")
class PostgresPlugin:
    def connect(self):
        return "PostgreSQL 连接"

# 使用
plugin = PluginRegistry.get("mysql")()
print(plugin.connect())  # MySQL 连接
```

## 注意事项

- 不要过度使用设计模式。Python 的简洁性意味着很多问题不需要设计模式就能解决
- 优先使用 Python 内置特性（装饰器、上下文管理器、生成器等）而非传统设计模式
- 单例模式在 Python 中最简单的实现是模块级别变量，不需要复杂的元类或 **new**
- 策略模式在 Python 中通常用函数即可实现，不必定义策略类
- 注意设计模式可能增加代码复杂度，在团队中应确保所有成员理解使用的模式
- Python 的鸭子类型减少了对接口和抽象类的需求

## 进阶用法

### 使用 dataclass 简化模式实现

```python
from dataclasses import dataclass

# 值对象模式
@dataclass(frozen=True)
class Money:
    """不可变的值对象"""
    amount: float
    currency: str

    def add(self, other):
        if self.currency != other.currency:
            raise ValueError("货币类型不同")
        return Money(self.amount + other.amount, self.currency)

# 使用
price = Money(99.9, "CNY")
shipping = Money(10.0, "CNY")
total = price.add(shipping)
```

### 使用 Protocol 实现接口

```python
from typing import Protocol

class Sortable(Protocol):
    """定义排序协议（类似接口）"""
    def sort(self, data: list) -> list: ...

class TimSorter:
    """自动满足 Sortable 协议"""
    def sort(self, data: list) -> list:
        return sorted(data)

def process_with_sorter(sorter: Sortable, data: list) -> list:
    """接受任何满足 Sortable 协议的对象"""
    return sorter.sort(data)
```

## 动手实践

练习一（预测题）：下面单例写法在单线程下的行为是什么？多线程下呢？

```python
class Config:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

a = Config()
b = Config()
print(a is b)
```

提示：两个线程同时执行到 `if cls._instance is None` 会怎样？

<details>
<summary>参考实现</summary>

单线程输出 `True`——第二次调用直接返回缓存的实例。多线程下不保证：两个线程可能都读到 `_instance is None`，各自创建一个实例（竞态窗口在「检查」与「赋值」之间）。修法有两条路：其一，加锁——`threading.Lock()` 包住检查与赋值（Double-Checked Locking 还要先判一次锁内状态）；其二，换形态——直接用「模块级实例」（import 缓存天然单例）或 `functools.lru_cache` 包装的工厂函数，把线程安全交给 import 系统或缓存语义。并发安全版与异步安全版（单事件循环里同样有 await 竞态）的完整讨论见 [单例模式](/python/600-SingletonPattern)。
</details>

练习二（实战题）：给一个日志系统写工厂函数 `create_logger(kind: str)`：kind 为 "console" 返回 `ConsoleLogger`，为 "file" 返回 `FileLogger(path)`；两者实现共同的抽象基类 `Logger`（`log(msg)` 方法）。新增 "syslog" 类型时不允许改动 `create_logger` 的分支——用注册表（字典）替代 if-elif。

提示：注册表 `{kind: cls}` + 子类自注册（类装饰器或 `__init_subclass__`，见 [抽象基类与协议](/python/482-AbstractBaseClassAndProtocol) 例子一）。

<details>
<summary>参考实现</summary>

```python
from abc import ABC, abstractmethod

LOGGER_REGISTRY: dict[str, type["Logger"]] = {}

class Logger(ABC):
    @abstractmethod
    def log(self, msg: str) -> None: ...

    def __init_subclass__(cls, /, kind: str, **kwargs):
        super().__init_subclass__(**kwargs)
        LOGGER_REGISTRY[kind] = cls

class ConsoleLogger(Logger, kind="console"):
    def log(self, msg: str) -> None:
        print(f"[console] {msg}")

class FileLogger(Logger, kind="file"):
    def __init__(self, path: str = "app.log"):
        self.path = path
    def log(self, msg: str) -> None:
        with open(self.path, "a", encoding="utf-8") as f:
            f.write(msg + "\n")

def create_logger(kind: str, **kwargs) -> Logger:
    return LOGGER_REGISTRY[kind](**kwargs)     # 分支消失，新类型自动可用

create_logger("console").log("启动")
```

要点：工厂函数从「分支选择」退化为「查表构造」，`create_logger` 永不再改——新增 syslog 只写一个子类（`kind="syslog"`），这正是「对扩展开放、对修改关闭」在 Python 里的最小实现；构造参数经 `**kwargs` 透传给各实现的 `__init__`。
</details>

练习三（实战题）：用命令模式实现一个简易文本编辑器的撤销栈：`Command` 抽象类带 `execute()` 与 `undo()`；`InsertCommand` 与 `DeleteCommand` 是两个具体命令；`Editor` 提供 `execute(cmd)`（入栈）与 `undo()`（弹栈并调 undo）。

提示：命令对象要**携带执行所需的状态**（位置、文本），undo 才能精确还原。

<details>
<summary>参考实现</summary>

```python
from abc import ABC, abstractmethod

class Command(ABC):
    @abstractmethod
    def execute(self) -> None: ...
    @abstractmethod
    def undo(self) -> None: ...

class Editor:
    def __init__(self) -> None:
        self.text = ""
        self.history: list[Command] = []

    def execute(self, cmd: Command) -> None:
        cmd.execute()
        self.history.append(cmd)

    def undo(self) -> None:
        if self.history:
            self.history.pop().undo()

class InsertCommand(Command):
    def __init__(self, editor: Editor, pos: int, text: str):
        self.editor, self.pos, self.text = editor, pos, text
    def execute(self) -> None:
        t = self.editor.text
        self.editor.text = t[:self.pos] + self.text + t[self.pos:]
    def undo(self) -> None:
        t = self.editor.text
        self.editor.text = t[:self.pos] + t[self.pos + len(self.text):]

ed = Editor()
ed.execute(InsertCommand(ed, 0, "世界你好"))
ed.execute(InsertCommand(ed, 2, ", "))
print(ed.text)        # 世界, 你好
ed.undo()
print(ed.text)        # 世界你好
```

要点：命令对象把「做什么 + 用什么参数做 + 怎么反悔」封在一个对象里，`Editor` 只认识 execute/undo 两个动作——发出方与执行方解耦，这就是命令模式的全部动机；撤销栈是它最直观的收益。再把 `history` 换成持久化队列，同一套对象就是任务队列（[Celery](/python/860-PythonCeleryDistributedTaskQueue) 的任务对象也是命令模式）。
</details>

练习四（找错题）：这个模板方法有一处问题，先找再修：

```python
from abc import ABC, abstractmethod

class ReportGenerator(ABC):
    def generate(self):
        data = self.fetch()
        rendered = self.render(data)
        self.save(rendered)             # 骨架固定

    @abstractmethod
    def fetch(self): ...

class CsvReport(ReportGenerator):
    def fetch(self):
        return ["a,b,c"]

r = CsvReport()
r.generate()
```

提示：render 与 save 是谁的责任？

<details>
<summary>参考实现</summary>

```python
class CsvReport(ReportGenerator):
    def fetch(self):
        return ["a,b,c"]

    def render(self, data):
        return "\n".join(data)

    def save(self, rendered):
        print(f"保存 {len(rendered)} 字节")
```

问题：`CsvReport` 只实现了 `fetch`，`render` 与 `save` 既没有实现也不是抽象方法——`r.generate()` 运行到 `self.render(data)` 抛 `AttributeError`。模板方法的纪律是：**骨架方法（generate）固定步骤，每个步骤要么是抽象方法（子类必须实现）、要么是基类提供的默认实现**。修法两条路：其一，像上面那样在子类补齐两个方法；其二，若 render/save 有合理默认（如默认存字符串），在基类给出具体实现、子类按需覆盖。判断依据是「子类不实现它还说得通吗」——说不通的就标 `@abstractmethod`，让错误在实例化期爆发而不是运行中途。
</details>

练习五（实战题）：用责任链实现一个报销审批流：金额 < 500 组长审批、< 5000 经理审批、>= 5000 总监审批。每个审批者只处理自己权限内的请求，处理不了就传给下一个；写出链的组装与一次 3000 元请求的流转。

提示：`Handler` 基类持有 `next` 引用；`handle(request)` 判断权限，不行就 `self.next.handle(request)`。

<details>
<summary>参考实现</summary>

```python
from abc import ABC, abstractmethod

class Approver(ABC):
    def __init__(self, name: str, limit: int):
        self.name, self.limit = name, limit
        self.next: Approver | None = None

    def set_next(self, nxt: "Approver") -> "Approver":
        self.next = nxt
        return nxt                     # 链式组装

    @abstractmethod
    def approve(self, amount: int) -> str: ...

    def handle(self, amount: int) -> str:
        if amount <= self.limit:
            return self.approve(amount)
        if self.next is None:
            raise PermissionError("超出所有审批权限")
        return self.next.handle(amount)

class TeamLead(Approver):
    def approve(self, amount: int) -> str:
        return f"组长{self.name} 批准 {amount} 元"

class Manager(Approver):
    def approve(self, amount: int) -> str:
        return f"经理{self.name} 批准 {amount} 元"

class Director(Approver):
    def approve(self, amount: int) -> str:
        return f"总监{self.name} 批准 {amount} 元"

lead = TeamLead("小李", 500)
chain = lead.set_next(Manager("老王", 5000)).set_next(Director("张总", 100_000))
print(chain.handle(300))        # 组长小李 批准 300 元
print(chain.handle(3000))       # 经理老王 批准 3000 元
```

要点：`handle` 是链的通用流转逻辑（放基类），`approve` 是各环节的业务差异——两者分离让新增审批级别只写子类；`set_next` 返回下一环节支持一行组装整条链。Web 框架的中间件栈（请求依次穿过认证、日志、限流）就是同构的结构，FastAPI 的中间件与依赖注入见 [FastAPI](/python/880-PythonFastAPI)。
</details>

## 自我检查

- 能说出模块级实例为什么天然是单例，以及 `__new__` 单例写法的线程竞态窗口；
- 能把 if-elif 工厂改造成注册表工厂，并说出「对扩展开放、对修改关闭」在其中的体现；
- 能写出带 undo 的命令对象并解释命令模式如何解耦发出方与执行方；
- 能区分模板方法里「骨架方法」「抽象步骤」「默认步骤」三种角色；
- 能组装一条责任链并说出它与中间件栈的同构关系；
- 能给一个新需求判断「该用哪种模式」，并识别「不需要模式」的简单场景。
