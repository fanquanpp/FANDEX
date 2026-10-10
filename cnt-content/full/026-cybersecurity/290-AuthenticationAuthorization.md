---
order: 300
title: 认证与授权
module: 'cybersecurity'
category: 云与基础设施
difficulty: intermediate
description: 认证（你是谁）与授权（你能干什么）的边界与各自攻击面：密码策略的演进逻辑、OAuth2 的委托授权本质、JWT 无状态与撤销的两难、RBAC/ABAC 选型与越权漏洞的共同根源，附动手练习与面试题思路。
author: fanquanpp
updated: '2026-10-07'
related:
  - 'cybersecurity/310-OAuth2OIDC'
  - 'cybersecurity/070-PasswordHash'
  - 'cybersecurity/320-ZeroTrustArchitecture'
  - 'cybersecurity/330-SecureCodingPrinciples'
prerequisites:
  - 'cybersecurity/010-SecurityBasicsDefense'
---

## 1. 先分清两个词：认证与授权

面试与事故报告里最常被混用的两个概念，用一句话切开：

- **认证（Authentication）**：证明「你是谁」。攻击面集中在**凭证**——密码被猜、
  被拖库、被钓鱼，Token 被偷；
- **授权（Authorization）**：决定「你能干什么」。攻击面集中在**判断逻辑**——
  忘了判断、判断放错地方、信任了客户端传来的身份标识。

两者的执行时机也不同：认证通常在会话建立时发生一次；授权是**每一次请求**都要
做的事。把授权当成「登录时检查一遍」是越权漏洞的第一大来源。本篇讲两条主线
的原理与选型，OAuth2/OIDC 协议细节在 310-OAuth2OIDC，零信任的持续验证思想
在 320-ZeroTrustArchitecture。

## 2. 认证：密码、MFA 与「信任的证据」

### 2.1 密码策略为什么在变

老规范说「8 位以上 + 大小写 + 数字 + 符号」，新规范（NIST SP 800-63B 的方向）
说「**长度优先、复杂度规则松绑、定期强制换密取消**」。背后的算力账：

```text
旧假设：字符集扩大 → 爆破空间指数增长 → 复杂度有效
新现实：用户对复杂度规则的反应是可预测的模式
        （Password1!、Abc@1234……）→ 熵没增加，可记忆性还变差
        → 真正的防护 = 长度 + 慢哈希 + 泄露密码黑名单 + 限速
```

配套不变量：存储必须慢哈希加盐（bcrypt/Argon2id，原理见 070-PasswordHash 与
330-SecureCodingPrinciples），登录接口必须限速与锁定，认证失败日志要记但
不能泄露「用户是否存在」这类信息（枚举辅助）。

### 2.2 MFA 的本质：多一条独立攻击面

MFA 不是「多一次输密码」，而是**引入一条与密码不同源的攻击面**：

| 因素   | 例子         | 单独被攻破的方式             |
| :----- | :----------- | :--------------------------- |
| 知识   | 密码、PIN    | 拖库、钓鱼、爆破             |
| 持有   | TOTP、硬件钥 | SIM 劫持（短信）、设备失窃   |
| 固有   | 指纹、人脸   | 伪造呈现（深度伪造/照片）    |

攻击者要同时拿两条独立因素，成本陡增——这是 MFA 有效性的全部来源。同时也
解释了它的失效模式：**短信验证码可被 SIM 劫持拦截**，所以安全敏感场景优先
TOTP 或 FIDO2/WebAuthn（后者绑定来源域，钓鱼站拿不到有效断言）。

### 2.3 TOTP 的一分钟原理

TOTP = 以共享密钥 + 当前时间片（通常 30 秒）算出的 HMAC，两端独立计算、比对
结果。理解两点就够：服务器只存密钥的哈希形式而非明文；校验窗口通常允许前后
一个时间片（容忍时钟漂移），窗口开多大是安全与可用性的权衡。

## 3. 授权：会话、Token 与三个模型

### 3.1 Session 与 JWT：无状态换撤销难

| 维度     | 服务端 Session         | JWT                        |
| :------- | :--------------------- | :------------------------- |
| 状态位置 | 服务端（内存/Redis）   | 客户端持有                 |
| 扩展性   | 需共享存储             | 天然分布式友好             |
| 撤销     | 删记录即时生效         | 困难：要么等过期要么上黑名单 |
| 大小     | 仅 ID 过网络           | Claims 全部随请求传输      |

JWT 的取舍本质是「**无状态换撤销难**」：签名只保证「没被改过」，不保证
「还有效」。由此推出三条工程纪律：Access Token 短命（分钟级）+ Refresh Token
换发；登出/封禁需要黑名单或网关级会话检查；Payload 只是 base64 编码不是加密，
**敏感信息不得写入**。撤销这个痛点以及「为什么很多时候 Session 更合适」，
是面试的高频追问。

### 3.2 OAuth2 的定位：委托授权，不是登录协议

最常见的误解是把 OAuth2 当成「第三方登录」。它解决的问题是**委托授权**：
用户不把密码交给第三方应用，也能让它访问自己的某些资源。四个角色一句串联：

```text
Resource Owner（用户）把 Resource Server（资源，如相册）的访问权
委托给 Client（第三方应用）；Authorization Server 负责发凭证。

授权码流程 = 用户在授权服务器登录并同意 → 授权服务器发「授权码」给 Client
→ Client 用授权码 + 自己的密钥换 Access Token（码不经用户浏览器暴露 Token）
```

两个必须记住的安全决策：

- **Implicit 已废弃**：它把 Token 直接拼在重定向 URL 里暴露给前端与历史记录，
  取代者是 **Authorization Code + PKCE**——Client 先发一个随机 `code_verifier`
  的哈希（challenge）给授权服务器，换 Token 时出示原文，中间人就算截获授权码
  也换不出 Token。SPA 与移动端一律用这套；
- **Client Credentials** 用于服务器对服务器的机器授权，全程没有用户参与，
  拿它做「用户登录」是角色错配。

OIDC 在 OAuth2 之上补上了「认证」这块（ID Token 声明用户身份），这才是
「用 Google 登录」实际用的协议，细节见 310-OAuth2OIDC。

### 3.3 RBAC 与 ABAC：按决策因素选模型

```text
RBAC：决策只看「角色」—— 权限 = f(角色)
      适合：组织结构清晰、权限相对静态的业务系统（后台、管理端）

ABAC：决策看「属性组合」—— 权限 = f(主体属性, 资源属性, 环境, 操作)
      适合：决策依赖上下文的场景（财务报表只有财务部且工作时间内可读）
```

选型心智模型：**RBAC 是 ABAC 的特例**（角色就是一种主体属性）。从 RBAC 起步
成本最低、最好审计；当「同一角色在不同上下文应有不同权限」的规则多到把角色
炸成几十个时，就该上 ABAC。两者常混合：RBAC 管粗粒度入口，ABAC 管细粒度数据。

### 3.4 越权漏洞：一个共同的根源

| 漏洞     | 形态                     | 根源                                   |
| :------- | :----------------------- | :------------------------------------- |
| 水平越权 | 看到别人的订单           | 只验证「已登录」，没验证「资源属于谁」 |
| 垂直越权 | 普通用户调到管理接口     | 部分接口漏挂权限中间件                 |
| IDOR     | 改 URL 里的 id 就能遍历  | 信任了客户端提供的直接对象引用         |

共同根源一句话：**把「认证通过」当成了「授权通过」**。防御模式是把所有权判断
收敛到数据访问层——查询永远带 `AND owner_id = :current_user`，而不是指望每个
handler 都记得判一次。

## 4. 面试题思路

- 「Session 和 JWT 怎么选？」——先答取舍（无状态 vs 可撤销），再按场景收口：
  单体或可共享 Redis 用 Session 简单可靠；分布式/跨服务/API 网关场景 JWT
  顺手，但必须配短过期 + 黑名单或网关校验；两者都别把敏感数据放进去。
- 「JWT 怎么实现登出？」——考点是识破「无状态」的边界：客户端删 Token 只是
  丢弃不是撤销；服务端要么短过期 + Refresh Token 立即失效，要么维护黑名单
  /版本号，此时已经部分回到有状态。
- 「alg: none 攻击是什么？」——JWT header 里的 `alg` 字段是**客户端声明的**；
  服务端若按 header 的 alg 验签，攻击者把 alg 改成 none 或从 RS256 降级成
  HS256（用公钥当 HMAC 密钥）即可伪造。防御：算法在服务端白名单写死，
  与 header 声明无关。
- 「水平越权怎么防？」——数据访问层强制所有权条件 + 不可猜测的资源标识
  （UUID 替代自增 id 只是提高门槛，不是修复）+ 用越权用例做自动化测试。

## 5. 动手实践

练习任务（先自己写，再看自检区）：

1. 用 PyJWT 实现签发与校验：Access Token 15 分钟、Refresh Token 7 天，
   校验时把算法白名单写死，并处理过期与签名无效两类异常。
2. 给「订单详情接口」修掉一个 IDOR：路由是
   `GET /orders/<order_id>`，当前实现直接按 id 查询返回。
3. 实现一个最小的 RBAC 装饰器：`@require('order:read')`，权限查不到时
   返回 403 而不是 500。

遮代码自检——先想再对：

提示一：任务 1 的算法白名单与异常分支怎么写？

```python
import jwt
from datetime import datetime, timedelta, timezone

SECRET = load_from_vault()            # 密钥不进代码库

def issue_access(sub: str) -> str:
    now = datetime.now(timezone.utc)
    return jwt.encode({"sub": sub, "iat": now,
                       "exp": now + timedelta(minutes=15)},
                      SECRET, algorithm="HS256")

def verify(token: str) -> dict:
    try:
        # algorithms 参数即白名单：header 里声明什么都不算数
        return jwt.decode(token, SECRET, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise AuthError("token expired")      # 业务上转 401 + 走刷新流程
    except jwt.InvalidTokenError:
        raise AuthError("invalid token")      # 签名错/格式错/alg 被篡改
```

提示二：任务 2 修 IDOR 改的是哪一行？

```python
# 修复前（信任客户端提供的引用，只验了登录）：
row = db.execute("SELECT * FROM orders WHERE id = %s", (order_id,)).fetchone()

# 修复后（所有权判断进数据访问层）：
row = db.execute(
    "SELECT * FROM orders WHERE id = %s AND user_id = %s",
    (order_id, current_user.id),
).fetchone()
if row is None:
    abort(404)      # 不存在与无权同响应，不给枚举探针
```

提示三：任务 3 的「失败安全」落在哪个分支？

```python
from functools import wraps

def require(perm: str):
    def deco(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            role = current_user.role
            if perm in ROLE_PERMS.get(role, set()):   # 未知角色 -> 空集 -> 拒绝
                return fn(*args, **kwargs)
            abort(403)      # 显式 403；任何异常也不应落到放行
        return wrapper
    return deco
```

## 6. 常见误区

| 误区                                 | 事实                                                       |
| :----------------------------------- | :--------------------------------------------------------- |
| 「登录了就有权限」                    | 认证解决「你是谁」，授权是每次请求都要重做的事               |
| 「JWT 签名防篡改所以 Payload 可放敏感数据」 | 签名不加密，base64 解码即读                              |
| 「OAuth2 就是第三方登录」             | OAuth2 是委托授权协议；登录能力由 OIDC 在其上补齐           |
| 「复杂度规则越多密码越安全」           | 可预测的复杂模式不增加熵；长度 + 慢哈希 + 黑名单才是主力     |
| 「UUID 当主键就不会越权」             | 随机 id 提高枚举门槛，所有权判断仍是必需的根本修复           |
| 「MFA 用短信就够了」                  | 短信可被 SIM 劫持；高安全场景用 TOTP 或 WebAuthn             |

## 小结

- **初学者要点**：认证管凭证、授权管判断，授权每次请求都要做；密码安全 =
  长度优先 + 慢哈希 + 限速；MFA 的价值在于引入独立攻击面；JWT 的取舍是
  无状态换撤销难，算法必须在服务端写死。
- **进阶注意**：SPA/移动端一律 Authorization Code + PKCE，Implicit 已废弃；
  RBAC 是 ABAC 的特例，按决策因素是否依赖上下文来选；越权类漏洞的共同根源
  是「把认证当授权」，修复模式是把所有权判断收进数据访问层；协议细节见
  310-OAuth2OIDC，会话 Cookie 属性与失败安全见 330-SecureCodingPrinciples。
