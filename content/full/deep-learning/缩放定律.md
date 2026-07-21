---
title: 缩放定律
description: '2020年Kaplan论文说模型越大损失越低,2022年Hoffmann论文说你训练不足,计算分两个桶——参数和token——分配并不显然'
module: 'deep-learning'
difficulty: intermediate
tags:
  - 缩放定律
  - Chinchilla
  - 训练优化
  - 参数量
  - 计算预算
related:
  - 'deep-learning/视觉Transformer'
  - 'deep-learning/损失函数'
  - 'deep-learning/推测解码'
  - 'deep-learning/完整Transformer'
prerequisites:
  - 'deep-learning/深度学习概述'
---

# 缩放定律

> 2020年Kaplan论文说:模型越大,损失越低。2022年Hoffmann论文说:你训练不足。计算分两个桶——参数和token——分配并不显然。

**类型:** 学习
**语言:** Python
**前置知识:** 阶段7 · 05(完整Transformer), 阶段7 · 07(GPT)
**预计时间:** ~45分钟

## 问题所在

当你有C FLOPs的训练计算并想要最好的模型时,你面对两个旋钮:

1. **多少参数(N)?** 更大的模型,更高的容量。
2. **多少训练token(D)?** 更多数据,更好地利用容量。

FLOPs大约按 `6 × N × D` 扩展。你可以推高N降低D,或推高D降低N。哪个更好?

2022年之前,答案是"大力推N"。GPT-3(2020)是175B参数,在约300B token上训练。大约每参数1.7个token的比率。Kaplan缩放定律支持这一点。

Hoffmann et al. (2022),训练了一个叫做Chinchilla的小模型家族,发现了不同的东西:最优比率接近**每参数20个token**。GPT-3训练不足10倍。Chinchilla(70B参数, 1.4T token)在每个基准上击败GPT-3(175B, 300B token),推理成本低2.5倍。

2026年是Chinchilla的世界——但有一个重要的转折。Llama 3 8B在15万亿token上训练,比率为每参数1,875个token。超过Chinchilla最优94倍。对于将大规模使用的模型,推理成本比训练成本更重要,所以过度训练(超过Chinchilla)以获得更小的可部署足迹是2026年的默认。

## 核心概念

### Hoffmann定律

来自Chinchilla论文,损失遵循:

```
L(N, D) = A / N^α + B / D^β + E
```

- `N` = 参数(非嵌入)。
- `D` = 训练token。
- `α ≈ 0.34`, `β ≈ 0.28`(大致对称)。
- `E ≈ 1.69`,不可约损失上限。
- `A ≈ 406`, `B ≈ 411`。

两项在扩展时相互权衡。在固定计算(C = 6ND)下对 `N` 求导并求解:

```
N_opt ≈ 0.6 × (C/6)^0.5
D_opt ≈ 0.6 × (C/6)^0.5
D_opt / N_opt ≈ 20
```

计算最优:每参数20个token。

### 为什么仍然过度训练

Chinchilla最优最小化每训练FLOP的训练损失。但你支付训练成本一次;推理成本永远。

对于每月服务万亿token的聊天机器人,推理主导总成本。Llama的方法:训练更小,更长。8B在15T token上深度推理优化:

- 适合消费级GPU。
- 延迟是70B Chinchilla最优的一小部分。
- 质量对大多数任务足够接近。

DeepMind 2024年的论文("过度训练是新的最优")形式化了这一点。对于推理主导的工作负载,正确的比率接近每参数100-500个token,取决于服务量。

### 涌现 vs 平滑性

声称:某些能力(算术、多步推理、思维链跟随)在某个规模"涌现"突然出现。

Schaeffer et al. (2023)认为这是测量伪影:涌现指标使用不连续评分(精确匹配、阈值准确率),隐藏了底层logits中的平滑改善。连续指标(交叉熵)显示平滑曲线。

2026年的共识是:通过连续损失的预测是可靠的。基准跳跃通常是评分器伪影。根据连续指标规划预算。

### 2026年的图景

缩放定律仍然有效,但:

| 因素     | 如何改变                                           |
| -------- | -------------------------------------------------- |
| 数据质量 | 策划"好"的token(Phi风格)将曲线移动>2倍有效计算     |
| MoE      | 总参数与活跃FLOPs解耦;缩放定律按活跃FLOPs          |
| 后训练   | 一些能力(指令跟随, 代码)随SFT+RLHF变化比预训练更大 |
| 多模态   | 图像 + 文本token一起缩放;每种模态单独曲线          |
| 合成数据 | 模型生成训练数据;有效计算可以复合                  |

Muon优化器(Kimi Moonlight, 2024)在匹配数据下显示比AdamW约2倍有效计算增益。一些2026年训练运行默认使用Muon。改变缩放定律的绝对常数,而非其形状。

## 动手构建

参见 `code/main.py`。我们实现Chinchilla损失方程,并在多个计算预算下求解计算最优 `(N, D)`。

### 步骤1:Chinchilla损失

```python
def chinchilla_loss(N, D, A=406.4, B=410.7, alpha=0.34, beta=0.28, E=1.69):
    return A / N ** alpha + B / D ** beta + E
```

在固定 `C = 6ND` 下绘制 `L` 作为 `(N, D)` 的等高线。找到最小值。

### 步骤2:计算最优前沿

对于从 `1e17` 到 `1e25` FLOPs的计算预算,找到在 `6ND = C` 约束下最小化损失的 `(N, D)`。验证比率 `D/N ≈ 20`。

### 步骤3:过度训练成本

计算训练10倍更小模型(最优N的1/10, 10倍最优D)所支付的额外损失。报告推理FLOP节省(与N成正比)作为交换。

### 步骤4:与真实模型比较

代入GPT-3, Chinchilla, Llama 3 8B, DeepSeek-V3(活跃参数)的已知 `(N, D)` 对,比较预测 vs 报告的损失。

## 实际应用

你不太可能自己训练前沿模型。但缩放定律告诉你:

1. **你的微调是否有足够数据。** 如果你的任务特定数据低于基础模型每参数20个token,预期在某个损失下限饱和。
2. **是否选择更大的基础模型。** 如果你把所有预算花在推理上,选择更小、训练更长的模型。
3. **收益在哪里递减。** 超过1000倍Chinchilla最优后,log-loss变化变成噪声。

**2026年的研究轨迹:**

- **数据受限体制。** 网络有有限数量的高质量token(过滤后约5-10万亿英文)。前沿预训练正接近这个上限。合成数据、多语言、多模态和RLHF缩放微调是下一个杠杆。
- **计算倍增技巧。** Muon优化器, MoE, 更好的数据策展——每个都移动绝对常数,而非渐近线。
- **RL的缩放定律。** 开放问题。早期证据表明RL样本中有幂律,但指数与预训练非常不同。

## 交付成果

参见 `outputs/skill-training-budget-estimator.md`。该技能根据计算预算、部署约束和目标损失为新训练运行选择 `(N, D, hours, GPU)`。

## 练习

1. **简单。** 运行 `code/main.py`。打印计算预算 `1e20`, `1e22`, `1e24` 的Chinchilla最优 `(N, D)`。与真实模型表比较。
2. **中等。** 实现Hoffmann损失作为计算函数的曲线。绘制计算最优前沿的损失 vs `log10(C)`。确定定律预测何时需要 `>10^28` FLOPs才能使交叉熵再降0.1。
3. **困难。** 在5个微型模型(100K到10M参数)上拟合你自己的缩放定律,在相同数据集上训练。估计 `α` 和 `E`。你的指数与已发表值匹配程度如何?

## 关键术语

| 术语           | 人们怎么说         | 实际含义                                      |
| -------------- | ------------------ | --------------------------------------------- |
| 参数(N)        | "模型大小"         | 非嵌入权重数量;决定容量。                     |
| Token(D)       | "训练数据"         | 看到的训练token数量;决定参数被多好利用。      |
| 计算(C)        | "花费的FLOPs"      | 标准transformer大约为 `6 × N × D`。           |
| Chinchilla最优 | "D/N ≈ 20"         | 最小化每预训练FLOP损失的比率。                |
| 过度训练       | "超过Chinchilla"   | 花费额外训练FLOPs以节省推理FLOPs; D/N >> 20。 |
| 不可约损失     | "地板"             | 缩放定律中的 `E` 项;数据本身的熵。            |
| 涌现能力       | "规模上的突然跳跃" | 通常是评分器伪影;连续损失是平滑的。           |
| 有效计算       | "训练效率乘数"     | 更好的数据/优化器/架构乘以一个FLOP能走多远。  |

## 延伸阅读

- [Kaplan et al. (2020). Scaling Laws for Neural Language Models](https://arxiv.org/abs/2001.08361) — 第一篇缩放定律论文;训练不足。
- [Hoffmann et al. (2022). Training Compute-Optimal Large Language Models](https://arxiv.org/abs/2203.15556) — Chinchilla。
- [Schaeffer et al. (2023). Are Emergent Abilities of Large Language Models a Mirage?](https://arxiv.org/abs/2304.15004) — 涌现作为测量伪影。
- [Sardana, Frankle (2024). Beyond Chinchilla-Optimal: Accounting for Inference in Language Model Scaling Laws](https://arxiv.org/abs/2401.00448) — 为什么Llama的过度训练对其工作负载是正确的。
- [Jordan et al. (2024). Muon: An optimizer for hidden layers in neural networks](https://kellerjordan.github.io/posts/muon/) — 2倍计算乘数。
