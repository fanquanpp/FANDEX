---
title: 浏览器Agent与间接注入
description: 'ChatGPT agent（2025 年 7 月）将 Operator 和深度研究合并为一个浏览器/终端 Agent，BrowseComp SOTA 达 68.9%。OpenAI 于 2025 年 8 月 31 日关闭 Operator——产品层整合。Anthropic 的 Vercept 收...'
module: agent
related:
  - agent/角色专业化
  - agent/结构化输出
  - agent/评估驱动Agent开发
  - agent/评估与协调基准
prerequisites:
  - agent/概述与架构
---

# 浏览器 Agent 与长时间范围 Web 任务

> ChatGPT agent（2025 年 7 月）将 Operator 和深度研究合并为一个浏览器/终端 Agent，BrowseComp SOTA 达 68.9%。OpenAI 于 2025 年 8 月 31 日关闭 Operator——产品层整合。Anthropic 的 Vercept 收购将 Claude Sonnet 在 OSWorld 上从不到 15% 提升到 72.5%。WebArena-Verified (ServiceNow, ICLR 2026) 修复了原始 WebArena 中 11.3 个百分点的假阴性率，并发布了 258 任务的 Hard 子集。数字是真实的。攻击面也是：OpenAI 准备性负责人公开声明浏览器 Agent 中的间接提示注入"不是可以完全修补的 bug"。记录的 2025-2026 年攻击：Tainted Memories (Atlas CSRF)、HashJack (Cato Networks) 和 Perplexity Comet 中的一次点击劫持。

**类型：** 学习
**语言：** Python (stdlib, 间接提示注入攻击面模型)
**前置条件：** Phase 15 · 10 (权限模式), Phase 15 · 01 (长时间范围Agent)
**时间：** ~45 分钟

## 问题

浏览器 Agent 是读取不受信任内容并采取后果性动作的长时间范围 Agent。Agent 访问的每个页面都是用户未编写的输入。每个页面上的每个表单都是潜在的命令通道。2025-2026 年攻击语料库显示这不是假设的：Tainted Memories 让攻击者通过精心制作的页面将恶意指令绑定到 Agent 的记忆；HashJack 在 Agent 访问的 URL 片段中隐藏命令；Perplexity Comet 在一次点击中劫持。

防御图景令人不安。OpenAI 准备性负责人大声说出了安静的部分：间接提示注入"不是可以完全修补的 bug。"这是因为攻击存在于 Agent 的阅读 vs 行为边界中，这在架构上是模糊的——模型读取的每个 token 原则上都可以被读作指令。

本课程命名攻击面、命名基准格局（BrowseComp, OSWorld, WebArena-Verified），并建模最小间接提示注入场景，以便你可以在 Lessons 14 和 18 中推理真实防御。

## 概念

### 2026 年格局，每个系统一段

**ChatGPT agent (OpenAI)。** 2025 年 7 月发布。统一 Operator（浏览）和 Deep Research（多小时研究）。2025 年 8 月 31 日关闭独立 Operator。BrowseComp SOTA 68.9%；OSWorld 和 WebArena-Verified 上数字强劲。

**Claude Sonnet + Vercept (Anthropic)。** Anthropic 的 Vercept 收购专注于计算机使用能力。将 Claude Sonnet 在 OSWorld 上从 <15% 提升到 72.5%。Claude Computer Use 作为工具 API 发布。

**Gemini 3 Pro with Browser Use (DeepMind)。** Browser Use 集成发布计算机使用控制；FSF v3（2026 年 4 月, Lesson 20）专门在 ML R&D 领域追踪自主性。

**WebArena-Verified (ServiceNow, ICLR 2026)。** 修复了一个有充分记录的问题：原始 WebArena 有约 11.3% 假阴性率（标记为失败但实际已解决的任务）。Verified 版本用人工策划的成功标准重新评分，并添加 258 任务 Hard 子集。

### BrowseComp vs OSWorld vs WebArena

| 基准              | 测量什么                                  | 范围     |
| ----------------- | ----------------------------------------- | -------- |
| BrowseComp        | 在时间压力下在开放网络上查找特定事实      | 分钟     |
| OSWorld           | Agent 操作完整桌面（鼠标、键盘、Shell）   | 数十分钟 |
| WebArena-Verified | 模拟站点中的事务性 Web 任务               | 分钟     |
| Hard 子集         | 带多页面状态转换的 WebArena-Verified 任务 | 数十分钟 |

不同轴。高 BrowseComp 分数说明 Agent 找到事实；不说明 Agent 能订航班。OSWorld 分数更接近"它在我的桌面上工作吗"。WebArena-Verified 更接近"它能完成流程吗"。任何生产决策需要匹配任务分布的基准。

### 攻击面，命名

1. **间接提示注入。** 不受信任的页面内容包含指令。Agent 读取它们。Agent 执行它们。公开示例：2024 Kai Greshake 等人、2025 Tainted Memories 论文、2026 HashJack (Cato Networks)。
2. **URL 片段/查询注入。** 爬取 URL 的 `#fragment` 或查询字符串包含命令。从不可见渲染；仍在 Agent 上下文中。
3. **记忆绑定攻击。** 页面指示 Agent 写入持久记忆 (Lesson 12 覆盖持久状态)。下次会话，记忆在无可见触发器的情况下触发有效载荷。
4. **认证会话上的 CSRF 形状攻击。** Tainted Memories 类：Agent 在某处登录；攻击者页面发出 Agent 用用户 cookie 执行的状态更改请求。
5. **一次点击劫持。** 视觉上无害的按钮搭载 Agent 跟随的有效载荷。Comet 类。
6. **Agent 宿主表面中的内容安全策略漏洞。** 渲染和工具层本身可以是攻击向量；浏览器中的浏览器 Agent 栈很宽。

### 为什么"不可完全修补"

攻击与 Agent 的能力同构。Agent 必须读取不受信任内容才能工作。Agent 读取的任何内容都可能包含指令。Agent 遵循的任何指令都可能与用户实际请求不对齐。防御（信任边界、分类器、工具允许列表、后果性动作上的 HITL）提高攻击成本并减少爆炸半径。它们不关闭类别。

这与 Lob 定理 (Lesson 8) 的推理模式相同：Agent 无法证明下一个 token 是安全的；它只能建立一个使不安全 token 更可检测的系统。

### 实际发布的防御姿态

- **读/写边界。** 读取永远不是后果性的。写入（提交表单、发布内容、调用有副作用的工具）如果发起内容来自信任边界外，需要新的人工批准。
- **每任务工具允许列表。** Agent 可以浏览；它不能发起电汇，除非该工具为任务显式启用。Lesson 13 覆盖预算。
- **会话隔离。** 浏览器 Agent 会话仅使用范围凭证运行。无生产认证，无个人邮件。每个 HTTP 请求的日志保留用于审计。
- **内容净化器。** 获取的 HTML 在连接到模型上下文之前剥离已知不良模式。（减少简单攻击；不停止复杂有效载荷。）
- **后果性动作上的 HITL。** 先提议后提交模式 (Lesson 15)。
- **记忆上的金丝雀令牌。** 如果记忆条目触发，用户看到它 (Lesson 14)。

## 使用它

`code/main.py` 模拟一个微小浏览器 Agent 运行对抗三个合成页面。一个页面良性，一个在可见文本中有直接提示注入块，一个有 URL 片段注入（不可见但在 Agent 上下文中）。脚本显示 (a) 朴素 Agent 会做什么，(b) 读/写边界捕获什么，(c) 净化器捕获什么，(d) 两者都未捕获什么。

## 发布它

`outputs/skill-browser-agent-trust-boundary.md` 范围化提议的浏览器 Agent 部署：它触及哪些信任区域、被授权写入什么、首次运行前必须到位哪些防御。

## 练习

1. 运行 `code/main.py`。识别净化器捕获但读/写边界未捕获的攻击，以及只有读/写边界捕获的攻击。

2. 扩展净化器以检测一类 HashJack 风格的 URL 片段注入。测量合法片段良性 URL 上的误报率。

3. 选择你了解的一个真实浏览器 Agent 工作流（例如"订航班"）。列出每次读取和每次写入。标记哪些写入需要 HITL 及原因。

4. 阅读 WebArena-Verified ICLR 2026 论文。识别原始 WebArena 评分不可靠的一个任务类别，解释 Verified 子集如何解决它。

5. 为浏览器 Agent 设置设计记忆金丝雀。你会存储什么、在哪里、什么触发警报？

## 关键术语

| 术语              | 人们怎么说            | 实际含义                                                            |
| ----------------- | --------------------- | ------------------------------------------------------------------- |
| 间接提示注入      | "坏页面文本"          | Agent 读取的页面中不受信任内容包含 Agent 执行的指令                 |
| Tainted Memories  | "记忆攻击"            | Agent 将攻击者提供的指令写入持久记忆；下次会话触发                  |
| HashJack          | "URL 片段攻击"        | 隐藏在 URL 片段/查询字符串中的有效载荷在 Agent 上下文中但不可见渲染 |
| 一次点击劫持      | "坏按钮"              | 可见控件搭载 Agent 执行的后续有效载荷                               |
| BrowseComp        | "Web 搜索基准"        | 在开放网络上查找特定事实；分钟级范围                                |
| OSWorld           | "桌面基准"            | 完整 OS 控制；多步 GUI 任务                                         |
| WebArena-Verified | "修复的 Web 任务基准" | ServiceNow 的重新评分 WebArena 带 Hard 子集                         |
| 读/写边界         | "副作用门"            | 读取永远非后果性；内容来自信任外时写入需新批准                      |

## 延伸阅读

- [OpenAI — Introducing ChatGPT agent](https://openai.com/index/introducing-chatgpt-agent/) — Operator 和深度研究的合并；BrowseComp SOTA
- [OpenAI — Computer-Using Agent](https://openai.com/index/computer-using-agent/) — Operator 谱系和成为 ChatGPT agent 的架构
- [Zhou et al. — WebArena](https://webarena.dev/) — 原始基准
- [WebArena-Verified (OpenReview)](https://openreview.net/forum?id=94tlGxmqkN) — ICLR 2026 修复子集论文
- [Anthropic — Measuring agent autonomy in practice](https://www.anthropic.com/research/measuring-agent-autonomy) — 包括计算机使用 Agent 的攻击面讨论
