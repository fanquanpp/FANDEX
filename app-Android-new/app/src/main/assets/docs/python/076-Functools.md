---
order: 760
title: Python functools 函数工具
module: 'python'
category: 后端技术
difficulty: beginner
description: Python functools 函数工具 的完整教学讲解。
author: fanquanpp
updated: '2026-08-01'
---

## reduce 归约

**基本写法：reduce 归约**
`functools.reduce(<函数>, <可迭代>, [初始值])`
```python
# 累积应用函数到所有元素
from functools import reduce
import operator
result = reduce(operator.add, [1, 2, 3, 4], 0)  # 10
```

**基本写法：reduce 求最大值**
`functools.reduce(lambda a, b: a if a > b else b, <可迭代>)`
```python
# 找出最大值
from functools import reduce
nums = [3, 1, 4, 1, 5, 9]
m = reduce(lambda a, b: a if a > b else b, nums)  # 9
```

---

## 缓存装饰器

**基本写法：lru_cache LRU 缓存**
`@lru_cache(maxsize=<大小>)`
```python
# 基于最近最少使用策略的缓存
from functools import lru_cache
@lru_cache(maxsize=128)
def fibonacci(n):
    if n < 2:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)
```

**基本写法：cache 无限缓存**
`@cache`
```python
# Python 3.9+ 无大小限制的缓存
from functools import cache
@cache
def slow_query(key):
    return database.get(key)
```

**基本写法：查看缓存信息**
`<函数>.cache_info()`
```python
# 查看缓存命中情况
fibonacci(50)
print(fibonacci.cache_info())
# CacheInfo(hits=49, misses=51, maxsize=128, currsize=51)
```

**基本写法：清除缓存**
`<函数>.cache_clear()`
```python
# 手动清空缓存
fibonacci.cache_clear()
```

**基本写法：Python 3.9+ typed 参数类型区分**
`@lru_cache(typed=True)`
```python
# 区分不同参数类型（1 和 1.0 分别缓存）
from functools import lru_cache
@lru_cache(typed=True)
def f(x):
    return x * 2
```

---

## partial 偏函数

**基本写法：创建偏函数**
`functools.partial(<函数>, *<参数>, **<关键字参数>)`
```python
# 固定部分参数生成新函数
from functools import partial
int2 = partial(int, base=2)
print(int2("1010"))  # 10
```

**基本写法：固定位置参数**
`functools.partial(<函数>, <值>)`
```python
# 固定第一个参数
from functools import partial
def power(base, exp):
    return base ** exp
square = partial(power, exp=2)
print(square(5))  # 25
```

**基本写法：partial 对象属性**
`<偏函数>.args / .keywords`
```python
# 查看偏函数固定的参数
p = partial(int, base=2)
print(p.args)      # ()
print(p.keywords)  # {'base': 2}
```

---

## wraps 保留元信息

**基本写法：使用 @wraps**
`@wraps(<原函数>)`
```python
# 装饰器中保留原函数元信息
from functools import wraps
def my_decorator(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        return func(*args, **kwargs)
    return wrapper
```

---

## singledispatch 单分派

**基本写法： singledispatch 按类型分派**
`@singledispatch`
```python
# 根据第一个参数类型调用不同实现
from functools import singledispatch
@singledispatch
def process(data):
    raise TypeError(f"不支持类型: {type(data)}")

@process.register
def _(data: int):
    return f"整数: {data}"
```

**基本写法：注册分派函数**
`@<函数>.register`
```python
# 注册字符串类型处理
@process.register
def _(data: str):
    return f"字符串: {data}"
```

**基本写法：注册多个类型**
`@<函数>.register(<类型1>, <类型2>)`
```python
# 一个实现处理多种类型
@process.register(list)
@process.register(tuple)
def _(data):
    return f"序列: {len(data)} 项"
```

---

## singledispatchmethod 方法分派

**基本写法： singledispatchmethod 类方法分派**
`@singledispatchmethod`
```python
# Python 3.8+ 类方法按参数类型分派
from functools import singledispatchmethod
class Processor:
    @singledispatchmethod
    def process(self, data):
        raise TypeError("不支持")
    @process.register
    def _from_int(self, data: int):
        return data * 2
```

---

## total_ordering 自动补全比较方法

**换行写法：total_ordering 装饰类**
`@total_ordering`
`class <类名>:`
`    def __eq__(self, other): ...`
`    def __lt__(self, other): ...`

```python
# 定义一个比较方法后自动生成其余
from functools import total_ordering
@total_ordering
class Student:
    def __init__(self, name, grade):
        self.name = name
        self.grade = grade
    def __eq__(self, other):
        return self.grade == other.grade
    def __lt__(self, other):
        return self.grade < other.grade
```

---

## cached_property 缓存属性

**基本写法：cached_property**
`@cached_property`
```python
# 属性计算结果缓存，只计算一次
from functools import cached_property
class DataSet:
    def __init__(self, data):
        self.data = data
    @cached_property
    def mean(self):
        return sum(self.data) / len(self.data)
```

---

## cmp_to_key 比较函数转键

**基本写法：cmp_to_key 转换比较函数**
`functools.cmp_to_key(<比较函数>)`
```python
# 将旧式比较函数转为 key 函数
from functools import cmp_to_key
def compare(a, b):
    if a < b:
        return -1
    elif a > b:
        return 1
    return 0
sorted([3, 1, 2], key=cmp_to_key(compare))
```

---

## Python 3.13+ functools 增强

**基本写法：Python 3.13+ lru_cache 不带参数**
`@lru_cache`
```python
# Python 3.13+ lru_cache 无参数时等同于 cache
from functools import lru_cache
@lru_cache
def compute(x):
    return x * x
```

**基本写法：Python 3.13+ singledispatch 泛型方法**
`@singledispatchmethod`
```python
# Python 3.13+ 支持联合类型注册
from functools import singledispatch
@singledispatch
def handle(data):
    pass
@handle.register(int | float)
def _(data):
    return data * 2
```
