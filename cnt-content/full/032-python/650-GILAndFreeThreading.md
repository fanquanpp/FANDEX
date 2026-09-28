---
order: 440
title: "GIL 与自由线程：Python 并发的底层规则"
module: 'python'
category: 后端技术
difficulty: advanced
description: "解释为什么 8 个线程跑纯计算反而比单线程慢：GIL 锁什么、不管什么，IO 等待与 numpy 这类 C 扩展为何不受影响，PEP 703 自由线程从 3.13 实验构建到 3.14 正式支持的现状与迁移建议。"
author: fanquanpp
updated: '2026-09-28'
related:
  - 'python/630-MultiprocessingMultithreading'
  - 'python/640-ConcurrentProgramming'
  - 'python/690-PythonPerformance'
prerequisites:
  - 'python/630-MultiprocessingMultithreading'
  - 'python/640-ConcurrentProgramming'
---

## 前置知识

- 已完成 [线程与进程入门](/python/630-MultiprocessingMultithreading)：写过线程与进程的最小示例；
- 已完成 [并发工具与 asyncio 工程化](/python/640-ConcurrentProgramming)：用过线程池与进程池，见过丢失更新与锁。

分工声明：630 解决「怎么开」线程和进程，640 解决「怎么用对」（池化、锁、队列、上限），本篇回答最后一问——**为什么 Python 的多线程长这副样子**：GIL 的规则、它管不到的两个角落、以及自由线程构建正在带来的变化。

## 学习目标

读完本文你将能够：

1. 用一段实验证明「多线程跑纯 Python 计算没有加速」，并向别人解释 GIL 在其中的作用；
2. 预测一段多线程代码是 IO 密集还是 CPU 密集，判断线程池对它有没有用；
3. 说出 numpy、hashlib 这类 C 扩展为什么能绕开 GIL，以及这改变了什么选型；
4. 检查当前解释器是不是自由线程构建，说清 3.13 与 3.14 的状态差别；
5. 拿到一个慢程序，按「剖析、向量化、选池、再考虑自由线程」的顺序给出迁移方案。

预计 45 到 60 分钟，包含 3 个可运行实验与 5 道自检问题。

## 1. 你现在要解决什么问题

直觉说：8 个核，开 8 个线程，纯计算至少快 8 倍。亲手戳破它，存为 `slow_threads.py` 运行：

```python
import threading
import time

def crunch(n: int) -> int:
    total = 0
    for i in range(n):
        total += i * i
    return total

N = 5_000_000

start = time.perf_counter()
for _ in range(8):
    crunch(N)
print(f"单线程跑 8 次: {time.perf_counter() - start:.2f}s")

start = time.perf_counter()
threads = [threading.Thread(target=crunch, args=(N,)) for _ in range(8)]
for t in threads:
    t.start()
for t in threads:
    t.join()
print(f"8 个线程各跑 1 次: {time.perf_counter() - start:.2f}s")
```

我在 32 核的机器上实测：

```text
单线程跑 8 次: 1.51s
8 个线程各跑 1 次: 1.61s
```

8 个线程不但没有 8 倍，反而比单线程**慢**——多出来的时间付给了线程切换。这就是「Python 多线程没用」的来历——但它是半截话：同样的线程池抓网页却快 8 倍，马上验证。

## 2. GIL 是什么：一次只放一个线程进门

GIL（Global Interpreter Lock，全局解释器锁）是 CPython 解释器内部的一把互斥锁，规则只有一条：**同一时刻，最多一个线程在执行 Python 字节码**。8 个线程排着队轮流进场，每次进场干几毫秒。

它为什么存在？CPython 用引用计数管理内存：每个对象记着「有几个名字指着我」，计数归零就回收。两个线程同时改同一个计数，计数就可能错，对象要么泄漏要么被误删。给每个对象配一把锁太贵，于是 CPython 选了最简单粗暴的方案：一把大锁锁住整个解释器。代价就是你在第 1 节看到的——多线程在纯计算上永远加不了速。

三个必须钉牢的边界：

1. GIL 是 **CPython 的实现细节**，不是 Python 语言的规定；PyPy 等其他实现各有各的策略；
2. GIL 锁的是「字节码执行权」，**不是**你程序里的数据——640 篇的丢失更新发生在 GIL 眼皮底下，它不替你保护业务数据；
3. 你业务代码里的 `threading.Lock` 和 GIL 各管一层，互不替代。

## 3. GIL 管不到的地方一：等待 IO 时它自己放手

线程阻塞在网络上时并不执行字节码，抱着 GIL 纯属浪费——所以 CPython 的实现是：**线程进入阻塞前主动释放 GIL**，醒来再排队取回。于是 IO 密集任务的等待时间可以被大量重叠。实验：

```python
import time
from concurrent.futures import ThreadPoolExecutor

def fetch_page(page_id: int) -> int:
    time.sleep(0.5)                  # 模拟一次网络等待
    return page_id

pages = range(8)

start = time.perf_counter()
list(map(fetch_page, pages))
print(f"串行抓 8 页: {time.perf_counter() - start:.2f}s")

start = time.perf_counter()
with ThreadPoolExecutor(max_workers=8) as pool:
    list(pool.map(fetch_page, pages))
print(f"8 线程抓 8 页: {time.perf_counter() - start:.2f}s")
```

实测：

```text
串行抓 8 页: 4.00s
8 线程抓 8 页: 0.50s
```

标准的 8 倍。`time.sleep` 和真实 socket 等待在 GIL 面前行为一致：等待时线程不持有 GIL，8 个线程各睡各的，等待完全重叠。**「Python 多线程没用」的完整版是：对纯计算没用，对 IO 等待非常有用。**

## 4. GIL 管不到的地方二：C 扩展自己放手

第二条缝隙更宽：C 扩展可以在进入自己的计算前主动释放 GIL（`Py_BEGIN_ALLOW_THREADS` 宏），让别的线程跑 Python，自己在外面用满 CPU。numpy 的数组运算是现成的例子：

```python
import time
import numpy as np
from concurrent.futures import ThreadPoolExecutor

a = np.random.rand(24_000_000)       # 约 190MB 的浮点数组

def summarize() -> float:
    total = 0.0
    for _ in range(25):
        total += float(a.sum())      # numpy 的 C 循环，执行时释放 GIL
    return total

start = time.perf_counter()
summarize(); summarize(); summarize(); summarize()
print(f"串行 4 份求和: {time.perf_counter() - start:.2f}s")

start = time.perf_counter()
with ThreadPoolExecutor(max_workers=4) as pool:
    list(pool.map(lambda _: summarize(), range(4)))
print(f"4 线程 4 份求和: {time.perf_counter() - start:.2f}s")
```

实测：

```text
串行 4 份求和: 1.17s
4 线程 4 份求和: 0.27s
```

4 个线程、4 倍加速——同样的 `ThreadPoolExecutor`，第 1 节对纯 Python 循环毫无办法，对 numpy 大杀四方。区别只在时间花在哪段代码里：花在会释放 GIL 的 C 代码里，线程就能并行。常见会释放 GIL 的场景：numpy/pandas 大数组运算、`hashlib` 大文件摘要、`zlib` 压缩、一切阻塞在 socket 上的等待；纯字典、字符串、循环计算不在此列。

## 5. 自由线程：GIL 正在变成可选项

GIL 正在被卸下。PEP 703（Making the Global Interpreter Lock Optional）把引用计数改成线程安全方案，让解释器可以**没有 GIL** 地构建，这条路线叫自由线程（free-threading）。状态按版本分两段（依据 PEP 779 与官方 free-threading 指南）：

- **Python 3.13（2024 年 10 月）**：首次提供自由线程构建，但明确标注为**实验性**，需要单独安装；
- **Python 3.14（2025 年 10 月）**：按 PEP 779 转为**正式支持**（不再实验性），但仍不是默认构建——默认下载的 Python 依旧带 GIL；
- 让自由线程成为默认值留给未来的 PEP 决定。

先学会识别自己脚下是哪种构建：

```python
# gil_status.py —— 确认当前解释器的 GIL 状态
import sys

print(sys.version)
if hasattr(sys, "_is_gil_enabled"):
    print("GIL 是否启用:", sys._is_gil_enabled())
else:
    print("没有 _is_gil_enabled，属于传统 GIL 构建")
```

我在普通 3.14 构建上的实测输出：

```text
3.14.6 (tags/v3.14.6:c63aec6, Jun 10 2026, 10:26:10) [MSC v.1944 64 bit (AMD64)]
GIL 是否启用: True
```

`True` 就是传统 GIL 构建——多数人现在脚下的版本。自由线程构建的版本号带 `t` 后缀（如 `3.14.0t`），用 uv 一行就能装一个：

```text
uv python install 3.14t
python3.14t slow_threads.py     # 第 1 节的实验：8 线程真正并行，耗时明显低于串行
```

自由线程构建还有回退开关：`PYTHON_GIL=1` 或 `-X gil=1` 强制恢复 GIL 行为，为不兼容的 C 扩展兜底。两个清醒剂：其一，去掉 GIL 后对象操作多了同步开销，单线程性能低几个百分点，CPU 并行的收益要盖过损耗才划算；其二，C 扩展需各自声明线程安全，混用未适配扩展可能隐式回退（并行悄悄失效）甚至崩溃——上生产前核对依赖声明，并用 `sys._is_gil_enabled()` 确认 GIL 真的关了。

## 6. 修改实验

实验一：把第 1 节的线程数从 8 改成 2、4，再改成 32，画一条「线程数-耗时」曲线。曲线应该在 1 附近水平爬行后略微上扬——上扬的部分就是切换开销。

实验二：把第 4 节 `summarize` 里的 `a.sum()` 换成 `sum(a)`（Python 内置函数，不释放 GIL 的纯 Python 路径），再跑一遍。4 线程还能加速吗？

实验三：如果你装了 `3.14t`，把第 1 节的 `slow_threads.py` 在两种构建下各跑一次，用 `gil_status.py` 的输出对照，亲眼看到 GIL 从 True 变 False 后曲线的变化。

参考答案：实验二 4 线程不再加速（甚至略慢）——同一个 numpy 对象，走的代码路径不同，GIL 行为就不同；实验三在自由线程构建下 8 线程耗时显著低于串行，多核第一次为纯 Python 计算所用。

## 7. 常见错误与调试实录

错误一：「有 GIL 所以线程安全」。典型翻车：拿 640 篇的共享计数器写业务代码，理由是「反正有 GIL」。GIL 保证的是单条字节码的原子性，跨语句的读改写照样丢更新——640 篇实测丢到 50141/200000。修法回到 640：共享可变状态要么加锁，要么改用队列传递。

错误二：在别人的机器上复现不了自己的性能结论。你的「多线程没加速」结论在自由线程构建下不成立，反之亦然。性能问题的第一步永远是确认环境：跑一遍 `gil_status.py`，报出版本号和 GIL 状态，再谈数字。写成习惯：任何基准测试都带上这两行输出。

错误三：把 GIL 当性能差的万能背锅侠。剖析没做就「肯定是 GIL」——先跑 cProfile 看热点（见 [Python 性能优化](/python/690-PythonPerformance)）：热点在等待就与 GIL 无关，加线程即可；热点在自己的计算循环才轮到选型表。

## 8. 迁移建议与实际场景

拿到一个慢程序，按固定顺序走，每步都有数字支撑：

| 步骤 | 动作 | 判断依据 |
| --- | --- | --- |
| 1 | cProfile 剖析 | 热点在等待（IO 密集）还是计算（CPU 密集） |
| 2 | 能不能不并发 | numpy/pandas 向量化一行顶千行，且 C 代码自己释放 GIL |
| 3 | 选池 | IO 密集：线程池或 asyncio；CPU 密集：进程池；释放 GIL 的 C 扩展计算：线程池就够 |
| 4 | 才考虑自由线程 | 确认 C 扩展兼容声明、接受单线程损耗、基准证明收益 |

两个真实落点：图片服务「asyncio 收请求、压缩丢进程池」比「全换一种并发」更稳；业务必须共享内存的多线程并行（进程池序列化付不起）时，自由线程是唯一的路——先在测试环境验证依赖。

## 9. 自检问题（advanced 的练习替代）

1. 第 1 节的实验换成 `time.sleep` 版本，结果会怎样？用 GIL 的哪条规则解释？
2. GIL 保护引用计数，不保护你的业务数据——用 640 篇的丢失更新数据复述这句话。
3. `numpy.sum` 与 Python 内置 `sum` 处理同一个数组，多线程行为为什么不同？
4. 自由线程构建从哪个版本开始不再是实验性的？默认构建现在带不带 GIL？
5. 「多线程没变快」——列出排查这个问题会做的三件事。

## 10. 与之前和之后的知识的关系

- 往前：630 篇「CPU 密集用进程」的决策表、640 篇「进程池管计算」的分工，根因都在本文第 2 节；丢失更新实验证明了 GIL 与业务锁各管一层；
- 往后：[协程与 asyncio](/python/660-CoroutineAsyncio) 是 IO 密集任务的吞吐答案，它与 GIL 话题正交；给 C 扩展亲手实现释放 GIL 的写法在 [C 扩展与 FFI](/python/700-CExtensionsAndFfi)；把本文的选型流程放进真实剖析流程见 [Python 性能优化](/python/690-PythonPerformance)。

## 11. 官方文档

- threading（GIL 与多线程 API）：https://docs.python.org/zh-cn/3/library/threading.html
- PEP 703（自由线程提案）：https://peps.python.org/pep-0703/
- PEP 779（自由线程的正式支持标准）：https://peps.python.org/pep-0779/
- Python 自由线程指南（安装、兼容性、FAQ）：https://py-free-threading.github.io/
- `sys._is_gil_enabled`：https://docs.python.org/3/library/sys.html

## 12. 自我检查

- 能现场解释 GIL 锁什么、不管什么，并跑出第 1 节与第 3 节两组对照数字；
- 看到「多线程没加速」的代码，能列出三种可能（纯计算、版本差异、切换开销）并逐一排除；
- 能用 `sys._is_gil_enabled()` 判断构建类型，说清 3.13 与 3.14 的状态差别；
- 能按「剖析、向量化、选池、自由线程」的顺序给一个慢程序开出药方。

## 本章总结

GIL 是 CPython 为引用计数安全付出的一把全局锁：同一时刻一个线程执行字节码，纯计算无法靠多线程并行，甚至因切换变慢。但它会在两种情况放手：线程阻塞在 IO 上、C 扩展主动释放——前者让线程池成为 IO 密集任务的答案，后者让 numpy 这类库享受真并行。自由线程（PEP 703）正把 GIL 变成选项：3.13 实验构建，3.14 起正式支持但非默认，`sys._is_gil_enabled()` 与 `t` 后缀是识别标志。选型纪律不变：先剖析，能向量化就向量化，IO 给线程与 asyncio，计算给进程池，自由线程最后考虑。

## 下一步

进入 [协程与 asyncio](/python/660-CoroutineAsyncio)：IO 密集任务的并发上限不止线程池——单线程的事件循环用更低的成本托管成千上万个等待，你已经在 640 篇见过它的限流姿势，现在学它的本体。
