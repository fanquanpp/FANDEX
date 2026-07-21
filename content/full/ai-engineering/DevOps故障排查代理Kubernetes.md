---
title: DevOps故障排查代理Kubernetes
description: '2026年SRE叙事：AI代理分类事件，人类批准修复。AWS DevOps Agent、Resolve AI、NeuBird、Metoro都发布此形态。告警webhook触发，代理读取遥测，遍历K8s对象图，排序根因假设，发布带审批按钮的Slack简报。默认只读，每次修复需人工批准。'
module: 'ai-engineering'
difficulty: advanced
tags:
  - DevOps代理
  - Kubernetes
  - SRE
  - 根因分析
  - Slack集成
  - RBAC
related:
  - 'ai-engineering/AI网关比较'
  - 'ai-engineering/API与密钥'
  - 'ai-engineering/Docker与AI'
  - 'ai-engineering/EAGLE-3投机解码'
prerequisites:
  - 'ai-engineering/机器学习概述'
---

## 问题

2025-2026年SRE叙事变成："AI代理分类事件，人类批准修复。" AWS DevOps Agent、Resolve AI、NeuBird、Metoro、PagerDuty AIOps都在生产中发布此形态。代理读取Prometheus指标、Loki日志、Tempo traces、kube-state-metrics和K8s对象知识图谱。在五分钟内产生带遥测引用的排序根因假设。从不未经Slack显式人工批准执行破坏性命令。

大部分困难工作在范围界定和安全，而非推理。代理需要默认只读的RBAC面、加固的MCP工具服务器和每个考虑vs执行的命令审计日志。需要知道何时超出能力范围并升级。而且必须运行得足够便宜，使得OOM-kill级联不会产生$5k代理账单。

## 核心架构

### 事件响应流程

1. **告警接收。** Prometheus/Grafana告警触发webhook。
2. **遥测收集。** 代理查询指标、日志、traces、K8s状态。
3. **根因假设。** 排序可能根因，附遥测证据。
4. **Slack简报。** 发布带审批按钮的摘要。
5. **人工批准修复。** 只读操作自动执行；破坏性操作需人工批准。

### 安全约束

- 默认只读RBAC。
- 每个工具调用的审计日志。
- 每仓库每日预算强制。
- 破坏性命令的人工审批门。

## 关键术语

| 术语                 | 常见说法             | 实际含义                  |
| -------------------- | -------------------- | ------------------------- |
| RCA                  | "根因分析"           | Root Cause Analysis       |
| RBAC                 | "基于角色的访问控制" | Role-Based Access Control |
| Read-only-by-default | "默认只读"           | 代理默认不能执行修改操作  |
| Approval gate        | "审批门"             | 破坏性操作需人工批准      |
| SLO                  | "服务级别目标"       | Service Level Objective   |

## 延伸阅读

- AWS DevOps Agent — GA级DevOps代理
- Resolve AI — K8s故障排查手册
- Metoro — 每服务SLO的AI SRE
