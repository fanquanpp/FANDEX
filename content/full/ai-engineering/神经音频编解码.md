---
title: 神经音频编解码
description: '理解EnCodec、SNAC、Mimi、DAC和语义-声学分离的核心架构'
module: 'ai-engineering'
difficulty: advanced
tags:
  - 神经编解码
  - EnCodec
  - RVQ
  - Mimi
  - 语义token
related:
  - 'ai-engineering/权重初始化'
  - 'ai-engineering/什么是机器学习'
  - 'ai-engineering/生产量化策略'
  - 'ai-engineering/生产RAG聊天机器人监管垂直领域'
prerequisites:
  - 'ai-engineering/机器学习概述'
---

# 神经音频编解码 — EnCodec、SNAC、Mimi、DAC与语义-声学分离

> 2026年音频生成几乎全是token。EnCodec、SNAC、Mimi和DAC将连续波形转换为Transformer可以预测的离散序列。语义vs声学token分离 — 第一个码本为语义，其余为声学 — 是自Transformer以来音频领域最重要的架构转变。

**类型:** 学习
**语言:** Python
**前置条件:** Phase 6 · 02（频谱图），Phase 10 · 11（量化），Phase 5 · 19（子词分词）
**时间:** ~60 分钟

## 问题

语言模型处理离散token。音频是连续的。如果你想要一个LLM风格的语音/音乐模型 — MusicGen、Moshi、Sesame CSM、VibeVoice、Orpheus — 你首先需要一个**神经音频编解码**：一个学习到的编码器将音频离散化为小词表的token，以及一个匹配的解码器重建波形。

出现了两个家族：

1. **重建优先编解码** — EnCodec、DAC。优化感知音频质量。Token是"声学"的 — 它们捕获一切，包括说话人身份、音色、背景噪声。
2. **语义优先编解码** — Mimi (Kyutai)、SpeechTokenizer。强制第一个码本编码语言/语音内容（通常通过从WavLM蒸馏）。后续码本是声学细节。

2024-2026年的洞察：**纯重建编解码在从文本生成时给出模糊的语音。** 编解码token上的LLM必须在同一个码本中学习语言结构和声学结构，这不可扩展。将它们分离 — 语义码本0，声学码本1-N — 是让Moshi和Sesame CSM工作的关键。

## 概念

### 核心技巧：残差向量量化 (RVQ)

不是一个大码本（需要数百万个码才能获得好质量），所有现代音频编解码都使用**RVQ**：小码本的级联。第一个码本量化编码器输出；第二个量化残差；以此类推。每个码本1024个码。8个码本 = 有效词表 1024^8 = 10^24。

推理时，解码器将每帧所有选定的码求和来重建。

### 2026年重要的四种编解码

**EnCodec (Meta, 2022)。** 基线。波形上的编码器-解码器，RVQ瓶颈。24 kHz，最多32个码本，默认4个码本 @ 1.5 kbps。使用 `1D卷积 + Transformer + 1D卷积` 架构。MusicGen使用。

**DAC (Descript, 2023)。** 带L2归一化码本的RVQ、周期性激活函数、改进的损失。任何开源编解码中最高的重建保真度 — 12个码本时有时与原始语音无法区分。44.1 kHz全频带。

**SNAC (Hubert Siuzdak, 2024)。** 多尺度RVQ — 粗糙码本以比精细码本更低的帧率运行。有效地分层建模音频：约12 Hz的粗略"草图"加上50 Hz的细节。Orpheus-3B使用，因为层次结构很好地映射到基于LM的生成。

**Mimi (Kyutai, 2024)。** 2026年的游戏规则改变者。12.5 Hz帧率（极低），8个码本 @ 4.4 kbps。码本0从**WavLM蒸馏** — 训练来预测WavLM的语音内容特征。码本1-7是声学残差。这种分离驱动了Moshi（课程15）和Sesame CSM。

### 帧率对语言建模很重要

更低帧率 = 更短序列 = 更快的LM。

| 编解码          | 帧率    | 1秒 = N帧 | 适用于         |
| --------------- | ------- | --------- | -------------- |
| EnCodec-24k     | 75 Hz   | 75        | 音乐，通用音频 |
| DAC-44.1k       | 86 Hz   | 86        | 高保真音乐     |
| SNAC-24k (粗糙) | ~12 Hz  | 12        | AR-LM高效      |
| Mimi            | 12.5 Hz | 12.5      | 流式语音       |

在12.5 Hz下，10秒话语只有125个编解码帧 — Transformer可以轻松预测。

### 语义vs声学token

```
frame_t → [semantic_token_t, acoustic_token_0_t, acoustic_token_1_t, ..., acoustic_token_6_t]
```

- **语义token（Mimi中的码本0）。** 编码说了什么 — 音素、词、内容。通过辅助预测损失从WavLM蒸馏。
- **声学token（码本1-7）。** 编码音色、说话人身份、韵律、背景噪声、精细细节。

AR LM首先预测语义token（以文本为条件），然后预测声学token（以语义 + 说话人参考为条件）。这种分解是现代TTS可以零样本克隆声音的原因：语义模型处理内容；声学模型处理音色。

### 2026年重建质量（比特/秒，更低比特率更好）

| 编解码        | 比特率   | PESQ | ViSQOL |
| ------------- | -------- | ---- | ------ |
| Opus-20kbps   | 20 kbps  | 4.0  | 4.3    |
| EnCodec-6kbps | 6 kbps   | 3.2  | 3.8    |
| DAC-6kbps     | 6 kbps   | 3.5  | 4.0    |
| SNAC-3kbps    | 3 kbps   | 3.3  | 3.8    |
| Mimi-4.4kbps  | 4.4 kbps | 3.1  | 3.7    |

传统编解码如Opus在每比特感知质量上仍然胜出。神经编解码在**离散token**（Opus不产生）和**生成模型质量**（LM能用这些token做什么）上胜出。

## 构建它

### 步骤 1：使用EnCodec编码

```python
from encodec import EncodecModel
import torch

model = EncodecModel.encodec_model_24khz()
model.set_target_bandwidth(6.0)  # kbps

wav = torch.randn(1, 1, 24000)
with torch.no_grad():
    encoded = model.encode(wav)
codes, scale = encoded[0]
# codes: (1, n_codebooks, n_frames), dtype=int64
```

6 kbps时 `n_codebooks=8`。每个码是0-1023（10位）。

### 步骤 2：解码并测量重建

```python
with torch.no_grad():
    wav_recon = model.decode([(codes, scale)])

from torchaudio.functional import compute_deltas
import torch.nn.functional as F

mse = F.mse_loss(wav_recon[:, :, :wav.shape[-1]], wav).item()
```

### 步骤 3：语义-声学分离（Mimi风格）

```python
from moshi.models import loaders
mimi = loaders.get_mimi()

with torch.no_grad():
    codes = mimi.encode(wav)  # 形状 (1, 8, frames@12.5Hz)

semantic = codes[:, 0]
acoustic = codes[:, 1:]
```

语义码本0与WavLM对齐。你可以训练一个文本到语义的Transformer — 词表比直接到音频小得多。然后一个单独的声学到波形解码器以说话人参考为条件。

### 步骤 4：为什么编解码token上的AR LM有效

对于Mimi的12.5 Hz × 8码本下10秒语音片段：

```
N_tokens = 10 * 12.5 * 8 = 1000 tokens
```

1000个token对Transformer来说是微不足道的上下文。一个256M参数的Transformer可以在现代GPU上毫秒级生成10秒语音。

## 使用它

问题 → 编解码映射：

| 任务                | 编解码           |
| ------------------- | ---------------- |
| 通用音乐生成        | EnCodec-24k      |
| 最高保真重建        | DAC-44.1k        |
| 语音上的AR LM (TTS) | SNAC或Mimi       |
| 流式全双工语音      | Mimi (12.5 Hz)   |
| 带文本的音效库      | EnCodec + T5条件 |
| 细粒度音频编辑      | DAC + 修复       |

经验法则：**如果你在构建生成模型，从Mimi或SNAC开始。如果你在构建压缩流水线，使用Opus。**

## 陷阱

- **太多码本。** 添加码本线性增加保真度，但也线性增加LM序列长度。停在8-12。
- **帧率不匹配。** 在12.5 Hz Mimi上训练LM然后在50 Hz EnCodec上微调会静默失败。
- **假设所有码本平等。** 在Mimi中，码本0携带内容；丢失它会摧毁可懂度。丢失码本7几乎不可察觉。
- **仅用重建质量作为指标。** 编解码可以有很好的重建，但如果语义结构差，对基于LM的生成就没用。

## 交付它

将结果保存为 `outputs/skill-codec-picker.md`。为给定生成或压缩任务选择编解码。

## 练习

1. **简单。** 运行 `code/main.py`。它实现了一个玩具标量 + 残差量化器，并测量添加码本时的重建误差。
2. **中等。** 安装 `encodec`，在保留语音片段上比较1、4、8、32个码本。绘制PESQ或MSE vs比特率。
3. **困难。** 加载Mimi。编码一个片段。用随机整数替换码本0；解码。然后类似地替换码本7。比较两种损坏 — 码本0损坏应摧毁可懂度；码本7损坏几乎不变。

## 关键术语

| 术语          | 通俗说法     | 实际含义                                |
| ------------- | ------------ | --------------------------------------- |
| RVQ           | 残差量化     | 小码本级联；每个量化前一个残差。        |
| 帧率          | 编解码速度   | 每秒多少token帧。更低 = 更快的LM。      |
| 语义码本      | 码本0 (Mimi) | 从SSL特征蒸馏的码本；编码内容。         |
| 声学码本      | 其他所有     | 音色、韵律、噪声、精细细节。            |
| PESQ / ViSQOL | 感知质量     | 与MOS相关的客观指标。                   |
| EnCodec       | Meta编解码   | RVQ基线；MusicGen使用。                 |
| Mimi          | Kyutai编解码 | 12.5 Hz帧率；语义-声学分离；驱动Moshi。 |

## 延伸阅读

- [Défossez et al. (2023). EnCodec](https://arxiv.org/abs/2210.13438) — RVQ基线。
- [Kumar et al. (2023). Descript Audio Codec (DAC)](https://arxiv.org/abs/2306.06546) — 最高保真开源。
- [Siuzdak (2024). SNAC](https://arxiv.org/abs/2410.14411) — 多尺度RVQ。
- [Kyutai (2024). Mimi编解码](https://kyutai.org/codec-explainer) — 语义-声学分离，WavLM蒸馏。
- [Borsos et al. (2023). AudioLM](https://arxiv.org/abs/2209.03143) — 两阶段语义/声学范式。
- [Zeghidour et al. (2021). SoundStream](https://arxiv.org/abs/2107.03312) — 原始可流式RVQ编解码。
