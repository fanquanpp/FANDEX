---
title: 技能库与终身学习
description: 'Voyager（Wang等人，TMLR 2024）将可执行代码视为技能。技能是命名的、可检索的、可组合的，并由环境反馈精炼。这是Claude Agent SDK技能、skillkit和2026年技能库模式的参考架构。'
module: agent
related:
  - agent/记忆块与睡眠时间计算
  - agent/记忆虚拟上下文与MemGPT
  - agent/技能与AgentSDK
  - agent/监督者模式
prerequisites:
  - agent/概述与架构
---

# 技能库与终身学习（Voyager）

> Voyager（Wang等人，TMLR 2024）将可执行代码视为技能。技能是命名的、可检索的、可组合的，并由环境反馈精炼。这是Claude Agent SDK技能、skillkit和2026年技能库模式的参考架构。

**类型：** 构建
**语言：** Python (stdlib)
**前置条件：** Phase 14 · 07 (MemGPT), Phase 14 · 08 (Letta块)
**时间：** ~75分钟

## 学习目标

- 说出Voyager的三个组件——自动课程、技能库、迭代提示——及各自的作用。
- 解释为什么Voyager将动作空间设为代码而非原始命令。
- 实现一个带注册、检索、组合和失败驱动精炼的stdlib技能库。
- 将Voyager的模式映射到2026年Claude Agent SDK技能和skillkit生态系统。

## 问题所在

在每个会话中从头重建每个能力的Agent做错了三件事：

1. **浪费token。** 每个任务重新引出相同的推理。
2. **丢失进展。** 在会话A中学到的纠正不会转移到会话B。
3. **在长时间范围组合上失败。** 复杂任务需要能力层次；一次性提示无法表达它们。

Voyager的回答：将每个可复用能力视为存储在库中的命名代码块，可按相似性检索，可与其他技能组合，并可由执行反馈精炼。

## 核心概念

### 三个组件

Voyager（arXiv:2305.16291）围绕以下结构化Agent：

1. **自动课程。** 基于好奇心的提议器根据Agent当前技能集和环境状态选择下一个任务。探索是自底向上的。
2. **技能库。** 每个技能是可执行代码。任务成功时添加新技能。技能按查询到描述的相似性检索。
3. **迭代提示机制。** 失败时，Agent接收执行错误、环境反馈和自验证输出，然后精炼技能。

Minecraft评估（Wang等人，2024）：3.3倍更多独特物品，8.5倍更快石制工具，6.4倍更快铁制工具，2.3倍更长地图遍历对比基线。数字是Minecraft特定的，但模式可迁移。

### 动作空间 = 代码

大多数Agent发出原始命令。Voyager发出JavaScript函数。一个技能是：

```
async function craftIronPickaxe(bot) {
  await mineIron(bot, 3);
  await mineStick(bot, 2);
  await placeCraftingTable(bot);
  await craft(bot, 'iron_pickaxe');
}
```

由子技能组合。按键描述和嵌入存储。作为程序而非提示检索。

这是2026年Claude Agent SDK技能：Agent按需加载的命名、可检索代码块加指令。

### 技能检索

新任务"制作钻石镐"。Agent：

1. 嵌入任务描述。
2. 查询技能库获取top-k相似技能。
3. 检索`craftIronPickaxe`、`mineDiamond`、`placeCraftingTable`等。
4. 从检索到的原语 + 新逻辑组合新技能。

这是MCP资源（Phase 13）和Agent SDK技能实现的模式：在知识/代码面上的检索，范围限定到当前任务。

### 迭代精炼

Voyager的反馈循环：

1. Agent写一个技能。
2. 技能针对环境运行。
3. 三个信号之一返回：`success`、`error`（带堆栈跟踪）、`self-verification failure`。
4. Agent使用信号作为上下文重写技能。
5. 循环直到成功或最大轮次。

这是应用于代码生成的Self-Refine（第05课），带环境接地验证。CRITIC（第05课）是相同模式，以外部工具作为验证器。

### 课程和探索

Voyager的课程模块根据Agent拥有的和尚未做的提出"在湖边建庇护所"等任务。提议器使用环境状态 + 技能清单来选择刚好在当前能力之上的任务——探索的最佳点。

对于生产Agent，这转化为"缺什么"操作符：给定当前技能库和领域，我们还没有覆盖哪些技能？团队通常手动实现为课程审查。

### 这个模式哪里会出错

- **技能库腐烂。** 同一技能以略微不同的描述添加10次。在写入时添加去重；检索只返回一个。
- **组合技能漂移。** 父技能依赖的子技能被精炼了。对技能进行版本控制；固定在v1的父技能不会神奇地采用v3。
- **检索质量。** 技能描述上的向量检索在库增长超过几百个时退化。用标签过滤和硬约束补充（"只有`category=tooling`的技能"）。

## 构建它

`code/main.py`实现一个stdlib技能库：

- `Skill` — name、description、code（字符串）、version、tags、dependencies。
- `SkillLibrary` — register、search（token重叠）、compose（依赖的拓扑排序）和refine（更新时版本提升）。
- 一个脚本Agent注册三个原语技能，组合第四个，遇到失败，并精炼。

运行：

```
python3 code/main.py
```

跟踪显示库写入、检索、组合、失败执行和v2精炼——Voyager循环端到端。

## 使用它

- **Claude Agent SDK技能**（Anthropic）— 2026年参考：每个技能有描述、代码和指令；在Agent会话期间按需加载。
- **skillkit**（npm: skillkit）— 32+ AI编码Agent的跨Agent技能管理。
- **自定义技能库** — 领域特定（数据Agent的SQL技能，基础设施Agent的Terraform技能）。Voyager模式可缩小。
- **OpenAI Agents SDK `tools`** — 低端；每个工具是一个轻量级技能。

## 发布它

`outputs/skill-skill-library.md`为任何目标运行时生成带注册、检索、版本控制和精炼连接的Voyager形状技能库。

## 练习

1. 给`compose()`添加依赖循环检测器。当技能A依赖B而B依赖A时会发生什么？错误还是警告？
2. 实现每技能版本固定。当父技能组合子`crafting@1`时，对`crafting@2`的精炼不得静默升级父技能。
3. 用sentence-transformers嵌入（或BM25 stdlib实现）替换token重叠检索。在50技能玩具库上测量retrieval@5。
4. 添加"课程"Agent：给定当前库和领域描述，提出5个缺失技能。每周调用。
5. 阅读Anthropic的Claude Agent SDK技能文档。将玩具库移植到SDK的技能Schema。可发现性有什么变化？

## 关键术语

| 术语           | 人们常说的          | 实际含义                               |
| -------------- | ------------------- | -------------------------------------- |
| 技能           | "可复用能力"        | 命名代码块 + 描述，可按相似性检索      |
| 技能库         | "Agent的如何做记忆" | 技能的持久存储，可搜索可组合           |
| 课程           | "任务提议器"        | 由当前能力差距驱动的自底向上目标生成器 |
| 组合           | "技能DAG"           | 技能调用技能；执行时拓扑排序           |
| 迭代精炼       | "自纠正循环"        | 环境反馈 + 错误 + 自验证折回到下一版本 |
| 动作空间即代码 | "程序化动作"        | 发出函数而非原始命令，用于时间扩展行为 |
| 写入时去重     | "技能合并"          | 近重复描述合并为一个规范技能           |

## 延伸阅读

- [Wang等人, Voyager (arXiv:2305.16291)](https://arxiv.org/abs/2305.16291) — 原始技能库论文
- [Claude Agent SDK概述](https://platform.claude.com/docs/en/agent-sdk/overview) — 技能作为2026年产品化
- [Anthropic, Building agents with the Claude Agent SDK](https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk) — 实践中的技能和子Agent
- [Madaan等人, Self-Refine (arXiv:2303.17651)](https://arxiv.org/abs/2303.17651) — Voyager底层的精炼循环
