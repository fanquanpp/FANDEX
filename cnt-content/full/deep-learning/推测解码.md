---
title: 推测解码
description: '自回归解码是串行的,每个token等待前一个,推测解码打破链条:便宜模型起草N个token,昂贵模型一次前向验证所有N个'
module: 'deep-learning'
difficulty: advanced
tags:
  - 推测解码
  - 推理加速
  - EAGLE
  - Medusa
  - 采样
related:
  - 'deep-learning/损失函数'
  - 'deep-learning/缩放定律'
  - 'deep-learning/完整Transformer'
  - 'deep-learning/为什么需要Transformer'
prerequisites:
  - 'deep-learning/深度学习概述'
---

# 推测解码 — 起草、验证、重复

> 自回归解码是串行的。每个token等待前一个。推测解码打破链条:便宜模型起草N个token,昂贵模型一次前向验证所有N个。当草稿正确时,你为N个生成支付了一次大模型前向。

**类型:** 构建
**语言:** Python
**前置知识:** 阶段7 · 07(GPT因果LM), 阶段7 · 12(KV缓存与Flash Attention)
**预计时间:** ~60分钟

## 问题所在

70B LLM采样一个token在H100上约需30 ms。3B草稿模型约需3 ms。如果我们让3B草稿5个token,然后运行70B*一次*验证所有5个,总共是 `5×3 + 30 = 45 ms` 最多5个被接受的token——而直线生成是 `5×30 = 150 ms`。这就是完整的推测解码推销:用少量额外GPU内存(草稿模型)换取2-4倍更低的解码延迟。

这个技巧必须保持分布。推测采样,由Leviathan et al. (2023)和Chen et al.同时引入,保证输出序列与大模型自己产生的**同分布**。没有质量权衡。只是更快。

四类草稿-验证对主导2026年推理:

1. **朴素推测(Leviathan 2023)。** 独立草稿模型(如Llama 3 1B) + 验证器(如Llama 3 70B)。
2. **Medusa (Cai 2024)。** 验证器上的多个解码头并行预测位置 `t+1..t+k`。无单独草稿模型。
3. **EAGLE家族(Li 2024, 2025)。** 重用验证器隐藏状态的轻量草稿;比朴素更高的接受率;典型3-4倍。
4. **前看解码(Fu 2024)。** Jacobi迭代;完全不需要草稿模型。自推测。小众但无依赖。

2026年每个生产推理栈默认提供推测解码。vLLM, TensorRT-LLM, SGLang和llama.cpp都至少支持朴素 + EAGLE-2。

## 核心概念

### 核心算法

给定验证器 `M_q` 和更便宜的草稿 `M_p`:

1. 设 `x_1..x_k` 为已解码的前缀。
2. **起草**: 使用 `M_p` 自回归地提出 `d_{k+1}, d_{k+2}, ..., d_{k+N}`,带草稿概率 `p_1..p_N`。
3. **并行验证**: 在 `x_1..x_k, d_{k+1}, ..., d_{k+N}` 上运行一次 `M_q`,获得位置 `k+1..k+N+1` 的验证器概率 `q_1..q_{N+1}`。
4. **从左到右接受/拒绝每个草稿token**: 对于每个 `i`,以概率 `min(1, q_i(d_i) / p_i(d_i))` 接受。
5. 在位置 `j` 首次拒绝时:从"残差"分布 `(q_j - p_j)_+` 归一化后采样 `t_j`。`j` 之后的所有草稿被丢弃。
6. 接受所有 `N` 个时:从 `q_{N+1}` 采样一个额外token `t_{N+1}`(免费奖励token)。

残差分布技巧是保持输出分布与 `M_q` 从头采样完全相同的数学洞见。

### 什么决定加速

设 `α` = 每个草稿token的期望接受率。设 `c` = 草稿与验证器成本比。每步:

- 朴素生成每token做1次大模型调用。
- 推测在 `α` 高时每 `(1 - α^{N+1}) / (1 - α) ≈ 1/(1-α)` 个token做1次大模型调用。

`α = 0.75` 和 `N = 5` 时的典型经验法则:3倍更少大模型调用。草稿成本是5倍便宜。总挂钟降低约2.5倍。

**α取决于:**

- 草稿多好地近似验证器。同家族/同训练数据显著提升α。
- 解码策略。贪心草稿对贪心验证器:高α。温度采样:更难匹配;接受率下降。
- 任务类型。代码和结构化输出接受更多(可预测);自由形式创意写作接受更少。

### Medusa — 无草稿模型的草稿

Medusa用验证器上的额外输出头替换草稿模型。在位置 `t`:

```
共享主干 → 隐藏 h_t
    ├── head_0: 预测 t+1 位置的token  (标准LM头)
    ├── head_1: 预测 t+2 位置的token
    ├── head_2: 预测 t+3 位置的token
    ├── head_3: 预测 t+4 位置的token
```

每个头输出自己的logits。推理时你从每个头采样得到候选序列,然后用树注意力方案一次前向验证所有候选延续。

优点:无第二个模型。缺点:增加可训练参数;需要监督微调阶段(约1B token);接受率比带好草稿的朴素推测略低。

### EAGLE — 通过重用隐藏状态获得更好草稿

EAGLE-1/2/3(Li et al., 2024-2025)使草稿模型成为摄入验证器最后层隐藏状态的微型transformer(通常1层)。因为草稿看到验证器的特征表示,其预测与验证器的输出分布强相关。接受率从约0.6(朴素)攀升到0.85+。

EAGLE-3(2025)添加了候选延续的树搜索。vLLM和SGLang将EAGLE-2/3作为Llama 3/4和Qwen 3的默认推测路径。

### KV缓存舞蹈

验证在一次前向传播中将 `N` 个草稿token喂入验证器。这扩展了验证器的KV缓存 `N` 个条目。如果一些草稿被拒绝,你必须将缓存回滚到接受的前缀长度。

生产实现(vLLM的 `--speculative-model`, TensorRT-LLM的LookaheadDecoder)用临时KV缓冲区处理这个。先写,接受时提交。概念上不难,但比较繁琐。

## 动手构建

参见 `code/main.py`。我们实现核心推测采样算法(拒绝步骤 + 残差分布):

- "大模型"是对手工编码分布的确定性softmax(这样我们可以解析验证接受数学)。
- "草稿模型"是大模型的扰动。
- 接受/拒绝循环产生与直接采样相同的边际分布。

### 步骤1:拒绝步骤

```python
def accept_or_reject(q_prob, p_prob, draft_token, u):
    ratio = q_prob / p_prob if p_prob > 0 else float("inf")
    return u < min(1.0, ratio)
```

`u` 是均匀随机数。`q_prob` 是验证器对草稿token的概率。`p_prob` 是草稿模型的概率。Leviathan定理是,这个伯努利决策,加上拒绝时从残差采样,精确保持验证器的分布。

### 步骤2:残差分布

```python
def residual_dist(q, p):
    raw = [max(0.0, qi - pi) for qi, pi in zip(q, p)]
    s = sum(raw)
    return [r / s for r in raw]
```

从 `q` 逐元素减去 `p`,将负值钳制为零,重新归一化。在任何拒绝时从中采样。

### 步骤3:一个推测步骤

```python
def spec_step(prefix, q_model, p_model, N, rng):
    drafts = []
    p_probs = []
    ctx = list(prefix)
    for _ in range(N):
        p_dist = p_model(ctx)
        d = sample(p_dist, rng)
        drafts.append(d)
        p_probs.append(p_dist[d])
        ctx.append(d)

    q_dists = [q_model(prefix + drafts[:i]) for i in range(N + 1)]

    for i, d in enumerate(drafts):
        u = rng.random()
        q_prob = q_dists[i][d]
        p_prob = p_probs[i]
        if u < min(1.0, q_prob / p_prob if p_prob > 0 else float("inf")):
            prefix = prefix + [d]
        else:
            res = residual_dist(q_dists[i], p_model(prefix))
            prefix = prefix + [sample(res, rng)]
            return prefix
    prefix = prefix + [sample(q_dists[N], rng)]
    return prefix
```

五个被接受 → 一个奖励 → 一次验证器传递产生六个token。

### 步骤4:测量接受率

在不同草稿质量水平下运行10,000个推测步骤。绘制接受率 vs 草稿与验证器分布之间的KL散度。你应该看到清晰的单调关系。

### 步骤5:验证分布等价

经验上:推测循环产生的token直方图应该匹配直接从验证器采样产生的直方图。这是Leviathan定理的实践。卡方检验在采样误差内确认。

## 实际应用

生产:

```bash
# vLLM with EAGLE
vllm serve meta-llama/Llama-3.1-70B-Instruct \
    --speculative-model /models/llama-3.1-eagle-70b \
    --speculative-draft-tensor-parallel-size 1 \
    --num-speculative-tokens 5

# vLLM with vanilla draft model
vllm serve meta-llama/Llama-3.1-70B-Instruct \
    --speculative-model meta-llama/Llama-3.2-1B-Instruct \
    --num-speculative-tokens 5
```

TensorRT-LLM截至2026年中期有最快的Medusa路径。`faster-whisper` 为Whisper-large用小型草稿封装推测解码。

**选择草稿:**

| 策略                      | 何时选择                 | 加速      |
| ------------------------- | ------------------------ | --------- |
| 朴素草稿(1B/3B Llama家族) | 快速原型,无训练          | 1.8-2.3倍 |
| Medusa头                  | 你可以微调验证器         | 2-3倍     |
| EAGLE-2 / 3               | 生产,最大速度            | 3-4倍     |
| 前看                      | 无草稿,无训练,无额外参数 | 1.3-1.6倍 |

**何时不使用推测解码:**

- 1-5个token的单序列生成。开销主导。
- 高度创意/高温采样(α下降)。
- 内存受限部署(草稿模型增加VRAM)。

## 交付成果

参见 `outputs/skill-spec-decode-picker.md`。该技能为新的推理工作负载选择推测解码策略(朴素/Medusa/EAGLE/前看)和调优参数(N, 草稿温度)。

## 练习

1. **简单。** 运行 `code/main.py`。确认50,000个token上推测token分布与验证器直接采样分布匹配,卡方p > 0.05。
2. **中等。** 绘制加速(每次大模型前向的token数)作为 `N` 的函数,`α = 0.5, 0.7, 0.85`。确定每个α的最优 `N`。(提示:每次验证调用的期望token = `(1 - α^{N+1}) / (1 - α)`。)
3. **困难。** 实现微型Medusa:取第14课的毕业项目GPT,添加3个额外LM头预测位置t+2, t+3, t+4。在tinyshakespeare上用联合多头损失训练。与截断同一模型制作的朴素草稿比较接受率。
4. **困难。** 实现回滚:从10-token前缀KV缓存开始,喂入5个草稿token,模拟位置3的拒绝。验证你的缓存在下一次迭代时正确读取"前缀 + 前2个被接受的草稿"。

## 关键术语

| 术语      | 人们怎么说         | 实际含义                                               |
| --------- | ------------------ | ------------------------------------------------------ |
| 草稿模型  | "便宜的那个"       | 提出候选token的更小模型;通常比验证器便宜10-50倍。      |
| 验证器    | "大的那个"         | 我们保持其分布的目标模型;每个推测步骤运行一次。        |
| 接受率(α) | "草稿多久正确一次" | 验证器接受草稿的每token概率。典型0.7-0.9。             |
| 残差分布  | "拒绝的后备"       | `(q - p)_+` 归一化;拒绝时从中采样保持验证器的分布。    |
| 奖励token | "免费的"           | 当所有N个草稿被接受时,从验证器的下一步分布多采样一个。 |
| Medusa    | "无草稿推测"       | 验证器上的多个LM头并行预测位置t+1..t+k。               |
| EAGLE     | "隐藏状态草稿"     | 以验证器最后层隐藏状态为条件的小型transformer草稿。    |
| 前看解码  | "Jacobi迭代"       | 使用不动点迭代的自推测;无草稿模型。                    |
| 树注意力  | "一次验证多个候选" | 同时考虑多个草稿延续的分支验证。                       |
| KV回滚    | "撤销被拒绝的草稿" | 临时KV缓冲;接受时提交,拒绝时丢弃。                     |

## 延伸阅读

- [Leviathan, Kalman, Matias (2023). Fast Inference from Transformers via Speculative Decoding](https://arxiv.org/abs/2211.17192) — 核心算法和等价定理。
- [Chen et al. (2023). Accelerating Large Language Model Decoding with Speculative Sampling](https://arxiv.org/abs/2302.01318) — 同时引入;干净的伯努利拒绝证明。
- [Cai et al. (2024). Medusa: Simple LLM Inference Acceleration Framework with Multiple Decoding Heads](https://arxiv.org/abs/2401.10774) — Medusa论文;树注意力验证。
- [Li et al. (2024). EAGLE: Speculative Sampling Requires Rethinking Feature Uncertainty](https://arxiv.org/abs/2401.15077) — EAGLE-1;隐藏状态条件草稿。
- [Li et al. (2024). EAGLE-2: Faster Inference of Language Models with Dynamic Draft Trees](https://arxiv.org/abs/2406.16858) — EAGLE-2;动态树深度。
- [Li et al. (2025). EAGLE-3: Scaling up Inference Acceleration of Large Language Models via Training-Time Test](https://arxiv.org/abs/2503.01840) — EAGLE-3。
- [Fu et al. (2024). Break the Sequential Dependency of LLM Inference Using Lookahead Decoding](https://arxiv.org/abs/2402.02057) — 前看,无草稿方法。
- [vLLM docs — Speculative Decoding](https://docs.vllm.ai/en/latest/features/spec_decode.html) — 规范生产参考,四种策略都已接入。
- [SafeAILab / EAGLE reference implementation](https://github.com/SafeAILab/EAGLE) — EAGLE-1/2/3的参考代码。
