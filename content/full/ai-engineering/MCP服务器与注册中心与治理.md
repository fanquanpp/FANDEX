---
title: MCP服务器与注册中心与治理
description: 'Model Context Protocol在2026年从未来变成默认工具使用规范。Anthropic、OpenAI、Google和每个主要IDE都发布MCP客户端。Pinterest发布内部MCP服务器生态。AAIF Registry在.well-known正式化能力元数据。2026年生产形态：StreamableHTTP传输、OAuth 2.1范围、OPA策略门控、注册中心让平台团队发现验证启用服务器。端到端构建。'
module: 'ai-engineering'
difficulty: advanced
tags:
  - MCP
  - 工具注册
  - StreamableHTTP
  - 'OAuth 2.1'
  - OPA策略
  - 'AAIF Registry'
related:
  - 'ai-engineering/LLM可观测性栈选择'
  - 'ai-engineering/LLM生产混沌工程'
  - 'ai-engineering/ML流水线'
  - 'ai-engineering/Prompt缓存与语义缓存'
prerequisites:
  - 'ai-engineering/机器学习概述'
---

## 问题

MCP成为工具使用通用语。Claude Code、Cursor 3、Amp、OpenCode、Gemini CLI和每个托管代理现在消费MCP服务器。生产挑战不是编写服务器（FastMCP让这很容易）而是按企业要求大规模部署：每租户OAuth范围、破坏性工具的OPA策略、StreamableHTTP无状态扩展、发现注册中心、每次工具调用的审计日志。

你将构建暴露10个内部工具（Postgres只读、S3列表、Jira、Linear、Datadog等）的MCP服务器、平台发现的注册UI和破坏性工具的人工审批门。负载测试演示StreamableHTTP水平扩展。审计轨迹满足企业安全审查。

## 核心架构

### MCP服务器

FastMCP或@modelcontextprotocol/sdk构建。暴露工具列表、调用工具、返回结果。StreamableHTTP传输支持无状态水平扩展。

### 注册中心

AAIF Registry风格的.well-known端点。元数据：工具名称、描述、OAuth范围、策略标签。平台团队发现、验证、启用服务器。

### 治理

OAuth 2.1范围控制工具访问。OPA策略门控破坏性工具。每次工具调用的审计日志。

## 关键术语

| 术语            | 常见说法         | 实际含义                             |
| --------------- | ---------------- | ------------------------------------ |
| MCP             | "模型上下文协议" | Model Context Protocol，工具使用规范 |
| StreamableHTTP  | "流式HTTP"       | MCP的无状态HTTP传输                  |
| AAIF Registry   | "AAIF注册"       | MCP服务器发现和能力元数据注册        |
| OPA             | "开放策略代理"   | Open Policy Agent，策略门控引擎      |
| Tool governance | "工具治理"       | 工具访问的策略和审计控制             |

## 延伸阅读

- Model Context Protocol — Anthropic工具使用规范
- Pinterest MCP ecosystem — 内部MCP服务器
- AAIF Registry — MCP注册规范
- FastMCP — Python MCP服务器框架
