---
order: 41
title: 协程与asyncio
module: python
category: Python
difficulty: intermediate
description: 异步编程基础
author: fanquanpp
updated: '2026-06-14'
related:
  - python/并发编程
  - python/生成器与迭代器
  - python/Python与WebSocket
  - python/Python与FastAPI
prerequisites:
  - python/语法速查
---

## 什么是协程

协程是一种比线程更轻量的并发方式。线程由操作系统调度，切换开销大；协程由程序自身调度，切换开销极小。你可以创建成千上万个协程而不会耗尽系统资源。

Python 的 asyncio 模块提供了编写协程的基础设施。在 asyncio 中，你用 async def 定义协程函数，用 await 等待异步操作完成。当一个协程在等待（比如等待网络响应）时，事件循环会自动切换到其他协程执行，从而实现并发。

## 基础概念

### 同步与异步

同步代码是按顺序执行的：一行代码执行完才执行下一行。如果某行代码需要等待（如网络请求），整个程序都会停在那里。

异步代码在等待时会自动切换到其他任务。比如你发起一个网络请求，在等待响应的同时可以做其他事情，等响应到了再回来处理。这样就不会因为一个慢操作阻塞整个程序。

### 事件循环

事件循环是 asyncio 的核心，它负责调度协程的执行。你可以把事件循环想象成一个调度员：它维护一个待执行的任务列表，当一个任务在等待时，切换到另一个任务执行。

### async/await 语法

- async def：定义一个协程函数。调用协程函数不会立即执行，而是返回一个协程对象
- await：等待一个异步操作完成。await 只能在 async 函数中使用

### 协程与任务

- 协程（Coroutine）：async def 定义的函数的返回值，本身不会执行
- 任务（Task）：对协程的封装，由事件循环调度执行。使用 asyncio.create_task() 创建

## 快速上手

### 第一个协程

```python
import asyncio

# 定义协程函数
async def say_hello(name, delay):
    """延迟后打印问候"""
    print(f"开始等待 {name}...")
    # 异步等待（不会阻塞事件循环）
    await asyncio.sleep(delay)
    print(f"你好, {name}!")

# 运行协程
asyncio.run(say_hello("世界", 2))
```

### 并发执行多个协程

```python
import asyncio
import time

async def say_hello(name, delay):
    print(f"开始: {name}")
    await asyncio.sleep(delay)
    print(f"完成: {name}")
    return f"{name} 的结果"

async def main():
    start = time.time()

    # 并发执行三个协程
    results = await asyncio.gather(
        say_hello("任务A", 2),
        say_hello("任务B", 1),
        say_hello("任务C", 3),
    )

    duration = time.time() - start
    print(f"结果: {results}")
    print(f"总耗时: {duration:.1f} 秒")  # 约 3 秒，不是 6 秒

asyncio.run(main())
```

输出：

```
开始: 任务A
开始: 任务B
开始: 任务C
完成: 任务B
完成: 任务A
完成: 任务C
结果: ['任务A 的结果', '任务B 的结果', '任务C 的结果']
总耗时: 3.0 秒
```

三个任务并发执行，总耗时等于最慢的那个任务（3 秒），而不是所有任务时间之和（6 秒）。

## 详细用法

### 创建任务

```python
import asyncio

async def process_data(data):
    """处理数据"""
    await asyncio.sleep(1)
    return f"处理完成: {data}"

async def main():
    # 方式一：create_task 创建任务并立即开始执行
    task = asyncio.create_task(process_data("测试数据"))

    # 在任务执行的同时可以做其他事情
    print("任务已创建，可以做其他事...")

    # 等待任务完成并获取结果
    result = await task
    print(result)

    # 方式二：gather 同时等待多个任务
    results = await asyncio.gather(
        process_data("数据1"),
        process_data("数据2"),
        process_data("数据3"),
    )
    print(results)

asyncio.run(main())
```

### 任务取消

```python
import asyncio

async def long_task():
    """长时间运行的任务"""
    try:
        for i in range(10):
            print(f"进度: {i}/10")
            await asyncio.sleep(1)
        return "完成"
    except asyncio.CancelledError:
        print("任务被取消了")
        raise  # 重新抛出，让调用者知道任务被取消

async def main():
    task = asyncio.create_task(long_task())

    # 等 3 秒后取消任务
    await asyncio.sleep(3)
    task.cancel()

    try:
        result = await task
    except asyncio.CancelledError:
        print("主函数得知任务被取消")

asyncio.run(main())
```

### 超时控制

```python
import asyncio

async def slow_operation():
    """模拟慢操作"""
    await asyncio.sleep(10)
    return "完成"

async def main():
    # 方式一：wait_for 设置超时
    try:
        result = await asyncio.wait_for(slow_operation(), timeout=3)
        print(result)
    except asyncio.TimeoutError:
        print("操作超时")

    # 方式二：asyncio.timeout（Python 3.11+）
    async with asyncio.timeout(3):
        try:
            result = await slow_operation()
            print(result)
        except asyncio.TimeoutError:
            print("操作超时")

asyncio.run(main())
```

### 异步 HTTP 请求

```python
import asyncio
import aiohttp

async def fetch_url(session, url):
    """异步获取 URL 内容"""
    async with session.get(url) as response:
        return await response.text()

async def main():
    # 使用 aiohttp 进行异步 HTTP 请求
    async with aiohttp.ClientSession() as session:
        # 并发请求多个 URL
        urls = [
            "https://httpbin.org/get",
            "https://httpbin.org/ip",
            "https://httpbin.org/headers",
        ]
        tasks = [fetch_url(session, url) for url in urls]
        results = await asyncio.gather(*tasks)

        for url, result in zip(urls, results):
            print(f"{url}: {len(result)} 字符")

# 需要先安装 aiohttp: pip install aiohttp
asyncio.run(main())
```

### 异步文件操作

```python
import asyncio
import aiofiles

async def read_file(path):
    """异步读取文件"""
    async with aiofiles.open(path, 'r', encoding='utf-8') as f:
        content = await f.read()
    return content

async def write_file(path, content):
    """异步写入文件"""
    async with aiofiles.open(path, 'w', encoding='utf-8') as f:
        await f.write(content)

# 需要先安装 aiofiles: pip install aiofiles
```

### 异步上下文管理器

```python
import asyncio

class AsyncDatabaseConnection:
    """异步数据库连接"""

    async def __aenter__(self):
        print("连接数据库")
        await asyncio.sleep(0.1)  # 模拟异步连接
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        print("关闭数据库连接")
        await asyncio.sleep(0.1)  # 模拟异步关闭

    async def query(self, sql):
        await asyncio.sleep(0.5)  # 模拟异步查询
        return f"查询结果: {sql}"

async def main():
    async with AsyncDatabaseConnection() as db:
        result = await db.query("SELECT * FROM users")
        print(result)

asyncio.run(main())
```

### 异步迭代器

```python
import asyncio

class AsyncRange:
    """异步范围迭代器"""

    def __init__(self, count):
        self.count = count

    def __aiter__(self):
        self.current = 0
        return self

    async def __anext__(self):
        if self.current >= self.count:
            raise StopAsyncIteration
        await asyncio.sleep(0.1)  # 模拟异步获取
        value = self.current
        self.current += 1
        return value

async def main():
    # 使用 async for 遍历异步迭代器
    async for i in AsyncRange(5):
        print(f"获取到: {i}")

asyncio.run(main())
```

### asyncio.Queue

asyncio.Queue 是协程间通信的安全方式：

```python
import asyncio
import random

async def producer(queue, producer_id):
    """生产者：向队列中添加数据"""
    for i in range(5):
        item = f"产品-{producer_id}-{i}"
        await queue.put(item)
        print(f"生产者 {producer_id} 添加: {item}")
        await asyncio.sleep(random.uniform(0.1, 0.5))

async def consumer(queue, consumer_id):
    """消费者：从队列中取出数据"""
    while True:
        item = await queue.get()
        print(f"消费者 {consumer_id} 处理: {item}")
        await asyncio.sleep(random.uniform(0.2, 0.8))
        queue.task_done()

async def main():
    queue = asyncio.Queue(maxsize=10)

    # 启动生产者和消费者
    producers = [producer(queue, i) for i in range(2)]
    consumers = [asyncio.create_task(consumer(queue, i)) for i in range(3)]

    # 等待所有生产者完成
    await asyncio.gather(*producers)

    # 等待队列中所有项目被处理
    await queue.join()

    # 取消消费者（它们在无限循环中）
    for c in consumers:
        c.cancel()

asyncio.run(main())
```

## 常见场景

### 异步 Web 爬虫

```python
import asyncio
import aiohttp
from time import time

async def fetch(session, url):
    """异步获取单个 URL"""
    try:
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as resp:
            return await resp.text()
    except Exception as e:
        return f"错误: {e}"

async def crawl(urls):
    """并发爬取多个 URL"""
    async with aiohttp.ClientSession() as session:
        tasks = [fetch(session, url) for url in urls]
        results = await asyncio.gather(*tasks)
        return results

async def main():
    urls = [f"https://httpbin.org/get?id={i}" for i in range(10)]

    start = time()
    results = await crawl(urls)
    duration = time() - start

    print(f"爬取 {len(urls)} 个页面，耗时 {duration:.2f} 秒")

asyncio.run(main())
```

### 异步数据库操作

```python
import asyncio

async def batch_insert(records):
    """批量异步插入数据"""
    tasks = [insert_record(record) for record in records]
    results = await asyncio.gather(*tasks)
    return results

async def insert_record(record):
    """异步插入单条记录"""
    # 模拟异步数据库操作
    await asyncio.sleep(0.01)
    return f"已插入: {record}"

async def main():
    records = [f"记录_{i}" for i in range(100)]
    results = await batch_insert(records)
    print(f"共插入 {len(results)} 条记录")

asyncio.run(main())
```

## 注意事项与常见错误

### 不要在协程中调用阻塞函数

在 async 函数中调用 time.sleep()、requests.get() 等同步阻塞函数会阻塞整个事件循环，其他协程都无法执行。应该使用对应的异步版本：

```python
import asyncio
import time

# 错误：使用同步的 time.sleep
async def bad_example():
    time.sleep(5)  # 阻塞整个事件循环 5 秒

# 正确：使用异步的 asyncio.sleep
async def good_example():
    await asyncio.sleep(5)  # 不阻塞事件循环
```

如果必须调用阻塞函数，使用 asyncio.to_thread 在线程中执行：

```python
import asyncio
import time

async def main():
    # 在线程中执行阻塞操作
    result = await asyncio.to_thread(time.sleep, 5)
```

### 忘记 await

调用协程函数时如果不加 await，协程不会执行：

```python
import asyncio

async def my_coroutine():
    print("这行会执行吗？")

async def main():
    # 错误：没有 await，协程不会执行
    my_coroutine()

    # 正确：使用 await
    await my_coroutine()

asyncio.run(main())
```

### asyncio.run 只能调用一次

asyncio.run() 会创建新的事件循环并运行。在已有事件循环运行时（如在 FastAPI 中），不能再调用 asyncio.run()。应该直接 await 协程或使用 asyncio.create_task()。

### gather 的错误处理

asyncio.gather 中某个任务抛出异常时，默认会取消其他任务。如果需要获取所有结果（包括异常），使用 return_exceptions=True：

```python
results = await asyncio.gather(
    task1(),
    task2(),
    task3(),
    return_exceptions=True  # 异常作为返回值，不会取消其他任务
)
```

## 进阶用法

### 使用 Semaphore 限制并发数

```python
import asyncio
import aiohttp

async def fetch_with_limit(session, url, semaphore):
    """带并发限制的请求"""
    async with semaphore:  # 获取信号量，超过限制则等待
        async with session.get(url) as resp:
            return await resp.text()

async def main():
    # 最多同时 5 个请求
    semaphore = asyncio.Semaphore(5)

    async with aiohttp.ClientSession() as session:
        urls = [f"https://httpbin.org/get?id={i}" for i in range(50)]
        tasks = [
            fetch_with_limit(session, url, semaphore)
            for url in urls
        ]
        results = await asyncio.gather(*tasks)
        print(f"完成 {len(results)} 个请求")

asyncio.run(main())
```

### 使用 as_completed 按完成顺序获取结果

```python
import asyncio

async def task(name, delay):
    await asyncio.sleep(delay)
    return f"{name} 完成（耗时 {delay} 秒）"

async def main():
    tasks = [
        asyncio.create_task(task("A", 3)),
        asyncio.create_task(task("B", 1)),
        asyncio.create_task(task("C", 2)),
    ]

    # 按完成顺序获取结果（而不是按创建顺序）
    for coro in asyncio.as_completed(tasks):
        result = await coro
        print(result)

# 输出顺序：B -> C -> A

asyncio.run(main())
```

### 子进程管理

```python
import asyncio

async def run_command(cmd):
    """异步运行命令行命令"""
    process = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )

    stdout, stderr = await process.communicate()
    return {
        "returncode": process.returncode,
        "stdout": stdout.decode(),
        "stderr": stderr.decode(),
    }

async def main():
    result = await run_command(["python", "-c", "print('Hello')"])
    print(result["stdout"])  # Hello

asyncio.run(main())
```

### 在 FastAPI 中使用异步

FastAPI 原生支持 async/await，你可以直接在路由处理函数中使用：

```python
from fastapi import FastAPI
import asyncio

app = FastAPI()

@app.get("/slow")
async def slow_endpoint():
    """异步端点：等待时可以处理其他请求"""
    await asyncio.sleep(2)
    return {"message": "完成"}

@app.get("/fast")
async def fast_endpoint():
    return {"message": "立即返回"}
```
