---
title: 微调与LoRA
description: '理解 LoRA 和 QLoRA 微调技术，用极少参数高效适配 LLM'
module: llm
difficulty: advanced
tags:
  - LoRA
  - QLoRA
  - 'fine-tuning'
  - PEFT
  - 参数高效微调
related:
  - llm/推测解码EAGLE3
  - llm/推理优化
  - llm/异步Hogwild推理
  - 'llm/预训练Mini-GPT'
prerequisites:
  - llm/安全护栏
---

# 微调与LoRA

> 全参数微调 70B 模型需要 280GB GPU 内存。LoRA 只训练 0.1% 的参数——不到 1GB——就能达到 95% 以上的全参数微调效果。这就是参数高效微调（PEFT）的力量。

**类型：** 构建
**语言：** Python
**前置条件：** Phase 10 Lesson 06（指令微调 SFT）
**预计时间：** ~60 分钟

## 学习目标

- 理解 LoRA 的数学原理：低秩分解
- 掌握 LoRA 的关键超参数：rank、alpha、目标模块
- 理解 QLoRA 和 NF4 量化
- 实现完整的 LoRA 微调流程

## LoRA 原理

LoRA（Low-Rank Adaptation）将权重更新分解为低秩矩阵：

$$W' = W + \Delta W = W + BA$$

其中 $B \in \mathbb{R}^{d \times r}$，$A \in \mathbb{R}^{r \times k}$，$r \ll \min(d, k)$。

原始权重 $W$ 冻结不更新，只训练 $A$ 和 $B$。

```python
import torch
import torch.nn as nn


class LoRALayer(nn.Module):
    """LoRA 适配层"""

    def __init__(self, original_layer, rank=8, alpha=16):
        super().__init__()
        self.original_layer = original_layer
        self.rank = rank
        self.alpha = alpha
        self.scaling = alpha / rank

        # 获取原始层的维度
        if isinstance(original_layer, nn.Linear):
            d_out, d_in = original_layer.weight.shape
        else:
            raise ValueError("LoRA only supports Linear layers")

        # 低秩矩阵
        self.lora_A = nn.Parameter(torch.randn(d_in, rank) * 0.01)
        self.lora_B = nn.Parameter(torch.zeros(rank, d_out))

        # 冻结原始权重
        original_layer.weight.requires_grad = False
        if original_layer.bias is not None:
            original_layer.bias.requires_grad = False

    def forward(self, x):
        # 原始变换
        original_output = self.original_layer(x)

        # LoRA 增量
        lora_output = (x @ self.lora_A @ self.lora_B) * self.scaling

        return original_output + lora_output
```

## 参数量对比

| 模型      | 全参数 | LoRA (r=8) | LoRA (r=16) | 比例  |
| --------- | ------ | ---------- | ----------- | ----- |
| LLaMA-7B  | 6.7B   | 4.2M       | 8.4M        | 0.06% |
| LLaMA-13B | 13B    | 6.6M       | 13.1M       | 0.05% |
| LLaMA-70B | 70B    | 20.2M      | 40.3M       | 0.03% |

## 使用 PEFT 库

```python
from peft import LoraConfig, get_peft_model, TaskType
from transformers import AutoModelForCausalLM


def setup_lora(model_name="meta-llama/Llama-2-7b-hf", rank=8, alpha=16):
    """配置 LoRA 微调"""
    # 加载基座模型
    model = AutoModelForCausalLM.from_pretrained(
        model_name,
        torch_dtype=torch.bfloat16,
        device_map="auto",
    )

    # LoRA 配置
    lora_config = LoraConfig(
        task_type=TaskType.CAUSAL_LM,
        r=rank,
        lora_alpha=alpha,
        lora_dropout=0.05,
        target_modules=["q_proj", "v_proj", "k_proj", "o_proj",
                        "gate_proj", "up_proj", "down_proj"],
        bias="none",
    )

    # 应用 LoRA
    model = get_peft_model(model, lora_config)
    model.print_trainable_parameters()
    # 输出: trainable params: 13,107,200 || all params: 6,738,415,616 || trainable%: 0.1945

    return model
```

## QLoRA

QLoRA 在 LoRA 基础上加入 4-bit 量化，进一步降低内存：

```python
from transformers import BitsAndBytesConfig


def setup_qlora(model_name="meta-llama/Llama-2-7b-hf", rank=64, alpha=16):
    """配置 QLoRA 微调"""
    # 4-bit 量化配置
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.bfloat16,
        bnb_4bit_use_double_quant=True,
    )

    # 加载量化模型
    model = AutoModelForCausalLM.from_pretrained(
        model_name,
        quantization_config=bnb_config,
        device_map="auto",
    )

    # LoRA 配置（QLoRA 通常用更高的 rank）
    lora_config = LoraConfig(
        task_type=TaskType.CAUSAL_LM,
        r=rank,
        lora_alpha=alpha,
        target_modules=["q_proj", "v_proj", "k_proj", "o_proj",
                        "gate_proj", "up_proj", "down_proj"],
    )

    model = get_peft_model(model, lora_config)
    return model
```

## Rank 选择指南

| 任务复杂度       | 推荐 Rank | 推荐 Alpha | 说明                     |
| ---------------- | --------- | ---------- | ------------------------ |
| 简单（风格调整） | 4-8       | 8-16       | 低秩足够捕获风格变化     |
| 中等（领域适配） | 16-32     | 32-64      | 需要更多容量学习领域知识 |
| 复杂（新任务）   | 64-128    | 128-256    | 高秩提供更多表达能力     |

## 合并 LoRA 适配器

```python
def merge_lora(model):
    """将 LoRA 权重合并到基座模型"""
    model = model.merge_and_unload()
    return model

# 保存合并后的模型
model = merge_lora(model)
model.save_pretrained("merged_model")
```

## 关键术语

| 术语  | 通俗说法         | 实际含义                                              |
| ----- | ---------------- | ----------------------------------------------------- |
| LoRA  | "低秩适配"       | Low-Rank Adaptation，通过低秩矩阵分解实现参数高效微调 |
| QLoRA | "量化 LoRA"      | 在 LoRA 基础上使用 4-bit 量化进一步降低内存           |
| Rank  | "秩"             | LoRA 低秩矩阵的维度，控制可训练参数量                 |
| Alpha | "缩放因子"       | LoRA 增量的缩放系数，alpha/rank 决定实际缩放比        |
| NF4   | "4-bit 正态浮点" | NormalFloat4，QLoRA 使用的 4-bit 量化格式             |

## 延伸阅读

- [Hu et al., 2021 -- "LoRA: Low-Rank Adaptation of Large Language Models"](https://arxiv.org/abs/2106.09685) -- LoRA 原始论文
- [Dettmers et al., 2023 -- "QLoRA: Efficient Finetuning of Quantized Language Models"](https://arxiv.org/abs/2305.14314) -- QLoRA 论文
- [PEFT 文档](https://huggingface.co/docs/peft/) -- Hugging Face PEFT 库
