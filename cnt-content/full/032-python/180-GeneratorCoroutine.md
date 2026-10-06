---
order: 240
title: 生成器深水区：send、yield from 与惰性流水线
module: 'python'
category: 后端技术
difficulty: advanced
description: 以「不爆内存地分析几 GB 日志」为任务，讲生成器的双向通信（send/throw/close）、yield from 委托与返回值、多级惰性流水线，最后说清生成器协程与 async/await 的血缘，附生成器耗尽陷阱实录与四类练习。
author: fanquanpp
updated: '2026-10-05'
related:
  - 'python/660-CoroutineAsyncio'
  - 'python/670-AsyncProgrammingDetailed'
  - 'python/520-ContextManager'
prerequisites: []
---

## 前置知识

- [推导式与生成器](/python/170-ComprehensionGenerator)：知道生成器表达式、会写带 yield 的生成器函数、见过 next() 与 StopIteration；
- [文件与上下文管理器](/python/300-FileIOContextManager)：本文的实战段要按行读文件（没读也不影响前半部分，示例可换成一个长列表）。

> 分工说明：生成器的入门语法（yield 基本形态、itertools、无限序列）在上一篇讲过；本文只讲三件更深的事——**双向通信、委托链、惰性流水线**，并在结尾交代生成器与 async/await 的血缘。async/await 本身的系统学习在 [协程与 asyncio](/python/660-CoroutineAsyncio)。

## 学习目标

读完本文你将能够：

1. 亲手验证生成器的内存优势：一个 `range` 级别的数列，列表与生成器占用差上千倍；
2. 用 `send()` 往「暂停中」的生成器里递值，写出 running average 这类有状态的流式计算；
3. 用 `yield from` 组装多级生成器流水线，逐行处理一个模拟的大日志文件而全程不把它读进内存；
4. 说清 `close()` / `GeneratorExit` 与生成器耗尽两个经典陷阱的成因；
5. 讲出「生成器协程如何一路演化成今天的 async/await」，看懂老代码里的 `@coroutine` 不再发怵。

预计 50 到 70 分钟，含 2 组动手实验与 4 道练习。

## 1. 你现在要解决什么问题

你给一个 ESP32 小玩具（比如会报天气的桌面摆件）写了固件，它每天往 SD 卡追加一行运行日志。一个月下来日志几个 GB，你想统计一下里面 ERROR 出现的规律。第一版脚本很直觉：

```python
with open("device.log", encoding="utf-8") as f:
    lines = f.readlines()          # 一次全读进内存
errors = [ln for ln in lines if "ERROR" in ln]
print(len(errors))
```

在几个 GB 的文件上，这行 `readlines()` 直接把机器内存吃满。问题的本质：**你只需要「流过」这些行，不需要同时「拿着」它们**。

生成器正是 Python 对「流过而非拿着」的语言级回答。上一篇你已经会用生成器省一次求和的中间列表；本文把它推到底：几个 GB 的日志、多级处理步骤，峰值内存依然只有「当前这一行」。

## 2. 先量化一下「省」在哪里

打开 REPL，亲手量一次：

```python
>>> import sys
>>> nums_list = [n * n for n in range(1_000_000)]
>>> nums_gen = (n * n for n in range(1_000_000))
>>> sys.getsizeof(nums_list)
8448728
>>> sys.getsizeof(nums_gen)
200
```

八百万字节对两百字节，四万多倍。原因：列表把一百万个结果**全部算好存着**；生成器只存「算到哪了、下一步怎么算」这一小包状态。代价是每个值只能现算现取、过河拆桥——这个代价在第 6 节会变成陷阱。

生成器函数把同样的思想写成多行：

```python
def squares(limit: int):
    n = 0
    while n < limit:
        yield n * n
        n += 1
```

调用 `squares(5)` **不执行任何一行代码**，只返回一个生成器对象；每次 `next()` 推进到下一个 yield，函数在 yield 处**暂停并交出值**，下次 `next()` 从暂停点继续。这是全部后续内容的物理基础：一个可以随时暂停、随时恢复的函数。

## 3. send()：往暂停点里递值

到目前为止数据都是单向流出的。`send()` 打通了反方向：**调用方能把值塞进暂停中的生成器**。

```python
def running_average() -> float:
    """流式计算平均值：每 send 一个数，返回当前平均。"""
    total = 0.0
    count = 0
    average = 0.0
    while True:
        value = yield average      # 暂停点：交出当前平均，等调用方送新值
        total += value
        count += 1
        average = total / count
```

用法有个固定起手式——先 `next()` 把生成器推进到第一个 yield，才能开始 send：

```python
>>> avg = running_average()
>>> next(avg)          # 起手：推进到 yield，拿到初始 average = 0.0
0.0
>>> avg.send(90)       # 送入第一个数
90.0
>>> avg.send(80)
85.0
>>> avg.send(100)
90.0
```

读一遍发生的事：`send(90)` 让 `yield average` 这个表达式的值变成 90，函数继续跑到下一个 `yield average` 暂停，交出更新后的平均。生成器在这里扮演的角色是**一个带记忆的过滤器**：数据一条条流进来，状态（total、count）一直活在生成器内部，调用方完全不用管。

这就是「生成器协程」名字的由来：数据双向流动，生成器不再只是产数据的，而是**能被喂指令、能维持状态的处理单元**。

修改实验一：给 running_average 加一条规则——send 进负数时不计入统计。只许改函数内部一处（提示：if 放在 `total += value` 之前；思考返回值该不该重复发上一次的平均）。

## 4. yield from：把流水线接起来

真实的数据处理很少一步完成：读行、拆字段、过滤、格式化。每一步都可以是一个生成器，用 `yield from` 串起来：

```python
def read_lines(lines: list[str]):
    for line in lines:
        yield line.rstrip("\n")

def parse(line: str) -> tuple[str, str]:
    level, _, message = line.partition(" ")
    return level, message

def errors_only(lines):
    for line in read_lines(lines):
        level, message = parse(line)
        if level == "ERROR":
            yield f"[error] {message}"
```

`errors_only` 里手动转发 yield（先取再吐）是可用的，但每接一级就要写一遍。`yield from iterable` 等价于「把子生成器的每个值原样转发出来」，让中间层退化为纯粹的管道接头：

```python
def errors_only(lines):
    yield from (
        f"[error] {parse(ln)[1]}"
        for ln in read_lines(lines)
        if parse(ln)[0] == "ERROR"
    )
```

`yield from` 还有一个多数教程不讲的细节：**它能接住子生成器的 return 值**。

```python
def counter(n: int) -> int:
    yield from range(n)
    return n            # 子生成器的"结算结果"

def main():
    result = yield from counter(3)   # result 拿到 3
    yield f"共处理 {result} 条"

>>> list(main())
[0, 1, 2, '共处理 3 条']
```

`yield from` 表达式的值就是子生成器 return 的值。这个「产出一路流水、结束给个总结」的模式，正是下一代语法 async/await 的直接雏形——第 7 节展开。

## 5. 实战：几个 GB 的日志，一行进一行出

把前面所有零件装起来。日志格式：`LEVEL message`。目标是统计 ERROR 总数，全程不把文件读进内存：

```python
from pathlib import Path

def read_lines(path: Path):
    """按行产出，替代 readlines()。"""
    with path.open(encoding="utf-8") as f:
        yield from f          # 文件对象本身就是按行产出的迭代器

def only_errors(lines):
    for line in lines:
        if line.startswith("ERROR"):
            yield line

log = Path("device.log")
count = sum(1 for _ in only_errors(read_lines(log)))
print(f"共 {count} 条错误")
```

注意这条流水线的执行方式：`sum` 要一个值，`only_errors` 才向 `read_lines` 要一行，`read_lines` 才向文件要一行——**需求从后往前传，数据从前往后流**，任意时刻内存里只有一行。这就是惰性求值的价值：处理步骤再多、文件再大，内存占用恒定。

验证方式（生成一个测试文件再跑）：

```python
lines = ("OK heartbeat\n" if i % 10 else "ERROR sensor timeout\n" for i in range(1_000_000))
Path("device.log").write_text("".join(lines), encoding="utf-8")
# 跑上面的统计，再打开任务管理器看内存：稳定在一个位数 MB 级
```

## 6. 两个经典陷阱

陷阱一：**生成器是一次性的**。

```python
>>> total = sum(n for n in range(5))
>>> list(n for n in range(5)) if False else None
>>> g = (n for n in range(3))
>>> sum(g)      # 3，g 已耗尽
>>> sum(g)      # 0！不报错，静默返回 0
0
```

耗尽的生成器再遍历直接给空，sum 得 0、list 得空列表——**不报错**，所以这种 bug 常常以「数据莫名少了」的面目出现，排查半天发现是同一个生成器用了两次。要复用，先 `list(g)` 固化，或包一个返回新生成器的函数。

陷阱二：**close 与 GeneratorExit**。生成器可以被提前关闭，关闭时会在暂停点抛出 `GeneratorExit`：

```python
def worker():
    try:
        while True:
            task = yield "ready"
            print(f"处理 {task}")
    finally:
        print("清理资源")     # close 时这里会执行

>>> w = worker()
>>> next(w)
'ready'
>>> w.close()
清理资源
```

这也是生成器函数里 `finally` / with 的价值：无论正常跑完、抛异常还是被 close，清理代码都会执行。反过来的禁忌是**在 finally 里再 yield**——解释器禁止，会抛 RuntimeError。

顺带一提 `throw()`：往暂停点里抛异常，让生成器在「现场」处理错误。它和 send 一样属于双向通信的高级接口，日常代码少见，读框架源码（尤其异步库）时会大量遇到。

## 7. 血缘：从生成器协程到 async / await

现在你知道了两件事：生成器能暂停恢复（yield），能双向收发（send），能嵌套委托并回传结果（yield from + return）。把这三件事合起来，就是一个**可暂停、可调度、可组合**的函数——2001 年 PEP 342 给生成器加上 send 后，社区立刻意识到这就是协程，随后出现基于生成器的异步框架：用 `yield` 表示「我在等 IO，先让别人跑」，事件循环收这些 yield、安排真正的 IO、完成后 send 回结果。

这套模式统治了 Python 异步十年，代价是语义被重载：同一个 yield，有时是「产出数据」，有时是「等待 IO」，读代码全靠猜。于是 3.5（2015）引入 async / await：**专门的语法做专门的事**，底层机制（暂停、恢复、向调度器让位）与生成器协程完全同源。所以——

- 今天写异步一律用 `async def` + `await`（见 [协程与 asyncio](/python/660-CoroutineAsyncio)），生成器协程是历史；
- 但生成器本身毫不过时：**「惰性地生产数据序列」永远是它的主业**，本文第 5 节的流水线就是它的当代岗位；
- 读老代码看到 `@types.coroutine`、`yield from` 出现在异步上下文里，知道那是 3.5 之前的写法即可。

## 8. 什么时候应该 / 不应该

应该：处理大文件、大网络流时逐行（逐块）用生成器串联；一次性聚合（sum / any / max）配生成器表达式；需要「有状态的过滤器」时考虑带 send 的生成器；多级处理拆成多个小生成器函数，各管一段。

不应该：把生成器当列表反复遍历；为了「显得高级」把简单的一次性变换写成 send 协程（多数时候普通函数加参数更清楚）；在新代码里用生成器模拟协程写异步；在 finally 里 yield。

## 9. 与之前和之后的知识的关系

- 往前：[推导式与生成器](/python/170-ComprehensionGenerator) 给了 yield 的基本形态与生成器表达式，本文把「暂停 - 恢复」推到双向通信与委托链；[文件与上下文管理器](/python/300-FileIOContextManager) 的文件对象天然是迭代器，是流水线的标准源头；
- 往后：[上下文管理器](/python/520-ContextManager) 的 with 协议与本文的 finally 清理思想同源；[协程与 asyncio](/python/660-CoroutineAsyncio) 在「可暂停函数」这条线上换乘 async/await，把本文的历史讲成现实；[异步深水区](/python/670-AsyncProgrammingDetailed) 的异步生成器（`async for`）是 yield 与 await 的正式合体。

## 10. 官方文档

- 生成器（语言参考）：https://docs.python.org/zh-cn/3/reference/expressions.html#yieldexpr
- 标准类型文档中的生成器方法（send / throw / close）：https://docs.python.org/zh-cn/3/reference/expressions.html#generator-methods
- PEP 342（send 与协程的起点，读史用）：https://peps.python.org/pep-0342/

## 11. 自我检查

- 能说出 `sys.getsizeof` 对比实验的结论，并解释差距的来源；
- 能默写 send 的起手式（先 next 推进到 yield）并解释为什么需要它；
- 能用 yield from 把三段处理串成一条不落盘、不全读的流水线；
- 能复现「sum 两次得到 0」的坑并给出两种修法；
- 能用三句话向同事讲清 async/await 与生成器的血缘。

## 练习

预测题：

```python
def g():
    yield 1
    return 10

it = g()
print(next(it))
try:
    next(it)
except StopIteration as e:
    print(e.value)
```

先写下输出，再运行验证（提示：return 的值藏在 StopIteration 的 value 属性里）。

修改题：把第 5 节的流水线扩展为「同时统计 ERROR 与 WARN 两条计数」，要求仍只遍历文件一次。提示：计数器用字典，最后一段用普通循环消费 `only_levels(read_lines(log))`。

排错题：下面的代码想把日志里所有 ERROR 行存进列表，结果 errors 永远是空列表。指出两处问题并修复：

```python
lines = read_lines(Path("device.log"))
count = sum(1 for _ in lines)     # 先统计总数
errors = [ln for ln in lines if ln.startswith("ERROR")]
```

挑战题：写一个带 send 的限流器生成器 `throttle(qps: int)`：每 send 进一个事件名，按「每秒最多 qps 个」的规则决定返回 "go" 或 "wait"（用 `time.monotonic()` 记录上次放行时间）。自测：qps=2 时连发 4 个事件，输出应为 go, go, wait, go 或 go, go, wait, wait（取决于时间精度，能自圆其说即可）。

## 本章总结

生成器的本质是「可暂停的函数」：列表全量持有，生成器只持进度，内存差几个数量级；send 打通反向通道，让生成器成为有状态的流式处理器，起手必先 next；yield from 转发子生成器并接住它的 return；多级生成器串成流水线，处理 GB 级文件内存恒定；生成器一次性、耗尽即空、close 触发 finally；这套暂停恢复机制后来长成了 async/await，而生成器自己的主业——惰性数据流——历久弥新。

## 下一步

「暂停与恢复」的下一站是正式的异步世界：进入 [协程与 asyncio](/python/660-CoroutineAsyncio)，看三个网络请求如何从串行 3 秒压到并发 1 秒。
