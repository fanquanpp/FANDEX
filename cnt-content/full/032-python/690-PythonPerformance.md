---
order: 610
title: 性能优化：先测量，再动手
module: 'python'
category: 后端技术
difficulty: advanced
description: 以「一个 40 秒的巡检脚本」为现场，走完性能优化的标准流程：perf_counter 计时、cProfile 找热点、读懂 tottime 与 cumtime，再按 CPU 密集、IO 密集、内存三类瓶颈对症下药；附 lru_cache 使用边界与十个高频反模式。
author: fanquanpp
updated: '2026-10-05'
related:
  - 'python/630-MultiprocessingMultithreading'
  - 'python/650-GILAndFreeThreading'
  - 'python/700-CExtensionsAndFfi'
prerequisites: []
---

## 前置知识

- [迭代器与 itertools](/python/170-ComprehensionGenerator)：知道生成器表达式的惰性求值；
- [多进程与多线程](/python/630-MultiprocessingMultithreading)：知道线程与进程的区别（细节可后补）。

## 你现在要解决什么问题

一个设备日志巡检脚本，读入一天几百万行日志、过滤、统计、生成报表，跑一次要 40 秒。使用频率一高就难受，你想优化它。停下来——**优化的第一步不是改代码，是找出时间花在哪**。人对瓶颈的直觉错得离谱：十次猜测里八九次猜错热点。Python 生态把测量工具准备得非常齐全，本篇就按「测量、定位、对症」的顺序把 40 秒砍下来。

## 第一步：手表与放大镜

先用手表确认整体耗时，用 `time.perf_counter`（单调递增、高精度）而不是 `time.time`（墙上时钟，会被系统对时干扰甚至倒退）：

```python
import time

start = time.perf_counter()
run_inspection()
print(f"{time.perf_counter() - start:.3f}s")
```

再上放大镜 `cProfile`，让解释器记录每个函数被调用了多少次、各花多少时间：

```bash
python -m cProfile -s tottime inspect.py
```

```text
         3012456 function calls in 39.872 seconds

   Ordered by: internal time

   ncalls  tottime  percall  cumtime  filename:lineno(function)
        1   28.114    28.114   36.502   inspect.py:12(summarize)
  2000000    6.823     0.000    6.823    inspect.py:5(is_alert)
   500000    2.910     0.000    4.133    {built-in method builtins.str.replace}
   ...
```

两列要看懂再动手：

- **tottime**：这个函数自己花了多少（不含它调用的别人）——找「 computation 本体」看这列；
- **cumtime**：连同它调用的一切一共多少——找「哪条调用链贵」看这列。

现场结论一眼可见：`summarize` 自己 28 秒，且被调的 `is_alert` 跑了两百万次。热点找到了，这才轮到改代码。

## 对症：三类瓶颈三条路

优化手段按瓶颈类型选择，选错方向白费劲：

| 瓶颈 | 特征 | 首选手段 |
| --- | --- | --- |
| CPU 密集 | profile 里 tottime 都在纯计算函数 | 换数据结构/内建函数、NumPy 向量化、多进程 |
| IO 密集 | tottime 集中在 `recv`/`read`/`connect` | 线程池、asyncio |
| 内存 | 换页、GC 频繁、OOM | 生成器流式处理、`__slots__`、tracemalloc |

判断方法就藏在 profile 里：tottime 排前面的若是内建 IO 方法，是 IO 密集；若是自家算法函数，是 CPU 密集。

### CPU 密集：本篇现场的修法

回头看 28 秒的 `summarize`，三处典型病：循环里反复查全局名字、逐段 `+` 拼接字符串、对每行调用一次 `is_alert` 函数（两百万次函数调用开销）。逐个修：

```python
# 修前
import re

ALERT = re.compile(r"ERROR|WARN")

def summarize(path):
    report = ""
    for line in open(path):
        if is_alert(line):
            report = report + line.strip() + "\n"    # 循环里 + 拼接，O(n^2)
    return report

# 修后
def summarize(path):
    alert = ALERT.match                              # 全局查找移出循环，属性查找一次
    with open(path) as f:
        hits = [line.strip() for line in f if alert(line)]
    return "\n".join(hits)                           # join 一次成型，O(n)
```

40 秒级别的问题，这类「数据流重排」往往一招就砍掉大半。CPU 密集的进一步手段按性价比排序：

1. **换算法与内置结构**：`in` 判断用 set 不用 list，计数用 `collections.Counter`，排序让 `sort(key=...)` 少跑 `__lt__`；
2. **NumPy 向量化**：数值循环换成整段数组运算，把循环下沉到 C。反复提醒一句——向量化是「整体一次算」，在 Python 循环里逐元素调 NumPy 反而更慢；
3. **多进程**：进程各自有解释器，绕开 GIL（细节见 [GIL 与自由线程](/python/650-GILAndFreeThreading)），适合可分块的纯计算；Python 3.13 起官方提供无 GIL 的自由线程构建，截至 2026 年仍属可选的新部署路线，存量代码先按多进程规划。

### IO 密集：并发把等待重叠起来

抓一百个网页，每个 0.5 秒，顺序执行就是 50 秒——但等待网络响应时 CPU 明明闲着。把等待重叠起来：

```python
from concurrent.futures import ThreadPoolExecutor
import httpx

def fetch(client: httpx.Client, url: str) -> str:
    return client.get(url).text

def fetch_all(urls: list[str]) -> list[str]:
    with httpx.Client() as client, ThreadPoolExecutor(max_workers=20) as pool:
        return list(pool.map(lambda u: fetch(client, u), urls))
```

线程在 Python 里适合 IO 密集的原因：线程等 IO 时会释放 GIL，别的线程得以运行。规模上去或要高并发长连接时再升级 asyncio（见 [asyncio](/python/660-CoroutineAsyncio)），要记住的纪律是：**协程函数里不许出现同步阻塞调用**——在协程里调 `requests.get`，整个事件循环都会被卡住，并发是假的。

### 内存：让数据流过去而不是堆下来

统计八 GB 日志不需要八 GB 内存——生成器让数据一行行流过管道（原理见 [生成器与协程](/python/180-GeneratorCoroutine)）：

```python
errors = (parse(line) for line in open("huge.log") if "ERROR" in line)
critical = [e for e in errors if e.level == "CRITICAL"]
```

对象数量巨大时加 `@dataclass(slots=True)`：去掉每实例的 `__dict__`，单个对象省百来字节，百万实例就是几百 MB（对比见 [数据类与 Pydantic](/python/550-DataClassPydantic)）。内存问题用 `tracemalloc` 定位：

```python
import tracemalloc
tracemalloc.start()
run()
snapshot = tracemalloc.take_snapshot()
for stat in snapshot.statistics("lineno")[:5]:
    print(stat)
```

## 缓存：把算过的存起来

纯函数（同样输入必得同样输出）重复调用是白烧 CPU，`lru_cache` 一行接上：

```python
from functools import lru_cache

@lru_cache(maxsize=1024)
def device_firmware(device_id: str) -> str:
    return query_database(device_id)        # 同 id 第二次起直接命中缓存
```

三条边界要清楚：参数必须可哈希（传 list 会 `TypeError`，先转 tuple）；结果可变的函数不能缓存（时间、随机数、数据库可变数据）；`maxsize=None` 等于无上限缓存，长期运行的服务里就是内存泄漏的另一种写法。

## 什么时候轮到换语言级方案

以上手段用尽仍不够，才考虑把热点函数下沉：Cython 给代码加类型标注编译成 C 扩展，或用 PyO3 把 Rust 函数包成 Python 模块。Pydantic v2（Rust 内核）与 Ruff（Rust 写的 linter）就是这条路的样板。代价是要维护一层构建链，动手前先读 [C 扩展与 FFI](/python/700-CExtensionsAndFfi)。绝大多数业务项目终其一生到不了这一步。

## 常见坑点

坑一：过早优化。没跑 profile 就改代码，八成改在不热的地方。软件圈那句老话在此格外贴切：先让它对，再让它快，且「快」要有数据支撑。

坑二：循环里 `+` 拼接字符串。str 不可变，每次 `+` 都复制整个字符串，整体 O(n^2)。批量拼接一律 `"".join(parts)`。

坑三：用 `time.time` 计时。它可能被 NTP 调整，短间隔测量甚至出现负数。计时一律 `time.perf_counter`。

坑四：asyncio 里调阻塞函数。`requests`、`time.sleep`、同步 DB 驱动都会冻住整个事件循环，协程越多卡得越狠。要么换异步库，要么 `asyncio.to_thread()` 把阻塞调用扔进线程。

坑五：NumPy 循环调用。`np.sqrt` 一次吃一整个数组；在 for 里逐元素调它，比纯 Python 还慢（数组包装开销白付）。

坑六：给多线程加速 CPU 密集任务。纯计算线程受 GIL 串行化，四线程不会变快。CPU 密集用多进程，或审视算法本身。

坑七：全局缓存只增不减。`_cache[key] = value` 没有上限的字典，跑一周就是一个定时炸弹。用 `lru_cache(maxsize=...)` 或定期清理。

## 自我检查

- 能说出先 profile 再优化的理由，并能读出 tottime 与 cumtime 的区别；
- 拿到一份 cProfile 输出，能判断瓶颈属于 CPU、IO、内存中的哪一类；
- 知道字符串拼接、生成器、slots、perf_counter 四个默认正确的选择；
- 能说出 `lru_cache` 的三条使用边界；
- 知道线程适合 IO 密集、进程适合 CPU 密集的原理（GIL 的释放时机）。

## 练习

1. 预测题：`s = ""` 后循环十万次 `s += "x"` 与 `"".join("x" for _ in range(100000))`，量级差多少？用 perf_counter 实测。
2. 修改题：把本篇 `summarize` 再进一步——只要 `CRITICAL` 级别且行数超过一万时截断，保证函数在超大文件上内存占用恒定（提示：`islice`）。
3. 实战题：给自己任意一个旧脚本跑 `python -m cProfile -s tottime`，把输出前三行贴出来，写一句话判断瓶颈类型与对应手段。
4. 挑战题：写一个装饰器 `@timed`，用 `time.perf_counter` 打印被装饰函数的耗时与参数摘要，并用 `functools.wraps` 保留元信息；解释没有 wraps 时会发生什么。

## 下一步

- GIL 的原理与 3.13 自由线程的走向：[GIL 与自由线程](/python/650-GILAndFreeThreading)；
- IO 密集的正主——事件循环与协程：[asyncio 协程](/python/660-CoroutineAsyncio)；
- 热点真的下不去手时的语言级方案：[C 扩展与 FFI](/python/700-CExtensionsAndFfi)。
