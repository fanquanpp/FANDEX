---
title: '水印SynthID与Stable-Signature与C2PA'
description: '2026年AI生成内容溯源三大技术：SynthID (Google) — 跨文本/图像/音频/视频水印，文本水印通过偏置采样实现，2025年11月统一检测器；Stable Signature (ICCV 2023) — 图像潜在扩散解码器微调水印，2024年被微调移除攻击打破；C2PA — 加密签名防篡改元数据标准。水印与C2PA互补。'
module: 'ai-ethics'
difficulty: advanced
tags:
  - 水印
  - SynthID
  - 'Stable Signature'
  - C2PA
  - 溯源
  - 深度伪造
related:
  - 'ai-ethics/数据溯源与训练数据治理'
  - 'ai-ethics/双用风险网络与生物与化学与核'
  - 'ai-ethics/直接偏好优化家族'
  - 'ai-ethics/指令遵循作为对齐信号'
prerequisites:
  - 'ai-ethics/谄媚作为RLHF放大器'
---

## 问题定义

2023-2024年深度伪造和AI生成内容大规模进入政治和消费场景。水印是提出的技术溯源信号：在创建时标记生成物，稍后检测。2025年证据：没有水印是无条件鲁棒的，但与C2PA元数据分层后，组合提供了可用的溯源方案。

## 核心概念

### 文本水印(SynthID-text风格)

Kirchenbauer等人2023机制，由Google产品化：

1. 在每个解码步骤，哈希前K个token产生词汇表的伪随机划分为"绿色"和"红色"集。
2. 通过向绿色logits添加delta来偏置采样向绿色集。
3. 生成包含比随机产生更多的绿色token。

检测：重新哈希每个前缀，计算生成中的绿色token数，计算z分数。水印文本的z分数>0，人类文本约0。

属性：

- 对读者不可感知（delta足够小，质量损失轻微）。
- 可通过词汇划分函数访问检测。
- 对释义不鲁棒——重写文本破坏信号。

SynthID-text于2024年10月通过Google Responsible GenAI Toolkit开源。

### Stable Signature (图像)

Fernandez等人ICCV 2023。微调潜在扩散解码器使每张生成图像包含嵌入潜在表示中的固定二进制消息。检测通过神经解码器从潜在中解码。裁剪到10%内容的图像在FPR<1e-6下检测率>90%。

2024年5月"Stable Signature is Unstable" (arXiv:2405.07145)：微调解码器在保持图像质量的同时移除水印。对抗性后生成微调成本低；水印的对抗鲁棒性有限。

### SynthID统一检测器(2025年11月)

随Gemini 3 Pro发布：一个多媒体检测器，通过一个API读取文本、图像、音频和视频中的SynthID信号。统一Google溯源栈。

### C2PA

内容溯源和真实性联盟。加密签名防篡改元数据标准。C2PA 2.2说明文档(2025)。C2PA清单记录溯源声明（谁创建、何时、什么变换），由创建者密钥签名。

与水印互补：

- 元数据可以被剥离；水印不能（容易地）。
- 元数据丰富（完整溯源链）；水印携带比特。
- C2PA依赖平台采用；水印自动嵌入。

Google在Search、Ads和"About this image"中集成两者。

### 局限性

- **模型特定。** SynthID水印来自启用SynthID的模型的生成物。没有SynthID的模型的生成物不被水印，因此"无SynthID信号"不是真实性的证明。
- **释义。** 文本水印不在保持含义的释义下存活。
- **变换攻击。** arXiv:2508.20228 (2025)展示了破坏文本水印和许多图像水印的保义攻击。
- **微调移除。** 根据"Stable Signature is Unstable"，后生成微调移除嵌入水印。

### EU AI Act第50条

AI生成内容标签的透明度准则（初稿2025年12月，二稿2026年3月，预计终稿2026年6月）。该准则截至2026年4月仍为草案，时间线可能变更。要求技术层的监管层。深度伪造必须标注。

## 关键术语

| 术语                  | 常见说法           | 实际含义                                    |
| --------------------- | ------------------ | ------------------------------------------- |
| SynthID               | "Google水印"       | 跨模态溯源信号；文本、图像、音频、视频      |
| Token watermark       | "Kirchenbauer风格" | 通过绿色token z分数可检测的偏置采样文本水印 |
| Stable Signature      | "图像水印"         | 微调解码器水印；ICCV 2023                   |
| C2PA                  | "元数据标准"       | 加密签名防篡改溯源元数据                    |
| Paraphrase robustness | "改写是否破坏"     | 文本水印属性；目前有限                      |
| Fine-tune removal     | "对抗去水印"       | 通过解码器微调移除图像水印的攻击            |
| Cross-modal detector  | "统一SynthID"      | 2025年11月跨模态统一API                     |

## 延伸阅读

- Kirchenbauer et al. — A Watermark for Large Language Models (ICML 2023, arXiv:2301.10226) — token水印机制
- Fernandez et al. — Stable Signature (ICCV 2023, arXiv:2303.15435) — 图像水印论文
- "Stable Signature is Unstable" (arXiv:2405.07145) — 移除攻击
- Google DeepMind — SynthID — 跨模态水印
- C2PA 2.2 Explainer (2025) — 元数据标准
