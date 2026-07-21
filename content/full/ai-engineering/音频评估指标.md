---
title: 音频评估指标
description: 理解WER、MOS、UTMOS、MMAU、FAD、EER等2026年音频评估指标体系
module: 'ai-engineering'
difficulty: intermediate
tags:
  - 评估指标
  - WER
  - MOS
  - FAD
  - EER
  - SECS
related:
  - 'ai-engineering/音频分类'
  - 'ai-engineering/音频基础'
  - 'ai-engineering/音频语言模型'
  - 'ai-engineering/影子流量与金丝雀发布'
prerequisites:
  - 'ai-engineering/机器学习概述'
---

# 音频评估 — WER、MOS、UTMOS、MMAU、FAD与开放排行榜

> 你无法发布你无法衡量的东西。本课程命名2026年每个音频任务的指标：ASR（WER、CER、RTFx）、TTS（MOS、UTMOS、SECS、ASR往返WER）、音频语言（MMAU、LongAudioBench）、音乐（FAD、CLAP）和说话人（EER）。以及你比较的排行榜。

**类型:** 学习
**语言:** Python
**前置条件:** Phase 6 · 04, 06, 07, 09, 10; Phase 2 · 09（模型评估）
**时间:** ~60 分钟

## 问题

每个音频任务都有多个指标，每个衡量不同维度。使用错误的指标就是你发布一个在仪表盘上看起来很棒但在生产中很糟糕的模型的方式。2026年标准列表：

| 任务         | 主要             | 次要                             |
| ------------ | ---------------- | -------------------------------- |
| ASR          | WER              | CER · RTFx · 首token延迟         |
| TTS          | MOS / UTMOS      | SECS · ASR往返WER · CER · TTFA   |
| 语音克隆     | SECS (ECAPA余弦) | MOS · CER                        |
| 说话人验证   | EER              | minDCF · 工作点FAR/FRR           |
| 说话人分离   | DER              | JER · 说话人混淆                 |
| 音频分类     | top-1 · mAP      | 宏F1 · 每类召回                  |
| 音乐生成     | FAD              | CLAP · 听力面板MOS               |
| 音频语言模型 | MMAU-Pro         | LongAudioBench · AudioCaps FENSE |
| 流式S2S      | 延迟P50/P95      | WER · MOS                        |

## 概念

### ASR指标

**WER（词错误率）。** `(S + D + I) / N`。评分前小写、去标点、数字展开。使用 `jiwer` 或OpenAI的 `whisper_normalizer`。< 5% = 朗读语音人类水平。

**CER（字符错误率）。** 相同公式，字符级别。用于声调语言（普通话、粤语），其中词分割有歧义。

**RTFx（逆实时因子）。** 每挂钟秒处理的音频秒数。越高越好。Parakeet-TDT达到3380倍。Whisper-large-v3约30倍。

**首token延迟。** 从音频输入到首个转录token的挂钟时间。对流式关键。Deepgram Nova-3：约150 ms。

### TTS指标

**MOS（平均意见分）。** 1-5人类评分。黄金标准但慢。每样本收集20+听众，每模型100+样本。

**UTMOS (2022-2026)。** 学习的MOS预测器。在标准基准上与人类MOS相关约0.9。F5-TTS：UTMOS 3.95；真实语音：4.08。

**SECS（说话人编码器余弦相似度）。** 用于语音克隆。参考和克隆输出之间的ECAPA嵌入余弦。> 0.75 = 可识别克隆。

**ASR往返WER。** 将Whisper运行在TTS输出上，对输入文本计算WER。捕获可懂度回归。2026 SOTA：< 2% CER。

**TTFA（首音频时间）。** 挂钟延迟。Kokoro-82M：约100 ms；F5-TTS：约1秒。

### 语音克隆专用

**SECS + MOS + CER** 作为三元组。高SECS但低MOS的克隆意味着音色对但不自然；反之意味着自然声音但错误说话人。

### 说话人验证

**EER（等错误率）。** 错误接受率等于错误拒绝率时的阈值。VoxCeleb1-O上的ECAPA：0.87%。

**minDCF（最小检测代价）。** 在选定工作点（通常FAR=0.01）的加权代价。比EER更具生产相关性。

### 说话人分离

**DER（分离错误率）。** `(FA + Miss + Confusion) / total_speaker_time`。遗漏语音 + 误报语音 + 说话人混淆，各作为比例。AMI会议：DER约10-20%是现实的。pyannote 3.1 + Precision-2商业版：录制良好的音频上<10% DER。

**JER（Jaccard错误率）。** DER的替代，对短段偏差更鲁棒。

### 音频分类

多标签：**mAP（平均精度均值）** 跨所有类别。AudioSet：BEATs-iter3的0.548 mAP。

多类别互斥：**top-1、top-5准确率**。Speech Commands v2：99.0% top-1 (Audio-MAE)。

不平衡：**宏F1** + **每类召回率**。按类报告 — 汇总准确率隐藏了哪些类别失败。

### 音乐生成

**FAD（Fréchet音频距离）。** 真实vs生成音频的VGGish嵌入分布之间的距离。MusicCaps上的MusicGen-small：4.5。MusicLM：4.0。越低越好。

**CLAP分数。** 使用CLAP嵌入的文本-音频对齐分数。> 0.3 = 合理对齐。

**听力面板MOS。** 消费级音乐的最终裁判。Suno v5在TTS Arena上的ELO 1293（来自配对人类偏好）。

### 音频语言基准

**MMAU（大规模多音频理解）。** 10k音频QA对。

**MMAU-Pro。** 1800个难题，四个类别：语音/声音/音乐/多音频。4选项随机概率25%。Gemini 2.5 Pro总体约60%；所有模型多音频约22%。

**LongAudioBench。** 多分钟片段配语义查询。Audio Flamingo Next击败Gemini 2.5 Pro。

**AudioCaps / Clotho。** 标注基准。SPICE、CIDEr、FENSE指标。

### 流式语音到语音

**延迟P50 / P95 / P99。** 从用户语音结束到首个可听回应的挂钟时间。Moshi：200 ms；GPT-4o Realtime：300 ms。

**输出上的WER / MOS。**

**打断响应性。** 从用户打断到助手静音的时间。目标 < 150 ms。

### 2026年排行榜

| 排行榜                     | 赛道                   | URL                                                   |
| -------------------------- | ---------------------- | ----------------------------------------------------- |
| Open ASR Leaderboard (HF)  | 英语 + 多语言 + 长音频 | `huggingface.co/spaces/hf-audio/open_asr_leaderboard` |
| TTS Arena (HF)             | 英语TTS                | `huggingface.co/spaces/TTS-AGI/TTS-Arena`             |
| Artificial Analysis Speech | TTS + STT，配对投票ELO | `artificialanalysis.ai/speech`                        |
| MMAU-Pro                   | LALM推理               | `mmaubenchmark.github.io`                             |
| SpeakerBench / VoxSRC      | 说话人识别             | `voxsrc.github.io`                                    |
| MMAU音乐子集               | 音乐LALM               | (MMAU内)                                              |
| HEAR基准                   | 自监督音频             | `hearbenchmark.com`                                   |

## 构建它

### 步骤 1：带归一化的WER

```python
from jiwer import wer, Compose, ToLowerCase, RemovePunctuation, Strip

transform = Compose([ToLowerCase(), RemovePunctuation(), Strip()])
score = wer(
    truth="Please turn on the lights.",
    hypothesis="please turn on the light",
    truth_transform=transform,
    hypothesis_transform=transform,
)
# ~0.17
```

### 步骤 2：TTS往返WER

```python
def ttr_wer(tts_model, asr_model, texts):
    errors = []
    for txt in texts:
        audio = tts_model.synthesize(txt)
        recog = asr_model.transcribe(audio)
        errors.append(wer(truth=txt, hypothesis=recog))
    return sum(errors) / len(errors)
```

### 步骤 3：语音克隆的SECS

```python
from speechbrain.inference.speaker import EncoderClassifier
sv = EncoderClassifier.from_hparams("speechbrain/spkrec-ecapa-voxceleb")

emb_ref = sv.encode_batch(load_wav("reference.wav"))
emb_clone = sv.encode_batch(load_wav("cloned.wav"))
secs = torch.nn.functional.cosine_similarity(emb_ref, emb_clone, dim=-1).item()
```

### 步骤 4：音乐生成的FAD

```python
from frechet_audio_distance import FrechetAudioDistance
fad = FrechetAudioDistance()
score = fad.get_fad_score("generated_folder/", "reference_folder/")
```

### 步骤 5：说话人验证的EER（与课程6相同代码）

```python
def eer(same_scores, diff_scores):
    thresholds = sorted(set(same_scores + diff_scores))
    best = (1.0, 0.0)
    for t in thresholds:
        far = sum(1 for s in diff_scores if s >= t) / len(diff_scores)
        frr = sum(1 for s in same_scores if s < t) / len(same_scores)
        if abs(far - frr) < best[0]:
            best = (abs(far - frr), (far + frr) / 2)
    return best[1]
```

## 使用它

为每次部署配一个固定评估工具，在每次模型更新时运行。三条核心规则：

1. **评分前归一化。** 小写、去标点、数字展开。报告归一化规则。
2. **报告分布，不是平均值。** 延迟用P50/P95/P99。分类用每类召回。MMAU用每类别。
3. **运行一个标准公共基准。** 即使你的生产数据不同，在Open ASR / TTS Arena / MMAU上报告让评审者可以苹果对苹果比较。

## 陷阱

- **UTMOS外推。** 在VCTK风格干净语音上训练；对嘈杂/克隆/情感音频评分差。
- **MOS面板偏差。** 20个Amazon Mechanical Turk工人 ≠ 20个目标用户。如果风险高，为领域面板付费。
- **FAD依赖参考集。** 跨模型比较时使用相同的参考分布。
- **汇总WER。** 总体5% WER可能隐藏口音语音上30% WER。按人口统计切片报告。
- **公共基准饱和。** 大多数前沿模型在标准基准上接近天花板。构建反映你流量的内部保留集。

## 交付它

将结果保存为 `outputs/skill-audio-evaluator.md`。为任何音频模型发布选择指标、基准和报告格式。

## 练习

1. **简单。** 运行 `code/main.py`。在玩具输入上计算WER / CER / EER / SECS / 类FAD / 类MMAU。
2. **中等。** 构建TTS往返WER工具。将Kokoro或F5-TTS输出通过Whisper运行。在50个提示上计算WER。标记WER > 10%的提示。
3. **困难。** 在MMAU-Pro语音 + 多音频子集（各50项）上评分你课程10的LALM选择。报告每类别准确率并与发表数字比较。

## 关键术语

| 术语  | 通俗说法       | 实际含义                         |
| ----- | -------------- | -------------------------------- |
| WER   | ASR分数        | 归一化后词级别的 `(S+D+I)/N`。   |
| CER   | 字符WER        | 用于声调语言或字符级系统。       |
| MOS   | 人类意见       | 1-5评分；20+听众 x 100样本。     |
| UTMOS | ML MOS预测器   | 学习的模型；与人类MOS相关约0.9。 |
| SECS  | 语音克隆相似度 | 参考和克隆之间的ECAPA余弦。      |
| EER   | 说话人验证分数 | FAR = FRR时的阈值。              |
| DER   | 分离分数       | (FA + Miss + Confusion) / 总计。 |
| FAD   | 音乐生成质量   | VGGish嵌入上的Fréchet距离。      |
| RTFx  | 吞吐量         | 每挂钟秒的音频秒数。             |

## 延伸阅读

- [jiwer](https://github.com/jitsi/jiwer) — 带归一化工具的WER/CER库。
- [UTMOS (Saeki et al. 2022)](https://arxiv.org/abs/2204.02152) — 学习的MOS预测器。
- [Fréchet Audio Distance (Kilgour et al. 2019)](https://arxiv.org/abs/1812.08466) — 音乐生成标准。
- [Open ASR Leaderboard](https://huggingface.co/spaces/hf-audio/open_asr_leaderboard) — 2026年实时排名。
- [TTS Arena](https://huggingface.co/spaces/TTS-AGI/TTS-Arena) — 人类投票TTS排行榜。
- [MMAU-Pro基准](https://mmaubenchmark.github.io/) — LALM推理排行榜。
- [HEAR基准](https://hearbenchmark.com/) — 音频SSL基准。
