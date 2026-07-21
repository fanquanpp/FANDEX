---
title: '最小Agent工作台 — 三个文件'
description: '构建最小可行Agent工作台：agent-rules.md、agent_state.json、task_board.json，实现规则即代码和状态持久化'
module: agent
difficulty: intermediate
tags:
  - Agent工作台
  - 规则即代码
  - 状态持久化
  - 任务板
related:
  - agent/自精炼与CRITIC
  - agent/自主编码Agent格局
  - agent/作用域契约
  - agent/A2A协议
prerequisites:
  - agent/概述与架构
---

# 最小Agent工作台 — 三个文件

> 七种失败模式需要七种表面。最小可行工作台用三个文件交付其中五种：`agent-rules.md`（规则）、`agent_state.json`（状态）、`task_board.json`（任务）。本课构建它，以便第33-40课有东西可以扩展。

**类型：** 构建
**语言：** Python（标准库）
**前置条件：** Phase 14 · 31（为何模型失败）
**时间：** ~60分钟

## 学习目标

- 实现三文件最小工作台：规则、状态、任务板。
- 编写Agent在启动时读取并在每个决策点检查的规则。
- 构建带验证和原子写入的状态管理器。
- 构建带状态转换的任务板。

## 问题所在

没有工作台，Agent每次会话从零开始。没有规则检查，没有持久状态，没有任务跟踪。每个会话重新发现项目结构、重新阅读相同文件、重新犯相同错误。三个文件修复了最紧急的五种失败模式。

## 核心概念

### 三个文件

1. **`agent-rules.md`** — Agent在启动时读取并在每个决策点检查的规则。规则是可执行的约束，不是建议。

2. **`agent_state.json`** — 跨会话持久化的状态。活跃任务、触及的文件、假设、阻碍、下一步行动。

3. **`task_board.json`** — 带状态转换的任务列表：`todo` -> `in_progress` -> `done` / `blocked`。

### 规则即代码

规则不是提示中的段落。规则是Agent在行动前检查的文件。区别：

- 提示规则："小心不要触及配置文件。"（建议）
- 文件规则：Agent读取 `agent-rules.md`，看到"不要触及 `config/`"，检查其提议动作，拒绝。 （契约）

### 状态持久化

状态在会话结束和下一个会话开始之间存活。下一个会话读取状态并从上次停止的地方继续，而不是从零开始。

### 任务板

任务板跟踪工作。每个任务有：id、目标、状态、验收标准。Agent一次选择一个任务，工作直到完成，标记为完成。

### 原子写入

状态写入必须存活部分失败：写入临时文件，fsync，重命名覆盖目标。状态文件是真相来源；半写入的文件比没有文件更糟。

## 实践

`code/main.py`实现三文件工作台：

- `agent-rules.md`，带有示例规则（范围限制、文件限制、验证要求）。
- `StateManager`，带有加载、验证、变更和原子提交。
- `TaskBoard`，带有状态转换和一次一个活跃任务。
- 一个演示，展示Agent启动、读取规则、选择任务、更新状态和提交。

## 交付

`outputs/skill-minimal-workbench.md`为任何项目搭建三文件工作台。

## 练习

1. 添加一条规则："在声称完成之前运行测试。"实现检查。
2. 扩展状态以跟踪"此会话触及的文件"。在范围检查中使用它。
3. 添加一个 `blocked` 任务状态，带有原因字段。Agent如何解除阻塞？
4. 实现原子写入：写入临时文件，fsync，重命名。测试崩溃恢复。
5. 添加第二个Agent读取相同状态。什么会出问题？如何修复？

## 关键术语

| 术语             | 人们怎么说      | 实际含义                       |
| ---------------- | --------------- | ------------------------------ |
| 工作台           | "Agent基础设施" | Agent运行所需的表面            |
| agent-rules.md   | "规则文件"      | Agent检查的可执行约束          |
| agent_state.json | "状态文件"      | 跨会话的持久状态               |
| task_board.json  | "任务板"        | 带状态转换的任务列表           |
| 原子写入         | "安全写入"      | 临时文件 + fsync + 重命名      |
| 规则即代码       | "文件中的规则"  | 磁盘上的契约，不是提示中的建议 |

## 延伸阅读

- [Anthropic, Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- [Anthropic, Harness design for long-running application development](https://www.anthropic.com/engineering/harness-design-long-running-apps)
- [LangChain, The Anatomy of an Agent Harness](https://blog.langchain.com/the-anatomy-of-an-agent-harness/)
