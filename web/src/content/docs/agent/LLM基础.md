---
order: 2
title: 'LLM 基础'
module: agent
category: 'AI Agent'
difficulty: beginner
description: '大语言模型原理、Transformer 架构、Tokenization、Prompt Engineering 及模型选择。'
author: fanquanpp
updated: '2026-06-14'
related:
  - agent/概述与架构
  - agent/Agent框架
  - 'agent/工具使用与Function Calling'
prerequisites: []
---

## 1. 大语言模型原理

### 1.1 什么是大语言模型

大语言模型（Large Language Model, LLM）是基于 Transformer 架构、在海量文本数据上训练的深度学习模型，能够理解和生成自然语言。其核心能力来自**下一个 token 预测**：

```
输入: "今天天气很"
预测: "好" (P=0.65) | "差" (P=0.15) | "热" (P=0.12) | ...
```

### 1.2 训练流程

| 阶段         | 目标         | 数据规模      | 方法                       |
| :----------- | :----------- | :------------ | :------------------------- |
| **预训练**   | 学习语言知识 | TB 级文本     | 自回归（预测下一个 token） |
| **SFT**      | 学习对话格式 | 万级指令对    | 监督微调                   |
| **RLHF**     | 对齐人类偏好 | 人类反馈数据  | PPO / DPO                  |
| **推理优化** | 提升推理能力 | 数学/代码数据 | GRPO / RLOO                |

### 1.3 涌现能力

当模型参数量超过一定阈值时，会涌现出小模型不具备的能力：

- **上下文学习（ICL）**：通过示例学习新任务
- **思维链（CoT）**：逐步推理解决复杂问题
- **指令遵循**：理解并执行复杂指令

## 2. Transformer 架构

### 2.1 核心机制

Transformer 的核心是**自注意力机制（Self-Attention）**：

```python
import torch
import torch.nn.functional as F
import math

def self_attention(Q, K, V, mask=None):
    """
    缩放点积注意力
    Q: (batch, seq_len, d_k)
    K: (batch, seq_len, d_k)
    V: (batch, seq_len, d_v)
    """
    d_k = Q.size(-1)
    # 计算注意力分数
    scores = torch.matmul(Q, K.transpose(-2, -1)) / math.sqrt(d_k)

    if mask is not None:
        scores = scores.masked_fill(mask == 0, -1e9)

    # Softmax 归一化
    attention_weights = F.softmax(scores, dim=-1)

    # 加权求和
    output = torch.matmul(attention_weights, V)
    return output, attention_weights
```

### 2.2 多头注意力

```python
class MultiHeadAttention(torch.nn.Module):
    def __init__(self, d_model, n_heads):
        super().__init__()
        self.d_k = d_model // n_heads
        self.n_heads = n_heads
        self.W_q = torch.nn.Linear(d_model, d_model)
        self.W_k = torch.nn.Linear(d_model, d_model)
        self.W_v = torch.nn.Linear(d_model, d_model)
        self.W_o = torch.nn.Linear(d_model, d_model)

    def forward(self, x, mask=None):
        batch_size = x.size(0)
        # 线性投影并分头
        Q = self.W_q(x).view(batch_size, -1, self.n_heads, self.d_k).transpose(1, 2)
        K = self.W_k(x).view(batch_size, -1, self.n_heads, self.d_k).transpose(1, 2)
        V = self.W_v(x).view(batch_size, -1, self.n_heads, self.d_k).transpose(1, 2)
        # 注意力计算
        attn_output, _ = self_attention(Q, K, V, mask)
        # 合并头
        attn_output = attn_output.transpose(1, 2).contiguous().view(batch_size, -1, self.n_heads * self.d_k)
        return self.W_o(attn_output)
```

### 2.3 Transformer 架构对比

| 架构                | 代表模型 | 特点               | 适用场景       |
| :------------------ | :------- | :----------------- | :------------- |
| **Encoder-Only**    | BERT     | 双向注意力         | 文本理解、分类 |
| **Decoder-Only**    | GPT 系列 | 单向（因果）注意力 | 文本生成、对话 |
| **Encoder-Decoder** | T5、BART | 编码+解码          | 翻译、摘要     |

当前主流 LLM（GPT-4、Claude、LLaMA）均采用 **Decoder-Only** 架构。

## 3. Tokenization

### 3.1 分词方法

| 方法              | 原理           | 优点                   | 缺点               |
| :---------------- | :------------- | :--------------------- | :----------------- |
| **Word-level**    | 按词切分       | 直观                   | OOV 问题、词表过大 |
| **Char-level**    | 按字符切分     | 无 OOV                 | 序列过长、语义弱   |
| **BPE**           | 合并高频字符对 | 平衡词表大小和序列长度 | 可能切分不合理     |
| **WordPiece**     | 基于似然的合并 | 语义更合理             | 计算成本高         |
| **SentencePiece** | 语言无关的分词 | 支持多语言             | 需要训练           |

### 3.2 BPE 分词示例

```python
from tiktoken import encoding_for_model

# 使用 GPT-4 的分词器
enc = encoding_for_model("gpt-4")

text = "Hello, AI Agent!"
tokens = enc.encode(text)
decoded = enc.decode(tokens)

print(f"原文: {text}")
print(f"Token IDs: {tokens}")
print(f"Token 数量: {len(tokens)}")
print(f"解码: {decoded}")

# 中文分词
cn_text = "人工智能代理"
cn_tokens = enc.encode(cn_text)
print(f"中文 Token 数量: {len(cn_tokens)}")  # 中文通常 1-2 字符/token
```

### 3.3 Token 计费与上下文窗口

| 模型              | 上下文窗口 | 输入价格        | 输出价格      |
| :---------------- | :--------- | :-------------- | :------------ |
| GPT-4o            | 128K       | $2.5/1M tokens  | $10/1M tokens |
| Claude 3.5 Sonnet | 200K       | $3/1M tokens    | $15/1M tokens |
| Gemini 1.5 Pro    | 2M         | $1.25/1M tokens | $5/1M tokens  |
| DeepSeek V3       | 128K       | ¥1/1M tokens    | ¥2/1M tokens  |

## 4. Prompt Engineering

### 4.1 基础技巧

```python
# 1. 系统提示词（System Prompt）
system_prompt = """你是一个专业的 Python 开发专家。
请遵循以下规则：
1. 代码必须包含类型注解
2. 添加详细的 docstring
3. 遵循 PEP 8 规范
4. 优先使用标准库
"""

# 2. 角色设定
role_prompt = """你是一位拥有 10 年经验的 DevOps 工程师，
擅长 Kubernetes、Docker 和 CI/CD 流水线设计。
请用简洁专业的语言回答问题。"""
```

### 4.2 Few-shot Learning

```python
few_shot_prompt = """请根据示例完成情感分类：

示例1:
输入: 这个产品太棒了，我非常喜欢！
输出: 正面

示例2:
输入: 质量很差，完全不推荐购买。
输出: 负面

示例3:
输入: 还可以吧，没什么特别的。
输出: 中性

请分类:
输入: {user_input}
输出:"""
```

### 4.3 Chain-of-Thought（思维链）

```python
# Zero-shot CoT
cot_prompt = """请逐步思考以下问题：

问题: 一个商店有 23 个苹果，卖了 15 个，又进货了 8 个，现在有多少个苹果？

请一步步推理："""

# 输出示例:
# 首先，商店有 23 个苹果
# 卖了 15 个后: 23 - 15 = 8 个
# 又进货了 8 个: 8 + 8 = 16 个
# 答案: 16 个苹果
```

### 4.4 Tree-of-Thought（思维树）

```python
tot_prompt = """你是一个问题解决专家。请使用思维树方法解决问题：

1. 生成 3 个不同的初始思路
2. 对每个思路评估可行性（1-10分）
3. 选择最优思路深入展开
4. 如果遇到困难，回溯到其他思路

问题: {problem}

请按以下格式输出：
思路1: [描述] | 可行性: [分数]
思路2: [描述] | 可行性: [分数]
思路3: [描述] | 可行性: [分数]

最优思路深入: ..."""
```

### 4.5 Prompt 模式对比

| 模式                 | 适用场景     | Token 消耗 | 准确性 |
| :------------------- | :----------- | :--------- | :----- |
| **Zero-shot**        | 简单任务     | 低         | 一般   |
| **Few-shot**         | 格式化输出   | 中         | 较好   |
| **CoT**              | 推理任务     | 高         | 好     |
| **ToT**              | 复杂规划     | 很高       | 最好   |
| **Self-Consistency** | 需要高可靠性 | 很高       | 很好   |

## 5. 模型选择

### 5.1 商业模型

| 模型           | 提供商    | 优势                     | 劣势                   |
| :------------- | :-------- | :----------------------- | :--------------------- |
| **GPT-4o**     | OpenAI    | 综合能力最强、生态完善   | 价格较高、国内访问受限 |
| **Claude 3.5** | Anthropic | 长文本处理、安全性好     | 知识截止较早           |
| **Gemini 1.5** | Google    | 超长上下文（2M）、多模态 | 推理能力略弱           |
| **文心一言**   | 百度      | 中文优化、国内合规       | 代码能力较弱           |
| **通义千问**   | 阿里      | 中文好、工具调用强       | 国际化不足             |

### 5.2 开源模型

| 模型            | 参数量      | 特点                 | 许可证        |
| :-------------- | :---------- | :------------------- | :------------ |
| **LLaMA 3**     | 8B/70B/405B | Meta 开源、性能优秀  | LLaMA License |
| **Qwen2.5**     | 7B/72B      | 中文优秀、工具调用强 | Apache 2.0    |
| **DeepSeek V3** | 671B MoE    | 性价比极高、推理强   | MIT           |
| **Mistral**     | 7B/8x22B    | 效率高、欧洲合规     | Apache 2.0    |
| **Yi**          | 6B/34B      | 中文理解好           | Apache 2.0    |

### 5.3 选型建议

```python
# 模型选择决策树
def select_model(task_type, budget, latency_req, privacy_req):
    if privacy_req == "strict":
        # 数据隐私要求高，使用本地开源模型
        if task_type in ["coding", "math"]:
            return "DeepSeek-Coder-V2 (本地部署)"
        return "Qwen2.5-72B (本地部署)"

    if budget == "low":
        if task_type == "coding":
            return "DeepSeek V3 (API)"
        return "GPT-4o-mini"

    if latency_req == "low":
        return "GPT-4o-mini / Claude Haiku"

    # 高质量需求
    if task_type == "reasoning":
        return "o1 / DeepSeek-R1"
    if task_type == "long_context":
        return "Gemini 1.5 Pro / Claude 3.5"
    return "GPT-4o / Claude 3.5 Sonnet"
```

## 6. LLM API 使用

### 6.1 OpenAI API

```python
from openai import OpenAI

client = OpenAI()

# 基础对话
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {"role": "system", "content": "你是一个有帮助的助手。"},
        {"role": "user", "content": "解释什么是 AI Agent"}
    ],
    temperature=0.7,      # 创造性 (0-2)
    max_tokens=1000,      # 最大输出长度
    top_p=0.9,            # 核采样
    frequency_penalty=0,  # 频率惩罚
    presence_penalty=0    # 存在惩罚
)

print(response.choices[0].message.content)
print(f"Token 用量: {response.usage}")
```

### 6.2 流式输出

```python
# 流式响应
stream = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "写一首关于AI的诗"}],
    stream=True
)

for chunk in stream:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="", flush=True)
```

### 6.3 参数调优

| 参数                | 范围 | 作用         | 推荐值               |
| :------------------ | :--- | :----------- | :------------------- |
| `temperature`       | 0-2  | 控制随机性   | 代码:0, 创意:0.7-1.0 |
| `top_p`             | 0-1  | 核采样阈值   | 0.9                  |
| `max_tokens`        | -    | 最大输出长度 | 按需设置             |
| `frequency_penalty` | -2-2 | 惩罚重复内容 | 0-0.5                |
| `presence_penalty`  | -2-2 | 鼓励新话题   | 0-0.5                |

## 7. 小结

LLM 是 AI Agent 的核心引擎，理解其原理有助于更好地设计和优化 Agent 系统。关键要点：

1. **Transformer 架构**是 LLM 的基础，自注意力机制是其核心
2. **Tokenization** 直接影响成本和性能，中文 token 消耗通常是英文的 2-3 倍
3. **Prompt Engineering** 是发挥 LLM 能力的关键技能，CoT/ToT 可显著提升推理能力
4. **模型选择**需综合考虑任务类型、预算、延迟和隐私需求
5. 开源模型（DeepSeek、Qwen）的快速进步为 Agent 开发提供了更多选择
