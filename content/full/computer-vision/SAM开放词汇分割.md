---
title: SAM开放词汇分割
description: '给模型一个文本提示和一张图像，获取每个匹配物体的掩码。SAM 3将此变为单次前向传播。'
module: 'computer-vision'
difficulty: intermediate
tags:
  - SAM
  - 开放词汇分割
  - 文本提示分割
  - SAM3
  - 实例分割
related:
  - 'computer-vision/DiffusionTransformer'
  - 'computer-vision/OCR与文档理解'
  - 'computer-vision/StableDiffusion'
prerequisites:
  - 'computer-vision/3D高斯泼溅'
---

# SAM开放词汇分割

> 给模型一个文本提示和一张图像，获取每个匹配物体的掩码。SAM 3将此变为单次前向传播。

**类型:** 使用+构建
**语言:** Python
**前置知识:** Phase 4 Lesson 07 (U-Net), Phase 4 Lesson 08 (Mask R-CNN), Phase 4 Lesson 18 (CLIP)
**时间:** 约60分钟

## 学习目标

- 区分SAM（仅视觉提示）、Grounded SAM / SAM 2（检测器+SAM）和SAM 3（原生文本提示）
- 解释SAM 3架构：共享骨干+图像检测器+基于记忆的视频跟踪器+存在性头+解耦检测器-跟踪器设计
- 使用HuggingFace transformers SAM 3集成进行文本提示检测、分割和视频跟踪
- 根据延迟、概念复杂度和部署目标在SAM 3、Grounded SAM 2、YOLO-World和SAM-MI之间选择

## 问题所在

2023年的SAM是仅视觉提示的模型：你点击一个点或画一个框，它返回一个掩码。对于"给我这张照片中所有的橘子"，你需要一个检测器（Grounding DINO）产生框，然后SAM分割每一个。Grounded SAM将此变成管线，但它是两个冻结模型的级联，不可避免地有误差累积。

SAM 3（Meta，2025年11月，ICLR 2026）折叠了级联。它接受短名词短语或图像样本作为提示，在单次前向传播中返回所有匹配的掩码和实例ID。这就是**可提示概念分割（PCS）**。结合2026年3月的Object Multiplex更新（SAM 3.1），它高效地跟踪视频中同一概念的多个实例。

## 核心概念

### 三代演进

- **SAM (2023)** — 图像+点/框提示 -> ViT编码器 -> 掩码解码器 -> 该提示的掩码
- **Grounded SAM 2 (2024)** — 文本 -> Grounding DINO -> 框 -> SAM 2 -> 掩码+跟踪
- **SAM 3 (2025)** — 文本或图像样本 -> 共享骨干 -> 图像检测器+记忆跟踪器+存在性头 -> 所有匹配掩码+实例ID

### 可提示概念分割

"概念提示"是短名词短语（"黄色校车"、"条纹红伞"、"手持杯子"）或图像样本。模型返回图像中匹配该概念的所有实例的分割掩码，加上每个匹配的唯一实例ID。

与经典视觉提示SAM的三个区别：

1. 无需逐实例提示——一个文本提示返回所有匹配
2. 开放词汇——概念可以是自然语言可描述的任何东西
3. 一次返回多个实例而非每个提示一个掩码

### 关键架构组件

- **共享骨干** — 单个ViT处理图像。检测器头和基于记忆的跟踪器都从中读取
- **存在性头** — 预测概念是否存在于图像中。将"这是否在这里？"与"它在哪里？"解耦。减少不存在概念上的假阳性
- **解耦检测器-跟踪器** — 图像级检测和视频级跟踪有独立头，互不干扰
- **记忆库** — 跨帧存储每实例特征用于视频跟踪

### SAM 3.1 Object Multiplex

2026年3月更新：**Object Multiplex**引入共享记忆机制，同时联合跟踪同一概念的多个实例。之前，跟踪N个实例意味着N个独立记忆库。Multiplex将它们折叠为一个带每实例查询的共享记忆。结果：大幅加速多物体跟踪而不牺牲准确率。

## 构建它

### 步骤1：提示构建

```python
def split_concepts(sentence):
    for sep in [",", ";", "and", "or", "&"]:
        if sep in sentence:
            parts = [p.strip() for p in sentence.replace("and ", ",").split(",")]
            return [p for p in parts if p]
    return [sentence.strip()]

print(split_concepts("cats, dogs and balloons"))
```

### 步骤2：后处理辅助

```python
from dataclasses import dataclass
from typing import List

@dataclass
class ConceptDetection:
    concept: str
    instance_id: int
    box: tuple
    score: float
    mask_rle: str

def rle_encode(binary_mask):
    flat = binary_mask.flatten().astype("uint8")
    runs = []
    prev, count = flat[0], 0
    for v in flat:
        if v == prev:
            count += 1
        else:
            runs.append((int(prev), count))
            prev, count = v, 1
    runs.append((int(prev), count))
    return ";".join(f"{v}x{c}" for v, c in runs)
```

### 步骤3：统一开放词汇分割接口

```python
from abc import ABC, abstractmethod
import numpy as np

class OpenVocabSeg(ABC):
    @abstractmethod
    def detect(self, image: np.ndarray, concept: str) -> List[ConceptDetection]:
        ...

class StubOpenVocabSeg(OpenVocabSeg):
    def detect(self, image, concept):
        h, w = image.shape[:2]
        return [
            ConceptDetection(concept=concept, instance_id=0,
                box=(w*0.2, h*0.3, w*0.5, h*0.8), score=0.89, mask_rle="0x100;1x50;0x200"),
            ConceptDetection(concept=concept, instance_id=1,
                box=(w*0.55, h*0.25, w*0.85, h*0.75), score=0.74, mask_rle="0x80;1x40;0x220"),
        ]
```

## 使用它

```python
from transformers import Sam3Processor, Sam3Model
import torch

processor = Sam3Processor.from_pretrained("facebook/sam3")
model = Sam3Model.from_pretrained("facebook/sam3").eval()

inputs = processor(images=pil_image, return_tensors="pt")
inputs = processor.set_text_prompt(inputs, "yellow school bus")

with torch.no_grad():
    outputs = model(**inputs)
```

## 发布它

本课产出：

- `outputs/prompt-open-vocab-stack-picker.md` — 根据延迟、概念复杂度和许可证选择SAM 3/Grounded SAM 2/YOLO-World/SAM-MI。
- `outputs/skill-concept-prompt-designer.md` — 将用户话语转换为格式良好的SAM 3概念提示。

## 练习

1. **(简单)** 用SAM 3在10张图像上运行概念提示。与SAM 2+Grounding DINO 1.5比较。
2. **(中等)** 构建点击包含/排除UI：文本提示返回候选实例；用户点击保留哪些为正。
3. **(困难)** 在自定义概念集上微调SAM 3，比较零样本SAM 3的掩码IoU提升。

## 关键术语

| 术语             | 人们怎么说       | 实际含义                                                |
| ---------------- | ---------------- | ------------------------------------------------------- |
| 开放词汇分割     | "按文本分割"     | 为自然语言描述的物体生成掩码，不是固定标签集            |
| PCS              | "可提示概念分割" | SAM 3核心任务——给定名词短语或图像样本，分割所有匹配实例 |
| 概念提示         | "文本输入"       | 短名词短语或图像样本；不是完整句子                      |
| 存在性头         | "它在这里吗？"   | SAM 3模块，在定位前决定概念是否存在于图像中             |
| Object Multiplex | "SAM 3.1更新"    | 共享记忆多物体跟踪；快速联合跟踪多个实例                |

## 延伸阅读

- [SAM 3 (arXiv 2511.16719)](https://arxiv.org/abs/2511.16719)
- [SAM 3.1 Object Multiplex (Meta AI, March 2026)](https://ai.meta.com/blog/segment-anything-model-3/)
- [SAM 3 model page on Hugging Face](https://huggingface.co/facebook/sam3)
