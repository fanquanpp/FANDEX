---
title: 'TensorRT-LLM与Blackwell FP8/NVFP4'
description: '理解Blackwell上TRT-LLM如何通过FP8+NVFP4+MTP实现7x成本优势'
module: 'ai-engineering'
difficulty: advanced
tags:
  - 'TensorRT-LLM'
  - Blackwell
  - FP8
  - NVFP4
  - MTP
  - Dynamo
related:
  - 'ai-engineering/PyTorch入门'
  - 'ai-engineering/SGLang与RadixAttention'
  - 'ai-engineering/vLLM服务内部机制'
  - 'ai-engineering/vLLM生产栈与LMCache'
prerequisites:
  - 'ai-engineering/机器学习概述'
---

# TensorRT-LLM与Blackwell FP8/NVFP4

> TensorRT-LLM仅限NVIDIA但在Blackwell上获胜。在GB200 NVL72配Dynamo编排下，SemiAnalysis InferenceX测量2026年Q1-Q2在120B模型上每百万token $0.012，对比H100 + vLLM上的$0.09/M——7x经济差距。堆栈是三种浮点体制复合：FP8对KV缓存和注意力核仍然关键因为它有所需的动态范围；NVFP4(4位微缩放)处理权重和激活；多token预测(MTP)和分离预填充/解码在之上再加2-3x。Day-0模型支持直接加载FP4权重无需训练后转换。2026年工程团队的坑：TRT-LLM是封闭NVIDIA堆栈，所以采用它用可移植性换吞吐。在承诺前对你的模型和硬件组合算数学。

**类型:** 学习
**语言:** Python (stdlib, toyFP8/NVFP4内存和成本计算器)
**前置知识:** Phase 17 · 04 (vLLM服务内部), Phase 10 · 13 (量化)
**时间:** ~75分钟

## 学习目标

- 解释为什么权重在NVFP4时FP8对KV缓存和注意力仍然关键。
- 计算前沿模型在BF16、FP8和NVFP4下的HBM占用并推理节省从哪来。
- 说出TRT-LLM利用的Blackwell特定功能(day-0 FP4、MTP、分离服务、全对全原语)。
- 决定TRT-LLM的NVIDIA锁定何时值得7x成本差距vs Hopper上的vLLM。

## 问题

2026年推理经济学前沿是"每美元多少token"。答案取决于四个堆叠选择：硬件代(Hopper H100/H200 vs Blackwell B200/GB200)、精度(BF16 → FP8 → NVFP4)、服务引擎(vLLM vs SGLang vs TRT-LLM)和编排(普通 vs 分离 vs Dynamo)。

在Hopper配vLLM上，120B MoE以约$0.09每百万token运行。在Blackwell配TRT-LLM + Dynamo上，相同模型以约$0.012运行——7x更便宜。差距部分是硬件(Blackwell每GPU LLM吞吐比Hopper高11-15x)。部分是堆栈：FP4权重、MTP draft、分离预填充/解码和NVLink 5全对全用于MoE专家通信。

你不能在NVIDIA堆栈外复制。这是权衡——可移植性换经济学。理解哪些堆栈选择给出差距的哪部分是本课程的重点。

## 概念

### 为什么FP8仍是KV缓存的底线

2026年的常见错误：假设NVFP4到处适用。并非如此。KV缓存需要FP8(8位浮点)因为它存储跨越宽动态范围的注意力键和值。将KV量化到FP4导致灾难性精度损失——分布尾部衰减，注意力分数崩溃。FP8的指数位给KV缓存所需范围。

权重和激活可以安全使用NVFP4(4位微缩放)因为它们分布更均匀且对离群值更鲁棒。TRT-LLM的混合精度方案：权重NVFP4、激活NVFP4、KV缓存FP8、注意力计算FP8。

### NVFP4 — 4位微缩放

NVFP4是Blackwell引入的4位浮点格式。每个值4位加每块共享的微缩放因子。与INT4不同，NVFP4保留浮点动态范围，使权重和激活更安全。

节省：vs BF16每参数4x，vs FP8每参数2x。对70B模型，权重从BF16 140GB → FP8 70GB → NVFP4 35GB。KV缓存保持FP8。

### MTP — 多Token预测

MTP(Multi-Token Prediction)是TRT-LLM的投机解码变体。不是预测1个token，模型同时预测N个token(通常4-6)。验证语义与标准投机解码相同——目标模型确认或拒绝。

Blackwell的Tensor Core原生支持MTP，使验证步骤几乎免费。在Llama 3.3 70B上，MTP加约1.8-2.2x加速在FP4权重之上。

### 分离预填充/解码与Dynamo

Dynamo是NVIDIA的编排层，分离预填充和解码到不同GPU。预填充节点处理长prompt(计算密集)。解码节点处理token生成(内存密集)。两者独立伸缩。

Dynamo + TRT-LLM在GB200 NVL72上：72个Blackwell GPU通过NVLink 5全对全连接。MoE专家通信在NVLink上而非InfiniBand，降低专家路由延迟约10x。

### Day-0 FP4支持

TRT-LLM的Day-0支持意味着新模型发布时(如Llama 4)，NVIDIA在发布日提供FP4权重。无需自己做训练后量化。这是NVIDIA与模型发布者合作的闭源优势。

### 7x差距分解

- 硬件(Blackwell vs Hopper)：约3-4x
- 精度(NVFP4 vs FP8)：约2x
- MTP投机：约1.5-2x
- 分离服务 + Dynamo：约1.2-1.5x

复合：3.5 _ 2 _ 1.7 \* 1.3 ≈ 15x理论。实践中约7x因为并非所有优化同时适用。

### 何时选择TRT-LLM

选择TRT-LLM当：

- 你全部在NVIDIA硬件上(Blackwell)。
- 你的模型在TRT-LLM支持列表中。
- 你不需要快速切换服务引擎。
- 成本是首要约束。

选择vLLM/SGLang当：

- 你需要跨供应商可移植性。
- 你需要快速实验和自定义核。
- 你的模型不在TRT-LLM支持列表中。
- 你需要开源透明度。

## 实践

`code/main.py`计算120B模型在BF16、FP8和NVFP4下的HBM占用，并估算H100 vs B200上的每百万token成本。

## 输出

本课程产生`outputs/skill-trt-llm-decision.md`。给定模型大小、硬件和成本目标，决定TRT-LLM vs vLLM/SGLang并量化经济差距。

## 练习

1. 计算70B模型权重在BF16、FP8和NVFP4下的HBM占用。KV缓存(8192 token，FP8)增加多少？
2. 为什么KV缓存不能使用NVFP4？量化误差在注意力计算中如何表现？
3. 你的团队有8个H100。值得升级到B200配TRT-LLM吗？算数学。
4. 阅读TRT-LLM文档关于Day-0支持。列出3个Day-0支持的模型和3个不支持的。
5. Dynamo分离预填充/解码。画出架构并标注数据流。

## 关键术语

| 术语        | 常见说法      | 实际含义                                    |
| ----------- | ------------- | ------------------------------------------- |
| NVFP4       | "4位浮点"     | Blackwell 4位微缩放浮点格式；用于权重和激活 |
| FP8         | "8位浮点"     | KV缓存和注意力的最低安全精度                |
| MTP         | "多Token预测" | 同时预测N个token的投机解码变体              |
| Dynamo      | "NVIDIA编排"  | 分离预填充/解码的编排层                     |
| Day-0支持   | "发布日FP4"   | 模型发布日即提供FP4权重                     |
| GB200 NVL72 | "72 GPU机架"  | 72个Blackwell GPU通过NVLink 5全对全连接     |

## 延伸阅读

- [NVIDIA TensorRT-LLM Documentation](https://nvidia.github.io/TensorRT-LLM/)
- [NVIDIA Dynamo](https://developer.nvidia.com/blog/deploying-disaggregated-llm-inference-workloads-on-kubernetes/)
- [SemiAnalysis InferenceX Report](https://semianalysis.com/)
