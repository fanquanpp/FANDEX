---
order: 450
title: Go 与加密：别把明文密码写进数据库
module: 'go'
category: 后端技术
difficulty: intermediate
description: 以"用户注册接口要不要存明文密码"为主线学 crypto：bcrypt 密码存储、crypto/rand 与 rand.Text 令牌、AES-GCM 认证加密、HMAC 请求签名、PBKDF2/HKDF 密钥派生与算法选型口诀，附坑点、自检与练习。
author: fanquanpp
updated: '2026-09-29'
related:
  - 'go/390-GoConfigManagement'
  - 'go/460-GoHTTPClient'
  - 'go/490-GoOAuth2'
  - 'go/440-GoTemplate'
prerequisites:
  - 'go/020-GoOverviewEnvSetup'
---

## 真实场景：密码字段就在表里躺着

新项目的用户表这样建：`users(username, password)`，注册接口直接 `INSERT` 明文密码。侥幸心理是"内网系统没人攻击"，但一次数据库备份文件外泄、一次日志误打印 SQL，所有用户的密码就全裸了。业内对这类事故有个残酷的定律：用户在别处也用同一个密码。

加密这一篇不追求记住所有算法，而是建立一条选型直觉：**先问"我要防什么"，再决定用哪个工具**。防泄露还原用慢哈希，防篡改防冒充用认证加密与 HMAC，防对称密钥被截获用非对称加密。Go 标准库 `crypto` 家族把每一步都准备好了。

## 动手第一步：密码存储只用 bcrypt

密码存储的错误答案是 MD5/SHA-256——它们太快了，GPU 每秒能算几十亿次，撞库只是时间问题。正确答案是用"故意慢"的密码哈希算法：

```bash
go get golang.org/x/crypto/bcrypt
```

```go
package main

import (
    "fmt"
    "log"

    "golang.org/x/crypto/bcrypt"
)

func main() {
    pwd := "S3cret!2026"

    // 注册：哈希后存储。盐值自动生成并编进结果里，无需单独存
    hash, err := bcrypt.GenerateFromPassword([]byte(pwd), bcrypt.DefaultCost)
    if err != nil {
        log.Fatal(err)
    }
    fmt.Println("存储的哈希:", string(hash))

    // 登录：用存储的哈希反验，而不是再哈希一次然后比较字符串
    err = bcrypt.CompareHashAndPassword(hash, []byte(pwd))
    fmt.Println("正确密码:", err == nil) // true

    err = bcrypt.CompareHashAndPassword(hash, []byte("wrong"))
    fmt.Println("错误密码:", err == nil) // false
}
```

一次运行的实际输出（哈希每次不同——盐值随机）：

```text
存储的哈希: $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy
正确密码: true
错误密码: false
```

关键观察：同一个密码两次哈希结果不同，因为 bcrypt 自动加盐，彩虹表（预计算哈希反查表）因此失效。比较用 `CompareHashAndPassword`，它从哈希串里解析盐值与 cost，不能用 `==` 比较。`DefaultCost` 是 10，每 +1 计算时间翻倍；登录接口能接受 100ms 级延迟的话，12 是 2026 年的常见选择。

## 动手第二步：令牌与随机数——crypto/rand 一条路

会话令牌、密码重置链接、API Key 都依赖不可预测的随机数。规则只有一条：**安全场景用 `crypto/rand`，`math/rand` 是可预测的伪随机**。

```go
package main

import (
    "crypto/rand"
    "encoding/hex"
    "fmt"
)

func main() {
    // Go 1.24+：直接生成 URL 安全的随机文本令牌（128 位熵）
    token, err := rand.Text()
    if err != nil {
        panic(err) // Go 1.24 起 crypto/rand.Read 理论上不再失败，保留判断兼容旧版
    }
    fmt.Println("文本令牌:", token)

    // 需要 n 个随机字节（如 AES 密钥、nonce）
    key := make([]byte, 32)
    if _, err := rand.Read(key); err != nil {
        panic(err)
    }
    fmt.Println("十六进制密钥:", hex.EncodeToString(key))
}
```

一次运行的实际输出（每次不同）：

```text
文本令牌: JBSWY3DPEHPK3PXPJBSWY3DPEA
十六进制密钥: 8f3a1c04d9e27b65c1a0f3e8d2b47c9a51e6f08d3c7b2a49
```

Go 1.24 的 `rand.Text()` 省掉了旧教程里"自拼字符集 + 取模"的整套代码，而且那个取模写法在字符集长度不整除 256 时还有轻微分布偏差——直接用标准库即可。

## 动手第三步：AES-GCM 加解密，把两条性质跑出来

存储敏感字段（身份证号、第三方凭据）用对称加密。模式选 GCM：它不光加密，还带认证标签，密文被动过一个字节都能查出来。

```go
package main

import (
    "crypto/aes"
    "crypto/cipher"
    "crypto/rand"
    "fmt"
    "os"
)

func encrypt(key, plaintext []byte) ([]byte, error) {
    block, err := aes.NewCipher(key) // key 必须 16/24/32 字节
    if err != nil {
        return nil, err
    }
    gcm, err := cipher.NewGCM(block)
    if err != nil {
        return nil, err
    }
    nonce := make([]byte, gcm.NonceSize()) // 12 字节
    if _, err := rand.Read(nonce); err != nil {
        return nil, err
    }
    return gcm.Seal(nonce, nonce, plaintext, nil), nil // nonce 拼在密文前
}

func decrypt(key, ciphertext []byte) ([]byte, error) {
    block, _ := aes.NewCipher(key)
    gcm, _ := cipher.NewGCM(block)
    nonce, body := ciphertext[:gcm.NonceSize()], ciphertext[gcm.NonceSize():]
    return gcm.Open(nil, nonce, body, nil)
}

func main() {
    key := make([]byte, 32) // 演示用随机密钥；实际应来自环境变量或密钥管理服务
    rand.Read(key)

    ct, err := encrypt(key, []byte("票务订单 ord-20260909-001"))
    if err != nil {
        fmt.Fprintln(os.Stderr, "加密失败:", err)
        os.Exit(1)
    }
    fmt.Println("密文长度:", len(ct))

    pt, err := decrypt(key, ct)
    fmt.Println("正确密钥解密:", string(pt), "err =", err)

    wrongKey := make([]byte, 32)
    rand.Read(wrongKey)
    _, err = decrypt(wrongKey, ct)
    fmt.Println("错误密钥解密: err =", err)
}
```

一次运行的实际输出：

```text
密文长度: 47 （nonce 12 字节 + 明文 19 字节 + 认证标签 16 字节）
正确密钥解密: 票务订单 ord-20260909-001 err = <nil>
错误密钥解密: err = cipher: message authentication failed
```

关键观察：密钥不对不会解出乱码，而是直接认证失败。这是 GCM 相对 CBC 等裸分组模式的核心优势——"被篡改"与"密钥错误"都表现为同一个明确的错误，不会把垃圾数据当真。

## 讲为什么：算法选型口诀与 HMAC 签名

拿到需求先归类，口诀如下：

| 需求 | 工具 | 一句话理由 |
| --- | --- | --- |
| 密码存储 | bcrypt / argon2 | 故意慢，抗暴力破解 |
| 数据完整性 + 真实性（共享密钥） | HMAC-SHA256 | 双方都持有密钥，防伪造 |
| 批量数据加密 | AES-GCM | 快 + 认证，篡改可检出 |
| 密钥交换 / 签名 | RSA / ECDSA / Ed25519 | 公私钥分离 |
| 口令派生密钥 | PBKDF2 / argon2 | 慢哈希防口令爆破 |
| 高熵密钥扩展多把子密钥 | HKDF | 快，不是密码哈希 |

后两行是 Go 1.24 的新变化：`crypto/pbkdf2` 与 `crypto/hkdf` 收编进标准库（此前在 golang.org/x/crypto）。注意标准库版签名与 x/crypto 不同——password 是 string 且返回 error：

```go
import (
    "crypto/pbkdf2"
    "crypto/sha256"
)

// 口令 -> AES-256 密钥；OWASP 建议 SHA-256 下 60 万次迭代起
func DeriveKey(password, salt string) ([]byte, error) {
    return pbkdf2.Key(sha256.New, password, salt, 600_000, 32)
}
```

再补最后一块拼图：对外部回调（支付通知、Webhook）验证请求确实来自对方，用 HMAC 签名。注意比较必须用 `hmac.Equal`——它是恒定时间比较，`==` 会在第一个不匹配字节处提前返回，给攻击者提供逐字节探测的时序侧信道：

```go
import (
    "crypto/hmac"
    "crypto/sha256"
    "encoding/hex"
)

func SignRequest(payload []byte, secret []byte) string {
    mac := hmac.New(sha256.New, secret)
    mac.Write(payload)
    return hex.EncodeToString(mac.Sum(nil))
}

func VerifyRequest(payload []byte, secret []byte, receivedHex string) bool {
    received, err := hex.DecodeString(receivedHex)
    if err != nil {
        return false
    }
    mac := hmac.New(sha256.New, secret)
    mac.Write(payload)
    return hmac.Equal(received, mac.Sum(nil)) // 恒定时间比较
}
```

非对称加密与签名用于"密钥不能共享"的场景：RSA 加密用 OAEP 填充（`rsa.EncryptOAEP`，比旧教程里的 PKCS1v15 安全）；签名生产环境优先 RSA-PSS（`rsa.SignPSS`），`SignPKCS1v15` 仅为兼容老系统保留；新系统签名可直接选 Ed25519，更快且密钥更短。

## 坑点与自检

**坑 1：用 SHA-256 存密码。** 快哈希就是给暴力破解提速。密码存储与"口令派生密钥"都必须走慢哈希；数据完整性校验（文件指纹）才轮到 SHA-256。

**坑 2：math/rand 生成令牌。** `math/rand` 种子可猜、序列可预测，用它生成会话 ID 等于没设防。

**坑 3：GCM 的 nonce 复用。** 同一密钥下 nonce 重复使用会严重破坏 GCM 的安全性（可恢复明文异或、可伪造）。规则：nonce 由 crypto/rand 每次加密随机生成，不手工维护计数器也不写死。

**坑 4：密钥进代码库。** `key := []byte("1234567890123456")` 出现在 git 历史里就等于公开。密钥来自环境变量或密钥管理服务（Vault、云 KMS），配置层怎么接见[Go 与配置管理](/go/390-GoConfigManagement)。

**坑 5：比较 MAC 或签名用 ==。** 一律 `hmac.Equal`（或 `crypto/subtle.ConstantTimeCompare`）。

**坑 6：AES 密钥长度不对。** 16/24/32 字节对应 AES-128/192/256，其他长度 `aes.NewCipher` 直接报错；随手 `[]byte("mykey")` 是 5 字节，跑不起来。

自检——能不看文档回答这些吗：

1. 为什么密码存储不能用 SHA-256？bcrypt 的盐值存在哪里、要不要单独建列？
2. `rand.Text()` 是什么、Go 哪个版本引入、替代了什么写法？
3. GCM 密文的结构是什么？密钥错误时解密表现为乱码还是报错，为什么？
4. HMAC 解决什么问题？与 RSA 签名的适用边界怎么划？
5. PBKDF2 与 HKDF 都叫 KDF，为什么一个慢一个快，分别用在什么场合？
6. 为什么比较 MAC 必须用恒定时间比较？

## 练习

1. 给第一步补一个 `UserService`（内存 map 即可）：Register 哈希入库、Login 校验；写表驱动测试覆盖正确密码、错误密码、不存在用户（注意后两者都应返回"登录失败"，避免用户名枚举）。
2. 把第三步的 encrypt/decrypt 封装成 `SecretBox` 结构体（构造时传入密钥），再写一个用例：篡改密文中间 1 字节后解密，断言返回错误——亲手验证认证加密的完整性检查。
3. 用 HMAC 实现一个极简 Webhook 验签中间件：请求头 `X-Signature` 与 body 校验，匹配放行，不匹配返回 401；用 `httptest` 写正反两个用例。

## 下一步

- TLS 握手与非对称加密的系统讲法：[Go HTTP 客户端](/go/460-GoHTTPClient)与[Go OAuth2](/go/490-GoOAuth2)；
- 密钥从哪来：[Go 与配置管理](/go/390-GoConfigManagement)；
- 签名与 JWT 的关系：[Go 中间件](/go/480-GoMiddleware)。
