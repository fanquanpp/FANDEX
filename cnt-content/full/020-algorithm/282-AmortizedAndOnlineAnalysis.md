---
order: 340
title: 摊还分析与在线算法
module: 'algorithm'
category: 计算机科学
difficulty: beginner
description: 聚合/记账/势能三方法、竞争分析与在线算法、数据流模型——对序列与不确定未来做保证
author: fanquanpp
updated: '2026-10-07'
related: []
prerequisites: []
---

## 知识点地图

- **知识类别**：摊还分析与在线算法——复杂度分析（010 篇讲单次操作的最坏/平均）之外的两种「序列视角」：摊还分析对操作序列给硬保证，竞争分析对「看不到未来的算法」给相对保证；数据流模型处理只能看一遍的输入。
- **解决什么问题**：动态数组偶尔一次 O(n) 的扩容为什么敢说 append 是 O(1)；缓存替换策略在「请求序列还没来完」时怎么评价好坏；流式数据（单遍、内存远小于数据量）怎么统计频率与基数。
- **什么时候用到**：设计/评审数据结构（扩容、缩容策略）；选缓存淘汰算法并说清它的理论地位；搭建单遍监控（Redis HyperLogLog、Count-Min Sketch 的原理层）。

## 1. 摊还分析：对操作序列做保证

单次操作的最坏代价会吓退使用者——动态数组 append 平时 O(1)，偶尔扩容 O(n)。摊还分析回答的问题是：**任意长度为 n 的操作序列，总代价除以 n 是多少**。它不涉及概率：给的是最坏序列下的平均。

三种经典方法（Sleator-Tarjan 1985 系统化，Tarjan 次年因此获图灵奖）：

### 1.1 聚合分析（aggregate）

算出 n 次操作的总代价上界 $T(n)$，摊还代价 = $T(n)/n$。

例：动态数组倍增扩容，n 次 append 的元素拷贝总数为

$$n + \frac{n}{2} + \frac{n}{4} + \cdots \leq 2n$$

所以总代价 $O(n)$，**append 摊还 O(1)**——这就是「偶尔的贵」被「大量的便宜」摊平的精确表述。

### 1.2 记账方法（accounting）

给每个操作预收「多一点的费」，便宜操作存起来的积分付昂贵操作的账。append 实际 1 次、收 3 次的费用：1 次写元素，2 次存起来；扩容时每个被搬元素动用存款。只要账上积分永不为负，总收费就是总代价的上界。

### 1.3 势能方法（potential）

把「存款」抽象成数据结构状态的函数 $\Phi$：

> 定义势能函数 $\Phi: \text{数据结构状态} \to \mathbb{R}_{\geq 0}$，满足 $\Phi(D_0) = 0$。操作的摊还代价 $\hat{c}_i = c_i + \Phi(D_i) - \Phi(D_{i-1})$，其中 $c_i$ 为实际代价。总摊还代价 $\sum \hat{c}_i = \sum c_i + \Phi(D_n) - \Phi(D_0) \geq \sum c_i$。

对动态数组取 $\Phi(D) = 2 \cdot \text{size} - \text{capacity}$：平时 append 让 $\Phi$ 增加 2（预收），扩容让 $\Phi$ 骤降（花存款）；只要 $\Phi$ 始终非负，摊还和就压住实际和。三种方法表达能力等价，选哪种取决于哪个更好算。

### 1.4 动态数组的完整实现与实验验证

```python
import math
from typing import Any, Iterator

class DynamicArray:
    """动态数组实现，演示摊还分析

    时间复杂度（摊还）：
        - append:     O(1) 摊还
        - pop:        O(1) 摊还
        - access:     O(1) 最坏
        - insert(0):  O(n) 摊还
        - delete(0):  O(n) 摊还
    """

    def __init__(self, capacity: int = 1):
        self._capacity = max(1, capacity)
        self._size = 0
        self._data = [None] * self._capacity
        self._copy_count = 0  # 统计元素拷贝次数

    def __len__(self) -> int:
        return self._size

    def __getitem__(self, i: int) -> Any:
        if i < 0:
            i += self._size
        if not 0 <= i < self._size:
            raise IndexError("index out of range")
        return self._data[i]

    def __setitem__(self, i: int, value: Any) -> None:
        if i < 0:
            i += self._size
        if not 0 <= i < self._size:
            raise IndexError("index out of range")
        self._data[i] = value

    def append(self, value: Any) -> None:
        """追加元素，必要时扩容"""
        if self._size == self._capacity:
            self._resize(self._capacity * 2)
        self._data[self._size] = value
        self._size += 1

    def _resize(self, new_capacity: int) -> None:
        """调整容量，统计元素拷贝"""
        new_data = [None] * new_capacity
        for i in range(self._size):
            new_data[i] = self._data[i]
            self._copy_count += 1
        self._data = new_data
        self._capacity = new_capacity

    def pop(self) -> Any:
        """弹出末尾元素，必要时缩容"""
        if self._size == 0:
            raise IndexError("pop from empty array")
        value = self._data[self._size - 1]
        self._data[self._size - 1] = None
        self._size -= 1
        # 缩容：当 size < capacity / 4 时，容量减半
        if self._size < self._capacity // 4 and self._capacity > 1:
            self._resize(max(1, self._capacity // 2))
        return value

    def __iter__(self) -> Iterator:
        for i in range(self._size):
            yield self._data[i]

def verify_amortized_analysis(n: int = 10000) -> None:
    """验证 append 的摊还 O(1) 性质

    聚合分析：n 次 append 总拷贝次数 < 2n
    """
    arr = DynamicArray()
    for i in range(n):
        arr.append(i)

    # 总拷贝次数应 < 2n（理论上 n + n/2 + n/4 + ... = 2n）
    print(f"n = {n}")
    print(f"实际拷贝次数: {arr._copy_count}")
    print(f"理论上界 (2n): {2 * n}")
    print(f"摊还代价 (拷贝次数/n): {arr._copy_count / n:.4f}")
    # 输出示例：摊还代价约 1-2，符合 O(1) 摊还

    # 验证势能函数 Φ(D) = 2*size - capacity 的非负性
    # 当 size > capacity/2 时 Φ > 0；扩容后 size = capacity/2，Φ = 0
    # 操作序列中 Φ 始终非负

verify_amortized_analysis(10000)
```

两个设计决策值得逐行咀嚼：

- **扩容取 2 倍而不是 1.5 倍或 +10**：倍数越大摊还代价越低但浪费峰值内存。任意固定倍数都保证摊还 O(1)；+固定值（如 +10）会让拷贝总数变成 $O(n^2)$，摊还 O(n)——这是新手最常犯的扩容策略错误；
- **缩容阈值取 1/4 而不是 1/2**：若 size < capacity/2 就减半，在边界附近做 append/pop 振荡会触发「扩了缩、缩了扩」的抖动，每次都是 O(n)——摊还保证被抖动击穿。留一半的迟滞区间（扩容在满时、缩容在 1/4 时）让两种操作无法相邻发生。

## 2. 在线算法与竞争分析

### 2.1 模型：决策时看不到未来

缓存淘汰、骑手接单、云资源预留都有一个共同结构：**决策必须现在做，而代价取决于还没到来的输入**。这类问题叫在线算法（online algorithm）问题。评价它不能套用最坏/平均——「最坏输入」对在线问题不公平且无指导意义，Sleator-Tarjan 引入**竞争分析**：

> 在线算法 ALG 是 c-竞争的，若对所有输入序列 $I$，$|\mathrm{ALG}(I)| \leq c \cdot |\mathrm{OPT}(I)| + b$，其中 OPT 为最优离线算法。

直觉：拿它和「开了上帝视角的最优算法」比，代价至多差 c 倍。

| 在线问题 | 算法 | 竞争比 |
| ---- | ---- | ---- |
| Paging（k-缓存） | LRU | k |
| Ski Rental（租借-购买） | 租 B-1 天后买 | 2 |
| Ski Rental（随机） | 指数分布 | $e/(e-1) \approx 1.58$ |
| k-Server（一般度量） | Work Function | k |
| k-Server（随机） | — | $O(\log^2 k)$ |

### 2.2 LRU 的 k-竞争与实现

```java
import java.util.*;

/**
 * LRU（Least Recently Used）缓存实现
 *
 * 竞争分析（Sleator-Tarjan 1985）：
 *   对容量 k 的缓存，LRU 是 k-竞争的
 *   即对任意请求序列 σ，cost(LRU, σ) ≤ k · cost(OPT, σ) + k
 *
 * 证明思路：
 *   将 σ 划分为 k-相位（k-phase），每个相位至多 k 个不同页面
 *   LRU 每相位至多 k 次未命中；OPT 每相位至少 1 次未命中
 *   故 cost(LRU) / cost(OPT) ≤ k
 */
public class LRUCache<K, V> {
    private final int capacity;
    private final Map<K, V> cache;
    private long hitCount = 0;
    private long missCount = 0;

    public LRUCache(int capacity) {
        this.capacity = capacity;
        // LinkedHashMap 按 access-order 维护，最近访问在末尾
        this.cache = new LinkedHashMap<K, V>(capacity, 0.75f, true) {
            @Override
            protected boolean removeEldestEntry(Map.Entry<K, V> eldest) {
                return size() > LRUCache.this.capacity;
            }
        };
    }

    public V get(K key) {
        V value = cache.get(key);
        if (value != null) {
            hitCount++;
            return value;
        }
        missCount++;
        return null;
    }

    public void put(K key, V value) {
        if (!cache.containsKey(key)) {
            missCount++;
        } else {
            hitCount++;
        }
        cache.put(key, value);
    }

    public long getHitCount() { return hitCount; }
    public long getMissCount() { return missCount; }

    public static void main(String[] args) {
        // 模拟 paging 请求序列
        int k = 3;  // 缓存容量
        int[] requests = {1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5};

        LRUCache<Integer, Boolean> lru = new LRUCache<>(k);
        for (int page : requests) {
            if (lru.get(page) == null) {
                lru.put(page, true);
            }
        }

        System.out.println("LRU 竞争比验证 (k = " + k + ")");
        System.out.println("命中: " + lru.getHitCount());
        System.out.println("未命中: " + lru.getMissCount());
        System.out.println("理论竞争比上界: " + k);
        // 输出：LRU 应是 3-竞争的
    }
}
```

证明思路的三行要点值得背下来：把请求序列切成「每个相位至多 k 个不同页面」的相位段；LRU 每相位至多 miss k 次（刚 miss 的页是最近使用，相位内不会再 miss 它）；OPT 每相位至少 miss 1 次（相位末的新页 OPT 也得装）。两式相除得 k。

**换成 FIFO 会怎样**：FIFO 不是任何常数的竞争（存在让它任意差的序列）——Belady 异常的极端版。这就是「选 LRU 不选 FIFO」的理论根据，而不是玄学。

### 2.3 确定性 vs 随机化，与 Yao 原理

| 问题 | 确定性竞争比 | 随机化竞争比 | 下界 |
| ---- | ---- | ---- | ---- |
| Paging | k | $O(\log^2 k)$（和谐算法） | $\Omega(\log k)$ |
| Ski Rental | 2 | $e/(e-1) \approx 1.58$ | $e/(e-1)$ |
| k-Server（一般度量） | k | $O(\log^2 k)$ | $\Omega(\log k)$ |
| 寻址（列表更新） | 2 | 1.58 | 1.58 |

随机化能显著改善在线算法的命运（Paging 从 k 降到 $\log^2 k$）。证明随机化下界的工具是 **Yao 原理**：构造一个输入分布，使任何确定性算法在该分布上的期望代价都不低于 c·OPT——于是随机算法无论怎么随机，期望上也占不到便宜。

**陷阱一（摊还分析误用平均情况）**：摊还分析对**任意**操作序列给保证、不涉及概率；平均情况需要假设输入分布（如均匀分布）。摊还分析的结果更强——最坏序列下的平均代价。说「append 平均是 O(1)」时先想清楚你指的是哪一个。

**陷阱二（竞争比下界忽略 Yao 原理）**：确定性算法的下界可以直接构造最坏输入；随机化算法的下界必须走 Yao 原理的分布构造路线，直接摆一个「最坏序列」是无效证明——随机化可能恰好躲开它。

## 3. 数据流模型：单遍、亚线性内存

流式场景的三重约束：数据只来一遍（不能回头）、内存远小于数据量（存不下全部）、要求近似答案可控误差。与前两节的关系：数据流算法的「误差界」思想和竞争分析一样，都是「放弃精确、换取可行性」。

### 3.1 Count-Min Sketch：频率估计

```python
import numpy as np
import mmh3  # MurmurHash3
from typing import List

class CountMinSketch:
    """Count-Min Sketch 频率估计算法

    空间复杂度：O(d * w) = O((1/ε) · log(1/δ))
    估计误差：|f̂ - f| ≤ ε·||f||_1，概率 ≥ 1 - δ

    应用：
        - 网络流量监控（按 IP 统计包数）
        - 搜索引擎热门查询
        - 推荐系统频率统计
    """

    def __init__(self, epsilon: float, delta: float):
        """
        epsilon: 频率估计误差上界（相对于总流量）
        delta:  估计失败概率
        """
        self.w = int(np.ceil(1 / epsilon))   # 列数
        self.d = int(np.ceil(np.log(1 / delta)))  # 行数（哈希函数数）
        self.table = np.zeros((self.d, self.w), dtype=np.int64)
        # 使用不同 seed 生成 d 个独立哈希函数
        self.seeds = [i * 31 + 17 for i in range(self.d)]

    def update(self, key: str, count: int = 1) -> None:
        """更新 key 的频率估计"""
        for i in range(self.d):
            j = mmh3.hash(key, self.seeds[i], signed=False) % self.w
            self.table[i][j] += count

    def estimate(self, key: str) -> int:
        """估计 key 的频率（上界）"""
        return min(
            self.table[i][mmh3.hash(key, self.seeds[i], signed=False) % self.w]
            for i in range(self.d)
        )

# 测试
cms = CountMinSketch(epsilon=0.01, delta=0.01)
print(f"Sketch 大小: {cms.d} 行 × {cms.w} 列 = {cms.d * cms.w} 计数器")

# 模拟数据流
stream = ["apple", "banana", "apple", "cherry", "apple", "banana"] * 1000
for item in stream:
    cms.update(item)

# 估计频率
for item in ["apple", "banana", "cherry", "grape"]:
    print(f"  {item}: 估计 = {cms.estimate(item)}, 真实 = {stream.count(item)}")
# 输出示例：估计值略大于真实值（Count-Min 总是高估）
```

结构要点：d 行独立哈希把哈希碰撞的影响稀释——某 key 的估计取 d 个计数器的**最小值**，只有 d 个哈希全部撞上高频 key 误差才失控，概率压到 $\delta^d$ 级别。**它总是高估不会低估**（每个计数器都被碰撞者推高），这个单向性在「找热门」场景恰好无害：高估不会让真热门漏网。

### 3.2 单遍统计 distinct 元素

「这个小时来了多少独立访客」——精确计数要存全部 ID，流式做法用基数估计（HyperLogLog 思路）：给每个元素哈希，观察哈希值的二进制前导零模式。哈希均匀时「出现 k 个前导零」的概率是 $2^{-k}$，看到过最大前导零为 k 就估计基数约 $2^k$；多桶取调和平均收紧方差。Redis 的 `PFADD/PFCOUNT` 用 12 KB 内存估计任意基数的误差约 1.2%——精确存一亿个 UUID 需要 GB 级，近似换来六个数量级的内存差。

## 4. 不同场景下的例子

**例一：动态数组扩容均摊 O(1)（真实工程场景，与 020 篇互证）**。本仓库 algorithm 模块 020-ArrayAndDynamicArray 对扩容做过实测：Python list 的 append 在扩容瞬间单次耗时跳升数百倍，但 n 次平均稳定在常数——这正是聚合分析预言的曲线。读性能火焰图时，append 尖刺不应被当成性能问题，除非扩容倍数选错（如 +10 导致 O(n^2) 总量）。

**例二：MRU/LRU 缓存的竞争比选型**。CDN 节点容量有限，淘汰策略在请求到来时必须当场决定驱逐谁。LRU 有 k-竞争保证；自造的「随机淘汰」无任何竞争保证；FIFO 存在任意差序列。面试被问「为什么用 LRU」，答「时间局部性 + 唯一有竞争保证的简单策略」比答「它是局部性启发式」高一个层级。

**例三：单遍统计 distinct 元素**。埋点系统统计日活：事件流经 Kafka 进来不能回放，内存只够 MB 级。HyperLogLog（Redis 原生支持）单遍 + 亚线性内存给出 1% 级误差的独立访客数——这就是数据流模型「误差换可行」的日常形态。

**例四：Ski Rental 决策**。要不要买滑雪板（B 元）还是每次租（1 元/天）？不知道总共滑几次——在线问题。确定性最优策略「租满 B-1 天再买」保证总支出不超过最优的 2 倍；随机化（按指数分布抽样购买时机）可到 1.58 倍。云资源「按需付费 vs 包年」是同一道题的商业版。

## 动手实践

**练习 1（三方法互证）**：对 1.4 节的 DynamicArray，分别用聚合法（数拷贝次数）、记账法（给 append 收 3 元、算扩容时积分够不够）、势能法（验证 $\Phi = 2 \cdot size - capacity$ 非负）推出 append 摊还 O(1)，写出三条推理。

**提示**：记账法的收费要覆盖「最坏时被搬一次」的支出；势能法检查扩容前后 $\Phi$ 的变化量等于本次操作贵出来的部分。

**练习 2（缩容抖动实验）**：把 pop 的缩容阈值从 1/4 改成 1/2，在 size 与 capacity 相等的边界做 append/pop 交替 1000 次，统计拷贝总次数；再换回 1/4 对比。

**提示**：改 1/2 后每次 pop 都可能触发缩容、每次 append 都可能触发扩容——观察 _copy_count 是否线性暴涨。

**练习 3（LRU vs FIFO 竞争比实测）**：构造一个让 FIFO 表现任意差、LRU 表现正常的序列（循环访问 k+1 个页面），对比两者 miss 数随循环轮数的增长。

**提示**：k 容量下循环访问 k+1 个页：FIFO 每轮全 miss（Belady 异常的极端形态），LRU 也全 miss——需要换成「热页 + 扫描」混合序列才看得出差距，试着自己构造。

<details>
<summary>参考实现（先自己动手，再看这里）</summary>

```python
# 练习 2：抖动实验
def jitter_experiment(threshold: int, n: int = 1000) -> int:
    import importlib, sys
    sys.path.insert(0, '.')
    arr = DynamicArray(4)
    # 先填满到触发边界
    for i in range(4):
        arr.append(i)
    original = DynamicArray._resize
    count = {'copies': 0}
    def counting_resize(self, new_capacity):
        before = self._size
        original(self, new_capacity)
        count['copies'] += before
    DynamicArray._resize = counting_resize
    for _ in range(n):
        arr.append(0)   # 越界触发扩容
        arr.pop()       # 触发缩容（threshold=2 时 size=cap/2 即缩）
    DynamicArray._resize = original
    return count['copies']

print(jitter_experiment(2))   # 阈值 1/2：拷贝次数随 n 线性增长
# 阈值 1/4 的原实现：append/pop 交替不触发 resize，拷贝 0 次

# 练习 3：LRU vs FIFO 对比（热页 + 扫描序列）
from collections import OrderedDict

def miss_count(policy: str, k: int, seq) -> int:
    cache, misses = OrderedDict(), 0
    for x in seq:
        if x in cache:
            cache.move_to_end(x)
            if policy == 'FIFO':
                pass               # FIFO 命中不改变顺序
        else:
            misses += 1
            if len(cache) >= k:
                cache.popitem(last=False)
        cache[x] = True
    return misses

# 序列：热页 1 反复访问，穿插冷扫描 2..100
seq = [1] * 3 + list(range(2, 100)) + [1] * 3 + list(range(2, 100))
print('LRU :', miss_count('LRU', 10, seq))    # 热页 1 大多命中
print('FIFO:', miss_count('FIFO', 10, seq))   # 热页被扫描挤走，miss 更多
```

</details>

## 参考与致谢

- Sleator & Tarjan,「Amortized efficiency of list update and paging rules」, Communications of the ACM 28(2), 1985, DOI:10.1145/2786.2793（摊还分析与竞争分析的奠基论文，本文定义与竞争比表源自该文）
- Borodin & El-Yaniv,《Online Computation and Competitive Analysis》, Cambridge University Press, 1998（在线算法标准教材）
- Cormen et al.,《Introduction to Algorithms》第 17 章 Amortized Analysis（CLRS, MIT Press）
- Count-Min Sketch: Cormode & Muthukrishnan, 2005；HyperLogLog: Flajolet et al., 2007
- 本文代码承接本仓库原「算法理论」篇 §5.3/§5.4/§5.7 既有材料（仓库内部素材），重组为教学体；与 010-AlgorithmAnalysisBasics（单次操作复杂度）、020-ArrayAndDynamicArray（扩容实测）互为参照。
