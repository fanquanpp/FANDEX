---
title: LLM的差分隐私
description: 'DP-SGD仍是标准——噪声注入梯度更新提供形式化(epsilon, delta)保证。LoRA+DP-SGD是2025年常见配置。金丝雀MIAvs训练数据提取给出不同图景：2025年3月解决方案揭示两者测量不同东西。PMixED提供推理时私有预测替代方案。DP逆转攻击通过置信度分数泄露隐私。'
module: 'ai-ethics'
difficulty: advanced
tags:
  - 差分隐私
  - 'DP-SGD'
  - LoRA
  - 成员推理
  - 金丝雀
  - PMixED
related:
  - 'ai-ethics/Constitutional-AI与RLAIF'
  - 'ai-ethics/EchoLeak与AI的CVE时代'
  - 'ai-ethics/Mesa优化与欺骗性对齐'
  - 'ai-ethics/Sleeper-Agents与持久欺骗'
prerequisites:
  - 'ai-ethics/谄媚作为RLHF放大器'
---

## 问题定义

LLM会记忆。Carlini等人2021年表明生产语言模型按需复现逐字训练文本。DP是形式化防御：训练使得输出对任何单个训练样本证明不敏感。2024-2025年证据表明DP-SGD是必要的，但部署的epsilon值可能不匹配威胁模型。

## 核心概念

### (epsilon, delta)-差分隐私

随机算法M是(epsilon, delta)-DP的，如果对任何相差一个样本的两个数据集和任何事件S：
P(M(D) in S) <= e^epsilon \* P(M(D') in S) + delta。

解释：输出分布足够接近（由epsilon参数化），使得任何单个个体的贡献不能被可靠推断，除非概率为delta。

### DP-SGD

Abadi等人2016。标准方案：

1. 采样小批量。
2. 计算逐样本梯度。
3. 将每个逐样本梯度裁剪到阈值C。
4. 求和裁剪后的梯度并添加标准差为sigma\*C的高斯噪声。
5. 使用噪声和更新参数。

隐私成本由会计器追踪（Moments Accountant, Renyi DP accountant）。LLM文献中报告的epsilon值因威胁模型、数据敏感性和效用目标而差异很大；没有普遍"安全"的默认epsilon。已发表示例在某些LLM训练设置中跨度约为epsilon约1-10，但这些是说明性的——不是推荐默认值。较低的epsilon通常需要更多噪声并可能增加效用损失。

### LoRA + DP-SGD

前沿模型的完整DP-SGD是禁止性的。LoRA (Hu等人2022)将梯度更新限制在小型适配器，减少逐样本梯度存储。LoRA + DP-SGD是2025年常见配置。DP保证适用于适配器；基础模型保持固定。

### 2024-2025年张力

两条证据线：

- **金丝雀MIA (Duan等人2024)。** 在训练数据中插入唯一金丝雀，测量成员推理攻击者能否识别它们。报告对语言模型成功率有限。暗示MIA困难。
- **训练数据提取(Carlini 2021, Nasr等人2025)。** 用前缀提示模型；测量是否恢复训练中的逐字文本。报告大量记忆。暗示MIA在相关意义上容易。

2025年3月解决方案(arXiv:2503.06808)：两者测量不同东西。MIA问"样本e在D中吗？"针对插入的金丝雀。提取问"我能恢复D的什么？"对隐私重要的是"最可提取"的样本；金丝雀低估了这一点，因为它们未被优化为可提取。

新金丝雀设计。无需影子模型的基于损失的MIA。首次在真实数据上以现实DP保证对LLM的非平凡DP审计。

### DP训练的替代方案

- **PMixED (arXiv:2403.15638)。** 推理时私有预测。下一token分布上的专家混合；每个专家看到训练数据的一个分片；聚合添加噪声以实现DP。完全避免DP训练。
- **DP合成数据生成(Google Research 2024)。** 用DP-SGD进行LoRA微调，采样合成数据，在合成数据上训练下游分类器。

两者以不同威胁模型为代价规避完整DP训练的效用成本。

### 通过LLM反馈的DP逆转

2025年新兴攻击。使用DP训练模型的置信度分数作为预言机来重新识别个体。即使输出不泄露，置信度分布也可能泄露。

防御：不暴露置信度，或在暴露前截断/量化。这是(epsilon, delta)-DP训练之外的额外要求。

## 关键术语

| 术语          | 常见说法                    | 实际含义                                  |
| ------------- | --------------------------- | ----------------------------------------- |
| DP            | "(epsilon, delta)-差分隐私" | 形式化隐私：相邻数据集变化下输出分布接近  |
| DP-SGD        | "噪声注入SGD"               | 梯度裁剪+高斯噪声添加；标准DP训练         |
| LoRA + DP-SGD | "高效私有微调"              | 低秩适配器上的DP-SGD；2025年标准配置      |
| MIA           | "成员推理"                  | 确定样本是否在训练数据中的攻击            |
| Canary        | "插入水印样本"              | 用于测量DP泄露的唯一训练样本              |
| PMixED        | "私有推理混合"              | 通过下一token分布上的专家混合实现推理时DP |
| DP Reversal   | "置信度泄露攻击"            | 使用模型置信度作为重新识别预言机的攻击    |

## 延伸阅读

- Abadi et al. — DP-SGD (arXiv:1607.00133) — 标准DP训练算法
- Carlini et al. — Extracting Training Data (arXiv:2012.07805) — 经典提取论文
- Duan et al. — Canary MIA on LLMs (arXiv:2402.07841, 2024) — 有限成功MIA
- Kowalczyk et al. — Auditing DP for LLMs (arXiv:2503.06808, March 2025) — 张力解决方案
- PMixED (arXiv:2403.15638) — 推理时私有预测
