---
title: 基准测试WebArena与OSWorld
description: 'WebArena跨四个自托管应用测试Web Agent能力。OSWorld跨Ubuntu、Windows、macOS测试桌面Agent能力。在发布时（2023-2024）两者都显示了最佳Agent和人类之间的巨大差距。差距在缩小；失败模式没有改变。'
module: agent
related:
  - agent/混合记忆向量图与KV
  - 'agent/基准测试SWE-bench与GAIA'
  - agent/计算机使用Agent
  - agent/记忆块与睡眠时间计算
prerequisites:
  - agent/概述与架构
---

# 基准测试：WebArena与OSWorld

> WebArena跨四个自托管应用测试Web Agent能力。OSWorld跨Ubuntu、Windows、macOS测试桌面Agent能力。在发布时（2023-2024）两者都显示了最佳Agent和人类之间的巨大差距。差距在缩小；失败模式没有改变。

**类型：** 学习
**语言：** Python (stdlib)
**前置条件：** Phase 14 · 19 (SWE-bench, GAIA)
**时间：** ~60分钟

## 学习目标

- 描述WebArena的四个自托管应用以及为什么基于执行的评估重要。
- 解释为什么OSWorld使用真实OS截图而非可访问性API。
- 说出两个主要OSWorld失败模式：GUI接地和操作知识。
- 总结OSWorld-G和OSWorld-Human在基础基准之上添加了什么。

## 问题所在

通用Agent可以调用工具。它们能驱动浏览器跨20次点击完成购物结账吗？它们能只使用键盘和鼠标配置Linux机器吗？这些是WebArena和OSWorld回答的问题。

## 核心概念

### WebArena（Zhou等人，ICLR 2024）

- 跨四个自托管Web应用的812个长时间范围任务：购物网站、论坛、类GitLab开发工具、商业CMS。
- 加实用工具：地图、计算器、草稿本。
- 评估通过gym API基于执行——订单是否下好了，问题是否关闭了，CMS页面是否更新了？
- 发布时：最佳GPT-4 Agent达到14.41%成功率 vs 人类78.24%。

自托管框架重要——基准不会不稳定，因为目标应用被固定且可复现。

### 扩展

- **VisualWebArena** — 视觉接地任务，成功取决于解释图像（截图作为一等观察）。
- **TheAgentCompany**（2024年12月）— 添加终端 + 编码；更像真实的远程工作环境。

### OSWorld（Xie等人，NeurIPS 2024）

- 跨Ubuntu、Windows、macOS的369个真实计算机任务。
- 自由形式的键盘和鼠标控制真实应用。
- 1920x1080截图作为观察。
- 发布时：最佳模型12.24% vs 人类72.36%。

### 主要失败模式

1. **GUI接地。** 像素到元素映射。模型难以在1920x1080中可靠地定位UI元素。
2. **操作知识。** 哪个菜单有设置，哪个键盘快捷键，哪个偏好窗格。人类多年构建的知识尾部。

### 后续

- **OSWorld-G** — 564样本接地套件 + Jedi训练集。将接地与规划分解，使你可以分别测量。
- **OSWorld-Human** — 手动策划的黄金动作轨迹。显示顶级Agent使用1.4-2.7倍于必要的步骤（轨迹效率差距）。

### 为什么这重要

Claude computer use、OpenAI CUA、Gemini 2.5 Computer Use（第21课）都在由WebArena和OSWorld塑造的工作负载上训练。基准是目标；生产模型是发布的答案。

### 基准测试哪里会出错

- **仅截图评估。** OSWorld是截图驱动的；在使用DOM或可访问性API的Agent上评估OSWorld遗漏了接地挑战。
- **忽略轨迹长度。** 仅评分成功率遗漏了OSWorld-Human揭示的1.4-2.7倍步骤低效。
- **过时的自托管应用。** WebArena的应用固定特定版本；不重新策划的更新会破坏可比性。

## 构建它

`code/main.py`实现一个玩具Web Agent线束：

- 一个最小"购物应用"状态机：list_items、add_to_cart、checkout。
- 3个任务的黄金轨迹。
- 一个脚本Agent尝试每个任务。
- 基于执行的评估器（状态检查）和轨迹效率指标（步骤 vs 黄金）。

运行：

```
python3 code/main.py
```

输出：每任务成功率和轨迹效率，镜像OSWorld-Human的方法论。

## 使用它

- **WebArena Verified**自托管在内部集群上用于持续评估。
- **OSWorld**在VM集群中用于桌面Agent。
- **计算机使用Agent**（第21课）— Claude、OpenAI CUA、Gemini — 都在类似这些的工作负载上训练。
- **你自己的产品流程** — 为你的前20个任务捕获黄金轨迹；每周对Agent运行它们。

## 发布它

`outputs/skill-web-desktop-harness.md`构建带基于执行评估和轨迹效率指标的Web/桌面Agent线束。

## 练习

1. 用第二个应用（论坛）扩展玩具线束。编写3个任务加黄金轨迹。
2. 添加每任务的轨迹效率报告。在你的玩具上，Agent是1倍、2倍还是3倍于黄金？
3. 实现"干扰"工具——黄金轨迹从不使用的工具。脚本Agent会被诱惑吗？
4. 阅读OSWorld-G。你如何在自己的评估中分离接地失败和规划失败？
5. 阅读WebArena的应用README。当你升级一个固定应用版本时会破坏什么？

## 关键术语

| 术语           | 人们常说的       | 实际含义                              |
| -------------- | ---------------- | ------------------------------------- |
| WebArena       | "Web Agent基准"  | 跨4个自托管应用的812个任务；gym式评估 |
| VisualWebArena | "视觉WebArena"   | 视觉接地的WebArena；截图是观察        |
| OSWorld        | "桌面Agent基准"  | 真实Ubuntu/Windows/macOS上的369个任务 |
| GUI接地        | "像素到元素映射" | 模型在1920x1080中定位UI元素           |
| 操作知识       | "OS诀窍"         | 哪个菜单、哪个快捷键、哪个偏好窗格    |
| OSWorld-G      | "接地套件"       | 564个仅接地样本 + 训练集              |
| OSWorld-Human  | "黄金轨迹"       | 手动专家动作序列用于测量效率          |
| 轨迹效率       | "步骤超黄金"     | Agent步数除以人类最小值               |

## 延伸阅读

- [Zhou等人, WebArena (arXiv:2307.13854)](https://arxiv.org/abs/2307.13854) — 四应用Web基准
- [Xie等人, OSWorld (arXiv:2404.07972)](https://arxiv.org/abs/2404.07972) — 跨OS桌面基准
- [Anthropic, Introducing computer use](https://www.anthropic.com/news/3-5-models-and-computer-use) — Claude的基准塑造能力
- [OpenAI, Computer-Using Agent](https://openai.com/index/computer-using-agent/) — OSWorld和WebArena数字
