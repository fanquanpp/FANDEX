---
order: 66
title: Python与深度学习
module: python
category: Python
difficulty: advanced
description: PyTorch与TensorFlow
author: fanquanpp
updated: '2026-06-14'
related:
  - python/Python与GraphQL
  - python/Python与机器学习
  - python/Python与NLP
  - python/Python与计算机视觉
prerequisites:
  - python/语法速查
---

# Python 与深度学习：从感知机到 Transformer 的工程化全景

> "Deep learning is a particular kind of machine learning that achieves great power and flexibility by representing the world as a nested hierarchy of concepts, with each concept defined in relation to simpler concepts." —— Ian Goodfellow, *Deep Learning* (2016)

## 摘要

本文档系统阐述 Python 在深度学习（Deep Learning）领域的工程化实践，覆盖 PyTorch 与 TensorFlow 两大主流框架的设计哲学、计算图模型、自动微分原理、分布式训练与部署优化。内容对标 MIT 6.S191、Stanford CS231n/CS224n、CMU 11-785 等顶级课程水准，从数学原理（前向/反向传播、链式法则、梯度下降）出发，结合 PEP 8 与生产级工程实践，给出可在 GPU/TPU 上运行的企业级代码示例。涵盖图像分类（ResNet）、序列建模（LSTM/Transformer）、生成模型（GAN/VAE）等典型场景，并讨论 ONNX、TensorRT、TorchScript 等推理优化方案。最后通过 OpenAI GPT、Meta LLaMA、Google AlphaFold 等真实案例，剖析 Python 在大规模深度学习系统中的角色与边界。

---

## 1. 学习目标

### 1.1 Bloom 认知层级映射

| 层级 | 行为动词 | 具体目标 |
| ---- | -------- | -------- |
| Remember（记忆） | 列举、识别 | 列出 PyTorch/TensorFlow 核心组件（Tensor、autograd、nn.Module、optimizer） |
| Understand（理解） | 解释、归纳 | 解释自动微分、反向传播、计算图的原理与区别 |
| Apply（应用） | 实现、训练 | 实现并训练 MLP、CNN、RNN、Transformer 等典型模型 |
| Analyze（分析） | 比较、解构 | 比较 PyTorch 动态图与 TensorFlow 静态图的优劣 |
| Evaluate（评价） | 评判、辩护 | 选择合适的优化器、学习率策略、正则化方法 |
| Create（创造） | 设计、部署 | 设计端到端深度学习流水线：数据处理→训练→评估→部署 |

### 1.2 预期能力

阅读完毕后，读者应能够：

1. 精确描述前向传播、反向传播、链式法则的数学推导
2. 在 PyTorch 与 TensorFlow 中实现自定义层、损失函数、优化器
3. 使用混合精度训练（AMP）、分布式数据并行（DDP）加速训练
4. 通过 ONNX、TorchScript、TensorRT 将模型部署到生产环境
5. 诊断并修复梯度消失/爆炸、过拟合、欠拟合等典型问题
6. 评估 Transformer、扩散模型等前沿架构的工程化适配

---

## 2. 历史动机与发展脉络

### 2.1 神经网络的前 Python 时代（1943-2006）

深度学习的数学根基可追溯至 1943 年 McCulloch-Pitts 神经元模型：

$$
y = \sigma\left(\sum_{i=1}^{n} w_i x_i + b\right)
$$

关键里程碑：

- **1958** Rosenblatt 提出感知机（Perceptron），首次实现可学习权重
- **1986** Rumelhart、Hinton、Williams 系统化反向传播算法（BP）
- **1989** LeCun 提出 CNN（LeNet），应用于手写数字识别
- **1997** Hochreiter、Schmidhuber 提出 LSTM，解决长序列梯度消失
- **2006** Hinton 提出 Deep Belief Network，开启深度学习复兴

此阶段主流实现为 C/C++/MATLAB，Python 仅作为脚本语言辅助实验。

### 2.2 Theano：Python 深度学习的奠基（2007-2017）

2007 年蒙特利尔大学 MILA 实验室（Yoshua Bengio 团队）发布 Theano，首次将 Python 与符号微分结合：

```python
# Theano 风格（已停止维护）
import theano
import theano.tensor as T

x = T.dscalar('x')
y = x ** 2
gy = T.grad(y, x)
f = theano.function([x], gy)
f(4.0)  # 输出 8.0
```

Theano 的核心贡献：

1. **符号计算图**：Python 表达式编译为 C/CUDA 代码
2. **自动微分**：基于计算图的精确梯度
3. **GPU 加速**：透明地迁移到 NVIDIA CUDA

2017 年 Theano 停止维护，但其设计思想被 TensorFlow 与 PyTorch 继承。

### 2.3 TensorFlow：Google 的工业级框架（2015-）

2015 年 11 月 Google Brain 团队发布 TensorFlow 1.0，核心特征：

- **静态计算图**：先定义图，再执行（deferred execution）
- **tf.Session**：显式会话管理
- **XLA**：Just-In-Time 编译优化
- **TPU 支持**：原生 Google TPU 适配

```python
# TensorFlow 1.x 风格
import tensorflow as tf

x = tf.placeholder(tf.float32, [None, 784])
W = tf.Variable(tf.zeros([784, 10]))
b = tf.Variable(tf.zeros([10]))
y = tf.nn.softmax(tf.matmul(x, W) + b)

with tf.Session() as sess:
    sess.run(tf.global_variables_initializer())
    # ...
```

2019 年 TensorFlow 2.0 引入 Eager Execution，向 PyTorch 看齐：

```python
# TensorFlow 2.x 风格
import tensorflow as tf

x = tf.constant([[1.0, 2.0], [3.0, 4.0]])
with tf.GradientTape() as tape:
    tape.watch(x)
    y = tf.reduce_sum(x ** 2)
grad = tape.gradient(y, x)  # 即时求导
```

### 2.4 PyTorch：Meta 的动态图革命（2016-）

2016 年 1 月 Meta AI（原 Facebook AI Research）发布 PyTorch 0.1，核心创新：

- **动态计算图**：每次前向传播构建新图，与 Python 控制流无缝集成
- **Pythonic API**：直接复用 Python 的 `if`、`for`、`while`
- **Define-by-Run**：运行时定义图，调试友好

```python
# PyTorch 风格
import torch

x = torch.tensor([1.0, 2.0, 3.0], requires_grad=True)
y = (x ** 2).sum()
y.backward()  # 自动求导
print(x.grad)  # tensor([2., 4., 6.])
```

PyTorch 在研究领域迅速占据主导地位。NeurIPS 2023 论文中 PyTorch 占比超过 80%。

### 2.5 Keras：高层 API 的标准化（2015-）

2015 年 François Chollet 发布 Keras，提供高层神经网络 API：

```python
# Keras 风格
from tensorflow import keras
from tensorflow.keras import layers

model = keras.Sequential([
    layers.Dense(256, activation='relu', input_shape=(784,)),
    layers.Dropout(0.5),
    layers.Dense(10, activation='softmax'),
])
model.compile(optimizer='adam', loss='categorical_crossentropy', metrics=['accuracy'])
```

2019 年 Keras 成为 TensorFlow 2.x 的官方高级 API。

### 2.6 Hugging Face Transformers：模型生态统一（2018-）

2018 年 Hugging Face 发布 Transformers 库，统一了 BERT、GPT、T5 等预训练模型接口：

```python
from transformers import pipeline

classifier = pipeline("sentiment-analysis")
result = classifier("Deep learning with Python is amazing!")
```

Transformers 已成为 NLP 与多模态模型的事实标准，支持 PyTorch 与 TensorFlow 后端。

### 2.7 JAX：下一代数值计算（2018-）

Google DeepMind 与 Google Brain 联合开发 JAX，提供：

- **可微分的 NumPy**：`jit`、`grad`、`vmap`、`pmap` 函数式变换
- **XLA 编译**：跨 CPU/GPU/TPU 高性能
- **函数式风格**：无副作用，可组合

```python
import jax
import jax.numpy as jnp

def square_sum(x):
    return jnp.sum(x ** 2)

grad_fn = jax.grad(square_sum)
print(grad_fn(jnp.array([1.0, 2.0, 3.0])))  # [2. 4. 6.]
```

JAX 在 AlphaFold 2、Gemini 等大型项目中扮演重要角色。

### 2.8 时间线一览

| 年份 | 框架/事件 | 影响 |
| ---- | --------- | ---- |
| 2007 | Theano 发布 | Python 深度学习奠基 |
| 2015 | TensorFlow 1.0 | 工业级部署 |
| 2015 | Keras 发布 | 高层 API 标准化 |
| 2016 | PyTorch 0.1 | 动态图革命 |
| 2018 | Hugging Face Transformers | 预训练模型生态 |
| 2018 | JAX 发布 | 函数式数值计算 |
| 2019 | TensorFlow 2.0 | Eager Execution |
| 2022 | PyTorch 2.0 (TorchDynamo) | JIT 编译加速 |
| 2023 | PyTorch 占 NeurIPS 80%+ | 研究主导地位 |
| 2024+ | Diffusion、MoE、多模态 | 大模型时代 |

---

## 3. 形式化定义

### 3.1 神经网络的数学定义

设深度神经网络 $f_\theta: \mathbb{R}^{d_\text{in}} \to \mathbb{R}^{d_\text{out}}$，由 $L$ 层组成：

$$
f_\theta(\mathbf{x}) = f_L \circ f_{L-1} \circ \dots \circ f_1(\mathbf{x})
$$

每层定义为：

$$
\mathbf{h}^{(l)} = \sigma\left(\mathbf{W}^{(l)} \mathbf{h}^{(l-1)} + \mathbf{b}^{(l)}\right), \quad \mathbf{h}^{(0)} = \mathbf{x}
$$

其中 $\sigma$ 为激活函数，$\theta = \{\mathbf{W}^{(l)}, \mathbf{b}^{(l)}\}_{l=1}^{L}$ 为参数集合。

### 3.2 损失函数

给定训练集 $\mathcal{D} = \{(\mathbf{x}_i, \mathbf{y}_i)\}_{i=1}^{N}$，损失函数定义为：

$$
\mathcal{L}(\theta) = \frac{1}{N} \sum_{i=1}^{N} \ell\left(f_\theta(\mathbf{x}_i), \mathbf{y}_i\right)
$$

常见损失函数：

- **均方误差（MSE）**：$\ell(\hat{\mathbf{y}}, \mathbf{y}) = \|\hat{\mathbf{y}} - \mathbf{y}\|_2^2$
- **交叉熵**：$\ell(\hat{\mathbf{y}}, \mathbf{y}) = -\sum_k y_k \log \hat{y}_k$
- **对比损失**：$\ell = -\log\left(\frac{\exp(\text{sim}(\mathbf{z}_i, \mathbf{z}_j^+))}{\sum_k \exp(\text{sim}(\mathbf{z}_i, \mathbf{z}_k^-))}\right)$

### 3.3 梯度下降与反向传播

梯度下降更新规则：

$$
\theta_{t+1} = \theta_t - \eta \nabla_\theta \mathcal{L}(\theta_t)
$$

其中 $\eta$ 为学习率。反向传播基于链式法则计算梯度：

$$
\frac{\partial \mathcal{L}}{\partial \mathbf{W}^{(l)}} = \frac{\partial \mathcal{L}}{\partial \mathbf{h}^{(l)}} \cdot \frac{\partial \mathbf{h}^{(l)}}{\partial \mathbf{W}^{(l)}}
$$

定义误差项 $\delta^{(l)} = \frac{\partial \mathcal{L}}{\partial \mathbf{z}^{(l)}}$，其中 $\mathbf{z}^{(l)} = \mathbf{W}^{(l)} \mathbf{h}^{(l-1)} + \mathbf{b}^{(l)}$，则递推公式为：

$$
\delta^{(l)} = \left(\mathbf{W}^{(l+1)}\right)^\top \delta^{(l+1)} \odot \sigma'\left(\mathbf{z}^{(l)}\right)
$$

$$
\frac{\partial \mathcal{L}}{\partial \mathbf{W}^{(l)}} = \delta^{(l)} \left(\mathbf{h}^{(l-1)}\right)^\top, \quad \frac{\partial \mathcal{L}}{\partial \mathbf{b}^{(l)}} = \delta^{(l)}
$$

### 3.4 计算图形式化

计算图为有向无环图（DAG）$G = (V, E)$，节点 $v \in V$ 表示张量或操作，边 $e \in E$ 表示数据依赖。

形式化定义前向传播：

$$
v_i = \text{op}_i(\{v_j \mid (v_j, v_i) \in E\})
$$

反向传播按拓扑逆序计算梯度：

$$
\frac{\partial \mathcal{L}}{\partial v_j} = \sum_{i: (v_j, v_i) \in E} \frac{\partial \mathcal{L}}{\partial v_i} \cdot \frac{\partial v_i}{\partial v_j}
$$

### 3.5 自动微分（Autodiff）

自动微分分为两种模式：

**模式 1：前向模式（Forward Mode）**

$$
\dot{v}_j = \sum_{i: (v_i, v_j) \in E} \frac{\partial v_j}{\partial v_i} \dot{v}_i
$$

适合输入维度小于输出维度的场景。

**模式 2：反向模式（Reverse Mode）**

$$
\bar{v}_j = \sum_{i: (v_j, v_i) \in E} \bar{v}_i \frac{\partial v_i}{\partial v_j}
$$

适合输入维度远大于输出维度（如损失函数：千万元参数 → 1 个标量）。

PyTorch 与 TensorFlow 默认使用反向模式自动微分。

### 3.6 Tensor 对象协议

PyTorch Tensor 与 TensorFlow Tensor 都遵循类似的张量协议：

| 属性 | PyTorch | TensorFlow | 说明 |
| ---- | ------- | ---------- | ---- |
| 形状 | `tensor.shape` | `tensor.shape` | 张量维度 |
| 数据类型 | `tensor.dtype` | `tensor.dtype` | 元素类型 |
| 设备 | `tensor.device` | `tensor.device` | CPU/GPU/TPU |
| 梯度 | `tensor.grad` | `tensor`（在 GradientTape 中） | 反向传播梯度 |
| 计算图 | `tensor.grad_fn` | `tensor`（KerasTape） | 构造图的函数 |

### 3.7 优化器形式化

**SGD（随机梯度下降）**：

$$
\theta_{t+1} = \theta_t - \eta g_t, \quad g_t = \nabla_\theta \mathcal{L}(\theta_t; \mathcal{B}_t)
$$

**Momentum**：

$$
v_t = \beta v_{t-1} + g_t, \quad \theta_{t+1} = \theta_t - \eta v_t
$$

**Adam**：

$$
m_t = \beta_1 m_{t-1} + (1 - \beta_1) g_t
$$

$$
v_t = \beta_2 v_{t-1} + (1 - \beta_2) g_t^2
$$

$$
\hat{m}_t = \frac{m_t}{1 - \beta_1^t}, \quad \hat{v}_t = \frac{v_t}{1 - \beta_2^t}
$$

$$
\theta_{t+1} = \theta_t - \eta \frac{\hat{m}_t}{\sqrt{\hat{v}_t} + \epsilon}
$$

---

## 4. 理论推导与原理解析

### 4.1 反向传播的链式法则

考虑 3 层网络 $f(\mathbf{x}) = \sigma_3(\mathbf{W}_3 \sigma_2(\mathbf{W}_2 \sigma_1(\mathbf{W}_1 \mathbf{x})))$，损失 $\mathcal{L} = \|f(\mathbf{x}) - \mathbf{y}\|^2$。

逐层推导：

$$
\frac{\partial \mathcal{L}}{\partial \mathbf{W}_3} = 2(f(\mathbf{x}) - \mathbf{y}) \cdot \sigma_3'(\mathbf{z}_3) \cdot \mathbf{h}_2^\top
$$

$$
\frac{\partial \mathcal{L}}{\partial \mathbf{W}_2} = \left(\mathbf{W}_3^\top \delta_3\right) \odot \sigma_2'(\mathbf{z}_2) \cdot \mathbf{h}_1^\top
$$

$$
\frac{\partial \mathcal{L}}{\partial \mathbf{W}_1} = \left(\mathbf{W}_2^\top \delta_2\right) \odot \sigma_1'(\mathbf{z}_1) \cdot \mathbf{x}^\top
$$

### 4.2 梯度消失与梯度爆炸

对于深度 $L$ 层网络，梯度包含 $\prod_{l=1}^{L} \mathbf{W}^{(l)} \odot \sigma'(\mathbf{z}^{(l)})$ 项。

- 若 $\|\mathbf{W}^{(l)} \sigma'\| < 1$，梯度指数衰减 → **梯度消失**
- 若 $\|\mathbf{W}^{(l)} \sigma'\| > 1$，梯度指数增长 → **梯度爆炸**

数学分析：设激活函数为 Sigmoid $\sigma(z) = 1/(1 + e^{-z})$，则 $\sigma'(z) \leq 0.25$。当 $L = 10$ 时，梯度衰减因子 $\leq 0.25^{10} \approx 10^{-6}$。

**解决方案**：

1. **ReLU 激活**：$\sigma'(z) = 1$（当 $z > 0$），缓解梯度消失
2. **残差连接**（ResNet）：$\mathbf{h}^{(l+1)} = \mathbf{h}^{(l)} + f(\mathbf{h}^{(l)})$，梯度恒等通路
3. **LayerNorm**：稳定激活值分布
4. **梯度裁剪**：$\mathbf{g} \leftarrow \min(1, \|\mathbf{g}\|_{\max} / \|\mathbf{g}\|) \cdot \mathbf{g}$

### 4.3 卷积运算的形式化

二维卷积定义：

$$
(I * K)(i, j) = \sum_{m} \sum_{n} I(i - m, j - n) K(m, n)
$$

在 CNN 中实际为互相关（cross-correlation）：

$$
(I \star K)(i, j) = \sum_{m} \sum_{n} I(i + m, j + n) K(m, n)
$$

参数量与计算量：

- **参数量**：$C_\text{out} \times C_\text{in} \times k_h \times k_w + C_\text{out}$（含偏置）
- **计算量（FLOPs）**：$2 \times C_\text{out} \times C_\text{in} \times k_h \times k_w \times H_\text{out} \times W_\text{out}$

### 4.4 Transformer 自注意力机制

 scaled dot-product attention：

$$
\text{Attention}(Q, K, V) = \text{softmax}\left(\frac{QK^\top}{\sqrt{d_k}}\right) V
$$

其中 $Q \in \mathbb{R}^{n \times d_k}$, $K \in \mathbb{R}^{n \times d_k}$, $V \in \mathbb{R}^{n \times d_v}$。

多头注意力（Multi-Head Attention）：

$$
\text{MultiHead}(Q, K, V) = \text{Concat}(\text{head}_1, \dots, \text{head}_h) W^O
$$

$$
\text{head}_i = \text{Attention}(QW_i^Q, KW_i^K, VW_i^V)
$$

复杂度分析：

- 自注意力：$O(n^2 \cdot d)$
- FFN：$O(n \cdot d^2)$
- 总计：$O(n^2 \cdot d + n \cdot d^2)$

### 4.5 反向传播的时间复杂度

对于含 $P$ 个参数的网络，反向传播的计算量约为前向的 2-3 倍：

$$
T_\text{backward} \approx 2 \cdot T_\text{forward}
$$

总训练时间：

$$
T_\text{train} \approx 3 \cdot N_\text{batch} \cdot N_\text{epoch} \cdot T_\text{forward}
$$

### 4.6 混合精度训练原理

混合精度使用 FP16（半精度）存储与计算，FP32（单精度）累积梯度：

$$
\text{loss}_{\text{FP32}} = \text{cast}_{\text{FP32}}\left(\text{loss}_{\text{FP16}}\right) \cdot \text{scale}
$$

通过 loss scaling 避免小梯度下溢：

```python
# AMP (Automatic Mixed Precision) 原理
with autocast():
    output = model(input)
    loss = loss_fn(output, target)

scaler.scale(loss).backward()
scaler.step(optimizer)
scaler.update()
```

实测加速：NVIDIA A100 上 ResNet-50 训练速度提升 2-3 倍。

### 4.7 分布式数据并行（DDP）

DDP 核心思想：每个 GPU 持有完整模型副本，处理不同数据分片，反向传播后通过 AllReduce 同步梯度。

数学表达：

$$
g_\text{global} = \frac{1}{N_\text{GPU}} \sum_{i=1}^{N_\text{GPU}} g_i
$$

Ring-AllReduce 算法复杂度：

$$
T_\text{AllReduce} = \frac{2(N-1)}{N} \cdot \frac{|g|}{B}
$$

其中 $N$ 为 GPU 数，$B$ 为带宽，$|g|$ 为梯度大小。

---

## 5. 代码示例（企业级 production-ready）

### 5.1 项目配置：`pyproject.toml`

```toml
[project]
name = "deep-learning-pipeline"
version = "0.1.0"
description = "Production-ready deep learning pipeline"
requires-python = ">=3.10"
authors = [{name = "FANDEX Team"}]

dependencies = [
    "torch>=2.1",
    "torchvision>=0.16",
    "torchaudio>=2.1",
    "numpy>=1.26",
    "pillow>=10.0",
    "tqdm>=4.66",
    "tensorboard>=2.15",
    "mlflow>=2.8",
]

[project.optional-dependencies]
dev = [
    "pytest>=7.4",
    "pytest-benchmark>=4.0",
    "mypy>=1.7",
    "ruff>=0.1.6",
    "onnx>=1.15",
    "onnxruntime>=1.16",
]

[tool.ruff]
line-length = 100
target-version = "py310"
select = ["E", "F", "I", "N", "UP"]

[tool.mypy]
python_version = "3.10"
strict = true
ignore_missing_imports = true

[tool.pytest.ini_options]
testpaths = ["tests"]
```

### 5.2 PyTorch 基础：MLP 训练 MNIST

```python
"""PyTorch 实现 MLP 训练 MNIST。

Python 3.10+ / PyTorch 2.1+
"""
from __future__ import annotations

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
from torchvision import datasets, transforms
from tqdm import tqdm


class MLP(nn.Module):
    """多层感知机。"""

    def __init__(self, in_features: int = 784, hidden: int = 256, num_classes: int = 10) -> None:
        super().__init__()
        self.flatten = nn.Flatten()
        self.fc1 = nn.Linear(in_features, hidden)
        self.relu = nn.ReLU()
        self.dropout = nn.Dropout(0.5)
        self.fc2 = nn.Linear(hidden, num_classes)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.flatten(x)
        x = self.relu(self.fc1(x))
        x = self.dropout(x)
        return self.fc2(x)


def get_dataloaders(batch_size: int = 64) -> tuple[DataLoader, DataLoader]:
    """加载 MNIST 数据集。"""
    transform = transforms.Compose([
        transforms.ToTensor(),
        transforms.Normalize((0.1307,), (0.3081,)),
    ])
    train_set = datasets.MNIST("./data", train=True, download=True, transform=transform)
    test_set = datasets.MNIST("./data", train=False, transform=transform)
    return (
        DataLoader(train_set, batch_size=batch_size, shuffle=True, num_workers=4),
        DataLoader(test_set, batch_size=1000, shuffle=False, num_workers=4),
    )


def train(
    model: nn.Module,
    device: torch.device,
    train_loader: DataLoader,
    optimizer: optim.Optimizer,
    criterion: nn.Module,
    epoch: int,
) -> float:
    """训练一个 epoch。"""
    model.train()
    total_loss = 0.0
    for data, target in tqdm(train_loader, desc=f"Epoch {epoch}"):
        data, target = data.to(device), target.to(device)
        optimizer.zero_grad()
        output = model(data)
        loss = criterion(output, target)
        loss.backward()
        optimizer.step()
        total_loss += loss.item() * data.size(0)
    return total_loss / len(train_loader.dataset)


def evaluate(model: nn.Module, device: torch.device, test_loader: DataLoader) -> float:
    """评估模型。"""
    model.eval()
    correct = 0
    with torch.no_grad():
        for data, target in test_loader:
            data, target = data.to(device), target.to(device)
            output = model(data)
            pred = output.argmax(dim=1)
            correct += (pred == target).sum().item()
    return correct / len(test_loader.dataset)


def main() -> None:
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")

    train_loader, test_loader = get_dataloaders(batch_size=64)
    model = MLP().to(device)
    optimizer = optim.Adam(model.parameters(), lr=1e-3)
    criterion = nn.CrossEntropyLoss()

    for epoch in range(1, 11):
        loss = train(model, device, train_loader, optimizer, criterion, epoch)
        acc = evaluate(model, device, test_loader)
        print(f"Epoch {epoch}: loss={loss:.4f}, accuracy={acc:.4f}")


if __name__ == "__main__":
    main()
```

### 5.3 CNN：CIFAR-10 图像分类

```python
"""CNN 实现 CIFAR-10 分类（ResNet-18 微调）。

Python 3.10+ / PyTorch 2.1+
"""
from __future__ import annotations

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
from torchvision import datasets, transforms, models


def get_resnet18(num_classes: int = 10, pretrained: bool = True) -> nn.Module:
    """加载 ResNet-18 并适配 CIFAR-10。"""
    weights = models.ResNet18_Weights.DEFAULT if pretrained else None
    model = models.resnet18(weights=weights)
    # 修改第一层卷积以适配 32x32 输入（CIFAR-10）
    model.conv1 = nn.Conv2d(3, 64, kernel_size=3, stride=1, padding=1, bias=False)
    model.maxpool = nn.Identity()
    # 修改分类头
    model.fc = nn.Linear(model.fc.in_features, num_classes)
    return model


def get_cifar10_loaders(batch_size: int = 128) -> tuple[DataLoader, DataLoader]:
    """CIFAR-10 数据加载器。"""
    transform_train = transforms.Compose([
        transforms.RandomCrop(32, padding=4),
        transforms.RandomHorizontalFlip(),
        transforms.ToTensor(),
        transforms.Normalize((0.4914, 0.4822, 0.4465), (0.2470, 0.2435, 0.2616)),
    ])
    transform_test = transforms.Compose([
        transforms.ToTensor(),
        transforms.Normalize((0.4914, 0.4822, 0.4465), (0.2470, 0.2435, 0.2616)),
    ])
    train_set = datasets.CIFAR10("./data", train=True, download=True, transform=transform_train)
    test_set = datasets.CIFAR10("./data", train=False, transform=transform_test)
    return (
        DataLoader(train_set, batch_size=batch_size, shuffle=True, num_workers=4, pin_memory=True),
        DataLoader(test_set, batch_size=256, shuffle=False, num_workers=4),
    )


def train_one_epoch(
    model: nn.Module,
    loader: DataLoader,
    optimizer: optim.Optimizer,
    criterion: nn.Module,
    device: torch.device,
    scaler: torch.cuda.amp.GradScaler | None = None,
) -> float:
    """训练一个 epoch（支持混合精度）。"""
    model.train()
    total, total_loss = 0, 0.0
    for x, y in loader:
        x, y = x.to(device), y.to(device)
        optimizer.zero_grad()
        if scaler is not None:
            with torch.cuda.amp.autocast():
                out = model(x)
                loss = criterion(out, y)
            scaler.scale(loss).backward()
            scaler.step(optimizer)
            scaler.update()
        else:
            out = model(x)
            loss = criterion(out, y)
            loss.backward()
            optimizer.step()
        total += x.size(0)
        total_loss += loss.item() * x.size(0)
    return total_loss / total
```

### 5.4 自定义层与激活函数

```python
"""自定义层与激活函数。

Python 3.10+ / PyTorch 2.1+
"""
from __future__ import annotations

import torch
import torch.nn as nn
import torch.nn.functional as F


class Swish(nn.Module):
    """Swish 激活函数: x * sigmoid(x)。"""

    def __init__(self, beta: float = 1.0) -> None:
        super().__init__()
        self.beta = beta

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return x * torch.sigmoid(self.beta * x)


class LayerNorm(nn.Module):
    """自定义 LayerNorm 实现。"""

    def __init__(self, normalized_shape: int, eps: float = 1e-5) -> None:
        super().__init__()
        self.gamma = nn.Parameter(torch.ones(normalized_shape))
        self.beta = nn.Parameter(torch.zeros(normalized_shape))
        self.eps = eps

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        mean = x.mean(dim=-1, keepdim=True)
        var = x.var(dim=-1, keepdim=True, unbiased=False)
        x_norm = (x - mean) / torch.sqrt(var + self.eps)
        return self.gamma * x_norm + self.beta


class SelfAttention(nn.Module):
    """单头自注意力。"""

    def __init__(self, embed_dim: int) -> None:
        super().__init__()
        self.q = nn.Linear(embed_dim, embed_dim)
        self.k = nn.Linear(embed_dim, embed_dim)
        self.v = nn.Linear(embed_dim, embed_dim)
        self.scale = embed_dim ** -0.5

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x: (batch, seq, embed)
        q = self.q(x)
        k = self.k(x)
        v = self.v(x)
        attn = torch.softmax(torch.bmm(q, k.transpose(1, 2)) * self.scale, dim=-1)
        return torch.bmm(attn, v)


# 测试
if __name__ == "__main__":
    swish = Swish()
    x = torch.randn(2, 3, 4)
    print(f"Swish output shape: {swish(x).shape}")

    ln = LayerNorm(4)
    print(f"LayerNorm output shape: {ln(x).shape}")

    attn = SelfAttention(4)
    print(f"Self-Attention output shape: {attn(x).shape}")
```

### 5.5 自定义损失函数

```python
"""自定义损失函数。

Python 3.10+ / PyTorch 2.1+
"""
from __future__ import annotations

import torch
import torch.nn as nn
import torch.nn.functional as F


class FocalLoss(nn.Module):
    """Focal Loss，解决类别不平衡问题。

    Reference: Lin et al. 2017. Focal Loss for Dense Object Detection.
    """

    def __init__(self, alpha: float = 0.25, gamma: float = 2.0) -> None:
        super().__init__()
        self.alpha = alpha
        self.gamma = gamma

    def forward(self, logits: torch.Tensor, targets: torch.Tensor) -> torch.Tensor:
        ce_loss = F.cross_entropy(logits, targets, reduction="none")
        pt = torch.exp(-ce_loss)
        loss = self.alpha * (1 - pt) ** self.gamma * ce_loss
        return loss.mean()


class ContrastiveLoss(nn.Module):
    """对比学习损失（SimCLR 风格）。"""

    def __init__(self, temperature: float = 0.1) -> None:
        super().__init__()
        self.temperature = temperature

    def forward(self, z_i: torch.Tensor, z_j: torch.Tensor) -> torch.Tensor:
        """计算对比损失。

        Args:
            z_i: (batch, dim) 同一样本的增强视图 1 的表示
            z_j: (batch, dim) 同一样本的增强视图 2 的表示
        """
        batch_size = z_i.size(0)
        z = torch.cat([z_i, z_j], dim=0)  # (2B, dim)
        z = F.normalize(z, dim=1)
        sim = torch.mm(z, z.t()) / self.temperature  # (2B, 2B)

        # 构造正样本 mask
        mask = torch.eye(2 * batch_size, dtype=torch.bool, device=z.device)
        sim.masked_fill_(mask, -1e9)

        # 正样本对索引
        labels = torch.cat([torch.arange(batch_size) + batch_size, torch.arange(batch_size)]).to(z.device)
        return F.cross_entropy(sim, labels)


if __name__ == "__main__":
    focal = FocalLoss()
    logits = torch.randn(8, 10)
    targets = torch.randint(0, 10, (8,))
    print(f"Focal Loss: {focal(logits, targets):.4f}")

    contrastive = ContrastiveLoss()
    z_i = torch.randn(8, 128)
    z_j = torch.randn(8, 128)
    print(f"Contrastive Loss: {contrastive(z_i, z_j):.4f}")
```

### 5.6 自定义优化器

```python
"""自定义 AdamW 优化器（解耦权重衰减）。

Python 3.10+ / PyTorch 2.1+
"""
from __future__ import annotations

import torch
from torch.optim import Optimizer


class AdamW(Optimizer):
    """AdamW 优化器实现。

    Reference: Loshchilov & Hutter 2017. Decoupled Weight Decay Regularization.
    """

    def __init__(
        self,
        params,
        lr: float = 1e-3,
        betas: tuple[float, float] = (0.9, 0.999),
        eps: float = 1e-8,
        weight_decay: float = 1e-2,
    ) -> None:
        defaults = {"lr": lr, "betas": betas, "eps": eps, "weight_decay": weight_decay}
        super().__init__(params, defaults)

    @torch.no_grad()
    def step(self, closure=None) -> float | None:
        loss = closure() if closure is not None else None
        for group in self.param_groups:
            lr = group["lr"]
            beta1, beta2 = group["betas"]
            eps = group["eps"]
            wd = group["weight_decay"]

            for p in group["params"]:
                if p.grad is None:
                    continue
                grad = p.grad
                state = self.state[p]

                if len(state) == 0:
                    state["step"] = 0
                    state["m"] = torch.zeros_like(p)
                    state["v"] = torch.zeros_like(p)

                m, v = state["m"], state["v"]
                state["step"] += 1
                t = state["step"]

                # Adam 更新
                m.mul_(beta1).add_(grad, alpha=1 - beta1)
                v.mul_(beta2).addcmul_(grad, grad, value=1 - beta2)
                m_hat = m / (1 - beta1**t)
                v_hat = v / (1 - beta2**t)
                p.add_(m_hat / (v_hat.sqrt() + eps), alpha=-lr)

                # 解耦权重衰减
                p.mul_(1 - lr * wd)

        return loss
```

### 5.7 数据加载与增强

```python
"""数据加载与增强流水线。

Python 3.10+ / PyTorch 2.1+
"""
from __future__ import annotations

from pathlib import Path

import torch
from torch.utils.data import Dataset
from torchvision import transforms
from PIL import Image


class ImageFolderDataset(Dataset):
    """自定义图像数据集。"""

    def __init__(
        self,
        root: Path,
        transform: transforms.Compose | None = None,
        extensions: tuple[str, ...] = (".jpg", ".jpeg", ".png"),
    ) -> None:
        self.root = Path(root)
        self.transform = transform
        self.samples: list[tuple[Path, int]] = []

        classes = sorted(d.name for d in self.root.iterdir() if d.is_dir())
        self.class_to_idx = {c: i for i, c in enumerate(classes)}

        for cls in classes:
            cls_dir = self.root / cls
            for f in cls_dir.iterdir():
                if f.suffix.lower() in extensions:
                    self.samples.append((f, self.class_to_idx[cls]))

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, idx: int) -> tuple[torch.Tensor, int]:
        path, label = self.samples[idx]
        img = Image.open(path).convert("RGB")
        if self.transform is not None:
            img = self.transform(img)
        return img, label


def get_train_transforms(image_size: int = 224) -> transforms.Compose:
    """训练时的数据增强。"""
    return transforms.Compose([
        transforms.RandomResizedCrop(image_size, scale=(0.8, 1.0)),
        transforms.RandomHorizontalFlip(),
        transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2, hue=0.1),
        transforms.RandomRotation(15),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])


def get_eval_transforms(image_size: int = 224) -> transforms.Compose:
    """评估时的预处理。"""
    return transforms.Compose([
        transforms.Resize(image_size + 32),
        transforms.CenterCrop(image_size),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])
```

### 5.8 混合精度训练

```python
"""混合精度训练（AMP）。

Python 3.10+ / PyTorch 2.1+
"""
from __future__ import annotations

import torch
import torch.nn as nn
from torch.cuda.amp import GradScaler, autocast


def train_with_amp(
    model: nn.Module,
    optimizer: torch.optim.Optimizer,
    criterion: nn.Module,
    data_loader: torch.utils.data.DataLoader,
    device: torch.device,
    max_grad_norm: float = 1.0,
) -> float:
    """混合精度训练一个 epoch。"""
    model.train()
    scaler = GradScaler()
    total_loss = 0.0
    total = 0

    for batch_idx, (data, target) in enumerate(data_loader):
        data, target = data.to(device), target.to(device)
        optimizer.zero_grad()

        # 前向传播使用混合精度
        with autocast():
            output = model(data)
            loss = criterion(output, target)

        # 反向传播使用 GradScaler 防止梯度下溢
        scaler.scale(loss).backward()
        scaler.unscale_(optimizer)
        torch.nn.utils.clip_grad_norm_(model.parameters(), max_grad_norm)
        scaler.step(optimizer)
        scaler.update()

        total_loss += loss.item() * data.size(0)
        total += data.size(0)

    return total_loss / total
```

### 5.9 分布式训练（DDP）

```python
"""分布式数据并行训练（DDP）。

启动方式:
    torchrun --nproc_per_node=4 train_ddp.py

Python 3.10+ / PyTorch 2.1+
"""
from __future__ import annotations

import os

import torch
import torch.distributed as dist
import torch.multiprocessing as mp
import torch.nn as nn
from torch.nn.parallel import DistributedDataParallel as DDP
from torch.utils.data import DataLoader, DistributedSampler


def setup(rank: int, world_size: int) -> None:
    """初始化进程组。"""
    os.environ["MASTER_ADDR"] = "localhost"
    os.environ["MASTER_PORT"] = "12355"
    dist.init_process_group("nccl", rank=rank, world_size=world_size)


def cleanup() -> None:
    """清理进程组。"""
    dist.destroy_process_group()


def train_ddp(rank: int, world_size: int) -> None:
    """DDP 训练。"""
    setup(rank, world_size)
    torch.cuda.set_device(rank)

    model = nn.Linear(1000, 10).to(rank)
    ddp_model = DDP(model, device_ids=[rank])

    sampler = DistributedSampler(dataset, num_replicas=world_size, rank=rank, shuffle=True)
    loader = DataLoader(dataset, batch_size=64, sampler=sampler, num_workers=4)

    optimizer = torch.optim.Adam(ddp_model.parameters(), lr=1e-3)
    criterion = nn.CrossEntropyLoss()

    for epoch in range(10):
        sampler.set_epoch(epoch)  # 关键：确保每个 epoch 数据打乱
        for data, target in loader:
            data, target = data.to(rank), target.to(rank)
            optimizer.zero_grad()
            output = ddp_model(data)
            loss = criterion(output, target)
            loss.backward()
            optimizer.step()

    cleanup()


if __name__ == "__main__":
    world_size = torch.cuda.device_count()
    mp.spawn(train_ddp, args=(world_size,), nprocs=world_size, join=True)
```

### 5.10 模型导出与推理优化

```python
"""模型导出：TorchScript 与 ONNX。

Python 3.10+ / PyTorch 2.1+
"""
from __future__ import annotations

import torch
import torch.nn as nn


class SimpleModel(nn.Module):
    def __init__(self) -> None:
        super().__init__()
        self.fc = nn.Linear(784, 10)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.fc(x.view(x.size(0), -1))


def export_torchscript(model: nn.Module, path: str) -> None:
    """导出 TorchScript 模型。"""
    scripted = torch.jit.script(model)
    scripted.save(path)
    print(f"TorchScript 模型已保存到 {path}")


def export_onnx(model: nn.Module, path: str, input_shape: tuple = (1, 1, 28, 28)) -> None:
    """导出 ONNX 模型。"""
    dummy_input = torch.randn(*input_shape)
    torch.onnx.export(
        model,
        dummy_input,
        path,
        export_params=True,
        opset_version=17,
        do_constant_folding=True,
        input_names=["input"],
        output_names=["output"],
        dynamic_axes={"input": {0: "batch_size"}, "output": {0: "batch_size"}},
    )
    print(f"ONNX 模型已保存到 {path}")


def benchmark_inference(model: nn.Module, input_shape: tuple, n_iter: int = 100) -> float:
    """推理基准测试。"""
    model.eval()
    dummy = torch.randn(*input_shape)
    with torch.no_grad():
        # 预热
        for _ in range(10):
            _ = model(dummy)
        # 计时
        import time
        start = time.perf_counter()
        for _ in range(n_iter):
            _ = model(dummy)
        elapsed = time.perf_counter() - start
    return elapsed / n_iter * 1000  # ms


if __name__ == "__main__":
    model = SimpleModel().eval()
    export_torchscript(model, "model.pt")
    export_onnx(model, "model.onnx")
    latency = benchmark_inference(model, (1, 1, 28, 28))
    print(f"推理延迟: {latency:.3f} ms")
```

### 5.11 TensorFlow 2.x 等价实现

```python
"""TensorFlow 2.x Keras 实现 MNIST 分类。

Python 3.10+ / TensorFlow 2.15+
"""
from __future__ import annotations

import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers


def build_mlp(input_shape: tuple = (784,), num_classes: int = 10) -> keras.Model:
    """构建 MLP 模型。"""
    inputs = keras.Input(shape=input_shape)
    x = layers.Dense(256, activation="relu")(inputs)
    x = layers.Dropout(0.5)(x)
    outputs = layers.Dense(num_classes, activation="softmax")(x)
    return keras.Model(inputs, outputs)


def main() -> None:
    (x_train, y_train), (x_test, y_test) = keras.datasets.mnist.load_data()
    x_train = x_train.reshape(-1, 784).astype("float32") / 255.0
    x_test = x_test.reshape(-1, 784).astype("float32") / 255.0

    model = build_mlp()
    model.compile(
        optimizer=keras.optimizers.Adam(1e-3),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )

    history = model.fit(
        x_train, y_train,
        batch_size=64,
        epochs=10,
        validation_split=0.1,
        callbacks=[keras.callbacks.EarlyStopping(patience=3, restore_best_weights=True)],
    )
    test_loss, test_acc = model.evaluate(x_test, y_test, verbose=0)
    print(f"Test accuracy: {test_acc:.4f}")


if __name__ == "__main__":
    main()
```

### 5.12 Hugging Face Transformers 调用

```python
"""Hugging Face Transformers 文本分类。

Python 3.10+ / transformers 4.36+
"""
from __future__ import annotations

import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer


def sentiment_analysis(texts: list[str], model_name: str = "distilbert-base-uncased-finetuned-sst-2-english") -> list[dict]:
    """批量情感分析。"""
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModelForSequenceClassification.from_pretrained(model_name)

    inputs = tokenizer(texts, padding=True, truncation=True, max_length=512, return_tensors="pt")
    with torch.no_grad():
        outputs = model(**inputs)

    predictions = torch.nn.functional.softmax(outputs.logits, dim=-1)
    labels = ["NEGATIVE", "POSITIVE"]
    results = []
    for i, text in enumerate(texts):
        pred_idx = predictions[i].argmax().item()
        results.append({
            "text": text,
            "label": labels[pred_idx],
            "score": predictions[i][pred_idx].item(),
        })
    return results


if __name__ == "__main__":
    texts = [
        "Deep learning with Python is amazing!",
        "This movie is terrible and boring.",
    ]
    for r in sentiment_analysis(texts):
        print(f"[{r['label']}] {r['score']:.4f}: {r['text']}")
```

---

## 6. 对比分析

### 6.1 PyTorch vs TensorFlow vs JAX

| 维度 | PyTorch | TensorFlow 2.x | JAX |
| ---- | ------- | -------------- | --- |
| 计算图 | 动态（Define-by-Run） | Eager + Graph | 函数式 + JIT |
| 自动微分 | autograd | GradientTape | jax.grad |
| API 风格 | Pythonic | Keras 高层 + 低层 | 函数式 |
| 分布式 | DDP, FSDP | tf.distribute | pmap, pjit |
| 部署 | TorchScript, ONNX | TF Serving, TFLite |jax2tf |
| 生态 | Hugging Face 主导 | Keras CV/NLP | Haiku, Flax |
| TPU 支持 | 通过 XLA | 原生 | 原生 |
| 研究占比 | 80%+ (NeurIPS 2023) | <15% | 增长中 |
| 工业部署 | TorchServe, Triton | TF Serving | 较少 |

### 6.2 PyTorch 与 TensorFlow 代码对比

```python
# PyTorch 风格
import torch
import torch.nn as nn

class Net(nn.Module):
    def __init__(self):
        super().__init__()
        self.fc = nn.Linear(784, 10)
    def forward(self, x):
        return self.fc(x.view(x.size(0), -1))

model = Net()
```

```python
# TensorFlow 2.x 风格
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers

model = keras.Sequential([
    layers.Input(shape=(28, 28)),
    layers.Flatten(),
    layers.Dense(10),
])
```

### 6.3 与 Go/Rust/C++ 性能对比

| 任务 | Python (PyTorch) | C++ (libtorch) | Rust (tch-rs) | Go (GoNN) |
| ---- | ---------------- | -------------- | ------------- | --------- |
| 模型定义 | 高可读 | 中 | 中 | 低 |
| 训练速度 | 持平（C++ 后端） | 持平 | 持平 | 慢 30% |
| 部署便利 | 中（需 TorchScript） | 高（原生） | 高 | 中 |
| 生态 | 主流 | 跟随 | 跟随 | 边缘 |
| 推理延迟 | 持平 | 持平 | 持平 | 慢 |

### 6.4 训练框架对比

| 框架 | 训练范式 | 适用场景 |
| ---- | -------- | -------- |
| PyTorch Lightning | 封装 PyTorch | 研究到生产 |
| Hugging Face Trainer | NLP/多模态 | 大模型微调 |
| FastAI | 高层 API | 快速原型 |
| Keras | 高层 API | 教学与生产 |
| Megatron-LM | 大模型分布式 | GPT 训练 |
| DeepSpeed | ZeRO 优化 | 千亿参数训练 |

---

## 7. 常见陷阱与最佳实践

### 7.1 陷阱 1：忘记 `model.train()` / `model.eval()`

```python
# 反例：评估时未切换 eval 模式，Dropout/BatchNorm 行为异常
model.train()
loss = train_one_epoch(model, ...)
acc = evaluate(model, ...)  # Dropout 仍生效，精度下降

# 正例：评估前调用 eval()
model.eval()
acc = evaluate(model, ...)
model.train()  # 切回训练模式
```

### 7.2 陷阱 2：未使用 `torch.no_grad()` 进行评估

```python
# 反例：评估时未禁用梯度，内存爆炸
def evaluate_wrong(model, loader):
    total = 0
    for x, y in loader:
        out = model(x)  # 构建计算图！
        total += (out.argmax(1) == y).sum().item()
    return total

# 正例：使用 torch.no_grad()
def evaluate_correct(model, loader):
    total = 0
    with torch.no_grad():
        for x, y in loader:
            out = model(x)
            total += (out.argmax(1) == y).sum().item()
    return total
```

### 7.3 陷阱 3：设备不一致

```python
# 反例：模型在 GPU，数据在 CPU
model = model.cuda()
out = model(data)  # RuntimeError: Expected all tensors on same device

# 正例：数据也迁移到 GPU
data = data.cuda()
out = model(data)
```

### 7.4 陷阱 4：学习率设置不当

```python
# 反例：固定学习率过大
optimizer = optim.Adam(model.parameters(), lr=1.0)  # loss 爆炸

# 正例：使用学习率调度器
from torch.optim.lr_scheduler import CosineAnnealingLR

optimizer = optim.Adam(model.parameters(), lr=1e-3)
scheduler = CosineAnnealingLR(optimizer, T_max=100)

for epoch in range(100):
    train(...)
    scheduler.step()
```

### 7.5 陷阱 5：梯度未清零

```python
# 反例：梯度累积
for x, y in loader:
    out = model(x)
    loss = criterion(out, y)
    loss.backward()  # 梯度累积！
    optimizer.step()
    # 缺少 optimizer.zero_grad()

# 正例：每个 batch 清零梯度
for x, y in loader:
    optimizer.zero_grad()
    out = model(x)
    loss = criterion(out, y)
    loss.backward()
    optimizer.step()
```

### 7.6 陷阱 6：数据泄露

```python
# 反例：训练集与测试集混淆
all_data = load_data()
mean = all_data.mean()
std = all_data.std()
train, test = split(all_data)
train = (train - mean) / std  # 使用了全集统计量，信息泄露

# 正例：仅用训练集统计量
train, test = split(all_data)
mean = train.mean()
std = train.std()
train = (train - mean) / std
test = (test - mean) / std  # 用训练集统计量归一化测试集
```

### 7.7 陷阱 7：BatchNorm 在小 batch 下失效

```python
# 反例：BatchNorm 在 batch=1 时方差未定义
model = nn.BatchNorm2d(64)
out = model(torch.randn(1, 64, 32, 32))  # 训练模式下方差为 NaN

# 正例：小 batch 使用 GroupNorm 或 InstanceNorm
model = nn.GroupNorm(8, 64)  # 8 个 group
```

### 7.8 陷阱 8：保存模型仅保存 state_dict

```python
# 反例：仅保存 state_dict，丢失优化器状态
torch.save(model.state_dict(), "model.pth")
# 加载时优化器状态丢失，无法继续训练

# 正例：保存完整 checkpoint
checkpoint = {
    "epoch": epoch,
    "model_state_dict": model.state_dict(),
    "optimizer_state_dict": optimizer.state_dict(),
    "loss": loss,
}
torch.save(checkpoint, "checkpoint.pth")
```

### 7.9 陷阱 9：未设置随机种子

```python
# 反例：每次运行结果不可复现
import torch
model = MLP()

# 正例：设置随机种子
import random
import numpy as np

def set_seed(seed: int = 42) -> None:
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)
    torch.backends.cudnn.deterministic = True
    torch.backends.cudnn.benchmark = False

set_seed(42)
```

### 7.10 陷阱 10：过度拟合训练集

```python
# 反例：训练集准确率 99%，验证集 70%（过拟合）
model = LargeModel()
optimizer = optim.Adam(model.parameters(), lr=1e-3)

# 正例：综合使用正则化
model = LargeModel(dropout=0.5, weight_decay=1e-4)
optimizer = optim.AdamW(model.parameters(), lr=1e-3, weight_decay=1e-4)
scheduler = CosineAnnealingLR(optimizer, T_max=100)
early_stopping = EarlyStopping(patience=10)
```

### 7.11 最佳实践清单

1. **设备管理**：统一使用 `device = torch.device("cuda" if available else "cpu")`
2. **数据加载**：`num_workers > 0` + `pin_memory=True` 加速 IO
3. **混合精度**：训练默认开启 AMP
4. **梯度裁剪**：RNN/Transformer 必备 `clip_grad_norm_`
5. **学习率调度**：CosineAnnealing、OneCycleLR、ReduceLROnPlateau
6. **Early Stopping**：监控验证集损失
7. **Checkpoint**：定期保存最佳模型与训练状态
8. **TensorBoard/MLflow**：训练过程可视化与实验追踪
9. **单元测试**：模型输出形状、梯度流、数值稳定性
10. **版本管理**：DVC 管理数据与模型，Git 管理代码

---

## 8. 工程实践

### 8.1 项目结构

```
deep-learning-project/
├── pyproject.toml
├── README.md
├── src/
│   ├── __init__.py
│   ├── data/
│   │   ├── dataset.py
│   │   └── transforms.py
│   ├── models/
│   │   ├── __init__.py
│   │   ├── mlp.py
│   │   ├── cnn.py
│   │   └── transformer.py
│   ├── losses/
│   │   └── custom_losses.py
│   ├── optim/
│   │   └── custom_optim.py
│   ├── train.py
│   └── evaluate.py
├── configs/
│   ├── default.yaml
│   └── experiment_1.yaml
├── tests/
│   ├── test_models.py
│   └── test_losses.py
├── scripts/
│   ├── train.sh
│   └── export_onnx.py
└── notebooks/
    └── exploration.ipynb
```

### 8.2 配置管理（Hydra）

```python
# configs/default.yaml
model:
  name: resnet18
  num_classes: 10
  pretrained: true

data:
  name: cifar10
  batch_size: 128
  num_workers: 4

train:
  epochs: 100
  lr: 0.001
  weight_decay: 0.01
  optimizer: adamw
  scheduler: cosine

# train.py
import hydra
from omegaconf import DictConfig

@hydra.main(config_path="configs", config_name="default")
def main(cfg: DictConfig) -> None:
    model = build_model(cfg.model)
    train_loader, test_loader = build_data(cfg.data)
    optimizer = build_optimizer(model, cfg.train)
    train(model, train_loader, optimizer, cfg.train)
```

### 8.3 实验追踪（MLflow）

```python
"""MLflow 实验追踪。

Python 3.10+
"""
import mlflow
import torch


def train_with_mlflow(cfg, model, train_loader, test_loader):
    """使用 MLflow 追踪训练过程。"""
    mlflow.set_experiment("cifar10-resnet18")

    with mlflow.start_run():
        # 记录超参数
        mlflow.log_params({
            "model": cfg.model.name,
            "batch_size": cfg.data.batch_size,
            "lr": cfg.train.lr,
            "epochs": cfg.train.epochs,
        })

        optimizer = torch.optim.AdamW(model.parameters(), lr=cfg.train.lr)

        for epoch in range(cfg.train.epochs):
            train_loss = train_one_epoch(model, train_loader, optimizer)
            test_acc = evaluate(model, test_loader)

            # 记录指标
            mlflow.log_metrics({
                "train_loss": train_loss,
                "test_accuracy": test_acc,
            }, step=epoch)

        # 保存模型
        mlflow.pytorch.log_model(model, "model")
```

### 8.4 模型量化与压缩

```python
"""模型量化。

Python 3.10+ / PyTorch 2.1+
"""
import torch
import torch.nn as nn
import torch.quantization


def quantize_dynamic(model: nn.Module) -> nn.Module:
    """动态量化（仅权重 INT8）。"""
    return torch.quantization.quantize_dynamic(
        model, {nn.Linear, nn.LSTM}, dtype=torch.qint8
    )


def quantize_static(model: nn.Module, calibration_loader) -> nn.Module:
    """静态量化（权重+激活 INT8）。"""
    model.eval()
    model.qconfig = torch.quantization.get_default_qconfig("fbgemm")
    torch.quantization.prepare(model, inplace=True)

    # 校准
    with torch.no_grad():
        for x, _ in calibration_loader:
            model(x)

    torch.quantization.convert(model, inplace=True)
    return model


# 基准对比
# FP32 模型大小: 100MB, 推理 50ms
# INT8 动态量化: 25MB, 推理 30ms
# INT8 静态量化: 25MB, 推理 15ms
```

### 8.5 TensorRT 加速

```python
"""TensorRT 加速推理。

需要: tensorrt, torch2trt
Python 3.10+
"""
import torch
from torch2trt import torch2trt


def optimize_with_tensorrt(model: nn.Module, input_shape: tuple = (1, 3, 224, 224)) -> nn.Module:
    """使用 TensorRT 优化模型。"""
    dummy = torch.randn(*input_shape).cuda()
    model_trt = torch2trt(model.cuda(), [dummy], fp16_mode=True)
    return model_trt


# 实测：ResNet-50 在 RTX 3090 上
# FP32 PyTorch: 5.2 ms
# FP16 TensorRT: 1.8 ms (加速 2.9x)
```

### 8.6 性能基准测试

```python
"""训练与推理性能基准。

Python 3.10+
"""
import time
import torch
import torch.nn as nn


def benchmark_training(
    model: nn.Module,
    optimizer: torch.optim.Optimizer,
    criterion: nn.Module,
    data_loader,
    n_epochs: int = 1,
) -> dict:
    """训练性能基准。"""
    model.train()
    start = time.perf_counter()
    total_samples = 0

    for epoch in range(n_epochs):
        for x, y in data_loader:
            x, y = x.cuda(), y.cuda()
            optimizer.zero_grad()
            out = model(x)
            loss = criterion(out, y)
            loss.backward()
            optimizer.step()
            total_samples += x.size(0)

    elapsed = time.perf_counter() - start
    return {
        "total_time_s": elapsed,
        "samples_per_second": total_samples / elapsed,
        "ms_per_batch": elapsed * 1000 / (total_samples / data_loader.batch_size),
    }


def benchmark_inference(
    model: nn.Module,
    input_shape: tuple,
    n_warmup: int = 10,
    n_iter: int = 100,
) -> dict:
    """推理性能基准。"""
    model.eval().cuda()
    dummy = torch.randn(*input_shape).cuda()

    with torch.no_grad():
        for _ in range(n_warmup):
            _ = model(dummy)
        torch.cuda.synchronize()

        start = time.perf_counter()
        for _ in range(n_iter):
            _ = model(dummy)
        torch.cuda.synchronize()
        elapsed = time.perf_counter() - start

    return {
        "latency_ms": elapsed / n_iter * 1000,
        "throughput_fps": n_iter / elapsed,
    }
```

### 8.7 调试技巧

```python
"""调试神经网络。

Python 3.10+
"""
import torch
import torch.nn as nn


def check_gradient_flow(model: nn.Module) -> dict:
    """检查梯度流，识别梯度消失/爆炸。"""
    gradient_info = {}
    for name, param in model.named_parameters():
        if param.grad is not None:
            gradient_info[name] = {
                "mean": param.grad.mean().item(),
                "std": param.grad.std().item(),
                "max": param.grad.max().item(),
                "min": param.grad.min().item(),
                "has_nan": torch.isnan(param.grad).any().item(),
                "has_inf": torch.isinf(param.grad).any().item(),
            }
    return gradient_info


def check_activation_stats(model: nn.Module, input_data: torch.Tensor) -> dict:
    """检查激活值统计。"""
    stats = {}
    hooks = []

    def hook_fn(module, input, output, name):
        stats[name] = {
            "mean": output.mean().item(),
            "std": output.std().item(),
            "zero_fraction": (output == 0).float().mean().item(),
        }

    for name, layer in model.named_modules():
        if isinstance(layer, (nn.Linear, nn.Conv2d, nn.ReLU)):
            h = layer.register_forward_hook(lambda m, i, o, n=name: hook_fn(m, i, o, n))
            hooks.append(h)

    with torch.no_grad():
        _ = model(input_data)

    for h in hooks:
        h.remove()

    return stats
```

---

## 9. 案例研究

### 9.1 OpenAI GPT 系列：从 GPT-1 到 GPT-4

GPT 系列采用 Decoder-only Transformer 架构：

```python
# GPT 简化结构
class GPTBlock(nn.Module):
    def __init__(self, d_model: int, n_heads: int) -> None:
        super().__init__()
        self.ln1 = nn.LayerNorm(d_model)
        self.attn = nn.MultiheadAttention(d_model, n_heads, batch_first=True)
        self.ln2 = nn.LayerNorm(d_model)
        self.ffn = nn.Sequential(
            nn.Linear(d_model, 4 * d_model),
            nn.GELU(),
            nn.Linear(4 * d_model, d_model),
        )

    def forward(self, x: torch.Tensor, mask: torch.Tensor | None = None) -> torch.Tensor:
        # Pre-LayerNorm
        attn_out, _ = self.attn(self.ln1(x), self.ln1(x), self.ln1(x), attn_mask=mask)
        x = x + attn_out
        ffn_out = self.ffn(self.ln2(x))
        x = x + ffn_out
        return x
```

GPT-3 参数规模：

| 模型 | 层数 | d_model | 头数 | 参数量 |
| ---- | ---- | ------- | ---- | ------ |
| GPT-1 | 12 | 768 | 12 | 117M |
| GPT-2 | 48 | 1600 | 25 | 1.5B |
| GPT-3 | 96 | 12288 | 96 | 175B |
| GPT-4 | MoE | - | - | ~1.8T（估计） |

### 9.2 Meta LLaMA：开源大模型

LLaMA 系列采用 RMSNorm、RoPE、SwiGLU 等改进：

```python
class RMSNorm(nn.Module):
    """RMSNorm，比 LayerNorm 更高效。"""
    def __init__(self, dim: int, eps: float = 1e-6) -> None:
        super().__init__()
        self.weight = nn.Parameter(torch.ones(dim))
        self.eps = eps

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        rms = x.pow(2).mean(-1, keepdim=True).add(self.eps).rsqrt()
        return x * rms * self.weight


def precompute_rope(dim: int, max_seq_len: int, theta: float = 10000.0) -> torch.Tensor:
    """预计算 RoPE 旋转矩阵。"""
    freqs = 1.0 / (theta ** (torch.arange(0, dim, 2)[: dim // 2].float() / dim))
    t = torch.arange(max_seq_len)
    freqs = torch.outer(t, freqs)
    return torch.polar(torch.ones_like(freqs), freqs)  # 复数形式
```

### 9.3 Google AlphaFold 2：蛋白质结构预测

AlphaFold 2 使用 JAX 实现高效推理：

- **Evoformer**：48 层 Transformer，处理 MSA（多序列比对）
- **Structure Module**：SE(3)-equivariant 网络
- **推理时间**：单蛋白质约 5 分钟（TPU v3）

JAX 在其中的角色：

```python
import jax
import jax.numpy as jnp

@jax.jit
def forward(params, inputs):
    """JIT 编译的前向传播。"""
    return model.apply(params, inputs)

@jax.pmap
def distributed_forward(params, inputs):
    """跨 TPU 核心分布式推理。"""
    return forward(params, inputs)
```

### 9.4 Stable Diffusion：扩散模型

```python
"""Stable Diffusion 简化实现。

Python 3.10+ / diffusers 0.25+
"""
import torch
from diffusers import StableDiffusionPipeline


def generate_image(
    prompt: str,
    model_id: str = "stable-diffusion-v1-5/stable-diffusion-v1-5",
    num_inference_steps: int = 50,
    seed: int = 42,
) -> torch.Tensor:
    """生成图像。"""
    generator = torch.Generator("cuda").manual_seed(seed)
    pipe = StableDiffusionPipeline.from_pretrained(
        model_id, torch_dtype=torch.float16
    ).to("cuda")

    image = pipe(
        prompt,
        num_inference_steps=num_inference_steps,
        generator=generator,
    ).images[0]

    return image


if __name__ == "__main__":
    img = generate_image("a cat playing piano, photorealistic")
    img.save("cat_piano.png")
```

### 9.5 Instagram：图像推荐系统

Instagram 的图像推荐使用 PyTorch 训练 ResNet/efficientnet 提取特征：

```python
# 特征提取流水线
class FeatureExtractor(nn.Module):
    def __init__(self) -> None:
        super().__init__()
        self.backbone = models.resnet50(pretrained=True)
        self.backbone.fc = nn.Identity()  # 移除分类头

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.backbone(x)  # 2048 维特征

# 离线提取所有用户图像的特征，存入 Faiss 索引
# 在线推荐时，查询 Faiss 找到相似图像
```

### 9.6 Tesla Autopilot：CV 模型部署

Tesla 使用 PyTorch 训练，导出为 ONNX 后部署到车载芯片：

- 训练：8 GPU 集群，PyTorch + DDP
- 部署：ONNX → TensorRT，FP16 推理
- 延迟：单帧推理 < 10ms（HW3.0 芯片）

### 9.7 DeepMind AlphaCode：代码生成

AlphaCode 使用 JAX 训练，参数规模 41B：

- 训练：TPU v4 Pod（4096 核）
- 数据：GitHub 代码 + 竞赛题
- 推理：模型蒸馏 + 采样 + 聚类

### 9.8 Stable Diffusion 在 Hugging Face 的部署

Hugging Face 使用 ONNX Runtime + Triton Inference Server 部署 Stable Diffusion：

- 训练：PyTorch + DeepSpeed ZeRO-3
- 推理：ONNX → TensorRT，批量推理
- 吞吐量：单 A100 GPU 100+ images/min

---

## 10. 习题

### 10.1 选择题

**Q1.** 以下哪个不是 PyTorch 自动微分的核心组件？

A. `torch.Tensor` 的 `requires_grad` 属性
B. `backward()` 方法
C. `torch.autograd.Function`
D. `tf.GradientTape`

**答案：D**

解析：`tf.GradientTape` 是 TensorFlow 2.x 的自动微分 API，不属于 PyTorch。PyTorch 通过 `requires_grad`、`backward()` 与 `torch.autograd.Function` 实现自动微分。

---

**Q2.** 关于 PyTorch 与 TensorFlow 的计算图，下列说法正确的是？

A. PyTorch 是静态图，TensorFlow 2.x 是动态图
B. PyTorch 是动态图，TensorFlow 1.x 是静态图
C. 两者都是动态图
D. 两者都是静态图

**答案：B**

解析：PyTorch 默认是动态图（Define-by-Run），TensorFlow 1.x 是静态图，TensorFlow 2.x 引入 Eager Execution 后变为动态图。

---

**Q3.** Adam 优化器中，一阶矩估计 $m_t$ 与二阶矩估计 $v_t$ 的偏差修正确确形式是？

A. $\hat{m}_t = m_t / (1 - \beta_1)$, $\hat{v}_t = v_t / (1 - \beta_2)$
B. $\hat{m}_t = m_t / (1 - \beta_1^t)$, $\hat{v}_t = v_t / (1 - \beta_2^t)$
C. $\hat{m}_t = m_t \cdot (1 - \beta_1^t)$, $\hat{v}_t = v_t \cdot (1 - \beta_2^t)$
D. 不需要偏差修正

**答案：B**

解析：Adam 的偏差修正公式为 $\hat{m}_t = m_t / (1 - \beta_1^t)$ 与 $\hat{v}_t = v_t / (1 - \beta_2^t)$，以消除初始化偏差。

---

**Q4.** 关于混合精度训练（AMP），下列说法错误的是？

A. AMP 使用 FP16 存储权重和梯度
B. AMP 使用 FP32 累积梯度
C. Loss scaling 用于避免梯度下溢
D. AMP 总是能加速训练 10 倍以上

**答案：D**

解析：AMP 加速通常为 1.5-3 倍，而非 10 倍以上。加速比取决于硬件（A100 上更显著）、模型结构与 batch size。

---

**Q5.** Transformer 自注意力的计算复杂度是？

A. $O(n \cdot d)$
B. $O(n^2 \cdot d)$
C. $O(n \cdot d^2)$
D. $O(n^2 \cdot d^2)$

**答案：B**

解析：自注意力 $QK^\top$ 的矩阵乘法复杂度为 $O(n^2 \cdot d)$，其中 $n$ 为序列长度，$d$ 为嵌入维度。

---

### 10.2 填空题

**Q1.** PyTorch 中，将张量从 CPU 移到 GPU 的方法是 ________。

**答案：`tensor.cuda()` 或 `tensor.to("cuda")`**

---

**Q2.** 反向传播基于的数学原理是 ________，其公式 ________ 用于逐层求导。

**答案：链式法则（chain rule）；$\frac{\partial \mathcal{L}}{\partial x} = \frac{\partial \mathcal{L}}{\partial y} \cdot \frac{\partial y}{\partial x}$**

---

**Q3.** 在 PyTorch 中保存完整训练状态的常用方式是 ________。

**答案：保存 `{"model_state_dict": ..., "optimizer_state_dict": ..., "epoch": ..., "loss": ...}` 到 `.pt`/`.pth` 文件**

---

**Q4.** ResNet 解决梯度消失的核心创新是 ________。

**答案：残差连接（skip connection），公式 $\mathbf{h}^{(l+1)} = \mathbf{h}^{(l)} + f(\mathbf{h}^{(l)})$**

---

**Q5.** AdamW 与 Adam 的关键区别是 ________。

**答案：AdamW 将权重衰减从梯度更新中解耦，直接作用于参数：$p \leftarrow p - \eta \cdot (g + \lambda p)$ → $p \leftarrow p - \eta g; p \leftarrow p (1 - \eta \lambda)$**

---

### 10.3 编程题

**Q1.** 实现一个简单的 2 层 MLP，使用 PyTorch 训练 MNIST，要求测试准确率 > 95%。

```python
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
from torchvision import datasets, transforms


class MLP(nn.Module):
    def __init__(self):
        super().__init__()
        self.net = nn.Sequential(
            nn.Flatten(),
            nn.Linear(784, 256),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(256, 10),
        )

    def forward(self, x):
        return self.net(x)


def main():
    transform = transforms.Compose([transforms.ToTensor(), transforms.Normalize((0.1307,), (0.3081,))])
    train_set = datasets.MNIST("./data", train=True, download=True, transform=transform)
    test_set = datasets.MNIST("./data", train=False, transform=transform)
    train_loader = DataLoader(train_set, batch_size=64, shuffle=True)
    test_loader = DataLoader(test_set, batch_size=1000)

    model = MLP()
    optimizer = optim.Adam(model.parameters(), lr=1e-3)
    criterion = nn.CrossEntropyLoss()

    for epoch in range(5):
        model.train()
        for x, y in train_loader:
            optimizer.zero_grad()
            loss = criterion(model(x), y)
            loss.backward()
            optimizer.step()

        model.eval()
        correct = 0
        with torch.no_grad():
            for x, y in test_loader:
                correct += (model(x).argmax(1) == y).sum().item()
        print(f"Epoch {epoch+1}: test acc = {correct/len(test_set):.4f}")


if __name__ == "__main__":
    main()
```

---

**Q2.** 实现一个简单的 Transformer encoder 块，包含多头注意力、LayerNorm、FFN。

```python
import torch
import torch.nn as nn


class TransformerBlock(nn.Module):
    def __init__(self, d_model: int, n_heads: int, d_ff: int, dropout: float = 0.1):
        super().__init__()
        self.attn = nn.MultiheadAttention(d_model, n_heads, dropout=dropout, batch_first=True)
        self.ln1 = nn.LayerNorm(d_model)
        self.ffn = nn.Sequential(
            nn.Linear(d_model, d_ff),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(d_ff, d_model),
        )
        self.ln2 = nn.LayerNorm(d_model)
        self.dropout = nn.Dropout(dropout)

    def forward(self, x: torch.Tensor, mask: torch.Tensor | None = None) -> torch.Tensor:
        # Pre-LN
        ln_x = self.ln1(x)
        attn_out, _ = self.attn(ln_x, ln_x, ln_x, attn_mask=mask)
        x = x + self.dropout(attn_out)
        x = x + self.dropout(self.ffn(self.ln2(x)))
        return x


# 测试
block = TransformerBlock(d_model=512, n_heads=8, d_ff=2048)
x = torch.randn(2, 10, 512)  # (batch, seq, dim)
out = block(x)
assert out.shape == (2, 10, 512)
```

---

**Q3.** 实现自定义的 Cosine Annealing 学习率调度器。

```python
import math
import torch
from torch.optim.lr_scheduler import LambdaLR


def get_cosine_schedule_with_warmup(
    optimizer: torch.optim.Optimizer,
    num_warmup_steps: int,
    num_training_steps: int,
    min_lr_ratio: float = 0.0,
):
    """带 warmup 的余弦退火调度器。"""
    def lr_lambda(current_step: int) -> float:
        if current_step < num_warmup_steps:
            return float(current_step) / float(max(1, num_warmup_steps))
        progress = float(current_step - num_warmup_steps) / float(max(1, num_training_steps - num_warmup_steps))
        return max(min_lr_ratio, 0.5 * (1.0 + math.cos(math.pi * progress)))

    return LambdaLR(optimizer, lr_lambda)


# 使用示例
optimizer = torch.optim.AdamW(model.parameters(), lr=1e-3)
scheduler = get_cosine_schedule_with_warmup(optimizer, num_warmup_steps=1000, num_training_steps=10000)

for step in range(10000):
    train_step()
    scheduler.step()
```

---

**Q4.** 实现梯度裁剪函数。

```python
import torch


def clip_grad_norm(
    parameters,
    max_norm: float,
    norm_type: float = 2.0,
) -> float:
    """梯度范数裁剪。"""
    if isinstance(parameters, torch.Tensor):
        parameters = [parameters]
    parameters = [p for p in parameters if p.grad is not None]

    norm_type = float(norm_type)
    total_norm = 0.0
    for p in parameters:
        param_norm = p.grad.data.norm(norm_type)
        total_norm += param_norm.item() ** norm_type
    total_norm = total_norm ** (1.0 / norm_type)

    clip_coef = max_norm / (total_norm + 1e-6)
    if clip_coef < 1.0:
        for p in parameters:
            p.grad.data.mul_(clip_coef)

    return total_norm
```

---

**Q5.** 实现一个简单的图像数据增强流水线。

```python
import torch
import torchvision.transforms as T
from PIL import Image


def get_augmentation_pipeline(image_size: int = 224) -> T.Compose:
    """SimCLR 风格的强增强。"""
    return T.Compose([
        T.RandomResizedCrop(image_size, scale=(0.2, 1.0)),
        T.RandomHorizontalFlip(p=0.5),
        T.RandomApply([T.ColorJitter(0.4, 0.4, 0.4, 0.1)], p=0.8),
        T.RandomGrayscale(p=0.2),
        T.RandomApply([T.GaussianBlur(kernel_size=3)], p=0.5),
        T.ToTensor(),
        T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])


# 使用
transform = get_augmentation_pipeline(224)
img = Image.open("photo.jpg")
augmented = transform(img)  # (3, 224, 224) tensor
```

---

### 10.4 思考题

**Q1.** 为什么 PyTorch 在研究领域胜过 TensorFlow？请从 API 设计、调试体验、社区生态三个维度分析。

**参考答案：**
- API 设计：PyTorch 的 Define-by-Run 与 Python 控制流无缝集成，符合直觉
- 调试体验：动态图允许使用 `pdb`、`print` 直接调试，错误堆栈清晰
- 社区生态：Hugging Face、PyTorch Lightning 等生态优先支持 PyTorch
- 历史路径：PyTorch 0.1 发布后 FAIR/MILA 等顶级实验室迅速采用，研究论文默认 PyTorch

---

**Q2.** 为什么 Transformer 取代了 RNN 在 NLP 中的主导地位？请从并行性、长距离依赖、训练效率三个角度分析。

**参考答案：**
- 并行性：Transformer 自注意力可并行计算所有位置，RNN 必须顺序计算
- 长距离依赖：自注意力直接连接任意两个位置，路径长度 O(1)；RNN 为 O(n)
- 训练效率：Transformer 在 GPU/TPU 上利用率更高，训练速度提升 5-10x
- 可扩展性：Transformer 易于扩展到千亿参数（GPT-3 175B），RNN 难以扩展

---

**Q3.** 假设你要训练一个 ResNet-50 在 ImageNet 上，但只有 1 张 GPU（11GB 显存），如何最大化训练效率？

**参考答案：**
1. **混合精度训练**：开启 AMP，显存减半，速度提升 1.5-2x
2. **梯度累积**：用 batch=32 累积 4 步，等效 batch=128
3. **数据增强**：CutMix、MixUp、AutoAugment 提升泛化
4. **学习率调度**：OneCycleLR 或 Cosine Annealing with warmup
5. **分布式训练**：使用 PyTorch DDP 跨多机器
6. **优化器**：AdamW + weight_decay=0.05
7. **冻结早期层**：微调时冻结 stem 与早期 residual blocks

---

**Q4.** 为什么大模型训练需要 ZeRO 优化？请简述 ZeRO-1/2/3 的区别。

**参考答案：**
- 标准数据并行（DDP）每张卡持有完整模型副本，千亿参数模型单卡装不下
- ZeRO-1：分片优化器状态（如 Adam 的 m, v）
- ZeRO-2：分片优化器状态 + 梯度
- ZeRO-3：分片优化器状态 + 梯度 + 参数（最彻底）
- 显存节省：ZeRO-3 可训练 1T 参数（2000 亿参数级别）

---

**Q5.** 模型量化（INT8）会带来什么风险？如何评估量化对精度的影响？

**参考答案：**
- 风险：精度损失、敏感层异常、激活值分布漂移
- 评估方法：
  1. 训练后量化（PTQ）：使用校准数据集统计激活分布，对比 FP32 与 INT8 的精度
  2. 量化感知训练（QAT）：在训练中模拟量化误差，通常比 PTQ 精度更高
  3. 逐层敏感性分析：识别对量化敏感的层，保持 FP16
  4. PSNR/SSIM（图像）、BLEU/ROUGE（文本）评估输出质量

---

## 11. 参考文献

### 11.1 基础论文

[1] Rumelhart, D.E., Hinton, G.E., and Williams, R.J. 1986. Learning representations by back-propagating errors. Nature 323, 6088 (Oct. 1986), 533–536. DOI: 10.1038/323533a0.

[2] LeCun, Y., Bottou, L., Bengio, Y., and Haffner, P. 1998. Gradient-based learning applied to document recognition. Proceedings of the IEEE 86, 11 (Nov. 1998), 2278–2324. DOI: 10.1109/5.726791.

[3] Hochreiter, S. and Schmidhuber, J. 1997. Long short-term memory. Neural Computation 9, 8 (Nov. 1997), 1735–1780. DOI: 10.1162/neco.1997.9.8.1735.

[4] He, K., Zhang, X., Ren, S., and Sun, J. 2016. Deep residual learning for image recognition. In Proceedings of the IEEE Conference on Computer Vision and Pattern Recognition (CVPR '16). IEEE, 770–778. DOI: 10.1109/CVPR.2016.90.

[5] Vaswani, A., Shazeer, N., Parmar, N., et al. 2017. Attention is all you need. In Advances in Neural Information Processing Systems 30 (NeurIPS '17). Curran Associates, 5998–6008.

### 11.2 优化算法

[6] Kingma, D.P. and Ba, J. 2015. Adam: A method for stochastic optimization. In Proceedings of the 3rd International Conference on Learning Representations (ICLR '15). arXiv:1412.6980.

[7] Loshchilov, I. and Hutter, F. 2019. Decoupled weight decay regularization. In Proceedings of the 7th International Conference on Learning Representations (ICLR '19). arXiv:1711.05101.

[8] Reddi, S.J., Kale, S., and Kumar, S. 2018. On the convergence of Adam and beyond. In Proceedings of the 6th International Conference on Learning Representations (ICLR '18). arXiv:1904.09237.

### 11.3 框架与系统

[9] Abadi, M., Agarwal, A., Barham, P., et al. 2016. TensorFlow: A system for large-scale machine learning. In Proceedings of the 12th USENIX Symposium on Operating Systems Design and Implementation (OSDI '16). USENIX Association, 265–283.

[10] Paszke, A., Gross, S., Massa, F., et al. 2019. PyTorch: An imperative style, high-performance deep learning library. In Advances in Neural Information Processing Systems 32 (NeurIPS '19). Curran Associates, 8024–8035.

[11] Bradbury, J., Frostig, R., Hawkins, P., et al. 2018. JAX: Composable transformations of Python+NumPy programs. Version 0.2.5. http://github.com/google/jax.

### 11.4 大模型与扩散

[12] Devlin, J., Chang, M.-W., Lee, K., and Toutanova, K. 2019. BERT: Pre-training of deep bidirectional transformers for language understanding. In Proceedings of the 2019 Conference of the North American Chapter of the Association for Computational Linguistics (NAACL '19). ACL, 4171–4186. DOI: 10.18653/v1/N19-1423.

[13] Brown, T.B., Mann, B., Ryder, N., et al. 2020. Language models are few-shot learners. In Advances in Neural Information Processing Systems 33 (NeurIPS '20). Curran Associates, 1877–1901.

[14] Rombach, R., Blattmann, A., Lorenz, D., Esser, P., and Ommer, B. 2022. High-resolution image synthesis with latent diffusion models. In Proceedings of the IEEE/CVF Conference on Computer Vision and Pattern Recognition (CVPR '22). IEEE, 10684–10695. DOI: 10.1109/CVPR52688.2022.01042.

### 11.5 工业实践

[15] Anil, R., Gupta, V., Koren, T., and Singer, Y. 2019. Scalable second order optimization for deep learning. arXiv:2002.09018.

[16] Rajbhandari, S., Rasley, J., Ruwase, O., and He, Y. 2020. ZeRO: Memory optimizations toward training trillion parameter models. In Proceedings of the International Conference for High Performance Computing, Networking, Storage and Analysis (SC '20). IEEE, 1–16. DOI: 10.1109/SC41405.2020.00024.

[17] Jumper, J., Evans, R., Pritzel, A., et al. 2021. Highly accurate protein structure prediction with AlphaFold. Nature 596, 7873 (Aug. 2021), 583–589. DOI: 10.1038/s41586-021-03819-2.

---

## 12. 延伸阅读

### 12.1 书籍

- **Goodfellow, I., Bengio, Y., and Courville, A. 2016.** *Deep Learning*. MIT Press. — 深度学习圣经，涵盖数学基础与现代方法。
- **Ramalho, L. 2022.** *Fluent Python (2nd ed.)*. O'Reilly Media. — 第 11 章"Interfaces and Protocols"对 PyTorch 风格 API 设计有启发。
- **Stevens, E., Antiga, L., and Viehmann, T. 2020.** *Deep Learning with PyTorch*. Manning Publications. — PyTorch 实战权威。
- **Chollet, F. 2021.** *Deep Learning with Python (2nd ed.)*. Manning Publications. — Keras 创始人的实战指南。
- **Geron, A. 2022.** *Hands-On Machine Learning with Scikit-Learn, Keras, and TensorFlow (3rd ed.)*. O'Reilly Media.

### 12.2 课程

- **MIT 6.S191: Introduction to Deep Learning** — http://introtodeeplearning.com/
- **Stanford CS231n: Convolutional Neural Networks for Visual Recognition** — http://cs231n.stanford.edu/
- **Stanford CS224n: Natural Language Processing with Deep Learning** — http://web.stanford.edu/class/cs224n/
- **CMU 11-785: Introduction to Deep Learning** — http://deeplearning.cs.cmu.edu/
- **fast.ai Practical Deep Learning** — https://course.fast.ai/

### 12.3 在线资源

- **PyTorch 官方文档与教程** — https://pytorch.org/tutorials/
- **TensorFlow 官方文档** — https://www.tensorflow.org/tutorials
- **Hugging Face Course** — https://huggingface.co/course
- **Papers with Code** — https://paperswithcode.com/
- **The Gradient** — https://thegradient.pub/

### 12.4 经典论文合集

- **Attention is All You Need** (Vaswani et al. 2017)
- **BERT** (Devlin et al. 2019)
- **GPT-3** (Brown et al. 2020)
- **ResNet** (He et al. 2016)
- **Adam** (Kingma & Ba 2015)
- **Dropout** (Srivastava et al. 2014)
- **Batch Normalization** (Ioffe & Szegedy 2015)
- **Layer Normalization** (Ba et al. 2016)

### 12.5 工具与库

- **PyTorch Lightning** — 高层训练框架
- **Hugging Face Transformers** — 预训练模型库
- **Diffusers** — 扩散模型库
- **DeepSpeed** — 大模型训练优化
- **Megatron-LM** — LLM 训练框架
- **ONNX Runtime** — 跨平台推理
- **TensorBoard** — 训练可视化
- **MLflow** — 实验追踪与模型管理
- **Weights & Biases** — MLOps 平台
- **DVC** — 数据与模型版本管理

---

## 附录 A：常用 PyTorch 速查表

### A.1 核心模块

| 模块 | 用途 |
| ---- | ---- |
| `torch` | 张量库 |
| `torch.nn` | 神经网络层 |
| `torch.nn.functional` | 函数式 API |
| `torch.optim` | 优化器 |
| `torch.autograd` | 自动微分 |
| `torch.utils.data` | 数据加载 |
| `torch.distributed` | 分布式训练 |
| `torch.cuda` | GPU 操作 |
| `torch.jit` | TorchScript |
| `torch.quantization` | 模型量化 |
| `torch.amp` | 混合精度 |

### A.2 常用层

| 层 | 类 | 用途 |
| - | -- | ---- |
| 全连接 | `nn.Linear(in, out)` | MLP |
| 卷积 | `nn.Conv2d(in, out, k, s, p)` | CNN |
| 池化 | `nn.MaxPool2d(k, s)` / `nn.AvgPool2d` | 下采样 |
| 归一化 | `nn.BatchNorm2d` / `nn.LayerNorm` / `nn.GroupNorm` | 稳定训练 |
| 循环 | `nn.LSTM` / `nn.GRU` / `nn.RNN` | 序列建模 |
| 注意力 | `nn.MultiheadAttention` | Transformer |
| Dropout | `nn.Dropout(p)` | 正则化 |
| 嵌入 | `nn.Embedding(num, dim)` | 离散特征 |

### A.3 常用损失函数

| 损失 | 类 | 适用场景 |
| ---- | -- | -------- |
| 交叉熵 | `nn.CrossEntropyLoss` | 多分类 |
| 二分类交叉熵 | `nn.BCEWithLogitsLoss` | 二分类 |
| 均方误差 | `nn.MSELoss` | 回归 |
| L1 损失 | `nn.L1Loss` | 回归（鲁棒） |
| KL 散度 | `nn.KLDivLoss` | VAE |
| 三元组 | `nn.TripletMarginLoss` | 度量学习 |
| Huber | `nn.HuberLoss` | 回归（鲁棒） |

### A.4 常用优化器

| 优化器 | 类 | 特点 |
| ------ | -- | ---- |
| SGD | `optim.SGD` | 基础，需调学习率 |
| Momentum | `optim.SGD(momentum=0.9)` | 加速收敛 |
| RMSprop | `optim.RMSprop` | 自适应学习率 |
| Adam | `optim.Adam` | 最常用 |
| AdamW | `optim.AdamW` | 解耦权重衰减 |
| Adagrad | `optim.Adagrad` | 稀疏数据 |
| LBFGS | `optim.LBFGS` | 二阶方法 |

---

## 附录 B：调试速查

### B.1 检查 GPU 利用率

```bash
# 实时监控
nvidia-smi -l 1

# 详细进程
nvidia-smi pmon -s u
```

### B.2 内存分析

```python
import torch

# 当前 GPU 内存
print(f"Allocated: {torch.cuda.memory_allocated() / 1e9:.2f} GB")
print(f"Reserved: {torch.cuda.memory_reserved() / 1e9:.2f} GB")

# 内存快照
torch.cuda.memory_snapshot()

# 显存占用最高的张量
from torch.cuda.memory import _set_allocator_settings
```

### B.3 梯度检查

```python
from torch.autograd import gradcheck

# 数值梯度检查
input = torch.randn(3, 4, requires_grad=True, dtype=torch.double)
test = gradcheck(lambda x: (x ** 2).sum(), input)
print(f"Gradient check passed: {test}")
```

---

## 结语

Python 在深度学习领域的统治地位并非偶然，而是其优秀的语言设计、丰富的科学计算生态（NumPy、SciPy、Pandas）与活跃的研究社区共同造就的。PyTorch 与 TensorFlow 的演进，反映了从研究到生产的工程化需求；JAX 的崛起则代表了对函数式编程与编译器优化的追求。

掌握深度学习工程化的关键不在于记住 API，而在于理解：数学原理（反向传播、注意力机制）、工程实践（混合精度、分布式训练）、部署优化（量化、TensorRT）。在大模型时代，Python 仍将是连接算法创新与工程落地的核心语言，而深度学习工程师的角色也将从"调参"进化为"系统架构师"。

> "The best way to predict the future is to invent it." —— Alan Kay

---

*文档版本：v2.0.0 | 最后更新：2026-06-14 | 维护者：FANDEX Team*
