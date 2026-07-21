---
title: 实时边缘推理
description: 边缘推理将模型从云端搬到设备上，用量化、剪枝和蒸馏在毫秒级延迟内运行视觉模型。
module: 'computer-vision'
difficulty: advanced
tags:
  - 边缘推理
  - 量化
  - 剪枝
  - 蒸馏
  - ONNX
  - TensorRT
related:
  - 'computer-vision/迁移学习'
  - 'computer-vision/实例分割MaskRCNN'
  - 'computer-vision/世界模型与视频扩散'
  - 'computer-vision/视觉管线项目'
prerequisites:
  - 'computer-vision/3D高斯泼溅'
---

# 实时边缘推理

> 边缘推理将模型从云端搬到设备上，用量化、剪枝和蒸馏在毫秒级延迟内运行视觉模型。

**类型:** 构建
**语言:** Python
**前置知识:** Phase 4 Lesson 03 (CNN), Phase 4 Lesson 14 (ViT)
**时间:** 约60分钟

## 学习目标

- 解释量化（INT8/FP16）、剪枝（结构化/非结构化）和知识蒸馏的原理和权衡
- 使用PyTorch量化将模型从FP32转换为INT8
- 使用ONNX Runtime和TensorRT优化推理速度
- 根据硬件约束（内存、功耗、延迟）选择正确的优化策略

## 问题所在

在云端运行视觉模型很容易——你有A100 GPU和无限内存。在边缘设备上运行则完全不同：手机有4-8GB共享内存，树莓派有1-4GB，无人机和AR眼镜更少。延迟要求也不同：自动驾驶需要<10ms，AR需要<16ms（60fps），实时视频需要<33ms。

一个标准的ResNet-50在FP32下需要约100MB内存和约10ms推理时间（在V100上）。在手机上，同样的模型需要200-500ms——太慢了。优化技术（量化、剪枝、蒸馏）可以将延迟降低5-10倍，将内存降低4倍，同时保持95%+的准确率。

## 核心概念

### 优化谱

```mermaid
flowchart LR
    A["FP32模型<br/>(准确率最高)"] --> B["FP16<br/>(2倍加速)"]
    B --> C["INT8量化<br/>(4倍加速)"]
    A --> D["剪枝<br/>(减少参数)"]
    D --> E["稀疏推理<br/">(2-4倍加速)"]
    A --> F["知识蒸馏<br/>(小模型学大模型)"]
    F --> G["小模型<br/>(5-10倍加速)"]

    style A fill:#fecaca,stroke:#dc2626
    style C fill:#dcfce7,stroke:#16a34a
    style G fill:#dcfce7,stroke:#16a34a
```

### 量化

将FP32权重和激活转换为低精度格式：

```
FP32: 32位浮点，范围 ±3.4e38，精度 ~7位
FP16: 16位浮点，范围 ±6.5e4，精度 ~3位
INT8: 8位整数，范围 [-128, 127]，精度 ~2位

INT8量化:
  x_int8 = round(x_fp32 / scale) + zero_point
  x_fp32 ≈ (x_int8 - zero_point) * scale
```

两种量化方式：

- **训练后量化（PTQ）** — 直接量化训练好的FP32模型。简单快速，可能有1-3%准确率损失。
- **量化感知训练（QAT）** — 在训练中模拟量化效果。更准确但需要重新训练。

### 剪枝

移除不重要的权重：

- **非结构化剪枝** — 将单个权重设为零。高压缩率但硬件不友好（稀疏矩阵操作慢）。
- **结构化剪枝** — 移除整个通道/层。硬件友好，压缩率较低但实际加速更好。

```
原始: Conv2d(64, 64, 3)  -> 36,864参数
50%剪枝: Conv2d(64, 32, 3) -> 18,432参数 (结构化)
         或 36,864参数中50%为零 (非结构化)
```

### 知识蒸馏

用大模型（教师）指导小模型（学生）训练：

```
教师: ResNet-50 (25.6M参数, 76% top-1)
学生: MobileNetV3 (5.4M参数, 75% top-1 with蒸馏)

损失 = alpha * CE(学生输出, 真实标签) + (1-alpha) * KL(学生logits/T, 教师logits/T)
```

温度T软化概率分布，让学生学习教师的"暗知识"——类别间的相似性关系。

### 部署格式

| 格格               | 用途           | 优点             |
| ------------------ | -------------- | ---------------- |
| PyTorch (.pt)      | 训练和原型     | 灵活，易调试     |
| ONNX (.onnx)       | 跨平台部署     | 标准化，广泛支持 |
| TensorRT (.engine) | NVIDIA GPU     | 最快推理         |
| CoreML (.mlmodel)  | Apple设备      | iOS/macOS原生    |
| TFLite (.tflite)   | Android/嵌入式 | 移动端优化       |
| OpenVINO (.xml)    | Intel硬件      | CPU优化          |

## 构建它

### 步骤1：PyTorch动态量化

```python
import torch
import torch.nn as nn
from torchvision.models import mobilenet_v3_small

model = mobilenet_v3_small(pretrained=True)
model.eval()

# 动态量化（最简单的方式）
quantized_model = torch.quantization.quantize_dynamic(
    model, {nn.Linear}, dtype=torch.qint8
)

# 比较大小
def model_size(m):
    return sum(p.nelement() * p.element_size() for p in m.parameters()) / 1e6

print(f"FP32: {model_size(model):.1f} MB")
print(f"INT8: {model_size(quantized_model):.1f} MB")
```

### 步骤2：导出ONNX

```python
dummy_input = torch.randn(1, 3, 224, 224)
torch.onnx.export(
    model, dummy_input, "model.onnx",
    input_names=["input"], output_names=["output"],
    dynamic_axes={"input": {0: "batch"}, "output": {0: "batch"}},
    opset_version=14,
)
```

### 步骤3：ONNX Runtime推理

```python
import onnxruntime as ort
import numpy as np

session = ort.InferenceSession("model.onnx")
input_name = session.get_inputs()[0].name
output = session.run(None, {input_name: np.random.randn(1, 3, 224, 224).astype(np.float32)})
```

## 使用它

生产部署流程：

```
1. 训练FP32模型 (PyTorch)
2. 评估准确率基线
3. 应用量化 (PTQ或QAT)
4. 导出ONNX
5. 转换为目标格式 (TensorRT/CoreML/TFLite)
6. 基准测试延迟和内存
7. 验证准确率损失 < 阈值
```

## 发布它

本课产出：

- `outputs/prompt-edge-deploy-planner.md` — 一个提示，根据硬件约束规划部署优化策略。
- `outputs/skill-quantization-auditor.md` — 一个技能，审计量化前后的准确率差异并推荐修复。

## 练习

1. **(简单)** 对MobileNetV3-Small应用动态量化，比较FP32和INT8的推理速度和准确率。
2. **(中等)** 实现静态量化：校准数据集，量化卷积层，比较与动态量化的差异。
3. **(困难)** 使用知识蒸馏训练一个小模型：用ResNet-50教师指导MobileNetV3学生，在CIFAR-10上达到学生独立训练的95%准确率。

## 关键术语

| 术语     | 人们怎么说     | 实际含义                                      |
| -------- | -------------- | --------------------------------------------- |
| 量化     | "降低精度"     | 将FP32权重转换为INT8/FP16，减少内存和加速推理 |
| 剪枝     | "删参数"       | 移除不重要的权重或通道，减少模型大小          |
| 知识蒸馏 | "大教小"       | 用大模型的输出指导小模型训练，保持准确率      |
| ONNX     | "跨平台格式"   | 开放神经网络交换格式，支持多种推理引擎        |
| TensorRT | "NVIDIA加速"   | NVIDIA GPU推理优化引擎，最快推理速度          |
| PTQ      | "训练后量化"   | 直接量化已训练模型，简单快速                  |
| QAT      | "量化感知训练" | 训练时模拟量化，更准确但更复杂                |

## 延伸阅读

- [PyTorch Quantization 文档](https://pytorch.org/docs/stable/quantization.html)
- [ONNX Runtime](https://onnxruntime.ai/)
- [TensorRT 最佳实践](https://docs.nvidia.com/deeplearning/tensorrt/best-practices/)
