---
title: 音频Transformer与Whisper
description: '音频是频率随时间的图像,Whisper是一个吃mel频谱图并说回来的ViT'
module: 'deep-learning'
difficulty: intermediate
tags:
  - Whisper
  - 语音识别
  - ASR
  - mel频谱图
  - '编码器-解码器'
related:
  - 'deep-learning/位置编码'
  - 'deep-learning/学习率调度'
  - 'deep-learning/优化器'
  - 'deep-learning/正则化'
prerequisites:
  - 'deep-learning/深度学习概述'
---

# 音频Transformer — Whisper架构

> 音频是频率随时间的图像。Whisper是一个吃mel频谱图并说回来的ViT。

**类型:** 学习
**语言:** Python
**前置知识:** 阶段7 · 05(完整Transformer), 阶段7 · 08(编码器-解码器), 阶段7 · 09(ViT)
**预计时间:** ~45分钟

## 问题所在

在Whisper(OpenAI, Radford et al. 2022)之前,最先进的自动语音识别(ASR)意味着wav2vec 2.0和HuBERT——自监督特征提取器加微调头。高质量,昂贵的数据管道,领域脆弱。多语言语音识别需要每个语系单独的模型。

Whisper下了三个赌注:

1. **在所有数据上训练。** 680,000小时从互联网抓取的弱标注音频,覆盖97种语言。没有干净的学术语料库。没有音素标签。
2. **多任务单模型。** 一个解码器联合训练转录、翻译、语音活动检测、语言识别和时间戳,通过任务token实现。
3. **标准编码器-解码器transformer。** 编码器消费log-mel频谱图。解码器自回归产生文本token。没有声码器,没有CTC,没有HMM。

结果: Whisper large-v3在口音、噪音和零干净标注数据的语言上都很鲁棒。它是2026年每个开源语音助手和大多数商业语音助手的默认语音前端。

## 核心概念

### 步骤1 — 重采样 + 窗口

音频16 kHz。裁剪/填充到30秒。计算log-mel频谱图: 80个mel bin, 10 ms步幅 → ~3,000帧 × 80特征。这就是Whisper看到的"输入图像"。

### 步骤2 — 卷积茎

两个Conv1D层,核3,步幅2,将3,000帧减少到1,500。序列长度减半,不增加很多参数。

### 步骤3 — 编码器

24层(large)transformer编码器,1,500个时间步。正弦位置编码,自注意力, GELU FFN。产生1,500 × 1,280隐藏状态。

### 步骤4 — 解码器

24层transformer解码器。它自回归地从BPE词汇产生token,该词汇是GPT-2词汇的超集,加了几个音频特定的特殊token。

### 步骤5 — 任务token

解码器提示以控制token开始,告诉模型做什么:

```
<|startoftranscript|>  <|en|>  <|transcribe|>  <|0.00|>
```

或

```
<|startoftranscript|>  <|fr|>  <|translate|>   <|0.00|>
```

模型在此约定上训练。你通过前缀控制任务。这是2026年指令调优的等价物,但应用于语音。

### 步骤6 — 输出

束搜索(宽度5)带log-prob阈值。当 `<|notimestamps|>` token不存在时,每0.02秒音频预测时间戳。

### Whisper规模

| 模型           | 参数  | 层数 | d_model | 头数 | VRAM (fp16)       |
| -------------- | ----- | ---- | ------- | ---- | ----------------- |
| Tiny           | 39M   | 4    | 384     | 6    | ~1 GB             |
| Base           | 74M   | 6    | 512     | 8    | ~1 GB             |
| Small          | 244M  | 12   | 768     | 12   | ~2 GB             |
| Medium         | 769M  | 24   | 1024    | 16   | ~5 GB             |
| Large          | 1550M | 32   | 1280    | 20   | ~10 GB            |
| Large-v3       | 1550M | 32   | 1280    | 20   | ~10 GB            |
| Large-v3-turbo | 809M  | 32   | 1280    | 20   | ~6 GB (4层解码器) |

Large-v3-turbo(2024)将解码器从32层削减到4层。8倍更快解码,<1 WER点回归。这种解码速度解锁就是为什么Whisper-turbo是2026年实时语音代理的默认选择。

### Whisper不能做什么

- 没有说话人分离(谁在说话)。配合pyannote使用。
- 没有原生实时流式——30秒窗口是固定的。现代封装器(`faster-whisper`, `WhisperX`)通过VAD + 重叠来加流式。
- 没有外部分块时30秒以上的长格式上下文。实践中效果很好,因为人类语音很少需要长程上下文来转录。

### 2026年格局

| 任务        | 模型                     | 备注                                     |
| ----------- | ------------------------ | ---------------------------------------- |
| 英语ASR     | Whisper-turbo, Moonshine | Moonshine在边缘上快4倍                   |
| 多语言ASR   | Whisper-large-v3         | 97种语言                                 |
| 流式ASR     | faster-whisper + VAD     | 可实现150 ms延迟目标                     |
| TTS         | Piper, XTTS-v2, Kokoro   | 编码器-解码器模式,但Whisper形            |
| 音频 + 语言 | AudioLM, SeamlessM4T     | 一个transformer中的文本token + 音频token |

## 动手构建

参见 `code/main.py`。我们不训练Whisper——我们构建log-mel频谱图管道 + 任务token提示格式化器。这些是你在生产中实际接触的部分。

### 步骤1:合成音频

生成一个440 Hz采样16 kHz的1秒正弦波。16,000个样本。

### 步骤2:log-mel频谱图(简化)

完整的mel频谱图需要FFT。我们做一个简化的分帧 + 逐帧能量版本,展示管道而不需要 `librosa`:

```python
def frame_signal(x, frame_size=400, hop=160):
    frames = []
    for start in range(0, len(x) - frame_size + 1, hop):
        frames.append(x[start:start + frame_size])
    return frames
```

帧 = 25 ms, 步幅 = 10 ms。匹配Whisper的窗口化。逐帧能量代替mel bin用于教学。

### 步骤3:填充到30秒

Whisper总是处理30秒块。将频谱图填充(或裁剪)到3,000帧。

### 步骤4:构建提示token

```python
def whisper_prompt(lang="en", task="transcribe", timestamps=True):
    tokens = ["<|startoftranscript|>", f"<|{lang}|>", f"<|{task}|>"]
    if not timestamps:
        tokens.append("<|notimestamps|>")
    return tokens
```

这就是整个任务控制面。4个token的前缀。

## 实际应用

```python
import whisper
model = whisper.load_model("large-v3-turbo")
result = model.transcribe("meeting.wav", language="en", task="transcribe")
print(result["text"])
print(result["segments"][0]["start"], result["segments"][0]["end"])
```

更快,OpenAI兼容:

```python
from faster_whisper import WhisperModel
model = WhisperModel("large-v3-turbo", compute_type="int8_float16")
segments, info = model.transcribe("meeting.wav", vad_filter=True)
for s in segments:
    print(f"{s.start:.2f} - {s.end:.2f}: {s.text}")
```

**2026年何时选择Whisper:**

- 一个模型的多语言ASR。
- 嘈杂、多样音频的鲁棒转录。
- 研究/原型ASR——最快的起点。

**何时选择其他:**

- 边缘上超低延迟流式——Moonshine在匹配质量下击败Whisper。
- 需要<200 ms的实时对话AI——专用流式ASR。
- 说话人分离——Whisper不做这个;加pyannote。

## 交付成果

参见 `outputs/skill-asr-configurator.md`。该技能为新的语音应用选择ASR模型、解码参数和预处理管道。

## 练习

1. **简单。** 运行 `code/main.py`。确认16 kHz、10 ms步幅的1秒信号的帧数约100帧。30秒: 约3,000帧。
2. **中等。** 使用 `numpy.fft` 构建完整log-mel频谱图。验证80个mel bin在数值误差内匹配 `librosa.feature.melspectrogram(n_mels=80)`。
3. **困难。** 实现流式推理:将音频分成10秒窗口,2秒重叠,在每个块上运行Whisper,合并转录。在5分钟播客样本上测量词错误率 vs 单次通过。

## 关键术语

| 术语              | 人们怎么说            | 实际含义                                                           |
| ----------------- | --------------------- | ------------------------------------------------------------------ |
| Mel频谱图         | "音频图像"            | 2D表示:一轴频率bin,另一轴时间帧;每单元对数缩放能量。               |
| Log-mel           | "Whisper看到的"       | 通过对数的mel频谱图;近似人耳对响度的感知。                         |
| 帧                | "一个时间切片"        | 25 ms的样本窗口;10 ms步幅重叠。                                    |
| 任务token         | "语音的提示前缀"      | 解码器提示中的特殊token如 `<\|transcribe\|>` / `<\|translate\|>`。 |
| 语音活动检测(VAD) | "找到语音"            | 在ASR之前去除静音的门;大幅降低成本。                               |
| CTC               | "连接主义时间分类"    | 用于无对齐训练的经典ASR损失;Whisper不使用它。                      |
| Whisper-turbo     | "小编码器,完整编码器" | large-v3编码器 + 4层解码器;8倍更快解码。                           |
| Faster-whisper    | "生产封装器"          | CTranslate2重新实现;int8量化;比OpenAI参考快4倍。                   |

## 延伸阅读

- [Radford et al. (2022). Robust Speech Recognition via Large-Scale Weak Supervision](https://arxiv.org/abs/2212.04356) — Whisper论文。
- [OpenAI Whisper repo](https://github.com/openai/whisper) — 参考代码 + 模型权重。阅读 `whisper/model.py` 可以在大约400行中看到Conv1D茎 + 编码器 + 解码器的完整实现。
- [OpenAI Whisper — `whisper/decoding.py`](https://github.com/openai/whisper/blob/main/whisper/decoding.py) — 步骤5-6中描述的束搜索 + 任务token逻辑在这里;500行,完全可读。
- [Baevski et al. (2020). wav2vec 2.0: A Framework for Self-Supervised Learning of Speech Representations](https://arxiv.org/abs/2006.11477) — 前身;在某些设置中仍然是SOTA特征。
- [SYSTRAN/faster-whisper](https://github.com/SYSTRAN/faster-whisper) — 生产封装器,比参考快4倍。
- [Jia et al. (2024). Moonshine: Speech Recognition for Live Transcription and Voice Commands](https://arxiv.org/abs/2410.15608) — 2024年边缘友好ASR,Whisper形但更小。
- [HuggingFace blog — "Fine-Tune Whisper For Multilingual ASR with Transformers"](https://huggingface.co/blog/fine-tune-whisper) — 规范微调方案,包括mel频谱图预处理器和token-时间戳处理。
- [HuggingFace `modeling_whisper.py`](https://github.com/huggingface/transformers/blob/main/src/transformers/models/whisper/modeling_whisper.py) — 完整实现(编码器, 解码器, 交叉注意力, 生成),与课程架构图对应。
