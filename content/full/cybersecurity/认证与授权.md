---
order: 66
title: 认证与授权
module: cybersecurity
category: 'eng-infra'
difficulty: intermediate
description: '身份认证与访问控制：认证机制、OAuth2、JWT、RBAC/ABAC 等详解。'
author: fanquanpp
updated: '2026-06-14'
related:
  - cybersecurity/安全编码原则
  - cybersecurity/输入验证
  - 'cybersecurity/OWASP-Top-10详解'
  - cybersecurity/XXE攻击
prerequisites:
  - cybersecurity/安全基础与防御
---

## 1. 身份认证

### 1.1 认证方式

| 方式           | 安全性 | 用户体验 | 典型场景   |
| -------------- | ------ | -------- | ---------- |
| 密码           | 低     | 好       | 基础认证   |
| MFA            | 高     | 中       | 高安全场景 |
| 证书           | 高     | 差       | 企业内网   |
| 生物识别       | 中     | 好       | 移动设备   |
| SSO            | 中     | 好       | 企业应用   |
| FIDO2/WebAuthn | 最高   | 好       | 现代认证   |

### 1.2 密码认证

**安全要求**：

| 要求     | 描述                 |
| -------- | -------------------- |
| 最小长度 | 8+ 字符              |
| 复杂度   | 大小写+数字+特殊字符 |
| 哈希存储 | Bcrypt/Argon2id      |
| 盐值     | 每用户唯一盐         |
| 速率限制 | 防暴力破解           |
| 锁定策略 | 失败 N 次锁定        |

### 1.3 多因素认证（MFA）

```
因素类型：
- 知识因素（Something you know）：密码、PIN
- 持有因素（Something you have）：手机、Token
- 固有因素（Something you are）：指纹、面部
```

**TOTP 实现**：

```python
import pyotp

# 生成密钥
secret = pyotp.random_base32()

# 生成 TOTP
totp = pyotp.TOTP(secret)
current_code = totp.now()

# 验证
totp.verify(user_input_code)
```

## 2. OAuth 2.0

### 2.1 角色定义

| 角色                 | 描述               |
| -------------------- | ------------------ |
| Resource Owner       | 资源所有者（用户） |
| Client               | 第三方应用         |
| Authorization Server | 授权服务器         |
| Resource Server      | 资源服务器         |

### 2.2 授权类型

| 类型                      | 用途       | 安全性 |
| ------------------------- | ---------- | ------ |
| Authorization Code        | Web 应用   | 推荐   |
| Authorization Code + PKCE | SPA/移动端 | 最推荐 |
| Client Credentials        | 服务器间   |        |
| Device Code               | IoT 设备   |        |
| Implicit                  | SPA（旧）  | 已废弃 |
| Resource Owner Password   | 信任应用   | 已废弃 |

### 2.3 Authorization Code 流程

```
1. Client → Authorization Server: 授权请求
2. User → Authorization Server: 同意授权
3. Authorization Server → Client: 授权码
4. Client → Authorization Server: 用授权码换 Token
5. Authorization Server → Client: Access Token + Refresh Token
6. Client → Resource Server: 用 Token 访问资源
```

### 2.4 PKCE 扩展

```javascript
// 生成 code_verifier 和 code_challenge
const codeVerifier = generateRandomString(128);
const codeChallenge = base64UrlEncode(sha256(codeVerifier));

// 授权请求带上 code_challenge
// Token 请求带上 code_verifier
```

## 3. JWT（JSON Web Token）

### 3.1 结构

```
Header.Payload.Signature

eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abc123
```

**Header**：

```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

**Payload**：

```json
{
  "sub": "1234567890",
  "name": "John Doe",
  "iat": 1516239022,
  "exp": 1516242622
}
```

### 3.2 安全注意事项

| 问题       | 防御                          |
| ---------- | ----------------------------- |
| 算法篡改   | 服务端强制指定算法            |
| 密钥强度   | HS256 使用 256+ 位密钥        |
| Token 泄露 | HttpOnly Cookie 或短期 Token  |
| 无效撤销   | 黑名单/短期过期+Refresh Token |
| 敏感信息   | 不在 Payload 中存储敏感数据   |

### 3.3 代码示例

```python
import jwt
from datetime import datetime, timedelta

SECRET = "your-secret-key"

# 生成 Token
token = jwt.encode({
    "sub": "user123",
    "iat": datetime.utcnow(),
    "exp": datetime.utcnow() + timedelta(hours=1)
}, SECRET, algorithm="HS256")

# 验证 Token
try:
    payload = jwt.decode(token, SECRET, algorithms=["HS256"])
except jwt.ExpiredSignatureError:
    print("Token expired")
except jwt.InvalidTokenError:
    print("Invalid token")
```

## 4. 访问控制模型

### 4.1 RBAC（基于角色）

```
用户 → 角色 → 权限

admin    → [read, write, delete, manage_users]
editor   → [read, write]
viewer   → [read]
```

```python
class RBAC:
    def __init__(self):
        self.roles = {}

    def add_role(self, role, permissions):
        self.roles[role] = set(permissions)

    def check_permission(self, user_role, permission):
        return permission in self.roles.get(user_role, set())
```

### 4.2 ABAC（基于属性）

```
访问决策 = f(主体属性, 资源属性, 环境属性, 操作)

示例：
- 主体：部门=财务, 级别=经理
- 资源：类型=报表, 密级=机密
- 环境：时间=工作时间, IP=内网
- 操作：读取
→ 允许
```

### 4.3 常见访问控制漏洞

| 漏洞     | 描述                   | 防御              |
| -------- | ---------------------- | ----------------- |
| 水平越权 | 访问同级别其他用户数据 | 检查资源所有权    |
| 垂直越权 | 低权限访问高权限功能   | 服务端权限检查    |
| IDOR     | 不安全的直接对象引用   | 间接引用+权限验证 |
| 缺失检查 | 某些接口未验证权限     | 统一中间件检查    |

## 5. 会话管理

### 5.1 Session vs Token

| 对比项   | Session    | JWT      |
| -------- | ---------- | -------- |
| 存储位置 | 服务端     | 客户端   |
| 状态     | 有状态     | 无状态   |
| 扩展性   | 需共享存储 | 天然支持 |
| 撤销     | 即时       | 困难     |
| 大小     | 小         | 较大     |

### 5.2 安全配置

```python
# Flask Session 安全配置
app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SECURE=True,
    SESSION_COOKIE_SAMESITE='Lax',
    PERMANENT_SESSION_LIFETIME=3600,
    SECRET_KEY=os.urandom(32),
)
```

## 6. 零信任架构

### 6.1 核心原则

- 永不信任，始终验证
- 最小权限
- 假设已被入侵
- 微分段

### 6.2 实现要素

| 要素     | 描述             |
| -------- | ---------------- |
| 身份验证 | 每次请求都验证   |
| 设备验证 | 检查设备安全状态 |
| 微分段   | 细粒度网络隔离   |
| 最小权限 | 按需授权         |
| 持续监控 | 实时风险评估     |
