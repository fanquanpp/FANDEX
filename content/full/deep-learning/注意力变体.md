---
title: 注意力变体
description: '完整注意力是一个圆,每个token看到每个token,内存付出代价,四种变体弯曲圆的形状并回收一半成本'
module: 'deep-learning'
difficulty: advanced
tags:
  - 滑动窗口注意力
  - 稀疏注意力
  - 差分注意力
  - 注意力变体
  - 长上下文
related:
  - 'deep-learning/优化器'
  - 'deep-learning/正则化'
  - 'deep-learning/自注意力从零实现'
  - 'deep-learning/BERT掩码语言建模'
prerequisites:
  - 'deep-learning/深度学习概述'
---

# 注意力变体 — 滑动窗口、稀疏、差分

> 完整注意力是一个圆。每个token看到每个token,内存付出代价。四种变体弯曲圆的形状并回收一半成本。

**类型:** 构建
**语言:** Python
**前置知识:** 阶段7 · 02(自注意力), 阶段7 · 03(多头), 阶段7 · 12(KV缓存/Flash Attention)
**预计时间:** ~60分钟

## 问题所在

完整注意力在序列长度上花费 `O(N^2)` 内存和 `O(N^2)` 计算。对于128K上下文的Llama 3 70B,那是每层160亿个注意力条目,乘以80层。Flash Attention(第12课)隐藏了 `O(N^2)` 激活内存但不改变算术成本——每个token仍然关注每个其他token。

三类变体改变注意力矩阵本身的拓扑:

1. **滑动窗口注意力(SWA)。** 每个token关注固定窗口的邻居,而非完整前缀。内存和计算降到 `O(N · W)`,其中 `W` 是窗口。Gemma 2/3, Mistral 7B的前几层, Phi-3-Long。
2. **稀疏/块注意力。** 只有选定的对 `(i, j)` 被评分;其余强制为零权重。Longformer, BigBird, OpenAI稀疏transformer。
3. **差分注意力。** 用单独的Q/K投影计算两个注意力图,从一个减去另一个。消除将权重泄漏到前几个token的"注意力汇聚"。微软的DIFF Transformer(2024)。

这些共存。2026年前沿模型经常混合它们:大多数层是SWA-1024,每五层是全局完整注意力,少数是清理检索的差分头。Gemma 3的5:1 SWA:全局比率是当前教科书默认。

## 核心概念

### 滑动窗口注意力(SWA)

位置 `i` 的每个查询只关注 `[i - W, i]`(因果SWA)或 `[i - W/2, i + W/2]`(双向)中的位置。窗口外的token在分数矩阵中获得 `-inf`。

```
完整因果:              滑动窗口 (W=4):
位置 0-7               位置 0-7, W=4
    0 1 2 3 4 5 6 7       0 1 2 3 4 5 6 7
0 | x                 0 |  x
1 | x x               1 |  x x
2 | x x x             2 |  x x x
3 | x x x x           3 |  x x x x
4 | x x x x x         4 |    x x x x
5 | x x x x x x       5 |      x x x x
6 | x x x x x x x     6 |        x x x x
7 | x x x x x x x x   7 |          x x x x
```

对于 `N = 8192` 和 `W = 1024`,分数矩阵预期有1024 × 8192个非零行——8倍缩减。

**KV缓存随SWA缩小。** 每层只需保留K和V的最后 `W` 个token。对于Gemma-3式配置(1024窗口, 128K上下文),KV缓存降低128倍。

**质量代价。** 仅SWA的transformer在长程检索上挣扎。修复:将SWA层与完整注意力层交错。Gemma 3使用5:1 SWA:全局。Mistral 7B使用因果SWA栈,信息通过重叠窗口"向前流动"——每层扩展有效感受野 `W`,L层后模型可以关注 `L × W` 个token回溯。

### 稀疏/块注意力

预先选择 `N × N` 稀疏模式。三种规范形状:

- **局部 + 步幅(OpenAI稀疏transformer)。** 关注最后 `W` 个token加之前每隔 `stride` 个token。以 `O(N · sqrt(N))` 计算捕获局部和长程。
- **Longformer / BigBird。** 局部窗口 + 少量全局token(如 `[CLS]`)关注所有人并被所有人关注 + 随机稀疏链接。匹配质量下2倍上下文。
- **原生稀疏注意力(DeepSeek, 2025)。** 学习哪些 `(Q, K)` 块重要;在内核级跳过零块。FlashAttention兼容。

稀疏注意力是内核工程故事。数学很简单(掩码分数矩阵);收益来自从不将零条目加载到SRAM。FlashAttention-3和2026年FlexAttention API使自定义稀疏模式在PyTorch中成为一等公民。

### 差分注意力(DIFF Transformer, 2024)

常规注意力有"注意力汇聚"问题:softmax强制每行总和为1,所以不想关注任何特定内容的token将权重倾倒到第一个token(或前几个)。这窃取了本应给真实内容的容量。

差分注意力通过计算**两个**注意力图并相减来修复:

```
A1 = softmax(Q1 K1^T / √d)
A2 = softmax(Q2 K2^T / √d)
DiffAttn = (A1 - λ · A2) V
```

其中 `λ` 是学习标量(通常0.5-0.8)。A1捕获真实内容权重;A2捕获汇聚。减法消除汇聚,将权重重新分配给相关token。

报告结果(微软2024): 5-10%更低困惑度, 1.5-2倍更长有效上下文(相同训练长度),更锐利的针在干草堆检索。

### 变体比较

| 变体                    | 计算            | KV缓存   | 质量vs完整             | 生产使用                          |
| ----------------------- | --------------- | -------- | ---------------------- | --------------------------------- |
| 完整注意力              | O(N^2)          | O(N)每层 | 基线                   | 每个模型的默认层                  |
| SWA(窗口1024)           | O(N·W)          | O(W)每层 | -0.1 ppl, 配合全局层好 | Gemma 2/3, Phi-3-Long             |
| 局部+步幅稀疏           | O(N·√N)         | 混合     | 类似SWA                | OpenAI稀疏transformer, Longformer |
| BigBird(局部+全局+随机) | O(N)近似        | 混合     | 2倍上下文匹配完整      | 早期长上下文BERT                  |
| 原生稀疏(DeepSeek-V3.2) | O(N · 活跃比例) | O(N)     | 0.05 ppl内             | DeepSeek-V3.2, 2025               |
| 差分                    | O(2·N^2)        | O(2N)    | -5到-10% ppl           | DIFF Transformer, 2026早期模型    |

## 动手构建

参见 `code/main.py`。我们实现因果掩码比较器,在玩具序列上并排显示完整、SWA、局部+步幅和差分注意力。

### 步骤1:完整因果掩码(基线)

```python
def causal_mask(n):
    return [[0.0 if j <= i else float("-inf") for j in range(n)] for i in range(n)]
```

第07课的基线。下三角;对角线上方零权重。

### 步骤2:滑动窗口因果掩码

```python
def swa_mask(n, window):
    M = [[float("-inf")] * n for _ in range(n)]
    for i in range(n):
        lo = max(0, i - window + 1)
        for j in range(lo, i + 1):
            M[i][j] = 0.0
    return M
```

一个参数——`window`。对于 `window >= n`,恢复完整因果注意力。对于 `window = 1`,每个token只关注自身。

### 步骤3:局部+步幅稀疏掩码

```python
def strided_mask(n, window, stride):
    M = [[float("-inf")] * n for _ in range(n)]
    for i in range(n):
        lo = max(0, i - window + 1)
        for j in range(lo, i + 1):
            M[i][j] = 0.0
        for j in range(0, i + 1, stride):
            M[i][j] = 0.0
    return M
```

密集局部窗口加每隔 `stride` 个token回到序列开头。感受野随额外层以对数步增长。

### 步骤4:差分注意力

```python
def diff_attention(Q1, K1, Q2, K2, V, lam):
    A1 = softmax_causal(Q1 @ K1.T / sqrt_d)
    A2 = softmax_causal(Q2 @ K2.T / sqrt_d)
    return (A1 - lam * A2) @ V
```

两次注意力传递,用学习混合系数相减。在代码中我们比较单个vs差分的注意力汇聚热力图,观察汇聚消失。

### 步骤5:KV缓存大小

打印 `N = 131072` 时每个变体每层的缓存大小。SWA和稀疏变体降低10-100倍。差分翻倍。有意识地支付你的内存账单。

## 实际应用

2026年生产模式:

```python
from transformers import AutoModelForCausalLM
# Gemma 3以5:1混合SWA(窗口=1024)和全局层。
model = AutoModelForCausalLM.from_pretrained("google/gemma-3-27b-it")
# print(model.config.sliding_window, model.config.layer_types)
```

PyTorch 2.5+中的FlexAttention接受掩码函数:

```python
from torch.nn.attention.flex_attention import flex_attention, create_block_mask

def swa_pattern(b, h, q_idx, kv_idx):
    return (q_idx - kv_idx < 1024) & (q_idx >= kv_idx)

mask = create_block_mask(swa_pattern, B=batch, H=heads, Q_LEN=n, KV_LEN=n)
out = flex_attention(q, k, v, block_mask=mask)
```

这编译为自定义Triton内核。常见模式在FlashAttention-3速度的10%以内,掩码函数是Python可调用对象。

**何时选择每个:**

- **纯完整注意力** — 每层最多约16K上下文,或检索质量至关重要时。
- **SWA + 全局混合** — 长上下文(>32K),训练和推理内存受限。2026年32K以上的默认。
- **稀疏块注意力** — 自定义内核,自定义模式。保留给专业工作负载(检索, 音频)。
- **差分注意力** — 注意力汇聚污染有害的任何工作负载(长上下文RAG, 针在干草堆)。

## 交付成果

参见 `outputs/skill-attention-variant-picker.md`。该技能根据目标上下文长度、检索需求和训练/推理计算概况为新模型选择注意力拓扑。

## 练习

1. **简单。** 运行 `code/main.py`。验证SWA在 `window=4` 时将每行最后4个token之外的所有内容归零。验证 `window=n` 位相同地重现完整因果注意力。
2. **中等。** 在第07课毕业项目上实现 `window=1024` 的因果SWA。在tinyshakespeare上训练1,000步。验证损失vs完整注意力退化多少?峰值内存下降多少?
3. **困难。** 在毕业项目模型中实现Gemma-3式5:1层混合(5 SWA, 1全局)。在匹配参数下比较纯SWA和纯全局基线的损失、内存和生成质量。
4. **困难。** 实现每头学习 `λ` 的差分注意力。在合成检索任务(一根针, 2,000个干扰项)上训练。在匹配参数下测量检索准确率vs单注意力基线。

## 关键术语

| 术语                 | 人们怎么说           | 实际含义                                                                   |
| -------------------- | -------------------- | -------------------------------------------------------------------------- |
| 滑动窗口注意力(SWA)  | "局部注意力"         | 每个查询关注其最后 `W` 个token;KV缓存缩减为 `O(W)`。                       |
| 有效感受野           | "模型能看多远"       | 在 `L` 层窗口 `W` 的SWA栈中,最多 `L × W` 个token。                         |
| Longformer / BigBird | "局部+全局+随机"     | 带少量始终关注的全局token的稀疏模式;早期长上下文方法。                     |
| 原生稀疏注意力       | "DeepSeek的内核技巧" | 学习块级稀疏;在内核级跳过零块同时保持质量。                                |
| 差分注意力           | "两个图,一个相减"    | DIFF Transformer:从第一个减去学习 `λ` 倍的第二个注意力图以消除注意力汇聚。 |
| 注意力汇聚           | "权重泄漏到token 0"  | softmax归一化强制行总和为1;无信息查询将权重倾倒到位置0。                   |
| FlexAttention        | "掩码即Python"       | PyTorch 2.5+ API,将任意掩码函数编译为FlashAttention形内核。                |
| 层类型混合           | "5:1 SWA比全局"      | 在栈中交错稀疏和完整注意力层,以在更低内存下保持质量。                      |

## 延伸阅读

- [Beltagy, Peters, Cohan (2020). Longformer: The Long-Document Transformer](https://arxiv.org/abs/2004.05150) — 规范的滑动窗口 + 全局token论文。
- [Zaheer et al. (2020). Big Bird: Transformers for Longer Sequences](https://arxiv.org/abs/2007.14062) — 局部 + 全局 + 随机。
- [Child et al. (2019). Generating Long Sequences with Sparse Transformers](https://arxiv.org/abs/1904.10509) — OpenAI的局部+步幅模式。
- [Gemma Team (2024). Gemma 2: Improving Open Language Models at a Practical Size](https://arxiv.org/abs/2408.00118) — 1:1 SWA:全局混合。
- [Gemma Team (2025). Gemma 3 technical report](https://arxiv.org/abs/2503.19786) — 5:1混合,窗口=1024,现在是教科书默认。
- [Ye et al. (2024). Differential Transformer](https://arxiv.org/abs/2410.05258) — DIFF Transformer论文。
- [Yuan et al. (2025). Native Sparse Attention](https://arxiv.org/abs/2502.11089) — DeepSeek-V3.2的学习稀疏注意力。
- [PyTorch — FlexAttention blog and docs](https://pytorch.org/blog/flexattention/) — 实际应用中掩码即可调用模式的API参考。
