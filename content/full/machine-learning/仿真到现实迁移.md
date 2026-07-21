---
title: 仿真到现实迁移
description: 从仿真环境训练到真实世界部署，域随机化与迁移学习的核心技术
module: 'machine-learning'
difficulty: advanced
tags:
  - 仿真到现实
  - 域随机化
  - 迁移学习
  - 域适应
  - 现实差距
related:
  - 'machine-learning/动态规划'
  - 'machine-learning/多智能体强化学习'
  - 'machine-learning/集成方法'
  - 'machine-learning/奖励建模与RLHF'
prerequisites:
  - 'machine-learning/机器学习概述'
---

# 仿真到现实迁移

> 在仿真中训练 RL 智能体是廉价的（百万步/秒）。在现实中训练是昂贵的（秒/步，还有硬件损坏风险）。问题是：仿真不是现实。仿真中有效的策略在现实中可能完全失败。仿真到现实迁移 (Sim2Real) 是让 RL 走出实验室的关键技术。

**类型:** 学习
**语言:** Python
**前置知识:** Phase 9 · 08 (PPO), Phase 9 · 05 (DQN)
**时间:** ~45 分钟

## 问题

仿真器是现实的不完美近似。差异来源：

- **物理差异。** 摩擦力、质量、惯性不准确。
- **传感器差异。** 仿真中的完美观察 vs 现实中的噪声传感器。
- **执行差异。** 仿真中的精确动作 vs 现实中的延迟和误差。
- **视觉差异。** 仿真中的简单渲染 vs 现实中的复杂光照和纹理。

这些差异构成"现实差距"——仿真中训练的策略在现实中性能下降。

## 核心概念

**域随机化。** Tobin et al. (2017)。在训练时随机化仿真参数（摩擦力、质量、光照、纹理、相机位置），使策略对参数变化鲁棒。直觉：如果策略在数千种不同仿真中都有效，它可能在现实中也有效。

随机化参数：

- 物理参数：摩擦力 (±50%)、质量 (±30%)、关节阻尼 (±50%)
- 视觉参数：光照方向、颜色、纹理、相机位置/角度
- 动作参数：延迟 (0-50ms)、噪声 (±5%)、执行误差

**域适应。** 将仿真数据适配到目标域：

- **渐进域适应。** 从仿真开始，逐步混合真实数据。
- **特征级适应。** 学习仿真和现实共享的特征表示 (DANN, ADDA)。
- **像素级适应。** 将仿真图像翻译为现实风格 (CycleGAN)，然后在翻译后的图像上训练。

**系统辨识。** 从真实数据估计仿真参数，使仿真更接近现实。迭代过程：

1. 在仿真中训练策略
2. 在现实中测试，收集数据
3. 用真实数据更新仿真参数
4. 重新训练策略

**鲁棒策略学习。** 不改变仿真，而是学习对不确定性鲁棒的策略：

- **最坏情况优化。** 最大化最坏参数下的回报。
- **对抗训练。** 添加对抗扰动到观察和动作。
- **不确定性感知。** 策略在不确定时更保守。

**教师-学生迁移。** 两阶段训练：

1. **教师。** 在仿真中用特权信息（完美状态观察）训练策略。
2. **学生。** 用教师的输出作为监督，从现实观察（传感器数据）训练策略。

## 动手构建

`code/main.py` 演示了域随机化在简单控制任务上的效果。

### 步骤 1：域随机化环境

```python
class RandomizedEnv:
    def __init__(self, base_env, randomization_ranges):
        self.base_env = base_env
        self.ranges = randomization_ranges

    def reset(self):
        # Randomize parameters each episode
        self.friction = random.uniform(*self.ranges['friction'])
        self.mass = random.uniform(*self.ranges['mass'])
        self.obs_noise = random.uniform(*self.ranges['obs_noise'])
        self.act_delay = random.randint(*self.ranges['act_delay'])
        return self.base_env.reset()

    def step(self, action):
        # Apply randomized physics
        action = self.apply_delay(action)
        obs, reward, done = self.base_env.step(action, self.friction, self.mass)
        obs = self.add_noise(obs, self.obs_noise)
        return obs, reward, done
```

### 步骤 2：评估现实差距

```python
def evaluate_sim2real(policy, sim_env, real_env, n_episodes=100):
    sim_rewards = []
    real_rewards = []
    for _ in range(n_episodes):
        # Sim evaluation
        obs = sim_env.reset()
        total_r = 0
        while True:
            action = policy.act(obs)
            obs, r, done = sim_env.step(action)
            total_r += r
            if done: break
        sim_rewards.append(total_r)

        # Real evaluation (simulated "real" with fixed params)
        obs = real_env.reset()
        total_r = 0
        while True:
            action = policy.act(obs)
            obs, r, done = real_env.step(action)
            total_r += r
            if done: break
        real_rewards.append(total_r)

    gap = np.mean(sim_rewards) - np.mean(real_rewards)
    return gap, sim_rewards, real_rewards
```

### 步骤 3：比较有无域随机化

```python
# Without domain randomization
env_fixed = RandomizedEnv(base_env, {'friction': (1.0, 1.0), 'mass': (1.0, 1.0)})
policy_fixed = train_ppo(env_fixed)

# With domain randomization
env_random = RandomizedEnv(base_env, {'friction': (0.5, 1.5), 'mass': (0.7, 1.3)})
policy_random = train_ppo(env_random)

# Evaluate reality gap
gap_fixed, _, _ = evaluate_sim2real(policy_fixed, env_fixed, real_env)
gap_random, _, _ = evaluate_sim2real(policy_random, env_random, real_env)
print(f"Reality gap - Fixed: {gap_fixed:.2f}, Randomized: {gap_random:.2f}")
```

## 常见陷阱

- **随机化范围太大。** 策略需要处理太多变化，在所有情况下都表现平庸。修复：从小范围开始，逐步增加。
- **随机化范围太小。** 现实差距仍然很大。修复：逐步增加范围直到仿真性能开始下降。
- **遗漏关键参数。** 只随机化物理参数但忽略传感器噪声。修复：识别所有可能的差异来源。
- **视觉随机化不足。** 仿真图像太干净，策略依赖仿真特有的视觉线索。修复：更激进的视觉随机化。
- **过度依赖仿真。** 仿真永远不能完全匹配现实。修复：定期真实世界测试，迭代改进。
- **忽略安全约束。** Sim2Real 迁移时策略可能产生不安全行为。修复：安全约束层，人类监督。

## 实际应用

| 场景       | Sim2Real 方法           |
| ---------- | ----------------------- |
| 机械臂操控 | 域随机化 + 系统辨识     |
| 无人机     | 域随机化 + 教师-学生    |
| 自动驾驶   | 域适应 + 数据增强       |
| 腿式机器人 | 域随机化 + 渐进适应     |
| 手部操控   | 教师-学生 + 域随机化    |
| 农业机器人 | 域随机化 + 少量真实微调 |

## 交付物

保存 `outputs/skill-sim2real.md`。技能接收目标任务 + 仿真保真度评估，输出：随机化参数和范围、迁移方法选择和真实世界验证计划。

## 练习

1. **简单。** 运行 `code/main.py`，比较有和没有域随机化的现实差距。域随机化是否减小差距？
2. **中等。** 实现渐进域随机化：从窄范围开始，每 100 个 episode 扩大 10%。比较与固定范围的训练稳定性。
3. **困难。** 实现教师-学生迁移：教师用完美状态观察训练，学生用噪声传感器观察训练（用教师的动作作为监督）。比较与直接在噪声观察上训练的策略。

## 关键术语

| 术语      | 人们怎么说     | 实际含义                               |
| --------- | -------------- | -------------------------------------- |
| Sim2Real  | "仿真到现实"   | 将仿真中训练的策略迁移到现实。         |
| 域随机化  | "随机仿真"     | 训练时随机化仿真参数，提高鲁棒性。     |
| 现实差距  | "仿真不够真实" | 仿真和现实之间的性能差异。             |
| 域适应    | "适配到现实"   | 将仿真数据/模型适配到目标域。          |
| 系统辨识  | "校准仿真"     | 从真实数据估计仿真参数。               |
| 教师-学生 | "知识蒸馏"     | 教师用特权信息训练，学生从传感器学习。 |

## 生产笔记：Sim2Real 的成本效益分析

Sim2Real 的核心经济问题是：仿真训练便宜但不准确，现实训练准确但昂贵。

| 方法     | 训练成本 | 现实差距 | 适用场景   |
| -------- | -------- | -------- | ---------- |
| 纯仿真   | $        | 大       | 原型验证   |
| 域随机化 | $$       | 中       | 机器人操控 |
| 域适应   | $$$      | 小       | 自动驾驶   |
| 纯现实   | $$$$$    | 无       | 最后精调   |
| 混合     | $$$      | 小       | 生产部署   |

生产部署通常使用混合策略：域随机化仿真训练 + 少量真实数据微调。关键洞察：仿真训练的边际成本接近零（GPU 时间），而真实数据收集的边际成本很高（硬件、时间、安全）。因此，在仿真中尽可能多地训练，在现实中只做必要的微调。

## 延伸阅读

- [Tobin et al. (2017). Domain Randomization for Transferring Deep Neural Networks from Simulation to the Real World](https://arxiv.org/abs/1703.06907) — 域随机化。
- [Peng et al. (2018). Sim-to-Real Transfer of Robotic Control with Dynamics Randomization](https://arxiv.org/abs/1710.06537) — 动力学随机化。
- [OpenAI (2019). Solving Rubik's Cube with a Robot Hand](https://arxiv.org/abs/1910.07113) — 大规模域随机化。
- [Chen et al. (2020). Learning by Cheating](https://arxiv.org/abs/1912.12294) — 教师-学生 Sim2Real。
- [James et al. (2019). Sim-to-Real for Robotics: A Survey](https://arxiv.org/abs/1906.05872) — Sim2Real 综述。
