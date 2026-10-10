---
order: 600
title: "异步深水区：异常传播、超时取消与阻塞陷阱"
module: 'python'
category: 后端技术
difficulty: advanced
description: "拆开 660 建立的黑盒：gather 遇到异常时兄弟任务的生死、return_exceptions 的取舍、wait_for 超时如何变成内层 CancelledError、手动取消与清理纪律、异步上下文管理器收尾资源，附 time.sleep 卡死事件循环与 Task exception was never retrieved 的实测实录。"
author: fanquanpp
updated: '2026-10-11'
related:
  - 'python/660-CoroutineAsyncio'
  - 'python/520-ContextManager'
  - 'python/630-MultiprocessingMultithreading'
  - 'python/880-PythonFastAPI'
prerequisites:
  - 'python/660-CoroutineAsyncio'
---

## 前置知识

- 已完成 [协程与 asyncio](/python/660-CoroutineAsyncio)：会写 `async def`/`await`，用 `asyncio.gather` 并发过三个请求，知道事件循环是单线程调度员；
- 已完成 [上下文管理器](/python/520-ContextManager)：知道 `with` 语句与 `__enter__`/`__exit__` 的对应关系（本文的 `async with` 是它的异步版）。

> 分工说明：660 立模型，本篇拆工程细节——Task 与 gather 的异常传播、超时与取消、异步上下文管理器、阻塞函数陷阱的对照实验。`gather` 怎么写、协程对象是什么这些基础不再重复；读完本篇，你应当能回答生产异步代码的三个必答题：失败了怎么办、等多久算超时、资源怎么收尾。两篇示例互不重复。

## 学习目标

读完本文你将能够：

1. 预测 `asyncio.gather` 遇到异常时的行为：异常立即抛出，兄弟任务继续跑，`return_exceptions=True` 时异常进结果列表；
2. 解释 `wait_for` 超时的两层结构：外层拿到 `TimeoutError`，内层协程收到 `CancelledError`，并写对清理代码；
3. 用 `task.cancel()` 手动取消后台任务，并遵守「捕获 `CancelledError` 后必须重新抛出」的纪律；
4. 用 `@asynccontextmanager` 写异步上下文管理器，保证带 `await` 的资源清理一定执行；
5. 用对照实验识别「在协程里调阻塞函数等于没异步」，并用 `asyncio.to_thread` 救场。

预计 60 到 75 分钟，含 3 组实验与 2 道练习。

## 1. 问题引入：一个服务挂了，其他两个呢

660 篇的采集脚本并发抓三个页面，一切顺利。真实生产里更常见的剧情是：聚合三个下游服务，其中 B 中途抛了 `ConnectionError`。此刻你最需要知道的是——**gather 抛异常的瞬间，A 和 C 死了没有？** 答案影响一切：要不要重试、要不要清理、要不要继续等。猜，不如做实验。

## 2. 实验一：gather 的异常传播

让 B 在第 1 秒失败，A 在第 2 秒才完成：

```python
import asyncio

async def fetch(name, delay, fail=False):
    await asyncio.sleep(delay)
    if fail:
        raise ConnectionError(f"{name} 连接失败")
    print(f"{name} 完成")
    return name

async def main():
    try:
        await asyncio.gather(
            fetch("页面A", 2),
            fetch("页面B", 1, fail=True),
        )
    except ConnectionError as e:
        print(f"gather 在第 1 秒抛出: {e}")
    print("—— 此时页面A 还在跑，再等它 1.5 秒 ——")
    await asyncio.sleep(1.5)
    print("main 结束，页面A 早已完成（gather 没有取消兄弟任务）")

asyncio.run(main())
```

实测输出：

```text
gather 在第 1 秒抛出: 页面B 连接失败
—— 此时页面A 还在跑，再等它 1.5 秒 ——
页面A 完成
main 结束，页面A 早已完成（gather 没有取消兄弟任务）
```

结论一：`gather` 默认在**第一个异常出现时立刻抛出**，但**不会取消兄弟任务**——A 继续跑完了。如果你的 except 里直接 return，A 的结果就被扔掉了；如果 except 里啥都不做就放任 main 结束，`asyncio.run` 关闭循环时会取消残存任务。想要「不管成败都要全部结果」，换开关：

```python
    results = await asyncio.gather(
        fetch("页面A", 0.2),
        fetch("页面B", 0.1, fail=True),
        fetch("页面C", 0.3),
        return_exceptions=True,
    )
    for r in results:
        print(repr(r))
```

实测输出：

```text
'页面A'
ConnectionError('页面B 连接失败')
'页面C'
```

结论二：`return_exceptions=True` 时异常对象作为结果出现在原位置，一个失败不再影响别人。批量抓取「能拿多少拿多少」的场景用它；「一个失败整体就该失败」的场景（金融下单、事务链）用默认模式——失败得越早越好。Python 3.11+ 还有更严格的 `asyncio.TaskGroup`：任一任务异常会取消全部兄弟并打包成 `ExceptionGroup`，适合「要么全成、要么全撤」。TaskGroup 的完整形态：

```python
import asyncio

async def fetch(url: str) -> dict:
    await asyncio.sleep(1)               # 模拟网络请求
    return {"url": url, "status": 200}

async def fetch_all() -> None:
    async with asyncio.TaskGroup() as tg:
        t1 = tg.create_task(fetch("https://api.example.com/users"))
        t2 = tg.create_task(fetch("https://api.example.com/posts"))
        t3 = tg.create_task(fetch("https://api.example.com/comments"))
    # 走到这里说明三个任务全部成功——失败走不到这里
    results = [t.result() for t in (t1, t2, t3)]
    print(f"获取 {len(results)} 个资源")

asyncio.run(fetch_all())
```

与 gather 的结构差异：TaskGroup 用 `async with` 圈定「任务组」的生命周期——退出 `async with` 时所有任务必然完成（或组内已有人失败，异常以 `ExceptionGroup` 从 `async with` 抛出）。它没有 gather 那种「返回结果列表」的形态，结果逐个从 task 对象上 `.result()` 取；换来的是**结构化**保证：不会有任务逃出组的作用域，也就不会有 660 篇讲的「裸 create_task 留下无人认领的异常」。

## 3. 实验二：超时与取消实录

网络请求不能无限等。`asyncio.wait_for` 给协程设一个deadline，超时后会发生什么？注意输出里的**两层**：

```python
import asyncio

async def fetch_slow():
    try:
        print("开始下载（预计 10 秒）")
        await asyncio.sleep(10)
        return "内容"
    except asyncio.CancelledError:
        print("fetch_slow 收到取消：超时把我也带走了")
        raise                                  # 必须原样抛回

async def main():
    try:
        result = await asyncio.wait_for(fetch_slow(), timeout=2)
        print(result)
    except TimeoutError as e:
        print(f"main 捕获 TimeoutError: {e!r}")

asyncio.run(main())
```

实测输出：

```text
开始下载（预计 10 秒）
fetch_slow 收到取消：超时把我也带走了
main 捕获 TimeoutError: TimeoutError()
```

超时的实现机制就是取消：到点后 `wait_for` 向内层协程注入 `CancelledError`，内层有机会清理（关连接、写日志），然后外层把这次取消翻译成 `TimeoutError` 告知调用方。修改实验：把 `timeout` 改成 0.5，先预测「收到取消」的打印会不会更早出现、外层行为变不变，再运行验证（答案：取消来得更早，外层仍是同样的 `TimeoutError`，两层互不影响）。

3.11+ 还可以用上下文管理器版超时 `asyncio.timeout`，与 TaskGroup 组合成「限时全撤」：

```python
async def resilient_fetch() -> None:
    try:
        async with asyncio.timeout(3.0):
            async with asyncio.TaskGroup() as tg:
                tg.create_task(fetch("https://api1.example.com"))
                tg.create_task(fetch("https://api2.example.com"))
    except TimeoutError:
        print("限时已到，组内任务已被全部取消")
```

两个 `async with` 嵌套的读法：内层 TaskGroup 管任务生命周期，外层 timeout 管整组的 deadline——超时触发时 cancel 信号会穿透进组内每个任务，语义与 `wait_for` 单任务版完全同构，只是作用对象从「一个协程」变成「一组」。

手动取消用的是同一机制。复用上面的 `fetch_slow`，`task.cancel()` 之后 await 这个 task，会撞出 `CancelledError`：

```python
async def main():
    task = asyncio.create_task(fetch_slow())
    await asyncio.sleep(1)
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        print("main 确认：task 已被取消")

asyncio.run(main())
```

实测输出（「超时」字样来自复用的函数，手动取消走的同一条清理路径）：

```text
开始下载（预计 10 秒）
fetch_slow 收到取消：超时把我也带走了
main 确认：task 已被取消
```

纪律只有一条：`except asyncio.CancelledError` 里做完清理后**必须 `raise`**。吞掉它，取消就失效了——超时保护、服务关闭、退出清理全部失灵，这类「看起来能跑」的代码是异步事故的重灾区。

## 4. 异步上下文管理器：让清理自动发生

上面的清理靠人肉 try/except，容易漏。同步世界用 `with` 解决这类问题（[上下文管理器](/python/520-ContextManager)），异步世界有 `async with`——清理动作本身需要 `await` 时，它是唯一选择：

```python
import asyncio
from contextlib import asynccontextmanager

@asynccontextmanager
async def db_connection(name):
    print(f"[{name}] 连接数据库")
    await asyncio.sleep(0.1)              # 模拟异步建连
    try:
        yield "conn"                      # yield 前是进入，之后是退出
    finally:
        print(f"[{name}] 关闭连接")
        await asyncio.sleep(0.1)          # 关闭也是 IO，也需要 await

async def query(conn, sql):
    await asyncio.sleep(0.2)
    return f"{sql} 的结果"

async def main():
    async with db_connection("订单库") as conn:
        result = await query(conn, "SELECT count(*) FROM orders")
        print(result)

asyncio.run(main())
```

实测输出：

```text
[订单库] 连接数据库
SELECT count(*) FROM orders 的结果
[订单库] 关闭连接
```

即使 with 块里抛异常，`finally` 里的关闭照样执行。手写类版需要实现 `__aenter__`/`__aexit__` 两个异步方法，`@asynccontextmanager` 装饰器是它的快捷方式——与同步 `@contextmanager` 的关系，和 `async with` 与 `with` 的关系完全同构。数据库连接、HTTP 客户端、锁，凡是「用完要还、还要等一等」的资源，都套这个模板。

消费端「边等边收」的形态是**异步生成器**（`async def` 里带 `yield`），配 `async for` 使用：

```python
async def stream_events():
    """模拟事件流：每 0.5 秒吐一条"""
    for i in range(5):
        await asyncio.sleep(0.5)
        yield {"event_id": i, "data": f"事件 {i}"}

async def consume_events() -> None:
    async for event in stream_events():
        print(f"收到: {event['event_id']}")

asyncio.run(consume_events())
```

逐段解释：`async def` + `yield` 的组合产出异步生成器——`yield` 提供「可迭代」，`await` 提供「等 IO」；`async for` 每取一条都允许挂起，适合 WebSocket 消息流、分页 API 的逐页拉取、传感器数据流。同步世界的对应物（生成器与 for，见 [生成器深水区](/python/180-GeneratorCoroutine)）在这里逐概念对应：惰性一样、协议换成 `__aiter__`/`__anext__`。

## 5. 常见错误与调试实录

错误一：在协程里调阻塞函数，等于没异步。同样「并发」跑三个各睡 1 秒的任务：

```python
async def work_bad(name):
    print(f"{name} 开始")
    time.sleep(1)                 # 阻塞整个事件循环 1 秒
    print(f"{name} 结束")

async def main_bad():
    start = time.perf_counter()
    await asyncio.gather(work_bad("任务A"), work_bad("任务B"), work_bad("任务C"))
    print(f"time.sleep 版总耗时 {time.perf_counter() - start:.1f} 秒")

asyncio.run(main_bad())
```

实测输出：

```text
任务A 开始
任务A 结束
任务B 开始
任务B 结束
任务C 开始
任务C 结束
time.sleep 版总耗时 3.0 秒
```

`time.sleep` 不让位——事件循环这个单线程调度员被按住了，三个任务退化成纯串行，3 秒，与 660 篇的同步版一模一样。`time.sleep` 换成 `await asyncio.sleep(1)`（其他不变），输出变成：

```text
任务A 开始
任务B 开始
任务C 开始
任务A 结束
任务B 结束
任务C 结束
asyncio.sleep 版总耗时 1.0 秒
```

这才是并发。诊断口诀：**并发没生效，先找隐藏的阻塞调用**——`time.sleep`、`requests.get`、同步数据库驱动都是惯犯。确实只有同步库可用时，把阻塞调用扔进线程：

```python
result = await asyncio.to_thread(time.sleep, 1)   # 阻塞发生在线程里，循环照常转
```

### 错误一的延伸：文件 IO 的异步写法（aiofiles）

阻塞调用的名单里还有文件读写——`open(...).read()` 在大文件上是毫秒到秒级的阻塞。异步代码里处理文件有两条路，取舍不同：

```python
import asyncio
import aiofiles

# 路线一：aiofiles——语法与同步 open 几乎一致，await 替换阻塞点
async def read_config(path: str) -> str:
    async with aiofiles.open(path, "r", encoding="utf-8") as f:
        content = await f.read()
    return content

async def write_report(path: str, content: str) -> None:
    async with aiofiles.open(path, "w", encoding="utf-8") as f:
        await f.write(content)

# 路线二：to_thread 包同步读——不引第三方库，大块读写一次进线程
async def read_config_stdlib(path: str) -> str:
    return await asyncio.to_thread(lambda: open(path, "r", encoding="utf-8").read())
```

逐段解释两者的机制与取舍：aiofiles 本身**不做真异步 IO**——它把每个读写操作委托给线程池执行，`await f.read()` 挂起协程、等线程里的阻塞读完成，语法糖的成分大于性能魔法；`to_thread` 路线是同一机制的手工版。选型：异步代码里只有零星几次文件读写，`to_thread` 一行不引依赖；读写散布在各处、想要与同步代码同形的 API（尤其文件操作嵌在多层函数里），aiofiles 的 `async with` 形态更可读，且 `async with` 保证异常路径也关闭文件（上下文管理器协议见 [上下文管理器](/python/520-ContextManager) 与本篇第 4 节）。易错点：无论哪条路，**事件循环线程里都不该出现裸 `open().read()`**——小文件读一次看不出问题，日志文件滚到 GB 级时一次阻塞读能让全部并发连接冻结几百毫秒，这正是本错误要抓的「隐藏阻塞」在文件系统的形态。大批量文件的并行读写要控制并发度（`gather` + 信号量，见 660 篇），无节制地同时开几千个文件句柄会撞操作系统的打开文件数上限。

错误二：后台任务的异常没人接收。`create_task` 之后只顾睡觉，不 await 它：

```python
async def main():
    asyncio.create_task(failing_task())
    await asyncio.sleep(1)

asyncio.run(main())
```

程序正常结束，但控制台留下一条迟到的事故报告（真实文本，截取）：

```text
Task exception was never retrieved
future: <Task finished ... exception=ConnectionError('后台任务炸了')>
Traceback (most recent call last):
  File "exp_orphan.py", line 5, in failing_task
    raise ConnectionError("后台任务炸了")
ConnectionError: 后台任务炸了
```

`Task exception was never retrieved` 的意思是：任务炸了，直到被垃圾回收都没人来看过结果。读它三步：异常类型在 `exception=` 后面；traceback 指向任务内部；根因是创建后没保存引用也没 await。修法：要么 `await task`，要么把 task 存进容器统一管理——裸 `create_task` 不接返回值，在生产代码里应当被 review 拦下。

## 6. 实际场景：什么时候用，什么时候不用

应该用的场合：批量调用下游 API 且要「部分失败容忍」——gather 加 `return_exceptions=True` 一行搞定；任何外部调用设超时——`wait_for`/`asyncio.timeout`（3.11+ 的 `async with asyncio.timeout(2)` 写法更顺）是标配，没有超时的网络请求是线上事故预约单；长连接服务（WebSocket、机器人）的优雅关闭——收到退出信号后 `cancel` 全部后台任务再收尾；资源生命周期管理一律 `async with`。[FastAPI](/python/880-PythonFastAPI) 项目里，以上模式每天都会用到。

不应该的场合：把 `to_thread` 当万能药塞满代码——线程也有成本，阻塞调用多到一定程度该考虑同步架构或消息队列（[Celery 分布式任务队列](/python/860-PythonCeleryDistributedTaskQueue)）；对取消不敏感的关键路径硬加超时——支付、下单这类操作超时后的状态要幂等处理，不是掐掉就完；用 `return_exceptions=True` 掩盖本该让整个批次失败的错误。

## 7. 小练习

预测题（预计 10 分钟；不运行，先写答案）：

```python
import asyncio

async def worker(name, delay, fail=False):
    await asyncio.sleep(delay)
    if fail:
        raise ValueError(f"{name} 失败")
    return name

async def main():
    results = await asyncio.gather(
        worker("A", 0.2),
        worker("B", 0.1, fail=True),
        worker("C", 0.3),
        return_exceptions=True,
    )
    for r in results:
        print(repr(r))

asyncio.run(main())
```

预测三行输出的内容与顺序；再把 `return_exceptions=True` 删掉，预测程序行为。（答案：`'A'`、`ValueError('B 失败')`、`'C'`；删掉开关后 gather 在 B 失败的 0.1 秒抛 `ValueError`，main 未捕获直接崩，C 的结果丢失。）

挑战题（预计半小时；不给代码）：实现 `run_with_cleanup(coro, timeout)`：内部用 `asyncio.wait_for` 加超时；被取消时打印「清理资源」再把 `CancelledError` 抛回；超时在调用方表现为 `TimeoutError`。用下面的骨架自测：

```python
async def main():
    start = time.perf_counter()
    try:
        await run_with_cleanup(slow_download(), timeout=1)
        assert False, "应当超时"
    except TimeoutError:
        elapsed = time.perf_counter() - start
        assert 0.9 < elapsed < 2, f"超时未生效: {elapsed:.2f} 秒"

asyncio.run(main())
```

提示：`slow_download` 用 `asyncio.sleep(10)` 模拟；清理分支写在被包装协程或 `run_with_cleanup` 内层皆可，关键是不吞 `CancelledError`。

## 8. 与之前和之后的知识的关系

- 往前：gather、事件循环、协程对象的模型全部来自 [协程与 asyncio](/python/660-CoroutineAsyncio)；`async with` 与同步 `with` 的同构见 [上下文管理器](/python/520-ContextManager)，两者模板一致，只是进出都需要 `await`；
- 平行：`asyncio.to_thread` 的本质是借线程池跑阻塞代码，线程与进程的分工见 [多线程与多进程](/python/630-MultiprocessingMultithreading)；
- 往后：真实 Web 服务里的异步——路由函数、启动/关闭钩子、后台任务——见 [FastAPI](/python/880-PythonFastAPI)；异步程序的性能方法论（瓶颈测量、并发数压测）见 [性能分析](/python/690-PythonPerformance)。

## 9. 官方文档

- 协程与任务（异常传播、取消语义的权威出处）：https://docs.python.org/zh-cn/3/library/asyncio-task.html
- `asyncio.wait_for` 与超时：https://docs.python.org/zh-cn/3/library/asyncio-task.html#asyncio.wait_for
- 异步上下文管理器：https://docs.python.org/zh-cn/3/library/contextlib.html#contextlib.asynccontextmanager
- `asyncio.to_thread`：https://docs.python.org/zh-cn/3/library/asyncio-task.html#asyncio.to_thread

## 10. 自我检查

- 能画出 gather 默认模式的时间线：异常立刻抛出、兄弟继续跑、main 结束时残存任务被关闭；
- 能解释「超时就是取消」：外层 `TimeoutError`、内层 `CancelledError`，两层各自怎么写；
- 能复述 `CancelledError` 的处理纪律并说明吞掉它的后果；
- 能现场演示 `time.sleep` 版「伪并发」并替换为 `asyncio.sleep` 或 `asyncio.to_thread`；
- 看到 `Task exception was never retrieved` 能在三步内定位到裸 `create_task`。

## 本章总结

异步的工程难度全在边角：gather 默认「第一个异常立刻抛、兄弟不陪葬」，`return_exceptions=True` 换来部分成功；超时的本质是取消——`wait_for` 到点注入 `CancelledError`，内层清理后原样抛回，外层翻译成 `TimeoutError`，手动 `cancel` 走同一条路，纪律是清理完必须 raise；`async with` 让带 await 的资源清理自动发生；`time.sleep` 这类阻塞调用会让并发原地退化成串行，诊断靠对照实验，救场靠 `asyncio.to_thread`；裸 `create_task` 留下的 `Task exception was never retrieved` 是无人认领的事故报告。

## 下一步

把这套并发骨架搬进真实服务：[FastAPI](/python/880-PythonFastAPI) 的异步路由、启动与关闭钩子，正是本篇模式每天上班的地方。
