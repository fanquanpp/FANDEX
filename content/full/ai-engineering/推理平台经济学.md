---
title: '推理平台经济学 — Fireworks、Together、Baseten、Modal、Replicate、Anyscale'
description: 比较六大推理平台的定价模型、市场定位和成本效益
module: 'ai-engineering'
difficulty: beginner
tags:
  - 推理平台
  - Fireworks
  - Baseten
  - Modal
  - Together
  - 定价模型
related:
  - 'ai-engineering/凸优化'
  - 'ai-engineering/图论'
  - 'ai-engineering/推理指标体系'
  - 'ai-engineering/托管LLM平台比较'
prerequisites:
  - 'ai-engineering/机器学习概述'
---

# 推理平台经济学 — Fireworks、Together、Baseten、Modal、Replicate、Anyscale

> 2026年推理市场不再是GPU时间租赁。它分化为定制硅(Groq、Cerebras、SambaNova)、GPU平台(Baseten、Together、Fireworks、Modal)和API优先市场(Replicate、DeepInfra)。Fireworks 2026年5月1日将价格提高到$1/hr每GPU，40亿估值日处理10T+ token告诉你量驱模型可行。Baseten 2026年1月E轮3亿美元估值50亿。竞争定位规则很简单：Fireworks优化延迟，Together优化目录广度，Baseten优化企业精致度，Modal优化Python原生DX，Replicate优化多模态覆盖，Anyscale优化分布式Python。本课程给你一个可以交给创始人的矩阵。

**类型:** 学习
**语言:** Python (stdlib, toy每次调用经济学比较器)
**前置知识:** Phase 17 · 01 (托管LLM平台), Phase 17 · 04 (vLLM服务内部)
**时间:** ~60分钟

## 学习目标

- 说出三个市场细分(定制硅、GPU平台、API优先)并将每个供应商映射到细分。
- 解释为什么"每token"API定价模型向服务引擎的成本曲线压缩，而非硬件的。
- 计算至少三个供应商的每请求有效成本并解释何时每分钟(Baseten, Modal)击败每token。
- 识别哪个平台是给定工作负载(无服务器突发、稳定高吞吐、微调变体、多模态)的正确默认。

## 问题

你评估了托管超大规模云平台。你决定需要一个更窄、更快的供应商——Fireworks为延迟，Together为广度，Baseten为微调自定义模型。现在你有六个真实选择，定价页面对不齐。Fireworks显示$/M token；Baseten显示$/分钟；Modal显示$/秒；Replicate显示$/预测。你不能不建模工作负载就头对头比较。

更糟，每个定价页面背后的商业模式不同。Fireworks在共享GPU上运行自己的自定义引擎(FireAttention)；每token费率反映它们的利用率曲线。Baseten给你Truss + 专用GPU；每分钟反映排他性。Modal是真正的Python无服务器——每秒计费带亚秒冷启动。相同输出(LLM响应)，三种不同成本函数。

本课程建模六个并告诉你每个何时获胜。

## 概念

### 三个细分

**定制硅** — Groq(LPU)、Cerebras(WSE)、SambaNova(RDU)。通常比同模型GPU集群快5-10x解码。更高每token价格(Groq 2025年底在Llama-70B上约$0.99/M)但对延迟敏感用例无可匹敌。Groq是语音agent和实时翻译的生产选择。

**GPU平台** — Baseten、Together、Fireworks、Modal、Anyscale。运行在NVIDIA(H100, H200, 2026年B200)或有时AMD上。"原始GPU租赁"(RunPod, Lambda)和"超大规模云托管服务"(Bedrock)之间的经济层。

**API优先市场** — Replicate、DeepInfra、OpenRouter、Fal。广泛目录，按预测付费或按秒付费，强调首次调用时间。

### Fireworks — 延迟优化GPU平台

- FireAttention引擎(自定义)；宣传为等价配置上比vLLM低4x延迟。
- 非交互工作负载批量层级约为无服务器费率的50%。
- 微调模型以基础模型相同费率服务——与对LoRA收取溢价的供应商相比是真正差异化。
- 2026年中：2026年5月1日起按需GPU租赁提高$1/小时。大规模量价可谈。
- 财务信号：40亿估值，日处理10T+ token。

### Together — 广度优化

- 200+模型包括上游发布数天内的开源版本。
- 等价LLM模型比Replicate便宜50-70%——"AI原生云"定位是量和目录。
- 一个API中的推理 + 微调 + 训练。

### Baseten — 企业精致度优化

- Truss框架：模型打包带依赖、密钥、服务配置在一个清单中。
- GPU范围从T4到B200。每分钟计费带合理冷启动缓解。
- SOC 2 Type II，HIPAA就绪。常见金融科技和医疗选择。
- 50亿估值，2026年1月E轮(来自CapitalG、IVP、NVIDIA的3亿美元)。

### Modal — Python原生优化

- 纯Python中的基础设施即代码。用`@modal.function(gpu="A100")`装饰函数，一条命令部署。
- 每秒计费。冷启动2-4秒带预热；小模型<1秒。
- 8700万美元B轮11亿估值(2025)。独立调查中最强开发者体验分数。

### Replicate — 多模态广度

- 按预测付费。图像、视频和音频模型的默认平台。
- 集成生态(Zapier, Vercel, CMS插件)。
- LLM每token费率竞争力较弱但在多模态多样性上获胜。

### Anyscale — Ray原生

- 构建在Ray上；RayTurbo是Anyscale的专有推理引擎(与vLLM竞争)。
- 最适合推理步骤是更大图中一个节点的分布式Python工作负载。
- 托管Ray集群；与Ray AIR和Ray Serve紧密集成。

### 每token vs 每分钟 — 各何时获胜

每token在工作负载延迟不敏感且突发时有意义——你只为使用的付费。每分钟在利用率高且可预测时有意义——一旦你饱和GPU就击败每token。

粗略规则：对专用GPU约30%以上持续利用率的工作负载，每分钟(Baseten, Modal)开始击败每token(Fireworks, Together)。低于此，每token获胜因为你避免为空闲付费。

### 自定义引擎是真正护城河

vLLM和SGLang以上的每个平台都声称自定义引擎。FireAttention、RayTurbo、Baseten的推理栈。自定义引擎声明遮蔽营销——诚实的框架是vLLM + SGLang代表约80%的生产开源推理，平台层的差异化是DX、归属和SLA。

### 你应该记住的数字

- Fireworks GPU租赁：2026年5月1日起提高$1/小时。
- Fireworks声称：等价配置上比vLLM低4x延迟。
- Together：LLM上比Replicate便宜50-70%。
- Baseten估值：50亿(E轮，2026年1月，3亿美元轮)。
- Modal估值：11亿(B轮，2025)。
- 每分钟在约30%以上持续利用率击败每token。

## 实践

`code/main.py`在合成工作负载上跨定价模型比较六个供应商。报告$/天和有效$/M token。运行它找到每token和每分钟之间的盈亏平衡。

## 输出

本课程产生`outputs/skill-inference-platform-picker.md`。给定工作负载profile、SLA和预算，选择主推理平台并命名亚军。

## 练习

1. 运行`code/main.py`。在什么持续利用率下Baseten(每分钟)对H100上的70B模型击败Fireworks(每token)？自己推导交叉点并与经验法则比较。
2. 你的产品服务图像生成+聊天+语音转文本。为每种模态选择平台并命名统一它们的网关模式。
3. Fireworks在你主要模型上提价$1/小时。如果40%流量移到批量层级(50%折扣)建模混合成本影响。
4. 受监管客户需要SOC 2 Type II + HIPAA + 专用GPU。哪三个平台可行，哪个在FinOps上获胜？
5. 比较Llama 3.1 70B在Fireworks无服务器、Together按需、Baseten专用和Replicate API上每1000预测的成本。10预测/天时哪个最便宜？10,000时？

## 关键术语

| 术语          | 常见说法         | 实际含义                                          |
| ------------- | ---------------- | ------------------------------------------------- |
| 定制硅        | "非GPU芯片"      | Groq LPU、Cerebras WSE、SambaNova RDU——为解码优化 |
| FireAttention | "Fireworks引擎"  | 自定义注意力核；宣传比vLLM低4x延迟                |
| Truss         | "Baseten格式"    | 模型打包清单；依赖+密钥+服务配置                  |
| 每token       | "API定价"        | 按消费token收费；不付空闲                         |
| 每分钟        | "专用定价"       | 按墙上时钟GPU时间收费；高利用率时获胜             |
| 每预测        | "Replicate定价"  | 按模型调用收费；图像/视频常见                     |
| RayTurbo      | "Anyscale引擎"   | Ray上的专有推理；在Ray集群上与vLLM竞争            |
| 批量层级      | "50%折扣"        | 降低费率的非交互队列；Fireworks、OpenAI常见       |
| 基础费率微调  | "Fireworks LoRA" | LoRA服务请求按基础模型费率收费(差异化)            |

## 延伸阅读

- [Fireworks Pricing](https://fireworks.ai/pricing)
- [Baseten Pricing](https://www.baseten.co/pricing/)
- [Modal Pricing](https://modal.com/pricing)
- [Together AI Pricing](https://www.together.ai/pricing)
- [Anyscale Pricing](https://www.anyscale.com/pricing)
