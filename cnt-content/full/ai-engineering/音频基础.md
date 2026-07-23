---
title: 音频基础
description: 从声波到数字信号，理解音频的物理基础与数字表示
module: 'ai-engineering'
difficulty: beginner
tags:
  - 音频
  - 信号处理
  - 采样
  - 傅里叶变换
related:
  - 'ai-engineering/音乐生成'
  - 'ai-engineering/音频分类'
  - 'ai-engineering/音频评估指标'
  - 'ai-engineering/音频语言模型'
prerequisites:
  - 'ai-engineering/机器学习概述'
---

# 音频基础 — 声波、采样与数字信号

> 音频AI从理解声波开始。采样率、位深、奈奎斯特定理和傅里叶变换不是可选的背景知识——它们是你调试每个模型时需要的东西。

**类型:** 构建
**语言:** Python
**前置条件:** 无
**时间:** ~45 分钟

## 问题

声波是空气中的连续压力变化。计算机处理离散数字。两者之间的桥梁——采样、量化、频域分析——是每个语音、音乐和音频系统的基石。误解采样率就是误解你的数据。

## 概念

### 声波

声音是纵波：空气分子压缩和稀疏，从声源向外传播。关键属性：

- **频率 (f)。** 每秒周期数，单位 Hz。人耳可感知约 20 Hz–20 kHz。A4 音符 = 440 Hz。
- **振幅。** 压力偏移量。感知为响度。单位：帕斯卡 (Pa)，但通常以 dB SPL 表示（对数刻度，20 µPa 为参考）。
- **相位。** 周期内的偏移量，0–2π 弧度。单声道不可感知；多通道干涉的关键。

### 采样

**奈奎斯特-香农定理。** 要完美捕获频率为 f 的信号，采样率必须 > 2f。人耳上限约 20 kHz，因此 CD 使用 44.1 kHz。语音 AI 使用 16 kHz（覆盖 0–8 kHz，足以满足语音清晰度）。

```python
# 连续信号 → 离散样本
sr = 16000  # 采样率 (Hz)
t = 1.0     # 持续时间 (秒)
n_samples = int(sr * t)
signal = [math.sin(2 * math.pi * 440 * i / sr) for i in range(n_samples)]
```

**混叠。** 如果信号包含高于 sr/2 的频率，它们会"折叠"回可听范围，产生虚假音调。预防：在采样前使用抗混叠低通滤波器。

### 量化

每个样本存储为整数（PCM）或浮点数。CD：16 位整数（-32768 到 32767）。AI：32 位浮点数，范围 [-1.0, 1.0]。

```python
# 浮点 → 16 位 PCM
pcm = [max(-32768, min(32767, int(s * 32767))) for s in signal]
```

### 傅里叶变换

任何信号都可以分解为正弦波之和。DFT 将 N 个时域样本转换为 N 个频率 bin：

```
X[k] = Σ x[n] · e^(-j2πkn/N)  for k = 0..N-1
```

实际使用 FFT（快速傅里叶变换），时间复杂度 O(N log N)。

```python
def dft(x):
    N = len(x)
    X = []
    for k in range(N):
        re = sum(x[n] * math.cos(2 * math.pi * k * n / N) for n in range(N))
        im = -sum(x[n] * math.sin(2 * math.pi * k * n / N) for n in range(N))
        X.append(complex(re, im))
    return X
```

**幅度谱。** `|X[k]|` — 每个频率 bin 的能量。**相位谱。** `∠X[k]` — 每个频率 bin 的相位偏移。大多数音频 AI 忽略相位；语音和音乐识别主要使用幅度。

### 短时傅里叶变换 (STFT)

真实音频随时间变化。单个 DFT 丢失时间信息。解决方案：将信号切成重叠的帧，对每帧进行 DFT。

```python
def stft(signal, frame_len=400, hop=160):
    frames = [signal[i:i+frame_len] for i in range(0, len(signal)-frame_len, hop)]
    window = [0.5 - 0.5 * math.cos(2 * math.pi * i / (frame_len - 1)) for i in range(frame_len)]
    return [dft([f * w for f, w in zip(frame, window)]) for frame in frames]
```

关键参数：

- **帧长。** 通常 25 ms（400 样本 @ 16 kHz）。频率分辨率 = sr / frame_len。
- **帧移。** 通常 10 ms（160 样本 @ 16 kHz）。时间分辨率 = hop / sr。
- **窗函数。** Hann 窗是默认选择。减少频谱泄漏。

输出：复数矩阵 `(n_frames, n_freq_bins)`，其中 `n_freq_bins = frame_len // 2 + 1`。

### 信号重建

**逆 STFT (iSTFT)。** 重叠相加法从 STFT 重建时域信号。Gabor 框架理论保证在正确窗化下完美重建。

```python
def istft(stft_matrix, frame_len=400, hop=160):
    output = [0.0] * ((len(stft_matrix) - 1) * hop + frame_len)
    window_sum = [0.0] * len(output)
    window = [0.5 - 0.5 * math.cos(2 * math.pi * i / (frame_len - 1)) for i in range(frame_len)]
    for i, frame in enumerate(stft_matrix):
        time_frame = idft(frame)
        start = i * hop
        for j in range(frame_len):
            output[start + j] += (time_frame[j] * window[j]).real
            window_sum[start + j] += window[j] ** 2
    return [s / max(w, 1e-10) for s, w in zip(output, window_sum)]
```

### 你应该知道的数字

| 参数     | 语音 AI      | 音乐 AI      | CD 音质    |
| -------- | ------------ | ------------ | ---------- |
| 采样率   | 16 kHz       | 44.1 kHz     | 44.1 kHz   |
| 位深     | 32-bit float | 32-bit float | 16-bit int |
| 帧长     | 25 ms (400)  | 23 ms (1024) | —          |
| 帧移     | 10 ms (160)  | 10 ms (441)  | —          |
| 频率 bin | 201          | 513          | —          |

## 构建它

### 步骤 1：生成测试信号

```python
import math

sr = 16000
duration = 1.0
n = int(sr * duration)

# 440 Hz 正弦波 + 880 Hz 泛音
signal = [0.7 * math.sin(2 * math.pi * 440 * i / sr) +
          0.3 * math.sin(2 * math.pi * 880 * i / sr) for i in range(n)]
```

### 步骤 2：计算幅度谱

```python
def magnitude_spectrum(signal, frame_len=400, hop=160):
    frames = [signal[i:i+frame_len] for i in range(0, len(signal)-frame_len, hop)]
    window = [0.5 - 0.5 * math.cos(2 * math.pi * j / (frame_len - 1)) for j in range(frame_len)]
    spectra = []
    for frame in frames:
        windowed = [s * w for s, w in zip(frame, window)]
        X = dft(windowed)
        mag = [abs(x) for x in X[:frame_len // 2 + 1]]
        spectra.append(mag)
    return spectra
```

### 步骤 3：可视化峰值

```python
# 找到频谱中的峰值频率
avg_spectrum = [sum(s[i] for s in spectra) / len(spectra) for i in range(len(spectra[0]))]
peak_bin = max(range(len(avg_spectrum)), key=lambda i: avg_spectrum[i])
peak_freq = peak_bin * sr / frame_len
print(f"峰值频率: {peak_freq:.1f} Hz")  # 应该接近 440 Hz
```

### 步骤 4：混叠演示

```python
# 以 8 kHz 采样 6 kHz 信号 → 混叠到 2 kHz
sr_low = 8000
aliased = [math.sin(2 * math.pi * 6000 * i / sr_low) for i in range(int(sr_low * 0.01))]
# 这会产生 2 kHz 信号，而不是 6 kHz！
```

## 使用它

| 任务           | 采样率   | 帧长  | 帧移  |
| -------------- | -------- | ----- | ----- |
| 语音识别 (ASR) | 16 kHz   | 25 ms | 10 ms |
| 说话人识别     | 16 kHz   | 25 ms | 10 ms |
| 音乐生成       | 44.1 kHz | 23 ms | 10 ms |
| 实时音频       | 48 kHz   | 20 ms | 10 ms |
| 音频分类       | 16 kHz   | 25 ms | 10 ms |

经验法则：**始终在模型期望的采样率下工作。** Whisper 期望 16 kHz；MusicGen 期望 32 kHz。重采样是第一步，不是事后补充。

## 常见陷阱

- **采样率不匹配。** 在 16 kHz 数据上训练，在 44.1 kHz 上推理 → 模型听到完全错误的频率。
- **忘记窗函数。** 无窗 DFT 产生频谱泄漏；相邻频率模糊在一起。
- **混叠。** 在降采样前未低通滤波 → 虚假频率。
- **int16 溢出。** 混合两个 int16 信号可能溢出。先转为 float，混合，再裁剪。

## 交付它

将结果保存为 `outputs/skill-audio-basics.md`。描述采样率、帧长、帧移和位深的选择，以及针对给定音频任务的奈奎斯特约束。

## 练习

1. **简单。** 运行 `code/main.py`。它生成 440 Hz + 880 Hz 信号，计算 STFT，并打印峰值频率。
2. **中等。** 修改 `code/main.py` 以 8 kHz 采样 6 kHz 正弦波。验证混叠频率为 2 kHz。
3. **困难。** 实现完整的 iSTFT（重叠相加），并验证 `istft(stft(x)) ≈ x`，MSE < 1e-10。

## 关键术语

| 术语         | 通俗说法       | 实际含义                               |
| ------------ | -------------- | -------------------------------------- |
| 采样率       | 每秒样本数     | 每秒捕获的离散点数；决定奈奎斯特频率。 |
| 奈奎斯特频率 | 最高可捕获频率 | sr/2；高于此频率的信号会混叠。         |
| STFT         | 频谱图计算器   | 短时傅里叶变换；逐帧 DFT。             |
| 帧长         | 窗口大小       | 每个 DFT 帧的样本数；控制频率分辨率。  |
| 帧移         | 步长           | 相邻帧之间的样本数；控制时间分辨率。   |
| 混叠         | 折叠           | 高频信号在低采样率下表现为低频。       |
| 窗函数       | 汉宁/汉明      | 平滑帧边缘以减少频谱泄漏。             |

## 延伸阅读

- [Smith, J.O. — Mathematics of the DFT](https://ccrma.stanford.edu/~jos/mdft/) — 最清晰的 DFT 数学参考。
- [Oppenheim & Willsky — Signals and Systems](https://www.pearson.com/en-us/subject-catalog/p/signals-and-systems/P200000003360) — 经典教科书。
- [Librosa STFT documentation](https://librosa.org/doc/main/generated/librosa.stft.html) — Python 实现参考。
- [Nyquist–Shannon theorem (Wikipedia)](https://en.wikipedia.org/wiki/Nyquist%E2%80%93Shannon_sampling_theorem) — 采样定理。
