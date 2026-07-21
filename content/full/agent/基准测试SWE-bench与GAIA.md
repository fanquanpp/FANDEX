---
title: '基准测试SWE-bench与GAIA'
description: '三个基准锚定2026年Agent评估。SWE-bench测试代码补丁。GAIA测试通用工具使用。AgentBench测试多环境推理。了解它们的组成、污染故事以及它们不测量的内容。'
module: agent
related:
  - agent/鎬濈淮鏍戜笌LATS
  - agent/混合记忆向量图与KV
  - agent/基准测试WebArena与OSWorld
  - agent/计算机使用Agent
prerequisites:
  - agent/概述与架构
---

# 基准测试：SWE-bench、GAIA、AgentBench

> 三个基准锚定2026年Agent评估。SWE-bench测试代码补丁。GAIA测试通用工具使用。AgentBench测试多环境推理。了解它们的组成、污染故事以及它们不测量的内容。

**类型：** 学习
**语言：** Python (stdlib)
**前置条件：** Phase 14 · 06 (工具使用)
**时间：** ~60分钟

## 学习目标

- 说出SWE-bench的测试线束（FAIL_TO_PASS）并解释为什么它以单元测试为门控。
- 解释为什么SWE-bench Verified（OpenAI，500任务）存在以及它移除了什么。
- 描述GAIA的设计：对人类简单，对AI困难；三个难度级别。
- 说出AgentBench的八个环境及其对开源LLM的主要阻碍。
- 总结SWE-bench+污染发现及其影响。

## 问题所在

排行榜告诉你哪个模型在一个基准上获胜。它们不告诉你：

- 基准是否被污染（训练数据中的解决方案、测试泄露）。
- 基准是否测量你关心的东西（代码 vs 浏览 vs 通用）。
- 评估器是否健壮（AST匹配、状态检查、人工审查）。

在引用数字之前了解三个锚定基准及其失败模式。

## 核心概念

### SWE-bench（Jimenez等人，ICLR 2024口头报告）

- 来自12个流行Python仓库的2,294个真实GitHub问题。
- Agent获得：修复前提交的代码库 + 自然语言问题描述。
- Agent产生：一个补丁。
- 评估器：应用补丁，运行仓库的测试套件。补丁必须翻转FAIL_TO_PASS测试（之前失败，现在通过）而不破坏PASS_TO_PASS测试。

SWE-agent（Yang等人，2024）在发布时达到12.5%，强调Agent-计算机接口（文件编辑器命令、模型理解的搜索语法）。

### SWE-bench Verified

OpenAI，2024年8月。人工策划的500任务子集。移除了模糊问题、不可靠测试和修复不明确的任务。"你的Agent能发布真实补丁吗"的主要基准。

### 污染

- 超过94%的SWE-bench问题早于大多数模型截止日期。
- **SWE-bench+**发现32.67%的成功补丁在问题文本中泄露了解决方案（模型在描述中看到了修复），31.08%因弱测试覆盖而可疑。
- Verified更干净但不是无污染的。

实际影响：在SWE-bench上得分50%的模型可能在SWE-bench+上得分35%。如果你声称SWE-bench性能，总是报告两者。

### GAIA（Mialon等人，2023年11月）

- 466个问题；300个保留用于huggingface.co/gaia-benchmark的私有排行榜。
- 设计哲学："对人类概念上简单（92%）但对AI困难（GPT-4带插件：15%）。"
- 测试推理、多模态、Web、工具使用。
- 三个难度级别；Level 3需要跨模态的长工具链。

GAIA是你用来测量"通用能力"的。不要与代码特定基准混淆。

### AgentBench（Liu等人，ICLR 2024）

- 8个环境跨代码（Bash、DB、KG）、游戏（Alfworld、LTP）、Web（WebShop、Mind2Web）和开放式生成。
- 多轮，每个拆分约4k-13k轮。
- 主要发现：长期推理、决策制定和指令遵循是OSS LLM追赶商业的阻碍。

### 这些不测量什么

- 真实世界运营成本（token、挂钟时间）。
- 对抗条件下的安全行为。
- 你领域的性能（使用你自己的评估，第30课）。
- 尾部失败（基准平均；生产运维关心最差的1%）。

### 基准测试哪里会出错

- **单数字执念。** SWE-bench 50%告诉你的不如P50/P75/P95成本 + 步骤分布。
- **污染声明。** 报告SWE-bench而不提及Verified或SWE-bench+是误导性的。
- **基准作为开发目标。** 为基准优化偏离了生产有用性。

## 构建它

`code/main.py`实现一个玩具SWE-bench式线束：

- 合成Bug修复任务（3个任务）。
- 一个脚本"Agent"提出补丁。
- 一个测试运行器检查FAIL_TO_PASS（Bug现在修复）和PASS_TO_PASS（没有破坏）。
- 一个基于问题分解深度的GAIA风格难度分类器。

运行：

```
python3 code/main.py
```

输出显示每任务 + 每难度的解决率，使评估器规则具体化。

## 使用它

- **SWE-bench Verified**用于代码Agent。总是报告Verified分数。
- **GAIA**用于通用Agent。使用私有排行榜拆分。
- **AgentBench**用于多环境比较。
- **自定义评估**（第30课）用于你产品的实际形状。

## 发布它

`outputs/skill-benchmark-harness.md`为任何代码库-任务对构建带FAIL_TO_PASS / PASS_TO_PASS门控的SWE-bench式线束。

## 练习

1. 将玩具线束移植到真实仓库（选择你的一个）。为已知Bug编写3个FAIL_TO_PASS测试。
2. 添加步骤计数指标。在你的3个任务上，每次解决需要多少Agent步骤？
3. 阅读SWE-bench+论文。实现解决方案泄露检查（将问题文本与diff模式匹配）。
4. 从公共拆分下载一个GAIA问题。追踪GPT-4级Agent会做什么。它需要什么工具？
5. 阅读AgentBench的每环境分解。哪个环境镜像你的产品面？那里的"SOTA"看起来什么样？

## 关键术语

| 术语               | 人们常说的        | 实际含义                                        |
| ------------------ | ----------------- | ----------------------------------------------- |
| SWE-bench          | "代码Agent基准"   | 2,294个GitHub问题；补丁必须翻转FAIL_TO_PASS测试 |
| SWE-bench Verified | "干净的SWE-bench" | 500个人工策划任务，OpenAI                       |
| FAIL_TO_PASS       | "修复门控"        | 之前失败的测试，补丁后必须通过                  |
| PASS_TO_PASS       | "无回归门控"      | 之前通过的测试，仍必须通过                      |
| GAIA               | "通用基准"        | 466个人类简单/AI困难的多工具问题                |
| AgentBench         | "多环境基准"      | 8个环境；长时间范围多轮                         |
| 污染               | "训练集泄露"      | 基准任务存在于模型训练中                        |
| SWE-bench+         | "污染审计"        | 在成功SWE-bench补丁中发现32.67%解决方案泄露     |

## 延伸阅读

- [Jimenez等人, SWE-bench (arXiv:2310.06770)](https://arxiv.org/abs/2310.06770) — 原始基准
- [OpenAI, SWE-bench Verified](https://openai.com/index/introducing-swe-bench-verified/) — 策划子集
- [Mialon等人, GAIA (arXiv:2311.12983)](https://arxiv.org/abs/2311.12983) — 通用基准
- [Liu等人, AgentBench (arXiv:2308.03688)](https://arxiv.org/abs/2308.03688) — 多环境套件
