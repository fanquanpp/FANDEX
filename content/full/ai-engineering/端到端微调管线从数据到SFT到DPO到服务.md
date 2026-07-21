---
title: 端到端微调管线从数据到SFT到DPO到服务
description: '8B模型用自有数据训练、DPO对齐自有偏好、量化、投机解码、以可测量的$/1M tokens服务。2026年开源栈：Axolotl v0.8、TRL 0.15、Unsloth迭代、GPTQ/AWQ/GGUF量化、vLLM 0.7 + EAGLE-3服务。YAML输入，服务端点输出，可重现全管线。'
module: 'ai-engineering'
difficulty: advanced
tags:
  - 微调管线
  - SFT
  - DPO
  - 量化
  - vLLM
  - 'EAGLE-3'
  - Axolotl
related:
  - 'ai-engineering/调试神经网络'
  - 'ai-engineering/调试与性能分析'
  - 'ai-engineering/多层网络'
  - 'ai-engineering/多代理软件工程团队'
prerequisites:
  - 'ai-engineering/机器学习概述'
---

## 问题

2026年每个严肃AI团队都保持一个微调管线在手。不是因为他们发布前沿基础模型，而是因为下游适配——领域SFT、针对标记偏好的DPO、为投机解码蒸馏草稿、用EAGLE-3服务——是可测量收益所在。Axolotl v0.8处理多GPU SFT配置。TRL 0.15处理DPO和GRPO。Unsloth给你快速单GPU迭代。vLLM 0.7 + EAGLE-3推动解码吞吐2-3x而不损失质量。工具可用；工艺在YAML、数据卫生和评估纪律中。

你将运行8B基础模型（Llama 3.3、Qwen3或Gemma 3）通过SFT然后DPO在任务特定数据上，量化用于服务，并测量对lm-evaluation-harness、RewardBench-2、MT-Bench-v2和MMLU-Pro的增益。你将在2026 Model Openness Framework下产出模型卡。重点是可重现性——一条命令端到端重新运行整个管线。

## 核心架构

### 管线阶段

1. **数据准备。** 清洗、去重、格式化为SFT对话格式。
2. **SFT。** Axolotl v0.8多GPU训练，LoRA或全参数。
3. **DPO。** TRL 0.15，在标记偏好对上训练。
4. **评估。** lm-evaluation-harness、RewardBench-2、MT-Bench-v2、MMLU-Pro。
5. **量化。** GPTQ/AWQ/GGUF，按部署目标选择。
6. **服务。** vLLM 0.7 + EAGLE-3投机解码。

### 可重现性

一条命令从YAML配置运行整个管线。所有超参数、数据版本和评估结果记录在模型卡中。

## 关键术语

| 术语                     | 常见说法       | 实际含义                                       |
| ------------------------ | -------------- | ---------------------------------------------- |
| Axolotl                  | "SFT框架"      | 多GPU SFT训练配置框架                          |
| TRL                      | "DPO框架"      | Transformer Reinforcement Learning，含DPO/GRPO |
| Unsloth                  | "快速迭代"     | 单GPU快速微调迭代                              |
| EAGLE-3                  | "投机解码"     | 基于隐藏状态的草稿头投机解码                   |
| Model Openness Framework | "模型开放框架" | 2026年模型文档和开放性标准                     |

## 延伸阅读

- Axolotl v0.8 — 多GPU SFT配置
- TRL 0.15 — DPO和GRPO训练
- Unsloth — 快速单GPU微调
- vLLM 0.7 — EAGLE-3投机解码服务
