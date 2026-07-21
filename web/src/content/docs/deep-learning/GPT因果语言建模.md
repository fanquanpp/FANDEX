---
title: GPT因果语言建模
description: 'BERT看两侧,GPT只看过去,三角掩码是现代AI中影响最深远的单行代码'
module: 'deep-learning'
difficulty: intermediate
tags:
  - GPT
  - 因果语言建模
  - 自回归
  - 采样策略
  - 解码器
related:
  - 'deep-learning/自注意力从零实现'
  - 'deep-learning/BERT掩码语言建模'
  - 'deep-learning/JAX入门'
  - 'deep-learning/KV缓存与Flash注意力'
prerequisites:
  - 'deep-learning/深度学习概述'
---

# GPT — 因果语言建模

> BERT看两侧。GPT只看过去。三角掩码是现代AI中影响最深远的单行代码。

**类型:** 构建
**语言:** Python
**前置知识:** 阶段7 · 02(自注意力), 阶段7 · 05(完整Transformer), 阶段7 · 06(BERT)
**预计时间:** ~75分钟

## 问题所在

语言模型回答一个问题:给定前 `t-1` 个token,token `t` 的概率分布是什么?在这个信号上训练——下一token预测——你就得到一个可以一次一个token生成任意文本的模型。

要在整个序列上端到端并行训练,你需要每个位置的预测仅依赖之前的位置。否则模型会通过查看答案来作弊。

因果掩码做到了这一点。它是一个添加到softmax之前注意力分数的上三角 `-inf` 矩阵。softmax后,这些位置变为0。每个位置只能关注自身和之前的位置。因为你对整个序列应用一次,你在一次前向传播中获得N个并行的下一token预测。

GPT-1(2018), GPT-2(2019), GPT-3(2020), GPT-4(2023), GPT-5(2024), Claude, Llama, Qwen, Mistral, DeepSeek, Kimi——它们都是仅解码器因果transformer,具有相同的核心循环。只是更大、更好的数据和更好的RLHF。

## 核心概念

### 掩码

给定长度为 `N` 的序列,构建一个 `N × N` 矩阵:

```
M[i, j] = 0       if j <= i
M[i, j] = -inf    if j > i
```

在softmax之前将 `M` 加到原始注意力分数上。`exp(-inf) = 0`,所以掩码位置贡献零权重。注意力矩阵的每行是仅对之前位置的概率分布。

实现成本:一次 `torch.tril()` 调用。计算时间:纳秒。对领域的影响:一切。

### 并行训练,串行推理

训练:一次前向传播整个 `(N, d_model)` 序列,计算N个交叉熵损失(每个位置一个),求和,反向传播。沿序列并行。这就是GPT训练可扩展的原因——你在一次GPU传递中处理1M token的批次。

推理:你逐个生成token。输入 `[t1, t2, t3]`,得到 `t4`。输入 `[t1, t2, t3, t4]`,得到 `t5`。输入 `[t1, t2, t3, t4, t5]`,得到 `t6`。KV缓存(第12课)保存了 `t1...tn` 的隐藏状态,这样你不必每步重新计算。但推理时的串行深度 = 输出长度。这就是自回归税,也是解码成为每个LLM延迟瓶颈的原因。

### 损失 — 移位一

给定token `[t1, t2, t3, t4]`:

- 输入: `[t1, t2, t3]`
- 目标: `[t2, t3, t4]`

对于每个位置 `i`,计算 `-log P(target_i | inputs[:i+1])`。求和。这就是整个序列的交叉熵。

你听说过的每个transformer LM都在这个损失上训练。预训练、微调、SFT——相同的损失,不同的数据。

### 解码策略

训练后,采样选择比人们想象的更重要。

| 方法          | 做什么                           | 何时使用                    |
| ------------- | -------------------------------- | --------------------------- |
| 贪心          | 每步取argmax                     | 确定性任务,代码补全         |
| 温度          | 将logits除以T,采样               | 创意任务,更高T = 更多多样性 |
| Top-k         | 仅从top-k token采样              | 消除低概率尾部              |
| Top-p(核采样) | 从累积概率 >= p的最小集合采样    | 2020+默认;适应分布形状      |
| Min-p         | 保留 `p > min_p * max_p` 的token | 2024+;比top-p更好地拒绝长尾 |
| 推测解码      | 草稿模型提出N个token,大模型验证  | 相同质量下2-3倍延迟降低     |

2026年,min-p + 温度0.7是开源模型的合理默认。推测解码是任何生产推理栈的基本配置。

### "GPT配方"为什么有效

1. **仅解码器。** 无编码器开销。每层一次注意力 + FFN传递。
2. **扩展。** 124M → 1.5B → 175B → 万亿级。Chinchilla缩放定律(第13课)告诉你如何花费计算。
3. **上下文学习。** 在6B-13B左右出现。模型可以在不微调的情况下遵循少样本示例。
4. **RLHF。** 人类偏好的后训练将原始预训练文本转换为聊天助手。
5. **Pre-norm + RoPE + SwiGLU。** 大规模稳定训练。

自GPT-2以来核心架构没有太大变化。有趣的事情发生在数据、规模和后训练中。

## 动手构建

### 步骤1:因果掩码

参见 `code/main.py`。一行代码:

```python
def causal_mask(n):
    return [[0.0 if j <= i else float("-inf") for j in range(n)] for i in range(n)]
```

在softmax之前将其加到注意力分数上。这就是整个机制。

### 步骤2:2层类GPT模型

堆叠两个解码器块(掩码自注意力 + FFN,无交叉注意力)。添加token嵌入、位置编码和反嵌入(与token嵌入矩阵绑定——GPT-2以来的标准技巧)。

### 步骤3:下一token预测,端到端

在20个token的玩具词汇上,在每个位置产生logits。对移位一目标计算交叉熵损失。没有梯度——这是前向传播健全性检查。

### 步骤4:采样

实现贪心、温度、top-k、top-p、min-p。在固定提示上运行每个并比较输出。采样函数是10行代码。

## 实际应用

PyTorch, 2026年惯用法:

```python
from transformers import AutoModelForCausalLM, AutoTokenizer
model = AutoModelForCausalLM.from_pretrained("meta-llama/Llama-3.2-3B-Instruct")
tok = AutoTokenizer.from_pretrained("meta-llama/Llama-3.2-3B-Instruct")

prompt = "Attention is all you need because"
inputs = tok(prompt, return_tensors="pt")
out = model.generate(
    **inputs,
    max_new_tokens=64,
    temperature=0.7,
    top_p=0.9,
    do_sample=True,
)
print(tok.decode(out[0]))
```

在底层,`generate()` 运行前向传播,提取最后位置的logits,采样下一个token,追加,重复。每个生产LLM推理栈(vLLM, TensorRT-LLM, llama.cpp, Ollama, MLX)实现相同的循环,但进行了大量优化——批量预填充、连续批处理、KV缓存分页、推测解码。

**GPT vs BERT,各一句话:** GPT预测 `P(x_t | x_{<t})`。BERT预测 `P(x_masked | x_unmasked)`。损失决定了模型是否能生成。

## 交付成果

参见 `outputs/skill-sampling-tuner.md`。该技能为新生成任务选择采样参数,并标记何时需要确定性解码。

## 练习

1. **简单。** 运行 `code/main.py` 并验证因果注意力矩阵在softmax后是下三角的。抽查:第3行应该只在第0-3列有权重。
2. **中等。** 实现宽度4的束搜索。在10个短提示上比较束4 vs 贪心的困惑度。束搜索总是赢吗?(提示:通常翻译赢,开放式聊天不赢。)
3. **困难。** 实现推测解码:使用微型2层模型作为草稿,6层模型作为验证器。在100个长度64的补全上测量挂钟加速。确认输出与验证器的贪心输出匹配。

## 关键术语

| 术语          | 人们怎么说        | 实际含义                                                            |
| ------------- | ----------------- | ------------------------------------------------------------------- |
| 因果掩码      | "三角形"          | 添加到注意力分数的上三角 `-inf` 矩阵,使位置 `i` 只看到位置 `<= i`。 |
| 下一token预测 | "损失"            | 模型分布与每个位置真实下一token的交叉熵。                           |
| 自回归        | "一次生成一个"    | 将输出反馈为输入;仅在训练时并行,生成时不并行。                      |
| Logits        | "softmax前的分数" | LM头在softmax前的原始输出;采样在这些上进行。                        |
| 温度          | "创造力旋钮"      | 将logits除以T;T→0 = 贪心, T→∞ = 均匀。                              |
| Top-p         | "核采样"          | 将分布截断为总和 >= p的最小集合;从剩余部分采样。                    |
| Min-p         | "比top-p更好"     | 保留 `p >= min_p × max_p` 的token;截断阈值适应分布的尖锐程度。      |
| 推测解码      | "草稿 + 验证"     | 便宜模型提出N个token;大模型并行验证。                               |
| 教师强制      | "训练技巧"        | 训练时,喂入真实的上一个token,而非模型的预测。每个seq2seq LM的标准。 |

## 延伸阅读

- [Radford et al. (2018). Improving Language Understanding by Generative Pre-Training](https://cdn.openai.com/research-covers/language-unsupervised/language_understanding_paper.pdf) — GPT-1。
- [Radford et al. (2019). Language Models are Unsupervised Multitask Learners](https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf) — GPT-2。
- [Brown et al. (2020). Language Models are Few-Shot Learners](https://arxiv.org/abs/2005.14165) — GPT-3和上下文学习。
- [Leviathan, Kalman, Matias (2023). Fast Inference from Transformers via Speculative Decoding](https://arxiv.org/abs/2211.17192) — 推测解码论文。
- [HuggingFace `modeling_llama.py`](https://github.com/huggingface/transformers/blob/main/src/transformers/models/llama/modeling_llama.py) — 规范因果LM参考代码。
