---
title: 目标检测YOLO
description: 检测是分类加定位。YOLO将两者统一为单次前向传播，用网格回归取代了区域提议。
module: 'computer-vision'
difficulty: advanced
tags:
  - 目标检测
  - YOLO
  - 锚框
  - IoU
  - NMS
  - mAP
related:
  - 'computer-vision/卷积从零实现'
  - 'computer-vision/开放词汇CLIP'
  - 'computer-vision/迁移学习'
  - 'computer-vision/实例分割MaskRCNN'
prerequisites:
  - 'computer-vision/3D高斯泼溅'
---

# 目标检测YOLO

> 检测是分类加定位。YOLO将两者统一为单次前向传播，用网格回归取代了区域提议。

**类型:** 构建
**语言:** Python
**前置知识:** Phase 4 Lesson 02 (卷积从零实现), Phase 4 Lesson 03 (CNN)
**时间:** 约90分钟

## 学习目标

- 解释两阶段检测器（Faster R-CNN）和单阶段检测器（YOLO）之间的区别，以及为什么YOLO更快
- 实现锚框、IoU计算、非极大值抑制和mAP评估
- 从零构建一个微型YOLO检测头，输出网格单元预测、边界框偏移和类别概率
- 理解从YOLOv1到YOLOv8的演进以及每个版本改变的内容

## 问题所在

分类告诉你图像中有什么。检测告诉你它在哪里。在自动驾驶、机器人、监控、零售分析和医学影像中，你需要两者：每个物体的类别和边界框。

两阶段检测器（Faster R-CNN）首先生成区域提议，然后分类每个提议。准确但慢——每张图像约100ms。YOLO（You Only Look Once）将检测视为单次回归问题：将图像划分为网格，每个网格单元直接预测边界框和类别概率。一次前向传播，没有提议阶段，约10ms推理。

速度-准确率权衡是真实的：Faster R-CNN在小型物体上更准确，YOLO在实时应用中更快。从YOLOv1到YOLOv8，每个版本都在缩小差距。

## 核心概念

### 检测输出格式

分类输出每张图像一个类别标签。检测输出每个检测到的物体一个类别标签加一个边界框：

```
分类: [(class_id, confidence)]
检测: [(class_id, confidence, x_center, y_center, width, height), ...]
```

边界框格式各不相同。YOLO使用`(x_center, y_center, width, height)`，归一化到图像尺寸。COCO使用`(x_top_left, y_top_left, width, height)`，绝对像素。Pascal VOC使用`(x_min, y_min, x_max, y_max)`。转换是检测代码中bug的首要来源。

### 网格预测范式

YOLO将输入图像划分为S x S网格。每个网格单元预测B个边界框和C个类别概率。总输出：S x S x (B \* 5 + C)，其中5 = (x, y, w, h, confidence)。

```
输入图像 (416 x 416)
  |
  v
划分为 13 x 13 网格 (stride=32)
  |
  v
每个网格单元预测:
  - B 个边界框 (x, y, w, h, objectness)
  - C 个类别概率
  |
  v
输出张量: (13, 13, B*5 + C)
```

如果物体的中心落入某个网格单元，该单元负责检测它。一个单元可以预测多个框（B > 1），但每个框只有一个类别。

### 锚框（先验框）

不同物体有不同的宽高比。锚框是数据集上K-means聚类的典型框尺寸。YOLO不是从零预测框，而是预测相对于锚框的偏移：

```
预测框 = 锚框 + 学习的偏移

bx = sigma(tx) + cx     (网格单元内的x偏移)
by = sigma(ty) + cy     (网格单元内的y偏移)
bw = pw * exp(tw)       (相对于锚框宽度的宽度缩放)
bh = ph * exp(th)       (相对于锚框高度的高度缩放)
```

其中`(cx, cy)`是网格单元坐标，`(pw, ph)`是锚框尺寸，`sigma`是sigmoid函数。`exp`确保宽度和高度始终为正。

### IoU（交并比）

评估检测质量的核心指标：

```
IoU = 交集面积 / 并集面积

         预测框
       +--------+
       |  交集  |
       +--------+
              真实框

IoU = 1.0: 完美重叠
IoU = 0.5: 勉强可接受的检测 (COCO阈值)
IoU = 0.0: 完全不重叠
```

IoU是边界框回归损失和mAP评估的基础。

### 非极大值抑制（NMS）

一个物体可能在多个网格单元和多个锚框中被检测到。NMS移除冗余检测：

```
1. 按置信度排序所有检测
2. 选择最高置信度的检测
3. 移除与所选检测IoU > 阈值的所有其他检测
4. 重复直到没有检测剩下
```

NMS是后处理，不是可学习的。它是一个启发式方法，偶尔会抑制真正靠近的物体（人群、密集停车场）。Soft-NMS衰减而不是抑制，是现代YOLO版本的默认。

### mAP（平均精度均值）

检测的标准评估指标：

```
对于每个类别:
  1. 按置信度排序检测
  2. 计算不同IoU阈值下的精确率-召回率曲线
  3. 计算曲线下面积 (AP)

mAP = 所有类别AP的平均
mAP@0.5 = IoU阈值0.5时的mAP
mAP@0.5:0.95 = IoU阈值从0.5到0.95（步长0.05）的平均mAP
```

mAP@0.5是"宽松"指标（大致正确的框即可）。mAP@0.5:0.95是"严格"指标（框必须精确）。COCO排行榜报告两者。

### YOLO演进

| 版本    | 年份 | 关键创新                                    |
| ------- | ---- | ------------------------------------------- |
| YOLOv1  | 2016 | 单次检测，网格预测                          |
| YOLOv2  | 2017 | 锚框，批归一化，多尺度训练                  |
| YOLOv3  | 2018 | 多尺度检测（3个检测头），Darknet-53         |
| YOLOv4  | 2020 | Bag of freebies（Mosaic、CutMix、CIoU损失） |
| YOLOv5  | 2020 | PyTorch原生，易于训练，生产就绪             |
| YOLOv7  | 2022 | E-ELAN架构，辅助头                          |
| YOLOv8  | 2023 | Anchor-free，解耦头，分布焦点损失           |
| YOLOv9  | 2024 | PGI + GELAN，信息瓶颈理论                   |
| YOLOv10 | 2024 | 无NMS训练，一致双重分配                     |

趋势：anchor-based到anchor-free，耦合头到解耦头，手工NMS到学习的一致性。

## 构建它

### 步骤1：IoU计算

```python
import torch

def box_iou(boxes1, boxes2):
    """计算两组框之间的IoU。
    boxes: (N, 4) 格式为 (x1, y1, x2, y2)
    """
    area1 = (boxes1[:, 2] - boxes1[:, 0]) * (boxes1[:, 3] - boxes1[:, 1])
    area2 = (boxes2[:, 2] - boxes2[:, 0]) * (boxes2[:, 3] - boxes2[:, 1])

    lt = torch.max(boxes1[:, None, :2], boxes2[None, :, :2])
    rb = torch.min(boxes1[:, None, 2:], boxes2[None, :, 2:])

    wh = (rb - lt).clamp(min=0)
    inter = wh[:, :, 0] * wh[:, :, 1]
    union = area1[:, None] + area2[None, :] - inter
    return inter / union.clamp(min=1e-6)
```

广播技巧：`boxes1[:, None, :]`和`boxes2[None, :, :]`创建所有N x M对，无需循环。

### 步骤2：非极大值抑制

```python
def nms(boxes, scores, iou_threshold=0.5):
    """对单个类别的检测执行NMS。"""
    order = scores.argsort(descending=True)
    keep = []

    while order.numel() > 0:
        i = order[0].item()
        keep.append(i)
        if order.numel() == 1:
            break
        ious = box_iou(boxes[i:i+1], boxes[order[1:]])[0]
        mask = ious <= iou_threshold
        order = order[1:][mask]

    return torch.tensor(keep, dtype=torch.long)
```

### 步骤3：微型YOLO检测头

一个最小检测头，附加到骨干的3个特征图上。

```python
import torch.nn as nn
import torch.nn.functional as F

class TinyYOLOHead(nn.Module):
    def __init__(self, num_classes=10, num_anchors=3):
        super().__init__()
        self.num_classes = num_classes
        self.num_anchors = num_anchors
        # 每个锚框: (x, y, w, h, objectness) + num_classes
        self.out_channels = num_anchors * (5 + num_classes)

        # 3个尺度的检测头
        self.head_small = nn.Conv2d(128, self.out_channels, 1)
        self.head_medium = nn.Conv2d(256, self.out_channels, 1)
        self.head_large = nn.Conv2d(512, self.out_channels, 1)

    def forward(self, features):
        """features: [small_feat, medium_feat, large_feat]"""
        outputs = []
        for feat, head in zip(features, [self.head_small, self.head_medium, self.head_large]):
            out = head(feat)
            B, C, H, W = out.shape
            out = out.view(B, self.num_anchors, 5 + self.num_classes, H, W)
            out = out.permute(0, 1, 3, 4, 2).contiguous()
            outputs.append(out)
        return outputs
```

三个检测头对应三个尺度：小物体在高分辨率特征图上，大物体在低分辨率特征图上。

### 步骤4：解码YOLO输出

将原始网络输出转换为边界框坐标。

```python
def decode_yolo_output(output, stride, anchors):
    """解码单个尺度的YOLO输出。
    output: (B, A, H, W, 5+C)
    anchors: (A, 2) 先验框尺寸
    stride: 该尺度的下采样倍率
    """
    B, A, H, W, _ = output.shape
    device = output.device

    # 创建网格坐标
    y_grid, x_grid = torch.meshgrid(torch.arange(H, device=device),
                                      torch.arange(W, device=device), indexing="ij")
    x_grid = x_grid.view(1, 1, H, W).float()
    y_grid = y_grid.view(1, 1, H, W).float()

    # 解码边界框
    tx = output[..., 0].sigmoid()
    ty = output[..., 1].sigmoid()
    tw = output[..., 2]
    th = output[..., 3]
    objectness = output[..., 4].sigmoid()
    class_probs = output[..., 5:].sigmoid()

    anchors = torch.tensor(anchors, device=device).view(1, A, 1, 1, 2)
    bw = anchors[..., 0] * torch.exp(tw)
    bh = anchors[..., 1] * torch.exp(th)

    bx = tx + x_grid
    by = ty + y_grid

    # 转换为绝对坐标
    bx = bx * stride
    by = by * stride
    bw = bw * stride
    bh = bh * stride

    # 转换为 (x1, y1, x2, y2)
    x1 = bx - bw / 2
    y1 = by - bh / 2
    x2 = bx + bw / 2
    y2 = by + bh / 2

    boxes = torch.stack([x1, y1, x2, y2], dim=-1)
    scores = objectness.unsqueeze(-1) * class_probs

    return boxes, scores
```

sigmoid将中心偏移限制在网格单元内。exp确保宽度和高度始终为正。stride将网格坐标映射回图像坐标。

### 步骤5：合成检测数据集

```python
import numpy as np

def make_detection_sample(img_size=416, num_objects=5, num_classes=10):
    img = np.random.uniform(0, 0.3, (3, img_size, img_size)).astype(np.float32)
    boxes = []
    labels = []
    for _ in range(num_objects):
        w = np.random.randint(32, 128)
        h = np.random.randint(32, 128)
        x = np.random.randint(0, img_size - w)
        y = np.random.randint(0, img_size - h)
        c = np.random.randint(0, num_classes)
        color = np.random.uniform(0.5, 1.0, (3,))
        img[:, y:y+h, x:x+w] = color[:, None, None]
        boxes.append([x, y, x + w, y + h])
        labels.append(c)
    return img, np.array(boxes), np.array(labels)
```

彩色矩形在暗背景上。足够简单，微型模型可以学习，足够结构化，需要真正的检测逻辑。

## 使用它

对于生产检测，使用Ultralytics YOLOv8：

```python
from ultralytics import YOLO

# 加载预训练模型
model = YOLO("yolov8n.pt")

# 在自定义数据上训练
model.train(data="coco.yaml", epochs=100, imgsz=640)

# 推理
results = model("image.jpg")
for result in results:
    boxes = result.boxes
    for box in boxes:
        x1, y1, x2, y2 = box.xyxy[0].tolist()
        conf = box.conf[0].item()
        cls = box.cls[0].item()
        print(f"Class {cls}: confidence={conf:.2f}, box=({x1:.0f},{y1:.0f},{x2:.0f},{y2:.0f})")
```

YOLOv8是anchor-free的——没有锚框超参数需要调整。解耦头分别预测分类和定位，使每个任务更容易学习。

## 发布它

本课产出：

- `outputs/prompt-detection-pipeline.md` — 一个提示，根据物体尺寸、密度和延迟要求设计检测管线。
- `outputs/skill-iou-nms-toolkit.md` — 一个技能，实现IoU变体（GIoU、DIoU、CIoU）和NMS变体（Soft-NMS、类别感知NMS）。

## 练习

1. **(简单)** 实现三种边界框格式之间的转换函数：YOLO格式(cx, cy, w, h归一化)、COCO格式(x, y, w, h绝对)、VOC格式(x1, y1, x2, y2绝对)。用往返测试验证。
2. **(中等)** 在合成数据集上训练微型YOLO模型20个epoch。报告mAP@0.5。可视化预测框与真实框对比。
3. **(困难)** 实现CIoU损失（考虑重叠面积、中心距离和宽高比）并替换MSE边界框损失。在相同设置下比较收敛速度和最终mAP。

## 关键术语

| 术语        | 人们怎么说   | 实际含义                                                   |
| ----------- | ------------ | ---------------------------------------------------------- |
| 边界框      | "框"         | 图像中物体的矩形定位，格式为(x1,y1,x2,y2)或(cx,cy,w,h)     |
| IoU         | "重叠度"     | 交并比；衡量两个框重叠程度的指标，0到1                     |
| NMS         | "去重"       | 非极大值抑制；移除同一物体的冗余检测的后处理               |
| mAP         | "检测准确率" | 平均精度均值；所有类别和IoU阈值上的平均检测质量            |
| 锚框        | "先验框"     | 从数据集统计得出的预定义框尺寸，检测器预测相对于它们的偏移 |
| 网格预测    | "YOLO方式"   | 将图像划分为网格，每个单元直接预测框和类别                 |
| Objectness  | "有东西吗"   | 框包含任何物体的概率，独立于具体类别                       |
| Anchor-free | "无锚框"     | 直接预测框坐标而不参考锚框；YOLOv8及以后版本的默认         |

## 延伸阅读

- [You Only Look Once (Redmon et al., 2016)](https://arxiv.org/abs/1506.02640) — 原始YOLO论文
- [YOLOv3 (Redmon & Farhadi, 2018)](https://arxiv.org/abs/1804.02767) — 多尺度检测
- [Ultralytics YOLOv8 文档](https://docs.ultralytics.com/) — 生产YOLO的权威指南
- [Faster R-CNN (Ren et al., 2015)](https://arxiv.org/abs/1506.01497) — 两阶段检测器对比基准
