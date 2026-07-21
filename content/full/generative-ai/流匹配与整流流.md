---
title: 流匹配与整流流
description: 从DDPM到流匹配，更直的采样路径与更快的推理速度
module: 'generative-ai'
difficulty: advanced
tags:
  - 流匹配
  - 整流流
  - ODE
  - 采样加速
  - 扩散改进
related:
  - 'generative-ai/3D生成'
  - 'generative-ai/扩散模型DDPM从零开始'
  - 'generative-ai/潜扩散与Stable-Diffusion'
  - 'generative-ai/生成模型分类与历史'
prerequisites:
  - 'generative-ai/3D生成'
---

# 流匹配与整流流

> DDPM 采样 50 步因为它的路径是弯曲的——噪声在概率密度的山丘和山谷中蜿蜒。流匹配学习直线路径。直线意味着 1 步在理论上就够了。实践中 4-8 步就够了。这就是为什么 SD3、Flux 和 AudioCraft 2 都使用流匹配。

**类型:** 构建
**语言:** Python
**前置知识:** Phase 8 · 06 (DDPM), Phase 3 · 02 (反向传播)
**时间:** ~75 分钟

## 问题

DDPM 的反向过程是一个随机微分方程 (SDE)。采样需要许多小步因为路径弯曲——概率密度景观中的蜿蜒路线。如果你能学习一个*直的*路径从噪声到数据，一步欧拉积分就够了。

Lipman et al. (2023) 的流匹配正是这样做的：定义一个从噪声分布到数据分布的向量场，训练神经网络匹配该向量场，然后用 ODE 求解器（不是 SDE）沿该向量场积分。如果向量场是直的，欧拉方法一步就足够。

Liu et al. (2023) 的整流流进一步简化：在 `(x_0, x_1)` 对之间定义直线路径 `x_t = (1-t)·x_0 + t·x_1`，训练网络预测 `x_1 - x_0`（方向），然后迭代细化使路径更直。每次细化使路径更直，采样更少步。

2024-2026 年，流匹配/整流流已成为新图像和视频模型的事实标准：Stable Diffusion 3、Flux.1、Sora、Veo 2、AudioCraft 2 都使用它。

## 核心概念

**连续归一化流 (CNF)。** 一个 ODE `dx/dt = v_θ(x, t)` 定义了从 `p_0`（噪声）到 `p_1`（数据）的概率流。向量场 `v_θ` 必须满足连续性方程以保持概率质量。

**流匹配损失。** 训练 `v_θ` 匹配目标向量场：

```
L_FM = E_{t, x_t} [ ||v_θ(x_t, t) - u_t(x_t)||² ]
```

其中 `u_t` 是目标向量场。关键洞察：你不需要知道 `u_t` 的闭式——你只需要在采样点 `(x_0, x_1)` 上的条件版本。

**条件流匹配。** 给定一对 `(x_0 ~ p_0, x_1 ~ p_data)`，定义条件路径 `x_t = (1-t)·x_0 + t·x_1`。条件向量场是 `u_t = x_1 - x_0`（常数——直线路径！）。训练目标：

```
L_CFM = E_{t, x_0, x_1} [ ||v_θ(x_t, t) - (x_1 - x_0)||² ]
```

网络学习预测从噪声到数据的方向。在 DDPM 术语中，这等价于预测原始数据 `x_0`（不是噪声 `ε`），但损失更简单，路径更直。

**整流流。** Liu et al. (2023) 的额外步骤：训练后，用当前模型生成 `(x_0, x_1)` 对，然后在这些对上重新训练。每轮细化使路径更直。1 轮细化 = 4-8 步高质量采样。3 轮 = 1-2 步。

**ODE 采样。** 推理时，从 `x_0 ~ N(0, I)` 开始，积分 ODE：

```
x_{t+dt} = x_t + dt · v_θ(x_t, t)
```

欧拉方法（1 步），中点方法（2 步），或 Runge-Kutta（4 步）。步数 = ODE 求解器评估次数。路径越直，步数越少。

## 流匹配 vs DDPM

| 方面     | DDPM              | 流匹配                   |
| -------- | ----------------- | ------------------------ |
| 训练目标 | 预测噪声 ε        | 预测速度 v = x_1 - x_0   |
| 采样     | SDE 求解器 (随机) | ODE 求解器 (确定性)      |
| 路径     | 弯曲              | 直线（理想）             |
| 步数     | 20-50 (DDIM)      | 4-8 (欧拉) 或 1 (细化后) |
| 确定性   | 否 (除非用 DDIM)  | 是                       |
| 数学     | 变分下界          | ODE + 连续性方程         |

## 动手构建

`code/main.py` 在 1-D 数据上实现了流匹配，与第 06 课的 DDPM 相同的双模混合。

### 步骤 1：条件路径和向量场

```python
def conditional_path(x0, x1, t):
    return (1 - t) * x0 + t * x1

def conditional_velocity(x0, x1):
    return x1 - x0  # constant velocity, straight line
```

### 步骤 2：训练步骤

```python
def train_step(x1, model, rng):
    # x1 is real data, x0 is noise
    x0 = rng.gauss(0, 1)
    t = rng.random()  # uniform in [0, 1]
    x_t = conditional_path(x0, x1, t)
    v_target = conditional_velocity(x0, x1)
    v_hat = model_forward(model, x_t, t)
    loss = (v_hat - v_target) ** 2
    return loss
```

### 步骤 3：ODE 采样

```python
def sample(model, n_steps, rng):
    x = rng.gauss(0, 1)  # x_0 ~ N(0, I)
    dt = 1.0 / n_steps
    for i in range(n_steps):
        t = i * dt
        v = model_forward(model, x, t)
        x = x + dt * v  # Euler step
    return x  # x ≈ x_1 ~ p_data
```

### 步骤 4：细化（可选）

```python
def refine(model, n_refine_steps, rng):
    # Generate (x_0, x_1) pairs with current model
    pairs = []
    for _ in range(n_refine_steps):
        x0 = rng.gauss(0, 1)
        x1 = sample(model, n_steps=8, rng=rng)  # current model
        pairs.append((x0, x1))
    # Retrain on these pairs
    for x0, x1 in pairs:
        train_step_on_pair(x0, x1, model)
```

## 常见陷阱

- **路径不直。** 如果模型容量不足或训练不充分，学习的路径弯曲，需要更多步。修复：更大模型，更长训练，或细化。
- **时间采样不均匀。** 均匀采样 `t ~ U[0, 1]` 在中间时间步给过多权重。Logit-normal 采样 `t ~ Logistic(0, 1)` 在两端给更多权重，改善质量。
- **ODE 求解器精度。** 欧拉方法（1 步）对弯曲路径不准确。中点方法（2 步）或 RK4（4 步）更鲁棒。
- **与 DDPM 调度不兼容。** 流匹配使用 `t ∈ [0, 1]`，DDPM 使用 `t ∈ {1, ..., T}`。不要混合调度。
- **条件化。** 流匹配的条件化与 DDPM 相同（交叉注意力、CFG），但速度预测 `v` 的 CFG 公式略有不同。

## 实际应用

| 模型               | 年份 | 方法          | 步数 |
| ------------------ | ---- | ------------- | ---- |
| Stable Diffusion 3 | 2024 | 整流流        | 4-50 |
| Flux.1-dev         | 2024 | 整流流        | 4-50 |
| Flux.1-schnell     | 2024 | 整流流 + 蒸馏 | 1-4  |
| Sora               | 2024 | 流匹配        | ~20  |
| AudioCraft 2       | 2024 | 流匹配        | 8-20 |
| SD3-Turbo          | 2024 | 整流流 + 蒸馏 | 1-4  |

## 交付物

保存 `outputs/skill-flow-matching.md`。技能接收生成任务 + 速度/质量权衡，输出：方法（DDPM vs 流匹配 vs 整流流）、步数、ODE 求解器、细化轮数和预期质量。

## 练习

1. **简单。** 运行 `code/main.py`，比较 DDPM (T=40) 和流匹配 (4 步) 在相同数据上的样本质量。哪个更快达到相同质量？
2. **中等。** 实现中点 ODE 求解器：`x_{t+dt} = x_t + dt · v(x_t + dt/2 · v(x_t, t), t + dt/2)`。比较 2 步中点 vs 2 步欧拉的样本质量。
3. **困难。** 实现一轮细化：用当前模型生成 (x_0, x_1) 对，重新训练。比较细化前后的路径直度（测量采样轨迹的曲率）。

## 关键术语

| 术语       | 人们怎么说 | 实际含义                                   |
| ---------- | ---------- | ------------------------------------------ |
| 流匹配     | "直线扩散" | 学习从噪声到数据的向量场，ODE 采样。       |
| 整流流     | "Reflow"   | 迭代细化使路径更直，更少步数。             |
| 条件流匹配 | "CFM"      | 在 (x_0, x_1) 对上训练，目标是 x_1 - x_0。 |
| ODE 求解器 | "积分器"   | 沿向量场积分：欧拉、中点、RK4。            |
| 速度预测   | "预测方向" | 网络输出 v = dx/dt，不是噪声 ε。           |
| 路径直度   | "曲率"     | 采样轨迹的弯曲程度；越直 = 越少步数。      |

## 生产笔记：流匹配的步数优势

流匹配的核心生产优势是步数。在相同模型大小下：

| 方法                | 步数 | 512² 延迟 (L4) | 质量 (FID) |
| ------------------- | ---- | -------------- | ---------- |
| DDPM + DDIM         | 20   | ~1.2 s         | 基线       |
| DDPM + DPM-Solver++ | 10   | ~0.6 s         | ≈基线      |
| 流匹配 + 欧拉       | 8    | ~0.5 s         | ≈基线      |
| 流匹配 + 欧拉       | 4    | ~0.25 s        | 略差       |
| 整流流 + 蒸馏       | 1    | ~0.06 s        | 可接受     |

对于生产推理，步数直接映射到成本。4 步流匹配比 20 步 DDIM 便宜 5 倍。1 步蒸馏又便宜 4 倍。这就是为什么每个新模型都使用流匹配。

## 延伸阅读

- [Lipman et al. (2023). Flow Matching for Generative Modeling](https://arxiv.org/abs/2210.02747) — 流匹配。
- [Liu et al. (2023). Flow Straight and Fast: Learning to Generate and Transfer Data with Rectified Flow](https://arxiv.org/abs/2209.03003) — 整流流。
- [Albergo & Vanden-Eijnden (2023). Building Normalizing Flows with Stochastic Interpolants](https://arxiv.org/abs/2209.15571) — 随机插值。
- [Esser et al. (2024). Scaling Rectified Flow Transformers for High-Resolution Image Synthesis](https://arxiv.org/abs/2403.03206) — SD3。
- [Dao et al. (2023). Flow Matching on General Geometries](https://arxiv.org/abs/2302.00482) — 黎曼流匹配。
