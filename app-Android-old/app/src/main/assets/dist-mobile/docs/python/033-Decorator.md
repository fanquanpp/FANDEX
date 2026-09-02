## 前置知识

- [Python 与配置管理：从环境变量到云原生动态配置的工程实践](/python/032-Python)：建议先完成前一篇的学习

## 学习目标

- 掌握「1. 装饰器基础」的核心机制、典型用法与常见陷阱
- 掌握「2. 函数装饰器」的核心机制、典型用法与常见陷阱
- 掌握「3. 类装饰器」的核心机制、典型用法与常见陷阱
- 掌握「4. 实用装饰器模式」的核心机制、典型用法与常见陷阱
- 掌握「5. 常见问题与解决方案」的核心机制、典型用法与常见陷阱


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
## 基本装饰器

**换行写法：定义基本装饰器**
`def <装饰器名>(func):`
`    def wrapper(*args, **kwargs):`
`        <前置处理>`
`        result = func(*args, **kwargs)`
`        <后置处理>`
`        return result`
`    return wrapper`

```python
# 定义基本装饰器
def my_decorator(func):
    def wrapper(*args, **kwargs):
        print("函数执行前")
        result = func(*args, **kwargs)
        print("函数执行后")
        return result
    return wrapper
```

---

**基本写法：使用装饰器**
`@<装饰器名>`
`def <函数名>(<参数>): <语句>`

```python
# 使用装饰器装饰函数
@my_decorator
def say_hello(name):
    print(f"Hello, {name}!")
```

---

**基本写法：手动应用装饰器**
`<函数> = <装饰器>(<函数>)`

```python
# 手动应用装饰器
def say_hello(name):
    print(f"Hello, {name}!")

say_hello = my_decorator(say_hello)
```

---

## 带参数的装饰器

**换行写法：定义带参数的装饰器**
`def <装饰器名>(<参数>):`
`    def decorator(func):`
`        def wrapper(*args, **kwargs): <语句>`
`        return wrapper`
`    return decorator`

```python
# 定义带参数的装饰器
def repeat(times):
    def decorator(func):
        def wrapper(*args, **kwargs):
            for _ in range(times):
                result = func(*args, **kwargs)
            return result
        return wrapper
    return decorator
```

---

**基本写法：使用带参数的装饰器**
`@<装饰器名>(<参数>)`
`def <函数名>(<参数>): <语句>`

```python
# 使用带参数的装饰器
@repeat(times=3)
def greet(name):
    print(f"Hello, {name}!")
```

---

## functools.wraps 保留元信息

**换行写法：使用 @wraps 保留元信息**
`from functools import wraps`
`def <装饰器名>(func):`
`    @wraps(func)`
`    def wrapper(*args, **kwargs): <语句>`
`    return wrapper`

```python
# 使用 @wraps 保留原函数的元信息
from functools import wraps

def my_decorator(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        print(f"调用 {func.__name__}")
        return func(*args, **kwargs)
    return wrapper
```

---

## 类装饰器

**换行写法：使用类作为装饰器**
`class <装饰器类>:`
`    def __init__(self, func): self.func = func`
`    def __call__(self, *args, **kwargs): <语句>`

```python
# 使用类作为装饰器
class CountCalls:
    def __init__(self, func):
        self.func = func
        self.count = 0

    def __call__(self, *args, **kwargs):
        self.count += 1
        print(f"调用次数: {self.count}")
        return self.func(*args, **kwargs)
```

---

**基本写法：使用类装饰器**
`@<装饰器类>`
`def <函数名>(<参数>): <语句>`

```python
# 使用类装饰器
@CountCalls
def say_hello():
    print("Hello!")
```

---

## 带参数的类装饰器

**换行写法：定义带参数的类装饰器**
`class <装饰器类>:`
`    def __init__(self, <参数>): <语句>`
`    def __call__(self, func): <返回包装函数>`

```python
# 定义带参数的类装饰器
class Repeat:
    def __init__(self, times):
        self.times = times

    def __call__(self, func):
        def wrapper(*args, **kwargs):
            for _ in range(self.times):
                result = func(*args, **kwargs)
            return result
        return wrapper
```

---

## 方法装饰器

**换行写法：装饰类的方法**
`class <类名>:`
`    @<装饰器名>`
`    def <方法名>(self, <参数>): <语句>`

```python
# 装饰类的方法
class MyClass:
    @my_decorator
    def my_method(self):
        print("方法执行")
```

---

## 属性装饰器

**基本写法：使用 @property 定义属性**
`@property`
`def <属性名>(self): return <值>`

```python
# 使用 @property 定义只读属性
class Circle:
    def __init__(self, radius):
        self._radius = radius

    @property
    def area(self):
        return 3.14159 * self._radius ** 2
```

---

**基本写法：使用 @staticmethod 定义静态方法**
`@staticmethod`
`def <方法名>(<参数>): <语句>`

```python
# 使用 @staticmethod 定义静态方法
class MathHelper:
    @staticmethod
    def add(a, b):
        return a + b
```

---

**基本写法：使用 @classmethod 定义类方法**
`@classmethod`
`def <方法名>(cls, <参数>): <语句>`

```python
# 使用 @classmethod 定义类方法
class Counter:
    count = 0

    @classmethod
    def increment(cls):
        cls.count += 1
        return cls.count
```

---

## 多个装饰器叠加

**换行写法：叠加多个装饰器**
`@<装饰器1>`
`@<装饰器2>`
`def <函数名>(<参数>): <语句>`

```python
# 叠加多个装饰器（从下往上执行）
@decorator1
@decorator2
def my_function():
    print("Hello")
```

---

## 常用内置装饰器

**基本写法：使用 @staticmethod**
`@staticmethod`
`def <方法名>(<参数>): <语句>`

```python
# 使用 @staticmethod
class MyClass:
    @staticmethod
    def static_method():
        return "静态方法"
```

---

**基本写法：使用 @classmethod**
`@classmethod`
`def <方法名>(cls, <参数>): <语句>`

```python
# 使用 @classmethod
class MyClass:
    @classmethod
    def class_method(cls):
        return "类方法"
```

---

**基本写法：使用 @property**
`@property`
`def <属性名>(self): <语句>`

```python
# 使用 @property
class MyClass:
    @property
    def value(self):
        return self._value
```

---

**基本写法：使用 @abstractmethod**
`@abstractmethod`
`def <方法名>(self): <语句>`

```python
# 使用 @abstractmethod 定义抽象方法
from abc import ABC, abstractmethod

class Animal(ABC):
    @abstractmethod
    def speak(self):
        pass
```

---

**基本写法：使用 @dataclass**
`@dataclass`
`class <类名>: <类体>`

```python
# 使用 @dataclass
from dataclasses import dataclass

@dataclass
class Point:
    x: float
    y: float
```

---

**基本写法：使用 @lru_cache**
`@lru_cache(maxsize=<n>)`
`def <函数名>(<参数>): <语句>`

```python
# 使用 @lru_cache 缓存函数结果
from functools import lru_cache

@lru_cache(maxsize=128)
def fibonacci(n):
    if n < 2:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)
```

---

## 装饰器实战

**换行写法：计时装饰器**
`def <装饰器名>(func):`
`    @wraps(func)`
`    def wrapper(*args, **kwargs):`
`        start = time.time()`
`        result = func(*args, **kwargs)`
`        end = time.time()`
`        print(f"耗时: {end - start}")`
`        return result`
`    return wrapper`

```python
# 计时装饰器
import time
from functools import wraps

def timer(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        start = time.time()
        result = func(*args, **kwargs)
        end = time.time()
        print(f"{func.__name__} 耗时: {end - start:.4f} 秒")
        return result
    return wrapper
```

---

**换行写法：日志装饰器**
`def <装饰器名>(func):`
`    @wraps(func)`
`    def wrapper(*args, **kwargs):`
`        print(f"调用 {func.__name__}, 参数: {args}, {kwargs}")`
`        result = func(*args, **kwargs)`
`        print(f"返回: {result}")`
`        return result`
`    return wrapper`

```python
# 日志装饰器
from functools import wraps

def logger(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        print(f"调用 {func.__name__}, 参数: {args}, {kwargs}")
        result = func(*args, **kwargs)
        print(f"返回: {result}")
        return result
    return wrapper
```

---

**换行写法：权限验证装饰器**
`def <装饰器名>(<权限参数>):`
`    def decorator(func):`
`        @wraps(func)`
`        def wrapper(*args, **kwargs):`
`            if not <检查权限>: raise <异常>`
`            return func(*args, **kwargs)`
`        return wrapper`
`    return decorator`

```python
# 权限验证装饰器
from functools import wraps

def require_role(role):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            if not has_role(role):
                raise PermissionError(f"需要 {role} 权限")
            return func(*args, **kwargs)
        return wrapper
    return decorator
```

---

**换行写法：重试装饰器**
`def <装饰器名>(max_retries=<n>):`
`    def decorator(func):`
`        @wraps(func)`
`        def wrapper(*args, **kwargs):`
`            for attempt in range(max_retries):`
`                try: return func(*args, **kwargs)`
`                except <异常>: <处理>`
`        return wrapper`
`    return decorator`

```python
# 重试装饰器
import time
from functools import wraps

def retry(max_retries=3, delay=1):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    if attempt == max_retries - 1:
                        raise
                    time.sleep(delay)
        return wrapper
    return decorator
```

---

**换行写法：缓存装饰器**
`def <装饰器名>(func):`
`    cache = {}`
`    @wraps(func)`
`    def wrapper(*args):`
`        if args not in cache: cache[args] = func(*args)`
`        return cache[args]`
`    return wrapper`

```python
# 自定义缓存装饰器
from functools import wraps

def memoize(func):
    cache = {}
    @wraps(func)
    def wrapper(*args):
        if args not in cache:
            cache[args] = func(*args)
        return cache[args]
    return wrapper
```

---

## 装饰器类实战

**换行写法：使用类实现计数装饰器**
`class <装饰器类>:`
`    def __init__(self, func):`
`        self.func = func`
`        self.count = 0`
`    def __call__(self, *args, **kwargs):`
`        self.count += 1`
`        return self.func(*args, **kwargs)`

```python
# 使用类实现计数装饰器
class CountCalls:
    def __init__(self, func):
        self.func = func
        self.count = 0

    def __call__(self, *args, **kwargs):
        self.count += 1
        print(f"调用次数: {self.count}")
        return self.func(*args, **kwargs)
```

---

## 装饰器堆栈

**换行写法：多个装饰器组合使用**
`@<装饰器1>`
`@<装饰器2>`
`@<装饰器3>`
`def <函数名>(<参数>): <语句>`

```python
# 多个装饰器组合使用
@timer
@logger
@retry(max_retries=3)
def fetch_data(url):
    print(f"从 {url} 获取数据")
    return "data"
```

---

## 装饰器与元信息

**基本写法：访问装饰后的函数名**
`<函数>.__name__`

```python
# 访问装饰后的函数名（使用 @wraps 保留原信息）
@my_decorator
def my_function():
    pass

print(my_function.__name__)
```

---

**基本写法：访问装饰后的函数文档**
`<函数>.__doc__`

```python
# 访问装饰后的函数文档
@my_decorator
def my_function():
    """这是函数文档"""
    pass

print(my_function.__doc__)
```

---

## functools 模块工具

**基本写法：使用 @wraps**
`@wraps(<原函数>)`

```python
# 使用 @wraps 保留原函数元信息
from functools import wraps

def my_decorator(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        return func(*args, **kwargs)
    return wrapper
```

---

**基本写法：使用 @lru_cache**
`@lru_cache(maxsize=<n>)`

```python
# 使用 @lru_cache 实现缓存
from functools import lru_cache

@lru_cache(maxsize=128)
def expensive_function(n):
    return sum(i * i for i in range(n))
```

---

**基本写法：使用 @cache**
`@cache`

```python
# 使用 @cache 无限缓存
from functools import cache

@cache
def fibonacci(n):
    if n < 2:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)
```

---

**基本写法：使用 @cached_property**
`@cached_property`
`def <属性名>(self): <语句>`

```python
# 使用 @cached_property 缓存属性计算结果
from functools import cached_property

class Circle:
    def __init__(self, radius):
        self.radius = radius

    @cached_property
    def area(self):
        return 3.14159 * self.radius ** 2
```

---

**基本写法：使用 @singledispatch**
`@singledispatch`
`def <函数名>(<参数>): <语句>`

```python
# 使用 @singledispatch 实现函数重载
from functools import singledispatch

@singledispatch
def process(data):
    raise TypeError(f"不支持的类型: {type(data)}")

@process.register
def _(data: int):
    return f"处理整数: {data}"
```

---

**基本写法：注册 singledispatch 处理器**
`@<函数>.register`
`def _(<参数>: <类型>): <语句>`

```python
# 注册 singledispatch 的字符串处理器
@process.register
def _(data: str):
    return f"处理字符串: {data}"
```

---

## 装饰器与类型注解

**换行写法：带类型注解的装饰器**
`from typing import Callable, TypeVar`
`T = TypeVar("T")`
`def <装饰器名>(func: Callable[..., T]) -> Callable[..., T]:`
`    def wrapper(*args, **kwargs) -> T: return func(*args, **kwargs)`
`    return wrapper`

```python
# 带类型注解的装饰器
from typing import Callable, TypeVar, Any
from functools import wraps

T = TypeVar("T")

def my_decorator(func: Callable[..., T]) -> Callable[..., T]:
    @wraps(func)
    def wrapper(*args: Any, **kwargs: Any) -> T:
        print("装饰器执行")
        return func(*args, **kwargs)
    return wrapper
```
