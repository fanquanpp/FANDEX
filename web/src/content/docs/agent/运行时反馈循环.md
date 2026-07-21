---
title: '运行时反馈循环 — 事实而非预测'
description: 构建反馈运行器，捕获命令输出为结构化记录，使Agent基于事实而非预测做出反应
module: agent
difficulty: intermediate
tags:
  - 反馈循环
  - 反馈运行器
  - 命令捕获
  - 确定性截断
related:
  - agent/有界自改进设计
  - 'agent/语音Agent-Pipecat与LiveKit'
  - agent/长时间范围Agent
  - agent/长时间运行Agent持久执行
prerequisites:
  - agent/概述与架构
---

# 运行时反馈循环 — 事实而非预测

> 不看到真实命令输出的Agent在猜测。反馈运行器将stdout、stderr、退出码和计时捕获为结构化记录，下一轮可以读取。然后Agent对事实做出反应，而不是对自己预测的事实做出反应。

**类型：** 构建
**语言：** Python（标准库）
**前置条件：** Phase 14 · 32（最小工作台），Phase 14 · 35（初始化脚本）
**时间：** ~50分钟

## 学习目标

- 区分运行时反馈和可观测性遥测。
- 构建包装shell命令并持久化结构化记录的反馈运行器。
- 确定性地截断大型输出，使循环保持在token预算内。
- 反馈缺失时拒绝推进循环。

## 问题所在

Agent说"正在运行测试。"下一条消息说"所有测试通过。"现实是没有测试运行。Agent想象输出，或运行了命令但从未读取结果，或读取了结果并静默截断了失败行。

反馈运行器消除了这个差距。每个命令通过运行器。每个记录携带命令、捕获的stdout和stderr、退出码、挂钟持续时间和一行Agent注释。Agent在下一轮读取记录。验证门在任务结束时读取记录。

## 核心概念

### 反馈记录包含什么

| 字段          | 为何重要                  |
| ------------- | ------------------------- |
| `command`     | 确切argv，无shell扩展惊喜 |
| `stdout_tail` | 最后N行，确定性截断       |
| `stderr_tail` | 最后N行，与stdout分开     |
| `exit_code`   | 明确的成功信号            |
| `duration_ms` | 显示慢探测和失控进程      |
| `started_at`  | 重放时间戳                |
| `agent_note`  | Agent关于期望的一行注释   |

### 截断是确定性的

50 MB的日志会摧毁循环。运行器用 `...truncated N lines...` 标记截断头部和尾部，确定性使相同输出始终产生相同记录。不采样；Agent需要看到的部分（最终错误、最终摘要）在尾部。

### 反馈 vs 遥测

遥测（Phase 14 · 23，OTel GenAI约定）是供人类操作员跨时间审查运行的。反馈是供本次运行的下一轮使用的。它们共享字段但存在于不同文件中，具有不同保留期。

### 反馈缺失时拒绝推进

如果运行器在捕获退出码之前出错，记录携带 `exit_code: null` 和 `error: <reason>`。Agent循环必须拒绝在 `null` 退出码上声称成功。没有退出码，没有进展。

### 生产模式

- **写入时脱敏，不是读取时。** 运行器在JSONL追加之前发布脱敏通道：剥离匹配 `^Bearer `、`password=`、`api[_-]?key=`、`AKIA[0-9A-Z]{16}`、`xox[baprs]-` 的行。
- **轮换策略，不是单个文件。** 将 `feedback_record.jsonl` 限制为每文件1 MB；溢出时轮换到 `.1`、`.2`，丢弃 `.5`。
- **重试链的父命令id。** 每个记录获得 `command_id`；重试携带 `parent_command_id` 指向前一次尝试。

## 实践

`code/main.py`实现：`run_with_feedback(command, agent_note)` 包装 `subprocess.run`，捕获stdout/stderr/exit/duration，确定性截断，追加到 `feedback_record.jsonl`，以及运行三个命令（成功、失败、慢速）的演示。

## 交付

`outputs/skill-feedback-runner.md`生成项目特定的 `run_with_feedback.py`，带有正确的截断预算、连接到工作台的JSONL写入器和Agent每轮读取的加载器。

## 练习

1. 为每个记录添加 `cwd` 字段，使从不同目录运行的相同命令可区分。
2. 添加脱敏步骤，剥离匹配 `^Bearer ` 或 `password=` 的行。在固定记录上测试。
3. 通过轮换到 `.1`、`.2` 文件将总 `feedback_record.jsonl` 大小限制为1 MB。辩护轮换策略。
4. 添加 `parent_command_id` 使重试链可见。
5. 将JSONL管道到一个小型TUI，高亮最新的非零退出码。

## 关键术语

| 术语      | 人们怎么说       | 实际含义                                      |
| --------- | ---------------- | --------------------------------------------- |
| 反馈记录  | "运行日志"       | 带命令、输出、退出、持续时间的结构化JSONL条目 |
| 尾部截断  | "修剪日志"       | 确定性头部+尾部捕获使记录适合token预算        |
| 空值拒绝  | "缺失数据时阻止" | `exit_code` 为null时循环不得推进              |
| Agent注释 | "期望标签"       | Agent在读取结果之前写入的一行预测             |
| 遥测分离  | "两个日志文件"   | 反馈用于下一轮，遥测用于操作员                |

## 延伸阅读

- [OpenTelemetry GenAI semantic conventions](https://opentelemetry.io/docs/specs/semconv/gen-ai/)
- [Anthropic, Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
