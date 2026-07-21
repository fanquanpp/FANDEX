---
title: 文本处理
description: 理解分词、词干提取和词形还原三大文本预处理操作
module: nlp
difficulty: beginner
tags:
  - 分词
  - 词干提取
  - 词形还原
  - 预处理
related:
  - nlp/情感分析
  - nlp/实体链接
  - nlp/文本生成
  - nlp/文本摘要
prerequisites:
  - 'nlp/词袋模型与TF-IDF'
---

# 文本处理 — 分词、词干提取、词形还原

> 语言是连续的。模型是离散的。预处理是桥梁。

**类型:** 构建
**语言:** Python
**前置条件:** Phase 2 · 14（朴素贝叶斯）
**时间:** ~45 分钟

## 问题

模型不能读取"The cats were running."它读取的是整数。

每个NLP系统都以相同的三个问题开始。一个词从哪里开始。词的词根是什么。我们如何将"run"、"running"、"ran"在需要时视为同一个东西，在不需要时视为不同的东西。

分词出错，模型就从垃圾中学习。如果你的分词器将 `don't` 视为一个token但 `do n't` 视为两个，训练分布就会分裂。如果你的词干提取器将 `organization` 和 `organ` 折叠到同一个词干，主题建模就死了。如果你的词形还原器需要词性上下文但你没有传入，动词就被当作名词处理。

本课程从零构建三个预处理步骤，然后展示NLTK和spaCy如何做同样的工作，让你看到权衡。

## 概念

三个操作。每个都有其职责和失败模式。

**分词**将字符串分割为token。"Token"是故意模糊的，因为正确的粒度取决于任务。经典NLP用词级。Transformer用子词。无空格语言用字符级。

**词干提取**用规则砍后缀。快速、激进、粗暴。`running -> run`。`organization -> organ`。第二个就是失败模式。

**词形还原**使用语法知识将词还原为字典形式。较慢、准确、需要查找表或形态分析器。`ran -> run`（需要知道"ran"是"run"的过去式）。`better -> good`（需要知道比较级形式）。

经验法则。速度重要且能容忍噪声时用词干提取（搜索索引、粗分类）。意义重要时用词形还原（问答、语义搜索、用户会阅读的任何内容）。

## 构建它

### 步骤 1：正则表达式词分词器

最简单可用的分词器在非字母数字字符上分割，同时将标点保留为独立token。不完美，不是最终方案，但一行代码就能运行。

```python
import re

def tokenize(text):
    return re.findall(r"[A-Za-z]+(?:'[A-Za-z]+)?|[0-9]+|[^\sA-Za-z0-9]", text)
```

三个模式按优先级排列。带可选内部撇号的词（`don't`、`it's`）。纯数字。任何单个非空白非字母数字字符作为独立token（标点）。

```python
>>> tokenize("The cats weren't running at 3pm.")
['The', 'cats', "weren't", 'running', 'at', '3', 'pm', '.']
```

需要注意的失败模式。`3pm` 拆分为 `['3', 'pm']`，因为我们在字母序列和数字序列之间交替。对大多数任务足够好。URL、邮箱、标签都会出错。生产环境中，在通用模式之前添加特定模式。

### 步骤 2：Porter词干提取器（仅步骤1a）

完整的Porter算法有五个阶段的规则。仅步骤1a就覆盖了最常见的英语后缀并教授了模式。

```python
def stem_step_1a(word):
    if word.endswith("sses"):
        return word[:-2]
    if word.endswith("ies"):
        return word[:-2]
    if word.endswith("ss"):
        return word
    if word.endswith("s") and len(word) > 1:
        return word[:-1]
    return word
```

```python
>>> [stem_step_1a(w) for w in ["caresses", "ponies", "caress", "cats"]]
['caress', 'poni', 'caress', 'cat']
```

从上到下阅读规则。`ies -> i` 规则就是为什么 `ponies -> poni`，而不是 `pony`。真正的Porter有步骤1b会修复它。规则相互竞争。前面的规则赢。顺序比任何单条规则都重要。

### 步骤 3：基于查找表的词形还原器

真正的词形还原需要形态学。一个可教学版本使用小型词元表和后备方案。

```python
LEMMA_TABLE = {
    ("running", "VERB"): "run",
    ("ran", "VERB"): "run",
    ("runs", "VERB"): "run",
    ("better", "ADJ"): "good",
    ("best", "ADJ"): "good",
    ("cats", "NOUN"): "cat",
    ("cat", "NOUN"): "cat",
    ("were", "VERB"): "be",
    ("was", "VERB"): "be",
    ("is", "VERB"): "be",
}

def lemmatize(word, pos):
    key = (word.lower(), pos)
    if key in LEMMA_TABLE:
        return LEMMA_TABLE[key]
    if pos == "VERB" and word.endswith("ing"):
        return word[:-3]
    if pos == "NOUN" and word.endswith("s"):
        return word[:-1]
    return word.lower()
```

```python
>>> lemmatize("running", "VERB")
'run'
>>> lemmatize("cats", "NOUN")
'cat'
>>> lemmatize("better", "ADJ")
'good'
>>> lemmatize("watched", "VERB")
'watched'
```

最后一个情况是关键教学时刻。`watched` 不在我们的表中，我们的后备方案只处理 `ing`。真正的词形还原覆盖 `ed`、不规则动词、比较级形容词、有音变的复数（`children -> child`）。这就是为什么生产系统使用WordNet、spaCy的形态分析器或完整的形态分析器。

### 步骤 4：将它们串联

```python
def preprocess(text, pos_tagger=None):
    tokens = tokenize(text)
    stems = [stem_step_1a(t.lower()) for t in tokens]
    tags = pos_tagger(tokens) if pos_tagger else [(t, "NOUN") for t in tokens]
    lemmas = [lemmatize(word, pos) for word, pos in tags]
    return {"tokens": tokens, "stems": stems, "lemmas": lemmas}
```

缺失的部分是词性标注器。Phase 5 · 07（词性标注）构建了一个。现在，默认所有词为 `NOUN` 并承认这个限制。

## 使用它

NLTK和spaCy提供了生产版本。各几行代码。

### NLTK

```python
import nltk
nltk.download("punkt_tab")
nltk.download("wordnet")
nltk.download("averaged_perceptron_tagger_eng")

from nltk.tokenize import word_tokenize
from nltk.stem import PorterStemmer, WordNetLemmatizer
from nltk import pos_tag

text = "The cats were running."
tokens = word_tokenize(text)
stems = [PorterStemmer().stem(t) for t in tokens]
lemmatizer = WordNetLemmatizer()
tagged = pos_tag(tokens)


def nltk_pos_to_wordnet(tag):
    if tag.startswith("V"):
        return "v"
    if tag.startswith("J"):
        return "a"
    if tag.startswith("R"):
        return "r"
    return "n"


lemmas = [lemmatizer.lemmatize(t, nltk_pos_to_wordnet(tag)) for t, tag in tagged]
```

`word_tokenize` 处理缩写、Unicode、你的正则表达式遗漏的边界情况。`PorterStemmer` 运行所有五个阶段。`WordNetLemmatizer` 需要将词性标签从NLTK的Penn Treebank方案翻译到WordNet的缩写集。上面的翻译连接是大多数教程跳过的部分。

### spaCy

```python
import spacy

nlp = spacy.load("en_core_web_sm")
doc = nlp("The cats were running.")

for token in doc:
    print(token.text, token.lemma_, token.pos_)
```

```
The      the     DET
cats     cat     NOUN
were     be      AUX
running  run     VERB
.        .       PUNCT
```

spaCy将整个流水线隐藏在 `nlp(text)` 后面。分词、词性标注和词形还原全部运行。大规模下比NLTK更快。开箱即用更准确。权衡是你不容易替换单个组件。

### 何时选择哪个

| 场景                                            | 选择                                               |
| ----------------------------------------------- | -------------------------------------------------- |
| 教学、研究、替换组件                            | NLTK                                               |
| 生产、多语言、速度重要                          | spaCy                                              |
| Transformer流水线（你最终会用模型的分词器分词） | 使用 `tokenizers` / `transformers`，跳过经典预处理 |

### 没人警告你的两个失败模式

大多数教程教完算法就停了。两件事会咬到真正的预处理流水线，而且几乎从未被覆盖。

**可复现性漂移。** NLTK和spaCy在版本之间改变分词和词形还原行为。在spaCy 2.x中产生 `['do', "n't"]` 的可能在3.x中产生 `["don't"]`。你的模型在一个分布上训练。推理现在在另一个分布上运行。准确率悄悄下降，没人知道为什么。在 `requirements.txt` 中固定库版本。编写预处理回归测试，冻结20个样本句子的预期分词。每次升级时运行。

**训练/推理不匹配。** 训练时用激进预处理（小写、去停用词、词干提取），部署时用原始用户输入，看性能崩溃。这是最常见的生产NLP失败。如果你在训练时预处理，推理时必须运行相同的函数。将预处理作为模型包内的函数发布，而不是服务团队重写的笔记本单元格。

## 交付它

将结果保存为 `outputs/prompt-preprocessing-advisor.md`。

## 练习

1. **简单。** 扩展 `tokenize` 以将URL保留为单个token。测试：`tokenize("Visit https://example.com today.")` 应产生一个URL token。
2. **中等。** 实现Porter步骤1b。如果一个词包含元音且以 `ed` 或 `ing` 结尾，移除它。处理双辅音规则（`hopping -> hop`，不是 `hopp`）。
3. **困难。** 构建一个使用WordNet作为查找表但在WordNet没有条目时回退到Porter词干提取器的词形还原器。在标注语料上测量与纯WordNet和纯Porter的准确率。

## 关键术语

| 术语     | 通俗说法 | 实际含义                                         |
| -------- | -------- | ------------------------------------------------ |
| Token    | 一个词   | 模型消费的任何单位。可以是词、子词、字符或字节。 |
| 词干     | 词的根   | 基于规则的后缀剥离结果。不总是真实词。           |
| 词元     | 字典形式 | 你会查字典的形式。需要语法上下文才能正确计算。   |
| 词性标签 | 词性     | 如NOUN、VERB、ADJ等类别。准确词形还原需要它。    |
| 形态学   | 词形规则 | 词如何根据时态、数、格变化形式。词形还原依赖它。 |

## 延伸阅读

- [Porter, M. F. (1980). An algorithm for suffix stripping](https://tartarus.org/martin/PorterStemmer/def.txt) — 原始论文，五页，仍然是最清晰的解释。
- [spaCy 101 — linguistic features](https://spacy.io/usage/linguistic-features) — 真实流水线如何连接。
- [NLTK book, chapter 3](https://www.nltk.org/book/ch03.html) — 你还没想过的分词边界情况。
