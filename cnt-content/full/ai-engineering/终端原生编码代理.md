---
title: 终端原生编码代理
description: '2026年编码代理的架构已定型：TUI线束、有状态计划、沙盒工具面、计划-行动-观察循环。从CLI到Pull Request端到端构建，在SWE-bench Pro上测量。难点不在模型调用而在工具循环、沙盒和成本上限。'
module: 'ai-engineering'
difficulty: advanced
tags:
  - 编码代理
  - TUI
  - 'SWE-bench'
  - 工具循环
  - 沙盒
  - '计划-行动-观察'
related:
  - 'ai-engineering/支持向量机'
  - 'ai-engineering/终端与Shell'
  - 'ai-engineering/自托管服务引擎选择'
  - 'ai-engineering/自主研究代理AI-Scientist级'
prerequisites:
  - 'ai-engineering/机器学习概述'
---

## 问题

编码代理在2026年成为主导AI应用类别。Claude Code (Anthropic)、带Composer 2和Agent Tabs的Cursor 3、Amp (Sourcegraph)、OpenCode (112k stars)、Factory Droids和Google Jules都发布相同架构的变体：终端线束、权限化工具面、沙盒和围绕前沿模型的计划-行动-观察循环。前沿很窄——Live-SWE-agent在SWE-bench Verified上以Opus 4.5达到79.2%——但工程工艺很广。大多数失败模式不是模型错误，而是工具循环不稳定、上下文中毒、失控的token成本和破坏性文件系统操作。

你无法从外部推理这些代理。你必须构建一个，观察循环在第47轮因ripgrep返回8MB匹配而崩溃，然后重建截断层。这就是这个顶点项目的意义。

## 核心架构

### 线束循环

计划-行动-观察循环是编码代理的核心原语。每轮：

1. **计划。** 模型审查上下文（问题、文件树、先前操作）并决定下一步。
2. **行动。** 调用工具（文件读取、编辑、shell命令、搜索）。
3. **观察。** 工具返回输出；循环追加到上下文。

关键工程决策：上下文窗口管理（50轮后如何避免中毒）、工具输出截断（8MB的ripgrep输出必须被总结）、错误恢复（当shell命令失败时如何重试）。

### 工具面

生产编码代理暴露的工具集收敛于：文件读写编辑、shell执行、搜索（ripgrep/grep）、代码智能（go-to-definition, references）。每个工具需要权限控制（只读vs读写）、输出大小限制和超时。

### 沙盒

代理在沙盒中执行代码。Docker容器是2026年的标准。沙盒必须：限制网络访问、限制文件系统写入、强制内存/CPU限制、提供可重现环境。

### 成本控制

50轮运行在Opus 4.5级别模型上可能消耗$10-50。成本上限是生产必需品。策略：每轮token预算、总运行预算、自动降级到更便宜模型。

## 评估

在SWE-bench Pro子集上测量。关键指标：解决率、平均轮数、平均token成本、工具调用成功率。

## 关键术语

| 术语              | 常见说法     | 实际含义                        |
| ----------------- | ------------ | ------------------------------- |
| TUI harness       | "终端线束"   | 管理工具循环的终端用户界面      |
| Plan-Act-Observe  | "PAO循环"    | 编码代理的核心执行循环          |
| Context poisoning | "上下文中毒" | 50+轮后上下文窗口被无关信息填满 |
| Tool surface      | "工具面"     | 代理可调用的工具集合            |
| Cost ceiling      | "成本上限"   | 单次运行的最大允许token支出     |

## 延伸阅读

- Claude Code (Anthropic) — 2026年交互式编码代理
- Live-SWE-agent — SWE-bench Verified 79.2%
- Cursor 3 with Composer 2 — IDE集成编码代理
- OpenCode — 开源终端编码代理
