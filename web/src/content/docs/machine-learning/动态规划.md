---
title: 动态规划
description: 策略评估、策略改进与价值迭代，已知模型下的最优策略求解
module: 'machine-learning'
difficulty: intermediate
tags:
  - 动态规划
  - 策略评估
  - 策略迭代
  - 价值迭代
  - 贝尔曼方程
related:
  - 'machine-learning/策略梯度与REINFORCE'
  - 'machine-learning/超参数调优'
  - 'machine-learning/多智能体强化学习'
  - 'machine-learning/仿真到现实迁移'
prerequisites:
  - 'machine-learning/机器学习概述'
---

# 动态规划

> 如果你知道转移函数 P 和奖励函数 R，你不需要学习——你可以计算。动态规划是 RL 的"上帝模式"：给定完美模型，精确求解最优策略。实践中你几乎从不知道完美模型，但 DP 算法是所有 RL 方法的基础。

**类型:** 构建
**语言:** Python
**前置知识:** Phase 9 · 01 (MDP)
**时间:** ~60 分钟

## 问题

给定一个完全已知的 MDP `(S, A, R, P, γ)`，找到最优策略 `π*`。这是 RL 的"简单"版本——没有学习，没有探索，只有计算。但即使这个"简单"问题在状态空间大时也是计算上不可行的（维数灾难）。

动态规划利用贝尔曼方程的递归结构来高效计算价值函数和最优策略。

## 核心概念

**策略评估 (Prediction)。** 给定策略 π，计算 V^π。迭代应用贝尔曼期望方程直到收敛：

```
V_{k+1}(s) = Σ_a π(a|s) · Σ_{s'} P(s'|s,a) · [R(s,a,s') + γ · V_k(s')]
```

每一步都是一次"备份"——用后继状态的价值更新当前状态的价值。收敛到 V^π 是保证的（压缩映射定理）。

**策略改进。** 给定 V^π，构造更好的策略 π'：

```
π'(s) = argmax_a Σ_{s'} P(s'|s,a) · [R(s,a,s') + γ · V^π(s')]
```

策略改进定理保证 V^π' ≥ V^π（对所有状态）。贪心地选择最优动作不会让策略变差。

**策略迭代。** 交替策略评估和策略改进：

```
π_0 → V^{π_0} → π_1 → V^{π_1} → π_2 → ... → π*
```

有限 MDP 中保证在有限步内收敛到最优策略。

**价值迭代。** 直接应用贝尔曼最优方程，不显式维护策略：

```
V_{k+1}(s) = max_a Σ_{s'} P(s'|s,a) · [R(s,a,s') + γ · V_k(s')]
```

结合了策略评估和策略改进为一步。收敛到 V\*，然后提取最优策略。

**异步 DP。** 不需要每次更新所有状态。可以按任意顺序更新，只要每个状态被无限次访问。实际变体：

- **就地 DP。** 用最新值更新，不维护旧副本。
- **优先级扫描。** 优先更新贝尔曼误差大的状态。
- **实时 DP。** 只更新智能体实际访问过的状态。

## 策略迭代 vs 价值迭代

| 方面     | 策略迭代                       | 价值迭代         |
| -------- | ------------------------------ | ---------------- |
| 每次迭代 | 策略评估（多次备份）+ 策略改进 | 一次备份         |
| 收敛速度 | 通常更少外层迭代               | 通常更多外层迭代 |
| 每步计算 | 策略评估昂贵                   | 每步便宜         |
| 内存     | 需要存储策略                   | 只需价值函数     |
| 适用场景 | 动作空间小                     | 状态空间大       |

## 动手构建

`code/main.py` 在网格世界上实现了策略迭代和价值迭代。

### 步骤 1：策略评估

```python
def policy_eval(policy, P, R, gamma, theta=1e-6):
    V = {s: 0.0 for s in states}
    while True:
        delta = 0
        for s in states:
            v = V[s]
            a = policy[s]
            V[s] = sum(P(s, a, s_next) * (R(s, a, s_next) + gamma * V[s_next])
                       for s_next in states)
            delta = max(delta, abs(v - V[s]))
        if delta < theta:
            break
    return V
```

### 步骤 2：策略改进

```python
def policy_improve(V, P, R, gamma):
    new_policy = {}
    for s in states:
        q_values = {}
        for a in actions:
            q_values[a] = sum(P(s, a, s_next) * (R(s, a, s_next) + gamma * V[s_next])
                             for s_next in states)
        new_policy[s] = max(q_values, key=q_values.get)
    return new_policy
```

### 步骤 3：策略迭代

```python
def policy_iteration(P, R, gamma):
    policy = {s: random.choice(actions) for s in states}
    while True:
        V = policy_eval(policy, P, R, gamma)
        new_policy = policy_improve(V, P, R, gamma)
        if new_policy == policy:
            break
        policy = new_policy
    return policy, V
```

### 步骤 4：价值迭代

```python
def value_iteration(P, R, gamma, theta=1e-6):
    V = {s: 0.0 for s in states}
    while True:
        delta = 0
        for s in states:
            v = V[s]
            V[s] = max(
                sum(P(s, a, s_next) * (R(s, a, s_next) + gamma * V[s_next])
                    for s_next in states)
                for a in actions
            )
            delta = max(delta, abs(v - V[s]))
        if delta < theta:
            break
    policy = policy_improve(V, P, R, gamma)
    return policy, V
```

## 常见陷阱

- **维数灾难。** 状态数随变量数指数增长。4 个变量各 10 个值 = 10,000 状态。10 个变量 = 10^10 状态。DP 在大状态空间上不可行。
- **策略评估收敛慢。** 当 γ 接近 1 时，策略评估需要更多迭代。修复：截断评估（k 次迭代后停止），或切换到价值迭代。
- **就地更新的顺序。** 就地 DP 的收敛速度取决于更新顺序。反向扫描（从终止状态开始）通常更快。
- **数值精度。** 浮点误差在多次迭代后累积。使用 `theta` 阈值避免无限循环。
- **忽略终止状态。** 终止状态的 V = 0，且不应被更新。忘记这个导致错误结果。

## 实际应用

| 场景                 | DP 适用性                       |
| -------------------- | ------------------------------- |
| 小状态空间已知模型   | 完美适用                        |
| 大状态空间已知模型   | 需要近似 DP                     |
| 未知模型             | 不适用（需要第 03-08 课的方法） |
| 连续状态空间         | 不适用（需要函数近似）          |
| 在线规划（模型已知） | 适用于实时搜索                  |

## 交付物

保存 `outputs/skill-dp-solver.md`。技能接收 MDP 描述 + 状态空间大小，输出：算法选择（策略迭代 vs 价值迭代 vs 异步 DP）、收敛阈值和预期迭代次数。

## 练习

1. **简单。** 运行 `code/main.py`，比较策略迭代和价值迭代的收敛速度（迭代次数和挂钟时间）。
2. **中等。** 实现截断策略评估：只运行 k=3 次策略评估迭代（而非完全收敛）。比较与完全策略评估的最终策略质量。
3. **困难。** 实现优先级扫描：维护一个优先级队列，优先更新贝尔曼误差最大的状态。比较与标准价值迭代的收敛速度。

## 关键术语

| 术语       | 人们怎么说      | 实际含义                             |
| ---------- | --------------- | ------------------------------------ |
| 策略评估   | "预测"          | 给定策略，计算价值函数。             |
| 策略改进   | "贪心改进"      | 基于当前价值函数，贪心选择最优动作。 |
| 策略迭代   | "评估-改进循环" | 交替策略评估和策略改进直到收敛。     |
| 价值迭代   | "直接最优"      | 直接应用贝尔曼最优方程。             |
| 贝尔曼备份 | "一步更新"      | 用后继状态的价值更新当前状态的价值。 |
| 维数灾难   | "状态爆炸"      | 状态数随变量数指数增长。             |
| 异步 DP    | "按需更新"      | 不每次更新所有状态，按优先级更新。   |

## 生产笔记：DP 在线规划的复兴

虽然 DP 在大状态空间上不可行用于离线求解，但它在在线规划中复兴——特别是蒙特卡洛树搜索 (MCTS) 和模型预测控制 (MPC)：

- **MCTS。** AlphaGo/Zero 的核心。在当前状态构建搜索树，用 DP 式备份评估节点。不需要全局求解——只关注当前决策。
- **MPC。** 机器人控制的标准。在当前状态求解有限时域 MDP（用 DP 或优化），执行第一步，重新规划。每步都是一个小 DP 问题。
- **Planner-learner 架构。** 学习模型（转移函数），用 DP 规划。Dyna-Q, MBPO, MuZero 都使用这种模式。

## 延伸阅读

- [Sutton & Barto (2018). Reinforcement Learning: An Introduction](http://incompleteideas.net/book/the-book.html) — 第 4 章。
- [Bertsekas (2017). Dynamic Programming and Optimal Control](https://www.mit.edu/~dimitrib/DPbook.html) — DP 圣经。
- [Silver et al. (2016). Mastering the game of Go with deep neural networks and tree search](https://www.nature.com/articles/nature16961) — AlphaGo，MCTS + DP。
