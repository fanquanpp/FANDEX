---
title: 语音助手流水线
description: 构建端到端语音助手，整合VAD、ASR、LLM、TTS和中断处理
module: 'ai-engineering'
difficulty: advanced
tags:
  - 语音助手
  - VAD
  - ASR
  - TTS
  - 工具调用
  - 中断处理
related:
  - 'ai-engineering/语音克隆与转换'
  - 'ai-engineering/语音识别ASR'
  - 'ai-engineering/张量运算'
  - 'ai-engineering/正则化'
prerequisites:
  - 'ai-engineering/机器学习概述'
---

# 构建语音助手流水线 — Phase 6毕业项目

> 课程01-11的所有内容，缝合在一起。构建一个能听、能推理、能回话的语音助手。2026年这是一个已解决的工程问题，不是研究问题 — 但集成细节决定它能否上线。

**类型:** 构建
**语言:** Python
**前置条件:** Phase 6 · 04, 05, 06, 07, 11; Phase 11 · 09（函数调用）; Phase 14 · 01（代理循环）
**时间:** ~120 分钟

## 问题

构建端到端助手：

1. 捕获麦克风输入（16 kHz单声道）。
2. 检测用户语音的开始/结束。
3. 流式转录。
4. 将转录传给可调用工具的LLM（定时器、天气、日历）。
5. 将LLM文本流式传给TTS。
6. 将音频播放给用户。
7. 如果用户在回应中间打断，则停止。

延迟目标：在笔记本CPU上，用户说完话后800 ms内发出首个TTS音频字节。质量目标：无漏词、静音无幻觉字幕、无语音克隆泄漏、无提示注入成功。

## 概念

### 七个组件

1. **音频捕获。** 麦克风 → 16 kHz单声道 → 20 ms块。Python中通常用 `sounddevice`，生产中用原生AudioUnit/ALSA/WASAPI。
2. **VAD（课程11）。** Silero VAD @ 阈值0.5，最小语音250 ms，静音挂起500 ms。发出"开始"和"结束"信号。
3. **流式STT（课程4-5）。** Whisper-streaming、Parakeet-TDT或Deepgram Nova-3 (API)。部分 + 最终转录。
4. **带工具调用的LLM。** GPT-4o / Claude 3.5 / Gemini 2.5 Flash。工具的JSON schema。流式token。
5. **流式TTS（课程7）。** Kokoro-82M（最快开源）或Cartesia Sonic（商业）。20个LLM token后启动TTS。
6. **播放。** 扬声器输出；opus编码用于低带宽网络。
7. **中断处理器。** 如果TTS播放期间VAD触发，停止播放，取消LLM，重启STT。

### 你会遇到的三种失败模式

1. **首词截断。** VAD晚一拍启动。用户的"hey"丢失。起始阈值设为0.3，不是0.5。
2. **回应中间打断混乱。** 用户打断后LLM继续生成；助手覆盖用户说话。连接VAD → 取消LLM。
3. **静音幻觉。** Whisper在静音预热帧上输出"Thanks for watching"。始终VAD门控。

### 2026年生产参考技术栈

| 技术栈                                        | 延迟       | 许可      | 备注                     |
| --------------------------------------------- | ---------- | --------- | ------------------------ |
| LiveKit + Deepgram + GPT-4o + Cartesia        | 350-500 ms | 商业API   | 2026年行业默认           |
| Pipecat + Whisper-streaming + GPT-4o + Kokoro | 500-800 ms | 大多开源  | DIY友好                  |
| Moshi (全双工)                                | 200-300 ms | CC-BY 4.0 | 单模型；不同架构，课程15 |
| Vapi / Retell (托管)                          | 300-500 ms | 商业      | 最快上线；定制有限       |
| Whisper.cpp + llama.cpp + Kokoro-ONNX         | 离线       | 开源      | 隐私/边缘                |

## 构建它

### 步骤 1：带分块的麦克风捕获（伪代码）

```python
import sounddevice as sd

def mic_stream(chunk_ms=20, sr=16000):
    q = queue.Queue()
    def cb(indata, frames, time, status):
        q.put(indata.copy().flatten())
    with sd.InputStream(channels=1, samplerate=sr, blocksize=int(sr * chunk_ms/1000), callback=cb):
        while True:
            yield q.get()
```

### 步骤 2：VAD门控的轮次捕获

```python
def capture_turn(stream, vad, pre_roll_ms=300, silence_ms=500):
    buf, pre, triggered = [], collections.deque(maxlen=pre_roll_ms // 20), False
    silent = 0
    for chunk in stream:
        pre.append(chunk)
        if vad(chunk):
            if not triggered:
                buf = list(pre)
                triggered = True
            buf.append(chunk)
            silent = 0
        elif triggered:
            silent += 20
            buf.append(chunk)
            if silent >= silence_ms:
                return b"".join(buf)
```

### 步骤 3：流式STT → LLM → TTS

```python
async def turn(audio_bytes):
    transcript = await stt.transcribe(audio_bytes)
    async for token in llm.stream(transcript):
        async for audio in tts.stream(token):
            await speaker.play(audio)
```

### 步骤 4：LLM循环内的工具调用

```python
tools = [
    {"name": "get_weather", "parameters": {"location": "string"}},
    {"name": "set_timer", "parameters": {"seconds": "int"}},
]

async for chunk in llm.stream(user_text, tools=tools):
    if chunk.type == "tool_call":
        result = dispatch(chunk.name, chunk.args)
        continue_streaming(result)
    if chunk.type == "text":
        await tts.stream(chunk.text)
```

### 步骤 5：中断处理

```python
tts_task = asyncio.create_task(tts_loop())
while True:
    chunk = await mic.get()
    if vad(chunk):
        tts_task.cancel()
        await speaker.stop()
        await new_turn()
        break
```

## 使用它

参见 `code/main.py`，它用桩模块连接所有七个组件的可运行模拟，即使没有硬件也能看到流水线形状。对于真实实现，将桩替换为：

- `silero-vad`（`pip install silero-vad`）
- `deepgram-sdk` 或 `openai-whisper`
- `openai`（`gpt-4o`）或 `anthropic`
- `kokoro` 或 `cartesia`
- `sounddevice` 用于I/O

## 陷阱

- **永久记录PII。** 完整轮次音频在大多数司法管辖区是PII。30天保留期，静态加密。
- **没有打断功能。** 用户会打断。你的助手必须停止说话。
- **TTS阻塞。** 同步TTS阻塞事件循环。使用异步或单独线程。
- **没有工具调用错误处理。** 工具会失败。LLM必须收到错误 + 重试一次，然后优雅降级。
- **过度热心的幻觉过滤。** 过度过滤导致助手重复"我无法帮助"。过滤不足则什么都说。在保留集上校准。
- **没有唤醒词选项。** 始终监听是隐私责任。添加唤醒词门控（Porcupine或openWakeWord）。

## 交付它

将结果保存为 `outputs/skill-voice-assistant-architect.md`。给定预算 + 规模 + 语言 + 合规约束，产出完整技术栈规格。

## 练习

1. **简单。** 运行 `code/main.py`。它用桩模块模拟一个完整轮次端到端，并打印每阶段延迟。
2. **中等。** 将STT桩替换为预录 `.wav` 上的真实Whisper模型。测量WER和端到端延迟。
3. **困难。** 添加工具调用：实现 `get_weather`（任何API）和 `set_timer`。通过工具路由LLM，验证当用户说"set a 5 minute timer"时正确的函数触发，口头回复确认。

## 关键术语

| 术语     | 通俗说法          | 实际含义                                           |
| -------- | ----------------- | -------------------------------------------------- |
| 轮次     | 用户+助手一个来回 | 一个VAD边界的用户语音 + 一个LLM-TTS回应。          |
| 打断     | 中断              | 用户在助手说话时说话；助手停止。                   |
| 唤醒词   | "Hey助手"         | 短关键词检测器；Porcupine、Snowboy、openWakeWord。 |
| 端点检测 | 轮次结束          | VAD + 最小静音决策，判断用户已完成。               |
| 预滚动   | 语音前缓冲        | 保留VAD触发前200-400 ms音频以避免首词截断。        |
| 工具调用 | 函数调用          | LLM发出JSON；运行时分发；结果在循环中反馈。        |

## 延伸阅读

- [LiveKit — 语音代理快速入门](https://docs.livekit.io/agents/) — 生产级参考。
- [Pipecat — 语音代理示例](https://github.com/pipecat-ai/pipecat) — DIY友好框架。
- [OpenAI Realtime API](https://platform.openai.com/docs/guides/realtime) — 托管语音原生路径。
- [Kyutai Moshi](https://github.com/kyutai-labs/moshi) — 全双工参考（课程15）。
- [Porcupine唤醒词](https://picovoice.ai/products/porcupine/) — 唤醒词门控。
- [Anthropic — 工具使用指南](https://docs.anthropic.com/en/docs/build-with-claude/tool-use) — LLM函数调用。
