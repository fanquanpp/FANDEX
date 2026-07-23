---
order: 16
title: K近邻
module: 'ai-engineering'
category: data
difficulty: intermediate
description: K近邻算法原理、距离度量、K值选择、KD树加速与优缺点分析。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'ai-engineering/循环神经网络'
  - 'ai-engineering/Transformer架构'
  - 'ai-engineering/生成模型'
  - 'ai-engineering/集成学习'
prerequisites: []
---

## 1. K近邻算法原理

KNN（K-Nearest Neighbors）是一种**懒惰学习**算法，不显式训练模型，而是在预测时直接利用训练数据。

### 1.1 算法流程

```
输入: 训练集 D, 查询点 x_q, 近邻数 K
输出: x_q 的预测类别/值

1. 计算 x_q 与 D 中每个样本的距离
2. 选取距离最近的 K 个样本 N_K(x_q)
3. 分类: 多数投票 → y_q = argmax Σ I(y_i = c_k)
   回归: 取均值 → y_q = (1/K) Σ y_i
```

### 1.2 投票机制

**多数投票**：

$$\hat{y} = \arg\max_{c_k} \sum_{\mathbf{x}_i \in N_K(\mathbf{x}_q)} I(y_i = c_k)$$

**距离加权投票**：

$$\hat{y} = \arg\max_{c_k} \sum_{\mathbf{x}_i \in N_K(\mathbf{x}_q)} w_i \cdot I(y_i = c_k)$$

其中 $w_i = \frac{1}{d(\mathbf{x}_q, \mathbf{x}_i)}$ 或 $w_i = \frac{1}{d(\mathbf{x}_q, \mathbf{x}_i)^2}$。

## 2. 距离度量

### 2.1 常用距离

| 距离           | 公式                                                                       | 特点           |
| :------------- | :------------------------------------------------------------------------- | :------------- |
| 欧氏距离       | $d = \sqrt{\sum_{j=1}^d (x_j - z_j)^2}$                                    | 最常用         |
| 曼哈顿距离     | $d = \sum_{j=1}^d \|x_j - z_j\|$                                           | 鲁棒性强       |
| 闵可夫斯基距离 | $d = \left(\sum_{j=1}^d \|x_j - z_j\|^p\right)^{1/p}$                      | 通用形式       |
| 切比雪夫距离   | $d = \max_j \|x_j - z_j\|$                                                 | $p \to \infty$ |
| 余弦相似度     | $\cos\theta = \frac{\mathbf{x}^T\mathbf{z}}{\|\mathbf{x}\|\|\mathbf{z}\|}$ | 方向相似性     |
| 马氏距离       | $d = \sqrt{(\mathbf{x}-\mathbf{z})^T\Sigma^{-1}(\mathbf{x}-\mathbf{z})}$   | 考虑特征相关性 |

### 2.2 距离选择原则

- **数值特征**：欧氏距离（需标准化）
- **稀疏特征**：余弦相似度
- **特征相关**：马氏距离
- **异常值多**：曼哈顿距离

### 2.3 特征标准化

KNN 对特征尺度敏感，必须进行标准化：

**Z-Score标准化**：

$$x_j' = \frac{x_j - \mu_j}{\sigma_j}$$

**Min-Max归一化**：

$$x_j' = \frac{x_j - \min_j}{\max_j - \min_j}$$

## 3. K值选择

### 3.1 K值影响

| K值   | 模型复杂度 | 过拟合风险 | 决策边界             |
| :---- | :--------- | :--------- | :------------------- |
| K=1   | 最高       | 最高       | 最复杂（碎片化）     |
| K适中 | 适中       | 适中       | 合理                 |
| K=N   | 最低       | 最低       | 最简单（全局多数类） |

### 3.2 K值选择方法

1. **交叉验证**：尝试不同K值，选择验证集准确率最高的
2. **经验法则**：$K \approx \sqrt{n}$（n为训练样本数）
3. **奇数优先**：二分类时选奇数避免平票
4. **误差率曲线**：绘制K vs 误差率，选择"肘部"

### 3.3 偏差-方差分析

$$\text{K小} \rightarrow \text{低偏差、高方差（过拟合）}$$
$$\text{K大} \rightarrow \text{高偏差、低方差（欠拟合）}$$

## 4. KD树加速

### 4.1 暴力搜索复杂度

- 训练：$O(1)$（懒惰学习）
- 预测：$O(n \cdot d)$（需计算与所有样本的距离）

### 4.2 KD树构建

KD树是一种**空间划分数据结构**，将 $d$ 维空间递归二分：

```
BuildKDTree(points, depth):
    if points为空: return null
    axis = depth % d          // 选择切分维度
    median = 中位数(points, axis)
    node.point = median
    node.left = BuildKDTree(points[axis < median], depth+1)
    node.right = BuildKDTree(points[axis ≥ median], depth+1)
    return node
```

**构建复杂度**：$O(n \log n)$

### 4.3 KD树搜索

```
KNN_Search(node, target, K):
    1. 从根节点向下搜索，找到叶节点
    2. 将叶节点加入候选集
    3. 回溯:
       - 检查另一子树是否可能包含更近的点
       - 判断条件: |target[axis] - node.point[axis]| < current_max_dist
       - 如果可能，搜索另一子树
    4. 返回最近的K个点
```

**搜索复杂度**：

- 平均：$O(\log n)$
- 最坏：$O(n)$（高维数据退化）

### 4.4 高维问题

当维度 $d > 20$ 时，KD树搜索效率急剧下降（**维度灾难**）：

$$\text{效率} \approx O(n^{1-1/d})$$

**替代方案**：

| 方法      | 适用维度  | 说明             |
| :-------- | :-------- | :--------------- |
| KD树      | $d < 20$  | 中低维精确搜索   |
| Ball Tree | $d < 100$ | 超球体划分       |
| LSH       | 高维      | 近似最近邻       |
| HNSW      | 高维      | 图索引，近似搜索 |
| IVF + PQ  | 超高维    | 倒排索引+量化    |

## 5. KNN优缺点

### 5.1 优点

- **简单直观**：无需训练过程
- **无参数假设**：对数据分布无假设
- **天然多分类**：无需扩展
- **增量学习**：新数据直接加入训练集

### 5.2 缺点

- **预测慢**：$O(n \cdot d)$ 每次预测
- **内存消耗大**：需存储全部训练数据
- **维度灾难**：高维空间距离区分度下降
- **特征尺度敏感**：必须标准化
- **不平衡数据**：多数类占优
