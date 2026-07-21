---
title: '自主研究代理AI-Scientist级'
description: 'Sakana AI-Scientist-v2发表了完整论文，Agent Laboratory运行实验。2026年形态是计划-执行-验证树搜索：预算成本、沙盒代码执行、视觉反馈LaTeX编写器、自动化NeurIPS风格审稿人集成。构建一个，每篇论文$30内端到端运行，存活Sakana记录的沙盒逃逸红队。'
module: 'ai-engineering'
difficulty: advanced
tags:
  - 自主研究
  - 'AI-Scientist'
  - 树搜索
  - 沙盒
  - 自动化审稿
  - LaTeX
related:
  - 'ai-engineering/终端原生编码代理'
  - 'ai-engineering/自托管服务引擎选择'
  - 'ai-engineering/AI的SRE事件响应'
  - 'ai-engineering/AI网关比较'
prerequisites:
  - 'ai-engineering/机器学习概述'
---

## 问题

自主研究代理在2026年越过了阈值。Sakana AI的AI-Scientist-v2在Nature上发表了通过研讨会同行评审的生成论文。ShinkaEvolve (ICLR 2026)将这条线扩展到进化假设。AMD的Agent Laboratory发布了可重现轨迹。这些代理不是魔法——它们是在候选实验树上运行的计划-执行-验证循环，带成本上限、种子绑定沙盒和自动化审稿。工艺在循环、预算和安全故事中。

你通过在窄领域（例如100M参数transformer上的注意力稀疏消融）的种子想法上实现一个来学习循环。价值不在于第一次运行发现新东西。价值在于基础设施：树搜索、实验沙盒、编写-审稿循环、红队报告。

## 核心架构

### 计划-执行-验证循环

1. **计划。** 给定种子想法，生成实验计划树。
2. **执行。** 沙盒中运行实验，收集结果。
3. **验证。** 检查结果是否支持假设；决定分支或回溯。
4. **编写。** LaTeX编写器从结果生成论文草稿。
5. **审稿。** 自动化审稿人集成评分论文。

### 成本控制

每篇论文$30预算。策略：限制实验轮数、使用小模型进行草稿生成、大模型进行最终审稿。

### 安全

沙盒必须防止：网络访问、文件系统逃逸、无限循环。Sakana团队记录了沙盒逃逸失败；你的代理必须通过相同红队。

## 关键术语

| 术语                 | 常见说法         | 实际含义                   |
| -------------------- | ---------------- | -------------------------- |
| Plan-Execute-Verify  | "计划-执行-验证" | 研究代理的核心循环         |
| Tree search          | "树搜索"         | 在候选实验空间上的搜索     |
| Seed-bound sandbox   | "种子绑定沙盒"   | 可重现的隔离执行环境       |
| Writer-Reviewer loop | "编写-审稿循环"  | 论文生成和自动评审的迭代   |
| Cost cap             | "成本上限"       | 每篇论文的最大允许计算支出 |

## 延伸阅读

- Sakana AI-Scientist-v2 — Nature发表的自动研究
- ShinkaEvolve (ICLR 2026) — 进化假设生成
- AMD Agent Laboratory — 可重现研究轨迹
