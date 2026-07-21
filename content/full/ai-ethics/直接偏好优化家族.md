---
title: '直接偏好优化家族 — DPO、IPO、KTO、SimPO、ORPO、BPO'
description: 理解DPO家族如何跳过奖励模型直接优化策略及其Goodhart局限
module: 'ai-ethics'
difficulty: intermediate
tags:
  - DPO
  - IPO
  - KTO
  - SimPO
  - ORPO
  - 直接对齐
  - 偏好优化
related:
  - 'ai-ethics/双用风险网络与生物与化学与核'
  - 'ai-ethics/水印SynthID与Stable-Signature与C2PA'
  - 'ai-ethics/指令遵循作为对齐信号'
  - 'ai-ethics/AI控制与颠覆下安全'
prerequisites:
  - 'ai-ethics/谄媚作为RLHF放大器'
---

# 直接偏好优化家族

> Rafailov等人(2023)表明RLHF的最优解有偏好数据的闭式，所以你可以跳过显式奖励模型直接优化策略。那个洞见催生了一个家族——IPO、KTO、SimPO、ORPO、BPO——每个修复DPO的一个失败模式。2026年，直接对齐算法发布的前沿后训练运行比PPO多。但第2课的过度优化曲线仍然适用：DAA不逃出Goodhart，它们只是移动咬的位置。

**类型:** 学习
**语言:** Python (stdlib, 六变体偏好损失比较器)
**前置知识:** Phase 18 · 01 (InstructGPT), Phase 18 · 02 (奖励黑客), Phase 10 · 08 (DPO基础)
**时间:** ~75分钟

## 学习目标

- 解释DPO洞见：RLHF最优解有闭式，可跳过奖励模型。
- 比较六种直接对齐算法：DPO、IPO、KTO、SimPO、ORPO、BPO。
- 说出每种修复DPO的什么失败模式。
- 解释为什么DAA不逃出Goodhart，只是移动咬的位置。

## 问题

DPO是突破。RLHF需要训练奖励模型然后用PPO优化策略——复杂且不稳定。DPO表明你可以直接从偏好数据优化策略，跳过奖励模型。但DPO有失败模式，催生了变体家族。

## 概念

### DPO洞见

RLHF最优策略有闭式：`pi*(y|x) ∝ pi_ref(y|x) * exp(r(x,y)/beta)`。DPO用这个闭式消除奖励模型，直接在偏好对上优化策略。

### 变体家族

| 算法  | 修复DPO的什么                        |
| ----- | ------------------------------------ |
| IPO   | DPO假设偏好是确定性的；IPO加噪声容忍 |
| KTO   | DPO需要成对偏好；KTO只需好/坏标签    |
| SimPO | DPO需要参考策略；SimPO移除参考       |
| ORPO  | DPO需要SFT+DPO两阶段；ORPO合并为一步 |
| BPO   | DPO偏好对是二元的；BPO加边界         |

### Goodhart仍适用

DAA不逃出Goodhart。它们跳过奖励模型但仍在偏好数据上优化。偏好数据是真实偏好的代理。过度优化仍然导致代理偏离真实。

## 实践

`code/main.py`比较六种偏好损失函数。

## 输出

本课程产生`outputs/skill-daa-picker.md`。给定约束(数据类型、计算、稳定性)，选择DAA变体。

## 练习

1. 写出DPO损失函数。每个项做什么？
2. KTO为什么只需好/坏标签而非成对偏好？什么场景受益？
3. SimPO如何移除参考策略？损失函数变化？
4. 设计实验：比较DPO和KTO在相同数据上。指标？
5. 为什么DAA不逃出Goodhart？给出具体例子。

## 关键术语

| 术语   | 常见说法             | 实际含义                 |
| ------ | -------------------- | ------------------------ |
| DPO    | "直接偏好优化"       | 跳过奖励模型直接优化策略 |
| DAA    | "直接对齐算法"       | DPO家族统称              |
| 闭式   | "解析解"             | RLHF最优策略的数学表达式 |
| 偏好对 | "chosen vs rejected" | 人类偏好的成对比较数据   |

## 延伸阅读

- [Rafailov等人 — DPO (arXiv:2305.18290)](https://arxiv.org/abs/2305.18290)
- [Azar等人 — IPO (arXiv:2310.12036)](https://arxiv.org/abs/2310.12036)
- [Ethayarajh等人 — KTO (arXiv:2402.01306)](https://arxiv.org/abs/2402.01306)
