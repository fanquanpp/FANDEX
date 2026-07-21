---
title: 情感分析
description: 理解朴素贝叶斯、逻辑回归和否定处理在情感分析中的完整技术栈
module: nlp
difficulty: beginner
tags:
  - 情感分析
  - 朴素贝叶斯
  - 逻辑回归
  - 否定处理
  - 文本分类
related:
  - nlp/命名实体识别
  - nlp/嵌入模型深入
  - nlp/实体链接
  - nlp/文本处理
prerequisites:
  - 'nlp/词袋模型与TF-IDF'
---

# 情感分析

> 典型NLP任务。经典文本分类你需要知道的大部分都在这里。

**类型:** 构建
**语言:** Python
**前置条件:** Phase 5 · 02（BoW + TF-IDF），Phase 2 · 14（朴素贝叶斯）
**时间:** ~75 分钟

## 问题

"The food was not great." 正面还是负面？

情感听起来简单。评论者说了喜欢或不喜欢什么。标记句子。它成为典型NLP任务的原因是每个看起来容易的案例背后都藏着一个难的。否定翻转含义。讽刺反转它。"Not bad at all" 尽管有两个负面编码词却是正面的。Emoji比周围文本携带更多信号。领域词汇很重要（音乐评论中的 `tight` vs 时尚评论中的 `tight`）。

情感是经典NLP的工作实验室。如果你理解为什么每个朴素基线都有特定的失败模式，你就理解了为什么每个更丰富的模型被发明。本课程从零构建朴素贝叶斯基线，添加逻辑回归，并命名使生产情感成为合规级问题的陷阱。

## 概念

经典情感是两步配方。

1. **表示。** 将文本转为特征向量。BoW、TF-IDF或n-gram。
2. **分类。** 在标注样本上拟合线性模型（朴素贝叶斯、逻辑回归、SVM）。

朴素贝叶斯是最笨但有效的模型。假设给定标签每个特征独立。从计数估计 `P(word | positive)` 和 `P(word | negative)`。推理时，乘以概率。"朴素"独立性假设可笑地错误，但结果惊人地强。原因：在稀疏文本特征和中等数据下，分类器更关心每个词倾向哪一边，而不是多少。

逻辑回归修复了独立性假设。它为每个特征学习权重，包括负权重。`not good` 作为二元组特征获得负权重。朴素贝叶斯对从未标注的二元组做不到这点。

## 构建它

### 步骤 1：真实迷你数据集

```python
POSITIVE = [
    "absolutely loved this movie",
    "beautiful cinematography and a great story",
    "one of the best films of the year",
    "brilliant acting from the lead",
    "heartwarming and funny",
]

NEGATIVE = [
    "boring and far too long",
    "not worth your time",
    "the plot made no sense",
    "terrible acting, awful script",
    "i want my two hours back",
]
```

故意很小。真正的工作使用数万个样本（IMDb、SST-2、Yelp极性）。数学完全相同。

### 步骤 2：从零构建多项式朴素贝叶斯

```python
import math
from collections import Counter


def train_nb(docs_by_class, vocab, alpha=1.0):
    class_priors = {}
    class_word_probs = {}
    total_docs = sum(len(d) for d in docs_by_class.values())

    for cls, docs in docs_by_class.items():
        class_priors[cls] = len(docs) / total_docs
        counts = Counter()
        for doc in docs:
            for token in doc:
                counts[token] += 1
        total = sum(counts.values()) + alpha * len(vocab)
        class_word_probs[cls] = {
            w: (counts[w] + alpha) / total for w in vocab
        }
    return class_priors, class_word_probs


def predict_nb(doc, class_priors, class_word_probs):
    scores = {}
    for cls in class_priors:
        s = math.log(class_priors[cls])
        for token in doc:
            if token in class_word_probs[cls]:
                s += math.log(class_word_probs[cls][token])
        scores[cls] = s
    return max(scores, key=scores.get)
```

加性平滑（alpha=1.0）是Laplace平滑。没有它，某类中未见词概率为零，log爆炸。实践中 `alpha=0.01` 常见。`alpha=1.0` 是教学默认值。

### 步骤 3：从零构建逻辑回归

```python
import numpy as np


def sigmoid(x):
    return 1.0 / (1.0 + np.exp(-np.clip(x, -20, 20)))


def train_lr(X, y, epochs=500, lr=0.05, l2=0.01):
    n_features = X.shape[1]
    w = np.zeros(n_features)
    b = 0.0
    for _ in range(epochs):
        logits = X @ w + b
        preds = sigmoid(logits)
        err = preds - y
        grad_w = X.T @ err / len(y) + l2 * w
        grad_b = err.mean()
        w -= lr * grad_w
        b -= lr * grad_b
    return w, b


def predict_lr(X, w, b):
    return (sigmoid(X @ w + b) >= 0.5).astype(int)
```

L2正则化在这里很重要。文本特征稀疏；没有L2模型会记忆训练样本。从 `0.01` 开始调优。

### 步骤 4：处理否定（失败模式）

考虑 "not good" 和 "not bad"。BoW分类器看到 `{not, good}` 和 `{not, bad}` 并从训练中哪个出现更多来学习。二元组分类器看到 `not_good` 和 `not_bad` 并将它们作为不同特征学习。通常这就够了。

一个更粗糙但有效的修复：当你没有二元组时，**否定作用域**。在否定词后给token加 `NOT_` 前缀直到下一个标点。

```python
NEGATION_WORDS = {"not", "no", "never", "nor", "none", "nothing", "neither"}
NEGATION_TERMINATORS = {".", "!", "?", ",", ";"}


def apply_negation(tokens):
    out = []
    negate = False
    for token in tokens:
        if token in NEGATION_TERMINATORS:
            negate = False
            out.append(token)
            continue
        if token in NEGATION_WORDS:
            negate = True
            out.append(token)
            continue
        out.append(f"NOT_{token}" if negate else token)
    return out
```

```python
>>> apply_negation(["not", "good", "at", "all", ".", "but", "funny"])
['not', 'NOT_good', 'NOT_at', 'NOT_all', '.', 'but', 'funny']
```

现在 `good` 和 `NOT_good` 是不同特征。分类器可以给它们相反权重。三行预处理，情感基准上可测量的准确率提升。

### 步骤 5：重要的评估指标

类别不平衡时单独使用准确率会产生误导。真实情感语料通常70-80%正面或70-80%负面；常数多数分类器获得80%准确率但毫无价值。报告以下每一项：

- **每类精确率和召回率。** 每类一对。宏平均获得尊重类别平衡的单一数字。
- **宏F1（不平衡数据的主要指标）。** 每类F1分数的均值，等权重。类别不平衡时用这个代替准确率。
- **加权F1（替代方案）。** 与宏F1相同但按类别频率加权。当不平衡本身有业务含义时与宏F1一起报告。
- **混淆矩阵。** 原始计数。始终在信任任何标量指标前检查；它揭示模型混淆哪对类别。
- **每类错误样本。** 每类拉5个错误预测。阅读它们。没有什么能替代阅读实际错误。

对于严重不平衡数据（>95-5比例），报告**AUROC**和**AUPRC**代替准确率。AUPRC对少数类更敏感，这通常是你关心的（垃圾邮件、欺诈、罕见情感）。

**常见错误。** 在不平衡数据上报告micro-F1而非macro-F1会给出看起来很高的数字，因为它被多数类主导。宏F1迫使你看到少数类性能。

```python
def evaluate(y_true, y_pred):
    tp = sum(1 for t, p in zip(y_true, y_pred) if t == 1 and p == 1)
    fp = sum(1 for t, p in zip(y_true, y_pred) if t == 0 and p == 1)
    fn = sum(1 for t, p in zip(y_true, y_pred) if t == 1 and p == 0)
    tn = sum(1 for t, p in zip(y_true, y_pred) if t == 0 and p == 0)
    precision = tp / (tp + fp) if tp + fp else 0
    recall = tp / (tp + fn) if tp + fn else 0
    f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0
    return {"tp": tp, "fp": fp, "tn": tn, "fn": fn, "precision": precision, "recall": recall, "f1": f1}
```

## 使用它

scikit-learn六行搞定，正确地。

```python
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

pipe = Pipeline([
    ("tfidf", TfidfVectorizer(ngram_range=(1, 2), min_df=2, sublinear_tf=True, stop_words=None)),
    ("clf", LogisticRegression(C=1.0, max_iter=1000)),
])
pipe.fit(X_train, y_train)
print(pipe.score(X_test, y_test))
```

三个值得注意的点。`stop_words=None` 保留否定词。`ngram_range=(1, 2)` 添加二元组使 `not_good` 成为特征。`sublinear_tf=True` 抑制重复词。这三个标志是SST-2上75%准确率基线和85%准确率基线的区别。

### 何时使用Transformer

- 讽刺检测。经典模型在这里失败。句号。
- 情感在文档中间转换的长评论。
- 方面级情感。"Camera was great but battery was terrible." 你需要将情感归因于方面。只有Transformer或结构化输出模型。
- 非英语、低资源语言。多语言BERT免费给你零样本基线。

如果你需要以上任何一项，跳到Phase 7（Transformer深入）。否则，TF-IDF加二元组加否定处理的朴素贝叶斯或逻辑回归是你2026年的生产基线。

### 可复现性陷阱（再次）

重新训练情感模型是常规操作。重新评估它们不是。论文中报告的准确率数字使用特定的分割、特定的预处理、特定的分词器。如果你不用相同流水线比较新模型和基线，你会得到误导性的增量。始终在你的流水线上重新生成基线，而不是论文的数字。

## 交付它

将结果保存为 `outputs/prompt-sentiment-baseline.md`。

## 练习

1. **简单。** 在scikit-learn流水线中添加 `apply_negation` 作为预处理步骤，测量小型情感数据集上的F1增量。
2. **中等。** 实现类别加权逻辑回归（传 `class_weight="balanced"` 给scikit-learn，或自己推导梯度）。测量合成90-10类别不平衡上的效果。
3. **困难。** 通过在情感模型残差上训练第二个分类器来构建讽刺检测器。记录你的实验设置。当你的准确率低于随机时警告读者（2类讽刺的随机概率约50%，大多数首次尝试就在那里）。

## 关键术语

| 术语        | 通俗说法      | 实际含义                                           |
| ----------- | ------------- | -------------------------------------------------- |
| 极性        | 正面或负面    | 二值标签；有时扩展到中性或细粒度（5星）。          |
| 方面级情感  | 每方面极性    | 将情感归因于文本中提到的特定实体或属性。           |
| 否定作用域  | 反转附近token | 在"not"后给token加 `NOT_` 前缀直到标点。           |
| Laplace平滑 | 计数加1       | 防止朴素贝叶斯中零概率特征。                       |
| L2正则化    | 缩小权重      | 损失中添加 `lambda * sum(w^2)`。稀疏文本特征必需。 |

## 延伸阅读

- [Pang and Lee (2008). Opinion Mining and Sentiment Analysis](https://www.cs.cornell.edu/home/llee/opinion-mining-sentiment-analysis-survey.html) — 基础调查。长，但前四节覆盖了经典的一切。
- [Wang and Manning (2012). Baselines and Bigrams: Simple, Good Sentiment and Topic Classification](https://aclanthology.org/P12-2018/) — 展示二元组+朴素贝叶斯在短文本上难以超越的论文。
- [scikit-learn文本特征提取文档](https://scikit-learn.org/stable/modules/feature_extraction.html#text-feature-extraction) — `CountVectorizer`、`TfidfVectorizer` 和你要调的每个旋钮的参考。
