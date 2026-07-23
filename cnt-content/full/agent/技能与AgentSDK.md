---
title: '技能与Agent SDK — 可复用Agent能力打包'
description: '掌握技能打包规范和主流Agent SDK的技能模型，实现跨框架的Agent能力复用'
module: agent
difficulty: intermediate
tags:
  - 技能打包
  - 'Agent SDK'
  - 技能注册表
  - 跨框架复用
related:
  - agent/记忆虚拟上下文与MemGPT
  - agent/技能库与终身学习
  - agent/监督者模式
  - agent/检查点与回滚
prerequisites:
  - agent/概述与架构
---

# 技能与Agent SDK — 可复用Agent能力打包

> MCP打包工具。A2A打包Agent。技能打包可复用的Agent能力 — 提示 + 工具 + 工作流逻辑 — 作为可安装单元。Claude Code的技能、OpenAI的Custom GPT Actions、LangGraph的节点和CrewAI的工具都编码了相同的模式：声明一次，在许多Agent中复用。本课映射生态系统并构建一个与框架无关的技能打包器。

**类型：** 学习
**语言：** Python（标准库，技能打包器）
**前置条件：** Phase 13 · 07（MCP服务器），Phase 13 · 19（A2A）
**时间：** ~45分钟

## 学习目标

- 定义"技能"与"工具"与"Agent"的区别。
- 将技能打包为自包含单元：清单、提示、工具绑定、工作流逻辑。
- 将技能映射到四个Agent SDK：Claude Code、OpenAI Agents、LangGraph、CrewAI。
- 发布技能注册表并从其中安装技能。

## 问题所在

一个"代码审查"能力包括：一个系统提示、三个工具（read_file、run_linter、create_comment）和一个两步工作流（读取 + lint，然后审查 + 评论）。今天，每个Agent框架重新实现此能力：

- **Claude Code。** 自定义斜杠命令 + MCP工具。
- **OpenAI Agents。** Agent类 + 函数工具。
- **LangGraph。** 节点 + 边 + 工具节点。
- **CrewAI。** Agent + Task + Tool。

相同逻辑，四个实现。技能打包将其提取为可安装单元，每个框架都可以消费。

## 核心概念

### 技能定义

技能是四个组件：

1. **清单。** 名称、版本、描述、依赖。
2. **提示。** 系统提示模板，带有变量槽。
3. **工具绑定。** 技能需要的MCP工具列表。
4. **工作流逻辑。** 多步执行计划（可选；简单技能可以是单步）。

### 清单格式

```json
{
  "name": "code-review",
  "version": "1.0.0",
  "description": "Reviews code changes and suggests improvements",
  "author": "engineering-team",
  "prompts": {
    "system": "You are a code reviewer. Analyze the following diff and suggest improvements...",
    "variables": ["diff_content", "language"]
  },
  "tools": [
    { "name": "read_file", "server": "filesystem" },
    { "name": "run_linter", "server": "linter" },
    { "name": "create_comment", "server": "github" }
  ],
  "workflow": {
    "steps": [{ "action": "read_file", "then": "run_linter" }, { "action": "review_and_comment" }]
  }
}
```

### 技能 vs 工具 vs Agent

| 方面   | 工具        | 技能                     | Agent      |
| ------ | ----------- | ------------------------ | ---------- |
| 范围   | 单个动作    | 能力（提示+工具+工作流） | 自主实体   |
| 自主性 | 无          | 无（由Agent驱动）        | 完整       |
| 打包   | MCP工具定义 | 清单+提示+绑定           | Agent Card |
| 复用   | 跨Agent     | 跨框架                   | 跨系统     |

### 框架映射

**Claude Code技能。** `.claude/skills/` 目录中的markdown文件。每个技能是一个提示模板。工具来自MCP服务器。

**OpenAI Agents。** `Agent` 类带有 `instructions`（提示）、`tools`（函数工具）和 `handoffs`（委托）。技能映射到Agent定义。

**LangGraph。** `StateGraph` 带有节点（提示 + 工具调用）和边（工作流）。技能映射到子图。

**CrewAI。** `Agent` + `Task` + `Tool`。技能映射到Agent-Task对。

### 技能注册表

集中式注册表存储技能清单和包。类似npm或PyPI：

```
skill install code-review
skill publish my-skill
skill search "database"
```

注册表验证清单、检查依赖并解析工具绑定。

### 版本控制

技能遵循semver。破坏性变更（提示更改、工具移除）是主版本。新工具是次版本。提示微调是补丁。

### 技能组合

技能可以组合：一个"PR审查"技能使用"代码审查"技能加"安全审查"技能。组合在清单的 `dependencies` 字段中声明。

### 安全

技能清单声明其工具需求。安装前，用户审查并批准。这与MCP的工具批准模型对齐。

## 实践

`code/main.py` 实现一个最小技能打包器和注册表。它：

1. 从清单文件加载技能。
2. 验证清单格式。
3. 解析工具绑定到MCP服务器名称。
4. 将技能安装到本地目录。
5. 搜索注册表中的技能。

## 交付

本课产生 `outputs/skill-packager.md`。给定一个Agent能力，该技能生成完整的技能清单、提示模板和工具绑定。

## 练习

1. 运行 `code/main.py`。安装"code-review"技能并检查生成的文件。

2. 创建一个新技能"security-review"，带有自己的提示和工具绑定。发布到本地注册表。

3. 将"code-review"技能映射到OpenAI Agents框架。编写Agent类定义。

4. 设计一个组合技能"full-pr-review"，使用"code-review"和"security-review"作为依赖。

5. 阅读Claude Code技能文档。识别Claude Code技能格式与本课清单格式之间的一个差异。

## 关键术语

| 术语              | 人们怎么说     | 实际含义                       |
| ----------------- | -------------- | ------------------------------ |
| Skill             | "可复用能力"   | 提示+工具+工作流作为可安装单元 |
| Manifest          | "技能定义"     | 名称、版本、提示、工具、工作流 |
| Tool binding      | "工具需求"     | 技能需要的MCP工具列表          |
| Skill registry    | "技能商店"     | 技能清单和包的集中存储         |
| Framework mapping | "SDK适配"      | 技能到特定Agent SDK的翻译      |
| Skill composition | "技能组合"     | 使用其他技能作为依赖           |
| Semver            | "版本控制"     | 技能的语义版本控制             |
| Prompt template   | "提示模板"     | 带有变量槽的系统提示           |
| Workflow logic    | "执行计划"     | 技能内的多步执行序列           |
| Install / publish | "技能生命周期" | 注册表上的安装和发布操作       |

## 延伸阅读

- [Claude Code — Skills](https://docs.anthropic.com/en/docs/claude-code/skills) — Claude Code技能格式
- [OpenAI — Agents SDK](https://github.com/openai/openai-agents-python) — Agent定义和工具绑定
- [LangGraph — Concepts](https://langchain-ai.github.io/langgraph/concepts/) — 节点、边和子图
- [CrewAI — Framework](https://github.com/crewAIInc/crewAI) — Agent、Task和Tool组合
- [MCP — Tool annotations](https://modelcontextprotocol.io/specification/2025-11-25/server/tools) — 工具级元数据
