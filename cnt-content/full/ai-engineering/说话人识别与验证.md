---
title: 说话人识别与验证
description: '从i-vector到ECAPA-TDNN和WavLM，理解说话人识别的嵌入与评分'
module: 'ai-engineering'
difficulty: intermediate
tags:
  - 说话人识别
  - 说话人验证
  - 'ECAPA-TDNN'
  - EER
  - 嵌入
related:
  - 'ai-engineering/数据管理'
  - 'ai-engineering/数值稳定性'
  - 'ai-engineering/随机过程'
  - 'ai-engineering/损失函数'
prerequisites:
  - 'ai-engineering/机器学习概述'
---

# 说话人识别与验证

> ASR问"他们说了什么？"说话人识别问"谁说的？"数学看起来一样 — 嵌入加余弦 — 但每个生产决策都取决于一个EER数字。

**类型:** 构建
**语言:** Python
**前置条件:** Phase 6 · 02（频谱图与Mel），Phase 5 · 22（嵌入模型）
**时间:** ~45 分钟

## 问题

用户说一个口令。你想知道：这是他们声称的那个人吗（_验证_，1:1），还是你注册库中的第一个人（_识别_，1:N）？或者都不是 — 这是一个未知说话人吗（_开集_）？

2018年前：GMM-UBM + i-vector。合理的EER但对通道偏移（电话vs笔记本）和情绪脆弱。2018-2022：x-vector（用角度间隔训练的TDNN骨干）。2022+：ECAPA-TDNN和WavLM-large嵌入。到2026年，该领域由三个模型和一个指标主导。

这个指标是**EER** — 等错误率。设置决策阈值使错误接受率 = 错误拒绝率。交叉点就是EER。用于每篇论文、每个排行榜、每个采购电话。

## 概念

**流水线。** 注册：录制目标说话人5-30秒；计算固定维度嵌入（ECAPA-TDNN为192维，WavLM-large为256维）。验证：获取测试话语嵌入；计算余弦相似度；与阈值比较。

**ECAPA-TDNN（2020，2026年仍占主导）。** 强调通道注意力、传播和聚合 - 时延神经网络。1D卷积块带挤压激励、多头注意力池化，后接线性层到192维。在VoxCeleb 1+2（2,700说话人，110万话语）上用加性角度间隔损失（AAM-softmax）训练。

**WavLM-SV（2022+）。** 用AAM损失微调预训练的WavLM-large SSL骨干。更高质量但更慢 — 300+ MB vs 15 MB。

**x-vector（基线）。** TDNN + 统计池化。经典；在CPU/边缘设备上仍有用。

**AAM-softmax。** 标准softmax在角度空间中添加间隔 `m`：对正确类别使用 `cos(θ + m)`。强制类间角度分离。典型 `m=0.2`，缩放 `s=30`。

### 评分

- **余弦**在注册和测试嵌入之间。基于阈值的决策。
- **PLDA（概率LDA）。** 将嵌入投影到潜在空间，其中同说话人vs不同说话人有闭式似然比。在余弦之上添加可减少10-20% EER。2020年前的标准；现在仅在闭集设置中使用。
- **分数归一化。** `S-norm` 或 `AS-norm`：对冒名顶替者的均值和标准差归一化每个分数。跨域评估必需。

### 你应该知道的数字（2026）

| 模型                     | VoxCeleb1-O EER | 参数  | 吞吐量 (A100) |
| ------------------------ | --------------- | ----- | ------------- |
| x-vector (经典)          | 3.10%           | 5 M   | 400倍实时     |
| ECAPA-TDNN               | 0.87%           | 15 M  | 200倍实时     |
| WavLM-SV large           | 0.42%           | 316 M | 20倍实时      |
| Pyannote 3.1 分割 + 嵌入 | 0.65%           | 6 M   | 100倍实时     |
| ReDimNet (2024)          | 0.39%           | 24 M  | 100倍实时     |

### 说话人分离

多说话人片段中"谁在什么时候说话"。流水线：VAD → 分割 → 对每段嵌入 → 聚类（层次聚类或谱聚类）→ 平滑边界。现代技术栈：`pyannote.audio` 3.1，将说话人分割 + 嵌入 + 聚类封装在一次调用中。2026年AMI上的SOTA DER约15%（从2022年的23%下降）。

## 构建它

### 步骤 1：从MFCC统计量构建简单嵌入

```python
def embed_mfcc_stats(signal, sr):
    frames = featurize_mfcc(signal, sr, n_mfcc=13)
    mean = [sum(f[i] for f in frames) / len(frames) for i in range(13)]
    std = [
        math.sqrt(sum((f[i] - mean[i]) ** 2 for f in frames) / len(frames))
        for i in range(13)
    ]
    return mean + std  # 26维
```

不是SOTA — 仅用于教学。`code/main.py` 在合成说话人数据上使用此方法作为概念验证。

### 步骤 2：余弦相似度 + 阈值

```python
def cosine(a, b):
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(x * x for x in b))
    return dot / (na * nb) if na and nb else 0.0

def verify(enroll, test, threshold=0.75):
    return cosine(enroll, test) >= threshold
```

### 步骤 3：从相似度对计算EER

```python
def eer(same_scores, diff_scores):
    thresholds = sorted(set(same_scores + diff_scores))
    best = (1.0, 1.0, 0.0)  # (fa, fr, threshold)
    for t in thresholds:
        fr = sum(1 for s in same_scores if s < t) / len(same_scores)
        fa = sum(1 for s in diff_scores if s >= t) / len(diff_scores)
        if abs(fa - fr) < abs(best[0] - best[1]):
            best = (fa, fr, t)
    return (best[0] + best[1]) / 2, best[2]
```

返回 (eer, eer处阈值)。两者都要报告。

### 步骤 4：使用SpeechBrain的生产系统

```python
from speechbrain.pretrained import EncoderClassifier

clf = EncoderClassifier.from_hparams(source="speechbrain/spkrec-ecapa-voxceleb")

# 注册：平均3-5个干净样本的嵌入
enroll = torch.stack([clf.encode_batch(load(x)) for x in enrollment_clips]).mean(0)
# 验证
score = clf.similarity(enroll, clf.encode_batch(load("test.wav"))).item()
verdict = score > 0.25   # ECAPA典型阈值；在你的数据上调整
```

### 步骤 5：使用pyannote进行说话人分离

```python
from pyannote.audio import Pipeline

pipe = Pipeline.from_pretrained("pyannote/speaker-diarization-3.1")
diarization = pipe("meeting.wav", num_speakers=None)
for turn, _, speaker in diarization.itertracks(yield_label=True):
    print(f"{turn.start:.1f}–{turn.end:.1f}  {speaker}")
```

## 使用它

2026年技术栈：

| 场景                        | 选择                               |
| --------------------------- | ---------------------------------- |
| 闭集1:1验证，边缘设备       | ECAPA-TDNN + 余弦阈值              |
| 开集验证，云端              | WavLM-SV + AS-norm                 |
| 说话人分离（会议、播客）    | `pyannote/speaker-diarization-3.1` |
| 反欺骗（重放/深度伪造检测） | AASIST或RawNet2                    |
| 小型嵌入式（KWS + 注册）    | Titanet-Small (NeMo)               |

## 陷阱

- **通道不匹配。** 在VoxCeleb（网络视频）上训练的模型 ≠ 电话音频。始终在目标通道上评估。
- **短话语。** 测试音频少于3秒时EER急剧下降。
- **带噪声注册。** 一个嘈杂的注册会毒化锚点。使用>=3个干净样本并取平均。
- **跨条件固定阈值。** 始终在目标领域的保留开发集上调整阈值。
- **非归一化嵌入上的余弦。** 先L2归一化；否则幅度占主导。

## 交付它

将结果保存为 `outputs/skill-speaker-verifier.md`。选择模型、注册协议、阈值调整计划和欺诈防护措施。

## 练习

1. **简单。** 运行 `code/main.py`。构建合成"说话人"（不同音调特征），注册，在100对试验列表上计算EER。
2. **中等。** 在30个VoxCeleb1话语（5说话人 x 6个）上使用SpeechBrain ECAPA。用余弦vs PLDA计算EER。
3. **困难。** 使用 `pyannote.audio` 构建完整的注册 → 分离 → 验证流水线。在AMI开发集上评估DER。

## 关键术语

| 术语        | 通俗说法     | 实际含义                                |
| ----------- | ------------ | --------------------------------------- |
| EER         | 核心指标     | 错误接受 = 错误拒绝时的阈值。           |
| 验证        | 1:1          | "这是Alice吗？"                         |
| 识别        | 1:N          | "谁在说话？"                            |
| 开集        | 可能有未知者 | 测试集可包含未注册说话人。              |
| 注册        | 注册         | 计算说话人的参考嵌入。                  |
| AAM-softmax | 损失函数     | 带加性角度间隔的softmax；强制聚类分离。 |
| PLDA        | 经典评分     | 概率LDA；嵌入之上的似然比评分。         |
| DER         | 分离指标     | 分离错误率 — 遗漏 + 误报 + 混淆。       |

## 延伸阅读

- [Snyder et al. (2018). X-Vectors: Robust DNN Embeddings for Speaker Recognition](https://www.danielpovey.com/files/2018_icassp_xvectors.pdf) — 经典深度嵌入论文。
- [Desplanques et al. (2020). ECAPA-TDNN](https://arxiv.org/abs/2005.07143) — 2020-2026主导架构。
- [Chen et al. (2022). WavLM: Large-Scale Self-Supervised Pre-Training for Full Stack Speech Processing](https://arxiv.org/abs/2110.13900) — 用于SV和分离的SSL骨干。
- [Bredin et al. (2023). pyannote.audio 3.1](https://github.com/pyannote/pyannote-audio) — 生产级分离 + 嵌入技术栈。
- [VoxCeleb排行榜 (更新至2026)](https://www.robots.ox.ac.uk/~vgg/data/voxceleb/) — 当前各模型EER排名。
