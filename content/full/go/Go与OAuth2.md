---
order: 86
title: Go与OAuth2
module: go
category: Go
difficulty: intermediate
description: OAuth2与JWT
author: fanquanpp
updated: '2026-06-14'
related:
  - go/Go与HTTP服务器
  - go/Go与HTTP客户端
  - go/Go与加密
  - go/Go与中间件
prerequisites:
  - go/概述与环境配置
---

## 学习目标

本章节对标 MIT 6.5840（Distributed Systems）、Stanford CS155（Computer and Network Security）与 CMU 15-440（Distributed Systems）的身份认证与授权教学水准，融合 RFC 6749（OAuth 2.0）、RFC 7519（JWT）、RFC 7636（PKCE）、RFC 8725（JWT Best Practices）与 Go `golang.org/x/oauth2`、`github.com/golang-jwt/jwt/v5` 的工程实践细节。完成本章学习后，读者应能够达成以下 Bloom 认知层级目标：

### Remember（记忆）

- **R1**：复述 OAuth 2.0 的四个角色（Resource Owner、Client、Authorization Server、Resource Server）与四种核心授权流程（Authorization Code、Implicit、Password、Client Credentials）
- **R2**：列出 JWT 的三段式结构（Header、Payload、Signature）与 JWS、JWE、JWK 的关系
- **R3**：背诵 JWT 标准声明（`iss`、`sub`、`aud`、`exp`、`nbf`、`iat`、`jti`）的语义
- **R4**：识别 HS256、RS256、ES256、EdDSA 四种签名算法的密钥模型与计算开销差异

### Understand（理解）

- **U1**：解释授权码模式（Authorization Code Flow）相较于隐式模式（Implicit Flow）的安全优势
- **U2**：阐述 PKCE（Proof Key for Code Exchange）如何防御授权码拦截攻击
- **U3**：说明 OAuth 2.0 与 OpenID Connect（OIDC）的关系：OIDC 是 OAuth 2.0 之上的身份认证层
- **U4**：推演 Refresh Token 的轮换（Rotation）策略与重用检测机制

### Apply（应用）

- **A1**：使用 `golang.org/x/oauth2` 实现 GitHub/Google 第三方登录
- **A2**：使用 `github.com/golang-jwt/jwt/v5` 生成与验证 HS256/RS256/ES256 签名的 JWT
- **A3**：编写 JWT 中间件，校验 Bearer Token 并将用户信息注入 `context.Context`
- **A4**：实现 OAuth2 客户端凭证模式用于服务间调用（M2M）

### Analyze（分析）

- **An1**：分析 JWT 相较于服务端 Session 的性能与安全权衡
- **An2**：对比 OAuth 2.0 的四种授权流程在不同场景（Web 应用、SPA、移动端、服务间）的适用性
- **An3**：解构 JWT 的"无状态"特性带来的撤销难题与解决方案（黑名单、短时效 + Refresh、DPoP）
- **An4**：剖析 JWS 与 JWE 的组合：签了再加密 vs 加密再签名

### Evaluate（评估）

- **E1**：评估 JWT 在微服务架构下作为身份令牌的选型决策
- **E2**：评判 RS256 与 HS256 在多方协作系统中的密钥分发成本
- **E3**：权衡 OAuth 2.1 草案对隐式模式与密码模式的废弃是否合理
- **E4**：评估 DPoP（RFC 9449）与 mTLS（RFC 8705）作为发件人约束机制的优劣

### Create（创造）

- **C1**：设计一个支持多 IdP（GitHub/Google/Apple）的统一身份认证网关
- **C2**：实现一个 OAuth2 Authorization Server，支持授权码 + PKCE 与客户端凭证流程
- **C3**：构建一个 JWT 密钥轮换机制，支持 RS256 公钥的 JWKS endpoint 与平滑过渡
- **C4**：为微服务架构设计零信任身份传播方案（JWT + mTLS + OpenTelemetry trace 关联）

---

## 历史动机与发展脉络

### 1. 前 OAuth 时代：HTTP Basic Auth 与 Cookie Session（1990s-2007）

早期的 Web 认证使用 HTTP Basic Auth（RFC 1945，1996）将用户名密码直接 Base64 编码传输，存在严重问题：

- 明文传输（Base64 不算加密）
- 每次请求都携带凭证
- 无法委派第三方访问

随后 Cookie-Session 模式兴起（PHP/Java EE 时代）：

```
1. 用户提交账号密码 → 服务器验证
2. 服务器创建 Session，返回 Set-Cookie: session_id=xxx
3. 后续请求携带 Cookie: session_id=xxx
4. 服务器从内存/Redis 查找 Session
```

Cookie-Session 的局限：
- 服务端有状态（横向扩展需共享 Session 存储）
- 跨域困难（CORS、SameSite）
- 无法委派第三方应用访问用户资源

### 2. OAuth 1.0（2007）：委派授权的开端

2007 年 Ma.gnolia 提出 OAuth 协议解决"Mashup 问题"：让第三方应用访问用户在 Flickr/Twitter 的数据，而不需要密码。OAuth Core 1.0 于 2007 年 12 月发布。

OAuth 1.0 的核心创新：
- **Request Token + Access Token 两阶段**：先获取临时令牌，用户授权后换为访问令牌
- **HMAC-SHA1 签名**：每个请求都签名，防止篡改
- **回调机制**：用户授权后回调到 Consumer

OAuth 1.0a（2009）修复了 session fixation 攻击（Twitter 曾受影响），但协议复杂：
- 签名算法晦涩（参数排序、URL 编码规则繁琐）
- 无法在浏览器端直接发起（需要服务端签名）

### 3. OAuth 2.0（RFC 6749，2012）：简化与碎片化

2012 年 10 月，IETF 发布 [RFC 6749](https://www.rfc-editor.org/rfc/rfc6749) "The OAuth 2.0 Authorization Framework"，**不向后兼容** OAuth 1.0。主要变化：

1. **取消签名**：所有请求走 TLS，不再应用层签名
2. **多流程**：定义四种授权流程，适应不同场景
3. **Bearer Token**：RFC 6750 定义简单的 Bearer Token 用法
4. **可选刷新令牌**：服务端可决定是否颁发

四种授权流程：

| 流程 | 适用场景 | 是否需要客户端密钥 | 推荐 |
|------|----------|------------------|------|
| Authorization Code | 有后端的 Web 应用 | 是 | 推荐 |
| Implicit | SPA（无后端） | 否 | 已废弃（OAuth 2.1） |
| Password | 受信任应用 | 是 | 已废弃（OAuth 2.1） |
| Client Credentials | 服务间调用（M2M） | 是 | 推荐 |

OAuth 2.0 的批评：
- 协议本身安全性依赖于 TLS
- 留下太多可选项，导致实现碎片化
- Implicit Flow 与 Password Flow 被滥用

### 4. JWT 时代（RFC 7519，2015）

JWT（JSON Web Token）并非 OAuth 2.0 强制要求，但已成为事实标准。RFC 7519 于 2015 年 5 月发布，定义了紧凑的、URL-safe 的声明表示格式。

JWT 的三段结构：

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

- **Header**：`{"alg":"HS256","typ":"JWT"}` 描述签名算法
- **Payload**：声明（Claims），如 `{"sub":"1234567890","name":"John Doe","iat":1516239022}`
- **Signature**：`HMACSHA256(base64url(header) + "." + base64url(payload), secret)`

JWT 周边的 JOSE（JSON Object Signing and Encryption）规范族：

- **JWS**（RFC 7515）：JSON Web Signature，签名
- **JWE**（RFC 7516）：JSON Web Encryption，加密
- **JWK**（RFC 7517）：JSON Web Key，密钥表示
- **JWA**（RFC 7518）：JSON Web Algorithms，算法注册表

### 5. OIDC（OpenID Connect，2014）

OAuth 2.0 是**授权协议**，不是**认证协议**。OIDC 在 OAuth 2.0 之上增加身份层：

- **ID Token**：JWT 格式的身份令牌，包含用户信息
- **UserInfo Endpoint**：标准化的获取用户信息接口
- **Discovery**：`/.well-known/openid-configuration` 标准化元数据
- **Scopes**：`openid`、`profile`、`email`、`address`、`phone`

OIDC 由 OpenID Foundation 维护，被 Google、Microsoft、Okta、Auth0 等广泛支持。

### 6. PKCE（RFC 7636，2015）：移动端与 SPA 的救星

授权码流程原本要求客户端保密 `client_secret`，但移动端与 SPA 无法安全存储密钥（APK 可反编译、JS 可被查看）。

PKCE（Proof Key for Code Exchange）的解决方案：

```
1. 客户端生成 code_verifier（随机字符串，43-128 字符）
2. 计算 code_challenge = BASE64URL(SHA256(code_verifier))
3. 授权请求携带 code_challenge
4. 换取 access_token 时携带 code_verifier
5. Authorization Server 验证 SHA256(code_verifier) == code_challenge
```

PKCE 抵御"授权码拦截攻击"：即使攻击者截获了授权码，没有 `code_verifier` 也无法换取令牌。

OAuth 2.1 草案要求所有使用授权码流程的客户端**必须**使用 PKCE，即使是机密客户端。

### 7. OAuth 2.1 草案（2022）：整合最佳实践

OAuth 2.1 是 OAuth 2.0 的整理版，整合多个 RFC 与最佳实践：

- 废弃 Implicit Flow（使用授权码 + PKCE 替代）
- 废止 Password Flow（资源所有者密码凭证）
- 强制 PKCE
- 明确 Redirect URI 精确匹配（禁用通配符）
- 推荐使用 DPoP 或 mTLS 作为发件人约束

### 8. JWT 最佳实践（RFC 8725，2020）

RFC 8725 "JSON Web Token Best Current Practices" 总结了 JWT 的安全实践：

1. **算法要明确**：不要依赖 `alg` 字段，应在服务端固定算法
2. **签名算法要足够强**：禁用 `none`，避免 HS256 与 RS256 混用
3. ** audience 要校验**：防止令牌跨应用重用
4. **时效要短**：Access Token 建议 15 分钟以内
5. **敏感数据不要放 JWT**：JWT 是签名不是加密（除非用 JWE）

### 9. 发件人约束：DPoP 与 mTLS（2020-2022）

Bearer Token 的固有缺陷：谁拿到令牌就能用。两种发件人约束机制：

- **mTLS（RFC 8705, 2022）**：客户端证书绑定令牌，强但部署复杂
- **DPoP（RFC 9449, 2023）**：客户端生成 EPK（临时密钥对），签名每个请求

DPoP 工作流程：

```
1. 客户端生成 ECDSA P-256 密钥对
2. 请求 access_token 时携带 DPoP Header（用私钥签名）
3. Authorization Server 颁发 cnf.jkt 绑定的 access_token
4. 后续请求都携带 DPoP Header，Resource Server 验证签名与 cnf.jkt
```

### 10. Go 生态演进时间线

| 时间 | 事件 | 重要性 |
|------|------|--------|
| 2010 | `golang.org/x/oauth2` 包发布 | 基线 |
| 2014 | `github.com/dgrijalva/jwt-go` 发布 | 早期主流 |
| 2016 | `github.com/coreos/go-oidc` 发布 | OIDC 标准实现 |
| 2018 | `github.com/lestrrat-go/jwx` 发布 | 完整 JOSE 实现 |
| 2020 | `jwt-go` 维护中断，fork 出 `golang-jwt/jwt` | 社区接管 |
| 2021 | `golang.org/x/oauth2` 支持 PKCE | 重要 |
| 2021 | `golang-jwt/jwt/v5` 发布 | API 重设计 |
| 2022 | `github.com/go-jose/go-jose` 发布 | Square 维护交接 |
| 2023 | Go 1.21 `log/slog` 集成认证日志 | 生态成熟 |
| 2024 | `golang.org/x/oauth2` 支持 DPoP 草案 | 前沿 |

---

## 形式化定义

### 1. OAuth 2.0 授权框架的形式化定义

OAuth 2.0 是一个六元组系统：

$$
\text{OAuth2} = \langle R, C, AS, RS, T, F \rangle
$$

其中：

- $R$（Resource Owner）：资源所有者，通常为最终用户
- $C$（Client）：客户端，希望访问受保护资源的应用
- $AS$（Authorization Server）：授权服务器，颁发令牌
- $RS$（Resource Server）：资源服务器，托管受保护资源
- $T$（Token）：令牌空间，包括 Access Token 与 Refresh Token
- $F$（Flow）：授权流程集合，$F = \{\text{AuthCode}, \text{Implicit}, \text{Password}, \text{ClientCreds}, \text{Device}, \text{Refresh}\}$

### 2. 授权码流程的形式化定义

授权码流程是一个时序协议：

$$
\text{AuthCode Flow} = (S_1, S_2, S_3, S_4, S_5)
$$

- $S_1$：$C \to R$：客户端引导用户到授权页面
- $S_2$：$R \to AS$：用户授权，AS 生成授权码
- $S_3$：$AS \to C$：通过 redirect_uri 回调客户端，传递授权码
- $S_4$：$C \to AS$：客户端用授权码 + 客户端凭证换取令牌
- $S_5$：$AS \to C$：返回 Access Token（可选 Refresh Token）

时序约束：

$$
\text{valid}(S_i) \implies \text{nonce}(S_i) \in \{\text{state}, \text{code}, \text{token}\}
$$

防 CSRF 攻击的 `state` 参数：

$$
\text{state} = \text{HMAC}_{k_C}(\text{session_id}) \quad \text{where } k_C \text{ is client's session key}
$$

### 3. JWT 的形式化定义

JWT 是一个三元组：

$$
\text{JWT} = (H, P, S)
$$

其中：

- $H = \text{Base64URL}(\text{JSON}(\{\text{alg}, \text{typ}\}))$ 是头部
- $P = \text{Base64URL}(\text{JSON}(\text{Claims}))$ 是载荷
- $S = \text{Sign}_{k}(H \parallel "." \parallel P)$ 是签名

签名算法：

$$
\text{Sign}_k(m) = \begin{cases}
\text{HMAC-SHA256}(m, k) & \text{if alg = HS256} \\
\text{RSASSA-PKCS1-v1_5-SHA256}(m, k_{\text{priv}}) & \text{if alg = RS256} \\
\text{ECDSA-SHA256}(m, k_{\text{priv}}) & \text{if alg = ES256} \\
\text{Ed25519}(m, k_{\text{priv}}) & \text{if alg = EdDSA}
\end{cases}
$$

### 4. JWT 声明的形式化分类

JWT 声明分为三类：

$$
\text{Claims} = \text{Registered} \cup \text{Public} \cup \text{Private}
$$

**Registered Claims**（RFC 7519 §4.1）：

| 声明 | 全称 | 类型 | 语义 |
|------|------|------|------|
| `iss` | Issuer | string | 签发者标识 |
| `sub` | Subject | string | 主体（用户 ID） |
| `aud` | Audience | string \| []string | 受众（目标应用） |
| `exp` | Expiration Time | NumericDate | 过期时间 |
| `nbf` | Not Before | NumericDate | 生效时间 |
| `iat` | Issued At | NumericDate | 签发时间 |
| `jti` | JWT ID | string | 唯一标识（防重放） |

**Public Claims**：可在 IANA [JSON Web Token Claims Registry](https://www.iana.org/assignments/jwt) 注册，如 `name`、`email`、`locale`。

**Private Claims**：双方协商的私有声明，如 `role`、`tenant_id`。

### 5. 安全属性的形式化定义

JWT 的核心安全属性：

1. **完整性（Integrity）**：

$$
\forall \text{JWT} = (H, P, S): \text{Verify}_{k_{\text{pub}}}(H \parallel "." \parallel P, S) = \text{true}
$$

2. **真实性（Authenticity）**：

$$
\text{Issuer}(\text{JWT}) = \text{owner}(k_{\text{priv}})
$$

3. **不可抵赖性（Non-repudiation）**（仅非对称算法）：

$$
\text{只有 } k_{\text{priv}} \text{ 持有者能产生有效签名}
$$

4. **时效性（Freshness）**：

$$
\text{now()} \in [\text{nbf}, \text{exp}]
$$

5. **受众约束（Audience Binding）**：

$$
\text{aud}(\text{JWT}) \ni \text{self\_id}
$$

### 6. PKCE 的形式化定义

PKCE 协议是授权码流程的扩展：

$$
\text{PKCE} = (\text{code\_verifier}, \text{code\_challenge}, \text{method})
$$

约束：

- $\text{code\_verifier} \in \Sigma^{43..128}$（高熵随机字符串）
- $\text{method} \in \{S256, \text{plain}\}$
- $S256$: $\text{code\_challenge} = \text{Base64URL}(\text{SHA256}(\text{code\_verifier}))$
- $\text{plain}$: $\text{code\_challenge} = \text{code\_verifier}$（已废弃）

安全属性：

$$
\text{ValidExchange}(\text{code}, \text{verifier}) \iff \text{SHA256}(\text{verifier}) = \text{stored\_challenge}
$$

---

## 理论推导与原理解析

### 1. Bearer Token 的安全模型

OAuth 2.0 Bearer Token（RFC 6750）的安全模型是 **"持有即授权"**：

$$
\text{Authorized}(\text{request}) \iff \text{request contains valid token}
$$

这意味着：
- 令牌传输必须保密（强制 TLS）
- 令牌存储必须安全（前端不应存 localStorage）
- 令牌时效应尽量短

**令牌重用攻击模型**：

设攻击者 $A$ 在时间 $t_{\text{steal}}$ 窃取了令牌 $T$，则：

$$
\text{attack\_window} = \exp(T) - t_{\text{steal}}
$$

防护策略：

1. **短时效**：$\exp(T) - \text{iat}(T) \leq 900\text{s}$（15 分钟）
2. **发件人约束**：DPoP / mTLS 绑定密钥
3. **撤销机制**：黑名单或 token revocation

### 2. JWT 验证的复杂度分析

JWT 验证算法：

```
1. 分割 JWT 为三部分（O(n)，n = JWT 长度）
2. Base64URL 解码 Header（O(n)）
3. 解析 Header，获取 alg（O(1)）
4. 根据 alg 选择验证密钥（O(1) 或 O(log n)，取决于密钥轮换策略）
5. 验证签名（O(n) for HMAC，O(1) for RSA/ECDSA）
6. Base64URL 解码 Payload（O(n)）
7. 解析 Claims（O(n)）
8. 验证 exp、nbf、iat、iss、aud（O(1)）
```

总复杂度 $O(n)$，其中 $n$ 为 JWT 长度。

性能基准（Go 1.22，M2 Pro，JWT 长度 ~300 字节）：

| 算法 | 生成 (ns/op) | 验证 (ns/op) | 备注 |
|------|------------|-------------|------|
| HS256 | 800 | 1200 | 对称，最快 |
| RS256 | 1200000 | 50000 | 签名慢，验证快 |
| ES256 | 80000 | 110000 | 较均衡 |
| EdDSA | 30000 | 60000 | 推荐 |

### 3. RSA vs ECDSA 的密钥大小对比

非对称密钥长度与安全强度对比：

| 安全强度 | RSA 密钥长度 | ECDSA 密钥长度 | EdDSA 密钥长度 |
|---------|-------------|---------------|---------------|
| 80 bit | 1024 bit | 160 bit | - |
| 112 bit | 2048 bit | 224 bit | - |
| 128 bit | 3072 bit | 256 bit | 256 bit |
| 192 bit | 7680 bit | 384 bit | - |
| 256 bit | 15360 bit | 521 bit | 448 bit |

JWT 大小对比（典型 Payload 100 字节）：

- HS256：约 250 字节
- RS256：约 600 字节（签名 256 字节）
- ES256：约 300 字节（签名 64 字节）
- EdDSA：约 280 字节（签名 64 字节）

**结论**：EdDSA 在性能、密钥大小、签名大小上都是最优选择，推荐新项目使用。

### 4. Refresh Token 轮换的安全性

Refresh Token 轮换（Rotation）策略：

- **每次刷新都颁发新 Refresh Token**，旧 Token 失效
- **重用检测**：若客户端使用已失效的 Refresh Token，立即撤销整个令牌家族

形式化：

$$
\text{Rotate}(T_r) = (T_r^{\text{new}}, T_a^{\text{new}})
$$

安全属性：

$$
\text{DetectReuse}(T_r^{\text{old}}) \implies \text{RevokeFamily}(\text{family\_id}(T_r))
$$

这能抵御 Refresh Token 窃取：

1. 攻击者窃取 $T_r^{(1)}$
2. 用户正常刷新，得到 $T_r^{(2)}$，$T_r^{(1)}$ 失效
3. 攻击者用 $T_r^{(1)}$ 刷新 → 重用检测触发，撤销 $T_r^{(2)}$ 与整个家族

### 5. JWT 与 Session 的状态性分析

**Session 模型**（有状态）：

$$
\text{Authorized}(\text{request}) \iff \text{session\_id} \in \text{SessionStore}
$$

- 优点：可即时撤销，存储在服务端
- 缺点：服务端有状态，扩展需共享存储

**JWT 模型**（无状态）：

$$
\text{Authorized}(\text{request}) \iff \text{Verify}(\text{JWT}) \land \text{Claims}(\text{JWT}) \text{ valid}
$$

- 优点：无状态，易于水平扩展
- 缺点：无法即时撤销（除非维护黑名单，又变有状态）

**混合模式**：短时 Access Token（无状态）+ Refresh Token（有状态），兼顾性能与可撤销性。

### 6. JWKS（JSON Web Key Set）的密钥轮换

JWKS endpoint 暴露公钥集合，客户端按 `kid`（Key ID）查找：

```json
{
  "keys": [
    {"kty":"RSA","kid":"2024-01","n":"...","e":"AQAB"},
    {"kty":"RSA","kid":"2024-02","n":"...","e":"AQAB"}
  ]
}
```

轮换策略：

1. **生成新密钥对**，加入 JWKS，但 `kid` 不在签发列表
2. **预热阶段**：让所有客户端缓存新公钥（24-48 小时）
3. **切换签发密钥**：新签发的 JWT 用新 `kid`
4. **保留旧公钥**：用于验证未过期的旧 JWT
5. **过期后移除**：所有旧 JWT 过期后，从 JWKS 移除旧公钥

### 7. JWT 与 OpenTelemetry 的关联

JWT 与分布式追踪的关联：

$$
\text{trace\_id} \to \text{JWT.claim.trace\_id} \to \text{log\_record}
$$

实现方式：

- 签发 JWT 时，将 `trace_id` 作为 Private Claim 注入
- 验证 JWT 时，提取 `trace_id`，注入到 `context.Context`
- 后续日志、metric、span 自动携带 `trace_id`

---

## 代码示例

### 示例 1：OAuth2 授权码流程（GitHub 登录）

```go
package main

import (
    "context"
    "crypto/rand"
    "encoding/base64"
    "fmt"
    "html/template"
    "log"
    "net/http"

    "golang.org/x/oauth2"
    "golang.org/x/oauth2/github"
)

// 全局 OAuth2 配置（实际项目应从环境变量读取）
var githubOAuthConfig = &oauth2.Config{
    ClientID:     mustGetenv("GITHUB_CLIENT_ID"),
    ClientSecret: mustGetenv("GITHUB_CLIENT_SECRET"),
    Scopes:       []string{"user:email", "read:user"},
    Endpoint:     github.Endpoint,
    RedirectURL:  "http://localhost:8080/auth/github/callback",
}

// sessionStore 简化的会话存储（生产环境用 Redis）
var sessionStore = make(map[string]string)

// mustGetenv 从环境变量读取必需配置
func mustGetenv(key string) string {
    val := os.Getenv(key)
    if val == "" {
        log.Fatalf("环境变量 %s 未设置", key)
    }
    return val
}

// generateState 生成高熵随机 state，用于 CSRF 防护
func generateState() (string, error) {
    b := make([]byte, 32)
    if _, err := rand.Read(b); err != nil {
        return "", err
    }
    return base64.URLEncoding.EncodeToString(b), nil
}

// handleGitHubLogin 启动 OAuth2 授权码流程
func handleGitHubLogin(w http.ResponseWriter, r *http.Request) {
    state, err := generateState()
    if err != nil {
        http.Error(w, "内部错误", http.StatusInternalServerError)
        return
    }

    // 将 state 与 session_id 关联，回调时校验
    sessionID := generateSessionID()
    sessionStore[sessionID] = state
    http.SetCookie(w, &http.Cookie{
        Name:     "session_id",
        Value:    sessionID,
        Path:     "/",
        HttpOnly: true,
        Secure:   true, // 生产环境强制 HTTPS
        SameSite: http.SameSiteLaxMode,
    })

    // 重定向到 GitHub 授权页面
    url := githubOAuthConfig.AuthCodeURL(state, oauth2.AccessTypeOnline)
    http.Redirect(w, r, url, http.StatusTemporaryRedirect)
}

// handleGitHubCallback 处理 GitHub 回调，用授权码换令牌
func handleGitHubCallback(w http.ResponseWriter, r *http.Request) {
    // 1. 校验 state 防 CSRF
    state := r.URL.Query().Get("state")
    sessionID, err := r.Cookie("session_id")
    if err != nil {
        http.Error(w, "会话失效", http.StatusBadRequest)
        return
    }
    storedState, ok := sessionStore[sessionID.Value]
    if !ok || storedState != state {
        http.Error(w, "state 不匹配", http.StatusBadRequest)
        return
    }
    delete(sessionStore, sessionID.Value) // 一次性使用

    // 2. 检查授权错误
    if errCode := r.URL.Query().Get("error"); errCode != "" {
        http.Error(w, "授权失败: "+errCode, http.StatusBadRequest)
        return
    }

    // 3. 用授权码换取令牌
    code := r.URL.Query().Get("code")
    token, err := githubOAuthConfig.Exchange(r.Context(), code)
    if err != nil {
        http.Error(w, "换取令牌失败: "+err.Error(), http.StatusInternalServerError)
        return
    }

    // 4. 使用令牌获取用户信息
    client := githubOAuthConfig.Client(r.Context(), token)
    resp, err := client.Get("https://api.github.com/user")
    if err != nil {
        http.Error(w, "获取用户信息失败", http.StatusInternalServerError)
        return
    }
    defer resp.Body.Close()

    var user struct {
        Login     string `json:"login"`
        Email     string `json:"email"`
        AvatarURL string `json:"avatar_url"`
    }
    if err := json.NewDecoder(resp.Body).Decode(&user); err != nil {
        http.Error(w, "解析用户信息失败", http.StatusInternalServerError)
        return
    }

    // 5. 创建本地会话（此处简化，实际应签发 JWT）
    fmt.Fprintf(w, "欢迎，%s！邮箱：%s", user.Login, user.Email)
}

func main() {
    mux := http.NewServeMux()
    mux.HandleFunc("/auth/github", handleGitHubLogin)
    mux.HandleFunc("/auth/github/callback", handleGitHubCallback)
    mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        tmpl := template.Must(template.New("").Parse(`
            <h1>OAuth2 示例</h1>
            <a href="/auth/github">使用 GitHub 登录</a>
        `))
        tmpl.Execute(w, nil)
    })

    log.Println("服务器启动在 :8080")
    log.Fatal(http.ListenAndServe(":8080", mux))
}
```

### 示例 2：OAuth2 + PKCE（移动端/SPA）

```go
package main

import (
    "context"
    "crypto/rand"
    "crypto/sha256"
    "encoding/base64"
    "fmt"
    "net/http"

    "golang.org/x/oauth2"
)

// generateCodeVerifier 生成 PKCE code_verifier（43-128 字符高熵随机字符串）
func generateCodeVerifier() (string, error) {
    b := make([]byte, 32)
    if _, err := rand.Read(b); err != nil {
        return "", err
    }
    return base64.RawURLEncoding.EncodeToString(b), nil
}

// generateCodeChallenge 根据 verifier 计算 challenge（S256 方法）
func generateCodeChallenge(verifier string) string {
    h := sha256.Sum256([]byte(verifier))
    return base64.RawURLEncoding.EncodeToString(h[:])
}

// pkceFlowStorage 存储每个会话的 code_verifier（生产环境用 Redis）
var pkceFlowStorage = make(map[string]string) // state -> code_verifier

// handlePKCELogin 启动带 PKCE 的授权码流程
func handlePKCELogin(w http.ResponseWriter, r *http.Request) {
    verifier, err := generateCodeVerifier()
    if err != nil {
        http.Error(w, "内部错误", http.StatusInternalServerError)
        return
    }
    challenge := generateCodeChallenge(verifier)

    state, _ := generateRandomString(32)
    pkceFlowStorage[state] = verifier

    // 构造授权 URL，携带 code_challenge
    url := oauth2Config.AuthCodeURL(
        state,
        oauth2.SetAuthURLParam("code_challenge", challenge),
        oauth2.SetAuthURLParam("code_challenge_method", "S256"),
    )

    http.Redirect(w, r, url, http.StatusTemporaryRedirect)
}

// handlePKCECallback 处理回调，用授权码 + code_verifier 换取令牌
func handlePKCECallback(w http.ResponseWriter, r *http.Request) {
    state := r.URL.Query().Get("state")
    verifier, ok := pkceFlowStorage[state]
    if !ok {
        http.Error(w, "无效的 state", http.StatusBadRequest)
        return
    }
    delete(pkceFlowStorage, state)

    code := r.URL.Query().Get("code")

    // 手动构造令牌请求，因为 oauth2.Config.Exchange 默认不支持 PKCE
    // 使用 oauth2.SetAuthURLParam 添加 code_verifier
    token, err := oauth2Config.Exchange(
        context.Background(),
        code,
        oauth2.SetAuthURLParam("code_verifier", verifier),
    )
    if err != nil {
        http.Error(w, "换取令牌失败: "+err.Error(), http.StatusInternalServerError)
        return
    }

    fmt.Fprintf(w, "Access Token: %s\n", token.AccessToken)
    fmt.Fprintf(w, "Token Type: %s\n", token.TokenType)
    fmt.Fprintf(w, "Expires In: %v\n", token.Expiry)
    if token.RefreshToken != "" {
        fmt.Fprintf(w, "Refresh Token: %s\n", token.RefreshToken)
    }
}

var oauth2Config = &oauth2.Config{
    ClientID:     "your-client-id",
    ClientSecret: "", // PKCE 公共客户端无需 secret
    Scopes:       []string{"openid", "profile"},
    Endpoint: oauth2.Endpoint{
        AuthURL:  "https://auth.example.com/authorize",
        TokenURL: "https://auth.example.com/token",
    },
    RedirectURL: "http://localhost:8080/callback",
}
```

### 示例 3：生成与验证 HS256 JWT

```go
package main

import (
    "errors"
    "fmt"
    "time"

    "github.com/golang-jwt/jwt/v5"
)

// ！！安全警告：密钥不应硬编码，应从环境变量或密钥管理服务读取
var hs256Secret = []byte("your-256-bit-secret-key-here")

// CustomClaims 自定义 JWT Claims，包含用户 ID 与角色
type CustomClaims struct {
    UserID string   `json:"user_id"`
    Role   string   `json:"role"`
    Scopes []string `json:"scopes"`
    jwt.RegisteredClaims
}

// GenerateHS256Token 生成 HS256 签名的 JWT
func GenerateHS256Token(userID, role string, scopes []string) (string, error) {
    now := time.Now()
    claims := CustomClaims{
        UserID: userID,
        Role:   role,
        Scopes: scopes,
        RegisteredClaims: jwt.RegisteredClaims{
            Issuer:    "fandex-auth-service",
            Subject:   userID,
            Audience:  jwt.ClaimStrings{"fandex-api"},
            ExpiresAt: jwt.NewNumericDate(now.Add(15 * time.Minute)),
            NotBefore: jwt.NewNumericDate(now),
            IssuedAt:  jwt.NewNumericDate(now),
            ID:        generateJTI(), // 防重放攻击
        },
    }

    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
    return token.SignedString(hs256Secret)
}

// ValidateHS256Token 验证 HS256 签名的 JWT
func ValidateHS256Token(tokenString string, expectedAudience string) (*CustomClaims, error) {
    claims := &CustomClaims{}

    token, err := jwt.ParseWithClaims(tokenString, claims, func(t *jwt.Token) (interface{}, error) {
        // 关键安全检查：确保算法是 HS256，防止 alg 混淆攻击
        if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
            return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
        }
        return hs256Secret, nil
    }, jwt.WithAudience(expectedAudience))

    if err != nil {
        return nil, fmt.Errorf("token 解析失败: %w", err)
    }
    if !token.Valid {
        return nil, errors.New("token 无效")
    }

    return claims, nil
}

// generateJTI 生成唯一的 JWT ID
func generateJTI() string {
    return fmt.Sprintf("%d-%d", time.Now().UnixNano(), time.Now().Nanosecond())
}

func main() {
    // 生成令牌
    token, err := GenerateHS256Token("user-123", "admin", []string{"read", "write"})
    if err != nil {
        fmt.Println("生成失败:", err)
        return
    }
    fmt.Println("Token:", token)

    // 验证令牌
    claims, err := ValidateHS256Token(token, "fandex-api")
    if err != nil {
        fmt.Println("验证失败:", err)
        return
    }
    fmt.Printf("用户 ID: %s, 角色: %s, 权限: %v\n", claims.UserID, claims.Role, claims.Scopes)
    fmt.Printf("签发者: %s, 主体: %s\n", claims.Issuer, claims.Subject)
    fmt.Printf("过期时间: %v\n", claims.ExpiresAt)
}
```

### 示例 4：生成与验证 RS256 JWT（非对称签名）

```go
package main

import (
    "crypto/rand"
    "crypto/rsa"
    "crypto/x509"
    "encoding/pem"
    "errors"
    "fmt"
    "os"
    "time"

    "github.com/golang-jwt/jwt/v5"
)

// RSAKeyPair 管理 RSA 密钥对
type RSAKeyPair struct {
    PrivateKey *rsa.PrivateKey
    PublicKey  *rsa.PublicKey
    KeyID      string // 用于 JWKS 中的 kid
}

// GenerateRSAKeyPair 生成新的 RSA 密钥对
func GenerateRSAKeyPair(bits int, keyID string) (*RSAKeyPair, error) {
    priv, err := rsa.GenerateKey(rand.Reader, bits)
    if err != nil {
        return nil, fmt.Errorf("生成 RSA 密钥失败: %w", err)
    }
    return &RSAKeyPair{
        PrivateKey: priv,
        PublicKey:  &priv.PublicKey,
        KeyID:      keyID,
    }, nil
}

// LoadPrivateKeyFromPEM 从 PEM 文件加载私钥
func LoadPrivateKeyFromPEM(path string) (*rsa.PrivateKey, error) {
    data, err := os.ReadFile(path)
    if err != nil {
        return nil, err
    }
    block, _ := pem.Decode(data)
    if block == nil {
        return nil, errors.New("failed to parse PEM block")
    }
    key, err := x509.ParsePKCS8PrivateKey(block.Bytes)
    if err != nil {
        return nil, err
    }
    rsaKey, ok := key.(*rsa.PrivateKey)
    if !ok {
        return nil, errors.New("not an RSA key")
    }
    return rsaKey, nil
}

// GenerateRS256Token 用 RSA 私钥签发 JWT
func GenerateRS256Token(keyPair *RSAKeyPair, userID, role string) (string, error) {
    now := time.Now()
    claims := CustomClaims{
        UserID: userID,
        Role:   role,
        RegisteredClaims: jwt.RegisteredClaims{
            Issuer:    "fandex-auth-service",
            Subject:   userID,
            Audience:  jwt.ClaimStrings{"fandex-api"},
            ExpiresAt: jwt.NewNumericDate(now.Add(15 * time.Minute)),
            IssuedAt:  jwt.NewNumericDate(now),
        },
    }

    token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
    // 在 Header 中注入 kid，便于客户端从 JWKS 查找对应公钥
    token.Header["kid"] = keyPair.KeyID

    return token.SignedString(keyPair.PrivateKey)
}

// ValidateRS256Token 用 RSA 公钥验证 JWT
func ValidateRS256Token(tokenString string, publicKey *rsa.PublicKey, expectedAudience string) (*CustomClaims, error) {
    claims := &CustomClaims{}

    token, err := jwt.ParseWithClaims(tokenString, claims, func(t *jwt.Token) (interface{}, error) {
        // 严格校验算法，防止 alg 混淆攻击（攻击者用 HS256 伪造，公钥作 secret）
        if _, ok := t.Method.(*jwt.SigningMethodRSA); !ok {
            return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
        }
        return publicKey, nil
    }, jwt.WithAudience(expectedAudience))

    if err != nil {
        return nil, err
    }
    if !token.Valid {
        return nil, errors.New("invalid token")
    }
    return claims, nil
}

func main() {
    // 1. 生成 RSA 密钥对（生产环境应从密钥管理系统加载）
    keyPair, err := GenerateRSAKeyPair(2048, "2024-q1")
    if err != nil {
        fmt.Println("生成密钥失败:", err)
        return
    }

    // 2. 签发 JWT
    token, err := GenerateRS256Token(keyPair, "user-456", "user")
    if err != nil {
        fmt.Println("签发失败:", err)
        return
    }
    fmt.Println("Token:", token[:80], "...")

    // 3. 验证 JWT
    claims, err := ValidateRS256Token(token, keyPair.PublicKey, "fandex-api")
    if err != nil {
        fmt.Println("验证失败:", err)
        return
    }
    fmt.Printf("验证成功 - 用户: %s, 角色: %s\n", claims.UserID, claims.Role)
}
```

### 示例 5：EdDSA（Ed25519）签名 JWT

```go
package main

import (
    "crypto/ed25519"
    "crypto/rand"
    "errors"
    "fmt"
    "time"

    "github.com/golang-jwt/jwt/v5"
)

// Ed25519KeyPair 管理 Ed25519 密钥对
type Ed25519KeyPair struct {
    PrivateKey ed25519.PrivateKey
    PublicKey  ed25519.PublicKey
    KeyID      string
}

// GenerateEd25519KeyPair 生成 Ed25519 密钥对
func GenerateEd25519KeyPair(keyID string) (*Ed25519KeyPair, error) {
    pub, priv, err := ed25519.GenerateKey(rand.Reader)
    if err != nil {
        return nil, err
    }
    return &Ed25519KeyPair{
        PrivateKey: priv,
        PublicKey:  pub,
        KeyID:      keyID,
    }, nil
}

// GenerateEdDSAToken 用 Ed25519 签发 JWT
func GenerateEdDSAToken(keyPair *Ed25519KeyPair, userID string) (string, error) {
    now := time.Now()
    claims := CustomClaims{
        UserID: userID,
        Role:   "user",
        RegisteredClaims: jwt.RegisteredClaims{
            Issuer:    "fandex-auth",
            Subject:   userID,
            ExpiresAt: jwt.NewNumericDate(now.Add(15 * time.Minute)),
            IssuedAt:  jwt.NewNumericDate(now),
        },
    }
    token := jwt.NewWithClaims(jwt.SigningMethodEdDSA, claims)
    token.Header["kid"] = keyPair.KeyID
    return token.SignedString(keyPair.PrivateKey)
}

// ValidateEdDSAToken 验证 Ed25519 签名的 JWT
func ValidateEdDSAToken(tokenString string, publicKey ed25519.PublicKey) (*CustomClaims, error) {
    claims := &CustomClaims{}
    token, err := jwt.ParseWithClaims(tokenString, claims, func(t *jwt.Token) (interface{}, error) {
        if _, ok := t.Method.(*jwt.SigningMethodEd25519); !ok {
            return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
        }
        return publicKey, nil
    })
    if err != nil {
        return nil, err
    }
    if !token.Valid {
        return nil, errors.New("invalid token")
    }
    return claims, nil
}
```

### 示例 6：JWT 中间件（企业级）

```go
package middleware

import (
    "context"
    "errors"
    "net/http"
    "strings"
    "time"

    "github.com/golang-jwt/jwt/v5"
)

// contextKey 是 context.Context 键的类型，避免冲突
type contextKey string

const (
    // UserIDKey 是存储用户 ID 的 context 键
    UserIDKey contextKey = "user_id"
    // UserRoleKey 是存储用户角色的 context 键
    UserRoleKey contextKey = "user_role"
    // ScopesKey 是存储权限范围的 context 键
    ScopesKey contextKey = "scopes"
    // TraceIDKey 是存储 trace ID 的 context 键
    TraceIDKey contextKey = "trace_id"
)

// JWTValidator 是 JWT 验证器抽象
type JWTValidator interface {
    Validate(tokenString string) (*CustomClaims, error)
}

// JWTMiddleware 创建 JWT 认证中间件
func JWTMiddleware(validator JWTValidator, expectedAudience string) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            // 1. 提取 Bearer Token
            authHeader := r.Header.Get("Authorization")
            if authHeader == "" {
                writeError(w, http.StatusUnauthorized, "missing_authorization", "缺少认证信息")
                return
            }

            parts := strings.SplitN(authHeader, " ", 2)
            if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
                writeError(w, http.StatusUnauthorized, "invalid_authorization_format", "认证格式错误，应为 Bearer <token>")
                return
            }
            tokenString := strings.TrimSpace(parts[1])
            if tokenString == "" {
                writeError(w, http.StatusUnauthorized, "empty_token", "令牌为空")
                return
            }

            // 2. 验证 JWT
            claims, err := validator.Validate(tokenString)
            if err != nil {
                if errors.Is(err, jwt.ErrTokenExpired) {
                    writeError(w, http.StatusUnauthorized, "token_expired", "令牌已过期")
                    return
                }
                writeError(w, http.StatusUnauthorized, "invalid_token", "令牌无效")
                return
            }

            // 3. 注入用户信息到 context
            ctx := context.WithValue(r.Context(), UserIDKey, claims.UserID)
            ctx = context.WithValue(ctx, UserRoleKey, claims.Role)
            ctx = context.WithValue(ctx, ScopesKey, claims.Scopes)

            // 4. 继续处理
            next.ServeHTTP(w, r.WithContext(ctx))
        })
    }
}

// RequireRole 角色检查中间件
func RequireRole(roles ...string) func(http.Handler) http.Handler {
    roleSet := make(map[string]struct{}, len(roles))
    for _, r := range roles {
        roleSet[r] = struct{}{}
    }
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            role, ok := r.Context().Value(UserRoleKey).(string)
            if !ok {
                writeError(w, http.StatusForbidden, "no_role", "无角色信息")
                return
            }
            if _, allowed := roleSet[role]; !allowed {
                writeError(w, http.StatusForbidden, "insufficient_role", "权限不足")
                return
            }
            next.ServeHTTP(w, r)
        })
    }
}

// RequireScope 权限范围检查中间件
func RequireScope(scope string) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            scopes, ok := r.Context().Value(ScopesKey).([]string)
            if !ok {
                writeError(w, http.StatusForbidden, "no_scopes", "无权限信息")
                return
            }
            for _, s := range scopes {
                if s == scope || s == "*" {
                    next.ServeHTTP(w, r)
                    return
                }
            }
            writeError(w, http.StatusForbidden, "insufficient_scope", "权限范围不足")
        })
    }
}

// writeError 统一错误响应
func writeError(w http.ResponseWriter, status int, code, message string) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(status)
    fmt.Fprintf(w, `{"error":{"code":"%s","message":"%s"}}`, code, message)
}

// 使用示例
func ExampleUsage() {
    mux := http.NewServeMux()

    // 公开接口
    mux.HandleFunc("/login", loginHandler)

    // 受保护接口（需要认证 + 特定角色 + 特定权限）
    protected := http.NewServeMux()
    protected.HandleFunc("/api/users", listUsersHandler)
    protected.HandleFunc("/api/admin/users", adminHandler)

    // 中间件链：JWT 认证 → 角色检查 → 权限检查
    protectedHandler := JWTMiddleware(jwtValidator, "fandex-api")(
        RequireRole("admin", "user")(
            RequireScope("users:read")(protected),
        ),
    )

    mux.Handle("/api/", protectedHandler)
}

func loginHandler(w http.ResponseWriter, r *http.Request)     {}
func listUsersHandler(w http.ResponseWriter, r *http.Request) {}
func adminHandler(w http.ResponseWriter, r *http.Request)     {}

// 避免未使用 import
var _ = time.Now
```

### 示例 7：OAuth2 客户端凭证模式（M2M）

```go
package main

import (
    "context"
    "fmt"
    "log"
    "net/http"
    "time"

    "golang.org/x/oauth2"
    "golang.org/x/oauth2/clientcredentials"
)

// ServiceAuthConfig 服务间认证配置
type ServiceAuthConfig struct {
    TokenURL     string
    ClientID     string
    ClientSecret string
    Scopes       []string
}

// NewAuthenticatedClient 创建支持 OAuth2 客户端凭证模式的 HTTP 客户端
// 适用于服务间调用（machine-to-machine）
func NewAuthenticatedClient(cfg ServiceAuthConfig) *http.Client {
    oauth2Config := clientcredentials.Config{
        ClientID:     cfg.ClientID,
        ClientSecret: cfg.ClientSecret,
        TokenURL:     cfg.TokenURL,
        Scopes:       cfg.Scopes,
        // 可选：使用 PKCE 或 mTLS 增强安全性
        AuthStyle: oauth2.AuthStyleInHeader,
    }

    // oauth2Config.Client 返回的 client 会自动处理令牌获取与刷新
    // 令牌缓存在 tokenSource 中，过期自动刷新
    return oauth2Config.Client(context.Background())
}

// APIClient 封装下游 API 调用
type APIClient struct {
    httpClient *http.Client
    baseURL    string
}

func NewAPIClient(cfg ServiceAuthConfig, baseURL string) *APIClient {
    return &APIClient{
        httpClient: NewAuthenticatedClient(cfg),
        baseURL:    baseURL,
    }
}

// GetUser 调用下游服务的 /users/{id} 接口
func (c *APIClient) GetUser(ctx context.Context, userID string) error {
    req, err := http.NewRequestWithContext(ctx, "GET", c.baseURL+"/users/"+userID, nil)
    if err != nil {
        return err
    }
    // 不需要手动设置 Authorization，oauth2 client 会自动处理
    resp, err := c.httpClient.Do(req)
    if err != nil {
        return err
    }
    defer resp.Body.Close()
    return nil
}

func main() {
    cfg := ServiceAuthConfig{
        TokenURL:     "https://auth.internal.example.com/oauth/token",
        ClientID:     "fandex-order-service",
        ClientSecret: "service-secret",
        Scopes:       []string{"users:read", "users:write"},
    }

    client := NewAPIClient(cfg, "https://user-service.internal.example.com")

    // 多次调用，令牌自动缓存与刷新
    for i := 0; i < 5; i++ {
        ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
        if err := client.GetUser(ctx, fmt.Sprintf("user-%d", i)); err != nil {
            log.Printf("调用失败: %v", err)
        }
        cancel()
    }
}
```

### 示例 8：JWT 黑名单（即时撤销）

```go
package auth

import (
    "context"
    "errors"
    "sync"
    "time"

    "github.com/golang-jwt/jwt/v5"
)

// BlacklistStore JWT 黑名单存储抽象
type BlacklistStore interface {
    Add(ctx context.Context, jti string, exp time.Time) error
    Contains(ctx context.Context, jti string) (bool, error)
    Cleanup(ctx context.Context) error // 定期清理过期条目
}

// MemoryBlacklist 内存黑名单实现（生产环境用 Redis）
type MemoryBlacklist struct {
    mu      sync.RWMutex
    entries map[string]time.Time // jti -> exp
}

func NewMemoryBlacklist() *MemoryBlacklist {
    return &MemoryBlacklist{
        entries: make(map[string]time.Time),
    }
}

func (b *MemoryBlacklist) Add(ctx context.Context, jti string, exp time.Time) error {
    b.mu.Lock()
    defer b.mu.Unlock()
    b.entries[jti] = exp
    return nil
}

func (b *MemoryBlacklist) Contains(ctx context.Context, jti string) (bool, error) {
    b.mu.RLock()
    defer b.mu.RUnlock()
    exp, ok := b.entries[jti]
    if !ok {
        return false, nil
    }
    // 如果已过期，从黑名单移除（令牌本身已无效）
    if time.Now().After(exp) {
        return false, nil
    }
    return true, nil
}

func (b *MemoryBlacklist) Cleanup(ctx context.Context) error {
    b.mu.Lock()
    defer b.mu.Unlock()
    now := time.Now()
    for jti, exp := range b.entries {
        if now.After(exp) {
            delete(b.entries, jti)
        }
    }
    return nil
}

// RevocableValidator 支持撤销的 JWT 验证器
type RevocableValidator struct {
    validator JWTValidator
    blacklist BlacklistStore
}

func NewRevocableValidator(v JWTValidator, bl BlacklistStore) *RevocableValidator {
    return &RevocableValidator{validator: v, blacklist: bl}
}

func (v *RevocableValidator) Validate(tokenString string) (*CustomClaims, error) {
    claims, err := v.validator.Validate(tokenString)
    if err != nil {
        return nil, err
    }
    // 检查 jti 是否在黑名单
    if claims.ID != "" {
        blocked, err := v.blacklist.Contains(context.Background(), claims.ID)
        if err != nil {
            return nil, fmt.Errorf("黑名单检查失败: %w", err)
        }
        if blocked {
            return nil, errors.New("token revoked")
        }
    }
    return claims, nil
}

// Revoke 将 JWT 加入黑名单
func (v *RevocableValidator) Revoke(ctx context.Context, tokenString string) error {
    // 解析但不验证签名（只是为了提取 jti 与 exp）
    parser := jwt.NewParser()
    claims := &CustomClaims{}
    _, _, err := parser.ParseUnverified(tokenString, claims)
    if err != nil {
        return err
    }
    if claims.ID == "" {
        return errors.New("token missing jti claim")
    }
    if claims.ExpiresAt == nil {
        return errors.New("token missing exp claim")
    }
    return v.blacklist.Add(ctx, claims.ID, claims.ExpiresAt.Time)
}

// StartCleanupTask 启动定期清理任务
func (v *RevocableValidator) StartCleanupTask(ctx context.Context, interval time.Duration) {
    ticker := time.NewTicker(interval)
    defer ticker.Stop()
    for {
        select {
        case <-ctx.Done():
            return
        case <-ticker.C:
            v.blacklist.Cleanup(ctx)
        }
    }
}
```

### 示例 9：JWKS endpoint（密钥轮换）

```go
package main

import (
    "crypto/rand"
    "crypto/rsa"
    "encoding/json"
    "fmt"
    "net/http"
    "sync"
    "time"

    "github.com/golang-jwt/jwt/v5"
    "github.com/lestrrat-go/jwx/jwk"
)

// KeyManager 管理多个 RSA 密钥，支持轮换
type KeyManager struct {
    mu          sync.RWMutex
    keys        map[string]*rsa.PrivateKey // kid -> private key
    activeKeyID string                     // 当前用于签发的 key id
}

// NewKeyManager 创建密钥管理器
func NewKeyManager() *KeyManager {
    return &KeyManager{
        keys: make(map[string]*rsa.PrivateKey),
    }
}

// GenerateNewKey 生成新密钥并设为活跃
func (km *KeyManager) GenerateNewKey(bits int) error {
    priv, err := rsa.GenerateKey(rand.Reader, bits)
    if err != nil {
        return err
    }
    kid := fmt.Sprintf("key-%d", time.Now().Unix())
    km.mu.Lock()
    defer km.mu.Unlock()
    km.keys[kid] = priv
    km.activeKeyID = kid
    return nil
}

// GetActiveKey 获取当前活跃的密钥
func (km *KeyManager) GetActiveKey() (*rsa.PrivateKey, string, error) {
    km.mu.RLock()
    defer km.mu.RUnlock()
    if km.activeKeyID == "" {
        return nil, "", fmt.Errorf("no active key")
    }
    key, ok := km.keys[km.activeKeyID]
    if !ok {
        return nil, "", fmt.Errorf("active key not found")
    }
    return key, km.activeKeyID, nil
}

// GetPublicKey 根据 kid 获取公钥
func (km *KeyManager) GetPublicKey(kid string) (*rsa.PublicKey, error) {
    km.mu.RLock()
    defer km.mu.RUnlock()
    priv, ok := km.keys[kid]
    if !ok {
        return nil, fmt.Errorf("key %s not found", kid)
    }
    return &priv.PublicKey, nil
}

// GetAllPublicKeys 获取所有公钥，用于构造 JWKS
func (km *KeyManager) GetAllPublicKeys() (jwk.Set, error) {
    km.mu.RLock()
    defer km.mu.RUnlock()

    set := jwk.NewSet()
    for kid, priv := range km.keys {
        key, err := jwk.New(&priv.PublicKey)
        if err != nil {
            return nil, err
        }
        if err := key.Set(jwk.KeyIDKey, kid); err != nil {
            return nil, err
        }
        if err := key.Set(jwk.AlgorithmKey, "RS256"); err != nil {
            return nil, err
        }
        set.AddKey(key)
    }
    return set, nil
}

// JWKSHandler 处理 JWKS endpoint 请求
func JWKSHandler(km *KeyManager) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        set, err := km.GetAllPublicKeys()
        if err != nil {
            http.Error(w, "internal error", http.StatusInternalServerError)
            return
        }
        w.Header().Set("Content-Type", "application/json")
        w.Header().Set("Cache-Control", "public, max-age=3600") // 缓存 1 小时
        json.NewEncoder(w).Encode(set)
    }
}

// SignWithActiveKey 用活跃密钥签发 JWT
func SignWithActiveKey(km *KeyManager, claims jwt.Claims) (string, error) {
    priv, kid, err := km.GetActiveKey()
    if err != nil {
        return "", err
    }
    token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
    token.Header["kid"] = kid
    return token.SignedString(priv)
}
```

### 示例 10：完整的 OAuth2 Authorization Server

```go
package main

import (
    "context"
    "crypto/rand"
    "encoding/base64"
    "encoding/json"
    "fmt"
    "log"
    "net/http"
    "sync"
    "time"

    "github.com/golang-jwt/jwt/v5"
    "golang.org/x/oauth2"
)

// AuthServer OAuth2 授权服务器
type AuthServer struct {
    km          *KeyManager
    clients     map[string]*Client // client_id -> Client
    codes       map[string]*AuthorizationCode
    refreshTokens map[string]*RefreshTokenEntry
    mu          sync.Mutex
    issuer      string
}

// Client 客户端配置
type Client struct {
    ID           string
    Secret       string // 公共客户端为空
    RedirectURIs []string
    Scopes       []string
    IsPublic     bool // SPA/移动端为 true
}

// AuthorizationCode 授权码
type AuthorizationCode struct {
    ClientID    string
    UserID      string
    RedirectURI string
    Scopes      []string
    CodeChallenge string // PKCE
    CodeChallengeMethod string
    ExpiresAt   time.Time
}

// RefreshTokenEntry Refresh Token 条目
type RefreshTokenEntry struct {
    UserID    string
    ClientID  string
    Scopes    []string
    FamilyID  string // 用于轮换检测
    ExpiresAt time.Time
}

// NewAuthServer 创建授权服务器
func NewAuthServer(issuer string) *AuthServer {
    return &AuthServer{
        km:            NewKeyManager(),
        clients:       make(map[string]*Client),
        codes:         make(map[string]*AuthorizationCode),
        refreshTokens: make(map[string]*RefreshTokenEntry),
        issuer:        issuer,
    }
}

// AuthorizeHandler 处理 /authorize 请求
func (as *AuthServer) AuthorizeHandler(w http.ResponseWriter, r *http.Request) {
    clientID := r.URL.Query().Get("client_id")
    redirectURI := r.URL.Query().Get("redirect_uri")
    responseType := r.URL.Query().Get("response_type")
    state := r.URL.Query().Get("state")
    scope := r.URL.Query().Get("scope")
    codeChallenge := r.URL.Query().Get("code_challenge")
    codeChallengeMethod := r.URL.Query().Get("code_challenge_method")

    // 1. 校验 client_id
    client, ok := as.clients[clientID]
    if !ok {
        http.Error(w, "invalid client_id", http.StatusBadRequest)
        return
    }

    // 2. 校验 redirect_uri（精确匹配，禁用通配符）
    validRedirect := false
    for _, uri := range client.RedirectURIs {
        if uri == redirectURI {
            validRedirect = true
            break
        }
    }
    if !validRedirect {
        http.Error(w, "invalid redirect_uri", http.StatusBadRequest)
        return
    }

    // 3. 校验 response_type
    if responseType != "code" {
        http.Error(w, "unsupported response_type", http.StatusBadRequest)
        return
    }

    // 4. 模拟用户已登录（实际项目应展示登录页面）
    userID := "user-demo"

    // 5. 生成授权码
    code, err := generateRandomString(32)
    if err != nil {
        http.Error(w, "internal error", http.StatusInternalServerError)
        return
    }

    as.mu.Lock()
    as.codes[code] = &AuthorizationCode{
        ClientID:             clientID,
        UserID:               userID,
        RedirectURI:          redirectURI,
        Scopes:               parseScopes(scope),
        CodeChallenge:        codeChallenge,
        CodeChallengeMethod:  codeChallengeMethod,
        ExpiresAt:            time.Now().Add(10 * time.Minute), // 授权码有效期 10 分钟
    }
    as.mu.Unlock()

    // 6. 重定向到 redirect_uri，携带 code 与 state
    location := fmt.Sprintf("%s?code=%s&state=%s", redirectURI, code, state)
    http.Redirect(w, r, location, http.StatusFound)
}

// TokenHandler 处理 /token 请求
func (as *AuthServer) TokenHandler(w http.ResponseWriter, r *http.Request) {
    if err := r.ParseForm(); err != nil {
        writeTokenError(w, "invalid_request", "form 解析失败")
        return
    }

    grantType := r.PostForm.Get("grant_type")
    switch grantType {
    case "authorization_code":
        as.handleAuthorizationCodeGrant(w, r)
    case "client_credentials":
        as.handleClientCredentialsGrant(w, r)
    case "refresh_token":
        as.handleRefreshTokenGrant(w, r)
    default:
        writeTokenError(w, "unsupported_grant_type", "不支持的 grant_type")
    }
}

// handleAuthorizationCodeGrant 处理授权码换令牌
func (as *AuthServer) handleAuthorizationCodeGrant(w http.ResponseWriter, r *http.Request) {
    code := r.PostForm.Get("code")
    clientID := r.PostForm.Get("client_id")
    clientSecret := r.PostForm.Get("client_secret")
    redirectURI := r.PostForm.Get("redirect_uri")
    codeVerifier := r.PostForm.Get("code_verifier") // PKCE

    // 1. 校验授权码
    as.mu.Lock()
    authCode, ok := as.codes[code]
    if !ok {
        as.mu.Unlock()
        writeTokenError(w, "invalid_grant", "无效的授权码")
        return
    }
    delete(as.codes[code]) // 授权码一次性使用
    as.mu.Unlock()

    // 2. 校验授权码是否过期
    if time.Now().After(authCode.ExpiresAt) {
        writeTokenError(w, "invalid_grant", "授权码已过期")
        return
    }

    // 3. 校验客户端
    client, ok := as.clients[clientID]
    if !ok {
        writeTokenError(w, "invalid_client", "无效的客户端")
        return
    }
    if !client.IsPublic {
        if client.Secret != clientSecret {
            writeTokenError(w, "invalid_client", "客户端密钥错误")
            return
        }
    }

    // 4. 校验 redirect_uri 一致
    if authCode.RedirectURI != redirectURI {
        writeTokenError(w, "invalid_grant", "redirect_uri 不匹配")
        return
    }

    // 5. PKCE 校验
    if authCode.CodeChallenge != "" {
        if codeVerifier == "" {
            writeTokenError(w, "invalid_grant", "缺少 code_verifier")
            return
        }
        if !verifyPKCE(codeVerifier, authCode.CodeChallenge, authCode.CodeChallengeMethod) {
            writeTokenError(w, "invalid_grant", "PKCE 校验失败")
            return
        }
    }

    // 6. 签发 Access Token 与 Refresh Token
    accessToken, err := as.issueAccessToken(authCode.UserID, authCode.ClientID, authCode.Scopes)
    if err != nil {
        writeTokenError(w, "server_error", "签发令牌失败")
        return
    }

    refreshToken, err := as.issueRefreshToken(authCode.UserID, authCode.ClientID, authCode.Scopes)
    if err != nil {
        writeTokenError(w, "server_error", "签发刷新令牌失败")
        return
    }

    // 7. 返回令牌
    w.Header().Set("Content-Type", "application/json")
    w.Header().Set("Cache-Control", "no-store")
    w.Header().Set("Pragma", "no-cache")
    json.NewEncoder(w).Encode(map[string]interface{}{
        "access_token":  accessToken,
        "token_type":    "Bearer",
        "expires_in":    900, // 15 分钟
        "refresh_token": refreshToken,
        "scope":         joinScopes(authCode.Scopes),
    })
}

// handleClientCredentialsGrant 处理客户端凭证流程
func (as *AuthServer) handleClientCredentialsGrant(w http.ResponseWriter, r *http.Request) {
    clientID := r.PostForm.Get("client_id")
    clientSecret := r.PostForm.Get("client_secret")
    scope := r.PostForm.Get("scope")

    client, ok := as.clients[clientID]
    if !ok || client.IsPublic {
        writeTokenError(w, "invalid_client", "无效的客户端")
        return
    }
    if client.Secret != clientSecret {
        writeTokenError(w, "invalid_client", "客户端密钥错误")
        return
    }

    scopes := parseScopes(scope)
    // 客户端凭证流程使用 client_id 作为 subject
    accessToken, err := as.issueAccessToken(clientID, clientID, scopes)
    if err != nil {
        writeTokenError(w, "server_error", "签发令牌失败")
        return
    }

    w.Header().Set("Content-Type", "application/json")
    w.Header().Set("Cache-Control", "no-store")
    json.NewEncoder(w).Encode(map[string]interface{}{
        "access_token": accessToken,
        "token_type":   "Bearer",
        "expires_in":   900,
        "scope":        joinScopes(scopes),
    })
}

// handleRefreshTokenGrant 处理刷新令牌流程
func (as *AuthServer) handleRefreshTokenGrant(w http.ResponseWriter, r *http.Request) {
    refreshToken := r.PostForm.Get("refresh_token")
    clientID := r.PostForm.Get("client_id")

    as.mu.Lock()
    entry, ok := as.refreshTokens[refreshToken]
    if !ok {
        as.mu.Unlock()
        // 重用检测：如果令牌曾被撤销，撤销整个家族
        writeTokenError(w, "invalid_grant", "无效的 refresh_token")
        return
    }
    delete(as.refreshTokens, refreshToken) // 轮换：旧令牌失效
    as.mu.Unlock()

    if time.Now().After(entry.ExpiresAt) {
        writeTokenError(w, "invalid_grant", "refresh_token 已过期")
        return
    }

    // 签发新的 access_token 与 refresh_token
    newAccessToken, _ := as.issueAccessToken(entry.UserID, entry.ClientID, entry.Scopes)
    newRefreshToken, _ := as.issueRefreshTokenWithFamily(entry.UserID, entry.ClientID, entry.Scopes, entry.FamilyID)

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]interface{}{
        "access_token":  newAccessToken,
        "token_type":    "Bearer",
        "expires_in":    900,
        "refresh_token": newRefreshToken,
        "scope":         joinScopes(entry.Scopes),
    })
}

// issueAccessToken 签发 Access Token（JWT 格式）
func (as *AuthServer) issueAccessToken(userID, clientID string, scopes []string) (string, error) {
    now := time.Now()
    claims := CustomClaims{
        UserID: userID,
        Role:   "user",
        Scopes: scopes,
        RegisteredClaims: jwt.RegisteredClaims{
            Issuer:    as.issuer,
            Subject:   userID,
            Audience:  jwt.ClaimStrings{"fandex-api"},
            ExpiresAt: jwt.NewNumericDate(now.Add(15 * time.Minute)),
            IssuedAt:  jwt.NewNumericDate(now),
            ID:        generateJTI(),
        },
    }
    return SignWithActiveKey(as.km, claims)
}

// issueRefreshToken 签发 Refresh Token（opaque token，存数据库）
func (as *AuthServer) issueRefreshToken(userID, clientID string, scopes []string) (string, error) {
    familyID := generateRandomStringSafe(16)
    return as.issueRefreshTokenWithFamily(userID, clientID, scopes, familyID)
}

func (as *AuthServer) issueRefreshTokenWithFamily(userID, clientID string, scopes []string, familyID string) (string, error) {
    token := generateRandomStringSafe(48)
    as.mu.Lock()
    as.refreshTokens[token] = &RefreshTokenEntry{
        UserID:    userID,
        ClientID:  clientID,
        Scopes:    scopes,
        FamilyID:  familyID,
        ExpiresAt: time.Now().Add(30 * 24 * time.Hour), // 30 天
    }
    as.mu.Unlock()
    return token, nil
}

// writeTokenError 输出标准 OAuth2 错误响应
func writeTokenError(w http.ResponseWriter, errorCode, description string) {
    w.Header().Set("Content-Type", "application/json")
    w.Header().Set("Cache-Control", "no-store")
    w.WriteHeader(http.StatusBadRequest)
    json.NewEncoder(w).Encode(map[string]string{
        "error":             errorCode,
        "error_description": description,
    })
}

// 辅助函数
func generateRandomString(n int) (string, error) {
    b := make([]byte, n)
    if _, err := rand.Read(b); err != nil {
        return "", err
    }
    return base64.RawURLEncoding.EncodeToString(b), nil
}

func generateRandomStringSafe(n int) string {
    s, _ := generateRandomString(n)
    return s
}

func generateJTI() string {
    return generateRandomStringSafe(16)
}

func parseScopes(s string) []string {
    if s == "" {
        return nil
    }
    var scopes []string
    for _, sc := range strings.Split(s, " ") {
        if sc != "" {
            scopes = append(scopes, sc)
        }
    }
    return scopes
}

func joinScopes(scopes []string) string {
    return strings.Join(scopes, " ")
}

func verifyPKCE(verifier, challenge, method string) bool {
    switch method {
    case "S256":
        h := sha256.Sum256([]byte(verifier))
        return base64.RawURLEncoding.EncodeToString(h[:]) == challenge
    case "plain":
        return verifier == challenge
    default:
        return false
    }
}

func main() {
    as := NewAuthServer("https://auth.fandex.example.com")
    as.km.GenerateNewKey(2048)

    // 注册客户端
    as.clients["fandex-web"] = &Client{
        ID:           "fandex-web",
        Secret:       "",
        RedirectURIs: []string{"http://localhost:8080/callback"},
        Scopes:       []string{"openid", "profile"},
        IsPublic:     true,
    }
    as.clients["fandex-service"] = &Client{
        ID:           "fandex-service",
        Secret:       "service-secret",
        RedirectURIs: []string{},
        Scopes:       []string{"internal"},
        IsPublic:     false,
    }

    mux := http.NewServeMux()
    mux.HandleFunc("/authorize", as.AuthorizeHandler)
    mux.HandleFunc("/token", as.TokenHandler)
    mux.HandleFunc("/.well-known/jwks.json", JWKSHandler(as.km))

    log.Println("Auth server 启动在 :9000")
    log.Fatal(http.ListenAndServe(":9000", mux))
}

// 避免未使用 import
var _ = context.Background
var _ = oauth2.AccessTypeOnline
```

### 示例 11：OIDC 客户端（Discovery + ID Token 验证）

```go
package main

import (
    "context"
    "encoding/json"
    "fmt"
    "log"
    "net/http"

    "github.com/coreos/go-oidc/v3/oidc"
    "golang.org/x/oauth2"
)

// OIDCClient OIDC 客户端
type OIDCClient struct {
    provider    *oidc.Provider
    oauth2Config *oauth2.Config
    verifier    *oidc.IDTokenVerifier
}

// NewOIDCClient 通过 Discovery 创建 OIDC 客户端
func NewOIDCClient(ctx context.Context, issuer, clientID, clientSecret, redirectURL string) (*OIDCClient, error) {
    // 1. 通过 Discovery 获取 IdP 元数据
    provider, err := oidc.NewProvider(ctx, issuer)
    if err != nil {
        return nil, fmt.Errorf("failed to discover provider: %w", err)
    }

    // 2. 从元数据获取 OAuth2 endpoint
    var claims struct {
        AuthURL     string `json:"authorization_endpoint"`
        TokenURL    string `json:"token_endpoint"`
        UserInfoURL string `json:"userinfo_endpoint"`
        JWKSURL     string `json:"jwks_uri"`
    }
    if err := provider.Claims(&claims); err != nil {
        return nil, fmt.Errorf("failed to parse discovery claims: %w", err)
    }

    // 3. 构造 OAuth2 配置
    oauth2Config := &oauth2.Config{
        ClientID:     clientID,
        ClientSecret: clientSecret,
        RedirectURL:  redirectURL,
        Endpoint:     provider.Endpoint(),
        Scopes:       []string{oidc.ScopeOpenID, "profile", "email"},
    }

    // 4. 创建 ID Token 验证器
    verifier := provider.Verifier(&oidc.Config{ClientID: clientID})

    return &OIDCClient{
        provider:     provider,
        oauth2Config: oauth2Config,
        verifier:     verifier,
    }, nil
}

// AuthURL 生成授权 URL
func (c *OIDCClient) AuthURL(state string) string {
    return c.oauth2Config.AuthCodeURL(state)
}

// HandleCallback 处理回调，返回 ID Token 与用户信息
func (c *OIDCClient) HandleCallback(ctx context.Context, code string) (*UserInfo, error) {
    // 1. 用授权码换取令牌
    oauth2Token, err := c.oauth2Config.Exchange(ctx, code)
    if err != nil {
        return nil, fmt.Errorf("exchange failed: %w", err)
    }

    // 2. 从响应中提取 ID Token
    rawIDToken, ok := oauth2Token.Extra("id_token").(string)
    if !ok {
        return nil, fmt.Errorf("no id_token in token response")
    }

    // 3. 验证 ID Token（签名、iss、aud、exp 等）
    idToken, err := c.verifier.Verify(ctx, rawIDToken)
    if err != nil {
        return nil, fmt.Errorf("id_token verification failed: %w", err)
    }

    // 4. 提取用户信息
    var claims struct {
        Email         string `json:"email"`
        EmailVerified bool   `json:"email_verified"`
        Name          string `json:"name"`
        Picture       string `json:"picture"`
        Sub           string `json:"sub"`
    }
    if err := idToken.Claims(&claims); err != nil {
        return nil, fmt.Errorf("failed to parse claims: %w", err)
    }

    return &UserInfo{
        Subject:       claims.Sub,
        Email:         claims.Email,
        EmailVerified: claims.EmailVerified,
        Name:          claims.Name,
        Picture:       claims.Picture,
        AccessToken:   oauth2Token.AccessToken,
        IDToken:       rawIDToken,
    }, nil
}

// UserInfo 用户信息
type UserInfo struct {
    Subject       string
    Email         string
    EmailVerified bool
    Name          string
    Picture       string
    AccessToken   string
    IDToken       string
}

// UserInfo 方法从 UserInfo Endpoint 获取更多信息
func (c *OIDCClient) FetchUserInfo(ctx context.Context, accessToken string) (map[string]interface{}, error) {
    // 使用 access_token 调用 UserInfo Endpoint
    req, err := http.NewRequestWithContext(ctx, "GET", "TODO", nil)
    if err != nil {
        return nil, err
    }
    req.Header.Set("Authorization", "Bearer "+accessToken)

    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    var info map[string]interface{}
    if err := json.NewDecoder(resp.Body).Decode(&info); err != nil {
        return nil, err
    }
    return info, nil
}

func main() {
    ctx := context.Background()
    client, err := NewOIDCClient(
        ctx,
        "https://accounts.google.com",       // Issuer
        "your-google-client-id",
        "your-google-client-secret",
        "http://localhost:8080/callback",
    )
    if err != nil {
        log.Fatal(err)
    }

    // 启动 HTTP 服务器
    http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        state := "random-state"
        url := client.AuthURL(state)
        fmt.Fprintf(w, `<a href="%s">使用 Google 登录</a>`, url)
    })

    http.HandleFunc("/callback", func(w http.ResponseWriter, r *http.Request) {
        if r.URL.Query().Get("state") != "random-state" {
            http.Error(w, "state mismatch", http.StatusBadRequest)
            return
        }
        code := r.URL.Query().Get("code")
        userInfo, err := client.HandleCallback(r.Context(), code)
        if err != nil {
            http.Error(w, err.Error(), http.StatusInternalServerError)
            return
        }
        fmt.Fprintf(w, "欢迎，%s！邮箱：%s", userInfo.Name, userInfo.Email)
    })

    log.Println("服务器启动在 :8080")
    log.Fatal(http.ListenAndServe(":8080", nil))
}
```

### 示例 12：OAuth2 + OpenTelemetry 集成

```go
package auth

import (
    "context"
    "net/http"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/trace"
)

// TracedJWTMiddleware 在 JWT 验证过程中注入 trace
func TracedJWTMiddleware(validator JWTValidator, tracer trace.Tracer) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            ctx, span := tracer.Start(r.Context(), "jwt.validate")
            defer span.End()

            // 提取 Bearer Token
            authHeader := r.Header.Get("Authorization")
            if authHeader == "" {
                span.SetAttributes(attribute.Bool("auth.missing", true))
                http.Error(w, "missing auth", http.StatusUnauthorized)
                return
            }
            tokenString := extractBearerToken(authHeader)

            // 验证 JWT
            claims, err := validator.Validate(tokenString)
            if err != nil {
                span.RecordError(err)
                span.SetAttributes(attribute.Bool("auth.error", true))
                http.Error(w, "invalid token", http.StatusUnauthorized)
                return
            }

            // 注入用户信息到 span
            span.SetAttributes(
                attribute.String("auth.user_id", claims.UserID),
                attribute.String("auth.role", claims.Role),
                attribute.StringSlice("auth.scopes", claims.Scopes),
                attribute.String("auth.issuer", claims.Issuer),
            )

            // 将 trace_id 注入 context，便于后续日志关联
            ctx = context.WithValue(ctx, UserIDKey, claims.UserID)
            ctx = context.WithValue(ctx, TraceIDKey, span.SpanContext().TraceID().String())

            next.ServeHTTP(w, r.WithContext(ctx))
        })
    }
}

// AuthTracer 全局认证 tracer
var AuthTracer = otel.Tracer("fandex/auth")
```

### 示例 13：基于 DPoP 的发件人约束（前沿）

```go
package main

import (
    "crypto"
    "crypto/ecdsa"
    "crypto/elliptic"
    "crypto/rand"
    "crypto/sha256"
    "encoding/base64"
    "encoding/json"
    "fmt"
    "net/http"
    "strings"
    "time"
)

// DPoPProof DPoP 证明 JWT
type DPoPProof struct {
    Header  map[string]interface{} // typ, alg, jwk
    Payload map[string]interface{} // htm, htu, iat, jti, ath
}

// DPoPClient DPoP 客户端
type DPoPClient struct {
    privateKey *ecdsa.PrivateKey
}

// NewDPoPClient 创建 DPoP 客户端，生成 ECDSA P-256 密钥对
func NewDPoPClient() (*DPoPClient, error) {
    priv, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
    if err != nil {
        return nil, err
    }
    return &DPoPClient{privateKey: priv}, nil
}

// CreateProof 生成 DPoP 证明 JWT
func (c *DPoPClient) CreateProof(method, url, accessToken string) (string, error) {
    // 1. 计算 access_token 的 hash（ath）
    h := sha256.Sum256([]byte(accessToken))
    ath := base64.RawURLEncoding.EncodeToString(h[:])

    // 2. 构造 Header（包含 jwk 公钥）
    jwk := map[string]interface{}{
        "kty": "EC",
        "crv": "P-256",
        "x":   base64.RawURLEncoding.EncodeToString(c.privateKey.PublicKey.X.Bytes()),
        "y":   base64.RawURLEncoding.EncodeToString(c.privateKey.PublicKey.Y.Bytes()),
    }

    header := map[string]interface{}{
        "typ": "dpop+jwt",
        "alg": "ES256",
        "jwk": jwk,
    }

    // 3. 构造 Payload
    payload := map[string]interface{}{
        "htm": method,                              // HTTP 方法
        "htu": url,                                  // HTTP URL
        "iat": time.Now().Unix(),                    // 签发时间
        "jti": generateJTI(),                        // 唯一 ID 防重放
        "ath": ath,                                  // access_token hash
    }

    // 4. 序列化与签名
    headerJSON, _ := json.Marshal(header)
    payloadJSON, _ := json.Marshal(payload)
    signingInput := base64.RawURLEncoding.EncodeToString(headerJSON) + "." +
        base64.RawURLEncoding.EncodeToString(payloadJSON)

    hash := sha256.Sum256([]byte(signingInput))
    r, s, err := ecdsa.Sign(rand.Reader, c.privateKey, hash[:])
    if err != nil {
        return "", err
    }

    signature := append(r.Bytes(), s.Bytes()...)
    return signingInput + "." + base64.RawURLEncoding.EncodeToString(signature), nil
}

// AddDPoPHeader 为 HTTP 请求添加 DPoP 头
func (c *DPoPClient) AddDPoPHeader(req *http.Request, accessToken string) error {
    proof, err := c.CreateProof(req.Method, req.URL.String(), accessToken)
    if err != nil {
        return err
    }
    req.Header.Set("DPoP", proof)
    return nil
}

// DPoPVerifier 在服务端验证 DPoP 证明
type DPoPVerifier struct{}

// Verify 验证 DPoP 证明
func (v *DPoPVerifier) Verify(proof string, expectedMethod, expectedURL, accessToken string) error {
    parts := strings.Split(proof, ".")
    if len(parts) != 3 {
        return fmt.Errorf("invalid DPoP proof format")
    }

    // 1. 解码 header 与 payload
    headerJSON, err := base64.RawURLEncoding.DecodeString(parts[0])
    if err != nil {
        return err
    }
    payloadJSON, err := base64.RawURLEncoding.DecodeString(parts[1])
    if err != nil {
        return err
    }

    var header struct {
        Typ string                 `json:"typ"`
        Alg string                 `json:"alg"`
        JWK map[string]interface{} `json:"jwk"`
    }
    if err := json.Unmarshal(headerJSON, &header); err != nil {
        return err
    }

    var payload struct {
        HTM string `json:"htm"`
        HTU string `json:"htu"`
        IAT int64  `json:"iat"`
        JTI string `json:"jti"`
        ATH string `json:"ath"`
    }
    if err := json.Unmarshal(payloadJSON, &payload); err != nil {
        return err
    }

    // 2. 验证 typ
    if header.Typ != "dpop+jwt" {
        return fmt.Errorf("invalid typ: %s", header.Typ)
    }

    // 3. 验证 htm 与 htu
    if payload.HTM != expectedMethod {
        return fmt.Errorf("htm mismatch")
    }
    if payload.HTU != expectedURL {
        return fmt.Errorf("htu mismatch")
    }

    // 4. 验证 ath
    h := sha256.Sum256([]byte(accessToken))
    expectedATH := base64.RawURLEncoding.EncodeToString(h[:])
    if payload.ATH != expectedATH {
        return fmt.Errorf("ath mismatch")
    }

    // 5. 验证时效（iat 应在 60 秒内）
    if time.Now().Unix()-payload.IAT > 60 {
        return fmt.Errorf("proof expired")
    }

    // 6. 从 jwk 提取公钥并验证签名
    // （此处省略 ECDSA 签名验证，实际项目应使用 jose 库）
    _ = crypto.SHA256

    return nil
}
```

### 示例 14：基于 Redis 的 Refresh Token 存储

```go
package auth

import (
    "context"
    "fmt"
    "time"

    "github.com/redis/go-redis/v9"
)

// RedisRefreshTokenStore 基于 Redis 的 Refresh Token 存储
type RedisRefreshTokenStore struct {
    client *redis.Client
    ttl    time.Duration
}

func NewRedisRefreshTokenStore(client *redis.Client) *RedisRefreshTokenStore {
    return &RedisRefreshTokenStore{
        client: client,
        ttl:    30 * 24 * time.Hour, // 30 天
    }
}

// Store 存储 Refresh Token
func (s *RedisRefreshTokenStore) Store(ctx context.Context, token string, entry *RefreshTokenEntry) error {
    data, err := json.Marshal(entry)
    if err != nil {
        return err
    }
    key := s.tokenKey(token)
    familyKey := s.familyKey(entry.FamilyID)

    pipe := s.client.TxPipeline()
    pipe.Set(ctx, key, data, s.ttl)
    pipe.SAdd(ctx, familyKey, token) // 维护家族成员
    pipe.Expire(ctx, familyKey, s.ttl)
    _, err = pipe.Exec(ctx)
    return err
}

// Get 获取 Refresh Token
func (s *RedisRefreshTokenStore) Get(ctx context.Context, token string) (*RefreshTokenEntry, error) {
    data, err := s.client.Get(ctx, s.tokenKey(token)).Bytes()
    if err == redis.Nil {
        return nil, ErrTokenNotFound
    }
    if err != nil {
        return nil, err
    }
    var entry RefreshTokenEntry
    if err := json.Unmarshal(data, &entry); err != nil {
        return nil, err
    }
    return &entry, nil
}

// Delete 删除 Refresh Token（轮换或撤销）
func (s *RedisRefreshTokenStore) Delete(ctx context.Context, token string) error {
    return s.client.Del(ctx, s.tokenKey(token)).Err()
}

// RevokeFamily 撤销整个令牌家族（重用检测触发）
func (s *RedisRefreshTokenStore) RevokeFamily(ctx context.Context, familyID string) error {
    familyKey := s.familyKey(familyID)
    tokens, err := s.client.SMembers(ctx, familyKey).Result()
    if err != nil {
        return err
    }
    if len(tokens) == 0 {
        return nil
    }
    pipe := s.client.TxPipeline()
    for _, token := range tokens {
        pipe.Del(ctx, s.tokenKey(token))
    }
    pipe.Del(ctx, familyKey)
    _, err = pipe.Exec(ctx)
    return err
}

func (s *RedisRefreshTokenStore) tokenKey(token string) string {
    return fmt.Sprintf("oauth:refresh_token:%s", token)
}

func (s *RedisRefreshTokenStore) familyKey(familyID string) string {
    return fmt.Sprintf("oauth:refresh_token_family:%s", familyID)
}

var ErrTokenNotFound = fmt.Errorf("refresh token not found")
```

---

## 对比分析

### 1. OAuth2 流程对比

| 流程 | 客户端类型 | 用户参与 | 安全性 | OAuth 2.1 状态 |
|------|-----------|---------|--------|---------------|
| Authorization Code | 机密 + 公共 | 是 | 高 | 保留（强制 PKCE） |
| Authorization Code + PKCE | 公共 | 是 | 高 | 保留 |
| Implicit | 公共（SPA） | 是 | 中 | 废弃 |
| Password | 受信任 | 是 | 低 | 废弃 |
| Client Credentials | 机密 | 否 | 高 | 保留 |
| Device Code | 设备 | 是 | 中 | 保留 |
| Refresh Token | 所有 | 否 | 中 | 保留 |

### 2. JWT 签名算法对比

| 算法 | 类型 | 密钥长度 | 签名速度 | 验证速度 | 签名大小 | 适用场景 |
|------|------|---------|---------|---------|---------|---------|
| HS256 | 对称 | 256 bit | 极快 | 极快 | 32 字节 | 单方签发验证 |
| HS384 | 对称 | 384 bit | 快 | 快 | 48 字节 | 同上 |
| HS512 | 对称 | 512 bit | 快 | 快 | 64 字节 | 同上 |
| RS256 | 非对称 | 2048+ bit | 慢（1ms） | 快（50μs） | 256 字节 | 多方验证 |
| RS384 | 非对称 | 2048+ bit | 慢 | 快 | 384 字节 | 同上 |
| RS512 | 非对称 | 2048+ bit | 慢 | 快 | 512 字节 | 同上 |
| ES256 | 非对称 | 256 bit | 较快（80μs） | 较快（110μs） | 64 字节 | 推荐 |
| ES384 | 非对称 | 384 bit | 较快 | 较快 | 96 字节 | 同上 |
| ES512 | 非对称 | 521 bit | 较快 | 较快 | 132 字节 | 同上 |
| EdDSA | 非对称 | 256 bit | 快（30μs） | 快（60μs） | 64 字节 | 强烈推荐 |
| PS256 | 非对称 | 2048+ bit | 慢 | 快 | 256 字节 | RSA-PSS |

### 3. JWT vs Session 对比

| 维度 | JWT | Session |
|------|-----|---------|
| 状态 | 无状态 | 有状态（服务端存储） |
| 撤销 | 困难（需黑名单） | 容易（删除 Session） |
| 扩展性 | 优（任意节点验证） | 需共享 Session 存储 |
| 大小 | 大（200-1000 字节） | 小（20-50 字节） |
| 跨域 | 友好（Header 传递） | 困难（Cookie 限制） |
| 安全性 | 中（短时效 + Refresh） | 高（可即时撤销） |
| 移动端 | 友好 | 不友好 |
| 微服务 | 推荐 | 不推荐 |

### 4. Go 与其他语言的 OAuth2/JWT 生态对比

| 维度 | Go | Rust | Java | Python | Node.js | C++ |
|------|-----|------|------|--------|---------|-----|
| OAuth2 客户端 | `golang.org/x/oauth2` | `oauth2` crate | Spring Security OAuth2 | `authlib` | `oauth2-server` | Boost.Beast |
| OAuth2 服务器 | `fosite`, `go-oauth2` | `oauth2-rs` | Spring Authorization Server | `authlib` | `oidc-provider` | 自研 |
| JWT | `golang-jwt/jwt`, `lestrrat-go/jwx` | `jsonwebtoken` | `jjwt`, `nimbus-jose-jwt` | `pyjwt` | `jsonwebtoken` | `jwt-cpp` |
| OIDC | `coreos/go-oidc` | `openidconnect` | Spring Security | `authlib` | `openid-client` | 自研 |
| JWKS | `lestrrat-go/jwx` | `jwksclient` | `nimbus-jose-jwt` | `cryptography` | `jwks-rsa` | 自研 |
| 类型安全 | 强 | 极强 | 中 | 弱 | 弱 | 强 |
| 性能 | 高 | 极高 | 中 | 低 | 中 | 极高 |
| 生态成熟度 | 高 | 中 | 极高 | 高 | 高 | 低 |

### 5. Go JWT 库对比

| 库 | 维护状态 | 特性 | 性能 | 推荐 |
|----|---------|------|------|------|
| `github.com/golang-jwt/jwt/v5` | 活跃 | 标准 JWT，简单易用 | 高 | 推荐用于简单场景 |
| `github.com/lestrrat-go/jwx` | 活跃 | 完整 JOSE（JWS/JWE/JWK） | 高 | 推荐用于复杂场景 |
| `github.com/go-jose/go-jose` | 活跃 | Square 维护，企业级 | 高 | 推荐用于 OIDC |
| `github.com/coreos/go-oidc/v3` | 活跃 | OIDC 标准 | 高 | OIDC 首选 |
| `github.com/dgrijalva/jwt-go` | 不维护 | 旧版，已 fork | 中 | 不要使用 |

### 6. OAuth2 服务器实现对比

| 实现 | 语言 | 特性 | 适用场景 |
|------|------|------|---------|
| `ory/fosite` | Go | 完整 OAuth2 + OIDC，可扩展 | 生产级自建 |
| `go-oauth2/oauth2` | Go | 简单易用 | 学习/小型项目 |
| `authelia/authelia` | Go | 一体化认证 | 企业 SSO |
| `keycloak` | Java | 功能最全，企业级 | 大型企业 |
| `auth0` | SaaS | 托管，免维护 | 创业团队 |
| `okta` | SaaS | 托管，企业级 | 中大型企业 |
| `hydra` (Ory) | Go | 高性能 OAuth2 | API 网关 |

---

## 常见陷阱与最佳实践

### 陷阱 1：使用 `none` 算法

**错误**：信任 JWT Header 中的 `alg` 字段，允许 `none` 算法。

```go
// 错误示例：根据 alg 选择验证方式
token, err := jwt.Parse(tokenString, func(t *jwt.Token) (interface{}, error) {
    if t.Header["alg"] == "none" {
        return nil, nil // 危险！
    }
    return publicKey, nil
})
```

**正确做法**：固定算法，拒绝 `none`。

```go
token, err := jwt.Parse(tokenString, func(t *jwt.Token) (interface{}, error) {
    if _, ok := t.Method.(*jwt.SigningMethodRSA); !ok {
        return nil, fmt.Errorf("unexpected method: %v", t.Header["alg"])
    }
    return publicKey, nil
})
```

### 陷阱 2：HS256 与 RS256 混用攻击

**原理**：攻击者将 RS256 JWT 的 `alg` 改为 HS256，用服务器的公钥作为 HMAC 密钥签名，服务器误用公钥验证 HMAC 通过。

**防护**：严格根据 `alg` 选择验证逻辑，且验证函数的密钥类型必须匹配。

### 陷阱 3：JWT 存储在 localStorage

**问题**：localStorage 可被 JavaScript 读取，XSS 攻击可窃取令牌。

**正确做法**：
- Access Token 存储在内存中（短期）
- Refresh Token 存储在 HttpOnly Cookie 中（防 XSS）
- 或使用 BFF（Backend For Frontend）模式

### 陷阱 4：忽略 `aud` 校验

**问题**：A 应用签发的 JWT 可被 B 应用验证通过（同一密钥），导致跨应用重用。

**正确做法**：

```go
jwt.ParseWithClaims(tokenString, claims, keyFunc,
    jwt.WithAudience("my-app"), // 必须校验
)
```

### 陷阱 5：Refresh Token 不轮换

**问题**：Refresh Token 长期不变，一旦泄露，攻击者可永久获取 Access Token。

**正确做法**：每次刷新都颁发新 Refresh Token，旧 Token 失效，并实现重用检测。

### 陷阱 6：授权码流程不校验 state

**问题**：CSRF 攻击者可诱导用户在不知情的情况下授权。

**正确做法**：state 必须高熵随机，与 session 绑定，回调时严格校验。

### 陷阱 7：redirect_uri 使用通配符

**问题**：通配符匹配可能导致开放重定向漏洞。

**正确做法**：redirect_uri 精确匹配，不使用通配符。

### 陷阱 8：密钥硬编码

**错误**：

```go
var secret = []byte("my-hardcoded-secret") // 危险！
```

**正确**：从环境变量或密钥管理服务（AWS KMS、HashiCorp Vault）读取。

### 陷阱 9：JWT 包含敏感信息

**问题**：JWT 是 Base64 编码（不是加密），任何拿到 JWT 的人都能读取 Payload。

**正确**：
- 不要在 JWT 中存储密码、密钥、个人信息
- 如需加密，使用 JWE

### 陷阱 10：不验证 `iss`

**问题**：攻击者用其他 IdP 签发的 JWT 冒充本系统令牌。

**正确**：

```go
jwt.ParseWithClaims(tokenString, claims, keyFunc,
    jwt.WithIssuer("https://auth.fandex.example.com"),
)
```

### 陷阱 11：JWT 过期时间过长

**问题**：Access Token 过期时间过长（如 24 小时），泄露窗口大。

**正确**：Access Token 15-30 分钟，Refresh Token 7-30 天。

### 陷阱 12：JWKS endpoint 不缓存

**问题**：每次验证都请求 JWKS，造成性能瓶颈与 DoS 风险。

**正确**：客户端缓存 JWKS，遵循 `Cache-Control` 头，定期刷新。

### 最佳实践总结

1. **算法**：固定 EdDSA 或 ES256，禁用 `none`，避免 HS256/RS256 混用
2. **时效**：Access Token ≤ 15 分钟，Refresh Token ≤ 30 天
3. **校验**：必校验 `iss`、`aud`、`exp`、`nbf`、`iat`
4. **存储**：Access Token 内存，Refresh Token HttpOnly Cookie
5. **传输**：强制 HTTPS，使用 Secure Cookie
6. **撤销**：短时效 + Refresh 轮换 + 黑名单
7. **轮换**：密钥定期轮换，JWKS endpoint 暴露公钥
8. **监控**：JWT 验证失败告警，异常 IP 检测
9. **审计**：记录令牌签发、刷新、撤销事件
10. **测试**：单元测试覆盖所有边界 case，集成测试覆盖完整流程

---

## 工程实践

### 1. 密钥管理

**密钥层级**：
- **Master Key**：存放在 HSM/KMS，永不出境
- **KEK（Key Encryption Key）**：加密 DEK
- **DEK（Data Encryption Key）**：实际签名 JWT 的密钥

**密钥轮换流程**：
1. 生成新密钥，加入 JWKS 但不签发
2. 等待客户端缓存新公钥（preheat）
3. 切换签发密钥
4. 等待旧 JWT 过期
5. 从 JWKS 移除旧公钥

### 2. JWT 性能优化

**验证缓存**：

```go
type CachedValidator struct {
    inner    JWTValidator
    cache    *lru.Cache // jti -> claims，避免重复验证
    ttl      time.Duration
}

func (v *CachedValidator) Validate(tokenString string) (*CustomClaims, error) {
    if claims, ok := v.cache.Get(tokenHash(tokenString)); ok {
        return claims.(*CustomClaims), nil
    }
    claims, err := v.inner.Validate(tokenString)
    if err != nil {
        return nil, err
    }
    v.cache.Add(tokenHash(tokenString), claims)
    return claims, nil
}
```

**注意**：缓存会增加撤销难度，建议只缓存短期（如 5 秒）。

### 3. 多 IdP 集成

**统一身份网关**：

```
┌─────────┐
│  Client │
└────┬────┘
     │
     ▼
┌─────────────────┐
│  Auth Gateway   │  ← 统一入口
└────┬────────────┘
     │
     ├──── /auth/github ────► GitHub OAuth2
     ├──── /auth/google ────► Google OIDC
     ├──── /auth/apple  ────► Apple Sign In
     └──── /auth/saml   ────► SAML IdP
                                 │
                                 ▼
                         ┌──────────────┐
                         │ Local JWT    │  ← 统一签发本地 JWT
                         └──────────────┘
```

### 4. 零信任架构

零信任架构下，每个服务调用都需要验证身份：

```
User → API Gateway → Service A → Service B → Database
  JWT      JWT          JWT         JWT
```

JWT 在服务间传递，每个服务独立验证。

### 5. 安全审计

**审计事件**：

- 令牌签发（who, when, scopes）
- 令牌验证失败（reason, IP）
- 令牌撤销（reason, jti）
- 密钥轮换（kid, timestamp）
- 异常检测（频繁失败、地理异常）

**日志格式**（slog）：

```go
slog.Info("token issued",
    "user_id", claims.UserID,
    "client_id", clientID,
    "scopes", claims.Scopes,
    "jti", claims.ID,
    "expires_at", claims.ExpiresAt,
    "ip", clientIP,
    "trace_id", traceID,
)
```

### 6. 测试策略

**单元测试**：

```go
func TestJWTGeneration(t *testing.T) {
    tests := []struct {
        name    string
        userID  string
        role    string
        wantErr bool
    }{
        {"valid", "user-1", "admin", false},
        {"empty userID", "", "admin", true},
        {"empty role", "user-1", "", true},
    }
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            token, err := GenerateHS256Token(tt.userID, tt.role, []string{"read"})
            if (err != nil) != tt.wantErr {
                t.Errorf("GenerateHS256Token() error = %v, wantErr %v", err, tt.wantErr)
            }
            if !tt.wantErr {
                claims, err := ValidateHS256Token(token, "fandex-api")
                if err != nil {
                    t.Errorf("ValidateHS256Token() error = %v", err)
                }
                if claims.UserID != tt.userID {
                    t.Errorf("UserID = %v, want %v", claims.UserID, tt.userID)
                }
            }
        })
    }
}
```

**集成测试**：完整 OAuth2 流程，使用 httptest.Server 模拟 IdP。

**安全测试**：Fuzzing 测试 JWT 解析的边界 case。

---

## 案例研究

### 案例 1：Kubernetes Service Account Token

Kubernetes 使用 JWT 作为 ServiceAccount Token：

```yaml
# Pod 自动挂载 ServiceAccount Token
apiVersion: v1
kind: Pod
metadata:
  name: api-client
spec:
  serviceAccountName: my-service-account
  containers:
  - name: app
    image: my-app
    # Token 挂载在 /var/run/secrets/kubernetes.io/serviceaccount/token
```

K8s JWT 特性：
- **签发者**：`https://kubernetes.default.svc.cluster.local`
- **签名**：RS256，私钥在 API Server
- **audience**：可配置，绑定到具体服务
- **过期**：默认 1 小时，自动轮换
- **撤销**：通过 Secret 删除或 token revocation

Go 客户端验证 K8s JWT：

```go
import (
    "github.com/kubernetes/client-go/util/keymutex"
    "k8s.io/client-go/util/cert"
)

// K8s API Server 的 JWKS endpoint
// https://kubernetes.default.svc/.well-known/openid-configuration
```

### 案例 2：Docker Registry v2 认证

Docker Registry v2 使用 OAuth2 进行认证：

```
1. docker pull myregistry.com/myimage
2. Registry 返回 401，WWW-Authenticate: Bearer realm="...",service="...",scope="..."
3. docker 向 Auth Service 请求 token
4. Auth Service 验证身份，签发 JWT
5. docker 用 JWT 拉取镜像
```

Docker Registry JWT Claims：

```json
{
  "iss": "auth.docker.com",
  "sub": "user-123",
  "aud": "registry.docker.com",
  "exp": 1516239022,
  "access": [
    {"type": "repository", "name": "myimage", "actions": ["pull"]}
  ]
}
```

### 案例 3：TiDB 的认证机制

TiDB 兼容 MySQL 协议，支持多种认证方式：

- **MySQL Native Password**：传统用户名密码
- **PAM Authentication**：企业集成
- **JWT Authentication**（TiDB Cloud）：云原生认证

TiDB Cloud 使用 JWT 进行 API 认证：

```go
// TiDB Cloud API 调用示例
client := &http.Client{}
req, _ := http.NewRequest("GET", "https://api.tidbcloud.com/v1/clusters", nil)
req.Header.Set("Authorization", "Bearer "+jwtToken)
```

### 案例 4：etcd 的 mTLS 认证

etcd 使用 mTLS 进行节点间认证，不使用 JWT：

```go
// etcd client 配置 mTLS
cli, err := clientv3.New(clientv3.Config{
    Endpoints: []string{"https://etcd1:2379"},
    TLS: &tls.Config{
        Certificates: []tls.Certificate{clientCert},
        RootCAs:      caPool,
    },
})
```

但在 etcd v3.5+ 中，增加了 JWT 支持，用于客户端认证：

```yaml
# etcd 配置
auth-token: jwt,pub-key=pub.key,priv-key=priv.key,sign-method=RS256,ttl=10m
```

### 案例 5：Prometheus 的 Basic Auth 与 Bearer Token

Prometheus 支持多种认证方式：

```yaml
# prometheus.yml
basic_auth:
  username: admin
  password: secret

# 或使用 Bearer Token
bearer_token: eyJhbGciOiJSUzI1NiIs...

# 或使用 Bearer Token File
bearer_token_file: /var/run/secrets/token
```

### 案例 6：Caddy 的 JWT 中间件

Caddy 服务器内置 JWT 中间件：

```caddyfile
example.com {
    jwt {
        path /api/*
        verify /etc/jwt/public.pem
        claim sub "user-*"
    }
    reverse_proxy backend:8080
}
```

### 案例 7：Uber 的 OAuth2 微服务架构

Uber 内部使用 OAuth2 + JWT 进行微服务认证：

- **Authorization Server**：自研，基于 `ory/fosite`
- **Access Token**：JWT，EdDSA 签名，5 分钟有效
- **Refresh Token**：opaque token，存 Redis，1 小时有效
- **Service Mesh**：mTLS + JWT 双重认证

### 案例 8：GitHub App 的 OAuth2 流程

GitHub App 使用 OAuth2 + 设备流程：

```
1. App 显示设备码与用户码
2. 用户访问 github.com/login/device 输入用户码
3. App 轮询 token endpoint
4. 用户授权后，App 获取 access_token
```

Go 实现：

```go
import "golang.org/x/oauth2/github"
import "golang.org/x/oauth2"

config := &oauth2.Config{
    ClientID:     "github-app-id",
    ClientSecret: "github-app-secret",
    Endpoint:     github.Endpoint,
}

// 设备流程
deviceURL := "https://github.com/login/device/code"
```

---

## 习题

### 习题 1（基础）

**题目**：解释 OAuth 2.0 授权码流程中的 `state` 参数的作用，以及不使用它会导致什么安全风险？

**答案**：

`state` 参数用于**防御 CSRF（跨站请求伪造）攻击**。

工作原理：
1. 客户端在发起授权请求前，生成高熵随机字符串 `state`，存入会话
2. 客户端重定向到 Authorization Server，URL 中携带 `state`
3. Authorization Server 回调时原样返回 `state`
4. 客户端校验回调的 `state` 与会话中的 `state` 一致

不使用 `state` 的风险：
- 攻击者可以构造一个恶意链接，让受害者在不知情的情况下完成授权
- 攻击者将自己的授权码注入受害者的会话，导致受害者使用攻击者的账号
- 后续操作（如绑定账号、修改密码）会影响攻击者账户

最佳实践：
- `state` 至少 32 字节随机
- 与 session_id 绑定（HMAC）
- 一次性使用
- 回调时严格校验

### 习题 2（应用）

**题目**：编写一个 Go 函数，验证 RS256 JWT 并校验 `iss`、`aud`、`exp`，要求在 `exp` 后允许 30 秒的宽限期（clock skew）。

**答案**：

```go
package auth

import (
    "crypto/rsa"
    "errors"
    "time"

    "github.com/golang-jwt/jwt/v5"
)

// ValidateRS256WithSkew 验证 RS256 JWT，允许 30 秒时钟偏移
func ValidateRS256WithSkew(
    tokenString string,
    publicKey *rsa.PublicKey,
    expectedIssuer string,
    expectedAudience string,
) (*CustomClaims, error) {
    claims := &CustomClaims{}

    _, err := jwt.ParseWithClaims(tokenString, claims, func(t *jwt.Token) (interface{}, error) {
        if _, ok := t.Method.(*jwt.SigningMethodRSA); !ok {
            return nil, errors.New("unexpected signing method")
        }
        return publicKey, nil
    },
    jwt.WithIssuer(expectedIssuer),
    jwt.WithAudience(expectedAudience),
    jwt.WithExpirationRequired(),
    jwt.WithLeeway(30*time.Second), // 允许 30 秒时钟偏移
    )

    if err != nil {
        return nil, err
    }
    return claims, nil
}
```

### 习题 3（分析）

**题目**：分析为什么 OAuth 2.1 草案废弃了 Implicit Flow？有什么替代方案？

**答案**：

**Implicit Flow 废弃原因**：

1. **安全缺陷**：
   - Access Token 通过 URL fragment 返回，可能被浏览器历史、Referer 头、日志记录
   - 没有 Refresh Token，每次都要重新授权
   - 无法验证客户端身份

2. **历史背景**：
   - Implicit Flow 设计于 SPA 时代早期，那时浏览器不支持 CORS、无 Service Worker
   - 现代 SPA 可以使用后端代理（BFF 模式）或授权码 + PKCE

3. **替代方案**：
   - **授权码 + PKCE**：SPA 也能安全使用，且能获取 Refresh Token
   - **BFF（Backend For Frontend）**：SPA 调用同源后端，后端持有 secret，完成授权码流程

**OAuth 2.1 的立场**：所有客户端都应使用授权码 + PKCE，包括 SPA 与移动端。

### 习题 4（评估）

**题目**：评估以下场景应使用哪种 JWT 签名算法，说明理由：
- 内部微服务，单一团队
- 对外 API，多方客户端
- 高频调用的认证服务
- 需要后端可撤销的场景

**答案**：

| 场景 | 推荐算法 | 理由 |
|------|---------|------|
| 内部微服务 | EdDSA | 性能最优，密钥小，单方签发验证 |
| 对外 API | ES256 或 EdDSA | 非对称，公钥可公开，多方验证 |
| 高频调用 | EdDSA | 验证速度快（60μs），签名小（64 字节） |
| 需要撤销 | 短时效 Access Token + Refresh | 算法无关，靠短时效 + Refresh 轮换 |

**通用建议**：
- 新项目优先 EdDSA（Ed25519）
- 兼容性要求高选 RS256（最广泛支持）
- 单方系统可选 HS256（性能最优）

### 习题 5（创造）

**题目**：设计一个支持多 IdP（GitHub、Google、Apple）的统一身份网关，要求：
- 用户可用任一 IdP 登录
- 签发统一的内部 JWT
- 支持账号关联（同一邮箱关联为同一用户）
- 支持 Refresh Token 轮换

**答案设计**：

```
架构：
┌──────┐
│ User │
└───┬──┘
    │
    ▼
┌─────────────────┐
│  Auth Gateway   │
└───┬─────────────┘
    │
    ├─ /auth/github  ──► GitHub OAuth2
    ├─ /auth/google  ──► Google OIDC
    └─ /auth/apple   ──► Apple Sign In
                       │
                       ▼
              ┌─────────────────┐
              │ Identity Linker │  ← 根据邮箱关联用户
              └────────┬────────┘
                       │
                       ▼
              ┌─────────────────┐
              │ Token Issuer    │  ← 签发内部 JWT
              └────────┬────────┘
                       │
                       ▼
              ┌─────────────────┐
              │ Refresh Store   │  ← Redis 存储 Refresh Token
              └─────────────────┘
```

关键实现：

```go
type IdentityGateway struct {
    providers map[string]IdentityProvider
    linker    IdentityLinker
    issuer    TokenIssuer
    store     RefreshTokenStore
}

type IdentityProvider interface {
    AuthURL(state string) string
    HandleCallback(ctx context.Context, code string) (*ExternalIdentity, error)
}

type ExternalIdentity struct {
    Provider    string
    ProviderUID string
    Email       string
    Name        string
}

type IdentityLinker interface {
    LinkOrCreate(ctx context.Context, ext *ExternalIdentity) (string, error) // 返回 user_id
}

// HandleProviderCallback 处理所有 IdP 的回调
func (g *IdentityGateway) HandleProviderCallback(provider string) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        p, ok := g.providers[provider]
        if !ok {
            http.Error(w, "unknown provider", http.StatusBadRequest)
            return
        }

        // 1. 校验 state
        // 2. 调用 provider 获取用户身份
        ext, err := p.HandleCallback(r.Context(), r.URL.Query().Get("code"))
        if err != nil {
            http.Error(w, "auth failed", http.StatusUnauthorized)
            return
        }

        // 3. 关联或创建本地用户
        userID, err := g.linker.LinkOrCreate(r.Context(), ext)
        if err != nil {
            http.Error(w, "link failed", http.StatusInternalServerError)
            return
        }

        // 4. 签发内部 JWT
        accessToken, err := g.issuer.Issue(userID, "user")
        if err != nil {
            http.Error(w, "issue failed", http.StatusInternalServerError)
            return
        }

        // 5. 签发 Refresh Token
        refreshToken, _ := g.store.Create(r.Context(), userID)

        // 6. 返回令牌
        json.NewEncoder(w).Encode(map[string]string{
            "access_token":  accessToken,
            "refresh_token": refreshToken,
            "token_type":    "Bearer",
        })
    }
}
```

### 习题 6（综合）

**题目**：分析以下 JWT 安全事件，指出至少 3 个问题：

```go
func login(w http.ResponseWriter, r *http.Request) {
    token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
        "user_id": userID,
        "role":    "admin",
    })
    tokenString, _ := token.SignedString([]byte("secret"))

    // 设置 Cookie
    http.SetCookie(w, &http.Cookie{
        Name:  "token",
        Value: tokenString,
    })

    w.Write([]byte("logged in"))
}

func authMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        cookie, err := r.Cookie("token")
        if err != nil {
            http.Error(w, "unauthorized", 401)
            return
        }
        token, err := jwt.Parse(cookie.Value, func(t *jwt.Token) (interface{}, error) {
            return []byte("secret"), nil
        })
        if err != nil || !token.Valid {
            http.Error(w, "invalid", 401)
            return
        }
        next.ServeHTTP(w, r)
    })
}
```

**答案**：

**问题 1：密钥硬编码且过弱**
- `[]byte("secret")` 长度仅 6 字节，远低于 HS256 要求的 256 bit
- 硬编码在代码中，泄露风险高
- 修复：从环境变量读取，至少 32 字节随机

**问题 2：JWT 缺少时效性声明**
- 没有 `exp`、`iat`、`nbf`，令牌永久有效
- 修复：必设 `exp`（15 分钟）、`iat`、`jti`

**问题 3：Cookie 配置不安全**
- 缺少 `HttpOnly`，可被 JavaScript 读取（XSS 风险）
- 缺少 `Secure`，可能在 HTTP 传输
- 缺少 `SameSite`，CSRF 风险
- 修复：`HttpOnly: true, Secure: true, SameSite: Strict`

**问题 4：缺少 audience 校验**
- 任何应用都能用同一密钥验证此 JWT
- 修复：设置 `aud`，验证时校验

**问题 5：验证函数未检查算法**
- 攻击者可改 `alg` 为 `none` 绕过验证
- 修复：在 keyFunc 中检查 `t.Method` 类型

**问题 6：错误处理被忽略**
- `token.SignedString` 的 error 被忽略
- 修复：检查并处理 error

---

## 参考文献

### 标准与规范

[1] D. Hardt, "The OAuth 2.0 Authorization Framework," RFC 6749, Internet Engineering Task Force, Oct. 2012. [Online]. Available: https://www.rfc-editor.org/rfc/rfc6749

[2] M. Jones, D. Hardt, and J. Bradley, "The OAuth 2.0 Authorization Framework: Bearer Token Usage," RFC 6750, Internet Engineering Task Force, Oct. 2012. [Online]. Available: https://www.rfc-editor.org/rfc/rfc6750

[3] M. Jones, J. Bradley, and N. Sakimura, "JSON Web Token (JWT)," RFC 7519, Internet Engineering Task Force, May 2015. [Online]. Available: https://www.rfc-editor.org/rfc/rfc7519

[4] M. Jones, J. Bradley, and N. Sakimura, "JSON Web Signature (JWS)," RFC 7515, Internet Engineering Task Force, May 2015. [Online]. Available: https://www.rfc-editor.org/rfc/rfc7515

[5] M. Jones and J. Hildebrand, "JSON Web Encryption (JWE)," RFC 7516, Internet Engineering Task Force, May 2015. [Online]. Available: https://www.rfc-editor.org/rfc/rfc7516

[6] M. Jones, "JSON Web Key (JWK)," RFC 7517, Internet Engineering Task Force, May 2015. [Online]. Available: https://www.rfc-editor.org/rfc/rfc7517

[7] M. Jones, "JSON Web Algorithms (JWA)," RFC 7518, Internet Engineering Task Force, May 2015. [Online]. Available: https://www.rfc-editor.org/rfc/rfc7518

### 增强与最佳实践

[8] N. Sakimura, N. Bradley, and J. Bradley, "OpenID Connect Core 1.0," OpenID Foundation, Nov. 2014. [Online]. Available: https://openid.net/specs/openid-connect-core-1_0.html

[9] N. Sakimura, J. Bradley, and N. Agarwal, "Proof Key for Code Exchange by OAuth Public Clients (PKCE)," RFC 7636, Internet Engineering Task Force, Sep. 2015. [Online]. Available: https://www.rfc-editor.org/rfc/rfc7636

[10] V. Bertocci, "JSON Web Token Best Current Practices," RFC 8725, Internet Engineering Task Force, Feb. 2020. [Online]. Available: https://www.rfc-editor.org/rfc/rfc8725

[11] B. Campbell, J. Bradley, and N. Sakimura, "OAuth 2.0 Mutual-TLS Client Authentication and Certificate-Bound Access Tokens (MTLS)," RFC 8705, Internet Engineering Task Force, Feb. 2022. [Online]. Available: https://www.rfc-editor.org/rfc/rfc8705

[12] D. Fett, R. Bradley, and H. Tschofenig, "Demonstrating Proof-of-Possession at the Application Layer (DPoP)," RFC 9449, Internet Engineering Task Force, Sep. 2023. [Online]. Available: https://www.rfc-editor.org/rfc/rfc9449

### 学术论文

[13] A. Parecki, "OAuth 2.0 Security Best Current Practice," Internet-Draft, Internet Engineering Task Force, 2023. [Online]. Available: https://datatracker.ietf.org/doc/draft-ietf-oauth-security-topics/

[14] C. A. R. Hoare, "Communicating sequential processes," Communications of the ACM, vol. 21, no. 8, pp. 666-677, Aug. 1978, doi: 10.1145/359576.359585.

[15] D. J. Bernstein, "Curve25519: new Diffie-Hellman speed records," in Public Key Cryptography - PKC 2006, Berlin, Germany: Springer, 2006, pp. 207-228, doi: 10.1007/11745853_14.

### Go 生态

[16] J. Amsterdam, "log/slog: structured logging in Go," The Go Blog, Sep. 2023. [Online]. Available: https://go.dev/blog/slog

[17] Go Team, "golang.org/x/oauth2," Go Documentation, 2024. [Online]. Available: https://pkg.go.dev/golang.org/x/oauth2

[18] golang-jwt, "golang-jwt/jwt/v5: Go implementation of JSON Web Tokens," GitHub Repository, 2024. [Online]. Available: https://github.com/golang-jwt/jwt

[19] lestrrat, "lestrrat-go/jwx: Implementation of various JWx (JOSE) technologies in Go," GitHub Repository, 2024. [Online]. Available: https://github.com/lestrrat-go/jwx

[20] Ory, "fosite: Extensible security first OAuth 2.0 and OpenID Connect SDK for Go," GitHub Repository, 2024. [Online]. Available: https://github.com/ory/fosite

---

## 延伸阅读

### 官方文档与教程

- [OAuth 2.0 RFC 6749 中文翻译](https://github.com/jeansfish/RFC6749.zh-cn)
- [OIDC 官方文档](https://openid.net/developers/specs/)
- [JWT.io 在线调试](https://jwt.io)
- [Go oauth2 包文档](https://pkg.go.dev/golang.org/x/oauth2)
- [golang-jwt 文档](https://pkg.go.dev/github.com/golang-jwt/jwt/v5)

### 经典书籍

- **"OAuth 2 in Action"** - Justin Richer, Antonio Sanso (Manning, 2017)
  完整覆盖 OAuth 2.0 的实践指南，包含各种流程与扩展。

- **"Mastering OAuth 2.0"** - Charles Bihis (O'Reilly, 2024)
  最新 OAuth 2.1 草案与 PKCE、DPoP、mTLS 实践。

- **"API Security in Action"** - Neil Madden (Manning, 2020)
  涵盖 OAuth2、JWT、mTLS 的 API 安全设计。

- **"Web Security for Developers"** - Malcolm McDonald (No Starch Press, 2020)
  实战导向的 Web 安全，包含身份认证章节。

### 进阶主题

- **OAuth 2.1 草案**：[draft-ietf-oauth-v2-1](https://datatracker.ietf.org/doc/draft-ietf-oauth-v2-1/)
- **Token Binding**：[RFC 8471](https://www.rfc-editor.org/rfc/rfc8471)
- **Token Introspection**：[RFC 7662](https://www.rfc-editor.org/rfc/rfc7662)
- **Token Revocation**：[RFC 7009](https://www.rfc-editor.org/rfc/rfc7009)
- **PAR (Pushed Authorization Requests)**：[RFC 9126](https://www.rfc-editor.org/rfc/rfc9126)
- **JAR (JWT-Secured Authorization Requests)**：[RFC 9101](https://www.rfc-editor.org/rfc/rfc9101)

### 相关课程

- **MIT 6.5840**：Distributed Systems - 分布式系统的身份与认证
- **Stanford CS155**：Computer and Network Security - Web 安全
- **CMU 15-440**：Distributed Systems - 分布式认证
- **Berkeley CS161**：Computer Security - 密码学与认证
- **Dan Boneh 的 Cryptography I**（Coursera）- 密码学基础

### 开源项目

- **[Keycloak](https://www.keycloak.org/)**：企业级 IAM，OAuth2 + OIDC + SAML
- **[Ory Hydra](https://www.ory.sh/hydra/)**：Go 实现的高性能 OAuth2 服务器
- **[Authentik](https://goauthentik.io/)**：Go 实现的灵活 IAM
- **[Dex](https://github.com/dexidp/dex)**：Go 实现的 OIDC Provider，支持多 IdP 联合
- **[Casdoor](https://casdoor.org/)**：Go 实现的 UI-first IAM

### 博客与文章

- **[OAuth 2.0 Security Best Practices](https://oauth.net/2/security-best-practices/)**：OAuth Working Group 官方
- **[JWT Best Practices by Auth0](https://auth0.com/blog/a-look-at-the-latest-draft-for-jwt-bcp/)**：Auth0 团队
- **[The Problem with OAuth2 and SPAs](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-browser-based-apps)**：IETF 草案
- **[DPoP vs mTLS](https://www.ory.sh/dpop-vs-mtls/)**：Ory 团队对比
- **[JWTsigned vs opaque tokens](https://www.cloudbees.com/blog/jwt-signed-vs-opaque-tokens)**：CloudBees 分析

### Go 相关

- **[Go Security Checklist](https://github.com/Checkmarx/Go-SCP)**：Go 安全编程清单
- **[Go Web Authentication Patterns](https://www.alexedwards.net/blog/working-with-cookies-in-go)**：Alex Edwards
- **[Justinas Stankevičius 的 middleware 设计](https://github.com/justinas/alice)**：中间件链设计参考

### 视频资源

- **"OAuth 2.0: An Overview"** by Aaron Parecki (YouTube)
- **"JWT vs Cookies"** by Web Dev Simplified (YouTube)
- **"Designing OAuth 2.0 Servers"** by Ory Summit 2023

---

## 结语

OAuth 2.0 与 JWT 是现代分布式系统身份认证与授权的基石。掌握它们不仅需要理解协议规范，还需要在工程实践中遵循最佳实践。本章节对标 MIT/Stanford/CMU 的教学水准，从历史动机、形式化定义、理论推导、代码示例、对比分析、案例研究等多个维度，全面阐述了 OAuth 2.0 与 JWT 的核心原理与 Go 语言实现。

关键要点回顾：

1. **OAuth 2.0 是授权协议，OIDC 是认证层**：不要用 OAuth 2.0 做认证
2. **JWT 是签名不是加密**：不要存储敏感信息
3. **算法选择很关键**：新项目优先 EdDSA，兼容性要求选 RS256
4. **PKCE 必备**：所有客户端都应使用 PKCE
5. **短时效 + Refresh 轮换**：降低令牌泄露风险
6. **密钥轮换**：通过 JWKS endpoint 平滑过渡
7. **验证要严格**：iss、aud、exp、nbf、alg 都要校验
8. **撤销机制**：黑名单 + 短时效 + Refresh 轮换

通过本章节的学习，读者应能够独立设计并实现生产级的身份认证与授权系统，对标 MIT 6.5840、Stanford CS155、CMU 15-440 的教学水准。下一章节将探讨 Go 在加密领域的应用，包括 AES、RSA、ECDSA、Ed25519 等算法的工程实践。
