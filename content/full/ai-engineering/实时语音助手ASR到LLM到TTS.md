---
title: 实时语音助手ASR到LLM到TTS
description: 感觉正确的语音代理端到端延迟低于800ms，知道你何时停止说话，处理打断，可以在不卡顿的情况下调用工具。流式ASR、转向检测器、流式LLM和流式TTS通过WebRTC连接。构建一个，测量WER、MOS和误切率，在丢包下运行。
module: 'ai-engineering'
difficulty: advanced
tags:
  - 语音代理
  - ASR
  - TTS
  - WebRTC
  - 流式管线
  - 延迟优化
related:
  - 'ai-engineering/时间序列'
  - 'ai-engineering/实时音频处理'
  - 'ai-engineering/视频理解管线场景与QA与搜索'
  - 'ai-engineering/数据管理'
prerequisites:
  - 'ai-engineering/机器学习概述'
---

## 问题

语音是2025-2026年增长最快的AI UX类别。OpenAI Realtime API、Gemini 2.5 Live、Cartesia Sonic-2、ElevenLabs Flash v3、LiveKit Agents 1.0和Pipecat 0.0.70都使sub-800ms首次音频输出成为可能。标准不仅是延迟，还有交互感：不切断用户、不被切断、从句子中间打断中恢复、在对话中调用工具而不卡顿音频、在抖动的移动网络下存活。

你无法通过拼接三个REST调用达到目标。架构是端到端管线流式。构建它，失败模式变得可见：为电话音频调优的VAD在背景电视上误触发、等待永远不会来的标点的转向检测器、在发出前缓冲400ms的TTS。

## 核心架构

### 管线

1. **流式ASR。** Whisper-v3-turbo或DeepStream，实时转录。
2. **VAD + 转向检测。** 检测用户何时完成说话。误切（过早截断）和漏切（等待太久）都是失败模式。
3. **流式LLM。** 模型在token到达时开始生成，不等完整输入。
4. **流式TTS。** 第一个token到达时开始合成音频，不等完整响应。
5. **WebRTC传输。** 低延迟音频传输，带抖动缓冲和丢包隐藏。

### 打断处理

用户可以在代理说话时打断。架构必须：停止当前TTS、丢弃待处理的LLM token、开始处理新输入。这是最难的部分。

### 工具调用

代理在对话中调用工具（查询数据库、设置定时器）。工具调用不能阻塞音频管线。架构：工具调用在后台执行，音频继续用填充或音乐。

## 评估

WER（词错误率）、MOS（平均意见分）、误切率、端到端延迟（从用户停止说话到代理开始回复的时间）、丢包下的鲁棒性。

## 关键术语

| 术语            | 常见说法       | 实际含义                           |
| --------------- | -------------- | ---------------------------------- |
| First-audio-out | "首次音频输出" | 从用户停止说话到代理开始回复的延迟 |
| VAD             | "语音活动检测" | 检测用户何时在说话                 |
| Turn detector   | "转向检测器"   | 判断用户是否完成说话               |
| Barge-in        | "打断"         | 用户在代理说话时插话               |
| Jitter buffer   | "抖动缓冲"     | 吸收网络延迟变化的缓冲区           |

## 延伸阅读

- OpenAI Realtime API — 实时语音API
- LiveKit Agents 1.0 — 开源语音代理框架
- Pipecat — Python语音代理框架
- Cartesia Sonic-2 — 低延迟TTS
