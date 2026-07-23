---
title: 工具使用与函数调用
description: 'Toolformer（Schick等人，2023）开始了自监督工具标注。Berkeley Function Calling Leaderboard V4（Patil等人，2025）设定了2026年的标准：40% Agent式、30%多轮、10%实时、10%非实时、10%幻觉。单轮已解决。记忆、...'
module: agent
related:
  - agent/工具接口
  - agent/工具生态项目
  - agent/工具Schema设计
  - agent/共识与拜占庭容错
prerequisites:
  - agent/概述与架构
---

# 工具使用与函数调用

> Toolformer（Schick等人，2023）开始了自监督工具标注。Berkeley Function Calling Leaderboard V4（Patil等人，2025）设定了2026年的标准：40% Agent式、30%多轮、10%实时、10%非实时、10%幻觉。单轮已解决。记忆、动态决策和长时间范围工具链还没有。

**类型：** 构建
**语言：** Python (stdlib)
**前置条件：** Phase 14 · 01 (Agent循环), Phase 13 · 01 (函数调用深入)
**时间：** ~60分钟

## 学习目标

- 解释Toolformer的自监督训练信号：仅当执行减少下一token损失时保留工具标注。
- 说出BFCL V4的五个评估类别以及每个衡量什么。
- 实现一个带Schema验证、参数强制转换和执行沙盒的stdlib工具注册表。
- 诊断三个2026年开放问题：长时间范围工具链、动态决策和记忆。

## 问题所在

早期工具使用问的是：模型能预测正确的函数调用吗？现代工具使用问的是：模型能在40步中链式调用工具，带记忆，带部分可观察性，能从工具失败中恢复，不幻觉不存在的工具吗？

Toolformer建立了基线：模型可以通过自监督学习何时调用工具。BFCL V4定义了2026年的评估目标。它们之间的差距就是生产Agent生活的空间。

## 核心概念

### Toolformer（Schick等人，NeurIPS 2023）

想法：让模型用自己的预训练语料标注候选API调用。对每个候选，执行它。仅当包含工具结果减少下一token的损失时保留标注。在过滤后的语料上微调。

覆盖的工具：计算器、QA系统、搜索引擎、翻译器、日历。自监督信号纯粹关于工具是否帮助预测文本——没有人工标签。

规模结果：工具使用在规模上涌现。较小模型受工具标注损害；较大模型获益。这就是为什么2026年前沿模型内置了强工具使用能力，而大多数7B模型需要显式的工具使用微调才能可靠。

### Berkeley Function Calling Leaderboard V4（Patil等人，ICML 2025）

BFCL是2026年事实上的评估标准。V4组成：

- **Agent式（40%）** — 完整Agent轨迹：记忆、多轮、动态决策。
- **多轮（30%）** — 带工具链的交互式对话。
- **实时（10%）** — 用户提交的真实提示（更难的分布）。
- **非实时（10%）** — 合成测试用例。
- **幻觉（10%）** — 检测何时不应该调用工具。

V3引入了基于状态的评估：在工具序列之后，检查API的实际状态（如"文件是否创建了？"）而不是匹配工具调用的AST。V4添加了Web搜索、记忆和格式敏感性类别。

2026年关键发现：单轮函数调用接近解决。失败集中在记忆（跨轮次携带上下文）、动态决策（基于先前结果选择工具）、长时间范围链（20+步后漂移）和幻觉检测（当没有工具适合时拒绝调用）。

### 工具Schema

每个提供商都有一个Schema。它们在细节上不同但共享相同的形状：

```
name: string
description: string (what it does, when to use it)
input_schema: JSON Schema (properties, required, types, enums)
```

Anthropic直接使用`input_schema`。OpenAI使用`function.parameters`。两者都接受JSON Schema。描述是承重的——模型阅读它们来选择正确的工具。糟糕的工具描述是选错工具失败的第一大根因。

### 参数验证

不要信任任何工具调用。验证：

1. **类型强制转换。** 模型可能返回字符串"5"而Schema说int。如果无歧义则强制转换；否则拒绝。
2. **枚举验证。** 如果Schema说`status in {"open", "closed"}`而模型发出`"in_progress"`，用描述性错误拒绝。
3. **必需字段。** 缺少必需字段 -> 立即返回错误观察给模型，而不是崩溃。
4. **格式验证。** 日期、电子邮件、URL — 用具体解析器验证，不是正则。

每个验证失败应返回结构化观察，以便模型可以用正确的形状重试。

### 并行工具调用

现代提供商支持在一个assistant轮次中并行工具调用。循环：

1. 模型发出3个带有不同`tool_use_id`的工具调用。
2. 运行时执行它们（如果独立则并行）。
3. 每个结果作为`tool_result`块返回，通过`tool_use_id`关联。

工程规则：将关联ID视为承重的。交换它们会导致错误工具到错误结果的路由。

### 沙盒

工具执行是沙盒边界。详见第09课。简短版本：每个工具应指定读/写面、网络访问、超时、内存上限。通用的`run_shell(cmd)`是红旗；特定的`git_status()`更安全。

## 构建它

`code/main.py`实现了一个生产形状的工具注册表：

- JSON Schema子集验证器（仅stdlib）。
- 带描述、输入Schema、超时和执行器的工具注册。
- 参数强制转换和枚举验证。
- 带关联ID的并行工具调度。
- 错误观察作为结构化字符串。

运行：

```
python3 code/main.py
```

跟踪显示一个微型Agent在一个轮次中调用三个工具，其中一个故意格式错误的调用被用描述性错误拒绝，模型可以据此行动。

## 使用它

每个提供商都有自己的工具Schema — Anthropic、OpenAI、Gemini、Bedrock。如果需要多提供商，使用翻译层（OpenAI Agents SDK、Vercel AI SDK、LangChain工具适配器）。BFCL是参考基准——如果工具使用是产品核心，在发布前对Agent运行它。

## 发布它

`outputs/skill-tool-registry.md`为给定任务领域生成工具目录、Schema和注册表。包括描述质量检查（每个工具的描述是否告诉模型何时使用它？）。

## 练习

1. 添加一个"无操作"工具，让模型显式拒绝使用任何其他工具。在类似BFCL的幻觉测试上测量。
2. 为int-as-string和float-as-string实现参数强制转换。强制转换从哪里开始隐藏真正的bug？
3. 添加每工具超时和断路器（3次连续失败后拒绝工具60秒）。这如何改变模型的恢复方式？
4. 阅读BFCL V4描述。选择一个类别（如"多轮"）并通过Agent运行10个示例提示。报告通过率。
5. 将stdlib验证器移植到Pydantic或Zod。Pydantic/Zod捕获了玩具遗漏的什么？

## 关键术语

| 术语         | 人们常说的               | 实际含义                                                    |
| ------------ | ------------------------ | ----------------------------------------------------------- |
| 函数调用     | "工具使用"               | 带验证Schema的结构化输出工具调用                            |
| Toolformer   | "自监督工具标注"         | Schick 2023 — 保留结果减少下一token损失的工具调用           |
| BFCL         | "Berkeley函数调用排行榜" | 2026基准：40% Agent式、30%多轮、10%实时、10%非实时、10%幻觉 |
| 工具Schema   | "模型的函数签名"         | name、description、参数的JSON Schema                        |
| tool_use_id  | "关联ID"                 | 将工具调用与其结果关联；并行调度必需                        |
| 幻觉检测     | "知道何时不调用"         | V4类别：当没有工具适合时拒绝调用                            |
| 参数强制转换 | "字符串到整数修复"       | 可预测Schema不匹配的窄修复；有歧义时拒绝                    |
| 沙盒         | "工具执行边界"           | 每工具读/写面、网络、超时、内存上限                         |

## 延伸阅读

- [Schick等人, Toolformer (arXiv:2302.04761)](https://arxiv.org/abs/2302.04761) — 自监督工具标注
- [Berkeley Function Calling Leaderboard (V4)](https://gorilla.cs.berkeley.edu/leaderboard.html) — 2026评估基准
- [Anthropic, 工具使用文档](https://platform.claude.com/docs/en/agent-sdk/overview) — Claude Agent SDK中的生产工具Schema
- [OpenAI Agents SDK文档](https://openai.github.io/openai-agents-python/) — 函数工具类型和Guardrails
