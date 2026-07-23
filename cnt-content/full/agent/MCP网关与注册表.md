---
title: 'MCP网关与注册表 — 企业控制平面'
description: 掌握MCP网关的五大职责和官方注册表体系，理解企业级MCP部署的集中化策略
module: agent
difficulty: advanced
tags:
  - MCP网关
  - 注册表
  - RBAC
  - 审计
  - 策略即代码
related:
  - agent/MCP基础
  - agent/MCP生产认证
  - agent/MCP异步任务
  - agent/MCP应用
prerequisites:
  - agent/概述与架构
---

# MCP网关与注册表 — 企业控制平面

> 企业不能让每个开发者安装随机MCP服务器。网关集中认证、RBAC、审计、速率限制、缓存和工具投毒检测，然后将合并工具表面暴露为单个MCP端点。官方MCP注册表（Anthropic + GitHub + PulseMCP + Microsoft，命名空间验证）是权威上游。本课命名网关适合的位置、走过最小实现，并调研2026年供应商格局。

**类型：** 学习
**语言：** Python（标准库，最小网关）
**前置条件：** Phase 13 · 15（工具投毒），Phase 13 · 16（OAuth 2.1）
**时间：** ~45分钟

## 学习目标

- 解释MCP网关的位置（在MCP客户端和多个后端MCP服务器之间）。
- 实现五个网关职责：认证、RBAC、审计、速率限制、策略。
- 在网关层强制固定工具哈希清单。
- 区分官方MCP注册表与元注册表（Glama、MCPMarket、MCP.so、Smithery、LobeHub）。

## 问题所在

一家财富500强有30个批准的MCP服务器、5000名开发者、合规和审计要求，以及想要集中策略的安全团队。让每个开发者在IDE中安装任意服务器是不可行的。

网关模式：

1. 网关作为开发者连接的单个Streamable HTTP端点运行。
2. 网关持有每个后端MCP服务器的凭证。
3. 每个开发者请求通过网关自己的OAuth认证和限定作用域。
4. 网关将调用路由到后端服务器，应用策略。
5. 所有调用记录以供审计。

Cloudflare MCP Portals、Kong AI Gateway、IBM ContextForge、MintMCP、TrueFoundry、Envoy AI Gateway — 都在2025-2026年发布了网关或网关功能。

同时，官方MCP注册表作为权威上游启动：策划的、命名空间验证的、反向DNS命名的服务器，网关可以从中拉取。元注册表（Glama、MCPMarket、MCP.so、Smithery、LobeHub）跨多个来源聚合服务器。

## 核心概念

### 五个网关职责

1. **认证。** OAuth 2.1识别开发者；映射到用户角色。
2. **RBAC。** 每用户策略：哪些服务器、哪些工具、哪些作用域。
3. **审计。** 每次调用记录谁、什么、何时、结果。
4. **速率限制。** 每用户/每工具/每服务器上限以防止滥用。
5. **策略。** 拒绝投毒描述、强制二规则、编辑PII。

### 网关作为单端点

对开发者来说，网关看起来像一个MCP服务器。内部它路由到N个后端。会话id（Phase 13 · 09）在边界处重写。

### 凭证保管

开发者永远看不到后端token。网关持有它们（或代理到持有的身份提供商）。在网关上有 `notes:read` 的开发者可以传递性地用网关自己的后端凭证访问笔记MCP服务器 — 但仅在绑定传递访问的策略下。

### 网关处的工具哈希固定

网关持有批准工具描述的清单（SHA256哈希）。在发现时，它获取每个后端的 `tools/list`，将哈希与清单比较，并移除任何描述已变更的工具。这是Phase 13 · 15的地毯拉扯防御集中应用。

### 策略即代码

高级网关用OPA/Rego、Kyverno或Styra表达策略。像"用户 `alice` 只能在org `acme` 的repo上调用 `github.open_pr`"这样的规则声明式编码。简单网关使用手写Python。两种形状都有效。

### 会话感知路由

当用户的会话包含混合服务器时，网关多路复用：开发者的单个MCP会话持有N个后端会话，每个服务器一个。来自任何后端的通知通过网关路由到开发者的会话。

### 命名空间合并

网关合并所有后端的工具命名空间，通常在冲突时加前缀。`github.open_pr`、`notes.search`。这使路由无歧义。

### 注册表

- **官方MCP注册表（`registry.modelcontextprotocol.io`）。** 在Anthropic、GitHub、PulseMCP、Microsoft管理下启动。命名空间验证（反向DNS：`io.github.user/server`）。基本质量预过滤。
- **Glama。** 搜索为中心的元注册表，聚合多个来源。
- **MCPMarket。** 商业导向目录，带供应商列表。
- **MCP.so。** 社区目录；开放提交。
- **Smithery。** 包管理器风格安装流程。
- **LobeHub。** 在其LobeChat应用中的UI集成注册表。

企业网关默认从官方注册表拉取，允许管理员从元注册表策划添加，并拒绝任何未固定的。

### 反向DNS命名

官方注册表要求公共服务器使用反向DNS名称：`io.github.alice/notes`。命名空间防止抢注并使信任委托更清晰。

### 供应商调研，2026年4月

| 供应商                 | 优势                                     |
| ---------------------- | ---------------------------------------- |
| Cloudflare MCP Portals | 边缘托管；OAuth集成；免费层              |
| Kong AI Gateway        | K8s原生；细粒度策略；日志到OpenTelemetry |
| IBM ContextForge       | 企业IAM；合规；审计导出                  |
| TrueFoundry            | DevOps导向；指标优先                     |
| MintMCP                | 开发者平台导向                           |
| Envoy AI Gateway       | 开源；可定制过滤器                       |

Phase 17（生产基础设施）更深入网关运营。

## 实践

`code/main.py` 在约150行中提供最小网关：通过假Bearer token认证用户，持有每用户RBAC策略，将请求路由到两个后端MCP服务器，将每次调用写入审计日志，强制速率限制，并拒绝任何描述哈希不匹配固定清单的后端工具。

关注点：

- `RBAC` 字典以 `user_id` 为键，带有允许的 `server_tool` 条目。
- `AUDIT_LOG` 是只追加的事件列表。
- 速率限制使用每用户令牌桶。
- 固定清单是 `server::tool -> hash` 的字典。

## 交付

本课产生 `outputs/skill-gateway-bootstrap.md`。给定企业MCP计划（用户、后端、合规），该技能生成网关配置规范。

## 练习

1. 运行 `code/main.py`。作为允许用户发起调用；然后作为不允许用户；然后速率限制超限突发。验证三个流程。

2. 添加在返回给客户端之前从结果中编辑PII的策略。使用简单的正则传递SSN形状字符串；注意差距（电子邮件、电话号码）。

3. 扩展审计日志以发出OpenTelemetry GenAI span。Phase 13 · 20涵盖确切的属性。

4. 为50开发者团队设计RBAC策略，有五个后端（notes、github、postgres、jira、slack）。谁对每个有只读？谁有写入？

5. 从头到尾阅读Cloudflare企业MCP文章。识别Cloudflare提供但此标准库网关没有的一个功能。

## 关键术语

| 术语                  | 人们怎么说              | 实际含义                                         |
| --------------------- | ----------------------- | ------------------------------------------------ |
| Gateway               | "MCP代理"               | 客户端和后端之间的集中化服务器                   |
| Credential vaulting   | "后端token留在服务器侧" | 开发者永远看不到上游token                        |
| Session-aware routing | "多后端会话"            | 网关为每个开发者会话多路复用N个后端会话          |
| Tool-hash pinning     | "批准清单"              | 每个批准工具描述的SHA256；集中阻止地毯拉扯       |
| RBAC                  | "每用户策略"            | 工具和服务器的基于角色访问控制                   |
| Policy-as-code        | "声明式规则"            | 在网关处强制的OPA/Rego、Kyverno、Styra策略       |
| Audit log             | "谁、什么、何时"        | 合规的只追加事件日志                             |
| Rate limit            | "每用户令牌桶"          | 每分钟上限以防止滥用                             |
| Official MCP Registry | "权威上游"              | `registry.modelcontextprotocol.io`，命名空间验证 |
| Reverse-DNS naming    | "注册表命名空间"        | `io.github.user/server` 约定                     |

## 延伸阅读

- [Official MCP Registry](https://registry.modelcontextprotocol.io/) — 权威上游，命名空间验证
- [Cloudflare — Enterprise MCP](https://blog.cloudflare.com/enterprise-mcp/) — 带OAuth和策略的网关模式
- [agentic-community — MCP gateway registry](https://github.com/agentic-community/mcp-gateway-registry) — 开源参考网关
- [TrueFoundry — What is an MCP gateway?](https://www.truefoundry.com/blog/what-is-mcp-gateway) — 功能比较文章
- [IBM — MCP context forge](https://github.com/IBM/mcp-context-forge) — IBM的企业网关
