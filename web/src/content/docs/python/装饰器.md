---
order: 75
tags:
  - python
  - decorator
difficulty: intermediate
title: 装饰器
module: python
category: 'Python Basics'
description: Python装饰器详解：函数装饰器、类装饰器、带参数装饰器、functools.wraps与实用装饰器模式。
author: fanquanpp
updated: '2026-06-13'
related:
  - python/Python与CLI
  - python/Python与配置管理
  - python/Python与消息队列
  - python/Python与gRPC
prerequisites:
  - python/语法速查
---

## 1. 装饰器基础

### 1.1 什么是装饰器

装饰器是一种高级Python语法，用于在不修改原函数代码的情况下，动态地给函数增加功能。装饰器本质上是一个高阶函数，接收一个函数作为参数，返回一个新函数。

```python
# 装饰器的本质
def my_decorator(func):
    def wrapper(*args, **kwargs):
        # 前置增强
        print("Before function call")
        # 调用原函数
        result = func(*args, **kwargs)
        # 后置增强
        print("After function call")
        return result
    return wrapper

# 应用装饰器
@my_decorator
def say_hello(name):
    print(f"Hello, {name}!")

# 等价于: say_hello = my_decorator(say_hello)
say_hello("Alice")
# Before function call
# Hello, Alice!
# After function call
```

### 1.2 装饰器的执行时机

```python
def decorator(func):
    print(f"装饰器被调用，装饰函数: {func.__name__}")
    def wrapper(*args, **kwargs):
        print(f"wrapper被调用")
        return func(*args, **kwargs)
    return wrapper

@decorator  # 此时就执行了decorator函数，而非调用greet时
def greet():
    print("Hello!")

# 输出: 装饰器被调用，装饰函数: greet
# 此时greet已经被替换为wrapper

greet()
# 输出: wrapper被调用
#        Hello!
```

## 2. 函数装饰器

### 2.1 基本装饰器模式

```python
import time
import functools

# 计时装饰器
def timer(func):
    @functools.wraps(func)  # 保留原函数的元信息
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        result = func(*args, **kwargs)
        end = time.perf_counter()
        print(f"{func.__name__} 耗时: {end - start:.4f}秒")
        return result
    return wrapper

@timer
def slow_function():
    time.sleep(1)
    return "Done"

result = slow_function()  # slow_function 耗时: 1.0012秒
print(result)  # Done
```

### 2.2 functools.wraps 的重要性

```python
import functools

# 不使用wraps：原函数信息丢失
def bad_decorator(func):
    def wrapper(*args, **kwargs):
        return func(*args, **kwargs)
    return wrapper

@bad_decorator
def my_function():
    """这是my_function的文档字符串"""
    pass

print(my_function.__name__)   # "wrapper"（不是"my_function"！）
print(my_function.__doc__)    # None（文档丢失！）

# 使用wraps：保留原函数信息
def good_decorator(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        return func(*args, **kwargs)
    return wrapper

@good_decorator
def my_function2():
    """这是my_function2的文档字符串"""
    pass

print(my_function2.__name__)  # "my_function2"
print(my_function2.__doc__)   # "这是my_function2的文档字符串"
```

### 2.3 带参数的装饰器

```python
import functools

# 三层嵌套：最外层接收装饰器参数
def retry(max_attempts=3, delay=1):
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(1, max_attempts + 1):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    if attempt == max_attempts:
                        raise
                    print(f"第{attempt}次尝试失败: {e}，{delay}秒后重试...")
                    time.sleep(delay)
        return wrapper
    return decorator

@retry(max_attempts=3, delay=2)
def unstable_api_call():
    import random
    if random.random() < 0.7:
        raise ConnectionError("API不可用")
    return "Success"

# 使用
result = unstable_api_call()
```

### 2.4 多个装饰器叠加

```python
import functools

def bold(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        return f"<b>{func(*args, **kwargs)}</b>"
    return wrapper

def italic(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        return f"<i>{func(*args, **kwargs)}</i>"
    return wrapper

# 装饰器从下到上执行（靠近函数的先执行）
@bold      # 第二步：加粗
@italic    # 第一步：斜体
def greet(name):
    return f"Hello, {name}"

print(greet("Alice"))  # <b><i>Hello, Alice</i></b>

# 等价于: greet = bold(italic(greet))
```

## 3. 类装饰器

### 3.1 用类作为装饰器

```python
import functools

class CountCalls:
    """统计函数调用次数的类装饰器"""

    def __init__(self, func):
        functools.update_wrapper(self, func)
        self.func = func
        self.count = 0

    def __call__(self, *args, **kwargs):
        self.count += 1
        print(f"{self.func.__name__} 已被调用 {self.count} 次")
        return self.func(*args, **kwargs)

@CountCalls
def say_hi(name):
    return f"Hi, {name}!"

say_hi("Alice")  # say_hi 已被调用 1 次
say_hi("Bob")    # say_hi 已被调用 2 次
print(say_hi.count)  # 2
```

### 3.2 装饰类

```python
def add_repr(cls):
    """为类自动添加__repr__方法"""
    def __repr__(self):
        attrs = ", ".join(f"{k}={v!r}" for k, v in self.__dict__.items())
        return f"{cls.__name__}({attrs})"

    cls.__repr__ = __repr__
    return cls

def add_eq(cls):
    """为类自动添加__eq__方法（基于所有属性）"""
    def __eq__(self, other):
        if not isinstance(other, cls):
            return False
        return self.__dict__ == other.__dict__

    cls.__eq__ = __eq__
    return cls

@add_repr
@add_eq
class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y

p1 = Point(1, 2)
p2 = Point(1, 2)
print(p1)          # Point(x=1, y=2)
print(p1 == p2)    # True
```

## 4. 实用装饰器模式

### 4.1 缓存装饰器

```python
import functools

def memoize(func):
    """带TTL的缓存装饰器"""
    cache = {}

    @functools.wraps(func)
    def wrapper(*args):
        if args in cache:
            return cache[args]
        result = func(*args)
        cache[args] = result
        return result

    wrapper.cache = cache
    wrapper.cache_clear = lambda: cache.clear()
    return wrapper

@memoize
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

print(fibonacci(100))  # 瞬间完成（缓存加速）

# Python内置: functools.lru_cache
@functools.lru_cache(maxsize=128)
def expensive_compute(n):
    print(f"Computing {n}...")
    return n * n

expensive_compute(5)   # Computing 5... → 25
expensive_compute(5)   # 25（缓存命中）
print(expensive_compute.cache_info())  # CacheInfo(hits=1, misses=1, ...)
```

### 4.2 类型检查装饰器

```python
import functools

def typecheck(**expected_types):
    """运行时类型检查装饰器"""
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # 检查位置参数
            import inspect
            sig = inspect.signature(func)
            bound = sig.bind(*args, **kwargs)
            bound.apply_defaults()

            for param_name, expected_type in expected_types.items():
                if param_name in bound.arguments:
                    value = bound.arguments[param_name]
                    if not isinstance(value, expected_type):
                        raise TypeError(
                            f"参数 '{param_name}' 期望类型 {expected_type.__name__}，"
                            f"实际类型 {type(value).__name__}"
                        )

            return func(*args, **kwargs)
        return wrapper
    return decorator

@typecheck(name=str, age=int)
def create_user(name, age):
    return f"User: {name}, Age: {age}"

print(create_user("Alice", 25))   # 正常
# create_user("Alice", "25")      # TypeError
```

### 4.3 单例模式装饰器

```python
import functools

def singleton(cls):
    """单例模式装饰器"""
    instances = {}

    @functools.wraps(cls)
    def get_instance(*args, **kwargs):
        if cls not in instances:
            instances[cls] = cls(*args, **kwargs)
        return instances[cls]

    return get_instance

@singleton
class DatabaseConnection:
    def __init__(self, host="localhost"):
        self.host = host
        print(f"连接到数据库: {host}")

db1 = DatabaseConnection("server1")  # 连接到数据库: server1
db2 = DatabaseConnection("server2")  # 已有实例，不再创建
print(db1 is db2)  # True
```

### 4.4 权限验证装饰器

```python
import functools

def require_role(*roles):
    """权限验证装饰器"""
    def decorator(func):
        @functools.wraps(func)
        def wrapper(user, *args, **kwargs):
            if user.role not in roles:
                raise PermissionError(
                    f"用户 '{user.name}' 角色 '{user.role}' 无权执行此操作，"
                    f"需要角色: {', '.join(roles)}"
                )
            return func(user, *args, **kwargs)
        return wrapper
    return decorator

class User:
    def __init__(self, name, role):
        self.name = name
        self.role = role

@require_role("admin", "moderator")
def delete_post(user, post_id):
    return f"帖子 {post_id} 已删除"

admin = User("Alice", "admin")
guest = User("Bob", "guest")

print(delete_post(admin, 1))  # "帖子 1 已删除"
# delete_post(guest, 1)       # PermissionError
```

## 5. 常见问题与解决方案

### 5.1 装饰器导致函数签名丢失

```python
# 问题：装饰后函数签名变为wrapper的签名
import inspect

def my_decorator(func):
    def wrapper(*args, **kwargs):
        return func(*args, **kwargs)
    return wrapper

@my_decorator
def greet(name: str, age: int = 25) -> str:
    return f"Hello, {name}!"

print(inspect.signature(greet))  # (*args, **kwargs) 而非 (name, age)

# 解决方案：使用functools.wraps
import functools

def good_decorator(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        return func(*args, **kwargs)
    return wrapper

@good_decorator
def greet2(name: str, age: int = 25) -> str:
    return f"Hello, {name}!"

print(inspect.signature(greet2))  # (name: str, age: int = 25) -> str
```

### 5.2 装饰器与类方法

```python
class MyClass:
    # 实例方法装饰器：第一个参数是self
    @timer
    def instance_method(self):
        time.sleep(0.1)

    # 类方法装饰器：第一个参数是cls
    @classmethod
    @timer
    def class_method(cls):
        time.sleep(0.1)

    # 静态方法装饰器
    @staticmethod
    @timer
    def static_method():
        time.sleep(0.1)

    # 注意装饰器顺序：@classmethod/@staticmethod 应在最外层
```

## 6. 总结与最佳实践

### 6.1 装饰器选择指南

| 场景         | 推荐方式            |
| :----------- | :------------------ |
| 简单增强     | 函数装饰器          |
| 需要维护状态 | 类装饰器            |
| 需要参数     | 三层嵌套装饰器      |
| 缓存         | functools.lru_cache |
| 方法装饰     | 注意self/cls参数    |

### 6.2 最佳实践

1. **始终使用 functools.wraps**：保留原函数元信息
2. **保持装饰器简单**：一个装饰器只做一件事
3. **通用装饰器用 \*args, **kwargs\*\*：兼容各种函数签名
4. **提供撤销机制**：如 `cache_clear()` 方法
5. **文档化装饰器行为**：说明装饰器对函数的影响
6. **避免过度使用**：装饰器增加调试难度，简单逻辑直接写在函数中
