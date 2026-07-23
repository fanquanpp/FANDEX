---
title: '托管LLM平台 — Bedrock、Vertex AI、Azure OpenAI'
description: 比较三大超大规模云平台的LLM服务策略、延迟差距和FinOps归属
module: 'ai-engineering'
difficulty: beginner
tags:
  - Bedrock
  - 'Vertex AI'
  - 'Azure OpenAI'
  - PTU
  - FinOps
  - 多供应商策略
related:
  - 'ai-engineering/推理平台经济学'
  - 'ai-engineering/推理指标体系'
  - 'ai-engineering/文本转语音'
  - 'ai-engineering/无服务器LLM冷启动缓解'
prerequisites:
  - 'ai-engineering/机器学习概述'
---

# 托管LLM平台 — Bedrock、Vertex AI、Azure OpenAI

> 三个超大规模云，三种截然不同的策略。AWS Bedrock是模型市场——Claude、Llama、Titan、Stability、Cohere在一个API后面。Azure OpenAI是独家OpenAI合作加Provisioned Throughput Units(PTU)用于专用容量。Vertex AI是Gemini优先，拥有最好的长上下文和多模态故事。2026年Artificial Analysis测量Azure OpenAI在Llama 3.1 405B等价物上约50ms中位数，Bedrock约75ms——PTU解释了差距，因为专用容量击败共享按需。决策规则不是"哪个最快"而是"哪个模型目录和FinOps界面匹配我的产品"。本课程教你用写下的权衡而非感觉来选择。

**类型:** 学习
**语言:** Python (stdlib, toy成本和延迟比较器)
**前置知识:** Phase 11 (LLM工程), Phase 13 (工具与协议)
**时间:** ~60分钟

## 学习目标

- 说出三种平台策略(市场vs独家vs Gemini优先)并将每种匹配到产品用例。
- 解释Azure OpenAI中Provisioned Throughput Units(PTU)买了什么以及为什么按需Bedrock在405B规模上通常慢约25ms。
- 画出每个平台的FinOps归属面(Bedrock Application Inference Profiles vs Vertex项目-每-团队 vs Azure范围 + PTU预留)。
- 写下"双供应商最低"策略并解释为什么单供应商锁定是2026年的昂贵错误。

## 问题

你为产品选择了Claude 3.7 Sonnet。现在需要服务它。你可以直接调用Anthropic API，或通过AWS Bedrock调用，或通过网关调用。直接API最简单；Bedrock添加BAA、VPC端点、IAM和CloudWatch归属。网关添加故障转移、统一计费和跨供应商速率限制。

更深的问题是目录。如果你在同一个产品中需要Claude和Llama和Gemini，你不能从一个地方买所有东西，除非那个地方同时是Bedrock加Vertex加Azure OpenAI。超大规模云不可互换——它们各自对谁拥有模型层下了不同的赌注。

本课程映射三个赌注、延迟差距、FinOps差距和锁定风险。

## 概念

### 三种策略

**AWS Bedrock** — 市场。Claude(Anthropic)、Llama(Meta)、Titan(AWS第一方)、Stability(图像)、Cohere(嵌入)、Mistral，加图像和嵌入子目录。一个API，一个IAM面，一个CloudWatch导出。Bedrock的赌注是客户想要可选性而非单一模型。

**Azure OpenAI** — 独家合作。你在Azure数据中心获得GPT-4 / 4o / 5 / o系列、DALL-E、Whisper和OpenAI模型微调。"Azure OpenAI Service"目录中没有非OpenAI模型——那些去Azure AI Foundry(独立产品)。Azure的赌注是OpenAI保持前沿且客户想要该特定关系的企业控制。

**Vertex AI** — Gemini优先，其他其次。Gemini 1.5 / 2.0 / 2.5 Flash和Pro，加Model Garden(第三方)。Vertex的赌注是多模态长上下文——1M token Gemini上下文是差异化因素。

### 规模上的延迟差距

Artificial Analysis运行持续基准。在等价Llama 3.1 405B部署(共享按需)上，Azure OpenAI中位首token延迟约50ms；Bedrock约75ms。差距不是AWS的失败——是容量模型差异。Azure卖PTU(Provisioned Throughput Units)，为你的租户预留GPU容量。Bedrock的等价物(Provisioned Throughput)存在但每单元约$21/小时起，大多数客户留在共享按需。

共享按需容量与每个其他客户的流量竞争。专用容量不。如果你的产品SLA是P99 TTFT < 100ms，你要么在Azure买PTU，买Bedrock Provisioned Throughput，要么接受默认方差。

### Provisioned Throughput经济学

Azure PTU：预留推理计算块。对可预测工作负载比按需节省高达约70%。每小时固定成本不管流量——空闲时也付预留费。盈亏平衡通常在约40-60%持续利用率。

Bedrock Provisioned Throughput：$21-$50每小时，取决于模型和区域。类似数学——盈亏平衡在峰值利用率的一半左右。需要月度承诺。

Vertex provisioned容量按Gemini SKU出售；定价因模型和区域而异，公开广告较少。

### FinOps面 — 真正的差异化因素

**Bedrock Application Inference Profiles**是市场中最干净的归属。用`team`、`product`、`feature`标记profile；通过它路由所有模型调用；CloudWatch按profile拆分成本无需后处理。2025年添加，仍是超大规模云原生中最细粒度的。

**Vertex**归属是项目-每-团队加标签无处不在。你将每个团队建模为GCP项目，在每个资源上放标签，用BigQuery Billing Export + DataStudio做汇总。更多工作，但BigQuery给你成本数据上的任意SQL。

**Azure**依赖订阅/资源组范围加标签，PTU预留作为一等成本对象。标签从资源组继承而非请求，所以每请求归属需要Application Insights自定义指标或标记header的网关。

模式：Bedrock原生最干净，Vertex通过BigQuery最灵活，Azure除非你埋点最不透明。

### 锁定是2026年风险

单超大规模云承诺在一个模型主导时可行。2026年前沿月月移动——一个季度Claude 3.7，下一个Gemini 2.5，再下一个GPT-5。锁定一个平台锁住你离开三分之二的前沿。

工作团队采用的模式：任何产品关键LLM调用的双供应商最低。Bedrock加Azure OpenAI是常见配对——一个的Claude，另一个的GPT，之间故障转移，同一网关。成本提升可忽略因为网关路由最优；中断期间的可用性提升(如Azure OpenAI 2025年1月事件、AWS us-east-1中断)是决定性的。

### 数据驻留、BAA和受监管行业

Bedrock：大多数区域有BAA；VPC端点；护栏。常见金融科技默认。
Azure OpenAI：HIPAA、SOC 2、ISO 27001；EU数据驻留；企业受监管默认。
Vertex：HIPAA、GDPR、按区域数据驻留；Google Cloud合规栈。

三者都满足基本复选框。差异在数据保留策略、日志处理方式以及滥用监控是否读取你的流量(大多数默认选择加入；企业可选择退出)。

### 你应该记住的数字

- Azure OpenAI在Llama 3.1 405B等价物上的中位TTFT：约50ms(带PTU)。
- Bedrock按需中位TTFT：约75ms。
- Bedrock Provisioned Throughput：$21-$50/小时每单元。
- Azure PTU盈亏平衡：约40-60%持续利用率。
- PTU在高利用率下vs按需节省：高达70%。

## 实践

`code/main.py`在合成工作负载上比较三个平台——它建模按需vs PTU经济学、TTFT方差和成本归属保真度。运行它看PTU在哪里回本以及市场的模型广度在哪里超过TTFT差距。

## 输出

本课程产生`outputs/skill-managed-platform-picker.md`。给定工作负载profile(所需模型、TTFT SLA、日量、合规要求)，它推荐主平台、备用和FinOps埋点计划。

## 练习

1. 运行`code/main.py`。在什么持续利用率下Azure PTU对70B级模型击败按需？计算盈亏平衡并与广告的40-60%范围比较。
2. 你的产品需要Claude 3.7 Sonnet和GPT-4o。设计双供应商部署——哪个去哪个超大规模云，什么网关在前面，故障转移策略是什么？
3. 受监管医疗客户需要BAA、US-East数据驻留和P99 TTFT < 100ms。选择平台并用三个具体功能论证。
4. 你发现Bedrock账单本月涨了4倍但流量没变。没有Application Inference Profiles你怎么找到罪魁祸首？有profiles需要多久？
5. 阅读Azure OpenAI和Bedrock定价页。对1亿token/月Claude工作负载，哪个更便宜——直接Anthropic API、Bedrock按需还是Bedrock Provisioned Throughput？

## 关键术语

| 术语                          | 常见说法         | 实际含义                                             |
| ----------------------------- | ---------------- | ---------------------------------------------------- |
| Bedrock                       | "AWS LLM服务"    | 跨Claude、Llama、Titan、Mistral、Cohere的模型市场    |
| Azure OpenAI                  | "Azure的ChatGPT" | Azure数据中心内带企业控制的独家OpenAI模型            |
| Vertex AI                     | "Google的LLM"    | Gemini优先平台，Model Garden用于第三方模型           |
| PTU                           | "专用容量"       | Provisioned Throughput Unit——预留推理GPU，按小时计价 |
| Application Inference Profile | "Bedrock标记"    | 带标签的每产品成本/使用profile，CloudWatch原生       |
| Model Garden                  | "Vertex目录"     | Vertex AI的第三方模型部分，与Gemini分开              |
| 双供应商最低                  | "LLM冗余"        | 每个关键LLM路径跨>=2个超大规模云运行的策略           |
| BAA                           | "HIPAA文书"      | Business Associate Agreement；PHI所需；三者均提供    |
| 滥用监控                      | "日志观察者"     | 供应商端对prompt/输出的安全扫描；企业可选择退出      |

## 延伸阅读

- [AWS Bedrock Pricing](https://aws.amazon.com/bedrock/pricing/)
- [Azure OpenAI Service Pricing](https://azure.microsoft.com/en-us/pricing/details/cognitive-services/openai-service/)
- [Vertex AI Generative AI Pricing](https://cloud.google.com/vertex-ai/generative-ai/pricing)
- [Artificial Analysis LLM Leaderboard](https://artificialanalysis.ai/)
