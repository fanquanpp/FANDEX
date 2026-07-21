---
title: Whisper架构与微调
description: '深入理解Whisper的编码器-解码器架构、分块推理和LoRA微调'
module: 'ai-engineering'
difficulty: intermediate
tags:
  - Whisper
  - ASR
  - 微调
  - LoRA
  - Transformer
related:
  - 'ai-engineering/vLLM服务内部机制'
  - 'ai-engineering/vLLM生产栈与LMCache'
prerequisites:
  - 'ai-engineering/机器学习概述'
---

# Whisper — 架构与微调

> Whisper是一个30秒窗口的Transformer编码器-解码器，在68万小时多语言弱监督音频-文本对上训练。一个架构，多种任务，覆盖99种语言。2026年的参考ASR。

**类型:** 构建
**语言:** Python
**前置条件:** Phase 6 · 04（ASR），Phase 5 · 10（注意力机制），Phase 7 · 05（完整Transformer）
**时间:** ~75 分钟

## 问题

Whisper由OpenAI于2022年9月发布，是第一个作为商品发布的ASR模型：粘贴音频，获取文本，99种语言，对噪声鲁棒，可在笔记本上运行。到2024年，OpenAI发布了Large-v3和Turbo变体；到2026年，Whisper是从播客转录到语音助手到YouTube字幕的默认基线。

但Whisper不是一个可以永远当作黑盒的流水线。域偏移会摧毁它 — 技术术语、说话人口音、专有名词、短片段、静音。你需要知道：

1. 它内部到底是什么。
2. 如何正确地给它分块、流式或长音频输入。
3. 何时微调以及如何微调。

## 概念

**架构。** 标准Transformer编码器-解码器。

- 输入：30秒log-mel频谱图，80个Mel频带，10 ms帧移 → 3000帧。短片段零填充，长片段分块。
- 编码器：卷积下采样（步长2）+ `N` 个Transformer块。Large-v3：32层，1280维，20头。
- 解码器：`N` 个Transformer块，带因果自注意力 + 对编码器输出的交叉注意力。与编码器相同大小。
- 输出：51,865词表上的BPE token。

Large-v3有1.55B参数。Turbo使用4层解码器（从32层减少），延迟降低8倍，WER损失<1%。

**提示格式。** Whisper是一个多任务模型，通过解码器提示中的特殊token来控制：

```
<|startoftranscript|><|en|><|transcribe|><|notimestamps|> Hello world.
```

- `<|en|>` — 语言标签；强制翻译vs转录行为。
- `<|transcribe|>` 或 `<|translate|>` — 将任何语言输入翻译为英语输出，或逐字转录。
- `<|notimestamps|>` — 跳过词级时间戳（更快）。

提示让一个模型执行多种任务。将 `<|en|>` 改为 `<|fr|>` 即可转录法语。

**30秒窗口。** 一切都固定在30秒。更长的片段需要分块；更短的片段需要填充。窗口本身不支持流式 — 这就是WhisperX、Whisper-Streaming和faster-whisper存在的原因。

**Log-mel归一化。** `(log_mel - mean) / std`，其中统计量来自Whisper自己的训练语料。你*必须*使用Whisper的预处理（`whisper.audio.log_mel_spectrogram`），而不是 `librosa.feature.melspectrogram`。

### 2026年变体

| 变体                     | 参数  | 延迟 (A100) | WER (LibriSpeech-clean) |
| ------------------------ | ----- | ----------- | ----------------------- |
| Tiny                     | 39M   | 1倍实时     | 5.4%                    |
| Base                     | 74M   | 1倍         | 4.1%                    |
| Small                    | 244M  | 1倍         | 3.0%                    |
| Medium                   | 769M  | 1倍         | 2.7%                    |
| Large-v3                 | 1.55B | 2倍         | 1.8%                    |
| Large-v3-turbo           | 809M  | 8倍         | 1.58%                   |
| Whisper-Streaming (2024) | 1.55B | 流式        | 2.0%                    |

### 微调

2026年标准工作流：

1. 收集10-100小时目标领域的音频及对齐转录。
2. 使用 `transformers.Seq2SeqTrainer` 和 `generate_with_loss` 回调。
3. 参数高效：对注意力层的 `q_proj`、`k_proj`、`v_proj` 进行LoRA，GPU内存减少4倍，WER损失<0.3。
4. 如果少于10小时数据，冻结编码器。只调整解码器。
5. 使用Whisper自己的tokenizer和提示格式；永远不要替换tokenizer。

社区结果：在20小时医疗口述数据上微调Medium，WER从12%降至4.5%。在4小时冰岛语数据上微调Turbo，WER从18%降至6%。

## 构建它

### 步骤 1：开箱即用运行Whisper

```python
import whisper
model = whisper.load_model("large-v3-turbo")
result = model.transcribe(
    "clip.wav",
    language="en",
    task="transcribe",
    temperature=0.0,
    condition_on_previous_text=False,  # 防止级联重复
)
print(result["text"])
for seg in result["segments"]:
    print(f"[{seg['start']:.2f}–{seg['end']:.2f}] {seg['text']}")
```

你应该始终覆盖的关键默认值：`temperature=0.0`（采样默认0.0 → 0.2 → 0.4…回退链），`condition_on_previous_text=False`（防止级联幻觉问题），和 `no_speech_threshold=0.6`（静音检测）。

### 步骤 2：分块长音频

```python
# whisperx是2026年带词级时间戳的长音频参考
import whisperx
model = whisperx.load_model("large-v3-turbo", device="cuda", compute_type="float16")
segments = model.transcribe("1hour.mp3", batch_size=16, chunk_size=30)
```

WhisperX添加了(1) Silero VAD门控，(2) 通过wav2vec 2.0的词级对齐，(3) 通过 `pyannote.audio` 的说话人分离。2026年生产转录的主力工具。

### 步骤 3：使用LoRA微调

```python
from transformers import WhisperForConditionalGeneration, WhisperProcessor
from peft import LoraConfig, get_peft_model

model = WhisperForConditionalGeneration.from_pretrained("openai/whisper-large-v3-turbo")
lora = LoraConfig(
    r=16, lora_alpha=32, target_modules=["q_proj", "v_proj"],
    lora_dropout=0.1, bias="none", task_type="SEQ_2_SEQ_LM",
)
model = get_peft_model(model, lora)
# model.print_trainable_parameters()  -> ~3M可训练 / 809M总计
```

然后标准Trainer循环。每1000步保存检查点。在保留集上用WER评估。

### 步骤 4：检查每层学到了什么

```python
# 在解码期间获取交叉注意力权重，查看解码器关注什么
with torch.inference_mode():
    out = model.generate(
        input_features=features,
        return_dict_in_generate=True,
        output_attentions=True,
    )
# out.cross_attentions: layer × head × step × src_len
```

用热力图可视化 — 你会看到解码器步进扫描编码器帧时的对角线对齐。那条对角线就是Whisper的词时间戳概念。

## 使用它

2026年技术栈：

| 场景            | 选择                                 |
| --------------- | ------------------------------------ |
| 通用英语，离线  | Large-v3-turbo via `whisperx`        |
| 移动端/边缘设备 | 量化Whisper-Tiny (int8) 或 Moonshine |
| 多语言长音频    | Large-v3 via `whisperx` + 说话人分离 |
| 低资源语言      | 用LoRA微调Medium或Turbo              |
| 流式（2秒延迟） | Whisper-Streaming或Parakeet-TDT      |
| 词级时间戳      | WhisperX（通过wav2vec 2.0强制对齐）  |

`faster-whisper`（CTranslate2后端）是2026年最快的CPU+GPU推理运行时 — 比原版快4倍，输出完全相同。

## 2026年仍在出现的陷阱

- **静音上的幻觉文本。** 在字幕上训练的Whisper包含"Thanks for watching!"、"Subscribe!"、歌词。始终在调用前进行VAD门控。
- **`condition_on_previous_text`级联。** 一次幻觉会污染后续窗口。除非需要跨块流畅性，否则设为 `False`。
- **短片段填充。** 2秒片段填充到30秒可能在尾部静音中产生幻觉。使用 `pad=False` 或VAD门控。
- **错误的Mel统计量。** 使用librosa的mel而不是Whisper的会产生近乎随机的输出。使用 `whisper.audio.log_mel_spectrogram`。

## 交付它

将结果保存为 `outputs/skill-whisper-tuner.md`。为给定领域设计Whisper微调或推理流水线。

## 练习

1. **简单。** 运行 `code/main.py`。它tokenize一个Whisper风格的提示，计算解码形状预算，并打印10分钟片段的分块调度。
2. **中等。** 安装 `faster-whisper`，转录一个10分钟播客，与人工转录比较WER。尝试 `language="auto"` vs 强制 `language="en"`。
3. **困难。** 使用HF `datasets`，选择一个Whisper表现不佳的语言（如乌尔都语），用LoRA微调Medium 2个epoch（2小时数据），报告WER变化。

## 关键术语

| 术语        | 通俗说法      | 实际含义                                   |
| ----------- | ------------- | ------------------------------------------ |
| 30秒窗口    | Whisper的限制 | 硬输入上限；更长的音频需要分块。           |
| SOT         | 转录起始      | `<\|startoftranscript\|>` 启动解码器提示。 |
| 时间戳token | 时间对齐      | 每0.02秒偏移是51k词表中的特殊token。       |
| Turbo       | 快速变体      | 4层解码器，8倍更快，<1% WER回退。          |
| WhisperX    | 长音频包装器  | VAD + Whisper + wav2vec对齐 + 说话人分离。 |
| LoRA微调    | 高效调优      | 在注意力上添加低秩适配器；训练约0.3%参数。 |
| 幻觉        | 静默失败      | Whisper从噪声/静音中产生流利的英语。       |

## 延伸阅读

- [Radford et al. (2022). Whisper论文](https://arxiv.org/abs/2212.04356) — 原始架构和训练方法。
- [OpenAI (2024). Whisper Large-v3-turbo发布](https://github.com/openai/whisper/discussions/2363) — 4层解码器，8倍加速。
- [Bain et al. (2023). WhisperX](https://arxiv.org/abs/2303.00747) — 长音频、词对齐、说话人分离。
- [Systran — faster-whisper仓库](https://github.com/SYSTRAN/faster-whisper) — CTranslate2后端，4倍更快。
- [HuggingFace — Whisper微调教程](https://huggingface.co/blog/fine-tune-whisper) — 标准LoRA/全量微调指南。
