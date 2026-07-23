---
title: PPO近端策略优化
description: 裁剪策略更新幅度，稳定训练的近端策略优化算法，RLHF的核心训练方法
module: 'machine-learning'
difficulty: advanced
tags:
  - PPO
  - 近端策略优化
  - 裁剪目标
  - RLHF
  - 策略优化
related:
  - 'machine-learning/MDP状态动作与奖励'
  - 'machine-learning/ML流水线'
  - 'machine-learning/Q学习与SARSA'
  - 'machine-learning/RL在游戏中的应用'
prerequisites:
  - 'machine-learning/机器学习概述'
---

# PPO 近端策略优化

> 策略梯度更新太大 = 策略崩溃。更新太小 = 学习慢。PPO 用一个简单的裁剪技巧限制每步更新幅度：`ratio = π_new/π_old`，裁剪到 `[1-ε, 1+ε]`。一个公式，一行代码，解决了策略优化的稳定性问题。这就是训练 ChatGPT 的算法。

**类型:** 构建
**语言:** Python
**前置知识:** Phase 9 · 06 (策略梯度), Phase 9 · 07 (Actor-Critic)
**时间:** ~75 分钟

## 问题

策略梯度方法有一个根本性矛盾：

- **步长太小。** 学习慢，样本效率低。
- **步长太大。** 策略崩溃——新策略与旧策略差异太大，性能突然下降且无法恢复。

TRPO (Schulman, 2015) 用 KL 散度约束解决这个问题：限制 `KL(π_old || π_new) < δ`。数学上优雅，但实现复杂（需要共轭梯度计算 Hessian-向量积）。

PPO (Schulman, 2017) 用更简单的方式达到类似效果：裁剪概率比。

## 核心概念

**概率比。**

```
r_t(θ) = π_θ(a_t|s_t) / π_θ_old(a_t|s_t)
```

如果 r_t > 1，新策略比旧策略更可能选择该动作。如果 r_t < 1，更不可能。

**PPO 裁剪目标。**

```
L^{CLIP}(θ) = E[ min( r_t(θ) · A_t,  clip(r_t(θ), 1-ε, 1+ε) · A_t ) ]
```

裁剪将 r_t 限制在 `[1-ε, 1+ε]` 范围内（通常 ε=0.1-0.2）。`min` 操作确保使用裁剪和未裁剪目标中更保守的那个。

**直觉：**

- 如果 A_t > 0（好动作），r_t 被裁剪到最大 1+ε。策略不能过度增加好动作的概率。
- 如果 A_t < 0（坏动作），r_t 被裁剪到最小 1-ε。策略不能过度减少坏动作的概率。
- 在 `[1-ε, 1+ε]` 范围内，梯度正常流动。超出范围，梯度为零。

**完整 PPO 损失。**

```
L(θ) = E[ L^{CLIP}(θ) - c_1 · L^{VF}(θ) + c_2 · H(π_θ) ]
```

- `L^{CLIP}` — 策略损失（裁剪）
- `L^{VF}` — 价值函数损失（MSE）
- `H(π_θ)` — 熵奖励（鼓励探索）

**PPO 算法。**

1. 用当前策略收集 N 步轨迹
2. 用 GAE 计算优势和回报
3. 对同一批数据执行 M 个 epoch 的 SGD（通常 M=3-10）
4. 重复

关键创新：步骤 3。REINFORCE 和 A2C 每批数据只更新一次。PPO 重用数据多次，但裁剪防止策略偏离太远。

## PPO vs TRPO vs A2C

| 方面        | A2C     | TRPO    | PPO      |
| ----------- | ------- | ------- | -------- |
| 稳定性      | 中等    | 高      | 高       |
| 实现复杂度  | 简单    | 复杂    | 简单     |
| 样本效率    | 低      | 中等    | 高       |
| 计算开销    | 低      | 高      | 中等     |
| 数据重用    | 1 epoch | 1 epoch | 多 epoch |
| 2026 年使用 | 基线    | 少      | 标准     |

## 动手构建

`code/main.py` 在 CartPole 上实现了 PPO。

### 步骤 1：概率比

```python
def compute_ratio(new_log_prob, old_log_prob):
    return np.exp(new_log_prob - old_log_prob)
```

### 步骤 2：PPO 裁剪损失

```python
def ppo_clip_loss(ratio, advantage, epsilon=0.2):
    surr1 = ratio * advantage
    surr2 = np.clip(ratio, 1 - epsilon, 1 + epsilon) * advantage
    return -min(surr1, surr2)  # negative for gradient ascent
```

### 步骤 3：完整 PPO 更新

```python
def ppo_update(actor, critic, optimizer, trajectories, gamma, lam,
               epsilon=0.2, c1=0.5, c2=0.01, n_epochs=4):
    # Compute advantages and returns
    advantages, returns = compute_gae(trajectories, critic, gamma, lam)

    # Store old log probs for ratio computation
    old_log_probs = [actor.log_prob(s, a) for s, a, r in trajectories]

    for epoch in range(n_epochs):
        for i, (s, a, r) in enumerate(trajectories):
            # New log prob
            new_log_prob = actor.log_prob(s, a)
            ratio = np.exp(new_log_prob - old_log_probs[i])

            # Clipped policy loss
            policy_loss = ppo_clip_loss(ratio, advantages[i], epsilon)

            # Value loss
            value_pred = critic.predict(s)
            value_loss = (value_pred - returns[i]) ** 2

            # Entropy bonus
            entropy = actor.entropy(s)

            # Total loss
            loss = policy_loss + c1 * value_loss - c2 * entropy
            optimizer.step(loss)
```

### 步骤 4：训练循环

```python
def train_ppo(env, actor, critic, n_iterations=100, n_steps=2048,
              gamma=0.99, lam=0.95, epsilon=0.2, n_epochs=4):
    for iteration in range(n_iterations):
        # Collect trajectory
        trajectory = collect_trajectory(env, actor, n_steps)

        # PPO update (multiple epochs on same data)
        ppo_update(actor, critic, optimizer, trajectory,
                   gamma, lam, epsilon, n_epochs=n_epochs)

        # Log progress
        if iteration % 10 == 0:
            avg_reward = evaluate(env, actor)
            print(f"Iteration {iteration}: avg_reward = {avg_reward}")
```

## 常见陷阱

- **ε 太大。** ε=0.3+ 允许策略变化太大，不稳定。修复：ε=0.1-0.2 是标准。
- **ε 太小。** ε=0.01 几乎不更新策略，学习慢。修复：ε=0.1-0.2。
- **Epoch 数太多。** n_epochs=20+ 导致过拟合当前批次。修复：n_epochs=3-10。
- **批次太小。** 小批次的梯度估计噪声大。修复：至少 2048 步/批次。
- **价值函数裁剪。** 一些实现也裁剪价值函数更新。通常不必要且可能有害。
- **KL 早停。** 一些实现监控 KL 散度，超过阈值时早停。与裁剪冗余但可作安全网。
- **学习率太大。** PPO 对学习率比 A2C 更鲁棒，但太大仍然不稳定。修复：3e-4 是标准起点。

## 实际应用

| 场景            | PPO 适用性              |
| --------------- | ----------------------- |
| 连续控制        | 非常适合（MuJoCo 标准） |
| 离散控制        | 适合                    |
| RLHF (LLM 训练) | 标准算法                |
| 机器人          | 适合（需要域随机化）    |
| 游戏 AI         | 适合                    |
| 多智能体        | 基础，需要扩展          |

## 交付物

保存 `outputs/skill-ppo-trainer.md`。技能接收环境描述 + 稳定性需求，输出：ε 值、epoch 数、批次大小、学习率调度和评估协议。

## 练习

1. **简单。** 运行 `code/main.py`，比较 ε=0.1, 0.2, 0.3 的训练稳定性。哪个 ε 最稳定？
2. **中等。** 比较 PPO 与 A2C 的样本效率：相同环境交互步数下，哪个达到更高奖励？PPO 的多 epoch 重用是否补偿了额外计算？
3. **困难。** 实现 KL 早停：计算每步的策略 KL 散度，如果 `KL > 0.015` 则停止当前 epoch。比较与纯裁剪 PPO 的稳定性。

## 关键术语

| 术语     | 人们怎么说     | 实际含义                                        |
| -------- | -------------- | ----------------------------------------------- |
| PPO      | "近端策略优化" | 裁剪概率比的策略梯度方法。                      |
| 概率比 r | "新旧比"       | `π_new(a\|s) / π_old(a\|s)`，衡量策略变化程度。 |
| 裁剪     | "clip"         | 将概率比限制在 `[1-ε, 1+ε]` 范围内。            |
| ε        | "裁剪范围"     | 控制每步策略更新幅度，0.1-0.2 是标准。          |
| 多 epoch | "数据重用"     | 对同一批数据多次更新，提高样本效率。            |
| KL 早停  | "安全网"       | KL 散度超阈值时停止更新。                       |

## 生产笔记：PPO 是 RLHF 的核心

PPO 在 2026 年最广泛的应用不是机器人或游戏，而是大语言模型的 RLHF 训练。ChatGPT, Claude, Gemini 的对齐训练都使用 PPO（或其变体 DPO）。

RLHF 中的 PPO 管线：

1. **SFT 模型。** 监督微调的语言模型作为初始策略。
2. **奖励模型。** 从人类偏好数据训练的评分模型。
3. **PPO 训练。** 语言模型生成回复，奖励模型评分，PPO 更新语言模型。

关键生产细节：

- **KL 惩罚。** 在 RLHF 中，PPO 的裁剪不够——需要额外的 KL 惩罚防止语言模型偏离 SFT 模型太远（否则模型可能产生高奖励但无意义的输出）。
- **奖励归一化。** 奖励模型的输出范围可能很大。运行均值/标准差归一化是必要的。
- **批量大小。** RLHF 的 PPO 批量通常很大（数百万 token），因为语言模型比简单控制策略大得多。

## 延伸阅读

- [Schulman et al. (2017). Proximal Policy Optimization Algorithms](https://arxiv.org/abs/1707.06347) — PPO 论文。
- [Schulman et al. (2015). Trust Region Policy Optimization](https://arxiv.org/abs/1502.05477) — TRPO，PPO 的前身。
- [Ouyang et al. (2022). Training language models to follow instructions with human feedback](https://arxiv.org/abs/2203.02155) — InstructGPT，RLHF + PPO。
- [Zheng et al. (2023). Secrets of RLHF in Large Language Models](https://arxiv.org/abs/2307.04964) — RLHF 工程实践。
- [CleanRL PPO Implementation](https://github.com/vwxyzjn/cleanrl) — 单文件 PPO 实现，教学参考。
