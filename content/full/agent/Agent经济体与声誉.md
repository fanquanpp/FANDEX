---
title: Agent经济体与声誉
description: '长时间范围自主 Agent (METR 的 1 小时到 8 小时工作曲线) 需要经济主体能力。新兴的 5 层栈 是：DePIN (物理计算) → 身份 (W3C DID + 声誉资本) → 认知 (RAG + MCP) → 结算 (账户抽象) → 治理 (Agentic DAO)。生产 Age...'
module: agent
related:
  - agent/Agent工作台为何模型失败
  - agent/Agent工作台项目
  - agent/Agent可观测性平台
  - agent/Agent失败模式
prerequisites:
  - agent/概述与架构
---

# Agent 经济体、Token 激励、声誉

> 长时间范围自主 Agent (METR 的 1 小时到 8 小时工作曲线) 需要经济主体能力。新兴的 **5 层栈** 是：**DePIN** (物理计算) → **身份** (W3C DID + 声誉资本) → **认知** (RAG + MCP) → **结算** (账户抽象) → **治理** (Agentic DAO)。生产 Agent 激励网络包括 **Bittensor** (TAO 子网奖励任务特定模型)、**Fetch.ai / ASI Alliance** (ASI-1 Mini LLM + FET token) 和 **Gonka** (基于 Transformer 的 PoW，将计算重新分配给生产性 AI 任务)。学术工作：AAMAS 2025 的去中心化 LaMAS 使用 **Shapley 值信用归因**公平奖励贡献 Agent；Google Research "大型语言模型的机制设计"提出在单调聚合下的 **Token 拍卖**与第二价格支付。本课程构建最小 Agent 市场，将 Shapley 值信用归因应用于多 Agent 流水线，并运行第二价格 Token 拍卖，使博弈论机制具体落地。

**类型：** 学习
**语言：** Python (stdlib)
**前置条件：** Phase 16 · 16 (协商与讨价还价), Phase 16 · 09 (并行群体网络)
**时间：** ~75 分钟

## 问题

多 Agent 系统在 Agent 联合产生价值但需要单独奖励时变得复杂。经典机制——均分、最后贡献者全拿——不公平或可博弈。基于联盟的 Shapley 值奖励按构造公平但计算昂贵。2025-2026 年文献推动了有用的近似：Shapley 采样、单调聚合拍卖和来自确认贡献的链上声誉累积。

超越信用归因，该领域已经转向实际的经济 Agent：Bittensor TAO 奖励挖掘计算以微调子网特定模型，Fetch.ai/ASI 奖励 ASI-1 Mini LLM 使用与 FET token，Gonka 将 Transformer 工作量证明重新分配给生产性 AI 任务。自主交易的 Agent 今天就存在；问题是如何对齐激励。

本课程将 Agent 经济体视为特定问题族——信用归因、机制设计和声誉——并用最少的数学构建每个，使想法深入人心。

## 概念

### 5 层 Agent 经济栈

1. **DePIN (物理计算)。** 租用 GPU、存储、带宽的去中心化基础设施。Bittensor 子网、Render Network、Akash。不是 Agent 特定的；Agent 使用它。
2. **身份。** W3C 去中心化标识符 (DID) 给每个 Agent 一个独立于任何平台的持久 ID。声誉累积到 DID。Agent Network Protocol (ANP) 使用 DID 作为发现层。
3. **认知。** Agent 的推理循环：LLM + RAG + MCP。这是其他阶段构建的。
4. **结算。** 账户抽象 (ERC-4337) 让 Agent 从自己的余额支付 gas，无需持有 ETH。Agent 可以为服务、彼此或计算付费。
5. **治理。** Agentic DAO：人类 _和_ Agent 投票协议变更的治理结构，投票权与声誉挂钩。

不是每个生产系统都使用全部五层。Bittensor 使用 1, 2, 部分 3, 部分 4, 没有 5。OpenAI Agent 只使用 3。该栈是参考地图，不是要求。

### Bittensor, Fetch.ai, Gonka — 什么在运行

**Bittensor (TAO)。** 子网是专门任务（语言建模、图像生成、预测）。矿工提交模型输出。验证者排名；质押加权评分分配 TAO 奖励。每个子网有自己的评估。经济教训：为任务特定的输出质量付费，不是使用的计算。

**Fetch.ai / ASI Alliance。** ASI-1 Mini LLM 在 Fetch.ai 网络上运行；用户支付 FET token 进行推理。Agent 作为对等体的叙事在这里更强：Fetch 上的 Agent 可以调用另一个 Agent 执行任务并用 FET 支付。

**Gonka。** Transformer 工作量证明："工作"是 Transformer 的前向传播。矿工通过运行有已知正确输出（来自训练数据）的推理任务赚取。资源生产性 PoW 而非基于哈希的 PoW。

截至 2026 年 4 月，三者都是生产级的。收益分配不同。Bittensor 相对子网验证者奖励质量；Fetch 奖励由付费用户衡量的效用；Gonka 奖励可验证的推理工作。

### Shapley 值信用归因

三个 Agent 合作完成任务。输出得分 0.8。谁贡献了什么？

Shapley 值：满足四个公理（效率、对称性、线性、零玩家）的唯一信用分配。对于 Agent `i`：

```
shapley(i) = (1/N!) * sum over all orderings O of (v(S_i_O ∪ {i}) - v(S_i_O))
```

其中 `S_i_O` 是排序 `O` 中 `i` 之前的 Agent 集合。实践中：枚举所有排列，记录每个 Agent 在每个排列中的边际贡献，取平均。

对于 N=3 个 Agent，有 6 种排列。对于 N=10，360 万种——所以实践中你采样排列而不是枚举。

### 聚合的第二价格拍卖

Google Research ("大型语言模型的机制设计") 提出用于聚合 LLM 输出的第二价格 Token 拍卖。设置：N 个 Agent 各自提议一个完成；每个对被选中有一个私人价值。拍卖者选择最高价值的提议并支付*第二高*的价值。在单调聚合下（价值取决于选择哪个提议，不是有多少出价），这是真实的——Agent 出价其真实价值。

为什么这对 LLM 系统重要：你可以将完成任务外包给多个不同定价的 Agent；拍卖选择最佳 + 公平支付，Agent 没有动机虚报。

### 声誉资本

DID 绑定的声誉分数从确认贡献中累积。简单更新规则：

```
rep(i, t+1) = alpha * rep(i, t) + (1 - alpha) * contribution_quality(i, t)
```

衰减因子 `alpha` 接近 1。声誉：

- 读取便宜，用于路由决策（"将困难任务发送给高声誉 Agent"）。
- 伪造昂贵（随时间累积，绑定到 DID）。
- 可以被削减：未通过验证的贡献被扣除。

### AAMAS 2025 去中心化 LaMAS

LaMAS 提案 (AAMAS 2025) 结合：DID 身份、Shapley 值信用归因和简单拍卖机制。关键主张：去中心化信用归因步骤使系统可审计且免疫单点操纵。

### 经济体在哪里崩溃

- **价格预言机操纵。** 如果信用函数可以被博弈，Agent 就会博弈它。每个机制都需要对抗性测试。
- **女巫攻击。** 一个运营者启动 N 个假 Agent 来膨胀自己的贡献。DID 减缓但不能阻止这一点；声誉伪造成本是缓解措施。
- **验证成本。** 信用归因只和验证者一样公平。如果验证便宜（小 LLM），它可以被博弈；如果昂贵（人工小组），系统不可扩展。
- **监管悬垂。** Agent 经济体与金融监管交叉。截至 2026 年，Bittensor、Fetch 和 Gonka 在某些司法管辖区都在法律灰色地带运营。

### Agent 经济体何时有意义

- **异质运营者的开放网络。** 没有单一团队控制所有 Agent。
- **可验证输出。** 没有验证，信用归因是猜测。
- **长时间范围工作流。** 一次性任务不受益于声誉累积。
- **Token 化支付在你的司法管辖区法律可行。**

在封闭的企业系统中，经济让位于更简单的分配（管理者分配工作，指标是内部的）。经济文献主要适用于开放网络。

## 构建它

`code/main.py` 实现：

- `shapley(value_fn, agents)` — 小 N 的精确 Shapley 计算（枚举）。
- `second_price_auction(bids)` — 真实机制；获胜者支付第二高价。
- `Reputation` — 带指数衰减和削减的 DID 绑定声誉。
- 演示 1：三个 Agent 合作，精确 Shapley 归因信用。
- 演示 2：五个 Agent 竞标任务槽；第二价格拍卖选择获胜者 + 支付。
- 演示 3：100 轮任务分配给异质声誉 Agent；声誉加权路由击败随机。

运行：

```
python3 code/main.py
```

预期输出：每个 Agent 的 Shapley 值；拍卖结果显示真实出价均衡；声誉加权路由在热身后显示相对随机 10-20% 的质量增益。

## 使用它

`outputs/skill-economy-designer.md` 设计最小 Agent 经济体：身份层选择、信用归因机制、支付机制、声誉规则。

## 发布它

2026 年运行 Agent 经济体：

- **从声誉开始，不是 Token。** 声誉实现便宜且单独就有价值；Token 增加法律和经济复杂性。
- **先验证再奖励。** 永远不要在没有独立验证步骤的情况下分配信用。自报告质量会产生女巫博弈。
- **Shapley 采样，不是 Shapley 精确。** 采样 100-1000 个排列；精确枚举不可扩展。
- **限制衰减因子和声誉下限。** 无界衰减抹杀合法贡献者；太慢的衰减奖励陈旧的高声誉 Agent。
- **对抗性审计机制。** 在开放网络之前运行红队场景。每个机制都有博弈论；你想找到漏洞，不是让攻击者找到。

## 练习

1. 运行 `code/main.py`。确认 Shapley 值总和等于总价值（效率公理）。改变值函数；Shapley 分配是否按预期方向变化？
2. 实现 Shapley _采样_（K 个排列的蒙特卡洛）。K 如何影响近似精度？与 N=4 的精确比较。
3. 在拍卖前实现联盟形成步骤：Agent 可以合并成团队并作为单位竞标。形成哪些联盟？结果是否帕累托优于个人竞标？
4. 阅读 Google Research 机制设计帖子。识别一个假设，如果违反会破坏真实性。那个失败模式在 LLM 设置中看起来像什么？
5. 阅读 AAMAS 2025 去中心化 LaMAS 论文。在合成任务上对 10 个 Agent 实现他们的 Shapley 步骤。精确计算需要多长时间？100 次采样的近似有多接近？

## 关键术语

| 术语                 | 人们怎么说             | 实际含义                                               |
| -------------------- | ---------------------- | ------------------------------------------------------ |
| DePIN                | "去中心化物理基础设施" | Token 激励的计算/存储/带宽。Bittensor, Akash, Render。 |
| DID                  | "去中心化标识符"       | 便携 ID 的 W3C 规范。Agent 声誉绑定到 DID，不是平台。  |
| ERC-4337             | "账户抽象"             | 可以赞助 gas 的合约账户，启用 Agent 支付。             |
| Shapley 值           | "公平信用归因"         | 满足效率、对称性、线性、零玩家的唯一分配。             |
| 第二价格拍卖         | "Vickrey 拍卖"         | 真实机制：获胜者支付第二高出价。单调聚合兼容。         |
| 声誉资本             | "累积质量分数"         | 来自确认贡献的 DID 绑定分数；随时间衰减。              |
| Agentic DAO          | "Agent + 人类治理"     | Agent 投票者为一等公民的 DAO，投票权与声誉挂钩。       |
| TAO / FET / GPU 积分 | "Token 面额"           | Bittensor TAO, Fetch.ai FET, 各种 DePIN token。        |

## 延伸阅读

- [The Agent Economy](https://arxiv.org/abs/2602.14219) — 2026 年 5 层 Agent 经济栈综述
- [Google Research — Mechanism design for large language models](https://research.google/blog/mechanism-design-for-large-language-models/) — 单调聚合下的 Token 拍卖
- [AAMAS 2025 — decentralized LaMAS](https://www.ifaamas.org/Proceedings/aamas2025/pdfs/p2896.pdf) — Shapley 值信用归因
- [Bittensor TAO documentation](https://docs.bittensor.com/) — 子网结构和奖励分配
- [Fetch.ai / ASI Alliance](https://fetch.ai/) — ASI-1 Mini LLM 和 FET token
- [W3C Decentralized Identifiers (DIDs) spec](https://www.w3.org/TR/did-core/) — 身份基础
