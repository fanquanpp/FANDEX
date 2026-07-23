---
title: '合规 — SOC 2、HIPAA、GDPR、PCI-DSS、EU AI Act、ISO 42001'
description: 理解2026年多框架合规要求和跨框架映射减少审计疲劳
module: 'ai-engineering'
difficulty: beginner
tags:
  - 合规
  - 'SOC 2'
  - HIPAA
  - GDPR
  - 'EU AI Act'
  - 'ISO 42001'
  - 'PCI-DSS'
related:
  - 'ai-engineering/感知机'
  - 'ai-engineering/个人AI导师自适应多模态与记忆'
  - 'ai-engineering/机器学习统计'
  - 'ai-engineering/机器学习微积分'
prerequisites:
  - 'ai-engineering/机器学习概述'
---

# 合规 — SOC 2、HIPAA、GDPR、PCI-DSS、EU AI Act、ISO 42001

> 多框架覆盖是2026年企业交易的桌面赌注。**EU AI Act**：2024年8月1日生效。大多数高风险要求2026年8月2日执行。罚款高达1500万欧元或全球年营业额3%用于高风险系统义务(第99(4)条)；高达3500万欧元或7%用于禁止的AI实践(第99(3)条)。如果服务EU用户则全球适用。**Colorado AI Act**：2026年6月30日生效(被SB25B-004从2026年2月推迟)——高风险系统影响评估，AI决定上诉权。Virginia类似用于信用/就业/住房/教育。**SOC 2 Type II**：事实上的B2B AI要求(金融科技要Type II，不是Type I)。**GDPR**：最大记录的AI特定罚款是对Clearview AI的3050万欧元(荷兰DPA，2024年9月)；意大利Garante在2024年12月对OpenAI开出1500万欧元(后于2026年3月上诉推翻)。推理时实时PII编辑是可辩护的标准；后处理清理不够。**HIPAA**：医疗绑定——不能在没有BAA的情况下将PHI发送到外部AI服务。**PCI-DSS**：AI交互层覆盖需要配置+合同协议，非自动。**ISO 42001**：新兴AI治理标准，与ISO 27001一起增长的采购要求。参考档案：OpenAI维护SOC 2 Type 2、ISO/IEC 27001:2022、ISO/IEC 27701:2019、GDPR/CCPA/HIPAA(BAA)/FERPA、ChatGPT支付组件的PCI-DSS。跨框架映射减少审计疲劳：访问控制映射跨ISO 27001 A.5.15-5.18、GDPR第32条、HIPAA §164.312(a)。

**类型:** 学习
**语言:** (Python可选——合规是政策+流程，不是代码)
**前置知识:** Phase 17 · 25 (安全), Phase 17 · 13 (可观测性)
**时间:** ~60分钟

## 学习目标

- 说出六个合规框架及其关键要求：SOC 2、HIPAA、GDPR、PCI-DSS、EU AI Act、ISO 42001。
- 解释EU AI Act罚款结构：高达3500万欧元或7%用于禁止实践。
- 描述跨框架映射如何减少审计疲劳。
- 说出推理时实时PII编辑是可辩护的标准。

## 问题

企业AI交易需要多框架合规。每个框架有不同要求但共享控制。跨框架映射减少重复工作。

## 概念

### 框架概览

| 框架          | 范围       | 关键要求                   |
| ------------- | ---------- | -------------------------- |
| SOC 2 Type II | B2B SaaS   | 安全、可用性、机密性       |
| HIPAA         | 医疗       | PHI保护，BAA必需           |
| GDPR          | EU个人数据 | 数据最小化，同意，删除权   |
| PCI-DSS       | 支付数据   | 卡数据保护                 |
| EU AI Act     | AI系统     | 风险分类，透明度，人类监督 |
| ISO 42001     | AI治理     | AI管理系统                 |

### EU AI Act

- 2024年8月1日生效。高风险要求2026年8月2日执行。
- 罚款：高达1500万欧元或3%(高风险义务)；高达3500万欧元或7%(禁止实践)。
- 全球适用如果服务EU用户。

### 跨框架映射

访问控制映射跨：

- ISO 27001 A.5.15-5.18
- GDPR第32条
- HIPAA §164.312(a)

一次实施，三个框架满足。

### 实时PII编辑

推理时实时PII编辑是可辩护的标准。后处理清理不够因为数据已离开你的系统。

## 实践

本课程无代码练习。合规是政策+流程。

## 输出

本课程产生`outputs/skill-compliance-matrix.md`。跨框架控制映射矩阵。

## 练习

1. 列出EU AI Act的高风险AI系统类别。
2. 为什么SOC 2 Type II比Type I更适合金融科技？
3. 设计跨框架映射：访问控制满足ISO 27001 + GDPR + HIPAA。
4. 实时PII编辑vs后处理清理：为什么后者不够？
5. 阅读EU AI Act第99条。描述罚款结构。

## 关键术语

| 术语          | 常见说法         | 实际含义                            |
| ------------- | ---------------- | ----------------------------------- |
| EU AI Act     | "欧盟AI法"       | 欧盟AI监管；2026年8月执行高风险要求 |
| SOC 2 Type II | "审计报告"       | 服务组织控制报告；B2B事实要求       |
| BAA           | "业务伙伴协议"   | HIPAA下PHI处理必需                  |
| 跨框架映射    | "一次实施多框架" | 相同控制满足多个合规框架            |
| 实时PII编辑   | "推理时脱敏"     | 推理时即时掩码PII；后处理不够       |

## 延伸阅读

- [EU AI Act Full Text](https://artificialintelligenceact.eu/)
- [SOC 2 Guide](https://www.aicpa-cima.com/topic/audit-assurance/audit-and-assurance-greater-than-soc-2)
