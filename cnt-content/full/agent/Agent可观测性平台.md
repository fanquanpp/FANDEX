---
title: Agent可观测性平台
description: '三个开源Agent可观测性平台主导2026年。Langfuse（MIT）— 6M+安装/月，追踪 + 提示管理 + 评估 + 会话回放。Arize Phoenix（Elastic 2.0）— 深度Agent特定评估，RAG相关性，OpenInference自动仪器化。Comet Opik（Ap...'
module: agent
related:
  - agent/Agent工作台项目
  - agent/Agent经济体与声誉
  - agent/Agent失败模式
  - agent/Agent循环
prerequisites:
  - agent/概述与架构
---

# Agent可观测性：Langfuse、Phoenix、Opik

> 三个开源Agent可观测性平台主导2026年。Langfuse（MIT）— 6M+安装/月，追踪 + 提示管理 + 评估 + 会话回放。Arize Phoenix（Elastic 2.0）— 深度Agent特定评估，RAG相关性，OpenInference自动仪器化。Comet Opik（Apache 2.0）— 自动化提示优化，护栏，LLM评判幻觉检测。

**类型：** 学习
**语言：** Python (stdlib)
**前置条件：** Phase 14 · 23 (OTel GenAI)
**时间：** ~45分钟

## 学习目标

- 说出三个顶级开源Agent可观测性平台及其许可证。
- 区分各自最强的地方：Langfuse（提示管理 + 会话），Phoenix（RAG + 自动仪器化），Opik（优化 + 护栏）。
- 解释为什么89%的组织报告到2026年已有Agent可观测性。
- 实现一个带LLM评判评估的stdlib追踪到仪表板管道。

## 问题所在

OTel GenAI（第23课）给你Schema。你仍然需要摄取span、运行评估、存储提示版本和显示回归的平台。三个竞争者各自强调生命周期的不同部分。

## 核心概念

### Langfuse (MIT)

- 6M+ SDK安装/月，19k+ GitHub星标。
- 功能：追踪、带版本控制 + 游乐场的提示管理、评估（LLM作为评判者、用户反馈、自定义）、会话回放。
- 2025年6月：原商业模块（LLM-as-a-judge、标注队列、提示实验、Playground）在MIT下开源。
- 最强于：端到端可观测性加紧密的提示管理循环。

### Arize Phoenix (Elastic License 2.0)

- 更深的Agent特定评估：追踪聚类、异常检测、RAG检索相关性。
- 原生OpenInference自动仪器化。
- 与托管Arize AX配对用于生产。
- 无提示版本控制 — 定位为漂移/行为回归工具，与更广泛平台并行。
- 最强于：RAG相关性、行为漂移、异常检测。

### Comet Opik (Apache 2.0)

- 通过A/B实验的自动化提示优化。
- 护栏（PII编辑、主题约束）。
- LLM评判幻觉检测。
- Comet自身测量的基准：Opik日志 + 评估在23.44s vs Langfuse 327.15s（约14倍差距）— 将供应商基准视为方向性的。
- 最强于：优化循环、自动化实验、护栏执行。

### 行业数据

根据Maxim（2026年领域分析）：89%的组织已有Agent可观测性；质量问题是首要生产障碍（32%的受访者引用）。

### 选择一个

| 需求                    | 选择                                |
| ----------------------- | ----------------------------------- |
| 带提示管理的一体化      | Langfuse                            |
| 深度RAG评估 + 漂移      | Phoenix                             |
| 自动化优化 + 护栏       | Opik                                |
| 开放许可证，无ELv2      | Langfuse (MIT) 或 Opik (Apache 2.0) |
| Datadog / New Relic集成 | 任何 — 它们都导出OTel               |

### 这个模式哪里会出错

- **无评估策略。** 没有评估的追踪只是昂贵的日志。
- **无接地的自建LLM评判。** CRITIC模式（第05课）适用 — 评判者需要外部工具进行事实验证。
- **提示版本未与追踪关联。** 当生产回归时，你无法二分到导致它的提示。

## 构建它

`code/main.py`实现一个stdlib追踪收集器 + LLM评判评估器：

- 摄取GenAI形状的span。
- 按会话分组，标记失败运行（护栏触发、低置信度评估）。
- 一个脚本LLM评判器，按评分标准对Agent响应评分。
- 一个仪表板式摘要：失败率、顶级失败原因、评估分数分布。

运行：

```
python3 code/main.py
```

输出：每会话评估分数和失败分类，匹配Langfuse/Phoenix/Opik会显示的内容。

## 使用它

- **Langfuse**自托管或云；通过OTel或其SDK连接。
- **Arize Phoenix**自托管；自动仪器化OpenInference。
- **Comet Opik**自托管或云；自动化优化循环。
- **Datadog LLM Observability**用于已经运行Datadog的混合运维+ML团队。

## 发布它

`outputs/skill-obs-platform-wiring.md`选择平台并将追踪 + 评估 + 提示版本连接到现有Agent。

## 练习

1. 将一周的OTel追踪导出到Langfuse云（免费层）。哪些会话失败了？为什么？
2. 为你的领域编写LLM评判评分标准（事实正确性、语气、范围遵循）。在50条追踪上测试。
3. 比较Langfuse提示版本控制与Phoenix的追踪聚类。哪个更快告诉你什么坏了？
4. 阅读Opik的护栏文档。将PII编辑护栏连接到你的一个Agent运行。
5. 在你的语料库上对三者进行基准测试。忽略供应商发布的数字；测量你自己的。

## 关键术语

| 术语          | 人们常说的   | 实际含义                         |
| ------------- | ------------ | -------------------------------- |
| 追踪          | "Span收集器" | 摄取OTel / SDK span；按会话索引  |
| 提示管理      | "提示CMS"    | 与追踪关联的版本化提示           |
| LLM作为评判者 | "自动化评估" | 独立LLM按评分标准对Agent输出评分 |
| 会话回放      | "追踪回放"   | 逐步调试过去运行                 |
| RAG相关性     | "检索质量"   | 检索到的上下文是否匹配查询       |
| 追踪聚类      | "行为分组"   | 聚类相似运行用于漂移检测         |
| 护栏执行      | "日志时策略" | 对日志内容的PII/毒性/范围检查    |

## 延伸阅读

- [Langfuse文档](https://langfuse.com/) — 追踪、评估、提示管理
- [Arize Phoenix文档](https://docs.arize.com/phoenix) — 自动仪器化、漂移
- [Comet Opik](https://www.comet.com/site/products/opik/) — 优化 + 护栏
- [OpenTelemetry GenAI语义约定](https://opentelemetry.io/docs/specs/semconv/gen-ai/) — 三者都消费的Schema
