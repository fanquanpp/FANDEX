---
order: 53
title: Web安全深度
module: cybersecurity
category: 网络安全
difficulty: advanced
description: Web安全深度：SQL注入、XSS、CSRF、SSRF、JWT安全与API安全
author: fanquanpp
updated: '2026-06-14'
related:
  - cybersecurity/密码学应用
  - cybersecurity/SQL注入
  - cybersecurity/命令注入
  - cybersecurity/安全运营中心
prerequisites:
  - cybersecurity/安全基础与防御
---

## 1. SQL 注入

### 1.1 注入类型

| 类型     | 说明          |
| -------- | ------------- |
| 联合查询 | UNION SELECT  |
| 报错注入 | 利用错误信息  |
| 盲注     | 布尔/时间盲注 |
| 堆叠注入 | 多语句执行    |

### 1.2 防御

- 参数化查询（预编译）
- 输入验证
- 最小权限
- WAF

## 2. XSS

### 2.1 类型

| 类型   | 说明        |
| ------ | ----------- |
| 反射型 | URL参数注入 |
| 存储型 | 持久化存储  |
| DOM型  | 客户端渲染  |

### 2.2 防御

- 输出编码
- CSP（Content Security Policy）
- HttpOnly Cookie
- 输入验证

## 3. CSRF

### 3.1 攻击原理

```
用户已登录A网站
→ 访问恶意网站B
→ B自动发送请求到A
→ A认为是用户操作
```

### 3.2 防御

- CSRF Token
- SameSite Cookie
- 验证 Referer/Origin
- 双重Cookie验证

## 4. SSRF

### 4.1 攻击场景

- 访问内网服务
- 读取本地文件
- 云元数据获取凭证

### 4.2 防御

- URL白名单
- 禁止内网地址
- 限制协议（仅HTTP/HTTPS）
- 网络隔离

## 5. JWT 安全

### 5.1 常见漏洞

| 漏洞        | 说明         |
| ----------- | ------------ |
| 算法None    | 删除签名     |
| RS256→HS256 | 公钥作为密钥 |
| 弱密钥      | 暴力破解     |
| 未验证签名  | 忽略验证     |

### 5.2 安全实践

- 使用 RS256/ES256
- 密钥足够长
- 验证签名和声明
- 设置短过期时间
- 不存敏感数据

## 6. API 安全

### 6.1 OWASP API Top 10

| 风险           | 说明         |
| -------------- | ------------ |
| 对象级授权     | 越权访问     |
| 认证失效       | 认证绕过     |
| 对象属性级授权 | 敏感字段暴露 |
| 速率限制       | 无限调用     |
| 功能级授权     | 管理API暴露  |

### 6.2 API 安全措施

- OAuth2/OIDC 认证
- 速率限制
- 输入验证
- 输出过滤
- API 网关
- 审计日志
