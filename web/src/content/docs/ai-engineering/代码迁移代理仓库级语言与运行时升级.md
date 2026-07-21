---
title: 代码迁移代理仓库级语言与运行时升级
description: 'Amazon MigrationBench (Java 8到17)和Google App Engine Py2到Py3迁移器设定2026年标准。Moderne OpenRewrite做确定性AST重写，Grit用codemod风格DSL。生产模式结合两者：确定性基底处理安全重写+代理层处理模糊情况+沙盒逐分支构建+测试线束在PR打开前翻绿。迁移50个真实仓库并发布通过率和失败分类。'
module: 'ai-engineering'
difficulty: advanced
tags:
  - 代码迁移
  - MigrationBench
  - OpenRewrite
  - AST重写
  - Java迁移
  - Python迁移
related:
  - 'ai-engineering/超参数调优'
  - 'ai-engineering/代码库RAG与跨仓库语义搜索'
  - 'ai-engineering/调试神经网络'
  - 'ai-engineering/调试与性能分析'
prerequisites:
  - 'ai-engineering/机器学习概述'
---

## 问题

大规模代码迁移是2026年代码代理最干净的生产应用之一。地面真值明显（迁移后测试套件是否通过？），回报真实（Java-8舰队迁移是人头规模项目），基准公开（MigrationBench 50仓库子集）。Moderne的OpenRewrite处理确定性侧。代理层处理OpenRewrite配方无法处理的一切：模糊重写、构建系统漂移、长尾语法、传递依赖破坏。

你将构建一个代理，接受Java 8仓库（或Python 2仓库）并产出绿CI迁移分支。你将测量通过率、测试覆盖保留、每仓库成本，并构建失败分类法。与仅确定性基线的并排比较告诉你代理的价值实际在哪里。

## 核心架构

### 确定性基底

OpenRewrite配方处理：API重命名、删除方法替换、import语句更新、构建配置迁移。

### 代理层

LLM处理：模糊语义重写、上下文依赖决策、OpenRewrite配方未覆盖的长尾模式。

### 沙盒验证

每个分支在Docker沙盒中构建和测试。只有绿CI的分支才创建PR。

## 关键术语

| 术语             | 常见说法     | 实际含义                     |
| ---------------- | ------------ | ---------------------------- |
| MigrationBench   | "迁移基准"   | Amazon的50仓库Java迁移基准   |
| OpenRewrite      | "确定性重写" | Moderne的AST级确定性代码重写 |
| Codemod          | "代码修改"   | 自动化代码变换脚本           |
| Green CI         | "绿CI"       | 所有测试通过的持续集成状态   |
| Failure taxonomy | "失败分类法" | 迁移失败原因的系统分类       |

## 延伸阅读

- Amazon MigrationBench — Java 8到17迁移基准
- Moderne OpenRewrite — 确定性AST重写
- Grit — codemod风格DSL迁移
