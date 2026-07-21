---
order: 15
title: Transformer架构
module: 'ai-engineering'
category: data
difficulty: advanced
description: 自注意力机制、多头注意力、位置编码与Transformer架构详解。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'ai-engineering/卷积神经网络'
  - 'ai-engineering/循环神经网络'
  - 'ai-engineering/K近邻'
  - 'ai-engineering/生成模型'
prerequisites: []
---

## 1. 自注意力机制

### 1.1 核心公式

自注意力将输入序列中的每个位置与所有位置关联：

$$\text{Attention}(\mathbf{Q}, \mathbf{K}, \mathbf{V}) = \text{Softmax}\left(\frac{\mathbf{Q}\mathbf{K}^T}{\sqrt{d_k}}\right)\mathbf{V}$$

其中：

- $\mathbf{Q} = \mathbf{X}\mathbf{W}_Q$：查询矩阵
- $\mathbf{K} = \mathbf{X}\mathbf{W}_K$：键矩阵
- $\mathbf{V} = \mathbf{X}\mathbf{W}_V$：值矩阵
- $d_k$：键向量维度

### 1.2 缩放因子

除以 $\sqrt{d_k}$ 的原因：

当 $d_k$ 较大时，点积结果方差增大，Softmax进入饱和区，梯度极小：

$$\text{Var}(q \cdot k) = d_k \cdot \text{Var}(q_i) \cdot \text{Var}(k_i)$$

缩放后：$\text{Var}\left(\frac{q \cdot k}{\sqrt{d_k}}\right) = \text{Var}(q_i) \cdot \text{Var}(k_i)$

### 1.3 计算复杂度

| 操作       | 复杂度                   |
| :--------- | :----------------------- |
| QKV投影    | $O(n \cdot d \cdot d_k)$ |
| 注意力矩阵 | $O(n^2 \cdot d_k)$       |
| 加权求和   | $O(n^2 \cdot d_v)$       |
| **总计**   | $O(n^2 d + nd^2)$        |

## 2. 多头注意力

### 2.1 多头机制

将Q、K、V投影到 $h$ 个子空间，分别计算注意力后拼接：

$$\text{MultiHead}(\mathbf{Q}, \mathbf{K}, \mathbf{V}) = \text{Concat}(\text{head}_1, \ldots, \text{head}_h)\mathbf{W}^O$$

$$\text{head}_i = \text{Attention}(\mathbf{Q}\mathbf{W}_i^Q, \mathbf{K}\mathbf{W}_i^K, \mathbf{V}\mathbf{W}_i^V)$$

其中 $\mathbf{W}_i^Q \in \mathbb{R}^{d \times d_k}$，$d_k = d/h$。

### 2.2 多头的意义

- 每个头关注**不同的子空间信息**
- 类似于CNN中多个卷积核提取不同特征
- 增强模型的表达能力

## 3. 位置编码

### 3.1 正弦位置编码

由于自注意力是**置换不变**的，需要位置编码注入位置信息：

$$PE_{(pos, 2i)} = \sin\left(\frac{pos}{10000^{2i/d}}\right)$$
$$PE_{(pos, 2i+1)} = \cos\left(\frac{pos}{10000^{2i/d}}\right)$$

**性质**：

- 每个维度对应不同频率的正弦波
- 相对位置关系可通过线性变换表达
- 可外推到更长序列

### 3.2 旋转位置编码（RoPE）

通过旋转矩阵编码**相对位置**：

$$\mathbf{q}_m = \mathbf{R}_{\Theta,m}\mathbf{W}_q\mathbf{x}_m$$
$$\mathbf{k}_n = \mathbf{R}_{\Theta,n}\mathbf{W}_k\mathbf{x}_n$$

$$\mathbf{q}_m^T\mathbf{k}_n = \mathbf{x}_m^T\mathbf{W}_q^T\mathbf{R}_{\Theta,n-m}\mathbf{W}_k\mathbf{x}_n$$

内积只依赖相对位置 $n - m$。

### 3.3 ALiBi位置编码

直接在注意力分数上添加线性偏置：

$$\text{Attention}_{ij} = \frac{\mathbf{q}_i^T\mathbf{k}_j}{\sqrt{d_k}} + m \cdot |i - j|$$

- 无需位置嵌入
- 支持长度外推

## 4. Transformer架构

### 4.1 编码器

```
输入 → [Embedding + Positional Encoding]
  → [Multi-Head Attention] → [Add & Norm]
  → [Feed-Forward Network] → [Add & Norm]
  → ... (×N层)
```

**子层结构**：

1. 多头自注意力 + 残差连接 + LayerNorm
2. 前馈网络（FFN）+ 残差连接 + LayerNorm

**FFN**：

$$\text{FFN}(\mathbf{x}) = \max(0, \mathbf{x}\mathbf{W}_1 + \mathbf{b}_1)\mathbf{W}_2 + \mathbf{b}_2$$

扩展比：$d_{ff} = 4d_{model}$

### 4.2 解码器

```
目标 → [Embedding + Positional Encoding]
  → [Masked Multi-Head Attention] → [Add & Norm]
  → [Cross-Attention] → [Add & Norm]
  → [Feed-Forward Network] → [Add & Norm]
  → [Linear + Softmax]
  → ... (×N层)
```

**Masked Attention**：防止看到未来信息

$$\text{Mask}_{ij} = \begin{cases} 0 & i \geq j \\ -\infty & i < j \end{cases}$$

### 4.3 Pre-Norm vs Post-Norm

| 方式      | 公式                                                         | 训练稳定性 |
| :-------- | :----------------------------------------------------------- | :--------- |
| Post-Norm | $\text{LayerNorm}(\mathbf{x} + \text{Sublayer}(\mathbf{x}))$ | 较差       |
| Pre-Norm  | $\mathbf{x} + \text{Sublayer}(\text{LayerNorm}(\mathbf{x}))$ | 较好       |

现代Transformer普遍采用Pre-Norm。

## 5. 高效注意力

### 5.1 稀疏注意力

| 方法               | 复杂度         | 思路               |
| :----------------- | :------------- | :----------------- |
| Longformer         | $O(n)$         | 局部窗口+全局token |
| BigBird            | $O(n)$         | 随机+窗口+全局     |
| Sparse Transformer | $O(n\sqrt{n})$ | 固定稀疏模式       |

### 5.2 线性注意力

$$\text{Attention}(\mathbf{Q}, \mathbf{K}, \mathbf{V}) = \frac{\phi(\mathbf{Q})(\phi(\mathbf{K})^T\mathbf{V})}{\phi(\mathbf{Q})(\phi(\mathbf{K})^T\mathbf{1})}$$

先计算 $\phi(\mathbf{K})^T\mathbf{V}$（$d \times d$），复杂度降为 $O(nd^2)$。

### 5.3 Flash Attention

通过**分块计算**和**IO感知**优化，减少HBM访问次数：

- 数学等价：结果与标准注意力完全一致
- 内存优化：$O(n)$ 而非 $O(n^2)$
- 速度提升：2~4x
