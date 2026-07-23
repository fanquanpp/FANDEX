---
order: 7
title: 安全与隐私
module: iot
category: 物联网
difficulty: advanced
description: 'IoT 安全威胁、设备认证、数据加密、固件安全、OTA 安全与合规标准。'
author: fanquanpp
updated: '2026-06-14'
related:
  - iot/IoT平台
  - iot/数据处理与分析
  - iot/实战项目
  - iot/MQTT协议
prerequisites: []
---

## 1. IoT 安全威胁

### 1.1 威胁模型

```
┌──────────────────────────────────────────────┐
│              IoT 安全威胁                      │
│                                              │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐│
│  │ 设备层威胁 │  │ 网络层威胁 │  │ 应用层威胁 ││
│  │ 物理攻击   │  │ 中间人攻击 │  │ 数据泄露   ││
│  │ 固件篡改   │  │ DDoS      │  │ 权限提升   ││
│  │ 侧信道攻击 │  │ 协议攻击   │  │ 注入攻击   ││
│  └───────────┘  └───────────┘  └───────────┘│
└──────────────────────────────────────────────┘
```

### 1.2 典型攻击案例

| 案例               | 攻击方式     | 影响        |
| :----------------- | :----------- | :---------- |
| **Mirai 僵尸网络** | 默认密码爆破 | 大规模 DDoS |
| **Stuxnet**        | USB 传播     | 破坏核设施  |
| **智能摄像头劫持** | 固件漏洞     | 隐私泄露    |
| **汽车远程控制**   | CAN 总线注入 | 安全威胁    |

### 1.3 IoT 安全挑战

| 挑战           | 描述                          |
| :------------- | :---------------------------- |
| **资源受限**   | MCU 算力不足以运行复杂加密    |
| **数量庞大**   | 数十亿设备难以逐一管理        |
| **生命周期长** | 设备运行 10+ 年，安全更新困难 |
| **物理暴露**   | 设备部署在不可控环境          |
| **供应链复杂** | 多方组件，安全责任不清        |

## 2. 设备认证

### 2.1 认证方式对比

| 方式           | 安全性 | 性能开销 | 管理复杂度 | 适用场景   |
| :------------- | :----- | :------- | :--------- | :--------- |
| **预共享密钥** | 低     | 低       | 低         | 开发测试   |
| **Token**      | 中     | 低       | 中         | 临时接入   |
| **X.509 证书** | 高     | 中       | 高         | 生产环境   |
| **TPM**        | 很高   | 中       | 高         | 高安全需求 |

### 2.2 X.509 证书认证

```python
# 生成设备证书
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.x509.oid import NameOID
import datetime

def generate_device_certificate(device_id: str, ca_key, ca_cert):
    # 生成设备密钥对
    device_key = ec.generate_private_key(ec.SECP256R1())

    # 构建证书
    subject = x509.Name([
        x509.NameAttribute(NameOID.COMMON_NAME, device_id),
        x509.NameAttribute(NameOID.ORGANIZATION_NAME, "IoT Corp"),
    ])

    cert = x509.CertificateBuilder().subject_name(
        subject
    ).issuer_name(
        ca_cert.subject
    ).public_key(
        device_key.public_key()
    ).serial_number(
        x509.random_serial_number()
    ).not_valid_before(
        datetime.datetime.utcnow()
    ).not_valid_after(
        datetime.datetime.utcnow() + datetime.timedelta(days=365)
    ).add_extension(
        x509.BasicConstraints(ca=False, path_length=None),
        critical=True,
    ).add_extension(
        x509.KeyUsage(
            digital_signature=True, key_encipherment=False,
            content_commitment=False, data_encipherment=False,
            key_agreement=True, key_cert_sign=False,
            crl_sign=False, encipher_only=False, decipher_only=False
        ),
        critical=True,
    ).sign(ca_key, hashes.SHA256())

    return device_key, cert
```

### 2.3 Token 认证（JWT）

```python
import jwt
import time

def generate_device_token(device_id: str, secret: str, ttl: int = 3600):
    """生成设备 JWT Token"""
    payload = {
        "device_id": device_id,
        "iat": int(time.time()),
        "exp": int(time.time()) + ttl,
        "permissions": ["publish", "subscribe"]
    }
    return jwt.encode(payload, secret, algorithm="HS256")

def verify_device_token(token: str, secret: str) -> dict:
    """验证设备 Token"""
    try:
        payload = jwt.decode(token, secret, algorithms=["HS256"])
        return {"valid": True, "device_id": payload["device_id"]}
    except jwt.ExpiredSignatureError:
        return {"valid": False, "reason": "token_expired"}
    except jwt.InvalidTokenError:
        return {"valid": False, "reason": "invalid_token"}
```

### 2.4 一机一密

```python
# 一机一密：每个设备有唯一密钥
import hmac
import hashlib

class DeviceAuth:
    def __init__(self, product_secret: str):
        self.product_secret = product_secret

    def generate_device_secret(self, device_name: str) -> str:
        """根据设备名生成设备密钥"""
        return hmac.new(
            self.product_secret.encode(),
            device_name.encode(),
            hashlib.sha256
        ).hexdigest()

    def generate_mqtt_password(self, device_name: str, timestamp: str) -> str:
        """生成 MQTT 连接密码"""
        content = f"{device_name}{timestamp}"
        return hmac.new(
            self.generate_device_secret(device_name).encode(),
            content.encode(),
            hashlib.sha256
        ).hexdigest()

# 使用
auth = DeviceAuth("product_secret_key")
device_secret = auth.generate_device_secret("sensor-001")
mqtt_password = auth.generate_mqtt_password("sensor-001", "1718300000")
```

## 3. 数据加密

### 3.1 加密层次

| 层次           | 方法       | 保护对象 |
| :------------- | :--------- | :------- |
| **传输加密**   | TLS/DTLS   | 通信链路 |
| **存储加密**   | AES-256    | 存储数据 |
| **端到端加密** | 应用层加密 | 全链路   |

### 3.2 TLS/DTLS

```python
# MQTT over TLS
import ssl
import paho.mqtt.client as mqtt

client = mqtt.Client()

# TLS 配置
context = ssl.create_default_context()
context.load_verify_locations("ca-certificate.pem")
context.load_cert_chain(
    "device-certificate.pem",
    "device-private-key.pem"
)
context.verify_mode = ssl.CERT_REQUIRED

client.tls_set_context(context)
client.connect("mqtt.example.com", 8883, 60)
```

### 3.3 数据加密

```python
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives import padding
import os

class IoTDataEncryption:
    """IoT 数据加密"""
    def __init__(self, key: bytes):
        self.key = key  # 32 bytes for AES-256

    def encrypt(self, plaintext: bytes) -> dict:
        """AES-256-CBC 加密"""
        iv = os.urandom(16)

        # PKCS7 填充
        padder = padding.PKCS7(128).padder()
        padded = padder.update(plaintext) + padder.finalize()

        cipher = Cipher(algorithms.AES(self.key), modes.CBC(iv))
        encryptor = cipher.encryptor()
        ciphertext = encryptor.update(padded) + encryptor.finalize()

        return {"iv": iv.hex(), "ciphertext": ciphertext.hex()}

    def decrypt(self, iv_hex: str, ciphertext_hex: str) -> bytes:
        """AES-256-CBC 解密"""
        iv = bytes.fromhex(iv_hex)
        ciphertext = bytes.fromhex(ciphertext_hex)

        cipher = Cipher(algorithms.AES(self.key), modes.CBC(iv))
        decryptor = cipher.decryptor()
        padded = decryptor.update(ciphertext) + decryptor.finalize()

        unpadder = padding.PKCS7(128).unpadder()
        return unpadder.update(padded) + unpadder.finalize()
```

### 3.4 轻量级加密（资源受限设备）

| 算法         | 密钥长度 | 性能 | 适用                        |
| :----------- | :------- | :--- | :-------------------------- |
| **AES-128**  | 128bit   | 中   | 通用                        |
| **ChaCha20** | 256bit   | 高   | 软件实现                    |
| **ASCON**    | 128bit   | 很高 | IoT 专用（NIST 轻量级标准） |

## 4. 固件安全

### 4.1 安全启动

```
Boot ROM → 验证 Bootloader 签名 → 验证 OS 签名 → 验证应用签名
   │              │                    │               │
  信任根        签名验证             签名验证        签名验证
```

### 4.2 固件签名与验证

```python
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import ec, utils

def sign_firmware(firmware_path: str, private_key) -> bytes:
    """固件签名"""
    with open(firmware_path, "rb") as f:
        firmware = f.read()

    signature = private_key.sign(
        firmware,
        ec.ECDSA(hashes.SHA256())
    )
    return signature

def verify_firmware(firmware_path: str, signature: bytes, public_key) -> bool:
    """固件验证"""
    with open(firmware_path, "rb") as f:
        firmware = f.read()

    try:
        public_key.verify(signature, firmware, ec.ECDSA(hashes.SHA256()))
        return True
    except Exception:
        return False
```

### 4.3 固件加密

```python
# 固件加密保护知识产权
def encrypt_firmware(firmware: bytes, key: bytes) -> bytes:
    """加密固件"""
    iv = os.urandom(16)
    cipher = Cipher(algorithms.AES(key), modes.CTR(iv))
    encryptor = cipher.encryptor()
    encrypted = iv + encryptor.update(firmware) + encryptor.finalize()
    return encrypted

# 设备端解密（在安全区域执行）
def decrypt_firmware(encrypted: bytes, key: bytes) -> bytes:
    """解密固件"""
    iv = encrypted[:16]
    ciphertext = encrypted[16:]
    cipher = Cipher(algorithms.AES(key), modes.CTR(iv))
    decryptor = cipher.decryptor()
    return decryptor.update(ciphertext) + decryptor.finalize()
```

## 5. OTA 更新安全

### 5.1 安全 OTA 流程

```
1. 构建固件 → 签名 → 加密 → 上传到 CDN
2. 通知设备有新版本（版本号 + 哈希 + 签名）
3. 设备下载固件
4. 验证签名 → 解密 → 校验哈希
5. 写入备份分区
6. 重启到新固件
7. 验证新固件运行正常
8. 确认更新 / 回滚
```

### 5.2 A/B 分区更新

```
┌──────────┐  ┌──────────┐
│ 分区 A    │  │ 分区 B    │
│ 当前固件  │  │ 新固件    │
│ v1.0.0   │  │ v1.1.0   │
└──────────┘  └──────────┘
     ↑ 活跃

更新：写入 B → 切换启动 → 验证 → 确认/回滚
```

### 5.3 OTA 安全检查清单

| 检查项     | 描述                    |
| :--------- | :---------------------- |
| 传输加密   | 使用 HTTPS/TLS 下载固件 |
| 签名验证   | 验证固件来源可信        |
| 完整性校验 | SHA-256 校验固件完整    |
| 版本控制   | 防止降级攻击            |
| 回滚机制   | 更新失败自动回滚        |
| 灰度发布   | 逐步推送，降低风险      |
| 审计日志   | 记录所有更新操作        |

## 6. 隐私保护

### 6.1 数据最小化

| 原则           | 描述           | 实践                         |
| :------------- | :------------- | :--------------------------- |
| **目的限制**   | 只收集必要数据 | 不收集与功能无关的传感器数据 |
| **数据最小化** | 最小化数据粒度 | 降精度：25.5°C → 25°C        |
| **本地处理**   | 数据不出设备   | 边缘推理，只上传结果         |
| **匿名化**     | 去除个人标识   | 设备 ID 代替用户 ID          |
| **定期删除**   | 设定数据保留期 | 超期自动删除                 |

### 6.2 差分隐私

```python
import numpy as np

def add_laplace_noise(value: float, sensitivity: float, epsilon: float) -> float:
    """添加拉普拉斯噪声实现差分隐私"""
    scale = sensitivity / epsilon
    noise = np.random.laplace(0, scale)
    return value + noise

# 使用：上报温度时添加噪声
real_temp = 25.5
private_temp = add_laplace_noise(real_temp, sensitivity=1.0, epsilon=0.5)
# private_temp ≈ 25.5 ± 小量噪声
```

## 7. 合规标准

### 7.1 主要标准

| 标准                | 范围 | 核心要求                         |
| :------------------ | :--- | :------------------------------- |
| **GDPR**            | 欧盟 | 数据保护、用户同意、被遗忘权     |
| **等保 2.0**        | 中国 | 安全物理环境、通信传输、边界防护 |
| **NIST 8259A**      | 美国 | IoT 设备网络安全基线             |
| **ETSI EN 303 645** | 欧洲 | 消费 IoT 安全基线                |
| **GB/T 37044**      | 中国 | IoT 安全评估指南                 |

### 7.2 安全基线

| 基线要求         | 描述                 |
| :--------------- | :------------------- |
| **无默认密码**   | 每台设备唯一密码     |
| **漏洞披露机制** | 提供 CVE 报告渠道    |
| **最小权限**     | 仅开放必要端口和服务 |
| **安全更新**     | 支持自动安全更新     |
| **传输加密**     | 所有通信使用 TLS     |
| **数据保护**     | 个人数据加密存储     |

## 8. 安全最佳实践

### 8.1 纵深防御

```
物理安全 → 设备安全 → 网络安全 → 应用安全 → 数据安全
  │          │          │          │          │
  防拆       安全启动   防火墙     输入验证   加密存储
  TPM       固件签名   TLS       权限控制   差分隐私
  串口保护   证书认证   VPN       审计日志   数据最小化
```

### 8.2 安全开发生命周期

| 阶段     | 安全活动                 |
| :------- | :----------------------- |
| **需求** | 威胁建模、安全需求定义   |
| **设计** | 安全架构设计、密码学选型 |
| **开发** | 安全编码规范、代码审查   |
| **测试** | 渗透测试、模糊测试       |
| **部署** | 安全配置、证书管理       |
| **运维** | 安全监控、漏洞响应       |

## 9. 小结

IoT 安全是系统性的挑战：

1. **设备认证**是第一道防线，X.509 证书是生产环境推荐方案
2. **数据加密**需覆盖传输、存储和端到端三个层次
3. **固件安全**通过安全启动和签名验证防止篡改
4. **OTA 安全**需确保签名验证、完整性校验和回滚机制
5. **隐私保护**遵循数据最小化和本地处理原则
6. **合规标准**是产品上市的必要条件，需提前规划
7. 安全是**纵深防御**，不能依赖单一措施
