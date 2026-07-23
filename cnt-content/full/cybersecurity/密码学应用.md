---
order: 51
title: 密码学应用
module: cybersecurity
category: 网络安全
difficulty: advanced
description: 密码学应用：PKI体系、数字证书、TLS协议、密钥管理与密码工程
author: fanquanpp
updated: '2026-06-14'
related:
  - cybersecurity/安全模型与框架
  - cybersecurity/CSRF攻击
  - cybersecurity/SQL注入
  - cybersecurity/Web安全深度
prerequisites:
  - cybersecurity/安全基础与防御
---

## 1. PKI 体系

### 1.1 组成

| 组件     | 功能           |
| -------- | -------------- |
| CA       | 证书颁发机构   |
| RA       | 注册机构       |
| 证书库   | 存储已颁发证书 |
| CRL/OCSP | 证书吊销查询   |
| 终端实体 | 证书使用者     |

### 1.2 证书链验证

```
根CA → 中间CA → 终端证书
  ↑ 验证签名    ↑ 验证签名
```

### 1.3 证书生命周期

```
申请 → 审核 → 签发 → 使用 → 续签/吊销
```

## 2. TLS 协议

### 2.1 TLS 1.3 握手

```
Client → Server: ClientHello + Key Share
Server → Client: ServerHello + Key Share + Certificate + Finished
Client → Server: Finished
```

1-RTT 完成，支持 0-RTT 恢复。

### 2.2 密码套件

```
TLS_AES_256_GCM_SHA384
│     │      │    │
│     │      │    └─ PRF/哈希
│     │      └────── AEAD加密
│     └───────────── 密钥交换
└─────────────────── 协议版本
```

## 3. 密钥管理

### 3.1 密钥生命周期

```
生成 → 分发 → 存储 → 使用 → 轮换 → 销毁
```

### 3.2 HSM

硬件安全模块（HSM）提供安全的密钥存储和密码运算。

### 3.3 KMS

密钥管理服务（KMS）提供云端密钥管理：

- 密钥自动轮换
- 访问审计
- 集成加密/解密API

## 4. 密码工程实践

### 4.1 安全随机数

```python
# 安全随机数生成
import secrets
key = secrets.token_bytes(32)  # 256位密钥
nonce = secrets.token_bytes(12)  # 96位nonce
```

### 4.2 AEAD 加密

```python
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

key = AESGCM.generate_key(bit_length=256)
aesgcm = AESGCM(key)
nonce = os.urandom(12)
ct = aesgcm.encrypt(nonce, plaintext, associated_data)
pt = aesgcm.decrypt(nonce, ct, associated_data)
```

### 4.3 密码学禁忌

- 不要自己实现密码算法
- 不要使用ECB模式
- 不要重复使用nonce
- 不要使用MD5/SHA1
- 不要硬编码密钥
