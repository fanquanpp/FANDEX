---
title: 宪法安全线束与红队靶场
description: 'Anthropic Constitutional Classifiers、Meta Llama Guard 4、Google ShieldGemma-2、NVIDIA Nemotron 3 Content Safety和X-Guard定义2026年安全分类器栈。garak、PyRIT、NVIDIA Aegis和promptfoo成为标准对抗评估工具。NeMo Guardrails v0.12将它们绑入生产管线。将所有这些连接在一起：围绕目标应用的分层安全线束、运行6+攻击族的自主红队代理、产生可测量无害增量的宪法自我批评运行。'
module: 'ai-engineering'
difficulty: advanced
tags: []
related:
  - 'ai-engineering/线性回归'
  - 'ai-engineering/线性系统'
  - 'ai-engineering/向量与矩阵运算'
  - 'ai-engineering/信息论'
prerequisites:
  - 'ai-engineering/机器学习概述'
---

## 问题

2026年LLM安全前沿不是分类器是否工作（它们大致工作）而是如何围绕生产应用正确组合它们而不过度拒绝或留下明显漏洞。Llama Guard 4处理英语政策违规。X-Guard（132种语言）处理多语言越狱。ShieldGemma-2捕获基于图像的提示注入。NVIDIA Nemotron 3 Content Safety覆盖企业类别。Anthropic的Constitutional Classifiers是训练时而非服务时使用的独立方法。

攻击演化也很重要。PAIR和TAP自动化越狱发现。GCG运行基于梯度的后缀攻击。多轮和代码切换攻击利用代理记忆。任何部署的LLM都需要红队靶场——garak和PyRIT是规范驱动——加上文档化的缓解措施和CVSS评分的发现。

## 核心架构

### 分层安全

1. **输入分类。** Llama Guard 4 + X-Guard多语言覆盖。
2. **输出分类。** Nemotron 3 Content Safety + ShieldGemma-2图像检查。
3. **宪法自我批评。** 模型在输出前审查自身响应。
4. **NeMo Guardrails。** 话题控制、PII检测、对话流约束。

### 红队靶场

6+攻击族：PAIR、TAP、GCG、多轮、代码切换、编码（base64/ASCII艺术）。garak和PyRIT驱动自动化评估。发现CVSS评分。

### 测量

无害增量：有vs无安全线束的攻击成功率差异。过度拒绝率：良性请求被错误拒绝的比例。

## 关键术语

| 术语                      | 常见说法     | 实际含义                       |
| ------------------------- | ------------ | ------------------------------ |
| Constitutional Classifier | "宪法分类器" | Anthropic训练时安全方法        |
| Safety harness            | "安全线束"   | 围绕应用的分层安全控制         |
| Red-team range            | "红队靶场"   | 自动化对抗评估环境             |
| Harmlessness delta        | "无害增量"   | 有vs无安全控制的攻击成功率差异 |
| Over-refusal              | "过度拒绝"   | 良性请求被安全系统错误拒绝     |

## 延伸阅读

- Anthropic Constitutional Classifiers — 训练时安全
- Meta Llama Guard 4 — 多模态安全分类器
- Google ShieldGemma-2 — 图像安全分类器
- NeMo Guardrails v0.12 — 生产安全管线
