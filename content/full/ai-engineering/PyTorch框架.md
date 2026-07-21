---
order: 18
title: PyTorch框架
module: 'ai-engineering'
category: data
difficulty: intermediate
description: PyTorch核心概念：Tensor、Autograd、nn.Module、训练循环与最佳实践。
author: fanquanpp
updated: '2026-06-14'
related:
  - 'ai-engineering/集成学习'
  - 'ai-engineering/预训练模型'
  - 'ai-engineering/聚类算法'
  - 'ai-engineering/TensorFlow框架'
prerequisites: []
---

## 1. Tensor张量

### 1.1 Tensor创建

```python
import torch

# 从列表创建
a = torch.tensor([1, 2, 3])

# 特殊张量
zeros = torch.zeros(3, 4)
ones = torch.ones(3, 4)
randn = torch.randn(3, 4)  # 标准正态分布
arange = torch.arange(0, 10, 2)

# 指定设备和数据类型
x = torch.randn(3, 4, dtype=torch.float32, device='cuda')
```

### 1.2 Tensor操作

| 操作     | 说明              | 示例             |
| :------- | :---------------- | :--------------- |
| 索引     | 类似NumPy         | `x[0, :]`        |
| 形状变换 | view/reshape      | `x.view(2, -1)`  |
| 维度操作 | squeeze/unsqueeze | `x.unsqueeze(0)` |
| 广播     | 自动扩展          | `a + b`          |
| 数学运算 | 逐元素/归约       | `x.sum(dim=0)`   |
| 矩阵运算 | 矩阵乘法          | `a @ b`          |

### 1.3 GPU加速

```python
# 检查GPU可用性
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

# 数据移动
x = x.to(device)

# 多GPU
model = torch.nn.DataParallel(model)
```

## 2. Autograd自动微分

### 2.1 基本用法

```python
x = torch.randn(3, requires_grad=True)
y = x ** 2
z = y.sum()
z.backward()

print(x.grad)  # dz/dx = 2x
```

### 2.2 计算图

```
z = y.sum()
    │
  y = x²
    │
  x (leaf)
```

- **前向传播**：构建计算图
- **反向传播**：沿计算图计算梯度
- **叶子节点**：用户创建的Tensor，梯度累积

### 2.3 梯度控制

```python
# 不追踪梯度（推理时）
with torch.no_grad():
    output = model(input)

# 等价方式
@torch.no_grad()
def predict(x):
    return model(x)

# 清除梯度
optimizer.zero_grad()

# 分离计算图
loss = criterion(output.detach(), target)
```

## 3. nn.Module

### 3.1 自定义模块

```python
import torch.nn as nn

class MLP(nn.Module):
    def __init__(self, input_dim, hidden_dim, output_dim):
        super().__init__()
        self.fc1 = nn.Linear(input_dim, hidden_dim)
        self.fc2 = nn.Linear(hidden_dim, hidden_dim)
        self.fc3 = nn.Linear(hidden_dim, output_dim)
        self.relu = nn.ReLU()
        self.dropout = nn.Dropout(0.1)

    def forward(self, x):
        x = self.dropout(self.relu(self.fc1(x)))
        x = self.dropout(self.relu(self.fc2(x)))
        x = self.fc3(x)
        return x
```

### 3.2 常用层

| 层                      | 说明              |
| :---------------------- | :---------------- |
| `nn.Linear`             | 全连接层          |
| `nn.Conv2d`             | 二维卷积          |
| `nn.LSTM`               | LSTM层            |
| `nn.TransformerEncoder` | Transformer编码器 |
| `nn.Embedding`          | 词嵌入层          |
| `nn.BatchNorm1d/2d`     | 批归一化          |
| `nn.LayerNorm`          | 层归一化          |
| `nn.Dropout`            | Dropout           |

### 3.3 损失函数

| 损失    | 类名                   | 适用场景        |
| :------ | :--------------------- | :-------------- |
| 交叉熵  | `nn.CrossEntropyLoss`  | 分类            |
| MSE     | `nn.MSELoss`           | 回归            |
| BCE     | `nn.BCEWithLogitsLoss` | 二分类          |
| L1      | `nn.L1Loss`            | 回归            |
| NLL     | `nn.NLLLoss`           | 配合log_softmax |
| Triplet | `nn.TripletMarginLoss` | 度量学习        |

## 4. 训练循环

### 4.1 标准训练循环

```python
model = MLP(784, 256, 10).to(device)
optimizer = torch.optim.AdamW(model.parameters(), lr=1e-3, weight_decay=0.01)
criterion = nn.CrossEntropyLoss()
scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=100)

for epoch in range(num_epochs):
    # 训练阶段
    model.train()
    for batch_x, batch_y in train_loader:
        batch_x, batch_y = batch_x.to(device), batch_y.to(device)

        # 前向传播
        output = model(batch_x)
        loss = criterion(output, batch_y)

        # 反向传播
        optimizer.zero_grad()
        loss.backward()

        # 梯度裁剪
        torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)

        # 参数更新
        optimizer.step()

    scheduler.step()

    # 验证阶段
    model.eval()
    val_loss = 0
    correct = 0
    with torch.no_grad():
        for batch_x, batch_y in val_loader:
            batch_x, batch_y = batch_x.to(device), batch_y.to(device)
            output = model(batch_x)
            val_loss += criterion(output, batch_y).item()
            correct += (output.argmax(1) == batch_y).sum().item()

    val_acc = correct / len(val_dataset)
    print(f"Epoch {epoch}: val_loss={val_loss:.4f}, val_acc={val_acc:.4f}")
```

### 4.2 混合精度训练

```python
from torch.cuda.amp import autocast, GradScaler

scaler = GradScaler()

for batch_x, batch_y in train_loader:
    optimizer.zero_grad()

    with autocast():
        output = model(batch_x)
        loss = criterion(output, batch_y)

    scaler.scale(loss).backward()
    scaler.unscale_(optimizer)
    torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
    scaler.step(optimizer)
    scaler.update()
```

## 5. 模型保存与加载

### 5.1 保存方式

```python
# 保存整个模型（不推荐）
torch.save(model, 'model.pth')

# 只保存参数（推荐）
torch.save(model.state_dict(), 'model_state.pth')

# 保存训练检查点
checkpoint = {
    'epoch': epoch,
    'model_state_dict': model.state_dict(),
    'optimizer_state_dict': optimizer.state_dict(),
    'scheduler_state_dict': scheduler.state_dict(),
    'loss': loss,
}
torch.save(checkpoint, 'checkpoint.pth')
```

### 5.2 加载方式

```python
# 加载参数
model = MLP(784, 256, 10)
model.load_state_dict(torch.load('model_state.pth'))
model.eval()

# 加载检查点
checkpoint = torch.load('checkpoint.pth')
model.load_state_dict(checkpoint['model_state_dict'])
optimizer.load_state_dict(checkpoint['optimizer_state_dict'])
```

## 6. DataLoader

```python
from torch.utils.data import DataLoader, Dataset

class CustomDataset(Dataset):
    def __init__(self, data, labels):
        self.data = data
        self.labels = labels

    def __len__(self):
        return len(self.data)

    def __getitem__(self, idx):
        return self.data[idx], self.labels[idx]

train_loader = DataLoader(
    dataset,
    batch_size=64,
    shuffle=True,
    num_workers=4,
    pin_memory=True,
    drop_last=True
)
```
