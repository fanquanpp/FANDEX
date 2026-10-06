---
order: 160
title: collections 专用容器：defaultdict、Counter、deque、OrderedDict 与 namedtuple
module: 'python'
category: 后端技术
difficulty: beginner
description: 从「为什么普通 dict 和 list 不够用」切入，按分桶统计、排行榜计数、任务队列限流三个工程场景逐一展开 collections 四件套与 namedtuple，逐段对比它们与内置容器的行为差异。
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：Python 标准库 `collections` 模块提供的专用容器数据结构，属于「内置数据结构」的延伸篇（前置：[内置数据结构](/python/140-BuiltinDataStructure)）。
- **解决什么问题**：普通 `dict` 与 `list` 是通用容器，遇到「给不存在的键累加」「统计出现次数排行」「两端进出队」这类高频模式时，每次都要手写防御逻辑——先判断键在不在、先判空再操作。`collections` 把这些模式做成了现成容器，行为差异由数据结构本身兜底。
- **什么时候用到**：日志分桶归类、词频/事件计数排行、限流队列与任务调度、给坐标或配置行起字段名。写爬虫数据聚合（[爬虫数据清洗](/python/960-WebScrapingWithPython)）、性能巡检报表（[性能分析与优化](/python/690-PythonPerformance)）时几乎天天碰。

## 你现在要解决什么问题

三个真实现场，普通 dict/list 写起来都别扭：

现场一，服务器告警日志按级别归档。用普通 `dict` 写分桶：

```python
buckets = {}
for line in alarm_lines:
    level = parse_level(line)
    if level not in buckets:        # 每一行都要先问一句"键在吗"
        buckets[level] = []
    buckets[level].append(line)
```

`if level not in buckets` 这两行在每个分桶场景都要重写一遍，漏写就是 `KeyError`。

现场二，接口调用排行榜。手写计数：

```python
counts = {}
for endpoint in request_log:
    counts[endpoint] = counts.get(endpoint, 0) + 1
top3 = sorted(counts.items(), key=lambda kv: kv[1], reverse=True)[:3]
```

能跑，但「计数 + 取前 N 名」两件事被摊在四行代码里。

现场三，API 限流队列。用普通 `list` 做「只保留最近 N 秒的请求时间戳」：

```python
window = []
window.append(now)          # 尾部进，O(1)
window.pop(0)               # 头部出，O(n) —— 整个列表搬家
```

`list.pop(0)` 是 O(n)：弹一个元素，后面所有元素整体前移。队列场景这是隐形性能杀手。

`collections` 模块就是为这三类现场准备的专用工具。下面逐个拆。

## defaultdict：分桶统计，键不存在时自动造

### 行为差异在哪一行

`defaultdict(list)` 与普通 `dict` 唯一的行为差异：**用方括号访问一个不存在的键时，它先调用你给的工厂函数造一个默认值放进去，再返回它**，而不是抛 `KeyError`：

```python
from collections import defaultdict

buckets = defaultdict(list)
buckets["CRITICAL"].append("disk 96%")   # 键不存在 -> 先执行 list() 造出 []，再 append
buckets["CRITICAL"].append("cpu 91%")
buckets["WARN"].append("resp time 2.1s")
print(buckets)
```

```text
defaultdict(<class 'list'>, {'CRITICAL': ['disk 96%', 'cpu 91%'], 'WARN': ['resp time 2.1s']})
```

对照现场一，两行 `if` 判断消失了。为什么这样写：分桶操作的完整语义是「没有桶就建桶，有桶就放进去」，`defaultdict(list)` 把这个语义收进了容器本身。

### 换成普通写法会发生什么

用普通 `dict` 等价改写：

```python
buckets = {}
buckets.setdefault("CRITICAL", []).append("disk 96%")   # 写法一：setdefault
if "WARN" not in buckets:                                # 写法二：先判后用
    buckets["WARN"] = []
buckets["WARN"].append("resp time 2.1s")
```

写法一能一行解决，但每次访问都要先构造一个空列表参数（哪怕键已存在，`[]` 也白白创建）；写法二就是现场一的原始版本，两行样板。更重要的是**风险差异**：`defaultdict` 把「键不存在」从异常变成了正常路径，你不会在半夜被 `KeyError: 'WARN'` 叫起来。

易错点一：工厂函数别带括号。`defaultdict(list)` 传的是函数本身，`defaultdict(list())` 传的是一个已创建的空列表——所有缺失键会共享同一个列表，数据全部串桶，且不报错。这是静默 bug，只能靠测试抓住。

易错点二：`defaultdict` 的「自动造键」只在方括号访问时触发，`d.get("x")` 与 `"x" in d` 不会造键。读代码时要意识到 `print(buckets)` 之前，被访问过的键已经真实写入了。

### 工厂不止 list

任何零参数可调用对象都能当工厂，选哪个取决于值语义：

```python
from collections import defaultdict

# int -> 0：计数
hits = defaultdict(int)
for path in ["/a", "/b", "/a"]:
    hits[path] += 1
print(dict(hits))                       # {'/a': 2, '/b': 1}

# set -> 空集合：去重归组
tags = defaultdict(set)
tags["user1"].add("python")
tags["user1"].add("python")             # 重复添加自动去重
print(dict(tags))                       # {'user1': {'python'}}

# 自定义工厂：给默认对象
from dataclasses import dataclass, field

@dataclass
class Account:
    balance: int = 0
    history: list[str] = field(default_factory=list)

ledger = defaultdict(Account)
ledger["mia"].balance += 100
print(ledger["mia"])                    # Account(balance=100, history=[])
```

注意 `int` 工厂版计数器其实就是 `Counter` 的朴素前身——下一节的 `Counter` 在它之上又加了统计与排名的专用方法。

### 什么时候不要用 defaultdict

需要「严格模式」的场合不要用：比如解析配置文件时，缺键应当立刻报错暴露配置问题，此时 `defaultdict` 会用默认值悄悄兜底，把错误推迟到更难查的地方。工具的默认行为要匹配业务语义，而不是无脑替换。

## Counter：计数与排行榜一步到位

### 基础行为

`Counter` 是 `dict` 的计数子类：构造时直接吞一个可迭代对象，统计每个元素出现次数；访问不存在的键返回 0 而不报错：

```python
from collections import Counter

c = Counter(["get", "post", "get", "delete", "get", "post"])
print(c)                 # Counter({'get': 3, 'post': 2, 'delete': 1})
print(c["put"])          # 0 —— 不存在的键不抛 KeyError
print(c["get"])          # 3
```

对照现场二：`Counter(日志列表)` 一行替代了 `counts.get(endpoint, 0) + 1` 那个循环。手写 `get + 1` 之所以容易出错，是因为「读默认值」和「写回」是两次操作，并发或中途跳出的场景会漏；`Counter` 把计数语义整体收进容器。

### most_common：排行榜是内建的

现场二的取前三名也不用手写排序——`most_common(n)` 直接给出按次数降序的前 n 项：

```python
from collections import Counter

words = "the quick brown fox jumps over the lazy dog the fox".split()
c = Counter(words)
print(c.most_common(3))
```

```text
[('the', 3), ('fox', 2), ('dog', 1)]
```

并列时保持首次出现的先后顺序（Python 3.7+），所以结果是可复现的——写单元测试断言排行结果时依赖这一点。

### 三个工程场景

场景一，文本词频统计（数据分析最常见的第一步）：

```python
from collections import Counter

def word_freq(text: str, top: int = 10) -> list[tuple[str, int]]:
    words = [w.strip(".,!?").lower() for w in text.split()]
    return Counter(w for w in words if w).most_common(top)
```

场景二，接口巡检报表：从访问日志按状态码统计，异常比例一眼可见：

```python
from collections import Counter

def status_report(codes: list[int]) -> str:
    c = Counter(codes)
    total = sum(c.values())
    err = c[500] + c[502] + c[503]
    return f"total={total} 5xx={err} ({err / total:.1%}) top={c.most_common(3)}"
```

场景三，库存核对：Counter 相减直接得到差额，正数是待补货、负数是盘盈：

```python
from collections import Counter

stock = Counter({"sku-1": 12, "sku-2": 3})
sold = Counter({"sku-1": 5, "sku-2": 8, "sku-3": 2})
print(stock - sold)      # Counter({'sku-1': 7, 'sku-2': -5, 'sku-3': -2})
```

易错点：`Counter` 的算术运算（`+` `-` `&` `|`）会**丢弃零与负计数**（`-` 保留负数是减法特例，`+` 与 `&`、`|` 都只保留正值），别把运算结果当成完整库存表；需要保留全部键就用普通字典推导。

## deque：两端进出都 O(1) 的队列

### 为什么 list 不行

`list` 底层是连续数组：尾部 `append`/`pop` 是 O(1)，**头部** `insert(0, x)` 与 `pop(0)` 要搬动后面全部元素，O(n)。队列、滑动窗口、限流器这类「两端都动」的场景，`list` 会随数据量变大线性变慢，而且不报任何错——只是越来越慢。

`deque`（double-ended queue，读作 deck）底层是双向链表块，两端增删都是 O(1)：

```python
from collections import deque

dq = deque([1, 2, 3])
dq.append(4)          # 右端进
dq.appendleft(0)      # 左端进
print(dq)             # deque([0, 1, 2, 3, 4])
print(dq.pop())       # 4   右端出
print(dq.popleft())   # 0   左端出
print(dq)             # deque([1, 2, 3])
```

对照现场三，限流窗口不再有「头部弹出搬家」的开销。

### 场景一：任务队列限流

令牌桶式限流的简化版：只保留时间窗口内的请求时间戳，队列长度超过阈值就拒绝：

```python
import time
from collections import deque

class RateLimiter:
    def __init__(self, max_requests: int, window_seconds: float):
        self.max = max_requests
        self.window = window_seconds
        self.hits: deque[float] = deque()

    def allow(self) -> bool:
        now = time.monotonic()
        while self.hits and now - self.hits[0] > self.window:
            self.hits.popleft()      # 从头部丢掉窗口外的旧记录，O(1)
        if len(self.hits) >= self.max:
            return False
        self.hits.append(now)        # 尾部记录本次请求，O(1)
        return True
```

为什么用 `time.monotonic()` 而不是 `time.time()`：前者单调递增，不受系统对时影响，算时间差不会倒流。

### 场景二：maxlen 滑动窗口

构造时给 `maxlen`，队列满后再 append 会自动从另一端挤出旧元素——「保留最近 N 条」一行都不用写：

```python
from collections import deque

last_errors: deque[str] = deque(maxlen=100)   # 只留最近 100 条错误
for line in error_stream:
    last_errors.append(line)
print(list(last_errors)[-3:])                 # 最近三条
```

易错点：`maxlen` 版 `deque` 不能在满时再 `appendleft`——会抛 `IndexError`（右端自动挤出的语义只对 append 方向成立，另一端是溢出方向）。同理，指定 `maxlen` 后就不能再手动 insert。

### 场景三：广度优先搜索的工作队列

算法场景里 `deque` 是 BFS 的标配（FIFO 队列）：

```python
from collections import deque

def bfs_shortest(graph: dict[str, list[str]], start: str, goal: str) -> int | None:
    queue = deque([(start, 0)])
    seen = {start}
    while queue:
        node, dist = queue.popleft()      # 先进先出，保证按层扩展
        if node == goal:
            return dist
        for nxt in graph[node]:
            if nxt not in seen:
                seen.add(nxt)
                queue.append(nxt)
    return None
```

换成 `list.pop(0)` 结果相同，但每个节点出队都是 O(n)，图一大就退化。这就是「数据结构决定算法复杂度」的具体样子。

### 线程安全这一点

`deque` 的 `append` 与 `popleft` 是原子操作，可以在多线程里当无锁队列用（[多线程与多进程](/python/630-MultiprocessingMultithreading) 篇的生产者消费者小场景直接可用）。但要「判断非空再取」这种复合操作仍需锁，原子性不覆盖组合动作。

## OrderedDict：还需要它吗

Python 3.7 起，普通 `dict` 就保证插入顺序，`OrderedDict` 的「有序」卖点没了。它剩下的价值是三个普通 `dict` 没有的行为：

```python
from collections import OrderedDict

od = OrderedDict(banana=3, apple=2, cherry=5)
od.move_to_end("banana")            # 把指定键移到末尾（last=False 则移到开头）
print(list(od.keys()))              # ['apple', 'cherry', 'banana']

# 相等比较区分顺序：[1] 写法的顺序不同即不相等
a = OrderedDict(x=1, y=2)
b = OrderedDict(y=2, x=1)
print(a == b)                       # False；普通 dict 会是 True（只比内容）

# popitem(last=False)：从头弹出（普通 dict 的 popitem 只能弹最后一个）
first = od.popitem(last=False)
print(first)                        # ('apple', 2)
```

逐条对应什么场景：

- `move_to_end`：LRU 缓存的最小实现——命中就把键移到末尾，超容量从头淘汰。配合 3.8 的 `functools.lru_cache`（见 [functools 工具箱](/python/175-PythonFunctoolsToolkit)）可以理解成「现成的 LRU」。
- 顺序敏感的相等比较：解析器比对两份带序配置是否「完全一致」时有用。
- `popitem(last=False)`：FIFO 淘汰。

一般业务代码用普通 `dict` 即可；上面三个行为出现时再请出 `OrderedDict`。

## namedtuple：给元组里的位置起名字

普通元组 `(121.5, 31.2)` 读代码的人不知道谁是经度谁是纬度，`namedtuple` 用一行给字段命名，同时保持元组的不可变与低开销：

```python
from collections import namedtuple

Point = namedtuple("Point", ["x", "y"])
p = Point(3, 4)
print(p.x, p.y)          # 用名字访问
print(p[0], p[1])        # 仍然是元组，位置访问也行
x, y = p                 # 解包也兼容
```

三个典型场景：

```python
from collections import namedtuple

# 场景一：函数返回多值且有名字可读
Reading = namedtuple("Reading", ["sensor", "value", "ts"])
def parse(line: str) -> Reading:
    sensor, value, ts = line.split(",")
    return Reading(sensor, float(value), ts)

r = parse("bedroom-01,23.5,1717689600")
if r.value > 30.0:
    print(f"{r.sensor} 超温：{r.value}")

# 场景二：CSV 行的可读解析
Row = namedtuple("Row", "level module message")
with open("alarm.log", encoding="utf-8") as f:
    for line in f:
        level, module, message = line.rstrip("\n").split("|", 2)
        record = Row(level, module, message)
        print(record.level, record.module)

# 场景三：数据库行转轻量对象（无 ORM 时的中间态）
User = namedtuple("User", "id name role")
rows = [(1, "mia", "admin"), (2, "ken", "staff")]
users = [User(*row) for row in rows]
```

易错点一：`namedtuple` 的第一个参数是**类型名**，与左边的变量名没有自动联系，两者不一致不会报错但会让 repr 混乱，习惯上写成同一个名字。

易错点二：字段名不能与 Python 关键字冲突、不能重复；构造参数比字段多或少都会 `TypeError`。

易错点三：它仍是元组——不可变。需要可写的记录请用 `dataclass`（见 [DataClass 与 Pydantic](/python/550-DataClassPydantic)）；需要类型检查器严格校验字段类型时同样选 `dataclass`，`namedtuple` 的字段没有类型标注能力（`typing.NamedTuple` 才有）。

## 选型速查：四件套与普通容器

| 需求模式 | 用什么 | 换成普通容器的问题 |
| --- | --- | --- |
| 缺键先造默认容器再操作 | `defaultdict(list/int/set)` | 每处都写 `if key not in d` 或 `setdefault`，漏写 `KeyError` |
| 计数 + 取 Top N | `Counter` + `most_common` | 手写循环计数 + 手写排序，四行换一行 |
| 两端进出、滑动窗口 | `deque(maxlen=...)` | `list.pop(0)`/`insert(0)` O(n)，数据大后线性变慢 |
| 顺序敏感比较、LRU、头部弹出 | `OrderedDict` | 普通 dict 无这些行为 |
| 有名字的不可变记录 | `namedtuple` | 裸元组靠位置读，可读性差 |

## 动手实践

练习一（预测题）：不运行代码，写出输出——

```python
from collections import defaultdict
d = defaultdict(int)
d["a"] += 1
print(d["b"], d)
```

提示：回想「自动造键发生在哪一步」，`print` 之前发生过几次键访问。

<details>
<summary>参考实现</summary>

```text
0 defaultdict(<class 'int'>, {'a': 1, 'b': 0})
```

`d["b"]` 访问时触发了自动造键：先 `int()` 得 0 放进字典再返回。所以第二次访问 `b` 已经真实存在于字典里，print 出来的 d 含 `'b': 0`。这就是 defaultdict 与普通 dict 最容易踩的行为差异。
</details>

练习二（修改题）：把[内置数据结构](/python/140-BuiltinDataStructure)篇里手写的「成绩单按班级分桶」改写成 `defaultdict` 版，再用 `Counter` 统计每个班级的人数排行，一行取出人数最多的班级。

提示：分桶用 `defaultdict(list)`，人数排行是「对桶的长度计数」——`Counter({k: len(v) for k, v in buckets.items()})` 也行，但更直接的是把班级名列表直接喂给 `Counter`。

<details>
<summary>参考实现</summary>

```python
from collections import defaultdict, Counter

score_lines = [
    ("class-1", 88), ("class-2", 72), ("class-1", 95),
    ("class-3", 61), ("class-2", 83), ("class-1", 79),
]

buckets = defaultdict(list)
for cls, score in score_lines:
    buckets[cls].append(score)

top_class = Counter({cls: len(rows) for cls, rows in buckets.items()}).most_common(1)
print(buckets)
print(top_class)     # [('class-1', 3)]
```

与 Java 篇「成绩五档分档」一题对照：分档逻辑（90/80/70/60 分界）在 [结构模式匹配](/python/144-StructuralPatternMatching) 里会改写成 match 版，这里先只做分桶。
</details>

练习三（实战题）：给接口网关写 `SlidingWindowRateLimiter`：`allow(client_id)` 按客户端分别限流，每客户端每 60 秒最多 10 次。要求用 `defaultdict` 管理每个客户端的 `deque`，并写三行测试证明第 11 次被拒绝。

提示：`defaultdict(lambda: deque(maxlen=10))` 组合两个工具；`maxlen` 在这里只当容量上限不够——时间窗口还是要手动清，想清楚两者区别。

<details>
<summary>参考实现</summary>

```python
import time
from collections import defaultdict, deque

class SlidingWindowRateLimiter:
    def __init__(self, max_requests: int = 10, window: float = 60.0):
        self.max = max_requests
        self.window = window
        self.hits = defaultdict(deque)

    def allow(self, client_id: str) -> bool:
        now = time.monotonic()
        dq = self.hits[client_id]
        while dq and now - dq[0] > self.window:
            dq.popleft()
        if len(dq) >= self.max:
            return False
        dq.append(now)
        return True

limiter = SlidingWindowRateLimiter()
print(all(limiter.allow("cli-1") for _ in range(10)))   # True True ... 第 10 次仍是 True
print(limiter.allow("cli-1"))                            # False
```

`maxlen=10` 能顶替 `len(dq) >= self.max` 的判断（满后 append 自动挤头部），但挤出的旧时间戳会让「限流窗口」退化成「最近 10 次请求」语义——两者在时间跨度不定时不等价，限流必须按时间清，所以参考实现不用 maxlen。
</details>

练习四（找错题）：下面的代码想统计日志里每个模块的错误数并打印前三名，有两处问题，先找出来再修：

```python
from collections import Counter

errors = Counter()
for line in log_lines:
    module = line.split("|")[1]
    errors(module) += 1
print(errors.most_common)
```

<details>
<summary>参考实现</summary>

```python
print(errors.most_common(3))
```

两处错误：`errors(module)` 把 Counter 当函数调用，应为下标赋值 `errors[module] += 1`（Counter 不是 callable，会抛 `TypeError: 'Counter' object is not callable`）；`most_common` 是方法，漏了调用括号会打印方法对象本身而不是排行结果。
</details>

## 常见坑点速记

- `defaultdict(list())` 带括号：所有缺失键共享同一个列表，静默串桶；
- `Counter` 的 `+`/`&`/`|` 丢弃非正计数，算术结果别当全量数据用；
- `deque(maxlen=...)` 满后 `appendleft` 抛 `IndexError`；限流按时间清窗口，别拿 maxlen 冒充时间窗口；
- `namedtuple` 第一参数是类型名字符串，与变量名不一致不报错但 repr 混乱；
- 四件套都不会让代码更快地「变对」，只会让正确的模式更难写错——语义选择仍是人的责任。

## 与之前和之后的知识的关系

- 往前：四件套都建立在[内置数据结构](/python/140-BuiltinDataStructure)篇的 dict/list 语义之上，`defaultdict` 与 `Counter` 是 `dict` 的子类，`deque` 是独立结构；
- 并行：[迭代器协议与 itertools](/python/170-IteratorProtocolAndItertools) 的 `groupby`/`islice` 与 `deque`、`Counter` 常组合出现在日志处理流水线里；
- 往后：[functools 工具箱](/python/175-PythonFunctoolsToolkit) 的 `lru_cache` 是 `OrderedDict` LRU 用法的现成替代；[性能分析与优化](/python/690-PythonPerformance) 里「选对数据结构」一节会从复杂度角度复盘本章的 O(1) 与 O(n) 差异。

## 官方文档

- collections 容器数据类型：https://docs.python.org/zh-cn/3/library/collections.html
- deque 的复杂度说明与线程安全注释见同页 `deque` 小节。

## 自我检查

- 能用一句话说清 `defaultdict` 与普通 `dict` 的唯一行为差异，并指出自动造键发生在哪一步；
- 能不查资料写出 `Counter` 的构造、`most_common(3)`、缺失键返回 0 三个行为；
- 能解释 `list.pop(0)` 为什么是 O(n) 而 `deque.popleft()` 是 O(1)；
- 能列出 `OrderedDict` 相对普通 dict 仅剩的三个行为差异；
- 知道 `namedtuple` 与 `dataclass`、`typing.NamedTuple` 的分工边界。
