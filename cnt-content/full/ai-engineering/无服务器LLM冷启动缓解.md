---
title: 无服务器LLM冷启动缓解
description: 理解五层冷启动缓解策略：预置镜像、模型流式加载、GPU快照、温池和分层加载
module: 'ai-engineering'
difficulty: intermediate
tags:
  - 冷启动
  - 无服务器
  - 模型流式加载
  - GPU快照
  - 温池
  - ServerlessLLM
related:
  - 'ai-engineering/托管LLM平台比较'
  - 'ai-engineering/文本转语音'
  - 'ai-engineering/无监督学习'
  - 'ai-engineering/线性代数直觉'
prerequisites:
  - 'ai-engineering/机器学习概述'
---

# 无服务器LLM冷启动缓解

> 20 GB模型镜像从冷到服务需要5-10分钟(7B)到20+分钟(70B)。在真正的无服务器世界，这不是预热——这是停机。缓解在五层操作：预置节点镜像(AWS上Bottlerocket，双卷架构)、模型流式加载(NVIDIA Run:ai Model Streamer，vLLM原生)、GPU内存快照(Modal检查点，高达10x更快重启)、温池(`min_workers=1`)、分层加载(ServerlessLLM的NVMe→DRAM→HBM管道，10-200x延迟降低)，以及迁移输入token(KB)而非KV缓存(GB)的实时迁移。Modal发布2-4秒冷启动作为下限；Baseten 5-10秒默认，预热后亚秒。本课程教你测量、预算和堆叠五层。

**类型:** 学习
**语言:** Python (stdlib, toy冷启动路径模拟器)
**前置知识:** Phase 17 · 02 (推理平台经济学), Phase 17 · 03 (GPU自动伸缩)
**时间:** ~60分钟

## 学习目标

- 画出冷启动的五层缓解栈并命名每层工具。
- 计算7B和70B模型从冷到服务的预算。
- 解释为什么迁移输入token(KB)比迁移KV缓存(GB)快。
- 说出Modal的2-4秒冷启动下限以及它如何实现。

## 问题

无服务器LLM的冷启动问题是：从零GPU到服务请求需要几分钟。用户等不了几分钟。每个缓解层减少一部分时间但增加成本或复杂性。

## 概念

### 五层缓解栈

1. **预置节点镜像**：Bottlerocket(AWS)预置模型镜像到节点。跳过从注册表拉取镜像(分钟)。节点启动时模型已在磁盘上。

2. **模型流式加载**：NVIDIA Run:ai Model Streamer和vLLM原生流式加载在权重到达时开始服务，不等完整下载。减少加载时间约30-50%。

3. **GPU内存快照**：Modal检查点将GPU内存状态保存到磁盘。重启从快照恢复而非从CPU加载权重。高达10x更快重启。

4. **温池**：`min_workers=1`保持至少一个GPU始终加载。冷启动成本换为空闲GPU成本。对SLO关键路径必要。

5. **分层加载**：ServerlessLLM的NVMe→DRAM→HBM管道。模型权重从快速NVMe流式到DRAM再到HBM，每层并行。10-200x延迟降低vs传统加载。

### 实时迁移

迁移输入token(KB)而非KV缓存(GB)。在新节点上重新预填充比传输KV缓存快。对短prompt可行；对长prompt预填充成本高。

### 冷启动预算

7B模型，BF16，14GB权重：

- 从注册表拉取：2-5分钟
- CPU到GPU加载：5-10秒
- 引擎初始化：2-5秒
- 总计(无缓解)：2-5分钟
- 总计(预置+流式)：5-15秒
- 总计(Modal快照)：2-4秒

70B模型，FP8，70GB权重：

- 从注册表拉取：5-15分钟
- CPU到GPU加载：30-60秒
- 引擎初始化：5-10秒
- 总计(无缓解)：5-15分钟
- 总计(预置+流式)：30-90秒
- 总计(温池)：0秒(已加载)

### Modal的2-4秒下限

Modal通过检查点实现2-4秒冷启动：GPU内存快照保存到分布式存储，启动时直接恢复到GPU。跳过权重加载和初始化。2-4秒是分布式存储读取+GPU恢复的物理下限。

## 实践

`code/main.py`模拟不同缓解策略下的冷启动时间。

## 输出

本课程产生`outputs/skill-cold-start-budget.md`。给定模型大小和SLA，设计冷启动缓解栈。

## 练习

1. 计算70B FP8模型在无缓解、预置+流式和温池下的冷启动时间。
2. 为什么迁移输入token比迁移KV缓存快？在什么prompt长度下这不再成立？
3. 设计冷启动策略：7B模型，突发流量，<10秒SLA，成本敏感。
4. 阅读ServerlessLLM论文。描述NVMe→DRAM→HBM管道以及为什么每层并行。
5. Modal快照vs温池：在什么流量模式下每个更经济？

## 关键术语

| 术语         | 常见说法        | 实际含义                              |
| ------------ | --------------- | ------------------------------------- |
| 冷启动       | "从零到服务"    | 从无GPU到服务首个请求的时间           |
| 预置镜像     | "镜像已在磁盘"  | 节点启动前模型镜像已预置到磁盘        |
| 模型流式加载 | "边加载边服务"  | 权重到达时开始服务不等完整下载        |
| GPU快照      | "内存检查点"    | 保存GPU内存状态到磁盘；重启时直接恢复 |
| 温池         | "min_workers=1" | 保持至少一个GPU始终加载；零冷启动     |
| 分层加载     | "NVMe→DRAM→HBM" | 并行流式加载通过存储层次              |

## 延伸阅读

- [ServerlessLLM (arXiv:2406.03117)](https://arxiv.org/abs/2406.03117)
- [Modal Checkpoints Documentation](https://modal.com/docs/guide/checkpoints)
- [NVIDIA Run:ai Model Streamer](https://docs.nvidia.com/run-ai/)
