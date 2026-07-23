---
title: RLHF人类反馈强化学习
description: '理解 RLHF 的完整流程：奖励模型训练和 PPO 强化学习对齐'
module: llm
difficulty: advanced
tags:
  - RLHF
  - 'reward model'
  - PPO
  - 对齐
  - 强化学习
related:
  - llm/LLM评估
  - llm/RAG检索增强生成
prerequisites:
  - llm/安全护栏
---

# RLHF人类反馈强化学习

> SFT 教会模型遵循指令，但模型仍然可能输出冗长、不安全或不一致的回复。RLHF 通过人类偏好信号进一步对齐模型行为——让模型不仅"听话"，而且"说好话"。

**类型：** 构建
**语言：** Python
**前置条件：** Phase 10 Lesson 06（指令微调 SFT）
**预计时间：** ~90 分钟

## 学习目标

- 理解 RLHF 的三步流程：SFT → 奖励模型 → PPO 优化
- 实现奖励模型的训练：从人类偏好数据学习
- 理解 PPO 在 RLHF 中的作用和 KL 散度惩罚
- 分析 RLHF 的局限性和常见问题

## RLHF 三步流程

```
Step 1: SFT
  预训练模型 → 指令微调 → SFT 模型

Step 2: 奖励模型训练
  SFT 模型生成多个回复 → 人类排序 → 训练奖励模型

Step 3: PPO 优化
  SFT 模型 → PPO 优化（奖励模型提供信号）→ 对齐模型
```

## Step 1: 奖励模型

奖励模型学习人类的偏好：给定一个 prompt 和回复，输出一个标量分数。

```python
import torch
import torch.nn as nn


class RewardModel(nn.Module):
    """奖励模型：基于 SFT 模型，添加标量输出头"""

    def __init__(self, base_model, hidden_size=4096):
        super().__init__()
        self.base_model = base_model
        self.value_head = nn.Linear(hidden_size, 1)

    def forward(self, input_ids, attention_mask=None):
        # 获取最后一层隐藏状态
        outputs = self.base_model(input_ids, attention_mask=attention_mask)
        last_hidden = outputs.last_hidden_state

        # 取最后一个 token 的表示
        if attention_mask is not None:
            last_token_idx = attention_mask.sum(dim=1) - 1
            last_hidden = last_hidden[torch.arange(len(last_token_idx)), last_token_idx]
        else:
            last_hidden = last_hidden[:, -1]

        # 输出标量奖励
        reward = self.value_head(last_hidden).squeeze(-1)
        return reward


def train_reward_model(model, preference_data, optimizer, epochs=1):
    """训练奖励模型"""
    model.train()

    for epoch in range(epochs):
        total_loss = 0

        for batch in preference_data:
            # preference_data: (prompt, chosen_response, rejected_response)
            chosen_ids = batch['chosen_input_ids']
            rejected_ids = batch['rejected_input_ids']

            chosen_reward = model(chosen_ids)
            rejected_reward = model(rejected_ids)

            # Bradley-Terry 模型：chosen 应该比 rejected 得分更高
            loss = -torch.log(torch.sigmoid(chosen_reward - rejected_reward)).mean()

            loss.backward()
            optimizer.step()
            optimizer.zero_grad()

            total_loss += loss.item()

        print(f"Epoch {epoch + 1} | Loss: {total_loss / len(preference_data):.4f}")
```

## Step 2: PPO 优化

使用近端策略优化（PPO）微调 SFT 模型，最大化奖励模型的评分，同时用 KL 散度惩罚防止偏离原始模型太远。

```python
def ppo_step(policy_model, ref_model, reward_model, tokenizer,
             prompts, optimizer, kl_coeff=0.1, clip_range=0.2,
             ppo_epochs=4, batch_size=4, device='cuda'):
    """PPO 优化步骤"""

    # 生成回复
    responses = []
    log_probs_old = []

    with torch.no_grad():
        for prompt in prompts:
            input_ids = tokenizer.encode(prompt, return_tensors='pt').to(device)
            output = policy_model.generate(input_ids, max_new_tokens=256, do_sample=True)
            response = output[0][input_ids.shape[1]:]
            responses.append(response)

            # 计算旧策略的 log probability
            logits = policy_model(output)[0]
            log_prob = torch.log_softmax(logits, dim=-1)
            log_probs_old.append(log_prob.gather(-1, response.unsqueeze(-1)).sum())

    # 计算奖励
    rewards = []
    with torch.no_grad():
        for prompt, response in zip(prompts, responses):
            full_input = torch.cat([tokenizer.encode(prompt, return_tensors='pt').to(device)[0], response])
            reward = reward_model(full_input.unsqueeze(0))
            rewards.append(reward)

    # PPO 更新
    for _ in range(ppo_epochs):
        for i in range(0, len(prompts), batch_size):
            batch_rewards = torch.stack(rewards[i:i+batch_size])
            batch_log_probs_old = torch.stack(log_probs_old[i:i+batch_size])

            # 计算新策略的 log probability
            batch_log_probs_new = []
            for prompt, response in zip(prompts[i:i+batch_size], responses[i:i+batch_size]):
                full_input = torch.cat([tokenizer.encode(prompt, return_tensors='pt').to(device)[0], response])
                logits = policy_model(full_input.unsqueeze(0))[0]
                log_prob = torch.log_softmax(logits, dim=-1)
                batch_log_probs_new.append(log_prob.gather(-1, response.unsqueeze(-1)).sum())

            batch_log_probs_new = torch.stack(batch_log_probs_new)

            # 优势（简化：奖励即为优势）
            advantages = batch_rewards - batch_rewards.mean()

            # PPO 裁剪目标
            ratio = torch.exp(batch_log_probs_new - batch_log_probs_old)
            clipped_ratio = torch.clamp(ratio, 1 - clip_range, 1 + clip_range)
            policy_loss = -torch.min(ratio * advantages, clipped_ratio * advantages).mean()

            # KL 散度惩罚
            with torch.no_grad():
                ref_log_probs = []
                for prompt, response in zip(prompts[i:i+batch_size], responses[i:i+batch_size]):
                    full_input = torch.cat([tokenizer.encode(prompt, return_tensors='pt').to(device)[0], response])
                    ref_logits = ref_model(full_input.unsqueeze(0))[0]
                    ref_log_prob = torch.log_softmax(ref_logits, dim=-1)
                    ref_log_probs.append(ref_log_prob.gather(-1, response.unsqueeze(-1)).sum())
                ref_log_probs = torch.stack(ref_log_probs)

            kl_penalty = kl_coeff * (batch_log_probs_new - ref_log_probs).mean()

            loss = policy_loss + kl_penalty
            loss.backward()
            optimizer.step()
            optimizer.zero_grad()
```

## RLHF 的问题

**奖励黑客（Reward Hacking）。** 模型可能学会利用奖励模型的漏洞，生成高分但实际质量差的回复。例如，模型可能学会生成冗长但空洞的回复，因为奖励模型倾向于给更长的回复更高分。

**KL 散度的权衡。** KL 惩罚太大会导致模型无法学到新行为；太小会导致模型偏离原始分布，产生不连贯的输出。

**标注成本。** 人类偏好数据的获取成本高昂。每条数据需要人工比较多个回复的质量。

**对齐税。** RLHF 可能降低模型在某些能力上的表现（如推理能力），这是"对齐税"。

## 关键术语

| 术语        | 通俗说法         | 实际含义                                                                       |
| ----------- | ---------------- | ------------------------------------------------------------------------------ |
| RLHF        | "用人类反馈训练" | Reinforcement Learning from Human Feedback，用人类偏好信号通过强化学习对齐模型 |
| 奖励模型    | "打分器"         | 学习人类偏好的模型，给定 prompt 和回复输出标量分数                             |
| PPO         | "近端策略优化"   | Proximal Policy Optimization，限制策略更新幅度的强化学习算法                   |
| KL 散度惩罚 | "别走太远"       | 防止优化后的模型偏离原始模型太远的正则化项                                     |
| 奖励黑客    | "钻漏洞"         | 模型学会利用奖励模型的缺陷获取高分，而非真正提升回复质量                       |

## 延伸阅读

- [Ouyang et al., 2022 -- "Training language models to follow instructions with human feedback"](https://arxiv.org/abs/2203.02155) -- InstructGPT 论文，RLHF 的里程碑
- [Christiano et al., 2017 -- "Deep Reinforcement Learning from Human Preferences"](https://arxiv.org/abs/1706.03741) -- RLHF 方法的原始论文
- [Ziegler et al., 2019 -- "Fine-Tuning Language Models from Human Preferences"](https://arxiv.org/abs/1909.08593) -- 将 RLHF 应用于语言模型的早期工作
- [Skalse et al., 2022 -- "Defining and Characterizing Reward Hacking"](https://arxiv.org/abs/2209.13085) -- 奖励黑客问题的系统性分析
