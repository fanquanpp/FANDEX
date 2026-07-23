---
order: 81
title: Python与设计模式
module: python
category: Python
difficulty: intermediate
description: Python实现设计模式
author: fanquanpp
updated: '2026-06-14'
related:
  - python/内置数据结构
  - python/正则表达式
  - python/Python与打包发布
  - python/Python与Jupyter
prerequisites:
  - python/语法速查
---

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

### 单例模式

```python
# 方式一：模块级别变量（最 Pythonic）
# config.py
class _Config:
    def __init__(self):
        self.debug = False
        self.host = "localhost"

config = _Config()  # 模块只会被导入一次，天然单例

# 方式二：使用 __new__
class Singleton:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

# 方式三：使用元类
class SingletonMeta(type):
    _instances = {}

    def __call__(cls, *args, **kwargs):
        if cls not in cls._instances:
            cls._instances[cls] = super().__call__(*args, **kwargs)
        return cls._instances[cls]

class Database(metaclass=SingletonMeta):
    def __init__(self):
        self.connection = "connected"
```

### 工厂模式

```python
# 简单工厂
class Animal:
    def speak(self):
        raise NotImplementedError

class Dog(Animal):
    def speak(self):
        return "汪汪"

class Cat(Animal):
    def speak(self):
        return "喵喵"

def create_animal(animal_type: str) -> Animal:
    """根据类型创建动物实例"""
    animals = {"dog": Dog, "cat": Cat}
    if animal_type not in animals:
        raise ValueError(f"未知动物类型: {animal_type}")
    return animals[animal_type]()

# 使用
dog = create_animal("dog")
print(dog.speak())  # 汪汪
```

## 详细用法

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

## 常见场景

### 场景一：插件系统

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

### 场景二：责任链模式

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

### 场景三：模板方法模式

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
