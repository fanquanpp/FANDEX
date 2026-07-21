---
order: 80
title: Python与性能优化
module: python
category: Python
difficulty: advanced
description: 性能分析与优化技巧
author: fanquanpp
updated: '2026-06-14'
related:
  - python/Python与WebSocket
  - 'python/Python与CI-CD'
  - python/内置数据结构
  - python/正则表达式
prerequisites:
  - python/语法速查
---

# Python 与性能优化

> 本文档对标 MIT 6.172 "Performance Engineering of Software Systems"、Stanford CS107 "Computer Organization & Systems"、CMU 15-410 "Distributed Systems" 中性能优化模块的教学水准，系统讲解 Python 性能分析的形式化方法、优化原理与生产级实践。

## 1. 学习目标

完成本章节学习后，你应当能够：

### 1.1 记忆（Remember）

- **R1**：列举 Python 性能分析的五大工具（`cProfile`、`line_profiler`、`memory_profiler`、`py-spy`、`scalene`）及各自适用场景。
- **R2**：复述 Amdahl 定律、Little 定律、Roofline 模型的数学定义。
- **R3**：陈述 CPython 解释器的执行流程（源码 → AST → 字节码 → PVM）与 JIT 编译的差异。

### 1.2 理解（Understand）

- **U1**：解释 Python 比 C 慢 10-100 倍的根本原因（解释执行、动态类型、对象模型、GIL）。
- **U2**：阐述 `__slots__`、`functools.lru_cache`、生成器三大优化在内存与时间复杂度上的数学基础。
- **U3**：描述 NumPy 向量化（vectorization）相对 Python 循环的性能优势原理（SIMD、连续内存、C 内核）。

### 1.3 应用（Apply）

- **A1**：使用 `cProfile` + `pstats` + `snakeviz` 定位一个程序的热点函数，并提出优化方案。
- **A2**：使用 `multiprocessing` + `NumPy` 将一个 CPU 密集型任务加速 4-8 倍。
- **A3**：使用 `asyncio` + `aiohttp` 将一个 IO 密集型任务从 100 秒优化到 5 秒。

### 1.4 分析（Analyze）

- **An1**：对比 `cProfile`（确定性）与 `py-spy`（采样）的输出差异，分析何时应选采样 profiler。
- **An2**：剖析一个 100 万行数据处理脚本，识别瓶颈（CPU vs IO vs 内存）并制定优化优先级。
- **An3**：分析一段使用 `asyncio` 但未获加速的代码，定位"伪异步"调用（如同步 `requests.get`）。

### 1.5 评价（Evaluate）

- **E1**：在团队规范会议上，论证是否应引入 Cython 或 Rust（PyO3）重写热点模块。
- **E2**：评估 PyPy 替代 CPython 的兼容性风险与性能收益。
- **E3**：判断"过早优化是万恶之源"（Knuth）在 Python 项目中的适用边界。

### 1.6 创造（Create）

- **C1**：设计一个支持自动 benchmark 回归的 CI 流水线，性能回退超过 5% 自动阻断合并。
- **C2**：实现一个基于 `__slots__` + `array.array` + `mmap` 的大规模数据加载器，达到内存零拷贝。
- **C3**：构建一个混合并发 pipeline（`asyncio` + `multiprocessing` + `NumPy`），处理亿级日志数据。

---

## 2. 历史动机与发展脉络

### 2.1 Python 性能的先天局限（1991–2000）

Python 诞生之初，Guido van Rossum 明确将"开发效率优于运行效率"作为核心哲学。CPython 解释器采用**树遍历解释器**（tree-walking interpreter）+ **字节码虚拟机**（PVM）架构，相比 C 的原生机器码执行，存在三层开销：

1. **解释执行**：每条字节码都经过 PVM 的 switch-case 分派，无 JIT 编译。
2. **动态类型**：每次变量操作需检查类型，调用 `__add__` 等魔术方法。
3. **对象模型**：所有值都是 `PyObject*`，连 `int` 也需装箱（boxing）为堆对象。

1990 年代硬件单核性能每年增长约 50%，Python 的性能劣势被硬件红利掩盖。

### 2.2 Psyco 与早期 JIT（2004–2010）

2004 年 Armin Rigo 发布 **Psyco**，Python 第一个实用 JIT 编译器，通过** specialize**（特化）技术为不同类型的函数生成机器码。Psyco 可使纯 Python 代码提速 2-100x，但仅支持 32 位 x86，且内存占用高。Python 3.x 后 Psyco 停止维护。

### 2.3 PyPy 的崛起（2011–）

2011 年 PyPy 1.6 发布，由 PyPy 团队（基于 EU PyPy 联盟资助）开发的**跟踪 JIT**（tracing JIT）实现。PyPy 通过**元追踪**（meta-tracing）记录程序执行轨迹，热点循环编译为机器码。典型场景下 PyPy 比 CPython 快 4-5x，但启动慢、C 扩展兼容性差（需 cpyext 桥接）。

### 2.4 NumPy 与科学计算（2006–）

Travis Oliphant 于 2006 年发布 NumPy 1.0，通过**同质数组**（homogeneous array）+ **C 内核**+ **BLAS/LAPACK** 集成，使 Python 在数值计算领域达到接近 C 的性能。NumPy 的**向量化**（vectorization）通过 SIMD（SSE/AVX/NEON）指令并行处理，单条操作可处理 4-16 个 float64。

### 2.5 Cython 与静态类型（2007–）

Cython（前身 Pyrex）由 Greg Ewing 创建，Stefan Behnel 长期维护。Cython 允许在 Python 代码中混入静态 C 类型声明，编译为 C 扩展。Cython 的性能优势来自：

1. **静态类型消除**：消除动态分派开销。
2. **C 内联**：循环直接编译为 C 机器码。
3. **直接内存访问**：可绕过 `PyObject` 装箱。

Cython 是 NumPy、pandas、scikit-learn 等科学计算库的隐形基石。

### 2.6 现代 Profiler 时代（2018–）

2018 年后，性能分析工具迎来爆发：

- **py-spy**（2018，Ben Frederickson）：用 Rust 实现的采样 profiler，开销 < 1%，可在生产环境运行。
- **scalene**（2020，Michael Burger 等）：MIT 开发的低开销 profiler，同时分析 CPU、内存、GPU、复制量。
- **memray**（2022，Bloomberg）：内存 profiler，支持原生扩展与线程级分析。
- **Austin**（2020，Gabriele N. Tornetta）：栈采样器，与 PyPy 兼容。

### 2.7 性能工具链 Rust 化（2022–）

Pydantic v2（2023）、Ruff（2022）、Polars（2021）等用 Rust 重写的工具，使 Python 生态进入"性能关键路径 Rust 化"时代。Rust 通过 **PyO3** FFI 与 Python 互操作，性能接近原生 C，同时保证内存安全。

### 2.8 设计哲学总结

Python 性能优化的核心哲学：

> "Make it work, make it right, make it fast—in that order."
>
> —— Kent Beck

Guido van Rossum 在 PyCon 2019 的演讲中强调：

> "Python is not slow; the wrong Python is slow. Choose the right tool for the right job: NumPy for arrays, asyncio for IO, multiprocessing for CPU, Cython for hotspots."

---

## 3. 形式化定义

### 3.1 性能的四维模型

程序性能 $P$ 可建模为四维向量：

$$
P = \langle T, M, E, L \rangle
$$

其中：

- $T$（Time）：执行时间，单位秒（s）或毫秒（ms）。
- $M$（Memory）：内存峰值，单位字节（B）或 MB。
- $E$（Energy）：能耗，单位焦耳（J），与 CPU 功耗成正比。
- $L$（Latency）：尾延迟（p99、p999），单位毫秒。

### 3.2 时间复杂度的形式化

设输入规模为 $n$，算法 $A$ 的时间复杂度 $T_A(n)$ 满足 Big-O 定义：

$$
T_A(n) = O(g(n)) \iff \exists c, n_0 > 0: \forall n \geq n_0, T_A(n) \leq c \cdot g(n)
$$

常见复杂度等级（按性能从优到劣）：

$$
O(1) \subset O(\log n) \subset O(\sqrt{n}) \subset O(n) \subset O(n \log n) \subset O(n^2) \subset O(2^n) \subset O(n!)
$$

### 3.3 Amdahl 定律

设任务中可加速部分占比为 $p$，加速比为 $s$，则总加速比 $S$ 满足 Amdahl 定律：

$$
S = \frac{1}{(1-p) + \frac{p}{s}}
$$

理论极限（$s \to \infty$）：

$$
S_{\infty} = \frac{1}{1-p}
$$

**例**：若 80% 代码可向量化加速 10x，则总加速比为 $\frac{1}{0.2 + 0.08} = 3.57$x。

### 3.4 Little 定律

在稳定状态下，系统并发数 $L$、到达率 $\lambda$、平均响应时间 $W$ 满足：

$$
L = \lambda \cdot W
$$

**例**：QPS = 1000，平均响应时间 = 0.05s，则系统并发数 = 50。

### 3.5 Roofline 模型

Roofline 模型（Williams et al., 2009）描述计算性能上限：

$$
P = \min\left(P_{\text{peak}}, \text{AI} \cdot B\right)
$$

其中 $P_{\text{peak}}$ 为算力峰值（FLOPS），AI 为算术强度（Arithmetic Intensity，FLOPS/byte），$B$ 为内存带宽（bytes/sec）。

Python 在 Roofline 模型中的位置：

- 纯 Python 循环：AI 低，$P$ 受限于解释器开销，远低于 Roofline。
- NumPy 向量化：AI 高，$P$ 接近 Roofline（受限于 BLAS 性能）。

### 3.6 内存层级

现代计算机内存层级（latency 递增）：

| 层级 | 大小 | 延迟（cycles） | 带宽 |
| ---- | ---- | -------------- | ---- |
| L1 cache | 32KB | 4 | ~1 TB/s |
| L2 cache | 256KB | 12 | ~500 GB/s |
| L3 cache | 8MB | 40 | ~200 GB/s |
| DRAM | 16GB+ | 200 | ~50 GB/s |
| NVMe SSD | 1TB+ | 30000 | ~3 GB/s |

Python `list` 的元素是 `PyObject*` 指针（8 bytes），实际对象分散在堆上，cache 局部性极差。NumPy `ndarray` 的元素连续存储，cache 利用率高。

---

## 4. 理论推导与原理解析

### 4.1 CPython 字节码执行的开销

考虑 `a + b` 的字节码：

```
LOAD_FAST 0 (a)   # 从栈帧加载 a，1 cycle
LOAD_FAST 1 (b)   # 从栈帧加载 b，1 cycle
BINARY_ADD        # 调用 PyNumber_Add，约 50-100 cycles
```

`PyNumber_Add` 内部：

1. 检查 `a`、`b` 的 `ob_type`。
2. 查找 `nb_add` 槽（slot）。
3. 若 `a` 与 `b` 类型不同，尝试 `__radd__`。
4. 最终调用具体类型（`int.__add__`、`float.__add__` 等）。

对比 C 的 `a + b`：单条 `ADD` 指令，1 cycle。Python 慢约 50-100x。

### 4.2 NumPy 向量化的性能模型

NumPy 的 `a + b`（其中 `a`、`b` 是 `ndarray`）：

1. 检查 `a.shape == b.shape`。
2. 调用 C 内核 `PyArray_Add`。
3. C 内核调用 BLAS 或 SIMD 指令。

性能对比（100 万元素相加）：

| 实现 | 时间 | 加速比 |
| ---- | ---- | ------ |
| Python 循环 | 120 ms | 1x |
| Python 列表推导 | 90 ms | 1.3x |
| NumPy | 1.2 ms | 100x |
| NumPy + SIMD（AVX2） | 0.3 ms | 400x |

NumPy 优势来自：

1. **单次调用开销**：1 次函数调用处理 100 万元素，而非 100 万次。
2. **连续内存**：cache 命中率高。
3. **SIMD 指令**：AVX2 可并行处理 8 个 float64。

### 4.3 `__slots__` 的内存节省

普通 Python 类实例通过 `__dict__` 存储属性，每个实例开销：

$$
M_{\text{dict}} = \text{PyObject\_HEAD}(16) + \text{dict\_ptr}(8) + \text{dict}(280) + \text{keys/values}(n \cdot 8)
$$

使用 `__slots__` 的实例：

$$
M_{\text{slots}} = \text{PyObject\_HEAD}(16) + f_1(8) + f_2(8) + \dots + f_n(8)
$$

对 10 字段的类，节省约 280 bytes/instance。百万实例节省 280 MB。

### 4.4 `functools.lru_cache` 的复杂度

`lru_cache` 基于 OrderedDict 实现，每次查询 $O(1)$，每次更新 $O(1)$（含 LRU 淘汰）。空间复杂度 $O(k)$，其中 $k$ 是 `maxsize`。

适用条件：

1. **纯函数**（pure function）：相同输入产生相同输出，无副作用。
2. **命中率 > 50%**：否则缓存开销大于收益。
3. **参数可哈希**：list/dict 不可作为参数。

### 4.5 GIL 对多线程性能的影响

GIL 使 CPython 多线程在 CPU 密集型任务下**负加速**：

$$
T_{\text{multi-thread}}(N) = T_{\text{single}} + N \cdot C_{\text{GIL\_switch}}
$$

其中 $C_{\text{GIL\_switch}}$ 是 GIL 切换开销（约 5-10μs）。

**实测**：4 线程计算 100 万次 `math.factorial(1000)`，比单线程慢 1.5x。

解决方案：

1. CPU 密集型 → `multiprocessing` 或 `concurrent.futures.ProcessPoolExecutor`。
2. IO 密集型 → `asyncio` 或 `threading`。
3. 调用 C 扩展（如 NumPy、Cython）→ C 扩展可显式释放 GIL（`Py_BEGIN_ALLOW_THREADS`）。

### 4.6 生成器的惰性求值

生成器（generator）通过**协程**实现惰性求值：

```python
def fib():
    a, b = 0, 1
    while True:
        yield a
        a, b = b, a + b
```

生成器的内存复杂度 $O(1)$，而 `list(fib())` 是 $O(\infty)$（不可行）。

**对比**：

| 操作 | 内存 | 时间 |
| ---- | ---- | ---- |
| `sum([x for x in range(10**8)])` | 800 MB | 5s |
| `sum(x for x in range(10**8))` | 0 MB | 4s |

生成器省内存但时间略慢（每次 `next` 调用有开销）。

### 4.7 asyncio 的并发模型

`asyncio` 基于单线程事件循环（epoll/kqueue/IOCP），通过**协程切换**实现 IO 并发：

$$
T_{\text{asyncio}}(N) = \max(T_{\text{io}_1}, T_{\text{io}_2}, \dots, T_{\text{io}_N})
$$

对比多线程：

$$
T_{\text{threading}}(N) \approx \sum T_{\text{io}_i} + N \cdot C_{\text{context\_switch}}
$$

对 1000 个 100ms 的 IO 操作：

- 多线程（4 线程）：约 25s
- asyncio：约 0.1s（IO 并行）

### 4.8 Cython 的性能来源

Cython 编译流程：

1. `.pyx` 源码 → C 源码（包含 `PyObject` 调用与静态类型展开）。
2. C 源码 → 共享库（.so/.pyd）。
3. Python 解释器导入共享库。

Cython 加速的关键：

```cython
# 纯 Python
def sum_python(int n):
    s = 0
    for i in range(n):
        s += i
    return s

# Cython
cdef long sum_cython(long n):
    cdef long s = 0
    cdef long i
    for i in range(n):
        s += i
    return s
```

Cython 版本编译为原生 C 循环，无 `PyObject` 装箱，性能与 C 相当（约 50x 加速）。

---

## 5. 代码示例（企业级 production-ready）

### 5.1 项目结构

```
perf_demo/
├── pyproject.toml
├── requirements.txt
├── README.md
└── src/
    └── perf_demo/
        ├── __init__.py
        ├── profiling.py        # 性能分析工具
        ├── cpu_bound.py        # CPU 密集型优化
        ├── io_bound.py         # IO 密集型优化
        ├── memory_opt.py       # 内存优化
        ├── numpy_demo.py       # NumPy 向量化
        ├── caching.py          # 缓存策略
        └── benchmarks.py       # 基准测试
```

### 5.2 pyproject.toml

```toml
[project]
name = "perf-demo"
version = "0.1.0"
description = "Python 性能优化企业级示例"
requires-python = ">=3.10"
authors = [{ name = "FANDEX Team" }]
dependencies = [
    "numpy>=1.26.0",
    "aiohttp>=3.9.0",
    "httpx>=0.27.0",
    "rich>=13.7.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0.0",
    "pytest-benchmark>=4.0.0",
    "ruff>=0.5.0",
    "mypy>=1.10.0",
    "cython>=3.0.0",
    "line_profiler>=4.1.0",
    "memory_profiler>=0.61.0",
    "py-spy>=0.3.14",
    "scalene>=1.5.0",
    "memray>=1.12.0",
]

[tool.ruff]
line-length = 100
target-version = "py310"

[tool.ruff.lint]
select = ["E", "F", "I", "N", "UP", "B", "C4", "SIM", "PERF"]

[tool.mypy]
python_version = "3.10"
strict = true
```

### 5.3 性能分析工具集（Python 3.10+）

```python
"""
profiling.py：性能分析工具集。
- cProfile：确定性 profiler，开销大但准确
- line_profiler：逐行 profiler
- py-spy：采样 profiler，开销小，适合生产
- memory_profiler：内存分析
- context manager：上下文管理器封装
Python: 3.10+
"""
from __future__ import annotations

import cProfile
import functools
import gc
import pstats
import time
from contextlib import contextmanager
from io import StringIO
from typing import Any, Callable, TypeVar

T = TypeVar("T")


@contextmanager
def timer(name: str = "block"):
    """简单计时器：上下文管理器形式。

    使用：
        with timer("expensive_op"):
            expensive_op()
    """
    gc.collect()  # 避免 GC 干扰
    start = time.perf_counter()
    try:
        yield
    finally:
        elapsed = time.perf_counter() - start
        print(f"[{name}] elapsed: {elapsed:.4f}s")


def profile_func(sort: str = "cumulative", top: int = 20):
    """cProfile 装饰器：输出函数级 profile。

    使用：
        @profile_func(sort="tottime", top=10)
        def slow_func():
            ...
    """
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @functools.wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> T:
            pr = cProfile.Profile()
            pr.enable()
            try:
                return func(*args, **kwargs)
            finally:
                pr.disable()
                s = StringIO()
                ps = pstats.Stats(pr, stream=s).sort_stats(sort)
                ps.print_stats(top)
                print(s.getvalue())
        return wrapper
    return decorator


def line_profile(func: Callable[..., T]) -> Callable[..., T]:
    """line_profiler 装饰器：逐行分析。

    需安装：pip install line_profiler
    使用：
        @line_profile
        def slow_func():
            ...
    """
    try:
        from line_profiler import LineProfiler
    except ImportError:
        return func

    lp = LineProfiler()
    lp.add_function(func)

    @functools.wraps(func)
    def wrapper(*args: Any, **kwargs: Any) -> T:
        lp.enable()
        try:
            return func(*args, **kwargs)
        finally:
            lp.disable()
            lp.print_stats()
    return wrapper


def memory_profile_func(func: Callable[..., T]) -> Callable[..., T]:
    """memory_profiler 装饰器：逐行内存分析。

    需安装：pip install memory_profiler
    """
    try:
        from memory_profiler import profile
        return profile(func)
    except ImportError:
        return func


# 使用示例
if __name__ == "__main__":
    @profile_func(sort="tottime", top=5)
    def demo() -> int:
        """演示函数：计算 1 到 1000 万的和。"""
        s = 0
        for i in range(10_000_000):
            s += i
        return s

    with timer("demo"):
        print(f"result: {demo()}")
```

### 5.4 CPU 密集型优化（Python 3.12+）

```python
"""
cpu_bound.py：CPU 密集型任务优化。
- 单线程基线
- 多进程加速
- NumPy 向量化
- Cython 加速
Python: 3.12+
"""
from __future__ import annotations

import math
import multiprocessing as mp
from concurrent.futures import ProcessPoolExecutor
from functools import partial
from typing import Callable

import numpy as np


# ============ 1. 蒙特卡洛 π 估算 ============

def monte_carlo_pi_python(n: int) -> float:
    """纯 Python 实现：蒙特卡洛 π 估算。

    时间复杂度: O(n)
    空间复杂度: O(1)
    """
    inside = 0
    for _ in range(n):
        x = np.random.random()
        y = np.random.random()
        if x * x + y * y <= 1.0:
            inside += 1
    return 4.0 * inside / n


def monte_carlo_pi_numpy(n: int) -> float:
    """NumPy 向量化实现。

    性能优势：
    1. 单次调用生成 n 个随机数
    2. 向量化比较与求和
    3. SIMD 加速
    """
    x = np.random.random(n)
    y = np.random.random(n)
    inside = np.sum(x * x + y * y <= 1.0)
    return 4.0 * inside / n


def monte_carlo_pi_chunk(args: tuple[int, int]) -> int:
    """单进程 chunk 计算。"""
    start, end = args
    inside = 0
    for _ in range(start, end):
        x = np.random.random()
        y = np.random.random()
        if x * x + y * y <= 1.0:
            inside += 1
    return inside


def monte_carlo_pi_multiprocessing(n: int, workers: int = 4) -> float:
    """多进程实现：绕过 GIL。

    workers 应等于 CPU 核心数。
    """
    chunk_size = n // workers
    chunks = [(i * chunk_size, (i + 1) * chunk_size) for i in range(workers)]
    # 修正最后一个 chunk
    chunks[-1] = (chunks[-1][0], n)

    with ProcessPoolExecutor(max_workers=workers) as executor:
        results = list(executor.map(monte_carlo_pi_chunk, chunks))

    return 4.0 * sum(results) / n


# ============ 2. 矩阵乘法 ============

def matrix_multiply_python(A: list[list[float]], B: list[list[float]]) -> list[list[float]]:
    """纯 Python 矩阵乘法：O(n^3)。"""
    n = len(A)
    m = len(B[0])
    k = len(B)
    C = [[0.0] * m for _ in range(n)]
    for i in range(n):
        for j in range(m):
            s = 0.0
            for l in range(k):
                s += A[i][l] * B[l][j]
            C[i][j] = s
    return C


def matrix_multiply_numpy(A: np.ndarray, B: np.ndarray) -> np.ndarray:
    """NumPy 矩阵乘法：调用 BLAS。

    性能来自：
    1. 连续内存布局（C order）
    2. BLAS（OpenBLAS/MKL）实现
    3. SIMD 指令
    4. 多线程（BLAS 内部）
    """
    return A @ B  # 等价于 np.matmul(A, B)


# ============ 3. 基准测试 ============

def benchmark(name: str, func: Callable, *args, **kwargs) -> None:
    """通用基准测试函数。"""
    import time
    start = time.perf_counter()
    result = func(*args, **kwargs)
    elapsed = time.perf_counter() - start
    print(f"[{name}] elapsed: {elapsed:.4f}s, result: {result}")


if __name__ == "__main__":
    n = 1_000_000

    # 蒙特卡洛 π 对比
    benchmark("Python", monte_carlo_pi_python, n)
    benchmark("NumPy", monte_carlo_pi_numpy, n)
    benchmark("Multiprocessing(4)", monte_carlo_pi_multiprocessing, n, workers=4)

    # 矩阵乘法对比（500x500）
    A = np.random.rand(500, 500)
    B = np.random.rand(500, 500)
    benchmark("NumPy matmul", matrix_multiply_numpy, A, B)

    # 纯 Python 矩阵乘法（仅 100x100，太慢）
    A_list = A[:100, :100].tolist()
    B_list = B[:100, :100].tolist()
    benchmark("Python matmul (100x100)", matrix_multiply_python, A_list, B_list)
```

### 5.5 IO 密集型优化（Python 3.10+）

```python
"""
io_bound.py：IO 密集型任务优化。
- 同步顺序
- 多线程
- asyncio
- aiohttp 并发
Python: 3.10+
"""
from __future__ import annotations

import asyncio
import time
from concurrent.futures import ThreadPoolExecutor
from typing import Any

import aiohttp
import httpx


# ============ 1. 同步 HTTP 抓取 ============

def fetch_sync(url: str) -> dict[str, Any]:
    """同步 HTTP GET。"""
    with httpx.Client(timeout=10) as client:
        r = client.get(url)
        return {"url": url, "status": r.status_code, "size": len(r.content)}


def fetch_all_sync(urls: list[str]) -> list[dict[str, Any]]:
    """顺序抓取：总时间 = sum(每个请求时间)。"""
    return [fetch_sync(url) for url in urls]


# ============ 2. 多线程 HTTP ============

def fetch_all_threading(urls: list[str], workers: int = 10) -> list[dict[str, Any]]:
    """多线程抓取：绕过 GIL（IO 操作释放 GIL）。"""
    with ThreadPoolExecutor(max_workers=workers) as executor:
        return list(executor.map(fetch_sync, urls))


# ============ 3. asyncio + aiohttp ============

async def fetch_async(session: aiohttp.ClientSession, url: str) -> dict[str, Any]:
    """异步 HTTP GET。"""
    async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as r:
        content = await r.read()
        return {"url": url, "status": r.status, "size": len(content)}


async def fetch_all_async(urls: list[str]) -> list[dict[str, Any]]:
    """并发抓取：总时间 ≈ max(每个请求时间)。"""
    async with aiohttp.ClientSession() as session:
        tasks = [fetch_async(session, url) for url in urls]
        return await asyncio.gather(*tasks)


# ============ 4. asyncio + 信号量限流 ============

async def fetch_with_semaphore(
    session: aiohttp.ClientSession,
    url: str,
    sem: asyncio.Semaphore,
) -> dict[str, Any]:
    """带限流的异步抓取：防止过载。"""
    async with sem:
        return await fetch_async(session, url)


async def fetch_all_rate_limited(
    urls: list[str],
    max_concurrent: int = 100,
) -> list[dict[str, Any]]:
    """限流并发抓取：保护目标服务器。"""
    sem = asyncio.Semaphore(max_concurrent)
    async with aiohttp.ClientSession() as session:
        tasks = [fetch_with_semaphore(session, url, sem) for url in urls]
        return await asyncio.gather(*tasks)


# ============ 5. 基准测试 ============

async def main() -> None:
    # 测试 URL 列表
    urls = [f"https://httpbin.org/delay/{i % 3}" for i in range(30)]

    # 同步顺序
    start = time.perf_counter()
    fetch_all_sync(urls[:10])  # 仅 10 个，否则太慢
    print(f"[Sync 10] {time.perf_counter() - start:.2f}s")

    # 多线程
    start = time.perf_counter()
    fetch_all_threading(urls, workers=10)
    print(f"[Threading 30/10w] {time.perf_counter() - start:.2f}s")

    # asyncio
    start = time.perf_counter()
    await fetch_all_async(urls)
    print(f"[asyncio 30] {time.perf_counter() - start:.2f}s")

    # asyncio + 限流
    start = time.perf_counter()
    await fetch_all_rate_limited(urls, max_concurrent=20)
    print(f"[asyncio 30/20c] {time.perf_counter() - start:.2f}s")


if __name__ == "__main__":
    asyncio.run(main())
```

### 5.6 内存优化（Python 3.10+）

```python
"""
memory_opt.py：内存优化技术。
- __slots__
- array.array
- 生成器
- 内存视图
- mmap
Python: 3.10+
"""
from __future__ import annotations

import array
import mmap
import os
import sys
from dataclasses import dataclass, field
from typing import Iterator


# ============ 1. __slots__ 内存对比 ============

class PointDict:
    """普通类：使用 __dict__。"""
    def __init__(self, x: float, y: float, z: float) -> None:
        self.x = x
        self.y = y
        self.z = z


@dataclass(slots=True)
class PointSlots:
    """slots 类：节省内存。"""
    x: float
    y: float
    z: float


def compare_point_memory() -> None:
    """对比 100 万实例内存。"""
    n = 1_000_000

    # 普通类
    points_dict = [PointDict(i, i, i) for i in range(n)]
    size_dict = sum(sys.getsizeof(p) + sys.getsizeof(p.__dict__) for p in points_dict[:100]) / 100 * n
    print(f"PointDict: {size_dict / 1024 / 1024:.1f} MB")
    del points_dict

    # slots 类
    points_slots = [PointSlots(i, i, i) for i in range(n)]
    size_slots = sum(sys.getsizeof(p) for p in points_slots[:100]) / 100 * n
    print(f"PointSlots: {size_slots / 1024 / 1024:.1f} MB")
    print(f"节省: {(size_dict - size_slots) / size_dict * 100:.1f}%")


# ============ 2. array.array vs list ============

def compare_array_list() -> None:
    """对比 array.array 与 list 的内存。"""
    n = 1_000_000

    # list[int]：每个元素是 PyObject*（8 bytes）+ int 对象（28 bytes）= 36 bytes
    lst = list(range(n))
    size_list = sys.getsizeof(lst) + sum(sys.getsizeof(i) for i in lst[:100]) / 100 * n
    print(f"list[int]: {size_list / 1024 / 1024:.1f} MB")

    # array.array('i', ...)：每个元素 4 bytes（C int）
    arr = array.array('i', range(n))
    size_arr = sys.getsizeof(arr)
    print(f"array[int]: {size_arr / 1024 / 1024:.1f} MB")
    print(f"节省: {(size_list - size_arr) / size_list * 100:.1f}%")


# ============ 3. 生成器 vs 列表 ============

def read_large_file_list(path: str) -> list[str]:
    """一次性读取：内存 O(n)。"""
    with open(path, encoding="utf-8") as f:
        return f.readlines()


def read_large_file_generator(path: str) -> Iterator[str]:
    """生成器逐行读取：内存 O(1)。"""
    with open(path, encoding="utf-8") as f:
        yield from f


def process_large_file(path: str) -> int:
    """流式处理：内存友好。"""
    total = 0
    for line in read_large_file_generator(path):
        total += len(line)
    return total


# ============ 4. 内存视图（零拷贝） ============

def zero_copy_slice(data: bytes, start: int, end: int) -> memoryview:
    """memoryview：切片不复制数据。

    普通 bytes 切片：data[start:end] 复制 (end-start) bytes
    memoryview 切片：mv[start:end] 创建视图，零拷贝
    """
    mv = memoryview(data)
    return mv[start:end]


# ============ 5. mmap 大文件 ============

def process_large_file_mmap(path: str) -> int:
    """mmap：将文件映射到内存，按需加载。"""
    size = os.path.getsize(path)
    with open(path, "rb") as f:
        with mmap.mmap(f.fileno(), size, access=mmap.ACCESS_READ) as mm:
            # 按 4KB 块处理
            block_size = 4096
            total = 0
            for offset in range(0, size, block_size):
                block = mm[offset:offset + block_size]
                total += block.count(b'\n')
            return total


if __name__ == "__main__":
    compare_point_memory()
    print()
    compare_array_list()
```

### 5.7 NumPy 向量化（Python 3.10+）

```python
"""
numpy_demo.py：NumPy 向量化优化。
- 标量循环 vs 向量化
- 广播（broadcasting）
- ufunc 自定义
- 内存布局优化
Python: 3.10+
"""
from __future__ import annotations

import time

import numpy as np


# ============ 1. 欧氏距离计算 ============

def euclidean_distance_python(a: list[float], b: list[float]) -> float:
    """纯 Python 欧氏距离。"""
    return sum((x - y) ** 2 for x, y in zip(a, b)) ** 0.5


def euclidean_distance_numpy(a: np.ndarray, b: np.ndarray) -> float:
    """NumPy 向量化欧氏距离。

    利用：
    1. 向量化减法
    2. 向量化平方
    3. 向量化求和
    4. SIMD 加速
    """
    diff = a - b
    return float(np.sqrt(np.sum(diff * diff)))


def euclidean_distance_numpy_norm(a: np.ndarray, b: np.ndarray) -> float:
    """使用 np.linalg.norm：最快实现。"""
    return float(np.linalg.norm(a - b))


# ============ 2. 矩阵运算：广播 ============

def normalize_rows_python(matrix: list[list[float]]) -> list[list[float]]:
    """行归一化（纯 Python）。"""
    result = []
    for row in matrix:
        norm = sum(x * x for x in row) ** 0.5
        result.append([x / norm for x in row])
    return result


def normalize_rows_numpy(matrix: np.ndarray) -> np.ndarray:
    """行归一化（NumPy 广播）。

    广播规则：
    matrix: (m, n)
    norms:  (m, 1) → 自动广播为 (m, n)
    """
    norms = np.sqrt(np.sum(matrix * matrix, axis=1, keepdims=True))
    return matrix / norms


# ============ 3. 滑动窗口 ============

def moving_average_python(data: list[float], window: int) -> list[float]:
    """滑动平均（纯 Python）。"""
    result = []
    for i in range(len(data) - window + 1):
        window_data = data[i:i + window]
        result.append(sum(window_data) / window)
    return result


def moving_average_numpy(data: np.ndarray, window: int) -> np.ndarray:
    """滑动平均（NumPy 卷积）。

    np.convolve 内部优化，性能远超 Python 循环。
    """
    weights = np.ones(window) / window
    return np.convolve(data, weights, mode='valid')


def moving_average_strides(data: np.ndarray, window: int) -> np.ndarray:
    """滑动平均（stride tricks + mean）。

    np.lib.stride_tricks.sliding_window_view 创建视图，零拷贝。
    """
    windows = np.lib.stride_tricks.sliding_window_view(data, window)
    return np.mean(windows, axis=1)


# ============ 4. 内存布局优化 ============

def compare_memory_layout() -> None:
    """对比 C order 与 F order 的性能。"""
    n = 1000

    # C order：行优先（默认）
    a_c = np.random.rand(n, n)  # C-contiguous

    # F order：列优先
    a_f = np.asfortranarray(a_c)  # F-contiguous

    # 按行求和（C order 更快）
    start = time.perf_counter()
    for _ in range(100):
        np.sum(a_c, axis=1)
    print(f"C order, axis=1: {time.perf_counter() - start:.3f}s")

    start = time.perf_counter()
    for _ in range(100):
        np.sum(a_f, axis=1)
    print(f"F order, axis=1: {time.perf_counter() - start:.3f}s")

    # 按列求和（F order 更快）
    start = time.perf_counter()
    for _ in range(100):
        np.sum(a_c, axis=0)
    print(f"C order, axis=0: {time.perf_counter() - start:.3f}s")

    start = time.perf_counter()
    for _ in range(100):
        np.sum(a_f, axis=0)
    print(f"F order, axis=0: {time.perf_counter() - start:.3f}s")


if __name__ == "__main__":
    # 欧氏距离基准
    a = list(range(10000))
    b = list(range(10000, 20000))
    a_np = np.array(a, dtype=np.float64)
    b_np = np.array(b, dtype=np.float64)

    start = time.perf_counter()
    for _ in range(100):
        euclidean_distance_python(a, b)
    print(f"Python euclidean: {time.perf_counter() - start:.3f}s")

    start = time.perf_counter()
    for _ in range(100):
        euclidean_distance_numpy(a_np, b_np)
    print(f"NumPy euclidean: {time.perf_counter() - start:.3f}s")

    compare_memory_layout()
```

### 5.8 缓存策略（Python 3.10+）

```python
"""
caching.py：缓存策略实现。
- functools.lru_cache
- 自定义 TTL 缓存
- 多级缓存
Python: 3.10+
"""
from __future__ import annotations

import functools
import time
from collections import OrderedDict
from typing import Any, Callable, TypeVar

T = TypeVar("T")


# ============ 1. lru_cache ============

@functools.lru_cache(maxsize=128)
def fibonacci(n: int) -> int:
    """带 LRU 缓存的斐波那契。

    无缓存: O(2^n)
    有缓存: O(n) 首次, O(1) 后续
    """
    if n < 2:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)


# ============ 2. 自定义 TTL 缓存 ============

class TTLCache:
    """TTL（Time-To-Live）缓存：到期自动失效。"""

    def __init__(self, maxsize: int = 128, ttl: float = 60.0) -> None:
        self.maxsize = maxsize
        self.ttl = ttl
        self._cache: OrderedDict[Any, tuple[Any, float]] = OrderedDict()

    def get(self, key: Any) -> Any | None:
        """获取缓存值。"""
        if key not in self._cache:
            return None
        value, expire_at = self._cache[key]
        if time.time() > expire_at:
            del self._cache[key]
            return None
        self._cache.move_to_end(key)
        return value

    def set(self, key: Any, value: Any) -> None:
        """设置缓存值。"""
        if key in self._cache:
            self._cache.move_to_end(key)
        self._cache[key] = (value, time.time() + self.ttl)
        if len(self._cache) > self.maxsize:
            self._cache.popitem(last=False)

    def clear(self) -> None:
        self._cache.clear()


def ttl_cached(maxsize: int = 128, ttl: float = 60.0) -> Callable:
    """TTL 缓存装饰器。"""
    cache = TTLCache(maxsize=maxsize, ttl=ttl)

    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @functools.wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> T:
            key = (args, tuple(sorted(kwargs.items())))
            result = cache.get(key)
            if result is not None:
                return result  # type: ignore[return-value]
            result = func(*args, **kwargs)
            cache.set(key, result)
            return result
        wrapper.cache_clear = cache.clear  # type: ignore[attr-defined]
        return wrapper
    return decorator


# ============ 3. 多级缓存 ============

class MultiLevelCache:
    """多级缓存：L1（本地内存） → L2（Redis） → L3（数据库）。"""

    def __init__(
        self,
        l1: TTLCache | None = None,
        l2_get: Callable[[str], Any] | None = None,
        l2_set: Callable[[str, Any, float], None] | None = None,
        l3_get: Callable[[str], Any] | None = None,
    ) -> None:
        self.l1 = l1 or TTLCache(maxsize=1000, ttl=60)
        self.l2_get = l2_get
        self.l2_set = l2_set
        self.l3_get = l3_get

    def get(self, key: str) -> Any | None:
        """三级查找：L1 → L2 → L3。"""
        # L1
        v = self.l1.get(key)
        if v is not None:
            return v
        # L2
        if self.l2_get:
            v = self.l2_get(key)
            if v is not None:
                self.l1.set(key, v)
                return v
        # L3
        if self.l3_get:
            v = self.l3_get(key)
            if v is not None:
                self.l1.set(key, v)
                if self.l2_set:
                    self.l2_set(key, v, 300)
                return v
        return None


if __name__ == "__main__":
    # fibonacci 性能对比
    start = time.perf_counter()
    print(f"fib(100) = {fibonacci(100)}")
    print(f"首次: {time.perf_counter() - start:.4f}s")

    start = time.perf_counter()
    print(f"fib(100) = {fibonacci(100)}")
    print(f"缓存命中: {time.perf_counter() - start:.6f}s")

    # TTL 缓存示例
    @ttl_cached(ttl=2)
    def slow_computation(x: int) -> int:
        time.sleep(0.5)
        return x * 2

    start = time.perf_counter()
    print(slow_computation(10))  # 0.5s
    print(f"首次: {time.perf_counter() - start:.2f}s")

    start = time.perf_counter()
    print(slow_computation(10))  # < 1ms
    print(f"缓存: {time.perf_counter() - start:.4f}s")
```

### 5.9 基准测试（pytest-benchmark）

```python
"""
benchmarks.py：使用 pytest-benchmark 进行回归基准测试。
运行：pytest benchmarks.py --benchmark-compare
Python: 3.10+
"""
from __future__ import annotations

import numpy as np
import pytest


def test_monte_carlo_python(benchmark) -> None:
    """蒙特卡洛 π - Python 实现。"""
    from cpu_bound import monte_carlo_pi_python
    result = benchmark(monte_carlo_pi_python, 100_000)
    assert 3.0 < result < 3.5


def test_monte_carlo_numpy(benchmark) -> None:
    """蒙特卡洛 π - NumPy 实现。"""
    from cpu_bound import monte_carlo_pi_numpy
    result = benchmark(monte_carlo_pi_numpy, 100_000)
    assert 3.0 < result < 3.5


def test_monte_carlo_multiprocessing(benchmark) -> None:
    """蒙特卡洛 π - 多进程实现。"""
    from cpu_bound import monte_carlo_pi_multiprocessing
    result = benchmark(monte_carlo_pi_multiprocessing, 100_000, workers=4)
    assert 3.0 < result < 3.5


def test_matrix_multiply_numpy(benchmark) -> None:
    """矩阵乘法 - NumPy 实现。"""
    from cpu_bound import matrix_multiply_numpy
    A = np.random.rand(200, 200)
    B = np.random.rand(200, 200)
    C = benchmark(matrix_multiply_numpy, A, B)
    assert C.shape == (200, 200)


def test_euclidean_python(benchmark) -> None:
    """欧氏距离 - Python 实现。"""
    from numpy_demo import euclidean_distance_python
    a = list(range(1000))
    b = list(range(1000, 2000))
    result = benchmark(euclidean_distance_python, a, b)
    assert result > 0


def test_euclidean_numpy(benchmark) -> None:
    """欧氏距离 - NumPy 实现。"""
    from numpy_demo import euclidean_distance_numpy
    a = np.arange(1000, dtype=np.float64)
    b = np.arange(1000, 2000, dtype=np.float64)
    result = benchmark(euclidean_distance_numpy, a, b)
    assert result > 0
```

---

## 6. 对比分析

### 6.1 Profiler 工具对比

| 工具 | 类型 | 开销 | 精度 | 适用场景 | 输出 |
| ---- | ---- | ---- | ---- | -------- | ---- |
| `cProfile` | 确定性 | 高（30-100%） | 函数级 | 开发环境 | pstats 文本 |
| `line_profiler` | 确定性 | 极高 | 行级 | 热点函数细查 | 文本 |
| `py-spy` | 采样 | 低（<1%） | 函数级 | 生产环境 | flamegraph |
| `scalene` | 采样 | 低（<5%） | 行级 + 内存 | 综合分析 | HTML |
| `memray` | 跟踪 | 中 | 内存分配 | 内存泄漏 | HTML/Flamegraph |
| `Austin` | 采样 | 极低 | 栈采样 | PyPy/生产 | flamegraph |

### 6.2 并发模型对比

| 模型 | 适用场景 | 优势 | 劣势 | 典型加速比 |
| ---- | -------- | ---- | ---- | ---------- |
| 单线程 | 简单任务 | 简单 | 无并行 | 1x |
| 多线程 | IO 密集 | 系统级调度 | GIL 限制 CPU | 5-50x（IO） |
| 多进程 | CPU 密集 | 绕过 GIL | 内存开销大 | N核倍数 |
| asyncio | 海量 IO | 单线程高并发 | 学习曲线 | 100-1000x（IO） |
| NumPy 向量化 | 数值计算 | SIMD + C | 仅同质数据 | 50-500x |
| Cython | 热点循环 | 接近 C | 编译复杂 | 50-200x |
| PyPy | 通用 | JIT 加速 | C 扩展兼容差 | 3-5x |

### 6.3 缓存策略对比

| 策略 | 命中率 | 内存 | 复杂度 | 适用场景 |
| ---- | ------ | ---- | ------ | -------- |
| LRU | 中 | 固定 | $O(1)$ | 通用 |
| LFU | 高 | 中 | $O(\log n)$ | 热点明显 |
| TTL | 中 | 可控 | $O(1)$ | 时效数据 |
| FIFO | 低 | 固定 | $O(1)$ | 队列场景 |
| 多级 | 高 | 大 | $O(1)$ | 高性能服务 |

### 6.4 跨语言性能对比

100 万元素相加基准（单位 ms）：

| 语言 | 时间 | 加速比 |
| ---- | ---- | ------ |
| Python 循环 | 120 | 1x |
| Python + NumPy | 1.2 | 100x |
| Go 循环 | 8 | 15x |
| Rust 循环 | 1.5 | 80x |
| C 循环 | 1.0 | 120x |
| C + AVX2 | 0.2 | 600x |

---

## 7. 常见陷阱与反模式

### 7.1 过早优化

**陷阱**：在未 profile 的情况下猜测瓶颈，优化非热点代码。

**反例**：

```python
# 优化错误：手动展开循环
def sum_list(lst):
    s = 0
    for i in range(0, len(lst), 4):  # 假设 4 路并行
        s += lst[i] + lst[i+1] + lst[i+2] + lst[i+3]
    return s
```

**正确做法**：先 profile，再优化。

```python
# 用 NumPy 一行解决
def sum_list(lst):
    import numpy as np
    return np.sum(lst)
```

### 7.2 字符串拼接

**陷阱**：循环中用 `+` 拼接字符串，$O(n^2)$ 复杂度。

```python
# 慢：O(n^2)
s = ""
for i in range(10000):
    s += str(i)

# 快：O(n)
s = "".join(str(i) for i in range(10000))

# 最快：O(n)
s = "".join(map(str, range(10000)))
```

### 7.3 列表 vs 生成器

**陷阱**：仅需遍历一次时仍使用列表。

```python
# 浪费内存
data = [x * 2 for x in range(10**8)]
total = sum(data)

# 节省内存
total = sum(x * 2 for x in range(10**8))
```

### 7.4 全局变量查找

**陷阱**：循环中频繁访问全局变量，触发 LOAD_GLOBAL。

```python
# 慢：每次循环查全局
import math
def compute(lst):
    return [math.sin(x) for x in lst]

# 快：局部化
def compute(lst, sin=math.sin):
    return [sin(x) for x in lst]
```

### 7.5 错误的多线程 CPU 优化

**陷阱**：用多线程加速 CPU 密集型任务，受 GIL 限制。

```python
# 错误：无加速
from threading import Thread
def cpu_work(n):
    s = 0
    for i in range(n):
        s += i

threads = [Thread(target=cpu_work, args=(10**7,)) for _ in range(4)]
for t in threads: t.start()
for t in threads: t.join()

# 正确：用多进程
from multiprocessing import Process
processes = [Process(target=cpu_work, args=(10**7,)) for _ in range(4)]
for p in processes: p.start()
for p in processes: p.join()
```

### 7.6 `lru_cache` 的参数陷阱

**陷阱**：使用不可哈希参数（list、dict）。

```python
from functools import lru_cache

@lru_cache
def bad_func(items: list[int]) -> int:  # TypeError!
    return sum(items)

# 正确：转换为 tuple
@lru_cache
def good_func(items: tuple[int, ...]) -> int:
    return sum(items)
```

### 7.7 NumPy 不当使用

**陷阱**：在循环中调用 NumPy。

```python
# 慢：循环 + NumPy
result = np.zeros(n)
for i in range(n):
    result[i] = np.sqrt(i)

# 快：向量化
result = np.sqrt(np.arange(n))
```

### 7.8 异步伪并发

**陷阱**：在 asyncio 中调用同步阻塞函数。

```python
# 错误：requests 阻塞事件循环
import requests
async def fetch(url):
    r = requests.get(url)  # 阻塞！
    return r.text

# 正确：用 aiohttp
import aiohttp
async def fetch(url):
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as r:
            return await r.text()
```

### 7.9 内存泄漏

**陷阱**：全局变量持续增长。

```python
# 泄漏：全局缓存只增不减
_cache: dict = {}
def process(key, value):
    _cache[key] = value  # 永不清理
    return _cache

# 修复：使用 LRU 缓存
from functools import lru_cache

@lru_cache(maxsize=1000)
def cached_process(key):
    return expensive_compute(key)
```

### 7.10 `time.time()` vs `time.perf_counter()`

**陷阱**：用 `time.time()` 计时，受 NTP 调整影响。

```python
import time

# 错误：可能倒退
start = time.time()
do_something()
elapsed = time.time() - start  # 可能为负

# 正确：单调递增
start = time.perf_counter()
do_something()
elapsed = time.perf_counter() - start
```

---

## 8. 工程实践

### 8.1 性能优化流程

```
1. 测量（Measure）
   ├── cProfile 定位热点函数
   ├── line_profiler 细化到行
   └── py-spy 生产环境采样

2. 分析（Analyze）
   ├── 算法复杂度分析
   ├── 内存访问模式
   └── IO 等待时间

3. 优化（Optimize）
   ├── 算法层：换更优算法（O(n^2) → O(n log n)）
   ├── 数据结构层：list → set/dict
   ├── 实现层：Python 循环 → NumPy/Cython
   └── 并发层：串行 → 多进程/asyncio

4. 验证（Verify）
   ├── 单元测试确保正确性
   ├── pytest-benchmark 确保性能提升
   └── 监控生产环境指标
```

### 8.2 性能基线（baseline）

在 CI 中维护性能基线：

```yaml
# .github/workflows/perf.yml
name: Performance Regression
on: [pull_request]
jobs:
  benchmark:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: pip install -e ".[dev]"
      - name: Run benchmarks
        run: |
          pytest benchmarks.py \
            --benchmark-compare=baseline \
            --benchmark-compare-fail=mean:10% \
            --benchmark-save=current
      - name: Store baseline
        if: github.ref == 'refs/heads/main'
        run: |
          pytest benchmarks.py --benchmark-save=baseline
          git add .benchmarks/
          git commit -m "chore: update performance baseline"
```

### 8.3 生产环境监控

```python
"""
prod_monitoring.py：生产环境性能监控。
- Prometheus 指标
- py-spy 采样
- 自定义指标
"""
from __future__ import annotations

import time
from contextlib import contextmanager
from typing import Iterator

try:
    from prometheus_client import Counter, Histogram, Summary
except ImportError:
    # Fallback stubs
    Counter = Histogram = Summary = lambda *a, **kw: type("Stub", (), {"labels": lambda s, **kw: s, "observe": lambda s, v: None, "inc": lambda s, **kw: None})()

# 指标定义
REQUEST_LATENCY = Histogram(
    "http_request_duration_seconds",
    "HTTP request latency",
    ["method", "endpoint"],
    buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10),
)

REQUEST_COUNT = Counter(
    "http_requests_total",
    "Total HTTP requests",
    ["method", "endpoint", "status"],
)

FUNCTION_LATENCY = Summary(
    "function_duration_seconds",
    "Function execution time",
    ["function"],
)


@contextmanager
def measure_latency(method: str, endpoint: str) -> Iterator[None]:
    """测量请求延迟。"""
    start = time.perf_counter()
    try:
        yield
    finally:
        REQUEST_LATENCY.labels(method=method, endpoint=endpoint).observe(
            time.perf_counter() - start
        )


def track_function(func):
    """函数级延迟追踪装饰器。"""
    import functools

    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        try:
            return func(*args, **kwargs)
        finally:
            FUNCTION_LATENCY.labels(function=func.__name__).observe(
                time.perf_counter() - start
            )
    return wrapper
```

### 8.4 性能预算

设定性能预算，超预算自动告警：

```python
"""
perf_budget.py：性能预算检查。
"""
from __future__ import annotations

import time
from dataclasses import dataclass


@dataclass
class PerfBudget:
    """性能预算。"""
    max_latency_ms: float = 100.0
    max_memory_mb: float = 500.0
    max_cpu_percent: float = 80.0

    def check(self, latency_ms: float, memory_mb: float, cpu: float) -> None:
        """检查是否超预算。"""
        if latency_ms > self.max_latency_ms:
            raise RuntimeError(
                f"延迟超预算: {latency_ms:.1f}ms > {self.max_latency_ms}ms"
            )
        if memory_mb > self.max_memory_mb:
            raise RuntimeError(
                f"内存超预算: {memory_mb:.1f}MB > {self.max_memory_mb}MB"
            )
        if cpu > self.max_cpu_percent:
            raise RuntimeError(
                f"CPU 超预算: {cpu:.1f}% > {self.max_cpu_percent}%"
            )


# 使用
budget = PerfBudget(max_latency_ms=50, max_memory_mb=200)

def api_handler():
    start = time.perf_counter()
    # ... 业务逻辑 ...
    latency_ms = (time.perf_counter() - start) * 1000
    budget.check(latency_ms, memory_mb=150, cpu=60)
```

### 8.5 持续优化策略

1. **80/20 原则**：80% 性能问题来自 20% 代码，优先优化热点。
2. **分层优化**：算法 > 数据结构 > 实现 > 并发 > 硬件。
3. **回归测试**：每次优化后运行基准，防止性能回退。
4. **监控告警**：生产环境实时监控，p99 延迟超阈值告警。
5. **文档化**：记录优化决策与权衡，便于团队学习。

---

## 9. 案例研究

### 9.1 Instagram：Cython 加速 Django

**背景**：Instagram 后端使用 Django，部分热点函数性能瓶颈明显。

**方案**：将 Django 的 `template/loader.py`、`db/models/sql/query.py` 等模块用 Cython 编译。

**效果**：
- 整体吞吐量提升 10-15%
- 部分函数加速 5-10x
- 节省服务器约 100 台

**经验**（Instagram Engineering 2017）：
- 仅编译不改写即可获得 2-3x 加速
- 加 `cdef` 类型声明后再获 2-3x
- 注意 `PyObject` 装箱边界

### 9.2 Dropbox：Python → Go 迁移

**背景**：Dropbox 早期用 Python 构建后端，性能成为瓶颈。

**方案**：将性能关键路径（同步引擎、块存储）迁移到 Go，保留 Python 用于业务逻辑。

**效果**：
- 同步引擎吞吐量提升 5x
- 内存占用降低 60%
- 长尾延迟 p99 从 500ms 降至 100ms

**经验**（Dropbox Tech Blog 2014）：
- 混合架构可行，但需清晰边界
- Go 的并发模型（goroutine）适合 IO 密集场景
- Python 在快速迭代、灵活部署上仍有优势

### 9.3 NumPy：科学计算的基石

**背景**：NumPy 通过向量化使 Python 在科学计算领域可用。

**核心技术**：
- 同质数组（homogeneous array）：连续内存，cache 友好
- ufunc（universal function）：元素级操作，SIMD 加速
- 广播（broadcasting）：自动维度扩展
- BLAS/LAPACK 集成：调用优化过的线性代数库

**性能数据**：
- 矩阵乘法（1000x1000）：NumPy 8ms，纯 Python 8000ms，加速 1000x
- 随机数生成（100 万）：NumPy 5ms，纯 Python 200ms，加速 40x

### 9.4 YouTube：Python 性能优化实践

**背景**：YouTube 早期用 Python 构建，2018 年性能优化回顾。

**措施**：
1. 热点函数 Cython 化
2. 数据库查询批量化
3. 模板渲染缓存
4. CDN 边缘缓存

**效果**：
- 页面加载时间从 800ms 降至 200ms
- 服务器数量减少 40%
- 用户跳出率降低 15%

### 9.5 PyPy：Mozilla Servo 的 Python 工具链

**背景**：Mozilla Servo 团队将构建工具链从 CPython 迁移到 PyPy。

**效果**：
- 构建时间从 45 分钟降至 12 分钟（3.75x 加速）
- 内存占用略增（PyPy JIT 预热）
- 无需修改 Python 代码

**限制**：
- C 扩展兼容性差（cpyext 性能损失）
- 启动慢（JIT 预热约 5s）

### 9.6 Polars：Rust 重写的 pandas

**背景**：pandas 单线程、内存不高效，Ritchie Vink 用 Rust 重写为 Polars。

**优势**：
- 多线程并行（无 GIL）
- Apache Arrow 内存格式（零拷贝）
- 惰性求值（query optimizer）

**性能**（groupby + 聚合，10M 行）：
- pandas: 2.5s
- Polars: 0.3s（8x 加速）

---

## 10. 练习与思考题

### 10.1 选择题

**Q1**：以下哪个 profiler 适合生产环境使用？

A. `cProfile`  
B. `line_profiler`  
C. `py-spy`  
D. `memory_profiler`

**答案**：C

**解析**：`py-spy` 是采样 profiler，开销 < 1%，适合生产。`cProfile` 开销 30-100%，`line_profiler` 开销极高，`memory_profiler` 也会显著减慢程序。

**Q2**：Amdahl 定律中，若 90% 代码可并行化，理论最大加速比是？

A. 5  
B. 10  
C. 100  
D. 无限

**答案**：B

**解析**：$S_{\infty} = \frac{1}{1-p} = \frac{1}{0.1} = 10$。

**Q3**：以下哪种情况 `lru_cache` 不会带来性能提升？

A. 纯函数 + 高命中率  
B. 有副作用的函数  
C. 参数可哈希  
D. 计算昂贵

**答案**：B

**解析**：`lru_cache` 假设纯函数，有副作用的函数缓存会导致行为不一致。

**Q4**：NumPy 比 Python 循环快的根本原因是？

A. NumPy 用 C 编写  
B. NumPy 使用 SIMD 指令  
C. NumPy 单次调用处理整个数组  
D. 以上全部

**答案**：D

**解析**：C 实现 + SIMD + 向量化三者共同作用。

### 10.2 填空题

**Q1**：Python 性能优化的第一步是 ____。

**答案**：profile（性能分析）

**Q2**：`functools.lru_cache` 的空间复杂度是 $O(____)$。

**答案**：`maxsize`（或 k，缓存大小）

**Q3**：NumPy 的内存布局 ____（C order/F order）对行操作更快。

**答案**：C order（行优先）

**Q4**：asyncio 在 ____ 密集型任务上比多线程更优。

**答案**：IO

### 10.3 编程题

**Q1**：实现一个函数，计算 1 到 n 的平方和，提供三个版本：Python 循环、列表推导、NumPy，并比较性能。

**参考答案**：

```python
import numpy as np
import time

def sum_squares_loop(n: int) -> int:
    s = 0
    for i in range(1, n + 1):
        s += i * i
    return s

def sum_squares_comprehension(n: int) -> int:
    return sum(i * i for i in range(1, n + 1))

def sum_squares_numpy(n: int) -> int:
    arr = np.arange(1, n + 1)
    return int(np.sum(arr * arr))

# 基准测试
n = 10_000_000
for name, func in [("loop", sum_squares_loop),
                    ("comprehension", sum_squares_comprehension),
                    ("numpy", sum_squares_numpy)]:
    start = time.perf_counter()
    result = func(n)
    print(f"{name}: {time.perf_counter() - start:.3f}s, result={result}")
```

**Q2**：实现一个带 TTL 与 LRU 的缓存装饰器，支持并发安全。

**参考答案**：见 `caching.py` 中的 `TTLCache` 实现，加 `threading.Lock` 保证线程安全。

### 10.4 思考题

**Q1**：为什么 Python 的 `list` 比 `array.array` 慢但更灵活？请从类型系统角度分析。

**参考答案**：`list` 存储任意类型对象（`PyObject*`），支持异构元素，但每次操作需动态分派。`array.array` 存储同质 C 类型，操作直接但仅支持数值类型。这是动态类型灵活性与静态类型性能的经典权衡。

**Q2**：在什么情况下应选择 Cython 而非 NumPy？

**参考答案**：
- 数据是异构的（struct 而非数组）
- 算法是分支密集型（NumPy 优势在向量化）
- 需要直接调用 C 库
- 需要细粒度内存控制（指针操作）

**Q3**：讨论"过早优化是万恶之源"在 Python 项目中的适用性。

**参考答案**：
- 适用：在未 profile 前优化非热点、牺牲可读性换性能、引入复杂依赖（Cython）而收益微薄。
- 不适用：明显 $O(n^2)$ 算法、N+1 查询、循环中拼接字符串、未释放大对象。
- 平衡：先写正确代码，profile 后优化热点，保持可读性。

---

## 11. 工具选型决策树

```
性能瓶颈在哪？
├── CPU 密集型？
│   ├── 数值计算？
│   │   └── NumPy / SciPy
│   ├── 矩阵运算？
│   │   └── NumPy + BLAS
│   ├── 复杂数据结构？
│   │   └── Cython / Rust (PyO3)
│   └── 多核并行？
│       └── multiprocessing / joblib
├── IO 密集型？
│   ├── 网络请求？
│   │   └── asyncio + aiohttp/httpx
│   ├── 文件读写？
│   │   └── aiofiles / mmap
│   └── 数据库？
│       └── asyncpg / SQLAlchemy 2.0 async
├── 内存问题？
│   ├── 大数据集？
│   │   └── NumPy / Polars / Dask
│   ├── 大文件？
│   │   └── 流式读取 / mmap
│   └── 内存泄漏？
│       └── memray / objgraph
└── 启动慢？
    ├── 导入开销？
    │   └── lazy import / module preload
    └── JIT 预热？
        └── 考虑 PyPy / Numba
```

---

## 12. 参考资料

### 12.1 规范与 PEP

- van Rossum, G., & Peters, T. (2001). PEP 8: Style Guide for Python Code. Python Enhancement Proposals. https://peps.python.org/pep-0008/
- Brandl, G. (2010). PEP 3104: Access to Names in Outer Scopes. Python Enhancement Proposals. https://peps.python.org/pep-3104/
- Smith, E. V. (2017). PEP 557: Data Classes. Python Enhancement Proposals. https://peps.python.org/pep-0557/

### 12.2 官方文档

- Python Software Foundation. (2024). cProfile — Deterministic Profiling. Python 3.12 Documentation. https://docs.python.org/3/library/profile.html
- NumPy Team. (2024). NumPy Documentation. https://numpy.org/doc/stable/
- Cython Team. (2024). Cython Documentation. https://cython.readthedocs.io/
- PyPy Team. (2024). PyPy Documentation. https://docs.pypy.org/

### 12.3 学术论文

- Williams, S., Waterman, A., & Patterson, D. (2009). Roofline: An Insightful Visual Performance Model for Multicore Architectures. Communications of the ACM, 52(4), 65-76. https://doi.org/10.1145/1498765.1498785
- Amdahl, G. M. (1967). Validity of the Single Processor Approach to Achieving Large Scale Computing Capabilities. AFIPS Conference Proceedings, 30, 483-485. https://doi.org/10.1145/1465482.1465560
- Little, J. D. C. (1961). A Proof for the Queuing Formula L = λW. Operations Research, 9(3), 383-387. https://doi.org/10.1287/opre.9.3.383

### 12.4 工程实践

- Frederickson, B. (2018). py-spy: Sampling profiler for Python. https://github.com/benfred/py-spy
- Burger, M. et al. (2020). Scalene: A high-performance, high-precision CPU+GPU profiler for Python. https://github.com/plasma-umass/scalene
- Bloomberg. (2022). memray: Memory profiler for Python. https://github.com/bloomberg/memray

### 12.5 性能基准

- Python Performance Benchmarks. https://pyperformance.readthedocs.io/
- NumPy Benchmarks. https://numpy.org/doc/stable/reference/generated/numpy.testing.Benchmark.html

---

## 13. 延伸阅读

### 13.1 书籍

- Leiserson, C. E., et al. (2023). Performance Engineering of Software Systems (MIT 6.172 Course Notes). MIT OpenCourseWare.（CSAPP 第 5 章"优化程序性能"）
- Ramalho, L. (2022). Fluent Python (2nd ed.). O'Reilly Media. ISBN: 978-1492056355.（第 11 章"Pythonic 对象"与第 17 章"迭代器与生成器"）
- McKinney, W. (2022). Python for Data Analysis (3rd ed.). O'Reilly Media. ISBN: 978-1098104030.（NumPy 章节）
- Behnel, S. et al. (2024). Cython Tutorial. https://cython.readthedocs.io/en/latest/src/tutorial/

### 13.2 论文与标准

- Knuth, D. E. (1974). Computer Programming as an Art. Communications of the ACM, 17(12), 667-673.（"过早优化"经典论述）
- Patterson, D. A., & Hennessy, J. L. (2020). Computer Organization and Design RISC-V Edition (2nd ed.). Morgan Kaufmann. ISBN: 978-0128203316.

### 13.3 在线资源

- Python Speed Center: https://speed.python.org/
- PyPy Speed Center: https://speed.pypy.org/
- NumPy Performance: https://numpy.org/doc/stable/user/performance.html
- py-spy Documentation: https://github.com/benfred/py-spy

### 13.4 学习路线

```
初级：cProfile + 基础优化（list/dict 选择、字符串拼接）
  ↓
中级：NumPy 向量化 + multiprocessing + asyncio
  ↓
进阶：Cython / Rust (PyO3) + py-spy 生产分析
  ↓
高级：自定义内存管理 + 性能预算 + 回归测试
  ↓
专家：参与 CPython/NumPy 优化、设计高性能 Python 框架
```

---

## 14. 附录

### 14.1 cProfile 输出解读

```
   ncalls  tottime  percall  cumtime  percall filename:lineno(function)
   1000000  1.234    0.000    1.234    0.000 foo.py:5(slow_func)
```

- `ncalls`：调用次数
- `tottime`：函数自身耗时（不含子调用）
- `percall`：`tottime` / `ncalls`
- `cumtime`：累计耗时（含子调用）
- `percall`：`cumtime` / `ncalls`

### 14.2 常见性能反模式速查

| 反模式 | 优化方案 | 加速比 |
| ------ | -------- | ------ |
| 字符串 `+` 拼接 | `"".join()` | 10-100x |
| `for x in lst: if cond: ...` | `[x for x in lst if cond]` | 1.5-2x |
| 全局变量循环访问 | 局部化 | 1.2-1.5x |
| `dict.keys()` 查找 | `dict` 直接查找 | 1.5x |
| 重复 `getattr` | 缓存到局部变量 | 2-3x |
| 同步 IO | asyncio | 10-100x（IO） |
| Python 循环数值计算 | NumPy 向量化 | 50-500x |
| `time.time()` 计时 | `time.perf_counter()` | 准确性 |

### 14.3 NumPy 性能优化清单

- [ ] 数组 dtype 选择最小够用（`float32` 替代 `float64`）
- [ ] 内存布局匹配操作（行操作用 C order，列操作用 F order）
- [ ] 避免循环，全用向量化
- [ ] 使用 `np.einsum` 替代多次 `np.tensordot`
- [ ] 启用 BLAS 多线程（`OMP_NUM_THREADS`、`MKL_NUM_THREADS`）
- [ ] 使用 `sliding_window_view` 替代手动滑动窗口
- [ ] 大数组用 `np.memmap` 处理

### 14.4 asyncio 性能优化清单

- [ ] 所有 IO 操作用 async 库（aiohttp、asyncpg、aiomysql）
- [ ] 用 `asyncio.Semaphore` 限流
- [ ] 用 `asyncio.gather` 并发多个独立任务
- [ ] 避免在事件循环中调用同步阻塞函数
- [ ] 用 `loop.run_in_executor` 包装不可避免的同步调用
- [ ] 用 `uvloop` 替代默认事件循环（Linux，2-4x 加速）
- [ ] 连接池复用（aiohttp.ClientSession、asyncpg.Pool）

### 14.5 性能分析检查清单

- [ ] 测量基线（baseline）
- [ ] 定位热点函数（cProfile）
- [ ] 细化到行（line_profiler）
- [ ] 分析算法复杂度
- [ ] 检查内存使用（memory_profiler / memray）
- [ ] 优化后重新测量
- [ ] 添加基准测试（pytest-benchmark）
- [ ] CI 集成性能回归检查
- [ ] 生产环境监控（py-spy / Prometheus）

### 14.6 工具命令速查

```bash
# cProfile
python -m cProfile -s cumulative my_script.py
python -m cProfile -o profile.out my_script.py
python -c "import pstats; p=pstats.Stats('profile.out'); p.sort_stats('cumulative').print_stats(20)"

# py-spy
py-spy top --pid <PID>           # 实时查看
py-spy record -o profile.svg --pid <PID>  # 生成火焰图
py-spy dump --pid <PID>          # 单次栈快照

# scalene
scalene my_script.py
scalene --cpu --gpu my_script.py

# memray
python -m memray run my_script.py
python -m memray flamegraph memray-my_script.bin

# line_profiler
kernprof -l my_script.py
python -m line_profiler my_script.py.lprof

# memory_profiler
python -m memory_profiler my_script.py
mprof run my_script.py
mprof plot
```

