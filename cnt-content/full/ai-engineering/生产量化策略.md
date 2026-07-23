---
title: '生产量化 — AWQ、GPTQ、GGUF K-quants、FP8、MXFP4/NVFP4'
description: 理解量化格式选择是硬件、服务引擎和工作负载的函数，而非通用选择
module: 'ai-engineering'
difficulty: intermediate
tags:
  - 量化
  - AWQ
  - GPTQ
  - GGUF
  - FP8
  - NVFP4
  - 生产部署
related:
  - 'ai-engineering/什么是机器学习'
  - 'ai-engineering/神经音频编解码'
  - 'ai-engineering/生产RAG聊天机器人监管垂直领域'
  - 'ai-engineering/时间序列'
prerequisites:
  - 'ai-engineering/机器学习概述'
---

# 生产量化 — AWQ、GPTQ、GGUF K-quants、FP8、MXFP4/NVFP4

> 量化格式不是通用选择——它是硬件、服务引擎和工作负载的函数。GGUF Q4_K_M或Q5_K_M统治CPU和边缘，通过llama.cpp和Ollama交付。GPTQ在vLLM内需要在同一基座上多LoRA时获胜。AWQ配Marlin-AWQ核在7B类模型上以INT4交付约741 tok/s和最佳Pass@1——2026年数据中心生产默认。FP8在Hopper、Ada和Blackwell上保持中间立场——近无损且广泛支持。NVFP4和MXFP4(Blackwell微缩放)是激进的，需要逐块验证。两个陷阱咬团队：校准数据集必须匹配部署域，KV缓存与权重量化是分开的——AWQ教训"我的模型现在是4 GB"忘记了生产批次大小下10-30 GB的KV缓存。

**类型:** 学习
**语言:** Python (stdlib, 跨格式内存和吞吐比较器)
**前置知识:** Phase 10 · 13 (量化基础), Phase 17 · 04 (vLLM服务内部)
**时间:** ~75分钟

## 学习目标

- 将量化格式映射到硬件+服务引擎组合：GGUF→CPU/边缘，AWQ→数据中心GPU，FP8→Hopper/Blackwell，NVFP4→Blackwell激进。
- 计算70B模型在BF16、FP8、INT4和NVFP4下的HBM占用，包括生产批次大小下的KV缓存。
- 解释为什么校准数据集必须匹配部署域以及KV缓存量化是独立于权重量化的决策。
- 说出两个量化陷阱：校准域不匹配和忘记KV缓存大小。

## 问题

量化不是"越小越好"。每个格式在精度、速度和硬件支持之间做不同权衡。选错格式意味着质量损失、服务引擎不兼容或KV缓存爆炸。

## 概念

### 格式矩阵

| 格式               | 硬件                   | 服务引擎              | 最佳场景           |
| ------------------ | ---------------------- | --------------------- | ------------------ |
| GGUF Q4_K_M/Q5_K_M | CPU, 边缘              | llama.cpp, Ollama     | 本地开发, 边缘部署 |
| GPTQ INT4          | NVIDIA GPU             | vLLM (多LoRA)         | 同基座多LoRA服务   |
| AWQ INT4 + Marlin  | NVIDIA GPU             | vLLM, SGLang          | 数据中心生产默认   |
| FP8 (E4M3/E5M2)    | Hopper, Ada, Blackwell | vLLM, SGLang, TRT-LLM | 近无损, 广泛支持   |
| NVFP4/MXFP4        | Blackwell              | TRT-LLM               | 激进压缩, 需验证   |

### GGUF — CPU和边缘之王

GGUF是llama.cpp的格式。K-quants(Q4_K_M, Q5_K_M)在大小和质量间取得良好平衡。通过Ollama在笔记本电脑上广泛可用。不适合数据中心GPU服务。

### GPTQ — 多LoRA场景

GPTQ使用逐层校准量化。在vLLM中，GPTQ模型支持多LoRA适配器在同一基座上——AWQ目前不支持的用例。如果需要多LoRA，GPTQ是选择。

### AWQ + Marlin — 数据中心默认

AWQ(Activation-aware Weight Quantization)保护显著权重通道。配Marlin-AWQ核，7B模型INT4约741 tok/s。2026年数据中心生产默认因为最佳质量-速度权衡。

### FP8 — 近无损中间立场

FP8(E4M3用于前向，E5M2用于梯度)在Hopper/Ada/Blackwell上近无损。广泛支持跨服务引擎。KV缓存使用FP8因为注意力键/值需要动态范围。

### NVFP4/MXFP4 — Blackwell激进

4位微缩放格式。权重和激活2x节省vs FP8。需要逐块验证因为量化误差可能累积。KV缓存保持FP8。

### 陷阱1：校准域不匹配

量化校准数据集必须匹配部署域。在通用文本上校准的模型在代码或医学文本上部署时会有退化。始终在目标域数据上校准。

### 陷阱2：KV缓存是独立的

"我的模型现在是4 GB"只计算权重。在生产批次大小下，KV缓存可能是10-30 GB。KV缓存量化是独立决策——FP8是安全的底线，INT4导致注意力质量灾难性损失。

### 内存数学

70B模型：

- BF16权重：140 GB
- FP8权重：70 GB
- INT4/AWQ权重：35 GB
- NVFP4权重：约18 GB
- KV缓存(8192 token, FP8, 128并发)：约160 GB

KV缓存通常超过权重。量化权重只解决一半问题。

## 实践

`code/main.py`计算不同格式和批次大小下的HBM占用，包括KV缓存。

## 输出

本课程产生`outputs/skill-quant-format-picker.md`。给定硬件、服务引擎和工作负载，选择量化格式并估算总HBM。

## 练习

1. 计算8B模型在BF16、FP8和INT4下的权重大小。在128并发、2048 token KV缓存(FP8)下，KV缓存增加多少？
2. 为什么KV缓存不能使用INT4？注意力分数会怎样？
3. 你的团队在通用数据上校准AWQ但部署在代码生成上。预期什么退化？如何修复？
4. 比较GGUF Q4_K_M和AWQ INT4在7B模型上的质量。哪个在GPU上更好？哪个在CPU上？
5. 设计量化策略：70B模型，H100，vLLM，128并发，混合RAG+聊天工作负载。

## 关键术语

| 术语          | 常见说法       | 实际含义                                   |
| ------------- | -------------- | ------------------------------------------ |
| GGUF K-quants | "CPU量化"      | llama.cpp格式，Q4_K_M/Q5_K_M平衡质量和大小 |
| AWQ           | "激活感知量化" | 保护显著权重通道的INT4量化                 |
| Marlin核      | "AWQ加速器"    | AWQ INT4的优化GPU核，约741 tok/s在7B上     |
| GPTQ          | "逐层校准"     | 逐层校准量化；vLLM中多LoRA支持             |
| FP8           | "8位浮点"      | 近无损；KV缓存和注意力的安全底线           |
| NVFP4/MXFP4   | "4位微缩放"    | Blackwell 4位格式；激进，需逐块验证        |
| 校准域        | "匹配部署数据" | 量化校准数据必须匹配部署域                 |

## 延伸阅读

- [AWQ paper (arXiv:2306.00978)](https://arxiv.org/abs/2306.00978)
- [GPTQ paper (arXiv:2210.17323)](https://arxiv.org/abs/2210.17323)
- [llama.cpp quantization documentation](https://github.com/ggerganov/llama.cpp/blob/master/examples/quantize/README.md)
