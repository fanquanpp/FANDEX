---
title: 推理优化
description: '理解 LLM 推理优化技术，包括 KV Cache、Flash Attention、推测解码和连续批处理'
module: llm
difficulty: advanced
tags:
  - inference
  - 'KV cache'
  - 'Flash Attention'
  - 推测解码
  - vLLM
related:
  - llm/推测解码
  - llm/推测解码EAGLE3
  - llm/微调与LoRA
  - llm/异步Hogwild推理
prerequisites:
  - llm/安全护栏
---

# 推理优化

> LLM 推理的瓶颈不是计算，而是内存带宽。一个 70B 模型生成一个 token 需要读取 140GB 的权重，但只做一次矩阵乘法。优化推理就是优化内存访问模式。

**类型：** 概念
**语言：** Python
**前置条件：** Phase 10 Lesson 04（预训练 Mini-GPT）
**预计时间：** ~60 分钟

## 学习目标

- 理解自回归推理的两个阶段：预填充（prefill）和解码（decode）
- 掌握 KV Cache 的原理和实现
- 理解 Flash Attention 的核心思想
- 了解推测解码和连续批处理

## 推理的两个阶段

| 阶段   | 操作                   | 特点         | 瓶颈     |
| ------ | ---------------------- | ------------ | -------- |
| 预填充 | 并行处理所有输入 token | 计算密集     | GPU 计算 |
| 解码   | 逐个生成输出 token     | 内存带宽密集 | 内存带宽 |

```
Prefill:  [t1, t2, t3, t4, t5] → KV Cache
Decode:   [t6] → t7 (使用 KV Cache)
          [t7] → t8 (使用 KV Cache)
          ...
```

## KV Cache

自回归生成中，每个新 token 的注意力计算需要所有之前 token 的 K 和 V。KV Cache 缓存这些值，避免重复计算。

```python
class KVCache:
    """KV Cache 实现"""

    def __init__(self, n_layers, n_heads, d_head, max_seq_len=2048, dtype=torch.float16):
        self.n_layers = n_layers
        self.dtype = dtype

        # 预分配缓存
        self.k_cache = torch.zeros(n_layers, max_seq_len, n_heads, d_head, dtype=dtype)
        self.v_cache = torch.zeros(n_layers, max_seq_len, n_heads, d_head, dtype=dtype)
        self.seq_len = 0

    def update(self, layer_idx, new_k, new_v):
        """更新缓存"""
        pos = self.seq_len
        self.k_cache[layer_idx, pos:pos + new_k.shape[1]] = new_k
        self.v_cache[layer_idx, pos:pos + new_v.shape[1]] = new_v

    def get(self, layer_idx):
        """获取缓存"""
        return (
            self.k_cache[layer_idx, :self.seq_len],
            self.v_cache[layer_idx, :self.seq_len],
        )

    def advance(self, num_tokens=1):
        """前进指针"""
        self.seq_len += num_tokens
```

KV Cache 的内存开销：

| 模型      | 参数量 | KV Cache 大小（FP16，2048 序列） |
| --------- | ------ | -------------------------------- |
| LLaMA-7B  | 7B     | ~512 MB                          |
| LLaMA-13B | 13B    | ~1 GB                            |
| LLaMA-70B | 70B    | ~2.5 GB                          |

## Flash Attention

Flash Attention 通过分块计算（tiling）减少 HBM（高带宽内存）访问次数：

```
标准注意力：
  Q, K, V ∈ HBM → S = QK^T ∈ HBM → P = softmax(S) ∈ HBM → O = PV ∈ HBM
  访问次数：O(N^2)

Flash Attention：
  分块加载 Q, K, V → SRAM 中计算 → 写回 O
  访问次数：O(N^2 d^2 / M)，其中 M 是 SRAM 大小
```

Flash Attention 不改变计算结果，但显著减少了内存访问，在长序列上可达 2-4x 加速。

```python
# 使用 Flash Attention 2
from transformers import AutoModelForCausalLM

model = AutoModelForCausalLM.from_pretrained(
    "meta-llama/Llama-2-7b-hf",
    torch_dtype=torch.float16,
    attn_implementation="flash_attention_2",  # 启用 Flash Attention 2
)
```

## 推测解码

推测解码使用一个小模型快速生成候选 token，大模型并行验证：

```
小模型生成: [t1, t2, t3, t4, t5]  ← 快速但可能不准确
大模型验证: [t1, t2, t3] [通过] [t4] [拒绝]  ← 并行验证
输出: [t1, t2, t3, t4']  ← 从 t4 开始重新采样
```

推测解码的优势：

- 不改变输出分布（与大模型自回归生成等价）
- 如果小模型 n 个 token 全部被接受，速度提升 n 倍
- 实际加速比取决于大小模型的一致性

## 连续批处理

传统批处理等待所有序列完成才开始新请求。连续批处理在序列完成后立即填入新请求：

```python
# vLLM 的连续批处理
from vllm import LLM, SamplingParams

llm = LLM(model="meta-llama/Llama-2-7b-hf")
params = SamplingParams(max_tokens=128, temperature=0.7)

# vLLM 自动进行连续批处理
outputs = llm.generate(prompts, params)
```

## 关键术语

| 术语            | 通俗说法       | 实际含义                                            |
| --------------- | -------------- | --------------------------------------------------- |
| KV Cache        | "缓存注意力"   | 缓存自回归生成中已计算的 Key 和 Value，避免重复计算 |
| Flash Attention | "快速注意力"   | 通过分块计算减少内存访问的注意力实现                |
| 推测解码        | "猜然后验证"   | 用小模型生成候选 token，大模型并行验证的加速方法    |
| 连续批处理      | "不停顿批处理" | 序列完成后立即填入新请求的批处理策略                |
| Prefill         | "预填充"       | 并行处理所有输入 token 的阶段                       |
| Decode          | "解码"         | 逐个生成输出 token 的阶段                           |

## 延伸阅读

- [Dao et al., 2022 -- "FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness"](https://arxiv.org/abs/2205.14135) -- Flash Attention 论文
- [Leviathan et al., 2023 -- "Fast Inference from Transformers via Speculative Decoding"](https://arxiv.org/abs/2211.17192) -- 推测解码论文
- [Kwon et al., 2023 -- "Efficient Memory Management for Large Language Model Serving with PagedAttention"](https://arxiv.org/abs/2309.06180) -- vLLM/PagedAttention 论文
- [vLLM 文档](https://docs.vllm.ai/) -- 高性能 LLM 推理引擎
