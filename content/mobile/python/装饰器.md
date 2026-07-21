# 装饰器

> **符号约定**：`< >` 必填参数 | `[ ]` 可选参数

---

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
