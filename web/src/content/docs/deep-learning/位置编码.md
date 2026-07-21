---
title: 位置编码
description: '注意力是排列不变的,三种算法——正弦、RoPE、ALiBi——以不同的方式注入位置信号'
module: 'deep-learning'
difficulty: intermediate
tags:
  - 位置编码
  - RoPE
  - ALiBi
  - 正弦编码
  - Transformer
related:
  - 'deep-learning/完整Transformer'
  - 'deep-learning/为什么需要Transformer'
  - 'deep-learning/学习率调度'
  - 'deep-learning/音频Transformer与Whisper'
prerequisites:
  - 'deep-learning/深度学习概述'
---

# 位置编码 — 正弦、RoPE、ALiBi

> 注意力是排列不变的。"The cat sat on the mat"和"mat the on sat cat The"在没有位置信号的情况下产生相同的输出。三种算法修复了这个问题——每种对"位置"的含义有不同的押注。

**类型:** 构建
**语言:** Python
**前置知识:** 阶段7 · 02(自注意力), 阶段7 · 03(多头注意力)
**预计时间:** ~45分钟

## 问题所在

缩放点积注意力是顺序盲的。注意力矩阵 `softmax(Q K^T / √d) V` 由成对相似度计算。打乱 `X` 的行,输出的行也会以相同方式被打乱。注意力内部没有任何东西关心位置。

这在词袋模型中不是bug。对于语言、代码、音频、视频——任何顺序承载意义的场景——这是致命的。

修复方法是以某种方式将位置注入嵌入。三个时代的答案:

1. **绝对正弦** (Vaswani 2017)。将位置的 `sin/cos` 加到嵌入上。简单,无需学习,超出训练长度后外推差。
2. **RoPE — 旋转位置嵌入** (Su 2021)。按与位置成正比的角度旋转Q和K向量。直接在点积中编码*相对*位置。2026年占主导地位。
3. **ALiBi — 带线性偏置的注意力** (Press 2022)。完全跳过嵌入;根据距离向注意力分数添加每头线性惩罚。出色的长度外推。

截至2026年,基本上每个前沿开源模型都使用RoPE: Llama 2/3/4, Qwen 2/3, Mistral, Mixtral, DeepSeek-V3, Kimi。少数长上下文模型使用ALiBi或其现代变体。绝对正弦已成为历史。

## 核心概念

### 绝对正弦

预计算一个形状为 `(max_len, d_model)` 的固定矩阵 `PE`:

```
PE[pos, 2i]   = sin(pos / 10000^(2i / d_model))
PE[pos, 2i+1] = cos(pos / 10000^(2i / d_model))
```

然后在注意力之前 `X' = X + PE[:N]`。每个维度是不同频率的正弦波。模型学会从相位模式中读取位置。在 `max_len` 之外失败:当模型只见过位置0-2047时,没有任何东西告诉模型在位置2048会发生什么。

### RoPE

旋转Q和K向量(不是嵌入)。对于一对维度 `(2i, 2i+1)`:

```
[q'_2i    ]   [ cos(pos·θ_i)  -sin(pos·θ_i) ] [q_2i   ]
[q'_2i+1  ] = [ sin(pos·θ_i)   cos(pos·θ_i) ] [q_2i+1 ]

θ_i = base^(-2i / d_head),  base = 10000 默认
```

对key应用相同旋转,使用位置 `pos_k`。点积 `q'_m · k'_n` 变为仅 `(m - n)` 的函数。即:**注意力分数仅取决于相对距离**,即使旋转是以绝对位置为键的。漂亮的技巧。

扩展RoPE: `base` 可以被缩放(NTK-aware, YaRN, LongRoPE)以在不重新训练的情况下外推到更长的上下文。Llama 3就是这样从8K扩展到128K上下文的。

### ALiBi

跳过嵌入技巧。直接偏置注意力分数:

```
attn_score[i, j] = (q_i · k_j) / √d  -  m_h · |i - j|
```

其中 `m_h` 是每头的斜率(如 `1 / 2^(8·h/H)`)。更近的token被提升;更远的token被惩罚。无训练时间成本。论文显示长度外推优于正弦,并在原始训练长度上匹配RoPE。

### 2026年选什么

| 变体        | 外推       | 训练成本 | 使用者                                            |
| ----------- | ---------- | -------- | ------------------------------------------------- |
| 绝对正弦    | 差         | 免费     | 原始transformer, 早期BERT                         |
| 学习的绝对  | 无         | 极小     | GPT-2, GPT-3                                      |
| RoPE        | 好(带缩放) | 免费     | Llama 2/3/4, Qwen 2/3, Mistral, DeepSeek-V3, Kimi |
| RoPE + YaRN | 优秀       | 微调阶段 | Qwen2-1M, Llama 3.1 128K                          |
| ALiBi       | 优秀       | 免费     | BLOOM, MPT, Baichuan                              |

RoPE获胜是因为它无需改变架构即可插入注意力、编码相对位置,且其 `base` 超参数为长上下文微调提供了清晰的旋钮。

## 动手构建

### 步骤1:正弦编码

参见 `code/main.py`。4行计算:

```python
def sinusoidal(N, d):
    pe = [[0.0] * d for _ in range(N)]
    for pos in range(N):
        for i in range(d // 2):
            theta = pos / (10000 ** (2 * i / d))
            pe[pos][2 * i]     = math.sin(theta)
            pe[pos][2 * i + 1] = math.cos(theta)
    return pe
```

在第一个注意力层之前将此加到嵌入矩阵上。

### 步骤2:将RoPE应用于Q, K

RoPE对Q和K原地操作。对于每对维度:

```python
def apply_rope(x, pos, base=10000):
    d = len(x)
    out = list(x)
    for i in range(d // 2):
        theta = pos / (base ** (2 * i / d))
        c, s = math.cos(theta), math.sin(theta)
        a, b = x[2 * i], x[2 * i + 1]
        out[2 * i]     = a * c - b * s
        out[2 * i + 1] = a * s + b * c
    return out
```

关键:对位置 `m` 的Q和位置 `n` 的K应用相同函数。它们的点积在每个坐标对上获得 `cos((m-n)·θ_i)` 因子。注意力免费学习相对位置。

### 步骤3:ALiBi斜率和偏置

```python
def alibi_bias(n_heads, seq_len):
    # slope_h = 2 ** (-8 * h / n_heads) for h = 1..n_heads
    slopes = [2 ** (-8 * (h + 1) / n_heads) for h in range(n_heads)]
    bias = []
    for m in slopes:
        row = [[-m * abs(i - j) for j in range(seq_len)] for i in range(seq_len)]
        bias.append(row)
    return bias  # 在softmax之前加到注意力分数上
```

将 `bias[h]` 加到头 `h` 的 `(seq_len, seq_len)` 注意力分数矩阵上,然后softmax。

### 步骤4:验证RoPE的相对距离性质

取两个随机向量 `a, b`。按 `(pos_a, pos_b)` 旋转。然后按 `(pos_a + k, pos_b + k)` 旋转。两个点积必须在浮点误差内匹配。这个性质是RoPE的全部意义——它对绝对偏移不变,只有相对间距重要。

## 实际应用

PyTorch 2.5+在 `torch.nn.functional` 中提供RoPE工具。大多数生产代码使用 `flash_attn` 或 `xformers`,其中RoPE在注意力内核内应用。

```python
from transformers import AutoModel
model = AutoModel.from_pretrained("meta-llama/Llama-3.2-3B")
# model.config.rope_scaling → {"type": "yarn", "factor": 32.0, "original_max_position_embeddings": 8192}
```

**2026年的长上下文技巧:**

- **NTK-aware插值。** 从4K扩展到16K+时,将 `base` 重新缩放为 `base * (scale_factor)^(d/(d-2))`。
- **YaRN。** 更智能的插值,在长上下文上保持注意力熵。Llama 3.1 128K使用它。
- **LongRoPE。** 微软2024年的方法,使用进化搜索选择每维度缩放因子。Phi-3-Long使用它。
- **位置插值 + 微调。** 只需按扩展因子缩小位置,微调1-5B token。出奇地有效。

## 交付成果

参见 `outputs/skill-positional-encoding-picker.md`。该技能根据目标上下文长度、外推需求和训练预算为新模型选择编码策略。

## 练习

1. **简单。** 将正弦 `PE` 矩阵绘制为 `max_len=512, d=128` 的热力图。确认"条纹随维度索引增长而变宽"的模式。
2. **中等。** 实现NTK-aware RoPE缩放。在长度256的序列上训练微型LM,然后在有缩放和无缩放的情况下测试长度1024。测量困惑度。
3. **困难。** 在同一个注意力模块中实现ALiBi和RoPE。在长度512的序列上训练4层transformer执行复制任务。测试时外推到2048。比较退化程度。

## 关键术语

| 术语      | 人们怎么说           | 实际含义                                               |
| --------- | -------------------- | ------------------------------------------------------ |
| 位置编码  | "告诉注意力顺序"     | 添加到嵌入或注意力中编码位置的任何信号。               |
| 正弦      | "原始的那个"         | 以几何频率加到嵌入上的 `sin/cos`;不外推。              |
| RoPE      | "旋转嵌入"           | 按位置依赖的角度旋转Q, K;点积编码相对距离。            |
| ALiBi     | "线性偏置技巧"       | 向注意力分数添加 `-m·\|i-j\|`;无需嵌入,出色的外推。    |
| base      | "RoPE的旋钮"         | RoPE中的频率缩放器;增加以在推理时扩展上下文。          |
| NTK-aware | "RoPE缩放技巧"       | 重新缩放 `base`,使上下文扩展时高频维度不被压缩。       |
| YaRN      | "高级的那个"         | 每维度插值+外推,保持注意力熵。                         |
| 外推      | "超出训练长度仍有效" | 位置方案能否在训练中见过的 `max_len` 之外提供正确输出? |

## 延伸阅读

- [Vaswani et al. (2017). Attention Is All You Need §3.5](https://arxiv.org/abs/1706.03762) — 原始正弦编码。
- [Su et al. (2021). RoFormer: Enhanced Transformer with Rotary Position Embedding](https://arxiv.org/abs/2104.09864) — RoPE论文。
- [Press, Smith, Lewis (2021). Train Short, Test Long: Attention with Linear Biases Enables Input Length Extrapolation](https://arxiv.org/abs/2108.12409) — ALiBi。
- [Peng et al. (2023). YaRN: Efficient Context Window Extension of Large Language Models](https://arxiv.org/abs/2309.00071) — 最先进的RoPE缩放。
- [Chen et al. (2023). Extending Context Window of Large Language Models via Positional Interpolation](https://arxiv.org/abs/2306.15595) — Meta的Llama 2长上下文论文。
- [Ding et al. (2024). LongRoPE: Extending LLM Context Window Beyond 2 Million Tokens](https://arxiv.org/abs/2402.13753) — Phi-3-Long使用的微软方法。
- [HuggingFace Transformers — `modeling_rope_utils.py`](https://github.com/huggingface/transformers/blob/main/src/transformers/modeling_rope_utils.py) — 每种RoPE缩放方案的生产级实现。
