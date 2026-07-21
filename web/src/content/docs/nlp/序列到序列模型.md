---
title: 序列到序列模型
description: '理解编码器-解码器架构、教师强制和上下文向量瓶颈'
module: nlp
difficulty: intermediate
tags:
  - Seq2Seq
  - '编码器-解码器'
  - 教师强制
  - 束搜索
related:
  - nlp/问答系统
  - nlp/信息检索与搜索
  - nlp/长上下文评估
  - nlp/主题建模
prerequisites:
  - 'nlp/词袋模型与TF-IDF'
---

# 序列到序列模型

> 两个RNN假装成翻译器。它们撞到的瓶颈就是注意力存在的原因。

**类型:** 构建
**语言:** Python
**前置条件:** Phase 5 · 08（文本CNN + RNN），Phase 3 · 11（PyTorch入门）
**时间:** ~75 分钟

## 问题

分类将可变长度序列映射到单个标签。翻译将可变长度序列映射到另一个可变长度序列。输入和输出生活在不同词表中，可能是不同语言，不保证长度对等。

Seq2Seq架构（Sutskever, Vinyals, Le, 2014）用一个刻意简单的配方破解了这个问题。两个RNN。一个读取源句子并产生固定大小的上下文向量。另一个读取该向量并逐token生成目标句子。你在课程08写的相同代码，以不同方式粘合。

这值得学习有两个原因。首先，上下文向量瓶颈是NLP中最有教学价值的失败。它激发了注意力和Transformer擅长的一切。其次，训练配方（教师强制、计划采样、推理时束搜索）仍然适用于包括LLM在内的每个现代生成系统。

## 概念

**编码器。** 读取源句子的RNN。其最终隐藏状态是**上下文向量** — 整个输入的固定大小摘要。据说不丢失任何东西。

**解码器。** 从上下文向量初始化的另一个RNN。每步接收之前生成的token作为输入，产生目标词表上的分布。采样或argmax选择下一个token。反馈回去。重复直到产生 `<EOS>` token或达到最大长度。

**训练：** 每个解码器步的交叉熵损失，在序列上求和。通过两个网络的标准时间反向传播。

**教师强制。** 训练时，解码器在步骤 `t` 的输入是位置 `t-1` 的*真实*token，不是解码器自己的前一个预测。这稳定训练；没有它，早期错误级联，模型永远学不会。推理时，你必须使用模型自己的预测，所以总有训练/推理分布差距。那个差距叫**暴露偏差**。

**瓶颈。** 编码器学到的关于源的一切必须压缩到那个上下文向量中。长句子丢失细节。罕见词模糊。重排序（chat noir vs. black cat）必须记忆，不能计算。

注意力（课程10）通过让解码器查看*每个*编码器隐藏状态而非仅最后一个来修复这个问题。这就是全部要点。

## 构建它

### 步骤 1：编码器

```python
import torch
import torch.nn as nn


class Encoder(nn.Module):
    def __init__(self, src_vocab_size, embed_dim, hidden_dim):
        super().__init__()
        self.embed = nn.Embedding(src_vocab_size, embed_dim, padding_idx=0)
        self.gru = nn.GRU(embed_dim, hidden_dim, batch_first=True)

    def forward(self, src):
        e = self.embed(src)
        outputs, hidden = self.gru(e)
        return outputs, hidden
```

`outputs` 形状 `[batch, seq_len, hidden_dim]` — 每个输入位置一个隐藏状态。`hidden` 形状 `[1, batch, hidden_dim]` — 最终步骤。课程08说"在outputs上池化用于分类"。这里我们保留最后隐藏状态作为上下文向量，忽略每步输出。

### 步骤 2：解码器

```python
class Decoder(nn.Module):
    def __init__(self, tgt_vocab_size, embed_dim, hidden_dim):
        super().__init__()
        self.embed = nn.Embedding(tgt_vocab_size, embed_dim, padding_idx=0)
        self.gru = nn.GRU(embed_dim, hidden_dim, batch_first=True)
        self.fc = nn.Linear(hidden_dim, tgt_vocab_size)

    def forward(self, token, hidden):
        e = self.embed(token)
        out, hidden = self.gru(e, hidden)
        logits = self.fc(out)
        return logits, hidden
```

解码器每次调用一步。输入：一批单个token和当前隐藏状态。输出：下一个token的词表logits和更新的隐藏状态。

### 步骤 3：带教师强制的训练循环

```python
def train_batch(encoder, decoder, src, tgt, bos_id, optimizer, teacher_forcing_ratio=0.9):
    optimizer.zero_grad()
    _, hidden = encoder(src)
    batch_size, tgt_len = tgt.shape
    input_token = torch.full((batch_size, 1), bos_id, dtype=torch.long)
    loss = 0.0
    loss_fn = nn.CrossEntropyLoss(ignore_index=0)

    for t in range(tgt_len):
        logits, hidden = decoder(input_token, hidden)
        step_loss = loss_fn(logits.squeeze(1), tgt[:, t])
        loss += step_loss
        use_teacher = torch.rand(1).item() < teacher_forcing_ratio
        if use_teacher:
            input_token = tgt[:, t].unsqueeze(1)
        else:
            input_token = logits.argmax(dim=-1)

    loss.backward()
    optimizer.step()
    return loss.item() / tgt_len
```

两个值得命名的旋钮。`ignore_index=0` 跳过填充token上的损失。`teacher_forcing_ratio` 是每步使用真实token vs 模型预测的概率。从1.0（完全教师强制）开始，训练中退火到约0.5以缩小暴露偏差差距。

### 步骤 4：推理循环（贪心）

```python
@torch.no_grad()
def greedy_decode(encoder, decoder, src, bos_id, eos_id, max_len=50):
    _, hidden = encoder(src)
    batch_size = src.shape[0]
    input_token = torch.full((batch_size, 1), bos_id, dtype=torch.long)
    output_ids = []
    for _ in range(max_len):
        logits, hidden = decoder(input_token, hidden)
        next_token = logits.argmax(dim=-1)
        output_ids.append(next_token)
        input_token = next_token
        if (next_token == eos_id).all():
            break
    return torch.cat(output_ids, dim=1)
```

贪心解码每步选择最高概率token。它可能偏离：一旦你提交了一个token，你不能收回。**束搜索**保持前 `k` 个部分序列存活，最后选择最高分的完整序列。束宽3-5是标准。

### 步骤 5：瓶颈，演示

在玩具复制任务上训练模型：源 `[a, b, c, d, e]`，目标 `[a, b, c, d, e]`。增加序列长度。观察准确率。

```
seq_len=5   复制准确率: 98%
seq_len=10  复制准确率: 91%
seq_len=20  复制准确率: 62%
seq_len=40  复制准确率: 23%
```

单个GRU隐藏状态无法无损记忆40-token输入。信息在每个编码器步骤都存在，但解码器只看到最后状态。注意力直接修复这个问题。

## 使用它

PyTorch有 `nn.Transformer` 和基于 `nn.LSTM` 的seq2seq模板。Hugging Face的 `transformers` 库提供在数十亿token上训练的完整编码器-解码器模型（BART、T5、mBART、NLLB）。

```python
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM

tok = AutoTokenizer.from_pretrained("facebook/bart-base")
model = AutoModelForSeq2SeqLM.from_pretrained("facebook/bart-base")

src = tok("Translate this to French: Hello, how are you?", return_tensors="pt")
out = model.generate(**src, max_new_tokens=50, num_beams=4)
print(tok.decode(out[0], skip_special_tokens=True))
```

现代编码器-解码器用Transformer替代了RNN。高层形状（编码器、解码器、逐token生成）与2014年seq2seq论文完全相同。每个块内部的机制不同。

### 何时仍使用基于RNN的seq2seq

新项目几乎从不。特定例外：

- 流式翻译，你一次消费一个token且有界内存。
- 设备端文本生成，Transformer内存成本过高。
- 教学。理解编码器-解码器瓶颈是理解Transformer为什么赢的最快路径。

### 暴露偏差及其缓解

- **计划采样。** 训练中退火教师强制比率，使模型学习从自己的错误中恢复。
- **最小风险训练。** 在句子级BLEU分数而非token级交叉熵上训练。更接近你实际想要的。
- **强化学习微调。** 用指标奖励序列生成器。用于现代LLM RLHF。

三者仍适用于基于Transformer的生成。

## 交付它

将结果保存为 `outputs/prompt-seq2seq-design.md`。

## 练习

1. **简单。** 实现玩具复制任务。在输入输出对相同的GRU seq2seq上训练。测量长度5、10、20的准确率。复现瓶颈。
2. **中等。** 添加束宽3的束搜索解码。在小平行语料上与贪心比较BLEU。记录束搜索赢在哪里（通常是最后几个token）和没区别的地方。
3. **困难。** 在10k对释义数据集上微调 `facebook/bart-base`。比较微调模型的束4输出与基础模型在保留输入上的输出。报告BLEU并挑选10个定性示例。

## 关键术语

| 术语       | 通俗说法      | 实际含义                                            |
| ---------- | ------------- | --------------------------------------------------- |
| 编码器     | 输入RNN       | 读取源。产生每步隐藏状态和最终上下文向量。          |
| 解码器     | 输出RNN       | 从上下文向量初始化。逐个生成目标token。             |
| 上下文向量 | 摘要          | 最终编码器隐藏状态。固定大小。注意力解决的瓶颈。    |
| 教师强制   | 使用真实token | 训练时馈送真实前一个token。稳定学习。               |
| 暴露偏差   | 训练/测试差距 | 在真实token上训练的模型从未练习从自己的错误中恢复。 |
| 束搜索     | 更好的解码    | 每步保持前k个部分序列存活而非贪心提交。             |

## 延伸阅读

- [Sutskever, Vinyals, Le (2014). Sequence to Sequence Learning with Neural Networks](https://arxiv.org/abs/1409.3215) — 原始seq2seq论文。四页。
- [Cho et al. (2014). Learning Phrase Representations using RNN Encoder-Decoder for Statistical Machine Translation](https://arxiv.org/abs/1406.1078) — 引入GRU和编码器-解码器框架。
- [Bahdanau, Cho, Bengio (2014). Neural Machine Translation by Jointly Learning to Align and Translate](https://arxiv.org/abs/1409.0473) — 注意力论文。本课后立即阅读。
- [PyTorch NLP from Scratch教程](https://pytorch.org/tutorials/intermediate/seq2seq_translation_tutorial.html) — 可构建的seq2seq + 注意力代码。
