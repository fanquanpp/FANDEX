---
order: 230
title: functools 函数式工具箱：partial、reduce、lru_cache 与 wraps
module: 'python'
category: 后端技术
difficulty: beginner
description: 与 itertools、collections 并称标准库三大工具箱的 functools 专篇：partial 固化参数、reduce 聚合报表、lru_cache 接口缓存、wraps 保元信息、singledispatch 按类型分发、cached_property，逐件讲清它消除了哪种重复，练习给记账 CLI 的汇率换算加缓存。
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：Python 标准库 `functools` 模块——「以函数为操作对象」的工具集，与 [迭代器协议与 itertools](/python/170-IteratorProtocolAndItertools)、[collections 专用容器](/python/142-CollectionsSpecializedContainers) 并称标准库三大工具箱（itertools 处理迭代流、collections 处理容器、functools 处理函数本身）。
- **解决什么问题**：很多反复出现的样板不是数据问题而是**函数形态**问题——参数永远固定前几个、同一个昂贵计算被重复调用、装饰器包装后函数名丢了、同一逻辑按类型要写多个版本。functools 把这些「函数层面」的重复做成现成工具。
- **什么时候用到**：给回调预置参数（GUI/框架钩子）、把循环聚合压成一行、给网络请求加缓存、写装饰器库、按入参类型分发处理函数。写命令行工具（[CLI 开发](/python/810-PythonCLI)）与毕业项目（[记账与统计 CLI](/python/975-PythonCapstoneProject)）时会直接用到本文的缓存与 partial。

## 你现在要解决什么问题

计费系统有一个三参数的计价函数，但促销场景下折扣永远是 0.8：

```python
def calc_price(unit_price: float, quantity: int, discount: float) -> float:
    return unit_price * quantity * discount

# 促销组每处调用都要重复写折扣
total_a = calc_price(19.9, 3, 0.8)
total_b = calc_price(299.0, 1, 0.8)
```

「固定一部分参数、生成一个新函数」这个动作，每个团队都会自己发明一遍——套一层 lambda、写一个包装函数。`functools.partial` 就是它的标准版。本篇逐件讲 functools 六个高频工具，每件回答三个问题：它消除哪种重复、不换普通写法会怎样、易错在哪。

## partial：固化参数，生成新函数

`partial(func, *固定参数, **固定关键字参数)` 返回一个「预填了部分参数」的新函数：

```python
from functools import partial

def calc_price(unit_price: float, quantity: int, discount: float) -> float:
    return unit_price * quantity * discount

promo_price = partial(calc_price, discount=0.8)   # 固化折扣
print(promo_price(19.9, 3))    # 47.76 —— 只传剩下的两个参数
print(promo_price(299.0, 1))   # 239.2
```

逐段解释：`discount=0.8` 用关键字固化，调用方仍按原顺序传 `unit_price`、`quantity`。若固化位置参数 `partial(calc_price, 19.9)`，则固化的是第一个参数 `unit_price`，调用时从 `quantity` 传起——**partial 固化的是参数位置，不是名字**。

### 场景一：给框架回调预置上下文

GUI 或定时任务里，回调签名是框架定的，你自己的上下文要多带：

```python
import tkinter as tk
from functools import partial

def on_click(channel: str, event) -> None:
    print(f"切换到频道 {channel}")

root = tk.Tk()
tk.Button(text="交通", command=partial(on_click, "traffic")).pack()
tk.Button(text="音乐", command=partial(on_click, "music")).pack()
```

不换普通写法会怎样：每个按钮写一个 `lambda _, ch="traffic": on_click("traffic")`，或为每个频道定义一个单行函数——重复随按钮数量线性增长，且 lambda 的默认参数写法（`lambda _, ch=ch`）是初学者高频出错点。partial 把「绑定参数」交给标准库。

### 场景二：标准化第三方客户端

```python
from functools import partial
import httpx

# 项目内所有调用都走同一个超时策略
client = httpx.Client(timeout=partial(httpx.Timeout, 5.0, connect=2.0))
get_json = partial(client.get, headers={"Accept": "application/json"})
```

易错点一：partial 不改变被包函数的元信息，`promo_price.__name__` 是 `calc_price`——多数时候这反而是优点（报错栈能找到原函数）。

易错点二：partial 只冻结参数，不冻结「调用时机」。`partial(client.get, url)` 存下的只是「待调用」，不是结果；要结果缓存那是 lru_cache 的活，别混。

## reduce：把序列折叠成一个值

`reduce(二元函数, 序列, 初始值)` 沿序列滚动累积：`reduce(f, [a, b, c], init)` 展开是 `f(f(f(init, a), b), c)`：

```python
from functools import reduce

# 月度报表：把各渠道流水折叠成总额
daily_flows = [3200.5, 1980.0, 4710.25, 220.0]
total = reduce(lambda acc, x: acc + x, daily_flows, 0.0)
print(total)   # 10110.75
```

逐段解释：初始值 `0.0` 不可省——空序列时 `reduce` 没有初始值会抛 `TypeError: reduce() of empty iterable with no initial value`，带上初始值则安全返回 0.0。

### 场景：多层字典取值折叠成一维

reduce 真正的用武之地是「结合律操作」——不是求和（那是 `sum` 的活），而是这类按路径逐层下钻：

```python
from functools import reduce

CONFIG = {"db": {"primary": {"host": "10.0.0.1", "port": 5432}}}

def dig(data: dict, path: str, default=None):
    try:
        return reduce(lambda d, key: d[key], path.split("."), data)
    except (KeyError, TypeError):
        return default

print(dig(CONFIG, "db.primary.host"))    # 10.0.0.1
print(dig(CONFIG, "db.replica.host", "未配置"))
```

换普通写法会怎样：手写 for 循环逐层 `data = data[key]` 也能做，但 reduce 版把「累积变量」藏进了折叠语义，路径不存在时的异常处理只需包一次。与 [迭代器协议与 itertools](/python/170-IteratorProtocolAndItertools) 篇的结论一致：`sum`、`any`、`all` 能覆盖的别用 reduce——求和用 `sum`、求积用 `math.prod`、拼接用 `"".join`，reduce 留给没有现成内置的场景。**可读性优先**：reduce 的两个参数 `acc`、`x` 语义全靠 lambda 参数名撑着，复杂逻辑宁写 for 循环。

## lru_cache：给函数结果上缓存

`@lru_cache(maxsize=n)` 按参数记忆函数返回值：相同参数再次调用直接取缓存。Python 3.9+ 建议用别名 `@cache`（等价于 `lru_cache(maxsize=None)`）：

```python
from functools import lru_cache

@lru_cache(maxsize=256)
def fetch_exchange_rate(base: str, quote: str, date: str) -> float:
    print(f"  [网络请求] {base}/{quote} @{date}")   # 演示用：真实现是 HTTP 调用
    return 0.1538   # 假装是 CNY->USD 汇率

print(fetch_exchange_rate("CNY", "USD", "2026-10-06"))
print(fetch_exchange_rate("CNY", "USD", "2026-10-06"))   # 第二次：无网络请求输出
```

```text
  [网络请求] CNY/USD @2026-10-06
0.1538
0.1538
```

逐段解释：

- 缓存键是**调用参数本身**（可哈希的元组），所以参数必须可哈希——传 list 会抛 `TypeError: unhashable type`；
- `maxsize=256` 用 LRU 策略：满了就淘汰「最久未使用」的条目，`None` 表示不限；
- 内部实现正是 [collections 专用容器](/python/142-CollectionsSpecializedContainers) 提过的 `OrderedDict`（3.7-3.11）或等价结构——你手写 LRU 的那套 move_to_end 逻辑，标准库替你写好了。

呼应 [性能优化](/python/690-PythonPerformance) 篇的纪律：**先测量再缓存**。缓存治「重复的昂贵调用」，不治「算法本身太慢」；对纯查询函数收益最大，对带随机性或依赖时间的函数是 bug 制造机。

### 场景：递归与报表缓存

```python
from functools import lru_cache

@lru_cache(maxsize=None)
def fib(n: int) -> int:
    return n if n < 2 else fib(n - 1) + fib(n - 2)

print(fib(80))   # 234167283484676850 —— 无缓存版要算数月，缓存版瞬间

# 报表函数：同一统计口径在多个视图里被反复调用
@lru_cache(maxsize=64)
def category_summary(user_id: int, month: str) -> dict:
    # 假装这里查了数据库聚合
    return {"food": 1200.0, "transport": 300.0}
```

易错点一：**缓存对可变对象不安全**。若函数返回 list/dict，调用方原地修改会污染缓存里的同一对象：

```python
@lru_cache(maxsize=32)
def get_tags(item_id: int) -> list[str]:
    return ["a", "b"]

tags = get_tags(1)
tags.append("x")            # 污染缓存！
print(get_tags(1))          # ['a', 'b', 'x'] —— 下一个调用者遭殃
```

修法：函数内返回副本 `return list(computed)`，或改返回不可变的 `tuple`。

易错点二：缓存生命周期与进程一致，多进程部署时各进程各存一份；分布式场景要共享缓存得用 Redis（见 [Python 与 Redis](/python/840-PythonRedis)），lru_cache 只管单进程。

易错点三：参数变化频率极低的函数（如按毫秒时间戳取值）会把缓存撑爆——「参数空间小、结果可复用」才是适用前提。

## wraps：让装饰器不丢元信息

用装饰器包函数后，`__name__`、`__doc__`、签名都会变成 wrapper 自己的——调试、日志、序列化文档全都对不上号：

```python
def bad_decorator(fn):
    def wrapper(*args, **kwargs):
        return fn(*args, **kwargs)
    return wrapper

@bad_decorator
def audit_log(action: str) -> str:
    """记录审计日志。"""
    return action

print(audit_log.__name__)   # wrapper —— 名字丢了
print(audit_log.__doc__)    # None     —— 文档丢了
```

`@wraps(fn)` 把原函数的元信息拷回 wrapper：

```python
from functools import wraps

def audit(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        print(f"[audit] 调用 {fn.__name__}")
        return fn(*args, **kwargs)
    return wrapper

@audit
def audit_log(action: str) -> str:
    """记录审计日志。"""
    return action

print(audit_log.__name__)   # audit_log
print(audit_log.__doc__)    # 记录审计日志。
```

逐段解释：`@wraps(fn)` 本身是个装饰器工厂，它把 `__name__`、`__doc__`、`__module__`、`__wrapped__` 等属性从 `fn` 抄到 `wrapper` 上；`__wrapped__` 额外指向原函数，`inspect.signature` 会顺着它还原真实签名。

为什么必须这样写：不写 wraps 的装饰器在大型工程里是隐形炸弹——日志里函数名全是 `wrapper`、API 文档生成器丢参数签名、依赖 `__name__` 做路由分发的框架直接错乱。呼应 [装饰器](/python/500-Decorator) 与 [装饰器深水区](/python/510-DecoratorAdvanced)：**工程装饰器的第一行永远是 `@wraps(fn)`**。

## singledispatch：按类型分发的函数重载

Python 没有 Java 那种方法重载，同一逻辑要按入参类型走不同分支时，常见写法是函数里堆 isinstance 判断。`@singledispatch` 把分派表外置成注册制：

```python
from functools import singledispatch

@singledispatch
def export(obj) -> str:
    raise NotImplementedError(f"不支持导出 {type(obj).__name__}")

@export.register
def _(obj: dict) -> str:
    return "\n".join(f"{k}={v}" for k, v in obj.items())

@export.register
def _(obj: list) -> str:
    return ";".join(map(str, obj))

@export.register(str)
def _(obj: str) -> str:
    return obj.upper()

print(export({"name": "mia", "role": "admin"}))   # name=mia\nrole=admin
print(export([1, 2, 3]))                          # 1;2;3
print(export("report"))                           # REPORT
```

逐段解释：

- 第一个 `@singledispatch` 注册的是**默认实现**（所有未注册类型走这里）；
- 后续用类型注解（`def _(obj: dict)`）或显式传参（`@export.register(str)`）注册各类型的实现；函数名都用 `_`，因为统一入口是 `export`；
- 分派按**第一个位置参数**的类型进行（这是 singledispatch 的分派依据），且按继承链找最近注册的父类。

换普通写法会怎样：if-elif isinstance 链每加一种类型要改函数体，违反开闭原则；singledispatch 每种类型独立注册，可分散在各自模块（配合 3.12+ 的 PEP 695 泛型与 `functools.singledispatchmethod` 还能用于类方法）。适合「同名字操作、多种输入形态」的库代码；类型只有两三种的小函数，isinstance 直写更简单——工具服务于结构，不为炫技。

## cached_property：结果算一次，存进实例

`@cached_property` 把方法变成「首次访问即计算并缓存到实例属性」：

```python
from functools import cached_property

class Ledger:
    def __init__(self, entries: list[tuple[str, float]]):
        self.entries = entries

    @cached_property
    def total(self) -> float:
        print("  [计算一次]")
        return sum(amount for _, amount in self.entries)

ledger = Ledger([("food", 30.0), ("book", 99.0), ("taxi", 18.5)])
print(ledger.total)   # [计算一次] 147.5
print(ledger.total)   # 147.5 —— 不再输出 [计算一次]
```

逐段解释：首次访问 `ledger.total` 时执行方法体并把结果写进实例 `__dict__`，之后访问命中实例属性，方法不再执行。与 `@property` 的区别就在这一步——`@property` 每次访问都重算。

易错点一：实例属性被缓存后，**改 entries 不会刷新 total**。数据会变的属性不能 cached——这是「不可变快照」语义，不是「自动同步」语义。

易错点二：类里定义了 `__slots__` 的类不能用（没有实例 `__dict__` 可存）；并发场景下首次并发访问可能重复计算（无锁），幂等计算无妨，非幂等的要用锁。

易错点三：self 被实例引用链持有，cached_property 的缓存随实例生灭——「缓存与实例同寿命」正是它与 lru_cache（缓存与进程/函数同寿命）的分工边界。

## 六件工具的分工速查

| 工具 | 一句话 | 消除的重复 | 对应替代的朴素写法 |
| --- | --- | --- | --- |
| `partial` | 固化参数生成新函数 | 每处重复传固定参数 | 包装 lambda/单行函数 |
| `reduce` | 序列折叠成一个值 | 手写累积循环 | for + 累积变量 |
| `lru_cache` | 按参数缓存结果 | 手写 memo 字典 | dict 判存在再算 |
| `wraps` | 装饰器保元信息 | 手抄 `__name__` 等属性 | 裸 wrapper（元信息丢失） |
| `singledispatch` | 按类型注册分发 | isinstance 分支链 | if-elif isinstance |
| `cached_property` | 实例级惰性缓存 | 手写「算过没」标志位 | property + 私有属性 |

## 动手实践

练习一（预测题）：不运行代码，判断输出——

```python
from functools import partial

def f(a, b, c):
    return (a, b, c)

g = partial(f, 1, c=3)
print(g(2))
```

提示：partial 固化的位置参数与关键字参数各占哪一端，剩下的参数从哪补。

<details>
<summary>参考实现</summary>

```text
(1, 2, 3)
```

`partial(f, 1, c=3)` 固化了位置参数 `a=1` 与关键字参数 `c=3`；调用 `g(2)` 时 `2` 补进剩余的位置参数 `b`。若调用 `g(2, 2)` 则报 `TypeError: f() got multiple values for argument 'b'`——位置槽已被占满。
</details>

练习二（修改题）：给毕业项目记账 CLI 的汇率换算加缓存。已知 `get_rate(base: str, quote: str) -> float` 会发 HTTP 请求（真实现见 975 篇里程碑三），一天内汇率基本不变，但 CLI 每次查询都重新请求。要求：加缓存并说明你选 `lru_cache` 还是 `cached_property`、为什么；再处理「参数是用户输入、可能带空格与大小写差异」的问题。

提示：`"USD "` 和 `"usd"` 会被当成两个不同的缓存键——先规范化参数（`.strip().upper()`）再当键；缓存键规范化可以包一层普通函数，也可以在 cached 函数内部先规范化再调内层 cached 函数。

<details>
<summary>参考实现</summary>

```python
from functools import lru_cache

def get_rate_raw(base: str, quote: str) -> float:
    print(f"  [网络请求] {base}->{quote}")
    return 0.1538

@lru_cache(maxsize=128)
def _rate_cached(base: str, quote: str) -> float:
    return get_rate_raw(base, quote)

def get_rate(base: str, quote: str) -> float:
    """规范化后走缓存；规范化本身不缓存，避免垃圾键占坑。"""
    return _rate_cached(base.strip().upper(), quote.strip().upper())

print(get_rate(" cny ", "usd"))
print(get_rate("CNY", "USD"))    # 命中同一缓存，无第二次网络请求
```

选 `lru_cache` 而非 `cached_property`：汇率换算以「货币对」为键，是**模块级函数**，缓存应与进程同寿命且带容量上限（用户可能查很多货币对，LRU 淘汰冷门键）；`cached_property` 依赖实例，只适合「一个实例内算一次」的场景。外层包一层规范化函数，保证缓存键永远干净。
</details>

练习三（实战题）：用 `reduce` 写 `flatten_dict(d, prefix="")`，把嵌套字典压平成单层——`{"db": {"host": "a", "port": 1}}` 得 `{"db.host": "a", "db.port": 1}`。要求：初始值参数必须显式给出（想想空字典输入时会发生什么）。

提示：reduce 的累积对象是「已压平的字典」，每一步合并一层；`{**acc, **new}` 是字典合并。

<details>
<summary>参考实现</summary>

```python
from functools import reduce

def flatten_dict(d: dict, prefix: str = "") -> dict:
    def step(acc: dict, item: tuple) -> dict:
        key, value = item
        full_key = f"{prefix}{key}" if not prefix else f"{prefix}.{key}"
        if isinstance(value, dict) and value:
            return {**acc, **flatten_dict(value, full_key)}
        return {**acc, full_key: value}
    return reduce(step, d.items(), {})

assert flatten_dict({"db": {"host": "a", "port": 1}}) == {"db.host": "a", "db.port": 1}
assert flatten_dict({}) == {}
```

初始值 `{}` 显式给出：`reduce(step, d.items(), {})` 在输入为空字典时安全返回 `{}`；省掉初始值会抛 `TypeError: reduce() of empty iterable with no initial value`。递归复用了同一函数，前缀逐层拼接。
</details>

练习四（实战题）：写一个 `format_value` 的 singledispatch 版本，按类型导出报表单元格：`float` 保留两位小数、`int` 原样、`None` 显示 `"-"`、`str` 去首尾空白，默认类型抛 `ValueError`。要求包含默认实现并写断言测试四种类型。

提示：默认实现别 raise NotImplementedError——业务上「未知类型」是数据错误，抛 ValueError 信息更友好；注册 None 类型用 `@fmt.register(type(None))`（None 没有类型注解可用）。

<details>
<summary>参考实现</summary>

```python
from functools import singledispatch

@singledispatch
def format_value(obj) -> str:
    raise ValueError(f"不支持导出类型: {type(obj).__name__}")

@format_value.register
def _(obj: float) -> str:
    return f"{obj:.2f}"

@format_value.register
def _(obj: int) -> str:
    return str(obj)

@format_value.register(type(None))
def _(obj) -> str:
    return "-"

@format_value.register
def _(obj: str) -> str:
    return obj.strip()

assert format_value(3.14159) == "3.14"
assert format_value(7) == "7"
assert format_value(None) == "-"
assert format_value("  mia  ") == "mia"
try:
    format_value([1])
except ValueError:
    print("默认分支 OK")
```

注意 int 是 bool 的父类——`format_value(True)` 会走 float 分支（bool 是 int 子类，按继承链最近注册匹配），导出布尔列时需额外注册 `bool`。
</details>

练习五（找错题）：下面这段想给查询函数加缓存，有两处问题，先找再修：

```python
from functools import lru_cache

@lru_cache(maxsize=16)
def search_users(role: str, tags: list[str]) -> list:
    rows = query_db(role, tags)      # 假装的数据库查询
    return rows

def query_db(role, tags):
    return [{"name": "mia", "role": role, "tags": tags}]
```

<details>
<summary>参考实现</summary>

```python
@lru_cache(maxsize=16)
def search_users(role: str, tags: tuple[str, ...]) -> tuple:
    rows = query_db(role, tags)
    return tuple(rows)

def query_db(role, tags):
    return ({"name": "mia", "role": role, "tags": list(tags)},)
```

两处问题：`tags: list[str]` 不可哈希，第一次调用就抛 `TypeError: unhashable type: 'list'`——缓存键要求全部参数可哈希，改用 `tuple`；返回值是可变的 list 且直接返回缓存内对象，调用方 `result.append(x)` 会污染缓存，返回 `tuple`（或在函数内 `return list(rows)` 每次给副本）。
</details>

## 常见坑点速记

- partial 固化的是参数位置；位置固化满槽后再传重复参数报 TypeError；
- reduce 不带初始值遇空序列抛 TypeError——初始值永远显式写；
- lru_cache 的参数必须可哈希，返回可变对象会缓存污染——返回 tuple 或副本；
- lru_cache 治「重复调用」不治「算法慢」，带随机性/时间依赖的函数不能缓存；
- 装饰器不写 `@wraps` 丢元信息，日志与文档全乱——工程装饰器第一行永远是 wraps；
- cached_property 是「首次快照」，底层数据变化不会自动刷新，也不兼容 `__slots__`。

## 与之前和之后的知识的关系

- 往前：装饰器语法（[装饰器](/python/500-Decorator)）是 lru_cache/wraps/cached_property 的使用前提；序列与字典操作（[内置数据结构](/python/140-BuiltinDataStructure)）是 partial/reduce 的操作对象；
- 并行：itertools（[迭代器协议与 itertools](/python/170-IteratorProtocolAndItertools)）管迭代流，functools 管函数，两者常在同一数据流水线里搭配；
- 往后：性能视角的缓存纪律见 [性能优化](/python/690-PythonPerformance)；毕业项目（[记账与统计 CLI](/python/975-PythonCapstoneProject)）里程碑三的汇率换算与报表聚合直接复用本文练习二与 lru_cache 一节。

## 官方文档

- functools 模块参考：https://docs.python.org/zh-cn/3/library/functools.html
- lru_cache 的缓存策略与线程安全说明见同页对应小节。

## 自我检查

- 能用一句话说出 partial 与 lambda 包装的差别，并演示「位置固化满槽」的报错；
- 能解释 reduce 为什么必须带初始值，以及哪些场景不该用 reduce（有内置等价物时）；
- 能列出 lru_cache 的三个前提（参数可哈希、结果可复用、参数空间有限）与返回可变对象的风险；
- 能说出 wraps 不写时丢失哪些信息、丢失后下游哪些组件会出错；
- 能区分 cached_property（与实例同寿命）与 lru_cache（与进程/函数同寿命）的缓存边界。
