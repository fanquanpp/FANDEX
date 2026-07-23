---
title: 仓库记忆与持久状态
description: 构建Schema优先的状态管理器，实现原子写入、验证拒绝和迁移支持，使Agent状态跨会话持久化
module: agent
difficulty: intermediate
tags:
  - 仓库记忆
  - 状态管理
  - 原子写入
  - Schema验证
  - 迁移
related:
  - agent/并行群体网络
  - agent/并行与流式工具调用
  - agent/层级架构
  - agent/成本治理器与预算终止
prerequisites:
  - agent/概述与架构
---

# 仓库记忆与持久状态

> 聊天历史是易失的。仓库是持久的。工作台将Agent状态存储在版本化文件中，使下一个会话、下一个Agent和下一个审查者都从相同的真相来源读取。

**类型：** 构建
**语言：** Python（标准库 + `jsonschema` 可选）
**前置条件：** Phase 14 · 32（最小工作台）
**时间：** ~60分钟

## 学习目标

- 定义什么属于仓库记忆，什么属于聊天历史。
- 为 `agent_state.json` 和 `task_board.json` 编写JSON Schema。
- 构建加载、验证、变更和原子持久化状态的状态管理器。
- 使用Schema在坏写入损坏工作台之前拒绝它们。

## 问题所在

Agent完成一个会话。聊天关闭。下一个会话打开并问从哪里开始。模型说"让我检查文件"，读取过时笔记，并重新做已经完成的工作。或者更糟，它重写了一个已完成的文件，因为没有人告诉它文件已完成。

工作台修复是仓库记忆：状态存在于仓库中的JSON文件中，在Schema下写入，原子持久化，在代码审查中diff友好。聊天是瞬态feed；仓库是记录系统。

## 核心概念

### 什么属于仓库记忆

| 属于             | 不属于             |
| ---------------- | ------------------ |
| 活跃任务id       | 原始聊天记录       |
| 此会话触及的文件 | Token级推理追踪    |
| Agent做出的假设  | "用户似乎很沮丧"   |
| 未解决的阻碍     | 采样的补全         |
| 下一步行动       | 供应商特定的模型id |

测试是持久性：这在三个月后的CI重跑中是否有用？如果是，仓库。如果否，遥测。

### Schema优先状态

JSON Schema是契约。没有它，每个Agent发明新字段，每个审查者学习新形状，每个CI脚本必须特殊处理过去版本。有了它，坏写入是被拒绝的写入。

Schema覆盖：必需键、允许的 `status` 值、禁止值（例如数组的 `null`）、模式约束（任务id匹配 `T-\d{3,}`）、版本字段用于迁移。

### 原子写入

状态写入需要存活部分失败：写入临时文件，fsync，重命名覆盖目标。状态文件是真相来源；半写入的文件比没有文件更糟。

### 迁移

当Schema变更时，在Schema升级旁边发布迁移脚本。状态文件携带 `schema_version` 字段；管理器拒绝加载它无法迁移的版本文件。

### 生产模式

- **原子临时-重命名不是可选的。** 2026年3月Hive项目bug报告清楚地记录了失败模式：`state.json` 通过 `write_text()` 写入，异常被捕获并静默。部分写入导致会话针对损坏状态恢复，没有信号。修复始终是：`tempfile.mkstemp` 在目标同一目录，写入，`fsync`，`os.replace`。
- **每个非幂等工具调用的幂等键。** 如果Agent在调用工具后但在检查点结果之前崩溃，恢复重试工具调用。读取安全；邮件、数据库插入、文件上传危险。模式：在执行前将每个工具调用ID记录到 `pending_calls.jsonl`。重试时，检查ID；如果存在，跳过调用并使用缓存结果。
- **将大型工件与状态分开。** 不要在 `agent_state.json` 中存储CSV、长记录或生成文件。将工件保存为单独文件（或上传到对象存储），仅在状态中保留路径。
- **审计用事件溯源，恢复用快照。** 每次变更追加到事件日志（`state.events.jsonl`）；定期快照到 `state.json`。恢复读取快照，然后重放快照时间戳之后的任何事件。

## 实践

`code/main.py`实现：`agent_state.schema.json` 和 `task_board.schema.json`、标准库验证器、带原子临时-重命名写入的 `StateManager`，以及跨两轮变更、持久化、重新加载和证明往返的演示。

## 交付

`outputs/skill-state-schema.md`生成项目特定的JSON Schema对（状态+板）、连接到原子写入的Python `StateManager`，以及迁移脚手架。

## 练习

1. 添加 `last_human_touch` 时间戳。拒绝人类编辑后五秒内的任何Agent写入。
2. 扩展验证器以支持 `oneOf`，使任务可以是构建任务或审查任务，带有不同的必需字段。
3. 添加 `schema_version` 字段并编写从v1到v2的迁移（将 `blockers` 重命名为 `risks`）。
4. 将存储后端从本地文件移动到SQLite。保持 `StateManager` API相同。
5. 对同一状态文件运行两个Agent，带有50毫秒写入竞争。出了什么问题，原子重命名如何拯救你？

## 关键术语

| 术语       | 人们怎么说   | 实际含义                                        |
| ---------- | ------------ | ----------------------------------------------- |
| 仓库记忆   | "笔记文件"   | 存储在仓库中跟踪文件中的状态，在Schema下        |
| Schema优先 | "验证输入"   | 在写入者之前定义契约，拒绝漂移                  |
| 原子写入   | "只是重命名" | 写入临时文件，fsync，重命名，使部分失败无法损坏 |
| 迁移       | "Schema升级" | 将vN状态转换为v(N+1)状态的脚本                  |
| 记录系统   | "真相来源"   | 工作台视为权威的工件                            |

## 延伸阅读

- [JSON Schema specification](https://json-schema.org/specification.html)
- [LangGraph checkpointers](https://langchain-ai.github.io/langgraph/concepts/persistence/)
- [Letta memory blocks](https://docs.letta.com/concepts/memory)
- [Fast.io, AI Agent State Checkpointing](https://fast.io/resources/ai-agent-state-checkpointing/)
