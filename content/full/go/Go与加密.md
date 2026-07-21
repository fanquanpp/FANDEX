---
order: 78
title: Go与加密
module: go
category: Go
difficulty: intermediate
description: crypto包与安全编程
author: fanquanpp
updated: '2026-06-14'
related:
  - go/Go与日志
  - go/Go与模板
  - go/Go与信号处理
  - go/Go与文件监控
prerequisites:
  - go/概述与环境配置
---

## 概述

加密是保护数据安全的核心技术。Go 标准库的 `crypto` 包提供了丰富的加密功能，包括哈希、对称加密、非对称加密、数字签名等。无论是存储用户密码、保护通信数据还是验证数据完整性，都离不开加密技术。

## 基础概念

在开始编码之前，需要理解加密的几个核心概念：

- **哈希（Hash）**：单向函数，将任意长度的数据映射为固定长度的摘要。不可逆，常用于密码存储和数据完整性校验。
- **对称加密**：加密和解密使用同一个密钥，速度快，适合加密大量数据。常见算法有 AES。
- **非对称加密**：使用一对密钥（公钥和私钥），公钥加密、私钥解密。速度慢，适合密钥交换和数字签名。常见算法有 RSA、ECDSA。
- **盐值（Salt）**：在哈希前加入的随机数据，防止彩虹表攻击。
- **初始化向量（IV）**：对称加密中使用的随机值，确保相同明文加密后得到不同密文。

## 快速上手

最常用的加密操作 -- 哈希和随机数生成：

```go
package main

import (
    "crypto/rand"
    "crypto/sha256"
    "encoding/hex"
    "fmt"
)

func main() {
    // 计算 SHA-256 哈希
    hash := sha256.Sum256([]byte("你好，世界"))
    fmt.Println("SHA-256:", hex.EncodeToString(hash[:]))

    // 生成随机字节（用于令牌、盐值等）
    token := make([]byte, 32)
    rand.Read(token)
    fmt.Println("随机令牌:", hex.EncodeToString(token))
}
```

## 详细用法

### 1. 哈希函数

Go 支持多种哈希算法：

```go
import (
    "crypto/md5"
    "crypto/sha1"
    "crypto/sha256"
    "crypto/sha512"
)

// SHA-256（推荐）
hash256 := sha256.Sum256([]byte("hello"))
fmt.Printf("%x\n", hash256)

// SHA-512（更安全）
hash512 := sha512.Sum512([]byte("hello"))
fmt.Printf("%x\n", hash512)

// MD5（不推荐用于安全场景，仅用于校验）
hashMD5 := md5.Sum([]byte("hello"))
fmt.Printf("%x\n", hashMD5)

// SHA-1（已不推荐）
hashSHA1 := sha1.Sum([]byte("hello"))
fmt.Printf("%x\n", hashSHA1)
```

### 2. 密码哈希（bcrypt）

存储用户密码绝不能使用普通哈希，应该使用 bcrypt 等专门的密码哈希算法：

```bash
go get golang.org/x/crypto/bcrypt
```

```go
import "golang.org/x/crypto/bcrypt"

// 哈希密码（自动生成盐值）
hashedPassword, err := bcrypt.GenerateFromPassword(
    []byte("用户密码"), bcrypt.DefaultCost,
)
if err != nil {
    panic(err)
}
fmt.Println("哈希后的密码:", string(hashedPassword))

// 验证密码
err = bcrypt.CompareHashAndPassword(hashedPassword, []byte("用户密码"))
if err == nil {
    fmt.Println("密码正确")
} else {
    fmt.Println("密码错误")
}

// Cost 值越高，计算越慢，越安全。推荐值 10-12
// bcrypt.DefaultCost = 10
```

### 3. AES 对称加密

AES 是最常用的对称加密算法：

```go
import (
    "crypto/aes"
    "crypto/cipher"
    "crypto/rand"
)

// AES-GCM 加密（推荐模式，提供加密和认证）
func Encrypt(plaintext []byte, key []byte) ([]byte, error) {
    // key 必须是 16、24 或 32 字节（对应 AES-128、AES-192、AES-256）
    block, err := aes.NewCipher(key)
    if err != nil {
        return nil, err
    }

    // 使用 GCM 模式
    gcm, err := cipher.NewGCM(block)
    if err != nil {
        return nil, err
    }

    // 生成随机 nonce
    nonce := make([]byte, gcm.NonceSize())
    if _, err := rand.Read(nonce); err != nil {
        return nil, err
    }

    // 加密：nonce + 密文 + 认证标签
    ciphertext := gcm.Seal(nonce, nonce, plaintext, nil)
    return ciphertext, nil
}

// AES-GCM 解密
func Decrypt(ciphertext []byte, key []byte) ([]byte, error) {
    block, err := aes.NewCipher(key)
    if err != nil {
        return nil, err
    }

    gcm, err := cipher.NewGCM(block)
    if err != nil {
        return nil, err
    }

    // 提取 nonce（加密时放在密文前面）
    nonceSize := gcm.NonceSize()
    nonce, ciphertext := ciphertext[:nonceSize], ciphertext[nonceSize:]

    // 解密
    plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
    if err != nil {
        return nil, err
    }

    return plaintext, nil
}
```

使用示例：

```go
// 密钥必须是 32 字节（AES-256）
key := make([]byte, 32)
rand.Read(key) // 实际中应从安全配置读取

// 加密
encrypted, _ := Encrypt([]byte("敏感数据"), key)

// 解密
decrypted, _ := Decrypt(encrypted, key)
fmt.Println("解密结果:", string(decrypted))
```

### 4. RSA 非对称加密

RSA 用于加密小量数据（如对称加密的密钥）和数字签名：

```go
import (
    "crypto/rsa"
    "crypto/x509"
    "encoding/pem"
)

// 生成 RSA 密钥对
func GenerateRSAKeyPair() (*rsa.PrivateKey, *rsa.PublicKey, error) {
    // 2048 位是最低推荐长度，3072 位更安全
    privateKey, err := rsa.GenerateKey(rand.Reader, 2048)
    if err != nil {
        return nil, nil, err
    }
    return privateKey, &privateKey.PublicKey, nil
}

// RSA 加密（用公钥加密）
func RSAEncrypt(plaintext []byte, pubKey *rsa.PublicKey) ([]byte, error) {
    // 使用 OAEP 填充模式（比 PKCS1v15 更安全）
    ciphertext, err := rsa.EncryptOAEP(
        sha256.New(),
        rand.Reader,
        pubKey,
        plaintext,
        nil,
    )
    return ciphertext, err
}

// RSA 解密（用私钥解密）
func RSADecrypt(ciphertext []byte, privKey *rsa.PrivateKey) ([]byte, error) {
    plaintext, err := rsa.DecryptOAEP(
        sha256.New(),
        rand.Reader,
        privKey,
        ciphertext,
        nil,
    )
    return plaintext, err
}
```

### 5. 数字签名

用私钥签名，用公钥验证，确保数据未被篡改：

```go
// 签名
func Sign(data []byte, privKey *rsa.PrivateKey) ([]byte, error) {
    // 先对数据做哈希，再签名
    hashed := sha256.Sum256(data)
    signature, err := rsa.SignPKCS1v15(rand.Reader, privKey, crypto.SHA256, hashed[:])
    return signature, err
}

// 验证签名
func Verify(data []byte, signature []byte, pubKey *rsa.PublicKey) bool {
    hashed := sha256.Sum256(data)
    err := rsa.VerifyPKCS1v15(pubKey, crypto.SHA256, hashed[:], signature)
    return err == nil
}
```

### 6. HMAC 消息认证码

HMAC 用于验证消息的完整性和真实性：

```go
import "crypto/hmac"

func ComputeHMAC(data []byte, key []byte) []byte {
    mac := hmac.New(sha256.New, key)
    mac.Write(data)
    return mac.Sum(nil)
}

func VerifyHMAC(data, receivedMAC, key []byte) bool {
    expectedMAC := ComputeHMAC(data, key)
    // 使用恒定时间比较，防止时序攻击
    return hmac.Equal(receivedMAC, expectedMAC)
}
```

### 7. 安全随机数

密码学场景必须使用 `crypto/rand`，不要使用 `math/rand`：

```go
import "crypto/rand"

// 生成随机字节
func GenerateRandomBytes(n int) ([]byte, error) {
    b := make([]byte, n)
    _, err := rand.Read(b)
    if err != nil {
        return nil, err
    }
    return b, nil
}

// 生成随机字符串（用于令牌、密码重置链接等）
func GenerateRandomString(n int) (string, error) {
    const letters = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
    bytes, err := GenerateRandomBytes(n)
    if err != nil {
        return "", err
    }
    for i, b := range bytes {
        bytes[i] = letters[b%byte(len(letters))]
    }
    return string(bytes), nil
}
```

## 常见场景

### 场景一：安全存储用户密码

```go
type UserService struct {
    db *sql.DB
}

func (s *UserService) Register(username, password string) error {
    // 哈希密码后存储，绝不存储明文密码
    hashed, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
    if err != nil {
        return err
    }
    _, err = s.db.Exec("INSERT INTO users (username, password_hash) VALUES (?, ?)",
        username, string(hashed))
    return err
}

func (s *UserService) Login(username, password string) bool {
    var hash string
    err := s.db.QueryRow("SELECT password_hash FROM users WHERE username = ?", username).Scan(&hash)
    if err != nil {
        return false
    }
    return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) == nil
}
```

### 场景二：加密配置文件中的敏感信息

```go
// 加密数据库密码
encrypted, _ := Encrypt([]byte("db_password"), encryptionKey)
encoded := base64.StdEncoding.EncodeToString(encrypted)

// 解密
data, _ := base64.StdEncoding.DecodeString(encoded)
decrypted, _ := Decrypt(data, encryptionKey)
```

### 场景三：API 请求签名

```go
func SignRequest(params map[string]string, secretKey string) string {
    // 按参数名排序后拼接
    var keys []string
    for k := range params {
        keys = append(keys, k)
    }
    sort.Strings(keys)

    var buf strings.Builder
    for _, k := range keys {
        buf.WriteString(k)
        buf.WriteString("=")
        buf.WriteString(params[k])
        buf.WriteString("&")
    }
    buf.WriteString("key=")
    buf.WriteString(secretKey)

    // 计算 HMAC-SHA256
    mac := hmac.New(sha256.New, []byte(secretKey))
    mac.Write([]byte(buf.String()))
    return hex.EncodeToString(mac.Sum(nil))
}
```

## 注意事项与常见错误

1. **不要使用 MD5/SHA-1 存储密码**：这些算法速度太快，容易被暴力破解。始终使用 bcrypt、scrypt 或 argon2。

2. **不要自己实现加密算法**：使用标准库或经过审计的第三方库。自己实现的算法几乎一定有安全漏洞。

3. **不要使用 math/rand 生成密码学相关随机数**：`math/rand` 是伪随机数生成器，可预测。必须使用 `crypto/rand`。

4. **密钥管理**：密钥不应硬编码在代码中。使用环境变量、密钥管理服务（如 HashiCorp Vault）或云服务商的密钥管理。

5. **恒定时间比较**：比较 HMAC 或签名时，使用 `hmac.Equal` 而非 `==`，防止时序攻击。

6. **AES 密钥长度**：AES-128 用 16 字节密钥，AES-192 用 24 字节，AES-256 用 32 字节。密钥长度不对会报错。

7. **IV/Nonce 不能重复**：对称加密中，相同的密钥和 IV/Nonce 组合只能使用一次。GCM 模式下重复使用 nonce 会导致严重的安全问题。

## 进阶用法

### TLS 配置

自定义 TLS 配置增强安全性：

```go
import "crypto/tls"

// 服务器 TLS 配置
tlsConfig := &tls.Config{
    MinVersion: tls.VersionTLS12, // 最低 TLS 1.2
    CurvePreferences: []tls.CurveID{
        tls.X25519,
        tls.CurveP256,
    },
    CipherSuites: []uint16{
        tls.TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384,
        tls.TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384,
    },
}

server := &http.Server{
    Addr:      ":443",
    TLSConfig: tlsConfig,
}
```

### Argon2 密码哈希

Argon2 是密码哈希竞赛的获胜者，比 bcrypt 更抗 GPU 破解：

```go
import "golang.org/x/crypto/argon2"

func HashPassword(password string, salt []byte) []byte {
    // 参数：时间=3，内存=64MB，线程=4，输出长度=32
    return argon2.IDKey([]byte(password), salt, 3, 64*1024, 4, 32)
}
```

### PEM 格式密钥读写

```go
// 将 RSA 私钥保存为 PEM 格式
func SavePrivateKeyPEM(key *rsa.PrivateKey) string {
    der := x509.MarshalPKCS1PrivateKey(key)
    pemBlock := &pem.Block{Type: "RSA PRIVATE KEY", Bytes: der}
    return string(pem.EncodeToMemory(pemBlock))
}

// 从 PEM 格式读取 RSA 私钥
func LoadPrivateKeyPEM(pemStr string) (*rsa.PrivateKey, error) {
    block, _ := pem.Decode([]byte(pemStr))
    return x509.ParsePKCS1PrivateKey(block.Bytes)
}
```
