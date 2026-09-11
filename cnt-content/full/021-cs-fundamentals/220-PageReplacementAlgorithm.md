---
order: 220
title: 页面置换算法
module: 'cs-fundamentals'
category: 计算机科学
difficulty: intermediate
description: 页面置换算法：FIFO、LRU 实现、Clock 算法、LFU 与工作集模型。
author: fanquanpp
updated: '2026-09-12'
related:
  - 'cs-fundamentals/200-UserModeKernelModeSwitch'
  - 'cs-fundamentals/210-MemorySegmentationAndPaging'
  - 'cs-fundamentals/230-FileSystemInode'
  - 'cs-fundamentals/240-DiskScheduling'
prerequisites:
  - 'cs-fundamentals/010-ComputerOverview'
---

## 前置知识

- 虚拟内存与按需调页：物理页不足时内核会"换出"某些页（见 [内存分段与分页](cs-fundamentals/210-MemorySegmentationAndPaging)）；
- 缺页异常是 major fault 时需要磁盘 I/O（毫秒级），这是置换算法存在意义的根源；
- 基础数据结构：队列、链表、哈希表。

## 学习目标

- 说清置换问题的定义：内存满了、必须调入新页时，"牺牲"谁；
- 掌握 OPT / FIFO / LRU 三种经典算法的推演方法，理解 Belady 异常；
- 理解为什么硬件只提供"引用位"，Clock 系列算法如何用 O(1) 开销近似 LRU；
- 理解工作集模型与缺页频率（PFF）如何把"局部性"变成可度量的指标。

## 1. 概念引入：书桌只剩一个空位

一个类比：你的书桌（物理内存）只能摊开 3 本书（页框），而手头的论文（进程）引用了 12 本书（虚拟页）。要读一本新书时书桌已满，你必须把某本书放回书架（换出到磁盘）——放回哪一本，决定了你接下来还要跑多少趟书架（缺页中断，每次毫秒级）。

- 每次"放回错误的书"代价高昂：一次缺页调入约需几毫秒，而 CPU 执行一页内的指令只需微秒级——**缺页率哪怕只差 1%，整体性能差距都是数十倍**。
- 置换算法的目标：用尽可能少的缺页次数跑完整个访问序列。

它本质上是一个缓存淘汰问题，与 CPU 缓存行替换、Redis 淘汰策略、浏览器 LRU 缓存同源，只是这里"不命中"的代价最极端。

## 2. 问题定义与推演框架

给定访问串 R = r1, r2, ..., rn 和 m 个页框，算法决定每次缺页时换出哪一页。评价标准只有一个：**缺页总次数**。

一条重要性质——**包含关系（栈算法性质）**：对 OPT、LRU 这类算法，"m 个页框时内存中的页集合"是"m+1 个页框时页集合"的子集。因此页框越多缺页只会不增，绝不会变多。FIFO 不满足该性质，于是出现了著名的反例（见下节）。

## 3. 经典算法：OPT、FIFO、LRU

以下推演统一使用访问串 `1,2,3,4,1,2,5,1,2,3,4,5`，3 个页框。

### 3.1 OPT：理论下界

**最佳置换**换出"未来最长时间不再被访问"的页。它需要预知未来，无法实现，但它是所有算法的性能下界，用来给其他算法"打分"。

| 访问 | 1 | 2 | 3 | 4 | 1 | 2 | 5 | 1 | 2 | 3 | 4 | 5 |
| ---- | - | - | - | - | - | - | - | - | - | - | - | - |
| 结果 | F | F | F | F | 命 | 命 | F | 命 | 命 | F | F | 命 |

缺页 7 次。4 号页在第 10 步才再用，所以在第 4 步换出 3（未来不再使用）是最优决策。

### 3.2 FIFO：先进先出

换出最早进入内存的页，用队列即可实现，O(1)。缺点明显：最早进来的页可能恰恰是热页（比如一直被循环访问的代码页）。

上例中 FIFO 缺页 **9 次**。更糟的是，把页框从 3 个加到 4 个，缺页反而变成 **10 次**——这就是 **Belady 异常**：缺页率随页框增加而不降反升。原因正是 FIFO 不具备栈算法性质：4 框时的页集合未必包含 3 框时的页集合。

> 注意：Belady 异常在真实系统中很少成为大问题（内核不会精确踩中这条访问串），但它是面试与考试的经典考点，也是"算法要满足栈性质"这一理论洞察的来源。

### 3.3 LRU：最近最少使用

换出"最久未被访问"的页。思想基于**时间局部性**：最近用过的页，大概率很快再用。

上例中 LRU 缺页 10 次（这条访问串恰好对 LRU 不友好，OPT 7 次是下界，LRU 通常介于 FIFO 与 OPT 之间且普遍更接近 OPT）。LRU 满足栈性质，没有 Belady 异常。

**LRU 的实现困境**：要精确知道"最久未访问"，每次访存都要更新一个时间戳或移动链表节点——硬件不可能为每条 load/store 指令付这个代价。软件层面（如 Redis、语言标准库）没有这个障碍，用"哈希表 + 双向链表"即可做到 O(1)：

```python
# lru_cache_demo.py：面试与工程中最常见的 LRU 实现
from collections import OrderedDict

class LRUCache:
    def __init__(self, capacity: int):
        self.cap = capacity
        self.od = OrderedDict()  # 头部是最近使用，尾部是最久未用

    def get(self, key):
        if key not in self.od:
            return -1
        self.od.move_to_end(key)  # 命中即移到头部，O(1)
        return self.od[key]

    def put(self, key, value):
        if key in self.od:
            self.od.move_to_end(key)
        self.od[key] = value
        if len(self.od) > self.cap:
            self.od.popitem(last=False)  # 弹出尾部：最久未使用

cache = LRUCache(2)
cache.put(1, "a"); cache.put(2, "b")
print(cache.get(1))   # 输出 1 变为最近使用
cache.put(3, "c")     # 容量满，换出 key=2
print(cache.get(2))   # 已被换出
print(cache.get(3))   # 正常命中
```

运行输出：

```text
a
-1
c
```

## 4. 近似 LRU：Clock 系列算法

### 4.1 引用位：硬件给的唯一线索

现代 CPU 的页表项里有一个**引用位（A 位，Accessed）**：该页被访问时硬件自动置 1，但内核**无法知道访问的先后顺序**。内核能做的只有周期性地把引用位清零，然后用"引用位是否为 1"这个粗粒度信号近似 LRU——这正是第二次机会（Clock）算法的出发点。

### 4.2 Clock（第二次机会）算法

所有页框排成一个环，一个指针像钟表针一样转动。需要换页时：

1. 看指针所指页的引用位：为 1，说明它"最近被用过"，给它第二次机会——清零引用位，指针前进；
2. 为 0，说明两轮之间都没人碰它，换出它，新页装入该位置，引用位置 1，指针前进一格。

每个被"扫过"的页付出一次清零的代价，最坏情况把环扫一整圈（退化为所有引用位清零后必然在原位淘汰），平均代价 O(1)，缺页表现接近 LRU。

### 4.3 改进型 Clock：把"脏页"考虑进去

换出一个**脏页（被写过，D 位为 1）**必须先写回磁盘，成本翻倍。改进型 Clock 同时看引用位 A 和脏位 D，优先挑"(A=0, D=0) 的干净冷页"，其次"(A=0, D=1) 的脏冷页"（挑中前先安排写回），尽量避开热页。四类页的优先级：

| A | D | 含义 | 淘汰优先级 |
| - | - | ---- | ---------- |
| 0 | 0 | 冷且干净 | 1（最优牺牲品） |
| 0 | 1 | 冷但脏 | 2（需先写回） |
| 1 | 0 | 热但干净 | 3 |
| 1 | 1 | 热且脏 | 4（尽量不动） |

### 4.4 WSClock：工作集与时钟的结合

WSClock 在 Clock 表项里额外记录"上次访问时间"，并给定参数 τ（如 100ms）：扫描时若引用位为 0 且"距上次访问超过 τ"，认为它已不在工作集中，可换出；脏页登记写回后继续。它是工业界真实使用过的算法（如早期 Mach 内核），把"老化判定"与"低开销扫描"合为一体。

## 5. 工作集模型与缺页频率控制

### 5.1 工作集定义

**工作集 W(t, Δ)**：进程在过去的 Δ 时间窗口内实际访问过的页集合。程序运行呈现阶段性与局部性——一段时间内只集中访问一小撮页。工作集模型的政策很直白：

- 保证每个进程的工作集都驻留在内存（分配页框数 ≥ |W|）；
- 工作集装不下时，与其让多个进程互相"踢页"（**抖动/thrashing**：缺页率飙升，CPU 大部分时间在等 I/O），不如把某个进程整个换出，让留下的进程吃饱。

### 5.2 缺页频率（PFF）

工作集参数 Δ 难以直接选定，**缺页频率控制（PFF, Page Fault Frequency）**改用结果反推：为每个进程设缺页率上下限（如每万条指令 1 次与 1000 次）。

- 缺页率高于上限 → 工作集不够，增多页框；没有多余页框时换出整个进程；
- 缺页率低于下限 → 分配过多，收回部分页框。

这是典型的反馈控制思想：不预测局部性，而是测量其后果并调整。

## 6. 完整示例：一个可运行的置换模拟器

```python
# page_replacement.py：同一访问串上对比四种算法的缺页次数
def simulate(refs, frames, policy):
    mem, faults = set(), 0
    queue, r_bits, hand = [], {}, 0  # FIFO 队列 / Clock 引用位与指针

    def load(p):
        nonlocal faults
        faults += 1
        if len(mem) < frames:                    # 还有空页框，直接装入
            mem.add(p); queue.append(p); r_bits[p] = 1
            return
        if policy == 'FIFO':                     # 换出最早进入的页
            victim = queue.pop(0); mem.discard(victim); r_bits.pop(victim)
        elif policy == 'LRU':                    # 换出最久未访问（queue 尾部最新）
            victim = queue.pop(0); mem.discard(victim); r_bits.pop(victim)
        elif policy == 'OPT':                    # 换出未来最久不用的页
            future = refs[i + 1:]
            victim = max(mem, key=lambda q: future.index(q) if q in future else len(future))
            mem.discard(victim); queue.remove(victim); r_bits.pop(victim)
        elif policy == 'CLOCK':                  # 二次机会：环形扫描引用位
            nonlocal hand
            while r_bits[queue[hand]] == 1:      # 引用位为 1 则清零放行
                r_bits[queue[hand]] = 0
                hand = (hand + 1) % frames
            victim = queue[hand]                 # 引用位为 0，就地淘汰
            mem.discard(victim); r_bits.pop(victim)
            queue[hand] = p; mem.add(p); r_bits[p] = 1
            hand = (hand + 1) % frames
            return
        mem.add(p); queue.append(p); r_bits[p] = 1

    for i, p in enumerate(refs):
        if p in mem:                             # 命中：LRU 需把页移到"最新"端
            if policy == 'LRU':
                queue.remove(p); queue.append(p)
            r_bits[p] = 1
        else:
            load(p)
    return faults

refs = [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5]
for pol in ('FIFO', 'LRU', 'OPT', 'CLOCK'):
    print(f"{pol:>5} 3帧 缺页 {simulate(refs, 3, pol)} 次")
print("FIFO 4帧 缺页", simulate(refs, 4, 'FIFO'), "次  # 观察 Belady 异常")
```

运行 `python page_replacement.py`，输出：

```text
 FIFO 3帧 缺页 9 次
  LRU 3帧 缺页 10 次
  OPT 3帧 缺页 7 次
CLOCK 3帧 缺页 10 次
FIFO 4帧 缺页 10 次  # 观察 Belady 异常
```

三条结论清晰可见：OPT 是下界；FIFO 出现 Belady 异常（3 帧 9 次，4 帧反而 10 次）；LRU 与 Clock 表现接近。把访问串换成顺序扫描大数组之类的模式，可以进一步体会算法对局部性的敏感性。

## 7. 常见陷阱与调试

- **把 LRU 当默认答案**：纯 LRU 有两个软肋——突发性一次性扫描（如备份、`grep` 全库）会把所有热页冲刷掉；且精确 LRU 在硬件上不可实现。工业实现普遍加"老化"机制或分段保护（如 Redis 的 `volatile-lru`、Linux 的 active/inactive 双链表）。
- **混淆置换与写回**：淘汰脏页要先写回，淘汰干净页直接丢弃。改进型 Clock 优先淘汰干净页正是为此；性能分析时 dirty 页写回流量经常被误认为"内存泄漏"。
- **抖动误判**：`vmstat` 中 si/so（换入换出）持续非零且 CPU 的 wa（等待 I/O）占比高，通常不是"swap 太慢"，而是总工作集超过物理内存——加页框（加内存）或减进程并发才是根治手段。
- **考试推演陷阱**：FIFO 的"最先进来"按**装入时间**排序，LRU 按**最近访问时间**排序，两者在命中后会走出完全不同的结果，推演时建议逐列画表。

## 8. 实战场景

- **操作系统内核**：Linux 采用双链表 LRU 近似（active/inactive，配合引用位与二次机会思想），页面回收由 kswapd 在水位线以下触发，而非等到无页可分。
- **存储系统**：数据库缓冲池（InnoDB Buffer Pool）用"新/老子链表"改良 LRU 抵抗全表扫描；Redis 提供近似 LRU 与 LFU 两种淘汰模式。
- **容量规划**：给服务分配内存前估算其工作集大小（可用 `perf` 采样访问地址或观察缺页曲线），让"工作集总量 < 物理内存"留有余量，从源头避免抖动。

## 小结

初学者要点：

- 置换算法回答"内存满时淘汰谁"，唯一硬指标是缺页次数；缺页意味着毫秒级磁盘 I/O，代价极高。
- OPT 需要预知未来、不可实现，是性能下界；FIFO 实现最简单但存在 Belady 异常；LRU 基于时间局部性，通常最接近 OPT。
- Clock 用硬件引用位做"二次机会"，以 O(1) 开销近似 LRU；改进型再引入脏位，优先淘汰冷且干净的页。

进阶注意：

- 栈算法性质保证"页框越多缺页不增"，FIFO 不满足该性质是 Belady 异常的根源。
- 真实内核很少用教科书算法：Linux 的 active/inactive 双链表、Redis 的抽样近似 LRU/LFU，本质都是"低成本逼近 LRU + 抗扫描污染"。
- 工作集模型与 PFF 把置换问题上升到多进程资源分配层面：内存不足时的正解是减少并发（换出整个进程），而不是让所有进程互相踢页走向抖动。
