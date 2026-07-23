---
title: '自托管服务选择 — llama.cpp、Ollama、TGI、vLLM、SGLang'
description: 比较2026年五大自托管推理引擎的定位和选择决策树
module: 'ai-engineering'
difficulty: beginner
tags:
  - 自托管
  - llama.cpp
  - Ollama
  - TGI
  - vLLM
  - SGLang
  - 引擎选择
related:
  - 'ai-engineering/终端与Shell'
  - 'ai-engineering/终端原生编码代理'
  - 'ai-engineering/自主研究代理AI-Scientist级'
  - 'ai-engineering/AI的SRE事件响应'
prerequisites:
  - 'ai-engineering/机器学习概述'
---

# 自托管服务选择 — llama.cpp、Ollama、TGI、vLLM、SGLang

> 四个引擎统治2026年自托管推理。基于硬件、规模和生态选择。**llama.cpp**在CPU上最快——最广模型支持，完全控制量化和线程。**Ollama**是开发笔记本一键安装，比llama.cpp慢约15-30%(Go + CGo + HTTP序列化)，生产负载下3x吞吐差距。**TGI于2025年12月11日进入维护模式**——仅bug修复，原始吞吐比vLLM慢约10%但历史上顶级可观测性和HF生态集成。维护状态使其成为风险长期赌注——SGLang或vLLM是新项目更安全的默认。**vLLM**是通用生产默认——v0.15.1(2026年2月)添加PyTorch 2.10、RTX Blackwell SM120、H200优化。**SGLang**是Agent多轮/前缀密集专家——400,000+ GPU在生产中(xAI, LinkedIn, Cursor, Oracle, GCP, Azure, AWS)。硬件约束：仅CPU→仅llama.cpp。AMD/非NVIDIA→仅vLLM(TRT-LLM是NVIDIA锁定的)。2026年管道模式：开发=Ollama，暂存=llama.cpp，生产=vLLM或SGLang。相同GGUF/HF权重贯穿。

**类型:** 学习
**语言:** Python (stdlib, 引擎决策树遍历器)
**前置知识:** Phase 17所有引擎课程(04, 06, 07, 09, 18)
**时间:** ~45分钟

## 学习目标

- 将五个自托管引擎映射到用例：llama.cpp→CPU，Ollama→开发，TGI→维护模式，vLLM→通用生产，SGLang→前缀密集。
- 说出TGI维护模式状态以及为什么它是新项目的风险赌注。
- 描述2026年管道模式：开发=Ollama，暂存=llama.cpp，生产=vLLM/SGLang。
- 基于硬件、规模和生态遍历引擎决策树。

## 问题

选择自托管推理引擎不是"哪个最好"。而是"哪个最适合你的约束"。硬件、规模、生态和工作负载形状都影响决策。

## 概念

### 引擎比较

| 引擎      | 最佳场景       | 硬件       | 状态     |
| --------- | -------------- | ---------- | -------- |
| llama.cpp | CPU最快        | CPU/GPU    | 活跃     |
| Ollama    | 开发笔记本     | CPU/GPU    | 活跃     |
| TGI       | HF生态         | GPU        | 维护模式 |
| vLLM      | 通用生产       | NVIDIA GPU | 活跃     |
| SGLang    | 前缀密集/Agent | NVIDIA GPU | 活跃     |

### TGI维护模式

2025年12月11日进入维护模式。仅bug修复。不是新项目的安全选择。

### 硬件约束

- 仅CPU：llama.cpp唯一选择。
- AMD/非NVIDIA：vLLM唯一选择(TRT-LLM是NVIDIA锁定)。
- NVIDIA GPU：vLLM或SGLang。

### 2026年管道模式

- 开发：Ollama(一键安装)。
- 暂存：llama.cpp(快速迭代)。
- 生产：vLLM(通用)或SGLang(前缀密集)。
- 相同GGUF/HF权重贯穿。

### 决策树

1. 仅CPU？→ llama.cpp。
2. 开发/原型？→ Ollama。
3. 前缀密集/Agent工作负载？→ SGLang。
4. 通用生产？→ vLLM。
5. 需要TRT-LLM级性能？→ TRT-LLM(NVIDIA锁定)。

## 实践

`code/main.py`实现引擎决策树遍历器。

## 输出

本课程产生`outputs/skill-self-hosted-engine-picker.md`。给定约束，推荐引擎。

## 练习

1. 遍历决策树：8GB RAM笔记本电脑，本地开发。选什么？
2. 遍历决策树：4x H100，RAG工作负载，128并发。选什么？
3. 为什么TGI维护模式是风险？什么替代？
4. 比较vLLM和SGLang在通用聊天vs RAG工作负载上。
5. 设计管道：开发→暂存→生产，相同权重。

## 关键术语

| 术语     | 常见说法         | 实际含义                     |
| -------- | ---------------- | ---------------------------- |
| 维护模式 | "仅bug修复"      | TGI不再积极开发；新功能停止  |
| 管道模式 | "开发→暂存→生产" | 不同环境用不同引擎，相同权重 |
| 决策树   | "选择流程"       | 基于约束选择引擎的决策流程   |

## 延伸阅读

- [llama.cpp GitHub](https://github.com/ggerganov/llama.cpp)
- [Ollama GitHub](https://github.com/ollama/ollama)
- [vLLM GitHub](https://github.com/vllm-project/vllm)
- [SGLang GitHub](https://github.com/sgl-project/sglang)
