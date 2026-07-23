---
title: 机器翻译
description: 理解BLEU评分、束搜索和现代神经机器翻译的完整技术栈
module: nlp
difficulty: intermediate
tags:
  - 机器翻译
  - BLEU
  - 束搜索
  - NLLB
  - 翻译
related:
  - nlp/共指消解
  - nlp/关系抽取与知识图谱
  - nlp/结构化输出与约束解码
  - nlp/聊天机器人
prerequisites:
  - 'nlp/词袋模型与TF-IDF'
---

# 机器翻译

> BLEU衡量n-gram重叠。束搜索找到更好的序列。NLLB翻译200种语言。机器翻译是序列到序列完成学业的地方。

**类型:** 构建
**语言:** Python
**前置条件:** Phase 5 · 09（Seq2Seq），Phase 5 · 10（注意力机制）
**时间:** ~75 分钟

## 问题

"Le chat noir est sur le tapis." → "The black cat is on the mat." 源和目标语言有不同的词表、不同的词序和不同的语法结构。模型必须学习所有三种映射。

机器翻译是推动序列到序列、注意力、Transformer和大规模多语言建模发展的任务。本课程覆盖评估（BLEU）、解码（束搜索）和生产系统（NLLB、SeamlessM4T）。

## 概念

**BLEU（双语评估替补）。** 衡量机器翻译与一个或多个参考翻译的n-gram重叠。精度导向：模型翻译中有多少n-gram出现在参考中？简短惩罚防止模型通过输出极短翻译来博弈精度。

```
BLEU = BP * exp(sum_{n=1}^{N} w_n * log(p_n))
```

其中 `p_n` 是修改后的n-gram精度，`w_n` 通常是均匀权重（1/N），`BP = min(1, exp(1 - ref_len/hyp_len))`。

BLEU是句子级噪声指标。它对同义词、释义和不同但有效的表达方式惩罚严重。对语料级比较有用（更高的BLEU = 更好的系统），对单个句子不可靠。

**束搜索。** 贪心解码每步选择最高概率token。束搜索保持前k个部分假设存活。每步，扩展每个假设，保留总分最高的k个。束宽5是标准；10用于高质量输出。

**现代NMT架构。** 2017年后所有生产翻译系统都是基于Transformer的编码器-解码器。关键系统：

- **MarianNMT。** 快速、轻量、多语言。适合自定义训练。
- **NLLB-200 (Meta, 2022)。** 200种语言之间翻译。3.3B参数。No Language Left Behind。
- **SeamlessM4T v2 (Meta, 2024)。** 统一语音+文本翻译。支持语音到语音、语音到文本、文本到语音、文本到文本。
- **Google Translate。** 生产系统，闭源。基于Transformer，大规模多语言。

## 构建它

### 步骤 1：BLEU评分

```python
import math
from collections import Counter


def ngram_counts(tokens, n):
    return Counter(tuple(tokens[i:i + n]) for i in range(len(tokens) - n + 1))


def modified_precision(hypothesis, references, n):
    hyp_counts = ngram_counts(hypothesis, n)
    max_ref_counts = {}
    for ref in references:
        ref_counts = ngram_counts(ref, n)
        for ngram, count in ref_counts.items():
            max_ref_counts[ngram] = max(max_ref_counts.get(ngram, 0), count)
    clipped = sum(min(count, max_ref_counts.get(ngram, 0)) for ngram, count in hyp_counts.items())
    total = sum(hyp_counts.values())
    return clipped / total if total > 0 else 0


def bleu(hypothesis, references, max_n=4, weights=None):
    if weights is None:
        weights = [1.0 / max_n] * max_n
    hyp_len = len(hypothesis)
    ref_len = min(len(ref) for ref in references)
    bp = min(1.0, math.exp(1 - ref_len / hyp_len)) if hyp_len > 0 else 0
    log_avg = 0.0
    for n, w in enumerate(weights, 1):
        p = modified_precision(hypothesis, references, n)
        if p == 0:
            return 0.0
        log_avg += w * math.log(p)
    return bp * math.exp(log_avg)
```

### 步骤 2：束搜索

```python
def beam_search_decode(model, encoder_output, bos_id, eos_id, beam_width=5, max_len=50, length_penalty=0.6):
    sequences = [([], 0.0, encoder_output)]
    for _ in range(max_len):
        all_candidates = []
        for seq, score, hidden in sequences:
            if seq and seq[-1] == eos_id:
                all_candidates.append((seq, score, hidden))
                continue
            input_token = torch.tensor([[seq[-1] if seq else bos_id]])
            logits, new_hidden = model.decoder(input_token, hidden)
            log_probs = torch.log_softmax(logits.squeeze(), dim=-1)
            topk_probs, topk_ids = log_probs.topk(beam_width)
            for i in range(beam_width):
                new_seq = seq + [topk_ids[i].item()]
                new_score = score + topk_probs[i].item()
                all_candidates.append((new_seq, new_score, new_hidden))
        length_norm = lambda s, l: s / ((5 + l) / 6) ** length_penalty
        all_candidates.sort(key=lambda x: length_norm(x[1], len(x[0])), reverse=True)
        sequences = all_candidates[:beam_width]
        if all(s[-1] == eos_id for s, _, _ in sequences if s):
            break
    best = max(sequences, key=lambda x: length_norm(x[1], len(x[0])))
    return best[0]
```

长度惩罚防止束搜索偏向极短假设。Wu等（2016）的公式：`(5 + len) / 6` 的 `alpha` 次方。

### 步骤 3：使用Hugging Face翻译

```python
from transformers import pipeline

translator = pipeline("translation", model="facebook/nllb-200-distilled-600M")
result = translator("Le chat noir est sur le tapis.", src_lang="fra_Latn", tgt_lang="eng_Latn")
print(result[0]["translation_text"])
```

NLLB使用与标准ISO代码不同的语言代码。`fra_Latn` 是法语，`eng_Latn` 是英语。检查NLLB文档获取完整列表。

## 使用它

| 场景              | 选择                            |
| ----------------- | ------------------------------- |
| 200种语言之间翻译 | NLLB-200-distilled-600M         |
| 语音到语音翻译    | SeamlessM4T v2                  |
| 自定义领域翻译    | MarianNMT，在你的平行语料上微调 |
| 高质量英语-XX     | Google Translate API或DeepL     |
| 低资源语言        | NLLB-200，可能用额外数据微调    |

## 交付它

将结果保存为 `outputs/prompt-translator-picker.md`。

## 练习

1. **简单。** 在5对人工翻译上计算BLEU。验证完全匹配得分1.0，部分重叠得分在0.3-0.8。
2. **中等。** 在小型平行语料上训练MarianNMT模型。测量BLEU。与NLLB-200比较。记录领域匹配是否重要。
3. **困难。** 实现带长度惩罚的束搜索。在预训练翻译模型上与贪心解码比较BLEU。测量延迟差异。

## 关键术语

| 术语      | 通俗说法   | 实际含义                                 |
| --------- | ---------- | ---------------------------------------- |
| BLEU      | 翻译分数   | 修改后的n-gram精度与简短惩罚的几何平均。 |
| 束搜索    | 更好的解码 | 每步保持前k个假设存活。                  |
| 简短惩罚  | 防止短输出 | 惩罚比参考短的假设。                     |
| NLLB      | 200种语言  | Meta的No Language Left Behind模型。      |
| MarianNMT | 可训练翻译 | 快速、可微调的NMT框架。                  |

## 延伸阅读

- [Papineni et al. (2002). BLEU: a Method for Automatic Evaluation of Machine Translation](https://aclanthology.org/P02-1040/) — BLEU论文。
- [Wu et al. (2016). Google's Neural Machine Translation System](https://arxiv.org/abs/1609.08144) — 束搜索长度惩罚。
- [NLLB Team (2022). No Language Left Behind](https://arxiv.org/abs/2207.04672) — 200种语言翻译。
- [SeamlessM4T v2 (2024)](https://arxiv.org/abs/2407.08581) — 统一语音+文本翻译。
