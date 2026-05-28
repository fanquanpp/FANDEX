---
order: 70
tags:
  - 'algorithm'
  - 'memory'
  - 'data-structure'
  - 'math'
difficulty: 'intermediate'
title: '图算法'
module: 'algorithm'
category: 'Algorithm/Graph'
description: '图的表示方法、遍历算法、最短路径算法与拓扑排序，附复杂度分析与多语言实现。'
author: 'fanquanpp'
---

- [3. 图的遍历](#3-图的遍历)
- [4. 最短路径 -- Dijkstra](#4-最短路径----dijkstra)
- [5. 最短路径 -- Bellman-Ford 与 SPFA](#5-最短路径----bellman-ford-与-spfa)
- [6. 最短路径 -- Floyd-Warshall](#6-最短路径----floyd-warshall)
- [7. 拓扑排序](#7-拓扑排序)
- [8. 连通性与环检测](#8-连通性与环检测)
- [9. 图算法速查表](#9-图算法速查表)
- [10. 延伸阅读](#10-延伸阅读)

---

## 1. 图的基本概念

### 1.1 图的定义与分类

图G = (V, E)由顶点集V和边集E组成。根据边的性质，图可分为：

| 类型   | 定义         | 示例     |
| ------ | ------------ | -------- |
| 无向图 | 边没有方向   | 社交网络 |
| 有向图 | 边有方向     | 网页链接 |
| 加权图 | 边有权值     | 路网距离 |
| 无权图 | 边没有权值   | 关系图   |
| 简单图 | 无自环和重边 | 通常默认 |
| 多重图 | 允许重边     | 交通网络 |

### 1.2 基本术语

| 术语       | 定义                                    |
| ---------- | --------------------------------------- |
| 度(degree) | 与顶点关联的边数；有向图分为入度和出度  |
| 路径       | 顶点序列v0,v1,...,vk，其中(vi,vi+1)是边 |
| 简单路径   | 不经过重复顶点的路径                    |
| 环(cycle)  | 起点与终点相同的简单路径                |
| 连通       | 无向图中任意两点之间存在路径            |
| 强连通     | 有向图中任意两点互相可达                |
| 连通分量   | 极大连通子图                            |
| 稀疏图     | E = O(V)                                |
| 稠密图     | E = Theta(V^2)                          |

> 跨模块引用：图的遍历算法（BFS/DFS）的搜索框架参见 [搜索算法](algorithm/searching)。

---

## 2. 图的表示方法

### 2.1 邻接矩阵

用二维数组adj[i][j]表示顶点i到j的边。无向图的邻接矩阵对称。

```
无向图:        邻接矩阵:
  0--1          0 1 2 3
  |  |       0 [0,1,1,0]
  2--3       1 [1,0,1,1]
             2 [1,1,0,1]
             3 [0,1,1,0]
```

**优缺点**：

- 优点：O(1)判断两点是否相邻；适合稠密图
- 缺点：O(V^2)空间；遍历邻接点O(V)

### 2.2 邻接表

每个顶点维护一个链表/数组，存储其所有邻接点。

```
有向图:        邻接表:
  0-->1-->3    0: [1, 3]
  |   ^        1: [2]
  v   |        2: []
  2---+        3: [2]
```

**优缺点**：

- 优点：O(V+E)空间；遍历邻接点O(degree)
- 缺点：O(V)判断两点是否相邻

### 2.3 代码实现

```python
class GraphMatrix:
    def __init__(self, n, directed=False):
        self.n = n
        self.directed = directed
        self.adj = [[0] * n for _ in range(n)]

    def add_edge(self, u, v, w=1):
        self.adj[u][v] = w
        if not self.directed:
            self.adj[v][u] = w

class GraphList:
    def __init__(self, n, directed=False):
        self.n = n
        self.directed = directed
        self.adj = [[] for _ in range(n)]

    def add_edge(self, u, v, w=1):
        self.adj[u].append((v, w))
        if not self.directed:
            self.adj[v].append((u, w))
```

```cpp
class GraphMatrix {
    int n;
    bool directed;
    vector<vector<int>> adj;
public:
    GraphMatrix(int n, bool dir = false) : n(n), directed(dir), adj(n, vector<int>(n, 0)) {}
    void addEdge(int u, int v, int w = 1) {
        adj[u][v] = w;
        if (!directed) adj[v][u] = w;
    }
};

class GraphList {
    int n;
    bool directed;
    vector<vector<pair<int,int>>> adj;
public:
    GraphList(int n, bool dir = false) : n(n), directed(dir), adj(n) {}
    void addEdge(int u, int v, int w = 1) {
        adj[u].push_back({v, w});
        if (!directed) adj[v].push_back({u, w});
    }
};
```

### 2.4 表示方法选择

| 场景             | 邻接矩阵   | 邻接表    |
| ---------------- | ---------- | --------- |
| 稠密图(E~V^2)    | 推荐       | 浪费      |
| 稀疏图(E~V)      | 浪费空间   | 推荐      |
| 频繁查询边       | O(1)       | O(degree) |
| 遍历邻接点       | O(V)       | O(degree) |
| Floyd-Warshall   | 必须用矩阵 | 需转换    |
| Dijkstra/BFS/DFS | 可用       | 推荐      |

---

## 3. 图的遍历

### 3.1 BFS与DFS在图上的应用

图的遍历是许多图算法的基础。BFS和DFS在图上的实现与树上的主要区别在于需要处理**已访问标记**以避免重复访问。

> 详细的BFS/DFS实现参见 [搜索算法](algorithm/searching)，此处重点讨论图特有的遍历性质。

### 3.2 颜色标记法与边的分类

DFS遍历中，每个顶点经历三种状态：

| 颜色 | 状态         | 含义       |
| ---- | ------------ | ---------- |
| 白色 | 未发现       | 尚未访问   |
| 灰色 | 已发现未完成 | 正在递归中 |
| 黑色 | 已完成       | 递归已返回 |

**边的分类**：

| 边类型 | 定义                  | 意义                 |
| ------ | --------------------- | -------------------- |
| 树边   | DFS遍历中首次发现的边 | 构成DFS树            |
| 回边   | 指向灰色祖先的边      | 表示存在环           |
| 前向边 | 指向黑色后代的边      | 非树边，跳过中间节点 |
| 横叉边 | 指向黑色非祖先的边    | 连接不同DFS子树      |

**环检测**：DFS过程中遇到回边即存在环。无向图中只需检测是否访问到非父节点的已访问节点。

### 3.3 时间戳与DFS树性质

DFS为每个顶点记录发现时间d[v]和完成时间f[v]：

- 括号化性质：区间[d[u], f[u]]和[d[v], f[v]]要么包含要么不相交
- 白色路径定理：v是u的后代当且仅当在发现u时，存在从u到v的白色路径

---

## 4. 最短路径 -- Dijkstra

### 4.1 问题描述

给定加权有向图G=(V,E)和源点s，求s到所有其他顶点的最短路径。要求所有边权非负。

### 4.2 思路分析

Dijkstra算法是贪心策略的典型应用。核心操作是**松弛（relaxation）**：

```
if dist[u] + w(u,v) < dist[v]:
    dist[v] = dist[u] + w(u,v)
    prev[v] = u
```

算法流程：

1. 初始化dist[s]=0，其余dist=inf
2. 每次选择dist最小的未访问顶点u
3. 对u的所有邻接边执行松弛
4. 标记u为已访问
5. 重复直到所有顶点已访问

**松弛过程可视化**：

```
初始: dist = [0, inf, inf, inf, inf]

选0: 松弛0->1(10), 0->4(5)
dist = [0, 10, inf, inf, 5]

选4: 松弛4->1(3), 4->2(9), 4->3(2)
dist = [0, 8, 14, 7, 5]

选3: 松弛3->2(6)
dist = [0, 8, 13, 7, 5]

选1: 松弛1->2(1)
dist = [0, 8, 9, 7, 5]

选2: 无松弛
dist = [0, 8, 9, 7, 5]
```

### 4.3 复杂度分析

| 实现             | 时间复杂度     | 空间复杂度 |
| ---------------- | -------------- | ---------- |
| 朴素（邻接矩阵） | O(V^2)         | O(V)       |
| 二叉堆（邻接表） | O((V+E) log V) | O(V+E)     |
| Fibonacci堆      | O(V log V + E) | O(V+E)     |

### 4.4 代码实现

```python
import heapq

def dijkstra(n, graph, start):
    dist = [float('inf')] * n
    dist[start] = 0
    prev = [-1] * n
    visited = [False] * n
    pq = [(0, start)]
    while pq:
        d, u = heapq.heappop(pq)
        if visited[u]:
            continue
        visited[u] =          for v, w in graph[u]:
            if dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
                prev[v] = u
                heapq.heappush(pq, (dist[v], v))
    return dist, prev

def dijkstra_path(prev, start, end):
    path = []
    v = end
    while v != -1:
        path.append(v)
        v = prev[v]
    return path[::-1]
```

```cpp
vector<int> dijkstra(int n, vector<vector<pair<int,int>>>& graph, int start) {
    vector<int> dist(n, INT_MAX);
    vector<int> prev(n, -1);
    vector<bool> visited(n, false);
    priority_queue<pair<int,int>, vector<pair<int,int>>, greater<>> pq;
    dist[start] = 0;
    pq.push({0, start});
    while (!pq.empty()) {
        auto [d, u] = pq.top(); pq.pop();
        if (visited[u]) continue;
        visited[u] = true;
        for (auto& [v, w] : graph[u]) {
            if (dist[u] + w < dist[v]) {
                dist[v] = dist[u] + w;
                prev[v] = u;
                pq.push({dist[v], v});
            }
        }
    }
    return dist;
}
```

### 4.5 为何负权边导致失效

Dijkstra的贪心正确性依赖于：一旦顶点u被标记为已访问，dist[u]就是最短距离。负权边破坏这一性质——后续可能通过负权边找到更短路径。

> 跨模块引用：Dijkstra作为贪心算法的分析参见 [贪心算法](algorithm/greedy)。

---

## 5. 最短路径 -- Bellman-Ford 与 SPFA

### 5.1 Bellman-Ford

**思路**：对所有边执行V-1轮松弛。第i轮松弛保证找到最多经过i条边的最短路径。

**负环检测**：V-1轮松弛后，如果还能松弛，说明存在负环。

```python
def bellman_ford(n, edges, start):
    dist = [float('inf')] * n
    dist[start] = 0
    for i in range(n - 1):
        updated = False
        for u, v, w in edges:
            if dist[u] != float('inf') and dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
                updated =          if not updated:
            break
    has_negative_cycle = False
    for u, v, w in edges:
        if dist[u] != float('inf') and dist[u] + w < dist[v]:
            has_negative_cycle =              break
    return dist, has_negative_cycle
```

```cpp
pair<vector<int>, bool> bellmanFord(int n, vector<tuple<int,int,int>>& edges, int start) {
    vector<int> dist(n, INT_MAX);
    dist[start] = 0;
    for (int i = 0; i < n - 1; i++) {
        bool updated = false;
        for (auto& [u, v, w] : edges) {
            if (dist[u] != INT_MAX && dist[u] + w < dist[v]) {
                dist[v] = dist[u] + w;
                updated = true;
            }
        }
        if (!updated) break;
    }
    bool hasNegCycle = false;
    for (auto& [u, v, w] : edges) {
        if (dist[u] != INT_MAX && dist[u] + w < dist[v]) {
            hasNegCycle = true;
            break;
        }
    }
    return {dist, hasNegCycle};
}
```

**复杂度**：时间O(VE)，空间O(V)。

### 5.2 SPFA（队列优化Bellman-Ford）

SPFA只对发生松弛的顶点的邻接边进行松弛，平均性能优于Bellman-Ford，但最坏仍为O(VE)。

```python
from collections import deque

def spfa(n, graph, start):
    dist = [float('inf')] * n
    dist[start] = 0
    in_queue = [False] * n
    cnt = [0] * n
    q = deque([start])
    in_queue[start] =      has_negative_cycle = False
    while q:
        u = q.popleft()
        in_queue[u] = False
        for v, w in graph[u]:
            if dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
                cnt[v] = cnt[u] + 1
                if cnt[v] >= n:
                    has_negative_cycle =                      break
                if not in_queue[v]:
                    q.append(v)
                    in_queue[v] =          if has_negative_cycle:
            break
    return dist, has_negative_cycle
```

```cpp
pair<vector<int>, bool> spfa(int n, vector<vector<pair<int,int>>>& graph, int start) {
    vector<int> dist(n, INT_MAX);
    vector<bool> inQueue(n, false);
    vector<int> cnt(n, 0);
    queue<int> q;
    dist[start] = 0;
    q.push(start);
    inQueue[start] = true;
    bool hasNegCycle = false;
    while (!q.empty() && !hasNegCycle) {
        int u = q.front(); q.pop();
        inQueue[u] = false;
        for (auto& [v, w] : graph[u]) {
            if (dist[u] + w < dist[v]) {
                dist[v] = dist[u] + w;
                cnt[v] = cnt[u] + 1;
                if (cnt[v] >= n) { hasNegCycle = true; break; }
                if (!inQueue[v]) { q.push(v); inQueue[v] = true; }
            }
        }
    }
    return {dist, hasNegCycle};
}
```

### 5.3 最短路径算法对比

| 算法           | 时间复杂度 | 负权边 | 负环检测 | 适用场景         |
| -------------- | ---------- | ------ | -------- | ---------------- |
| Dijkstra       | O(ElogV)   | 不支持 | 不支持   | 非负权图         |
| Bellman-Ford   | O(VE)      | 支持   | 支持     | 含负权           |
| SPFA           | 平均O(E)   | 支持   | 支持     | 含负权(随机数据) |
| Floyd-Warshall | O(V^3)     | 支持   | 支持     | 全源最短路       |

---

## 6. 最短路径 -- Floyd-Warshall

### 6.1 问题描述

求图中所有顶点对之间的最短路径。

### 6.2 思路分析

**DP状态定义**：dist[k][i][j] = 从i到j，只经过顶点{0,1,...,k}的最短路径长度。

**转移方程**：

- 不经过k：dist[k][i][j] = dist[k-1][i][j]
- 经过k：dist[k][i][j] = dist[k-1][i][k] + dist[k-1][k][j]
- 取较小值

**空间优化**：由于dist[k]只依赖dist[k-1]，可以用二维数组滚动。

```python
def floyd_warshall(n, graph):
    dist = [[float('inf')] * n for _ in range(n)]
    for i in range(n):
        dist[i][i] = 0
    for u in range(n):
        for v, w in graph[u]:
            dist[u][v] = min(dist[u][v], w)
    for k in range(n):
        for i in range(n):
            for j in range(n):
                if dist[i][k] + dist[k][j] < dist[i][j]:
                    dist[i][j] = dist[i][k] + dist[k][j]
    return dist
```

```cpp
vector<vector<int>> floydWarshall(int n, vector<vector<pair<int,int>>>& graph) {
    vector<vector<int>> dist(n, vector<int>(n, INT_MAX / 2));
    for (int i = 0; i < n; i++) dist[i][i] = 0;
    for (int u = 0; u < n; u++) {
        for (auto& [v, w] : graph[u]) {
            dist[u][v] = min(dist[u][v], w);
        }
    }
    for (int k = 0; k < n; k++) {
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) {
                if (dist[i][k] + dist[k][j] < dist[i][j]) {
                    dist[i][j] = dist[i][k] + dist[k][j];
                }
            }
        }
    }
    return dist;
}
```

### 6.3 应用

**传递闭包**：将dist初始化为邻接矩阵的布尔值，min改为OR，加法改为AND，即可判断任意两点是否可达。

**最小环**：在Floyd-Warshall的第k轮迭代前，dist[i][j]是不经过k的最短路。若i和j之间有直接边，则经过k的环长度为dist[i][j] + graph[j][k] + graph[k][i]。

---

## 7. 拓扑排序

### 7.1 问题描述

对有向无环图(DAG)的顶点进行线性排序，使得每条边(u,v)中u排在v之前。

### 7.2 Kahn算法（BFS入度法）

```python
from collections import deque

def topological_sort_kahn(n, graph):
    in_degree = [0] * n
    for u in range(n):
        for v, _ in graph[u]:
            in_degree[v] += 1
    q = deque([i for i in range(n) if in_degree[i] == 0])
    order = []
    while q:
        u = q.popleft()
        order.append(u)
        for v, _ in graph[u]:
            in_degree[v] -= 1
            if in_degree[v] == 0:
                q.append(v)
    if len(order) != n:
        return None
    return order
```

```cpp
vector<int> topologicalSortKahn(int n, vector<vector<pair<int,int>>>& graph) {
    vector<int> inDegree(n, 0);
    for (int u = 0; u < n; u++) {
        for (auto& [v, w] : graph[u]) inDegree[v]++;
    }
    queue<int> q;
    for (int i = 0; i < n; i++) {
        if (inDegree[i] == 0) q.push(i);
    }
    vector<int> order;
    while (!q.empty()) {
        int u = q.front(); q.pop();
        order.push_back(u);
        for (auto& [v, w] : graph[u]) {
            if (--inDegree[v] == 0) q.push(v);
        }
    }
    if (order.size() != n) return {};
    return order;
}
```

### 7.3 DFS后序逆序法

```python
def topological_sort_dfs(n, graph):
    visited = [False] * n
    order = []
    has_cycle = False

    def dfs(u):
        nonlocal has_cycle
        visited[u] =          for v, _ in graph[u]:
            if not visited[v]:
                dfs(v)
            # 环检测需要颜色标记，此处省略
        order.append(u)

    for i in range(n):
        if not visited[i]:
            dfs(i)
    return order[::-1]
```

### 7.4 AOV网与AOE网

**AOV网（Activity On Vertex）**：顶点表示活动，边表示先后关系。拓扑排序确定执行顺序。

**AOE网（Activity On Edge）**：边表示活动，顶点表示事件。关键路径分析：

- 最早发生时间Ve：从源点到各顶点的最长路径
- 最迟发生时间Vl：不延误工期的最晚时间
- 关键活动：Ve == Vl 的活动

---

## 8. 连通性与环检测

### 8.1 并查集环检测

对无向图，逐边加入并查集。若边的两个端点已在同一集合，则存在环。

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
def has_cycle_undirected(n, edges):
    uf = UnionFind(n)
    for u, v in edges:
        if not uf.union(u, v):
            return      return False
```

### 8.2 强连通分量 -- Tarjan

Tarjan算法基于DFS，利用dfn（发现时间）和low（能回溯到的最早祖先）识别强连通分量。

```python
def tarjan_scc(n, graph):
    dfn = [0] * n
    low = [0] * n
    on_stack = [False] * n
    stack = []
    sccs = []
    timer = [0]

    def dfs(u):
        timer[0] += 1
        dfn[u] = low[u] = timer[0]
        stack.append(u)
        on_stack[u] =          for v in graph[u]:
            if dfn[v] == 0:
                dfs(v)
                low[u] = min(low[u], low[v])
            elif on_stack[v]:
                low[u] = min(low[u], dfn[v])
        if dfn[u] == low[u]:
            scc = []
            while True:
                v = stack.pop()
                on_stack[v] = False
                scc.append(v)
                if v == u:
                    break
            sccs.append(scc)

    for i in range(n):
        if dfn[i] == 0:
            dfs(i)
    return sccs
```

**复杂度**：O(V + E)。

### 8.3 割点与桥

**割点（Articulation Point）**：删除该点后图不再连通。

**桥（Bridge）**：删除该边后图不再连通。

判定条件（基于Tarjan）：

- 割点：u是根且有>=2个子树，或u非根且存在子节点v使得low[v] >= dfn[u]
- 桥：边(u,v)是树边且low[v] > dfn[u]

---

## 9. 图算法速查表

| 算法           | 时间     | 空间   | 适用场景         |
| -------------- | -------- | ------ | ---------------- |
| BFS            | O(V+E)   | O(V)   | 无权最短路       |
| DFS            | O(V+E)   | O(V)   | 环检测/拓扑排序  |
| Dijkstra       | O(ElogV) | O(V)   | 非负权单源最短路 |
| Bellman-Ford   | O(VE)    | O(V)   | 含负权单源最短路 |
| SPFA           | 平均O(E) | O(V)   | 含负权(随机数据) |
| Floyd-Warshall | O(V^3)   | O(V^2) | 全源最短路       |
| Kruskal MST    | O(ElogE) | O(E)   | 稀疏图MST        |
| Prim MST       | O(ElogV) | O(V)   | 稠密图MST        |
| 拓扑排序       | O(V+E)   | O(V)   | DAG排序          |
| Tarjan SCC     | O(V+E)   | O(V)   | 强连通分量       |

---

## 10. 延伸阅读

- CLRS 第 22-25 章
- 《图论算法》(王桂平)
- [Graph -- VisuAlgo](https://visualgo.net/en/graphds)
- 《算法竞赛进阶指南》(李煜东) 图论专题
- Tarjan, "Depth-first search and linear graph algorithms", 1972

> 跨模块引用：MST的贪心分析参见 [贪心算法](algorithm/greedy)。BFS/DFS基础参见 [搜索算法](algorithm/searching)。DP在Floyd-Warshall中的应用参见 [动态规划](algorithm/dynamic-programming)。
