---
title: JAX入门
description: JAX用函数式编程和XLA编译实现高性能数值计算和自动微分
module: 'deep-learning'
difficulty: advanced
tags:
  - JAX
  - XLA
  - 函数式编程
  - vmap
  - jit
related:
  - 'deep-learning/BERT掩码语言建模'
  - 'deep-learning/GPT因果语言建模'
  - 'deep-learning/KV缓存与Flash注意力'
  - 'deep-learning/PyTorch入门'
prerequisites:
  - 'deep-learning/深度学习概述'
---

# JAX入门

> JAX用函数式编程和XLA编译实现高性能数值计算和自动微分。

**类型:** 构建
**语言:** Python
**前置条件:** Phase 3 第1-11课
**时间:** ~60 分钟

## 学习目标

- 使用JAX的grad、jit、vmap和pmap变换
- 理解JAX的函数式编程范式与PyTorch的面向对象范式的区别
- 用JAX实现和训练一个简单神经网络
- 解释JAX的纯函数约束和不可变数组

## 问题

PyTorch是命令式的：修改张量、累积梯度。JAX是函数式的：纯函数变换。这种设计使JAX能进行激进的编译优化（XLA），在大规模计算上比PyTorch更快。

JAX是Google DeepMind和Google Brain研究者的首选框架，也是许多前沿模型（如Gemini）的基础。

## 概念

### JAX核心变换

**grad**：自动微分。将函数f变换为计算f梯度的函数。

```python
from jax import grad
def f(x): return x ** 2
df = grad(f)  # df(3.0) = 6.0
```

**jit**：即时编译。将Python函数编译为XLA优化的机器码。

```python
from jax import jit
fast_f = jit(f)  # 第一次调用编译，后续调用极快
```

**vmap**：向量化映射。自动将函数批量化，无需手动写批量代码。

```python
from jax import vmap
batched_f = vmap(f)  # 自动对批量输入应用f
```

**pmap**：并行映射。跨多个设备（GPU/TPU）并行执行。

### 函数式 vs 面向对象

PyTorch：

```python
model = Model()
optimizer = Optimizer(model.parameters())
loss = criterion(model(x), y)
loss.backward()
optimizer.step()
```

JAX/Flax：

```python
params = model.init(rng, x)
loss_fn = lambda params: criterion(model.apply(params, x), y)
grads = jax.grad(loss_fn)(params)
params = optimizer.update(grads, params)
```

关键区别：状态（参数）与逻辑（模型）分离。纯函数，无副作用。

### 不可变数组

JAX数组不可修改。所有操作返回新数组。

```python
x = jnp.array([1, 2, 3])
x = x.at[0].set(10)  # 返回新数组，原数组不变
```

### 随机数

JAX的随机数生成器是显式的，需要传入PRNGKey：

```python
rng = jax.random.PRNGKey(42)
rng, subkey = jax.random.split(rng)
x = jax.random.normal(subkey, (3, 4))
```

### Flax和Optax

Flax：JAX的神经网络库（类似nn.Module）
Optax：JAX的优化器库（类似torch.optim）

## 动手构建

```python
# 需要安装: pip install jax jaxlib flax optax

# 以下为概念演示代码（实际运行需要JAX环境）

print("=== JAX Concepts ===")
print("""
JAX核心API:

1. jax.numpy (jnp): NumPy兼容API，支持GPU/TPU
   import jax.numpy as jnp
   x = jnp.array([1.0, 2.0, 3.0])

2. jax.grad: 自动微分
   from jax import grad
   def loss_fn(params, x, y):
       pred = model(params, x)
       return jnp.mean((pred - y) ** 2)
   grad_fn = grad(loss_fn)

3. jax.jit: 编译加速
   from jax import jit
   fast_loss = jit(loss_fn)
   fast_grad = jit(grad(loss_fn))

4. jax.vmap: 自动向量化
   from jax import vmap
   batched_model = vmap(model, in_axes=(None, 0))
   # None=params不批量, 0=第一维批量

5. 随机数:
   import jax.random as random
   key = random.PRNGKey(42)
   key, subkey = random.split(key)
   x = random.normal(subkey, (3, 4))

JAX vs PyTorch对比:

| 特性 | PyTorch | JAX |
|------|---------|-----|
| 范式 | 面向对象 | 函数式 |
| 计算图 | 动态(eager) | 编译(XLA) |
| 梯度 | loss.backward() | grad(fn)(params) |
| 状态 | 有状态(model) | 无状态(params) |
| 批量化 | 手动 | vmap自动 |
| GPU | .to('cuda') | 默认加速器 |
| 多设备 | DataParallel | pmap |

JAX训练循环模板:

import jax
import jax.numpy as jnp
import optax

def train_step(params, batch, optimizer_state):
    def loss_fn(params):
        pred = model.apply(params, batch['x'])
        return jnp.mean((pred - batch['y']) ** 2)

    grads = jax.grad(loss_fn)(params)
    updates, new_state = optimizer.update(grads, optimizer_state, params)
    new_params = optax.apply_updates(params, updates)
    return new_params, new_state

train_step = jax.jit(train_step)  # 编译加速

for epoch in range(num_epochs):
    for batch in dataloader:
        params, optimizer_state = train_step(params, batch, optimizer_state)
""")

print("JAX适合需要极致性能和大规模并行的场景。")
print("PyTorch更适合快速原型开发和工业部署。")
print("两者都是优秀的框架，选择取决于具体需求。")
```

## 练习

1. 用JAX实现线性回归。使用grad计算梯度，用jit编译训练步骤。
2. 用Flax实现一个MLP。比较与PyTorch实现的代码风格差异。
3. 使用vmap将单样本前向传播自动批量化。与手动批量实现比较性能。

## 关键术语

| 术语   | 人们怎么说   | 实际含义                                 |
| ------ | ------------ | ---------------------------------------- |
| JAX    | "函数式ML"   | Google开发的高性能数值计算框架           |
| XLA    | "编译器"     | 加速线性代数编译器，优化JAX代码          |
| jit    | "即时编译"   | 将Python函数编译为高效机器码             |
| vmap   | "自动向量化" | 自动将单样本函数扩展为批量函数           |
| 纯函数 | "无副作用"   | 相同输入总是产生相同输出，不修改外部状态 |
