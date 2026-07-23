---
title: '验证门 — Agent不能自己打分'
description: 构建确定性验证门，组合规则报告、范围报告、反馈记录和diff，产出任务完成裁决
module: agent
difficulty: intermediate
tags:
  - 验证门
  - 确定性检查
  - 阻止级
  - 覆盖日志
related:
  - agent/心智理论与涌现协调
  - agent/心智社会与辩论
  - agent/有界自改进设计
  - 'agent/语音Agent-Pipecat与LiveKit'
prerequisites:
  - agent/概述与架构
---

# 验证门 — Agent不能自己打分

> Agent不能将自己的工作标记为完成。验证门读取作用域契约、反馈日志、规则报告和diff，回答一个单一问题：这个任务真的完成了吗？如果门说不，任务就没有完成，无论聊天说什么。

**类型：** 构建
**语言：** Python（标准库）
**前置条件：** Phase 14 · 33（规则），Phase 14 · 36（范围），Phase 14 · 37（反馈）
**时间：** ~55分钟

## 学习目标

- 将验证门定义为工作台工件上的确定性函数。
- 组合规则报告、范围报告、反馈记录和diff为单一裁决。
- 发出审查Agent和CI都可以读取的 `verification_report.json`。
- 在任何阻止级失败上拒绝推进任务，无例外。

## 问题所在

Agent太容易声明成功。三种失败形状主导：

- "看起来不错。" 模型读取自己的diff并决定它是正确的。
- "测试通过了。" 充满信心地说。没有测试实际运行的记录。
- "验收满足。" 验收标准被宽松解释为"任何类似完成的东西"。

工作台修复是一个单一验证门，读取Agent已经产生的工件并做出判断。门是确定性的。门在版本控制中。门连接到CI。Agent无法贿赂它。

## 核心概念

### 门检查什么

| 检查                               | 来源工件                | 严重性     |
| ---------------------------------- | ----------------------- | ---------- |
| 所有验收命令已运行                 | `feedback_record.jsonl` | 阻止       |
| 所有验收命令退出零                 | `feedback_record.jsonl` | 阻止       |
| 范围检查无禁止写入                 | `scope_report.json`     | 阻止       |
| 范围检查无范围外写入               | `scope_report.json`     | 阻止或警告 |
| 所有阻止级规则通过                 | `rule_report.json`      | 阻止       |
| 反馈中无 `null` 退出码             | `feedback_record.jsonl` | 阻止       |
| 触及文件匹配 `scope.allowed_files` | 两者                    | 警告       |

`warn` 发现注释裁决；`block` 发现阻止 `passed: true`。

### 确定性，不是概率性

门必须每次为相同工件集产生相同裁决。无LLM评判。LLM评判属于审查者侧（Phase 14 · 39），那里目标是定性评估，不是状态。

### 一个报告，一个路径

门每个任务关闭发出一个 `verification_report.json`，写入 `outputs/verification/<task_id>.json`。CI消费相同路径。不同路径的多个门分叉真相来源。

### 无例外拒绝

阻止级发现不能被Agent覆盖。它们只能被人类覆盖，带有记录的 `override_reason` 和 `overridden_by` 用户id。覆盖是签名变更，不是Agent决策。

### 生产模式

- **纵深防御，不是单一门。** 预提交钩子 -> CI状态检查 -> 工具前认证钩子 -> 合并前门。每层是确定性的，所以一层的失败被下一层捕获。
- **确定性检查防御，模型评判仅用于细微差别。** 可验证奖励（单元测试、Schema检查、退出码）回答"代码是否解决了问题？" — LLM评分标准回答"代码是否可读、安全、风格一致？"门运行第一类；审查者运行第二类。
- **签名覆盖日志，不是Slack线程。** 每次覆盖在 `outputs/verification/overrides.jsonl` 中发出一行：时间戳、发现代码、原因、签名用户、当前HEAD提交。
- **覆盖率下限作为一等检查。** `coverage_report.json` 馈入 `coverage_floor`（默认80%）检查。如果测量覆盖率低于下限或低于上一次合并的下限超过1个百分点，门失败。
- **`--strict` 模式将警告提升为阻止。** 对于发布分支、阻断发布的PR或事件后分类，`--strict` 使每个警告成为硬性失败。

## 实践

`code/main.py`实现：每个输入工件的加载器、`verify(task_id, artifacts) -> VerdictReport` 纯函数、打印器，以及三个任务场景（干净通过、范围蔓延、缺少验收）的演示。

## 交付

`outputs/skill-verification-gate.md`将门连接到特定项目：哪些验收命令馈入它、哪些规则是阻止级、哪些范围外写入被容忍、覆盖审计日志如何存储。

## 练习

1. 添加 `coverage_floor` 检查：测试命令必须产生至少80%覆盖率的报告。
2. 支持将每个 `warn` 提升为 `block` 的 `--strict` 模式。文档化严格模式是正确默认值的情况。
3. 使门除了JSON之外还产生Markdown摘要。辩护哪些字段属于摘要。
4. 添加 `time_since_last_human_touch` 检查：人类按键60秒内编辑的任何文件免于范围外标记。
5. 在你产品的真实Agent diff上运行门。多少发现是真实的，多少是噪音？

## 关键术语

| 术语         | 人们怎么说           | 实际含义                                              |
| ------------ | -------------------- | ----------------------------------------------------- |
| 验证门       | "阻止事物的检查"     | 工作台工件上的确定性函数产生通过/失败裁决             |
| 阻止级       | "硬性失败"           | 阻止 `passed: true` 并需要签名覆盖的发现              |
| 覆盖日志     | "为什么我们让它通过" | 带原因和用户id的签名条目，由审查审计                  |
| 验收命令     | "证明"               | 零退出意味着 `done` 的shell命令                       |
| 一个报告路径 | "真相来源"           | `outputs/verification/<task_id>.json`，CI和人类都消费 |

## 延伸阅读

- [Anthropic, Harness design for long-running application development](https://www.anthropic.com/engineering/harness-design-long-running-apps)
- [microservices.io, GenAI dev platform: guardrails](https://microservices.io/post/architecture/2026/03/09/genai-development-platform-part-1-development-guardrails.html)
- [logi-cmd/agent-guardrails](https://github.com/logi-cmd/agent-guardrails) — 范围+变异测试门
