---
order: 90
title: "哈希表：为什么 in set 快千倍"
module: 'algorithm'
category: 计算机科学
difficulty: intermediate
description: "兑现 010 篇埋下的种子：实测 list 与 set 查找的千倍差距，打开 hash 的黑盒，手写链地址法迷你哈希表并自动扩容，开放寻址与删除标记的陷阱，负载因子与均摊扩容，Redis 渐进式 rehash 与一致性哈希，布隆过滤器等概率亲戚。"
author: fanquanpp
updated: '2026-09-28'
related:
  - 'algorithm/010-AlgorithmAnalysisBasics'
  - 'algorithm/020-ArrayAndDynamicArray'
  - 'algorithm/060-LinkedList'
  - 'algorithm/080-Tree'
  - 'algorithm/220-BloomFilter'
prerequisites:
  - 'algorithm/010-AlgorithmAnalysisBasics'
  - 'algorithm/020-ArrayAndDynamicArray'
---

## 前置知识

- 已完成 [算法分析基础](/algorithm/010-AlgorithmAnalysisBasics)——本文正是它第 6 节埋下那颗种子的兑现：`in list` 与 `in set` 的日常差距；
- 了解数组的 O(1) 随机访问（[数组与动态数组](/algorithm/020-ArrayAndDynamicArray)）与链表（[链表](/algorithm/060-LinkedList)）。

## 学习目标

读完本文你将能够：

1. 实测并解释「哈希表平均 O(1)、最坏 O(n)」这句话里每个词的含义；
2. 亲手实现一个带自动扩容的链地址法哈希表，说清负载因子为什么是生命线；
3. 解释开放寻址法为什么删除要打标记、Python dict 与 Java HashMap 各选了哪条路线；
4. 手写一致性哈希环，论证它比 `hash(key) mod N` 好在哪；
5. 认识布隆过滤器、布谷鸟哈希等「概率亲戚」各自的取舍；
6. 识别哈希表的六个高频坑（2 的幂做模数、删除不打标记、可变对象做键等）。

预计 60 到 90 分钟。

## 1. 你现在要解决什么问题

[算法分析基础](/algorithm/010-AlgorithmAnalysisBasics)的第 6 节留过一个实验：百万数据里判断「某元素在不在」，`in list` 与 `in set` 差距悬殊，并预告「这是为什么有哈希表的种子」。现在回收它。业务里这个场景无处不在：登录时查用户名是否存在、爬虫判断 URL 抓没抓过、风控里查黑名单、统计词频——「按 key 秒查」是绝大多数系统的第一性能需求。

排序数组加二分能做到 O(log n)，但插入要 O(n) 搬家；树能到 O(log n) 还保序，但常数大、实现复杂。哈希表的答案是激进的一步：**不比较、不排队，直接用算术把 key 变成数组下标**——查找就是一次下标访问。代价是引入一个新问题：不同 key 可能算出同一个下标（冲突）。本文一半篇幅就在讲怎么收拾这个冲突。

## 2. 最小可运行实验：亲眼看到千倍差距

```python
import timeit

n = 1_000_000
data = list(range(n))
s = set(data)

# 2000000 不在数据里：list 必须扫完全表才能下结论
t_list = timeit.timeit(lambda: 2_000_000 in data, number=3)
t_set = timeit.timeit(lambda: 2_000_000 in s, number=1_000_000)
print(f"in list  x3        : {t_list:.4f}s")
print(f"in set   x1000000  : {t_set:.4f}s")
```

预期输出（数值因机器而异，量级关系稳定）：

```text
in list  x3        : 1.2084s
in set   x1000000  : 0.1094s
```

读法：list 查 3 次花的时间，够 set 查一百多万次——**单次差距在百万倍量级**。set 底层就是哈希表。它在「查找」这一件事上把所有对手甩出数量级，这正是它存在的理由。

打开一点黑盒。哈希表的 O(1) 建立在一个函数上：`hash(key)` 把任意 key 变成整数，再对槽位数取模就得到下标：

```python
print(hash(42), hash(42) % 8)        # 整数的 hash 就是它自己（太小则本身）
print(hash("algo") % 8)              # 同一进程内重复调用结果相同
```

两次运行程序，字符串的 `hash("algo")` 数值会不同——Python 对字符串做了每进程随机加盐（SipHash），防的是恶意构造大量冲突 key 的 HashDoS 攻击。但同一进程内结果恒定，哈希表的正确性只依赖「同进程内稳定」。

## 3. 发生了什么：手写一个迷你哈希表

核心 = 数组 + 哈希函数 + 冲突处理。最直观的冲突处理是**链地址法**（separate chaining）：每个槽位挂一个链表（Python 里用 list 代替），冲突的元素排队挂在同一个槽下：

```python
class MiniHashMap:
    def __init__(self, capacity=8):
        self.buckets = [[] for _ in range(capacity)]

    def _slot(self, key):
        return hash(key) % len(self.buckets)

    def put(self, key, value):
        bucket = self.buckets[self._slot(key)]
        for i, (k, _) in enumerate(bucket):
            if k == key:                  # 键已存在，更新
                bucket[i] = (key, value)
                return
        bucket.append((key, value))
        if sum(len(b) for b in self.buckets) > 2 * len(self.buckets):
            self._grow()

    def get(self, key, default=None):
        for k, v in self.buckets[self._slot(key)]:
            if k == key:
                return v
        return default

    def _grow(self):
        """扩容：容量翻倍，所有元素重新哈希"""
        old = self.buckets
        self.buckets = [[] for _ in range(2 * len(old))]
        for bucket in old:
            for k, v in bucket:
                self.put(k, v)

t = MiniHashMap()
for i in range(1000):
    t.put(f"user{i}", i)
print(t.get("user7"), t.get("nobody"))   # 7 None
print(len(t.buckets))                    # 512
```

三个细节都值得盯住：

**定位靠算术，确认靠比较。** `_slot` 一步算出槽位，但槽内还要逐个比较 key——因为哈希函数只保证「同 key 同槽位」，不保证「不同 key 不同槽位」。O(1) 成立的前提是**每个槽平均只有常数个元素**。

**冲突可以被制造出来。** 假设槽位数 m = 10、key 都是整数，`10, 20, 30, 40` 的 `hash(k) % 10` 全是 0，四个元素挤进同一条链，查找退化成 O(n)。哈希函数的任务就是让这种聚集「看起来随机」。

**负载因子是生命线。** 定义 `α = 元素数 / 槽位数`。链地址法下，平均链长就是 α，查找期望 O(1 + α)：α = 0.75 时几乎总是一步命中，α = 10 时每次都要扫十个元素。所以 `put` 里盯着 α 超过阈值就翻倍扩容、全员重新哈希——1000 个元素最终把表撑到了 512 槽（翻了 6 次）。扩容单次 O(n)，但每次翻倍后要再攒一倍的新插入才轮到下一次，**均摊下来每次 put 仍是 O(1)**——与数组篇的倍增扩容是同一笔账。

## 4. 冲突的第二条路线：开放寻址法

链地址法要为每个元素付链表指针的开销。另一条路线是**开放寻址法**（open addressing）：所有元素都住在数组本尊里，撞车了就按规则「往后找下一个空位」：

```text
槽位数 m = 7，h'(k) = k % 7，线性探测：撞车就 +1 再试

插入 10, 22, 31, 4：
  10 -> 槽 3（空，入住）
  22 -> 槽 1（空，入住）
  31 -> 槽 3 被占 -> 槽 4 空，入住
  4  -> 槽 4 被占 -> 槽 5 空，入住

数组：[_ , 22, _, 10, 31, 4, _]
```

往后挪一格就是**线性探测**，它的软肋是**聚集**：连续占用的格子越长，新元素落进这段区域的概率越大，区域就越长——富者愈富。改进有二次探测（按 1, 4, 9 跳着试）与双重哈希（步长由第二个哈希函数决定），聚集更少但缓存局部性更差。工程上反而流行线性探测：连续内存对 CPU 缓存极友好，Python dict 与 Google 的 flat_hash_map 都是这条路。

开放寻址有一个反直觉的深坑：**删除不能把槽位清成「空」**。看这个事故：

```text
接上例，数组 [_, 22, _, 10, 31, 4, _]
删除 10：把槽 3 清成空
查找 31：从 h'(31)=3 开始探测 -> 槽 3 是空 -> 结论：31 不存在

但 31 明明在槽 4！
```

探测链被「假空」拦腰截断。修正：删除时放一个**「已删除」标记**，查找时跳过它继续走，插入时可以复用它。Python dict 内部同样用类 dummy 标记。这个小坑是手写开放寻址表的第一大 bug 来源，也是面试高频题。

两条路线的取舍与工业选择：

| 维度 | 链地址法 | 开放寻址法 |
| --- | --- | --- |
| 删除 | 直接摘链，方便 | 必须打标记 |
| 负载因子上限 | 无硬限制（超 1 也能活） | 必须 < 1，建议 < 0.7 |
| 缓存友好 | 中（链表离散） | 极好（数组连续） |
| 代表实现 | Java HashMap、Redis、Go map | Python dict、flat_hash_map |

顺带一个真实设计：Java HashMap 的桶内链表太长（达到 8）时会把链表转成红黑树，把最坏情况从 O(n) 压到 O(log n)——链地址法与树的合作，细节见 [树](/algorithm/080-Tree)。

## 5. 扩容的艺术：一次性 vs 渐进式

翻倍扩容有个隐患：那一瞬间要搬家全部 n 个元素，如果 n 上千万，服务会卡顿一大拍。单线程的 Redis 不能接受这种停顿，于是有了**渐进式 rehash**：

1. 触发扩容时只分配新表，旧表原样保留，同时服务；
2. 此后每次增删查，顺手把旧表的**一个槽位**搬到新表；
3. 搬迁期间查找先查新表、再查旧表；
4. 全部搬完，旧表退役。

代价是搬迁期间每次操作多查一张表，换来「没有哪一次操作特别贵」——又是均摊思想，只不过这次摊的是**延迟**而不只是总时间。理解了它，你就理解了 Redis 单线程却能扛住大流量的一个关键设计。

## 6. 调试实录：哈希表六大坑

坑 1：**用 2 的幂做模数**。除法哈希 `h(k) = k % m` 中，若 m = 1024，hash 值只取决于 key 的低 10 位——key 是 `0, 1024, 2044...` 这类规律数据时全部挤进同一槽。修正：m 取远离 2 的幂的质数（如 1009、10007），或换乘法哈希（Knuth 建议乘上黄金分割比后再取高位）。亲手复现见第 9 节实验 1。

坑 2：**开放寻址删除不打标记**。第 4 节的事故，探测链断裂、元素「凭空消失」。永远用 DELETED 标记，插入可复用、查找须跳过。

坑 3：**负载因子放任不管**。开放寻址在 α 接近 1 时探测次数按 1/(1-α) 爆炸：α=0.5 期望 2 次，α=0.9 期望 10 次，α=0.99 期望 100 次。阈值守则：链地址法 0.75，开放寻址 0.7（Java、Python 的默认值都是多年工业验证的结果）。

坑 4：**可变对象做键**。Python 里 `d[[1,2,3]]` 直接 TypeError（list 不可哈希）；更阴险的是自定义了 `__hash__` 的可变对象——入表后再修改内容，hash 变了，这个键就再也找不到了。规矩：键必须是不可变对象（str、tuple、frozenset、数值）。

坑 5：**扩容忘了重新哈希**。扩容后槽位数变了，`hash(key) % 新容量` 的结果普遍不同，必须全量重算。直接把旧槽数组拼到新数组上，等于把一张错位的表当正常表用，越查越离谱。

坑 6：**并发读写**。多线程裸写共享哈希表可能丢更新甚至死循环（Java 1.7 的 HashMap 扩容头插法就出过著名的死循环 bug）。用语言提供的并发容器（Java ConcurrentHashMap、Go sync.Map）或加锁。

## 7. 一致性哈希：把取模的坏消息修好

哈希表解决「一台机器内部怎么找」，分布式缓存还要回答「100 亿个 key 放哪台机器」。直觉方案是 `server = hash(key) % N`，但它有个致命伤：机器从 10 台扩到 11 台，几乎**所有** key 的映射都变了，缓存一夜清空，请求全部砸向数据库——缓存雪崩。

**一致性哈希**（Karger 等，1997）把哈希值空间弯成一个环：机器与 key 都哈希到环上，key 归顺时针遇到的下一台机器管。这样增删一台机器，只有环上相邻一段的 key 换主人，迁移量从「几乎全部」降到 K/N：

```python
import hashlib, bisect

class HashRing:
    def __init__(self, vnodes=100):
        self.ring, self.owner, self.vnodes = [], {}, vnodes

    def _h(self, s: str) -> int:
        return int(hashlib.md5(s.encode()).hexdigest(), 16)

    def add_node(self, name):
        for i in range(self.vnodes):          # 每台物理机拆成多个虚拟节点
            h = self._h(f"{name}#{i}")
            self.owner[h] = name
            bisect.insort(self.ring, h)

    def remove_node(self, name):
        for i in range(self.vnodes):
            h = self._h(f"{name}#{i}")
            self.owner.pop(h, None)
            idx = bisect.bisect_left(self.ring, h)
            if idx < len(self.ring) and self.ring[idx] == h:
                self.ring.pop(idx)

    def get_node(self, key) -> str:
        h = self._h(key)
        idx = bisect.bisect_right(self.ring, h)
        return self.owner[self.ring[idx % len(self.ring)]]

ring = HashRing()
for name in ["A", "B", "C"]:
    ring.add_node(name)
print(ring.get_node("user:42"))    # 始终得到同一台机器，除非该机器增删
```

虚拟节点（每台物理机在环上放 100 到 200 个分身）解决的是「机器少时分段不均」：分身越多，各机负责的弧长越接近。Memcached、Cassandra、Dynamo 等系统都以此为基础，展开见 [分布式系统](/cs-fundamentals/410-DistributedSystem)。

## 8. 哈希的概率亲戚：让一点错误换巨大空间

哈希思想往外延，长出一族「允许出错换空间」的结构，认识名字与取舍即可：

- **布隆过滤器**（Bloom Filter）：一个位数组加 k 个哈希函数。回答「肯定没有 / 可能有」——说没有就一定没有，说可能有是小概率冤枉。空间只要哈希表的几十分之一，代价是误判率。用于爬虫 URL 去重、防缓存穿透、磁盘存储引擎的 existence check。完整的推导、参数选择与实现见[布隆过滤器](/algorithm/220-BloomFilter)专篇；
- **布谷鸟哈希**（Cuckoo Hashing）：每个 key 有两个候选槽，插入撞车就把占用者踢去它的另一个候选槽（如布谷鸟借巢）。收益是查找**最坏**只查两个槽，O(1) 有保证；代价是负载因子上限约 50%、插入可能出现踢出循环；
- **Count-Min Sketch**：d 行计数器估计元素出现频率，只会高估不会低估，用于流式热门统计；
- **HyperLogLog**：固定十几 KB 内存估计「不同元素个数」（基数），误差约 1%，Redis 的 PF_COUNT 命令底层就是它——统计一亿 UV 不用再存一亿个 ID。

这一族结构的共同哲学：**问的问题稍作放松（允许小概率错 / 只求估计），资源需求就掉几个数量级**。

## 9. 修改实验

1. 复现坑 1：取 `keys = [i * 1024 for i in range(10000)]`，分别统计 `k % 1024` 与 `k % 1009` 的槽位分布（用 `collections.Counter`），前者全部落在一格、后者均匀铺开——这就是「模数远离 2 的幂」的铁证；
2. 量出负载因子的代价：给 MiniHashMap 加一个开关禁用扩容，分别在「8 槽塞 5000 元素」与「正常扩容到 8192 槽」两种状态下各做 1 万次 `get` 计时，比较差距并解释；
3. 把 MiniHashMap 的链地址改成线性探测（记得实现 DELETED 标记），用同一批 key 验证 put/get 行为一致，并对比删除 10、22、31 后再查找 4 的结果是否正确；
4. 用 `sys.getsizeof` 对比 `set(range(10**6))` 与 `list(range(10**6))` 的内存占用，体会哈希表「空间换时间」买的是什么。

## 10. 小练习

预测题（先写答案再验证）：槽位数 m = 10，`h(k) = k % 10`，依次插入 12、22、32。三个元素各落在哪个槽？此时查找 42 需要几次比较？这张表的 α 是多少？

修改题：用 MiniHashMap 写一个词频统计器：读入一段英文文本，输出出现次数前 5 的单词（提示：`put(word, old + 1)`；对照 `collections.Counter` 的结果验证）。再思考：`Counter` 底层是什么结构？

修 Bug 题：同事手写的开放寻址表偶发「查得到刚插入的，查不到插了很久的」，删除实现是 `self.keys[idx] = None`——指出病灶（探测链断裂），加上 DELETED 标记修复，并构造第 4 节那样的最小复现场景。

挑战题（不看提示）：字母异位词分组（LC-49）有两种键设计：排序后的字符串，或「26 个字母出现次数」的元组。分别实现，用 `["eat", "tea", "tan", "ate", "nat", "bat"]` 验证输出一致；再从「哈希计算代价」与「碰撞概率」两个角度比较两种键的优劣。

## 11. 什么时候应该 / 不应该用哈希表

应该：按 key 精确查找（用户名、URL、ID）、去重（set）、计数（Counter）、缓存（LRU 是哈希表 + 双链表，见 [链表](/algorithm/060-LinkedList) 第 8 节）、两数之和类「边遍历边查搭档」的题。

不应该：需要按顺序遍历、范围查询（「查出所有分数 60 到 80 的记录」）、找最大最小——这些是树与有序结构的主场：

| 维度 | 哈希表 | 平衡树 / 跳表 |
| --- | --- | --- |
| 平均查找 | O(1) | O(log n) |
| 最坏查找 | O(n)（冲突风暴） | O(log n) |
| 有序遍历 / 范围查询 | 不支持 | 支持 |
| 典型代表 | dict、unordered_map、HashMap | map、TreeMap、Redis zset |

数据库索引最终普遍选择 B+ 树而不是哈希索引，正是因为业务查询大量是范围查询——「平均更快」输给了「支持更多」，这是选型的经典一课。

## 12. 与之前和之后的知识的关系

- 往前：010 篇种下的「为什么有哈希表」在本文第 2 节兑现；数组篇的 O(1) 随机访问与倍增扩容是哈希表的物理底座与扩容蓝本；060 篇的链表与哨兵是链地址法的零件，LRU 是两结构合作的成品；
- 往后：[树](/algorithm/080-Tree) 是「要顺序就要付 log n」的另一极；[布隆过滤器](/algorithm/220-BloomFilter) 专篇展开概率判重；字符串篇的 Rabin-Karp 把滚动哈希用于匹配；
- 更远：Python dict 的紧凑布局（索引数组 + 按序条目数组）让 O(1) 与「保插入序」共存；数据库、缓存、分布式分片，处处是本文的放大版。

## 13. 官方文档与延伸资源

- Python dict 与集合的官方教程：https://docs.python.org/zh-cn/3/tutorial/datastructures.html#dictionaries
- hashlib（加密哈希，与本文表内哈希的区别）：https://docs.python.org/zh-cn/3/library/hashlib.html
- VisuAlgo: Hash Table（四种冲突策略可视化）：https://visualgo.net/en/hashtable
- 本站[算法题图鉴](/algorithms)收有本篇配套经典题：1 两数之和、49 字母异位词分组、128 最长连续序列、41 缺失的第一个正数、380 O(1) 插入删除随机元素、146 LRU 缓存、3 无重复字符的最长子串、560 和为 K 的子数组，均带思路与参考实现。

## 14. 自我检查

- 能说清「平均 O(1)、最坏 O(n)」各自在什么条件下发生；
- 能白板写出链地址法的 put/get 并解释扩容为什么是均摊 O(1)；
- 能画出开放寻址「删除不打标记导致查找失败」的最小事故现场；
- 能向别人解释一致性哈希解决什么问题、虚拟节点为什么存在；
- 能说出布隆过滤器「宁冤枉不放跑」的语义及其适用场景。

## 本章总结

哈希表用「算术定位」替代「比较查找」：hash(key) 变下标，一次算术直达；冲突用链地址或开放寻址收拾，负载因子决定一切性能。扩容靠倍增摊平代价，Redis 渐进式 rehash 进一步摊平延迟；分布式场景用一致性哈希把「改模数」的灾难变成相邻迁移。记住三件事：平均 O(1) 有前提（均匀、α 有界）、删除打标记、按 key 找东西时它是默认答案——除非你还要范围与顺序，那时请去树下。

## 下一步

进入 [树](/algorithm/080-Tree)：哈希表把顺序丢了才换来 O(1)；树把顺序留住了，代价是每次 O(log n)。二叉树、遍历的两种写法、二叉搜索树的查找插入删除——下一站的「有序」世界。
