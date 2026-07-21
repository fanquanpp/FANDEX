---
title: ASCII艺术与视觉越狱
description: 'ArtPrompt (ACL 2024)将安全相关token替换为ASCII艺术渲染，绕过PPL、释义和重token化防御。GPT-4、Gemini、Claude、Llama-2均无法鲁棒识别ASCII艺术token。StructuralSleight推广至任意罕见文本编码结构(UTES)攻击族。'
module: 'ai-ethics'
difficulty: advanced
tags:
  - ArtPrompt
  - ASCII艺术越狱
  - UTES
  - ViTC
  - 编码攻击
  - StructuralSleight
related:
  - 'ai-ethics/指令遵循作为对齐信号'
  - 'ai-ethics/AI控制与颠覆下安全'
  - 'ai-ethics/Constitutional-AI与RLAIF'
  - 'ai-ethics/EchoLeak与AI的CVE时代'
prerequisites:
  - 'ai-ethics/谄媚作为RLHF放大器'
---

## 问题定义

通过释义和角色扮演的攻击（第12课）和通过长上下文的攻击（第13课）在文本级模式上操作。ArtPrompt在识别级别操作：模型不解析禁止的token。它解析用字符渲染的图像。安全过滤器看到无害的标点。模型看到一个词。

## 核心概念

### ArtPrompt，两步

步骤1. 词语识别。给定有害请求，攻击者使用LLM识别安全相关词语（例如"how to make a bomb"中的"bomb"）。

步骤2. 伪装提示生成。将每个识别的词语替换为其ASCII艺术渲染（形成字母形状的7x5或7x7字符块）。模型接收标点和空格网格，足够有能力的模型可以识别为该词；安全过滤器只看到网格。

结果：GPT-4、Gemini、Claude、Llama-2、GPT-3.5全部失败。基准子集上攻击成功率超过75%。

### 为什么标准防御失败

- **PPL（困惑度过滤器）。** ASCII艺术有高困惑度——但所有新颖输入也是如此。阻止ArtPrompt的阈值选择也会阻止合法结构化输入。
- **释义。** 释义提示会破坏ASCII艺术。实际上，释义LLM经常保留或重建艺术。
- **重token化。** 不同地分割token不改变模型的视觉在识别字母形状。

根本问题是安全过滤器在token或语义级别；ArtPrompt在视觉识别级别操作。

### ViTC基准

非语义视觉提示的识别。测量模型读取ASCII艺术、Wingdings和其他非文本语义视觉内容的能力。ArtPrompt的有效性与ViTC准确率相关：模型越能读取视觉文本，ArtPrompt在其上越有效。这是能力-安全权衡。

### StructuralSleight

推广ArtPrompt：罕见文本编码结构(UTES)。树、图、嵌套JSON、CSV-in-JSON、diff风格代码块。如果一种结构在训练安全数据中罕见但可被模型解析，它就可以隐藏有害内容。

防御含义：安全必须在模型能解析的结构化表示上泛化。这个集合大且在增长。

### 图像模态类比

视觉LLM（GPT-5.2、Gemini 3 Pro、Claude Opus 4.5、Grok 4.1）扩展了攻击面。使用实际图像的ArtPrompt风格攻击比ASCII艺术类比更强，因为图像编码器产生更丰富的信号。

## 关键术语

| 术语              | 常见说法            | 实际含义                                                          |
| ----------------- | ------------------- | ----------------------------------------------------------------- |
| ArtPrompt         | "ASCII艺术攻击"     | 用ASCII艺术渲染掩盖安全词语的两步越狱                             |
| Cloaking          | "隐藏词语"          | 用模型能读但过滤器不能的视觉表示替换禁止token                     |
| UTES              | "罕见结构"          | Uncommon Text-Encoded Structure——用于走私内容的树、图、嵌套JSON等 |
| ViTC              | "视觉文本能力"      | 模型读取非语义视觉编码能力的基准                                  |
| Perplexity filter | "PPL防御"           | 拒绝高困惑度提示；失败因为合法结构化输入也高分                    |
| Retokenization    | "tokenizer偏移防御" | 用不同tokenizer预处理提示；失败因为识别是视觉的                   |
| Homoglyph         | "外观相似字符"      | 看起来与拉丁字母相同的Unicode字符；绕过子串检查                   |

## 延伸阅读

- Jiang et al. — ArtPrompt (ACL 2024, arXiv:2402.11753) — ASCII艺术越狱论文
- Li et al. — StructuralSleight (arXiv:2406.08754) — UTES推广
- Chao et al. — PAIR (arXiv:2310.08419) — 互补迭代攻击
- Anil et al. — Many-shot Jailbreaking — 互补长度攻击
