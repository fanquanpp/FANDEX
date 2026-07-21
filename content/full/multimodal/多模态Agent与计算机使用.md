---
title: 多模态Agent与计算机使用
description: 理解GUI接地、动作schema和多模态Agent循环的端到端计算机使用架构
module: multimodal
difficulty: advanced
tags:
  - 多模态Agent
  - 计算机使用
  - GUI接地
  - 动作schema
  - SeeClick
  - AgentVista
related:
  - multimodal/多模态RAG与跨模态检索
  - multimodal/具身VLA机器人模型
prerequisites: []
---

# 多模态Agent与计算机使用(顶点课程)

> 2026年前沿产品是一个多模态agent，它读取截图、点击按钮、导航Web UI、填写表单并端到端完成工作流。SeeClick和CogAgent (2024)证明了GUI接地原语。Ferret-UI添加了移动端。ChartAgent引入了图表的视觉工具使用。VisualWebArena和AgentVista (2026)是前沿追逐的基准——甚至Gemini 3 Pro和Claude Opus 4.7在AgentVista的困难任务上也只得分约30%。本顶点课程汇集Phase 12的每条线索：感知(高分辨率VLM)、推理(带工具使用的LLM)、接地(坐标输出)、长程记忆和评估。

**类型:** 顶点课程
**语言:** Python (stdlib, 动作schema + agent循环骨架)
**前置知识:** Phase 12 · 05 (LLaVA), Phase 12 · 09 (Qwen-VL JSON), Phase 14 (Agent工程)
**时间:** ~240分钟

## 学习目标

- 设计多模态agent循环：感知→推理→行动→观察→重复。
- 构建VLM可以JSON发出的GUI接地输出schema(点击坐标、输入文本、滚动、拖拽)。
- 比较仅截图agent vs 无障碍树agent vs 混合agent。
- 在小型VisualWebArena切片上设置多模态agent基准评估。

## 问题

预订网站工作流："给我找一张4月15日去东京的机票，靠走道座位800美元以下，预订它。"

多模态agent需要：

1. 截取浏览器截图。
2. 将截图 + URL + 目标解析为计划。
3. 发出结构化动作：点击(在x,y)、输入"Tokyo"(在元素E)、向下滚动、选择(单选按钮)。
4. 将动作应用到浏览器。
5. 观察新状态(下一个截图)。
6. 重复直到任务完成。

每步是一次多模态VLM调用。VLM输出必须是可解析的JSON。错误跨步骤累积，所以恢复很重要。

## 概念

### GUI接地 — 原语

GUI接地是：给定截图和自然语言指令，输出要点击的(x, y)坐标(或其他动作)。

SeeClick (arXiv:2401.10935)是首个大规模开放结果：在合成+真实GUI数据上微调VLM，输出坐标为纯文本token。有效。

CogAgent (arXiv:2312.08914)为密集UI添加了1120x1120高分辨率编码。分数：Web导航约84%。

Ferret-UI (arXiv:2404.05719)聚焦移动UI，与iOS无障碍数据集成。

输出格式通常是JSON：

```json
{ "action": "click", "x": 384, "y": 220, "element_desc": "搜索按钮" }
```

`element_desc`帮助恢复：如果坐标在截图间漂移，语义提示让系统重新接地。

### 动作Schema

典型动作schema有6-10种动作类型：

- `click`：(x, y)
- `type`：(text, x?, y?)
- `scroll`：(direction, amount)
- `drag`：(x0, y0, x1, y1)
- `select`：(option_index)
- `hover`：(x, y)
- `navigate`：(url)
- `wait`：(ms)
- `done`：(success, explanation)

agent每步发出一个动作。浏览器包装器执行并返回新状态。

### 仅截图 vs 无障碍树

两种输入模式：

- 仅截图：完整图像，无结构信息。最通用；适用于任何应用。
- 无障碍树：结构化DOM / iOS无障碍信息。接地更可靠；在树可用时工作。
- 混合：两者兼有，树作为原子动作的可靠接地面，截图用于语义上下文。

生产agent在可能时使用混合。浏览器自动化(Selenium + 无障碍)总有树；桌面应用有时有。

### 长程记忆

20步工作流产生20张截图。VLM的上下文快速填满。三种压缩策略：

- 摘要链：每5步后，总结发生了什么，丢弃旧截图。
- 跳帧：保留第一张、最后一张和每第3张截图。
- 工具记录日志：执行动作，保留做了什么的文本日志；不重新查看旧截图。

Claude的计算机使用API使用日志模式。更简单，更可靠。

### 视觉工具使用

ChartAgent (arXiv:2510.04514)引入了图表理解的视觉工具使用：裁剪、缩放、OCR、调用外部检测。agent可以输出"裁剪到区域(100, 200, 300, 400)然后调用OCR"作为工具调用。工具返回文本；VLM继续推理。

此模式可泛化：set-of-mark提示、区域标注和外部检测工具都适合相同的"输出工具调用，接收结构化响应"schema。

### 2026年基准

- ScreenSpot-Pro。约1k Web截图上的GUI接地。开放SOTA Qwen2.5-VL-72B约85%。前沿约90%。
- VisualWebArena。端到端Web任务(购物、论坛、分类)。开放SOTA约20%。Gemini 3 Pro约27%。
- AgentVista (arXiv:2602.23166)。最难的2026基准。12个领域的现实工作流。前沿模型得分27-40%；开放模型10-20%。
- WebArena / WebShop。较老基准；被前沿饱和。

### 为什么仍然困难

Agent性能瓶颈：

1. 细粒度视觉接地。在移动分辨率下"点击小X"经常失败。
2. 长程规划。10个动作后agent偏离目标。
3. 错误恢复。当点击失败(错误按钮)时，检测+恢复很少是训练数据。
4. 跨页面上下文。在标签页或长表单间跳转丢失状态。

研究方向：记忆架构、显式重新规划、多模态验证(截图匹配确认动作成功)。

### 顶点课程构建

顶点任务：构建一个计算机使用agent：

1. 读取预订网站模拟页面的HTML + 截图。
2. 规划多步序列：搜索→选择→填写表单→提交。
3. 发出匹配动作schema的JSON动作。
4. 在固定10任务切片上评估。

课程提供易于扩展到真实浏览器的脚手架代码。

## 实践

`code/main.py`是顶点脚手架：

- 动作schema JSON定义(10种动作)。
- Mock浏览器状态作为字典。
- Agent循环骨架：接收状态、发出动作、应用、循环。
- 10任务迷你基准(合成页面)测量端到端成功率。
- 动作失败时的错误恢复钩子。

## 输出

本课程产生`outputs/skill-multimodal-agent-designer.md`。给定计算机使用产品(领域、动作集、评估目标)，设计完整agent循环、记忆策略、接地模式和预期基准分数。

## 练习

1. 用`screenshot_region`工具(裁剪+缩放)扩展动作schema。什么任务受益？

2. 阅读AgentVista (arXiv:2602.23166)。描述最困难的任务类别以及为什么前沿模型仍然失败。

3. 长程记忆压缩：设计保留<=4张截图活跃、任意数量日志的摘要链。

4. 构建错误恢复钩子：动作失败时(未找到按钮)，agent下一步做什么？

5. 比较仅截图Claude 4.7与混合截图+无障碍树Qwen2.5-VL在10个Web任务上。哪个在哪些任务上获胜？

## 关键术语

| 术语           | 常见说法         | 实际含义                                    |
| -------------- | ---------------- | ------------------------------------------- |
| GUI接地        | "点击坐标"       | 模型在截图上输出指令目标的(x,y)             |
| 动作Schema     | "工具定义"       | 有效动作(点击、输入、滚动、拖拽)的JSON描述  |
| 无障碍树       | "结构化DOM"      | 来自浏览器/iOS API的机器可读UI层次结构      |
| 混合Agent      | "截图+树"        | 同时使用图像和结构化信息；比任一单独更可靠  |
| 视觉工具使用   | "缩放/裁剪/检测" | Agent在计划中调用外部视觉工具(OCR、检测)    |
| 摘要链         | "记忆压缩"       | 定期文本摘要替换长截图历史                  |
| VisualWebArena | "端到端Web基准"  | 2024年端到端Web任务基准                     |
| AgentVista     | "2026困难基准"   | 12领域现实工作流；即使Gemini 3 Pro也只约30% |

## 延伸阅读

- [Cheng等人 — SeeClick (arXiv:2401.10935)](https://arxiv.org/abs/2401.10935)
- [Hong等人 — CogAgent (arXiv:2312.08914)](https://arxiv.org/abs/2312.08914)
- [You等人 — Ferret-UI (arXiv:2404.05719)](https://arxiv.org/abs/2404.05719)
- [ChartAgent (arXiv:2510.04514)](https://arxiv.org/abs/2510.04514)
- [Koh等人 — VisualWebArena (arXiv:2401.13649)](https://arxiv.org/abs/2401.13649)
- [AgentVista (arXiv:2602.23166)](https://arxiv.org/abs/2602.23166)
