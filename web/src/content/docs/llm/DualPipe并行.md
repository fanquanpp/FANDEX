---
title: DualPipe并行
description: '理解 DualPipe 双向流水线并行策略，减少流水线气泡提高训练效率'
module: llm
difficulty: advanced
tags:
  - 'pipeline parallelism'
  - DualPipe
  - 流水线并行
  - 训练优化
related:
  - 'llm/DeepSeek-V3架构详解'
  - llm/DPO直接偏好优化
  - 'llm/Jamba混合SSM-Transformer'
  - llm/LangGraph状态机
prerequisites:
  - llm/安全护栏
---

# DualPipe并行

> 传统流水线并行的气泡率高达 50%。DualPipe 通过双向调度和计算-通信重叠，将气泡率降到 10% 以下。

**类型：** 概念
**前置条件：** Phase 10 Lesson 05（扩展与分布式训练）
**预计时间：** ~30 分钟

## 学习目标

- 理解传统流水线并行的气泡问题
- 掌握 DualPipe 的双向调度策略
- 理解计算-通信重叠的实现

## 传统流水线的气泡

4 级流水线，4 个微批次：

```
GPU 0: [F0] [F1] [F2] [F3] [B0] [B1] [B2] [B3]
GPU 1:       [F0] [F1] [F2] [F3] [B0] [B1] [B2] [B3]
GPU 2:             [F0] [F1] [F2] [F3] [B0] [B1] [B2] [B3]
GPU 3:                   [F0] [F1] [F2] [F3] [B0] [B1] [B2] [B3]

F = 前向传播, B = 反向传播
空白 = 气泡（GPU 空闲）
```

气泡率 ≈ (p-1) / m，其中 p 是流水线级数，m 是微批次数。

## DualPipe 核心思想

DualPipe 从流水线的两端同时输入微批次，形成双向流水线：

```
方向 1: GPU 0 → GPU 1 → GPU 2 → GPU 3
方向 2: GPU 3 → GPU 2 → GPU 1 → GPU 0
```

两个方向的计算在同一个 GPU 上交替执行，填充彼此的气泡。

## 计算-通信重叠

DualPipe 还将 All-To-All 通信与计算重叠：

```python
# 伪代码：计算-通信重叠
for micro_batch in micro_batches:
    # 启动异步通信
    comm_handle = start_all_to_all(activation)

    # 执行计算（与通信并行）
    output = compute_layer(micro_batch)

    # 等待通信完成
    wait(comm_handle)
```

## 关键术语

| 术语          | 通俗说法   | 实际含义                                 |
| ------------- | ---------- | ---------------------------------------- |
| 流水线气泡    | "空闲等待" | GPU 在等待其他 GPU 完成计算时的空闲时间  |
| 双向调度      | "两头开工" | 从流水线两端同时输入微批次，减少空闲时间 |
| 计算-通信重叠 | "边算边传" | 将通信操作与计算操作并行执行             |

## 延伸阅读

- [DeepSeek-AI, 2024 -- "DeepSeek-V3 Technical Report"](https://arxiv.org/abs/2412.19437) -- DualPipe 的原始描述
- [Huang et al., 2019 -- "GPipe: Efficient Training of Giant Neural Networks using Pipeline Parallelism"](https://arxiv.org/abs/1811.06965) -- GPipe 论文
