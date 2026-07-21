---
title: 记忆块与睡眠时间计算
description: MemGPT在2024年成为Letta。2026年的演进添加了两个想法：模型可直接编辑的离散功能记忆块，以及在主Agent空闲时异步整合记忆的睡眠时间Agent。这是你将记忆扩展到单次对话之外的方式。
module: agent
related:
  - agent/基准测试WebArena与OSWorld
  - agent/计算机使用Agent
  - agent/记忆虚拟上下文与MemGPT
  - agent/技能库与终身学习
prerequisites:
  - agent/概述与架构
---

# 记忆块与睡眠时间计算（Letta）

> MemGPT在2024年成为Letta。2026年的演进添加了两个想法：模型可直接编辑的离散功能记忆块，以及在主Agent空闲时异步整合记忆的睡眠时间Agent。这是你将记忆扩展到单次对话之外的方式。

**类型：** 构建
**语言：** Python (stdlib)
**前置条件：** Phase 14 · 07 (MemGPT)
**时间：** ~75分钟

## 学习目标

- 说出Letta使用的三个记忆层（core、recall、archival）及各自的作用。
- 解释记忆块模式：Human块、Persona块和用户自定义块作为一等类型化对象。
- 描述睡眠时间计算是什么，为什么它不在关键路径上，以及为什么它可以运行比主Agent更强的模型。
- 实现一个脚本化的双Agent循环，主Agent提供响应，睡眠时间Agent在轮次之间整合块。

## 问题所在

MemGPT（第07课）解决了虚拟内存控制流。三个生产问题浮现：

1. **延迟。** 每个记忆操作都在关键路径上。如果Agent在用户等待时必须修剪、摘要或协调，尾部延迟爆炸。
2. **记忆腐烂。** 写入积累。矛盾的事实留下。检索淹没在过时内容中。
3. **结构丢失。** 扁平的archival存储无法表达"Human块始终在提示中；Persona块始终在提示中；Task块按会话交换"。

Letta（letta.com）是2026年的重写。记忆块使结构显式；睡眠时间计算将整合移出关键路径。

## 核心概念

### 三层

| 层       | 范围     | 存储位置       | 写入者                       |
| -------- | -------- | -------------- | ---------------------------- |
| Core     | 始终可见 | 主提示内       | Agent工具调用 + 睡眠时间重写 |
| Recall   | 对话历史 | 可检索         | 自动轮次日志                 |
| Archival | 任意事实 | 向量 + KV + 图 | Agent工具调用 + 睡眠时间摄入 |

Core是MemGPT的core。Recall是带被驱逐尾部的对话缓冲区。Archival是外部存储。这种拆分清理了MemGPT两层重载。

### 记忆块

块是core层的类型化、持久化、可编辑部分。原始MemGPT论文定义了两个：

- **Human块** — 关于用户的事实（姓名、角色、偏好、目标）。
- **Persona块** — Agent的自我概念（身份、语气、约束）。

Letta泛化为任意用户自定义块：用于当前目标的`Task`块，用于代码库事实的`Project`块，用于硬约束的`Safety`块。每个块有`id`、`label`、`value`、`limit`（字符上限）、`description`（让模型知道何时编辑它）。

块可通过工具面编辑：

- `block_append(label, text)`
- `block_replace(label, old, new)`
- `block_read(label)`
- `block_summarize(label)` — 压缩接近上限的块。

### 睡眠时间计算

2025年Letta的添加：在后台运行第二个Agent，不在关键路径上。睡眠时间Agent处理对话记录和代码库上下文，将`learned_context`写入共享块，并整合或使archival记录失效。

由此产生的特性：

- **无延迟成本。** 主响应不等待记忆操作。
- **允许更强模型。** 睡眠时间Agent可以是更昂贵、更慢的模型，因为它不受延迟约束。
- **自然整合窗口。** 在用户不等待时去重、摘要、使矛盾事实失效。

这种形状与人类工作方式匹配：你做任务，你睡一觉，长期记忆隔夜沉淀。

### Letta V1和原生推理

Letta V1（`letta_v1_agent`，2026）弃用`send_message`/心跳和内联`Thought:` token，改用原生推理。Responses API（OpenAI）和带扩展思考的Messages API（Anthropic）在单独通道上发出推理，跨轮次传递（生产中跨提供商加密）。控制循环仍然是ReAct。思维轨迹是结构性的，不是提示形状的。

### 这个模式哪里会出错

- **块膨胀。** 无限`block_append`快速达到上限。在写入即将超过上限之前接入块摘要器。
- **静默漂移。** 睡眠时间Agent重写块而主Agent从未注意到。对块进行版本控制并在跟踪中显示差异。
- **投毒整合。** 睡眠时间Agent将攻击者可达内容处理进core。第27课也适用于睡眠时间面。

## 构建它

`code/main.py`实现：

- `Block` — id、label、value、limit、description。
- `BlockStore` — CRUD + `near_limit(label)`辅助。
- 两个脚本Agent — `PrimaryAgent`服务一个轮次，`SleepTimeAgent`在轮次之间整合。
- 一个跟踪显示三轮对话带块写入，加上一次睡眠时间传递摘要块并使过时事实失效。

运行：

```
python3 code/main.py
```

记录显示拆分：主轮次快速并产生原始写入；睡眠传递压缩和清理。

## 使用它

- **Letta**（letta.com）作为参考实现。自托管或托管云。
- **Claude Agent SDK技能**作为块形状的知识——技能是Agent按需加载的命名、版本化、可检索的指令块。
- **自定义构建**适用于想要控制存储后端的团队。使用Letta API契约以便日后迁移。

## 发布它

`outputs/skill-memory-blocks.md`为任何运行时生成Letta形状的块系统，带睡眠时间钩子、安全规则和引用连接。

## 练习

1. 添加`block_summarize`工具，当`near_limit`返回true时用模型生成的摘要替换块值。哪个触发阈值最小化摘要调用和块溢出？
2. 在archival上实现睡眠时间去重：文本token重叠>90%的两条记录合并为一条。只在睡眠传递中做，从不在关键路径上。
3. 对块进行版本控制。每次写入记录旧值和差异。暴露`block_history(label)`以便运维可以调试"为什么Agent忘记了X"。
4. 将睡眠时间Agent视为不可信写入者。当它们触碰Persona或Safety块时，在提交前需要第二个Agent的审查。
5. 将示例移植到使用Letta API（`letta_v1_agent`）。块Schema有什么变化，原生推理如何改变跟踪形状？

## 关键术语

| 术语                     | 人们常说的       | 实际含义                               |
| ------------------------ | ---------------- | -------------------------------------- |
| 记忆块                   | "可编辑提示部分" | core记忆的类型化、持久化、LLM可编辑段  |
| Human块                  | "用户记忆"       | 关于用户的事实，固定在core中           |
| Persona块                | "Agent身份"      | 自我概念、语气、约束，固定在core中     |
| 睡眠时间计算             | "异步记忆工作"   | 第二个Agent在关键路径外做整合          |
| Core / Recall / Archival | "层"             | 三层记忆拆分：始终可见 / 对话 / 外部   |
| 块上限                   | "Cap"            | 每块的字符限制；强制摘要               |
| 原生推理                 | "思维通道"       | 提供商级推理输出，不是提示级`Thought:` |
| 学习上下文               | "睡眠输出"       | 睡眠时间Agent写入共享块的事实          |

## 延伸阅读

- [Letta, Memory Blocks博客](https://www.letta.com/blog/memory-blocks) — 块模式
- [Letta, Sleep-time Compute博客](https://www.letta.com/blog/sleep-time-compute) — 异步整合
- [Letta, Rearchitecting the Agent Loop](https://www.letta.com/blog/letta-v1-agent) — 原生推理重写
- [Packer等人, MemGPT (arXiv:2310.08560)](https://arxiv.org/abs/2310.08560) — 起源
