---
title: '推理指标 — TTFT、TPOT、ITL、Goodput、P99'
description: 掌握推理服务的核心指标体系，从延迟分解到Goodput复合SLO
module: 'ai-engineering'
difficulty: beginner
tags:
  - 推理指标
  - TTFT
  - TPOT
  - ITL
  - Goodput
  - P99
  - SLO
related:
  - 'ai-engineering/图论'
  - 'ai-engineering/推理平台经济学'
  - 'ai-engineering/托管LLM平台比较'
  - 'ai-engineering/文本转语音'
prerequisites:
  - 'ai-engineering/机器学习概述'
---

# 推理指标 — TTFT、TPOT、ITL、Goodput、P99

> 四个指标决定推理部署是否工作。TTFT是预填充加队列加网络。TPOT(等同ITL)是每token的内存受限解码成本。端到端延迟是TTFT加TPOT乘输出长度。吞吐量是整个集群每秒聚合的token数。但对产品重要的是goodput——同时满足每个SLO的请求比例。高吞吐低goodput意味着你在处理永远无法按时到达用户的token。2026年TRT-LLM上Llama-3.1-8B-Instruct的参考数字：平均TTFT 162 ms，平均TPOT 7.33 ms，平均E2E 1,093 ms。永远报告P50、P90、P99——绝不仅是平均。注意测量陷阱：GenAI-Perf从ITL计算中排除TTFT，LLMPerf包含它；两个工具对同一次运行的TPOT不一致。

**类型:** 学习
**语言:** Python (stdlib, toy百分位计算器和goodput报告器)
**前置知识:** Phase 17 · 04 (vLLM服务内部)
**时间:** ~60分钟

## 学习目标

- 精确定义TTFT、TPOT、ITL、E2E、吞吐和goodput并命名每个测量的组件。
- 解释为什么平均是LLM服务的错误统计量以及如何阅读P50/P90/P99。
- 构造SLO多约束(如TTFT<500 ms AND TPOT<15 ms AND E2E<2 s)并针对它计算goodput。
- 说出两个对同一次运行TPOT不一致的基准测试工具并解释原因。

## 问题

"我们的吞吐是15,000 token每秒。"那又怎样？如果40%的请求超过2秒端到端，用户放弃了会话。吞吐本身不告诉你产品是否工作。

推理有多个延迟轴，每个以不同方式失败。预填充是计算受限的，随prompt长度缩放。解码是内存受限的，随批次大小缩放。排队延迟是运营问题。网络是物理距离问题。你需要每个的不同指标，你需要百分位，你需要一个说"用户是否得到了期望"的单一复合——那就是goodput。

## 概念

### TTFT — 首Token时间

`TTFT = queue_time + network_request + prefill_time`

长prompt时预填充主导。在H100上Llama-3.3-70B FP8，32k prompt约800 ms纯预填充。队列时间是负载下的调度器行为。网络请求是包括TLS的线路时间。TTFT是用户在任何内容流回之前看到的延迟。

### TPOT — 每输出Token时间

`TPOT = decode_time_per_token`

TPOT是内存受限的。每个解码步骤从HBM读取模型权重和KV缓存。更大的批次摊销读取但增加每步时间。TPOT随批次大小线性增长到饱和点。

### ITL — Token间延迟

ITL在概念上与TPOT相同但测量方式不同。TPOT = (总解码时间) / (输出token数)。ITL = 两个连续token间的时间。在稳定状态下它们相等。在预填充/解码边界或投机命中/未命中时它们发散。

**测量陷阱**：GenAI-Perf从ITL计算中排除TTFT(它测量纯解码间隔)。LLMPerf包含TTFT(它测量从第一个到最后一个token的时间除以token数)。两个工具对"ITL"和"TPOT"报告不同数字对同一次运行。始终记录你使用哪个定义。

### E2E — 端到端延迟

`E2E = TTFT + TPOT * output_length`

用户感知的延迟。由TTFT(首字节)和TPOT(流式速度)主导。长输出时TPOT主导；短输出时TTFT主导。

### 吞吐量

`throughput = total_tokens_per_second_across_fleet`

聚合指标。对容量规划有用，对用户体验无用。15,000 tok/s可能意味着10,000个快乐用户或5,000个快乐用户加5,000个超时的。

### Goodput — 唯一重要的指标

`goodput = fraction_of_requests_meeting_all_SLOs_simultaneously`

SLO是多约束：TTFT < X AND TPOT < Y AND E2E < Z。Goodput是满足所有三个的请求比例。高吞吐低goodput = 浪费计算。

示例：1,000请求中800个满足TTFT < 500ms，900个满足TPOT < 15ms，750个满足E2E < 2s。Goodput不是800/1000或900/1000或750/1000——它是满足所有三个的请求数。如果700个满足全部三个，goodput = 70%。

### 为什么平均撒谎

平均TTFT 200ms可能意味着每个请求约200ms，或990个请求<50ms和10个请求>15秒。长尾在平均中隐藏但在用户体验中可见。

永远报告P50(中位)、P90和P99。P99 TTFT告诉你最慢1%的用户体验。如果P99是5秒，每100个用户有1个等5秒——对产品不可接受。

### 2026年参考数字

TRT-LLM上Llama-3.1-8B-Instruct：

- 平均TTFT：162 ms
- 平均TPOT：7.33 ms
- 平均E2E：1,093 ms

vLLM上Llama-3.3-70B FP8，H100 SXM5，128并发：

- P50 TTFT：约200 ms
- P99 TTFT：约800 ms
- P50 TPOT：约10 ms
- P99 TPOT：约25 ms

### SLO设计模式

常见SLO：

- TTFT < 500ms(P99)
- TPOT < 15ms(P99)
- E2E < 2s(P99)
- Goodput > 95%

设置SLO时从用户体验开始，不是从硬件能力开始。如果产品需要亚秒首字节，TTFT SLO是500ms不管GPU能做什么。

## 实践

`code/main.py`从合成延迟分布计算百分位和goodput。比较平均vs P99并展示goodput如何随SLO收紧而下降。

## 输出

本课程产生`outputs/skill-inference-metrics-dashboard.md`。给定推理部署，定义SLO、选择指标并设计显示goodput的仪表板。

## 练习

1. 计算1,000请求的goodput：850满足TTFT<500ms，920满足TPOT<15ms，780满足E2E<2s。假设独立，多少满足全部三个？
2. 为什么GenAI-Perf和LLMPerf对同一次运行报告不同TPOT？哪个定义对用户体验更相关？
3. 设计SLO：语音助手需要<300ms首音频字节。TTFT SLO应该是什么？考虑网络和队列。
4. 你的P99 TTFT是2秒但P50是100ms。描述可能原因和修复。
5. 阅读vLLM指标文档。列出暴露的指标并映射到TTFT/TPOT/ITL/E2E。

## 关键术语

| 术语    | 常见说法       | 实际含义                                   |
| ------- | -------------- | ------------------------------------------ |
| TTFT    | "首Token时间"  | 预填充 + 队列 + 网络；用户等待首字节的时间 |
| TPOT    | "每Token时间"  | 每输出token的解码时间；内存受限            |
| ITL     | "Token间延迟"  | 连续token间的时间；概念上=TPOT但测量不同   |
| E2E     | "端到端延迟"   | TTFT + TPOT \* 输出长度；用户感知延迟      |
| Goodput | "有效吞吐"     | 满足所有SLO的请求比例；唯一重要的复合指标  |
| P99     | "第99百分位"   | 1%最慢请求的阈值；长尾可见性               |
| SLO     | "服务等级目标" | 产品驱动的延迟目标；从用户体验开始         |

## 延伸阅读

- [NVIDIA GenAI-Perf](https://github.com/triton-inference-server/perf_analyzer)
- [vLLM Metrics Documentation](https://docs.vllm.ai/en/latest/serving/metrics.html)
- [Artificial Analysis Benchmarks](https://artificialanalysis.ai/)
