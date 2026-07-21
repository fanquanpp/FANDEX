---
title: 多代理软件工程团队
description: 'SWE-AF工厂架构、MetaGPT角色提示、AutoGen 0.4类型化actor图、Cognition Devin和Factory Droids都收敛于2026年相同形态：架构师规划、N个编码器并行工作树、审阅者门控、测试者验证。并行工作树将挂钟时间转化为吞吐量。共享状态和交接协议成为失败面。'
module: 'ai-engineering'
difficulty: advanced
tags:
  - 多代理
  - 'SWE-AF'
  - MetaGPT
  - 并行工作树
  - 工厂架构
  - 交接协议
related:
  - 'ai-engineering/端到端微调管线从数据到SFT到DPO到服务'
  - 'ai-engineering/多层网络'
  - 'ai-engineering/多模态文档QA视觉优先PDF与表格与图表'
  - 'ai-engineering/多区域LLM服务与KV缓存局部性'
prerequisites:
  - 'ai-engineering/机器学习概述'
---

## 问题

单代理编码线束在大任务上触及天花板。不是任何单个代理弱，而是200k token上下文无法容纳架构计划加四个并行代码库切片加审阅者评论加测试输出。多代理工厂拆分问题：架构师拥有计划、编码器在并行工作树中拥有实现、审阅者门控、测试者验证。

失败面是交接。架构师计划编码器无法实现的东西。编码器产生冲突的diff。审阅者批准幻觉修复。测试者与仍在编写的编码器竞争。

## 核心架构

### 角色

1. **架构师。** 分析问题，制定实现计划，分配子任务。
2. **编码器(N个)。** 在并行git工作树中实现子任务。
3. **审阅者。** 门控代码质量，捕获错误，批准合并。
4. **测试者。** 运行测试，验证正确性，报告覆盖。

### 并行工作树

每个编码器在独立git工作树中工作。完成后提交PR。审阅者审查。测试者验证。合并到主分支。

### 交接协议

架构师->编码器：子任务描述+依赖。编码器->审阅者：diff+理由。审阅者->测试者：批准的diff。测试者->架构师：测试结果+覆盖报告。

## 关键术语

| 术语                 | 常见说法           | 实际含义                           |
| -------------------- | ------------------ | ---------------------------------- |
| Factory architecture | "工厂架构"         | SWE-AF的多代理编码工厂             |
| Parallel worktrees   | "并行工作树"       | 每个编码器在独立git工作树中工作    |
| Handoff protocol     | "交接协议"         | 代理间任务传递的规范               |
| SWE-AF               | "软件工程代理工厂" | Software Engineering Agent Factory |
| Typed actor graph    | "类型化actor图"    | AutoGen的代理间通信图              |

## 延伸阅读

- SWE-AF — 工厂架构
- MetaGPT — 角色提示多代理
- AutoGen 0.4 — 类型化actor图
- Cognition Devin — 自主编码代理
