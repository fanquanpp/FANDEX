---
order: 30
title: "排序算法：从 $O(n^2)$ 到 $O(n \\log n)$"
module: 'algorithm'
category: 计算机科学
difficulty: intermediate
description: "以「给 10 万条成绩单排序」引入：先写出能跑的冒泡与插入排序，实测理解为什么插入排序是 $O(n^2)$ 里的实用冠军；再亲手实现归并与快排两个 $O(n \\log n)$ 主力，用决策树论证比较排序下界，讲透稳定性与自定义比较器，最后看 LC-56/179/315 三个真实应用与七个高频坑。"
author: fanquanpp
updated: '2026-09-29'
related:
  - 'algorithm/035-AdvancedSortAndLinearSort'
  - 'algorithm/010-AlgorithmAnalysisBasics'
  - 'algorithm/020-ArrayAndDynamicArray'
  - 'algorithm/120-DivideAndConquer'
  - 'algorithm/090-HeapAndPriorityQueue'
  - 'algorithm/170-BinarySearchAlgorithms'
prerequisites:
  - 'algorithm/010-AlgorithmAnalysisBasics'
  - 'algorithm/020-ArrayAndDynamicArray'
---

## 前置知识

- 已完成 [算法分析基础](/algorithm/010-AlgorithmAnalysisBasics)：会用大 O 描述代价；
- 了解数组特性与 `[len(list)]` 式内存开销（[数组与动态数组](/algorithm/020-ArrayAndDynamicArray)）。

## 学习目标

读完本文你将能够：

1. 亲手写出冒泡、选择、插入三个 $O(n^2)$ 算法，并说清为什么插入排序在三者中最实用；
2. 亲手实现归并排序与快速排序，解释分治如何把 $O(n^2)$ 压到 $O(n \log n)$，以及快排最坏退化的原因与随机化补救；
3. 用决策树模型论证「任何比较排序最坏至少 $\Omega(n \log n)$ 次比较」，判断归并/堆排是否已达最优；
4. 判断一个排序算法是否稳定，并能说出稳定性在什么真实场景里是硬需求；
5. 写出满足全序要求的自定义比较器，解决合并区间、最大数拼接这类真实题；
6. 识别七个高频坑：快排取首元素退化、归并空间泄漏、比较器不满足全序、mid 溢出等。

预计 90 到 120 分钟。

## 1. 你现在要解决什么问题

期末考完，教务系统要给 10 万条成绩记录排序；游戏服务器要给玩家排行榜每分钟重排一次；你写的小工具要按文件大小整理下载目录。排序是计算机科学里被调用最频繁的基本操作之一——Knuth 在 TAOCP 第三卷整卷讲它。它的任务一句话说清：把一组数据按某个关键字重新排成全序。

问题的麻烦不在「会排」，而在「怎么排得又对又快」：

- 10 万条数据，$O(n^2)$ 是 100 亿次比较，$O(n \log n)$ 只有约 170 万次——差近 6000 倍；
- 成绩单里大量同分：同分的两个人，谁排在前面？如果需求是「同分按交卷时间先后」，你用的排序算法必须**稳定**；
- 数据在内存装不下时（外部排序），策略完全不同。

本篇先动手把 $O(n^2)$ 三兄弟和 $O(n \log n)$ 两大主力写出来、测出来，再回答「为什么 $n \log n$ 是比较排序的极限」。堆排序、希尔排序与计数/基数/桶排序、工业级混合排序（introsort/Timsort）在[进阶与线性排序篇](/algorithm/035-AdvancedSortAndLinearSort)展开。

## 2. 最小可运行实验：三种朴素排序实测

先别管理论，把三个 $O(n^2)$ 算法写出来跑：

```python
import random, time

def bubble_sort(a):                      # 冒泡：相邻逆序就交换，大的"冒"到末尾
    a = a[:]
    n = len(a)
    for i in range(n - 1):
        swapped = False
        for j in range(n - 1 - i):       # 每轮后 i 个已就位
            if a[j] > a[j + 1]:
                a[j], a[j + 1] = a[j + 1], a[j]
                swapped = True
        if not swapped:                  # 一轮无交换 = 已有序，提前收工
            break
    return a

def selection_sort(a):                   # 选择：每轮选剩余部分的最小值放到前面
    a = a[:]
    n = len(a)
    for i in range(n):
        m = i
        for j in range(i + 1, n):
            if a[j] < a[m]:
                m = j
        a[i], a[m] = a[m], a[i]          # 注意：远距离交换，可能跨越相等元素
    return a

def insertion_sort(a):                   # 插入：把新元素插进前面已排好的部分
    a = a[:]
    for i in range(1, len(a)):
        key = a[i]
        j = i - 1
        while j >= 0 and a[j] > key:     # 边比较边右移，找到插入点
            a[j + 1] = a[j]
            j -= 1
        a[j + 1] = key
    return a

data = [random.randint(0, 9999) for _ in range(2000)]
for f in (bubble_sort, selection_sort, insertion_sort):
    t = time.perf_counter()
    f(data)
    print(f.__name__, f"{time.perf_counter() - t:.3f}s")
```

预期输出（相对量级稳定，绝对值因机器而异）：

```text
bubble_sort: 0.152s
selection_sort: 0.089s
insertion_sort: 0.071s
```

三个都是 $O(n^2)$，常数差了不止一倍。放大到 n = 20000，时间大约再涨 100 倍——这就是平方级的残忍。再看「基本有序」的数据，差距反过来了：

```python
almost_sorted = list(range(20000))
for i in range(0, 20000, 100):            # 每 100 个元素里塞一个乱序
    almost_sorted[i] = random.randint(0, 19999)

for f in (bubble_sort, insertion_sort, selection_sort):
    t = time.perf_counter()
    f(almost_sorted)
    print(f.__name__, f"{time.perf_counter() - t:.4f}s")
```

预期输出（相对量级稳定）：

```text
bubble_sort: 0.019s       # 每轮无交换就提前退出，近乎线性
insertion_sort: 0.011s    # 每个错位元素只移动几步
selection_sort: 0.542s    # 无视有序性，照样比较 n^2/2 次
```

三个算法里，**插入排序是唯一在工业代码里真实服役的 $O(n^2)$ 算法**：常数最小、缓存友好、对「基本有序」的数据近乎线性（自适应）、还稳定。Timsort 和 introsort 在小区间（通常 n < 16 到 64）时都回退到它。选择排序每轮交换是「远距离对调」，会跨越相等元素，因此**不稳定**——这是它输给插入排序的另一处；冒泡几乎总是最慢的（交换次数太多），记住它主要是为了教学与「相邻交换」这个思想。

## 3. 发生了什么：分治如何干掉平方项

插入排序慢的根源：每个元素都要和**前面所有**元素比一遍才能找到位置，元素之间的信息一点没积累。$O(n \log n)$ 两大主力的共同思路是**分治**——把「排好 10000 个」化成「排好两个 5000 个再合并」，递归往下切，问题规模对数级下降。

### 3.1 归并排序：先分后合

```python
def merge_sort(a):
    if len(a) <= 1:
        return a
    mid = len(a) // 2
    left = merge_sort(a[:mid])           # 左半排好
    right = merge_sort(a[mid:])          # 右半排好
    return _merge(left, right)           # 两个有序表合并成一个

def _merge(left, right):
    out = []
    i = j = 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:          # 等号给左半：这是稳定性的关键
            out.append(left[i]); i += 1
        else:
            out.append(right[j]); j += 1
    out.extend(left[i:])
    out.extend(right[j:])
    return out

print(merge_sort([5, 2, 8, 1, 9, 3]))    # [1, 2, 3, 5, 8, 9]
```

合并两个有序表只需线性时间，递归深度是 $\log n$ 层、每层总合并代价 $O(n)$，总计 $O(n \log n)$——**最好、平均、最坏都是**，没有退化情形。代价是 $O(n)$ 辅助数组：它不是原地排序。归并排序诞生于 1945 年 von Neumann 的 EDVAC 报告，是最早的 $O(n \log n)$ 排序；今天它是「稳定 + 最坏保证」需求的默认答案，也是外部排序（内存装不下时多路归并）的核心。

### 3.2 快速排序：原地分区

```python
import random

def quick_sort(a, lo=0, hi=None):
    if hi is None:
        hi = len(a) - 1
    if lo < hi:
        p = _partition(a, lo, hi)
        quick_sort(a, lo, p - 1)
        quick_sort(a, p + 1, hi)
    return a

def _partition(a, lo, hi):
    r = random.randint(lo, hi)           # 随机选主元，防最坏退化
    a[r], a[hi] = a[hi], a[r]
    pivot = a[hi]                        # Lomuto 分区：最后一个作主元
    i = lo - 1                           # i 是"小于区"的右边界
    for j in range(lo, hi):
        if a[j] <= pivot:
            i += 1
            a[i], a[j] = a[j], a[i]
    a[i + 1], a[hi] = a[hi], a[i + 1]    # 主元归位
    return i + 1

print(quick_sort([5, 2, 8, 1, 9, 3]))    # [1, 2, 3, 5, 8, 9]
```

快排与归并顺序相反：先**分区**（partition）后递归。一轮分区让主元落在最终位置，左边全不大于它、右边全不小于它。平均 $O(n \log n)$：期望分析的关键在于每次分区不必完美对半，只要划分比例是常数（比如 1:9），递归深度仍是 $O(\log n)$；随机化主元后，「每次都切得极偏」的概率随深度指数衰减，最坏 $O(n^2)$ 只剩理论意义。

快排的工程优势：原地（额外空间只有递归栈 $O(\log n)$）、缓存友好、常数小——所以它是 C++ `std::sort`（内省排序主体）与 Java 基础类型排序（Dual-Pivot Quicksort，Java 7 起）的骨架。弱点也明确：不稳定；主元选得差（如对已序数组固定取首/尾元素）会退化到 $O(n^2)$，且递归深度同步爆炸。

同属分治的第三种思路——**堆排序**（建堆后反复取最大）做到原地 + 最坏 $O(n \log n)$，但不稳定、缓存不友好，见[堆与优先队列](/algorithm/090-HeapAndPriorityQueue)与[进阶篇](/algorithm/035-AdvancedSortAndLinearSort)。

## 4. 讲为什么：n log n 是比较排序的极限吗

对「只靠比较决定顺序」的排序，答案是：最坏至少 $\Omega(n \log n)$ 次比较。论证用**决策树**：一次比较有两个分支，整棵树的每个叶子对应一种输入排列。n 个元素有 $n!$ 种排列，算法必须能区分所有排列，所以树至少有 $n!$ 个叶子；二叉树高度 h 最多 $2^h$ 个叶子，于是 $2^h \geq n!$，即 $h \geq \log_2 n!$。用 Stirling 近似 $n! \approx (n/e)^n\sqrt{2\pi n}$，得 $h = \Omega(n \log n)$——树高就是最坏比较次数。

这个下界只对**比较排序**成立。计数排序、基数排序、桶排序不比较元素大小，而是利用「元素是有限范围整数」这类性质直接定位，能做到 $O(n+k)$ 级别——它们是突破下界的合法出路，代价是牺牲通用性。详见[进阶与线性排序篇](/algorithm/035-AdvancedSortAndLinearSort)。

## 5. 稳定性：什么时候它是硬需求

**稳定**：相等的元素排序后保持原有相对顺序。逐一核对本文算法：冒泡（相邻交换，稳定）、插入（只越过严格更大的，稳定）、归并（合并时相等取左半，稳定）、选择（远距离交换，不稳定）、快排（分区远距离交换，不稳定）、堆排（不稳定）。

它什么时候重要？看一个真实的两级排序需求——先按分数降序，同分按交卷时间升序：

```python
records = [("B", 90, "14:05"), ("A", 95, "14:01"), ("C", 90, "14:03")]  # (姓名, 分数, 交卷时间)
records.sort(key=lambda r: r[2])         # 第一遍：按交卷时间
records.sort(key=lambda r: -r[1])        # 第二遍：按分数（稳定，不破坏第一遍）
```

第二遍排序若不稳定，同分记录的交卷顺序会被打乱，两级排序技巧直接失效。Python 的 `sorted`/`list.sort`（Timsort）、Java 的对象排序、C++ 的 `stable_sort` 都是稳定排序；C++ `std::sort` 不保证稳定。数据库索引、电子表格多列排序同理——**凡是要「多关键字分步排」的场景，稳定性都是硬需求**。

## 6. 自定义比较：三个真实应用

排序的算法本身很少要你手写，面试与工程里真正常写的是**比较函数**。三个经典题：

**LC-56 合并区间**：区间按起点排序后，重叠区间必然相邻，一遍扫描合并即可——「排序预处理 + 线性扫描」是最大的一类用法：

```python
def merge(intervals):
    intervals.sort(key=lambda x: x[0])
    out = []
    for s, e in intervals:
        if out and s <= out[-1][1]:      # 与上一区间重叠
            out[-1][1] = max(out[-1][1], e)
        else:
            out.append([s, e])
    return out

print(merge([[1,3],[2,6],[8,10],[15,18]]))  # [[1, 6], [8, 10], [15, 18]]
```

**LC-179 最大数**：非负整数拼出最大数。比较规则不是数值大小，而是「ab 与 ba 谁拼在前」：自定义 `cmp_to_key(lambda a, b: -1 if a+b > b+a else 1)` 排序后拼接。注意全零输入 `[0, 0]` 要输出 `"0"` 而不是 `"00"`。

**LC-315 计算右侧小于当前元素**：逆序对变体。归并排序合并时，右半元素被取出时，左半剩余的每个元素都比它大——顺手统计即可，把「排序」变成「排序时顺便收集信息」的范式。归并统计逆序对是归并排序最重要的衍生技巧。

写比较器的一条铁律：**必须满足全序**——反对称（cmp(a,b) 与 cmp(b,a) 符号相反）、传递。返回值与相等判定自相矛盾的比较器，在 Python 会得到错误结果，在 C++ 的 `std::sort` 里是未定义行为（可能越界崩溃），这类 bug 极难排查。

## 7. 全景对比与选型

| 算法 | 平均 | 最坏 | 空间 | 稳定 | 一句话定位 |
| ---- | ---- | ---- | ---- | ---- | ---- |
| 冒泡 | $O(n^2)$ | $O(n^2)$ | $O(1)$ | 是 | 教学用，工程回避 |
| 选择 | $O(n^2)$ | $O(n^2)$ | $O(1)$ | 否 | 交换最少（至多 n-1 次） |
| 插入 | $O(n^2)$ | $O(n^2)$ | $O(1)$ | 是 | 小数据与基本有序数据的实用王 |
| 归并 | $O(n \log n)$ | $O(n \log n)$ | $O(n)$ | 是 | 要稳定或最坏保证时选它 |
| 快排 | $O(n \log n)$ | $O(n^2)$ | $O(\log n)$ | 否 | 通用基础类型默认主力 |
| 堆排 | $O(n \log n)$ | $O(n \log n)$ | $O(1)$ | 否 | 内存苛刻时的最坏保证 |
| 计数/基数/桶 | $O(n+k)$ 级 | 视实现 | $O(n+k)$ | 是 | 值域有限的整数/定长串 |

选型口诀：**默认用语言内置排序**（Python Timsort、C++ introsort、Java Dual-Pivot），它们的混合策略已经替你权衡过一切；手写排序只出现在三种场合——面试、需要自定义比较语义、以及教学/嵌入式等极端受限环境。需要稳定选归并族，只要最坏保证选堆排或归并，值域有限想上 O(n) 看进阶篇的计数/基数/桶。

## 8. 调试实录：七个高频坑

坑 1：**快排固定取首/尾元素作主元**。对已序或逆序输入每轮只切掉一个元素，退化 $O(n^2)$，递归深度同步到 n 直接爆栈。随机化或三数取中。

坑 2：**归并排序每次 merge 新建辅助数组**。递归里频繁分配释放，性能被内存管理吃掉。预处理一个全局缓冲区复用。

坑 3：**归并的合并写 `left[i] < right[j]`（无等号）**。相等时先取右半，稳定性悄悄丢失，两级排序技巧随之失效。

坑 4：**插入排序误用于链表的「下标访问」写法**。链表没有 O(1) 随机访问，二分插入对它无意义；链表排序的正确姿势是归并（快慢指针找中点）。

坑 5：**比较器不满足全序**。`cmp(a,b) = a.score - b.score` 在 score 是浮点或可能溢出的整数时不再反对称，C++ 直接未定义行为。浮点分数改显式三分支比较。

坑 6：**`mid = (lo + hi) // 2` 的整数溢出**。Python 无忧，C/Java 里 lo+hi 可能溢出，写成 `mid = lo + (hi - lo) / 2`。

坑 7：**Python 里 `lst = lst.sort()`**。`list.sort` 原地排序返回 `None`，`sorted(lst)` 才返回新列表。把 `None` 赋回去是新手最常见的静默 bug。

## 9. 修改实验

1. 给快排换成三路分区（小于/等于/大于主元三段）：对「大量重复键」的数组（如 10 万个 0 到 9 的随机数）对比普通快排，验证三路版接近线性；
2. 把归并排序改成自底向上（先两两合并、再四四合并），去掉递归，用 `[5,2,8,1,9,3]` 与随机大数组验证与递归版结果一致；
3. 实测验证稳定性：构造 1000 条 `(分数, 序号)` 记录，分别用 `sorted` 与手写快排按分数排序，检查同分记录的序号顺序是否保序；
4. 给插入排序加二分查找定位插入点（二分插入排序），统计「比较次数」与「移动次数」，解释为什么比较次数降到 $O(n \log n)$ 但总复杂度仍是 $O(n^2)$（移动没省）。

## 10. 小练习

预测题（先算再验证）：对 `[3, 1, 4, 1, 5, 9, 2, 6]` 手动执行一轮快速分区（主元取 6），写出分区后数组形态与主元最终位置。

修改题：把 LC-179 的比较器补全——用 `functools.cmp_to_key` 实现拼接比较，并处理 `[0, 0]` 输出 `"0"` 的边界。

修 Bug 题：同事写的归并排序对 100 万元素偶尔「答案对但特别慢」，定位到 `_merge` 在递归函数内部 `buffer = [0] * len(a)`。指出问题（每层递归重复分配），给出复用缓冲区的改法。

挑战题（不看提示）：LC-315 计算右侧小于当前元素的个数。用归并排序在合并阶段统计，示例 `[5,2,6,1]` 应输出 `[2,1,1,0]`；先手动模拟 `[2, 1]` 与 `[3, 2, 1]` 的合并统计过程再写代码。

## 11. 什么时候应该 / 不应该自己写排序

应该：面试与笔试（考的是分区、合并、下界论证这些思维）；自定义比较语义（LC-179 的拼接序、多关键字业务序）；嵌入式等无标准库的极端环境。

不应该：任何生产业务代码——语言内置排序是几十年优化的结晶。也不应该在「值域有限的整数」上死磕比较排序，先看计数/基数/桶是否适用。

## 12. 与之前和之后的知识的关系

- 往前：数组的随机访问与搬移代价（020 篇）解释了插入排序移动元素的代价与快排原地分区的可行性；递归（140 篇）是分治的实现载体；
- 往后：[进阶与线性排序篇](/algorithm/035-AdvancedSortAndLinearSort)接手堆排、希尔与线性时间排序、introsort/Timsort 的混合策略；[二分查找](/algorithm/170-BinarySearchAlgorithms)建立在有序数组上——排序是查找的前置投资；[分治算法](/algorithm/120-DivideAndConquer)把归并/快排当作分治的两个原型案例；[堆与优先队列](/algorithm/090-HeapAndPriorityQueue)给出「只想要前 K 大不必全排序」的更好答案。

## 13. 官方文档与延伸资源

- Python 排序 HOW TO（Timsort 与稳定性）：https://docs.python.org/zh-cn/3/howto/sorting.html
- C++ std::sort 与 stable_sort：https://zh.cppreference.com/w/cpp/algorithm/sort
- VisuAlgo 排序可视化：https://visualgo.net/zh/sorting
- 历史原始文献：von Neumann 1945（归并）、Hoare 1961（快排，CACM）；完整论文线索见进阶篇延伸资源。

## 14. 自我检查

- 能白板写出插入排序，并说出它在三个 $O(n^2)$ 里胜出的三个理由（常数小、自适应、稳定）；
- 能手写归并的合并过程，并指出保证稳定性的那一行；
- 能解释快排随机化防的是什么，以及为什么平均 $O(n \log n)$ 里「不必完美对半」；
- 能用决策树论证比较排序下界，并说出这个下界对计数排序为什么不成立；
- 给一个业务需求，能判断稳定性是否是硬需求，并选对算法与内置函数。

## 本章总结

排序的要义是两笔账：$O(n^2)$ 三兄弟里插入排序凭常数、自适应与稳定性成为唯一实用者；分治把递归深度做成对数、每层线性代价，归并与快排双双达到 $O(n \log n)$——而决策树证明这个界是所有比较排序的宿命，除非放弃比较（计数/基数/桶）。稳定姓决定多关键字排序是否可行，随机化主元决定快排是否只停留在理论最坏。生产代码默认交给内置排序，你手写它的场合，是面试、自定义序，以及理解这一切的本身。

## 下一步

进入[进阶与线性排序篇](/algorithm/035-AdvancedSortAndLinearSort)：堆排序如何用 $O(1)$ 空间拿到最坏 $O(n \log n)$，希尔排序如何用增量序列改造插入排序，以及计数、基数、桶三个突破下界的线性排序与 introsort/Timsort 的工业级混合术。
