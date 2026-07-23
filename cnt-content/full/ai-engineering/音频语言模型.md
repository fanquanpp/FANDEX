---
title: 音频语言模型
description: '理解Qwen2.5-Omni、Audio Flamingo等音频语言模型的架构与评估'
module: 'ai-engineering'
difficulty: advanced
tags:
  - 音频语言模型
  - LALM
  - 'Qwen2.5-Omni'
  - MMAU
related:
  - 'ai-engineering/音频基础'
  - 'ai-engineering/音频评估指标'
  - 'ai-engineering/影子流量与金丝雀发布'
  - 'ai-engineering/优化方法'
prerequisites:
  - 'ai-engineering/机器学习概述'
---

# 音频语言模型 — Qwen2.5-Omni、Audio Flamingo、GPT-4o Audio

> 2026年音频语言模型对语音 + 环境声音 + 音乐进行推理。Qwen2.5-Omni-7B在MMAU-Pro上匹配GPT-4o Audio。Audio Flamingo Next在LongAudioBench上击败Gemini 2.5 Pro。开源与闭源之间的差距基本已关闭 — 除了多音频任务，所有模型都接近随机。

**类型:** 学习
**语言:** Python
**前置条件:** Phase 6 · 04（ASR），Phase 12 · 03（视觉语言模型），Phase 7 · 10（音频Transformer）
**时间:** ~45 分钟

## 问题

你有5秒音频：狗叫，有人喊"stop!"，然后静音。有用的问题跨越多个维度：

- **转录。** "说了什么？" — ASR领域。
- **语义推理。** "这个人有危险吗？" — 需要联合理解狗叫 + 喊叫 + 静音。
- **音乐推理。** "什么乐器演奏旋律？"
- **长音频检索。** "在这个90分钟讲座中，讲师在哪里解释了梯度下降？"

用一个提示回答所有这些问题的单一模型就是**音频语言模型**（LALM / ALM）。与纯ASR不同：LALM产生自由形式的自然语言答案，而不仅仅是转录。

## 概念

### 三组件模板

每个2026年LALM都有相同的骨架：

1. **音频编码器。** Whisper编码器 · BEATs · CLAP · WavLM · 或每个模型的自定义编码器。
2. **投影器。** 线性或MLP，将音频编码器特征桥接到LLM的token嵌入空间。
3. **LLM。** 基于Llama / Qwen / Gemma的解码器。接收交错文本 + 音频token；生成文本。

训练：

- **阶段1。** 冻结编码器 + LLM；仅在ASR/标注数据上训练投影器。
- **阶段2。** 在指令跟随音频任务（QA、推理、音乐理解）上进行全量/LoRA微调。
- **阶段3（可选）。** 语音输入/语音输出添加语音解码器。Qwen2.5-Omni和AF3-Chat这样做。

### 2026年模型地图

| 模型                        | 骨干       | 音频编码器       | 输出模态    | 访问         |
| --------------------------- | ---------- | ---------------- | ----------- | ------------ |
| Qwen2.5-Omni-7B             | Qwen2.5-7B | 自定义 + Whisper | 文本 + 语音 | Apache-2.0   |
| Qwen3-Omni                  | Qwen3      | 自定义           | 文本 + 语音 | Apache-2.0   |
| Audio Flamingo 3            | Qwen2      | AF-CLAP          | 文本        | NVIDIA非商业 |
| Audio Flamingo Next         | Qwen2      | AF-CLAP v2       | 文本        | NVIDIA非商业 |
| SALMONN                     | Vicuna     | Whisper + BEATs  | 文本        | Apache-2.0   |
| LTU / LTU-AS                | Llama      | CAV-MAE          | 文本        | Apache-2.0   |
| GAMA                        | Llama      | AST + Q-Former   | 文本        | Apache-2.0   |
| Gemini 2.5 Flash/Pro (闭源) | Gemini     | 专有             | 文本 + 语音 | API          |
| GPT-4o Audio (闭源)         | GPT-4o     | 专有             | 文本 + 语音 | API          |

### 基准现实检查（2026）

**MMAU-Pro。** 1800个QA对，覆盖语音/声音/音乐/混合。包含多音频子集。

| 模型                | 总体                | 语音  | 声音  | 音乐  | 多音频 |
| ------------------- | ------------------- | ----- | ----- | ----- | ------ |
| Gemini 2.5 Pro      | ~60%                | 73.4% | 51.9% | 64.9% | ~22%   |
| Gemini 2.5 Flash    | ~57%                | 73.4% | 50.5% | 64.9% | 21.2%  |
| GPT-4o Audio        | 52.5%               | —     | —     | —     | 26.5%  |
| Qwen2.5-Omni-7B     | 52.2%               | 57.4% | 47.6% | 61.5% | ~20%   |
| Audio Flamingo 3    | ~54%                | —     | —     | —     | —      |
| Audio Flamingo Next | LongAudioBench SOTA | —     | —     | —     | —      |

**多音频列对所有人都是致命的。** 4选项多选的随机概率 = 25%；大多数模型得分就在附近。LALM仍然难以比较两个片段。

### 2026年LALM有用的地方

- **呼叫中心录音合规审计。** "客服是否提到了必要的披露？"
- **无障碍。** 向听障用户描述声音事件（不仅仅是转录）。
- **内容审核。** 检测暴力语言 + 威胁语气 + 背景上下文。
- **播客/会议章节化。** 语义摘要，不仅仅是说话人轮次。
- **音乐目录分析。** "找到所有B段转调的曲目。"

### 它们还不太行的地方

- 细粒度音乐理论（和弦级别以下）。
- 长对话中的说话人归因推理（超过10分钟退化）。
- 多音频比较（22-26%几乎等于随机）。
- 实时流式推理（大多数是离线批量推理）。

## 构建它

### 步骤 1：查询Qwen2.5-Omni

```python
from transformers import AutoModelForCausalLM, AutoProcessor

processor = AutoProcessor.from_pretrained("Qwen/Qwen2.5-Omni-7B")
model = AutoModelForCausalLM.from_pretrained("Qwen/Qwen2.5-Omni-7B", torch_dtype="auto")

audio, sr = load_wav("clip.wav", sr=16000)
messages = [{
    "role": "user",
    "content": [
        {"type": "audio", "audio": audio},
        {"type": "text", "text": "What sounds do you hear, and what's happening?"},
    ],
}]
inputs = processor.apply_chat_template(messages, tokenize=True, return_tensors="pt")
output = model.generate(**inputs, max_new_tokens=200)
print(processor.decode(output[0], skip_special_tokens=True))
```

### 步骤 2：投影器模式

```python
import torch.nn as nn

class AudioProjector(nn.Module):
    def __init__(self, audio_dim=1280, llm_dim=4096):
        super().__init__()
        self.down = nn.Linear(audio_dim, llm_dim)
        self.act = nn.GELU()
        self.up = nn.Linear(llm_dim, llm_dim)

    def forward(self, audio_features):
        return self.up(self.act(self.down(audio_features)))
```

就是这样。投影器通常是1-3个线性层。在ASR对（音频 → 转录）上训练它是阶段1的预文本任务。

### 步骤 3：MMAU / LongAudioBench基准测试

```python
from datasets import load_dataset
mmau = load_dataset("MMAU/MMAU-Pro")

correct = 0
for item in mmau["test"]:
    answer = call_model(item["audio"], item["question"], item["choices"])
    if answer == item["correct_choice"]:
        correct += 1
print(f"Accuracy: {correct / len(mmau['test']):.3f}")
```

分别报告每个类别（语音/声音/音乐/多音频）。汇总数字会隐藏模型失败的地方。

## 使用它

| 任务                   | 2026年选择                                  |
| ---------------------- | ------------------------------------------- |
| 自由形式音频QA（开源） | Qwen2.5-Omni-7B                             |
| 最佳开源长音频         | Audio Flamingo Next                         |
| 最佳闭源               | Gemini 2.5 Pro                              |
| 语音输入/语音输出代理  | Qwen2.5-Omni或GPT-4o Audio                  |
| 音乐推理               | Audio Flamingo 3或2（音乐专用AF-CLAP）      |
| 呼叫中心审计           | Gemini 2.5 Pro via API，配合你的策略文档RAG |

## 陷阱

- **过度信任多音频。** 如果你的任务需要"哪个片段有X"，随机概率水平的性能是真实的。
- **长音频退化。** 超过10分钟，大多数模型的说话人归因会崩溃。先分离（课程6），再摘要。
- **静音上的幻觉。** 使用Whisper编码器的LALM继承了相同的Whisper风格问题。VAD门控。
- **基准挑樱桃。** 供应商博客文章突出最佳类别。自己运行MMAU-Pro多音频子集。

## 交付它

将结果保存为 `outputs/skill-alm-picker.md`。为给定音频理解任务选择LALM + 基准子集 + 输出模态（文本vs语音）。

## 练习

1. **简单。** 运行 `code/main.py`，查看玩具投影器模式 + 假LALM路由（音频嵌入、文本token）→ 输出token。
2. **中等。** 在100个MMAU-Pro语音项上评分Qwen2.5-Omni-7B。与论文报告数字比较。
3. **困难。** 构建最小音频标注基线：BEATs编码器 + 2层投影器 + 冻结Llama-3.2-1B。仅在AudioCaps上微调投影器。在Clotho-AQA上与SALMONN比较。

## 关键术语

| 术语              | 通俗说法    | 实际含义                               |
| ----------------- | ----------- | -------------------------------------- |
| LALM              | 音频ChatGPT | 音频编码器 + 投影器 + LLM解码器。      |
| 投影器            | 适配器      | 将音频特征映射到LLM嵌入空间的小型MLP。 |
| MMAU              | 基准        | 跨语音、声音、音乐的10k音频QA对。      |
| MMAU-Pro          | 更难的MMAU  | 1800个多音频/推理密集问题。            |
| LongAudioBench    | 长音频评估  | 多分钟片段配语义查询。                 |
| 语音输入/语音输出 | 语音原生    | 模型摄入语音并发出语音，无需文本中转。 |

## 延伸阅读

- [Chu et al. (2024). Qwen2-Audio](https://arxiv.org/abs/2407.10759) — 参考架构。
- [Alibaba (2025). Qwen2.5-Omni](https://huggingface.co/Qwen/Qwen2.5-Omni-7B) — 语音入-语音出。
- [NVIDIA (2025). Audio Flamingo 3](https://arxiv.org/abs/2507.08128) — 开源长音频领先者。
- [NVIDIA (2026). Audio Flamingo Next](https://arxiv.org/abs/2604.10905) — LongAudioBench SOTA。
- [Tang et al. (2023). SALMONN](https://arxiv.org/abs/2310.13289) — 双编码器先驱。
- [MMAU-Pro排行榜](https://mmaubenchmark.github.io/) — 2026年实时排名。
