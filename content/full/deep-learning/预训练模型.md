---
order: 17
title: 预训练模型
module: 'deep-learning'
category: data
difficulty: advanced
description: BERT、GPT、LLaMA架构、预训练策略与微调技术。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'deep-learning/Transformer架构'
  - 'deep-learning/生成模型'
  - 'deep-learning/PyTorch框架'
  - 'deep-learning/TensorFlow框架'
prerequisites: []
---

## 1. 预训练范式

### 1.1 预训练-微调

```
大规模无标注数据 → 预训练 → 通用语言表示
                              │
小规模标注数据 → 微调 → 下游任务
```

### 1.2 预训练任务

| 任务                | 说明                   | 代表模型 |
| :------------------ | :--------------------- | :------- |
| MLM（掩码语言模型） | 随机遮盖15%token预测   | BERT     |
| CLM（因果语言模型） | 自回归预测下一个token  | GPT      |
| NSP（下一句预测）   | 判断两句话是否相邻     | BERT     |
| SOP（句子顺序预测） | 判断两句话顺序是否正确 | ALBERT   |
| 去噪自编码          | 重建被破坏的输入       | BART、T5 |

## 2. BERT

### 2.1 架构

BERT 基于 **Transformer编码器**：

| 模型       | 层数 | 隐藏维度 | 注意力头 | 参数量 |
| :--------- | :--- | :------- | :------- | :----- |
| BERT-Base  | 12   | 768      | 12       | 110M   |
| BERT-Large | 24   | 1024     | 16       | 340M   |

### 2.2 输入表示

```
[CLS] Token1 Token2 ... TokenN [SEP]

输入嵌入 = Token Embedding + Segment Embedding + Position Embedding
```

- `[CLS]`：分类token，其输出用于下游分类
- `[SEP]`：句子分隔符
- Segment Embedding：区分句子A和句子B

### 2.3 预训练任务

**MLM**：随机遮盖15%的token，预测被遮盖的词

- 80%替换为`[MASK]`
- 10%替换为随机词
- 10%保持不变

**NSP**：判断句子B是否是句子A的下一句

### 2.4 微调方式

```
分类: [CLS]输出 → 全连接层 → 类别概率
NER:  每个token输出 → 全连接层 → 标签
QA:   起始/结束位置预测
```

## 3. GPT系列

### 3.1 GPT架构

GPT 基于 **Transformer解码器**（移除交叉注意力）：

$$P(\mathbf{x}) = \prod_{t=1}^{T} P(x_t | x_1, x_2, \ldots, x_{t-1})$$

| 模型  | 层数 | 隐藏维度 | 参数量     |
| :---- | :--- | :------- | :--------- |
| GPT-1 | 12   | 768      | 117M       |
| GPT-2 | 48   | 1600     | 1.5B       |
| GPT-3 | 96   | 12288    | 175B       |
| GPT-4 | —    | —        | ~1.8T(MoE) |

### 3.2 In-Context Learning

GPT-3 引入**上下文学习**，无需微调：

```
输入: [示例1] [示例2] [示例3] [查询]
输出: 直接生成答案
```

### 3.3 对齐技术

**RLHF（基于人类反馈的强化学习）**：

```
1. SFT: 监督微调
2. RM: 训练奖励模型
3. PPO: 用奖励模型指导策略优化
```

**DPO（直接偏好优化）**：

$$\mathcal{L}_{DPO} = -\mathbb{E}\left[\log \sigma\left(\beta \log \frac{\pi_\theta(y_w|x)}{\pi_{ref}(y_w|x)} - \beta \log \frac{\pi_\theta(y_l|x)}{\pi_{ref}(y_l|x)}\right)\right]$$

## 4. LLaMA

### 4.1 架构改进

| 改进         | 说明                                                                    |
| :----------- | :---------------------------------------------------------------------- |
| Pre-RMSNorm  | RMSNorm替代LayerNorm                                                    |
| SwiGLU激活   | 替代ReLU的FFN                                                           |
| RoPE位置编码 | 旋转位置编码                                                            |
| GQA          | 分组查询注意力                                                          |
| SwiGLU FFN   | $\text{SwiGLU}(x) = (x \odot \text{Swish}(\mathbf{W}_1 x))\mathbf{W}_2$ |

### 4.2 模型规格

| 模型       | 层数 | 维度  | 头数 | 参数量 |
| :--------- | :--- | :---- | :--- | :----- |
| LLaMA-7B   | 32   | 4096  | 32   | 7B     |
| LLaMA-13B  | 40   | 5120  | 40   | 13B    |
| LLaMA-70B  | 80   | 8192  | 64   | 70B    |
| LLaMA-405B | 126  | 16384 | 128  | 405B   |

## 5. 微调技术

### 5.1 参数高效微调（PEFT）

| 方法          | 可训练参数 | 原理                         |
| :------------ | :--------- | :--------------------------- |
| LoRA          | ~0.1%      | 低秩矩阵分解 $\Delta W = AB$ |
| QLoRA         | ~0.1%      | 量化+LoRA                    |
| Adapter       | ~2%        | 插入适配器模块               |
| Prefix-Tuning | ~0.1%      | 学习前缀向量                 |
| Prompt Tuning | ~0.01%     | 学习软提示                   |

**LoRA**：

$$\mathbf{h} = \mathbf{W}_0\mathbf{x} + \Delta\mathbf{W}\mathbf{x} = \mathbf{W}_0\mathbf{x} + \mathbf{B}\mathbf{A}\mathbf{x}$$

其中 $\mathbf{B} \in \mathbb{R}^{d \times r}$，$\mathbf{A} \in \mathbb{R}^{r \times k}$，$r \ll \min(d, k)$。

### 5.2 量化

| 方法 | 精度  | 内存节省 | 精度损失 |
| :--- | :---- | :------- | :------- |
| FP16 | 16bit | 50%      | 极小     |
| INT8 | 8bit  | 75%      | 小       |
| INT4 | 4bit  | 87.5%    | 中       |
| GPTQ | 4bit  | 87.5%    | 小       |
| AWQ  | 4bit  | 87.5%    | 小       |

### 5.3 推理优化

| 技术                 | 加速比 | 说明                  |
| :------------------- | :----- | :-------------------- |
| KV Cache             | 2~10x  | 缓存已计算的Key/Value |
| Flash Attention      | 2~4x   | IO感知的注意力计算    |
| vLLM                 | 2~5x   | PagedAttention        |
| Speculative Decoding | 2~3x   | 小模型草拟+大模型验证 |
| Continuous Batching  | 2~5x   | 动态批处理            |
