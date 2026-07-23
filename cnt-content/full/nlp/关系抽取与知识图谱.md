---
title: 关系抽取与知识图谱
description: 理解关系抽取、AEVS验证流水线和知识图谱构建的完整技术栈
module: nlp
difficulty: intermediate
tags:
  - 关系抽取
  - 知识图谱
  - REBEL
  - AEVS
  - 三元组
related:
  - nlp/分块策略与RAG
  - nlp/共指消解
  - nlp/机器翻译
  - nlp/结构化输出与约束解码
prerequisites:
  - 'nlp/词袋模型与TF-IDF'
---

# 关系抽取与知识图谱构建

> NER找到了实体。实体链接锚定了它们。关系抽取找到了它们之间的边。知识图谱是节点、边及其来源的总和。

**类型:** 构建
**语言:** Python
**前置条件:** Phase 5 · 06（NER），Phase 5 · 25（实体链接）
**时间:** ~60 分钟

## 问题

分析师读到："Tim Cook became CEO of Apple in 2011." 四个事实：

- `(Tim Cook, role, CEO)`
- `(Tim Cook, employer, Apple)`
- `(Tim Cook, start_date, 2011)`
- `(Apple, type, Organization)`

关系抽取（RE）将自由文本转为结构化三元组 `(subject, relation, object)`。跨语料库聚合就得到知识图谱。聚合并查询就得到RAG、分析或合规审计的推理基底。

2026年的问题：LLM热情地抽取关系。太热情了。它们幻觉出源文本不支持的三元组。没有来源，你无法区分真实三元组和看似合理的虚构。2026年的答案是AEVS风格的锚定-验证流水线。

## 概念

**三元组形式。** `(subject_entity, relation_type, object_entity)`。关系来自封闭本体（Wikidata属性、FIBO、UMLS）或开放集（OpenIE风格，什么都可以）。

**三种抽取方法。**

1. **规则/模式。** Hearst模式："X such as Y" → `(Y, isA, X)`。加手工正则。脆弱、精确、可解释。
2. **有监督分类器。** 给定句子中两个实体提及，预测固定集中的关系。在TACRED、ACE、KBP上训练。2015-2022年标准。
3. **生成式LLM。** 提示模型输出三元组。开箱即用。需要来源，否则幻觉出看似合理的垃圾。

**AEVS（锚定-抽取-验证-补充, 2026）。** 当前幻觉缓解框架：

- **锚定。** 识别每个实体span和关系短语span的精确位置。
- **抽取。** 生成链接到锚定span的三元组。
- **验证。** 将每个三元组元素匹配回源文本；拒绝任何不支持的。
- **补充。** 覆盖遍确保没有锚定span被遗漏。

幻觉急剧下降。需要更多计算但可审计。

**开放vs封闭的权衡。**

- **封闭本体。** 固定属性列表（如Wikidata的11,000+属性）。可预测。可查询。难以发明。
- **开放IE。** 任何动词短语成为关系。高召回。低精确度。查询混乱。

生产KG通常混合：开放IE用于发现，然后在合并到主图之前将关系规范化到封闭本体。

## 构建它

### 步骤 1：基于模式的抽取

```python
PATTERNS = [
    (r"(?P<s>[A-Z]\w+) (?:is|was) (?:a|an|the) (?P<o>[A-Z]?\w+)", "isA"),
    (r"(?P<s>[A-Z]\w+) (?:is|was) born in (?P<o>\w+)", "bornIn"),
    (r"(?P<s>[A-Z]\w+) works? (?:at|for) (?P<o>[A-Z]\w+)", "worksAt"),
    (r"(?P<s>[A-Z]\w+) founded (?P<o>[A-Z]\w+)", "founded"),
]
```

### 步骤 2：有监督关系分类

```python
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM

tok = AutoTokenizer.from_pretrained("Babelscape/rebel-large")
model = AutoModelForSeq2SeqLM.from_pretrained("Babelscape/rebel-large")

text = "Tim Cook was born in Alabama. He later became CEO of Apple."
encoded = tok(text, return_tensors="pt", truncation=True)
output = model.generate(**encoded, max_length=200)
triples = tok.batch_decode(output, skip_special_tokens=False)
```

REBEL是seq2seq关系抽取器：文本输入，三元组输出，已经是Wikidata属性id。

### 步骤 3：带锚定的LLM提示抽取

```python
prompt = f"""Extract (subject, relation, object) triples from the text.
For each triple, include the exact character span in the source text.

Text: {text}

Output JSON:
[{{"subject": {{"text": "...", "span": [start, end]}},
   "relation": "...",
   "object": {{"text": "...", "span": [start, end]}}}}, ...]

Only include triples fully supported by the text. No inference beyond what is stated.
"""
```

验证每个返回的span与源文本。拒绝 `text[start:end] != triple_entity` 的任何内容。这是AEVS"验证"步骤的最小形式。

### 步骤 4：规范化到封闭本体

```python
RELATION_MAP = {
    "is the CEO of": "P169",
    "was born in":   "P19",
    "founded":        "P112",
    "works at":       "P108",
}

def canonicalize(relation):
    rel_low = relation.lower().strip()
    if rel_low in RELATION_MAP:
        return RELATION_MAP[rel_low]
    return None
```

规范化通常占工程工作的60-80%。为此做预算。

### 步骤 5：构建小型图并查询

```python
triples = extract(text)
graph = {}
for s, r, o in triples:
    graph.setdefault(s, []).append((r, o))

def neighbors(node, relation=None):
    return [(r, o) for r, o in graph.get(node, []) if relation is None or r == relation]

print(neighbors("Tim Cook", relation="P108"))
```

这是每个KG-RAG系统的原子。用RDF三元组存储（Blazegraph、Virtuoso）、属性图（Neo4j）或向量增强图存储扩展。

## 陷阱

- **RE之前的共指。** "He founded Apple" — RE需要知道"he"是谁。先运行共指（课程24）。
- **实体规范化。** "Apple Inc"和"Apple"必须解析为同一节点。先做实体链接（课程25）。
- **幻觉三元组。** LLM发出文本不支持的三元组。强制span验证。
- **关系规范化漂移。** 开放IE关系不一致（"was born in"、"came from"、"is a native of"）。折叠为规范id否则图不可查询。
- **时间错误。** "Tim Cook is CEO of Apple" — 现在为真，2005年为假。许多关系有时间边界。使用限定符（Wikidata中的 `P580` 开始时间、`P582` 结束时间）。
- **领域不匹配。** REBEL在Wikipedia上训练。法律、医疗和科学文本通常需要领域微调的RE模型。

## 使用它

| 场景                       | 选择                                  |
| -------------------------- | ------------------------------------- |
| 快速生产，通用领域         | REBEL或LlamaPred + Wikidata规范化     |
| 领域特定（生物医学、法律） | SciREX风格领域微调 + 自定义本体       |
| LLM提示，审计输出          | AEVS流水线：锚定 → 抽取 → 验证 → 补充 |
| 大量新闻IE                 | 基于模式 + 有监督混合                 |
| 从零构建KG                 | 开放IE + 手动规范化遍                 |
| 时序KG                     | 带限定符抽取（开始/结束时间、时间点） |

集成模式：NER → 共指 → 实体链接 → 关系抽取 → 本体映射 → 图加载。每个阶段都是潜在的质量门。

## 交付它

将结果保存为 `outputs/skill-re-designer.md`。

## 练习

1. **简单。** 在5个新闻文章句子上运行模式抽取器。手工检查精确率。
2. **中等。** 在相同句子上使用REBEL（或小型LLM）。比较三元组。哪个抽取器精确率更高？召回率更高？
3. **困难。** 构建AEVS流水线：用LLM抽取 + 验证span与源文本。测量验证步骤前后的幻觉率。

## 关键术语

| 术语     | 通俗说法       | 实际含义                                  |
| -------- | -------------- | ----------------------------------------- |
| 三元组   | 主语-关系-宾语 | KG的原子单元 `(s, r, o)` 元组。           |
| 开放IE   | 抽取任何东西   | 开放词汇关系短语；高召回，低精确度。      |
| 封闭本体 | 固定schema     | 有界关系类型集（Wikidata、UMLS、FIBO）。  |
| 规范化   | 标准化一切     | 将表面名称/关系映射到规范id。             |
| AEVS     | 有依据的抽取   | 锚定-抽取-验证-补充流水线（2026）。       |
| 来源     | 真实来源链接   | 每个三元组携带文档id + 字符span到其来源。 |

## 延伸阅读

- [Mintz et al. (2009). Distant supervision for relation extraction](https://www.aclweb.org/anthology/P09-1113.pdf) — 远程监督论文。
- [Huguet Cabot, Navigli (2021). REBEL](https://aclanthology.org/2021.findings-emnlp.204.pdf) — seq2seq RE主力。
- [AEVS框架 (2026)](https://www.mdpi.com/2073-431X/15/3/178) — 幻觉缓解设计。
