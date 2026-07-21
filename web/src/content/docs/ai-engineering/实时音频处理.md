---
title: 实时音频处理
description: 理解实时音频的延迟预算、环形缓冲区、VAD门控和中断处理
module: 'ai-engineering'
difficulty: intermediate
tags:
  - 实时音频
  - 流式处理
  - VAD
  - WebRTC
  - 延迟
related:
  - 'ai-engineering/生产RAG聊天机器人监管垂直领域'
  - 'ai-engineering/时间序列'
  - 'ai-engineering/实时语音助手ASR到LLM到TTS'
  - 'ai-engineering/视频理解管线场景与QA与搜索'
prerequisites:
  - 'ai-engineering/机器学习概述'
---

# 实时音频处理

> 批量流水线处理文件。实时流水线在下20毫秒到达之前处理这20毫秒。每个对话AI、广播工作室和电话机器人的生死都取决于这个延迟预算。

**类型:** 构建
**语言:** Python
**前置条件:** Phase 6 · 02（频谱图），Phase 6 · 04（ASR），Phase 6 · 07（TTS）
**时间:** ~75 分钟

## 问题

你想要一个感觉有生命的语音助手。人类对话轮换延迟约230 ms（静音到响应）。超过500 ms感觉像机器人；超过1500 ms感觉坏了。2026年完整的**听 → 理解 → 回应 → 说**循环预算：

| 阶段           | 预算        |
| -------------- | ----------- |
| 麦克风 → 缓冲  | 20 ms       |
| VAD            | 10 ms       |
| ASR（流式）    | 150 ms      |
| LLM（首token） | 100 ms      |
| TTS（首块）    | 100 ms      |
| 渲染 → 扬声器  | 20 ms       |
| **总计**       | **~400 ms** |

Moshi（Kyutai，2024）实现了200 ms全双工。GPT-4o-realtime（2024）约320 ms。2022年的级联流水线延迟2500 ms。10倍改进来自三项技术：(1) 全面流式化，(2) 带部分结果的异步流水线，(3) 可中断生成。

## 概念

**帧/块/窗口。** 实时音频以固定大小块流动。常见选择：20 ms（16 kHz下320个样本）。下游所有环节必须跟上这个节奏。

**环形缓冲区。** 固定大小循环缓冲区。生产者线程写入新帧，消费者线程读取。防止热路径上的内存分配。大小约等于最大延迟 × 采样率；2秒16 kHz环形 = 32,000个样本。

**VAD（语音活动检测）。** 没人说话时门控下游工作。Silero VAD 4.0 (2024) 在CPU上每30 ms帧运行<1 ms。`webrtcvad`是较老的替代方案。

**流式ASR。** 音频到达时输出部分转录的模型。Parakeet-CTC-0.6B在流式模式下（NeMo，2024）以320 ms延迟达到2-5% WER。Whisper-Streaming（Macháček等，2023）分块Whisper实现近流式，延迟约2秒。

**中断。** 当用户在助手说话时说话，你必须(a)检测打断，(b)停止TTS，(c)丢弃剩余LLM输出。所有这些在100 ms内完成，否则用户感觉助手是聋的。

**WebRTC Opus传输。** 20 ms帧，48 kHz，自适应比特率8-128 kbps。浏览器和移动端的标准。LiveKit、Daily.co、Pion是2026年构建语音应用的技术栈。

**抖动缓冲区。** 网络数据包乱序/延迟到达。抖动缓冲区重新排序和平滑；太小 → 可听间隙，太大 → 延迟。典型60-80 ms。

### 常见问题

- **线程竞争。** Python的GIL + 重型模型可能饿死音频线程。使用C回调音频库（sounddevice、PortAudio），让Python远离热路径。
- **采样率转换延迟。** 流水线内重采样增加5-20 ms。要么预先重采样，要么使用零延迟重采样器（PolyPhase、`soxr_hq`）。
- **TTS预热。** 即使是快速的TTS如Kokoro，首次请求也有100-200 ms预热。缓存模型 + 在第一次真实轮次前用虚拟运行预热。
- **回声消除。** 没有AEC，TTS输出重新进入麦克风并触发ASR识别机器人自己的声音。WebRTC AEC3是开源默认。

## 构建它

### 步骤 1：环形缓冲区

```python
import collections

class RingBuffer:
    def __init__(self, capacity):
        self.buf = collections.deque(maxlen=capacity)
    def write(self, frame):
        self.buf.extend(frame)
    def read(self, n):
        return [self.buf.popleft() for _ in range(min(n, len(self.buf)))]
    def level(self):
        return len(self.buf)
```

容量决定最大缓冲延迟。16 kHz下32,000个样本 = 2秒。

### 步骤 2：VAD门控

```python
def simple_energy_vad(frame, threshold=0.01):
    return sum(x * x for x in frame) / len(frame) > threshold ** 2
```

生产环境替换为Silero VAD：

```python
import torch
vad, _ = torch.hub.load("snakers4/silero-vad", "silero_vad")
is_speech = vad(torch.tensor(frame), 16000).item() > 0.5
```

### 步骤 3：流式ASR

```python
# 通过NeMo的Parakeet-CTC-0.6B流式
from nemo.collections.asr.models import EncDecCTCModelBPE
asr = EncDecCTCModelBPE.from_pretrained("nvidia/parakeet-ctc-0.6b")
# chunk_ms=320 ms, look_ahead_ms=80 ms
for chunk in audio_stream():
    partial_text = asr.transcribe_streaming(chunk)
    print(partial_text, end="\r")
```

### 步骤 4：中断处理器

```python
class Dialog:
    def __init__(self):
        self.tts_task = None

    def on_user_speech(self, frame):
        if self.tts_task and not self.tts_task.done():
            self.tts_task.cancel()   # 打断
        # 然后送入流式ASR

    def on_final_user_utterance(self, text):
        self.tts_task = asyncio.create_task(self.reply(text))

    async def reply(self, text):
        async for tts_chunk in llm_then_tts(text):
            speaker.write(tts_chunk)
```

取决于异步I/O和可取消的TTS流。WebRTC peerconnection.stop()在音频轨道上是标准方式。

## 使用它

2026年技术栈：

| 层         | 选择                                 |
| ---------- | ------------------------------------ |
| 传输       | LiveKit (WebRTC) 或 Pion (Go)        |
| VAD        | Silero VAD 4.0                       |
| 流式ASR    | Parakeet-CTC-0.6B或Whisper-Streaming |
| LLM首token | Groq、Cerebras、vLLM-streaming       |
| 流式TTS    | Kokoro或ElevenLabs Turbo v2.5        |
| 回声消除   | WebRTC AEC3                          |
| 端到端原生 | OpenAI Realtime API或Moshi           |

## 陷阱

- **缓冲500 ms以求安全。** 缓冲区*就是*你的延迟下限。缩小它。
- **未固定线程。** 音频回调在优先级低于UI的线程上 = 负载下出现故障。
- **TTS块太小。** 小于200 ms的块使声码器伪影可听。320 ms块是最佳点。
- **没有抖动缓冲区。** 真实网络有抖动；没有平滑会出现爆音。
- **单次错误处理。** 音频流水线必须防崩溃。一个异常就杀死会话。

## 交付它

将结果保存为 `outputs/skill-realtime-designer.md`。设计带每阶段具体延迟预算的实时音频流水线。

## 练习

1. **简单。** 运行 `code/main.py`。模拟环形缓冲区 + 能量VAD；打印假10秒流的每阶段延迟。
2. **中等。** 使用 `sounddevice`，构建一个以20 ms帧处理麦克风并打印每帧VAD状态的直通循环。
3. **困难。** 用 `aiortc` 构建全双工回声测试：浏览器 → WebRTC → Python → WebRTC → 浏览器。用1 kHz脉冲测量端到端延迟。

## 关键术语

| 术语       | 通俗说法   | 实际含义                                    |
| ---------- | ---------- | ------------------------------------------- |
| 环形缓冲区 | 循环队列   | 固定大小、无锁（或SPSC锁）的音频帧FIFO。    |
| VAD        | 静音门     | 标记语音vs非语音的模型或启发式。            |
| 流式ASR    | 实时STT    | 音频到达时输出部分文本；有界前瞻。          |
| 抖动缓冲区 | 网络平滑器 | 重新排序乱序数据包的队列；典型60-80 ms。    |
| AEC        | 回声消除   | 减去扬声器到麦克风的反馈路径。              |
| 打断       | 用户中断   | 系统在TTS中间检测到用户语音；必须取消播放。 |
| 全双工     | 双向同时   | 用户和机器人可以同时说话；Moshi是全双工。   |

## 延伸阅读

- [Macháček et al. (2023). Whisper-Streaming](https://arxiv.org/abs/2307.14743) — 分块近流式Whisper。
- [Kyutai (2024). Moshi](https://kyutai.org/Moshi.pdf) — 全双工200 ms延迟。
- [LiveKit Agents框架 (2024)](https://docs.livekit.io/agents/) — 生产级音频代理编排。
- [Silero VAD仓库](https://github.com/snakers4/silero-vad) — 亚毫秒VAD，Apache 2.0。
- [WebRTC AEC3论文](https://webrtc.googlesource.com/src/+/main/modules/audio_processing/aec3/) — 开源回声消除。
