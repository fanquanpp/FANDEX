---
order: 73
title: 矩阵分解应用
module: 'linear-algebra'
category: 'comp-sci'
difficulty: advanced
description: 矩阵分解在机器学习中的应用，包括PCA主成分分析、推荐系统中的矩阵分解、图像压缩与SVD、线性判别分析。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'linear-algebra/QR分解'
  - 'linear-algebra/奇异值分解SVD'
prerequisites:
  - 'linear-algebra/行列式定义与几何意义'
---

## 1. 主成分分析（PCA）

### 1.1 问题背景

给定 $m$ 个 $n$ 维数据点 $\boldsymbol{x}_1, \boldsymbol{x}_2, \ldots, \boldsymbol{x}_m$，希望找到数据的低维表示，保留尽可能多的信息。

### 1.2 数学模型

1. 中心化：$\bar{\boldsymbol{x}} = \frac{1}{m}\sum_{i=1}^{m}\boldsymbol{x}_i$，$\tilde{\boldsymbol{x}}_i = \boldsymbol{x}_i - \bar{\boldsymbol{x}}$

2. 构造数据矩阵：$X = (\tilde{\boldsymbol{x}}_1, \tilde{\boldsymbol{x}}_2, \ldots, \tilde{\boldsymbol{x}}_m)^T$（$m \times n$）

3. 协方差矩阵：$C = \frac{1}{m-1}X^TX$（$n \times n$ 实对称半正定矩阵）

4. 对 $C$ 进行特征值分解：$C = V\Lambda V^T$

5. 选择前 $k$ 个最大特征值对应的特征向量，构成投影矩阵 $W = (\boldsymbol{v}_1, \ldots, \boldsymbol{v}_k)$

6. 低维表示：$\boldsymbol{z}_i = W^T\tilde{\boldsymbol{x}}_i$

### 1.3 与 SVD 的关系

对 $X$ 进行 SVD：$X = U\Sigma V^T$

则 $C = \frac{1}{m-1}V\Sigma^2 V^T$

PCA 的主成分方向就是 $V$ 的列向量，主成分的方差为 $\dfrac{\sigma_i^2}{m-1}$。

### 1.4 方差解释比

前 $k$ 个主成分解释的方差比例为：

$$\rho_k = \frac{\sum_{i=1}^{k}\sigma_i^2}{\sum_{i=1}^{r}\sigma_i^2}$$

通常选择 $k$ 使 $\rho_k \geq 0.85$（或 $0.90, 0.95$）。

### 1.5 PCA 的优缺点

**优点**：

- 降维去相关
- 保留最大方差
- 无参数方法

**缺点**：

- 线性方法，无法处理非线性结构
- 主成分可能缺乏可解释性
- 对异常值敏感

## 2. 推荐系统中的矩阵分解

### 2.1 问题背景

用户-物品评分矩阵 $R$（$m \times n$）大部分元素缺失，需要预测缺失的评分。

### 2.2 基本模型

将评分矩阵分解为两个低秩矩阵的乘积：

$$R \approx PQ^T$$

其中 $P$ 为 $m \times k$（用户隐因子矩阵），$Q$ 为 $n \times k$（物品隐因子矩阵），$k \ll \min(m, n)$。

### 2.3 目标函数

$$\min_{P,Q} \sum_{(i,j) \in \Omega} (r_{ij} - \boldsymbol{p}_i^T\boldsymbol{q}_j)^2 + \lambda(\|P\|_F^2 + \|Q\|_F^2)$$

其中 $\Omega$ 为已观测评分的集合，$\lambda$ 为正则化参数。

### 2.4 求解方法

**随机梯度下降（SGD）**：

$$\boldsymbol{p}_i \leftarrow \boldsymbol{p}_i + \eta(e_{ij}\boldsymbol{q}_j - \lambda\boldsymbol{p}_i)$$

$$\boldsymbol{q}_j \leftarrow \boldsymbol{q}_j + \eta(e_{ij}\boldsymbol{p}_i - \lambda\boldsymbol{q}_j)$$

其中 $e_{ij} = r_{ij} - \boldsymbol{p}_i^T\boldsymbol{q}_j$，$\eta$ 为学习率。

**交替最小二乘（ALS）**：

固定 $Q$，求解 $P$；固定 $P$，求解 $Q$。交替进行直到收敛。

### 2.5 SVD 与推荐系统

截断 SVD 可以用于推荐系统，但需要处理缺失值。常用方法：

1. 用均值填充缺失值后做 SVD
2. 使用 SVD 的变体（如 SVD++）
3. 直接优化低秩近似

### 2.6 实际应用

- Netflix Prize 竞赛中，矩阵分解方法是获胜算法的核心
- Amazon、淘宝等电商的推荐系统
- 音乐、视频推荐

## 3. 图像压缩

### 3.1 基本原理

灰度图像可以表示为矩阵 $A$（$m \times n$），对 $A$ 进行 SVD：

$$A = \sum_{i=1}^{r} \sigma_i \boldsymbol{u}_i \boldsymbol{v}_i^T$$

保留前 $k$ 个奇异值：

$$A_k = \sum_{i=1}^{k} \sigma_i \boldsymbol{u}_i \boldsymbol{v}_i^T$$

### 3.2 压缩比

原始存储：$m \times n$ 个数

压缩后存储：$k(m + n + 1)$ 个数（$k$ 个 $\sigma_i$，$k$ 个 $\boldsymbol{u}_i$，$k$ 个 $\boldsymbol{v}_i$）

压缩比：$\dfrac{mn}{k(m+n+1)}$

### 3.3 压缩质量

保留的奇异值越多，压缩质量越高：

$$\frac{\|A - A_k\|_F}{\|A\|_F} = \sqrt{\frac{\sum_{i=k+1}^{r}\sigma_i^2}{\sum_{i=1}^{r}\sigma_i^2}}$$

### 3.4 示例

对于 $256 \times 256$ 的图像，取 $k = 50$：

- 原始：$256 \times 256 = 65536$ 个数
- 压缩后：$50 \times (256 + 256 + 1) = 25650$ 个数
- 压缩比：约 $2.55:1$

## 4. 线性判别分析（LDA）

### 4.1 问题

给定带标签的数据，找到投影方向使类间距离最大、类内距离最小。

### 4.2 数学模型

设 $S_B$ 为类间散布矩阵，$S_W$ 为类内散布矩阵，优化目标：

$$\max_{\boldsymbol{w}} \frac{\boldsymbol{w}^TS_B\boldsymbol{w}}{\boldsymbol{w}^TS_W\boldsymbol{w}}$$

### 4.3 求解

广义特征值问题：$S_B\boldsymbol{w} = \lambda S_W\boldsymbol{w}$

若 $S_W$ 可逆：$S_W^{-1}S_B\boldsymbol{w} = \lambda\boldsymbol{w}$

对 $S_W^{-1}S_B$ 进行特征值分解，取前 $k$ 个最大特征值对应的特征向量。

### 4.4 与 PCA 的比较

| 特点       | PCA        | LDA                        |
| ---------- | ---------- | -------------------------- |
| 类型       | 无监督     | 有监督                     |
| 目标       | 最大化方差 | 最大化类间/类内比          |
| 适用场景   | 无标签数据 | 有标签数据                 |
| 投影方向数 | 最多 $n$   | 最多 $c-1$（$c$ 为类别数） |

## 5. 其他应用

### 5.1 自然语言处理

- **潜在语义分析（LSA）**：对词-文档矩阵做 SVD，发现潜在语义结构
- **词嵌入**：基于矩阵分解的词向量学习方法

### 5.2 信号处理

- **降噪**：截断小奇异值去除噪声
- **信号分离**：利用 SVD 分离混合信号

### 5.3 数值计算

- **矩阵低秩近似**：Eckart-Young 定理保证 SVD 给出最优低秩近似
- **条件数估计**：$\kappa(A) = \sigma_{\max}/\sigma_{\min}$
- **有效秩**：根据奇异值分布确定矩阵的"有效秩"

### 5.4 系统理论

- **模型降阶**：用低秩近似简化高阶系统
- **可控性与可观测性**：通过矩阵的秩分析系统性质
