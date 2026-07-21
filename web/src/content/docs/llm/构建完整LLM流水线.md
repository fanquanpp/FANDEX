---
title: 构建完整LLM流水线
description: '将分词、预训练、SFT、对齐和评估整合为完整的 LLM 训练流水线'
module: llm
difficulty: advanced
tags:
  - pipeline
  - 训练流水线
  - 端到端
  - LLM工程
related:
  - llm/高级RAG
  - llm/构建分词器
  - llm/函数调用
  - llm/缓存与成本
prerequisites:
  - llm/安全护栏
---

# 构建完整LLM流水线

> 前面的课程分别讲了分词、预训练、微调、对齐和评估。现在把它们串起来——从原始数据到可用模型的完整流水线。

**类型：** 构建
**语言：** Python
**前置条件：** Phase 10 Lesson 01-10
**预计时间：** ~90 分钟

## 学习目标

- 设计端到端的 LLM 训练流水线
- 理解每个阶段的输入、输出和验收标准
- 掌握训练日志、检查点和实验管理
- 理解从零训练 vs 微调的决策框架

## 完整流水线

```
1. 数据准备
   原始数据 → 清洗 → 去重 → 质量过滤 → 训练数据

2. 分词器训练
   训练数据 → BPE/Unigram 训练 → 分词器

3. 预训练
   训练数据 + 分词器 → 预训练模型（基座模型）

4. SFT
   指令数据 + 基座模型 → SFT 模型

5. 对齐
   偏好数据 + SFT 模型 → 对齐模型（RLHF/DPO）

6. 评估
   对齐模型 → 基准测试 → 评估报告

7. 部署
   对齐模型 → 量化 → 推理服务
```

## 实验管理

```python
import json
import time
from pathlib import Path
from dataclasses import dataclass, asdict


@dataclass
class ExperimentConfig:
    name: str
    stage: str  # pretrain, sft, dpo
    model_name: str
    learning_rate: float
    batch_size: int
    epochs: int
    seq_len: int
    vocab_size: int
    d_model: int
    n_heads: int
    n_layers: int


class ExperimentTracker:
    """实验追踪器"""

    def __init__(self, config: ExperimentConfig, log_dir="experiments"):
        self.config = config
        self.log_dir = Path(log_dir) / config.name
        self.log_dir.mkdir(parents=True, exist_ok=True)
        self.metrics = []

        # 保存配置
        with open(self.log_dir / "config.json", 'w') as f:
            json.dump(asdict(config), f, indent=2)

    def log(self, step, metrics: dict):
        """记录训练指标"""
        entry = {"step": step, "timestamp": time.time(), **metrics}
        self.metrics.append(entry)

        # 追加写入日志
        with open(self.log_dir / "metrics.jsonl", 'a') as f:
            f.write(json.dumps(entry) + '\n')

    def save_checkpoint(self, model, step, is_best=False):
        """保存检查点"""
        ckpt_path = self.log_dir / f"checkpoint-{step}.pt"
        torch.save({
            'step': step,
            'model_state_dict': model.state_dict(),
            'config': asdict(self.config),
        }, ckpt_path)

        if is_best:
            best_path = self.log_dir / "best_model.pt"
            torch.save(model.state_dict(), best_path)
```

## 从零训练 vs 微调决策

| 场景                   | 选择                      | 原因                         |
| ---------------------- | ------------------------- | ---------------------------- |
| 通用对话模型           | 微调开源模型              | 训练成本太低，不值得从零开始 |
| 特定领域（医疗、法律） | 微调 + 领域数据继续预训练 | 需要领域知识但基础能力可复用 |
| 新语言                 | 从零训练                  | 现有模型对新语言支持差       |
| 研究/教学              | 从零训练小模型            | 理解完整流程                 |

## 关键术语

| 术语         | 通俗说法   | 实际含义                               |
| ------------ | ---------- | -------------------------------------- |
| 端到端流水线 | "全流程"   | 从原始数据到可用模型的完整训练链       |
| 实验管理     | "实验记录" | 追踪训练配置、指标和检查点的系统       |
| 检查点       | "存档"     | 训练过程中保存的模型快照，用于恢复训练 |

## 延伸阅读

- [MosaicML -- LLM Training Playbook](https://www.mosaicml.com/llm-training-playbook) -- LLM 训练最佳实践
- [Hugging Face -- Training LLMs](https://huggingface.co/docs/transformers/main/en/training) -- Hugging Face 训练文档
