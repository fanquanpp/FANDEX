---
order: 20
title: 模型优化与部署
module: 'ai-engineering'
category: data
difficulty: advanced
description: 模型量化、剪枝、知识蒸馏、ONNX、TensorRT部署优化。
author: fanquanpp
updated: '2026-06-15'
related:
  - 'ai-engineering/TensorFlow框架'
  - 'ai-engineering/降维算法'
  - 'ai-engineering/模型评估与选择'
  - 'ai-engineering/特征工程详解'
prerequisites: []
---

## 1. 模型优化概述

模型优化旨在在**保持精度**的前提下，减少模型大小、降低延迟、减少功耗。

```mermaid
graph LR
    Precision["精度"] ---|"量化/剪枝/蒸馏<br>压缩模型体积<br>加速推理速度"| Efficiency["效率"]
```

| 优化维度 | 目标           | 方法             |
| :------- | :------------- | :--------------- |
| 模型大小 | 减少存储和内存 | 量化、剪枝、蒸馏 |
| 推理延迟 | 减少响应时间   | 算子融合、量化   |
| 吞吐量   | 增加QPS        | 批处理、并行     |
| 功耗     | 降低能耗       | 量化、稀疏计算   |

## 2. 量化

### 2.1 量化原理

将浮点参数映射到低精度整数：

$$x_q = \text{round}\left(\frac{x}{S}\right) + Z$$

其中 $S$ 为缩放因子（Scale），$Z$ 为零点（Zero Point）。

**反量化**：

$$x \approx S \cdot (x_q - Z)$$

### 2.2 量化类型

| 类型                | 说明             | 精度损失 | 难度 |
| :------------------ | :--------------- | :------- | :--- |
| 训练后量化（PTQ）   | 训练完成后量化   | 中       | 低   |
| 量化感知训练（QAT） | 训练时模拟量化   | 小       | 高   |
| 动态量化            | 运行时量化权重   | 小       | 低   |
| 静态量化            | 离线校准量化参数 | 中       | 中   |

### 2.3 PTQ（训练后量化）

```python
import torch.quantization as quant

# 静态量化
model.eval()
model.qconfig = quant.get_default_qconfig('fbgemm')
prepared = quant.prepare(model)
# 用校准数据运行
with torch.no_grad():
    for batch in calib_loader:
        prepared(batch)
quantized = quant.convert(prepared)
```

### 2.4 QAT（量化感知训练）

```python
model.train()
model.qconfig = quant.get_default_qat_qconfig('fbgemm')
prepared = quant.prepare_qat(model)

# 正常训练
for epoch in range(num_epochs):
    for batch in train_loader:
        loss = train_step(prepared, batch)

quantized = quant.convert(prepared)
```

**伪量化**：在前向传播中模拟量化效果，反向传播使用STE（Straight-Through Estimator）。

### 2.5 量化精度对比

| 精度 | 每参数比特 | 相对FP32内存 | 典型精度损失 |
| :--- | :--------- | :----------- | :----------- |
| FP32 | 32bit      | 1×           | —            |
| FP16 | 16bit      | 0.5×         | <1%          |
| INT8 | 8bit       | 0.25×        | 1~3%         |
| INT4 | 4bit       | 0.125×       | 3~8%         |
| 二值 | 1bit       | 0.03×        | >10%         |

## 3. 剪枝

### 3.1 剪枝类型

| 类型         | 粒度     | 说明               |
| :----------- | :------- | :----------------- |
| 非结构化剪枝 | 单个权重 | 灵活但硬件不友好   |
| 结构化剪枝   | 通道/层  | 硬件友好，实际加速 |

### 3.2 剪枝策略

**幅度剪枝**：移除绝对值最小的权重

$$\text{mask}_{ij} = \begin{cases} 1 & |w_{ij}| > \tau \\ 0 & |w_{ij}| \leq \tau \end{cases}$$

**迭代剪枝**：

```
1. 训练模型至收敛
2. 剪枝：移除p%最小权重
3. 微调：恢复精度
4. 重复2-3直到目标稀疏度
```

### 3.3 结构化剪枝

```python
# 基于L1范数的通道剪枝
import torch.nn.utils.prune as prune

# 非结构化
prune.l1_unstructured(model.fc1, name='weight', amount=0.3)

# 结构化（整个通道）
prune.ln_structured(model.fc1, name='weight', amount=0.3, n=2, dim=0)
```

### 3.4 稀疏训练

**RigL**：周期性移除和生长权重

```
1. 前向+反向传播
2. 移除最小幅度的权重
3. 在梯度最大的位置生长新权重
4. 保持恒定稀疏度
```

## 4. 知识蒸馏

### 4.1 基本原理

用**大模型（教师）**指导**小模型（学生）**训练：

$$\mathcal{L} = \alpha \cdot \mathcal{L}_{CE}(y, y_s) + (1-\alpha) \cdot T^2 \cdot \mathcal{L}_{KL}(\sigma(z_t/T), \sigma(z_s/T))$$

| 符号       | 含义            |
| :--------- | :-------------- |
| $y_s$      | 学生模型输出    |
| $z_t, z_s$ | 教师/学生logits |
| $T$        | 温度参数        |
| $\alpha$   | 损失权重        |

### 4.2 温度Softmax

$$\sigma(z_i/T) = \frac{e^{z_i/T}}{\sum_j e^{z_j/T}}$$

- $T > 1$：软化概率分布，传递更多"暗知识"
- $T = 1$：标准Softmax

### 4.3 蒸馏变体

| 方法     | 蒸馏内容       | 说明           |
| :------- | :------------- | :------------- |
| 响应蒸馏 | 最终输出logits | 最基本         |
| 特征蒸馏 | 中间层特征     | 传递结构信息   |
| 关系蒸馏 | 样本间关系     | 传递相似性结构 |
| 自蒸馏   | 同一模型不同层 | 无需教师模型   |

## 5. ONNX与部署

### 5.1 ONNX导出

```python
import torch.onnx

dummy_input = torch.randn(1, 3, 224, 224)
torch.onnx.export(
    model, dummy_input, "model.onnx",
    input_names=['input'],
    output_names=['output'],
    dynamic_axes={'input': {0: 'batch'}, 'output': {0: 'batch'}},
    opset_version=14
)
```

### 5.2 ONNX Runtime

```python
import onnxruntime as ort

session = ort.InferenceSession("model.onnx")
input_name = session.get_inputs()[0].name
output = session.run(None, {input_name: input_data})
```

### 5.3 TensorRT

```python
# ONNX → TensorRT
import tensorrt as trt

logger = trt.Logger(trt.Logger.WARNING)
builder = trt.Builder(logger)
network = builder.create_network(1 << int(trt.NetworkDefinitionCreationFlag.EXPLICIT_BATCH))
parser = trt.OnnxParser(network, logger)

with open("model.onnx", "rb") as f:
    parser.parse(f.read())

config = builder.create_builder_config()
config.set_memory_pool_limit(trt.MemoryPoolType.WORKSPACE, 1 << 30)  # 1GB
engine = builder.build_serialized_network(network, config)
```

### 5.4 部署方案对比

| 方案         | 延迟优化 | 精度           | 易用性 | 适用场景      |
| :----------- | :------- | :------------- | :----- | :------------ |
| PyTorch原生  | 基准     | FP32           | 高     | 开发调试      |
| ONNX Runtime | 2~3x     | FP32/FP16/INT8 | 高     | 通用部署      |
| TensorRT     | 3~10x    | FP16/INT8      | 中     | NVIDIA GPU    |
| OpenVINO     | 3~8x     | FP16/INT8      | 中     | Intel CPU/GPU |
| TFLite       | 2~5x     | INT8           | 高     | 移动端        |
| Core ML      | 2~5x     | FP16/INT8      | 高     | Apple设备     |
