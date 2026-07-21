---
title: Agno与Mastra生产运行时
description: 'Agno（Python）和Mastra（TypeScript）是2026年的生产运行时配对。Agno瞄准微秒级Agent实例化和无状态FastAPI后端。Mastra在Vercel AI SDK基底上发布Agent、工具、工作流、统一模型路由和复合存储。'
module: agent
related:
  - agent/Agent失败模式
  - agent/Agent循环
  - 'agent/AI-Scientist-v2自主研究'
  - agent/AlphaEvolve进化编码
prerequisites:
  - agent/概述与架构
---

# Agno与Mastra：生产运行时

> Agno（Python）和Mastra（TypeScript）是2026年的生产运行时配对。Agno瞄准微秒级Agent实例化和无状态FastAPI后端。Mastra在Vercel AI SDK基底上发布Agent、工具、工作流、统一模型路由和复合存储。

**类型：** 学习
**语言：** Python, TypeScript
**前置条件：** Phase 14 · 01 (Agent循环), Phase 14 · 13 (LangGraph)
**时间：** ~45分钟

## 学习目标

- 识别Agno的性能目标以及它们何时重要。
- 说出Mastra的三个原语——Agents、Tools、Workflows——以及支持的服务器适配器。
- 解释为什么无状态会话范围FastAPI后端是推荐的Agno生产路径。
- 为给定技术栈（Python优先 vs TypeScript优先）选择Agno vs Mastra。

## 问题所在

LangGraph、AutoGen、CrewAI是框架重的。想要"只要Agent循环，快速，在我的运行时中"的团队会选择Agno（Python）或Mastra（TypeScript）。两者都牺牲一些框架拥有的原语来换取原始速度和更紧密地适应周围技术栈。

## 核心概念

### Agno

- Python运行时，前身为Phi-data。
- "没有图、链或复杂模式——只有纯Python。"
- 文档中的性能目标：约2μs Agent实例化，约3.75 KiB每Agent内存，约23个模型提供商。
- 生产路径：无状态会话范围FastAPI后端。每个请求启动一个新Agent；会话状态存储在DB中。
- 原生多模态（文本、图像、音频、视频、文件）和Agent式RAG。

速度目标在你每秒有数千个短命Agent时重要（聊天扇入、评估管道）。当一个Agent运行10分钟时不太重要。

### Mastra

- TypeScript，构建在Vercel AI SDK上。
- 三个原语：**Agents**、**Tools**（Zod类型化）、**Workflows**。
- 统一模型路由器 — 94个提供商的3,300+模型（2026年3月）。
- 复合存储：记忆、工作流、可观测性到不同后端；大规模可观测性推荐ClickHouse。
- Apache 2.0，`ee/`目录在源可用企业许可证下。
- Express、Hono、Fastify、Koa的服务器适配器；一等Next.js和Astro集成。
- 发布Mastra Studio（localhost:4111）用于调试。
- 1.0版本（2026年1月）22k+ GitHub星标，300k+ 周npm下载。

### 定位

两者都不试图成为LangGraph。它们竞争于：

- **语言适配。** Agno用于Python优先团队；Mastra用于TypeScript优先。
- **运行时人体工程学。** Agno = 近零开销；Mastra = 与Vercel生态系统集成。
- **可观测性。** 两者都集成Langfuse/Phoenix/Opik（第24课），但Mastra Studio是第一方的。

### 何时选择哪个

- **Agno** — Python后端，许多短命Agent，强性能需求，FastAPI商店。
- **Mastra** — TypeScript后端，Next.js / Vercel部署，统一多提供商模型路由，Zod类型化工具。
- **LangGraph**（第13课）— 当持久状态和显式图推理比原始速度更重要时。
- **OpenAI / Claude Agent SDK** — 当你想要提供商的产品化形状时（第16-17课）。

### 这个模式哪里会出错

- **为性能而性能。** 因为"2μs"听起来好而选择Agno，而工作负载是每个请求一个慢Agent调用。开销不是瓶颈。
- **生态锁定。** Mastra的Vercel风格集成在Vercel上是加分项，在其他地方是减分项。
- **企业许可证混淆。** Mastra的`ee/`目录是源可用的，不是Apache 2.0。如果你计划分叉，请阅读许可证。

## 构建它

本课主要是比较性的——没有单个代码产物能公正地对待两个框架。参见`code/main.py`获取并排玩具：一个最小的"运行Agent、流式输出、持久化会话"流程实现两次（一次Agno形状，一次Mastra形状）。

运行：

```
python3 code/main.py
```

两条结构不同但功能等效的跟踪。

## 使用它

- **Agno** — 需要速度和FastAPI形状的Python后端。
- **Mastra** — 有多提供商和工作流原语的TypeScript后端。
- 两者都提供第一方可观测性钩子。两者都集成Langfuse。

## 发布它

`outputs/skill-runtime-picker.md`基于技术栈、延迟预算和运营形态选择Agno、Mastra、LangGraph或提供商SDK。

## 练习

1. 阅读Agno文档。将stdlib ReAct循环（第01课）移植到Agno。什么消失了？什么保留了？
2. 阅读Mastra文档。将相同循环移植到Mastra。工具类型化有什么变化（Zod vs 无）？
3. 基准测试：在你的技术栈上测量Agent实例化延迟。Agno的2μs对你的工作负载重要吗？
4. 设计迁移：如果你一直在Python中运行CrewAI，转移到Agno会破坏什么？
5. 阅读Mastra的`ee/`许可证条款。什么限制会影响开源分叉？

## 关键术语

| 术语           | 人们常说的                          | 实际含义                                |
| -------------- | ----------------------------------- | --------------------------------------- |
| Agno           | "快速Python Agent"                  | 无状态会话范围Agent运行时               |
| Mastra         | "Vercel AI SDK上的TypeScript Agent" | Agents + Tools + Workflows + 模型路由器 |
| 统一模型路由器 | "多提供商访问"                      | 94个提供商3,300+模型的单一客户端        |
| 复合存储       | "多后端"                            | 记忆/工作流/可观测性各自到不同存储      |
| Mastra Studio  | "本地调试器"                        | localhost:4111 UI用于内省Agent          |
| 源可用         | "非OSS"                             | 许可证允许源码阅读但限制商业使用        |

## 延伸阅读

- [Agno Agent Framework文档](https://www.agno.com/agent-framework) — 性能目标、FastAPI集成
- [Mastra文档](https://mastra.ai/docs) — 原语、服务器适配器、模型路由器
- [LangGraph概述](https://docs.langchain.com/oss/python/langgraph/overview) — 有状态图替代
- [Comet Opik](https://www.comet.com/site/products/opik/) — Mastra集成引用的可观测性比较
