---
title: 范数与距离
description: 'L1/L2/Lp 范数、余弦相似度、Mahalanobis 距离、Jaccard 距离、编辑距离、KL 散度、Wasserstein 距离、近似最近邻搜索'
module: 'ai-engineering'
difficulty: intermediate
tags:
  - 范数
  - 距离
  - 余弦相似度
  - Mahalanobis
  - Jaccard
  - 编辑距离
  - Wasserstein
  - ANN
related:
  - 'ai-engineering/反欺骗与音频水印'
  - 'ai-engineering/反向传播'
  - 'ai-engineering/分离预填充与解码'
  - 'ai-engineering/复数'
prerequisites:
  - 'ai-engineering/机器学习概述'
---

# 范数与距离

> 你的距离函数定义了"相似"的含义。选错了，下游一切都会崩溃。

**类型：** 构建
**语言：** Python
**前置条件：** 阶段 1，第 01-02 课
**预计时间：** ~90 分钟

## 学习目标

- 从零实现 L1、L2、余弦、Mahalanobis、Jaccard 和编辑距离函数
- 为给定 ML 任务选择合适的距离度量，解释为什么其他选择会失败
- 将 L1 和 L2 范数与 LASSO 和 Ridge 正则化及其几何约束区域联系起来
- 演示同一数据集在不同度量下产生不同的最近邻

## 问题所在

你有两个向量。也许是词嵌入，也许是用户画像，也许是像素数组。你需要知道：它们有多近？

答案完全取决于你选择哪个距离函数。两个数据点在一个度量下是最近邻，在另一个度量下可能相距甚远。你的 KNN 分类器、推荐引擎、向量数据库、聚类算法、损失函数——它们都依赖这个选择。选错了，你的模型优化了错误的东西。

没有万能的距离。L2 适合空间数据。余弦相似度主导 NLP。Jaccard 处理集合。编辑距离处理字符串。Mahalanobis 考虑相关性。Wasserstein 移动概率质量。每个都编码了关于"相似"含义的不同假设。

## 核心概念

### 范数：衡量向量大小

范数衡量向量的"大小"。两个向量之间的距离可以写成它们差的范数：d(a, b) = ||a - b||。

### L1 范数（曼哈顿距离）

L1 范数是所有分量绝对值之和。

```
||x||_1 = |x_1| + |x_2| + ... + |x_n|
```

```python
def l1_norm(x):
    return np.sum(np.abs(x))

def l1_distance(a, b):
    return l1_norm(a - b)
```

称为曼哈顿距离，因为它测量在只能沿轴线移动的城市网格上走多远。

### L2 范数（欧几里得距离）

L2 范数是所有分量平方和的平方根。

```
||x||_2 = sqrt(x_1^2 + x_2^2 + ... + x_n^2)
```

```python
def l2_norm(x):
    return np.sqrt(np.sum(x ** 2))

def l2_distance(a, b):
    return l2_norm(a - b)
```

这是最常见的距离，直觉上就是"直线距离"。

### Lp 范数

L1 和 L2 的推广：

```
||x||_p = (|x_1|^p + |x_2|^p + ... + |x_n|^p)^(1/p)
```

- p=1：曼哈顿距离
- p=2：欧几里得距离
- p→∞：切比雪夫距离（最大分量差）

### 余弦相似度

余弦相似度衡量向量方向的相似性，忽略大小。

```python
def cosine_similarity(a, b):
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

def cosine_distance(a, b):
    return 1 - cosine_similarity(a, b)
```

NLP 中最常用的相似度度量，因为词嵌入的方向比大小更重要。

### Mahalanobis 距离

考虑特征之间相关性的距离。

```python
def mahalanobis_distance(a, b, cov_inv):
    diff = a - b
    return np.sqrt(diff @ cov_inv @ diff)
```

### Jaccard 距离

衡量两个集合的不相似度。

```python
def jaccard_distance(set_a, set_b):
    intersection = len(set_a & set_b)
    union = len(set_a | set_b)
    return 1 - intersection / union

a = {1, 2, 3, 4}
b = {3, 4, 5, 6}
print(f"Jaccard 距离: {jaccard_distance(a, b):.4f}")  # 0.5714
```

### 编辑距离（Levenshtein）

将一个字符串变成另一个字符串需要的最少编辑操作数。

```python
def edit_distance(s1, s2):
    m, n = len(s1), len(s2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]

    for i in range(m + 1):
        dp[i][0] = i
    for j in range(n + 1):
        dp[0][j] = j

    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if s1[i-1] == s2[j-1]:
                dp[i][j] = dp[i-1][j-1]
            else:
                dp[i][j] = 1 + min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])

    return dp[m][n]

print(f"编辑距离('kitten', 'sitting'): {edit_distance('kitten', 'sitting')}")  # 3
```

### 范数与正则化的关系

| 范数 | 正则化 | 效果               |
| ---- | ------ | ------------------ |
| L1   | LASSO  | 稀疏解（特征选择） |
| L2   | Ridge  | 小而分散的权重     |

L1 的菱形约束区域倾向于与坐标轴相交，产生稀疏解。L2 的圆形约束区域倾向于均匀缩小权重。

### 近似最近邻（ANN）

对于大规模向量搜索，精确最近邻太慢。ANN 牺牲一点精度换取数量级的速度提升。

常用算法：HNSW、IVF、LSH。

## 距离度量选择指南

| 数据类型  | 推荐度量       | 原因               |
| --------- | -------------- | ------------------ |
| 数值向量  | L2             | 直觉清晰，优化友好 |
| 高维向量  | 余弦           | 维度灾难下 L2 失效 |
| 文本/集合 | Jaccard        | 处理集合交集       |
| 字符串    | 编辑距离       | 捕捉拼写差异       |
| 相关特征  | Mahalanobis    | 考虑协方差         |
| 概率分布  | KL/Wasserstein | 分布间的距离       |

## 练习

1. 生成 5 个随机向量，计算所有两两之间的 L1、L2 和余弦距离，观察不同度量的排名差异
2. 实现带协方差矩阵的 Mahalanobis 距离，与 L2 距离对比
3. 计算 "algorithm" 和 "altruistic" 之间的编辑距离
4. 证明 L1 正则化的约束区域是菱形，L2 是圆形
