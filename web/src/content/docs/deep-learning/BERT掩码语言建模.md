---
title: BERT掩码语言建模
description: 'GPT预测下一个词,BERT预测缺失的词,一句话的差异——和半个decade所有嵌入形态的应用'
module: 'deep-learning'
difficulty: intermediate
tags:
  - BERT
  - MLM
  - 掩码语言建模
  - 编码器
  - 预训练
  - 微调
related:
  - 'deep-learning/注意力变体'
  - 'deep-learning/自注意力从零实现'
  - 'deep-learning/GPT因果语言建模'
  - 'deep-learning/JAX入门'
prerequisites:
  - 'deep-learning/深度学习概述'
---

# BERT — 掩码语言建模

> GPT预测下一个词。BERT预测一个缺失的词。一句话的差异——和半个decade所有嵌入形态的应用。

**类型:** 构建
**语言:** Python
**前置知识:** 阶段7 · 05(完整Transformer), 阶段5 · 02(文本表示)
**预计时间:** ~45分钟

## 问题所在

2018年,每个NLP任务——情感、NER、QA、蕴含——都在自己的标注数据上从头训练自己的模型。没有预训练的"理解英语"检查点可以微调。ELMo(2018)表明你可以用双向LSTM预训练上下文嵌入;它有帮助但没有泛化。

BERT(Devlin et al. 2018)提出:如果我们取一个transformer编码器,在互联网上的每个句子上训练它,并迫使它从两侧上下文预测缺失的词会怎样?然后你在下游任务上微调一个头。参数效率是一个启示。

结果:在18个月内,BERT及其变体(RoBERTa, ALBERT, ELECTRA)主导了所有存在的NLP排行榜。到2020年,地球上每个搜索引擎、内容审核管道和语义搜索系统内部都有一个BERT。

2026年,仅编码器模型仍然是分类、检索和结构化提取的正确工具——它们每token运行比解码器快5-10倍,其嵌入是每个现代检索栈的骨干。ModernBERT(2024年12月)将架构推至8K上下文,使用Flash Attention + RoPE + GeGLU。

## 核心概念

### 训练信号

取一个句子: `the quick brown fox jumps over the lazy dog`。

随机掩码15%的token:

```
input:  the [MASK] brown fox jumps [MASK] the lazy dog
target: the quick brown fox jumps over the lazy dog
```

训练模型在掩码位置预测原始token。因为编码器是双向的,在位置1预测 `[MASK]` 可以使用位置2+的 `brown fox jumps`。这是GPT做不到的事情。

### BERT掩码规则

在被选中预测的15%的token中:

- 80%被替换为 `[MASK]`。
- 10%被替换为随机token。
- 10%保持不变。

为什么不总是 `[MASK]`?因为 `[MASK]` 在推理时永远不会出现。训练模型在100%的掩码位置期望 `[MASK]` 会在预训练和微调之间创建分布偏移。10%随机 + 10%不变使模型保持诚实。

### 下一句预测(NSP) — 以及为什么被放弃

原始BERT还在NSP上训练:给定两个句子A和B,预测B是否跟随A。RoBERTa(2019)消融了它并显示NSP有害而非有帮助。现代编码器跳过它。

### 2026年的变化: ModernBERT

2024年ModernBERT论文用2026年的原语重建了块:

| 组件       | 原始BERT (2018) | ModernBERT (2024)    |
| ---------- | --------------- | -------------------- |
| 位置       | 学习的绝对      | RoPE                 |
| 激活       | GELU            | GeGLU                |
| 归一化     | LayerNorm       | Pre-norm RMSNorm     |
| 注意力     | 完全密集        | 交替局部(128) + 全局 |
| 上下文长度 | 512             | 8192                 |
| 分词器     | WordPiece       | BPE                  |

与2018年的栈不同,它是Flash-Attention原生的。在序列长度8K时推理比DeBERTa-v3快2-3倍,且GLUE分数更好。

### 2026年仍然选择编码器的用例

| 任务                   | 为什么编码器优于解码器             |
| ---------------------- | ---------------------------------- |
| 检索/语义搜索嵌入      | 双向上下文 = 每token更好的嵌入质量 |
| 分类(情感、意图、毒性) | 一次前向传播;无生成开销            |
| NER / token标注        | 逐位置输出,原生双向                |
| 零样本蕴含(NLI)        | 编码器顶部的分类器头               |
| RAG重排序器            | 交叉编码器评分,比LLM重排序器快10倍 |

## 动手构建

### 步骤1:掩码逻辑

参见 `code/main.py`。函数 `create_mlm_batch` 接收token ID列表、词汇表大小和掩码概率。返回输入ID(应用了掩码)和标签(仅在掩码位置,-100在其他位置——PyTorch的忽略索引约定)。

```python
def create_mlm_batch(tokens, vocab_size, mask_prob=0.15, rng=None):
    input_ids = list(tokens)
    labels = [-100] * len(tokens)
    for i, t in enumerate(tokens):
        if rng.random() < mask_prob:
            labels[i] = t
            r = rng.random()
            if r < 0.8:
                input_ids[i] = MASK_ID
            elif r < 0.9:
                input_ids[i] = rng.randrange(vocab_size)
            # else: 保持原始
    return input_ids, labels
```

### 步骤2:在微型语料上运行MLM预测

在20个词、200个句子的词汇上训练2层编码器 + MLM头。没有梯度——我们做前向传播健全性检查。完整训练需要PyTorch。

### 步骤3:比较掩码类型

展示三向规则如何使模型在没有 `[MASK]` 的情况下可用。在未掩码句子和掩码句子上预测。两者都应该产生合理的token分布,因为模型在训练中看到了两种模式。

### 步骤4:微调头

在玩具情感数据集上用分类头替换MLM头。只有头训练;编码器冻结。这是每个BERT应用遵循的模式。

## 实际应用

```python
from transformers import AutoModel, AutoTokenizer

tok = AutoTokenizer.from_pretrained("answerdotai/ModernBERT-base")
model = AutoModel.from_pretrained("answerdotai/ModernBERT-base")

text = "Attention is all you need."
inputs = tok(text, return_tensors="pt")
out = model(**inputs).last_hidden_state   # (1, N, 768)
```

**嵌入模型是微调的BERT。** `sentence-transformers` 模型如 `all-MiniLM-L6-v2` 是用对比损失训练的BERT。编码器相同。损失改变了。

**交叉编码器重排序器也是微调的BERT。** 在 `[CLS] query [SEP] doc [SEP]` 上的对分类。查询和文档之间的双向注意力正是交叉编码器质量优于双编码器的原因。

**2026年何时不选BERT。** 任何生成式任务。编码器没有合理的方式自回归产生token。还有:10亿参数以下的任何场景,小型解码器可以在更灵活的情况下匹配质量(Phi-3-Mini, Qwen2-1.5B)。

## 交付成果

参见 `outputs/skill-bert-finetuner.md`。该技能为新的分类或提取任务规划BERT微调(骨干选择、头规范、数据、评估、停止)。

## 练习

1. **简单。** 运行 `code/main.py` 并打印10,000个token的掩码分布。确认约15%被选中,其中约80%变成 `[MASK]`。
2. **中等。** 实现全词掩码:如果一个词被分词为子词,则一起掩码所有子词或都不掩码。测量这是否在500句语料上提高了MLM准确率。
3. **困难。** 在10,000个公共数据集句子上训练微型(2层, d=64)BERT。在SST-2情感上微调 `[CLS]` token。与匹配参数的仅解码器基线比较——哪个赢?

## 关键术语

| 术语       | 人们怎么说     | 实际含义                                                            |
| ---------- | -------------- | ------------------------------------------------------------------- |
| MLM        | "掩码语言建模" | 训练信号:随机将15%的token替换为 `[MASK]`,预测原始token。            |
| 双向       | "两边都看"     | 编码器注意力没有因果掩码——每个位置看到每个其他位置。                |
| `[CLS]`    | "池化token"    | 预置到每个序列的特殊token;其最终嵌入用作句子级表示。                |
| `[SEP]`    | "段分隔符"     | 分隔成对序列(如查询/文档, 句子A/B)。                                |
| NSP        | "下一句预测"   | BERT的第二个预训练任务;在RoBERTa中被证明无用,2019年后被放弃。       |
| 微调       | "适应任务"     | 保持编码器大部分冻结;在顶部为下游任务训练小头。                     |
| 交叉编码器 | "重排序器"     | 接受查询和文档作为输入的BERT,输出相关性分数。                       |
| ModernBERT | "2024刷新"     | 用RoPE, RMSNorm, GeGLU, 交替局部/全局注意力, 8K上下文重建的编码器。 |

## 延伸阅读

- [Devlin et al. (2018). BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding](https://arxiv.org/abs/1810.04805) — 原始论文。
- [Liu et al. (2019). RoBERTa: A Robustly Optimized BERT Pretraining Approach](https://arxiv.org/abs/1907.11692) — 如何正确训练BERT;终结NSP。
- [Clark et al. (2020). ELECTRA: Pre-training Text Encoders as Discriminators Rather Than Generators](https://arxiv.org/abs/2003.10555) — 替换token检测在匹配计算下优于MLM。
- [Warner et al. (2024). Smarter, Better, Faster, Longer: A Modern Bidirectional Encoder](https://arxiv.org/abs/2412.13663) — ModernBERT论文。
- [HuggingFace `modeling_bert.py`](https://github.com/huggingface/transformers/blob/main/src/transformers/models/bert/modeling_bert.py) — 规范编码器参考。
