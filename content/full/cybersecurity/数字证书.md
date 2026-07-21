---
order: 59
title: 数字证书
module: cybersecurity
category: 'eng-infra'
difficulty: intermediate
description: '数字证书原理：X.509 标准、PKI 体系、证书链验证与证书管理详解。'
author: fanquanpp
updated: '2026-06-14'
related:
  - cybersecurity/安全开发
  - cybersecurity/合规与审计
  - cybersecurity/HTTPS原理
  - cybersecurity/渗透测试方法论
prerequisites:
  - cybersecurity/安全基础与防御
---

## 1. 数字证书基础

### 1.1 什么是数字证书

数字证书是电子文档，用于证明公钥的所有权。由受信任的证书颁发机构（CA）签名。

### 1.2 核心组成

```
证书 = 公钥 + 身份信息 + 有效期 + CA 签名
```

### 1.3 信任模型

```
根 CA → 中间 CA → 终端证书
  ↑
信任锚
```

## 2. X.509 标准

### 2.1 证书结构

```
Certificate ::= SEQUENCE {
    tbsCertificate       TBSCertificate,
    signatureAlgorithm   AlgorithmIdentifier,
    signatureValue       BIT STRING
}

TBSCertificate ::= SEQUENCE {
    version              [0] EXPLICIT INTEGER DEFAULT v1,
    serialNumber         CertificateSerialNumber,
    signature            AlgorithmIdentifier,
    issuer               Name,
    validity             Validity,
    subject              Name,
    subjectPublicKeyInfo SubjectPublicKeyInfo,
    issuerUniqueID       [1] IMPLICIT UniqueIdentifier OPTIONAL,
    subjectUniqueID      [2] IMPLICIT UniqueIdentifier OPTIONAL,
    extensions           [3] EXPLICIT Extensions OPTIONAL
}
```

### 2.2 关键字段

| 字段          | 描述                |
| ------------- | ------------------- |
| Version       | v1(0)、v2(1)、v3(2) |
| Serial Number | CA 分配的唯一序列号 |
| Issuer        | 颁发者 DN           |
| Validity      | 起止时间            |
| Subject       | 主体 DN             |
| Public Key    | 公钥及算法          |
| Extensions    | 扩展信息            |

### 2.3 重要扩展

| 扩展                           | 描述              | 关键性 |
| ------------------------------ | ----------------- | ------ |
| Subject Alternative Name (SAN) | 证书覆盖的域名/IP | 关键   |
| Basic Constraints              | CA 标志和路径深度 | 关键   |
| Key Usage                      | 密钥用途          | 关键   |
| Extended Key Usage             | 扩展密钥用途      | 非关键 |
| Authority Key Identifier       | 颁发者密钥标识    | 非关键 |
| Subject Key Identifier         | 主体密钥标识      | 非关键 |
| CRL Distribution Points        | CRL 分发点        | 非关键 |
| Authority Information Access   | OCSP 地址         | 非关键 |

### 2.4 证书编码

| 格式    | 扩展名     | 描述                   |
| ------- | ---------- | ---------------------- |
| DER     | .der, .cer | 二进制编码             |
| PEM     | .pem, .crt | Base64 编码 + 头尾标记 |
| PKCS#7  | .p7b       | 证书链容器             |
| PKCS#12 | .p12, .pfx | 含私钥的容器           |

## 3. PKI 体系

### 3.1 PKI 组件

| 组件               | 功能           |
| ------------------ | -------------- |
| CA（证书颁发机构） | 签发和管理证书 |
| RA（注册机构）     | 身份验证       |
| 证书库             | 存储已颁发证书 |
| CRL/OCSP           | 证书状态查询   |
| 终端实体           | 证书使用者     |

### 3.2 证书生命周期

```
申请 → 验证 → 签发 → 部署 → 使用 → 续期/吊销 → 过期
```

### 3.3 证书类型

| 类型           | 验证级别         | 适用场景  |
| -------------- | ---------------- | --------- |
| DV（域名验证） | 仅验证域名控制权 | 个人网站  |
| OV（组织验证） | 验证组织身份     | 企业网站  |
| EV（扩展验证） | 严格身份验证     | 金融/电商 |

## 4. 证书链验证

### 4.1 验证流程

```
1. 检查证书签名是否由上级 CA 签发
2. 逐级验证直到根 CA
3. 检查每个证书的有效期
4. 检查证书是否被吊销（CRL/OCSP）
5. 检查 Key Usage 和 Extended Key Usage
6. 检查 SAN 是否匹配目标域名
```

### 4.2 证书链示例

```
根 CA (DigiCert Global Root CA)
  └── 中间 CA (DigiCert SHA2 Secure Server CA)
       └── 终端证书 (example.com)
```

### 4.3 交叉签名

当根 CA 更换密钥时，使用新旧密钥同时签名中间 CA，确保过渡期兼容性。

## 5. 证书吊销

### 5.1 CRL（证书吊销列表）

```xml
<!-- CRL 结构 -->
CertificateList ::= SEQUENCE {
    tbsCertList          TBSCertList,
    signatureAlgorithm   AlgorithmIdentifier,
    signatureValue       BIT STRING
}
```

**缺点**：

- 需要定期下载完整列表
- 延迟高
- 列表可能很大

### 5.2 OCSP（在线证书状态协议）

```http
GET /ocsp?serial=123456 HTTP/1.1
Host: ocsp.example-ca.com
```

**响应**：

| 状态    | 含义       |
| ------- | ---------- |
| good    | 证书有效   |
| revoked | 证书已吊销 |
| unknown | 未知       |

### 5.3 OCSP Stapling

服务器主动获取并缓存 OCSP 响应，在 TLS 握手时发送给客户端。

**优势**：

- 减少客户端到 OCSP 服务器的请求
- 提高隐私性
- 减少延迟

## 6. 证书管理实践

### 6.1 OpenSSL 常用命令

```bash
# 生成私钥
openssl genrsa -out private.key 2048

# 生成 CSR
openssl req -new -key private.key -out request.csr

# 自签名证书
openssl req -x509 -key private.key -out cert.pem -days 365

# 查看证书信息
openssl x509 -in cert.pem -text -noout

# 验证证书链
openssl verify -CAfile ca.pem cert.pem

# 转换格式
openssl x509 -in cert.der -inform DER -out cert.pem -outform PEM
```

### 6.2 Let's Encrypt 自动化

```bash
# 使用 certbot 获取证书
certbot certonly --webroot -w /var/www/html -d example.com

# 自动续期
certbot renew --quiet
```

### 6.3 证书固定（Certificate Pinning）

```http
Public-Key-Pins: pin-sha256="base64=="; max-age=5184000
```

> 注意：HTTP Public Key Pinning (HPKP) 已被 Chrome 废弃，推荐使用 Certificate Transparency。

### 6.4 证书透明度（CT）

所有公开可信证书必须记录在 CT 日志中，可被公开审计。

```http
Expect-CT: enforce, max-age=86400, report-uri="https://example.com/ct-report"
```
