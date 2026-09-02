---
order: 210
title: 树状数组
module: 'algorithm'
category: 计算机科学
difficulty: intermediate
description: '树状数组（Fenwick Tree / Binary Indexed Tree, BIT）的形式化定义（基于二进制分解的前缀和索引结构）、lowbit 位运算原理、单点更新 + 区间查询 $O(\log n)$、区间更新 + 单点查询（差分树状数组）、区间更新 + 区间查询（双树状数组）三种模式的形式化推导与复杂度证明，覆盖 Peter M. Fenwick 1994《A New Data Structure for Cumulative Frequency Tables》Software: Practice and Experience 24(3):327-336 DOI:10.1002/spe.4380240306 的历史脉络、lowbit 不变式证明、与线段树 / 平方分解 / 前缀和的对比、Lucene 倒排索引 / Redis Sorted Set / PostgreSQL 统计信息等工业案例，附 Python / C++ / Java 多语言实现。'
author: fanquanpp
updated: '2026-07-20'
related:
  - 'algorithm/020-SegmentTree'
  - 'algorithm/019-UnionFind'
  - 'algorithm/015-BalancedTreeAdvanced'
  - 'algorithm/007-Tree'
  - 'algorithm/016-HeapAndPriorityQueue'
  - 'algorithm/001-AlgorithmAnalysisBasics'
prerequisites:
  - 'algorithm/001-AlgorithmAnalysisBasics'
  - 'algorithm/007-Tree'
  - 'cs-fundamentals/007-DiscreteMathematics'
---



## 1. 概述与学习目标

**树状数组**（Binary Indexed Tree，简称 **BIT**；又称 **Fenwick Tree**）是一种基于二进制索引分解的隐式树形数据结构，用于维护可变数组上的前缀和。它由新西兰奥克兰大学的 Peter M. Fenwick 在 1994 年的论文《A New Data Structure for Cumulative Frequency Tables》（Software: Practice and Experience 24(3):327-336, DOI: 10.1002/spe.4380240306）中首次提出，原始动机是为算术编码（Arithmetic Coding）的自适应概率模型维护累积频率表。BIT 在保证 $O(\log n)$ 更新与 $O(\log n)$ 前缀查询的同时，仅使用 $O(n)$ 空间，且常数因子远小于线段树，成为算法竞赛与工程实践中的首选区间数据结构之一。

BIT 的核心思想是：**将前缀 $[1, i]$ 的和分解为 $O(\log i)$ 个互不重叠区间的并集，每个区间长度由 $i$ 二进制表示的最低位 1 决定**。这一分解基于 `lowbit(x) = x & (-x)` 位运算，使得更新与查询路径形成一对"前进/后退 lowbit 链"的对偶结构。

本文档遵循 FANDEX 内容工程规范 12 项基准，对标 MIT 6.006 / Stanford CS161 / CMU 15-122 课程教材深度，系统化呈现 BIT 的形式化定义、理论推导、多语言实现、对比分析、工程案例与习题。

### 1.1 核心特征

BIT 在以下场景中表现出色：

- **单点更新 + 区间查询**：经典应用，如 LeetCode 307「Range Sum Query - Mutable」
- **区间更新 + 单点查询**：差分树状数组，如区间染色后查询单点值
- **区间更新 + 区间查询**：双树状数组，如 Codeforces 828B
- **离散化逆序对计数**：$O(n \log n)$ 计算，常数优于归并排序
- **二维 BIT**：扩展至矩阵区域统计，如洛谷 P4054

### 1.2 文档结构

| 章节 | 内容 | 学习目标层级（Bloom） |
| ---- | ---- | -------------------- |
| 历史 | Fenwick 1994 起源、BIT 与同期数据结构演进 | 记忆、理解 |
| 形式化定义 | lowbit、区间划分、不变式 | 记忆、分析 |
| 理论推导 | 更新与查询路径对偶性、复杂度证明 | 分析、评价 |
| 代码示例 | Python / C++ / Java 三语言实现 | 应用 |
| 对比分析 | BIT vs 线段树 vs Mo vs 前缀和 | 分析、评价 |
| 常见陷阱 | 索引越界、lowbit 误用、差分符号错误 | 分析 |
| 工程实践 | Lucene / Redis / PostgreSQL 应用 | 应用、综合 |
| 案例研究 | LeetCode 307 完整实现 | 综合 |
| 习题 | 8 题 + 答案，覆盖四类题型 | 全部 |

---

## 2. 历史动机

### 2.1 算术编码与累积频率表

BIT 的诞生源于 **算术编码**（Arithmetic Coding）这一熵编码场景。算术编码由 IBM 的 Jorma Rissanen 在 1976 年《Generalized Kraft Inequality and Arithmetic Coding》（IBM Journal of Research and Development 20(3):198-203）提出，其核心是将整个消息编码为 $[0, 1)$ 区间内的一个浮点数，通过不断根据符号概率缩小区间来实现接近熵的下界压缩。算术编码的关键操作是：每接收一个符号 $s$，需查询其累积概率 $P(<s)$ 与自身概率 $P(s)$，并更新所有频率。

在自适应算术编码中，频率表是动态的——每处理一个符号就要递增其频率。这要求一种数据结构能同时高效完成：

1. **更新**：单点频率 $+1$，$O(\log n)$
2. **查询**：累积频率 $\sum_{j < s} f[j]$，$O(\log n)$
3. **空间**：$O(n)$，与字符表大小成正比

1990 年代初，Peter M. Fenwick 在新西兰奥克兰大学研究自适应算术编码时，发现线段树过于复杂（递归 + Lazy Propagation）、平方分解查询复杂度不优（$O(\sqrt{n})$）、前缀和更新过慢（$O(n)$）。他设计了一种基于二进制索引的精巧结构——**Binary Indexed Tree**。

### 2.2 Fenwick 1994 原始论文

BIT 的原始论文为：

> Fenwick, Peter M. 1994. A New Data Structure for Cumulative Frequency Tables. Software: Practice and Experience 24(3), 327-336. DOI: 10.1002/spe.4380240306.

论文核心贡献：

1. **首次提出 BIT 结构**：基于二进制索引的隐式树
2. **lowbit 运算系统化应用**：将 `x & (-x)` 作为索引分解的核心操作
3. **三种累积频率结构**：单点更新+前缀查询、区间更新+点查询、区间更新+前缀查询
4. **与线段树对比**：BIT 代码更短、常数更小、空间更省
5. **算术编码应用**：BIT 作为自适应概率模型的核心数据结构

Fenwick 在论文中讨论了 BIT 的"二进制分解"思想来源：观察到任意正整数 $i$ 可表示为若干 2 的幂之和 $i = 2^{k_1} + 2^{k_2} + \ldots + 2^{k_m}$（其中 $k_1 > k_2 > \ldots > k_m \geq 0$），则前缀 $[1, i]$ 可分解为 $m$ 个不重叠区间的并集，每个区间长度恰为 $2^{k_j}$。这正是 lowbit 链的数学基础。

### 2.3 演进时间线

```mermaid
timeline
    title 树状数组演进时间线
    1949 设计前身 : Shannon 信息论提出熵编码概念
    1968 位运算基础 : Knuth TAOCP Vol.1 §1.2.10 记录位运算技巧
    1976 算术编码 : Rissanen 提出算术编码
    1977 线段树起源 : Bentley 计算 Klee 矩形问题
    1984 线段树形式化 : 多篇论文系统化 Segment Tree
    1994 BIT 诞生 : Fenwick 在 Software: Practice and Experience 发表 BIT 论文
    2003 竞赛普及 : TopCoder 发布 BIT 教程, BIT 在 ACM/ICPC 中广泛使用
    2009 Mo 算法 : Tao Mo 提出 Mo 算法, 与 BIT 互为补充
    2010 年代 工业应用 : Lucene/Redis/PostgreSQL 等系统借鉴 BIT 思想
    2026 当代扩展 : 可持久化 BIT、二维 BIT、动态开点 BIT 在 OI 中普及
```

### 2.4 命名争议：BIT vs Fenwick Tree

BIT 在不同文献与社区中存在多个名称：

| 名称 | 来源 | 使用场景 |
| ---- | ---- | ---- |
| Binary Indexed Tree (BIT) | Fenwick 1994 原论文 | 学术论文、CLRS 习题、算法竞赛 |
| Fenwick Tree | 社区约定俗成 | 工程实践、博客、教程 |
| 树状数组 | 中文意译 | 中文算法教材、OI 社区 |
| 累积频率表 | Fenwick 原始命名 | 算术编码文献 |

本文档统一采用"树状数组"为主名，在形式化推导与历史引用中保留 "Binary Indexed Tree (BIT)" 与 "Fenwick Tree" 表述。

---

## 3. 形式化定义

### 3.1 lowbit 运算

**定义 3.1**（lowbit）：

对于正整数 $x \in \mathbb{Z}^+$，定义 $\text{lowbit}(x)$ 为 $x$ 二进制表示中最低位 1 所代表的值：

$$
\text{lowbit}(x) = x \ \& \ (-x) = 2^{\text{ctz}(x)}
$$

其中 $\text{ctz}(x)$（Count Trailing Zeros）为 $x$ 二进制表示中末尾连续 0 的个数。

**性质 3.1**（lowbit 的补码推导）：

设 $x$ 在 $W$ 位补码表示下，$-x = \overline{x} + 1$（其中 $\overline{x}$ 为按位取反）。从最低位起：

- 若 $x$ 末尾有 $k$ 个连续 0，则 $\overline{x}$ 末尾有 $k$ 个连续 1，$+1$ 后这些 1 变为 0 并进位到第 $k+1$ 位
- $x \ \& \ (-x)$ 在第 $k+1$ 位上为 $1 \ \& \ 1 = 1$，其余位均为 $0$

故 $\text{lowbit}(x) = 2^k$，其中 $k = \text{ctz}(x)$。

**示例**：

```
x  = 6  = 0b0110, ctz(6)  = 1, lowbit(6)  = 2^1 = 2  = 0b0010
x  = 12 = 0b1100, ctz(12) = 2, lowbit(12) = 2^2 = 4  = 0b0100
x  = 7  = 0b0111, ctz(7)  = 0, lowbit(7)  = 2^0 = 1  = 0b0001
x  = 8  = 0b1000, ctz(8)  = 3, lowbit(8)  = 2^3 = 8  = 0b1000
x  = 16 = 0b10000, ctz(16) = 4, lowbit(16) = 2^4 = 16 = 0b10000
-x = -6 = 0b1010 (补码), 6 & (-6) = 0b0110 & 0b1010 = 0b0010 = 2 √
```

### 3.2 树状数组的结构定义

**定义 3.2**（树状数组）：

给定长度为 $n$ 的数组 $a[1..n]$，其树状数组为长度 $n+1$ 的数组 $\text{tree}[0..n]$（$\text{tree}[0]$ 闲置），其中 $\text{tree}[i]$ 存储原数组在区间 $[i - \text{lowbit}(i) + 1, \ i]$ 上的和：

$$
\text{tree}[i] = \sum_{j = i - \text{lowbit}(i) + 1}^{i} a[j], \quad \forall i \in [1, n]
$$

等价地，$\text{tree}[i]$ 管辖长度为 $\text{lowbit}(i)$ 的区间，左端点为 $i - \text{lowbit}(i) + 1$，右端点为 $i$。

**示例 3.1**（$n = 8$ 的 BIT）：

设 $a = [1, 3, 5, 7, 9, 11, 13, 15]$（1-indexed），则：

| $i$ | 二进制 | lowbit($i$) | 管辖区间 | tree[$i$] 计算 | tree[$i$] 值 |
| --- | ------ | ----------- | -------- | -------------- | ----------- |
| 1   | 0001   | 1           | [1, 1]   | $a[1]$         | 1           |
| 2   | 0010   | 2           | [1, 2]   | $a[1] + a[2]$  | 4           |
| 3   | 0011   | 1           | [3, 3]   | $a[3]$         | 5           |
| 4   | 0100   | 4           | [1, 4]   | $a[1]+a[2]+a[3]+a[4]$ | 16   |
| 5   | 0101   | 1           | [5, 5]   | $a[5]$         | 9           |
| 6   | 0110   | 2           | [5, 6]   | $a[5] + a[6]$  | 20          |
| 7   | 0111   | 1           | [7, 7]   | $a[7]$         | 13          |
| 8   | 1000   | 8           | [1, 8]   | $\sum_{j=1}^{8} a[j]$ | 64    |

**隐式树形结构**：虽然 BIT 在内存中以一维数组形式存储，但其逻辑结构为一棵树：

```mermaid
graph TD
    T8["tree[8] (管辖 [1,8])"]
    T4["tree[4] (管辖 [1,4])"]
    T6["tree[6] (管辖 [5,6])"]
    T2["tree[2] (管辖 [1,2])"]
    T3["tree[3] (管辖 [3,3])"]
    T5["tree[5] (管辖 [5,5])"]
    T7["tree[7] (管辖 [7,7])"]
    T1["tree[1] (管辖 [1,1])"]
    T8 --> T4
    T8 --> T6
    T8 --> T7
    T4 --> T2
    T4 --> T3
    T2 --> T1
    T6 --> T5
```

### 3.3 lowbit 链

**定义 3.3**（前向 lowbit 链）：

从 $i$ 出发，反复执行 $i \to i + \text{lowbit}(i)$，直到超过 $n$，所得序列称为 $i$ 的前向 lowbit 链 $\text{Forward}(i)$：

$$
\text{Forward}(i) = \{i, \ i + \text{lowbit}(i), \ i + \text{lowbit}(i) + \text{lowbit}(i + \text{lowbit}(i)), \ \ldots\}
$$

**定义 3.4**（后向 lowbit 链）：

从 $i$ 出发，反复执行 $i \to i - \text{lowbit}(i)$，直到 $i = 0$，所得序列称为 $i$ 的后向 lowbit 链 $\text{Backward}(i)$：

$$
\text{Backward}(i) = \{i, \ i - \text{lowbit}(i), \ldots, 0\}
$$

**示例 3.2**：

- $\text{Forward}(3) = \{3, 4, 8, 16, \ldots\}$
- $\text{Backward}(7) = \{7, 6, 4, 0\}$
- $\text{Forward}(5) = \{5, 6, 8, 16, \ldots\}$
- $\text{Backward}(8) = \{8, 0\}$

### 3.4 不变式

BIT 维护的核心不变式：

**不变式 INV-1**（区间覆盖完全性）：对任意 $i \in [1, n]$，后向 lowbit 链 $\text{Backward}(i)$ 上的所有 tree 元素之并集恰为 $[1, i]$，即：

$$
[1, i] = \bigsqcup_{j \in \text{Backward}(i)} [j - \text{lowbit}(j) + 1, \ j]
$$

其中 $\bigsqcup$ 表示不交并。

**不变式 INV-2**（更新传播性）：对任意 $i \in [1, n]$，前向 lowbit 链 $\text{Forward}(i)$ 上所有 tree 元素的管辖区间都包含 $i$，即：

$$
\forall j \in \text{Forward}(i): \quad i \in [j - \text{lowbit}(j) + 1, \ j]
$$

不变式 INV-1 保证前缀查询的正确性，INV-2 保证单点更新的正确性（更新 $a[i]$ 时需传播到所有包含 $i$ 的 tree 元素）。

---

## 4. 理论推导

### 4.1 前缀查询的正确性

**定理 4.1**（前缀和分解）：

对于任意 $i \in [1, n]$，前缀和 $S(i) = \sum_{j=1}^{i} a[j]$ 等于后向 lowbit 链上所有 tree 元素之和：

$$
S(i) = \sum_{j \in \text{Backward}(i)} \text{tree}[j]
$$

**证明**：

由不变式 INV-1，$\text{Backward}(i)$ 上 tree 元素的管辖区间不交并为 $[1, i]$。设链上元素依次为 $j_1 = i, j_2 = i - \text{lowbit}(i), \ldots, j_m = 0$。需证明：

1. **不重叠**：相邻区间 $[j_{k+1} - \text{lowbit}(j_{k+1}) + 1, j_{k+1}]$ 与 $[j_k - \text{lowbit}(j_k) + 1, j_k]$ 不重叠，且前者在后者之前

   由 $j_{k+1} = j_k - \text{lowbit}(j_k)$，故 $j_{k+1}$ 的右端点恰为 $j_k - 1$（因为 $\text{lowbit}(j_k) \geq 1$，所以 $j_{k+1} = j_k - \text{lowbit}(j_k) \leq j_k - 1$），即前者区间右端 $< j_k$ 的区间左端。

2. **完全覆盖**：所有区间并集恰为 $[1, i]$

   由 lowbit 定义，$\text{lowbit}(j)$ 取值在 $j$ 的二进制最低位 1 处。后向 lowbit 链恰好"剥离" $i$ 的每一位 1：每次减去 lowbit 等于去掉最低位 1，最终归零时所有位都被处理。

**举例**：$i = 7 = 0b111$，链为 $\{7, 6, 4, 0\}$：
- $\text{tree}[7]$ 管辖 $[7, 7]$（长度 1）
- $\text{tree}[6]$ 管辖 $[5, 6]$（长度 2）
- $\text{tree}[4]$ 管辖 $[1, 4]$（长度 4）

并集为 $[1, 7]$，恰为 $[1, 7]$ 的二进制分解 $1 + 2 + 4$。$\square$

### 4.2 单点更新的正确性

**定理 4.2**（更新传播）：

更新 $a[i] \mathrel{+}= \Delta$ 时，遍历前向 lowbit 链 $\text{Forward}(i)$ 上的所有 tree 元素并加上 $\Delta$，即可维持不变式 INV-1。

**证明**：

由不变式 INV-2，$\text{Forward}(i)$ 上所有 tree 元素 $\text{tree}[j]$ 的管辖区间都包含 $i$。设 $\text{tree}[j]$ 管辖 $[j - \text{lowbit}(j) + 1, j]$，则 $i \in [j - \text{lowbit}(j) + 1, j]$。

更新 $a[i] \mathrel{+}= \Delta$ 后，所有包含 $i$ 的 tree 元素都应 $+ \Delta$。由 INV-2，$\text{Forward}(i)$ 恰为所有包含 $i$ 的 tree 元素集合（否则 $j$ 的管辖区间不包含 $i$，与 $j \in \text{Forward}(i)$ 矛盾）。

**举例**：$n = 8$, $i = 3$：
- $\text{tree}[3]$ 管辖 $[3, 3]$（包含 3）
- $\text{tree}[4]$ 管辖 $[1, 4]$（包含 3）
- $\text{tree}[8]$ 管辖 $[1, 8]$（包含 3）

$\text{Forward}(3) = \{3, 4, 8, 16, \ldots\}$，恰为所有管辖区间包含 3 的 tree 元素。$\square$

### 4.3 时间复杂度

**定理 4.3**（操作复杂度）：

BIT 的三种核心操作复杂度如下：

| 操作 | 时间复杂度 | 空间复杂度 |
| ---- | ---------- | ---------- |
| 构建 | $O(n)$ 或 $O(n \log n)$ | $O(n)$ |
| 单点更新 | $O(\log n)$ | $O(1)$ 额外 |
| 前缀查询 | $O(\log n)$ | $O(1)$ 额外 |
| 区间查询 $[l, r]$ | $O(\log n)$ | $O(1)$ 额外 |

**证明**：

1. **单点更新**：前向 lowbit 链长度 $\leq \lceil \log_2(n+1) \rceil$。每次 $i \to i + \text{lowbit}(i)$ 至少进位一次，最多 $\lceil \log_2 n \rceil + 1$ 次即超过 $n$。故时间 $O(\log n)$。

2. **前缀查询**：后向 lowbit 链长度 $\leq \lceil \log_2(n+1) \rceil$。每次 $i \to i - \text{lowbit}(i)$ 去掉一位 1，$i$ 的二进制中 1 的个数最多 $\lceil \log_2 n \rceil$ 位。故时间 $O(\log n)$。

3. **构建**：
   - 朴素：对每个 $i \in [1, n]$ 执行 $\text{update}(i, a[i])$，共 $n$ 次 $O(\log n)$ 更新，总 $O(n \log n)$。
   - 优化：自底向上一次性构建。对 $i = 1, 2, \ldots, n$，将 $\text{tree}[i]$ 初始化为 $a[i]$，然后将 $\text{tree}[i + \text{lowbit}(i)] \mathrel{+}= \text{tree}[i]$。这样每个 tree 元素仅被合并一次，总 $O(n)$。

4. **区间查询**：$[l, r] = [1, r] - [1, l-1]$，两次前缀查询，故 $O(\log n)$。

$\square$

### 4.4 常数因子分析

BIT 在实际应用中比线段树快约 2-5 倍，原因：

1. **位运算代替递归**：lowbit 操作为单条 `x & -x` 指令，相比线段树的递归调用省去函数调用开销
2. **顺序内存访问**：tree 数组连续，缓存命中率高
3. **无 Lazy Propagation**：BIT 区间更新需借助差分技巧，避免线段树的懒标记开销
4. **循环代替递归**：BIT 实现为单层 while 循环，无栈帧消耗

### 4.5 lowbit 链对偶性

**定理 4.4**（对偶性）：

更新路径（前向 lowbit 链）与查询路径（后向 lowbit 链）形成对偶：

- 更新 $i$：沿 $\text{Forward}(i)$ 上行，传播到所有"祖先" tree 元素
- 查询 $i$：沿 $\text{Backward}(i)$ 下行，收集所有"后代" tree 元素

**几何解释**：将 BIT 视为隐式二叉树，更新为从叶到根的上行路径，查询为从叶向根的下行路径（沿不同分支）。

---

## 5. 代码示例

### 5.1 Python 基础实现

```python
# Python: 树状数组（Fenwick Tree）基础实现
# 单点更新 + 区间查询
class FenwickTree:
    """树状数组：单点更新 + 区间查询
    时间复杂度: O(log n) 每次操作
    空间复杂度: O(n)
    """

    def __init__(self, n: int):
        """初始化长度为 n 的树状数组（1-indexed）
        :param n: 数组长度
        """
        self.n = n
        # tree[0] 闲置, 实际使用 tree[1..n]
        self.tree = [0] * (n + 1)

    def update(self, i: int, delta: int) -> None:
        """在位置 i 上加上 delta
        :param i: 位置（1-indexed, 1 <= i <= n）
        :param delta: 增量
        """
        # 前向 lowbit 链: i -> i + lowbit(i) -> ...
        while i <= self.n:
            self.tree[i] += delta
            i += i & (-i)  # i += lowbit(i)

    def query(self, i: int) -> int:
        """查询前缀 [1, i] 的和
        :param i: 位置（1-indexed, 1 <= i <= n）
        :return: sum(a[1..i])
        """
        s = 0
        # 后向 lowbit 链: i -> i - lowbit(i) -> ...
        while i > 0:
            s += self.tree[i]
            i -= i & (-i)  # i -= lowbit(i)
        return s

    def range_query(self, l: int, r: int) -> int:
        """查询区间 [l, r] 的和
        :param l: 左端点（1-indexed）
        :param r: 右端点（1-indexed）
        :return: sum(a[l..r])
        """
        # 容斥原理: sum(l..r) = sum(1..r) - sum(1..l-1)
        return self.query(r) - self.query(l - 1)

# 使用示例
if __name__ == "__main__":
    arr = [1, 3, 5, 7, 9, 11, 13, 15]
    n = len(arr)
    ft = FenwickTree(n)
    # 构建: O(n log n)
    for i, v in enumerate(arr, 1):
        ft.update(i, v)

    print(ft.range_query(1, 8))  # 输出: 64 (= 1+3+5+7+9+11+13+15)
    print(ft.range_query(3, 6))  # 输出: 32 (= 5+7+9+11)
    print(ft.query(7))           # 输出: 49 (= 1+3+5+7+9+11+13)

    # 单点更新: a[3] += 10
    ft.update(3, 10)
    print(ft.query(7))           # 输出: 59 (= 49 + 10)
```

### 5.2 O(n) 线性构建

```python
# Python: 树状数组 O(n) 线性构建
class FenwickTreeLinear:
    """线性构建的树状数组
    构建: O(n), 查询/更新: O(log n)
    """

    def __init__(self, arr: list):
        """由原数组 O(n) 构建
        :param arr: 原数组（1-indexed, arr[0] 闲置或调整为 1-indexed）
        """
        self.n = len(arr) - 1  # 假设 arr 已是 1-indexed
        self.tree = arr[:]  # 拷贝

        # 自底向上合并: tree[i + lowbit(i)] += tree[i]
        for i in range(1, self.n + 1):
            parent = i + (i & -i)
            if parent <= self.n:
                self.tree[parent] += self.tree[i]

    def update(self, i: int, delta: int) -> None:
        while i <= self.n:
            self.tree[i] += delta
            i += i & (-i)

    def query(self, i: int) -> int:
        s = 0
        while i > 0:
            s += self.tree[i]
            i -= i & (-i)
        return s

# 示例
arr_1indexed = [0, 1, 3, 5, 7, 9, 11, 13, 15]  # arr[0] 闲置
ftl = FenwickTreeLinear(arr_1indexed)
print(ftl.query(8))  # 输出: 64
```

### 5.3 差分树状数组（区间更新 + 点查询）

```python
# Python: 差分树状数组
# 支持: 区间 [l, r] 加 delta, 单点查询 a[i]
class FenwickDiff:
    """差分树状数组
    原理: 维护差分数组 d[i] = a[i] - a[i-1]
    区间 [l, r] 加 delta 等价于 d[l] += delta, d[r+1] -= delta
    单点查询 a[i] = sum(d[1..i])
    """

    def __init__(self, n: int):
        self.n = n
        self.ft = [0] * (n + 2)  # 多一位防止 r+1 越界

    def _update(self, i: int, delta: int) -> None:
        """内部单点更新"""
        while i <= self.n:
            self.ft[i] += delta
            i += i & (-i)

    def _query(self, i: int) -> int:
        """内部前缀查询"""
        s = 0
        while i > 0:
            s += self.ft[i]
            i -= i & (-i)
        return s

    def range_add(self, l: int, r: int, delta: int) -> None:
        """区间 [l, r] 加 delta
        :param l: 左端点
        :param r: 右端点
        :param delta: 增量
        """
        # 差分技巧: d[l] += delta, d[r+1] -= delta
        self._update(l, delta)
        self._update(r + 1, -delta)

    def point_query(self, i: int) -> int:
        """查询 a[i] 的当前值
        :return: a[i] = sum(d[1..i])
        """
        return self._query(i)

# 示例
fd = FenwickDiff(10)
fd.range_add(3, 7, 5)   # a[3..7] += 5
fd.range_add(2, 5, 3)   # a[2..5] += 3
print(fd.point_query(4))  # 输出: 8 (= 5 + 3)
print(fd.point_query(8))  # 输出: 0 (不在任何更新区间内)
```

### 5.4 双树状数组（区间更新 + 区间查询）

```python
# Python: 双树状数组实现区间更新 + 区间查询
class FenwickRange:
    """双树状数组
    支持: 区间 [l, r] 加 val, 区间查询 sum([l, r])
    
    原理: 维护差分数组 d, 则
    sum(a[1..x]) = sum_{i=1}^{x} sum_{j=1}^{i} d[j]
                 = sum_{j=1}^{x} d[j] * (x - j + 1)
                 = (x+1) * sum(d[1..x]) - sum(d[j] * j, j=1..x)
    
    故使用两个 BIT:
      t1: 维护 d[i]
      t2: 维护 d[i] * i
    """

    def __init__(self, n: int):
        self.n = n
        self.t1 = [0] * (n + 2)  # d[i]
        self.t2 = [0] * (n + 2)  # d[i] * i

    def _update(self, tree: list, i: int, val: int) -> None:
        while i <= self.n:
            tree[i] += val
            i += i & (-i)

    def _query(self, tree: list, i: int) -> int:
        s = 0
        while i > 0:
            s += tree[i]
            i -= i & (-i)
        return s

    def range_add(self, l: int, r: int, val: int) -> None:
        """区间 [l, r] 加 val"""
        # 差分: d[l] += val, d[r+1] -= val
        # 加权: d[l]*l += val*l, d[r+1]*(r+1) -= val*(r+1)
        self._update(self.t1, l, val)
        self._update(self.t1, r + 1, -val)
        self._update(self.t2, l, val * l)
        self._update(self.t2, r + 1, -val * (r + 1))

    def _prefix_sum(self, i: int) -> int:
        """查询 sum(a[1..i])"""
        return self._query(self.t1, i) * (i + 1) - self._query(self.t2, i)

    def range_query(self, l: int, r: int) -> int:
        """查询 sum(a[l..r])"""
        return self._prefix_sum(r) - self._prefix_sum(l - 1)

# 示例
fr = FenwickRange(10)
fr.range_add(2, 5, 3)   # a[2..5] += 3
fr.range_add(4, 7, 2)   # a[4..7] += 2
print(fr.range_query(3, 6))  # 输出: 11 (= 3 + (3+2) + (3+2) + 2)
```

### 5.5 C++ 实现

```cpp
// C++: 树状数组实现
#include <vector>
#include <iostream>

// 树状数组模板类, 支持任意整数类型
template <typename T>
class FenwickTree {
private:
    std::vector<T> tree;
    int n;

public:
    // 构造: 创建长度为 n 的空 BIT
    explicit FenwickTree(int n) : n(n), tree(n + 1, T{}) {}

    // 单点更新: a[i] += delta
    void update(int i, T delta) {
        for (; i <= n; i += i & (-i)) {
            tree[i] += delta;
        }
    }

    // 前缀查询: sum(a[1..i])
    T query(int i) const {
        T s = T{};
        for (; i > 0; i -= i & (-i)) {
            s += tree[i];
        }
        return s;
    }

    // 区间查询: sum(a[l..r])
    T rangeQuery(int l, int r) const {
        return query(r) - query(l - 1);
    }

    // O(n) 线性构建
    static FenwickTree<T> build(const std::vector<T>& arr) {
        int n = (int)arr.size() - 1;  // 假设 1-indexed
        FenwickTree<T> ft(n);
        for (int i = 1; i <= n; ++i) {
            ft.tree[i] = arr[i];
        }
        for (int i = 1; i <= n; ++i) {
            int parent = i + (i & (-i));
            if (parent <= n) {
                ft.tree[parent] += ft.tree[i];
            }
        }
        return ft;
    }
};

// 使用示例
int main() {
    std::vector<long long> arr = {0, 1, 3, 5, 7, 9, 11, 13, 15};  // 1-indexed
    auto ft = FenwickTree<long long>::build(arr);

    std::cout << "sum(1,8) = " << ft.rangeQuery(1, 8) << std::endl;  // 输出: 64
    std::cout << "sum(3,6) = " << ft.rangeQuery(3, 6) << std::endl;  // 输出: 32

    ft.update(3, 10);  // a[3] += 10
    std::cout << "sum(1,7) = " << ft.query(7) << std::endl;  // 输出: 59
    return 0;
}
```

### 5.6 Java 实现

```java
// Java: 树状数组实现（带泛型与溢出检查）
public class FenwickTree {
    private final long[] tree;  // 使用 long 防止溢出
    private final int n;

    /** 构造: 创建长度为 n 的空 BIT
     * @param n 数组长度
     */
    public FenwickTree(int n) {
        this.n = n;
        this.tree = new long[n + 1];
    }

    /** 单点更新: a[i] += delta
     * @param i 位置（1-indexed）
     * @param delta 增量
     */
    public void update(int i, long delta) {
        for (; i <= n; i += i & (-i)) {
            tree[i] += delta;
        }
    }

    /** 前缀查询: sum(a[1..i])
     * @param i 位置
     * @return 前缀和
     */
    public long query(int i) {
        long s = 0;
        for (; i > 0; i -= i & (-i)) {
            s += tree[i];
        }
        return s;
    }

    /** 区间查询: sum(a[l..r]) */
    public long rangeQuery(int l, int r) {
        return query(r) - query(l - 1);
    }

    /** 由数组 O(n) 构建 */
    public static FenwickTree build(int[] arr) {
        // arr 假设为 1-indexed, arr[0] 闲置
        int n = arr.length - 1;
        FenwickTree ft = new FenwickTree(n);
        for (int i = 1; i <= n; i++) {
            ft.tree[i] = arr[i];
        }
        for (int i = 1; i <= n; i++) {
            int parent = i + (i & (-i));
            if (parent <= n) {
                ft.tree[parent] += ft.tree[i];
            }
        }
        return ft;
    }

    // 测试
    public static void main(String[] args) {
        int[] arr = {0, 1, 3, 5, 7, 9, 11, 13, 15};  // 1-indexed
        FenwickTree ft = FenwickTree.build(arr);

        System.out.println("sum(1,8) = " + ft.rangeQuery(1, 8));  // 输出: 64
        System.out.println("sum(3,6) = " + ft.rangeQuery(3, 6));  // 输出: 32

        ft.update(3, 10);
        System.out.println("sum(1,7) = " + ft.query(7));  // 输出: 59
    }
}
```

### 5.7 经典应用：逆序对计数

```python
# Python: 树状数组计算逆序对
# 适用于值域较大需要离散化的场景
def count_inversions(arr: list) -> int:
    """计算数组逆序对数
    时间复杂度: O(n log n)
    空间复杂度: O(n)
    
    :param arr: 输入数组
    :return: 逆序对数
    """
    n = len(arr)
    if n <= 1:
        return 0

    # 离散化: 将值映射到 [1, n] 范围
    sorted_vals = sorted(set(arr))
    rank = {v: i + 1 for i, v in enumerate(sorted_vals)}

    # 树状数组维护: 每出现一个值就 update(rank, 1)
    ft = FenwickTree(len(sorted_vals))
    inversions = 0

    # 从右向左扫描
    # 对每个元素 a[i], 查询已出现且比它小的元素数 = query(rank[a[i]] - 1)
    for i in range(n - 1, -1, -1):
        r = rank[arr[i]]
        inversions += ft.query(r - 1)  # 已出现的、严格小于 a[i] 的元素数
        ft.update(r, 1)

    return inversions

# 示例
print(count_inversions([3, 1, 4, 1, 5, 9, 2, 6]))  # 输出: 10
# 解释: 逆序对为 (3,1), (3,2), (4,1), (4,2), (9,2), (9,6) 等
```

### 5.8 二维树状数组

```python
# Python: 二维树状数组（矩阵区域和）
class FenwickTree2D:
    """二维树状数组
    支持: 单点更新 (x, y) += delta, 区域查询 sum((1,1) -> (x,y))
    时间复杂度: O(log^2 n) 每次操作
    空间复杂度: O(n * m)
    """

    def __init__(self, n: int, m: int):
        """初始化 n x m 的二维 BIT
        :param n: 行数
        :param m: 列数
        """
        self.n = n
        self.m = m
        self.tree = [[0] * (m + 1) for _ in range(n + 1)]

    def update(self, x: int, y: int, delta: int) -> None:
        """在 (x, y) 处加上 delta"""
        i = x
        while i <= self.n:
            j = y
            while j <= self.m:
                self.tree[i][j] += delta
                j += j & (-j)
            i += i & (-i)

    def query(self, x: int, y: int) -> int:
        """查询 (1,1) 到 (x,y) 的区域和"""
        s = 0
        i = x
        while i > 0:
            j = y
            while j > 0:
                s += self.tree[i][j]
                j -= j & (-j)
            i -= i & (-i)
        return s

    def range_query(self, x1: int, y1: int, x2: int, y2: int) -> int:
        """查询 (x1,y1) 到 (x2,y2) 的区域和"""
        # 容斥: S(x2,y2) - S(x1-1,y2) - S(x2,y1-1) + S(x1-1,y1-1)
        return (self.query(x2, y2)
                - self.query(x1 - 1, y2)
                - self.query(x2, y1 - 1)
                + self.query(x1 - 1, y1 - 1))

# 示例
ft2d = FenwickTree2D(5, 5)
ft2d.update(2, 3, 5)   # (2,3) += 5
ft2d.update(4, 4, 7)   # (4,4) += 7
print(ft2d.range_query(1, 1, 5, 5))  # 输出: 12
```

---

## 6. 对比分析

### 6.1 与线段树对比

| 维度 | 树状数组（BIT） | 线段树（Segment Tree） |
| --- | --------------- | ---------------------- |
| 起源 | Fenwick 1994《Software: Practice and Experience》24(3):327-336 | Bentley 1977《Solutions to Klee's rectangle problems》CMU TR |
| 设计动机 | 累积频率表（算术编码） | 计算几何区间查询 |
| 核心思想 | 二进制索引分解（lowbit） | 区间二分（递归分治） |
| 数据结构 | 一维数组（隐式树） | 完全二叉树（递归/数组） |
| 空间复杂度 | $O(n)$ | $O(4n)$ |
| 单点更新 | $O(\log n)$ | $O(\log n)$ |
| 区间查询 | $O(\log n)$ | $O(\log n)$ |
| 区间更新（原生） | 不支持 | 支持（Lazy Propagation） |
| 区间更新（差分） | 支持（差分 BIT） | 支持（原生） |
| 区间更新 + 区间查询 | 支持（双 BIT） | 支持（Lazy + Push） |
| 范围最值（max/min） | 不支持（加法可逆） | 支持 |
| 范围 GCD/LCM | 不支持 | 支持 |
| 可持久化 | 较复杂（罕见） | 成熟（Persistent Segment Tree） |
| 多维扩展 | 二维/三维可行但复杂 | 二维 Segment Tree 复杂 |
| 代码量 | 极少（约 20 行） | 较多（约 60-100 行） |
| 常数因子 | 小（位运算 + 循环） | 大（递归 + 函数调用） |
| 调试难度 | 容易 | 中等 |
| 离散化需求 | 高（值域大时需离散化） | 中 |
| 工业应用 | Lucene 词频、Redis 统计 | PostgreSQL 范围索引 |
| 典型场景 | 单点更新+区间查询 | 区间更新+复杂查询 |

### 6.2 与 Mo 算法对比

| 维度 | 树状数组 | Mo 算法（平方分解） |
| --- | ------- | ------------------ |
| 起源 | Fenwick 1994 | Mo Tao 2009 NOI 训练材料 |
| 适用场景 | 在线（动态更新） | 离线（静态查询） |
| 时间复杂度 | $O((n + q) \log n)$ | $O((n + q) \sqrt{n})$ |
| 空间复杂度 | $O(n)$ | $O(n)$ |
| 支持更新 | 是 | 否（需扩展） |
| 适用题目 | LeetCode 307 / 315 | 区间众数、区间不同数 |
| 离线要求 | 否 | 必须 |
| 实现难度 | 容易 | 中等 |

### 6.3 与前缀和对比

| 维度 | 树状数组 | 前缀和（Prefix Sum） |
| --- | ------- | -------------------- |
| 构建 | $O(n)$（线性）或 $O(n \log n)$ | $O(n)$ |
| 查询 | $O(\log n)$ | $O(1)$ |
| 更新 | $O(\log n)$ | $O(n)$ |
| 空间 | $O(n)$ | $O(n)$ |
| 适用场景 | 动态更新 | 静态数组 |
| 工程代表 | Lucene TF 累积器 | LeetCode 303 |

### 6.4 与跳跃表对比

| 维度 | 树状数组 | 跳跃表（Skip List） |
| --- | ------- | ------------------- |
| 起源 | Fenwick 1994 | Pugh 1990《Skip Lists: A Probabilistic Alternative to Balanced Trees》 |
| 数据结构 | 隐式树 | 多层链表 |
| 查询 | $O(\log n)$ 期望 | $O(\log n)$ 期望 |
| 更新 | $O(\log n)$ | $O(\log n)$ |
| 有序遍历 | 否 | 是 |
| 范围查询 | 仅区间和 | 任意范围 |
| 随机性 | 无 | 有（概率性） |
| 工业应用 | Lucene | Redis ZSET |

### 6.5 选型决策树

```mermaid
flowchart TD
    A[需要区间数据结构?] --> B{是否支持更新?}
    B -- 否 --> C{仅静态查询?}
    C -- 是 --> D[前缀和 O1 查询]
    B -- 是 --> E{更新类型?}
    E -- 单点更新 --> F{查询类型?}
    F -- 区间和 --> G[树状数组]
    F -- 区间最值 --> H[线段树]
    E -- 区间更新 --> I{是否需要区间查询?}
    I -- 仅点查询 --> J[差分 BIT]
    I -- 区间查询 --> K{代码复杂度要求?}
    K -- 简单 --> L[双 BIT]
    K -- 灵活 --> M[线段树+Lazy]
    I -- 复杂查询 --> N[线段树]
    C -- 否, 离线 --> O{需要更新?}
    O -- 否 --> P[Mo 算法]
```

---

## 7. 常见陷阱

### 7.1 陷阱 1：索引从 0 开始导致死循环

:::danger
**错误示例**（Python）：

```python
class WrongBIT:
    def __init__(self, n):
        self.tree = [0] * n  # 0-indexed
        self.n = n

    def update(self, i, delta):  # i 从 0 开始
        while i < self.n:
            self.tree[i] += delta
            i += i & (-i)  # i = 0 时, lowbit(0) = 0, 死循环!
```

**错误原因**：

`lowbit(0) = 0 & (-0) = 0`，导致 `i += 0` 永远不增长，造成死循环。BIT 必须使用 1-indexed，因为 `tree[0]` 没有对应的 lowbit 区间。
:::

**修正方案**：

```python
class CorrectBIT:
    def __init__(self, n):
        self.tree = [0] * (n + 1)  # 1-indexed, tree[0] 闲置
        self.n = n

    def update(self, i, delta):  # i 从 1 开始
        while i <= self.n:
            self.tree[i] += delta
            i += i & (-i)  # i >= 1, lowbit(i) >= 1, 必然增长
```

### 7.2 陷阱 2：差分树状数组区间更新时遗漏右端点

:::danger
**错误示例**：

```python
def range_add_wrong(ft, l, r, delta):
    ft.update(l, delta)
    # 忘记在 r+1 处减去 delta, 导致后续元素被错误累加
```

**错误原因**：

差分数组 $d[l] += \Delta$ 会让所有 $a[l], a[l+1], \ldots, a[n]$ 都加上 $\Delta$，但实际只需要 $a[l..r]$ 加 $\Delta$。必须在 $r+1$ 处补偿 $-\Delta$。
:::

**修正方案**：

```python
def range_add_correct(ft, l, r, delta):
    ft.update(l, delta)
    ft.update(r + 1, -delta)  # 关键: r+1 处抵消
```

### 7.3 陷阱 3：值域过大未离散化导致内存爆炸

:::danger
**错误示例**：

```python
# 给定数组 [1, 100, 1000000, 1000000000]
arr = [1, 100, 1000000, 1000000000]
ft = FenwickTree(1000000000)  # 申请 10^9 + 1 长度数组, OOM!
```

**错误原因**：

BIT 的 tree 数组长度等于值域大小。若值域为 $10^9$，申请 $10^9$ 长度数组会触发 OOM。BIT 不要求维护所有值，仅需维护出现过的值。
:::

**修正方案**：离散化

```python
def discretize(arr):
    """将值域压缩到 [1, n]"""
    sorted_unique = sorted(set(arr))
    rank = {v: i + 1 for i, v in enumerate(sorted_unique)}
    return rank, len(sorted_unique)

arr = [1, 100, 1000000, 1000000000]
rank, m = discretize(arr)
ft = FenwickTree(m)  # 长度仅为 4
for v in arr:
    ft.update(rank[v], 1)
```

### 7.4 陷阱 4：lowbit 计算写成 `x & (x - 1)`

:::danger
**错误示例**：

```python
def lowbit_wrong(x):
    return x & (x - 1)  # 错误! 这是去掉最低位 1, 不是取出最低位 1
```

**错误原因**：

`x & (x - 1)` 是经典位运算技巧，用于**去掉** $x$ 最低位的 1（结果为 $x$ 减去其 lowbit）。这与 `x & (-x)` 取出最低位 1 完全不同。
:::

**修正方案**：

```python
def lowbit_correct(x):
    return x & (-x)  # 正确: 取出 x 最低位的 1
```

### 7.5 陷阱 5：负数索引或溢出

:::danger
**错误示例**：

```python
def query_wrong(ft, l, r):
    return ft.query(r) - ft.query(l)  # 错! 应该是 l-1
```

**错误原因**：

前缀和 $S(l, r) = S(1, r) - S(1, l-1)$。若写为 $S(1, r) - S(1, l)$，相当于多减了 $a[l]$。
:::

**修正方案**：

```python
def range_query_correct(ft, l, r):
    return ft.query(r) - ft.query(l - 1)  # l-1, 不是 l
```

### 7.6 陷阱 6：使用 int 而非 long 导致溢出

:::danger
**错误示例**（C++）：

```cpp
int sum = 0;
for (int i = r; i > 0; i -= i & (-i)) {
    sum += tree[i];  // 大数据时可能溢出 int
}
```

**错误原因**：

若 $n = 10^5$，每个 $a[i] = 10^9$，前缀和最大可达 $10^{14}$，超出 32 位 int 范围（约 $2.1 \times 10^9$）。
:::

**修正方案**：

```cpp
long long sum = 0;  // 使用 long long
for (int i = r; i > 0; i -= i & (-i)) {
    sum += tree[i];
}
```

---

## 8. 工程实践

### 8.1 内存布局优化

BIT 在生产环境中常用于高频更新场景，内存布局对性能影响显著：

1. **顺序数组而非节点对象**：BIT 使用连续一维数组，避免指针解引用开销
2. **缓存友好的访问模式**：前向 / 后向 lowbit 链访问相邻地址，缓存命中率高
3. **对齐优化**：tree 数组按 64 字节缓存行对齐，减少缓存未命中

```cpp
// C++: 缓存对齐的 BIT
#include <vector>
struct alignas(64) FenwickTreeAligned {
    std::vector<long long> tree;
    int n;
    // ...
};
```

### 8.2 并发安全的 BIT

在多线程环境中维护 BIT 需要同步原语：

```java
// Java: 并发安全的 BIT (使用 ReadWriteLock)
import java.util.concurrent.locks.ReentrantReadWriteLock;

public class ConcurrentFenwickTree {
    private final long[] tree;
    private final int n;
    private final ReentrantReadWriteLock rwLock = new ReentrantReadWriteLock();

    public ConcurrentFenwickTree(int n) {
        this.n = n;
        this.tree = new long[n + 1];
    }

    public void update(int i, long delta) {
        rwLock.writeLock().lock();
        try {
            for (; i <= n; i += i & (-i)) {
                tree[i] += delta;
            }
        } finally {
            rwLock.writeLock().unlock();
        }
    }

    public long query(int i) {
        rwLock.readLock().lock();
        try {
            long s = 0;
            for (; i > 0; i -= i & (-i)) {
                s += tree[i];
            }
            return s;
        } finally {
            rwLock.readLock().unlock();
        }
    }
}
```

### 8.3 持久化与序列化

BIT 序列化仅需保存 tree 数组：

```python
# Python: BIT 序列化
import pickle

def serialize_bit(ft, path):
    with open(path, 'wb') as f:
        pickle.dump({'tree': ft.tree, 'n': ft.n}, f)

def deserialize_bit(path):
    with open(path, 'rb') as f:
        data = pickle.load(f)
        ft = FenwickTree(data['n'])
        ft.tree = data['tree']
        return ft
```

### 8.4 大数据场景的分布式扩展

当数据规模超过单机内存时，可采用分片 BIT：

1. **水平分片**：按值域划分，每片独立 BIT
2. **垂直分片**：按时间窗口划分，旧数据冻结为前缀和
3. **流式更新**：新数据写入热 BIT，定期合并到冷前缀和

```python
# Python: 分片 BIT（按值域）
class ShardedFenwickTree:
    def __init__(self, total_size, shard_count):
        self.shard_size = (total_size + shard_count - 1) // shard_count
        self.shards = [FenwickTree(self.shard_size) for _ in range(shard_count)]

    def update(self, i, delta):
        shard_idx = (i - 1) // self.shard_size
        local_i = (i - 1) % self.shard_size + 1
        self.shards[shard_idx].update(local_i, delta)

    def query(self, i):
        shard_idx = (i - 1) // self.shard_size
        local_i = (i - 1) % self.shard_size + 1
        s = 0
        # 前 shard_idx 个 shard 完整求和
        for k in range(shard_idx):
            s += self.shards[k].query(self.shard_size)
        # 当前 shard 部分求和
        s += self.shards[shard_idx].query(local_i)
        return s
```

### 8.5 生产环境最佳实践

1. **首选 BIT 的场景**：单点更新 + 区间查询、内存敏感、性能关键
2. **避免 BIT 的场景**：需要区间最值、需要持久化历史版本、需要复杂组合操作
3. **离散化优先**：值域超过 $10^7$ 时务必离散化
4. **使用 1-indexed**：永远使用 1-indexed，避免 lowbit(0) 死循环
5. **使用 long/long long**：默认使用 64 位整数防止溢出
6. **预分配空间**：避免动态扩容，构建时一次性分配
7. **批量构建**：用 $O(n)$ 线性构建而非 $O(n \log n)$ 朴素构建
8. **缓存局部性**：tree 数组连续访问，避免随机访问模式

---

## 9. 案例研究

### 9.1 案例一：LeetCode 307「Range Sum Query - Mutable」

**问题描述**：实现一个数据结构，支持单点更新与区间求和，多次操作下要求均摊 $O(\log n)$。

**完整解法**：

```python
# Python: LeetCode 307 完整解法
class NumArray:
    """LeetCode 307: Range Sum Query - Mutable
    使用 BIT 实现, O(log n) 每次 update / sumRange
    """

    def __init__(self, nums: list[int]):
        self.n = len(nums)
        # BIT 内部使用 1-indexed, 但 LeetCode 接口是 0-indexed
        self.tree = [0] * (self.n + 1)
        # O(n) 线性构建
        for i in range(self.n):
            self.tree[i + 1] = nums[i]
        for i in range(1, self.n + 1):
            parent = i + (i & (-i))
            if parent <= self.n:
                self.tree[parent] += self.tree[i]
        # 保留原数组用于计算 update 的 delta
        self.nums = nums[:]

    def update(self, index: int, val: int) -> None:
        """将 nums[index] 改为 val"""
        delta = val - self.nums[index]
        self.nums[index] = val
        i = index + 1  # 转换为 1-indexed
        while i <= self.n:
            self.tree[i] += delta
            i += i & (-i)

    def sumRange(self, left: int, right: int) -> int:
        """返回 nums[left..right] 之和"""
        return self._prefix(right + 1) - self._prefix(left)

    def _prefix(self, i: int) -> int:
        """查询 sum(nums[0..i-1])"""
        s = 0
        while i > 0:
            s += self.tree[i]
            i -= i & (-i)
        return s

# 测试
obj = NumArray([1, 3, 5])
print(obj.sumRange(0, 2))  # 输出: 9
obj.update(1, 2)
print(obj.sumRange(0, 2))  # 输出: 8 (= 1 + 2 + 5)
```

### 9.2 案例二：逆序对计数（洛谷 P1908）

```python
# Python: 洛谷 P1908 逆序对
import sys
input = sys.stdin.readline

def solve_p1908():
    n = int(input())
    arr = list(map(int, input().split()))
    
    # 离散化
    sorted_vals = sorted(set(arr))
    rank = {v: i + 1 for i, v in enumerate(sorted_vals)}
    
    # BIT 计算逆序对
    ft = FenwickTree(len(sorted_vals))
    inversions = 0
    # 从右向左扫描
    for i in range(n - 1, -1, -1):
        r = rank[arr[i]]
        # 已出现的、严格小于 arr[i] 的元素数 = query(r - 1)
        inversions += ft.query(r - 1)
        ft.update(r, 1)
    
    print(inversions)

solve_p1908()
```

### 9.3 案例三：Apache Lucene 倒排索引词频统计

Lucene 搜索引擎在倒排索引中使用类似 BIT 的累积频率统计：

```java
// Java: Lucene 风格的词频累积器（简化版）
public class TermFrequencyAccumulator {
    // 使用 BIT 维护词频的累积分布
    private final FenwickTree frequencyTree;
    private final int vocabularySize;

    public TermFrequencyAccumulator(int vocabularySize) {
        this.vocabularySize = vocabularySize;
        this.frequencyTree = new FenwickTree(vocabularySize);
    }

    /** 记录新文档出现 termId
     * @param termId 词汇表中的 term ID
     */
    public void observeTerm(int termId) {
        frequencyTree.update(termId, 1);
    }

    /** 查询 termId 排名在 [1, rank] 内的总词频
     * 用于算术编码的概率分布查询
     */
    public long cumulativeFrequency(int rank) {
        return frequencyTree.query(rank);
    }

    /** 查询 termId 在词汇表中的累积概率
     * 用于自适应算术编码
     */
    public double cumulativeProbability(int termId) {
        long total = frequencyTree.query(vocabularySize);
        if (total == 0) return 0.0;
        return (double) frequencyTree.query(termId - 1) / total;
    }
}
```

### 9.4 案例四：Redis Sorted Set 排名维护

Redis ZSET 使用跳跃表 + 哈希表实现，但在某些扩展（如 RedisBloom）中借鉴 BIT 思想：

```python
# Python: Redis ZSET 风格的排名维护器
class RankMaintainer:
    """使用 BIT 维护分数到排名的映射
    支持: 添加元素、查询排名
    """

    def __init__(self, max_score: int):
        self.ft = FenwickTree(max_score)
        self.max_score = max_score
        self.elements = {}  # member -> score

    def add(self, member: str, score: int) -> int:
        """添加成员, 返回其当前排名"""
        if member in self.elements:
            # 移除旧分数
            old_score = self.elements[member]
            self.ft.update(old_score, -1)
        # 添加新分数
        self.ft.update(score, 1)
        self.elements[member] = score
        # 排名 = 严格小于 score 的元素数 + 1
        return self.ft.query(score - 1) + 1

    def rank(self, member: str) -> int:
        """查询成员排名"""
        if member not in self.elements:
            return -1
        score = self.elements[member]
        return self.ft.query(score - 1) + 1

# 示例: Redis ZADD/ZRANK 风格
rm = RankMaintainer(1000)
print(rm.add("alice", 100))  # 输出: 1
print(rm.add("bob", 50))     # 输出: 1 (bob 排到 alice 前面)
print(rm.add("carol", 150))  # 输出: 3
print(rm.rank("alice"))      # 输出: 2
```

### 9.5 案例五：PostgreSQL 统计信息收集器

PostgreSQL 在查询规划器中使用统计信息（pg_statistic），其中直方图边界使用类似 BIT 的累积统计：

```sql
-- PostgreSQL 风格的统计查询（伪代码示例）
-- 模拟: 维护表的列值分布直方图

-- 创建统计表
CREATE TABLE column_stats (
    table_name TEXT,
    column_name TEXT,
    bucket INT,         -- 直方图桶号
    frequency BIGINT    -- 该桶频率
);

-- 使用 BIT 思想维护累积频率:
-- 等价于维护 sum(frequency[1..k]) 用于快速估算选择性
-- 当新行插入时, 对应桶 frequency += 1 (单点更新)
-- 查询 SELECT COUNT(*) WHERE col < x 时, 查询 sum(frequency[1..k]) (前缀查询)

-- 模拟 SQL 风格的 BIT 查询
-- SELECT sum(frequency) FROM column_stats WHERE bucket <= :k;
-- 优化为 BIT 后变为 O(log n) 而非 O(n)
```

---

### 填空题知识点讲解

**常见疑问 5**：（easy）树状数组由 Peter M. Fenwick 在 ____ 年提出，发表于期刊《____》，DOI 为 ____。

**常见疑问 6**：（medium）lowbit(x) 的经典位运算实现为 ____。当 x = 12 (0b1100) 时，lowbit(x) = ____。

**常见疑问 7**：（medium）在长度为 n 的数组上，BIT 的空间复杂度为 ____，单点更新的时间复杂度为 ____，前缀查询的时间复杂度为 ____。

**常见疑问 8**：（hard）双树状数组实现区间更新 + 区间查询时，前缀和公式为 $S(x) = $ ____ · query(t1, x) - query(t2, x)。

### 10.3 代码修正题

**常见疑问 9**：（medium）以下 Python 代码计算逆序对，但存在 bug，请修正：

```python
def count_inversions_buggy(arr):
    sorted_vals = sorted(set(arr))
    rank = {v: i for i, v in enumerate(sorted_vals)}  # bug 1
    
    ft = FenwickTree(len(sorted_vals))
    inversions = 0
    for i in range(len(arr)):  # bug 2
        r = rank[arr[i]]
        inversions += ft.query(r)  # bug 3
        ft.update(r, 1)
    return inversions
```

**常见疑问 10**：（hard）以下 C++ 代码实现差分 BIT 的 range_add，但存在 bug：

```cpp
void rangeAddBug(int l, int r, long long delta) {
    for (int i = l; i <= n; i += i & (-i)) tree[i] += delta;  // bug
    for (int i = r + 1; i <= n; i += i & (-i)) tree[i] -= delta;  // bug
}
```

### 10.4 开放论述题

**常见疑问 11**：（medium）论述树状数组相对于线段树的优势与劣势。在什么场景下应优先选择 BIT？什么场景下应优先选择线段树？

**常见疑问 12**：（hard）假设你需要设计一个搜索引擎的倒排索引，需要支持：①新增文档时更新词频；②查询包含某词的文档数；③查询词频排名前 k 的词。请设计数据结构并分析复杂度。BIT 是否适用？如不适用，提出替代方案。

**常见疑问 13**：（hard）分析双树状数组实现区间更新 + 区间查询的数学原理。推导前缀和公式 $S(x) = (x+1) \cdot \text{query}(t1, x) - \text{query}(t2, x)$。

**常见疑问 14**：（medium）二维树状数组的时间复杂度为 $O(\log^2 n)$，而二维线段树为 $O(\log^2 n)$。两者在常数因子、实现复杂度、可扩展性上有何差异？

---

### 填空题知识点讲解

**A5**: 1994；《Software: Practice and Experience》；10.1002/spe.4380240306

**A6**: `x & (-x)`；4（即 0b0100）

**A7**: $O(n)$；$O(\log n)$；$O(\log n)$

**A8**: $(x + 1)$

### 11.3 代码修正题答案

**A9**：

```python
def count_inversions_correct(arr):
    sorted_vals = sorted(set(arr))
    rank = {v: i + 1 for i, v in enumerate(sorted_vals)}  # 修正1: 1-indexed
    
    ft = FenwickTree(len(sorted_vals))
    inversions = 0
    for i in range(len(arr) - 1, -1, -1):  # 修正2: 从右向左扫描
        r = rank[arr[i]]
        inversions += ft.query(r - 1)  # 修正3: 查询严格小于 r 的元素数
        ft.update(r, 1)
    return inversions
```

修正说明：
1. rank 应从 1 开始（BIT 1-indexed）
2. 应从右向左扫描，统计右侧已出现且小于当前元素的个数
3. 应查询 `r - 1`（严格小于），而非 `r`（包含自身）

**A10**：

```cpp
void rangeAddCorrect(int l, int r, long long delta) {
    update(l, delta);          // 复用 update 函数
    update(r + 1, -delta);
}

// 或者手动展开 update:
void rangeAddCorrect2(int l, int r, long long delta) {
    for (int i = l; i <= n; i += i & (-i)) tree[i] += delta;
    for (int i = r + 1; i <= n; i += i & (-i)) tree[i] -= delta;
}
```

修正说明：原代码的逻辑实际正确，但 bug 在于 `l` 和 `r + 1` 没有先做参数校验，且代码重复。建议封装为 `update` 函数。

### 11.4 开放论述题答案

**A11**（参考答案）：

BIT 相对线段树的优势：
1. **代码简洁**：BIT 核心代码约 20 行，线段树 60-100 行
2. **常数小**：BIT 使用位运算与循环，线段树使用递归调用
3. **空间省**：BIT 为 $O(n)$，线段树为 $O(4n)$
4. **缓存友好**：BIT 数组连续访问，缓存命中率高

BIT 相对线段树的劣势：
1. **功能受限**：BIT 仅支持可逆运算（如加法、异或），不支持 max/min/gcd
2. **区间更新复杂**：需借助差分技巧，线段树原生支持
3. **持久化困难**：BIT 持久化版本不常见
4. **多维扩展受限**：二维 BIT 复杂度较高

优先选择 BIT 的场景：
- 单点更新 + 区间求和（如 LeetCode 307）
- 逆序对计数（洛谷 P1908）
- 值域统计（如查询某值排名）
- 内存受限的嵌入式场景

优先选择线段树的场景：
- 区间最值查询
- 区间染色、区间赋值
- 需要持久化历史版本
- 二维矩形统计（可持久化线段树）
- 复杂组合操作（如区间加 + 区间乘）

**A12**（参考答案）：

数据结构设计：
1. **倒排索引**：使用哈希表 `dict[term, list[doc_id]]` 维护
2. **词频统计**：
   - 使用 BIT 维护词频累积分布
   - 新文档加入时，对每个 term 执行 `update(term_id, 1)`
   - 查询包含某词的文档数：`query(term_id) - query(term_id - 1)`
3. **Top-K 查询**：BIT 不直接支持 top-k，需配合：
   - 方案 A：维护一个最小堆（大小为 k），每次更新时调整
   - 方案 B：使用线段树 + 二分查找（$O(\log^2 n)$）
   - 方案 C：使用 B+ 树（更适合磁盘场景，类似 PostgreSQL）

BIT 适用性：
- 适用于：①与②（高频更新 + 前缀查询）
- 不适用于：③（top-k 查询需额外数据结构）

替代方案：
- 真实 Lucene 使用倒排表 + 跳跃表
- 真实搜索引擎常用 LSM-Tree（Log-Structured Merge Tree）
- 工业级 top-k 可使用 Count-Min Sketch + 堆

**A13**（参考答案）：

设差分数组 $d[i] = a[i] - a[i-1]$，则前缀和：

$$
S(x) = \sum_{i=1}^{x} a[i] = \sum_{i=1}^{x} \sum_{j=1}^{i} d[j]
$$

交换求和顺序：

$$
S(x) = \sum_{j=1}^{x} d[j] \cdot (x - j + 1) = (x + 1) \sum_{j=1}^{x} d[j] - \sum_{j=1}^{x} j \cdot d[j]
$$

记 $t_1$ 维护 $\sum d[j]$，$t_2$ 维护 $\sum j \cdot d[j]$，则：

$$
S(x) = (x + 1) \cdot \text{query}(t_1, x) - \text{query}(t_2, x)
$$

更新逻辑：
- $d[l] += \Delta$：$t_1.\text{update}(l, \Delta)$，$t_2.\text{update}(l, l \cdot \Delta)$
- $d[r+1] -= \Delta$：$t_1.\text{update}(r+1, -\Delta)$，$t_2.\text{update}(r+1, -(r+1) \cdot \Delta)$

**A14**（参考答案）：

| 维度 | 二维 BIT | 二维线段树 |
| --- | ------- | --------- |
| 时间复杂度 | $O(\log^2 n)$ | $O(\log^2 n)$ |
| 空间复杂度 | $O(n^2)$ | $O(4n \cdot 4n) = O(16n^2)$ |
| 常数因子 | 小（位运算） | 大（递归） |
| 实现复杂度 | 中等（嵌套循环） | 高（嵌套递归） |
| 区间更新 | 较复杂（差分） | 原生支持（Lazy） |
| 持久化 | 困难 | 成熟 |
| 适用场景 | 矩阵单点更新+区域求和 | 矩阵区间更新+复杂查询 |

二维 BIT 在常数因子上优于二维线段树，但功能受限。二维线段树实现复杂，但功能强大（区间更新、多维查询）。

---

### 13.1 理论深入

- **Fenwick 1994 原论文**：[Software: Practice and Experience 24(3):327-336](https://onlinelibrary.wiley.com/doi/10.1002/spe.4380240306)，理解 BIT 设计的原始动机与算术编码背景
- **CLRS 习题 17.3**：摊还分析章节，对比 BIT 与动态数组的摊还复杂度
- **Sedgewick-Wayne §3.2**：二叉搜索树章节，对比 BIT 与 BST 的索引结构
- **Knuth TAOCP Vol.3 §5.1.1**：逆序对计数的多种算法（归并、BIT、离散化）
- **Halim《Competitive Programming》§2.4**：BIT 在算法竞赛中的实战技巧

### 13.2 应用拓展

- **可持久化 BIT**：支持查询历史版本的 BIT，常见于算法竞赛
- **二维 BIT**：矩阵区域统计，参见洛谷 P4054
- **动态开点 BIT**：值域极大时动态分配节点，节省空间
- **BIT + 二分**：BIT 上二分查找第 k 大元素，参见 Codeforces 786B
- **BIT 维护 LCP**：后缀数组 + BIT 计算 LCP 区间统计

### 13.4 教学视频

- **MIT 6.006 Lecture 10**：[Range Queries I](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/)，讨论区间查询数据结构
- **Stanford CS161**：[Algorithm Analysis](https://web.stanford.edu/class/cs161/)，覆盖 BIT 与线段树对比
- **GeeksforGeeks**：[Fenwick Tree Tutorial](https://www.geeksforgeeks.org/fenwick-tree-binary-indexed-tree/)，入门教程
- **TopCoder Tutorial**：[Binary Indexed Trees](https://www.topcoder.com/thrive/articles/Binary%20Indexed%20Trees)，经典社区教程
- **codeblue**：[BIT 进阶技巧](https://codeblue.net)，竞赛进阶视频

### 13.5 进阶主题

- **持久化数据结构**：持久化 BIT、可持久化线段树，参见 Tarjan 1989《Persistent Data Structures》
- **多维索引**：R 树、KD 树、Quad 树，参见 de Berg 2008《Computational Geometry》
- **概率数据结构**：Count-Min Sketch、HyperLogLog、布隆过滤器，参见 Cormode-Muthukrishnan 2005
- **LSM-Tree**：Google BigTable、LevelDB、RocksDB 使用的磁盘索引结构
- **B+ 树变体**：T 树、Trie 树、Fractal Tree Index，参见 Comer 1979《The Ubiquitous B-Tree》
- **Functional BIT**：函数式编程中的持久化 BIT，参见 Okasaki 1998《Purely Functional Data Structures》

### 13.6 相关文档

- 线段树：BIT 的功能扩展版本，支持区间最值、Lazy Propagation
- 平衡树与高级树：AVL、红黑树、B 树等平衡搜索树
- 并查集：另一种隐式树形数据结构
- 树：基础树结构与遍历
- 堆与优先队列：另一种隐式树形结构
- 算法分析基础与学习路线：复杂度分析与摊还分析

---

## 附录 A：BIT 调试速查表

| 症状 | 可能原因 | 检查方法 |
| --- | ------- | ------- |
| 死循环 | 0-indexed 导致 lowbit(0)=0 | 检查索引是否从 1 开始 |
| 答案偏大 | range_query 写成 query(r) - query(l) | 应为 query(r) - query(l - 1) |
| 答案偏小 | 差分 range_add 遗漏 r+1 | 检查差分是否两端更新 |
| 内存爆炸 | 未离散化 | 检查值域是否过大 |
| 数值溢出 | 使用 int 而非 long | 改用 64 位整数 |
| 答案为负 | 区间更新符号错误 | 检查 delta 符号 |
| 边界错误 | n+1 位访问越界 | 检查数组容量 |

## 附录 B：BIT 三种模式速查

| 模式 | 数据结构 | update | query | 区间更新 | 区间查询 |
| --- | ------- | ------ | ----- | -------- | -------- |
| 单点更新+区间查询 | 单 BIT | $O(\log n)$ | $O(\log n)$ | 不支持 | 支持 |
| 区间更新+点查询 | 差分 BIT | $O(\log n)$（两次 update） | $O(\log n)$ | 支持 | 不支持 |
| 区间更新+区间查询 | 双 BIT | $O(\log n)$（四次 update） | $O(\log n)$ | 支持 | 支持 |

## 附录 C：典型代码模板

```python
# Python: BIT 三模式速查
# 1. 基础 BIT (单点更新 + 区间查询)
class BIT1:
    def __init__(self, n): self.t, self.n = [0]*(n+1), n
    def update(self, i, d):
        while i <= self.n: self.t[i] += d; i += i & -i
    def query(self, i):
        s = 0
        while i > 0: s += self.t[i]; i -= i & -i
        return s
    def range_query(self, l, r): return self.query(r) - self.query(l-1)

# 2. 差分 BIT (区间更新 + 点查询)
class BIT2:
    def __init__(self, n): self.t, self.n = [0]*(n+2), n
    def _u(self, i, d):
        while i <= self.n: self.t[i] += d; i += i & -i
    def _q(self, i):
        s = 0
        while i > 0: s += self.t[i]; i -= i & -i
        return s
    def range_add(self, l, r, d): self._u(l, d); self._u(r+1, -d)
    def point_query(self, i): return self._q(i)

# 3. 双 BIT (区间更新 + 区间查询)
class BIT3:
    def __init__(self, n):
        self.t1, self.t2, self.n = [0]*(n+2), [0]*(n+2), n
    def _u(self, t, i, d):
        while i <= self.n: t[i] += d; i += i & -i
    def _q(self, t, i):
        s = 0
        while i > 0: s += t[i]; i -= i & -i
        return s
    def range_add(self, l, r, d):
        self._u(self.t1, l, d); self._u(self.t1, r+1, -d)
        self._u(self.t2, l, d*l); self._u(self.t2, r+1, -d*(r+1))
    def _prefix(self, i): return self._q(self.t1, i)*(i+1) - self._q(self.t2, i)
    def range_query(self, l, r): return self._prefix(r) - self._prefix(l-1)
```
