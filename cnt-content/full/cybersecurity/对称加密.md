---
order: 56
title: 对称加密
module: cybersecurity
category: 'eng-infra'
difficulty: intermediate
description: '对称加密原理：AES、DES、3DES、ChaCha20 等算法详解与对比。'
author: fanquanpp
updated: '2026-06-14'
related:
  - cybersecurity/恶意代码分析
  - cybersecurity/云安全
  - cybersecurity/应急响应
  - cybersecurity/非对称加密
prerequisites:
  - cybersecurity/安全基础与防御
---

## 1. 对称加密基础

### 1.1 基本概念

对称加密使用**同一密钥**进行加密和解密，核心优势是速度快、效率高。

$$E_K(M) = C, \quad D_K(C) = M$$

其中 $E$ 为加密函数，$D$ 为解密函数，$K$ 为密钥，$M$ 为明文，$C$ 为密文。

### 1.2 工作模式

| 模式 | 全称                  | 特点              | 并行 | 随机访问 |
| ---- | --------------------- | ----------------- | ---- | -------- |
| ECB  | Electronic Codebook   | 相同明文→相同密文 |      |          |
| CBC  | Cipher Block Chaining | 需要 IV           | 解密 |          |
| CTR  | Counter               | 流式加密          |      |          |
| GCM  | Galois/Counter        | 认证加密          |      |          |
| CFB  | Cipher Feedback       | 流式加密          | 解密 |          |
| OFB  | Output Feedback       | 流式加密          |      |          |

**推荐**：GCM 模式（提供加密+认证），CTR 模式（仅需加密时）。

### 1.3 填充方式

| 方式         | 描述                      |
| ------------ | ------------------------- |
| PKCS#7       | 每个填充字节值为填充长度  |
| Zero Padding | 填充零字节                |
| ISO 10126    | 随机填充+最后一字节为长度 |
| ANSI X.923   | 零填充+最后一字节为长度   |

> **Padding Oracle 攻击**：CBC 模式下，若服务器泄露填充验证结果，可逐字节解密密文。

## 2. DES 算法

### 2.1 算法概述

| 参数     | 值                        |
| -------- | ------------------------- |
| 密钥长度 | 56 位（64 位含 8 位校验） |
| 分组长度 | 64 位                     |
| 轮数     | 16 轮                     |
| 安全性   | 已不安全，仅教学用途      |

### 2.2 Feistel 结构

DES 采用 Feistel 网络：

$$L_i = R_{i-1}$$

$$R_i = L_{i-1} \oplus f(R_{i-1}, K_i)$$

### 2.3 3DES（Triple DES）

使用三次 DES 加密：

$$C = E_{K_3}(D_{K_2}(E_{K_1}(M)))$$

- 双密钥模式：$K_1 = K_3$，有效密钥 112 位
- 三密钥模式：有效密钥 168 位
- 速度慢，已逐步被 AES 替代

## 3. AES 算法

### 3.1 算法概述

| 参数     | AES-128 | AES-192 | AES-256 |
| -------- | ------- | ------- | ------- |
| 密钥长度 | 128 位  | 192 位  | 256 位  |
| 分组长度 | 128 位  | 128 位  | 128 位  |
| 轮数     | 10      | 12      | 14      |
| 安全性   | 安全    | 安全    | 高安全  |

### 3.2 AES 加密流程

每轮包含四个操作：

1. **SubBytes**：字节替换（S 盒）
2. **ShiftRows**：行移位
3. **MixColumns**：列混合（最后一轮省略）
4. **AddRoundKey**：轮密钥加

```
明文 → AddRoundKey → [SubBytes → ShiftRows → MixColumns → AddRoundKey] × (Nr-1) → SubBytes → ShiftRows → AddRoundKey → 密文
```

### 3.3 S 盒

AES 的 S 盒基于有限域 $GF(2^8)$ 上的乘法逆元和仿射变换：

$$s_{ij} = \text{Affine}(x^{-1}) \quad \text{在 } GF(2^8) \text{ 上}$$

### 3.4 代码示例

```python
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives import padding
import os

# AES-256-GCM 加密
def aes_gcm_encrypt(plaintext, key):
    nonce = os.urandom(12)
    cipher = Cipher(algorithms.AES(key), modes.GCM(nonce))
    encryptor = cipher.encryptor()
    ciphertext = encryptor.update(plaintext) + encryptor.finalize()
    return nonce, ciphertext, encryptor.tag

# AES-256-GCM 解密
def aes_gcm_decrypt(ciphertext, key, nonce, tag):
    cipher = Cipher(algorithms.AES(key), modes.GCM(nonce, tag))
    decryptor = cipher.decryptor()
    return decryptor.update(ciphertext) + decryptor.finalize()
```

## 4. ChaCha20

### 4.1 算法概述

| 参数     | 值     |
| -------- | ------ |
| 密钥长度 | 256 位 |
| Nonce    | 96 位  |
| 类型     | 流密码 |
| 轮数     | 20 轮  |

### 4.2 优势

- 纯软件实现速度优于 AES（无 AES-NI 时）
- 常数时间执行，抗侧信道攻击
- ChaCha20-Poly1305 提供认证加密

### 4.3 与 AES 对比

| 对比项     | AES-GCM     | ChaCha20-Poly1305  |
| ---------- | ----------- | ------------------ |
| 硬件加速   | AES-NI 支持 | 无专用指令         |
| 软件性能   | 较慢        | 更快               |
| 侧信道安全 | 需注意实现  | 天然安全           |
| TLS 支持   | 广泛        | Chrome/Google 主推 |

## 5. 密钥管理

### 5.1 密钥生成

```python
import os

# 安全随机密钥
key = os.urandom(32)  # AES-256 密钥
```

### 5.2 密钥派生

```python
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes

kdf = PBKDF2HMAC(
    algorithm=hashes.SHA256(),
    length=32,
    salt=salt,
    iterations=600000,  # OWASP 推荐
)
key = kdf.derive(password.encode())
```

### 5.3 密钥存储

| 方式     | 安全等级 | 适用场景   |
| -------- | -------- | ---------- |
| 硬编码   | 极低     | 绝对禁止   |
| 配置文件 | 低       | 开发环境   |
| 环境变量 | 中       | 容器化部署 |
| KMS      | 高       | 生产环境   |
| HSM      | 最高     | 金融/合规  |

## 6. 算法选择指南

| 场景        | 推荐算法           |
| ----------- | ------------------ |
| 通用加密    | AES-256-GCM        |
| 移动/嵌入式 | ChaCha20-Poly1305  |
| 大文件加密  | AES-256-CTR + HMAC |
| 兼容旧系统  | 3DES（仅过渡）     |
| 禁止使用    | DES、RC4、Blowfish |
