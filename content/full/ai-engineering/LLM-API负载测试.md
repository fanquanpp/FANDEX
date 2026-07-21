---
title: 'LLM API负载测试 — 为什么k6和Locust会撒谎'
description: 理解传统负载测试工具在LLM场景下的两个陷阱和2026年正确工具选择
module: 'ai-engineering'
difficulty: intermediate
tags:
  - 负载测试
  - k6
  - Locust
  - 'GenAI-Perf'
  - LLMPerf
  - 流式响应
  - GIL陷阱
related:
  - 'ai-engineering/KNN与距离度量'
  - 'ai-engineering/Linux与AI'
  - 'ai-engineering/LLM-FinOps单位经济学'
  - 'ai-engineering/LLM功能AB测试'
prerequisites:
  - 'ai-engineering/机器学习概述'
---

# LLM API负载测试 — 为什么k6和Locust会撒谎

> 传统负载测试器不是为流式响应、可变输出长度、token级指标或GPU饱和设计的。两个陷阱咬大多数团队。GIL陷阱：Locust的token级测量在Python GIL下运行分词，与重并发下的请求生成竞争；分词积压然后膨胀报告的token间延迟——你的客户端是瓶颈，不是服务器。Prompt一致性陷阱：循环中相同prompt测试token分布上的一个点；真实流量有可变长度和多样前缀匹配。LLMPerf用`--mean-input-tokens` + `--stddev-input-tokens`修复这个。2026年工具映射：LLM专用(GenAI-Perf, LLMPerf, LLM-Locust, guidellm)用于token级准确度；**k6 v2026.1.0** + **k6 Operator 1.0 GA(2025年9月)**——流式感知、Kubernetes原生分布式通过TestRun/PrivateLoadZone CRD，CI/CD门控最佳；Vegeta用于Go恒定速率饱和；Locust 2.43.3仅带LLM-Locust扩展用于流式。负载模式：稳态、爬坡、尖峰(自动伸缩测试)、浸泡(内存泄漏)。

**类型:** 构建
**语言:** Python (stdlib, toy真实prompt生成器 + 延迟收集器)
**前置知识:** Phase 17 · 08 (推理指标), Phase 17 · 03 (GPU自动伸缩)
**时间:** ~75分钟

## 学习目标

- 解释GIL陷阱和prompt一致性陷阱以及它们如何使负载测试结果失真。
- 将2026年负载测试工具映射到用例：LLM专用 vs 通用 vs CI/CD。
- 设计负载测试带可变prompt长度和流式响应测量。
- 说出四种负载模式：稳态、爬坡、尖峰、浸泡。

## 问题

传统负载测试器测量HTTP延迟。LLM服务有token级语义：TTFT、TPOT、ITL。用传统工具测试LLM就像用温度计测量重量——错误工具。

## 概念

### GIL陷阱

Locust在Python GIL下运行分词。重并发时，分词与请求生成竞争GIL。分词积压膨胀报告的ITL。客户端是瓶颈，不是服务器。

### Prompt一致性陷阱

循环中相同prompt测试一个点。真实流量有可变长度和多样前缀。LLMPerf用`--mean-input-tokens` + `--stddev-input-tokens`修复。

### 2026年工具映射

| 工具                | 类型      | 最佳场景       |
| ------------------- | --------- | -------------- |
| GenAI-Perf          | LLM专用   | token级准确度  |
| LLMPerf             | LLM专用   | 可变prompt长度 |
| k6 v2026.1.0        | 通用+流式 | CI/CD门控      |
| Vegeta              | 通用      | Go恒定速率     |
| Locust + LLM-Locust | 通用+扩展 | Python流式     |

### 四种负载模式

- 稳态：恒定QPS。基线性能。
- 爬坡：递增QPS。找到断点。
- 尖峰：突发QPS。测试自动伸缩。
- 浸泡：长时间恒定QPS。检测内存泄漏。

## 实践

`code/main.py`生成可变长度prompt并模拟负载测试延迟收集。

## 输出

本课程产生`outputs/skill-llm-load-test-plan.md`。给定服务配置和SLO，设计负载测试计划。

## 练习

1. 设计负载测试：70B模型，H100，目标2K tok/s。用什么工具和模式？
2. GIL陷阱如何使结果失真？如何检测客户端是瓶颈？
3. 比较k6和LLMPerf在流式响应测量上。
4. 设计尖峰测试：验证自动伸缩在5秒内从0扩到4副本。
5. 阅读GenAI-Perf文档。列出它测量的指标。

## 关键术语

| 术语         | 常见说法         | 实际含义                     |
| ------------ | ---------------- | ---------------------------- |
| GIL陷阱      | "Python瓶颈"     | 分词在GIL下与请求生成竞争    |
| Prompt一致性 | "相同prompt偏差" | 循环相同prompt不反映真实流量 |
| 流式感知     | "token级测量"    | 正确测量流式响应的TTFT/TPOT  |
| 负载模式     | "测试形状"       | 稳态/爬坡/尖峰/浸泡四种模式  |

## 延伸阅读

- [GenAI-Perf Documentation](https://github.com/triton-inference-server/perf_analyzer)
- [LLMPerf GitHub](https://github.com/ray-project/llmperf)
- [k6 Documentation](https://k6.io/docs/)
