---
title: 音频分类
description: '从MFCC上的k-NN到AST和BEATs，理解音频分类的完整技术栈'
module: 'ai-engineering'
difficulty: intermediate
tags:
  - 音频分类
  - AST
  - BEATs
  - MFCC
  - CNN
related:
  - 'ai-engineering/异常检测'
  - 'ai-engineering/音乐生成'
  - 'ai-engineering/音频基础'
  - 'ai-engineering/音频评估指标'
prerequisites:
  - 'ai-engineering/机器学习概述'
---

# 音频分类 — 从MFCC上的k-NN到AST和BEATs

> 从"狗叫还是警笛"到"这是什么语言"，都是音频分类。特征是Mel频谱。架构每十年演进一次。评估指标始终是AUC、F1和每类召回率。

**类型:** 构建
**语言:** Python
**前置条件:** Phase 6 · 02（频谱图与Mel），Phase 3 · 06（CNN），Phase 5 · 08（文本CNN与RNN）
**时间:** ~75 分钟

## 问题

你拿到一段10秒的音频片段。你想知道："这是什么？"城市声音（警笛、电钻、狗叫）、语音命令（是/否/停止）、语言识别（英语/西班牙语/阿拉伯语）、说话人情感（愤怒/中性）或环境声音（室内/室外、嘈杂）。所有这些都是*音频分类*，2026年的基线架构已经成熟：log-mel → CNN或Transformer → softmax。

核心难点不在于网络。而在于数据。音频数据集有严重的类别不平衡、强烈的域偏移（干净vs嘈杂）和标签噪声（谁决定了"城市嘈杂"vs"餐厅噪音"？）。问题的80%是数据整理、增强和评估，而不是把CNN换成Transformer。

## 概念

**MFCC上的k-NN（1990年代基线）。** 将每个音频片段的MFCC展平，与标注库计算余弦相似度，返回前K个的多数投票。在干净的小数据集（Speech Commands、ESC-50）上出奇地强。无需GPU即可运行。

**Log-mel上的2D CNN（2015-2019）。** 将 `(T, n_mels)` 的log-mel当作图像处理。应用ResNet-18或VGG风格网络。在时间轴上做全局均值池化。Softmax分类。在2026年大多数Kaggle竞赛中仍是基线。

**Audio Spectrogram Transformer, AST（2021-2024）。** 将log-mel分块（如16x16块），添加位置嵌入，送入ViT。在AudioSet上达到mAP 0.485的有监督学习SOTA。

**BEATs和WavLM-base（2024-2026）。** 在数百万小时数据上自监督预训练。用1-10%的有监督数据微调即可达到效果。2026年这是非语音音频的默认起点。BEATs-iter3在AudioSet上比AST高1-2 mAP，同时计算量仅为1/4。

**Whisper编码器作为冻结骨干（2024）。** 取Whisper的编码器，去掉解码器，接上线性分类器。在语言识别和简单事件分类上接近SOTA，无需音频增强。这是"免费午餐"基线。

### 类别不平衡才是真正的挑战

ESC-50：50类，每类40个片段——平衡，简单。UrbanSound8K：10类，10:1不平衡。AudioSet：632类，100,000:1长尾。有效技术：

- 训练时平衡采样（评估时不使用）。
- Mixup：线性插值两个音频片段（及其标签）作为增强。
- SpecAugment：遮蔽随机时间和频率带。简单但关键。

### 评估

- 多类别互斥（Speech Commands）：top-1准确率、top-5准确率。
- 多类别多标签（AudioSet、UrbanSound风格）：平均精度均值（mAP）。
- 严重不平衡：每类召回率 + 宏F1。

2026年你应该知道的数字：

| 基准               | 基线        | 2026 SOTA           | 来源             |
| ------------------ | ----------- | ------------------- | ---------------- |
| ESC-50             | 82% (AST)   | 97.0% (BEATs-iter3) | BEATs论文 (2024) |
| AudioSet mAP       | 0.485 (AST) | 0.548 (BEATs-iter3) | HEAR排行榜 2026  |
| Speech Commands v2 | 98% (CNN)   | 99.0% (Audio-MAE)   | HEAR v2结果      |

## 构建它

### 步骤 1：特征提取

```python
def featurize_mfcc(signal, sr, n_mfcc=13, n_mels=40, frame_len=400, hop=160):
    mag = stft_magnitude(signal, frame_len, hop)
    fb = mel_filterbank(n_mels, frame_len, sr)
    mels = apply_filterbank(mag, fb)
    log = log_transform(mels)
    return [dct_ii(frame, n_mfcc) for frame in log]
```

### 步骤 2：定长摘要

```python
def summarize(mfcc_frames):
    n = len(mfcc_frames[0])
    mean = [sum(f[i] for f in mfcc_frames) / len(mfcc_frames) for i in range(n)]
    var = [
        sum((f[i] - mean[i]) ** 2 for f in mfcc_frames) / len(mfcc_frames) for i in range(n)
    ]
    return mean + var
```

简单但有效：时间轴上的均值+方差为13系数MFCC生成26维固定嵌入。瞬间完成。直到2017年仍在ESC-50上击败最先进的神经网络基线。

### 步骤 3：k-NN

```python
def cosine(a, b):
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a)) or 1e-12
    nb = math.sqrt(sum(x * x for x in b)) or 1e-12
    return dot / (na * nb)

def knn_classify(q, bank, labels, k=5):
    sims = sorted(range(len(bank)), key=lambda i: -cosine(q, bank[i]))[:k]
    votes = Counter(labels[i] for i in sims)
    return votes.most_common(1)[0][0]
```

### 步骤 4：升级到log-mel上的CNN

在PyTorch中：

```python
import torch.nn as nn

class AudioCNN(nn.Module):
    def __init__(self, n_mels=80, n_classes=50):
        super().__init__()
        self.body = nn.Sequential(
            nn.Conv2d(1, 32, 3, padding=1), nn.ReLU(), nn.MaxPool2d(2),
            nn.Conv2d(32, 64, 3, padding=1), nn.ReLU(), nn.MaxPool2d(2),
            nn.Conv2d(64, 128, 3, padding=1), nn.ReLU(),
            nn.AdaptiveAvgPool2d(1),
        )
        self.head = nn.Linear(128, n_classes)

    def forward(self, x):  # x: (B, 1, T, n_mels)
        return self.head(self.body(x).flatten(1))
```

3M参数。在单张RTX 4090上约10分钟训练ESC-50。80%+准确率。

### 步骤 5：2026年默认选择 — 微调BEATs

```python
from transformers import ASTFeatureExtractor, ASTForAudioClassification

ext = ASTFeatureExtractor.from_pretrained("MIT/ast-finetuned-audioset-10-10-0.4593")
model = ASTForAudioClassification.from_pretrained(
    "MIT/ast-finetuned-audioset-10-10-0.4593",
    num_labels=50,
    ignore_mismatched_sizes=True,
)

inputs = ext(audio, sampling_rate=16000, return_tensors="pt")
logits = model(**inputs).logits
```

对于BEATs，通过 `beats` 库使用 `microsoft/BEATs-base`；transformers API的接口形式相同。

## 使用它

2026年技术栈：

| 场景                  | 起步选择                                    |
| --------------------- | ------------------------------------------- |
| 小数据集（<1000片段） | MFCC均值上的k-NN（你的基线）+ 音频增强      |
| 中等数据集（1K-100K） | BEATs或AST微调                              |
| 大数据集（>100K）     | 从头训练或微调Whisper编码器                 |
| 实时、边缘设备        | 40-MFCC CNN，量化为int8（KWS风格）          |
| 多标签（AudioSet）    | BEATs-iter3 + BCE损失 + mixup + SpecAugment |
| 语言识别              | MMS-LID，SpeechBrain VoxLingua107基线       |

决策规则：**从冻结骨干开始，而不是新模型。** 微调BEATs的分类头可以在几小时内达到SOTA的95%，而不是几周。

## 交付它

将结果保存为 `outputs/skill-classifier-designer.md`。为给定音频分类任务选择架构、增强策略、类别平衡策略和评估指标。

## 练习

1. **简单。** 运行 `code/main.py`。它在4类合成数据集（不同音高的纯音）上训练k-NN MFCC基线。报告混淆矩阵。
2. **中等。** 将 `summarize` 替换为[均值、方差、偏度、峰度]。4矩池化是否在相同合成数据集上优于均值+方差？
3. **困难。** 使用 `torchaudio`，在ESC-50 fold 1上训练2D CNN。报告5折交叉验证准确率。添加SpecAugment（时间遮蔽=20，频率遮蔽=10）并报告增量。

## 关键术语

| 术语        | 通俗说法              | 实际含义                                      |
| ----------- | --------------------- | --------------------------------------------- |
| AudioSet    | 音频界的ImageNet      | Google的200万片段、632类弱标注YouTube数据集。 |
| ESC-50      | 小型分类基准          | 50类 x 40个环境声音片段。                     |
| AST         | 音频频谱图Transformer | 在log-mel块上的ViT；2021 SOTA。               |
| BEATs       | 自监督音频            | 微软模型，iter3截至2026年领先AudioSet。       |
| Mixup       | 配对增强              | `x = λ·x1 + (1-λ)·x2; y = λ·y1 + (1-λ)·y2`。  |
| SpecAugment | 遮蔽增强              | 将频谱图的随机时间和频率带置零。              |
| mAP         | 主要多标签指标        | 跨类别和阈值的平均精度均值。                  |

## 延伸阅读

- [Gong, Chung, Glass (2021). AST: Audio Spectrogram Transformer](https://arxiv.org/abs/2104.01778) — 2021-2024的标志性架构。
- [Chen et al. (2022, rev. 2024). BEATs: Audio Pre-Training with Acoustic Tokenizers](https://arxiv.org/abs/2212.09058) — 2024+的默认选择。
- [Park et al. (2019). SpecAugment](https://arxiv.org/abs/1904.08779) — 主导的音频增强方法。
- [Piczak (2015). ESC-50 dataset](https://github.com/karolpiczak/ESC-50) — 持续使用的50类基准。
- [Gemmeke et al. (2017). AudioSet](https://research.google.com/audioset/) — 632类YouTube分类体系；仍是黄金标准。
