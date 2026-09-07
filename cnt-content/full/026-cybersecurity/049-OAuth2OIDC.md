---
order: 490
title: OAuth2/OIDC 配置命令
module: 'cybersecurity'
category: 云与基础设施
difficulty: beginner
description: Cybersecurity OAuth2/OIDC 配置命令 的完整教学讲解。
author: fanquanpp
updated: '2026-08-30'
related: []
prerequisites: []
---

## OAuth2 端点探测

**基本写法:获取授权服务器元数据**
`curl -s <URL>/.well-known/oauth-authorization-server`
```bash
# 获取 OAuth2 授权服务器配置信息
curl -s https://example.com/.well-known/oauth-authorization-server
```

**基本写法:获取 OIDC 发现文档**
`curl -s <URL>/.well-known/openid-configuration`
```bash
# 获取 OIDC 配置发现文档
curl -s https://example.com/.well-known/openid-configuration
```

**基本写法:获取 JWKS 公钥集**
`curl -s <URL>/.well-known/jwks.json`
```bash
# 获取签名 Token 的公钥集合
curl -s https://example.com/.well-known/jwks.json
```

**基本写法:测试授权端点**
`curl -s -I "<URL>/authorize?response_type=code&client_id=<ID>&redirect_uri=<回调>"`
```bash
# 测试授权端点是否可用
curl -s -I "https://example.com/oauth/authorize?response_type=code&client_id=client123&redirect_uri=https://app.com/callback"
```

**基本写法:测试 Token 端点**
`curl -s -X POST <URL>/token -d "grant_type=client_credentials"`
```bash
# 测试 Token 端点响应
curl -s -X POST https://example.com/oauth/token -d "grant_type=client_credentials&client_id=app&client_secret=secret"
```

---

## 授权码流程测试

**基本写法:构造授权请求**
`<URL>/authorize?response_type=code&client_id=<ID>&redirect_uri=<回调>&scope=<范围>&state=<状态>`
```bash
# 构造标准授权码请求
echo "https://example.com/oauth/authorize?response_type=code&client_id=app123&redirect_uri=https://app.com/callback&scope=openid+profile&state=$(openssl rand -hex 8)"
```

**基本写法:使用 PKCE 构造请求**
`<URL>/authorize?response_type=code&client_id=<ID>&code_challenge=<挑战值>&code_challenge_method=S256`
```bash
# 构造带 PKCE 的授权请求
VERIFIER=$(openssl rand -base64 32 | tr -d '+/=' | head -c 43)
CHALLENGE=$(echo -n "$VERIFIER" | openssl dgst -sha256 -binary | openssl base64 | tr -d '+/=' | head -c 43)
echo "https://example.com/oauth/authorize?response_type=code&client_id=app123&code_challenge=$CHALLENGE&code_challenge_method=S256"
```

**基本写法:用授权码换 Token**
`curl -X POST <URL>/token -d "grant_type=authorization_code&code=<授权码>&redirect_uri=<回调>&client_id=<ID>"`
```bash
# 使用授权码交换访问 Token
curl -X POST https://example.com/oauth/token -d "grant_type=authorization_code&code=abc123&redirect_uri=https://app.com/callback&client_id=app123&client_secret=secret"
```

**基本写法:PKCE 换 Token**
`curl -X POST <URL>/token -d "grant_type=authorization_code&code=<授权码>&code_verifier=<校验值>"`
```bash
# PKCE 流程交换 Token
curl -X POST https://example.com/oauth/token -d "grant_type=authorization_code&code=abc123&code_verifier=verifier_value&client_id=app123"
```

---

## 客户端凭据流程

**基本写法:请求客户端凭据 Token**
`curl -X POST <URL>/token -d "grant_type=client_credentials&scope=<范围>"`
```bash
# 服务间调用获取 Token
curl -X POST https://example.com/oauth/token -u "client_id:client_secret" -d "grant_type=client_credentials&scope=read"
```

**基本写法:使用 Basic 认证**
`curl -X POST <URL>/token -u "<ID>:<密钥>" -d "grant_type=client_credentials"`
```bash
# 使用 Basic Auth 方式传递客户端凭据
curl -X POST https://example.com/oauth/token -u "app123:secret" -d "grant_type=client_credentials"
```

**基本写法:刷新 Token**
`curl -X POST <URL>/token -d "grant_type=refresh_token&refresh_token=<刷新令牌>"`
```bash
# 使用刷新令牌获取新的访问 Token
curl -X POST https://example.com/oauth/token -d "grant_type=refresh_token&refresh_token=refresh_value&client_id=app123&client_secret=secret"
```

**基本写法:密码凭据流程(已不推荐)**
`curl -X POST <URL>/token -d "grant_type=password&username=<用户>&password=<密码>"`
```bash
# 资源所有者密码流程(已废弃)
curl -X POST https://example.com/oauth/token -d "grant_type=password&username=admin&password=pass&client_id=app123"
```

---

## Token 校验与自省

**基本写法:调用自省端点**
`curl -X POST <URL>/introspect -d "token=<Token>"`
```bash
# 使用 Token 自省端点验证 Token 状态
curl -X POST https://example.com/oauth/introspect -u "app123:secret" -d "token=access_token_value"
```

**基本写法:本地校验 JWT**
`python3 -c "import jwt; print(jwt.decode('<Token>', '<密钥>', algorithms=['HS256'], audience='<受众>'))"`
```bash
# 本地校验 JWT 签名与声明
python3 -c "import jwt; print(jwt.decode('eyJ...', 'secret', algorithms=['RS256'], audience='api.example.com', options={'verify_aud': True}))"
```

**基本写法:使用 JWKS 校验**
`python3 -c "import jwt, requests; jwks=requests.get('<JWKS_URL>').json(); print(jwks)"`
```bash
# 获取 JWKS 并校验 RS256 Token
python3 -c "import jwt, requests; jwks=requests.get('https://example.com/.well-known/jwks.json').json(); print(jwt.decode('eyJ...', key=jwks, algorithms=['RS256']))"
```

**基本写法:UserInfo 端点调用**
`curl -H "Authorization: Bearer <Token>" <URL>/userinfo`
```bash
# 调用 OIDC UserInfo 端点获取用户信息
curl -H "Authorization: Bearer access_token_value" https://example.com/userinfo
```

---

## OAuth2 安全检测

**基本写法:检测 redirect_uri 校验**
`curl -I "<URL>/authorize?client_id=<ID>&redirect_uri=https://evil.com&response_type=code"`
```bash
# 测试是否校验 redirect_uri 防止开放重定向
curl -I "https://example.com/oauth/authorize?client_id=app123&redirect_uri=https://evil.com&response_type=code"
```

**基本写法:检测 state 参数缺失**
`curl -I "<URL>/authorize?client_id=<ID>&response_type=code&redirect_uri=<回调>"`
```bash
# 测试是否强制要求 state 参数防 CSRF
curl -I "https://example.com/oauth/authorize?client_id=app123&response_type=code&redirect_uri=https://app.com/callback"
```

**基本写法:测试 scope 越权**
`curl -X POST <URL>/token -d "grant_type=client_credentials&scope=admin superuser"`
```bash
# 测试能否请求超出授权范围的 scope
curl -X POST https://example.com/oauth/token -u "app123:secret" -d "grant_type=client_credentials&scope=admin superuser"
```

**基本写法:检测隐式流程是否启用**
`curl -I "<URL>/authorize?response_type=token&client_id=<ID>"`
```bash
# 检测是否支持不安全的隐式流程
curl -I "https://example.com/oauth/authorize?response_type=token&client_id=app123"
```

---

## Keycloak 命令行操作

**基本写法:获取管理员 Token**
`curl -X POST <URL>/realms/master/protocol/openid-connect/token -d "grant_type=password&username=admin&password=<密码>"`
```bash
# 获取 Keycloak 管理员 Token
curl -X POST https://kc.example.com/realms/master/protocol/openid-connect/token -d "grant_type=password&username=admin&password=admin&client_id=admin-cli"
```

**基本写法:列出所有 Realm**
`curl -H "Authorization: Bearer <Token>" <URL>/admin/realms`
```bash
# 列出 Keycloak 中所有 Realm
curl -H "Authorization: Bearer admin_token" https://kc.example.com/admin/realms
```

**基本写法:创建 Realm**
`curl -X POST -H "Authorization: Bearer <Token>" -H "Content-Type: application/json" <URL>/admin/realms -d '<JSON>'`
```bash
# 创建新的 Realm
curl -X POST -H "Authorization: Bearer admin_token" -H "Content-Type: application/json" https://kc.example.com/admin/realms -d '{"realm":"myrealm","enabled":true}'
```

**基本写法:创建客户端**
`curl -X POST -H "Authorization: Bearer <Token>" <URL>/admin/realms/<Realm>/clients -d '<JSON>'`
```bash
# 在指定 Realm 中创建客户端
curl -X POST -H "Authorization: Bearer admin_token" -H "Content-Type: application/json" https://kc.example.com/admin/realms/myrealm/clients -d '{"clientId":"app123","enabled":true}'
```

---

## OAuth2 服务端配置

**基本写法:nginx 模板反向代理 OAuth2**
`proxy_pass <后端URL>;`
```bash
# 反向代理 OAuth2 后端服务
location /oauth {
    proxy_pass http://127.0.0.1:8080/oauth;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

**基本写法:Apache oauth2-proxy**
`ProxyPass /oauth2/ http://127.0.0.1:4180/oauth2/`
```bash
# Apache 反向代理 oauth2-proxy
ProxyPass /oauth2/ http://127.0.0.1:4180/oauth2/
ProxyPassReverse /oauth2/ http://127.0.0.1:4180/oauth2/
```

**基本写法:oauth2-proxy 启动**
`oauth2-proxy --http-address="0.0.0.0:4180" --upstream="<后端>" --client-id="<ID>" --client-secret="<密钥>" --email-domain="<域名>"`
```bash
# 启动 oauth2-proxy 服务
oauth2-proxy --http-address="0.0.0.0:4180" --upstream="http://127.0.0.1:8080/" --client-id="app123" --client-secret="secret" --cookie-secret=$(openssl rand -base64 32) --email-domain="example.com"
```

**基本写法:配置 cookie 安全属性**
`--cookie-secure --cookie-httponly --cookie-samesite=lax`
```bash
# oauth2-proxy 配置安全 Cookie
oauth2-proxy --cookie-secure --cookie-httponly --cookie-samesite=lax --cookie-name="_oauth2_proxy"
```

---

## OAuth2 日志审计

**基本写法:检索 OAuth 请求日志**
`grep -iE "/oauth/|/authorize|/token" <日志>`
```bash
# 检索所有 OAuth2 相关请求
grep -iE "/oauth/|/authorize|/token|/introspect" /var/log/nginx/access.log
```

**基本写法:统计 Token 端点调用**
`grep "/token" <日志> | awk '{print $1}' | sort | uniq -c | sort -rn`
```bash
# 统计 Token 端点调用来源 IP
grep "/oauth/token" /var/log/nginx/access.log | awk '{print $1}' | sort | uniq -c | sort -rn | head
```

**基本写法:检测 redirect_uri 攻击**
`grep -i "redirect_uri" <日志> | grep -i "evil\|attacker"`
```bash
# 检测可疑的 redirect_uri 重定向
grep -i "redirect_uri" /var/log/nginx/access.log | grep -iE "evil|attacker|hack"
```

**基本写法:监控异常 scope 请求**
`grep "scope" <日志> | grep -iE "admin|root|superuser"`
```bash
# 监控异常权限提升请求
grep "scope" /var/log/nginx/access.log | grep -iE "admin|root|superuser"
```

---

## OAuth2 安全自检

**基本写法:检查 PKCE 是否强制**
`curl -I "<URL>/authorize?response_type=code&client_id=<ID>"`
```bash
# 不带 PKCE 的请求测试是否被拒绝
curl -I "https://example.com/oauth/authorize?response_type=code&client_id=app123&redirect_uri=https://app.com/callback"
```

**基本写法:检查 HTTPS 强制**
`curl -I http://<URL>/.well-known/openid-configuration`
```bash
# 测试 HTTP 是否被重定向到 HTTPS
curl -I http://example.com/.well-known/openid-configuration
```

**基本写法:验证 Token 过期时间**
`python3 -c "import jwt; print(jwt.decode('<Token>', options={'verify_signature': False})['exp'])"`
```bash
# 检查 Token 过期时间是否合理
python3 -c "import jwt; print(jwt.decode('eyJ...', options={'verify_signature': False}))"
```

**基本写法:批量检查客户端配置**
`curl -H "Authorization: Bearer <Token>" <URL>/admin/realms/<Realm>/clients`
```bash
# 列出所有客户端配置检查安全性
curl -H "Authorization: Bearer admin_token" https://kc.example.com/admin/realms/myrealm/clients | python3 -m json.tool
```
