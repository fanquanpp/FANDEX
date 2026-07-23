---
title: 数值稳定性
description: 'IEEE 754 浮点数、溢出与下溢、log-sum-exp 技巧、稳定 softmax、梯度检查、混合精度、bfloat16'
module: 'ai-engineering'
difficulty: intermediate
tags:
  - 数值稳定性
  - 浮点数
  - softmax
  - 'log-sum-exp'
  - 梯度检查
  - 混合精度
  - bfloat16
related:
  - 'ai-engineering/视频理解管线场景与QA与搜索'
  - 'ai-engineering/数据管理'
  - 'ai-engineering/说话人识别与验证'
  - 'ai-engineering/随机过程'
prerequisites:
  - 'ai-engineering/机器学习概述'
---

# 数值稳定性

> 浮点数是一个有漏洞的抽象。它会在训练时咬你一口，而你根本不会预见到。

**类型：** 构建
**语言：** Python
**前置条件：** 阶段 1，第 01-04 课
**预计时间：** ~120 分钟

## 学习目标

- 使用最大值减法技巧实现数值稳定的 softmax 和 log-sum-exp
- 识别浮点计算中的溢出、下溢和灾难性抵消
- 使用中心有限差分验证解析梯度
- 解释为什么 bfloat16 比 float16 更适合训练，以及 loss scaling 如何防止梯度下溢

## 问题所在

你的模型训练了三个小时，然后 loss 变成 NaN。你加了一个 print 语句。Logits 在第 9000 步还正常。第 9001 步变成了 `inf`。到第 9002 步，每个梯度都是 `nan`，训练死了。

或者：模型训练完成，但准确率比论文声称的低 2%。你检查了一切。架构匹配。超参数匹配。数据匹配。问题是论文用了 float32，而你用了 float16 没有正确的缩放。32 位的累积舍入误差悄悄吞噬了你的准确率。

数值稳定性不是理论问题。它是训练成功和静默失败之间的区别。

## 核心概念

### IEEE 754：计算机如何存储实数

浮点数由三部分组成：符号位、指数和尾数。

```
Float32 布局（32 位总计）：
[1 符号] [8 指数] [23 尾数]

值 = (-1)^sign * 2^(exponent - 127) * 1.mantissa
```

```
格式       位数   指数位  尾数位  十进制精度  范围（约）
float64    64     11      52      ~15-16位    +/- 1.8e308
float32    32     8       23      ~7-8位      +/- 3.4e38
float16    16     5       10      ~3-4位      +/- 65,504
bfloat16   16     8       7       ~2-3位      +/- 3.4e38
```

float32 给你大约 7 位十进制精度。7 位之后，一切都是舍入噪声。

### 溢出和下溢

```python
import numpy as np

# 溢出：exp(1000) > float32 最大值
print(f"exp(1000) = {np.exp(1000)}")  # inf

# 下溢：exp(-1000) < float32 最小正值
print(f"exp(-1000) = {np.exp(-1000)}")  # 0.0

# 灾难性抵消：两个接近的大数相减
a = 1.0000001
b = 1.0000000
print(f"精确差: {a - b}")  # 1e-7，但大部分精度丢失
```

### 不稳定的 Softmax

```python
def softmax_unstable(logits):
    """数值不稳定的 softmax"""
    exp_vals = np.exp(logits)
    return exp_vals / np.sum(exp_vals)

# 大 logit 值导致溢出
logits = np.array([1000, 1001, 1002])
print(f"不稳定 softmax: {softmax_unstable(logits)}")  # [nan, nan, nan]
```

### 稳定的 Softmax

```python
def softmax_stable(logits):
    """数值稳定的 softmax：减去最大值"""
    shifted = logits - np.max(logits)
    exp_vals = np.exp(shifted)
    return exp_vals / np.sum(exp_vals)

logits = np.array([1000, 1001, 1002])
print(f"稳定 softmax: {softmax_stable(logits)}")  # [0.090, 0.245, 0.665]
```

减去最大值不影响结果（指数的平移不变性），但防止溢出。

### Log-Sum-Exp 技巧

```python
def log_sum_exp(logits):
    """数值稳定的 log-sum-exp"""
    max_val = np.max(logits)
    return max_val + np.log(np.sum(np.exp(logits - max_val)))

logits = np.array([1000, 1001, 1002])
print(f"log-sum-exp: {log_sum_exp(logits):.4f}")  # 1002.408
```

### 梯度检查

使用数值梯度验证解析梯度的正确性。

```python
def gradient_check(f, x, analytic_grad, h=1e-5, tol=1e-4):
    """检查解析梯度是否正确"""
    numerical_grad = np.zeros_like(x)
    for i in range(len(x)):
        x_plus = x.copy()
        x_plus[i] += h
        x_minus = x.copy()
        x_minus[i] -= h
        numerical_grad[i] = (f(x_plus) - f(x_minus)) / (2 * h)

    diff = np.linalg.norm(analytic_grad - numerical_grad)
    diff /= (np.linalg.norm(analytic_grad) + np.linalg.norm(numerical_grad) + 1e-8)

    if diff < tol:
        print(f"梯度检查通过: 相对误差 = {diff:.2e}")
    else:
        print(f"梯度检查失败: 相对误差 = {diff:.2e}")

    return diff < tol
```

### 混合精度训练

混合精度使用 float16 进行计算（更快，更省内存），float32 进行累加（保持精度）。

```python
# PyTorch 混合精度示例
# with torch.cuda.amp.autocast():
#     output = model(input)
#     loss = criterion(output, target)
#
# scaler.scale(loss).backward()
# scaler.step(optimizer)
# scaler.update()
```

### bfloat16 vs float16

| 属性   | float16    | bfloat16   |
| ------ | ---------- | ---------- |
| 指数位 | 5          | 8          |
| 尾数位 | 10         | 7          |
| 范围   | +/- 65,504 | +/- 3.4e38 |
| 精度   | 更高       | 更低       |

bfloat16 有与 float32 相同的指数范围，所以不容易溢出/下溢。精度更低，但训练时范围安全更重要。

## 实际应用

| 技巧         | 使用场景             |
| ------------ | -------------------- |
| 稳定 softmax | 分类模型，注意力     |
| Log-sum-exp  | 交叉熵损失，log 概率 |
| 梯度检查     | 验证自定义操作       |
| 混合精度     | 加速训练，减少内存   |
| bfloat16     | 大模型训练           |

## 练习

1. 实现不稳定的 softmax，对大 logit 值测试，观察 NaN；然后实现稳定版本
2. 对 `f(x) = sum(x^2)` 实现梯度检查，验证解析梯度
3. 计算 `log(exp(a) + exp(b))` 的不稳定和稳定版本，比较结果
4. 创建一个模拟混合精度训练的示例，展示 loss scaling 的作用
