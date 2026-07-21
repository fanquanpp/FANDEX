---
order: 21
title: 特征工程详解
module: 'ai-engineering'
category: data
difficulty: intermediate
description: 特征选择、特征提取、特征构造方法与自动化特征工程。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'ai-engineering/模型优化与部署'
  - 'ai-engineering/模型评估与选择'
  - 'ai-engineering/强化学习基础'
  - 'ai-engineering/Scikit-learn实战'
prerequisites: []
---

## 1. 特征工程概述

特征工程是将原始数据转化为**更能代表问题本质的特征**的过程，往往决定了模型性能的上限。

### 1.1 核心原则

> "Feature engineering is the art of extracting more information from existing data." — 吴恩达

| 原则     | 说明                     |
| :------- | :----------------------- |
| 相关性   | 特征与目标变量相关       |
| 互斥性   | 特征之间尽量不冗余       |
| 可解释性 | 特征有业务含义           |
| 稳定性   | 特征分布随时间不剧烈变化 |

## 2. 特征选择

### 2.1 过滤法（Filter）

**方差阈值**：删除方差过小的特征（几乎不变化）

```python
from sklearn.feature_selection import VarianceThreshold
selector = VarianceThreshold(threshold=0.01)
X_selected = selector.fit_transform(X)
```

**相关系数**：删除与目标相关性极低的特征

$$r_{xy} = \frac{\sum(x_i - \bar{x})(y_i - \bar{y})}{\sqrt{\sum(x_i - \bar{x})^2 \sum(y_i - \bar{y})^2}}$$

**互信息**：衡量特征与目标的信息依赖

$$I(X;Y) = \sum_{x,y} p(x,y) \log \frac{p(x,y)}{p(x)p(y)}$$

**卡方检验**：类别特征与目标变量的独立性检验

$$\chi^2 = \sum \frac{(O_{ij} - E_{ij})^2}{E_{ij}}$$

### 2.2 包装法（Wrapper）

**递归特征消除（RFE）**：

```
1. 用所有特征训练模型
2. 根据特征重要性删除最不重要的特征
3. 重复直到达到目标特征数
```

```python
from sklearn.feature_selection import RFE
from sklearn.ensemble import RandomForestClassifier
rfe = RFE(RandomForestClassifier(), n_features_to_select=20)
X_selected = rfe.fit_transform(X, y)
```

### 2.3 嵌入法（Embedded）

| 方法         | 原理                     | 特点             |
| :----------- | :----------------------- | :--------------- |
| L1正则化     | 稀疏解自动选择特征       | 自动但可能不稳定 |
| 树模型重要性 | 基于分裂增益             | 非线性关系       |
| 正则化路径   | 观察正则化强度与特征选择 | 可解释           |

### 2.4 方法对比

| 方法   | 计算量 | 考虑模型 | 特征交互 | 过拟合风险 |
| :----- | :----- | :------- | :------- | :--------- |
| 过滤法 | 低     | 否       | 否       | 低         |
| 包装法 | 高     | 是       | 是       | 高         |
| 嵌入法 | 中     | 是       | 部分     | 中         |

## 3. 特征提取

### 3.1 数值特征

| 方法     | 公式/说明                            | 适用场景     |
| :------- | :----------------------------------- | :----------- |
| 标准化   | $z = \frac{x - \mu}{\sigma}$         | 正态分布特征 |
| 归一化   | $x' = \frac{x - \min}{\max - \min}$  | 有界特征     |
| 对数变换 | $x' = \log(x + 1)$                   | 右偏分布     |
| Box-Cox  | $x' = \frac{x^\lambda - 1}{\lambda}$ | 一般偏态     |
| 分箱     | 等频/等宽/决策树分箱                 | 非线性关系   |

### 3.2 类别特征

| 方法               | 说明               | 维度 | 适用场景 |
| :----------------- | :----------------- | :--- | :------- |
| One-Hot            | 每个取值一个二值列 | 高   | 低基数   |
| Label Encoding     | 整数编码           | 1    | 有序类别 |
| Target Encoding    | 用目标均值编码     | 1    | 高基数   |
| Frequency Encoding | 用频率编码         | 1    | 高基数   |
| Embedding          | 学习低维向量       | 低   | 深度学习 |

**Target Encoding**：

$$\text{TE}(c) = \frac{n_c \cdot \bar{y}_c + m \cdot \bar{y}}{n_c + m}$$

其中 $n_c$ 为类别 $c$ 的样本数，$\bar{y}_c$ 为类别 $c$ 的目标均值，$m$ 为平滑参数。

### 3.3 时间特征

| 特征        | 提取方式   | 示例              |
| :---------- | :--------- | :---------------- |
| 年/月/日/时 | 时间分解   | 2024, 1, 15, 10   |
| 星期几      | dayofweek  | Monday=0          |
| 是否周末    | is_weekend | 0/1               |
| 是否节假日  | is_holiday | 0/1               |
| 距今天数    | delta_days | 30                |
| 周期编码    | sin/cos    | $\sin(2\pi h/24)$ |

**周期编码**：

$$x_{\sin} = \sin\left(\frac{2\pi t}{T}\right), \quad x_{\cos} = \cos\left(\frac{2\pi t}{T}\right)$$

### 3.4 文本特征

| 方法         | 说明                   | 特点         |
| :----------- | :--------------------- | :----------- |
| Bag of Words | 词频向量               | 简单、稀疏   |
| TF-IDF       | 词频-逆文档频率        | 抑制常见词   |
| N-gram       | 连续N个词的组合        | 捕获局部语序 |
| Word2Vec     | 词嵌入向量             | 语义信息     |
| 文本统计     | 长度、标点数、数字比例 | 快速特征     |

**TF-IDF**：

$$\text{TF-IDF}(t, d) = \text{TF}(t, d) \times \log\frac{N}{\text{DF}(t)}$$

## 4. 特征构造

### 4.1 交叉特征

$$x_{new} = x_1 \times x_2$$

```python
# 交互特征
X['area'] = X['length'] * X['width']
X['price_per_area'] = X['price'] / X['area']
```

### 4.2 多项式特征

$$x_{new} = x_1^2, x_1 x_2, x_2^2, \ldots$$

```python
from sklearn.preprocessing import PolynomialFeatures
poly = PolynomialFeatures(degree=2, interaction_only=True)
X_poly = poly.fit_transform(X)
```

### 4.3 聚合特征

| 聚合方式 | 说明       | 示例               |
| :------- | :--------- | :----------------- |
| 群组统计 | 按类别聚合 | 用户历史平均消费额 |
| 时间窗口 | 滚动统计   | 最近7天交易次数    |
| 滞后特征 | 历史值     | 前一天销售额       |
| 差分特征 | 变化量     | 销售额环比变化     |

## 5. 自动化特征工程

### 5.1 Featuretools

```python
import featuretools as ft

es = ft.EntitySet(id='sales')
es.add_dataframe(dataframe_name='orders', dataframe=orders, index='order_id')
es.add_dataframe(dataframe_name='customers', dataframe=customers, index='customer_id')

es.add_relationship('customers', 'customer_id', 'orders', 'customer_id')

feature_matrix, feature_defs = ft.dfs(
    entityset=es,
    target_dataframe_name='customers',
    agg_primitives=['mean', 'sum', 'count', 'max'],
    trans_primitives=['month', 'year', 'day']
)
```

### 5.2 特征工程最佳实践

1. **先建立基线**：用原始特征训练模型
2. **逐步添加**：每次添加一类特征，观察效果
3. **删除冗余**：高相关特征只保留一个
4. **防止泄露**：不用未来信息构造特征
5. **记录过程**：每个特征的业务含义和构造逻辑
