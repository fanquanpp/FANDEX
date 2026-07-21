---
order: 55
title: 边缘AI
module: iot
category: 'eng-infra'
difficulty: advanced
description: 边缘AI：TinyML、模型压缩、边缘推理框架与端侧智能应用详解。
author: fanquanpp
updated: '2026-06-14'
related:
  - iot/ESP32开发
  - 'iot/RT-Thread实时系统'
  - iot/LwM2M设备管理
  - iot/时序数据库
prerequisites:
  - iot/概述与架构
---

## 1. 边缘 AI 概述

### 1.1 什么是边缘 AI

边缘 AI 是将 AI 推理部署在边缘设备上，实现本地数据处理和决策，减少对云端的依赖。

### 1.2 边缘 vs 云端

| 对比项   | 云端 AI        | 边缘 AI        |
| -------- | -------------- | -------------- |
| 延迟     | 高（网络延迟） | 低（本地推理） |
| 带宽     | 需上传数据     | 无需上传       |
| 隐私     | 数据离开设备   | 数据本地处理   |
| 可用性   | 依赖网络       | 离线可用       |
| 算力     | 强             | 有限           |
| 模型大小 | 无限制         | 严格限制       |

### 1.3 应用场景

| 场景     | 描述               |
| -------- | ------------------ |
| 智能家居 | 语音唤醒、人脸识别 |
| 工业检测 | 缺陷检测、预测维护 |
| 自动驾驶 | 实时感知、决策     |
| 医疗设备 | 生命体征监测       |
| 安防监控 | 异常行为检测       |

## 2. TinyML

### 2.1 概述

TinyML 是在微控制器（MCU）上运行机器学习的技术，目标是在功耗 < 1mW 的设备上实现 AI 推理。

### 2.2 资源约束

| 约束  | 典型值       |
| ----- | ------------ |
| RAM   | 16-512 KB    |
| Flash | 64 KB - 2 MB |
| 功耗  | < 1 mW       |
| 算力  | 10-100 DMIPS |

### 2.3 典型任务

| 任务       | 模型        | RAM    | Flash  |
| ---------- | ----------- | ------ | ------ |
| 唤醒词检测 | DSCNN       | ~20KB  | ~50KB  |
| 图像分类   | MobileNet   | ~200KB | ~500KB |
| 异常检测   | AutoEncoder | ~10KB  | ~30KB  |
| 手势识别   | LSTM        | ~50KB  | ~100KB |

## 3. 模型压缩技术

### 3.1 量化

| 类型                | 描述           | 压缩比 |
| ------------------- | -------------- | ------ |
| 训练后量化（PTQ）   | 训练后直接量化 | 2-4x   |
| 量化感知训练（QAT） | 训练时模拟量化 | 2-4x   |
| INT8 量化           | FP32 → INT8    | 4x     |
| 二值量化            | 权重 ±1        | 32x    |

**INT8 量化原理**：

$$q = \text{round}\left(\frac{r}{S} + Z\right)$$

其中 $r$ 为浮点值，$S$ 为缩放因子，$Z$ 为零点。

### 3.2 剪枝

| 类型         | 描述           | 压缩比 |
| ------------ | -------------- | ------ |
| 非结构化剪枝 | 删除单个权重   | 5-10x  |
| 结构化剪枝   | 删除整个通道   | 2-4x   |
| 自动剪枝     | 自动搜索剪枝率 | 可变   |

### 3.3 知识蒸馏

```
教师模型（大）→ 软标签 → 学生模型（小）
```

学生模型同时学习硬标签（真实标签）和软标签（教师输出），获得更好的性能。

### 3.4 架构搜索（NAS）

自动搜索适合边缘设备的网络架构，如 MobileNet、EfficientNet-Lite。

## 4. 边缘推理框架

### 4.1 TensorFlow Lite Micro

```cpp
#include "tensorflow/lite/micro/micro_interpreter.h"
#include "tensorflow/lite/micro/micro_mutable_op_resolver.h"

// 模型
const tflite::Model* model = tflite::GetModel(g_model_data);

// 操作解析器
tflite::MicroMutableOpResolver<10> resolver;
resolver.AddConv2D();
resolver.AddDepthwiseConv2D();
resolver.AddFullyConnected();
resolver.AddSoftmax();

// 解释器
constexpr int kTensorArenaSize = 60 * 1024;
uint8_t tensor_arena[kTensorArenaSize];

tflite::MicroInterpreter interpreter(model, resolver, tensor_arena, kTensorArenaSize);
interpreter.AllocateTensors();

// 推理
float* input = interpreter.input(0)->data.f;
// 填充输入数据
interpreter.Invoke();
float* output = interpreter.output(0)->data.f;
```

### 4.2 框架对比

| 框架         | 平台     | 特点             |
| ------------ | -------- | ---------------- |
| TFLite Micro | MCU      | Google 官方      |
| ONNX Runtime | 边缘设备 | 微软，跨平台     |
| NCNN         | ARM/边缘 | 腾讯，高性能     |
| MNN          | ARM/边缘 | 阿里，全功能     |
| PaddleLite   | ARM/边缘 | 百度             |
| MicroTVM     | MCU      | Apache，编译优化 |

### 4.3 硬件加速

| 硬件 | 类型         | 特点         |
| ---- | ------------ | ------------ |
| NPU  | 神经网络专用 | 高效、低功耗 |
| GPU  | 图形处理     | 并行计算     |
| DSP  | 数字信号     | 定点运算     |
| FPGA | 可编程逻辑   | 灵活、低延迟 |

## 5. 端侧智能应用

### 5.1 语音唤醒

```
麦克风 → 预处理 → MFCC 特征 → DSCNN → 唤醒词判断
```

### 5.2 视觉检测

```
摄像头 → 图像预处理 → MobileNet → 分类/检测
```

### 5.3 异常检测

```
传感器 → 特征提取 → AutoEncoder → 重构误差 → 异常判断
```

## 6. 开发流程

```
1. 数据采集与标注
2. 模型训练（云端）
3. 模型压缩（量化+剪枝）
4. 模型转换（TFLite/ONNX）
5. 边缘部署与优化
6. 持续学习（可选）
```

### 6.1 模型转换

```bash
# TensorFlow → TFLite
import tensorflow as tf
converter = tf.lite.TFLiteConverter.from_saved_model('model')
converter.optimizations = [tf.lite.Optimize.DEFAULT]
tflite_model = converter.convert()

# 生成 C 数组
xxd -i model.tflite > model_data.cc
```

### 6.2 性能优化

| 优化     | 描述           |
| -------- | -------------- |
| 算子融合 | 减少内存访问   |
| 内存复用 | 减少峰值内存   |
| 定点运算 | 替代浮点运算   |
| 模型分区 | 按硬件能力分配 |
