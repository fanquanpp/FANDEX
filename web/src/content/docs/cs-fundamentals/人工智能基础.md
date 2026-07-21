---
order: 68
title: 人工智能基础
module: 'cs-fundamentals'
category: 'Computer Science'
difficulty: intermediate
description: 人工智能基础：搜索算法、知识表示、机器学习、神经网络与深度学习
author: fanquanpp
updated: '2026-06-14'
related:
  - 'cs-fundamentals/网络安全'
  - 'cs-fundamentals/多媒体技术'
  - 'cs-fundamentals/计算机图形学'
  - 'cs-fundamentals/设计模式'
prerequisites:
  - 'cs-fundamentals/计算机科学概述'
---

## 1. 人工智能概述

### 1.1 AI 发展历程

| 阶段     | 年代        | 核心思想         |
| -------- | ----------- | ---------------- |
| 符号主义 | 1950s-1980s | 基于逻辑推理     |
| 连接主义 | 1980s-1990s | 神经网络         |
| 统计学习 | 2000s-2010s | 机器学习         |
| 深度学习 | 2012-       | 深层神经网络     |
| 大模型   | 2020-       | Transformer、LLM |

### 1.2 AI 分类

| 类型   | 定义     | 示例               |
| ------ | -------- | ------------------ |
| 弱AI   | 特定任务 | 图像识别、语音助手 |
| 强AI   | 通用智能 | 尚未实现           |
| 超级AI | 超越人类 | 理论概念           |

## 2. 搜索算法

### 2.1 无信息搜索

| 算法 | 完备性 | 最优性     | 时间                 | 空间                 |
| ---- | ------ | ---------- | -------------------- | -------------------- |
| BFS  | 是     | 是(等代价) | $O(b^d)$             | $O(b^d)$             |
| DFS  | 否     | 否         | $O(b^m)$             | $O(bm)$              |
| UCS  | 是     | 是         | $O(b^{C*/\epsilon})$ | $O(b^{C*/\epsilon})$ |
| IDS  | 是     | 是(等代价) | $O(b^d)$             | $O(bd)$              |

$b$：分支因子，$d$：解深度，$m$：最大深度

### 2.2 启发式搜索

**A\* 算法**：

$$f(n) = g(n) + h(n)$$

- $g(n)$：从起点到 $n$ 的实际代价
- $h(n)$：从 $n$ 到目标的启发式估计

**最优性条件**：$h(n)$ 是可采纳的（不高估实际代价）。

**A\* 的效率**：

$$\text{有效分支因子} = b^* : N = 1 + b^* + (b^*)^2 + ...$$

### 2.3 对抗搜索

**Minimax 算法**：

$$V(s) = \begin{cases} \text{utility}(s) & \text{终止状态} \\ \max_{a}V(\text{result}(s,a)) & \text{MAX 节点} \\ \min_{a}V(\text{result}(s,a)) & \text{MIN 节点} \end{cases}$$

**Alpha-Beta 剪枝**：

- $\alpha$：MAX 节点当前最优值
- $\beta$：MIN 节点当前最优值
- 剪枝条件：$\alpha \geq \beta$

最佳情况下搜索节点数：$O(b^{d/2})$

## 3. 知识表示与推理

### 3.1 一阶谓词逻辑

**基本元素**：

- 常量：John, 5
- 变量：$x$, $y$
- 谓词：$Likes(x, y)$
- 函数：$Father(John)$
- 量词：$\forall$, $\exists$

**推理规则**：

- 假言推理（Modus Ponens）：$P, P \to Q \vdash Q$
- 全称实例化：$\forall x P(x) \vdash P(a)$
- 存在实例化：$\exists x P(x) \vdash P(c)$

### 3.2 语义网络

用图结构表示概念间的关系：

```
[鸟] --is-a--> [动物]
[企鹅] --is-a--> [鸟]
[企鹅] --cannot--> [飞]
```

### 3.3 本体论

使用 OWL（Web Ontology Language）定义概念层次和关系：

- 类（Class）
- 属性（Property）
- 个体（Individual）
- 公理（Axiom）

## 4. 机器学习

### 4.1 学习范式

| 范式       | 训练数据        | 目标       |
| ---------- | --------------- | ---------- |
| 监督学习   | 标注数据        | 预测标签   |
| 无监督学习 | 无标注数据      | 发现结构   |
| 半监督学习 | 部分+大量无标注 | 预测标签   |
| 强化学习   | 环境反馈        | 最大化奖励 |
| 自监督学习 | 自生成标签      | 学习表示   |

### 4.2 线性回归

$$\hat{y} = \mathbf{w}^T \mathbf{x} + b$$

**损失函数（MSE）**：

$$L = \frac{1}{n}\sum_{i=1}^{n}(y_i - \hat{y}_i)^2$$

**正规方程**：

$$\mathbf{w}^* = (\mathbf{X}^T\mathbf{X})^{-1}\mathbf{X}^T\mathbf{y}$$

### 4.3 逻辑回归

$$P(y=1|\mathbf{x}) = \sigma(\mathbf{w}^T\mathbf{x} + b) = \frac{1}{1+e^{-(\mathbf{w}^T\mathbf{x}+b)}}$$

**交叉熵损失**：

$$L = -\frac{1}{n}\sum_{i=1}^{n}[y_i\log\hat{y}_i + (1-y_i)\log(1-\hat{y}_i)]$$

### 4.4 支持向量机（SVM）

**最大间隔**：

$$\max_{\mathbf{w},b} \frac{2}{\|\mathbf{w}\|} \quad \text{s.t.} \quad y_i(\mathbf{w}^T\mathbf{x}_i+b) \geq 1$$

**核技巧**：

$$K(\mathbf{x}_i, \mathbf{x}_j) = \phi(\mathbf{x}_i)^T\phi(\mathbf{x}_j)$$

常用核函数：

| 核函数   | 公式                                             |
| -------- | ------------------------------------------------ |
| 线性核   | $K = \mathbf{x}_i^T\mathbf{x}_j$                 |
| 多项式核 | $K = (\mathbf{x}_i^T\mathbf{x}_j + c)^d$         |
| RBF核    | $K = e^{-\gamma\|\mathbf{x}_i-\mathbf{x}_j\|^2}$ |

### 4.5 模型评估

| 指标    | 公式                              |
| ------- | --------------------------------- |
| 准确率  | $\frac{TP+TN}{TP+TN+FP+FN}$       |
| 精确率  | $\frac{TP}{TP+FP}$                |
| 召回率  | $\frac{TP}{TP+FN}$                |
| F1      | $2 \times \frac{P \times R}{P+R}$ |
| AUC-ROC | ROC曲线下面积                     |

**偏差-方差权衡**：

$$\text{泛化误差} = \text{偏差}^2 + \text{方差} + \text{噪声}$$

## 5. 神经网络

### 5.1 多层感知机（MLP）

$$\mathbf{h} = \sigma(\mathbf{W}_1\mathbf{x} + \mathbf{b}_1)$$

$$\mathbf{y} = \mathbf{W}_2\mathbf{h} + \mathbf{b}_2$$

**反向传播**：

$$\frac{\partial L}{\partial \mathbf{W}} = \frac{\partial L}{\partial \mathbf{y}} \cdot \frac{\partial \mathbf{y}}{\partial \mathbf{h}} \cdot \frac{\partial \mathbf{h}}{\partial \mathbf{W}}$$

### 5.2 常用激活函数

| 函数       | 公式                | 特点               |
| ---------- | ------------------- | ------------------ |
| ReLU       | $\max(0, x)$        | 计算快，有死亡问题 |
| Leaky ReLU | $\max(\alpha x, x)$ | 缓解死亡           |
| GELU       | $x\Phi(x)$          | Transformer 常用   |
| Swish      | $x\sigma(\beta x)$  | 平滑               |

### 5.3 优化算法

| 算法     | 更新规则                                           |
| -------- | -------------------------------------------------- |
| SGD      | $\theta = \theta - \eta \nabla L$                  |
| Momentum | $v = \beta v + \nabla L, \theta = \theta - \eta v$ |
| Adam     | 结合 Momentum 和 RMSProp                           |

**Adam 更新规则**：

$$m_t = \beta_1 m_{t-1} + (1-\beta_1)g_t$$

$$v_t = \beta_2 v_{t-1} + (1-\beta_2)g_t^2$$

$$\theta_t = \theta_{t-1} - \frac{\eta}{\sqrt{\hat{v}_t}+\epsilon}\hat{m}_t$$

### 5.4 正则化技术

| 技术       | 方法                      | 防止           |
| ---------- | ------------------------- | -------------- |
| Dropout    | 随机丢弃神经元            | 过拟合         |
| L2 正则    | $\lambda\|\mathbf{w}\|^2$ | 过拟合         |
| Batch Norm | 归一化层输入              | 内部协变量偏移 |
| 数据增强   | 扩充训练数据              | 过拟合         |
| 早停       | 验证集性能下降时停止      | 过拟合         |

## 6. 深度学习

### 6.1 CNN（卷积神经网络）

核心操作：

- 卷积：提取局部特征
- 池化：降维，增强平移不变性
- 全连接：分类决策

经典架构：

| 网络         | 年份 | 创新          |
| ------------ | ---- | ------------- |
| LeNet        | 1998 | 开创性 CNN    |
| AlexNet      | 2012 | ReLU、Dropout |
| VGG          | 2014 | 小卷积核堆叠  |
| ResNet       | 2015 | 残差连接      |
| EfficientNet | 2019 | 复合缩放      |

**残差连接**：

$$\mathbf{y} = F(\mathbf{x}) + \mathbf{x}$$

解决深层网络的梯度消失问题。

### 6.2 Transformer

**自注意力机制**：

$$\text{Attention}(Q, K, V) = \text{softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right)V$$

**多头注意力**：

$$\text{MultiHead}(Q,K,V) = \text{Concat}(\text{head}_1, ..., \text{head}_h)W^O$$

$$\text{head}_i = \text{Attention}(QW_i^Q, KW_i^K, VW_i^V)$$

### 6.3 大语言模型（LLM）

基于 Transformer Decoder 的生成式模型：

- GPT 系列：自回归生成
- BERT：双向编码
- LLaMA：开源大模型

**缩放定律**：

$$L(N) \approx \left(\frac{N_c}{N}\right)^{\alpha}$$

模型性能随参数量 $N$、数据量 $D$、计算量 $C$ 的增加而可预测地提升。
