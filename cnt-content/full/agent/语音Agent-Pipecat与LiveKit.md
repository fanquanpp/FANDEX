---
title: '语音Agent-Pipecat与LiveKit'
description: '语音Agent是2026年的一等生产类别。Pipecat给你一个Python基于帧的管道（VAD → STT → LLM → TTS → 传输）。LiveKit Agents通过WebRTC将AI模型桥接到用户。高级栈的生产延迟目标落在450-600ms端到端。'
module: agent
related:
  - agent/验证门
  - agent/有界自改进设计
  - agent/运行时反馈循环
  - agent/长时间范围Agent
prerequisites:
  - agent/概述与架构
---

# 语音Agent：Pipecat与LiveKit

> 语音Agent是2026年的一等生产类别。Pipecat给你一个Python基于帧的管道（VAD → STT → LLM → TTS → 传输）。LiveKit Agents通过WebRTC将AI模型桥接到用户。高级栈的生产延迟目标落在450-600ms端到端。

**类型：** 学习
**语言：** Python (stdlib)
**前置条件：** Phase 14 · 01 (Agent循环), Phase 14 · 12 (工作流模式)
**时间：** ~60分钟

## 学习目标

- 描述Pipecat的基于帧的管道：DOWNSTREAM（源→汇）和UPSTREAM（控制）。
- 说出规范语音管道阶段以及Pipecat支持的传输。
- 解释LiveKit Agents的两个语音Agent类（MultimodalAgent、VoicePipelineAgent）以及各自适合的场景。
- 总结2026年生产延迟期望以及它们如何驱动架构选择。

## 问题所在

语音Agent不是加上TTS的文本循环。延迟预算很严（约600ms），部分音频是默认的，轮次检测是一个模型，传输范围从电话SIP到WebRTC。你要么构建基于帧的管道（Pipecat），要么依赖平台（LiveKit）。

## 核心概念

### Pipecat (pipecat-ai/pipecat)

- Python基于帧的管道框架。
- `Frame` → `FrameProcessor`链。
- 两个流方向：
  - **DOWNSTREAM** — 源 → 汇（音频输入，TTS输出）。
  - **UPSTREAM** — 反馈和控制（取消、指标、打断）。
- `PipelineTask`管理带事件（`on_pipeline_started`、`on_pipeline_finished`、`on_idle_timeout`）和观察器（用于指标/追踪/RTVI）的生命周期。

典型管道：

```
VAD (Silero) → STT → LLM (context alternates user/assistant) → TTS → transport
```

传输：Daily、LiveKit、SmallWebRTCTransport、FastAPI WebSocket、WhatsApp。

Pipecat Flows添加结构化对话（状态机）。Pipecat Cloud是托管运行时。

### LiveKit Agents (livekit/agents)

- 通过WebRTC将AI模型桥接到用户。
- 关键概念：`Agent`、`AgentSession`、`entrypoint`、`AgentServer`。
- 两个语音Agent类：
  - **MultimodalAgent** — 通过OpenAI Realtime或等效的直接音频。
  - **VoicePipelineAgent** — STT → LLM → TTS级联；提供文本级控制。
- 通过transformer模型的语义轮次检测。
- 原生MCP集成。
- 通过SIP的电话。
- 通过LiveKit Inference的50+模型无需API密钥；通过插件的200+更多模型。

### 商业平台

Vapi（优化高级栈上约450-600ms）和Retell（180次测试呼叫端到端约600ms）构建在这些之上。当你想要托管语音栈而不需要WebRTC团队时选择平台。

### 这个模式哪里会出错

- **无打断处理。** 用户打断；Agent继续说话。需要Pipecat中的UPSTREAM取消帧，LiveKit中的等效机制。
- **忽略STT置信度。** 低置信度转录作为真理喂给LLM。基于置信度门控或请求确认。
- **TTS句中截断。** 当管道在话语中途取消时，TTS需要知道或截断音频。
- **忽略延迟预算。** 每个组件增加50-200ms。在发布前求和你的链。

### 典型2026年延迟

- VAD：20-60ms
- STT部分：100-250ms
- LLM首个token：150-400ms
- TTS首个音频：100-200ms
- 传输RTT：30-80ms

端到端450-600ms是高级。800-1200ms是常见的。任何>1500ms感觉坏了。

## 构建它

`code/main.py`是一个基于帧的玩具管道：

- `Frame`类型（audio、transcript、text、tts_audio、control）。
- 带有`process(frame)`的`Processor`接口。
- 五阶段管道（VAD → STT → LLM → TTS → 传输）作为脚本处理器。
- 一个UPSTREAM取消帧演示打断。

运行：

```
python3 code/main.py
```

跟踪显示正常流程和打断取消在话语中途停止TTS。

## 使用它

- **Pipecat**用于完全控制 — 自定义处理器，Python优先，可插拔提供商。
- **LiveKit Agents**用于WebRTC优先部署和电话。
- **Vapi / Retell**用于托管语音Agent而无需WebRTC团队。
- **OpenAI Realtime / Gemini Live**用于直接音频输入/输出（MultimodalAgent）。

## 发布它

`outputs/skill-voice-pipeline.md`脚手架一个Pipecat形状的语音管道，带VAD + STT + LLM + TTS + 传输加打断处理。

## 练习

1. 给你的玩具管道添加指标观察器：计算每阶段每秒帧数。延迟在哪里积累？
2. 实现置信度门控STT：低于阈值，请求"你能再说一遍吗？"
3. 添加语义轮次检测：简单规则 — 如果转录以"?"结尾，轮次结束。
4. 阅读Pipecat的传输文档。将stdlib传输替换为SmallWebRTCTransport配置（桩）。
5. 测量OpenAI Realtime vs STT+LLM+TTS级联在相同查询上的延迟。文本级控制携带什么延迟成本？

## 关键术语

| 术语               | 人们常说的      | 实际含义                                                   |
| ------------------ | --------------- | ---------------------------------------------------------- |
| Frame              | "事件"          | 管道中的类型化数据单元（audio、transcript、text、control） |
| Processor          | "管道阶段"      | 带有process(frame)的处理器                                 |
| DOWNSTREAM         | "前向流"        | 源到汇：音频输入，语音输出                                 |
| UPSTREAM           | "反馈流"        | 控制：取消、指标、打断                                     |
| VAD                | "语音活动检测"  | 检测用户何时在说话                                         |
| 语义轮次检测       | "智能轮次结束"  | 基于模型的用户完成决策                                     |
| MultimodalAgent    | "直接音频Agent" | 音频输入，音频输出；中间无文本                             |
| VoicePipelineAgent | "级联Agent"     | STT + LLM + TTS；文本级控制                                |

## 延伸阅读

- [Pipecat文档](https://docs.pipecat.ai/getting-started/introduction) — 基于帧的管道、处理器、传输
- [LiveKit Agents文档](https://docs.livekit.io/agents/) — WebRTC + 语音原语
- [Vapi](https://vapi.ai/) — 托管语音平台
- [Retell AI](https://www.retellai.com/) — 托管语音，延迟基准测试
