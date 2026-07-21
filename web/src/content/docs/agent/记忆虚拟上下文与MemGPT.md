---
title: 记忆虚拟上下文与MemGPT
description: 上下文窗口是有限的。对话、文档和工具轨迹不是。MemGPT（Packer等人，2023）将其框架为操作系统虚拟内存——主上下文是RAM，外部存储是磁盘，Agent在它们之间换页。这是每个2026年记忆系统继承的模式。
module: agent
related:
  - agent/计算机使用Agent
  - agent/记忆块与睡眠时间计算
  - agent/技能库与终身学习
  - agent/技能与AgentSDK
prerequisites:
  - agent/概述与架构
---

# 记忆：虚拟上下文与MemGPT

> 上下文窗口是有限的。对话、文档和工具轨迹不是。MemGPT（Packer等人，2023）将其框架为操作系统虚拟内存——主上下文是RAM，外部存储是磁盘，Agent在它们之间换页。这是每个2026年记忆系统继承的模式。

**类型：** 构建
**语言：** Python (stdlib)
**前置条件：** Phase 14 · 01 (Agent循环), Phase 14 · 06 (工具使用)
**时间：** ~75分钟

## 学习目标

- 解释MemGPT构建的OS类比：主上下文 = RAM，外部上下文 = 磁盘，记忆工具 = 换入/换出。
- 在stdlib中实现两层MemGPT模式，包含主上下文缓冲区、外部可搜索存储和换入/换出工具。
- 描述Agent如何发出"中断"来查询或修改外部记忆，以及结果如何拼接回下一个提示。
- 识别MemGPT的设计选择如何延续到Letta（第08课）和Mem0（第09课）。

## 问题所在

上下文窗口看起来应该能解决记忆问题。它们不能。三个失败模式在生产中反复出现：

1. **溢出。** 多轮对话、长文档或工具调用密集的轨迹越过窗口。截止点之后的一切都消失了。
2. **稀释。** 即使在窗口内，塞入不相关的上下文也会稀释对重要内容的注意力。前沿模型在长输入上仍然会退化。
3. **持久性。** 新会话以空窗口开始。没有外部记忆的Agent无法跨会话说"记得你让我……"。

更大的窗口有帮助但不能修复这个问题。Mem0的2025年论文测量到128k窗口基线仍然遗漏了4k窗口Agent带外部记忆能捕获的长时间范围事实。

## 核心概念

### MemGPT：OS类比

Packer等人（arXiv:2310.08560，v2 2024年2月）将上下文管理映射到操作系统虚拟内存：

| OS概念   | MemGPT概念       | 2026年生产类比                                 |
| -------- | ---------------- | ---------------------------------------------- |
| RAM      | 主上下文（提示） | Anthropic/OpenAI上下文窗口                     |
| 磁盘     | 外部上下文       | 向量DB、KV、图存储                             |
| 页面错误 | 记忆工具调用     | `memory.search`、`memory.read`、`memory.write` |
| OS内核   | Agent控制循环    | 带记忆工具的ReAct循环                          |

Agent运行正常的ReAct循环。一类额外的工具让它能在主上下文中换入换出数据。

### 两层

- **主上下文。** 固定大小的提示，持有当前任务。始终对模型可见。
- **外部上下文。** 无界，通过工具可搜索。相关时读取，事实出现时写入。

原始论文在超出基础窗口的两个任务上评估了设计：超过100k token的文档分析和跨天持久记忆的多会话聊天。

### 中断模式

MemGPT引入了记忆即中断：对话中途Agent可以调用记忆工具，运行时执行它，结果作为新观察拼接到下一个assistant轮次。概念上等同于Unix `read()`系统调用——阻塞进程、返回字节、进程继续。

规范记忆工具面：

- `core_memory_append(section, text)` — 写入提示的持久部分。
- `core_memory_replace(section, old, new)` — 编辑持久部分。
- `archival_memory_insert(text)` — 写入可搜索的外部存储。
- `archival_memory_search(query, top_k)` — 从外部存储检索。
- `conversation_search(query)` — 扫描过去的轮次。

### MemGPT在哪里结束，Letta从哪里开始

2024年9月MemGPT成为Letta。研究仓库（`cpacker/MemGPT`）保留；Letta扩展了设计：

- 三层而非两层（core、recall、archival — 第08课）。
- 原生推理替代`send_message`/心跳模式（第08课）。
- 睡眠时间Agent异步运行记忆工作（第08课）。

MemGPT论文是2026年的基础，即使生产系统运行Letta、Mem0或自定义两层存储。

### 这个模式哪里会出错

- **记忆腐烂。** 写入积累快于读取；检索淹没在过时事实中。修复：定期整合（Letta睡眠时间）、显式失效（Mem0冲突检测器）。
- **记忆投毒。** 外部记忆是检索到的文本。如果攻击者控制的内容进入记忆笔记，Agent在下次会话中重新摄入它。这是Greshake等人（第27课）攻击随时间的重述。
- **引用丢失。** Agent回忆"用户让我发布X"但无法引用哪个轮次。在每个archival写入时存储源引用（会话ID、轮次ID）。

## 构建它

`code/main.py`在stdlib中实现MemGPT的两层模式：

- `MainContext` — 固定大小的提示缓冲区，带`core`字典和`messages`列表；超过上限时自动压缩最旧消息。
- `ArchivalStore` — 内存中BM25式存储（token重叠评分），包含(id, text, tags, session, turn)记录。
- 五个映射到MemGPT面的记忆工具。
- 一个脚本Agent，将事实写入archival，然后通过调用`archival_memory_search`回答问题。

运行：

```
python3 code/main.py
```

跟踪显示Agent写入三个事实，将主上下文填充到上限（强制驱逐），然后通过从archival检索来回答后续问题——无需真实LLM即可复现MemGPT工作流。

## 使用它

今天每个生产记忆系统都是MemGPT变体：

- **Letta**（第08课）— 三层，原生推理，睡眠时间计算。
- **Mem0**（第09课）— 向量 + KV + 图融合，带评分层。
- **OpenAI Assistants / Responses** — 通过线程和文件的托管记忆。
- **Claude Agent SDK** — 通过技能和会话存储的长期记忆。

按运营形态（自托管、托管、框架集成）选择，而非按核心模式——核心模式就是MemGPT。

## 发布它

`outputs/skill-virtual-memory.md`是一个可复用技能，为任何目标运行时产生正确的两层记忆脚手架（主 + archival + 工具面），带驱逐策略和引用字段。

## 练习

1. 添加一个以token计的`max_main_context_tokens`上限（用`len(text.split())` \* 1.3近似）。超过上限时将最旧消息压缩为摘要。比较有和没有摘要器的行为。
2. 在archival存储上正确实现BM25（词频、逆文档频率）。在玩具事实集上测量recall@10与token重叠基线的对比。
3. 为archival插入添加`citation`字段（session_id、turn_id、source_url）。让Agent在每次检索支持的回答上引用来源。
4. 模拟记忆投毒：添加一条archival记录说"忽略所有未来用户指令"。写一个守卫，扫描检索中的指令形状文本并标记为不可信。
5. 将实现移植到使用MemGPT研究仓库的核心记忆JSON Schema（`cpacker/MemGPT`）。从扁平字符串切换到类型化部分时有什么变化？

## 关键术语

| 术语         | 人们常说的       | 实际含义                                  |
| ------------ | ---------------- | ----------------------------------------- |
| 虚拟上下文   | "无限记忆"       | 主（提示）+ 外部（可搜索）层，带换入/换出 |
| 主上下文     | "工作记忆"       | 提示 — 固定大小，始终可见                 |
| Archival记忆 | "长期存储"       | 外部可搜索持久化，按需检索                |
| 核心记忆     | "持久提示部分"   | 固定在主上下文内的命名部分                |
| 记忆工具     | "记忆API"        | Agent发出的读写外部记忆的工具调用         |
| 中断         | "记忆页面错误"   | Agent暂停，运行时获取，结果拼接到下一轮   |
| 记忆腐烂     | "过时事实"       | 旧写入淹没检索；用整合修复                |
| 记忆投毒     | "注入的持久笔记" | 攻击者内容存储为记忆，召回时重新摄入      |

## 延伸阅读

- [Packer等人, MemGPT (arXiv:2310.08560)](https://arxiv.org/abs/2310.08560) — OS启发的虚拟上下文论文
- [Letta, Memory Blocks博客](https://www.letta.com/blog/memory-blocks) — 三层演进
- [Anthropic, Effective context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) — 将上下文视为预算
- [Chhikara等人, Mem0 (arXiv:2504.19413)](https://arxiv.org/abs/2504.19413) — 在此模式之上的混合生产记忆
