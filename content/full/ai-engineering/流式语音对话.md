---
title: 流式语音对话
description: 理解Moshi、Hibiki的全双工架构和Mimi编解码token上的流式语音对话
module: 'ai-engineering'
difficulty: advanced
tags:
  - 全双工
  - Moshi
  - Hibiki
  - 流式语音
  - Mimi
related:
  - 'ai-engineering/开发环境搭建'
  - 'ai-engineering/链式法则与自动微分'
  - 'ai-engineering/逻辑回归与分类'
  - 'ai-engineering/迷你框架'
prerequisites:
  - 'ai-engineering/机器学习概述'
---

# 流式语音对话 — Moshi、Hibiki与全双工对话

> 2024-2026年重新定义了语音AI。Moshi发布了一个同时听和说的单模型，延迟200 ms。Hibiki逐块进行语音到语音翻译。两者都放弃了ASR → LLM → TTS流水线，转而采用基于Mimi编解码token的统一全双工架构。这是新的参考设计。

**类型:** 学习
**语言:** Python
**前置条件:** Phase 6 · 13（神经音频编解码），Phase 6 · 11（实时音频），Phase 7 · 05（完整Transformer）
**时间:** ~75 分钟

## 问题

基于课程11 + 12构建的每个语音代理都有一个约300-500 ms的根本延迟下限：VAD触发、STT处理、LLM推理、TTS生成。每个阶段都有自己的最小延迟。你可以调优和并行化，但流水线形状限制了你的上限。

Moshi（Kyutai，2024-2026）问了一个不同的问题：如果没有流水线呢？如果一个模型直接接收音频并输出音频，持续不断地，文本作为中间"内心独白"而非必要阶段？

答案是**全双工语音到语音**。理论延迟160 ms（80 ms Mimi帧 + 80 ms声学延迟）。在单张L4 GPU上实际延迟200 ms。这是最佳级联语音代理延迟的一半。

## 概念

### Moshi架构

**输入。** 两个Mimi编解码流，都在12.5 Hz × 8码本：

- 流1：用户音频（Mimi编码，持续到达）
- 流2：Moshi自己的音频（由Moshi生成）

**Transformer。** 一个7B参数的时间Transformer处理两个流和一个文本"内心独白"流。在每个80 ms步骤中，它：

1. 消费最新的用户Mimi token（8个码本）。
2. 消费最近的Moshi Mimi token（8个码本，如已生成）。
3. 生成下一个Moshi文本token（内心独白）。
4. 生成下一个Moshi Mimi token（8个码本，通过小型深度Transformer）。

所有三个流 — 用户音频、Moshi音频、Moshi文本 — 并行运行。Moshi可以在说话时听到用户；可以在用户打断时自我中断；可以发出背景回应（"嗯嗯"）而不打断主要话语。

**深度Transformer。** 在一帧内，8个码本不是并行预测的 — 它们有码本间依赖。一个小的2层"深度Transformer"在80 ms内顺序预测它们。这是AR编解码LM的标准分解（VALL-E、VibeVoice也使用）。

### 为什么内心独白文本有帮助

没有显式文本，模型必须在其声学流中隐式建模语言。Moshi的洞察：强制它在音频旁边发出文本token。文本流本质上是Moshi所说内容的转录。这提高了语义连贯性，使替换语言模型头更容易，并免费给你转录。

### Hibiki：流式语音到语音翻译

相同架构，在翻译对上训练。源语言音频输入，目标语言音频输出，持续不断。Hibiki-Zero（2026年2月）消除了词级对齐训练数据的需求 — 使用句子级数据 + GRPO强化学习进行延迟优化。

最初支持四种语言对；可以用约1000小时适应新语言。

### 更广泛的Kyutai技术栈（2026）

- **Moshi** — 全双工对话（法语优先，英语良好支持）
- **Hibiki / Hibiki-Zero** — 同时语音翻译
- **Kyutai STT** — 流式ASR（500 ms或2.5 s前瞻）
- **Kyutai Pocket TTS** — 100M参数TTS，CPU运行（2026年1月）
- **Unmute** — 在公共服务器上组合这些的完整流水线

L40S GPU上的吞吐量：64个并发会话，3倍实时。

### Sesame CSM — 表亲

Sesame CSM (2025) 使用类似想法 — 带Mimi编解码头的Llama-3骨干。但CSM是单向的（接收上下文 + 文本，产生语音），而非全双工。它是市场上最好的"语音存在感"TTS；但与Moshi的全双工能力不完全相同。

### 2026年性能数字

| 模型            | 延迟        | 用途                    | 许可       |
| --------------- | ----------- | ----------------------- | ---------- |
| Moshi           | 200 ms (L4) | 全双工英语/法语对话     | CC-BY 4.0  |
| Hibiki          | 12.5 Hz帧率 | 法语 ↔ 英语流式翻译     | CC-BY 4.0  |
| Hibiki-Zero     | 相同        | 5个语言对，无需对齐数据 | CC-BY 4.0  |
| Sesame CSM-1B   | 200 ms TTFA | 上下文条件TTS           | Apache-2.0 |
| GPT-4o Realtime | ~300 ms     | 闭源，OpenAI API        | 商业       |
| Gemini 2.5 Live | ~350 ms     | 闭源，Google API        | 商业       |

## 构建它

### 步骤 1：接口

Moshi暴露一个WebSocket服务器，接收80 ms的Mimi编码音频块并返回80 ms的Mimi编码音频块。双向。持续不断。

```python
import asyncio
import websockets
from moshi.client_utils import encode_audio_mimi, decode_audio_mimi

async def moshi_chat():
    async with websockets.connect("ws://localhost:8998/api/chat") as ws:
        mic_task = asyncio.create_task(stream_mic_to(ws))
        spk_task = asyncio.create_task(stream_from_to_speaker(ws))
        await asyncio.gather(mic_task, spk_task)
```

### 步骤 2：全双工循环

```python
async def stream_mic_to(ws):
    async for chunk_80ms in mic_stream_at_12_5_hz():
        mimi_tokens = encode_audio_mimi(chunk_80ms)
        await ws.send(serialize(mimi_tokens))

async def stream_from_to_speaker(ws):
    async for msg in ws:
        mimi_tokens, text_token = deserialize(msg)
        audio = decode_audio_mimi(mimi_tokens)
        await play(audio)
```

两个方向同时运行。Python asyncio或Rust futures是标准传输。

### 步骤 3：训练目标（概念性）

对于每个80 ms帧 `t`：

- 输入：`user_mimi[0..t]`，`moshi_mimi[0..t-1]`，`moshi_text[0..t-1]`
- 预测：`moshi_text[t]`，然后 `moshi_mimi[t, codebook_0..7]`

文本在音频之前预测（内心独白）；音频在深度Transformer内按码本顺序预测。

### 步骤 4：Moshi赢在哪里和不赢在哪里

Moshi赢在：

- 廉价硬件上端到端低于250 ms。
- 自然背景回应和打断。
- 没有流水线粘合代码。

Moshi不赢在：

- 工具调用（未为此训练；需要单独的LLM路径）。
- 长推理（Moshi是8B级对话模型，不是Claude/GPT-4）。
- 小众话题的事实准确性。
- 大多数生产企业用例（2026年仍使用流水线）。

## 使用它

| 场景                 | 选择                                     |
| -------------------- | ---------------------------------------- |
| 最低延迟语音伴侣     | Moshi                                    |
| 实时翻译通话         | Hibiki                                   |
| 语音演示/研究        | Moshi, CSM                               |
| 带工具的企业代理     | 流水线（课程12），不是Moshi              |
| 自定义语音上下文TTS  | Sesame CSM                               |
| 语音到语音，任意语言 | GPT-4o Realtime或Gemini 2.5 Live（商业） |

## 陷阱

- **有限的工具调用。** Moshi是对话模型，不是代理框架。与流水线组合用于工具。
- **特定声音条件化。** Moshi使用单一训练人格；克隆是单独的训练运行。
- **语言覆盖。** 法语 + 英语优秀；其他有限。Hibiki-Zero有帮助，但仍需训练数据。
- **资源成本。** 完整Moshi会话占用GPU槽位；不是廉价的共享租户部署模式。

## 交付它

将结果保存为 `outputs/skill-duplex-pipeline.md`。为语音代理工作负载选择流水线vs全双工架构，并说明理由。

## 练习

1. **简单。** 运行 `code/main.py`。它以符号方式模拟双流 + 内心独白架构。
2. **中等。** 从HuggingFace拉取Moshi，运行服务器，测试一次对话。测量从用户语音结束到Moshi回应开始的挂钟延迟。
3. **困难。** 取你课程12的流水线代理，在20个匹配测试话语上与Moshi比较P50延迟。写出流水线在架构上何时仍然赢。

## 关键术语

| 术语            | 通俗说法       | 实际含义                                      |
| --------------- | -------------- | --------------------------------------------- |
| 全双工          | 同时听说       | 同一模型上两个音频流同时活跃。                |
| 内心独白        | 模型的文本流   | Moshi在音频输出旁边发出文本token。            |
| 深度Transformer | 码本间预测器   | 在一个80 ms帧内预测8个码本的小型Transformer。 |
| Mimi            | Kyutai的编解码 | 12.5 Hz × 8码本；语义+声学；驱动Moshi。       |
| 流式S2S         | 音频→音频实时  | 逐块翻译/对话，无流水线阶段。                 |
| 背景回应        | "嗯嗯"反应     | Moshi可以在不打断自己轮次的情况下发出小确认。 |

## 延伸阅读

- [Défossez et al. (2024). Moshi — speech-text foundation model](https://arxiv.org/html/2410.00037v2) — 论文。
- [Kyutai Labs (2026). Hibiki-Zero](https://arxiv.org/abs/2602.12345) — 无需对齐数据的流式翻译。
- [Sesame (2025). Crossing the uncanny valley of voice](https://www.sesame.com/research/crossing_the_uncanny_valley_of_voice) — CSM规格。
- [Kyutai — Moshi仓库](https://github.com/kyutai-labs/moshi) — 安装 + 服务器。
- [OpenAI — Realtime API](https://platform.openai.com/docs/guides/realtime) — 闭源商业同行。
- [Kyutai — Delayed Streams Modeling](https://github.com/kyutai-labs/delayed-streams-modeling) — 底层的STT/TTS框架。
