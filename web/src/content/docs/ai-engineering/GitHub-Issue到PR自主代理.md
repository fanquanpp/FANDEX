---
title: 'GitHub Issue到PR自主代理'
description: 'AWS Remote SWE Agents、Cursor Background Agents、OpenAI Codex cloud和Google Jules都发布2026年相同产品形态：标记issue，获得PR。在云沙盒中运行代理，验证测试通过，发布带理由的review-ready PR。难点在于自动复现仓库构建环境、防止凭证泄露、强制每仓库预算、确保代理不能force-push。构建自托管版本并在成本和通过率上与托管替代比较。'
module: 'ai-engineering'
difficulty: advanced
tags:
  - Issue到PR
  - 云沙盒
  - 'GitHub App'
  - 异步代理
  - 凭证范围
  - 预算强制
related:
  - 'ai-engineering/EAGLE-3投机解码'
  - 'ai-engineering/Git与协作'
  - 'ai-engineering/GPU与云计算'
  - 'ai-engineering/GPU自动伸缩与Kubernetes'
prerequisites:
  - 'ai-engineering/机器学习概述'
---

## 问题

异步云编码代理是与交互式编码代理（顶点01）分开的产品类别。UX是一个GitHub标签。你给issue打上`@agent fix this`标签，worker在云沙盒中启动，克隆仓库，运行测试，编辑文件，验证，并打开带代理理由的PR。无交互循环，无终端。

工程挑战是具体的：环境复现（代理必须从零构建仓库而没有缓存开发镜像）、脆弱测试（必须重新运行或隔离）、凭证范围（最小细粒度权限的GitHub App）、每仓库每日预算强制和no-force-push策略。

## 核心架构

### 工作流

1. **Issue标签触发。** GitHub webhook通知代理。
2. **沙盒启动。** Docker容器克隆仓库，安装依赖。
3. **代理执行。** 计划-行动-观察循环修复issue。
4. **测试验证。** 运行完整测试套件。
5. **PR创建。** 发布带理由的pull request。

### 安全

- GitHub App最小权限（仅读写代码、PR）。
- 每仓库每日预算强制。
- No-force-push策略。
- 凭证范围限制（无仓库secret访问）。

## 关键术语

| 术语                     | 常见说法       | 实际含义               |
| ------------------------ | -------------- | ---------------------- |
| Async cloud agent        | "异步云代理"   | 非交互式云沙盒编码代理 |
| Environment reproduction | "环境复现"     | 从零构建仓库开发环境   |
| Credential scoping       | "凭证范围"     | 限制代理的访问权限     |
| Budget enforcement       | "预算强制"     | 限制每仓库每日计算支出 |
| No-force-push            | "禁止强制推送" | 防止代理覆盖git历史    |

## 延伸阅读

- AWS Remote SWE Agents — 云编码代理
- Cursor Background Agents — IDE后台代理
- OpenAI Codex cloud — 云编码代理
- Google Jules — Google云编码代理
