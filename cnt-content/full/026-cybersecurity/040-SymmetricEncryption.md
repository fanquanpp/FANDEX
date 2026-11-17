---
order: 40
title: 对称加密
module: 'cybersecurity'
category: 云与基础设施
difficulty: intermediate
description: 对称加密原理：AES、DES、3DES、ChaCha20 等算法详解与对比。
author: fanquanpp
updated: '2026-11-17'
related:
  - 'cybersecurity/570-MalwareAnalysis'
  - 'cybersecurity/530-CloudSecurity'
  - 'cybersecurity/560-IncidentResponse'
  - 'cybersecurity/050-AsymmetricEncryption'
prerequisites:
  - 'cybersecurity/010-SecurityBasicsDefense'
---

- **解决什么问题**：需要在「同一把钥匙」下又快又安全地加密大量数据——磁盘、数据库敏感列、备份、TLS 记录层全是它的主场；但要理解「算法安全」不等于「用法安全」：模式选错（ECB）、nonce 重用、密钥管理不当都会把强算法用漏。
- **容易怎么错**：看见「AES」就默认安全——ECB 模式的 AES 照样泄露图案；GCM 下复用 nonce 会同时击穿机密性与完整性；把 3DES 当「稳的老算法」继续在新代码里写入。
- **学完能做什么**：为新项目选定算法与模式（AES-256-GCM 或 ChaCha20-Poly1305）并说出理由，把密钥的生成/存储/轮换落到工程选型上。

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
- 速度慢；且分组仍是 64 位，约 32GB 数据量即出现 Sweet32 碰撞攻击窗口

**现状（2026）**：3DES 已被正式淘汰——NIST SP 800-131A Rev.2 明确 TDEA
用于加密自 2023 年底起不再获准，PCI DSS 亦已要求迁移；TLS 1.3 与现代协议
的密码套件中已彻底移除。存量系统只应作为「迁移中」的临时兼容项，
并制定明确的下线时间表。

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
| 兼容旧系统  | AES-128（过渡读取用），禁止新写入 3DES |
| 禁止使用    | DES、3DES、RC4、Blowfish |

### 6.1 量子计算的影响

对称加密受量子威胁远小于公钥算法：Grover 算法「仅」把暴力破解加速平方根量级，
即 AES-128 的有效安全强度从 128 位降至约 64 位（已显不足），而 **AES-256
仍有约 128 位强度，属于可长期依赖的选择**——这也是「密钥长度宁可选 256 位」
的前瞻性理由。真正需要迁移的是 RSA/ECC 等公钥算法，见 050-AsymmetricEncryption
的后量子密码一节。

## 自检

- 遮住 1.2 的模式表，凭记忆列出五种模式的名字与一句话特点，并解释为什么 ECB 加密图像会「泄图」（相同明文块得到相同密文块，轮廓图案原样保留）。
- 为什么同一密钥下 GCM 复用 nonce 是灾难级错误？它同时击穿了哪两件事（机密性——异或泄露；完整性——认证子密钥泄露可伪造密文）？
- 遮住 2.3 的现状段，复述 3DES 被淘汰的两条独立理由：64 位分组的 Sweet32 碰撞窗口，与 NIST SP 800-131A 对 TDEA 加密的禁令（2023 年底起不再获准）。
- 不看第 6 节的表，给三个场景各选算法并说理由：后台服务加密数据库敏感列（AES-256-GCM）；无 AES 硬件加速的嵌入式设备（ChaCha20-Poly1305）；需要 20 年保密期的归档（AES-256，兼顾量子时代强度）。
- 遮住 5.3 的存储表，说出五档存储方式对应的场景；再回答为什么「环境变量」在容器里只是中等安全（进程列表/编排系统日志可能带出，缺轮换与审计）。
