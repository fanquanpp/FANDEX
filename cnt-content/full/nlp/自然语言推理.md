---
title: 自然语言推理
description: 理解NLI三分类、零样本分类和RAG忠实度检测的核心技术
module: nlp
difficulty: intermediate
tags:
  - NLI
  - 自然语言推理
  - 零样本分类
  - 忠实度
  - 文本蕴含
related:
  - nlp/注意力机制
  - nlp/子词分词
  - nlp/GloVe与子词嵌入
  - nlp/LLM评估框架
prerequisites:
  - 'nlp/词袋模型与TF-IDF'
---

# 自然语言推理 — 文本蕴含

> "t蕴含h"意味着阅读t的人会得出h为真的结论。NLI是预测蕴含/矛盾/中性的任务。表面无聊，生产中承重。

**类型:** 学习
**语言:** Python
**前置条件:** Phase 5 · 05（情感分析），Phase 5 · 13（问答系统）
**时间:** ~60 分钟

## 问题

你构建了一个摘要器。它产生了摘要。你怎么知道摘要不包含幻觉？

你构建了一个聊天机器人。它回答了"是"。你怎么知道答案被检索到的段落支持？

你需要按主题分类10,000篇新闻文章。你没有训练标签。能复用模型吗？

三个问题都归结为自然语言推理。NLI问：给定前提 `t` 和假设 `h`，`h` 被 `t` 蕴含、矛盾还是中性（无关）？

- **幻觉检查：** `t` = 源文档，`h` = 摘要主张。非蕴含 = 幻觉。
- **接地QA：** `t` = 检索段落，`h` = 生成答案。非蕴含 = 编造。
- **零样本分类：** `t` = 文档，`h` = 语言化标签（"这是关于体育的"）。蕴含 = 预测标签。

一个任务，三个生产用途。这就是为什么每个RAG评估框架底层都发布NLI模型。

## 概念

**三个标签。**

- **蕴含。** `t` → `h`。"猫在垫子上"蕴含"有一只猫"。
- **矛盾。** `t` → ¬`h`。"猫在垫子上"矛盾"没有猫"。
- **中性。** 无法推断任何方向。"猫在垫子上"对"猫饿了"是中性的。

**不是逻辑蕴含。** NLI是*自然*语言推理 — 典型人类读者会推断什么，不是严格逻辑。"John遛了他的狗"在NLI中蕴含"John有一只狗"，但严格一阶逻辑只在公理化拥有关系时才承认。

**数据集。**

- **SNLI** (2015)。57万人工标注对，图像标题作为前提。窄域。
- **MultiNLI** (2017)。10个体裁的43.3万对。2026年标准训练语料。
- **ANLI** (2019)。对抗性NLI。人类专门写设计来破坏现有模型的示例。更难。
- **DocNLI, ConTRoL** (2020-21)。文档长度前提。测试多跳和长程推理。

**架构。** Transformer编码器（BERT、RoBERTa、DeBERTa）读取 `[CLS] 前提 [SEP] 假设 [SEP]`。`[CLS]` 表示送入3路softmax。在MNLI上训练，在保留基准上评估，域内对上获得90%+准确率。

**通过NLI的零样本。** 给定文档和候选标签，将每个标签转为假设（"这段文本是关于体育的"）。计算每个的蕴含概率。选最大值。这是Hugging Face `zero-shot-classification` 流水线背后的机制。

## 构建它

### 步骤 1：运行预训练NLI模型

```python
from transformers import pipeline

nli = pipeline("text-classification",
               model="facebook/bart-large-mnli",
               top_k=None)

premise = "The cat is sleeping on the couch."
hypothesis = "There is a cat in the room."

result = nli({"text": premise, "text_pair": hypothesis})[0]
print(result)
```

生产NLI，`facebook/bart-large-mnli` 和 `microsoft/deberta-v3-large-mnli` 是开放默认。DeBERTa-v3登顶排行榜。

### 步骤 2：零样本分类

```python
zs = pipeline("zero-shot-classification", model="facebook/bart-large-mnli")

text = "The stock market rallied after the central bank cut interest rates."
labels = ["finance", "sports", "politics", "technology"]

result = zs(text, candidate_labels=labels)
print(result)
```

模板默认是"This example is about {label}."。用 `hypothesis_template` 自定义。无需训练数据。无需微调。开箱即用。

### 步骤 3：RAG的忠实度检查

```python
def is_faithful(answer, context, threshold=0.5):
    result = nli({"text": context, "text_pair": answer})[0]
    entail = next(s for s in result if s["label"] == "entailment")
    return entail["score"] > threshold
```

这是RAGAS忠实度的核心。将生成的答案拆分为原子主张。对照检索上下文检查每个主张。报告蕴含的比例。

## 陷阱

- **仅假设捷径。** 模型可以仅从假设以约60%准确率在SNLI上预测标签，因为"not"、"nobody"、"never"与矛盾相关。检测标签泄漏的强基线。
- **词汇重叠启发式。** 子序列启发式（"每个子序列都被蕴含"）通过SNLI但在HANS/ANLI上失败。使用对抗性基准。
- **文档长度退化。** 单句NLI模型在文档长度前提上下降20+ F1。长上下文使用DocNLI训练的模型。
- **零样本模板敏感性。** "This example is about {label}" vs "{label}" vs "The topic is {label}" 可使准确率波动10+点。调优模板。
- **域不匹配。** MNLI在通用英语上训练。法律、医疗和科学文本需要领域特定NLI模型（如SciNLI、MedNLI）。

## 使用它

2026年技术栈：

| 用例               | 模型                                                       |
| ------------------ | ---------------------------------------------------------- |
| 通用NLI            | `microsoft/deberta-v3-large-mnli`                          |
| 快速/边缘          | `cross-encoder/nli-deberta-v3-base`                        |
| 零样本分类（轻量） | `facebook/bart-large-mnli`                                 |
| 文档级NLI          | `MoritzLaurer/DeBERTa-v3-large-mnli-fever-anli-ling-wanli` |
| 多语言             | `MoritzLaurer/multilingual-MiniLMv2-L6-mnli-xnli`          |
| RAG中的幻觉检测    | RAGAS / DeepEval内的NLI层                                  |

2026年元模式：NLI是文本理解的胶带。每当需要"A是否支持B？"或"A是否矛盾B？" — 在调用另一个LLM之前先考虑NLI。

## 交付它

将结果保存为 `outputs/skill-nli-picker.md`。

## 练习

1. **简单。** 在20个手工制作的（前提、假设、标签）三元组上运行 `facebook/bart-large-mnli`，覆盖所有三类。测量准确率。添加对抗性"子序列启发式"陷阱（"我没有吃蛋糕" vs "我吃了蛋糕"）看是否破坏。
2. **中等。** 在100个AG News标题上比较零样本模板"This text is about {label}" vs "The topic is {label}" vs "{label}"。报告准确率波动。
3. **困难。** 构建RAG忠实度检查器：原子主张分解 + 每个主张的NLI。在50个带黄金上下文的RAG生成答案上评估。测量与人工标签的假阳性和假阴性率。

## 关键术语

| 术语       | 通俗说法       | 实际含义                          |
| ---------- | -------------- | --------------------------------- |
| NLI        | 自然语言推理   | 前提-假设关系的3路分类。          |
| RTE        | 识别文本蕴含   | NLI的旧名称；相同任务。           |
| 蕴含       | "t蕴含h"       | 典型读者给定t会得出h为真。        |
| 矛盾       | "t排除h"       | 典型读者给定t会得出h为假。        |
| 中性       | "未定"         | t到h无法推断任何方向。            |
| 零样本分类 | NLI当分类器    | 将标签语言化为假设，选最大蕴含。  |
| 忠实度     | 答案有依据吗？ | （检索上下文，生成答案）上的NLI。 |

## 延伸阅读

- [Bowman et al. (2015). SNLI](https://arxiv.org/abs/1508.05326) — SNLI。
- [Williams, Nangia, Bowman (2017). MultiNLI](https://arxiv.org/abs/1704.05426) — MultiNLI。
- [Nie et al. (2019). Adversarial NLI](https://arxiv.org/abs/1910.14599) — ANLI基准。
- [He et al. (2021). DeBERTa](https://arxiv.org/abs/2006.03654) — 2026年NLI主力。
