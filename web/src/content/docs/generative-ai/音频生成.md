---
title: 音频生成
description: 从语音合成到音乐创作，音频扩散与自回归模型的核心技术
module: 'generative-ai'
difficulty: intermediate
tags:
  - 音频生成
  - 语音合成
  - 音乐生成
  - Encodec
  - AudioLM
related:
  - 'generative-ai/条件GAN与Pix2Pix'
  - 'generative-ai/图像修复扩展与编辑'
  - 'generative-ai/自编码器与VAE'
  - 'generative-ai/ControlNet与LoRA条件化'
prerequisites:
  - 'generative-ai/3D生成'
---

# 音频生成

> 图像是 2D 的。视频是 3D 的。音频是 1D 的——但采样率使其与视频一样数据密集。44.1 kHz × 1 小时 = 1.58 亿个样本。音频生成在 2022-2026 年间从"可识别"跃升到"商用"，使用与图像相同的两个技巧：压缩到潜空间，然后扩散或自回归生成。

**类型:** 学习
**语言:** Python
**前置知识:** Phase 8 · 02 (VAE), Phase 8 · 06 (DDPM), Phase 7 · 09 (Transformer)
**时间:** ~60 分钟

## 问题

音频生成有三个子问题：(1) 文本到语音 (TTS)——给定文本，产生自然语音；(2) 文本到音乐——给定文本描述，产生音乐；(3) 音效——给定描述，产生环境音。所有三个共享相同的管线：压缩 → 生成 → 解码。

挑战是序列长度。一秒 44.1 kHz 音频有 44,100 个样本。一分钟有 260 万个。在原始波形上运行扩散或 transformer 是不可行的。所有生产系统首先压缩到潜空间。

## 核心概念

**音频压缩。** 三种方法：

1. **频谱图。** 短时傅里叶变换 (STFT) 将波形转换为时频图。Mel 频谱图进一步压缩频率轴。损失：相位信息（但 Griffin-Lim 或声码器可以重建它）。
2. **神经编解码器 (Encodec, SoundStream, DAC)。** VAE 风格的编码器-解码器，将波形压缩为离散或连续 token。Encodec 以 75 Hz 输出离散 token（每秒 75 个 token，vs 44,100 个原始样本）。这是 588 倍压缩。
3. **残差向量量化 (RVQ)。** 多层 VQ，每层捕获前一层未捕获的残差。Encodec 使用 8 层 RVQ，每层 1024 个码本条目。总比特率：75 × 8 × 10 = 6 kbps。

**生成方法。** 两种范式：

1. **自回归 (AudioLM, VALL-E, MusicGen)。** 将 Encodec token 视为语言，用 Transformer 自回归生成。优点：长程一致性，自然节奏。缺点：慢（顺序生成），错误累积。
2. **扩散/流匹配 (AudioCraft 2, Stable Audio)。** 在连续潜变量上运行扩散。优点：并行生成（快），高质量。缺点：长程结构较弱。

**文本条件化。** 与图像相同：T5 或 CLAP 文本编码器 + 交叉注意力注入到生成器中。

**声码器。** 从 Mel 频谱图或潜变量重建波形。HiFi-GAN 是 2026 年的标准声码器。神经编解码器 (Encodec) 的解码器也充当声码器。

## 主要模型

| 模型          | 年份 | 方法                     | 任务      | 编解码器    |
| ------------- | ---- | ------------------------ | --------- | ----------- |
| WaveNet       | 2016 | AR (原始波形)            | TTS       | 无          |
| Jukebox       | 2020 | AR (VQ-VAE)              | 音乐      | VQ-VAE      |
| AudioLM       | 2022 | AR (SoundStream)         | 语音/音乐 | SoundStream |
| Make-An-Audio | 2023 | 扩散 (Mel)               | 音效      | HiFi-GAN    |
| MusicGen      | 2023 | AR (Encodec)             | 音乐      | Encodec     |
| VALL-E        | 2023 | AR (Encodec)             | TTS       | Encodec     |
| Bark          | 2023 | AR (Semantic + Acoustic) | TTS       | 自定义      |
| Stable Audio  | 2023 | 扩散 (潜变量)            | 音乐/音效 | 自定义 VAE  |
| AudioCraft 2  | 2024 | 流匹配 (潜变量)          | 音乐/音效 | Encodec     |
| ElevenLabs    | 2024 | 专有                     | TTS       | 专有        |
| Seed TTS      | 2025 | 专有                     | TTS       | 专有        |

## 动手构建

`code/main.py` 在 1-D 音频上实现了一个玩具"音频压缩 + 生成"管线。压缩是简单的下采样（玩具版 Encodec），生成是 1-D 扩散。

### 步骤 1：玩具编解码器

```python
def encode_audio(waveform, stride=8):
    # Simple downsampling (toy version of Encodec)
    return waveform[::stride]

def decode_audio(compressed, stride=8):
    # Simple upsampling with linear interpolation
    decoded = []
    for i in range(len(compressed)):
        decoded.append(compressed[i])
        if i < len(compressed) - 1:
            for j in range(1, stride):
                alpha = j / stride
                decoded.append((1 - alpha) * compressed[i] + alpha * compressed[i + 1])
    return decoded
```

### 步骤 2：在压缩空间中扩散

```python
# Same DDPM as Phase 8 · 06, but data is compressed audio
# Training: noise the compressed representation, predict noise
# Sampling: denoise from pure noise
```

### 步骤 3：解码回波形

```python
def generate_audio(model, T, alpha_bars, rng, stride=8):
    z = sample_compressed(model, T, alpha_bars, rng)
    return decode_audio(z, stride)
```

## 常见陷阱

- **采样率不匹配。** 训练 16 kHz 模型但部署 44.1 kHz 音频 = 质量灾难。始终匹配采样率。
- **编解码器伪影。** Encodec 在低比特率（<3 kbps）引入金属感伪影。使用更高比特率或更多 RVQ 层。
- **长音频漂移。** 自回归模型在 >30 秒后漂移。修复：条件化于结构提示（和弦、节拍）或使用分层生成。
- **节奏不一致。** 扩散模型难以保持稳定节拍。修复：节拍条件化，或先在符号层面生成（MIDI），然后渲染为音频。
- **说话人泄漏。** TTS 模型有时混合训练数据中的说话人声音。修复：更严格的说话人嵌入条件化。
- **静音处理。** 模型在静音段产生噪声。修复：显式静音检测和掩码。

## 实际应用

| 任务         | 推荐方法                               |
| ------------ | -------------------------------------- |
| 文本到语音   | VALL-E / ElevenLabs / Seed TTS         |
| 语音克隆     | VALL-E (3s 参考) / ElevenLabs          |
| 音乐生成     | MusicGen / Stable Audio / AudioCraft 2 |
| 音效         | Make-An-Audio / Stable Audio           |
| 语音转换     | So-VITS-SVC / RVC                      |
| 音频超分辨率 | AudioSR                                |
| 音频修复     | 扩散修复在频谱图上                     |

## 交付物

保存 `outputs/skill-audio-generator.md`。技能接收音频生成需求（类型、时长、质量、延迟），输出：方法选择、编解码器、生成模型、条件化策略和后处理步骤。

## 练习

1. **简单。** 运行 `code/main.py`，比较不同压缩率（stride=4, 8, 16）的重建质量。在什么压缩率下质量明显下降？
2. **中等。** 在玩具模型中实现简单的 RVQ：用两层 VQ 替换单层下采样。比较重建质量。
3. **困难。** 用 diffusers 或 audiocraft 加载 MusicGen。生成 30 秒音乐。分析生成音频的频谱图，识别编解码器伪影。

## 关键术语

| 术语       | 人们怎么说     | 实际含义                                    |
| ---------- | -------------- | ------------------------------------------- |
| Encodec    | "音频 VAE"     | Meta 的神经音频编解码器，75 Hz 离散 token。 |
| RVQ        | "残差量化"     | 多层 VQ，每层捕获残差。                     |
| Mel 频谱图 | "音频图像"     | 对数频率轴的 STFT，像图像一样处理。         |
| 声码器     | "Vocoder"      | 从频谱图/潜变量重建波形。                   |
| AudioLM    | "音频语言模型" | 在 Encodec token 上自回归生成。             |
| 流匹配     | "直线采样"     | 比扩散更快的采样方法。                      |

## 生产笔记：音频生成的实时约束

音频生成的延迟要求比图像严格得多：

| 应用             | 最大可接受延迟 |
| ---------------- | -------------- |
| 对话式 TTS       | < 200 ms       |
| 实时语音转换     | < 50 ms        |
| 音乐生成（离线） | 秒级可接受     |
| 音效（游戏）     | < 100 ms       |

自回归模型（AudioLM, VALL-E）在 75 Hz token 率下需要约 13 ms/token。1 秒音频 = 75 步自回归。在 A100 上，这是约 200-500 ms——对话式 TTS 可行但紧张。

扩散/流匹配模型并行生成所有 token，但需要多步。4 步流匹配在 1 秒音频上约 100-300 ms——更快但长程结构较弱。

生产系统通常混合：自回归用于结构（语音内容、音乐和弦），扩散用于细节（音色、音质）。

## 延伸阅读

- [Défossez et al. (2022). High Fidelity Neural Audio Compression](https://arxiv.org/abs/2210.13438) — Encodec。
- [Borsos et al. (2022). AudioLM: a Language Modeling Approach to Audio Generation](https://arxiv.org/abs/2209.03143) — AudioLM。
- [Wang et al. (2023). Neural Codec Language Models are Zero-Shot Text to Speech Synthesizers](https://arxiv.org/abs/2301.02111) — VALL-E。
- [Copet et al. (2023). Simple and Controllable Music Generation](https://arxiv.org/abs/2306.05284) — MusicGen。
- [Evans et al. (2024). Stable Audio](https://stability.ai/research/stable-audio) — Stable Audio。
