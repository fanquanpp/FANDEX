---
title: 信息论
description: '熵、交叉熵、KL 散度、互信息、困惑度、标签平滑'
module: 'ai-engineering'
difficulty: intermediate
tags:
  - 信息论
  - 熵
  - 交叉熵
  - KL散度
  - 互信息
  - 困惑度
  - 标签平滑
related:
  - 'ai-engineering/宪法安全线束与红队靶场'
  - 'ai-engineering/向量与矩阵运算'
  - 'ai-engineering/学习率调度'
  - 'ai-engineering/异常检测'
prerequisites:
  - 'ai-engineering/机器学习概述'
---

# 信息论

> 信息论回答一个根本问题：一个事件包含多少"惊讶"？答案决定了我们如何压缩数据、训练模型和衡量不确定性。

**类型：** 构建
**语言：** Python
**前置条件：** 阶段 1，第 06 课（概率与分布）
**预计时间：** ~90 分钟

## 学习目标

- 从零计算熵、交叉熵和 KL 散度，解释它们在 AI 中的含义
- 使用互信息衡量两个变量之间的依赖关系
- 计算困惑度并解释它作为语言模型评估指标的意义
- 实现标签平滑并解释它为什么提升泛化能力

## 问题所在

交叉熵损失是分类和语言模型的标准损失函数。KL 散度是 VAE 和知识蒸馏的核心。困惑度是语言模型的评估指标。如果你不理解信息论，你就无法理解这些方法为什么有效、何时使用它们，或如何调试它们。

## 核心概念

### 信息量

一个事件的信息量与它的概率成反比。越罕见的事件，信息量越大。

```
I(x) = -log2(P(x))
```

```python
def information(p):
    """事件的信息量"""
    return -np.log2(p)

print(f"P=0.5: {information(0.5):.2f} bits")   # 1.00
print(f"P=0.25: {information(0.25):.2f} bits")  # 2.00
print(f"P=0.125: {information(0.125):.2f} bits") # 3.00
```

概率减半，信息量加 1 bit。

### 熵

熵是信息量的期望值。它衡量随机变量的平均不确定性。

```
H(X) = -sum(P(x) * log2(P(x)))
```

```python
def entropy(probs):
    """计算熵"""
    return -sum(p * np.log2(p) for p in probs if p > 0)

# 公平硬币
print(f"公平硬币: {entropy([0.5, 0.5]):.2f} bits")  # 1.00

# 不公平硬币
print(f"偏硬币: {entropy([0.9, 0.1]):.2f} bits")    # 0.47

# 确定性事件
print(f"确定性: {entropy([1.0, 0.0]):.2f} bits")    # 0.00
```

熵越高，不确定性越大。均匀分布的熵最大。

### 交叉熵

交叉熵衡量使用分布 Q 编码来自分布 P 的数据所需的平均比特数。

```
H(P, Q) = -sum(P(x) * log2(Q(x)))
```

```python
def cross_entropy(p_true, p_pred):
    """交叉熵"""
    return -sum(p * np.log2(q) for p, q in zip(p_true, p_pred) if p > 0)

p = [1, 0, 0]  # 真实分布
q_good = [0.9, 0.05, 0.05]  # 好的预测
q_bad = [0.3, 0.4, 0.3]     # 差的预测

print(f"好预测: {cross_entropy(p, q_good):.4f} bits")  # 0.152
print(f"差预测: {cross_entropy(p, q_bad):.4f} bits")    # 1.737
```

当 Q = P 时，交叉熵等于熵。Q 越偏离 P，交叉熵越大。

### KL 散度

KL 散度衡量两个分布之间的"距离"。它是交叉熵与熵之差。

```
KL(P || Q) = H(P, Q) - H(P) = sum(P(x) * log(P(x)/Q(x)))
```

```python
def kl_divergence(p, q):
    """KL 散度"""
    return sum(pi * np.log2(pi / qi) for pi, qi in zip(p, q) if pi > 0 and qi > 0)

print(f"KL(好预测): {kl_divergence(p, q_good):.4f}")  # 0.152
print(f"KL(差预测): {kl_divergence(p, q_bad):.4f}")    # 1.737
```

关键性质：

- **非负**：KL(P||Q) >= 0，等号当且仅当 P = Q
- **不对称**：KL(P||Q) != KL(Q||P)，不是真正的距离

### 互信息

互信息衡量两个变量之间的依赖关系。

```
I(X; Y) = H(X) - H(X|Y) = sum P(x,y) * log(P(x,y) / (P(x)*P(y)))
```

互信息 = X 的不确定性 - 给定 Y 后 X 的不确定性。如果 I(X;Y) = 0，X 和 Y 独立。

### 困惑度

困惑度是语言模型的标准评估指标。它是交叉熵的指数。

```
Perplexity = 2^H(P, Q)
```

```python
def perplexity(p_true, p_pred):
    """困惑度"""
    ce = -sum(p * np.log2(q) for p, q in zip(p_true, p_pred) if p > 0)
    return 2 ** ce

# 好的模型：困惑度低
print(f"好模型困惑度: {perplexity(p, q_good):.2f}")  # 1.11
# 差的模型：困惑度高
print(f"差模型困惑度: {perplexity(p, q_bad):.2f}")    # 3.31
```

困惑度 = "模型在每个位置平均不确定的词数"。困惑度 10 意味着模型在每个位置平均在 10 个词之间犹豫。

### 标签平滑

标签平滑将硬标签（[1, 0, 0]）变为软标签（[0.9, 0.05, 0.05]），防止模型过度自信。

```python
def label_smoothing(labels, num_classes, epsilon=0.1):
    """标签平滑"""
    smoothed = np.ones(num_classes) * epsilon / (num_classes - 1)
    smoothed[labels] = 1 - epsilon
    return smoothed

# 原始标签：类别 0
print(f"原始: {[1, 0, 0]}")
print(f"平滑: {label_smoothing(0, 3, 0.1)}")  # [0.9, 0.05, 0.05]
```

## 实际应用

| 概念     | AI 中的位置              |
| -------- | ------------------------ |
| 交叉熵   | 分类损失，语言模型训练   |
| KL 散度  | VAE，知识蒸馏，策略梯度  |
| 熵       | 决策树分裂标准，信息增益 |
| 困惑度   | 语言模型评估             |
| 互信息   | 特征选择，表示学习       |
| 标签平滑 | 正则化，提升泛化         |

## 练习

1. 计算公平骰子和偏骰子（P(6)=0.5）的熵，比较差异
2. 对两个正态分布计算 KL 散度，验证解析公式
3. 实现困惑度计算，用不同质量的"模型"预测同一文本
4. 在分类任务中比较使用硬标签和标签平滑的训练效果
