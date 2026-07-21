---
title: 个人AI导师自适应多模态与记忆
description: 'Khanmigo (Khan Academy)、Duolingo Max、Google LearnLM/Gemini for Education、Quizlet Q-Chat和Synthesis Tutor都在2026年大规模发布自适应多模态辅导。共同形态：苏格拉底策略(永不直接给答案)、每次交互后更新的学习者模型(贝叶斯知识追踪)、语音+文本+照片数学输入、课程图检索、间隔重复调度、年龄适宜内容的硬安全过滤器。'
module: 'ai-engineering'
difficulty: advanced
tags:
  - AI导师
  - 自适应学习
  - 苏格拉底策略
  - 知识追踪
  - 间隔重复
  - COPPA
related:
  - 'ai-engineering/概率与分布'
  - 'ai-engineering/感知机'
  - 'ai-engineering/合规框架'
  - 'ai-engineering/机器学习统计'
prerequisites:
  - 'ai-engineering/机器学习概述'
---

## 问题

自适应辅导曾经是教育技术研究小众。到2026年它是消费产品。Khanmigo部署在大多数美国学区。Duolingo Max达到数千万MAU。Google的LearnLM/Gemini for Education在Google Classroom中驱动辅导。Quizlet Q-Chat与闪卡并列。Synthesis Tutor以好奇孩子导师走红。共同元素：多模态输入（打字、说话、拍照方程）、苏格拉底教学法（先问后解释）、每次交互后更新的学习者模型和严格的年龄适宜安全。

你将为特定群体构建其中一个。测量标准是实际效能研究：10名学习者两周的前测和后测分数。语音循环必须感觉自然（顶点03子栈）。记忆必须尊重隐私。安全过滤器必须通过K-12的COPPA感知红队。

## 核心架构

### 苏格拉底策略

永不直接给答案。通过引导性问题帮助学生发现答案。错误是学习机会。

### 学习者模型

贝叶斯知识追踪风格。每次交互后更新对每个知识点的掌握估计。驱动个性化问题选择和间隔重复调度。

### 多模态输入

语音（ASR）、文本、照片数学（VLM解析手写方程）。

### 课程图

Postgres + Neo4j存储知识点依赖图。检索相关知识点用于个性化路径。

### 安全

COPPA合规：无13岁以下用户数据收集。年龄适宜内容过滤。红队测试安全边界。

## 关键术语

| 术语                       | 常见说法             | 实际含义                                 |
| -------------------------- | -------------------- | ---------------------------------------- |
| Socratic policy            | "苏格拉底策略"       | 通过引导问题而非直接答案教学             |
| Bayesian knowledge tracing | "贝叶斯知识追踪"     | 估计学生对每个知识点掌握程度的模型       |
| Spaced repetition          | "间隔重复"           | 按最优间隔复习以增强记忆                 |
| COPPA                      | "儿童在线隐私保护法" | Children's Online Privacy Protection Act |
| Learner model              | "学习者模型"         | 追踪学生知识状态的内部表示               |

## 延伸阅读

- Khanmigo (Khan Academy) — 自适应辅导
- Duolingo Max — 语言学习AI
- Google LearnLM — 教育AI
- Synthesis Tutor — 好奇孩子导师
