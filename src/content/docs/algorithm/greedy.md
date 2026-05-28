---
order: 80
tags:
  - 'algorithm'
  - 'performance'
  - 'networking'
  - 'data-structure'
  - 'math'
difficulty: 'intermediate'
title: '贪心算法'
module: 'algorithm'
category: 'Algorithm/Greedy'
description: '贪心算法核心思想与正确性证明，涵盖活动选择、哈夫曼编码、最小生成树等经典问题，附复杂度分析与多语言实现。'
author: 'fanquanpp'
---

- [3. 活动选择问题](#3-活动选择问题)
- [4. 哈夫曼编码](#4-哈夫曼编码)
- [5. 最小生成树 -- Kruskal](#5-最小生成树----kruskal)
- [6. 最小生成树 -- Prim](#6-最小生成树----prim)
- [7. 贪心与动态规划的边界](#7-贪心与动态规划的边界)
- [8. 贪心算法速查表](#8-贪心算法速查表)
- [9. 延伸阅读](#9-延伸阅读)

---

## 1. 贪心策略思想

### 1.1 核心原则

贪心算法在每一步决策时都选择当前看起来最优的选项，不回头、不撤销。其正确性依赖于两个关键性质：

**贪心选择性质（Greedy Choice Property）**：通过局部最优选择可以得到全局最优解。即存在一个最优解包含了贪心策略在第一步所做的选择。

**最优子结构（Optimal Substructure）**：做出贪心选择后，剩余子问题的最优解与贪心选择组合，构成原问题的最优解。

### 1.2 贪心与DP的本质区别

| 维度       | 贪心                     | 动态规划               |
| ---------- | ------------------------ | ---------------------- |
| 决策方式   | 每步取局部最优，不回头   | 考虑所有可能的子问题解 |
| 子问题关系 | 做出选择后只剩一个子问题 | 需要比较多个子问题的解 |
| 正确性保证 | 需要证明贪心选择性质     | 最优子结构即可保证     |
| 时间复杂度 | 通常O(n log n)           | 通常O(n^2)或更高       |
| 适用范围   | 较窄，需要特殊性质       | 较广，通用性强         |

### 1.3 贪心算法的一般框架

```
Greedy(problem):
    解集 S = 空集
    while 问题未完全解决:
        选择当前最优元素 e
        if e 可行（不违反约束）:
            将 e 加入 S
        else:
            丢弃 e
    return S
```

> 跨模块引用：贪心与DP的范式对比参见 [算法分析基础](algorithm/overview)。DP的详细分析参见 [动态规划](algorithm/dynamic-programming)。

---

## 2. 贪心正确性证明

### 2.1 交换论证法（Exchange Argument）

**核心思想**：取一个最优解OPT，逐步将其"交换"为贪心解GREEDY，证明交换过程中最优性不被破坏。

**步骤**：

1. 设OPT为任意一个最优解
2. 证明OPT可以被修改为包含贪心选择的解OPT'，且cost(OPT') <= cost(OPT)
3. 对子问题递归应用，最终OPT被完全替换为GREEDY

**示例：活动选择**

设贪心选择了结束最早的活动a1，OPT选择了活动b1（b1结束时间不早于a1）。将OPT中的b1替换为a1：

- a1的结束时间 <= b1的结束时间
- 替换后不会与其他活动冲突（因为a1结束更早，留出更多空间）
- 因此OPT' = (OPT - {b1}) + {a1}也是最优解

### 2.2 保持领先法（Stay Ahead）

**核心思想**：证明贪心算法在每一步的解都"不差于"最优解的对应步骤。

**步骤**：

1. 设贪心解的度量序列为 g1, g2, ..., gk
2. 设最优解的度量序列为 o1, o2, ..., om
3. 证明对所有i，gi >= oi（或gi <= oi，取决于优化方向）
4. 由此推出贪心解整体不差于最优解

### 2.3 贪心失效的典型场景

**0-1背包问题**：贪心按单位价值排序选择，但可能无法得到最优解。

```
背包容量W=10
物品A: w=6, v=60, 单位价值=10
物品B: w=5, v=50, 单位价值=10
物品C: w=5, v=50, 单位价值=10

贪心选择A(价值60)，剩余容量4，无法再选 -> 总价值60
最优解选择B+C -> 总价值100
```

**原因**：0-1背包中物品不可分割，贪心选择的"不可逆"与全局最优矛盾。

---

## 3. 活动选择问题

### 3.1 问题描述

给定n个活动，每个活动有开始时间s[i]和结束时间f[i]，选择最多的互不冲突的活动集合。

### 3.2 思路分析

**贪心策略**：按结束时间排序，每次选择结束最早的活动。

**直觉**：结束越早，留给后续活动的时间窗口越大，能安排的活动越多。

```
活动:  [1,4] [3,5] [0,6] [5,7] [3,9] [5,9] [6,10] [8,11] [8,12] [2,14] [12,16]

按结束时间排序后:
[1,4] [3,5] [0,6] [5,7] [3,9] [5,9] [6,10] [8,11] [8,12] [2,14] [12,16]

选择过程:
选[1,4] -> 选[5,7] -> 选[8,11] -> 选[12,16]
共4个活动
```

### 3.3 复杂度分析

- 排序：O(n log n)
- 贪心选择：O(n)
- 总时间：O(n log n)
- 空间：O(1)（不计排序空间）

### 3.4 代码实现

```python
def activity_selection(activities):
    activities.sort(key=lambda x: x[1])
    selected = [activities[0]]
    last_end = activities[0][1]
    for i in range(1, len(activities)):
        if activities[i][0] >= last_end:
            selected.append(activities[i])
            last_end = activities[i][1]
    return selected

def activity_selection_count(activities):
    activities.sort(key=lambda x: x[1])
    count = 1
    last_end = activities[0][1]
    for i in range(1, len(activities)):
        if activities[i][0] >= last_end:
            count += 1
            last_end = activities[i][1]
    return count
```

```cpp
#include <vector>
#include <algorithm>
using namespace std;

vector<pair<int,int>> activitySelection(vector<pair<int,int>>& activities) {
    sort(activities.begin(), activities.end(),
         [](const auto& a, const auto& b) { return a.second < b.second; });
    vector<pair<int,int>> selected;
    selected.push_back(activities[0]);
    int lastEnd = activities[0].second;
    for (int i = 1; i < activities.size(); i++) {
        if (activities[i].first >= lastEnd) {
            selected.push_back(activities[i]);
            lastEnd = activities[i].second;
        }
    }
    return selected;
}
```

### 3.5 变体：加权活动选择

每个活动有权重w[i]，求最大权重的不冲突活动集合。贪心不再适用，需要DP：

```python
def weighted_activity_selection(activities):
    activities.sort(key=lambda x: x[1])
    n = len(activities)
    dp = [0] * (n + 1)
    for i in range(1, n + 1):
        s, f, w = activities[i - 1]
        j = i - 1
        while j > 0 and activities[j - 1][1] > s:
            j -= 1
        dp[i] = max(dp[i - 1], w + dp[j])
    return dp[n]
```

---

## 4. 哈夫曼编码

### 4.1 问题描述

给定一组字符及其出现频率，构造一棵最优前缀编码树，使编码后的总长度最短。

### 4.2 思路分析

**前缀码**：没有任何字符的编码是另一个字符编码的前缀。前缀码与二叉树一一对应。

**贪心策略**：每次合并频率最小的两个节点，生成新节点（频率为两者之和），直到只剩一个根节点。

```
字符频率: a=5, b=9, c=12, d=13, e=16, f=45

构建过程:
1. 合并a(5)和b(9) -> ab(14)
   剩余: c(12), d(13), ab(14), e(16), f(45)

2. 合并c(12)和d(13) -> cd(25)
   剩余: ab(14), e(16), cd(25), f(45)

3. 合并ab(14)和e(16) -> abe(30)
   剩余: cd(25), abe(30), f(45)

4. 合并cd(25)和abe(30) -> abcde(55)
   剩余: abcde(55), f(45)

5. 合并f(45)和abcde(55) -> 根(100)

编码:
f: 0
c: 100
d: 101
a: 1100
b: 1101
e: 111

总编码长度: 45*1 + 12*3 + 13*3 + 5*4 + 9*4 + 16*3 = 224位
```

### 4.3 复杂度分析

- 使用最小堆：O(n log n)
- 每次合并O(log n)，共n-1次合并
- 空间：O(n)

### 4.4 代码实现

```python
import heapq

class HuffmanNode:
    def __init__(self, char=None, freq=0, left=None, right=None):
        self.char = char
        self.freq = freq
        self.left = left
        self.right = right

    def __lt__(self, other):
        return self.freq < other.freq

def huffman_build(freq_map):
    heap = [HuffmanNode(char=c, freq=f) for c, f in freq_map.items()]
    heapq.heapify(heap)
    while len(heap) > 1:
        left = heapq.heappop(heap)
        right = heapq.heappop(heap)
        merged = HuffmanNode(freq=left.freq + right.freq, left=left, right=right)
        heapq.heappush(heap, merged)
    return heap[0]

def huffman_codes(root, prefix="", codes=None):
    if codes is None:
        codes = {}
    if root.char is not None:
        codes[root.char] = prefix
    else:
        huffman_codes(root.left, prefix + "0", codes)
        huffman_codes(root.right, prefix + "1", codes)
    return codes

freq = {'a': 5, 'b': 9, 'c': 12, 'd': 13, 'e': 16, 'f': 45}
root = huffman_build(freq)
codes = huffman_codes(root)
print(codes)
```

```cpp
#include <queue>
#include <unordered_map>
#include <string>
using namespace std;

struct HuffmanNode {
    char ch;
    int freq;
    HuffmanNode *left, *right;
    HuffmanNode(char c, int f) : ch(c), freq(f), left(nullptr), right(nullptr) {}
    HuffmanNode(int f, HuffmanNode* l, HuffmanNode* r) : ch(0), freq(f), left(l), right(r) {}
};

struct Compare {
    bool operator()(HuffmanNode* a, HuffmanNode* b) {
        return a->freq > b->freq;
    }
};

HuffmanNode* huffmanBuild(unordered_map<char,int>& freqMap) {
    priority_queue<HuffmanNode*, vector<HuffmanNode*>, Compare> pq;
    for (auto& [c, f] : freqMap) pq.push(new HuffmanNode(c, f));
    while (pq.size() > 1) {
        auto left = pq.top(); pq.pop();
        auto right = pq.top(); pq.pop();
        auto merged = new HuffmanNode(left->freq + right->freq, left, right);
        pq.push(merged);
    }
    return pq.top();
}

void huffmanCodes(HuffmanNode* root, string prefix, unordered_map<char,string>& codes) {
    if (!root) return;
    if (root->ch) { codes[root->ch] = prefix; return; }
    huffmanCodes(root->left, prefix + "0", codes);
    huffmanCodes(root->right, prefix + "1", codes);
}
```

### 4.5 正确性证明（交换论证）

设贪心选择了频率最小的两个字符x和y合并。设OPT为某个最优编码树，其中x和y不是兄弟。在OPT中，x的深度为dx，y的深度为dy。

由于x和y是频率最小的，它们在OPT中的深度不会比其他叶子浅（否则可以交换得到更优解）。将x和y交换为兄弟节点，编码长度不会增加。因此存在一个最优解包含贪心选择。

---

## 5. 最小生成树 -- Kruskal

### 5.1 问题描述

给定连通无向图G=(V,E)，求一棵生成树T，使得T中所有边的权值之和最小。

### 5.2 思路分析

**Kruskal策略**：按边权从小到大排序，依次加入不形成环的边。

**关键数据结构**：并查集（Union-Find），用于高效判断两个顶点是否在同一连通分量。

```
图: 6个顶点, 边权如下
A-B:4, A-C:4, B-C:2, B-D:3, C-D:5, C-E:5, D-E:1, D-F:6, E-F:3

排序后的边: (D,E:1), (B,C:2), (B,D:3), (E,F:3), (A,B:4), (A,C:4), (C,D:5), (C,E:5), (D,F:6)

选择过程:
1. D-E(1): 加入
2. B-C(2): 加入
3. B-D(3): 加入 (B,C,D连通)
4. E-F(3): 加入
5. A-B(4): 加入 (A连通到BCD)
6. A-C(4): 跳过 (A,C已在同一分量)
7. C-D(5): 跳过
8. C-E(5): 加入 (连通两个分量)

MST边: D-E, B-C, B-D, E-F, A-B, C-E
MST总权: 1+2+3+3+4+5 = 18
```

### 5.3 复杂度分析

- 排序：O(E log E)
- 并查集操作：O(E \* alpha(V))，其中alpha为反阿克曼函数，近似O(1)
- 总时间：O(E log E)
- 空间：O(V + E)

### 5.4 代码实现

```python
class UnionFind:
    def __init__(self, n):
        self.parent = list(range(n))
        self.rank = [0] * n

    def find(self, x):
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])
        return self.parent[x]

    def union(self, x, y):
        px, py = self.find(x), self.find(y)
        if px == py:
            return False
        if self.rank[px] < self.rank[py]:
            px, py = py, px
        self.parent[py] = px
        if self.rank[px] == self.rank[py]:
            self.rank[px] += 1
        return
def kruskal(n, edges):
    edges.sort(key=lambda x: x[2])
    uf = UnionFind(n)
    mst = []
    total_weight = 0
    for u, v, w in edges:
        if uf.union(u, v):
            mst.append((u, v, w))
            total_weight += w
            if len(mst) == n - 1:
                break
    return mst, total_weight
```

```cpp
class UnionFind {
    vector<int> parent, rank_;
public:
    UnionFind(int n) : parent(n), rank_(n, 0) {
        for (int i = 0; i < n; i++) parent[i] = i;
    }
    int find(int x) {
        if (parent[x] != x) parent[x] = find(parent[x]);
        return parent[x];
    }
    bool unite(int x, int y) {
        int px = find(x), py = find(y);
        if (px == py) return false;
        if (rank_[px] < rank_[py]) swap(px, py);
        parent[py] = px;
        if (rank_[px] == rank_[py]) rank_[px]++;
        return true;
    }
};

pair<vector<tuple<int,int,int>>, int> kruskal(int n, vector<tuple<int,int,int>>& edges) {
    sort(edges.begin(), edges.end(),
         [](const auto& a, const auto& b) { return get<2>(a) < get<2>(b); });
    UnionFind uf(n);
    vector<tuple<int,int,int>> mst;
    int totalWeight = 0;
    for (auto& [u, v, w] : edges) {
        if (uf.unite(u, v)) {
            mst.push_back({u, v, w});
            totalWeight += w;
            if (mst.size() == n - 1) break;
        }
    }
    return {mst, totalWeight};
}
```

### 5.5 正确性证明（Cut Property）

**割性质（Cut Property）**：对于图G的任意一个割(S, V-S)，横跨割的最小权边一定属于某棵MST。

证明：设e是横跨割(S, V-S)的最小权边。若MST T不包含e，则T中必有另一条横跨割的边e'。由于e是最小权边，w(e) <= w(e')。将e'替换为e，T仍然是生成树且权值不增，因此存在包含e的MST。

Kruskal每次选择最小权边，若不形成环则该边横跨某个割且是最小权边，由割性质知其属于MST。

---

## 6. 最小生成树 -- Prim

### 6.1 思路分析

**Prim策略**：从一个顶点出发，每次选择连接已选集合与未选集合的最小权边。

```
从A出发:
1. A的邻边: A-B(4), A-C(4), 选A-B(4)
2. AB的邻边: A-C(4), B-C(2), B-D(3), 选B-C(2)
3. ABC的邻边: A-C(4), B-D(3), C-D(5), C-E(5), 选B-D(3)
4. ABCD的邻边: C-D(5), C-E(5), D-E(1), D-F(6), 选D-E(1)
5. ABCDE的邻边: C-E(5), D-F(6), E-F(3), 选E-F(3)
6. ABCDEF的邻边: C-E(5), D-F(6), 选C-E(5)

MST总权: 4+2+3+1+3+5 = 18
```

### 6.2 复杂度分析

| 实现        | 时间复杂度     | 适用场景 |
| ----------- | -------------- | -------- |
| 邻接矩阵    | O(V^2)         | 稠密图   |
| 二叉堆      | O(E log V)     | 稀疏图   |
| Fibonacci堆 | O(E + V log V) | 理论最优 |

### 6.3 代码实现

```python
import heapq

def prim(n, graph):
    visited = [False] * n
    mst = []
    total_weight = 0
    min_heap = [(0, 0, -1)]
    while min_heap and len(mst) < n - 1:
        w, u, parent = heapq.heappop(min_heap)
        if visited[u]:
            continue
        visited[u] =          if parent != -1:
            mst.append((parent, u, w))
            total_weight += w
        for v, weight in graph[u]:
            if not visited[v]:
                heapq.heappush(min_heap, (weight, v, u))
    return mst, total_weight

def prim_dense(n, adj_matrix):
    visited = [False] * n
    key = [float('inf')] * n
    parent = [-1] * n
    key[0] = 0
    for _ in range(n):
        u = -1
        for v in range(n):
            if not visited[v] and (u == -1 or key[v] < key[u]):
                u = v
        visited[u] =          for v in range(n):
            if not visited[v] and adj_matrix[u][v] < key[v]:
                key[v] = adj_matrix[u][v]
                parent[v] = u
    mst = []
    total = 0
    for v in range(1, n):
        mst.append((parent[v], v, key[v]))
        total += key[v]
    return mst, total
```

```cpp
pair<vector<tuple<int,int,int>>, int> prim(int n, vector<vector<pair<int,int>>>& graph) {
    vector<bool> visited(n, false);
    vector<tuple<int,int,int>> mst;
    int totalWeight = 0;
    priority_queue<pair<int,int>, vector<pair<int,int>>, greater<>> pq;
    pq.push({0, 0});
    vector<int> parent(n, -1);
    while (!pq.empty() && mst.size() < n - 1) {
        auto [w, u] = pq.top(); pq.pop();
        if (visited[u]) continue;
        visited[u] = true;
        if (parent[u] != -1) {
            mst.push_back({parent[u], u, w});
            totalWeight += w;
        }
        for (auto& [v, weight] : graph[u]) {
            if (!visited[v]) {
                parent[v] = u;
                pq.push({weight, v});
            }
        }
    }
    return {mst, totalWeight};
}
```

### 6.4 Kruskal vs Prim 对比

| 维度       | Kruskal              | Prim                 |
| ---------- | -------------------- | -------------------- |
| 策略       | 按边权排序，逐边加入 | 从顶点扩展，逐点加入 |
| 数据结构   | 并查集               | 优先队列             |
| 时间复杂度 | O(E log E)           | O(E log V)           |
| 适用场景   | 稀疏图               | 稠密图               |
| 实现难度   | 较简单               | 中等                 |
| 增量更新   | 不支持               | 支持                 |

> 跨模块引用：MST在图论中的更多应用参见 [图论算法](algorithm/graph)。

---

## 7. 贪心与动态规划的边界

### 7.1 同一问题的贪心可行与不可行

**分数背包 vs 0-1背包**：

| 问题     | 物品可否分割 | 贪心是否可行 | 原因                             |
| -------- | ------------ | ------------ | -------------------------------- |
| 分数背包 | 可以         | 可行         | 可用部分填充，贪心选择可逆       |
| 0-1背包  | 不可以       | 不可行       | 整体选择不可逆，贪心可能浪费空间 |

**区间调度 vs 加权区间调度**：

| 问题         | 目标       | 贪心是否可行 | 原因                      |
| ------------ | ---------- | ------------ | ------------------------- |
| 区间调度     | 最多活动数 | 可行         | 按结束时间贪心即可        |
| 加权区间调度 | 最大权重和 | 不可行       | 需要权衡选/不选的长期影响 |

### 7.2 判断贪心适用性的经验法则

1. **可交换性**：如果可以将最优解中的元素与贪心选择的元素交换而不影响最优性，贪心通常可行。

2. **单调性**：如果问题具有单调性（多选不会更差），贪心通常可行。

3. **独立子结构**：如果做出选择后，剩余子问题的最优解独立于之前的选择，贪心通常可行。

4. **反例测试**：尝试构造反例。如果容易找到反例，贪心很可能不可行。

### 7.3 更多贪心经典问题

**Dijkstra最短路径**：每次选择距离最小的未访问节点。贪心可行因为非负权保证了"先到者必最短"。

**区间覆盖问题**：选择最少数量的区间覆盖目标区间。按左端点排序，贪心选择能延伸最远的区间。

**跳跃游戏**（LeetCode 55/45）：每步选择能跳最远的位置。

```python
def jump_game_min(nums):
    jumps = 0
    current_end = 0
    farthest = 0
    for i in range(len(nums) - 1):
        farthest = max(farthest, i + nums[i])
        if i == current_end:
            jumps += 1
            current_end = farthest
    return jumps
```

**分配饼干**（LeetCode 455）：将最小饼干分配给胃口最小的孩子。

```python
def find_content_children(g, s):
    g.sort()
    s.sort()
    i = j = 0
    while i < len(g) and j < len(s):
        if s[j] >= g[i]:
            i += 1
        j += 1
    return i
```

---

## 8. 贪心算法速查表

| 问题        | 贪心策略         | 时间复杂度 | 正确性证明方法 |
| ----------- | ---------------- | ---------- | -------------- |
| 活动选择    | 按结束时间排序   | O(nlogn)   | 交换论证       |
| 哈夫曼编码  | 合并频率最小两个 | O(nlogn)   | 交换论证       |
| Kruskal MST | 按边权排序       | O(ElogE)   | 割性质         |
| Prim MST    | 选最近未访问节点 | O(ElogV)   | 割性质         |
| Dijkstra    | 选最近未访问节点 | O(ElogV)   | 贪心选择性质   |
| 分数背包    | 按单位价值排序   | O(nlogn)   | 交换论证       |
| 区间覆盖    | 按左端点排序     | O(nlogn)   | 交换论证       |
| 跳跃游戏    | 每步跳最远       | O(n)       | 贪心选择性质   |
| 零钱找零\*  | 选最大面额       | O(n)       | 不一定正确     |

\*零钱找零贪心对特殊面额（如1,5,10,25）有效，但对一般面额不一定正确。

---

## 9. 延伸阅读

- CLRS 第 16 章（贪心算法）
- 《算法设计》(Kleinberg & Tardos) 第 4 章
- [MST -- VisuAlgo](https://visualgo.net/en/mst)
- 《算法导论》第23章（最小生成树）
- Korte & Vygen, _Combinatorial Optimization_, Chapter 1-3

> 跨模块引用：Dijkstra算法的完整实现参见 [图论算法](algorithm/graph)。DP与贪心的对比参见 [动态规划](algorithm/dynamic-programming)。
