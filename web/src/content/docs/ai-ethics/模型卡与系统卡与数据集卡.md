---
title: 模型卡与系统卡与数据集卡
description: '三种AI透明度文档格式：Model Cards (Mitchell 2019) — 模型营养标签，仅0.3%的HF模型卡记录伦理考量；Datasheets (Gebru 2018) — 数据集电子元件规格表类比；Data Cards (Google 2022) — 模块化分层细节；System Cards — 端到端AI系统文档。2024-2025年发展：LLM自动生成(CardGen)、可验证证明(Laminator)、可持续性报告。'
module: 'ai-ethics'
difficulty: advanced
tags:
  - 'Model Card'
  - Datasheet
  - 'System Card'
  - 透明度
  - 可验证证明
  - CardGen
related:
  - 'ai-ethics/可扩展监督与弱到强泛化'
  - 'ai-ethics/模型福利研究'
  - 'ai-ethics/偏见与代表性伤害'
  - 'ai-ethics/前沿安全框架RSP与PF与FSF'
prerequisites:
  - 'ai-ethics/谄媚作为RLHF放大器'
---

## 问题定义

监管框架（第24课）和实验室安全政策（第18课）都要求文档。文档格式从模型特定（模型卡）演进到数据集特定（数据表）再到系统特定（系统卡）。每种解决不同范围的透明度。2024-2025年自动化和可验证证明工作解决了长期采用问题。

## 核心概念

### Model Cards (Mitchell等人2019)

章节：

- 模型详情。
- 预期用途。
- 因素（评估相关的人口或环境因素）。
- 指标。
- 评估数据。
- 训练数据。
- 定量分析（按因素分解）。
- 伦理考量。
- 注意事项和建议。

采用问题：Oreamuno等人2023年对Hugging Face模型卡的审计发现仅0.3%记录伦理考量。

### Datasheets for Datasets (Gebru等人2018)

电子元件规格表类比。章节：

- 动机（为什么创建数据集）。
- 组成（里面有什么）。
- 收集过程（如何组装）。
- 标注（如适用）。
- 用途（预期、禁止、风险）。
- 分发。
- 维护。

发表于CACM 2021。数据表是上游文档；模型卡依赖数据表的准确性。

### Data Cards (Pushkarna等人, Google 2022)

模块化分层细节。三个缩放级别：

- **望远镜式(Telescopic)。** 非专家的高层摘要。
- **潜望镜式(Periscopic)。** ML从业者的中层概览。
- **显微镜式(Microscopic)。** 审计员的详细特征级文档。

边界对象框架：不同读者从同一文档中提取不同信息。

### System Cards

范围：端到端AI系统，包括模型+安全栈+部署上下文。章节通常包括：

- 安全能力。
- 提示注入防护。
- 数据泄露检测。
- 与声明的人类价值观的对齐。
- 事件响应。

### 2024-2025年发展

- **CardGen (Liu等人2024)。** 通过LLM自动生成模型卡；报告在标准化Mitchell 2019字段上比许多人写卡片具有更高客观性。
- **下载相关性(Liang等人2024)。** 详细模型卡与HF上高达29%的更高下载率相关——采用压力现在是市场驱动的，不仅是合规驱动的。
- **Laminator (Duddu等人2024)。** 通过硬件TEE/加密签名的可验证证明——允许模型卡携带声明证明，不仅是声明。
- **可持续性(Jouneaux等人2025年7月)。** 碳、水和计算能耗足迹的添加；新兴ISO标准。
- **监管卡。** EU AI Act（第24课）GPAI实践准则透明度章节要求模型卡作为合规产物。

## 关键术语

| 术语                   | 常见说法           | 实际含义                             |
| ---------------------- | ------------------ | ------------------------------------ |
| Model Card             | "Mitchell卡"       | Mitchell等人2019 ML模型标准文档      |
| Datasheet              | "Gebru数据表"      | Gebru等人2018 数据集标准文档         |
| Data Card              | "Pushkarna卡"      | Google 2022 模块化分层数据文档       |
| System Card            | "部署卡"           | 包含安全栈的端到端AI系统文档         |
| Boundary object        | "不同读者同一文档" | Data Cards框架：同一文档服务多样受众 |
| Verifiable attestation | "Laminator证明"    | 附在文档声明上的加密或TEE证明        |
| Sustainability field   | "碳/水足迹"        | 2025年新兴环境核算添加               |

## 延伸阅读

- Mitchell et al. — Model Cards for Model Reporting (arXiv:1810.03993, FAT\* 2019) — 经典模型卡
- Gebru et al. — Datasheets for Datasets (CACM 2021, arXiv:1803.09010) — 数据表论文
- Pushkarna et al. — Data Cards (Google 2022) — 分层数据文档
- Sidhpurwala et al. — Blueprints of Trust (arXiv:2509.20394) — System Card形式化
