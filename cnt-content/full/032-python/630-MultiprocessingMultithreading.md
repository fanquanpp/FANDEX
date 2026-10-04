---
order: 480
title: "线程与进程入门：让程序同时做几件事"
module: 'python'
category: 后端技术
difficulty: intermediate
description: "从图片批量压缩从 100 秒提速到 30 秒的真实场景入门并发：threading 与 multiprocessing 的最小可用写法、进程不共享内存的现场演示，以及 IO 密集与 CPU 密集的选型决策表。"
author: fanquanpp
updated: '2026-09-29'
related:
  - 'python/640-ConcurrentProgramming'
  - 'python/650-GILAndFreeThreading'
  - 'python/660-CoroutineAsyncio'
prerequisites:
  - 'python/100-FunctionDetailed'
---

## 前置知识

- 已完成 [函数详解](/python/100-FunctionDetailed)：会定义函数、传参数、用 `return` 拿结果。本文的并发单位就是「让一个函数在别处运行」，不会用任何更深的语法。

三篇并发文章的分工先说清楚：**本篇只解决两个问题——怎么启动线程和进程、什么时候该用哪个**。并发用多了之后的坑（共享状态保护、池化管理、并发上限）在 [并发工具与 asyncio 工程化](/python/640-ConcurrentProgramming)；「为什么 Python 多线程有时没用」的底层原理在 [GIL 与自由线程](/python/650-GILAndFreeThreading)。

## 学习目标

读完本文你将能够：

1. 用 `threading.Thread` 和 `multiprocessing.Process` 各写出一个能跑的最小并发程序，并说出两者的本质差别；
2. 预测「子进程改全局变量」这类代码的输出，解释为什么进程之间不共享内存；
3. 面对一个任务，用决策表判断它该用线程、进程还是（暂时）不用并发；
4. 遇到 Windows 下多进程的 `RuntimeError`，30 秒内定位到缺了 `if __name__ == "__main__"`。

预计 45 到 60 分钟，包含 4 个可运行实验与 4 道练习。

## 1. 你现在要解决什么问题

朋友写了个脚本给相机拍的 200 张照片做压缩：读入、重采样、写出，纯计算，一张要半秒。脚本从头跑到尾要 100 秒，他盯着进度条问我「CPU 明明有 8 个核，为什么只有一个在干活？」

后来他把任务分给 4 个进程同时跑，100 秒变成了 30 秒左右——不是 25 秒，拆分和汇总本身有开销，但体感已经是四倍。

这就是并发要解决的问题：**程序里有些活儿是互相独立的，没必要排队**。Python 提供了两种「同时干活」的方式：

- **线程（threading）**：同一个进程里开出几条执行线，共享全部内存，轻量；
- **进程（multiprocessing）**：启动几个独立的 Python 解释器，各自有各自的内存，重但真正并行。

先别背区别，动手看。

## 2. 最小线程示例：两个下载同时进行

把下面内容存为 `two_downloads.py` 运行：

```python
import threading
import time

def download(name: str, seconds: float) -> None:
    print(f"{name} 开始下载")
    time.sleep(seconds)               # 模拟等待网络
    print(f"{name} 下载完成")

t1 = threading.Thread(target=download, args=("封面图", 2))
t2 = threading.Thread(target=download, args=("宣传视频", 2))

start = time.perf_counter()
t1.start()      # 开始执行，但主程序不等它
t2.start()
t1.join()       # 等两个线程都结束再往下走
t2.join()
print(f"两个下载总共耗时 {time.perf_counter() - start:.2f}s")
```

预期输出（两行「开始」的先后可能互换，并发输出的正常现象）：

```text
封面图 开始下载
宣传视频 开始下载
封面图 下载完成
宣传视频 下载完成
两个下载总共耗时 2.00s
```

串行要 4 秒的活 2 秒干完了。读法：`Thread(target=函数, args=参数元组)` 创建线程对象但未运行；`start()` 让它跑起来，主程序继续往下走；`join()` 堵住直到那条线程结束。**不调用 `join`，主程序可能在线程干完活之前就退出。**

顺带一句守护线程：`Thread(..., daemon=True)` 创建的是「陪跑」线程——主程序结束它就被直接带走。适合心跳、监听这类后台任务，不适合承载重要工作。

## 3. 最小进程示例：另开一个解释器

把 `square.py` 存为独立文件运行：

```python
import multiprocessing as mp

def square(n: int) -> None:
    print(f"{n} 的平方是 {n * n}")

if __name__ == "__main__":            # Windows/macOS 下必须有这层保护
    p = mp.Process(target=square, args=(9,))
    p.start()
    p.join()
    print(f"子进程状态码: {p.exitcode}")
```

预期输出：

```text
9 的平方是 81
子进程状态码: 0
```

写法几乎和线程一样，背后却完全不同：`mp.Process` 启动了一个**全新的 Python 解释器**，把 `square` 和参数 `9` 复制过去执行。`if __name__ == "__main__"` 这层保护是硬要求，原因见第 7 节的调试实录。

## 4. 现场演示：进程之间不共享内存

线程共享全部内存，进程各过各的。这句话用一段代码验证，存为 `no_share.py` 运行：

```python
import multiprocessing as mp

counter = 0                            # 全局变量

def increase():
    global counter
    for _ in range(5):
        counter += 1
    print(f"子进程里 counter = {counter}")

if __name__ == "__main__":
    p = mp.Process(target=increase)
    p.start()
    p.join()
    print(f"主进程里 counter = {counter}")
```

预期输出：

```text
子进程里 counter = 5
主进程里 counter = 0
```

子进程把自己那份 `counter` 加到了 5，主进程的 `counter` 还是 0。因为启动子进程时，全局变量被**复制**了一份过去，之后两边各改各的，谁也看不见谁。这不是 bug，是进程的定义。想让子进程的结果回到主进程，用 640 篇的池或 `multiprocessing.Queue`。

同样的代码换成 `threading.Thread`，主进程会打印 5——线程共享内存，这正是它快的原因，也是它危险的根源（640 篇用一整节实验讲这个危险）。

## 5. 回到图片压缩：4 个进程分头干活

现在解决第 1 节的问题。压缩是纯计算，用进程（为什么不用线程？这个疑问留给 [GIL 与自由线程](/python/650-GILAndFreeThreading)整篇回答）：

```python
import multiprocessing as mp
import time

def compress_batch(names: list) -> None:
    for name in names:
        total = 0
        for i in range(8_000_000):     # 用循环模拟压缩一张图的计算量
            total += i % 7

if __name__ == "__main__":
    images = [f"{c}.png" for c in "abcdefgh"]

    start = time.perf_counter()
    compress_batch(images)
    print(f"串行压缩 8 张耗时 {time.perf_counter() - start:.2f}s")

    start = time.perf_counter()
    workers = []
    for i in range(4):                 # 4 个进程，每人分 2 张
        p = mp.Process(target=compress_batch, args=(images[i::4],))
        p.start()
        workers.append(p)
    for p in workers:
        p.join()
    print(f"4 个进程压缩 8 张耗时 {time.perf_counter() - start:.2f}s")
```

我机器上的一次实测（你的数字会不同，看比例）：

```text
串行压缩 8 张耗时 1.85s
4 个进程压缩 8 张耗时 0.53s
```

接近 4 倍，朋友的故事在 8 张图上重演了。注意 `images[i::4]`：把 8 张图分给 4 个进程，每人 2 张。**并发编程的一半工作，是想清楚怎么把任务切匀**。

## 6. 核心概念与选型决策表

两条执行线的差别一句话说尽：**线程共享内存、启动便宜、受 GIL 限制同一时刻只有一条在执行 Python 字节码；进程内存隔离、启动贵、真正用上多个 CPU 核**。于是选型只看一个问题：你的任务时间花在哪里？

| 任务时间主要花在 | 例子 | 选择 | 原因 |
| --- | --- | --- | --- |
| 等待外部（网络/磁盘） | 下载 100 张图、查 50 个接口 | 线程，任务多时上异步 | 等待时线程闲置，多线程把等待时间重叠起来 |
| 自己的计算 | 压缩图片、解析大文件 | 进程 | 线程受 GIL 限制加不了速，进程各占一个核 |
| 不到 1 秒的小事 | 读一个配置文件 | 不并发 | 启动线程的开销可能比活儿本身还贵 |

「IO 密集」「CPU 密集」以后会天天见：前者时间主要花在等输入输出，后者主要花在算。给代码计时，等待占比高就是 IO 密集。

## 7. 常见错误与调试实录

Windows 与 macOS 下多进程报一长串错，最后一段是（真实报错原文）：

```text
RuntimeError:
        An attempt has been made to start a new process before the
        current process has finished its bootstrapping phase.
```

读报错三步：第一步看异常类型 `RuntimeError`，提示「新进程在旧进程完成引导前被启动」；第二步往上看 traceback，发现出错位置是 `spawn.py` 在**重新 import 你的主模块**；第三步对上号——Windows 启动子进程的方式是重新运行一遍你的脚本，脚本顶层如果有 `start()`，每个子进程又会创建子进程，无限递归。修法：把创建进程的代码放进 `if __name__ == "__main__":` 里——子进程重新 import 时 `__name__` 是 `"__mp_main__"`，保护块不执行，递归到此为止。

错误二：创建了线程却没 `join`，程序结束得比预期早，输出缺一截。症状是「打印了一半就退出」：主程序不等线程。反过来，到处 `join` 会把并发写成串行——`join` 该放在所有 `start()` 之后（修改实验二亲手验证）。

## 8. 修改实验

每个实验都先预测再运行。

实验一：把第 2 节的 `t2.join()` 删掉，总耗时变多少？输出少什么？

实验二：把第 2 节改成先 `t1.start()` 再 `t1.join()`，然后才 `t2.start()`，总耗时变多少？（这就是「到处 join 写成串行」。）

实验三：把第 5 节的进程数从 4 改成 8、再改成 16，耗时怎么变化？找到一个不再变快的拐点，想想它和 CPU 核数的关系。

参考答案：实验一约 2.00s 不变，但「宣传视频 下载完成」可能来不及打印程序就退出了；实验二变成约 4.00s，两个下载排队执行；实验三在 8 核以内递减，超过核数后不再变快，因为核就那么多。

## 9. 小练习

预测题（不运行，先写答案）：下面的代码输出什么？耗时约多少？

```python
import threading, time

def work(tag):
    print(f"{tag} 开工")
    time.sleep(1)
    print(f"{tag} 收工")

threads = [threading.Thread(target=work, args=(f"任务{i}",)) for i in range(3)]
for t in threads:
    t.start()
for t in threads:
    t.join()
```

（预期输出见文末。）

修改题：把第 3 节的进程示例改成一个进程算 9 的平方、一个进程算 12 的平方，两行输出都要出现。注意输出顺序不保证。

修 Bug 题：下面的代码在 Windows 上报第 7 节的 `RuntimeError`。先按读报错三步对号，再修复它：

```python
import multiprocessing as mp

def task():
    print("done")

p = mp.Process(target=task)
p.start()
p.join()
```

挑战题（15 分钟）：写一个函数 `parallel_sum(numbers, workers)`，把一个 200 万元素的列表分成 `workers` 份，用进程并行求和后合并结果。验收断言：

```python
data = list(range(2_000_000))
assert parallel_sum(data, 4) == sum(data)
assert parallel_sum(data, 1) == sum(data)
```

提示：子进程读不到主进程的列表（第 4 节），把切片当参数传过去；合并结果想想第 4 节的教训——全局变量传不回来。

## 10. 实际场景与使用边界

应该：任务能切干净、互不抢同一个变量时，用本篇的写法足够；任务数量大（几十上百个）时改用池（640 篇）；所有多进程代码从第一天起就写好入口保护。

不应该：为几毫秒的小事开线程；用 `global` 让多个线程改同一个变量（640 篇演示它会怎么咬人）；在多进程程序里指望子进程「顺手」改主进程的数据（第 4 节已证明行不通）。

## 11. 与之前和之后的知识的关系

- 往前：并发单位是「让一个函数在别处运行」，`target=` 接的正是 [函数详解](/python/100-FunctionDetailed) 里的函数对象，传参一一对应位置参数。
- 往后：[并发工具与 asyncio 工程化](/python/640-ConcurrentProgramming) 把「手动 start/join」升级成线程池与进程池，并处理本篇刻意回避的问题——多个执行线同时改一个变量怎么办；[协程与 asyncio](/python/660-CoroutineAsyncio) 提供海量 IO 并发的第三条路；[GIL 与自由线程](/python/650-GILAndFreeThreading) 回答本篇留下的那个疑问。

## 12. 官方文档

- threading 模块：https://docs.python.org/zh-cn/3/library/threading.html
- multiprocessing 模块（含「Safe importing of main module」一节）：https://docs.python.org/zh-cn/3/library/multiprocessing.html

## 13. 自我检查

- 能不看书写出线程与进程的最小示例，并说出两者的内存差别；
- 能解释第 4 节为什么输出 5 和 0，而不是 5 和 5；
- 拿到一个任务，能用「时间花在等还是算」判断该用哪种工具；
- 看到「bootstrapping phase」的 RuntimeError 知道去检查入口保护。

## 本章总结

`threading.Thread` 与 `multiprocessing.Process` 写法相同、机制不同：线程共享内存、适合把 IO 等待重叠起来；进程内存隔离、适合把计算摊到多个核上。子进程拿到的是全局变量的复制品，改了也传不回来。选型只看任务时间花在哪里：等外部用线程，纯计算用进程，小事别并发。

## 下一步

进入 [并发工具与 asyncio 工程化](/python/640-ConcurrentProgramming)：任务从 8 个涨到 800 个时，手动 start/join 就不够了，而且你已经站在竞态条件的门口。

---

预测题参考输出：三行「开工」（顺序不保证）、约 1 秒后三行「收工」，总耗时约 1.00s——三个线程的等待时间是重叠的。
