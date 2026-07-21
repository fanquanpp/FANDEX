---
title: 'MDP -- 状态、动作与奖励'
description: 马尔可夫决策过程的形式化定义，状态、动作、奖励、转移函数与折扣因子
module: 'machine-learning'
difficulty: beginner
tags:
  - MDP
  - 马尔可夫决策过程
  - 状态
  - 动作
  - 奖励
  - 折扣因子
related:
  - 'machine-learning/DQN深度Q网络'
  - 'machine-learning/KNN与距离度量'
  - 'machine-learning/ML流水线'
  - 'machine-learning/PPO近端策略优化'
prerequisites:
  - 'machine-learning/机器学习概述'
---

# MDP -- 状态、动作与奖励

> 每一个强化学习问题——从下棋到训练聊天机器人——都是一个 MDP。如果你不能将你的问题写成 `(S, A, R, P, γ)`，你就无法正式解决它。如果你能，你就有了数学来推理最优行为。

**类型:** 学习
**语言:** Python
**前置知识:** Phase 2 · 01 (ML 基础), Phase 2 · 05 (概率)
**时间:** ~45 分钟

## 问题

监督学习：给定输入，预测输出。强化学习 (RL)：给定一个环境，学习通过试错最大化累积奖励。没有标记数据。只有延迟的、稀疏的反馈信号。

RL 的形式化框架是马尔可夫决策过程 (MDP)。一个 MDP 是一个五元组 `(S, A, R, P, γ)`：

- **S** — 状态空间。智能体可以处于的所有可能情况。
- **A** — 动作空间。智能体可以采取的所有可能行动。
- **R(s, a, s')** — 奖励函数。在状态 s 采取动作 a 并到达 s' 获得的即时奖励。
- **P(s' | s, a)** — 转移函数。在状态 s 采取动作 a 后到达 s' 的概率。
- **γ** — 折扣因子。未来奖励相对于即时奖励的重要性，γ ∈ [0, 1]。

**马尔可夫性质。** 未来只取决于当前状态，不取决于历史。`P(s_{t+1} | s_t, a_t, s_{t-1}, ...) = P(s_{t+1} | s_t, a_t)`。这是简化——如果状态定义良好（包含所有相关信息），它大致成立。

## 核心概念

**策略 π(a|s)。** 从状态到动作的映射。确定性策略：`π(s) = a`。随机策略：`π(a|s)` = 在状态 s 选择动作 a 的概率。RL 的目标是找到最优策略 `π*`。

**价值函数 V^π(s)。** 从状态 s 开始，遵循策略 π 的期望累积折扣奖励：

```
V^π(s) = E[ Σ_{t=0}^∞ γ^t · R(s_t, a_t, s_{t+1}) | s_0 = s, π ]
```

**动作价值函数 Q^π(s, a)。** 从状态 s 采取动作 a 开始，然后遵循策略 π 的期望累积折扣奖励：

```
Q^π(s, a) = E[ Σ_{t=0}^∞ γ^t · R(s_t, a_t, s_{t+1}) | s_0 = s, a_0 = a, π ]
```

**贝尔曼方程。** V 和 Q 的递归关系：

```
V^π(s) = Σ_a π(a|s) · Σ_{s'} P(s'|s,a) · [R(s,a,s') + γ · V^π(s')]

Q^π(s, a) = Σ_{s'} P(s'|s,a) · [R(s,a,s') + γ · Σ_{a'} π(a'|s') · Q^π(s', a')]
```

**最优性。** 最优策略 π\* 最大化所有状态的价值：

```
V*(s) = max_a Σ_{s'} P(s'|s,a) · [R(s,a,s') + γ · V*(s')]

Q*(s, a) = Σ_{s'} P(s'|s,a) · [R(s,a,s') + γ · max_{a'} Q*(s', a')]
```

**折扣因子 γ。** 控制未来奖励的重要性：

- γ = 0：只关心即时奖励（短视）
- γ = 1：同等关心所有未来奖励（可能导致无限和）
- γ ≈ 0.9-0.99：标准选择，平衡即时和长期

## 动手构建

`code/main.py` 实现了一个简单的网格世界 MDP，并计算最优价值函数。

### 步骤 1：定义 MDP

```python
# 4x4 grid world
states = [(r, c) for r in range(4) for c in range(4)]
actions = ['up', 'down', 'left', 'right']
gamma = 0.9

def transition(s, a):
    r, c = s
    if a == 'up':    return (max(r-1, 0), c)
    if a == 'down':  return (min(r+1, 3), c)
    if a == 'left':  return (r, max(c-1, 0))
    if a == 'right': return (r, min(c+1, 3))

def reward(s, a, s_next):
    if s_next == (3, 3): return 1.0   # goal
    if s_next == (1, 1): return -1.0  # trap
    return -0.01                        # small step cost
```

### 步骤 2：价值迭代

```python
def value_iteration(states, actions, transition, reward, gamma, theta=1e-6):
    V = {s: 0.0 for s in states}
    while True:
        delta = 0
        for s in states:
            v = V[s]
            V[s] = max(
                sum(P * (reward(s, a, s_next) + gamma * V[s_next])
                    for s_next, P in get_transitions(s, a))
                for a in actions
            )
            delta = max(delta, abs(v - V[s]))
        if delta < theta:
            break
    return V
```

### 步骤 3：提取最优策略

```python
def extract_policy(V, states, actions, transition, reward, gamma):
    policy = {}
    for s in states:
        q_values = {
            a: sum(P * (reward(s, a, s_next) + gamma * V[s_next])
                   for s_next, P in get_transitions(s, a))
            for a in actions
        }
        policy[s] = max(q_values, key=q_values.get)
    return policy
```

## 常见陷阱

- **状态定义不当。** 如果状态不包含做出最优决策所需的所有信息，马尔可夫性质被违反。修复：扩展状态空间（添加历史特征）。
- **奖励设计困难。** 奖励塑造是 RL 中最难的部分。太稀疏（只有目标奖励）= 难学习。太密集 = 可能产生意外行为。修复：从简单奖励开始，逐步添加塑造。
- **γ 太大。** γ = 1 导致价值函数可能不收敛（无限和）。修复：γ < 1，通常 0.9-0.99。
- **忽略终止状态。** 终止状态的 V = 0（没有未来）。忘记这个导致错误的价值函数。
- **动作空间太大。** 连续动作空间（如关节角度）不能简单枚举。需要函数近似（后续课程）。

## 实际应用

| 问题       | 状态            | 动作           | 奖励                |
| ---------- | --------------- | -------------- | ------------------- |
| 棋类游戏   | 棋盘位置        | 合法走步       | 胜/负/平            |
| 机器人控制 | 关节角度 + 速度 | 扭矩           | 任务完成 - 能量消耗 |
| 推荐系统   | 用户历史        | 推荐项目       | 点击/购买           |
| 训练 LLM   | 对话上下文      | 生成的 token   | 人类偏好分数        |
| 自动驾驶   | 传感器数据      | 转向/加速/刹车 | 安全 + 效率         |
| 交易       | 市场状态        | 买/卖/持有     | 利润                |

## 交付物

保存 `outputs/skill-mdp-designer.md`。技能接收问题描述，输出：状态空间定义、动作空间定义、奖励函数设计、折扣因子选择和已知挑战。

## 练习

1. **简单。** 修改 `code/main.py`，添加一个额外的陷阱状态。观察最优策略如何改变以避开新陷阱。
2. **中等。** 实现策略迭代：从随机策略开始，交替进行策略评估和策略改进步骤，直到收敛。与价值迭代比较收敛速度。
3. **困难。** 将网格世界扩展为随机转移（80% 概率按预期移动，20% 概率垂直方向移动）。重新计算最优策略。策略如何变化？

## 关键术语

| 术语         | 人们怎么说         | 实际含义                              |
| ------------ | ------------------ | ------------------------------------- |
| MDP          | "马尔可夫决策过程" | RL 的形式化框架：`(S, A, R, P, γ)`。  |
| 策略 π       | "行为规则"         | 从状态到动作的映射。                  |
| 价值函数 V   | "状态有多好"       | 从某状态开始的期望累积奖励。          |
| Q 函数       | "动作有多好"       | 从某状态采取某动作的期望累积奖励。    |
| 贝尔曼方程   | "递归关系"         | V/Q 的递归定义，RL 算法的基础。       |
| 折扣因子 γ   | "未来有多重要"     | 0 = 短视，1 = 远视，0.9-0.99 = 标准。 |
| 马尔可夫性质 | "无记忆"           | 未来只取决于当前状态。                |

## 生产笔记：MDP 设计是 RL 工程中最被低估的技能

在 RL 研究中，算法是明星。在 RL 工程中，MDP 设计是决定成败的因素。三个最常见的生产失败模式：

1. **奖励作弊。** 智能体找到奖励函数的漏洞，获得高奖励但行为不符合预期。经典案例：CoastRunner 赛艇游戏，智能体在角落无限转圈收集道具而不完成比赛。修复：多目标奖励，人类偏好集成，对抗性奖励审查。
2. **状态表示不足。** 智能体需要历史信息做出最优决策，但状态只包含当前观察。修复：堆叠帧，RNN 隐藏状态，或显式历史特征。
3. **动作空间不匹配。** 动作太粗（无法精细控制）或太细（探索空间太大）。修复：分层动作空间，动作参数化，或课程学习。

## 延伸阅读

- [Sutton & Barto (2018). Reinforcement Learning: An Introduction](http://incompleteideas.net/book/the-book.html) — RL 教科书，第 3 章。
- [Puterman (2014). Markov Decision Processes: Discrete Stochastic Dynamic Programming](https://onlinelibrary.wiley.com/doi/book/10.1002/9780470316887) — MDP 理论。
- [Dewey (2014). Reinforcement Learning and the Reward Engineering Principle](https://aaai.org/ocs/index.php/SSS/SSS14/paper/view/7731) — 奖励工程。
