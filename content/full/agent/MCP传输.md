---
title: 'MCP传输 — stdio vs Streamable HTTP vs SSE迁移'
description: '理解stdio与Streamable HTTP传输的选择、Origin验证、DNS重绑定防护和SSE迁移策略'
module: agent
difficulty: intermediate
tags:
  - MCP传输
  - 'Streamable HTTP'
  - stdio
  - SSE
  - DNS重绑定
related:
  - agent/MCP安全OAuth2.1
  - agent/MCP采样
  - agent/MCP根目录与诱导
  - agent/MCP基础
prerequisites:
  - agent/概述与架构
---

# MCP传输 — stdio vs Streamable HTTP vs SSE迁移

> stdio在本地有效，在其他地方无效。Streamable HTTP（2025-03-26）是远程标准。旧的HTTP+SSE传输已弃用，正在2026年中期被移除。选错传输意味着一次迁移；选对意味着获得一个远程可托管的MCP服务器，具有会话连续性和DNS重绑定防护。

**类型：** 学习
**语言：** Python（标准库，Streamable HTTP端点骨架）
**前置条件：** Phase 13 · 07, 08（MCP服务器和客户端）
**时间：** ~45分钟

## 学习目标

- 根据部署形状（本地 vs 远程、单进程 vs 集群）在stdio和Streamable HTTP之间选择。
- 实现Streamable HTTP单端点模式：POST用于请求，GET用于会话流。
- 强制 `Origin` 验证和会话id语义以防御DNS重绑定。
- 在2026年中期移除截止日期之前将遗留HTTP+SSE服务器迁移到Streamable HTTP。

## 问题所在

第一个MCP远程传输（2024-11）是HTTP+SSE：两个端点，一个用于客户端的POST，一个用于服务器到客户端流的Server-Sent Events通道。它有效。但也很笨拙：每个会话两个端点，在某些CDN前缓存失效，以及对某些WAF积极终止的长寿命SSE连接的硬依赖。

2025-03-26规范用Streamable HTTP替换了它：一个端点，POST用于客户端请求，GET用于建立会话流，两者共享 `Mcp-Session-Id` 头。自那以后构建或迁移的每个服务器都使用Streamable HTTP。旧的SSE模式正在被弃用 — Atlassian Rovo于2026年6月30日移除它；Keboola于2026年4月1日；大多数剩余企业服务器到2026年底。

stdio对本地服务器仍然重要。Claude Desktop、VS Code和每个IDE形状的客户端通过stdio生成服务器。正确的心智模型：stdio用于"本机"，Streamable HTTP用于"通过网络"。没有交叉。

## 核心概念

### stdio

- 子进程传输。客户端生成服务器，通过stdin/stdout通信。
- 每行一个JSON对象。换行分隔。
- 无会话id；进程身份是会话。
- 无需认证（子进程继承父进程的信任边界）。
- 永远不要用于远程服务器 — 你需要SSH或socat来隧道，此时使用Streamable HTTP。

### Streamable HTTP

单端点 `/mcp`（或任何路径）。支持三种HTTP方法：

- **POST /mcp。** 客户端发送JSON-RPC消息。服务器用单个JSON响应或一个或多个响应的SSE流回复（用于批处理响应和与该请求相关的通知）。
- **GET /mcp。** 客户端打开长寿命SSE通道。服务器用它进行服务器到客户端的请求（sampling、通知、elicitation）。
- **DELETE /mcp。** 客户端显式终止会话。

会话由服务器在第一个响应上设置的 `Mcp-Session-Id` 头标识，客户端在每个后续请求上回显。会话id必须是加密随机的（128+位）；客户端选择的id因安全原因被拒绝。

### 单端点 vs 双端点

2026年仍可调用旧规范的双端点模式 — 规范声明它为"遗留兼容"。但所有新服务器应该是单端点。官方SDK发出单端点；仅在对话未迁移的远程时使用遗留模式。

### `Origin` 验证和DNS重绑定

浏览器不是MCP客户端（今天），但攻击者可以制作一个网页，说服浏览器POST到 `localhost:1234/mcp` — 用户本地MCP服务器监听的地方。如果服务器不检查 `Origin`，浏览器的同源策略不会拯救它，因为 `Origin: http://evil.com` 是有效的跨域。

2025-11-25规范要求服务器拒绝 `Origin` 不在允许列表上的请求。允许列表通常包含MCP客户端宿主（`https://claude.ai`、`vscode-webview://*`）和本地UI的localhost变体。

### 会话id生命周期

1. 客户端发送第一个请求不带 `Mcp-Session-Id`。
2. 服务器分配随机id，在响应头上设置 `Mcp-Session-Id`。
3. 客户端在所有后续请求和 `GET /mcp` 流上回显该头。
4. 服务器可以撤销会话；客户端在后续请求上看到404并必须重新初始化。
5. 客户端可以显式DELETE会话以干净关闭。

### 保活和重连

SSE连接断开。客户端通过用相同 `Mcp-Session-Id` 重新GET来重新建立。服务器必须排队断开期间错过的事件（在合理窗口内）并通过客户端回显的 `last-event-id` 头重放。

Phase 13 · 13涵盖Tasks，它让长时间运行的工作即使在完整会话重连后也能存活。

### 向后兼容探测

想要同时支持旧服务器和新服务器的客户端：

1. POST到 `/mcp`。
2. 如果响应是 `200 OK` 带JSON或SSE，这是Streamable HTTP。
3. 如果响应是 `200 OK` 带 `Content-Type: text/event-stream` 且指向辅助端点的 `Location` 头，这是遗留HTTP+SSE；跟随 `Location`。

### Cloudflare、ngrok和托管

2026年的生产远程MCP服务器运行在Cloudflare Workers（使用其MCP Agents SDK）、Vercel Functions或容器化的Node/Python上。关键：你的托管必须支持SSE GET的长寿命HTTP连接。Vercel的免费层上限10秒，不适合。Cloudflare Workers支持无限流。

### 网关组合

当你用网关前置多个MCP服务器时（Phase 13 · 17），网关是一个单一的Streamable HTTP端点，重写会话id并多路复用上游。工具在网关层合并；客户端看到一个逻辑服务器。

### 传输失败模式

- **stdio SIGPIPE。** 子进程在写入中途死亡引发SIGPIPE；服务器应干净退出。客户端应检测EOF并标记会话死亡。
- **HTTP 502 / 504。** Cloudflare、nginx和其他代理在上游故障时发出这些。Streamable HTTP客户端应在短退避后重试一次。
- **SSE连接断开。** TCP RST、代理超时或客户端网络变更关闭流。客户端用 `Mcp-Session-Id` 和可选 `last-event-id` 重连以恢复。
- **会话撤销。** 服务器使会话id无效；客户端在下一次请求时看到404。客户端必须重新握手。
- **时钟偏移。** 客户端上的Resource-TTL计算与服务器偏离。客户端应将服务器时间戳视为权威。

### 何时绕过Streamable HTTP

一些企业在其自己的网络内部署MCP服务器，使用gRPC或消息队列传输。这是非标准的 — MCP的规范没有正式定义这些。网关可以向MCP客户端暴露Streamable HTTP表面，同时内部使用gRPC。保持外部表面符合规范；网关拥有翻译。

## 实践

`code/main.py` 使用 `http.server`（标准库）实现最小的Streamable HTTP端点。它处理 `/mcp` 上的POST、GET和DELETE，在第一个响应上设置 `Mcp-Session-Id`，验证 `Origin`，并拒绝来自非允许列表来源的请求。处理程序重用第07课笔记服务器的调度逻辑。

关注点：

- POST处理程序读取JSON-RPC体、调度并写入JSON响应（单响应变体；SSE变体在结构上类似）。
- `Origin` 检查拒绝默认的 `http://evil.example` 探测但接受 `http://localhost`。
- 会话id是随机的128位十六进制字符串；服务器在内存中保持每会话状态。

## 交付

本课产生 `outputs/skill-mcp-transport-migrator.md`。给定一个HTTP+SSE（遗留）MCP服务器，该技能生成到Streamable HTTP的迁移计划，包括会话id连续性、Origin检查和向后兼容探测支持。

## 练习

1. 运行 `code/main.py`。用 `curl` POST一个 `initialize` 并观察 `Mcp-Session-Id` 响应头。POST第二个请求回显该头并验证会话连续性。

2. 添加打开SSE流的GET处理程序。每五秒发送一个 `notifications/progress` 事件。用相同会话id重新GET重连并确认服务器接受它。

3. 实现 `last-event-id` 重放逻辑。重连时，重放自该id以来生成的任何事件。

4. 扩展 `Origin` 验证以支持通配符模式（`https://*.example.com`）并确认它接受 `https://app.example.com` 但拒绝 `https://evil.example.com.attacker.net`。

5. 从官方注册表取一个遗留HTTP+SSE服务器（有几个）并草绘迁移：端点处理、会话id生成和头语义中有什么变化。

## 关键术语

| 术语                   | 人们怎么说       | 实际含义                                     |
| ---------------------- | ---------------- | -------------------------------------------- |
| stdio transport        | "本地子进程"     | 通过stdin/stdout的JSON-RPC，换行分隔         |
| Streamable HTTP        | "远程传输"       | 单端点POST + GET + 可选SSE，2025-03-26规范   |
| HTTP+SSE               | "遗留"           | 2026年中期被移除的双端点模型                 |
| `Mcp-Session-Id`       | "会话头"         | 服务器分配的随机id，在每个后续请求上回显     |
| `Origin` allowlist     | "DNS重绑定防御"  | 拒绝Origin未批准的请求                       |
| Single endpoint        | "一个URL"        | `/mcp` 处理所有会话操作的POST / GET / DELETE |
| `last-event-id`        | "SSE重放"        | 用于恢复断开流而不丢失事件的头               |
| Backwards-compat probe | "旧vs新检测"     | 客户端响应形状检查，自动选择传输             |
| Long-lived HTTP        | "SSE流式"        | 服务器在一个TCP连接上推送事件数分钟或数小时  |
| Session revocation     | "强制重新初始化" | 服务器使会话id无效；客户端必须重新握手       |

## 延伸阅读

- [MCP — Basic transports spec 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports) — stdio和Streamable HTTP的权威参考
- [MCP — Basic transports spec 2025-03-26](https://modelcontextprotocol.io/specification/2025-03-26/basic/transports) — 引入Streamable HTTP的修订
- [Cloudflare — MCP transport](https://developers.cloudflare.com/agents/model-context-protocol/transport/) — Workers托管的Streamable HTTP模式
- [AWS — MCP transport mechanisms](https://builder.aws.com/content/35A0IphCeLvYzly9Sw40G1dVNzc/mcp-transport-mechanisms-stdio-vs-streamable-http) — 跨部署形状的比较
- [Atlassian — HTTP+SSE deprecation notice](https://community.atlassian.com/forums/Atlassian-Remote-MCP-Server/HTTP-SSE-Deprecation-Notice/ba-p/3205484) — 具体迁移截止日期示例
