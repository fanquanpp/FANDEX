---
order: 1010
title: Python 性能分析与优化
module: 'python'
category: 后端技术
difficulty: beginner
description: Python 性能分析与优化 的完整教学讲解。
author: fanquanpp
updated: '2026-09-08'
related: []
prerequisites: []
---

## timeit 计时

**基本写法：timeit 计时**
`timeit.timeit(<代码>, number=<次数>)`
```python
# 测量代码执行时间
import timeit

t = timeit.timeit("sum(range(100))", number=10000)
print(t)
```

**基本写法：repeat 重复测量**
`timeit.repeat(<代码>, repeat=<次数>, number=<次数>)`
```python
# 多次重复测量
times = timeit.repeat("sum(range(100))", repeat=5, number=10000)
print(min(times))
```

**基本写法：命令行**
`python -m timeit -s <setup> <代码>`
```python
# 命令行计时
# python -m timeit -s "import json" "json.dumps({'a':1})"
```

**基本写法：Timer 对象**
`timeit.Timer(<代码>, setup=<准备>)`
```python
# Timer 对象
t = timeit.Timer("x.append(1)", setup="x = []")
print(t.timeit(number=100000))
```

---

## time 性能计数器

**基本写法：perf_counter 高精度**
`time.perf_counter()`
```python
# 高精度计时器
import time

start = time.perf_counter()
# 执行代码
time.sleep(0.1)
end = time.perf_counter()
print(f"耗时 {end - start:.4f}s")
```

**基本写法：perf_counter_ns 纳秒**
`time.perf_counter_ns()`
```python
# 纳秒级精度
start = time.perf_counter_ns()
# 执行代码
end = time.perf_counter_ns()
print(f"耗时 {end - start}ns")
```

**基本写法：process_time 进程时间**
`time.process_time()`
```python
# 进程 CPU 时间（不含睡眠）
start = time.process_time()
# 执行代码
end = time.process_time()
print(f"CPU 时间 {end - start}s")
```

---

## cProfile 性能分析

**基本写法：cProfile 运行**
`cProfile.run(<代码字符串>)`
```python
# 分析代码性能
import cProfile

cProfile.run("sum(range(1000000))")
```

**基本写法：Profile 对象**
`cProfile.Profile()`
```python
# Profile 对象精细控制
prof = cProfile.Profile()
prof.enable()
# 执行代码
sum(range(100000))
prof.disable()
prof.print_stats(sort="cumtime")
```

**基本写法：排序输出**
`prof.print_stats(sort=<排序>)`
```python
# 按累计时间排序
prof.print_stats(sort="cumulative")
prof.print_stats(sort="tottime")  # 按总时间
```

**基本写法：保存到文件**
`prof.dump_stats(<文件>)`
```python
# 保存分析数据
prof.dump_stats("profile.prof")
```

**基本写法：pstats 分析**
`pstats.Stats(<文件>)`
```python
# 加载并分析 profile 文件
import pstats

stats = pstats.Stats("profile.prof")
stats.sort_stats("cumulative").print_stats(10)
```

---

## memory_profiler 内存分析

**基本写法：profile 装饰器**
`@profile`
```python
# 需要安装 memory_profiler
# pip install memory_profiler
@profile
def my_func():
    a = [1] * 1000000
    return sum(a)

my_func()
# 运行：python -m memory_profiler script.py
```

**基本写法：memit 内存峰值**
`%memit <表达式>`
```python
# IPython 中测量内存峰值
# %memit sum(range(1000000))
```

---

## sys.getsizeof 内存占用

**基本写法：获取对象大小**
`sys.getsizeof(<对象>)`
```python
# 获取对象字节大小
import sys

print(sys.getsizeof([1, 2, 3]))
print(sys.getsizeof("hello"))
print(sys.getsizeof({}))
```

**基本写法：tracemalloc 跟踪分配**
`tracemalloc.start()`
```python
# 跟踪内存分配
import tracemalloc

tracemalloc.start()
# 执行代码
data = [i for i in range(100000)]
snapshot = tracemalloc.take_snapshot()
for stat in snapshot.statistics("lineno")[:5]:
    print(stat)
```

**基本写法：比较快照**
`snapshot2.compare_to(snapshot1, "lineno")`
```python
# 比较两个内存快照
snap1 = tracemalloc.take_snapshot()
# 执行代码
snap2 = tracemalloc.take_snapshot()
for stat in snap2.compare_to(snap1, "lineno")[:5]:
    print(stat)
```

---

## dis 字节码分析

**基本写法：反汇编**
`dis.dis(<函数>)`
```python
# 查看函数字节码
import dis

def loop():
    total = 0
    for i in range(100):
        total += i
    return total

dis.dis(loop)
```

---

## 优化技巧

**基本写法：列表推导优于循环**
`[<表达式> for <变量> in <可迭代>]`
```python
# 列表推导比 append 循环快
squares = [x * x for x in range(1000)]
```

**基本写法：生成器节省内存**
`(<表达式> for <变量> in <可迭代>)`
```python
# 大数据用生成器
squares_gen = (x * x for x in range(1000000))
```

**基本写法：set 成员查找**
`<值> in <集合>`
```python
# set 查找 O(1)，list 查找 O(n)
valid = {"a", "b", "c"}  # 用 set 而非 list
if x in valid:
    pass
```

**基本写法：局部变量优化**
`def <函数>():\n    <局部变量>`
```python
# 局部变量比全局变量快
def compute():
    # 局部变量访问快
    total = sum
    return total(range(100))
```

**基本写法：__slots__ 节省内存**
`class <类>:\n    __slots__ = (<字段>,)`
```python
# __slots__ 减少内存与加速属性访问
class Point:
    __slots__ = ("x", "y")
    def __init__(self, x, y):
        self.x = x
        self.y = y
```

**基本写法：lru_cache 缓存**
`@functools.lru_cache(maxsize=<大小>)`
```python
# 缓存函数结果
from functools import lru_cache

@lru_cache(maxsize=128)
def fib(n):
    if n < 2:
        return n
    return fib(n - 1) + fib(n - 2)
```

---

## sys.monitoring 监控（3.12+）

**基本写法：注册监控工具**
`sys.monitoring.use_tool_id(<ID>, <名称>)`
```python
# Python 3.12 低开销监控（PEP 669）
import sys.monitoring

sys.monitoring.use_tool_id(0, "my_profiler")
sys.monitoring.register_callback(
    sys.monitoring.events.PY_START,
    0,
    lambda code, offset: print("开始", code.co_name)
)
```

**基本写法：获取事件**
`sys.monitoring.events`
```python
# 监控事件类型
print(sys.monitoring.events.PY_START)
print(sys.monitoring.events.PY_RESUME)
print(sys.monitoring.events.CALL)
```

---

## 并行加速

**基本写法：多进程 CPU 密集**
`concurrent.futures.ProcessPoolExecutor()`
```python
# CPU 密集型用多进程
from concurrent.futures import ProcessPoolExecutor

def heavy(n):
    return sum(i * i for i in range(n))

if __name__ == "__main__":
    with ProcessPoolExecutor() as ex:
        results = list(ex.map(heavy, [1000000, 2000000, 3000000]))
```

**基本写法：多线程 IO 密集**
`concurrent.futures.ThreadPoolExecutor()`
```python
# IO 密集型用多线程或 asyncio
from concurrent.futures import ThreadPoolExecutor
import urllib.request

def fetch(url):
    with urllib.request.urlopen(url) as r:
        return r.read()

with ThreadPoolExecutor(max_workers=10) as ex:
    results = list(ex.map(fetch, urls))
```

---

## 字符串拼接优化

**基本写法：join 优于 +**
`"<分隔>".join(<字符串列表>)`
```python
# join 比 + 拼接高效
parts = ["a", "b", "c"]
result = "".join(parts)  # 优于 result = parts[0] + parts[1] + ...
```
