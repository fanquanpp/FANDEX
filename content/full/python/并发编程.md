---
order: 85
tags:
  - python
  - concurrency
difficulty: advanced
title: 并发编程
module: python
category: 'Python Basics'
description: Python并发编程详解：多线程、多进程、GIL、线程池、进程池与asyncio异步编程。
author: fanquanpp
updated: '2026-06-13'
related:
  - python/Python与虚拟环境
  - python/Python与代码质量
  - python/Python与数据库迁移
  - python/Python与OAuth2
prerequisites:
  - python/语法速查
---

## 1. Python 并发模型概述

### 1.1 三种并发方式

| 方式    | 适用场景  | 特点                    |
| :------ | :-------- | :---------------------- |
| 多线程  | IO密集型  | 受GIL限制，不能真正并行 |
| 多进程  | CPU密集型 | 独立进程，可利用多核    |
| asyncio | IO密集型  | 协程，单线程事件循环    |

### 1.2 GIL（全局解释器锁）

GIL是CPython的互斥锁，确保同一时刻只有一个线程执行Python字节码。

```python
# GIL的影响：多线程无法利用多核加速CPU密集任务
import time
import threading

def cpu_bound_task():
    total = 0
    for i in range(50_000_000):
        total += i
    return total

# 单线程
start = time.perf_counter()
cpu_bound_task()
cpu_bound_task()
print(f"单线程: {time.perf_counter() - start:.2f}s")

# 多线程（由于GIL，不会加速）
start = time.perf_counter()
t1 = threading.Thread(target=cpu_bound_task)
t2 = threading.Thread(target=cpu_bound_task)
t1.start(); t2.start()
t1.join(); t2.join()
print(f"多线程: {time.perf_counter() - start:.2f}s")
# 多线程可能比单线程更慢（线程切换开销）
```

## 2. 多线程

### 2.1 线程创建与管理

```python
import threading
import time

# 方式1：创建Thread实例
def worker(name, delay):
    print(f"线程 {name} 开始")
    time.sleep(delay)
    print(f"线程 {name} 完成")

t1 = threading.Thread(target=worker, args=("A", 2))
t2 = threading.Thread(target=worker, args=("B", 1), daemon=True)

t1.start()
t2.start()
t1.join()  # 等待t1完成
# t2是守护线程，主线程结束时会自动终止

# 方式2：继承Thread类
class MyThread(threading.Thread):
    def __init__(self, name, delay):
        super().__init__(name=name)
        self.delay = delay
        self.result = None

    def run(self):
        time.sleep(self.delay)
        self.result = f"{self.name} completed"

t = MyThread("Worker", 1)
t.start()
t.join()
print(t.result)
```

### 2.2 线程同步

```python
import threading
import time

# Lock: 互斥锁
class SafeCounter:
    def __init__(self):
        self._value = 0
        self._lock = threading.Lock()

    def increment(self):
        with self._lock:  # 自动获取和释放锁
            self._value += 1

    @property
    def value(self):
        with self._lock:
            return self._value

counter = SafeCounter()
threads = []
for _ in range(100):
    t = threading.Thread(target=lambda: [counter.increment() for _ in range(1000)])
    threads.append(t)
    t.start()

for t in threads:
    t.join()

print(f"Counter: {counter.value}")  # 100000

# RLock: 可重入锁（同一线程可多次获取）
class ReentrantExample:
    def __init__(self):
        self._lock = threading.RLock()

    def outer(self):
        with self._lock:
            self.inner()  # 同一线程可以再次获取RLock

    def inner(self):
        with self._lock:
            pass

# Semaphore: 信号量（限制并发数）
semaphore = threading.Semaphore(3)  # 最多3个线程同时访问

def limited_access(task_id):
    with semaphore:
        print(f"Task {task_id} accessing resource")
        time.sleep(1)
    print(f"Task {task_id} done")

threads = [threading.Thread(target=limited_access, args=(i,)) for i in range(10)]
for t in threads: t.start()
for t in threads: t.join()
```

### 2.3 线程间通信

```python
import threading
import queue
import time

# 使用Queue进行线程间通信
def producer(q, count):
    for i in range(count):
        item = f"item-{i}"
        q.put(item)
        print(f"Produced: {item}")
        time.sleep(0.1)
    q.put(None)  # 哨兵值

def consumer(q):
    while True:
        item = q.get()
        if item is None:
            q.task_done()
            break
        print(f"Consumed: {item}")
        q.task_done()

q = queue.Queue(maxsize=10)
t1 = threading.Thread(target=producer, args=(q, 5))
t2 = threading.Thread(target=consumer, args=(q,))

t1.start()
t2.start()
t1.join()
t2.join()

# Event: 线程间信号通知
event = threading.Event()

def waiter():
    print("等待信号...")
    event.wait()  # 阻塞直到set()
    print("收到信号！")

def signaler():
    time.sleep(2)
    print("发送信号")
    event.set()

threading.Thread(target=waiter).start()
threading.Thread(target=signaler).start()

# Condition: 条件变量
condition = threading.Condition()
shared_data = []

def consumer_cond():
    with condition:
        while not shared_data:
            condition.wait()  # 等待通知
        data = shared_data.pop(0)
        print(f"Consumed: {data}")

def producer_cond():
    with condition:
        shared_data.append("new item")
        condition.notify()  # 通知一个等待的线程
```

## 3. 线程池与进程池

### 3.1 ThreadPoolExecutor

```python
from concurrent.futures import ThreadPoolExecutor, as_completed
import time
import requests

# IO密集型：使用线程池
def fetch_url(url):
    response = requests.get(url, timeout=10)
    return url, response.status_code

urls = [
    'https://httpbin.org/get?id=1',
    'https://httpbin.org/get?id=2',
    'https://httpbin.org/get?id=3',
]

with ThreadPoolExecutor(max_workers=3) as executor:
    # 方式1：submit + as_completed
    futures = {executor.submit(fetch_url, url): url for url in urls}
    for future in as_completed(futures):
        url, status = future.result()
        print(f"{url}: {status}")

    # 方式2：map
    for url, status in executor.map(lambda u: fetch_url(u), urls):
        print(f"{url}: {status}")

# 带超时和异常处理
with ThreadPoolExecutor(max_workers=5) as executor:
    futures = [executor.submit(fetch_url, url) for url in urls]
    for future in as_completed(futures, timeout=30):
        try:
            result = future.result(timeout=10)
            print(result)
        except Exception as e:
            print(f"Error: {e}")
```

### 3.2 ProcessPoolExecutor

```python
from concurrent.futures import ProcessPoolExecutor
import time
import math

# CPU密集型：使用进程池
def is_prime(n):
    if n < 2:
        return False
    for i in range(2, int(math.sqrt(n)) + 1):
        if n % i == 0:
            return False
    return True

def count_primes(start, end):
    return sum(1 for n in range(start, end) if is_prime(n))

# 多进程加速CPU密集任务
if __name__ == '__main__':
    ranges = [(1, 250000), (250000, 500000), (500000, 750000), (750000, 1000000)]

    # 单进程
    start = time.perf_counter()
    total = sum(count_primes(s, e) for s, e in ranges)
    print(f"单进程: {total} primes, {time.perf_counter() - start:.2f}s")

    # 多进程
    start = time.perf_counter()
    with ProcessPoolExecutor(max_workers=4) as executor:
        results = executor.map(count_primes, *zip(*ranges))
        total = sum(results)
    print(f"多进程: {total} primes, {time.perf_counter() - start:.2f}s")
```

## 4. asyncio 异步编程

### 4.1 基本用法

```python
import asyncio

# 定义协程
async def hello(name, delay):
    print(f"Hello {name} 开始")
    await asyncio.sleep(delay)  # 非阻塞等待
    print(f"Hello {name} 完成")
    return f"Result for {name}"

# 运行协程
async def main():
    # 串行执行
    result1 = await hello("Alice", 2)
    result2 = await hello("Bob", 1)
    print(result1, result2)

asyncio.run(main())

# 并发执行
async def main_concurrent():
    # gather: 并发运行多个协程
    results = await asyncio.gather(
        hello("Alice", 2),
        hello("Bob", 1),
        hello("Charlie", 1.5),
    )
    print(results)

asyncio.run(main_concurrent())
```

### 4.2 异步IO操作

```python
import asyncio
import aiohttp

# 异步HTTP请求
async def fetch(session, url):
    async with session.get(url) as response:
        return await response.json()

async def fetch_all(urls):
    async with aiohttp.ClientSession() as session:
        tasks = [fetch(session, url) for url in urls]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        return results

# 异步文件操作（Python 3.11+ aiofiles）
async def read_file_async(path):
    import aiofiles
    async with aiofiles.open(path, 'r') as f:
        content = await f.read()
    return content

# 异步TCP
async def tcp_client():
    reader, writer = await asyncio.open_connection('example.com', 80)
    writer.write(b'GET / HTTP/1.1\r\nHost: example.com\r\n\r\n')
    await writer.drain()
    data = await reader.read(1024)
    writer.close()
    await writer.wait_closed()
    return data.decode()
```

### 4.3 异步同步原语

```python
import asyncio

# asyncio.Lock
async def lock_demo():
    lock = asyncio.Lock()
    async with lock:
        # 临界区
        await asyncio.sleep(0.1)

# asyncio.Semaphore
async def semaphore_demo():
    sem = asyncio.Semaphore(3)  # 最多3个并发

    async def limited_task(task_id):
        async with sem:
            print(f"Task {task_id} started")
            await asyncio.sleep(1)
            print(f"Task {task_id} done")

    await asyncio.gather(*[limited_task(i) for i in range(10)])

# asyncio.Queue
async def producer_consumer():
    queue = asyncio.Queue(maxsize=5)

    async def producer():
        for i in range(10):
            await queue.put(i)
            print(f"Produced: {i}")
            await asyncio.sleep(0.1)

    async def consumer():
        while True:
            item = await queue.get()
            print(f"Consumed: {item}")
            queue.task_done()
            await asyncio.sleep(0.2)

    prod_task = asyncio.create_task(producer())
    cons_task = asyncio.create_task(consumer())

    await prod_task
    await queue.join()
    cons_task.cancel()

asyncio.run(producer_consumer())
```

## 5. 常见问题与解决方案

### 5.1 线程安全的数据共享

```python
# 问题：多线程修改共享数据
import threading

counter = 0
lock = threading.Lock()

def safe_increment():
    global counter
    for _ in range(100000):
        with lock:
            counter += 1

# 解决方案2：使用threading.local
local_data = threading.local()

def process_with_local():
    local_data.value = 0
    for _ in range(1000):
        local_data.value += 1
    print(f"Thread local value: {local_data.value}")
```

### 5.2 进程间通信

```python
from multiprocessing import Process, Queue, Value, Array

# 使用Queue通信
def producer_mp(q):
    for i in range(5):
        q.put(i)
    q.put(None)  # 结束信号

def consumer_mp(q):
    while True:
        item = q.get()
        if item is None:
            break
        print(f"Got: {item}")

q = Queue()
p1 = Process(target=producer_mp, args=(q,))
p2 = Process(target=consumer_mp, args=(q,))
p1.start(); p2.start()
p1.join(); p2.join()

# 使用共享内存
def worker_mp(val, arr):
    val.value += 1
    arr[0] = -1

val = Value('i', 0)     # 共享整数
arr = Array('d', [1.0, 2.0, 3.0])  # 共享数组
p = Process(target=worker_mp, args=(val, arr))
p.start(); p.join()
```

### 5.3 asyncio 与同步代码混用

```python
import asyncio

# 在async中调用同步阻塞函数
async def mixed_code():
    loop = asyncio.get_event_loop()

    # 方式1：run_in_executor（在线程池中运行）
    result = await loop.run_in_executor(None, blocking_function)

    # 方式2：使用asyncio.to_thread（Python 3.9+）
    result = await asyncio.to_thread(blocking_function)

def blocking_function():
    import time
    time.sleep(1)
    return "result"
```

## 6. 总结与最佳实践

### 6.1 并发方式选择

```
任务类型？
├── CPU密集型 → 多进程（ProcessPoolExecutor）
├── IO密集型
│   ├── 需要高并发 → asyncio
│   └── 简单场景 → 多线程（ThreadPoolExecutor）
└── 混合型 → 多进程 + asyncio/多线程
```

### 6.2 最佳实践

1. **CPU密集用多进程**：绕过GIL限制
2. **IO密集用asyncio**：高并发、低开销
3. **简单IO用线程池**：代码更直观
4. **避免共享状态**：使用Queue通信
5. **设置超时**：防止任务永久阻塞
6. **进程池在 `if __name__ == '__main__'` 中使用**：Windows必须
7. **合理设置并发数**：线程/进程数不超过CPU核数×2
