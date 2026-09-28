---
order: 350
title: 装饰器深水区：机制拆解与工程模式
module: 'python'
category: 后端技术
difficulty: advanced
description: 拆解装饰器的机制与工程模式：带参数装饰器三层结构逐层追踪、叠加顺序推演、类装饰器 __call__、functools.wraps 缺失的真实代价，以及 lru_cache、singledispatch、contextmanager 三个标准库实战。
author: fanquanpp
updated: '2026-09-28'
related:
  - 'python/520-ContextManager'
  - 'python/570-Descriptor'
  - 'python/610-PythonDesignPattern'
prerequisites:
  - 'python/500-Decorator'
---

## 前置知识

- **必读** [装饰器](/python/500-Decorator)。分工声明：500 篇负责建立心智模型（@ 是换绑定的语法糖、wrapper 转发参数、wraps 保元信息、带参数装饰器初见）；本篇是分工的另一半——拆机制、讲工程模式，不重复入门示例，两篇示例互不复用；
- [面向对象](/python/460-OOP)：知道类、实例与方法即可。类装饰器会用到 `__call__`（让实例能像函数一样被调用），正文当场解释。

## 学习目标

读完本文你将能够：

1. 逐层追踪带参数装饰器中「配置、函数、调用参数」各被谁接住，写出等价展开式；
2. 推演 `@a @b` 叠加时的应用顺序与运行顺序，正确预测输出；
3. 用类加 `__call__` 写出带状态的装饰器，说清它与闭包版的取舍；
4. 列出不用 `functools.wraps` 的三项真实代价，并用它修复；
5. 用 `lru_cache`、`singledispatch`、`contextmanager` 三个标准库装饰器解决真实问题。

预计 75 分钟，含 1 组修改实验、2 道预测题与 1 道挑战题。

## 1. 两笔遗留账

接手同事留下的 `decorators.py`，第一屏就卡住：

```python
def audit(action):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            ...
```

500 篇的 timed 只有一层，这个为什么三层？`@audit("下单")` 与 `@timed` 差的那个括号背后发生了什么？这是账一。第二笔账你在 500 篇第 3 节见过症状：没用 wraps 时 `__name__`、`__doc__`、函数签名集体污染——真实代价到底多大？本文逐笔算清，最后再给你三件标准库的现成货。

## 2. 账一：三层嵌套逐层追踪

在每一层加一行 print，让参数去向自己招供：

```python
from functools import wraps

def audit(action):                       # 第一层：吃装饰器参数
    print(f"[1] audit 收到配置 action={action}")
    def decorator(func):                 # 第二层：吃被装饰函数
        print(f"[2] decorator 收到函数 {func.__name__}")
        @wraps(func)
        def wrapper(*args, **kwargs):    # 第三层：吃调用参数
            print(f"[3] wrapper 收到调用参数 {args}")
            return func(*args, **kwargs)
        return wrapper
    return decorator

@audit("下单")
def buy(item):
    return f"{item} 购买成功"

print(buy("限定皮肤"))
```

预期输出：

```text
[1] audit 收到配置 action=下单
[2] decorator 收到函数 buy
[3] wrapper 收到调用参数 ('限定皮肤',)
限定皮肤 购买成功
```

`[1]`、`[2]` 在任何业务调用之前出现——它们发生在 def 语句执行时，因为 `@audit("下单")` 的等价展开是两次连续调用：

```python
buy = audit("下单")(buy)
```

先调用 `audit("下单")`：打印 `[1]`，返回 decorator——这一层是**装饰器工厂**，专职吃配置。再调用 `decorator(buy)`：打印 `[2]`，返回 wrapper——这一层是**真装饰器**，专职吃函数。真正调用 `buy("限定皮肤")` 时跑的是 wrapper，打印 `[3]`——最内层专职吃调用参数。三层各司其职：没有工厂，配置挂在哪？没有 decorator，函数传给谁？没有 wrapper，调用参数谁转发？至于「带不带括号」的两种报错形态，第 8 节实录见分晓。

## 3. 叠加顺序推演：@a @b 到底谁先

装饰器叠加时，**应用自下而上，运行自外而内**。用两层中性的 stamp 推演：

```python
from functools import wraps

def stamp(tag):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            print(f"进入 {tag}")
            result = func(*args, **kwargs)
            print(f"离开 {tag}")
            return result
        return wrapper
    return decorator

@stamp("外层")
@stamp("内层")
def query(word):
    print(f"查询 {word}")

query("python")
```

预期输出：

```text
进入 外层
进入 内层
查询 python
离开 内层
离开 外层
```

推演写开：先应用下面的 `stamp("内层")` 得到第一个 wrapper，再应用上面的 `stamp("外层")` 把它包住，等价展开是：

```python
query = stamp("外层")(stamp("内层")(query))
```

外层 wrapper 包在最外面，所以它的「进入」最先打印、「离开」最后打印，像洋葱一层套一层。每叠一层就是一次完整的函数调用开销——这是「装饰器别叠超过三层」的物理原因。

## 4. 类装饰器：需要状态时换类上场

统计函数被调用了多少次，闭包版要在 wrapper 外面维护计数变量（还得用列表当外壳，090 篇讲过为什么）。状态一多闭包就凌乱，类天生装状态：

```python
import functools

class CountCalls:
    def __init__(self, func):
        functools.update_wrapper(self, func)   # 类版的 @wraps
        self.func = func
        self.count = 0

    def __call__(self, *args, **kwargs):       # 让实例能像函数一样被调用
        self.count += 1
        return self.func(*args, **kwargs)

@CountCalls
def roll_dice(sides=6):
    return f"掷出 {sides} 面骰"

print(roll_dice())
print(roll_dice())
print(roll_dice.count)
print(roll_dice.__name__)
```

预期输出：

```text
掷出 6 面骰
掷出 6 面骰
2
roll_dice
```

关键在 `__call__`：定义了它的实例可以加括号调用。`@CountCalls` 展开是 `roll_dice = CountCalls(roll_dice)`——名字贴到实例上，之后每次 `roll_dice()` 都在调实例的 `__call__`，状态存进 `self.count`，随取随用还能加方法（比如 `reset()`）。`update_wrapper` 是 wraps 的函数形态，把原函数元信息抄到实例上，所以第四行输出仍是 `roll_dice`。取舍：无状态增强用闭包（500 篇写法更短）；多个状态、状态可读可改、要复用配置，用类——两者机制同构，都是「接函数、返回可调用物」。

## 5. 账二：不用 wraps 的真实代价

把 500 篇的代价列全，一段代码验证：

```python
import inspect

def plain(func):
    def wrapper(*args, **kwargs):
        return func(*args, **kwargs)
    return wrapper

@plain
def greet(name, greeting="你好"):
    """问候"""
    return f"{greeting}，{name}"

print(greet.__name__, "|", greet.__doc__)
print(inspect.signature(greet))
```

预期输出：

```text
wrapper | None
(*args, **kwargs)
```

三项代价：`__name__` 污染让日志、监控、序列化工具集体失明；`__doc__` 丢失让 `help(greet)` 读不出文档；签名变成 `(*args, **kwargs)`，IDE 补全与基于签名的文档生成全部失效——调用方本该看到 `(name, greeting='你好')`。叠加两层且都没加 wraps 时，wrapper 里还套着 wrapper，污染加倍。修复照旧是 `@wraps(func)` 一行，修好后签名还原；wraps 还设置 `__wrapped__` 指向最初那个函数，需要绕过包装时用它逃生。纪律：每个 wrapper 头上都必须有 @wraps，没有例外。

## 6. 标准库三件套：别急着手写

手写之前先看标准库，这三件覆盖八成日常需求。

### lru_cache：给纯函数加缓存

递归斐波那契不带缓存时，`fib(30)` 要调用 2692537 次（用一个列表计数器现场数：`calls = [0]`，函数体里 `calls[0] += 1`）。加上缓存：

```python
from functools import lru_cache

@lru_cache(maxsize=None)
def fib(n):
    return n if n < 2 else fib(n - 1) + fib(n - 2)

fib(30)
print(fib.cache_info())
```

预期输出：

```text
CacheInfo(hits=28, misses=31, maxsize=None, currsize=31)
```

只发生 31 次未命中——每个值只真正算一次，其余全是命中。`cache_info()` 随时报命中率；`maxsize` 限制条目数，超出按「最近最少使用」淘汰。注意参数必须可哈希（列表不行，元组可以），因为缓存键就是参数元组。

### singledispatch：按参数类型分派

处理异构消息，与其写一长串 isinstance 分支，不如按类型注册处理函数：

```python
from functools import singledispatch

@singledispatch
def render(value):
    raise TypeError(f"不支持的消息类型: {type(value).__name__}")

@render.register
def _(value: int):
    return f"积分变动: {value} 分"

@render.register
def _(value: str):
    return f"系统公告: {value}"

print(render(100))
print(render("今晚停服维护"))
```

预期输出：

```text
积分变动: 100 分
系统公告: 今晚停服维护
```

`singledispatch` 装饰基础版本，`register` 按第一个参数的类型注解注册变体；没有匹配类型时落到基础版本，这里选择抛 TypeError。这就是 Python 的「函数重载」形态，底层正是一个装饰器加一张注册表。

### contextmanager：把收尾逻辑做成 with

进战斗前自动存档、退出时回滚——「进入、退出」成对的逻辑适合 with。`@contextmanager` 把一个生成器一分为二：yield 之前是进入逻辑，finally 里是退出逻辑：

```python
from contextlib import contextmanager

@contextmanager
def battle_save(slot):
    print(f"[存档] 写入槽位 {slot}")
    try:
        yield
    finally:
        print(f"[回滚] 读取槽位 {slot}")

with battle_save("auto"):
    print("战斗中：血量降到 1")
```

预期输出：

```text
[存档] 写入槽位 auto
战斗中：血量降到 1
[回滚] 读取槽位 auto
```

本文只把它当装饰器实战案例；with 与 `__enter__`/`__exit__` 的完整机制，[上下文管理器](/python/520-ContextManager) 整篇讲。

## 7. 修改实验

基于以上代码，每个先预测再运行：

1. 给 CountCalls 加 `reset()` 方法：调用 roll_dice 两次后归零。思考为什么闭包版改计数变量要绕一层（090 篇的不可变对象换绑），类版直接 `self.count = 0`；
2. `render(3.14)` 现在抛 TypeError——照第 6 节的注册写法补一个 float 处理器，让输出变成 `金币: 3.14`；
3. lru_cache 的 `maxsize` 改成 8 再跑 `fib(30)`，misses 还是 31 吗？对照「最近最少使用淘汰」解释 cache_info 的变化。

## 8. 常见错误与调试实录

装饰器工厂漏掉最外层括号——把工厂本身当成了装饰器：

```python
# deco.py
from functools import wraps

def retry(times):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            return func(*args, **kwargs)
        return wrapper
    return decorator

@retry              # 漏了括号
def fetch():
    return "ok"

fetch()
```

报错（Python 3.12 实录）：

```text
Traceback (most recent call last):
  File "deco.py", line 16, in <module>
    fetch()
    ~~~~~^^
TypeError: retry.<locals>.decorator() missing 1 required positional argument: 'func'
```

读报错三步：崩溃在 `fetch()` 调用行；报错说 `decorator()` 缺参数 func——可 fetch() 没传过参数；名字上移：`@retry` 让 `fetch = retry(fetch)`，retry 的 times 接住的是函数，返回的 decorator 成了 fetch 的新名字，调用 fetch 实际是调用 decorator，它还等着接函数。修复：写成 `@retry(times=3)`，让工厂先吃配置。记法：**@ 后面必须是一个「能接收函数的东西」**。

## 9. 小练习

预测题（10 分钟，先写答案再运行）：

1. 把第 3 节的 `@stamp("外层")` 与 `@stamp("内层")` 交换位置，`query("python")` 的输出顺序变成什么？参考答案（先算再看）：`进入 内层`、`进入 外层`、`查询 python`、`离开 外层`、`离开 内层`——交换后原内层变成最外包装，运行顺序整体反转；
2. `fib(30)` 之后立刻调用 `fib(31)`，cache_info 的 hits 与 misses 各是多少？参考答案：hits=30、misses=32——fib(31) 只需新算自己一次（+1 miss），它用到的 fib(30) 与 fib(29) 都在缓存里（+2 hits）。

挑战题（半小时，不给代码）：写带参数装饰器 `suppress(*exc_types)`：捕获指定类型的异常并返回 None，其它异常原样抛出，并保住原函数元信息。验收：

```python
@suppress(ValueError, TypeError)
def parse(text):
    return int(text)

assert parse("42") == 42
assert parse("坏数据") is None
assert parse.__name__ == "parse"

@suppress(ValueError)
def boom():
    raise RuntimeError("不该被吞")

try:
    boom()
except RuntimeError:
    print("RuntimeError 原样抛出")
```

提示：三层结构，最外层吃异常元组；展开：except 后面可以直接接异常元组 `except exc_types`，捕获后 `return None`。

自检问题：

- 不看正文默画三层结构，标出每层收到的东西，写出 `@audit("下单")` 的等价展开式；
- 为什么类装饰器适合「有状态」的增强？说出两个理由；
- plain 装饰器叠加两层且都没加 wraps，`inspect.signature` 看到什么？`__wrapped__` 指向谁？
- lru_cache 为什么要求参数可哈希？

## 10. 什么时候该用 / 不该用装饰器

该用：标准库优先——lru_cache、singledispatch、contextmanager、dataclass 都是现成装饰器，先找再写；需要跨调用状态或可配置增强用类装饰器；插件注册表（import 时自动收集函数与类）是装饰器的杀手级应用，[设计模式](/python/610-PythonDesignPattern) 展开单例与注册器。不该用：def 时有副作用（注册、路由收集）的装饰器必须写明「import 时发生了什么」；叠加超过三层改用显式函数组合，洋葱太厚没人剥得开。

## 11. 与之前和之后的知识的关系

- 往前：[装饰器](/python/500-Decorator) 的心智模型是本文全部地基——三层嵌套是 500 篇「初见」的机制答案，类装饰器的 `__call__` 是 460/480 篇魔术方法的落地；
- 往后：[上下文管理器](/python/520-ContextManager) 拆 with 的底牌；[dataclass 与 Pydantic](/python/550-DataClassPydantic) 的 @dataclass 是官方「装饰器改写类」范例；[描述符](/python/570-Descriptor) 解释 cached_property 这类装饰器的底层；[协程](/python/660-CoroutineAsyncio) 里的 async 装饰器是同一套思想的重演。

## 官方文档

- functools（wraps、lru_cache、singledispatch）：https://docs.python.org/zh-cn/3/library/functools.html
- contextlib（contextmanager）：https://docs.python.org/zh-cn/3/library/contextlib.html
- PEP 318（装饰器语法）：https://peps.python.org/pep-0318/

## 自我检查

- 能逐层说出带参数装饰器每层的职责，并推演两个叠加装饰器的展开式；
- 能写出带 `__call__` 的类装饰器，说清 update_wrapper 与 @wraps 的关系；
- 能列出不用 wraps 的三项代价，见到「日志全叫 wrapper」「签名变 args/kwargs」知道修哪里；
- 见到 `missing 1 required positional argument: 'func'` 能想到「工厂漏了括号」。

## 本章总结

带参数装饰器是「工厂 + 装饰器 + wrapper」三层结构：`@audit("下单")` 先调用工厂吃配置、再装饰吃函数、wrapper 吃调用参数，等价展开 `buy = audit("下单")(buy)`。叠加装饰器应用自下而上、运行自外而内。需要状态用类装饰器：`__call__` 让实例可调用，update_wrapper 是类版的 wraps。不用 wraps 的三项代价是名字污染、文档丢失、签名失效。标准库三件套——lru_cache 缓存纯函数、singledispatch 按类型分派、contextmanager 生成 with——覆盖八成需求，先找现成再手写。

## 下一步

进入 [上下文管理器](/python/520-ContextManager)：本文的 contextmanager 只露了半张脸，with 语句与 `__enter__`/`__exit__` 的完整机制在那篇揭底。
