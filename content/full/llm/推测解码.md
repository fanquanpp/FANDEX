---
title: 推测解码
description: 理解推测解码的原理和实现，通过小模型辅助加速大模型推理
module: llm
difficulty: intermediate
tags:
  - 'speculative decoding'
  - 推理加速
  - 推测解码
  - 草稿模型
related:
  - llm/提示工程
  - llm/提示缓存
  - llm/推测解码EAGLE3
  - llm/推理优化
prerequisites:
  - llm/安全护栏
---

# 推测解码

> 大模型生成一个 token 需要 200ms，但验证 5 个 token 只需要 220ms。推测解码利用这个不对称性——小模型猜 5 个 token，大模型一次验证，速度提升 2-3x。

**类型：** 构建
**语言：** Python
**前置条件：** Phase 10 Lesson 12（推理优化）
**预计时间：** ~45 分钟

## 学习目标

- 理解推测解码的数学保证：输出分布与自回归完全一致
- 实现推测解码的验证和采样步骤
- 理解接受率和加速比的关系
- 掌握 draft 模型的选择策略

## 算法流程

```
1. Draft 模型自回归生成 K 个候选 token: [t1, t2, ..., tK]
2. Target 模型并行验证：一次前向传播计算所有 K+1 个位置的 logits
3. 从左到右验证每个 token：
   - 如果 p_target(t) >= p_draft(t)：接受
   - 否则：以概率 p_target(t)/p_draft(t) 接受，或从修正分布重新采样
4. 如果所有 K 个 token 都被接受，额外采样第 K+1 个 token
```

```python
import torch
import torch.nn.functional as F


def speculative_decode(target_model, draft_model, tokenizer,
                       prompt, max_tokens=256, K=5, device='cuda'):
    """推测解码"""
    input_ids = tokenizer.encode(prompt, return_tensors='pt').to(device)
    generated = input_ids.clone()

    while generated.shape[1] < input_ids.shape[1] + max_tokens:
        # Step 1: Draft 模型生成 K 个候选 token
        draft_tokens = []
        draft_probs = []
        current = generated.clone()

        with torch.no_grad():
            for _ in range(K):
                outputs = draft_model(current)
                logits = outputs.logits[:, -1, :]
                probs = F.softmax(logits, dim=-1)
                token = torch.multinomial(probs, 1)
                draft_tokens.append(token)
                draft_probs.append(probs)
                current = torch.cat([current, token], dim=-1)

        # Step 2: Target 模型并行验证
        with torch.no_grad():
            outputs = target_model(current)
            target_logits = outputs.logits

        # Step 3: 逐个验证
        n_accepted = 0
        for i in range(K):
            pos = generated.shape[1] + i - 1
            target_probs = F.softmax(target_logits[:, pos, :], dim=-1)
            draft_prob = draft_probs[i].gather(-1, draft_tokens[i])

            token_id = draft_tokens[i].item()
            target_prob = target_probs[0, token_id].item()
            draft_p = draft_prob.item()

            # 接受条件
            if target_prob >= draft_p or random.random() < target_prob / max(draft_p, 1e-10):
                n_accepted += 1
                generated = torch.cat([generated, draft_tokens[i]], dim=-1)
            else:
                # 拒绝：从修正分布采样
                modified_probs = torch.clamp(target_probs - draft_probs[i], min=0)
                modified_probs = modified_probs / modified_probs.sum()
                new_token = torch.multinomial(modified_probs, 1)
                generated = torch.cat([generated, new_token], dim=-1)
                break

        # 如果全部接受，额外采样一个 token
        if n_accepted == K:
            last_pos = generated.shape[1] - 1
            last_probs = F.softmax(target_logits[:, last_pos, :], dim=-1)
            extra_token = torch.multinomial(last_probs, 1)
            generated = torch.cat([generated, extra_token], dim=-1)

    return tokenizer.decode(generated[0])
```

## 加速比分析

$$\text{Speedup} \approx \frac{\alpha \cdot K + 1}{1 + \frac{C_{draft}}{C_{target}}}$$

其中 $\alpha$ 是接受率，$K$ 是候选长度，$C_{draft}/C_{target}$ 是 draft 模型与 target 模型的成本比。

| 接受率 | K=5  | K=7  | K=10 |
| ------ | ---- | ---- | ---- |
| 0.6    | 2.0x | 2.2x | 2.4x |
| 0.8    | 2.7x | 3.1x | 3.5x |
| 0.9    | 3.0x | 3.6x | 4.2x |

## Draft 模型选择

| 策略         | 示例                 | 接受率        | Draft 成本 |
| ------------ | -------------------- | ------------- | ---------- |
| 同系列小模型 | LLaMA-7B → LLaMA-70B | 高（0.7-0.9） | 中         |
| 蒸馏模型     | Distill → Teacher    | 高            | 低         |
| 同模型早期层 | 共享 backbone        | 最高          | 最低       |
| N-gram 模型  | 统计模型             | 低（0.3-0.5） | 极低       |

## 关键术语

| 术语       | 通俗说法     | 实际含义                                       |
| ---------- | ------------ | ---------------------------------------------- |
| 推测解码   | "猜然后验证" | 小模型生成候选 token，大模型并行验证的加速方法 |
| Draft 模型 | "草稿模型"   | 生成候选 token 的轻量级模型                    |
| 接受率     | "猜对比例"   | 大模型验证时接受 draft token 的比例            |
| 修正分布   | "纠正采样"   | 拒绝 draft token 后，从修正的概率分布重新采样  |

## 延伸阅读

- [Leviathan et al., 2023 -- "Fast Inference from Transformers via Speculative Decoding"](https://arxiv.org/abs/2211.17192) -- 推测解码论文
- [Chen et al., 2023 -- "Accelerating Large Language Model Decoding with Speculative Sampling"](https://arxiv.org/abs/2302.01318) -- 推测采样论文
