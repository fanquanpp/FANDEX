---
title: 作用域契约与任务边界
description: 构建作用域契约，定义允许文件、禁止文件、验收标准和回滚计划，实现范围蔓延的自动检测和审查
module: agent
difficulty: intermediate
tags:
  - 作用域契约
  - 范围蔓延
  - 任务边界
  - 回滚计划
related:
  - agent/自主编码Agent格局
  - agent/最小Agent工作台
  - agent/A2A协议
  - agent/A2A协议深入
prerequisites:
  - agent/概述与架构
---

# 作用域契约与任务边界

> 模型不知道工作在哪里结束。作用域契约是一个每任务文件，说明工作从哪里开始、在哪里结束，以及如果溢出如何回滚。契约将"保持在范围内"从愿望变为检查。

**类型：** 构建
**语言：** Python（标准库）
**前置条件：** Phase 14 · 32（最小工作台），Phase 14 · 33（规则即约束）
**时间：** ~50分钟

## 学习目标

- 编写Agent在任务开始时读取、验证者在任务结束时读取的作用域契约。
- 指定允许文件、禁止文件、验收标准、回滚计划和批准边界。
- 实现将diff与契约比较并标记违规的范围检查器。
- 使范围蔓延可见、自动和可审查。

## 问题所在

Agent会蔓延。任务是"修复登录bug"。diff触及登录路由、邮件助手、数据库驱动、README和发布脚本。每次触及都有当时的合理理由。合在一起，它们是一个与审查时不同的变更。

范围蔓延是Agent工作中最缺乏监控的失败模式，因为Agent真诚地叙述每一步。修复不是更严格的提示。修复是磁盘上的契约，说明承诺了什么，以及将结果与承诺比较的检查。

## 核心概念

### 作用域契约包含什么

| 字段                  | 目的                               |
| --------------------- | ---------------------------------- |
| `task_id`             | 链接到板上的任务                   |
| `goal`                | 审查者可以验证的一句话             |
| `allowed_files`       | Agent可以写入的glob                |
| `forbidden_files`     | Agent即使意外也不能触及的glob      |
| `acceptance_criteria` | 证明完成的测试命令或断言行         |
| `rollback_plan`       | 操作员在需要停止时可以执行的一段话 |
| `approvals_required`  | 需要明确人类签署的范围外动作       |

没有 `forbidden_files` 的契约是不完整的。负空间是契约的一半。

### Glob，不是原始路径

真实仓库会移动文件。将契约固定到glob（`app/**/*.py`、`tests/test_signup*.py`），使会话间的重构不会使契约无效。

### 回滚是范围的一部分

列出如何回滚迫使契约作者思考什么可能出错。你无法回滚的契约是不应该被批准的契约。

### 范围检查是diff检查

Agent写入diff。检查器读取diff、允许glob、禁止glob和运行的任何验收命令列表。每个违规是一个标记的发现，验证门可以拒绝。

### 两种高度的范围：功能列表和任务契约

任务契约限定一个任务。它不限定项目。Agent可以完美地停留在登录修复的契约内，但在下一轮决定项目还需要设置页面、暗模式切换和路由器重写。

第二种高度需要自己的原语：Agent在会话开始时读取的 `feature_list.json`。它是项目待办事项作为机器可读的有序文件。Agent选择一个 `status` 为 `todo` 的功能，将其 `id` 写入活跃作用域契约，并被禁止在同一会话中启动第二个功能。

两条规则使列表承重而非装饰。首先，"最多一个 `in_progress`"的不变量本身是一个启动检查。其次，功能列表是文件，不是聊天消息，因为聊天会滚出上下文，而文件跨会话和跨Agent持久化。

### 生产模式

- **违规预算，不是二进制失败。** `agent-guardrails` 发布每个任务的 `violationBudget`：预算内的轻微范围滑移作为警告显示；只有当预算超出时合并门才拒绝。
- **按路径族的严重性不对称。** `docs/**` 的范围外写入通常是 `warn`；`scripts/**`、`migrations/**`、`config/prod/**` 的范围外写入始终是 `block`。
- **文件预算旁边的时间和网络预算。** `time_budget_minutes` 限定挂钟时间；`network_egress` 允许列表防止Agent静默命中不属于任务的外部API。
- **多契约合并语义（最小权限）。** 当两个作用域契约适用时，合并是：**交集** `allowed_files`（两个契约都必须允许路径），**并集** `forbidden_files`（任一可以禁止），`time_budget_minutes` 是最严格的（最小值），`approvals_required` 累积。

## 实践

`code/main.py`实现：`scope_contract.json` schema、diff解析器、`scope_check` 返回 `(violations, in_scope, off_scope)`，以及两个演示运行（一个在范围内，一个蔓延）。

## 交付

`outputs/skill-scope-contract.md`为任务描述生成作用域契约和在CI中对每个Agent diff运行的glob感知检查器。

## 练习

1. 添加 `network_egress` 字段列出允许的外部主机。拒绝触及其他主机的运行。
2. 扩展检查器对 `docs/**` 软失败，对 `scripts/**` 硬失败。辩护不对称。
3. 使契约从 `goal` 字段使用静态规则集（无LLM）推导 `allowed_files`。第一个边缘情况出了什么问题？
4. 添加 `time_budget_minutes` 并在挂钟超过时拒绝继续。
5. 对同一diff运行两个契约。当两者都适用时，正确的合并语义是什么？

## 关键术语

| 术语       | 人们怎么说      | 实际含义                                |
| ---------- | --------------- | --------------------------------------- |
| 作用域契约 | "任务简报"      | 每任务JSON列出允许/禁止文件、验收、回滚 |
| 范围蔓延   | "它还触及了..." | 契约外文件在同一任务中变更              |
| 回滚计划   | "我们可以回滚"  | 操作员停止运行的一段话手册              |
| 批准边界   | "需要签署"      | 契约中列为需要明确人类批准的动作        |
| Diff检查   | "路径审计"      | 将触及文件与契约glob比较                |

## 延伸阅读

- [LangGraph human-in-the-loop interrupts](https://langchain-ai.github.io/langgraph/concepts/human_in_the_loop/)
- [logi-cmd/agent-guardrails](https://github.com/logi-cmd/agent-guardrails) — 违规预算、严重性层级
- [Augment Code, AI Spec Template](https://www.augmentcode.com/guides/ai-spec-template) — 三层边界系统
