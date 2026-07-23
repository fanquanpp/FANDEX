---
title: 'LLM的FinOps — 单位经济学与多租户归属'
description: 理解传统FinOps在LLM支出上的失效和2026年三维度归属方案
module: 'ai-engineering'
difficulty: intermediate
tags:
  - FinOps
  - 单位经济学
  - 多租户
  - 成本归属
  - 'kill switch'
  - token层
related:
  - 'ai-engineering/Linux与AI'
  - 'ai-engineering/LLM-API负载测试'
  - 'ai-engineering/LLM功能AB测试'
  - 'ai-engineering/LLM可观测性与评估仪表板'
prerequisites:
  - 'ai-engineering/机器学习概述'
---

# LLM的FinOps — 单位经济学与多租户归属

> 传统FinOps在LLM支出上失效。成本是token交易，非资源运行时间。标签不映射——API调用是交易，非资产。工程决策(prompt设计、上下文窗口、输出长度)是财务决策。2026年手册有三个归属维度从第一天开始埋点：每用户(`user_id`)用于席位定价和扩展，每任务(`task_id` + `route`)用于产品面成本和优先级，每租户(`tenant_id`)用于单位经济学和续约。四个token层——prompt、工具、记忆、响应——一个桶隐藏花费。多租户产品的执行阶梯：每租户速率限制(2-3x预期峰值，明确429+retry-after)；每日支出上限(1.5-3x合同上限；触发速率收紧+警报)；kill switch在支出z-score > 4(自动暂停+页面on-call)。归属模式：标签聚合、遥测连接器(追踪ID→计费；最高准确度)、采样外推、模型分配、事件溯源、实时流。单位指标：每已解决查询成本、每生成制品成本——不是$/M token。追溯标签总是遗漏；在请求创建时埋点。

**类型:** 学习
**语言:** Python (stdlib, toy成本归属模拟器带kill switch)
**前置知识:** Phase 17 · 13 (可观测性), Phase 17 · 14 (缓存)
**时间:** ~60分钟

## 学习目标

- 说出三个归属维度：每用户、每任务、每租户。
- 描述四个token层：prompt、工具、记忆、响应。
- 设计多租户执行阶梯：速率限制→每日上限→kill switch。
- 解释为什么单位指标(每已解决查询成本)优于$/M token。

## 问题

传统FinOps按资源运行时间归属成本。LLM成本是token交易——每次API调用是独立交易。标签不映射因为API调用不是资产。工程决策(prompt长度、输出长度)直接影响成本。

## 概念

### 三个归属维度

1. 每用户(`user_id`)：席位定价和扩展。
2. 每任务(`task_id` + `route`)：产品面成本和优先级。
3. 每租户(`tenant_id`)：单位经济学和续约。

### 四个token层

- Prompt token：输入prompt成本。
- 工具token：工具调用和响应成本。
- 记忆token：上下文/历史成本。
- 响应token：输出成本。

一个桶隐藏花费。分开追踪。

### 执行阶梯

1. 速率限制：每租户2-3x预期峰值。明确429+retry-after。
2. 每日支出上限：1.5-3x合同上限。触发速率收紧+警报。
3. Kill switch：支出z-score > 4。自动暂停+页面on-call。

### 单位指标

- 每已解决查询成本。
- 每生成制品成本。
- 不是$/M token(那是提供商指标，不是产品指标)。

### 归属模式

- 标签聚合：最简单，最低准确度。
- 遥测连接器：追踪ID→计费。最高准确度。
- 采样外推：统计估算。
- 模型分配：基于模型参数分配。
- 事件溯源：完整审计追踪。
- 实时流：即时归属。

## 实践

`code/main.py`模拟成本归属带kill switch。

## 输出

本课程产生`outputs/skill-finops-attribution-plan.md`。给定产品，设计三维度归属和执行阶梯。

## 练习

1. 设计归属：SaaS产品，3个租户，5个功能。每功能每租户成本。
2. 四个token层如何影响成本？哪个通常最贵？
3. 设计kill switch：z-score > 4触发什么？如何恢复？
4. 为什么"$/M token"是错误单位指标？提出更好的。
5. 追溯标签为什么总是遗漏？如何在请求创建时埋点？

## 关键术语

| 术语        | 常见说法     | 实际含义                           |
| ----------- | ------------ | ---------------------------------- |
| Token层     | "四层成本"   | prompt/工具/记忆/响应四层token成本 |
| 执行阶梯    | "三步控制"   | 速率限制→每日上限→kill switch      |
| Kill switch | "紧急停止"   | 支出异常时自动暂停+页面on-call     |
| 单位指标    | "产品成本"   | 每已解决查询/每生成制品成本        |
| 遥测连接器  | "追踪到计费" | 追踪ID映射到计费；最高准确度归属   |

## 延伸阅读

- [FinOps Foundation](https://www.finops.org/)
- [LLM Cost Optimization Guide](https://docs.anthropic.com/en/docs/about-claude/pricing)
