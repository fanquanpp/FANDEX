---
order: 60
title: HTTPS原理
module: cybersecurity
category: 'eng-infra'
difficulty: intermediate
description: HTTPS原理：TLS/SSL握手过程、密钥交换、证书验证与安全配置详解。
author: fanquanpp
updated: '2026-06-14'
related:
  - cybersecurity/合规与审计
  - cybersecurity/数字证书
  - cybersecurity/渗透测试方法论
  - cybersecurity/信息收集
prerequisites:
  - cybersecurity/安全基础与防御
---

## 1. HTTPS 概述

### 1.1 什么是 HTTPS

HTTPS = HTTP + TLS/SSL，在传输层对 HTTP 通信进行加密，提供：

| 安全属性 | 描述           |
| -------- | -------------- |
| 机密性   | 数据加密传输   |
| 完整性   | 防止数据被篡改 |
| 身份认证 | 验证服务器身份 |

### 1.2 TLS 版本演进

| 版本    | 年份 | 状态     | 安全性      |
| ------- | ---- | -------- | ----------- |
| SSL 3.0 | 1996 | 废弃     | POODLE 攻击 |
| TLS 1.0 | 1999 | 废弃     | BEAST 攻击  |
| TLS 1.1 | 2006 | 废弃     | -           |
| TLS 1.2 | 2008 | 广泛使用 | 安全        |
| TLS 1.3 | 2018 | 推荐     | 最安全      |

## 2. TLS 1.2 握手过程

### 2.1 完整握手流程

```
Client                                          Server
  |                                                |
  |  1. ClientHello                                |
  |  (TLS版本, 密码套件, 随机数Rc, SNI)           |
  |----------------------------------------------->|
  |                                                |
  |  2. ServerHello                                |
  |  (TLS版本, 选定套件, 随机数Rs)                 |
  |  Certificate (服务器证书链)                     |
  |  ServerKeyExchange (DH参数)                    |
  |  ServerHelloDone                               |
  |<-----------------------------------------------|
  |                                                |
  |  3. ClientKeyExchange (DH公钥)                 |
  |  ChangeCipherSpec                              |
  |  Finished                                      |
  |----------------------------------------------->|
  |                                                |
  |  4. ChangeCipherSpec                           |
  |  Finished                                      |
  |<-----------------------------------------------|
  |                                                |
  |  ========== 加密通信开始 ==========            |
```

### 2.2 密钥推导

使用 ECDHE 密钥交换：

1. 双方交换 DH 公钥
2. 计算共享密钥 $K = g^{ab} \mod p$
3. 通过 PRF 推导主密钥：$master\_secret = PRF(K, "master secret", Rc || Rs)$
4. 从主密钥推导会话密钥：加密密钥、MAC 密钥、IV

### 2.3 密码套件

```
TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256
 │     │    │       │      │     │
 │     │    │       │      │     └─ PRF/HMAC
 │     │    │       │      └─────── 加密模式
 │     │    │       └────────────── 加密算法
 │     │    └────────────────────── 签名算法
 │     └─────────────────────────── 密钥交换
 └───────────────────────────────── 协议
```

## 3. TLS 1.3 握手过程

### 3.1 1-RTT 握手

```
Client                                          Server
  |                                                |
  |  1. ClientHello                                |
  |  (TLS 1.3, 密码套件, DH公钥share, 随机数)     |
  |----------------------------------------------->|
  |                                                |
  |  2. ServerHello                                |
  |  (选定套件, DH公钥share)                       |
  |  EncryptedExtensions                           |
  |  Certificate                                   |
  |  CertificateVerify                             |
  |  Finished                                      |
  |<-----------------------------------------------|
  |                                                |
  |  3. Finished                                   |
  |----------------------------------------------->|
  |                                                |
  |  ========== 加密通信开始 ==========            |
```

### 3.2 TLS 1.3 改进

| 改进           | 描述                          |
| -------------- | ----------------------------- |
| 握手 1-RTT     | 合并密钥交换到 ClientHello    |
| 0-RTT 恢复     | 会话恢复零延迟                |
| 移除不安全算法 | 删除 RSA 密钥交换、CBC 模式等 |
| 强制前向保密   | 仅支持 ECDHE                  |
| 加密更多握手   | ServerHello 之后全部加密      |

### 3.3 0-RTT 恢复

```
Client                                          Server
  |                                                |
  |  ClientHello + Early Data                      |
  |  (PSK + DH share + 应用数据)                   |
  |----------------------------------------------->|
  |                                                |
  |  ServerHello + New Session Ticket              |
  |  Application Data                              |
  |<-----------------------------------------------|
```

**注意**：0-RTT 数据存在**重放攻击**风险，仅适用于幂等操作。

## 4. 证书验证

### 4.1 验证流程

```
1. 检查证书是否由受信 CA 签发（签名验证）
2. 检查证书域名是否匹配（SAN/CN）
3. 检查证书是否在有效期内
4. 检查证书是否被吊销（OCSP/CRL）
5. 检查证书链完整性
```

### 4.2 主机名验证

```python
import ssl
import socket

context = ssl.create_default_context()
with socket.create_connection(('example.com', 443)) as sock:
    with context.wrap_socket(sock, server_hostname='example.com') as ssock:
        cert = ssock.getpeercert()
        # 自动验证主机名
```

## 5. HTTPS 安全配置

### 5.1 Nginx 配置

```nginx
server {
    listen 443 ssl http2;
    server_name example.com;

    # 证书
    ssl_certificate /etc/ssl/certs/example.com.pem;
    ssl_certificate_key /etc/ssl/private/example.com.key;

    # TLS 版本
    ssl_protocols TLSv1.2 TLSv1.3;

    # 密码套件
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;

    # 优先服务器密码套件
    ssl_prefer_server_ciphers on;

    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    # OCSP Stapling
    ssl_stapling on;
    ssl_stapling_verify on;
}
```

### 5.2 安全头

| 头                        | 值                                    | 作用           |
| ------------------------- | ------------------------------------- | -------------- |
| Strict-Transport-Security | `max-age=31536000; includeSubDomains` | 强制 HTTPS     |
| X-Content-Type-Options    | `nosniff`                             | 防止 MIME 嗅探 |
| X-Frame-Options           | `DENY`                                | 防止点击劫持   |

## 6. TLS 常见攻击

| 攻击       | 目标            | 防御             |
| ---------- | --------------- | ---------------- |
| BEAST      | TLS 1.0 CBC     | 升级到 TLS 1.2+  |
| POODLE     | SSL 3.0         | 禁用 SSL 3.0     |
| Heartbleed | OpenSSL 实现    | 升级 OpenSSL     |
| Logjam     | DH 512 位       | 使用 2048+ 位 DH |
| ROBOT      | RSA PKCS#1 v1.5 | 使用 RSA-OAEP    |
| Downgrade  | 协议降级        | TLS 1.3 强制     |

## 7. 证书部署最佳实践

| 实践              | 描述                       |
| ----------------- | -------------------------- |
| 自动续期          | 使用 certbot/Let's Encrypt |
| 证书监控          | 监控过期时间               |
| CT 日志           | 确保证书被记录             |
| 完美前向保密      | 仅使用 ECDHE 密码套件      |
| HTTP→HTTPS 重定向 | 301 重定向                 |
| HSTS Preload      | 提交到浏览器预加载列表     |
