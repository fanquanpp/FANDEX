---
title: 傅里叶变换
description: 'DFT/FFT 实现、频谱分析、卷积定理、窗函数、STFT、位置编码的联系'
module: 'ai-engineering'
difficulty: advanced
tags:
  - 傅里叶变换
  - DFT
  - FFT
  - 频谱分析
  - 卷积定理
  - STFT
  - 位置编码
related:
  - 'ai-engineering/分离预填充与解码'
  - 'ai-engineering/复数'
  - 'ai-engineering/概率与分布'
  - 'ai-engineering/感知机'
prerequisites:
  - 'ai-engineering/机器学习概述'
---

# 傅里叶变换

> 傅里叶变换将信号分解为频率成分。它是信号处理的基础，也是理解位置编码的关键。

**类型：** 构建
**语言：** Python
**前置条件：** 阶段 1，第 19 课（复数）
**预计时间：** ~90 分钟

## 学习目标

- 从零实现 DFT 和 FFT，理解 O(n^2) 到 O(n log n) 的加速原理
- 分析信号的频谱，识别主要频率成分
- 应用卷积定理，理解时域卷积等价于频域乘法
- 解释 STFT 如何在时间和频率之间取得平衡
- 连接傅里叶分析与 Transformer 位置编码

## 问题所在

你有一段音频信号。它包含多个频率的叠加。你如何分离它们？傅里叶变换将信号从时域（随时间变化的振幅）变换到频域（每个频率的强度）。

在 AI 中，傅里叶分析出现在：

- **音频处理**：语音识别的特征提取
- **信号处理**：去噪，滤波
- **位置编码**：理解为什么正弦位置编码有效
- **卷积加速**：频域乘法比时域卷积快

## 核心概念

### DFT：离散傅里叶变换

```python
import numpy as np

def dft(x):
    """离散傅里叶变换 O(n^2)"""
    n = len(x)
    X = np.zeros(n, dtype=complex)
    for k in range(n):
        for n_idx in range(n):
            X[k] += x[n_idx] * np.exp(-2j * np.pi * k * n_idx / n)
    return X

# 测试信号：3 Hz + 7 Hz
n = 64
t = np.arange(n) / n
signal = np.sin(2 * np.pi * 3 * t) + 0.5 * np.sin(2 * np.pi * 7 * t)

X = dft(signal)
freqs = np.arange(n)

# 只看正频率部分
n_half = n // 2
magnitudes = np.abs(X[:n_half]) * 2 / n
print(f"主频率成分: {freqs[:n_half][magnitudes > 0.1]}")
```

### FFT：快速傅里叶变换

FFT 利用单位根的对称性将 DFT 从 O(n^2) 加速到 O(n log n)。

```python
def fft(x):
    """快速傅里叶变换（Cooley-Tukey）"""
    n = len(x)
    if n <= 1:
        return x

    # 分治：偶数和奇数索引
    even = fft(x[0::2])
    odd = fft(x[1::2])

    # 蝶形运算
    T = [np.exp(-2j * np.pi * k / n) * odd[k] for k in range(n // 2)]

    return [even[k] + T[k] for k in range(n // 2)] + \
           [even[k] - T[k] for k in range(n // 2)]

# 测试
n = 64
signal = np.random.randn(n)

X_dft = dft(signal)
X_fft = np.array(fft(signal))

print(f"DFT 和 FFT 结果一致: {np.allclose(X_dft, X_fft)}")
```

### 频谱分析

```python
def spectrum_analysis(signal, sample_rate):
    """频谱分析"""
    n = len(signal)
    X = np.fft.fft(signal)
    freqs = np.fft.fftfreq(n, 1/sample_rate)

    # 正频率部分
    pos_mask = freqs >= 0
    freqs = freqs[pos_mask]
    magnitudes = np.abs(X[pos_mask]) * 2 / n
    phases = np.angle(X[pos_mask])

    return freqs, magnitudes, phases

# 示例
sample_rate = 100
t = np.arange(0, 1, 1/sample_rate)
signal = np.sin(2 * np.pi * 5 * t) + 0.3 * np.sin(2 * np.pi * 20 * t)

freqs, mags, phases = spectrum_analysis(signal, sample_rate)
peak_freqs = freqs[mags > 0.1]
print(f"主频率: {peak_freqs}")
```

### 卷积定理

时域卷积 = 频域乘法。这使得大核卷积可以快速计算。

```python
def fft_convolution(signal, kernel):
    """使用 FFT 的快速卷积"""
    n_signal = len(signal)
    n_kernel = len(kernel)
    n_total = n_signal + n_kernel - 1

    # 零填充到 2 的幂次
    n_fft = 2 ** int(np.ceil(np.log2(n_total)))

    # FFT
    S = np.fft.fft(signal, n_fft)
    K = np.fft.fft(kernel, n_fft)

    # 频域乘法
    Y = S * K

    # 逆 FFT
    result = np.fft.ifft(Y).real

    return result[:n_total]

# 比较
signal = np.random.randn(1000)
kernel = np.random.randn(50)

result_fft = fft_convolution(signal, kernel)
result_np = np.convolve(signal, kernel)
print(f"FFT 卷积与 NumPy 一致: {np.allclose(result_fft, result_np)}")
```

### 窗函数

对有限信号做 FFT 会产生频谱泄漏。窗函数减少泄漏。

```python
def apply_window(signal, window_type="hann"):
    """应用窗函数"""
    n = len(signal)
    if window_type == "hann":
        window = 0.5 * (1 - np.cos(2 * np.pi * np.arange(n) / (n - 1)))
    elif window_type == "hamming":
        window = 0.54 - 0.46 * np.cos(2 * np.pi * np.arange(n) / (n - 1))
    else:
        window = np.ones(n)

    return signal * window
```

### STFT：短时傅里叶变换

STFT 在时间和频率之间取得平衡，分析信号的局部频率特征。

```python
def stft(signal, window_size=256, hop_size=128):
    """短时傅里叶变换"""
    n_windows = (len(signal) - window_size) // hop_size + 1
    stft_matrix = []

    for i in range(n_windows):
        start = i * hop_size
        window = signal[start:start + window_size]
        windowed = apply_window(window, "hann")
        X = np.fft.fft(windowed)[:window_size // 2]
        stft_matrix.append(np.abs(X))

    return np.array(stft_matrix).T

# 示例：chirp 信号（频率随时间增加）
sample_rate = 1000
t = np.arange(0, 2, 1/sample_rate)
chirp = np.sin(2 * np.pi * (50 + 100 * t) * t)

spectrogram = stft(chirp)
print(f"频谱图形状: {spectrogram.shape}")
```

### 傅里叶分析与位置编码

Transformer 的正弦位置编码可以用傅里叶分析理解：

```python
def sinusoidal_position_encoding(seq_len, dim, theta_base=10000):
    """正弦位置编码"""
    positions = np.arange(seq_len)[:, None]
    dims = np.arange(dim)[None, :]

    angles = positions / (theta_base ** (2 * dims / dim))

    encoding = np.zeros((seq_len, dim))
    encoding[:, 0::2] = np.sin(angles[:, 0::2])
    encoding[:, 1::2] = np.cos(angles[:, 1::2])

    return encoding

pe = sinusoidal_position_encoding(100, 64)
print(f"位置编码形状: {pe.shape}")
```

每个维度对应一个频率。低维度是低频（变化慢），高维度是高频（变化快）。这使得模型可以捕捉不同尺度的位置关系。

## 实际应用

| 概念     | AI 中的位置            |
| -------- | ---------------------- |
| FFT      | 音频特征提取，快速卷积 |
| 频谱分析 | 信号处理，异常检测     |
| 卷积定理 | 大核卷积加速           |
| STFT     | 语音识别，音频分类     |
| 位置编码 | Transformer 序列建模   |

## 练习

1. 对混合频率信号运行 FFT，识别各频率成分
2. 实现 FFT 卷积，与直接卷积比较速度（大核时差异明显）
3. 对 chirp 信号运行 STFT，观察频率随时间的变化
4. 比较正弦位置编码和 RoPE 的频谱特性
