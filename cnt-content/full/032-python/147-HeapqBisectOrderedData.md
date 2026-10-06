---
order: 180
title: heapq 与 bisect：堆与二分的标准库工具箱
module: 'python'
category: 后端技术
difficulty: beginner
description: 用 heapq 与 bisect 处理有序数据——Top-K 排行、优先队列任务调度、定时重试最小堆、价格阈值定位；讲清 heapify/heappushpop/heapreplace 的语义差异与 bisect_left/bisect_right 的返回约定，并与 Counter.most_common 和全量排序对照给出工程选型。
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：Python 标准库的「有序数据」工具箱——`heapq`（最小堆）与 `bisect`（二分插入与定位）。它们是数据结构课里「堆」和「二分查找」两个主题的**标准库 API 落地**。
- **解决什么问题**：要从十万条日志里取错误最多的前 10 条，`sorted(...)[:10]` 会把整份数据排完再丢弃 99.99% 的结果；要维护一个「按到期时间排序的定时任务队列」，每次插入后重新 sort 是 O(n log n)，而堆插入只要 O(log n)；要在一个已排序的价格表里找「第一个高于阈值的下标」，手写循环既慢又容易出 off-by-one。`heapq` 与 `bisect` 就是这两个问题的现成答案。
- **什么时候用到**：Top-K 统计、优先队列（任务调度、定时重试）、合并多个有序流、在有序序列上做「找插入点/找阈值区间」的查询。**分工声明**：堆与二分查找本身的算法原理、复杂度证明、变体题目见算法模块 [堆与优先队列](/algorithm/090-HeapAndPriorityQueue) 与 [二分查找算法](/algorithm/170-BinarySearchAlgorithms)，本篇聚焦标准库 API 的语义、易错点与工程选型；计数的另一条路（Counter 与 `most_common`）见 [collections 专用容器](/python/142-CollectionsSpecializedContainers)。

## heapq：最小堆的六个操作

### 心智模型：堆只保证「堆顶最小」

`heapq` 实现的是**最小堆**：`heap[0]` 永远是全堆最小元素，其余元素只满足「父不大于子」，**不整体有序**。初学者最大的误区是以为 `heapq` 维护了一个排好序的列表——直接打印一个堆，顺序通常是乱的：

```python
import heapq

data = [9, 4, 7, 1, 8, 2]
heapq.heapify(data)
print(data)        # [1, 4, 2, 9, 8, 7] —— 只有 heap[0] 有保证，其余是乱的
print(data[0])     # 1 —— 最小值
```

为什么这样设计：堆用数组存储、不需要维护全序，才能把「插入」和「弹出最小」都压到 O(log n)，`heapify` 一次建堆更是 O(n)。如果你的需求是「要一个一直排好序的列表」，用 `sorted` 或 [bisect 的 insort](#bisect-有序插入与阈值定位)，不要用堆。

对照 `list.sort()`：排序一次 O(n log n) 之后只读，堆没有任何优势；但数据**流式到达**或**只取前 K 个**时，堆是 O(n log k) vs 全量排序 O(n log n) 的差距。

### 基础三件套：heappush / heappop / heapify

```python
import heapq

# 场景：消费端限流——每次只处理「最早提交」的请求
pending = []
heapq.heappush(pending, (3, "req-3"))     # O(log n)
heapq.heappush(pending, (1, "req-1"))
heapq.heappush(pending, (2, "req-2"))

while pending:
    seq, req = heapq.heappop(pending)     # O(log n)，弹出并删除最小
    print(seq, req)                       # 1 req-1 -> 2 req-2 -> 3 req-3
```

逐行解释：堆元素是 `(seq, req)` 元组，比较时先比 `seq` 再比 `req`——这就是「优先级」的实现方式，不需要自定义类或比较函数。换成别的写法会发生什么：如果把元组换成 dict（`{"seq": 3, ...}`），`heappush` 直接抛 `TypeError: '<' not supported between instances of 'dict' and 'dict'`，因为 dict 之间没有定义 `<`。

对已有列表建堆用 `heapify`，原地改造、O(n)：

```python
logs = [(5, "timeout"), (1, "conn refused"), (3, "dns fail")]
heapq.heapify(logs)        # 原地，O(n)；返回 None，不是新列表
# 常见错误：logs = heapq.heapify(logs)  —— 把 None 赋回去，堆直接丢了
```

易错点标注：`heapify` 返回 `None`，这是 Python 标准库「原地修改」的惯例（同 `list.sort`），但 `heapify` 这个名字容易让人以为它像 `sorted` 一样返回新对象。

### heapreplace 与 heappushpop：组合操作的语义陷阱

`heapq` 提供两个「一进一出」的组合操作，语义方向**正好相反**，是面试和 review 的高频错点：

```python
import heapq

h = [1, 3, 5]
heapq.heapify(h)

# heappushpop：先 push 后 pop —— 新元素参与比较，若它是最小则它自己被弹回
print(heapq.heappushpop(h, 0))   # 0（0 比堆顶 1 还小，push 进去立刻被 pop 出来）
print(h)                          # [1, 3, 5] 没变

# heapreplace：先 pop 后 push —— 无条件弹出旧堆顶，新元素必进堆
print(heapq.heapreplace(h, 0))   # 1（无条件弹出了原来的堆顶）
print(h)                          # [0, 3, 5]
```

为什么要有这两个组合：一次调整堆的操作数是常数级，比分开调用更快；更重要的是原子性——多线程用锁保护堆时，组合操作不需要在 push 和 pop 之间重新竞争锁。选型口诀：**想保留较小的那个用 `heappushpop`，想固定换掉堆顶用 `heapreplace`**。`heapreplace` 在堆为空时抛 `IndexError`，而 `heappushpop` 对空堆安全（push 进去再 pop 回来）。

### Top-K：nlargest / nsmallest 与堆的两段式写法

求「错误最多的前 10 条」这类 Top-K，有三种标准库写法，规模决定选型：

```python
import heapq
from collections import Counter

# 素材场景（对照 970 爬虫项目的日志分析）：错误日志按出现次数取 Top-3
error_counter = Counter({
    "TimeoutError": 4512, "HTTP 503": 2310, "DNSFailure": 1893,
    "HTTP 429": 871, "SSLError": 214, "ProxyError": 99,
})

# 写法一：Counter 自带排名（小规模、要看全部排名时）
print(error_counter.most_common(3))
# [('TimeoutError', 4512), ('HTTP 503', 2310), ('DNSFailure', 1893)]

# 写法二：nlargest/nsmallest（对任意可迭代、任意 key，中规模）
top3 = heapq.nlargest(3, error_counter.items(), key=lambda kv: kv[1])
print(top3)
# [('TimeoutError', 4512), ('HTTP 503', 2310), ('DNSFailure', 1893)]

# 写法三：堆的两段式（海量数据、流式、内存受限时的标准姿势）
def top_k(stream, k):
    """stream 产出 (count, name)；只保留 k 个，内存 O(k)。"""
    heap = []
    for count, name in stream:
        if len(heap) < k:
            heapq.heappush(heap, (count, name))
        elif count > heap[0][0]:                 # 比当前第 k 名大才值得进堆
            heapq.heapreplace(heap, (count, name))   # O(log k) 换掉最小
    return sorted(heap, reverse=True)            # 只有 k 个，收尾排序不亏

print(top_k(error_counter.items(), 3))
```

选型对照（与 [Counter 排行榜](/python/142-CollectionsSpecializedContainers) 的分工）：数据已经全在内存且要看完整排名，`Counter.most_common()` 最直白；只取前 K 且数据量中等（几万到几十万），`nlargest(k, ...)` 一行搞定（内部就是有界堆）；数据是**流式**到达或量到千万级内存放不下，才手写两段式有界堆——注意维持的是**最小堆**装**最大**的 K 个，堆顶是第 K 名的哨兵。为什么写法三用 `heapreplace` 而不是 `heappushpop`：这里要的是「无条件淘汰哨兵」，若用 `heappushpop`，当新元素更小时它会被弹回来，行为碰巧相同但白做一次入堆调整，语义也不如 `heapreplace` 直白。

### 例子一（真实工程）：爬虫重试的定时最小堆

重试任务带「下次重试时间」，调度器每轮只该处理「到期」的任务。用最小堆按到期时间排，每轮 peek 堆顶判断是否到期——这就是 `heapq` 最经典的工程用法（asyncio 内部的定时器也是这个结构）：

```python
import heapq
import time

def run_retry_scheduler():
    now = time.monotonic()
    # (到期时间, 重试次数, 任务名)——次数是 tie-breaker，避免同时到期时比较任务名
    retries = [
        (now - 10, 2, "crawl:/detail/17"),      # 已到期，第 2 次重试
        (now + 30, 1, "crawl:/detail/42"),      # 30 秒后才到期
        (now - 5,  1, "crawl:/list/page/3"),    # 已到期
    ]
    heapq.heapify(retries)

    processed = []
    while retries and retries[0][0] <= now:     # 堆顶未到期，后面全未到期
        due, attempt, name = heapq.heappop(retries)
        processed.append((name, attempt))

    for name, attempt in processed:
        print(f"重试 {name}（第 {attempt} 次）")
    # 重试 crawl:/detail/17（第 2 次）
    # 重试 crawl:/list/page/3（第 1 次）

run_retry_scheduler()
```

逐段解释：`while retries and retries[0][0] <= now` 里的 `retries[0]` 是**只看不取**（peek），这是堆优于有序列表的地方——看最小值 O(1)，不用弹出；`heappop` 才会真正摘掉。易错点：到期时间一定要用 `time.monotonic()` 而不是 `time.time()`——系统校时（NTP 回拨）会让 `time.time()` 的时间差为负，堆的调度直接错乱。为什么元组第二位放重试次数：两个任务到期时间完全相同时，比较会落到第三位「任务名」，把「次数」垫在中间可以让同刻任务按重试优先级出队，且保证元组之间永远可比较。

### 例子二（真实工程）：多源有序日志归并（k 路归并）

每个采集节点的日志文件各自有序，要合并成全局有序流。手动写 `while` 归并既啰嗦又容易漏结束条件，`heapq.merge` 现成：

```python
import heapq

node_a = [("2026-10-06T09:00:01", "GET /api/users 200"),
          ("2026-10-06T09:00:04", "GET /api/items 500")]
node_b = [("2026-10-06T09:00:02", "POST /api/orders 201"),
          ("2026-10-06T09:00:03", "GET /api/items 200")]

merged = heapq.merge(node_a, node_b)     # 惰性生成器，O(n log k)，k 是源数量
for ts, line in merged:
    print(ts, line)
# 09:00:01 GET /api/users 200
# 09:00:02 POST /api/orders 201
# 09:00:03 GET /api/items 200
# 09:00:04 GET /api/items 500
```

为什么用 `heapq.merge` 而不是拼接后排序：拼接排序是 O(n log n) 且要求全部加载进内存；`merge` 假定每个源**已经有序**，只做 k 路归并 O(n log k)，而且是生成器——三个 10 GB 的日志文件也能流式合并。前提条件是「各源有序」，源乱序时结果就是错的，这是它唯一的坑。

## bisect：有序插入与阈值定位

### 心智模型：bisect 只算下标，不动列表

`bisect` 模块只有一类能力：在**已排序**的序列上，用二分查找 O(log n) 算出「某个值该插到哪」。`bisect_left` 与 `bisect_right` 的区别只在「序列里已有相等的值时，插到它们左边还是右边」：

```python
import bisect

prices = [101.5, 102.0, 102.0, 102.0, 103.8]
i_left = bisect.bisect_left(prices, 102.0)    # 1 —— 第一个 >= 102.0 的位置
i_right = bisect.bisect_right(prices, 102.0)  # 4 —— 第一个 > 102.0 的位置
print(i_left, i_right)
```

记住两个返回值的口诀：`bisect_left(a, x)` 返回「第一个 **>=** x 的下标」，`bisect_right` 返回「第一个 **>** x 的下标」。由此推出三件常用武器：

```python
def demonstrate_threshold_queries(prices, low, high):
    # 查询一：x 在不在序列里（等价于 membership，O(log n)）
    i = bisect.bisect_left(prices, low)
    found = i < len(prices) and prices[i] == low

    # 查询二：第一个 >= low 的元素（阈值定位）
    i2 = bisect.bisect_left(prices, low)
    first_at_least = prices[i2] if i2 < len(prices) else None

    # 查询三：值在 [low, high) 区间内的个数
    count = bisect.bisect_right(prices, high) - bisect.bisect_left(prices, low)
    return found, first_at_least, count

print(demonstrate_threshold_queries(prices, 102.0, 103.0))
# (True, 102.0, 3)
```

区间计数 `bisect_right(high) - bisect_left(low)` 是最值得背下来的一行：左端用 left（把等于 low 的算进来）、右端用 right（把等于 high 的排除），两个下标一减就是区间长度，不用循环。手写循环做这件事，off-by-one 几乎必然出现。

### 有序插入：insort 与它的 O(n) 真实成本

```python
import bisect

scores = [("卷面", 88), ("实验", 92)]        # 按分数排好序的列表
bisect.insort(scores, ("作业", 90))          # insort = bisect + list.insert
print(scores)
# [('卷面', 88), ('作业', 90), ('实验', 92)] —— 按元组第二位？不，按整个元组
```

注意上面例子能对，是因为先比较了元组第一项（中文按码点序），`("卷面", 88)` < `("作业", 90)` 碰巧成立。**带 key 的排序键场景要用 `key` 参数**（Python 3.10+，`bisect` 与 `insort` 全系支持）：

```python
scores = [("卷面", 88), ("实验", 92)]
bisect.insort(scores, ("作业", 90), key=lambda pair: pair[1])
print(scores)
# [('卷面', 88), ('作业', 90), ('实验', 92)] —— 这次真的按分数插的
```

逐段解释：`key` 只告诉 bisect 「用什么键比较」，插入仍是整个元素进列表。3.10 之前没有 `key`，惯用法是「另存一份纯键列表，对键列表 bisect、对数据列表 insert」——两份列表必须同步维护，这就是旧代码里 `keys[i]` 与 `values[i]` 成对出现的来历。易错点（必须标注）：`insort` 的查找是 O(log n)，但 `list.insert` 移动元素是 O(n)——**它不改变插入的线性成本**。insort 的适用前提是「插入不频繁、查询频繁」；插入频繁且要保序，改用堆或 `sortedcontainers` 这类第三方结构。换成「append 后重新 sort」的写法：每次 O(n log n)，且把 O(n) 的移动变成了 O(n log n) 的全量比较，只会更慢。

### 例子三（真实工程）：价格预警的阈值定位

风控系统维护一份排好序的历史成交价，行情推送来一个新价，要立刻回答「超过最近 95 分位了吗」并找到第一个越过分位值的位置：

```python
import bisect

def build_quantile_checker(sorted_prices: list[float]):
    """返回一个函数：报价新价是否超过 95 分位阈值及其位置。"""
    idx = int(len(sorted_prices) * 0.95)
    threshold = sorted_prices[idx]

    def check(new_price: float) -> tuple[bool, int | None]:
        if new_price <= threshold:
            return False, None
        # 顺带报告该价若成交，会插入到哪个位置（保持序列有序）
        return True, bisect.bisect_left(sorted_prices, new_price)

    return check

history = sorted([10.1, 10.3, 10.3, 10.5, 10.8, 11.0, 11.2, 11.5, 12.0, 12.4])
alert = build_quantile_checker(history)
print(alert(10.2))     # (False, None)
print(alert(12.8))     # (True, 10) —— 插到末尾之前的位置 10
```

逐段解释：阈值只在**构建检查器时**算一次（闭包缓存），每笔报价只做一次 O(log n) 二分——如果把「排序 + 找分位」放进 `check` 里，每次调用 O(n log n)，高频行情下就是事故。换成「每来一个价就 `history.append` + `sort()`」：报价频率高时 CPU 全耗在重复排序上；正确的增量维护是 `insort`（O(n) 但无比较开销）或按时间窗定期重建。为什么不缓存 `bisect` 结果：报价新价在下次重建前不写回 `history`（示例保持只读语义），若要写回，记得 `insort` 与 `bisect_left` 必须用**同一个 key**，一边带 key 一边不带是静默错位的常见来源。

## 堆、排序、Counter 的选型决策表

| 需求 | 首选 | 原因 |
| --- | --- | --- |
| 一次性排序，之后只读 | `sorted()` / `list.sort()` | O(n log n) 一次付清，结果完全有序 |
| 只要前 K 个，数据全在内存 | `heapq.nlargest(k, it, key=...)` | O(n log k)，比全排少做大量工作 |
| 只要前 K 个，数据流式/海量 | 两段式有界堆（heappush + heapreplace） | 内存 O(k)，可中途消费 |
| 要完整排行榜且按出现次数 | `Counter.most_common()` | 计数 + 排名一步到位（见 [collections 专用容器](/python/142-CollectionsSpecializedContainers)） |
| 反复「看最小/最大」并按需弹出 | `heapq` | peek O(1)，pop/push O(log n) |
| 有序序列上频繁查询/插入 | `bisect` | 查询 O(log n)；插入仍是 O(n)，插入频繁换堆 |

一句话记住分工：**排序是「一次成序、多次读」，堆是「边到边排、只关心极值」，bisect 是「已有序、查得快、插得慢」，Counter 是「数个数、顺带排名」**。

## 动手实践

练习一（预测题）：不运行代码，判断输出：

```python
import heapq

h = [4, 2, 6]
heapq.heapify(h)
print(heapq.heappushpop(h, 1))
print(heapq.heapreplace(h, 0))
print(h)
```

提示：回想两个组合操作的顺序差异——「先 push 后 pop」与「先 pop 后 push」。

<details>
<summary>参考实现</summary>

第一行输出 `1`：`heappushpop` 先把 1 推进堆，1 比堆顶 2 更小，立刻被弹出——堆内容不变。第二行输出 `2`：`heapreplace` 无条件弹出当前堆顶 2，再把 0 放进堆。最终 `h` 是 `[0, 4, 6]`。如果两行调换顺序（先 `heapreplace(h, 1)` 再 `heappushpop(h, 0)`），第一行会弹出 2 放入 1，第二行 0 比堆顶 1 小被弹回——组合操作的顺序直接决定结果，这正是本篇强调的语义陷阱。
</details>

练习二（实战题）：给 970 爬虫项目的错误日志流写一个 `StreamingTopK` 类：`add(error_name)` 逐条喂入，`top(n)` 随时返回出现次数最多的前 n 个错误名。约束：内存里不允许保存完整错误列表（只能保存计数与有界堆）。

提示：`Counter` 计数（见 [collections 专用容器](/python/142-CollectionsSpecializedContainers)）+ 练习一复习的「查询时用 `nlargest`」即可；注意 `top(n)` 不应改变内部状态。

<details>
<summary>参考实现</summary>

```python
import heapq
from collections import Counter

class StreamingTopK:
    def __init__(self) -> None:
        self._counts: Counter[str] = Counter()

    def add(self, error_name: str) -> None:
        self._counts[error_name] += 1          # O(1)

    def top(self, n: int) -> list[tuple[str, int]]:
        return heapq.nlargest(n, self._counts.items(), key=lambda kv: kv[1])

tk = StreamingTopK()
for e in ["TimeoutError"] * 5 + ["HTTP 503"] * 3 + ["DNSFailure"] * 2:
    tk.add(e)
print(tk.top(2))
# [('TimeoutError', 5), ('HTTP 503', 3)]
```

为什么这样写：计数必须保存（否则无从排名），但错误明细流本身不落内存；`nlargest` 在「键列表长度 <= n」的常见小规模下退化为排序，错误类型总数通常几十个，性能完全够。若错误类型本身也海量（如按 URL 维度统计），再换成 `add` 时维护有界堆的写法。
</details>

练习三（实战题）：设备心跳服务器用最小堆管理「下次探活时间」。实现 `HeartbeatHeap`：`schedule(device_id, due_ts)` 登记、`due(now)` 返回所有 `due_ts <= now` 的设备并从堆中移除。注意至少两个设备同刻到期时不能报比较错误。

提示：元组比较崩在第二项时怎么办？加一个单调递增的序号做 tie-breaker（这也是 asyncio 定时器堆的真实做法）。

<details>
<summary>参考实现</summary>

```python
import heapq
import itertools

class HeartbeatHeap:
    def __init__(self) -> None:
        self._heap: list[tuple[float, int, str]] = []
        self._tie = itertools.count()          # 单调递增，永不重复

    def schedule(self, device_id: str, due_ts: float) -> None:
        heapq.heappush(self._heap, (due_ts, next(self._tie), device_id))

    def due(self, now: float) -> list[str]:
        due_list = []
        while self._heap and self._heap[0][0] <= now:
            _, _, device_id = heapq.heappop(self._heap)
            due_list.append(device_id)
        return due_list

hb = HeartbeatHeap()
hb.schedule("cam-01", 100.0)
hb.schedule("cam-02", 100.0)      # 同刻到期
hb.schedule("cam-03", 200.0)
print(hb.due(150.0))              # ['cam-01', 'cam-02']
print(hb.due(150.0))              # [] —— 已摘除，不会重复探活
```

为什么需要 `_tie`：两个 `(100.0, "cam-01")` 与 `(100.0, "cam-02")` 能比较（字符串可比），但 `(100.0, 2)` 这种混合类型或不可比对象会抛 `TypeError`；序号垫层让比较永远在第二位就分出胜负，且不依赖 device_id 的可序性。
</details>

练习四（找错题）：下面的价格档位查询有两处问题，先找再修：

```python
import bisect

levels = [10.0, 10.5, 11.0, 11.5, 12.0]

def in_band(price: float) -> bool:
    i = bisect.bisect_right(levels, price)
    return levels[i] == price

def count_between(low: float, high: float) -> int:
    return bisect.bisect_left(levels, high) - bisect.bisect_left(levels, low)
```

提示：`bisect_right` 的返回值可能等于 `len(levels)`；再对一遍区间计数的左右端约定。

<details>
<summary>参考实现</summary>

```python
import bisect

levels = [10.0, 10.5, 11.0, 11.5, 12.0]

def in_band(price: float) -> bool:
    i = bisect.bisect_left(levels, price)
    return i < len(levels) and levels[i] == price

def count_between(low: float, high: float) -> int:
    return bisect.bisect_right(levels, high) - bisect.bisect_left(levels, low)
```

两处问题：其一，`in_band` 用了 `bisect_right`——它返回的是「第一个 > price」的位置，`levels[i]` 永远不等于 price（有重复值时更是必然错位），应改 `bisect_left` 并加越界保护，否则查 12.0 时 `levels[5]` 抛 `IndexError`；其二，`count_between` 右端误用 `bisect_left`，会把等于 high 的元素漏掉——`count_between(10.0, 12.0)` 原写法得 3（10.0/10.5/11.0），正确答案是 5。记住约定：左端 left、右端 right，区间才是闭开 `[low, high)`。
</details>

练习五（实战题）：合并三个采集节点的日志流（各自按时间戳有序），只打印 09:00:02 到 09:00:03（含）之间的日志，且不把全量日志加载进内存。

提示：`heapq.merge` 是生成器，可以边消费边丢弃；时间戳字符串按字典序即时间序（ISO 格式的特性）。

<details>
<summary>参考实现</summary>

```python
import heapq
from itertools import dropwhile, takewhile

node_a = [("09:00:01", "a GET /u 200"), ("09:00:04", "a GET /i 500")]
node_b = [("09:00:02", "b POST /o 201"), ("09:00:03", "b GET /i 200")]
node_c = [("09:00:01", "c WS handshake"), ("09:00:05", "c reconnect")]

merged = heapq.merge(node_a, node_b, node_c)
window = takewhile(
    lambda rec: rec[0] <= "09:00:03",
    dropwhile(lambda rec: rec[0] < "09:00:02", merged),
)
for ts, line in window:
    print(ts, line)
# 09:00:02 b POST /o 201
# 09:00:03 b GET /i 200
```

为什么三层生成器都不落地：`merge` 惰性归并，`dropwhile` 跳过窗口前的记录（每个源最多被读一条），`takewhile` 在越过上界时停止消费——全程内存 O(k)（k 为源数量），且不会读完三个文件。如果写成 `list(heapq.merge(...))` 再切片，惰性全部作废，等于把三个 10 GB 文件加载进内存。
</details>

## 常见坑点速记

- 堆不是有序列表：只有 `heap[0]` 有保证，遍历堆的顺序是乱的；
- `heapify` 原地修改返回 `None`，`logs = heapq.heapify(logs)` 会把堆变成 `None`；
- `heapreplace`（先弹后进，要求堆非空）与 `heappushpop`（先进后弹，空堆安全）方向相反，选错只是「不报错地慢或语义反了」，review 时重点看；
- Top-K 装最大值要用**最小堆**当哨兵（堆顶是第 K 名），直觉里「装最大用最大堆」在 heapq 里恰恰是错的；
- 堆元素是元组时，比较落到第二项之后的字段——放不可比对象（如 dict）或类型混杂会抛 `TypeError`，用单调序号做 tie-breaker；
- `bisect` 的 `key` 参数要 3.10+；带 key 的序列做 `insort` 与查询必须用同一个 key，否则静默错位；
- `bisect` 的下标可能等于 `len(seq)`（要插在末尾），先判越界再取值；
- `insort` 查找 O(log n) 但移动 O(n)——高频插入保序的需求换堆或第三方结构。

## 与之前和之后的知识的关系

- 往前：堆与二分的算法原理、复杂度证明见算法模块 [堆与优先队列](/algorithm/090-HeapAndPriorityQueue) 与 [二分查找算法](/algorithm/170-BinarySearchAlgorithms)；`Counter` 排行榜见 [collections 专用容器](/python/142-CollectionsSpecializedContainers)；元组的比较规则见 [内置数据结构](/python/140-BuiltinDataStructure)。
- 往后：`heapq.merge` 的多源归并与本模块流式处理的关系见 [生成器与协程](/python/180-GeneratorCoroutine)；asyncio 内部的定时器堆与 `loop.call_later` 见 [协程与 asyncio 入门](/python/660-CoroutineAsyncio)；`itertools` 的 `takewhile`/`dropwhile` 见 [迭代器协议与 itertools](/python/170-IteratorProtocolAndItertools)。

## 官方文档

- heapq —— Heap queue algorithm：https://docs.python.org/3/library/heapq.html
- bisect —— Array bisection algorithm：https://docs.python.org/3/library/bisect.html
- Sorting HOW TO（含 nlargest 与 sorted 的对比）：https://docs.python.org/3/howto/sorting.html

## 自我检查

- 能说出堆的唯一保证（`heap[0]` 最小）并解释为什么「打印堆是乱的」不是 bug；
- 能分别写出 `heapreplace` 与 `heappushpop` 的行为并解释两者的选型口诀；
- 能手写两段式有界堆的 Top-K，并说清为什么装最大的 K 个用的是最小堆；
- 能背出 `bisect_left`（第一个 >= x）与 `bisect_right`（第一个 > x）的返回约定，并用一行减法做区间计数；
- 能对照数据规模与访问模式，在 `sorted`、`nlargest`、有界堆、`Counter.most_common`、`insort` 之间做出选型并说明理由。
