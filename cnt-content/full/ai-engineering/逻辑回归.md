---
order: 12
title: 逻辑回归
module: 'ai-engineering'
category: data
difficulty: intermediate
description: 逻辑回归原理、Sigmoid函数、交叉熵损失、多分类扩展与正则化。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'ai-engineering/神经网络基础'
  - 'ai-engineering/反向传播算法'
  - 'ai-engineering/决策树'
  - 'ai-engineering/卷积神经网络'
prerequisites: []
---

## 1. 逻辑回归模型

逻辑回归是**分类算法**（尽管名字含"回归"），通过 Sigmoid 函数将线性输出映射到概率。

### 1.1 Sigmoid函数

$$\sigma(z) = \frac{1}{1 + e^{-z}} = \frac{e^z}{1 + e^z}$$

**性质**：

- 输出范围 $(0, 1)$，可解释为概率
- $\sigma(-z) = 1 - \sigma(z)$
- 导数：$\sigma'(z) = \sigma(z)(1 - \sigma(z))$

### 1.2 模型定义

$$P(y=1|\mathbf{x}) = \sigma(\mathbf{w}^T\mathbf{x} + b) = \frac{1}{1 + e^{-(\mathbf{w}^T\mathbf{x} + b)}}$$

$$P(y=0|\mathbf{x}) = 1 - P(y=1|\mathbf{x})$$

**对数几率（Log-Odds）**：

$$\ln\frac{P(y=1|\mathbf{x})}{P(y=0|\mathbf{x})} = \mathbf{w}^T\mathbf{x} + b$$

逻辑回归本质是对**对数几率**进行线性建模。

### 1.3 决策边界

$$\mathbf{w}^T\mathbf{x} + b = 0$$

- $\mathbf{w}^T\mathbf{x} + b > 0$ → 预测为正类
- $\mathbf{w}^T\mathbf{x} + b < 0$ → 预测为负类

决策边界是特征空间中的**线性超平面**。

## 2. 交叉熵损失

### 2.1 损失函数

对于二分类问题，使用**二元交叉熵（Binary Cross-Entropy）**：

$$J(\mathbf{w}) = -\frac{1}{n}\sum_{i=1}^{n} \left[y_i \ln \hat{y}_i + (1-y_i)\ln(1-\hat{y}_i)\right]$$

其中 $\hat{y}_i = \sigma(\mathbf{w}^T\mathbf{x}_i + b)$。

**直觉理解**：

| 真实标签 | 预测概率       | 损失                      |
| :------- | :------------- | :------------------------ |
| $y=1$    | $\hat{y}=0.99$ | $-\ln(0.99) = 0.01$（小） |
| $y=1$    | $\hat{y}=0.01$ | $-\ln(0.01) = 4.61$（大） |
| $y=0$    | $\hat{y}=0.01$ | $-\ln(0.99) = 0.01$（小） |
| $y=0$    | $\hat{y}=0.99$ | $-\ln(0.01) = 4.61$（大） |

### 2.2 梯度计算

$$\frac{\partial J}{\partial \mathbf{w}} = \frac{1}{n}\sum_{i=1}^{n}(\hat{y}_i - y_i)\mathbf{x}_i$$

**注意**：逻辑回归的梯度形式与线性回归**完全相同**（$h_\mathbf{w}(\mathbf{x}) - y$），但 $\hat{y}_i$ 的计算方式不同。

### 2.3 极大似然估计

交叉熵损失等价于**极大似然估计**的对数似然取负：

$$J(\mathbf{w}) = -\frac{1}{n}\ln \mathcal{L}(\mathbf{w})$$

其中似然函数：

$$\mathcal{L}(\mathbf{w}) = \prod_{i=1}^{n} \hat{y}_i^{y_i}(1-\hat{y}_i)^{1-y_i}$$

## 3. 多分类扩展

### 3.1 One-vs-Rest（OvR）

将 $K$ 分类问题转化为 $K$ 个二分类问题：

```
类别1 vs 非类别1 → 分类器1
类别2 vs 非类别2 → 分类器2
类别3 vs 非类别3 → 分类器3
...
```

预测时选择置信度最高的类别。

### 3.2 Softmax回归

直接建模多类概率分布：

$$P(y=k|\mathbf{x}) = \frac{e^{\mathbf{w}_k^T\mathbf{x} + b_k}}{\sum_{j=1}^{K} e^{\mathbf{w}_j^T\mathbf{x} + b_j}}$$

**多类交叉熵损失**：

$$J(\mathbf{W}) = -\frac{1}{n}\sum_{i=1}^{n}\sum_{k=1}^{K} y_{ik} \ln P(y_i=k|\mathbf{x}_i)$$

其中 $y_{ik}$ 为 one-hot 编码。

**Softmax梯度**：

$$\frac{\partial J}{\partial \mathbf{w}_k} = \frac{1}{n}\sum_{i=1}^{n}(P(y_i=k|\mathbf{x}_i) - y_{ik})\mathbf{x}_i$$

### 3.3 OvR vs Softmax

| 维度     | OvR      | Softmax    |
| :------- | :------- | :--------- |
| 分类器数 | $K$个    | 1个        |
| 概率校准 | 不可靠   | 天然归一化 |
| 训练效率 | 可并行   | 需同时优化 |
| 适用场景 | 类别数多 | 类别数适中 |

## 4. 正则化与优化

### 4.1 正则化

**L1正则化**：

$$J_{L1} = J(\mathbf{w}) + \lambda \|\mathbf{w}\|_1$$

**L2正则化**：

$$J_{L2} = J(\mathbf{w}) + \frac{\lambda}{2} \|\mathbf{w}\|^2$$

**Elastic Net**：

$$J_{EN} = J(\mathbf{w}) + \lambda_1 \|\mathbf{w}\|_1 + \frac{\lambda_2}{2} \|\mathbf{w}\|^2$$

### 4.2 优化算法

| 算法     | 说明               | 适用场景       |
| :------- | :----------------- | :------------- |
| 梯度下降 | 通用               | 大规模数据     |
| IRLS     | 迭代重加权最小二乘 | 小规模数据     |
| L-BFGS   | 拟牛顿法           | 中等规模       |
| SGD/Adam | 随机优化           | 大规模在线学习 |
| 坐标下降 | L1正则化专用       | 高维稀疏数据   |

## 5. 模型评估与调优

### 5.1 分类评估指标

| 指标   | 公式                              | 说明                     |
| :----- | :-------------------------------- | :----------------------- |
| 准确率 | $\frac{TP+TN}{TP+TN+FP+FN}$       | 整体正确率               |
| 精确率 | $\frac{TP}{TP+FP}$                | 预测为正的准确率         |
| 召回率 | $\frac{TP}{TP+FN}$                | 正样本被识别率           |
| F1     | $\frac{2 \cdot P \cdot R}{P + R}$ | 精确率与召回率的调和平均 |

### 5.2 阈值选择

默认阈值为0.5，但可根据业务需求调整：

- **提高召回率**：降低阈值（如0.3），适用于疾病筛查
- **提高精确率**：提高阈值（如0.7），适用于垃圾邮件过滤

**ROC曲线**：绘制不同阈值下的TPR vs FPR

**AUC**：ROC曲线下面积，衡量分类器整体性能

$$\text{AUC} = P(\text{score}(\mathbf{x}_+) > \text{score}(\mathbf{x}_-))$$

### 5.3 类别不平衡处理

| 方法     | 说明                                    |
| :------- | :-------------------------------------- |
| 过采样   | SMOTE生成少数类样本                     |
| 欠采样   | 减少多数类样本                          |
| 类别权重 | 代价敏感学习，`class_weight='balanced'` |
| 阈值调整 | 根据类别比例调整决策阈值                |
