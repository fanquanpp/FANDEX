---
title: 投机解码推理服务器
description: 'EAGLE-3在vLLM 0.7中在真实流量上提供2.5-3x吞吐。P-EAGLE (AWS 2026)进一步推进并行推测。SGLang SpecForge大规模训练草稿头。Red Hat Speculators hub发布常见开放模型的对齐草稿。2026年生产服务栈是vLLM或SGLang + EAGLE族草稿 + FP8/INT4量化 + HPA on queue-wait。以2.5x+基线吞吐服务两个开放模型并发布完整尾延迟报告。'
module: 'ai-engineering'
difficulty: advanced
tags:
  - 投机解码
  - 'EAGLE-3'
  - vLLM
  - SGLang
  - 推理吞吐
  - 尾延迟
related:
  - 'ai-engineering/特征工程与选择'
  - 'ai-engineering/特征选择进阶'
  - 'ai-engineering/凸优化'
  - 'ai-engineering/图论'
prerequisites:
  - 'ai-engineering/机器学习概述'
---

## 问题

投机解码在2026年成为商品。EAGLE-3草稿头在目标模型的隐藏状态上训练，预测N个token ahead；目标模型在单次前向中验证。60-80%的接受率转化为2-3x端到端吞吐。vLLM 0.7原生集成。SGLang + SpecForge给你训练管线。Red Hat Speculators发布Llama 3.3 70B、Qwen3-Coder-30B MoE、GPT-OSS-120B的对齐草稿。

工艺在服务运营，不在模型。接受率随流量分布漂移（ShareGPT vs 代码 vs 领域数据）。拒绝下的尾延迟比无推测更差——你必须报告多个批量大小下的p99，不仅是稳态tokens/sec。每1M tokens成本vs Anthropic/OpenAI API是可信度杠杆。

## 核心架构

### 投机解码

1. **草稿模型。** EAGLE-3草稿头预测N个token（通常4-8）。
2. **验证。** 目标模型在单次前向中验证所有草稿token。
3. **接受/拒绝。** 接受的token直接输出；拒绝的token及之后被丢弃。
4. **回退。** 至少接受1个token（目标模型的原始预测）。

### 服务栈

vLLM 0.7或SGLang + EAGLE-3草稿 + FP8/INT4量化 + HPA on queue-wait。

### 评估

稳态tokens/sec、p50/p90/p99延迟在多个批量大小、接受率、每1M tokens成本。

## 关键术语

| 术语            | 常见说法          | 实际含义                          |
| --------------- | ----------------- | --------------------------------- |
| Draft head      | "草稿头"          | 预测未来token的小型模型           |
| Acceptance rate | "接受率"          | 草稿token被目标模型验证通过的比例 |
| SpecForge       | "草稿训练"        | SGLang的草稿头训练管线            |
| Tail latency    | "尾延迟"          | p99等高百分位延迟                 |
| HPA             | "水平Pod自动伸缩" | Horizontal Pod Autoscaler         |

## 延伸阅读

- EAGLE-3 — vLLM 0.7集成投机解码
- SGLang SpecForge — 草稿头训练
- Red Hat Speculators — 对齐草稿发布
- TensorRT-LLM — NVIDIA投机解码
