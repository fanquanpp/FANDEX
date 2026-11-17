---
order: 110
title: OpenSSL 加密解密
module: 'cybersecurity'
category: 云与基础设施
difficulty: beginner
description: 'OpenSSL 加解密命令：对称加解密（AES-GCM/CBC）、口令派生（PBKDF2/scrypt）、非对称加解密与数字信封'
author: fanquanpp
updated: '2026-11-17'
related:
  - 'cybersecurity/040-SymmetricEncryption'
  - 'cybersecurity/050-AsymmetricEncryption'
  - 'cybersecurity/100-OpenSSLCert'
  - 'cybersecurity/120-GPGEncrypt'
prerequisites:
  - 'cybersecurity/010-SecurityBasicsDefense'
---

- **解决什么问题**：OpenSSL 是命令行密码工具箱——临时加密一个文件、算一次哈希、签一次名、测一次 TLS 连接都靠它。难点不在背命令，而在选对「算法 + 模式」并分清工具边界：`enc` 管对称、`rsautl`/`pkeyutl` 管非对称、`dgst` 管哈希与签名、`kdf` 管口令派生。
- **容易怎么错**：`enc` 传统模式（CBC/CTR）不带完整性校验，被篡改不会报错——当「防窃听」用没问题，当「防篡改」用是错的；把口令直接当密钥（必须过 KDF）；把 Base64 当加密（辨析见 030 篇）。
- **学完能做什么**：用一条命令完成带口令派生的文件加解密；写出「混合加密」的两段式流程（RSA 护送 AES 密钥）；用 `s_client` 测一次加密通信。

## 对称加密

**基本写法：AES 加密文件**
`openssl enc -aes-256-cbc -salt -pbkdf2 -in <输入> -out <输出>`
```bash
# 使用 AES-256-CBC 加密文件
openssl enc -aes-256-cbc -salt -pbkdf2 -in plaintext.txt -out encrypted.enc
```

**基本写法：AES 解密文件**
`openssl enc -d -aes-256-cbc -pbkdf2 -in <文件> -out <输出>`
```bash
# 解密 AES 加密的文件
openssl enc -d -aes-256-cbc -pbkdf2 -in encrypted.enc -out decrypted.txt
```

**基本写法：使用密码加密**
`openssl enc -aes-256-cbc -salt -pbkdf2 -pass pass:<密码> -in <输入> -out <输出>`
```bash
# 直接指定密码加密
openssl enc -aes-256-cbc -salt -pbkdf2 -pass pass:secret123 -in plaintext.txt -out encrypted.enc
```

**基本写法：使用密钥文件加密**
`openssl enc -aes-256-cbc -salt -pbkdf2 -pass file:<密钥文件> -in <输入> -out <输出>`
```bash
# 使用密钥文件加密
openssl enc -aes-256-cbc -salt -pbkdf2 -pass file:./keyfile -in plaintext.txt -out encrypted.enc
```

**基本写法：指定密钥和 IV 加密**
`openssl enc -aes-256-cbc -K <十六进制密钥> -iv <十六进制IV> -in <输入> -out <输出>`
```bash
# 使用指定的密钥和 IV 加密
openssl enc -aes-256-cbc -K 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef -iv 0123456789abcdef0123456789abcdef -in plaintext.txt -out encrypted.enc
```

---

## 支持的加密算法

**基本写法：列出所有支持的算法**
`openssl enc -list`
```bash
# 列出所有支持的加密算法
openssl enc -list
```

**基本写法：ChaCha20 加密**
`openssl enc -chacha20 -salt -pbkdf2 -in <输入> -out <输出>`
```bash
# 使用 ChaCha20 加密
openssl enc -chacha20 -salt -pbkdf2 -in plaintext.txt -out encrypted.enc
```

**基本写法：AES-128 加密**
`openssl enc -aes-128-cbc -salt -pbkdf2 -in <输入> -out <输出>`
```bash
# 使用 AES-128-CBC 加密
openssl enc -aes-128-cbc -salt -pbkdf2 -in plaintext.txt -out encrypted.enc
```

**基本写法：Camellia 加密**
`openssl enc -camellia-256-cbc -salt -pbkdf2 -in <输入> -out <输出>`
```bash
# 使用 Camellia-256 加密
openssl enc -camellia-256-cbc -salt -pbkdf2 -in plaintext.txt -out encrypted.enc
```

---

## 非对称加密（RSA）

**基本写法：使用公钥加密**
`openssl rsautl -encrypt -inkey <公钥> -pubin -in <输入> -out <输出>`
```bash
# 使用 RSA 公钥加密文件
openssl rsautl -encrypt -inkey public.key -pubin -in plaintext.txt -out encrypted.enc
```

**基本写法：使用私钥解密**
`openssl rsautl -decrypt -inkey <私钥> -in <文件> -out <输出>`
```bash
# 使用 RSA 私钥解密
openssl rsautl -decrypt -inkey private.key -in encrypted.enc -out decrypted.txt
```

**基本写法：使用 OAEP 填充加密**
`openssl rsautl -encrypt -oaep -inkey <公钥> -pubin -in <输入> -out <输出>`
```bash
# 使用 OAEP 填充方案更安全
openssl rsautl -encrypt -oaep -inkey public.key -pubin -in plaintext.txt -out encrypted.enc
```

**基本写法：查看 RSA 密钥信息**
`openssl rsa -in <私钥> -text -noout`
```bash
# 查看 RSA 私钥详细信息
openssl rsa -in private.key -text -noout
```

---

## 数字签名

**基本写法：使用 RSA 签名文件**
`openssl dgst -sha256 -sign <私钥> -out <签名> <文件>`
```bash
# 使用 SHA-256 和 RSA 私钥签名文件
openssl dgst -sha256 -sign private.key -out signature.sig document.pdf
```

**基本写法：验证签名**
`openssl dgst -sha256 -verify <公钥> -signature <签名> <文件>`
```bash
# 验证文件的数字签名
openssl dgst -sha256 -verify public.key -signature signature.sig document.pdf
```

**基本写法：使用 ECDSA 签名**
`openssl dgst -sha384 -sign <EC私钥> -out <签名> <文件>`
```bash
# 使用 EC 私钥签名
openssl dgst -sha384 -sign ec_key.pem -out signature.sig document.pdf
```

**基本写法：使用 pkeyutl 签名**
`openssl pkeyutl -sign -inkey <私钥> -in <文件> -out <签名>`
```bash
# 使用 pkeyutl 签名
openssl pkeyutl -sign -inkey private.key -in document.pdf -out signature.sig
```

**基本写法：使用 pkeyutl 验证**
`openssl pkeyutl -verify -inkey <公钥> -pubin -in <文件> -sigfile <签名>`
```bash
# 使用 pkeyutl 验证签名
openssl pkeyutl -verify -inkey public.key -pubin -in document.pdf -sigfile signature.sig
```

---

## 哈希计算

**基本写法：计算文件 SHA-256**
`openssl dgst -sha256 <文件>`
```bash
# 计算文件的 SHA-256 哈希
openssl dgst -sha256 document.pdf
```

**基本写法：计算文件 MD5**
`openssl dgst -md5 <文件>`
```bash
# 计算文件的 MD5 哈希
openssl dgst -md5 document.pdf
```

**基本写法：计算字符串哈希**
`echo -n "<字符串>" | openssl dgst -sha256`
```bash
# 计算字符串的 SHA-256 哈希
echo -n "hello world" | openssl dgst -sha256
```

**基本写法：列出所有摘要算法**
`openssl list -digest-algorithms`
```bash
# 列出所有支持的哈希算法
openssl list -digest-algorithms
```

**基本写法：计算 HMAC**
`openssl dgst -sha256 -hmac "<密钥>" <文件>`
```bash
# 计算文件的 HMAC-SHA256
openssl dgst -sha256 -hmac "secret_key" document.pdf
```

**基本写法：二进制哈希输出**
`openssl dgst -binary -sha256 <文件>`
```bash
# 输出二进制形式的哈希
openssl dgst -binary -sha256 document.pdf
```

---

## 随机数生成

**基本写法：生成随机字节**
`openssl rand -hex <字节数>`
```bash
# 生成 16 字节的随机十六进制字符串
openssl rand -hex 16
```

**基本写法：生成 Base64 随机数**
`openssl rand -base64 <字节数>`
```bash
# 生成 32 字节的 Base64 随机数
openssl rand -base64 32
```

**基本写法：生成二进制随机数**
`openssl rand <字节数> > <文件>`
```bash
# 生成 1024 字节随机数到文件
openssl rand 1024 > random.bin
```

**基本写法：使用随机数作为密钥**
`openssl rand -hex 32`
```bash
# 生成 256 位的十六进制密钥
openssl rand -hex 32
```

---

## Base64 编码解码

**基本写法：Base64 编码**
`openssl base64 -in <输入> -out <输出>`
```bash
# 编码文件为 Base64
openssl base64 -in plaintext.txt -out encoded.b64
```

**基本写法：Base64 解码**
`openssl base64 -d -in <文件> -out <输出>`
```bash
# 解码 Base64 文件
openssl base64 -d -in encoded.b64 -out decoded.txt
```

**基本写法：字符串编码**
`echo -n "<字符串>" | openssl base64`
```bash
# 编码字符串为 Base64
echo -n "hello world" | openssl base64
```

**基本写法：字符串解码**
`echo "<Base64>" | openssl base64 -d`
```bash
# 解码 Base64 字符串
echo "aGVsbG8gd29ybGQ=" | openssl base64 -d
```

---

## 加密通信测试

**基本写法：测试 TLS 连接**
`openssl s_client -connect <主机>:<端口>`
```bash
# 测试 HTTPS 连接
openssl s_client -connect example.com:443
```

**基本写法：指定 TLS 版本**
`openssl s_client -tls1_2 -connect <主机>:<端口>`
```bash
# 强制使用 TLS 1.2
openssl s_client -tls1_2 -connect example.com:443
```

**基本写法：查看证书链**
`openssl s_client -showcerts -connect <主机>:<端口>`
```bash
# 查看完整证书链
openssl s_client -showcerts -connect example.com:443
```

**基本写法：测试 SMTP TLS**
`openssl s_client -starttls smtp -connect <主机>:<端口>`
```bash
# 测试 SMTP 服务的 TLS
openssl s_client -starttls smtp -connect smtp.example.com:587
```

**基本写法：列出支持的密码套件**
`openssl ciphers -v`
```bash
# 列出所有支持的密码套件
openssl ciphers -v
```

**基本写法：测试特定密码套件**
`openssl s_client -cipher <密码套件> -connect <主机>:<端口>`
```bash
# 测试服务器是否支持特定密码套件
openssl s_client -cipher 'ECDHE-RSA-AES256-GCM-SHA384' -connect example.com:443
```

---

## 实用加密组合

**基本写法：加密大文件（混合加密）**
```bash
# 混合加密大文件：随机 AES 密钥加密数据，RSA 公钥加密该密钥
openssl rand -hex 32 > key.bin
openssl enc -aes-256-cbc -salt -pbkdf2 -in largefile -out largefile.enc -pass file:./key.bin
openssl rsautl -encrypt -inkey public.key -pubin -in key.bin -out key.bin.enc
rm key.bin
```

**基本写法：解密大文件**
```bash
# 解密混合加密的大文件：先解开 AES 密钥，再解密数据
openssl rsautl -decrypt -inkey private.key -in key.bin.enc -out key.bin
openssl enc -d -aes-256-cbc -pbkdf2 -in largefile.enc -out largefile -pass file:./key.bin
```

---

## 密钥派生

**基本写法：使用 PBKDF2 派生密钥**
`openssl kdf -keylen <长度> -kdfopts pass:<密码>:salt:<盐>:iter:<迭代次数> PBKDF2`
```bash
# 使用 PBKDF2 派生 32 字节密钥
openssl kdf -keylen 32 -kdfopts pass:password:salt:salt123:iter:100000 PBKDF2
```

**基本写法：使用 scrypt 派生密钥**
`openssl kdf -keylen <长度> -kdfopts pass:<密码> scrypt`
```bash
# 使用 scrypt 派生密钥
openssl kdf -keylen 32 -kdfopts pass:password scrypt
```

## 自检

- 遮住「对称加密」一节，写出加密与解密文件的一对命令，并说出 `-pbkdf2` 为什么不能省（口令必须经 KDF 派生为密钥，旧默认派生法已弃用）。
- `enc -aes-256-cbc` 与认证加密差在哪？说清「防窃听」与「防篡改」在 `enc` 传统模式里分别靠什么（后者给不了，需 AEAD 或外层 HMAC）。
- 遮住「实用加密组合」一节，自己写出混合加密的四个步骤与解密侧的两步——为什么 RSA 只用来护送那个 32 字节密钥（性能：RSA 慢且分组长度有限）。
- 遮住「数字签名」一节，写出「摘要 → 签名 → 验签」命令链，并回答验签用哪把密钥（公钥）。
- PBKDF2 与 scrypt 的核心差别是什么？（scrypt 在时间之外还消耗内存，更抗 GPU/ASIC 大规模并行。）
