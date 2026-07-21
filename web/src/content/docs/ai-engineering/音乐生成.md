---
title: 音乐生成
description: '从MusicGen到Suno，理解音乐生成的Token LM与扩散两条路线'
module: 'ai-engineering'
difficulty: intermediate
tags:
  - 音乐生成
  - MusicGen
  - 'Stable Audio'
  - Suno
  - FAD
related:
  - 'ai-engineering/学习率调度'
  - 'ai-engineering/异常检测'
  - 'ai-engineering/音频分类'
  - 'ai-engineering/音频基础'
prerequisites:
  - 'ai-engineering/机器学习概述'
---

# 音乐生成 — MusicGen、Stable Audio、Suno与许可地震

> 2026年音乐生成：Suno v5和Udio v4主导商业；MusicGen、Stable Audio Open和ACE-Step领先开源。技术问题基本已解决。法律问题（Warner Music 5亿美元和解、UMG和解）在2025-2026年重塑了该领域。

**类型:** 构建
**语言:** Python
**前置条件:** Phase 6 · 02（频谱图），Phase 4 · 10（扩散模型）
**时间:** ~75 分钟

## 问题

文本 → 30秒到4分钟的音乐片段，带歌词、人声和结构。三个子问题：

1. **器乐生成。** 文本如"lo-fi hip-hop鼓配温暖键盘" → 音频。MusicGen、Stable Audio、AudioLDM。
2. **歌曲生成（带人声+歌词）。** "关于德克萨斯雨夜的乡村歌曲" → 完整歌曲。Suno、Udio、YuE、ACE-Step。
3. **条件化/可控。** 扩展现有片段、重新生成桥段、切换风格、分轨分离或修复。Udio的修复 + 分轨分离是2026年需要匹配的功能。

## 概念

### 神经编解码token上的Token LM

Meta的**MusicGen**（2023，MIT）和许多衍生品：以文本/旋律嵌入为条件，自回归预测EnCodec token（32 kHz，4个码本），用EnCodec解码。300M - 3.3B参数。强基线；超过30秒后表现不佳。

**ACE-Step**（开源，4B XL于2026年4月发布）扩展了此架构用于带歌词条件的全曲生成。开源社区最接近Suno的产品。

### Mel或潜空间上的扩散

**Stable Audio (2023)** 和 **Stable Audio Open (2024)**：压缩音频上的潜扩散。擅长循环、音效设计、氛围纹理。结构化完整歌曲不太行。

**AudioLDM / AudioLDM2**：通过T2I风格的潜扩散进行文本到音频，泛化到音乐、音效、语音。

### 混合（生产） — Suno、Udio、Lyria

闭源权重。可能是AR编解码LM + 扩散声码器，带专门的语音/鼓/旋律头。Suno v5 (2026) 是ELO 1293质量领先者。Udio v4添加了修复 + 分轨分离（贝斯、鼓、人声分别下载）。

### 评估

- **FAD（Fréchet音频距离）。** 使用VGGish或PANNs特征的生成vs真实音频分布之间的嵌入级距离。越低越好。MusicGen small：MusicCaps上FAD 4.5；SOTA约3.0。
- **音乐性（主观）。** 人类偏好。Suno v5 ELO 1293领先。
- **文本-音频对齐。** 提示和输出之间的CLAP分数。
- **音乐性伪影。** 节拍外过渡、人声短语漂移、30秒后结构丢失。

## 2026年模型地图

| 模型                    | 参数 | 长度    | 人声         | 许可            |
| ----------------------- | ---- | ------- | ------------ | --------------- |
| MusicGen-large          | 3.3B | 30秒    | 无           | MIT             |
| Stable Audio Open       | 1.2B | 47秒    | 无           | Stability非商业 |
| ACE-Step XL (2026年4月) | 4B   | > 2分钟 | 有           | Apache-2.0      |
| YuE                     | 7B   | > 2分钟 | 有，多语言   | Apache-2.0      |
| Suno v5 (闭源)          | ?    | 4分钟   | 有，ELO 1293 | 商业            |
| Udio v4 (闭源)          | ?    | 4分钟   | 有 + 分轨    | 商业            |
| Google Lyria 3 (闭源)   | ?    | 实时    | 有           | 商业            |
| MiniMax Music 2.5       | ?    | 4分钟   | 有           | 商业API         |

## 法律格局（2025-2026）

- **Warner Music vs Suno和解。** 5亿美元。WMG现在对Suno上的AI相似性、音乐权利和用户生成内容有监督权。UMG对Udio也有类似和解。
- **EU AI法案** + **加州SB 942**：AI生成音乐必须披露。
- **Riffusion / MusicGen** 在MIT下没有合规负担，但也没有商业人声。

安全发布模式：

1. 仅生成器乐（MusicGen、Stable Audio Open、MIT/CC0输出）。
2. 使用商业API（Suno、Udio、ElevenLabs Music），每次生成有许可。
3. 在自有或授权目录上训练（大多数企业最终走到这里）。
4. 用水印 + 元数据标记生成内容。

## 构建它

### 步骤 1：使用MusicGen生成

```python
from audiocraft.models import MusicGen
import torchaudio

model = MusicGen.get_pretrained("facebook/musicgen-small")
model.set_generation_params(duration=10)
wav = model.generate(["upbeat synthwave with driving drums, 128 BPM"])
torchaudio.save("out.wav", wav[0].cpu(), 32000)
```

三种大小：`small`（300M，快）、`medium`（1.5B）、`large`（3.3B）。Small足以验证"想法是否可行"。

### 步骤 2：旋律条件化

```python
melody, sr = torchaudio.load("humming.wav")
wav = model.generate_with_chroma(
    ["jazz piano cover"],
    melody.squeeze(),
    sr,
)
```

MusicGen-melody接收色度图，在交换音色的同时保留旋律。适用于"把这个旋律变成弦乐四重奏"。

### 步骤 3：FAD评估

```python
from frechet_audio_distance import FrechetAudioDistance
fad = FrechetAudioDistance()

fad.get_fad_score("generated_folder/", "reference_folder/")
```

计算VGGish嵌入距离。适用于流派级回归测试；不能替代人类听众。

### 步骤 4：添加到LLM-音乐工作流

结合课程7-8的想法：

```python
prompt = "Write a 30-second jazz loop. Describe the drums, bass, and piano voicing."
description = llm.complete(prompt)
music = musicgen.generate([description], duration=30)
```

## 使用它

| 目标                     | 技术栈                            |
| ------------------------ | --------------------------------- |
| 器乐音效设计             | Stable Audio Open                 |
| 游戏/自适应音乐          | Google Lyria RealTime (闭源)      |
| 带人声的完整歌曲（商业） | Suno v5或Udio v4，明确许可        |
| 带人声的完整歌曲（开源） | ACE-Step XL或YuE                  |
| 短广告铃声               | MusicGen旋律条件化，基于哼唱参考  |
| 音乐视频背景             | MusicGen + Stable Video Diffusion |

## 2026年仍在出现的陷阱

- **版权洗钱提示。** "Taylor Swift风格的歌曲" — 商业Suno/Udio现在过滤这些，开源模型不会。添加你自己的过滤列表。
- **30秒后重复/漂移。** AR模型会循环。交叉淡入多个生成，或使用ACE-Step保持结构一致性。
- **节拍漂移。** 模型偏离BPM。在提示中使用BPM标签，用librosa的 `beat_track` 后过滤。
- **人声可懂度。** Suno优秀；开源模型的歌词经常模糊。如果歌词重要，使用商业API或微调。
- **单声道输出。** 开源模型生成单声道或假立体声。用适当的立体声重建升级（ezst、Cartesia的立体声扩散）。

## 交付它

将结果保存为 `outputs/skill-music-designer.md`。为音乐生成部署选择模型、许可策略、长度/结构计划和披露元数据。

## 练习

1. **简单。** 运行 `code/main.py`。它产生一个"生成式"和弦进行 + 鼓模式作为ASCII符号 — 音乐生成的卡通。如果需要，可通过任何MIDI渲染器播放。
2. **中等。** 安装 `audiocraft`，用MusicGen-small跨4种流派提示生成10秒片段，对参考流派集测量FAD。
3. **困难。** 使用ACE-Step（或MusicGen-melody），用不同音色提示生成同一曲调的三个变体。计算与提示的CLAP相似度以验证对齐。

## 关键术语

| 术语    | 通俗说法      | 实际含义                                          |
| ------- | ------------- | ------------------------------------------------- |
| FAD     | 音频FID       | 真实vs生成嵌入分布之间的Fréchet距离。             |
| 色度图  | 旋律即音高    | 12维逐帧向量；旋律条件化的输入。                  |
| 分轨    | 乐器轨道      | 分离的贝斯/鼓/人声/旋律WAV。                      |
| 修复    | 重新生成一段  | 遮蔽时间窗口；模型只重新生成该段。                |
| CLAP    | 文本-音频CLIP | 对比音频-文本嵌入；评估文本-音频对齐。            |
| EnCodec | 音乐编解码    | Meta的神经编解码，MusicGen使用；32 kHz，4个码本。 |

## 延伸阅读

- [Copet et al. (2023). MusicGen](https://arxiv.org/abs/2306.05284) — 开源自回归基准。
- [Evans et al. (2024). Stable Audio Open](https://arxiv.org/abs/2407.14358) — 音效设计默认。
- [ACE-Step](https://github.com/ace-step/ACE-Step) — 开源4B全曲生成器，2026年4月。
- [Suno v5平台文档](https://suno.com) — 商业质量领先者。
- [AudioLDM2](https://arxiv.org/abs/2308.05734) — 音乐 + 音效的潜扩散。
- [WMG-Suno和解报道](https://www.musicbusinessworldwide.com/suno-warner-music-settlement/) — 2025年11月先例。
