---
order: 590
title: "协程与 asyncio：三个网页从 3 秒到 1 秒"
module: 'python'
category: 后端技术
difficulty: intermediate
description: "以「同时下载三个网页」的真实瓶颈引入：串行 3 秒、异步 1 秒的对照实测。讲透协程是可暂停的函数、async/await 最小示例、asyncio.gather 并发、事件循环的现场感，以及 IO 密集选异步、CPU 密集选多进程的判断，附 never awaited 与嵌套 run 调试实录。"
author: fanquanpp
updated: '2026-10-05'
related:
  - 'python/100-FunctionDetailed'
  - 'python/630-MultiprocessingMultithreading'
  - 'python/670-AsyncProgrammingDetailed'
  - 'python/880-PythonFastAPI'
prerequisites:
  - 'python/100-FunctionDetailed'
---

## 前置知识

- 已完成 [函数详解](/python/100-FunctionDetailed)：会定义函数、传参数、收返回值。协程就是「能暂停的函数」，函数基础不牢先回炉；
- 不需要多线程、多进程的任何基础，本文一个线程都不开。

> 分工说明：660、670 两篇合讲异步编程。本篇是主教学，立模型：为什么同步会卡、协程是什么、async/await 怎么写、事件循环在转什么、什么时候该用异步；[异步深水区](/python/670-AsyncProgrammingDetailed) 拆工程细节：Task 与 gather 的异常传播、超时与取消、异步上下文管理器、阻塞函数陷阱的对照实验。两篇示例互不重复，本篇是后一篇的地基。

## 学习目标

读完本文你将能够：

1. 解释「同步串行 3 秒、异步并发 1 秒」的耗时差从哪来，并用 `time.perf_counter` 亲手测出；
2. 说清协程是「可以暂停的函数」：调用 `async def` 函数得到协程对象，`await` 才执行；
3. 用 `asyncio.run` 启动程序、用 `asyncio.gather` 并发多个协程，预测输出顺序与总耗时；
4. 描述事件循环在做什么：单线程、轮流执行、谁等 IO 谁让位；
5. 判断一个任务该用异步（IO 密集）还是多进程（CPU 密集），并识别「忘记 await」与「嵌套 run」两类真实报错。

预计 45 到 60 分钟，含 2 组动手实验与 4 道练习。

## 1. 你现在要解决什么问题

你在写一个数据采集脚本，要抓三个网页。每个请求的等待时间约 1 秒（网络来回 + 对方处理）。同步版本长这样——`time.sleep(1)` 模拟一次网络等待，它和真实请求一样，会让程序干等：

```python
import time

def fetch_page(name):
    print(f"{name}: 开始下载")
    time.sleep(1)                     # 模拟网络等待
    print(f"{name}: 下载完成")
    return f"{name} 的内容"

start = time.perf_counter()
results = [fetch_page("页面A"), fetch_page("页面B"), fetch_page("页面C")]
print(f"总耗时 {time.perf_counter() - start:.2f} 秒")
```

实测输出：

```text
页面A: 开始下载
页面A: 下载完成
页面B: 开始下载
页面B: 下载完成
页面C: 开始下载
页面C: 下载完成
总耗时 3.00 秒
```

3 秒，三个 1 秒之和。但你的程序在等什么？**CPU 没在算任何东西，纯粹在等网络。** 一个「正在等待」的任务占着执行权，其他两个任务只能排队。三个请求明明可以同时发出去——这就是本篇要解决的不公平。

## 2. 核心概念：协程是可以暂停的函数

普通函数从第一行跑到 `return`，中间不可能停下来。协程是一种特殊函数：**跑到「要等待」的地方可以暂停，把执行权让出去，等事情办完再从暂停点继续。**

暂停点就是 `await`。语法上有两条规矩：

- `async def` 定义协程函数；
- `await` 只能写在 `async def` 函数内部，后面接一个「可等待的东西」。

还有一个新手最容易踩的坑，先立此存照：**调用协程函数不会执行它**，只会返回一个协程对象——相当于拿到一份「任务说明书」，`await` 才是「照着做」。忘了这步，第 7 节的报错等着你。

## 3. 最小可运行示例：三个请求 1 秒完成

把第 1 节的采集脚本改成异步版：

```python
import asyncio
import time

async def fetch_page(name):
    print(f"{name}: 开始下载")
    await asyncio.sleep(1)            # 等待期间让出控制权，别的协程可以先跑
    print(f"{name}: 下载完成")
    return f"{name} 的内容"

async def main():
    start = time.perf_counter()
    results = await asyncio.gather(
        fetch_page("页面A"),
        fetch_page("页面B"),
        fetch_page("页面C"),
    )
    print(f"总耗时 {time.perf_counter() - start:.2f} 秒")
    print(results)

asyncio.run(main())
```

实测输出：

```text
页面A: 开始下载
页面B: 开始下载
页面C: 开始下载
页面A: 下载完成
页面B: 下载完成
页面C: 下载完成
总耗时 1.01 秒
['页面A 的内容', '页面B 的内容', '页面C 的内容']
```

三个「开始下载」挤在最前面——请求几乎同时发出；总耗时约 1 秒，等于最慢的那个，而不是总和。逐行拆解新面孔：

- `async def fetch_page(...)`：协程函数。`fetch_page("页面A")` 返回协程对象，不执行；
- `await asyncio.sleep(1)`：异步版休眠。暂停当前协程，1 秒后由调度方唤醒；
- `asyncio.gather(...)`：把多个协程对象并发跑起来，全部完成后按**传参顺序**返回结果列表；
- `asyncio.run(main())`：整个程序的异步入口，一个脚本只调一次。

注意 `results` 的顺序：A、B、C，和传参一致，与完成顺序无关（第 5 节会把 B 改成最慢，它在结果列表里仍然排第二位）。

## 4. 事件循环的现场感：asyncio.run 在转什么

`asyncio.run(main())` 做了三件事：新建一个**事件循环**（事件循环就是一个不知疲倦的调度员）；把 `main` 交给它执行到结束；最后清场关闭循环。

调度员的工作方式可以用一场单人扑克牌局想象——**从头到尾只有一个线程在执行**：

```text
main:      发出 A、B、C 三个任务 ──→ await gather，暂停
循环:      A 在跑 ──→ A 遇到 await sleep ──→ A 让位
循环:      B 在跑 ──→ B 遇到 await sleep ──→ B 让位
循环:      C 在跑 ──→ C 遇到 await sleep ──→ C 让位
循环:      （谁都不用跑，等着）1 秒后计时器到点
循环:      唤醒 A ──→ A 打印「下载完成」，结束
循环:      唤醒 B、C ──→ 各自收尾
gather:    三个都完成了 ──→ main 醒来，打印总耗时
```

两个直接推论：协程的切换发生在 `await` 处，是程序自己安排的（对比线程由操作系统强行切换）；单线程意味着同一时刻只有一个协程在真正执行代码——没有锁的烦恼，也没有多核加速，后者正是下一节的分界线。

这种「只在让位点切换」的方式叫**协作式调度**，与操作系统对线程的**抢占式调度**是一组对照概念，值得并排看清代价与纪律：

| 维度 | 协作式（协程） | 抢占式（OS 线程） |
| --- | --- | --- |
| 切换时机 | 仅在 await / yield 点 | 任意时刻，系统强行切入 |
| 单次切换开销 | 极小（用户态换帧） | 较大（陷入内核） |
| 单个任务的内存 | 很小（一个协程帧） | 大（内核栈 + 用户栈） |
| 共享状态保护 | 不需要锁（同一时刻只有一个在跑） | 必须锁或原子操作 |
| 公平性 | 依赖每个协程守纪律 | 由调度器保证 |

最后一行是协作式的命门，也是你写异步代码的核心纪律：**协程之间靠互相让位实现公平，只要有一个协程霸占着不放（比如调了一个不善于 await 的 CPU 重活或阻塞函数），整条单线程队列全部陪冻**。这就是为什么异步代码里绝不能混入 `time.sleep`、重计算循环这类「不让位」的操作——它们不是慢一点，是让整个事件循环停摆。这个坑的对照实验在 [异步深水区](/python/670-AsyncProgrammingDetailed)。

## 5. 修改实验：总耗时由最慢者决定

把第 3 节的 gather 改成「B 最慢」：

```python
    results = await asyncio.gather(
        fetch_page("页面A", 1),
        fetch_page("页面B", 3),
        fetch_page("页面C", 1),
    )
```

（`fetch_page` 需加参数 `seconds`，把 `await asyncio.sleep(1)` 改为 `await asyncio.sleep(seconds)`。）先预测总耗时和输出顺序，再运行。实测：

```text
页面A: 开始下载
页面B: 开始下载
页面C: 开始下载
页面A: 下载完成
页面C: 下载完成
页面B: 下载完成
总耗时 3.01 秒
```

总耗时 = 最慢任务的耗时，不是总和。完成顺序（A、C、B）与结果顺序（gather 按传参排列）是两回事——记住这一点，第 9 节的预测题才不会翻车。

## 6. 什么时候该用异步：IO 密集 vs CPU 密集

异步的加速原理是「等待时不占着位置」，所以它只对**等待多的任务**有效：

| 任务类型 | 例子 | 该用什么 |
| --- | --- | --- |
| IO 密集 | 网络请求、数据库查询、读写文件、爬虫 | asyncio：等待时让位，单线程扛大量并发 |
| CPU 密集 | 图像处理、加密解密、大规模数值计算 | 多进程：绕开单线程限制真正并行，见 [多线程与多进程](/python/630-MultiprocessingMultithreading) |

判断方法很朴素：问自己「任务的时间花在等别人，还是花在自己算」。在协程里塞一段纯计算（比如循环一亿次），事件循环同样会被卡住——因为那个协程不让位，这正好引出本篇最常见的两类报错。

## 7. 常见错误与调试实录

错误一：忘记 await。运行：

```python
import asyncio

async def fetch_page(name):
    await asyncio.sleep(0.1)
    return name

async def main():
    fetch_page("页面A")     # 忘了 await：只拿到说明书，没人执行

asyncio.run(main())
```

程序不崩，但请求根本没发出去，控制台出现警告（真实文本）：

```text
exp_await.py:8: RuntimeWarning: coroutine 'fetch_page' was never awaited
  fetch_page("页面A")     # 忘了 await：只拿到说明书，没人执行
RuntimeWarning: Enable tracemalloc to get the object allocation traceback
```

读警告三步：`coroutine 'fetch_page' was never awaited` 直译就是「协程从未被 await」；定位到那一行调用；补上 `await`。凡是「异步函数好像没执行」，第一反应查 `await`。

错误二：在异步函数里又调 `asyncio.run`：

```text
RuntimeError: asyncio.run() cannot be called from a running event loop
```

事件循环已经在跑了（`asyncio.run(main())` 启动的那个），循环内部再开一个是非法的。规矩：`asyncio.run` 只出现在程序入口、整个进程一次；循环内部想跑别的协程，用 `await` 或 `asyncio.create_task`（深水区展开）。

## 8. 实际场景：什么时候用，什么时候不用

应该用的场合：批量抓取页面或调用第三方 API（几十个请求并发，耗时从「总和」压到「最慢一个」）；一次请求要聚合多个下游服务的数据（网关、BFF 的标准写法）；Web 后端高并发 IO——[FastAPI](/python/880-PythonFastAPI) 的路由函数直接写成 `async def`，框架替你管事件循环；[爬虫与数据分析](/python/960-WebScrapingWithPython) 项目里并发抓取是标配。

不应该的场合：任务以计算为主（CPU 密集，异步帮不了，转多进程）；只能在同步代码里小改（把整个调用链改成 async 的成本可能比重写高）；团队没人维护异步代码——异步的调试与栈追踪更绕，没必要时不要上。

## 9. 小练习

预测题（预计 5 分钟；不运行，先写答案）：

```python
import asyncio

async def job(name, seconds):
    await asyncio.sleep(seconds)
    return name

async def main():
    results = await asyncio.gather(job("甲", 2), job("乙", 1), job("丙", 3))
    print(results)

asyncio.run(main())
```

预测两件事：打印出的列表内容与顺序；程序总耗时约多少秒。（答案：`['甲', '乙', '丙']`——gather 按传参顺序返回，与完成顺序无关；总耗时约 3 秒——最慢的「丙」决定。）

修改题（预计 10 分钟）：给第 3 节脚本加第四个请求 `fetch_page("页面D", 1)`，先预测总耗时（答案：仍约 1 秒，并发的魅力所在），再运行验证。然后把页面 D 的等待改成 5 秒再测一次。

修 Bug 题（预计 5 分钟）：第 7 节错误一的代码在你手里。运行它，把警告原文抄下来，再修复让请求真正发出（提示：函数里补一个词）。

挑战题（预计半小时；不给代码）：写协程 `countdown(seconds)`，每过 1 秒打印一次剩余秒数，归零时打印「发射」。用 `asyncio.gather` 并发跑 `countdown(3)` 与 `countdown(1)`，并用 `time.perf_counter` 断言总耗时在 2.9 到 3.5 秒之间：

```python
assert 2.9 < elapsed < 3.5, f"并发失效了？总耗时 {elapsed:.2f} 秒"
```

提示：循环里 `await asyncio.sleep(1)`；总耗时必然贴着最慢的 3 秒。

## 10. 与之前和之后的知识的关系

- 往前：协程的本质是「可暂停的函数」，参数、返回值、作用域全是 [函数详解](/python/100-FunctionDetailed) 的旧知识；`await` 的暂停-恢复机制与生成器的 `yield`（[生成器与协程](/python/180-GeneratorCoroutine)）血缘最近——async/await 正是那条路线的现代化身；
- 往后：[异步深水区](/python/670-AsyncProgrammingDetailed) 处理工程必答题：某个请求失败怎么办（异常传播）、等多久算超时（wait_for 与取消）、资源怎么收尾（异步上下文管理器）、阻塞函数怎么兜底（time.sleep 对照实验）；
- 平行：多线程与多进程是并发的另外两条路，选型对照见 [多线程与多进程](/python/630-MultiprocessingMultithreading)；异步 Web 开发的落点在 [FastAPI](/python/880-PythonFastAPI)。

## 11. 官方文档

- asyncio 入门（官方教程，结构与本文互补）：https://docs.python.org/zh-cn/3/library/asyncio.html#asyncio-hello-world
- 协程与任务（中文文档，Task/gather 权威定义）：https://docs.python.org/zh-cn/3/library/asyncio-task.html
- `asyncio.run`：https://docs.python.org/zh-cn/3/library/asyncio-runner.html

## 12. 自我检查

- 能现场解释「3 秒变 1 秒」的原因，并说出加速只对 IO 密集任务成立；
- 能背出「调用协程函数得到协程对象，await 才执行」，并用 `RuntimeWarning` 的原文指认反例；
- 能预测 gather 的结果顺序与总耗时，分清「完成顺序」与「结果顺序」；
- 能描述事件循环的单线程轮流模型，说出 `asyncio.run` 只能在入口调一次。

## 本章总结

同步代码里「正在等待」的任务占着执行权，串行耗时是等待之和；协程把函数做成可暂停的——`await` 处让位，事件循环这个单线程调度员趁机跑别的协程，于是并发耗时被压到「最慢的那一个」。工具三件套：`asyncio.run` 是入口（只用一次），`async def`/`await` 是语法，`asyncio.gather` 是并发。异步只治「等」的病，不治「算」的病——CPU 密集请去多进程。剩下的问题都是工程问题：失败了怎么办、等多久算超时、资源怎么收尾。

## 下一步

进入 [异步深水区](/python/670-AsyncProgrammingDetailed)：给并发加上异常处理、超时与取消，并亲手做「time.sleep 卡死事件循环」的对照实验。
