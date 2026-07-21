---
order: 58
title: 哈希算法
module: cybersecurity
category: 'eng-infra'
difficulty: intermediate
description: '哈希算法原理：SHA-1/SHA-2/SHA-3/MD5/Bcrypt 等算法详解与应用场景。'
author: fanquanpp
updated: '2026-06-14'
related:
  - cybersecurity/应急响应
  - cybersecurity/非对称加密
  - cybersecurity/安全开发
  - cybersecurity/合规与审计
prerequisites:
  - cybersecurity/安全基础与防御
---

## 1. 哈希算法基础

### 1.1 基本概念

哈希函数将任意长度输入映射为固定长度输出：

$$H: \{0,1\}^* \rightarrow \{0,1\}^n$$

### 1.2 安全性质

| 性质         | 描述                                                      |
| ------------ | --------------------------------------------------------- |
| 抗碰撞性     | 找到 $x \neq y$ 使 $H(x) = H(y)$ 在计算上不可行           |
| 抗原像性     | 给定 $h$，找到 $x$ 使 $H(x) = h$ 在计算上不可行           |
| 抗第二原像性 | 给定 $x$，找到 $y \neq x$ 使 $H(y) = H(x)$ 在计算上不可行 |
| 雪崩效应     | 输入微小变化导致输出巨大变化                              |

### 1.3 Merkle-Damgård 结构

大多数哈希算法采用此结构：

```
消息 → 填充 → 分块 → IV → [压缩函数] → [压缩函数] → ... → 哈希值
```

## 2. MD5 算法

### 2.1 概述

| 参数     | 值         |
| -------- | ---------- |
| 输出长度 | 128 位     |
| 分组长度 | 512 位     |
| 轮数     | 64（4×16） |
| 安全性   | 已破解     |

### 2.2 已知攻击

| 攻击         | 年份 | 描述                   |
| ------------ | ---- | ---------------------- |
| 碰撞攻击     | 2004 | 王小云团队找到实际碰撞 |
| 选择前缀碰撞 | 2006 | 可构造有意义的碰撞文件 |
| MD5 碰撞证书 | 2008 | 伪造 CA 证书           |

### 2.3 当前状态

**禁止用于安全场景**，仅可用于非安全目的（如文件校验、ETag）。

## 3. SHA-1 算法

### 3.1 概述

| 参数     | 值     |
| -------- | ------ |
| 输出长度 | 160 位 |
| 分组长度 | 512 位 |
| 轮数     | 80     |
| 安全性   | 已破解 |

### 3.2 SHAttered 攻击（2017）

Google 与 CWI 研究所成功找到 SHA-1 碰撞，计算代价约 $2^{63}$ 次。

**禁止用于安全场景**。

## 4. SHA-2 家族

### 4.1 概述

| 算法    | 输出长度 | 安全等级 |
| ------- | -------- | -------- |
| SHA-224 | 224 位   | 112 位   |
| SHA-256 | 256 位   | 128 位   |
| SHA-384 | 384 位   | 192 位   |
| SHA-512 | 512 位   | 256 位   |

### 4.2 SHA-256 算法流程

1. 消息填充（添加 1 位 + 零 + 64 位长度）
2. 分成 512 位分组
3. 每个分组进行 64 轮运算
4. 每轮使用：消息调度字、轮常数、位运算（AND、XOR、ROT）

### 4.3 代码示例

```python
import hashlib

# SHA-256
hash_sha256 = hashlib.sha256(b"Hello World").hexdigest()
# a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e

# SHA-512
hash_sha512 = hashlib.sha512(b"Hello World").hexdigest()

# HMAC
import hmac
hmac_sha256 = hmac.new(key, message, hashlib.sha256).hexdigest()
```

### 4.4 长度扩展攻击

Merkle-Damgård 结构的弱点：已知 $H(m)$ 和 $m$ 的长度，可以计算 $H(m || padding || m')$ 而不知道 $m$。

**防御**：使用 HMAC 而非直接哈希。

## 5. SHA-3（Keccak）

### 5.1 概述

| 算法     | 输出长度 | 特点     |
| -------- | -------- | -------- |
| SHA3-224 | 224 位   | 海绵结构 |
| SHA3-256 | 256 位   | 海绵结构 |
| SHA3-384 | 384 位   | 海绵结构 |
| SHA3-512 | 512 位   | 海绵结构 |
| SHAKE128 | 可变     | XOF      |
| SHAKE256 | 可变     | XOF      |

### 5.2 海绵结构

```
吸收阶段：消息分块 XOR 到状态中，经过置换函数
挤出阶段：从状态中提取输出
```

**优势**：

- 不受长度扩展攻击影响
- 可扩展输出长度（XOF）
- 与 SHA-2 完全不同的结构

## 6. 密码存储专用哈希

### 6.1 为什么不能用普通哈希

| 攻击     | 描述                           |
| -------- | ------------------------------ |
| 彩虹表   | 预计算哈希值对照表             |
| 暴力破解 | GPU 每秒可计算数十亿次 SHA-256 |
| 字典攻击 | 常见密码列表                   |

### 6.2 Bcrypt

```python
import bcrypt

# 哈希密码
hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=12))

# 验证
bcrypt.checkpw(password.encode(), hashed)
```

| 参数         | 值                     |
| ------------ | ---------------------- |
| 输出长度     | 184 位                 |
| 内置盐       | 是                     |
| 自适应       | rounds 参数（默认 12） |
| 最大密码长度 | 72 字节                |

### 6.3 Argon2

```python
from argon2 import PasswordHasher

ph = PasswordHasher()
hash = ph.hash("password")
ph.verify(hash, "password")
```

| 参数     | 描述             |
| -------- | ---------------- |
| 时间成本 | 迭代次数         |
| 内存成本 | 内存使用量（MB） |
| 并行度   | 线程数           |

**Argon2 优势**：抗 GPU/ASIC 攻击，2015 年密码哈希竞赛冠军。

### 6.4 PBKDF2

```python
import hashlib
import os

key = hashlib.pbkdf2_hmac('sha256', password.encode(), salt, 600000, dklen=32)
```

| 参数     | 推荐值              |
| -------- | ------------------- |
| 迭代次数 | 600,000+（SHA-256） |
| 盐长度   | 16+ 字节            |
| 输出长度 | 32+ 字节            |

## 7. 应用场景与算法选择

| 场景       | 推荐算法                   |
| ---------- | -------------------------- |
| 密码存储   | Argon2id > Bcrypt > PBKDF2 |
| 数据完整性 | SHA-256 / SHA-3            |
| 数字签名   | SHA-256 / SHA-384          |
| 文件校验   | SHA-256                    |
| HMAC       | HMAC-SHA256                |
| 禁止使用   | MD5、SHA-1（安全场景）     |
