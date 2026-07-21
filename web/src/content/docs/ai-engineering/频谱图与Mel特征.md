---
title: 频谱图与Mel特征
description: 从STFT到Mel频谱图，理解音频AI最核心的特征表示
module: 'ai-engineering'
difficulty: beginner
tags:
  - 频谱图
  - Mel特征
  - MFCC
  - 特征提取
related:
  - 'ai-engineering/批量API经济学'
  - 'ai-engineering/偏差方差与学习曲线'
  - 'ai-engineering/朴素贝叶斯'
  - 'ai-engineering/奇异值分解'
prerequisites:
  - 'ai-engineering/机器学习概述'
---

# 频谱图与Mel特征 — 音频AI的通用语言

> 每个音频模型都从同一个起点开始：log-mel频谱图。它不是唯一的特征，但它是默认特征。如果你不理解它，你就无法调试你的模型。

**类型:** 构建
**语言:** Python
**前置条件:** Phase 6 · 01（音频基础）
**时间:** ~60 分钟

## 问题

原始波形有 16,000 个样本/秒。对于神经网络来说，这太长了，且信息密度太低。你需要一个紧凑的表示，能保留对感知和语言重要的频率信息。Mel频谱图就是这种表示：它将 16 kHz 的时域信号压缩成一个约 80 频带 × 100 帧/秒的 2D 矩阵，与人类听觉系统的工作方式一致。

## 概念

### 从STFT到功率谱

STFT 产生复数值。音频 AI 使用功率谱：

```
P[k] = |X[k]|² / frame_len
```

功率谱给出每个频率 bin 的能量密度。

### Mel滤波器组

人类对低频的感知比高频更精细。Mel刻度将频率映射到感知音高：

```
mel(f) = 2595 · log₁₀(1 + f/700)
```

在实践中，我们创建一组三角形滤波器，在Mel刻度上均匀分布，在Hz刻度上对数分布：

```python
def mel_filterbank(n_mels, frame_len, sr, fmin=0, fmax=None):
    fmax = fmax or sr // 2
    mel_min = 2595 * math.log10(1 + fmin / 700)
    mel_max = 2595 * math.log10(1 + fmax / 700)
    mel_points = [mel_min + (mel_max - mel_min) * i / (n_mels + 1) for i in range(n_mels + 2)]
    hz_points = [700 * (10 ** (m / 2595) - 1) for m in mel_points]
    bins = [int(round(h * (frame_len + 1) / sr)) for h in hz_points]
    filters = []
    for i in range(n_mels):
        filt = [0.0] * (frame_len // 2 + 1)
        for k in range(bins[i], bins[i + 1]):
            filt[k] = (k - bins[i]) / max(bins[i + 1] - bins[i], 1)
        for k in range(bins[i + 1], bins[i + 2]):
            filt[k] = (bins[i + 2] - k) / max(bins[i + 2] - bins[i + 1], 1)
        filters.append(filt)
    return filters
```

### Log-mel频谱图

1. 计算STFT → 功率谱
2. 应用Mel滤波器组 → Mel能量
3. 取对数 → log-mel频谱图

```python
def log_mel_spectrogram(signal, sr=16000, n_mels=80, frame_len=400, hop=160):
    mag = magnitude_spectrum(signal, frame_len, hop)  # 来自课程01
    fb = mel_filterbank(n_mels, frame_len, sr)
    mel_frames = []
    for frame in mag:
        powers = [abs(x) ** 2 for x in frame]
        mel_energies = [sum(p * f for p, f in zip(powers, filt)) for filt in fb]
        log_mel = [math.log(max(e, 1e-10)) for e in mel_energies]
        mel_frames.append(log_mel)
    return mel_frames
```

这就是Whisper、MusicGen、F5-TTS以及几乎所有2026年音频模型的输入。

### MFCC（Mel频率倒谱系数）

在深度学习之前，MFCC是标准特征。仍然用于说话人识别和传统语音系统：

1. 计算log-mel频谱图
2. 应用DCT（离散余弦变换）
3. 保留前13个系数

```python
def dct_ii(x, n_coeffs=13):
    """Type-II DCT"""
    N = len(x)
    return [sum(x[k] * math.cos(math.pi * n * (k + 0.5) / N) for k in range(N)) for n in range(n_coeffs)]

def mfcc(signal, sr=16000, n_mfcc=13, n_mels=40, frame_len=400, hop=160):
    log_mels = log_mel_spectrogram(signal, sr, n_mels, frame_len, hop)
    return [dct_ii(frame, n_mfcc) for frame in log_mels]
```

### 你应该知道的数字

| 特征           | 维度        | 帧率     | 用于                         |
| -------------- | ----------- | -------- | ---------------------------- |
| 波形           | 1           | 16,000/s | 端到端模型 (WaveNet, RawNet) |
| STFT幅度       | 201         | 100/s    | 通用中间表示                 |
| Log-mel (80)   | 80          | 100/s    | ASR, TTS, 音频分类默认       |
| MFCC (13)      | 13          | 100/s    | 说话人识别, 传统系统         |
| EnCodec tokens | 8 codebooks | 75/s     | MusicGen, 神经编解码         |

## 构建它

### 步骤 1：完整的log-mel流水线

```python
def compute_log_mel(signal, sr=16000, n_mels=80, frame_len=400, hop=160):
    # STFT
    mag = magnitude_spectrum(signal, frame_len, hop)
    # Mel滤波器组
    fb = mel_filterbank(n_mels, frame_len, sr)
    # 应用滤波器 + log
    result = []
    for frame in mag:
        powers = [abs(x) ** 2 for x in frame]
        mel_energies = [sum(p * f for p, f in zip(powers, filt)) for filt in fb]
        log_mel = [math.log(max(e, 1e-10)) for e in mel_energies]
        result.append(log_mel)
    return result
```

### 步骤 2：MFCC

```python
def compute_mfcc(signal, sr=16000, n_mfcc=13, n_mels=40):
    log_mels = compute_log_mel(signal, sr, n_mels)
    return [dct_ii(frame, n_mfcc) for frame in log_mels]
```

### 步骤 3：特征可视化

```python
# 打印log-mel频谱图的形状
mel_spec = compute_log_mel(signal)
n_frames = len(mel_spec)
n_bands = len(mel_spec[0])
print(f"Log-mel形状: ({n_frames}, {n_bands})")
print(f"持续时间: {n_frames * hop / sr:.2f}s")
print(f"值范围: [{min(min(f) for f in mel_spec):.1f}, {max(max(f) for f in mel_spec):.1f}]")
```

## 使用它

| 模型       | 输入特征       | n_mels | 帧率  |
| ---------- | -------------- | ------ | ----- |
| Whisper    | log-mel        | 80     | 100/s |
| MusicGen   | EnCodec tokens | —      | 75/s  |
| F5-TTS     | mel            | 80     | 100/s |
| ECAPA-TDNN | MFCC或mel      | 40/80  | 100/s |
| BEATs      | log-mel        | 128    | 100/s |

经验法则：**当不确定时，使用 80 频带的 log-mel，帧长 25 ms，帧移 10 ms。** 这是 2026 年的默认设置。

## 常见陷阱

- **忘记取对数。** 线性Mel能量跨度多个数量级；对数压缩是必需的。
- **Mel滤波器组数量错误。** Whisper 使用 80；MFCC 系统通常使用 40。不匹配 = 垃圾输入。
- **功率谱 vs 幅度谱。** Mel滤波器组应用于功率谱（幅度的平方），而不是幅度。
- **DCT类型混淆。** MFCC 使用 Type-II DCT。使用错误的DCT类型会产生不同的系数。

## 交付它

将结果保存为 `outputs/skill-mel-features.md`。为给定音频任务选择特征类型、n_mels、帧长和帧移。

## 练习

1. **简单。** 运行 `code/main.py`。它计算一个合成信号的 log-mel 和 MFCC，并打印形状和统计信息。
2. **中等。** 加载一个真实音频文件，计算 40-mel 和 80-mel 频谱图。比较它们的频率分辨率。
3. **困难。** 实现从 log-mel 频谱图重建波形（Griffin-Lim 算法）。测量原始和重建信号之间的 MSE。

## 关键术语

| 术语        | 通俗说法     | 实际含义                                   |
| ----------- | ------------ | ------------------------------------------ |
| Mel刻度     | 感知频率     | 对数频率刻度，匹配人类音高感知。           |
| Mel滤波器组 | 三角形滤波器 | 在Mel刻度上均匀分布的三角形带通滤波器组。  |
| Log-mel     | 默认特征     | 对数Mel能量；几乎所有音频模型的输入。      |
| MFCC        | 传统特征     | log-mel上的DCT；13个系数捕获主要语音信息。 |
| 频谱图      | 时频图       | 随时间变化的频率能量2D可视化。             |
| 帧长/帧移   | 窗口参数     | 帧长控制频率分辨率；帧移控制时间分辨率。   |

## 延伸阅读

- [Stevens et al. (1937). Mel scale](https://en.wikipedia.org/wiki/Mel_scale) — 感知音高刻度。
- [Davis & Mermelstein (1980). MFCCs](https://ieeexplore.ieee.org/document/1163429) — 原始MFCC论文。
- [Librosa feature extraction](https://librosa.org/doc/main/feature.html) — Python参考实现。
- [Griffin-Lim algorithm](https://ieeexplore.ieee.org/document/1164317) — 从STFT幅度重建相位。
