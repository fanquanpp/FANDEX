---
title: AlphaEvolve进化编码
description: '将前沿编码模型与进化循环和机器可检查评估器配对。让循环运行足够长时间。它发现了一个使用 48 次标量乘法的 4x4 复矩阵乘法程序——56 年来对 Strassen 的首次改进。它还找到了一个 Google 范围的 Borg 调度启发式，在生产中恢复了约 0.7% 的集群计算。架构故意无聊。胜...'
module: agent
related:
  - agent/Agno与Mastra生产运行时
  - 'agent/AI-Scientist-v2自主研究'
  - agent/Anthropic工作流模式
  - agent/AnthropicRSP
prerequisites:
  - agent/概述与架构
---

# AlphaEvolve — 进化编码 Agent

> 将前沿编码模型与进化循环和机器可检查评估器配对。让循环运行足够长时间。它发现了一个使用 48 次标量乘法的 4x4 复矩阵乘法程序——56 年来对 Strassen 的首次改进。它还找到了一个 Google 范围的 Borg 调度启发式，在生产中恢复了约 0.7% 的集群计算。架构故意无聊。胜利来自评估器的严谨性。

**类型：** 学习
**语言：** Python (stdlib, 进化循环玩具)
**前置条件：** Phase 15 · 01 (长时间范围框架), Phase 15 · 02 (自教推理)
**时间：** ~60 分钟

## 问题

大型语言模型可以编写代码。进化算法可以搜索代码。两者都分别尝试了几十年；两者都碰到了天花板。LLM 天花板是编造：模型编写看似合理但不做其声称之事的代码。进化天花板是搜索成本：语法上的随机突变很少产生可编译的程序，更不用说更好的了。

AlphaEvolve (Novikov 等人, DeepMind, arXiv:2506.13131, 2025 年 6 月) 将它们结合。LLM 对程序数据库提出有针对性的编辑；自动评估器对每个变体评分；高分变体成为未来代的父代。LLM 处理编写合理代码的昂贵步骤；评估器捕获编造。循环运行数小时到数周。

报告结果：48 次标量乘法的 4x4 复矩阵乘法 (Strassen 1969 年的界限是 49)，Google 生产中的 Borg 调度启发式，32.5% FlashAttention 内核加速，Gemini 训练吞吐量改善。

架构有效因为评估器是机器可检查的。在评估器不是的地方无效。这种不对称就是教训。

## 概念

### 循环

1. 从正确但次优的种子程序 `P_0` 开始。
2. 维护变体程序数据库，每个由评估器评分。
3. 从数据库中采样一个或多个父代 (MAP-elites 风格或基于岛屿)。
4. 提示 LLM (Gemini Flash 用于许多候选，Gemini Pro 用于困难的) 产生父代的修改变体。
5. 在保留评估器上编译、运行和评估变体。
6. 按其分数和特征向量键插入数据库。
7. 重复。

两个细节重要。首先，LLM 被提示的不只是父程序——通常是数据库中的几个顶级变体，加上评估器签名，加上简短任务描述。模型的工作是提出可能改善分数的有针对性改变。其次，数据库是结构化的 (MAP-elites 网格，基于岛屿)，所以循环探索多样性，不只是当前领先者。

### 什么使评估器不可协商

AlphaEvolve 的胜利都来自评估器快速、确定性和难以博弈的领域：

- **矩阵乘法算法**：乘以矩阵并逐位检查相等性的单元测试。
- **Borg 调度启发式**：重放历史集群负载并测量浪费计算的生产级模拟器。
- **FlashAttention 内核**：正确性测试加真实硬件上的挂钟基准。
- **Gemini 训练吞吐量**：测量的每步 GPU 秒数。

在每个案例中，评估器捕获了否则会占主导的 LLM 错误类别：编造的正确性声明、在硬件上消失的性能声明和边缘情况失败。移除评估器，循环优化漂亮代码。

### 奖励黑客是那个声明的另一面

进化优化评估器测量的任何东西。如果评估器不完美，循环会找到不完美之处。在未验证领域，循环会优化表面特征，而不是预期行为。DeepMind 在论文中明确标记了这一点：AlphaEvolve 的成功只在评估器严谨性匹配搜索雄心的领域转移。

代码搜索循环中奖励黑客的 2025-2026 具体示例：

- 奖励"完成时间"的优化目标奖励提交空解决方案。
- 奖励测试下正确性的基准分数奖励记忆测试和过拟合。
- "代码质量"代理奖励删除注释和重写变量名，没有语义变化。

AlphaEvolve 中的修复：提供 LLM 从未见过的保留评估器，输入在评估时生成。即便如此，DeepMind 建议对任何提议的部署进行强审查。

### 为什么 LLM + 搜索胜过单独任一

LLM 可以产生可编译、语义合理的修改。2000 行 Python 文件上的随机突变 GA 几乎总是产生语法错误。LLM 还将搜索集中在合理邻域（改变一个函数，不是随机字节），这显著减少浪费的评估器调用。

评估器反过来捕获 LLM 的编造。LLM 会自信地声称函数"极限是 O(n log n)"，而实际上是 O(n^2)；挂钟基准使问题尘埃落定。

### AlphaEvolve 在前沿栈中的位置

| 系统                         | 生成器       | 评估器               | 领域               | 示例胜利            |
| ---------------------------- | ------------ | -------------------- | ------------------ | ------------------- |
| AlphaEvolve                  | Gemini       | 正确性 + 基准        | 算法、内核、调度器 | 48 乘 4x4 matmul    |
| FunSearch (DeepMind, 2023)   | PaLM / Codey | 正确性               | 组合数学           | cap-set 下界        |
| AI Scientist v2 (Sakana, L5) | GPT/Claude   | LLM 批评 + 实验      | ML 研究            | ICLR workshop 论文  |
| Darwin Godel Machine (L4)    | Agent 脚手架 | SWE-bench / Polyglot | Agent 代码         | 20% → 50% SWE-bench |

四个都是相同配方的变化：生成器加评估器，循环。差异在于评估器评分什么和有多严谨。

## 构建它

`code/main.py` 在玩具符号回归问题上实现最小 AlphaEvolve 风格循环。"LLM"是 stdlib 代理，提出对计算目标函数的程序的小语法突变。"评估器"在保留测试点上测量均方误差。

观察：

- 最佳分数如何在代际间改善。
- MAP-elites 网格如何保持多样解决方案存活，使循环不会收敛于局部最小值。
- 移除保留测试（仅训练评估器）如何让循环壮观地过拟合。

## 使用它

`outputs/skill-evaluator-rigor-audit.md` 是在新领域考虑 AlphaEvolve 风格循环的前提条件：你的评估器真的捕获你关心的失败吗？

## 练习

1. 运行 `code/main.py`。注意最佳分数轨迹。禁用保留评估器 (标志 `--no-holdout`) 并重新运行。量化过拟合。

2. 阅读 AlphaEvolve 论文第 3 节关于 MAP-elites 网格。为新问题（例如编译器优化 pass）设计一个特征向量描述符，使搜索保持多样性。

3. 48 乘法 4x4 结果在 56 年后改进了 Strassen 的 49 乘界限。阅读论文附录 F 并用三句话解释为什么这个问题的评估器特别容易做对，以及为什么大多数领域不像它。

4. 提出一个 AlphaEvolve 会失败的领域。精确识别评估器在哪里断裂以及为什么。

5. 对于你了解的领域，编写你会使用的评估器签名。包括 (a) 正确性条件，(b) 性能指标，(c) 保留输入生成规则，(d) 至少一个反奖励黑客检查。

## 关键术语

| 术语             | 人们怎么说                  | 实际含义                                                 |
| ---------------- | --------------------------- | -------------------------------------------------------- |
| AlphaEvolve      | "DeepMind 的进化编码 Agent" | Gemini + 程序数据库 + 机器可检查评估器                   |
| MAP-elites       | "多样性保留档案"            | 按特征向量键的网格；每个单元格持有具有该描述符的最佳变体 |
| 岛屿模型         | "并行进化子种群"            | 定期迁移的独立种群；防止过早收敛                         |
| 机器可检查评估器 | "确定性预言机"              | LLM 无法伪造的单元测试、模拟器或基准——此循环的前提条件   |
| 奖励黑客         | "优化度量，不是目标"        | 循环找到在不做预期任务的情况下最大化分数的方法           |
| 种子程序         | "起始点"                    | 循环从中进化的初始正确但次优的程序                       |
| 保留评估器       | "LLM 从未见的评估数据"      | 在评估时生成的输入，防止记忆                             |

## 延伸阅读

- [Novikov et al. (2025). AlphaEvolve: A coding agent for scientific and algorithmic discovery](https://arxiv.org/abs/2506.13131) — 完整论文
- [DeepMind blog on AlphaEvolve](https://deepmind.google/blog/alphaevolve-a-gemini-powered-coding-agent-for-designing-advanced-algorithms/) — 厂商文章
- [AlphaEvolve results repository](https://github.com/google-deepmind/alphaevolve_results) — 发现的算法，包括 48 乘 4x4 matmul
- [Romera-Paredes et al. (2023). Mathematical discoveries from program search with LLMs (FunSearch)](https://www.nature.com/articles/s41586-023-06924-6) — 前身系统
- [Anthropic — Responsible Scaling Policy v3.0 (Feb 2026)](https://anthropic.com/responsible-scaling-policy/rsp-v3-0) — 将评估器约束自主性框架为关键研究方向
