---
order: 10
tags:
  - 'algorithm'
  - 'performance'
difficulty: 'beginner'
title: '算法分析基础与学习路线'
module: 'algorithm'
category: 'Algorithm/Overview'
description: '算法分析核心概念、渐进复杂度符号体系、时空权衡策略与系统化学习路线图。'
author: 'fanquanpp'
---

- [6. 算法设计范式总览](#6-算法设计范式总览)
- [7. 学习路线图](#7-学习路线图)
- [8. 算法速查表](#8-算法速查表)
- [9. 延伸阅读](#9-延伸阅读)

---

## 1. 算法与问题

### 1.1 算法的定义

算法是一组有限的、明确定义的指令序列，用于解决某类问题或完成某项计算任务。一个有效的算法必须满足以下五个基本性质：
| 性质 | 含义 | 反例 |
|------|------|------|
| 有穷性 | 算法在有限步骤后必须终止 | 死循环不构成算法 |
| 确定性 | 每一步的执行含义唯一确定 | "将x加1或加2"不是确定性步骤 |
| 可行性 | 每一步都能在有限时间内完成 | "计算精确的pi值"不可行 |
| 输入 | 有零个或多个外部输入 | -- |
| 输出 | 有一个或多个输出 | -- |

### 1.2 判定问题与优化问题

算法所处理的问题可分为两大类：
**判定问题（Decision Problem）**：回答"是"或"否"。例如：给定图G和整数k，G中是否存在大小为k的团？
**优化问题（Optimization Problem）**：在所有可行解中寻找最优解。例如：给定图G，求最大团的大小。
两者之间存在深刻联系：优化问题通常可以转化为判定问题（通过二分答案），而判定问题的多项式时间算法往往能导出优化问题的算法。P vs NP 问题正是围绕判定问题的可解性展开的。

### 1.3 问题规模与输入编码

问题规模n是衡量输入大小的标尺，其选择直接影响复杂度函数的形式：

- 数组排序：n = 数组长度
- 矩阵乘法：n = 矩阵维度
- 图算法：n 可以是顶点数V或边数E
- 整数运算：n = 整数的二进制位数（注意：n不等于整数本身的值）
  编码方式的选择也很关键。同一个整数，用一元编码（n个1）和二进制编码（log n位）表示，会导致完全不同的复杂度结论。在标准计算模型（图灵机/RAM）下，默认使用二进制编码。
  > 跨模块引用：整数编码与位运算密切相关，参见 [C++基础](cpp/overview) 中的位运算章节。

---

## 2. 渐进复杂度符号

### 2.1 五类符号的严格定义

渐进符号用于描述函数在输入规模趋于无穷时的增长行为，忽略常数因子和低阶项。
**大O符号（上界）**：
f(n) = O(g(n)) 当且仅当存在正常数c和n0，使得对所有 n >= n0，有 0 <= f(n) <= c _ g(n)。
含义：f(n)的增长速率不超过g(n)的某个常数倍。表示算法的**最坏情况**保证。
**大Omega符号（下界）**：
f(n) = Omega(g(n)) 当且仅当存在正常数c和n0，使得对所有 n >= n0，有 0 <= c _ g(n) <= f(n)。
含义：f(n)的增长速率至少为g(n)的某个常数倍。表示问题的**固有难度**。
**大Theta符号（紧界）**：
f(n) = Theta(g(n)) 当且仅当 f(n) = O(g(n)) 且 f(n) = Omega(g(n))。
含义：f(n)与g(n)同阶增长。这是最精确的复杂度描述。
**小o符号（非紧上界）**：
f(n) = o(g(n)) 当且仅当对任意正常数c，存在n0，使得对所有 n >= n0，有 0 <= f(n) < c _ g(n)。
含义：f(n)的增长速率严格小于g(n)。例如 n = o(n log n)。
**小omega符号（非紧下界）**：
f(n) = omega(g(n)) 当且仅当对任意正常数c，存在n0，使得对所有 n >= n0，有 0 <= c _ g(n) < f(n)。
含义：f(n)的增长速率严格大于g(n)。例如 n log n = omega(n)。

### 2.2 常见复杂度等级

从快到慢排列：

```
 O(1) < O(log n) < O(sqrt(n)) < O(n) < O(n log n) < O(n^2) < O(n^3) < O(2^n) < O(n!) < O(n^n)
```

**可视化：不同复杂度在n=1..20时的增长曲线**

```
 n值 | O(1) O(logn) O(n) O(nlogn) O(n^2) O(2^n)
 True-------|--------------------------------------------------
 1 | 1 0 1 0 1 2
 2 | 1 1 2 2 4 4
 4 | 1 2 4 8 16 16
 8 | 1 3 8 24 64 256
 16 | 1 4 16 64 256 65536
 32 | 1 5 32 160 1024 4294967296
 64 | 1 6 64 384 4096 1.8e19
 1024 | 1 10 1024 10240 1048576 1.8e308
```

**实际意义**：假设每秒执行10^9次运算：
| 复杂度 | n=10 | n=100 | n=1000 | n=10^6 |
|--------|------|-------|--------|--------|
| O(log n) | <1ns | <1ns | <1ns | 20ns |
| O(n) | 10ns | 100ns | 1us | 1ms |
| O(n log n) | 33ns | 664ns | 10us | 20ms |
| O(n^2) | 100ns | 10us | 1ms | 17min |
| O(2^n) | 1us | 4e13yr | -- | -- |

### 2.3 渐进符号的运算性质

1. **传递性**：若 f = O(g) 且 g = O(h)，则 f = O(h)
2. **自反性**：f = O(f)
3. **对称性**：f = Theta(g) 当且仅当 g = Theta(f)
4. **转置对称性**：f = O(g) 当且仅当 g = Omega(f)
5. **加法规则**：O(f) + O(g) = O(max(f, g))
6. **乘法规则**：O(f) _ O(g) = O(f _ g)

### 2.4 常见递推式的解

| 递推式                | 解         | 典型算法       |
| --------------------- | ---------- | -------------- |
| T(n) = T(n-1) + O(1)  | O(n)       | 线性扫描       |
| T(n) = T(n-1) + O(n)  | O(n^2)     | 选择排序       |
| T(n) = 2T(n/2) + O(n) | O(n log n) | 归并排序       |
| T(n) = 2T(n/2) + O(1) | O(n)       | 数组求和(分治) |
| T(n) = T(n/2) + O(1)  | O(log n)   | 二分搜索       |
| T(n) = T(n/2) + O(n)  | O(n)       | 快速选择       |
| T(n) = 3T(n/2) + O(n) | O(n^1.585) | Karatsuba乘法  |

> 跨模块引用：递推式的求解与主定理密切相关，详见下文第4节。排序算法的复杂度分析参见 [排序算法](algorithm/sorting)。

---

## 3. 时空权衡

### 3.1 核心思想

算法设计中，时间与空间往往此消彼长。不存在同时达到时间最优和空间最优的"免费午餐"。时空权衡的核心策略有两类：
**以空间换时间**：使用额外的存储空间来加速计算。这是更常见的策略，因为内存成本持续下降而时间效率始终是核心瓶颈。
**以时间换空间**：在存储资源受限时，通过重复计算来减少存储需求。典型于嵌入式系统和大规模数据处理。

### 3.2 经典权衡案例

**案例1：排序中的辅助数组**
归并排序需要O(n)额外空间来实现合并操作，但保证了O(n log n)的时间复杂度。而原地排序（如堆排序）虽然空间为O(1)，但常数因子更大且不稳定。
**案例2：搜索中的索引/哈希表**
线性搜索O(n)无需额外空间；构建哈希索引后查找降至O(1)平均，但需要O(n)额外空间。这是典型的空间换时间。
**案例3：动态规划中的备忘录**
递归解法（如斐波那契）时间O(2^n)空间O(n)；加备忘录后时间O(n)空间O(n)；自底向上迭代后时间O(n)空间可优化至O(1)。
**案例4：布隆过滤器**
用m位比特数组近似表示n个元素的集合，查询O(k)（k个哈希函数），空间仅m/n比特/元素，代价是存在假阳性（误判存在）。

### 3.3 权衡决策框架

```
 是否需要最优时间？ --是--> 空间是否充裕？ --是--> 以空间换时间
  | |
  | +--否--> 寻找时间-空间折中方案
  |
  +--否--> 空间是否受限？ --是--> 以时间换空间
  |
  +--否--> 平衡方案（如缓存策略）
```

## **量化分析**：设S(n)为空间开销，T(n)为时间开销。定义效率函数 E(n) = T(n) \* S(n)^a，其中a为空间权重（0 < a <= 1）。选择使E(n)最小的方案。

## 4. 递归与主定理

### 4.1 递归树方法

递归树是分析分治算法的直观工具。将递推式T(n) = aT(n/b) + f(n)展开为树形结构：

- 根节点的工作量为f(n)
- 每个节点产生a个子节点，每个子节点规模为n/b
- 第i层有a^i个节点，每个节点工作量为f(n/b^i)
- 树的深度为log_b(n)
- 总工作量 = 各层工作量之和
  **可视化：T(n) = 2T(n/2) + cn 的递归树**

```
  cn -- 第0层: cn
  / \
  cn/2 cn/2 -- 第1层: cn
  / \ / \
  cn/4 cn/4 cn/4 cn/4 -- 第2层: cn
  ... ... ... ...
  c c c c c c -- 第log n层: cn
 总计: cn * (log n + 1) = O(n log n)
```

### 4.2 主定理（Master Theorem）

对于递推式 T(n) = aT(n/b) + f(n)，其中 a >= 1, b > 1：
**情形1**：若 f(n) = O(n^(log*b(a) - epsilon))（对某个epsilon > 0），则 T(n) = Theta(n^log_b(a))。
直觉：叶子节点的总工作量支配根节点的工作量。
**情形2**：若 f(n) = Theta(n^log_b(a) * (log n)^k)（k >= 0），则 T(n) = Theta(n^log*b(a) * (log n)^(k+1))。
特殊情况k=0：若 f(n) = Theta(n^log_b(a))，则 T(n) = Theta(n^log_b(a) * log n)。
直觉：各层工作量大致相等。
**情形3**：若 f(n) = Omega(n^(log_b(a) + epsilon))（对某个epsilon > 0），且正则条件 a*f(n/b) <= c\*f(n)（对某个c < 1和足够大的n），则 T(n) = Theta(f(n))。
直觉：根节点的工作量支配叶子节点的总工作量。

### 4.3 主定理应用示例

| 递推式             | a   | b   | log_b(a) | f(n)  | 情形 | 解           |
| ------------------ | --- | --- | -------- | ----- | ---- | ------------ |
| T(n)=2T(n/2)+n     | 2   | 2   | 1        | n     | 2    | O(n log n)   |
| T(n)=2T(n/2)+1     | 2   | 2   | 1        | 1     | 1    | O(n)         |
| T(n)=2T(n/2)+n^2   | 2   | 2   | 1        | n^2   | 3    | O(n^2)       |
| T(n)=4T(n/2)+n     | 4   | 2   | 2        | n     | 1    | O(n^2)       |
| T(n)=4T(n/2)+n^2   | 4   | 2   | 2        | n^2   | 2    | O(n^2 log n) |
| T(n)=3T(n/4)+nlogn | 3   | 4   | 0.79     | nlogn | 3    | O(n log n)   |
| T(n)=8T(n/2)+n^3   | 8   | 2   | 3        | n^3   | 2    | O(n^3 log n) |

### 4.4 Python与C++实现：递归树可视化

```python
 def analyze_recurrence(a, b, f_n, n):
  """
  分析递推式 T(n) = aT(n/b) + f(n) 的各层工作量
  返回各层工作量列表和总工作量
  """
  import math
  log_b_a = math.log(a, b)
  levels = int(math.log(n, b))
  work_per_level = []
  for i in range(levels + 1):
  num_nodes = a ** i
  work_per_node = f_n(n / (b ** i))
  level_work = num_nodes * work_per_node
  work_per_level.append(level_work)
  total = sum(work_per_level)
  return work_per_level, total
 def f_merge_sort(n):
  return n
 work, total = analyze_recurrence(2, 2, f_merge_sort, 1024)
 for i, w in enumerate(work):
  print(f"Level {i}: {w:.1f}")
 print(f"Total: {total:.1f}")
```

```cpp
 #include <iostream>
 #include <vector>
 #include <cmath>
 #include <functional>
 using namespace std;
 vector<double> analyzeRecurrence(int a, int b, function<double(double)> f, int n) {
  int levels = static_cast<int>(log(n) / log(b));
  vector<double> workPerLevel;
  for (int i = 0; i <= levels; i++) {
  double numNodes = pow(a, i);
  double workPerNode = f(n / pow(b, i));
  workPerLevel.push_back(numNodes * workPerNode);
  }
  return workPerLevel;
 True}
 int main() {
  auto fMergeSort = [](double n) -> double { return n; };
  auto work = analyzeRecurrence(2, 2, fMergeSort, 1024);
  double total = 0;
  for (int i = 0; i < work.size(); i++) {
  cout << "Level " << i << ": " << work[i] << endl;
  total += work[i];
  }
  cout << "Total: " << total << endl;
  return 0;
 True}
```

---

## 5. 摊还分析

### 5.1 为什么需要摊还分析

最坏情况分析有时过于悲观。某些数据结构的大部分操作代价很低，偶尔出现一次高代价操作。摊还分析关注**n个操作的序列总代价**，而非单个操作的最坏代价，从而给出更紧的界。
关键区别：

- 平均情况分析：依赖概率假设
- 摊还分析：不依赖概率，保证对任意操作序列成立

### 5.2 聚合分析（Aggregate Method）

对n个操作的序列，计算总代价的上界T(n)，则每个操作的摊还代价为T(n)/n。
**示例：动态数组扩容**
动态数组（如C++ vector、Python list）在容量满时扩容为原来的2倍：

```python
 class DynamicArray:
  def __init__(self):
  self.capacity = 1
  self.size = 0
  self.data = [None] * self.capacity
  def push_back(self, val):
  if self.size == self.capacity:
  new_data = [None] * (self.capacity * 2)
  for i in range(self.size):
  new_data[i] = self.data[i]
  self.data = new_data
  self.capacity *= 2
  self.data[self.size] = val
  self.size += 1
```

分析n次push_back的总代价：

- 普通插入：O(1)每次
- 扩容发生在第1, 2, 4, 8, ..., 2^k次插入时
- 扩容代价：1 + 2 + 4 + ... + n/2 < n
- 总代价：n（普通插入）+ n（扩容）= O(n)
- 摊还代价：O(n)/n = O(1)

```cpp
 #include <vector>
 #include <iostream>
 using namespace std;
 class DynamicArray {
  int* data;
  int cap, sz;
 public:
  DynamicArray() : data(new int[1]), cap(1), sz(0) {}
  ~DynamicArray() { delete[] data; }
  void push_back(int val) {
  if (sz == cap) {
  int* newData = new int[cap * 2];
  for (int i = 0; i < sz; i++) newData[i] = data[i];
  delete[] data;
  data = newData;
  cap *= 2;
  }
  data[sz++] = val;
  }
  int operator[](int i) const { return data[i]; }
  int size() const { return sz; }
 True};
```

### 5.3 核算法（Accounting Method）

为不同类型的操作赋予不同的摊还代价（"收费"），使得：

- 摊还代价 >= 实际代价时，多余部分作为"信用"存储在数据结构中
- 摊还代价 < 实际代价时，用存储的信用来支付差额
- 信用始终非负
  动态数组push_back的核算法分析：
- 普通插入：实际代价1，摊还代价3（1用于插入，1作为信用留给未来扩容时的复制，1留给配对元素）
- 扩容插入：实际代价 = 1（插入）+ sz（复制），但sz个元素的信用恰好支付复制代价
- 摊还代价 = O(1)

### 5.4 势能法（Potential Method）

定义势能函数 Phi(D) 将数据结构状态映射为非负实数。操作i的摊还代价：
a*i = c_i + Phi(D_i) - Phi(D*{i-1})
其中c_i为实际代价。若Phi(D_0) = 0且对所有i有Phi(D_i) >= 0，则总摊还代价是总实际代价的上界。
动态数组的势能函数：Phi(D) = 2 \* size - capacity

- 普通插入：a_i = 1 + (2(sz+1) - cap) - (2\*sz - cap) = 1 + 2 = 3
- 扩容插入（cap从k变为2k，sz从k变为k+1）：a_i = (1 + k) + (2(k+1) - 2k) - (2k - k) = 1 + k + 2 - k = 3
  两种情况下摊还代价均为3，即O(1)。

### 5.5 多重弹栈示例

考虑一个栈支持三种操作：

- Push(S, x)：O(1)
- Pop(S)：O(1)
- Multipop(S, k)：弹出min(k, |S|)个元素，O(min(k, |S|))
  n个操作序列的聚合分析：
- 每个元素最多被push一次、pop一次
- 总pop次数（包括Multipop中的）不超过总push次数
- 总代价 <= 2n = O(n)
- 摊还代价 = O(1)

---

## 6. 算法设计范式总览

### 6.1 五大范式对比

算法设计范式是解决问题的关键思维框架。不同范式适用于不同结构的问题，理解其本质区别是算法学习的核心。
| 范式 | 核心思想 | 适用条件 | 典型问题 | 时间复杂度特征 |
|------|----------|----------|----------|----------------|
| 分治 | 分解-解决-合并 | 子问题独立 | 归并排序、快速排序 | O(n log n) |
| 贪心 | 每步取局部最优 | 贪心选择性质+最优子结构 | 活动选择、Huffman编码 | 通常O(n log n) |
| 动态规划 | 记忆化避免重复 | 最优子结构+无后效性 | 背包、LCS、编辑距离 | 依赖状态空间大小 |
| 回溯 | 系统搜索+剪枝 | 解空间可枚举 | N皇后、子集生成 | 指数级(最坏) |
| 分支限界 | BFS搜索+下界剪枝 | 可计算下界 | TSP、整数规划 | 指数级(最坏) |

### 6.2 分治 vs 贪心 vs 动态规划：本质区别

**分治（Divide and Conquer）**的本质是"独立"：

- 将问题分解为**互不重叠**的子问题
- 分别求解后合并
- 子问题之间没有依赖关系
- 例子：归并排序中左半和右半独立排序
  **贪心（Greedy）**的本质是"短视"：
- 在每一步做出**局部最优**选择
- 不回头、不撤销
- 依赖贪心选择性质：局部最优能导向全局最优
- 例子：Dijkstra算法中每次选最近节点
  **动态规划（Dynamic Programming）**的本质是"记忆"：
- 子问题**重叠**，需要避免重复计算
- 通过记录子问题的解来消除冗余
- 依赖最优子结构：最优解包含子问题的最优解
- 例子：Floyd-Warshall中dist[k][i][j]依赖dist[k-1]
  **决策流程**：

```
 问题是否可分解为独立子问题？ --是--> 分治
  |
  +--否--> 问题是否有最优子结构？ --否--> 回溯/暴力搜索
  |
  +--是--> 局部最优能否导向全局最优？ --是--> 贪心
  |
  +--否--> 子问题是否重叠？ --是--> 动态规划
  |
  +--否--> 分治（但可能需要更巧妙的分解）
```

### 6.3 范式选择的常见误区

1. **贪心与DP混淆**：0-1背包贪心不可行，但分数背包贪心可行。关键区别在于物品是否可分割——不可分割导致贪心选择的"不可逆"与全局最优矛盾。
2. **分治与DP混淆**：分治的子问题不重叠，DP的子问题重叠。如果分治递归中出现大量重复子问题，应考虑DP。
3. **回溯与分支限界混淆**：回溯用DFS搜索，分支限界用BFS。回溯适合找一个解，分支限界适合找最优解。
   > 跨模块引用：各范式的详细实现分别参见 [排序算法](algorithm/sorting)（分治）、[贪心算法](algorithm/greedy)、[动态规划](algorithm/dynamic-programming)。

---

## 7. 学习路线图

### 7.1 三阶段学习路径

**第一阶段：基础（4-6周）**
目标：掌握基本数据结构与经典算法，能独立完成Easy难度题目。
| 周次 | 主题 | 核心内容 | 练习量 |
|------|------|----------|--------|
| 1-2 | 数据结构基础 | 数组、链表、栈、队列 | 15题 |
| 3-4 | 排序与搜索 | 排序算法、二分搜索、哈希表 | 15题 |
| 5-6 | 树与递归 | 二叉树遍历、递归思维 | 15题 |
**第二阶段：进阶（6-8周）**
目标：掌握算法设计范式，能独立完成Medium难度题目。
| 周次 | 主题 | 核心内容 | 练习量 |
|------|------|----------|--------|
| 7-9 | 动态规划 | 背包、LCS、区间DP | 25题 |
| 10-11 | 图算法 | BFS/DFS、最短路、拓扑排序 | 20题 |
| 12-14 | 贪心与回溯 | 贪心证明、回溯剪枝 | 20题 |
**第三阶段：专题（持续）**
目标：深入特定方向，攻克Hard题目。
| 方向 | 核心内容 | 参考资源 |
|------|----------|----------|
| 字符串算法 | KMP、后缀数组、AC自动机 | 算法竞赛进阶指南 |
| 计算几何 | 凸包、线段交、半平面交 | 计算几何算法与应用 |
| 高级数据结构 | 线段树、树状数组、LCT | 国家集训队论文 |
| 数学与数论 | 快速幂、GCD、素数筛 | 算法竞赛入门经典 |

### 7.2 学习节奏建议

- 每日投入1.5-2小时
- 每日2-3题：1题复习+1题新题+可选1题挑战
- 每周1次总结：回顾本周题目，归纳模式
- 每2周1次模拟：限时完成3-4题
  > 跨模块引用：具体刷题策略参见 [LeetCode刷题指南](algorithm/leetcode-guide)。

---

## 8. 算法速查表

### 8.1 复杂度速查

| 数据结构 | 访问       | 搜索       | 插入       | 删除       | 空间 |
| -------- | ---------- | ---------- | ---------- | ---------- | ---- |
| 数组     | O(1)       | O(n)       | O(n)       | O(n)       | O(n) |
| 链表     | O(n)       | O(n)       | O(1)       | O(1)       | O(n) |
| 栈       | O(n)       | O(n)       | O(1)       | O(1)       | O(n) |
| 队列     | O(n)       | O(n)       | O(1)       | O(1)       | O(n) |
| 哈希表   | N/A        | O(1)\*     | O(1)\*     | O(1)\*     | O(n) |
| BST      | O(log n)\* | O(log n)\* | O(log n)\* | O(log n)\* | O(n) |
| 红黑树   | O(log n)   | O(log n)   | O(log n)   | O(log n)   | O(n) |
| B树      | O(log n)   | O(log n)   | O(log n)   | O(log n)   | O(n) |

\*平均复杂度，最坏情况可能退化

### 8.2 排序算法速查

| 算法     | 最好     | 平均     | 最坏     | 空间    | 稳定 | 原地 |
| -------- | -------- | -------- | -------- | ------- | ---- | ---- |
| 冒泡排序 | O(n)     | O(n^2)   | O(n^2)   | O(1)    | 是   | 是   |
| 选择排序 | O(n^2)   | O(n^2)   | O(n^2)   | O(1)    | 否   | 是   |
| 插入排序 | O(n)     | O(n^2)   | O(n^2)   | O(1)    | 是   | 是   |
| 快速排序 | O(nlogn) | O(nlogn) | O(n^2)   | O(logn) | 否   | 是   |
| 归并排序 | O(nlogn) | O(nlogn) | O(nlogn) | O(n)    | 是   | 否   |
| 堆排序   | O(nlogn) | O(nlogn) | O(nlogn) | O(1)    | 否   | 是   |
| 计数排序 | O(n+k)   | O(n+k)   | O(n+k)   | O(k)    | 是   | 否   |
| 基数排序 | O(dn)    | O(dn)    | O(dn)    | O(n+d)  | 是   | 否   |

### 8.3 图算法速查

| 算法           | 时间复杂度 | 空间复杂度 | 适用场景             |
| -------------- | ---------- | ---------- | -------------------- |
| BFS            | O(V+E)     | O(V)       | 无权最短路、层序遍历 |
| DFS            | O(V+E)     | O(V)       | 环检测、拓扑排序     |
| Dijkstra       | O(E log V) | O(V)       | 非负权最短路         |
| Bellman-Ford   | O(VE)      | O(V)       | 含负权最短路         |
| Floyd-Warshall | O(V^3)     | O(V^2)     | 全源最短路           |
| Kruskal        | O(E log E) | O(E)       | 最小生成树(稀疏图)   |
| Prim           | O(E log V) | O(V)       | 最小生成树(稠密图)   |
| 拓扑排序       | O(V+E)     | O(V)       | DAG排序              |

### 8.4 DP经典问题速查

| 问题     | 状态定义             | 转移方程                                                  | 时间     | 空间  |
| -------- | -------------------- | --------------------------------------------------------- | -------- | ----- |
| 斐波那契 | dp[i]: 第i项         | dp[i]=dp[i-1]+dp[i-2]                                     | O(n)     | O(1)  |
| 0-1背包  | dp[i][w]: 前i个容量w | dp[i][w]=max(dp[i-1][w],dp[i-1][w-wi]+vi)                 | O(nW)    | O(W)  |
| LCS      | dp[i][j]: 前i前j     | dp[i][j]=max(dp[i-1][j],dp[i][j-1],dp[i-1][j-1]+1)        | O(mn)    | O(mn) |
| LIS      | dp[i]: 以i结尾       | dp[i]=max(dp[j]+1) for j<i, a[j]<a[i]                     | O(nlogn) | O(n)  |
| 编辑距离 | dp[i][j]: 前i前j     | dp[i][j]=min(dp[i-1][j]+1,dp[i][j-1]+1,dp[i-1][j-1]+cost) | O(mn)    | O(mn) |

---

## 9. 延伸阅读

- CLRS 第 2-4 章（渐进符号与递归）
- 《算法设计手册》(Skiena) 第 2 章
- [Big-O Cheat Sheet](https://www.bigocheatsheet.com/)
- 《算法导论》摊还分析专题（第17章）
- Sedgewick & Wayne, _Algorithms_, 4th Edition, Chapter 1
- Kleinberg & Tardos, _Algorithm Design_, Chapter 2-3
  > 跨模块引用：算法的实现语言基础参见 [C++基础](cpp/overview) 和 [Python基础](python/overview)。

### 跨模块关联

- [C语言](c/overview)
- [C++](cpp/overview-and-standards)
- [Python](python/overview)
