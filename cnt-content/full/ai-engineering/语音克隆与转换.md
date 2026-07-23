---
title: 语音克隆与转换
description: 理解零样本克隆、语音转换和水印合规的完整技术栈
module: 'ai-engineering'
difficulty: advanced
tags:
  - 语音克隆
  - 语音转换
  - 'F5-TTS'
  - 'KNN-VC'
  - 水印
related:
  - 'ai-engineering/优化器'
  - 'ai-engineering/语音活动检测'
  - 'ai-engineering/语音识别ASR'
  - 'ai-engineering/语音助手流水线'
prerequisites:
  - 'ai-engineering/机器学习概述'
---

# 语音克隆与语音转换

> 语音克隆用别人的声音读你的文本。语音转换将你的声音改写为别人的，同时保留你说的内容。两者都基于同一种分解：将说话人身份与内容分离。

**类型:** 构建
**语言:** Python
**前置条件:** Phase 6 · 06（说话人识别），Phase 6 · 07（TTS）
**时间:** ~75 分钟

## 问题

2026年，5秒音频片段足以在消费级GPU上产生任何人的高质量语音克隆。ElevenLabs、F5-TTS、OpenVoice v2、VoiceBox都提供零样本或少样本克隆。这项技术既是福音（无障碍TTS、配音、辅助语音），也是武器（诈骗电话、政治深度伪造、IP盗窃）。

两个密切相关的任务：

- **语音克隆（TTS端）：** 文本 + 5秒参考声音 → 该声音的音频。
- **语音转换（语音端）：** 源音频（A说X）+ B的参考声音 → B说X的音频。

两者都将波形分解为（内容、说话人、韵律），然后将一个来源的内容与另一个来源的说话人重新组合。

2026年你现在必须遵守的关键约束：**水印和同意门在EU（AI法案，2026年8月可执行）和加州（AB 2905，2025年生效）中是法律要求的。** 你的流水线必须发出不可听的水印并拒绝非自愿克隆。

## 概念

**零样本克隆。** 将5秒片段传给在数千说话人上训练的模型。说话人编码器将片段映射为说话人嵌入；TTS解码器根据该嵌入加文本生成。

使用者：F5-TTS (2024)、YourTTS (2022)、XTTS v2 (2024)、OpenVoice v2 (2024)。

**少样本微调。** 录制目标声音5-30分钟。LoRA微调基础模型一小时。质量从"还行"跃升到"无法区分"。Coqui和ElevenLabs都支持这种模式；社区在F5-TTS上使用。

**语音转换 (VC)。** 两个家族：

- **识别-合成。** 运行ASR类模型提取内容表示（如软音素后验、PPG），然后用目标说话人嵌入重新合成。对语言和口音鲁棒。KNN-VC (2023)、Diff-HierVC (2023)使用。
- **解耦。** 训练自编码器在瓶颈处分离内容、说话人和韵律。推理时交换说话人嵌入。质量较低但更快。AutoVC (2019)、VITS-VC变体使用。

**基于神经编解码的克隆（2024+）。** VALL-E、VALL-E 2、NaturalSpeech 3、VoiceBox — 将音频视为SoundStream/EnCodec的离散token，在编解码token上训练大型自回归或流匹配模型。在短提示上的质量可与ElevenLabs媲美。

### 伦理问题，不是附加项

**水印。** PerTh和SilentCipher (2024) 在音频中不可感知地嵌入约16-32位ID。在重新编码、流传输和常见编辑后仍可存活。生产就绪的开源方案。

**同意门。** 必须将每个克隆输出与可验证的同意记录配对。"我，Rohit，于2026-04-22，授权此声音用于X目的。"存储在防篡改日志中。

**检测。** AASIST、RawNet2和Wav2Vec2-AASIST作为检测器发布。ASVspoof 2025挑战发布了针对ElevenLabs、VALL-E 2和Bark输出的0.8-2.3% EER的最先进检测器。

### 数字（2026）

| 模型         | 零样本？ | SECS (目标相似度) | WER (可懂度) | 参数 |
| ------------ | -------- | ----------------- | ------------ | ---- |
| F5-TTS       | 是       | 0.72              | 2.1%         | 335M |
| XTTS v2      | 是       | 0.65              | 3.5%         | 470M |
| OpenVoice v2 | 是       | 0.70              | 2.8%         | 220M |
| VALL-E 2     | 是       | 0.77              | 2.4%         | 370M |
| VoiceBox     | 是       | 0.78              | 2.1%         | 330M |

SECS > 0.70 对大多数听众来说通常与目标无法区分。

## 构建它

### 步骤 1：用识别-合成分解（main.py中的代码演示）

```python
def clone_pipeline(ref_audio, text, target_embedder, tts_model):
    speaker_emb = target_embedder.encode(ref_audio)
    mel = tts_model(text, speaker=speaker_emb)
    return vocoder(mel)
```

概念上简单；实现在 `tts_model` 和说话人编码器中。

### 步骤 2：使用F5-TTS零样本克隆

```python
from f5_tts.api import F5TTS
tts = F5TTS()
wav = tts.infer(
    ref_file="rohit_5s.wav",
    ref_text="The quick brown fox jumps over the lazy dog.",
    gen_text="Please add milk and bread to my list.",
)
```

参考转录必须与音频完全匹配；不匹配会破坏对齐。

### 步骤 3：使用KNN-VC进行语音转换

```python
import torch
from knnvc import KNNVC  # 2023模型, https://github.com/bshall/knn-vc
vc = KNNVC.load("wavlm-base-plus")
out_wav = vc.convert(source="my_voice.wav", target_pool=["alice_1.wav", "alice_2.wav"])
```

KNN-VC运行WavLM为源和目标池提取逐帧嵌入，然后用目标池中最近邻替换每个源帧。非参数化，一分钟目标语音即可工作。

### 步骤 4：嵌入水印

```python
from silentcipher import SilentCipher
sc = SilentCipher(model="2024-06-01")
payload = b"consent_id:abc123;ts:1745353200"
watermarked = sc.embed(wav, sr=24000, message=payload)
detected = sc.detect(watermarked, sr=24000)   # 返回payload字节
```

约32位payload，在MP3重编码和轻度噪声后可检测。

### 步骤 5：同意门

```python
def cloned_inference(text, ref_audio, consent_record):
    assert verify_signature(consent_record), "Signed consent required"
    assert consent_record["speaker_id"] == hash_speaker(ref_audio)
    wav = tts.infer(ref_file=ref_audio, gen_text=text)
    wav = watermark(wav, payload=consent_record["id"])
    return wav
```

## 使用它

2026年技术栈：

| 场景                | 选择                                |
| ------------------- | ----------------------------------- |
| 5秒零样本克隆，开源 | F5-TTS或OpenVoice v2                |
| 商业生产克隆        | ElevenLabs Instant Voice Clone v2.5 |
| 语音转换（改写）    | KNN-VC或Diff-HierVC                 |
| 多说话人微调        | StyleTTS 2 + 说话人适配器           |
| 跨语言克隆          | XTTS v2或VALL-E X                   |
| 深度伪造检测        | Wav2Vec2-AASIST                     |

## 陷阱

- **参考转录不对齐。** F5-TTS等要求参考文本与参考音频完全匹配，包括标点。
- **混响参考。** 回声摧毁克隆。录制干燥、近距离麦克风。
- **情感不匹配。** 训练参考"欢快"会产生所有内容的欢快克隆。将参考情感与目标用途匹配。
- **语言泄漏。** 克隆英语说话人然后要求模型说法语通常会带口音；使用跨语言模型（XTTS、VALL-E X）。
- **没有水印。** 从2026年8月起在EU法律上不可发布。

## 交付它

将结果保存为 `outputs/skill-voice-cloner.md`。设计带同意门 + 水印 + 质量目标的克隆或转换流水线。

## 练习

1. **简单。** 运行 `code/main.py`。通过计算交换前后两个"说话人"的余弦来演示说话人嵌入交换。
2. **中等。** 使用OpenVoice v2克隆你自己的声音。测量参考和克隆之间的SECS。通过Whisper测量CER。
3. **困难。** 对20个克隆应用SilentCipher水印，通过128 kbps MP3编码+解码，检测payload。报告位准确率。

## 关键术语

| 术语          | 通俗说法       | 实际含义                                |
| ------------- | -------------- | --------------------------------------- |
| 零样本克隆    | 5秒就够了      | 预训练模型 + 说话人嵌入；无需训练。     |
| PPG           | 音素后验图     | 逐帧ASR后验，用作语言无关的内容表示。   |
| KNN-VC        | 最近邻转换     | 用最近的目标池帧替换每个源帧。          |
| 神经编解码TTS | VALL-E风格     | 在EnCodec/SoundStream token上的AR模型。 |
| 水印          | 不可听签名     | 嵌入音频中的比特，在重编码后仍可存活。  |
| SECS          | 克隆保真度     | 目标和克隆说话人嵌入之间的余弦。        |
| AASIST        | 深度伪造检测器 | 反欺骗模型；检测合成语音。              |

## 延伸阅读

- [Chen et al. (2024). F5-TTS](https://arxiv.org/abs/2410.06885) — 开源SOTA零样本克隆。
- [Baevski et al. / Microsoft (2023). VALL-E](https://arxiv.org/abs/2301.02111) 和 [VALL-E 2 (2024)](https://arxiv.org/abs/2406.05370) — 神经编解码TTS。
- [Qian et al. (2019). AutoVC](https://arxiv.org/abs/1905.05879) — 基于解耦的语音转换。
- [Baas, Waubert de Puiseau, Kamper (2023). KNN-VC](https://arxiv.org/abs/2305.18975) — 基于检索的VC。
- [SilentCipher (2024) — 音频水印](https://github.com/sony/silentcipher) — 生产就绪的32位音频水印。
- [ASVspoof 2025结果](https://www.asvspoof.org/) — 检测器vs合成器军备竞赛，更新至2026年。
