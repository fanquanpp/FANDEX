---
title: 思维树与LATS
description: '单条思维链轨迹没有回溯的空间。ToT（Yao等人，2023）将推理变成带有每个节点自评估的树。LATS（Zhou等人，2024）在蒙特卡洛树搜索下统一了ToT、ReAct和Reflexion。Game of 24从4%（CoT）提升到74%（ToT）；LATS在HumanEval上达到92.7...'
module: agent
related:
  - agent/生成式Agent与涌现模拟
  - agent/失败模式MAST与群体思维
  - agent/提示注入防御
  - agent/通信协议
prerequisites:
  - agent/概述与架构
---

# 思维树与LATS：审慎搜索

> 单条思维链轨迹没有回溯的空间。ToT（Yao等人，2023）将推理变成带有每个节点自评估的树。LATS（Zhou等人，2024）在蒙特卡洛树搜索下统一了ToT、ReAct和Reflexion。Game of 24从4%（CoT）提升到74%（ToT）；LATS在HumanEval上达到92.7% pass@1。

**类型：** 构建
**语言：** Python (stdlib)
**前置条件：** Phase 14 · 01 (Agent循环), Phase 14 · 03 (Reflexion)
**时间：** ~75分钟

## 学习目标

- 将推理框架为搜索：节点是"思维"，边是"扩展"，值是"有希望程度"。
- 实现一个stdlib ToT风格的BFS树搜索，带有自评估评分。
- 扩展到玩具LATS MCTS循环，包含select/expand/simulate/backpropagate。
- 决定何时搜索值得token倍增器（Game of 24、代码生成），何时单条轨迹就够了（简单问答）。

## 问题所在

思维链是线性行走。如果第一步错了，每个后续步骤都在错误前提上工作。在Game of 24（用四个数字和+ − × ÷凑出24）上，GPT-4 CoT达到4%准确率。模型在早期选择了错误的子表达式，无法恢复。

推理需要的是提出多个候选、评估它们、选择有希望的、在死胡同时回溯的能力。这就是搜索。思维树和LATS是两个经典的表述。

## 核心概念

### 思维树（Yao等人，NeurIPS 2023）

每个节点是一个连贯的中间步骤（"一个思维"）。每个节点可以扩展为K个子思维。LLM用评分提示自评估每个节点。搜索探索树——BFS、DFS或beam。

```
                     (root: "find 24 from 4 6 4 1")
                    /               |            \
           ("6 - 4 = 2")    ("4 + 1 = 5")    ("4 * 6 = 24")  <- Score: HIGH
              /   \              |                  |
          ...    ...          ...                finish
```

自评估是承重部分。论文展示了三种变体：`sure / likely / impossible`分类、`1..10`数值评分和候选投票。三种都在Game of 24上大幅击败CoT（4% -> 74%，使用GPT-4）。

### LATS（Zhou等人，ICML 2024）

LATS在MCTS下统一了ToT、ReAct和Reflexion。LLM扮演三个角色：

- **策略**：提出候选下一步行动（ReAct风格）。
- **价值函数**：评分部分轨迹（ToT风格的自评估）。
- **自反思器**：失败时，写一段自然语言反思（Reflexion风格）并用它重新播种未来的rollout。

环境反馈（观察）混入价值函数，使搜索由真实工具结果而非仅模型意见指导。论文时的结果：HumanEval pass@1 92.7%（GPT-4，SOTA），WebShop平均75.9（GPT-3.5，接近基于梯度的微调）。

### MCTS，最小版本

每次迭代四个阶段：

1. **选择** — 使用UCT（树的上置信界）从根走到叶。
2. **扩展** — 通过策略生成K个子节点。
3. **模拟** — 从子节点使用策略rollout，用价值函数（或环境奖励）评分叶节点。
4. **回传** — 沿路径向上更新访问计数和价值估计。

UCT公式：`Q(s, a) + c * sqrt(ln N(s) / N(s, a))`。第一项是利用；第二项是探索。按任务调整`c`。

### 成本现实

搜索爆炸token。ToT在Game of 24上使用CoT的100-1000倍token。LATS类似。这不是免费的；将搜索保留给：

- 单条轨迹明显不足的任务（Game of 24、复杂代码）。
- 正确性比挂钟时间更重要的任务。
- 有廉价可靠价值函数的任务（代码的单元测试、数学的显式目标）。

如果你的任务有单一正确答案和嘈杂的评估器，搜索往往使事情更糟——它找到一个"高分"的错误答案。

### 2026年定位

大多数生产Agent不运行LATS。它们运行带工具接地验证的ReAct（CRITIC，第05课）。搜索出现在专门领域：

- 以测试作为价值函数的编码Agent（HumanEval风格）。
- 探索多个查询路径的深度研究Agent。
- LangGraph子图内的重规划工作流。

AlphaEvolve（第11课）是2025年的极端：代码上的进化搜索、机器可检查的适应度、前沿突破（56年来首个4x4矩阵乘法改进）。

## 构建它

`code/main.py`实现：

- 一个微型ToT BFS在风格化的"选择算术运算"任务上。
- 一个玩具LATS MCTS循环在相同任务上（Select/Expand/Simulate/Backpropagate），带UCT选择。
- 一个组合符号分数加自评估分数的价值函数。

运行：

```
python3 code/main.py
```

跟踪显示ToT用BFS每节点扩展三个候选，与LATS通过MCTS收敛到最佳rollout的比较。两者都打印token计数。

## 使用它

LangGraph将ToT风格探索作为子图模式提供；LangChain团队关于LATS的博客（2024年5月）是参考教程。LlamaIndex提供`TreeOfThoughts` Agent。对于大多数2026年生产Agent，此模式存在于`if task_complexity > threshold: use_search()`门后面——见第05课的评估器-优化器模式。

## 发布它

`outputs/skill-search-policy.md`根据任务形状、预算和评估器保真度，在线性ReAct、ToT、LATS和进化搜索之间选择。

## 练习

1. 用UCT c=0.1 vs c=2.0运行玩具LATS。跟踪中有什么变化？
2. 将价值函数替换为更嘈杂的评分器（添加随机抖动）。MCTS还能找到最佳叶节点吗？它能容忍的最小信噪比是多少？
3. 实现beam搜索ToT（每层保留top-k）并与BFS比较。在紧凑的token预算下哪个更好？
4. 阅读LATS第5.1节。复现HumanEval轨迹计数：达到报告的pass@1需要多少次rollout？
5. 阅读LATS论文关于"当LATS帮助较少时"的讨论。写一段决策规则，将任务形状映射到搜索策略。

## 关键术语

| 术语     | 人们常说的       | 实际含义                                       |
| -------- | ---------------- | ---------------------------------------------- |
| 思维树   | "分支CoT"        | Yao等人 — 带自评估的思维节点树                 |
| LATS     | "LLM的MCTS"      | Zhou等人 — 在MCTS下统一ToT + ReAct + Reflexion |
| UCT      | "上置信界"       | 平衡利用(Q)和探索(ln N / n)的选择公式          |
| 价值函数 | "这个状态有多好" | 提示的LLM分数或环境奖励；馈入回传              |
| 策略     | "动作提出器"     | ReAct风格生成器；发出候选下一步思维/动作       |
| Rollout  | "模拟轨迹"       | 从节点使用策略走到叶节点，用价值函数评分       |
| 回传     | "更新祖先"       | 将叶节点的奖励沿路径向上推，更新访问计数和Q    |
| 搜索成本 | "Token爆炸"      | Game of 24上CoT的100-1000倍；采用前先预算      |

## 延伸阅读

- [Yao等人, Tree of Thoughts (arXiv:2305.10601)](https://arxiv.org/abs/2305.10601) — 经典论文
- [Zhou等人, LATS (arXiv:2310.04406)](https://arxiv.org/abs/2310.04406) — 带Reflexion反馈的MCTS
- [LangGraph概述](https://docs.langchain.com/oss/python/langgraph/overview) — 搜索的子图模式
- [AlphaEvolve (arXiv:2506.13131)](https://arxiv.org/abs/2506.13131) — 带程序化评估器的进化搜索
