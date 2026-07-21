---
title: 语音识别ASR
description: '理解CTC、RNN-T和注意力机制三种语音识别范式'
module: 'ai-engineering'
difficulty: intermediate
tags:
  - ASR
  - CTC
  - 'RNN-T'
  - Whisper
  - 语音识别
related:
  - 'ai-engineering/语音活动检测'
  - 'ai-engineering/语音克隆与转换'
  - 'ai-engineering/语音助手流水线'
  - 'ai-engineering/张量运算'
prerequisites:
  - 'ai-engineering/机器学习概述'
---

# 语音识别 (ASR) — CTC、RNN-T、注意力机制

> 语音识别是在每个时间步上做音频分类，再用一个懂英语和静音的序列模型把它们粘起来。CTC、RNN-T和注意力是三种实现方式。选择一种，理解为什么。

**类型:** 构建
**语言:** Python
**前置条件:** Phase 6 · 02（频谱图与Mel），Phase 5 · 08（文本CNN与RNN），Phase 5 · 10（注意力机制）
**时间:** ~45 分钟

## 问题

你有一段10秒的16 kHz音频片段。你想要一个字符串："turn on the kitchen lights"。挑战是结构性的：音频帧与字符不是一一对应的。单词"okay"可能需要200 ms或1200 ms。静音分隔话语。某些音素比其他音素更长。输出token的数量预先未知。

三种方案解决这个问题：

1. **CTC（连接主义时序分类）。** 逐帧输出token概率，包括特殊的*空白*标记。解码时折叠重复和空白。非自回归，快速。wav2vec 2.0、MMS使用。
2. **RNN-T（循环神经网络转换器）。** 联合网络根据编码器帧和之前的token预测下一个token。可流式处理。Google的设备端ASR、NVIDIA Parakeet使用。
3. **注意力编码器-解码器。** 编码器将音频压缩为隐藏状态，解码器交叉注意力自回归地生成token。Whisper、SeamlessM4T使用。

2026年，LibriSpeech test-clean上的SOTA WER为1.4%（Parakeet-TDT-1.1B，NVIDIA）和1.58%（Whisper-Large-v3-turbo）。差异很小；部署差异巨大。

## 概念

**CTC直觉。** 让编码器输出 `T` 个帧级分布，覆盖 `V+1` 个token（V个字符+空白）。对于长度为 `U < T` 的目标字符串 `y`，任何折叠后等于 `y` 的帧对齐都算。CTC损失对所有这样的对齐求和。推理：逐帧argmax，折叠重复，移除空白。

优点：非自回归、可流式、零前瞻。缺点：_条件独立性假设_ — 每帧预测相互独立，因此没有内部语言模型。通过beam search或浅融合的外部LM来修复。

**RNN-T直觉。** 添加一个*预测器*网络来嵌入token历史，一个*连接器*将预测器状态与编码器帧结合为 `V+1` 的联合分布（`+1` 是空/不发射）。显式建模CTC忽略的条件依赖。可流式，因为每步只依赖过去的帧和过去的token。

优点：可流式 + 内部LM。缺点：训练更复杂、更耗内存（3D损失网格）；RNN-T损失内核本身就是一个完整的库类别。

**注意力编码器-解码器。** 编码器（6-32层Transformer）处理log-mel帧。解码器（6-32层Transformer）交叉注意力编码器输出以自回归方式生成token。无对齐约束 — 注意力可以查看音频的任何位置。除非限制注意力（分块Whisper-Streaming，2024），否则不可流式。

优点：离线ASR最高质量，使用标准seq2seq工具易于训练。缺点：自回归延迟与输出长度成正比；不经工程化无法流式处理。

### WER：唯一的数字

**词错误率** = `(S + D + I) / N`，其中S=替换，D=删除，I=插入，N=参考词数。对应词级别的Levenshtein编辑距离。越低越好。WER高于20%通常不可用；低于5%对于朗读语音达到人类水平。2026年标准基准数字：

| 模型                   | LibriSpeech test-clean | LibriSpeech test-other | 大小     |
| ---------------------- | ---------------------- | ---------------------- | -------- |
| Parakeet-TDT-1.1B      | 1.40%                  | 2.78%                  | 1.1B参数 |
| Whisper-Large-v3-turbo | 1.58%                  | 3.03%                  | 809M     |
| Canary-1B Flash        | 1.48%                  | 2.87%                  | 1B       |
| Seamless M4T v2        | 1.7%                   | 3.5%                   | 2.3B     |

这些都是编码器-解码器或RNN-T架构。纯CTC系统（wav2vec 2.0）在test-clean上约1.8-2.1%。

## 构建它

### 步骤 1：贪心CTC解码

```python
def ctc_greedy(frame_logits, blank=0, vocab=None):
    # frame_logits: 每帧概率向量列表
    preds = [max(range(len(p)), key=lambda i: p[i]) for p in frame_logits]
    out = []
    prev = -1
    for p in preds:
        if p != prev and p != blank:
            out.append(p)
        prev = p
    return "".join(vocab[i] for i in out) if vocab else out
```

两条规则：折叠连续重复，丢弃空白。示例：`a a _ _ a b b _ c` → `a a b c`。

### 步骤 2：Beam-search CTC

```python
def ctc_beam(frame_logits, beam=8, blank=0):
    import math
    beams = [([], 0.0)]  # (tokens, log_prob)
    for p in frame_logits:
        log_p = [math.log(max(pi, 1e-10)) for pi in p]
        candidates = []
        for seq, lp in beams:
            for t, lpt in enumerate(log_p):
                new = seq[:] if t == blank else (seq + [t] if not seq or seq[-1] != t else seq)
                candidates.append((new, lp + lpt))
        candidates.sort(key=lambda x: -x[1])
        beams = candidates[:beam]
    return beams[0][0]
```

生产环境使用带LM融合的前缀树beam search；这是概念骨架。

### 步骤 3：WER

```python
def wer(ref, hyp):
    r, h = ref.split(), hyp.split()
    dp = [[0] * (len(h) + 1) for _ in range(len(r) + 1)]
    for i in range(len(r) + 1):
        dp[i][0] = i
    for j in range(len(h) + 1):
        dp[0][j] = j
    for i in range(1, len(r) + 1):
        for j in range(1, len(h) + 1):
            cost = 0 if r[i - 1] == h[j - 1] else 1
            dp[i][j] = min(
                dp[i - 1][j] + 1,
                dp[i][j - 1] + 1,
                dp[i - 1][j - 1] + cost,
            )
    return dp[len(r)][len(h)] / max(1, len(r))
```

### 步骤 4：使用Whisper推理

```python
import whisper
model = whisper.load_model("large-v3-turbo")
result = model.transcribe("clip.wav")
print(result["text"])
```

2026年最强通用ASR的一行代码。在24 GB GPU上以约20倍实时速度运行。

### 步骤 5：使用Parakeet或wav2vec 2.0流式处理

```python
from transformers import pipeline
asr = pipeline("automatic-speech-recognition", model="nvidia/parakeet-tdt-1.1b")
for chunk in streaming_audio():
    print(asr(chunk, return_timestamps=True))
```

流式ASR需要分块编码器注意力和延续状态；使用支持它的库（NeMo用于Parakeet，带 `chunk_length_s` 的 `transformers` pipeline）。

## 使用它

2026年技术栈：

| 场景                          | 选择                               |
| ----------------------------- | ---------------------------------- |
| 英语，离线，最高质量          | Whisper-large-v3-turbo             |
| 多语言，鲁棒                  | SeamlessM4T v2                     |
| 流式，低延迟                  | Parakeet-TDT-1.1B或Riva            |
| 边缘设备，移动端，<500 ms延迟 | 量化Whisper-Tiny或Moonshine (2024) |
| 长音频                        | Whisper + VAD分块（WhisperX）      |
| 特定领域（医疗、法律）        | 微调wav2vec 2.0 + 领域LM融合       |

## 2026年仍在出现的陷阱

- **没有VAD。** 在静音上运行Whisper会产生幻觉（"Thanks for watching!"）。始终用VAD门控。
- **字符vs词vs子词WER。** 在归一化后（小写、去标点）报告词级WER。
- **语言识别漂移。** Whisper的自动LID将嘈杂片段误路由到日语或威尔士语；知道时请强制 `language="en"`。
- **长片段未分块。** Whisper有30秒窗口。对更长的内容使用 `chunk_length_s=30, stride=5`。

## 交付它

将结果保存为 `outputs/skill-asr-picker.md`。为给定部署目标选择模型、解码策略、分块和LM融合方案。

## 练习

1. **简单。** 运行 `code/main.py`。它贪心解码手工制作的CTC输出并计算与参考的WER。
2. **中等。** 正确实现步骤2中的前缀树beam search（考虑空白合并规则）。在10个合成样本上与贪心解码比较。
3. **困难。** 在[LibriSpeech test-clean](https://www.openslr.org/12)上使用 `whisper-large-v3-turbo`。计算前100个话语的WER。与发表数字比较。

## 关键术语

| 术语          | 通俗说法       | 实际含义                                  |
| ------------- | -------------- | ----------------------------------------- |
| CTC           | 空白token损失  | 对所有帧到token对齐的边缘化；非自回归。   |
| RNN-T         | 流式损失       | CTC + 下一token预测器；处理词序。         |
| 注意力编-解码 | Whisper风格    | 编码器 + 交叉注意力解码器；最佳离线质量。 |
| WER           | 你要报告的数字 | 词级别的 `(S+D+I)/N`。                    |
| 空白          | 空无           | CTC中表示"此帧无发射"的特殊token。        |
| LM融合        | 外部语言模型   | 在beam search中添加加权LM对数概率。       |
| VAD           | 静音门         | 语音活动检测器；裁剪非语音部分。          |

## 延伸阅读

- [Graves et al. (2006). Connectionist Temporal Classification](https://www.cs.toronto.edu/~graves/icml_2006.pdf) — CTC论文。
- [Graves (2012). Sequence Transduction with RNNs](https://arxiv.org/abs/1211.3711) — RNN-T论文。
- [Radford et al. / OpenAI (2022). Whisper: Robust Speech Recognition via Large-Scale Weak Supervision](https://arxiv.org/abs/2212.04356) — 2022经典论文；v3-turbo扩展于2024年。
- [NVIDIA NeMo — Parakeet-TDT card](https://huggingface.co/nvidia/parakeet-tdt-1.1b) — 2026开放ASR排行榜领先者。
- [Hugging Face — Open ASR Leaderboard](https://huggingface.co/spaces/hf-audio/open_asr_leaderboard) — 25+模型的实时基准。
