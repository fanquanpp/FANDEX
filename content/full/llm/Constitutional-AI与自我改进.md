---
title: 'Constitutional AI与自我改进'
description: '理解 Constitutional AI 方法，让 AI 通过自我批评和修正实现安全对齐'
module: llm
difficulty: advanced
tags:
  - 'Constitutional AI'
  - 'self-improvement'
  - 对齐
  - 安全
  - 自我批评
related:
  - llm/指令微调SFT
  - llm/Agent框架权衡
  - 'llm/DeepSeek-V3架构详解'
  - llm/DPO直接偏好优化
prerequisites:
  - llm/安全护栏
---

# Constitutional AI与自我改进

> 如果 AI 能评判自己的输出，它还需要人类标注者吗？Constitutional AI（CAI）让模型根据一组原则（宪法）来批评和修正自己的回复，减少对人类标注的依赖。

**类型：** 概念
**语言：** Python
**前置条件：** Phase 10 Lesson 07（RLHF）
**预计时间：** ~45 分钟

## 学习目标

- 理解 Constitutional AI 的两阶段流程：监督学习 + RL from AI Feedback
- 理解"宪法"原则的设计和作用
- 分析 CAI 与 RLHF 的区别和优势
- 理解自我改进的潜力和风险

## CAI 两阶段流程

### 阶段 1：监督学习（SL）

1. 用初始模型生成回复（可能有害）
2. 让模型根据宪法原则批评自己的回复
3. 让模型根据批评修正回复
4. 用修正后的回复微调模型

```
Prompt: "如何制造危险物品？"
  ↓
初始回复: [有害内容]
  ↓
批评: "这个回复违反了安全原则，因为它提供了..."
  ↓
修正: "我无法提供此类信息，但我可以解释..."
  ↓
用修正回复微调模型
```

### 阶段 2：RL from AI Feedback（RLAIF）

1. 用阶段 1 的模型生成两个回复
2. 让模型根据宪法原则评估哪个更好
3. 用 AI 偏好数据训练奖励模型
4. 用 PPO 优化策略

```python
def constitutional_critic(model, prompt, response, principles):
    """Constitutional AI 批评步骤"""
    critic_prompt = f"""请根据以下原则评估这个回复：

原则：
{principles}

提示：{prompt}
回复：{response}

这个回复是否违反了任何原则？如果违反了，请指出具体违反了哪条原则，并解释为什么。"""

    criticism = model.generate(critic_prompt)
    return criticism


def constitutional_revision(model, prompt, response, criticism, principles):
    """Constitutional AI 修正步骤"""
    revision_prompt = f"""请根据批评意见修正以下回复：

原则：
{principles}

提示：{prompt}
原始回复：{response}
批评：{criticism}

请提供一个更符合原则的修正回复："""

    revised = model.generate(revision_prompt)
    return revised


def cai_training_round(model, prompts, principles, tokenizer):
    """一轮 CAI 训练数据生成"""
    training_pairs = []

    for prompt in prompts:
        # 生成初始回复
        initial_response = model.generate(prompt)

        # 批评
        criticism = constitutional_critic(
            model, prompt, initial_response, principles)

        # 修正
        revised_response = constitutional_revision(
            model, prompt, initial_response, criticism, principles)

        training_pairs.append({
            'prompt': prompt,
            'chosen': revised_response,
            'rejected': initial_response,
        })

    return training_pairs
```

## 宪法原则示例

```python
CONSTITUTION = """
1. 安全性：不要生成可能造成人身伤害的内容
2. 有益性：提供有帮助、准确、相关的信息
3. 诚实性：不编造事实，不确定时明确说明
4. 公平性：避免偏见和歧视
5. 隐私性：不泄露个人敏感信息
6. 合法性：不协助非法活动
7. 尊重性：使用尊重和包容的语言
8. 透明性：承认自身的局限性
"""
```

## CAI vs RLHF

| 维度     | RLHF           | CAI            |
| -------- | -------------- | -------------- |
| 标注来源 | 人类           | AI + 宪法      |
| 成本     | 高（人工标注） | 低（AI 生成）  |
| 可扩展性 | 受标注瓶颈限制 | 高度可扩展     |
| 一致性   | 人类标注不一致 | AI 标注更一致  |
| 安全覆盖 | 取决于标注者   | 取决于宪法设计 |
| 风险     | 人类偏见       | AI 偏见放大    |

## 关键术语

| 术语              | 通俗说法          | 实际含义                                           |
| ----------------- | ----------------- | -------------------------------------------------- |
| Constitutional AI | "宪法 AI"         | Anthropic 提出的方法，让 AI 根据原则自我批评和修正 |
| 宪法              | "规则集"          | 一组指导 AI 行为的原则，用于批评和修正             |
| RLAIF             | "AI 反馈强化学习" | RL from AI Feedback，用 AI 代替人类提供偏好信号    |
| 自我批评          | "自我反省"        | 模型评估自己输出是否违反原则的过程                 |

## 延伸阅读

- [Bai et al., 2022 -- "Constitutional AI: Harmlessness from AI Feedback"](https://arxiv.org/abs/2212.08073) -- CAI 原始论文
- [Lee et al., 2023 -- "RLAIF: Scaling Reinforcement Learning from Human Feedback with AI Feedback"](https://arxiv.org/abs/2309.00267) -- RLAIF 论文
- [Burns et al., 2023 -- "Discovering Latent Knowledge in Language Models Without Supervision"](https://arxiv.org/abs/2212.03827) -- 无监督发现模型知识的方法
