---
order: 30
title: 排序算法（基础篇）
module: 'algorithm'
category: 计算机科学
difficulty: intermediate
description: 排序算法基础篇：排序问题的形式化定义与评价维度（稳定性、复杂度、原地性、自适应性）、比较排序下界 $\Omega(n \log n)$ 的决策树证明、快排平均复杂度的期望分析，冒泡/选择/插入三个 $O(n^2)$ 基础算法与归并/快排两个 $O(n \log n)$ 主力算法的 Python/C++/Java 实现与优化，附工业级选型决策表与 LeetCode 56/179/315 应用案例。堆排序、希尔排序、计数/基数/桶排序与 introsort/Timsort 见进阶与线性排序篇。
author: fanquanpp
updated: '2026-09-28'
related:
  - 'algorithm/035-AdvancedSortAndLinearSort'
  - 'algorithm/010-AlgorithmAnalysisBasics'
  - 'algorithm/020-ArrayAndDynamicArray'
  - 'algorithm/140-RecursionAndBacktracking'
  - 'algorithm/120-DivideAndConquer'
  - 'algorithm/090-HeapAndPriorityQueue'
  - 'algorithm/170-BinarySearchAlgorithms'
  - 'algorithm/050-SearchAlgorithm'
prerequisites:
  - 'algorithm/010-AlgorithmAnalysisBasics'
  - 'algorithm/020-ArrayAndDynamicArray'
---

> 定位说明：本篇为进阶参考书（参考层），面向已完成本模块主线的读者；入门请先走学习路径前序阶段。定位标准见 docs/standards/reference-layer.md（仓库）。

## 前置知识

建议先阅读以下内容再进入本文：

- [算法分析基础与学习路线](/algorithm/010-AlgorithmAnalysisBasics)
- [数组与动态数组](/algorithm/020-ArrayAndDynamicArray)

## 1. 概述与学习目标

### 1.1 什么是排序算法

**排序**（Sorting）是计算机科学中最基础、最频繁的操作之一——将一组数据按特定顺序（升序或降序）重新排列。Donald Knuth 在 *The Art of Computer Programming* Vol.3《Sorting and Searching》§5 中将排序分为三大类：

1. **内部排序**（§5.2 Internal Sorting）：数据全部驻留内存，包括插入类（插入、希尔）、交换类（冒泡、快排）、选择类（选择、堆排）、归并类（归并）、分布类（计数、基数、桶）；
2. **外部排序**（§5.3 External Sorting）：数据量超过内存，需借助外存，核心是多路归并；
3. **多路归并**（§5.4 Sorting on Large Secondary Storage Devices）：磁盘排序的工程化方案，含替换选择、多步归并。

```mermaid
flowchart TD
    S[排序]
    S --> I[内部排序<br/>比较排序 Ω(n log n)<br/>插入类：插入/希尔<br/>交换类：冒泡/快排<br/>堆排选择类/归并归并类]
    S --> E[外部排序<br/>多路归并]
    S --> D[分布排序<br/>计数排序 O(n+k)/基数排序 O(d(n+k))/桶排序 O(n+k) 平均]
    S --> M[混合排序<br/>内省排序 Musser 1997/Timsort Peters 2002]
```

**比较排序下界**（Lower Bound of Comparison Sort）：任何基于比较的排序算法在最坏情况下至少需要 $\Omega(n \log n)$ 次比较。这一理论下界由决策树模型证明（详见 §3.2），意味着归并排序与堆排序已经达到了比较排序的最优。

**非比较排序的突破**：当元素具有特殊性质（如整数范围有限），可以绕过 $\Omega(n \log n)$ 下界实现 $O(n)$ 排序——计数排序 $O(n+k)$、基数排序 $O(d(n+k))$、桶排序 $O(n+k)$。这类算法牺牲了通用性（要求数值型或可分配的元素），换取线性时间复杂度。

> 一句话定义：**排序 = 将数据集按序重排；比较排序下界 $\Omega(n \log n)$ 由决策树证明，归并/堆排达此下界；非比较排序利用元素性质突破至 $O(n)$；工业级实现如 Timsort、introsort 通过混合多种算法兼顾最坏与平均性能。**

### 1.2 学习目标

完成本文档学习后，你将能够：

1. **记忆**冒泡 $O(n^2)$、选择 $O(n^2)$、插入 $O(n^2)$ 平均/$O(n)$ 最优、希尔 $O(n^{1.3})$ 经验、归并 $O(n \log n)$、堆排 $O(n \log n)$、快排 $O(n \log n)$ 平均/$O(n^2)$ 最坏、计数 $O(n+k)$、基数 $O(d(n+k))$、桶 $O(n+k)$ 的形式化复杂度，复述稳定性与原地性差异；
2. **理解** von Neumann 1945 EDVAC 报告归并排序、Shell 1959 CACM 2(7):30-32 希尔排序、Hoare 1961 CACM 4(7):321 与 Computer Journal 5(1):10-15 快速排序、Williams 1964 CACM Algorithm 232 堆排序、Musser 1997 Software: Practice and Experience 27(8):983-993 内省排序、Peters 2002 Timsort 的历史脉络，说明不同排序算法的设计动机；
3. **应用**冒泡（含鸡尾酒优化）、选择、插入（含二分插入）、希尔（含 Knuth/Pratt/Sedgewick 增量序列）、归并（自顶向下与自底向上）、堆排、快排（Lomuto/Hoare/三路/随机化/双轴）编写可运行的 Python/C++/Java 代码，解决 LeetCode 912 排序数组、LeetCode 215 第 K 大、LeetCode 56 合并区间、LeetCode 179 最大数、LeetCode 315 计算右侧小于当前元素的个数等问题；
4. **分析**比较排序 $\Omega(n \log n)$ 下界的决策树证明（$2^h \geq n!$、Stirling 公式 $n! \approx (n/e)^n \sqrt{2\pi n}$）、快排平均 $O(n \log n)$ 的期望分析、Timsort 复杂度证明，掌握"决策树归约、期望分析、势能分析"三大核心论证方法；
5. **评估**各排序算法在"小数据 vs 大数据"、"内存受限 vs 内存充裕"、"稳定 vs 不稳定"、"通用数据 vs 特殊数据"维度上的优劣，识别 Python Timsort、Java DualPivotQuicksort、C++ std::sort 内省排序、V8 Timsort 的选型动机；
6. **对比** 12 种排序算法在最好/平均/最坏时间、空间、稳定性、原地性、自适应性、缓存友好性维度的差异；
7. **创造**性设计基于排序的开源项目解决方案，如数据库外部归并排序、MapReduce 分布式排序、Stream 分位数估算、Top-K 流式聚合、Skew-Histogram 数据倾斜检测。

> 说明：本篇为排序算法合集的基础篇，覆盖评价维度与五个基础/主力算法；堆排序、希尔排序、线性时间非比较排序与工业级混合排序（introsort/Timsort）见[进阶与线性排序篇](/algorithm/035-AdvancedSortAndLinearSort)。

### 1.3 术语表

| 术语 | 英文 | 定义 |
| ---- | ---- | ---- |
| 排序 | sort | 将数据按特定顺序重排 |
| 比较排序 | comparison sort | 通过元素间比较决定顺序的算法 |
| 非比较排序 | non-comparison sort | 利用元素性质（如整数范围）排序 |
| 稳定性 | stability | 相等元素的相对顺序是否保持 |
| 原地排序 | in-place sort | 仅需 $O(1)$ 额外空间的排序 |
| 自适应 | adaptive | 对部分有序输入性能更优 |
| 内部排序 | internal sort | 数据全部驻留内存 |
| 外部排序 | external sort | 数据超过内存需借助外存 |
| 关键字 | key | 用于排序的属性 |
| 增量序列 | gap sequence | 希尔排序的步长序列 |
| 主元 | pivot | 快排中用于分区的元素 |
| 分区 | partition | 快排中将数组分为两部分 |
| 决策树 | decision tree | 比较排序的理论模型 |
| 自然 run | natural run | Timsort 中检测到的已有序片段 |
| 双轴 | dual-pivot | 双主元快排变体 |
| 多路归并 | k-way merge | 同时合并 k 个有序序列 |

### 1.4 排序算法全景对比表

| 算法 | 最好 | 平均 | 最坏 | 空间 | 稳定 | 原地 | 自适应 |
| ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- |
| 冒泡排序 | $O(n)$ | $O(n^2)$ | $O(n^2)$ | $O(1)$ | 是 | 是 | 是 |
| 鸡尾酒排序 | $O(n)$ | $O(n^2)$ | $O(n^2)$ | $O(1)$ | 是 | 是 | 是 |
| 选择排序 | $O(n^2)$ | $O(n^2)$ | $O(n^2)$ | $O(1)$ | 否 | 是 | 否 |
| 插入排序 | $O(n)$ | $O(n^2)$ | $O(n^2)$ | $O(1)$ | 是 | 是 | 是 |
| 二分插入排序 | $O(n)$ | $O(n^2)$ | $O(n^2)$ | $O(1)$ | 是 | 是 | 是 |
| 希尔排序 | $O(n \log n)$ | $O(n^{1.3})$ | $O(n^{4/3})$ | $O(1)$ | 否 | 是 | 部分 |
| 归并排序 | $O(n \log n)$ | $O(n \log n)$ | $O(n \log n)$ | $O(n)$ | 是 | 否 | 否 |
| 堆排序 | $O(n \log n)$ | $O(n \log n)$ | $O(n \log n)$ | $O(1)$ | 否 | 是 | 否 |
| 快排（随机化） | $O(n \log n)$ | $O(n \log n)$ | $O(n^2)$ | $O(\log n)$ | 否 | 是 | 否 |
| 三路快排 | $O(n)$ | $O(n \log n)$ | $O(n^2)$ | $O(\log n)$ | 否 | 是 | 是（多重复键） |
| 计数排序 | $O(n+k)$ | $O(n+k)$ | $O(n+k)$ | $O(k)$ | 是 | 否 | 否 |
| 基数排序（LSD） | $O(d(n+k))$ | $O(d(n+k))$ | $O(d(n+k))$ | $O(n+k)$ | 是 | 否 | 否 |
| 桶排序 | $O(n+k)$ | $O(n+k)$ | $O(n^2)$ | $O(n+k)$ | 是 | 否 | 否 |
| 内省排序 | $O(n \log n)$ | $O(n \log n)$ | $O(n \log n)$ | $O(\log n)$ | 否 | 是 | 部分 |
| Timsort | $O(n)$ | $O(n \log n)$ | $O(n \log n)$ | $O(n)$ | 是 | 否 | 是 |

### 1.5 适用场景与不适用场景

| 场景 | 是否适合 | 说明 |
| ---- | -------- | ---- |
| 通用对象排序（稳定） | 适合 | Timsort 是 Python/Java 对象排序默认 |
| 通用基础类型排序 | 适合 | introsort（C++）、DualPivotQuicksort（Java） |
| 小数据（n < 50） | 适合 | 插入排序常数小，Timsort/introsort 在此规模回退 |
| 部分有序数据 | 适合 | Timsort、插入排序自适应 |
| 内存受限（嵌入式） | 适合 | 堆排 $O(1)$ 空间 |
| 大数据外部排序 | 适合 | 多路归并 + 替换选择 |
| 整数且值域有限 | 适合 | 计数排序 $O(n+k)$ |
| 浮点数均匀分布 | 适合 | 桶排序 $O(n+k)$ 平均 |
| 字符串定长 | 适合 | 基数排序 $O(d(n+k))$ |
| 大量重复键 | 适合 | 三路快排 $O(n)$ |
| 严格最坏保证 | 适合 | 堆排、归并 |
| 严格要求稳定 + 原地 | 不适合 | 稳定排序大多需 $O(n)$ 空间 |
| 元素较大（结构体） | 部分适合 | 应改用指针排序或索引排序 |

> **跨模块引用**：排序与查找的耦合参见 [查找算法](/algorithm/170-BinarySearchAlgorithms)；堆排序的堆数据结构参见 [堆与优先队列](/algorithm/090-HeapAndPriorityQueue)；分治思想的归并与快排参见 [分治算法](/algorithm/120-DivideAndConquer)；外部排序与 MapReduce 参见 [搜索算法](/algorithm/050-SearchAlgorithm)。

---

## 2. 历史动机与演进（基础篇）

基础篇聚焦与归并排序、快速排序直接相关的两段起源；完整 70 年演进时间线（含希尔排序、堆排序、内省排序、Timsort）见[进阶与线性排序篇](/algorithm/035-AdvancedSortAndLinearSort)第 2 章。

### 2.1 von Neumann 1945：归并排序的诞生

**1945 年**，John von Neumann 在著名的 EDVAC 报告《First Draft of a Report on the EDVAC》中描述了归并排序——这是首个 $O(n \log n)$ 算法，比快排早 14 年。von Neumann 关注归并排序是因为它在磁带存储上自然适配（外部排序）。Knuth 在 TAOCP Vol.3 §5.2.4 详细考据了归并排序的早期历史。

归并排序的分治思想奠定了后续算法的设计范式：将问题分解为子问题，递归求解后合并。这一思想在 Strassen 矩阵乘法、Karatsuba 大数乘法、FFT 中反复出现。

### 2.2 Hoare 1959-1961：快速排序的诞生

**1959 年**，C. A. R. Hoare（Tony Hoare）在莫斯科大学访问期间开发 ALGOL 60 翻译器时发明快速排序，目的是高效翻译俄语句子到英语的词序调整。**1961 年 7 月**，Hoare 在 *Communications of the ACM* 4(7):321 发表《Algorithm 64: Quicksort》，并在 *The Computer Journal* 5(1):10-15 发表完整论文《Quicksort》。

快排的核心创新是**分治+原地分区**：选择主元 pivot，将数组分为 $\leq$ pivot 和 $>$ pivot 两部分，递归排序。平均 $O(n \log n)$ 但最坏 $O(n^2)$（当 pivot 总是选到最值时）。Hoare 1980 年因"在编程语言定义和设计方面的根本性贡献"获 Turing Award，快排是其代表性成就之一。

快排的后续优化包括：
- **Sedgewick 1978** CACM 21(10):847-857《Implementing quicksort programs》：分析并优化快排实现；
- **三路快排**（Dijkstra Dutch National Flag 问题）：处理大量重复键 $O(n)$；
- **随机化快排**：避免最坏情况；
- **Dual-Pivot Quicksort**（Vladimir Yaroslavskiy 2009）：Java 7 起作为 `Arrays.sort(int[])` 默认实现。

---

## 3. 形式化定义与评价维度

### 3.1 排序问题的形式化定义

**定义**（排序问题）：给定 $n$ 个元素的序列 $A = [a_1, a_2, \dots, a_n]$ 与一个全序关系 $\leq$（满足自反性、反对称性、传递性），排序问题是找到一个排列 $\sigma: \{1, 2, \dots, n\} \to \{1, 2, \dots, n\}$，使得：
$$A[\sigma(1)] \leq A[\sigma(2)] \leq \dots \leq A[\sigma(n)]$$

**稳定性形式化**：若 $A[i] = A[j]$ 且 $i < j$，则排序后 $\sigma^{-1}(i) < \sigma^{-1}(j)$。即相等元素的相对顺序保持不变。

**比较排序的抽象**：比较排序可建模为函数 `compare(a, b) -> {-1, 0, 1}`，仅通过该函数访问元素。任何比较排序对应一棵决策树（详见 §3.2）。

### 3.2 比较排序下界的决策树证明

**定理**（比较排序下界）：任何基于比较的排序算法在最坏情况下至少需要 $\Omega(n \log n)$ 次比较。

**证明**（决策树方法）：

1. **决策树模型**：将比较排序的执行过程建模为一棵二叉决策树。每个内部节点表示一次比较 `compare(A[i], A[j])`，左子树对应 $A[i] \leq A[j]$，右子树对应 $A[i] > A[j]$。每个叶子节点对应一种输出排列。

2. **叶子数下界**：$n$ 个元素共有 $n!$ 种排列。为了能输出所有可能排列，决策树至少需要 $n!$ 个叶子节点（否则某排列无法被算法产生）。

3. **高度与叶子数关系**：高度为 $h$ 的二叉树最多有 $2^h$ 个叶子。故 $2^h \geq n!$，即 $h \geq \log_2(n!)$。

4. **Stirling 公式**：
   $$\log_2(n!) = \sum_{k=1}^{n} \log_2 k \approx n \log_2 n - n \log_2 e + \frac{1}{2} \log_2(2\pi n) = \Theta(n \log n)$$
   
   更精确地，Stirling 公式为 $n! \approx (n/e)^n \sqrt{2\pi n}$，故 $\log_2(n!) \approx n \log_2 n - n \log_2 e + O(\log n) = \Omega(n \log n)$。

5. **结论**：决策树高度 $h \geq \log_2(n!) = \Omega(n \log n)$，即最坏情况下至少需要 $\Omega(n \log n)$ 次比较。

**意义**：归并排序与堆排序在最坏情况下需要 $O(n \log n)$ 次比较，达到此下界，故它们是比较排序中渐近最优的。快速排序的平均比较次数 $2(n+1)H_n - 4n \approx 1.386 n \log_2 n$（$H_n$ 为调和级数），略高于下界但常数小。

### 3.3 快排平均复杂度的期望分析

**定理**（快排平均比较次数）：随机化快排的期望比较次数为 $E[C_n] = 2(n+1)H_n - 4n = O(n \log n)$，其中 $H_n = \sum_{k=1}^{n} 1/k \approx \ln n + \gamma$（$\gamma \approx 0.5772$ 为 Euler-Mascheroni 常数）。

**证明**：

设 $C_n$ 为对 $n$ 个元素排序的比较次数。主元将数组分为大小 $k$ 与 $n-1-k$ 的两部分（$k$ 等概率取 $0, 1, \dots, n-1$）：

$$E[C_n] = (n-1) + \frac{1}{n} \sum_{k=0}^{n-1} (E[C_k] + E[C_{n-1-k}])$$

其中 $(n-1)$ 是与主元比较的次数。利用对称性：

$$E[C_n] = (n-1) + \frac{2}{n} \sum_{k=0}^{n-1} E[C_k]$$

两边乘 $n$：
$$n E[C_n] = n(n-1) + 2 \sum_{k=0}^{n-1} E[C_k]$$

减去 $n-1$ 情形 $(n-1) E[C_{n-1}] = (n-1)(n-2) + 2 \sum_{k=0}^{n-2} E[C_k]$：

$$n E[C_n] - (n-1) E[C_{n-1}] = n(n-1) - (n-1)(n-2) + 2 E[C_{n-1}]$$
$$n E[C_n] = (n-1) E[C_{n-1}] + 2(n-1) + 2 E[C_{n-1}] = (n+1) E[C_{n-1}] + 2(n-1)$$

除以 $n(n+1)$：
$$\frac{E[C_n]}{n+1} = \frac{E[C_{n-1}]}{n} + \frac{2(n-1)}{n(n+1)}$$

累加求和：
$$\frac{E[C_n]}{n+1} = \sum_{k=2}^{n} \frac{2(k-1)}{k(k+1)} = 2 \sum_{k=2}^{n} \left( \frac{1}{k} - \frac{1}{k+1} \right) \cdot \frac{k}{k} $$

化简（关键步骤，利用 $\frac{k-1}{k(k+1)} = \frac{1}{k} - \frac{1}{k+1} - \frac{1}{k(k+1)}$ 实际上更简洁的处理）：

$$\frac{E[C_n]}{n+1} = 2 \sum_{k=1}^{n} \frac{1}{k+1} - \frac{2n}{n+1} + 0 = 2 H_{n+1} - 2 - \frac{2n}{n+1}$$

故：
$$E[C_n] = (n+1) \cdot (2 H_{n+1} - 2 - \frac{2n}{n+1}) = 2(n+1) H_n - 4n$$

证毕。

**渐近展开**：$H_n = \ln n + \gamma + O(1/n)$，故 $E[C_n] \approx 2(n+1) \ln n \approx 2 n \ln n = 2 n \log_2 n \cdot \ln 2 \approx 1.386 n \log_2 n$。

这与下界 $n \log_2 n$ 相比仅高 $38.6\%$，是快排在工业级排序中经久不衰的核心原因。

### 3.4 评价维度与稳定性的形式化保证

排序算法的核心评价维度有四：**时间复杂度**（最好/平均/最坏）、**空间复杂度与原地性**、**稳定性**、**自适应性**。时间与空间维度已在 1.4 节的全景对比表中逐算法标注；本节给出其中最容易误判、也最具工程价值的稳定性的形式化定义与反例分析。

**定义**（稳定排序）：排序算法 $\mathcal{A}$ 是稳定的，当且仅当对任意输入 $A$ 与任意相等对 $A[i] = A[j]$（$i < j$），$\mathcal{A}(A)$ 输出中 $\sigma^{-1}(i) < \sigma^{-1}(j)$。

**稳定性的工程价值**：
1. **多关键字排序**：先按次要关键字排序，再按主要关键字稳定排序，即可实现多关键字排序；
2. **数据库 ORDER BY**：SQL 标准并不保证 ORDER BY 对并列（排序键相等）行的输出顺序，该顺序由具体实现决定；依赖稳定序时应显式追加次级排序键（如 `ORDER BY a, b`）；
3. **UI 列表排序**：用户先按时间排序再按作者排序，期望保留时间顺序的稳定性。

**各排序的稳定性分析**：
- **冒泡、插入、归并、计数、基数、桶**：稳定（实现正确时）；
- **选择、希尔、快排、堆排**：不稳定（存在反例）。

**选择排序不稳定的反例**：$[5_a, 5_b, 2]$，第一轮选 $2$ 与 $5_a$ 交换得 $[2, 5_b, 5_a]$，破坏了 $5_a$ 与 $5_b$ 的相对顺序。

**快排不稳定的反例**：$[3_a, 2, 3_b, 1]$，以 $3_a$ 为主元，分区后 $3_b$ 可能被换到 $3_a$ 之前。

---

## 4. 冒泡排序

### 4.1 算法描述

冒泡排序（Bubble Sort）通过反复遍历数组，比较相邻元素并在逆序时交换，使大元素逐步"冒泡"到末尾。每轮遍历将当前未排序部分的最大值推到正确位置。

```text
初始: [5, 3, 8, 1, 2]
第1轮: [3, 5, 1, 2, 8] -- 8 冒泡到末尾
第2轮: [3, 1, 2, 5, 8] -- 5 冒泡到倒数第二
第3轮: [1, 2, 3, 5, 8] -- 3 冒泡到倒数第三
第4轮: [1, 2, 3, 5, 8] -- 无交换，提前终止
```

### 4.2 Python 实现

```python
from typing import List

def bubble_sort(arr: List[int]) -> List[int]:
    """
    冒泡排序（含提前终止优化）
    
    Args:
        arr: 待排序数组
        
    Returns:
        排序后的数组（原地修改）
        
    Time:  最好 O(n)，平均 O(n^2)，最坏 O(n^2)
    Space: O(1)
    Stable: True
    """
    n = len(arr)
    for i in range(n - 1):
        swapped = False
        # 每轮将最大元素冒泡到 n-1-i 位置
        for j in range(n - 1 - i):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
                swapped = True
        # 若某轮无交换，说明数组已有序
        if not swapped:
            break
    return arr

def cocktail_sort(arr: List[int]) -> List[int]:
    """
    鸡尾酒排序（双向冒泡）
    
    交替从左到右和从右到左遍历，加速处理"乌龟"（尾部小值）问题。
    
    Args:
        arr: 待排序数组
        
    Returns:
        排序后的数组
        
    Time:  最好 O(n)，平均 O(n^2)，最坏 O(n^2)
    Space: O(1)
    Stable: True
    """
    n = len(arr)
    left, right = 0, n - 1
    while left < right:
        swapped = False
        # 从左到右，将最大值冒泡到 right
        for i in range(left, right):
            if arr[i] > arr[i + 1]:
                arr[i], arr[i + 1] = arr[i + 1], arr[i]
                swapped = True
        right -= 1
        # 从右到左，将最小值冒泡到 left
        for i in range(right, left, -1):
            if arr[i] < arr[i - 1]:
                arr[i], arr[i - 1] = arr[i - 1], arr[i]
                swapped = True
        left += 1
        if not swapped:
            break
    return arr
```

### 4.3 C++ 实现

```cpp
#include <vector>
#include <utility>

// 冒泡排序（含提前终止）
void bubbleSort(std::vector<int>& arr) {
    int n = arr.size();
    for (int i = 0; i < n - 1; ++i) {
        bool swapped = false;
        for (int j = 0; j < n - 1 - i; ++j) {
            if (arr[j] > arr[j + 1]) {
                std::swap(arr[j], arr[j + 1]);
                swapped = true;
            }
        }
        if (!swapped) break;
    }
}
```

### 4.4 Java 实现

```java
public class BubbleSort {
    
    /**
     * 冒泡排序（含提前终止）
     * @param arr 待排序数组
     */
    public static void bubbleSort(int[] arr) {
        int n = arr.length;
        for (int i = 0; i < n - 1; i++) {
            boolean swapped = false;
            for (int j = 0; j < n - 1 - i; j++) {
                if (arr[j] > arr[j + 1]) {
                    int tmp = arr[j];
                    arr[j] = arr[j + 1];
                    arr[j + 1] = tmp;
                    swapped = true;
                }
            }
            if (!swapped) break;
        }
    }
}
```

### 4.5 复杂度分析

| 情况 | 比较次数 | 交换次数 | 时间 |
| ---- | ---- | ---- | ---- |
| 最好（已有序） | $n-1$ | $0$ | $O(n)$ |
| 平均 | $n(n-1)/4$ | $n(n-1)/4$ | $O(n^2)$ |
| 最坏（逆序） | $n(n-1)/2$ | $n(n-1)/2$ | $O(n^2)$ |

**空间** $O(1)$，**稳定**，**原地**，**自适应**（带提前终止优化）。

### 4.6 工程价值与局限

冒泡排序在实际工程中**几乎不使用**，原因：
1. 平均 $O(n^2)$ 慢于插入排序（常数更大）；
2. 交换次数与比较次数相等，对大元素（结构体）效率差；
3. CPU 缓存利用差（频繁相邻访问，但每次访问都触发比较+交换）。

**教学价值**：冒泡排序是入门排序的最佳教学算法，因其简单性揭示了排序的核心要素：比较、交换、循环不变式。

---

## 5. 选择排序与插入排序

### 5.1 选择排序

**算法**：每轮选出剩余元素中的最小值放到已排序末尾。

```python
def selection_sort(arr: list[int]) -> list[int]:
    """
    选择排序
    
    Time:  最好/平均/最坏 O(n^2)
    Space: O(1)
    Stable: False
    """
    n = len(arr)
    for i in range(n - 1):
        min_idx = i
        for j in range(i + 1, n):
            if arr[j] < arr[min_idx]:
                min_idx = j
        if min_idx != i:
            arr[i], arr[min_idx] = arr[min_idx], arr[i]
    return arr
```

**特点**：
- 比较次数固定 $n(n-1)/2$，交换次数最多 $n-1$ 次；
- **不稳定**（如 $[5_a, 5_b, 2]$，$5_a$ 与 $2$ 交换破坏 $5_a, 5_b$ 顺序）；
- **非自适应**（无论输入如何都执行相同次数）；
- **适合指针排序**：当元素较大但指针小时，交换指针比交换元素高效。

### 5.2 插入排序

**算法**：模拟扑克牌整理过程，将新牌插入已排好的手牌中。

```python
def insertion_sort(arr: list[int]) -> list[int]:
    """
    插入排序
    
    Time:  最好 O(n)，平均 O(n^2)，最坏 O(n^2)
    Space: O(1)
    Stable: True
    Adaptive: True
    """
    for i in range(1, len(arr)):
        key = arr[i]
        j = i - 1
        # 将 key 插入到 arr[0..i-1] 的正确位置
        while j >= 0 and arr[j] > key:
            arr[j + 1] = arr[j]
            j -= 1
        arr[j + 1] = key
    return arr

def binary_insertion_sort(arr: list[int]) -> list[int]:
    """
    二分插入排序
    
    用二分查找确定插入位置，比较次数 O(n log n)，但移动次数仍 O(n^2)。
    
    Time:  最好 O(n)，平均 O(n^2)，最坏 O(n^2)
    Space: O(1)
    Stable: True
    """
    for i in range(1, len(arr)):
        key = arr[i]
        # 二分查找插入位置
        left, right = 0, i
        while left < right:
            mid = (left + right) // 2
            if arr[mid] <= key:
                left = mid + 1
            else:
                right = mid
        # 将 arr[left..i-1] 右移一位
        for j in range(i, left, -1):
            arr[j] = arr[j - 1]
        arr[left] = key
    return arr
```

**特点**：
- **最好 $O(n)$**：已有序时每轮仅比较一次；
- **平均 $O(n^2)$**：约 $n^2/4$ 次比较与移动；
- **稳定、原地、自适应**；
- **小数据最优**：$n < 50$ 时通常优于快排（常数小，无递归开销）；
- **Timsort 与 introsort 的小数据回退方案**。

**为什么二分插入排序仍 $O(n^2)$？** 虽然二分查找将比较次数降到 $O(\log i)$，但元素移动仍需 $O(i)$ 次（数组连续存储特性）。二分插入排序在元素较大、比较成本高的场景（如字符串）有优势。

---

## 6. 归并排序

### 6.1 算法描述

归并排序（Merge Sort）由 von Neumann 1945 年发明，是首个 $O(n \log n)$ 排序算法。核心思想是**分治**：将数组对半分，递归排序后合并两个有序子数组。

```text
[38, 27, 43, 3, 9, 82, 10]
        分治
[38, 27, 43, 3] [9, 82, 10]
[38, 27] [43, 3] [9, 82] [10]
[38] [27] [43] [3] [9] [82] [10]
        合并
[27, 38] [3, 43] [9, 82] [10]
[3, 27, 38, 43] [9, 10, 82]
[3, 9, 10, 27, 38, 43, 82]
```

### 6.2 Python 实现

```python
from typing import List

def merge_sort_topdown(arr: List[int]) -> List[int]:
    """
    自顶向下归并排序（递归版）
    
    Time:  O(n log n)
    Space: O(n)
    Stable: True
    """
    if len(arr) <= 1:
        return arr
    mid = len(arr) // 2
    left = merge_sort_topdown(arr[:mid])
    right = merge_sort_topdown(arr[mid:])
    return _merge(left, right)

def _merge(left: List[int], right: List[int]) -> List[int]:
    """合并两个有序数组"""
    result = []
    i = j = 0
    while i < len(left) and j < len(right):
        # 注意：用 <= 保证稳定性（相等时取 left）
        if left[i] <= right[j]:
            result.append(left[i])
            i += 1
        else:
            result.append(right[j])
            j += 1
    result.extend(left[i:])
    result.extend(right[j:])
    return result

def merge_sort_bottomup(arr: List[int]) -> List[int]:
    """
    自底向上归并排序（迭代版）
    
    自底向上消除递归，避免栈溢出。
    
    Time:  O(n log n)
    Space: O(n)
    Stable: True
    """
    n = len(arr)
    if n <= 1:
        return arr
    width = 1
    while width < n:
        # 以 width 为单位两两合并
        for i in range(0, n, 2 * width):
            left = arr[i:i + width]
            right = arr[i + width:i + 2 * width]
            arr[i:i + 2 * width] = _merge(left, right)
        width *= 2
    return arr
```

**运行示例**：

```python
if __name__ == "__main__":
    data = [38, 27, 43, 3, 9, 82, 10]
    print(merge_sort_topdown(data[:]))
    print(merge_sort_bottomup(data[:]))
```

预期输出：

```text
[3, 9, 10, 27, 38, 43, 82]
[3, 9, 10, 27, 38, 43, 82]
```

### 6.3 C++ 实现

```cpp
#include <vector>

void mergeSortHelper(std::vector<int>& arr, std::vector<int>& tmp,
                     int left, int right) {
    if (left >= right) return;
    int mid = left + (right - left) / 2;
    mergeSortHelper(arr, tmp, left, mid);
    mergeSortHelper(arr, tmp, mid + 1, right);
    
    // 合并 arr[left..mid] 与 arr[mid+1..right]
    int i = left, j = mid + 1, k = left;
    while (i <= mid && j <= right) {
        if (arr[i] <= arr[j]) tmp[k++] = arr[i++];
        else tmp[k++] = arr[j++];
    }
    while (i <= mid) tmp[k++] = arr[i++];
    while (j <= right) tmp[k++] = arr[j++];
    for (int p = left; p <= right; ++p) arr[p] = tmp[p];
}

void mergeSort(std::vector<int>& arr) {
    if (arr.size() <= 1) return;
    std::vector<int> tmp(arr.size());
    mergeSortHelper(arr, tmp, 0, arr.size() - 1);
}
```

### 6.4 复杂度分析

**递推式**：$T(n) = 2T(n/2) + O(n)$，由主定理（case 2）得 $T(n) = O(n \log n)$。

**空间**：$O(n)$（合并时需要辅助数组）。

**比较次数**：最坏 $n \log_2 n - n + 1$，最少 $n \log_2 n / 2$（已部分有序时）。

**稳定性**：稳定（合并时相等元素取左路）。

### 6.5 工程应用

1. **Java `Arrays.sort(Object[])`**（Java 7 前）：纯归并排序；
2. **Python Timsort 的合并阶段**：检测自然 run 后归并；
3. **数据库外部排序**：多路归并 + 替换选择；
4. **MapReduce shuffle**：分布式归并排序；
5. **链表排序**：归并是链表的最佳排序方法（无随机访问，但合并 $O(1)$ 空间）。

---

## 7. 快速排序

### 7.1 算法描述

快速排序（Quicksort）由 Hoare 1959-1961 年发明，平均 $O(n \log n)$ 但最坏 $O(n^2)$，因常数小、缓存友好，是工业级排序的核心。算法分三步：
1. **选主元**（pivot）：从数组中选一个元素作为分区基准；
2. **分区**（partition）：将 $\leq$ pivot 的放左，$>$ pivot 的放右；
3. **递归**：对左右两部分递归排序。

### 7.2 分区方案

#### 7.2.1 Lomuto 分区（最简方案）

```python
def partition_lomuto(arr: list[int], low: int, high: int) -> int:
    """
    Lomuto 分区：选最右元素为主元
    
    简单但性能差：当数组已有序时每次分区不平衡，最坏 O(n^2)。
    """
    pivot = arr[high]
    i = low - 1  # i 指向 "<= pivot" 区域的最后一个元素
    for j in range(low, high):
        if arr[j] <= pivot:
            i += 1
            arr[i], arr[j] = arr[j], arr[i]
    arr[i + 1], arr[high] = arr[high], arr[i + 1]
    return i + 1

def quicksort_lomuto(arr: list[int], low: int, high: int) -> None:
    if low < high:
        p = partition_lomuto(arr, low, high)
        quicksort_lomuto(arr, low, p - 1)
        quicksort_lomuto(arr, p + 1, high)
```

#### 7.2.2 Hoare 分区（原始版本，性能更优）

```python
def partition_hoare(arr: list[int], low: int, high: int) -> int:
    """
    Hoare 分区：选最左元素为主元，双向扫描
    
    比 Lomuto 平均少 3 倍交换次数。
    """
    pivot = arr[low]
    i = low - 1
    j = high + 1
    while True:
        i += 1
        while arr[i] < pivot:
            i += 1
        j -= 1
        while arr[j] > pivot:
            j -= 1
        if i >= j:
            return j
        arr[i], arr[j] = arr[j], arr[i]

def quicksort_hoare(arr: list[int], low: int, high: int) -> None:
    if low < high:
        p = partition_hoare(arr, low, high)
        quicksort_hoare(arr, low, p)
        quicksort_hoare(arr, p + 1, high)
```

#### 7.2.3 三路快排（处理大量重复键）

```python
def partition_three_way(arr: list[int], low: int, high: int) -> tuple[int, int]:
    """
    三路分区（Dijkstra Dutch National Flag）
    
    将数组分为三部分：< pivot | == pivot | > pivot
    适合大量重复键场景，O(n) 最优。
    """
    pivot = arr[low]
    lt = low      # lt 之前是 < pivot
    gt = high     # gt 之后是 > pivot
    i = low + 1
    while i <= gt:
        if arr[i] < pivot:
            arr[lt], arr[i] = arr[i], arr[lt]
            lt += 1
            i += 1
        elif arr[i] > pivot:
            arr[i], arr[gt] = arr[gt], arr[i]
            gt -= 1
        else:
            i += 1
    return lt, gt

def quicksort_three_way(arr: list[int], low: int, high: int) -> None:
    if low < high:
        lt, gt = partition_three_way(arr, low, high)
        quicksort_three_way(arr, low, lt - 1)
        quicksort_three_way(arr, gt + 1, high)
```

#### 7.2.4 随机化快排

```python
import random

def quicksort_randomized(arr: list[int], low: int, high: int) -> None:
    """
    随机化快排：随机选主元，避免最坏情况
    
    期望复杂度 O(n log n)，且不依赖输入分布。
    """
    if low < high:
        # 随机选主元并交换到 high
        rand_idx = random.randint(low, high)
        arr[rand_idx], arr[high] = arr[high], arr[rand_idx]
        p = partition_lomuto(arr, low, high)
        quicksort_randomized(arr, low, p - 1)
        quicksort_randomized(arr, p + 1, high)
```

**运行示例**：

```python
if __name__ == "__main__":
    data = [5, 3, 8, 1, 9, 2, 7]
    quicksort_hoare(data, 0, len(data) - 1)
    print(data)
    dup = [4, 1, 4, 3, 4, 2, 4]
    quicksort_three_way(dup, 0, len(dup) - 1)
    print(dup)
```

预期输出：

```text
[1, 2, 3, 4, 5, 7, 8]
[1, 2, 3, 4, 4, 4, 4]
```

### 7.3 主元选择策略

| 策略 | 描述 | 优劣 |
| ---- | ---- | ---- |
| 取首/尾 | `arr[low]` 或 `arr[high]` | 简单但已有序输入退化为 $O(n^2)$ |
| 随机化 | 随机选一个 | 期望 $O(n \log n)$，不依赖输入 |
| 三数取中 | `median(arr[low], arr[mid], arr[high])` | 实战效果最好，工业级默认 |
| Tukey ninther | 9 个元素分组取中位数的中位数 | 极端数据下更稳健，stdlibc++ 使用 |
| Introselect | 递归深度过深时切换到中位数算法 | introsort 的核心思想 |

### 7.4 工程实现技巧

1. **小数据切到插入排序**：当 `high - low < 16` 时改用插入排序（常数小，无递归开销）；
2. **尾递归消除**：递归调用时先递归较小一侧，较大一侧改为循环，最坏栈深 $O(\log n)$；
3. **三数取中**：避免有序输入退化；
4. **partition 后立即检查已有序**：若一侧长度为 0，跳过递归。

### 7.5 复杂度分析

- **最好** $O(n \log n)$（主元每次都居中）；
- **平均** $O(n \log n)$（期望 $1.386 n \log_2 n$ 次比较）；
- **最坏** $O(n^2)$（主元每次都是极值，如已有序数组）；
- **空间** $O(\log n)$（递归栈，尾递归优化后）；
- **不稳定**。

### 7.6 Dual-Pivot Quicksort（Java 7+）

Vladimir Yaroslavskiy 2009 年提出双主元快排，将数组分为三部分（$< P_1$、$P_1 \leq x \leq P_2$、$> P_2$）。Java 7 起作为 `Arrays.sort(int[])`、`Arrays.sort(long[])` 等基础类型排序的默认实现。

Wild-Nebel 2012 证明 Dual-Pivot Quicksort 平均比较次数 $\frac{2}{5} n \ln n \approx 0.277 n \log_2 n$，**优于**单主元快排的 $1.386 n \log_2 n / 2 = 0.693 n \log_2 n$。

---

## 8. 经典应用案例（基础篇）

### 8.1 LeetCode 56 合并区间（自定义排序 + 贪心）

**题目**：给定区间集合 `intervals`，合并所有重叠区间。

**解题策略**：按区间起点排序，然后扫描合并。这是排序作为"预处理"的典型应用——排序将无序的区间问题转化为线性扫描问题。

```python
def merge(intervals: list[list[int]]) -> list[list[int]]:
    """按起点排序后线性扫描合并"""
    if not intervals:
        return []
    # 按起点升序，起点相同按终点降序
    intervals.sort(key=lambda x: (x[0], -x[1]))
    merged = [intervals[0]]
    for start, end in intervals[1:]:
        last_end = merged[-1][1]
        if start <= last_end:
            merged[-1][1] = max(last_end, end)
        else:
            merged.append([start, end])
    return merged
```

**复杂度**：时间 $O(n \log n)$（排序主导），空间 $O(n)$（结果数组）。**关键洞察**：自定义比较器是 Python Timsort 的高频用法，Timsort 对部分有序数据自适应。

### 8.2 LeetCode 179 最大数（自定义比较 + 字符串拼接）

**题目**：给定非负整数数组，排列使结果最大。

**解题策略**：将整数转字符串，自定义比较器 `"a+b" vs "b+a"`（拼接前后比较）。这是排序中"全序关系"自定义的典型案例。

```python
from functools import cmp_to_key

def largestNumber(nums: list[int]) -> str:
    """自定义比较器：a 应在 b 前当且仅当 a+b > b+a"""
    strs = [str(x) for x in nums]
    def compare(a, b):
        if a + b > b + a:
            return -1  # a 在前
        elif a + b < b + a:
            return 1   # b 在前
        else:
            return 0
    strs.sort(key=cmp_to_key(compare))
    # 处理前导零
    result = ''.join(strs)
    return '0' if result[0] == '0' else result
```

**关键洞察**：
1. 比较器必须满足**全序关系**（反对称性、传递性、完全性），否则排序结果未定义；
2. `"a+b" vs "b+a"` 是经典的等价关系构造，证明：若 $a+b \geq b+a$ 且 $b+c \geq c+b$，则 $a+c \geq c+a$（由字符串拼接的结合律保证）；
3. Python 3 移除了 `sorted(cmp=...)`，需用 `functools.cmp_to_key` 转换。

### 8.3 LeetCode 315 计算右侧小于当前元素的个数（归并排序 + 逆序对）

**题目**：返回数组 `nums` 中每个元素右侧小于它的元素个数。

**解题策略**：本质是求每个元素的"右侧逆序对数"。归并排序在合并阶段天然处理逆序对——当右半部分元素 $R[j] < L[i]$ 时，$L[i..]$ 全部构成逆序对。这是排序算法作为"分析工具"的深层应用。

```python
def countSmaller(nums: list[int]) -> list[int]:
    """归并排序变体：合并时统计右侧小于个数"""
    n = len(nums)
    count = [0] * n
    # 索引数组，避免直接对元素排序丢失位置信息
    indices = list(range(n))
    temp = [0] * n
    
    def merge_sort(left, right):
        if left >= right:
            return
        mid = (left + right) // 2
        merge_sort(left, mid)
        merge_sort(mid + 1, right)
        merge(left, mid, right)
    
    def merge(left, mid, right):
        i, j = left, mid + 1
        k = left
        # 统计阶段：当 L[i] > R[j] 时，[mid+1, j] 内所有元素 < L[i]
        while i <= mid and j <= right:
            if nums[indices[i]] > nums[indices[j]]:
                # 这里不立即统计，等到 i 前移时再统一累计
                temp[k] = indices[j]
                k += 1; j += 1
            else:
                # 关键：nums[indices[i]] <= nums[indices[j]]
                # 但右侧 [mid+1, j-1] 内所有元素 < nums[indices[i]]
                count[indices[i]] += (j - mid - 1)
                temp[k] = indices[i]
                k += 1; i += 1
        while i <= mid:
            count[indices[i]] += (j - mid - 1)
            temp[k] = indices[i]
            k += 1; i += 1
        while j <= right:
            temp[k] = indices[j]
            k += 1; j += 1
        indices[left:right+1] = temp[left:right+1]
    
    merge_sort(0, n - 1)
    return count
```

**复杂度**：时间 $O(n \log n)$，空间 $O(n)$。**核心洞察**：归并排序分治天然暴露逆序对，比暴力 $O(n^2)$ 快 100 倍。这是分治算法"在分治过程中累积统计"的典范，同类问题包括：
- 逆序对总数（剑指 Offer 51）；
- 翻转对（LeetCode 493）；
- 区间和计数（LeetCode 327）。

> 基础排序的另一类高频案例（LeetCode 912 排序数组、LeetCode 215 数组中的第 K 个最大元素）依赖堆排序与内省排序，见[进阶与线性排序篇](/algorithm/035-AdvancedSortAndLinearSort)第 7 章。

---

## 9. 常见陷阱与误区（基础篇）

### 9.1 快排最坏退化为 $O(n^2)$

**陷阱**：朴素快排取首/尾元素为主元，在已序数据上递归深度 $n$，时间 $O(n^2)$，栈溢出。

**修复**：
```python
# 错误：取首元素
pivot = arr[low]

# 正确：随机化
pivot = arr[random.randint(low, high)]

# 更优：三数取中
mid = (low + high) // 2
if arr[mid] < arr[low]: arr[low], arr[mid] = arr[mid], arr[low]
if arr[high] < arr[low]: arr[low], arr[high] = arr[high], arr[low]
if arr[mid] < arr[high]: arr[mid], arr[high] = arr[high], arr[mid]
pivot = arr[high]
```

### 9.2 归并排序空间泄漏

**陷阱**：递归版归并在每层都分配新数组，空间 $O(n \log n)$。

**修复**：全局复用一个临时数组：
```python
# 错误：每次 merge 分配
def merge_wrong(arr, low, mid, high):
    temp = [0] * (high - low + 1)  # 累积 O(n log n)
    # ...

# 正确：全局复用
def merge_sort(arr):
    temp = [0] * len(arr)  # 全局一次分配
    _merge_sort(arr, 0, len(arr) - 1, temp)

def _merge(arr, low, mid, high, temp):
    temp[low:high+1] = arr[low:high+1]
    # ... 使用 temp
```

### 9.3 插入排序误用于链表

**陷阱**：插入排序的"二分插入"优化依赖随机访问，链表上无法 $O(\log n)$ 查找插入位置。

**修复**：链表上直接用普通插入排序 $O(n^2)$，或改用归并排序 $O(n \log n)$。

### 9.4 排序稳定性误判

**陷阱**：误以为快排、堆排、选择排序稳定。实际上：
- **稳定**：冒泡、插入、归并、计数、基数、桶、Timsort；
- **不稳定**：选择、希尔、快排、堆排、introsort、pdqsort。

### 9.5 自定义比较器不满足全序

**陷阱**：Python `cmp_to_key` 转换的比较器若不满足传递性，排序结果未定义。常见于：
- 浮点数比较含 `NaN`（`NaN != NaN`，破坏全序）；
- 自定义对象比较器跨字段比较（如 `"a+b" vs "b+a"` 需证明传递性）。

**修复**：使用 `functools.total_ordering` + 显式定义 `__lt__`，并验证传递性。

### 9.6 整数溢出（mid 计算）

**陷阱**：C/C++ 中 `mid = (low + high) / 2` 在 `low + high` 超过 `INT_MAX` 时溢出。Java `Arrays.binarySearch` 在 2006 年因此被 Bloch 修复。

**修复**：
```c
// 错误
int mid = (low + high) / 2;

// 正确
int mid = low + (high - low) / 2;
// 或
int mid = (low & high) + ((low ^ high) >> 1);
```

### 9.7 Python `sorted` 与 `list.sort` 混淆

**陷阱**：`sorted` 返回新列表不修改原对象，`list.sort` 原地修改返回 `None`。

```python
# 错误：忘了 list.sort 返回 None
result = arr.sort()

# 正确
arr.sort()
result = arr
# 或
result = sorted(arr)  # arr 不变
```

---

## 10. 自测题（基础篇）

### 10.1 填空题知识点讲解

**常见疑问 6**：比较排序在最坏情况下的时间复杂度下界是 $\Omega(\_\_\_)$，由 **决策树** 模型证明，关键不等式为 $2^h \geq n!$。

**解析讲解**：$n \log n$。由 $\log_2(n!) = \Theta(n \log n)$（Stirling 公式 $n! \approx (n/e)^n \sqrt{2\pi n}$）。

**常见疑问 7**：快速排序的平均时间复杂度为 $O(n \log n)$，其期望分析给出平均比较次数 $E[C_n] = $ $\_\_\_$，其中 $H_n = \sum_{k=1}^n 1/k$ 为第 $n$ 个调和数。

**解析讲解**：$2(n+1)H_n - 4n \approx 1.386 n \log_2 n$。

### 10.2 代码修正题

**常见疑问 11**：下列快排代码在 LeetCode 912 上对已序输入会 TLE，请找出 bug 并修复：

```python
def quicksort_wrong(arr, low, high):
    if low >= high:
        return
    pivot = arr[low]  # Bug 1
    i, j = low, high
    while i < j:
        while i < j and arr[j] >= pivot: j -= 1
        arr[i] = arr[j]
        while i < j and arr[i] <= pivot: i += 1
        arr[j] = arr[i]
    arr[i] = pivot
    quicksort_wrong(arr, low, i - 1)
    quicksort_wrong(arr, i + 1, high)  # Bug 2: 无尾递归优化

quicksort_wrong(arr, 0, len(arr) - 1)
```

**修复**：
1. Bug 1：取首元素为主元在已序数据上退化为 $O(n^2)$，改为随机化或三数取中；
2. Bug 2：递归深度最坏 $n$，需尾递归优化（迭代处理较短半部分）。

```python
import random

def quicksort_fixed(arr, low, high):
    while low < high:
        # 随机化主元
        rand_idx = random.randint(low, high)
        arr[low], arr[rand_idx] = arr[rand_idx], arr[low]
        pivot = arr[low]
        i, j = low, high
        while i < j:
            while i < j and arr[j] >= pivot: j -= 1
            arr[i] = arr[j]
            while i < j and arr[i] <= pivot: i += 1
            arr[j] = arr[i]
        arr[i] = pivot
        # 尾递归优化：迭代较短半部分，递归较长半部分
        if i - low < high - i:
            quicksort_fixed(arr, low, i - 1)
            low = i + 1
        else:
            quicksort_fixed(arr, i + 1, high)
            high = i - 1
```

**常见疑问 12**：下列归并排序代码在 100 万元素时内存占用 1.5GB，请找出 bug：

```python
def merge_wrong(arr, low, mid, high):
    left = arr[low:mid+1].copy()    # 问题：每次 merge 都分配
    right = arr[mid+1:high+1].copy()
    i = j = 0
    k = low
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            arr[k] = left[i]; i += 1
        else:
            arr[k] = right[j]; j += 1
        k += 1
    while i < len(left):
        arr[k] = left[i]; i += 1; k += 1
    while j < len(right):
        arr[k] = right[j]; j += 1; k += 1
```

**问题**：每次 merge 分配 `left` 与 `right` 数组，递归树每层累积 $O(n)$，总空间 $O(n \log n) \approx 1.5\text{GB}$（100 万元素 × 20 层 × 8 字节）。

**修复**：全局复用单个临时数组：

```python
def merge_sort(arr):
    temp = [0] * len(arr)  # 全局一次分配 O(n)
    _merge_sort(arr, 0, len(arr) - 1, temp)

def _merge(arr, low, mid, high, temp):
    temp[low:high+1] = arr[low:high+1]  # 复用 temp
    i, j = low, mid + 1
    k = low
    while i <= mid and j <= high:
        if temp[i] <= temp[j]:
            arr[k] = temp[i]; i += 1
        else:
            arr[k] = temp[j]; j += 1
        k += 1
    while i <= mid:
        arr[k] = temp[i]; i += 1; k += 1
    while j <= high:
        arr[k] = temp[j]; j += 1; k += 1
```

---

## 11. 参考资料（基础篇）

### 11.1 经典教材

1. Knuth, Donald E. (1998). *The Art of Computer Programming, Volume 3: Sorting and Searching* (2nd ed.). Addison-Wesley Professional. ISBN 978-0201896855. Section 5.1 (Combinatorial Properties of Permutations), Section 5.2 (Internal Sorting), Section 5.3 (External Sorting), Section 5.4 (Sorting on Large Secondary Storage Devices).
2. Cormen, Thomas H.; Leiserson, Charles E.; Rivest, Ronald L.; Stein, Clifford (2022). *Introduction to Algorithms* (4th ed.). MIT Press. ISBN 978-0262046305. Chapter 2 (Insertion Sort, Merge Sort), Chapter 6 (Heapsort), Chapter 7 (Quicksort), Chapter 8 (Linear Time Sorting).
3. Sedgewick, Robert; Wayne, Kevin (2011). *Algorithms* (4th ed.). Addison-Wesley Professional. ISBN 978-0321573513. Section 2.1-2.4 (Elementary Sorts, Mergesort, Quicksort, Priority Queues), Section 5.1 (String Sorts).
4. Kleinberg, Jon; Tardos, Éva (2006). *Algorithm Design*. Pearson. ISBN 978-0321295354. Chapter 5 (Divide and Conquer - Mergesort, Counting Inversions).
5. Mehlhorn, Kurt; Sanders, Peter (2008). *Algorithms and Data Structures: The Basic Toolbox*. Springer. ISBN 978-3540779773. Chapter 4 (Sorting and Selection).

### 11.2 历史性论文（基础篇相关）

6. von Neumann, John (1945). "First Draft of a Report on the EDVAC". Moore School of Electrical Engineering, University of Pennsylvania. 归并排序的首次描述（Knuth TAOCP Vol.3 §5.2.4 考据）。
7. Friend, Edward H. (1956). "Sorting on Electronic Computer Systems". *Journal of the ACM* 3(3): 134-168. DOI:10.1145/320831.320833. 首次系统化讨论冒泡排序、插入排序、归并排序。
8. Hoare, C. A. R. (1961). "Algorithm 64: Quicksort". *Communications of the ACM* 4(7): 321. DOI:10.1145/366622.366644.
9. Hoare, C. A. R. (1962). "Quicksort". *The Computer Journal* 5(1): 10-15. DOI:10.1093/comjnl/5.1.10. 快排完整论文，Hoare 因此获 1980 年 Turing Award。
10. Sedgewick, Robert (1978). "Implementing quicksort programs". *Communications of the ACM* 21(10): 847-857. DOI:10.1145/359619.359631. 快排工程优化的经典论文，含分区方案、主元选择、小数组优化。

---

## 12. 延伸学习（基础篇）

### 12.1 理论深入（基础篇相关）

- **比较排序下界的更严格证明**：CLRS §8.1 给出基于决策树的 $\Omega(n \log n)$ 下界；更深入可阅读 Knuth TAOCP Vol.3 §5.3.1 关于"最小比较次数"的精确研究（已知 $n=12$ 时最小 30 次比较）。
- **快排平均复杂度的精确分析**：Knuth TAOCP Vol.3 §5.2.2 给出 $E[C_n] = 2(n+1)H_n - 4n$ 的完整推导；Hennessy-Patterson《Computer Architecture》讨论快排在现代 CPU 上的分支预测代价。

### 12.2 教学视频

- **MIT 6.006 Introduction to Algorithms**：Lecture 4、5、7（排序与哈希），Erik Demaine 主讲，2011 Spring，OCW 公开课；
- **MIT 6.046J Design and Analysis of Algorithms**：Lecture 1、2、4（排序与选择），Charles Leiserson 主讲，2015 Spring；
- **Stanford CS161 Design and Analysis of Algorithms**：Lecture 7、8（排序），Tim Roughgarden 主讲，2016 Winter；
- **Berkeley CS 61B Data Structures**：Lecture 18、19（Sorting），Josh Hug 主讲，2020 Spring；
- **Robert Sedgewick Algorithms Coursera**：Part 1 Week 3 (Mergesort)、Week 4 (Priority Queues + Heapsort)、Part 1 Week 5 (Quicksort)；
- **Visualizing Algorithms**：https://www.cs.usfca.edu/~galles/visualization/ComparisonSort.html 排序可视化。

### 12.3 在线交互工具

- **VisuAlgo**：https://visualgo.net/en/sorting 10+ 种排序算法可视化，可单步执行；
- **Sorting Algorithm Animations**：https://www.toptal.com/developers/sorting-algorithms Toptal 提供，对比 8 种排序在随机/已序/逆序/几乎有序数据上的表现；
- **OpenGenus IQ**：https://iq.opengenus.org/ 排序算法百科，含 50+ 变体；
- **USACO Guide**：https://usaco.guide/bronze/sorting-custom 自定义排序习题集。

---

## 13. 总结与选型

### 13.1 核心知识图谱

```mermaid
flowchart TD
    S[排序]
    S --> C[比较排序 Ω(n log n)<br/>插入类：插入/希尔<br/>交换类：冒泡/快排/堆排/归并]
    S --> N[非比较排序 O(n)<br/>计数/基数 LSD MSD/桶]
    S --> E[外部排序 O(n log n / M)<br/>多路归并/替换选择/Fibonacci/多步归并]
    S --> M[混合排序 工业级<br/>introsort Musser 1997 堆排+快排+插入排序<br/>Timsort Peters 2002 自然 run+二分插入+归并栈]
```

### 13.2 三大核心论证方法

1. **决策树归约**：用于证明比较排序下界 $\Omega(n \log n)$。$n$ 个元素有 $n!$ 种排列，决策树至少需 $n!$ 个叶子，故高度 $h \geq \log_2(n!) = \Theta(n \log n)$；
2. **期望分析**：用于证明快排平均 $O(n \log n)$。设 $E[C_n]$ 为 $n$ 元素平均比较次数，递推 $E[C_n] = n - 1 + \frac{1}{n} \sum_{k=0}^{n-1}(E[C_k] + E[C_{n-k-1}])$，解得 $E[C_n] = 2(n+1)H_n - 4n$；
3. **势能分析**：用于证明 Timsort 归并栈操作均摊 $O(1)$。定义势函数 $\Phi = \sum_i (r_i - r_{i+1})$，每次合并势能下降抵消实际代价。

### 13.3 关键历史设计决策

**9 条关键设计决策**：

1. **比较 vs 非比较**：von Neumann 选择比较排序保证通用性；Hollerith/Seward 选择非比较排序追求线性时间；
2. **分治 vs 增量**：归并与快排选择分治；插入与冒泡选择增量；
3. **递归 vs 迭代**：归并与快排递归；堆排、希尔、自底向上归并迭代；
4. **稳定 vs 不稳定**：归并、计数、基数稳定；快排、堆排、选择、希尔不稳定；
5. **原地 vs 辅助空间**：快排、堆排、插入原地 $O(1)$；归并需 $O(n)$；
6. **平均 vs 最坏**：快排平均 $O(n \log n)$ 最坏 $O(n^2)$；堆排、归并最坏 $O(n \log n)$；
7. **自适应 vs 非自适应**：Timsort、插入排序对部分有序数据加速；堆排、选择排序非自适应；
8. **混合 vs 纯算法**：introsort 混合快排+堆排+插入；Timsort 混合归并+二分插入；
9. **缓存友好 vs 缓存不友好**：堆排缓存不友好（跨层访问）；快排、归并缓存友好（顺序访问）。

### 13.4 工业级选型决策树

面对一个排序需求，按以下顺序决策：

1. **是否需稳定排序**？
   - 是 → Timsort（Python/Java 对象/V8）或归并（C++ stable_sort）
   - 否 → 进入下一步
2. **是否值域有限（如 byte/short）**？
   - 是 → 计数排序 $O(n+k)$
   - 否 → 进入下一步
3. **是否字符串/可按位分解**？
   - 是 → 基数排序 $O(d \cdot n)$
   - 否 → 进入下一步
4. **是否数据规模超内存**？
   - 是 → 外部归并排序（数据库方案）
   - 否 → 进入下一步
5. **是否需要最坏保证**？
   - 是 → introsort（C++ std::sort）或 Timsort
   - 否 → 随机化快排（最简实现）
6. **是否小数据（n < 50）**？
   - 是 → 插入排序
   - 否 → 上述任一方案

> 注：决策树中涉及的堆排序、计数/基数/桶排序与外部归并排序的实现细节见[进阶与线性排序篇](/algorithm/035-AdvancedSortAndLinearSort)。

### 13.5 下一步学习路径

完成排序算法学习后，建议按以下顺序深入：

1. **算法分析基础**：掌握 Master Theorem、势能分析、概率分析；
2. **数据结构进阶**：红黑树、B 树、跳表、哈希表；
3. **图算法**：Dijkstra（堆优化）、Prim、Kruskal（并查集）、拓扑排序；
4. **动态规划**：背包、LCS、矩阵链乘、状态压缩；
5. **高级主题**：近似算法、随机化算法、在线算法、并行算法；
6. **工程实战**：阅读 CPython listsort.txt、JDK DualPivotQuicksort.java、libstdc++ stl_algo.h 源码，参与 LeetCode 排序相关题目练习（专题 912、215、56、179、315、493、327）。

> **结语**：排序是算法学习的入门，也是工程实战的核心。从 Hollerith 1887 的打孔卡片到 Peters 2002 的 Timsort，从 von Neumann 1945 的归并到 Musser 1997 的 introsort，每个排序算法都凝结了一个时代的智慧。掌握排序不仅是掌握算法本身，更是理解"如何用数学严格分析、如何用工程取舍平衡"的方法论。

---

<!-- FANDEX Content Engineering - 排序算法 - MIT/Stanford/CMU 金标准版 - 2026-07-20 -->

## 延伸资源

- [VisuAlgo: Sorting](https://visualgo.net/en/sorting)：新加坡国立大学的排序可视化，逐步动画演示从冒泡到基数排序并标注复杂度与稳定性（英文，免费，适合建立过程直觉）。
- [USF Data Structure Visualizations](https://www.cs.usfca.edu/~galles/visualization/Algorithms.html)：旧金山大学的算法可视化合集，含各类排序算法的逐帧动画（英文，免费，适合课堂演示与自学对照）。

> 外部资源免责声明：以上链接为第三方资源，仅作学习索引；其内容的准确性、合法性与可用性由相应运营方负责，仓库维护者不对使用者使用该等资源所产生的各类问题承担责任。
