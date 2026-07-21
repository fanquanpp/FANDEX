---
title: 共指消解
description: 理解共指消解如何将代词链接到实体，为下游NLP任务提供完整上下文
module: nlp
difficulty: intermediate
tags:
  - 共指消解
  - 指代消解
  - SpanBERT
  - 实体聚类
related:
  - nlp/多语言NLP
  - nlp/分块策略与RAG
  - nlp/关系抽取与知识图谱
  - nlp/机器翻译
prerequisites:
  - 'nlp/词袋模型与TF-IDF'
---

# 共指消解

> "她签署了协议。" 谁？共指消解回答这个问题。没有它，你的NER系统知道"她"是一个人但不知道是哪个人。

**类型:** 学习
**语言:** Python
**前置条件:** Phase 5 · 06（NER），Phase 5 · 07（词性标注与解析）
**时间:** ~60 分钟

## 问题

"Tim Cook became CEO of Apple in 2011. He previously worked at IBM." NER标记"Tim Cook"和"He"为PERSON。但"He"指谁？没有共指消解，下游系统无法将两个提及链接到同一个实体。

共指消解将引用同一实体的所有提及分组为簇。输入：一个文档。输出：提及簇集合，每个簇引用一个唯一实体。

## 概念

**提及检测。** 找到所有可能引用实体的span：专有名词、代词、名词短语。通常与NER联合完成。

**指代对分类。** 给定两个提及，它们是否指同一实体？这是核心分类决策。特征包括：性别/数量一致性、句法角色、语义兼容性、距离。

**提及聚类。** 将正对链接为簇。传递闭包：如果A=B且B=C，则A=C。更高级方法使用图聚类。

**架构。**

- **基于规则。** 多通道系统（Hobbs, 1978; Lee et al., 2013）。确定性、可调试、高精确度低召回率。
- **SpanBERT。** 对span对进行端到端分类。2018-2022年标准神经方法。
- **基于Transformer。** 长文档上使用Longformer/BigBird编码器。当前SOTA。

**评估。** MUC、B-cubed、CEAF-F指标。每个从不同角度测量簇质量。报告所有三个 + CoNLL平均（三者的均值）。

## 构建它

### 步骤 1：基于规则的代词消解

```python
def resolve_pronouns(doc_tokens, pos_tags, ner_tags):
    entities = []
    for i, (token, pos, ner) in enumerate(zip(doc_tokens, pos_tags, ner_tags)):
        if ner.startswith("B-PER"):
            entities.append({"mention": token, "type": "PER", "index": i, "gender": infer_gender(token)})

    clusters = {e["mention"]: [e["index"]] for e in entities}

    for i, (token, pos, ner) in enumerate(zip(doc_tokens, pos_tags, ner_tags)):
        if pos == "PRP" and token.lower() in {"he", "him", "his"}:
            for entity in reversed(entities):
                if entity["gender"] == "M" and entity["index"] < i:
                    clusters[entity["mention"]].append(i)
                    break
        elif pos == "PRP" and token.lower() in {"she", "her", "hers"}:
            for entity in reversed(entities):
                if entity["gender"] == "F" and entity["index"] < i:
                    clusters[entity["mention"]].append(i)
                    break
    return clusters
```

### 步骤 2：使用spaCy的神经共指

```python
import spacy

nlp = spacy.load("en_coreference_web_trf")

doc = nlp("Tim Cook became CEO of Apple in 2011. He previously worked at IBM.")
for cluster in doc.spans:
    print(f"Cluster: {[str(m) for m in cluster]}")
```

### 步骤 3：评估指标

```python
def muc_score(predicted_clusters, gold_clusters):
    """MUC: 基于链接的指标"""
    total_links = sum(len(c) - 1 for c in gold_clusters)
    found = 0
    for gold in gold_clusters:
        for pred in predicted_clusters:
            overlap = set(gold) & set(pred)
            if overlap:
                found += len(overlap) - 1
                break
    return found / total_links if total_links else 0
```

## 使用它

| 场景         | 选择                 |
| ------------ | -------------------- |
| 快速、确定性 | 基于规则（多通道）   |
| 生产质量     | spaCy共指模型        |
| 最高准确率   | SpanBERT或Longformer |
| 对话系统     | 增量共指（逐轮更新） |

共指消解在以下场景中承重：

- **关系抽取。** "He founded Apple" — 需要知道"He" = "Tim Cook"。
- **实体链接。** 链接代词到KB实体。
- **摘要。** 代词消解后摘要更连贯。
- **问答。** "Who became CEO?" — 答案可能在代词指代的句子中。

## 交付它

将结果保存为 `outputs/skill-coref-picker.md`。

## 练习

1. **简单。** 在10个手工编写的句子上实现基于规则的代词消解。测量准确率。
2. **中等。** 在OntoNotes数据集子集上运行spaCy共指模型。与基于规则比较。
3. **困难。** 构建共指感知的关系抽取流水线。测量有和无共指的RE F1。

## 关键术语

| 术语 | 通俗说法   | 实际含义                                     |
| ---- | ---------- | -------------------------------------------- |
| 共指 | 指同一实体 | 引用同一实体的不同提及。                     |
| 提及 | 实体引用   | 引用实体的任何span（名字、代词、名词短语）。 |
| 簇   | 同一实体组 | 引用同一实体的提及集合。                     |
| MUC  | 评估指标   | 基于链接的共指评估指标。                     |

## 延伸阅读

- [Lee et al. (2017). End-to-end Neural Coreference Resolution](https://arxiv.org/abs/1707.07045) — 端到端共指。
- [Joshi et al. (2020). SpanBERT](https://arxiv.org/abs/1907.10529) — Span预训练改善共指。
- [spaCy共指文档](https://spacy.io/universe/project/spacy-coref) — 生产参考。
