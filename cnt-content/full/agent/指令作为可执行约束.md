---
title: '指令作为可执行约束 — 规则即代码'
description: 将Agent规则从提示建议升级为磁盘上的可执行约束，实现启动检查、行动前检查和违规报告
module: agent
difficulty: intermediate
tags:
  - 可执行约束
  - 规则即代码
  - 启动检查
  - 行动前检查
related:
  - agent/长时间运行Agent持久执行
  - agent/真实仓库工作台
  - agent/终止开关与金丝雀令牌
  - agent/自动化对齐研究AAR
prerequisites:
  - agent/概述与架构
---

# 指令作为可执行约束 — 规则即代码

> 提示中的规则是建议。磁盘上的规则是契约。本课将 `agent-rules.md` 从散文升级为Agent在启动时检查、在每个决策点检查并在违规时报告的结构化约束。

**类型：** 构建
**语言：** Python（标准库）
**前置条件：** Phase 14 · 32（最小工作台）
**时间：** ~50分钟

## 学习目标

- 编写Agent在行动前检查的规则，而不是之后。
- 实现三个检查点：启动、行动前、任务结束。
- 生成 `rule_report.json`，验证门和审查Agent都可以消费。
- 区分阻止级和警告级规则。

## 问题所在

Agent开始遵循规则。在10步之后，上下文窗口推移了规则。Agent"忘记"它不应该触及配置文件。提示中的规则是建议；磁盘上的规则是契约。差距是执行，不是措辞。

## 核心概念

### 三种规则严重性

- **阻止。** 违规停止Agent。示例："不要触及 `config/prod/`。"
- **警告。** 违规标记以供审查但允许继续。示例："优先使用现有工具而非新工具。"
- **信息。** 违规记录但不标记。示例："在可能时偏好函数式风格。"

### 三个检查点

1. **启动。** Agent读取规则并确认理解。任何阻止级规则无法满足 = 拒绝启动。
2. **行动前。** 在每个工具调用之前，Agent检查规则是否允许该动作。阻止级违规 = 拒绝动作。
3. **任务结束。** Agent生成 `rule_report.json`，列出所有违规及其严重性。

### 规则格式

```markdown
## Scope

- BLOCK: Do not edit files in config/prod/
- BLOCK: Do not modify migrations that have been deployed
- WARN: Prefer editing existing files over creating new ones

## Verification

- BLOCK: Run tests before claiming done
- BLOCK: All acceptance commands must exit zero

## Style

- INFO: Prefer functional style over imperative
- INFO: Use type hints on all public functions
```

### 规则报告

```json
{
  "task_id": "T-001",
  "checks": [
    { "rule": "Do not edit files in config/prod/", "severity": "block", "status": "pass" },
    {
      "rule": "Run tests before claiming done",
      "severity": "block",
      "status": "fail",
      "detail": "No test run recorded"
    }
  ],
  "verdict": "fail"
}
```

### 为什么规则在文件中，不在提示中

文件在会话间持久化。文件可以被验证。文件可以被版本控制。文件可以被CI检查。提示段落无法做到这些。

## 实践

`code/main.py`实现：

- 从 `agent-rules.md` 加载规则，带有严重性标签。
- 三个检查点：启动、行动前、任务结束。
- `rule_report.json` 生成器。
- 演示：Agent启动、检查规则、尝试被阻止的动作、被拒绝、生成报告。

## 交付

`outputs/skill-executable-rules.md`为项目编写 `agent-rules.md` 并连接检查点。

## 练习

1. 添加一条规则："每次编辑最多触及3个文件。"实现检查。
2. 实现启动检查：如果缺少测试命令，拒绝启动。
3. 添加一个 `--strict` 标志，将所有警告提升为阻止。
4. 将规则存储从markdown移动到JSON Schema。权衡是什么？
5. 为规则添加版本控制。当规则变更时，旧报告仍然可读吗？

## 关键术语

| 术语       | 人们怎么说     | 实际含义                          |
| ---------- | -------------- | --------------------------------- |
| 可执行约束 | "磁盘上的规则" | Agent检查的文件，不是提示中的段落 |
| 阻止级     | "硬性规则"     | 违规停止Agent                     |
| 警告级     | "软性规则"     | 违规标记以供审查                  |
| 启动检查   | "预检"         | 启动时的规则验证                  |
| 行动前检查 | "门控"         | 每个动作前的规则检查              |
| 规则报告   | "合规报告"     | 验证门消费的结构化违规列表        |

## 延伸阅读

- [Anthropic, Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- [microservices.io, GenAI dev platform: guardrails](https://microservices.io/post/architecture/2026/03/09/genai-development-platform-part-1-development-guardrails.html)
