---
title: 指令微调SFT
description: 理解监督微调（SFT）的原理和实现，将预训练模型转化为指令遵循模型
module: llm
difficulty: intermediate
tags:
  - SFT
  - 'instruction tuning'
  - 监督微调
  - 指令微调
  - 对齐
related:
  - 'llm/预训练Mini-GPT'
  - llm/原生稀疏注意力
  - llm/Agent框架权衡
  - 'llm/Constitutional-AI与自我改进'
prerequisites:
  - llm/安全护栏
---

# 指令微调SFT

> 预训练模型能预测下一个 token，但它不知道如何遵循指令。SFT（Supervised Fine-Tuning）教会模型"听懂人话"——从续写文本变成回答问题、执行任务。

**类型：** 构建
**语言：** Python
**前置条件：** Phase 10 Lesson 04（预训练 Mini-GPT）
**预计时间：** ~60 分钟

## 学习目标

- 理解预训练和微调的区别与联系
- 构建 SFT 训练数据集（指令-回复对）
- 实现 SFT 训练循环，包括 EOS token 处理
- 理解训练技巧：学习率、epoch 数、数据质量的影响

## 预训练 vs 微调

| 维度     | 预训练           | SFT                    |
| -------- | ---------------- | ---------------------- |
| 目标     | 预测下一个 token | 生成符合指令的回复     |
| 数据     | 无标注原始文本   | 指令-回复对            |
| 数据量   | 万亿 token       | 数万到数十万条         |
| 学习率   | 1e-4 到 3e-4     | 1e-5 到 5e-5           |
| 训练轮数 | 1 epoch          | 3-5 epochs             |
| 损失计算 | 所有 token       | 仅计算回复部分的 token |

## SFT 数据格式

```python
# Alpaca 格式
{
    "instruction": "将下面的句子翻译成英文",
    "input": "今天天气很好",
    "output": "The weather is nice today."
}

# ChatML 格式
{
    "messages": [
        {"role": "system", "content": "你是一个有帮助的助手。"},
        {"role": "user", "content": "将下面的句子翻译成英文：今天天气很好"},
        {"role": "assistant", "content": "The weather is nice today."}
    ]
}
```

## 实现 SFT 训练

```python
import torch
import torch.nn.functional as F
from dataclasses import dataclass


@dataclass
class SFTDataCollator:
    """SFT 数据整理器：构建输入和标签"""
    tokenizer: object
    max_length: int = 2048

    def __call__(self, examples):
        batch = []

        for ex in examples:
            # 构建提示模板
            prompt = f"### Instruction:\n{ex['instruction']}\n\n"
            if ex.get('input'):
                prompt += f"### Input:\n{ex['input']}\n\n"
            prompt += f"### Response:\n"

            # 编码
            prompt_ids = self.tokenizer.encode(prompt)
            response_ids = self.tokenizer.encode(ex['output'])

            # 拼接：prompt + response + EOS
            input_ids = prompt_ids + response_ids + [self.tokenizer.eos_token_id]

            # 截断
            input_ids = input_ids[:self.max_length]

            # 标签：prompt 部分设为 -100（不计算损失）
            labels = [-100] * len(prompt_ids) + response_ids + [self.tokenizer.eos_token_id]
            labels = labels[:self.max_length]

            batch.append({
                'input_ids': input_ids,
                'labels': labels,
                'attention_mask': [1] * len(input_ids),
            })

        # 填充到相同长度
        max_len = max(len(b['input_ids']) for b in batch)
        for b in batch:
            pad_len = max_len - len(b['input_ids'])
            b['input_ids'] += [self.tokenizer.pad_token_id] * pad_len
            b['labels'] += [-100] * pad_len
            b['attention_mask'] += [0] * pad_len

        return {
            'input_ids': torch.tensor([b['input_ids'] for b in batch]),
            'labels': torch.tensor([b['labels'] for b in batch]),
            'attention_mask': torch.tensor([b['attention_mask'] for b in batch]),
        }


def train_sft(model, dataloader, optimizer, epochs=3, lr=2e-5, device='cuda'):
    """SFT 训练循环"""
    model = model.to(device)

    for epoch in range(epochs):
        model.train()
        total_loss = 0

        for batch in dataloader:
            input_ids = batch['input_ids'].to(device)
            labels = batch['labels'].to(device)
            attention_mask = batch['attention_mask'].to(device)

            # 前向传播
            outputs = model(input_ids, attention_mask=attention_mask)
            logits = outputs.logits

            # 仅计算回复部分的损失
            shift_logits = logits[..., :-1, :].contiguous()
            shift_labels = labels[..., 1:].contiguous()

            loss = F.cross_entropy(
                shift_logits.view(-1, shift_logits.size(-1)),
                shift_labels.view(-1),
                ignore_index=-100,
            )

            # 反向传播
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
            optimizer.zero_grad()

            total_loss += loss.item()

        avg_loss = total_loss / len(dataloader)
        print(f"Epoch {epoch + 1}/{epochs} | Loss: {avg_loss:.4f}")
```

## 训练技巧

**学习率选择。** SFT 的学习率通常比预训练低一个数量级（1e-5 到 5e-5），因为模型已经学会了语言表示，只需要微调行为。

**损失掩码。** 只计算回复部分的损失是关键。如果也计算 prompt 部分的损失，模型会浪费容量学习"复制指令"而不是"生成回复"。

**数据质量 > 数据量。** LIMA 论文表明，仅用 1,000 条高质量数据就能训练出与 GPT-4 相当的模型。数据质量比数量更重要。

**Epoch 数。** SFT 通常训练 3-5 个 epoch。训练过多会导致过拟合——模型开始记忆训练数据而不是泛化。

## 关键术语

| 术语          | 通俗说法         | 实际含义                                              |
| ------------- | ---------------- | ----------------------------------------------------- |
| SFT           | "教模型听话"     | Supervised Fine-Tuning，在指令-回复对上微调预训练模型 |
| 损失掩码      | "只算回复的损失" | 将 prompt 部分的标签设为 -100，不参与损失计算         |
| 指令遵循      | "听懂人话"       | 模型能够理解并执行用户指令的能力                      |
| Chat Template | "对话模板"       | 将多轮对话格式化为模型可理解的输入格式                |

## 延伸阅读

- [Ouyang et al., 2022 -- "Training language models to follow instructions with human feedback"](https://arxiv.org/abs/2203.02155) -- InstructGPT 论文，SFT + RLHF 的原始框架
- [Zhou et al., 2023 -- "LIMA: Less Is More for Alignment"](https://arxiv.org/abs/2305.11206) -- 证明 1,000 条高质量数据足以微调的论文
- [Wang et al., 2023 -- "Self-Instruct: Aligning Language Models with Self-Generated Instructions"](https://arxiv.org/abs/2212.10560) -- 自动生成 SFT 数据的方法
- [Conover et al., 2023 -- "The FineWeb Datasets"](https://huggingface.co/datasets/HuggingFaceFW/fineweb) -- 大规模 SFT 数据集
