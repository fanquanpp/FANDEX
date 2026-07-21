---
title: 多语言NLP
description: 理解多语言模型、跨语言迁移和多语言评估的完整技术栈
module: nlp
difficulty: intermediate
tags:
  - 多语言NLP
  - 跨语言迁移
  - 'XLM-R'
  - NLLB
  - mBERT
related:
  - nlp/词性标注与句法解析
  - nlp/对话状态跟踪
  - nlp/分块策略与RAG
  - nlp/共指消解
prerequisites:
  - 'nlp/词袋模型与TF-IDF'
---

# 多语言NLP

> 英语NLP在2019年解决了。其他5,999种语言没有。多语言模型桥接差距，但每个桥都有结构性的权衡。

**类型:** 学习
**语言:** Python
**前置条件:** Phase 5 · 03（Word2Vec），Phase 5 · 11（机器翻译）
**时间:** ~60 分钟

## 问题

你在英语上训练了一个NER模型。用户发送阿拉伯语文本。你的模型返回垃圾。你有两个选择：在标注的阿拉伯语数据上训练（你没有），或使用在两种语言上训练的模型，使阿拉伯语表示与英语表示对齐。

多语言NLP解决三个问题：

1. **零样本跨语言迁移。** 在英语标注数据上训练，在阿拉伯语上推理。
2. **多语言同时服务。** 一个模型处理100种语言。
3. **翻译/跨语言检索。** 找到与英语查询相关的中文文档。

## 概念

**mBERT（多语言BERT）。** Google在104种语言的Wikipedia上训练了BERT。无显式跨语言对齐目标。共享词表和共享Transformer层隐式对齐表示。效果出奇地好，但跨语言迁移质量与语言相似性和语料大小相关。

**XLM-R（XLM-RoBERTa）。** Meta在100种语言的2.5TB CommonCrawl数据上训练。比mBERT更大的词表（250k vs 30k token）和更多数据。跨语言迁移的2026年默认骨干。

**NLLB-200。** Meta的No Language Left Behind翻译模型。200种语言。显式训练跨语言表示。

**跨语言迁移的诅咒。** 更多语言 = 每种语言的容量更少。XLM-R在100种语言上训练在英语NER上比纯英语BERT略差。容量权衡是结构性的：你用单语言性能换多语言覆盖。

## 构建它

### 步骤 1：使用XLM-R进行零样本NER

```python
from transformers import AutoTokenizer, AutoModelForTokenClassification, pipeline

tokenizer = AutoTokenizer.from_pretrained("xlm-roberta-large-finetuned-conll03-english")
model = AutoModelForTokenClassification.from_pretrained("xlm-roberta-large-finetuned-conll03-english")

ner = pipeline("ner", model=model, tokenizer=tokenizer, aggregation_strategy="simple")

arabic_text = "زار باراك أوباما القاهرة في عام 2009"
print(ner(arabic_text))
```

模型在英语CoNLL-2003上训练。在阿拉伯语上推理。零样本跨语言迁移通过共享的子词表示和Transformer层实现。

### 步骤 2：多语言嵌入

```python
from sentence_transformers import SentenceTransformer

model = SentenceTransformer("sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")

embeddings = model.encode([
    "The cat is on the mat",
    "Le chat est sur le tapis",
    "القطة على السجادة",
])

from sklearn.metrics.pairwise import cosine_similarity
print(cosine_similarity(embeddings))
```

跨语言嵌入将语义相似的句子映射到附近向量，无论语言。这对跨语言检索至关重要。

### 步骤 3：评估

跨语言评估需要多语言基准。关键数据集：

- **XNLI。** 14种语言的NLI。跨语言推理的标准基准。
- **MasakhaNER。** 10种非洲语言的NER。
- **XTREME / XTREME-R。** 跨40种语言的多任务基准。

## 使用它

| 场景             | 选择                     |
| ---------------- | ------------------------ |
| 零样本跨语言分类 | XLM-R + 英语标注数据     |
| 跨语言检索       | 多语言Sentence-BERT      |
| 200种语言翻译    | NLLB-200                 |
| 特定语言高质量   | 在该语言数据上微调       |
| 低资源语言       | XLM-R + 少量目标语言数据 |

## 交付它

将结果保存为 `outputs/skill-multilingual-picker.md`。

## 练习

1. **简单。** 在英语上训练情感分类器。在3种其他语言的翻译测试集上评估。测量准确率下降。
2. **中等。** 比较mBERT和XLM-R在XNLI子集上的零样本跨语言迁移。报告每种语言的准确率。
3. **困难。** 在目标语言中10个标注样本上微调XLM-R。与零样本和100样本比较。绘制学习曲线。

## 关键术语

| 术语       | 通俗说法          | 实际含义                                             |
| ---------- | ----------------- | ---------------------------------------------------- |
| 零样本迁移 | 免费跨语言        | 在语言A上训练，在语言B上推理，无B的训练数据。        |
| XLM-R      | 多语言默认        | 在100种语言上训练的RoBERTa。跨语言迁移的2026年骨干。 |
| 容量诅咒   | 更多语言=每种更差 | 固定模型大小在更多语言上训练降低每种语言的性能。     |
| 跨语言嵌入 | 共享向量空间      | 不同语言的语义相似句子映射到附近向量。               |

## 延伸阅读

- [Conneau et al. (2020). Unsupervised Cross-lingual Representation Learning at Scale](https://arxiv.org/abs/1911.02116) — XLM-R。
- [NLLB Team (2022). No Language Left Behind](https://arxiv.org/abs/2207.04672) — 200种语言翻译。
- [XTREME-R基准](https://arxiv.org/abs/2004.10964) — 跨语言评估。
