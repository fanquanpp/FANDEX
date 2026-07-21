---
title: '分离预填充/解码 — NVIDIA Dynamo与llm-d'
description: '理解预填充和解码分离如何通过独立伸缩实现30-40%成本节省'
module: 'ai-engineering'
difficulty: advanced
tags:
  - 分离服务
  - Dynamo
  - 'llm-d'
  - 预填充
  - 解码
  - KV传输
  - NIXL
related:
  - 'ai-engineering/反向传播'
  - 'ai-engineering/范数与距离'
  - 'ai-engineering/复数'
  - 'ai-engineering/傅里叶变换'
prerequisites:
  - 'ai-engineering/机器学习概述'
---

# 分离预填充/解码 — NVIDIA Dynamo与llm-d

> 预填充是计算受限的；解码是内存受限的。在同一GPU上运行两者浪费一种资源。分离将它们分到独立池并通过NIXL(RDMA/InfiniBand或TCP回退)传输KV缓存。NVIDIA Dynamo(GTC 2025宣布，1.0 GA)位于vLLM/SGLang/TRT-LLM之上——其Planner Profiler + SLA Planner自动比率匹配预填充:解码比以满足SLO。NVIDIA发布此范围的吞吐增益——developer.nvidia.com(2025-06)显示GB200 NVL72 + Dynamo上DeepSeek-R1 MoE在中延迟范围约6x改进。llm-d(Red Hat + AWS)是Kubernetes原生的：预填充/解码/路由器作为独立Service带每角色HPA。llm-d 0.5添加分层KV卸载、缓存感知LoRA路由、UCCL网络、缩放到零。经济学：多个客户披露的内部汇总建议从共置服务切换到Dynamo分离在恒定SLA下节省30-40%($2M级推理花费即$600-800K/年)。短prompt(<512 token，短输出)不值得传输成本。

**类型:** 学习
**语言:** Python (stdlib, toy分离vs共置模拟器)
**前置知识:** Phase 17 · 04 (vLLM服务内部), Phase 17 · 08 (推理指标)
**时间:** ~75分钟

## 学习目标

- 解释为什么预填充和解码有不同的资源瓶颈以及分离如何解决。
- 描述Dynamo架构：Planner Profiler + SLA Planner + NIXL传输。
- 比较Dynamo(NVIDIA)和llm-d(Red Hat + AWS)在架构和集成上。
- 计算分离vs共置在给定工作负载下的成本节省。

## 问题

预填充是计算密集的——处理长prompt需要大量FLOPs但很少内存。解码是内存密集的——每步读取完整模型权重和KV缓存但很少FLOPs。在同一GPU上运行两者意味着一个资源总是浪费。分离让每个池独立伸缩到其瓶颈。

## 概念

### 预填充池 vs 解码池

- 预填充池：计算优化GPU(高FLOPs)。处理长prompt预填充。输出KV缓存。
- 解码池：内存优化GPU(高HBM)。处理token生成。接收KV缓存。
- NIXL传输：RDMA/InfiniBand或TCP回退在池间移动KV缓存。

### NVIDIA Dynamo

Dynamo位于服务引擎(vLLM/SGLang/TRT-LLM)之上：

- Planner Profiler：分析工作负载特征。
- SLA Planner：自动匹配预填充:解码比率以满足SLO。
- NIXL：KV缓存传输层。

### llm-d

Kubernetes原生分离：

- 预填充/解码/路由器作为独立Service。
- 每角色HPA(预填充按队列深度伸缩，解码按KV压力伸缩)。
- llm-d 0.5：分层KV卸载、缓存感知LoRA路由、UCCL网络、缩放到零。

### 经济学

30-40%节省在$2M级推理花费上。来源：多个客户披露的内部汇总。短prompt(<512 token)不值得传输成本因为预填充已经很快。

### 何时分离

- 长prompt(>1K token) + 高并发：分离获胜。
- 短prompt(<512 token) + 低并发：共置更好(传输成本>节省)。
- MoE模型：分离特别有效因为专家路由可以优化。

## 实践

`code/main.py`模拟分离vs共置在不同工作负载形状下。

## 输出

本课程产生`outputs/skill-disaggregated-decision.md`。给定工作负载和SLA，决定分离vs共置并量化节省。

## 练习

1. 计算分离vs共置在50%长prompt(>2K)和50%短prompt(<512)下的成本。
2. 为什么短prompt不值得KV传输成本？
3. 画出Dynamo架构并标注组件。
4. 阅读llm-d GitHub。描述分层KV卸载机制。
5. MoE模型为什么特别受益于分离？

## 关键术语

| 术语             | 常见说法          | 实际含义                              |
| ---------------- | ----------------- | ------------------------------------- |
| 分离服务         | "预填充/解码分离" | 预填充和解码运行在不同GPU池上         |
| NIXL             | "KV传输层"        | NVIDIA KV缓存传输协议(RDMA/TCP)       |
| Dynamo           | "NVIDIA编排"      | NVIDIA分离服务编排层                  |
| llm-d            | "K8s分离"         | Red Hat + AWS的Kubernetes原生分离方案 |
| Planner Profiler | "工作负载分析器"  | Dynamo中分析工作负载特征的组件        |

## 延伸阅读

- [NVIDIA Dynamo Documentation](https://developer.nvidia.com/dynamo)
- [llm-d GitHub](https://github.com/llm-d/llm-d)
