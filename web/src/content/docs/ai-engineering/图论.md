---
title: 图论
description: 邻接矩阵、BFS/DFS、图拉普拉斯矩阵、谱聚类、消息传递（GNN）
module: 'ai-engineering'
difficulty: intermediate
tags:
  - 图论
  - 邻接矩阵
  - BFS
  - DFS
  - 图拉普拉斯
  - 谱聚类
  - GNN
  - 消息传递
related:
  - 'ai-engineering/投机解码推理服务器'
  - 'ai-engineering/凸优化'
  - 'ai-engineering/推理平台经济学'
  - 'ai-engineering/推理指标体系'
prerequisites:
  - 'ai-engineering/机器学习概述'
---

# 图论

> 图是关系的数据结构。社交网络、分子结构、知识图谱——它们都是图。

**类型：** 构建
**语言：** Python
**前置条件：** 阶段 1，第 01-02 课
**预计时间：** ~90 分钟

## 学习目标

- 使用邻接矩阵和邻接表表示图
- 实现 BFS 和 DFS 遍历算法
- 计算图拉普拉斯矩阵并解释其特征值
- 从零实现谱聚类
- 实现消息传递机制（图神经网络的核心）

## 问题所在

很多数据天然是图结构：社交网络、引用网络、分子结构、知识图谱。传统神经网络无法处理这种不规则结构。图神经网络（GNN）通过消息传递机制在图上传播信息。

## 核心概念

### 图的表示

```python
import numpy as np

# 邻接矩阵
adj_matrix = np.array([
    [0, 1, 1, 0, 0],
    [1, 0, 1, 1, 0],
    [1, 1, 0, 0, 1],
    [0, 1, 0, 0, 1],
    [0, 0, 1, 1, 0]
])

# 邻接表
adj_list = {
    0: [1, 2],
    1: [0, 2, 3],
    2: [0, 1, 4],
    3: [1, 4],
    4: [2, 3]
}
```

### BFS 和 DFS

```python
from collections import deque

def bfs(graph, start):
    """广度优先搜索"""
    visited = set()
    queue = deque([start])
    order = []

    while queue:
        node = queue.popleft()
        if node not in visited:
            visited.add(node)
            order.append(node)
            for neighbor in graph[node]:
                if neighbor not in visited:
                    queue.append(neighbor)

    return order

def dfs(graph, start):
    """深度优先搜索"""
    visited = set()
    order = []

    def _dfs(node):
        visited.add(node)
        order.append(node)
        for neighbor in graph[node]:
            if neighbor not in visited:
                _dfs(neighbor)

    _dfs(start)
    return order

print(f"BFS: {bfs(adj_list, 0)}")
print(f"DFS: {dfs(adj_list, 0)}")
```

### 图拉普拉斯矩阵

图拉普拉斯矩阵 L = D - A，其中 D 是度矩阵，A 是邻接矩阵。

```python
def graph_laplacian(adj_matrix):
    """计算图拉普拉斯矩阵"""
    D = np.diag(adj_matrix.sum(axis=1))
    L = D - adj_matrix
    return L

L = graph_laplacian(adj_matrix)
eigenvalues, eigenvectors = np.linalg.eigh(L)

print(f"拉普拉斯特征值: {np.sort(eigenvalues)}")
# 0 的数量 = 连通分量数
n_components = np.sum(eigenvalues < 1e-10)
print(f"连通分量数: {n_components}")
```

拉普拉斯特征值的意义：

- 最小特征值总是 0（对应常数向量）
- 0 的数量等于连通分量数
- 第二小特征值（代数连通度）衡量图的连通性
- 小特征值对应的特征向量揭示社区结构

### 谱聚类

谱聚类使用拉普拉斯特征向量将图节点聚类。

```python
def spectral_clustering(adj_matrix, n_clusters):
    """谱聚类"""
    # 归一化拉普拉斯
    D = np.diag(adj_matrix.sum(axis=1))
    L = D - adj_matrix
    D_inv_sqrt = np.diag(1.0 / np.sqrt(adj_matrix.sum(axis=1)))
    L_norm = D_inv_sqrt @ L @ D_inv_sqrt

    # 取前 n_clusters 个特征向量
    eigenvalues, eigenvectors = np.linalg.eigh(L_norm)
    features = eigenvectors[:, :n_clusters]

    # 行归一化
    features = features / np.linalg.norm(features, axis=1, keepdims=True)

    # K-means 聚类
    from sklearn.cluster import KMeans
    kmeans = KMeans(n_clusters=n_clusters, random_state=42)
    labels = kmeans.fit_predict(features)

    return labels

labels = spectral_clustering(adj_matrix, 2)
print(f"聚类标签: {labels}")
```

### 消息传递（GNN 核心）

图神经网络通过消息传递更新节点表示。

```python
def message_passing(node_features, adj_matrix, weight_matrix):
    """
    单层消息传递
    node_features: (n_nodes, in_dim)
    adj_matrix: (n_nodes, n_nodes)
    weight_matrix: (in_dim, out_dim)
    """
    # 线性变换
    transformed = node_features @ weight_matrix

    # 聚合邻居消息
    # 归一化邻接矩阵：D^{-1/2} A D^{-1/2}
    D_inv_sqrt = np.diag(1.0 / np.sqrt(adj_matrix.sum(axis=1) + 1e-10))
    A_norm = D_inv_sqrt @ adj_matrix @ D_inv_sqrt

    # 消息传递
    aggregated = A_norm @ transformed

    # 加自环（包含自身特征）
    A_self = A_norm + np.eye(len(adj_matrix)) / (len(adj_matrix) ** 0.5)
    output = A_self @ transformed

    return output

# 示例
n_nodes = 5
in_dim = 4
out_dim = 3

features = np.random.randn(n_nodes, in_dim)
weights = np.random.randn(in_dim, out_dim)

output = message_passing(features, adj_matrix, weights)
print(f"输入: {features.shape}")
print(f"输出: {output.shape}")
```

消息传递的步骤：

1. **变换**：对每个节点的特征应用线性变换
2. **聚合**：收集邻居的变换特征（求和/平均/最大值）
3. **更新**：结合聚合消息和自身特征

## 实际应用

| 概念       | AI 中的位置                       |
| ---------- | --------------------------------- |
| 邻接矩阵   | 图数据表示                        |
| BFS/DFS    | 图遍历，最短路径                  |
| 图拉普拉斯 | 谱聚类，图分割                    |
| 谱聚类     | 社区检测，数据聚类                |
| 消息传递   | 图神经网络（GCN, GAT, GraphSAGE） |

## 练习

1. 创建一个有 10 个节点的随机图，用邻接矩阵和邻接表两种方式表示
2. 实现 BFS 找最短路径（从节点 0 到节点 9）
3. 对两个社区组成的图运行谱聚类，验证聚类结果
4. 实现两层 GNN，对 Cora 数据集（或合成图）进行节点分类
