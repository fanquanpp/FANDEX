---
title: 量化
description: '理解 LLM 量化的原理和方法，包括 INT8、INT4、GPTQ、AWQ 和 GGUF 格式'
module: llm
difficulty: intermediate
tags:
  - quantization
  - INT8
  - INT4
  - GPTQ
  - AWQ
  - GGUF
related:
  - llm/开源模型架构详解
  - llm/扩展与分布式训练
  - llm/模型上下文协议
  - llm/嵌入
prerequisites:
  - llm/安全护栏
---

# 量化

> 一个 70B 参数的 FP16 模型需要 140GB 内存。量化到 INT4 后只需 35GB——4 倍压缩，性能损失不到 2%。量化是让大模型在消费级硬件上运行的唯一实用方案。

**类型：** 构建
**语言：** Python
**前置条件：** Phase 10 Lesson 04（预训练 Mini-GPT）
**预计时间：** ~60 分钟

## 学习目标

- 理解量化的基本原理：从 FP32/FP16 到 INT8/INT4
- 掌握主要量化方法：训练后量化（PTQ）和量化感知训练（QAT）
- 理解 GPTQ、AWQ 和 GGUF 的区别和适用场景
- 实现简单的训练后量化

## 量化原理

量化将高精度浮点数映射到低精度整数：

```
FP32: [-3.4e38, 3.4e38]  →  32 位
FP16: [-65504, 65504]     →  16 位
INT8: [-128, 127]         →  8 位
INT4: [-8, 7]             →  4 位
```

对称量化的映射公式：

$$x_{int} = \text{round}\left(\frac{x_{fp}}{scale}\right)$$

$$scale = \frac{\max(|x_{fp}|)}{2^{b-1} - 1}$$

```python
import torch


def symmetric_quantize(tensor, num_bits=8):
    """对称量化"""
    # 计算 scale
    max_val = tensor.abs().max()
    scale = max_val / (2 ** (num_bits - 1) - 1)

    # 量化
    quantized = torch.round(tensor / scale)
    quantized = torch.clamp(quantized, -(2 ** (num_bits - 1)), 2 ** (num_bits - 1) - 1)

    return quantized.to(torch.int8), scale


def dequantize(quantized, scale):
    """反量化"""
    return quantized.float() * scale


def compute_quantization_error(original, dequantized):
    """计算量化误差"""
    mse = ((original - dequantized) ** 2).mean()
    max_error = (original - dequantized).abs().max()
    return mse.item(), max_error.item()
```

## 逐通道量化

逐张量量化对整个权重矩阵使用同一个 scale，可能导致精度损失。逐通道量化对每行/列使用独立的 scale：

```python
def per_channel_quantize(weight, num_bits=8):
    """逐通道量化"""
    # 沿输出维度计算 scale
    max_val = weight.abs().amax(dim=-1, keepdim=True)
    scale = max_val / (2 ** (num_bits - 1) - 1)

    quantized = torch.round(weight / scale)
    quantized = torch.clamp(quantized, -(2 ** (num_bits - 1)), 2 ** (num_bits - 1) - 1)

    return quantized.to(torch.int8), scale.squeeze()
```

## GPTQ

GPTQ 是最流行的训练后量化方法之一。它通过逐层优化，最小化量化对模型输出的影响：

```python
def gptq_quantize_layer(layer_weight, num_bits=4, block_size=128, group_size=128):
    """GPTQ 量化单层"""
    # 初始化 Hessian 矩阵（用校准数据计算）
    # 这里简化为使用权重本身近似
    H = (layer_weight @ layer_weight.T) / layer_weight.shape[0]
    H_inv = torch.linalg.inv(H + 1e-6 * torch.eye(H.shape[0]))

    quantized_weight = layer_weight.clone()
    errors = torch.zeros_like(layer_weight)

    n_rows, n_cols = layer_weight.shape

    for col in range(n_cols):
        # 量化当前列
        w_col = quantized_weight[:, col]
        scale = w_col.abs().max() / (2 ** (num_bits - 1) - 1)
        q_col = torch.clamp(torch.round(w_col / scale),
                           -(2 ** (num_bits - 1)), 2 ** (num_bits - 1) - 1)

        # 计算量化误差
        err = (w_col - q_col * scale) / H_inv[col, col]

        # 更新量化权重
        quantized_weight[:, col] = q_col * scale

        # 将误差分配到后续列
        if col + 1 < n_cols:
            quantized_weight[:, col + 1:] -= err.unsqueeze(1) * H_inv[col, col + 1:].unsqueeze(0)

    return quantized_weight
```

## 量化方法对比

| 方法          | 精度       | 速度      | 内存    | 适用场景     |
| ------------- | ---------- | --------- | ------- | ------------ |
| FP16          | 基准       | 基准      | 基准    | 训练、推理   |
| INT8 PTQ      | ~0.5% 损失 | 2x 加速   | 2x 压缩 | 服务端推理   |
| INT4 GPTQ     | ~1-2% 损失 | 1.5x 加速 | 4x 压缩 | 消费级 GPU   |
| INT4 AWQ      | ~1% 损失   | 1.5x 加速 | 4x 压缩 | 消费级 GPU   |
| GGUF (Q4_K_M) | ~1-3% 损失 | CPU 友好  | 4x 压缩 | CPU/Mac 推理 |

## 实际使用

```python
# 使用 bitsandbytes 进行 INT8 量化
from transformers import AutoModelForCausalLM, BitsAndBytesConfig

int8_config = BitsAndBytesConfig(load_in_8bit=True)
model = AutoModelForCausalLM.from_pretrained(
    "meta-llama/Llama-2-7b-hf",
    quantization_config=int8_config,
)

# 使用 bitsandbytes 进行 INT4 量化（NF4）
int4_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.bfloat16,
)
model = AutoModelForCausalLM.from_pretrained(
    "meta-llama/Llama-2-7b-hf",
    quantization_config=int4_config,
)

# 使用 AutoGPTQ
from auto_gptq import AutoGPTQForCausalLM
model = AutoGPTQForCausalLM.from_quantized("TheBloke/Llama-2-7B-GPTQ")

# 使用 llama.cpp (GGUF)
# python convert.py /path/to/model --outtype f16 --outfile model.gguf
# ./llama-cli -m model.gguf -p "Hello, world!"
```

## 关键术语

| 术语 | 通俗说法         | 实际含义                                                         |
| ---- | ---------------- | ---------------------------------------------------------------- |
| 量化 | "压缩精度"       | 将高精度浮点数映射到低精度整数，减少内存和计算开销               |
| PTQ  | "训练后量化"     | Post-Training Quantization，在模型训练完成后进行量化             |
| QAT  | "训练时量化"     | Quantization-Aware Training，在训练过程中模拟量化效果            |
| GPTQ | "逐层最优量化"   | 基于近似二阶信息的逐层训练后量化方法                             |
| AWQ  | "激活感知量化"   | Activation-aware Weight Quantization，保护重要权重通道的量化方法 |
| GGUF | "llama.cpp 格式" | llama.cpp 使用的量化模型格式，支持 CPU 推理                      |

## 延伸阅读

- [Frantar et al., 2022 -- "GPTQ: Accurate Post-Training Quantization for Generative Pre-trained Transformers"](https://arxiv.org/abs/2210.17323) -- GPTQ 论文
- [Lin et al., 2023 -- "AWQ: Activation-aware Weight Quantization for LLM Compression and Acceleration"](https://arxiv.org/abs/2306.00978) -- AWQ 论文
- [Dettmers et al., 2022 -- "LLM.int8(): 8-bit Matrix Multiplication for Transformers at Scale"](https://arxiv.org/abs/2208.07339) -- INT8 量化论文
- [Xiao et al., 2023 -- "SmoothQuant: Accurate and Efficient Post-Training Quantization for Large Language Models"](https://arxiv.org/abs/2211.10438) -- SmoothQuant 论文
