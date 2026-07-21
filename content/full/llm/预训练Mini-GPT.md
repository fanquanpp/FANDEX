---
title: '预训练Mini-GPT'
description: '从零构建和训练一个小型 GPT 模型，理解预训练的完整流程'
module: llm
difficulty: advanced
tags:
  - 'pre-training'
  - GPT
  - transformer
  - 预训练
  - 语言模型
related:
  - llm/微调与LoRA
  - llm/异步Hogwild推理
  - llm/原生稀疏注意力
  - llm/指令微调SFT
prerequisites:
  - llm/安全护栏
---

# 预训练Mini-GPT

> 预训练是 LLM 的基础。在这个阶段，模型通过预测下一个 token 来学习语言的统计规律。你将从零构建一个小型 GPT，完成从模型架构到训练循环的完整流程。

**类型：** 构建
**语言：** Python
**前置条件：** Phase 10 Lesson 01-03
**预计时间：** ~120 分钟

## 学习目标

- 实现 GPT 架构的核心组件：多头注意力、位置编码、前馈网络
- 理解因果语言模型的训练目标：下一个 token 预测
- 构建完整的训练循环，包括梯度累积和学习率调度
- 理解预训练的计算成本和优化策略

## GPT 架构

GPT（Generative Pre-trained Transformer）是一个仅解码器的 Transformer 模型。它的核心是因果自注意力机制——每个位置只能关注自身及之前的位置。

```
Input Token IDs
  ↓
Token Embedding + Position Embedding
  ↓
Transformer Block × N
  |-- Layer Norm -> Multi-Head Causal Self-Attention -> Residual
  +-- Layer Norm -> Feed-Forward Network -> Residual
  ↓
Final Layer Norm
  ↓
Linear Projection → Vocabulary
  ↓
Softmax → Next Token Probabilities
```

## 核心组件实现

```python
import math
import torch
import torch.nn as nn
import torch.nn.functional as F


class CausalSelfAttention(nn.Module):
    """因果自注意力：每个位置只能看到之前的位置"""

    def __init__(self, d_model, n_heads, max_seq_len=512, dropout=0.1):
        super().__init__()
        assert d_model % n_heads == 0

        self.n_heads = n_heads
        self.d_head = d_model // n_heads

        # QKV 投影
        self.qkv = nn.Linear(d_model, 3 * d_model)
        self.proj = nn.Linear(d_model, d_model)
        self.dropout = nn.Dropout(dropout)

        # 因果掩码
        self.register_buffer(
            "mask",
            torch.tril(torch.ones(max_seq_len, max_seq_len)).view(
                1, 1, max_seq_len, max_seq_len
            )
        )

    def forward(self, x):
        B, T, C = x.shape

        # 计算 Q, K, V
        qkv = self.qkv(x)
        q, k, v = qkv.chunk(3, dim=-1)

        # 重塑为多头
        q = q.view(B, T, self.n_heads, self.d_head).transpose(1, 2)
        k = k.view(B, T, self.n_heads, self.d_head).transpose(1, 2)
        v = v.view(B, T, self.n_heads, self.d_head).transpose(1, 2)

        # 注意力计算
        attn = (q @ k.transpose(-2, -1)) / math.sqrt(self.d_head)
        attn = attn.masked_fill(self.mask[:, :, :T, :T] == 0, float('-inf'))
        attn = F.softmax(attn, dim=-1)
        attn = self.dropout(attn)

        # 输出
        out = attn @ v
        out = out.transpose(1, 2).contiguous().view(B, T, C)
        out = self.proj(out)
        return out


class FeedForward(nn.Module):
    """前馈网络：两层线性变换 + GELU 激活"""

    def __init__(self, d_model, d_ff=None, dropout=0.1):
        super().__init__()
        d_ff = d_ff or 4 * d_model
        self.net = nn.Sequential(
            nn.Linear(d_model, d_ff),
            nn.GELU(),
            nn.Linear(d_ff, d_model),
            nn.Dropout(dropout),
        )

    def forward(self, x):
        return self.net(x)


class TransformerBlock(nn.Module):
    """Transformer 块：注意力 + 前馈 + 残差连接"""

    def __init__(self, d_model, n_heads, max_seq_len=512, dropout=0.1):
        super().__init__()
        self.ln1 = nn.LayerNorm(d_model)
        self.attn = CausalSelfAttention(d_model, n_heads, max_seq_len, dropout)
        self.ln2 = nn.LayerNorm(d_model)
        self.ff = FeedForward(d_model, dropout=dropout)

    def forward(self, x):
        x = x + self.attn(self.ln1(x))
        x = x + self.ff(self.ln2(x))
        return x


class MiniGPT(nn.Module):
    """Mini GPT 模型"""

    def __init__(self, vocab_size=32000, d_model=512, n_heads=8,
                 n_layers=6, max_seq_len=512, dropout=0.1):
        super().__init__()

        self.tok_emb = nn.Embedding(vocab_size, d_model)
        self.pos_emb = nn.Embedding(max_seq_len, d_model)
        self.dropout = nn.Dropout(dropout)

        self.blocks = nn.ModuleList([
            TransformerBlock(d_model, n_heads, max_seq_len, dropout)
            for _ in range(n_layers)
        ])

        self.ln_f = nn.LayerNorm(d_model)
        self.head = nn.Linear(d_model, vocab_size, bias=False)

        # 权重共享：嵌入层和输出层共享权重
        self.tok_emb.weight = self.head.weight

        self.apply(self._init_weights)

    def _init_weights(self, module):
        if isinstance(module, nn.Linear):
            nn.init.normal_(module.weight, mean=0.0, std=0.02)
            if module.bias is not None:
                nn.init.zeros_(module.bias)
        elif isinstance(module, nn.Embedding):
            nn.init.normal_(module.weight, mean=0.0, std=0.02)

    def forward(self, idx, targets=None):
        B, T = idx.shape

        # Token + Position Embedding
        tok_emb = self.tok_emb(idx)
        pos = torch.arange(0, T, device=idx.device).unsqueeze(0)
        pos_emb = self.pos_emb(pos)
        x = self.dropout(tok_emb + pos_emb)

        # Transformer 块
        for block in self.blocks:
            x = block(x)

        x = self.ln_f(x)
        logits = self.head(x)

        # 计算损失
        loss = None
        if targets is not None:
            loss = F.cross_entropy(
                logits.view(-1, logits.size(-1)),
                targets.view(-1),
                ignore_index=-1,
            )

        return logits, loss
```

## 训练循环

```python
from torch.utils.data import Dataset, DataLoader


class TextDataset(Dataset):
    """文本数据集"""

    def __init__(self, token_ids, seq_len=512):
        self.token_ids = token_ids
        self.seq_len = seq_len

    def __len__(self):
        return max(0, len(self.token_ids) - self.seq_len - 1)

    def __getitem__(self, idx):
        x = self.token_ids[idx:idx + self.seq_len]
        y = self.token_ids[idx + 1:idx + self.seq_len + 1]
        return torch.tensor(x, dtype=torch.long), torch.tensor(y, dtype=torch.long)


def train(model, dataset, epochs=10, batch_size=8, lr=3e-4,
          grad_accum_steps=4, device='cuda'):
    """训练循环"""
    model = model.to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=0.1)

    # 余弦学习率调度
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(
        optimizer, T_max=epochs * len(dataset) // batch_size
    )

    dataloader = DataLoader(dataset, batch_size=batch_size, shuffle=True)

    model.train()
    for epoch in range(epochs):
        total_loss = 0
        optimizer.zero_grad()

        for step, (x, y) in enumerate(dataloader):
            x, y = x.to(device), y.to(device)

            _, loss = model(x, targets=y)
            loss = loss / grad_accum_steps
            loss.backward()

            if (step + 1) % grad_accum_steps == 0:
                # 梯度裁剪
                torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
                optimizer.step()
                scheduler.step()
                optimizer.zero_grad()

            total_loss += loss.item() * grad_accum_steps

        avg_loss = total_loss / len(dataloader)
        ppl = math.exp(avg_loss)
        print(f"Epoch {epoch + 1}/{epochs} | Loss: {avg_loss:.4f} | PPL: {ppl:.2f}")
```

## 关键术语

| 术语              | 通俗说法     | 实际含义                                               |
| ----------------- | ------------ | ------------------------------------------------------ |
| 预训练            | "基础训练"   | 在大规模无标注文本上训练模型学习语言表示的过程         |
| 因果注意力        | "只看过去"   | 每个位置只能关注自身及之前位置的注意力机制             |
| 下一个 Token 预测 | "猜下一个词" | 给定前文预测下一个 token 的训练目标                    |
| 梯度累积          | "攒梯度"     | 多个小批次前向传播后一次性更新参数，模拟大批次训练     |
| 困惑度            | "困惑分数"   | 模型预测的不确定性度量，越低越好，等于交叉熵损失的指数 |

## 延伸阅读

- [Radford et al., 2018 -- "Improving Language Understanding by Generative Pre-Training"](https://cdn.openai.com/research-covers/language-unsupervised/language_understanding_paper.pdf) -- GPT-1 原始论文
- [Radford et al., 2019 -- "Language Models are Unsupervised Multitask Learners"](https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf) -- GPT-2 论文
- [Brown et al., 2020 -- "Language Models are Few-Shot Learners"](https://arxiv.org/abs/2005.14165) -- GPT-3 论文
- [Karpathy -- nanoGPT](https://github.com/karpathy/nanoGPT) -- 最简化的 GPT 训练框架
