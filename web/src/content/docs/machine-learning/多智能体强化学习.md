---
title: 多智能体强化学习
description: 多智能体环境中的合作与竞争，从独立学习到通信与协调
module: 'machine-learning'
difficulty: advanced
tags:
  - 多智能体
  - MARL
  - 合作
  - 竞争
  - 通信
  - Nash均衡
related:
  - 'machine-learning/超参数调优'
  - 'machine-learning/动态规划'
  - 'machine-learning/仿真到现实迁移'
  - 'machine-learning/集成方法'
prerequisites:
  - 'machine-learning/机器学习概述'
---

# 多智能体强化学习

> 单智能体 RL 假设环境是固定的。多智能体 RL (MARL) 假设环境包含其他学习智能体——你变，它们也变。这创造了非平稳性（策略不断变化）、信用分配（谁该得奖励？）和可扩展性（智能体数 × 状态空间）三大挑战。

**类型:** 学习
**语言:** Python
**前置知识:** Phase 9 · 08 (PPO), Phase 9 · 01 (MDP)
**时间:** ~60 分钟

## 问题

当多个智能体同时学习和行动时，每个智能体面对的环境是非平稳的——其他智能体的策略在变化。这打破了单智能体 RL 的基本假设（环境固定），导致：

1. **非平稳性。** 昨天有效的策略今天可能无效，因为对手变了。
2. **信用分配。** 团队获得奖励，但谁的贡献最大？
3. **可扩展性。** N 个智能体的联合状态空间指数增长。

MARL 有两种基本设定：

- **合作。** 智能体共享奖励，需要协调行动最大化团队回报。
- **竞争。** 智能体有对立奖励，需要预测和反制对手策略。

## 核心概念

**独立 Q 学习 (IQL)。** 最简单的基线：每个智能体独立运行 Q 学习，忽略其他智能体。优点：简单，可扩展。缺点：非平稳性导致不稳定。

**集中训练分散执行 (CTDE)。** 训练时使用全局信息（所有智能体的观察和动作），执行时每个智能体只用自己的观察。这是 MARL 最成功的范式。

**QMIX。** Rashid et al. (2018)。合作 MARL。每个智能体有自己的 Q 网络，但混合网络保证全局 Q 值是局部 Q 值的单调函数：

```
Q_tot(s, a) = f(Q_1(s_1, a_1), Q_2(s_2, a_2), ..., Q_n(s_n, a_n))
```

其中 f 是单调的。这保证局部 argmax = 全局 argmax，使分散执行成为可能。

**MAPPO。** 多智能体 PPO。每个智能体有自己的 Actor，Critic 使用全局信息。2026 年合作 MARL 的标准基线。

**通信。** 智能体学习发送消息给队友：

- **CommNet。** 连续通信通道，所有智能体共享。
- **TarMAC。** 目标驱动通信，智能体选择接收者。
- **QMIX + 通信。** 在 QMIX 基础上添加通信模块。

**自博弈。** 竞争 MARL 的主要训练方法：智能体与自己过去版本对弈。AlphaGo, OpenAI Five, AlphaStar 都使用自博弈。

- **虚构自博弈。** 对手策略是过去所有策略的平均。
- **优先虚构自博弈。** 优先与更强的过去版本对弈。

**Nash 均衡。** 博弈论解概念：没有智能体可以通过单方面改变策略来提高回报。MARL 的目标通常是找到 Nash 均衡。

## 动手构建

`code/main.py` 实现了一个简化的多智能体环境（2 个智能体合作到达目标）和 IQL 基线。

### 步骤 1：多智能体环境

```python
class MultiAgentEnv:
    def __init__(self, n_agents=2):
        self.n_agents = n_agents
        self.positions = [(0, 0)] * n_agents
        self.goal = (3, 3)

    def step(self, actions):
        rewards = []
        for i, a in enumerate(actions):
            self.positions[i] = move(self.positions[i], a)
            dist = manhattan(self.positions[i], self.goal)
            rewards.append(-dist / 10)  # individual shaping reward

        # Team bonus: all agents at goal
        if all(p == self.goal for p in self.positions):
            team_reward = 10.0
            rewards = [r + team_reward for r in rewards]

        return self.get_obs(), rewards, all(p == self.goal for p in self.positions)
```

### 步骤 2：独立 Q 学习

```python
class IQL:
    def __init__(self, n_agents, state_dim, n_actions):
        self.agents = [DQNAgent(state_dim, n_actions) for _ in range(n_agents)]

    def act(self, observations, epsilon):
        actions = []
        for i, obs in enumerate(observations):
            actions.append(self.agents[i].act(obs, epsilon))
        return actions

    def update(self, transitions):
        for i, agent in enumerate(self.agents):
            obs, action, reward, next_obs, done = transitions[i]
            agent.update(obs, action, reward, next_obs, done)
```

### 步骤 3：QMIX 混合网络（概念）

```python
class QMIX:
    def __init__(self, n_agents, state_dim, n_actions, hidden_dim=32):
        self.agent_nets = [QNet(state_dim, n_actions) for _ in range(n_agents)]
        self.mix_net = MixingNetwork(n_agents, state_dim, hidden_dim)

    def forward(self, observations, state):
        q_values = [net(obs) for net, obs in zip(self.agent_nets, observations)]
        q_total = self.mix_net(q_values, state)  # monotonic mixing
        return q_total, q_values
```

## 常见陷阱

- **非平稳性。** IQL 在非平稳环境中不稳定。修复：CTDE 框架，或经验回放中存储其他智能体的动作。
- **信用分配困难。** 团队奖励无法区分个体贡献。修复：差异奖励（每个智能体的奖励 = 团队奖励 - 没有该智能体的团队奖励），或 QMIX 的单调性约束。
- **可扩展性。** N 个智能体的联合动作空间指数增长。修复：因子化联合动作（QMIX），或参数共享（同构智能体共享网络）。
- **通信瓶颈。** 通信带宽有限。修复：学习何时通信（门控机制），或压缩消息。
- **自博弈循环。** 竞争智能体可能在策略间循环（石头-剪刀-布）。修复：虚构自博弈，或策略池。
- **评估困难。** 多智能体策略的强度取决于对手。修复：评估对抗多种对手，或 Elo 评分。

## 实际应用

| 场景           | 方法           |
| -------------- | -------------- |
| 多机器人协调   | MAPPO / QMIX   |
| 自动驾驶       | MARL + 通信    |
| 游戏 AI (团队) | 自博弈 + MAPPO |
| 游戏 AI (1v1)  | 自博弈 + PPO   |
| 交通信号控制   | QMIX / MAPPO   |
| 供应链优化     | 合作 MARL      |
| 经济模拟       | 竞争 MARL      |

## 交付物

保存 `outputs/skill-marl-designer.md`。技能接收多智能体问题描述，输出：框架选择（CTDE vs 独立）、算法选择、通信机制和评估协议。

## 练习

1. **简单。** 运行 `code/main.py`，比较 IQL 和 QMIX 在合作任务上的表现。QMIX 的单调性约束是否帮助？
2. **中等。** 实现参数共享：所有同构智能体共享同一个 Q 网络，但用智能体 ID 作为输入。比较与独立网络的样本效率。
3. **困难。** 实现简单的自博弈：训练两个竞争智能体，定期保存策略快照，与过去版本对弈。观察策略是否收敛还是循环。

## 关键术语

| 术语      | 人们怎么说         | 实际含义                             |
| --------- | ------------------ | ------------------------------------ |
| MARL      | "多智能体 RL"      | 多个智能体同时学习和行动。           |
| CTDE      | "集中训练分散执行" | 训练用全局信息，执行用局部信息。     |
| QMIX      | "单调混合"         | 保证全局 Q 是局部 Q 的单调函数。     |
| 自博弈    | "自己打自己"       | 智能体与自己过去版本对弈。           |
| 信用分配  | "谁的功劳"         | 将团队奖励归因到个体贡献。           |
| Nash 均衡 | "谁都不想变"       | 没有智能体可以单方面改善的策略组合。 |

## 生产笔记：MARL 的工程挑战

MARL 的生产部署比单智能体 RL 复杂得多：

- **分布式训练。** N 个智能体需要 N 个 actor 进程 + 1 个 learner。通信开销随 N 增长。
- **经验回放。** 需要存储联合转移 `(s_1, ..., s_N, a_1, ..., a_N, r, s'_1, ..., s'_N)`。存储量是单智能体的 N 倍。
- **评估。** 策略强度取决于对手。需要对抗多种对手评估，或使用 Elo 评分系统。
- **部署。** 分散执行意味着每个智能体只用自己的观察。如果通信延迟高，协调困难。

## 延伸阅读

- [Rashid et al. (2018). QMIX: Monotonic Value Function Factorisation for Deep Multi-Agent RL](https://arxiv.org/abs/1803.11485) — QMIX。
- [Yu et al. (2022). The Surprising Effectiveness of PPO in Cooperative Multi-Agent Games](https://arxiv.org/abs/2103.01955) — MAPPO。
- [Silver et al. (2016). Mastering the game of Go with deep neural networks and tree search](https://www.nature.com/articles/nature16961) — AlphaGo，自博弈。
- [Vinyals et al. (2019). Grandmaster level in StarCraft II using multi-agent reinforcement learning](https://www.nature.com/articles/s41586-019-1724-z) — AlphaStar。
- [OpenAI (2019). OpenAI Five](https://openai.com/blog/openai-five/) — Dota 2，大规模自博弈。
