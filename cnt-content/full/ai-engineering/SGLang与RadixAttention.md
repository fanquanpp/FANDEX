---
title: SGLang与RadixAttention前缀密集工作负载
description: 理解SGLang如何通过基数树KV缓存和缓存感知调度实现前缀共享加速
module: 'ai-engineering'
difficulty: intermediate
tags:
  - SGLang
  - RadixAttention
  - 基数树
  - 前缀共享
  - KV缓存复用
  - 缓存感知调度
related:
  - 'ai-engineering/Python环境管理'
  - 'ai-engineering/PyTorch入门'
  - 'ai-engineering/TensorRT-LLM与Blackwell'
  - 'ai-engineering/vLLM服务内部机制'
prerequisites:
  - 'ai-engineering/机器学习概述'
---

# SGLang与RadixAttention前缀密集工作负载

> SGLang将KV缓存视为存储在基数树中的一等可复用资源。vLLM按FCFS调度请求，SGLang的缓存感知调度器优先处理具有更长共享前缀的请求——实际上是深度优先基数遍历，使热分支常驻HBM。在Llama 3.1 8B上使用ShareGPT类1K prompt，SGLang达到约16,200 tok/s而vLLM约12,500，约29%优势。在前缀密集RAG工作负载上优势达到6.4x。在语音克隆形状工作负载上缓存命中率超过86%。2026年部署在xAI、LinkedIn、Cursor、Oracle、GCP、Azure、AWS的400,000+ GPU上。坑是6.4x数字在前缀排序不一致时蒸发——排序是工程师的杠杆。

**类型:** 学习
**语言:** Python (stdlib, toy基数树缓存 + 缓存感知调度器)
**前置知识:** Phase 17 · 04 (vLLM服务内部), Phase 14 (Agent RAG)
**时间:** ~75分钟

## 学习目标

- 画出RadixAttention：前缀如何存储在基数树中以及KV块如何在根于同一分支的序列间共享。
- 解释缓存感知调度以及为什么FCFS对前缀密集流量是错误的。
- 给定前缀缓存命中率和prompt长度分布计算工作负载的预期加速。
- 说出使6.4x数字成为现实vs丢失上行空间的prompt排序纪律。

## 问题

经典服务将每个请求的prompt视为不透明的。即使5,000个RAG请求都以相同的2,000 token系统prompt加相同检索前言开始，vLLM也会预填充那个2,000 token前缀5,000次。GPU一遍又一遍做相同的工作。

观察：Agent和RAG工作负载中的prompt几乎总是共享长前缀。系统prompt、工具schema、少样本示例、检索header、对话历史——都在请求间重复。如果你存储一次前缀的KV缓存并复用它，就不需要再次预填充。

RadixAttention正是这样做的。Token在基数树中索引；每个节点拥有从根到其路径上token序列的KV块。新请求遍历树：任何token匹配的节点复用该节点的KV块。预填充成本与"新"后缀成比例，而非完整prompt。

挑战是调度。如果两个请求共享2,000 token前缀，第三个只共享相同前缀的200 token，你想一起服务两个长共享请求使长前缀留在HBM。FCFS做的相反——它先服务先到的，可能在下一个长前缀请求到达前驱逐热分支。

## 概念

### 基数树作为KV索引

基数树(也叫压缩前缀树)存储token序列。每个节点代表一个token序列前缀并拥有该前缀的KV块。当新请求到达时：

1. 从根遍历树，匹配token。
2. 在匹配结束处，复用现有节点的KV块。
3. 对不匹配的后缀，分配新KV块并添加新分支。

示例：请求A有prompt `[sys, tool, fewshot, query_A]`。请求B有`[sys, tool, fewshot, query_B]`。两者共享`[sys, tool, fewshot]`前缀。基数树有一个节点拥有`[sys, tool, fewshot]`的KV块，两个子节点分别拥有`query_A`和`query_B`的KV块。请求B只预填充`query_B`——约50 token而非2,050。

### 缓存感知调度

SGLang的调度器不只是FCFS。它优先处理与已在KV缓存中的前缀有更多重叠的请求。效果：热前缀留在HBM；冷前缀被驱逐。

调度策略：

1. 对每个等待请求，计算与缓存前缀的重叠长度。
2. 按重叠长度降序排序。
3. 在KV块预算内接纳最高重叠请求。

这确保共享长前缀的请求一起调度，最大化缓存命中。

### 6.4x从哪来

在RAG工作负载中，每个请求共享相同的系统prompt(约1,000 token)加检索前言(约500 token)。没有前缀共享，每个请求预填充1,500 token。有前缀共享，只有检索结果(约200 token)需要预填充。预填充成本降低约7.5x。加上调度效率，净加速约6.4x。

### 排序纪律

6.4x数字需要前缀排序一致。如果请求以随机顺序到达，缓存命中率下降因为基数树不断驱逐和重建。排序纪律是：

- 所有请求使用相同系统prompt(标准化)。
- 检索结果在系统prompt后以一致顺序放置。
- 对话历史在检索前以一致顺序放置。

如果团队使用不同系统prompt或以不同顺序放置检索结果，缓存命中率下降。排序是工程师的杠杆。

### 语音克隆形状工作负载

语音克隆工作负载有独特的形状：长固定prompt(说话人参考音频编码)加短变化输入。缓存命中率超过86%因为参考音频跨请求共享。SGLang在此形状上显著优于vLLM。

### vLLM vs SGLang：何时用什么

| 工作负载                 | vLLM         | SGLang |
| ------------------------ | ------------ | ------ |
| 通用聊天(低前缀共享)     | 更好(更成熟) | 类似   |
| RAG(高前缀共享)          | 基线         | 6.4x   |
| Agent(系统prompt + 工具) | 基线         | 2-3x   |
| 语音克隆                 | 基线         | 5-8x   |
| 代码补全(低前缀共享)     | 更好         | 类似   |

2026年两者都在生产部署。选择基于工作负载形状。

## 实践

`code/main.py`模拟基数树KV缓存和缓存感知调度器。比较FCFS vs 缓存感知调度在RAG形状工作负载上。

## 输出

本课程产生`outputs/skill-prefix-cache-auditor.md`。给定工作负载，审计前缀共享机会并推荐SGLang vs vLLM加排序纪律。

## 练习

1. 计算RAG工作负载的预期加速：系统prompt 1,000 token，检索前言500 token，检索结果200 token，用户查询50 token。
2. 为什么FCFS对前缀密集流量是错误的？给出具体例子。
3. 设计排序纪律：3个团队使用不同系统prompt。如何标准化？
4. 阅读SGLang论文第4节。描述缓存感知调度算法的复杂度。
5. 你的工作负载是50%通用聊天和50% RAG。应该用vLLM还是SGLang？论证。

## 关键术语

| 术语           | 常见说法           | 实际含义                                   |
| -------------- | ------------------ | ------------------------------------------ |
| RadixAttention | "前缀KV缓存"       | 基数树索引的KV缓存；共享前缀的请求复用KV块 |
| 基数树         | "压缩前缀树"       | 按token前缀索引KV块的数据结构              |
| 缓存感知调度   | "前缀优先调度"     | 优先处理与缓存前缀有更多重叠的请求         |
| 排序纪律       | "标准化prompt顺序" | 确保请求以一致顺序放置前缀的工程实践       |
| 前缀共享       | "KV复用"           | 跨请求复用共享prompt前缀的KV缓存           |
| 缓存命中率     | "KV复用率"         | 从缓存服务而非重新预填充的KV块比例         |

## 延伸阅读

- [Zheng等人 — SGLang (arXiv:2312.07104)](https://arxiv.org/abs/2312.07104)
- [SGLang GitHub](https://github.com/sgl-project/sglang)
