---
title: 降维
description: 'PCA 从零实现、t-SNE、UMAP、核 PCA、解释方差、重建误差'
module: 'ai-engineering'
difficulty: intermediate
tags:
  - 降维
  - PCA
  - 't-SNE'
  - UMAP
  - 核PCA
  - 解释方差
  - 可视化
related:
  - 'ai-engineering/激活函数'
  - 'ai-engineering/集成方法'
  - 'ai-engineering/矩阵变换'
  - 'ai-engineering/决策树与随机森林'
prerequisites:
  - 'ai-engineering/机器学习概述'
---

# 降维

> 高维数据是看不见的。降维让它变得可见，同时保留最重要的结构。

**类型：** 构建
**语言：** Python
**前置条件：** 阶段 1，第 01-03 课
**预计时间：** ~90 分钟

## 学习目标

- 从零实现 PCA，使用特征值分解和 SVD 两种方法
- 计算解释方差比，选择保留足够信息的主成分数量
- 应用 t-SNE 和 UMAP 进行高维数据的 2D 可视化
- 实现核 PCA 处理非线性结构

## 问题所在

你的数据有 1000 个特征。你无法可视化它。很多特征是冗余的。模型在高维空间中训练慢且容易过拟合。你需要压缩数据，保留最重要的信息。

## 核心概念

### PCA：线性降维

PCA 找到数据方差最大的方向，将数据投影到这些方向上。

```python
import numpy as np

def pca(X, n_components):
    """从零实现 PCA"""
    # 中心化
    X_centered = X - X.mean(axis=0)

    # 协方差矩阵
    cov = (X_centered.T @ X_centered) / (len(X) - 1)

    # 特征值分解
    eigenvalues, eigenvectors = np.linalg.eigh(cov)

    # 按特征值降序排列
    idx = np.argsort(eigenvalues)[::-1]
    eigenvalues = eigenvalues[idx]
    eigenvectors = eigenvectors[:, idx]

    # 选择前 n_components 个主成分
    components = eigenvectors[:, :n_components]

    # 投影
    X_pca = X_centered @ components

    # 解释方差比
    explained_var = eigenvalues / eigenvalues.sum()

    return X_pca, components, explained_var

# 示例
np.random.seed(42)
X = np.random.randn(200, 10)
X_pca, components, var_ratio = pca(X, 2)

print(f"原始维度: {X.shape}")
print(f"降维后: {X_pca.shape}")
print(f"前2个主成分解释方差: {var_ratio[:2].sum():.2%}")
```

### 解释方差

解释方差比告诉你每个主成分保留了多少信息。

```python
cumulative_var = np.cumsum(var_ratio)
n_95 = np.argmax(cumulative_var >= 0.95) + 1
print(f"保留 95% 方差需要 {n_95} 个主成分")
```

### 重建误差

降维后可以重建原始数据，重建误差衡量信息损失。

```python
X_reconstructed = X_pca @ components.T + X.mean(axis=0)
reconstruction_error = np.mean((X - X_reconstructed) ** 2)
print(f"重建误差: {reconstruction_error:.4f}")
```

### t-SNE：非线性可视化

t-SNE 专门用于 2D/3D 可视化。它保持局部邻域结构。

```python
from sklearn.manifold import TSNE

tsne = TSNE(n_components=2, perplexity=30, random_state=42)
X_tsne = tsne.fit_transform(X)
print(f"t-SNE 结果: {X_tsne.shape}")
```

t-SNE 的关键参数：

- **perplexity**：控制局部邻域大小（通常 5-50）
- **注意**：t-SNE 不保留全局结构，不同运行可能产生不同结果

### UMAP

UMAP 比 t-SNE 更快，保留更多全局结构。

```python
from umap import UMAP

reducer = UMAP(n_components=2, n_neighbors=15, min_dist=0.1)
X_umap = reducer.fit_transform(X)
print(f"UMAP 结果: {X_umap.shape}")
```

### 核 PCA

核 PCA 使用核技巧处理非线性结构。

```python
from sklearn.decomposition import KernelPCA

kpca = KernelPCA(n_components=2, kernel="rbf", gamma=10)
X_kpca = kpca.fit_transform(X)
print(f"核 PCA 结果: {X_kpca.shape}")
```

## 方法比较

| 方法   | 线性/非线性 | 适用于       | 速度 | 保持全局结构 |
| ------ | ----------- | ------------ | ---- | ------------ |
| PCA    | 线性        | 降维，去噪   | 快   | 是           |
| 核 PCA | 非线性      | 非线性结构   | 中   | 部分         |
| t-SNE  | 非线性      | 可视化       | 慢   | 否           |
| UMAP   | 非线性      | 可视化，降维 | 中   | 是           |

## 实际应用

| 方法     | AI 中的位置                |
| -------- | -------------------------- |
| PCA      | 数据预处理，特征压缩，去噪 |
| t-SNE    | Embedding 可视化，聚类验证 |
| UMAP     | 大规模可视化，特征工程     |
| 解释方差 | 选择降维维度               |

## 练习

1. 对 MNIST 数据（或合成数据）运行 PCA，绘制解释方差累积曲线
2. 用 PCA 将数据降到 2D，重建，计算重建误差随维度变化的曲线
3. 对同一数据集运行 t-SNE 和 UMAP，比较可视化结果
4. 生成非线性结构数据（如同心圆），比较 PCA 和核 PCA 的效果
