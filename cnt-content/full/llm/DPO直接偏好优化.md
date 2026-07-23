---
title: DPO直接偏好优化
description: '理解 DPO 算法如何绕过奖励模型，直接从人类偏好数据优化语言模型'
module: llm
difficulty: advanced
tags:
  - DPO
  - 'preference optimization'
  - 对齐
  - 偏好学习
related:
  - 'llm/Constitutional-AI与自我改进'
  - 'llm/DeepSeek-V3架构详解'
  - llm/DualPipe并行
  - 'llm/Jamba混合SSM-Transformer'
prerequisites:
  - llm/安全护栏
---

# DPO直接偏好优化

> RLHF 需要训练奖励模型，再用 PPO 优化——两步流程复杂且不稳定。DPO（Direct Preference Optimization）跳过奖励模型，直接从偏好数据优化策略。更简单、更稳定、效果相当。

**类型：** 构建
**语言：** Python
**前置条件：** Phase 10 Lesson 07（RLHF）
**预计时间：** ~60 分钟

## 学习目标

- 理解 DPO 的数学推导：从 RLHF 目标到 DPO 损失
- 实现 DPO 训练循环
- 理解 DPO 与 RLHF 的权衡
- 掌握 DPO 的变体：IPO、KTO、ORPO

## DPO 核心思想

RLHF 的目标是最大化奖励同时保持接近参考策略：

$$\max_\pi \mathbb{E}_{\pi}[r(x,y)] - \beta \cdot D_{KL}(\pi \| \pi_{ref})$$

DPO 的关键洞察：这个优化问题有闭式解。最优策略可以表示为：

$$\pi^*(y|x) = \frac{1}{Z(x)} \pi_{ref}(y|x) \exp\left(\frac{1}{\beta} r(x,y)\right)$$

将奖励表示为策略和参考策略的函数：

$$r(x,y) = \beta \log \frac{\pi^*(y|x)}{\pi_{ref}(y|x)} + \beta \log Z(x)$$

代入 Bradley-Terry 偏好模型，配分函数 $Z(x)$ 被消去，得到 DPO 损失：

$$\mathcal{L}_{DPO} = -\mathbb{E}\left[\log \sigma\left(\beta \log \frac{\pi(y_w|x)}{\pi_{ref}(y_w|x)} - \beta \log \frac{\pi(y_l|x)}{\pi_{ref}(y_l|x)}\right)\right]$$

其中 $y_w$ 是被偏好的回复，$y_l$ 是被拒绝的回复。

## DPO 实现

```python
import torch
import torch.nn.functional as F


def dpo_loss(policy_chosen_logps, policy_rejected_logps,
             reference_chosen_logps, reference_rejected_logps,
             beta=0.1):
    """DPO 损失函数"""
    # 计算 log 比率
    chosen_logratios = policy_chosen_logps - reference_chosen_logps
    rejected_logratios = policy_rejected_logps - reference_rejected_logps

    # DPO 损失
    logits = beta * (chosen_logratios - rejected_logratios)
    loss = -F.logsigmoid(logits).mean()

    # 可选：计算指标
    with torch.no_grad():
        chosen_rewards = beta * chosen_logratios
        rejected_rewards = beta * rejected_logratios
        accuracy = (chosen_rewards > rejected_rewards).float().mean()
        margin = (chosen_rewards - rejected_rewards).mean()

    return loss, accuracy, margin


def compute_log_probs(model, input_ids, attention_mask, labels):
    """计算给定序列的 log probability"""
    outputs = model(input_ids, attention_mask=attention_mask)
    logits = outputs.logits

    # 移位：预测下一个 token
    shift_logits = logits[..., :-1, :].contiguous()
    shift_labels = labels[..., 1:].contiguous()

    # 计算 log softmax
    log_probs = F.log_softmax(shift_logits, dim=-1)

    # 选择对应 token 的 log prob
    per_token_logps = log_probs.gather(-1, shift_labels.unsqueeze(-1)).squeeze(-1)

    # 仅计算非填充位置的 log prob
    mask = shift_labels != -100
    per_token_logps = per_token_logps * mask

    return per_token_logps.sum(dim=-1)


def train_dpo(policy_model, ref_model, dataloader, optimizer,
              beta=0.1, epochs=1, device='cuda'):
    """DPO 训练循环"""
    policy_model = policy_model.to(device)
    ref_model = ref_model.to(device)
    ref_model.eval()  # 参考模型不更新

    for epoch in range(epochs):
        total_loss = 0
        total_accuracy = 0

        for batch in dataloader:
            # Chosen 回复
            chosen_ids = batch['chosen_input_ids'].to(device)
            chosen_mask = batch['chosen_attention_mask'].to(device)
            chosen_labels = batch['chosen_labels'].to(device)

            # Rejected 回复
            rejected_ids = batch['rejected_input_ids'].to(device)
            rejected_mask = batch['rejected_attention_mask'].to(device)
            rejected_labels = batch['rejected_labels'].to(device)

            # 策略模型的 log probs
            policy_chosen_logps = compute_log_probs(
                policy_model, chosen_ids, chosen_mask, chosen_labels)
            policy_rejected_logps = compute_log_probs(
                policy_model, rejected_ids, rejected_mask, rejected_labels)

            # 参考模型的 log probs（不计算梯度）
            with torch.no_grad():
                ref_chosen_logps = compute_log_probs(
                    ref_model, chosen_ids, chosen_mask, chosen_labels)
                ref_rejected_logps = compute_log_probs(
                    ref_model, rejected_ids, rejected_mask, rejected_labels)

            # DPO 损失
            loss, accuracy, margin = dpo_loss(
                policy_chosen_logps, policy_rejected_logps,
                ref_chosen_logps, ref_rejected_logps,
                beta=beta,
            )

            loss.backward()
            torch.nn.utils.clip_grad_norm_(policy_model.parameters(), 1.0)
            optimizer.step()
            optimizer.zero_grad()

            total_loss += loss.item()
            total_accuracy += accuracy.item()

        n = len(dataloader)
        print(f"Epoch {epoch + 1} | Loss: {total_loss/n:.4f} | "
              f"Accuracy: {total_accuracy/n:.4f}")
```

## DPO 变体

| 方法  | 核心改进                   | 优势               |
| ----- | -------------------------- | ------------------ |
| DPO   | 直接优化偏好               | 简单稳定           |
| IPO   | 用平方损失替代 log-sigmoid | 避免过拟合偏好数据 |
| KTO   | 只需好/坏标签，不需要配对  | 数据收集更简单     |
| ORPO  | 合并 SFT 和偏好优化        | 单阶段训练         |
| SimPO | 移除参考模型               | 更简单、更快       |

## DPO vs RLHF

| 维度     | RLHF                | DPO                |
| -------- | ------------------- | ------------------ |
| 训练步骤 | 奖励模型 + PPO      | 直接优化           |
| 稳定性   | 低（PPO 超参敏感）  | 高                 |
| 计算成本 | 高（需要 4 个模型） | 低（2 个模型）     |
| 奖励黑客 | 有风险              | 风险较低           |
| 在线学习 | 支持                | 不支持（离线方法） |

## 关键术语

| 术语     | 通俗说法       | 实际含义                                                           |
| -------- | -------------- | ------------------------------------------------------------------ |
| DPO      | "直接偏好优化" | Direct Preference Optimization，绕过奖励模型直接从偏好数据优化策略 |
| 偏好数据 | "好和坏的对比" | 包含 chosen（被偏好）和 rejected（被拒绝）回复的数据               |
| 参考模型 | "原始模型"     | DPO 训练中不更新的 SFT 模型，用于计算 KL 惩罚                      |
| Beta     | "保守程度"     | 控制策略偏离参考模型程度的超参数                                   |

## 延伸阅读

- [Rafailov et al., 2023 -- "Direct Preference Optimization: Your Language Model is Secretly a Reward Model"](https://arxiv.org/abs/2305.18290) -- DPO 原始论文
- [Azar et al., 2023 -- "A General Theoretical Paradigm to Understand Learning from Human Preferences"](https://arxiv.org/abs/2310.12036) -- IPO 论文
- [Ethayarajh et al., 2024 -- "KTO: Model Alignment as Prospect Theoretic Optimization"](https://arxiv.org/abs/2402.01306) -- KTO 论文
- [Hong et al., 2024 -- "ORPO: Monolithic Preference Optimization without Reference Model"](https://arxiv.org/abs/2403.07691) -- ORPO 论文
