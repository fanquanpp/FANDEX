---
title: Prompt缓存与语义缓存经济学
description: 理解L2提供商级缓存和L1应用级语义缓存的两层缓存策略
module: 'ai-engineering'
difficulty: intermediate
tags:
  - Prompt缓存
  - 语义缓存
  - KV缓存复用
  - Anthropic缓存
  - OpenAI缓存
  - 命中率
related:
  - 'ai-engineering/MCP服务器与注册中心与治理'
  - 'ai-engineering/ML流水线'
  - 'ai-engineering/Python环境管理'
  - 'ai-engineering/PyTorch入门'
prerequisites:
  - 'ai-engineering/机器学习概述'
---

# Prompt缓存与语义缓存经济学

> 缓存发生在两层。L2(提供商级)prompt/前缀缓存为重复前缀复用注意力KV——Anthropic的prompt缓存文档宣传长prompt上高达90%成本降低和85%延迟降低；对Claude 3.5 Sonnet缓存读取$0.30/M vs $3.00/M全新，5分钟TTL和1小时TTL选项2x写入溢价。OpenAI prompt缓存对>=1024 token的prompt自动应用，缓存输入约90%折扣vs全新。L1(应用级)语义缓存在嵌入相似度命中时完全跳过LLM。供应商"95%准确率"指匹配正确性，非命中率——报告的生产命中率从10%(开放式聊天)到70%(结构化FAQ)；没有提供商发布官方基线，所以将这些视为社区遥测而非保证。生产陷阱：并行化杀死缓存(N个并行请求在首次缓存写入前发出可能使花费膨胀数倍)，前缀内的动态内容完全阻止缓存命中。ProjectDiscovery报告通过将动态文本移出可缓存前缀，命中率从7%移到74%(2025-11)。

**类型:** 学习
**语言:** Python (stdlib, toy两层缓存模拟器)
**前置知识:** Phase 17 · 04 (vLLM服务内部), Phase 17 · 06 (SGLang RadixAttention)
**时间:** ~60分钟

## 学习目标

- 比较L2提供商级缓存(Anthropic, OpenAI)和L1应用级语义缓存在机制和经济学上。
- 解释为什么并行化杀死缓存以及如何避免。
- 计算两层缓存策略下的预期成本节省。
- 说出ProjectDiscovery的7%→74%命中率改进策略。

## 问题

每次LLM调用都重新计算整个prompt的KV缓存，即使99%的prompt与上一个请求相同。这是浪费。两层缓存从不同角度解决这个问题。

## 概念

### L2 — 提供商级Prompt缓存

Anthropic和OpenAI在提供商侧缓存KV。重复前缀的请求复用缓存的KV，跳过预填充。

- Anthropic：缓存读取$0.30/M vs $3.00/M全新。5分钟TTL(免费)或1小时TTL(2x写入溢价)。
- OpenAI：对>=1024 token的prompt自动缓存。约90%折扣vs全新。

### L1 — 应用级语义缓存

语义缓存在嵌入空间中匹配相似请求。如果新请求的嵌入与缓存请求足够接近(余弦相似度>阈值)，返回缓存响应。

命中率：10%(开放式聊天)到70%(结构化FAQ)。"95%准确率"指匹配正确性，非命中率。

### 并行化陷阱

N个并行请求在首次缓存写入前发出。所有N个请求都未命中缓存，全部支付完整预填充成本。然后缓存写入，但伤害已造成。修复：序列化共享前缀的请求或使用单次预填充+广播。

### 动态内容陷阱

前缀内的动态内容(时间戳、用户ID、随机token)阻止缓存命中。修复：将动态内容移到prompt末尾，前缀保持静态。

### ProjectDiscovery案例

从7%到74%命中率：将动态文本(用户特定数据)移出可缓存前缀到后缀。前缀(系统prompt + 工具schema)跨请求相同，可缓存。

## 实践

`code/main.py`模拟两层缓存：L2提供商缓存(前缀匹配)和L1语义缓存(嵌入相似度)。

## 输出

本课程产生`outputs/skill-caching-economics.md`。给定工作负载和成本，设计两层缓存策略并估算节省。

## 练习

1. 计算Anthropic缓存vs无缓存在1M请求/月、80%前缀共享率下的成本。
2. 为什么并行化杀死缓存？设计修复。
3. 你的prompt有系统指令(500 token) + 用户数据(200 token) + 查询(50 token)。如何排序最大化缓存命中？
4. 语义缓存10%命中率(聊天)vs 70%命中率(FAQ)。在什么命中率下语义缓存比无缓存更便宜？
5. 阅读Anthropic prompt缓存文档。描述TTL选项和写入溢价。

## 关键术语

| 术语         | 常见说法       | 实际含义                         |
| ------------ | -------------- | -------------------------------- |
| L2缓存       | "提供商缓存"   | 提供商侧KV缓存复用；前缀匹配     |
| L1缓存       | "语义缓存"     | 应用侧嵌入相似度匹配；跳过LLM    |
| TTL          | "缓存生存时间" | 缓存条目有效时间；5分钟或1小时   |
| 命中率       | "缓存命中比例" | 从缓存服务而非重新计算的请求比例 |
| 并行化陷阱   | "并发杀死缓存" | 并行请求在首次写入前全部未命中   |
| 动态内容陷阱 | "变化阻止缓存" | 前缀内变化内容阻止缓存命中       |

## 延伸阅读

- [Anthropic Prompt Caching](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching)
- [OpenAI Prompt Caching](https://platform.openai.com/docs/guides/prompt-caching)
