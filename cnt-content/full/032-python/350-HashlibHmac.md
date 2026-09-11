---
order: 350
title: Python hashlib 与 hmac
module: 'python'
category: 后端技术
difficulty: beginner
description: Python hashlib 与 hmac 的完整教学讲解。
author: fanquanpp
updated: '2026-09-12'
related: []
prerequisites: []
---

## hashlib 哈希

**基本写法：创建哈希对象**
`hashlib.<算法名>()`
```python
# 创建 SHA256 哈希对象
import hashlib

h = hashlib.sha256()
h.update(b"hello")
print(h.hexdigest())
```

**基本写法：直接计算哈希**
`hashlib.<算法名>(<字节>)`
```python
# 一步计算哈希值
h = hashlib.sha256(b"hello")
print(h.hexdigest())
```

**基本写法：update 分块更新**
`h.update(<字节>)`
```python
# 分块更新大文件哈希
h = hashlib.sha256()
with open("big.bin", "rb") as f:
    while chunk := f.read(8192):
        h.update(chunk)
print(h.hexdigest())
```

**基本写法：hexdigest 十六进制**
`h.hexdigest()`
```python
# 返回十六进制字符串
print(hashlib.sha256(b"x").hexdigest())
```

**基本写法：digest 字节**
`h.digest()`
```python
# 返回原始字节摘要
print(hashlib.sha256(b"x").digest())
```

---

## 常用算法

**基本写法：md5**
`hashlib.md5(<字节>)`
```python
# MD5（不推荐用于安全场景）
print(hashlib.md5(b"hello").hexdigest())
```

**基本写法：sha1**
`hashlib.sha1(<字节>)`
```python
# SHA1
print(hashlib.sha1(b"hello").hexdigest())
```

**基本写法：sha256 / sha512**
`hashlib.sha256(<字节>)` | `hashlib.sha512(<字节>)`
```python
# SHA256 与 SHA512
print(hashlib.sha256(b"hello").hexdigest())
print(hashlib.sha512(b"hello").hexdigest())
```

**基本写法：sha3_256（3.6+）**
`hashlib.sha3_256(<字节>)`
```python
# SHA3 系列
print(hashlib.sha3_256(b"hello").hexdigest())
```

**基本写法：blake2**
`hashlib.blake2b(<字节>)` | `hashlib.blake2s(<字节>)`
```python
# BLAKE2 哈希
print(hashlib.blake2b(b"hello").hexdigest())
print(hashlib.blake2s(b"hello").hexdigest())
```

**基本写法：查询可用算法**
`hashlib.algorithms_available`
```python
# 当前实现可用的算法集合
print(hashlib.algorithms_available)
```

**基本写法：保证可用算法**
`hashlib.algorithms_guaranteed`
```python
# 所有平台保证可用的算法
print(hashlib.algorithms_guaranteed)
```

---

## HMAC 消息认证

**基本写法：创建 HMAC**
`hmac.new(<密钥>, <消息>, <哈希算法>)`
```python
# 创建 HMAC
import hmac
import hashlib

m = hmac.new(b"secret_key", b"hello", hashlib.sha256)
print(m.hexdigest())
```

**基本写法：update 更新消息**
`m.update(<字节>)`
```python
# 分块更新 HMAC
m = hmac.new(b"key", b"", hashlib.sha256)
m.update(b"hello")
m.update(b"world")
print(m.hexdigest())
```

**基本写法：compare_digest 安全比较**
`hmac.compare_digest(<a>, <b>)`
```python
# 常量时间比较，防止时序攻击
a = hmac.new(b"key", b"msg", hashlib.sha256).digest()
b = hmac.new(b"key", b"msg", hashlib.sha256).digest()
print(hmac.compare_digest(a, b))
```

**基本写法：digest 字节**
`m.digest()`
```python
# 返回字节摘要
print(m.digest())
```

---

## secrets 安全随机

**基本写法：生成安全随机字节**
`secrets.token_bytes(<长度>)`
```python
# 生成加密安全的随机字节
import secrets

print(secrets.token_bytes(16))
```

**基本写法：生成安全随机字符串**
`secrets.token_hex(<长度>)`
```python
# 生成十六进制随机字符串
print(secrets.token_hex(16))
```

**基本写法：生成 URL 安全字符串**
`secrets.token_urlsafe(<长度>)`
```python
# 生成 URL 安全的随机字符串
print(secrets.token_urlsafe(16))
```

**基本写法：安全随机整数**
`secrets.randbelow(<上界>)`
```python
# 生成 0 到 n-1 的安全随机整数
print(secrets.randbelow(100))
```

**基本写法：安全选择**
`secrets.choice(<序列>)`
```python
# 从序列中安全随机选择
print(secrets.choice("abcdef"))
```

**基本写法：生成口令**
`secrets.choice` 配合 string
```python
# 生成 16 位随机口令
import string
alphabet = string.ascii_letters + string.digits
password = "".join(secrets.choice(alphabet) for _ in range(16))
print(password)
```

---

## 文件哈希校验

**基本写法：文件 SHA256**
`def <函数>(<路径>):`
```python
# 计算文件 SHA256
def file_sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(8192):
            h.update(chunk)
    return h.hexdigest()
```

---

## 密码哈希（推荐）

**基本写法：pbkdf2_hmac**
`hashlib.pbkdf2_hmac(<算法>, <密码>, <盐>, <迭代次数>)`
```python
# PBKDF2 密码哈希
salt = os.urandom(16)
key = hashlib.pbkdf2_hmac("sha256", b"password", salt, 100000)
print(key.hex())
```

**基本写法：scrypt（3.6+）**
`hashlib.scrypt(<密码>, salt=<盐>, n=<参数>, r=<参数>, p=<参数>)`
```python
# scrypt 密码哈希
salt = os.urandom(16)
key = hashlib.scrypt(b"password", salt=salt, n=16384, r=8, p=1)
print(key.hex())
```
