---
title: '具身VLA：RT-2、OpenVLA、pi0与GR00T'
description: '理解视觉-语言-动作模型的演进，从离散动作token到流匹配动作专家'
module: multimodal
difficulty: advanced
tags:
  - VLA
  - 机器人
  - 'RT-2'
  - OpenVLA
  - pi0
  - GR00T
  - 动作分词
related:
  - multimodal/多模态Agent与计算机使用
  - multimodal/多模态RAG与跨模态检索
  - multimodal/开源VLM方案
  - 'multimodal/全能模型Thinker-Talker架构'
prerequisites:
  - multimodal/多模态Agent与计算机使用
---

# 具身VLA：RT-2、OpenVLA、pi0与GR00T

> 模型第一次从网站读取食谱并在厨房机器人上执行是RT-2 (Google DeepMind, 2023年7月)。RT-2将动作离散化为文本token，在Web数据加机器人动作数据上共同微调VLM，证明了Web级视觉-语言知识可以迁移到机器人控制。OpenVLA (2024年6月)发布了开放7B参考。Physical Intelligence的pi0系列(2024-2025)添加了流匹配动作专家。NVIDIA的GR00T N1 (2025年3月)为人形机器人规模交付了双系统(System 1 / System 2)控制。VLA原语——视觉-语言-动作，一个能看、读、行动的单一模型——是本阶段理解模型与Phase 15自主系统之间的桥梁。

**类型:** 学习
**语言:** Python (stdlib, 动作分词器 + VLA推理骨架)
**前置知识:** Phase 12 · 05 (LLaVA), Phase 15 (自主系统，参考)
**时间:** ~180分钟

## 学习目标

- 描述动作分词化：离散bin编码(RT-2)、FAST高效动作token、连续流匹配动作(pi0)。
- 解释为什么在Web + 机器人数据上共同微调保留了对新任务的通用知识迁移。
- 比较OpenVLA(开放7B Llama+VLM)、pi0(流匹配)和GR00T N1(双系统)在相同机器人任务上的表现。
- 说出Open X-Embodiment数据集及其作为RT-X训练语料的角色。

## 问题

从自然语言指令做家务的机器人自1970年代以来就是研究目标。2020年代的答案：视觉-语言-动作(VLA)模型。与VQA使用的相同VLM架构，但输出是动作(关节力矩、末端执行器位姿、离散命令)而非文本。

VLA特有挑战：

1. 动作空间是连续的(关节角度、力)且高维(7自由度臂 + 3自由度夹爪 = 30 Hz下10维)。
2. 机器人特定训练数据稀缺。Open X-Embodiment约100万轨迹；Web文本-图像50亿+。
3. 控制频率很重要。30 Hz控制循环意味着每个动作33ms预算。
4. 安全性。错误动作损坏硬件、人员或财产。

## 概念

### 动作分词化(RT-2)

RT-2的技巧：将每个关节目标表示为量化文本token。将归一化[-1, 1]范围离散化为256个bin，每个bin映射到词表ID。10自由度动作在每个控制步骤变为10个token。

在混合数据上共同微调PaLM-X VLM：

- Web图像-文本对(标题生成、VQA)。
- 机器人演示，动作作为token。

模型看到"拿起红色方块"(语言) → 图像(视觉) → 10 token动作序列(离散化关节目标)。Web预训练保留通用知识迁移：RT-2可以遵循"向快速移动的物体移动"，即使"快速移动"不在训练数据中。

RT-2论文中推理3-5 Hz，受VLM自回归解码限制。

### OpenVLA — 开放7B参考

OpenVLA (Kim等人, 2024年6月)是开放权重的RT-2等价物。7B Llama骨干，DINOv2 + SigLIP双视觉编码器，256 bin上的动作分词化。

在Open X-Embodiment(22个机器人97万轨迹)上训练。附带LoRA微调支持以适配新机器人。

推理：A100上量化后4-5 Hz。对慢速操作足够，对高频控制不够。

### FAST分词器 — 更快动作解码

Pertsch等人(2024)表明离散bin分词化效率低——大多数动作聚集在bin空间的小区域。FAST(频域动作序列分词器)通过DCT压缩动作序列并量化系数。

30步动作轨迹变为约10个FAST token而非300个离散bin token。推理加速3-5倍无质量损失。

### pi0与流匹配动作

Physical Intelligence的pi0 (Black等人, 2024年10月)用流匹配动作专家替换离散动作token：

- 小型动作Transformer读取VLM隐藏状态并通过rectified flow输出连续50步动作序列。
- 动作头用流匹配损失训练；VLM预训练不变。
- 推理：约5个去噪步骤发出完整动作序列，有效50 Hz控制。

pi0声称：在广泛操作任务套件上击败OpenVLA和Octo。连续动作公式保留了离散化破坏的平滑性。

pi0.5和pi0-FAST是增量升级。pi0-FAST结合FAST分词化与流匹配。

### GR00T N1 — 人形机器人双系统

NVIDIA的GR00T N1 (2025年3月)为人形机器人(>30自由度，全身)构建：

- System 2：大型VLM读取场景 + 指令，约1 Hz产生高级子目标。
- System 1：小型动作头Transformer基于子目标产生低级50-100 Hz关节命令。

拆分映射到Kahneman的快慢思考：System 2规划，System 1行动。好处：慢速VLM级规划不阻塞快速控制；System 1保持小型以降低延迟。

GR00T N1.7(2025年底)改进数据缩放。GR00T用Omniverse的sim-to-real数据微调。

### Open X-Embodiment

训练数据。RT-X (2023年10月)组装了22个数据集覆盖22个机器人的100万轨迹。Open X-Embodiment是所有人使用的语料：

- ALOHA / Bridge V2 / Droid / RT-2 Kitchen / Language Table。
- 每个样本：(机器人状态、摄像头视图、指令、动作序列)。
- 训练卫生：统一动作空间、归一化关节范围、调整摄像头大小。

OpenVLA和pi0在Open X-Embodiment上训练。到任何特定机器人的域差距通过100-1000个任务特定演示的LoRA微调弥合。

### 共同微调 vs 仅机器人

共同微调混合Web VQA数据与机器人轨迹。比例很重要：太多VQA模型忘记动作；太多机器人数据模型丢失通用知识。

RT-2比例：约1:1。OpenVLA：约0.5:1 Web对机器人。pi0：类似。精确比例是按数据集大小调优的超参数。

仅机器人训练产生在分布外指令上失败的任务特定模型。共同微调是"拿起红色方块(在演示中)"和"从左边拿起第三大的物体(新措辞)"之间的区别。

### 安全和动作限制

每个生产VLA附带：

- 硬关节限制(不能超过规格的力矩)。
- 速度限制(软裁剪)。
- 工作空间边界(末端执行器不能离开桌面)。
- 新任务的人工审批循环。

这些作为控制层检查位于VLA之外。VLA的输出是建议，不是命令。

## 实践

`code/main.py`：

- 实现256 bin动作分词化和反分词化。
- 基于DCT + 量化的FAST分词器草图。
- 比较(离散bin, FAST, 连续流)每动作步骤的token数。
- 打印RT-2 → OpenVLA → pi0 → GR00T的谱系摘要。

## 输出

本课程产生`outputs/skill-vla-action-format-picker.md`。给定机器人任务(操作、导航、人形全身)，在离散bin + RT-2、FAST + OpenVLA、流匹配 + pi0或双系统 + GR00T之间选择。

## 练习

1. 10自由度臂30 Hz控制速率。256 bin离散分词化每秒发出多少token？7B VLM能跟上吗？

2. FAST分词化将30步轨迹压缩到约10 token。如果轨迹有高频运动(如打鼓)用户丢失什么？

3. pi0的流匹配头在约5步去噪。比较吞吐量与OpenVLA 4-5 Hz的自回归解码。

4. GR00T的System 1 / System 2拆分映射到Kahneman。提出可能帮助双足行走的不同拆分(System 3?)。

5. 阅读Open X-Embodiment第4节关于数据集管理。说出防止域泄漏的三条管理规则。

## 关键术语

| 术语                | 常见说法         | 实际含义                                            |
| ------------------- | ---------------- | --------------------------------------------------- |
| VLA                 | "视觉-语言-动作" | 接受图像+指令并输出动作命令的模型                   |
| 动作分词化          | "离散bin"        | 将连续关节目标量化为每维256 bin，每个是词表ID       |
| FAST分词器          | "频域动作token"  | DCT + 量化将30步轨迹压缩到约10 token                |
| 共同微调            | "混合Web+机器人" | 在Web VQA数据旁机器人演示上训练以保留通用知识       |
| 流匹配动作头        | "pi0连续输出"    | 通过rectified flow输出50步动作序列的小型Transformer |
| System 1 / System 2 | "双系统控制"     | 大型VLM慢规划，小型动作头快执行；GR00T模式          |
| Open X-Embodiment   | "RT-X数据集"     | 100万轨迹跨机器人数据集；训练语料                   |

## 延伸阅读

- [Brohan等人 — RT-2 (arXiv:2307.15818)](https://arxiv.org/abs/2307.15818)
- [Kim等人 — OpenVLA (arXiv:2406.09246)](https://arxiv.org/abs/2406.09246)
- [Black等人 — pi0 (arXiv:2410.24164)](https://arxiv.org/abs/2410.24164)
- [NVIDIA — GR00T N1 (arXiv:2503.14734)](https://arxiv.org/abs/2503.14734)
- [Open X-Embodiment Collab — RT-X (arXiv:2310.08864)](https://arxiv.org/abs/2310.08864)
