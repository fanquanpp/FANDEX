---
title: 扩展与分布式训练
description: '理解 LLM 训练的分布式策略，包括数据并行、模型并行、流水线并行和 ZeRO 优化'
module: llm
difficulty: advanced
tags:
  - 'distributed training'
  - 数据并行
  - 模型并行
  - ZeRO
  - FSDP
related:
  - llm/结构化输出
  - llm/开源模型架构详解
  - llm/量化
  - llm/模型上下文协议
prerequisites:
  - llm/安全护栏
---

# 扩展与分布式训练

> 训练一个 70B 参数的模型需要 140GB 的 GPU 内存仅存放权重——这还不包括梯度和优化器状态。单张 GPU 最多有 80GB。分布式训练不是可选项，而是唯一选项。

**类型：** 概念
**语言：** Python
**前置条件：** Phase 10 Lesson 04（预训练 Mini-GPT）
**预计时间：** ~60 分钟

## 学习目标

- 理解为什么 LLM 训练必须使用分布式策略
- 区分数据并行、张量并行和流水线并行
- 理解 ZeRO 优化的三个阶段
- 掌握混合精度训练（FP16/BF16）的原理和收益

## 内存分析

训练一个模型的内存需求：

| 组件       | 内存占用             | 说明                                   |
| ---------- | -------------------- | -------------------------------------- |
| 模型参数   | 2 × N bytes          | FP16 下每个参数 2 字节                 |
| 梯度       | 2 × N bytes          | 与参数同大小                           |
| 优化器状态 | 12 × N bytes         | Adam: 一阶矩 + 二阶矩 + 主权重（FP32） |
| 激活值     | 取决于批次和序列长度 | 需要用于反向传播                       |

以 7B 参数模型为例：

| 组件     | FP32 训练   | 混合精度训练 |
| -------- | ----------- | ------------ |
| 参数     | 28 GB       | 14 GB        |
| 梯度     | 28 GB       | 14 GB        |
| 优化器   | 56 GB       | 56 GB        |
| 激活值   | ~20 GB      | ~10 GB       |
| **总计** | **~132 GB** | **~94 GB**   |

单张 A100（80GB）放不下。这就是分布式训练的必要性。

## 数据并行

最简单的并行策略：每张 GPU 持有模型的完整副本，处理不同的数据批次。

```
GPU 0: 完整模型 + Batch 0
GPU 1: 完整模型 + Batch 1
GPU 2: 完整模型 + Batch 2
GPU 3: 完整模型 + Batch 3
        ↓
AllReduce: 梯度平均
        ↓
同步更新参数
```

```python
import torch.distributed as dist


def setup_distributed():
    """初始化分布式训练"""
    dist.init_process_group(backend='nccl')
    local_rank = int(os.environ['LOCAL_RANK'])
    torch.cuda.set_device(local_rank)


def train_step(model, optimizer, dataloader, local_rank):
    """数据并行训练步骤"""
    for batch in dataloader:
        batch = batch.to(f'cuda:{local_rank}')

        # 前向传播
        loss = model(batch).loss

        # 反向传播
        loss.backward()

        # 梯度 AllReduce（DDP 自动完成）
        # DistributedDataParallel 会自动同步梯度
        optimizer.step()
        optimizer.zero_grad()
```

**限制：** 每张 GPU 必须能放下完整的模型 + 优化器 + 激活值。

## ZeRO 优化

ZeRO（Zero Redundancy Optimizer）通过分片消除数据并行中的内存冗余：

| 阶段   | 分片内容                 | 单 GPU 内存       | 通信量 |
| ------ | ------------------------ | ----------------- | ------ |
| ZeRO-1 | 优化器状态               | 4× 参数 + 2× 梯度 | 1×     |
| ZeRO-2 | 优化器状态 + 梯度        | 4× 参数           | 1×     |
| ZeRO-3 | 优化器状态 + 梯度 + 参数 | 参数/N            | 1.5×   |

```python
from torch.distributed.fsdp import FullyShardedDataParallel as FSDP


def train_with_fsdp(model, dataloader):
    """使用 FSDP（PyTorch 原生 ZeRO-3）训练"""
    model = FSDP(model)

    optimizer = torch.optim.AdamW(model.parameters(), lr=1e-4)

    for batch in dataloader:
        loss = model(batch).loss
        loss.backward()
        optimizer.step()
        optimizer.zero_grad()
```

## 张量并行

将单个矩阵乘法拆分到多张 GPU 上。这是训练超大模型的核心策略。

```python
class TensorParallelLinear(nn.Module):
    """张量并行线性层（列切分）"""

    def __init__(self, in_features, out_features, tp_size=4):
        super().__init__()
        self.tp_size = tp_size
        self.tp_rank = dist.get_rank()

        # 每张 GPU 只存储 1/tp_size 的权重
        self.weight = nn.Parameter(
            torch.empty(out_features // tp_size, in_features)
        )
        self.bias = nn.Parameter(
            torch.empty(out_features // tp_size)
        )

    def forward(self, x):
        # 局部计算
        local_out = F.linear(x, self.weight, self.bias)

        # All-Gather 收集所有 GPU 的结果
        gathered = [torch.zeros_like(local_out) for _ in range(self.tp_size)]
        dist.all_gather(gathered, local_out)

        return torch.cat(gathered, dim=-1)
```

## 流水线并行

将模型的不同层分配到不同 GPU 上，形成流水线。

```
GPU 0: Layer 0-5   → 中间激活 → GPU 1
GPU 1: Layer 6-11  → 中间激活 → GPU 2
GPU 2: Layer 12-17 → 中间激活 → GPU 3
GPU 3: Layer 18-23 → 输出
```

流水线并行的挑战是气泡（bubble）——某些 GPU 在等待时处于空闲状态。微批次（micro-batch）调度可以减少气泡。

## 混合精度训练

使用 FP16/BF16 进行前向和反向传播，FP32 维护主权重：

```python
from torch.cuda.amp import autocast, GradScaler


def train_mixed_precision(model, dataloader):
    """混合精度训练"""
    optimizer = torch.optim.AdamW(model.parameters(), lr=1e-4)
    scaler = GradScaler()  # FP16 损失缩放

    for batch in dataloader:
        optimizer.zero_grad()

        with autocast(dtype=torch.bfloat16):
            loss = model(batch).loss

        scaler.scale(loss).backward()
        scaler.step(optimizer)
        scaler.update()
```

BF16 vs FP16：

| 特性     | FP16               | BF16         |
| -------- | ------------------ | ------------ |
| 指数位   | 5 位               | 8 位         |
| 尾数位   | 10 位              | 7 位         |
| 数值范围 | 与 FP32 相同       | 与 FP32 相同 |
| 精度     | 更高               | 更低         |
| 溢出风险 | 高（需要损失缩放） | 低           |
| 硬件要求 | Volta+             | Ampere+      |

## 关键术语

| 术语       | 通俗说法             | 实际含义                                             |
| ---------- | -------------------- | ---------------------------------------------------- |
| 数据并行   | "多卡同时算不同数据" | 每张 GPU 持有完整模型副本，处理不同数据批次          |
| 张量并行   | "把矩阵切开算"       | 将单个矩阵乘法拆分到多张 GPU 上并行计算              |
| 流水线并行 | "把层切开"           | 将模型的不同层分配到不同 GPU 上                      |
| ZeRO       | "零冗余优化"         | 通过分片优化器状态、梯度、参数消除数据并行的内存冗余 |
| 混合精度   | "半精度训练"         | 使用 FP16/BF16 计算前向和反向传播，FP32 维护主权重   |

## 延伸阅读

- [Rajbhandari et al., 2020 -- "ZeRO: Memory Optimizations Toward Training Trillion Parameter Models"](https://arxiv.org/abs/1910.02054) -- ZeRO 优化的原始论文
- [Shoeybi et al., 2019 -- "Megatron-LM: Training Multi-Billion Parameter Language Models"](https://arxiv.org/abs/1909.08053) -- 张量并行训练的原始论文
- [Huang et al., 2019 -- "GPipe: Efficient Training of Giant Neural Networks using Pipeline Parallelism"](https://arxiv.org/abs/1811.06965) -- 流水线并行的原始论文
- [DeepSpeed 文档](https://www.deepspeed.ai/) -- 微软的分布式训练框架
