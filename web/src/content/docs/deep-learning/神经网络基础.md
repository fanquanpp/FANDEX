---
order: 11
title: 神经网络基础
module: 'deep-learning'
category: data
difficulty: beginner
description: 感知机、激活函数、前向传播、损失函数与梯度下降。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'deep-learning/深度学习概述'
  - 'deep-learning/反向传播算法'
  - 'deep-learning/卷积神经网络'
prerequisites: []
---

## 1. 感知机

### 1.1 单层感知机

感知机是最简单的神经网络，实现**线性二分类**：

$$y = \sigma\left(\sum_{j=1}^{d} w_j x_j + b\right) = \sigma(\mathbf{w}^T\mathbf{x} + b)$$

其中 $\sigma$ 为阶跃函数：

$$\sigma(z) = \begin{cases} 1 & z \geq 0 \\ 0 & z < 0 \end{cases}$$

### 1.2 感知机局限性

单层感知机只能解决**线性可分**问题，无法解决XOR问题：

```
XOR问题:
  (0,0) → 0    (0,1) → 1
  (1,0) → 1    (1,1) → 0

无法用一条直线分隔两类
```

**解决**：多层感知机（MLP）引入隐藏层。

### 1.3 多层感知机（MLP）

$$\mathbf{h} = \sigma(\mathbf{W}_1^T\mathbf{x} + \mathbf{b}_1)$$
$$\mathbf{o} = \mathbf{W}_2^T\mathbf{h} + \mathbf{b}_2$$

- 隐藏层引入非线性变换
- 通用近似定理：含一个隐藏层的MLP可以近似任意连续函数

## 2. 激活函数

### 2.1 常用激活函数

| 激活函数   | 公式                                           | 值域                | 特点            |
| :--------- | :--------------------------------------------- | :------------------ | :-------------- |
| Sigmoid    | $\sigma(z) = \frac{1}{1+e^{-z}}$               | $(0,1)$             | 梯度消失        |
| Tanh       | $\tanh(z) = \frac{e^z - e^{-z}}{e^z + e^{-z}}$ | $(-1,1)$            | 零中心          |
| ReLU       | $\max(0, z)$                                   | $[0,+\infty)$       | 简单高效        |
| Leaky ReLU | $\max(\alpha z, z)$                            | $(-\infty,+\infty)$ | 解决Dead ReLU   |
| ELU        | $z$ if $z>0$; $\alpha(e^z-1)$ if $z\leq0$      | $(-\alpha,+\infty)$ | 负区间平滑      |
| GELU       | $z \cdot \Phi(z)$                              | $(-0.17,+\infty)$   | Transformer常用 |
| Swish      | $z \cdot \sigma(\beta z)$                      | $(-0.28,+\infty)$   | 自门控          |

### 2.2 梯度消失与梯度爆炸

**Sigmoid梯度消失**：

$$\sigma'(z) = \sigma(z)(1-\sigma(z)) \leq 0.25$$

多层累积后梯度指数衰减：

$$\frac{\partial L}{\partial \mathbf{W}_1} \propto \prod_{l=1}^{L} \sigma'(z_l) \cdot \mathbf{W}_l$$

**ReLU的优势**：

$$\text{ReLU}'(z) = \begin{cases} 1 & z > 0 \\ 0 & z \leq 0 \end{cases}$$

正区间梯度恒为1，有效缓解梯度消失。

### 2.3 Softmax

多分类输出层激活函数：

$$\text{Softmax}(z_i) = \frac{e^{z_i}}{\sum_{j=1}^{K} e^{z_j}}$$

**数值稳定性**：

$$\text{Softmax}(z_i) = \frac{e^{z_i - \max(z)}}{\sum_{j=1}^{K} e^{z_j - \max(z)}}$$

## 3. 前向传播

### 3.1 计算流程

```
输入层 (d维) → 隐藏层1 (h1维) → 隐藏层2 (h2维) → 输出层 (K维)

z1 = W1·x + b1
a1 = σ(z1)
z2 = W2·a1 + b2
a2 = σ(z2)
z3 = W3·a2 + b3
output = Softmax(z3)
```

### 3.2 维度分析

| 层          | 输入       | 权重                                           | 输出       |
| :---------- | :--------- | :--------------------------------------------- | :--------- |
| 输入→隐藏1  | $(n, d)$   | $\mathbf{W}_1 \in \mathbb{R}^{d \times h_1}$   | $(n, h_1)$ |
| 隐藏1→隐藏2 | $(n, h_1)$ | $\mathbf{W}_2 \in \mathbb{R}^{h_1 \times h_2}$ | $(n, h_2)$ |
| 隐藏2→输出  | $(n, h_2)$ | $\mathbf{W}_3 \in \mathbb{R}^{h_2 \times K}$   | $(n, K)$   |

## 4. 损失函数

### 4.1 回归损失

**均方误差（MSE）**：

$$L_{MSE} = \frac{1}{n}\sum_{i=1}^{n}(y_i - \hat{y}_i)^2$$

**平均绝对误差（MAE）**：

$$L_{MAE} = \frac{1}{n}\sum_{i=1}^{n}|y_i - \hat{y}_i|$$

**Huber Loss**：

$$L_\delta = \begin{cases} \frac{1}{2}(y - \hat{y})^2 & |y - \hat{y}| \leq \delta \\ \delta|y - \hat{y}| - \frac{1}{2}\delta^2 & |y - \hat{y}| > \delta \end{cases}$$

### 4.2 分类损失

**交叉熵损失**：

$$L_{CE} = -\sum_{i=1}^{n}\sum_{k=1}^{K} y_{ik} \log \hat{y}_{ik}$$

**Focal Loss**（解决类别不平衡）：

$$L_{FL} = -\alpha_t (1 - p_t)^\gamma \log p_t$$

- $\gamma > 0$ 减少易分类样本的损失权重
- $\alpha_t$ 平衡正负样本

## 5. 正则化技术

### 5.1 Dropout

训练时以概率 $p$ 随机将神经元输出置零：

$$\tilde{\mathbf{h}} = \mathbf{m} \odot \mathbf{h}, \quad m_j \sim \text{Bernoulli}(1-p)$$

推理时缩放：$\mathbf{h}_{test} = (1-p) \cdot \mathbf{h}$

### 5.2 Batch Normalization

$$\hat{x}_j = \frac{x_j - \mu_B}{\sqrt{\sigma_B^2 + \epsilon}}$$
$$y_j = \gamma_j \hat{x}_j + \beta_j$$

- 训练时使用当前batch的均值和方差
- 推理时使用全局均值和方差
- 允许更大学习率，加速收敛

### 5.3 权重初始化

| 方法         | 公式                                                                                                   | 适用激活 |
| :----------- | :----------------------------------------------------------------------------------------------------- | :------- |
| Xavier       | $W \sim U\left[-\frac{\sqrt{6}}{\sqrt{n_{in}+n_{out}}}, \frac{\sqrt{6}}{\sqrt{n_{in}+n_{out}}}\right]$ | Tanh     |
| He (Kaiming) | $W \sim \mathcal{N}\left(0, \sqrt{\frac{2}{n_{in}}}\right)$                                            | ReLU     |
| LSUV         | 逐层初始化使方差为1                                                                                    | 通用     |
