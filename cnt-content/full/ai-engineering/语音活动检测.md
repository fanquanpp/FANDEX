---
title: 语音活动检测
description: 理解VAD级联、轮次检测和刷新技巧的完整技术栈
module: 'ai-engineering'
difficulty: intermediate
tags:
  - VAD
  - 轮次检测
  - Silero
  - 端点检测
  - 语音活动检测
related:
  - 'ai-engineering/优化方法'
  - 'ai-engineering/优化器'
  - 'ai-engineering/语音克隆与转换'
  - 'ai-engineering/语音识别ASR'
prerequisites:
  - 'ai-engineering/机器学习概述'
---

# 语音活动检测与轮次切换 — Silero、Cobra与刷新技巧

> 每个语音代理的生死取决于两个决策：用户现在在说话吗？他们说完了没有？VAD回答第一个。轮次检测（VAD + 静音挂起 + 语义端点模型）回答第二个。任何一个出错，你的助手要么打断用户，要么永远不停。

**类型:** 构建
**语言:** Python
**前置条件:** Phase 6 · 11（实时音频），Phase 6 · 12（语音助手）
**时间:** ~45 分钟

## 问题

语音代理在每个20 ms块上做三个不同决策：

1. **这一帧是语音吗？** — VAD。二值，逐帧。
2. **用户是否开始了新的话语？** — 起始检测。
3. **用户是否说完了？** — 端点检测（轮次结束）。

朴素答案（能量阈值）在任何噪声下都会失败 — 交通、键盘、人群嘈杂。2026年的答案：Silero VAD（开源，深度学习）+ 轮次检测模型（语义端点）+ VAD校准的静音挂起。

## 概念

### 三层VAD级联

**第1层：能量门。** 最便宜。-40 dBFS阈值RMS。过滤明显静音但任何高于阈值的噪声都会触发。

**第2层：Silero VAD**（2020-2026，MIT）。1M参数。在6000+语言上训练。在单个CPU线程上每30 ms块约1 ms运行。5% FPR下87.7% TPR。开源默认。

**第3层：语义轮次检测器。** LiveKit的轮次检测模型（2024-2026）或你自己的小型分类器。区分"句中停顿"和"说完了"。使用语言上下文（语调 + 近期词语），不仅仅是静音。

### 关键参数及其默认值

- **阈值。** Silero输出概率；> 0.5（默认）或 > 0.3（敏感）分类为语音。更低阈值 = 更少首词截断，更多误触发。
- **最小语音持续时间。** 拒绝短于250 ms的语音 — 通常是咳嗽或椅子噪声。
- **静音挂起（端点检测）。** VAD回到0后，等待500-800 ms再宣布轮次结束。太短 → 打断用户。太长 → 感觉迟钝。
- **预滚动缓冲。** 保留VAD触发前300-500 ms的音频。防止"hey"被截断。

### 刷新技巧（Kyutai 2025）

流式STT模型有前瞻延迟（Kyutai STT-1B为500 ms，STT-2.6B为2.5 s）。通常你需要在语音结束后等那么久才能获得转录。刷新技巧：当VAD触发语音结束时，**向STT发送刷新信号**强制立即输出。STT以约4倍实时速度处理，所以500 ms缓冲在约125 ms内完成。

端到端：125 ms VAD + 刷新STT = 对话级延迟。

### 2026年VAD比较

| VAD                       | 5% FPR下TPR | 延迟   | 许可    |
| ------------------------- | ----------- | ------ | ------- |
| WebRTC VAD (Google, 2013) | 50.0%       | 30 ms  | BSD     |
| Silero VAD (2020-2026)    | 87.7%       | ~1 ms  | MIT     |
| Cobra VAD (Picovoice)     | 98.9%       | ~1 ms  | 商业    |
| pyannote分割              | 95%         | ~10 ms | MIT-ish |

Silero是正确的默认选择。Cobra是合规/准确性升级。纯能量VAD在2026年生产中没有位置。

## 构建它

### 步骤 1：能量门

```python
def energy_vad(chunk, threshold_dbfs=-40.0):
    rms = (sum(x * x for x in chunk) / len(chunk)) ** 0.5
    dbfs = 20.0 * math.log10(max(rms, 1e-10))
    return dbfs > threshold_dbfs
```

### 步骤 2：Python中的Silero VAD

```python
from silero_vad import load_silero_vad, get_speech_timestamps

vad = load_silero_vad()
audio = torch.tensor(waveform_16k, dtype=torch.float32)
segments = get_speech_timestamps(
    audio, vad, sampling_rate=16000,
    threshold=0.5,
    min_speech_duration_ms=250,
    min_silence_duration_ms=500,
    speech_pad_ms=300,
)
for s in segments:
    print(f"{s['start']/16000:.2f}s - {s['end']/16000:.2f}s")
```

### 步骤 3：轮次结束状态机

```python
class TurnDetector:
    def __init__(self, silence_hangover_ms=500, min_speech_ms=250):
        self.state = "idle"
        self.speech_ms = 0
        self.silence_ms = 0
        self.silence_hangover_ms = silence_hangover_ms
        self.min_speech_ms = min_speech_ms

    def update(self, is_speech, chunk_ms=20):
        if is_speech:
            self.speech_ms += chunk_ms
            self.silence_ms = 0
            if self.state == "idle" and self.speech_ms >= self.min_speech_ms:
                self.state = "speaking"
                return "START"
        else:
            self.silence_ms += chunk_ms
            if self.state == "speaking" and self.silence_ms >= self.silence_hangover_ms:
                self.state = "idle"
                self.speech_ms = 0
                return "END"
        return None
```

### 步骤 4：刷新技巧骨架

```python
def flush_on_end(stt_client, audio_buffer):
    stt_client.send_audio(audio_buffer)
    stt_client.send_flush()
    return stt_client.recv_transcript(timeout_ms=150)
```

STT（Kyutai、Deepgram、AssemblyAI）必须支持刷新才能工作。Whisper streaming不支持 — 它是基于块的，总是等待块。

## 使用它

| 场景             | VAD选择                        |
| ---------------- | ------------------------------ |
| 开源、快速、通用 | Silero VAD                     |
| 商业呼叫中心     | Cobra VAD                      |
| 设备端（手机）   | Silero VAD ONNX                |
| 研究/说话人分离  | pyannote分割                   |
| 零依赖后备       | WebRTC VAD (遗留)              |
| 需要轮次结束质量 | Silero + LiveKit轮次检测器分层 |

经验法则：除非真的没有其他选择，否则永远不要发布纯能量VAD。

## 陷阱

- **固定阈值。** 安静时有效，嘈杂时失败。要么在设备上校准，要么切换到Silero。
- **静音挂起太短。** 代理在句中打断用户。500-800 ms是对话语音的最佳点。
- **挂起太长。** 感觉迟钝。与目标用户A/B测试。
- **没有预滚动缓冲。** 用户音频前200-300 ms丢失。始终保留滚动预滚动。
- **忽略语义端点。** "嗯，让我想想..."包含长停顿。用户讨厌在思考中被打断。使用LiveKit的轮次检测器或类似方案。

## 交付它

将结果保存为 `outputs/skill-vad-tuner.md`。为工作负载选择VAD模型、阈值、挂起、预滚动和轮次检测策略。

## 练习

1. **简单。** 运行 `code/main.py`。它模拟一个语音 + 静音 + 语音 + 咳嗽序列，测试三层VAD。
2. **中等。** 安装 `silero-vad`，处理5分钟录音，调整阈值以最小化首词截断和误触发。报告精确率/召回率。
3. **困难。** 构建迷你轮次检测器：Silero VAD + 最近10个词嵌入上的3层MLP（使用sentence-transformers）。在手标轮次结束数据集上训练。比纯Silero高10% F1。

## 关键术语

| 术语        | 通俗说法           | 实际含义                                |
| ----------- | ------------------ | --------------------------------------- |
| VAD         | 语音检测器         | 逐帧二值：这是语音吗？                  |
| 轮次检测    | 端点检测           | VAD + 静音挂起 + 语义端点。             |
| 静音挂起    | 语音后等待         | 宣布轮次结束前等待的时间；500-800 ms。  |
| 预滚动      | 语音前缓冲         | 保留VAD触发前300-500 ms音频。           |
| 刷新技巧    | Kyutai技巧         | VAD → 刷新STT → 125 ms而非500 ms延迟。  |
| 语义端点    | "他们是否打算停？" | 查看词语而非仅静音的ML分类器。          |
| 5% FPR下TPR | ROC点              | 标准VAD基准；Silero 87.7%，WebRTC 50%。 |

## 延伸阅读

- [Silero VAD](https://github.com/snakers4/silero-vad) — 参考开源VAD。
- [Picovoice Cobra VAD](https://picovoice.ai/products/cobra/) — 商业准确率领先者。
- [Kyutai — Unmute + 刷新技巧](https://kyutai.org/stt) — 亚200 ms工程技巧。
- [LiveKit — 轮次检测](https://docs.livekit.io/agents/logic/turns/) — 生产中的语义端点。
- [WebRTC VAD](https://webrtc.googlesource.com/src/) — 遗留基线。
- [pyannote分割](https://github.com/pyannote/pyannote-audio) — 分离级分割。
