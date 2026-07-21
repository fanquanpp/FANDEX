---
title: 实体链接
description: 理解实体链接与消歧，将提及映射到知识库中的唯一实体
module: nlp
difficulty: intermediate
tags:
  - 实体链接
  - 消歧
  - BLINK
  - GENRE
  - 知识库
related:
  - nlp/嵌入模型深入
  - nlp/情感分析
  - nlp/文本处理
  - nlp/文本生成
prerequisites:
  - 'nlp/词袋模型与TF-IDF'
---

# 实体链接与消歧

> NER找到了"Paris"。实体链接决定：巴黎（法国）？Paris Hilton？Paris（德克萨斯州）？Paris（特洛伊王子）？没有链接，你的知识图谱就是模糊的。

**类型:** 构建
**语言:** Python
**前置条件:** Phase 5 · 06（NER），Phase 5 · 24（共指消解）
**时间:** ~60 分钟

## 问题

一个句子写道："Jordan beat the press." NER标记"Jordan"为PERSON。但是哪个Jordan？

- Michael Jordan（篮球运动员）？
- Michael B. Jordan（演员）？
- Michael I. Jordan（伯克利ML教授 — 是的，这种混淆在ML论文中是真实的）？
- Jordan（国家）？
- Jordan（希伯来名字）？

实体链接（EL）将每个提及解析为知识库中的唯一条目：Wikidata、Wikipedia、DBpedia或你的领域KB。两个子任务：

1. **候选生成。** 给定"Jordan"，哪些KB条目是合理的？
2. **消歧。** 给定上下文，哪个候选是正确的？

## 概念

**候选生成。** 给定提及的表面形式（"Jordan"），在别名索引中查找候选。Wikipedia别名词典覆盖大多数命名实体："JFK" → John F. Kennedy、Jacqueline Kennedy、JFK机场、JFK（电影）。典型索引每个提及返回10-30个候选。

**消歧：三种方法。**

1. **先验 + 上下文（Milne & Witten, 2008）。** `P(entity | mention) × context-similarity(entity, text)`。效果好，快速，无需训练。
2. **基于嵌入（ESS / REL / Blink）。** 编码提及 + 上下文。编码每个候选的描述。选最大余弦。2020-2024年默认。
3. **生成式（GENRE, 2021; 基于LLM, 2023+）。** 逐token解码实体的规范名称。约束解码确保输出是有效KB id。

**两个度量。**

- **提及召回（候选生成）。** 正确KB条目出现在候选列表中的金标准提及比例。整个流水线的下限。
- **消歧准确率 / F1。** 给定正确候选，top-1正确的频率。

始终报告两者。99%消歧准确率但80%候选召回的系统是80%的流水线。

## 构建它

### 步骤 1：从Wikipedia重定向构建别名索引

```python
alias_to_entities = {
    "jordan": ["Q41421 (Michael Jordan)", "Q810 (Jordan, country)", "Q254110 (Michael B. Jordan)"],
    "paris":  ["Q90 (Paris, France)", "Q663094 (Paris, Texas)", "Q55411 (Paris Hilton)"],
    "apple":  ["Q312 (Apple Inc.)", "Q89 (apple, fruit)"],
}
```

Wikipedia别名数据：约1800万（别名, 实体）对。从Wikidata转储下载。存储为倒排索引。

### 步骤 2：基于上下文的消歧

```python
def disambiguate(mention, context, alias_index, entity_desc):
    candidates = alias_index.get(mention.lower(), [])
    if not candidates:
        return None, 0.0
    context_words = set(tokenize(context))
    best, best_score = None, -1
    for entity_id in candidates:
        desc_words = set(tokenize(entity_desc[entity_id]))
        union = len(context_words | desc_words)
        score = len(context_words & desc_words) / union if union else 0.0
        if score > best_score:
            best, best_score = entity_id, score
    return best, best_score
```

Jaccard重叠是玩具版本。替换为嵌入上的余弦相似度。

### 步骤 3：基于嵌入的消歧（BLINK风格）

```python
from sentence_transformers import SentenceTransformer
encoder = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

def embed_mention(text, mention_span):
    start, end = mention_span
    marked = f"{text[:start]} [MENTION] {text[start:end]} [/MENTION] {text[end:]}"
    return encoder.encode([marked], normalize_embeddings=True)[0]

def embed_entity(entity_id, description):
    return encoder.encode([f"{entity_id}: {description}"], normalize_embeddings=True)[0]
```

索引时，嵌入每个KB实体一次。查询时，嵌入提及 + 上下文一次，与候选池做点积，选最大值。

### 步骤 4：生成式实体链接

```python
prompt = f"""Text: {text}
Mention: {mention}
List the best Wikipedia title for this mention.
Respond with JSON: {{"title": "..."}}"""
```

结合白名单（Outlines `choice`），这是2026年最简单的EL流水线。

## 陷阱

- **NIL处理。** 有些提及不在KB中（新兴实体、冷门人物）。系统必须预测NIL而非猜测错误实体。
- **提及边界错误。** 上游NER遗漏部分span（"Bank of America"仅标记为"Bank"）。EL召回下降。
- **流行度偏差。** 训练系统过度预测频繁实体。ML论文中的"Michael I. Jordan"经常链接到篮球Jordan。
- **跨语言EL。** 将中文文本中的提及映射到英文Wikipedia实体。需要多语言编码器或翻译步骤。
- **KB过时。** 新公司、事件、人物不在去年的Wikipedia转储中。生产流水线需要刷新循环。

## 使用它

| 场景                     | 选择                                  |
| ------------------------ | ------------------------------------- |
| 通用英语 + Wikipedia     | BLINK或REL                            |
| 跨语言，KB = Wikipedia   | mGENRE                                |
| LLM友好，少量提及/天     | 用候选列表 + 约束JSON提示Claude/GPT-4 |
| 领域特定KB（医疗、法律） | 自定义BERT + KB感知检索 + 领域微调    |
| 极低延迟                 | 仅先验精确匹配（Milne-Witten基线）    |

2026年发布的生产模式：NER → 共指 → 每个提及上的EL → 将簇折叠为每个簇一个规范实体。输出：文档中每个实体一个KB id，不是每个提及一个。

## 交付它

将结果保存为 `outputs/skill-entity-linker.md`。

## 练习

1. **简单。** 在10个歧义提及（Paris、Jordan、Apple）上实现先验+上下文消歧器。手工标注正确实体。测量准确率。
2. **中等。** 用句子Transformer编码50个歧义提及。嵌入每个候选的描述。比较基于嵌入的消歧与Jaccard上下文重叠。
3. **困难.** 构建1k实体的领域KB（如公司员工+产品）。实现端到端NER + EL。在100个保留句子上测量精确率和召回率。

## 关键术语

| 术语          | 通俗说法        | 实际含义                              |
| ------------- | --------------- | ------------------------------------- |
| 实体链接 (EL) | 链接到Wikipedia | 将提及映射到唯一KB条目。              |
| 候选生成      | 可能是谁？      | 为提及返回合理KB条目的短列表。        |
| 消歧          | 选对的          | 使用上下文评分候选，选胜者。          |
| 别名索引      | 查找表          | 从表面形式到候选实体的映射。          |
| NIL           | 不在KB中        | 显式预测无KB条目匹配。                |
| AIDA-CoNLL    | 基准            | 1,393篇带金标准实体链接的路透社文章。 |

## 延伸阅读

- [Milne, Witten (2008). Learning to Link with Wikipedia](https://www.cs.waikato.ac.nz/~ihw/papers/08-DM-IHW-LearningToLinkWithWikipedia.pdf) — 先验+上下文方法。
- [Wu et al. (2020). Zero-shot Entity Linking with Dense Entity Retrieval (BLINK)](https://arxiv.org/abs/1911.03814) — 基于嵌入的主力。
- [De Cao et al. (2021). Autoregressive Entity Retrieval (GENRE)](https://arxiv.org/abs/2010.00904) — 带约束解码的生成式EL。
