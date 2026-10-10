---
order: 570
title: "并发工具与 asyncio 工程化：把并发用对"
module: 'python'
category: 后端技术
difficulty: advanced
description: "在会启动线程与进程之后学习真正的工程化并发：线程池与进程池、竞态条件与锁的实测对照、队列解耦生产者与消费者，以及用 Semaphore 控制 asyncio 的并发上限。"
author: fanquanpp
updated: '2026-10-11'
related:
  - 'python/630-MultiprocessingMultithreading'
  - 'python/650-GILAndFreeThreading'
  - 'python/660-CoroutineAsyncio'
  - 'python/670-AsyncProgrammingDetailed'
prerequisites:
  - 'python/630-MultiprocessingMultithreading'
---

## 前置知识

- 已完成 [线程与进程入门](/python/630-MultiprocessingMultithreading)：写过 `Thread` 与 `Process` 的最小示例。

分工声明：630 讲了线程和进程**各自的启动方式**，本篇讲怎么把并发**用对**——池化、锁保护共享状态、队列解耦、异步并发上限。协程语法本体与 asyncio 的工程坑在 [协程与 asyncio](/python/660-CoroutineAsyncio) 与 [异步编程详解](/python/670-AsyncProgrammingDetailed) 展开，本篇只借 asyncio 讲一件所有并发模型通用的功：给并发装上限。

## 学习目标

读完本文你将能够：

1. 用线程池与进程池改写手动的 start/join 代码，说出两者各自适用的任务；
2. 复现一次丢失更新，解释它为什么间歇出现，并用 `threading.Lock` 修复；
3. 用 `queue.Queue` 解耦生产者与消费者，说清队列的缓冲区角色；
4. 用 `asyncio.Semaphore` 给并发装上限，说出「上限」保护的是什么；
5. 排查「进程池任务抛了异常却没人知道」这类静默失败。

预计 60 到 75 分钟，含 5 个实验与 5 道练习。

## 1. 你现在要解决什么问题

上一篇文章结束时你手里有两个工具：`Thread` 和 `Process`。现在监控系统的需求来了：每分钟检查 800 个接口。手写 800 个 `Thread` 对象，内存和调度都会抗议；开 800 个进程，机器会先死给你看。

第二个问题更阴险：多个线程同时写一个共享计数器，结果**有时对有时错**，测试一百次都对，上线高峰悄悄丢数据。

这两个问题分别是「池化」和「保护共享状态」，是并发代码从「能跑」到「敢上线」的分水岭。

## 2. 线程池：把任务交给队列，而不是手开线程

```python
import time
from concurrent.futures import ThreadPoolExecutor

def check_api(endpoint: str) -> str:
    time.sleep(0.5)                    # 模拟一次网络往返
    return f"{endpoint} OK"

if __name__ == "__main__":
    endpoints = [f"api-{i}.example.com" for i in range(6)]

    start = time.perf_counter()
    with ThreadPoolExecutor(max_workers=3) as pool:
        for result in pool.map(check_api, endpoints):
            print(result)
    print(f"3 线程检查 6 个接口共耗时 {time.perf_counter() - start:.2f}s")
```

预期输出（实测，串行需要 3.00s）：

```text
api-0.example.com OK
api-1.example.com OK
api-2.example.com OK
api-3.example.com OK
api-4.example.com OK
api-5.example.com OK
3 线程检查 6 个接口共耗时 1.00s
```

池的含义就藏在输出里：6 个任务只有 3 个工人，谁空出来谁领下一个。`max_workers` 是你要调的唯一旋钮，IO 密集任务设几十到几百都正常。`pool.map` 保证结果**按提交顺序**返回；要「谁先完成先处理谁」改用 `concurrent.futures.as_completed`。`with` 退出时池自动等所有任务收工，等于全部 `join`。

## 3. 进程池：同一套 API，另一副引擎

```python
import random
import time
from concurrent.futures import ProcessPoolExecutor

def sample_points(n: int) -> int:
    inside = 0
    for _ in range(n):
        if random.random() ** 2 + random.random() ** 2 <= 1.0:
            inside += 1
    return inside

if __name__ == "__main__":
    total, workers = 8_000_000, 4
    chunk = total // workers
    start = time.perf_counter()
    with ProcessPoolExecutor(max_workers=workers) as pool:
        inside = sum(pool.map(sample_points, [chunk] * workers))
    print(f"pi ≈ {4.0 * inside / total:.4f}")
    print(f"4 进程共耗时 {time.perf_counter() - start:.2f}s")
```

预期输出（实测）：

```text
pi ≈ 3.1415
4 进程共耗时 0.45s
```

随机撒点估算圆周率是标准的 CPU 密集任务，进程池把它摊到 4 个核上。和 630 篇的手动版本对比：切片、join、传回结果全由池代办。迁移只需换一个类名，新代价是参数与返回值要过 pickle 序列化：进程池适合「**小参数、大计算**」，传 100MB 去算 10 毫秒的活，序列化就亏光收益。

## 4. 竞态条件实验：丢掉的更新去哪了

先看一段人畜无害的代码：

```python
import threading

counter = 0

def add_many():
    global counter
    for _ in range(100_000):
        counter += 1

threads = [threading.Thread(target=add_many) for _ in range(4)]
for t in threads: t.start()
for t in threads: t.join()
print(f"counter = {counter}（期望 400000）")
```

在我的 Python 3.14 上跑了三次，输出都是 `counter = 400000`。**别急着下「线程安全」的结论——竞态条件最阴险的地方就是间歇出现**。`counter += 1` 是「读、加、写回」三步，切换若落在读与写回之间，别人的更新就被覆盖；切换时机取决于机器与解释器版本，这段代码恰好难踩中，换台机器、加个函数调用它就开始丢。

要可靠地看到丢失，把「读」和「写回」之间手动制造一次切换机会（`time.sleep(0)` 会主动让出执行权，模拟切换恰好落在中间）：

```python
import threading
import time

counter = 0

def add_many():
    global counter
    for _ in range(50_000):
        temp = counter          # 读
        time.sleep(0)           # 制造一次切换窗口
        counter = temp + 1      # 写回

threads = [threading.Thread(target=add_many) for _ in range(4)]
for t in threads: t.start()
for t in threads: t.join()
print(f"counter = {counter}（期望 200000）")
```

实测输出：

```text
counter = 50141（期望 200000）
```

丢了四分之三：两个线程同时读到同一个旧值，各自加一、写回同一个数，两次自增只生效一次。修复办法是让「读加写回」不可分割，锁干的就是这件事：

```python
import threading
import time

counter = 0
lock = threading.Lock()

def add_many():
    global counter
    for _ in range(50_000):
        with lock:
            temp = counter
            time.sleep(0)
            counter = temp + 1

threads = [threading.Thread(target=add_many) for _ in range(4)]
for t in threads: t.start()
for t in threads: t.join()
print(f"counter = {counter}（期望 200000）")
```

实测输出：

```text
counter = 200000（期望 200000）
```

`with lock:` 保证同一时刻只有一个线程在块内，别人在门口排队。经验法则：**只要多个执行线会写同一个变量，就把所有读写它的地方锁起来，没有例外**。GIL 不替你做这件事的原因见下一篇；进程版内存本就不共享，要锁时用 `multiprocessing.Lock`。

## 5. 队列：让生产者和消费者各干各的

锁是「不许同时碰」，队列是「别碰，递给我」。生产者只管往队列里放任务，消费者只管取任务处理，两边速度不匹配时队列当缓冲区：

```python
import queue
import threading
import time

q = queue.Queue()

def producer() -> None:
    for i in range(1, 4):
        q.put(f"报表-{i}")
        print(f"已提交 报表-{i}")
        time.sleep(0.1)
    q.put(None)                     # 结束信号

def consumer() -> None:
    while True:
        item = q.get()
        if item is None:
            break
        time.sleep(0.3)             # 模拟耗时处理
        print(f"已处理 {item}")

t1 = threading.Thread(target=producer)
t2 = threading.Thread(target=consumer)
t1.start()
t2.start()
t1.join()
t2.join()
```

预期输出：

```text
已提交 报表-1
已提交 报表-2
已提交 报表-3
已处理 报表-1
已处理 报表-2
已处理 报表-3
```

生产者每 0.1 秒提交一个，消费者每 0.3 秒消化一个，队列吸收节奏差，谁也不等谁。`queue.Queue` 自带锁，放取都线程安全——「用队列传递，而不是共享变量」是并发降低复杂度的第一原则。进程与 asyncio 各有对应实现。

## 6. asyncio 的并发上限：Semaphore

IO 任务多到成百上千时，线程也嫌重，该上 asyncio 了。这里只讲一件事：**一次性提交 900 个下载，怎么保证同时只有 3 个在跑**（协程机制见 660/670 篇）：

```python
import asyncio
import time

sem = asyncio.Semaphore(3)          # 最多同时 3 个

async def download(name: str) -> None:
    async with sem:
        await asyncio.sleep(0.3)     # 模拟网络等待
        print(f"{name} 完成")

async def main() -> None:
    start = time.perf_counter()
    await asyncio.gather(*(download(f"图{i}") for i in range(9)))
    print(f"9 个任务共耗时 {time.perf_counter() - start:.2f}s")

asyncio.run(main())
```

预期输出（完成消息每 0.3 秒一批、每批 3 条，这就是峰值并发被限住的证据；实测）：

```text
图0 完成
图1 完成
图2 完成
图3 完成
图4 完成
图5 完成
图6 完成
图7 完成
图8 完成
9 个任务共耗时 0.92s
```

9 个任务一次性提交，`async with sem` 让多出来的任务在门口等，峰值被钉死在 3，总耗时约 3 批 × 0.3s。上限保护的是下游：同时开 900 个连接，服务器可能直接拉黑你。这与线程池的 `max_workers` 同源——**池化和限流是同一件事的两个名字**。

## 7. 修改实验

实验一：把第 2 节的 `max_workers` 从 3 改成 1，耗时变成多少？改成 6 呢？

实验二：把第 6 节的 `Semaphore(3)` 改成 `Semaphore(9)`，峰值并发和总耗时变成多少？

参考答案：实验一约 3.00s（一个工人干六份）与约 0.50s（每人一份全并行）；实验二峰值 9、约 0.30s。

## 8. 常见错误与调试实录

症状：进程池提交了一个会崩的任务，程序却风平浪静地跑完了。

```python
with ProcessPoolExecutor(max_workers=1) as pool:
    print(pool.submit(risky).result())    # 主动取结果
```

实测输出只有一行：

```text
已提交，程序看起来风平浪静
```

子进程里抛的 `ZeroDivisionError` 被装进了 future 对象，没人 `result()` 它就没人知道。读问题的三步：任务没完成又没有报错，先怀疑异常被吞；找到 future 主动调一次 `result()`，把提交行改成取结果行；异常原地炸出（真实 traceback 尾部）：

```text
  File "C:\Python\Lib\concurrent\futures\_base.py", line 396, in __get_result
    raise self._exception
ZeroDivisionError: division by zero
```

修法：批量任务统一在 `as_completed` 循环里调 `fut.result()` 让异常现身；对外服务再包 `try/except` 记日志。线程池行为相同。

## 9. 实际项目中的使用场景

- 批量调用外部 API：线程池 + `max_workers` 20 到 50，配超时与重试；
- 批量压缩、解析大文件：进程池，`max_workers` 从 CPU 核数起步；
- 日志收集、消息处理：生产者 + 消费者 + `queue.Queue`，天然削峰；
- 高并发爬虫：asyncio + Semaphore，上限按对方容忍度设。

## 10. 小练习

预测题（不运行，先写答案）：用 `submit` 提交一个任务，返回的 `future` 在任务结束前调用 `result()` 会发生什么？

修改题：去掉第 4 节锁版本的 `with lock:`，恢复丢更新；再试着只锁「写回」一行，观察还丢不丢——想想为什么必须锁整段。

修 Bug 题：下面的代码想并行处理 10 个任务，实际慢得像串行。找原因并修复：

```python
with ThreadPoolExecutor(max_workers=5) as pool:
    for endpoint in endpoints:
        result = pool.submit(check_api, endpoint).result()
        print(result)
```

挑战题（半小时）：写一个 `async def crawl(ids: list, limit: int)`，模拟对 20 个页面的抓取（`await asyncio.sleep(0.2)`），峰值并发不超过 `limit`，返回完成顺序的 id 列表。验收：`assert len(results) == 20`，且 `limit=5` 时总耗时约 0.8s。

自检问题（advanced 替代动手）：`max_workers` 和 `Semaphore` 分别在限制什么？丢失更新为什么测试环境测不出来？进程池的任务函数为什么不能是 lambda？

## 11. 与之前和之后的知识的关系

- 往前：池是 630 篇手动 start/join 的工程化替身；竞态实验里被咬的正是线程共享内存这个本质属性；
- 往后：[协程与 asyncio](/python/660-CoroutineAsyncio) 与 [异步编程详解](/python/670-AsyncProgrammingDetailed) 补上本篇刻意跳过的协程机制；[GIL 与自由线程](/python/650-GILAndFreeThreading) 解释「纯计算为什么必须用进程池」；性能定位见 [Python 性能优化](/python/690-PythonPerformance)。

## 12. 官方文档

- concurrent.futures（池与 future）：https://docs.python.org/zh-cn/3/library/concurrent.futures.html
- queue 模块：https://docs.python.org/zh-cn/3/library/queue.html
- asyncio.Semaphore：https://docs.python.org/zh-cn/3/library/asyncio-sync.html

## 13. 自我检查

- 能把手动 start/join 的代码改写成池版本，说出 `map` 与 `as_completed` 的差别；
- 能复现丢失更新，说清它为何间歇出现，并用锁修复；
- 知道 future 的异常不会自己冒出来，知道去哪找。

## 本章总结

池化解决「任务多到开不过来」：线程池管 IO，进程池管计算，API 相同、代价不同。锁解决「多个执行线写同一块内存」：竞态间歇出现，测试通过不等于安全。队列解决「模块互相等」，Semaphore 解决「并发失控」——与 `max_workers` 同源。下一篇回答贯穿三篇的问题：为什么纯计算非用进程池不可。

## 下一步

进入 [GIL 与自由线程](/python/650-GILAndFreeThreading)：挖「多线程跑纯计算没加速」的根。

---

预测题参考答案：`result()` 阻塞到任务完成才返回 `"api-x.example.com OK"`——不报错，只是白等。
