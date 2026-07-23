---
title: 文本CNN与RNN
description: 理解TextCNN、LSTM、GRU和双向RNN在文本分类中的应用
module: nlp
difficulty: intermediate
tags:
  - TextCNN
  - LSTM
  - GRU
  - RNN
  - 文本分类
related:
  - nlp/文本生成
  - nlp/文本摘要
  - nlp/问答系统
  - nlp/信息检索与搜索
prerequisites:
  - 'nlp/词袋模型与TF-IDF'
---

# 文本CNN与RNN

> 卷积学习n-gram。循环记忆。两者都被注意力取代。两者在受限硬件上仍然重要。

**类型:** 构建
**语言:** Python
**前置条件:** Phase 3 · 11（PyTorch入门），Phase 5 · 03（词嵌入），Phase 4 · 02（从零构建卷积）
**时间:** ~75 分钟

## 问题

TF-IDF和Word2Vec产生忽略词序的扁平向量。基于它们构建的分类器无法区分 `dog bites man` 和 `man bites dog`。词序有时携带信号。

在Transformer到来之前，两个架构家族填补了这个空白。

**文本卷积网络 (TextCNN)。** 在词嵌入序列上应用1D卷积。宽度3的滤波器是可学习的三元组检测器：它跨越三个词并输出分数。堆叠不同宽度（2、3、4、5）检测多尺度模式。最大池化到固定大小表示。扁平、并行、快速。

**循环网络 (RNN、LSTM、GRU)。** 逐个处理token，维护携带信息前进的隐藏状态。顺序、有记忆、灵活输入长度。2014到2017年主导序列建模，然后注意力出现了。

本课程构建两者，然后命名促使注意力出现的失败。

## 概念

**TextCNN** (Kim, 2014)。Token被嵌入。宽度 `k` 的1D卷积在连续 `k` 个嵌入gram上滑动滤波器，产生特征图。全局最大池化选择最强激活。拼接多个滤波器宽度的最大池化输出。送入分类器头。

为什么有效。滤波器是可学习的n-gram。最大池化是位置不变的，所以"not good"在评论开头或中间触发相同特征。三个滤波器宽度各100个滤波器给你300个学习到的n-gram检测器。训练并行；没有顺序依赖。

**RNN。** 在每个时间步 `t`，隐藏状态 `h_t = f(W * x_t + U * h_{t-1} + b)`。`W`、`U`、`b` 跨时间共享。时间 `T` 的隐藏状态是整个前缀的摘要。对于分类，在 `h_1 ... h_T` 上池化（最大、均值或最后）。

朴素RNN遭受梯度消失。**LSTM** 添加决定遗忘什么、存储什么和输出什么的门，稳定长序列的梯度。**GRU** 将LSTM简化为两个门；参数更少，性能相似。

**双向RNN** 运行一个RNN向前、另一个向后，拼接隐藏状态。每个token的表示看到左右上下文。标注任务必需。

## 构建它

### 步骤 1：PyTorch中的TextCNN

```python
import torch
import torch.nn as nn
import torch.nn.functional as F


class TextCNN(nn.Module):
    def __init__(self, vocab_size, embed_dim, n_classes, filter_widths=(2, 3, 4), n_filters=64, dropout=0.3):
        super().__init__()
        self.embed = nn.Embedding(vocab_size, embed_dim, padding_idx=0)
        self.convs = nn.ModuleList([
            nn.Conv1d(embed_dim, n_filters, kernel_size=k)
            for k in filter_widths
        ])
        self.dropout = nn.Dropout(dropout)
        self.fc = nn.Linear(n_filters * len(filter_widths), n_classes)

    def forward(self, token_ids):
        x = self.embed(token_ids).transpose(1, 2)
        pooled = []
        for conv in self.convs:
            c = F.relu(conv(x))
            p = F.max_pool1d(c, c.size(2)).squeeze(2)
            pooled.append(p)
        h = torch.cat(pooled, dim=1)
        return self.fc(self.dropout(h))
```

`transpose(1, 2)` 将 `[batch, seq_len, embed_dim]` 重塑为 `[batch, embed_dim, seq_len]`，因为 `nn.Conv1d` 将中间轴视为通道。池化输出是固定大小，无论输入长度。

### 步骤 2：LSTM分类器

```python
class LSTMClassifier(nn.Module):
    def __init__(self, vocab_size, embed_dim, hidden_dim, n_classes, bidirectional=True, dropout=0.3):
        super().__init__()
        self.embed = nn.Embedding(vocab_size, embed_dim, padding_idx=0)
        self.lstm = nn.LSTM(embed_dim, hidden_dim, batch_first=True, bidirectional=bidirectional)
        factor = 2 if bidirectional else 1
        self.dropout = nn.Dropout(dropout)
        self.fc = nn.Linear(hidden_dim * factor, n_classes)

    def forward(self, token_ids):
        x = self.embed(token_ids)
        out, _ = self.lstm(x)
        pooled = out.max(dim=1).values
        return self.fc(self.dropout(pooled))
```

在序列上最大池化，不是最后状态池化。对于分类，最大池化通常优于取最后隐藏状态，因为长序列末尾的信息往往主导最后状态。

### 步骤 3：梯度消失演示（直觉）

没有门控的朴素RNN不能学习长程依赖。考虑一个玩具任务：预测token `A` 是否出现在序列中任何位置。如果 `A` 在位置1而序列长100个token，损失梯度必须流回99个循环权重的乘法。如果权重小于1，梯度消失。如果大于1，梯度爆炸。

```python
def vanishing_gradient_sim(seq_len, recurrent_weight=0.9):
    import math
    return math.pow(recurrent_weight, seq_len)


# 权重=0.9，100步后：
#   0.9 ^ 100 ≈ 2.7e-5
# 从步骤100到步骤1的梯度实际上为零。
```

LSTM通过**细胞状态**修复了这个问题，细胞状态仅通过加性交互流过网络（遗忘门乘法缩放它，但梯度仍然沿"高速公路"流动）。GRU用更少参数做了类似的事。两者都给你100+步序列的稳定训练。

### 步骤 4：为什么这仍然不够

即使有LSTM，三个问题持续存在。

1. **顺序瓶颈。** 在长度1000的序列上训练RNN需要1000个串行前向/反向步骤。不能跨时间并行。
2. **编码器-解码器设置中的固定大小上下文向量。** 解码器只看到编码器的最终隐藏状态，压缩了整个输入。长输入丢失细节。课程09直接覆盖这个。
3. **远距离依赖准确率天花板。** LSTM优于朴素RNN但仍然难以跨200+步传播特定信息。

注意力解决了所有三个。Transformer完全放弃了循环。课程10是转折点。

## 使用它

PyTorch的 `nn.LSTM`、`nn.GRU` 和 `nn.Conv1d` 是生产就绪的。训练代码是标准的。

Hugging Face提供可插入输入层的预训练嵌入：

```python
from transformers import AutoModel

encoder = AutoModel.from_pretrained("bert-base-uncased")
for param in encoder.parameters():
    param.requires_grad = False


class BertCNN(nn.Module):
    def __init__(self, n_classes, filter_widths=(2, 3, 4), n_filters=64):
        super().__init__()
        self.encoder = encoder
        self.convs = nn.ModuleList([nn.Conv1d(768, n_filters, kernel_size=k) for k in filter_widths])
        self.fc = nn.Linear(n_filters * len(filter_widths), n_classes)

    def forward(self, input_ids, attention_mask):
        with torch.no_grad():
            out = self.encoder(input_ids=input_ids, attention_mask=attention_mask).last_hidden_state
        x = out.transpose(1, 2)
        pooled = [F.max_pool1d(F.relu(conv(x)), kernel_size=conv(x).size(2)).squeeze(2) for conv in self.convs]
        return self.fc(torch.cat(pooled, dim=1))
```

适合约束时使用的检查清单：

- **边缘/设备端推理。** 带GloVe嵌入的TextCNN比Transformer小10-100倍。如果部署目标是手机，这是你的技术栈。
- **流式/在线分类。** RNN一次处理一个token；Transformer需要完整序列。对于实时传入文本，LSTM仍然赢。
- **基线微型模型。** 新任务上快速迭代。CPU上5分钟训练TextCNN。
- **有限数据的序列标注。** BiLSTM-CRF（课程06）对于1k-10k标注句子仍然是生产级NER架构。

其他一切用Transformer。

## 交付它

将结果保存为 `outputs/prompt-text-encoder-picker.md`。

## 练习

1. **简单。** 在3类玩具数据集（你发明数据）上训练TextCNN。验证滤波器宽度(2, 3, 4)平均F1优于单一宽度(3)。
2. **中等。** 为LSTM分类器实现最大池化、均值池化和最后状态池化。在小型数据集上比较；记录哪个池化赢并假设原因。
3. **困难。** 构建BiLSTM-CRF NER标注器（结合课程06和本课程）。在CoNLL-2003上训练。与课程06的纯CRF基线和BERT微调比较。报告训练时间、内存和F1。

## 关键术语

| 术语     | 通俗说法     | 实际含义                                               |
| -------- | ------------ | ------------------------------------------------------ |
| TextCNN  | 文本CNN      | 词嵌入上带全局最大池化的1D卷积堆叠。Kim (2014)。       |
| RNN      | 循环网络     | 每个时间步更新隐藏状态：`h_t = f(W x_t + U h_{t-1})`。 |
| LSTM     | 门控RNN      | 添加输入/遗忘/输出门+细胞状态。长序列稳定训练。        |
| GRU      | 更简单的LSTM | 两个门而非三个。类似准确率，更少参数。                 |
| 双向     | 两个方向     | 前向+后向RNN拼接。每个token看到上下文两侧。            |
| 梯度消失 | 训练信号死亡 | 朴素RNN中重复乘以<1权重使早期步骤梯度实际为零。        |

## 延伸阅读

- [Kim, Y. (2014). Convolutional Neural Networks for Sentence Classification](https://arxiv.org/abs/1408.5882) — TextCNN论文。八页。可读。
- [Hochreiter, S. and Schmidhuber, J. (1997). Long Short-Term Memory](https://www.bioinf.jku.at/publications/older/2604.pdf) — LSTM论文。出奇地清晰。
- [Olah, C. (2015). Understanding LSTM Networks](https://colah.github.io/posts/2015-08-Understanding-LSTMs/) — 让LSTM对所有人可理解的图解。
