---
title: 奖励建模与RLHF
description: 从人类偏好数据训练奖励模型，RLHF管线与对齐训练的核心技术
module: 'machine-learning'
difficulty: advanced
tags:
  - RLHF
  - 奖励建模
  - 人类偏好
  - 对齐
  - 'Bradley-Terry模型'
related:
  - 'machine-learning/仿真到现实迁移'
  - 'machine-learning/集成方法'
  - 'machine-learning/决策树与随机森林'
  - 'machine-learning/逻辑回归与分类'
prerequisites:
  - 'machine-learning/机器学习概述'
---

# 奖励建模与 RLHF

> 2022 年之前，RL 的奖励函数是手工设计的。2022 年之后，RLHF 从人类偏好数据学习奖励函数，然后用 PPO 优化它。这个两步管线——奖励建模 + RL 优化——是 ChatGPT、Claude、Gemini 对齐训练的核心。

**类型:** 学习
**语言:** Python
**前置知识:** Phase 9 · 08 (PPO), Phase 7 · 09 (Transformer)
**时间:** ~60 分钟

## 问题

RL 的标准框架假设奖励函数 `R(s, a)` 是给定的。在实践中，定义好的奖励函数是 RL 最困难的部分：

- **聊天机器人。** 什么是"好回答"的奖励？正确性？有用性？安全性？风格？
- **文本摘要。** 什么是"好摘要"的奖励？准确性？简洁性？信息保留？
- **代码生成。** 什么是"好代码"的奖励？正确性？效率？可读性？

人类可以判断哪个回答更好（偏好比较），但难以给出精确数值。RLHF 的核心思想：从人类偏好比较数据训练一个奖励模型，然后用这个奖励模型作为 RL 的奖励函数。

## 核心概念

**偏好数据收集。** 给标注者看同一提示的两个回答 (y_1, y_2)，让他们选择哪个更好。得到三元组 `(x, y_w, y_l)`，其中 `y_w` 是被选中的（winner），`y_l` 是被拒绝的（loser）。

**Bradley-Terry 模型。** 偏好概率的参数化：

```
P(y_w > y_l | x) = σ(r_θ(x, y_w) - r_θ(x, y_l))
```

其中 `r_θ(x, y)` 是奖励模型，`σ` 是 sigmoid 函数。奖励模型学习给好回答更高分数。

**奖励模型训练。** 二元交叉熵损失：

```
L_RM(θ) = -E[log σ(r_θ(x, y_w) - r_θ(x, y_l))]
```

奖励模型通常是一个与策略模型相同架构的语言模型，最后一个 token 的隐藏状态映射到标量分数。

**RLHF 管线。** 三步：

1. **SFT (监督微调)。** 在高质量数据上监督训练语言模型。
2. **奖励建模。** 从人类偏好数据训练奖励模型。
3. **RL 优化。** 用 PPO 最大化奖励模型的奖励，同时用 KL 惩罚防止偏离 SFT 模型太远。

**PPO 中的 KL 惩罚。** RLHF 的奖励函数不是纯奖励模型输出：

```
R(x, y) = r_θ(x, y) - β · KL(π_φ(y|x) || π_SFT(y|x))
```

β 控制与 SFT 模型的偏离程度。太小 = 模型可能"奖励黑客"（产生高奖励但无意义的输出）。太大 = 模型不偏离 SFT，对齐效果弱。

## RLHF 的替代方法

| 方法       | 年份 | 核心思想                             |
| ---------- | ---- | ------------------------------------ |
| RLHF + PPO | 2022 | 训练奖励模型 + PPO 优化              |
| DPO        | 2023 | 直接从偏好数据优化策略，无需奖励模型 |
| RLAIF      | 2023 | 用 AI 反馈替代人类反馈               |
| ORPO       | 2024 | 将 SFT 和偏好对齐合并为一步          |
| KTO        | 2024 | 只需好/坏标签，不需要成对比较        |
| GRPO       | 2024 | 组相对策略优化，DeepSeek-Math 使用   |

**DPO (Direct Preference Optimization)。** Rafailov et al. (2023)。跳过奖励模型，直接从偏好数据优化策略：

```
L_DPO(θ) = -E[log σ(β · (log π_θ(y_w|x)/π_ref(y_w|x) - log π_θ(y_l|x)/π_ref(y_l|x)))]
```

DPO 更简单（无需训练奖励模型，无需 PPO），但在复杂任务上可能不如 RLHF + PPO。

## 动手构建

`code/main.py` 实现了一个简化的奖励模型训练和 RLHF 管线。

### 步骤 1：奖励模型

```python
class RewardModel:
    def __init__(self, input_dim, hidden_dim=64):
        self.W1 = np.random.randn(input_dim, hidden_dim) * 0.01
        self.b1 = np.zeros(hidden_dim)
        self.W2 = np.random.randn(hidden_dim, 1) * 0.01
        self.b2 = np.zeros(1)

    def score(self, x):
        h = np.maximum(0, x @ self.W1 + self.b1)
        return (h @ self.W2 + self.b2)[0]
```

### 步骤 2：奖励模型训练

```python
def train_reward_model(model, preferences, lr=1e-3, n_epochs=10):
    for epoch in range(n_epochs):
        for x, y_w, y_l in preferences:
            r_w = model.score(concat(x, y_w))
            r_l = model.score(concat(x, y_l))
            # Bradley-Terry loss
            loss = -np.log(sigmoid(r_w - r_l) + 1e-8)
            # Gradient step
            gradient = compute_gradient(model, loss)
            update_params(model, gradient, lr)
```

### 步骤 3：RLHF 训练 (简化)

```python
def rlhf_train(policy, reward_model, sft_policy, prompts,
               ppo_epochs=4, kl_coef=0.1):
    for prompt in prompts:
        # Generate response
        response = policy.generate(prompt)
        # Get reward
        r = reward_model.score(concat(prompt, response))
        # KL penalty
        kl = compute_kl(policy, sft_policy, prompt, response)
        adjusted_reward = r - kl_coef * kl
        # PPO update (simplified)
        ppo_update(policy, prompt, response, adjusted_reward)
```

## 常见陷阱

- **奖励黑客。** 策略找到奖励模型的漏洞，获得高奖励但输出质量差。修复：KL 惩罚，奖励模型集成，定期人类评估。
- **奖励模型过拟合。** 奖励模型在训练数据上准确但对新输入泛化差。修复：正则化，更多样化的偏好数据。
- **标注者不一致。** 不同标注者对同一对回答给出不同偏好。修复：多人标注取多数，标注者质量筛选。
- **KL 惩罚太大。** 策略不偏离 SFT，对齐效果弱。修复：β 从 0.01 开始，逐步增加。
- **KL 惩罚太小。** 策略偏离太远，输出无意义。修复：监控 KL 散度，超过阈值时增加 β。
- **偏好数据偏差。** 标注者偏好更长、更礼貌但不太准确的回答。修复：长度归一化奖励，质量优先的标注指南。

## 实际应用

| 应用           | 方法              |
| -------------- | ----------------- |
| 聊天机器人对齐 | RLHF + PPO 或 DPO |
| 文本摘要       | RLHF              |
| 代码生成       | RLHF + 执行反馈   |
| 图像生成对齐   | RLHF (人类偏好)   |
| 安全对齐       | 红队测试 + RLHF   |
| 多模态对齐     | RLHF 扩展到多模态 |

## 交付物

保存 `outputs/skill-rlhf-pipeline.md`。技能接收对齐需求 + 数据可用性，输出：方法选择（RLHF vs DPO vs RLAIF）、奖励模型架构、KL 惩罚系数和评估协议。

## 练习

1. **简单。** 运行 `code/main.py`，在合成偏好数据上训练奖励模型。验证奖励模型给 winner 更高分数的比例。
2. **中等。** 实现 DPO：跳过奖励模型，直接从偏好数据优化策略。比较与 RLHF + PPO 的训练稳定性和最终质量。
3. **困难。** 实现奖励模型集成：训练 3 个独立奖励模型，取平均作为最终奖励。比较与单一奖励模型的鲁棒性（在对抗性输入上测试）。

## 关键术语

| 术语          | 人们怎么说     | 实际含义                                      |
| ------------- | -------------- | --------------------------------------------- |
| RLHF          | "人类反馈 RL"  | 从人类偏好训练奖励模型 + RL 优化。            |
| 奖励模型      | "评分器"       | 从偏好数据学习的评分函数。                    |
| Bradley-Terry | "偏好模型"     | 偏好概率的参数化：`P(w > l) = σ(r_w - r_l)`。 |
| KL 惩罚       | "偏离惩罚"     | 防止策略偏离参考模型太远。                    |
| DPO           | "直接偏好优化" | 跳过奖励模型，直接从偏好优化策略。            |
| 奖励黑客      | "奖励作弊"     | 策略利用奖励模型漏洞获得高奖励。              |

## 生产笔记：RLHF 的标注成本

RLHF 最昂贵的组件不是计算，而是人类标注：

- **InstructGPT。** 约 40k 偏好比较，每个约 5 分钟 = 约 3300 标注小时。
- **ChatGPT (推测)。** 数百万偏好比较，持续标注。
- **Claude (推测)。** 类似规模，加上安全专项标注。

降低标注成本的策略：

1. **RLAIF。** 用强模型（GPT-4, Claude）生成偏好标签，成本降低 10-100 倍。
2. **主动学习。** 只标注模型最不确定的比较对。
3. **DPO。** 跳过奖励模型训练，减少标注需求。
4. **合成数据。** 用规则或弱模型生成初始偏好数据，人类只审核边界案例。

## 延伸阅读

- [Ouyang et al. (2022). Training language models to follow instructions with human feedback](https://arxiv.org/abs/2203.02155) — InstructGPT。
- [Christiano et al. (2017). Deep reinforcement learning from human preferences](https://arxiv.org/abs/1706.03741) — 原始 RLHF 论文。
- [Rafailov et al. (2023). Direct Preference Optimization: Your Language Model is Secretly a Reward Model](https://arxiv.org/abs/2305.18290) — DPO。
- [Bai et al. (2022). Training a Helpful and Harmless Assistant with RLHF](https://arxiv.org/abs/2204.05862) — Claude 的 RLHF。
- [Casper et al. (2023). Open Problems and Fundamental Limitations of Reinforcement Learning from Human Feedback](https://arxiv.org/abs/2307.15217) — RLHF 的局限性。
