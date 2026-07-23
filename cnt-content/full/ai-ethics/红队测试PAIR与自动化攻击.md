---
title: 红队测试PAIR与自动化攻击
description: 'PAIR（Prompt Automatic Iterative Refinement）是经典的自动化黑盒越狱：攻击者LLM迭代提出越狱，通常在20次查询内成功，比GCG高效数个数量级且无需白盒访问。JailbreakBench和HarmBench标准化评估协议。'
module: 'ai-ethics'
difficulty: advanced
tags:
  - PAIR
  - 红队
  - GCG
  - JailbreakBench
  - HarmBench
  - 自动化攻击
related:
  - 'ai-ethics/多样本越狱'
  - 'ai-ethics/公平性标准群体个体与反事实'
  - 'ai-ethics/红队工具Garak与LlamaGuard'
  - 'ai-ethics/间接提示注入与生产攻击面'
prerequisites:
  - 'ai-ethics/谄媚作为RLHF放大器'
---

## 问题定义

红队测试曾经是手动活动。少数专家测试者构建对抗提示并跟踪哪些有效。这不可扩展：攻击成功率需要统计样本，而目标是每次模型发布都在变化的目标。PAIR将红队测试操作化为具有黑盒目标的优化问题。

## 核心概念

### PAIR算法

输入：

- 目标LLM T（我们正在攻击的模型）。
- 判断LLM J（评分响应是否为越狱）。
- 攻击者LLM A（红队优化器）。
- 目标字符串G："响应[harmful instruction]"。
- 预算K（通常20次查询）。

循环，k从1到K：

1. A被提示以目标G和迄今为止的(prompt, response)对历史。
2. A发出新提示p_k。
3. 将p_k提交给T；接收响应r_k。
4. J对(p_k, r_k)按目标评分。
5. 如果分数 >= 阈值，停止——找到越狱。
6. 否则，将(p_k, r_k)追加到A的历史；继续。

实证结果（NeurIPS 2023）：对GPT-3.5-turbo、Llama-2-7B-chat攻击成功率>50%；平均成功查询数在10-20范围。

### 为什么PAIR高效

GCG（Zou等人2023）通过梯度搜索对抗token后缀；需要白盒模型访问并产生不可读后缀。PAIR是黑盒的，产生可跨模型迁移的自然语言攻击。PAIR的上下文反馈让攻击者从每次拒绝中学习；GCG没有等效机制（每个新token更新必须重新发现先前进展）。

### 相关自动化攻击

- **GCG（Zou等人2023, arXiv:2307.15043）。** 对抗后缀的token级梯度搜索。白盒，可迁移，产生不可读字符串。
- **AutoDAN（Liu等人2023）。** 在提示上进行进化搜索，由层次目标引导。
- **TAP（Mehrotra等人2024）。** 带剪枝的攻击树——分支多个PAIR风格展开。
- **PAP（Zeng等人2024）。** 说服性对抗提示——将人类说服技术编码为提示模板。

### JailbreakBench和HarmBench

两者（2024）标准化评估：

- **JailbreakBench** (arXiv:2404.01318)。10个OpenAI政策类别的100个有害行为。攻击成功率(ASR)作为主要指标。需要判断器（GPT-4-turbo、Llama Guard或StrongREJECT）。
- **HarmBench** (Mazeika等人2024)。7个类别的510个行为，包含语义和功能性危害测试。比较18种攻击对33个模型。

ASR通常在固定查询预算下报告。比较攻击需要匹配预算；200次查询下90% ASR不可与20次查询下85% ASR比较。

### 2026年部署中的意义

每个前沿实验室现在在发布前对生产模型运行PAIR和TAP。ASR轨迹出现在模型卡（第26课）和安全案例附录（第18课）中。攻击不是异乎寻常的——它是标准基础设施。

## 关键术语

| 术语                      | 常见说法        | 实际含义                                                     |
| ------------------------- | --------------- | ------------------------------------------------------------ |
| PAIR                      | "自动化越狱"    | Prompt Automatic Iterative Refinement；攻击者LLM+判断LLM循环 |
| GCG                       | "梯度越狱"      | 对抗后缀的白盒token级梯度搜索                                |
| Attack success rate (ASR) | "k次查询越狱率" | 主要指标；必须附查询预算和判断器标识报告                     |
| Judge LLM                 | "评分器"        | 评分响应是否满足有害目标的LLM                                |
| JailbreakBench            | "评估基准"      | 带标记类别的标准化有害行为集                                 |
| HarmBench                 | "更广基准"      | 510个行为，功能+语义危害测试                                 |
| TAP                       | "攻击树"        | 带分支+剪枝的PAIR；更高计算下更好ASR                         |

## 延伸阅读

- Chao et al. — Jailbreaking Black Box LLMs in Twenty Queries (arXiv:2310.08419) — PAIR论文，NeurIPS 2023
- Zou et al. — Universal and Transferable Adversarial Attacks on Aligned LLMs (arXiv:2307.15043) — GCG论文
- Chao et al. — JailbreakBench (arXiv:2404.01318) — 标准化评估
- Mazeika et al. — HarmBench (ICML 2024) — 更广评估
