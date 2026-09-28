---
order: 120
title: '图算法：表示与遍历'
module: 'algorithm'
category: 计算机科学
difficulty: intermediate
description: 图的形式化定义与四种表示方法（邻接矩阵、邻接表、边集数组、隐式图）对照，BFS 与 DFS 的完整实现、Loop Invariant 正确性证明与预期输出，连通分量、环检测、二分图判定、拓扑排序概念、强连通分量与双连通性，附遍历应用场景速查表、工程实践与五个工业级案例研究；最短路径与最小生成树的三算法双算法横向对照见姊妹篇 115。
author: fanquanpp
updated: '2026-09-29'
related:
  - 'algorithm/115-ShortestPathAndMST'
  - 'algorithm/250-FloydWarshall'
  - 'algorithm/260-KruskalAlgorithm'
  - 'algorithm/270-TopologicalSorting'
  - 'algorithm/070-HashTable'
  - 'algorithm/080-Tree'
  - 'algorithm/120-DivideAndConquer'
  - 'algorithm/130-GreedyAlgorithm'
  - 'algorithm/160-DynamicProgramming'
  - 'algorithm/290-NetworkFlow'
  - 'algorithm/150-StringAlgorithms'
  - 'algorithm/050-SearchAlgorithm'
  - 'cs-fundamentals/540-DiscreteMathematics'
prerequisites:
  - 'algorithm/010-AlgorithmAnalysisBasics'
  - 'algorithm/050-SearchAlgorithm'
  - 'cs-fundamentals/540-DiscreteMathematics'
---

> 使用方式：本篇是图论主题的参考深水篇（表示与遍历册），适合带着具体问题来查；图论入门请先完成主线篇目（搜索算法 050）。

把地铁线路图、公司汇报关系、代码 import 依赖、社交好友链放在一起看，它们是同一种东西——图：一堆顶点，加上顶点之间的关系。现实世界的关系型数据几乎都是图，而一切图算法的地基只有两件事：怎么存图（邻接矩阵还是邻接表，取决于稠密还是稀疏），以及怎么不重不漏地走完它（BFS 按层扩散、DFS 一条路走到底）。本篇是图算法两册的第一册，读完后你能为一张图选对存储结构、手写 BFS/DFS，并用它们解决连通分量、环检测、二分图判定这类高频问题；最短路与最小生成树在姊妹篇展开。

## 前置知识

建议先阅读以下内容再进入本文：

- [算法分析基础与学习路线](/algorithm/010-AlgorithmAnalysisBasics)
- [搜索算法](/algorithm/050-SearchAlgorithm)
- [离散数学](/cs-fundamentals/540-DiscreteMathematics)

## 第 1 章 学习目标与导论

### 1.1 本篇在算法知识体系中的位置

图（graph，源自希腊语 "graphos"，意为"书写、绘制"，由 James Joseph Sylvester 于 1878 年首次引入英语数学词汇，意为"由顶点与边绘制的关系结构"）是计算机科学中最重要、最具表达力的数据结构之一。它位于算法知识体系的"关系层"，向上承接搜索算法与动态规划，向下衔接网络流、字符串自动机与离散数学中的图论。

本篇是图算法两册中的第一册（表示与遍历篇），覆盖：图的形式化定义、四种表示方法（邻接矩阵、邻接表、边集数组、隐式图）对照、BFS 与 DFS 的完整实现与正确性证明，以及以遍历为核心的应用——连通分量、环检测、二分图判定、拓扑排序（概念级）、强连通分量与双连通性。最短路径（Dijkstra、Bellman-Ford、Floyd-Warshall、A*）与最小生成树（Kruskal、Prim、Boruvka）收录于姊妹篇[最短路与最小生成树](/algorithm/115-ShortestPathAndMST)。分工原则：本篇与姊妹篇横向对照互补；[Floyd-Warshall](/algorithm/250-FloydWarshall)、[Kruskal](/algorithm/260-KruskalAlgorithm)、[拓扑排序](/algorithm/270-TopologicalSorting)另有单算法深水篇负责纵向深挖，本篇与之互为表里、不重复展开。

学习本章前，读者应当已经掌握：

- `algorithm/算法分析基础与学习路线`：渐近记号、最坏/平均复杂度分析
- `algorithm/搜索算法`：BFS/DFS 在树与状态空间上的基本框架
- `math/离散数学`：集合、关系、二元关系、等价关系与偏序关系

掌握本章后，读者将为后续学习姊妹篇的最短路与 MST、`algorithm/网络流`、`algorithm/字符串算法`（后缀自动机、AC 自动机的图结构）、`algorithm/动态规划`（DAG 上的 DP）等高级主题奠定坚实基础。

### 1.2 学习目标

本章遵循 Bloom 分类法，按认知层级递进组织学习目标：

1. **记忆（Remember）**：复述图的形式化定义 $G = (V, E, \varphi)$ 与有向图、无向图、加权图、二分图的形式化区别。
2. **理解（Understand）**：解释邻接矩阵、邻接表、边集数组与隐式图的空间与时间权衡，说明稠密图与稀疏图场景下的选型依据。
3. **应用（Apply）**：使用 BFS 与 DFS 实现连通分量、环检测、二分图判定与拓扑排序。
4. **分析（Analyze）**：基于 Loop Invariant 分析 BFS 正确性，基于边分类与括号化定理分析 DFS 行为与 SCC 识别机制。
5. **评估（Evaluate）**：评估 Tarjan 与 Kosaraju 的工程取舍；为给定规模与查询模式选择表示方法与遍历策略。
6. **创造（Create）**：设计基于图模型的工程方案，如社交网络分析、依赖解析与推荐系统。

### 1.3 阅读建议

- **零基础读者**：先通读第 3、4、5 章，建立形式化定义与遍历直觉后回看第 2 章历史动机；
- **有数据结构基础读者**：重点关注第 5、7 章的正确性证明与复杂度分析；
- **需要最短路径或最小生成树的读者**：直接阅读姊妹篇[最短路与最小生成树](/algorithm/115-ShortestPathAndMST)；
- **进阶读者**：研读第 8 章进阶遍历算法与第 12 章案例研究。

## 第 2 章 历史动机与演进

### 2.1 1736：Euler 与哥尼斯堡七桥问题

图论的诞生可追溯至 1736 年，瑞士数学家 Leonhard Euler（1707-1783）发表《Solutio problematis ad geometriam situs pertinentis》求解著名的"哥尼斯堡七桥问题"。普雷格尔河将哥尼斯堡（今俄罗斯加里宁格勒）分为两岸与两岛，其间由七座桥连接。市民们试图寻找一条路径，每座桥恰好走一次后回到起点。

Euler 的关键洞察是：**桥的具体长度与地理位置无关，仅"哪两块陆地由几座桥连接"这一拓扑关系决定问题可解性**。他将每块陆地抽象为顶点（vertex，源自拉丁语 "vertere"，意为"转动"，原指角的顶点，欧几里得几何中用于描述多边形的角点），每座桥抽象为边（edge，源自古英语 "ecg"，意为"刀刃、边界"），得到一个 4 顶点 7 边的多重图。

Euler 证明了：存在"每条边恰好经过一次的回路"（后称欧拉回路）当且仅当图中每个顶点的度数均为偶数。哥尼斯堡图所有顶点度数均为奇数，故无解。这一论证标志着图论与拓扑学的诞生，Euler 也因此被称为"图论之父"。

### 2.2 1857-1847：Cayley 与 Kirchhoff 的树与矩阵谱

1857 年英国数学家 Arthur Cayley（1821-1895）在研究有机化学同分异构体计数时，系统化了"树"（tree）的概念，给出 Cayley 公式：$n$ 个标记顶点的不同树共有 $n^{n-2}$ 棵。这一结果奠定了组合图论的基础。

1847 年德国物理学家 Gustav Kirchhoff（1824-1887）在研究电路网络时提出了**基尔霍夫矩阵树定理**：图 $G$ 的生成树数量等于其 Laplacian 矩阵 $\mathbf{L}$ 任意余子式的值。这是图论与线性代数深度结合的里程碑，预示了后来谱图理论（spectral graph theory）的发展。

### 2.3 1936-1930s：Konig 与图论公理化

匈牙利数学家 Denes Konig（1884-1944）于 1936 年出版《Theorie der endlichen und unendlichen Graphen》，这是第一部图论专著，标志着图论成为独立数学分支。Konig 系统化了图论的基本概念、定理与证明方法，并梳理了 Euler 至 1930s 的图论成果，包括 Kuratowski 平面图判定定理、Menger 定理、Hall 婚姻定理等。

同期 Paul Erdos（1913-1996）开创了**极值图论**与**随机图论**。他与 Alfred Renyi 于 1959 年提出 ER 随机图模型 $G(n, p)$，研究"几乎必然"性质与相变现象（如连通性阈值 $p = \ln n / n$）。这一工作深刻影响了 20 世纪后期的网络科学与复杂系统研究。

### 2.4 1956-1959：Kruskal、Prim 与 Dijkstra 的最优化算法

第二次世界大战后，运筹学兴起推动了图优化算法的发展。

- **1956 年**，Joseph Bernard Kruskal（1928-2010）在 Bell 实验室发表论文《On the shortest spanning subtree of a graph and the traveling salesman problem》，提出 Kruskal 最小生成树算法：按边权排序后逐步加入不形成环的边。其同事 Robert Clay Prim（1921-2021）于 1957 年提出改进算法（Prim 算法），从一个顶点出发逐步扩展。两者均基于 Cut 性质。

- **1959 年**，荷兰数学家 Edsger Wybe Dijkstra（1930-2002）在 Numerische Mathematik 发表《A note on two problems in connexion with graphs》，提出最短路径算法。据 Dijkstra 本人在 2001 年的一次访谈中回忆，他在阿姆斯特丹的一家咖啡馆里花 20 分钟构思了该算法，目的是展示 ARMAC 计算机的能力。这一算法因其简洁高效而成为计算机科学中最广为引用的算法之一。

- **1958 年**，Richard Bellman（1920-1984）发表 Bellman-Ford 算法（亦称 Bellman-Ford-Moore 算法），动态规划思想在图论中的典型应用，支持负权边与负环检测。

### 2.5 1962-1972：Floyd-Warshall 与 Tarjan 的线性算法

1962 年 Robert Floyd（1936-2001）与 Stephen Warshall（1935-2007）分别独立提出全源最短路径算法（Floyd-Warshall），基于动态规划的中转点枚举。同年发表《Algorithm 97: Shortest path》。

1972 年 Robert Endre Tarjan（1948-）发表《Depth-first search and linear graph algorithms》，系统证明了 DFS 的线性时间复杂度，并基于此给出了强连通分量（SCC）、双连通分量、割点与桥的线性识别算法。Tarjan 的工作使"图论算法的复杂度从 $O(V^2)$ 进入 $O(V + E)$ 时代"，他因此获 1986 年图灵奖。同期 Sambasiva Rao Kosaraju（1947-）于 1978 年提出 Kosaraju SCC 算法，两次 DFS 完成识别。

### 2.6 1998：PageRank 与图论的现代复兴

1998 年斯坦福大学博士生 Larry Page 与 Sergey Brin 提出 PageRank 算法（Page et al. 1999），将网页超链接结构建模为有向图，通过随机游走的平稳分布度量网页"重要性"。PageRank 成为 Google 搜索引擎的奠基技术，标志着图算法在大规模工业场景中的成功应用。

此后图算法在社交网络（朋友推荐、社区发现）、生物信息学（蛋白质相互作用网络）、推荐系统（知识图谱）、区块链（DAG 共识）等领域持续扩展。2000s 后图神经网络（GNN）的兴起进一步深化了图算法与机器学习的融合。

> 拆分说明：本篇原为图算法单册合集，现已按参考层标准拆为两篇：本篇覆盖表示与遍历；Dijkstra、Bellman-Ford、Floyd-Warshall、A*、Kruskal、Prim 的完整实现、证明与选型收录于[最短路与最小生成树](/algorithm/115-ShortestPathAndMST)；Floyd-Warshall、Kruskal、拓扑排序另有单算法深水篇（[250](/algorithm/250-FloydWarshall)、[260](/algorithm/260-KruskalAlgorithm)、[270](/algorithm/270-TopologicalSorting)）。

## 第 3 章 形式化定义与图论基础

### 3.1 图的形式化定义

为了消除自然语言的歧义，本节以数学形式化方式定义图的语义。该形式化对应 Bondy & Murty (2008) 与 CLRS 4th 第 20 章的约定。

**定义 3.1（图）**：图（graph）是一个有序三元组 $G = (V, E, \varphi)$，其中：

- $V$ 是有限非空集合，称为**顶点集**（vertex set），元素称为顶点（vertex）；
- $E$ 是有限集合，称为**边集**（edge set），元素称为边（edge）；
- $\varphi: E \to \mathcal{P}_2(V)$ 是关联函数，将每条边映射为顶点集的二元子集（无向图）或顶点的有序对（有向图）。

为简化记号，通常省略 $\varphi$，直接将边表示为 $e = (u, v)$。当 $V$ 与 $E$ 有限时，记 $|V| = n$、$|E| = m$。

**定义 3.2（有向图与无向图）**：

- **无向图**（undirected graph）：$E \subseteq \binom{V}{2}$，边 $e = \{u, v\}$ 是无序对，表示 $u$ 与 $v$ 互为邻居。
- **有向图**（directed graph / digraph）：$E \subseteq V \times V$，边 $e = (u, v)$ 是有序对，称为从 $u$ 指向 $v$ 的弧（arc），$u$ 为尾（tail）、$v$ 为头（head）。

**定义 3.3（加权图）**：加权图（weighted graph）是图 $G = (V, E)$ 配以权函数 $w: E \to \mathbb{R}$。对于无向图，$w(\{u, v\}) = w(\{v, u\})$；对于有向图，$w(u, v)$ 与 $w(v, u)$ 可不同。权可表示距离、代价、容量、概率等。

**定义 3.4（二分图）**：图 $G = (V, E)$ 称为二分图（bipartite graph），若存在 $V$ 的划分 $V = A \dot\cup B$，使得 $E \subseteq A \times B$（即所有边跨过 $A$、$B$ 两部分）。

**定理 3.1（二分图判定）**：图 $G$ 是二分图当且仅当 $G$ 不含奇环。

**证明**：$\Rightarrow$：若 $G$ 含奇环 $v_0 v_1 \dots v_{2k} v_0$，沿环交替着色，$v_0$ 与 $v_{2k}$ 同色但二者相邻，矛盾。$\Leftarrow$：对每个连通分量做 BFS，按层奇偶着色，无奇环保证相邻顶点不同色。

### 3.2 路径、回路与连通性

**定义 3.5（路径）**：图 $G$ 中的**路径**（path）是顶点序列 $v_0, v_1, \dots, v_k$，使得对任意 $0 \leq i < k$，$(v_i, v_{i+1}) \in E$。路径长度为 $k$（边数），加权长度为 $\sum_{i=0}^{k-1} w(v_i, v_{i+1})$。

**定义 3.6（简单路径与回路）**：

- **简单路径**（simple path）：所有顶点互不相同；
- **回路/环**（cycle）：$v_0 = v_k$ 且 $k \geq 1$，且除首尾外顶点互不相同（简单环）；
- **欧拉路径/回路**：经过每条边恰好一次的路径/回路；
- **Hamilton 路径/回路**：经过每个顶点恰好一次的路径/回路。

**定义 3.7（连通性）**：

- 无向图中 $u$ 与 $v$ **连通**（connected），若存在 $u$ 到 $v$ 的路径。连通关系是 $V$ 上的等价关系，其等价类称为**连通分量**（connected component）。
- 有向图中 $u$ **可达** $v$（reachable），若存在 $u$ 到 $v$ 的有向路径。$u$ 与 $v$ **强连通**（strongly connected），若互相可达。强连通关系是等价关系，其等价类称为**强连通分量**（strongly connected component, SCC）。

### 3.3 生成树与生成森林

**定义 3.8（生成树）**：连通无向图 $G = (V, E)$ 的**生成树**（spanning tree，"spanning" 源自古英语 "spannan"，意为"伸展、跨越"，指覆盖所有顶点的树结构）是子图 $T = (V, E_T)$，其中 $E_T \subseteq E$、$|E_T| = |V| - 1$、$T$ 是树（无环连通）。

非连通图的对应概念为**生成森林**（spanning forest），每个连通分量各有一棵生成树。

**定义 3.9（最小生成树）**：加权图 $G = (V, E, w)$ 的**最小生成树**（minimum spanning tree, MST）$T^*$ 满足：

$$T^* = \arg\min_{T \text{ 是 } G \text{ 的生成树}} \sum_{e \in T} w(e)$$

**定理 3.2（MST 唯一性）**：若 $G$ 中所有边权互不相同，则 MST 唯一。

> 注：MST 的构造算法（Kruskal、Prim、Boruvka）、Cut 性质与正确性证明收录于[最短路与最小生成树](/algorithm/115-ShortestPathAndMST)第 7 章，Kruskal 深水篇见 [Kruskal 算法](/algorithm/260-KruskalAlgorithm)。

### 3.4 邻接矩阵与邻接表的代数表示

**定义 3.10（邻接矩阵）**：图 $G = (V, E)$（$|V| = n$）的邻接矩阵 $\mathbf{A} \in \{0, 1\}^{n \times n}$（或 $\mathbb{R}^{n \times n}$ 用于加权图）定义为：

$$\mathbf{A}_{ij} = \begin{cases} 1, & (v_i, v_j) \in E \\ 0, & \text{otherwise} \end{cases}$$

加权图的邻接矩阵中 $\mathbf{A}_{ij} = w(v_i, v_j)$（无边时取 $\infty$ 或 $0$ 视约定）。

**代数性质**：

- 无向图的 $\mathbf{A}$ 对称：$\mathbf{A} = \mathbf{A}^\top$；
- $\mathbf{A}^k_{ij}$ 表示从 $v_i$ 到 $v_j$ 长度恰为 $k$ 的路径数；
- 度数矩阵 $\mathbf{D} = \text{diag}(\deg(v_1), \dots, \deg(v_n))$；
- Laplacian 矩阵 $\mathbf{L} = \mathbf{D} - \mathbf{A}$，其特征值与图的连通性、扩张性密切相关；
- 二分图的判定：$\mathbf{A}$ 经适当置换相似于 $\begin{pmatrix} 0 & \mathbf{B} \\ \mathbf{B}^\top & 0 \end{pmatrix}$。

**定义 3.11（邻接表）**：邻接表（adjacency list）将每个顶点 $v$ 映射到其邻居列表 $\text{Adj}(v) = \{u \mid (v, u) \in E\}$。形式上，邻接表是函数 $\text{Adj}: V \to \mathcal{P}(V)$。

**存储复杂度对比**：

| 表示方法   | 空间            | 查询 $(u, v) \in E$ | 遍历邻居     | 适用场景           |
| :--------- | :-------------- | :------------------ | :----------- | :----------------- |
| 邻接矩阵   | $\Theta(V^2)$   | $O(1)$              | $O(V)$       | 稠密图、频繁查询边 |
| 邻接表     | $\Theta(V + E)$ | $O(\deg(u))$        | $O(\deg(u))$ | 稀疏图、遍历为主   |
| 链式前向星 | $\Theta(V + E)$ | $O(\deg(u))$        | $O(\deg(u))$ | 竞赛场景、内存紧凑 |
| 边集数组   | $\Theta(V + E)$ | $O(E)$              | $O(E)$       | Bellman-Ford、Kruskal 的边列表输入 |

## 第 4 章 图的表示方法与存储

### 4.1 邻接矩阵实现

```python
# 邻接矩阵实现（Python）：稠密图场景
class GraphMatrix:
    """邻接矩阵表示的加权图

    适用于稠密图（E = Theta(V^2)）与频繁查询边存在的场景。
    空间复杂度 Theta(V^2)，查询边存在 O(1)，遍历邻居 O(V)。
    """
    def __init__(self, n: int, directed: bool = False):
        # n: 顶点数；directed: 是否有向
        self.n = n
        self.directed = directed
        # 初始化为 0 表示无边；权值非 0 表示有边
        self.adj = [[0] * n for _ in range(n)]

    def add_edge(self, u: int, v: int, w: int = 1) -> None:
        """添加边 (u, v)，权为 w"""
        self.adj[u][v] = w
        if not self.directed:
            self.adj[v][u] = w

    def has_edge(self, u: int, v: int) -> bool:
        """O(1) 查询边是否存在"""
        return self.adj[u][v] != 0

    def neighbors(self, u: int) -> list:
        """遍历 u 的所有邻居，O(V)"""
        return [v for v in range(self.n) if self.adj[u][v] != 0]
```

```cpp
// 邻接矩阵实现（C++）：稠密图场景
#include <vector>
class GraphMatrix {
    int n;
    bool directed;
    std::vector<std::vector<int>> adj;
public:
    GraphMatrix(int n, bool dir = false)
        : n(n), directed(dir), adj(n, std::vector<int>(n, 0)) {}

    void addEdge(int u, int v, int w = 1) {
        adj[u][v] = w;
        if (!directed) adj[v][u] = w;
    }

    bool hasEdge(int u, int v) const {
        return adj[u][v] != 0;
    }

    int weight(int u, int v) const {
        return adj[u][v];
    }
};
```

### 4.2 邻接表实现

```python
# 邻接表实现（Python）：稀疏图场景
from collections import defaultdict

class GraphList:
    """邻接表表示的加权图

    适用于稀疏图（E = O(V)）与遍历为主的场景。
    空间复杂度 Theta(V + E)，查询边存在 O(deg(u))，遍历邻居 O(deg(u))。
    """
    def __init__(self, n: int, directed: bool = False):
        self.n = n
        self.directed = directed
        # 每个顶点维护 (邻居, 权值) 列表
        self.adj = [[] for _ in range(n)]

    def add_edge(self, u: int, v: int, w: int = 1) -> None:
        self.adj[u].append((v, w))
        if not self.directed:
            self.adj[v].append((u, w))

    def neighbors(self, u: int) -> list:
        """O(deg(u)) 遍历邻居"""
        return self.adj[u]

    def has_edge(self, u: int, v: int) -> bool:
        """O(deg(u)) 查询边存在"""
        return any(node == v for node, _ in self.adj[u])
```

```cpp
// 邻接表实现（C++）：稀疏图场景
#include <vector>
#include <utility>
class GraphList {
    int n;
    bool directed;
    std::vector<std::vector<std::pair<int, int>>> adj;
public:
    GraphList(int n, bool dir = false) : n(n), directed(dir), adj(n) {}

    void addEdge(int u, int v, int w = 1) {
        adj[u].emplace_back(v, w);
        if (!directed) adj[v].emplace_back(u, w);
    }

    const std::vector<std::pair<int, int>>& neighbors(int u) const {
        return adj[u];
    }
};
```

```java
// 邻接表实现（Java）：稀疏图场景
import java.util.*;

public class GraphList {
    private int n;
    private boolean directed;
    private List<List<int[]>> adj;

    public GraphList(int n, boolean directed) {
        this.n = n;
        this.directed = directed;
        this.adj = new ArrayList<>();
        for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
    }

    public void addEdge(int u, int v, int w) {
        adj.get(u).add(new int[]{v, w});
        if (!directed) adj.get(v).add(new int[]{u, w});
    }

    public List<int[]> neighbors(int u) {
        return adj.get(u);
    }
}
```

### 4.3 链式前向星实现

链式前向星是竞赛场景常用的紧凑表示，本质是用数组模拟邻接表的链表。

```cpp
// 链式前向星实现（C++）：内存紧凑，竞赛常用
#include <cstring>
const int MAXN = 100010;
const int MAXM = 200010;

int head[MAXN];           // head[u] = u 的第一条边在 edges 数组中的下标
int nxt[MAXM];            // nxt[i] = 与 edges[i] 同起点的下一条边
int to[MAXM];             // edges[i] 的终点
int weight[MAXM];         // edges[i] 的权值
int edgeCnt = 0;          // 当前边数

void init() {
    std::memset(head, -1, sizeof(head));
    edgeCnt = 0;
}

void addEdge(int u, int v, int w) {
    to[edgeCnt] = v;
    weight[edgeCnt] = w;
    nxt[edgeCnt] = head[u];       // 新边指向原 head
    head[u] = edgeCnt++;          // 更新 head
}

// 遍历 u 的所有出边
void traverse(int u) {
    for (int e = head[u]; e != -1; e = nxt[e]) {
        int v = to[e];
        int w = weight[e];
        // 处理边 (u, v, w)
    }
}
```

### 4.4 边集数组与隐式图表示

**边集数组**（edge list）直接用数组保存全部边 $(u, v, w)$，不做任何顶点级索引。它是最"裸"的表示：Bellman-Ford 的 $V - 1$ 轮全边松弛、Kruskal 的按权排序加边，都以边集数组为天然输入。

```python
# 边集数组（Python）：Bellman-Ford 与 Kruskal 的天然输入格式
edges = [
    (0, 1, 4),
    (0, 2, 1),
    (1, 3, 2),
    (2, 3, 5),
]
# 空间 Theta(E)；查询 (u, v) 是否有边需 O(E) 扫描
# 构建：读入 m 条边直接 append，无需任何索引结构
```

**隐式图**（implicit graph）：网格迷宫、滑块谜题、状态空间搜索等问题的顶点数可达天文数字，显式建图反而浪费。此时不存储邻接表，而是给出"由状态算邻居"的生成函数，遍历时按需展开：

```python
# 隐式图（Python）：4 连通网格的邻居生成函数，无需显式建图
def grid_neighbors(state, rows, cols, grid):
    """状态 (r, c) 的邻居按需生成；BFS/DFS 框架完全不变"""
    r, c = state
    for dr, dc in ((-1, 0), (1, 0), (0, -1), (0, 1)):
        nr, nc = r + dr, c + dc
        if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 0:
            yield (nr, nc)
```

隐式图的关键纪律与显式图一致：用 `visited`（通常是哈希集合）防止状态重复入队或入栈；状态空间无上界时必须配合目标判定提前终止（BFS 逐层扩展保证无权最短路；加权场景的 A* 等启发式搜索见[最短路与最小生成树](/algorithm/115-ShortestPathAndMST)第 6 章）。

### 4.5 表示方法选择

| 场景                     | 邻接矩阵   | 邻接表    | 链式前向星 | 边集数组 |
| :----------------------- | :--------- | :-------- | :--------- | :------- |
| 稠密图 $E = \Theta(V^2)$ | 推荐       | 浪费指针  | 不适用     | 可用     |
| 稀疏图 $E = O(V)$        | 浪费空间   | 推荐      | 推荐       | 可用     |
| 频繁查询边存在           | $O(1)$     | $O(\deg)$ | $O(\deg)$  | $O(E)$   |
| Floyd-Warshall           | 必须用矩阵 | 需转换    | 需转换     | 需转换   |
| Dijkstra/BFS/DFS         | 可用       | 推荐      | 推荐       | 需转换   |
| Bellman-Ford/Kruskal     | 需转换     | 需转换    | 需转换     | 天然输入 |
| 内存受限（竞赛）         | 不推荐     | 可用      | 最优       | 最优     |
| 需要快速删除边           | $O(1)$     | $O(\deg)$ | $O(\deg)$  | $O(E)$   |

网格迷宫、状态空间搜索等邻居动态生成的场景使用 4.4 节的隐式图表示，配合 `visited` 集合即可完全复用第 5 章的遍历框架。

### 4.6 图的输入与构建示例

```python
# 标准输入构建无向加权图
def build_undirected_graph():
    """从标准输入读取 n 个顶点、m 条边构建无向加权图

    输入格式：
    第一行：n m
    后续 m 行：u v w（顶点编号从 0 开始）
    """
    n, m = map(int, input().split())
    g = GraphList(n, directed=False)
    for _ in range(m):
        u, v, w = map(int, input().split())
        g.add_edge(u, v, w)
    return g
```

## 第 5 章 图的遍历：BFS 与 DFS

### 5.1 广度优先搜索（BFS）

广度优先搜索（Breadth-First Search, BFS，由 E. F. Moore (1959) 与 C. Y. Lee (1961) 独立提出，分别用于迷宫寻路与电路布线，名称反映其"逐层扩展"的搜索特征）按距离递增顺序访问顶点，是计算无权图最短路径的基础。

**算法 5.1（BFS）**：

```python
from collections import deque

def bfs(n, graph, start):
    """广度优先搜索

    输入：顶点数 n、邻接表 graph、起始顶点 start
    输出：dist 数组（从 start 到各顶点的最短边数）、prev 数组（前驱）
    时间复杂度：O(V + E)
    """
    dist = [-1] * n
    prev = [-1] * n
    dist[start] = 0
    q = deque([start])
    while q:
        u = q.popleft()
        for v, _ in graph[u]:
            if dist[v] == -1:        # 未访问
                dist[v] = dist[u] + 1
                prev[v] = u
                q.append(v)
    return dist, prev
```

```cpp
#include <queue>
#include <vector>
// BFS（C++ 实现）
std::vector<int> bfs(int n, std::vector<std::vector<std::pair<int,int>>>& graph, int start) {
    std::vector<int> dist(n, -1);
    std::vector<int> prev(n, -1);
    std::queue<int> q;
    dist[start] = 0;
    q.push(start);
    while (!q.empty()) {
        int u = q.front(); q.pop();
        for (auto& [v, w] : graph[u]) {
            if (dist[v] == -1) {
                dist[v] = dist[u] + 1;
                prev[v] = u;
                q.push(v);
            }
        }
    }
    return dist;
}
```

以 5.7 节的示例图为例（顶点编号 A=0、B=1、C=2、D=3、E=4；无向边 A-B、A-C、B-D、C-D、C-E、D-E）：

```python
graph = [
    [(1, 1), (2, 1)],          # A 的邻居
    [(0, 1), (3, 1)],          # B
    [(0, 1), (3, 1), (4, 1)],  # C
    [(1, 1), (2, 1), (4, 1)],  # D
    [(2, 1), (3, 1)],          # E
]
dist, prev = bfs(5, graph, 0)
# 预期输出：
# dist = [0, 1, 1, 2, 2]    A 到 B、C 距离 1，到 D、E 距离 2
# prev = [-1, 0, 0, 1, 2]   最短路树：B<-A、C<-A、D<-B、E<-C
```

### 5.2 BFS 正确性证明（Loop Invariant）

**定理 5.1（BFS 正确性）**：BFS 结束时，`dist[v]` 等于从 `start` 到 `v` 的最短边数（无权最短路）。

**证明**（基于 Loop Invariant）：

**Loop Invariant**：在 BFS 主循环的每次迭代开始时，队列 `q` 中的顶点按 `dist` 非递减顺序排列，且对每个已访问顶点 $v$（`dist[v] != -1`），`dist[v]` 等于 `start` 到 $v$ 的最短边数 $\delta(s, v)$。

**初始化**：初始时 `q = [start]`、`dist[start] = 0 = δ(s, s)`，不变式成立。

**保持**：设当前弹出顶点为 $u$，其 `dist[u] = d`。对 $u$ 的每个未访问邻居 $v$，设 `dist[v] = d + 1`。需证 $\delta(s, v) = d + 1$：

- $\delta(s, v) \leq \delta(s, u) + 1 = d + 1$（$s \to u \to v$ 是一条长度 $d + 1$ 的路径）；
- 若 $\delta(s, v) < d + 1$，则存在长度 $\leq d$ 的路径 $s \to v$，但 $u$ 是当前队列中 `dist` 最小的未处理顶点（不变式保证队列非递减），故 $v$ 应已被某个 `dist < d` 的顶点松弛，与 $v$ 未访问矛盾。
- 故 $\delta(s, v) = d + 1$，不变式保持。

**终止**：所有顶点被处理后，`dist[v] = δ(s, v)` 对所有 $v$ 成立。

**复杂度**：每个顶点入队出队各一次（$O(V)$），每条边在无向图中被两端各遍历一次（$O(E)$），总计 $O(V + E)$。

### 5.3 深度优先搜索（DFS）

深度优先搜索（Depth-First Search, DFS，由 Charles Pierre Tremaux (19th century) 在迷宫求解中提出，Tarjan (1972) 形式化并证明其线性时间复杂度，名称反映其"深入到底"的搜索特征）沿一条路径深入到底再回溯，是环检测、拓扑排序、SCC 的基础。

**算法 5.2（DFS 递归实现）**：

```python
def dfs_recursive(n, graph, start):
    """DFS 递归实现

    输出：visited 数组、discovery/finish 时间戳
    时间复杂度：O(V + E)
    """
    WHITE, GRAY, BLACK = 0, 1, 2
    color = [WHITE] * n
    disc = [0] * n
    finish = [0] * n
    timer = [0]

    def dfs(u):
        timer[0] += 1
        disc[u] = timer[0]
        color[u] = GRAY
        for v, _ in graph[u]:
            if color[v] == WHITE:
                dfs(v)
        color[u] = BLACK
        timer[0] += 1
        finish[u] = timer[0]

    dfs(start)
    return disc, finish
```

**算法 5.3（DFS 迭代实现）**：

```python
def dfs_iterative(n, graph, start):
    """DFS 迭代实现，避免递归栈溢出

    注意：栈中需记录"下一个待访问邻居的下标"才能模拟递归回溯
    """
    visited = [False] * n
    order = []
    # 栈元素：(顶点, 下一个邻居下标)
    stack = [(start, 0)]
    visited[start] = True
    while stack:
        u, idx = stack[-1]
        if idx < len(graph[u]):
            stack[-1] = (u, idx + 1)
            v, _ = graph[u][idx]
            if not visited[v]:
                visited[v] = True
                stack.append((v, 0))
        else:
            stack.pop()
            order.append(u)
    return order
```

```cpp
#include <vector>
#include <stack>
// DFS 迭代实现（C++）
std::vector<int> dfsIterative(int n, std::vector<std::vector<std::pair<int,int>>>& graph, int start) {
    std::vector<bool> visited(n, false);
    std::vector<int> order;
    std::stack<std::pair<int, int>> stk;   // (顶点, 下一个邻居下标)
    stk.push({start, 0});
    visited[start] = true;
    while (!stk.empty()) {
        auto& [u, idx] = stk.top();
        if (idx < (int)graph[u].size()) {
            int v = graph[u][idx].first;
            idx++;
            if (!visited[v]) {
                visited[v] = true;
                stk.push({v, 0});
            }
        } else {
            stk.pop();
            order.push_back(u);
        }
    }
    return order;
}
```

在同一示例图上按邻接表顺序执行递归 DFS：

```python
disc, finish = dfs_recursive(5, graph, 0)   # graph 与 5.1 节示例相同
# 预期输出（发现时间 disc）：
# disc = [1, 2, 4, 3, 5]
# 访问顺序：A(1) -> B(2) -> D(3) -> C(4) -> E(5)，深入到底再回溯
# 完成时间 finish = [10, 9, 7, 8, 6]，满足括号化定理：
# 区间 [1, 10] 包含其余所有区间
```

### 5.4 DFS 边的分类

DFS 遍历中，每条边 $(u, v)$ 根据发现时的顶点颜色分为四类：

| 边类型                 | 定义                                 | 意义                 |
| :--------------------- | :----------------------------------- | :------------------- |
| 树边（tree edge）      | $v$ 为白色，DFS 递归进入 $v$         | 构成 DFS 森林        |
| 回边（back edge）      | $v$ 为灰色（正在递归栈中）           | 表示存在环           |
| 前向边（forward edge） | $v$ 为黑色且 $v$ 是 $u$ 的后代       | 非树边，跳过中间节点 |
| 横叉边（cross edge）   | $v$ 为黑色且 $v$ 非 $u$ 的祖先或后代 | 连接不同 DFS 子树    |

**定理 5.2（无向图 DFS 边分类）**：无向图 DFS 中只存在树边与回边，无前向边与横叉边。

**证明**：考虑无向边 $(u, v)$，DFS 先到达其一（设为 $u$）。若 $v$ 未访问，则为树边；若 $v$ 已访问，因 $v$ 与 $u$ 邻接，$v$ 必在 $u$ 之前已被 DFS 完成或正在递归。若 $v$ 已完成（黑色），则 $u$ 必在 $v$ 的子树中（否则 $v$ 完成前会经 $(v, u)$ 访问 $u$），矛盾。故 $v$ 必为灰色，$(u, v)$ 为回边。

### 5.5 DFS 时间戳与括号化定理

DFS 为每个顶点 $u$ 记录发现时间 $\text{disc}[u]$ 与完成时间 $\text{finish}[u]$。

**定理 5.3（括号化定理）**：对任意两顶点 $u, v$，区间 $[\text{disc}[u], \text{finish}[u]]$ 与 $[\text{disc}[v], \text{finish}[v]]$ 要么不相交，要么一个包含另一个；后者成立当且仅当一个是另一个的祖先。

**推论 5.1（白色路径定理）**：$v$ 是 $u$ 的后代当且仅当在发现 $u$ 时刻，存在从 $u$ 到 $v$ 的全白色顶点路径。

### 5.6 应用：连通分量、环检测、二分图判定

```python
def connected_components(n, graph):
    """计算无向图连通分量

    时间复杂度：O(V + E)
    """
    visited = [False] * n
    components = []
    for s in range(n):
        if not visited[s]:
            comp = []
            stack = [s]
            visited[s] = True
            while stack:
                u = stack.pop()
                comp.append(u)
                for v, _ in graph[u]:
                    if not visited[v]:
                        visited[v] = True
                        stack.append(v)
            components.append(comp)
    return components
```

```python
def has_cycle_undirected(n, graph):
    """无向图环检测（DFS）"""
    visited = [False] * n
    def dfs(u, parent):
        visited[u] = True
        for v, _ in graph[u]:
            if not visited[v]:
                if dfs(v, u):
                    return True
            elif v != parent:
                return True
        return False
    for s in range(n):
        if not visited[s]:
            if dfs(s, -1):
                return True
    return False
```

```python
def is_bipartite(n, graph):
    """二分图判定（BFS 染色法）

    返回 True 当且仅当图不含奇环
    """
    color = [-1] * n
    from collections import deque
    for s in range(n):
        if color[s] == -1:
            color[s] = 0
            q = deque([s])
            while q:
                u = q.popleft()
                for v, _ in graph[u]:
                    if color[v] == -1:
                        color[v] = color[u] ^ 1
                        q.append(v)
                    elif color[v] == color[u]:
                        return False
    return True
```

### 5.7 BFS 与 DFS 可视化对比

下图展示同一图在 BFS 与 DFS 下的访问顺序差异：

```mermaid
graph TB
    subgraph "原图"
        A1["A"] --- B1["B"]
        A1 --- C1["C"]
        B1 --- D1["D"]
        C1 --- D1
        C1 --- E1["E"]
        D1 --- E1
    end
    subgraph "BFS 访问顺序（A 出发）"
        A2["A<br/>dist=0"] --> B2["B<br/>dist=1"]
        A2 --> C2["C<br/>dist=1"]
        B2 --> D2["D<br/>dist=2"]
        C2 --> E2["E<br/>dist=2"]
    end
    subgraph "DFS 访问顺序（A 出发）"
        A3["A<br/>disc=1"] --> B3["B<br/>disc=2"]
        B3 --> D3["D<br/>disc=3"]
        D3 --> E3["E<br/>disc=4"]
        E3 -.-> C3["C<br/>disc=5"]
    end
    style A1 fill:#69f,color:#fff
    style A2 fill:#69f,color:#fff
    style A3 fill:#69f,color:#fff
```

### 5.8 遍历应用场景速查表

| 任务                    | 推荐算法             | 关键机制              | 本篇章节 | 深水篇 |
| :---------------------- | :------------------- | :-------------------- | :------- | :----- |
| 无权最短路              | BFS                  | 逐层扩展              | 5.1      | —      |
| 连通分量                | DFS 或 BFS           | 多源启动覆盖全图      | 5.6      | —      |
| 无向图环检测            | DFS                  | 回边 + 父顶点判定     | 5.6      | —      |
| 二分图判定              | BFS 染色             | 奇环等价判定          | 5.6      | —      |
| 拓扑排序                | Kahn 或 DFS 后序逆序 | 入度归零 / 完成序逆序 | 第 6 章  | [拓扑排序](/algorithm/270-TopologicalSorting) |
| 强连通分量              | Tarjan / Kosaraju    | dfn/low 与栈          | 第 7 章  | —      |
| 割点与桥                | Tarjan low 机制      | low[v] 与 dfn[u] 比较 | 7.6      | —      |
| 2-SAT                   | SCC 缩点             | 蕴含图强连通性        | 8.1      | —      |
| 欧拉回路                | Hierholzer           | 度数判定 + 边回收     | 8.2      | —      |
| 加权最短路 / 最小生成树 | 见姊妹篇             | 松弛 / Cut 性质       | —        | [最短路与最小生成树](/algorithm/115-ShortestPathAndMST) |

## 第 6 章 拓扑排序与 DAG

本章保持概念级篇幅：DAG 定义、Kahn 与 DFS 两种线性实现（二者都是第 5 章遍历框架的直接应用）与 AOV/AOE 概念。深水内容——正确性证明、与 SCC 及关键路径法（CPM/PERT）的关系、编译器与构建系统案例——收录于专篇[拓扑排序](/algorithm/270-TopologicalSorting)。

### 6.1 DAG 与拓扑序

**定义 6.1（DAG）**：有向无环图（Directed Acyclic Graph, DAG）是不含环的有向图。

**定义 6.2（拓扑排序）**：DAG $G = (V, E)$ 的拓扑排序（topological sort）是 $V$ 的线性序 $v_1, v_2, \dots, v_n$，使得对任意 $(v_i, v_j) \in E$，$i < j$。

**定理 6.1**：DAG 存在拓扑排序当且仅当它是无环的。

### 6.2 Kahn 算法（BFS 入度法）

```python
from collections import deque

def topological_sort_kahn(n, graph):
    """Kahn 拓扑排序（BFS 入度法）

    输入：顶点数 n、邻接表 graph
    输出：拓扑序（若存在），否则 None
    时间复杂度：O(V + E)
    """
    in_degree = [0] * n
    for u in range(n):
        for v, _ in graph[u]:
            in_degree[v] += 1
    # 初始入度为 0 的顶点入队
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
        return None                # 存在环
    return order
```

```cpp
#include <vector>
#include <queue>
// Kahn 拓扑排序（C++）
std::vector<int> topologicalSortKahn(int n, std::vector<std::vector<std::pair<int,int>>>& graph) {
    std::vector<int> inDegree(n, 0);
    for (int u = 0; u < n; u++) {
        for (auto& [v, w] : graph[u]) inDegree[v]++;
    }
    std::queue<int> q;
    for (int i = 0; i < n; i++) {
        if (inDegree[i] == 0) q.push(i);
    }
    std::vector<int> order;
    while (!q.empty()) {
        int u = q.front(); q.pop();
        order.push_back(u);
        for (auto& [v, w] : graph[u]) {
            if (--inDegree[v] == 0) q.push(v);
        }
    }
    if ((int)order.size() != n) return {};     // 存在环
    return order;
}
```

### 6.3 DFS 后序逆序法

```python
def topological_sort_dfs(n, graph):
    """DFS 后序逆序拓扑排序

    关键观察：DAG 的 DFS 完成时间逆序即为合法拓扑序
    时间复杂度：O(V + E)
    """
    WHITE, GRAY, BLACK = 0, 1, 2
    color = [WHITE] * n
    order = []
    has_cycle = False

    def dfs(u):
        nonlocal has_cycle
        color[u] = GRAY
        for v, _ in graph[u]:
            if color[v] == WHITE:
                dfs(v)
            elif color[v] == GRAY:
                has_cycle = True        # 检测到回边，存在环
        color[u] = BLACK
        order.append(u)                 # 后序追加

    for s in range(n):
        if color[s] == WHITE:
            dfs(s)
    if has_cycle:
        return None
    return order[::-1]                  # 后序逆序
```

### 6.4 DAG 上的最长/最短路径

DAG 上的最短/最长路径可在 $O(V + E)$ 内求解，无需 Dijkstra 或 Bellman-Ford。

```python
def dag_shortest_path(n, graph, start):
    """DAG 单源最短路径

    时间复杂度：O(V + E)
    支持负权边（无负环即 DAG 无环）
    """
    INF = float('inf')
    order = topological_sort_kahn(n, graph)
    if order is None:
        return None                     # 非 DAG
    dist = [INF] * n
    dist[start] = 0
    for u in order:
        if dist[u] == INF:
            continue
        for v, w in graph[u]:
            if dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
    return dist

def dag_longest_path(n, graph, start):
    """DAG 单源最长路径

    技巧：边权取负后求最短路径，再取反
    """
    neg_graph = [[(v, -w) for v, w in adj] for adj in graph]
    dist = dag_shortest_path(n, neg_graph, start)
    if dist is None:
        return None
    return [-d if d != float('inf') else float('inf') for d in dist]
```

> 注：DAG 最短路径按拓扑序一趟松弛即可完成，是最短路问题在无环图上的特例；一般图的单源/全源最短路径（Dijkstra、Bellman-Ford、Floyd-Warshall）见[最短路与最小生成树](/algorithm/115-ShortestPathAndMST)。

### 6.5 AOV 网与 AOE 网

**AOV 网（Activity On Vertex）**：顶点表示活动，边表示先后关系。拓扑排序确定执行顺序。

**AOE 网（Activity On Edge）**：边表示活动，顶点表示事件。关键路径分析：

- 最早发生时间 $V_e[v]$：从源点到 $v$ 的最长路径长度；
- 最迟发生时间 $V_l[v]$：不延误工期的最晚时间，$V_l[v] = \min_{(v, u) \in E}(V_l[u] - w(v, u))$；
- 关键活动：$V_e[u] + w(u, v) = V_l[v]$ 的活动 $(u, v)$。

```python
def critical_path(n, graph, source, sink):
    """AOE 网关键路径算法

    输出：关键活动列表
    """
    order = topological_sort_kahn(n, graph)
    if order is None:
        return None
    INF = float('inf')
    # 正向计算 Ve
    Ve = [0] * n
    for u in order:
        for v, w in graph[u]:
            if Ve[u] + w > Ve[v]:
                Ve[v] = Ve[u] + w
    # 逆向计算 Vl
    Vl = [INF] * n
    Vl[sink] = Ve[sink]
    for u in reversed(order):
        for v, w in graph[u]:
            if Vl[v] - w < Vl[u]:
                Vl[u] = Vl[v] - w
    # 关键活动
    critical = []
    for u in range(n):
        for v, w in graph[u]:
            if Ve[u] + w == Vl[v]:
                critical.append((u, v, w))
    return critical
```

## 第 7 章 强连通分量与双连通性

强连通分量、割点与桥是第 5 章 DFS 时间戳（5.5 节）与边分类（5.4 节）的直接应用：一次 DFS 内维护 dfn 与 low 两个数组，即可线性识别全部结构。

### 7.1 Tarjan SCC 算法

Tarjan 算法基于 DFS，利用 `dfn`（发现时间）与 `low`（能回溯到的最早祖先）识别强连通分量。

**核心定义**：

- $\text{dfn}[u]$：$u$ 的 DFS 发现时间戳；
- $\text{low}[u]$：$u$ 经至多一条回边或横叉边能到达的、仍在栈中的最早祖先的 `dfn`。

$$\text{low}[u] = \min\begin{cases} \text{dfn}[u] & \\ \text{dfn}[v] & \text{若 } (u, v) \text{ 是回边且 } v \text{ 在栈中} \\ \text{low}[v] & \text{若 } (u, v) \text{ 是树边} \end{cases}$$

**判定条件**：当 $\text{dfn}[u] = \text{low}[u]$ 时，$u$ 是其所在 SCC 的根，弹出栈中 $u$ 之上的所有顶点构成一个 SCC。

```python
def tarjan_scc(n, graph):
    """Tarjan 强连通分量算法

    输入：顶点数 n、邻接表 graph
    输出：SCC 列表（每个 SCC 是顶点列表）
    时间复杂度：O(V + E)
    空间复杂度：O(V)
    """
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
        on_stack[u] = True
        for v in graph[u]:
            if dfn[v] == 0:                 # 树边
                dfs(v)
                low[u] = min(low[u], low[v])
            elif on_stack[v]:               # 回边或横叉边（v 在栈中）
                low[u] = min(low[u], dfn[v])
        # 若 u 是 SCC 根，弹出栈中 u 及其之上顶点
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

```cpp
#include <vector>
#include <stack>
// Tarjan SCC（C++）
class TarjanSCC {
    int n;
    std::vector<std::vector<int>> graph;
    std::vector<int> dfn, low;
    std::vector<bool> onStack;
    std::stack<int> stk;
    std::vector<std::vector<int>> sccs;
    int timer = 0;
public:
    TarjanSCC(int n, std::vector<std::vector<int>>& g)
        : n(n), graph(g), dfn(n, 0), low(n, 0), onStack(n, false) {}

    void dfs(int u) {
        dfn[u] = low[u] = ++timer;
        stk.push(u);
        onStack[u] = true;
        for (int v : graph[u]) {
            if (dfn[v] == 0) {
                dfs(v);
                low[u] = std::min(low[u], low[v]);
            } else if (onStack[v]) {
                low[u] = std::min(low[u], dfn[v]);
            }
        }
        if (dfn[u] == low[u]) {
            std::vector<int> scc;
            int v;
            do {
                v = stk.top(); stk.pop();
                onStack[v] = false;
                scc.push_back(v);
            } while (v != u);
            sccs.push_back(scc);
        }
    }

    std::vector<std::vector<int>> run() {
        for (int i = 0; i < n; i++) {
            if (dfn[i] == 0) dfs(i);
        }
        return sccs;
    }
};
```

### 7.2 Tarjan SCC 正确性证明

**定理 9.1（Tarjan SCC 正确性）**：Tarjan 算法终止时输出的每个分量恰是一个 SCC。

**证明**：

**关键引理**：$u$ 与 $v$ 强连通当且仅当 $u$ 与 $v$ 在同一棵 DFS 树中且 $u$ 可达 $v$、$v$ 可达 $u$（通过树边、回边、横叉边的组合，但回溯到祖先必经回边或栈中横叉边）。

**判定条件证明**：当 `dfn[u] = low[u]` 时，$u$ 无法回溯到更早的栈中顶点，说明 $u$ 是其 SCC 中 `dfn` 最小的顶点（即 DFS 树中最浅的顶点）。此时栈中 $u$ 之上的所有顶点 $w$ 满足 $\text{low}[w] \geq \text{dfn}[u]$，即 $w$ 至多能回溯到 $u$，故 $w$ 与 $u$ 在同一 SCC 中。

反之，若 $w$ 与 $u$ 在同一 SCC，则 $w$ 可达 $u$ 且 $u$ 可达 $w$。$w$ 到 $u$ 的路径必经某条回边或栈中横叉边回到 $u$ 的祖先链上，故 $\text{low}[w] \leq \text{dfn}[u]$。又 $\text{dfn}[u] \leq \text{dfn}[w]$（$u$ 是祖先），故 $\text{low}[w] = \text{dfn}[u]$，$w$ 在 $u$ 的 SCC 中。

**复杂度**：每个顶点被访问一次，每条边被遍历常数次，总计 $O(V + E)$。

### 7.3 Kosaraju 算法

Kosaraju 算法通过两次 DFS 完成 SCC 识别：第一次在原图求后序逆序，第二次在反图按后序逆序遍历。

```python
def kosaraju_scc(n, graph):
    """Kosaraju 强连通分量算法

    时间复杂度：O(V + E)
    空间复杂度：O(V + E)（需存储反图）
    """
    # 第一次 DFS：原图后序
    visited = [False] * n
    order = []
    def dfs1(u):
        visited[u] = True
        for v, _ in graph[u]:
            if not visited[v]:
                dfs1(v)
        order.append(u)
    for i in range(n):
        if not visited[i]:
            dfs1(i)
    # 构建反图
    rev_graph = [[] for _ in range(n)]
    for u in range(n):
        for v, _ in graph[u]:
            rev_graph[v].append(u)
    # 第二次 DFS：反图按后序逆序
    visited = [False] * n
    sccs = []
    def dfs2(u, scc):
        visited[u] = True
        scc.append(u)
        for v in rev_graph[u]:
            if not visited[v]:
                dfs2(v, scc)
    for u in reversed(order):
        if not visited[u]:
            scc = []
            dfs2(u, scc)
            sccs.append(scc)
    return sccs
```

### 7.4 Tarjan vs Kosaraju 对比

| 维度       | Tarjan     | Kosaraju             |
| :--------- | :--------- | :------------------- |
| DFS 次数   | 1 次       | 2 次（原图 + 反图）  |
| 时间复杂度 | $O(V + E)$ | $O(V + E)$           |
| 空间复杂度 | $O(V)$     | $O(V + E)$（需反图） |
| 实现复杂度 | 中等       | 较低                 |
| 工程常用   | 推荐       | 教学/简洁场景        |

### 7.5 SCC 缩点与 DAG

将每个 SCC 缩为单个"超级顶点"，得到的新图必为 DAG。这是求解"加边使图强连通"等问题的标准预处理。

```python
def shrink_scc(n, graph, sccs):
    """SCC 缩点为 DAG

    输入：原图、SCC 列表
    输出：(SCC 编号数组 scc_id、DAG 邻接表)
    """
    scc_id = [-1] * n
    for i, scc in enumerate(sccs):
        for v in scc:
            scc_id[v] = i
    dag = [set() for _ in range(len(sccs))]
    for u in range(n):
        for v, _ in graph[u]:
            if scc_id[u] != scc_id[v]:
                dag[scc_id[u]].add(scc_id[v])
    # 转为列表
    dag = [list(s) for s in dag]
    return scc_id, dag
```

### 7.6 割点与桥

**定义 7.3**：

- **割点（Articulation Point）**：无向图中删除该点（及关联边）后图不再连通；
- **桥（Bridge）**：无向图中删除该边后图不再连通。

判定条件（基于 Tarjan 的 `dfn`/`low`）：

- 割点：$u$ 是 DFS 根且有 $\geq 2$ 个子树，或 $u$ 非根且存在子节点 $v$ 使 $\text{low}[v] \geq \text{dfn}[u]$；
- 桥：边 $(u, v)$ 是树边且 $\text{low}[v] > \text{dfn}[u]$。

```python
def find_bridges(n, graph):
    """寻找无向图所有桥

    时间复杂度：O(V + E)
    """
    dfn = [0] * n
    low = [0] * n
    timer = [0]
    bridges = []

    def dfs(u, parent):
        timer[0] += 1
        dfn[u] = low[u] = timer[0]
        for v, _ in graph[u]:
            if dfn[v] == 0:
                dfs(v, u)
                low[u] = min(low[u], low[v])
                if low[v] > dfn[u]:
                    bridges.append((u, v))
            elif v != parent:
                low[u] = min(low[u], dfn[v])

    for i in range(n):
        if dfn[i] == 0:
            dfs(i, -1)
    return bridges
```

### 7.7 SCC 结构可视化

```mermaid
graph TB
    subgraph "原图（有向）"
        A0["A"] --> B0["B"]
        B0 --> C0["C"]
        C0 --> A0
        C0 --> D0["D"]
        D0 --> E0["E"]
        E0 --> F0["F"]
        F0 --> D0
        E0 --> G0["G"]
    end
    subgraph "识别出的 SCC"
        S1["SCC1: {A, B, C}"]
        S2["SCC2: {D, E, F}"]
        S3["SCC3: {G}"]
    end
    subgraph "缩点后的 DAG"
        D1["SCC1"] --> D2["SCC2"]
        D2 --> D3["SCC3"]
    end
    style A0 fill:#69f,color:#fff
    style S1 fill:#69f,color:#fff
    style D1 fill:#69f,color:#fff
```

## 第 8 章 进阶遍历算法

本章收录以第 5 章遍历或其衍生结构（SCC）为核心机制的四个经典专题。2-SAT 与二分图最大匹配的网络流解法见[网络流](/algorithm/290-NetworkFlow)。

### 8.1 2-SAT 问题（SCC 应用）

2-SAT（2-可满足性）是布尔可满足性的特例：每个子句恰含 2 个文字。可归约为有向图的 SCC 问题。

**核心思想**：对每个变量 $x$，构造两个顶点 $x$ 与 $\neg x$。每个子句 $(a \lor b)$ 等价于两个蕴含 $\neg a \to b$ 与 $\neg b \to a$。若 $x$ 与 $\neg x$ 在同一 SCC 中，则无解；否则根据 SCC 拓扑序赋值。

```python
def two_sat(n, implications):
    """2-SAT 求解

    输入：变量数 n、蕴含列表 [(not_a, b_idx), ...] 表示 a -> b
          变量 i 用 i*2 表示真，i*2+1 表示假
    输出：赋值数组或 None（无解）
    """
    # 构建蕴含图：2n 个顶点，i 表示 x_i 真，i+n 表示 x_i 假
    graph = [[] for _ in range(2 * n)]
    for a, b in implications:
        graph[a].append(b)
        # 反向蕴含（若 a -> b 给定，自动有 !b -> !a）
        graph[b ^ 1].append(a ^ 1)
    sccs = tarjan_scc(2 * n, graph)
    scc_id = [-1] * (2 * n)
    for i, scc in enumerate(sccs):
        for v in scc:
            scc_id[v] = i
    # 检查 x 与 !x 是否同 SCC
    assignment = [False] * n
    for i in range(n):
        if scc_id[2 * i] == scc_id[2 * i + 1]:
            return None                     # 无解
        # 选择拓扑序较大的 SCC（即后弹出/编号较小的）
        assignment[i] = scc_id[2 * i] < scc_id[2 * i + 1]
    return assignment
```

### 8.2 欧拉路径与回路

**定理 8.1（Euler 1736）**：

- 无向图有欧拉回路当且仅当连通且所有顶点度数为偶数；
- 无向图有欧拉路径（非回路）当且仅当连通且恰有 0 或 2 个奇度顶点；
- 有向图有欧拉回路当且仅当弱连通且所有顶点入度等于出度。

**算法 8.1（Hierholzer 算法）**：

```python
def hierholzer(n, graph):
    """Hierholzer 算法求欧拉回路（有向图）

    输入：顶点数 n、邻接表 graph（graph[u] = [v1, v2, ...]）
    输出：欧拉回路顶点序列（若存在）
    时间复杂度：O(V + E)
    """
    # 复制邻接表以便删除已访问边
    adj = [list(g) for g in graph]
    stack = [0]
    path = []
    while stack:
        u = stack[-1]
        if adj[u]:
            v = adj[u].pop()                # 取一条出边
            stack.append(v)
        else:
            path.append(stack.pop())        # 无出边，加入路径
    return path[::-1]
```

### 8.3 Hamilton 路径与回路

Hamilton 路径/回路是经过每个顶点恰好一次的路径/回路。判定 Hamilton 回路存在性是 NP 完全问题（Karp 1972）。

对小规模图（$V \leq 20$）可用状压 DP：

```python
def hamilton_path(n, graph):
    """状压 DP 求 Hamilton 路径

    状态：dp[S][v] = 是否存在经过顶点集合 S 且终点为 v 的路径
    时间复杂度：O(2^V * V^2)
    空间复杂度：O(2^V * V)
    """
    dp = [[False] * n for _ in range(1 << n)]
    for v in range(n):
        dp[1 << v][v] = True
    for S in range(1 << n):
        for v in range(n):
            if not (S & (1 << v)) or not dp[S][v]:
                continue
            for u in range(n):
                if not (S & (1 << u)) and any(w == u for w, _ in graph[v]):
                    dp[S | (1 << u)][u] = True
    return any(dp[(1 << n) - 1][v] for v in range(n))
```

### 8.4 二分图最大匹配

**匈牙利算法**求二分图最大匹配，时间 $O(V E)$：

```python
def hungarian(n_left, n_right, graph):
    """匈牙利算法求二分图最大匹配

    输入：左部顶点数 n_left、右部顶点数 n_right、邻接表 graph（左部 -> 右部）
    输出：最大匹配数 match_count
    """
    matchR = [-1] * n_right                 # matchR[v] = 与 v 匹配的左部顶点

    def try_kuhn(u, visited):
        for v in graph[u]:
            if visited[v]:
                continue
            visited[v] = True
            if matchR[v] == -1 or try_kuhn(matchR[v], visited):
                matchR[v] = u
                return True
        return False

    match_count = 0
    for u in range(n_left):
        visited = [False] * n_right
        if try_kuhn(u, visited):
            match_count += 1
    return match_count
```

## 第 9 章 对比分析

本章对比遍历类算法的工程取舍；最短路三算法与 MST 双算法的横向对比与场景选型决策表见[最短路与最小生成树](/algorithm/115-ShortestPathAndMST)第 8 章。

### 9.1 BFS vs DFS

| 维度           | BFS                    | DFS                    |
| :------------- | :--------------------- | :--------------------- |
| 数据结构       | 队列（FIFO）           | 栈（LIFO）或递归       |
| 访问顺序       | 按距离递增             | 深入到底再回溯         |
| 时间复杂度     | $O(V + E)$             | $O(V + E)$             |
| 空间复杂度     | $O(V)$（最坏队列宽度） | $O(V)$（递归深度）     |
| 无权最短路     | 直接给出               | 需后处理               |
| 连通分量       | 适用                   | 适用                   |
| 环检测         | 适用（双色）           | 适用（回边）           |
| 拓扑排序       | 适用（Kahn）           | 适用（后序逆序）       |
| 求解迷宫最短路 | 最优                   | 可能次优               |
| 内存友好性     | 队列可能宽             | 栈可能深（递归溢出）   |
| 工程实现       | 迭代天然               | 需手动转迭代避免栈溢出 |

### 9.2 Tarjan vs Kosaraju

| 维度       | Tarjan     | Kosaraju         |
| :--------- | :--------- | :--------------- |
| DFS 次数   | 1 次       | 2 次             |
| 时间复杂度 | $O(V + E)$ | $O(V + E)$       |
| 空间复杂度 | $O(V)$     | $O(V + E)$       |
| 常数因子   | 较小       | 较大（需建反图） |
| 难度       | 较高       | 较低             |
| 工程首选   | 是         | 教学/简单场景    |

### 9.3 拓扑排序：Kahn vs DFS

| 维度       | Kahn                     | DFS        |
| :--------- | :----------------------- | :--------- |
| 策略       | 入度为 0 入队            | 后序逆序   |
| 环检测     | 队列空时未遍历完         | 检测回边   |
| 时间复杂度 | $O(V + E)$               | $O(V + E)$ |
| 输出顺序   | 字典序可调（用优先队列） | 深度优先   |
| 工程首选   | 是                       | 是         |

## 第 10 章 常见陷阱

本章收录表示与遍历相关的典型错误；负权边、堆中过期条目、优先队列比较器等最短路与 MST 陷阱见姊妹篇第 9 章。

### 10.1 不连通图

:::danger 错误示例

```python
# 仅从单个源点执行 BFS，遗漏其他连通分量
def bad_bfs_all(graph, n):
    visited = [False] * n
    bfs(graph, 0)             # 只从 0 开始
    # 若图不连通，部分顶点未被访问
```

**原因**：BFS/DFS 必须从所有未访问顶点各启动一次才能覆盖全图。
:::

**修正方案**：

```python
def correct_traverse_all(graph, n):
    visited = [False] * n
    for s in range(n):
        if not visited[s]:
            bfs_from(graph, s, visited)   # 每个连通分量各启动一次
```

### 10.2 内存超限

:::danger 错误示例

```python
# 大规模稀疏图用邻接矩阵
n = 100000                    # 10^5 顶点
adj = [[0] * n for _ in range(n)]   # 10^10 项，超 100GB
```

**原因**：邻接矩阵空间 $O(V^2)$，对 $V = 10^5$ 的稀疏图不可行。
:::

**修正方案**：稀疏图必须用邻接表或链式前向星，空间 $O(V + E)$。

### 10.3 递归栈溢出

:::danger 错误示例

```python
# 链状图（深度 10^5）上递归 DFS
def dfs(u):
    for v, _ in graph[u]:
        if not visited[v]:
            dfs(v)            # 深度 10^5，Python 默认递归上限 1000
```

**原因**：Python 默认递归深度上限 1000，C++ 默认栈大小 8MB（约 10^5 帧）。
:::

**修正方案**：

```python
import sys
sys.setrecursionlimit(10**6)  # 提高 Python 递归上限

# 更稳妥：改为迭代 DFS
def dfs_iterative(graph, start, n):
    visited = [False] * n
    stack = [start]
    while stack:
        u = stack.pop()
        if visited[u]:
            continue
        visited[u] = True
        for v, _ in graph[u]:
            if not visited[v]:
                stack.append(v)
```

### 10.4 拓扑排序遗漏环检测

:::danger 错误示例

```python
def topo_bad(n, graph):
    in_deg = [0] * n
    for u in range(n):
        for v, _ in graph[u]:
            in_deg[v] += 1
    q = deque([i for i in range(n) if in_deg[i] == 0])
    order = []
    while q:
        u = q.popleft()
        order.append(u)
        for v, _ in graph[u]:
            in_deg[v] -= 1
            if in_deg[v] == 0:
                q.append(v)
    return order           # 未检查 len(order) == n
```

**原因**：含环的图无拓扑序，但代码仍返回部分结果。
:::

**修正方案**：返回前必须检查 `len(order) == n`，否则返回 `None` 表示存在环。

## 第 11 章 工程实践

本章选取以图结构与遍历为核心的工程场景；路由协议与地图导航（Dijkstra、Bellman-Ford、A* 的工程化）见姊妹篇第 10 章。

### 11.1 社交网络分析

社交网络天然是图结构：顶点为用户，边为好友/关注关系。常见任务：

- **社区发现**：Louvain、Girvan-Newman 等算法基于模块度最大化识别社区；
- **影响力最大化**：贪心选择影响力传播最大的种子节点；
- **链路预测**：基于共同邻居、Jaccard 系数预测潜在好友。

```python
def common_neighbors(graph, u, v):
    """共同邻居数（链路预测特征）

    参数:
        graph: 邻接表表示的无向图 dict[int, list[int]]
        u, v: 待预测的顶点对

    返回:
        int: 共同邻居数量
    """
    return len(set(graph[u]) & set(graph[v]))

def jaccard_coefficient(graph, u, v):
    """Jaccard 系数（共同邻居占并集比例）"""
    union = set(graph[u]) | set(graph[v])
    if not union:
        return 0.0
    return len(set(graph[u]) & set(graph[v])) / len(union)

def adamic_adar(graph, u, v):
    """Adamic-Adar 指数（对共同邻居的度数取对数惩罚）"""
    import math
    common = set(graph[u]) & set(graph[v])
    return sum(1.0 / math.log(len(graph[w])) for w in common if len(graph[w]) > 1)
```

### 11.2 推荐系统与图嵌入

现代推荐系统将用户、物品、标签建模为二分图或多部图，通过图神经网络（GNN）学习顶点嵌入：

- **协同过滤**：用户-物品二分图上的随机游走预测缺失评分；
- **图卷积网络（GCN）**：通过邻接矩阵归一化聚合邻居特征；
- **PinSage / GraphSAGE**：采样子图 + 聚合函数（mean/LSTM/pool），支持归纳式学习；
- **知识图谱推荐**：将用户兴趣路径（如 User→Click→Item→Attribute）输入 R-GCN 学习关系感知嵌入。

```python
import random
def random_walk(graph, start, length, restart_prob=0.15):
    """带重启的随机游走（Personalized PageRank 近似）

    参数:
        graph: 邻接表 dict[int, list[int]]
        start: 起始顶点
        length: 游走步数
        restart_prob: 重启概率

    返回:
        list[int]: 游走路径
    """
    path = [start]
    current = start
    for _ in range(length):
        if random.random() < restart_prob or not graph[current]:
            current = start
        else:
            current = random.choice(graph[current])
        path.append(current)
    return path

def deepwalk_embedding(graph, walks_per_node=10, walk_length=40, dim=128):
    """DeepWalk 简化版：随机游走生成序列后送入 Word2Vec

    返回:
        dict: 顶点 ID -> 嵌入向量（此处省略 Word2Vec 训练步骤）
    """
    walks = []
    for node in graph:
        for _ in range(walks_per_node):
            walks.append(random_walk(graph, node, walk_length))
    # 实际工程中调用 gensim.Word2Vec(walks, vector_size=dim, window=5, workers=4)
    return walks
```

### 11.3 依赖解析与构建系统

软件构建系统（Make、Bazel、CMake）与包管理器（npm、pip、cargo）使用 DAG 表示任务依赖，拓扑排序确定构建顺序：

- **Makefile**：通过目标-依赖关系构建 DAG，`make -j N` 并行执行无依赖任务；
- **Bazel**：基于 BUILD 文件构建依赖图，支持增量构建与远程缓存；
- **npm/pnpm**：通过 `package.json` 的 `dependencies` 字段构建依赖树，循环依赖检测避免死锁。

```python
from collections import defaultdict, deque
def detect_circular_dependency(packages):
    """检测 npm 包依赖图中的循环依赖

    参数:
        packages: dict[package_name, list[dep_name]]

    返回:
        list or None: 环上顶点序列，无环返回 None
    """
    WHITE, GRAY, BLACK = 0, 1, 2
    color = {p: WHITE for p in packages}
    parent = {p: None for p in packages}
    cycle = []

    def dfs(u):
        color[u] = GRAY
        for v in packages.get(u, []):
            if v not in color:
                continue
            if color[v] == GRAY:
                # 发现回边，重构环
                node, cyc = u, [v]
                while node != v and node is not None:
                    cyc.append(node)
                    node = parent[node]
                cyc.append(v)
                return list(reversed(cyc))
            if color[v] == WHITE:
                parent[v] = u
                result = dfs(v)
                if result:
                    return result
        color[u] = BLACK
        return None

    for p in packages:
        if color[p] == WHITE:
            result = dfs(p)
            if result:
                return result
    return None
```

### 11.4 数据库查询优化

关系数据库的查询优化器将 SQL 查询计划建模为图：

- **连接顺序优化**：多表 JOIN 等价于在查询图上寻找最小成本连接树（NP-hard，常用动态规划或贪心）；
- **传递闭包**：递归 CTE 利用 SCC 或 Floyd-Warshall 计算传递闭包，支持组织架构、好友关系查询；
- **图数据库**：Neo4j、JanusGraph 等原生图数据库使用邻接表存储 + 索引自由邻接遍历，O(1) 边扩展避免关系数据库的 JOIN 雪崩。其中传递闭包所需的 Floyd-Warshall 实现见[最短路与最小生成树](/algorithm/115-ShortestPathAndMST)第 5 章。

## 第 12 章 案例研究

本章通过五个工业级案例展示图模型的实际形态；涉及的遍历机制见第 5-7 章，最短路相关工程场景见姊妹篇第 10 章。

### 12.1 Google PageRank 算法

PageRank 是 Google 创始人 Larry Page 与 Sergey Brin 于 1998 年提出的网页排名算法，将互联网建模为有向图（顶点为网页，边为超链接），通过随机游走平稳分布衡量页面重要性。

**形式化定义**：设 $G = (V, E)$ 为有向图，$d \in (0, 1)$ 为阻尼因子（通常取 0.85），$N(u)$ 为 $u$ 的出邻居集合，则 PageRank 向量 $\mathbf{R}$ 满足：

$$
R(u) = \frac{1 - d}{|V|} + d \sum_{v \in \text{In}(u)} \frac{R(v)}{|N(v)|}
$$

其矩阵形式为 $\mathbf{R} = \dfrac{1-d}{|V|} \mathbf{1} + d \cdot \mathbf{M} \mathbf{R}$，其中 $\mathbf{M}$ 为列归一化的邻接矩阵。幂迭代法在 $O(|V| + |E|)$ 每次迭代下收敛至平稳分布。

```python
def pagerank(graph, num_vertices, damping=0.85, max_iter=100, tol=1e-6):
    """PageRank 幂迭代实现

    参数:
        graph: 邻接表 dict[u, list[v]] 表示有向边 u -> v
        num_vertices: 顶点总数
        damping: 阻尼因子，默认 0.85
        max_iter: 最大迭代次数
        tol: 收敛阈值（L1 范数）

    返回:
        dict: 顶点 ID -> PageRank 值
    """
    pr = {v: 1.0 / num_vertices for v in range(num_vertices)}
    out_degree = {v: len(graph.get(v, [])) for v in range(num_vertices)}

    for _ in range(max_iter):
        new_pr = {v: (1 - damping) / num_vertices for v in range(num_vertices)}
        # 处理悬挂节点（出度为 0）的 PR 均匀分配
        dangling_sum = sum(pr[v] for v in range(num_vertices) if out_degree[v] == 0)
        for v in range(num_vertices):
            new_pr[v] += damping * dangling_sum / num_vertices
        # 正常边传播
        for u in range(num_vertices):
            if out_degree[u] == 0:
                continue
            share = damping * pr[u] / out_degree[u]
            for v in graph.get(u, []):
                new_pr[v] += share
        # 收敛判定
        diff = sum(abs(new_pr[v] - pr[v]) for v in range(num_vertices))
        pr = new_pr
        if diff < tol:
            break
    return pr
```

**工程要点**：

- 悬挂节点（dangling node）的 PR 值需均匀重分配，否则会"泄漏"概率；
- 实际工程中 Google 使用 MapReduce 并行化迭代，每次迭代处理数十亿顶点；
- Personalized PageRank 将重启分布从均匀分布替换为用户偏好向量，应用于推荐系统。

### 12.2 Git 的 DAG 模型

Git 内容寻址存储基于有向无环图（DAG）：

- **Commit DAG**：每个 commit 指向父 commit（merge commit 有多个父节点），形成 DAG；
- **Tree 对象**：每个 commit 指向一个根 tree，tree 递归包含子 tree 与 blob；
- **分支与标签**：分支是指向 commit 的可变指针，标签是不可变指针。

```mermaid
graph TB
    accTitle: Git Commit DAG 示例
    accDescr: 显示 main 与 feature 分支的合并历史，C5 为 merge commit 含两个父节点

    C1[commit C1] --> C0[commit C0]
    C2[commit C2] --> C1
    C3[commit C3] --> C2
    C4[commit C4 main] --> C3
    F1[commit F1 feature] --> C2
    F2[commit F2] --> F1
    C5[commit C5 merge] --> C4
    C5 --> F2
    M[main] --> C4
    H[HEAD] --> M

    style C5 fill:#f66,color:#fff
    style M fill:#6f6,color:#fff
    style H fill:#66f,color:#fff
```

**关键操作复杂度**：

- `git log`：DFS 遍历 commit DAG，按时间戳排序输出 $O(|V| + |E|)$；
- `git merge`：寻找两分支的最近公共祖先（LCA），在 DAG 上等价于多源 BFS；
- `git rebase`：将一系列 commit 在新基点上重放，需保持拓扑序；
- `git blame`：对每行代码反向追溯历史，使用路径分割算法（path splitting）定位引入 commit。

### 12.3 Docker 镜像分层与依赖

Docker 镜像由多个只读层（layer）组成，每层对应 Dockerfile 中的一条指令，层之间形成有向无环图：

- **基础层**：`FROM ubuntu:22.04` 拉取基础镜像层；
- **指令层**：`RUN`、`COPY`、`ADD` 各产生新层，挂载在父层之上；
- **多阶段构建**：`FROM ... AS builder` + `COPY --from=builder` 形成跨阶段依赖；
- **层缓存**：未变更的层在 `docker build` 时复用，通过 DAG 拓扑序判断可复用前缀。

```python
def docker_layer_reuse(layers_new, layers_cached):
    """Docker 层缓存复用判定

    参数:
        layers_new: 新构建指令列表 [instruction_str]
        layers_cached: 已缓存指令列表 [instruction_str]

    返回:
        int: 可复用的前缀长度
    """
    reuse_count = 0
    for new_inst, cached_inst in zip(layers_new, layers_cached):
        if new_inst == cached_inst:
            reuse_count += 1
        else:
            break
    return reuse_count
```

### 12.4 社交网络好友推荐

微信、LinkedIn 等平台基于图算法推荐"你可能认识的人"：

```python
from collections import defaultdict
def friend_recommendation(graph, user, top_k=10):
    """基于二度好友的好友推荐

    参数:
        graph: 邻接表 dict[user_id, list[friend_id]]
        user: 目标用户
        top_k: 返回推荐数

    返回:
        list[(candidate, score)]: 按共同好友数降序
    """
    friends = set(graph[user])
    candidates = defaultdict(int)
    for f in friends:
        for ff in graph.get(f, []):
            if ff != user and ff not in friends:
                candidates[ff] += 1
    # 按共同好友数排序，ties 按 ID 升序
    ranked = sorted(candidates.items(), key=lambda x: (-x[1], x[0]))
    return ranked[:top_k]
```

### 12.5 编译器 SSA 与支配树

编译器静态单赋值（SSA）形式构建依赖支配树（Dominator Tree），支配树本质上是控制流图的特殊生成树：

- **支配关系**：节点 $d$ 支配 $n$ 当且仅当从入口到 $n$ 的每条路径都经过 $d$；
- **直接支配者**：最接近 $n$ 的真支配者，记为 idom(n)；
- **Lengauer-Tarjan 算法**：$O(|V| + |E| \alpha(|V|, |E|))$ 近似线性时间构建支配树；
- **支配前沿**：SSA 构造中插入 $\phi$ 函数的位置依据支配前沿计算。

## 第 13 章 习题与自测

本章习题聚焦表示与遍历；Dijkstra 复杂度填空与 Dijkstra、Kruskal 代码修正题见[最短路与最小生成树](/algorithm/115-ShortestPathAndMST)第 11 章。

### 13.1 填空题知识点讲解

**习题 1（ex-graph-fb-01，记忆）**：在含 $V$ 个顶点、$E$ 条边的无向图邻接表表示中，存储空间复杂度为 ____。

**解析讲解**：$O(V + E)$

**解析讲解**：邻接表为每个顶点维护一个链表头（共 $V$ 项），每条无向边 $(u, v)$ 在 $u$ 与 $v$ 的链表中各存一次（共 $2E$ 项），故总空间为 $\Theta(V + E)$。对比邻接矩阵 $\Theta(V^2)$，稀疏图（$E \ll V^2$）下邻接表节省空间显著。

---

**习题 3（ex-graph-fb-03，理解）**：Tarjan 强连通分量算法中，顶点 $u$ 成为 SCC 根的判定条件是 ____。

**解析讲解**：`dfn[u] == low[u]`

**解析讲解**：`dfn[u]` 是 $u$ 在 DFS 中的发现时间，`low[u]` 是 $u$ 通过至多一条回边或树边能回溯到的最早祖先的 `dfn`。当 `dfn[u] == low[u]` 时，$u$ 无法回溯到更早的顶点，故 $u$ 是其所在 SCC 的根，此时弹栈至 $u$ 即得一个 SCC。

## 第 14 章 参考文献

1. **Cormen, T. H., Leiserson, C. E., Rivest, R. L., & Stein, C.** (2022). _Introduction to Algorithms_ (4th ed.). MIT Press.  
   — 简称 CLRS 4th，本领域权威教材，覆盖图算法全部核心内容，第 20-26 章详述 BFS/DFS/MST/单源/全源最短路/最大流。

2. **Knuth, D. E.** (1997). _The Art of Computer Programming, Volume 1: Fundamental Algorithms_ (3rd ed.). Addison-Wesley Professional.  
   — TAOCP Vol 1，第 2 章系统讲解链表与图遍历，第 2.3 节给出树的 DFS 形式化分析。

3. **Bondy, J. A., & Murty, U. S. R.** (2008). _Graph Theory_ (Graduate Texts in Mathematics 244). Springer.  
   — 研究生教材权威，覆盖图论基础、连通性、平面图、着色、极值图论。

4. **West, D. B.** (2001). _Introduction to Graph Theory_ (2nd ed.). Prentice Hall.  
   — 本科高年级/研究生教材，证明风格严谨，习题丰富。

5. **Euler, L.** (1741). Solutio problematis ad geometriam situs pertinentis. _Commentarii Academiae Scientiarum Petropolitanae_, 8, 128-140.  
   — 图论开山之作，解决柯尼斯堡七桥问题，奠定图论学科基础。

6. **Tarjan, R. E.** (1972). Depth-first search and linear graph algorithms. _SIAM Journal on Computing_, 1(2), 146-160. https://doi.org/10.1137/0201010  
    — DFS 线性时间算法奠基之作，涵盖 SCC、拓扑排序、双连通分量。

7. **Kosaraju, S. R.** (1978). Traversing directed graphs in lexicographic order. In _Conference Record of the Ninth Annual ACM Symposium on Theory of Computing_ (pp. 178-182).  
    — Kosaraju SCC 算法，两次 DFS 识别强连通分量。

8. **Page, L., Brin, S., Motwani, R., & Winograd, T.** (1999). _The PageRank citation ranking: Bringing order to the web_ (Technical Report 1999-66). Stanford InfoLab.  
    — Google 搜索引擎核心算法，PageRank 在图上的随机游走。

9. **CP-Algorithms Contributors.** (2024). _Graph Algorithms — CP-Algorithms_. Retrieved December 1, 2024, from https://cp-algorithms.com/graph/  
    — 竞赛算法社区维护的图算法参考，包含工程实现细节与边界条件处理。

10. **Sedgewick, R., & Wayne, K.** (2011). _Algorithms_ (4th ed.). Addison-Wesley Professional.  
    — Java 实现丰富，图算法可视化直观。

11. **Kleinberg, J., & Tardos, É.** (2006). _Algorithm Design_. Pearson.  
    — 算法设计技巧与图论建模案例丰富，第 3-7 章覆盖图算法核心。

12. **Dasgupta, S., Papadimitriou, C. H., & Vazirani, U. V.** (2006). _Algorithms_. McGraw-Hill.  
    — Berkeley 教材，证明简洁，适合本科入门。

注：Dijkstra (1959)、Kruskal (1956)、Prim (1957)、Bellman (1958)、Floyd (1962)、Warshall (1962) 的原始文献见[最短路与最小生成树](/algorithm/115-ShortestPathAndMST)第 12 章。

## 第 15 章 延伸阅读

本章提供图算法的进阶学习路径，按主题分类推荐相关模块与外部资源。拆分后的姊妹篇[最短路与最小生成树](/algorithm/115-ShortestPathAndMST)与深水篇（250、260、270）的资源索引见各篇文末。

### 15.1 关联模块

以下 FANDEX 模块与本图算法文档存在强关联，建议结合学习：

1. **algorithm/动态规划**：图算法中大量使用 DP 思想，如 Floyd-Warshall、DAG 最长路径、TSP 状压 DP、Bellman-Ford 的迭代松弛本质上是 DP。
2. **algorithm/网络流**：最大流（Ford-Fulkerson、Dinic、Push-Relabel）、最小割、二分图匹配（匈牙利算法、Hopcroft-Karp）、费用流是图算法的高级主题。
3. **algorithm/字符串算法**：后缀自动机、AC 自动机等结构本质上是状态图上的算法，与图遍历、SCC 等技术相通。
4. **algorithm/搜索算法**：BFS/DFS 是搜索算法的基础，A*、IDA*、双向 BFS 是图搜索的启发式扩展。
5. **algorithm/贪心算法**：Dijkstra、Kruskal、Prim 均基于贪心策略，贪心选择性质与最优子结构是其正确性保证。
6. **algorithm/分治算法**：分治在图算法中应用较少，但最近点对、平面图判定等问题使用分治策略。
7. **math/离散数学**：图论的形式化基础（集合、关系、二元关系、等价关系、偏序关系）来自离散数学。

### 15.2 进阶主题

掌握本档核心内容后，建议继续研读以下进阶主题：

- **网络流与匹配**：最大流最小割定理、Dinic 算法、Push-Relabel、二分图最大匹配（Hungarian、Hopcroft-Karp）、一般图匹配（Edmonds Blossom 算法）；
- **高级最短路径**：Johnson 算法（全源 + 稀疏图）、Contraction Hierarchies（道路网工程加速）、ALT 算法（A* + Landmark）；
- **图着色与平面图**：四色定理、平面图判定（Kuratowski 定理）、Hopcroft-Tarjan 平面性测试线性算法；
- **随机化图算法**：Karger 最小割随机算法、随机化 MST、Monte Carlo 连通性判定；
- **图神经网络（GNN）**：GCN、GraphSAGE、GAT、GIN 等深度学习模型，将图算法与神经网络结合，应用于推荐、药物发现、社交分析。

### 15.3 算法竞赛资源

- **Codeforces**：图论专题（Graphs、Shortest Paths、Trees、Flows），按难度分级训练；
- **AtCoder**：Regular Contest 中图论题难度梯度合理，适合系统训练；
- **USACO**：美国信息学奥赛官方题库，图论题覆盖基础至进阶；
- **洛谷**：中文社区图论题单，含详细题解与标签筛选；
- **CP-Algorithms**（https://cp-algorithms.com/）：算法竞赛百科，图算法章节覆盖面广且实现规范。

### 15.4 学术会议与期刊

- **SODA**（ACM-SIAM Symposium on Discrete Algorithms）：图算法顶级会议；
- **STOC / FOCS**：理论计算机科学顶会，含图论复杂度与图算法；
- **Journal of the ACM**（JACM）：理论期刊，发表图论与算法基础性成果；
- **SIAM Journal on Computing**（SICOMP）：Tarjan 1972 DFS 算法发表于此；
- **Algorithmica**：算法工程与实验研究期刊。

### 15.5 推荐学习路径

针对不同背景的读者，推荐以下学习路径（"本篇"指本篇《图算法：表示与遍历》，"姊妹篇"指[最短路与最小生成树](/algorithm/115-ShortestPathAndMST)）：

**初学者路径（无图论基础）**：

1. 阅读 West《Introduction to Graph Theory》第 1-4 章建立图论直觉
2. 学习本篇第 3-5 章（形式化定义、表示、BFS/DFS）
3. 学习姊妹篇第 2-4 章（松弛、Dijkstra、Bellman-Ford）
4. 完成本篇第 13 章与姊妹篇第 11 章的习题
5. 在 CP-Algorithms 上对应章节阅读工程实现

**进阶路径（有图论基础）**：

1. 学习本篇第 6-7 章（拓扑排序、SCC）与姊妹篇第 7 章（MST）
2. 阅读 CLRS 4th 第 20-26 章对照证明
3. 学习深水篇：[/algorithm/250-FloydWarshall](/algorithm/250-FloydWarshall)、[/algorithm/260-KruskalAlgorithm](/algorithm/260-KruskalAlgorithm)、[/algorithm/270-TopologicalSorting](/algorithm/270-TopologicalSorting)
4. 学习 algorithm/网络流（Ford-Fulkerson、Dinic）
5. 在 Codeforces 上训练 Graphs 专题 1800+ 难度题

**研究路径（追求理论深度）**：

1. 阅读 Bondy & Murty《Graph Theory》完整内容
2. 研读 Tarjan 1972 原始论文与 Lengauer-Tarjan 1979 支配树论文
3. 学习随机化图算法（Karger、Motwani-Raghavan 教材）
4. 阅读近期 SODA/STOC 图算法论文
5. 尝试实现 GraphSAGE / GAT 等图神经网络模型

### 15.6 社区与讨论

- **Stack Overflow [graph-algorithm] 标签**：工程实现问题；
- **Mathematics Stack Exchange [graph-theory] 标签**：理论证明问题；
- **Reddit r/compsci / r/algorithms**：算法学习讨论；
- **GitHub 算法仓库**：`keon/algorithms`（Python）、`TheAlgorithms/C-Plus-Plus`、`TheAlgorithms/Java` 提供多语言参考实现。

### 15.7 致谢

本文档由 FANDEX Content Engineering 团队编写，参考了 CLRS 4th、Bondy & Murty、CP-Algorithms 等权威资料。感谢 Leonhard Euler（图论奠基）、Edsger Dijkstra（最短路径）、Robert Tarjan（DFS 与 SCC）等先贤的奠基性工作。文档中如有疏漏或错误，欢迎在项目仓库提交 Issue 或 Pull Request。

## 读完自检

- n 个顶点、m 条边的图，邻接矩阵与邻接表各占多少空间？什么时候选矩阵？（$O(n^2)$ 对 $O(n+m)$；稠密图或需要 O(1) 查边时选矩阵）
- BFS 与 DFS 的核心数据结构分别是什么？各自的典型应用？（队列：无权最短路、层序；栈/递归：环检测、拓扑序、连通分量）
- 为什么 DFS 判环要看「灰色」节点而不是「已访问」？（指向已完成的黑色节点是交叉边不成环，指向灰色才是后向边）
- 二分图判定用哪种遍历、靠什么性质？（BFS/DFS 交替染色；图无奇环）
- 能按「顶点规模、边规模、查询类型」三问为一张真实数据选对表示与遍历。

---
