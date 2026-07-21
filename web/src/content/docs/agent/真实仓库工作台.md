---
title: '真实仓库工作台 — 前后对比报告'
description: 在真实代码库上对比仅提示vs工作台引导的Agent运行，用数据证明工作台工程的价值
module: agent
difficulty: intermediate
tags:
  - 工作台对比
  - 前后报告
  - 实证数据
  - 基准测试
related:
  - agent/长时间范围Agent
  - agent/长时间运行Agent持久执行
  - agent/指令作为可执行约束
  - agent/终止开关与金丝雀令牌
prerequisites:
  - agent/概述与架构
---

# 真实仓库工作台 — 前后对比报告

> 十一课的表面如果不能在真实代码库中存活就毫无价值。本课在小型示例应用上运行相同任务两次：仅提示 vs 工作台引导。数据说话。

**类型：** 构建
**语言：** Python（标准库）
**前置条件：** Phase 14 · 32到14 · 40
**时间：** ~60分钟

## 学习目标

- 将七种工作台表面汇聚到小型应用上。
- 运行相同任务两次（仅提示和工作台引导）并测量五个结果。
- 阅读前后报告并决定哪些表面给了最大杠杆。
- 为"但我的模型够好了"的反对意见辩护工作台。

## 问题所在

玩具任务上的演示说服不了任何人。工作台的案例是在真实感的任务在真实感的仓库上以更少失败、更少回滚和下一个会话可以使用的包投入生产时建立的。

## 核心概念

### 五个测量结果

| 结果                  | 为何重要                       |
| --------------------- | ------------------------------ |
| `tests_actually_run`  | 大多数"测试通过"声明无法验证   |
| `acceptance_met`      | 证明目标的测试必须是运行的测试 |
| `files_outside_scope` | 范围蔓延是主导的静默失败       |
| `handoff_quality`     | 下一个会话为此付出代价或受益   |
| `reviewer_total`      | 门之上的定性判断               |

### 生产数据

- **Terminal Bench Top-30到Top-5，同一模型。** LangChain的Anatomy of an Agent Harness：编码Agent仅通过更改线束从30名外跃升至第5名。同一模型。不同表面。25名差距。
- **Vercel 80%到100%，通过删除工具。** Vercel报告删除80%的Agent工具将成功率从80%移动到100%。更小的工具表面，更清晰的范围，更少的失败方式。
- **Harvey 2倍准确性，仅通过线束。** 法律Agent通过线束优化将准确性翻倍，无模型变更。
- **88%的企业AI Agent项目未能投产。** preprints.org论文追踪失败到运行时，不是推理：过时状态、脆弱重试、过度增长的上下文、从中间错误恢复不良。
- **长上下文崩溃。** WebAgent基线40-50%成功率在长上下文条件下降至10%以下，主要来自无限循环和目标丢失。

## 实践

`code/main.py`针对相同示例应用固定装置编排两个管道。两个管道都是脚本化的（循环中无LLM），使测量可复现。脚本将比较写入 `before-after-report.md` 和 `comparison.json`。

## 交付

`outputs/skill-workbench-benchmark.md`是一个可移植的评估线束，针对项目自己的示例应用通过两个管道运行任何Agent产品并报告五个结果。

## 练习

1. 添加第六个结果：首次有意义编辑时间。你如何干净地测量它？
2. 在你代码库中的真实第二天任务上运行比较。工作台数字在哪里滑落？
3. 添加"假阴性"通过：仅提示更快的任务和工作台开销是真实成本。辩护仍然保留工作台。
4. 用真实LLM调用替换脚本"Agent"。哪些结果变得更嘈杂？
5. 编写针对非工程师的一页摘要。什么通过筛选？

## 关键术语

| 术语       | 人们怎么说   | 实际含义                         |
| ---------- | ------------ | -------------------------------- |
| 示例应用   | "玩具仓库"   | 足够小但真实感以锻炼所有七种表面 |
| 管道       | "工作流"     | Agent遵循的表面读/写有序序列     |
| 前后报告   | "收据"       | 你交给怀疑者的工件               |
| 假阴性     | "工作台过度" | 仅提示更快的任务；诚实列举有用   |
| 工作台基准 | "可靠性分数" | 在你代码库上运行比较的可移植线束 |

## 延伸阅读

- [LangChain, The Anatomy of an Agent Harness](https://blog.langchain.com/the-anatomy-of-an-agent-harness/)
- [MongoDB, The Agent Harness](https://www.mongodb.com/company/blog/technical/agent-harness-why-llm-is-smallest-part-of-your-agent-system)
- [preprints.org, Harness Engineering for Language Agents](https://www.preprints.org/manuscript/202603.1756)
