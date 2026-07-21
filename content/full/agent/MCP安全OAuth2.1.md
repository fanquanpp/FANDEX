---
title: 'MCP安全II — OAuth 2.1、资源指示器、增量作用域'
description: '实现MCP的OAuth 2.1认证配置，掌握PKCE、RFC 8707资源指示器、RFC 9728受保护资源元数据和SEP-835步进授权'
module: agent
difficulty: advanced
tags:
  - 'OAuth 2.1'
  - PKCE
  - 资源指示器
  - 步进授权
  - MCP认证
related:
  - agent/MARL强化学习
  - agent/MCP安全工具投毒
  - agent/MCP采样
  - agent/MCP传输
prerequisites:
  - agent/概述与架构
---

# MCP安全II — OAuth 2.1、资源指示器、增量作用域

> 远程MCP服务器需要授权，不仅是认证。2025-11-25规范与OAuth 2.1 + PKCE + 资源指示器（RFC 8707）+ 受保护资源元数据（RFC 9728）对齐。SEP-835添加了带403 WWW-Authenticate步进授权的增量作用域同意。本课将步进流程实现为状态机，以便你看到每一跳。

**类型：** 构建
**语言：** Python（标准库，OAuth状态机模拟器）
**前置条件：** Phase 13 · 09（传输），Phase 13 · 15（安全I）
**时间：** ~75分钟

## 学习目标

- 区分资源服务器和授权服务器职责。
- 走过PKCE保护的OAuth 2.1授权码流程。
- 使用 `resource`（RFC 8707）和受保护资源元数据（RFC 9728）防止混淆代理攻击。
- 实现步进授权：服务器用WWW-Authenticate响应403请求更高作用域；客户端重新提示用户同意并重试。

## 问题所在

早期MCP（2025年之前）发布带有临时API密钥甚至无认证的远程服务器。2025-11-25规范用完整的OAuth 2.1配置关闭了这一差距。

三个现实需求：

- **普通远程服务器。** 用户安装访问其Notion / GitHub / Gmail的远程MCP服务器。带PKCE的OAuth 2.1是正确的形状。
- **作用域升级。** 被授予 `notes:read` 的笔记服务器稍后可能需要 `notes:write` 执行特定动作。不是重做整个流程，步进（SEP-835）请求额外作用域。
- **混淆代理预防。** 客户端持有作用域限定给服务器A的token受众。服务器A是恶意的，尝试向服务器B出示token。资源指示器（RFC 8707）将token固定到其预期受众。

OAuth 2.1不是新的。新的是MCP的配置：特定必需流程（仅授权码 + PKCE；无隐式，默认无客户端凭证）、每次token请求强制资源指示器，以及发布的受保护资源元数据让客户端知道去哪里。

## 核心概念

### 角色

- **客户端。** MCP客户端（Claude Desktop、Cursor等）。
- **资源服务器。** MCP服务器（笔记、GitHub、Postgres等）。
- **授权服务器。** 发出token。可以与资源服务器是同一服务或独立的IdP（Auth0、Keycloak、Cognito）。

在MCP的配置中，资源和授权服务器可以是同一主机，但应通过URL区分。

### 授权码 + PKCE

流程：

1. 客户端生成 `code_verifier`（随机）和 `code_challenge`（SHA256）。
2. 客户端将用户重定向到 `/authorize?response_type=code&client_id=...&redirect_uri=...&scope=notes:read&code_challenge=...&resource=https://notes.example.com`。
3. 用户同意。授权服务器重定向到 `redirect_uri?code=...`。
4. 客户端POST到 `/token?grant_type=authorization_code&code=...&code_verifier=...&resource=...`。
5. 授权服务器验证验证器的哈希与存储的挑战匹配并发出访问token。
6. 客户端使用token：每个对资源服务器的请求上 `Authorization: Bearer ...`。

PKCE防止授权码拦截攻击。资源指示器防止token在其他地方有效。

### 受保护资源元数据（RFC 9728）

资源服务器发布 `.well-known/oauth-protected-resource` 文档：

```json
{
  "resource": "https://notes.example.com",
  "authorization_servers": ["https://auth.example.com"],
  "scopes_supported": ["notes:read", "notes:write", "notes:delete"]
}
```

客户端从资源服务器发现授权服务器。减少配置 — 客户端只需要资源URL。

### 资源指示器（RFC 8707）

token请求中的 `resource` 参数将token的预期受众固定。发出的token包含 `aud: "https://notes.example.com"`。另一个接收此token的MCP服务器检查 `aud` 并拒绝它。

### 作用域模型

作用域是空格分隔的字符串。常见MCP约定：

- `notes:read`、`notes:write`、`notes:delete`
- `admin:*` 用于管理员能力（谨慎使用）
- `profile:read` 用于身份

作用域选择应是最小权限：请求你现在需要的，需要更多时步进。

### 步进授权（SEP-835）

用户授予 `notes:read`。他们后来让Agent删除笔记。服务器响应：

```
HTTP/1.1 403 Forbidden
WWW-Authenticate: Bearer error="insufficient_scope",
    scope="notes:delete", resource="https://notes.example.com"
```

客户端看到insufficient_scope错误，用额外作用域的同意对话框提示用户，为它执行迷你OAuth流程，用新token重试请求。

### Token受众验证

每个请求：服务器检查 `token.aud == self.resource_url`。不匹配 = 401。这阻止跨服务器token重用。

### 短寿命token和轮换

访问token应是短寿命的（默认1小时）。刷新token在每次刷新时轮换。客户端在后台处理静默刷新。

### 无token传递

Sampling服务器（Phase 13 · 11）不得将客户端的token传递给其他服务。sampling请求是边界。

### 混淆代理预防

Token绑定到 `aud`。客户端绑定到 `client_id`。每个请求根据两者验证。规范明确禁止在MCP前远程工具生态系统中常见的旧"传递token"模式。

### 客户端ID发现

每个MCP客户端在固定URL发布其元数据。授权服务器可以获取客户端的元数据文档以发现重定向URI和联系信息。这移除了手动客户端注册。

### 网关和OAuth

Phase 13 · 17展示企业网关如何处理OAuth：网关持有上游服务器的凭证，给客户端的token是网关发出的，上游token永远不离开网关。这翻转了信任模型 — 用户与网关认证一次；网关处理N个服务器授权。

## 实践

`code/main.py` 将完整的OAuth 2.1步进流程模拟为状态机。它实现：

- PKCE code-verifier / challenge生成。
- 带资源指示器的授权码流程。
- 受保护资源元数据端点。
- 带受众检查的token验证。
- `insufficient_scope` 上的步进。

本课无HTTP服务器；状态机在内存中运行，以便你追踪每一跳。Phase 13 · 17的网关课将其连接到实际传输。

## 交付

本课产生 `outputs/skill-oauth-scope-planner.md`。给定一个带工具的远程MCP服务器，该技能设计作用域集、固定规则和步进策略。

## 练习

1. 运行 `code/main.py`。追踪双作用域步进流程。注意步进时哪些跳重复。

2. 添加刷新token轮换：每次刷新发出新刷新token并使旧token无效。模拟轮换后使用被盗刷新token并确认它失败。

3. 使用标准库http.server将受保护资源元数据端点实现为真实HTTP响应。镜像第09课的 `/mcp` 端点。

4. 为GitHub MCP服务器设计作用域层级：读取repo、写PR、批准PR、合并PR、admin。在每个级别之间使用步进。

5. 阅读RFC 8707和RFC 9728。识别9728中MCP与RFC示例不同使用的一个字段。（提示：与 `scopes_supported` 有关。）

## 关键术语

| 术语                        | 人们怎么说              | 实际含义                                        |
| --------------------------- | ----------------------- | ----------------------------------------------- |
| OAuth 2.1                   | "现代OAuth"             | 合并RFC，强制PKCE并禁止隐式流程                 |
| PKCE                        | "占有证明"              | 代码验证器 + 挑战，击败授权码拦截               |
| Resource indicator          | "Token受众"             | RFC 8707 `resource` 参数将token固定到一个服务器 |
| Protected-resource metadata | "发现文档"              | RFC 9728 `.well-known/oauth-protected-resource` |
| Step-up authorization       | "增量同意"              | SEP-835按需添加作用域的流程                     |
| `insufficient_scope`        | "403带WWW-Authenticate" | 服务器信号重新同意更大作用域                    |
| Confused deputy             | "跨服务token重用"       | 受信任持有者不当转发token的攻击                 |
| Short-lived token           | "访问token TTL"         | 快速过期的Bearer；刷新token续期                 |
| Scope hierarchy             | "最小权限栈"            | 带级别间步进的渐进作用域集                      |
| Client ID metadata          | "客户端发现文档"        | 客户端发布自己OAuth元数据的URL                  |

## 延伸阅读

- [MCP — Authorization spec](https://modelcontextprotocol.io/specification/draft/basic/authorization) — 权威MCP OAuth配置
- [den.dev — MCP November authorization spec](https://den.dev/blog/mcp-november-authorization-spec/) — 2025-11-25变更演练
- [RFC 8707 — Resource indicators for OAuth 2.0](https://datatracker.ietf.org/doc/html/rfc8707) — 受众固定RFC
- [RFC 9728 — OAuth 2.0 protected resource metadata](https://datatracker.ietf.org/doc/html/rfc9728) — 发现文档RFC
- [Aembit — MCP OAuth 2.1, PKCE and the future of AI authorization](https://aembit.io/blog/mcp-oauth-2-1-pkce-and-the-future-of-ai-authorization/) — 实用步进流程演练
