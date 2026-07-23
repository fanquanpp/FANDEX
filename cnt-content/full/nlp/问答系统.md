---
title: 问答系统
description: 理解抽取式QA、检索增强生成和RAGAS评估的完整技术栈
module: nlp
difficulty: intermediate
tags:
  - 问答系统
  - QA
  - RAG
  - SQuAD
  - RAGAS
related:
  - nlp/文本摘要
  - nlp/文本CNN与RNN
  - nlp/信息检索与搜索
  - nlp/序列到序列模型
prerequisites:
  - 'nlp/词袋模型与TF-IDF'
---

# 问答系统

> 三种系统塑造了现代QA。抽取式找到跨度。检索增强将答案锚定在文档中。生成式产生答案。每个现代AI助手都是三者的混合。

**类型:** 构建
**语言:** Python
**前置条件:** Phase 5 · 11（机器翻译），Phase 5 · 10（注意力机制）
**时间:** ~75 分钟

## 问题

用户输入"When did the first iPhone launch?"并期望"June 29, 2007。"不是"Apple's history is long and varied。"不是孤立的"2007"。一个直接、有依据、正确的答案。

过去十年三种架构主导了QA。

- **抽取式QA。** 给定问题和已知包含答案的段落，找到答案跨度在段落中的起始和结束索引。SQuAD是标准基准。
- **开放域QA。** 段落未给定。先检索相关段落，然后抽取或生成答案。这是当今每个RAG流水线的基石。
- **生成式/闭卷QA。** 大型语言模型从参数化记忆中回答。无需检索。推理最快，事实可靠性最低。

2026年的趋势是混合：检索最佳几个段落，然后提示生成模型基于这些段落回答。这就是RAG，课程14深入覆盖检索部分。本课程构建QA部分。

## 概念

**抽取式。** 用Transformer（BERT家族）一起编码问题和段落。训练两个预测答案起始和结束token索引的头。损失是有效位置上的交叉熵。输出是段落中的跨度。从不幻觉（构造上不可能），从不处理段落无法回答的问题（构造上不可能）。

**检索增强（RAG）。** 两个阶段。首先，检索器从语料库中找到top-k段落。其次，阅读器（抽取式或生成式）使用这些段落产生答案。检索器-阅读器分离让两者可以独立训练和评估。现代RAG通常在它们之间添加重排序器。

**生成式。** 仅解码器LLM（GPT、Claude、Llama）从学习到的权重回答。无检索步骤。常见知识上优秀，罕见或最新事实上灾难性。幻觉率与预训练数据中的事实频率负相关。

## 构建它

### 步骤 1：使用预训练模型的抽取式QA

```python
from transformers import pipeline

qa = pipeline("question-answering", model="deepset/roberta-base-squad2")

passage = (
    "Apple Inc. released the first iPhone on June 29, 2007. "
    "The device was announced by Steve Jobs at Macworld in January 2007."
)
question = "When was the first iPhone released?"

answer = qa(question=question, context=passage)
print(answer)
```

```python
{'score': 0.98, 'start': 57, 'end': 70, 'answer': 'June 29, 2007'}
```

`deepset/roberta-base-squad2` 在SQuAD 2.0上训练，包含不可回答的问题。默认情况下，`question-answering` 流水线返回最高分跨度，即使模型的空分数胜出 — 它*不会*自动返回空答案。要获得显式的"无答案"行为，传 `handle_impossible_answer=True`：流水线仅在空分数超过每个跨度分数时返回空答案。无论哪种方式都要检查 `score` 字段。

### 步骤 2：检索增强流水线（概要）

```python
from sentence_transformers import SentenceTransformer
import numpy as np

encoder = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

corpus = [
    "Apple Inc. released the first iPhone on June 29, 2007.",
    "Macworld 2007 featured the iPhone announcement by Steve Jobs.",
    "Android launched in 2008 as Google's mobile operating system.",
    "The first iPod was released in 2001.",
]
corpus_embeddings = encoder.encode(corpus, normalize_embeddings=True)


def retrieve(question, top_k=2):
    q_emb = encoder.encode([question], normalize_embeddings=True)
    sims = (corpus_embeddings @ q_emb.T).squeeze()
    order = np.argsort(-sims)[:top_k]
    return [corpus[i] for i in order]


def answer(question):
    passages = retrieve(question, top_k=2)
    combined = " ".join(passages)
    return qa(question=question, context=combined)


print(answer("When was the first iPhone released?"))
```

两阶段流水线。密集检索器（Sentence-BERT）通过语义相似度找到相关段落。抽取式阅读器（RoBERTa-SQuAD）从组合的顶部段落中提取答案跨度。适用于小型语料库。对于百万文档语料库，使用FAISS或向量数据库。

### 步骤 3：带RAG的生成式

```python
def rag_generate(question, llm):
    passages = retrieve(question, top_k=3)
    prompt = f"""Context:
{chr(10).join('- ' + p for p in passages)}

Question: {question}

Answer using only the context above. If the context does not contain the answer, say "I don't know."
"""
    return llm(prompt)
```

提示模式很重要。明确告诉模型基于上下文回答并在上下文不足时返回"I don't know"，与朴素提示相比减少幻觉率40-60%。更精细的模式添加引用、置信度分数和结构化提取。

### 步骤 4：反映真实世界的评估

SQuAD使用**精确匹配 (EM)** 和**token级F1**。EM是归一化后的严格匹配（小写、去标点、去冠词） — 预测要么完全匹配要么得0分。F1基于预测和参考之间的token重叠计算并给予部分分。两者都低估释义："June 29, 2007" vs "June 29th, 2007"通常EM为0（序数词破坏归一化）但仍从重叠token获得可观F1。

生产QA：

- **答案准确率**（LLM评判或人工评判，因为指标不捕获语义等价）。
- **引用准确率。** 引用的段落是否确实支持答案？用生成引用和检索段落之间的字符串匹配自动检查很简单。
- **拒绝校准。** 当答案不在检索段落中时，系统是否正确说"I don't know"？测量错误置信率。
- **检索召回。** 在评估阅读器之前，测量检索器是否将正确段落放入top-k。阅读器无法修复缺失的段落。

### RAGAS：2026年生产评估框架

`RAGAS` 专为RAG系统构建，是2026年的发布默认。它无需黄金参考即可在四个维度评分：

- **忠实度。** 答案中的每个主张是否来自检索上下文？通过基于NLI的蕴含测量。你的主要幻觉指标。
- **答案相关性。** 答案是否回应了问题？通过从答案生成假设问题并与真实问题比较来测量。
- **上下文精确度。** 检索的块中，有多少比例实际相关？低精确度 = 提示中的噪声。
- **上下文召回。** 检索集是否包含所有需要的信息？低召回 = 阅读器无法成功。

无参考评分让你可以在实时生产流量上评估，无需策划黄金答案。在开放问题上叠加LLM-as-judge，精确匹配指标在那里无用。

`pip install ragas`。插入你的检索器 + 阅读器。每次查询获得四个标量。对回归发出警报。

## 使用它

2026年技术栈。

| 用例                     | 推荐                                                |
| ------------------------ | --------------------------------------------------- |
| 给定段落，找答案跨度     | `deepset/roberta-base-squad2`                       |
| 固定语料库，闭卷不可接受 | RAG：密集检索器 + LLM阅读器                         |
| 文档存储上的实时         | RAG，混合（BM25 + 密集）检索器 + 重排序器（课程14） |
| 对话式QA（追问）         | LLM + 对话历史 + 每轮RAG                            |
| 高度事实性、受监管领域   | 权威语料上的抽取式；永远不要单独使用生成式          |

抽取式QA在2026年不时髦，因为带LLM的RAG处理更多情况。它仍然在需要逐字引用的上下文中发布：法律研究、合规监管、审计工具。

## 交付它

将结果保存为 `outputs/skill-qa-architect.md`。

## 练习

1. **简单。** 在10个Wikipedia段落上设置SQuAD抽取式流水线。手工制作10个问题。测量答案正确频率。如果段落和问题干净，你应该看到7-9个正确。
2. **中等。** 添加拒绝分类器。当最高检索分数低于阈值（如0.3余弦）时，返回"I don't know"而非调用阅读器。在保留集上调整阈值。
3. **困难。** 在你选择的10,000文档语料库上构建RAG流水线。实现混合检索（BM25 + 密集）与RRF融合（见课程14）。测量有和无混合步骤的答案准确率。记录哪些问题类型受益最大。

## 关键术语

| 术语     | 通俗说法     | 实际含义                                           |
| -------- | ------------ | -------------------------------------------------- |
| 抽取式QA | 找答案跨度   | 预测给定段落中答案的起始和结束索引。               |
| 开放域QA | 语料库上的QA | 无给定段落；必须先检索再回答。                     |
| RAG      | 检索后生成   | 检索增强生成。检索器 + 阅读器流水线。              |
| SQuAD    | 标准基准     | Stanford Question Answering Dataset。EM + F1指标。 |
| 幻觉     | 编造的答案   | 阅读器输出不被检索上下文支持。                     |
| 拒绝校准 | 知道何时闭嘴 | 系统在无法回答时正确说"I don't know"。             |

## 延伸阅读

- [Rajpurkar et al. (2016). SQuAD: 100,000+ Questions for Machine Comprehension of Text](https://arxiv.org/abs/1606.05250) — 基准论文。
- [Karpukhin et al. (2020). Dense Passage Retrieval for Open-Domain QA](https://arxiv.org/abs/2004.04906) — DPR，QA的标准密集检索器。
- [Lewis et al. (2020). Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks](https://arxiv.org/abs/2005.11401) — 命名RAG的论文。
- [Gao et al. (2023). Retrieval-Augmented Generation for Large Language Models: A Survey](https://arxiv.org/abs/2312.10997) — 综合RAG调查。
