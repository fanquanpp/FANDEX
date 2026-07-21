---
title: 'MCP生产认证 — 注册、JWKS刷新、受众固定Token'
description: 掌握生产MCP认证的完整表面：客户端注册（CIMD/DCR）、JWKS缓存刷新、受众固定token验证和IdP能力矩阵
module: agent
difficulty: advanced
tags:
  - MCP认证
  - JWKS
  - CIMD
  - DCR
  - 受众验证
  - 生产部署
related:
  - agent/MCP根目录与诱导
  - agent/MCP基础
  - agent/MCP网关与注册表
  - agent/MCP异步任务
prerequisites:
  - agent/概述与架构
---

# MCP生产认证 — 注册、JWKS刷新、受众固定Token

> 第16课在内存中搭建了OAuth 2.1状态机。到2026年，你发布给真实组织的每个MCP服务器都位于生产认证之后：可扩展到无界客户端群体的客户端注册（Client ID Metadata Documents优先，动态客户端注册作为向后兼容回退）、授权服务器元数据发现（RFC 8414或OpenID Connect Discovery）、不会破坏凌晨3点token验证的JWKS缓存刷新，以及拒绝跨资源重放的受众固定token。本课用三个角色 — 授权服务器、资源服务器（MCP服务器）和客户端 — 建模完整表面，以便你可以追踪从发现到验证工具调用的每一跳。

**类型：** 构建
**语言：** Python（标准库）
**前置条件：** Phase 13 · 16（OAuth 2.1状态机），Phase 13 · 17（网关）
**时间：** ~90分钟

## 学习目标

- 通过RFC 8414元数据发现授权服务器并验证契约。
- 实现RFC 7591动态客户端注册，使MCP客户端无需管理员干预即可注册。
- 按计划缓存和刷新JWKS密钥，使签名验证在密钥轮换后存活。
- 使用RFC 8707资源指示器将token固定到单个MCP资源，并拒绝混淆代理重用。
- 干净地分离三个角色 — 授权服务器、资源服务器、客户端 — 使每个只强制属于自己的检查。
- 阅读IdP能力矩阵并在IdP无法满足MCP认证配置时拒绝部署。

## 问题所在

第16课模拟器在内存中运行OAuth 2.1。生产有三个内存模拟器看不到的运营差距。

第一个差距是注册。真实组织运行数百个MCP服务器和数千个MCP客户端。操作员不会手工注册每个Cursor用户为OAuth客户端。2025-11-25规范给客户端解决此问题的优先顺序：如果你有预注册的 `client_id` 就使用它，否则使用**Client ID Metadata Document**（客户端用其控制的HTTPS URL标识自己，授权服务器*拉取*元数据），否则回退到**RFC 7591动态客户端注册**（客户端*推送* `POST /register` 并当场获得 `client_id`），否则提示用户。CIMD是推荐默认，因为它完全移除了每服务器注册同时保持DNS根植的信任模型；DCR保留用于向后兼容。两者都从授权服务器的元数据发现其入口点：CIMD的 `client_id_metadata_document_supported`，DCR的 `registration_endpoint`。

第二个差距是密钥轮换。JWT验证依赖授权服务器的签名密钥，发布为JSON Web Key Set（JWKS）。授权服务器按计划轮换这些（通常每小时，有时在事件响应下更快）。在启动时获取一次JWKS的MCP服务器在轮换窗口之前验证正常 — 然后每个请求失败直到重启。生产将JWKS连接为缓存值，带有在前一个密钥过期前覆盖缓存的刷新作业，加上缓存未命中时的回退获取，用于签名密钥比缓存更新的token到达的情况。

第三个差距是受众绑定。第16课介绍了RFC 8707资源指示器。在生产中，该指示器成为每个请求的硬声明检查。MCP服务器将 `token.aud` 与其自己的规范资源URL比较，并用HTTP 401拒绝不匹配。这是防御上游MCP服务器（或持有给一个服务器的token的恶意客户端）在同一信任网格中对另一个服务器重放该token的唯一防线。

本课将每个差距映射到表面的具体部分。元数据文档是HTTP端点。JWKS缓存刷新是计划作业加键值缓存。JWT验证是资源服务器在调度任何工具之前运行的过程。保持三个角色分离，每个只强制属于自己的检查：授权服务器发出和轮换密钥，资源服务器缓存和验证，客户端发现和注册。

## 核心概念

### RFC 8414 — OAuth授权服务器元数据

`/.well-known/oauth-authorization-server` 处的文档描述客户端需要的一切：

```json
{
  "issuer": "https://auth.example.com",
  "authorization_endpoint": "https://auth.example.com/authorize",
  "token_endpoint": "https://auth.example.com/token",
  "jwks_uri": "https://auth.example.com/.well-known/jwks.json",
  "registration_endpoint": "https://auth.example.com/register",
  "response_types_supported": ["code"],
  "grant_types_supported": ["authorization_code", "refresh_token"],
  "code_challenge_methods_supported": ["S256"],
  "scopes_supported": ["mcp:tools.read", "mcp:tools.invoke"],
  "token_endpoint_auth_methods_supported": ["none", "private_key_jwt"]
}
```

给定MCP资源URL的客户端链式发现：RFC 9728的 `oauth-protected-resource`（资源服务器的文档）命名issuer，然后 `oauth-authorization-server`（此RFC）命名每个端点。客户端永远不硬编码授权URL。

你在信任IdP用于MCP之前验证的契约：

- `code_challenge_methods_supported` 包含 `S256`（RFC 7636的PKCE）。规范明确：如果此字段**缺失**，授权服务器不支持PKCE，客户端**必须**拒绝继续。
- `grant_types_supported` 包含 `authorization_code` 并拒绝 `password` 和 `implicit`。
- 至少通告一条注册路径：`client_id_metadata_document_supported: true`（CIMD，首选）**或** `registration_endpoint`（RFC 7591 DCR，回退）。任一满足契约；你不再硬性要求DCR。
- `response_types_supported` 对OAuth 2.1恰好是 `["code"]`。

如果 `S256` 缺失，MCP服务器拒绝针对此IdP部署 — PKCE没有降级模式。如果*两条*注册路径都未通告且你没有预注册的 `client_id`，你也无法注册；部署清单有问题，不是代码。

### RFC 9728（回顾）— 受保护资源元数据

第16课涵盖了RFC 9728。生产中的增量：此文档是客户端查找*此*MCP服务器信任的授权服务器的唯一位置。单个MCP服务器可以接受来自多个IdP的token（一个给员工，一个给合作伙伴）。RFC 9728声明该集合；RFC 8414文档每个IdP支持什么。

### Client ID Metadata Documents（推荐默认）

CIMD将注册从*推*反转为*拉*。客户端使用其控制的HTTPS URL**作为**其 `client_id`，而不是要求授权服务器铸造 `client_id`。URL解析为JSON元数据文档；授权服务器在OAuth流程期间按需获取它。信任根植于DNS：如果服务器操作员信任 `app.example.com`，它就信任从 `https://app.example.com/client.json` 提供的客户端。无注册往返，无 `client_id` 命名空间耗尽，无每服务器状态需同步。

客户端托管的元数据文档：

```json
{
  "client_id": "https://app.example.com/oauth/client.json",
  "client_name": "Example MCP Client",
  "client_uri": "https://app.example.com",
  "redirect_uris": ["http://127.0.0.1:7333/callback", "http://localhost:7333/callback"],
  "grant_types": ["authorization_code", "refresh_token"],
  "response_types": ["code"],
  "token_endpoint_auth_method": "none"
}
```

文档中的 `client_id` 值**必须**等于其提供服务的URL（授权服务器验证此；不匹配被拒绝）。授权服务器在其RFC 8414元数据中用 `client_id_metadata_document_supported: true` 通告支持。

规范直白指出的两个安全事实：

- **SSRF。** 授权服务器获取攻击者提供的URL。它必须防御服务器端请求伪造（不获取内部/管理端点）。
- **localhost冒充。** CIMD单独无法阻止本地攻击者声称合法客户端的元数据URL并绑定任何 `localhost` 重定向。授权服务器**必须**在同意期间清楚显示重定向URI主机名，并**应该**对仅 `localhost` 的重定向发出警告。

因为CIMD不需要服务器端状态，没有像DCR需要的注册器需要建立。客户端侧是只读的：从静态HTTPS端点提供元数据文档，让授权服务器拉取它。

### RFC 7591 — 动态客户端注册（回退/向后兼容）

DCR现在是 `MAY`，保留用于与2025-11-25之前部署和尚不支持CIMD的IdP的向后兼容。没有它（也没有CIMD或预注册），每个MCP客户端（Cursor、Claude Desktop、自定义Agent）需要与IdP管理员的带外交换。有了DCR，客户端发布：

```json
POST /register
Content-Type: application/json

{
  "redirect_uris": ["http://127.0.0.1:7333/callback"],
  "grant_types": ["authorization_code", "refresh_token"],
  "response_types": ["code"],
  "token_endpoint_auth_method": "none",
  "scope": "mcp:tools.invoke",
  "client_name": "Cursor",
  "software_id": "com.cursor.cursor",
  "software_version": "0.42.0"
}
```

服务器用 `client_id` 和 `registration_access_token` 响应以供后续更新：

```json
{
  "client_id": "c_3e7f1a",
  "client_id_issued_at": 1769472000,
  "redirect_uris": ["http://127.0.0.1:7333/callback"],
  "grant_types": ["authorization_code", "refresh_token"],
  "registration_access_token": "regt_b2...",
  "registration_client_uri": "https://auth.example.com/register/c_3e7f1a"
}
```

`token_endpoint_auth_method: none` 是运行在用户设备上的MCP客户端的正确默认值。它们只获得 `client_id` — 无 `client_secret` 可外泄。PKCE提供公共客户端所需的占有证明。

三个生产陷阱：

- 注册端点必须按源IP速率限制。没有它，恶意行为者脚本化数百万假注册并耗尽 `client_id` 命名空间。在注册器处理请求之前运行速率限制检查。
- `software_statement`（为客户端担保的签名JWT）是某些企业IdP要求的。本课的模拟跳过它；生产连接验证步骤，拒绝来自localhost重定向URI以外的未签名注册。
- `registration_access_token` 必须存储为哈希，不是明文。此token的盗窃意味着攻击者可以重写客户端的重定向URI。

### RFC 8707（回顾）— 资源指示器

第16课确立了形状。生产规则：每个token请求包含 `resource=<canonical-mcp-url>`，MCP服务器在每个调用上验证 `token.aud` 匹配其自己的资源URL。规范URI是服务器的*最具体*标识符：使用小写方案和主机，无片段，通常无尾随斜杠。路径组件**不**按规则剥离 — 规范在需要标识单个MCP服务器时保留它。`https://mcp.example.com`、`https://mcp.example.com/mcp`、`https://mcp.example.com:8443` 和 `https://mcp.example.com/server/mcp` 都是有效的规范URI。每个服务器选一个并将 `aud` 固定到那个。

### RFC 7636（回顾）— PKCE

PKCE在OAuth 2.1中是强制的。本课的授权码流程始终携带 `code_challenge` 和 `code_verifier`。服务器拒绝没有验证器或验证器不哈希到存储挑战的token请求。

### MCP规范 2025-11-25 认证配置

MCP规范（2025-11-25）对MCP服务器的授权层必须做什么很精确：

- 实现RFC 9728受保护资源元数据，并通过401上的 `WWW-Authenticate: Bearer resource_metadata="..."` 头或知名URI `/.well-known/oauth-protected-resource` 提供其位置（SEP-985使头可选，有知名回退）。元数据 `authorization_servers` 字段**必须**命名至少一个服务器。
- 仅通过**每个**请求上的 `Authorization: Bearer ...` 接受token — 从不在查询字符串中，从不仅在会话开始时验证。
- 每个请求验证 `aud`、`iss`、`exp` 和必需作用域。服务器**必须**验证token是专门为其发出的（受众）；缺失或不匹配的 `aud` 被拒绝，从不视为通配符。
- 在401/403上，返回 `WWW-Authenticate: Bearer` 携带 `error=...`、`resource_metadata="<PRM-URL>"` 参数（元数据文档的URL，*不是*裸资源），以及 `insufficient_scope`（403）上的 `scope="..."`。注意：参数是 `resource_metadata`，一个发现指针 — 挑战中没有 `resource` 参数。
- 授权服务器发现接受**RFC 8414 OAuth元数据**或**OpenID Connect Discovery 1.0**；客户端必须按优先顺序尝试两个知名后缀。
- 客户端（不是服务器）防御**混淆攻击**：在重定向前记录预期 `issuer`，并在兑换代码之前验证 `iss` 授权响应参数（RFC 9207）。仅PKCE不阻止混淆，因为客户端将其 `code_verifier` 交给它被引导到的任何token端点。

OAuth 2.1草案是基板；RFC 8414/7591/8707/9728/9207 + RFC 7636 + CIMD是表面；MCP规范是配置。

### IdP能力矩阵

并非每个IdP支持完整的MCP配置。下表记录了截至2025-11-25规范的事实能力声明。它是*部署门控*，不是推荐。

CIMD在2025-11-25规范中发布，底层OAuth草案仅在2025年10月被采纳，因此供应商支持仍在到来 — 将下表中的"CIMD"视为"今天的状况，在你的租户中验证"，不是永久声明。

| IdP类别                       | AS元数据（8414/OIDC） | CIMD | RFC 7591 DCR           | RFC 8707 resource | RFC 7636 S256 PKCE | 备注                                                                                                 |
| ----------------------------- | --------------------- | ---- | ---------------------- | ----------------- | ------------------ | ---------------------------------------------------------------------------------------------------- |
| 自托管（Keycloak）            | 是                    | 新兴 | 是                     | 是（24.x起）      | 是                 | 本课MCP配置的参考IdP；完整DCR路径端到端，CIMD跟踪新规范                                              |
| 企业SSO（Microsoft Entra ID） | 是                    | 新兴 | 是（高级层级）         | 是                | 是                 | DCR可用性因租户层级而异；在目标租户中部署前验证                                                      |
| 企业SSO（Okta）               | 是                    | 新兴 | 是（Okta CIC / Auth0） | 是                | 是                 | DCR在Auth0上可用（现Okta CIC）；经典Okta组织需要管理员预注册                                         |
| 社交登录IdP（通用）           | 不定                  | 否   | 罕见                   | 罕见              | 是                 | 大多数社交IdP将客户端视为静态合作伙伴；无自助注册。仅用作身份源，在其上叠加你自己MCP感知的授权服务器 |
| 自定义/自建                   | 取决                  | 取决 | 取决                   | 取决              | 取决               | 如果你发布自己的，发布完整配置并偏好CIMD。跳过PKCE或受众绑定会破坏MCP认证契约                        |

部署清单的拒绝规则：如果选择的IdP未在 `code_challenge_methods_supported` 中列出 `S256`，MCP服务器拒绝启动 — PKCE没有降级模式。注册是更软的门控：你需要*一条*工作路径（预注册的 `client_id`、`client_id_metadata_document_supported: true` 或 `registration_endpoint`）。仅DCR的缺失不再是拒绝触发器，因为CIMD或预注册可以覆盖它。

### JWKS刷新模式（在AS处轮换，在资源服务器处刷新）

保持两个动词分离，因为混淆它们是真实的生产bug：

- **轮换**是*授权服务器*做的：铸造新签名密钥，在JWKS中发布，稍后退役旧的。资源服务器不参与此，无法做 — 它不持有IdP的私钥。
- **刷新**是*资源服务器*做的：重新 `GET` 已发布的JWKS到其缓存。那是资源服务器曾经执行的唯一JWKS动作。

生产失败模式是过期缓存。用计划刷新作业加键值缓存解决它。资源服务器运行一个作业（cron、定时器，无论你的运行时提供什么），按固定间隔获取 `<issuer>/.well-known/jwks.json` 并覆盖 `cache[issuer] = {keys, fetched_at}`。验证器从该缓存读取。`kid` 缺失于缓存的token触发**一次**同步刷新作为回退，然后重新检查。这同时处理两种情况：计划刷新，以及签名密钥比下一次计划刷新更新的token到达的密钥重叠窗口。

回退**必须是重新获取，永远不是轮换**。如果你将缓存未命中路径连接到轮换并铸造，两件事会破坏：(1) 铸造新密钥产生仍然不匹配token的 `kid`，所以查找仍然失败；(2) 喷射随机 `kid` 值的token的攻击者强制无限制的密钥创建系列 — 自我造成的DoS。重新获取是幂等的，所以假 `kid` 最多花费一次浪费的获取。

缓存形状：

```json
{
  "https://auth.example.com": {
    "keys": [
      { "kid": "k_2026_03", "kty": "RSA", "n": "...", "e": "AQAB", "alg": "RS256", "use": "sig" },
      { "kid": "k_2026_04", "kty": "RSA", "n": "...", "e": "AQAB", "alg": "RS256", "use": "sig" }
    ],
    "fetched_at": 1772668800
  }
}
```

同时有两个密钥是稳态。授权服务器通过在退役前一个（`k_2026_03`）之前引入下一个密钥（`k_2026_04`）来轮换，所以在旧密钥下发出的token在过期前仍然有效。缓存持有并集；验证器按 `kid` 选择。

### 验证过程

MCP服务器在调度任何工具之前运行验证。`code/main.py` 使用的形状：

```python
result = server.validate(bearer_token, required_scope="mcp:tools.invoke")
if not result["valid"]:
    return {"status": result["status"], "WWW-Authenticate": result["www_authenticate"]}
```

`validate` 解码JWT，从JWKS缓存解析签名密钥（未命中时刷新一次），验证签名，然后对照允许列表检查 `iss`，对照此服务器的规范资源检查 `aud`，`exp`，和必需作用域 — 在第一个失败时返回 `WWW-Authenticate` 挑战。将其保持为资源服务器上的单个过程意味着每个入口点（每个工具调用、每个传输）都通过相同的检查；没有不先验证就到达工具的路径。

### 受众重放演练（访问token权限限制）

服务器A（`notes.example.com`）和服务器B（`tasks.example.com`）都注册到同一个授权服务器。服务器A被入侵。攻击者拿用户的笔记token重放到服务器B。

服务器B的验证器：

1. 解码JWT，按 `kid` 获取JWKS，验证签名。
2. 对照其受保护资源元数据的 `authorization_servers` 检查 `iss`。（通过 — 同一IdP。）
3. 检查 `aud == "https://tasks.example.com"`。（失败 — token的 `aud` 是 `https://notes.example.com`。）
4. 返回401带 `WWW-Authenticate: Bearer error="invalid_token", error_description="audience mismatch", resource_metadata="https://tasks.example.com/.well-known/oauth-protected-resource"`。

受众声明是协议层防御此攻击的唯一防线。为性能跳过它是最常见的生产错误；验证器必须在每个请求上运行，不是仅在会话开始时。规范称此为**访问token权限限制**：MCP服务器`必须`拒绝未在受众中命名它的任何token。

### 混淆攻击（服务器无法提供的客户端侧防御）

客户端在其生命周期中与许多授权服务器对话。恶意AS可以尝试使客户端在攻击者的token端点兑换诚实AS的授权码。受众绑定在这里没有帮助 — 攻击发生在任何token存在之前。防御在客户端（RFC 9207）：

1. 重定向前，客户端从验证的AS元数据记录预期 `issuer`。
2. 在授权响应上，客户端在将代码发送到任何地方之前将返回的 `iss` 参数与记录的issuer比较（简单字符串比较，无规范化）。
3. 不匹配（或当AS通告 `authorization_response_iss_parameter_supported` 时 `iss` 缺失）→ 拒绝，甚至不显示 `error` 字段。

仅PKCE不阻止混淆，因为客户端将其 `code_verifier` 交给它被引导到的任何token端点。这就是为什么规范在PKCE验证器和 `state` 旁边按请求记录issuer。

### 失败模式

- **过期JWKS。** 验证器在AS轮换密钥后拒绝有效token。修复是上面的cron刷新 + 缓存未命中重新获取模式。永远不要在没有刷新作业的情况下缓存JWKS。
- **轮换作为回退。** 将缓存未命中路径连接到轮换并铸造而不是重新获取是真实bug：它永远不产生缺失的 `kid`，并将攻击者控制的 `kid` 值变成密钥创建DoS。回退必须是幂等的 `refresh-jwks`。
- **缺失 `aud` 声明。** 某些IdP默认省略 `aud`，除非token请求中存在 `resource`。验证器必须拒绝缺失 `aud` 的token，不是将缺失视为通配符。
- **缺失 `iss` 检查导致的混淆。** 不在重定向前验证RFC 9207 `iss` 授权响应参数与记录的issuer的客户端可以被引导到在攻击者token端点兑换诚实AS的代码。这是客户端侧失败；资源服务器无法补偿。
- **作用域升级竞争。** 同一用户的两个并发步进流程都可以成功并产生两个带不同作用域的访问token。验证器必须使用请求上呈现的token，不是查找"用户当前作用域" — 那会创建TOCTOU窗口。
- **注册token盗窃。** 泄露的 `registration_access_token` 让攻击者重写重定向URI。静态哈希这些；要求客户端在每次更新时呈现明文；怀疑时轮换。
- **`iss` 未固定。** 接受任何 `iss` 的验证器让攻击者建立自己的授权服务器，为目标受众注册客户端，并发出token。受保护资源元数据的 `authorization_servers` 列表是允许列表；强制它。

## 实践

`code/main.py` 用标准库Python和三个角色 — `AuthorizationServer`、`ResourceServer` 和 `Client` — 走过完整生产流程。流程：

1. 授权服务器在 `/.well-known/oauth-authorization-server` 发布RFC 8414元数据。
2. MCP客户端调用元数据端点并检查其注册选项（CIMD的 `client_id_metadata_document_supported`，DCR的 `registration_endpoint`）和 `S256` PKCE支持。
3. 演练走DCR回退路径：客户端POST到 `/register`（RFC 7591）并获得 `client_id`。（CIMD客户端将改为呈现自己的HTTPS `client_id` URL并跳过此步骤。）
4. MCP客户端运行带 `resource` 指示器（RFC 8707）的PKCE保护授权码流程（RFC 7636）。
5. MCP客户端用 `Authorization: Bearer ...` 在MCP服务器上调用工具。
6. MCP服务器运行 `validate`，从JWKS缓存解析签名密钥。
7. IdP轮换密钥；计划刷新将JWKS重新拉入缓存。
8. 下一次调用在重叠窗口内对刷新密钥验证无需重启，前一个token仍然验证。
9. 对不同MCP资源的受众重放尝试获得401带 `audience mismatch` 和 `resource_metadata` 指针。

此处的JWT使用HS256带共享密钥（所以本课仅用标准库运行）。生产使用带上述JWKS模式的RS256或EdDSA；验证逻辑否则相同。因为IdP和资源服务器在一个进程中，`refresh_jwks` 直接读取授权服务器的密钥列表；在线路上它是到 `jwks_uri` 的HTTP `GET`。

## 交付

本课产生 `outputs/skill-mcp-auth.md`。给定MCP服务器配置和IdP能力集，该技能发出要搭建的认证表面 — 受保护资源元数据、要使用的注册路径（CIMD、预注册或DCR回退）、JWKS刷新计划、作用域映射，以及IdP不支持完整RFC配置时应用的拒绝规则。

## 练习

1. 运行 `code/main.py`。追踪流程。注意IdP如何在第6步轮换密钥，计划 `refresh_jwks` 重新拉取已发布集合，旧token（重叠窗口）和新鲜token都无需重启即可验证。

2. 在受保护资源元数据的 `authorization_servers` 列表中添加新IdP。发出由新IdP签名的token并确认验证器接受它。发出由未列出IdP签名的token并确认验证器以 `WWW-Authenticate: Bearer error="invalid_token", error_description="iss not allowed"` 拒绝。

3. 在 `register_client` 中添加速率限制检查，在注册器接受请求之前运行。使用按源IP的令牌桶，保存在以IP为键的小字典中。

4. 阅读RFC 7591并识别本课 `/register` 处理程序未验证的两个字段。添加验证。（提示：`software_statement` 和 `redirect_uris` URI方案。）

5. 添加Client ID Metadata Document路径。提供 `client_id` 等于其自身URL的 `client.json`，并让授权服务器获取并验证它（如果 `client_id` ≠ URL则拒绝）。确认CIMD客户端无需 `register_client` 调用即可注册。

6. 证明DoS修复。向验证器发送带随机 `kid` 的token并确认 `refresh_jwks` 最多运行一次且授权服务器的密钥计数不增长。然后故意将回退重新连接到轮换并铸造并观察每个假token的密钥计数攀升 — 之后恢复重新获取。

7. 实现混淆部分的客户端侧RFC 9207 `iss` 检查：在授权请求前记录预期issuer，然后拒绝 `iss` 不匹配的授权响应。

## 关键术语

| 术语                | 人们怎么说           | 实际含义                                                                                     |
| ------------------- | -------------------- | -------------------------------------------------------------------------------------------- |
| ASM                 | "OAuth元数据文档"    | RFC 8414 `/.well-known/oauth-authorization-server` JSON                                      |
| CIMD                | "客户端元数据URL"    | Client ID Metadata Document — 用作 `client_id` 的HTTPS URL；AS拉取JSON。2025-11-25起推荐默认 |
| DCR                 | "自助客户端注册"     | RFC 7591 `POST /register` 流程；2025-11-25降级为 `MAY` 回退                                  |
| JWKS                | "JWT验证的公钥"      | JSON Web Key Set，从 `jwks_uri` 获取，按 `kid` 索引                                          |
| Rotate vs refresh   | "更新密钥"           | _轮换_ = AS铸造/退役签名密钥；_刷新_ = 资源服务器重新获取已发布集合。资源服务器只刷新        |
| Resource indicator  | "受众参数"           | RFC 8707 `resource` 参数将token固定到一个服务器                                              |
| `aud` claim         | "受众"               | 验证器与规范资源URL比较的JWT声明                                                             |
| Audience replay     | "Token重放"          | 为服务器A发出的token呈现给服务器B；通过受众验证防御（规范：访问token权限限制）               |
| Confused deputy     | "代理token误用"      | 带静态客户端ID的MCP代理在无每客户端同意下转发token；与受众重放不同                           |
| Mix-up attack       | "错误token端点"      | 客户端被引导到在攻击者端点兑换诚实AS的代码；通过RFC 9207 `iss` 客户端侧防御                  |
| `iss` allow-list    | "信任的授权服务器"   | 受保护资源元数据 `authorization_servers` 中命名的集合                                        |
| `resource_metadata` | "去哪找PRM文档"      | 401/403上命名RFC 9728元数据URL的 `WWW-Authenticate` 参数                                     |
| Public client       | "原生或浏览器客户端" | 无 `client_secret` 的OAuth客户端；PKCE补偿                                                   |
| `WWW-Authenticate`  | "401/403响应头"      | 携带驱动客户端恢复的 `Bearer error=...` 指令                                                 |

## 延伸阅读

- [MCP — Authorization spec (2025-11-25)](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization) — 本课实现的MCP认证配置
- [MCP blog — One Year of MCP: November 2025 Spec Release](https://blog.modelcontextprotocol.io/posts/2025-11-25-first-mcp-anniversary/) — 2025-11-25变更（CIMD、XAA、DCR降级）
- [Aaron Parecki — Client Registration in the November 2025 MCP Authorization Spec](https://aaronparecki.com/2025/11/25/1/mcp-authorization-spec-update) — CIMD优于DCR的理由
- [OAuth Client ID Metadata Document (draft-ietf-oauth-client-id-metadata-document-00)](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-client-id-metadata-document-00) — CIMD
- [RFC 8414 — OAuth 2.0 Authorization Server Metadata](https://datatracker.ietf.org/doc/html/rfc8414) — 发现契约
- [RFC 7591 — OAuth 2.0 Dynamic Client Registration Protocol](https://datatracker.ietf.org/doc/html/rfc7591) — DCR（回退路径）
- [RFC 7636 — Proof Key for Code Exchange (PKCE)](https://datatracker.ietf.org/doc/html/rfc7636) — 公共客户端占有证明
- [RFC 8707 — Resource Indicators for OAuth 2.0](https://datatracker.ietf.org/doc/html/rfc8707) — 受众固定
- [RFC 9728 — OAuth 2.0 Protected Resource Metadata](https://datatracker.ietf.org/doc/html/rfc9728) — 资源服务器发现
- [RFC 9207 — OAuth 2.0 Authorization Server Issuer Identification](https://datatracker.ietf.org/doc/html/rfc9207) — 防御混淆攻击的 `iss` 参数
- [OAuth 2.1 draft](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1) — 合并的OAuth基板
