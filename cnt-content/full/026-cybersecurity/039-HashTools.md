---
order: 390
title: 哈希工具
module: 'cybersecurity'
category: 云与基础设施
difficulty: beginner
description: Cybersecurity 哈希工具 的完整教学讲解。
author: fanquanpp
updated: '2026-08-30'
related: []
prerequisites: []
---

## md5sum 哈希计算

**基本写法：计算文件 MD5**
`md5sum <文件>`
```bash
# 计算文件的 MD5 哈希
md5sum document.pdf
```

**基本写法：计算多个文件 MD5**
`md5sum <文件1> <文件2>`
```bash
# 计算多个文件的 MD5
md5sum file1.txt file2.txt file3.txt
```

**基本写法：保存哈希到文件**
`md5sum <文件> > <哈希文件>`
```bash
# 保存 MD5 哈希到文件
md5sum document.pdf > checksums.md5
```

**基本写法：验证文件 MD5**
`md5sum -c <哈希文件>`
```bash
# 验证文件 MD5 是否匹配
md5sum -c checksums.md5
```

**基本写法：计算字符串 MD5**
`echo -n "<字符串>" | md5sum`
```bash
# 计算字符串的 MD5
echo -n "hello world" | md5sum
```

---

## sha256sum 哈希计算

**基本写法：计算文件 SHA-256**
`sha256sum <文件>`
```bash
# 计算文件的 SHA-256 哈希
sha256sum document.pdf
```

**基本写法：保存 SHA-256 到文件**
`sha256sum <文件> > <哈希文件>`
```bash
# 保存 SHA-256 哈希到文件
sha256sum document.pdf > checksums.sha256
```

**基本写法：验证文件 SHA-256**
`sha256sum -c <哈希文件>`
```bash
# 验证文件 SHA-256 是否匹配
sha256sum -c checksums.sha256
```

**基本写法：计算字符串 SHA-256**
`echo -n "<字符串>" | sha256sum`
```bash
# 计算字符串的 SHA-256
echo -n "hello world" | sha256sum
```

**基本写法：批量验证**
`sha256sum -c <哈希文件> --quiet`
```bash
# 只显示验证失败的文件
sha256sum -c checksums.sha256 --quiet
```

---

## 其他哈希工具

**基本写法：计算 SHA-1**
`sha1sum <文件>`
```bash
# 计算文件的 SHA-1 哈希
sha1sum document.pdf
```

**基本写法：计算 SHA-512**
`sha512sum <文件>`
```bash
# 计算文件的 SHA-512 哈希
sha512sum document.pdf
```

**基本写法：计算 SHA-224**
`sha224sum <文件>`
```bash
# 计算文件的 SHA-224 哈希
sha224sum document.pdf
```

**基本写法：计算 SHA-384**
`sha384sum <文件>`
```bash
# 计算文件的 SHA-384 哈希
sha384sum document.pdf
```

---

## OpenSSL 哈希

**基本写法：使用 OpenSSL 计算 SHA-256**
`openssl dgst -sha256 <文件>`
```bash
# 使用 OpenSSL 计算 SHA-256
openssl dgst -sha256 document.pdf
```

**基本写法：使用 OpenSSL 计算 MD5**
`openssl dgst -md5 <文件>`
```bash
# 使用 OpenSSL 计算 MD5
openssl dgst -md5 document.pdf
```

**基本写法：使用 OpenSSL 计算 SHA-3**
`openssl dgst -sha3-256 <文件>`
```bash
# 使用 OpenSSL 计算 SHA3-256
openssl dgst -sha3-256 document.pdf
```

**基本写法：使用 OpenSSL 计算字符串哈希**
`echo -n "<字符串>" | openssl dgst -sha256`
```bash
# 计算字符串的 SHA-256
echo -n "hello world" | openssl dgst -sha256
```

---

## HMAC 计算

**基本写法：计算 HMAC-SHA256**
`openssl dgst -sha256 -hmac "<密钥>" <文件>`
```bash
# 计算 HMAC-SHA256
openssl dgst -sha256 -hmac "secret_key" document.pdf
```

**基本写法：使用十六进制密钥计算 HMAC**
`openssl dgst -sha256 -mac HMAC -macopt hexkey:<密钥> <文件>`
```bash
# 使用十六进制密钥计算 HMAC
openssl dgst -sha256 -mac HMAC -macopt hexkey:369bd7d655 document.pdf
```

**基本写法：计算字符串 HMAC**
`echo -n "<字符串>" | openssl dgst -sha256 -hmac "<密钥>"`
```bash
# 计算字符串的 HMAC-SHA256
echo -n "hello world" | openssl dgst -sha256 -hmac "secret_key"
```

---

## 哈希识别

**基本写法：识别哈希类型**
`hashid <哈希值>`
```bash
# 识别哈希值的类型
hashid 5d41402abc4b2a76b9719d911017c592
```

**基本写法：按长度识别**
```text
# 根据哈希长度判断算法
32 字符  -> MD5
40 字符  -> SHA1
56 字符  -> SHA224
64 字符  -> SHA256
96 字符  -> SHA384
128 字符 -> SHA512
```
```bash
# 常见哈希长度对照
echo "MD5: $(echo -n 'test' | md5sum | cut -d' ' -f1 | wc -c)"
echo "SHA256: $(echo -n 'test' | sha256sum | cut -d' ' -f1 | wc -c)"
```

**基本写法：识别密码哈希格式**
```text
# 常见密码哈希前缀
$2a$ / $2b$  -> bcrypt
$6$          -> SHA512crypt
$5$          -> SHA256crypt
$1$          -> MD5crypt
$y$          -> yescrypt
$argon2id$   -> Argon2id
```
```bash
# 查看 /etc/shadow 中的哈希格式
grep $USER /etc/shadow
```

---

## 文件完整性校验

**基本写法：生成校验文件**
`sha256sum <文件1> <文件2> > <校验文件>`
```bash
# 生成多个文件的校验文件
sha256sum file1.txt file2.txt file3.txt > checksums.sha256
```

**基本写法：验证文件完整性**
`sha256sum -c <校验文件>`
```bash
# 验证所有文件的完整性
sha256sum -c checksums.sha256
```

**基本写法：递归计算目录哈希**
`find <目录> -type f -exec sha256sum {} + > <校验文件>`
```bash
# 递归计算目录下所有文件的 SHA-256
find /important/data -type f -exec sha256sum {} + > checksums.sha256
```

**基本写法：只显示验证失败的文件**
`sha256sum -c <校验文件> --quiet`
```bash
# 静默模式只显示失败的验证
sha256sum -c checksums.sha256 --quiet
```

**基本写法：严格模式验证**
`sha256sum -c <校验文件> --strict`
```bash
# 严格模式遇到错误返回非零退出码
sha256sum -c checksums.sha256 --strict
```

---

## bcrypt 密码哈希

**基本写法：使用 Python 生成 bcrypt 哈希**
`python3 -c "import bcrypt; print(bcrypt.hashpw(b'<密码>', bcrypt.gensalt()).decode())"`
```bash
# 生成 bcrypt 密码哈希
python3 -c "import bcrypt; print(bcrypt.hashpw(b'mypassword', bcrypt.gensalt(12)).decode())"
```

**基本写法：验证 bcrypt 密码**
`python3 -c "import bcrypt; print(bcrypt.checkpw(b'<密码>', b'<哈希>'))"`
```bash
# 验证 bcrypt 密码
python3 -c "import bcrypt; print(bcrypt.checkpw(b'mypassword', b'\$2b\$12\$...'))"
```

**基本写法：使用 htpasswd 生成 bcrypt**
`htpasswd -nbB <用户> <密码>`
```bash
# 使用 Apache htpasswd 生成 bcrypt 哈希
htpasswd -nbB admin secret123
```

---

## PBKDF2 密钥派生

**基本写法：使用 OpenSSL PBKDF2**
`openssl kdf -keylen <长度> -kdfopts pass:<密码>:salt:<盐>:iter:<迭代次数> PBKDF2`
```bash
# 使用 PBKDF2 派生 32 字节密钥
openssl kdf -keylen 32 -kdfopts pass:password:salt:salt:iter:600000 PBKDF2
```

**基本写法：使用 Python PBKDF2**
`python3 -c "import hashlib, binascii; print(binascii.hexlify(hashlib.pbkdf2_hmac('sha256', b'<密码>', b'<盐>', <迭代次数>)).decode())"`
```bash
# 使用 Python 计算 PBKDF2
python3 -c "import hashlib, binascii; print(binascii.hexlify(hashlib.pbkdf2_hmac('sha256', b'password', b'salt', 600000)).decode())"
```

---

## 实用哈希组合

**基本写法：比较两个文件是否相同**
`sha256sum <文件1> <文件2> | cut -d' ' -f1 | uniq -d`
```bash
# 比较两个文件的哈希是否相同
sha256sum file1.txt file2.txt
```

**基本写法：批量检查文件变更**
`sha256sum -c <校验文件> --quiet && echo "文件无变更" || echo "文件已变更"`
```bash
# 检查文件是否被篡改
sha256sum -c checksums.sha256 --quiet && echo "文件无变更" || echo "文件已变更"
```

**基本写法：生成文件指纹**
`sha256sum <文件> | cut -d' ' -f1`
```bash
# 只输出哈希值
sha256sum document.pdf | cut -d' ' -f1
```
