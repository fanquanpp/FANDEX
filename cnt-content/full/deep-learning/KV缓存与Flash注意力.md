---
title: KV缓存与Flash注意力
description: '训练是并行的且受FLOP限制,推理是串行的且受内存限制,不同的瓶颈需要不同的技巧'
module: 'deep-learning'
difficulty: advanced
tags:
  - KV缓存
  - 'Flash Attention'
  - 推理优化
  - PagedAttention
  - 连续批处理
related:
  - 'deep-learning/GPT因果语言建模'
  - 'deep-learning/JAX入门'
  - 'deep-learning/PyTorch入门'
  - 'deep-learning/T5与BART编码器解码器'
prerequisites:
  - 'deep-learning/深度学习概述'
---

# KV缓存, Flash Attention与推理优化

> 训练是并行的且受FLOP限制。推理是串行的且受内存限制。不同的瓶颈,不同的技巧。

**类型:** 构建
**语言:** Python
**前置知识:** 阶段7 · 02(自注意力), 阶段7 · 05(完整Transformer), 阶段7 · 07(GPT)
**预计时间:** ~75分钟

## 问题所在

朴素自回归解码器生成N个token需要做 `O(N^2)` 工作:每步重新计算对完整前缀的注意力。对于4K-token响应,那是16M次注意力操作,其中大部分是冗余的。前缀token的每个隐藏状态一旦计算就是确定性的——你只需要运行新token的查询对缓存的前面所有key和value做注意力。

除此之外,注意力本身移动大量数据。标准注意力实例化N×N分数矩阵, N×d softmax输出, N×d最终输出——对HBM的读写太多。对于N>=2K,注意力在成为FLOP瓶颈之前就先成为内存瓶颈。经典注意力内核低效使用现代GPU 4-10倍。

来自Dao et al.的两个优化将前沿推理从"慢"推到"快":

1. **KV缓存。** 存储每个前缀token的K和V向量。每个新token的注意力是一个查询对缓存的key。推理从每生成步 `O(N^2)` 降到 `O(N)`。
2. **Flash Attention。** 分块计算注意力,使完整N×N矩阵永远不进入HBM。所有softmax + 矩阵乘法在SRAM中完成。A100上2-4倍挂钟加速;H100上FP8时5-10倍。

到2026年两者都是通用的。每个生产推理栈(vLLM, TensorRT-LLM, SGLang, llama.cpp)都假设它们。每个前沿模型都启用Flash Attention。

## 核心概念

### KV缓存数学

每个解码器层,每个token,每个头:

```
bytes_per_token_per_layer = 2 * d_head * dtype_size
                          ^
                          K和V
```

对于7B模型,32层,32头, d_head=128, fp16:

```
每token每层 = 2 * 128 * 2 = 512 bytes
每token (32层) = 16 KB
每32K上下文 = 512 MB
```

对于Llama 3 70B(80层, d_head=128, GQA 8个KV头):

```
每token每层 = 2 * 8 * 128 * 2 = 4096 bytes (4 KB)
每32K上下文 = 10.4 GB
```

这10 GB就是为什么Llama 3 70B在128K上下文下在批次大小1时需要40 GB A100的大部分仅用于KV缓存。

**GQA是KV缓存的胜利。** 64头的MHA会是32 GB。MLA压缩更多。

### Flash Attention — 分块技巧

标准注意力:

```
S = Q @ K^T          (HBM读, N×N, HBM写)
P = softmax(S)       (HBM读, HBM写)
O = P @ V            (HBM读, HBM写)
```

三次HBM往返。在H100上,HBM带宽为3 TB/s;SRAM为30 TB/s。每次HBM往返比保持在芯片上慢10倍。

Flash Attention:

```
for each block of Q (tile大小 ~128 × 128):
    将Q_tile加载到SRAM
    for each block of K, V:
        将K_tile, V_tile加载到SRAM
        计算 S_tile = Q_tile @ K_tile^T     (SRAM)
        运行softmax聚合                      (SRAM)
        累积到O_tile                         (SRAM)
    将O_tile写入HBM
```

每个tile一次HBM往返。总内存占用从 `O(N^2)` 降到 `O(N)`。反向传播从正向传播重新计算一些值而非存储它们——又一个内存胜利。

**数值技巧。** 运行softmax跨tile维护 `(max, sum)`,使最终归一化是精确的。不是近似——Flash Attention计算与标准注意力位相同的输出(除了fp16非结合性)。

**版本演进:**

| 版本    | 年份 | 关键变化                      | 参考硬件上的加速                |
| ------- | ---- | ----------------------------- | ------------------------------- |
| Flash 1 | 2022 | 分块SRAM内核                  | A100上2倍                       |
| Flash 2 | 2023 | 更好的并行性,因果优先排序     | A100上3倍                       |
| Flash 3 | 2024 | Hopper异步, FP8               | H100上1.5-2倍(~740 TFLOPs FP16) |
| Flash 4 | 2026 | Blackwell 5级流水线, 软件exp2 | 推理优先(初始仅前向)            |

Flash 4发布时仅前向传播。训练仍使用Flash 3。Flash 4的GQA和varlen支持待定(2026年中)。

### 推测解码 — 另一个延迟胜利

便宜模型提出N个token。大模型并行验证所有N个。如果验证接受k个token,你为k个生成支付了1次大模型前向传播。典型k=3-5在代码和散文上。

2026年默认:

- **EAGLE 2 / Medusa。** 集成草稿头共享验证器的隐藏状态。2-3倍加速,无质量损失。
- **带草稿模型的推测解码。** 消费级硬件上2-4倍加速。
- **前看解码。** Jacobi迭代;不需要草稿模型。小众但免费。

### 连续批处理

经典批量推理:等待最慢的序列完成,然后开始新批次。短响应提前完成时浪费GPU。

连续批处理(首次在Orca中发布,现在在vLLM, TensorRT-LLM, SGLang中):旧请求完成后立即将新请求换入批次。典型聊天工作负载5-10倍吞吐量增益。

### PagedAttention — KV缓存作为虚拟内存

vLLM的头条功能。KV缓存以16-token块分配;页表将逻辑位置映射到物理块。让你跨并行样本(束搜索, 并行采样)共享KV,热交换前缀用于提示缓存,以及碎片整理内存。比朴素连续分配4倍吞吐量改善。

## 动手构建

参见 `code/main.py`。我们实现:

1. 朴素 `O(N^2)` 增量解码器。
2. `O(N)` KV缓存解码器。
3. 模拟Flash Attention运行最大算法的分块softmax。

### 步骤1:KV缓存

```python
class KVCache:
    def __init__(self, n_layers, n_heads, d_head):
        self.K = [[[] for _ in range(n_heads)] for _ in range(n_layers)]
        self.V = [[[] for _ in range(n_heads)] for _ in range(n_layers)]

    def append(self, layer, head, k, v):
        self.K[layer][head].append(k)
        self.V[layer][head].append(v)

    def read(self, layer, head):
        return self.K[layer][head], self.V[layer][head]
```

简单:在每层、每头列表中持续追加每token的K, V向量。

### 步骤2:分块softmax

```python
def tiled_softmax_dot(q, K, V, tile=4):
    """Flash-attention风格的 softmax(qK^T)V,带运行max/sum。"""
    m = float("-inf")
    s = 0.0
    out = [0.0] * len(V[0])
    for start in range(0, len(K), tile):
        k_block = K[start:start + tile]
        v_block = V[start:start + tile]
        scores = [sum(qi * ki for qi, ki in zip(q, k)) for k in k_block]
        new_m = max(m, *scores)
        exp_old = math.exp(m - new_m) if m != float("-inf") else 0.0
        exp_new = [math.exp(sc - new_m) for sc in scores]
        s = s * exp_old + sum(exp_new)
        for j in range(len(out)):
            out[j] = out[j] * exp_old + sum(e * v[j] for e, v in zip(exp_new, v_block))
        m = new_m
    return [o / s for o in out]
```

与一次性 `softmax(qK) V` 位相同的输出,但任何时候工作集是 `tile × d_head` 块,而非完整 `N × d_head`。

### 步骤3:比较朴素 vs 缓存解码在100-token生成上

计算注意力操作。朴素: `O(N^2)` = 5050。缓存: `O(N)` = 100。代码打印两者。

## 实际应用

```python
# HuggingFace transformers在仅解码器generate()上自动启用KV缓存。
from transformers import AutoModelForCausalLM
model = AutoModelForCausalLM.from_pretrained(
    "meta-llama/Llama-3.2-3B",
    attn_implementation="flash_attention_2",  # Hopper上使用FA3
    torch_dtype="bfloat16",
)
# generate()自动使用KV缓存
```

vLLM生产:

```bash
pip install vllm
vllm serve meta-llama/Llama-3.1-70B-Instruct \
    --tensor-parallel-size 4 \
    --max-model-len 32768 \
    --enable-prefix-caching \
    --kv-cache-dtype fp8
```

跨请求的前缀缓存是2026年的大胜利——相同的系统提示、少样本示例或长上下文文档跨调用重用KV。对于有重复工具提示的代理工作负载,前缀缓存通常是5倍吞吐量增益。

## 交付成果

参见 `outputs/skill-inference-optimizer.md`。该技能为新的推理部署选择注意力实现、KV缓存策略、量化和推测解码。

## 练习

1. **简单。** 运行 `code/main.py`。确认朴素和缓存解码器产生相同输出;注意操作数差异。
2. **中等。** 实现前缀缓存:给定提示P和多个补全,运行一次前向传播P来填充KV缓存,然后每个补全分支。测量与每次重新编码P相比的加速。
3. **困难。** 实现玩具PagedAttention: KV缓存在固定16-token块中,带空闲列表。序列完成时,将其块返回池。模拟1,000个不同长度的聊天补全。比较内存碎片 vs 连续分配。

## 关键术语

| 术语            | 人们怎么说         | 实际含义                                                   |
| --------------- | ------------------ | ---------------------------------------------------------- |
| KV缓存          | "使解码变快的技巧" | 存储每个前缀token的K和V;新查询对它们做注意力而非重新计算。 |
| HBM             | "GPU主内存"        | 高带宽内存;H100上80 GB, B200上192 GB。约3 TB/s带宽。       |
| SRAM            | "片上内存"         | 每SM快速内存, H100上约256 KB/SM。约30 TB/s带宽。           |
| Flash Attention | "分块注意力内核"   | 不在HBM中实例化N×N来计算注意力。                           |
| 连续批处理      | "不等批处理"       | 完成的序列换出,新的换入,无需排空批次。                     |
| PagedAttention  | "vLLM的头条"       | KV缓存在固定块中分配,带页表;消除碎片。                     |
| 前缀缓存        | "重用长提示"       | 跨请求缓存共享前缀的KV;代理的主要成本削减。                |
| 推测解码        | "草稿 + 验证"      | 便宜草稿模型提出token;大模型一次通过验证k个。              |

## 延伸阅读

- [Dao et al. (2022). FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness](https://arxiv.org/abs/2205.14135) — Flash 1。
- [Dao (2023). FlashAttention-2: Faster Attention with Better Parallelism and Work Partitioning](https://arxiv.org/abs/2307.08691) — Flash 2。
- [Shah et al. (2024). FlashAttention-3: Fast and Accurate Attention with Asynchrony and Low-precision](https://arxiv.org/abs/2407.08608) — Flash 3。
- [FlashAttention-4 release notes (Dao-AILab, 2026)](https://github.com/Dao-AILab/flash-attention) — Blackwell 5级流水线和软件exp2技巧;阅读仓库README了解本课提到的仅前向发布注意事项。
- [Kwon et al. (2023). Efficient Memory Management for Large Language Model Serving with PagedAttention](https://arxiv.org/abs/2309.06180) — vLLM论文。
- [Leviathan et al. (2023). Fast Inference from Transformers via Speculative Decoding](https://arxiv.org/abs/2211.17192) — 推测解码。
- [Li et al. (2024). EAGLE: Speculative Sampling Requires Rethinking Feature Uncertainty](https://arxiv.org/abs/2401.15077) — EAGLE-1/2论文。
- [Cai et al. (2024). Medusa: Simple LLM Inference Acceleration Framework with Multiple Decoding Heads](https://arxiv.org/abs/2401.10774) — 与EAGLE一起引用的Medusa方法。
- [vLLM docs — PagedAttention](https://docs.vllm.ai/en/latest/design/kernel/paged_attention.html) — 16-token块和页表设计的规范深入讲解。
