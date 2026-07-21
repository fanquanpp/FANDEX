---
order: 19
title: 降维算法
module: 'machine-learning'
category: data
difficulty: advanced
description: 'PCA、t-SNE、UMAP降维原理、数学推导与应用场景对比。'
author: fanquanpp
updated: '2026-06-14'
related:
  - 'machine-learning/集成学习'
  - 'machine-learning/聚类算法'
  - 'machine-learning/模型评估与选择'
  - 'machine-learning/特征工程详解'
prerequisites: []
---

## 1. 降维问题概述

降维是将高维数据映射到低维空间，同时尽可能保留原始数据的重要信息。

### 1.1 降维动机

| 动机       | 说明                             |
| :--------- | :------------------------------- |
| 维度灾难   | 高维空间数据稀疏，距离区分度下降 |
| 可视化     | 人类只能理解2D/3D空间            |
| 去噪       | 去除冗余和噪声维度               |
| 加速计算   | 减少特征数量降低计算开销         |
| 缓解过拟合 | 减少模型参数                     |

### 1.2 降维方法分类

| 类型       | 方法        | 特点               |
| :--------- | :---------- | :----------------- |
| 线性降维   | PCA         | 全局结构、速度快   |
| 非线性降维 | t-SNE、UMAP | 局部结构、可视化好 |
| 流形学习   | Isomap、LLE | 保持流形结构       |
| 自编码器   | AE、VAE     | 深度学习方法       |

## 2. PCA主成分分析

### 2.1 数学推导

**目标**：找到正交变换 $\mathbf{W}$，使投影后的方差最大化：

$$\mathbf{Z} = \mathbf{X}\mathbf{W}$$

**第一步**：数据中心化

$$\mathbf{X}_{centered} = \mathbf{X} - \bar{\mathbf{X}}$$

**第二步**：最大化投影方差

第一个主成分 $\mathbf{w}_1$：

$$\max_{\mathbf{w}_1} \text{Var}(\mathbf{X}\mathbf{w}_1) = \max_{\mathbf{w}_1} \mathbf{w}_1^T \mathbf{S} \mathbf{w}_1 \quad \text{s.t.} \quad \|\mathbf{w}_1\| = 1$$

其中 $\mathbf{S} = \frac{1}{n}\mathbf{X}^T\mathbf{X}$ 为协方差矩阵。

**第三步**：拉格朗日乘子法

$$\mathbf{S}\mathbf{w}_1 = \lambda_1 \mathbf{w}_1$$

即 $\mathbf{w}_1$ 是 $\mathbf{S}$ 的**特征向量**，$\lambda_1$ 是对应特征值。

**结论**：PCA 的主成分就是协方差矩阵的**特征向量**，按特征值从大到小排列。

### 2.2 方差解释比

第 $k$ 个主成分的方差解释比：

$$\text{Ratio}_k = \frac{\lambda_k}{\sum_{j=1}^d \lambda_j}$$

累计方差解释比：

$$\text{CumRatio}(m) = \frac{\sum_{k=1}^m \lambda_k}{\sum_{j=1}^d \lambda_j}$$

通常选择 $m$ 使累计解释比达到 $85\% \sim 95\%$。

### 2.3 PCA计算方法

| 方法       | 复杂度                | 适用场景   |
| :--------- | :-------------------- | :--------- |
| 特征值分解 | $O(d^3)$              | $d < n$    |
| SVD        | $O(\min(n^2d, nd^2))$ | 通用       |
| 随机SVD    | $O(nd \cdot k)$       | 大规模数据 |

**SVD方法**：

$$\mathbf{X} = \mathbf{U}\boldsymbol{\Sigma}\mathbf{V}^T$$

- $\mathbf{V}$ 的列即为主成分方向
- $\boldsymbol{\Sigma}$ 的对角元素与特征值的关系：$\lambda_k = \sigma_k^2 / n$

### 2.4 PCA应用

```python
from sklearn.decomposition import PCA

pca = PCA(n_components=0.95)  # 保留95%方差
X_reduced = pca.fit_transform(X)

print(f"原始维度: {X.shape[1]}")
print(f"降维后维度: {X_reduced.shape[1]}")
print(f"方差解释比: {pca.explained_variance_ratio_}")
```

## 3. t-SNE

### 3.1 算法原理

t-SNE（t-Distributed Stochastic Neighbor Embedding）通过**保持局部邻域结构**实现降维可视化。

**高维空间相似度**（高斯分布）：

$$p_{j|i} = \frac{\exp(-\|x_i - x_j\|^2 / 2\sigma_i^2)}{\sum_{k \neq i}\exp(-\|x_i - x_k\|^2 / 2\sigma_i^2)}$$

**对称化**：

$$p_{ij} = \frac{p_{j|i} + p_{i|j}}{2n}$$

**低维空间相似度**（Student-t分布，自由度1即柯西分布）：

$$q_{ij} = \frac{(1 + \|y_i - y_j\|^2)^{-1}}{\sum_{k \neq l}(1 + \|y_k - y_l\|^2)^{-1}}$$

**目标**：最小化KL散度：

$$C = \text{KL}(P \| Q) = \sum_{i \neq j} p_{ij} \log \frac{p_{ij}}{q_{ij}}$$

### 3.2 为什么用t分布？

- 高维空间中，高斯分布的**短尾**导致中等距离的点在低维中被挤压
- t分布的**长尾**允许中等距离的点在低维中推得更远
- 缓解**拥挤问题**

### 3.3 困惑度（Perplexity）

$$\text{Perp}(P_i) = 2^{H(P_i)}$$

其中 $H(P_i) = -\sum_j p_{j|i} \log_2 p_{j|i}$ 为信息熵。

- 困惑度可理解为"有效近邻数"
- 典型值：5~50
- 困惑度越大，关注越全局的结构

### 3.4 t-SNE注意事项

- **不可用于特征工程**：t-SNE不保持全局距离和簇间关系
- **不可增量**：新数据需要重新运行
- **随机性**：不同运行可能产生不同结果
- **超参数敏感**：困惑度、学习率、迭代次数影响结果
- **簇大小不可比较**：t-SNE会膨胀密集簇、压缩稀疏簇

## 4. UMAP

### 4.1 算法原理

UMAP（Uniform Manifold Approximation and Projection）基于**拓扑数据分析**和**黎曼几何**。

**步骤1**：构建模糊拓扑表示

高维空间中的局部相似度：

$$p_{j|i} = \exp\left(-\frac{d(x_i, x_j) - \rho_i}{\sigma_i}\right)$$

其中 $\rho_i = \min_j d(x_i, x_j)$ 为最近邻距离。

**步骤2**：对称化

$$p_{ij} = p_{j|i} + p_{i|j} - p_{j|i} \cdot p_{i|j}$$

**步骤3**：优化低维嵌入

最小化交叉熵：

$$C = \sum_{(i,j)} \left[-p_{ij}\log q_{ij} - (1-p_{ij})\log(1-q_{ij})\right]$$

### 4.2 UMAP vs t-SNE

| 维度       | UMAP                  | t-SNE         |
| :--------- | :-------------------- | :------------ |
| 速度       | 快10~100倍            | 慢            |
| 可扩展维度 | 可降至>2维            | 主要用于2D/3D |
| 全局结构   | 较好保持              | 较差          |
| 增量学习   | 支持（transform）     | 不支持        |
| 理论基础   | 拓扑学                | 概率论        |
| 簇间距离   | 有意义                | 不可比较      |
| 参数       | n_neighbors, min_dist | perplexity    |

### 4.3 UMAP参数

| 参数           | 说明               | 典型值           |
| :------------- | :----------------- | :--------------- |
| `n_neighbors`  | 局部vs全局结构平衡 | 5~50             |
| `min_dist`     | 嵌入点最小距离     | 0.001~0.5        |
| `n_components` | 目标维度           | 2~100            |
| `metric`       | 距离度量           | euclidean/cosine |

## 5. 降维方法选择指南

| 场景          | 推荐方法   | 原因                 |
| :------------ | :--------- | :------------------- |
| 特征工程/去噪 | PCA        | 线性、可解释、快速   |
| 数据可视化    | t-SNE/UMAP | 非线性、保持局部结构 |
| 大规模数据    | PCA/UMAP   | 计算效率高           |
| 保持全局结构  | UMAP       | 全局+局部兼顾        |
| 在线/增量     | PCA/UMAP   | 支持增量变换         |
| 类别特征      | FAMD/MCA   | 专为混合类型设计     |
